/* ==========================================================================
   Glo Pop · Proposal 01 · “The Glo Issue” — app.js
   Classic script (works from file:// and http). GSAP, Lenis and the 3D candy
   are enhancements: if any of them is missing the page stays fully readable.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  var motion = hasGSAP && !reduced;
  if (!motion) root.classList.add('no-motion');

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var PH = function (t, solo) { return '<span class="ph' + (solo ? ' ph--solo' : '') + '">' + t + '</span>'; };

  /* ==========================================================================
     1. PRODUCTS — one object per product drives the switcher, the lineup,
        the shop, the page theme, the bound copy and the 3D candy.
     ========================================================================== */
  var PRODUCTS = [
    {
      id: 'strawberry-pop', kind: 'lollipop', shade: '01', shadeName: 'Strawberry Pink',
      name: 'Peptide Lollipops', flavor: 'Strawberry', status: 'available', statusLabel: 'Available now',
      color: '#FF1493', deep: '#7A1B4D', tint: '#FFE4F1',
      theme: { paper: '#FBF0EC', paper2: '#FFF9F5', paper3: '#F4DFD8', ink: '#4A0D2E', ink2: '#7A1B4D', ink3: '#8E5076',
               accent: '#FF1493', accentInk: '#C8006A', onAccent: '#2B0519', tint: '#FFE4F1', rule: 'rgba(74, 13, 46, .15)' },
      copy: {
        issue: 'The Strawberry Issue',
        deck: 'Peptide-powered lollipops with collagen, hyaluronic acid and glow-boosting vitamins. Beauty has never tasted this good.',
        photoFig: 'Cover — Strawberry season',
        fig: 'Fig. 01 — Strawberry, 47 kcal',
        fig3: 'Fig. 03 — Shade 01, Strawberry Pink',
        hint: 'Drag to turn<br>Tap for a bite',
        cta: 'Shop the Edit', ctaHref: '#edit',
        proofs: [['6', 'actives'], ['47', 'calories a pop'], ['Real', 'sugar, no swaps']],
        title: 'Peptide Lollipops <em>— Strawberry</em>',
        specs: [['Flavor', 'Strawberry'], ['In the bag', '10 lollipops'], ['Per pop', '47 calories'],
                ['Actives', '6'], ['Sweetened with', 'Real sugar'], ['Also', 'Gluten-free']],
        action: ['Shop Strawberry', '#edit'],
        barName: 'Peptide Lollipops', barMeta: 'Strawberry · 10 per bag', barCta: 'Shop',
        announce: 'Shade 01, Strawberry Pink, available now. The page is now pink.'
      }
    },
    {
      id: 'green-gummies', kind: 'gummy', shade: '02', shadeName: 'Green Gummies',
      name: 'Green Gummies', flavor: null /* TBD */, status: 'coming-soon', statusLabel: 'Coming soon',
      color: '#1FA453', deep: '#0E4D2C', tint: '#E3F6EA',
      theme: { paper: '#EEF3EC', paper2: '#F7FAF5', paper3: '#DCE7D7', ink: '#12341F', ink2: '#1F4A2F', ink3: '#4A6B55',
               accent: '#1FA453', accentInk: '#13703A', onAccent: '#0B2414', tint: '#DDF3E4', rule: 'rgba(18, 52, 31, .15)' },
      copy: {
        issue: 'The Green Issue — coming soon',
        deck: 'Green Gummies (working name) are coming soon. Flavor, actives and launch date are ' + PH('TBD', 1) + ', so join the waitlist to hear first.',
        photoFig: 'Cover — Strawberry shoot, toned green',
        fig: 'Fig. 01 — Green Gummies, concept render',
        fig3: 'Fig. 03 — Shade 02, Green Gummies (concept render)',
        hint: 'Drag to turn<br>Tap to squish',
        cta: 'Join the waitlist', ctaHref: '#waitlist',
        proofs: [[PH('X'), 'actives'], [PH('XX'), 'calories'], ['Soon', 'join the waitlist']],
        title: 'Green <em>Gummies</em>',
        specs: [['Flavor', PH('TBD', 1)], ['In the bag', PH('Count')], ['Per serving', PH('XX') + ' cal'],
                ['Actives', PH('TBD', 1)], ['Price', '$' + PH('XX')], ['Launch', PH('Date')]],
        action: ['Join the waitlist', '#waitlist'],
        barName: 'Green Gummies', barMeta: 'Coming soon · flavor ' + PH('TBD', 1), barCta: 'Waitlist',
        announce: 'Shade 02, Green Gummies, coming soon. The page is now green.'
      }
    },
    {
      id: 'next-pop', kind: 'lollipop', shade: '03', shadeName: 'Next Shade',
      name: 'Next Pop', flavor: null /* TBD */, status: 'in-development', statusLabel: 'In development',
      color: '#F26A1B', deep: '#7A2E0A', tint: '#FFE9DB',
      chip: 'linear-gradient(90deg, #F26A1B 0 33.4%, #8B3FD6 0 66.7%, #0E9CAD 0)',
      theme: { paper: '#FBEFE6', paper2: '#FFF8F2', paper3: '#F4DCCB', ink: '#4A1F0A', ink2: '#6E3212', ink3: '#8A5434',
               accent: '#F26A1B', accentInk: '#A8420A', onAccent: '#2E1204', tint: '#FFE6D6', rule: 'rgba(74, 31, 10, .15)' },
      copy: {
        issue: 'The Next Issue — in development',
        deck: 'More lollipop shades are in development. Names and flavors are ' + PH('TBD', 1) + ', and the color shown is for illustration only.',
        photoFig: 'Cover — Strawberry shoot, toned for illustration',
        fig: 'Fig. 01 — Next Shade, color shown for illustration',
        fig3: 'Fig. 03 — Shade 03, color shown for illustration',
        hint: 'Drag to turn<br>Tap for a bite',
        cta: 'See what’s next', ctaHref: '#lineup',
        proofs: [[PH('TBD', 1), 'flavor'], [PH('XX'), 'calories'], ['Soon', 'in development']],
        title: 'Next <em>Shade</em>',
        specs: [['Name', PH('TBD', 1)], ['Flavor', PH('TBD', 1)], ['Color', PH('TBD', 1)],
                ['Format', 'Lollipop'], ['Price', '$' + PH('XX')], ['Launch', PH('Date')]],
        action: ['See the lineup', '#lineup'],
        barName: 'More shades', barMeta: 'In development', barCta: 'Lineup',
        announce: 'Shade 03, the next shade, in development. The page is now orange.'
      }
    }
  ];
  var byId = function (id) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i]; return null; };
  var current = PRODUCTS[0];

  /* ==========================================================================
     2. THEME — swaps the registered colour tokens (they transition via CSS);
        a View Transition wipes the new “cover” in from the chosen swatch.
     ========================================================================== */
  var TOKENS = { paper: '--paper', paper2: '--paper-2', paper3: '--paper-3', ink: '--ink', ink2: '--ink-2', ink3: '--ink-3',
                 accent: '--accent', accentInk: '--accent-ink', onAccent: '--on-accent', tint: '--tint', rule: '--rule' };
  var metaTheme = $('meta[name="theme-color"]');
  function setTokens(p) {
    Object.keys(TOKENS).forEach(function (k) { root.style.setProperty(TOKENS[k], p.theme[k]); });
    root.dataset.product = p.id;
    if (metaTheme) metaTheme.setAttribute('content', p.theme.paper);
  }

  function bindCopy(p) {
    $$('[data-bind]').forEach(function (el) {
      var k = el.getAttribute('data-bind');
      var v = k === 'stageNo' ? p.shade : p.copy[k];
      if (v != null) el.innerHTML = v;
    });
    $$('[data-bind-href]').forEach(function (el) { el.setAttribute('href', p.copy[el.getAttribute('data-bind-href')]); });
    $$('[data-bind-html="proofs"]').forEach(function (el) {
      el.innerHTML = p.copy.proofs.map(function (r) { return '<li><b>' + r[0] + '</b><span>' + r[1] + '</span></li>'; }).join('');
    });
    $$('[data-bind-html="barMeta"]').forEach(function (el) { el.innerHTML = p.copy.barMeta; });
  }

  /* ---------- 2.1 shade card swatches ---------- */
  var swatchHost = $('#swatches');
  function renderSwatches() {
    swatchHost.innerHTML = PRODUCTS.map(function (p) {
      return '<button class="swatch" type="button" data-product="' + p.id + '" aria-pressed="' + (p === current) + '">' +
        '<span class="swatch__chip" aria-hidden="true"></span>' +
        '<span class="swatch__no">Shade ' + p.shade + '</span>' +
        '<span class="swatch__name">' + p.shadeName + '</span>' +
        '<span class="swatch__status">' + p.statusLabel + '</span></button>';
    }).join('');
    $$('.swatch', swatchHost).forEach(function (b) {
      var p = byId(b.getAttribute('data-product'));
      b.style.setProperty('--c', p.color);
      if (p.chip) b.style.setProperty('--chip-bg', p.chip);
    });
  }
  swatchHost.addEventListener('click', function (e) {
    var b = e.target.closest('.swatch');
    if (b) selectProduct(b.getAttribute('data-product'), b);
  });
  swatchHost.addEventListener('keydown', function (e) {           // arrow keys move along the card
    var list = $$('.swatch', swatchHost), i = list.indexOf(document.activeElement);
    if (i < 0) return;
    var n = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (n) { e.preventDefault(); list[(i + n + list.length) % list.length].focus(); }
  });

  /* ---------- 2.2 the selected shade’s spec sheet ---------- */
  var detail = $('#shadeDetail');
  function detailHTML(p) {
    return '<p class="shade-detail__k">Shade ' + p.shade + ' · ' + p.statusLabel + '</p>' +
      '<h3 class="shade-detail__t">' + p.copy.title + '</h3>' +
      '<dl class="specs">' + p.copy.specs.map(function (s) { return '<div><dt>' + s[0] + '</dt><dd>' + s[1] + '</dd></div>'; }).join('') + '</dl>' +
      '<a class="btn btn--ink" href="' + p.copy.action[1] + '">' + p.copy.action[0] +
      '<svg class="ic" aria-hidden="true"><use href="#i-arrow-right"/></svg></a>';
  }
  function renderDetail(p, animate) {
    if (!animate) { detail.innerHTML = detailHTML(p); return; }
    detail.classList.add('is-swapping');
    setTimeout(function () { detail.innerHTML = detailHTML(p); detail.classList.remove('is-swapping'); }, 260);
  }

  /* ---------- 2.3 the rest of the lineup, in the Edit (status-aware cards) ---------- */
  // concept plates for products with no photography yet (captioned as such)
  var ART = {
    gummy: function () {
      var drops = [[14, 76, -14], [60, 84, 11], [36, 40, 4]];
      return '<svg viewBox="0 0 120 150" aria-hidden="true"><defs>' +
        '<linearGradient id="gumFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--c);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--c);stop-opacity:.72"/></linearGradient></defs>' +
        drops.map(function (d) {
          var cx = d[0] + 23, cy = d[1] + 19;
          return '<g transform="rotate(' + d[2] + ' ' + cx + ' ' + cy + ')">' +
            '<rect x="' + d[0] + '" y="' + d[1] + '" width="46" height="38" rx="15" fill="url(#gumFill)" style="stroke:var(--c)" stroke-width=".9"/>' +
            '<ellipse cx="' + (d[0] + 15) + '" cy="' + (d[1] + 9) + '" rx="9" ry="3.2" fill="#fff" opacity=".55"/>' +
            '<g fill="#fff" opacity=".85"><circle cx="' + (d[0] + 30) + '" cy="' + (d[1] + 14) + '" r=".9"/><circle cx="' + (d[0] + 12) + '" cy="' + (d[1] + 24) + '" r=".8"/>' +
            '<circle cx="' + (d[0] + 36) + '" cy="' + (d[1] + 27) + '" r=".9"/><circle cx="' + (d[0] + 22) + '" cy="' + (d[1] + 31) + '" r=".7"/></g></g>';
        }).join('') + '</svg>';
    },
    lollipop: function () {
      var c = ['#F26A1B', '#8B3FD6', '#0E9CAD'];
      return '<svg viewBox="0 0 120 150" aria-hidden="true">' + c.map(function (col, i) {
        var x = 28 + i * 32, y = 46 + (i % 2) * 16;
        return '<line x1="' + x + '" y1="' + (y + 14) + '" x2="' + x + '" y2="' + (y + 66) + '" stroke="' + col + '" stroke-width="1.1" stroke-dasharray="2.5 3"/>' +
          '<circle cx="' + x + '" cy="' + y + '" r="14" fill="' + col + '" fill-opacity=".12" stroke="' + col + '" stroke-width="1.1" stroke-dasharray="2.5 3"/>';
      }).join('') + '</svg>';
    }
  };
  function lookHTML(p) {
    var art = '<div class="look__art" aria-hidden="true">' + (p.kind === 'gummy' ? ART.gummy() : ART.lollipop()) +
      '<span class="fig">' + (p.kind === 'gummy' ? 'Concept sketch&nbsp;· shape TBD' : 'Silhouettes&nbsp;· colors TBD') + '</span></div>';
    var body = '<p class="look__k">Shade ' + p.shade + ' · ' + p.statusLabel + '</p>';
    if (p.status === 'coming-soon') {
      body += '<h3 class="look__t" id="look-' + p.id + '">Green <em>Gummies</em></h3>' +
        '<p class="look__note">Working name. Flavor&nbsp;' + PH('TBD', 1) + ' · Actives&nbsp;' + PH('TBD', 1) + ' · Count&nbsp;' + PH('TBD', 1) +
        ' · Price&nbsp;$' + PH('XX') + ' · Launch&nbsp;' + PH('date') + '</p>' +
        '<form class="waitlist" novalidate><label class="sr-only" for="wl-' + p.id + '">Email address</label>' +
        '<input class="waitlist__input" id="wl-' + p.id + '" type="email" name="email" placeholder="Your email" autocomplete="email">' +
        '<button class="btn btn--ink" type="submit">Join the waitlist</button>' +
        '<p class="waitlist__msg" role="status" aria-live="polite"></p></form>';
    } else if (p.status === 'in-development') {
      body += '<h3 class="look__t" id="look-' + p.id + '">More shades, <em>on the way.</em></h3>' +
        '<p class="look__note">Name&nbsp;' + PH('TBD', 1) + ' · Flavor&nbsp;' + PH('TBD', 1) + ' · Color&nbsp;' + PH('TBD', 1) + '</p>' +
        '<button class="link look__go" type="button" data-product-go="' + p.id + '">Preview the shade</button>';
    } else {
      body += '<h3 class="look__t" id="look-' + p.id + '">' + p.name + '</h3>' +
        '<a class="btn btn--ink look__go" href="#edit">Shop ' + p.shadeName + '</a>';
    }
    return '<article class="look look--' + p.status + '"' + (p.status === 'coming-soon' ? ' id="waitlist"' : '') +
      ' style="--c:' + p.color + '" aria-labelledby="look-' + p.id + '">' + art + '<div class="look__body">' + body + '</div></article>';
  }
  function renderLineup() {
    var host = $('#lineup');
    host.innerHTML = '<p class="lineup__k">Coming next in the lineup</p>' +
      PRODUCTS.filter(function (p) { return p !== PRODUCTS[0]; }).map(lookHTML).join('');
  }
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f.classList || !f.classList.contains('waitlist')) return;
    e.preventDefault();
    var input = $('input', f), msg = $('.waitlist__msg', f), v = (input.value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { msg.textContent = 'Add an email address and we’ll save you a spot.'; input.focus(); return; }
    msg.textContent = 'You’re on the list. (Prototype: nothing was sent anywhere.)';
    f.reset();
  });
  document.addEventListener('click', function (e) {
    var go = e.target.closest('[data-product-go]');
    if (!go) return;
    selectProduct(go.getAttribute('data-product-go'), go);
    var shades = $('#shades');
    if (shades) scrollToEl(shades);
  });

  /* ---------- 2.4 select a product ---------- */
  var announcer = $('#announce');
  function selectProduct(id, origin) {
    var p = byId(id);
    if (!p || p === current) return;
    current = p;
    $$('.swatch').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-product') === id)); });

    var apply = function () { setTokens(p); bindCopy(p); };
    if (document.startViewTransition && motion) {
      root.classList.add('theme-instant');
      var vt = document.startViewTransition(function () { apply(); getComputedStyle(root).getPropertyValue('--paper'); });
      vt.ready.then(function () {
        var r = (origin || swatchHost).getBoundingClientRect();
        var x = r.left + r.width / 2, y = r.top + r.height / 2;
        var R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + R + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 1150, easing: 'cubic-bezier(.65, 0, .35, 1)', pseudoElement: '::view-transition-new(root)' });
      }).catch(function () {});
      vt.finished.then(done, done);
    } else {
      if (!motion) root.classList.add('theme-instant');
      apply();
      if (!motion) requestAnimationFrame(done);
    }
    function done() { root.classList.remove('theme-instant'); }
    renderDetail(p, motion);
    swapCandies(p);
    if (announcer) announcer.textContent = p.copy.announce;
  }

  /* ==========================================================================
     3. 3D CANDY (shared GloCandy library) — the cover star + the shade card
     ========================================================================== */
  var candies = [];
  function candyProduct(p) { return { kind: p.kind, color: p.color }; }
  // Gummies are wider than a lollipop: on the cover, lift and shrink them into the lollipop head’s spot.
  function frame(entry, p) {
    var api = entry.api;
    if (!api) return;
    var g = p.kind === 'gummy';
    var lift = entry.role === 'cover' ? (g ? 1.5 : 0) : (g ? -0.85 : 0);   // shade card: settle them near the floor shadow
    var scale = entry.role === 'cover' ? (g ? 0.74 : 1) : (g ? 0.8 : 1);
    api.root.position.y = lift;
    api.root.scale.setScalar(scale);
  }
  function inView(el) { var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }
  // the cover's “o”: hidden only while a visible, settled lollipop is standing in for it
  var coverState = { ready: false, shown: !motion, swapping: false };
  function updateO() { syncMastO(current, coverState.ready && coverState.shown && !coverState.swapping); }

  function swapCandies(p) {
    candies.forEach(function (entry) {
      var api = entry.api, cover = entry.role === 'cover';
      if (!api) return;
      if (api.product.kind === p.kind) { api.setProduct(candyProduct(p), { duration: 1.2 }); if (cover) updateO(); return; }
      if (!motion || !inView(entry.el)) {
        api.setProduct(candyProduct(p), { duration: 0.001 }); frame(entry, p);
        if (cover) updateO();
        return;
      }
      if (cover) { coverState.swapping = true; updateO(); }
      entry.el.classList.add('is-swapping');                      // slow cross-fade instead of the library’s pop
      setTimeout(function () {
        api.setProduct(candyProduct(p), { duration: 0.001 });
        setTimeout(function () {
          frame(entry, p);
          entry.el.classList.remove('is-swapping');
          if (cover) { coverState.swapping = false; updateO(); }
        }, 60);
      }, 430);
    });
  }
  function makeCandy(el, role, opts) {
    if (!el) return;
    var entry = { el: el, role: role, api: null };
    candies.push(entry);
    var fb = $('.candy__fallback', el);
    var settle = function () { if (role === 'cover') { coverState.ready = true; updateO(); } };
    if (!window.GloCandy) { if (fb) fb.hidden = false; settle(); return; }
    GloCandy.create(el, Object.assign({ fallback: fb, product: candyProduct(current) }, opts)).then(function (api) {
      if (!api) { settle(); return; }                             // WebGL/CDN unavailable: the drawn fallback shows
      entry.api = api;
      if (api.product.kind !== current.kind || api.product.color !== current.color) api.setProduct(candyProduct(current), { duration: 0.001 });
      frame(entry, current);
      el.classList.add('is-ready');
      settle();
    });
  }

  /* ==========================================================================
     4. COVER — measure the “o” of “Glo” so the candy can stand in for it
     ========================================================================== */
  var coverGrid = $('.cover__grid'), coverMast = $('.cover__mast');
  function measureMast() {
    if (!coverMast) return;
    var o = $('.mast--back .mast__o', coverMast).getBoundingClientRect();
    var box = coverMast.getBoundingClientRect();
    coverGrid.style.setProperty('--ox', (((o.left + o.right) / 2) - box.left).toFixed(1) + 'px');
  }
  // a round lollipop head stands in for the “o”; gummies sit in front of the real letter instead
  function syncMastO(p, ready) {
    if (!coverMast) return;
    coverMast.classList.toggle('o-is-candy', !!ready && p.kind === 'lollipop');
  }

  /* ==========================================================================
     5. THE FORMULA — accessible tabs (arrow keys, Home/End, “next part”)
     ========================================================================== */
  var tabs = $$('.toc__item'), panels = $$('.spread');
  function activateTab(i, focus) {
    tabs.forEach(function (t, j) { var on = j === i; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    panels.forEach(function (p, j) { var on = j === i; p.classList.toggle('is-active', on); p.hidden = !on; });
    if (focus) tabs[i].focus({ preventScroll: false });
    if (motion) {
      var p = panels[i];
      gsap.fromTo($('.spread__numeral', p), { yPercent: 12, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.2, ease: 'expo.out' });
      gsap.fromTo($$(':scope > :not(.spread__numeral)', p), { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.05 });
    }
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { activateTab(i); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, n = tabs.length, j = null;
      if (k === 'ArrowDown' || k === 'ArrowRight') j = (i + 1) % n;
      else if (k === 'ArrowUp' || k === 'ArrowLeft') j = (i - 1 + n) % n;
      else if (k === 'Home') j = 0;
      else if (k === 'End') j = n - 1;
      if (j !== null) { e.preventDefault(); activateTab(j, true); }
    });
  });
  $$('.spread__next').forEach(function (b) {
    b.addEventListener('click', function () { activateTab(Number(b.getAttribute('data-goto')) - 1, true); });
  });
  panels.forEach(function (p, j) { p.hidden = j !== 0; });
  root.classList.add('tabs-ready');

  /* ==========================================================================
     6. QUESTIONS — accordion
     ========================================================================== */
  $$('.qa__q').forEach(function (btn, i) {
    var item = btn.closest('.qa__item');
    var set = function (open) { item.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open)); };
    btn.addEventListener('click', function () { set(!item.classList.contains('is-open')); });
    if (i === 0) set(true);
  });
  root.classList.add('qa-ready');

  /* ==========================================================================
     7. THE EDIT — bundle tiers, subscribe switch, prototype add-to-bag
     ========================================================================== */
  var buy = $('#buy');
  if (buy) {
    var ctaT = $('.buy__cta-t', buy), note = $('#buyNote'), sw = $('#subSwitch'), sub = $('.sub', buy);
    var label = function () {
      var t = $('input[name="tier"]:checked', buy);
      var name = t ? t.getAttribute('data-label') : 'The Month';
      var on = sw.getAttribute('aria-checked') === 'true';
      ctaT.textContent = on ? 'Subscribe to ' + name : 'Add ' + name + ' to bag';
    };
    buy.addEventListener('change', label);
    sw.addEventListener('click', function () {
      var on = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', String(on));
      sub.classList.toggle('is-on', on);
      label();
    });
    buy.addEventListener('submit', function (e) {
      e.preventDefault();
      note.textContent = 'Prototype: checkout isn’t connected yet, so nothing was added. Prices are still to be announced.';
    });
    label();
  }

  /* ==========================================================================
     8. HEADER — reading-progress folio, chapter folio, logo swap, menu
     ========================================================================== */
  var hdr = $('#hdr'), prog = $('.hdr__progress span'), folio = $('.hdr__folio');
  var folioNo = $('.hdr__folio-no'), folioT = $('.hdr__folio-t');
  var shopbar = $('#shopbar'), cover = $('#cover'), edit = $('#edit'), back = $('#back'), colophon = $('#colophon');
  var shopLinks = $$('a', shopbar);
  var editVisible = false, backVisible = false, footVisible = false, ticking = false, shopOn = null;

  function onScroll() {
    ticking = false;
    // read everything first, then write (no forced layout inside the frame)
    var y = window.scrollY || root.scrollTop, max = Math.max(1, root.scrollHeight - innerHeight);
    var mastBottom = coverMast ? coverMast.getBoundingClientRect().bottom : 0;
    var coverBottom = cover.getBoundingClientRect().bottom;
    prog.style.setProperty('--p', Math.min(1, y / max).toFixed(4));
    hdr.classList.toggle('is-scrolled', mastBottom < 70);
    // the bar steps aside wherever the page already offers a CTA (the Edit, the back cover, the footer)
    var on = coverBottom < innerHeight * 0.35 && !editVisible && !backVisible && !footVisible && !menuOpen;
    if (on === shopOn) return;
    shopOn = on;
    shopbar.classList.toggle('is-on', on);
    shopbar.setAttribute('aria-hidden', String(!on));
    shopLinks.forEach(function (a) { a.tabIndex = on ? 0 : -1; });
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { editVisible = e.isIntersecting; }); onScroll(); }).observe(edit);
    new IntersectionObserver(function (es) { es.forEach(function (e) { backVisible = e.isIntersecting; }); onScroll(); },
      { rootMargin: '0px 0px -30% 0px' }).observe(back);
    new IntersectionObserver(function (es) { es.forEach(function (e) { footVisible = e.isIntersecting; }); onScroll(); }).observe(colophon);

    var navLinks = $$('.hdr__nav a');
    var folioIO = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var s = e.target, no = s.getAttribute('data-folio'), t = s.getAttribute('data-chapter');
        if (folioNo.textContent === no) return;
        folio.classList.add('is-swapping');
        setTimeout(function () { folioNo.textContent = no; folioT.textContent = t; folio.classList.remove('is-swapping'); }, 220);
        navLinks.forEach(function (a) {
          if (a.getAttribute('href') === '#' + s.id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -54% 0px' });
    $$('[data-folio]').forEach(function (s) { folioIO.observe(s); });
  }

  // menu: a contents page
  var menu = $('#menu'), menuBtn = $('.hdr__menu'), menuOpen = false, lenis = null;
  var outside = [$('#main'), $('#colophon'), $('.proto-chip'), $('#shopbar')];
  function setMenu(open) {
    menuOpen = open;
    menuBtn.setAttribute('aria-expanded', String(open));
    $('.hdr__menu-t', menuBtn).textContent = open ? 'Close' : 'Menu';
    outside.forEach(function (el) { if (el) { if (open) el.setAttribute('inert', ''); else el.removeAttribute('inert'); } });
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add('is-open'); });
      document.body.style.overflow = 'hidden';
      if (lenis) lenis.stop();
      var first = $('a', menu); if (first) first.focus();
    } else {
      menu.classList.remove('is-open');
      menu.hidden = true;
      document.body.style.overflow = '';
      if (lenis) lenis.start();
    }
    onScroll();
  }
  menuBtn.addEventListener('click', function () { setMenu(!menuOpen); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (!menuOpen) return;
    if (e.key === 'Escape') { setMenu(false); menuBtn.focus(); }
    if (e.key === 'Tab') {                                        // keep focus inside menu + its button
      var f = [menuBtn].concat($$('a', menu)), i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', function (m) { if (m.matches && menuOpen) setMenu(false); });

  /* smooth in-page anchors (Lenis when present, native otherwise) */
  function scrollToEl(el) {
    var off = -(parseFloat(getComputedStyle(root).getPropertyValue('--hdr-h')) || 60) + 1;
    if (lenis) lenis.scrollTo(el, { offset: off, duration: 1.4 });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + off, behavior: reduced ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) {                                          // placeholder page links: don't jump to the top
      e.preventDefault();
      if (announcer) announcer.textContent = a.textContent.trim() + ' isn’t part of this prototype yet.';
      return;
    }
    var el = document.getElementById(id.slice(1));
    if (!el) return;
    e.preventDefault();
    scrollToEl(el);
    try { history.replaceState(null, '', id); } catch (err) { /* file:// in some browsers */ }
    var focusTarget = el.matches('section, article, footer') ? el : null;
    if (focusTarget) { focusTarget.setAttribute('tabindex', '-1'); focusTarget.focus({ preventScroll: true }); }
  });

  /* ==========================================================================
     9. MOTION — restrained: line rises, clip reveals, slow parallax, Lenis
     ========================================================================== */
  function splitWords(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      var frag = document.createDocumentFragment();
      n.nodeValue.split(/(\s+)/).forEach(function (s) {
        if (!s) return;
        if (/^\s+$/.test(s)) { frag.appendChild(document.createTextNode(s)); return; }
        var w = document.createElement('span'), i = document.createElement('span');
        w.className = 'w'; i.textContent = s; w.appendChild(i); frag.appendChild(w);
      });
      n.parentNode.replaceChild(frag, n);
    });
    el.classList.add('is-split');
    var inner = $$('.w > span', el), lines = [], lastTop = null, line = -1;
    inner.forEach(function (s) {
      var t = Math.round(s.parentNode.offsetTop);
      if (lastTop === null || Math.abs(t - lastTop) > 4) { line++; lastTop = t; }
      lines.push(line);
    });
    return { words: inner, lines: lines };
  }
  function riseLines(el, delay) {
    var sp = splitWords(el);
    el.classList.add('is-in');
    return gsap.fromTo(sp.words, { yPercent: 112 }, {
      yPercent: 0, duration: 1.25, ease: 'expo.out', delay: delay || 0,
      stagger: function (i) { return sp.lines[i] * 0.1 + (i % 3) * 0.012; }
    });
  }

  function initMotion() {
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: 'expo.out' });

    if (window.Lenis && !('ontouchstart' in window && innerWidth < 1024)) {
      lenis = new Lenis({ duration: 1.15, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      root.classList.add('has-lenis');
    }

    /* the cover: an issue arriving on the newsstand */
    var tl = gsap.timeline({ delay: 0.15 });
    tl.from('.cover__dateline', { opacity: 0, y: -8, duration: 1 }, 0)
      .from('.mast__glo', { yPercent: 22, opacity: 0, duration: 1.5 }, 0.05)
      .from('.mast__pop', { yPercent: 22, opacity: 0, duration: 1.5 }, 0.17)
      .fromTo('.cover__photo-in', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.6, ease: 'expo.inOut' }, 0.1)
      .from('.cover__photo img', { scale: '+=0.16', duration: 2.4, ease: 'expo.out' }, 0.25)
      .fromTo('.cover__candy', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.6 }, 0.45)
      .add(function () { coverState.shown = true; updateO(); }, 0.6)
      .add(function () { riseLines($('.cover__title')); }, 0.55)
      .to('.cover__aside [data-reveal="rise"]', { opacity: 1, y: 0, duration: 1.2, stagger: 0.1 }, 0.85)
      .from('.cover__proofs li', { opacity: 0, y: 16, duration: 1.1, stagger: 0.08 }, 1.0)
      .from('.cover__fig, .fig--photo', { opacity: 0, duration: 1.2 }, 1.2);

    /* headlines rise line by line as they enter */
    $$('[data-reveal="lines"]').forEach(function (el) {
      if (el.closest('.cover')) return;
      ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { riseLines(el); } });
    });
    /* paragraphs + blocks */
    ScrollTrigger.batch('[data-reveal="rise"]:not(.cover [data-reveal])', {
      start: 'top 90%', once: true,
      onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1.2, stagger: 0.08, overwrite: true }); }
    });
    /* images uncover like a page being lifted */
    $$('[data-reveal="clip"]').forEach(function (el) {
      var img = $('img', el);
      ScrollTrigger.create({
        trigger: el, start: 'top 86%', once: true,
        onEnter: function () {
          gsap.to(el, { clipPath: 'inset(0% 0 0 0)', duration: 1.5, ease: 'expo.inOut' });
          if (img) gsap.fromTo(img, { scale: 1.14 }, { scale: el.classList.contains('edit__plate') ? 1.04 : 1, duration: 2.2, ease: 'expo.out' });
        }
      });
    });

    /* slow parallax */
    gsap.to('.cover__photo img', { yPercent: 7, ease: 'none', scrollTrigger: { trigger: '.cover', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.cover__mast', { y: -40, ease: 'none', scrollTrigger: { trigger: '.cover', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.fromTo('.sugar__num span', { yPercent: 8 }, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: '.sugar__grid', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.shades__numeral', { yPercent: -10 }, { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.shades', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.backcover__photo img', { yPercent: -8 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.backcover', start: 'top bottom', end: 'bottom top', scrub: true } });

    /* the ritual: one pop a day fills the 28-day ruler as you read */
    var days = $$('.ruler__days li');
    ScrollTrigger.create({
      trigger: '.sidebar', start: 'top 78%', end: 'bottom 55%', scrub: true,
      onUpdate: function (st) { var n = Math.round(st.progress * days.length); days.forEach(function (d, i) { d.classList.toggle('is-on', i < n); }); }
    });
    /* free-from: each filler gets struck out */
    ScrollTrigger.create({ trigger: '.freefrom', start: 'top 80%', once: true, onEnter: function () { $('.freefrom').classList.add('is-in'); } });
    /* swipes inside headings that aren't split */
    $$('.swipe').forEach(function (s) {
      if (s.closest('[data-reveal="lines"]')) return;
      ScrollTrigger.create({ trigger: s, start: 'top 85%', once: true, onEnter: function () { s.classList.add('is-in'); } });
    });

    root.classList.add('motion-ready');
  }

  function staticState() {
    $$('.ruler__days li').forEach(function (d) { d.classList.add('is-on'); });
    var ff = $('.freefrom'); if (ff) ff.classList.add('is-in');
    $$('.swipe').forEach(function (s) { s.classList.add('is-in'); });
  }

  /* ==========================================================================
     10. BOOT
     ========================================================================== */
  renderSwatches();
  renderLineup();
  bindCopy(current);

  makeCandy($('#coverCandy'), 'cover', { preset: 'gloss', tilt: 0.16, spin: 0.0026, exposure: 1.15 });
  makeCandy($('#shadeCandy'), 'shade', { preset: 'gloss', tilt: 0.2, spin: 0.003, exposure: 1.18 });

  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  var timeout = new Promise(function (r) { setTimeout(r, 2500); });
  Promise.race([fontsReady, timeout]).then(function () {
    measureMast();
    if (motion) {
      try { initMotion(); } catch (err) { root.classList.add('no-motion'); staticState(); }
    } else staticState();
    onScroll();
    if (hasGSAP) ScrollTrigger.refresh();
  });
  var rz = 0;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { measureMast(); onScroll(); }, 120); });
  window.addEventListener('load', function () { measureMast(); if (hasGSAP) ScrollTrigger.refresh(); });

  // expose for QA / the proposals index
  window.GloIssue = { products: PRODUCTS, select: function (id) { selectProduct(id, $('.swatch[data-product="' + id + '"]')); } };
})();
