/* MODEL POPS · SPRING (March to May): the Riviera in bloom, on a bright spring morning.
   Cherry blossom petals resting on the pool (a few whole blossoms among them) and a few more drifting down the
   hero; clear, fresh water in soft morning light; blush, mint and a lemon sun. Every key is documented in
   site/seasons/summer.js; the colours are in site/seasons/spring.css; the petals are small drawings in
   site/assets/seasons/spring/ (one scale for all of them: a whole blossom is about twice a lone petal). */
(function () {
  'use strict';
  var S = window.MP_SEASONS = window.MP_SEASONS || {};
  var ART = 'img:site/assets/seasons/spring/';
  S.spring = {
    label: 'Spring',
    copy: {
      // (a key left out keeps summer's words: the meta description, the menu lede, "Beach Club", "Touch the water")
      metaTitle: 'Model Pops · Your spring glow, served in bloom',
      themeColor: '#FFFDFB',
      heroL1: 'Your spring glow,',
      heroL2: 'served in bloom.',
      spot: 'in bloom',
      pool: 'pool, among blossom petals',
      clubCaption: 'Strawberry, first sun of spring',
      postmark: 'MODEL POPS BEACH CLUB · CABANA NO. 1 · IN BLOOM ·',
      cabanasLede: 'Three cabanas on the sand, petals on the breeze: choose one and its curtains open. Collagen Boost and <span data-name="green-pop">Green Veggies</span> are open now; Liposomal Vitamin C opens soon.',
      sunLede: 'Your first month, told as one spring day.',
      serveOnce: 'Just this once, fresh for spring.',
      waitlistTitle: 'Save a lounger in the spring sun at the <em>third cabana.</em>',
      waitlistEmpty: 'Please add your email address so we can save your lounger.',
      faqTitle: 'Questions under <em>the blossom.</em>',
      faqLede: 'Everything guests ask us on the first warm days.',
      glowKicker: 'See you in bloom',
      glowTitle: 'Get your <em>spring</em> glow.',
      glowCaption: 'Cabana <span class="no">N<span class="ord">o</span> 1</span>, blossom season'
    },
    water: {
      deep: [0.86, 1.06, 0.96], shallow: [0.95, 1.04, 0.98], // clear and a little more turquoise: fresh spring water
      warm: 0.03,                                             // soft morning light on every pool
      seaWarm: 0.3,                                           // the beach in the morning: a blush haze on the horizon
      cool: 0.08, caustics: 1.1, glints: 1.05
    },
    decor: {
      float: {   // petals resting on the pool (a few drifted together) and some whole blossoms: a third of them, so they read.
                 // They keep clear of the pop as well as the headline, so every one is in view: 12 is plenty. (The opening
                 // arrangement is seeded: this order makes about a third of its first petals whole blossoms.)
        count: 12,
        shapes: [ART + 'blossom.svg', ART + 'petal-raft.svg', ART + 'petal-white.svg', ART + 'petal-blush.svg', ART + 'blossom.svg',
          ART + 'petal-curl.svg', ART + 'petal-blush.svg', ART + 'petal-white.svg', ART + 'blossom.svg'],
        size: [19, 25], drift: [4, 1.2], opacity: 1, shadow: 0.13
      },
      fall: {    // and a few drifting down from the trees beside the pool
        count: 9, shapes: [ART + 'petal-blush.svg', ART + 'petal-white.svg', ART + 'petal-curl.svg'],
        size: [16, 22], speed: [16, 28], wind: 10, sway: 26, spin: 0.3, opacity: 0.94
      }
    },
    candy: { environment: 'beach' }
  };
})();
