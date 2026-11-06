/* ═══════════════════════════════════════════════════════════════════════════
   Glo Pop · Proposal 06 · "Riviera" — app.js
   Classic script (works from file:// and over http). No build step.

    0 · utilities            8 · amenities (flip cards)
    1 · data (PRODUCTS)      9 · the Sun Index
    2 · icons               10 · shop menu + waitlist
    3 · water engine (the one WebGL canvas)
    4 · theme + product switching   11 · FAQ accordion
    5 · 3D candy (shared lib)       12 · nav + mobile menu
    6 · hero                        13 · reveal, parallax, shop bar
    7 · the cabanas (+ the gummies' Supplement Facts drawer)   14 · frame loop · 15 · boot
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

  /* ───────────────────────── 1 · Data: one product list drives everything ─────────────────────────
     Switcher (cabanas, their drawings and still lifes), cabana card (and its Supplement Facts drawer),
     hero copy, nav chip, shop bar, theme tokens, water tint, 3D candy, menu head and waitlist all read from here.
     Adding a product = adding one object.                                                          */
  var PH = function (s) { return '<span class="ph">' + s + '</span>'; };
  var NO = 'N<span class="ord">o</span>';   // a proper numero: N and a raised, underlined o
  var PRODUCTS = [
    {
      id: 'strawberry-pop', kind: 'lollipop', name: 'Peptide Lollipops', flavor: 'Strawberry', status: 'available', no: 1,
      short: 'Strawberry', statusLabel: 'Available now', bag: '10 per bag',
      color: '#FF1493', deep: '#7A1B4D', btn: '#E0007C', text: '#BF0068', display: '#E0007C', tint: '#FFE4F1', soft: '#FFB8DA',
      stripe: '#FF1493', candy: '#FF1493', meta: '#FFFDF8',
      cabana: { c: '#FF1493', c2: '#FFFDF8', deep: '#B5005E', room: '#FCE4EF', room2: '#E8B4CB', still: ['#FF8CC6', '#FF1493', '#A3005A'] },
      water: { deep: [0.10, 0.56, 0.80], shallow: [0.55, 0.89, 0.94], lagoon: 0 },
      copy: {
        heroEyebrow: 'Peptide Lollipops · Strawberry', heroCta: 'Shop strawberry pops', heroHref: '#menu',
        heroLede: 'Collagen, hyaluronic acid and glow-boosting vitamins, in a really, really good strawberry lollipop.',
        heroProofs: '<li><i data-lucide="flame"></i><span><b>47</b> cal a pop</span></li><li><i data-lucide="candy"></i><span>Made with <b>real sugar</b></span></li><li><i data-lucide="sparkles"></i><span><b>6</b> skin-loving actives</span></li>',
        heroCaption: '<span class="no" aria-hidden="true">' + NO + ' 1</span> Strawberry, poolside', heroHint: 'Touch the water · tap the pop for a bite',
        heroLabel: 'A glossy pink Glo Pop strawberry lollipop floating above the pool. Interactive 3D: drag to spin it, tap it to take a bite.',
        title: 'Peptide Lollipops, <em>Strawberry</em>',
        blurb: 'A really, really good strawberry lollipop with collagen, hyaluronic acid, vitamins C, B12 and B6, and zinc.',
        facts: [['Calories', '47 a pop'], ['In the bag', '10 lollipops'], ['Actives', '6 for skin &amp; energy'], ['Sweetened with', 'Real sugar']],
        cardCta: 'Shop strawberry', cardHref: '#menu', note: 'Free shipping on every order',
        barName: 'Strawberry Pops', barNote: '10 per bag · free shipping', barCta: 'Shop', barHref: '#menu',
        pinNote: 'Shown for Strawberry Peptide Lollipops.',
        ritualNote: 'Shown for Strawberry Peptide Lollipops.'
      }
    },
    {
      // Flavor and the Supplement Facts come from the client's label; price, launch date, directions, other
      // ingredients, allergens, dietary status and the final gummy shape are still unknown (placeholders).
      id: 'green-gummies', kind: 'gummy', name: 'Green Gummies', flavor: 'Strawberry-Watermelon', status: 'coming-soon', no: 2,
      short: 'Green Gummies', statusLabel: 'Opening soon', waitlist: 'Green Gummies', tag: 'Opening soon', bag: '60 per container',
      color: '#1FA453', deep: '#0E4D2C', btn: '#0E7A3E', text: '#0B6B36', display: '#0E7A3E', tint: '#E3F6EA', soft: '#A9DFBE',
      stripe: '#2E9E62', candy: '#1FA453', meta: '#F6FBF7',
      cabana: { c: '#2E9E62', c2: '#FFFDF8', deep: '#17683F', room: '#E2F4E9', room2: '#ADD9BF', still: ['#9BE5B8', '#1FA453', '#0E5A30'] },
      water: { deep: [0.06, 0.52, 0.56], shallow: [0.55, 0.90, 0.82], lagoon: 1 },
      copy: {
        heroEyebrow: 'Green Gummies · Opening soon', heroCta: 'Join the green list', heroHref: '#waitlist',
        heroLede: 'Five B vitamins and an organic super-greens blend, in a <span class="nw">strawberry-watermelon</span> gummy. The green cabana opens soon: join the list and you’ll hear first.',
        heroProofs: '<li><i data-lucide="flame"></i><span><b>20</b> cal per 2 gummies</span></li><li><i data-lucide="leaf"></i><span><b>5</b> B vitamins + super greens</span></li><li><i data-lucide="calendar"></i><span>Launch ' + PH('date') + '</span></li>',
        heroCaption: '<span class="no" aria-hidden="true">' + NO + ' 2</span> Green Gummies, concept render', heroHint: 'Touch the water · tap the gummies to squish',
        heroLabel: 'Green Gummies, concept render: three sugar-coated green gummies floating above the pool. Interactive 3D: drag to spin them, tap one to squish it.',
        title: 'Green Gummies, <em class="nw">Strawberry<span class="hy">-</span>Watermelon</em>',
        blurb: 'Five B vitamins and an organic blend of 15 ingredients, at 20 calories and 3&nbsp;g sugar per 2-gummy serving. Price, launch date and final name are ' + PH('still to come') + '.',
        facts: [['Per serving', '2 gummies, <span class="nw">20 cal</span>'], ['Per container', '60 gummies'], ['Inside', '5 B vitamins + <span class="nw">super greens</span>'], ['Price', '$' + PH('XX')]],
        cardCta: 'Join the list', cardHref: '#waitlist', note: 'Concept render: the final gummy may differ',
        barName: 'Green Gummies', barNote: 'Strawberry-watermelon · soon', barCta: 'Join list', barHref: '#waitlist',
        pinNote: 'Shown for Strawberry Peptide Lollipops. Green Gummies have five B vitamins and super greens: <a href="#cabanaLabel" data-show-label>see their supplement facts</a>.',
        ritualNote: 'Shown for Strawberry Peptide Lollipops.<span class="pin-note__more"> The Green Gummies ritual is still to come.</span>'
      },
      // The Supplement Facts panel, exactly as printed (the %DV column too). Rows: [name, amount per serving,
      // % daily value, style]; style: 'top' a lead row, 'in' / 'in2' indented under the row above, 'bar' a
      // heavier rule above (a new group). Opened from the cabana card (renderLabel).
      label: {
        name: 'Green Gummies supplement facts',
        meta: 'Serving size 2 gummies · 30 servings',
        serving: 'Serving Size 2 Gummies', servings: 'Servings Per Container 30',
        rows: [
          ['Calories', '20', '', 'top'],
          ['Total Carbohydrate', '5 g', '2%', 'top'],
          ['Total Sugars', '3 g', '2%', 'in'],
          ['Added Sugars', '3 g', '6%', 'in2'],
          ['Riboflavin', '0.8 mg', '62%', 'bar'],
          ['Niacin', '1.4 mg NE', '9%'],
          ['Vitamin B6', '0.9 mg', '53%'],
          ['Folate', '50 mcg DFE', '53%'],
          ['Pantothenic Acid', '0.9 mg', '18%'],
          ['Sodium', '15 mg', '<1%'],
          ['Organic Super Greens Blend', '170 mg', '<1%*', 'bar']
        ],
        notes: [
          '*Organic Super Greens Blend contains: Kale Leaf, Broccoli Stalk & Flower, Beet Root, Guava Extract, Spinach Leaf, Lemon Extract, Carrot Root, Wild Blueberry, Mango Extract, Pomegranate Fruit, Goji Juice, Spirulina, Noni Fruit, Acai Berry, Elderberry.',
          'Percent Daily Values are based on a 2,000 calorie diet. *Daily Value not established.'
        ],
        // beside the label: which of its names are B vitamins, then what the label doesn't settle yet
        key: 'Riboflavin (B2), niacin (B3), pantothenic acid (B5), vitamin B6 and folate (B9).',
        tbd: [['Other ingredients', PH('Base, sweetener, colours')], ['Allergens', PH('To be announced')], ['Vegan / gluten-free', PH('To be confirmed')], ['Directions', PH('To come')]]
      }
    },
    {
      id: 'next-pop', kind: 'lollipop', name: 'Next Pop', flavor: null /* TBD */, status: 'in-development', no: 3, tbd: true,
      short: 'Next colour', statusLabel: 'Coming later', waitlist: 'New lollipop colours', tag: 'Colour TBD',
      color: '#B07A3C', deep: '#5E3F1C', btn: '#8A5A26', text: '#7A4E1E', display: '#8A5A26', tint: '#F6EEE2', soft: '#E2CDAE',
      stripe: '#E2D2B6', candy: '#EFE3D0', meta: '#FFFBF5',
      cabana: { c: '#E2D2B6', c2: '#FFFDF8', deep: '#A38A62', room: '#F6F0E5', room2: '#DCCDB4', still: null },
      water: { deep: [0.10, 0.56, 0.80], shallow: [0.55, 0.89, 0.94], lagoon: 0 },
      copy: {
        heroEyebrow: 'Next colour · In development', heroCta: 'Get notified', heroHref: '#waitlist',
        heroLede: 'More lollipop colours are in development. No names and no flavors yet, so this one is still uncoloured.',
        heroProofs: '<li><i data-lucide="palette"></i><span>Colour ' + PH('to come') + '</span></li><li><i data-lucide="candy"></i><span>Flavor ' + PH('to come') + '</span></li><li><i data-lucide="calendar"></i><span>Launch ' + PH('date') + '</span></li>',
        heroCaption: '<span class="no" aria-hidden="true">' + NO + ' 3</span> Next colour, still undecided', heroHint: 'Touch the water · tap the pop for a bite',
        heroLabel: 'The next Glo Pop colour, concept render: an uncoloured lollipop, its colour still to be decided. Interactive 3D.',
        title: 'The next <em>colour</em>',
        blurb: 'More lollipop colours are in development. No names and no flavors yet, just swatches on the table and unbleached stripes on the cabana.',
        facts: [['Colour', PH('To be announced')], ['Flavor', PH('To be announced')], ['Formula', PH('To be announced')], ['Launch', PH('To be announced')]],
        cardCta: 'Get notified', cardHref: '#waitlist', note: 'Uncoloured concept render: the colour is not decided',
        barName: 'More colours', barNote: 'In development · colour to come', barCta: 'Notify me', barHref: '#waitlist',
        pinNote: 'Shown for Strawberry Peptide Lollipops. The next colour’s formula is still to come.',
        ritualNote: 'Shown for Strawberry Peptide Lollipops.<span class="pin-note__more"> The next colour’s ritual is still to come.</span>'
      }
    }
  ];
  // The Beach Club Menu: signatures served by the bag (prices, savings and terms are unknown → placeholders)
  var BUNDLES = [
    { id: 'single', name: 'The Single', desc: 'One bag, ten pops. A taste of the club.' },
    { id: 'duo', name: 'The Duo', desc: 'Two bags, twenty pops. Save ' + PH('XX%') + '.' },
    { id: 'month', name: 'The Month', desc: 'Three bags, thirty pops: one a day for a month. Save ' + PH('XX%') + '.' }
  ];
  var byId = function (id) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i]; return null; };
  var state = { product: PRODUCTS[0] };
  var SUN_HOT = [0.44, -0.08];  // one sun, high and to the upper left: where the water's glints gather (viewport fraction)

  /* ───────────────────────── 2 · Icons (one outlined set: Lucide) ───────────────────────── */
  function icons() {
    if (!window.lucide || !lucide.createIcons) return;
    try { lucide.createIcons({ attrs: { 'stroke-width': 1.6, 'aria-hidden': 'true', focusable: 'false' } }); } catch (e) {}
  }

  /* ───────────────────────── 3 · Water engine ─────────────────────────
     One fixed full-viewport WebGL canvas. Sections with .is-window are transparent onto it.
     POOL (top-down): a high-key pool. Shallows pale aqua over white plaster, deep azure, refracted
       floor tiles, and a crisp two-scale caustic net (sharper in the shallows, softer with depth).
       Extras per window: the sun shelf (a pale ledge under the headline, [data-shelf]), a parasol's
       scalloped shade ([data-shade]), the floating candy's shadow (its real silhouette, copied from
       the 3D canvas every frame it renders: spin, tilt, bites, shards and squish all show; tinted by
       the candy the light passes through, with the lens's focused caustic; faded out before the copy
       where the copy sits under the pop), glints gathered toward
       the one sun (upper left), pointer ripples (a pool of slots: a ring is never cut while it can
       still be seen), and a golden-hour warmth (data-warm) for the finale.
     SEA (horizon view, inside the most visible sea window): sky, a haze behind headings ([data-haze]),
       fresnel reflections and a sun glitter path; the Sun Index drives the sun along an arc.
     Only visible windows are shaded (scissor; the opaque sand is skipped), it idles when nothing is
     on screen, DPR is capped at 2 with adaptive resolution, and reduced motion gets still frames.  */
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
    '  vec2 rg = rippleGrad(pp); vec2 g = swellGrad(pp, t) + rg;',
    '  vec2 refr = g * 380.0; vec2 fp = pp + refr;',
    '  vec2 view = max(uRes / uPx, vec2(1.0)); vec2 vp = sp / view;',
    '  float warm = uPoolWarm;',
    /* depth: shallow on the left, deep toward the right */
    '  float dn = vnoise(fp / 820.0 + vec2(0.0, t * 0.004));',
    '  float depth = clamp(0.14 + 0.54 * vp.x + 0.18 * vp.y + (dn - 0.5) * 0.34, 0.0, 1.0);',
    /* the sun shelf: a pale plaster beach entry under the headline, sloping gently into the deep water */
    '  float shelf = 0.0, sd = 1e4;',
    '  if (uShelf.z > 0.0) {',
    '    vec2 hb = uShelf.zw * 0.5; sd = sdBox(sp + refr * 0.3 - (uShelf.xy + hb), hb, 140.0);',
    '    sd += (vnoise(fp / 240.0 + 3.7) - 0.5) * 64.0;',
    '    shelf = 1.0 - smoothstep(-90.0, 70.0, sd);',
    '  }',
    '  vec3 shallow = mix(uShallow, vec3(0.46, 0.80, 0.80), warm * 0.55);',
    '  vec3 deep = mix(uDeep, vec3(0.04, 0.34, 0.47), warm * 0.72);',
    '  vec3 col = mix(shallow, deep, smoothstep(0.0, 1.0, depth));',
    '  vec3 plaster = mix(vec3(0.80, 0.955, 0.965), vec3(0.95, 0.935, 0.87), warm * 0.85);',
    '  col = mix(col, plaster, shelf);',
    /* refracted floor tiles in the deep part (none on the plaster shelf) */
    '  vec2 tl = abs(fract(fp / 92.0) - 0.5); float grout = smoothstep(0.476, 0.5, max(tl.x, tl.y)) * (1.0 - shelf);',
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
    '        float a = uSilK.y * (1.0 - shelf * 0.6) * cf;',
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
    '  float cs = caustic(fp, t * 0.8, mix(26.0, 11.0, depth));',
    '  float patchy = 0.5 + 0.95 * vnoise(fp / 310.0 + vec2(t * 0.02, -t * 0.016));',
    '  float amp = mix(0.34, 0.16, depth) * patchy * (1.0 - shelf * (0.5 + warm * 0.2));',
    '  col += mix(vec3(0.86, 1.0, 1.0), vec3(1.0, 0.86, 0.6), warm) * cs * amp * lit * (1.0 + rim);',
    /* glints gather toward the sun (upper left) in drifting patches on the wave crests */
    '  vec2 hv = (vp - uHot) * vec2(view.x / view.y, 1.0);',
    '  float hot = exp(-dot(hv, hv) * 2.6) * lit * (1.0 - shelf * 0.6);',
    '  if (hot > 0.015) {',
    '    float crest = smoothstep(0.42, 0.78, vnoise(pp * 0.013 + vec2(t * 0.08, -t * 0.06)));',
    '    col += mix(vec3(1.0, 0.98, 0.93), vec3(1.0, 0.84, 0.58), warm) * glints(pp, t) * hot * crest * 1.3;',
    '  }',
    /* ripple crests catch the sun: light on the sunward slope, a soft shade behind */
    '  float rl = dot(rg, vec2(-0.55, -0.83)) * 7.0;',
    '  col += vec3(0.95, 0.99, 1.0) * clamp(rl, 0.0, 0.24) - vec3(0.05, 0.03, 0.02) * clamp(-rl, 0.0, 0.4);',
    '  col = mix(col, col * vec3(1.07, 0.97, 0.86) + vec3(0.035, 0.015, 0.0), warm * (0.5 - shelf * 0.2));',
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
    /* a soft, sun-bleached haze behind headings set on the sky */
    '    if (uHaze.z > 0.0) { vec2 hb = uHaze.zw * 0.5; float hd = sdBox(sp - (uHaze.xy + hb), hb, 60.0);',
    '      col = mix(col, pal3(vec3(1.0, 0.995, 0.975), vec3(1.0, 0.995, 0.98), vec3(1.0, 0.95, 0.88), uWarm), (1.0 - smoothstep(-40.0, 120.0, hd)) * 0.84); }',
    '  } else col = pool(sp, uTime);',
    '  col += (hash21(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;',
    '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);',
    '}'
  ].join('\n'); }

  var noGL = false;   // no WebGL at all: skip the 3D candy too (straight to its CSS fallback, no library warnings)
  var Water = (function () {
    var canvas = $('#water');
    if (!canvas || params.get('nowater') === '1') return null;
    var gl = null;
    try { gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' }); } catch (e) { gl = null; }
    if (!gl) { noGL = true; return null; }

    function compile(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[water] shader:', gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    // Ripple slots: 32 with a mouse, 24 on touch screens (fewer pixels to shade), never more than the GPU's
    // fragment uniform budget leaves room for (the rest of the shader uses ~31 vectors).
    var RIP_MAX = Math.max(8, Math.min(coarse ? 24 : 32, (gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS) || 64) - 32));
    var vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, fragSource(RIP_MAX));
    if (!vs || !fs) return null;
    var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('[water] link:', gl.getProgramInfoLog(prog)); return null; }
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, 'aPos'); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ['uRes', 'uPx', 'uTime', 'uScroll', 'uDeep', 'uShallow', 'uLagoon', 'uCandy', 'uSea', 'uHz', 'uSun', 'uWarm', 'uGlit', 'uHaze',
      'uShelf', 'uShade', 'uPoolWarm', 'uHot', 'uSil', 'uSilBox', 'uSilK', 'uLens', 'uSilClip', 'uLeak', 'uRip', 'uRipN']
      .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
    // the candy's silhouette (a small 2D canvas copied from the 3D canvas), premultiplied, linear, clamped
    var silTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, silTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.uniform1i(U.uSil, 0);
    var sil = { src: null, dirty: false, ok: false, ver: 0, upMs: 0, ups: 0 };
    var benchQ = { rip: null, noShadow: false };   // QA overrides for api.bench()

    var windows = $$('.is-window').map(function (el) {
      var shelf = $('[data-shelf]', el);
      return {
        el: el, type: el.getAttribute('data-water') || 'pool', hz: parseFloat(el.getAttribute('data-horizon') || '.5'),
        warm: parseFloat(el.getAttribute('data-warm') || '0'), sunMode: el.getAttribute('data-sun') || 'noon',
        sand: $('.beach__sand', el), haze: $('[data-haze]', el), shade: $('[data-shade]', el),
        shelf: shelf, lines: shelf ? $$('.hero__l1, .hero__l2', shelf) : [], bottomShelf: el.classList.contains('glow')
      };
    });
    // ripple pool: page-space centre, birth time, amplitude per slot; the GPU gets only the live ones
    var RIP = { x: new Float64Array(RIP_MAX), y: new Float64Array(RIP_MAX), t: new Float64Array(RIP_MAX), a: new Float64Array(RIP_MAX) };   // float64: a birth time must never round past now
    var ripGPU = new Float32Array(RIP_MAX * 4), ripLive = 0;
    var ripStats = { cap: RIP_MAX, spawned: 0, skipped: 0, recycled: 0, cutVisible: 0, maxLive: 0 };
    var t0 = performance.now();
    var frozenT = 41.3;                                 // a pleasant still frame for reduced motion
    var pinnedQ = parseFloat(params.get('wq'));
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    // full resolution on 1x desktops; the adaptive loop only lowers it when frames run slow
    var quality = isFinite(pinnedQ) ? clamp(pinnedQ, 0.3, 1) : (coarse ? 0.62 : (dpr > 1.5 ? 0.78 : 1));
    var qMax = quality;
    var pxRatio = 1, cssW = 1, cssH = 1;
    var tint = { deep: state.product.water.deep.slice(), shallow: state.product.water.shallow.slice(), lagoon: state.product.water.lagoon };
    var tintTarget = state.product.water;
    var candyCol = hexRgb(state.product.candy), candyTarget = candyCol.slice();
    var poolWarm = 0;
    var api = { shadow: null, sun: null, warm: 0.05, visible: false, easing: false, lastSig: '', ema: 16, frames: 0, ready: false };
    var lost = false;
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; html.classList.remove('has-water'); }, false);

    function now() { return reduce ? frozenT : (performance.now() - t0) / 1000; }
    function resize() {
      cssW = canvas.clientWidth || innerWidth; cssH = canvas.clientHeight || innerHeight;
      var px = dpr * quality;
      var w = Math.max(1, Math.round(cssW * px)), h = Math.max(1, Math.round(cssH * px));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      pxRatio = w / cssW;
      api.lastSig = '';
    }

    // Bake one still frame of high-key caustics for the 2D surfaces (amenity cards, pouch wall)
    (function bake() {
      try {
        var w = 640, h = 400;
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(U.uRes, w, h); gl.uniform1f(U.uPx, 1); gl.uniform1f(U.uTime, 17.3); gl.uniform1f(U.uScroll, 0);
        gl.uniform3f(U.uDeep, 0.50, 0.85, 0.91); gl.uniform3f(U.uShallow, 0.70, 0.93, 0.955); gl.uniform1f(U.uLagoon, 0);
        gl.uniform3f(U.uCandy, 1, 0.08, 0.58); gl.uniform4f(U.uSea, 0, 0, 0, 0); gl.uniform4f(U.uHaze, 0, 0, 0, 0);
        gl.uniform4f(U.uShelf, 0, 0, 0, 0); gl.uniform4f(U.uShade, 0, 0, 0, 0); gl.uniform1f(U.uPoolWarm, 0);
        gl.uniform2f(U.uHot, -9, -9); gl.uniform4f(U.uSilK, 0, 0, 0, 0); gl.uniform1f(U.uRipN, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        html.style.setProperty('--caustic', 'url("' + canvas.toDataURL('image/jpeg', 0.86) + '")');
      } catch (e) {}
    })();
    resize();
    window.addEventListener('resize', resize, { passive: true });

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
    api.setTint = function (w) { tintTarget = w; api.lastSig = ''; };
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
          vis.pool = { w: w, r: r, base: Math.round(r.top + st.sy), shelf: w.shelf ? shelfRect(w, r) : null, shade: sh };
        }
      }
      api.visible = vis.any;
    };

    function draw(st) {
      var sea = vis.sea, pool = vis.pool, sun = [0, 0], warm = 0.05, glit = [0.006, 0.00035, 1.5];
      if (sea) {
        if (sea.mode === 'arc' && api.sun) { sun = api.sun; warm = api.warm; }
        else { sun = [sea.r.left + sea.r.width * 0.2, sea.r.top + sea.r.height * 0.03]; warm = 0.5; glit = [0.045, 0.0016, 0.9]; }
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
      if (pool && pool.shade) {
        var s = pool.shade;
        var srx = Math.max(s.width / 2 + 96, s.height / 2 + 150, 230);
        gl.uniform4f(U.uShade, s.left + s.width / 2, s.top + s.height / 2, srx, Math.max(srx * 0.6, s.height / 2 + 70));
      } else gl.uniform4f(U.uShade, 0, 0, 0, 0);
      gl.uniform1f(U.uPoolWarm, poolWarm);
      gl.uniform2f(U.uHot, SUN_HOT[0], SUN_HOT[1]);
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
      if (lost || !vis.any) return;
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
          sh ? Math.round(sh.box[0]) + ',' + Math.round(sh.box[1]) + ',' + sil.ver + ',' + Math.round(sh.clip || 0) : 0, pl && pl.shelf ? pl.shelf.map(Math.round).join(',') : '', moving ? Math.random() : 0, tintTarget.lagoon, poolWarm].join('|');
        if (sig === api.lastSig) return;
        api.lastSig = sig;
      }
      draw(st);
      api.frames++;
      if (api.frames === 1) { html.classList.add('has-water'); api.ready = true; }

      // adaptive resolution (unless pinned for QA): lower only after sustained slow frames
      if (!reduce && !isFinite(pinnedQ) && st.dt > 0 && st.dt < 250) {
        api.ema = api.ema * 0.95 + st.dt * 0.05;
        if (api.frames % 90 === 0) {
          if (api.ema > 26 && quality > 0.45) { quality = Math.max(0.45, quality - 0.1); resize(); }
          else if (api.ema < 14 && quality < qMax) { quality = Math.min(qMax, quality + 0.05); resize(); }
        }
      }
    };

    // QA: average cost of one water frame as it stands (ms, GPU included: each draw is waited for);
    // o.rip caps the live ripples the shader reads, o.noShadow drops the candy shadow (for comparisons)
    api.bench = function (n, o) {
      if (lost || !vis.any) return null;
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
      if (lost || !vis.any) return null;
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
     Product surfaces follow the selection (hero, cabanas, card, nav chip, shop bar, awnings, water).
     Lollipop-only sections are pinned to strawberry in CSS (.theme-pin).                          */
  var candies = [];
  var rollTimer = 0;
  function applyAccent(p) {
    var s = html.style;
    s.setProperty('--accent', p.color); s.setProperty('--accent-deep', p.deep); s.setProperty('--accent-btn', p.btn);
    s.setProperty('--accent-text', p.text); s.setProperty('--accent-display', p.display);
    s.setProperty('--accent-tint', p.tint); s.setProperty('--accent-soft', p.soft);
    var meta = $('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', p.meta);
  }
  function bindCopy(p) {
    var c = p.copy;
    $$('[data-bind]').forEach(function (el) {
      var k = el.getAttribute('data-bind');
      if (k === 'cabanaNo') el.innerHTML = 'Cabana ' + NO + ' ' + p.no;
      else if (k === 'stampNo') el.innerHTML = NO + ' ' + p.no;
      else if (k === 'statusLabel') el.textContent = p.statusLabel;
      else if (k === 'short') el.textContent = p.short;
      else if (c[k] != null) el.textContent = c[k];
    });
    $$('[data-bind-href]').forEach(function (el) { var k = el.getAttribute('data-bind-href'); if (c[k]) el.setAttribute('href', c[k]); });
    $$('[data-bind-label]').forEach(function (el) { var k = el.getAttribute('data-bind-label'); if (c[k]) el.setAttribute('aria-label', c[k]); });
    $$('[data-bind-html]').forEach(function (el) {
      var k = el.getAttribute('data-bind-html');
      if (k === 'facts') el.innerHTML = c.facts.map(function (f) { return '<div><dt>' + f[0] + '</dt><dd>' + f[1] + '</dd></div>'; }).join('');
      else if (c[k] != null) el.innerHTML = c[k];
    });
    renderLabel(p);                                // the Supplement Facts drawer (only products with a label)
    icons();
    heroState.capW = 0;   // re-measure the caption
  }
  function setProduct(id) {
    var p = byId(id);
    if (!p || p === state.product) return;
    state.product = p;
    html.setAttribute('data-product', p.id);
    html.setAttribute('data-kind', p.kind);

    // 1 · the new stripes roll down over the awnings, then the base fabric changes underneath
    html.style.setProperty('--stripe-next', p.stripe);
    clearTimeout(rollTimer);
    if (!reduce) { html.classList.remove('is-rolling'); void html.offsetWidth; html.classList.add('is-rolling'); }
    rollTimer = setTimeout(function () { html.style.setProperty('--stripe', p.stripe); html.classList.remove('is-rolling'); }, reduce ? 0 : 580);

    // 2 · accents cross-fade (registered custom properties), copy swaps, water re-tints, candy swaps
    applyAccent(p);
    var card = $('#cabanaCard');
    if (card && !reduce) { card.classList.add('is-swapping'); setTimeout(function () { bindCopy(p); card.classList.remove('is-swapping'); }, 300); }
    else bindCopy(p);
    if (Water) { Water.setTint(p.water); Water.setCandy(p.candy); }
    candies.forEach(function (c) { c.setProduct({ kind: p.kind, color: p.candy }, { duration: 1 }); });   // the hero pop
    silWake(2600);
    updateCabanas(true);                           // the cabana candy changes inside its cabana's curtains
    if (p.status !== 'available') preselectWaitlist(p.id);
    var st = $('#themeStatus'); if (st) st.textContent = 'Showing ' + p.short + ', ' + p.statusLabel.toLowerCase() + '.';
    kick();
  }

  /* ───────────────────────── 5 · 3D candy (shared library, public API only) ───────────────────────── */
  function mountCandy(el, fallback, opts, onReady, onFail) {
    if (!el) return;
    var fail = function () {
      html.classList.add('no-3d'); if (fallback) fallback.hidden = false;
      if (heroFloat) heroFloat.classList.add('is-ready');
      if (cabRow) cabRow.classList.remove('has-3d');
      if (onFail) onFail();
    };
    if (!window.GloCandy || noGL) { fail(); return; }
    var p = state.product;
    GloCandy.create(el, Object.assign({
      preset: 'gloss',
      product: { kind: p.kind, color: p.candy },
      environment: 'beach',          // midday beach reflections + a real sun shadow (front left: our one sun)
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
  var heroState = { visible: true, rect: null, fig: null, drop0: 0, dropDone: false, capW: 0, capH: 0, ty: 0, sc: 1, head: null, clip: 1e5, flW: 0, flH: 0 };
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
     cast. So spin, drag and fling tilt, pointer lean, bites (crater and flying shards), the gummies'
     squish and the product swap all show in the shadow. Touch screens copy at most ~30 times a second;
     with reduced motion only right after something changed (a bite, a swap, a resize). The lens spots
     (the ball, or each gummy) come from the same frame, in the canvas's own 0..1 box, and so do the
     bite craters: a crater carved in the face of the ball hardly changes its outline, but the thinner
     candy lets a little more light through: a soft, lighter spot in its shadow (until it regrows).
     Without 3D the CSS stand-in casts the same way: its shapes are drawn into that canvas instead.
     Where the copy sits under the pop (phones, tablets), the shadow fades out before it reaches it.  */
  var heroApi = null;
  var cast = { cv: null, g: null, H: 224, last: 0, until: 0, n: 0, ms: 0, lens: new Float32Array(9), lensN: 0, kind: state.product.kind, v: null, s: null,
    craters: [], healAt: 0, leak: new Float32Array(9), leakN: 0, leakS: 0, ema: 0, fallback: false, fbKey: '' };
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
    if (!Water || !heroState.visible) return;
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
    var ud = model.userData, list = ud.kind === 'gummy' ? (ud.pieces || []) : (ud.candy ? [ud.candy] : []);
    var cam = api.camera, k = 1 / Math.tan(cam.fov * Math.PI / 360);
    cast.kind = ud.kind;
    for (var i = 0; i < list.length && i < 3; i++) {
      var m = list[i], g = m.geometry, r0 = g && g.userData && g.userData.radius;
      m.updateWorldMatrix(true, false);
      if (r0) cast.v.set(0, 0, 0);                                   // the ball is centred on its mesh
      else if (g) {                                                  // a gummy: its bounding sphere
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
  // No 3D: the CSS stand-in (.lolly-fallback) casts its shadow too. Its shapes (the ball and the paper stick
  // turned 14° about its top, or the three gumdrops) are drawn into the silhouette canvas in the float's own
  // box, in CSS px, again whenever the product or the float's size changes; its lens spots come from them.
  function capsule(g, x, y, w, h) { var r = w / 2; g.beginPath(); g.arc(x + r, y + r, r, Math.PI, 0); g.arc(x + r, y + h - r, r, 0, Math.PI); g.closePath(); }
  function gumdrop(g, x, y, w, h) {   // border-radius: 48% 48% 44% 44% / 58% 58% 42% 42%
    var tx = 0.48 * w, ty = 0.58 * h, bx = 0.44 * w, by = 0.42 * h;
    g.beginPath(); g.moveTo(x + tx, y);
    g.ellipse(x + w - tx, y + ty, tx, ty, 0, -Math.PI / 2, 0); g.ellipse(x + w - bx, y + h - by, bx, by, 0, 0, Math.PI / 2);
    g.ellipse(x + bx, y + h - by, bx, by, 0, Math.PI / 2, Math.PI); g.ellipse(x + tx, y + ty, tx, ty, 0, Math.PI, Math.PI * 1.5);
    g.closePath();
  }
  function castFallback(w0, h0) {
    if (!cast.cv) { cast.cv = doc.createElement('canvas'); cast.g = cast.cv.getContext('2d'); }
    var g = cast.g, p = state.product;
    if (!g || !w0 || !h0) return;
    var h = cast.H, w = Math.max(8, Math.round(h * w0 / h0));
    cast.cv.width = w; cast.cv.height = h;                       // (clears it)
    g.setTransform(h / h0, 0, 0, h / h0, 0, 0);
    cast.kind = p.kind; cast.lensN = 0; cast.leakN = 0;
    if (p.kind === 'gummy') {
      var gw = 0.3 * w0, gh = gw / 1.1, at = [[0.26, 0.44], [0.46, 0.46], [0.36, 0.28]];
      g.fillStyle = p.color;
      for (var i = 0; i < 3; i++) {
        var x = at[i][0] * w0, y = at[i][1] * h0;
        gumdrop(g, x, y, gw, gh); g.fill();
        cast.lens[i * 3] = (x + gw / 2) / w0; cast.lens[i * 3 + 1] = (y + gh * 0.55) / h0; cast.lens[i * 3 + 2] = gw / 2 / h0;
      }
      cast.lensN = 3;
    } else {
      g.save(); g.translate(0.5 * w0, 0.46 * h0); g.rotate(14 * Math.PI / 180);
      g.fillStyle = '#F3EEE7'; capsule(g, -6, 0, 12, 0.44 * h0); g.fill(); g.restore();
      var D = Math.min(0.52 * w0, 250), bcx = 0.5 * w0 - 0.06 * D, bcy = 0.1 * h0 + D / 2;
      g.fillStyle = p.color; g.beginPath(); g.arc(bcx, bcy, D / 2, 0, Math.PI * 2); g.fill();
      cast.lens[0] = bcx / w0; cast.lens[1] = bcy / h0; cast.lens[2] = D / 2 / h0; cast.lensN = 1;
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
    if (cast.fallback && heroFloat && Water) {
      var fw = heroFloat.offsetWidth, fh = heroFloat.offsetHeight, key = fw + 'x' + fh + ' ' + state.product.id;
      heroState.flW = fw; heroState.flH = fh;
      if (key !== cast.fbKey) { cast.fbKey = key; castFallback(fw, fh); }
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
    var r = heroState.rect, fig = heroState.fig;
    if (!r || !fig) return;
    // the float's resting box (the shadow lies on the floor and the caption on the deck: neither bobs)
    var W = r.width / sc, H = r.height / sc, cx = r.left + r.width / 2, cy = r.top + r.height / 2 - ty;
    var kind = state.product.kind, gummy = kind === 'gummy';
    var u = Math.min(H / 6.48, W / 3.67), gu = Math.min(H / 3.89, W / 4.21);
    var bx = cx - W / 2, by = cy - H / 2;
    // the box the silhouette covers: the 3D canvas (the mount), or the float itself for the CSS stand-in
    var SW = W, SH = H;
    if (cast.fallback && heroState.flW) { SW = heroState.flW; SH = heroState.flH; bx = cx - SW / 2; by = cy - SH / 2; }
    heroState.head = cast.lensN ? [bx + cast.lens[0] * SW, by + cast.lens[1] * SH] : gummy ? [cx, cy] : [cx - 0.36 * u, cy - 1.46 * u];

    // caption: beside the stick's end, on the side away from the shadow
    if (heroCaption && heroState.capW) {
      var ex = gummy ? cx - gu * 1.25 : cx + 0.67 * u - 10, ey = gummy ? cy + gu * 1.55 : cy + 2.72 * u;
      var x = ex - fig.left - heroState.capW - 14, y = ey - fig.top - heroState.capH / 2;
      x = clamp(x, 8 - fig.left, fig.width - heroState.capW); y = clamp(y, 0, fig.height - heroState.capH);
      heroCaption.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    }

    if (!Water) return;
    if (!cast.n || (!heroState.drop0 && !cast.fallback)) { Water.shadow = null; return; }
    // Cast the candy's silhouette on the pool floor: one sun, upper left, so it falls down-right, further
    // off and softer the higher the pop floats (the drop-in, the bob). The pop floats higher than the
    // gummies; the reach eases across a swap with the model that is actually on show.
    var fh = fig.height, off = 1 + hgt * 0.9 + (lift + 7) / 80, soft = 1 + hgt * 1.1 + (lift + 7) / 110;
    var reach = cast.kind === 'gummy' ? 0.18 : 0.263;
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
      L[j + 2] = Math.max(R, 1); L[j + 3] = cast.kind === 'gummy' ? 0.55 : 1;
    }
    for (i = 0; i < 3; i++) {
      var K = sh.leak, q = i * 4;
      if (i >= cast.leakN) { K[q + 3] = 0; continue; }
      K[q] = bx + cast.leak[i * 3] * SW + ox; K[q + 1] = by + cast.leak[i * 3 + 1] * SH + oy;
      K[q + 2] = Math.max(cast.leak[i * 3 + 2] * SH * (1 + hgt * 0.5), 1); K[q + 3] = cast.leakS;
    }
    Water.shadow = sh;
  }

  /* ───────────────────────── 7 · The cabanas (switcher) ─────────────────────────
     Each cabana is drawn from its product's colours: a back SVG (shadow, interior, plinth, still life),
     the 3D candy between, and a front SVG (curtains, posts, canopy, valance, flag). One stripe pitch
     (13.75 units) runs through canopy, valance and curtains. Only the chosen cabana is open, with its
     product inside (the one live 3D candy; the drawn still life is only the no-3D stand-in) and its flag
     up; every other cabana keeps its curtains drawn. Choosing another: the old curtains close as the
     candy sinks away, then, hidden, it becomes the new product in the new cabana, whose curtains part
     as it rises back up. It never travels between cabanas.                                         */
  var cabRow = $('#cabanaRow'), cabMount = $('#cabanaCandy'), cabScroller = $('.cabana-scroller');
  var cab = { api: null, kind: state.product.kind, color: state.product.candy, token: 0, timer: 0, leaveAt: 0 };
  var CAB_LEAVE = 300;   // ms: the candy has sunk away and the old curtains are mostly drawn
  var CAB = (function () {
    var s = 13.75, x0 = 10, n = 16, x1 = x0 + n * s, r = s / 2, rs = r - 2.4, k;
    var arcs = '';
    for (k = n - 1; k >= 0; k--) arcs += ' A' + r + ' ' + r + ' 0 0 1 ' + (x0 + k * s).toFixed(2) + ' 104';
    var stA = '', stB = '';
    for (k = 0; k < n; k++) {
      var cx = x0 + (k + 0.5) * s, seg = 'M' + (cx + rs).toFixed(2) + ' 104 A' + rs + ' ' + rs + ' 0 0 1 ' + (cx - rs).toFixed(2) + ' 104';
      if (k % 2 === 0) stA += seg; else stB += seg;
    }
    var roofA = '', roofB = '';
    for (k = 0; k < n; k++) {
      var tx = 66 + k * 6.75, bx = x0 + k * s;
      var pnl = 'M' + tx + ' 52L' + (tx + 6.75) + ' 52L' + (bx + s).toFixed(2) + ' 82L' + bx.toFixed(2) + ' 82Z';
      if (k % 2 === 0) roofA += pnl; else roofB += pnl;
    }
    return {
      valance: 'M' + x0 + ' 80H' + x1 + 'V104' + arcs + 'Z', piping: 'M' + x1 + ' 104' + arcs, stitchA: stA, stitchB: stB,
      roofA: roofA, roofB: roofB,
      curtainL: 'M27 100 L120 100 C120 150 120 182 120 204 C120 228 120 262 120 292 L27 292 Z',
      curtainR: 'M213 100 L120 100 C120 150 120 182 120 204 C120 228 120 262 120 292 L213 292 Z'
    };
  })();
  var FOLDS = [[0, 'rgba(74,13,46,0)'], [0.08, 'rgba(74,13,46,.1)'], [0.17, 'rgba(255,255,255,.12)'], [0.28, 'rgba(74,13,46,.12)'], [0.39, 'rgba(255,255,255,.1)'],
    [0.5, 'rgba(74,13,46,.12)'], [0.61, 'rgba(255,255,255,.1)'], [0.73, 'rgba(74,13,46,.12)'], [0.85, 'rgba(255,255,255,.12)'], [0.94, 'rgba(74,13,46,.1)'], [1, 'rgba(74,13,46,.18)']];
  function stop(o, c) { return '<stop offset="' + o + '" style="stop-color:' + c + '"/>'; }
  function cabanaArt(p, i) {
    var id = 'cab' + i, C = p.cabana;
    var defs = '<defs>' +
      '<pattern id="' + id + 's" patternUnits="userSpaceOnUse" x="10" y="0" width="27.5" height="300"><rect width="13.75" height="300" style="fill:var(--c)"/><rect x="13.75" width="13.75" height="300" style="fill:var(--c2)"/></pattern>' +
      '<linearGradient id="' + id + 'f" x1="0" x2="1" y1="0" y2="0">' + FOLDS.map(function (f) { return stop(f[0], f[1]); }).join('') + '</linearGradient>' +
      '<linearGradient id="' + id + 'r" x1="0" x2="0" y1="0" y2="1">' + stop(0, 'var(--room-2)') + stop(0.55, 'var(--room)') + stop(1, '#FFFDF8') + '</linearGradient>' +
      '<linearGradient id="' + id + 'L" x1="0" x2="1" y1="0" y2="0">' + stop(0, 'rgba(255,255,255,.26)') + stop(0.45, 'rgba(255,255,255,0)') + stop(1, 'rgba(74,13,46,.16)') + '</linearGradient>' +
      '<linearGradient id="' + id + 'V" x1="0" x2="0" y1="0" y2="1">' + stop(0, 'rgba(255,255,255,.26)') + stop(0.45, 'rgba(255,255,255,0)') + stop(1, 'rgba(74,13,46,.17)') + '</linearGradient>' +
      '<linearGradient id="' + id + 'D" x1="0" x2="0" y1="0" y2="1">' + stop(0, 'rgba(74,13,46,.24)') + stop(1, 'rgba(74,13,46,0)') + '</linearGradient>' +
      '<radialGradient id="' + id + 'c" cx=".36" cy=".3" r=".78">' + stop(0, 'rgba(255,255,255,.95)') + stop(0.16, 'var(--still-hi)') + stop(0.62, 'var(--still)') + stop(1, 'var(--still-lo)') + '</radialGradient>' +
      '<filter id="' + id + 'b" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="2.6"/></filter>' +
    '</defs>';
    var still;
    if (p.kind === 'gummy') {
      var gum = function (x, y) { return 'M' + (x - 12) + ' ' + (y + 9) + 'C' + (x - 13) + ' ' + (y - 4) + ' ' + (x - 7) + ' ' + (y - 12) + ' ' + x + ' ' + (y - 12) + 'C' + (x + 7) + ' ' + (y - 12) + ' ' + (x + 13) + ' ' + (y - 4) + ' ' + (x + 12) + ' ' + (y + 9) + 'Z'; };
      still = '<g class="cab-still"><path d="' + gum(107, 232) + gum(133, 232) + gum(120, 214) + '" style="fill:url(#' + id + 'c)" stroke="rgba(74,13,46,.18)" stroke-width=".6"/></g>';
    } else if (!C.still) {
      still = '<g class="cab-still" fill="rgba(255,255,255,.35)" stroke="rgba(74,13,46,.45)" stroke-width="1.2" stroke-dasharray="3 3"><circle cx="120" cy="180" r="19"/><path d="M120 199V241" fill="none"/></g>';
    } else {
      still = '<g class="cab-still"><rect x="118.5" y="196" width="3" height="45" rx="1.5" fill="#FFFEFB" stroke="rgba(74,13,46,.22)" stroke-width=".6"/>' +
        '<circle cx="120" cy="180" r="19" style="fill:url(#' + id + 'c)"/><ellipse cx="113" cy="172.5" rx="5.2" ry="3.2" fill="#fff" opacity=".8" transform="rotate(-32 113 172.5)"/></g>';
    }
    var back = '<svg class="cabana__svg cabana__svg--back" viewBox="0 0 240 300" aria-hidden="true" focusable="false">' + defs +
      '<path class="cab-shadow" d="M30 291L214 291L320 259L136 259Z" filter="url(#' + id + 'b)"/>' +
      '<ellipse class="cab-contact" cx="120" cy="292" rx="102" ry="3"/>' +
      '<rect x="27" y="100" width="186" height="192" style="fill:url(#' + id + 'r)"/>' +
      '<rect x="27" y="100" width="186" height="192" style="fill:url(#' + id + 's)" opacity=".14"/>' +
      '<rect class="cab-deck" x="27" y="272" width="186" height="20"/>' +
      '<path class="cab-plinth-top" d="M100 241H140L143 246H97Z"/><rect class="cab-plinth" x="97" y="246" width="46" height="46"/><rect class="cab-plinth-side" x="135" y="246" width="8" height="46"/>' +
      still + '</svg>';
    var ropeL = '<path class="cab-rope" d="M27 200C33 197 40 197 43 201C41 206 34 207 27 205"/><path class="cab-rope" d="M42 205V212"/><path class="cab-tassel" d="M42 211C39.4 213.5 39 219 42 222C45 219 44.6 213.5 42 211Z"/>';
    var ropeR = '<path class="cab-rope" d="M213 200C207 197 200 197 197 201C199 206 206 207 213 205"/><path class="cab-rope" d="M198 205V212"/><path class="cab-tassel" d="M198 211C195.4 213.5 195 219 198 222C201 219 200.6 213.5 198 211Z"/>';
    var front = '<svg class="cabana__svg cabana__svg--front" viewBox="0 0 240 300" aria-hidden="true" focusable="false">' +
      '<g class="cab-flag"><path class="cab-pole" d="M120 52V14"/><path d="M120.7 15L143 20.5L120.7 26Z" style="fill:var(--c);stroke:var(--c-deep);stroke-width:.8"/></g>' +
      '<g class="cab-curtain cab-curtain--l"><path class="cab-fabric" d="' + CAB.curtainL + '" style="fill:url(#' + id + 's)"/><path class="cab-fabric" d="' + CAB.curtainL + '" style="fill:url(#' + id + 'f)"/></g>' +
      '<g class="cab-curtain cab-curtain--r"><path class="cab-fabric" d="' + CAB.curtainR + '" style="fill:url(#' + id + 's)"/><path class="cab-fabric" d="' + CAB.curtainR + '" style="fill:url(#' + id + 'f)"/></g>' +
      '<rect x="27" y="100" width="186" height="18" style="fill:url(#' + id + 'D)"/>' +
      '<g class="cab-tie">' + ropeL + ropeR + '</g>' +
      '<rect class="cab-post" x="22" y="78" width="5" height="214" rx="1"/><rect class="cab-post" x="213" y="78" width="5" height="214" rx="1"/>' +
      '<path d="' + CAB.roofA + '" style="fill:var(--c)"/><path d="' + CAB.roofB + '" style="fill:var(--c2)"/>' +
      '<path d="M66 52H174L230 82H10Z" style="fill:url(#' + id + 'L)"/>' +
      '<path class="cab-ridge" d="M63 52H177" style="stroke:var(--c-deep)"/><circle cx="120" cy="50" r="2.6" style="fill:var(--c-deep)"/>' +
      '<g class="cab-valance"><path d="' + CAB.valance + '" style="fill:url(#' + id + 's)"/><path d="' + CAB.valance + '" style="fill:url(#' + id + 'V)"/>' +
        '<path class="cab-piping" d="' + CAB.piping + '" style="stroke:var(--c-deep)"/>' +
        '<path class="cab-stitch cab-stitch--a" d="' + CAB.stitchA + '"/><path class="cab-stitch cab-stitch--b" d="' + CAB.stitchB + '"/>' +
        '<path class="cab-stitch cab-stitch--b" d="M10 85H230"/></g>' +
    '</svg>';
    var tag = p.status !== 'available' ? '<span class="cabana__tag"><span class="cabana__tag-a">' + p.tag + '</span><span class="cabana__tag-b">Concept render</span></span>' : '';
    return back + '<div class="cabana__stage"></div>' + front + tag;
  }
  function renderCabanas() {
    if (!cabRow) return;
    cabRow.innerHTML = PRODUCTS.map(function (p, i) {
      var sel = p === state.product, C = p.cabana, st = C.still || ['#fff', '#fff', '#fff'];
      var vars = '--c:' + C.c + ';--c2:' + C.c2 + ';--c-deep:' + C.deep + ';--room:' + C.room + ';--room-2:' + C.room2 + ';--still-hi:' + st[0] + ';--still:' + st[1] + ';--still-lo:' + st[2];
      var cls = 'cabana' + (sel ? ' is-selected is-open' : '');
      return '<li class="' + cls + '" data-id="' + p.id + '" style="' + vars + '">' +
        '<div class="cabana__art" aria-hidden="true">' + cabanaArt(p, i) + '</div>' +
        '<button class="cabana__btn" type="button" aria-pressed="' + sel + '" data-product="' + p.id + '">' +
          '<span class="cabana__no" aria-hidden="true">Cabana ' + NO + ' ' + p.no + '</span><span class="sr-only">Cabana ' + p.no + ': </span>' +
          '<span class="cabana__name">' + p.short + '</span>' +
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
    if (!cab.api || (cab.kind === p.kind && cab.color === p.candy)) return;
    cab.api.setProduct({ kind: p.kind, color: p.candy }, { duration: how === 'hidden' ? 0.05 : 0.8 });
    cab.kind = p.kind; cab.color = p.candy;
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
  }

  /* The Supplement Facts drawer at the foot of the cabana card: a disclosure, drawn from the product's
     label (PRODUCTS[].label) and hidden for products without one. Closed it is one quiet row; open, the
     label itself is a real table (caption, column and row headers, footnotes), plus what it doesn't
     settle yet. Links marked [data-show-label] open it (choosing that product first if they name one). */
  var labelBox = $('#cabanaLabel'), labelBtn = $('#labelToggle'), labelPanel = $('#labelPanel'), labelFor = null;
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  function labelHTML(L) {
    var rows = L.rows.map(function (r) {
      return '<tr' + (r[3] ? ' class="sf-' + r[3] + '"' : '') + '><th scope="row">' + esc(r[0]) + '</th>' +
        '<td>' + esc(r[1]).replace(/ /g, '&nbsp;') + '</td><td>' + esc(r[2]) + '</td></tr>';
    }).join('');
    return '<div class="label-panel__inner">' +
      '<div class="sfacts-box"><table class="sfacts">' +
        '<caption><span class="sfacts__title">Supplement Facts</span><span class="sfacts__serving">' + esc(L.serving) + '</span><span class="sfacts__serving">' + esc(L.servings) + '</span></caption>' +
        '<thead><tr><td></td><th scope="col">Amount Per Serving</th><th scope="col">%&nbsp;Daily Value</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        '<tfoot><tr><td colspan="3">' + L.notes.map(function (n) { return '<p>' + esc(n) + '</p>'; }).join('') + '</td></tr></tfoot>' +
      '</table></div>' +
      '<div class="label-side">' +
        '<div class="label-side__block"><p class="caption">The five B vitamins</p><p class="label-side__key">' + esc(L.key) + '</p></div>' +
        '<div class="label-side__block"><p class="caption">Still to come</p><dl class="label-side__list">' +
          L.tbd.map(function (t) { return '<div><dt>' + t[0] + '</dt><dd>' + t[1] + '</dd></div>'; }).join('') +
        '</dl></div>' +
      '</div>' +
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
        if (label) label.textContent = on ? 'Turn back' : 'See benefits';
        if (front) front.setAttribute('aria-hidden', on ? 'true' : 'false');
        if (back) back.setAttribute('aria-hidden', on ? 'false' : 'true');
      };
      set(false);
      b.addEventListener('click', function () { set(!li.classList.contains('is-flipped')); });
    });
  }

  /* ───────────────────────── 9 · The Sun Index ─────────────────────────
     Your first month, told as one summer day: the sun rises on Day 1 and sets on Day 30, and the sky and sea
     warm as it goes. The arc stays quiet (its feet labelled Day 1 and Day 30, the weeks 2–4 stretch a warm
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
      var stripes = el('g', { 'clip-path': 'url(#' + clipId + ')' }, front);
      for (var x = -2; x < 58; x += 8) {
        el('rect', { class: 'bag__stripe', x: x, y: 0, width: 4, height: 12 }, stripes);
        el('rect', { class: 'bag__stripe', x: x, y: 54, width: 4, height: 12 }, stripes);
      }
      el('line', { class: 'bag__zip', x1: 3.2, y1: 16, x2: 52.8, y2: 16 }, front);
      el('circle', { class: 'bag__mark-r', cx: 28, cy: 34, r: 6.4 }, front);   // the parasol mark, seen from above
      el('circle', { class: 'bag__mark', cx: 28, cy: 34, r: 3.4, 'stroke-dasharray': (Math.PI * 6.8 / 16).toFixed(3) }, front);
      el('circle', { class: 'bag__mark-c', cx: 28, cy: 34, r: 1.3 }, front);
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
    var WINDOW = [14, 28];        // "within 2–4 weeks": from the end of week two to the end of week four
    // the card turns over halfway between two rests, and to weeks 2–4 as the sun reaches its band (which lights then)
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
      // the weeks 2–4 band: a warm glow along those days, faded at both ends
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
    // the last stop's next step opens the menu with The Month chosen (the link works without this, too)
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

  /* ───────────────────────── 10 · Shop menu + waitlist (prototype: no network) ───────────────────────── */
  function renderShop() {
    var list = $('#bundleList');
    if (list) list.innerHTML = '<legend class="sr-only">Choose a bundle</legend>' + BUNDLES.map(function (b, i) {
      return '<label class="item"><input type="radio" name="bundle" value="' + b.id + '"' + (i === 0 ? ' checked' : '') + '>' +
        '<span class="item__row"><span class="item__name">' + b.name + '</span><span class="item__dots" aria-hidden="true"></span>' +
        '<span class="item__price">$' + PH('XX') + '</span></span><span class="item__desc">' + b.desc + '</span></label>';
    }).join('');
    var house = PRODUCTS.filter(function (p) { return p.status === 'available'; })[0];
    var sub = $('#menuSub'); if (sub && house) sub.innerHTML = house.name + ' · ' + house.flavor + ' · <span class="nw">' + house.bag + '</span>';
    var opts = $('#waitlistOpts');
    if (opts) opts.innerHTML = '<legend class="sr-only">Tell me about</legend>' + PRODUCTS.filter(function (p) { return p.status !== 'available'; }).map(function (p, i) {
      return '<label><input type="checkbox" name="' + p.id + '"' + (i === 0 ? ' checked' : '') + '><span>' + p.waitlist + '</span></label>';
    }).join('');
  }
  function preselectWaitlist(id) { var box = $('#waitlistOpts input[name="' + id + '"]'); if (box) box.checked = true; }
  function initShop() {
    renderShop();
    var form = $('#orderForm');
    if (form) {
      var sum = $('#orderSummary'), msg = $('.formmsg', form);
      var update = function () {
        var b = $('input[name="bundle"]:checked', form), pl = $('input[name="plan"]:checked', form);
        var bn = b ? $('.item__name', b.closest('.item')).textContent : 'The Single';
        if (sum) sum.innerHTML = bn + ', ' + (pl && pl.value === 'sub' ? 'subscribe &amp; save' : 'one<span class="hy">-</span>time order');
        if (msg) msg.textContent = '';
      };
      form.addEventListener('change', update);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (msg) msg.textContent = 'Prototype: checkout isn’t connected yet, so nothing was added. Prices and terms are still to come.';
      });
      update();
    }
    var wl = $('#waitlist');
    if (wl) {
      var wmsg = $('.formmsg', wl), email = $('input[type="email"]', wl);
      var say = function (text, err) { wmsg.textContent = text; wmsg.classList.toggle('is-error', !!err); };
      email.addEventListener('input', function () { if (email.getAttribute('aria-invalid') === 'true') { email.removeAttribute('aria-invalid'); say('', false); } });
      wl.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = email.value.trim();
        if (!v) { email.setAttribute('aria-invalid', 'true'); say('Please add your email address so we can save your lounger.', true); email.focus(); return; }
        if (!email.checkValidity() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { email.setAttribute('aria-invalid', 'true'); say('That email address doesn’t look quite right. Please check it and try again.', true); email.focus(); return; }
        email.removeAttribute('aria-invalid');
        if (!$$('#waitlistOpts input:checked').length) { say('Choose at least one cabana to hear about.', true); var first = $('#waitlistOpts input'); if (first) first.focus(); return; }
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
    var behind = ['#main', '.foot', '.shopbar', '.proto-chip', '.announce'];
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
    }
  }
  var navEl = $('#nav'), navScrolled = false;
  function navWrite(st) { var s = st.sy > 8; if (s !== navScrolled) { navScrolled = s; navEl.classList.toggle('is-scrolled', s); } }

  /* ───────────────────────── 14 · One frame loop for every scroll-linked effect ─────────────────────────
     Reads first, then writes. It idles when nothing animated is on screen (no water window, no hero)
     and wakes on scroll, resize and pointer ripples.                                                  */
  var lastT = 0, running = false, idle = 0;
  function kick() { if (running) return; running = true; idle = 0; lastT = 0; requestAnimationFrame(loop); }
  function loop(ts) {
    var st = { t: ts / 1000, dt: lastT ? ts - lastT : 16, sy: window.scrollY };
    lastT = ts;
    // read
    heroRead(); parallaxRead(); barRead();
    if (Sun) Sun.read();
    if (Water) Water.measure(st);
    // write
    heroWrite(st); parallaxWrite(); barWrite(); navWrite(st);
    if (Sun) Sun.write();
    if (Water) Water.render(st);
    var busy = !reduce && ((Water && Water.visible) || heroState.visible) || (Water && Water.easing) ||
      (reduce && heroState.visible && performance.now() < cast.until);   // still frames: until the shadow has caught up
    if (busy) idle = 0; else if (++idle > 2) { running = false; return; }
    requestAnimationFrame(loop);
  }
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick, { passive: true });

  /* ───────────────────────── 15 · Boot ───────────────────────── */
  function boot() {
    html.classList.add('app-ready');
    applyAccent(state.product);
    initCabanas();
    initLabel();
    icons();
    initNav();
    initRipples();
    initAmenities();
    initShop();
    initFaq();
    initReveal();
    if (Sun) Sun.layout();             // the icons are in: measure the Sun Index again
    mountCandy(heroMount, $('#heroFallback'), {
      zoom: 1,
      onRender: heroRendered,          // copy each new frame for the pool-floor shadow
      onBite: function (e) { heroBitten(e); headRipple(0.6); silWake(); kick(); },
      onPoke: function () { headRipple(0.35); silWake(); kick(); },
      onRegrow: function () { cast.craters.length = 0; silWake(); kick(); }
    }, function (api, p) {
      heroApi = api; candies.push(api);
      if (state.product !== p) api.setProduct({ kind: state.product.kind, color: state.product.candy }, { duration: 0.6 });
      silWake(2400);
      heroState.drop0 = performance.now(); if (heroFloat) heroFloat.classList.add('is-ready'); kick();
    }, function () { cast.fallback = true; kick(); });   // no 3D: the CSS stand-in casts the shadow instead
    mountCandy(cabMount, null, { zoom: 1, pointerTilt: false, interactive: false, quality: coarse ? 'low' : 'medium' }, function (api, p) {
      cab.api = api; cab.kind = p.kind; cab.color = p.candy;
      cabanaCandyTo(state.product, 'now');
      if (cabRow) cabRow.classList.add('has-3d');
    });
    window.addEventListener('resize', function () { silWake(); }, { passive: true });
    kick();
    // QA / review hook
    window.__riviera = {
      setProduct: setProduct, products: PRODUCTS, water: Water, kick: kick, sun: Sun, get loopRunning() { return running; },
      get heroCandy() { return heroApi; }, get cabanaCandy() { return cab.api; },
      shadowState: function () {
        var sh = Water && Water.shadow;
        return {
          on: !!sh, box: sh ? sh.box.map(Math.round) : null, blur: sh ? +sh.blur.toFixed(1) : 0, a: sh ? +sh.a.toFixed(3) : 0,
          clip: sh ? Math.round(sh.clip) : null, fallback: cast.fallback,
          lenses: cast.lensN, craters: cast.leakN, kind: cast.kind, copies: cast.n, copyMs: cast.n ? +(cast.ms / cast.n).toFixed(3) : 0,
          canvas: cast.cv ? cast.cv.width + 'x' + cast.cv.height : null, water: Water ? Water.silStats() : null
        };
      }
    };
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})();
