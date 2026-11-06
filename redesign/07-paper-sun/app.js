/* Glo Pop · Proposal 07 · Paper Sun
 * One classic script (works from file:// and over http). Modules, in order:
 * Data, Theme, Motion (the paper theatre, stop-motion cast and confetti), Reveal, Nav, Explorer, Map,
 * Taste test, Sieve, Sticks, Moments, Planner, Formats, Lineup, Shop, Waitlist, FAQ, Sources, Grain, Real3D.
 * Everything the page says is already in the HTML; this file only adds the toys, the re-theming and
 * the progressive bits. */
(function () {
  'use strict';

  var doc = document, root = doc.documentElement;
  window.PaperSun = { version: 1 };

  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var on = function (el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt); };
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = function () { return reduceMQ.matches; };
  var motionOff = function () { return root.getAttribute('data-motion') === 'off'; };
  var store = function (k, v) {
    try { if (v === undefined) return window.localStorage.getItem(k); window.localStorage.setItem(k, v); } catch (e) { /* private mode */ }
    return null;
  };
  var icon = function (n, cls) { return '<svg class="i' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; };
  var TBD = '<span class="ph ph--bare">TBD</span>';
  var hand = function (t, sub) { return '<span class="hand">' + t + '</span>' + (sub ? '<span class="sub">' + sub + '</span>' : ''); };
  var idle = window.requestIdleCallback ? function (f) { window.requestIdleCallback(f, { timeout: 1500 }); } : function (f) { setTimeout(f, 60); };

  /* ================================ Data ================================ */
  var PRODUCTS = [
    {
      id: 'strawberry-pop', kind: 'lollipop', name: 'Strawberry Pops', full: 'Peptide Lollipops', flavor: 'Strawberry',
      status: 'available', statusLabel: 'Available now', tabNote: 'available',
      candy: { kind: 'lollipop', color: '#FF1493' },
      card: 'Peptide Lollipops in strawberry. 47 calories per pop, 10 per bag, six actives, made with real sugar.',
      link: { href: '#shop', label: 'Shop' },
      copy: {}                                   // strawberry copy ships in the HTML (captured at start-up)
    },
    {
      // The client's facts (draft Supplement Facts, Nov 2026): strawberry-watermelon; 2 gummies a serving,
      // 30 servings a container; 20 calories, 3 g sugar (all added); five B vitamins and a 170 mg Organic
      // Super Greens Blend of 15 ingredients. Still TBD: price, launch date, directions, other ingredients,
      // allergens, vegan / gluten-free status, final shape.
      id: 'green-gummies', kind: 'gummy', name: 'Green Gummies', flavor: 'Strawberry-Watermelon',
      status: 'coming-soon', statusLabel: 'Coming soon', tabNote: 'waitlist',
      candy: { kind: 'gummy', color: '#1FA453' },
      card: 'Strawberry-watermelon gummies with five B vitamins and an Organic Super Greens Blend. 2 gummies a serving, 30 servings a container, 20 calories a serving. Price and launch: ' + TBD + '.',
      facts: '#gummy-facts',
      link: { href: '#waitlist', label: 'Join the waitlist' },
      copy: {
        'hero.eyebrow': 'Green Gummies · Coming soon',
        'hero.h1': 'Something <span class="cut in"><span class="strip">green</span></span> is coming.',
        'hero.lead': 'Strawberry-watermelon gummies with five B vitamins and an Organic Super Greens Blend: 20 calories in a serving of 2. Price and launch date: ' + TBD + '. Want to hear first?',
        'hero.cta': 'Join the waitlist', 'hero.href': '#waitlist', 'hero.note': 'concept illustration', 'hero.inside': '#gummy-facts',
        'hero.proof': proof([['candy', 'Strawberry-watermelon'], ['leaf', 'Five B vitamins + a greens blend'], ['clipboard-list', '20 calories per 2 gummies'], ['package', '60 gummies a container']]),
        'pop.eyebrow': 'The gummies', 'pop.h2': 'Green Gummies, annotated.',
        'pop.lead': 'Strawberry-watermelon gummies with five B vitamins and an Organic Super Greens Blend. Coming soon; the price and launch date are still ' + TBD + '.',
        'pop.amounts': 'Every amount is on the draft label. <a class="tlink" href="#gummy-facts">See the Supplement Facts' + icon('arrow-right') + '</a>',
        'pop.title': 'A concept illustration of three green gummies and a container, annotated: strawberry-watermelon flavor, five B vitamins, 20 calories in a 2-gummy serving, an Organic Super Greens Blend, 60 gummies per container. Price and launch date are still to be decided.',
        'pop.n1': hand('strawberry-watermelon', 'The flavor. Final gummy shape: ' + TBD + '.'),
        'pop.n2': hand('five B vitamins', 'Riboflavin, niacin, B6, folate and pantothenic acid.'),
        'pop.n3': hand('20 calories a serving', 'A serving is 2 gummies, with 3 g of sugar.'),
        'pop.n4': hand('super greens blend', '170 mg a serving of the Organic Super Greens Blend: 15 ingredients.'),
        'pop.n5': null, 'pop.gf': null,
        'pop.n6': hand('60 gummies', '30 servings of 2 per container. Price and launch: ' + TBD + '.'),
        'pop.n1.href': '#gummy-facts', 'pop.n2.href': '#gummy-facts', 'pop.n3.href': '#gummy-facts', 'pop.n4.href': '#gummy-facts', 'pop.n6.href': '#waitlist',
        'final.lead': 'Strawberry-watermelon Green Gummies are on their way. Join the waitlist and you\'ll hear first.',
        'shop.h2': 'Green Gummies are on their way.',
        'final.cta': 'Join the waitlist', 'final.href': '#waitlist',
        'final.line': 'Green Gummies · Strawberry-watermelon · 2 gummies a serving · 30 servings a container · Price and launch ' + TBD,
        'bar.text': '<b>Green Gummies</b><span>Strawberry-watermelon · coming soon</span>', 'bar.cta': 'Join the waitlist', 'bar.href': '#waitlist',
        notice: {
          inside: 'Heads up: these six actives are in the Strawberry Pop. Green Gummies have their own formula: five B vitamins and an Organic Super Greens Blend. <a class="tlink tlink--in" href="#gummy-facts">See their Supplement Facts</a>.',
          sugar: 'Heads up: this chapter is about the Strawberry Pop. Green Gummies list 3 g of added sugars in a 2-gummy serving; what sweetens them is ' + TBD + '.'
        },
        live: 'Now showing Green Gummies: strawberry-watermelon, coming soon.'
      }
    },
    {
      id: 'next-pop', kind: 'lollipop', name: 'Next color', flavor: null,
      status: 'in-development', statusLabel: 'In development', tabNote: 'notify',
      candy: { kind: 'lollipop', color: '#F6D2B4' },
      card: 'More lollipop colors are being cut. Color ' + TBD + ' · Flavor ' + TBD,
      link: { href: '#waitlist', label: 'Get notified', notify: true },
      copy: {
        'hero.eyebrow': 'Next color · In development',
        'hero.h1': 'Not <span class="cut in"><span class="strip">cut out</span></span> yet.',
        'hero.lead': 'More lollipop colors are in development. Names, flavors and dates: ' + TBD + '. We\'ll only name one when it\'s real.',
        'hero.cta': 'Get notified', 'hero.href': '#waitlist', 'hero.note': 'not cut out yet', 'hero.proof': null,
        'pop.eyebrow': 'The next color', 'pop.h2': 'The next color, annotated so far.',
        'pop.lead': 'Still a pencil outline. When the next color is real, it gets cut out and annotated properly.',
        'pop.amounts': 'Details: ' + TBD + '. <a class="tlink" href="#waitlist" data-notify>Get notified' + icon('arrow-right') + '</a>',
        'pop.title': 'A pencil outline of a lollipop that isn\'t cut out yet, with three test swatches. Color, flavor and name are still to be decided.',
        'pop.n1': hand('color: ' + TBD), 'pop.n2': hand('flavor: ' + TBD), 'pop.n3': null, 'pop.n4': hand('name: ' + TBD), 'pop.n5': null, 'pop.n6': null, 'pop.gf': null,
        'pop.n1.href': '#waitlist', 'pop.n2.href': '#waitlist', 'pop.n4.href': '#waitlist',
        'final.lead': 'More colors are being cut. Get notified when the next one is real.',
        'shop.h2': 'The next color is still being cut.',
        'final.cta': 'Get notified', 'final.href': '#waitlist',
        'final.line': 'Next color · Name ' + TBD + ' · Flavor ' + TBD + ' · Date ' + TBD,
        'bar.text': '<b>Next color</b><span>In development</span>', 'bar.cta': 'Get notified', 'bar.href': '#waitlist',
        'wl.tag': 'In development', 'wl.title': 'The next color is being cut.',
        'wl.text': 'Name ' + TBD + ', flavor ' + TBD + ', date ' + TBD + '. Get notified and you\'ll hear the moment it\'s real.',
        'wl.cap': 'colors ' + TBD,
        notice: {
          inside: 'Heads up: these six actives are in the Strawberry Pop. The next color\'s formula is ' + TBD + '.',
          sugar: 'Heads up: this chapter is about the Strawberry Pop. The next color\'s recipe is ' + TBD + '.'
        },
        live: 'Now showing the next color: still in development.'
      }
    }
  ];
  PRODUCTS[0].copy.live = 'Now showing Strawberry Pops: available now.';
  function proof(items) {
    return items.map(function (it) { return '<li>' + icon(it[0]) + it[1] + '</li>'; }).join('');
  }
  var byId = {};
  PRODUCTS.forEach(function (p) { byId[p.id] = p; });

  var ACTIVE_NAMES = { collagen: 'Collagen peptides', ha: 'Hyaluronic acid', vitc: 'Vitamin C', b12: 'Vitamin B12', b6: 'Vitamin B6', zinc: 'Zinc' };
  var FUNCTIONS = [
    { id: 'collagen', name: 'Collagen formation', a: ['vitc'], line: 'Vitamin C contributes to normal collagen formation for the normal function of skin.' },
    { id: 'skin', name: 'Normal skin, hair and nails', a: ['zinc'], line: 'Zinc contributes to the maintenance of normal skin, hair and nails.' },
    { id: 'oxid', name: 'Antioxidant (cell protection)', a: ['vitc', 'zinc'], line: 'Vitamin C and zinc contribute to the protection of cells from oxidative stress.' },
    { id: 'immune', name: 'Immune function', a: ['vitc', 'b6', 'b12', 'zinc'], line: 'Vitamin C, vitamin B6, vitamin B12 and zinc contribute to normal immune function.' },
    { id: 'energy', name: 'Energy-yielding metabolism', a: ['vitc', 'b6', 'b12'], line: 'Vitamin C, vitamin B6 and vitamin B12 contribute to normal energy-yielding metabolism.' },
    { id: 'tired', name: 'Less tiredness and fatigue', a: ['vitc', 'b6', 'b12'], line: 'Vitamin C, vitamin B6 and vitamin B12 contribute to the reduction of tiredness and fatigue.' },
    { id: 'rbc', name: 'Red blood cell formation', a: ['b6', 'b12'], line: 'Vitamin B6 and vitamin B12 contribute to normal red blood cell formation.' },
    { id: 'protein', name: 'Protein metabolism', a: ['b6', 'zinc'], line: 'Vitamin B6 contributes to normal protein and glycogen metabolism, and zinc to normal protein synthesis.' },
    { id: 'moist', name: 'Studied for skin moisture', a: ['collagen', 'ha'], dashed: true, line: 'Collagen peptides and hyaluronic acid have been studied for skin moisture. The research is promising and still debated, and there\'s no authorized wording.' }
  ];
  var MOMENTS = {
    coffee: 'One pop while the coffee brews.',
    desk: 'A small, sweet pause between emails.',
    beach: 'Packed next to the SPF. Shade for both.',
    skincare: 'Skincare, then a pop. Two steps, done.',
    walk: 'One for the walk home.'
  };
  var WEEKS = { 2: [14, 2, 6], 3: [21, 3, 9], 4: [28, 3, 2] };
  // confetti colours per product, for the burst when you choose one (the CSS tokens are mid-transition then)
  var BURSTS = {
    'strawberry-pop': [['#FF1493', '#7A1B4D'], ['#FF7DBE', '#FF1493'], ['#FFFFFF', '#FFE4F1'], ['#FFC83D', '#FFB21E'], ['#7A1B4D', '#FF1493']],
    'green-gummies': [['#1FA453', '#0E4D2C'], ['#86D9A6', '#1FA453'], ['#FFFFFF', '#E3F6EA'], ['#FFC83D', '#FFB21E'], ['#0E4D2C', '#1FA453']],
    'next-pop': [['#F26A1B', '#7A2E0A'], ['#FFAE7E', '#F26A1B'], ['#FFFFFF', '#FFE9DB'], ['#8B3FD6', '#5E2A94'], ['#0E9CAD', '#0B6E7A']]
  };
  var STAGE = null, FX = { burst: function () {}, from: function () {} }, STICKS = {};

  /* ================================ Theme ================================ */
  var current = 'strawberry-pop';
  var BASE = {};                                   // strawberry copy, read from the HTML
  $$('[data-copy]').forEach(function (el) { var k = el.getAttribute('data-copy'); if (!(k in BASE)) BASE[k] = el.innerHTML; });
  $$('[data-copy-href]').forEach(function (el) { var k = el.getAttribute('data-copy-href'); if (!(k in BASE)) BASE[k] = el.getAttribute('href'); });
  var notices = $$('[data-notice]'), themeLive = $('[data-theme-live]');
  var listeners = [];                              // modules that follow the theme

  // "a · b · c" lines: keep each item on one line, break only at the dots
  function segs(html) { return html.split(' · ').map(function (s) { return '<span class="dotseg">' + s + '</span>'; }).join(' · '); }
  $$('[data-segs]').forEach(function (el) { el.innerHTML = segs(el.innerHTML); });

  function copyFor(p, key) {
    if (p.copy && Object.prototype.hasOwnProperty.call(p.copy, key)) return p.copy[key];
    return BASE[key];
  }

  function applyTheme(id, announce) {
    var p = byId[id] || PRODUCTS[0];
    current = p.id;
    root.setAttribute('data-product', p.id);
    $$('[data-copy]').forEach(function (el) {
      var key = el.getAttribute('data-copy'), val = copyFor(p, key);
      var slot = el.closest('[data-slot]');
      if (val === null) {                          // this product has nothing to say here: hide it
        if (slot) hideSlot(slot.getAttribute('data-slot'), true); else { el.hidden = true; el.__off = true; }
        return;
      }
      if (slot) hideSlot(slot.getAttribute('data-slot'), false); else if (el.__off) { el.hidden = false; el.__off = false; }
      if (val !== undefined && el.innerHTML !== val) {
        el.innerHTML = el.hasAttribute('data-segs') ? segs(val) : val;
        $$('.cut', el).forEach(function (c) { c.classList.add('in'); });
      }
    });
    $$('[data-copy-href]').forEach(function (el) {
      var v = copyFor(p, el.getAttribute('data-copy-href'));
      if (v) el.setAttribute('href', v);
    });
    $$('[data-theme-btn]').forEach(function (b) {
      var is = b.getAttribute('data-theme-btn') === p.id;
      if (b.getAttribute('role') === 'radio') { b.setAttribute('aria-checked', String(is)); b.tabIndex = is ? 0 : -1; }
      else b.setAttribute('aria-pressed', String(is));
      var lab = $('.tt-label', b);
      if (lab) { lab.textContent = is ? 'Showing' : 'Try this color'; b.classList.toggle('is-on', is); }
    });
    notices.forEach(function (n) {                 // "heads up" slips on chapters that are about the pop
      var txt = p.copy.notice && p.copy.notice[n.getAttribute('data-notice')];
      n.hidden = !txt;
      if (txt) $('[data-notice-text]', n).innerHTML = txt;
    });
    if (announce && themeLive) themeLive.textContent = p.copy.live || '';
    listeners.forEach(function (fn) { fn(p); });
  }
  function hideSlot(n, hide) {
    $$('#pop [data-slot="' + n + '"]').forEach(function (el) { if (hide) el.setAttribute('hidden', ''); else el.removeAttribute('hidden'); });
  }

  function setProduct(id, origin, opts) {
    if (!byId[id] || id === current) return;
    var instant = reduced() || (opts && opts.instant);
    var ob = origin && !instant && origin.getBoundingClientRect();
    if (ob && ob.width) {                            // a little confetti in the new colours, from the control
      setTimeout(function () { FX.burst(ob.left + ob.width / 2, ob.top + ob.height / 2, { pal: BURSTS[id] }); }, 260);
    }
    if (instant || !doc.startViewTransition || !origin) {
      if (instant) root.classList.add('no-theme-anim');
      applyTheme(id, !!origin);
      if (instant) requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.remove('no-theme-anim'); }); });
      return;
    }
    var r = origin.getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    var R = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    root.style.setProperty('--vx', Math.round(x) + 'px');
    root.style.setProperty('--vy', Math.round(y) + 'px');
    root.style.setProperty('--vr', Math.ceil(R) + 'px');
    root.classList.add('vt');
    var done = function () { root.classList.remove('vt'); };
    try {
      var t = doc.startViewTransition(function () { applyTheme(id, true); });
      t.finished.then(done, done);
    } catch (e) { done(); applyTheme(id, true); }
  }
  on(doc, 'click', function (e) {
    var b = e.target.closest('[data-theme-btn]');
    if (b) setProduct(b.getAttribute('data-theme-btn'), b);
  });
  // the colour swatches are a radio group: arrow keys move and choose, Home / End jump
  on(doc, 'keydown', function (e) {
    var b = e.target.closest && e.target.closest('[role="radio"][data-theme-btn]');
    if (!b) return;
    var all = $$('[role="radio"][data-theme-btn]', b.closest('[role="radiogroup"]')), i = all.indexOf(b), n = all.length, j = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + n) % n;
    else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = n - 1;
    if (j < 0) return;
    e.preventDefault();
    all[j].focus();
    setProduct(all[j].getAttribute('data-theme-btn'), all[j]);
  });

  // the annotated diagram: the gummies sit lower than the pop's head, so their leaders move
  listeners.push(function (p) {
    var alt = p.id === 'green-gummies';
    $$('#pop .dg-ln').forEach(function (el) {
      if (!el.__d) el.__d = el.getAttribute('d');
      el.setAttribute('d', alt && el.getAttribute('data-g') ? el.getAttribute('data-g') : el.__d);
    });
    $$('#pop .dg-dot').forEach(function (el) {
      if (!el.__c) el.__c = [el.getAttribute('cx'), el.getAttribute('cy')];
      var c = alt && el.getAttribute('data-g') ? el.getAttribute('data-g').split(' ') : el.__c;
      el.setAttribute('cx', c[0]); el.setAttribute('cy', c[1]);
    });
    $$('#pop .dg-pins > g').forEach(function (g) {
      var c0 = $('circle', g);
      if (!g.__c) g.__c = [+c0.getAttribute('cx'), +c0.getAttribute('cy')];
      var c = alt && g.getAttribute('data-g') ? g.getAttribute('data-g').split(' ').map(Number) : g.__c;
      g.setAttribute('transform', 'translate(' + (c[0] - g.__c[0]) + ' ' + (c[1] - g.__c[1]) + ')');
    });
  });

  // the hero art turns over like a sheet of paper
  (function heroFlip() {
    var art = $('.hero__art'), inner = $('.sunpop__in'), t = 0;
    listeners.push(function (p) {
      if (!art || art.getAttribute('data-art') === p.id) return;
      if (reduced() || !inner) { art.setAttribute('data-art', p.id); return; }
      clearTimeout(t);
      inner.classList.remove('flip-in');
      inner.classList.add('flip-out');
      t = setTimeout(function () {
        art.setAttribute('data-art', p.id);
        inner.classList.remove('flip-out');
        void inner.offsetWidth;
        inner.classList.add('flip-in');
      }, 200);
    });
  })();

  /* ================================ Motion ================================ */
  var DECOR = [];
  var motionBtns = $$('[data-motion-btn]');
  function setMotion(off, save) {
    if (off) root.setAttribute('data-motion', 'off'); else root.removeAttribute('data-motion');
    motionBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(off)); });   // the label stays "Pause motion"; pressed = paused
    DECOR.forEach(function (c) { if (off || reduced()) c.pause(); else c.resume(); });
    if (!off && STAGE) STAGE.kick();
    if (save) store('papersun-motion', off ? 'off' : 'on');
  }
  setMotion(motionOff(), false);
  motionBtns.forEach(function (b) { on(b, 'click', function () { setMotion(!motionOff(), true); }); });

  // offscreen sections pause their loops
  var liveIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { e.target.classList.toggle('is-live', e.isIntersecting); });
  }, { rootMargin: '120px 0px' }) : null;
  $$('.sheet').forEach(function (s) { if (liveIO) liveIO.observe(s); else s.classList.add('is-live'); });

  /* ================================ Stage: one clock for everything that moves ================================ */
  // Nothing on the page follows the pointer, and nothing wiggles for the sake of it. Things move only
  // when something in their world would move them:
  //  · the sea is a toy-theatre wave machine: rigid cut strips, each pushed round on its own crank;
  //  · fronds bend from the root in the breeze, each hinge a little more and a beat later;
  //  · clouds and confetti ride the breeze, and scrolling blows a gust;
  //  · a stop-motion cast (gulls, fish, crab, kite tail, beach ball, starfish, oyster, sun rays) swaps
  //    hand-cut drawings at 6–12 fps, each frame placed a hair off, like paper moved by hand.
  // One requestAnimationFrame drives all of it, only while a part is on screen and motion is allowed.
  // Reduced motion: none of it starts, and every piece keeps its still pose from the HTML.
  var NS = 'http://www.w3.org/2000/svg', TAU = Math.PI * 2, RAD = Math.PI / 180;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var smooth = function (a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  // layout-free reads for the frame loop (window.innerWidth / innerHeight would force a layout mid-frame)
  // (read lazily: even window.innerWidth forces a layout while the page is still settling)
  var deskMQ = window.matchMedia('(min-width: 1024px)'), VW = 0, VH = 0;
  var desk = function () { return deskMQ.matches; };
  var vw = function () { return VW || (VW = window.innerWidth); }, vh = function () { return VH || (VH = window.innerHeight); };
  on(window, 'resize', function () { VW = VH = 0; });
  STAGE = (function () {
    var still = reduced() || !window.requestAnimationFrame;
    var parts = [], raf = 0, last = 0, T = 0, sy = -1, lastY = 0, dy = 0, dir = 1, speed = 0, gust = 0, wind = 0.6;   // sy: read on first use
    // phones and low-memory devices run the paper theatre at 30 fps (plenty for hand-cranked paper)
    var minGap = (window.matchMedia('(pointer: coarse)').matches || (navigator.deviceMemory || 8) <= 4) ? 1000 / 30 - 2 : 0;
    function running() { return !still && !motionOff(); }
    function frame(now) {
      raf = 0;
      if (!running()) { last = 0; return; }
      if (minGap && last && now - last < minGap) { raf = requestAnimationFrame(frame); return; }
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now; T += dt;
      if (sy < 0) { sy = lastY = window.pageYOffset; }
      var y = sy;                                                    // kept by the scroll listener: no layout read here
      dy = y - lastY; lastY = y;
      if (dy) dir = dy > 0 ? 1 : -1;
      speed += (Math.abs(dy) / dt - speed) * Math.min(1, dt * 5);              // scroll speed, px/s
      gust += (Math.min(1, speed / 2600) - gust) * Math.min(1, dt * (speed > 40 ? 2.5 : 0.6));
      wind = 0.6 + 0.22 * Math.sin(T * 0.23 + 1) + 0.12 * Math.sin(T * 0.61 + 2) + 0.06 * Math.sin(T * 1.7) + gust;
      var any = false;
      for (var i = 0; i < parts.length; i++) { var p = parts[i]; if (p.live) { any = true; p.tick(dt, T); } }
      if (any) raf = requestAnimationFrame(frame); else last = 0;
    }
    function kick() {
      if (raf || !running()) return;
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].live) { last = 0; if (sy >= 0) lastY = sy; raf = requestAnimationFrame(frame); return; }
      }
    }
    function add(p) {
      if (still) return p;
      parts.push(p);
      if (p.watch === false) return p;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          var was = p.live;
          p.live = es[0].isIntersecting;
          if (p.live && p.measure) p.measure();
          if (p.live && !was && p.enter) p.enter();
          kick();
        }, { rootMargin: p.margin || '80px 0px' }).observe(p.el);
      } else { p.live = true; if (p.measure) p.measure(); }
      if (p.measure && 'ResizeObserver' in window) new ResizeObserver(function () { if (p.live) p.measure(); }).observe(p.el);
      return p;
    }
    on(window, 'scroll', function () { sy = window.pageYOffset; kick(); }, { passive: true });
    reduceMQ.addEventListener && reduceMQ.addEventListener('change', function () { still = reduced(); kick(); });
    return {
      still: function () { return still; }, add: add, kick: kick, running: running,
      wind: function () { return wind; }, gust: function () { return gust; }, dy: function () { return dy; }, dir: function () { return dir; },
      y: function () { return sy < 0 ? (sy = lastY = window.pageYOffset) : lastY; }   // the scroll position at the top of this frame
    };
  })();
  // stop-motion helpers: a clock that ticks at a fixed frame rate, the hand-moved jitter, a drawing swap
  function stepper(fps) {
    var acc = Math.random() / fps;
    return function (dt) { acc += dt; if (acc < 1 / fps) return false; acc = acc % (1 / fps); return true; };
  }
  function boil(a) { return (Math.random() * 2 - 1) * a; }
  function draw(use, id) { if (use.__f !== id) { use.setAttribute('href', '#' + id); use.__f = id; } }
  function px(v) { return v.toFixed(1) + 'px'; }
  // the copy column's real right edge (where its words end), in the hero's own coordinates
  function copyEdge(scene) {
    if (!desk()) return -1;
    var sr = scene.getBoundingClientRect(), r = 0;
    $$('.hero__inner > *').forEach(function (el) {
      var rg = doc.createRange(); rg.selectNodeContents(el);
      var rs = rg.getClientRects();
      for (var i = 0; i < rs.length; i++) if (rs[i].width) r = Math.max(r, rs[i].right);
    });
    return r ? r - sr.left : -1;
  }
  // a strip's cut edge, read once from its sprite symbol: [x, y] in symbol units (2800 x 240)
  var EDGES = {};
  function edge(id) {
    if (EDGES[id]) return EDGES[id];
    var sym = doc.getElementById(id), p = sym && sym.querySelector('path');
    var n = ((p && p.getAttribute('d')) || '').match(/-?\d*\.?\d+/g) || [], xs = [], ys = [];
    for (var i = 0; i + 1 < n.length; i += 2) { xs.push(+n[i]); ys.push(+n[i + 1]); }
    xs.length = Math.max(0, xs.length - 2); ys.length = xs.length;           // drop the two bottom corners
    return (EDGES[id] = { xs: xs, ys: ys });
  }

  /* ---- the wave machine: rigid strips on cranks; fronds, the sun-pop and the boat ride along ---- */
  // Each strip is pushed up and down on its own hand-cranked rod, like the wave machine in a toy
  // theatre: the rod lifts and drops the strip (the main stroke), the strip seesaws about a pivot near
  // one end (ends alternate, so neighbours see-saw against each other), and it slides only a little
  // sideways. A hand pauses for a beat at the top and bottom of each stroke, never turns evenly, and
  // the stroke grows and shrinks a little.
  var CRANK = {
    1: { P: 5.4, dir: 1, ph: 0.4, k: 0.86, pivot: 0.16 },
    2: { P: 4.5, dir: -1, ph: 2.5, k: 0.94, pivot: 0.84 },
    3: { P: 3.8, dir: 1, ph: 1.2, k: 1, pivot: 0.22 }
  };
  var SEAS = [];
  function theatre(scene) {
    var strips = {}, list = [];
    $$('svg.wave[data-wave]', scene).forEach(function (svg) {
      var n = +svg.getAttribute('data-wave'), c = CRANK[n];
      if (!c) return;
      var st = { el: svg, n: n, P: c.P, dir: c.dir, th: c.ph + rand(-0.3, 0.3), k: c.k, pivot: c.pivot, e: edge('wave-' + n), x: 0, y: 0, r: 0 };
      svg.style.transformOrigin = (c.pivot * 100) + '% 70%';
      strips[n] = st; list.push(st);
    });
    var fronds = $$('.frond', scene).map(function (f, i) {
      return { j: [f].concat($$('.fj', f)), a: [0, 0, 0], v: [0, 0, 0], w: TAU / rand(5.6, 7.4), ph: rand(0, TAU), i: i };
    });
    var sway = $('.sunsway', scene), lean = 0;
    var boat = $('[data-boat]', scene), boatUse = boat && $('use', boat), bx = null, bvx = 0, by = null, ba = 0, face = 1, pen = stepper(5);
    var sea = { scene: scene, strips: strips, h: 0, W: 0, H: 0 };
    sea.y = function (n, x) {                                      // the sea surface of strip n at scene x
      var st = strips[n];
      if (!st || !st.W) return sea.H;
      var xl = x - st.left - st.x, u = (xl - st.ox) / st.s, xs = st.e.xs, ys = st.e.ys, lo = 0, hi = xs.length - 1, yu;
      if (u <= xs[0]) yu = ys[0];
      else if (u >= xs[hi]) yu = ys[hi];
      else {
        while (hi - lo > 1) { var m = (lo + hi) >> 1; if (xs[m] <= u) lo = m; else hi = m; }
        yu = ys[lo] + (ys[hi] - ys[lo]) * ((u - xs[lo]) / ((xs[hi] - xs[lo]) || 1));
      }
      var yl = st.oy + yu * st.s, r = st.r * RAD, ox = st.W * st.pivot, oy = st.H * 0.7;
      return st.top + st.y + oy + (xl - ox) * Math.sin(r) + (yl - oy) * Math.cos(r);
    };
    SEAS.push(sea);
    function measure() {
      var sr = scene.getBoundingClientRect();
      sea.W = sr.width; sea.H = sr.height;
      list.forEach(function (st) {
        var prev = st.el.style.transform;
        st.el.style.transform = 'none';
        var r = st.el.getBoundingClientRect();
        st.el.style.transform = prev;
        st.left = r.left - sr.left; st.top = r.top - sr.top; st.W = r.width; st.H = r.height;
        st.s = Math.max(st.W / 2800, st.H / 240); st.ox = (st.W - 2800 * st.s) / 2; st.oy = st.H - 240 * st.s;
      });
      var s1 = strips[1];
      sea.h = s1 ? s1.H / 1.2 : sea.H * 0.2;
      if (sunEl) sunK = sunEl.offsetWidth;
      if (boat) {
        boat.__w = boat.offsetWidth; boat.__h = boat.offsetHeight;
        sea.docTop = sr.top + window.pageYOffset; sea.maxY = doc.documentElement.scrollHeight - vh();
      }
    }
    function tick(dt, t) {
      // up and down is the main stroke (a floor on phones, so it never turns timid); a little sideways
      var h = sea.h, AY = Math.max(desk() ? 18 : 10, h * 0.12), AX = Math.max(3, h * 0.045), crank = 1 + STAGE.gust() * 1.4;
      list.forEach(function (st) {
        var c2 = Math.cos(st.th) * Math.cos(st.th);              // ~0 at the top and bottom of the stroke: the hand dwells there
        st.th += dt * (TAU / st.P) * crank * (0.36 + 0.64 * c2) * 1.45 * (1 + 0.08 * Math.sin(t * 0.43 + st.n * 2.1));
        var amp = st.k * (1 + 0.12 * Math.sin(t * (0.61 + st.n * 0.07) + st.n * 1.9));
        var rock = Math.atan2(AY * 1.15, Math.max(200, st.W * (1 - Math.min(st.pivot, 1 - st.pivot)))) / RAD;   // the far end travels about as far as the stroke
        st.y = AY * amp * Math.sin(st.th);
        st.x = st.dir * AX * amp * Math.cos(st.th);
        st.r = st.dir * rock * amp * Math.sin(st.th + 0.55) * (st.pivot < 0.5 ? 1 : -1);
        st.el.style.transform = 'translate3d(' + px(st.x) + ',' + px(st.y) + ',0) rotate(' + st.r.toFixed(3) + 'deg)';
      });
      // fronds: a chain of three damped springs, each driven a beat after the one below it
      var w = STAGE.wind() - 0.6;
      fronds.forEach(function (f) {
        for (var k = 0; k < 3; k++) {
          var ph = t * f.w + f.ph - k * 0.55;
          var target = (1.5 + k * 1.5) * (0.7 * Math.sin(ph) + 0.3 * Math.sin(1.73 * ph + 1)) + (0.8 + k * 0.7) * w * 1.6;
          f.v[k] += ((target - f.a[k]) * 26 - f.v[k] * 4.2) * dt;
          f.a[k] += f.v[k] * dt;
          f.j[k].style.transform = 'rotate(' + f.a[k].toFixed(2) + 'deg)';
        }
      });
      // the sun-pop's stick stands in the front strip, so it rocks a beat after that strip; a tap dunks
      // it a notch into the sea and it bobs back up (stop-motion, 10 fps)
      if (sway && strips[3]) {
        lean += (0.38 * Math.sin(strips[3].th + 0.5) - lean) * Math.min(1, dt * 2.2);
        sway.style.transform = 'rotate(' + lean.toFixed(3) + 'deg)';
        if (boing.length && boingStep(dt)) pose(boing.shift());
      }
      if (boat && strips[1] && boat.__w) tickBoat(dt);
    }
    // tap the sun: it squashes onto its stick, springs up, wobbles and settles, one drawing at a time (12 fps).
    // Poses are [lift (x the disc), squash x, squash y, turn]; the first is placed at once, so the tap answers instantly.
    var sunEl = $('.sunpop', scene), sunRays = sunEl && $('.sun-rays', sunEl), boing = [], boingStep = stepper(12), sunK = 1;
    var BOING = [[0.012, 1.08, 0.9, -2.5], [-0.035, 0.93, 1.09, 3], [-0.05, 0.97, 1.05, -3.5], [-0.022, 1.03, 0.97, 2.5], [0.006, 1.04, 0.95, -1.5],
      [-0.012, 0.99, 1.02, 1], [0, 1.01, 0.99, -0.5], null];
    function pose(p) {
      if (!sunEl) return;
      sunEl.style.transform = p ? 'translateY(' + px(p[0] * sunK) + ') rotate(' + p[3] + 'deg) scale(' + p[1] + ',' + p[2] + ')' : '';
    }
    sea.boing = function () {
      if (!sunEl || boing.length > 3) return;                       // a second tap mid-bounce waits for the wobble
      sunEl.style.transition = 'none';                              // (the sunrise transition must not smear the steps)
      boing = BOING.slice(1);
      pose(BOING[0]);
      if (sunRays && sunRays.__flick) sunRays.__flick();
      STAGE.kick();
    };
    // the boat sails along the back strip as the page scrolls toward the end, and rides its swell; it is
    // placed by hand 12 times a second (held between), like the rest of the stop-motion cast
    var boatStep = stepper(12);
    function tickBoat(dt) {
      var y0 = sea.docTop - vh(), maxY = sea.maxY;
      var p = maxY > y0 ? clamp((STAGE.y() - y0) / (maxY - y0), 0, 1) : 1;
      var target = sea.W * (0.14 + 0.56 * p);
      if (bx === null) bx = target;
      var nx = bx + (target - bx) * (1 - Math.exp(-dt * 1.8));
      bvx += ((nx - bx) / dt - bvx) * Math.min(1, dt * 4);
      bx = nx;
      if (bvx > 6) face = 1; else if (bvx < -6) face = -1;
      var half = boat.__w * 0.4, yl = sea.y(1, bx - half), yr = sea.y(1, bx + half);
      var ty = (yl + yr) / 2, ta = Math.atan2(yr - yl, half * 2) / RAD * 0.85;
      var k = by === null ? 1 : 1 - Math.exp(-dt / 0.3);            // the hull follows the swell a beat late
      by = by === null ? ty : by + (ty - by) * k;
      ba += (ta - ba) * k;
      if (pen(dt) && boatUse) draw(boatUse, Math.random() < 0.5 ? 'sh-boat' : 'sh-boat2');
      if (boatStep(dt)) boat.style.transform = 'translate(' + px(bx - boat.__w / 2 + boil(0.5)) + ',' + px(by - boat.__h * 0.84 + boil(0.4)) + ') rotate(' + (ba + boil(0.8)).toFixed(2) + 'deg) scaleX(' + face + ')';
    }
    scene.classList.add('sea-live');
    STAGE.add({ el: scene, measure: measure, tick: tick });
    return sea;
  }

  /* ---- a fish that leaps between the strips (stop-motion, 10 fps) ---- */
  function leaper(sea, opts) {
    var scene = sea.scene, el = $('[data-fish]', scene), sp = $('[data-splash]', scene);
    if (!el || !sp) return;
    var use = $('use', el), spUse = $('use', sp), step = stepper(10), wait = opts.first, L = null, fw = 0, fh = 0, sw = 0, sh = 0;
    function start() {
      var lo = opts.range[0](sea), hi = opts.range[1](sea);
      if (hi - lo < 80) { wait = 4; return; }
      var span = sea.h * rand(1.2, 1.8), x0 = rand(lo, hi), d = Math.random() < 0.5 ? -1 : 1;
      if (x0 + d * span > hi || x0 + d * span < lo) d = -d;
      if (x0 + d * span > hi || x0 + d * span < lo) { wait = 2; return; }
      L = { x0: x0, x1: x0 + d * span, d: d, h: sea.h * rand(0.5, 0.72), n: Math.round(rand(11, 14)), k: 0 };
      el.style.visibility = 'visible';
    }
    function splash(x, f) {
      if (!f) { sp.style.visibility = 'hidden'; return; }
      draw(spUse, 'splash-' + f);
      sp.style.visibility = 'visible';
      sp.style.transform = 'translate(' + px(x - sw / 2 + boil(0.8)) + ',' + px(sea.y(2, x) - sh * 0.85) + ')';
    }
    STAGE.add({
      el: scene,
      measure: function () { fw = el.offsetWidth; fh = el.offsetHeight; sw = sp.getBoundingClientRect().width || fw * 0.7; sh = sw * 40 / 60; },
      enter: function () { if (!L) wait = Math.min(wait, opts.onEnter); },
      tick: function (dt) {
        if (!L) { wait -= dt; if (wait <= 0) start(); return; }
        if (!step(dt)) return;
        var u = L.k / L.n;
        var s0 = sea.y(2, L.x0) + fh * 0.62, s1 = sea.y(2, L.x1) + fh * 0.62;   // tucked behind strip 2 at both ends
        var x = L.x0 + (L.x1 - L.x0) * u, y = s0 + (s1 - s0) * u - 4 * L.h * u * (1 - u);
        var dx = L.x1 - L.x0, dyu = (s1 - s0) - 4 * L.h * (1 - 2 * u);
        var ang = L.d > 0 ? Math.atan2(dyu, dx) : Math.atan2(-dyu, -dx);
        draw(use, u < 0.24 ? 'fish-1' : u < 0.6 ? 'fish-2' : (L.k % 2 ? 'fish-3' : 'fish-2'));
        el.style.transform = 'translate(' + px(x - fw / 2 + boil(0.6)) + ',' + px(y - fh / 2 + boil(0.6)) + ') rotate(' + (ang / RAD + boil(2)).toFixed(1) + 'deg) scaleX(' + L.d + ')';
        if (L.k === 1) splash(L.x0, 1); else if (L.k === 2) splash(L.x0, 2); else if (L.k === L.n - 1) splash(L.x1, 1); else if (L.k === L.n) splash(L.x1, 2); else splash(0, 0);
        L.k++;
        if (L.k > L.n + 1) { L = null; el.style.visibility = 'hidden'; splash(0, 0); wait = rand(opts.every[0], opts.every[1]); }
      }
    });
  }

  /* ---- paper sun rays: three drawings swapped at 6 fps while the ring turns a notch at a time ---- */
  function rays(el) {
    if (!el) return;
    var use = $('use', el), step = stepper(6), fast = stepper(12), a = rand(0, 22), f = 1, fq = [];
    // a tap on the sun: the rays flick out and snap back, drawing by drawing ([scale, extra turn] each)
    el.__flick = function () { fq = [[1.14, 6], [0.93, 13], [1.07, 17], [0.98, 19], [1.02, 20], [1, 20]]; };
    STAGE.add({
      el: el, margin: '0px',
      tick: function (dt) {
        var q = null;
        if (fq.length) { if (!fast(dt)) return; q = fq.shift(); if (!fq.length) { a = (a + q[1]) % 360; q = null; } }
        else if (!step(dt)) return;
        if (!q) a = (a + 0.7) % 360;
        f = (f + (Math.random() < 0.8 ? 1 : 2)) % 3;
        draw(use, 'rays-' + (f + 1));
        el.style.transform = 'translate(' + px(boil(0.6)) + ',' + px(boil(0.6)) + ') rotate(' + (a + (q ? q[1] : 0) + boil(0.5)).toFixed(2) + 'deg)' + (q ? ' scale(' + q[0] + ')' : '');
      }
    });
  }

  /* ---- gulls: flap across their sky in stop-motion (10 fps), banking along a curved path ---- */
  function gulls(host, cfg) {
    var birds = [], wait = cfg.first, step = stepper(10), W = 0, H = 0;
    function spawn(delay) {
      var el = doc.createElementNS(NS, 'svg');
      el.setAttribute('viewBox', '0 0 120 64'); el.setAttribute('class', 'gull'); el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<use href="#gull-2"/>';
      if (cfg.size) el.style.setProperty('--gw', cfg.size());
      (cfg.layer || host).appendChild(el);
      var P = cfg.path(W, H), len = 0, prev = P[0];
      for (var i = 1; i <= 12; i++) { var q = bez(P, i / 12); len += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; }
      birds.push({ el: el, use: el.firstChild, P: P, len: len, u: 0, v: cfg.speed * rand(0.85, 1.15), cyc: Math.floor(rand(0, 4)), glide: 0, delay: delay || 0, w: 0 });
    }
    function bez(P, u) {
      var a = 1 - u;
      return [a * a * a * P[0][0] + 3 * a * a * u * P[1][0] + 3 * a * u * u * P[2][0] + u * u * u * P[3][0],
        a * a * a * P[0][1] + 3 * a * a * u * P[1][1] + 3 * a * u * u * P[2][1] + u * u * u * P[3][1]];
    }
    var part = STAGE.add({
      el: host,
      measure: function () { var r = host.getBoundingClientRect(); W = r.width; H = r.height; },
      enter: function () { if (cfg.onEnter && !birds.length) wait = Math.min(wait, cfg.onEnter); },
      tick: function (dt) {
        if (!birds.length) {
          wait -= dt;
          if (wait <= 0 && W) { for (var n = 0; n < (cfg.flock || 1); n++) spawn(n * 0.55); wait = cfg.every ? rand(cfg.every[0], cfg.every[1]) : 1e9; }
          return;
        }
        if (!step(dt)) return;
        birds = birds.filter(function (b) {
          if (b.delay > 0) { b.delay -= 0.1; return true; }
          b.u += b.v * 0.1 / b.len;
          if (b.u >= 1) { b.el.remove(); return false; }
          var p = bez(b.P, b.u), q = bez(b.P, Math.min(1, b.u + 0.02));
          var dx = q[0] - p[0], dyy = q[1] - p[1], face = dx > 0 ? -1 : 1;
          var bank = clamp(Math.atan2(dyy, Math.abs(dx)) / RAD, -16, 16) * (dx > 0 ? 1 : -1);
          if (b.glide > 0) { b.glide--; draw(b.use, 'gull-2'); }
          else {
            b.cyc = (b.cyc + 1) % 4;
            draw(b.use, 'gull-' + [1, 2, 3, 2][b.cyc]);
            if (b.cyc === 3 && Math.random() < 0.18) b.glide = Math.round(rand(4, 9));
          }
          if (!b.w) b.w = b.el.getBoundingClientRect().width || 46;
          b.el.style.visibility = 'visible';
          b.el.style.transform = 'translate(' + px(p[0] - b.w / 2 + boil(0.7)) + ',' + px(p[1] - b.w * 0.27 + boil(0.7)) + ') rotate(' + (bank + boil(1.5)).toFixed(1) + 'deg) scaleX(' + face + ')';
          return true;
        });
      }
    });
    return part;
  }

  /* ---- stop-motion paper confetti (the sky, the section seams and the bursts all use it) ---- */
  // Nothing here tweens. A piece is a small cut shape with four drawings (face-on, tilted, edge-on, and
  // the back in its second colour). A 10–12 fps clock ticks; each piece holds its pose for 1–3 ticks,
  // then is moved by hand: a step down, a step to the side (the side flips every few steps), a new pose
  // and a hair of jitter. The uneven holds keep it from looking machine-made.
  var POSE = [[1, 0, 0], [0.56, 34, 0], [0.16, 8, 1], [1, 180, 1]];   // [scaleY, extra turn, colour 0/1]
  function cfPiece(o) {
    return { x: o.x || 0, y: o.y || 0, s: o.s || 16, sh: o.sh || 0, c: o.c, r: rand(0, 360), pose: Math.floor(rand(0, 4)), pd: Math.random() < 0.5 ? 1 : -1,
      hold: Math.ceil(rand(0, 3)), side: Math.random() < 0.5 ? -1 : 1, sideN: Math.ceil(rand(1, 4)), jx: 0, jy: 0, jr: 0 };
  }
  // one hand-placed step (k scales the step to the scene); false while the piece is still holding
  function cfStep(b, k, wind) {
    b.hold--;
    if (b.hold > 0) return false;
    b.hold = Math.random() < 0.25 ? 1 : Math.random() < 0.6 ? 2 : 3;
    b.pose = (b.pose + b.pd + 4) % 4;
    if (Math.random() < 0.15) b.pd = -b.pd;
    b.y += rand(6, 14) * k * (b.pose === 2 ? 1.25 : 1);          // edge-on, it drops a little faster
    if (--b.sideN <= 0) { b.side = -b.side; b.sideN = Math.ceil(rand(1, 4)); }
    b.x += (b.side * rand(2, 6) + wind * 3) * k;
    b.r += rand(-14, 14);
    b.jx = boil(0.6); b.jy = boil(0.6); b.jr = boil(2);
    return true;
  }
  // canvas drawing of one piece in its current pose (the bursts)
  function cfDraw(ctx, b, ox, oy) {
    var P = POSE[b.pose];
    ctx.save();
    ctx.translate(b.x + b.jx + ox, b.y + b.jy + oy);
    ctx.rotate((b.r + P[1] + b.jr) * RAD);
    ctx.scale(1, P[0]);
    shape(ctx, b, 'rgba(74,13,46,.2)', 0.9, 1.6);
    shape(ctx, b, b.c[P[2]], 0, 0);
    ctx.restore();
  }
  // the same piece as a little SVG cut-out (the sky and the seams): written only when it steps
  function cfPlace(b) {
    var P = POSE[b.pose];
    b.el.style.transform = 'translate3d(' + px(b.x + b.jx) + ',' + px(b.y + b.jy) + ',0) rotate(' + (b.r + P[1] + b.jr).toFixed(1) + 'deg) scaleY(' + P[0] + ')';
    var f = b.c[P[2]];
    if (b.el.__f !== f) { b.el.style.setProperty('--fill', f); b.el.__f = f; }
  }
  function cfSvg(sh) {
    var el = doc.createElementNS(NS, 'svg');
    el.setAttribute('viewBox', sh === 1 ? '0 0 16 16' : '0 0 16 20');
    el.setAttribute('class', 'cfp');
    el.innerHTML = '<use href="#' + (sh === 1 ? 'sh-chip' : 'sh-tear') + '"/>';
    return el;
  }

  /* ---- the hero's sky: clouds drift on the breeze; paper confetti tumbles down in stop-motion ---- */
  function sky(scene, sea) {
    var clouds = $$('.cloud', scene).map(function (el) {
      var front = el.classList.contains('cloud--f1');
      return { el: el, v: front ? 32 : el.classList.contains('cloud--b2') ? 19 : 14, bob: front ? 3.5 : 2.2, ph: rand(0, TAU), dx: 0, x0: 0, y0: 0, w: 0 };
    });
    // the confetti sits behind the sun-pop (never on the disc) and fades out where it would cross the copy
    var layer = $('.hl--sun', scene), box = doc.createElement('div');
    box.className = 'sky-cf'; box.setAttribute('aria-hidden', 'true');
    layer.insertBefore(box, $('.sunsway', layer));
    var W = 0, H = 0, copyR = -1, discL = 0, discR = 0, bits = [], pal = [], tick10 = stepper(10), sunEl = $('.sunpop', scene);
    function palette() {
      var cs = getComputedStyle(root), g = function (n) { return cs.getPropertyValue(n).trim(); };
      var acc = g('--accent'), soft = g('--accent-soft'), deep = g('--deep');
      pal = [[acc, deep], [soft, acc], [deep, acc], ['#FFFFFF', g('--tint')], ['#FFB21E', '#FFC83D'], [acc, '#FFFFFF']];
    }
    function cap() { return desk() ? 18 : 8; }
    function lo() { return copyR > 0 ? copyR - 30 : 8; }
    function spawn(b, anywhere) {
      var s = rand(14, 24) * (desk() ? 1 : 0.8), cols = [], a = lo();
      if (discL - 8 - a > 30) cols.push([a, discL - 8]);           // mostly in the open sky either side of the sun
      if (W - 22 - discR > 30) cols.push([discR + 8, W - 22]);
      var tot = cols.reduce(function (t, c) { return t + c[1] - c[0]; }, 0), x = rand(a, W - 26);
      if (tot && Math.random() < 0.86) { var u = rand(0, tot); for (var i = 0; i < cols.length; i++) { var w = cols[i][1] - cols[i][0]; if (u <= w) { x = cols[i][0] + u; break; } u -= w; } }
      b.s = s; b.x = x; b.y = anywhere ? rand(0, H - sea.h * 0.9) : rand(-30, -14);
      b.c = pal[Math.floor(Math.random() * pal.length)];
      b.el.style.width = (b.sh === 1 ? s * 0.8 : s).toFixed(1) + 'px';
    }
    function fade(b) {                                              // in at the top, out at the sea and near the copy
      var top = desk() ? 50 : -24, seaTop = H - sea.h * 0.62, a = smooth(top, top + 38, b.y) * (1 - smooth(seaTop - 30, seaTop + 6, b.y));
      if (copyR > 0) a *= smooth(copyR - 20, copyR + 90, b.x);
      return a;
    }
    function place(b) { cfPlace(b); var a = fade(b); b.el.style.opacity = a < 0.02 ? '0' : a.toFixed(2); }
    function measure() {
      var sr = scene.getBoundingClientRect();
      W = sr.width; H = sr.height;
      copyR = copyEdge(scene);
      if (sunEl) { var sp = sunEl.getBoundingClientRect(); discL = sp.left - sr.left; discR = sp.right - sr.left; }
      clouds.forEach(function (c) {
        var prev = c.el.style.transform;
        c.el.style.transform = 'none';
        var r = c.el.getBoundingClientRect();
        c.el.style.transform = prev;
        c.x0 = r.left - sr.left; c.y0 = r.top - sr.top; c.w = r.width;
      });
      if (!pal.length) palette();
      while (bits.length < cap()) {                                  // the first fill: pieces already in the air
        var sh = bits.length % 3 === 1 ? 1 : 0, b = cfPiece({ sh: sh });
        b.el = cfSvg(sh); box.appendChild(b.el);
        bits.push(b); spawn(b, true);
      }
      bits.forEach(function (b, i) { b.el.style.display = i < cap() ? '' : 'none'; place(b); });
      box.classList.add('is-on');
    }
    function tick(dt, t) {
      var wind = STAGE.wind();
      clouds.forEach(function (c) {
        c.dx += c.v * (0.5 + wind * 0.75) * dt;
        var left = c.x0 + c.dx, a = 1;
        if (left > W + 20) c.dx = (copyR > 0 ? copyR - c.w * 0.66 : -c.w - rand(10, 60)) - c.x0;   // round again
        left = c.x0 + c.dx;
        if (copyR > 0) a = smooth(copyR - c.w * 0.62, copyR - c.w * 0.12, left);    // it slips out from behind the copy
        var bob = Math.sin(t * 0.5 + c.ph) * c.bob, flex = Math.sin(t * 0.37 + c.ph) * 1.4;
        c.el.style.opacity = a.toFixed(3);
        c.el.style.transform = 'translate3d(' + px(c.dx) + ',' + px(bob) + ',0) skewX(' + flex.toFixed(2) + 'deg) scaleY(' + (1 + Math.sin(t * 0.61 + c.ph) * 0.018).toFixed(3) + ')';
      });
      if (!W || !tick10(dt)) return;
      var k = desk() ? 1 : 0.8, n = Math.min(cap(), bits.length);
      for (var i = 0; i < n; i++) {
        var b = bits[i];
        if (!cfStep(b, k, wind - 0.6)) continue;
        if (b.y > H - sea.h * 0.55 || b.x > W + 30 || b.x < lo() - 120) spawn(b, false);
        place(b);
      }
    }
    listeners.push(function () {                                    // after the 700 ms colour transition,
      setTimeout(function () {                                     // re-colour what is already in the air too
        palette();
        bits.forEach(function (b) { b.c = pal[Math.floor(Math.random() * pal.length)]; cfPlace(b); });
      }, 760);
    });
    scene.classList.add('sky-live');
    STAGE.add({ el: scene, measure: measure, tick: tick });
  }
  // one piece of paper confetti: an achene (teardrop), a sugar chip, a sprinkle or a punched dot
  function shape(ctx, b, fill, ox, oy) {
    var s = b.s;
    ctx.fillStyle = fill;
    ctx.beginPath();
    if (b.sh === 0) { ctx.moveTo(ox, oy - s * 0.55); ctx.bezierCurveTo(ox + s * 0.5, oy - s * 0.05, ox + s * 0.42, oy + s * 0.5, ox, oy + s * 0.5); ctx.bezierCurveTo(ox - s * 0.42, oy + s * 0.5, ox - s * 0.5, oy - s * 0.05, ox, oy - s * 0.55); }
    else if (b.sh === 1) { ctx.moveTo(ox - s * 0.4, oy - s * 0.36); ctx.lineTo(ox + s * 0.42, oy - s * 0.4); ctx.lineTo(ox + s * 0.38, oy + s * 0.4); ctx.lineTo(ox - s * 0.42, oy + s * 0.36); }
    else if (b.sh === 2) { var w = s * 0.62, h = s * 0.18; ctx.moveTo(ox - w + h, oy - h); ctx.lineTo(ox + w - h, oy - h); ctx.arc(ox + w - h, oy, h, -Math.PI / 2, Math.PI / 2); ctx.lineTo(ox - w + h, oy + h); ctx.arc(ox - w + h, oy, h, Math.PI / 2, Math.PI * 1.5); }
    else ctx.arc(ox, oy, s * 0.36, 0, TAU);
    ctx.closePath();
    ctx.fill();
  }

  /* ---- confetti bursts when you choose or tap something: thrown up and away, in stop-motion (12 fps) ---- */
  FX = (function () {
    var cv = null, ctx = null, bits = [], dpr = 1, part = null, tick12 = stepper(12);
    function ensure() {
      if (cv) return !!ctx;
      cv = doc.createElement('canvas'); cv.className = 'fx-over'; cv.setAttribute('aria-hidden', 'true');
      ctx = cv.getContext && cv.getContext('2d');
      doc.body.appendChild(cv);
      part = STAGE.add({ el: cv, watch: false, live: false, tick: tick });
      return !!ctx;
    }
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      var w = Math.round(vw() * dpr), h = Math.round(vh() * dpr);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    }
    // x, y: the throw point (viewport px). Pieces never fall back below opts.floor (the control's top edge).
    function burst(x, y, opts) {
      if (!STAGE.running() || !ensure()) return;
      opts = opts || {};
      size();
      var cs = getComputedStyle(root), g = function (n) { return cs.getPropertyValue(n).trim(); };
      var pal = opts.pal || [[g('--accent'), g('--deep')], [g('--accent-soft'), g('--accent')], ['#FFFFFF', g('--tint')], ['#FFC83D', '#FFB21E'], [g('--deep'), g('--accent')]];
      var n = opts.n || (desk() ? 30 : 22), sy = window.pageYOffset, floor = (opts.floor === undefined ? y : opts.floor) + sy;
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + rand(-1, 1) * (opts.spread || 1.25) + (opts.lean || 0), sp = rand(420, 760) * (opts.power || 1);
        var b = cfPiece({ x: x + rand(-10, 10), y: y + sy + rand(-6, 4), s: rand(12, 20) * (opts.big || 1), sh: Math.floor(Math.random() * 4), c: pal[i % pal.length] });
        b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.age = 0; b.life = rand(1.2, 1.6); b.floor = floor;
        bits.push(b);
      }
      part.live = true;
      STAGE.kick();
    }
    function tick(dt) {
      if (!tick12(dt)) return;
      var h = 1 / 12, sy = STAGE.y();
      size();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw(), vh());
      bits = bits.filter(function (b) {
        b.age += h;
        if (b.age > b.life) return false;
        b.vx *= 0.8; b.vy = Math.min(150, b.vy * 0.8 + 900 * h);   // paper: a big throw, quick drag, a slow fall
        b.x += b.vx * h; b.y += b.vy * h;
        b.hold = 1; cfStep(b, 0.3, 0);                              // a new drawing and a hair of jitter each frame
        if (b.vy > 0 && b.y > b.floor) return false;                 // never falls back onto the control
        ctx.globalAlpha = 1 - smooth(b.life - 0.35, b.life, b.age);
        cfDraw(ctx, b, 0, -sy);
        return true;
      });
      ctx.globalAlpha = 1;
      if (!bits.length) { ctx.clearRect(0, 0, cv.width, cv.height); part.live = false; }
    }
    return {
      burst: burst,
      // from a control: thrown up from its top edge
      from: function (el, opts) {
        var r = el && el.getBoundingClientRect();
        if (!r || !r.width) return;
        opts = opts || {};
        if (opts.floor === undefined) opts.floor = r.top;
        burst(r.left + r.width / 2, r.top + 2, opts);
      }
    };
  })();

  /* ---- paper offcuts tumbling down the seams between some sheets (they slip behind the next sheet) ---- */
  // A small handful at a time, each piece stepped by hand like the sky confetti: the pop sheet sheds
  // strawberry achenes, the Real sugar sheet sheds sugar crystals, and so on.
  function seam(sheet, kinds) {
    var band = doc.createElement('div');
    band.className = 'flutter'; band.setAttribute('aria-hidden', 'true');
    var pieces = [], W = 0, H = 0, wait = rand(0.5, 2), n = desk() ? 8 : 5, tick10 = stepper(10);
    for (var i = 0; i < n; i++) {
      var k = kinds[i % kinds.length], s = doc.createElementNS(NS, 'svg');
      s.setAttribute('viewBox', k[1]); s.innerHTML = '<use href="#' + k[0] + '"/>';
      band.appendChild(s);
      var p = cfPiece({ c: [k[2], k[3] || k[2]] });
      p.el = s; p.on = false; p.delay = 0;
      pieces.push(p);
    }
    sheet.appendChild(band);
    function handful() {                                         // let go of 3–4 pieces near each other
      var free = pieces.filter(function (p) { return !p.on; });
      if (free.length < 3) return;
      var cx = rand(W * 0.08, W * 0.92), m = Math.min(free.length, Math.round(rand(3, 4)));
      for (var i = 0; i < m; i++) {
        var p = free[i];
        p.on = true; p.delay = i + Math.round(rand(0, 2)); p.x = cx + rand(-70, 70); p.y = -16; p.hold = 1;
      }
    }
    STAGE.add({
      el: band, margin: '0px',
      measure: function () { W = band.clientWidth; H = band.clientHeight; },
      tick: function (dt) {
        wait -= dt;
        if (wait <= 0 && W) { handful(); wait = rand(2.4, 4.6); }
        if (!tick10(dt)) return;
        var wind = STAGE.wind() - 0.6;
        pieces.forEach(function (p) {
          if (!p.on) return;
          if (p.delay > 0) { p.delay--; return; }
          if (!cfStep(p, 0.9, wind)) return;
          if (p.y > H + 12) { p.on = false; p.el.style.opacity = '0'; return; }
          cfPlace(p);
          p.el.style.opacity = p.y < 0 ? '0.5' : '1';
        });
      }
    });
  }

  /* ---- the cast, scene by scene ---- */
  if (!STAGE.still()) {
    // hero: the wave machine, the sky, a leaping fish, gulls, the sun's rays, a crab on the sand
    (function hero() {
      var scene = $('.hero__art');
      if (!scene) return;
      var sea = theatre(scene);
      sky(scene, sea);
      leaper(sea, {
        first: 3.2, onEnter: 1.6, every: [9, 15],
        range: [function (s) { var c = copyEdge(s.scene); return c > 0 ? c + 60 : 30; }, function (s) { return s.W - 50; }]
      });
      rays($('.sun-rays', scene));
      gulls(scene, {
        layer: $('.hl--sun', scene), first: 2.4, every: [13, 22], speed: 70, onEnter: 3,
        size: function () { return desk() ? 'clamp(40px, 3.4vw, 54px)' : '34px'; },
        path: function (W, H) {
          var c = copyEdge(scene);
          if (c > 0) return [[W + 50, H * 0.22], [W * 0.82, H * 0.08], [c + 200, H * 0.26], [c + 90, -H * 0.12]];
          return [[W + 40, H * 0.3], [W * 0.62, H * 0.1], [W * 0.32, H * 0.3], [-60, H * 0.16]];
        }
      });
      crab(scene);
    })();
    // the sunset: the same machine, a boat that sails as you reach the end, a fish, a far gull, rays
    (function sunset() {
      var scene = $('.sunset');
      if (!scene) return;
      var sea = theatre(scene);
      leaper(sea, { first: 6, onEnter: 1.4, every: [8, 14], range: [function (s) { return s.W * 0.1; }, function (s) { return s.W * 0.9; }] });
      rays($('.sunset__rays', scene));
      gulls(scene, {
        first: 4, every: [16, 26], speed: 54, onEnter: 1.2,
        size: function () { return desk() ? '34px' : '26px'; },
        path: function (W, H) { return [[-50, H * 0.14], [W * 0.3, H * 0.02], [W * 0.66, H * 0.2], [W + 50, H * 0.06]]; }
      });
    })();
    // seams: offcuts that fit the sheet they fall from
    var TEAR = '0 0 16 20', CHIP = '0 0 16 16', CRYS = '0 0 24 24';
    [['#pop', [['sh-tear', TEAR, 'var(--accent)', 'var(--deep)'], ['sh-chip', CHIP, 'var(--deep)', 'var(--accent)'], ['sh-tear', TEAR, 'var(--accent-soft)', 'var(--accent)']]],
      ['#sugar', [['sh-crystal', CRYS, '#fff'], ['sh-crystal', CRYS, '#fff'], ['sh-chip', CHIP, '#fff', 'var(--tint)']]],
      ['#sticks', [['sh-tear', TEAR, 'var(--accent)', 'var(--deep)'], ['sh-chip', CHIP, '#fff', 'var(--tint)'], ['sh-tear', TEAR, 'var(--deep)', 'var(--accent)']]],
      ['#formats', [['sh-chip', CHIP, 'var(--accent)', 'var(--deep)'], ['sh-tear', TEAR, '#FFB21E', '#FFC83D'], ['sh-chip', CHIP, 'var(--accent-soft)', 'var(--accent)']]]
    ].forEach(function (s) { var el = $(s[0]); if (el) seam(el, s[1]); });
  }

  /* ---- a crab on the hero's beach: it scuttles sideways the way you scroll ---- */
  function crab(scene) {
    var el = $('[data-crab]', scene);
    if (!el) return;
    var use = $('use', el), step = stepper(10), x = null, x0 = 0, cw = 0, W = 0, lo = 0, hi = 0, budget = 0, legs = 0, snap = 0, idle = rand(4, 7), y = 0;
    function place(jx, jy, jr) { el.style.transform = 'translate(' + px(x - x0 + jx) + ',' + px(y + jy) + ') rotate(' + jr.toFixed(1) + 'deg)'; }
    STAGE.add({
      el: el, margin: '120px 0px',
      measure: function () {
        W = scene.clientWidth; cw = el.offsetWidth; x0 = el.offsetLeft;
        lo = desk() ? W * 0.3 : 10; hi = W - cw - 14;
        x = x === null ? x0 : clamp(x, lo, hi);
      },
      tick: function (dt) {
        budget += STAGE.dy() * 0.3;
        if (!step(dt)) return;
        if (Math.abs(budget) > 0.6) {
          var mv = (budget > 0 ? 1 : -1) * Math.min(Math.abs(budget), 6.5), nx = clamp(x + mv, lo, hi);
          if (nx === x) budget = 0;
          budget -= mv; x = nx; legs = 1 - legs; snap = 0; idle = rand(4, 8);
          y = legs ? -1.4 : 0;
          draw(use, legs ? 'crab-2' : 'crab-1'); place(boil(0.5), boil(0.4), boil(1.6));
          if (Math.abs(budget) < 0.6) { budget = 0; }
        } else if (snap > 0) {
          snap--; y = 0;
          draw(use, snap % 2 ? 'crab-3' : 'crab-1'); place(boil(0.4), boil(0.3), boil(1.2));
        } else {
          idle -= 0.1;
          if (idle <= 0) {
            if (Math.random() < 0.45) snap = 6; else budget = (Math.random() < 0.5 ? -1 : 1) * rand(24, 64);
            idle = rand(5, 9);
          } else if (use.__f !== 'crab-1') { draw(use, 'crab-1'); y = 0; place(0, 0, 0); }
        }
      }
    });
    el.__tap = function () { snap = 6; budget = (Math.random() < 0.5 ? -1 : 1) * rand(30, 56); STAGE.kick(); };
  }

  /* ---- sun sense: a kite tied to the beach bag, a beach ball, gulls, the umbrella in the breeze ---- */
  (function kiteLine() {                           // the still pose: a line from the bag handle to the kite
    var scene = $('.bagscene'), kite = scene && $('[data-kite]', scene), str = scene && $('.kite__string', scene);
    if (!kite || !str) return;
    function set() {
      var W = scene.clientWidth, H = scene.clientHeight, kx = kite.offsetLeft + kite.offsetWidth * 0.5, ky = kite.offsetTop + kite.offsetHeight * 0.33;
      var ax = W * 0.66, ay = H - W * 0.77;
      if (!W) return;
      str.setAttribute('viewBox', '0 0 ' + W.toFixed(0) + ' ' + H.toFixed(0));
      $('path', str).setAttribute('d', 'M' + ax.toFixed(1) + ' ' + ay.toFixed(1) + 'Q' + ((ax + kx) / 2 + 12).toFixed(1) + ' ' + ((ay + ky) / 2 + 10).toFixed(1) + ' ' + kx.toFixed(1) + ' ' + ky.toFixed(1));
    }
    idle(set);                                         // measured at idle, never during start-up
    if ('ResizeObserver' in window) new ResizeObserver(function () { if (!STAGE.running()) set(); }).observe(scene);
  })();
  (function beach() {
    var scene = $('.bagscene');
    if (!scene || STAGE.still()) return;
    var kite = $('[data-kite]', scene), tail = kite && $('.kite__tail', kite), tailUse = tail && $('use', tail);
    var str = $('.kite__string', scene), strPath = str && $('path', str), umb = $('.bagscene__umb', scene);
    var W = 0, H = 0, ax = 0, ay = 0, rx = 0, ry = 0, len = 0, a0 = 0, a = null, va = 0, tailStep = stepper(8), tf = 0, kiteStep = stepper(12);
    STAGE.add({
      el: scene, margin: '160px 0px',
      measure: function () {
        W = scene.clientWidth; H = scene.clientHeight;
        if (!kite) return;
        var kw = kite.offsetWidth, kh = kite.offsetHeight;
        rx = kite.offsetLeft + kw * 0.5; ry = kite.offsetTop + kh * 0.33;       // the bridle, at rest
        ax = W * 0.66; ay = H - W * 0.77;                                      // tied to the bag's right handle
        len = Math.hypot(rx - ax, ry - ay); a0 = Math.atan2(rx - ax, ay - ry);
        if (a === null) a = a0;
        str.setAttribute('viewBox', '0 0 ' + W.toFixed(0) + ' ' + H.toFixed(0));
      },
      tick: function (dt, t) {
        var w = STAGE.wind() - 0.6;
        if (umb) umb.style.transform = 'rotate(' + (w * 1.6 + 0.5 * Math.sin(t * 0.9)).toFixed(2) + 'deg)';
        if (!kite || !len) return;
        // the line pulls the kite round an arc; the breeze pushes it, gusts tug it, a spring brings it back
        var target = a0 - w * 0.2 + 0.07 * Math.sin(t * 1.05) + 0.035 * Math.sin(t * 2.6 + 1) + 0.02 * Math.sin(t * 4.1);
        va += ((target - a) * 12 - va * 2.6) * dt;
        a += va * dt;
        var kt = kiteStep(dt), tt = tailStep(dt);                     // the kite is placed by hand 12 times a second; its tail swaps at 8
        if (!kt && !tt) return;
        var L = len * (1 + 0.025 * Math.sin(t * 1.5) + 0.04 * w);
        var kx = ax + Math.sin(a) * L + boil(0.6), ky = ay - Math.cos(a) * L + boil(0.6), tilt = (a - a0) / RAD * 0.9 + 5 * Math.sin(t * 1.9) + va * 6 + boil(1.2);
        if (kt) kite.style.transform = 'translate(' + px(kx - rx) + ',' + px(ky - ry) + ') rotate(' + tilt.toFixed(2) + 'deg)';
        var mx = (ax + kx) / 2, my = (ay + ky) / 2, nx = -(ky - ay) / L, ny = (kx - ax) / L, sag = L * (0.1 - 0.05 * w);
        if (ny < 0) { nx = -nx; ny = -ny; }                           // the line sags toward the sand
        if (kt) strPath.setAttribute('d', 'M' + ax.toFixed(1) + ' ' + ay.toFixed(1) + 'Q' + (mx + nx * sag).toFixed(1) + ' ' + (my + ny * sag).toFixed(1) + ' ' + kx.toFixed(1) + ' ' + ky.toFixed(1));
        if (tt) {
          tf = (tf + 1) % 3;
          draw(tailUse, 'kitetail-' + (tf + 1));
          tail.style.transform = 'rotate(' + (-tilt * 0.7 + boil(3)).toFixed(1) + 'deg)';
        }
      }
    });
    ball($('[data-ball]', scene), scene);
    var sec = $('#sun');
    gulls(sec, {
      first: 1e9, onEnter: 0.6, flock: 2, speed: 76,
      size: function () { return desk() ? '44px' : '34px'; },
      path: function (W2, H2) {
        var s = scene.getBoundingClientRect(), r = sec.getBoundingClientRect(), top = s.top - r.top;
        if (desk()) return [[W2 + 50, top - 120], [W2 * 0.84, top - 260], [W2 * 0.72, top - 180], [W2 * 0.56, -40]];
        return [[W2 + 40, top + s.height * 0.12], [W2 * 0.6, top - 30], [W2 * 0.3, top + 30], [-60, top - 20]];
      }
    });
  })();

  /* ---- a beach ball that bounces in when you arrive, and hops when you tap it (12 fps) ---- */
  function ball(el, scene) {
    if (!el) return;
    var spin = $('.ball__spin', el), step = stepper(12), seq = [], rot = 0, played = false, bw = 0, W = 0, H = 0;
    function frames(kind) {
      var out = [], i;
      if (kind === 'in') {
        var x = W * 0.3, top = -H * 0.95, hops = [[top, 0, 10, 0.5], [-H * 0.3, 0, 8, 0.3], [-H * 0.11, 0, 6, 0.2]];
        hops.forEach(function (h, k) {
          for (i = 1; i <= h[2]; i++) {
            var u = i / h[2], dx = -(W * 0.3 * h[3]) / h[2];
            x += dx;
            var yy = k === 0 ? top * (1 - u * u) : h[0] * 4 * u * (1 - u);
            out.push({ x: x, y: yy, sx: k === 0 && u > 0.6 ? 0.94 : 1, sy: k === 0 && u > 0.6 ? 1.08 : 1, r: dx });
          }
          out.push({ x: x, y: 0, sx: 1.2, sy: 0.78, r: 0 });                     // squash on landing
          if (k < 2) out.push({ x: x, y: -2, sx: 0.92, sy: 1.1, r: 0 });          // and stretch on the way up
        });
        for (i = 1; i <= 4; i++) out.push({ x: x * (1 - i / 4), y: 0, sx: 1, sy: 1, r: -x / 4 });
      } else {
        out.push({ x: 0, y: 0, sx: 1.16, sy: 0.82 }, { x: 0, y: -bw * 0.25, sx: 0.9, sy: 1.12 });
        for (i = 1; i <= 7; i++) { var u2 = i / 8; out.push({ x: 0, y: -bw * 1.3 * 4 * u2 * (1 - u2) - bw * 0.1, sx: 1, sy: 1, r: 9 }); }
        out.push({ x: 0, y: 0, sx: 1.18, sy: 0.8 }, { x: 0, y: 0, sx: 1, sy: 1 });
      }
      return out;
    }
    STAGE.add({
      el: el, margin: '0px 0px -20% 0px',
      measure: function () { bw = el.offsetWidth; W = scene.clientWidth; H = scene.clientHeight; },
      enter: function () { if (!played && W) { played = true; seq = frames('in'); } },
      tick: function (dt) {
        if (!seq.length || !step(dt)) return;
        var f = seq.shift();
        rot += (f.r || 0) * 360 / (Math.PI * bw || 1);
        spin.setAttribute('transform', 'rotate(' + ((rot + boil(2)) % 360).toFixed(1) + ')');
        el.style.transform = 'translate(' + px(f.x + boil(0.5)) + ',' + px(f.y + boil(0.5)) + ') scale(' + f.sx + ',' + f.sy + ')';
        if (!seq.length) el.style.transform = '';
      }
    });
    el.__tap = function () { if (!seq.length) { seq = frames('hop'); STAGE.kick(); } };
  }

  /* ---- facts on a stick: a starfish that turns over, an oyster that opens on a zinc fact ---- */
  (function shore() {
    var star = $('[data-star]'), oyster = $('[data-oyster]');
    if (!star || !oyster || STAGE.still()) return;
    var sSvg = $('svg', star), oSvg = $('svg', oyster), sUse = $('use', star), oUse = $('use', oyster), step = stepper(10), sq = [], oq = [], back = false, open = false, closeAt = 0, greeted = false;
    function flip() { sq = back ? [['star-2', -5], ['star-2', -3], ['star-1', 0]] : [['star-2', -6], ['star-2', -3], ['star-3', 0]]; back = !back; STAGE.kick(); }
    function shut() { oq = [['oyster-3', 0], ['oyster-2', 0], ['oyster-1', 0]]; open = false; }
    STAGE.add({
      el: star, margin: '0px 0px -15% 0px',
      enter: function () {
        if (greeted) return;
        greeted = true;                                  // it turns over once to say hello, then lies still
        var hold = function (id, n) { var o = []; while (n--) o.push([id, 0]); return o; };
        sq = hold('star-1', 10).concat([['star-2', -6], ['star-2', -3]], hold('star-3', 10), [['star-2', -5], ['star-2', -3], ['star-1', 0]]);
      },
      tick: function (dt, t) {
        if (open && t > closeAt) shut();
        if (!step(dt)) return;
        if (sq.length) { var f = sq.shift(); draw(sUse, f[0]); sSvg.style.transform = f[1] || sq.length ? 'translate(' + px(boil(0.6)) + ',' + px(f[1] + boil(0.5)) + ') rotate(' + boil(3).toFixed(1) + 'deg)' : ''; }
        if (oq.length) { var g = oq.shift(); draw(oUse, g[0]); oSvg.style.transform = oq.length ? 'translate(' + px(boil(0.6)) + ',' + px(boil(0.5)) + ') rotate(' + boil(2).toFixed(1) + 'deg)' : ''; }
      }
    });
    star.__tap = function () { if (!sq.length) flip(); };
    oyster.__tap = function () {
      if (open) { shut(); STAGE.kick(); return; }
      oq = [['oyster-1', 0], ['oyster-2', 0], ['oyster-3', 0]]; open = true;
      closeAt = Infinity;
      if (STICKS.show) STICKS.show(10);                              // "Seaside trivia: oysters top the zinc charts."
      setTimeout(function () { if (open) closeAt = 0; STAGE.kick(); }, 5200);
      STAGE.kick();
    };
  })();

  /* ---- tap a paper shape: it lifts like card, and some answer back ---- */
  on(doc, 'click', function (e) {
    var t = e.target.closest('[data-lift]');
    if (!t || reduced() || motionOff()) return;
    if (t.__tap) { t.__tap(); return; }
    if (t.classList.contains('sunpop')) {                          // the cut-paper sun boings on its stick and flicks
      if (SEAS[0] && SEAS[0].boing) SEAS[0].boing();                // its rays (no confetti: the sun carries it alone)
      return;
    }
    t.classList.remove('lift-me'); void t.offsetWidth; t.classList.add('lift-me');
  });
  on(doc, 'animationend', function (e) { if (e.animationName === 'lift') e.target.classList.remove('lift-me'); });

  /* ================================ Reveal ================================ */
  (function reveal() {
    var els = $$('.rv, .cut');
    if (reduced() || !('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    // stagger siblings
    $$('.rv').forEach(function (el) {
      var sibs = $$(':scope > .rv', el.parentElement);
      el.style.setProperty('--i', String(Math.max(0, sibs.indexOf(el))));
    });
    // a clipped strip never "intersects", so its heading is watched instead
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var t = e.target;
        if (t.__cuts) t.__cuts.forEach(function (c) { c.classList.add('in'); }); else t.classList.add('in');
        io.unobserve(t);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    els.forEach(function (el) {
      if (!el.classList.contains('cut')) return io.observe(el);
      var host = el.closest('h1, h2, h3, th, p') || el.parentElement;
      (host.__cuts = host.__cuts || []).push(el);
      if (host.__cuts.length === 1) io.observe(host);
    });
  })();
  // sunrise once the type is in
  (function sunrise() {
    var hero = $('.hero');                           // on the hero, not <html>: a class on the root restyles every sheet
    var go = function () { if (hero) hero.classList.add('risen'); };
    if (reduced()) return go();
    setTimeout(go, 1400);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { setTimeout(go, 30); });
  })();

  /* ================================ Nav ================================ */
  (function nav() {
    var hdr = $('#hdr');
    var sentinel = doc.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:12px;pointer-events:none';
    sentinel.setAttribute('aria-hidden', 'true');
    doc.body.prepend(sentinel);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { hdr.classList.toggle('is-scrolled', !es[0].isIntersecting); }).observe(sentinel);
      var links = $$('.nav a');
      var map = {};
      links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var a = map[e.target.id];
          if (!a) return;
          if (e.isIntersecting) { links.forEach(function (l) { l.removeAttribute('aria-current'); }); a.setAttribute('aria-current', 'true'); }
          else if (a.getAttribute('aria-current')) a.removeAttribute('aria-current');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      Object.keys(map).forEach(function (id) { var s = doc.getElementById(id); if (s) io.observe(s); });
    }

    // mobile menu: a full-height paper sheet with a focus trap
    var menu = $('#menu'), openBtn = $('[data-menu-open]'), closeBtn = $('[data-menu-close]');
    function focusables() { return $$('a[href], button:not([disabled]), input', menu).filter(function (el) { return el.offsetParent !== null; }); }
    function openMenu() {
      menu.hidden = false; openBtn.setAttribute('aria-expanded', 'true'); doc.body.style.overflow = 'hidden';
      var f = focusables(); if (f[0]) f[0].focus();
    }
    function closeMenu(restore) {
      if (menu.hidden) return;
      menu.hidden = true; openBtn.setAttribute('aria-expanded', 'false'); doc.body.style.overflow = '';
      if (restore !== false) openBtn.focus();
    }
    on(openBtn, 'click', openMenu);
    on(closeBtn, 'click', function () { closeMenu(); });
    on(menu, 'click', function (e) {
      if (e.target.closest('.menu__nav a')) closeMenu(false);
      else if (e.target.closest('[data-theme-btn]')) setTimeout(function () { closeMenu(); }, 0);   // after the theme has read the swatch's place
    });
    on(doc, 'keydown', function (e) {
      if (menu.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables(); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    on(window, 'resize', function () { if (window.innerWidth >= 1024) closeMenu(false); });

    // sticky shop bar: after the hero, hidden while the shop or the footer is on screen
    var bar = $('[data-bar]');
    if (bar && 'IntersectionObserver' in window) {
      var state = { hero: true, shop: false, foot: false };
      var barLink = $('a', bar);
      var upd = function () {
        var show = !state.hero && !state.shop && !state.foot;
        bar.classList.toggle('is-on', show);
        bar.setAttribute('aria-hidden', String(!show));
        if (barLink) barLink.tabIndex = show ? 0 : -1;
      };
      var watch = function (el, key) {
        if (!el) return;
        new IntersectionObserver(function (es) { state[key] = es[0].isIntersecting; upd(); }).observe(el);
      };
      watch($('.hero__inner'), 'hero'); watch($('#shop'), 'shop'); watch($('#footer'), 'foot');
    }
  })();

  // run something once a smooth in-page scroll has arrived (scrollend where it exists, else a pause)
  function afterScroll(fn) {
    if (reduced()) { setTimeout(fn, 0); return; }
    var done = false, t = 0, go = function () { if (done) return; done = true; window.removeEventListener('scroll', bump); fn(); };
    var bump = function () { clearTimeout(t); t = setTimeout(go, 160); };
    if ('onscrollend' in window) window.addEventListener('scrollend', go, { once: true });
    window.addEventListener('scroll', bump, { passive: true });
    t = setTimeout(go, 900);
  }
  // links that lead into closed things: open the drawer / tab first, then let the browser jump
  function reveal(target) {
    if (!target) return;
    var d = target.closest('details');
    while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); }
    if (target.tagName === 'DETAILS') target.open = true;
    var ex = $('#explorer');
    if (ex && ex.hidden && ex.contains(target)) { var r0 = $('input[name="view"][value="ingredient"]'); if (r0) { r0.checked = true; r0.dispatchEvent(new Event('change')); } }
    var panel = target.closest('[role="tabpanel"]');
    if (panel && panel.hidden && panel.__select) panel.__select();
    if (target.closest('.src.is-collapsed') && SRC.expand) SRC.expand();
  }
  // Sheets below the fold skip rendering until they come near (content-visibility), so a long jump would
  // aim at placeholder heights and land short. The first in-page jump lays every sheet out once (they then
  // keep their real sizes), and the browser's own smooth scroll does the rest.
  function layoutAll() {
    if (root.classList.contains('cv-off')) return;
    root.classList.add('cv-off');
    void doc.body.offsetHeight;
  }
  on(doc, 'click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (!id) return;
    var t = doc.getElementById(id);
    if (t) layoutAll();
    reveal(t);
    if (id === 'waitlist') {
      if (current === 'next-pop' || a.hasAttribute('data-notify')) { var cb = $('[data-wl-colors]'); if (cb) cb.checked = true; }
      afterScroll(function () { var f = $('#wl-email'); if (f) f.focus({ preventScroll: true }); });
    }
  });

  /* ================================ Explorer ================================ */
  function tabs(list, tabEls, panelEls, opts) {
    opts = opts || {};
    list.setAttribute('role', 'tablist');
    function select(i, focus) {
      tabEls.forEach(function (t, j) {
        var is = i === j;
        t.setAttribute('aria-selected', String(is));
        t.tabIndex = is ? 0 : -1;
        panelEls[j].hidden = !is;
      });
      if (focus) tabEls[i].focus();
      if (opts.onSelect) opts.onSelect(i, focus);
    }
    tabEls.forEach(function (t, i) {
      t.setAttribute('role', 'tab');
      t.setAttribute('aria-controls', panelEls[i].id);
      if (!t.id) t.id = panelEls[i].id + '-tab';
      panelEls[i].setAttribute('role', 'tabpanel');
      panelEls[i].setAttribute('aria-labelledby', t.id);
      panelEls[i].tabIndex = 0;
      panelEls[i].__select = function () { select(i, false); };
      on(t, 'click', function (e) { e.preventDefault(); select(i, false); });
      on(t, 'keydown', function (e) {
        var n = tabEls.length, k = e.key, j = -1;
        if (k === 'ArrowRight' || k === 'ArrowDown') j = (i + 1) % n;
        else if (k === 'ArrowLeft' || k === 'ArrowUp') j = (i - 1 + n) % n;
        else if (k === 'Home') j = 0;
        else if (k === 'End') j = n - 1;
        else if (k === 'Enter' || k === ' ') { e.preventDefault(); select(i, false); return; }
        if (j < 0) return;
        e.preventDefault(); select(j, true);
      });
    });
    var start = 0, h = location.hash.slice(1);
    panelEls.forEach(function (p, i) { if (h && (p.id === h || (doc.getElementById(h) && p.contains(doc.getElementById(h))))) start = i; });
    select(start, false);
    return select;
  }
  (function explorer() {
    var list = $('.ex-tabs');
    if (!list) return;
    var t = $$('.ex-tab', list), p = t.map(function (a) { return $(a.getAttribute('href')); }), ready = false;
    t.forEach(function (a) { a.removeAttribute('href'); a.tabIndex = -1; });
    tabs(list, t, p, {
      onSelect: function (i, byKey) {
        var art = $('.ex-shape', t[i]);
        if (ready && art && !reduced() && !motionOff()) { art.classList.remove('lift-me'); void art.getBoundingClientRect(); art.classList.add('lift-me'); }
        if (ready && !byKey && window.innerWidth < 1024) {          // on a phone the label card sits below the shapes: bring it up
          var r = p[i].getBoundingClientRect();
          if (r.top > window.innerHeight - 150) p[i].scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });
        }
      }
    });
    ready = true;
  })();

  /* ================================ Map ================================ */
  (function map() {
    var box = $('#map'), seg = $$('input[name="view"]'), explorer = $('#explorer');
    if (!box) return;
    var fnList = $('.map__fns', box), svg = $('.map__ribbons', box), board = $('.map__board', box), live = $('.map__live', box);
    fnList.innerHTML = FUNCTIONS.map(function (f) {
      return '<li><button class="map-f' + (f.dashed ? ' is-dashed' : '') + '" type="button" data-f="' + f.id + '" aria-pressed="false">' + f.name + '</button></li>';
    }).join('');
    var aBtns = $$('.map-a', box), fBtns = $$('.map-f', box), sel = null, drawn = false;
    function link(f, a) { return f.a.indexOf(a) > -1; }
    function draw() {
      if (box.hidden || window.innerWidth < 768) return;
      var b = board.getBoundingClientRect(), html = '';
      FUNCTIONS.forEach(function (f, fi) {
        var fr = fBtns[fi].getBoundingClientRect();
        f.a.forEach(function (aid) {
          var ab = $('.map-a[data-a="' + aid + '"]', box).getBoundingClientRect();
          var x1 = ab.right - b.left, y1 = ab.top + ab.height / 2 - b.top, x2 = fr.left - b.left, y2 = fr.top + fr.height / 2 - b.top;
          var dx = (x2 - x1) * 0.5;
          html += '<path class="rb' + (f.dashed ? ' rb--dash' : '') + '" data-f="' + f.id + '" data-a="' + aid + '" d="M' + x1.toFixed(1) + ' ' + y1.toFixed(1) +
            'C' + (x1 + dx).toFixed(1) + ' ' + y1.toFixed(1) + ' ' + (x2 - dx).toFixed(1) + ' ' + y2.toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '"/>';
        });
      });
      svg.setAttribute('viewBox', '0 0 ' + b.width.toFixed(0) + ' ' + b.height.toFixed(0));
      svg.innerHTML = html;
      drawn = true;
      paint();
    }
    function paint() {
      var onA = {}, onF = {};
      if (sel) {
        if (sel.type === 'f') { onF[sel.id] = 1; FUNCTIONS.filter(function (f) { return f.id === sel.id; })[0].a.forEach(function (a) { onA[a] = 1; }); }
        else { onA[sel.id] = 1; FUNCTIONS.forEach(function (f) { if (link(f, sel.id)) onF[f.id] = 1; }); }
      }
      box.classList.toggle('has-sel', !!sel);
      aBtns.forEach(function (b) { var id = b.getAttribute('data-a'); b.classList.toggle('is-on', !!onA[id]); b.setAttribute('aria-pressed', String(!!sel && sel.type === 'a' && sel.id === id)); });
      fBtns.forEach(function (b) { var id = b.getAttribute('data-f'); b.classList.toggle('is-on', !!onF[id]); b.setAttribute('aria-pressed', String(!!sel && sel.type === 'f' && sel.id === id)); });
      $$('.rb', svg).forEach(function (p) {
        var is = !!sel && (sel.type === 'f' ? p.getAttribute('data-f') === sel.id : p.getAttribute('data-a') === sel.id);
        p.classList.toggle('is-on', is);
      });
      if (!sel) { live.textContent = 'Tap a job on the right, or an active on the left, to see how they connect.'; return; }
      if (sel.type === 'f') { live.textContent = FUNCTIONS.filter(function (f) { return f.id === sel.id; })[0].line; return; }
      var fs = FUNCTIONS.filter(function (f) { return link(f, sel.id); });
      var names = fs.map(function (f) { return f.name.charAt(0).toLowerCase() + f.name.slice(1); });
      var list = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0];
      live.textContent = ACTIVE_NAMES[sel.id] + ': ' + list + '.' + (fs.some(function (f) { return f.dashed; }) ? ' The line is dashed: the research is promising, still debated, and there\'s no authorized wording.' : ' Each one is an EU-authorized wording for the nutrient.');
    }
    on(box, 'click', function (e) {
      var b = e.target.closest('.map-a, .map-f');
      if (!b) return;
      var s = b.classList.contains('map-a') ? { type: 'a', id: b.getAttribute('data-a') } : { type: 'f', id: b.getAttribute('data-f') };
      sel = sel && sel.type === s.type && sel.id === s.id ? null : s;
      paint();
    });
    seg.forEach(function (r) {
      on(r, 'change', function () {
        var fn = r.value === 'function' && r.checked;
        box.hidden = !fn; explorer.hidden = fn;
        if (fn) requestAnimationFrame(draw);
      });
    });
    if ('ResizeObserver' in window) new ResizeObserver(function () { if (drawn || !box.hidden) draw(); }).observe(board);
  })();

  /* ================================ Taste test (how sweet is sweet?) ================================ */
  // Tap a packet: a cube's weight of it tips onto the paper spoon, then sugar cubes drop in, in
  // stop-motion, until the pile would taste as sweet. The camera pulls back on its own to fit the pile
  // (the zoom is the payoff) and the reference cube, "sugar · 1×", stays in view as a tiny yardstick.
  // One canvas: up to ~900 single cubes, beyond that a cut-paper mountain. It only runs while something
  // moves and never offscreen. Reduced motion or Pause motion: the finished pile, no animation.
  (function taste() {
    var card = $('#scale');
    if (!card) return;
    var row = $('[data-packets]', card), stage = $('[data-taste-stage]', card), cv = stage && $('canvas', stage), capEl = $('[data-taste-cap]', card);
    var toggle = $('[data-taste-toggle]', card), tableBox = $('#sweet-table');
    var ctx = cv && cv.getContext && cv.getContext('2d');
    if (toggle && tableBox) {                                 // "See all the numbers": the table stays readable to screen readers either way
      toggle.hidden = false;
      tableBox.classList.add('is-folded');
      on(toggle, 'click', function () {
        var open = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(open));
        tableBox.classList.toggle('is-folded', !open);
        $('span', toggle).textContent = open ? 'Hide the numbers' : 'See all the numbers';
      });
    }
    if (!row || !ctx) return;
    row.hidden = false; stage.hidden = false; capEl.hidden = false;
    var btns = $$('.packet', row), src = $$('.scale__src .fn a');     // [FDA, EFSA, sugar-alcohol review]
    function fn(i) {
      var a = src[i];
      return a ? '<sup class="fn"><a href="' + a.getAttribute('href') + '" aria-label="' + (a.getAttribute('aria-label') || '') + '">' + a.textContent + '</a></sup>' : '';
    }
    var FAM = { sugar: '#FFFFFF', rare: '#FFC83D', alc: '#7FD3CC', plant: '#F6C18E', art: '#B88AA3' };
    // [low, high, family, name, type, caption, footnote, sugar cubes, times as sweet]
    var D = {
      sugar: [1, 1, 'sugar', 'Sugar', 'real sugar, what we use', 'The 1× every other sweetener is measured against: a cube of it tastes like a cube.', -1, '1 sugar cube', '1×'],
      allulose: [0.7, 0.7, 'rare', 'Allulose', 'rare sugar', 'Gram for gram, about 0.7× as sweet as sugar: a cube of it tastes like about 0.7 of a sugar cube.', 1, '≈ 0.7 of a sugar cube', 'about 0.7×'],
      erythritol: [0.6, 0.8, 'alc', 'Erythritol', 'sugar alcohol', 'Gram for gram, about 0.6–0.8× as sweet as sugar: a cube of it tastes like 0.6 to 0.8 of a sugar cube.', 2, '0.6–0.8 of a sugar cube', 'about 0.6–0.8×'],
      xylitol: [1, 1, 'alc', 'Xylitol', 'sugar alcohol', 'Gram for gram, about as sweet as sugar (about 1×): a cube of it tastes like about one sugar cube.', 2, '≈ 1 sugar cube', 'about 1×'],
      stevia: [200, 400, 'plant', 'Stevia', 'plant extract', 'Gram for gram, about 200–400× as sweet as sugar: a cube’s weight tastes like 200 to 400 sugar cubes.', 0, '200–400 sugar cubes', '200–400×'],
      aspartame: [200, 200, 'art', 'Aspartame', 'artificial', 'Gram for gram, about 200× as sweet as sugar: a cube’s weight tastes like about 200 sugar cubes.', 0, '≈ 200 sugar cubes', 'about 200×'],
      acek: [200, 200, 'art', 'Acesulfame K', 'artificial', 'Gram for gram, about 200× as sweet as sugar: a cube’s weight tastes like about 200 sugar cubes.', 0, '≈ 200 sugar cubes', 'about 200×'],
      saccharin: [200, 700, 'art', 'Saccharin', 'artificial', 'Gram for gram, about 200–700× as sweet as sugar: a cube’s weight tastes like 200 to 700 sugar cubes.', 0, '200–700 sugar cubes', '200–700×'],
      sucralose: [600, 600, 'art', 'Sucralose', 'artificial', 'Gram for gram, about 600× as sweet as sugar: a cube’s weight tastes like about 600 sugar cubes.', 0, '≈ 600 sugar cubes', 'about 600×'],
      neotame: [7000, 13000, 'art', 'Neotame', 'artificial', 'Gram for gram, about 7,000–13,000× as sweet as sugar: a cube’s weight tastes like 7,000 to 13,000 sugar cubes.', 0, '7,000–13,000 sugar cubes', '7,000–13,000×'],
      advantame: [20000, 20000, 'art', 'Advantame', 'artificial', 'Gram for gram, about 20,000× as sweet as sugar: a cube’s weight tastes like about 20,000 sugar cubes.', 0, '≈ 20,000 sugar cubes', 'about 20,000×']
    };
    var still = function () { return reduced() || motionOff(); };
    var X0 = 1.35, DX = 0.34, DY = 0.26;                       // the pile's left foot; one cube of depth steps this far right and up

    // ---- the pile: a true stepped pyramid of exactly n sugar cubes, every cube resting square on the cubes below ----
    // Layers are b×b, (b−2)×(b−2), … so each step is one cube in and one cube up (a heap's ~45°). It is built the
    // way a hand would build it, bottom layer first, back row first, left to right, which is also the painter's
    // order. Geometry is plain arithmetic, worked out once per count (on idle for every packet).
    var GEO = {};
    function pyr(n) {
      n = Math.max(1, Math.round(n));
      if (GEO[n]) return GEO[n];
      var sum = function (m) { var t = 0; for (; m > 0; m -= 2) t += m * m; return t; }, b = 1;
      while (sum(b) < n) b++;
      var L = [], left = n, at = 0;
      for (var k = 0, m = b; m > 0 && left > 0; k++, m -= 2) {
        var c = Math.min(left, m * m);
        L.push({ k: k, m: m, c: c, at: at, full: c === m * m, rows: Math.ceil(c / m) });
        left -= c; at += c;
      }
      var top = L[L.length - 1];
      return (GEO[n] = { n: n, b: b, L: L, top: topOf({ L: L }, n), sumX: X0 + top.k + top.m / 2 + (top.k + top.m / 2) * DX });
    }
    function topOf(g, r) {                                      // how high the first r cubes reach (projected units)
      var t = 0;
      g.L.forEach(function (l) { if (l.at < r) t = Math.max(t, l.k + 1 + (l.k + l.m) * DY); });
      return t;
    }
    // visit cubes [from, to) as (x from the foot, y, z); with cull, skip cubes the finished layers above and around hide
    function forCubes(g, from, to, cull, fn) {
      for (var li = 0; li < g.L.length; li++) {
        var l = g.L[li], a = Math.max(from, l.at), e = Math.min(to, l.at + l.c);
        if (a >= e) continue;
        var up = g.L[li + 1], m = l.m, fr = Math.floor(l.c / m), off = Math.floor((m - l.c % m) / 2);
        var hid = cull && up && up.full && up.at + up.c <= to && l.at + l.c <= to;
        for (var q = a - l.at; q < e - l.at; q++) {
          var row = Math.floor(q / m), i = q % m + (row === fr ? off : 0), j = m - 1 - row;
          if (hid && i >= 1 && i <= m - 2 && j >= 1 && j <= m - 2) continue;
          fn(l.k + i, l.k, l.k + j);
        }
      }
    }

    var W = 0, H = 0, gy = 0, dpr = 1, cam = { s: 60, x: -3 }, camT = { s: 60, x: -3 }, sMax = 90, moving = false;
    var S = { k: 'sugar', fill: 0, sachet: null, frac: null, ghost: null, tag: null, tagY: 0, lift: 0 };
    // the pile's cache: P.cv holds the settled cubes, P.fc the handful still dropping; both at P.sd device px a cube
    var P = { g: null, r: 0, fr: 0, sd: 0, ddx: 0, ddy: 0, cs: 1, pad: 4, Wc: 0, Hc: 0, cv: null, fc: null };
    var SPR = { sd: 0, cv: null, ox: 0, oy: 0 }, BG = null, quick = false;
    var frames = [], tick10 = stepper(10), hold = 0, raf = 0, last = 0, onScreen = false, started = false, flagBox = null;
    var ground = [];
    function colors() {
      var cs = getComputedStyle(card), g = function (n) { return cs.getPropertyValue(n).trim(); };
      var tint = g('--tint') || '#FFE4F1';
      return { acc: g('--accent'), ink: '#2B0718', ink2: '#7C4D66', tint: tint, sand: '#FFD9B3', shade: '#EADFE3', ai: g('--accent-ink'),
        side: mixc(tint, '#E2A9C4', 0.45), grain: 'rgba(122,27,77,.12)', edge: 'rgba(122,27,77,.2)', ghost: mixc(tint, '#FFFFFF', 0.5) };
    }
    function mixc(a, b, t) {                                    // mix two CSS colours (hex or rgb()) for the canvas
      var p = function (c) { var m = c.match(/\d+(\.\d+)?/g); if (c[0] === '#') { var n = parseInt(c.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; } return m ? m.slice(0, 3).map(Number) : [255, 228, 241]; };
      var A = p(a), B = p(b);
      return 'rgb(' + A.map(function (v, i) { return Math.round(v + (B[i] - v) * t); }).join(',') + ')';
    }
    var C = null;
    function canvas() { return doc.createElement('canvas'); }
    function size() {
      var r = stage.getBoundingClientRect();
      W = r.width; H = r.height;
      if (!W || !H) return false;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      gy = H - (W < 600 ? 26 : 34);
      sMax = W < 600 ? 52 : 88;
      ground = [];
      for (var x = -8, i = 0; x <= W + 8; x += 14, i++) ground.push([x, gy + Math.sin(i * 1.7) * 1.4 + ((i * 7919) % 5 - 2) * 0.5]);
      BG = null; P.sd = 0; SPR.sd = 0;
      return true;
    }
    // the backdrop (sky, two paper clouds, the sand) never moves: drawn once per size and theme
    function backdrop() {
      BG = BG || canvas();
      BG.width = cv.width; BG.height = cv.height;
      var c = BG.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = C.tint; c.fillRect(0, 0, W, H);
      cloud(c, W * 0.07, H * 0.17, W < 600 ? 44 : 70); cloud(c, W * 0.83, H * 0.36, W < 600 ? 32 : 50);
      c.beginPath(); c.moveTo(0, H); ground.forEach(function (p) { c.lineTo(p[0], p[1]); }); c.lineTo(W, H); c.closePath();
      c.fillStyle = C.sand; c.fill();
    }
    function cloud(c, x, y, w) {
      var B = [[0, 0.1, 0.34], [0.3, -0.12, 0.4], [0.62, 0.08, 0.3]];
      c.fillStyle = 'rgba(74,13,46,.08)';
      B.forEach(function (b) { c.beginPath(); c.ellipse(x + b[0] * w + 1.5, y + b[1] * w + 2.5, b[2] * w, b[2] * w * 0.7, 0, 0, TAU); c.fill(); });
      c.fillStyle = '#fff';
      B.forEach(function (b) { c.beginPath(); c.ellipse(x + b[0] * w, y + b[1] * w, b[2] * w, b[2] * w * 0.7, 0, 0, TAU); c.fill(); });
      c.fillRect(x - 0.2 * w, y + 0.05 * w, 1.05 * w, 0.24 * w);
    }
    // the camera frames the spoon, the reference cube and the pile; it moves smoothly and rests on whole device pixels
    function target(snap) {
      var xmax = X0 + 1.1 + DX, ymax = 1.3 + DY;                     // always room for the first cube (and the flag)
      if (P.g && P.fr) { xmax = Math.max(xmax, X0 + P.g.b * (1 + DX)); ymax = Math.max(ymax, topOf(P.g, P.fr)); }
      if (S.ghost) { xmax = Math.max(xmax, X0 + S.ghost.b * (1 + DX)); ymax = Math.max(ymax, S.ghost.top); }
      // room on the left for the spoon and for the "us" pennant, which flies left of the reference cube
      var fw = flagW(), padTop = W < 600 ? 78 : 96, s = Math.min((W - 40) / (xmax + 7.4), (W - 60 - fw) / (xmax + 0.5), (gy - padTop) / ymax, sMax);
      if (s * dpr >= 2) s = Math.floor(s * dpr) / dpr;
      var xmin = Math.min(-6.9, -(fw + 20) / s);
      camT.s = s; camT.x = (xmin + xmax + 0.5) / 2;
      if (snap) { cam.s = camT.s; cam.x = camT.x; }
    }
    var X = function (x) { return W / 2 + (x - cam.x) * cam.s; }, Y = function (y) { return gy - y * cam.s; };

    // one sugar cube, seen a little from above and to the left: front face's bottom-left corner at (x, y), s a side
    function cubeArt(c, x, y, s, dx, dy, lw) {
      c.fillStyle = '#fff'; c.fillRect(x, y - s, s, s);
      c.fillStyle = '#FFF6EE';
      c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + dx, y - s - dy); c.lineTo(x + s + dx, y - s - dy); c.lineTo(x + s, y - s); c.closePath(); c.fill();
      c.fillStyle = C.side;
      c.beginPath(); c.moveTo(x + s, y); c.lineTo(x + s, y - s); c.lineTo(x + s + dx, y - s - dy); c.lineTo(x + s + dx, y - dy); c.closePath(); c.fill();
      if (lw) {                                                   // the pressed edges, so a pile still reads as cubes
        c.strokeStyle = C.edge; c.lineWidth = lw;
        var h = lw / 2;
        c.beginPath(); c.rect(x + h, y - s + h, s - lw, s - lw);
        c.moveTo(x + h, y - s + h); c.lineTo(x + dx, y - s - dy + h); c.lineTo(x + s + dx - h, y - s - dy + h); c.lineTo(x + s + dx - h, y - dy);
        c.moveTo(x + s - h, y - s + h); c.lineTo(x + s + dx - h, y - s - dy + h);
        c.stroke();
      }
      if (s > 24) {                                               // the grain of pressed sugar
        c.fillStyle = C.grain;
        for (var i = 0; i < 7; i++) c.fillRect(x + s * (0.1 + 0.8 * ((i * 37) % 11) / 11), y - s * (0.1 + 0.8 * ((i * 53) % 13) / 13), s * 0.05, s * 0.05);
      }
    }
    function sprite(sd) {                                       // one cube, rendered once per size, stamped for every cube
      if (SPR.sd === sd && SPR.cv) return;
      var ddx = Math.round(DX * sd), ddy = Math.round(DY * sd), el = SPR.cv || canvas();
      el.width = sd + ddx + 2; el.height = sd + ddy + 2;
      var c = el.getContext('2d');
      c.clearRect(0, 0, el.width, el.height);
      cubeArt(c, 1, sd + ddy + 1, sd, ddx, ddy, sd >= 7 ? Math.max(1, Math.round(sd * 0.05)) : 0);
      SPR = { sd: sd, cv: el, ox: 1, oy: sd + ddy + 1 };
    }
    function sdFor(s) {                                         // device px a cube for scale s, capped at ~3 MP a cache
      var g = P.g, cap = Math.floor(Math.sqrt(3e6 / ((g.b * (1 + DX) + 1) * (g.top + 1))));
      return clamp(Math.round(s * dpr), 2, Math.max(2, cap));
    }
    function stampTo(c) {
      return function (x, y, z) { c.drawImage(SPR.cv, P.pad + x * P.sd + z * P.ddx - SPR.ox, P.Hc - P.pad - y * P.sd - z * P.ddy - SPR.oy); };
    }
    function setup(sd) {                                        // (re)size the caches for sd device px a cube, then fill them
      var g = P.g;
      P.sd = sd; P.ddx = Math.round(DX * sd); P.ddy = Math.round(DY * sd); P.cs = sd / dpr;
      var top = 0;
      g.L.forEach(function (l) { top = Math.max(top, (l.k + 1) * sd + (l.k + l.m) * P.ddy); });
      P.Wc = Math.ceil(P.pad * 2 + g.b * (sd + P.ddx) + 2); P.Hc = Math.ceil(P.pad * 2 + top + 2);
      P.cv = P.cv || canvas(); P.fc = P.fc || canvas();
      P.cv.width = P.Wc; P.cv.height = P.Hc; P.fc.width = P.Wc; P.fc.height = P.Hc;
      sprite(sd);
      forCubes(g, 0, P.r, true, stampTo(P.cv.getContext('2d')));
      if (P.fr > P.r) forCubes(g, P.r, P.fr, false, stampTo(P.fc.getContext('2d')));
    }
    function grow(r, fr) {                                      // the next stop-motion step: settle the last handful, drop the next
      var g = P.g, r0 = P.r, f0 = P.fr;
      P.r = r; P.fr = fr;
      if (quick || !P.sd || r < r0) { P.sd = 0; return; }           // drawn fresh at the next paint
      var c = P.cv.getContext('2d'), f = P.fc.getContext('2d');
      if (r > r0) {
        if (f0 === r && f0 > r0) c.drawImage(P.fc, 0, 0);           // the dropped handful lands: one copy
        else forCubes(g, r0, r, false, stampTo(c));
      }
      f.clearRect(0, 0, P.Wc, P.Hc);
      if (fr > r) forCubes(g, r, fr, false, stampTo(f));
    }
    function ghost(gh) {                                        // a range: the far end's pyramid, traced in pencil behind
      var ex = P.sd ? P.ddx / P.sd : DX, ey = P.sd ? P.ddy / P.sd : DY;
      var pt = function (x, y, z) { return [X(x + z * ex), Y(y + z * ey)]; };
      ctx.save();
      ctx.lineWidth = 1.3; ctx.strokeStyle = C.ai; ctx.setLineDash([5, 4]); ctx.lineJoin = 'round';
      gh.L.forEach(function (l) {
        var x0 = X0 + l.k, x1 = x0 + l.m, y0 = l.k, y1 = y0 + 1, z1 = l.k + l.m, z0 = z1 - l.rows;
        var p = [pt(x0, y0, z0), pt(x0, y1, z0), pt(x0, y1, z1), pt(x1, y1, z1), pt(x1, y0, z1), pt(x1, y0, z0)], q = pt(x1, y1, z0);
        ctx.beginPath(); p.forEach(function (v, i) { if (i) ctx.lineTo(v[0], v[1]); else ctx.moveTo(v[0], v[1]); }); ctx.closePath();
        ctx.fillStyle = C.ghost; ctx.fill(); ctx.globalAlpha = 0.75; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p[1][0], p[1][1]); ctx.lineTo(q[0], q[1]); ctx.lineTo(p[5][0], p[5][1]); ctx.moveTo(q[0], q[1]); ctx.lineTo(p[3][0], p[3][1]); ctx.stroke();
        ctx.globalAlpha = 1;
      });
      ctx.restore();
      if (S.tag) {                                               // and a pencil note on its far slope
        var l = gh.L[Math.floor(gh.L.length / 2)], e = pt(X0 + l.k + l.m, l.k + 1, l.k + l.m);
        ctx.save();
        ctx.font = '700 ' + (W < 600 ? 17 : 21) + 'px Caveat, "Segoe Print", cursive';
        var txt = 'up to ' + gh.n.toLocaleString('en-US'), w = ctx.measureText(txt).width;
        ctx.translate(Math.min(W - w - 8, e[0] + 10), Math.max(18, e[1] + 4)); ctx.rotate(-5 * RAD);
        ctx.fillStyle = C.ai; ctx.textBaseline = 'middle'; ctx.fillText(txt, 0, 0);
        ctx.restore();
      }
    }
    function spoon() {                                          // a paper teaspoon lying on the sand, bowl up
      var s = cam.s, bx = X(-2.3), by = Y(0.5), rx = 1.05 * s, ry = 0.46 * s;
      ctx.save();
      ctx.beginPath();                                            // the handle: a slim strip rising to the bowl
      ctx.moveTo(X(-6.8), Y(0.05)); ctx.quadraticCurveTo(X(-5), Y(0.12), X(-3.25), Y(0.44));
      ctx.lineTo(X(-3.2), Y(0.6)); ctx.quadraticCurveTo(X(-5), Y(0.3), X(-6.8), Y(0.26)); ctx.closePath();
      ctx.fillStyle = 'rgba(74,13,46,.16)'; ctx.save(); ctx.translate(1, 1.6); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI); ctx.closePath();   // the bowl's underside
      ctx.fillStyle = 'rgba(74,13,46,.16)'; ctx.save(); ctx.translate(1, 1.6); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(bx, by, rx, ry * 0.28, 0, 0, TAU); ctx.fillStyle = C.shade; ctx.fill();   // its open mouth
      if (S.fill > 0) {                                          // the pinch: a little heap of crystals
        var fam = D[S.k][2], col = FAM[fam], n = Math.round(4 + 22 * S.fill), q = Math.max(2, s * 0.15);
        for (var i = 0; i < n; i++) {
          var u = ((i * 0.618034) % 1) * 2 - 1, row = Math.floor(i / 7), gx = bx + u * rx * (0.78 - row * 0.16), gyy = by - ry * 0.1 - row * q * 0.82 - (1 - Math.abs(u)) * q * 0.5;
          ctx.save(); ctx.translate(gx, gyy); ctx.rotate((i * 47 % 90) * RAD);
          ctx.fillStyle = 'rgba(74,13,46,.14)'; ctx.fillRect(-q / 2 + 0.6, -q / 2 + 0.9, q, q);
          ctx.fillStyle = fam === 'sugar' ? (i % 3 ? '#fff' : C.side) : (i % 3 ? col : '#fff');
          ctx.fillRect(-q / 2, -q / 2, q, q);
          ctx.restore();
        }
      }
      ctx.restore();
    }
    function sachet() {                                         // the packet tipping its pinch over the spoon
      var p = S.sachet; if (!p) return;
      var s = Math.max(cam.s, 22), cx = X(-2.1), cy = Y(0.52) - s * 2.3, fam = D[S.k][2];
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(p.tilt * RAD);
      ctx.fillStyle = 'rgba(74,13,46,.18)'; ctx.fillRect(-s * 0.42 + 1.5, -s * 0.62 + 2, s * 0.84, s * 1.24);
      ctx.fillStyle = '#fff'; ctx.fillRect(-s * 0.42, -s * 0.62, s * 0.84, s * 1.24);
      ctx.fillStyle = fam === 'sugar' ? C.acc : FAM[fam]; ctx.fillRect(-s * 0.42, -s * 0.18, s * 0.84, s * 0.36);
      ctx.restore();
      ctx.fillStyle = fam === 'sugar' ? C.tint : FAM[fam];
      (p.grains || []).forEach(function (g) { ctx.fillRect(cx + g[0] * s, cy + g[1] * s, Math.max(2, s * 0.08), Math.max(2, s * 0.08)); });
    }
    function spaced(px) { if ('letterSpacing' in ctx) ctx.letterSpacing = px; }
    function flagText() { return W < 600 ? 'US · 1×' : 'US · SUGAR 1×'; }
    function flagW() {                                          // the pennant's width, so the camera leaves it room
      ctx.save(); ctx.font = '800 11px Archivo, Arial, sans-serif'; spaced('0.8px');
      var w = ctx.measureText(flagText()).width + 22; spaced('0px'); ctx.restore();
      return w;
    }
    function flag(x, y, text) {                                 // "us": a brand-pink paper pennant on the reference cube
      var bx = X(x), by = Y(y);
      ctx.save();
      ctx.fillStyle = C.ink2; ctx.fillRect(bx - 0.75, by - 34, 1.5, 34);
      ctx.font = '800 11px Archivo, Arial, sans-serif'; spaced('0.8px');
      var w = ctx.measureText(text).width + 22;
      flagBox = [bx - w - 2, by - 36, bx + 2, by - 14];          // it flies left, over the spoon, clear of the pile
      ctx.beginPath(); ctx.moveTo(bx - 0.75, by - 34); ctx.lineTo(bx - w, by - 34); ctx.lineTo(bx - w + 7, by - 25); ctx.lineTo(bx - w, by - 16); ctx.lineTo(bx - 0.75, by - 16); ctx.closePath();
      ctx.fillStyle = 'rgba(74,13,46,.18)'; ctx.save(); ctx.translate(1, 1.5); ctx.fill(); ctx.restore();
      ctx.fillStyle = C.acc; ctx.fill();
      ctx.fillStyle = C.ink; ctx.textBaseline = 'middle'; ctx.fillText(text, bx - w + 13, by - 24.5);
      spaced('0px');
      ctx.restore();
    }
    function tag(x, y, dy) {                                     // the pile's paper tag: who, how sweet, how many cubes
      var d = D[S.k], us = d[2] === 'sugar', small = W < 600;
      var l1 = (us ? 'US · ' : 'OTHERS · ') + d[3].toUpperCase(), l2 = d[8] + (us ? ', the yardstick' : ' as sweet'), l3 = '1 cube of it ' + (d[7].charAt(0) === '≈' ? d[7] : '= ' + d[7]);
      var f1 = '800 10.5px Archivo, Arial, sans-serif', f2 = '800 ' + (small ? 14 : 16) + 'px Archivo, Arial, sans-serif', f3 = '600 ' + (small ? 11.5 : 12.5) + 'px Archivo, Arial, sans-serif';
      ctx.save();
      ctx.font = f1; spaced('0.9px'); var w1 = ctx.measureText(l1).width; spaced('0px');
      ctx.font = f2; var w2 = ctx.measureText(l2).width;
      ctx.font = f3; var w3 = ctx.measureText(l3).width;
      var w = Math.max(w1, w2, w3) + 30, h = small ? 54 : 58, bx = Math.min(W - w - 8, Math.max(8, X(x) - w / 2)), by = Math.max(8, Y(y) - h - 14);
      var fb = flagBox;                                          // never over the "us" flag: lift it clear
      if (fb && bx < fb[2] && bx + w > fb[0] && by < fb[3] && by + h > fb[1]) by = Math.max(8, fb[1] - h - 8);
      by += dy || 0;
      ctx.fillStyle = 'rgba(74,13,46,.2)'; ctx.fillRect(bx + 1.5, by + 2.5, w, h);
      ctx.fillStyle = '#fff'; ctx.fillRect(bx, by, w, h);
      ctx.fillStyle = us ? C.acc : FAM[d[2]]; ctx.fillRect(bx, by, 7, h);       // the colour of its packet
      ctx.textBaseline = 'middle';
      ctx.font = f1; spaced('0.9px'); ctx.fillStyle = us ? C.ai : C.ink2; ctx.fillText(l1, bx + 17, by + (small ? 13 : 14)); spaced('0px');
      ctx.font = f2; ctx.fillStyle = C.ink; ctx.fillText(l2, bx + 17, by + (small ? 29 : 31));
      ctx.font = f3; ctx.fillStyle = C.ink2; ctx.fillText(l3, bx + 17, by + (small ? 44 : 47));
      ctx.restore();
    }
    function outline(pts) {
      ctx.beginPath();
      pts.forEach(function (p, i) { if (i) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); });
      ctx.closePath();
      ctx.strokeStyle = C.ai; ctx.lineWidth = 1.6; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
    }
    function cubeCut(x, h, lift) {                               // a cube sliced down to height h (scissor top)
      var s = cam.s, l = X(x - 0.5), r = X(x + 0.5), b = Y(lift || 0), t = Y((lift || 0) + h), dx = DX * s, dy = DY * s;
      ctx.beginPath(); ctx.moveTo(l, b); ctx.lineTo(l, t + 1); ctx.lineTo(l + (r - l) * 0.3, t - 1.2); ctx.lineTo(l + (r - l) * 0.62, t + 1); ctx.lineTo(r, t - 0.6); ctx.lineTo(r, b); ctx.closePath();
      ctx.fillStyle = 'rgba(74,13,46,.16)'; ctx.save(); ctx.translate(1, 1.6); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.fillStyle = C.side;
      ctx.beginPath(); ctx.moveTo(r, b); ctx.lineTo(r, t); ctx.lineTo(r + dx, t - dy); ctx.lineTo(r + dx, b - dy); ctx.closePath(); ctx.fill();
    }
    function paint() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!BG) backdrop();
      ctx.drawImage(BG, 0, 0, W, H);
      if (cam.s < 6) {                                           // pulled right back: you're on the beach, under the paper sun
        var al = clamp((6 - cam.s) / 3, 0, 1), sr = W < 600 ? 18 : 24;
        ctx.globalAlpha = al; ctx.fillStyle = C.acc; ctx.beginPath(); ctx.arc(W - sr * 2.2, sr * 2, sr, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.arc(W - sr * 2.2, sr * 2, sr * 0.8, Math.PI * 0.95, Math.PI * 1.6); ctx.arc(W - sr * 2.2, sr * 2, sr * 0.62, Math.PI * 1.6, Math.PI * 0.95, true); ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (P.g && P.fr) {                                         // the pile: two cached bitmaps, placed by the camera
        var want = sdFor(cam.s);
        if (!P.sd || (want !== P.sd && (!moving || Math.abs(Math.log(want / P.sd)) > 0.22))) setup(want);
      }
      if (S.ghost) ghost(S.ghost);
      if (P.g && P.fr) {
        var f = cam.s / P.cs, x0 = X(X0) - P.pad / dpr * f, y0 = Y(0) - (P.Hc - P.pad) / dpr * f, w = P.Wc / dpr * f, h = P.Hc / dpr * f;
        if (Math.abs(f - 1) < 1e-3) { x0 = Math.round(x0 * dpr) / dpr; y0 = Math.round(y0 * dpr) / dpr; }
        if (P.r) ctx.drawImage(P.cv, x0, y0, w, h);
        if (P.fr > P.r) ctx.drawImage(P.fc, x0, y0 - Math.round(S.lift * cam.s * dpr) / dpr, w, h);
      }
      if (S.frac) {                                              // less than a cube: a cube cut down, the rest traced
        var fr = S.frac, xc = X0 + 0.55;
        outline([[xc - 0.5, 0], [xc - 0.5, 1], [xc - 0.5 + DX, 1 + DY], [xc + 0.5 + DX, 1 + DY], [xc + 0.5 + DX, DY], [xc + 0.5, 0]]);
        if (fr.hi > fr.lo) { ctx.globalAlpha = 0.45; cubeCut(xc, fr.hi, fr.y); ctx.globalAlpha = 1; }
        cubeCut(xc, fr.lo, fr.y);
      }
      spoon();
      var s = cam.s;                                             // the reference cube: us, sugar, 1×
      cubeArt(ctx, X(-0.5), Y(0), s, DX * s, DY * s, s >= 4 ? Math.max(0.6, s * 0.03) : 0);
      flag(0, 1 + DY, flagText());
      sachet();
      if (S.tag) tag(S.tagX, S.tagTop, S.tagY);
    }

    // ---- the stop-motion frames for one packet ----
    function plan(k) {
      var d = D[k], lo = d[0], hi = d[1], F = [];
      // 1 · clear the last pile in two hand moves
      if (P.g || S.frac) F.push({ clear: 0.5 });
      F.push({ clear: 1 });
      // 2 · the packet tips its pinch onto the spoon
      [[0, 0], [-26, 0], [-58, 0.35], [-64, 0.75], [-60, 1]].forEach(function (t, i) {
        var g = i >= 2 ? [[0.1, 0.7], [0.3, 1.0], [-0.05, 1.25], [0.22, 1.5]].slice(0, i + 1) : [];
        F.push({ sachet: { tilt: t[0], grains: g }, fill: t[1] });
      });
      F.push({ sachet: null, fill: 1 });
      // 3 · the sugar it takes to taste as sweet
      if (lo < 1) {
        [3.2, 1.3, 0, 0.16, 0].forEach(function (y) { F.push({ frac: { lo: lo, hi: hi, y: y } }); });
      } else {
        var g = pyr(lo), gh = hi > lo ? pyr(hi) : null, n = g.n;
        if (n === 1) {
          [2.8, 1.1, 0, 0.14].forEach(function (y) { F.push({ g: g, r: 0, fr: 1, lift: y }); });
        } else {
          var steps = Math.round(clamp(6 + 3.2 * Math.log10(n), 8, 16)), prev = 0;
          for (var i = 1; i <= steps; i++) {
            var c = Math.max(prev + 1, Math.min(n, Math.round(n * Math.pow(i / steps, 1.25))));
            F.push({ g: g, r: prev, fr: c, lift: 1.2, ghost: i > steps * 0.6 ? gh : null });
            prev = c;
          }
        }
        F.push({ g: g, r: n, fr: n, lift: 0, ghost: gh });
      }
      // 4 · the tag is pinned on, a little drop, then still
      F.push({ tag: true, tagY: -14 }); F.push({ tag: true, tagY: 3 }); F.push({ tag: true, tagY: 0 });
      return F;
    }
    function apply(f) {
      if (f.clear) {
        if (f.clear < 1) {
          if (P.g) grow(Math.floor(P.r * 0.45), Math.floor(P.r * 0.45));
          if (S.frac) S.frac = { lo: S.frac.lo * 0.5, hi: S.frac.lo * 0.5, y: 0 };
          S.fill *= 0.5;
        } else { P.g = null; P.r = P.fr = 0; P.sd = 0; S.frac = null; S.fill = 0; }
        S.ghost = null; S.tag = null; S.sachet = null;
      }
      if (f.g && P.g !== f.g) { P.g = f.g; P.r = P.fr = 0; P.sd = 0; }
      if ('r' in f) grow(f.r, f.fr);
      if ('lift' in f) S.lift = f.lift;
      if ('ghost' in f) S.ghost = f.ghost;
      if ('frac' in f) S.frac = f.frac;
      if ('fill' in f) S.fill = f.fill;
      if ('sachet' in f) S.sachet = f.sachet;
      if ('tag' in f) S.tag = f.tag;
      if ('tagY' in f) S.tagY = f.tagY;
      if (S.tag) {                                               // pinned above the summit
        if (S.frac) { S.tagX = X0 + 0.55; S.tagTop = 1 + DY; }
        else if (P.g) { S.tagX = P.g.sumX; S.tagTop = P.g.top; }
      }
      target(false);
    }
    function settle(k) {                                         // reduced motion: straight to the finished pile
      var F = plan(k); frames = [];
      quick = true; F.forEach(apply); quick = false;
      S.sachet = null; S.tagY = 0; S.lift = 0;
      target(true); moving = false; paint();
    }
    function loop(now) {
      raf = 0;
      if (still()) { if (frames.length) settle(S.k); last = 0; return; }   // Pause motion mid-pile: jump to the finished pile
      var dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
      last = now;
      var dirty = false;
      if (frames.length && tick10(dt)) {
        if (hold > 0) hold--;
        else { apply(frames.shift()); hold = Math.random() < 0.2 ? 1 : 0; dirty = true; }   // now and then a frame is held twice
      }
      var k = 1 - Math.exp(-dt * 3.2), ls = Math.log(cam.s), lt = Math.log(camT.s), was = moving;
      cam.s = Math.exp(ls + (lt - ls) * k); cam.x += (camT.x - cam.x) * k;
      moving = Math.abs(lt - ls) > 0.002 || Math.abs(camT.x - cam.x) * cam.s > 0.3;
      if (!moving) { cam.s = camT.s; cam.x = camT.x; }
      if (dirty || moving || was) paint();                          // between stop-motion frames a still camera costs nothing
      if ((frames.length || moving) && onScreen) raf = requestAnimationFrame(loop); else last = 0;
    }
    function kick() { if (!raf && onScreen) { last = 0; raf = requestAnimationFrame(loop); } }
    function caption(k) {
      var d = D[k], us = d[2] === 'sugar';
      capEl.innerHTML = '<b>' + (us ? 'Us · ' : 'Others · ') + d[3] + '</b> · ' + d[4] + '. ' + d[5] + (d[6] >= 0 ? fn(d[6]) : '');
    }
    function select(k, focus) {
      if (!D[k]) return;
      S.k = k;
      btns.forEach(function (b) {
        var is = b.getAttribute('data-k') === k;
        b.setAttribute('aria-pressed', String(is)); b.tabIndex = is ? 0 : -1;
        if (is) {
          if (focus) b.focus();
          if (!still()) { b.classList.remove('hop'); void b.offsetWidth; b.classList.add('hop'); }
          var rr = row.getBoundingClientRect(), br = b.getBoundingClientRect();
          if (br.left < rr.left || br.right > rr.right) row.scrollTo({ left: row.scrollLeft + br.left - rr.left - (rr.width - br.width) / 2, behavior: still() ? 'auto' : 'smooth' });
        }
      });
      caption(k);
      if (!W && !size()) return;
      C = colors();
      if (still()) { settle(k); return; }
      frames = plan(k); hold = 0;
      kick();
    }
    btns.forEach(function (b, i) {
      on(b, 'click', function () { select(b.getAttribute('data-k'), false); });
      on(b, 'keydown', function (e) {
        var n = btns.length, j = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + n) % n;
        else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = n - 1;
        if (j < 0) return;
        e.preventDefault();
        select(btns[j].getAttribute('data-k'), true);
      });
    });
    function refit() {
      if (!size()) return;
      C = colors();
      if (!started) return;
      if (still() || !frames.length) { if (!frames.length) { target(true); paint(); } else settle(S.k); }
      else { target(true); paint(); }
    }
    if ('ResizeObserver' in window) new ResizeObserver(refit).observe(stage); else on(window, 'resize', refit);
    listeners.push(function () { setTimeout(function () { C = colors(); BG = null; SPR.sd = 0; P.sd = 0; if (started && !raf) paint(); }, 760); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { if (started && !raf) paint(); });
    // work out every packet's pyramid while the page is idle, so a tap never waits on arithmetic
    (window.requestIdleCallback || function (fn2) { return setTimeout(fn2, 400); })(function () {
      Object.keys(D).forEach(function (k) { if (D[k][0] >= 1) { pyr(D[k][0]); pyr(D[k][1]); } });
    });
    function first() {
      started = true;
      if (!size()) return;
      C = C || colors();
      if (still()) { settle(S.k); return; }
      target(true); cam.s = camT.s * 1.25;                        // a small pull-back on arrival
      frames = plan(S.k); kick();
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        onScreen = es[0].isIntersecting;
        if (onScreen && !started) first(); else if (onScreen) kick();
      }, { rootMargin: '0px 0px -12% 0px' }).observe(stage);
    } else { onScreen = true; first(); }
  })();

  /* ================================ Sieve ================================ */
  (function sieve() {
    var card = $('#sieve');
    if (!card) return;
    var scene = $('[data-sieve-scene]', card), btn = $('[data-sift]', card), slip = $('[data-sift-slip]', card), text = $('[data-sift-text]', card);
    var tags = $$('.stag', card), fall = $('.sieve__fall', card), art = $('.sieve__art', card), bowl = $('.sieve__bowl', card);
    var notes = $$('[data-sift-note]', card).map(function (n) { return n.innerHTML; });
    scene.hidden = false; btn.hidden = false; slip.hidden = false;
    var crystals = [], N = 10, sifted = false;
    for (var i = 0; i < N; i++) {
      var c = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      c.setAttribute('viewBox', '0 0 24 24');
      c.innerHTML = '<use href="#sh-crystal" width="24" height="24"/>';
      var fx = 41 + (i % 5) * 4.6 + (i > 4 ? 2.3 : 0), fy = i > 4 ? 84.5 : 87.5;
      c.style.left = 'calc(' + fx + '% - 8px)';
      c.style.top = 'calc(' + fy + '% - 8px)';
      c.style.transform = 'rotate(' + ((i * 37) % 90) + 'deg)';
      fall.appendChild(c); crystals.push(c);
    }
    function show(i) {
      tags.forEach(function (t, j) { t.setAttribute('aria-pressed', String(i === j)); });
      text.innerHTML = '<b>' + (i < 5 ? tags[i].textContent : 'Real sugar') + '.</b> ' + notes[i];
    }
    tags.forEach(function (t, i) { t.setAttribute('aria-pressed', 'false'); on(t, 'click', function () { show(i); }); });
    function settle() {
      var dy = dropBy();
      tags.forEach(function (t, i) { t.style.translate = '0 ' + dy + 'px'; });
      fall.classList.add('is-done');
    }
    function dropBy() {
      var b = bowl.getBoundingClientRect(), rim = b.top + b.height * (118 / 260);
      var bottom = Math.max.apply(null, tags.map(function (t) { return t.getBoundingClientRect().bottom - (parseFloat(t.style.translate.split(' ')[1]) || 0); }));
      return Math.max(0, Math.round(rim - bottom + 10));
    }
    function sift() {
      if (reduced() || !Element.prototype.animate) { settle(); sifted = true; done(); return; }
      tags.forEach(function (t) { t.style.translate = ''; });
      fall.classList.remove('is-done');
      var dy = dropBy(), h = art.getBoundingClientRect().height;
      tags.forEach(function (t, i) {
        var a = t.animate([{ translate: '0 0' }, { translate: '0 ' + (dy + 8) + 'px', offset: 0.72 }, { translate: '0 ' + dy + 'px' }],
          { duration: 620, delay: i * 70, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' });
        a.onfinish = function () { t.style.translate = '0 ' + dy + 'px'; a.cancel(); };
      });
      crystals.forEach(function (c, i) {
        c.style.opacity = '1';
        var from = -(0.27 + (i % 3) * 0.03) * h;
        var a = c.animate([{ translate: '0 ' + from + 'px', opacity: 0 }, { opacity: 1, offset: 0.2 }, { translate: '0 0', opacity: 1 }],
          { duration: 640, delay: 420 + i * 55, easing: 'cubic-bezier(.55,0,.85,.4)', fill: 'backwards' });
        a.onfinish = function () { c.style.opacity = ''; };
      });
      setTimeout(function () { fall.classList.add('is-done'); done(); }, 420 + N * 55 + 660);
      sifted = true;
    }
    function done() { $('span', btn).textContent = 'Sift again'; show(5); }
    on(btn, 'click', sift);
    on(window, 'resize', function () { if (sifted) settle(); });
  })();

  /* ================================ Sticks (facts from a bucket) ================================ */
  // Pull one: a pop rises out of the bucket in held frames until its whole stick clears the rim, then a
  // paper flag unrolls on the stick (three drawings). The pop pulled before drops back in.
  (function sticks() {
    var list = $$('[data-facts] li'), ctl = $('.sticks__ctl'), slip = $('[data-fact-slip]');
    if (!list.length || !ctl) return;
    ctl.hidden = false; slip.hidden = false;
    var btn = $('[data-pull]'), label = $('[data-pull-label]'), count = $('[data-pull-count]');
    var txt = $('[data-fact-text]'), pops = $$('.bpop');
    var order = [], k = 0, lastPop = -1;
    function shuffle() {
      order = list.map(function (_, i) { return i; });
      for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; }
      k = 0;
    }
    shuffle();
    function set(el, u, jr, flag) {
      el.style.setProperty('--u', u.toFixed(3));
      el.style.setProperty('--jr', jr.toFixed(2) + 'deg');
      if (flag) draw($('.bflag', el), flag);
    }
    function move(el, up) {
      var id = el.__seq = (el.__seq || 0) + 1;
      el.classList.toggle('is-up', up);
      if (reduced() || motionOff()) { set(el, up ? 1 : 0, 0, up ? 'flag-3' : 'flag-1'); return; }
      var frames = up ? [[0.22], [0.5], [0.8], [1.06], [0.97], [1, 'flag-1'], [1, 'flag-2'], [1, 'flag-3']] : [[1, 'flag-1'], [0.62], [0.26], [0.04], [0]];
      (function next(i) {
        if (el.__seq !== id || i >= frames.length) { if (el.__seq === id) set(el, up ? 1 : 0, 0); return; }
        var f = frames[i];
        set(el, f[0], i < frames.length - 1 ? boil(1.6) : 0, f[1]);
        setTimeout(function () { next(i + 1); }, 95 + Math.random() * 30);   // ~10 fps, a little uneven
      })(0);
    }
    function showSlip() {
      if (!reduced()) { slip.classList.remove('unroll'); void slip.offsetWidth; slip.classList.add('unroll'); }
      if (window.innerWidth < 768) {                         // on a phone, bring the fact into view next to the button
        var r = slip.getBoundingClientRect();
        if (r.bottom > window.innerHeight - 90 || r.top < 70) slip.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
      }
    }
    STICKS.show = function (f) {                    // the oyster opens on the oysters-and-zinc fact
      txt.innerHTML = list[f].innerHTML;
      showSlip();
    };
    on(btn, 'click', function () {
      if (k >= order.length) shuffle();
      var f = order[k++];
      var p = (lastPop + 1 + Math.floor(Math.random() * (pops.length - 1))) % pops.length;
      if (lastPop > -1) move(pops[lastPop], false);
      move(pops[p], true);
      lastPop = p;
      txt.innerHTML = list[f].innerHTML;
      count.textContent = k + ' of ' + order.length;
      label.textContent = 'Another one';
      showSlip();
    });
  })();

  /* ================================ Moments (pop o'clock) ================================ */
  (function moments() {
    var radios = $$('input[name="moment"]'), use = $('[data-moment-art]'), line = $('[data-moment-line]');
    if (!radios.length) return;
    var box = use.closest('.moment__art');
    function set(v, anim) {
      if (!MOMENTS[v]) return;
      use.setAttribute('href', '#vg-' + v);
      line.textContent = MOMENTS[v];
      if (anim && !reduced()) { box.classList.remove('swap'); void box.offsetWidth; box.classList.add('swap'); }
    }
    var saved = store('papersun-moment');
    radios.forEach(function (r) {
      if (saved && r.value === saved) r.checked = true;
      on(r, 'change', function () { if (r.checked) { set(r.value, true); store('papersun-moment', r.value); } });
    });
    var c = radios.filter(function (r) { return r.checked; })[0];
    if (c) set(c.value, false);
  })();

  /* ================================ Planner (calendar + bag maths) ================================ */
  var SHOP = {};
  (function planner() {
    var g = $('.cal__dots'), radios = $$('input[name="weeks"]');
    if (!g) return;
    var html = '';
    for (var i = 0; i < 28; i++) {
      html += '<use href="#sh-dot" x="' + ((i % 7) * 42) + '" y="' + (Math.floor(i / 7) * 42) + '" width="32" height="32"/>';
    }
    g.innerHTML = html;
    var dots = $$('use', g), readout = $('[data-cal-readout]'), bags = $('[data-cal-bags]'), addN = $('[data-addbags-n]'), add = $('[data-addbags]'), title = $('[data-cal-title]');
    var prev = 0, nBags = 3;
    function set(w, first) {
      var d = WEEKS[w];
      if (!d) return;
      var days = d[0], b = d[1], spare = d[2];
      nBags = b;
      dots.forEach(function (u, i) {
        var lit = i < days;
        u.style.setProperty('--d', first || reduced() ? '0ms' : (Math.max(0, i - (lit ? prev : days)) * 25) + 'ms');
        u.classList.toggle('on', lit);
      });
      prev = days;
      readout.innerHTML = '<b>' + days + ' pops = ' + b + ' bags</b> <span class="nw">(' + spare + ' to spare)</span>';
      title.textContent = 'A four-week calendar with ' + days + ' of 28 days filled in, one pop per day.';
      var h = '';
      for (var j = 0; j < b; j++) h += '<svg viewBox="0 0 160 210" style="--i:' + j + '"><use href="#sh-pouch" width="160" height="210"/></svg>';
      h += '<span class="spare" title="' + spare + ' spare pops">';
      for (var s = 0; s < spare; s++) h += '<i></i>';
      h += '</span><span class="spare-l">' + spare + ' spare</span>';
      bags.innerHTML = h;
      addN.textContent = b + ' bags';
    }
    radios.forEach(function (r) { on(r, 'change', function () { if (r.checked) set(r.value, false); }); });
    var c = radios.filter(function (r) { return r.checked; })[0];
    set(c ? c.value : 4, true);
    on(add, 'click', function () {
      if (current !== 'strawberry-pop') setProduct('strawberry-pop', null, { instant: true });
      if (SHOP.setBags) SHOP.setBags(nBags);
      var h = $('#shop-h');
      afterScroll(function () { if (h) h.focus({ preventScroll: true }); });
    });
  })();

  /* ================================ Formats ================================ */
  (function formats() {
    var t = $('.fmt'), radios = $$('input[name="fmt"]');
    radios.forEach(function (r) { on(r, 'change', function () { if (r.checked && t) t.setAttribute('data-show', r.value); }); });
  })();

  /* ================================ Lineup (rendered from PRODUCTS) ================================ */
  (function lineup() {
    var box = $('[data-lineup]');
    if (!box) return;
    var wave = '<svg class="wave tile-ground" aria-hidden="true"><use href="#wave-2"/></svg>';
    var tile = {
      'strawberry-pop': wave + '<svg class="pcard__art" viewBox="-100 -100 200 360" aria-hidden="true"><use href="#sh-sunpop" x="-100" y="-100" width="200" height="360"/></svg>',
      'green-gummies': wave + '<svg class="pcard__art pcard__art--gummies" viewBox="0 0 200 150" aria-hidden="true"><use href="#sh-gummies" width="200" height="150"/></svg><p class="art-cap">Concept illustration</p>',
      'next-pop': '<svg class="pcard__art pcard__art--traced" viewBox="-100 -100 200 360" aria-hidden="true"><use href="#sh-traced" x="-100" y="-100" width="200" height="360"/></svg><span class="test-swatches" aria-hidden="true"><i></i><i></i><i></i></span><span class="hand" aria-hidden="true">not cut out yet</span>'
    };
    box.innerHTML = PRODUCTS.map(function (p) {
      var is = p.id === current;
      return '<article class="pcard pcard--' + p.id + ' rv in" aria-labelledby="pc-' + p.id + '">' +
        '<div class="pcard__tile">' + tile[p.id] + '</div>' +
        '<p class="tag">' + p.statusLabel + '</p>' +
        '<h3 class="h3" id="pc-' + p.id + '">' + p.name + '</h3>' +
        '<p class="pcard__facts">' + p.card + '</p>' +
        (p.facts ? '<button class="sf-btn" type="button" aria-controls="' + p.facts.slice(1) + '" aria-expanded="false" data-facts-btn>' + icon('clipboard-list') + 'Supplement facts' + icon('chevron-down', 'sf-btn__chev') + '</button>' : '') +
        '<div class="pcard__act">' +
          '<button class="theme-toggle" type="button" data-theme-btn="' + p.id + '" aria-pressed="' + is + '">' + icon('check', 'tt-check') + '<span class="tt-label">' + (is ? 'Showing' : 'Try this color') + '</span><span class="sr-only"> (' + p.name + ' colors)</span></button>' +
          '<a class="tlink" href="' + p.link.href + '"' + (p.link.notify ? ' data-notify' : '') + '>' + p.link.label + icon('arrow-right') + '</a>' +
        '</div></article>';
    }).join('');
    listeners.push(function (p) {                                // on a phone the cards are a row: bring the chosen one into it
      var c = $('.pcard--' + p.id, box);
      if (c && box.scrollWidth > box.clientWidth + 4) {
        var dx = c.getBoundingClientRect().left - box.getBoundingClientRect().left - (parseFloat(getComputedStyle(box).paddingLeft) || 0);
        box.scrollTo({ left: box.scrollLeft + dx, behavior: reduced() ? 'auto' : 'smooth' });
      }
    });
    var drawer = $('#gummy-facts'), fb = $('[data-facts-btn]', box);
    if (drawer && fb) {
      var sync = function () { fb.setAttribute('aria-expanded', String(drawer.open)); };
      on(drawer, 'toggle', sync);
      on(fb, 'click', function () {
        drawer.open = !drawer.open; sync();
        if (drawer.open) setTimeout(function () { drawer.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); }, 30);
      });
    }
  })();

  /* ================================ Shop ================================ */
  (function shop() {
    var tabsBox = $('[data-shop-tabs]'), builder = $('#builder'), wl = $('#waitlist');
    if (!builder) return;
    // product tabs (they also set the theme)
    tabsBox.innerHTML = PRODUCTS.map(function (p) {
      var is = p.id === current;
      return '<button class="stab" type="button" role="radio" data-theme-btn="' + p.id + '" aria-checked="' + is + '" tabindex="' + (is ? 0 : -1) + '">' +
        '<span class="swatch__disc" aria-hidden="true"></span>' + p.name + (p.id === 'strawberry-pop' ? '' : '<small>' + p.tabNote + '</small>') + '</button>';
    }).join('');
    tabsBox.hidden = false;
    function follow(p) {
      builder.hidden = p.id !== 'strawberry-pop';
      wl.setAttribute('data-variant', p.id === 'next-pop' ? 'next-pop' : 'green-gummies');
      if (p.id === 'next-pop') { var cb = $('[data-wl-colors]'); if (cb) cb.checked = true; }
    }
    listeners.push(follow);
    follow(byId[current]);

    // the bag builder
    var form = $('[data-builder]'), stack = $('.stack', builder), bagsEls = $$('.stack__bag', stack), more = $('[data-stack-more]'), cap = $('[data-stack-cap]');
    var stepper = $('[data-stepper]'), out = $('[data-stepper-n]'), summary = $('[data-summary]'), status = $('[data-shop-status]');
    var count = 1, big = 4, shown = 1;
    function bagsChecked() { var r = $('input[name="bags"]:checked', form); return r ? +r.value : 1; }
    function update() {
      var v = bagsChecked();
      stepper.hidden = v !== 4;
      count = v === 4 ? big : v;
      out.textContent = big;
      $('[data-step="-1"]', stepper).disabled = big <= 4;
      $('[data-step="1"]', stepper).disabled = big >= 10;
      var n = Math.min(count, 4);
      stack.setAttribute('data-stack', String(n));
      if (n > shown && !reduced()) for (var i = shown; i < n; i++) { bagsEls[i].classList.remove('drop'); void bagsEls[i].offsetWidth; bagsEls[i].classList.add('drop'); }
      shown = n;
      more.textContent = count > 4 ? '+' + (count - 4) : '';
      var pops = count * 10, word = count === 1 ? 'bag' : 'bags';
      cap.innerHTML = '<b>' + count + ' ' + word + ' · ' + pops + ' pops · ' + pops + ' days at one a day</b>';
      var buy = $('input[name="buy"]:checked', form);
      summary.innerHTML = count + ' ' + word + ' · ' + (buy && buy.value === 'sub' ? 'Subscribe &amp; save' : 'One-time') + ' · $<span class="ph">XX.XX</span> · Free shipping';
      status.hidden = true;
    }
    on(form, 'change', update);
    on(stepper, 'click', function (e) {
      var b = e.target.closest('[data-step]');
      if (!b) return;
      big = Math.max(4, Math.min(10, big + +b.getAttribute('data-step')));
      update();
    });
    on(form, 'submit', function (e) { e.preventDefault(); status.hidden = false; FX.from($('[type="submit"]', form)); });
    SHOP.setBags = function (n) {
      var v = n >= 4 ? 4 : n;
      if (n >= 4) big = n;
      var r = $('input[name="bags"][value="' + v + '"]', form);
      if (r) r.checked = true;
      update();
    };
    update();
  })();

  /* ================================ Waitlist ================================ */
  (function waitlist() {
    var form = $('[data-waitlist]');
    if (!form) return;
    var status = $('[data-wl-status]', form);
    on(form, 'submit', function (e) {
      e.preventDefault();                          // prototype: nothing leaves the page
      if (form.checkValidity && !form.checkValidity()) { form.reportValidity(); return; }
      status.hidden = false;
      FX.from($('[type="submit"]', form));
    });
  })();

  /* ================================ FAQ ================================ */
  (function faq() {
    var list = $('.faq-tabs');
    if (!list) return;
    list.hidden = false;
    var t = $$('.ftab', list), p = t.map(function (b) { return doc.getElementById(b.getAttribute('aria-controls')); });
    tabs(list, t, p);
    // accordions: a 420 ms paper slide (details still works without it)
    $$('.qa').forEach(function (d) {
      var s = $('summary', d), body = $('.qa__a', d), anim = null;
      on(s, 'click', function (e) {
        if (reduced() || !body.animate) return;
        e.preventDefault();
        if (anim) anim.cancel();
        if (!d.open) {
          d.open = true;
          var h = body.offsetHeight;
          anim = body.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
          anim.onfinish = function () { anim = null; };
        } else {
          anim = body.animate([{ height: body.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 300, easing: 'cubic-bezier(.65,0,.35,1)' });
          anim.onfinish = function () { d.open = false; anim = null; };
        }
      });
    });
  })();

  /* ================================ Sources ================================ */
  var SRC = {};
  (function sources() {
    var ol = $('[data-sources]'), btn = $('[data-src-more]');
    if (!ol || !btn) return;
    var label = $('span', btn);
    function set(open) {
      ol.classList.toggle('is-collapsed', !open);
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Show fewer sources' : 'Show all ' + $$('li', ol).length + ' sources';
      $('use', btn).setAttribute('href', open ? '#i-minus' : '#i-plus');
    }
    SRC.expand = function () { set(true); };
    btn.hidden = false;
    var h = location.hash;
    set(/^#src-/.test(h));
    on(btn, 'click', function () { set(ol.classList.contains('is-collapsed')); });
  })();
  // arriving with a hash (#label, #src-12, #faq-taste…): open whatever hides it, then jump
  if (location.hash.length > 1) {
    var target = doc.getElementById(location.hash.slice(1));
    if (target) { layoutAll(); reveal(target); setTimeout(function () { target.scrollIntoView(); }, 0); }
  }
  on(window, 'hashchange', function () {                      // a hash typed or followed from elsewhere
    var t = location.hash.length > 1 && doc.getElementById(location.hash.slice(1));
    if (t) { layoutAll(); reveal(t); }
  });

  /* ================================ Grain (paper texture) ================================ */
  idle(function grain() {
    try {
      var tile = function (n) {
        var c = doc.createElement('canvas');
        c.width = c.height = n;
        var x = c.getContext('2d'), img = x.createImageData(n, n), d = img.data;
        for (var i = 0; i < d.length; i += 4) {                  // even speckle, clamped: no clumps
          var r = Math.random();
          d[i] = 74; d[i + 1] = 13; d[i + 2] = 46;
          d[i + 3] = r < 0.6 ? 0 : 6 + Math.round((r - 0.6) * 22);
        }
        x.putImageData(img, 0, 0);
        return 'url(' + c.toDataURL('image/png') + ')';
      };
      root.style.setProperty('--grain', tile(157) + ',' + tile(211));
    } catch (e) { /* no grain, still paper */ }
  });

  /* ================================ Real3D (the one realistic object: the pop, in the shop) ================================ */
  // The page is all cut paper; the accurate 3D lollipop appears once, where you buy it, as "the real one".
  // It loads only when the shop is near, after the page has loaded, never on save-data, and stays a paper
  // stand-in if WebGL or the CDN is missing. It always shows the strawberry pop (the shop builder it sits
  // in is only shown for that product). Reduced motion or Pause motion: it holds still, and only renders
  // while you grab it.
  (function real3d() {
    var slot = $('#pop3d-real'), fig = $('#real');
    if (!slot || !('IntersectionObserver' in window)) return;
    function loadScript(src) {
      return new Promise(function (res, rej) {
        if (window.GloCandy) return res();
        var s = doc.createElement('script');
        s.src = src; s.async = true;
        s.onload = function () { res(); }; s.onerror = function () { rej(new Error('load ' + src)); };
        doc.head.appendChild(s);
      });
    }
    function mount() {
      var conn = navigator.connection;
      if (conn && conn.saveData) return;                          // stays paper on save-data
      var lite = window.matchMedia('(pointer: coarse)').matches || (navigator.deviceMemory || 8) <= 4;
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        loadScript('../_shared/candy3d.js').then(function () {
          if (!window.GloCandy) return null;
          return window.GloCandy.create($('.pop3d__mount', slot), {
            product: PRODUCTS[0].candy, preset: 'gloss', environment: 'beach', quality: lite ? 'low' : 'medium',
            assets: !lite, zoom: 1, spin: 0.0016, tilt: 0.3, bob: false, pointerTilt: false
          });
        }).then(function (candy) {
          if (!candy) return;                                     // stays paper
          slot.classList.add('is-3d');
          if (fig) fig.classList.add('is-3d');
          DECOR.push(candy);
          // held still (reduced motion / Pause motion): render only while it's being handled
          var idleT = 0, held = function () { return reduced() || motionOff(); };
          candy.__rest = function () { clearTimeout(idleT); idleT = setTimeout(function () { if (held()) candy.pause(); }, 1600); };
          on(slot, 'pointerdown', function () { if (held()) { clearTimeout(idleT); candy.resume(); } });
          on(slot, 'pointerup', function () { candy.__rest(); });
          on(slot, 'pointercancel', function () { candy.__rest(); });
          if (held()) candy.__rest();
        }).catch(function () { /* stays paper */ });
      }, { rootMargin: '600px 0px' });
      io.observe(slot);
    }
    if (doc.readyState === 'complete') setTimeout(mount, 200); else on(window, 'load', function () { setTimeout(mount, 200); });
  })();

  window.PaperSun.setProduct = function (id) { setProduct(id, null, { instant: true }); };
  window.PaperSun.products = PRODUCTS;
})();
