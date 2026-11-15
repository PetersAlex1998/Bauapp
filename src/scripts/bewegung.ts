/**
 * BEWEGUNG – weiches Scrollen, Parallax, Einblendungen, Cursor.
 * ---------------------------------------------------------------
 * GSAP + ScrollTrigger + Lenis, alles lokal gebündelt (kein CDN).
 * Läuft nur, wenn der Besucher keine reduzierte Bewegung wünscht
 * (Klasse «motion» am <html>, gesetzt im Layout). Ohne JavaScript
 * oder mit reduzierter Bewegung ist die Seite vollständig statisch
 * lesbar.
 *
 * Tempo zentral einstellen:
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

const DAUER = 1.4; // Sekunden für Einblendungen – bewusst langsam
const EASE = 'power3.out';

const html = document.documentElement;

function start() {
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Weiches Scrollen ---------- */
  const lenis = new Lenis({ lerp: 0.075, anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((zeit) => lenis.raf(zeit * 1000));
  gsap.ticker.lagSmoothing(0);

  const feinerZeiger = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const kopfHoehe = () => document.querySelector<HTMLElement>('.kopf')?.offsetHeight ?? 72;

  /* ---------- Hero (Startseite) ---------- */
  const hero = document.querySelector<HTMLElement>('.hero');
  if (hero) {
    const zeilen = hero.querySelectorAll('.zeile > span');
    const rest = hero.querySelectorAll('.hero__dach, .hero__text .lead, .knopfreihe, .fakten, .kreis-hinweis, .hero__scroll');
    const segmente = hero.querySelectorAll('a.kreis__segment');
    const ticks = hero.querySelector('.kreis__ebene--ticks');
    const mitte = hero.querySelector('.kreis__ebene--mitte');

    // Auftritt
    const auf = gsap.timeline({ defaults: { ease: EASE }, delay: 0.15 });
    auf
      .from(zeilen, { yPercent: 115, duration: 1.6, stagger: 0.14 })
      .from(segmente, { opacity: 0, scale: 0.82, rotation: -28, svgOrigin: '250 250', duration: 2, stagger: 0.16 }, 0.2)
      .from(mitte, { opacity: 0, scale: 0.6, svgOrigin: '250 250', duration: 1.8 }, 0.5)
      .from(ticks, { opacity: 0, duration: 2.4 }, 0.6)
      .from(rest, { opacity: 0, y: 24, duration: DAUER, stagger: 0.1 }, 0.9);

    // Tiefe beim Scrollen: Text zieht weg, Kreis wächst, Skala dreht
    gsap
      .timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1.2 } })
      .to('.hero__text', { yPercent: -18, opacity: 0, ease: 'none' }, 0)
      .to('.hero__kreis', { yPercent: 14, scale: 1.12, ease: 'none' }, 0)
      .to('.hero__glanz', { yPercent: 30, opacity: 0.4, ease: 'none' }, 0)
      .to(ticks, { rotation: 90, svgOrigin: '250 250', ease: 'none' }, 0);

    // Tiefe mit der Maus: Ebenen des Kreises bewegen sich unterschiedlich stark
    if (feinerZeiger) {
      const ebenen = [...hero.querySelectorAll<SVGGElement>('.kreis__ebene')].map((el) => ({
        x: gsap.quickTo(el, 'x', { duration: 1.6, ease: EASE }),
        y: gsap.quickTo(el, 'y', { duration: 1.6, ease: EASE }),
        tiefe: Number(el.dataset.tiefe ?? 1),
      }));
      const glanzX = gsap.quickTo('.hero__glanz', 'x', { duration: 2.2, ease: EASE });
      hero.addEventListener('mousemove', (e) => {
        const dx = e.clientX / window.innerWidth - 0.5;
        const dy = e.clientY / window.innerHeight - 0.5;
        ebenen.forEach((l) => {
          l.x(dx * l.tiefe * 16);
          l.y(dy * l.tiefe * 16);
        });
        glanzX(dx * -60);
      });
    }
  }

  /* ---------- Seitenkopf (Unterseiten) ---------- */
  const seitenkopf = document.querySelector('.seitenkopf');
  if (seitenkopf) {
    gsap.from(seitenkopf.querySelectorAll('.brotkrumen, .marke, h1, .lead, .telefon-gross, .knopfreihe, .seitenkopf__kreis'), {
      opacity: 0,
      y: 30,
      duration: DAUER,
      ease: EASE,
      stagger: 0.12,
      delay: 0.1,
    });
  }

  /* ---------- Bild, das sich beim Scrollen öffnet ---------- */
  document.querySelectorAll<HTMLElement>('.expand').forEach((sektion) => {
    const buehne = sektion.querySelector('.expand__buehne')!;
    const bild = sektion.querySelector('.expand__bild')!;
    const schmal = window.matchMedia('(max-width: 52rem)').matches;
    const startForm = schmal ? 'inset(20% 9% 20% 9% round 20px)' : 'inset(17% 27% 17% 27% round 28px)';

    // Desktop: Bühne bleibt stehen, während das Bild aufgeht.
    // Smartphone: kein Anhalten – das Bild öffnet sich im normalen Scrollfluss.
    const tl = gsap.timeline({
      scrollTrigger: schmal
        ? { trigger: buehne, start: 'top 92%', end: 'top 8%', scrub: 0.9, invalidateOnRefresh: true }
        : {
            trigger: buehne,
            start: () => `top ${kopfHoehe()}px`,
            end: '+=140%',
            pin: true,
            scrub: 1.2,
            invalidateOnRefresh: true,
          },
    });
    tl.fromTo(bild, { clipPath: startForm }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power2.inOut', duration: 1 }, 0)
      .fromTo(sektion.querySelector('.expand__inhalt'), { scale: 1.14 }, { scale: 1, ease: 'power2.inOut', duration: 1 }, 0)
      .fromTo(sektion.querySelector('.expand__vorspann'), { opacity: 1 }, { opacity: 0, duration: 0.25, ease: 'none' }, 0)
      .fromTo(sektion.querySelector('.expand__schleier'), { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'none' }, 0.55)
      .fromTo(sektion.querySelectorAll('.expand__text > *'), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'power2.out' }, 0.62)
      .to({}, { duration: schmal ? 0 : 0.25 }); // kurzer Halt am Ende (nur Desktop)

    // Ebenen im Bild verschieben sich gegeneinander
    sektion.querySelectorAll<SVGGElement>('.szene [data-tiefe]').forEach((ebene) => {
      const tiefe = Number(ebene.dataset.tiefe);
      tl.fromTo(ebene, { y: tiefe * 70 }, { y: 0, ease: 'power2.inOut', duration: 1 }, 0);
    });
  });

  /* ---------- Text, der Wort für Wort aufhellt ---------- */
  document.querySelectorAll<HTMLElement>('[data-worte]').forEach((el) => {
    const worte = el.textContent!.trim().split(/\s+/);
    el.setAttribute('aria-label', worte.join(' '));
    el.innerHTML = worte.map((w) => `<span aria-hidden="true">${w}</span>`).join(' ');
    gsap.set(el.children, { opacity: 0.14 });
    gsap
      .timeline({ scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 48%', scrub: 1 } })
      .to(el.children, { opacity: 1, ease: 'none', stagger: 0.5 });
  });

  /* ---------- Einblendungen beim Scrollen ---------- */
  const ZIELE = [
    '.marke',
    'h2',
    '.abschnittskopf > p',
    '.zweier > div > p',
    '.rahmen > p',
    '.viertel > li',
    '.dreier > li',
    '.umfang > li',
    '.vergleich__karte',
    '.kontaktkarte',
    '.kontaktband .knopfreihe',
    '.kontaktliste > div',
    '.formular',
    '.weiter',
    '.prosa > *',
    '.platzhalter',
  ].join(',');
  const ziele = gsap.utils
    .toArray<HTMLElement>(document.querySelectorAll(`main :is(${ZIELE})`))
    .filter((el) => !el.closest('.hero, .seitenkopf, .expand, [data-worte]') && !el.matches('[data-worte], .sr-only'))
    // keine verschachtelten Ziele doppelt animieren
    .filter((el, _, alle) => !alle.some((anderes) => anderes !== el && anderes.contains(el)));
  gsap.set(ziele, { opacity: 0, y: 34 });
  ScrollTrigger.batch(ziele, {
    start: 'top 90%',
    once: true,
    onEnter: (gruppe) => gsap.to(gruppe, { opacity: 1, y: 0, duration: DAUER, ease: EASE, stagger: 0.13, overwrite: true }),
  });

  /* ---------- Sanfte Parallaxe für markierte Elemente ---------- */
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const staerke = Number(el.dataset.parallax) || 10;
    gsap.fromTo(
      el,
      { yPercent: staerke },
      { yPercent: -staerke, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1.2 } },
    );
  });

  /* ---------- Cursor ---------- */
  if (feinerZeiger) {
    const zeiger = document.createElement('div');
    zeiger.className = 'zeiger';
    zeiger.setAttribute('aria-hidden', 'true');
    document.body.append(zeiger);

    const x = gsap.quickTo(zeiger, 'x', { duration: 0.7, ease: EASE });
    const y = gsap.quickTo(zeiger, 'y', { duration: 0.7, ease: EASE });
    let sichtbar = false;
    window.addEventListener('mousemove', (e) => {
      x(e.clientX);
      y(e.clientY);
      if (!sichtbar) {
        sichtbar = true;
        gsap.set(zeiger, { x: e.clientX, y: e.clientY });
        gsap.to(zeiger, { opacity: 1, duration: 0.6 });
      }
    });
    document.addEventListener('mouseleave', () => {
      sichtbar = false;
      gsap.to(zeiger, { opacity: 0, duration: 0.4 });
    });

    const zustand = (ziel: Element | null) => {
      const gross = ziel?.closest('.viertel__karte, a.kreis__segment');
      const link = ziel?.closest('a, button, label, input, select, textarea');
      zeiger.dataset.zustand = gross ? 'gross' : link ? 'link' : '';
      gsap.to(zeiger, { scale: gross ? 2.4 : link ? 1.5 : 1, duration: 0.7, ease: EASE, overwrite: 'auto' });
    };
    document.addEventListener('mouseover', (e) => zustand(e.target as Element));

    // Buttons folgen dem Cursor ein kleines Stück («magnetisch»)
    document.querySelectorAll<HTMLElement>('.knopf, .telefon-gross').forEach((knopf) => {
      const kx = gsap.quickTo(knopf, 'x', { duration: 0.9, ease: EASE });
      const ky = gsap.quickTo(knopf, 'y', { duration: 0.9, ease: EASE });
      knopf.addEventListener('mousemove', (e) => {
        const r = knopf.getBoundingClientRect();
        kx((e.clientX - (r.left + r.width / 2)) * 0.18);
        ky((e.clientY - (r.top + r.height / 2)) * 0.25);
      });
      knopf.addEventListener('mouseleave', () => {
        kx(0);
        ky(0);
      });
    });
  }

  // Schriften können die Höhen verändern – danach neu vermessen
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

if (html.classList.contains('motion')) {
  try {
    start();
  } finally {
    html.classList.add('motion-bereit');
  }
}
