/* Glo Pop · Proposal 03 · "Glow Lab" (classic script: works from file:// and http)
 *
 * One PRODUCTS array drives everything product-shaped: the switchers, the hero copy + live
 * readout, the 3D candy, the formula explorer, the audit state, the facts panel, the library
 * cards and the shop. Adding a product = adding one object below.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function ph(t) { return '<span class="ph">' + t + '</span>'; }
  // an unknown big readout number: the word itself is the tag (no superscript), set small on the numeral baseline
  function tbd() { return '<span class="ph ph--tbd">TBD</span>'; }

  /* ======================================================================
     1. DATA
     ====================================================================== */
  var DOSE = ph('— mg');
  var PACK = '../_shared/assets/product/';
  function xref(i) { return '<a class="xref" href="#formula" data-xref="' + i + '">A-0' + (i + 1) + '</a>'; }
  function src(name, from) { return name + ' <span class="ft-src">(' + from + ')</span>'; }

  // GP-01 · Collagen Boost: the seven actives in the pack's own wording (client pack, Nov 2026). Amounts per pop
  // aren't confirmed, so every dose stays a visible placeholder. Benefit lines keep "supports" wording + the FDA asterisk.
  var GP01_ACTIVES = [
    { code: 'A-01', name: 'Peptides', role: 'Bounce',
      does: 'Support skin’s natural firmness and elasticity, for a plump, youthful-looking complexion.',
      why: 'First on the pack’s list, and the backbone of Collagen Boost.',
      chips: [['sparkles', 'Firm &amp; Plump'], ['waves', 'Elasticity']] },
    { code: 'A-02', name: 'Hyaluronic Acid', role: 'Moisture',
      does: 'Helps lock in moisture for plump, dewy skin that glows from the inside out.',
      why: 'The peptides’ hydration partner: the plump, dewy half of the glow.',
      chips: [['droplet', 'Hydration'], ['sun', 'Dewy Glow']] },
    { code: 'A-03', name: 'Vitamin C', role: 'Brightness',
      does: 'Helps brighten your complexion and defend against free radicals and everyday environmental stress.',
      why: 'The brightening half of the glow, with antioxidant backup.',
      chips: [['sun', 'Brightening'], ['shield', 'Antioxidant']] },
    { code: 'A-04', name: 'Vitamin B6', role: 'Renewal',
      does: 'Supports clear, radiant skin by helping your body’s natural renewal processes.',
      why: 'Clear skin is a team effort. B6 is on the team.',
      chips: [['smile', 'Clear Skin'], ['refresh-cw', 'Renewal']] },
    { code: 'A-05', name: 'Vitamin B12', role: 'Energy',
      does: 'Supports energy and healthy metabolism, so you feel as good as you look.',
      why: 'Because feeling good is part of looking good.',
      chips: [['zap', 'Energy'], ['activity', 'Metabolism']] },
    { code: 'A-06', name: 'Vitamin B8 (biotin)', role: 'Hair &amp; Nails',
      does: 'Supports healthy-looking hair, skin and nails.',
      why: 'The B vitamin you already know from hair and nail routines.',
      chips: [['feather', 'Hair'], ['hand', 'Nails']] },
    { code: 'A-07', name: 'Zinc', role: 'Repair',
      does: 'Supports immune function and skin repair for a healthy, balanced complexion.',
      why: 'The quiet workhorse: immune support plus skin repair.',
      chips: [['shield-check', 'Immunity'], ['heart-pulse', 'Skin Repair']] }
  ];

  // GP-02 · Super Greens Gummies: straight off the client's new full label (Nov 2026). Names, amounts, % DV and
  // sources exactly as printed. No per-nutrient benefit copy has been supplied, so "What it does" stays a placeholder.
  var SG_BLEND = 'Organic Kale Leaf (Brassica oleracea var. acephala DC); Organic Broccoli Stalk and Flower (Brassica oleracea L. var. italica Planch); Organic Beet Root (Beta vulgaris L.); Organic Spinach (Spinacia oleracea L.); Wild Blueberry (Vaccinium angustifolium); Organic Elderberry (Sambucus nigra); Lemon (Citrus limon L.); Organic Carrot Root (Daucus carota L. var. sativus); Maltitol; Organic Wild Blueberry (Vaccinium angustifolium); Organic Acai Berry (Euterpe oleracea Mart.); Organic Pomegranate Fruit (Punica granatum L.); Organic Goji Juice (Lycium chinense); Organic Spirulina (Spirulina); Organic Noni Fruit (Morinda citrifolia); Organic Acai Berry (Euterpe oleracea Mart.); Pea (Pisum sativum); L-ascorbyl palmitate and Natural Flavors.';
  var GP02_ACTIVES = [
    { code: 'A-01', name: 'Riboflavin', kind: 'B vitamin · B2', dose: '0.8 mg', dv: '62%', src: 'from Organic Sugar Cherries Blend',
      is: 'Vitamin B2, one of five B vitamins on the label.' },
    { code: 'A-02', name: 'Niacin', kind: 'B vitamin · B3', dose: '1.4 mg NE', dv: '9%', src: 'from Organic Beetroot',
      is: 'Vitamin B3, measured in niacin equivalents (NE).' },
    { code: 'A-03', name: 'Vitamin B6', kind: 'B vitamin · B6', dose: '0.6 mg', dv: '35%', src: 'from Organic Sugar Cherries Blend',
      is: 'One of five B vitamins on the label. Collagen Boost has B6 too.' },
    { code: 'A-04', name: 'Folate', kind: 'B vitamin · B9', dose: '80 mcg DFE (50 mcg Folic Acid)', tag: '80 mcg DFE', dv: '20%', src: 'from Organic Sugar Cherries Blend',
      is: 'Vitamin B9, measured in dietary folate equivalents (DFE).' },
    { code: 'A-05', name: 'Pantothenic Acid', kind: 'B vitamin · B5', dose: '0.9 mg', dv: '18%', src: 'from Organic Sugar Cherries Blend',
      is: 'Vitamin B5, one of five B vitamins on the label.' },
    { code: 'A-06', name: 'Iron', kind: 'Mineral', dose: '0.7 mg', dv: '4%', src: 'from Organic Sugar Cherries Blend',
      is: 'A mineral, listed in the Supplement Facts.' },
    { code: 'A-07', name: 'Iodine', kind: 'Mineral', dose: '17 mcg', dv: '11%', src: 'from Organic Kelp',
      is: 'A mineral, listed in the Supplement Facts.' },
    { code: 'A-08', name: 'The blend', kind: 'Listed under the facts', tag: 'As listed', dose: 'Not listed', dv: '—',
      is: SG_BLEND, note: 'As printed under the Supplement Facts. The label gives no amount for the blend.' }
  ];

  var PRODUCTS = [
    {
      id: 'strawberry-pop', code: 'GP-01', kind: 'lollipop', status: 'available',
      name: 'Strawberry Beauty Lollipop', short: 'Collagen Boost', flavor: 'Strawberry',
      color: '#FF1493', deep: '#7A1B4D', tint: '#FFE4F1', swatch: '#FF1493',
      statusLabel: 'Available now', statusShort: 'Available',
      theme: { 'accent': '#FF1493', 'accent-ink': '#C4006E', 'accent-deep': '#7A1B4D', 'accent-tint': '#FFE4F1', 'accent-wash': '#FFF3F8',
               'paper': '#FAF8F7', 'paper-2': '#F4EEF0', 'line': '#E9E2E5', 'line-2': '#DCD1D6', 'ink-2': '#4B3842', 'ink-3': '#76626C' },
      copy: {
        eyebrow: 'GP-01 · Collagen Boost · Available now',
        lead: 'The most delicious skincare: Collagen Boost, a sugar-free strawberry beauty lollipop with peptides, hyaluronic acid, zinc and four vitamins, biotin included.',
        cta: 'Shop GP-01',
        explorerTitle: 'Seven actives. One very good lollipop.',
        explorerLead: 'Select an active to see what it does, why it made the cut, and how much goes into every pop.',
        activesMeta: '7 actives',
        auditMeta: 'GP-01 · 10 checks',
        auditTitle: 'Sugar free. Still sweet. Still&nbsp;strawberry.',
        auditLead: 'Sugar free is the only sugar claim on the pack, so it’s the only one we make. Every claim here is checked against the pack itself.<span class="audit-hint"> Scroll to run the checks.</span>',
        auditLabel: 'Checks passed',
        specimenTag: 'GP-01 · Pack front',
        shopCap: 'Collagen Boost pouch · 10 pops per bag',
        stickySub: '10 pops · free shipping',
        stickyCta: 'Shop'
      },
      // the hero readout: the pack's own facts (no calories: they aren't confirmed)
      spec: { name: 'Collagen Boost · Strawberry', netLabel: 'Net wt.', net: 15, netUnit: 'g', netSub: 'per pop',
              actives: 7, activesUnit: 'actives', activesSub: 'biotin (B8) included',
              sugar: 'Sugar free', sugarSub: ph('Sweetener'), count: 10, countUnit: 'per bag', countSub: 'one a day' },
      actives: GP01_ACTIVES,
      // pack audit: every claim checked against the pack front; boxes are % of pack-front.jpg (638×1036)
      audit: {
        word: 'On pack', specimen: 'front',
        lb: { href: PACK + 'pack-front.jpg', fig: 'Fig. 04', name: 'Collagen Boost · pack front', w: 638, h: 1036,
              alt: 'Front of the Collagen Boost pack: peptides, vitamins C, B6, B12 and B8 (biotin), hyaluronic acid and zinc; sugar free; strawberry flavor; net wt. 15 g' },
        groups: ['On the front', 'Actives, as printed'], split: 3,
        checks: [
          ['Sugar free', 'The only sugar claim on the pack, so it’s the only one we make. Sweetener: ' + ph('to be confirmed') + '.', [19.6, 86.3, 13.2, 5]],
          ['Strawberry flavor', 'Printed beside the strawberry, bottom left.', [2.4, 88.6, 18.6, 8.4]],
          ['Net wt. 15 g', 'That’s one pop. Ten pops to a bag.', [33, 89.6, 34, 4.9]],
          ['Peptides', 'Top of the list. Formula map ' + xref(0) + '.', [18.6, 53.9, 17.2, 3]],
          ['Vitamin C', 'Brightness. Formula map ' + xref(2) + '.', [19, 57.2, 15.6, 5]],
          ['Vitamin B6', 'Renewal. Formula map ' + xref(3) + '.', [19, 63.4, 15.6, 5]],
          ['Vitamin B12', 'Energy. Formula map ' + xref(4) + '.', [19, 69.6, 15.6, 5]],
          ['Vitamin B8 (biotin)', 'Hair &amp; nails. Formula map ' + xref(5) + '.', [19, 76, 15.6, 7]],
          ['Hyaluronic acid', 'Moisture. Formula map ' + xref(1) + '.', [57, 74.8, 20, 13.6]],
          ['Zinc', 'Repair. Formula map ' + xref(6) + '.', [77, 74.8, 15, 11.8]]
        ]
      },
      facts: {
        serving: '1 lollipop (15 g)', servings: '10',
        caption: 'GP-01 Collagen Boost, amounts per serving',
        rows: [['Peptides', DOSE, ph('—')], ['Hyaluronic acid', DOSE, ph('—')], ['Vitamin C', DOSE, ph('—')], ['Vitamin B6', DOSE, ph('—')],
               ['Vitamin B12', DOSE, ph('—')], ['Vitamin B8 (biotin)', DOSE, ph('—')], ['Zinc', DOSE, ph('—')]],
        other: '<b>Other ingredients:</b> ' + ph('sweetener and full ingredient list') + '.',
        flags: 'Sugar free. Gluten-free. Allergens: ' + ph('to be confirmed') + '.'
      },
      card: { kind: 'Strawberry Beauty Lollipop', art: 'lolly', tag: 'GP-01 · rendered',
              facts: [['Format', 'Lollipop, 15 g'], ['Flavor', 'Strawberry'], ['Actives', '7'], ['Sugar', 'Sugar free'], ['Count', '10 per bag']],
              go: 'Shop GP-01', goIcon: 'arrow-right' }
    },
    {
      id: 'green-gummies', code: 'GP-02', kind: 'gummy', status: 'coming-soon',
      name: 'Super Greens Gummies', short: 'Super Greens Gummies', flavor: 'Strawberry-Watermelon',
      color: '#1FA453', deep: '#0E4D2C', tint: '#E3F6EA', swatch: '#1FA453',
      statusLabel: 'Coming soon', statusShort: 'Soon',
      theme: { 'accent': '#1FA453', 'accent-ink': '#0D7A3C', 'accent-deep': '#0E4D2C', 'accent-tint': '#DCF3E4', 'accent-wash': '#EFF9F3',
               'paper': '#F4F9F6', 'paper-2': '#EAF2ED', 'line': '#DDE7E1', 'line-2': '#CBD9D0', 'ink-2': '#36463D', 'ink-3': '#5E6E65' },
      // known (client's full label, Nov 2026): name, flavor, badges, front claims, serving, count, the full Supplement Facts.
      // still unknown, kept as visible placeholders: price, launch date, final gummy shape.
      copy: {
        eyebrow: 'GP-02 · Super Greens Gummies · Coming soon',
        lead: 'Super Greens Gummies in strawberry-watermelon: vegan friendly, gluten free and non GMO, with kale, broccoli, spinach, wild blueberries and elderberry on the label. Price and launch date are ' + ph('to be announced') + '.',
        cta: 'Join the waitlist',
        explorerTitle: 'Straight off the&nbsp;label.',
        explorerLead: 'Five B vitamins, iron, iodine and the blend, each per 2-gummy serving as printed. What each one does stays blank until it’s confirmed. Sodium and potassium are in the full panel.',
        activesMeta: 'From the label',
        auditMeta: 'GP-02 · 10 checks',
        auditTitle: 'Vegan friendly. Gluten free. Non&nbsp;GMO.',
        auditLead: 'Ten claims from the Super Greens Gummies label, checked against the label itself. Not sugar free: 3 g of sugars per serving.<span class="audit-hint"> Scroll to run the checks.</span>',
        auditLabel: 'Checks passed',
        specimenTag: 'GP-02 · Full label',
        shopCap: 'GP-02 · concept illustration, not the final product',
        stickySub: 'Strawberry-watermelon',
        stickyCta: 'Waitlist',
        waitKicker: 'GP-02 · Super Greens Gummies · Coming soon',
        waitTitle: 'Be first in line for Super Greens Gummies.',
        waitCopy: 'Strawberry-watermelon gummies, two a day, 60 to a pack. Vegan friendly, gluten free and non GMO, as printed on the label. Price and launch date are still ' + ph('to be announced') + '. Join the waitlist and hear the moment they’re real.',
        waitCta: 'Join the waitlist'
      },
      spec: { name: 'Super Greens Gummies · Strawberry-Watermelon', netLabel: 'Energy', net: 20, netUnit: 'kcal', netSub: 'per 2-gummy serving',
              actives: 5, activesUnit: 'B vitamins', activesSub: '+ iron, iodine &amp; the blend',
              sugar: '3 g', sugarSub: 'sugars per serving, all added', count: 60, countUnit: 'gummies', countSub: '30 servings · 2 a day' },
      actives: GP02_ACTIVES,
      // label audit: claims checked against the full wrap label; boxes are % of super-greens-label.jpg (1600×613)
      audit: {
        word: 'On label', specimen: 'label',
        lb: { href: PACK + 'super-greens-label.jpg', fig: 'Fig. 04', name: 'Super Greens Gummies · full label', w: 1600, h: 613,
              alt: 'The full Super Greens Gummies label, with Supplement Facts, suggested use and warnings' },
        groups: ['On the label', 'Pack &amp; serving'], split: 6,
        checks: [
          ['Vegan friendly', 'Badge, top left of the label.', [4.4, 12.4, 6.6, 17.2]],
          ['Gluten free', 'Badge, top left.', [12.7, 12.4, 6.6, 17.2]],
          ['Non GMO', 'Badge, top left, and again on the front.', [21, 12.4, 6.6, 17.2]],
          ['No astragalus &amp; adaptogens', 'Across the front panel, as printed.', [39.4, 57.6, 22, 4.6]],
          ['Healthy gut<sup class="fn">*</sup>', 'Front panel.', [38, 64.6, 7.6, 15.4]],
          ['Immune support<sup class="fn">*</sup>', 'Front panel.', [46.6, 64.6, 8.4, 15.4]],
          ['Strawberry &amp; watermelon', 'Natural flavors, in the other ingredients.', [73, 81.6, 11.6, 2.6]],
          ['60 gummies', 'Dietary supplement, per the front panel.', [39.4, 87.4, 21.2, 5.8]],
          ['Two a day', 'Suggested use: “Take two (2) gummies daily.”', [3.6, 38, 12.8, 3.6]],
          ['30 servings', 'Servings per container, in the Supplement Facts.', [76.6, 10.2, 6.8, 2.4]]
        ]
      },
      // the client's Supplement Facts label, verbatim (names, amounts, % DV, symbols and sources as printed)
      facts: {
        serving: '2 Gummies', servings: '30',
        caption: 'GP-02 Super Greens Gummies, amounts per serving',
        rows: [['Calories', '20', '', 'ft-kcal'],
               ['Total Carbohydrate', '5 g', '2%'], ['Total Sugars', '3 g', '*', 'ft-sub'], ['Added Sugars', '3 g', '6%', 'ft-sub2'],
               [src('Riboflavin', 'from Organic Sugar Cherries Blend'), '0.8 mg', '62%'],
               [src('Niacin', 'from Organic Beetroot'), '1.4 mg NE', '9%'],
               [src('Vitamin B6', 'from Organic Sugar Cherries Blend'), '0.6 mg', '35%'],
               [src('Folate', 'from Organic Sugar Cherries Blend'), '80 mcg DFE <span class="ft-paren">(50 mcg Folic Acid)</span>', '20%'],
               [src('Pantothenic Acid', 'from Organic Sugar Cherries Blend'), '0.9 mg', '18%'],
               [src('Iron', 'from Organic Sugar Cherries Blend'), '0.7 mg', '4%'],
               [src('Iodine', 'from Organic Kelp'), '17 mcg', '11%'],
               [src('Sodium', 'from Electrolyte Blend'), '15 mg', '&lt;1%'],
               [src('Potassium', 'from Electrolyte Blend'), '17 mg', '&lt;1%']],
        blend: SG_BLEND,
        foot: '** Percent Daily Values are based on a 2,000 calorie diet<br>† Daily Value not established',
        other: '<b>Other Ingredients:</b> Tapioca Syrup, Sugar, Pectin, Citric Acid, Orange Juice Concentrate, Sodium Citrate, Natural Flavor (Strawberry, Watermelon), Palm Oil, Carnauba Wax, Color Added (Purple Carrot Juice Concentrate), Stevia Leaf.',
        flags: 'Vegan friendly · Gluten free · Non GMO, as printed on the label.'
      },
      card: { kind: 'Dietary supplement gummies', art: 'gummy', tag: 'Concept render',
              facts: [['Format', 'Gummy'], ['Flavor', 'Strawberry-Watermelon'], ['Pack', '60 gummies'], ['Serving', '2 a day'], ['Launch', ph('Date')]],
              go: 'Join the waitlist', goIcon: 'bell' }
    },
    {
      id: 'next-pop', code: 'GP-03', kind: 'lollipop', status: 'in-development',
      name: null, short: 'More colors', flavor: null,
      color: '#F26A1B', deep: '#7A2E0A', tint: '#FFE9DB',
      swatch: 'conic-gradient(from 200deg, #F26A1B, #8B3FD6, #0E9CAD, #F26A1B)',
      statusLabel: 'In development', statusShort: 'In dev',
      theme: { 'accent': '#F26A1B', 'accent-ink': '#B04A0C', 'accent-deep': '#7A2E0A', 'accent-tint': '#FFE6D6', 'accent-wash': '#FFF4EC',
               'paper': '#FBF8F5', 'paper-2': '#F5EEE8', 'line': '#EBE2DA', 'line-2': '#DED2C7', 'ink-2': '#4A3A30', 'ink-3': '#776559' },
      copy: {
        eyebrow: 'GP-03 · More colors · In development',
        lead: 'More lollipop colorways are in development. Names, flavors and actives are ' + ph('to be announced') + '. No invented flavors, promise.',
        cta: 'Get notified',
        explorerTitle: 'The formula is still in the&nbsp;lab.',
        explorerLead: 'GP-03 is in development, so its formula map stays blank. We’d rather show nothing than guess.',
        activesMeta: ph('Actives'),
        auditMeta: 'GP-03 · Pending',
        auditTitle: 'No pack yet. Nothing to&nbsp;check.',
        auditLead: 'GP-03 is in development, so there’s no pack to audit. The checks run once there is one.',
        auditLabel: 'Audit pending',
        auditSr: 'Audit pending for GP-03: there is no pack yet.',
        specimenTag: 'GP-03 · No pack yet',
        shopCap: 'GP-03 · concept silhouettes, colors not final',
        stickySub: 'In development',
        stickyCta: 'Notify me',
        waitKicker: 'GP-03 · More colors · In development',
        waitTitle: 'More colors are on the way.',
        waitCopy: 'New lollipop colorways are in development. Names and flavors stay off the label until they’re real. Leave your email to hear first.',
        waitCta: 'Get notified'
      },
      spec: { name: 'New colorways · ' + ph('Names'), netLabel: 'Net wt.', net: tbd(), netUnit: '', netSub: 'per pop',
              actives: tbd(), activesUnit: 'actives', activesSub: 'to be announced',
              sugar: tbd(), sugarSub: 'to be confirmed', count: tbd(), countUnit: 'per bag', countSub: 'dose to be confirmed' },
      actives: null,
      audit: null,
      facts: {
        serving: ph('Serving size'), servings: ph('—'),
        rows: [['Actives', ph('To be announced'), ph('—')]],
        other: '<b>Other ingredients:</b> ' + ph('full ingredient list') + '.',
        flags: 'Dietary notes: ' + ph('to be confirmed') + '.'
      },
      card: { kind: 'New lollipop colorways', art: 'next', tag: 'Silhouettes · colors TBD',
              facts: [['Format', 'Lollipop'], ['Colors', ph('Colors')], ['Flavors', ph('Flavors')], ['Actives', ph('Actives')], ['Launch', ph('Date')]],
              go: 'Get notified', goIcon: 'bell' }
    }
  ];
  var byId = {};
  PRODUCTS.forEach(function (p) { byId[p.id] = p; });
  var current = PRODUCTS[0];

  /* ======================================================================
     2. ICONS (Lucide 0.460.0 icon nodes -> inline SVG strings)
     ====================================================================== */
  function icon(name) {
    var L = window.lucide && window.lucide.icons;
    if (!L) return '';
    var key = name.replace(/(^|-)([a-z0-9])/g, function (m, a, b) { return b.toUpperCase(); });
    var node = L[key];
    if (!node) return '';
    var kids = node[2] || [];
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="lucide lucide-' + name + '">';
    kids.forEach(function (k) {
      s += '<' + k[0];
      for (var a in k[1]) if (Object.prototype.hasOwnProperty.call(k[1], a)) s += ' ' + a + '="' + k[1][a] + '"';
      s += '/>';
    });
    return s + '</svg>';
  }
  function iconsIn(scope) {
    $$('i[data-lucide]', scope).forEach(function (i) {
      var svg = icon(i.getAttribute('data-lucide'));
      if (svg) i.outerHTML = svg;
    });
  }

  /* ======================================================================
     3. SMALL MOTION HELPERS
     ====================================================================== */
  // crossfade an element to new HTML; rapid re-swaps always land on the LATEST value
  function swapHTML(el, html, animate) {
    if (!el) return;
    el._cnt = (el._cnt || 0) + 1;                       // cancels any running counter on this element
    var pending = el._swapTo != null ? el._swapTo : el.innerHTML;
    if (pending === html) return;
    el._swapTo = html;
    if (!animate || reduce || !el.animate) {
      if (el._swapOut) { el._swapOut.cancel(); el._swapOut = null; }
      el.innerHTML = html; el._swapTo = null;
      return;
    }
    if (el._swapOut) return;                            // a fade-out is running; it will commit the latest target
    var out = el._swapOut = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    out.onfinish = function () {
      if (el._swapTo != null) el.innerHTML = el._swapTo;
      el._swapTo = null; el._swapOut = null;
      out.cancel();
      el.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
    };
  }

  var GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  function scramble(el, text, dur) {
    if (!el) return;
    if (reduce || el.textContent === text) { el.textContent = text; return; }
    dur = dur || 560;
    var t0 = performance.now(), id = (el._scr = (el._scr || 0) + 1), n = text.length;
    (function f(now) {
      if (el._scr !== id) return;
      var k = clamp((now - t0) / dur, 0, 1), out = '';
      for (var i = 0; i < n; i++) {
        var ch = text.charAt(i);
        out += (/[\s\-·.]/.test(ch) || k > 0.2 + (i / n) * 0.8) ? ch : GLYPHS.charAt((Math.random() * GLYPHS.length) | 0);
      }
      el.textContent = out;
      if (k < 1) requestAnimationFrame(f); else el.textContent = text;
    })(t0);
  }

  function countTo(el, to, dur) {
    if (!el) return;
    var fmt = function (v) { return to < 10 ? pad2(v) : String(v); };
    if (el._swapOut) { el._swapOut.cancel(); el._swapOut = null; }
    el._swapTo = null;
    var id = el._cnt = (el._cnt || 0) + 1;              // a newer swap/count on this element cancels this one
    if (reduce) { el.textContent = fmt(to); return; }
    var t0 = performance.now();
    dur = dur || 1100;
    (function f(now) {
      if (el._cnt !== id) return;
      var k = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 4);
      el.textContent = fmt(Math.round(to * e));
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }

  /* ======================================================================
     4. THEME + PRODUCT STATE
     ====================================================================== */
  var live = document.createElement('p');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  document.body.appendChild(live);

  function applyTheme(p) {
    var t = p.theme;
    Object.keys(t).forEach(function (k) { root.style.setProperty('--' + k, t[k]); });
    root.setAttribute('data-product', p.id);
    root.setAttribute('data-kind', p.kind);
    root.setAttribute('data-status', p.status);
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t.paper);
  }

  function syncPressed() {
    $$('button[data-product][aria-pressed]').forEach(function (b) {
      var on = b.getAttribute('data-product') === current.id;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      var t = $('.lc-sel-txt', b);
      if (t) t.textContent = on ? 'Viewing' : 'View formula';
    });
    $$('.lib-card').forEach(function (c) { c.classList.toggle('is-current', c.getAttribute('data-card') === current.id); });
  }

  function renderBindings(p, animate) {
    var c = p.copy, fallback = PRODUCTS[1].copy;   // wait-form copy defaults to the gummies waitlist
    $$('[data-bind]').forEach(function (el) {
      var key = el.getAttribute('data-bind');
      if (key === 'code') { scramble(el, p.code); return; }
      if (key === 'short') { swapHTML(el, p.short, animate); return; }
      var v = c[key] != null ? c[key] : fallback[key];
      if (v != null) swapHTML(el, v, animate);
    });
  }

  var candy = null;
  function setProduct(id, opts) {
    var p = byId[id];
    if (!p) return;
    opts = opts || {};
    var changed = p !== current;
    current = p;
    applyTheme(p);
    syncPressed();
    if (!changed && !opts.force) return;
    var anim = !opts.instant;
    renderBindings(p, anim);
    renderReadout(p, anim);
    if (Explorer) Explorer.render(p, anim);
    renderFacts(p);
    if (Audit) Audit.setProduct(p);
    renderShop(p);
    if (candy) { candy.setProduct({ kind: p.kind, color: p.color }, { duration: 0.9 }); fitCandy(p, anim); tuneCandy(1600); }
    if (changed) live.textContent = 'Showing ' + p.code + ', ' + p.short + ': ' + p.statusLabel + '.';
    // each formula's panels, label rows and specimen run to different heights: re-measure the scroll scenes once they settle
    if (hasGSAP) { clearTimeout(refreshT); refreshT = setTimeout(function () { ScrollTrigger.refresh(); }, 800); }
  }
  var refreshT = 0;

  // one delegated handler for every product control on the page
  document.addEventListener('click', function (e) {
    var sw = e.target.closest('button[data-product]');
    if (sw) { setProduct(sw.getAttribute('data-product')); return; }
    var go = e.target.closest('[data-product-go]');
    if (go) { setProduct(go.getAttribute('data-product-go')); return; }   // link continues to #shop
    var xr = e.target.closest('[data-xref]');
    if (xr && Explorer) {                                                 // A-01 etc. are GP-01's actives: open that one, link scrolls to #formula
      if (current.id !== 'strawberry-pop') setProduct('strawberry-pop');
      Explorer.open(+xr.getAttribute('data-xref'));
      return;
    }
    var jump = e.target.closest('[data-product-jump]');
    if (jump) {
      setProduct(jump.getAttribute('data-product-jump'));
      var f = current.status === 'available' ? $('[data-cfg="buy"] input[name="tier"]:checked') : $('[data-cfg="wait"] input[type="email"]');
      if (f) f.focus({ preventScroll: true });
    }
  });

  /* ======================================================================
     5. SWITCHERS (hero library + shop formula picker), rendered from data
     ====================================================================== */
  function renderSwitchers() {
    var list = $('[data-switcher]');
    if (list) {
      list.innerHTML = PRODUCTS.map(function (p) {
        return '<button type="button" class="sw" data-product="' + p.id + '" data-kind="' + p.kind + '" aria-pressed="false" style="--sw:' + p.swatch + '">' +
          '<span class="sw-swatch" aria-hidden="true"></span>' +
          '<span class="sw-text"><span class="sw-code mono">' + p.code + '</span><span class="sw-name">' + p.short + '</span></span>' +
          '<span class="sw-status mono">' + p.statusShort + '</span></button>';
      }).join('');
    }
    var cf = $('[data-cfg-formula]');
    if (cf) {
      cf.innerHTML = PRODUCTS.map(function (p) {
        return '<button type="button" class="cf" data-product="' + p.id + '" data-kind="' + p.kind + '" aria-pressed="false" style="--sw:' + p.swatch + '">' +
          '<span class="sw-swatch" aria-hidden="true"></span><span class="cf-text"><span class="mono">' + p.code + '</span><span class="cf-name">' + p.short + '</span></span></button>';
      }).join('');
    }
  }

  /* ======================================================================
     6. HERO READOUT
     ====================================================================== */
  function ro(key) { return $('[data-ro="' + key + '"]'); }
  function setRONum(key, v, animate) {
    var el = ro(key);
    if (!el) return;
    if (typeof v === 'number') {
      if (animate) countTo(el, v, 900);
      else el.textContent = v < 10 ? pad2(v) : String(v);
    } else swapHTML(el, v, animate);
  }
  function renderReadout(p, animate) {
    var s = p.spec;
    scramble(ro('code'), p.code);
    swapHTML(ro('name'), s.name, animate);
    swapHTML(ro('netLabel'), s.netLabel, animate);       // GP-01 reads its net weight, GP-02 its label calories
    setRONum('net', s.net, animate);
    setRONum('actives', s.actives, animate);
    setRONum('count', s.count, animate);
    swapHTML(ro('netUnit'), s.netUnit || '', animate);
    swapHTML(ro('activesUnit'), s.activesUnit || 'actives', animate);
    swapHTML(ro('countUnit'), s.countUnit || 'per bag', animate);
    swapHTML(ro('sugar'), s.sugar, animate);
    ['netSub', 'activesSub', 'sugarSub', 'countSub'].forEach(function (k) { swapHTML(ro(k), s[k], animate); });
  }
  function introReadout() {
    var p0 = current, s = p0.spec;
    ['net', 'actives', 'count'].forEach(function (k, i) {
      var el = ro(k);
      if (!el || typeof s[k] !== 'number') return;
      if (reduce) { el.textContent = s[k] < 10 ? pad2(s[k]) : String(s[k]); return; }
      el.textContent = s[k] < 10 ? '00' : '0';
      setTimeout(function () { if (current === p0) countTo(el, s[k], 1200); }, 520 + i * 90);
    });
    var code = ro('code');
    if (code && !reduce) { code.textContent = '-----'; setTimeout(function () { if (current === p0) scramble(code, p0.code, 900); }, 420); }
  }

  /* ======================================================================
     7. 3D CANDY ON THE STAGE (+ live θ readout)
     ====================================================================== */
  function initCandy() {
    var mount = $('#stage3d'), stage = $('.stage'), poster = $('.stage-poster');
    if (!mount || !window.GloCandy) return;
    window.GloCandy.create(mount, {
      preset: 'gloss',
      product: { kind: current.kind, color: current.color },
      spin: 0.0026, tilt: 0.24, zoom: 0.95, exposure: 0.92,
      env: ['#ffffff', '#f7f4f5', '#f6eef2', '#efe6eb'],
      fallback: poster
    }).then(function (api) {
      if (!api) return;
      candy = api;
      if (api.product.kind !== current.kind || api.product.color !== current.color) api.setProduct({ kind: current.kind, color: current.color });
      fitCandy(current, false);
      tuneCandy(0);
      requestAnimationFrame(function () { stage.classList.add('is-live'); });
      startTheta(api);
    });
  }

  // deeper, juicier hard-candy color than the shared 'gloss' default: less flat emissive, less pale sheen.
  // Runs briefly after each swap because the shared lib builds a fresh material for a new model.
  // (Gummies are bump-mapped and the stick is pure white; both are left alone, so the stick stays white.)
  function tuneCandy(ms) {
    if (!candy || !candy.scene) return;
    var t0 = performance.now();
    (function f(now) {
      candy.scene.traverse(function (o) {
        var m = o.isMesh && o.material;
        if (!m || m.userData.glTuned || m.bumpMap || !m.clearcoat) return;
        if (m.color.r === 1 && m.color.g === 1 && m.color.b === 1) return;
        m.emissiveIntensity = 0.24;
        m.sheen = 0.35;
        m.userData.glTuned = true;
      });
      if (now - t0 < ms) requestAnimationFrame(f);
    })(t0);
  }

  // the gummy cluster frames tighter than the lollipop, so ease the whole rig down a touch
  var fitId = 0;
  function fitCandy(p, animate) {
    if (!candy || !candy.root) return;
    var r = candy.root, to = p.kind === 'gummy' ? 0.78 : 1, from = r.scale.x, id = ++fitId;
    if (!animate || reduce || Math.abs(to - from) < 0.001) { r.scale.setScalar(to); return; }
    var t0 = performance.now(), dur = 950;
    (function f(now) {
      if (id !== fitId) return;
      var k = clamp((now - t0) / dur, 0, 1), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      r.scale.setScalar(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }

  function startTheta(api) {
    var out = $('.hud-theta'), hero = $('#hero');
    var spinner = api.root && api.root.children[0] && api.root.children[0].children[0];
    if (!out || !spinner) return;
    var visible = true, raf = 0, f = 0;
    function tick() {
      raf = 0;
      if (!visible) return;
      if ((f++ & 3) === 0) {
        var d = ((spinner.rotation.y * 57.29578) % 360 + 360) % 360;
        var s = d.toFixed(1);
        out.textContent = (s.length < 5 ? '00'.slice(0, 5 - s.length) : '') + s;
      }
      raf = requestAnimationFrame(tick);
    }
    if ('IntersectionObserver' in window && hero) {
      new IntersectionObserver(function (e) {
        visible = e[0].isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(tick);
      }).observe(hero);
    }
    raf = requestAnimationFrame(tick);
  }

  /* ======================================================================
     8. FORMULA EXPLORER (Fig. 03)
     ====================================================================== */
  var Explorer = (function () {
    var wrap = $('[data-explorer]');
    if (!wrap) return null;
    var diagram = $('.diagram', wrap), canvas = $('.dg-canvas', wrap), svg = $('.dg-svg', wrap);
    var gLines = $('.dg-lines', svg), gAnchors = $('.dg-anchors', svg), gNums = $('.dg-nums', svg);
    var tabsEl = $('[data-dg-tabs]', wrap), panelsEl = $('[data-ap-wrap]', wrap), tourBtn = $('[data-tour]', wrap);
    var NS = 'http://www.w3.org/2000/svg';
    var G = { cx: 500, cy: 250, r: 120, nodes: [] };
    var VB_WIDE = [0, 0, 1000, 640], VB_TIGHT = [220, 20, 560, 600];
    var mqWide = window.matchMedia('(min-width: 768px)');
    var lines = [], flows = [], anchors = [], nums = [];
    var sel = 0, count = 0, drawn = !hasGSAP || reduce, touring = false, tookOver = false, inView = false, timer = 0;

    function mk(tag, attrs) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    }
    // node layout for any count (GP-01 has 7 actives, GP-02's label 8 entries): half a side, the odd one on the left,
    // evenly spaced; each leader leaves the candy at the angle that faces its node (35° per 150 units, as first drawn)
    function geometry(n) {
      var out = [], left = Math.ceil(n / 2);
      [[left, 'l'], [n - left, 'r']].forEach(function (c) {
        var k = c[0], side = c[1], top = k >= 4 ? 92 : 100, bot = k >= 4 ? 440 : 400;   // 92: clears the Auto-tour button
        for (var i = 0; i < k; i++) {
          var y = k === 1 ? 250 : Math.round(top + (bot - top) * i / (k - 1)), t = (y - 250) / 150 * 35;
          out.push({ x: side === 'l' ? 270 : 730, y: y, a: side === 'l' ? 180 - t : (360 + t) % 360, side: side });
        }
      });
      return out;
    }
    function build(n) {
      if (G.nodes.length === n) return;
      G.nodes = geometry(n);
      gLines.innerHTML = ''; gAnchors.innerHTML = ''; gNums.innerHTML = '';
      lines = []; flows = []; anchors = []; nums = [];
      G.nodes.forEach(function (nd, i) {
        var rad = nd.a * Math.PI / 180;
        var ax = G.cx + G.r * Math.cos(rad), ay = G.cy + G.r * Math.sin(rad);
        var kx = nd.side === 'l' ? 334 : 666;
        var d = 'M' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ' L' + kx + ' ' + nd.y + ' L' + nd.x + ' ' + nd.y;
        var line = mk('path', { d: d, 'class': 'dg-line' });
        var flow = mk('path', { d: d, 'class': 'dg-flow' });
        gLines.appendChild(line); gLines.appendChild(flow);
        lines.push(line); flows.push(flow);
        var an = mk('circle', { cx: ax.toFixed(1), cy: ay.toFixed(1), r: 5, 'class': 'dg-anchor' });
        gAnchors.appendChild(an); anchors.push(an);
        var g = mk('g', { 'data-i': i });
        g.appendChild(mk('circle', { cx: nd.x, cy: nd.y, r: 22 }));
        var t = mk('text', { x: nd.x, y: nd.y + 1 });
        t.textContent = pad2(i + 1);
        g.appendChild(t);
        g.style.cursor = 'pointer';
        gNums.appendChild(g); nums.push(g);
      });
    }
    gNums.addEventListener('click', function (e) {
      var g = e.target.closest('g[data-i]');
      if (g) { takeOver(); select(+g.getAttribute('data-i'), { animate: true }); }
    });

    var pending = document.createElement('p');
    pending.className = 'dg-pending mono';
    pending.setAttribute('aria-hidden', 'true');
    pending.innerHTML = 'Formula map · ' + ph('pending');
    pending.hidden = true;
    canvas.appendChild(pending);

    function layout() {
      var vb = mqWide.matches ? VB_WIDE : VB_TIGHT;
      svg.setAttribute('viewBox', vb.join(' '));
      var w = svg.getBoundingClientRect().width || 1;
      svg.style.setProperty('--u', (vb[2] / w).toFixed(3));
      $$('.dg-node', tabsEl).forEach(function (b, i) {
        var n = G.nodes[i];
        if (!n) return;
        b.style.left = ((n.x - vb[0]) / vb[2] * 100).toFixed(3) + '%';
        b.style.top = ((n.y - vb[1]) / vb[3] * 100).toFixed(3) + '%';
        b.classList.toggle('is-l', n.side === 'l');
        b.classList.toggle('is-r', n.side === 'r');
      });
    }

    function panelHTML(a, i, n) {
      var head = '<article class="ap" role="tabpanel" id="ap-' + i + '" aria-labelledby="dt-' + i + '" tabindex="0"' + (i === sel ? '' : ' hidden') + '>' +
        // GP-02's cards are label entries, not actives ("seven actives" is Collagen Boost's count only)
        '<header class="ap-head"><span class="mono">' + (a.dose ? 'Entry ' : 'Active ') + pad2(i + 1) + ' / ' + pad2(n) + '</span><span class="mono ap-code">' + a.code + '</span></header>' +
        '<h3 class="ap-name">' + a.name + '</h3>';
      // label amounts known, benefit copy not supplied yet (GP-02): show the facts, keep "What it does" a visible placeholder
      if (a.dose) {
        return head +
          '<p class="ap-role mono">' + a.kind + '</p>' +
          '<dl class="ap-rows">' +
            '<div class="ap-row"><dt class="mono">What it is</dt><dd>' + a.is + '</dd></div>' +
            (a.src ? '<div class="ap-row"><dt class="mono">Source</dt><dd>(' + a.src + ')</dd></div>' : '') +
            '<div class="ap-row"><dt class="mono">What it does</dt><dd>' + ph('To be confirmed') + '</dd></div>' +
            '<div class="ap-row ap-row--dose"><dt class="mono">Per serving</dt><dd><span class="ap-dose">' + a.dose + '</span><span class="ap-dv mono">% DV ' + a.dv + '</span></dd></div>' +
          '</dl>' +
          (a.note ? '<p class="ap-note">' + a.note + '</p>' : '') +
          '</article>';
      }
      return head +
        '<p class="ap-role mono">Role · ' + a.role + '</p>' +
        '<dl class="ap-rows">' +
          '<div class="ap-row"><dt class="mono">What it does</dt><dd>' + a.does + '<sup class="fn">*</sup></dd></div>' +
          '<div class="ap-row"><dt class="mono">Why it’s here</dt><dd>' + a.why + '</dd></div>' +
          '<div class="ap-row"><dt class="mono">Benefits</dt><dd><ul class="chips">' +
            a.chips.map(function (c) { return '<li class="chip">' + icon(c[0]) + c[1] + '</li>'; }).join('') +
          '</ul></dd></div>' +
          '<div class="ap-row ap-row--dose"><dt class="mono">Per pop</dt><dd><span class="ap-dose">' + DOSE + '</span><span class="ap-dv mono">% DV ' + ph('XX') + '</span></dd></div>' +
        '</dl></article>';
    }
    function tbdHTML(p) {
      return '<article class="ap ap--tbd">' +
        '<header class="ap-head"><span class="mono">' + p.code + ' · formula sheet</span><span class="mono ap-code">Pending</span></header>' +
        '<h3 class="ap-name">' + ph('Actives') + '</h3>' +
        '<p class="ap-role mono">Status · ' + p.statusLabel + '</p>' +
        '<dl class="ap-rows">' +
          '<div class="ap-row"><dt class="mono">What’s inside</dt><dd>' + ph('To be announced') + '</dd></div>' +
          '<div class="ap-row"><dt class="mono">Why it’s blank</dt><dd>' + p.code + ' is still ' + p.statusLabel.toLowerCase() + ', so this sheet stays empty until the formula is final. No guesses, no filler.</dd></div>' +
          '<div class="ap-row"><dt class="mono">Benefits</dt><dd>' + ph('To be announced') + '</dd></div>' +
          '<div class="ap-row ap-row--dose"><dt class="mono">Per serving</dt><dd><span class="ap-dose">' + DOSE + '</span></dd></div>' +
        '</dl>' +
        '<div class="ap-back"><button type="button" class="btn btn-ghost btn-sm" data-product="strawberry-pop">See the GP-01 formula ' + icon('arrow-right') + '</button></div>' +
        '</article>';
    }

    function render(p, animate) {
      wrap.setAttribute('data-kind', p.kind);
      var list = p.actives;
      if (!list) {
        wrap.setAttribute('data-state', 'tbd');
        stopTour();
        tabsEl.innerHTML = ''; tabsEl.hidden = true;
        if (tourBtn) tourBtn.hidden = true;
        pending.hidden = false;
        panelsEl.innerHTML = tbdHTML(p);
        if (animate && !reduce && panelsEl.firstChild.animate) panelsEl.firstChild.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
        count = 0;
        return;
      }
      wrap.setAttribute('data-state', 'formula');
      pending.hidden = true;
      tabsEl.hidden = false;
      if (tourBtn) tourBtn.hidden = reduce;
      count = list.length;
      build(count);
      sel = Math.min(sel, count - 1);
      tabsEl.innerHTML = list.map(function (a, i) {
        return '<button class="dg-node" role="tab" type="button" id="dt-' + i + '" aria-selected="false" aria-controls="ap-' + i + '" tabindex="-1">' +
          '<span class="dn-dot mono">' + pad2(i + 1) + '</span>' +
          '<span class="dn-label"><span class="dn-name">' + a.name + '</span><span class="dn-role mono">' + (a.role || a.tag || a.dose) + '</span></span></button>';
      }).join('');
      panelsEl.innerHTML = list.map(function (a, i) { return panelHTML(a, i, list.length); }).join('');
      layout();
      diagram.classList.add('dg-ready');
      if (scrubTl && !drawn) initScrub();   // not revealed yet: the new leaders and tabs draw on like the first ones
      select(sel, { animate: animate });
    }

    function select(i, o) {
      o = o || {};
      if (!count) return;
      sel = (i + count) % count;
      $$('.dg-node', tabsEl).forEach(function (t, k) {
        t.setAttribute('aria-selected', k === sel ? 'true' : 'false');
        t.tabIndex = k === sel ? 0 : -1;
      });
      var panels = $$('.ap', panelsEl);
      panels.forEach(function (pn, k) { pn.hidden = k !== sel; });
      [lines, flows, anchors, nums].forEach(function (arr) { arr.forEach(function (e, k) { e.classList.toggle('is-on', k === sel); }); });
      if (o.focus) { var t = $('#dt-' + sel); if (t) t.focus(); }
      if (o.animate && !reduce) {
        var pn = panels[sel];
        if (pn && pn.animate) pn.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 440, easing: 'cubic-bezier(.16,1,.3,1)' });
        var L = lines[sel];
        if (drawn && L.animate && L.getTotalLength) {
          var len = L.getTotalLength();
          L.animate([{ strokeDasharray: len + ' ' + len, strokeDashoffset: len }, { strokeDasharray: len + ' ' + len, strokeDashoffset: 0 }], { duration: 620, easing: 'cubic-bezier(.16,1,.3,1)' });
        }
      }
    }

    // keyboard: arrows / Home / End move between tabs (selection follows focus)
    tabsEl.addEventListener('keydown', function (e) {
      var k = e.key, next = null;
      if (k === 'ArrowRight' || k === 'ArrowDown') next = sel + 1;
      else if (k === 'ArrowLeft' || k === 'ArrowUp') next = sel - 1;
      else if (k === 'Home') next = 0;
      else if (k === 'End') next = count - 1;
      if (next === null) return;
      e.preventDefault();
      takeOver();
      select(next, { focus: true, animate: true });
    });
    tabsEl.addEventListener('click', function (e) {
      var b = e.target.closest('.dg-node');
      if (!b) return;
      takeOver();
      select($$('.dg-node', tabsEl).indexOf(b), { animate: true });
    });

    // auto-tour: gently cycles while in view, until the visitor takes over (toggle to restart)
    function setTourUI() {
      if (!tourBtn) return;
      tourBtn.setAttribute('aria-pressed', touring ? 'true' : 'false');
      var ic = $('.dg-tour-ic', tourBtn), txt = $('.dg-tour-txt', tourBtn);
      if (ic) ic.innerHTML = icon(touring ? 'pause' : 'play');
      if (txt) txt.textContent = touring ? 'Auto-tour on' : 'Auto-tour off';
    }
    function startTour() {
      if (reduce || !count) return;
      touring = true; setTourUI();
      clearInterval(timer);
      timer = setInterval(function () { if (inView && !document.hidden) select(sel + 1, { animate: true }); }, 4200);
    }
    function stopTour() { touring = false; clearInterval(timer); setTourUI(); }
    function takeOver() { tookOver = true; if (touring) stopTour(); }
    if (tourBtn) {
      tourBtn.addEventListener('click', function () { tookOver = true; if (touring) stopTour(); else { select(sel + 1, { animate: true }); startTour(); } });
      if (reduce) tourBtn.hidden = true;
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        inView = e[0].isIntersecting;
        if (inView && !touring && !tookOver && drawn) startTour();
      }, { threshold: 0.35 }).observe(diagram);
    }

    // scroll-scrubbed reveal: the drawing's leader lines draw on, one after another. A product switch rebuilds the
    // leaders (7 for GP-01, 8 for GP-02) and the tabs, so until the drawing has been revealed the scrub is re-armed on them.
    var scrubTl = null;
    function initScrub() {
      if (!hasGSAP || reduce) { drawn = true; return; }
      if (drawn) return;
      if (scrubTl) { if (scrubTl.scrollTrigger) scrubTl.scrollTrigger.kill(); scrubTl.kill(); }
      // once fully drawn the drawing stays drawn (no un-drawing on the way back up)
      var tl = scrubTl = gsap.timeline({
        scrollTrigger: { trigger: diagram, start: 'top 82%', end: 'top 32%', scrub: 0.6,
          onLeave: function (self) {
            self.kill(); tl.progress(1); drawn = true;
            if (inView && !tookOver && !touring) startTour();
          } },
        onComplete: function () { drawn = true; }
      });
      tl.fromTo($$('.dg-orbit', svg), { opacity: 0 }, { opacity: 1, duration: 0.6, stagger: 0.1, ease: 'none' }, 0);
      lines.forEach(function (L, i) {
        var len = L.getTotalLength();
        tl.fromTo(L, { strokeDasharray: len + ' ' + len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out' }, 0.2 + i * 0.12);
      });
      tl.fromTo(anchors, { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.12, ease: 'none' }, 0.5);
      tl.fromTo($$('.dg-node', tabsEl).concat(nums), { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.08, ease: 'none' }, 0.6);
    }

    var rz = 0;
    window.addEventListener('resize', function () { cancelAnimationFrame(rz); rz = requestAnimationFrame(layout); }, { passive: true });
    if (mqWide.addEventListener) mqWide.addEventListener('change', layout);

    return {
      render: render, initScrub: initScrub, layout: layout,
      open: function (i) { takeOver(); select(i, { animate: true }); }
    };
  })();

  /* ======================================================================
     9. CLEAN-LABEL AUDIT (ticks itself as you scroll)
     ====================================================================== */
  var Audit = (function () {
    var wrap = $('[data-audit]');
    if (!wrap) return null;
    var rows = $$('[data-check]', wrap);
    var lists = $$('[data-audit-list]', wrap), groups = $$('[data-audit-group]', wrap), empty = $('[data-audit-empty]', wrap);
    var nEl = $('[data-audit-n]', wrap), fill = $('[data-audit-fill]', wrap), sr = $('[data-audit-sr]', wrap);
    var fig = $('.specimen', wrap), zoom = $('.sp-zoom', wrap), spots = $$('.spot', wrap);
    var seen = [], state = 'pass', newest = -1, settle = 0;
    wrap.setAttribute('data-state', 'pass');

    // one box per passed check on the specimen; the newest is drawn strongest and carries its number
    function paintSpots() {
      rows.forEach(function (r, i) {
        if (!spots[i]) return;
        spots[i].classList.toggle('is-on', state === 'pass' && r.classList.contains('is-pass'));
        spots[i].classList.toggle('is-now', state === 'pass' && i === newest);
      });
    }
    function update() {
      if (state !== 'pass') {
        nEl.innerHTML = ph('—');
        fill.style.setProperty('--n', 0);
        paintSpots();
        return;
      }
      var n = rows.filter(function (r) { return r.classList.contains('is-pass'); }).length;
      nEl.textContent = pad2(n);
      fill.style.setProperty('--n', n);
      paintSpots();
      clearTimeout(settle);
      if (n === rows.length && newest > -1) settle = setTimeout(function () { newest = -1; paintSpots(); }, 1600);   // all done: every box evens out
    }
    // checks run in order: reaching row i also ticks any earlier row still pending (e.g. after a nav jump), as a quick cascade
    function tick(r) {
      var idx = rows.indexOf(r), delay = 0;
      for (var i = 0; i <= idx; i++) seen[i] = true;
      if (state !== 'pass') return;
      for (var j = 0; j <= idx; j++) {
        if (rows[j].classList.contains('is-pass')) continue;
        (function (row, d) {
          setTimeout(function () {
            if (state !== 'pass' || row.classList.contains('is-pass')) return;
            row.classList.add('is-pass', 'is-flash');
            newest = rows.indexOf(row);
            setTimeout(function () { row.classList.remove('is-flash'); }, 1200);
            update();
          }, d);
        })(rows[j], delay);
        delay += 70;
      }
    }
    function arm() {
      if (reduce || !('IntersectionObserver' in window)) return;
      wrap.classList.add('audit-armed');
      rows.forEach(function (r) { r.classList.remove('is-pass'); });
      update();
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) tick(en.target); });
      }, { rootMargin: '0px 0px -40% 0px', threshold: 0 });
      rows.forEach(function (r) { io.observe(r); });
    }
    // the product's claims go into the same ten rows (so the observer keeps watching them); the two groups split
    // where the data says, and each row's box re-aims on the specimen
    function fillRows(a) {
      if (groups[0]) groups[0].innerHTML = a.groups[0];
      if (groups[1]) groups[1].innerHTML = a.groups[1];
      rows.forEach(function (r, i) {
        var c = a.checks[i];
        if (!c) return;
        $('.ar-name', r).innerHTML = c[0];
        $('.ar-note', r).innerHTML = c[1];
        if (lists.length === 2) lists[i < a.split ? 0 : 1].appendChild(r);
        var s = spots[i], b = c[2];
        if (s && b) {
          ['--x', '--y', '--w', '--h'].forEach(function (k, n) { s.style.setProperty(k, b[n]); });
          s.classList.toggle('tag-r', b[0] < 14);   // a claim at the image's left edge gets its number on the right
        }
      });
      if (lists[1]) lists[1].setAttribute('start', a.split + 1);
    }
    function setSpecimen(a) {
      if (!fig) return;
      fig.setAttribute('data-specimen', a ? a.specimen : 'none');
      if (!a || !zoom) return;
      var lb = a.lb;
      zoom.setAttribute('href', lb.href);
      zoom.setAttribute('data-lb-fig', lb.fig);
      zoom.setAttribute('data-lb-name', lb.name);
      zoom.setAttribute('data-lb-w', lb.w);
      zoom.setAttribute('data-lb-h', lb.h);
      zoom.setAttribute('data-lb-alt', lb.alt);
    }
    function setProduct(p) {
      var a = p.audit;
      state = a ? 'pass' : 'pending';
      newest = -1;
      wrap.setAttribute('data-state', state);
      if (a) fillRows(a);
      setSpecimen(a);
      if (empty) empty.hidden = !!a;
      rows.forEach(function (r, i) {
        var w = $('.ar-word', r);
        if (w) w.textContent = a ? a.word : 'Pending';
        if (!a) r.classList.remove('is-pass');
        else if (seen[i] || !wrap.classList.contains('audit-armed')) r.classList.add('is-pass');
      });
      if (sr) sr.textContent = a ? 'All 10 checks pass for ' + p.code + '.' : (p.copy.auditSr || 'Audit pending for ' + p.code + '.');
      update();
    }
    return { arm: arm, setProduct: setProduct };
  })();

  /* ======================================================================
     10. FACTS PANEL
     ====================================================================== */
  function renderFacts(p) {
    var box = $('[data-facts]');
    if (!box) return;
    var f = p.facts;
    var set = function (k, html) { var el = $('[data-f="' + k + '"]', box); if (el) el.innerHTML = html; };
    set('caption', f.caption || 'Amounts per serving');
    set('serving', f.serving);
    set('servings', f.servings);
    // a blend's contents print under it, inside the label's bottom bar (GP-02)
    set('rows', f.rows.map(function (r) {
      return '<tr' + (r[3] ? ' class="' + r[3] + '"' : '') + '><th scope="row">' + r[0] + '</th><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>';
    }).join('') + (f.blend ? '<tr class="ft-blend"><td colspan="3">' + f.blend + '</td></tr>' : ''));
    var foot = $('[data-f="foot"]', box);   // % DV footnote, only on a real printed label
    if (foot) { foot.innerHTML = f.foot || ''; foot.hidden = !f.foot; }
    set('other', f.other);
    set('flags', f.flags);
  }

  /* ======================================================================
     11. FORMULA LIBRARY CARDS
     ====================================================================== */
  function artSVG(kind, id) {
    // same volumetric gradient language as the Fig. 03 drawing, tinted by the card's own color world
    var gid = 'lcg-' + id;
    var defs = '<defs><radialGradient id="' + gid + '" cx="36%" cy="30%" r="80%">' +
      '<stop offset="0" class="art-st-tint"/><stop offset=".48" class="art-st-c"/><stop offset="1" class="art-st-deep"/></radialGradient></defs>';
    if (kind === 'gummy') {
      // three sugar-dusted drops, each outlined so they read as separate pieces
      var gum = function (cx, cy, w, h, rot) {
        var r = '" x="' + (cx - w / 2) + '" y="' + (cy - h / 2) + '" width="' + w + '" height="' + h + '" rx="' + (h * 0.46) + '"/>';
        return '<g transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')">' +
          '<rect class="art-gum" fill="url(#' + gid + ')' + r +
          '<rect fill="url(#dg-sugar)' + r +
          '<ellipse class="art-gloss" cx="' + (cx - w * 0.2) + '" cy="' + (cy - h * 0.2) + '" rx="' + (w * 0.17) + '" ry="' + (h * 0.1) + '"/></g>';
      };
      return '<svg viewBox="0 0 200 160" aria-hidden="true" focusable="false">' + defs +
        gum(71, 106, 64, 46, -14) + gum(129, 108, 62, 45, 12) + gum(100, 62, 66, 48, 3) + '</svg>';
    }
    if (kind === 'next') {
      var sil = function (x, y, r, c) {
        return '<g class="art-sil" stroke="' + c + '"><rect x="' + (x - 2.5) + '" y="' + (y + r + 3) + '" width="5" height="' + (140 - (y + r + 3)) + '" rx="2.5"/><circle cx="' + x + '" cy="' + y + '" r="' + r + '"/></g>';
      };
      return '<svg viewBox="0 0 200 160" aria-hidden="true" focusable="false">' +
        sil(52, 70, 19, '#F26A1B') + sil(100, 62, 23, '#8B3FD6') + sil(148, 70, 19, '#0E9CAD') + '</svg>';
    }
    return '<svg viewBox="0 0 200 160" aria-hidden="true" focusable="false">' + defs +
      '<rect class="art-stick" x="96" y="86" width="8" height="68" rx="4"/>' +
      '<circle class="art-fill" fill="url(#' + gid + ')" cx="100" cy="62" r="42"/>' +
      '<ellipse class="art-gloss" cx="85" cy="45" rx="13" ry="7" transform="rotate(-32 85 45)"/>' +
      '<circle class="art-gloss" cx="117" cy="38" r="3"/></svg>';
  }
  function renderLibrary() {
    var ul = $('[data-lib]');
    if (!ul) return;
    ul.innerHTML = PRODUCTS.map(function (p) {
      var c = p.card;
      return '<li class="lib-card" data-card="' + p.id + '" style="--c:' + p.color + ';--c-tint:' + p.tint + ';--c-deep:' + p.deep + '">' +
        '<div class="lc-top"><span class="lc-code mono">' + p.code + '</span><span class="pill mono' + (p.status === 'available' ? ' pill--live' : '') + '">' + p.statusLabel + '</span></div>' +
        '<div class="lc-art" aria-hidden="true">' + artSVG(c.art, p.id) + '<span class="art-tag mono">' + c.tag + '</span></div>' +
        '<h3 class="lc-name">' + p.short + '</h3>' +
        '<p class="lc-kind">' + c.kind + '</p>' +
        '<dl class="lc-facts">' + c.facts.map(function (f) { return '<div><dt class="mono">' + f[0] + '</dt><dd>' + f[1] + '</dd></div>'; }).join('') + '</dl>' +
        '<div class="lc-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm lc-select" data-product="' + p.id + '" aria-pressed="false">' + icon('scan-line') + '<span class="lc-sel-txt">View formula</span></button>' +
          '<a class="btn btn-primary btn-sm" href="#shop" data-product-go="' + p.id + '">' + c.go + ' ' + icon(c.goIcon) + '</a>' +
        '</div></li>';
    }).join('');
    var hint = document.createElement('p');
    hint.className = 'lib-hint mono';
    hint.setAttribute('aria-hidden', 'true');
    hint.textContent = 'Swipe for more formulas →';
    ul.parentNode.insertBefore(hint, ul.nextSibling);
  }

  /* ======================================================================
     12. SHOP CONFIGURATOR + WAITLIST (prototype: no network)
     ====================================================================== */
  function renderShop(p) {
    var cfg = $('.shop-config');
    if (cfg) cfg.setAttribute('data-mode', p.status === 'available' ? 'buy' : 'wait');
    var m = $('[data-wait-msg]');
    if (m) m.textContent = '';
    updateSummary();
  }
  function updateSummary() {
    var buy = $('[data-cfg="buy"]'), out = $('[data-sum="order"]');
    if (!buy || !out) return;
    var tier = $('input[name="tier"]:checked', buy), sub = $('input[name="subscribe"]', buy);
    var n = tier ? +tier.value : 1;
    out.textContent = 'GP-01 Collagen Boost · ' + n + (n > 1 ? ' bags' : ' bag') + ' · ' + (sub && sub.checked ? 'subscribe' : 'one-time');
  }
  function initShop() {
    var buy = $('[data-cfg="buy"]'), wait = $('[data-cfg="wait"]');
    if (buy) {
      buy.addEventListener('change', updateSummary);
      buy.addEventListener('submit', function (e) {
        e.preventDefault();
        var m = $('[data-buy-msg]');
        if (m) m.textContent = 'Prototype: checkout isn’t connected yet, so nothing was added or charged.';
      });
    }
    if (wait) {
      wait.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = $('input[type="email"]', wait), m = $('[data-wait-msg]');
        var ok = input && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
        if (!m) return;
        if (!ok) { m.textContent = 'Add an email address so we know where to send the news.'; if (input) input.focus(); return; }
        m.textContent = 'You’re on the ' + current.code + ' list. (Prototype: nothing was sent anywhere.)';
        input.value = '';
      });
    }
    updateSummary();
  }

  /* ======================================================================
     12b. LARGE VIEW for the pack images (Fig. 04 specimen, Fig. 06 label)
     The triggers are plain links to the image files, so without JS or <dialog> they just open the image.
     ====================================================================== */
  function initLightbox() {
    var dlg = $('#lightbox');
    if (!dlg || typeof dlg.showModal !== 'function') return;
    var img = $('[data-lb-img]', dlg), stage = $('[data-lb-stage]', dlg), file = $('[data-lb-file]', dlg);
    var zoomBtn = $('[data-lb-zoom]', dlg), zoomTxt = $('[data-lb-zoom-txt]', dlg), opener = null;
    function setActual(on) {
      dlg.classList.toggle('is-actual', on);
      zoomBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      zoomTxt.textContent = on ? 'Fit to screen' : 'Actual size';
      var ic = $('svg', zoomBtn), svg = icon(on ? 'zoom-out' : 'zoom-in');
      if (ic && svg) ic.outerHTML = svg;
    }
    function open(a) {
      var w = +a.getAttribute('data-lb-w') || 0, h = +a.getAttribute('data-lb-h') || 0, pic = $('img', a);
      opener = a;
      img.src = a.getAttribute('href');
      if (w && h) { img.width = w; img.height = h; }
      img.alt = a.getAttribute('data-lb-alt') || (pic ? pic.alt : '');
      $('[data-lb-fig]', dlg).textContent = a.getAttribute('data-lb-fig') || '';
      $('[data-lb-name]', dlg).textContent = a.getAttribute('data-lb-name') || '';
      file.setAttribute('href', a.getAttribute('href'));
      // a wide label on a narrow screen opens at actual size, ready to pan; everything else opens fitted
      setActual(!!(w && h && w / h > 1.4 && window.innerWidth < 768));
      root.classList.add('lb-open');
      dlg.showModal();
      stage.scrollTop = 0; stage.scrollLeft = 0;
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-lightbox]');
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      open(a);
    });
    $('[data-lb-close]', dlg).addEventListener('click', function () { dlg.close(); });
    zoomBtn.addEventListener('click', function () { setActual(!dlg.classList.contains('is-actual')); });
    img.addEventListener('click', function () { setActual(!dlg.classList.contains('is-actual')); });
    stage.addEventListener('click', function (e) { if (e.target === stage) dlg.close(); });   // the empty stage closes it
    dlg.addEventListener('close', function () {
      root.classList.remove('lb-open');
      if (opener) opener.focus({ preventScroll: true });
    });
  }

  /* ======================================================================
     13. PROTOCOL (Fig. 05): a day cursor scrubs across the 28-day ruler
     ====================================================================== */
  function initProtocol() {
    var proto = $('[data-proto]');
    if (!proto || !hasGSAP || reduce) return;
    proto.setAttribute('data-proto-live', '');
    var bars = [
      { el: $('.pr--d1 .pr-fill', proto), from: 0, to: 0 },
      { el: $('.pr--w1 .pr-fill', proto), from: 0, to: 6 / 27 },
      { el: $('.pr--w24 .pr-fill', proto), from: 7 / 27, to: 1 }
    ];
    var day = $('[data-proto-day]', proto), cursor = $('.proto-cursor', proto);
    function set(p) {
      cursor.style.setProperty('--p', p.toFixed(4));
      bars.forEach(function (b) {
        if (!b.el) return;
        var f = b.to <= b.from ? (p > 0.005 ? 1 : 0) : clamp((p - b.from) / (b.to - b.from), 0, 1);
        b.el.style.setProperty('--f', f.toFixed(4));
      });
      if (day) day.textContent = pad2(Math.round(1 + p * 27));
    }
    set(0);
    ScrollTrigger.create({ trigger: proto, start: 'top 72%', end: 'bottom 62%', scrub: 0.4, onUpdate: function (s) { set(s.progress); } });
  }

  /* ======================================================================
     14. FAQ ACCORDION
     ====================================================================== */
  function initAccordion() {
    var acc = $('[data-accordion]');
    if (!acc) return;
    acc.classList.add('acc-ready');
    acc.addEventListener('click', function (e) {
      var b = e.target.closest('.qa-btn');
      if (!b) return;
      var item = b.closest('.qa'), open = !item.classList.contains('is-open');
      $$('.qa', acc).forEach(function (q) {
        var on = q === item ? open : false;
        q.classList.toggle('is-open', on);
        $('.qa-btn', q).setAttribute('aria-expanded', on ? 'true' : 'false');
      });
    });
  }

  /* ======================================================================
     15. HEADER: mobile menu, scrolled state, scroll-spy, sticky shop bar
     ====================================================================== */
  function initHeader() {
    var header = $('.site-header'), btn = $('.menu-btn'), menu = $('#mobile-menu');
    var behind = $$('#main, .site-footer, .sticky-shop');
    var open = false;
    function toggle(on, focusBack) {
      open = on;
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      menu.hidden = !on;
      menu.classList.toggle('is-open', on);
      root.classList.toggle('menu-open', on);            // full-height sheet: lock the page behind it
      behind.forEach(function (el) { el.inert = on; });  // ...and keep focus out of what it covers
      if (on) fitSheet();
      if (on) { var f = $('a', menu); if (f) f.focus(); }
      else if (focusBack) btn.focus();
    }
    // the sheet runs from the header bar to the bottom of the screen (the header sits lower while the announce bar shows)
    function fitSheet() {
      if (header) menu.style.height = Math.max(240, window.innerHeight - header.getBoundingClientRect().bottom) + 'px';
    }
    if (btn && menu) {
      window.addEventListener('resize', function () { if (open) fitSheet(); }, { passive: true });
      btn.addEventListener('click', function () { toggle(!open, false); });
      menu.addEventListener('click', function (e) { if (e.target.closest('a')) toggle(false, false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) toggle(false, true); });
      var mq = window.matchMedia('(min-width: 1024px)');
      var onMQ = function () { if (mq.matches && open) toggle(false, false); };
      if (mq.addEventListener) mq.addEventListener('change', onMQ);
    }
    if (!('IntersectionObserver' in window)) return;

    var announce = $('.announce');
    if (announce && header) new IntersectionObserver(function (e) { header.classList.toggle('is-scrolled', !e[0].isIntersecting); }).observe(announce);

    // scroll-spy
    var links = $$('.nav-list a');
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute('aria-current'); });
        var a = map[en.target.id];
        if (a) a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });

    // sticky mobile shop bar: after the hero, hidden while the shop, the final CTA (its own Shop button)
    // or the footer is on screen
    var bar = $('[data-sticky]');
    if (!bar) return;
    var heroOut = false, shopIn = false, ctaIn = false, footIn = false;
    function upd() { bar.classList.toggle('is-on', heroOut && !shopIn && !ctaIn && !footIn); }
    var hero = $('#hero'), shop = $('#shop'), cta = $('.cta-panel'), foot = $('.site-footer');
    if (hero) new IntersectionObserver(function (e) { heroOut = !e[0].isIntersecting; upd(); }, { rootMargin: '0px 0px -40% 0px' }).observe(hero);
    if (shop) new IntersectionObserver(function (e) { shopIn = e[0].isIntersecting; upd(); }).observe(shop);
    if (cta) new IntersectionObserver(function (e) { ctaIn = e[e.length - 1].isIntersecting; upd(); }, { rootMargin: '0px 0px -25% 0px' }).observe(cta);
    if (foot) new IntersectionObserver(function (e) { footIn = e[0].isIntersecting; upd(); }).observe(foot);
  }

  /* prototype chip (≥1024px): tuck it away while it would sit on top of the hero's formula switcher,
     which happens on short laptop screens (1366×768, 1024×768, any browser with tall toolbars) */
  function initChip() {
    var chip = $('.proto-chip'), lib = $('.hero-lib-col');
    if (!chip || !lib || !('IntersectionObserver' in window)) return;
    var io = null, t = 0;
    function watch() {
      if (io) io.disconnect();
      // the root is shrunk to the bottom 64px of the viewport: the band the chip lives in
      io = new IntersectionObserver(function (e) { chip.classList.toggle('is-tucked', e[e.length - 1].isIntersecting); },
        { rootMargin: -Math.max(0, window.innerHeight - 64) + 'px 0px 0px 0px' });
      io.observe(lib);
    }
    watch();
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(watch, 200); }, { passive: true });
  }

  /* ======================================================================
     16. REVEALS (IntersectionObserver + CSS; never depends on a CDN)
     ====================================================================== */
  function initReveals() {
    var els = $$('[data-reveal]');
    clearTimeout(window.__glReveal);
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var groups = [];
    els.forEach(function (e) {
      var g = groups.filter(function (x) { return x.p === e.parentElement; })[0];
      if (!g) groups.push(g = { p: e.parentElement, list: [] });
      g.list.push(e);
    });
    groups.forEach(function (g) { g.list.forEach(function (e, i) { if (i) e.style.setProperty('--d', Math.min(i, 6) * 70 + 'ms'); }); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ======================================================================
     17. INIT
     ====================================================================== */
  try {
    renderSwitchers();
    renderLibrary();
    applyTheme(current);
    syncPressed();
    if (Explorer) Explorer.render(current, false);
    if (Audit) Audit.setProduct(current);
    renderFacts(current);
    renderShop(current);
    iconsIn(document);
    initReveals();
    initHeader();
    initChip();
    initAccordion();
    initShop();
    initLightbox();
    introReadout();
    if (Audit) Audit.arm();
    if (Explorer) Explorer.initScrub();
    initProtocol();
    initCandy();
    if (hasGSAP) {
      window.addEventListener('load', function () { ScrollTrigger.refresh(); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (Explorer) Explorer.layout(); ScrollTrigger.refresh(); });
    }
  } catch (err) {
    root.classList.add('reveal-all');
    if (window.console) console.warn('[Glow Lab] init failed:', err && err.message);
  }

  // dev hook for QA: GloLab.setProduct('green-gummies')
  window.GloLab = { setProduct: setProduct, products: PRODUCTS, get candy() { return candy; } };
})();
