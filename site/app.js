/* ═══════════════════════════════════════════════════════════════════════════
   Model Pops — the site's script (app.js)
   Classic script (works from file:// and over http). No build step.

    0 · utilities                     8 · amenities (flip cards)
    1 · data (PRODUCTS)               9 · the Sun Index
    1½ · the season (MP_SEASONS)     10 · shop menu + waitlist
    2 · icons                        11 · FAQ accordion
    3 · water engine (the one WebGL canvas)
    4 · theme + product switching    12 · nav + mobile menu
    5 · 3D candy (site/candy3d.js)   13 · reveal, parallax, shop bar, archive button
    6 · hero (6½ · seasonal decor)   14 · frame loop
    7 · the cabanas (+ the facts drawer)   15 · boot

   SEASONS: the page has one version per season. The tiny script at the top of <head> sets
   <html data-season="spring|summer|autumn|winter"> (from ?season= or the visitor's date); each season's
   site/seasons/<season>.js registers window.MP_SEASONS.<season> = { copy, water, decor, candy } before
   this file runs, and site/seasons/<season>.css restyles the page. Module 1½ reads the config; nothing
   season-specific lives in this file (see site/seasons/summer.js for every key, documented).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ───────────────────────── 0 · Utilities ───────────────────────── */
  var doc = document, html = doc.documentElement;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var params = new URLSearchParams(location.search);
  var hexRgb = function (h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]; };
  var num = function (v, d) { v = +v; return isFinite(v) ? v : d; };

  /* ───────────────────────── 1 · Data: one product list drives everything ─────────────────────────
     Switcher (cabanas, their drawings and still lifes), cabana card (and its facts drawer), hero copy, nav
     chip, shop bar, theme tokens, water tint, 3D candy, the menu (every available product, its signatures in
     BUNDLES) and the waitlist (every product still to open) all read from here. status: 'available' (on the
     menu; its cabana open to visit) or 'coming-soon' (on the waitlist; its cabana roped shut, with a tag).
     Adding a product = adding one object. NEVER invent facts: every fact below comes from the client (the new
     Collagen Boost label, the green pop's back-panel proof and their messages of 2026-11-20 and 2026-11-21);
     anything not confirmed is a PH() placeholder (a dashed underline tagged TBD).
     · Theme tokens: each colour is applied as var(--<id>-<token>, <hex>), so a season file (or swiss.css) can
       restyle any product in CSS alone (e.g. html[data-season="autumn"] { --strawberry-pop-stripe: #C2185B; }).
       Tokens: accent, deep, btn (white text on it: AA), text (small text on white: AA), display (big
       italic accents), tint, soft, stripe (awning and cabana stripes), trim (cabana piping and flag).
     · Copy may use {{key}}: the season's copy[key] (e.g. "Strawberry, {{spot}}" → "Strawberry, poolside").
     · candy: what the 3D library draws ({ kind, color }), from its own presets (GloCandy.PRODUCTS)
       when it has them, so the page and the 3D agree; cabana.still is the drawn stand-in's shading.
     · label: the facts drawer. rows are [name, amount, %DV, class] in the printed order; class 'top' (calories),
       'in' / 'in2' (indented), 'bar' (a heavy rule above). The label print in #sugar (index.html) is the same
       Collagen Boost label, set by hand: site/_qa/check-facts.mjs keeps the two in step.              */
  var PH = function (s) { return '<span class="ph">' + s + '</span>'; };
  var NO = 'N<span class="ord">o</span>';   // a proper numero: N and a raised, underlined o
  var PRESET = (window.GloCandy && window.GloCandy.PRODUCTS) || {};
  var preset = function (k, hex) { return PRESET[k] && /^#[0-9a-f]{6}$/i.test(PRESET[k].color || '') ? PRESET[k].color : hex; };
  // The green pop's name is not final: rename it HERE. Every mention on the page is drawn from it (the
  // [data-name="green-pop"] spans in index.html and in the season copy are refilled from this at boot).
  var GREEN = 'Green Veggies';
  // The green pop's colour: the 3D library's own (GloCandy.PRODUCTS['green-pop'], the approved pop in the green
  // of its pack art), the same hex when the library is missing. One source: the 3D pop, the water's tint and the
  // drawn stand-in all take it from here.
  var GREEN_POP = preset('green-pop', '#2A9500');
  // The Collagen Boost label's warning, verbatim
  var WARNING = 'WARNING: Biotin may interfere with certain laboratory test results. If you are pregnant, nursing, taking medication, have a medical condition, or are scheduled for lab tests, consult your healthcare practitioner before use. CHOKING HAZARD: Small parts. Not for children under 3 years of age. KEEP OUT OF REACH OF CHILDREN.';
  var VEGGIES = 'Spirulina, broccoli, spinach, green cabbage, wheatgrass, kale, cauliflower, celery, white onion, zucchini, garlic, red cabbage, red onion, carrot, cayenne pepper, shiitake mushroom, sweet potato, green onion.';
  var PRODUCTS = [
    {
      // Available now. The NEW label: four actives per pop (collagen peptides 500 mg, hyaluronic acid 10 mg,
      // vitamin C 60 mg, biotin = vitamin B7 5,000 mcg), 16 calories, 0 g sugar (isomalt is its sugar alcohol).
      // From the old pack, still standing: 15 g a pop, 10 pops to a bag.
      id: 'strawberry-pop', name: 'Collagen Boost', flavor: 'Strawberry', status: 'available', no: 1,
      short: 'Collagen Boost', statusLabel: 'Available now', bag: '10 pops per bag',
      candy: { kind: 'lollipop', color: preset('pinkPop', '#FF1493') },
      theme: { accent: '#FF1493', deep: '#7A1B4D', btn: '#E0007C', text: '#BF0068', display: '#E0007C', tint: '#FFE4F1', soft: '#FFB8DA', stripe: '#FF1493', trim: '#B5005E' },
      cabana: { room: '#FCE4EF', room2: '#E8B4CB', still: ['#FF8CC6', '#FF1493', '#A3005A'] },
      water: { deep: [0.10, 0.56, 0.80], shallow: [0.55, 0.89, 0.94], lagoon: 0 },
      copy: {
        heroEyebrow: 'Collagen Boost · Strawberry', heroCta: 'Shop Collagen Boost', heroHref: '#menu',
        heroLede: 'Collagen peptides, hyaluronic acid, vitamin C and biotin, in a really, really good strawberry lollipop, sweetened with isomalt and a touch of&nbsp;stevia.',
        heroProofs: '<li><i data-lucide="lollipop"></i><span><b>Sugar &amp; allulose free</b></span></li><li><i data-lucide="sparkles"></i><span><b>4</b> beauty actives</span></li><li><i data-lucide="flame"></i><span><b>16</b> calories</span></li>',
        heroCaption: '<span class="no" aria-hidden="true">' + NO + ' 1</span> Strawberry, {{spot}}', heroHint: '{{hintWater}} · tap the pop for a bite',
        heroLabel: 'A glossy pink Model Pops Collagen Boost strawberry lollipop floating above the {{pool}}.',
        title: 'Collagen Boost, <em>Strawberry</em>',
        blurb: 'A sugar free strawberry beauty lollipop, sweetened with isomalt and stevia leaf, with 500&nbsp;mg of collagen peptides, hyaluronic acid, vitamin C and biotin in every pop.',
        // the client's own message, beside the label's "Sugar free": no allulose (never on the other products)
        facts: [['Free from', 'Sugar &amp; allulose'], ['Each pop', '15&nbsp;g · 16&nbsp;calories'], ['Actives', '4 in every pop'], ['In the bag', '10 lollipops']],
        cardCta: 'Shop Collagen Boost', cardHref: '#menu', note: 'Free shipping on every order',
        barName: 'Collagen Boost', barNote: 'Sugar free · 10 per bag', barCta: 'Shop', barHref: '#menu',
        pinNote: 'Shown for Collagen Boost strawberry pops.',
        ritualNote: 'Shown for Collagen Boost strawberry pops.'
      },
      label: {
        name: 'Collagen Boost label facts', meta: 'Sugar free · 16 calories · 4 actives per pop',
        title: 'Collagen Boost', lines: ['Servings per container 1'], dv: true,
        head: ['Amount per serving', '<span class="sr-only">Amount</span>', '% DV'],
        rows: [['Calories', '16', '', 'top'], ['Total Carbohydrate', '8 g', '3%'], ['Total Sugars', '0 g', '†', 'in'], ['Includes 0 g Added Sugars', '', '0%', 'in2'],
          ['Sugar Alcohol (Isomalt)', '8 g', '†', 'in'], ['Protein', '0.5 g', '1%'], ['Vitamin C (as Ascorbic Acid)', '60 mg', '67%', 'bar'],
          ['Biotin (Vitamin B7)', '5,000 mcg', '16,667%'], ['Hydrolyzed Collagen Peptides (Types I and III)', '500 mg', '†'], ['Hyaluronic Acid', '10 mg', '†']],
        foot: ['† Daily Value not established.'],
        ingredients: 'Isomalt, Hydrolyzed Collagen Peptides (Type I &amp; III), Ascorbic Acid, Hyaluronic Acid, Citric Acid, DL-Malic Acid, Natural Strawberry Flavor, Natural Color (Beet Root Powder), Stevia Leaf Extract, Lecithin.',
        badges: ['GMO Free', 'Sugar Free', 'Gluten Free'],
        known: [['Flavor', 'Strawberry'], ['Each pop', '15 g'], ['In the bag', '10 pops']],
        warning: WARNING
      }
    },
    {
      // Available now: it launches with Collagen Boost (the client, 2026-11-21: "they'll be released same time as
      // the main lollipops"). The name is a working name (GREEN). A green veggie lollipop that "will also have
      // electrolytes" (the client's words: never name or quantify them, and never state them as a fact beside the
      // proof, which lists none: always "with electrolytes (details to come)"). Its facts are from the large bag's
      // back-panel PROOF ("confirm before production"), so they are marked as such. No flavour and no colour are
      // stated (unknown: the 3D pop is a stand-in in the green of its pack art). Its price, like Collagen Boost's,
      // is a placeholder (the menu). bag and servings: the menu card's sub line.
      id: 'green-pop', name: GREEN, flavor: null, status: 'available', no: 2,
      short: GREEN, statusLabel: 'Available now', still: 'green|veggie', bag: '60 pops per bag', servings: '30 servings',
      candy: { kind: 'lollipop', color: GREEN_POP },
      theme: { accent: '#3DBE45', deep: '#0E4D35', btn: '#17803D', text: '#13723A', display: '#1B8A3E', tint: '#E9F8E3', soft: '#B5E7A4', stripe: '#4FC24A', trim: '#17773A' },
      cabana: { room: '#E9F7E2', room2: '#B9E2A9', still: ['#B8EC69', GREEN_POP, '#1A7201'] },   // still: lit and shade = the pack art's rim and shadow
      water: { deep: [0.06, 0.52, 0.56], shallow: [0.55, 0.90, 0.82], lagoon: 1 },
      copy: {
        heroEyebrow: GREEN + ' · In a lollipop', heroCta: 'Shop ' + GREEN, heroHref: '#menu',
        heroLede: 'A whole veggies blend, from spirulina and broccoli to spinach and kale, in a green lollipop with electrolytes (details ' + PH('to come') + '). Two pops a serving: 30 calories and 8&nbsp;g of fiber.',
        heroProofs: '<li><i data-lucide="leafy-green"></i><span><b>Whole veggies</b> blend</span></li><li><i data-lucide="flame"></i><span><b>30</b> calories a serving</span></li><li><i data-lucide="lollipop"></i><span><b>60</b> pops a bag</span></li>',
        heroCaption: '<span class="no" aria-hidden="true">' + NO + ' 2</span> ' + GREEN + ', {{spot}}', heroHint: '{{hintWater}} · tap the pop for a bite',
        heroLabel: 'A glossy green Model Pops ' + GREEN + ' lollipop floating above the {{pool}}.',
        title: GREEN + ', <em>in a lollipop</em>',
        blurb: 'A green veggie lollipop, with electrolytes (details ' + PH('to come') + '). Its label proof lists a 2010&nbsp;mg whole veggies blend, 30 calories, 8&nbsp;g of fiber, 0&nbsp;g sugar and 5&nbsp;g sugar alcohol in every two-pop serving.',
        facts: [['Made with', 'Whole veggies blend'], ['Electrolytes', 'Details ' + PH('to come')], ['A serving', '2&nbsp;pops · 30&nbsp;calories'], ['Large bag', '60 lollipops']],
        cardCta: 'Shop ' + GREEN, cardHref: '#menu', note: 'Facts from its label proof, subject to change',
        barName: GREEN, barNote: 'Veggie lollipop · 60 per bag', barCta: 'Shop', barHref: '#menu',
        pinNote: 'Shown for Collagen Boost strawberry pops. <a href="#cabanaLabel" data-show-label="green-pop">See what’s in ' + GREEN + '</a>.',
        ritualNote: 'Shown for Collagen Boost strawberry pops.'
      },
      label: {
        name: GREEN + ' nutrition facts, from the label proof', meta: 'From the label proof · subject to change',
        title: GREEN, source: 'Nutrition facts from the back-panel proof · subject to change',
        lines: ['30 servings per container', 'Serving size 2 lollipops (15 g)'], dv: true,
        head: ['Amount per serving', '<span class="sr-only">Amount</span>', '% DV*'],
        rows: [['Calories', '30', '', 'top'], ['Total Fat', '0 g', '0%'], ['Saturated Fat', '0 g', '0%', 'in'], ['Trans Fat', '0 g', '', 'in'],
          ['Cholesterol', '0 mg', '0%'], ['Sodium', '0 mg', '0%'], ['Total Carbohydrate', '15 g', '5%'], ['Dietary Fiber', '8 g', '30%', 'in'],
          ['Total Sugars', '0 g', '', 'in'], ['Includes 0 g Added Sugars', '', '0%', 'in2'], ['Sugar Alcohol', '5 g', '', 'in'], ['Protein', '0 g', '0%'],
          ['Whole Veggies Blend<span class="sf-src">' + VEGGIES + '</span>', '2010 mg', '', 'bar']],
        foot: ['* The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.'],
        known: [['Large bag', '60 lollipops'], ['On the front', 'Delicious taste']],
        tbd: [['Final name', PH('to come')], ['Flavor', PH('to come')], ['Electrolytes', 'Details ' + PH('to come')], ['Price', '$' + PH('XX')]]
      }
    },
    {
      // Coming soon: liposomal vitamin C capsules made in Switzerland (the client's words), regular two-piece
      // capsules in ivory / white (their reference photo). mg per capsule, the count and the price are unknown.
      // Its alpine look (the tokens, and the #capsules section) lives in site/swiss.css.
      id: 'vitamin-c', name: 'Liposomal Vitamin C', flavor: null, status: 'coming-soon', no: 3,
      short: 'Vitamin C', statusLabel: 'Coming soon', tag: 'Opening soon', tagNote: 'Made in Switzerland', waitlist: 'capsules · made in Switzerland', still: 'capsul', bag: 'capsules per pack to come',
      candy: { kind: 'capsule', color: preset('capsules', '#F2E8CF') },
      // (stripe, trim and the cabana's room: the sand-and-cream canvas the client chose, as in swiss.css)
      theme: { accent: '#D52B1E', deep: '#15294A', btn: '#1B3A63', text: '#24507E', display: '#2A6597', tint: '#EAF2F8', soft: '#BCD6EA', stripe: '#E2D2B6', trim: '#A38A62' },
      cabana: { room: '#F6F0E5', room2: '#DCCDB4', still: ['#FFFDF6', '#F2E8CF', '#B9AB86'] },
      water: { deep: [0.05, 0.42, 0.62], shallow: [0.68, 0.92, 0.96], lagoon: 0 },
      copy: {
        heroEyebrow: 'Liposomal Vitamin C · Coming soon', heroCta: 'Join the list', heroHref: '#waitlist',
        heroLede: 'Liposomal vitamin C capsules, made in Switzerland: the third cabana, opening soon. The amount per capsule, the count and the price are ' + PH('to come') + '.',
        heroProofs: '<li><i data-lucide="pill"></i><span><b>Liposomal</b> vitamin C</span></li><li><i data-lucide="mountain-snow"></i><span>Made in <b>Switzerland</b></span></li><li><i data-lucide="calendar"></i><span>Launch ' + PH('date') + '</span></li>',
        heroCaption: '<span class="no" aria-hidden="true">' + NO + ' 3</span> Liposomal Vitamin&nbsp;C, concept render', heroHint: '{{hintWater}} · tap the capsules',
        heroLabel: 'Liposomal Vitamin C, concept render: three ivory two-piece capsules floating above the {{pool}}.',
        title: 'Liposomal Vitamin C, <em>made in Switzerland</em>',
        blurb: 'Liposomal vitamin C in ivory two-piece capsules, made in Switzerland. The amount per capsule, the count and the price are ' + PH('to come') + '.',
        facts: [['Format', 'Capsules'], ['Made in', 'Switzerland'], ['Vitamin C', PH('XX') + ' mg a capsule'], ['Per pack', PH('XX') + ' capsules']],
        cardCta: 'Join the list', cardHref: '#waitlist', note: 'Concept render: the final capsules may differ',
        barName: 'Liposomal Vitamin C', barNote: 'Made in Switzerland · coming soon', barCta: 'Join list', barHref: '#waitlist',
        pinNote: 'Shown for Collagen Boost strawberry pops. <a href="#capsules">See Liposomal Vitamin C</a>.',
        ritualNote: 'Shown for Collagen Boost strawberry pops.'
      },
      label: {
        name: 'Liposomal Vitamin C facts', meta: 'Coming soon · amounts to come',
        title: 'Liposomal Vitamin C', lines: ['Two-piece capsules · Made in Switzerland'],
        head: ['Active', 'Per capsule'],
        rows: [['Vitamin C (liposomal)', PH('XX') + ' mg']],
        foot: ['The amount per capsule, the capsules per pack and the suggested use are still to come.'],
        known: [['Form', 'Liposomal vitamin C'], ['Format', 'Two-piece capsules, ivory'], ['Made in', 'Switzerland']],
        tbd: [['Per pack', PH('XX') + ' capsules'], ['Suggested use', PH('to come')], ['Price', '$' + PH('XX')], ['Launch', PH('date')]]
      }
    }
  ];
  // The Beach Club Menu: each available product's signatures, served by the bag (prices, savings and terms are
  // unknown → placeholders). Only what the labels say: Collagen Boost, 10 pops a bag (one a day: the Sun Index);
  // Green Veggies, 60 pops a bag, 30 servings of 2 (its proof; how many a day is not known, so no month for it).
  // A signature keeps its id across products (The Single, The Duo), so switching keeps the choice where it can.
  var BUNDLES = {
    'strawberry-pop': [
      { id: 'single', name: 'The Single', desc: 'One bag, ten pops. A taste of the club.' },
      { id: 'duo', name: 'The Duo', desc: 'Two bags, twenty pops. Save ' + PH('XX%') + '.' },
      { id: 'month', name: 'The Month', desc: 'Three bags, thirty pops: one a day for a month. Save ' + PH('XX%') + '.' }
    ],
    'green-pop': [
      { id: 'single', name: 'The Single', desc: 'One bag, 60 pops: 30 servings of two.' },
      { id: 'duo', name: 'The Duo', desc: 'Two bags, 120 pops: 60 servings. Save ' + PH('XX%') + '.' }
    ]
  };
  var byId = function (id) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i]; return null; };
  var state = { product: PRODUCTS[0] };
  var SUN_HOT = [0.44, -0.08];  // one sun, high and to the upper left: where the water's glints gather (viewport fraction)

  /* ───────────────────────── 1½ · The season ─────────────────────────
     <html data-season> was set before first paint by the inline script at the top of <head> (from ?season=,
     else the visitor's date); the season's own file (site/seasons/<season>.js) registered its config on
     window.MP_SEASONS. Every key is optional: a missing one falls back to the neutral value below (the
     summer pool). site/seasons/summer.js documents every key.                                          */
  var SEASONS = window.MP_SEASONS || {};
  var SEASON_NAME = html.getAttribute('data-season') || window.MP_SEASON_NAME || 'summer';
  var SEASON = SEASONS[SEASON_NAME] || SEASONS.summer || {};
  var SCOPY = SEASON.copy || {};
  var BASECOPY = (SEASONS.summer && SEASONS.summer.copy) || {};   // a word a season leaves out: summer's
  var WFX = (function (w) {             // the season's water, with neutral defaults (each extra costs nothing at 0)
    w = w || {};
    var v3 = function (a, d) { return a && a.length === 3 ? [num(a[0], d), num(a[1], d), num(a[2], d)] : null; };
    var t = w.target || {};
    return {
      deep: v3(w.deep, 1) || [1, 1, 1], shallow: v3(w.shallow, 1) || [1, 1, 1],          // × every product's tint
      target: { deep: v3(t.deep, 0), shallow: v3(t.shallow, 0), amount: clamp(num(t.amount, 0), 0, 1) },   // then mixed toward these
      warm: clamp(num(w.warm, 0), 0, 1), seaWarm: clamp(num(w.seaWarm, 0.5), 0, 1),
      cool: clamp(num(w.cool, 0), 0, 1), steam: clamp(num(w.steam, 0), 0, 1),
      snow: clamp(num(w.snow != null ? w.snow : w.frost, 0), 0, 1),
      caustics: Math.max(0, num(w.caustics, 1)), glints: Math.max(0, num(w.glints, 1))
    };
  })(SEASON.water);
  // {{key}} in product copy → the season's copy[key] (summer's if the season leaves it out)
  function fill(s) {
    return typeof s === 'string' ? s.replace(/\{\{(\w+)\}\}/g, function (m, k) { return SCOPY[k] != null ? SCOPY[k] : BASECOPY[k] != null ? BASECOPY[k] : ''; }) : s;
  }
  // a product's water under this season's light: its own tint × the season's multipliers, then mixed toward
  // the season's target colours (if it sets any)
  function seasonTint(w) {
    var T = WFX.target;
    var m = function (a, k, to) {
      return a.map(function (v, i) { var c = clamp(v * k[i], 0, 1); return to ? lerp(c, clamp(to[i], 0, 1), T.amount) : c; });
    };
    return { deep: m(w.deep, WFX.deep, T.amount && T.deep), shallow: m(w.shallow, WFX.shallow, T.amount && T.shallow), lagoon: w.lagoon };
  }
  // [data-season-copy="key"] gets copy[key] as its innerHTML (a <meta> its content, the <title> its text);
  // then every [data-name="<product id>"] gets that product's current name
  function applySeasonCopy() {
    $$('[data-season-copy]').forEach(function (el) {
      var v = SCOPY[el.getAttribute('data-season-copy')];
      if (v == null) return;
      if (el.tagName === 'META') el.setAttribute('content', String(v).replace(/<[^>]*>/g, ''));
      else if (el.tagName === 'TITLE') doc.title = String(v).replace(/<[^>]*>/g, '');
      else el.innerHTML = v;
    });
    $$('[data-name]').forEach(function (el) { var p = byId(el.getAttribute('data-name')); if (p) el.textContent = p.name; });
    html.classList.remove('season-pending');
  }
  // the season's words go in first, before anything else this file sets up (they show at the next paint)
  applySeasonCopy();

  /* ───────────────────────── 2 · Icons (one outlined set: Lucide) ───────────────────────── */
  function icons() {
    if (!window.lucide || !lucide.createIcons) return;
    try { lucide.createIcons({ attrs: { 'stroke-width': 1.6, 'aria-hidden': 'true', focusable: 'false' } }); } catch (e) {}
  }

  /* ───────────────────────── 3 · Water engine ─────────────────────────
     One fixed full-viewport WebGL canvas. Sections with .is-window are transparent onto it.
     POOL (top-down): a high-key pool. Shallows pale aqua over white plaster, deep azure, refracted
       floor tiles, and a crisp two-scale caustic net (sharper in the shallows, softer with depth).
       Extras per window: the hero's sunlit shallows (uBeach: open water under the copy, a beach entry a few
       centimetres deep that slopes away past the copy into the deep end, lit by the one sun; no shape is
       painted over the pool), the finale's sun shelf (a pale ledge under its headline, [data-shelf]), a parasol's
       scalloped shade ([data-shade]), the floating candy's shadow (its real silhouette, copied from
       the 3D canvas every frame it renders: spin, tilt, bites, shards and squish all show; tinted by
       the candy the light passes through, with the lens's focused caustic; faded out before the copy
       where the copy sits under the pop), glints gathered toward
       the one sun (upper left), pointer ripples (a pool of slots: a ring is never cut while it can
       still be seen), and a golden-hour warmth (data-warm) for the finale.
     SEA (horizon view, inside the most visible sea window): sky, a haze behind headings ([data-haze]),
       fresnel reflections and a sun glitter path; the Sun Index drives the sun along an arc.
     Only visible windows are shaded (scissor; the opaque sand is skipped), it idles when nothing is
     on screen, DPR is capped at 2 with adaptive resolution, and reduced motion gets still frames.
     SEASONS (module 1½, from the season's `water`): the product tints × the season's multipliers (CPU),
     the pools' golden-hour warmth, the beach's time of day, and uFx = (cool, steam, snow) + uGain =
     (caustics, glints). Each extra is a uniform branch: at 0 it costs nothing.                       */
  var VERT = 'attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.0,1.0);}';
  // The candy shadow's soft edge: 12 taps on a golden-angle disk (the core) and 6 on a wide ring (a faint
  // outer penumbra), unrolled here because GLSL ES 1.0 has no constant arrays.
  var SIL_TAPS = (function () {
    var s = [], k;
    for (k = 0; k < 12; k++) {
      var r = Math.sqrt((k + 0.5) / 12), th = k * 2.39996323;
      s.push('      c += texture2D(uSil, uv + m * vec2(' + (r * Math.cos(th)).toFixed(4) + ', ' + (r * Math.sin(th)).toFixed(4) + '));');
    }
    for (k = 0; k < 6; k++) {
      var t2 = (k + 0.5) / 6 * Math.PI * 2;
      s.push('      o += texture2D(uSil, uv + mw * vec2(' + Math.cos(t2).toFixed(4) + ', ' + Math.sin(t2).toFixed(4) + ')).a;');
    }
    return s;
  })();
  function fragSource(ripN) { return [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    '#define RIP_N ' + ripN,
    'uniform vec2 uRes; uniform float uPx; uniform float uTime; uniform float uScroll;',
    'uniform vec3 uDeep; uniform vec3 uShallow; uniform float uLagoon; uniform vec3 uCandy;',
    'uniform vec4 uSea; uniform float uHz; uniform vec2 uSun; uniform float uWarm; uniform vec3 uGlit; uniform vec4 uHaze;',
    'uniform vec4 uShelf; uniform vec4 uShade; uniform float uPoolWarm; uniform vec2 uHot;',
    /* the hero's sunlit shallows: uBeach = (the slope's direction x, y, where it starts, its width), viewport px */
    'uniform vec4 uBeach;',
    /* the season: uFx = (cool, steam, snow, -), uGain = (caustics, glints) */
    'uniform vec4 uFx; uniform vec2 uGain;',
    /* the candy shadow: uSil = the candy's silhouette (premultiplied RGBA), uSilBox = where it lies on the
       floor (viewport px), uSilK = (core blur px, strength, penumbra px, on), uLens = up to 3 focus spots,
       uSilClip = the top of the copy when it sits under the pop (viewport px; far below the screen when not) */
    'uniform sampler2D uSil; uniform vec4 uSilBox; uniform vec4 uSilK; uniform vec4 uLens[3]; uniform float uSilClip;',
    /* up to 3 bite craters: thinner candy lets a little more light through (x, y, radius px, strength) */
    'uniform vec4 uLeak[3];',
    /* live ripples, packed by the CPU: (x, y, age s, strength); only the first uRipN are read */
    'uniform vec4 uRip[RIP_N]; uniform float uRipN;',

    'float hash21(vec2 p){ p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }',
    'vec2 hash22(vec2 p){ vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }',
    'float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);',
    '  float a = hash21(i), b = hash21(i + vec2(1.0, 0.0)), c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y); }',
    'float sdBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }',

    /* caustic net: animated voronoi cell edges (F2 - F1), domain-warped so the lines curve */
    'float vedge(vec2 p, float t){',
    '  vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;',
    '  for (int y = -1; y <= 1; y++) { for (int x = -1; x <= 1; x++) {',
    '    vec2 g = vec2(float(x), float(y)); vec2 h = hash22(i + g);',
    '    vec2 o = 0.5 + 0.42 * sin(t * (0.6 + 0.5 * h.yx) + 6.2831 * h);',
    '    vec2 r = g + o - f; float d = dot(r, r);',
    '    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }',
    '  } }',
    '  return sqrt(d2) - sqrt(d1); }',
    'float caustic(vec2 fp, float t, float sharp){',
    '  vec2 p = fp / 72.0;',
    '  vec2 w = vec2(vnoise(p * 0.42 + vec2(t * 0.12, 1.7)), vnoise(p * 0.42 + vec2(4.3, -t * 0.1))) - 0.5;',
    '  p += w * 0.9;',
    '  float e1 = vedge(p, t * 1.1);',
    '  float e2 = vedge(p * 1.62 + vec2(7.31, 2.17), t * 1.45 + 2.0);',
    '  float c1 = exp(-e1 * sharp), c2 = exp(-e2 * sharp * 1.2);',
    '  return c1 + 0.55 * c2 + 0.9 * c1 * c2; }',

    /* long gentle swells + a noise octave, as a height gradient (per px) */
    'vec2 swellGrad(vec2 p, float t){',
    '  vec2 g = vec2(0.0); vec2 d; float k; float ph;',
    '  d = vec2(0.9, 0.436); k = 0.019; ph = dot(p, d) * k + t * 0.85; g += d * cos(ph) * k * 0.9;',
    '  d = vec2(-0.6, 0.8); k = 0.031; ph = dot(p, d) * k + t * 1.2; g += d * cos(ph) * k * 0.55;',
    '  d = vec2(0.24, -0.97); k = 0.047; ph = dot(p, d) * k + t * 1.6; g += d * cos(ph) * k * 0.32;',
    '  vec2 q = p * 0.010 + vec2(t * 0.045, -t * 0.035); float e = 0.08;',
    '  float n0 = vnoise(q), nx = vnoise(q + vec2(e, 0.0)), ny = vnoise(q + vec2(0.0, e));',
    '  g += vec2(nx - n0, ny - n0) * 0.11;',
    '  return g; }',

    /* expanding pointer ripples (window-local page coordinates). The CPU packs the live ones first and
       folds their decay into .w, so the loop stops at uRipN and a pixel off a ring's band costs one dot() */
    'vec2 rippleGrad(vec2 p){',
    '  vec2 g = vec2(0.0);',
    '  for (int i = 0; i < RIP_N; i++) {',
    '    if (float(i) >= uRipN) break;',
    '    vec4 r = uRip[i];',
    '    vec2 dv = p - r.xy; float d2 = dot(dv, dv);',
    '    float R = r.z * 170.0 + 4.0, w = 16.0 + r.z * 30.0, hi = R + 2.2 * w, lo = max(R - 2.2 * w, 0.0);',
    '    if (d2 > hi * hi || d2 < lo * lo) continue;',
    '    float d = sqrt(d2) + 0.001, x = d - R;',
    '    float env = exp(-(x * x) / (w * w)) * r.w * smoothstep(0.0, 24.0, d);',
    '    g += (dv / d) * (-0.09 * sin(x * 0.09) * env);',
    '  }',
    '  return g; }',

    /* sun glints: brief sparkles, each a hot core with a small bloom and faint cross flare */
    'float glints(vec2 pp, float t){',
    '  vec2 c0 = floor(pp / 23.0); float acc = 0.0;',
    '  for (int y = -1; y <= 1; y++) { for (int x = -1; x <= 1; x++) {',
    '    vec2 cc = c0 + vec2(float(x), float(y));',
    '    float ph = hash21(cc * 1.37 + 3.1);',
    '    float s = max(sin(t * (1.7 + 2.6 * ph) + ph * 61.0), 0.0); s *= s; s *= s; s *= s; s *= s;',
    '    if (s < 0.02) continue;',
    '    vec2 d = pp - (cc + 0.15 + 0.7 * hash22(cc + 17.0)) * 23.0; float r2 = dot(d, d);',
    '    acc += s * (exp(-r2 * 0.5) + 0.2 * exp(-r2 * 0.03) + 0.07 * (exp(-abs(d.y) * 1.5 - abs(d.x) * 0.24) + exp(-abs(d.x) * 1.5 - abs(d.y) * 0.24)));',
    '  } }',
    '  return acc; }',

    'vec3 pool(vec2 sp, float t){',
    '  vec2 pp = sp + vec2(0.0, uScroll);',
    /* the hero's sunlit shallows: a beach entry under the copy that slopes away into the deep water along one
       long, gently curving line (uBeach). It is only depth: the same water and the same caustic net carry on
       across it, a few centimetres deep over white plaster, so the pool stays one body of water */
    '  float beach = 0.0;',
    '  if (uBeach.w > 0.0) beach = 1.0 - smoothstep(0.0, uBeach.w, dot(sp, uBeach.xy) - uBeach.z + (vnoise(pp / 560.0 + 7.3) - 0.5) * 64.0);',
    '  vec2 rg = rippleGrad(pp); vec2 g = swellGrad(pp, t) + rg;',
    /* the floor wavers with the depth of water over it: barely at all in the shallows */
    '  vec2 refr = g * 380.0 * (1.0 - 0.6 * beach); vec2 fp = pp + refr;',
    '  vec2 view = max(uRes / uPx, vec2(1.0)); vec2 vp = sp / view;',
    '  float warm = uPoolWarm;',
    /* depth: shallow on the left, deep toward the right (and nothing at all on the hero's beach entry) */
    '  float dn = vnoise(fp / 820.0 + vec2(0.0, t * 0.004));',
    '  float depth = clamp(0.14 + 0.54 * vp.x + 0.18 * vp.y + (dn - 0.5) * 0.34, 0.0, 1.0) * (1.0 - beach);',
    /* the finale's sun shelf: a pale plaster beach entry under its headline, sloping gently into the deep water */
    '  float shelf = 0.0, sd = 1e4;',
    '  if (uShelf.z > 0.0) {',
    '    vec2 hb = uShelf.zw * 0.5; sd = sdBox(sp + refr * 0.3 - (uShelf.xy + hb), hb, 140.0);',
    '    sd += (vnoise(fp / 240.0 + 3.7) - 0.5) * 64.0;',
    '    shelf = 1.0 - smoothstep(-90.0, 70.0, sd);',
    '  }',
    '  vec3 shallow = mix(uShallow, vec3(0.46, 0.80, 0.80), warm * 0.55);',
    '  vec3 deep = mix(uDeep, vec3(0.04, 0.34, 0.47), warm * 0.72);',
    '  vec3 col = mix(shallow, deep, smoothstep(0.0, 1.0, depth));',
    /* the beach entry: clear water a few centimetres deep, so the white plaster under it shows through. Still
       the water's own colour (never milky): its hue held, only lighter; warmer, never cream, at golden hour */
    '  float ls = dot(shallow, vec3(0.2126, 0.7152, 0.0722));',
    '  vec3 thin = mix(shallow, vec3(1.0), clamp((mix(0.89, 0.86, warm) - ls) / max(1.0 - ls, 0.05), 0.0, 0.62));',   /* every product, every season: as light */
    /* down the slope the red goes first and the blue last, as in real water: a clear turquoise between, never grey */
    '  col = mix(thin, col, pow(vec3(max(1.0 - beach, 1e-4)), vec3(0.75, 1.0, 1.3)));',
    '  vec3 plaster = mix(vec3(0.80, 0.955, 0.965), vec3(0.95, 0.935, 0.87), warm * 0.85);',
    /* (where the season has snow, the bank stands in for the plaster: none is painted under or around it) */
    '  col = mix(col, plaster, shelf * (1.0 - uFx.z));',
    /* snow (a season's water.snow): the pale shelf becomes a bank of snow above the water. It does not refract,
       its drifts are lit from the upper left (a height field sampled again toward the sun), a fine sparkle
       twinkles in it, and it casts a soft blue shadow down-right onto the water at its edge */
    '  float snow = 0.0;',
    '  if (uFx.z > 0.0 && uShelf.z > 0.0) {',
    '    vec2 hb = uShelf.zw * 0.5, sq = sp + vec2(0.0, uScroll);',
    '    float ss = sdBox(sp - (uShelf.xy + hb), hb, 140.0) + (vnoise(sq / 150.0 + 1.3) - 0.5) * 80.0 + (vnoise(sq / 40.0) - 0.5) * 12.0;',
    '    snow = (1.0 - smoothstep(-28.0, 6.0, ss)) * uFx.z;',
    '    float sh = 1.0 - smoothstep(-6.0, 46.0, sdBox(sp - vec2(16.0, 22.0) - (uShelf.xy + hb), hb, 140.0) + (vnoise((sq - vec2(16.0, 22.0)) / 120.0 + 1.3) - 0.5) * 70.0);',
    '    col *= 1.0 - 0.2 * sh * (1.0 - snow) * uFx.z;',
    '    if (snow > 0.0) {',
    '      float h0 = vnoise(sq / 230.0) * 0.7 + vnoise(sq / 96.0 + 5.1) * 0.3;',
    '      float h1 = vnoise((sq + vec2(-10.0, -12.0)) / 230.0) * 0.7 + vnoise((sq + vec2(-10.0, -12.0)) / 96.0 + 5.1) * 0.3;',
    '      float lt = clamp(0.74 + (h0 - h1) * 6.0, 0.0, 1.0);',
    '      vec3 sc = mix(vec3(0.85, 0.905, 0.965), vec3(1.0, 0.997, 0.99), lt);',
    '      sc = mix(sc, vec3(0.86, 0.92, 0.98), smoothstep(-28.0, 6.0, ss) * 0.5);',   /* the bank's blue lip */
    '      vec2 cl = floor(sq / 3.5), fc = fract(sq / 3.5) - 0.5; float hc = hash21(cl);',
    '      float tw = max(sin(t * (1.3 + 2.4 * hc) + hc * 40.0), 0.0); tw *= tw; tw *= tw;',
    '      sc += vec3(0.85, 0.93, 1.0) * step(0.982, hc) * tw * exp(-dot(fc, fc) * 16.0) * 0.75 * lt;',
    '      col = mix(col, sc, snow);',
    '    }',
    '  }',
    /* refracted floor tiles in the deep part (none on the plaster shelf) */
    '  vec2 tl = abs(fract(fp / 92.0) - 0.5); float grout = smoothstep(0.476, 0.5, max(tl.x, tl.y)) * (1.0 - max(shelf, beach));',
    '  col = mix(col, col * 1.06 + vec3(0.03, 0.05, 0.05), grout * 0.2);',
    /* the floating candy's shadow: its real silhouette, cast down-right from the one sun (upper left) and
       softened by the water; tinted where the light passes through coloured candy (never the paper stick),
       with the lens's focused spots and a bright caustic rim around the glassy parts. Where the copy sits
       under the pop (phones, tablets) the shadow fades out into the bright shallows before it reaches the
       copy, so it never darkens the headline (cf = 0 there: those pixels skip the shadow entirely) */
    '  float lit = 1.0, rim = 0.0;',
    '  float cf = 1.0 - smoothstep(uSilClip - 92.0, uSilClip - 12.0, sp.y);',
    '  if (uSilK.w > 0.0 && cf > 0.0) {',
    '    vec2 sq = sp + refr * 0.5;',
    '    vec2 uv = (sq - uSilBox.xy) / uSilBox.zw, m = uSilK.x / uSilBox.zw, mw = uSilK.z / uSilBox.zw;',
    '    if (uv.x > -mw.x && uv.x < 1.0 + mw.x && uv.y > -mw.y && uv.y < 1.0 + mw.y) {',
    '      vec4 c = vec4(0.0); float o = 0.0;',
    SIL_TAPS.join('\n'),
    '      c *= 1.0 / 12.0; o *= 1.0 / 6.0;',
    '      float S = c.a, S0 = S;',
    /* a bite crater: the candy is thinner there, so a soft, slightly lighter spot shows in its shadow (with
       the faintest glint at the crater's rim); never a hole: the ball is still solid candy behind it */
    '      float lk = 0.0, lr = 0.0;',
    '      for (int i = 0; i < 3; i++) {',
    '        vec4 K = uLeak[i]; if (K.w <= 0.0) continue;',
    '        float q = length(sq - K.xy) / K.z;',
    '        lk = max(lk, (1.0 - smoothstep(0.15, 1.0, q)) * K.w);',
    '        lr = max(lr, exp(-(q - 0.8) * (q - 0.8) * 14.0) * K.w);',
    '      }',
    '      S *= 1.0 - 0.25 * lk;',
    '      float s = max(S, o * 0.3);',
    '      if (s > 0.002) {',
    '        vec3 cc = c.rgb / max(S0, 0.004);',
    '        float glass = smoothstep(0.1, 0.36, max(cc.r, max(cc.g, cc.b)) - min(cc.r, min(cc.g, cc.b))) * smoothstep(0.02, 0.2, S0);',
    /* over the pale plaster shelf the shadow thins, so it never muddies the headline */
    '        float a = uSilK.y * (1.0 - max(shelf * 0.6, beach * 0.3)) * cf;',
    '        vec3 tint = mix(vec3(1.0), clamp(uCandy * 0.7 + 0.35, 0.0, 1.0), 0.4 * glass);',
    '        col *= (1.0 - s * a) * mix(vec3(1.0), tint, s * cf);',
    '        col += uCandy * S * a * 0.22 * glass;',
    '        lit = 1.0 - S * 0.72 * cf;',
    '        rim = exp(-(S - 0.42) * (S - 0.42) * 30.0) * a * 2.6 * glass;',
    /* the lens: light gathered through the candy, soft candy-tinted spots (never a white flare) */
    '        float wb = sin(t * 1.6) * 0.07 + sin(t * 2.7 + 1.3) * 0.05, fl = 0.0;',
    '        for (int i = 0; i < 3; i++) {',
    '          vec4 L = uLens[i]; if (L.w <= 0.0) continue;',
    '          vec2 fc = (sq - L.xy) / L.z - vec2(wb, -wb * 0.6); float fo = dot(fc, fc);',
    '          fl += (exp(-fo * 70.0) * 0.95 + exp(-fo * 16.0) * 0.4) * L.w;',
    '        }',
    '        col += mix(vec3(1.0, 0.93, 0.96), uCandy, 0.4) * fl * smoothstep(0.3, 0.75, S) * (0.92 + 0.08 * sin(t * 5.0)) * a;',
    '        col += mix(vec3(1.0, 0.95, 0.97), uCandy, 0.5) * lr * smoothstep(0.15, 0.6, S0) * a * 0.1;',
    '      }',
    '    }',
    '  }',
    /* a striped parasol's shade: sixteen panels (the white ones let more sun through than the pink),
       a scalloped valance edge, a soft penumbra; only a faint caustic shimmer reaches under it */
    '  if (uShade.z > 0.0) {',
    '    vec2 dv = (sp + refr * 0.22 - uShade.xy) / uShade.zw;',
    '    float ang = atan(dv.y, dv.x);',
    '    float panel = smoothstep(-0.3, 0.3, sin(ang * 8.0));',   // soft panel edges: a penumbra, not a pie chart
    '    float r = length(dv) * (1.0 - 0.05 * abs(sin(ang * 8.0)));',
    '    float s = 1.0 - smoothstep(0.9, 1.03, r);',
    '    float rib = (1.0 - smoothstep(0.0, 0.012, abs(sin(ang * 8.0)) * length(dv))) * s * 0.05;',
    '    col *= 1.0 - s * mix(0.45, 0.54, panel) + rib;',
    '    col += vec3(0.0, 0.01, 0.025) * s * (1.0 - panel);',
    '    lit *= 1.0 - s * 0.9;',
    '  }',
    /* caustics: crisp in the shallows, softer and dimmer with depth, golden late in the day */
    /* (in a few centimetres of water the swell's lenses never come to a focus: broad, faint and even there) */
    '  float cs = caustic(fp, t * 0.8, mix(mix(26.0, 11.0, depth), 13.0, beach));',
    '  float patchy = mix(0.5 + 0.95 * vnoise(fp / 310.0 + vec2(t * 0.02, -t * 0.016)), 0.95, beach * 0.6);',
    '  float amp = mix(0.34, 0.16, depth) * patchy * (1.0 - shelf * (0.5 + warm * 0.2)) * (1.0 - beach * 0.62) * (1.0 - snow) * uGain.x;',
    '  float ca = cs * amp * lit * (1.0 + rim);',
    '  col += mix(mix(vec3(0.86, 1.0, 1.0), vec3(0.93, 0.98, 1.0), uFx.x), vec3(1.0, 0.86, 0.6), warm) * ca * (1.0 - warm * beach * 0.7);',
    /* golden hour over the pale shallows: the net is laid in gold over the aqua (added light there would only
       bleach to white), so the low sun reads in the light itself and the water keeps its colour */
    '  if (warm * beach > 0.0) col = mix(col, vec3(1.0, 0.84, 0.56), clamp(ca * 2.2, 0.0, 0.85) * warm * beach);',
    /* glints gather toward the sun (upper left) in drifting patches on the wave crests */
    '  vec2 hv = (vp - uHot) * vec2(view.x / view.y, 1.0);',
    '  float hot = exp(-dot(hv, hv) * 2.6) * lit * (1.0 - max(shelf, beach) * 0.6) * (1.0 - snow) * uGain.y;',
    '  if (hot > 0.015) {',
    '    float crest = smoothstep(0.42, 0.78, vnoise(pp * 0.013 + vec2(t * 0.08, -t * 0.06)));',
    '    col += mix(vec3(1.0, 0.98, 0.93), vec3(1.0, 0.84, 0.58), warm) * glints(pp, t) * hot * crest * 1.3;',
    '  }',
    /* ripple crests catch the sun: light on the sunward slope, a soft shade behind */
    '  float rl = dot(rg, vec2(-0.55, -0.83)) * 7.0 * (1.0 - snow);',
    '  col += vec3(0.95, 0.99, 1.0) * clamp(rl, 0.0, 0.24) - vec3(0.05, 0.03, 0.02) * clamp(-rl, 0.0, 0.4);',
    /* steam (water.steam): soft mist wisps drifting off a heated pool, thinner over the shelf and the copy */
    '  if (uFx.y > 0.0) {',
    '    vec2 q = pp * vec2(0.0026, 0.0038) + vec2(t * 0.016, t * 0.05);',
    '    float m = vnoise(q) * 0.55 + vnoise(q * 2.3 + vec2(3.7, 1.9) + vec2(-t * 0.02, t * 0.07)) * 0.3 + vnoise(q * 5.1 + 9.2) * 0.15;',
    '    float mist = smoothstep(0.46, 0.84, m) * uFx.y * 0.5 * (1.0 - max(shelf, beach) * 0.8) * (1.0 - snow);',
    '    col = mix(col, vec3(0.94, 0.97, 1.0), mist);',
    '  }',
    /* the one sun, out of frame at the upper left: its light lies across the whole pool, strongest toward it and
       fading toward the far corner, where the shadows fall (warm gold at golden hour, crisp in the cold) */
    '  if (uBeach.w > 0.0) {',
    '    vec2 sv = (vp - vec2(-0.06, -0.24)) * vec2(view.x / view.y, 1.0);',
    '    vec3 sunC = mix(mix(vec3(1.0, 0.985, 0.93), vec3(0.95, 0.98, 1.0), uFx.x), vec3(1.0, 0.84, 0.62), warm);',
    '    col = 1.0 - (1.0 - col) * (1.0 - sunC * exp(-dot(sv, sv) * 0.85) * (0.16 + warm * 0.08));',   /* light adds (a screen): never greyed */
    '  }',
    /* golden hour warms the deep water and the light; the clear shallows keep their aqua (never mint, never cream) */
    '  col = mix(col, col * vec3(1.07, 0.97, 0.86) + vec3(0.035, 0.015, 0.0), warm * (0.5 - max(shelf * 0.2, beach * 0.36)));',
    /* cool (water.cool): a crisp cold light, the water a cleaner blue and the highlights a little bluer */
    '  if (uFx.x > 0.0) col = mix(col, col * vec3(0.9, 0.985, 1.045) + vec3(0.0, 0.004, 0.018), uFx.x);',
    '  return col; }',

    'vec3 pal3(vec3 a, vec3 b, vec3 c, float d){ float k = smoothstep(0.0, 1.0, clamp(d * 2.0, 0.0, 1.0)); float j = smoothstep(0.0, 1.0, clamp(d * 2.0 - 1.0, 0.0, 1.0)); return mix(mix(a, b, k), c, j); }',
    /* noon → golden hour passes through a pale champagne haze, never the grey midpoint of blue and peach */
    'vec3 skyCol(float v){',
    '  float j = smoothstep(0.0, 1.0, clamp(uWarm * 2.0 - 1.0, 0.0, 1.0)); vec3 br = vec3(0.11, 0.06, -0.06) * j * (1.0 - j) * 4.0;',
    '  vec3 top = pal3(vec3(0.56, 0.80, 0.94), vec3(0.30, 0.66, 0.90), vec3(0.97, 0.70, 0.56), uWarm) + br;',
    '  vec3 mid = pal3(vec3(0.80, 0.91, 0.97), vec3(0.64, 0.84, 0.96), vec3(1.0, 0.80, 0.60), uWarm) + br * 0.8;',
    '  vec3 hz = pal3(vec3(1.0, 0.89, 0.80), vec3(0.93, 0.97, 0.99), vec3(1.0, 0.88, 0.62), uWarm);',
    '  float x = pow(clamp(v, 0.0, 1.0), 0.7);',
    '  return x < 0.45 ? mix(hz, mid, x / 0.45) : mix(mid, top, (x - 0.45) / 0.55); }',

    'vec3 sea(vec2 sp, float t){',
    '  float H = max(uSea.w, 1.0); float focal = H * 1.05; float skyH = max(uHz - uSea.y, 1.0);',
    '  vec3 sunC = pal3(vec3(1.0, 0.93, 0.80), vec3(1.0, 0.98, 0.9), vec3(1.0, 0.76, 0.40), uWarm);',
    '  float sunEl = (uHz - uSun.y) / focal;',
    '  if (sp.y < uHz) {',
    '    vec3 c = skyCol((uHz - sp.y) / skyH);',
    '    float d = length(sp - uSun) / H;',
    '    c += sunC * (exp(-d * 6.5) * 0.26 + exp(-d * 20.0) * 0.32) * (0.6 + 0.4 * abs(uWarm - 0.5) * 2.0);',
    '    c = mix(c, pal3(vec3(1.0, 0.95, 0.9), vec3(1.0), vec3(1.0, 0.88, 0.66), uWarm), exp(-(uHz - sp.y) / (H * 0.035)) * 0.4);',
    '    return c;',
    '  }',
    '  float a = (sp.y - uHz) / focal; float z = 1.0 / max(a, 0.0025);',
    '  vec2 plane = vec2((sp.x - (uSea.x + uSea.z * 0.5)) / focal * z, z);',
    '  vec2 q = plane * vec2(2.2, 4.6) + vec2(t * 0.14, t * 0.42); float e = 0.07;',
    '  float n0 = vnoise(q), nx = vnoise(q + vec2(e, 0.0)), ny = vnoise(q + vec2(0.0, e));',
    '  vec2 q2 = plane * vec2(5.5, 11.0) - vec2(t * 0.2, t * 0.55);',
    '  float m0 = vnoise(q2), mx = vnoise(q2 + vec2(e, 0.0)), my = vnoise(q2 + vec2(0.0, e));',
    '  vec2 slope = (vec2(nx - n0, ny - n0) + vec2(mx - m0, my - m0) * 0.6) / e * 0.06;',
    '  float reflEl = a + 2.0 * slope.y * (0.6 + a);',
    '  vec3 refl = skyCol(clamp(reflEl * focal / skyH, 0.0, 1.0));',
    '  float fres = 0.03 + 0.97 * pow(1.0 - clamp(a * 2.4 + slope.y * 0.6, 0.0, 1.0), 5.0);',
    '  vec3 deep = mix(vec3(0.03, 0.40, 0.64), vec3(0.02, 0.43, 0.42), uLagoon);',
    '  vec3 near = mix(vec3(0.16, 0.66, 0.82), vec3(0.14, 0.70, 0.64), uLagoon);',
    /* golden hour: deep teal-navy water under a peach sky, never purple */
    '  deep = pal3(deep * vec3(1.05, 1.0, 0.95) + vec3(0.04, 0.03, 0.0), deep, vec3(0.04, 0.27, 0.41), uWarm);',
    '  near = pal3(near * 0.92 + vec3(0.06, 0.05, 0.03), near, vec3(0.14, 0.40, 0.48), uWarm);',
    '  vec3 c = mix(mix(deep, near, smoothstep(0.0, 0.45, a)), refl, fres);',
    '  vec2 tau = vec2((uSun.x - sp.x) / focal * 0.5, (sunEl - a) * 0.5);',
    '  float sheen = exp(-dot(tau, tau) / uGlit.x);',
    '  vec2 dd = slope - tau; float spark = exp(-dot(dd, dd) / uGlit.y);',
    '  float vis = smoothstep(-0.03, 0.05, sunEl);',
    '  c += sunC * (sheen * (0.24 + 0.24 * smoothstep(0.6, 1.0, uWarm)) + spark * uGlit.z) * vis;',
    '  c = mix(c, skyCol(0.0), exp(-a * focal / (H * 0.012)) * 0.55);',
    '  return c; }',

    'void main(){',
    '  vec2 sp = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uPx;',
    '  vec3 col;',
    '  if (uSea.z > 0.0 && sp.x >= uSea.x && sp.x <= uSea.x + uSea.z && sp.y >= uSea.y && sp.y <= uSea.y + uSea.w) {',
    '    col = sea(sp, uTime);',
    /* cool (water.cool): a paler, steel-blue winter sky and a colder sea */
    '    if (uFx.x > 0.0) { float l = dot(col, vec3(0.3, 0.55, 0.15)); col = mix(col, mix(col, vec3(l) * vec3(0.93, 1.0, 1.1), 0.35) * vec3(0.95, 0.99, 1.04) + vec3(0.0, 0.0, 0.01), uFx.x); }',
    /* a soft, sun-bleached haze behind headings set on the sky */
    '    if (uHaze.z > 0.0) { vec2 hb = uHaze.zw * 0.5; float hd = sdBox(sp - (uHaze.xy + hb), hb, 60.0);',
    '      col = mix(col, pal3(vec3(1.0, 0.995, 0.975), vec3(1.0, 0.995, 0.98), vec3(1.0, 0.95, 0.88), uWarm), (1.0 - smoothstep(-40.0, 120.0, hd)) * 0.84); }',
    '  } else col = pool(sp, uTime);',
    '  col += (hash21(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;',
    '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n'); }

  var noGL = false;   // no WebGL at all: skip the 3D candy too (straight to its CSS fallback, no library warnings)
  /* The water starts after the first paint (boot calls Water.start()) and sets itself up in short steps, so the
     headline and the season's words never wait for the GPU: the context; the shader, compiled and linked in
     parallel where the browser can (KHR_parallel_shader_compile, polled, never waited on); then the amenity
     cards' still of the pool. The canvas fades in on its first frame (html.has-water). A lost context (phones
     reclaim the GPU from background tabs) is built again once the browser restores it.                     */
  var Water = (function () {
    var canvas = $('#water');
    if (!canvas || params.get('nowater') === '1') return null;
    var gl = null, pcx = null, prog = null, U = {}, phase = 'idle';   // idle → linking → ready (failed; lost)
    var UNIFORMS = ['uRes', 'uPx', 'uTime', 'uScroll', 'uDeep', 'uShallow', 'uLagoon', 'uCandy', 'uSea', 'uHz', 'uSun', 'uWarm', 'uGlit', 'uHaze',
      'uShelf', 'uBeach', 'uShade', 'uPoolWarm', 'uHot', 'uFx', 'uGain', 'uSil', 'uSilBox', 'uSilK', 'uLens', 'uSilClip', 'uLeak', 'uRip', 'uRipN'];
    // Ripple slots: 32 with a mouse, 24 on touch screens (fewer pixels to shade), never more than the GPU's
    // fragment uniform budget leaves room for (the rest of the shader uses ~34 vectors). Set once it starts.
    var RIP_CAP = coarse ? 24 : 32, RIP_MAX = 0;
    function compile(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    function fail(why) {
      phase = 'failed';
      if (why) console.warn('[water] ' + why);
      html.classList.remove('has-water'); html.classList.add('no-water');   // the copy takes its own sunny ground (CSS)
    }
    // once the context has been tried, the page knows whether there is WebGL at all (noGL): the 3D candy waits
    // for that (onTried), so a browser without it goes straight to the drawn stand-ins
    var tried = false, triedFns = [];
    function markTried() { tried = true; var f = triedFns; triedFns = []; f.forEach(function (fn) { fn(); }); }
    // step 1 (its own task, after the first paint): the context, then the shader queued (nothing waits on it here)
    function build() {
      if (!gl) {
        try { gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'default' }); } catch (e) { gl = null; }
        if (!gl) { noGL = true; fail(); markTried(); return; }
        RIP_MAX = Math.max(8, Math.min(RIP_CAP, (gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) || 64) - 35));
        ripGPU = new Float32Array(RIP_MAX * 4); ripStats.cap = RIP_MAX;
        markTried();
      }
      pcx = gl.getExtension('KHR_parallel_shader_compile');   // (asked again after a restore: extensions don't survive it)
      var vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, fragSource(RIP_MAX));
      var p = prog = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
      phase = 'linking';
      var tLink = performance.now();
      // step 2: poll until it has linked (with the extension a poll never blocks; without it, the one check comes
      // a little later, so the driver has had time to finish in the background)
      function poll() {
        if (p !== prog || phase !== 'linking') return;                     // lost meanwhile
        if (pcx && !gl.getProgramParameter(p, pcx.COMPLETION_STATUS_KHR) && performance.now() - tLink < 8000) { setTimeout(poll, 16); return; }
        if (gl.isContextLost()) return;
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { fail('shader: ' + (gl.getShaderInfoLog(fs) || gl.getShaderInfoLog(vs) || gl.getProgramInfoLog(p))); return; }
        finish();
      }
      setTimeout(poll, pcx ? 16 : 120);
    }
    // step 3: the geometry, the uniforms and the silhouette's texture; the size; the cards' still (once); go
    function finish() {
      gl.useProgram(prog);
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var aPos = gl.getAttribLocation(prog, 'aPos'); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      U = {};
      UNIFORMS.forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
      // the candy's silhouette (a small 2D canvas copied from the 3D canvas), premultiplied, linear, clamped
      var silTex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, silTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      gl.uniform1i(U.uSil, 0);
      sil.ok = false; sil.dirty = !!sil.src;           // (uploaded again after a restore)
      resize();
      if (!baked) bake();
      phase = 'ready'; api.lastSig = '';
      kick();
    }
    var sil = { src: null, dirty: false, ok: false, ver: 0, upMs: 0, ups: 0 };
    var benchQ = { rip: null, noShadow: false };   // QA overrides for api.bench()

    var windows = $$('.is-window').map(function (el) {
      var shelf = $('[data-shelf]', el), w0 = parseFloat(el.getAttribute('data-warm') || '0'), glow = el.classList.contains('glow');
      return {
        el: el, type: el.getAttribute('data-water') || 'pool', hz: parseFloat(el.getAttribute('data-horizon') || '.5'),
        warm: w0 + (1 - w0) * WFX.warm,             // the season's golden hour lifts every pool toward the finale's
        sunMode: el.getAttribute('data-sun') || 'noon',
        sand: $('.beach__sand', el), haze: $('[data-haze]', el), shade: $('[data-shade]', el),
        shelf: shelf, lines: shelf ? $$('.hero__l1, .hero__l2', shelf) : [], bottomShelf: glow,
        // the hero's copy lies on open water: its sunlit beach entry (beachLine) is shaped by these blocks
        beach: shelf ? shelf.children : null
      };
    });
    // ripple pool: page-space centre, birth time, amplitude per slot; the GPU gets only the live ones (RIP_MAX
    // slots are used: none until the water has started, so a ripple before then is simply skipped)
    var RIP = { x: new Float64Array(RIP_CAP), y: new Float64Array(RIP_CAP), t: new Float64Array(RIP_CAP), a: new Float64Array(RIP_CAP) };   // float64: a birth time must never round past now
    var ripGPU = null, ripLive = 0;
    var ripStats = { cap: 0, spawned: 0, skipped: 0, recycled: 0, cutVisible: 0, maxLive: 0 };
    var t0 = performance.now();
    var frozenT = 41.3;                                 // a pleasant still frame for reduced motion
    var pinnedQ = parseFloat(params.get('wq'));
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    // full resolution on 1x desktops; the adaptive loop only lowers it when frames run slow
    var quality = isFinite(pinnedQ) ? clamp(pinnedQ, 0.3, 1) : (coarse ? 0.62 : (dpr > 1.5 ? 0.78 : 1));
    var qMax = quality;
    var qWin = { t: 0, n: 0, slow: 0 };                 // the adaptive loop's current window: ms drawn, frames, slow frames
    var pxRatio = 1, cssW = 1, cssH = 1;
    var tintTarget = seasonTint(state.product.water);
    var tint = { deep: tintTarget.deep.slice(), shallow: tintTarget.shallow.slice(), lagoon: tintTarget.lagoon };
    var candyCol = hexRgb(state.product.candy.color), candyTarget = candyCol.slice();
    var poolWarm = 0;
    var api = { shadow: null, sun: null, warm: 0.05, visible: false, easing: false, lastSig: '', ema: 16, frames: 0, ready: false };
    var shown = false;
    api.start = function () { if (phase === 'idle') build(); };
    api.onTried = function (fn) { if (tried) fn(); else triedFns.push(fn); };
    Object.defineProperty(api, 'phase', { get: function () { return phase; } });   // QA: idle, linking, ready, failed, lost
    // the GPU taken away (a phone reclaiming it from a background tab): the copy gets its own ground meanwhile,
    // and the water is built again in the same steps once the browser gives the context back
    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();                              // (so the browser may restore it)
      if (phase === 'failed') return;
      phase = 'lost'; shown = false; api.ready = false;
      html.classList.remove('has-water'); html.classList.add('no-water');
    }, false);
    canvas.addEventListener('webglcontextrestored', function () { if (phase === 'lost') build(); }, false);

    function now() { return reduce ? frozenT : (performance.now() - t0) / 1000; }
    function resize() {
      cssW = canvas.clientWidth || innerWidth; cssH = canvas.clientHeight || innerHeight;
      var px = dpr * quality;
      var w = Math.max(1, Math.round(cssW * px)), h = Math.max(1, Math.round(cssH * px));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      pxRatio = w / cssW;
      api.lastSig = '';
    }

    // The amenity cards' slice of the sunlit pool (--caustic, style.css): one still frame of high-key caustics in
    // the season's water (its tint, golden hour, cool light and caustic strength), drawn in the canvas's corner
    // before its first real frame (it is still unseen then), copied out in the same task and encoded off the main
    // thread (toBlob). Once per page: a restored context keeps the still it already made.
    var baked = false;
    function bake() {
      baked = true;
      var w = Math.min(640, canvas.width), h = Math.min(400, canvas.height);
      if (w < 64 || h < 64 || !window.URL || !URL.createObjectURL) return;
      try {
        var bt = seasonTint({ deep: [0.50, 0.85, 0.91], shallow: [0.70, 0.93, 0.955], lagoon: 0 });
        gl.disable(gl.SCISSOR_TEST); gl.viewport(0, 0, w, h);
        gl.uniform2f(U.uRes, w, h); gl.uniform1f(U.uPx, 1); gl.uniform1f(U.uTime, 17.3); gl.uniform1f(U.uScroll, 0);
        gl.uniform3fv(U.uDeep, bt.deep); gl.uniform3fv(U.uShallow, bt.shallow); gl.uniform1f(U.uLagoon, 0);
        gl.uniform3f(U.uCandy, 1, 0.08, 0.58); gl.uniform4f(U.uSea, 0, 0, 0, 0); gl.uniform4f(U.uHaze, 0, 0, 0, 0);
        gl.uniform4f(U.uShelf, 0, 0, 0, 0); gl.uniform4f(U.uBeach, 0, 0, 0, 0); gl.uniform4f(U.uShade, 0, 0, 0, 0); gl.uniform1f(U.uPoolWarm, WFX.warm);
        gl.uniform2f(U.uHot, -9, -9); gl.uniform4f(U.uSilK, 0, 0, 0, 0); gl.uniform1f(U.uRipN, 0);
        gl.uniform4f(U.uFx, WFX.cool, 0, 0, 0); gl.uniform2f(U.uGain, WFX.caustics, WFX.glints);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        var still = doc.createElement('canvas'); still.width = w; still.height = h;
        var g2 = still.getContext('2d'); if (!g2) return;
        g2.drawImage(canvas, 0, canvas.height - h, w, h, 0, 0, w, h);   // (GL's corner is bottom left)
        still.toBlob(function (b) { if (b) html.style.setProperty('--caustic', 'url("' + URL.createObjectURL(b) + '")'); }, 'image/jpeg', 0.86);
      } catch (e) {}
    }
    window.addEventListener('resize', function () { if (phase === 'ready') resize(); }, { passive: true });

    // A ring expands at 170 px/s and fades by itself: e^(-0.95 t), eased to exactly zero by RIP_LIFE, so
    // nothing ever has to be cut. A slot is reused only once nobody can see its ring any more: faded below
    // RIP_FADED, or older than RIP_OLD and fainter than RIP_FAINT (its crest is then 430+ px out, past a
    // phone's edges, and bends the floor by under 0.7 px); with every slot still visible the new ripple is
    // skipped instead. Moving ripples leave RIP_KEEP slots for taps and the candy's own splashes.
    var RIP_LIFE = 4.6, RIP_FADE0 = 2.6, RIP_DECAY = 0.95, RIP_FADED = 0.01, RIP_KEEP = 4, RIP_OLD = 2.5, RIP_FAINT = 0.02;
    function ripStrength(i, tNow) {
      var a = RIP.a[i], age = Math.max(0, tNow - RIP.t[i]);
      if (a <= 0 || age >= RIP_LIFE) return 0;
      var f = clamp((age - RIP_FADE0) / (RIP_LIFE - RIP_FADE0), 0, 1);
      return a * Math.exp(-RIP_DECAY * age) * (1 - f * f * (3 - 2 * f));
    }
    function ripGone(s, age) { return s < RIP_FADED || (s < RIP_FAINT && age > RIP_OLD); }
    // ripple(x, y, amp, kind): viewport px; kind 'move' (pointer travel) or anything else (a tap, a bite).
    // Returns false when it was skipped because every usable slot still shows a visible ring.
    api.ripple = function (x, y, amp, kind) {
      if (reduce) return false;
      var tNow = now(), free = -1, gone = -1, goneS = 1e9, live = 0;
      for (var i = 0; i < RIP_MAX; i++) {
        var s = ripStrength(i, tNow);
        if (s <= 0) { if (free < 0) free = i; continue; }
        live++;
        if (s < goneS && ripGone(s, tNow - RIP.t[i])) { goneS = s; gone = i; }   // the faintest ring nobody can see
      }
      var slot = free;
      // leave room for taps; a GPU that already had to lower the water's resolution gets fewer moving rings
      if (kind === 'move' && live >= Math.round((RIP_MAX - RIP_KEEP) * clamp(quality / qMax, 0.5, 1))) slot = -1;
      if (slot < 0) slot = gone;
      if (slot < 0) { ripStats.skipped++; return false; }
      var s0 = ripStrength(slot, tNow);
      if (s0 > 0 && !ripGone(s0, tNow - RIP.t[slot])) ripStats.cutVisible++;   // never happens: QA guard
      else if (s0 > 0) ripStats.recycled++;
      RIP.x[slot] = x; RIP.y[slot] = y + window.scrollY; RIP.t[slot] = tNow; RIP.a[slot] = amp;
      ripStats.spawned++;
      return true;
    };
    // QA: live ripple count and the pool's history
    api.rippleStats = function () {
      var tNow = now(), live = 0, visible = 0, ages = [];
      for (var i = 0; i < RIP_MAX; i++) {
        var s = ripStrength(i, tNow);
        if (s > 0) { live++; ages.push(+(tNow - RIP.t[i]).toFixed(2)); }
        if (s > 0 && !ripGone(s, tNow - RIP.t[i])) visible++;
      }
      return Object.assign({ live: live, visible: visible, ages: ages.sort(function (a, b) { return a - b; }) }, ripStats);
    };
    // the candy's silhouette arrived (a canvas): uploaded on the next draw
    api.silhouette = function (src) { sil.src = src; sil.dirty = true; sil.ver++; };
    api.silStats = function () { return { ok: sil.ok, uploads: sil.ups, uploadMs: sil.ups ? +(sil.upMs / sil.ups).toFixed(3) : 0, w: sil.src ? sil.src.width : 0, h: sil.src ? sil.src.height : 0 }; };
    // the push of the live ripples at a viewport point (the crest's outward direction × its strength): the
    // seasonal floaters ride it. The same rings the shader draws, evaluated on the CPU (a few multiplies each).
    api.ripplePush = function (x, y) {
      var tNow = now(), gx = 0, gy = 0, py = y + window.scrollY;
      for (var i = 0; i < RIP_MAX; i++) {
        var s = ripStrength(i, tNow); if (s < 0.004) continue;
        var age = tNow - RIP.t[i], dx = x - RIP.x[i], dy = py - RIP.y[i], d = Math.sqrt(dx * dx + dy * dy) + 0.001;
        var R = age * 170 + 4, w = 16 + age * 30, xx = d - R;
        if (xx > 2.2 * w || xx < -2.2 * w) continue;
        var env = Math.exp(-(xx * xx) / (w * w)) * s;
        gx += dx / d * env; gy += dy / d * env;
      }
      return [gx, gy];
    };
    api.setTint = function (w) { tintTarget = seasonTint(w); api.lastSig = ''; };
    api.setCandy = function (hex) { candyTarget = hexRgb(hex); api.lastSig = ''; };

    // read phase: which windows are on screen, and the rects the shader needs (called from the frame loop)
    var vis = { any: false, sea: null, pool: null, top: 0, bottom: 0 };
    function shelfRect(w, r) {
      var c = w.shelf.getBoundingClientRect(), right = c.right;
      for (var i = 0; i < w.lines.length; i++) right = Math.max(right, w.lines[i].getBoundingClientRect().right);
      if (cssW < 1024) return [-300, c.top - 120, cssW + 600, (w.bottomShelf ? c.bottom + 70 : r.bottom + 300) - (c.top - 120)];
      if (w.bottomShelf) return [-300, c.top - 90, right + 110 + 300, r.bottom + 300 - (c.top - 90)];
      return [-300, r.top - 300, right + 100 + 300, c.bottom + 90 - (r.top - 300)];
    }
    // The hero's beach entry: [direction x, y, where the slope starts, how wide it is] for the shader. One straight
    // line, gently curved by the shader, past the furthest corner of the copy's blocks: wide layouts slope away to
    // the right, leaning so the deep end gathers down-right (where the one sun's shadows fall); a single column
    // (the pop above the copy) slopes away upward, into the deep water the pop floats over.
    function beachLine(w) {
      var wide = cssW >= 1024, dx = wide ? 0.96 : 0.1, dy = wide ? 0.28 : -1, n = Math.sqrt(dx * dx + dy * dy), off = -1e9;
      dx /= n; dy /= n;
      for (var i = 0; i < w.beach.length; i++) {
        var b = w.beach[i].getBoundingClientRect();
        if (b.width) off = Math.max(off, (dx > 0 ? b.right : b.left) * dx + (dy > 0 ? b.bottom : b.top) * dy);
      }
      return off > -1e8 ? [dx, dy, off + 44, wide ? clamp(cssW * 0.17, 200, 330) : clamp(cssH * 0.22, 160, 240)] : null;
    }
    api.measure = function (st) {
      var vh = cssH, bestSea = 0, bestPool = 0;
      vis.any = false; vis.sea = null; vis.pool = null; vis.top = 1e9; vis.bottom = -1e9;
      for (var i = 0; i < windows.length; i++) {
        var w = windows[i], r = w.el.getBoundingClientRect();
        if (r.bottom <= 0 || r.top >= vh || r.height === 0) continue;
        vis.any = true;
        var top = Math.max(0, r.top), bottom = Math.min(vh, r.bottom), hz = 0;
        if (w.type === 'sea') {
          hz = w.el.__hzPx != null ? r.top + w.el.__hzPx : r.top + r.height * w.hz;
          if (w.sand) { var sr = w.sand.getBoundingClientRect(); hz = sr.top - clamp(r.height * 0.11, 46, 120); bottom = Math.min(bottom, sr.top + 8); }
        }
        vis.top = Math.min(vis.top, top); vis.bottom = Math.max(vis.bottom, bottom);
        var a = bottom - top;
        if (w.type === 'sea') {
          if (a > bestSea) { bestSea = a; vis.sea = { r: r, hz: hz, mode: w.sunMode, haze: w.haze ? w.haze.getBoundingClientRect() : null }; }
        } else if (a > bestPool) {
          bestPool = a;
          var sh = w.shade ? w.shade.getBoundingClientRect() : null;
          vis.pool = { w: w, r: r, base: Math.round(r.top + st.sy), shelf: w.shelf && !w.beach ? shelfRect(w, r) : null, beach: w.beach ? beachLine(w) : null, shade: sh };
        }
      }
      api.visible = vis.any;
    };

    function draw(st) {
      var sea = vis.sea, pool = vis.pool, sun = [0, 0], warm = 0.05, glit = [0.006, 0.00035, 1.5];
      if (sea) {
        if (sea.mode === 'arc' && api.sun) { sun = api.sun; warm = api.warm; }
        else { sun = [sea.r.left + sea.r.width * 0.2, sea.r.top + sea.r.height * 0.03]; warm = WFX.seaWarm; glit = [0.045, 0.0016, 0.9]; }
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.SCISSOR_TEST);
      gl.clearColor(1, 0.992, 0.973, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.SCISSOR_TEST);
      var y0 = Math.floor((cssH - vis.bottom) * pxRatio) - 2, y1 = Math.ceil((cssH - vis.top) * pxRatio) + 2;
      gl.scissor(0, Math.max(0, y0), canvas.width, Math.max(1, Math.min(canvas.height, y1) - Math.max(0, y0)));

      var base = pool ? pool.base : 0;
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uPx, pxRatio);
      gl.uniform1f(U.uTime, now());
      gl.uniform1f(U.uScroll, st.sy - base);
      gl.uniform3fv(U.uDeep, tint.deep); gl.uniform3fv(U.uShallow, tint.shallow); gl.uniform1f(U.uLagoon, tint.lagoon);
      gl.uniform3fv(U.uCandy, candyCol);
      if (sea) {
        gl.uniform4f(U.uSea, sea.r.left, sea.r.top, sea.r.width, sea.r.height); gl.uniform1f(U.uHz, sea.hz);
        var hz = sea.haze;
        if (hz) gl.uniform4f(U.uHaze, hz.left - 30, hz.top - 24, hz.width + 60, hz.height + 48); else gl.uniform4f(U.uHaze, 0, 0, 0, 0);
      } else { gl.uniform4f(U.uSea, 0, 0, 0, 0); gl.uniform4f(U.uHaze, 0, 0, 0, 0); }
      gl.uniform2f(U.uSun, sun[0], sun[1]);
      gl.uniform1f(U.uWarm, warm);
      gl.uniform3f(U.uGlit, glit[0], glit[1], glit[2]);
      if (pool && pool.shelf) gl.uniform4f(U.uShelf, pool.shelf[0], pool.shelf[1], pool.shelf[2], pool.shelf[3]); else gl.uniform4f(U.uShelf, 0, 0, 0, 0);
      if (pool && pool.beach) gl.uniform4f(U.uBeach, pool.beach[0], pool.beach[1], pool.beach[2], pool.beach[3]); else gl.uniform4f(U.uBeach, 0, 0, 0, 0);
      if (pool && pool.shade) {
        var s = pool.shade;
        var srx = Math.max(s.width / 2 + 96, s.height / 2 + 150, 230);
        gl.uniform4f(U.uShade, s.left + s.width / 2, s.top + s.height / 2, srx, Math.max(srx * 0.6, s.height / 2 + 70));
      } else gl.uniform4f(U.uShade, 0, 0, 0, 0);
      gl.uniform1f(U.uPoolWarm, poolWarm);
      gl.uniform2f(U.uHot, SUN_HOT[0], SUN_HOT[1]);
      gl.uniform4f(U.uFx, WFX.cool, WFX.steam, WFX.snow, 0);
      gl.uniform2f(U.uGain, WFX.caustics, WFX.glints);
      // the candy's shadow: upload the newest silhouette (only when the candy rendered a new one)
      if (sil.dirty && sil.src) {
        var tu = performance.now();
        try {
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sil.src);
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
          sil.ok = true;
        } catch (e) { sil.ok = false; }
        sil.dirty = false; sil.upMs += performance.now() - tu; sil.ups++;
      }
      var sh = benchQ.noShadow ? null : api.shadow;
      if (sh && sil.ok) {
        gl.uniform4f(U.uSilBox, sh.box[0], sh.box[1], sh.box[2], sh.box[3]);
        gl.uniform4f(U.uSilK, sh.blur, sh.a, sh.wide, 1);
        gl.uniform4fv(U.uLens, sh.lens); gl.uniform4fv(U.uLeak, sh.leak);
        gl.uniform1f(U.uSilClip, sh.clip != null ? sh.clip : 1e5);
      } else gl.uniform4f(U.uSilK, 0, 0, 0, 0);
      // ripples: pack the live ones (window-local page coordinates, age, strength) at the front
      var tNow = now(), n = 0, nMax = benchQ.rip == null ? RIP_MAX : benchQ.rip;
      for (var i = 0; i < RIP_MAX && n < nMax; i++) {
        var rs = ripStrength(i, tNow);
        if (rs < 0.004) continue;                     // below ~0.2 px of refraction: nothing to see
        var k4 = n * 4;
        ripGPU[k4] = RIP.x[i]; ripGPU[k4 + 1] = RIP.y[i] - base; ripGPU[k4 + 2] = tNow - RIP.t[i]; ripGPU[k4 + 3] = rs;
        n++;
      }
      ripLive = n; if (n > ripStats.maxLive) ripStats.maxLive = n;
      gl.uniform4fv(U.uRip, ripGPU);
      gl.uniform1f(U.uRipN, n);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return { sun: sun, warm: warm };
    }

    // draw phase
    api.render = function (st) {
      if (phase !== 'ready' || !vis.any) return;
      // ease the water tint, the candy colour and the pool's warmth
      var k = reduce ? 1 : 1 - Math.exp(-clamp(st.dt, 0, 120) / 420), moving = false;
      for (var c = 0; c < 3; c++) {
        tint.deep[c] = lerp(tint.deep[c], tintTarget.deep[c], k); tint.shallow[c] = lerp(tint.shallow[c], tintTarget.shallow[c], k);
        candyCol[c] = lerp(candyCol[c], candyTarget[c], k);
        if (Math.abs(tint.deep[c] - tintTarget.deep[c]) > 0.002 || Math.abs(candyCol[c] - candyTarget[c]) > 0.004) moving = true;
      }
      tint.lagoon = lerp(tint.lagoon, tintTarget.lagoon, k);
      var wantWarm = vis.pool ? vis.pool.w.warm : poolWarm;
      poolWarm = Math.abs(wantWarm - poolWarm) < 0.002 || reduce ? wantWarm : lerp(poolWarm, wantWarm, 1 - Math.exp(-clamp(st.dt, 0, 120) / 300));
      api.easing = moving;
      if (reduce) {                                     // still frames: only redraw when something moved
        var sea = vis.sea, sh = api.shadow, pl = vis.pool;
        var sig = [Math.round(st.sy), cssW, cssH, sea ? Math.round(sea.r.top) : -1, api.sun ? Math.round(api.sun[0]) + ',' + Math.round(api.sun[1]) : '', api.warm.toFixed(3),
          sh ? Math.round(sh.box[0]) + ',' + Math.round(sh.box[1]) + ',' + sil.ver + ',' + Math.round(sh.clip || 0) : 0, pl && pl.shelf ? pl.shelf.map(Math.round).join(',') : '',
          pl && pl.beach ? Math.round(pl.beach[2]) + ',' + Math.round(pl.beach[3]) : '', moving ? Math.random() : 0, tintTarget.lagoon, poolWarm].join('|');
        if (sig === api.lastSig) return;
        api.lastSig = sig;
      }
      draw(st);
      api.frames++;
      if (!shown) { shown = true; html.classList.add('has-water'); html.classList.remove('no-water'); api.ready = true; }   // (again after a restore)

      // adaptive resolution (unless pinned for QA): judged about once a second of drawing, never in the first
      // seconds (shaders and textures are still arriving), and only on sustained slow frames: most of that second's
      // frames ran slow. Far over budget it drops two steps at once, so a slow device is helped within seconds
      if (!reduce && !isFinite(pinnedQ) && st.dt > 0 && st.dt < 500) {
        api.ema = api.ema * 0.95 + Math.min(st.dt, 250) * 0.05;
        qWin.t += st.dt; qWin.n++; if (st.dt > 26) qWin.slow++;
        if (qWin.t > 1200) {
          var slowShare = qWin.slow / qWin.n;
          qWin.t = qWin.n = qWin.slow = 0;
          if (performance.now() - t0 > 3500) {
            if (slowShare > 0.6 && quality > 0.4) { quality = Math.max(0.4, quality - (api.ema > 45 ? 0.2 : 0.1)); resize(); }
            else if (api.ema < 14 && quality < qMax) { quality = Math.min(qMax, quality + 0.05); resize(); }
          }
        }
      }
    };

    // QA: average cost of one water frame as it stands (ms, GPU included: each draw is waited for);
    // o.rip caps the live ripples the shader reads, o.noShadow drops the candy shadow (for comparisons)
    api.bench = function (n, o) {
      if (phase !== 'ready' || !vis.any) return null;
      benchQ.rip = o && o.rip != null ? o.rip : null; benchQ.noShadow = !!(o && o.noShadow);
      var st = { sy: window.scrollY, dt: 16 }, px = new Uint8Array(4);
      draw(st); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      var t = performance.now();
      for (var i = 0; i < n; i++) { draw(st); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
      var res = { ms: +((performance.now() - t) / n).toFixed(3), live: ripLive, w: canvas.width, h: canvas.height };
      benchQ.rip = null; benchQ.noShadow = false;
      return res;
    };
    // QA: luminance of the water under a rect (viewport CSS px), drawn and read back in the same task
    api.sample = function (rect, st) {
      if (phase !== 'ready' || !vis.any) return null;
      draw(st || { sy: window.scrollY, dt: 16 });
      var x0 = Math.max(0, Math.floor(rect.left * pxRatio)), y0 = Math.max(0, Math.floor((cssH - rect.bottom) * pxRatio));
      var w = Math.max(1, Math.min(canvas.width - x0, Math.ceil(rect.width * pxRatio))), h = Math.max(1, Math.min(canvas.height - y0, Math.ceil(rect.height * pxRatio)));
      var px = new Uint8Array(w * h * 4); gl.readPixels(x0, y0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      var lin = function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      var Ls = [];
      for (var i = 0; i < px.length; i += 16) Ls.push(0.2126 * lin(px[i]) + 0.7152 * lin(px[i + 1]) + 0.0722 * lin(px[i + 2]));
      Ls.sort(function (a, b) { return a - b; });
      var sum = 0; Ls.forEach(function (v) { sum += v; });
      return { min: Ls[0], p05: Ls[Math.floor(Ls.length * 0.05)], mean: sum / Ls.length, max: Ls[Ls.length - 1] };
    };
    return api;
  })();
  if (!Water) html.classList.add('no-water');

  /* ───────────────────────── 4 · Theme + product switching ─────────────────────────
     Product surfaces follow the selection (hero, cabanas, card, nav chip, shop bar, awnings, water; the menu
     card too, for a product on the menu: module 10).
     Sections that only describe Collagen Boost are pinned to its palette in CSS (.theme-pin). Every token
     is applied as var(--<id>-<token>, <hex>), so a season's CSS (or swiss.css) can restyle a product.  */
  var candies = [];
  var rollTimer = 0;
  var TOKENS = [['accent', '--accent'], ['deep', '--accent-deep'], ['btn', '--accent-btn'], ['text', '--accent-text'],
    ['display', '--accent-display'], ['tint', '--accent-tint'], ['soft', '--accent-soft']];
  function tok(p, k) { return 'var(--' + p.id + '-' + k + ', ' + p.theme[k] + ')'; }
  function applyAccent(p) {
    var s = html.style;
    TOKENS.forEach(function (t) { s.setProperty(t[1], tok(p, t[0])); });
    // the parasol mark (.brand__mark) takes the accent; Vitamin C's is cut from its sand-and-cream canvas instead
    s.setProperty('--mark', tok(p, p.id === 'vitamin-c' ? 'stripe' : 'accent'));
  }
  function bindCopy(p) {
    var c = p.copy;
    $$('[data-bind]').forEach(function (el) {
      var k = el.getAttribute('data-bind');
      if (k === 'cabanaNo') el.innerHTML = 'Cabana ' + NO + ' ' + p.no;
      else if (k === 'stampNo') el.innerHTML = NO + ' ' + p.no;
      else if (k === 'statusLabel') el.textContent = p.statusLabel;
      else if (k === 'short') el.textContent = p.short;
      else if (c[k] != null) el.textContent = fill(c[k]);
    });
    $$('[data-bind-href]').forEach(function (el) { var k = el.getAttribute('data-bind-href'); if (c[k]) el.setAttribute('href', c[k]); });
    $$('[data-bind-label]').forEach(function (el) { var k = el.getAttribute('data-bind-label'); if (c[k]) el.setAttribute('aria-label', fill(c[k])); });
    $$('[data-bind-html]').forEach(function (el) {
      var k = el.getAttribute('data-bind-html');
      if (k === 'facts') el.innerHTML = c.facts.map(function (f) { return '<div><dt>' + f[0] + '</dt><dd>' + fill(f[1]) + '</dd></div>'; }).join('');
      else if (c[k] != null) el.innerHTML = fill(c[k]);
    });
    renderLabel(p);                                // the facts drawer
    icons();
    heroState.capW = 0;   // re-measure the caption
  }
  function setProduct(id) {
    var p = byId(id);
    if (!p || p === state.product) return;
    state.product = p;
    html.setAttribute('data-product', p.id);
    html.setAttribute('data-kind', p.candy.kind);

    // 1 · the new stripes roll down over the awnings, then the base fabric changes underneath
    html.style.setProperty('--stripe-next', tok(p, 'stripe'));
    clearTimeout(rollTimer);
    if (!reduce) { html.classList.remove('is-rolling'); void html.offsetWidth; html.classList.add('is-rolling'); }
    rollTimer = setTimeout(function () { html.style.setProperty('--stripe', tok(p, 'stripe')); html.classList.remove('is-rolling'); }, reduce ? 0 : 580);

    // 2 · accents cross-fade (registered custom properties), copy swaps, water re-tints, candy swaps
    applyAccent(p);
    var card = $('#cabanaCard');
    if (card && !reduce) { card.classList.add('is-swapping'); setTimeout(function () { bindCopy(p); card.classList.remove('is-swapping'); }, 300); }
    else bindCopy(p);
    if (Water) { Water.setTint(p.water); Water.setCandy(p.candy.color); }
    heroCandyTo(p, false);                         // the hero: the 3D candy, or its drawn stand-in
    silWake(2600);
    updateCabanas(true);                           // the cabana candy changes inside its cabana's curtains
    if (p.status === 'available') setMenuProduct(p.id);   // the menu card serves it (module 10)
    else preselectWaitlist(p.id);
    var st = $('#themeStatus'); if (st) st.textContent = 'Showing ' + p.short + ', ' + p.statusLabel.toLowerCase() + '.';
    kick();
  }

  /* ───────────────────────── 5 · 3D candy (site/candy3d.js, public API only) ─────────────────────────
     The library draws the lollipops ({ kind: 'lollipop', color }) and, once it has them, the
     capsules ({ kind: 'capsule', color }: three two-piece capsules; a tap wobbles them, no bite). A kind it
     can't draw yet degrades gracefully: the hero shows its drawn stand-in (.lolly-fallback, CSS capsules)
     and the cabana its drawn still life. The light follows the season: candy.environment ('beach',
     'golden', 'studio', 'snow' …; 'beach' when the library doesn't have that one) and candy.exposure.   */
  function canDraw(kind) {
    var G = window.GloCandy;
    if (!G || noGL) return false;
    if (!kind || kind === 'lollipop') return true;
    return !!(G.kinds && G.kinds.indexOf(kind) >= 0);   // the kinds the library can draw
  }
  function seasonEnv() {
    var want = String((SEASON.candy && SEASON.candy.environment) || 'beach');
    var L = window.GloCandy && GloCandy.lighting, E = L && L.ENVIRONMENTS;
    return E && E[want] ? want : 'beach';
  }
  // what the library is asked to draw: { kind, color } (style is always null: every pop is the approved pop)
  function candyOf(p) { return { kind: p.candy.kind, color: p.candy.color, style: p.candy.style || null }; }
  // the product the 3D views hold: the chosen one if it can be drawn, else the last one that could
  var drawable = function (p) { return canDraw(p.candy.kind) ? p : PRODUCTS[0]; };
  function mountCandy(el, fallback, opts, onReady, onFail) {
    if (!el) return;
    var fail = function () {
      html.classList.add('no-3d'); if (fallback) fallback.hidden = false;
      if (heroFloat) heroFloat.classList.add('is-ready');
      if (cabRow) cabRow.classList.remove('has-3d');
      if (onFail) onFail();
    };
    if (!window.GloCandy || noGL) { fail(); return; }
    var p = drawable(state.product), cfg = SEASON.candy || {};
    GloCandy.create(el, Object.assign({
      preset: 'gloss',
      product: candyOf(p),
      environment: seasonEnv(),      // the season's light (summer: midday beach reflections + a real sun shadow, front left)
      exposure: isFinite(+cfg.exposure) && +cfg.exposure > 0 ? +cfg.exposure : undefined,
      bite: true,                    // tap to take a bite
      fallback: fallback || undefined
    }, opts || {})).then(function (api) {
      if (!api) { fail(); return; }
      if (onReady) onReady(api, p);   // p: the product it was created with (the choice may have moved on)
    });
  }

  /* ───────────────────────── 6 · Hero: ripples, drop-in, float, shadow, caption ───────────────────────── */
  var hero = $('.hero'), heroMount = $('#heroCandy'), heroFloat = $('#heroFloat'), heroFig = $('.hero__candy'), heroCaption = $('#heroCaption');
  var heroCopy = $('.hero__copy'), heroFallback = $('#heroFallback');
  var heroState = { visible: true, rect: null, fig: null, drop0: 0, dropDone: false, capW: 0, capH: 0, ty: 0, sc: 1, head: null, clip: 1e5, flW: 0, flH: 0, away: false, sil: false };
  // (away, sil: site/rider.js. away: the pop is out riding the page, its mount in the rider; sil: it floats over another
  // pool, so its silhouette is still copied for the water to cast)
  // Ripples are debounced: a moving pointer leaves at most one ring per 130 ms AND per 48 px of travel
  // (so a sweep draws a trail of separate rings, not a smear); a tap always splashes, at most every 80 ms.
  var RIP_MOVE_MS = 130, RIP_MOVE_PX = 48, RIP_TAP_MS = 80;
  function initRipples() {
    $$('.is-window[data-water="pool"]').forEach(function (win) {
      var last = { x: -999, y: -999, t: -1e9 }, lastTap = -1e9;
      win.addEventListener('pointermove', function (e) {
        if (!Water) return;
        var t = performance.now(), dt = t - last.t, d = Math.hypot(e.clientX - last.x, e.clientY - last.y);
        if (dt < RIP_MOVE_MS || d < RIP_MOVE_PX) return;
        var speed = d / Math.min(dt, 400);                     // px/ms over the last stretch (a long rest is not slow)
        // rings are spaced out now (they used to overlap every 38 px), so each one carries a little more
        Water.ripple(e.clientX, e.clientY, clamp(0.2 + speed * 0.26, 0.2, 0.6), 'move');
        last = { x: e.clientX, y: e.clientY, t: t };          // even if skipped: the pool is full, try again later
        kick();
      }, { passive: true });
      win.addEventListener('pointerdown', function (e) {
        if (!Water) return;
        var t = performance.now();
        if (t - lastTap < RIP_TAP_MS) return;
        lastTap = t; last = { x: e.clientX, y: e.clientY, t: t };
        Water.ripple(e.clientX, e.clientY, 0.85, 'tap'); kick();
      }, { passive: true });
    });
  }
  function headRipple(amp) {
    if (!Water || !heroState.head) return;
    Water.ripple(heroState.head[0], heroState.head[1], amp, 'candy');
  }

  /* The hero pop's shadow is its own silhouette: every frame the 3D candy renders (the library's onRender
     hook, the only moment its canvas can be read), it is copied into a small 2D canvas for the water to
     cast. So spin, drag and fling tilt, pointer lean, bites (crater and flying shards), a cluster's
     wobble and the product swap all show in the shadow. Touch screens copy at most ~30 times a second;
     with reduced motion only right after something changed (a bite, a swap, a resize). The lens spots
     (the ball, or each piece of a cluster) come from the same frame, in the canvas's own 0..1 box, and
     so do the bite craters: a crater carved in the face of the ball hardly changes its outline, but the
     thinner candy lets a little more light through: a soft, lighter spot in its shadow (until it regrows).
     Opaque capsules focus no light: they cast a plain shadow. Without 3D (or for a kind the library
     can't draw yet) the CSS stand-in casts the same way: its shapes are drawn into that canvas instead.
     Where the copy sits under the pop (phones, tablets), the shadow fades out before it reaches it.  */
  var heroApi = null;
  var cast = { cv: null, g: null, H: 224, last: 0, until: 0, n: 0, ms: 0, lens: new Float32Array(9), lensN: 0, kind: state.product.candy.kind, v: null, s: null,
    craters: [], healAt: 0, leak: new Float32Array(9), leakN: 0, leakS: 0, ema: 0, fallback: false, fbKey: '', flat: false };
  // The hero shows the chosen product: the 3D candy when the library can draw its kind, else the drawn
  // stand-in (the 3D view pauses, holding the last product it could draw, until it is needed again)
  function heroCandyTo(p, quick) {
    if (!heroFloat) return;
    var flat = !heroApi || !canDraw(p.candy.kind);
    if (heroApi) {
      if (flat) heroApi.pause();
      else { heroApi.resume(); heroApi.setProduct(candyOf(p), { duration: quick ? 0.05 : 1 }); }
      heroFloat.classList.toggle('is-flat', flat);
      if (heroFallback) heroFallback.hidden = !flat;
      cast.flat = flat;
      cast.fallback = flat;                        // the stand-in casts the shadow while it is on show
      cast.fbKey = '';
      if (flat) cast.kind = p.candy.kind;
    }
  }
  // a bite landed (e.point in root space): keep it in the ball's own space, so the crater spins with it
  function heroBitten(e) {
    var a = heroApi, model = a && a.root.children[0] && a.root.children[0].children[0] && a.root.children[0].children[0].children[0];
    var ball = model && model.userData.kind === 'lollipop' && model.userData.candy;
    if (!ball || !e || !e.point) return;
    var p = e.point.clone();
    a.root.updateWorldMatrix(true, true);
    a.root.localToWorld(p); ball.worldToLocal(p);
    cast.craters.push(p); if (cast.craters.length > 3) cast.craters.shift();
    cast.healAt = performance.now() + (e.regrowIn || 4500);
  }
  function silWake(ms) { cast.until = Math.max(cast.until, performance.now() + (ms || 1400)); }
  function heroRendered(api) {
    if (!Water || cast.flat || !(heroState.visible || heroState.sil)) return;
    // a GPU copies this in ~0.05 ms; a software-GL fallback must first finish the candy frame, so the copy
    // rate adapts: never more than ~1/10 of the time (touch screens: at most ~30 copies a second anyway)
    var t = performance.now();
    if ((reduce && t > cast.until) || t - cast.last < Math.max(coarse || reduce ? 30 : 0, cast.ema * 10)) return;
    var src = api.renderer.domElement, sw = src.width, shh = src.height;
    if (!sw || !shh) return;
    if (!cast.cv) { cast.cv = doc.createElement('canvas'); cast.g = cast.cv.getContext('2d'); }
    if (!cast.g) return;
    var h = cast.H, w = Math.max(8, Math.round(h * sw / shh));
    if (cast.cv.width !== w || cast.cv.height !== h) { cast.cv.width = w; cast.cv.height = h; } else cast.g.clearRect(0, 0, w, h);
    cast.g.drawImage(src, 0, 0, w, h);
    lensFrom(api);
    Water.silhouette(cast.cv);
    var ms = performance.now() - t;
    cast.last = t; cast.n++; cast.ms += ms; cast.ema = cast.n > 1 ? cast.ema * 0.8 + ms * 0.2 : ms;
  }
  // where the candy's lenses are in this frame: (x, y, radius) in the canvas's 0..1 box (radius / height)
  function lensFrom(api) {
    var T = api.THREE, lean = api.root.children[0], spin = lean && lean.children[0], model = spin && spin.children[0];
    cast.lensN = 0; cast.leakN = 0;
    if (!model || !T) return;
    if (!cast.v) { cast.v = new T.Vector3(); cast.s = new T.Vector3(); }
    var ud = model.userData, list = ud.pieces && ud.pieces.length ? ud.pieces : (ud.candy ? [ud.candy] : []);
    var cam = api.camera, k = 1 / Math.tan(cam.fov * Math.PI / 360);
    cast.kind = ud.kind;
    for (var i = 0; i < list.length && i < 3; i++) {
      var m = list[i], g = m.geometry, r0 = g && g.userData && g.userData.radius;
      m.updateWorldMatrix(true, false);
      if (r0) cast.v.set(0, 0, 0);                                   // the ball is centred on its mesh
      else if (g) {                                                  // a piece of a cluster: its bounding sphere
        if (!g.boundingSphere) g.computeBoundingSphere();
        r0 = g.boundingSphere ? g.boundingSphere.radius : 1;
        cast.v.copy(g.boundingSphere ? g.boundingSphere.center : cast.v.set(0, 0, 0));
      }
      m.localToWorld(cast.v); m.getWorldScale(cast.s);
      var dist = Math.max(0.1, cam.position.distanceTo(cast.v));
      var rr = (r0 || 1) * Math.max(cast.s.x, cast.s.y) * k / dist * 0.5;   // radius as a fraction of the canvas height
      cast.v.project(cam);
      if (rr < 0.004) continue;                                            // shrunk away mid-swap
      cast.lens[cast.lensN * 3] = cast.v.x * 0.5 + 0.5; cast.lens[cast.lensN * 3 + 1] = 0.5 - cast.v.y * 0.5; cast.lens[cast.lensN * 3 + 2] = rr;
      cast.lensN++;
    }
    // the craters, fading out as the candy regrows (they are gone once it has healed or been swapped)
    if (ud.kind !== 'lollipop' || !ud.candy || !api.bites) { cast.craters.length = 0; return; }
    var tNow = performance.now(), f = clamp((tNow - cast.healAt) / 1150, 0, 1);
    cast.leakS = 1 - f * f * (3 - 2 * f);
    var rb = cast.lensN ? cast.lens[2] : 0;
    for (var c = 0; c < cast.craters.length && cast.leakS > 0; c++) {
      cast.v.copy(cast.craters[c]); ud.candy.localToWorld(cast.v); cast.v.project(cam);
      cast.leak[cast.leakN * 3] = cast.v.x * 0.5 + 0.5; cast.leak[cast.leakN * 3 + 1] = 0.5 - cast.v.y * 0.5; cast.leak[cast.leakN * 3 + 2] = rb * 0.32;
      cast.leakN++;
    }
  }
  // No 3D (or a kind the library can't draw yet): the CSS stand-in (.lolly-fallback) casts its shadow too. Its
  // shapes (the ball and the paper stick turned 14° about its top, or three two-piece capsules) are drawn into
  // the silhouette canvas in the float's own box, in CSS px, again whenever the product or the float's size
  // changes; the lollipop's lens spot comes from them (opaque capsules focus no light).
  function capsule(g, x, y, w, h) { var r = w / 2; g.beginPath(); g.arc(x + r, y + r, r, Math.PI, 0); g.arc(x + r, y + h - r, r, 0, Math.PI); g.closePath(); }
  // the stand-in's three capsules: centre (fractions of the float), length (of the float's shorter side), angle
  var CAPS = [{ x: 0.40, y: 0.56, len: 0.5, rot: 9 }, { x: 0.43, y: 0.41, len: 0.52, rot: -58 }, { x: 0.65, y: 0.69, len: 0.47, rot: -13 }];
  var CAP_RATIO = 2.9;                             // length : diameter, a regular two-piece capsule
  function placeCaps(w0, h0) {
    var S = Math.min(w0, h0 * 0.9), els = heroFallback ? $$('.lolly-fallback__cap', heroFallback) : [];
    els.forEach(function (el, i) {
      var c = CAPS[i]; if (!c) return;
      var L = c.len * S, D = L / CAP_RATIO;
      el.style.cssText = 'left:' + (c.x * 100).toFixed(2) + '%;top:' + (c.y * 100).toFixed(2) + '%;width:' + L.toFixed(1) + 'px;height:' + D.toFixed(1) + 'px;transform:translate(-50%,-50%) rotate(' + c.rot + 'deg)';
    });
    return S;
  }
  function castFallback(w0, h0) {
    if (!cast.cv) { cast.cv = doc.createElement('canvas'); cast.g = cast.cv.getContext('2d'); }
    var g = cast.g, p = state.product;
    if (!g || !w0 || !h0) return;
    var h = cast.H, w = Math.max(8, Math.round(h * w0 / h0));
    cast.cv.width = w; cast.cv.height = h;                       // (clears it)
    g.setTransform(h / h0, 0, 0, h / h0, 0, 0);
    cast.kind = p.candy.kind; cast.lensN = 0; cast.leakN = 0;
    if (p.candy.kind === 'capsule') {
      var S = placeCaps(w0, h0);
      g.fillStyle = p.candy.color;
      CAPS.forEach(function (c) {
        var L = c.len * S, D = L / CAP_RATIO;
        g.save(); g.translate(c.x * w0, c.y * h0); g.rotate((c.rot + 90) * Math.PI / 180);
        capsule(g, -D / 2, -L / 2, D, L); g.fill(); g.restore();
      });
    } else {
      g.save(); g.translate(0.5 * w0, 0.46 * h0); g.rotate(14 * Math.PI / 180);
      g.fillStyle = '#F3EEE7'; capsule(g, -6, 0, 12, 0.44 * h0); g.fill(); g.restore();
      var D0 = Math.min(0.52 * w0, 250), bcx = 0.5 * w0 - 0.06 * D0, bcy = 0.1 * h0 + D0 / 2;
      g.fillStyle = p.candy.color; g.beginPath(); g.arc(bcx, bcy, D0 / 2, 0, Math.PI * 2); g.fill();
      cast.lens[0] = bcx / w0; cast.lens[1] = bcy / h0; cast.lens[2] = D0 / 2 / h0; cast.lensN = 1;
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    Water.silhouette(cast.cv);
    cast.n = Math.max(cast.n, 1);
    if (heroFallback) heroFallback.classList.add('is-cast');      // its own CSS drop shadows step aside
  }
  function heroRead() {
    if (!hero) return;
    var hr = hero.getBoundingClientRect();
    heroState.visible = hr.bottom > 0 && hr.top < innerHeight;
    if (!heroState.visible) return;
    heroState.rect = heroMount ? heroMount.getBoundingClientRect() : null;
    var fig = heroState.fig = heroFig ? heroFig.getBoundingClientRect() : null;
    if (heroCaption && !heroState.capW) { heroState.capW = heroCaption.offsetWidth; heroState.capH = heroCaption.offsetHeight; }
    // the copy sits under the pop (single-column layouts): the shadow has to be gone before the copy's top
    var cp = heroCopy ? heroCopy.getBoundingClientRect() : null;
    heroState.clip = cp && fig && cp.height > 0 && cp.top > fig.top + fig.height * 0.5 ? cp.top : 1e5;
    if (cast.fallback && heroFloat) {
      var fw = heroFloat.offsetWidth, fh = heroFloat.offsetHeight, key = fw + 'x' + fh + ' ' + state.product.id;
      heroState.flW = fw; heroState.flH = fh;
      if (key !== cast.fbKey) { cast.fbKey = key; if (Water) castFallback(fw, fh); else placeCaps(fw, fh); }
    }
  }
  function heroWrite(st) {
    if (!heroState.visible || !heroFloat) { if (Water) Water.shadow = null; return; }
    // the pop drops in from just above the water, settles (a welcome ripple), then bobs gently
    var e = 1;
    if (!reduce && heroState.drop0) {
      var k = clamp((performance.now() - heroState.drop0) / 1250, 0, 1);
      e = 1 - Math.pow(1 - k, 3);
      if (k >= 1 && !heroState.dropDone) { heroState.dropDone = true; headRipple(0.75); }
    }
    var lift = reduce ? 0 : Math.sin(st.t * 0.9) * 7;
    var hgt = 1 - e, ty = lift - hgt * 26, sc = 1 + hgt * 0.14;
    heroFloat.style.transform = 'translate3d(0,' + ty.toFixed(2) + 'px,0) scale(' + sc.toFixed(4) + ')';
    heroFloat.style.opacity = heroState.drop0 && !reduce ? Math.min(1, e * 2.5).toFixed(3) : '';
    heroState.ty = ty; heroState.sc = sc;
    if (heroState.away) { if (Water) Water.shadow = null; return; }   // out riding the page (site/rider.js): its shadow goes with it
    var r = heroState.rect, fig = heroState.fig;
    if (!r || !fig) return;
    // the float's resting box (the shadow lies on the floor and the caption on the deck: neither bobs)
    var W = r.width / sc, H = r.height / sc, cx = r.left + r.width / 2, cy = r.top + r.height / 2 - ty;
    var kind = state.product.candy.kind, cluster = kind !== 'lollipop';   // a cluster (the capsules): its caption and reach
    var u = Math.min(H / 6.48, W / 3.67), gu = Math.min(H / 3.89, W / 4.21);
    var bx = cx - W / 2, by = cy - H / 2;
    // the box the silhouette covers: the 3D canvas (the mount), or the float itself for the CSS stand-in
    var SW = W, SH = H;
    if (cast.fallback && heroState.flW) { SW = heroState.flW; SH = heroState.flH; bx = cx - SW / 2; by = cy - SH / 2; }
    heroState.head = cast.lensN ? [bx + cast.lens[0] * SW, by + cast.lens[1] * SH] : cluster ? [cx, cy] : [cx - 0.36 * u, cy - 1.46 * u];

    // caption: beside the stick's end, on the side away from the shadow
    if (heroCaption && heroState.capW) {
      var ex = cluster ? cx - gu * 1.25 : cx + 0.67 * u - 10, ey = cluster ? cy + gu * 1.55 : cy + 2.72 * u;
      var x = ex - fig.left - heroState.capW - 14, y = ey - fig.top - heroState.capH / 2;
      x = clamp(x, 8 - fig.left, fig.width - heroState.capW); y = clamp(y, 0, fig.height - heroState.capH);
      heroCaption.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      heroState.capBox = [fig.left + x, fig.top + y, fig.left + x + heroState.capW, fig.top + y + heroState.capH];   // (the decor keeps clear of it)
    }

    if (!Water) return;
    if (!cast.n || (!heroState.drop0 && !cast.fallback)) { Water.shadow = null; return; }
    // Cast the candy's silhouette on the pool floor: one sun, upper left, so it falls down-right, further
    // off and softer the higher the pop floats (the drop-in, the bob). The pop floats higher than a cluster
    // (the capsules); the reach eases across a swap with the model that is actually on show.
    var fh = fig.height, off = 1 + hgt * 0.9 + (lift + 7) / 80, soft = 1 + hgt * 1.1 + (lift + 7) / 110;
    var reach = cast.kind === 'lollipop' ? 0.263 : 0.18;
    heroState.reach = heroState.reach == null || reduce ? reach : lerp(heroState.reach, reach, 1 - Math.exp(-clamp(st.dt, 0, 120) / 160));
    var ox = 0.61 * heroState.reach * fh * off, oy = 0.79 * heroState.reach * fh * off;
    var sh = heroState.shadow || (heroState.shadow = { box: [0, 0, 1, 1], blur: 0, wide: 0, a: 0, clip: 1e5, lens: new Float32Array(12), leak: new Float32Array(12) });
    sh.box[0] = bx + ox; sh.box[1] = by + oy; sh.box[2] = SW; sh.box[3] = SH;
    sh.blur = fh * (0.012 + hgt * 0.07 + (lift + 7) / 4200);
    sh.wide = fh * (0.06 + hgt * 0.09);
    sh.a = 0.28 * Math.min(1, e * 1.4);
    sh.clip = heroState.clip;                      // the copy's top when it sits under the pop
    // the lens spots: just past each lens's own shadow centre (light bends toward the far side)
    for (var i = 0; i < 3; i++) {
      var L = sh.lens, j = i * 4;
      if (i >= cast.lensN) { L[j + 3] = 0; continue; }
      var R = 1.54 * cast.lens[i * 3 + 2] * SH * soft;
      L[j] = bx + cast.lens[i * 3] * SW + ox + 0.1 * R; L[j + 1] = by + cast.lens[i * 3 + 1] * SH + oy + 0.08 * R;
      L[j + 2] = Math.max(R, 1); L[j + 3] = cast.kind === 'lollipop' ? 1 : 0;   // opaque capsules focus no light
    }
    for (i = 0; i < 3; i++) {
      var K = sh.leak, q = i * 4;
      if (i >= cast.leakN) { K[q + 3] = 0; continue; }
      K[q] = bx + cast.leak[i * 3] * SW + ox; K[q + 1] = by + cast.leak[i * 3 + 1] * SH + oy;
      K[q + 2] = Math.max(cast.leak[i * 3 + 2] * SH * (1 + hgt * 0.5), 1); K[q + 3] = cast.leakS;
    }
    Water.shadow = sh;
  }
  // Where the pop (or the capsules) and its caption rest, in viewport px, for the decor to keep clear of: the
  // candy's own footprint (measured from its 3D frames, in the unit u that heroWrite places it by), not its
  // whole box, so the floats may rest close around it but never behind its stick or across its ball.
  function heroZones() {
    var fig = heroState.fig, out = [];
    if (!fig || !fig.width) return out;
    var cx = fig.left + fig.width / 2, cy = fig.top + fig.height / 2, u = Math.min(fig.height / 6.48, fig.width / 3.67);
    if (state.product.candy.kind === 'lollipop') {
      out.push([cx - 1.78 * u, cy - 2.8 * u, cx + 1.02 * u, cy - 0.2 * u]);    // the ball
      out.push([cx - 0.32 * u, cy - 0.4 * u, cx + 0.8 * u, cy + 2.8 * u]);     // the stick
    } else out.push([cx - 2.1 * u, cy - 1.2 * u, cx + 2.2 * u, cy + 1.4 * u]); // the capsules
    if (heroState.capBox) out.push(heroState.capBox);
    return out;
  }

  /* ───────────────────────── 6½ · Seasonal decor: one small particle canvas over the hero pool ─────────────────────────
     The season's `decor` (site/seasons/<season>.js) has up to two layers:
       fall  · petals, leaves or snow drifting down the hero (in front of the water, behind the copy and the candy)
       float · a few resting on the pool, bobbing on the swell and pushed aside by the ripples; they keep clear
               of the headline, the candy and its caption, the awning and the coping (their seeded opening
               arrangement and every newcomer), and cast a soft shadow down-right onto the pool floor (the one sun,
               upper left)
     Shapes are drawn once into small sprites, lit from the upper left: 'snow', 'flake', 'petal', 'blossom',
     'leaf', 'maple', or a picture: 'img:site/assets/seasons/<season>/<file>.png|svg'. Counts are for a
     1440 × 800 hero and scale with its area. Off with reduced motion; it draws only while the hero is on
     screen and the tab is visible (the frame loop), so it costs nothing anywhere else.                   */
  var Decor = (function () {
    var D = SEASON.decor;
    if (!D || reduce || !hero) return null;
    var layers = ['float', 'fall'].filter(function (k) { return D[k] && num(D[k].count, 0) > 0; });
    if (!layers.length) return null;
    var cv = doc.createElement('canvas');
    cv.className = 'decor'; cv.setAttribute('aria-hidden', 'true');
    var awn = $('.awning--hero', hero);
    hero.insertBefore(cv, awn ? awn.nextSibling : hero.firstChild);
    var g = cv.getContext('2d');
    if (!g) { cv.remove(); return null; }

    // a seeded random, so a season always opens on the same arrangement
    var seed = 0; for (var c0 = 0; c0 < SEASON_NAME.length; c0++) seed = (seed * 31 + SEASON_NAME.charCodeAt(c0)) >>> 0;
    function rnd() { seed = (seed + 0x6D2B79F5) >>> 0; var t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    function pick(a) { return a[Math.floor(rnd() * a.length) % a.length]; }
    function range(r, d) { if (typeof r === 'number') return r; if (!r || r.length < 2) return d; return r[0] + (r[1] - r[0]) * rnd(); }

    // ── sprites: each shape × colour drawn once (unit space [-1, 1]), the light from the upper left; 128 px, so they
    // stay crisp on the canvas, which is drawn at up to 2x
    var SPR = {}, SPX = 128;
    var PATH = {
      petal: function (c) {   // a cherry blossom petal: a soft teardrop with a notch at its tip
        c.moveTo(0, 0.95); c.bezierCurveTo(-0.55, 0.75, -0.75, -0.1, -0.5, -0.72); c.quadraticCurveTo(-0.32, -0.98, -0.1, -0.9);
        c.lineTo(0, -0.74); c.lineTo(0.1, -0.9); c.quadraticCurveTo(0.32, -0.98, 0.5, -0.72); c.bezierCurveTo(0.75, -0.1, 0.55, 0.75, 0, 0.95);
      },
      leaf: function (c) {    // a simple lanceolate leaf with its stem
        c.moveTo(0, -1); c.bezierCurveTo(0.42, -0.62, 0.5, 0.12, 0.06, 0.78); c.lineTo(0.03, 1); c.lineTo(-0.03, 1); c.lineTo(-0.06, 0.78);
        c.bezierCurveTo(-0.5, 0.12, -0.42, -0.62, 0, -1);
      },
      maple: function (c) {   // a five-lobed maple leaf
        var P = [[0, -1], [0.12, -0.62], [0.36, -0.74], [0.3, -0.36], [0.7, -0.52], [0.6, -0.2], [0.95, -0.08], [0.6, 0.12], [0.7, 0.36],
          [0.3, 0.28], [0.06, 0.62], [0.04, 1], [-0.04, 1], [-0.06, 0.62], [-0.3, 0.28], [-0.7, 0.36], [-0.6, 0.12], [-0.95, -0.08],
          [-0.6, -0.2], [-0.7, -0.52], [-0.3, -0.36], [-0.36, -0.74], [-0.12, -0.62]];
        c.moveTo(P[0][0], P[0][1]); for (var i = 1; i < P.length; i++) c.lineTo(P[i][0], P[i][1]); c.closePath();
      }
    };
    function lightUp(c) {   // a soft sheen from the upper left, a touch of shade toward the lower right
      c.globalCompositeOperation = 'source-atop';
      var lg = c.createLinearGradient(-1, -1, 1, 1);
      lg.addColorStop(0, 'rgba(255,255,255,.42)'); lg.addColorStop(0.45, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(40,10,20,.18)');
      c.fillStyle = lg; c.fillRect(-1.2, -1.2, 2.4, 2.4);
      c.globalCompositeOperation = 'source-over';
    }
    function veins(c, shape) {
      c.lineWidth = 0.035; c.strokeStyle = 'rgba(70,25,10,.28)'; c.beginPath();
      if (shape === 'maple') { c.moveTo(0, 0.95); c.lineTo(0, -0.9); c.moveTo(0, 0.3); c.lineTo(0.66, -0.45); c.moveTo(0, 0.3); c.lineTo(-0.66, -0.45); c.moveTo(0, 0.4); c.lineTo(0.62, 0.3); c.moveTo(0, 0.4); c.lineTo(-0.62, 0.3); }
      else { c.moveTo(0, 0.95); c.quadraticCurveTo(0.03, 0, 0, -0.9); for (var k = -1; k <= 1; k += 0.5) { c.moveTo(0.01, k * 0.5); c.lineTo(0.28, k * 0.5 - 0.22); c.moveTo(-0.01, k * 0.5); c.lineTo(-0.28, k * 0.5 - 0.22); } }
      c.stroke();
    }
    function drawShape(c, shape, col, shadow) {
      c.fillStyle = shadow ? '#000' : col;
      if (shape === 'snow') {
        var rg = c.createRadialGradient(0, 0, 0, 0, 0, 1);
        rg.addColorStop(0, shadow ? 'rgba(0,0,0,1)' : col); rg.addColorStop(0.45, shadow ? 'rgba(0,0,0,.7)' : col); rg.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = rg; c.beginPath(); c.arc(0, 0, 1, 0, Math.PI * 2); c.fill(); return;
      }
      if (shape === 'flake') {
        c.strokeStyle = shadow ? '#000' : col; c.lineWidth = 0.11; c.lineCap = 'round'; c.beginPath();
        for (var a = 0; a < 6; a++) {
          var ca = Math.cos(a * Math.PI / 3), sa = Math.sin(a * Math.PI / 3);
          c.moveTo(0, 0); c.lineTo(ca * 0.92, sa * 0.92);
          var bx = ca * 0.52, by = sa * 0.52, ca2 = Math.cos(a * Math.PI / 3 + 0.7), sa2 = Math.sin(a * Math.PI / 3 + 0.7), ca3 = Math.cos(a * Math.PI / 3 - 0.7), sa3 = Math.sin(a * Math.PI / 3 - 0.7);
          c.moveTo(bx, by); c.lineTo(bx + ca2 * 0.28, by + sa2 * 0.28); c.moveTo(bx, by); c.lineTo(bx + ca3 * 0.28, by + sa3 * 0.28);
        }
        c.stroke(); return;
      }
      if (shape === 'blossom') {
        for (var k = 0; k < 5; k++) { c.save(); c.rotate(k * Math.PI * 2 / 5); c.scale(0.5, 0.5); c.translate(0, -1); c.beginPath(); PATH.petal(c); c.fill(); c.restore(); }
        if (!shadow) {
          lightUp(c);
          c.fillStyle = 'rgba(255,214,120,.95)'; c.beginPath(); c.arc(0, 0, 0.16, 0, Math.PI * 2); c.fill();
          c.fillStyle = 'rgba(214,120,40,.8)';
          for (var s2 = 0; s2 < 7; s2++) { var an = s2 / 7 * Math.PI * 2; c.beginPath(); c.arc(Math.cos(an) * 0.24, Math.sin(an) * 0.24, 0.045, 0, Math.PI * 2); c.fill(); }
        }
        return;
      }
      var P = PATH[shape] || PATH.petal;
      c.beginPath(); P(c); c.fill();
      if (shadow) return;
      if (shape === 'petal') {   // a blush deepening toward the base, paler at the tip
        c.globalCompositeOperation = 'source-atop';
        var pg = c.createLinearGradient(0, 1, 0, -1); pg.addColorStop(0, 'rgba(214,60,110,.35)'); pg.addColorStop(0.5, 'rgba(255,255,255,0)'); pg.addColorStop(1, 'rgba(255,255,255,.4)');
        c.fillStyle = pg; c.fillRect(-1.2, -1.2, 2.4, 2.4); c.globalCompositeOperation = 'source-over';
      } else veins(c, shape);
      lightUp(c);
    }
    // A floater's shadow is its silhouette blurred once, as it is made (soft, like shade on the pool floor): drawn
    // off its canvas so only the blurred shadow lands, inset by SHP for the blur, and drawn SHK larger to match.
    var SHP = Math.round(SPX * 0.14), SHK = SPX / (SPX - 2 * SHP);
    function soften(src) {
      var s = doc.createElement('canvas'); s.width = s.height = SPX;
      var c = s.getContext('2d'); if (!c) return src;
      c.shadowColor = '#000'; c.shadowBlur = SPX * 0.09; c.shadowOffsetX = SPX * 3;
      c.drawImage(src, SHP - SPX * 3, SHP, SPX - 2 * SHP, SPX - 2 * SHP);
      return s;
    }
    function sprite(shape, col, shadow) {
      var img = shape.indexOf('img:') === 0, key = (img ? shape : shape + '|' + col) + (shadow ? '|s' : '');   // a picture keeps its own colours
      if (SPR[key] !== undefined) return SPR[key];
      var s = doc.createElement('canvas'); s.width = s.height = SPX;
      var c = s.getContext('2d');
      if (!c) return (SPR[key] = null);
      if (img) {
        SPR[key] = null;                            // drawn once the picture arrives
        var im = new Image();
        im.onload = function () {
          c.drawImage(im, 0, 0, SPX, SPX);
          if (shadow) { c.globalCompositeOperation = 'source-in'; c.fillStyle = '#000'; c.fillRect(0, 0, SPX, SPX); }
          SPR[key] = shadow ? soften(s) : s;
        };
        im.src = shape.slice(4);
        return null;
      }
      c.translate(SPX / 2, SPX / 2); c.scale(SPX / 2 - 3, SPX / 2 - 3);
      drawShape(c, shape, col, shadow);
      return (SPR[key] = shadow ? soften(s) : s);
    }

    // ── particles
    var W = 0, H = 0, px = 1, rect = null, keeps = [], words = [], seen = 0, placed = false, parts = { fall: [], float: [] }, area0 = 1440 * 800;
    var coping = $('.coping', hero), hint = $('.hero__hint', hero);
    function spec(k) {
      var s = D[k];
      return {
        count: Math.max(0, Math.round(num(s.count, 0))), shapes: s.shapes && s.shapes.length ? s.shapes : [k === 'fall' ? 'snow' : 'petal'],
        colors: s.colors && s.colors.length ? s.colors : ['#FFFFFF'], size: s.size || [6, 12], speed: s.speed || [14, 30],
        wind: num(s.wind, 0), sway: num(s.sway, 10), spin: num(s.spin, 0), opacity: s.opacity || [0.85, 1],
        drift: s.drift || [4, 2], shadow: num(s.shadow, 0.22)
      };
    }
    var SP = { fall: layers.indexOf('fall') >= 0 ? spec('fall') : null, float: layers.indexOf('float') >= 0 ? spec('float') : null };
    // The floats keep clear of (hero px): the copy, the candy (its ball and stick, or the capsules) and its caption,
    // the hint, the awning with its shade at the top, and the coping at the foot. inKeep: the zone a float of
    // radius r at (x, y) would touch, if any.
    function inKeep(x, y, r) {
      for (var i = 0; i < keeps.length; i++) { var k = keeps[i]; if (x > k[0] - r && x < k[2] + r && y > k[1] - r && y < k[3] + r) return k; }
      return null;
    }
    function make(k, first) {
      var s = SP[k], shape = pick(s.shapes), col = pick(s.colors), size = range(s.size, 8);
      var p = { shape: shape, col: col, size: size, rot: rnd() * Math.PI * 2, a: range(s.opacity, 1), ph: rnd() * 100 };
      if (k === 'fall') {
        p.x = rnd() * W; p.y = first ? rnd() * H : -size - rnd() * H * 0.25;
        p.vy = range(s.speed, 20); p.sway = s.sway * (0.5 + rnd() * 0.5); p.spin = (rnd() * 2 - 1) * s.spin * Math.PI * 2;
      } else {
        var tries, ok = false, dir = s.drift[0] < 0 ? -1 : 1;
        // the opening arrangement (seeded): somewhere clear; a newcomer drifts in from the edge the current
        // carries it from, at a height where the first stretch of its way is clear
        for (tries = 0; tries < 40 && !ok; tries++) {
          if (first) { p.x = size + rnd() * Math.max(1, W - 2 * size); p.y = size + rnd() * Math.max(1, H - 2 * size); ok = !inKeep(p.x, p.y, size * 1.15); }
          else {
            p.x = dir > 0 ? -size * 2 : W + size * 2; p.y = size + rnd() * Math.max(1, H - 2 * size);
            ok = !inKeep(p.x + dir * W * 0.12, p.y, size) && !inKeep(p.x + dir * W * 0.25, p.y, size);
          }
        }
        p.vx = 0; p.vy = 0; p.spin = (rnd() * 2 - 1) * 0.15;
      }
      return p;
    }
    function scaleCount(n) { return Math.round(n * clamp((W * H) / area0, 0.45, 1.4)); }
    function populate() {
      ['fall', 'float'].forEach(function (k) {
        if (!SP[k]) return;
        var want = scaleCount(SP[k].count), L = parts[k];
        while (L.length < want) L.push(make(k, true));
        if (L.length > want) L.length = want;
      });
    }
    function size() {
      var w = hero.clientWidth, h = hero.clientHeight;
      if (!w || !h) return;
      var p0 = Math.min(window.devicePixelRatio || 1, 2);
      if (w === W && h === H && p0 === px) return;
      W = w; H = h; px = p0;
      cv.width = Math.round(W * px); cv.height = Math.round(H * px);
      if (placed) populate();
    }
    // the zones to keep clear of, hero-local (read phase: after heroRead, so the candy's box is this frame's)
    function read() {
      rect = hero.getBoundingClientRect();
      var L = rect.left, T = rect.top, list = [], r;
      var cp = heroCopy && heroCopy.getBoundingClientRect();
      if (cp && cp.height) list.push([cp.left - L - 28, cp.top - T - 24, cp.right - L + 28, cp.bottom - T + 24]);
      // the copy's own blocks (eyebrow, headline, lede, buttons, chips): a falling petal or leaf never crosses the words
      words.length = 0;
      if (heroCopy) for (var j = 0; j < heroCopy.children.length; j++) {
        r = heroCopy.children[j].getBoundingClientRect();
        if (r.height) words.push([r.left - L, r.top - T, r.right - L, r.bottom - T]);
      }
      if (awn) { r = awn.getBoundingClientRect(); if (r.height) list.push([-1e4, -1e4, 1e4, r.bottom - T + 34]); }   // (+ its fade: .decor in style.css)
      if (coping) { r = coping.getBoundingClientRect(); if (r.height) list.push([-1e4, r.top - T, 1e4, 1e4]); }
      if (hint) { r = hint.getBoundingClientRect(); if (r.height) list.push([r.left - L - 12, r.top - T - 12, r.right - L + 12, r.bottom - T + 12]); }
      heroZones().forEach(function (z) { list.push([z[0] - L, z[1] - T, z[2] - L, z[3] - T]); });
      keeps = list; seen++;
      size();
    }
    var t = 0;
    function step(st) {
      if (!W || !rect) return;
      // the opening arrangement waits for the second frame on screen, once the copy, the candy and its caption
      // have all been placed (the caption moves beside the stick on the first)
      if (!placed) { if (seen < 2) return; placed = true; populate(); }
      var dt = clamp((st.dt || 16) / 1000, 0, 0.05);
      t += dt;
      g.setTransform(px, 0, 0, px, 0, 0);
      g.clearRect(0, 0, W, H);
      var fs = SP.float, i, p, spr, sh;
      if (fs) {
        for (i = 0; i < parts.float.length; i++) {
          p = parts.float[i];
          // the swell's slow current, the ripples' push (eased off by the water), and a gentle way around anything
          // it should keep clear of: over or under it (whichever is nearer), and out of its nearer side
          var push = Water && Water.ripplePush ? Water.ripplePush(rect.left + p.x, rect.top + p.y) : null;
          if (push) { p.vx += push[0] * 220 * dt; p.vy += push[1] * 220 * dt; }
          var kz = inKeep(p.x, p.y, p.size);
          if (kz) {
            var el = p.x - kz[0] + p.size, er = kz[2] + p.size - p.x, et = p.y - kz[1] + p.size, eb = kz[3] + p.size - p.y;
            p.vy += (et < eb ? -1 : 1) * 12 * dt;
            if (Math.min(el, er) < Math.min(et, eb)) p.vx += (el < er ? -1 : 1) * 18 * dt;
          }
          var damp = Math.exp(-dt * 0.9);
          p.vx *= damp; p.vy *= damp;
          p.x += (fs.drift[0] + p.vx) * dt; p.y += (fs.drift[1] + p.vy) * dt;
          p.rot += (p.spin + (p.vx - p.vy) * 0.004) * dt;
          var m = p.size * 2;
          if (p.x > W + m || p.x < -m * 1.5 || p.y > H + m || p.y < -m * 1.5) {    // drifted away: another one drifts in
            parts.float[i] = make('float', false); continue;
          }
          var bob = Math.sin(t * 1.1 + p.ph) * 0.035, wob = Math.sin(t * 0.8 + p.ph * 1.7) * 0.06;
          var s = p.size * (1 + bob * 0.5);
          sh = fs.shadow > 0 ? sprite(p.shape, p.col, true) : null;
          if (sh) {                                // its shadow on the pool floor: down-right, soft (blurred sprite)
            var sk = s * 1.08 * SHK;
            g.save(); g.globalAlpha = fs.shadow * p.a; g.translate(p.x + p.size * 0.55, p.y + p.size * 0.72); g.rotate(p.rot + wob);
            g.drawImage(sh, -sk, -sk, sk * 2, sk * 2); g.restore();
          }
          spr = sprite(p.shape, p.col, false);
          if (!spr) continue;
          g.save(); g.globalAlpha = p.a; g.translate(p.x, p.y); g.rotate(p.rot + wob);
          g.drawImage(spr, -s, -s, s * 2, s * 2); g.restore();
        }
      }
      var ff = SP.fall;
      if (ff) {
        for (i = 0; i < parts.fall.length; i++) {
          p = parts.fall[i];
          p.y += p.vy * dt;
          p.x += (ff.wind + Math.cos(t * 0.9 + p.ph) * p.sway * 0.9) * dt;
          p.rot += p.spin * dt;
          if (p.y > H + p.size * 2 || p.x < -40 || p.x > W + 40) { parts.fall[i] = make('fall', false); continue; }
          spr = sprite(p.shape, p.col, false);
          if (!spr) continue;
          var flake = p.shape === 'snow' || p.shape === 'flake', fade = 1;
          var tilt = flake ? 1 : 0.55 + 0.45 * Math.abs(Math.cos(t * 1.7 + p.ph));   // leaves and petals tumble
          // a petal or leaf drifting toward the words fades away and comes back past them (snow may cross: white
          // behind the dark type only adds to its contrast)
          if (!flake) for (var q = 0; q < words.length; q++) {
            var wz = words[q], ox = Math.max(wz[0] - p.x, 0, p.x - wz[2]), oy = Math.max(wz[1] - p.y, 0, p.y - wz[3]);
            fade = Math.min(fade, clamp((Math.sqrt(ox * ox + oy * oy) - p.size) / 26, 0, 1));
          }
          if (fade <= 0.01) continue;
          g.save(); g.globalAlpha = p.a * fade; g.translate(p.x, p.y); g.rotate(p.rot); g.scale(1, tilt);
          g.drawImage(spr, -p.size, -p.size, p.size * 2, p.size * 2); g.restore();
        }
      }
    }
    return {
      read: read, step: step,
      // QA: how many are live, and the canvas size; the floats (hero-local x, y, radius) and the zones they keep clear of
      state: function () { return { fall: parts.fall.length, float: parts.float.length, w: cv.width, h: cv.height, placed: placed }; },
      parts: function () {
        var r = function (v) { return Math.round(v); };
        return { float: parts.float.map(function (p) { return [r(p.x), r(p.y), r(p.size)]; }), keeps: keeps.map(function (k) { return k.map(function (v) { return clamp(r(v), -9999, 9999); }); }) };
      }
    };
  })();

  /* ───────────────────────── 7 · The cabanas (switcher) ─────────────────────────
     Each cabana is drawn from its product's colours, in layers: a back SVG (its shadows on the sand, the
     interior, the plinth, the still life), the 3D candy, the flag, a front SVG (the curtains, the posts, the
     rope across a cabana still to open, the roof) and the valance. The flag and the valance have layers of
     their own, so the breeze (the valance sways, the flag flutters) and the hoist are transforms the
     compositor runs: nothing is laid out or repainted while they move. One stripe pitch (11 units) runs through
     roof, valance and curtains: one scallop per stripe. The canvas has a fine woven grain and stitched hems.
     One sun, up-left, lights it all: lit faces left and top, shade to the right and below, and the cast
     shadow falls right and back across the sand. Only the chosen cabana is open, with its product inside
     (the one live 3D candy; the drawn still life is the stand-in without 3D, or for a kind the library
     can't draw yet: .is-flat) and its flag up; the others keep their curtains drawn, and a cabana still to
     open is roped shut, its tag hanging from the rope ("Opening soon", its name). Choosing another: the old
     curtains close as the candy sinks away, then, hidden, it becomes the new product in the new cabana,
     whose curtains part as it rises back up. It never travels between cabanas.
     A season can restyle them in CSS: the stripes follow --<id>-stripe and --<id>-trim, the white stripe
     --stripe-2, and each cabana carries hidden snow (.cab-snow, see cabSnow) for a season to show. Nº 3 keeps the
     sand-and-cream canvas the client chose (set in style.css) and, when chosen, flies the Swiss flag.  */
  var cabRow = $('#cabanaRow'), cabMount = $('#cabanaCandy'), cabScroller = $('.cabana-scroller');
  var cab = { api: null, kind: state.product.candy.kind, color: state.product.candy.color, style: state.product.candy.style || null, token: 0, timer: 0, leaveAt: 0 };
  var CAB_LEAVE = 300;   // ms: the candy has sunk away and the old curtains are mostly drawn
  var CAB = (function () {
    var s = 11, x0 = 10, n = 20, x1 = x0 + n * s, r = s / 2, rs = r - 1.9, tw = 108 / n, k;   // 20 stripes, 5.5 apart at the ridge
    var arcs = '';
    for (k = n - 1; k >= 0; k--) arcs += ' A' + r + ' ' + r + ' 0 0 1 ' + (x0 + k * s) + ' 104';
    var stA = '', stB = '';
    for (k = 0; k < n; k++) {
      var cx = x0 + (k + 0.5) * s, seg = 'M' + (cx + rs).toFixed(2) + ' 104 A' + rs + ' ' + rs + ' 0 0 1 ' + (cx - rs).toFixed(2) + ' 104';
      if (k % 2 === 0) stA += seg; else stB += seg;
    }
    var roofA = '', roofB = '';
    for (k = 0; k < n; k++) {
      var tx = 66 + k * tw, bx = x0 + k * s;
      var pnl = 'M' + tx.toFixed(2) + ' 52L' + (tx + tw).toFixed(2) + ' 52L' + (bx + s) + ' 82L' + bx + ' 82Z';
      if (k % 2 === 0) roofA += pnl; else roofB += pnl;
    }
    // the curtains drawn shut; style.css holds them gathered open (the same commands, so they morph). The hem
    // is stitched a little in from the leading edge and the floor, and follows it.
    return {
      s: s,
      valance: 'M' + x0 + ' 80H' + x1 + 'V104' + arcs + 'Z', piping: 'M' + x1 + ' 104' + arcs, stitchA: stA, stitchB: stB,
      roofA: roofA, roofB: roofB,
      curtainL: 'M27 100 L120 100 C120 150 120 182 120 204 C120 228 120 262 120 292 L27 292 Z',
      curtainR: 'M213 100 L120 100 C120 150 120 182 120 204 C120 228 120 262 120 292 L213 292 Z',
      hemL: 'M117.6 101 C117.6 150 117.6 182 117.6 204 C117.6 228 117.6 262 117.6 289.6 L27 289.6',
      hemR: 'M122.4 101 C122.4 150 122.4 182 122.4 204 C122.4 228 122.4 262 122.4 289.6 L213 289.6'
    };
  })();
  // the canvas's woven grain: darker warp threads and lighter weft, two streaky noises in one seamless tile
  // (drawn once by the browser and repeated over every fabric surface at a low opacity)
  var WEAVE = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">' +
    '<filter id="w" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
    '<feTurbulence type="fractalNoise" baseFrequency=".9 .4" numOctaves="2" seed="4" stitchTiles="stitch"/>' +
    '<feColorMatrix values="0 0 0 0 .22 0 0 0 0 .12 0 0 0 0 .1 0 0 0 -1 .5" result="d"/>' +
    '<feTurbulence type="fractalNoise" baseFrequency=".4 .9" numOctaves="2" seed="9" stitchTiles="stitch"/>' +
    '<feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 -.5" result="l"/>' +
    '<feMerge><feMergeNode in="d"/><feMergeNode in="l"/></feMerge></filter>' +
    '<rect width="64" height="64" filter="url(#w)"/></svg>');
  // the Swiss flag (square, never the shield): a red field and a white cross, arms a sixth longer than wide
  var SWISS = '<svg class="cabana__tag-flag" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect width="32" height="32" rx="2.5" fill="#D52B1E"/><path d="M13 6h6v7h7v6h-7v7h-6v-7H6v-6h7z" fill="#fff"/></svg>';
  var FOLDS = [[0, 'rgba(74,13,46,0)'], [0.08, 'rgba(74,13,46,.1)'], [0.17, 'rgba(255,255,255,.12)'], [0.28, 'rgba(74,13,46,.12)'], [0.39, 'rgba(255,255,255,.1)'],
    [0.5, 'rgba(74,13,46,.12)'], [0.61, 'rgba(255,255,255,.1)'], [0.73, 'rgba(74,13,46,.12)'], [0.85, 'rgba(255,255,255,.12)'], [0.94, 'rgba(74,13,46,.1)'], [1, 'rgba(74,13,46,.18)']];
  function stop(o, c) { return '<stop offset="' + o + '" style="stop-color:' + c + '"/>'; }
  /* Winter: snow on each cabana. The same snow on all three, lying differently on each (hidden unless a season
     shows it: html[data-season="winter"] .cab-snow { display: inline }). It has a layer of its own above the
     valance, so a lobe can hang over the eave. A thick blanket mounded over the roof (its top rises above the
     ridge; its lower edge sags in lobes: here it stops on the slope, there it has slid to the eave and hangs
     over it), a cap on the finial and a drift against each front post. One sun, up-left: the snow is whitest on
     its upper left, glacier blue in its hollows and under its lower edge, and it shades the canvas below it.
     Per cabana: top = the crest [x, height above the ridge]; low = the lower edge, right to left [0..1 across the
     roof, y] (the eave is at y 82: more hangs over); dips = soft hollows [cx, cy, rx, ry]; drift = the two drifts
     [x0, x1, peak x, height]; cap = the finial cap's tilt. */
  var CAB_SNOW = [
    { top: [[60, 2], [74, 7.5], [92, 9.6], [112, 7.2], [130, 8.4], [150, 6], [168, 4.6], [181, 1.6]],
      low: [[1, 66], [0.93, 74], [0.86, 83], [0.78, 86.5], [0.7, 80], [0.62, 71], [0.54, 74], [0.46, 69], [0.38, 75], [0.3, 82], [0.22, 87], [0.14, 84], [0.07, 86.5], [0, 78]],
      dips: [[100, 60, 15, 3.4], [152, 64, 11, 2.8]], drift: [[5, 58, 24, 10], [196, 236, 214, 7]], cap: -9 },
    { top: [[60, 1.5], [76, 6.8], [94, 8.8], [111, 5.2], [124, 4.4], [140, 7.6], [160, 9.4], [174, 6], [181, 2]],
      low: [[1, 76], [0.94, 84], [0.87, 87.5], [0.8, 81], [0.72, 72], [0.63, 76], [0.55, 84.5], [0.48, 87.5], [0.41, 82], [0.33, 71], [0.24, 67], [0.15, 72], [0.07, 78], [0, 70]],
      dips: [[118, 57, 9, 3.6], [80, 62, 12, 2.6], [164, 66, 12, 3]], drift: [[10, 46, 22, 6.5], [184, 238, 212, 11.5]], cap: 7 },
    { top: [[60, 1], [78, 3.8], [100, 5.4], [122, 6.6], [144, 8.6], [162, 10.6], [176, 9], [184, 3.4]],
      low: [[1, 82], [0.95, 87.5], [0.88, 86], [0.8, 88], [0.72, 83], [0.64, 75], [0.56, 78], [0.47, 70], [0.38, 66], [0.28, 70], [0.19, 65], [0.1, 68], [0, 62]],
      dips: [[136, 60, 16, 3.2], [182, 72, 12, 3.4]], drift: [[2, 64, 26, 12.5], [200, 232, 216, 6]], cap: 14 }
  ];
  function cabSnow(i, id) {
    var S = CAB_SNOW[i % CAB_SNOW.length], n1 = function (v) { return Math.round(v * 10) / 10; };
    var xl = function (y) { return 66 - (y - 52) * 56 / 30 + 2.5; }, xr = function (y) { return 174 + (y - 52) * 56 / 30 - 2.5; };
    var top = S.top.map(function (p) { return [p[0], 52 - p[1]]; });
    var low = S.low.map(function (p) { return [xl(p[1]) + (xr(p[1]) - xl(p[1])) * p[0], p[1]]; });
    var path = function (P, closed) {   // a soft outline through the points (Catmull-Rom, as Béziers)
      var d = 'M' + n1(P[0][0]) + ' ' + n1(P[0][1]), N = P.length;
      for (var k = 0; k < (closed ? N : N - 1); k++) {
        var p0 = P[(k - 1 + N) % N], p1 = P[k % N], p2 = P[(k + 1) % N], p3 = P[(k + 2) % N];
        if (!closed) { if (k === 0) p0 = p1; if (k === N - 2) p3 = p2; }
        d += 'C' + n1(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + n1(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + n1(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + n1(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + n1(p2[0]) + ' ' + n1(p2[1]);
      }
      return d + (closed ? 'Z' : '');
    };
    var D = path(top.concat(low), true), edge = path(low, false), crest = path(top, false), blur = ' filter="url(#' + id + 'h)"';
    var drift = S.drift.map(function (q) {
      var x0 = q[0], x1 = q[1], px = q[2], h = q[3], y = 293.4;
      var d = path([[x0, y], [x0 + (px - x0) * 0.35, y - h * 0.3], [x0 + (px - x0) * 0.72, y - h * 0.78], [px, y - h * 0.94], [px + (x1 - px) * 0.22, y - h * 0.86], [px + (x1 - px) * 0.52, y - h * 0.46], [px + (x1 - px) * 0.82, y - h * 0.12], [x1, y]], false) + 'V294.6H' + x0 + 'Z';
      return '<path d="' + d + '" transform="translate(2.4 .8)" fill="rgba(52,90,140,.3)"' + blur + '/><path d="' + d + '" style="fill:url(#' + id + 'G)"/><path d="' + d + '" style="fill:url(#' + id + 'M)"/>' +
        '<path d="' + d + '" fill="none" stroke="rgba(110,150,196,.4)" stroke-width=".5"/>';
    }).join('');
    return '<svg class="cabana__svg cabana__svg--snow" viewBox="0 0 240 300" aria-hidden="true" focusable="false"><g class="cab-snow"><defs>' +
        '<linearGradient id="' + id + 'N" gradientUnits="userSpaceOnUse" x1="0" y1="40" x2="0" y2="90">' + stop(0, '#FFFFFF') + stop(0.5, '#F7FAFD') + stop(1, '#D2E1F0') + '</linearGradient>' +
        '<linearGradient id="' + id + 'G" gradientUnits="userSpaceOnUse" x1="0" y1="279" x2="0" y2="295">' + stop(0, '#FFFFFF') + stop(1, '#DAE6F2') + '</linearGradient>' +
        '<linearGradient id="' + id + 'M" gradientUnits="userSpaceOnUse" x1="20" y1="0" x2="225" y2="0">' + stop(0, 'rgba(255,255,255,.85)') + stop(0.5, 'rgba(255,255,255,0)') + stop(1, 'rgba(146,182,220,.4)') + '</linearGradient>' +
        '<clipPath id="' + id + 'P"><path d="' + D + '"/></clipPath></defs>' +
      '<path d="' + D + '" transform="translate(1.6 3.1)" fill="rgba(44,82,130,.36)"' + blur + '/>' +                       // its shade on the canvas below
      '<path d="' + D + '" style="fill:url(#' + id + 'N)"/><path d="' + D + '" style="fill:url(#' + id + 'M)"/>' +
      '<g clip-path="url(#' + id + 'P)">' +
        '<path d="' + edge + '" fill="none" stroke="rgba(100,146,198,.55)" stroke-width="4.4"' + blur + '/>' +              // the rounded underside
        S.dips.map(function (e) { return '<ellipse cx="' + e[0] + '" cy="' + e[1] + '" rx="' + e[2] + '" ry="' + e[3] + '" fill="rgba(118,162,208,.26)"' + blur + '/>'; }).join('') +
        '<path d="' + crest + '" transform="translate(-.8 1.7)" fill="none" stroke="#fff" stroke-width="3.2" opacity=".95"' + blur + '/>' +   // the sunlit crest
      '</g>' +
      '<path d="' + D + '" fill="none" stroke="rgba(108,148,196,.45)" stroke-width=".5"/>' +
      // the finial's cap, the flagpole standing out of it
      '<g transform="rotate(' + S.cap + ' 120 46)"><path d="M115.9 47.2C115.6 43.2 117.6 40.8 120.1 40.7C122.7 40.8 124.4 43.4 124.1 47.2C122.7 46 121.3 46.5 120 46.1C118.6 46.5 117.3 45.9 115.9 47.2Z" style="fill:url(#' + id + 'N)" stroke="rgba(108,148,196,.5)" stroke-width=".4"/></g>' +
      drift +
    '</g></svg>';
  }
  function cabanaArt(p, i) {
    var id = 'cab' + i, soon = p.status !== 'available';
    var swiss = p.id === 'vitamin-c';   // made in Switzerland: its cabana flies the Swiss flag
    var defs = '<defs>' +
      '<pattern id="' + id + 's" patternUnits="userSpaceOnUse" x="10" y="0" width="' + 2 * CAB.s + '" height="300"><rect width="' + CAB.s + '" height="300" style="fill:var(--c)"/><rect x="' + CAB.s + '" width="' + CAB.s + '" height="300" style="fill:var(--c2)"/></pattern>' +
      '<pattern id="' + id + 'w" patternUnits="userSpaceOnUse" width="44" height="44"><image href="' + WEAVE + '" width="44" height="44"/></pattern>' +
      '<linearGradient id="' + id + 'f" x1="0" x2="1" y1="0" y2="0">' + FOLDS.map(function (f) { return stop(f[0], f[1]); }).join('') + '</linearGradient>' +
      // the sun from above: the curtains catch it at the top and go a little darker toward the sand
      '<linearGradient id="' + id + 'g" x1="0" x2="0" y1="0" y2="1">' + stop(0, 'rgba(255,255,255,.14)') + stop(0.3, 'rgba(255,255,255,0)') + stop(0.78, 'rgba(74,13,46,0)') + stop(1, 'rgba(74,13,46,.11)') + '</linearGradient>' +
      // a flag in the wind: soft ripples across it
      '<linearGradient id="' + id + 'F" x1="0" x2="1" y1="0" y2="0">' + stop(0, 'rgba(255,255,255,0)') + stop(0.3, 'rgba(255,255,255,.24)') + stop(0.55, 'rgba(74,13,46,.13)') + stop(0.78, 'rgba(255,255,255,.14)') + stop(1, 'rgba(74,13,46,.1)') + '</linearGradient>' +
      '<clipPath id="' + id + 'q"><rect x="22" y="80" width="196" height="40"/></clipPath>' +
      '<linearGradient id="' + id + 'r" x1="0" x2="0" y1="0" y2="1">' + stop(0, 'var(--room-2)') + stop(0.55, 'var(--room)') + stop(1, '#FFFDF8') + '</linearGradient>' +
      '<linearGradient id="' + id + 'L" x1="0" x2="1" y1="0" y2="0">' + stop(0, 'rgba(255,255,255,.26)') + stop(0.45, 'rgba(255,255,255,0)') + stop(1, 'rgba(74,13,46,.16)') + '</linearGradient>' +
      '<linearGradient id="' + id + 'V" x1="0" x2="0" y1="0" y2="1">' + stop(0, 'rgba(255,255,255,.26)') + stop(0.45, 'rgba(255,255,255,0)') + stop(1, 'rgba(74,13,46,.17)') + '</linearGradient>' +
      '<linearGradient id="' + id + 'D" x1="0" x2="0" y1="0" y2="1">' + stop(0, 'rgba(74,13,46,.24)') + stop(1, 'rgba(74,13,46,0)') + '</linearGradient>' +
      '<radialGradient id="' + id + 'c" cx=".36" cy=".3" r=".78">' + stop(0, 'rgba(255,255,255,.95)') + stop(0.16, 'var(--still-hi)') + stop(0.62, 'var(--still)') + stop(1, 'var(--still-lo)') + '</radialGradient>' +
      '<linearGradient id="' + id + 'k" x1="0" x2="0" y1="0" y2="1">' + stop(0, 'var(--still-hi)') + stop(0.3, 'var(--still-hi)') + stop(0.62, 'var(--still)') + stop(1, 'var(--still-lo)') + '</linearGradient>' +
      '<linearGradient id="' + id + 'n" x1="0" x2="1" y1="0" y2="0">' + stop(0, '#FFFFFF') + stop(0.55, '#F4F8FB') + stop(1, '#D9E4EE') + '</linearGradient>' +
      '<filter id="' + id + 'b" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="2.8"/></filter>' +
      '<filter id="' + id + 'h" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="1.1"/></filter>' +
    '</defs>';
    var still;
    if (p.candy.kind === 'capsule') {
      // three two-piece capsules on the plinth (two lying, one leaning on them): a cylinder's light from the upper
      // left (the gradient turns with each capsule), the cap a hair wider than the body, its rim a fine line
      var capsuleAt = function (cx, cy, L, rot) {
        var r = L / CAP_RATIO / 2, x0 = -L / 2, x1 = L / 2, xc = -L / 2 + L * 0.47, rc = r + 0.35;
        return '<g transform="translate(' + cx + ' ' + cy + ') rotate(' + rot + ')">' +
          '<rect x="' + x0 + '" y="' + (-r) + '" width="' + L + '" height="' + (2 * r) + '" rx="' + r + '" style="fill:url(#' + id + 'k)"/>' +
          '<path d="M' + (x0 - 0.3 + rc) + ' ' + (-rc) + 'H' + xc + 'V' + rc + 'H' + (x0 - 0.3 + rc) + 'A' + rc + ' ' + rc + ' 0 0 1 ' + (x0 - 0.3 + rc) + ' ' + (-rc) + 'Z" style="fill:url(#' + id + 'k)"/>' +
          '<path d="M' + xc + ' ' + (-rc) + 'V' + rc + '" stroke="rgba(120,96,50,.42)" stroke-width=".55"/>' +
          '<path d="M' + (x0 + r) + ' ' + (-r * 0.55) + 'H' + (x1 - r) + '" stroke="rgba(255,255,255,.75)" stroke-width=".9" stroke-linecap="round"/></g>';
      };
      still = '<g class="cab-still"><ellipse cx="124" cy="241.4" rx="21" ry="2.2" fill="rgba(110,86,46,.28)" filter="url(#' + id + 'b)"/>' +
        capsuleAt(129, 235.6, 26, 7) + capsuleAt(113, 236.2, 27, -5) + capsuleAt(117, 225, 27, -52) + '</g>';
    } else {
      still = '<g class="cab-still"><rect x="118.5" y="196" width="3" height="45" rx="1.5" fill="#FFFEFB" stroke="rgba(74,13,46,.22)" stroke-width=".6"/>' +
        '<circle cx="120" cy="180" r="19" style="fill:url(#' + id + 'c)"/><ellipse cx="113" cy="172.5" rx="5.2" ry="3.2" fill="#fff" opacity=".8" transform="rotate(-32 113 172.5)"/></g>';
    }
    var back = '<svg class="cabana__svg cabana__svg--back" viewBox="0 0 240 300" aria-hidden="true" focusable="false">' + defs +
      // the sun is up-left: the shadow falls right and back across the sand, darker and crisper by the base
      '<path class="cab-shadow" d="M30 291L214 291L320 259L136 259Z" filter="url(#' + id + 'b)"/>' +
      '<path class="cab-shadow cab-shadow--core" d="M30 291.4L214 291.4L254 279.6L70 279.6Z" filter="url(#' + id + 'h)"/>' +
      '<ellipse class="cab-contact" cx="121.6" cy="292.3" rx="100.6" ry="2.5"/>' +
      '<rect x="27" y="100" width="186" height="192" style="fill:url(#' + id + 'r)"/>' +
      '<rect x="27" y="100" width="186" height="192" style="fill:url(#' + id + 's)" opacity=".14"/>' +
      '<rect class="cab-deck" x="27" y="272" width="186" height="20"/>' +
      '<path class="cab-plinth-top" d="M100 241H140L143 246H97Z"/><rect class="cab-plinth" x="97" y="246" width="46" height="46"/><rect class="cab-plinth-side" x="135" y="246" width="8" height="46"/>' +
      still + '</svg>';
    var ropeL = '<path class="cab-rope" d="M27 200C33 197 40 197 43 201C41 206 34 207 27 205"/><path class="cab-rope" d="M42 205V212"/><path class="cab-tassel" d="M42 211C39.4 213.5 39 219 42 222C45 219 44.6 213.5 42 211Z"/>';
    var ropeR = '<path class="cab-rope" d="M213 200C207 197 200 197 197 201C199 206 206 207 213 205"/><path class="cab-rope" d="M198 205V212"/><path class="cab-tassel" d="M198 211C195.4 213.5 195 219 198 222C201 219 200.6 213.5 198 211Z"/>';
    // the flag, hoisted when the cabana is chosen: a pennant in its stripe, or for Nº 3 the Swiss flag
    var cloth = swiss
      ? '<rect x="120.6" y="14" width="13" height="13" rx=".5" fill="#D52B1E"/>' +
        '<path d="M125.88 16.44h2.44v2.84h2.84v2.44h-2.84v2.84h-2.44v-2.84h-2.84v-2.44h2.84z" fill="#fff"/>' +
        '<rect x="120.6" y="14" width="13" height="13" rx=".5" style="fill:url(#' + id + 'F)"/>'
      : '<path d="M120.7 14.6L143 20.1L120.7 25.6Z" style="fill:var(--c);stroke:var(--c-deep);stroke-width:.8;stroke-linejoin:round"/>' +
        '<path d="M120.7 14.6L143 20.1L120.7 25.6Z" style="fill:url(#' + id + 'F)"/>';
    var fabric = function (d, fill) { return '<path class="cab-fabric' + (fill === 'w' ? ' cab-weave' : '') + '" d="' + d + '" style="fill:url(#' + id + fill + ')"/>'; };
    var curtain = function (side, d, hem) {   // stripes, woven grain, folds, the light; then the stitched hem
      return '<g class="cab-curtain cab-curtain--' + side + '">' + fabric(d, 's') + fabric(d, 'w') + fabric(d, 'f') + fabric(d, 'g') + '<path class="cab-hem" d="' + hem + '"/></g>';
    };
    // a cabana still to open is roped shut: a gold cord from post to post, its tag hanging from the knot
    var rope = 'M25.6 197.6Q120 222.6 214.4 197.6';
    var closure = soon ? '<g class="cab-closure"><path class="cab-cord-shade" d="' + rope + '" transform="translate(1.4 2.6)" filter="url(#' + id + 'h)"/>' +
      '<path class="cab-cord" d="' + rope + '"/><path class="cab-cord-twist" d="' + rope + '"/>' +
      '<circle class="cab-ring" cx="24.6" cy="197" r="1.9"/><circle class="cab-ring" cx="215.4" cy="197" r="1.9"/>' +
      '<ellipse class="cab-knot" cx="120" cy="210" rx="2.5" ry="2"/></g>' : '';
    // the flag on a layer of its own, under the roof: hoisting it and its flutter are compositor transforms
    var flag = '<svg class="cabana__svg cabana__svg--flag" viewBox="118 12 28 42" aria-hidden="true" focusable="false">' +
      '<g class="cab-flag"><path class="cab-pole" d="M120 52V13.4"/><g class="cab-flag__cloth">' + cloth + '</g></g></svg>';
    var front = '<svg class="cabana__svg cabana__svg--front" viewBox="0 0 240 300" aria-hidden="true" focusable="false">' +
      curtain('l', CAB.curtainL, CAB.hemL) + curtain('r', CAB.curtainR, CAB.hemR) +
      '<rect x="27" y="100" width="186" height="18" style="fill:url(#' + id + 'D)"/>' +
      '<g class="cab-tie">' + ropeL + ropeR + '</g>' +
      // the posts, lit on the left with a sliver of shade on the right
      '<rect class="cab-post" x="22" y="78" width="5" height="214" rx="1"/><rect class="cab-post" x="213" y="78" width="5" height="214" rx="1"/>' +
      '<path class="cab-post-shade" d="M25.2 79h1.5v213h-1.5zM216.2 79h1.5v213h-1.5z"/>' +
      closure +
      '<path d="' + CAB.roofA + '" style="fill:var(--c)"/><path d="' + CAB.roofB + '" style="fill:var(--c2)"/>' +
      '<path class="cab-weave" d="M66 52H174L230 82H10Z" style="fill:url(#' + id + 'w)"/>' +
      '<path d="M66 52H174L230 82H10Z" style="fill:url(#' + id + 'L)"/>' +
      '<path class="cab-seam" d="M17.4 78.4H222.6"/>' +
      '<path class="cab-ridge" d="M63 52H177" style="stroke:var(--c-deep)"/>' +
      // the finial: a turned knob on a collar, a glint of sun on its upper left
      '<path class="cab-finial" d="M117.8 52.6h4.4l-.8-1.9h-2.8zM120 44.2a3 3 0 1 0 0 6a3 3 0 1 0 0-6z" style="fill:var(--c-deep)"/><circle class="cab-finial-lit" cx="119" cy="46.2" r="1"/>' +
    '</svg>';
    // the valance, on its own layer (the breeze sways it), with its soft shade on the curtains below and right
    var valance = '<svg class="cabana__svg cabana__svg--valance" viewBox="0 76 240 46" aria-hidden="true" focusable="false">' +
      '<path class="cab-valance-shade" d="' + CAB.valance + '" transform="translate(1.4 2.4)" filter="url(#' + id + 'h)" clip-path="url(#' + id + 'q)"/>' +
      '<g class="cab-valance"><path d="' + CAB.valance + '" style="fill:url(#' + id + 's)"/><path class="cab-weave" d="' + CAB.valance + '" style="fill:url(#' + id + 'w)"/><path d="' + CAB.valance + '" style="fill:url(#' + id + 'V)"/>' +
        '<path class="cab-piping" d="' + CAB.piping + '" style="stroke:var(--c-deep)"/>' +
        '<path class="cab-stitch cab-stitch--a" d="' + CAB.stitchA + '"/><path class="cab-stitch cab-stitch--b" d="' + CAB.stitchB + '"/>' +
        '<path class="cab-stitch cab-stitch--b" d="M10 84.6H230"/></g>' +
    '</svg>';
    // the tag on the rope: "Opening soon", the name (and for Nº 3, made in Switzerland); "Concept render" once open
    var tag = soon ? '<span class="cabana__tag"><span class="cabana__tag-a"><small>' + p.tag + '</small><b>' + p.name + '</b>' +
        (p.tagNote ? '<small class="cabana__tag-note">' + (swiss ? SWISS : '') + p.tagNote + '</small>' : '') +
      '</span><span class="cabana__tag-b">Concept render</span></span>' : '';
    return back + '<div class="cabana__stage"></div>' + flag + front + valance + cabSnow(i, id) + tag;
  }
  function renderCabanas() {
    if (!cabRow) return;
    cabRow.innerHTML = PRODUCTS.map(function (p, i) {
      var sel = p === state.product, C = p.cabana, st = C.still;
      var vars = '--c:' + tok(p, 'stripe') + ';--c2:var(--stripe-2, #FFFDF8);--c-deep:' + tok(p, 'trim') + ';--room:' + C.room + ';--room-2:' + C.room2 + ';--still-hi:' + st[0] + ';--still:' + st[1] + ';--still-lo:' + st[2];
      var cls = 'cabana' + (sel ? ' is-selected is-open' : '') + (canDraw(p.candy.kind) ? '' : ' is-flat');
      return '<li class="' + cls + '" data-id="' + p.id + '" style="' + vars + '">' +
        '<div class="cabana__art" aria-hidden="true">' + cabanaArt(p, i) + '</div>' +
        '<button class="cabana__btn" type="button" aria-pressed="' + sel + '" data-product="' + p.id + '">' +
          '<span class="cabana__no" aria-hidden="true">Cabana ' + NO + ' ' + p.no + '</span><span class="sr-only">Cabana ' + p.no + ': </span>' +
          '<span class="cabana__name">' + p.name + '</span>' +
          '<span class="cabana__status" data-status="' + p.status + '">' + p.statusLabel + '</span>' +
        '</button></li>';
    }).join('');
  }
  function updateCabanas(animate) {
    if (!cabRow) return;
    var chosen = null;
    $$('.cabana', cabRow).forEach(function (li) {
      var on = li.getAttribute('data-id') === state.product.id, was = li.classList.contains('is-selected');
      li.classList.toggle('is-selected', on);
      var b = $('.cabana__btn', li); if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) chosen = li;
      if (on && !was && animate && !reduce) { li.classList.remove('is-rolling'); void li.offsetWidth; li.classList.add('is-rolling'); setTimeout(function () { li.classList.remove('is-rolling'); }, 800); }
    });
    openCabana(chosen, animate);
    // on phones the cabanas scroll sideways: bring the chosen one to the middle
    if (cabScroller && cabScroller.scrollWidth > cabScroller.clientWidth + 4 && chosen) {
      cabScroller.scrollTo({ left: chosen.offsetLeft - (cabScroller.clientWidth - chosen.offsetWidth) / 2, behavior: (animate && !reduce) ? 'smooth' : 'auto' });
    }
  }
  // Open the chosen cabana and close the rest. The candy leaves the old one (.is-away: it sinks onto the
  // plinth and fades as those curtains close), changes product while nobody can see it, and rises in the
  // new one as its curtains part. A quick second choice simply retargets the hand-over.
  function openCabana(li, animate) {
    if (!li || !cabMount) return;
    var token = ++cab.token, stage = $('.cabana__stage', li);
    clearTimeout(cab.timer);
    $$('.cabana', cabRow).forEach(function (c) { if (c !== li) c.classList.remove('is-open'); });
    var home = cabMount.parentNode === stage;
    if (!animate || reduce) {
      if (!home) stage.appendChild(cabMount);
      cabMount.classList.remove('is-away');
      li.classList.add('is-open');
      cabanaCandyTo(state.product, 'now');
      return;
    }
    if (home) {                                    // back to the cabana that still holds it: just come back up
      li.classList.add('is-open');
      cabMount.classList.remove('is-away');
      cabanaCandyTo(state.product, 'now');
      return;
    }
    var inStage = cabMount.parentNode && cabMount.parentNode.classList && cabMount.parentNode.classList.contains('cabana__stage');
    var wait = 0;
    if (inStage && !cabMount.classList.contains('is-away')) { cabMount.classList.add('is-away'); cab.leaveAt = performance.now(); wait = CAB_LEAVE; }
    else if (inStage) wait = Math.max(0, CAB_LEAVE - (performance.now() - cab.leaveAt));   // already leaving
    cab.timer = setTimeout(function () {
      if (token !== cab.token) return;
      stage.appendChild(cabMount);
      cabanaCandyTo(state.product, 'hidden');
      li.classList.add('is-open');
      void cabMount.offsetWidth;                   // start the rise from the sunk, hidden state
      cabMount.classList.remove('is-away');
    }, wait);
  }
  // The cabana candy follows the chosen product: while hidden it swaps at once (the rise does the reveal);
  // in place (reduced motion, or a cabana chosen again mid-leave) it plays the library's own swap.
  function cabanaCandyTo(p, how) {
    if (!cab.api) return;
    var flat = !canDraw(p.candy.kind);             // a kind the library can't draw yet: its cabana shows the still life
    cabMount.classList.toggle('is-flat', flat);
    if (flat) { cab.api.pause(); return; }
    cab.api.resume();
    var c = candyOf(p);
    if (cab.kind === c.kind && cab.color === c.color && cab.style === c.style) return;
    cab.api.setProduct(c, { duration: how === 'hidden' ? 0.05 : 0.8 });
    cab.kind = c.kind; cab.color = c.color; cab.style = c.style;
    cabMount.setAttribute('data-kind', c.kind);   // the capsules lie on the plinth: CSS sets them down onto it
  }
  function initCabanas() {
    if (!cabRow) return;
    renderCabanas();
    openCabana($('.cabana.is-selected', cabRow), false);
    cabRow.addEventListener('click', function (e) {
      var b = e.target.closest('.cabana__btn'); if (!b) return;
      setProduct(b.getAttribute('data-product'));
    });
    cabRow.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var btns = $$('.cabana__btn', cabRow), i = btns.indexOf(doc.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var n = btns[(i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length];
      n.focus(); setProduct(n.getAttribute('data-product'));
    });
    if (cabScroller) updateCabanas(false);
    // the breeze (the valances, the chosen flag) rests while the beach is out of view (.is-offscreen, style.css)
    if ('IntersectionObserver' in window) {
      cabRow.classList.add('is-offscreen');
      new IntersectionObserver(function (en) { cabRow.classList.toggle('is-offscreen', !en[en.length - 1].isIntersecting); }, { rootMargin: '120px 0px' }).observe(cabRow);
    }
  }

  /* The facts drawer at the foot of the cabana card: a disclosure, drawn from the product's label
     (PRODUCTS[].label). Closed it is one quiet row; open, a small facts table (its caption, column and row
     headers; every unknown amount a TBD placeholder) beside what is known and what is still to come.
     Links marked [data-show-label] open it (choosing that product first if they name one). */
  var labelBox = $('#cabanaLabel'), labelBtn = $('#labelToggle'), labelPanel = $('#labelPanel'), labelFor = null;
  // The panel, set like a printed facts panel: a caption (name, servings), the rows with their amounts (and a
  // %DV column when the label has one), the footnotes; beside it the ingredients, the label's claims, what is
  // known and what is still to come, and the warning, word for word.
  function labelHTML(L) {
    var dv = !!L.dv, cols = dv ? 3 : 2;
    var dl = function (list) { return '<dl class="label-side__list">' + list.map(function (t) { return '<div><dt>' + t[0] + '</dt><dd>' + t[1] + '</dd></div>'; }).join('') + '</dl>'; };
    var block = function (k, inner) { return '<div class="label-side__block"><p class="caption">' + k + '</p>' + inner + '</div>'; };
    var row = function (r) {
      var cls = r[3] ? ' class="' + r[3].split(' ').map(function (c) { return 'sf-' + c; }).join(' ') + '"' : '';
      return '<tr' + cls + '><th scope="row">' + r[0] + '</th><td>' + (r[1] || '') + '</td>' + (dv ? '<td>' + (r[2] || '') + '</td>' : '') + '</tr>';
    };
    var side = '';
    if (L.ingredients) side += block('Ingredients', '<p class="label-side__ing">' + L.ingredients + '</p>');
    if (L.badges) side += '<ul class="label-badges" aria-label="On the label">' + L.badges.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul>';
    if (L.known) side += block(L.tbd ? 'What we know' : 'Also on the pack', dl(L.known));
    if (L.tbd) side += block('Still to come', dl(L.tbd));
    if (L.warning) side += '<p class="label-side__warn">' + L.warning + '</p>';
    return '<div class="label-panel__inner">' +
      '<div class="sfacts-box">' + (L.source ? '<p class="sfacts__source"><i data-lucide="file-pen-line" aria-hidden="true"></i>' + L.source + '</p>' : '') +
        '<table class="sfacts' + (dv ? ' sfacts--dv' : '') + '">' +
        '<caption><span class="sfacts__title">' + L.title + '</span>' + L.lines.map(function (l) { return '<span class="sfacts__serving">' + l + '</span>'; }).join('') + '</caption>' +
        '<thead><tr>' + L.head.map(function (h) { return '<th scope="col">' + h + '</th>'; }).join('') + '</tr></thead>' +
        '<tbody>' + L.rows.map(row).join('') + '</tbody>' +
        (L.foot ? '<tfoot><tr><td colspan="' + cols + '">' + L.foot.map(function (p) { return '<p>' + p + '</p>'; }).join('') + '</td></tr></tfoot>' : '') +
      '</table></div>' +
      '<div class="label-side">' + side + '</div>' +
    '</div>';
  }
  function renderLabel(p) {
    if (!labelBox || !labelBtn || !labelPanel) return;
    var L = p.label;
    setLabel(false, false);                        // a new product starts with its drawer closed
    labelBox.hidden = !L;
    if (!L || labelFor === p) return;
    labelFor = p;
    var meta = $('.label-toggle__meta', labelBtn); if (meta) meta.textContent = L.meta;
    labelPanel.setAttribute('aria-label', L.name);
    labelPanel.innerHTML = labelHTML(L);
  }
  function setLabel(open, animate) {
    if (!labelBtn || !labelPanel) return;
    var was = labelBtn.getAttribute('aria-expanded') === 'true';
    labelBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open === was && labelPanel.hidden === !open) return;
    var ease = animate && !reduce && labelPanel.animate;
    if (open) {
      labelPanel.hidden = false;
      if (ease) labelPanel.animate([{ height: '0px', opacity: 0 }, { height: labelPanel.scrollHeight + 'px', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.16,1,.3,1)' });
    } else if (ease && !labelPanel.hidden) {
      var an = labelPanel.animate([{ height: labelPanel.scrollHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(.65,0,.35,1)' });
      an.onfinish = function () { if (labelBtn.getAttribute('aria-expanded') !== 'true') labelPanel.hidden = true; kick(); };
    } else labelPanel.hidden = true;
    kick();                                        // the page below moved: let the water windows re-measure
  }
  function initLabel() {
    if (!labelBtn || !labelPanel) return;
    renderLabel(state.product);
    labelBtn.addEventListener('click', function () { setLabel(labelBtn.getAttribute('aria-expanded') !== 'true', true); });
    doc.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-show-label]'); if (!a) return;
      var p = byId(a.getAttribute('data-show-label') || state.product.id);
      if (!p || !p.label) return;                  // otherwise it stays a plain link
      e.preventDefault();
      var open = function () {
        setLabel(true, false);
        labelBtn.focus({ preventScroll: true });
        labelBox.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      };
      if (state.product !== p) { setProduct(p.id); setTimeout(open, reduce ? 0 : 340); }   // after the card's copy swap
      else open();
    });
  }
  /* ───────────────────────── 8 · Amenities: flip cards (a disclosure: the hidden face is hidden from AT) ───────────────────────── */
  function initAmenities() {
    $$('.amenity').forEach(function (li) {
      var b = $('.amenity__turn', li), label = $('.amenity__turn-label', li), front = $('.amenity__front', li), back = $('.amenity__back', li);
      if (!b) return;
      var set = function (on) {
        li.classList.toggle('is-flipped', on);
        b.setAttribute('aria-expanded', on ? 'true' : 'false');
        if (label) label.textContent = on ? 'Turn back' : 'See details';
        if (front) front.setAttribute('aria-hidden', on ? 'true' : 'false');
        if (back) back.setAttribute('aria-hidden', on ? 'false' : 'true');
      };
      set(false);
      b.addEventListener('click', function () { set(!li.classList.contains('is-flipped')); });
    });
  }

  /* ───────────────────────── 9 · The Sun Index ─────────────────────────
     Your first month, told as one summer day: the sun rises on Day 1 and sets on Day 30, and the sky and sea
     warm as it goes. The arc stays quiet (its feet labelled Day 1 and Day 30, the third bag's days a warm
     band that lights with its card, the path behind the sun gilded); the card's pouches carry the count.
     STATIC by default (every stop listed with its pouches as they stand on its day: no JS, reduced motion,
     or a screen too short); PINNED (.is-pinned) when it fits: scrolling runs the month day by day at one
     steady pace (a short rest on each stop's day) and scrubs it both ways; the dots, a swipe on the card,
     or focus entering a stop jumps there. Every stop stays in the accessibility tree; the drawing is
     aria-hidden.                                                                                        */

  // Three striped pouches with ten pops in each, in the sun's engraved line (flat fills, one hairline).
  // set(day): pop k (1–30) lifts out of its bag on day k with a little pop and has gone by day k + 1; a bag
  // folds and fades once its last pop has left. Days between whole days are drawn in between, so scrolling
  // scrubs it both ways. Only the pops that change are touched.
  var pouchN = 0;
  function Pouches(svg) {
    var NS = 'http://www.w3.org/2000/svg', BW = 56, GAP = 30, PER = 10, SINK = [28, 42];
    // the bouquet, back row first: the order the pops leave in, and are drawn in (the front row overlaps)
    var SPOTS = [[28, -27], [15.5, -25], [40.5, -25], [6.5, -16.5], [49.5, -16.5], [19.5, -18], [36.5, -18], [12, -8], [44, -8], [28, -9]];
    var BODY = 'M4.5 0H51.5C52.6 13 56 28 56 48Q56 62.5 46 64.6Q28 66.6 10 64.6Q0 62.5 0 48C0 28 3.4 13 4.5 0Z';
    var clipId = 'bagclip' + (++pouchN), pops = [], bags = [];
    function el(n, a, parent) { var e = doc.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); parent.appendChild(e); return e; }
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('viewBox', '-6 -54 240 124');
    el('path', { d: BODY }, el('clipPath', { id: clipId }, el('defs', {}, svg)));
    for (var b = 0; b < 3; b++) {
      var gb = el('g', { transform: 'translate(' + b * (BW + GAP) + ' 0)' }, svg);
      el('ellipse', { class: 'bag__shadow', cx: 28, cy: 66, rx: 30, ry: 3.2 }, gb);
      var mouth = el('path', { class: 'bag__mouth', d: 'M4.5 0Q28 -7 51.5 0Z' }, gb);
      for (var i = 0; i < PER; i++) {
        var s = SPOTS[i], dx = s[0] - SINK[0], dy = s[1] - SINK[1], l = Math.hypot(dx, dy);
        var gp = el('g', {}, gb);
        el('line', { class: 'pop__stick-o', x1: 0, y1: 2, x2: 0, y2: 36 }, gp);
        el('line', { class: 'pop__stick', x1: 0, y1: 2, x2: 0, y2: 36 }, gp);
        el('circle', { class: 'pop__head', r: 5.2 }, gp);
        el('path', { class: 'pop__shine', d: 'M-3.2 -1A3.4 3.4 0 0 1 -1 -3.2' }, gp);
        pops.push({ g: gp, x: s[0], y: s[1], dx: dx / l, dy: dy / l, rot: (Math.atan2(dx, -dy) * 180 / Math.PI).toFixed(1), key: '' });
      }
      var front = el('g', {}, gb);
      el('path', { class: 'bag__body', d: BODY }, front);
      // the new pouch's two pinks: a deeper pink above, a soft pink wave across the lower part
      el('path', { class: 'bag__wave', d: 'M-2 41C8 34 17 36 27 40S45 45 58 37V70H-2Z', 'clip-path': 'url(#' + clipId + ')' }, front);
      el('line', { class: 'bag__zip', x1: 3.2, y1: 14, x2: 52.8, y2: 14 }, front);
      el('circle', { class: 'bag__mark-r', cx: 28, cy: 27, r: 6.4 }, front);   // the parasol mark, seen from above
      el('circle', { class: 'bag__mark', cx: 28, cy: 27, r: 3.4, 'stroke-dasharray': (Math.PI * 6.8 / 16).toFixed(3) }, front);
      el('circle', { class: 'bag__mark-c', cx: 28, cy: 27, r: 1.3 }, front);
      el('path', { class: 'bag__line', d: BODY }, front);
      bags.push({ g: gb, mouth: mouth, key: '' });
    }
    function ease(t) { return t * t * (3 - 2 * t); }
    function pop(t) { t -= 1; return 1 + 2.6 * t * t * t + 1.6 * t * t; }   // out, with a little overshoot
    return {
      set: function (day) {
        for (var k = 0; k < pops.length; k++) {
          var p = pops[k], t = day - k, lift = 0, sc = 1, op = 1;
          if (t >= 2) op = 0;
          else if (t > 1) { var u = t - 1; lift = 17 + 12 * u * u; sc = 1.2 - 0.3 * u; op = 1 - ease(u); }   // eaten: up and away
          else if (t > 0) { lift = 17 * pop(t); sc = 1 + 0.2 * ease(t); }                                     // today's: out of the bag
          var key = op < 0.002 ? 'x' : lift.toFixed(2) + '/' + sc.toFixed(3) + '/' + op.toFixed(3);
          if (key === p.key) continue;
          p.key = key;
          if (key === 'x') { p.g.setAttribute('visibility', 'hidden'); continue; }
          p.g.removeAttribute('visibility');
          p.g.setAttribute('transform', 'translate(' + (p.x + p.dx * lift).toFixed(2) + ' ' + (p.y + p.dy * lift).toFixed(2) + ') rotate(' + p.rot + ') scale(' + sc.toFixed(3) + ')');
          if (op < 1) p.g.setAttribute('opacity', op.toFixed(3)); else p.g.removeAttribute('opacity');
        }
        for (var b = 0; b < bags.length; b++) {
          var e = clamp(day - (b + 1) * PER, 0, 1), kb = e.toFixed(3), bg = bags[b];
          if (kb === bg.key) continue;
          bg.key = kb;
          bg.mouth.setAttribute('d', 'M4.5 0Q28 ' + (-7 + 5.8 * e).toFixed(2) + ' 51.5 0Z');
          if (e > 0) bg.g.setAttribute('opacity', (1 - 0.4 * e).toFixed(3)); else bg.g.removeAttribute('opacity');
        }
      }
    };
  }

  var Sun = (function () {
    var sec = $('#sun-index'), stage = $('.sunindex__stage'), svg = $('#sunArc'), marks = $('#sunMarks'), sunEl = $('#sun');
    var head = $('.sunindex__head'), sheet = $('#sunSheet'), stopsEl = $('#sunStops'), status = $('#sunStatus'), dialEl = $('.sunindex__dial');
    if (!sec || !stage || !svg || !marks || !sunEl || !head || !sheet || !stopsEl || !dialEl) return null;
    var stops = $$('.stop', stopsEl), dial = $$('button', dialEl), N = stops.length;
    var NS = 'http://www.w3.org/2000/svg', DAYS = 30, LAST = DAYS + 1;   // LAST: the morning after Day 30, the month's last pop gone
    var TH0 = Math.PI * 0.955, TH1 = Math.PI * 0.045;      // Day 1 (sunrise, left) → Day 30 (golden hour, right)
    var ANCHOR = stops.map(function (s) { return +s.getAttribute('data-day') || 1; });   // the day each stop's sun rests on: 1, 5, 10, 30
    // the pouches' day at each rest: the last runs on to the morning after, so the month ends on three empty bags
    var REST = ANCHOR.map(function (d, j) { return j === N - 1 ? LAST : d; });
    var WINDOW = [21, 30];        // the third bag: pops 21 to 30, the month's golden hour
    // the card turns over halfway between two rests, and to the last stop as the sun reaches its band (which lights then)
    var SWITCH = ANCHOR.slice(1).map(function (d, j) { return j === N - 2 ? WINDOW[0] : (ANCHOR[j] + d) / 2; });
    var STILL = (1 + DAYS) / 2;   // static: the sun stands at noon over the whole month
    var g = { W: 0, H: 0, cx: 0, hz: 0, rx: 0, ry: 0, disc: 30, ray: 62, small: false, xMin: 8, xMax: 0, top: 0 };
    var pinned = false, active = -1, sp = 0, day = REST[0], rect = null, stageRect = null, visible = false, jump = null;
    var labels = [], prog = null, band = null, lit = null, lastKey = '', lastWarm = -1, lastDay = -1, drawn = false;
    var bagsEl = $('#sunPouches'), bags = bagsEl ? Pouches(bagsEl) : null, snaps = false;

    // The scroll, day by day: the dawn (the sun lifts off the horizon to Day 1 as the first pop comes out), a
    // short rest on each stop's day, and one steady pace between them, so every day takes the same scroll and
    // every bag empties at the same rate (a quick ramp at each end softens the starts and stops).
    var T_DAWN = 0.06, T_REST = 0.065, T_END = 0.08, T_RAMP = 0.016;
    var legs = [], restMid = [];
    (function () {
      var at = 0, k = (1 - T_DAWN - (N - 1) * (T_REST + T_RAMP) - T_END) / (REST[N - 1] - REST[0]);   // scroll per day
      function leg(len, d0, d1, kind) { legs.push({ a: at, len: len, d0: d0, d1: d1, kind: kind }); at += len; }
      leg(T_DAWN, 0, REST[0], 'dawn');
      for (var j = 0; j < N; j++) {
        var rl = j === N - 1 ? T_END : T_REST;
        restMid.push(at + rl / 2);
        leg(rl, REST[j], REST[j], 'rest');
        if (j < N - 1) leg((REST[j + 1] - REST[j]) * k + T_RAMP, REST[j], REST[j + 1], 'go');
      }
    })();

    // engraved rays: fine, alternating long and short
    var rays = $('#sunRays');
    if (rays) {
      var s = '';
      for (var i = 0; i < 32; i++) {
        var a = i / 32 * Math.PI * 2, r1 = 42, r2 = i % 2 ? 58 : 74;
        s += '<line x1="' + (100 + Math.cos(a) * r1).toFixed(1) + '" y1="' + (100 + Math.sin(a) * r1).toFixed(1) + '" x2="' + (100 + Math.cos(a) * r2).toFixed(1) + '" y2="' + (100 + Math.sin(a) * r2).toFixed(1) + '"/>';
      }
      rays.innerHTML = s;
    }

    function el(name, attrs, text) { var e = doc.createElementNS(NS, name); for (var k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; }
    function f1(v) { return Math.round(v * 10) / 10; }
    function thetaOf(d) { return lerp(TH0, TH1, (d - 1) / (DAYS - 1)); }
    function pt(th) { return [g.cx + Math.cos(th) * g.rx, g.hz - Math.sin(th) * g.ry]; }
    function normal(th) { var nx = Math.cos(th) / g.rx, ny = -Math.sin(th) / g.ry, l = Math.hypot(nx, ny) || 1; return [nx / l, ny / l]; }   // outward
    function arcPath(t0, t1) { var a = pt(t0), b = pt(t1); return 'M' + f1(a[0]) + ' ' + f1(a[1]) + 'A' + f1(g.rx) + ' ' + f1(g.ry) + ' 0 0 1 ' + f1(b[0]) + ' ' + f1(b[1]); }

    // The pouches' day at scroll progress v (0–1 through the pin), from the legs above.
    function dayAt(v) {
      for (var j = 0; j < legs.length; j++) {
        var L = legs[j], len = L.len, D = L.d1 - L.d0;
        if (v > L.a + len && j < legs.length - 1) continue;
        var u = clamp(v - L.a, 0, len);
        if (!D) return L.d0;
        if (L.kind === 'dawn') { var f = u / len; return L.d0 + D * f * f * (3 - 2 * f); }
        var w = Math.min(T_RAMP, len / 2), vmax = D / (len - w);              // full pace: the same on every leg
        if (u < w) return L.d0 + vmax * u * u / (2 * w);
        if (u > len - w) return L.d1 - vmax * (len - u) * (len - u) / (2 * w);
        return L.d0 + vmax * (u - w / 2);
      }
      return REST[N - 1];
    }
    // the sun's day: the pouches' own until the last leg, which it spreads over the run to the morning after,
    // so the sun reaches Day 30 just as the month's last pop leaves (and never stops short)
    function sunDay(d) {
      var a = ANCHOR[N - 2];
      return d <= a ? d : a + (d - a) * (DAYS - a) / (LAST - a);
    }
    function stopAt(d) { var i = 0; while (i < SWITCH.length && d >= SWITCH[i]) i++; return i; }

    // ── layout: pin when it fits, else list; then place the horizon, the arc and its two labels
    function setPinned(on) { pinned = on; sec.classList.toggle('is-pinned', on); }
    function measure() {
      // the card as CSS lays it out (above the dots, at its tallest stop): its top is where it will stay
      sheet.style.top = sheet.style.bottom = stopsEl.style.height = '';
      g.W = stage.clientWidth; g.H = stage.clientHeight;
      g.small = g.W < 768; g.disc = g.small ? 22 : 30; g.ray = g.small ? 46 : 62;   // the disc's radius; the long rays' reach
      var headBottom = head.offsetTop + head.offsetHeight, land = g.W > g.H;
      var lift = g.ray + (g.small ? 10 : 16);          // the sun at noon: its rays stay this far below the title
      g.top = headBottom + 4;
      g.cx = g.W / 2; g.xMax = g.W - 8;
      // centred and never edge to edge: capped on wide screens, with room outside the feet for their labels
      g.rx = Math.max(80, Math.min(g.small ? g.W * 0.4 : 480, g.cx - g.xMin - (g.small ? 30 : 96)));
      // as tall as the sky allows: a gentle dome on landscape screens, a tall one on portrait ones
      var kY = land ? 0.8 : 1.3;
      if (pinned) {
        // a strip of sea above the card (the card is as tall as its tallest stop, so the horizon never moves);
        // where the card reaches under a foot, wide enough that the sun's lowest rays clear it standing there
        var strip = clamp((g.H - 640) * 0.25, 18, 48), cardTop = sheet.offsetTop, cardL = sheet.offsetLeft;
        var under = g.cx + Math.cos(TH0) * g.rx + g.ray + 4 > cardL;
        for (var it = 0; it < 4; it++) {
          g.hz = Math.min(g.H * 0.64, cardTop - strip);
          g.ry = Math.min(g.hz - headBottom - lift, g.rx * kY);
          var need = g.ray + 6 - Math.sin(TH0) * g.ry;
          if (!under || strip >= need - 0.5) break;
          strip = need;
        }
      } else {
        g.hz = sheet.offsetTop - (g.small ? 26 : 34);     // static: the day sits on the list
        g.ry = Math.min(g.hz - headBottom - lift, g.rx * kY);
      }
      return g.ry >= (g.small ? 84 : land ? 90 : 110);   // landscape screens may take a flatter day
    }
    function layout() {
      setPinned(!reduce);
      if (!measure() && pinned) { setPinned(false); measure(); }
      if (!pinned) { day = STILL; snapshots(); }
      else { sheet.style.top = sheet.offsetTop + 'px'; sheet.style.bottom = 'auto'; }   // pinned: the card hangs from its top
      stage.__hzPx = g.hz;
      stage.style.setProperty('--hz', f1(g.hz) + 'px');
      draw();
      fitSheet(true);
    }
    // static: every stop shows its own pouches, as they stand on its day (drawn once)
    function snapshots() {
      if (snaps) return;
      snaps = true;
      stops.forEach(function (st, j) { var v = $('.stop__pouches', st); if (v) Pouches(v).set(REST[j]); });
    }
    // pinned, the card hugs the stop showing: its top (and the pouches) stay put, its foot eases (the last
    // stop's link makes it taller); the horizon was set for the tallest
    function fitSheet(now) {
      if (!pinned || active < 0) { stopsEl.style.height = ''; return; }
      if (now) stopsEl.style.transition = 'none';
      stopsEl.style.height = stops[active].offsetHeight + 'px';
      if (now) { void stopsEl.offsetHeight; stopsEl.style.transition = ''; }
    }

    // The feet's labels, as a mirrored pair: the first spot where both fit on screen, between the title and the
    // horizon, at the feet if they can (outside the arc, else inside), past the reach of the rays, so the sun
    // never strikes through them standing there.
    function hits(a, b, m) { return a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m; }
    function label(d, text, side) {
      var th = thetaOf(d), c = pt(th), n = normal(th), gap = g.ray + 6, nx = n[0] * side, ny = n[1] * side;
      var t = el('text', { 'text-anchor': 'middle' }, text);
      marks.appendChild(t);
      var bb = t.getBBox(), ext = Math.abs(nx) * bb.width / 2 + Math.abs(ny) * bb.height / 2;
      var dx = c[0] + nx * (gap + ext) - (bb.x + bb.width / 2), dy = c[1] + ny * (gap + ext) - (bb.y + bb.height / 2);
      t.setAttribute('transform', 'translate(' + f1(dx) + ' ' + f1(dy) + ')');
      var box = { x: bb.x + dx, y: bb.y + dy, w: bb.width, h: bb.height };
      var ok = box.x >= g.xMin && box.x + box.w <= g.xMax && box.y >= g.top && box.y + box.h <= g.hz + 1;
      return { el: t, b: box, on: true, ok: ok };
    }
    function placeFeet() {
      for (var q = 0; q < 3; q++) {
        for (var side = 1; side >= -1; side -= 2) {
          var a = label(1 + q, 'Day 1', side), b = label(DAYS - q, 'Day 30', side);
          if (a.ok && b.ok && !hits(a.b, b.b, 6)) { labels.push(a, b); return true; }
          marks.removeChild(a.el); marks.removeChild(b.el);
        }
      }
      return false;      // no room on this screen: the card and the dots still say it
    }
    function draw() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      while (marks.firstChild) marks.removeChild(marks.firstChild);
      var vb = '0 0 ' + g.W + ' ' + g.H;
      svg.setAttribute('viewBox', vb); marks.setAttribute('viewBox', vb);
      // the third bag's band: a warm glow along those days, faded at both ends
      var w0 = pt(thetaOf(WINDOW[0])), w1 = pt(thetaOf(WINDOW[1])), wd = arcPath(thetaOf(WINDOW[0]), thetaOf(WINDOW[1]));
      var grad = el('linearGradient', { id: 'sunBand', gradientUnits: 'userSpaceOnUse', x1: f1(w0[0] - 6), y1: 0, x2: f1(w1[0] + 6), y2: 0 });
      [[0, 0], [0.2, 1], [0.8, 1], [1, 0]].forEach(function (s) { grad.appendChild(el('stop', { offset: s[0], 'stop-color': '#FFA347', 'stop-opacity': s[1] })); });
      svg.appendChild(el('defs', {})).appendChild(grad);
      band = el('g', { class: 'window' });
      band.appendChild(el('path', { d: wd, class: 'glow', stroke: 'url(#sunBand)' }));
      band.appendChild(el('path', { d: wd, class: 'core', stroke: 'url(#sunBand)' }));
      svg.appendChild(band);
      svg.appendChild(el('path', { d: arcPath(Math.PI, 0), class: 'arc' }));    // the day's path, dotted, over the band
      prog = el('path', { d: 'M0 0', class: 'done' });                           // pinned only: static, no day has passed
      svg.appendChild(prog);
      labels = [];
      placeFeet();
      drawn = true; lastKey = ''; lastWarm = -1; lastDay = -1; lit = null;
      sec.classList.add('is-drawn');
      stageRect = stage.getBoundingClientRect();
      write(true);
    }

    function setActive(i, announce) {
      if (i !== active) {
        active = i;
        stops.forEach(function (st, j) { st.classList.toggle('is-active', j === i); });
        stage.setAttribute('data-stop', i);
        dial.forEach(function (b, j) { if (j === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
        if (drawn) fitSheet(false);
      }
      if (announce && status) {
        var st = stops[i], w = $('.stop__when', st), h = $('h3', st);
        status.textContent = (w ? w.textContent.trim() : '') + ': ' + (h ? h.textContent : '') + '.';   // "Bag by bag: A bag lasts about ten days."
      }
    }
    function read() {
      rect = sec.getBoundingClientRect(); stageRect = stage.getBoundingClientRect();
      visible = rect.bottom > -10 && rect.top < innerHeight + 10;
      if (pinned && visible) {
        var total = rect.height - innerHeight;
        sp = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
        day = dayAt(sp);
      }
    }
    function write(force) {
      if (!drawn || (!visible && !force)) return;
      var sd = pinned ? sunDay(day) : STILL, th = thetaOf(sd), c = pt(th), key = f1(c[0]) + ',' + f1(c[1]);
      if (key !== lastKey) {
        lastKey = key;
        sunEl.style.transform = 'translate3d(' + f1(c[0]) + 'px,' + f1(c[1]) + 'px,0)';
        prog.setAttribute('d', pinned && sd > 1.01 ? arcPath(TH0, th) : 'M0 0');
        // a label steps aside only if the disc itself would cover it (placed past the rays, it never should)
        labels.forEach(function (l) {
          var b = l.b, qx = clamp(c[0], b.x, b.x + b.w), qy = clamp(c[1], b.y, b.y + b.h);
          var on = Math.hypot(qx - c[0], qy - c[1]) > g.disc + 3;
          if (on !== l.on) { l.on = on; l.el.style.opacity = on ? '' : '0'; }
        });
      }
      if (day !== lastDay) { lastDay = day; if (bags && pinned) bags.set(day); }
      if (pinned) {
        // a jump (a dot, a key, a swipe) shows its stop at once, not every card it scrolls past on the way
        var i = stopAt(day);
        if (jump) { if (i === jump.to || performance.now() > jump.until) jump = null; else i = jump.to; }
        setActive(i, false);
      }
      var on = !pinned || active === N - 1;            // the band lights with its card (static: always)
      if (on !== lit) { lit = on; band.classList.toggle('is-lit', on); }
      var warm = clamp((sd - 1) / (DAYS - 1) * 1.04 - 0.02, 0, 1);
      if (Math.abs(warm - lastWarm) > 0.0005) { lastWarm = warm; sunEl.style.setProperty('--warm', warm.toFixed(3)); }
      if (Water && stageRect) { Water.sun = [stageRect.left + c[0], stageRect.top + c[1]]; Water.warm = warm; }
    }

    // ── jumping to a stop (pinned): scroll to the middle of its rest, where the sun stands on its day
    function restY(i) { var sr = sec.getBoundingClientRect(); return Math.round(window.scrollY + sr.top + (sr.height - innerHeight) * restMid[i]); }
    function goTo(i, instant) {
      i = clamp(i, 0, N - 1);
      setActive(i, true);
      if (!pinned) {                                   // static: every stop is showing; bring this one into view
        var r = stops[i].getBoundingClientRect();
        if (r.top < 0 || r.bottom > innerHeight) stops[i].scrollIntoView({ block: 'nearest', behavior: reduce || instant ? 'instant' : 'smooth' });
        return;
      }
      jump = instant ? null : { to: i, until: performance.now() + 1500 };
      window.scrollTo({ top: restY(i), behavior: instant ? 'instant' : 'smooth' });
    }
    // the reader takes over (wheel, touch, scrolling keys): the card follows the scroll again
    window.addEventListener('wheel', function () { jump = null; }, { passive: true });
    window.addEventListener('touchmove', function () { jump = null; }, { passive: true });
    window.addEventListener('keydown', function (e) { if (!dialEl.contains(e.target)) jump = null; });
    dial.forEach(function (b, j) { b.addEventListener('click', function () { goTo(j, false); }); });
    dialEl.addEventListener('keydown', function (e) {
      var i = dial.indexOf(doc.activeElement); if (i < 0) return;
      var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? N - 1 : null;
      if (n === null) return;
      e.preventDefault();
      n = clamp(n, 0, N - 1);
      if (n !== i) { dial[n].focus(); goTo(n, false); }
    });
    // keyboard focus landing in a stop that isn't showing (its link) brings that stop up first
    stopsEl.addEventListener('focusin', function (e) {
      if (!pinned) return;
      var li = e.target.closest && e.target.closest('.stop'), i = stops.indexOf(li);
      if (i >= 0 && i !== active) goTo(i, true);
    });
    // touch: swipe the card sideways for the next or previous stop
    var sw = null;
    sheet.addEventListener('touchstart', function (e) { sw = pinned && e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true });
    sheet.addEventListener('touchend', function (e) {
      if (!sw || !e.changedTouches.length) return;
      var dx = e.changedTouches[0].clientX - sw.x, dy = e.changedTouches[0].clientY - sw.y; sw = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(active + (dx < 0 ? 1 : -1), false);
    }, { passive: true });
    // the last stop's next step opens the menu with The Month chosen (the link works without this, too; its
    // data-shop has already put Collagen Boost on the menu card: module 10 hears the click first)
    $$('[data-pick-plan], [data-pick-bundle]', stopsEl).forEach(function (a) {
      a.addEventListener('click', function () {
        var form = $('#orderForm'); if (!form) return;
        var plan = a.getAttribute('data-pick-plan'), bundle = a.getAttribute('data-pick-bundle');
        var inp = $(plan ? 'input[name="plan"][value="' + plan + '"]' : 'input[name="bundle"][value="' + bundle + '"]', form);
        if (inp && !inp.checked) { inp.checked = true; inp.dispatchEvent(new Event('change', { bubbles: true })); }
      });
    });

    var queued = false;
    function relayout() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; layout(); kick(); }); }
    setActive(0, false);
    layout();
    window.addEventListener('resize', relayout, { passive: true });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(relayout);
    if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(head);   // a product note appears or goes
    return {
      read: read, write: function () { write(false); }, layout: relayout, goTo: goTo,
      get visible() { return visible; },
      // QA: the geometry and the state; where each stop rests (scroll progress) and the day at any progress
      state: function () { return { pinned: pinned, active: active, day: +day.toFixed(2), sunDay: +(pinned ? sunDay(day) : STILL).toFixed(2), sp: +sp.toFixed(3), hz: Math.round(g.hz), cx: Math.round(g.cx), rx: Math.round(g.rx), ry: Math.round(g.ry), top: Math.round(g.top), lit: lit, labels: labels.map(function (l) { return { t: l.el.textContent, on: l.on, b: [l.b.x, l.b.y, l.b.w, l.b.h].map(Math.round) }; }) }; },
      rests: function () { return restMid.slice(); },
      dayAt: dayAt
    };
  })();

  /* ───────────────────────── 10 · Shop menu + waitlist (prototype: no network) ─────────────────────────
     The menu card serves one available product at a time, each with its own signatures (BUNDLES) and sub line,
     and the menu takes its colours (the card's awning rolls to its stripes, the accents cross-fade; the waitlist
     card keeps Collagen Boost's). With two or more on the menu, a small switch at the top of the card picks
     which: a radio group (Tab reaches the chosen one, the arrow keys move and choose). The card also follows the
     cabanas (an available product chosen there goes on the menu), a link that names a product ([data-shop="<id>"]:
     the finale's, the footer's, the FAQ's, the Sun Index's) and the chosen product's own shop links (the hero's,
     the card's, the shop bar's). The waitlist lists every product still to open.                           */
  var shop = { form: $('#orderForm'), sec: $('#menu'), product: null, timer: 0, update: function () {} };
  function forSale() { return PRODUCTS.filter(function (p) { return p.status === 'available' && BUNDLES[p.id]; }); }
  // the switch (two or more products on the menu): one radio per product, with its swatch
  function renderPick() {
    var pick = $('#menuPick'), list = forSale();
    if (!pick) return;
    pick.hidden = list.length < 2;
    pick.innerHTML = list.length < 2 ? '' : '<legend class="sr-only">Choose your pop</legend>' + list.map(function (p) {
      return '<label class="pick" style="--dot:' + p.candy.color + '"><input type="radio" name="product" value="' + p.id + '"' + (p === shop.product ? ' checked' : '') + '>' +
        '<span class="pick__box"><span class="pick__dot" aria-hidden="true"></span><span class="pick__name">' + p.name + '</span></span></label>';
    }).join('');
  }
  // the chosen product's signatures and sub line (keep: the signature to keep chosen, if this product has it)
  function renderMenu(keep) {
    var p = shop.product, B = BUNDLES[p.id], on = B.filter(function (b) { return b.id === keep; })[0] || B[0];
    var list = $('#bundleList');
    if (list) list.innerHTML = '<legend class="sr-only">Choose a bundle</legend>' + B.map(function (b) {
      return '<label class="item"><input type="radio" name="bundle" value="' + b.id + '"' + (b === on ? ' checked' : '') + '>' +
        '<span class="item__row"><span class="item__name">' + b.name + '</span><span class="item__dots" aria-hidden="true"></span>' +
        '<span class="item__price">$' + PH('XX') + '</span></span><span class="item__desc">' + b.desc + '</span></label>';
    }).join('');
    // "Collagen Boost · Strawberry · 10 pops per bag", "Green Veggies · 60 pops per bag · 30 servings" (no flavor: unknown)
    var sub = $('#menuSub');
    if (sub) sub.innerHTML = [p.name, p.flavor].concat([p.bag, p.servings].map(function (s) { return s && '<span class="nw">' + s + '</span>'; })).filter(Boolean).join(' · ');
  }
  // the menu in the colours of the product on its card (its tokens, as module 4 sets them on <html>; #menu is
  // pinned to Collagen Boost without JS, and its waitlist stays pinned): the new stripes roll down the card's
  // awning (roll), or simply are there
  function paintMenu(p, roll) {
    var sec = shop.sec || shop.form, s = sec.style;
    TOKENS.forEach(function (t) { s.setProperty(t[1], tok(p, t[0])); });
    s.setProperty('--stripe-next', tok(p, 'stripe'));
    clearTimeout(shop.timer);
    var done = function () { s.setProperty('--stripe', tok(p, 'stripe')); sec.classList.remove('is-rolling'); };
    if (!roll || reduce) { done(); return; }
    sec.classList.remove('is-rolling'); void sec.offsetWidth; sec.classList.add('is-rolling');
    shop.timer = setTimeout(done, 580);
  }
  // put a product on the menu card (one for sale; anything else leaves the card as it is)
  function setMenuProduct(id, roll) {
    var p = byId(id);
    if (!p || p === shop.product || !shop.product || forSale().indexOf(p) < 0) return;
    var b = $('input[name="bundle"]:checked', shop.form);
    shop.product = p;
    var r = $('#menuPick input[value="' + p.id + '"]'); if (r) r.checked = true;
    renderMenu(b && b.value);
    paintMenu(p, roll);
    shop.update();
    kick();                                        // the card's height may have changed: the water windows re-measure
  }
  // the waitlist: every product still to open, each with its swatch. Two or more make a choice (all ticked to
  // start with); one is simply named (no lone checkbox to untick)
  function renderWaitlist() {
    var opts = $('#waitlistOpts'); if (!opts) return;
    var soon = PRODUCTS.filter(function (p) { return p.status !== 'available'; }), one = soon.length === 1;
    opts.innerHTML = '<legend class="sr-only">Tell me about</legend>' + soon.map(function (p) {
      var inner = '<span class="wl-opt__thumb" aria-hidden="true" style="--dot:' + p.candy.color + '"' + (p.still ? ' data-still="' + p.still + '" data-still-alt=""' : '') + '></span>' +
        '<span class="wl-opt__text"><b>' + p.name + '</b> ' + p.waitlist + '</span>';
      return one ? '<p class="wl-opt" data-id="' + p.id + '">' + inner + '</p>'
        : '<label class="wl-opt" data-id="' + p.id + '"><input type="checkbox" name="' + p.id + '" checked>' + inner + '</label>';
    }).join('');
  }
  function preselectWaitlist(id) { var box = $('#waitlistOpts input[name="' + id + '"]'); if (box) box.checked = true; }
  // a "join the list" link for one product ([data-waitlist="<id>"]) ticks that product on the way there
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-waitlist]'); if (a) preselectWaitlist(a.getAttribute('data-waitlist'));
  });
  // a link to the menu that names a product ([data-shop]), or the chosen product's own shop link (data-bind-href),
  // puts that product on the card on the way there. Heard first (capture), so a link's own handler (the Sun
  // Index's [data-pick-bundle]) then finds that product's signatures.
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="#menu"]'); if (!a) return;
    var id = a.getAttribute('data-shop') || (a.hasAttribute('data-bind-href') ? state.product.id : '');
    if (id) setMenuProduct(id, false);
  }, true);
  function initShop() {
    renderWaitlist();
    var form = shop.form, menu = forSale();
    if (form && menu.length) {
      shop.product = menu.indexOf(state.product) >= 0 ? state.product : menu[0];   // the cabanas' choice, if it is on the menu
      renderPick();
      renderMenu(null);
      paintMenu(shop.product, false);
      var sum = $('#orderSummary'), msg = $('.formmsg', form);
      shop.update = function () {
        var b = $('input[name="bundle"]:checked', form), pl = $('input[name="plan"]:checked', form);
        var bn = b ? $('.item__name', b.closest('.item')).textContent : BUNDLES[shop.product.id][0].name;
        if (sum) sum.innerHTML = shop.product.name + ' · ' + bn + ', ' + (pl && pl.value === 'sub' ? 'subscribe &amp; save' : 'one<span class="hy">-</span>time order');
        if (msg) msg.textContent = '';
      };
      form.addEventListener('change', function (e) {
        if (e.target.name === 'product') setMenuProduct(e.target.value, true);
        else shop.update();
      });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (msg) msg.textContent = 'Prototype: checkout isn’t connected yet, so nothing was added. Prices and terms are still to come.';
      });
      shop.update();
    }
    var wl = $('#waitlist');
    if (wl) {
      var wmsg = $('.formmsg', wl), email = $('input[type="email"]', wl);
      var say = function (text, err) { wmsg.textContent = text; wmsg.classList.toggle('is-error', !!err); };
      email.addEventListener('input', function () { if (email.getAttribute('aria-invalid') === 'true') { email.removeAttribute('aria-invalid'); say('', false); } });
      wl.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = email.value.trim();
        if (!v) { email.setAttribute('aria-invalid', 'true'); say(SCOPY.waitlistEmpty || 'Please add your email address so we can save your spot.', true); email.focus(); return; }
        if (!email.checkValidity() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { email.setAttribute('aria-invalid', 'true'); say('That email address doesn’t look quite right. Please check it and try again.', true); email.focus(); return; }
        email.removeAttribute('aria-invalid');
        var boxes = $$('#waitlistOpts input');       // (a choice only when two or more cabanas are still to open)
        if (boxes.length && !boxes.some(function (b) { return b.checked; })) { say('Choose at least one cabana to hear about.', true); boxes[0].focus(); return; }
        say('You’re on the (pretend) list. This is a prototype, so nothing was sent anywhere.', false);
      });
    }
  }

  /* ───────────────────────── 11 · FAQ accordion ───────────────────────── */
  function initFaq() {
    $$('.faq__q').forEach(function (q) {
      var a = doc.getElementById(q.getAttribute('aria-controls'));
      if (!a) return;
      a.hidden = true;
      q.addEventListener('click', function () {
        var open = q.getAttribute('aria-expanded') !== 'true';
        q.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) {
          a.hidden = false;
          if (!reduce && a.animate) a.animate([{ height: '0px', opacity: 0 }, { height: a.scrollHeight + 'px', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
        } else if (!reduce && a.animate) {
          var an = a.animate([{ height: a.scrollHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 300, easing: 'cubic-bezier(.65,0,.35,1)' });
          an.onfinish = function () { if (q.getAttribute('aria-expanded') !== 'true') a.hidden = true; };
        } else a.hidden = true;
      });
    });
  }

  /* ───────────────────────── 12 · Nav + mobile menu (the page behind it is inert) ───────────────────────── */
  function initNav() {
    var nav = $('#nav'), toggle = $('.nav__toggle'), panel = $('#menu-panel');
    var label = toggle ? $('.sr-only', toggle) : null;
    var behind = ['.skip', '#main', '.foot', '.shopbar', '.archive-btn', '.announce'];
    function setInert(on) { behind.forEach(function (s) { var e = $(s); if (!e) return; if (on) e.setAttribute('inert', ''); else e.removeAttribute('inert'); }); }
    function close(focusBack) {
      if (!panel || panel.hidden) return;
      panel.hidden = true; panel.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false'); if (label) label.textContent = 'Open menu';
      html.classList.remove('menu-open'); setInert(false);
      if (focusBack) toggle.focus();
    }
    function open() {
      panel.style.setProperty('--nav-bottom', Math.round(nav.getBoundingClientRect().bottom) + 'px');
      panel.hidden = false; void panel.offsetWidth; panel.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true'); if (label) label.textContent = 'Close menu';
      html.classList.add('menu-open'); setInert(true);
      var first = $('a', panel); if (first) first.focus();
    }
    if (toggle && panel) {
      toggle.addEventListener('click', function () { panel.hidden ? open() : close(false); });
      panel.addEventListener('click', function (e) { if (e.target.closest('a')) close(false); });
      doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(true); });
      window.addEventListener('resize', function () { if (innerWidth >= 1024) close(false); }, { passive: true });
    }
    // highlight the section in view
    var links = $$('.nav__links a');
    if ('IntersectionObserver' in window && links.length) {
      var map = {};
      links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var a = map[en.target.id]; if (!a) return;
          if (en.isIntersecting) { links.forEach(function (l) { l.removeAttribute('aria-current'); }); a.setAttribute('aria-current', 'true'); }
          else a.removeAttribute('aria-current');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      Object.keys(map).forEach(function (id) { var s = doc.getElementById(id); if (s) io.observe(s); });
    }
  }

  /* ───────────────────────── 13 · Reveal, parallax, shop bar ───────────────────────── */
  function initReveal() {
    var els = $$('[data-reveal]');
    if (!html.classList.contains('motion') || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      var batch = entries.filter(function (en) { return en.isIntersecting; });
      batch.forEach(function (en, i) { en.target.style.setProperty('--rd', (i * 0.07).toFixed(2) + 's'); en.target.classList.add('is-in'); io.unobserve(en.target); });
    }, { rootMargin: '0px 0px -9% 0px', threshold: 0 });
    els.forEach(function (e) { io.observe(e); });
  }
  var parallax = $$('.parallax').map(function (img) { return { img: img, frame: img.parentElement, r: null }; });
  function parallaxRead() { parallax.forEach(function (p) { p.r = p.frame.getBoundingClientRect(); }); }
  function parallaxWrite() {
    if (reduce) return;
    var vh = innerHeight;
    parallax.forEach(function (p) {
      var r = p.r; if (!r || r.bottom < 0 || r.top > vh) return;
      var k = clamp(((r.top + r.height / 2) - vh / 2) / vh, -1, 1);   // -1 … 1 across the viewport
      p.img.style.transform = 'translate3d(0,' + (k * -6.5).toFixed(2) + '%,0)';
    });
  }
  var shopbar = $('#shopbar'), menuSec = $('#menu'), footEl = $('.foot'), sunSec = $('#sun-index');
  var barState = { show: false, heroB: 0, menuT: 0, menuB: 0, footT: 0, inSun: false };
  function barRead() {
    if (!shopbar) return;
    barState.heroB = hero ? hero.getBoundingClientRect().bottom : 0;
    var mr = menuSec ? menuSec.getBoundingClientRect() : null;
    barState.menuT = mr ? mr.top : 1e9; barState.menuB = mr ? mr.bottom : -1e9;
    barState.footT = footEl ? footEl.getBoundingClientRect().top : 1e9;
    var sr = sunSec ? sunSec.getBoundingClientRect() : null;
    barState.inSun = !!sr && sr.top < innerHeight * 0.5 && sr.bottom > innerHeight * 0.5;
  }
  function barWrite() {
    if (!shopbar) return;
    var vh = innerHeight;
    var inMenu = barState.menuT < vh * 0.9 && barState.menuB > vh * 0.1;
    var show = barState.heroB < 0 && !inMenu && !barState.inSun && barState.footT > vh && !html.classList.contains('menu-open');
    if (show !== barState.show) {
      barState.show = show; shopbar.classList.toggle('is-visible', show);
      var a = $('a', shopbar); if (a) a.tabIndex = show ? 0 : -1;
      if (Archive) Archive.check(!show);           // the archive pill gives way to the shop bar (and comes back after it)
    }
  }
  var navEl = $('#nav'), navScrolled = false;
  function navWrite(st) { var s = st.sy > 8; if (s !== navScrolled) { navScrolled = s; navEl.classList.toggle('is-scrolled', s); } }

  /* The archive button: a small fixed pill, bottom left, to the design archive. It never covers anything:
     whenever content (text, a control, a card, a picture, the shop bar) lies under it or within 8 px of it,
     it steps aside at once, and it comes back only once the page has settled somewhere it is free. Keyboard
     focus always shows it; with the mobile menu open it stays out of the way. Without JS it is a plain link
     under the footer (CSS).                                                                              */
  var Archive = (function () {
    var btn = $('.archive-btn');
    if (!btn || !doc.elementsFromPoint) return null;
    var CONTENT = 'p,h1,h2,h3,h4,li,dl,dt,dd,a,button,input,select,textarea,label,img,svg,canvas,table,figure,form,iframe,video,' +
      '.btn,.stop,.menucard,.waitlist,.amenity__card,.compare__card,.cabana-card__inner,.sugar__notes,.faq__item,' +
      '.awning,.shopbar,.sunindex__dial,.sunindex__sheet,.postcard,.labelcard,.alps-scene,.alps__visual,.alps__facts,.swiss-badge,.cabana,.proofs,.caption,.nav,.announce,.band,' +
      '.rider-dock.is-held';   // (the dock the riding pop rests in: site/rider.js; the pop itself lets clicks through)
    var STOP = 'section,main,footer,header,body,html,.is-window';
    var hidden = false, timer = 0, queued = false;
    // where the pill rests: its box without its hide/show slide (a hidden pill sits 12 px lower, mid-transition anywhere)
    function rest() {
      var r = btn.getBoundingClientRect(), dx = 0, dy = 0;
      try { var M = new DOMMatrixReadOnly(getComputedStyle(btn).transform); dx = M.m41; dy = M.m42; } catch (e) {}
      return { left: r.left - dx, top: r.top - dy, width: r.width, height: r.height };
    }
    function covers() {
      var r = rest(), m = 8;
      if (!r.width) return false;
      for (var iy = 0; iy < 4; iy++) {
        var y = r.top - m + (r.height + 2 * m) * iy / 3;
        for (var ix = 0; ix < 5; ix++) {
          var x = r.left - m + (r.width + 2 * m) * ix / 4;
          if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) continue;
          var stack = doc.elementsFromPoint(x, y);
          for (var k = 0; k < stack.length; k++) {
            var el = stack[k];
            if (el === btn || btn.contains(el)) continue;
            if (el.matches(STOP)) break;           // down to the section itself: nothing here
            if (el.closest(CONTENT)) return true;
          }
        }
      }
      return false;
    }
    function set(h) { if (h === hidden) return; hidden = h; btn.classList.toggle('is-hidden', h); }
    var bar = $('#shopbar');
    function check(settled) {
      if (doc.activeElement === btn) { set(false); return; }
      if (html.classList.contains('menu-open')) { set(true); return; }
      if (bar && bar.classList.contains('is-visible') && bar.offsetWidth) { set(true); return; }   // the shop bar is up (phones)
      if (hidden && !settled) return;              // already aside: it only comes back once the page has settled
      if (covers()) set(true); else if (settled) set(false);
    }
    function onMove() {
      if (!queued) { queued = true; requestAnimationFrame(function () { queued = false; check(false); }); }
      clearTimeout(timer); timer = setTimeout(function () { check(true); }, 260);
    }
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove, { passive: true });
    // the page also moves without a scroll: a section revealing itself (it rises 22 px), an answer or the facts
    // drawer opening, the Sun Index's card, the shop bar: look again once each has finished moving
    var MOVERS = '[data-reveal], .faq__a, .label-panel, .sunindex__stops, .stop, .shopbar, [data-swap], .hero__copy > *';
    var moved = function (e) { if (e.target && e.target.matches && e.target.matches(MOVERS)) onMove(); };
    doc.addEventListener('transitionend', moved, true);
    doc.addEventListener('animationend', moved, true);
    doc.addEventListener('click', function () { setTimeout(onMove, 60); }, true);
    btn.addEventListener('focus', function () { set(false); });
    btn.addEventListener('blur', onMove);
    return { check: check, settle: onMove, get hidden() { return hidden; }, covers: covers };
  })();

  /* ───────────────────────── 14 · One frame loop for every scroll-linked effect ─────────────────────────
     Reads first, then writes. It idles when nothing animated is on screen (no water window, no hero)
     and wakes on scroll, resize and pointer ripples.                                                  */
  var lastT = 0, running = false, idle = 0;
  var Rider = null;   // site/rider.js plugs in here (window.__modelpops.plugRider): the pop that rides the page
  function kick() { if (running) return; running = true; idle = 0; lastT = 0; requestAnimationFrame(loop); }
  function loop(ts) {
    var st = { t: ts / 1000, dt: lastT ? ts - lastT : 16, sy: window.scrollY };
    lastT = ts;
    // read
    heroRead(); parallaxRead(); barRead();
    if (Decor && heroState.visible) Decor.read();
    if (Sun) Sun.read();
    if (Water) Water.measure(st);
    if (Rider) Rider.read(st);
    // write
    heroWrite(st); parallaxWrite(); barWrite(); navWrite(st);
    if (Decor && heroState.visible) Decor.step(st);
    if (Sun) Sun.write();
    if (Rider) Rider.write(st);       // (after the hero, before the water: it may cast its own shadow)
    if (Water) Water.render(st);
    var busy = !reduce && ((Water && Water.visible) || heroState.visible) || (Water && Water.easing) ||
      (reduce && heroState.visible && performance.now() < cast.until) ||   // still frames: until the shadow has caught up
      !!(Rider && Rider.busy());                                           // the pop riding the page, while it moves
    if (busy) idle = 0; else if (++idle > 2) { running = false; return; }
    requestAnimationFrame(loop);
  }
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick, { passive: true });

  /* ───────────────────────── 15 · Boot ───────────────────────── */
  // The headline's two lines never wrap (they lie on the pool's sunlit shallows): a season's longer line is set a
  // little smaller so both fit their column (--hero-fit scales the type)
  function fitHero() {
    var t = $('.hero__title'); if (!t || !heroCopy) return;
    t.style.removeProperty('--hero-fit');
    var avail = heroCopy.clientWidth, w = 0;
    $$('.hero__l1, .hero__l2', t).forEach(function (l) { w = Math.max(w, l.getBoundingClientRect().width); });
    if (avail > 0 && w > avail) t.style.setProperty('--hero-fit', String(Math.floor(avail / w * 1000) / 1000));
  }
  // The 3D agent's pre-rendered stills (site/assets/capsules/manifest.json: { files: [{ file, w, h, alt, use }] };
  // a file is relative to that folder, or 'pops/…' / 'capsules/…' from site/assets/). Each [data-still="<pattern>"]
  // slot takes the first still whose `use` (else whose file name) matches the pattern (a case-insensitive
  // regular expression), and shows it (.has-still) once it has loaded. Read over http(s) only: browsers refuse
  // local JSON from disk, so there (or before the stills exist) every slot keeps its drawn stand-in.
  function stills() {
    var slots = $$('[data-still]');
    if (!slots.length || !/^https?:$/.test(location.protocol) || !window.fetch) return;
    var base = 'site/assets/capsules/';
    fetch(base + 'manifest.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (m) {
      var files = ((m && m.files) || []).filter(function (f) { return f && typeof f.file === 'string' && /\.(webp|png|jpe?g|avif)$/i.test(f.file); });
      if (!files.length) return;
      slots.forEach(function (slot) {
        if (slot.querySelector('img')) return;
        var re; try { re = new RegExp(slot.getAttribute('data-still'), 'i'); } catch (e) { return; }
        var f = files.filter(function (x) { return re.test(x.use || ''); })[0] || files.filter(function (x) { return re.test(x.file); })[0];
        if (!f) return;
        var img = new Image(), alt = slot.getAttribute('data-still-alt');
        img.decoding = 'async'; img.alt = alt != null ? alt : (f.alt || '');
        if (f.w && f.h) { img.width = f.w; img.height = f.h; }
        img.onload = function () { slot.classList.add('has-still'); };
        img.src = /^(capsules|pops)\//.test(f.file) ? 'site/assets/' + f.file : base + f.file;
        slot.appendChild(img);
      });
    }).catch(function () { /* no stills yet: the drawn stand-ins stay */ });
  }
  // The moving Alpine scene in #capsules (.alps-scene): its CSS animations rest while it is off screen
  // (.is-offscreen pauses them, see site/swiss.css), and never run with reduced motion.
  function alpsScene() {
    var sc = $$('.alps-scene');
    if (!sc.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (en) { en.forEach(function (e) { e.target.classList.toggle('is-offscreen', !e.isIntersecting); }); }, { rootMargin: '120px 0px' });
    sc.forEach(function (s) { s.classList.add('is-offscreen'); io.observe(s); });
  }
  // [data-pick="<product id>"]: a link that chooses that cabana on its way to #cabanas
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-pick]'); if (!a) return;
    var p = byId(a.getAttribute('data-pick')); if (p) setProduct(p.id);
  });
  // Below the fold the sections are laid out only near the screen (content-visibility, style.css), so until the
  // reader has seen one its height is an estimate. Once the page has loaded, each is laid out once in a quiet
  // moment (.cv-learn: one section per idle slot, kept for a frame so its height is remembered), and from then on
  // any jump, link or restored scroll lands true. Before that, a smooth jump to an anchor would aim by the
  // estimates and land short: an in-page link wakes them all for its jump (.cv-wake: one layout) meanwhile.
  function cvLearn() {
    var list = $$('#club, #cabanas, #amenities, #sugar, #compare, #capsules, #menu, #faq, .foot');
    var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 150); };
    (function next() {
      var el = list.shift(); if (!el) return;
      idle(function () {
        el.classList.add('cv-learn');
        requestAnimationFrame(function () { setTimeout(function () { el.classList.remove('cv-learn'); next(); }, 0); });
      }, { timeout: 1500 });
    })();
  }
  window.addEventListener('load', function () { (doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve()).then(cvLearn); });
  var cvTimer = 0;
  function cvRest() { clearTimeout(cvTimer); html.classList.remove('cv-wake'); }
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    html.classList.add('cv-wake');
    clearTimeout(cvTimer); cvTimer = setTimeout(cvRest, 4000);                 // (a jump that never scrolls)
  }, true);
  window.addEventListener('scroll', function () {
    if (!html.classList.contains('cv-wake')) return;
    clearTimeout(cvTimer); cvTimer = setTimeout(cvRest, 700);                  // the jump has ended (or 'scrollend')
  }, { passive: true });
  window.addEventListener('scrollend', function () { if (html.classList.contains('cv-wake')) { clearTimeout(cvTimer); cvTimer = setTimeout(cvRest, 120); } });
  function boot() {
    html.classList.add('app-ready');   // (the season's words are already in: module 1½)
    applyAccent(state.product);
    html.setAttribute('data-kind', state.product.candy.kind);
    bindCopy(state.product);           // the product's copy, with the season's words in it ({{spot}} …)
    initCabanas();
    initLabel();
    icons();
    var lu = $('#lucide-js');          // the icon set loads after this file: draw the icons when it arrives
    if (!window.lucide && lu) lu.addEventListener('load', function () { icons(); fitHero(); if (Sun) Sun.layout(); kick(); if (Archive) Archive.settle(); });
    initNav();
    initRipples();
    initAmenities();
    initShop();
    initFaq();
    initReveal();
    fitHero();
    if (Sun) Sun.layout();             // the icons are in: measure the Sun Index again
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { fitHero(); kick(); });
    var fitQ = false, refit = function () { if (fitQ) return; fitQ = true; requestAnimationFrame(function () { fitQ = false; fitHero(); }); };
    window.addEventListener('resize', refit, { passive: true });
    // and whenever the lines themselves change size (a reader's own text spacing, a late font): refit in the next
    // frame, outside the observer's callback
    if (window.ResizeObserver) { var fitRO = new ResizeObserver(refit); $$('.hero__l1, .hero__l2').forEach(function (l) { fitRO.observe(l); }); }
    // The 3D candies are made once the water has tried its context (so a browser with no WebGL at all goes
    // straight to the drawn stand-ins); three.js starts loading now, so nothing waits on that.
    if (Water && window.GloCandy && GloCandy.loadThree) GloCandy.loadThree().catch(function () {});
    if (Water) Water.onTried(mountCandies); else mountCandies();
    stills();
    alpsScene();
    window.addEventListener('resize', function () { silWake(); }, { passive: true });
    // the water's WebGL setup waits until the page (the season's headline included) has been painted once
    if (Water) requestAnimationFrame(function () { setTimeout(Water.start, 0); });
    kick();
    if (Archive) setTimeout(function () { Archive.check(true); }, 400);
    // QA / review hook
    window.__modelpops = {
      setProduct: setProduct, products: PRODUCTS, water: Water, kick: kick, sun: Sun, decor: Decor, archive: Archive, get loopRunning() { return running; },
      // site/rider.js, the pop that rides the page: it plugs into the frame loop and borrows the hero's candy. hero.state.away:
      // its mount is out riding (the hero casts no shadow, its caption stays put); hero.state.sil: keep copying its silhouette (it
      // floats over another pool); hero.dropIn(): drop into the pool again (when it comes home)
      plugRider: function (r) { Rider = r; kick(); },
      hero: { state: heroState, cast: cast, silWake: silWake, dropIn: function () { heroState.drop0 = performance.now(); heroState.dropDone = false; kick(); } },
      season: { name: SEASON_NAME, config: SEASON, water: WFX, environment: seasonEnv() }, canDraw: canDraw,
      get heroCandy() { return heroApi; }, get cabanaCandy() { return cab.api; },
      menu: { get product() { return shop.product && shop.product.id; }, setProduct: setMenuProduct },   // the menu card's product
      shadowState: function () {
        var sh = Water && Water.shadow;
        return {
          on: !!sh, box: sh ? sh.box.map(Math.round) : null, blur: sh ? +sh.blur.toFixed(1) : 0, a: sh ? +sh.a.toFixed(3) : 0,
          clip: sh ? Math.round(sh.clip) : null, fallback: cast.fallback, flat: cast.flat,
          lenses: cast.lensN, craters: cast.leakN, kind: cast.kind, copies: cast.n, copyMs: cast.n ? +(cast.ms / cast.n).toFixed(3) : 0,
          canvas: cast.cv ? cast.cv.width + 'x' + cast.cv.height : null, water: Water ? Water.silStats() : null
        };
      }
    };
  }
  function mountCandies() {
    mountCandy(heroMount, $('#heroFallback'), {
      zoom: 1,
      onRender: heroRendered,          // copy each new frame for the pool-floor shadow
      onBite: function (e) { heroBitten(e); headRipple(0.6); silWake(); kick(); },
      onPoke: function () { headRipple(0.35); silWake(); kick(); },
      onRegrow: function () { cast.craters.length = 0; silWake(); kick(); }
    }, function (api) {
      heroApi = api; candies.push(api);
      heroCandyTo(state.product, true); // the choice may have moved on, or be a kind only the stand-in can show
      silWake(2400);
      heroState.drop0 = performance.now(); if (heroFloat) heroFloat.classList.add('is-ready'); kick();
    }, function () { cast.fallback = true; kick(); });   // no 3D: the CSS stand-in casts the shadow instead
    mountCandy(cabMount, null, { zoom: 1, pointerTilt: false, interactive: false, quality: coarse ? 'low' : 'medium' }, function (api, p) {
      var c = candyOf(p);
      cab.api = api; cab.kind = c.kind; cab.color = c.color; cab.style = c.style;
      cabMount.setAttribute('data-kind', c.kind);
      cabanaCandyTo(state.product, 'now');
      if (cabRow) cabRow.classList.add('has-3d');
    });
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})();
