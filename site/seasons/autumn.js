/* MODEL POPS · AUTUMN (September to November): the same club, late in the season, at golden hour.
   The low sun on the pool all day (golden caustics over the clear shallows, the deep end still a clear azure),
   a few plane and vine leaves resting on the water and turning slowly on the swell (touch the water and they
   drift aside), the beach in the last of the sun, a vine's dappled shade on the terrace sand; terracotta,
   berry, plum and gold. Every key is documented in site/seasons/summer.js; the colours are in
   site/seasons/autumn.css; the leaves (two London plane, two grapevine) and the vine's shade are small drawn
   SVGs in site/assets/seasons/autumn/.
   Nothing falls down the hero: the pool is seen from above, so the leaves lie on the water, each with its
   soft shadow down-right on the pool floor (the one sun, upper left), and keep clear of the headline and the pop. */
(function () {
  'use strict';
  var S = window.MP_SEASONS = window.MP_SEASONS || {};
  var LEAF = 'img:site/assets/seasons/autumn/';
  S.autumn = {
    label: 'Autumn',
    copy: {
      // (a key left out keeps summer's words: the meta description, the menu lede, "Beach Club", "Touch the water")
      metaTitle: 'Model Pops · Your autumn glow, served at golden hour',
      themeColor: '#FFFAF3',
      heroL1: 'Your autumn glow,',
      heroL2: 'served at golden hour.',
      spot: 'at golden hour',
      pool: 'pool at golden hour',
      clubCaption: 'Strawberry, in the late sun',
      postmark: 'MODEL POPS BEACH CLUB · CABANA NO. 1 · GOLDEN HOUR ·',
      cabanasLede: 'Three cabanas on the sand, in the last of the sun: choose one and its curtains open. Collagen Boost and <span data-name="green-pop">Green Veggies</span> are open now; Liposomal Vitamin C opens soon.',
      sunLede: 'Your first month, told as one autumn day.',
      serveOnce: 'Just this once, at golden hour.',
      waitlistTitle: 'Save a table on the terrace at the <em>third cabana.</em>',
      waitlistEmpty: 'Please add your email address so we can save your table.',
      faqTitle: 'Questions from <em>the terrace.</em>',
      faqLede: 'Everything guests ask us on the terrace, as the sun goes down.',
      glowKicker: 'See you at golden hour',
      glowTitle: 'Get your <em>autumn</em> glow.',
      glowCaption: 'Cabana <span class="no">N<span class="ord">o</span> 1</span>, late season'
    },
    water: {
      warm: 1,                      // golden hour on every pool, all day: a golden caustic net over the clear aqua shallows
      deep: [0.8, 0.95, 1.1],       // under that light the deep end stays a clear azure (never petrol) …
      shallow: [0.9, 0.9, 1.0],     // … and the shallows aqua (never mint)
      seaWarm: 0.95,                // the beach in the last of the sun: a peach sky, a golden horizon
      caustics: 1.05, glints: 1.15  // the low sun glitters a little more on the swell
    },
    decor: {
      float: {   // plane and vine leaves resting on the pool (drawn files: their own colours, lit flat from above)
        count: 5,
        // (the opening arrangement is seeded: in this order its first leaves mix gold, berry, terracotta and amber)
        shapes: [LEAF + 'plane-gold.svg', LEAF + 'vine-berry.svg', LEAF + 'plane-amber.svg', LEAF + 'vine-terracotta.svg', LEAF + 'vine-terracotta.svg',
          LEAF + 'plane-amber.svg', LEAF + 'plane-gold.svg', LEAF + 'vine-berry.svg', LEAF + 'vine-terracotta.svg', LEAF + 'plane-amber.svg'],
        size: [17, 23],             // one range for every screen (the two species' shapes vary it too)
        opacity: 1,
        drift: [1.6, 0.5],          // a slow current: they rest more than they travel
        shadow: 0.28
      }
    },
    candy: { environment: 'beach' }   // the product is the product: the approved pop, as in summer (golden hour stays in the water)
  };
})();
