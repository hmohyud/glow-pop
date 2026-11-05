/* ==========================================================================
   Glo Pop · Proposal 05 · "Golden Hour" — app.js (classic script)
   One PRODUCTS array drives the switcher, lineup, shop, theme and the 3D.
   Everything degrades: no JS → static, readable page; no GSAP → no motion;
   reduced motion → no pinning / parallax / auto-motion, content always visible.
   ========================================================================== */
(function () {
  'use strict';

  /* ───────────────────────── 0 · Product data ───────────────────────── */
  var PH = function (t) { return '<span class="ph">' + t + '</span>'; };

  var PRODUCTS = [
    {
      id: 'strawberry-pop', kind: 'lollipop', name: 'Peptide Lollipops', flavor: 'Strawberry',
      status: 'available', statusLabel: 'Available now',
      color: '#FF1493', deep: '#4E0E36', tint: '#FFE8F1', meta: '#FF1493',
      perBag: 10,
      tab: { title: 'Strawberry', sub: 'Peptide Lollipops' },
      panel: {
        title: 'Peptide Lollipops <em>Strawberry</em>',
        blurb: 'A really, really good strawberry lollipop with six skin-loving actives inside. Made with real sugar, one a day.',
        facts: [['47', 'calories a pop'], ['10', 'pops per bag'], ['6', 'actives inside'], ['Real', 'sugar, always']],
        cta: { label: 'Shop Strawberry Pops', href: '#shop' },
        alt: { label: 'What’s inside', href: '#actives' },
        caption: 'Real-time 3D · grab to spin · tap for a bite'
      },
      copy: { heroKicker: 'Peptide Lollipops · Strawberry', ctaLabel: 'Shop Strawberry Pops', ctaHref: '#shop',
              heroSub: 'Collagen, hyaluronic acid and glow-boosting vitamins<sup>*</sup> in a really, really good strawberry lollipop. Beauty has never tasted this good.',
              proof: '<li><i data-lucide="candy"></i><span><b>47</b> cal a pop</span></li><li><i data-lucide="leaf"></i><span>Made with <b>real sugar</b></span></li><li><i data-lucide="sparkles"></i><span><b>6</b> skin-loving actives</span></li>',
              barTitle: 'Strawberry Pops', barSub: '10 per bag · free shipping', barCta: 'Shop',
              statusLabel: 'Available now', stageCaption: 'Real-time 3D · grab to spin · tap for a bite', spinHint: 'Grab to spin · tap for a bite' }
    },
    {
      id: 'green-gummies', kind: 'gummy', name: 'Green Gummies', flavor: null /* TBD */,
      status: 'coming-soon', statusLabel: 'Arriving soon',
      color: '#1FA453', color3d: '#0E8A3E', deep: '#0F3A2A', tint: '#EAF6DE', meta: '#1FA453',
      perBag: null /* TBD */,
      tab: { title: 'Green Gummies', sub: 'Arriving soon' },
      panel: {
        title: 'Green Gummies <em>' + PH('Flavor') + '</em>',
        blurb: 'Our first gummy, in a brand-new green. The working name is Green Gummies; everything else is still under wraps.',
        facts: [[PH('Flavor'), 'flavor'], [PH('Actives'), 'actives'], [PH('Count'), 'gummies per bag'], [PH('Date'), 'launch']],
        cta: { label: 'Join the waitlist', href: '#waitlist' },
        alt: { label: 'Shop Strawberry for now', href: '#shop' },
        caption: 'Concept render · final gummy TBD'
      },
      copy: { heroKicker: 'Green Gummies · arriving soon', ctaLabel: 'Join the Green Gummies waitlist', ctaHref: '#waitlist',
              heroSub: 'Our first gummy is on its way, in a brand-new green. Flavor, actives and launch date are still under wraps. Until then, the strawberry pops are here.',
              proof: '<li><i data-lucide="candy"></i><span>' + PH('Flavor') + '</span></li><li><i data-lucide="sparkles"></i><span>' + PH('Actives') + '</span></li><li><i data-lucide="mail"></i><span>Launch ' + PH('Date') + '</span></li>',
              barTitle: 'Green Gummies', barSub: 'Arriving soon · join the list', barCta: 'Waitlist',
              statusLabel: 'Arriving soon', stageCaption: 'Concept render · final gummy TBD · tap to squish', spinHint: 'Grab to spin · tap to squish' }
    },
    {
      id: 'next-pop', kind: 'lollipop', name: 'More colors', flavor: null /* TBD */,
      status: 'in-development', statusLabel: 'In development',
      color: '#F26A1B', deep: '#4A1E08', tint: '#FFEDE0', meta: '#F26A1B',
      perBag: null /* TBD */,
      tab: { title: 'Next one’s in the mail', sub: 'More colors' },
      panel: {
        title: 'More colors <em>on the way</em>',
        blurb: 'New lollipop colors are in development. Names, flavors and dates aren’t final, so for now they’re sealed in the envelope.',
        facts: [[PH('Colors'), 'colors'], [PH('Flavors'), 'flavors'], [PH('Actives'), 'actives'], [PH('Date'), 'launch']],
        cta: { label: 'Get a postcard when they land', href: '#waitlist' },
        alt: { label: 'Shop Strawberry for now', href: '#shop' },
        caption: 'Concept render · color TBD'
      },
      copy: { heroKicker: 'More colors · in development', ctaLabel: 'Shop Strawberry Pops', ctaHref: '#shop',
              heroSub: 'New lollipop colors are in development. Names and flavors aren’t final, so they’re still sealed in the envelope. Until then, the strawberry pops are here.',
              proof: '<li><i data-lucide="lollipop"></i><span>' + PH('Colors') + '</span></li><li><i data-lucide="candy"></i><span>' + PH('Flavors') + '</span></li><li><i data-lucide="mail"></i><span>Launch ' + PH('Date') + '</span></li>',
              barTitle: 'Strawberry Pops', barSub: 'More colors in the mail', barCta: 'Shop',
              statusLabel: 'In development', stageCaption: 'Concept render · color TBD · tap for a bite', spinHint: 'Grab to spin · tap for a bite' }
    }
  ];

  /* ───────────────────────── helpers ───────────────────────── */
  var doc = document, html = doc.documentElement;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var byId = function (id) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i]; return null; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = mqReduce.matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);
  var motionOK = hasGSAP && !reduce;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  if (reduce) html.classList.add('reduced');
  if (motionOK) html.classList.add('motion');
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  var state = { product: PRODUCTS[0] };
  var listeners = [];
  var candies = [];          // GloCandy instances (max 2)
  var lenis = null;

  function releaseIntro() {
    clearTimeout(window.__gpIntroFailsafe);
    html.classList.remove('js-intro');
  }

  /* ───────────────────────── 1 · Icons ───────────────────────── */
  function icons(root) {
    if (!window.lucide || !lucide.createIcons) return;
    lucide.createIcons({ attrs: { 'aria-hidden': 'true', focusable: 'false' }, root: root });
  }

  /* ───────────────────────── 2 · Product theme ───────────────────────── */
  function applyBindings(p) {
    $$('[data-bind]').forEach(function (el) {
      var v = p.copy[el.getAttribute('data-bind')];
      if (v != null) el.innerHTML = v;
    });
    $$('[data-bind-href]').forEach(function (el) {
      var v = p.copy[el.getAttribute('data-bind-href')];
      if (v != null) el.setAttribute('href', v);
    });
  }

  function setProduct(id, opts) {
    var p = byId(id);
    if (!p || (p === state.product && !(opts && opts.force))) return;
    state.product = p;
    html.setAttribute('data-product', p.id);
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', p.meta);
    applyBindings(p);
    candies.forEach(function (c) { if (c) c.setProduct({ kind: p.kind, color: p.color3d || p.color }, { duration: 1 }); });
    icons();
    listeners.forEach(function (fn) { fn(p); });
  }

  /* ───────────────────────── 3 · Real-time 3D candy ───────────────────────── */
  var WARM_ENV = ['#ffffff', '#fff7ef', '#ffece0', '#ffd9c8'];
  function mountCandy(mount, fallback, opts) {
    if (!mount) return;
    if (!window.GloCandy) { if (fallback) fallback.hidden = false; return; }
    var p = state.product;
    GloCandy.create(mount, Object.assign({
      preset: 'gloss', product: { kind: p.kind, color: p.color3d || p.color },
      env: WARM_ENV, fallback: fallback
    }, opts || {})).then(function (api) {
      if (!api) return;
      candies.push(api);
      mount.__candy = api;
      var cur = state.product;                       // the user may have switched while loading
      if (cur !== p) api.setProduct({ kind: cur.kind, color: cur.color3d || cur.color }, { duration: .6 });
    });
  }

  /* ───────────────────────── 4 · Nav: scrolled state, mobile menu, anchors ───────────────────────── */
  function initNav() {
    var nav = $('#nav');
    var onScroll = function () { nav.classList.toggle('is-scrolled', window.scrollY > 24); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var toggle = $('.nav__toggle'), menu = $('#menu');
    var label = toggle.querySelector('.sr-only');
    function openMenu() {
      menu.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      label.textContent = 'Close menu';
      html.classList.add('menu-open');
      if (lenis) lenis.stop();
      if (motionOK) {
        gsap.fromTo(menu, { clipPath: 'circle(0% at 100% 0%)' }, { clipPath: 'circle(150% at 100% 0%)', duration: .8, ease: 'expo.out' });
        // opacity (not autoAlpha): visibility:hidden links can't take focus, which broke focus-on-open below
        gsap.fromTo($$('.menu__nav li', menu), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .7, stagger: .05, ease: 'expo.out', delay: .08 });
      }
      var first = $('a', menu); if (first) first.focus();
    }
    function closeMenu(returnFocus) {
      if (menu.hidden) return;
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      label.textContent = 'Menu';
      html.classList.remove('menu-open');
      if (lenis) lenis.start();
      if (returnFocus) toggle.focus();
    }
    toggle.addEventListener('click', function () { menu.hidden ? openMenu() : closeMenu(true); });
    doc.addEventListener('keydown', function (e) {
      if (menu.hidden) return;
      if (e.key === 'Escape') { closeMenu(true); return; }
      if (e.key === 'Tab') {                                     // keep focus inside menu + toggle
        var f = [toggle].concat($$('a', menu));
        var i = f.indexOf(doc.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1024) closeMenu(false); });

    // In-page anchors: smooth (Lenis when active), close the menu, move focus for keyboard users
    doc.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var hash = a.getAttribute('href');
      if (hash.length < 2) return;
      var target = doc.getElementById(hash.slice(1));
      if (!target) return;
      e.preventDefault();
      closeMenu(false);
      if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
      else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      if (history.replaceState) history.replaceState(null, '', hash);
    });
  }

  /* ───────────────────────── 5 · Hero: sunrise intro + scroll sunset ───────────────────────── */
  function initHero() {
    var candyMount = $('#heroCandy');
    mountCandy(candyMount, $('.hero__candy .candy-fallback'), { tilt: .3, spin: .0034, zoom: 1.02 });

    if (!motionOK) { releaseIntro(); return; }

    gsap.set('.slit', { scaleY: 0, transformOrigin: '50% 50%' });

    var tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: .05 });
    tl.from('.hero__sun-rise', { yPercent: 34, scale: .9, duration: 2.6, ease: 'power3.out' }, 0)
      .from('.hero__layer--noon', { opacity: .55, duration: 2.2, ease: 'power2.out' }, 0)
      .fromTo('[data-intro-arch]', { clipPath: 'inset(100% -24px -24px -24px)' },
        { clipPath: 'inset(0% -24px -24px -24px)', duration: 1.7, ease: 'expo.inOut', clearProps: 'clipPath' }, .05)
      .from('.arch__img img', { scale: 1.18, duration: 2.4, ease: 'expo.out' }, .15)
      .from('.hero__title .line > span', { yPercent: 108, duration: 1.25, stagger: .09 }, .3)
      .from('[data-intro]', { y: 24, autoAlpha: 0, duration: 1.1, stagger: .07 }, .7)
      .from('[data-intro-candy]', { autoAlpha: 0, scale: .55, y: 80, duration: 1.7, ease: 'back.out(1.5)' }, .75)
      .from('.hero__badge', { autoAlpha: 0, scale: .4, rotation: -140, duration: 1.5 }, 1.05);
    releaseIntro();

    // Scroll: the sun sets behind the arch, the sky warms to golden hour, layers part (parallax)
    gsap.timeline({
      scrollTrigger: {
        trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .6,
        onUpdate: function (self) {
          var c = candyMount && candyMount.__candy;
          if (c) { c.root.rotation.z = -self.progress * .55; c.root.rotation.x = self.progress * .35; }
        }
      }
    })
      .to('.hero__sun', { yPercent: 64, ease: 'none' }, 0)
      .to('.slit', { scaleY: 1, ease: 'power1.in', stagger: { each: .035, from: 'end' } }, 0)
      .to('.hero__layer--gold', { opacity: 1, ease: 'none' }, 0)
      .to('.arch__img img', { yPercent: 6, ease: 'none' }, 0)
      .to('.hero__copy', { y: -70, ease: 'none' }, 0)
      .to('.hero__candy', { y: -170, ease: 'none' }, 0)
      .to('.hero__badge', { y: -110, ease: 'none' }, 0);
  }

  /* ───────────────────────── 6 · The day: scroll-driven colour temperature + clock ───────────────────────── */
  // Page-wide "film grade": midday (no tint) → golden hour (amber) → sunset (rose) → dusk (violet)
  var GRADE = [
    [0.00, [255, 255, 255, 0]],
    [0.30, [255, 214, 160, .10]],
    [0.55, [255, 190, 120, .14]],
    [0.78, [255, 150, 150, .11]],
    [1.00, [170, 100, 190, .09]]
  ];
  function gradeAt(p) {
    for (var i = 1; i < GRADE.length; i++) {
      if (p <= GRADE[i][0]) {
        var a = GRADE[i - 1], b = GRADE[i], t = (p - a[0]) / (b[0] - a[0]);
        var c = a[1].map(function (v, k) { return lerp(v, b[1][k], t); });
        return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + c[3].toFixed(3) + ')';
      }
    }
    return 'transparent';
  }
  var scrollVel = 0;
  function initDayGrade() {
    var grade = $('.grade'), clock = $('.clock'), clockT = $('.clock__t');
    var lastMin = -1;
    function setDay(p) {
      grade.style.setProperty('--grade', gradeAt(p));
      grade.style.setProperty('--day', p.toFixed(4));
      var mins = Math.round(12 * 60 + p * (9.75 * 60));        // 12:00 → 21:45
      if (mins !== lastMin) {
        lastMin = mins;
        clockT.textContent = String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
        clock.setAttribute('data-phase', p < .44 ? 'day' : p < .8 ? 'gold' : 'night');
      }
    }
    if (hasGSAP) {
      ScrollTrigger.create({
        start: 0, end: 'max',
        onUpdate: function (self) { setDay(self.progress); scrollVel = self.getVelocity(); }
      });
    } else {
      var onS = function () {
        var max = Math.max(1, doc.documentElement.scrollHeight - window.innerHeight);
        setDay(clamp(window.scrollY / max, 0, 1));
      };
      window.addEventListener('scroll', onS, { passive: true }); onS();
    }
  }

  /* ───────────────────────── 7 · Curved-text badges spin (faster when you scroll) ───────────────────────── */
  function initBadges() {
    var spins = $$('.badge__spin');
    if (!spins.length || !hasGSAP || reduce) return;
    var rot = 0;
    gsap.ticker.add(function () {
      rot += .16 + Math.min(3.2, Math.abs(scrollVel) / 650);
      scrollVel *= .92;
      for (var i = 0; i < spins.length; i++) spins[i].style.transform = 'rotate(' + rot.toFixed(2) + 'deg)';
    });
  }

  /* ───────────────────────── 8 · Palm shade (green world): procedural fronds ───────────────────────── */
  function frond(x, y, angle, len, n, bend) {
    var dx = Math.cos(angle), dy = Math.sin(angle), nx = -dy, ny = dx;
    var P0 = [x, y], P2 = [x + dx * len, y + dy * len];
    var P1 = [(P0[0] + P2[0]) / 2 + nx * bend * len, (P0[1] + P2[1]) / 2 + ny * bend * len];
    var B = function (t) { var u = 1 - t; return [u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0], u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1]]; };
    var D = function (t) {
      var vx = 2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]);
      var vy = 2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]);
      var l = Math.hypot(vx, vy) || 1; return [vx / l, vy / l];
    };
    var f = function (v) { return v.toFixed(1); };
    var d = '';
    for (var i = 1; i <= n; i++) {
      var t = .06 + .92 * i / (n + 1), p = B(t), tg = D(t), nm = [-tg[1], tg[0]];
      var L = len * .44 * Math.pow(Math.sin(Math.PI * Math.min(.98, t * 1.02)), .65) * (1.05 - .45 * t);
      [1, -1].forEach(function (s) {
        var a = .58 + (s > 0 ? .05 : 0);
        var ex = p[0] + (nm[0] * s * Math.cos(a) + tg[0] * Math.sin(a)) * L;
        var ey = p[1] + (nm[1] * s * Math.cos(a) + tg[1] * Math.sin(a)) * L + L * .12;   // droop
        var lx = ex - p[0], ly = ey - p[1], ll = Math.hypot(lx, ly) || 1, w = L * .1;
        var px = -ly / ll * w, py = lx / ll * w, mx = (p[0] + ex) / 2, my = (p[1] + ey) / 2;
        d += 'M' + f(p[0]) + ',' + f(p[1]) + 'Q' + f(mx + px) + ',' + f(my + py) + ' ' + f(ex) + ',' + f(ey) +
             'Q' + f(mx - px) + ',' + f(my - py) + ' ' + f(p[0]) + ',' + f(p[1]) + 'Z';
      });
    }
    var stem = 'M' + f(P0[0]) + ',' + f(P0[1]) + 'Q' + f(P1[0]) + ',' + f(P1[1]) + ' ' + f(P2[0]) + ',' + f(P2[1]);
    return { leaves: d, stem: stem };
  }
  var FRONDS = {
    hero:  [[1090, -70, 2.45, 640, 26, .1], [1050, -90, 2.0, 560, 24, -.08], [930, -110, 2.9, 600, 24, .12], [1100, 120, 2.75, 420, 18, .1]],
    arch:  [[-80, 470, -.3, 430, 20, .12], [-50, 800, -.75, 400, 18, -.1], [690, -50, 2.45, 230, 14, .1]],
    stage: [[-60, -40, .8, 480, 22, -.1], [700, -60, 2.3, 520, 24, .1], [760, 300, 2.9, 380, 18, -.1]]
  };
  function initPalms() {
    var NS = 'http://www.w3.org/2000/svg';
    $$('svg[data-fronds]').forEach(function (svg) {
      var set = FRONDS[svg.getAttribute('data-fronds')] || [];
      var g = doc.createElementNS(NS, 'g');
      g.setAttribute('fill', 'rgba(24, 66, 34, .55)');
      g.setAttribute('stroke', 'rgba(24, 66, 34, .55)');
      set.forEach(function (a) {
        var fr = frond(a[0], a[1], a[2], a[3], a[4], a[5]);
        var leaves = doc.createElementNS(NS, 'path'); leaves.setAttribute('d', fr.leaves); leaves.setAttribute('stroke', 'none');
        var stem = doc.createElementNS(NS, 'path'); stem.setAttribute('d', fr.stem); stem.setAttribute('fill', 'none'); stem.setAttribute('stroke-width', '5');
        g.appendChild(leaves); g.appendChild(stem);
      });
      svg.appendChild(g);
    });
    if (motionOK) {                                   // shade sways a touch, like a breeze
      $$('svg[data-fronds] > g').forEach(function (g, i) {
        gsap.to(g, { rotation: i % 2 ? 1.6 : -1.4, transformOrigin: '100% 0%', duration: 5 + i, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      });
    }
  }

  /* ───────────────────────── 9 · Headline word-split + scroll reveals ───────────────────────── */
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function initReveals() {
    if (!motionOK) return;
    $$('[data-split]').forEach(function (el) {
      var words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map(function (w) { return '<span class="w"><span class="w__in">' + esc(w) + '</span></span>'; }).join(' ');
      if (el.closest('.day')) return;                         // the day title animates with its own timeline
      gsap.from($$('.w__in', el), {
        yPercent: 112, duration: 1.15, ease: 'expo.out', stagger: .055,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });
    $$('[data-reveal]').forEach(function (el) {
      gsap.from(el, { y: 46, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    $$('.sec-head .lead, .sec-head .eyebrow, .faq__aside').forEach(function (el) {
      if (el.closest('.day')) return;
      gsap.from(el, { y: 22, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });
  }

  /* ───────────────────────── 10 · Lineup: the postcard switcher (tabs) ───────────────────────── */
  function panelHTML(p) {
    var facts = p.panel.facts.map(function (f) { return '<div><dt>' + f[1] + '</dt><dd>' + f[0] + '</dd></div>'; }).join('');
    return '<div class="panel__in">' +
      '<p class="panel__status">' + p.statusLabel + '</p>' +
      '<h3 class="panel__title">' + p.panel.title + '</h3>' +
      '<p class="panel__blurb">' + p.panel.blurb + '</p>' +
      '<dl class="panel__facts">' + facts + '</dl>' +
      '<div class="panel__ctas"><a class="btn btn--accent" href="' + p.panel.cta.href + '">' + p.panel.cta.label + '<i data-lucide="arrow-right"></i></a>' +
      '<a class="btn btn--ghost" href="' + p.panel.alt.href + '">' + p.panel.alt.label + '</a></div></div>';
  }
  function initSwitcher() {
    var tabs = $$('.pc-tab'), panel = $('#lineup-panel'), list = $('.pc-tabs');
    if (!tabs.length || !panel) return;
    mountCandy($('#stageCandy'), $('.stage .candy-fallback'), { tilt: .26, spin: .004, zoom: .98 });

    function render(p) {
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-pick') === p.id;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', 'tab-' + p.id);
      var swap = function () { panel.innerHTML = panelHTML(p); icons(); };
      if (motionOK && panel.firstElementChild) {
        gsap.to(panel.firstElementChild, {
          autoAlpha: 0, y: 12, duration: .22, ease: 'power2.in',
          onComplete: function () {
            swap();
            gsap.from(panel.firstElementChild.children, { autoAlpha: 0, y: 18, duration: .7, stagger: .05, ease: 'expo.out' });
          }
        });
      } else swap();
    }
    tabs.forEach(function (t) { t.addEventListener('click', function () { setProduct(t.getAttribute('data-pick')); }); });
    list.addEventListener('keydown', function (e) {
      var i = tabs.indexOf(doc.activeElement);
      if (i < 0) return;
      var n = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      if (n === null) return;
      e.preventDefault();
      tabs[n].focus();
      setProduct(tabs[n].getAttribute('data-pick'));
    });
    listeners.push(render);
  }

  /* ───────────────────────── 11 · A summer day: pinned horizontal postcards + time-lapse sky ───────────────────────── */
  var ss = function (a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function initDay() {
    var day = $('#day');
    if (!day || !motionOK) return;                             // static vertical stack otherwise
    var mm = gsap.matchMedia();
    mm.add('(min-width: 1024px)', function () {
      day.classList.add('day--h');
      var track = $('.day__track', day), sky = $('.day__sky', day);
      var L = { noon: $('.day__layer--noon', day), gold: $('.day__layer--gold', day), night: $('.day__layer--night', day), stars: $('.day__stars', day) };
      var sun = $('.day__sun', day), moon = $('.day__moon', day), clock = $('.day__clock', day), dot = $('.day__dot', day), rail = $('.day__rail', day);
      var glint = $('.day__glint:not(.day__glint--moon)', day), mglint = $('.day__glint--moon', day);
      var cards = $$('.pc', day);
      var keys = [0, .2, .4, .6, .8];                         // progress at which each card is centred (measured on refresh)
      var TIMES = [7 * 60, 8 * 60, 13 * 60, 19 * 60, 22 * 60, 22 * 60 + 40];
      var dist = function () { return Math.max(1, track.scrollWidth - window.innerWidth); };
      var ticks = $$('.day__ticks li', day);
      function measure() {
        var d = dist();
        keys = [0].concat(cards.map(function (c) { return clamp((c.offsetLeft + c.offsetWidth / 2 - window.innerWidth / 2) / d, 0, 1); }));
        ticks.forEach(function (li, i) { li.style.setProperty('--x', (keys[i + 1] * 100).toFixed(2) + '%'); });
      }
      function timeAt(p) {
        var stops = keys.concat([1]);
        for (var i = 1; i < stops.length; i++) {
          if (p <= stops[i]) { var t = (p - stops[i - 1]) / Math.max(1e-4, stops[i] - stops[i - 1]); return lerp(TIMES[i - 1], TIMES[i], t); }
        }
        return TIMES[TIMES.length - 1];
      }
      var lastMin = -1;
      function paint(p) {
        var k1 = keys[1], k2 = keys[2], k3 = keys[3], k4 = keys[4];
        L.noon.style.opacity = ss(k1, k2, p).toFixed(3);
        L.gold.style.opacity = ss(k2 + (k3 - k2) * .35, k3, p).toFixed(3);
        L.night.style.opacity = ss(k3 + (k4 - k3) * .3, k4, p).toFixed(3);
        L.stars.style.opacity = ss(k3 + (k4 - k3) * .55, k4, p).toFixed(3);
        sky.style.setProperty('--nightness', ss(k3, k4, p).toFixed(3));
        day.classList.toggle('is-night', p > k3 + (k4 - k3) * .6);
        // sun: rises at the first card, peaks at the beach, sets after golden hour
        var W = window.innerWidth, H = window.innerHeight, horizon = H * .79, size = H * .21;
        var t = clamp((p - k1 * .3) / Math.max(.01, (k3 + (k4 - k3) * .45) - k1 * .3), 0, 1);
        var sx = lerp(W * .06, W * .84, t) - size / 2;
        var sy = horizon - Math.sin(Math.PI * Math.min(1, t)) * H * .6 - size * .25 + (p > k3 ? ss(k3, k4, p) * size * .9 : 0);
        sun.style.transform = 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px,0)';
        // the sun's reflection follows it across the sea, strongest at golden hour
        var gw = H * .3, up = 1 - ss(k3 + (k4 - k3) * .3, k4, p);
        glint.style.transform = 'translate3d(' + (sx + size / 2 - gw / 2).toFixed(1) + 'px,0,0)';
        glint.style.opacity = (up * (.35 + .65 * ss(k2, k3, p))).toFixed(3);
        // the lollipop moon comes up for the night card
        var m = ss(k3 + (k4 - k3) * .45, Math.min(1, k4 + .06), p), mw = H * .13;
        moon.style.opacity = m.toFixed(3);
        moon.style.transform = 'translate3d(' + (W * .7).toFixed(1) + 'px,' + lerp(horizon, H * .16, m).toFixed(1) + 'px,0)';
        mglint.style.transform = 'translate3d(' + (W * .7 + mw / 2 - H * .09).toFixed(1) + 'px,0,0)';
        mglint.style.opacity = (m * .8).toFixed(3);
        dot.style.transform = 'translateX(' + (p * rail.offsetWidth).toFixed(1) + 'px)';
        var mins = Math.round(timeAt(p));
        if (mins !== lastMin) { lastMin = mins; clock.textContent = String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0'); }
      }

      var tween = gsap.to(track, {
        x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: {
          trigger: day, start: 'top top', end: function () { return '+=' + dist(); },
          pin: true, scrub: .7, invalidateOnRefresh: true, anticipatePin: 1,
          // The reveal triggers further down the page were created before this pin; refreshing the pin
          // first lets them measure the page *with* its pin spacer (otherwise they fire ~one pin-length early).
          refreshPriority: 1,
          onRefresh: function (self) { measure(); paint(self.progress); },
          onUpdate: function (self) { paint(self.progress); },
          // While the day is pinned its own HUD clock is the clock: the nav clock steps aside so two
          // different times are never on screen together.
          onToggle: function (self) { html.classList.toggle('day-live', self.isActive); }
        }
      });
      measure(); paint(0);

      // intro title rises when the section arrives
      var words = $$('.day__title .w__in', day);
      if (words.length) gsap.from(words, { yPercent: 112, duration: 1.15, ease: 'expo.out', stagger: .06, scrollTrigger: { trigger: day, start: 'top 75%', once: true } });

      // inner parallax for each postcard photo + postmarks stamping in as cards reach the centre
      cards.forEach(function (card) {
        var img = $('.pc__front img, .pc__front .night-art', card);
        if (img) gsap.fromTo(img, { xPercent: 5 }, { xPercent: -5, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
        var pm = $('.pc__pm', card);
        if (pm) gsap.from(pm, { scale: 1.8, autoAlpha: 0, rotation: -40, duration: .7, ease: 'back.out(2.2)', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 62%', toggleActions: 'play none none reverse' } });
        gsap.from(card, { rotation: 3, y: 30, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'center center', scrub: true } });
      });
      return function () { day.classList.remove('day--h', 'is-night'); html.classList.remove('day-live'); };
    });
  }

  /* ───────────────────────── 12 · Actives: stamps turn over ───────────────────────── */
  function initStamps() {
    var stamps = $$('.stamp'), sheet = $('.stamps');
    if (sheet) sheet.classList.add('stamps--js');      // flipping is only enabled once this module runs
    stamps.forEach(function (b) {
      b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); });
    });
    if (motionOK && stamps.length) {
      var tilt = [-7, 5, -4, 6, -5, 4];
      gsap.from('.stamps__item', {
        y: 80, autoAlpha: 0, rotation: function (i) { return tilt[i % tilt.length]; },
        duration: 1.1, ease: 'expo.out', stagger: .07,
        scrollTrigger: { trigger: '.stamps', start: 'top 86%', once: true }
      });
    }
  }

  /* ───────────────────────── 13 · Real sugar: the menu strikes itself through, 47 counts up ───────────────────────── */
  function initSugar() {
    var card = $('.menu-card');
    if (card && motionOK) {
      card.classList.add('strike-ready');
      ScrollTrigger.create({ trigger: card, start: 'top 68%', once: true, onEnter: function () { card.classList.add('is-drawn'); } });
    }
    var num = $('.sugar__num span');
    // trigger on the static clipping parent: the span itself starts 105% lower, which made the trigger fire late
    if (num && motionOK) gsap.from(num, { yPercent: 105, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: num.parentNode, start: 'top 88%', once: true } });
  }

  /* ───────────────────────── 14 · The beach bag: bundles, subscribe toggle, product states ───────────────────────── */
  var POUCH = '<span class="pouch"><img src="../../images/peptide_lollipops.webp" alt="" width="1600" height="1600" loading="lazy" decoding="async"></span>';
  var GUMMY_SVG = '<svg viewBox="0 0 160 120" aria-hidden="true"><g fill="url(#g-gummy)"><rect x="26" y="50" width="48" height="40" rx="18" transform="rotate(-14 50 70)"/><rect x="76" y="34" width="52" height="44" rx="20" transform="rotate(11 102 56)"/><rect x="56" y="68" width="48" height="38" rx="17" transform="rotate(-4 80 87)"/></g></svg>';
  var ENVELOPE_SVG = '<svg viewBox="0 0 160 120" aria-hidden="true"><g opacity=".9"><circle cx="53" cy="34" r="15" fill="#F26A1B"/><circle cx="80" cy="26" r="15" fill="#8B3FD6"/><circle cx="107" cy="34" r="15" fill="#0E9CAD"/></g><rect x="22" y="50" width="116" height="60" rx="6" fill="#FFFBF5" stroke="#A9440B" stroke-width="2"/><path d="M22 54 L80 86 L138 54" fill="none" stroke="#A9440B" stroke-width="2"/></svg>';
  var TIER_NAMES = { 1: 'The Clutch', 2: 'The Tote', 3: 'The Beach Bag' };
  var TIER_LINES = { 1: 'Ten days of glow', 2: 'Twenty days of glow', 3: 'A month of glow' };   // one a day × 10 pops a bag
  function repeat(n, s) { var o = ''; for (var i = 0; i < n; i++) o += s; return o; }
  function tierArt(p, n) {
    if (p.status === 'available') return repeat(n, POUCH);
    return '<span class="tier-alt">' + (p.kind === 'gummy' ? GUMMY_SVG : ENVELOPE_SVG) + '<span class="tier-alt__n">× ' + n + '</span></span>';
  }
  function qtyText(p, n) { return n + (n > 1 ? ' bags' : ' bag') + ' · ' + (p.perBag ? (n * p.perBag) + ' pops' : PH('Count')); }
  function initShop() {
    var form = $('#bagForm');
    if (!form) return;
    var sel = $('[data-summary]', form), terms = $('[data-terms]', form), label = $('[data-submit-label]', form);
    var msg = $('.bag__msg', form), notice = $('[data-shop-notice]', form);
    function cur() {
      var t = form.querySelector('input[name="tier"]:checked'), m = form.querySelector('input[name="mode"]:checked');
      return { n: t ? +t.value : 2, sub: !!(m && m.value === 'sub') };
    }
    function update() {
      var p = state.product, c = cur(), avail = p.status === 'available';
      var title = p.id === 'strawberry-pop' ? 'Strawberry Peptide Lollipops' : p.name;
      sel.innerHTML = title + ' · ' + TIER_NAMES[c.n] + ' · ' + qtyText(p, c.n);
      terms.innerHTML = c.sub
        ? '<i data-lucide="repeat"></i>Delivered every ' + PH('XX days') + ' · terms ' + PH('Terms')
        : '<i data-lucide="truck"></i>Free shipping on every order';
      label.innerHTML = avail ? (c.sub ? 'Subscribe' : 'Add to beach bag') + ' · $' + PH('XX') : 'Join the waitlist';
      msg.textContent = '';
      icons();
    }
    function renderProduct(p) {
      var avail = p.status === 'available';
      [1, 2, 3].forEach(function (n) {
        var q = $('[data-tier-qty="' + n + '"]', form), a = $('[data-tier-art="' + n + '"]', form), l = $('[data-tier-line="' + n + '"]', form);
        if (q) q.innerHTML = qtyText(p, n);
        if (l) l.textContent = p.perBag ? TIER_LINES[n] : (p.status === 'coming-soon' ? 'Arriving soon' : 'In development');
        if (a) a.innerHTML = tierArt(p, n);
      });
      notice.hidden = avail;
      if (!avail) notice.innerHTML = '<i data-lucide="mail"></i><span>' + (p.status === 'coming-soon'
        ? 'Green Gummies are arriving soon. Sizes and prices are placeholders until launch.'
        : 'More colors are in development. Everything here is a placeholder for now.') + '</span>';
      form.classList.toggle('is-preview', !avail);
      update();
    }
    form.addEventListener('change', update);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var p = state.product, c = cur();
      if (p.status !== 'available') {
        var wl = $('#waitlist'), em = $('#wl-email');
        if (lenis) lenis.scrollTo(wl, { offset: -110, duration: 1.1 }); else wl.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        setTimeout(function () { em.focus({ preventScroll: true }); }, reduce ? 0 : 900);
        return;
      }
      msg.textContent = 'Prototype: checkout isn’t connected yet. ' + TIER_NAMES[c.n] + ' (' + (c.n * p.perBag) + ' pops' + (c.sub ? ', subscribe & save' : '') + ') would go in your bag here.';
    });
    listeners.push(renderProduct);
    renderProduct(state.product);
  }

  /* ───────────────────────── 15 · Gummies waitlist (no network, friendly inline message) ───────────────────────── */
  function initWaitlist() {
    var f = $('#waitlistForm');
    if (!f) return;
    var inp = $('#wl-email', f), msg = $('.waitlist__msg', f);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(inp.value.trim());
      inp.setAttribute('aria-invalid', ok ? 'false' : 'true');
      msg.classList.toggle('is-error', !ok);
      msg.textContent = ok ? 'You’re on the list! (Prototype: nothing was sent.)' : 'Please enter a valid email address.';
      if (ok) inp.value = ''; else inp.focus();
    });
  }

  /* ───────────────────────── 16 · FAQ accordion ───────────────────────── */
  function initFaq() {
    var faq = $('#faq');
    if (faq) faq.classList.add('faq--js');            // answers collapse only once the accordion is wired up
    $$('.faq__item').forEach(function (item, i) {
      var b = $('button', item);
      var set = function (open) { b.setAttribute('aria-expanded', open ? 'true' : 'false'); item.classList.toggle('is-open', open); };
      b.addEventListener('click', function () { set(b.getAttribute('aria-expanded') !== 'true'); });
      if (i === 0) set(true);
    });
  }

  /* ───────────────────────── 17 · Finale: the lollipop moon rises, photo settles ───────────────────────── */
  function initFinale() {
    if (!motionOK) return;
    gsap.fromTo('.finale__moon', { yPercent: 90, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, ease: 'none', scrollTrigger: { trigger: '.finale', start: 'top 80%', end: 'top 10%', scrub: .6 } });
    gsap.fromTo('.finale__photo img', { scale: 1.14 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.finale', start: 'top bottom', end: 'bottom bottom', scrub: .6 } });
  }

  /* ───────────────────────── 18 · Sticky mobile shop bar + nav "current section" ───────────────────────── */
  function initBuybar() {
    var bar = $('.buybar'), ctas = $('.hero__ctas'), shop = $('#shop'), foot = $('.foot'), fin = $('#finale');
    if (!bar || !('IntersectionObserver' in window)) return;
    var heroOut = false, shopIn = false, footIn = false, finIn = false;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.target === ctas) heroOut = !en.isIntersecting && en.boundingClientRect.top < 0;
        else if (en.target === shop) shopIn = en.isIntersecting;
        else if (en.target === foot) footIn = en.isIntersecting;
        else if (en.target === fin) finIn = en.isIntersecting;
      });
      bar.classList.toggle('is-on', heroOut && !shopIn && !footIn && !finIn);
    });
    [ctas, shop, foot, fin].forEach(function (el) { if (el) io.observe(el); });
  }
  function initCurrent() {
    if (!('IntersectionObserver' in window)) return;
    var links = $$('.nav__links a');
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = map[en.target.id];
        if (!a) return;
        if (en.isIntersecting) { links.forEach(function (l) { l.removeAttribute('aria-current'); }); a.setAttribute('aria-current', 'true'); }
        else a.removeAttribute('aria-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) { var s = doc.getElementById(id); if (s) io.observe(s); });
  }

  function initSections() {
    initReveals();
    initSwitcher();
    initDay();
    initStamps();
    initSugar();
    initShop();
    initWaitlist();
    initFaq();
    initFinale();
    initBuybar();
    initCurrent();
  }

  /* ───────────────────────── 99 · Boot ───────────────────────── */
  function smooth() {
    if (!motionOK || !finePointer || !window.Lenis) return;
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function boot() {
    icons();
    smooth();
    initNav();
    initPalms();
    initHero();
    initDayGrade();
    initBadges();
    if (typeof initSections === 'function') initSections();
    if (hasGSAP) {
      window.addEventListener('load', function () { ScrollTrigger.refresh(); });
      if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }
    window.GloPop = { PRODUCTS: PRODUCTS, setProduct: setProduct, get product() { return state.product; } };
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
