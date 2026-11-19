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
const ADMIN_TABELLEN = ['absender', 'bankkonten', 'mietkonten']; // nur Admin-Zugänge dürfen schreiben
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
    adminSpalte($pdo);
    zweiFaktorSpalten($pdo);
    dateienTabelle($pdo, $typ);
    return $pdo;
}
/** Fotos und Dateien (z. B. Übergabeprotokolle) liegen getrennt: sie werden nicht bei jedem „lesen“ mitgeschickt. */
function dateienTabelle(PDO $pdo, string $typ): void
{
    try { $pdo->query('SELECT 1 FROM hadie_dateien LIMIT 1'); return; } catch (Throwable $e) { /* fehlt noch */ }
    $my = $typ !== 'sqlite';
    $pdo->exec('CREATE TABLE IF NOT EXISTS hadie_dateien (id VARCHAR(64) NOT NULL PRIMARY KEY, objekt_id VARCHAR(64) NULL, mime VARCHAR(40) NOT NULL, data ' . ($my ? 'MEDIUMTEXT' : 'TEXT') . ' NOT NULL, erstellt INT NOT NULL)' . ($my ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : ''));
}
function tabellenAnlegen(PDO $pdo, string $typ): void
{
    try { $pdo->query('SELECT 1 FROM hadie_konto LIMIT 1'); $pdo->query('SELECT 1 FROM hadie_daten LIMIT 1'); return; } catch (Throwable $e) { /* noch nicht vorhanden */ }
    $my = $typ !== 'sqlite';
    $ende = $my ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : '';
    $bin = $my ? ' CHARACTER SET utf8mb4 COLLATE utf8mb4_bin' : '';
    $pdo->exec('CREATE TABLE IF NOT EXISTS hadie_konto (nummer VARCHAR(40) NOT NULL PRIMARY KEY, passwort VARCHAR(255) NOT NULL, rolle VARCHAR(12) NOT NULL, kunde_id VARCHAR(64) NULL, angelegt INT NOT NULL, letzter_login INT NULL, admin INT NOT NULL DEFAULT 0, totp_secret VARCHAR(64) NULL, totp_aktiv INT NOT NULL DEFAULT 0, totp_letzter BIGINT NOT NULL DEFAULT 0, totp_reserve TEXT NULL)' . $ende);
    $pdo->exec('CREATE TABLE IF NOT EXISTS hadie_sitzung (token_hash CHAR(64) NOT NULL PRIMARY KEY, nummer VARCHAR(40) NOT NULL, gueltig_bis INT NOT NULL)' . $ende);
    $pdo->exec($my
        ? 'CREATE TABLE IF NOT EXISTS hadie_versuch (id BIGINT AUTO_INCREMENT PRIMARY KEY, schluessel VARCHAR(80) NOT NULL, zeit INT NOT NULL, KEY hadie_versuch_idx (schluessel, zeit))' . $ende
        : 'CREATE TABLE IF NOT EXISTS hadie_versuch (id INTEGER PRIMARY KEY AUTOINCREMENT, schluessel TEXT NOT NULL, zeit INTEGER NOT NULL)');
    if (!$my) $pdo->exec('CREATE INDEX IF NOT EXISTS hadie_versuch_idx ON hadie_versuch (schluessel, zeit)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS hadie_daten (tabelle VARCHAR(20)' . $bin . ' NOT NULL, id VARCHAR(64)' . $bin . ' NOT NULL, data ' . ($my ? 'MEDIUMTEXT' : 'TEXT') . ' NOT NULL, aktualisiert INT NOT NULL, PRIMARY KEY (tabelle, id))' . $ende);
}
/** Nachrüstung: Spalte „admin“. Der älteste Verwaltungs-Zugang (aus der Einrichtung) wird Admin. */
function adminSpalte(PDO $pdo): void
{
    try { $pdo->query('SELECT admin FROM hadie_konto LIMIT 1'); return; } catch (Throwable $e) { /* fehlt noch */ }
    $pdo->exec('ALTER TABLE hadie_konto ADD COLUMN admin INT NOT NULL DEFAULT 0');
    $erster = $pdo->query("SELECT nummer FROM hadie_konto WHERE rolle = 'verwaltung' ORDER BY angelegt, nummer LIMIT 1")->fetch();
    if ($erster) $pdo->prepare('UPDATE hadie_konto SET admin = 1 WHERE nummer = ?')->execute([$erster['nummer']]);
}
/** Nachrüstung: Spalten für die Zwei-Faktor-Anmeldung (TOTP). */
function zweiFaktorSpalten(PDO $pdo): void
{
    try { $pdo->query('SELECT totp_aktiv FROM hadie_konto LIMIT 1'); return; } catch (Throwable $e) { /* fehlt noch */ }
    $pdo->exec('ALTER TABLE hadie_konto ADD COLUMN totp_secret VARCHAR(64) NULL');
    $pdo->exec('ALTER TABLE hadie_konto ADD COLUMN totp_aktiv INT NOT NULL DEFAULT 0');
    $pdo->exec('ALTER TABLE hadie_konto ADD COLUMN totp_letzter BIGINT NOT NULL DEFAULT 0');
    $pdo->exec('ALTER TABLE hadie_konto ADD COLUMN totp_reserve TEXT NULL');
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

/* ---------------- Zwei-Faktor-Anmeldung (TOTP, RFC 6238) ---------------- */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(string $bin): string
{
    $bits = ''; foreach (str_split($bin) as $c) $bits .= str_pad(decbin(ord($c)), 8, '0', STR_PAD_LEFT);
    $aus = ''; foreach (str_split($bits, 5) as $teil) $aus .= B32[bindec(str_pad($teil, 5, '0'))];
    return $aus;
}
function base32Lesen(string $text): string
{
    $bits = ''; foreach (str_split(strtoupper($text)) as $c) { $i = strpos(B32, $c); if ($i === false) continue; $bits .= str_pad(decbin($i), 5, '0', STR_PAD_LEFT); }
    $aus = ''; foreach (str_split($bits, 8) as $teil) if (strlen($teil) === 8) $aus .= chr(bindec($teil));
    return $aus;
}
function totp(string $geheim, int $schritt): string
{
    $h = hash_hmac('sha1', pack('J', $schritt), base32Lesen($geheim), true);
    $o = ord($h[19]) & 0x0f;
    $zahl = ((ord($h[$o]) & 0x7f) << 24) | (ord($h[$o + 1]) << 16) | (ord($h[$o + 2]) << 8) | ord($h[$o + 3]);
    return str_pad((string)($zahl % 1000000), 6, '0', STR_PAD_LEFT);
}
/** Prüft einen 6-stelligen Code (±30 s) gegen ein Geheimnis; gibt den Zeitschritt zurück oder 0. Jeder Code gilt nur einmal. */
function totpSchritt(string $geheim, string $code, int $letzter): int
{
    if (!preg_match('/^\d{6}$/', $code)) return 0;
    $jetzt = intdiv(time(), 30);
    for ($d = -1; $d <= 1; $d++) if ($jetzt + $d > $letzter && hash_equals(totp($geheim, $jetzt + $d), $code)) return $jetzt + $d;
    return 0;
}
/** Zweiter Faktor für ein Konto: App-Code oder einmaliger Ersatzcode. */
function zweiterFaktorOk(array $k, string $code): bool
{
    $code = strtoupper((string)preg_replace('/[\s-]+/', '', $code));
    $schritt = totpSchritt((string)$k['totp_secret'], $code, (int)$k['totp_letzter']);
    if ($schritt) { abfrage('UPDATE hadie_konto SET totp_letzter = ? WHERE nummer = ?', [$schritt, $k['nummer']]); return true; }
    $reserve = json_decode((string)($k['totp_reserve'] ?? '[]'), true) ?: [];
    $h = hash('sha256', $code);
    foreach ($reserve as $i => $r) if (hash_equals($r, $h)) {
        array_splice($reserve, $i, 1);
        abfrage('UPDATE hadie_konto SET totp_reserve = ? WHERE nummer = ?', [json_encode($reserve), $k['nummer']]);
        return true;
    }
    return false;
}

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
/** Nur der Admin (Inhaber) darf Verwaltungs-Zugänge verwalten und den gesamten Datenbestand ersetzen. */
function admin(): array
{
    $k = verwaltung();
    if ((int)($k['admin'] ?? 0) !== 1) fehler(403, 'Das darf nur ein Admin-Zugang (Inhaber).');
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
            case $z['t'] === 'bankkonten': $ok = !empty($d['aufRechnungen']); if ($ok) $d = array_intersect_key($d, array_flip(['id', 'bezeichnung', 'inhaber', 'iban', 'bic', 'bank', 'aufRechnungen'])); break;
            case $z['t'] === 'mitarbeiter':
                $ok = isset($team[$z['id']]);
                if ($ok) $d = array_intersect_key($d, array_flip(['id', 'name', 'rolle', 'telefon', 'email']));
                break;
        }
        if (!$ok) continue;
        unset($d['notiz']);
        $aus[$z['t']][] = $d;
    }
    $aus['auswertung'] = auswertung($zeilen, $objs);
    return $aus;
}

/**
 * Kennzahlen für den Kundenbereich – nur Summen je Objekt und Monat, keine Mieternamen:
 * Einheiten, vermietete Einheiten, Soll- und Ist-Mieteingang der letzten 12 Monate.
 */
function auswertung(array $zeilen, array $objs): array
{
    $einheit = []; $mieter = []; $aend = []; $zahl = [];
    foreach ($zeilen as $z) {
        $d = $z['d'];
        if ($z['t'] === 'einheiten' && isset($objs[(string)($d['objektId'] ?? '')])) $einheit[$z['id']] = (string)$d['objektId'];
    }
    foreach ($zeilen as $z) {
        $d = $z['d'];
        if ($z['t'] === 'mieter' && isset($einheit[(string)($d['einheitId'] ?? '')])) $mieter[$z['id']] = $d + ['_objekt' => $einheit[$d['einheitId']]];
    }
    foreach ($zeilen as $z) {
        $d = $z['d'];
        if ($z['t'] === 'mietaenderungen' && isset($mieter[(string)($d['mieterId'] ?? '')])) $aend[$d['mieterId']][] = $d;
        if ($z['t'] === 'zahlungen' && isset($mieter[(string)($d['mieterId'] ?? '')])) {
            $m = (string)($d['monat'] ?? '');
            $zahl[$mieter[$d['mieterId']]['_objekt']][$m] = ($zahl[$mieter[$d['mieterId']]['_objekt']][$m] ?? 0) + (float)($d['betrag'] ?? 0);
        }
    }
    $kalt = function (array $m, string $tag) use ($aend): float {
        $v = $aend[$m['id'] ?? ''] ?? [];
        usort($v, fn($a, $b) => strcmp((string)($a['ab'] ?? ''), (string)($b['ab'] ?? '')));
        $bis = array_values(array_filter($v, fn($x) => (string)($x['ab'] ?? '') <= $tag));
        if ($bis) return (float)$bis[count($bis) - 1]['kaltmiete'];
        if ($v && isset($v[0]['alt']) && $v[0]['alt'] !== '') return (float)$v[0]['alt'];
        return (float)($m['kaltmiete'] ?? 0);
    };
    $monate = [];
    for ($i = 11; $i >= 0; $i--) $monate[] = date('Y-m', strtotime(date('Y-m-01') . " -$i months"));
    $heute = date('Y-m-d');
    $aus = [];
    foreach (array_keys($objs) as $o) {
        $eh = array_keys(array_filter($einheit, fn($x) => $x === $o));
        $aktiv = 0;
        foreach ($mieter as $m) if ($m['_objekt'] === $o && (string)($m['beginn'] ?? '9999') <= $heute && (empty($m['ende']) || (string)$m['ende'] >= $heute)) $aktiv++;
        $verlauf = [];
        foreach ($monate as $mo) {
            $start = "$mo-01"; $ende = date('Y-m-t', strtotime($start));
            $soll = 0.0;
            foreach ($mieter as $m) {
                if ($m['_objekt'] !== $o || (string)($m['beginn'] ?? '9999') > $ende || (!empty($m['ende']) && (string)$m['ende'] < $start)) continue;
                $soll += $kalt($m, $start) + (float)($m['nebenkosten'] ?? 0);
            }
            $verlauf[] = ['monat' => $mo, 'soll' => round($soll, 2), 'ist' => round($zahl[$o][$mo] ?? 0, 2)];
        }
        $aus[$o] = ['einheiten' => count($eh), 'vermietet' => min($aktiv, count($eh)), 'monate' => $verlauf];
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
        abfrage('INSERT INTO hadie_konto (nummer, passwort, rolle, angelegt, admin) VALUES (?, ?, ?, ?, 1)', [$n, password_hash((string)$b['passwort'], PASSWORD_DEFAULT), 'verwaltung', time()]);
        antwort(200, ['ok' => true]);
    }

    case 'anmelden': {
        $b = body();
        $n = substr(norm((string)($b['nummer'] ?? '')), 0, 40);
        abfrage('DELETE FROM hadie_versuch WHERE zeit < ?', [time() - 86400]);
        abfrage('DELETE FROM hadie_sitzung WHERE gueltig_bis < ?', [time()]);
        // Gesperrt wird die Kombination Nummer + Gerät (IP): Ein Fremder kann so niemanden aussperren.
        // Zusätzlich Obergrenzen je IP und – gegen verteiltes Ausprobieren – je Nummer.
        $kombi = substr($n, 0, 40) . '|' . substr(ipSchluessel(), 3, 32);
        if (versuche($kombi) >= 8 || versuche(ipSchluessel()) >= 40 || versuche($n) >= 100) antwort(200, ['ok' => false, 'grund' => 'gesperrt']);
        $k = abfrage('SELECT * FROM hadie_konto WHERE nummer = ?', [$n])->fetch();
        // Immer gleich viel Rechenarbeit, damit nicht erkennbar ist, ob die Nummer existiert
        $hash = $k['passwort'] ?? '$2y$10$usesomesillystringforsaltn0tarealhashvalueXXXXXXXXXXXXXXXX';
        $richtig = password_verify((string)($b['passwort'] ?? ''), $hash) && $k;
        if (!$richtig) { versuchMerken($kombi); versuchMerken($n); versuchMerken(ipSchluessel()); usleep(400000); antwort(200, ['ok' => false, 'grund' => 'ungueltig']); }
        if ((int)($k['totp_aktiv'] ?? 0) === 1) {
            $code = trim((string)($b['code'] ?? ''));
            if ($code === '') antwort(200, ['ok' => false, 'grund' => 'zweiter-faktor']);
            $tk = 'totp:' . $k['nummer'];
            if (versuche($tk) >= 10) antwort(200, ['ok' => false, 'grund' => 'gesperrt']);
            if (!zweiterFaktorOk($k, $code)) { versuchMerken($tk); versuchMerken($kombi); usleep(400000); antwort(200, ['ok' => false, 'grund' => 'code']); }
            abfrage('DELETE FROM hadie_versuch WHERE schluessel = ?', [$tk]);
        }
        abfrage('DELETE FROM hadie_versuch WHERE schluessel = ?', [$kombi]);
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
        antwort(200, ['ok' => true, 'rolle' => $k['rolle'], 'nummer' => $k['nummer'], 'kundeId' => $k['kunde_id'], 'admin' => (int)($k['admin'] ?? 0) === 1, 'zweiFaktor' => (int)($k['totp_aktiv'] ?? 0) === 1]);
    }

    case 'lesen': {
        $k = konto();
        $d = datenFuer($k);
        antwort(200, ['ok' => true, 'rolle' => $k['rolle'], 'nummer' => $k['nummer'], 'daten' => $d === [] ? new stdClass() : $d]);
    }

    case 'schreiben': {
        $ich = verwaltung();
        $istAdmin = (int)($ich['admin'] ?? 0) === 1;
        $b = body();
        if (!is_array($b['zeilen'] ?? null)) fehler(400, 'Ungültige Daten.');
        $pdo = db();
        $pdo->beginTransaction();
        foreach ($b['zeilen'] as $z) {
            gueltigerSatz($z['t'] ?? null, $z['id'] ?? null, $z['d'] ?? null);
            // Änderungen werden mit dem vorhandenen Datensatz zusammengeführt: so überschreiben sich
            // zwei Personen, die verschiedene Felder desselben Eintrags ändern, nicht gegenseitig.
            $alt = abfrage('SELECT data FROM hadie_daten WHERE tabelle = ? AND id = ?', [$z['t'], $z['id']])->fetch();
            $altD = $alt ? (json_decode($alt['data'], true) ?: []) : [];
            if (!$istAdmin) {
                if (in_array($z['t'], ADMIN_TABELLEN, true)) { $pdo->rollBack(); fehler(403, 'Unternehmensdaten und Bankverbindungen kann nur ein Admin-Zugang ändern.'); }
                if ($z['t'] === 'objekte' && $alt) foreach (['betreuerId', 'vertretungId'] as $f)
                    if (array_key_exists($f, $z['d']) && (string)$z['d'][$f] !== (string)($altD[$f] ?? '')) { $pdo->rollBack(); fehler(403, 'Die Zuweisung von Objekten kann nur ein Admin-Zugang ändern.'); }
            }
            $neu = $alt ? array_replace($altD, $z['d']) : $z['d'];
            $neu['id'] = $z['id'];
            upsert($z['t'], $z['id'], json_encode($neu, JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION));
        }
        $pdo->commit();
        antwort(200, ['ok' => true]);
    }

    case 'loeschen': {
        $ich = verwaltung();
        $b = body();
        if (!is_array($b['zeilen'] ?? null)) fehler(400, 'Ungültige Daten.');
        foreach ($b['zeilen'] as $z) {
            gueltigerSatz($z['t'] ?? null, $z['id'] ?? null);
            if ((int)($ich['admin'] ?? 0) !== 1 && in_array($z['t'], ADMIN_TABELLEN, true)) fehler(403, 'Unternehmensdaten und Bankverbindungen kann nur ein Admin-Zugang löschen.');
            abfrage('DELETE FROM hadie_daten WHERE tabelle = ? AND id = ?', [$z['t'], $z['id']]);
        }
        antwort(200, ['ok' => true]);
    }

    case 'datei-speichern': {
        verwaltung();
        $b = body();
        $id = (string)($b['id'] ?? '');
        if (!preg_match('/^[a-z0-9]{6,40}$/', $id)) fehler(400, 'Ungültige Kennung.');
        if (!preg_match('#^data:(image/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$#', (string)($b['daten'] ?? ''), $t)) fehler(400, 'Nur Fotos (JPEG, PNG, WebP).');
        $roh = base64_decode($t[2], true);
        if ($roh === false || strlen($roh) > 3 * 1024 * 1024) fehler(413, 'Das Foto ist zu groß (höchstens 3 MB).');
        $info = @getimagesizefromstring($roh);
        if (!$info || ($info['mime'] ?? '') !== $t[1]) fehler(400, 'Die Datei ist kein gültiges Bild.');
        $sql = typ() === 'sqlite'
            ? 'INSERT INTO hadie_dateien (id, objekt_id, mime, data, erstellt) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET objekt_id = excluded.objekt_id, mime = excluded.mime, data = excluded.data'
            : 'INSERT INTO hadie_dateien (id, objekt_id, mime, data, erstellt) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE objekt_id = VALUES(objekt_id), mime = VALUES(mime), data = VALUES(data)';
        abfrage($sql, [$id, substr((string)($b['objektId'] ?? ''), 0, 64), $t[1], $t[2], time()]);
        antwort(200, ['ok' => true, 'id' => $id]);
    }

    case 'datei': {
        verwaltung();
        $id = (string)($_GET['id'] ?? '');
        if (!preg_match('/^[a-z0-9]{6,40}$/', $id)) fehler(400, 'Ungültige Kennung.');
        $d = abfrage('SELECT mime, data FROM hadie_dateien WHERE id = ?', [$id])->fetch();
        if (!$d) fehler(404, 'Nicht gefunden.');
        header_remove('Content-Type');
        header('Content-Type: ' . $d['mime']);
        header('Cache-Control: private, max-age=86400');
        header('X-Content-Type-Options: nosniff');
        echo base64_decode($d['data']);
        exit;
    }

    case 'datei-loeschen': {
        verwaltung();
        $b = body();
        abfrage('DELETE FROM hadie_dateien WHERE id = ?', [(string)($b['id'] ?? '')]);
        antwort(200, ['ok' => true]);
    }

    case 'ersetzen': {
        admin();
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
        // Formulare der Website (Anfrage oder Schadensmeldung): ohne Anmeldung, mit Spam- und Mengenbremse.
        $b = body();
        if (trim((string)($b['website'] ?? '')) !== '') antwort(200, ['ok' => true]); // Spam-Falle
        $ip = 'anfrage:' . substr(hash('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? '')), 0, 32);
        if (versuche($ip) >= 5) fehler(429, 'Sie haben gerade mehrere Nachrichten gesendet. Bitte warten Sie ein paar Minuten oder rufen Sie uns an.');
        $t = fn(string $k, int $max) => trim(mb_substr(str_replace(["\r", "\0"], '', (string)($b[$k] ?? '')), 0, $max));
        $schaden = ($b['art'] ?? '') === 'Schaden';
        $name = $t('name', 120); $email = $t('email', 160); $tel = $t('telefon', 40); $nachricht = $t('nachricht', 5000);
        $weg = $schaden || ($b['kontaktweg'] ?? '') === 'Rückruf' ? 'Rückruf' : 'E-Mail';
        $zeit = in_array($b['zeit'] ?? '', ['Vormittags', 'Mittags', 'Nachmittags', 'Egal'], true) ? $b['zeit'] : '';
        $rolle = in_array($b['rolle'] ?? '', ['Eigentümer/in', 'Teil einer Eigentümergemeinschaft', 'Investor/in', 'Mieter/in', 'Sonstiges'], true) ? $b['rolle'] : '';
        $bereiche = array_values(array_filter(array_map(fn($x) => mb_substr(trim((string)$x), 0, 60), is_array($b['bereiche'] ?? null) ? array_slice($b['bereiche'], 0, 10) : []), fn($x) => $x !== ''));
        $adresse = $t('adresse', 200); $lage = $t('lage', 120); $erreichbar = $t('erreichbar', 200);
        $kategorie = in_array($b['kategorie'] ?? '', ['Wasser', 'Heizung / Warmwasser', 'Strom', 'Fenster / Türen', 'Schloss / Schlüssel', 'Feuchtigkeit / Schimmel', 'Sonstiges'], true) ? $b['kategorie'] : 'Sonstiges';
        $dringend = ($b['dringlichkeit'] ?? '') === 'Dringend' ? 'Dringend' : 'Kann warten';
        if (mb_strlen($name) < 2) fehler(400, 'Bitte geben Sie Ihren Namen an.');
        if ($schaden && mb_strlen($adresse) < 5) fehler(400, 'Bitte geben Sie die Anschrift des Hauses an.');
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) fehler(400, 'Bitte prüfen Sie Ihre E-Mail-Adresse.');
        if ($weg === 'E-Mail' && $email === '') fehler(400, 'Bitte geben Sie Ihre E-Mail-Adresse an.');
        if ($weg === 'Rückruf' && !preg_match('/^[0-9 +()\/-]{6,40}$/', $tel)) fehler(400, $schaden ? 'Bitte geben Sie eine Telefonnummer an, damit wir Sie erreichen.' : 'Bitte geben Sie eine Telefonnummer für den Rückruf an.');
        if ($tel !== '' && !preg_match('/^[0-9 +()\/-]{6,40}$/', $tel)) fehler(400, 'Bitte prüfen Sie Ihre Telefonnummer.');
        if (mb_strlen($nachricht) < 5) fehler(400, $schaden ? 'Bitte beschreiben Sie kurz, was passiert ist.' : 'Bitte schreiben Sie uns kurz, worum es geht.');
        abfrage('DELETE FROM hadie_versuch WHERE zeit < ?', [time() - 86400]);
        versuchMerken($ip);
        $id = 'web' . date('ymdHis') . bin2hex(random_bytes(3));
        $satz = [
            'id' => $id, 'art' => $schaden ? 'Schadensmeldung' : 'Anfrage', 'eingang' => date('Y-m-d'), 'uhrzeit' => date('H:i'),
            'name' => $name, 'email' => $email, 'telefon' => $tel, 'kontaktweg' => $weg, 'zeit' => $zeit, 'rolle' => $schaden ? 'Mieter/in' : $rolle,
            'nachricht' => $nachricht, 'status' => 'Neu', 'angelegt' => date('Y-m-d'),
        ];
        if ($schaden) $satz += ['adresse' => $adresse, 'lage' => $lage, 'kategorie' => $kategorie, 'dringlichkeit' => $dringend, 'erreichbar' => $erreichbar];
        else $satz['bereiche'] = implode(', ', $bereiche);
        upsert('anfragen', $id, json_encode($satz, JSON_UNESCAPED_UNICODE));
        // Benachrichtigung per E-Mail (wenn der Webspace E-Mails versenden kann). Die Nachricht ist schon gespeichert.
        $an = (string)($konfig['kontakt_email'] ?? '');
        if ($an !== '' && filter_var($an, FILTER_VALIDATE_EMAIL) && function_exists('mail')) {
            $host = preg_replace('/^www\./', '', preg_replace('/[^a-z0-9.-]/', '', strtolower((string)($_SERVER['HTTP_HOST'] ?? 'localhost'))));
            $von = (string)($konfig['absender_email'] ?? ('website@' . $host));
            $kopf = ['From: HaDie-Website <' . $von . '>', 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit'];
            if ($email !== '') $kopf[] = 'Reply-To: ' . $email;
            $text = $schaden
                ? "Neue SCHADENSMELDUNG über die Website ($dringend)\n\n"
                    . "Anschrift: $adresse\nWohnung / Lage: " . ($lage ?: '–') . "\nArt: $kategorie\n\n"
                    . "Name: $name\nTelefon: $tel\nE-Mail: " . ($email ?: '–') . "\nErreichbar / Zugang: " . ($erreichbar ?: '–') . "\n\n"
                    . "Was ist passiert:\n$nachricht\n\n– Die Meldung steht auch im Verwaltertool unter „Website-Anfragen“.\n"
                : "Neue Anfrage über die Website\n\n"
                    . "Name: $name\nE-Mail: " . ($email ?: '–') . "\nTelefon: " . ($tel ?: '–') . "\n"
                    . "Gewünscht: $weg" . ($zeit ? " ($zeit)" : '') . "\nIch bin: " . ($rolle ?: '–') . "\nThemen: " . ($bereiche ? implode(', ', $bereiche) : '–') . "\n\n"
                    . "Nachricht:\n$nachricht\n\n– Die Anfrage steht auch im Verwaltertool unter „Website-Anfragen“.\n";
            $titel = $schaden ? ($dringend === 'Dringend' ? 'DRINGEND – ' : '') . 'Schadensmeldung: ' . $kategorie . ', ' . $adresse : 'Neue Anfrage: ' . $name . ($weg === 'Rückruf' ? ' (Rückruf)' : '');
            $betreff = '=?UTF-8?B?' . base64_encode(mb_substr($titel, 0, 150)) . '?=';
            if (!@mail($an, $betreff, $text, implode("\r\n", $kopf), '-f' . $von)) error_log('HaDie-API: Benachrichtigung nicht versendet');
        }
        antwort(200, ['ok' => true]);
    }

    case 'sicherung': {
        // Datensicherung für den nächtlichen GitHub-Lauf. Nur mit dem geheimen Schlüssel
        // (Kopfzeile X-HaDie-Sicherung); in config.php steht nur dessen SHA-256-Prüfwert.
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fehler(405, 'Nur POST erlaubt.');
        $soll = strtolower((string)($konfig['sicherung_hash'] ?? ''));
        if (!preg_match('/^[a-f0-9]{64}$/', $soll)) fehler(403, 'Die Datensicherung ist nicht eingerichtet.');
        $ip = 'sicherung:' . substr(hash('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? '')), 0, 32);
        if (versuche($ip) >= 5) fehler(429, 'Zu viele Versuche. Bitte warten Sie 15 Minuten.');
        $schluessel = (string)($_SERVER['HTTP_X_HADIE_SICHERUNG'] ?? '');
        if (strlen($schluessel) < 20 || !hash_equals($soll, hash('sha256', $schluessel))) { versuchMerken($ip); fehler(403, 'Kein Zugriff.'); }
        $daten = [];
        foreach (alleZeilen() as $z) $daten[$z['t']][] = $z['d'];
        $konten = abfrage('SELECT nummer, passwort, rolle, kunde_id, angelegt, letzter_login FROM hadie_konto ORDER BY nummer')->fetchAll();
        header('Cache-Control: no-store');
        antwort(200, [
            'format' => 'hadie-verwaltung', 'version' => 1, 'stand' => date('c'), 'quelle' => 'nächtliche Sicherung',
            'daten' => $daten === [] ? new stdClass() : $daten,
            'konten' => $konten,
            'dateien' => abfrage('SELECT id, objekt_id, mime, data, erstellt FROM hadie_dateien ORDER BY id')->fetchAll(),
        ]);
    }

    case 'konten': {
        verwaltung();
        $l = [];
        foreach (db()->query('SELECT nummer, rolle, kunde_id, angelegt, letzter_login, admin, totp_aktiv FROM hadie_konto ORDER BY rolle, nummer')->fetchAll() as $k)
            $l[] = ['nummer' => $k['nummer'], 'rolle' => $k['rolle'], 'kundeId' => $k['kunde_id'], 'angelegt' => (int)$k['angelegt'], 'letzterLogin' => $k['letzter_login'] ? (int)$k['letzter_login'] : null, 'admin' => (int)$k['admin'] === 1, 'zweiFaktor' => (int)$k['totp_aktiv'] === 1];
        antwort(200, ['ok' => true, 'konten' => $l]);
    }

    case 'konto-setzen': {
        $ich = verwaltung();
        $istAdmin = (int)($ich['admin'] ?? 0) === 1;
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
        // Mitarbeiter dürfen Kunden-Zugänge verwalten; Verwaltungs-Zugänge nur ein Admin.
        if ($rolle === 'verwaltung' && !$istAdmin) fehler(403, 'Zugänge der Verwaltung kann nur ein Admin-Zugang (Inhaber) anlegen oder zurücksetzen.');
        $alt = abfrage('SELECT rolle, admin FROM hadie_konto WHERE nummer = ?', [$n])->fetch();
        $hash = password_hash($pw, PASSWORD_DEFAULT);
        $adminNeu = $rolle === 'verwaltung' && !empty($b['admin']) ? 1 : 0;
        if ($alt) {
            if ($alt['rolle'] !== $rolle) fehler(400, 'Zu dieser Nummer gibt es bereits ein Konto mit anderer Rolle.');
            if (array_key_exists('admin', $b) && $rolle === 'verwaltung') {
                if (!$adminNeu && (int)$alt['admin'] === 1 && (int)abfrage("SELECT COUNT(*) AS n FROM hadie_konto WHERE admin = 1")->fetch()['n'] <= 1) fehler(400, 'Es muss mindestens ein Admin-Zugang bleiben.');
                abfrage('UPDATE hadie_konto SET passwort = ?, kunde_id = ?, admin = ? WHERE nummer = ?', [$hash, $kid, $adminNeu, $n]);
            } else abfrage('UPDATE hadie_konto SET passwort = ?, kunde_id = ? WHERE nummer = ?', [$hash, $kid, $n]);
        } else {
            abfrage('INSERT INTO hadie_konto (nummer, passwort, rolle, kunde_id, angelegt, admin) VALUES (?, ?, ?, ?, ?, ?)', [$n, $hash, $rolle, $kid, time(), $adminNeu]);
        }
        abfrage('DELETE FROM hadie_sitzung WHERE nummer = ?', [$n]);
        antwort(200, ['ok' => true]);
    }

    case 'konto-loeschen': {
        $k = verwaltung();
        $b = body();
        $n = norm((string)($b['nummer'] ?? ''));
        if ($n === $k['nummer']) fehler(400, 'Das eigene Konto lässt sich nicht löschen.');
        $ziel = abfrage('SELECT rolle FROM hadie_konto WHERE nummer = ?', [$n])->fetch();
        if ($ziel && $ziel['rolle'] === 'verwaltung' && (int)($k['admin'] ?? 0) !== 1) fehler(403, 'Zugänge der Verwaltung kann nur ein Admin-Zugang (Inhaber) löschen.');
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

    case 'zwei-faktor-start': {
        $k = verwaltung();
        body();
        if ((int)$k['totp_aktiv'] === 1) fehler(400, 'Die Zwei-Faktor-Anmeldung ist bereits eingerichtet.');
        $geheim = base32(random_bytes(20));
        abfrage('UPDATE hadie_konto SET totp_secret = ?, totp_aktiv = 0, totp_letzter = 0 WHERE nummer = ?', [$geheim, $k['nummer']]);
        $name = rawurlencode('HaDie-Immobilien:' . $k['nummer']);
        antwort(200, ['ok' => true, 'geheim' => $geheim, 'uri' => "otpauth://totp/$name?secret=$geheim&issuer=HaDie-Immobilien&algorithm=SHA1&digits=6&period=30"]);
    }

    case 'zwei-faktor-bestaetigen': {
        $k = verwaltung();
        $b = body();
        if ((int)$k['totp_aktiv'] === 1 || empty($k['totp_secret'])) fehler(400, 'Bitte starten Sie die Einrichtung neu.');
        $tk = 'totp:' . $k['nummer'];
        if (versuche($tk) >= 10) fehler(429, 'Zu viele Versuche. Bitte warten Sie 15 Minuten.');
        $schritt = totpSchritt((string)$k['totp_secret'], trim((string)($b['code'] ?? '')), 0);
        if (!$schritt) { versuchMerken($tk); antwort(200, ['ok' => false, 'grund' => 'code']); }
        $codes = []; $hashes = [];
        for ($i = 0; $i < 10; $i++) { $c = substr(base32(random_bytes(8)), 0, 10); $codes[] = substr($c, 0, 5) . '-' . substr($c, 5); $hashes[] = hash('sha256', $c); }
        abfrage('UPDATE hadie_konto SET totp_aktiv = 1, totp_letzter = ?, totp_reserve = ? WHERE nummer = ?', [$schritt, json_encode($hashes), $k['nummer']]);
        abfrage('DELETE FROM hadie_sitzung WHERE nummer = ? AND token_hash <> ?', [$k['nummer'], hash('sha256', (string)($_COOKIE['hadie'] ?? ''))]);
        antwort(200, ['ok' => true, 'ersatzcodes' => $codes]);
    }

    case 'zwei-faktor-aus': {
        $k = verwaltung();
        $b = body();
        if ((int)$k['totp_aktiv'] !== 1) fehler(400, 'Die Zwei-Faktor-Anmeldung ist nicht eingerichtet.');
        $tk = 'totp:' . $k['nummer'];
        if (versuche($tk) >= 10) fehler(429, 'Zu viele Versuche. Bitte warten Sie 15 Minuten.');
        if (!password_verify((string)($b['passwort'] ?? ''), $k['passwort']) || !zweiterFaktorOk($k, (string)($b['code'] ?? ''))) { versuchMerken($tk); usleep(400000); antwort(200, ['ok' => false, 'grund' => 'falsch']); }
        abfrage('UPDATE hadie_konto SET totp_secret = NULL, totp_aktiv = 0, totp_letzter = 0, totp_reserve = NULL WHERE nummer = ?', [$k['nummer']]);
        antwort(200, ['ok' => true]);
    }

    case 'zwei-faktor-zuruecksetzen': {
        // Handy verloren: Ein Admin schaltet die Zwei-Faktor-Anmeldung eines anderen Zugangs ab.
        $ich = admin();
        $b = body();
        $n = norm((string)($b['nummer'] ?? ''));
        if ($n === $ich['nummer']) fehler(400, 'Den eigenen Zugang setzen Sie über „Zwei-Faktor abschalten“ zurück.');
        abfrage('UPDATE hadie_konto SET totp_secret = NULL, totp_aktiv = 0, totp_letzter = 0, totp_reserve = NULL WHERE nummer = ?', [$n]);
        abfrage('DELETE FROM hadie_sitzung WHERE nummer = ?', [$n]);
        antwort(200, ['ok' => true]);
    }

    default:
        fehler(404, 'Unbekannte Aktion.');
}
