/* ═══════════════════════════════════════════════════════════════════════════
   Model Pops — a day with Model Pops (day.js)
   Classic script, loaded after app.js (works from file:// and over http). Its styles: site/day.css.

   On a screen wide and tall enough (900 px wide, and tall enough for the tallest postcard to fit between the nav and
   the clock bar), with motion allowed, the section is PINNED (.is-pinned): it holds still while
   you scroll, the row of postcards slides past sideways, and the sky behind keeps the time. This file only
   measures and sets two numbers on the section: --travel (how far the row slides, px: the section is made that
   much taller) and --p (0 to 1, how far through the day you have scrolled); it also moves the row and sets the
   small clock. Everything else is CSS. Anywhere else the section is a plain column and this file does nothing.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var doc = document;
  var sec = doc.getElementById('day'), track = doc.getElementById('dayTrack'), clock = doc.getElementById('dayClock');
  if (!sec || !track || !window.matchMedia) return;
  var roomy = window.matchMedia('(min-width: 900px) and (min-height: 600px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var pinned = false, travel = 0, raf = 0, shown = -1;

  var cards = track.querySelectorAll('.pc');
  function layout() {
    var want = roomy.matches && !reduce.matches;
    if (want) {   // tried on first: pinned only if the tallest postcard fits between the nav and the clock bar (a short window: the plain column)
      sec.classList.add('is-pinned');
      var room = track.clientHeight, tall = 0;
      for (var i = 0; i < cards.length; i++) tall = Math.max(tall, cards[i].offsetHeight);
      if (tall + 20 > room) want = false;
      if (!want && !pinned) sec.classList.remove('is-pinned');
    }
    if (want !== pinned) {
      pinned = want; sec.classList.toggle('is-pinned', pinned);
      if (!pinned) { track.style.transform = ''; sec.style.removeProperty('--travel'); sec.style.removeProperty('--p'); shown = -1; if (clock) clock.textContent = '08:00'; }
    }
    if (!pinned) return;
    travel = Math.max(0, track.offsetWidth - doc.documentElement.clientWidth);
    sec.style.setProperty('--travel', travel + 'px');
    shown = -1; update();
  }
  function update() {
    raf = 0;
    if (!pinned) return;
    // (the section's place is read each time: sections above it may still be settling to their heights)
    var p = travel > 0 ? Math.min(1, Math.max(0, -sec.getBoundingClientRect().top / travel)) : 0;
    if (Math.abs(p - shown) < 0.0002) return;
    shown = p;
    track.style.transform = 'translate3d(' + (-p * travel).toFixed(1) + 'px,0,0)';
    sec.style.setProperty('--p', p.toFixed(4));
    if (clock) {   // 08:00 at the first postcard, 22:00 at the last, in five-minute steps
      var m = Math.round((8 + p * 14) * 12) * 5, h = Math.floor(m / 60), mm = m % 60;
      clock.textContent = (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
    }
  }
  function onScroll() { if (pinned && !raf) raf = window.requestAnimationFrame(update); }
  var relayout = function () { layout(); };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', relayout, { passive: true });
  window.addEventListener('load', relayout);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(relayout);
  if (window.ResizeObserver) new ResizeObserver(relayout).observe(track);
  [roomy, reduce].forEach(function (mq) { if (mq.addEventListener) mq.addEventListener('change', relayout); else if (mq.addListener) mq.addListener(relayout); });
  // a link inside a postcard that is off to the side: bring its postcard into view when the keyboard reaches it
  track.addEventListener('focusin', function (e) {
    if (!pinned || !travel) return;
    var card = e.target.closest && e.target.closest('.pc'); if (!card) return;
    var want = (card.offsetLeft + card.offsetWidth / 2 - doc.documentElement.clientWidth / 2) / travel;
    var top = sec.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.round(top + Math.min(1, Math.max(0, want)) * travel));
    shown = -1; update();   // at once: the browser brings the focused link into view next, and must find it where it now is
    settle();
  });
  // the pinned frame itself must never scroll (a browser bringing a focused link into view would shift the row inside it)
  var pin = track.parentNode;
  function settle() { if (pinned && (pin.scrollLeft || pin.scrollTop)) { pin.scrollLeft = 0; pin.scrollTop = 0; } }
  pin.addEventListener('scroll', settle, { passive: true });
  layout();
})();
