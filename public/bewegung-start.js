// Schaltet die Bewegungseffekte frei, sofern der Besucher sie nicht abgeschaltet hat.
// Fällt das Hauptskript aus, wird der Inhalt nach 3 Sekunden trotzdem sichtbar.
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('motion');
  setTimeout(function () {
    document.documentElement.classList.add('motion-bereit');
  }, 3000);
}
