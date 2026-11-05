/* =============================================================================
   Glo Pop · Proposal 04 · PRISM · app.js (classic script: works from file:// + http)
   1  Helpers
   2  Data: PRODUCTS (single source of truth), INGREDIENTS, BUNDLES
   3  Theme + product state
   4  Renderers (dock, lineup, shop)
   5  Aura canvas (one low-res 2D canvas, pointer-reactive, palette morph)
   6  3D candy (hero + night glow, max 2 WebGL contexts)
   7  Hero: chips swap, pointer parallax
   8  Ingredient orbit + accessible tabs
   9  Shop interactions + waitlist
   10 FAQ accordion
   11 Header, menu, mobile shop bar
   12 Reveal + shimmer
   13 Boot
   ============================================================================= */
(function () {
  'use strict';

  /* ── 1. Helpers ─────────────────────────────────────────────────────────── */
  var doc = document, root = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var easeIO = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var ph = function (t) { return '<span class="ph">' + t + '</span>'; };
  var icon = function (n, cls) { return '<i data-lucide="' + n + '"' + (cls ? ' class="' + cls + '"' : '') + ' aria-hidden="true"></i>'; };
  function hexToRgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function drawIcons() { if (window.lucide && lucide.createIcons) { try { lucide.createIcons(); } catch (e) {} } }

  /* ── 2. Data ────────────────────────────────────────────────────────────── */
  // One object per product drives the switcher, lineup, shop, theme, aura and 3D.
  var PRODUCTS = [
    {
      id: 'strawberry-pop', kind: 'lollipop', status: 'available', statusLabel: 'Available now',
      name: 'Peptide Lollipops', short: 'Strawberry Pop', flavor: 'Strawberry',
      color: '#FF1493', deep: '#7A1B4D', tint: '#FFE4F1',
      theme: {
        'accent': '#FF1493', 'accent-ink': '#B30E66', 'accent-deep': '#7A1B4D', 'tint': '#FFE4F1', 'soft': '#FFC9E4',
        'cta': '#D6127F', 'cta-hover': '#B40D6A', 'glow': '#FF5FB0',
        'irid-a': '#E0107F', 'irid-b': '#8E45F0', 'irid-c': '#1689B5',
        'film-a': '#FF9ACF', 'film-b': '#C9A7FF', 'film-c': '#8FE3FF', 'film-d': '#FFC6A8'
      },
      aura: ['#FFC4E3', '#E5D3FF', '#CAEBFF', '#FFDDCC', '#FFB8DC'],   // last = cursor core (kept light: text sits on it)
      orb: ['#FF5FB0', '#C9A7FF', '#8FE3FF'],
      candy: { kind: 'lollipop', color: '#FF1493' },
      eyebrow: 'Peptide Lollipops · Strawberry',
      blurb: 'Collagen peptides, hyaluronic acid and glow-boosting vitamins, in a really, really good strawberry lollipop.',
      cta: { label: 'Shop the Pop', href: '#shop' },
      facts: [
        { icon: 'flame', big: '47 cal', small: 'per pop' },
        { icon: 'candy', big: 'Real sugar', small: 'no fake sweeteners' },
        { icon: 'sparkles', big: '6 actives', small: 'for skin &amp; glow' }
      ],
      visual: { type: 'photo', src: '../../images/peptide_lollipops.webp', w: 1600, h: 1600,
        alt: 'Glo Pop Peptide Lollipops pouch: strawberry flavor, 10 lollipops, with Vitamin C and collagen' },
      card: {
        title: 'Peptide Lollipops', sub: 'Strawberry',
        points: [['flame', '47 calories per pop'], ['package', '10 lollipops per bag'], ['sparkles', '6 glow actives'], ['candy', 'Made with real sugar']],
        action: { label: 'Shop now', href: '#shop', icon: 'shopping-bag' }
      },
      pack: '10 lollipops per bag',
      bar: { name: 'Peptide Lollipops · Strawberry', sub: 'From $' + ph('XX') + ' · free shipping', cta: 'Shop', href: '#shop' },
      ritual: 'One Strawberry Pop a day.'
    },
    {
      id: 'green-gummies', kind: 'gummy', status: 'coming-soon', statusLabel: 'Coming soon',
      name: 'Green Gummies', short: 'Green Gummies', nameNote: 'working name', flavor: null /* TBD */,
      color: '#1FA453', deep: '#0E4D2C', tint: '#E3F6EA',
      theme: {
        'accent': '#1FA453', 'accent-ink': '#0B6B3A', 'accent-deep': '#0E4D2C', 'tint': '#E3F6EA', 'soft': '#C4F0D9',
        'cta': '#0E7A3E', 'cta-hover': '#0A6332', 'glow': '#3DDC97',
        'irid-a': '#0E8F4A', 'irid-b': '#0B8C9E', 'irid-c': '#4F8A0B',
        'film-a': '#7FE8B8', 'film-b': '#8FE6E8', 'film-c': '#C8F27E', 'film-d': '#A8F0D0'
      },
      aura: ['#BFF4D9', '#BDEFF0', '#E0F7B8', '#D2F4E5', '#A6EDCB'],
      orb: ['#3DDC97', '#7FE7E0', '#C5F27A'],
      candy: { kind: 'gummy', color: '#1FA453' },
      eyebrow: 'Green Gummies · Coming soon',
      blurb: 'A brand-new green glow is on the way: ' + ph('flavor') + ', ' + ph('actives') + ' and ' + ph('launch date') + ' to be revealed.',
      cta: { label: 'Join the waitlist', href: '#waitlist' },
      facts: [
        { icon: 'sparkle', big: ph('Flavor'), small: 'to be revealed' },
        { icon: 'flask-conical', big: ph('Actives'), small: 'to be revealed' },
        { icon: 'calendar-days', big: ph('Launch'), small: 'join the waitlist' }
      ],
      visual: { type: 'gummy-concept' },
      card: {
        title: 'Green Gummies', sub: 'working name',
        points: [['sparkle', ph('Flavor')], ['flask-conical', ph('Actives')], ['package', ph('Gummies per pack')], ['tag', 'Price $' + ph('XX')]],
        action: { label: 'Join waitlist', href: '#waitlist', icon: 'bell' }
      },
      waitlist: {
        title: 'Be first to the <em>green glow</em>.',
        copy: 'Green Gummies are on the way and more lollipop colors are in the lab. Flavor, actives and launch date are still under wraps, so join the list to hear first.'
      },
      bar: { name: 'Green Gummies', sub: 'Coming soon · join the waitlist', cta: 'Waitlist', href: '#waitlist' },
      ritual: 'Green Gummies serving: ' + ph('serving size') + '.'
    },
    {
      id: 'next-pop', kind: 'lollipop', status: 'in-development', statusLabel: 'In development',
      name: 'More colors', short: 'More colors', flavor: null /* TBD */,
      color: '#8B3FD6', deep: '#3B1670', tint: '#F1E8FF',
      theme: {
        'accent': '#8B3FD6', 'accent-ink': '#6D28D9', 'accent-deep': '#3B1670', 'tint': '#F1E8FF', 'soft': '#DCCBFF',
        'cta': '#7C3AED', 'cta-hover': '#6528D0', 'glow': '#B98CFF',
        'irid-a': '#D9530F', 'irid-b': '#7C3AED', 'irid-c': '#2563EB',
        'film-a': '#FFB48A', 'film-b': '#C3A0FF', 'film-c': '#9CC5FF', 'film-d': '#FFD9A8'
      },
      aura: ['#FFD2B8', '#DCCBFF', '#C6DBFF', '#FFE3C2', '#FFCDB2'],
      orb: ['#F26A1B', '#8B3FD6', '#2F7BEA'],
      candy: { kind: 'lollipop', color: '#F26A1B' },
      cycle: ['#F26A1B', '#8B3FD6', '#2F7BEA'],      // teaser hues only: no names or flavors implied
      cycleAura: [
        ['#FFD2B8', '#DCCBFF', '#C6DBFF', '#FFE3C2', '#FFCDB2'],
        ['#E6D3FF', '#FFD9C4', '#C9DCFF', '#F0E2FF', '#E4D4FF'],
        ['#CFE0FF', '#E2D2FF', '#FFDCC8', '#D6F0FF', '#C4DCFF']
      ],
      eyebrow: 'More colors · In development',
      blurb: 'New shades of glow are in the lab. ' + ph('Names') + ' and ' + ph('flavors') + ' are still under wraps.',
      cta: { label: 'Get notified', href: '#waitlist' },
      facts: [
        { icon: 'palette', big: ph('Colors'), small: 'in the lab' },
        { icon: 'candy', big: ph('Flavors'), small: 'under wraps' },
        { icon: 'bell', big: 'Be first', small: 'get notified' }
      ],
      visual: { type: 'silhouettes' },
      card: {
        title: 'More colors', sub: 'in development',
        points: [['palette', ph('Color names')], ['candy', ph('Flavors')], ['calendar-days', ph('Launch date')]],
        action: { label: 'Get notified', href: '#waitlist', icon: 'bell' }
      },
      bar: { name: 'More colors', sub: 'In development · get notified', cta: 'Notify me', href: '#waitlist' },
      ritual: 'New colors: ' + ph('serving details') + '.'
    }
  ];

  var INGREDIENTS = [
    { id: 'collagen', name: 'Collagen Peptides', short: 'Collagen', icon: 'gem',
      desc: 'Supports skin elasticity and hydration from within for a youthful, plump complexion.',
      chips: [['sparkles', 'Firm &amp; Plump'], ['droplet', 'Hydration']] },
    { id: 'hyaluronic', name: 'Hyaluronic Acid', short: 'Hyaluronic', icon: 'droplet',
      desc: 'Helps lock in moisture for plump, dewy skin that glows from the inside out.',
      chips: [['droplet', 'Hydration'], ['sun', 'Dewy Glow']] },
    { id: 'vitamin-c', name: 'Vitamin C', short: 'Vitamin C', icon: 'citrus',
      desc: 'Helps brighten your complexion and protect against free radicals and environmental stress.',
      chips: [['sun', 'Brightening'], ['shield', 'Antioxidant']] },
    { id: 'b12', name: 'Vitamin B12', short: 'B12', icon: 'zap',
      desc: 'Supports energy and a healthy metabolism, so you feel as good as you look.',
      chips: [['zap', 'Energy'], ['activity', 'Metabolism']] },
    { id: 'b6', name: 'Vitamin B6', short: 'B6', icon: 'sparkles',
      desc: 'Promotes clear, radiant skin by supporting your body’s natural renewal processes.',
      chips: [['smile', 'Clear Skin'], ['refresh-cw', 'Renewal']] },
    { id: 'zinc', name: 'Zinc', short: 'Zinc', icon: 'shield-check',
      desc: 'Supports immune function and skin repair for a healthy, balanced complexion.',
      chips: [['shield-check', 'Immunity'], ['heart-pulse', 'Skin Repair']] }
  ];

  // Bundle structure is a proposal; every price and saving is a placeholder.
  // Notes describe supply only (one a day), never a results timeline.
  var BUNDLES = [
    { id: 'b1', bags: 1, pops: 10, title: 'The Taste', note: 'a 10-day supply' },
    { id: 'b3', bags: 3, pops: 30, title: 'The Glow Month', note: 'a month of daily pops', save: true },
    { id: 'b6', bags: 6, pops: 60, title: 'The Stock-Up', note: 'two months of daily pops', save: true }
  ];

  /* ── 3. Theme + product state ───────────────────────────────────────────── */
  var current = PRODUCTS[0];
  var byId = function (id) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i]; return null; };
  var listeners = [];
  function onProduct(fn) { listeners.push(fn); }

  function applyTheme(p) {
    var t = p.theme;
    Object.keys(t).forEach(function (k) { root.style.setProperty('--' + k, t[k]); });
    root.dataset.product = p.id;
    root.dataset.kind = p.kind;
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t.accent);
  }

  function selectProduct(id) {
    var p = byId(id);
    if (!p || p === current) return;
    current = p;
    applyTheme(p);
    $$('[data-pick]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-pick') === p.id)); });
    var live = $('#announcer');
    if (live) live.textContent = 'Now previewing ' + p.short + ', ' + p.statusLabel.toLowerCase() + '.';
    listeners.forEach(function (fn) { fn(p); });
  }

  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-pick]');
    if (b) selectProduct(b.getAttribute('data-pick'));
  });

  /* ── 4. Renderers ───────────────────────────────────────────────────────── */
  function renderDock() {
    var dock = $('#dock');
    if (!dock) return;
    dock.innerHTML = PRODUCTS.map(function (p) {
      return '<button class="dock-btn" type="button" data-pick="' + p.id + '" aria-pressed="' + (p === current) + '">' +
        '<span class="dock-orb" style="--o1:' + p.orb[0] + ';--o2:' + p.orb[1] + ';--o3:' + p.orb[2] + '" aria-hidden="true"></span>' +
        '<span class="dock-txt"><b>' + p.short + '</b><small>' + p.statusLabel + '</small></span>' +
        '</button>';
    }).join('');
  }

  // concept gummy art (no gummy photo exists); colors come from the card's product tokens
  function gummySVG() {
    function g(cx, cy, rot) {
      return '<g filter="url(#gmSoft)" transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')">' +
        '<rect x="' + (cx - 62) + '" y="' + (cy - 45) + '" width="124" height="90" rx="40" fill="url(#gmBody)"/>' +
        '<rect x="' + (cx - 62) + '" y="' + (cy - 45) + '" width="124" height="90" rx="40" fill="url(#gmSugar)"/>' +
        '<ellipse cx="' + (cx - 20) + '" cy="' + (cy - 24) + '" rx="27" ry="8" fill="#fff" fill-opacity=".6"/></g>';
    }
    return '<svg viewBox="0 0 330 240" aria-hidden="true" focusable="false"><defs>' +
      '<radialGradient id="gmBody" cx="34%" cy="26%" r="90%"><stop offset="0" style="stop-color:#F2FFF7"/><stop offset=".42" style="stop-color:var(--pc-fa)"/><stop offset="1" style="stop-color:var(--pc)"/></radialGradient>' +
      '<pattern id="gmSugar" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2.5" r="1" fill="#fff" fill-opacity=".8"/><circle cx="6.6" cy="7" r=".8" fill="#fff" fill-opacity=".6"/></pattern>' +
      '<filter id="gmSoft" x="-25%" y="-25%" width="150%" height="170%"><feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#0E4D2C" flood-opacity=".22"/></filter>' +
      '</defs>' + g(84, 150, -15) + g(232, 160, 13) + g(160, 82, 4) + '</svg>';
  }
  function cardVisual(p) {
    var v = p.visual || {};
    if (v.type === 'photo') {
      return '<div class="pv pv--photo"><img src="' + v.src + '" width="' + v.w + '" height="' + v.h + '" alt="' + v.alt + '" loading="lazy" decoding="async"></div>';
    }
    if (v.type === 'gummy-concept') {
      return '<div class="pv pv--gummy" role="img" aria-label="Concept render of Green Gummies, final look to be announced">' + gummySVG() +
        '<p class="pv-cap" aria-hidden="true">' + icon('sparkles') + 'Concept render</p></div>';
    }
    return '<div class="pv pv--sil" role="img" aria-label="Lollipop silhouettes in teaser colors behind frosted glass">' +
      '<span class="sil"></span><span class="sil"></span><span class="sil"></span><span class="frost"></span>' +
      '<p class="pv-cap" aria-hidden="true">' + icon('flask-conical') + 'In the lab</p></div>';
  }
  // per-product color world as CSS tokens (cards, shop, waitlist keep their own product colors)
  function tokens(p) {
    var t = p.theme;
    return '--pc:' + t.accent + ';--pc-ink:' + t['accent-ink'] + ';--pc-tint:' + t.tint + ';--pc-cta:' + t.cta + ';--pc-cta-h:' + t['cta-hover'] +
      ';--pc-fa:' + t['film-a'] + ';--pc-fb:' + t['film-b'] + ';--pc-fc:' + t['film-c'];
  }
  function renderLineup() {
    var grid = $('#lineupGrid');
    if (!grid) return;
    grid.style.setProperty('--rows', String(Math.max(1, PRODUCTS.length - 1)));
    grid.innerHTML = PRODUCTS.map(function (p, i) {
      var c = p.card;
      var orb = '--o1:' + p.orb[0] + ';--o2:' + p.orb[1] + ';--o3:' + p.orb[2];
      return '<article class="pcard glass glass--film reveal d' + (i + 1) + (p === current ? ' is-current' : '') + '" data-card="' + p.id + '" data-status="' + p.status + '" style="' + tokens(p) + '">' +
        cardVisual(p) +
        '<div class="pcard-body">' +
          '<div class="pcard-top"><span class="status">' + p.statusLabel + '</span></div>' +
          '<h3 class="pcard-title">' + c.title + ' <em>' + c.sub + '</em></h3>' +
          '<ul class="pcard-points">' + c.points.map(function (pt) { return '<li>' + icon(pt[0], 'ic') + '<span>' + pt[1] + '</span></li>'; }).join('') + '</ul>' +
          '<div class="pcard-actions">' +
            '<a class="btn ' + (p.status === 'available' ? 'btn-cta' : 'btn-ghost') + ' btn-sm" href="' + c.action.href + '">' + icon(c.action.icon) + c.action.label + '</a>' +
            '<button class="aura-btn" type="button" data-pick="' + p.id + '" aria-pressed="' + (p === current) + '" aria-label="Preview aura: ' + p.short + '">' +
              '<span class="aura-orb" style="' + orb + '" aria-hidden="true"></span>Preview aura</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  // shop: a buy module per available product + one waitlist for everything not yet available
  function buyHTML(p) {
    var id = p.id, v = p.visual;
    var media = v.type === 'photo'
      ? '<img src="' + v.src + '" width="' + v.w + '" height="' + v.h + '" alt="' + v.alt + '" loading="lazy" decoding="async">'
      : cardVisual(p);
    return '<form class="buy glass glass--strong glass--film reveal" data-buy="' + id + '" style="' + tokens(p) + '" novalidate>' +
      '<div class="buy-media">' + media + (p.pack ? '<p class="pv-cap">' + icon('package') + p.pack + '</p>' : '') + '</div>' +
      '<div class="buy-body">' +
        '<div class="pcard-top"><span class="status">' + p.statusLabel + '</span></div>' +
        '<h3 class="buy-title">' + p.name + ' <em>' + (p.flavor || ph('Flavor')) + '</em></h3>' +
        '<fieldset class="seg-wrap"><legend class="opt-label">How would you like it?</legend><div class="seg">' +
          '<label class="seg-opt is-checked"><input type="radio" name="ptype-' + id + '" value="once" checked><span>One-time</span></label>' +
          '<label class="seg-opt"><input type="radio" name="ptype-' + id + '" value="sub"><span>Subscribe &amp; save ' + ph('X%') + '</span></label>' +
        '</div></fieldset>' +
        '<fieldset class="bundles"><legend class="opt-label">Choose your pack</legend>' +
        BUNDLES.map(function (b, i) {
          var on = i === 1;
          return '<label class="bundle' + (on ? ' is-checked' : '') + '" data-title="' + b.title + '">' +
            '<input type="radio" name="bundle-' + id + '" value="' + b.id + '"' + (on ? ' checked' : '') + '>' +
            '<span class="bundle-radio" aria-hidden="true"></span>' +
            '<span class="bundle-main"><span class="bundle-name">' + b.title + (b.save ? ' <span class="save-tag">Save ' + ph('X%') + '</span>' : '') + '</span>' +
            '<span class="bundle-meta">' + b.bags + (b.bags > 1 ? ' bags' : ' bag') + ' · ' + b.pops + ' pops · ' + b.note + '</span></span>' +
            '<span class="bundle-price"><span>$' + ph('XX') + '</span><small>$' + ph('X.XX') + ' / pop</small></span>' +
          '</label>';
        }).join('') +
        '</fieldset>' +
        '<p class="buy-sum"><span data-sum></span><b>$' + ph('XX') + '</b></p>' +
        '<button class="btn btn-cta btn-block" type="submit">' + icon('shopping-bag') + '<span data-buy-label>Add to bag</span></button>' +
        '<p class="form-msg" role="status" aria-live="polite"></p>' +
        '<ul class="buy-perks"><li>' + icon('truck') + 'Free shipping on every order</li>' +
          '<li>' + icon('repeat') + '<span>Subscription cadence and terms: ' + ph('terms') + '</span></li></ul>' +
      '</div>' +
    '</form>';
  }
  function waitlistHTML(list) {
    if (!list.length) return '';
    var lead = list[0], w = lead.waitlist || { title: 'Be first to know.', copy: 'Join the list to hear first.' };
    return '<div class="waitlist glass glass--strong glass--film reveal d2" id="waitlist" style="' + tokens(lead) + '">' +
      '<div class="wl-orbs" aria-hidden="true"><span></span><span></span><span></span></div>' +
      '<div class="wl-copy">' +
        '<span class="status">' + lead.statusLabel + '</span>' +
        '<h3 class="wl-title">' + w.title + '</h3>' +
        '<p>' + w.copy + '</p>' +
      '</div>' +
      '<form class="wl-form" novalidate>' +
        '<fieldset class="wl-opts"><legend class="opt-label">Tell me about</legend>' +
        list.map(function (p, i) {
          return '<label class="check"><input type="checkbox" name="interest" value="' + p.id + '"' + (i === 0 ? ' checked' : '') + '>' + p.short + '<small>' + p.statusLabel + '</small></label>';
        }).join('') +
        '</fieldset>' +
        '<label class="field"><span>Email</span><input type="email" name="email" autocomplete="email" placeholder="you@example.com" required aria-describedby="wlMsg"></label>' +
        '<button class="btn btn-cta btn-block" type="submit">' + icon('bell') + 'Join the waitlist</button>' +
        '<p class="form-msg" id="wlMsg" role="status" aria-live="polite"></p>' +
      '</form>' +
    '</div>';
  }
  function renderShop() {
    var grid = $('#shopGrid');
    if (!grid) return;
    var avail = PRODUCTS.filter(function (p) { return p.status === 'available'; });
    var later = PRODUCTS.filter(function (p) { return p.status !== 'available'; });
    grid.innerHTML = avail.map(buyHTML).join('') + waitlistHTML(later);
  }

  /* ── 5. Aura canvas ─────────────────────────────────────────────────────── */
  var pointer = { x: .5, y: .4, active: false, last: 0 };
  var Aura = (function () {
    var cvs = $('#aura');
    if (!cvs || !cvs.getContext) return null;
    var ctx = cvs.getContext('2d', { alpha: false });
    if (!ctx) return null;
    var DIV = 9;                                   // css px per canvas px: tiny canvas, smooth upscale
    var w = 0, h = 0, vw = 0, vh = 0;
    var cur = current.aura.map(hexToRgb), from = cur.slice(), to = cur.slice(), mStart = 0, mDur = 1500, morphing = false;
    var blobs = [
      { x: .14, y: .2, ax: .1, ay: .08, s: .21, ph: 0, r: .6, c: 0, a: .9 },
      { x: .88, y: .16, ax: .08, ay: .1, s: .17, ph: 1.7, r: .56, c: 1, a: .9 },
      { x: .82, y: .86, ax: .12, ay: .07, s: .23, ph: 3.1, r: .62, c: 2, a: .85 },
      { x: .12, y: .86, ax: .08, ay: .09, s: .19, ph: 4.4, r: .54, c: 3, a: .85 }
    ];
    var core = { x: .5, y: .4, r: .36, c: 4, a: .8 };
    var t = 0, last = 0, running = false, covered = false, scrollPh = 0, scrollT = 0;

    function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + a + ')'; }
    function blob(x, y, r, c, a) {
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(c, a));
      g.addColorStop(.5, rgba(c, a * .5));
      g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    function draw() {
      ctx.fillStyle = '#FFF8FC';
      ctx.fillRect(0, 0, w, h);
      var m = Math.max(w, h);
      for (var i = 0; i < blobs.length; i++) {
        var b = blobs[i], k = t * .001 * b.s + b.ph + scrollPh;
        blob((b.x + Math.sin(k) * b.ax) * w, (b.y + Math.cos(k * 1.3) * b.ay) * h, b.r * m, cur[b.c], b.a);
      }
      blob(core.x * w, core.y * h, core.r * m, cur[core.c], core.a);
    }
    function resize() {
      vw = window.innerWidth; vh = window.innerHeight;
      w = Math.max(24, Math.ceil(vw / DIV)); h = Math.max(24, Math.ceil(vh / DIV));
      cvs.width = w; cvs.height = h;
      draw();
    }
    function frame(now) {
      if (!running) return;
      requestAnimationFrame(frame);
      var dt = Math.min(64, now - (last || now)); last = now;
      if (doc.hidden || covered) return;
      t += dt;
      if (morphing) {
        var k = clamp((now - mStart) / mDur, 0, 1), e = easeIO(k);
        for (var i = 0; i < cur.length; i++) cur[i] = [0, 1, 2].map(function (j) { return from[i][j] + (to[i][j] - from[i][j]) * e; });
        if (k >= 1) morphing = false;
      }
      // the core follows the cursor; with no recent pointer (or on touch) it drifts on its own
      var drift = !pointer.active || now - pointer.last > 5000;
      var tx = drift ? .5 + Math.sin(t * .00021) * .3 : pointer.x;
      var ty = drift ? .42 + Math.cos(t * .00016) * .2 : pointer.y;
      core.x += (tx - core.x) * .045;
      core.y += (ty - core.y) * .045;
      scrollPh += (scrollT - scrollPh) * .06;
      draw();
      Hero.tick(core.x, core.y);
    }
    function setPalette(hexes) {
      to = hexes.map(hexToRgb);
      if (reduce || !running) { cur = to.slice(); draw(); return; }
      from = cur.map(function (c) { return c.slice(); });
      mStart = performance.now(); morphing = true;
    }
    function onScroll() {
      scrollT = window.scrollY * .00042;
      var night = $('#ritual');
      if (night) { var r = night.getBoundingClientRect(); covered = r.top <= 0 && r.bottom >= vh; }
    }
    resize();
    window.addEventListener('resize', function () { resize(); }, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    if (!reduce) { running = true; requestAnimationFrame(frame); }
    return { setPalette: setPalette };
  })();

  if (finePointer && !reduce) {
    window.addEventListener('pointermove', function (e) {
      pointer.x = e.clientX / window.innerWidth;
      pointer.y = e.clientY / window.innerHeight;
      pointer.active = true; pointer.last = performance.now();
    }, { passive: true });
  }

  /* ── 6. 3D candy (hero + night) ─────────────────────────────────────────── */
  var ENV_LIGHT = ['#fff6fb', '#c9a8ff', '#9fe3ff', '#ffb89a'];
  var candies = [];

  function tuneCandy(c) {
    c.api.scene.traverse(function (o) {
      if (!o.isMesh || !o.material || !o.material.emissive) return;
      var m = o.material;
      if (m.userData.prism || m.emissive.getHex() === 0) return;      // stick stays white + untouched
      m.userData.prism = true;
      if (m.bumpMap) {                                                  // gummy: add a soft holographic film
        m.iridescence = .55; m.iridescenceIOR = 1.45; m.iridescenceThicknessRange = [180, 820];
        if (c.mode === 'night') m.emissiveIntensity = .2;
        m.needsUpdate = true;
      } else {
        // the shared candy is lit by a real beach HDRI now: only widen the film, and add a
        // little glow at night (forcing env/emissive up washes it out to milky pastel)
        if (c.mode === 'night') m.emissiveIntensity = .25;
        m.iridescenceThicknessRange = [100, 1200];
      }
    });
  }
  function currentModel(api) {
    var lean = api.root.children[0], spinner = lean && lean.children[0];
    return spinner && spinner.children[0];
  }
  // keep the framing right for whichever model is on screen (lollipop vs gummy cluster).
  // frames(): { lollipop: {s, y}, gummy: {s, y} } for the current viewport; mirrored by
  // the --head-* tokens in style.css so the halo + glow sit on the candy.
  function frameLoop(c) {
    c.until = performance.now() + 2600;
    if (c.raf) return;
    var step = function () {
      var m = currentModel(c.api), kind = (m && m.userData.kind) || c.kind, f = c.frames()[kind], r = c.api.root;
      var ds = f.s - r.scale.x, dy = f.y - r.position.y;
      r.scale.setScalar(r.scale.x + ds * .2);
      r.position.y += dy * .2;
      tuneCandy(c);
      if (performance.now() > c.until && Math.abs(ds) < .002 && Math.abs(dy) < .002) { c.raf = 0; return; }
      c.raf = requestAnimationFrame(step);
    };
    c.raf = requestAnimationFrame(step);
  }
  function makeCandy(mount, opts, frames, mode) {
    if (!mount || !window.GloCandy) { if (opts.fallback) opts.fallback.hidden = false; return Promise.resolve(null); }
    return GloCandy.create(mount, opts).then(function (api) {
      if (!api) return null;
      var c = { api: api, frames: frames, mode: mode, kind: opts.product.kind, raf: 0, until: 0, cycle: 0 };
      var f = frames()[c.kind];
      api.root.scale.setScalar(f.s); api.root.position.y = f.y;
      tuneCandy(c);
      candies.push(c);
      window.addEventListener('resize', function () { frameLoop(c); }, { passive: true });
      if (current.candy.kind !== c.kind || current.candy.color !== opts.product.color) candySet(c, current);
      return c;
    });
  }
  function candySet(c, p) {
    c.kind = p.candy.kind;
    c.api.setProduct({ kind: p.candy.kind, color: p.candy.color }, { duration: .9 });
    frameLoop(c);
  }
  var cycleTimer = 0;
  function startCycle(p) {
    clearInterval(cycleTimer); cycleTimer = 0;
    if (!p.cycle || reduce) return;
    var i = 0;
    cycleTimer = setInterval(function () {
      if (doc.hidden) return;
      i = (i + 1) % p.cycle.length;
      candies.forEach(function (c) { if (c.kind === 'lollipop') c.api.setColor(p.cycle[i], { duration: 1.2 }); });
      if (Aura && p.cycleAura) Aura.setPalette(p.cycleAura[i]);
    }, 2800);
  }

  var HERO_FRAMES = {
    mobile: { lollipop: { s: 1.15, y: -.56 }, gummy: { s: .7, y: .48 } },     // < 700px
    wide: { lollipop: { s: 1, y: -.3 }, gummy: { s: .62, y: .47 } }
  };
  function initHeroCandy() {
    return makeCandy($('#heroCandy'), {
      preset: 'iridescent', product: { kind: 'lollipop', color: '#FF1493' },
      env: ENV_LIGHT, exposure: 1.12, zoom: 1.15, tilt: .22, spin: .0042,
      fallback: $('#heroFallback')
    }, function () { return window.innerWidth < 700 ? HERO_FRAMES.mobile : HERO_FRAMES.wide; }, 'light').then(function (c) {
      if (c) root.classList.add('candy-ready');
    });
  }

  /* ── 7. Hero: product copy swap + pointer parallax ──────────────────────── */
  var Hero = (function () {
    var el = $('#hero'), visible = true, px = 0, py = 0;
    if (el && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(el);
    }
    function factHTML(f, i) {
      return '<li class="fact fact--' + 'abc'.charAt(i) + '"><span class="fact-ic">' + icon(f.icon) + '</span>' +
        '<span class="fact-tx"><b>' + f.big + '</b><small>' + f.small + '</small></span></li>';
    }
    function fill(p) {
      var s = function (n) { return $('[data-slot="' + n + '"]', el); };
      if (s('eyebrow')) s('eyebrow').innerHTML = p.eyebrow;
      if (s('blurb')) s('blurb').innerHTML = p.blurb;
      if (s('ctaLabel')) s('ctaLabel').textContent = p.cta.label;
      if (s('cta')) s('cta').setAttribute('href', p.cta.href);
      var facts = $('.glow-facts', el);
      if (facts) facts.innerHTML = p.facts.map(factHTML).join('');
      drawIcons();
    }
    function swap(p) {
      if (!el) return;
      if (reduce) { fill(p); return; }
      el.classList.add('is-swapping');
      setTimeout(function () { fill(p); el.classList.remove('is-swapping'); }, 280);
    }
    var lastPx = '', lastPy = '', lastSy = '';
    function tick(x, y) {
      if (!el || !visible) return;
      var tx = (x - .5) * 2, ty = (y - .45) * 2;
      px += (tx - px) * .08; py += (ty - py) * .08;
      var sPx = px.toFixed(3), sPy = py.toFixed(3), sSy = Math.min(window.scrollY, 1200).toFixed(0);
      if (sPx !== lastPx) { el.style.setProperty('--px', sPx); lastPx = sPx; }      // write only on change
      if (sPy !== lastPy) { el.style.setProperty('--py', sPy); lastPy = sPy; }
      if (sSy !== lastSy) { el.style.setProperty('--sy', sSy); lastSy = sSy; }
    }
    return { swap: swap, tick: tick };
  })();

  /* ── 8. Ingredient orbit (adapted from ingredient-orbit-component.html) ──── */
  // Pointer users grab and fling the ring; the tablist is the keyboard + screen
  // reader interface and drives the same state. The ring itself is aria-hidden.
  function initOrbit() {
    var stage = $('#orbit'), info = $('.orbit-info');
    if (!stage || !info) return;
    var tabs = $$('.ing-tab', info), panels = $$('.ing-panel', info), pauseBtn = $('.orbit-pause', info);
    var line = $('.orbit-link line', stage);
    var N = INGREDIENTS.length, SQUASH = .56, IDLE = .0016, CYCLE = 3200, TAU = Math.PI * 2;
    var bubbles = INGREDIENTS.map(function (ing, i) {
      var b = doc.createElement('span');
      b.className = 'ob';
      b.setAttribute('data-i', i);
      b.innerHTML = icon(ing.icon) + '<span class="ob-label">' + ing.short + '</span>';
      stage.appendChild(b);
      return b;
    });
    drawIcons();
    var active = 0, ang = Math.PI / 2, prevAng = ang, angVel = 0, targetAng = null;
    var engaged = false, hoverIdx = -1, graceUntil = 0, cycleAcc = 0, last = 0, raf = 0;
    var dragging = false, lastPA = 0, moved = 0, downX = 0, downY = 0;
    var userPaused = false, inView = false, focusIn = false, R = 150, cx = 0, cy = 0;

    function measure() {
      cx = stage.clientWidth / 2; cy = stage.clientHeight / 2;
      R = Math.max(90, Math.min(cx - 40, (cy - 46) / SQUASH, 250));
      stage.style.setProperty('--R', R.toFixed(0) + 'px');
      stage.style.setProperty('--squash', String(SQUASH));
    }
    function layout() {
      var ax = cx, ay = cy;
      for (var i = 0; i < N; i++) {
        var a = ang + i / N * TAU;
        var x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * SQUASH, depth = (Math.sin(a) + 1) / 2;
        var sc = (.74 + depth * .42) * (i === active ? 1.16 : 1);
        var b = bubbles[i];
        b.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + sc.toFixed(3) + ')';
        b.style.zIndex = String(2 + Math.round(depth * 6) + (i === active ? 20 : 0));
        b.style.opacity = (i === active ? 1 : .5 + depth * .5).toFixed(2);
        if (i === active) { ax = x; ay = y; }
      }
      line.setAttribute('x1', ax.toFixed(1)); line.setAttribute('y1', ay.toFixed(1));
      line.setAttribute('x2', cx.toFixed(1)); line.setAttribute('y2', (cy - 30).toFixed(1));
    }
    function setActive(i) {
      active = (i + N) % N;
      bubbles.forEach(function (b, j) { b.classList.toggle('is-active', j === active); });
      tabs.forEach(function (t, j) { var on = j === active; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      panels.forEach(function (p, j) { p.hidden = j !== active; });
      if (reduce || !raf) layout();
    }
    function toFront(i) {                                   // ease the ring so item i sits at the front
      var want = Math.PI / 2 - i / N * TAU;
      var k = Math.round((ang - want) / TAU);
      targetAng = want + k * TAU;
      if (reduce) { ang = targetAng; targetAng = null; layout(); }
    }
    function engage(i) { engaged = true; hoverIdx = i; graceUntil = 0; if (i !== active) setActive(i); }
    function release() { hoverIdx = -1; graceUntil = performance.now() + 2600; }
    function pAngle(e) {
      var r = stage.getBoundingClientRect();
      return Math.atan2(((e.clientY - r.top) - cy) / SQUASH, (e.clientX - r.left) - cx);
    }

    bubbles.forEach(function (b, idx) {
      b.addEventListener('pointerenter', function (e) { if (!dragging && e.pointerType === 'mouse') engage(idx); });
      b.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') release(); });
      b.addEventListener('click', function () { if (moved < 6) { engage(idx); release(); } });
    });
    tabs.forEach(function (t, j) {
      t.addEventListener('click', function () { engage(j); release(); toFront(j); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = null;
        if (k === 'ArrowRight' || k === 'ArrowDown') n = j + 1;
        else if (k === 'ArrowLeft' || k === 'ArrowUp') n = j - 1;
        else if (k === 'Home') n = 0;
        else if (k === 'End') n = N - 1;
        if (n === null) return;
        e.preventDefault();
        n = (n + N) % N;
        tabs[n].focus(); engage(n); release(); toFront(n);
      });
    });
    info.addEventListener('focusin', function () { focusIn = true; engaged = true; graceUntil = 0; });
    info.addEventListener('focusout', function () { focusIn = false; release(); });
    if (pauseBtn) {
      if (reduce) pauseBtn.hidden = true;
      pauseBtn.addEventListener('click', function () {
        userPaused = !userPaused;
        pauseBtn.setAttribute('aria-pressed', String(userPaused));
        $('span', pauseBtn).textContent = userPaused ? 'Orbit paused' : 'Pause orbit';
      });
    }
    if (!reduce) {
      stage.addEventListener('pointerdown', function (e) {
        dragging = true; stage.classList.add('is-dragging');
        lastPA = pAngle(e); moved = 0; downX = e.clientX; downY = e.clientY; targetAng = null;
        try { stage.setPointerCapture(e.pointerId); } catch (_) {}
      });
      stage.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        moved = Math.hypot(e.clientX - downX, e.clientY - downY);
        var a = pAngle(e), d = a - lastPA;
        if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU;
        ang += d; lastPA = a;
      });
      var end = function () { dragging = false; stage.classList.remove('is-dragging'); };
      stage.addEventListener('pointerup', end);
      stage.addEventListener('pointercancel', end);
    }
    function frame(ts) {
      if (!inView) { raf = 0; last = 0; return; }
      raf = requestAnimationFrame(frame);
      if (!last) last = ts;
      var dt = Math.min(80, ts - last); last = ts;
      var T = performance.now();
      if (engaged && hoverIdx < 0 && !focusIn && graceUntil && T > graceUntil) { engaged = false; cycleAcc = 0; }
      if (dragging) angVel = clamp(ang - prevAng, -.5, .5);
      else if (targetAng !== null) {
        var d = targetAng - ang; ang += d * .085; angVel = 0;
        if (Math.abs(d) < .002) { ang = targetAng; targetAng = null; }
      } else {
        var idle = userPaused ? 0 : IDLE;
        angVel += (idle - angVel) * .03; ang += angVel;
      }
      prevAng = ang;
      var settled = !dragging && !engaged && !userPaused && targetAng === null && Math.abs(angVel - IDLE) < .006;
      if (settled) { cycleAcc += dt; if (cycleAcc >= CYCLE) { cycleAcc = 0; setActive(active + 1); } } else cycleAcc = 0;
      layout();
    }
    measure(); setActive(0); layout();
    window.addEventListener('resize', function () { measure(); layout(); }, { passive: true });
    if (reduce) return;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        inView = e[0].isIntersecting;
        if (inView && !raf) raf = requestAnimationFrame(frame);
      }, { rootMargin: '80px' }).observe(stage);
    } else { inView = true; raf = requestAnimationFrame(frame); }
  }

  /* ── 9. Shop interactions + waitlist (prototype: no network) ───────────── */
  function initShop() {
    $$('.buy').forEach(function (form) {
      var segs = $$('.seg-opt', form), bundles = $$('.bundle', form);
      var sum = $('[data-sum]', form), label = $('[data-buy-label]', form), msg = $('.form-msg', form);
      function sync() {
        segs.forEach(function (s) { s.classList.toggle('is-checked', $('input', s).checked); });
        bundles.forEach(function (b) { b.classList.toggle('is-checked', $('input', b).checked); });
        var sub = !!$('input[value="sub"]:checked', form);
        var chosen = bundles.filter(function (b) { return $('input', b).checked; })[0];
        if (sum) sum.innerHTML = (chosen ? chosen.getAttribute('data-title') : '') + ' · ' + (sub ? 'delivered every ' + ph('X weeks') : 'one-time');
        if (label) label.textContent = sub ? 'Start my subscription' : 'Add to bag';
        msg.textContent = '';
      }
      form.addEventListener('change', sync);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        msg.textContent = 'Prototype: checkout isn’t connected yet, so nothing was added. Real pricing lands at launch.';
      });
      sync();
    });
    $$('.wl-form').forEach(function (form) {
      var msg = $('.form-msg', form), email = $('input[type="email"]', form);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
        email.setAttribute('aria-invalid', String(!ok));
        msg.classList.toggle('is-error', !ok);
        if (!ok) { msg.textContent = 'Please enter a valid email so we can save your spot.'; email.focus(); return; }
        msg.textContent = 'You’re on the list! (Prototype: nothing was sent and no data left this page.)';
      });
    });
  }

  /* ── 10. FAQ accordion ──────────────────────────────────────────────────── */
  function initFAQ() {
    $$('.faq-item').forEach(function (item) {
      var btn = $('.faq-q button', item);
      if (!btn) return;
      item.classList.toggle('is-open', btn.getAttribute('aria-expanded') === 'true');
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        item.classList.toggle('is-open', open);
      });
    });
  }

  /* ── 6b. Night Glow candy (2nd WebGL context, created on approach) ──────── */
  var NIGHT_FRAMES = { lollipop: { s: 1, y: -.05 }, gummy: { s: .8, y: .2 } };
  function initNightCandy() {
    var mount = $('#nightCandy');
    if (!mount) return;
    var go = function () {
      makeCandy(mount, {
        preset: 'iridescent', product: { kind: current.candy.kind, color: current.candy.color },
        environment: 'studio', exposure: 1.2, zoom: 1.05, tilt: .2, spin: .003, fallback: $('#nightFallback')
      }, function () { return NIGHT_FRAMES; }, 'night');
    };
    if (!('IntersectionObserver' in window)) { go(); return; }
    var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { io.disconnect(); go(); } }, { rootMargin: '700px 0px' });
    io.observe(mount);
  }

  // ritual glow-line fills as the steps scroll through the viewport
  function initSteps() {
    var steps = $('#steps');
    if (!steps) return;
    if (reduce) { steps.style.setProperty('--p', '1'); return; }
    var queued = false;
    function upd() {
      queued = false;
      var r = steps.getBoundingClientRect(), vh = window.innerHeight;
      if (r.bottom < -200 || r.top > vh + 200) return;
      var p = clamp((vh * .82 - r.top) / (r.height + vh * .25), 0, 1);
      steps.style.setProperty('--p', p.toFixed(3));
    }
    window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }

  /* ── 11b. Mobile shop bar ───────────────────────────────────────────────── */
  function initShopbar() {
    var bar = $('#shopbar');
    if (!bar || !('IntersectionObserver' in window)) return;
    var heroOut = false, shopIn = false, footIn = false;
    function upd() { bar.classList.toggle('is-on', heroOut && !shopIn && !footIn); }
    new IntersectionObserver(function (e) { heroOut = !e[0].isIntersecting; upd(); }, { rootMargin: '0px 0px -55% 0px' }).observe($('#hero'));
    var shop = $('#shop'), foot = $('.site-footer');
    if (shop) new IntersectionObserver(function (e) { shopIn = e[0].isIntersecting; upd(); }).observe(shop);
    if (foot) new IntersectionObserver(function (e) { footIn = e[0].isIntersecting; upd(); }).observe(foot);
  }
  function fillShopbar(p) {
    var b = p.bar || {};
    var n = $('[data-bar="name"]'), s = $('[data-bar="sub"]'), c = $('[data-bar="cta"]');
    if (n) n.textContent = b.name || p.short;
    if (s) s.innerHTML = b.sub || p.statusLabel;
    if (c) { c.textContent = b.cta || 'Shop'; c.setAttribute('href', b.href || '#shop'); }
  }

  /* ── 11. Header, menu ───────────────────────────────────────────────────── */
  function initHeader() {
    var header = $('.site-header');
    var darkZones = [$('#ritual'), $('.site-footer')];
    var ticking = false;
    function update() {
      ticking = false;
      if (!header) return;
      var scrolled = window.scrollY > 24;
      header.classList.toggle('is-scrolled', scrolled);
      // the glass nav turns to dark glass while it floats over a dark section
      var mid = (scrolled ? 6 : 40) + 32, dark = false;
      if (!doc.body.classList.contains('menu-open')) {
        darkZones.forEach(function (el) {
          if (!el) return;
          var r = el.getBoundingClientRect();
          if (r.top <= mid && r.bottom >= mid) dark = true;
        });
      }
      header.classList.toggle('on-dark-glass', dark);
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();

    var btn = $('.menu-btn'), menu = $('#menu');
    if (!btn || !menu) return;
    function setOpen(open, focusBack) {
      btn.setAttribute('aria-expanded', String(open));
      $('.sr-only', btn).textContent = open ? 'Close menu' : 'Menu';
      menu.hidden = !open;
      doc.body.classList.toggle('menu-open', open);
      update();
      if (open) { var first = $('a', menu); if (first) first.focus(); }
      else if (focusBack) btn.focus();
    }
    btn.addEventListener('click', function () { setOpen(btn.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    doc.addEventListener('keydown', function (e) {
      if (menu.hidden) return;
      if (e.key === 'Escape') { setOpen(false, true); return; }
      if (e.key === 'Tab') {                         // keep focus inside menu + its toggle
        var items = [btn].concat($$('a', menu)), i = items.indexOf(doc.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 980 && !menu.hidden) setOpen(false); });
  }

  /* ── 12. Reveal + shimmer ───────────────────────────────────────────────── */
  function sweepOnce(el) {
    if (reduce || !el || el.classList.contains('is-sweeping')) return;
    el.classList.add('is-sweeping');
    el.addEventListener('animationend', function done() { el.classList.remove('is-sweeping'); el.removeEventListener('animationend', done); });
  }
  function initReveal() {
    var items = $$('.reveal');
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add('is-in');
          io.unobserve(en.target);
          $$('.sweep', en.target).concat(en.target.classList.contains('sweep') ? [en.target] : []).forEach(function (s, i) {
            setTimeout(function () { sweepOnce(s); }, 500 + i * 140);
          });
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
      items.forEach(function (el) { io.observe(el); });
    }
    // hero headline: an occasional light sweep while it is on screen
    var heroLines = $$('.hero-title .sweep');
    var sweepHero = function () { heroLines.forEach(function (s, i) { setTimeout(function () { sweepOnce(s); }, i * 160); }); };
    setTimeout(sweepHero, 900);
    if (!reduce) setInterval(function () { if (window.scrollY < window.innerHeight * .8 && !doc.hidden) sweepHero(); }, 8000);
  }

  /* ── 13. Boot ───────────────────────────────────────────────────────────── */
  applyTheme(current);
  renderDock();
  renderLineup();
  renderShop();
  onProduct(function (p) {
    var hint = $('.drag-hint [data-hint]');
    if (hint) hint.textContent = p.kind === 'gummy' ? 'Drag to spin · tap to squish' : 'Drag to spin · tap for a bite';
    if (Aura) Aura.setPalette(p.aura);
    candies.forEach(function (c) { candySet(c, p); });
    startCycle(p);
    Hero.swap(p);
    fillShopbar(p);
    $$('[data-card]').forEach(function (el) { el.classList.toggle('is-current', el.getAttribute('data-card') === p.id); });
    var note = $('[data-slot="orbitNote"]');
    if (note) {
      note.hidden = p.status === 'available';
      note.innerHTML = icon('info') + '<span>Showing the Peptide Lollipop actives. ' + p.short + ': ' + ph('actives') + '.</span>';
    }
    var ritual = $('[data-slot="ritualNote"]');
    if (ritual) ritual.innerHTML = p.ritual;
    drawIcons();
  });
  fillShopbar(current);
  initHeader();
  initReveal();
  drawIcons();
  initOrbit();
  initShop();
  initFAQ();
  initSteps();
  initShopbar();
  initHeroCandy();
  initNightCandy();
  root.classList.add('app-ready');
})();
