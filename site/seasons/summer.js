/* ═══════════════════════════════════════════════════════════════════════════
   MODEL POPS · SUMMER (June to August): the Riviera, the site's original mood.
   ───────────────────────────────────────────────────────────────────────────
   One version of the site per season. The tiny script at the top of index.html's <head> sets
   <html data-season="spring|summer|autumn|winter"> before first paint: ?season=<name> previews one, otherwise
   the visitor's own date picks it (meteorological: Mar–May spring, Jun–Aug summer, Sep–Nov autumn, Dec–Feb
   winter). Each season has two files: this one (a classic script, loaded before app.js, that registers
   window.MP_SEASONS.<season>) and site/seasons/<season>.css (scoped to html[data-season="<season>"]).
   app.js reads this config; nothing season-specific lives in app.js, index.html or style.css.

   THIS FILE DOCUMENTS EVERY KEY. Every key is optional: a season that leaves a copy key out gets summer's
   words; a missing water / decor / candy key gets the neutral value (the summer pool).

   copy        { key: 'html' }
               · Any element with data-season-copy="key" gets copy[key] as its innerHTML (a <meta> gets it as its
                 content, the <title> as its text; tags are stripped there). index.html's own text is the summer
                 copy (also the no-JS fallback), so keep the two in step.
               · Product copy in app.js may say {{key}}: it is replaced by copy[key] (e.g. the hero caption
                 "Strawberry, {{spot}}"). Keys used that way: spot, hintWater, pool.
               · A product's name inside season copy: <span data-name="green-pop"></span> (refilled from app.js,
                 so the green pop's working name lives in one place).
   water       the WebGL water, applied on top of each product's own tint (every extra costs nothing at 0)
               deep, shallow   [r, g, b] multipliers on every product's deep / shallow water (1 = unchanged)
               target          { deep: [r, g, b], shallow: [r, g, b], amount: 0..1 }: then mixes every product's
                               water toward these colours (0..1 linear-ish RGB, like the products' own)
               warm            0..1 golden hour: lifts every pool toward the finale's warmth (summer 0)
               seaWarm         0..1 the beach's time of day: 0 morning, .5 noon, 1 golden hour (summer .5)
               cool            0..1 a crisp, cold light: bluer water and highlights, a steel-blue winter sky
               steam           0..1 soft mist wisps drifting off a heated pool (thinner over the headline)
               snow            0..1 the finale's pale pool edge (the sun shelf under its headline) becomes a
                               sparkling snow bank with a soft blue shadow onto the water. (The hero has no shelf:
                               its copy lies on open water, over sunlit shallows that keep the season's light)
               caustics        ≥0 strength of the caustic net on the pool floor (1 = summer)
               glints          ≥0 strength of the sun glints on the water (1 = summer)
   decor       one small particle canvas over the hero pool, behind the copy and the candy. Off with reduced
               motion; it only runs while the hero is on screen and the tab is visible. Two optional layers:
               fall    drifting down the hero (snow, petals, leaves)
               float   resting on the pool, bobbing on the swell, pushed aside by the ripples, keeping clear of
                       the headline, the pop and its caption, the hint, the awning and the coping, each with a
                       soft shadow down-right on the pool floor. Every float is in view, so keep the count low
               each:   count    how many in a 1440 × 800 hero (scaled by its area; keep it sparse)
                       shapes   ['snow' | 'flake' | 'petal' | 'blossom' | 'leaf' | 'maple' | 'img:<url>'], picked at
                                random (seeded: a season opens much the same way each visit); 'img:site/assets/seasons/
                                <season>/<file>.png|svg' draws a small file
                       colors   ['#hex', …] for the drawn shapes (ignored by img:)
                       size     [min, max] radius in px (or one number), the same on every screen
                       speed    [min, max] px a second (fall)
                       wind     px a second sideways (fall; negative = to the left)
                       sway     px of side-to-side drift (fall)
                       spin     turns a second, at most (fall)
                       drift    [x, y] px a second: the pool's slow current (float)
                       opacity  [min, max]
                       shadow   0..1 the floaters' shadow on the pool floor (float)
   candy       the 3D candy's light. The product is the product: every season keeps environment 'beach' and no
               exposure trim, the approved pop (site/_qa/ref3d/compare-pop.mjs checks it), so it looks the same all
               year. A season's mood goes around it: the water, the decor and its CSS. ('golden' frosts the pop
               two-toned and 'snow' turns it a flat pastel: neither is the product.)
               environment  'beach' (the library also has 'golden', 'studio' and 'snow': not for the product)
               exposure     leave it out (the calibrated default)
   Theme tokens (colours) are plain CSS in site/seasons/<season>.css.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var S = window.MP_SEASONS = window.MP_SEASONS || {};
  S.summer = {
    label: 'Summer',
    copy: {
      // <head>
      metaTitle: 'Model Pops · Your summer glow, served poolside',
      metaDescription: 'Model Pops, your supermodel routine. Collagen Boost is a sugar free, allulose free strawberry lollipop, sweetened with isomalt and stevia leaf, with collagen peptides, hyaluronic acid, vitamin C and biotin: 16 calories and 0 g sugar in every 15 g pop.',
      themeColor: '#FFFDF8',
      // the hero
      heroL1: 'Your summer glow,',
      heroL2: 'served poolside.',
      spot: 'poolside',                  // {{spot}}: "Strawberry, poolside"
      hintWater: 'Touch the water',      // {{hintWater}}: the hero's hint
      pool: 'pool',                      // {{pool}}: the 3D candy's description ("floating above the pool")
      // the club (welcome postcard, stamps, menu)
      club: 'Beach Club',
      clubCaption: 'Strawberry, by the water',
      postmark: 'MODEL POPS BEACH CLUB · CABANA NO. 1 · RIVIERA ·',
      // the cabanas
      cabanasLede: 'Three cabanas on the sand: choose one and its curtains open. Collagen Boost and <span data-name="green-pop">Green Veggies</span> are open now; Liposomal Vitamin C opens soon.',
      // the Sun Index
      sunLede: 'Your first month, told as one summer day.',
      dayTitle: 'A summer day with <em>Model Pops.</em>',
      // the menu and the waitlist
      menuLede: 'Collagen Boost, ten strawberry pops to a bag; <span data-name="green-pop">Green Veggies</span>, sixty. Choose your pop and a signature, then how you’d like it served.',
      serveOnce: 'Just this once, poolside.',
      waitlistTitle: 'Save a sun lounger at the <em>third cabana.</em>',
      waitlistLede: 'Liposomal Vitamin C, capsules made in Switzerland, is on its way. Its launch date is <span class="ph">to come</span>: leave your email and you’ll hear first.',
      waitlistEmpty: 'Please add your email address so we can save your sun lounger.',
      // the FAQ and the finale
      faqTitle: 'Questions from the <em>deck chairs.</em>',
      faqLede: 'Everything guests ask us between swims.',
      glowKicker: 'See you poolside',
      glowTitle: 'Get your <em>summer</em> glow.',
      glowCaption: 'Cabana <span class="no">N<span class="ord">o</span> 1</span>, late afternoon'
    },
    water: { deep: [1, 1, 1], shallow: [1, 1, 1], warm: 0, seaWarm: 0.5, cool: 0, steam: 0, snow: 0, caustics: 1, glints: 1 },
    decor: null,                         // the Riviera: clear water, nothing floating
    candy: { environment: 'beach' }
  };
})();
