/* ═══════════════════════════════════════════════════════════════════════════
   Model Pops — the pop that rides the page (rider.js)
   Classic script, loaded after app.js (works from file:// and over http). Its styles: site/rider.css.

   ONE POP, ONE MOVE. As the hero scrolls away, its own 3D candy (no second WebGL context) leaves the pool and
   glides into the stop under it: the centre of the club emblem ([data-dock] in index.html, placed by rider.css),
   which becomes a stamp around it. Scroll back and it glides home.
   · It is tied to the scroll, the way the archived Sweet Riot page did it: how far along it is depends only on how
     far you have scrolled (from the top, until the emblem sits in the middle of the view), eased at both ends, so
     it leaves the pool moving with the page and settles into the emblem moving with the page. Nothing chases
     anything: stop scrolling and it stops, scroll back and it goes back.
   · It lives on the page, not on the window: its place is worked out in page coordinates, so the browser itself
     scrolls it with everything else and it cannot drift out of step. Only its progress is softened a touch (SOFT,
     a few hundredths of a second), which takes the steps out of a mouse wheel.
   · Leaving the pool is seamless: the same bob and the same water shadow as the hero's, both easing away as it
     goes; over the page it has a soft shadow down-right (the one sun, upper left) instead.
   · While it is still wholly over the water it can be touched as in the hero (a tap for a bite, a drag to turn it,
     the water rippling under the pointer); the pool's hint and the pop's caption fade as it leaves.
   · The product is the product: this file only moves it and scales it (uniformly, never above its own size).
   · No stop (a phone or tablet, summer's photo, another product, no 3D) or reduced motion: nothing happens, the
     pop stays in the pool and the emblem keeps its words.
   · Cost: it plugs into app.js's one frame loop (window.__modelpops.plugRider) and asks for frames only while its
     progress is catching up. At rest, anywhere, it rides with the page for free.
   QA: ?rs=<ms> sets SOFT (0 = rigid, 80 = the default, 200 = very soft).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var MP = window.__modelpops, doc = document, html = doc.documentElement;
  if (!MP || typeof MP.plugRider !== 'function' || !MP.hero) return;
  var heroSec = doc.querySelector('.hero'), heroFig = doc.querySelector('.hero__candy'), heroFloat = doc.getElementById('heroFloat'), mount = doc.getElementById('heroCandy');
  var stopEl = doc.querySelector('[data-dock]');
  if (!heroSec || !heroFig || !heroFloat || !mount || !stopEl) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;   // no travel

  var HERO = MP.hero;                                   // { state, cast } (app.js module 6)
  var emblem = stopEl.parentNode;
  var takes = (stopEl.getAttribute('data-for') || '').split(/\s+/).filter(Boolean);
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (t) { return t * t * (3 - 2 * t); };
  var softQ = parseFloat(new URLSearchParams(location.search).get('rs'));
  var SOFT = isFinite(softQ) ? clamp(softQ, 0, 400) : 80;   // ms: how softly its progress follows the scroll

  // the sheet it rides in (it scrolls with the page), and its box (the hero's mount goes in there, then is scaled)
  var layer = doc.createElement('div'), box = doc.createElement('div');
  layer.className = 'rider'; layer.setAttribute('aria-hidden', 'true');
  box.className = 'rider__box';
  layer.appendChild(box); doc.body.appendChild(layer);
  // (the box is outside .hero: hand its pointer moves and presses to the pool, so the water still ripples under the pop's box)
  ['pointermove', 'pointerdown'].forEach(function (type) { box.addEventListener(type, function (e) { heroSec.dispatchEvent(new PointerEvent(type, { clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId, pointerType: e.pointerType, bubbles: false })); }, { passive: true }); });

  var api = null;                  // the hero's candy, once it is ready (window.__modelpops.heroCandy)
  var on = false, wasOn = false;   // is the stop there to glide to?
  var away = false;                // is the mount out of the pool, in the sheet?
  var u = 0, us = 0;               // how far the scroll says it is (0 pool, 1 stop), and how far it is
  var sy = 0, vh = 0, MW = 0, MH = 0, home = null, stop = null, poolEdge = 0, s0 = 0, s1 = 1;
  var dirty = true, frames = 0, measuredAt = -99, arrive = -1, held = false, shadowCss = '', sh = null;
  var X = 0, Y = 0, K = 1, LIFT = 0;   // what shows: its footprint's centre (page px), scale, lift
  var touchable = false;           // wholly over the water: it takes the pointer, as in the hero
  var leaveV = -1;                 // --leave on the hero (0 in the pool, 1 once it has set off): its hint and caption fade
  var HG = 0, opV = '';            // the hero's drop-in, if it is still landing when the pop sets off (carried over)
  var printing = false;
  var marginV = '';                // the section's scroll margin, as last set

  function chosen() { return html.getAttribute('data-product') || 'strawberry-pop'; }
  // where the candy shows inside its mount (mount px, scale 1), in the unit app.js's heroZones() uses
  function foot() {
    var m = Math.min(MH / 6.48, MW / 3.67), kind = api ? api.product.kind : 'lollipop';
    return kind === 'capsule' ? { cx: MW / 2 + 0.05 * m, cy: MH / 2 + 0.12 * m, w: 4.3 * m, h: 2.6 * m }
      : { cx: MW / 2, cy: MH / 2, w: 3.4 * m, h: 5.75 * m };
  }

  var secEl = stopEl.closest('section'), headEl = secEl ? secEl.querySelector('.eyebrow') : null, navEl = doc.getElementById('nav');
  function pageTop(n) { var y = 0, o; while (n) { y += n.offsetTop; o = n.offsetParent; if (o) y += o.clientTop; n = o; } return y; }

  // ── read phase (app.js's loop, after its own reads) ──
  function measure() {
    var fr = heroFig.getBoundingClientRect(), hr = heroSec.getBoundingClientRect();
    home = { x: fr.left, y: fr.top + sy, w: fr.width, h: fr.height };
    poolEdge = hr.bottom + sy - 24;                      // where the water ends (the coping lies along the hero's foot)
    var w = heroFloat.offsetWidth, h = heroFloat.offsetHeight;
    if (w && h && (w !== MW || h !== MH)) {
      MW = w; MH = h;
      if (away) { box.style.width = MW + 'px'; box.style.height = MH + 'px'; }
    }
    on = (!takes.length || takes.indexOf(chosen()) >= 0) && stopEl.offsetParent !== null && MW > 0;
    if (on) {   // (its place in the layout, not where it is drawn: the postcard is still sliding into view as the pop sets off)
      var x = 0, y = 0, n = stopEl, o;
      while (n) { x += n.offsetLeft; y += n.offsetTop; o = n.offsetParent; if (o) { x += o.clientLeft; y += o.clientTop; } n = o; }
      stop = stopEl.offsetWidth && stopEl.offsetHeight ? { x: x, y: y, w: stopEl.offsetWidth, h: stopEl.offsetHeight } : null; on = !!stop;
    }
    // the stretch of scrolling the move is spread over: it sets off as the pop's own middle passes a line a little
    // below the middle of the view (at once, on most screens) and has landed when the emblem's middle is just above it
    if (on) {
      s0 = Math.max(0, home.y + foot().cy - vh * 0.56);
      var pad = parseFloat(getComputedStyle(html).scrollPaddingTop) || 0;
      var navH = navEl ? navEl.offsetHeight : 0, ringH = emblem.offsetHeight, ringTop = pageTop(emblem);
      s1 = Math.max(s0 + vh * 0.45, Math.min(stop.y + stop.h / 2 - vh * 0.46, headEl ? pageTop(headEl) - pad : 1e9, ringH + 32 <= vh - navH ? ringTop - navH - 16 : 1e9));
      var sm = Math.round(pageTop(secEl || stopEl) - pad - s1 - 1) + 'px'; if (secEl && sm !== marginV) { marginV = sm; secEl.style.scrollMarginTop = sm; }   // (a link to the section finds the pop landed)
    } else if (secEl && marginV !== '') { marginV = ''; secEl.style.scrollMarginTop = ''; }
  }
  function read(st) {
    if (printing) return;
    if (!api) { api = MP.heroCandy || null; if (!api) return; dirty = true; }
    sy = st.sy; vh = window.innerHeight; frames++;
    if (dirty || frames - measuredAt >= 40) { measure(); dirty = false; measuredAt = frames; }
    u = on ? clamp((sy - s0) / (s1 - s0), 0, 1) : 0;
    if (on && !wasOn) {             // (a page opened part-way down, or the stop just appeared: it is simply there, and so is the stamp)
      us = u;
      emblem.classList.add('is-snap'); setTimeout(function () { emblem.classList.remove('is-snap'); }, 60);
    }
    wasOn = on;
  }

  // ── moves ──
  function leave() {                // out of the pool, into the sheet
    away = true; HERO.state.away = true;
    box.style.width = MW + 'px'; box.style.height = MH + 'px';
    box.appendChild(mount); box.classList.add('is-on');
    if (api) api.resume();
  }
  function goHome(keep) {           // back in the pool: the hero as it always is (keep: this frame's water shadow stays)
    away = false;
    if (mount.parentNode !== heroFloat) heroFloat.insertBefore(mount, heroFloat.firstChild);
    box.classList.remove('is-on', 'is-wet'); touchable = false; box.style.filter = ''; shadowCss = '';
    if (opV !== '') { opV = ''; box.style.opacity = ''; }
    HERO.state.away = false; HERO.state.sil = false;
    if (api) api.resume();
    if (!keep && MP.water && MP.water.shadow === sh) MP.water.shadow = null;
  }
  function setLeave(v) {
    v = Math.round(v * 50) / 50; if (v === leaveV) return;
    leaveV = v; heroSec.style.setProperty('--leave', v);
  }
  // the emblem turns into a stamp around the pop as it arrives (style.css reads --arrive, 0 to 1)
  function setArrive(v) {
    v = Math.round(v * 50) / 50; if (v === arrive) return;
    arrive = v; emblem.style.setProperty('--arrive', v);
  }
  // while it rests in the stop the stop is marked (.is-held): the archive pill (app.js) steps aside for it as for any picture
  function hold(v) {
    if (v === held) return;
    held = v; stopEl.classList.toggle('is-held', v);
    if (MP.archive && MP.archive.settle) MP.archive.settle();
  }

  // ── write phase (after the hero's, before the water renders) ──
  function write(st) {
    if (!api || printing) return;
    if (!on) { if (away) goHome(); us = 0; setArrive(0); setLeave(0); hold(false); return; }
    // its progress follows the scroll's, softened a touch (the same however fast the screen refreshes)
    if (us !== u) {
      us = SOFT > 0 ? us + (u - us) * (1 - Math.exp(-clamp(st.dt || 16, 1, 100) / SOFT)) : u;
      if (Math.abs(u - us) < 0.0004) us = u;
    }
    var e = smooth(us);             // eased at both ends: it leaves with the page and lands with the page
    setArrive(clamp((e - 0.55) / 0.4, 0, 1));
    setLeave(clamp(e / 0.1, 0, 1));
    hold(us === 1);
    if (us === 0) {   // home: this frame's water shadow is cast first (the hero's own takes over on its next write)
      if (away) { if (MP.water) { LIFT = 0; HG = 0; poolShadow(home.x, home.y - sy, 1, Math.sin(st.t * 0.9) * 7, 1); } goHome(true); }
      return;
    }
    if (!away) leave();

    var f = foot(), ax = home.x + f.cx, ay = home.y + f.cy, bx = stop.x + stop.w / 2, by = stop.y + stop.h / 2;
    var bk = Math.min(1, stop.w / f.w, stop.h / f.h), arc = Math.sin(Math.PI * e);   // (never above its own size: the canvas would blur)
    X = lerp(ax, bx, e); Y = lerp(ay, by, e); K = lerp(1, bk, e); LIFT = 0.5 * arc;   // (a straight line across the page)
    var dp = HERO.state.drop0 ? clamp((performance.now() - HERO.state.drop0) / 1250, 0, 1) : 1, hg = Math.pow(1 - dp, 3);   // the hero's drop-in (app.js heroWrite)
    var k0 = K * (1 + 0.06 * LIFT), kk = k0 * (1 + hg * 0.14); HG = hg;
    var bob = Math.sin(st.t * 0.9) * 7 * clamp(1 - e / 0.2, 0, 1);   // the pool's own gentle bob, easing away as it leaves the water
    var tx = X - f.cx * kk, ty = Y - f.cy * kk;
    box.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + (ty + bob - hg * 26).toFixed(1) + 'px,0) scale(' + kk.toFixed(4) + ')';
    var op = hg > 0 ? Math.min(1, (1 - hg) * 2.5).toFixed(3) : ''; if (op !== opV) { opV = op; box.style.opacity = op; }

    // its shadow: the water's while it is over the pool (the hero's own way), a soft one on the page after that
    var wet = clamp((poolEdge - (Y - 0.08 * f.h * kk)) / (0.4 * f.h * kk), 0, 1);
    // wholly over the water it takes the pointer (a bite, a drag), and a bite's ripple starts under the ball
    var touch = wet === 1; if (touch !== touchable) { touchable = touch; box.classList.toggle('is-wet', touch); }
    if (touch && HERO.cast.lensN) HERO.state.head = [tx + HERO.cast.lens[0] * MW * kk, ty - sy + bob + HERO.cast.lens[1] * MH * kk];
    var dry = Math.round((1 - wet) * 20) / 20, l = Math.round(LIFT * 20) / 20, css = '';
    if (dry > 0) {
      var Hf = f.h, d1 = (0.026 + 0.1 * l) * Hf, d2 = (0.085 + 0.16 * l) * Hf;
      css = 'drop-shadow(' + (0.61 * d1).toFixed(1) + 'px ' + (0.79 * d1).toFixed(1) + 'px ' + ((0.011 + 0.05 * l) * Hf).toFixed(1) + 'px rgba(74,13,46,' + (0.36 * (1 - 0.6 * l) * dry).toFixed(3) + ')) ' +
        'drop-shadow(' + (0.61 * d2).toFixed(1) + 'px ' + (0.79 * d2).toFixed(1) + 'px ' + ((0.05 + 0.08 * l) * Hf).toFixed(1) + 'px rgba(74,13,46,' + (0.17 * (1 - 0.4 * l) * dry).toFixed(3) + '))';
    }
    if (css !== shadowCss) { shadowCss = css; box.style.filter = css; }
    HERO.state.sil = wet > 0;
    if (MP.water) { if (wet > 0) poolShadow(X - f.cx * k0, Y - f.cy * k0 - sy, k0, bob, wet); else if (MP.water.shadow === sh) MP.water.shadow = null; }
  }
  // the water's shadow of the pop: the same as the hero's (app.js heroWrite), from where it floats now (window px)
  function poolShadow(vx, vy, kk, bob, wet) {
    var C = HERO.cast;
    if (!C || !C.n) { if (MP.water.shadow === sh) MP.water.shadow = null; return; }
    if (!sh) sh = { box: [0, 0, 1, 1], blur: 0, wide: 0, a: 0, clip: 1e5, lens: new Float32Array(12), leak: new Float32Array(12) };
    var SW = MW * kk, SH = MH * kk, fh = SH, hgt = LIFT + HG;
    var off = 1 + hgt * 0.9 + (bob + 7) / 80, soft = 1 + hgt * 1.1 + (bob + 7) / 110;
    var reach = C.kind === 'lollipop' ? 0.263 : 0.18;
    var ox = 0.61 * reach * fh * off, oy = 0.79 * reach * fh * off;
    sh.box[0] = vx + ox; sh.box[1] = vy + oy; sh.box[2] = SW; sh.box[3] = SH;
    sh.blur = fh * (0.012 + hgt * 0.07 + (bob + 7) / 4200);
    sh.wide = fh * (0.06 + hgt * 0.09);
    sh.a = 0.28 * wet * Math.min(1, (1 - HG) * 1.4);
    sh.clip = HERO.state.clip != null ? HERO.state.clip : 1e5;
    for (var i = 0; i < 3; i++) {
      var L = sh.lens, j = i * 4;
      if (i >= C.lensN) { L[j + 3] = 0; continue; }
      var R = 1.54 * C.lens[i * 3 + 2] * SH * soft;
      L[j] = vx + C.lens[i * 3] * SW + ox + 0.1 * R; L[j + 1] = vy + C.lens[i * 3 + 1] * SH + oy + 0.08 * R;
      L[j + 2] = Math.max(R, 1); L[j + 3] = C.kind === 'lollipop' ? 1 : 0;
    }
    for (i = 0; i < 3; i++) {
      var Q = sh.leak, q = i * 4;
      if (!C.leak || i >= C.leakN) { Q[q + 3] = 0; continue; }
      Q[q] = vx + C.leak[i * 3] * SW + ox; Q[q + 1] = vy + C.leak[i * 3 + 1] * SH + oy;
      Q[q + 2] = Math.max(C.leak[i * 3 + 2] * SH * (1 + hgt * 0.5), 1); Q[q + 3] = C.leakS * wet;
    }
    MP.water.shadow = sh;
  }
  function busy() { return !!api && on && us !== u; }   // frames are needed only while its progress catches up

  // ── what moves things without a scroll: a resize, the main column changing height, the product, the fonts ──
  var kick = function () { dirty = true; if (MP.kick) MP.kick(); };
  window.addEventListener('resize', kick, { passive: true });
  window.addEventListener('load', kick);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(kick);
  if (window.ResizeObserver) { var main = doc.getElementById('main'); if (main) new ResizeObserver(kick).observe(main); }
  if (window.MutationObserver) new MutationObserver(kick).observe(html, { attributes: true, attributeFilter: ['data-product', 'data-season', 'class'] });

  window.addEventListener('beforeprint', function () { printing = true; if (away) goHome(); setArrive(0); setLeave(0); hold(false); wasOn = false; });
  window.addEventListener('afterprint', function () { printing = false; kick(); });

  var broken = false;
  function safe(fn) {
    return function (st) {
      if (broken) return false;
      try { return fn(st); } catch (e) {
        broken = true;
        try { goHome(); setArrive(0); } catch (e2) { /* nothing more to do */ }
        if (window.console) console.warn('[rider] stopped: ' + (e && e.message));
        return false;
      }
    };
  }
  MP.plugRider({ read: safe(read), write: safe(write), busy: safe(busy) });
  // QA: where it is, and the stop it knows
  MP.rider = {
    state: function () {
      return { at: !away ? 'hero' : us === 1 ? stopEl.getAttribute('data-dock') : 'between', flying: away && us < 1, glued: away && us === 1, shown: away, away: !!HERO.state.away,
        p: +u.toFixed(4), ps: +us.toFixed(4), sy: sy, soft: SOFT, k: +K.toFixed(3), lift: +LIFT.toFixed(3), x: Math.round(X), y: Math.round(Y), from: Math.round(s0), span: Math.round(s1), mount: [MW, MH] };
    },
    docks: function () {
      return [{ id: stopEl.getAttribute('data-dock'), on: on, takes: takes.join(' ') || 'all', r: stop ? [Math.round(stop.x), Math.round(stop.y), Math.round(stop.w), Math.round(stop.h)] : null }];
    }
  };
})();
