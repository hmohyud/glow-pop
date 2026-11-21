/* MODEL POPS · WINTER (December to February): the Riviera in the snow, après-ski.
   A heated pool on a bright alpine day: crisp cool light on clear water, soft steam drifting off it, a light
   snowfall down the hero, the finale's pool edge a sparkling snow bank, snow on the cabana roofs, midnight
   navy and a little gold. Every key is documented in site/seasons/summer.js; the colours are in
   site/seasons/winter.css. */
(function () {
  'use strict';
  var S = window.MP_SEASONS = window.MP_SEASONS || {};
  var ICE = 'img:site/assets/seasons/winter/';   // drawn ice crystals (site/_qa/winter-frost draws them)
  S.winter = {
    label: 'Winter',
    copy: {
      // (a key left out keeps summer's words: the meta description, the menu lede)
      metaTitle: 'Model Pops · Your winter glow, served après-ski',
      themeColor: '#13233F',                 // the midnight-navy bar at the top of the page
      heroL1: 'Your winter glow,',
      heroL2: 'served après<span class="hy">-</span>ski.',   // .hy: the italic Bodoni's hairline hyphen, given some body
      spot: 'après-ski',
      hintWater: 'Touch the warm water',
      pool: 'heated pool in the snow',
      club: 'Snow Club',
      clubCaption: 'Strawberry, in the winter sun',
      postmark: 'MODEL POPS SNOW CLUB · CABANA NO. 1 · APRÈS-SKI ·',
      cabanasLede: 'Three cabanas in the snow: choose one and its curtains open. Collagen Boost and <span data-name="green-pop">Green Veggies</span> are open now; Liposomal Vitamin C opens soon.',
      sunLede: 'Your first month, told as one bright winter day.',
      dayTitle: 'A winter day with <em>Model Pops.</em>',
      serveOnce: 'Just this once, après-ski.',
      waitlistTitle: 'Save a spot by the heated pool at the <em>third cabana.</em>',
      waitlistEmpty: 'Please add your email address so we can save your spot by the pool.',
      faqTitle: 'Questions from the <em>warm water.</em>',
      faqLede: 'Everything guests ask us between dips in the heated pool.',
      glowKicker: 'See you après-ski',
      glowTitle: 'Get your <em>winter</em> glow.',
      glowCaption: 'Cabana <span class="no">N<span class="ord">o</span> 1</span>, winter afternoon'
    },
    water: {
      deep: [0.92, 0.99, 1.06], shallow: [0.96, 1.0, 1.04],  // a cleaner, colder, clearer blue
      cool: 0.6,                                             // crisp winter light: a colder sea, a steel-blue sky
      steam: 0,                                              // a haze off the heated water (thin over the hero's copy)
      snow: 1,                                               // the finale's pale edge: a snow bank (the hero's copy lies on clear water)
      seaWarm: 0.36,                                         // a low winter sun over the beach
      caustics: 0.85, glints: 1.05                           // a little less caustic net, crisp sun sparkles
    },
    decor: {
      fall: {    // a light snowfall: soft round flakes of a few sizes, slow, a little wind from the right
        count: 110, shapes: ['snow', 'snow', 'snow', ICE + 'flake-a.svg', ICE + 'flake-b.svg', ICE + 'flake-c.svg'], colors: ['#FFFFFF', '#F4F8FD', '#E2ECF6'],
        size: [1.8, 11], speed: [18, 46], wind: -9, sway: 18, spin: 0.06, opacity: [0.6, 1]
      }
    },
    candy: { environment: 'beach' }   // the product is the product: the approved pop, as in summer (the winter light stays in the water)
  };
})();
