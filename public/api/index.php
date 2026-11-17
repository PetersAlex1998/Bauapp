<?php
declare(strict_types=1);
/**
 * HaDie-Immobilien – Schnittstelle (API) für Verwaltertool und Kundenbereich
 * ---------------------------------------------------------------------------
 * Läuft auf dem eigenen Webspace (PHP 8 + MySQL/MariaDB), ohne Fremddienste.
 *
 *  - Zugänge: Kundennummer + Passwort. Nummern mit «V-» gehören zur Verwaltung,
 *    alle anderen zu Kunden. Passwörter werden mit bcrypt gespeichert.
 *  - Sitzung: zufälliges Token im HttpOnly-Cookie (SameSite=Strict), in der
 *    Datenbank nur als Hash. Gültig 12 Stunden ab letzter Nutzung.
 *  - Verwaltung sieht und ändert alles. Ein Kunde sieht nur seine eigenen
 *    Objekte und was daran hängt – nie Mieterdaten, nie interne Notizen.
 *  - Die Tabellen legt die Schnittstelle beim ersten Aufruf selbst an.
 *  - Zugangsdaten zur Datenbank stehen in config.php (nicht im Repository).
 */
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

const VERSION = '1.0';
const SITZUNG = 43200;           // 12 Stunden
const MAX_BODY = 8 * 1024 * 1024; // 8 MB
const KUNDEN_TABELLEN = ['einheiten', 'vorgaenge', 'auftraege', 'projekte', 'einsaetze', 'dokumente', 'versammlungen', 'beschluesse', 'kosten', 'fristen', 'service'];

function antwort(int $code, array $daten): never
{
    http_response_code($code);
    echo json_encode($daten, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
    exit;
}
function fehler(int $code, string $text): never { antwort($code, ['fehler' => $text]); }

set_exception_handler(function (Throwable $e): void {
    error_log('HaDie-API: ' . $e->getMessage());
    fehler(500, 'Auf dem Server ist ein Fehler aufgetreten.');
});

$konfig = @include __DIR__ . '/config.php';
$aktion = (string)($_GET['a'] ?? '');

if (!is_array($konfig)) {
    if ($aktion === 'status') antwort(200, ['server' => true, 'konfiguriert' => false]);
    fehler(503, 'Die Schnittstelle ist noch nicht eingerichtet (config.php fehlt).');
}

/* ---------------- Datenbank ---------------- */
function db(): PDO
{
    static $pdo = null;
    global $konfig;
    if ($pdo) return $pdo;
    $c = $konfig['db'] ?? [];
    $typ = $c['typ'] ?? 'mysql';
    if ($typ === 'sqlite') {
        $pdo = new PDO('sqlite:' . $c['datei']);
    } else {
        $dsn = 'mysql:host=' . $c['host'] . ';' . (isset($c['port']) ? 'port=' . $c['port'] . ';' : '') . 'dbname=' . $c['name'] . ';charset=utf8mb4';
        $pdo = new PDO($dsn, $c['user'], $c['pass']);
    }
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    if ($typ === 'sqlite') $pdo->exec('PRAGMA foreign_keys = ON');
    tabellenAnlegen($pdo, $typ);
    return $pdo;
}
function tabellenAnlegen(PDO $pdo, string $typ): void
{
    try { $pdo->query('SELECT 1 FROM hadie_konto LIMIT 1'); $pdo->query('SELECT 1 FROM hadie_daten LIMIT 1'); return; } catch (Throwable $e) { /* noch nicht vorhanden */ }
    $my = $typ !== 'sqlite';
    $ende = $my ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : '';
    $bin = $my ? ' CHARACTER SET utf8mb4 COLLATE utf8mb4_bin' : '';
    $pdo->exec('CREATE TABLE IF NOT EXISTS hadie_konto (nummer VARCHAR(40) NOT NULL PRIMARY KEY, passwort VARCHAR(255) NOT NULL, rolle VARCHAR(12) NOT NULL, kunde_id VARCHAR(64) NULL, angelegt INT NOT NULL, letzter_login INT NULL)' . $ende);
    $pdo->exec('CREATE TABLE IF NOT EXISTS hadie_sitzung (token_hash CHAR(64) NOT NULL PRIMARY KEY, nummer VARCHAR(40) NOT NULL, gueltig_bis INT NOT NULL)' . $ende);
    $pdo->exec($my
        ? 'CREATE TABLE IF NOT EXISTS hadie_versuch (id BIGINT AUTO_INCREMENT PRIMARY KEY, schluessel VARCHAR(80) NOT NULL, zeit INT NOT NULL, KEY hadie_versuch_idx (schluessel, zeit))' . $ende
        : 'CREATE TABLE IF NOT EXISTS hadie_versuch (id INTEGER PRIMARY KEY AUTOINCREMENT, schluessel TEXT NOT NULL, zeit INTEGER NOT NULL)');
    if (!$my) $pdo->exec('CREATE INDEX IF NOT EXISTS hadie_versuch_idx ON hadie_versuch (schluessel, zeit)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS hadie_daten (tabelle VARCHAR(20)' . $bin . ' NOT NULL, id VARCHAR(64)' . $bin . ' NOT NULL, data ' . ($my ? 'MEDIUMTEXT' : 'TEXT') . ' NOT NULL, aktualisiert INT NOT NULL, PRIMARY KEY (tabelle, id))' . $ende);
}
function abfrage(string $sql, array $p = []): PDOStatement { $s = db()->prepare($sql); $s->execute($p); return $s; }
function typ(): string { global $konfig; return $konfig['db']['typ'] ?? 'mysql'; }

/* ---------------- Anfrage ---------------- */
function istHttps(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}
function body(): array
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fehler(405, 'Nur POST erlaubt.');
    // Schutz vor fremden Seiten: eigener Header + JSON + gleicher Ursprung
    if (($_SERVER['HTTP_X_HADIE'] ?? '') !== '1' || stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) fehler(403, 'Ungültige Anfrage.');
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && strcasecmp((string)parse_url($origin, PHP_URL_HOST) . ((($p = parse_url($origin, PHP_URL_PORT)) ? ':' . $p : '')), (string)($_SERVER['HTTP_HOST'] ?? '')) !== 0) fehler(403, 'Ungültige Anfrage.');
    $roh = file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
    if ($roh === false || strlen($roh) > MAX_BODY) fehler(413, 'Die Datenmenge ist zu groß.');
    $d = json_decode($roh, true);
    if (!is_array($d)) fehler(400, 'Ungültige Daten.');
    return $d;
}
function norm(string $n): string { return (string)preg_replace('/\s+/', '', mb_strtoupper(trim($n))); }

/* ---------------- Sitzung ---------------- */
function cookieSetzen(string $wert, int $bis): void
{
    setcookie('hadie', $wert, ['expires' => $bis, 'path' => '/api/', 'secure' => istHttps(), 'httponly' => true, 'samesite' => 'Strict']);
}
function konto(): array
{
    $t = (string)($_COOKIE['hadie'] ?? '');
    if (!preg_match('/^[a-f0-9]{64}$/', $t)) fehler(401, 'Bitte melden Sie sich an.');
    $h = hash('sha256', $t);
    $k = abfrage('SELECT k.* FROM hadie_sitzung s JOIN hadie_konto k ON k.nummer = s.nummer WHERE s.token_hash = ? AND s.gueltig_bis > ?', [$h, time()])->fetch();
    if (!$k) fehler(401, 'Sitzung abgelaufen. Bitte melden Sie sich neu an.');
    abfrage('UPDATE hadie_sitzung SET gueltig_bis = ? WHERE token_hash = ?', [time() + SITZUNG, $h]);
    cookieSetzen($t, time() + SITZUNG);
    return $k;
}
function verwaltung(): array
{
    $k = konto();
    if ($k['rolle'] !== 'verwaltung') fehler(403, 'Dafür fehlt die Berechtigung.');
    return $k;
}

/* ---------------- Sperre gegen Ausprobieren ---------------- */
function versuche(string $schluessel): int
{
    return (int)abfrage('SELECT COUNT(*) AS n FROM hadie_versuch WHERE schluessel = ? AND zeit > ?', [$schluessel, time() - 900])->fetch()['n'];
}
function versuchMerken(string $schluessel): void { abfrage('INSERT INTO hadie_versuch (schluessel, zeit) VALUES (?, ?)', [$schluessel, time()]); }
function ipSchluessel(): string { return 'ip:' . substr(hash('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? '')), 0, 32); }

/* ---------------- Daten ---------------- */
function gueltigerSatz(mixed $t, mixed $id, mixed $d = []): void
{
    if (!is_string($t) || !preg_match('/^[a-z]{3,20}$/', $t) || !is_string($id) || strlen($id) < 1 || strlen($id) > 64
        || !is_array($d) || strlen((string)json_encode($d)) > 200000) fehler(400, 'Ungültiger Datensatz.');
}
function upsert(string $t, string $id, string $json): void
{
    $sql = typ() === 'sqlite'
        ? 'INSERT INTO hadie_daten (tabelle, id, data, aktualisiert) VALUES (?, ?, ?, ?) ON CONFLICT(tabelle, id) DO UPDATE SET data = excluded.data, aktualisiert = excluded.aktualisiert'
        : 'INSERT INTO hadie_daten (tabelle, id, data, aktualisiert) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), aktualisiert = VALUES(aktualisiert)';
    abfrage($sql, [$t, $id, $json, time()]);
}
function alleZeilen(): array
{
    $aus = [];
    foreach (db()->query('SELECT tabelle, id, data FROM hadie_daten ORDER BY id')->fetchAll() as $z) {
        $d = json_decode($z['data'], true);
        if (is_array($d)) $aus[] = ['t' => $z['tabelle'], 'id' => $z['id'], 'd' => $d];
    }
    return $aus;
}
function datenFuer(array $k): array
{
    $zeilen = alleZeilen();
    $aus = [];
    if ($k['rolle'] === 'verwaltung') {
        foreach ($zeilen as $z) $aus[$z['t']][] = $z['d'];
        return $aus;
    }
    $kunde = $k['kunde_id'];
    $objs = [];
    $team = [];
    foreach ($zeilen as $z) {
        if ($z['t'] === 'objekte' && ($z['d']['kundeId'] ?? null) === $kunde) {
            $objs[$z['id']] = true;
            foreach (['betreuerId', 'vertretungId'] as $f) if (!empty($z['d'][$f])) $team[$z['d'][$f]] = true;
        }
    }
    foreach ($zeilen as $z) {
        $d = $z['d'];
        $ok = false;
        switch (true) {
            case $z['t'] === 'kunden': $ok = $z['id'] === $kunde; break;
            case $z['t'] === 'objekte': $ok = isset($objs[$z['id']]); break;
            case in_array($z['t'], KUNDEN_TABELLEN, true): $ok = isset($objs[(string)($d['objektId'] ?? '')]); break;
            case $z['t'] === 'rechnungen': $ok = ($d['kundeId'] ?? null) === $kunde && in_array($d['status'] ?? '', ['Offen', 'Bezahlt'], true); break;
            case $z['t'] === 'absender': $ok = true; break;
            case $z['t'] === 'mitarbeiter':
                $ok = isset($team[$z['id']]);
                if ($ok) $d = array_intersect_key($d, array_flip(['id', 'name', 'rolle', 'telefon', 'email']));
                break;
        }
        if (!$ok) continue;
        unset($d['notiz']);
        $aus[$z['t']][] = $d;
    }
    return $aus;
}

/* ---------------- Aktionen ---------------- */
switch ($aktion) {
    case 'status': {
        $n = 0;
        try { $n = (int)abfrage("SELECT COUNT(*) AS n FROM hadie_konto WHERE rolle = 'verwaltung'")->fetch()['n']; }
        catch (Throwable $e) { error_log('HaDie-API: ' . $e->getMessage()); antwort(200, ['server' => true, 'konfiguriert' => true, 'datenbank' => false]); }
        antwort(200, ['server' => true, 'konfiguriert' => true, 'datenbank' => true, 'eingerichtet' => $n > 0, 'version' => VERSION]);
    }

    case 'einrichten': {
        $b = body();
        if (abfrage("SELECT 1 AS x FROM hadie_konto WHERE rolle = 'verwaltung' LIMIT 1")->fetch()) fehler(403, 'Die Einrichtung ist bereits erfolgt.');
        $code = (string)($konfig['einrichtungscode'] ?? '');
        if ($code === '') fehler(403, 'Die Einrichtung ist nicht freigeschaltet (Einrichtungscode fehlt in config.php).');
        if (versuche('EINRICHTUNG') >= 8) fehler(429, 'Zu viele Versuche. Bitte warten Sie 15 Minuten.');
        if (!hash_equals($code, trim((string)($b['code'] ?? '')))) { versuchMerken('EINRICHTUNG'); antwort(200, ['ok' => false, 'grund' => 'code']); }
        $n = norm((string)($b['nummer'] ?? ''));
        if (!preg_match('/^V-[A-Z0-9]{3,25}$/', $n)) antwort(200, ['ok' => false, 'grund' => 'nummer']);
        if (mb_strlen((string)($b['passwort'] ?? '')) < 10) antwort(200, ['ok' => false, 'grund' => 'passwort']);
        abfrage('INSERT INTO hadie_konto (nummer, passwort, rolle, angelegt) VALUES (?, ?, ?, ?)', [$n, password_hash((string)$b['passwort'], PASSWORD_DEFAULT), 'verwaltung', time()]);
        antwort(200, ['ok' => true]);
    }

    case 'anmelden': {
        $b = body();
        $n = substr(norm((string)($b['nummer'] ?? '')), 0, 40);
        abfrage('DELETE FROM hadie_versuch WHERE zeit < ?', [time() - 86400]);
        abfrage('DELETE FROM hadie_sitzung WHERE gueltig_bis < ?', [time()]);
        if (versuche($n) >= 8 || versuche(ipSchluessel()) >= 40) antwort(200, ['ok' => false, 'grund' => 'gesperrt']);
        $k = abfrage('SELECT * FROM hadie_konto WHERE nummer = ?', [$n])->fetch();
        // Immer gleich viel Rechenarbeit, damit nicht erkennbar ist, ob die Nummer existiert
        $hash = $k['passwort'] ?? '$2y$10$usesomesillystringforsaltn0tarealhashvalueXXXXXXXXXXXXXXXX';
        $richtig = password_verify((string)($b['passwort'] ?? ''), $hash) && $k;
        if (!$richtig) { versuchMerken($n); versuchMerken(ipSchluessel()); usleep(400000); antwort(200, ['ok' => false, 'grund' => 'ungueltig']); }
        abfrage('DELETE FROM hadie_versuch WHERE schluessel = ?', [$n]);
        $t = bin2hex(random_bytes(32));
        abfrage('INSERT INTO hadie_sitzung (token_hash, nummer, gueltig_bis) VALUES (?, ?, ?)', [hash('sha256', $t), $k['nummer'], time() + SITZUNG]);
        abfrage('UPDATE hadie_konto SET letzter_login = ? WHERE nummer = ?', [time(), $k['nummer']]);
        if (password_needs_rehash($k['passwort'], PASSWORD_DEFAULT)) abfrage('UPDATE hadie_konto SET passwort = ? WHERE nummer = ?', [password_hash((string)$b['passwort'], PASSWORD_DEFAULT), $k['nummer']]);
        cookieSetzen($t, time() + SITZUNG);
        antwort(200, ['ok' => true, 'rolle' => $k['rolle'], 'nummer' => $k['nummer']]);
    }

    case 'abmelden': {
        body();
        $t = (string)($_COOKIE['hadie'] ?? '');
        if ($t !== '') abfrage('DELETE FROM hadie_sitzung WHERE token_hash = ?', [hash('sha256', $t)]);
        cookieSetzen('', time() - 3600);
        antwort(200, ['ok' => true]);
    }

    case 'ich': {
        $k = konto();
        antwort(200, ['ok' => true, 'rolle' => $k['rolle'], 'nummer' => $k['nummer'], 'kundeId' => $k['kunde_id']]);
    }

    case 'lesen': {
        $k = konto();
        $d = datenFuer($k);
        antwort(200, ['ok' => true, 'rolle' => $k['rolle'], 'nummer' => $k['nummer'], 'daten' => $d === [] ? new stdClass() : $d]);
    }

    case 'schreiben': {
        verwaltung();
        $b = body();
        if (!is_array($b['zeilen'] ?? null)) fehler(400, 'Ungültige Daten.');
        $pdo = db();
        $pdo->beginTransaction();
        foreach ($b['zeilen'] as $z) {
            gueltigerSatz($z['t'] ?? null, $z['id'] ?? null, $z['d'] ?? null);
            // Änderungen werden mit dem vorhandenen Datensatz zusammengeführt: so überschreiben sich
            // zwei Personen, die verschiedene Felder desselben Eintrags ändern, nicht gegenseitig.
            $alt = abfrage('SELECT data FROM hadie_daten WHERE tabelle = ? AND id = ?', [$z['t'], $z['id']])->fetch();
            $neu = $alt ? array_replace(json_decode($alt['data'], true) ?: [], $z['d']) : $z['d'];
            $neu['id'] = $z['id'];
            upsert($z['t'], $z['id'], json_encode($neu, JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION));
        }
        $pdo->commit();
        antwort(200, ['ok' => true]);
    }

    case 'loeschen': {
        verwaltung();
        $b = body();
        if (!is_array($b['zeilen'] ?? null)) fehler(400, 'Ungültige Daten.');
        foreach ($b['zeilen'] as $z) {
            gueltigerSatz($z['t'] ?? null, $z['id'] ?? null);
            abfrage('DELETE FROM hadie_daten WHERE tabelle = ? AND id = ?', [$z['t'], $z['id']]);
        }
        antwort(200, ['ok' => true]);
    }

    case 'ersetzen': {
        verwaltung();
        $b = body();
        if (!is_array($b['alles'] ?? null)) fehler(400, 'Ungültige Daten.');
        $pdo = db();
        $pdo->beginTransaction();
        $pdo->exec('DELETE FROM hadie_daten');
        foreach ($b['alles'] as $t => $liste) {
            if (!is_string($t) || !is_array($liste)) { $pdo->rollBack(); fehler(400, 'Ungültige Daten.'); }
            foreach ($liste as $d) {
                if (!is_array($d)) { $pdo->rollBack(); fehler(400, 'Ungültiger Datensatz.'); }
                gueltigerSatz($t, $d['id'] ?? null, $d);
                upsert($t, $d['id'], json_encode($d, JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION));
            }
        }
        $pdo->commit();
        antwort(200, ['ok' => true]);
    }

    case 'melden': {
        $k = konto();
        if ($k['rolle'] !== 'kunde') fehler(403, 'Dafür fehlt die Berechtigung.');
        $b = body();
        $id = (string)($b['id'] ?? '');
        $d = is_array($b['daten'] ?? null) ? $b['daten'] : [];
        $o = (string)($d['objektId'] ?? '');
        $obj = abfrage("SELECT data FROM hadie_daten WHERE tabelle = 'objekte' AND id = ?", [$o])->fetch();
        if (!$obj || (json_decode($obj['data'], true)['kundeId'] ?? null) !== $k['kunde_id']) fehler(403, 'Dieses Objekt gehört nicht zu Ihrem Konto.');
        $titel = trim((string)($d['titel'] ?? ''));
        if (mb_strlen($titel) < 3 || mb_strlen($titel) > 200) fehler(400, 'Bitte beschreiben Sie kurz, worum es geht.');
        if (strlen($id) < 6 || strlen($id) > 64) fehler(400, 'Ungültige Angaben.');
        $kat = in_array($d['kategorie'] ?? '', ['Schaden', 'Störung', 'Notfall', 'Anfrage', 'Beschwerde'], true) ? $d['kategorie'] : 'Anfrage';
        $heute = date('Y-m-d');
        $von = 'Kunde ' . $k['nummer'];
        $n = 0;
        foreach (alleZeilen() as $z) if ($z['t'] === 'vorgaenge' && ($z['d']['von'] ?? '') === $von && ($z['d']['gemeldet'] ?? '') === $heute) $n++;
        if ($n >= 20) fehler(429, 'Für heute sind keine weiteren Meldungen möglich. Bitte rufen Sie uns an.');
        if (abfrage("SELECT 1 AS x FROM hadie_daten WHERE tabelle = 'vorgaenge' AND id = ?", [$id])->fetch()) antwort(200, ['ok' => true]);
        $betreuer = json_decode($obj['data'], true)['betreuerId'] ?? '';
        upsert('vorgaenge', $id, json_encode([
            'id' => $id, 'objektId' => $o, 'titel' => $titel, 'kategorie' => $kat, 'status' => 'Offen', 'gemeldet' => $heute, 'von' => $von,
            'zustaendigId' => $betreuer, 'beschreibung' => mb_substr((string)($d['beschreibung'] ?? ''), 0, 4000), 'angelegt' => $heute,
        ], JSON_UNESCAPED_UNICODE));
        antwort(200, ['ok' => true]);
    }

    case 'anfrage': {
        // Kontaktformular der Website: ohne Anmeldung, mit Spam- und Mengenbremse.
        $b = body();
        if (trim((string)($b['website'] ?? '')) !== '') antwort(200, ['ok' => true]); // Spam-Falle
        $ip = 'anfrage:' . substr(hash('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? '')), 0, 32);
        if (versuche($ip) >= 5) fehler(429, 'Sie haben gerade mehrere Anfragen gesendet. Bitte warten Sie ein paar Minuten oder rufen Sie uns an.');
        $t = fn(string $k, int $max) => trim(mb_substr(str_replace(["\r", "\0"], '', (string)($b[$k] ?? '')), 0, $max));
        $name = $t('name', 120); $email = $t('email', 160); $tel = $t('telefon', 40); $nachricht = $t('nachricht', 5000);
        $weg = ($b['kontaktweg'] ?? '') === 'Rückruf' ? 'Rückruf' : 'E-Mail';
        $zeit = in_array($b['zeit'] ?? '', ['Vormittags', 'Mittags', 'Nachmittags', 'Egal'], true) ? $b['zeit'] : '';
        $rolle = in_array($b['rolle'] ?? '', ['Eigentümer/in', 'Teil einer Eigentümergemeinschaft', 'Investor/in', 'Sonstiges'], true) ? $b['rolle'] : '';
        $bereiche = array_values(array_filter(array_map(fn($x) => mb_substr(trim((string)$x), 0, 60), is_array($b['bereiche'] ?? null) ? array_slice($b['bereiche'], 0, 10) : []), fn($x) => $x !== ''));
        if (mb_strlen($name) < 2) fehler(400, 'Bitte geben Sie Ihren Namen an.');
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) fehler(400, 'Bitte prüfen Sie Ihre E-Mail-Adresse.');
        if ($weg === 'E-Mail' && $email === '') fehler(400, 'Bitte geben Sie Ihre E-Mail-Adresse an.');
        if ($weg === 'Rückruf' && !preg_match('/^[0-9 +()\/-]{6,40}$/', $tel)) fehler(400, 'Bitte geben Sie eine Telefonnummer für den Rückruf an.');
        if ($tel !== '' && !preg_match('/^[0-9 +()\/-]{6,40}$/', $tel)) fehler(400, 'Bitte prüfen Sie Ihre Telefonnummer.');
        if (mb_strlen($nachricht) < 5) fehler(400, 'Bitte schreiben Sie uns kurz, worum es geht.');
        abfrage('DELETE FROM hadie_versuch WHERE zeit < ?', [time() - 86400]);
        versuchMerken($ip);
        $id = 'web' . date('ymdHis') . bin2hex(random_bytes(3));
        upsert('anfragen', $id, json_encode([
            'id' => $id, 'eingang' => date('Y-m-d'), 'uhrzeit' => date('H:i'), 'name' => $name, 'email' => $email, 'telefon' => $tel,
            'kontaktweg' => $weg, 'zeit' => $zeit, 'rolle' => $rolle, 'bereiche' => implode(', ', $bereiche), 'nachricht' => $nachricht,
            'status' => 'Neu', 'angelegt' => date('Y-m-d'),
        ], JSON_UNESCAPED_UNICODE));
        // Benachrichtigung per E-Mail (wenn der Webspace E-Mails versenden kann). Die Anfrage ist schon gespeichert.
        $an = (string)($konfig['kontakt_email'] ?? '');
        if ($an !== '' && filter_var($an, FILTER_VALIDATE_EMAIL) && function_exists('mail')) {
            $host = preg_replace('/^www\./', '', preg_replace('/[^a-z0-9.-]/', '', strtolower((string)($_SERVER['HTTP_HOST'] ?? 'localhost'))));
            $von = (string)($konfig['absender_email'] ?? ('website@' . $host));
            $kopf = ['From: HaDie-Website <' . $von . '>', 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit'];
            if ($email !== '') $kopf[] = 'Reply-To: ' . $email;
            $text = "Neue Anfrage über die Website\n\n"
                . "Name: $name\nE-Mail: " . ($email ?: '–') . "\nTelefon: " . ($tel ?: '–') . "\n"
                . "Gewünscht: $weg" . ($zeit ? " ($zeit)" : '') . "\nIch bin: " . ($rolle ?: '–') . "\nThemen: " . ($bereiche ? implode(', ', $bereiche) : '–') . "\n\n"
                . "Nachricht:\n$nachricht\n\n– Die Anfrage steht auch im Verwaltertool unter „Website-Anfragen“.\n";
            $betreff = '=?UTF-8?B?' . base64_encode('Neue Anfrage: ' . $name . ($weg === 'Rückruf' ? ' (Rückruf)' : '')) . '?=';
            if (!@mail($an, $betreff, $text, implode("\r\n", $kopf), '-f' . $von)) error_log('HaDie-API: Benachrichtigung nicht versendet');
        }
        antwort(200, ['ok' => true]);
    }

    case 'konten': {
        verwaltung();
        $l = [];
        foreach (db()->query('SELECT nummer, rolle, kunde_id, angelegt, letzter_login FROM hadie_konto ORDER BY rolle, nummer')->fetchAll() as $k)
            $l[] = ['nummer' => $k['nummer'], 'rolle' => $k['rolle'], 'kundeId' => $k['kunde_id'], 'angelegt' => (int)$k['angelegt'], 'letzterLogin' => $k['letzter_login'] ? (int)$k['letzter_login'] : null];
        antwort(200, ['ok' => true, 'konten' => $l]);
    }

    case 'konto-setzen': {
        verwaltung();
        $b = body();
        $n = norm((string)($b['nummer'] ?? ''));
        $pw = (string)($b['passwort'] ?? '');
        $rolle = (string)($b['rolle'] ?? '');
        $kid = (string)($b['kundeId'] ?? '');
        if (!preg_match('/^[A-Z0-9-]{4,30}$/', $n)) fehler(400, 'Die Nummer darf nur Buchstaben, Ziffern und Bindestrich enthalten.');
        if (mb_strlen($pw) < 10) fehler(400, 'Das Passwort braucht mindestens 10 Zeichen.');
        if ($rolle === 'verwaltung') { if (!str_starts_with($n, 'V-')) fehler(400, 'Nummern der Verwaltung beginnen mit V-.'); $kid = null; }
        elseif ($rolle === 'kunde') {
            if (str_starts_with($n, 'V-')) fehler(400, 'Kundennummern beginnen nicht mit V-.');
            if (!abfrage("SELECT 1 AS x FROM hadie_daten WHERE tabelle = 'kunden' AND id = ?", [$kid])->fetch()) fehler(400, 'Der Kunde ist nicht angelegt.');
        } else fehler(400, 'Ungültige Rolle.');
        $alt = abfrage('SELECT rolle FROM hadie_konto WHERE nummer = ?', [$n])->fetch();
        $hash = password_hash($pw, PASSWORD_DEFAULT);
        if ($alt) {
            if ($alt['rolle'] !== $rolle) fehler(400, 'Zu dieser Nummer gibt es bereits ein Konto mit anderer Rolle.');
            abfrage('UPDATE hadie_konto SET passwort = ?, kunde_id = ? WHERE nummer = ?', [$hash, $kid, $n]);
        } else {
            abfrage('INSERT INTO hadie_konto (nummer, passwort, rolle, kunde_id, angelegt) VALUES (?, ?, ?, ?, ?)', [$n, $hash, $rolle, $kid, time()]);
        }
        abfrage('DELETE FROM hadie_sitzung WHERE nummer = ?', [$n]);
        antwort(200, ['ok' => true]);
    }

    case 'konto-loeschen': {
        $k = verwaltung();
        $b = body();
        $n = norm((string)($b['nummer'] ?? ''));
        if ($n === $k['nummer']) fehler(400, 'Das eigene Konto lässt sich nicht löschen.');
        abfrage('DELETE FROM hadie_sitzung WHERE nummer = ?', [$n]);
        abfrage('DELETE FROM hadie_konto WHERE nummer = ?', [$n]);
        antwort(200, ['ok' => true]);
    }

    case 'passwort': {
        $k = konto();
        $b = body();
        if (!password_verify((string)($b['alt'] ?? ''), $k['passwort'])) { usleep(400000); antwort(200, ['ok' => false, 'grund' => 'alt']); }
        if (mb_strlen((string)($b['neu'] ?? '')) < 10) antwort(200, ['ok' => false, 'grund' => 'kurz']);
        abfrage('UPDATE hadie_konto SET passwort = ? WHERE nummer = ?', [password_hash((string)$b['neu'], PASSWORD_DEFAULT), $k['nummer']]);
        abfrage('DELETE FROM hadie_sitzung WHERE nummer = ? AND token_hash <> ?', [$k['nummer'], hash('sha256', (string)$_COOKIE['hadie'])]);
        antwort(200, ['ok' => true]);
    }

    default:
        fehler(404, 'Unbekannte Aktion.');
}
