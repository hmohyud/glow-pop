/* ═══════════════════════════════════════════════════════════════════════════
   Model Pops — the pop that rides the page (rider.js)
   Classic script, loaded after app.js (works from file:// and over http). Its styles: site/rider.css.

   ONE POP. The hero's own 3D candy (no second WebGL context) leaves the pool as you scroll and turns up in a
   few docks down the page, where it means something; scroll back up and it drops into the pool again.
   · Docks: empty boxes reserved in the layout (index.html [data-dock], placed by rider.css), so it never covers
     copy, a control or the fixed UI. data-for: the products a dock takes (the chosen one, html[data-product]);
     data-wear="menu": the pop wears the menu card's product there; data-pool: a dock over the water, where the
     water casts its shadow (as in the hero); anywhere else it rests just above the page, with a soft shadow
     down-right (the one sun, upper left). data-hop: the dock it may hop to, the lane between them kept clear.
   · Moves: it rests in the dock nearest the reading line once that dock is well in view, riding with the page
     (an absolute sheet: resting costs nothing while you scroll) and floating a touch behind a quick scroll.
     Between two hop-linked docks it hops along a short arc; anywhere else a dock leaving the screen sends it out
     with a little pop, and the next one it pops into. Whenever it is in no dock it is home: its mount back in
     #heroFloat, where the hero works exactly as it always has (shadow, ripples, bites); the pool replays its
     drop-in the next time it comes into view.
   · The product is the product: the library's own setProduct changes it; this file only moves, scales
     (uniformly) and turns it.
   · Reduced motion: no travel. It simply is in each dock as you reach it, and in the pool.
   · Cost: dock boxes are read only while scrolling or after the page moved (a resize, the main column changing
     height); at rest it does nothing. It plugs into app.js's one frame loop (window.__modelpops.plugRider).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var MP = window.__modelpops, doc = document, html = doc.documentElement;
  if (!MP || typeof MP.plugRider !== 'function' || !MP.hero) return;
  var heroFig = doc.querySelector('.hero__candy'), heroFloat = doc.getElementById('heroFloat'), mount = doc.getElementById('heroCandy');
  var dockEls = doc.querySelectorAll('[data-dock]');
  if (!heroFig || !heroFloat || !mount || !dockEls.length) return;

  var HERO = MP.hero;                                   // { state, cast, silWake, dropIn } (app.js module 6)
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nav = doc.getElementById('nav'), bar = doc.getElementById('shopbar');
  var cabMount = doc.getElementById('cabanaCandy'), cabSec = doc.getElementById('cabanas');
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var outCubic = function (t) { return 1 - Math.pow(1 - t, 3); };
  var inCubic = function (t) { return t * t * t; };
  var inOutSine = function (t) { return 0.5 - 0.5 * Math.cos(Math.PI * t); };
  var outBack = function (t) { var c = 1.3; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  var TAU = Math.PI * 2;

  // the sheet it rides in, and its box (the hero's mount goes in there, at the mount's own size, then is scaled)
  var layer = doc.createElement('div'), box = doc.createElement('div');
  layer.className = 'rider'; layer.setAttribute('aria-hidden', 'true');
  box.className = 'rider__box';
  layer.appendChild(box); doc.body.appendChild(layer);

  // the docks; HOME is the pool (the hero's float)
  var HOME = { id: 'hero', home: true, pool: true, r: null, on: true };
  var docks = Array.prototype.map.call(dockEls, function (el) {
    return {
      id: el.getAttribute('data-dock'), el: el, takes: (el.getAttribute('data-for') || '').split(/\s+/).filter(Boolean),
      wear: el.getAttribute('data-wear') || '', pool: el.hasAttribute('data-pool'),
      hops: (el.getAttribute('data-hop') || '').split(/\s+/).filter(Boolean),
      sec: el.closest('section') || el.parentNode, r: null, on: false
    };
  });

  var api = null;                  // the hero's candy, once it is ready (window.__modelpops.heroCandy)
  var cur = HOME;                  // the dock it belongs to (HOME: in the pool)
  var tw = null;                   // the move under way: { type: 'in' | 'out' | 'hop', dock, to, t0, dur, from, then, arc }
  var s = { x: 0, y: 0, k: 1, o: 0, l: 0, rot: 0 };   // what shows: centre (page px), scale, opacity, lift (0 resting, 1 high), turn
  var MW = 0, MH = 0;              // the mount's size: the hero's float (the 3D canvas never resizes while it rides)
  var pend = HOME, pendT = 0, dirty = true, frames = 0, armed = false, lastMenu = null, redress = false;
  var sy = 0, vh = 0, insetTop = 0, insetBot = 0, cabOn = false, lastSy = null, lastTs = 0, vel = 0, dir = 0, lag = 0, measuredAt = -1, measuredSy = -1e9;
  var shadowCss = '', sh = null, held = null;

  // ── the product it wears: the chosen one, or the menu card's at the menu ──
  function chosen() { return html.getAttribute('data-product') || 'strawberry-pop'; }
  function product(id) { var L = MP.products || []; for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return null; }
  function takes(d) { return !d.takes.length || d.takes.indexOf(chosen()) >= 0; }
  function wearOf(d) { return product(d && d.wear === 'menu' && MP.menu && MP.menu.product ? MP.menu.product : chosen()); }
  function dress(d, quick) {
    var p = wearOf(d); if (!p || !api) return;
    var c = p.candy, now = api.product;
    if (now.kind === c.kind && String(now.color).toLowerCase() === String(c.color).toLowerCase()) return;
    api.setProduct({ kind: c.kind, color: c.color }, { duration: quick ? 0.05 : 0.9 });
  }

  // ── where it shows inside its mount (mount px, scale 1), over a whole turn of its idle spin (the pop's lean swings
  // round as it turns; the capsules sway): measured from its frames, in the unit app.js's heroZones() uses
  function foot() {
    var u = Math.min(MH / 6.48, MW / 3.67), kind = api ? api.product.kind : 'lollipop';
    return kind === 'capsule' ? { cx: MW / 2 + 0.05 * u, cy: MH / 2 + 0.12 * u, w: 4.3 * u, h: 2.6 * u }
      : { cx: MW / 2, cy: MH / 2, w: 3.4 * u, h: 5.75 * u };
  }
  // where it rests in a dock: its footprint's centre (page px) and its scale, fitted inside the dock's box
  function fit(d, f) {
    var r = d.r;
    if (!r) return { x: s.x, y: s.y, k: s.k };       // (a dock just gone: where it is)
    if (d === HOME) return { x: r.x + f.cx, y: r.y + f.cy, k: 1 };
    return { x: r.x + r.w / 2, y: r.y + r.h / 2, k: Math.min(r.w / f.w, r.h / f.h) };
  }
  // how much of a box (page px) is on screen, between the nav and the shop bar
  function vis(r) {
    if (!r || !r.h) return 0;
    var top = sy + insetTop, bot = sy + vh - insetBot;
    return clamp((Math.min(r.y + r.h, bot) - Math.max(r.y, top)) / r.h, 0, 1);
  }
  function seen() {                // is the pop on screen right now (in the sheet, visible)?
    if (!box.classList.contains('is-on') || s.o < 0.05) return false;
    var f = foot(), half = f.h * s.k / 2;
    return s.y + half > sy + insetTop && s.y - half < sy + vh - insetBot;
  }

  // ── read phase (app.js's loop, after its own reads) ──
  function measure() {
    insetTop = nav ? Math.max(0, nav.getBoundingClientRect().bottom) : 0;
    var br = bar && bar.classList.contains('is-visible') ? bar.getBoundingClientRect() : null;   // (phones only: none on a desktop)
    insetBot = br && br.height ? clamp(vh - br.top + 6, 0, vh * 0.3) : 0;
    var fr = heroFig.getBoundingClientRect();
    HOME.r = { x: fr.left, y: fr.top + sy, w: fr.width, h: fr.height };
    var w = heroFloat.offsetWidth, h = heroFloat.offsetHeight;
    if (w && h && (w !== MW || h !== MH)) {
      MW = w; MH = h;
      if (mount.parentNode === box) { box.style.width = MW + 'px'; box.style.height = MH + 'px'; }
    }
    // the cabanas show their own pop: never a second one beside it
    cabOn = false;
    if (cabMount && cabSec) {
      var cs = cabSec.getBoundingClientRect();
      if (cs.bottom > -vh * 0.5 && cs.top < vh * 1.5) { var cr = cabMount.getBoundingClientRect(); cabOn = cr.width > 0 && cr.bottom > insetTop && cr.top < vh - insetBot; }
    }
    docks.forEach(function (d) {
      d.on = takes(d) && d.el.offsetParent !== null;   // shown by rider.css at this width, for this product
      if (!d.on) { d.r = null; return; }
      var sr = d.sec.getBoundingClientRect();
      if (sr.bottom < -vh * 0.5 || sr.top > vh * 1.5) return;   // far off (its section may not even be laid out): its last box
      var r = d.el.getBoundingClientRect();
      d.r = r.width && r.height ? { x: r.left, y: r.top + sy, w: r.width, h: r.height } : null;
    });
  }
  // the dock it should be in: the one nearest the reading line, once it is well in view (while you scroll: its centre
  // between 20% and 84% of the view, the dock mostly on screen); it keeps its own a little longer (14% to 92%), so it
  // leaves with a pop while you can still see it. Once you stop, any dock (almost) wholly on screen will do. The
  // reading line leans the way you scroll (57% of the view going down, 33% going up, and it stays there when you
  // stop), so the pop sets off for the next dock while both are well in view and never hops back just because the
  // scrolling stopped. None (home) while the cabanas' own pop is on screen.
  function choose() {
    if (cabOn) return HOME;
    var u = Math.max(1, vh - insetTop - insetBot), L = sy + insetTop + u * (0.45 + 0.12 * dir), best = null, bestD = 1e9;
    var still = Math.abs(vel) < 40;
    for (var i = 0; i <= docks.length; i++) {
      var d = i < docks.length ? docks[i] : HOME;
      if (!d.on || !d.r) continue;
      var keep = d === (tw ? tw.to : cur), mid = d.r.y + d.r.h / 2, c = (mid - sy - insetTop) / u, v = vis(d.r);
      if (still ? v < (keep ? 0.5 : 0.9) : (c < (keep ? 0.14 : 0.2) || c > (keep ? 0.92 : 0.84) || v < (keep ? 0.3 : 0.55))) continue;
      var dist = Math.abs(mid - L) - (keep ? 0.03 * u : 0);
      if (dist < bestD) { bestD = dist; best = d; }
    }
    return best || HOME;
  }
  function read(st) {
    if (!api) {
      api = MP.heroCandy || null;
      if (!api) return;
      dirty = true; lastMenu = MP.menu ? MP.menu.product : null;
    }
    var ts = performance.now(), dt = lastTs ? clamp(ts - lastTs, 1, 100) : 16;
    lastTs = ts; sy = st.sy; vh = window.innerHeight;
    // the scroll's speed (px/s, smoothed): the float lags a touch behind it
    if (lastSy === null) lastSy = sy;
    var moved = sy - lastSy;
    vel = lerp(vel, moved / dt * 1000, 1 - Math.exp(-dt / 70));
    if (Math.abs(vel) > 60) dir = vel > 0 ? 1 : -1;
    lastSy = sy;
    frames++;
    // (every few frames while it scrolls, at once after a jump or anything that moved the page)
    if (dirty || Math.abs(sy - measuredSy) > vh * 0.2 || (moved !== 0 && frames - measuredAt >= 5)) { measure(); dirty = false; measuredAt = frames; measuredSy = sy; }
    var m = MP.menu ? MP.menu.product : null;
    if (m !== lastMenu) { lastMenu = m; redress = true; }
    var w = choose();
    if (w !== pend) { pend = w; pendT = ts; }
  }

  // ── moves ──
  function show() {
    if (mount.parentNode !== box) {
      HERO.state.away = true;
      box.style.width = MW + 'px'; box.style.height = MH + 'px';
      box.appendChild(mount);
    }
    box.classList.add('is-on');
    if (api) api.resume();
  }
  // home: the mount back in the pool, the hero as it always was; it drops in again next time the pool is in view
  function home(replay) {
    tw = null; cur = HOME;
    if (mount.parentNode !== heroFloat) heroFloat.insertBefore(mount, heroFloat.firstChild);
    box.classList.remove('is-on'); box.style.filter = ''; shadowCss = '';
    HERO.state.away = false; HERO.state.sil = false;
    if (api) { api.root.rotation.y = 0; s.rot = 0; dress(HOME, true); api.resume(); }
    armed = replay !== false;
    if (MP.water) MP.water.shadow = null;
  }
  function start(type, d, dur, then, to) {
    var f = foot(), p = fit(d, f);
    var dist = Math.hypot(p.x - s.x, p.y - s.y);
    tw = { type: type, dock: d, to: to || d, t0: performance.now(), dur: dur, then: then || null,
      from: { x: s.x, y: s.y, k: s.k, o: s.o, l: s.l, rot: s.rot }, arc: clamp(dist * 0.14, 20, 80) };
  }
  function popIn(d) {
    var f = foot(), p = fit(d, f);
    dress(d, true);                                    // (unseen: it changes at once)
    show();
    s.x = p.x; s.y = p.y; s.k = p.k * 0.62; s.o = 0; s.l = 1; s.rot = -Math.PI * 0.5;
    cur = d; start('in', d, 640);
    if (d.pool) HERO.silWake(1600);
  }
  function hop(d) {
    var f = foot(), p = fit(d, f), dist = Math.hypot(p.x - s.x, p.y - s.y), src = tw ? (tw.type === 'out' ? tw.dock : tw.to) : cur;
    dress(d, false);
    cur = d; start('hop', d, clamp(320 + dist * 0.4, 480, 820));
    tw.src = src;                                      // (its shadow is the old dock's kind for the first half of the way)
    if (d.pool) HERO.silWake(2000);
  }
  function go(dest) {
    if (reduce) { snap(dest); return; }
    var onShow = mount.parentNode === box;
    if (dest === HOME) {                               // out with a little pop, then home (the pool drops it in again)
      if (!onShow) return;
      if (seen()) start('out', cur, 300, function () { home(true); }, HOME);
      else home(true);
      return;
    }
    if (!onShow) {                                     // out of the pool: never while the pool is on screen
      if (HOME.r && vis(HOME.r) > 0.15) return;
      popIn(dest);
      return;
    }
    // two docks with a clear lane between them (data-hop): a hop; any others: out of one, into the other
    if (seen() && linked(cur, dest)) hop(dest);
    else if (seen()) start('out', cur, 280, function () { popIn(dest); }, dest);
    else popIn(dest);
  }
  function linked(a, b) { return !!(a && b && a.hops && b.hops && (a.hops.indexOf(b.id) >= 0 || b.hops.indexOf(a.id) >= 0)); }
  // reduced motion: no travel, it is simply there
  function snap(dest) {
    tw = null;
    if (dest === HOME) { if (mount.parentNode === box) home(false); return; }
    var f = foot(), p = fit(dest, f);
    dress(dest, true); show();
    cur = dest; s.x = p.x; s.y = p.y; s.k = p.k; s.o = 1; s.l = 0; s.rot = 0;
    if (dest.pool) HERO.silWake(1600);
  }
  function step(ts) {
    var f = foot();
    if (!tw) { if (cur !== HOME && cur.r) { var p0 = fit(cur, f); s.x = p0.x; s.y = p0.y; s.k = p0.k; } return; }
    var q = clamp((ts - tw.t0) / tw.dur, 0, 1), a = tw.from, d = tw.dock;
    if (!d.r) { var t0 = tw.then; tw = null; if (t0) t0(); return; }
    var p = fit(d, f);
    if (tw.type === 'in') {
      s.x = p.x; s.y = p.y; s.k = lerp(a.k, p.k, outBack(q)); s.o = lerp(a.o, 1, clamp(q * 2.6, 0, 1));
      s.l = a.l * (1 - outCubic(q)); s.rot = a.rot * (1 - outCubic(q));
    } else if (tw.type === 'out') {                    // (where it is: it may leave in mid-air)
      var e = inCubic(q);
      s.x = a.x; s.y = a.y; s.k = a.k * lerp(1, 0.62, e); s.o = a.o * (1 - e); s.l = lerp(a.l, 1, e); s.rot = a.rot + Math.PI * 0.5 * e;
    } else {
      var h = inOutSine(q), y = lerp(a.y, p.y, h), half = f.h * lerp(a.k, p.k, h) * 0.56;
      // a short arc, never up under the nav: the lift is mostly toward you (bigger, its shadow further off)
      s.x = lerp(a.x, p.x, h); s.y = y - Math.min(tw.arc, Math.max(0, y - half - sy - insetTop - 12)) * Math.sin(Math.PI * q);
      s.k = lerp(a.k, p.k, h); s.o = lerp(a.o, 1, clamp(q * 3, 0, 1)); s.l = Math.max(a.l * (1 - q), Math.sin(Math.PI * q));
      s.rot = lerp(a.rot, TAU, h);
    }
    if (q >= 1) {
      if (tw.type !== 'out') { s.rot = 0; s.l = 0; s.o = 1; }
      var then = tw.then; tw = null;
      if (then) then();
    }
  }

  // ── write phase (after the hero's, before the water renders) ──
  function place(ts, dt) {
    var f = foot(), mv = tw ? (tw.src && ts - tw.t0 < tw.dur * 0.5 ? tw.src : tw.dock) : cur;
    // a touch behind a quick scroll, settling back as it slows (never far: the docks leave room)
    lag = reduce ? 0 : lag + (clamp(vel * 0.012, -14, 14) - lag) * (1 - Math.exp(-dt / 150));
    if (Math.abs(lag) < 0.05) lag = 0;
    // on the water it bobs gently, like the pool's (7 px at the hero's size); still, with reduced motion
    var bob = mv.pool && !reduce ? Math.sin(ts / 1000 * 0.9) * 7 * (1 - s.l) : 0;
    var kk = s.k * (1 + 0.12 * s.l);
    // (lifted, it also sits a little higher up the page, as the hero's pop does as it drops in)
    var tx = s.x - f.cx * kk, ty = s.y + lag + (bob - 26 * s.l) * kk - f.cy * kk;
    box.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0) scale(' + kk.toFixed(4) + ')';
    box.style.opacity = s.o >= 0.999 ? '' : s.o.toFixed(3);
    if (api) api.root.rotation.y = s.rot;
    // its shadow: over the water the water casts it (the hero's way); on the page a soft one down-right, further
    // and softer the higher it is. Box px (the box is scaled), from the footprint's height.
    var css = '';
    if (!mv.pool) {
      var Hf = f.h, l = s.l, d1 = (0.026 + 0.1 * l) * Hf, d2 = (0.085 + 0.16 * l) * Hf;
      css = 'drop-shadow(' + (0.61 * d1).toFixed(1) + 'px ' + (0.79 * d1).toFixed(1) + 'px ' + ((0.011 + 0.05 * l) * Hf).toFixed(1) + 'px rgba(74,13,46,' + (0.36 * (1 - 0.6 * l)).toFixed(3) + ')) ' +
        'drop-shadow(' + (0.61 * d2).toFixed(1) + 'px ' + (0.79 * d2).toFixed(1) + 'px ' + ((0.05 + 0.08 * l) * Hf).toFixed(1) + 'px rgba(74,13,46,' + (0.17 * (1 - 0.4 * l)).toFixed(3) + '))';
    }
    if (css !== shadowCss) { shadowCss = css; box.style.filter = css; }
    HERO.state.sil = !!mv.pool;
    if (mv.pool && MP.water) poolShadow(tx, ty - sy, kk, ts);
  }
  // the water's shadow of the pop: the same as the hero's (app.js heroWrite), from where it floats now
  function poolShadow(vx, vy, kk, ts) {
    var C = HERO.cast;
    if (!C || !C.n) return;
    if (!sh) sh = { box: [0, 0, 1, 1], blur: 0, wide: 0, a: 0, clip: 1e5, lens: new Float32Array(12), leak: new Float32Array(12) };
    var SW = MW * kk, SH = MH * kk, fh = SH, hgt = s.l;
    var b = reduce ? 0 : Math.sin(ts / 1000 * 0.9) * 7 * (1 - s.l);
    var off = 1 + hgt * 0.9 + (b + 7) / 80, soft = 1 + hgt * 1.1 + (b + 7) / 110;
    var reach = C.kind === 'lollipop' ? 0.263 : 0.18;
    var ox = 0.61 * reach * fh * off, oy = 0.79 * reach * fh * off;
    sh.box[0] = vx + ox; sh.box[1] = vy + oy; sh.box[2] = SW; sh.box[3] = SH;
    sh.blur = fh * (0.012 + hgt * 0.07 + (b + 7) / 4200);
    sh.wide = fh * (0.06 + hgt * 0.09);
    sh.a = 0.28 * clamp(s.o * 1.4, 0, 1);
    for (var i = 0; i < 3; i++) {
      var L = sh.lens, j = i * 4;
      if (i >= C.lensN) { L[j + 3] = 0; continue; }
      var R = 1.54 * C.lens[i * 3 + 2] * SH * soft;
      L[j] = vx + C.lens[i * 3] * SW + ox + 0.1 * R; L[j + 1] = vy + C.lens[i * 3 + 1] * SH + oy + 0.08 * R;
      L[j + 2] = Math.max(R, 1); L[j + 3] = C.kind === 'lollipop' ? 1 : 0;
      sh.leak[j + 3] = 0;
    }
    MP.water.shadow = sh;
  }
  // the dock it rests in is marked (.is-held): the archive pill (app.js) steps aside for it as for any picture
  function hold(d) {
    if (d === held) return;
    if (held) held.el.classList.remove('is-held');
    held = d;
    if (held) held.el.classList.add('is-held');
    if (MP.archive && MP.archive.settle) MP.archive.settle();
  }
  function write(st) {
    if (!api) return;
    var ts = performance.now(), dt = clamp(st.dt || 16, 1, 100);
    var target = tw ? tw.to : cur;
    // (a choice holds a moment first, and nothing pops in during a fast jump: a link's smooth scroll flies past)
    if (pend !== target && ts - pendT >= (Math.abs(vel) < 40 ? 180 : 80) && (pend === HOME || Math.abs(vel) < 2600)) go(pend);
    if (redress && !tw) { if (cur !== HOME && cur.wear === 'menu') dress(cur, false); redress = false; }
    step(ts);
    if (mount.parentNode === box) place(ts, dt);
    hold(!tw && cur !== HOME && mount.parentNode === box ? cur : null);
    // back in the pool: it drops in again as the pool comes into view
    if (armed && HOME.r && HOME.r.y + HOME.r.h > sy + insetTop - 90 && HOME.r.y < sy + vh + 90) {
      armed = false;
      if (!reduce && mount.parentNode === heroFloat) HERO.dropIn();
    }
  }
  function busy() {                // frames are needed: a move, a dock to change, or the float settling
    if (!api) return false;
    var target = tw ? tw.to : cur;
    return !!tw || pend !== target || (mount.parentNode === box && (lag !== 0 || Math.abs(vel) > 4));
  }

  // ── what moves the docks without a scroll: a resize, the main column changing height (an answer opening, the
  // facts drawer, a section laid out for the first time), the product, the fonts ──
  var kick = function () { dirty = true; if (MP.kick) MP.kick(); };
  window.addEventListener('resize', kick, { passive: true });
  window.addEventListener('load', kick);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(kick);
  if (window.ResizeObserver) { var main = doc.getElementById('main'); if (main) new ResizeObserver(kick).observe(main); }
  if (window.MutationObserver) new MutationObserver(kick).observe(html, { attributes: true, attributeFilter: ['data-product', 'class'] });

  var broken = false;
  function safe(fn) {
    return function (st) {
      if (broken) return false;
      try { return fn(st); } catch (e) {
        broken = true;
        try { home(false); } catch (e2) { /* nothing more to do */ }
        if (window.console) console.warn('[rider] stopped: ' + (e && e.message));
        return false;
      }
    };
  }
  MP.plugRider({ read: safe(read), write: safe(write), busy: safe(busy) });
  // QA: where it is, and the docks it knows
  MP.rider = {
    state: function () {
      return { at: cur.id, move: tw ? tw.type + '>' + tw.to.id : null, want: pend.id, shown: box.classList.contains('is-on'), away: !!HERO.state.away,
        k: +s.k.toFixed(3), o: +s.o.toFixed(3), lift: +s.l.toFixed(3), x: Math.round(s.x), y: Math.round(s.y), lag: +lag.toFixed(1),
        mount: [MW, MH], wear: api ? api.product : null, cabanas: cabOn };
    },
    docks: function () {
      return docks.map(function (d) { return { id: d.id, on: d.on, takes: d.takes.join(' ') || 'all', r: d.r ? [Math.round(d.r.x), Math.round(d.r.y), Math.round(d.r.w), Math.round(d.r.h)] : null, vis: d.r ? +vis(d.r).toFixed(2) : 0 }; });
    }
  };
})();
