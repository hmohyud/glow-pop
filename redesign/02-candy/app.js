/* ==========================================================================
   Glo Pop — Proposal 02 · "Sweet Riot" · app.js (classic script)
   Modules: products → theme engine → product-bound UI → fit type → hero intro
            → reveals → velocity marquees → 3D candy rider → switcher → cards
            → bag builder (+ sprinkles, toast) → waitlist → FAQ → supplement facts
            → full-size image viewer → menu → chrome
   Facts follow redesign/_qa/PACK-FACTS.md (2026-11-08): Collagen Boost lollipop
   (sugar free, 15 g pop, seven actives) + Super Greens Gummies (new full label).
   ========================================================================== */
(function () {
  'use strict';

  /* ── 0. HELPERS ────────────────────────────────────────────────────────── */
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var G = window.gsap || null;
  var ST = window.ScrollTrigger || null;
  if (G && ST) G.registerPlugin(ST);
  // animate only if GSAP is here, motion is OK, and the no-JS failsafe hasn't already fired
  var animate = !!(G && ST) && !reduce && root.classList.contains('js');
  if (!animate) root.classList.add('no-anim');

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function easeOutBack(t) { var c = 1.7, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function safe(name, fn) { try { fn(); } catch (e) { if (window.console) console.error('[sweet-riot] ' + name, e); } }
  function icons() { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons({ attrs: { 'stroke-width': 2.4 } }); }
  function PH(t) { return '<span class="ph">' + t + '</span>'; }
  function ico(n) { return '<i data-lucide="' + n + '"></i>'; }

  /* ── 1. PRODUCTS — the single source of truth ─────────────────────────────
     Switcher, lineup panel, shop, theme tokens, marquee, CTAs and the 3D all
     read from here. Adding a product = adding one object.                    */
  var PRODUCTS = [
    {
      // The pack: "Collagen Boost" beauty lollipop, strawberry flavor, sugar free, net wt. 15 g per pop.
      // Unknown, so placeholders: price, sweetener, other ingredients, allergens, mg per active.
      id: 'strawberry-pop', kind: 'lollipop', status: 'available',
      name: 'Collagen Boost', short: 'Collagen Boost', flavor: 'Strawberry',
      theme: {
        accent: '#FF1493', accent2: '#FF8AC6', accent3: '#E8174B', deep: '#5A0F38', ink: '#2E0620',
        paper: '#FFF4E8', tint: '#FFE1EF', onAccent: '#2E0620', onAccentHi: '#FFF4E8', extrude: '#5A0F38',
        accentInk: '#C40068', onDeep: '#FFF4E8', deepHi: '#FF8AC6'
      },
      candy: { kind: 'lollipop', color: '#FF1493' },
      ui: {
        announce: 'Sugar free, still strawberry',
        kicker: 'Collagen Boost · Strawberry',
        heroSub: 'Sugar-free strawberry beauty lollipops with peptides, hyaluronic acid and five more actives. Beauty has never tasted this good.',
        proof: [['candy-off', 'Sugar free'], ['sparkles', '7 actives'], ['lollipop', '15 g pop']],
        badge: 'Sugar free • 7 actives • 15 g pop • ',
        ctaLabel: 'Build your bag', ctaHref: '#shop',
        status: ['badge-check', 'Available now'],
        title: 'Collagen Boost <small>Beauty Lollipop</small>', flavorLine: 'Strawberry',
        blurb: 'Like a really, really good strawberry lollipop, because it is one, just sugar free. Seven skin-loving actives ride along inside, biotin included.',
        facts: [['15&nbsp;g', 'per pop (net wt.)'], ['10', 'pops per bag'], ['7', 'actives inside'], ['1', 'a day, that’s it']],
        tags: [['candy-off', 'Sugar free'], ['wheat-off', 'Gluten-free'], ['lollipop', 'Strawberry flavor']],
        ctas: [['Build your bag', '#shop', 'primary'], ['Meet the seven', '#actives', 'line']],
        marquee: ['Collagen Boost', 'Sugar free', '7 actives', 'One a day', 'Gluten-free', 'Free shipping'],
        // separators ride with the phrase before them, so a wrapped line never starts with "·"
        finaleNote: '<span class="nw">10 lollipops per bag ·</span> <span class="nw">15 g each ·</span> <span class="nw">sugar free</span>',
        shopbarMeta: '10 pops · $' + PH('XX'),
        lockTitle: '', lockCopy: ''
      }
    },
    {
      // Super Greens Gummies, from the client's new full label (PACK-FACTS.md, 2026-11-08): name, front
      // claims, badges, Supplement Facts, suggested use, storage, Prop 65 warning, other ingredients.
      // NOT sugar free (3 g sugars per serving). Still unknown, so placeholders: price, launch date,
      // allergens, gummy shape. (The internal id stays 'green-gummies'.)
      id: 'green-gummies', kind: 'gummy', status: 'coming-soon',
      name: 'Super Greens Gummies', short: 'Super Greens', flavor: 'Strawberry-Watermelon',
      theme: {
        accent: '#22C55E', accent2: '#A3E635', accent3: '#16A34A', deep: '#0B3B22', ink: '#062A17',
        paper: '#F1FBEA', tint: '#DDF7E5', onAccent: '#062A17', onAccentHi: '#062A17', extrude: '#F1FBEA',
        accentInk: '#0E7A3A', onDeep: '#F1FBEA', deepHi: '#A3E635'
      },
      candy: { kind: 'gummy', color: '#0C9A43' },
      ui: {
        announce: 'Super Greens Gummies coming soon',   // the bar never says "sugar free" over the gummies
        kicker: 'Super Greens Gummies · Coming soon',
        heroSub: 'Strawberry-watermelon gummies with kale, spinach, elderberry and five B vitamins, on their way to the candy shop.',
        proof: [['candy', 'Strawberry-watermelon'], ['vegan', 'Vegan friendly'], ['clock', 'Coming soon']],
        badge: 'Super Greens • Coming soon • ',
        ctaLabel: 'Join the waitlist', ctaHref: '#waitlist',
        status: ['clock', 'Coming soon'],
        title: 'Super Greens Gummies', flavorLine: 'Strawberry-Watermelon',
        blurb: 'Strawberry meets watermelon in a gummy. Kale, broccoli, spinach, wild blueberries and elderberry headline the label, with no astragalus &amp; adaptogens.',
        facts: [['60', 'gummies, 30 servings'], ['2', 'gummies a day'], ['20', 'calories per 2&nbsp;gummies'], ['3&nbsp;g', 'total sugars per 2&nbsp;gummies']],
        phFacts: ['Price', 'Launch date'],
        // the label's front claims (asterisks tie to the FDA note in the footer) + its three badges
        tags: [['heart', 'Healthy gut*'], ['shield-check', 'Immune support*'], ['vegan', 'Vegan friendly'], ['wheat-off', 'Gluten free'], ['dna-off', 'Non GMO']],
        ctas: [['Join the waitlist', '#waitlist', 'primary'], ['Back to Collagen Boost', 'strawberry-pop', 'switch']],
        marquee: ['Super Greens Gummies', 'Strawberry-watermelon', 'Vegan friendly', 'Gluten free', 'Non GMO', 'Coming soon'],
        finaleNote: 'Super Greens Gummies: <span class="nw">strawberry-watermelon ·</span> <span class="nw">60 gummies ·</span> <span class="nw">price $' + PH('XX') + '</span>',
        shopbarMeta: 'Coming soon · ' + PH('Price'),
        lockTitle: 'Not in the shop yet',
        lockCopy: 'Strawberry-watermelon Super Greens Gummies are on their way. Join the waitlist and you’ll hear first.',
        sixNote: 'These seven live in Collagen Boost. Super Greens Gummies bring five B vitamins, iron, iodine and a long list of greens and berries: <a href="#pick" data-sf-open="green-gummies">see the supplement facts</a>.',
        sugarNote: 'Sugar free is the Collagen Boost lollipop. Super Greens Gummies are not sugar free: 3&nbsp;g total sugars per 2-gummy serving.'
      },
      // Supplement Facts verbatim from the new label (HTML strings; %DVs and footnote marks as printed).
      // rows: [nutrient, source (printed under the name) or '', amount per serving, %DV, indent level]
      label: {
        name: 'Super Greens Gummies, Strawberry-Watermelon',
        serving: '2 Gummies', servings: '30',
        rows: [
          ['Calories', '', '20', ''],
          ['Total Carbohydrate', '', '5 g', '2%'],
          ['Total Sugars', '', '3 g', '*', 1],
          ['Added Sugars', '', '3 g', '6%', 2],
          ['Riboflavin', 'from Organic Sugar Cherries Blend', '0.8 mg', '62%'],
          ['Niacin', 'from Organic Beetroot', '1.4 mg NE', '9%'],
          ['Vitamin B6', 'from Organic Sugar Cherries Blend', '0.6 mg', '35%'],
          ['Folate', 'from Organic Sugar Cherries Blend', '80 mcg DFE <span class="sf-amt-2">(50 mcg Folic Acid)</span>', '20%'],
          ['Pantothenic Acid', 'from Organic Sugar Cherries Blend', '0.9 mg', '18%'],
          ['Iron', 'from Organic Sugar Cherries Blend', '0.7 mg', '4%'],
          ['Iodine', 'from Organic Kelp', '17 mcg', '11%'],
          ['Sodium', 'from Electrolyte Blend', '15 mg', '&lt;1%'],
          ['Potassium', 'from Electrolyte Blend', '17 mg', '&lt;1%']
        ],
        // listed under the table, as printed (not counted anywhere on the page)
        blend: 'Organic Kale Leaf (Brassica oleracea var. acephala DC); Organic Broccoli Stalk and Flower (Brassica oleracea L. var. italica Planch); Organic Beet Root (Beta vulgaris L.); Organic Spinach (Spinacia oleracea L.); Wild Blueberry (Vaccinium angustifolium); Organic Elderberry (Sambucus nigra); Lemon (Citrus limon L.); Organic Carrot Root (Daucus carota L. var. sativus); Maltitol; Organic Wild Blueberry (Vaccinium angustifolium); Organic Acai Berry (Euterpe oleracea Mart.); Organic Pomegranate Fruit (Punica granatum L.); Organic Goji Juice (Lycium chinense); Organic Spirulina (Spirulina); Organic Noni Fruit (Morinda citrifolia); Organic Acai Berry (Euterpe oleracea Mart.); Pea (Pisum sativum); L-ascorbyl palmitate and Natural Flavors.',
        foot: ['** Percent Daily Values are based on a 2,000 calorie diet', '† Daily Value not established'],
        other: 'Tapioca Syrup, Sugar, Pectin, Citric Acid, Orange Juice Concentrate, Sodium Citrate, Natural Flavor (Strawberry, Watermelon), Palm Oil, Carnauba Wax, Color Added (Purple Carrot Juice Concentrate), Stevia Leaf.',
        use: ['Take two (2) gummies daily.',
          'Consult your physician before use if you are pregnant, nursing, have a medical condition, or are taking any medication, especially blood thinners or immunosuppressants. Discontinue use and call a doctor if any adverse reactions occur. Not intended to diagnose, treat, cure, or prevent any disease.'],
        storage: 'Store in a cool, dry place.',
        warning: 'CALIFORNIA WARNING: Consistent with the State of California’s Proposition 65, this product may expose you to chemicals including Lead, which is known to the State of California to cause cancer and birth defects or other reproductive harm.',
        tbd: [['Allergens', 'details']]
      }
    },
    {
      id: 'next-pop', kind: 'lollipop', status: 'in-development',
      name: 'More colors', short: 'Next Pop', flavor: null,                 // names + flavors TBD
      theme: {
        accent: '#8B3FD6', accent2: '#C9A7FF', accent3: '#FF7A1A', deep: '#2A0B4A', ink: '#1A0630',
        paper: '#F6F0FF', tint: '#ECE0FF', onAccent: '#FFFFFF', onAccentHi: '#FFFFFF', extrude: '#1A0630',
        accentInk: '#6A2BB8', onDeep: '#F6F0FF', deepHi: '#C9A7FF'
      },
      candy: { kind: 'lollipop', color: '#8B3FD6', cycle: ['#8B3FD6', '#FF7A1A', '#2F7BFF'] },
      ui: {
        announce: 'New colors in development',
        kicker: 'More colors · In development',
        heroSub: 'More Glo Pop colors are in the works. No names, no flavors yet. Just a whole lot of color on the way.',
        proof: [['flask-conical', 'In development'], ['palette', PH('Colors')], ['candy', PH('Flavors')]],
        badge: 'More colors • In development • Stay tuned • ',
        ctaLabel: 'Get first dibs', ctaHref: '#waitlist',
        status: ['flask-conical', 'In development'],
        title: 'More colors', flavorLine: '<small>on the way</small>',
        blurb: 'The color system is built to grow. Each new pop gets its own color world on this page the day it’s real.',
        phFacts: ['Colors', 'Flavors', 'Actives', 'Drop date'],
        tags: [['palette', 'New colors'], ['flask-conical', 'In development']],
        ctas: [['Get first dibs', '#waitlist', 'primary'], ['Back to Collagen Boost', 'strawberry-pop', 'switch']],
        marquee: ['More colors', 'In development', 'Colors TBD', 'Flavors TBD', 'Stay tuned'],
        finaleNote: 'New colors and flavors: ' + PH('details'),
        shopbarMeta: 'In development · ' + PH('Price'),
        lockTitle: 'Still in development',
        lockCopy: 'New colors are in development. Join the list and you’ll be first to know.',
        sixNote: 'These seven live in Collagen Boost. New pops: ' + PH('actives'),
        sugarNote: 'Sugar free is the Collagen Boost lollipop. New pops: ' + PH('recipe')
      }
    }
  ];
  function byId(id) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i]; return null; }
  var state = { id: PRODUCTS[0].id, p: PRODUCTS[0] };
  var hooks = { onProduct: [] };       // modules subscribe to product changes

  /* ── 2. THEME ENGINE ───────────────────────────────────────────────────── */
  var TOKENS = {
    accent: '--accent', accent2: '--accent-2', accent3: '--accent-3', deep: '--deep', ink: '--ink',
    paper: '--paper', tint: '--tint', onAccent: '--on-accent', onAccentHi: '--on-accent-hi',
    extrude: '--extrude', accentInk: '--accent-ink', onDeep: '--on-deep', deepHi: '--deep-hi'
  };
  function applyTokens(el, theme) { for (var k in TOKENS) if (theme[k]) el.style.setProperty(TOKENS[k], theme[k]); }
  function applyTheme(p) {
    root.dataset.product = p.id;
    applyTokens(root, p.theme);
    var meta = $('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', p.theme.accent);
  }

  /* ── 3. PRODUCT-BOUND UI ───────────────────────────────────────────────── */
  function renderBindings(p) {
    var u = p.ui;
    $$('[data-bind]').forEach(function (el) {
      var key = el.getAttribute('data-bind');
      if (key === 'proof') {
        el.innerHTML = u.proof.map(function (x) { return '<li>' + ico(x[0]) + x[1] + '</li>'; }).join('');
      } else if (key === 'marquee') {
        el.innerHTML = u.marquee.map(function (x) { return x + ' ' + ico(el.closest('.tape--accent') ? 'candy' : 'sparkle'); }).join(' ');
      } else if (key === 'badge') {
        el.textContent = u.badge;
      } else if (key === 'ctaLabel') {
        el.textContent = u.ctaLabel;
        if (el.tagName === 'A') el.setAttribute('href', u.ctaHref);
      } else if (key === 'short') {
        el.textContent = p.short;
      } else if (u[key] != null) {
        el.innerHTML = u[key];
      }
    });
    $$('[data-show]').forEach(function (el) {
      el.hidden = el.getAttribute('data-show').split(/\s+/).indexOf(p.id) === -1;
    });
  }

  // Supplement Facts disclosure (closed by default) for a product that has a printed label.
  // aria-live="off": the lineup panel is a polite live region, and opening the label must not read the whole table out.
  function labelHTML(p) {
    var L = p.label; if (!L) return '';
    var id = 'sf-' + p.id;
    var rows = L.rows.map(function (r) {
      var name = r[0] + (r[1] ? ' <span class="sf-src">(' + r[1] + ')</span>' : '');
      return '<tr' + (r[4] ? ' class="sf-l' + r[4] + '"' : '') + '><th scope="row">' + name + '</th><td>' + r[2] + '</td><td>' + r[3] + '</td></tr>';
    }).join('');
    return '<div class="sf" aria-live="off">' +
      '<h4 class="sf-h"><button class="sf-btn" type="button" id="' + id + '-btn" aria-expanded="false" aria-controls="' + id + '">' +
        '<span class="sf-btn-text"><span class="sf-btn-title">' + ico('scroll-text') + 'Supplement Facts</span> ' +
        '<span class="sf-btn-meta"><span class="nw">Serving Size: ' + L.serving + '<span class="sf-dot" aria-hidden="true"> ·</span></span> <span class="nw">Servings Per Container: ' + L.servings + '</span></span></span>' +
        '<span class="sf-ico" aria-hidden="true">' + ico('plus') + '</span>' +
      '</button></h4>' +
      '<div class="sf-panel" id="' + id + '" role="region" aria-labelledby="' + id + '-btn" hidden><div class="sf-body">' +
        '<table class="sf-table"><caption class="sr-only">Supplement Facts: ' + L.name + '. Serving Size: ' + L.serving + '. Servings Per Container: ' + L.servings + '.</caption>' +
          '<thead><tr><th scope="col" colspan="2">Amount Per Serving</th><th scope="col">%DV</th></tr></thead>' +
          '<tbody>' + rows + '</tbody></table>' +
        (L.blend ? '<p class="sf-blend">' + L.blend + '</p>' : '') +
        '<p class="sf-foot">' + L.foot.join('<br>') + '</p>' +
        (L.other ? '<p class="sf-other"><b>Other Ingredients:</b> ' + L.other + '</p>' : '') +
        (L.use ? '<div class="sf-note"><h5 class="sf-sub">Suggested Use</h5><p class="sf-use">' + L.use[0] + '</p><p class="sf-fine">' + L.use[1] + '</p></div>' : '') +
        (L.storage ? '<div class="sf-note"><h5 class="sf-sub">Storage</h5><p>' + L.storage + '</p></div>' : '') +
        (L.warning ? '<p class="sf-warn">' + L.warning + '</p>' : '') +
        (L.tbd ? '<dl class="sf-tbd">' + L.tbd.map(function (t) { return '<div><dt>' + t[0] + '</dt><dd>' + PH(t[1]) + '</dd></div>'; }).join('') + '</dl>' : '') +
      '</div></div></div>';
  }

  function renderPickInfo(p) {
    var el = $('#pickInfo'); if (!el) return;
    var u = p.ui, h = '';
    var hadOpenLabel = !!el.querySelector('.sf.is-open');   // its height is about to vanish: re-measure triggers after
    h += '<p class="status">' + ico(u.status[0]) + '<span>' + u.status[1] + '</span></p>';
    h += '<h3 class="pinfo-name">' + u.title + ' <span class="pinfo-flavor">' + u.flavorLine + '</span></h3>';
    h += '<p class="pinfo-blurb">' + u.blurb + '</p>';
    // known facts as tiles, still-unknown ones as dashed placeholder chips (a product can have both)
    if (u.facts) {
      h += '<ul class="facts">' + u.facts.map(function (f) { return '<li><b>' + f[0] + '</b><span>' + f[1] + '</span></li>'; }).join('') + '</ul>';
    }
    if (u.phFacts) {
      h += '<ul class="facts facts--ph">' + u.phFacts.map(function (f) { return '<li><span class="ph-fact">' + PH(f) + '</span></li>'; }).join('') + '</ul>';
    }
    h += '<ul class="tags">' + u.tags.map(function (t) { return '<li>' + ico(t[0]) + t[1] + '</li>'; }).join('') + '</ul>';
    h += '<div class="pinfo-ctas">' + u.ctas.map(function (c) {
      if (c[2] === 'switch') return '<button class="btn btn--line js-pick" type="button" data-product="' + c[1] + '">' + c[0] + '</button>';
      return '<a class="btn btn--' + c[2] + '" href="' + c[1] + '"' + (c[2] === 'primary' ? ' data-pop' : '') + '>' + c[0] + '</a>';
    }).join('') + '</div>';
    h += labelHTML(p);
    el.innerHTML = h;
    if (animate) {
      G.from(el.children, { y: 26, opacity: 0, duration: .6, ease: 'back.out(1.8)', stagger: .05, clearProps: 'transform,opacity' });
    }
    if (hadOpenLabel && ST) requestAnimationFrame(function () { ST.refresh(); });
  }

  function renderProduct(p) {
    applyTheme(p);
    renderBindings(p);
    renderPickInfo(p);
    icons();
    hooks.onProduct.forEach(function (fn) { safe('onProduct', function () { fn(p); }); });
  }

  /* ── 4. PRODUCT SWITCH — circle-wipe flood (View Transitions) w/ fallback ─ */
  var switching = false;
  // after (optional): runs once the new product is on screen (after the wipe), e.g. to open its label
  function switchProduct(id, origin, after) {
    var p = byId(id);
    if (p && p.id === state.id) { if (after) after(); return; }
    if (!p || switching) return;
    // if the trigger lives inside the panel we're about to re-render, keep focus somewhere sensible
    var refocus = origin && origin.closest && origin.closest('#pickInfo');
    var update = function () {
      state.id = p.id; state.p = p; renderProduct(p);
      if (refocus) { var opt = $('.switch-opt[data-product="' + p.id + '"]'); if (opt) opt.focus({ preventScroll: true }); }
    };
    var canVT = typeof document.startViewTransition === 'function' && !reduce;
    if (canVT) {
      var r = origin && origin.getBoundingClientRect ? origin.getBoundingClientRect() : null;
      var x = r ? r.left + r.width / 2 : window.innerWidth / 2;
      var y = r ? r.top + r.height / 2 : window.innerHeight / 2;
      var end = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      try {
        switching = true;
        var vt = document.startViewTransition(update);
        vt.ready.then(function () {
          root.animate(
            { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] },
            { duration: 950, easing: 'cubic-bezier(.7, 0, .2, 1)', pseudoElement: '::view-transition-new(root)' }
          );
        }).catch(function () {});
        vt.finished.then(done, done);
        return;
      } catch (e) { switching = false; }
    }
    // fallback: every themed color crossfades
    if (!reduce) {
      root.classList.add('theme-fade');
      setTimeout(function () { root.classList.remove('theme-fade'); }, 700);
    }
    update();
    if (after) requestAnimationFrame(after);
    function done() { switching = false; if (after) after(); }
  }
  // any element with .js-pick (the switcher, plus "back to Collagen Boost" buttons) switches
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.js-pick');
    if (b) { e.preventDefault(); switchProduct(b.getAttribute('data-product'), b); }
  });

  /* ── 5. FIT-TO-WIDTH TYPE ──────────────────────────────────────────────── */
  function textWidth(el) {
    var d = el.style.display;
    el.style.display = 'inline-block';
    var w = el.getBoundingClientRect().width;
    el.style.display = d;
    return w;
  }
  /* Hero lockup. Mobile: three lines, each filling the width (line 1 leaves room
     for the spinning badge). Desktop: "THE MOST DELICIOUS" / "SKINCARE" — row A
     takes 70% of the width so the candy head can sit beside it and drift in front
     of row B. Rows shrink together if the viewport is short. The dock and the
     "grab me" hint are then placed from the fitted sizes.                     */
  function px(v) { return v.toFixed(1) + 'px'; }
  function fitHero() {
    var grid = $('.hero-grid'), title = $('.hero-title'), ui = $('.hero-ui');
    if (!grid || !title) return;
    var W = title.clientWidth;
    if (!W) return;
    if (window.innerWidth < 900) {
      ['--f1', '--f2', '--f3'].forEach(function (v) { grid.style.setProperty(v, '100px'); });
      var shares = [.64, 1, 1];
      $$('.hl', title).forEach(function (l, i) {
        var w = textWidth(l);
        if (!w) return;
        var size = clamp(100 * W * shares[i] / w * .99, 36, 220);
        grid.style.setProperty('--f' + (i + 1), px(size));
        var w2 = textWidth(l);
        if (w2 > W * shares[i]) grid.style.setProperty('--f' + (i + 1), px(size * W * shares[i] / w2 * .99));
      });
      return;
    }
    grid.style.setProperty('--fa', '100px'); grid.style.setProperty('--fb', '100px');
    var a = $('.hrow-a', title), b = $('.hrow-b', title);
    var wa = textWidth(a), wb = textWidth(b);
    if (!wa || !wb) return;
    var fa = 100 * W * .72 / wa, fb = 100 * W * .95 / wb;
    var gridTop = grid.getBoundingClientRect().top + window.scrollY;
    var padB = parseFloat(getComputedStyle($('.hero')).paddingBottom) || 40;
    var budget = window.innerHeight - gridTop - (ui ? ui.offsetHeight : 190) - padB - 30;
    var total = .82 * (fa + fb);
    if (budget > 120 && total > budget) { var s = budget / total; fa *= s; fb *= s; total = budget; }
    // width-limited (wide screens): balance the spare height above and below the title
    var shift = budget > total ? clamp((budget - total) * .5, 0, 150) : 0;
    grid.style.setProperty('--fa', px(fa)); grid.style.setProperty('--fb', px(fb));
    grid.style.setProperty('--title-shift', px(shift));

    // candy dock: head (≈ .274H from the top, radius ≈ .205H) just right of row A
    var cs = getComputedStyle(grid), padL = parseFloat(cs.paddingLeft), gw = grid.clientWidth;
    var H = fb * 1.36, R = .205 * H;
    var rowAEnd = padL + wa * fa / 100;
    // head sits beside row A and only dips into the top of row B; never under the header
    var headCy = shift + Math.max(.82 * fa - .02 * fb, R - 10);
    var headCx = Math.min(rowAEnd + 36 + R, gw - 14 - R);
    grid.style.setProperty('--dock-h', px(H));
    grid.style.setProperty('--dock-top', px(headCy - .274 * H));
    grid.style.setProperty('--dock-left', px(headCx + .05 * H - .4 * H));
    // "grab me" hint: beside the head when there's room; otherwise just above the
    // right end of the CTA group (always free), with its arrow pointing up at the candy
    var hint = $('.grab-hint'), ctas = $('.hero-ctas');
    if (hint) {
      var side = gw - (headCx + R) >= 220;
      hint.classList.toggle('grab-hint--side', side);
      if (side) {
        grid.style.setProperty('--hx', px(headCx + R + 46)); grid.style.setProperty('--hy', px(headCy - 22));
      } else if (ctas && ui) {
        // offsets (not rects) so an in-flight intro transform can't skew the measurement
        var cl = ui.offsetLeft + ctas.offsetLeft, ct = ui.offsetTop + ctas.offsetTop;
        var cr = cl + ctas.offsetWidth, cb = ct + ctas.offsetHeight;
        var hw = hint.offsetWidth || 130, hh = hint.offsetHeight || 64, badge = $('.badge-spin');
        // preferred: just under the end of the stick (dock bottom-centre, minus the pop's lean), so
        // the arrow (its tip sits ≈ +92px / -57px from the sticker's corner) points straight at the candy
        var hx = headCx + .05 * H - 35 - 92, hy = headCy + .726 * H - 10 + 57;
        if (badge && hy < badge.offsetTop + badge.offsetHeight && hy + hh > badge.offsetTop) hx = Math.min(hx, badge.offsetLeft - 20 - hw);
        var hitsCtas = hx < cr + 16 && hx + hw > cl && hy < cb + 8 && hy + hh > ct - 8;
        if (hitsCtas || hy + hh > grid.clientHeight) {
          // no room under the stick: sit just above the right end of the CTA group (always free)
          hx = Math.min(cr - 150, headCx - 60); hy = ct - 74;
        }
        grid.style.setProperty('--hx', px(hx));
        grid.style.setProperty('--hy', px(hy));
      }
    }
  }
  function fitLines() {
    // each .fit-line inside .fit / [data-fit-each] fills its heading's width
    $$('.fit .fit-line, [data-fit-each] .fit-line').forEach(function (l) {
      l.style.setProperty('--fit', '100px');
      var w = textWidth(l), avail = l.parentElement.clientWidth;
      if (!w || !avail) return;
      var max = window.innerWidth >= 900 ? 240 : 140;
      var size = clamp(100 * avail / w * .99, 28, max);
      l.style.setProperty('--fit', size.toFixed(2) + 'px');
      var w2 = textWidth(l);                                   // correction pass (kerning, rounding)
      if (w2 > avail) l.style.setProperty('--fit', (size * avail / w2 * .99).toFixed(2) + 'px');
    });
  }
  function fitAll() { fitHero(); fitLines(); }

  /* ── 6. HERO INTRO (letters pop in) ───────────────────────────────────── */
  function splitChars(line) {
    var txt = line.textContent;
    line.textContent = '';
    for (var i = 0; i < txt.length; i++) {
      var ch = txt[i];
      if (ch === ' ') { line.appendChild(document.createTextNode(' ')); continue; }
      var s = document.createElement('span');
      s.className = 'char';
      s.textContent = ch;
      line.appendChild(s);
    }
  }
  function heroIntro() {
    var lines = $$('.hero-title .hl');
    if (!animate) { lines.forEach(function (l) { l.classList.add('is-in'); }); return; }
    lines.forEach(splitChars);
    lines.forEach(function (l) { l.classList.add('is-in'); });
    var chars = $$('.hero-title .char');
    var tl = G.timeline({ delay: .15 });
    tl.from(chars, {
      yPercent: 120, rotate: function () { return G.utils.random(-28, 28); }, opacity: 0, scale: .6,
      duration: .95, ease: 'back.out(2.4)', stagger: { each: .032, from: 'start' },
      clearProps: 'transform,opacity'                  // settled glyphs go back to plain, static text
    });
    var ui = $$('.hero-ui > *'), stickers = $$('.badge-spin, .grab-hint');
    ui.concat(stickers).forEach(function (el) { el.classList.add('is-in'); });
    tl.from(ui, { y: 30, opacity: 0, duration: .7, ease: 'back.out(1.7)', stagger: .07, clearProps: 'transform,opacity' }, .45);
    tl.from(stickers, { scale: 0, rotate: -40, opacity: 0, duration: .9, ease: 'elastic.out(1, .55)', stagger: .12, clearProps: 'transform,opacity' }, .9);
  }

  /* ── 7. SCROLL REVEALS (bouncy) ───────────────────────────────────────── */
  var REVEAL = '.sec-head > *, .benefits > li, .step, .weeks, .vs-wrap, .bagviz, .builder-wrap, .waitlist, .teaser, .slot, .acc-item, .packread, .photo-sticker, .switch, .pick-info, .tcard-slot, .finale-ui > *, .score';
  function setupReveals() {
    var els = $$(REVEAL).filter(function (el) { return !el.closest('.hero'); });
    if (!animate) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    // one idempotent reveal for every way an element can be reached (scrolling down,
    // scrolling back up, or being jumped past by an anchor link / restored scroll)
    function reveal(batch) {
      var fresh = batch.filter(function (el) { return !el.classList.contains('is-in'); });
      if (!fresh.length) return;
      // ones already above the viewport just appear; the rest share a capped stagger
      var live = [];
      fresh.forEach(function (el) {
        el.classList.add('is-in');
        if (el.getBoundingClientRect().bottom > 0) live.push(el);
      });
      if (!live.length) return;
      G.from(live, {
        y: 48, opacity: 0, scale: .94,
        duration: .6, ease: 'back.out(1.6)', stagger: Math.min(.045, .32 / live.length),
        clearProps: 'transform,opacity,scale'
      });
    }
    ST.batch(els, { start: 'top 92%', end: 'bottom top', onEnter: reveal, onEnterBack: reveal, onLeave: reveal, onLeaveBack: function () {} });
  }

  /* ── 7b. CANDY CALENDAR: the 28 day-pops pop in, the 2–4 week window last ── */
  function setupCalendar() {
    var dots = $$('.cal-grid i');
    if (!dots.length || !animate) return;
    G.set(dots, { scale: 0 });
    var done = false;
    function go() { if (done) return; done = true; G.to(dots, { scale: 1, duration: .5, ease: 'back.out(3)', stagger: { each: .028, from: 'start' } }); }
    ST.create({ trigger: '.cal', start: 'top 85%', end: 'bottom top', onEnter: go, onEnterBack: go, onLeave: go });
  }

  /* ── 8. VELOCITY MARQUEES ─────────────────────────────────────────────── */
  var Marquee = (function () {
    var items = [];
    function build(m) {
      $$('.is-clone', m.track).forEach(function (n) { n.remove(); });
      m.w = m.set.getBoundingClientRect().width;
      var need = Math.ceil((m.el.clientWidth * 1.15) / Math.max(1, m.w)) + 1;
      for (var i = 0; i < need; i++) {
        var c = m.set.cloneNode(true);
        c.classList.add('is-clone');
        c.removeAttribute('data-bind');
        m.track.appendChild(c);
      }
      if (m.dir > 0) m.x = -m.w;
    }
    function init() {
      items = $$('[data-marquee]').map(function (el) {
        return { el: el, track: $('.tape-track', el), set: $('.tape-set', el), speed: parseFloat(el.getAttribute('data-speed') || '1'), dir: parseFloat(el.getAttribute('data-dir') || '-1'), x: 0, w: 0, on: true };
      });
      items.forEach(build);
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) {
          es.forEach(function (e) { items.forEach(function (m) { if (m.el === e.target) m.on = e.isIntersecting; }); });
        }, { rootMargin: '120px 0px' });
        items.forEach(function (m) { io.observe(m.el); });
      }
    }
    var lastY = window.scrollY, vel = 0;
    function tick(dt) {
      if (reduce || !items.length) return;
      var y = window.scrollY, dy = y - lastY; lastY = y;
      vel += (dy / Math.max(dt, .25) - vel) * .12;                    // smoothed px/frame
      var boost = 1 + Math.min(Math.abs(vel) * .11, 7);
      var sign = vel < -.4 ? -1 : 1;                                   // scrolling up reverses the tape
      var skew = clamp(-vel * .22, -9, 9);
      items.forEach(function (m) {
        if (!m.on || !m.w) return;
        m.x += .85 * m.speed * boost * m.dir * sign * dt;
        if (m.x <= -m.w) m.x += m.w;
        if (m.x > 0) m.x -= m.w;
        m.track.style.transform = 'translate3d(' + m.x.toFixed(2) + 'px,0,0) skewX(' + skew.toFixed(2) + 'deg)';
      });
    }
    return { init: init, tick: tick, rebuild: function () { items.forEach(build); } };
  })();

  /* ── 9. 3D CANDY RIDER ──────────────────────────────────────────────────
     One WebGL candy lives in a fixed layer. Each frame it targets the docks
     (empty, reserved boxes in the layout): it glides between docks that are
     close together and pops out/in between docks that are far apart. It is
     painted under every .lay-ui block, so it never covers readable copy.    */
  var Rider = (function () {
    var box, allDocks = [], docks = [], baseW = 0, baseH = 0;
    var cur = { x: 0, y: 0, k: 0 }, has = false, live = false;
    var intro = { v: animate ? 0 : 1 };
    var candy = null, cycle = 0;

    function collect() {
      docks = allDocks.filter(function (d) {
        var f = d.getAttribute('data-for');
        return (!f || f === state.id) && d.offsetParent !== null;
      });
    }
    function sizeBase() {
      baseW = 0;
      docks.forEach(function (d) { baseW = Math.max(baseW, d.offsetWidth); });
      baseW = Math.max(120, Math.round(baseW)); baseH = Math.round(baseW * 1.25);
      box.style.width = baseW + 'px';
      box.style.height = baseH + 'px';
    }
    // optional per-dock framing for the gummy cluster: data-gummy="scale,shiftY"
    function extra(d) {
      var g = state.p.kind === 'gummy' && d.getAttribute('data-gummy');
      if (!g) return { s: 1, dy: 0 };
      var v = g.split(',');
      return { s: parseFloat(v[0]) || 1, dy: parseFloat(v[1]) || 0 };
    }
    function vis(r, vh) { var t = r.ctop != null ? r.ctop : r.top; return clamp((Math.min(t + r.height, vh) - Math.max(t, 0)) / Math.max(1, r.height), 0, 1); }
    function target() {
      var vh = window.innerHeight, f = vh * .5, n = docks.length;
      if (!n) return null;
      var rs = docks.map(function (d) {
        var r = d.getBoundingClientRect(), e = extra(d);
        return { left: r.left, top: r.top + e.dy * r.height, width: r.width, height: r.height, bottom: r.bottom, s: e.s, ctop: r.top };
      });
      var cs = rs.map(function (r) { return r.ctop + r.height / 2; });
      if (f <= cs[0]) return { r: rs[0], m: rs[0].s };
      if (f >= cs[n - 1]) return { r: rs[n - 1], m: rs[n - 1].s * smooth(vis(rs[n - 1], vh) * 1.8) };
      var i = 0; while (i < n - 2 && !(f >= cs[i] && f < cs[i + 1])) i++;
      var a = rs[i], b = rs[i + 1], gap = cs[i + 1] - cs[i];
      if (!reduce && gap < vh * 2.1) {                                // close: glide (pinned in view)
        var t = smooth((f - cs[i]) / gap);
        return {
          r: { left: lerp(a.left, b.left, t), top: lerp(a.top, b.top, t), width: lerp(a.width, b.width, t), height: lerp(a.height, b.height, t) },
          m: lerp(a.s, b.s, t) * (1 - .16 * Math.sin(Math.PI * t)), glide: true
        };
      }
      var va = vis(a, vh), vb = vis(b, vh);                           // far: ride with a dock, pop in/out
      var r = va >= vb ? a : b, v = Math.max(va, vb);
      return { r: r, m: r.s * (reduce ? (v > 0 ? 1 : 0) : easeOutBack(smooth(v * 1.7))) };
    }
    // idle early-out: only measure while scrolling / settling (no per-frame layout reads at rest)
    var settle = 90, lastY = -1;
    function poke() { settle = 90; }
    function tick(dt) {
      if (!candy || !box) return;
      var y = window.scrollY;
      if (y !== lastY) { lastY = y; settle = 90; }
      if (settle <= 0) return;
      settle--;
      var T = target();
      if (!T) return;
      var k = (T.r.width / baseW) * T.m * intro.v;
      var x = T.r.left + T.r.width / 2 - (baseW * k) / 2;
      var y = T.r.top + T.r.height / 2 - (baseH * k) / 2;
      if (!has || reduce) { cur.x = x; cur.y = y; cur.k = k; has = true; }
      else {
        var a = 1 - Math.pow(1 - .24, dt);                            // frame-rate independent ease
        cur.x += (x - cur.x) * a; cur.y += (y - cur.y) * a; cur.k += (k - cur.k) * a;
      }
      box.style.transform = 'translate3d(' + cur.x.toFixed(1) + 'px,' + cur.y.toFixed(1) + 'px,0) scale(' + Math.max(cur.k, .0001).toFixed(4) + ')';
      var show = cur.k > .03 && cur.y < window.innerHeight && cur.y + baseH * cur.k > 0;
      if (show !== live) {
        live = show;
        box.classList.toggle('is-parked', !show);
        if (show) candy.resume(); else candy.pause();
      }
    }
    function setProduct(p) {
      clearInterval(cycle);
      collect(); sizeBase(); poke();
      if (!candy) return;
      candy.setProduct({ kind: p.candy.kind, color: p.candy.color }, { duration: .95 });
      if (p.candy.cycle && !reduce) {
        var i = 0;
        cycle = setInterval(function () { i = (i + 1) % p.candy.cycle.length; candy.setColor(p.candy.cycle[i], { duration: 1.1 }); }, 2600);
      }
    }
    function hop() {
      if (!candy || !animate) return;
      G.timeline()
        .to(candy.root.position, { y: .9, duration: .22, ease: 'power2.out' })
        .to(candy.root.position, { y: 0, duration: .7, ease: 'bounce.out' });
      G.to(candy.root.rotation, { y: '+=' + Math.PI * 2, duration: 1.1, ease: 'back.out(1.3)' });
    }
    function fallback() { root.classList.add('candy-fallback'); }
    function init() {
      box = $('#candyBox');
      allDocks = $$('[data-dock]');
      if (!box || !allDocks.length) return;
      collect(); sizeBase();
      if (!window.GloCandy) { fallback(); return; }
      window.GloCandy.create(box, {
        preset: 'gloss',
        product: { kind: state.p.candy.kind, color: state.p.candy.color },
        spin: .0042, tilt: .22, exposure: 1.16,
        env: ['#ffffff', '#fff3f8', '#ffd9ec', '#ffb6d9']
      }).then(function (api) {
        if (!api) { fallback(); return; }
        candy = api;
        box.classList.add('is-live');
        root.classList.add('candy-live');                 // CSS hides placeholders the pop now covers
        live = true;
        if (animate) G.to(intro, { v: 1, duration: 1.3, ease: 'elastic.out(1, .5)', delay: .2, onUpdate: poke });
        else intro.v = 1;
        var hint = $('.grab-hint');
        box.addEventListener('pointerdown', function () { if (hint) hint.classList.add('is-gone'); }, { once: true });
        if (state.id !== PRODUCTS[0].id) setProduct(state.p);
      });
    }
    return { init: init, tick: tick, setProduct: setProduct, hop: hop, poke: poke, resize: function () { collect(); sizeBase(); poke(); }, candy: function () { return candy; } };
  })();

  /* ── 10. SWITCHER (giant toggle: thumb + keyboard) ────────────────────── */
  var Switcher = (function () {
    var sw, thumb, opts = [];
    function place(instant) {
      if (!sw) return;
      var on = $('.switch-opt[aria-pressed="true"]', sw) || opts[0];
      var props = { x: on.offsetLeft, y: on.offsetTop, width: on.offsetWidth, height: on.offsetHeight };
      if (G && !instant && !reduce) G.to(thumb, Object.assign({ duration: .95, ease: 'elastic.out(1, .62)', overwrite: true }, props));
      else if (G) G.set(thumb, props);
      else { thumb.style.transform = 'translate(' + props.x + 'px,' + props.y + 'px)'; thumb.style.width = props.width + 'px'; thumb.style.height = props.height + 'px'; }
      sw.classList.add('is-ready');
    }
    function sync(p) {
      opts.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-product') === p.id)); });
      place(false);
    }
    function init() {
      sw = $('.switch'); if (!sw) return;
      thumb = $('.switch-thumb', sw);
      opts = $$('.switch-opt', sw);
      opts.forEach(function (b) {                          // dots come from the data, not the stylesheet
        var p = byId(b.getAttribute('data-product'));
        if (p && !p.candy.cycle) b.style.setProperty('--dot', p.theme.accent);
      });
      sw.addEventListener('keydown', function (e) {        // arrows move between options
        var i = opts.indexOf(document.activeElement); if (i < 0) return;
        var k = e.key, n = null;
        if (k === 'ArrowRight' || k === 'ArrowDown') n = (i + 1) % opts.length;
        else if (k === 'ArrowLeft' || k === 'ArrowUp') n = (i - 1 + opts.length) % opts.length;
        else if (k === 'Home') n = 0; else if (k === 'End') n = opts.length - 1;
        if (n !== null) { e.preventDefault(); opts[n].focus(); }
      });
      place(true);
      hooks.onProduct.push(sync);
    }
    return { init: init, place: place };
  })();

  /* ── 11. COLLECT ALL SEVEN (flip cards) ───────────────────────────────── */
  function setupCards() {
    var cards = $$('.tcard'), seen = [], dots = $$('.collect-dots i'), out = $('[data-collected]'), done = $('[data-set-complete]');
    cards.forEach(function (c, i) {
      c.addEventListener('click', function () {
        var on = c.getAttribute('aria-pressed') !== 'true';
        c.setAttribute('aria-pressed', String(on));
        if (on && seen.indexOf(i) === -1) {
          seen.push(i);
          if (dots[seen.length - 1]) dots[seen.length - 1].classList.add('is-on');
          if (out) out.textContent = String(seen.length);
          if (seen.length === cards.length && done) {
            done.hidden = false;
            if (animate) G.from(done, { scale: 0, rotate: -30, duration: .9, ease: 'elastic.out(1, .5)', clearProps: 'scale,rotate' });
            var r = done.getBoundingClientRect();
            Sprinkles.burst(r.left + r.width / 2, r.top + r.height / 2, 90);
          }
        }
      });
    });
  }

  /* ── 12. CANDY SPRINKLES (canvas burst; skipped with reduced motion) ──── */
  var Sprinkles = (function () {
    var cv, ctx, parts = [], running = false, dpr = Math.min(window.devicePixelRatio || 1, 2);
    function ensure() {
      if (cv) return;
      cv = document.createElement('canvas');
      cv.className = 'sprinkle-canvas';
      cv.setAttribute('aria-hidden', 'true');
      document.body.appendChild(cv);
      ctx = cv.getContext('2d');
      size();
      window.addEventListener('resize', size);
    }
    function size() { cv.width = Math.round(window.innerWidth * dpr); cv.height = Math.round(window.innerHeight * dpr); }
    function palette() {
      var cs = getComputedStyle(root);
      var theme = ['--accent', '--accent-2', '--accent-3', '--paper'].map(function (v) { return cs.getPropertyValue(v).trim(); });
      return theme.concat(theme, ['#FFFFFF', '#F26A1B', '#0E9CAD', '#8B3FD6', '#FFC93C']);
    }
    function burst(x, y, n) {
      if (reduce) return;
      ensure();
      var cols = palette();
      for (var i = 0; i < (n || 80); i++) {
        var a = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.15, s = 7 + Math.random() * 11;
        parts.push({
          x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2,
          r: Math.random() * Math.PI, vr: (Math.random() - .5) * .45,
          w: 9 + Math.random() * 9, h: 4 + Math.random() * 2.5, c: cols[(Math.random() * cols.length) | 0]
        });
      }
      if (!running) { running = true; last = 0; requestAnimationFrame(loop); }
    }
    var last = 0;
    function loop(now) {
      // time-based physics (normalised to 60fps) so 120Hz screens don't double the speed
      var dt = last ? clamp((now - last) / 16.667, .2, 3) : 1;
      last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      var H = window.innerHeight + 40, dragX = Math.pow(.985, dt), dragY = Math.pow(.99, dt);
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.vy += .42 * dt; p.vx *= dragX; p.vy *= dragY;
        p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
        if (p.y > H) { parts.splice(i, 1); continue; }
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.strokeStyle = 'rgba(46, 6, 32, .55)'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, p.h / 2); else ctx.rect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      if (parts.length) requestAnimationFrame(loop);
      else { running = false; ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
    }
    return { burst: burst };
  })();

  /* ── 13. TOAST ────────────────────────────────────────────────────────── */
  var toastTimer = 0;
  function toast(html) {
    var t = $('#toast'); if (!t) return;
    t.innerHTML = html;
    icons();
    t.classList.remove('is-on');
    void t.offsetWidth;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 4200);
  }

  /* ── 14. BUILD YOUR BAG ───────────────────────────────────────────────── */
  var Builder = (function () {
    var NS = 'http://www.w3.org/2000/svg';
    var form, popsG, shown = [], slots = [], bagCount = 0;
    function makeSlots() {                     // 40 pop positions: 5 per row, 2 rows = 1 bag
      var out = [], r = 17, x0 = 82, bottom = 404, row = 0, seed = 7;
      function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
      while (out.length < 40) {
        var odd = row % 2 === 1;
        for (var c = 0; c < 5; c++) {
          out.push({
            x: x0 + c * 44 + (odd ? 22 : 0) + (rnd() - .5) * 5,
            y: bottom - r - 3 - row * 29.4 + (rnd() - .5) * 3,
            a: -Math.PI * (.15 + rnd() * .7),               // sticks poke upward-ish
            c: 1 + ((c + row) % 3 === 0 ? 1 : 0)            // mostly accent, some accent-2
          });
        }
        row++;
      }
      return out;
    }
    function popNode(s) {
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('transform', 'translate(' + s.x.toFixed(1) + ' ' + s.y.toFixed(1) + ')');
      var inner = document.createElementNS(NS, 'g');
      var sx = (Math.cos(s.a) * 30).toFixed(1), sy = (Math.sin(s.a) * 30).toFixed(1);
      inner.innerHTML =
        '<line class="bvp-stick" x1="0" y1="0" x2="' + sx + '" y2="' + sy + '"/>' +
        '<line class="bvp-stick-in" x1="0" y1="0" x2="' + sx + '" y2="' + sy + '"/>' +
        '<circle class="bvp-head c' + s.c + '" r="17"/>' +
        '<ellipse class="bvp-glint" cx="-6" cy="-7" rx="5.5" ry="3.2" transform="rotate(-32 -6 -7)"/>';
      g.appendChild(inner);
      return { g: g, inner: inner };
    }
    function qty() { var c = $('input[name="qty"]:checked', form); return c ? parseInt(c.value, 10) : 1; }
    function sub() { var s = $('#subToggle'); return !!(s && s.checked); }
    function fill(n, instant) {
      var target = n * 10;
      while (shown.length < target) {
        var i = shown.length, node = popNode(slots[i]);
        popsG.appendChild(node.g);
        shown.push(node);
        if (animate && !instant) {
          G.from(node.inner, { y: -300 - Math.random() * 80, rotation: G.utils.random(-120, 120), duration: .95, ease: 'bounce.out', delay: (i % 10) * .035 + Math.random() * .05 });
        }
      }
      while (shown.length > target) {
        var last = shown.pop();
        if (animate && !instant) {
          (function (nd) { G.to(nd.inner, { y: -340, opacity: 0, rotation: G.utils.random(-90, 90), duration: .5, ease: 'back.in(1.6)', onComplete: function () { nd.g.remove(); } }); })(last);
        } else last.g.remove();
      }
      $$('.bv-tick').forEach(function (t) {
        var b = parseInt(t.getAttribute('data-bags'), 10);
        t.classList.toggle('is-next', b === n + 1);
        t.classList.toggle('is-filled', b <= n);        // levels already under the pops drop out instead of peeking between them
      });
      var pops = $('[data-pops]'), days = $('[data-days]'), title = $('#bagvizTitle'), lab = $('[data-sum-label]');
      if (pops) pops.textContent = String(target);
      if (days) days.textContent = String(target);                     // one pop a day
      if (title) title.textContent = 'Your bag holds ' + target + ' pops';
      if (lab) lab.textContent = n + (n > 1 ? ' bags' : ' bag') + ' · ' + target + ' pops · ' + (sub() ? 'subscribe & save' : 'one-time');
    }
    function setLock(p) {
      var wrap = $('.builder-wrap'); if (!wrap || !form) return;
      var locked = p.status !== 'available';
      form.inert = locked;
      form.setAttribute('aria-hidden', String(locked));
    }
    function setBag(n) {
      bagCount = n;
      $$('[data-bag-count]').forEach(function (b) { b.textContent = String(n); });
      var link = $('.bag-link');
      if (link) link.setAttribute('aria-label', 'Your bag: ' + n + (n === 1 ? ' item' : ' items') + '. Go to Build your bag');
      if (animate) G.fromTo('.bag-count', { scale: .3 }, { scale: 1, duration: .7, ease: 'elastic.out(1.2, .4)' });
    }
    function init() {
      form = $('#builder'); popsG = $('.bv-pops');
      if (!form || !popsG) return;
      slots = makeSlots();
      fill(qty(), true);
      form.addEventListener('change', function (e) {
        if (e.target.name === 'qty') {
          fill(qty(), false);
          if (animate) G.fromTo(e.target.nextElementSibling, { scale: .92 }, { scale: 1, duration: .6, ease: 'elastic.out(1.1, .45)', clearProps: 'scale' });
        } else fill(qty(), true);
      });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var n = qty(), btn = $('.add-btn', form), r = btn.getBoundingClientRect();
        setBag(bagCount + n);
        Sprinkles.burst(r.left + r.width / 2, r.top + r.height * .3, 110);
        Rider.hop();
        toast(ico('party-popper') + ' <span>Added ' + n + (n > 1 ? ' bags' : ' bag') + ' (' + n * 10 + ' pops)' + (sub() ? ' on subscribe &amp; save' : '') + '. Prototype only: there’s no checkout yet.</span>');
      });
      hooks.onProduct.push(setLock);
    }
    return { init: init };
  })();

  /* ── 15. WAITLIST (no network: inline prototype message) ──────────────── */
  function setupWaitlist() {
    var f = $('#wlForm'); if (!f) return;
    var inp = $('#wlEmail'), msg = $('.wl-msg', f);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(inp.value.trim());
      msg.classList.add('is-on');
      if (!ok) {
        inp.setAttribute('aria-invalid', 'true');
        msg.innerHTML = ico('circle-alert') + '<span>Pop in a valid email so we can find you.</span>';
        icons(); inp.focus();
        return;
      }
      inp.removeAttribute('aria-invalid');
      msg.innerHTML = ico('party-popper') + '<span>You’re on the list! (Prototype: nothing was sent anywhere.)</span>';
      icons();
      var r = f.getBoundingClientRect();
      Sprinkles.burst(r.left + r.width / 2, r.top + 20, 70);
      f.reset();
    });
    inp.addEventListener('input', function () { inp.removeAttribute('aria-invalid'); });
  }

  /* ── 16. FAQ ACCORDION ────────────────────────────────────────────────── */
  function setupFaq() {
    $$('.acc-btn').forEach(function (btn) {
      var panel = document.getElementById(btn.getAttribute('aria-controls')), item = btn.closest('.acc-item');
      if (!panel) return;
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        item.classList.toggle('is-open', !open);
        if (!open) {
          panel.hidden = false;
          if (animate) G.fromTo(panel, { height: 0 }, { height: 'auto', duration: .5, ease: 'power3.out', clearProps: 'height', onComplete: refresh });
        } else if (animate) {
          G.to(panel, { height: 0, duration: .32, ease: 'power2.in', onComplete: function () { panel.hidden = true; G.set(panel, { clearProps: 'height' }); refresh(); } });
        } else panel.hidden = true;
      });
    });
    function refresh() { if (ST) ST.refresh(); Rider.poke(); }
  }

  /* ── 16b. SUPPLEMENT FACTS (disclosure in the lineup panel) ───────────────
     The panel is re-rendered on every product switch, so clicks are delegated.
     Same motion as the FAQ; the lineup grows, so the docked candy re-measures. */
  var Label = (function () {
    function refresh() { if (ST) ST.refresh(); Rider.poke(); }
    function set(btn, open) {
      var panel = document.getElementById(btn.getAttribute('aria-controls')), box = btn.closest('.sf');
      if (!panel || (btn.getAttribute('aria-expanded') === 'true') === open) return;
      btn.setAttribute('aria-expanded', String(open));
      if (box) box.classList.toggle('is-open', open);
      if (animate) G.killTweensOf(panel);
      if (open) {
        panel.hidden = false;
        if (animate) G.fromTo(panel, { height: 0 }, { height: 'auto', duration: .5, ease: 'power3.out', clearProps: 'height', onUpdate: Rider.poke, onComplete: refresh });
        else refresh();
      } else if (animate) {
        G.to(panel, { height: 0, duration: .32, ease: 'power2.in', onUpdate: Rider.poke, onComplete: function () { panel.hidden = true; G.set(panel, { clearProps: 'height' }); refresh(); } });
      } else { panel.hidden = true; refresh(); }
    }
    // "see the supplement facts" links elsewhere on the page: scroll to the label and open it
    function openFor(id) {
      var btn = document.getElementById('sf-' + id + '-btn');
      if (!btn) return false;
      set(btn, true);
      (btn.closest('.sf') || btn).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      btn.focus({ preventScroll: true });
      return true;
    }
    function init() {
      document.addEventListener('click', function (e) {
        var t = e.target && e.target.closest ? e.target : null;
        if (!t) return;
        var btn = t.closest('.sf-btn');
        if (btn) { set(btn, btn.getAttribute('aria-expanded') !== 'true'); return; }
        var link = t.closest('[data-sf-open]');
        if (link && openFor(link.getAttribute('data-sf-open'))) { e.preventDefault(); return; }
        // "See the Supplement Facts" on the gummies card: switch the page to that product first, then open its label
        var jump = t.closest('[data-sf-jump]');
        if (jump) {
          e.preventDefault();
          var pid = jump.getAttribute('data-sf-jump');
          switchProduct(pid, jump, function () { openFor(pid); });
        }
      });
    }
    return { init: init };
  })();

  /* ── 16c. FULL-SIZE VIEWER (pack photo, pack front, gummies label) ────────
     Every [data-zoom] button opens the one <dialog id="zoom"> (Esc, the close
     button or the backdrop close it; focus goes back to the thumbnail).
     Fit-to-screen by default; on a narrow screen a wide image (the label) is
     shown at its real height and pans sideways instead of shrinking to a
     sliver. "Zoom in" (or a tap on the image) toggles 100%; a mouse can drag. */
  var Zoom = (function () {
    var dlg, stage, img = null, titleEl, fileLink, toggle, hint, opener = null;
    var nat = { w: 1, h: 1 }, actual = false, fitS = 1, drag = null, dragged = false;
    var coarse = window.matchMedia('(pointer: coarse)');
    function box() {
      var cs = getComputedStyle(stage);
      return {
        w: Math.max(1, stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)),
        h: Math.max(1, stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom))
      };
    }
    function layout(focus) {
      if (!img || !dlg.open) return;
      var b = box(), fit = Math.min(1, b.w / nat.w, b.h / nat.h);
      if (b.w < 700 && nat.w > nat.h * 1.4) fit = Math.min(1, b.h / nat.h);   // wide image on a phone: full height, pan
      fitS = fit;
      var s = actual ? 1 : fit, w = Math.round(nat.w * s), h = Math.round(nat.h * s);
      img.style.width = w + 'px'; img.style.height = h + 'px';
      var canZoom = fit < .995;
      toggle.hidden = !canZoom;
      toggle.setAttribute('aria-pressed', String(actual));
      toggle.innerHTML = ico(actual ? 'zoom-out' : 'zoom-in') + '<span>' + (actual ? 'Fit to screen' : 'Zoom in') + '</span>';
      img.classList.toggle('is-zoomable', canZoom);
      img.classList.toggle('is-actual', actual);
      var pans = w > b.w + 1 || h > b.h + 1;
      hint.hidden = !pans;
      $('span', hint).textContent = coarse.matches ? 'Swipe to pan · pinch to zoom' : 'Scroll or drag to pan';
      icons();
      if (focus) {                                   // keep the tapped spot under the pointer
        stage.scrollLeft = focus.x * w - stage.clientWidth / 2;
        stage.scrollTop = focus.y * h - stage.clientHeight / 2;
      }
    }
    function open(btn) {
      var src = btn.getAttribute('data-zoom'), thumb = $('img', btn);
      if (!dlg) { window.open(src, '_blank', 'noopener'); return; }   // no <dialog> support: the file itself
      nat.w = parseInt(btn.getAttribute('data-zoom-w'), 10) || (thumb && thumb.naturalWidth) || 1200;
      nat.h = parseInt(btn.getAttribute('data-zoom-h'), 10) || (thumb && thumb.naturalHeight) || 1200;
      if (!img) {
        img = document.createElement('img');
        img.className = 'zoom-img'; img.decoding = 'async'; img.draggable = false;
        stage.appendChild(img);
        img.addEventListener('click', function (e) {
          if (dragged || fitS >= .995) return;
          var r = img.getBoundingClientRect();
          var f = { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) };
          actual = !actual; layout(actual ? f : null);
        });
      }
      img.width = nat.w; img.height = nat.h;
      img.alt = thumb ? thumb.alt : '';
      img.src = src;
      titleEl.textContent = btn.getAttribute('data-zoom-title') || img.alt || 'Full size';
      fileLink.href = src;
      actual = false; opener = btn;
      root.style.setProperty('--sbw', Math.max(0, window.innerWidth - root.clientWidth) + 'px');
      dlg.showModal();
      root.classList.add('zoom-open');
      layout();
      stage.scrollLeft = 0; stage.scrollTop = 0;
      var close = $('.zoom-close', dlg); if (close) close.focus();
    }
    function init() {
      dlg = $('#zoom');
      if (dlg && typeof dlg.showModal !== 'function') dlg = null;
      document.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-zoom]');
        if (b) { e.preventDefault(); open(b); }
      });
      if (!dlg) return;
      stage = $('.zoom-stage', dlg); titleEl = $('.zoom-title', dlg); fileLink = $('.zoom-file', dlg);
      toggle = $('.zoom-toggle', dlg); hint = $('.zoom-hint', dlg);
      toggle.addEventListener('click', function () { actual = !actual; layout(actual ? { x: .5, y: .5 } : null); });
      $('.zoom-close', dlg).addEventListener('click', function () { dlg.close(); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });   // the backdrop
      dlg.addEventListener('close', function () {
        root.classList.remove('zoom-open');
        if (opener && opener.focus) opener.focus({ preventScroll: true });
        opener = null;
      });
      // mouse: drag to pan (touch pans natively, so it is left alone)
      stage.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        drag = { x: e.clientX, y: e.clientY, l: stage.scrollLeft, t: stage.scrollTop }; dragged = false;
      });
      window.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!dragged && Math.abs(dx) + Math.abs(dy) > 5) { dragged = true; stage.classList.add('is-dragging'); }
        if (dragged) { stage.scrollLeft = drag.l - dx; stage.scrollTop = drag.t - dy; }
      });
      window.addEventListener('pointerup', function () {
        if (!drag) return;
        drag = null; stage.classList.remove('is-dragging');
        setTimeout(function () { dragged = false; }, 0);   // the click that ends a drag doesn't toggle zoom
      });
      window.addEventListener('resize', function () { if (dlg.open) layout(); });
    }
    return { init: init };
  })();

  /* ── 17. MOBILE MENU ──────────────────────────────────────────────────── */
  function setupMenu() {
    var menu = $('#menu'), btn = $('.menu-btn'), main = $('#main'), foot = $('.footer');
    // everything the open menu covers leaves the tab order (skip link, page, footer, shop bar, proposal chip)
    var covered = [$('.skip'), main, foot, $('#shopbar'), $('.proto-chip')].filter(Boolean);
    if (!menu || !btn) return;
    var label = $('.menu-btn-label', btn);
    function open() {
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      if (label) label.textContent = 'Close';
      document.body.style.overflow = 'hidden';
      covered.forEach(function (el) { el.inert = true; });
      if (animate) G.from($$('.menu-links li, .menu-cta, .menu-note', menu), { y: 40, opacity: 0, duration: .55, ease: 'back.out(1.7)', stagger: .05, clearProps: 'transform,opacity' });
      var first = $('a', menu); if (first) first.focus();
    }
    function close(focusBtn) {
      if (menu.hidden) return;
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      if (label) label.textContent = 'Menu';
      document.body.style.overflow = '';
      covered.forEach(function (el) { el.inert = false; });
      if (focusBtn) btn.focus();
    }
    btn.addEventListener('click', function () { if (menu.hidden) open(); else close(true); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) close(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(true); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1024) close(false); });
  }

  /* ── 18. CHROME: mobile shop bar, press "pop" ─────────────────────────── */
  function setupChrome() {
    var bar = $('#shopbar'), heroCtas = $('.hero-ctas'), shop = $('#shop'), finale = $('.finale-ui'), foot = $('.footer');
    if (bar && 'IntersectionObserver' in window) {
      // the bar steps aside wherever the page already shows its own buy button (hero, shop, finale)
      var flags = { hero: true, shop: false, finale: false, foot: false };
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.target === heroCtas) flags.hero = e.isIntersecting || e.boundingClientRect.top > 0;
          if (e.target === shop) flags.shop = e.isIntersecting;
          if (e.target === finale) flags.finale = e.isIntersecting;
          if (e.target === foot) flags.foot = e.isIntersecting;
        });
        bar.classList.toggle('is-on', !flags.hero && !flags.shop && !flags.finale && !flags.foot);
      });
      [heroCtas, shop, finale, foot].forEach(function (el) { if (el) io.observe(el); });
    }
    if (animate) {
      document.addEventListener('click', function (e) {
        var el = e.target.closest && e.target.closest('[data-pop]');
        if (el) G.fromTo(el, { scale: .9 }, { scale: 1, duration: .65, ease: 'elastic.out(1.15, .4)', clearProps: 'scale' });
      });
    }
  }

  /* ── 19. BOOT ─────────────────────────────────────────────────────────── */
  function onResize() {
    safe('fit', fitAll);
    safe('marquee', Marquee.rebuild);
    safe('thumb', function () { Switcher.place(true); });
    safe('rider', Rider.resize);
    if (ST) ST.refresh();
  }
  function boot() {
    safe('icons', icons);
    safe('fit', fitAll);
    safe('switcher', Switcher.init);
    safe('hero', heroIntro);
    safe('reveals', setupReveals);
    safe('calendar', setupCalendar);
    safe('marquee', Marquee.init);
    safe('rider', Rider.init);
    safe('cards', setupCards);
    safe('builder', Builder.init);
    safe('waitlist', setupWaitlist);
    safe('faq', setupFaq);
    safe('label', Label.init);
    safe('zoom', Zoom.init);
    safe('menu', setupMenu);
    safe('chrome', setupChrome);
    hooks.onProduct.push(function (p) { Rider.setProduct(p); Marquee.rebuild(); });

    // one ticker drives the candy rider + the marquees. The rider measures its docks first,
    // while layout is still clean; the marquees only write transforms after (no forced style recalc).
    if (G) G.ticker.add(function () { var dt = G.ticker.deltaRatio(60); Rider.tick(dt); Marquee.tick(dt); });
    else (function raf() { Rider.tick(1); Marquee.tick(1); requestAnimationFrame(raf); })();

    // refit once the webfont is in (metrics change), then let ScrollTrigger re-measure
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { onResize(); });
    }
    var t = 0;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(onResize, 160); });
    window.addEventListener('load', function () { if (ST) ST.refresh(); Rider.resize(); });
    window.__sweetRiot = true;
    window.__sweetRiotApi = { switchProduct: switchProduct, PRODUCTS: PRODUCTS, state: state, rider: Rider };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
