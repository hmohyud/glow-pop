/* ==========================================================================
   Glo Pop · Proposal 08 · "Pop Arcade" · app.js (classic script, no deps
   beyond Lucide icons and the shared 3D candy)
   Modules: helpers → products/theme → icons → reveals → level HUD → coins
            → 3D candy → switcher → Glow Grid (game + sticker book) → bubbles
            → streak → shop → waitlist → FAQ → menu → toast/confetti → pause
   ========================================================================== */
(function () {
  'use strict';
  window.__arcade = true;

  /* ── 0. HELPERS ────────────────────────────────────────── */
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) root.classList.add('no-anim');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function PH(t) { return '<span class="ph">' + t + '</span>'; }
  function ico(n) { return '<i data-lucide="' + n + '"></i>'; }
  function icons() { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons({ attrs: { 'stroke-width': 2.4 } }); }
  function D(ms) { return reduce ? Math.min(ms, 40) : ms; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function safe(name, fn) { try { fn(); } catch (e) { console.error('[pop-arcade] ' + name, e); } }
  function bump(el, cls) { if (!el || reduce) return; cls = cls || 'is-bump'; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function onVisible(el, fn, margin) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); fn(); } }); }, { rootMargin: margin || '0px' });
    io.observe(el);
  }

  /* ── 1. PRODUCTS: one source of truth for theme + copy ──── */
  // Facts: redesign/_qa/PACK-FACTS.md (2026-11-08). The pops are sugar free (the only sugar claim we make);
  // the Super Greens Gummies are NOT (3 g sugars per serving), so no sugar-free copy may bind in their state.
  var POP_NOTE = 'Sweetener: ' + PH('TBD') + ' · other ingredients &amp; allergens: ' + PH('details');
  var PRODUCTS = {
    'strawberry-pop': {
      theme: { c: '#FF2E93', c2: '#FF9AC8', deep: '#5A0F38', ink: '#2A0820', paper: '#FFF6EC', tint: '#FFE3F0', 'on-c': '#2A0820', sky: '#FFC6E0', sea2: '#FF7AB8' },
      candy: { kind: 'lollipop', color: '#FF1493' },
      ui: {
        kicker: 'Collagen Boost · Strawberry',
        heroSub: 'Sugar-free strawberry beauty lollipops with peptides, hyaluronic acid and five more actives. One a day. Seriously good.',
        ctaLabel: 'Build your bag', ctaHref: '#shop', sugarNote: POP_NOTE,
        proof: [['candy', 'Sugar free'], ['sparkles', '7 actives'], ['lollipop', '15 g pop'], ['truck', 'Free shipping']],
        tape: ['Sugar free', '7 actives', '15 g pop', 'Strawberry flavor', 'One a day', 'Gluten-free', 'Free shipping']
      },
      info: {
        status: ['badge-check', 'Available now'], name: 'Collagen Boost', flavor: 'Strawberry Beauty Lollipop',
        blurb: 'A really, really good strawberry lollipop that happens to be sugar free. Seven actives ride along inside, from peptides to biotin.',
        tiles: [['15 g', 'each pop'], ['10', 'pops per bag'], ['7', 'actives inside'], ['1', 'a day, that’s it']],
        ctas: [['Build your bag', '#shop', 'ink'], ['Meet the seven', '#grid', 'paper']]
      }
    },
    'green-gummies': {
      theme: { c: '#22C55E', c2: '#A3E635', deep: '#0B3B22', ink: '#062A17', paper: '#F2FCEB', tint: '#DDF7E5', 'on-c': '#062A17', sky: '#C8F5D3', sea2: '#7EE0A0' },
      candy: { kind: 'gummy', color: '#0C9A43' },
      ui: {
        kicker: 'Super Greens Gummies · Coming soon',
        heroSub: 'Strawberry-watermelon gummies with kale, broccoli, spinach, wild blueberries and elderberry. Vegan friendly, gluten free, non GMO. Coming soon.',
        ctaLabel: 'Join the waitlist', ctaHref: '#waitlist',
        sugarNote: 'This level is about the Collagen Boost pops. Super Greens Gummies are not sugar free: 3 g total sugars per 2-gummy serving.',
        proof: [['vegan', 'Vegan friendly'], ['wheat-off', 'Gluten free'], ['flask-conical', 'Non GMO'], ['clock', 'Coming soon']],
        tape: ['Super Greens Gummies', 'Strawberry-Watermelon', 'Vegan friendly', 'Gluten free', 'Non GMO', 'Coming soon']
      },
      info: {
        status: ['clock', 'Coming soon'], name: 'Super Greens Gummies', flavor: 'Strawberry-Watermelon',
        blurb: 'Strawberry meets watermelon in a gummy, with kale, broccoli, spinach, wild blueberries and elderberry. No astragalus &amp; adaptogens.',
        tiles: [['2', 'gummies a day'], ['30', 'servings (60 gummies)'], ['20', 'calories per serving'], ['3 g', 'sugars per serving']],
        phTiles: ['Price', 'Launch date'],
        ctas: [['Join the waitlist', '#waitlist', 'ink'], ['See Supplement Facts', '#facts', 'paper']]
      }
    },
    'next-pop': {
      theme: { c: '#8B3FD6', c2: '#C9A7FF', deep: '#2A0B4A', ink: '#1A0630', paper: '#F7F1FF', tint: '#ECE0FF', 'on-c': '#FFFFFF', sky: '#E1D2FF', sea2: '#B58CFF' },
      candy: { kind: 'lollipop', color: '#8B3FD6' },
      ui: {
        kicker: 'More colours · In development',
        heroSub: 'More Glo Pop colours are in the works. No names, no flavours yet. Just a whole lot of colour on the way.',
        ctaLabel: 'Get first dibs', ctaHref: '#waitlist', sugarNote: POP_NOTE,
        proof: [['flask-conical', 'In development'], ['clock', 'Drop date ' + PH('TBD')], ['truck', 'Free shipping']],
        tape: ['More colours', 'In development', 'Stay tuned', 'Get first dibs', 'Free shipping']
      },
      info: {
        status: ['flask-conical', 'In development'], name: 'More colours', flavor: 'on the way',
        blurb: 'The colour system is built to grow. Each new pop gets its own colour world on this page the day it’s real.',
        phTiles: ['Colours', 'Flavours', 'Actives', 'Drop date'],
        ctas: [['Get first dibs', '#waitlist', 'ink'], ['Back to Collagen Boost', 'strawberry-pop', 'switch']]
      }
    }
  };
  var current = 'strawberry-pop';

  function applyTheme(id) {
    var p = PRODUCTS[id];
    Object.keys(p.theme).forEach(function (k) { root.style.setProperty('--' + k, p.theme[k]); });
    var m = $('meta[name="theme-color"]'); if (m) m.setAttribute('content', p.theme.c);
    $$('[data-bind]').forEach(function (el) { var v = p.ui[el.getAttribute('data-bind')]; if (v != null) el.innerHTML = v; });
    $$('[data-bind-href]').forEach(function (el) { el.setAttribute('href', p.ui[el.getAttribute('data-bind-href')]); });
    // hero proof chips follow the product too (a "Sugar free" chip must never sit beside the gummies)
    $$('[data-bind-list]').forEach(function (el) {
      var v = p.ui[el.getAttribute('data-bind-list')];
      if (v) el.innerHTML = v.map(function (x) { return '<li>' + ico(x[0]) + '<span>' + x[1] + '</span></li>'; }).join('');
    });
    var tape = $('[data-bind-tape]');
    if (tape) {
      var one = p.ui.tape.map(function (t) { return '<span>' + t + ' ' + ico('sparkle') + '</span>'; }).join('');
      tape.innerHTML = one + one + one + one;   // 4 copies; the loop scrolls by half
    }
    var lock = $('#shopLock');
    if (lock) {
      lock.hidden = id === 'strawberry-pop';
      if (!lock.hidden) lock.innerHTML = ico('info') + '<span>' + (id === 'green-gummies' ? 'Super Greens Gummies aren’t in the shop yet.' : 'New colours aren’t in the shop yet.') + ' The bundles below are Collagen Boost pops. <a href="#waitlist">Join the waitlist</a></span>';
    }
    renderInfo(p);
    icons();
  }

  function renderInfo(p) {
    var el = $('#pickInfo'); if (!el) return;
    var I = p.info, h = '<div class="pinfo-main">';
    h += '<p class="status">' + ico(I.status[0]) + '<span>' + I.status[1] + '</span></p>';
    h += '<h3 class="pinfo-name">' + I.name + ' <small>' + I.flavor + '</small></h3>';
    h += '<p class="pinfo-blurb">' + I.blurb + '</p>';
    h += '<div class="pinfo-ctas">' + I.ctas.map(function (c) {
      if (c[2] === 'switch') return '<button class="btn btn--paper js-pick" type="button" data-product="' + c[1] + '">' + c[0] + '</button>';
      return '<a class="btn btn--' + c[2] + '" href="' + c[1] + '">' + c[0] + '</a>';
    }).join('') + '</div></div><div class="pinfo-side">';
    if (I.tiles) h += '<ul class="tiles">' + I.tiles.map(function (t) { return '<li><b>' + t[0] + '</b><span>' + t[1] + '</span></li>'; }).join('') + '</ul>';
    if (I.phTiles) h += '<ul class="tiles tiles--ph"' + (I.tiles ? ' style="margin-top:10px"' : '') + '>' + I.phTiles.map(function (t) { return '<li>' + PH(t) + '</li>'; }).join('') + '</ul>';
    h += '</div>';
    el.innerHTML = h;
    if (!reduce) bump(el.firstChild, 'is-new');
  }

  /* ── 2. REVEALS ───────────────────────────────────────── */
  function reveals() {
    var els = $$('.rv');
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var sib = e.target.parentElement ? $$('.rv', e.target.parentElement) : [];
        e.target.style.setProperty('--d', Math.min(sib.indexOf(e.target), 5) * 0.07 + 's');
        e.target.classList.add('is-in'); io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ── 3. LEVEL HUD ─────────────────────────────────────── */
  function hud() {
    var secs = $$('.lv'), n = $('#hudN'), name = $('#hudName'), fill = $('#hudFill'), wrap = n.parentElement, last = -1;
    function set(i) {
      if (i === last) return; last = i;
      var s = secs[i], L = s.getAttribute('data-level');
      n.textContent = L === 'B' ? 'BONUS' : (s.id === 'final' ? 'FINAL' : 'LVL ' + L);
      name.textContent = s.getAttribute('data-name');
      fill.style.transform = 'scaleX(' + Math.max(0.03, i / (secs.length - 1)) + ')';
      bump(wrap, 'is-up');
    }
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) set(secs.indexOf(e.target)); });
    }, { rootMargin: '-45% 0px -54% 0px' });
    secs.forEach(function (s) { io.observe(s); });
  }

  /* ── 4. SPARKLE COINS (collectibles) ──────────────────── */
  function coins() {
    var all = $$('.coin'), got = 0, out = $('#coinN'), box = $('.hud-coins');
    $('#coinT').textContent = all.length;
    all.forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.classList.contains('is-got')) return;
        var r = b.getBoundingClientRect();
        b.classList.add('is-got');
        got++;
        fly(r, box, 'sparkle', function () { out.textContent = got; bump(box); });
        if (got === all.length) {
          confetti(innerWidth / 2, innerHeight / 3, 140);
          toast('party-popper', 'All ' + all.length + ' sparkles found. Nice eyes! (Just for fun, no prize.)');
        } else toast('sparkle', 'Sparkle ' + got + ' of ' + all.length + ' found.');
        var next = $('.hud-coins'); if (next) next.setAttribute('aria-label', got + ' of ' + all.length + ' sparkles found');
      });
    });
  }

  /* ── 5. 3D CANDY (lazy, max 2 instances) ──────────────── */
  var heroCandy = null;
  function mount3D(el, fb, product) {
    var fallback = function () { if (fb) fb.hidden = false; return null; };
    if (!window.GloCandy || !el) return Promise.resolve(fallback());
    var low = (navigator.hardwareConcurrency || 8) <= 4;
    return window.GloCandy.create(el, {
      product: product, environment: 'beach', bite: true, quality: low ? 'low' : 'medium',
      spin: reduce ? 0 : 0.004, bob: !reduce, fallback: fb
    }).catch(fallback);
  }
  function candy() {
    var h = $('#heroCandy');
    setTimeout(function () {
      mount3D(h, $('#heroFallback'), PRODUCTS[current].candy).then(function (api) {
        heroCandy = api;
        if (api && current !== 'strawberry-pop') api.setProduct(PRODUCTS[current].candy);
      });
    }, 120);
    var g = $('#gumCandy');
    onVisible(g, function () { mount3D(g, $('#gumFallback'), { kind: 'gummy', color: '#0C9A43' }); }, '300px 0px');
  }

  /* ── 6. SWITCHER ──────────────────────────────────────── */
  function switcher() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest('.js-pick'); if (!b) return;
      var id = b.getAttribute('data-product'); if (!PRODUCTS[id]) return;
      $$('.cart').forEach(function (c) { var on = c.getAttribute('data-product') === id; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', on); });
      if (id === current) return;
      current = id;
      applyTheme(id);
      if (heroCandy) heroCandy.setProduct(PRODUCTS[id].candy);
      // the 3D's accessible name follows the model it shows (it used to say "strawberry lollipop" over the gummies)
      var h3d = $('#heroCandy');
      if (h3d) h3d.setAttribute('aria-label', id === 'green-gummies' ? 'Glossy 3D Super Greens Gummies, a concept render. Drag to spin.'
        : id === 'next-pop' ? 'A glossy 3D Glo Pop lollipop in a colour still in development. Drag to spin, tap to take a bite.'
        : 'A glossy 3D strawberry Glo Pop lollipop. Drag to spin, tap to take a bite.');
      // the gummy pile sits higher in the frame than the lollipop's stick: move its contact shadow (and the sand) up
      $('.hero').classList.toggle('is-gum', id === 'green-gummies');
      window.dispatchEvent(new Event('resize'));
      var cart = $('.cart[data-product="' + id + '"]'); bump(cart, 'is-new');
      if (!b.classList.contains('cart')) { var c2 = $('.cart[data-product="' + id + '"]'); if (c2) c2.focus({ preventScroll: true }); }
    });
  }

  /* ── 7. GLOW GRID: original match-3 that teaches the seven ── */
  // The seven actives, in the pack's wording and order of the sticker book. Every candy is a pre-rendered
  // hard candy in two layers (assets/candy/<id>.webp and <id>-shadow.webp: the candy, and its shadow on the
  // tray, so a picked candy can lift off its shadow), lit like the hero pop: sun up-left. The SVG shapes
  // (#sh-0 … #sh-6: circle, droplet, sunburst, hexagon, rounded square, diamond, four-petal flower) are the
  // fallback if an image fails to load.
  var A = [
    { n: 'Peptides', ab: 'Pep', c: '#FF4FA3', chip: 'Building blocks',
      body: 'Short chains of amino acids, the building blocks of proteins. Peptides support skin’s natural firmness and elasticity*.',
      fact: '“Peptide” comes from the Greek peptós, meaning digested.' },
    { n: 'Hyaluronic acid', ab: 'HA', c: '#2EC5F0', chip: 'Moisture molecule',
      body: 'Your skin’s own moisture molecule, famous for holding on to water. About half of your body’s HA lives in your skin.',
      fact: 'An adult recycles about a third of their HA every day.' },
    { n: 'Vitamin C', ab: 'C', c: '#FF8A1F', chip: 'Collagen formation',
      body: 'Your body can’t make vitamin C, and it needs it to make collagen. It also contributes to the protection of cells from oxidative stress.',
      fact: 'Humans, guinea pigs and some bats all lost the ability to make their own.' },
    { n: 'Vitamin B12', ab: 'B12', c: '#3D5BFF', chip: 'Energy metabolism',
      body: 'Contributes to normal energy-yielding metabolism and to the reduction of tiredness and fatigue.',
      fact: 'The only vitamin with a metal at its centre: cobalt.' },
    { n: 'Vitamin B6', ab: 'B6', c: '#8BD12F', chip: 'Protein metabolism',
      body: 'Contributes to normal protein and glycogen metabolism. A behind-the-scenes helper for more than 100 enzymes.',
      fact: '“Vitamin B6” is really a small family of related compounds, not just one.' },
    { n: 'Zinc', ab: 'Zn', c: '#B49BFF', chip: 'Normal skin',
      body: 'Contributes to the maintenance of normal skin, hair and nails. Your body has no zinc storage, so a steady daily supply matters.',
      fact: 'Zinc plays a part in your sense of taste. Fitting, for a candy.' },
    { n: 'Vitamin B8 (biotin)', ab: 'B8', c: '#FFC23D', chip: 'Hair, skin & nails',
      body: 'One of the B vitamins: your body uses it to unlock energy from food. Biotin supports healthy-looking hair, skin and nails*.',
      fact: 'Biotin was first called “vitamin H”, after the German Haar und Haut: hair and skin.' }
  ];
  var CANDY = 'assets/candy/', IDS = ['pep', 'ha', 'c', 'b12', 'b6', 'zn', 'b8'], svgOnly = false;
  function tokSVG(t) {
    // the flower (biotin) gets its gloss spot on its top-left petal; the rest share one spot
    var hi = t === 6 ? '<ellipse class="s-hi" cx="31" cy="27" rx="9" ry="5" transform="rotate(-40 31 27)"/>' : '<ellipse class="s-hi" cx="34" cy="30" rx="11" ry="6" transform="rotate(-32 34 30)"/>';
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><use href="#sh-' + t + '" class="s-body"/><use href="#sh-' + t + '" class="s-gloss" stroke="none"/>' + hi + '</svg>';
  }
  function candyArt(t) {
    if (svgOnly) return tokSVG(t);
    return '<img class="tok-sh" src="' + CANDY + IDS[t] + '-shadow.webp" alt="" draggable="false">' +
      '<img class="tok-c" src="' + CANDY + IDS[t] + '.webp" alt="" draggable="false">';
  }
  // an image that fails swaps every candy on the page (and every later one) to the original SVG shapes,
  // so the board never mixes the two styles
  document.addEventListener('error', function (e) {
    var im = e.target, box = im && im.parentElement;
    if (!im || im.tagName !== 'IMG' || !/\btok-(c|sh)\b/.test(im.className) || !box || !box.hasAttribute('data-t')) return;
    svgOnly = true;
    $$('.cnd[data-t]').forEach(function (b) { if (b.querySelector('img')) b.innerHTML = tokSVG(+b.getAttribute('data-t')); });
  }, true);

  function game() {
    // Seven candy types on a 7x7 board: a 6x6 board with seven types left fewer visible matches and
    // more dead-board shuffles. Refills lean toward actives that are still locked (BIAS) so the last
    // cards turn up in reasonable time. (Simulated: ~6 valid moves per board, ~7 moves to clear.)
    var N = 7, T = A.length, BIAS = 0.35, WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
    var ALL = WORDS[T] || String(T);
    var board = $('#board'), wrapEl = board.parentElement, fx = $('#fx'), live = $('#gLive');
    var cap = $('#gCap'), capTxt = $('.cap-t', cap), capN = $('.cap-n', cap);
    var grid = [], busy = false, sel = null, cur = { r: 0, c: 0 }, started = false, won = false;
    var score = 0, moves = 0, unlocked = [], idleT = 0, capT = 0, capKey = '', lastCap = null;
    wrapEl.style.setProperty('--n', N);
    $('#gTot').textContent = T;
    board.setAttribute('aria-label', 'Glow Grid board, ' + N + ' by ' + N + '. Arrow keys move, Enter picks a candy, then an arrow key swaps it.');
    var wells = $('.wells', wrapEl);
    wells.innerHTML = new Array(N * N + 1).join('<i></i>');
    var wellEls = $$('i', wells);
    function spawnType() {
      if (Math.random() < BIAS) {
        var locked = []; for (var t = 0; t < T; t++) if (!unlocked[t]) locked.push(t);
        if (locked.length) return locked[Math.floor(Math.random() * locked.length)];
      }
      return Math.floor(Math.random() * T);
    }

    /* the seven, in a row above the board: a light silhouette until matched */
    var strip = $('#gStrip');
    strip.innerHTML = A.map(function (a, i) {
      return '<li style="--pc:' + a.c + '"><span class="slot"><span class="cnd" data-t="' + i + '">' + candyArt(i) + '</span></span><small>' + a.ab + '</small></li>';
    }).join('');
    var slots = $$('li', strip);

    /* sticker book */
    var book = $('#book');
    book.innerHTML = A.map(function (a, i) {
      return '<li class="card is-locked" id="card-' + i + '" style="--pc:' + a.c + '">' +
        '<div class="card-top"><span class="card-tok cnd" data-t="' + i + '" aria-hidden="true">' + candyArt(i) + '</span>' +
        '<div><h3>' + a.n + '</h3><span class="card-chip">' + a.chip + '</span></div></div>' +
        '<div class="card-lock"><span>' + ico('lock') + ' Match 3 to unlock</span><button class="peek" type="button" data-peek="' + i + '">Peek' + '<span class="sr-only"> at ' + a.n + '</span> ' + ico('eye') + '</button></div>' +
        '<div class="card-more"><p class="card-body">' + a.body + ' <span class="nw">Per pop: ' + PH('mg TBD') + '</span></p>' +
        '<p class="card-fact">' + ico('lightbulb') + '<span>' + a.fact + '</span></p></div></li>';
    }).join('');
    book.addEventListener('click', function (e) {
      var b = e.target.closest('[data-peek]'); if (!b) return;
      var i = +b.getAttribute('data-peek'); reveal(i);
      var card = $('#card-' + i); card.setAttribute('tabindex', '-1'); card.focus({ preventScroll: true });
    });

    // reveal = show the card (Peek / Show all seven); unlock = earned in play (counts toward Level clear)
    function reveal(t) {
      var card = $('#card-' + t);
      if (!card.classList.contains('is-locked')) return;
      card.classList.remove('is-locked'); bump(card, 'is-new');
    }
    function found() { return unlocked.filter(Boolean).length; }
    function unlock(t, quiet) {
      if (unlocked[t]) return false;
      unlocked[t] = true;
      reveal(t);
      slots[t].classList.add('is-on'); bump(slots[t], 'is-new');
      var n = found(); $('#gUnl').textContent = n; capN.textContent = n + '/' + T;
      if (!quiet) { say('Unlocked ' + A[t].n + ': ' + A[t].chip + '. ' + n + ' of ' + T + '.'); }
      return true;
    }
    function say(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }

    /* one line under the board: how to play, then what was just found (on phones the book is out of
       sight), with the running count at the right */
    var coarse = window.matchMedia('(pointer: coarse)');
    function howTo() { return coarse.matches ? 'Tap a candy, then a neighbour, or swipe.' : 'Click two neighbours, or use the arrow keys and Enter.'; }
    // t: the candy to show in front of the words (an unlock), if any
    function capShow(key, txt, hold, t) {
      clearTimeout(capT);
      if (key !== capKey) {
        var first = !capKey; capKey = key;
        capTxt.innerHTML = (t == null ? '' : '<span class="cap-c cnd" data-t="' + t + '" style="--pc:' + A[t].c + '">' + candyArt(t) + '</span>') + '<span class="cap-x">' + txt + '</span>';
        if (!first) bump(cap, 'is-new');
      }
      if (hold) capT = setTimeout(capIdle, hold);
    }
    function capIdle() {
      if (won) return;
      var left = [];
      for (var t = 0; t < T; t++) if (!unlocked[t]) left.push(t);
      if (left.length === T) capShow('how', howTo());
      else if (left.length === 1) capShow('last', 'One to go: <b>' + A[left[0]].n + '</b>.');
      else if (lastCap) capShow(lastCap[0], lastCap[1], 0, lastCap[2]);
    }
    function capUnlock(list) {
      var names = list.map(function (t) { return '<b>' + A[t].n + '</b>'; });
      // three or more in one go stay on the caption's two lines: "Zinc and two more unlocked"
      var txt = names.length > 2 ? names[0] + ' and ' + (WORDS[names.length - 1] || names.length - 1) + ' more unlocked'
        : names.length > 1 ? names[0] + ' and ' + names[1] + ' unlocked'
        : names[0] + ' unlocked<span class="cap-sep"> · </span><span class="cap-chip">' + A[list[0]].chip + '</span>';
      lastCap = ['u' + list.join('-'), txt, list[0]];
      capShow(lastCap[0], lastCap[1], 3600, lastCap[2]);
    }
    if (coarse.addEventListener) coarse.addEventListener('change', function () { if (capKey === 'how') { capKey = '-'; capIdle(); } });

    /* tiles */
    function mk(t) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'tok'; b.tabIndex = -1; b.setAttribute('data-t', t);
      b.style.setProperty('--pc', A[t].c);
      b.innerHTML = '<span class="tok-b cnd" data-t="' + t + '">' + candyArt(t) + '</span>';
      board.appendChild(b);
      return { t: t, el: b, r: 0, c: 0 };
    }
    function place(tile, r, c, dur) {
      tile.el.style.setProperty('--dur', (dur == null ? 200 : D(dur)) + 'ms');
      tile.el.style.setProperty('--x', c); tile.el.style.setProperty('--y', r);
      if (r >= 0) { tile.r = r; tile.c = c; tile.el.setAttribute('aria-label', A[tile.t].n + ', row ' + (r + 1) + ', column ' + (c + 1)); }
    }
    function at(r, c) { return r >= 0 && r < N && c >= 0 && c < N && grid[r][c] ? grid[r][c].t : -1; }

    function runsOf(get) {
      var out = [], r, c, e, t;
      for (r = 0; r < N; r++) for (c = 0; c < N; c = e + 1) {
        t = get(r, c); e = c; while (e + 1 < N && get(r, e + 1) === t) e++;
        if (t >= 0 && e - c >= 2) { var cs = []; for (var k = c; k <= e; k++) cs.push([r, k]); out.push(cs); }
      }
      for (c = 0; c < N; c++) for (r = 0; r < N; r = e + 1) {
        t = get(r, c); e = r; while (e + 1 < N && get(e + 1, c) === t) e++;
        if (t >= 0 && e - r >= 2) { var cs2 = []; for (var k2 = r; k2 <= e; k2++) cs2.push([k2, c]); out.push(cs2); }
      }
      return out;
    }
    function findMove() {
      var m = grid.map(function (row) { return row.map(function (x) { return x ? x.t : -1; }); });
      function get(r, c) { return m[r][c]; }
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
        var ds = [[0, 1], [1, 0]];
        for (var i = 0; i < 2; i++) {
          var r2 = r + ds[i][0], c2 = c + ds[i][1]; if (r2 >= N || c2 >= N) continue;
          var tmp = m[r][c]; m[r][c] = m[r2][c2]; m[r2][c2] = tmp;
          var ok = runsOf(get).length > 0;
          m[r2][c2] = m[r][c]; m[r][c] = tmp;
          if (ok) return [{ r: r, c: c }, { r: r2, c: c2 }];
        }
      }
      return null;
    }

    function fresh(drop) {
      board.innerHTML = ''; grid = [];
      var tries = 0;
      do {
        grid = [];
        for (var r = 0; r < N; r++) {
          grid.push([]);
          for (var c = 0; c < N; c++) {
            var t, guard = 0;
            do { t = Math.floor(Math.random() * T); guard++; }
            while (guard < 30 && ((c >= 2 && grid[r][c - 1].t === t && grid[r][c - 2].t === t) || (r >= 2 && grid[r - 1][c].t === t && grid[r - 2][c].t === t)));
            grid[r].push({ t: t });
          }
        }
      } while (++tries < 50 && (runsOf(at).length || !findMove()));
      grid = grid.map(function (row) { return row.map(function (x) { return mk(x.t); }); });
      grid.forEach(function (row, r) { row.forEach(function (tile, c) { place(tile, drop ? r - N - 1 : r, c, 0); if (drop) { tile.r = r; tile.c = c; } }); });
      if (drop && !reduce) {
        void board.offsetWidth;
        grid.forEach(function (row, r) { row.forEach(function (tile, c) {
          setTimeout(function () { place(tile, r, c, 420); setTimeout(function () { land(tile); }, 420); }, (N - 1 - r) * 45 + c * 25);
        }); });
      } else grid.forEach(function (row, r) { row.forEach(function (tile, c) { place(tile, r, c, 0); }); });
      cur = { r: Math.min(cur.r, N - 1), c: Math.min(cur.c, N - 1) };
      syncTab();
    }
    function land(tile) { if (reduce || !tile.el.isConnected) return; bump(tile.el, 'is-land'); }

    function syncTab(focus) {
      grid.forEach(function (row) { row.forEach(function (t) { if (t) t.el.tabIndex = -1; }); });
      var t = grid[cur.r] && grid[cur.r][cur.c];
      if (t) { t.el.tabIndex = 0; if (focus) t.el.focus({ preventScroll: true }); }
    }
    function boardHasFocus() { return board.contains(document.activeElement); }

    function setSel(p) {
      $$('.tok.is-sel', board).forEach(function (e) { e.classList.remove('is-sel'); });
      sel = p;
      if (p) { grid[p.r][p.c].el.classList.add('is-sel'); grid[p.r][p.c].el.setAttribute('aria-pressed', 'true'); }
      $$('.tok[aria-pressed]', board).forEach(function (e) { if (!e.classList.contains('is-sel')) e.removeAttribute('aria-pressed'); });
    }
    function clearHint() { $$('.is-hint', wrapEl).forEach(function (e) { e.classList.remove('is-hint'); }); }
    function hint() {
      clearHint(); var m = findMove(); if (!m) return;
      // the two candies lean toward each other along the swap until they meet, twice, and their wells light up.
      // Measured from the sprites' alpha: side by side the widest pair touches at an 11% lean each; stacked, the
      // tall droplet over another candy touches at about 7%, so a vertical lean stops at 8%
      var a = grid[m[0].r][m[0].c].el, b = grid[m[1].r][m[1].c].el, dx = m[1].c - m[0].c, dy = m[1].r - m[0].r;
      a.style.setProperty('--hx', dx * 11 + '%'); a.style.setProperty('--hy', dy * 8 + '%');
      b.style.setProperty('--hx', -dx * 11 + '%'); b.style.setProperty('--hy', -dy * 8 + '%');
      if (reduce) { a.classList.add('is-hint'); b.classList.add('is-hint'); setTimeout(clearHint, 2400); }
      else { bump(a, 'is-hint'); bump(b, 'is-hint'); m.forEach(function (p) { bump(wellEls[p.r * N + p.c], 'is-hint'); }); }
      say('Hint: try swapping ' + A[grid[m[0].r][m[0].c].t].n + ' at row ' + (m[0].r + 1) + ' column ' + (m[0].c + 1) + ' with its neighbour ' + (m[1].r > m[0].r ? 'below' : 'to the right') + '.');
    }
    function idle() { clearTimeout(idleT); if (started && !won) idleT = setTimeout(function () { if (!busy) hint(); }, 9000); }

    function swap(a, b, dur) {
      var x = grid[a.r][a.c], y = grid[b.r][b.c];
      grid[a.r][a.c] = y; grid[b.r][b.c] = x;
      place(y, a.r, a.c, dur); place(x, b.r, b.c, dur);
    }

    async function attempt(a, b) {
      if (busy || won || !started) return;
      if (b.r < 0 || b.r >= N || b.c < 0 || b.c >= N || Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) return;
      busy = true; setSel(null); clearHint();
      swap(a, b, 190);
      await wait(D(200));
      var rs = runsOf(at);
      if (!rs.length) {
        var e1 = grid[b.r][b.c].el, e2 = grid[a.r][a.c].el;
        swap(a, b, 190); bump(e1, 'is-nope'); bump(e2, 'is-nope');
        say('No match there.');
        await wait(D(230));
        busy = false; idle(); return;
      }
      moves++; var mv = $('#gMoves'); mv.textContent = moves; bump(mv);
      cur = { r: b.r, c: b.c };
      await cascade(rs);
      if (!findMove()) { capShow('fresh', 'No moves left, so here’s a fresh board.', 2800); say('No moves left, so here’s a fresh board.'); await wait(D(500)); fresh(true); await wait(D(700)); }
      busy = false;
      syncTab(boardHasFocus() || document.activeElement === document.body);
      if (!won && found() === T) win(); else idle();
    }

    async function cascade(rs) {
      var chain = 0;
      while (rs.length) {
        chain++;
        var kill = {}, maxLen = 0, newly = [];
        rs.forEach(function (run) { maxLen = Math.max(maxLen, run.length); run.forEach(function (p) { kill[p[0] * N + p[1]] = p; }); });
        var keys = Object.keys(kill), counts = {};
        keys.forEach(function (k) {
          var p = kill[k], tile = grid[p[0]][p[1]];
          counts[tile.t] = (counts[tile.t] || 0) + 1;
          tile.el.classList.add('is-pop');
          burst(p[1], p[0], A[tile.t].c, 1);
        });
        Object.keys(counts).forEach(function (t) { if (unlock(+t)) newly.push(+t); });
        addScore(keys.length * 10 * chain + (maxLen >= 4 ? 40 * (maxLen - 3) : 0));
        if (newly.length) capUnlock(newly);
        await wait(D(230));
        keys.forEach(function (k) { var p = kill[k]; grid[p[0]][p[1]].el.remove(); grid[p[0]][p[1]] = null; });
        // gravity + refill
        var maxFall = 0, movers = [], spawns = [];
        for (var c = 0; c < N; c++) {
          var w = N - 1;
          for (var r = N - 1; r >= 0; r--) {
            var tile = grid[r][c]; if (!tile) continue;
            if (r !== w) { grid[w][c] = tile; grid[r][c] = null; movers.push([tile, w, c, w - r]); maxFall = Math.max(maxFall, w - r); }
            w--;
          }
          var missing = w + 1;
          for (var r2 = w; r2 >= 0; r2--) {
            var nt = mk(spawnType());
            grid[r2][c] = nt; place(nt, r2 - missing, c, 0);
            spawns.push([nt, r2, c, missing]); maxFall = Math.max(maxFall, missing);
          }
        }
        void board.offsetWidth;
        movers.concat(spawns).forEach(function (m) { place(m[0], m[1], m[2], 140 + 60 * m[3]); });
        await wait(D(140 + 60 * maxFall + 20));
        movers.concat(spawns).forEach(function (m) { land(m[0]); });
        await wait(D(120));
        rs = runsOf(at);
      }
    }

    function addScore(n) { score += n; }   // kept for state(); the cabinet shows the seven and moves, no score

    function win() {
      won = true; clearTimeout(idleT);
      $('#winTxt').textContent = 'All ' + ALL + ' found in ' + moves + ' moves.';
      $('#win').hidden = false; board.inert = true;
      capShow('win', 'Every card in the sticker book is open.');
      say('Level clear! All ' + ALL + ' actives unlocked in ' + moves + ' moves.');
      var r = wrapEl.getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top + r.height / 3, 90);
      setTimeout(function () { $('#gAgain').focus({ preventScroll: true }); }, 50);
    }

    function start() {
      if (started) return;
      started = true; wrapEl.classList.add('is-live'); board.inert = false;
      $('#cover').classList.add('is-gone');
      setTimeout(function () { $('#cover').hidden = true; }, D(360));
      sizeFx(); syncTab(true); idle();
      say('Game on. Swap neighbours to line up three. Unlock all ' + ALL + ' actives.');
    }
    $('#gStart').addEventListener('click', start);
    $('#gAgain').addEventListener('click', function () {
      score = 0; moves = 0; won = false; unlocked = []; lastCap = null;
      $('#gMoves').textContent = 0; $('#gUnl').textContent = 0; capN.textContent = '0/' + T;
      slots.forEach(function (s) { s.classList.remove('is-on'); });
      $$('.card', book).forEach(function (c) { c.classList.add('is-locked'); });
      $('#win').hidden = true; board.inert = false; clearHint(); fresh(true); syncTab(true); idle(); capIdle();
    });
    $('#gHint').addEventListener('click', function () { if (!started) start(); if (busy || won) return; hint(); });
    $('#gAll').addEventListener('click', function () {
      A.forEach(function (a, i) { reveal(i); });
      say('All ' + ALL + ' actives shown below the board.');
      toast('eye', 'All ' + ALL + ' cards are open.');
      var c = $('#card-0'); c.setAttribute('tabindex', '-1'); c.focus({ preventScroll: false });
    });

    /* pointer: tap to select / swipe to swap */
    var pd = null;
    function posOf(el) { for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (grid[r][c] && grid[r][c].el === el) return { r: r, c: c }; return null; }
    board.addEventListener('pointerdown', function (e) {
      var el = e.target.closest('.tok'); if (!el || !started || busy || won) return;
      pd = { p: posOf(el), x: e.clientX, y: e.clientY, done: false, id: e.pointerId };
      if (e.pointerType !== 'mouse') e.preventDefault();
      try { board.setPointerCapture(e.pointerId); } catch (_) {}
    });
    board.addEventListener('pointermove', function (e) {
      if (!pd || pd.done || e.pointerId !== pd.id) return;
      var dx = e.clientX - pd.x, dy = e.clientY - pd.y, cell = board.clientWidth / N;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < cell * 0.32) return;
      pd.done = true;
      var b = Math.abs(dx) > Math.abs(dy) ? { r: pd.p.r, c: pd.p.c + (dx > 0 ? 1 : -1) } : { r: pd.p.r + (dy > 0 ? 1 : -1), c: pd.p.c };
      cur = { r: pd.p.r, c: pd.p.c };
      attempt(pd.p, b);
    });
    board.addEventListener('pointerup', function (e) {
      if (!pd || e.pointerId !== pd.id) return;
      var p = pd.p, done = pd.done; pd = null;
      if (!done && p) { cur = p; syncTab(); tap(p); }
    });
    board.addEventListener('pointercancel', function () { pd = null; });
    board.addEventListener('click', function (e) { e.preventDefault(); });   // pointer + keys handle everything

    function tap(p) {
      if (busy || won) return;
      if (!sel) { setSel(p); return; }
      if (sel.r === p.r && sel.c === p.c) { setSel(null); return; }
      if (Math.abs(sel.r - p.r) + Math.abs(sel.c - p.c) === 1) { var s = sel; attempt(s, p); return; }
      setSel(p);
    }

    board.addEventListener('keydown', function (e) {
      if (!e.target.closest('.tok')) return;
      var d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
      if (d) {
        e.preventDefault();
        if (busy || won) return;
        var to = { r: cur.r + d[0], c: cur.c + d[1] };
        if (sel) { var s = sel; attempt(s, to); return; }
        if (to.r < 0 || to.r >= N || to.c < 0 || to.c >= N) return;
        cur = to; syncTab(true); return;
      }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap({ r: cur.r, c: cur.c }); say(sel ? A[grid[cur.r][cur.c].t].n + ' picked. Arrow key to swap.' : 'Released.'); return; }
      if (e.key === 'Escape') { setSel(null); }
    });
    board.addEventListener('focusin', function (e) { var p = posOf(e.target); if (p) cur = p; });

    /* glints: one soft round light rises from each matched candy; one canvas, one rAF loop, only while they live */
    var ctx = fx.getContext('2d'), parts = [], raf = 0, fw = 0;
    function sizeFx() { var r = fx.getBoundingClientRect(); fw = r.width; fx.width = Math.round(r.width * DPR); fx.height = Math.round(r.height * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
    window.addEventListener('resize', function () { if (started) sizeFx(); });
    function burst(c, r, col, n) {
      if (reduce) return;
      var cell = fw / N, x = (c + .5) * cell, y = (r + .5) * cell, t0 = performance.now(), k = parseInt(col.slice(1), 16);
      // the halo is the candy colour mixed two parts white, so it reads as light over the plum, never as a dark tint
      var tint = [k >> 16, k >> 8 & 255, k & 255].map(function (v) { return Math.round((v + 510) / 3); }).join(',');
      for (var i = 0; i < n; i++) {
        var a = -Math.PI / 2 + (Math.random() - .5) * 2.4, d = cell * (.14 + Math.random() * .14);
        parts.push({ x: x + Math.cos(a) * d * .4, y: y + Math.sin(a) * d * .4, dx: Math.cos(a) * d, dy: Math.sin(a) * d - cell * .14,
          r: cell * (.14 + Math.random() * .06), tint: tint, t0: t0, dur: 280 + Math.random() * 60 });
      }
      if (!raf) raf = requestAnimationFrame(tick);
    }
    function tick(now) {
      ctx.clearRect(0, 0, fx.width, fx.height);
      parts = parts.filter(function (p) { return now - p.t0 < p.dur; });
      parts.forEach(function (p) {
        var k = Math.max(0, now - p.t0) / p.dur, e = 1 - (1 - k) * (1 - k);   // eased travel
        // it brightens in, then goes out by shrinking to a point while still bright (a big dim glint reads as grey dust)
        var x = p.x + p.dx * e, y = p.y + p.dy * e, R = p.r * (.7 + .5 * e) * (k < .45 ? 1 : (1 - k) / .55), al = k < .3 ? k / .3 : 1;
        if (R < .5) return;
        var g = ctx.createRadialGradient(x, y, 0, x, y, R);
        g.addColorStop(0, 'rgba(255,255,255,' + al.toFixed(3) + ')');
        g.addColorStop(.35, 'rgba(' + p.tint + ',' + (al * .6).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(' + p.tint + ',0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, 6.283); ctx.fill();
      });
      raf = parts.length ? requestAnimationFrame(tick) : 0;
    }

    fresh(false);
    board.inert = true;   // under the cover the candies are out of reach (Tab goes to Press start); start() wakes them
    capN.textContent = '0/' + T; capIdle();
    // QA hook: drive the game from the screenshot tool
    window.__glowGrid = { start: start, move: function () { var m = findMove(); if (m) { if (!started) start(); return attempt(m[0], m[1]); } }, state: function () { return { score: score, moves: moves, unlocked: unlocked.filter(Boolean).length }; } };
  }

  /* ── 8. SUGAR-FREE BUBBLES: each bubble is a claim printed on the pack ──
     Popping one stamps it "On the pack" and rings the spot where the real pack front prints it.
     Every bubble is a true pack fact; nothing here names a sweetener or what the pop is free from. */
  function bubbles() {
    var bs = $$('.bub'), n = 0, out = $('#bubScore b');
    $('#bubT').textContent = bs.length;
    function ring(id) {
      $$('.spot[data-spot="' + id + '"]').forEach(function (s) {
        if (!s.classList.contains('is-on')) s.classList.add('is-on'); else bump(s, 'is-pulse');
      });
    }
    bs.forEach(function (b) {
      var name = b.textContent, id = b.getAttribute('data-spot');
      b.addEventListener('click', function () {
        if (b.classList.contains('is-popped')) { ring(id); return; }   // tap again: show me where it is
        b.classList.add('is-popped'); b.parentElement.classList.add('is-popped');
        b.setAttribute('aria-label', name + ': found on the pack');
        ring(id);
        n++; out.textContent = n; bump(out.parentElement);
        var r = b.getBoundingClientRect();
        confetti(r.left + r.width / 2, r.top + r.height / 2, 18);
        if (n === bs.length) toast('badge-check', 'All ' + bs.length + ' claims found. Sugar free, strawberry flavor, 15 g: it’s all on the pack.');
      });
    });
  }

  /* ── 8b. LARGE VIEW: pack front + gummies label (links work without JS too) ── */
  function lightbox() {
    var dlg = $('#lb'), img = $('#lbImg'), pane = $('#lbPane'), fitB = $('#lbFit'), ttl = $('#lbTitle'), opener = null, W = 0, H = 0;
    if (!dlg || typeof dlg.showModal !== 'function') return;   // no <dialog>: the links open the image itself
    function setActual(on) {
      dlg.classList.toggle('is-actual', on);
      img.style.width = on ? W + 'px' : '';      // actual = the file's own pixels, never upscaled or squeezed
      img.style.height = on ? H + 'px' : '';
      fitB.setAttribute('aria-pressed', String(on));
      fitB.innerHTML = ico(on ? 'zoom-out' : 'zoom-in') + '<span>' + (on ? 'Fit to screen' : 'Actual size') + '</span>';
      icons();
    }
    // mouse drag-to-pan at actual size (touch pans natively and pinch-zooms the page)
    var drag = null;
    pane.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0 || !dlg.classList.contains('is-actual')) return;
      drag = { x: e.clientX, y: e.clientY, l: pane.scrollLeft, t: pane.scrollTop };
      pane.classList.add('is-drag'); e.preventDefault();
      try { pane.setPointerCapture(e.pointerId); } catch (_) {}
    });
    pane.addEventListener('pointermove', function (e) {
      if (!drag) return;
      pane.scrollLeft = drag.l - (e.clientX - drag.x); pane.scrollTop = drag.t - (e.clientY - drag.y);
    });
    function endDrag() { drag = null; pane.classList.remove('is-drag'); }
    pane.addEventListener('pointerup', endDrag); pane.addEventListener('pointercancel', endDrag);
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-zoom]'); if (!a) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;   // new-tab clicks keep the link
      e.preventDefault(); opener = a;
      var pic = a.querySelector('img');
      W = +a.getAttribute('data-w'); H = +a.getAttribute('data-h');
      img.width = W; img.height = H;
      img.alt = pic ? pic.alt : '';
      img.src = a.getAttribute('href');
      ttl.textContent = a.getAttribute('data-title') || 'Full size';
      root.classList.add('lb-open');
      dlg.showModal();
      // phones: a fitted label is unreadable, so start at actual size and let people pan
      setActual(W > pane.clientWidth * 1.5);
      pane.scrollLeft = 0; pane.scrollTop = 0;
      $('#lbClose').focus();
    });
    fitB.addEventListener('click', function () { setActual(!dlg.classList.contains('is-actual')); });
    img.addEventListener('dblclick', function () { setActual(!dlg.classList.contains('is-actual')); });
    $('#lbClose').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });   // backdrop
    dlg.addEventListener('close', function () {
      root.classList.remove('lb-open');
      if (opener) opener.focus({ preventScroll: true });
    });
  }

  /* ── 9. STREAK ───────────────────────────────────────── */
  function streak() {
    var g = $('#streakGrid'), n = $('#streakN'), h = '';
    for (var i = 0; i < 28; i++) h += '<i></i>';
    g.innerHTML = h;
    var dots = $$('i', g);
    function fill(k) { dots[k].classList.add('is-on'); if (k >= 7) dots[k].classList.add('is-glow'); n.textContent = k + 1; }
    onVisible($('#streak'), function () {
      if (reduce) { dots.forEach(function (d, k) { fill(k); }); return; }
      var k = 0, t = setInterval(function () { fill(k++); if (k >= 28) clearInterval(t); }, 55);
    }, '0px 0px -25% 0px');
  }

  /* ── 10. SHOP ─────────────────────────────────────────── */
  var bagCount = 0;
  function shop() {
    var f = $('#shopForm'), sum = $('#shopSum'), sub = $('#subT');
    function q() { var c = $('input[name="tier"]:checked', f); return c ? +c.value : 1; }
    function upd() {
      var b = q();
      sum.innerHTML = b + (b === 4 ? '+' : '') + (b > 1 ? ' bags' : ' bag') + ' · ' + b * 10 + (b === 4 ? '+' : '') + ' pops · <span class="nw">$' + PH('XX') + '</span>' + (sub.checked ? ' · subscribed' : '') + ' · free shipping';
    }
    f.addEventListener('change', upd); upd();
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var b = q(), btn = $('#addBtn');
      fly(btn.getBoundingClientRect(), $('#bagBtn'), null, function () {
        bagCount += b; $('#bagN').textContent = bagCount;
        $('#bagBtn').setAttribute('aria-label', 'Your bag, ' + bagCount + ' bags');
        bump($('#bagBtn'));
      });
      toast('party-popper', 'Added ' + b + (b > 1 ? ' bags' : ' bag') + (sub.checked ? ' on subscribe & save' : '') + '. Prototype only: there’s no checkout yet.');
    });
  }

  /* ── 11. WAITLIST ─────────────────────────────────────── */
  function waitlist() {
    var f = $('#wlForm'), inp = $('#wlEmail'), msg = $('#wlMsg');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inp.value.trim())) { msg.innerHTML = ico('circle-alert') + '<span>Pop in a valid email so we can find you.</span>'; icons(); inp.focus(); return; }
      msg.innerHTML = ico('party-popper') + '<span>You’re on the list! (Prototype: nothing was sent anywhere.)</span>'; icons();
      var r = inp.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top, 60); f.reset();
    });
  }

  /* ── 12. FAQ ──────────────────────────────────────────── */
  function faq() {
    $$('#acc button').forEach(function (b) {
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') === 'true';
        b.setAttribute('aria-expanded', !open);
        document.getElementById(b.getAttribute('aria-controls')).hidden = open;
      });
    });
  }

  /* ── 13. MENU ─────────────────────────────────────────── */
  function menu() {
    var b = $('#menuBtn'), nav = $('#nav');
    function set(o) { nav.classList.toggle('is-open', o); b.setAttribute('aria-expanded', o); }
    b.addEventListener('click', function () { set(!nav.classList.contains('is-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { set(false); b.focus(); } });
  }

  /* ── 14. TOAST · FLYER · CONFETTI ─────────────────────── */
  var toastT = 0;
  function toast(i, html) {
    var t = $('#toast'); t.innerHTML = ico(i) + '<span>' + html + '</span>'; icons();
    t.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('is-on'); }, 3600);
  }
  function fly(fromRect, toEl, kind, done) {
    if (reduce || !toEl || !toEl.animate) { done(); return; }
    var to = toEl.getBoundingClientRect();
    var d = document.createElement('span'); d.className = 'flyer';
    if (kind === 'sparkle') d.style.background = 'var(--sun)';
    var x0 = fromRect.left + fromRect.width / 2 - 15, y0 = fromRect.top + fromRect.height / 2 - 15;
    var x1 = to.left + to.width / 2 - 15, y1 = to.top + to.height / 2 - 15;
    d.style.left = x0 + 'px'; d.style.top = y0 + 'px';
    document.body.appendChild(d);
    var dx = x1 - x0, dy = y1 - y0;
    var a = d.animate([
      { transform: 'translate(0,0) scale(1)' },
      { transform: 'translate(' + dx * .5 + 'px,' + (dy * .5 - 120) + 'px) scale(1.3, .8)', offset: .45 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.5)' }
    ], { duration: 700, easing: 'cubic-bezier(.45,0,.3,1)' });
    a.onfinish = function () { d.remove(); done(); };
  }
  var conf = null;
  function confetti(x, y, n) {
    if (reduce) return;
    if (!conf) {
      var cv = document.createElement('canvas'); cv.className = 'confetti'; cv.setAttribute('aria-hidden', 'true');
      cv.width = innerWidth * DPR; cv.height = innerHeight * DPR; document.body.appendChild(cv);
      var cx = cv.getContext('2d'); cx.setTransform(DPR, 0, 0, DPR, 0, 0);
      conf = { cv: cv, cx: cx, p: [], raf: 0 };
    }
    var cols = ['#FF4FA3', '#FFD23F', '#2EC5F0', '#8BD12F', '#B49BFF', '#FF8A1F'];
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (Math.random() - .5) * 2.4, s = 4 + Math.random() * 9;
      conf.p.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, w: 6 + Math.random() * 6, h: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[i % cols.length], life: 1 });
    }
    if (!conf.raf) conf.raf = requestAnimationFrame(confTick);
  }
  function confTick() {
    var c = conf, cx = c.cx;
    cx.clearRect(0, 0, innerWidth, innerHeight);
    c.p = c.p.filter(function (p) { return p.life > 0 && p.y < innerHeight + 40; });
    c.p.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.vy += .3; p.vx *= .985; p.r += p.vr; p.life -= .009;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.globalAlpha = Math.min(1, p.life * 2); cx.fillStyle = p.c;
      cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore();
    });
    if (c.p.length) c.raf = requestAnimationFrame(confTick);
    else { c.cv.remove(); conf = null; }
  }

  /* ── 15. PAUSE CSS LOOPS OFFSCREEN ────────────────────── */
  function pauseOffscreen() {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('paused', !e.isIntersecting); }); });
    $$('.hero, .tape, .sugar, .gum, .glowgrid, .coin').forEach(function (el) { io.observe(el); });
  }

  /* ── BOOT ─────────────────────────────────────────────── */
  safe('theme', function () { applyTheme(current); });
  safe('reveals', reveals);
  safe('hud', hud);
  safe('coins', coins);
  safe('switcher', switcher);
  safe('game', game);
  safe('bubbles', bubbles);
  safe('lightbox', lightbox);
  safe('streak', streak);
  safe('shop', shop);
  safe('waitlist', waitlist);
  safe('faq', faq);
  safe('menu', menu);
  safe('icons', icons);
  safe('pause', pauseOffscreen);
  safe('candy', candy);
})();

/* Polish: seat the beach under the hero candy. The sand was 20% of the hero, so on tall
   screens the lollipop and its shadow floated on the sea. Measure the contact shadow and
   put the sand line just above it (desktop two-column layout only). */
(function () {
  var hero = document.querySelector('.hero'), sh = hero && hero.querySelector('.hero-stage .stage-shadow');
  if (!hero || !sh) return;
  var t = 0;
  function seat() {
    var hr = hero.getBoundingClientRect(), sr = sh.getBoundingClientRect();
    var st = hero.querySelector('.hero-stage').getBoundingClientRect(), sub = hero.querySelector('.hero-sub');
    var top = sr.top + sr.height / 2 - hr.top - 46;            // sand line ~46px behind the shadow centre
    var h = Math.max(70, Math.round(hr.height - top));
    var sea = window.innerWidth >= 1024
      ? top - (sub.getBoundingClientRect().bottom - hr.top) - 14  // waves start just under the sub card
      : st.height * 0.42;                                         // phones: waves behind the pop's lower half
    hero.style.setProperty('--sand-h', h + 'px');
    hero.style.setProperty('--sea-h', Math.round(Math.max(70, Math.min(260, sea)) + 8) + 'px');
    hero.style.setProperty('--stage-t', Math.round(st.top - hr.top) + 'px');
    if (!hero.classList.contains('is-seated')) hero.classList.add('is-seated');
  }
  function later() { clearTimeout(t); t = setTimeout(seat, 120); }
  seat();
  window.addEventListener('resize', later);
  window.addEventListener('load', seat);
  if (window.MutationObserver) new MutationObserver(later).observe(hero, { attributes: true, attributeFilter: ['class'] }); // product switch (is-gum) re-seats
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(seat);
})();
