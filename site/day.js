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
  var stops = [], said = '', HOURS = [8, 13, 19, 22];   // where each postcard sits mid-window (scroll progress); the clock's last text; each postcard's hour
  var sky = sec.querySelector('.day__sky'), hud = sec.querySelector('.day__hud');

  var cards = track.querySelectorAll('.pc');
  function layout() {
    var want = roomy.matches && !reduce.matches;
    var was = pinned, end0 = sec.getBoundingClientRect().bottom;   // where the section ends now (for a reader below it)
    if (want) {   // tried on first: pinned only if the tallest postcard fits between the nav and the clock bar (a short window: the plain column)
      // (tried on at the height the section has now, so nothing below it moves while the postcards are measured)
      if (!pinned) sec.style.setProperty('--travel', Math.max(0, sec.offsetHeight - window.innerHeight) + 'px');
      sec.classList.add('is-pinned');
      var room = track.clientHeight, tall = 0;
      for (var i = 0; i < cards.length; i++) tall = Math.max(tall, cards[i].offsetHeight);
      if (tall + 20 > room) want = false;
      if (!want && !pinned) { sec.classList.remove('is-pinned'); sec.style.removeProperty('--travel'); }
    }
    if (want !== pinned) {
      pinned = want; sec.classList.toggle('is-pinned', pinned);
      if (!pinned) { track.style.transform = ''; sec.style.removeProperty('--travel'); if (sky) sky.style.removeProperty('--p'); if (hud) hud.style.removeProperty('--p'); shown = -1; said = ''; if (clock) clock.textContent = '08:00'; }
    }
    if (pinned) {
      travel = Math.max(0, track.offsetWidth - doc.documentElement.clientWidth);
      sec.style.setProperty('--travel', travel + 'px');
    }
    // the pin turned on or off while the reader is at or past the section's end: that end goes back where it was
    if (pinned !== was && end0 < window.innerHeight) {
      var gone = sec.getBoundingClientRect().bottom - end0;
      if (Math.abs(gone) > 1) window.scrollBy({ top: gone, left: 0, behavior: 'instant' });
    }
    if (!pinned) return;
    stops = [];
    for (var j = 0; j < cards.length; j++) stops.push(travel > 0 ? Math.min(1, Math.max(0, (cards[j].offsetLeft + cards[j].offsetWidth / 2 - doc.documentElement.clientWidth / 2) / travel)) : 0);
    if (stops.length) stops[0] = 0;   // (the day starts with the scroll: the clock runs from the first pixel)
    shown = -1; update();
    wake();
  }
  var wake = function () {};
  // the clock's time of day, 0 to 1: each postcard's own hour shows while that postcard is in the middle of the window
  function dayAt(p) {
    var n = stops.length; if (n < 2) return p;
    if (p <= stops[0]) return 0;
    for (var i = 1; i < n; i++) if (p <= stops[i]) return (i - 1 + (p - stops[i - 1]) / Math.max(1e-6, stops[i] - stops[i - 1])) / (n - 1);
    return 1;
  }
  function update() {
    raf = 0;
    if (!pinned) return;
    // (the section's place is read each time: sections above it may still be settling to their heights)
    var p = travel > 0 ? Math.min(1, Math.max(0, -sec.getBoundingClientRect().top / travel)) : 0;
    if (Math.abs(p - shown) < 0.0002) return;
    shown = p;
    track.style.transform = 'translate3d(' + (-p * travel).toFixed(1) + 'px,0,0)';
    if (sky) sky.style.setProperty('--p', p.toFixed(4));   // the sky keeps its own even pace
    var d = dayAt(p); if (hud) hud.style.setProperty('--p', d.toFixed(4));   // the clock bar follows the postcards
    if (clock) {   // 08:00, 13:00, 19:00 and 22:00 with each postcard mid-window, in five-minute steps
      var x = d * (HOURS.length - 1), k = Math.min(HOURS.length - 2, Math.floor(x)), hr = HOURS[k] + (HOURS[k + 1] - HOURS[k]) * (x - k);
      var m = Math.round(hr * 12) * 5, h = Math.floor(m / 60), mm = m % 60, t = (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
      if (t !== said) { said = t; clock.textContent = t; }
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
    try { if (!e.target.matches(':focus-visible')) return; } catch (err) {}   // a click or a tap: the row stays put, so the button is still under the pointer when it is released
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
  // the photographs off to the side are cut by the frame, so the browser's lazy loading only fetches each as it slides in:
  // while pinned, fetch all four together as the section nears
  var imgs = track.querySelectorAll('img[loading="lazy"]'), near = false;
  wake = function () { if (!near || !pinned || !imgs) return; for (var i = 0; i < imgs.length; i++) imgs[i].loading = 'eager'; imgs = null; };
  if (imgs.length && window.IntersectionObserver) new IntersectionObserver(function (en) { near = en[en.length - 1].isIntersecting; wake(); }, { rootMargin: '1200px 0px' }).observe(sec);
  layout();
})();
