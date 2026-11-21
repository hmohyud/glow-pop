/* Model Pops · Label Studio · 3D package mockup  ->  window.MPMockup
 *
 * Wraps the EXACT panel artwork (canvases) onto a photoreal 3D replica of the real item: the single-pop
 * flow wrap, the stand-up zip pouch or a 3-pack paperboard sleeve. Classic script: works when index.html is
 * opened by double-click (file://) and over http. three.js 0.160.0 is loaded on demand from unpkg (dynamic
 * import); nothing else is fetched: the studio light, the seal / wrinkle / paper detail and the soft
 * contact shadow are all generated here at runtime.
 *
 * THE ITEM IS BUILT FROM ITS SPEC (items.js -> window.MPItems, the one source of truth shared with the 2D
 * print layout): every dimension below comes from the spec numbers, so editing the spec reshapes the 3D item.
 *   wrapper (flow wrap): flat w x h; flat ribbed end-seal bands (endSeal.top / .bottom mm, endSeal.ribs
 *     horizontal ribs, straight cut edges); folded sides (no side seals); a pillow body whose sides pull in by
 *     bulge x w at mid-height (the film keeps its printed width: it wraps round the rounded side folds, so the
 *     thickness follows from the bulge); the longitudinal fin seal (finSeal.width): its seam (root) on the back
 *     centre line, as the print web puts it (MPItems.wrapper.web()), laid flat to one side (finSeal.fold 'left' /
 *     'right', seen looking at the back; 'either' = not known yet, drawn laid to the left).
 *   bag (stand-up pouch): flat w x h; die-cut top corners (cornerRadius); topSeal band; the zip track (two
 *     raised ridges between zip.top and zip.bottom, mm below the top); tear notches (tearNotch.fromTop, .depth,
 *     .shape 'round' = a half-round notch of radius depth, else a V) on both sides; sideSeal bands; a round-bottom gusset of gusset.depth (total depth when open), so
 *     it stands. The panels keep their printed width across the bulge, so the filled bag narrows towards the
 *     bottom as a real pouch (and the client's draft) does.
 *   sleeve3: flat w x h, depth.
 * The front view of either film item has the exact flat outline height and seal / zip / notch positions;
 * the width is the flat width at the seals and the filled width elsewhere.
 *
 *   const m = await MPMockup.create(container, {
 *     type: 'wrapper' | 'bag' | 'sleeve3',     // flow wrap · stand-up zip pouch · 3-pack sleeve box
 *     spec: MPItems.wrapper,                    // optional: the item spec (default window.MPItems[type])
 *     art: canvas,                              // the exact FRONT panel (flat w x h, no bleed); >= 2048 px long side
 *     artBack: canvas,                          // optional: the exact BACK panel (same size), as seen from behind
 *     finish: 'gloss' | 'satin' | 'matte',      // default 'satin'
 *     background: '#f4ece9' | 'transparent',    // scene backdrop
 *     view: 'front' | 'three-quarter' | 'hero' | 'back',   // default 'hero' (a calm three-quarter hero angle)
 *     // optional: sizeMM { w, h[, d] } (legacy: overrides the spec's flat size [and the gusset / box depth]),
 *     //           backColor '#hex' (plain back when there is no back art: else art.backColor, else the art's
 *     //           average edge colour), interactive (default true), pixelRatio (default min(dpr, 2)),
 *     //           onError(err), toneMapping 'neutral' (default) | 'aces' | 'agx'
 *   });
 *   m.setArt(front[, back])    // re-upload in place (no rebuild). back: a canvas, null = plain back,
 *                              // left out = the back stays as it is
 *   m.setSpec(spec[, front[, back]])   // rebuild from new spec numbers (the type follows spec.construction)
 *   m.setType(type[, sizeMM | spec[, front[, back]]])   // legacy: rebuild as another type / size
 *   m.setFinish(f); m.setView(v); m.setBackground(c); m.setBackColor(c | null)
 *   await m.snapshot({ scale: 2, transparent: false })   // -> PNG Blob at scale x the container's CSS size
 *   m.dispose()
 *   also: m.spec (the numbers in use), m.info() (sizes, spec, GPU, timings), m.lastError, m.resize(),
 *         MPMockup.preload() (fetch three.js early), MPMockup.resolveSpec(type, spec, sizeMM)
 *
 * The canvas is inserted as the container's FIRST child, absolutely positioned to fill it, so the host's
 * own overlays (placeholder, busy badge) stay on top; the host hides its placeholder once create() resolves.
 * On file://, pictures drawn into the art canvas must come from data: / blob: URLs, or the canvas is
 * "tainted" and WebGL cannot read it: the pack then shows a notice and onError / lastError explain why.
 *
 * Mapping: art pixel (0,0) is the top-left of the FRONT panel as seen from the front; back art pixel (0,0) is
 * the top-left of the BACK panel as seen from behind. Never mirrored, never cropped, never stretched: each
 * panel is exactly the flat w x h of the film (the seal bands are part of the printed panel). If an art's
 * aspect does not match it is fitted inside (letterboxed with its edge colour) and a warning is logged.
 * The wrapper's fin seal shows the back art it lies on (the print runs on across the seam). Without back art
 * the back is plain: backColor, else art.backColor, else the art's average edge colour. The bag's gusset
 * base and the sleeve's sides are plain (the sleeve's sides take the art's matching edge colour).
 *
 * Light: a procedural softbox studio (PMREM), key softbox UPPER LEFT, so shadows fall right / back. The
 * ground shadow is the key softbox's true area-light shadow, baked from 48 light directions (sharp where the
 * pack touches the floor, soft far from it), plus a contact-occlusion pass; it is re-baked only when the
 * pack turns. Tone mapping: Khronos PBR Neutral (keeps the print's colours; ACES / AgX shift saturated pinks).
 *
 * Interaction: drag = turn the pack (with inertia) and tilt the camera; wheel / pinch = gentle zoom;
 * double-click or Home = back to the view; arrow keys turn / tilt. Renders on demand only; pauses when the
 * container is offscreen or the tab is hidden.
 */
(function (global) {
  'use strict';
  if (global.MPMockup && global.MPMockup.version) return;

  var VERSION = '2.1.0';
  var THREE_URL = 'https://unpkg.com/three@0.160.0/build/three.module.js';
  var DEG = Math.PI / 180;

  // Mirror of items.js, used ONLY when items.js (window.MPItems) is not loaded. items.js is the source of
  // truth (interim numbers from the client's drafts: replace them with the printer's dieline there).
  var FALLBACK_ITEMS = {
    wrapper: {
      construction: 'flow-wrap', flat: { w: 65, h: 127.0 }, endSeal: { top: 6.4, bottom: 6.4, ribs: 7 },
      finSeal: { width: 8, fold: 'either' }, bulge: 0.058
    },
    bag: {
      construction: 'stand-up-pouch', flat: { w: 150, h: 189.2 }, cornerRadius: 9.2, topSeal: 8,
      zip: { top: 21.8, bottom: 30.5 }, tearNotch: { fromTop: 16.0, depth: 1.3, shape: 'round' }, sideSeal: 6, gusset: { depth: 40 }
    },
    sleeve3: { construction: 'sleeve', flat: { w: 165, h: 110 }, depth: 30 }
  };
  // yaw < 0 turns the front toward the key light (upper left) and shows the right side in soft shade.
  var VIEWS = {
    front: { yaw: 0, elev: 2.5, fov: 18, margin: 0.085 },
    'three-quarter': { yaw: -34, elev: 15, fov: 24, margin: 0.11 },
    hero: { yaw: -21, elev: 8, fov: 26, margin: 0.10 },
    back: { yaw: 180, elev: 2.5, fov: 18, margin: 0.085 }
  };
  // film: [body, seal] roughness; the seals are crimped, so slightly matte
  var FINISHES = {
    gloss: {
      film: { rough: [0.30, 0.55], cc: 1.0, ccRough: [0.045, 0.30], sheen: 0, sheenRough: 0.5, spec: 0.55 },
      board: { rough: 0.46, cc: 0.9, ccRough: 0.075, sheen: 0, sheenRough: 0.5, spec: 0.5 }
    },
    satin: {
      film: { rough: [0.44, 0.60], cc: 0.55, ccRough: [0.22, 0.45], sheen: 0.28, sheenRough: 0.55, spec: 0.5 },
      board: { rough: 0.56, cc: 0.35, ccRough: 0.30, sheen: 0.12, sheenRough: 0.6, spec: 0.5 }
    },
    matte: {
      film: { rough: [0.76, 0.86], cc: 0, ccRough: [1, 1], sheen: 0, sheenRough: 1, spec: 0.45 },
      board: { rough: 0.84, cc: 0, ccRough: 1, sheen: 0, sheenRough: 1, spec: 0.4 }
    }
  };
  // The key softbox in the studio environment; the baked ground shadow uses the same area.
  var KEY = { az: -40, el: 48, halfAz: 17, halfEl: 13 };

  // ------------------------------------------------------------------ three.js loading + tone mapping
  var threeP = null, NEUTRAL_OK = false;
  function loadThree() {
    if (!threeP) {
      threeP = import(THREE_URL).then(function (T) {
        NEUTRAL_OK = patchNeutralToneMapping(T);   // (module namespaces are frozen: keep the flag here)
        return T;
      }, function (e) {
        threeP = null;
        throw new Error('MPMockup: three.js could not be loaded from ' + THREE_URL + ' (offline?): ' + (e && e.message || e));
      });
    }
    return threeP;
  }
  // Khronos PBR Neutral (product-render tone mapper) installed as three's CustomToneMapping.
  var NEUTRAL_GLSL = [
    'vec3 CustomToneMapping( vec3 color ) {',
    '\tconst float StartCompression = 0.8 - 0.04;',
    '\tconst float Desaturation = 0.15;',
    '\tcolor *= toneMappingExposure;',
    '\tfloat x = min( color.r, min( color.g, color.b ) );',
    '\tfloat offset = x < 0.08 ? x - 6.25 * x * x : 0.04;',
    '\tcolor -= offset;',
    '\tfloat peak = max( color.r, max( color.g, color.b ) );',
    '\tif ( peak < StartCompression ) return color;',
    '\tfloat d = 1. - StartCompression;',
    '\tfloat newPeak = 1. - d * d / ( peak + d - StartCompression );',
    '\tcolor *= newPeak / peak;',
    '\tfloat g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );',
    '\treturn mix( color, vec3( newPeak ), g );',
    '}'].join('\n');
  function patchNeutralToneMapping(T) {
    try {
      var c = T.ShaderChunk.tonemapping_pars_fragment;
      if (c.indexOf('MP_PBR_NEUTRAL') >= 0) return true;
      var re = /vec3\s+CustomToneMapping\s*\(\s*vec3\s+color\s*\)\s*\{\s*return\s+color;\s*\}/;
      if (!re.test(c)) return false;
      T.ShaderChunk.tonemapping_pars_fragment = c.replace(re, '// MP_PBR_NEUTRAL\n' + NEUTRAL_GLSL);
      return true;
    } catch (e) { return false; }
  }

  // ------------------------------------------------------------------ small helpers
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smoothstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function mulberry32(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function warn(msg) { try { console.warn('MPMockup: ' + msg); } catch (e) { /* ignore */ } }
  function toHex(rgb) {
    return '#' + rgb.map(function (v) { var s = Math.round(clamp(v, 0, 255)).toString(16); return s.length < 2 ? '0' + s : s; }).join('');
  }
  function isTransparent(c) { return c === 'transparent' || c === 'none' || c === null || c === false; }

  function normType(t) {
    t = String(t || 'wrapper').toLowerCase();
    if (t === 'bag' || t === 'pouch' || t === 'doypack' || t === 'stand-up') return 'bag';
    if (t === 'sleeve3' || t === 'sleeve' || t === 'box' || t === '3-pack' || t === 'pack3') return 'sleeve3';
    return 'wrapper';
  }
  function normFinish(f) { f = String(f || 'satin').toLowerCase(); return FINISHES[f] ? f : 'satin'; }
  function normView(v) {
    v = String(v || 'hero').toLowerCase().replace(/[\s_]+/g, '-');
    if (v === '3/4' || v === 'threequarter' || v === 'three-quarters' || v === 'quarter') v = 'three-quarter';
    if (v === 'rear') v = 'back';
    return VIEWS[v] ? v : 'hero';
  }

  // ------------------------------------------------------------------ item spec -> geometry numbers
  function itemsSpec(type) {   // read lazily: items.js may load after this file
    var I = global.MPItems;
    if (I && I[type] && I[type].flat) return { spec: I[type], source: 'MPItems.' + type + ' (items.js)' };
    return { spec: FALLBACK_ITEMS[type], source: 'built-in copy of items.js (items.js not loaded)' };
  }
  function typeOfSpec(s) {   // 'flow-wrap' -> wrapper, 'stand-up-pouch' -> bag, 'sleeve' -> sleeve3
    if (!s || typeof s !== 'object') return null;
    var c = String(s.type || s.construction || '').toLowerCase();
    if (/flow|wrap|pillow|sachet/.test(c)) return 'wrapper';
    if (/pouch|bag|stand/.test(c)) return 'bag';
    if (/sleeve|box|carton/.test(c)) return 'sleeve3';
    return null;
  }
  function numOr(v, d, allowZero) {
    var n = typeof v === 'string' && v.trim() === '' ? NaN : +v;
    return isFinite(n) && (n > 0 || (allowZero && n === 0)) ? n : d;
  }
  // The numbers the geometry is built from: spec (items.js shape) with the item's own defaults filling any
  // gap; sizeMM (legacy) overrides the flat size (and d the gusset / box depth). All lengths in mm.
  function resolveSpec(type, spec, sizeMM) {
    type = normType(type);
    var base = itemsSpec(type), s = spec && typeof spec === 'object' ? spec : base.spec, F = FALLBACK_ITEMS[type];
    var M = base.spec || F;   // missing fields: the loaded items.js values first, then the built-in copy
    function pick(get, allowZero) {
      var v; try { v = get(s); } catch (e) { v = undefined; }
      if (v === undefined || v === null) { try { v = get(M); } catch (e) { v = undefined; } }
      var d; try { d = get(F); } catch (e) { d = 0; }
      return numOr(v, d, allowZero);
    }
    var w = pick(function (o) { return o.flat.w; }), h = pick(function (o) { return o.flat.h; });
    if (sizeMM) { if (+sizeMM.w > 0) w = +sizeMM.w; if (+sizeMM.h > 0) h = +sizeMM.h; }
    w = clamp(w, 10, 2000); h = clamp(h, 10, 2000);
    var o = {
      type: type, w: +w.toFixed(3), h: +h.toFixed(3), interim: !!(s.interim !== undefined ? s.interim : M.interim),
      source: spec && typeof spec === 'object' ? 'opts.spec' : base.source, sizeOverride: !!(sizeMM && (+sizeMM.w > 0 || +sizeMM.h > 0))
    };
    if (type === 'wrapper') {
      o.sealTop = clamp(pick(function (x) { return x.endSeal.top; }, true), 0, h * 0.3);
      o.sealBottom = clamp(pick(function (x) { return x.endSeal.bottom; }, true), 0, h * 0.3);
      o.ribs = Math.round(clamp(pick(function (x) { return x.endSeal.ribs; }, true), 0, 80));
      o.finSeal = clamp(pick(function (x) { return x.finSeal.width; }, true), 0, w * 0.4);
      var fold = (s.finSeal && s.finSeal.fold) || (M.finSeal && M.finSeal.fold) || 'either';
      o.finFold = fold === 'right' ? 'right' : fold === 'left' ? 'left' : 'either';
      o.bulge = clamp(pick(function (x) { return x.bulge; }, true), 0, 0.3);
    } else if (type === 'bag') {
      o.sideSeal = clamp(pick(function (x) { return x.sideSeal; }, true), 0, w * 0.2);
      o.topSeal = clamp(pick(function (x) { return x.topSeal; }, true), 0, h * 0.25);
      o.cornerRadius = clamp(pick(function (x) { return x.cornerRadius; }, true), 0, Math.min(w, h) * 0.25);
      var noZip = s.zip === null || s.zip === false, noNotch = s.tearNotch === null || s.tearNotch === false;
      var zt = pick(function (x) { return x.zip.top; }, true), zb = pick(function (x) { return x.zip.bottom; }, true);
      if (zb < zt) { var tz = zt; zt = zb; zb = tz; }
      zt = clamp(zt, o.topSeal, h * 0.6); zb = clamp(zb, zt, h * 0.6);
      o.zip = noZip || zb - zt < 0.5 ? null : { top: +zt.toFixed(3), bottom: +zb.toFixed(3) };
      var nf = clamp(pick(function (x) { return x.tearNotch.fromTop; }, true), 0, h * 0.5);
      var nd = clamp(pick(function (x) { return x.tearNotch.depth; }, true), 0, w * 0.1);
      var nshape = (s.tearNotch && s.tearNotch.shape) || (M.tearNotch && M.tearNotch.shape) || 'v';
      o.tearNotch = noNotch || nd <= 0 ? null : { fromTop: +nf.toFixed(3), depth: +nd.toFixed(3), shape: nshape === 'round' ? 'round' : 'v' };
      var gd = sizeMM && +sizeMM.d > 0 ? +sizeMM.d : pick(function (x) { return x.gusset.depth; }, true);
      o.gusset = clamp(gd, 0, w * 0.8);
    } else {
      o.depth = clamp(sizeMM && +sizeMM.d > 0 ? +sizeMM.d : pick(function (x) { return x.depth; }, true), 2, 1000);
    }
    return o;
  }

  // 1D sample positions from a to b: `base` step, finer steps inside feature intervals [c0, c1, step],
  // and exact positions at `pins` (seal edges and the like, so creases sit on a vertex row).
  function axisPoints(a, b, base, feats, pins) {
    feats = (feats || []).filter(function (f) { return f[1] > a && f[0] < b; });
    var pts = [a], x = a, guard = 0;
    while (x < b - 1e-9 && guard++ < 200000) {
      var st = base, i;
      for (i = 0; i < feats.length; i++) if (x >= feats[i][0] - 1e-9 && x < feats[i][1] - 1e-9) st = Math.min(st, feats[i][2]);
      var nx = x + st;
      for (i = 0; i < feats.length; i++) if (x < feats[i][0] - 1e-9 && nx > feats[i][0] + 1e-9) nx = feats[i][0];
      if (nx > b - st * 0.35) nx = b;
      pts.push(nx); x = nx;
    }
    (pins || []).forEach(function (p) {
      if (p <= a || p >= b) return;
      var best = -1, bd = Infinity;
      for (var k = 1; k < pts.length - 1; k++) { var dd = Math.abs(pts[k] - p); if (dd < bd) { bd = dd; best = k; } }
      var gap = best > 0 ? Math.min(pts[best] - pts[best - 1], pts[best + 1] - pts[best]) : 0;
      if (best > 0 && bd < gap * 0.45) pts[best] = p; else { pts.push(p); pts.sort(function (u, v) { return u - v; }); }
    });
    return pts;
  }

  // ------------------------------------------------------------------ art analysis (edge colours, taint)
  function analyzeArt(src) {
    var sw = (src && (src.width || src.naturalWidth || src.videoWidth)) || 0;
    var sh = (src && (src.height || src.naturalHeight || src.videoHeight)) || 0;
    if (!sw || !sh) return { ok: false, reason: 'empty', w: sw, h: sh };
    var N = 40, c = document.createElement('canvas');
    c.width = N; c.height = N;
    var g = c.getContext('2d', { willReadFrequently: true });
    var d;
    try {
      g.drawImage(src, 0, 0, N, N);
      d = g.getImageData(0, 0, N, N).data;
    } catch (e) {
      return { ok: false, reason: 'tainted', w: sw, h: sh };
    }
    function avg(x0, y0, x1, y1) {
      var r = 0, gg = 0, b = 0, a = 0;
      for (var y = y0; y < y1; y++) for (var x = x0; x < x1; x++) {
        var k = (y * N + x) * 4, al = d[k + 3] / 255;
        r += d[k] * al; gg += d[k + 1] * al; b += d[k + 2] * al; a += al;
      }
      return a < 1e-3 ? null : [r / a, gg / a, b / a];
    }
    var B = 2, sides = { top: avg(0, 0, N, B), bottom: avg(0, N - B, N, N), left: avg(0, 0, B, N), right: avg(N - B, 0, N, N) };
    var acc = [0, 0, 0], n = 0;
    Object.keys(sides).forEach(function (k) { var v = sides[k]; if (v) { acc[0] += v[0]; acc[1] += v[1]; acc[2] += v[2]; n++; } });
    var edge = n ? [acc[0] / n, acc[1] / n, acc[2] / n] : [255, 255, 255];
    var out = { ok: true, w: sw, h: sh, edge: toHex(edge) };
    Object.keys(sides).forEach(function (k) { out[k] = toHex(sides[k] || edge); });
    return out;
  }
  function placeholderArt(aspect, lines) {
    var W = aspect >= 1 ? 1024 : Math.round(1024 * aspect), H = aspect >= 1 ? Math.round(1024 / aspect) : 1024;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d');
    g.fillStyle = '#efe6e3'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#7d5560'; g.textAlign = 'center'; g.textBaseline = 'middle';
    var fs = Math.round(Math.min(W, H) * 0.055);
    lines.forEach(function (t, i) {
      g.font = (i ? '400 ' : '600 ') + (i ? Math.round(fs * 0.75) : fs) + 'px system-ui, "Segoe UI", sans-serif';
      g.fillText(t, W / 2, H / 2 + (i - (lines.length - 1) / 2) * fs * 1.6);
    });
    return c;
  }
  // Fit art whose aspect differs from the face (never stretch, never crop): letterbox with its edge colour.
  function fitArt(src, faceAspect, fill, quiet, label) {
    var w = src.width, h = src.height, a = w / h;
    if (Math.abs(a / faceAspect - 1) < 0.006) return src;
    if (!quiet) {
      warn('the ' + (label || 'art') + ' is ' + w + 'x' + h + ' (aspect ' + a.toFixed(3) + ') but the panel is ' + faceAspect.toFixed(3) +
        ' (the spec\'s flat w / h). It is fitted inside, not stretched; pass art at the flat panel size for an exact wrap.');
    }
    var W, H;
    if (a > faceAspect) { W = w; H = Math.round(w / faceAspect); } else { H = h; W = Math.round(h * faceAspect); }
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d');
    g.fillStyle = fill || '#ffffff'; g.fillRect(0, 0, W, H);
    g.drawImage(src, Math.round((W - w) / 2), Math.round((H - h) / 2));
    return c;
  }

  // ------------------------------------------------------------------ procedural noise
  var NOISE_N = 256, NOISE = (function () {
    var r = mulberry32(1337), a = new Float32Array(NOISE_N * NOISE_N);
    for (var i = 0; i < a.length; i++) a[i] = r();
    return a;
  })();
  function vnoise(x, y) { // smooth value noise in 0..1 (lattice period 256)
    var xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    var u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    var x0 = xi & 255, y0 = yi & 255, x1 = (x0 + 1) & 255, y1 = (y0 + 1) & 255;
    var a = NOISE[y0 * NOISE_N + x0], b = NOISE[y0 * NOISE_N + x1], c = NOISE[y1 * NOISE_N + x0], d = NOISE[y1 * NOISE_N + x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function pnoise(x, y, P) { // periodic value noise (period P lattice cells)
    var xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    var u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    var x0 = ((xi % P) + P) % P, y0 = ((yi % P) + P) % P, x1 = (x0 + 1) % P, y1 = (y0 + 1) % P;
    var a = NOISE[y0 * NOISE_N + x0], b = NOISE[y0 * NOISE_N + x1], c = NOISE[y1 * NOISE_N + x0], d = NOISE[y1 * NOISE_N + x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  // ------------------------------------------------------------------ detail maps (height -> normal, seal mask)
  // Face-space fields in mm, x from the left edge, y from the BOTTOM edge (row 0 = v 0, DataTexture flipY false).
  function Detail(wMM, hMM, ppmMax, longMax) {
    var ppm = Math.min(ppmMax, longMax / Math.max(wMM, hMM));
    this.wMM = wMM; this.hMM = hMM;
    this.W = Math.max(16, Math.round(wMM * ppm));
    this.H = Math.max(16, Math.round(hMM * ppm));
    this.px = this.W / wMM; this.py = this.H / hMM;
    this.h = new Float32Array(this.W * this.H);   // height, mm
    this.m = new Float32Array(this.W * this.H);   // seal mask 0..1 (rougher, flattened)
  }
  // Large, gentle waviness of the film (sampled on a coarse grid, then bilinear) + roughness variation.
  function addFilmNoise(D, amp, scale) {
    var W = D.W, H = D.H, s = 8, cw = Math.ceil(W / s) + 2, ch = Math.ceil(H / s) + 2, grid = new Float32Array(cw * ch);
    for (var gj = 0; gj < ch; gj++) for (var gi = 0; gi < cw; gi++) {
      var x = gi * s / D.px, y = gj * s / D.py;
      grid[gj * cw + gi] = amp * (vnoise(x / scale, y / scale) - 0.5) + amp * 0.3 * (vnoise(x / (scale * 0.33) + 41, y / (scale * 0.33) + 7) - 0.5);
    }
    for (var j = 0; j < H; j++) {
      var fy = j / s, j0 = Math.floor(fy), ty = fy - j0;
      for (var i = 0; i < W; i++) {
        var fx = i / s, i0 = Math.floor(fx), tx = fx - i0, k = j0 * cw + i0;
        var a = grid[k], b = grid[k + 1], c = grid[k + cw], d = grid[k + cw + 1];
        D.h[j * W + i] += a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
      }
    }
  }
  // Creases: Gaussian ridges / valleys along a line, rasterised only inside their bounding box.
  function addCreases(D, list) {
    var W = D.W, H = D.H, hf = D.h, px = D.px, py = D.py;
    for (var c = 0; c < list.length; c++) {
      var k = list[c], l = Math.hypot(k.ux, k.uy) || 1, ux = k.ux / l, uy = k.uy / l, nx = -uy, ny = ux;
      var ex = k.x + ux * k.len, ey = k.y + uy * k.len, pad = k.sig * 3;
      var i0 = Math.max(0, Math.floor((Math.min(k.x, ex) - pad) * px)), i1 = Math.min(W - 1, Math.ceil((Math.max(k.x, ex) + pad) * px));
      var j0 = Math.max(0, Math.floor((Math.min(k.y, ey) - pad) * py)), j1 = Math.min(H - 1, Math.ceil((Math.max(k.y, ey) + pad) * py));
      var inv = 1 / (k.sig * k.sig);
      for (var j = j0; j <= j1; j++) {
        var y = (j + 0.5) / py - k.y;
        for (var i = i0; i <= i1; i++) {
          var x = (i + 0.5) / px - k.x, t = x * ux + y * uy;
          if (t < 0 || t > k.len) continue;
          var q = x * nx + y * ny, g = Math.exp(-q * q * inv);
          if (g < 0.004) continue;
          var s = t / k.len;
          var env = k.fadeOut ? Math.pow(1 - s, 1.3) * Math.min(1, s * 10) : Math.pow(Math.sin(Math.PI * s), 0.8);
          hf[j * W + i] += k.amp * g * env;
        }
      }
    }
  }
  function normalData(D, strength) {
    var W = D.W, H = D.H, h = D.h, out = new Uint8Array(W * H * 4);
    for (var j = 0; j < H; j++) {
      var jm = j > 0 ? j - 1 : j, jp = j < H - 1 ? j + 1 : j, dyn = (jp - jm) / D.py;
      for (var i = 0; i < W; i++) {
        var im = i > 0 ? i - 1 : i, ip = i < W - 1 ? i + 1 : i;
        var dx = (h[j * W + ip] - h[j * W + im]) / ((ip - im) / D.px);
        var dy = (h[jp * W + i] - h[jm * W + i]) / dyn;
        var nx = -dx * strength, ny = -dy * strength, l = 1 / Math.sqrt(nx * nx + ny * ny + 1), k = (j * W + i) * 4;
        out[k] = (nx * l * 0.5 + 0.5) * 255 + 0.5 | 0;
        out[k + 1] = (ny * l * 0.5 + 0.5) * 255 + 0.5 | 0;
        out[k + 2] = (l * 0.5 + 0.5) * 255 + 0.5 | 0;
        out[k + 3] = 255;
      }
    }
    return out;
  }
  // Roughness ratio map (three reads G) at half resolution: lo on the film, hi on the seals, +- fine variation.
  function roughData(D, lo, hi, vari) {
    var W2 = Math.max(4, D.W >> 1), H2 = Math.max(4, D.H >> 1), mx = Math.max(lo, hi, 1e-3), out = new Uint8Array(W2 * H2 * 4);
    for (var j = 0; j < H2; j++) for (var i = 0; i < W2; i++) {
      var si = Math.min(D.W - 1, i * 2 + 1), sj = Math.min(D.H - 1, j * 2 + 1), m = D.m[sj * D.W + si];
      var x = (i + 0.5) * 2 / D.px, y = (j + 0.5) * 2 / D.py;
      var r = lo + (hi - lo) * m;
      r *= 1 + vari * (vnoise(x / 2.4 + 91, y / 2.4 + 13) * 2 - 1) + vari * 0.5 * (vnoise(x / 0.7 + 5, y / 0.7 + 77) * 2 - 1);
      var v = clamp(r / mx, 0, 1) * 255 + 0.5 | 0, k = (j * W2 + i) * 4;
      out[k] = v; out[k + 1] = v; out[k + 2] = v; out[k + 3] = 255;
    }
    return { data: out, W: W2, H: H2 };
  }

  // ------------------------------------------------------------------ item shapes (from the resolved spec)
  // E(k) = (half-ellipse length) / a for k = b / a, tabulated once (k on a quadratic grid so thin pillows
  // resolve well; exact 2 at k = 0).
  var ELL = null;
  function ellTable() {
    if (ELL) return ELL;
    var N = 1024, K = new Float64Array(N + 1), E = new Float64Array(N + 1), n = 384, dt = Math.PI / n, i, j;
    for (i = 0; i <= N; i++) {
      var k = (i / N) * (i / N), s = 0;
      for (j = 0; j < n; j++) {
        var t = -Math.PI / 2 + (j + 0.5) * dt, c = Math.cos(t), si = Math.sin(t);
        s += Math.sqrt(c * c + k * k * si * si);
      }
      K[i] = k; E[i] = s * dt;
    }
    var f = 2 / E[0];
    for (i = 0; i <= N; i++) E[i] *= f;
    ELL = { K: K, E: E, N: N };
    return ELL;
  }
  // Half-thickness b of an elliptic cross-section of half-width a whose half circumference is w (the film's
  // printed width): a E(b / a) = w.
  function solveB(w, a) {
    if (a <= 0) return 0;
    var e = w / a, T = ellTable(), E = T.E;
    if (e <= 2) return 0;
    if (e >= E[T.N]) return a;
    var lo = 0, hi = T.N;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (E[mid] < e) lo = mid; else hi = mid; }
    var f = (e - E[lo]) / ((E[hi] - E[lo]) || 1);
    return a * (T.K[lo] + (T.K[hi] - T.K[lo]) * f);
  }
  function ellipseThetas(a, b, sArr) { // angle for each normalised arc length s in [0,1] (left fold -> right fold)
    var n = 384, cum = new Float64Array(n + 1), dt = Math.PI / n, i;
    for (i = 0; i < n; i++) {
      var t = -Math.PI / 2 + (i + 0.5) * dt, c = Math.cos(t), si = Math.sin(t);
      cum[i + 1] = cum[i] + Math.sqrt(a * a * c * c + b * b * si * si) * dt;
    }
    var total = cum[n], out = new Float64Array(sArr.length), k = 0;
    for (var j = 0; j < sArr.length; j++) {
      var target = sArr[j] * total;
      while (k < n - 1 && cum[k + 1] < target) k++;
      var f = (target - cum[k]) / ((cum[k + 1] - cum[k]) || 1);
      out[j] = -Math.PI / 2 + (k + clamp(f, 0, 1)) * dt;
    }
    return out;
  }

  // Flow wrap. y from the bottom cut edge (0) to the top cut edge (h); x across (0 = centre); z to the front.
  // The end seals are flat bands of the full width (front and back film pressed together). In the body the
  // cross-section is an ellipse whose half circumference is the flat width w (front film fold to fold = w,
  // back film = w), so as the pillow fills its sides pull in: half-width a(y) = w/2 (1 - bulge p(y)), and the
  // half-thickness b(y) follows from the fixed film width. p rises from 0 at each seal edge to 1 over the
  // shoulder L with an ease-out, as the outline of the client's draft does (it narrows at once below the seal).
  function wrapperShape(R) {
    var S = { kind: 'wrapper', w: R.w, h: R.h, sealB: R.sealBottom, sealT: R.sealTop, ribs: R.ribs, fin: R.finSeal, bulge: R.bulge, finFold: R.finFold || 'either' };
    S.y0 = S.sealB; S.y1 = S.h - S.sealT;
    var body = Math.max(0, S.y1 - S.y0);
    S.L = Math.max(0.5, Math.min(S.h * 0.12, body * 0.45));   // shoulder: seal edge -> full pillow (draft: 12-20 mm of 127)
    S.aMin = S.w / 2 * (1 - S.bulge);
    S.T = solveB(S.w, S.aMin);                                  // max half-thickness (mm)
    return S;
  }
  function wrapperP(S, y) {
    var d0 = y - S.y0, d1 = S.y1 - y;
    if (d0 <= 0 || d1 <= 0) return 0;
    return Math.sin(Math.PI / 2 * Math.min(1, d0 / S.L)) * Math.sin(Math.PI / 2 * Math.min(1, d1 / S.L));
  }
  function wrapperAB(S, y, out) {
    var p = wrapperP(S, y), a = S.w / 2 * (1 - S.bulge * p);
    out[0] = a; out[1] = p > 0 ? solveB(S.w, a) : 0;
    return out;
  }

  // Stand-up pouch. y from the floor (0) to the top cut edge (h); x across; z to the front. Flat outline:
  // w x h with die-cut rounded top corners and V tear notches (the art is cut away there, never squeezed).
  // Between the side seals the front and back panels bulge (bagZc: fills quickly below the zip, as the
  // client's draft does, and is half the open gusset at the floor) and keep their printed width across, so
  // the filled bag narrows towards the bottom; the side seals stay flat at the edges and lift at the bottom
  // corners as the base opens. The zip track: two ridges between zip.top and zip.bottom.
  function bagShape(R) {
    var S = {
      kind: 'bag', w: R.w, h: R.h, sw: R.sideSeal, ts: R.topSeal, rc: R.cornerRadius, D: R.gusset,
      hasZip: !!R.zip, hasNotch: !!R.tearNotch
    };
    S.hw = S.w / 2; S.xF0 = Math.max(0, S.hw - S.sw);
    S.yTs = S.h - S.ts;
    if (R.zip) { S.yZt = S.h - R.zip.top; S.yZb = S.h - R.zip.bottom; }
    else { S.yZt = S.yZb = Math.max(S.h * 0.4, S.yTs - Math.min(12, S.h * 0.06)); }
    // notchH: the notch's half-height on the cut edge (a half-round notch: its radius = depth; a V: 0.6 depth)
    if (R.tearNotch) { S.yN = S.h - R.tearNotch.fromTop; S.notchD = R.tearNotch.depth; S.notchRound = R.tearNotch.shape === 'round'; S.notchH = S.notchRound ? S.notchD : S.notchD * 0.6; }
    else { S.yN = -1e9; S.notchD = 0; S.notchH = 0; S.notchRound = false; }
    S.Zb = S.D / 2;                                    // bulge at the floor = half the open gusset
    S.Zz = Math.min(1.5, S.Zb);                        // the zip track holds the film out a little
    S.tau = Math.max(3, 0.215 * S.yZb);                // fill rate below the zip (fitted to the draft's outline: rms 0.2 % of w)
    S.P = 2.5; S.Q = 0.72;                             // cross-section across a panel: (1 - s^P)^Q
    S.ridge = S.hasZip ? Math.min(1.1, (S.yZt - S.yZb) * 0.14) : 0;
    S.lift = Math.min(S.sw * 0.7, S.Zb * 0.25);         // how far the side seals' bottom corners lift (mm)
    S.liftH = Math.max(6, S.sw * 3);
    return S;
  }
  function bagZc(S, y) {   // bulge of the front panel on the centre line (mm)
    if (S.Zb <= 0 || y >= S.yTs) return 0;
    if (y >= S.yZt) return S.Zz * (1 - smoothstep(S.yZt, S.yTs, y));
    if (y >= S.yZb) return S.Zz;
    var d = S.yZb - y, g = (1 - Math.exp(-d / S.tau)) / (1 - Math.exp(-S.yZb / S.tau));
    return S.Zz + (S.Zb - S.Zz) * g;
  }
  function bagRidge(S, y) {  // relief of the two zip ridges (mm); 0 away from the zip band
    if (!S.hasZip || y < S.yZb - 2 || y > S.yZt + 2) return 0;
    var band = S.yZt - S.yZb, s = Math.max(0.3, band * 0.16);
    var a = (y - (S.yZt - 0.3 * band)) / s, b = (y - (S.yZt - 0.68 * band)) / s;
    return S.ridge * (Math.exp(-a * a) + Math.exp(-b * b));
  }
  function bagProf(S, s) { return Math.pow(Math.max(0, 1 - Math.pow(s, S.P)), S.Q); }
  // The unit panel profile f(s) = (1 - s^P)^Q sampled once (dense where it turns down to the seal), and
  // A(k) = arc length of z = k f(s) over s in [0, 1] tabulated on a sqrt(k) grid: a panel of half-width xF
  // bulging Zc has the arc xF A(Zc / xF).
  var BAG_T = null;
  function bagTable(P, Q) {
    if (BAG_T && BAG_T.P === P && BAG_T.Q === Q) return BAG_T;
    var n = 160, N = 512, KMAX = 4, xs = new Float64Array(n + 1), fs = new Float64Array(n + 1), A = new Float64Array(N + 1), i, j;
    for (j = 0; j <= n; j++) { var t = j / n, s = 1 - (1 - t) * (1 - t) * (1 - t); xs[j] = s; fs[j] = Math.pow(Math.max(0, 1 - Math.pow(s, P)), Q); }
    for (i = 0; i <= N; i++) {
      var k = KMAX * (i / N) * (i / N), L = 0;
      for (j = 1; j <= n; j++) L += Math.hypot(xs[j] - xs[j - 1], k * (fs[j] - fs[j - 1]));
      A[i] = L;
    }
    BAG_T = { P: P, Q: Q, n: n, N: N, KMAX: KMAX, xs: xs, fs: fs, A: A };
    return BAG_T;
  }
  function bagA(T, k) {
    var u = Math.sqrt(Math.max(0, k) / T.KMAX) * T.N;
    if (u >= T.N) return T.A[T.N] * k / T.KMAX;   // (beyond any clamped spec)
    var i = Math.floor(u), f = u - i;
    return T.A[i] + (T.A[i + 1] - T.A[i]) * f;
  }
  // Row state at height y: centre bulge Zc, panel half-width xF (the arc across the bulged panel is exactly
  // the flat half-width xF0) and a table that places each printed column at its arc length.
  function bagRow(S, y) {
    var Zc = bagZc(S, y), r = { y: y, Zc: Zc, xF: S.xF0, ridge: bagRidge(S, y), tx: null, ts: null };
    if (Zc < 1e-4 || S.xF0 <= 0) return r;
    var T = bagTable(S.P, S.Q), lo = S.xF0 * 0.2, hi = S.xF0;
    for (var it = 0; it < 40; it++) { var mid = (lo + hi) / 2; if (mid * bagA(T, Zc / mid) > S.xF0) hi = mid; else lo = mid; }
    var xF = (lo + hi) / 2, n = T.n, tx = new Float64Array(n + 1), ts = new Float64Array(n + 1), L = 0, i;
    for (i = 1; i <= n; i++) {
      L += Math.hypot((T.xs[i] - T.xs[i - 1]) * xF, (T.fs[i] - T.fs[i - 1]) * Zc);
      tx[i] = T.xs[i] * xF; ts[i] = L;
    }
    var k = S.xF0 / (L || 1);
    for (i = 1; i <= n; i++) ts[i] *= k;
    r.xF = xF; r.tx = tx; r.ts = ts;
    return r;
  }
  function bagArcToX(r, s) {   // x on the bulged panel at arc length s from the centre line
    var ts = r.ts, tx = r.tx, lo = 0, hi = ts.length - 1;
    if (s >= ts[hi]) return tx[hi];
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (ts[m] < s) lo = m; else hi = m; }
    return tx[lo] + (tx[hi] - tx[lo]) * (s - ts[lo]) / ((ts[hi] - ts[lo]) || 1);
  }
  // Flat film point (x0 across, r.y up) -> front panel position (the back panel is the mirror, z -> -z).
  function bagMap(S, r, x0, out) {
    var ax = Math.abs(x0), sx = x0 < 0 ? -1 : 1, y = r.y, X, Y = y, Z;
    if (ax <= S.xF0) {
      var x = r.tx ? bagArcToX(r, ax) : ax, s = r.xF > 0 ? Math.min(1, x / r.xF) : 1;
      Z = r.Zc * bagProf(S, s) + r.ridge * smoothstep(r.xF, r.xF - 2.5, x);
      X = sx * x;
    } else {
      var e = ax - S.xF0;   // into the side seal (flat, both films pressed together)
      X = sx * (r.xF + e); Z = 0;
      if (S.lift > 0 && y < S.liftH) { var q = 1 - y / S.liftH; Y = y + S.lift * Math.min(1, e / Math.max(S.sw, 1e-6)) * q * q; }
    }
    out[0] = X; out[1] = Y; out[2] = Z;
    return out;
  }
  function projSeg(px, py, ax, ay, bx, by, out) {
    var dx = bx - ax, dy = by - ay, t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1);
    out[0] = ax + dx * t; out[1] = ay + dy * t;
    return Math.hypot(px - out[0], py - out[1]);
  }
  var _o1 = [0, 0], _o2 = [0, 0];
  function bagInNotch(S, x, y) {   // is the flat point inside a tear notch's cut-out?
    if (!(S.notchD > 0)) return false;
    var dyn = Math.abs(y - S.yN);
    if (S.notchRound) return Math.hypot(S.hw - Math.abs(x), dyn) < S.notchD - 1e-6;
    return dyn < S.notchH - 1e-6 && Math.abs(x) > S.hw - S.notchD * (1 - dyn / S.notchH) + 1e-6;
  }
  function bagOutline(S, x, y, out) { // flat die-cut outline: rounded top corners + tear notches (points outside move onto it)
    var hw = S.hw, sx = x < 0 ? -1 : 1, ax = Math.abs(x), r = S.rc;
    if (r > 0 && ax > hw - r && y > S.h - r) {
      var cx = hw - r, cy = S.h - r, dx = ax - cx, dy = y - cy, dl = Math.hypot(dx, dy);
      if (dl > r) { ax = cx + dx * r / dl; y = cy + dy * r / dl; }
    }
    if (S.notchD > 0 && S.notchRound) {
      var ddx = hw - ax, ddy = y - S.yN, dd = Math.hypot(ddx, ddy);
      if (dd < S.notchD) {                     // inside the half-round cut: onto its arc (centre on the cut edge)
        if (dd < 1e-9) { ddx = 1; ddy = 0; dd = 1; }
        ax = hw - ddx * S.notchD / dd; y = S.yN + ddy * S.notchD / dd;
      }
    } else if (S.notchD > 0) {
      var dyn = Math.abs(y - S.yN);
      if (dyn < S.notchH && ax > hw - S.notchD * (1 - dyn / S.notchH)) {
        var d1 = projSeg(ax, y, hw, S.yN + S.notchH, hw - S.notchD, S.yN, _o1);
        var d2 = projSeg(ax, y, hw - S.notchD, S.yN, hw, S.yN - S.notchH, _o2);
        var o = d1 <= d2 ? _o1 : _o2;
        ax = o[0]; y = o[1];
      }
    }
    out[0] = sx * ax; out[1] = y;
  }

  // Where points of the flat panel show in a straight-on (orthographic) front view of the filled item: pure
  // geometry, no WebGL. map(x0s, y0): x0s (array) and y0 in mm from the flat panel's top-left -> [[x, y], ...] in
  // mm in the same frame (x from the flat panel's left edge, y down from its top edge). For QA and for laying the
  // client's drafts (front views of the filled pack) over the flat art.
  function frontMap(type, spec) {
    type = normType(type);
    var R = resolveSpec(type, spec);
    if (type === 'wrapper') {
      var S = wrapperShape(R), ab = [0, 0];
      return { w: R.w, h: R.h, map: function (x0s, y0) {
        wrapperAB(S, R.h - y0, ab);
        var th = ellipseThetas(ab[0], ab[1], x0s.map(function (x) { return clamp(x / R.w, 0, 1); }));
        return x0s.map(function (x, i) { return [R.w / 2 + ab[0] * Math.sin(th[i]), y0]; });
      } };
    }
    if (type === 'bag') {
      var B = bagShape(R), p = [0, 0, 0];
      return { w: R.w, h: R.h, map: function (x0s, y0) {
        var r = bagRow(B, R.h - y0);
        return x0s.map(function (x) { bagMap(B, r, x - R.w / 2, p); return [R.w / 2 + p[0], R.h - p[1]]; });
      } };
    }
    return { w: R.w, h: R.h, map: function (x0s, y0) { return x0s.map(function (x) { return [x, y0]; }); } };
  }

  function sleeveShape(R) {
    return { kind: 'sleeve3', w: R.w, h: R.h, d: R.depth, r: clamp(Math.min(R.w, R.h, R.depth) * 0.028, 0.5, 1.2) };
  }

  // ------------------------------------------------------------------ geometry helpers
  // keep(a, b, c) (optional): false drops that triangle (die-cut openings such as the bag's tear notches)
  function gridGeometry(T, nu, nv, fill, flip, keep) {
    var n = nu * nv, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    var P = [0, 0, 0], N = [0, 0, 1], U = [0, 0], i, j;
    for (j = 0; j < nv; j++) for (i = 0; i < nu; i++) {
      fill(i, j, P, N, U);
      var k = j * nu + i;
      pos[3 * k] = P[0]; pos[3 * k + 1] = P[1]; pos[3 * k + 2] = P[2];
      nor[3 * k] = N[0]; nor[3 * k + 1] = N[1]; nor[3 * k + 2] = N[2];
      uv[2 * k] = U[0]; uv[2 * k + 1] = U[1];
    }
    var idx = new (n > 65535 ? Uint32Array : Uint16Array)((nu - 1) * (nv - 1) * 6), q = 0;
    function tri(a, b, c) { if (!keep || keep(a, b, c)) { idx[q++] = a; idx[q++] = b; idx[q++] = c; } }
    for (j = 0; j < nv - 1; j++) for (i = 0; i < nu - 1; i++) {
      var a = j * nu + i, b = a + 1, c = a + nu + 1, d = a + nu;
      if (!flip) { tri(a, b, c); tri(a, c, d); }
      else { tri(a, c, b); tri(a, d, c); }
    }
    if (q < idx.length) idx = idx.slice(0, q);
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.BufferAttribute(nor, 3));
    g.setAttribute('uv', new T.BufferAttribute(uv, 2));
    g.setIndex(new T.BufferAttribute(idx, 1));
    g.computeBoundingBox(); g.computeBoundingSphere();
    return g;
  }
  function mergePositions(T, geos) { // position-only merge (shadow proxy)
    var nv = 0, ni = 0;
    geos.forEach(function (g) { nv += g.attributes.position.count; ni += g.index.count; });
    var pos = new Float32Array(nv * 3), idx = new Uint32Array(ni), vo = 0, io = 0;
    geos.forEach(function (g) {
      pos.set(g.attributes.position.array, vo * 3);
      var src = g.index.array;
      for (var i = 0; i < src.length; i++) idx[io + i] = src[i] + vo;
      vo += g.attributes.position.count; io += src.length;
    });
    var m = new T.BufferGeometry();
    m.setAttribute('position', new T.BufferAttribute(pos, 3));
    m.setIndex(new T.BufferAttribute(idx, 1));
    m.computeBoundingSphere();
    return m;
  }
  function translateGeo(g, x, y, z) { g.translate(x, y, z); g.computeBoundingBox(); g.computeBoundingSphere(); return g; }

  // ------------------------------------------------------------------ wrapper (flow wrap)
  function buildWrapperGeos(T, S, full) {
    var nc = full ? 129 : 23, cols = [], i;
    for (i = 0; i < nc; i++) cols.push(0.5 - 0.5 * Math.cos(Math.PI * i / (nc - 1)));   // dense at the folds
    var feats = full
      ? [[S.y0 - 0.6, S.y0 + S.L, 0.45], [S.y1 - S.L, S.y1 + 0.6, 0.45], [S.y0, S.y0 + 1.2, 0.1], [S.y1 - 1.2, S.y1, 0.1]]
      : [[S.y0, S.y0 + S.L, 2.5], [S.y1 - S.L, S.y1, 2.5]];
    var rows = axisPoints(0, S.h, full ? 2.0 : 9, feats, [S.y0, S.y1]);
    var ab = [0, 0], abp = [0, 0], abm = [0, 0];
    var R = rows.map(function (y) {
      wrapperAB(S, y, ab);
      var e = 0.02, yp = Math.min(S.h, y + e), ym = Math.max(0, y - e);
      if (Math.abs(y - S.y0) < 1e-9) ym = y;        // one-sided at the seal edges: the film leaves the seal at an angle
      if (Math.abs(y - S.y1) < 1e-9) yp = y;
      wrapperAB(S, yp, abp); wrapperAB(S, ym, abm);
      var dy = (yp - ym) || 1;
      return { y: y, a: ab[0], b: ab[1], da: (abp[0] - abm[0]) / dy, db: (abp[1] - abm[1]) / dy, th: ellipseThetas(ab[0], ab[1], cols) };
    });
    function normalAt(r, st, ct, out) {   // outward normal of the front surface (a sin t, y, b cos t)
      if (r.b < 1e-4) { out[0] = 0; out[1] = 0; out[2] = 1; return out; }
      var nx = r.b * st, ny = -(r.da * r.b * st * st + r.a * r.db * ct * ct), nz = r.a * ct, l = Math.hypot(nx, ny, nz) || 1;
      out[0] = nx / l; out[1] = ny / l; out[2] = nz / l;
      return out;
    }
    var nrm = [0, 0, 1];
    function surf(sign) {
      return function (i, j, P, N, U) {
        var r = R[j], th = r.th[i], st = Math.sin(th), ct = Math.cos(th);
        P[0] = r.a * st; P[1] = r.y; P[2] = sign * r.b * ct;
        normalAt(r, st, ct, nrm);
        N[0] = nrm[0]; N[1] = nrm[1]; N[2] = sign * nrm[2];
        U[0] = sign > 0 ? cols[i] : 1 - cols[i];   // the back art is seen from behind: never mirrored
        U[1] = r.y / S.h;
      };
    }
    var out = {
      front: gridGeometry(T, nc, rows.length, surf(1), false),
      back: gridGeometry(T, nc, rows.length, surf(-1), true)
    };
    if (full && S.fin > 0) {
      // The fin seal: the two film edges sealed together and laid flat, a two-layer strip finSeal wide down
      // the whole length, pressed flat into the end seals. Its root (the seam) is on the back centre line, where
      // the print web puts it (MPItems.wrapper.web()); it lies to one side of it: finSeal.fold, seen looking at
      // the back ('left' = +x here; 'either', not known yet, is drawn to the left). Its face shows the back art
      // it lies on (on the web the fin allowance carries that art on past the centre line). The last column is
      // its cut edge.
      var fw = S.fin, fd = S.finFold === 'right' ? -1 : 1, fc = [0, 0.08, 0.2, 0.35, 0.5, 0.65, 0.8, 0.92, 1, 1], nf = fc.length;
      out.fin = gridGeometry(T, nf, rows.length, function (i, j, P, N, U) {
        var r = R[j], f = fc[i], wall = i === nf - 1, x = fd * f * fw;
        var th = Math.asin(clamp(x / Math.max(r.a, 1e-6), -1, 1)), st = Math.sin(th), ct = Math.cos(th);
        var lift = wall ? 0.015 : (r.b < 1e-4 ? 0.05 + 0.05 * f : 0.14 + 0.3 * f * f);
        P[0] = x; P[1] = r.y; P[2] = -(r.b * ct) - lift;
        normalAt(r, st, ct, nrm);
        var nx = nrm[0], ny = nrm[1], nz = nrm[2];
        if (i >= nf - 2) { nx += fd * (wall ? 1.6 : 0.45); var l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; }
        N[0] = nx; N[1] = ny; N[2] = -nz;
        U[0] = 0.5 - x / S.w; U[1] = r.y / S.h;
      }, fd > 0);
    }
    return out;
  }
  function wrapperDetail(S) {
    var D = new Detail(S.w, S.h, 13, 1600), W = D.W, H = D.H, hf = D.h, m = D.m, i, j;
    // End seals: straight horizontal ribs across the full width, endSeal.ribs per band (pitch = band / ribs,
    // counted from the cut edge, so they fill the band exactly); a shallow step where the seal ends. The grooves
    // sit at (i + 0.5) pitch from the cut edge: where the studio's printed rib texture draws its dark lines, so
    // the print and the embossing reinforce each other (one line per rib, as on the draft).
    var A = 0.14;
    for (j = 0; j < H; j++) {
      var y = (j + 0.5) / D.py, top = y > S.h / 2, seal = top ? S.sealT : S.sealB;
      var dIn = top ? y - S.y1 : S.y0 - y;   // > 0 inside the band
      if (seal <= 0 || dIn < -0.8) continue;
      var mask = smoothstep(-0.3, 0.2, dIn), edge = Math.exp(-(dIn / 0.28) * (dIn / 0.28)), hr = -0.06 * edge;
      if (S.ribs > 0 && dIn > 0) {
        var fromCut = top ? S.h - y : y, ph = fromCut / (seal / S.ribs) + 0.5, f = ph - Math.floor(ph);
        hr += A * Math.pow(Math.sin(Math.PI * f), 0.55) * smoothstep(0, 0.12, dIn);
      }
      for (i = 0; i < W; i++) { hf[j * W + i] += hr; m[j * W + i] = mask; }
    }
    // pinch creases fanning from the four corners where the pillow leaves the seals + puckers along the seal edges
    var list = [], rnd = mulberry32(7), yIn = [S.y0, S.y1];
    [0, 1].forEach(function (side) {
      [0, 1].forEach(function (end) {
        var cx = side ? S.w : 0, cy = yIn[end], dx = side ? -1 : 1, dy = end ? -1 : 1, angs = [12, 24, 37, 52];
        angs.forEach(function (ang, n) {
          var a = (ang + (rnd() - 0.5) * 6) * DEG;
          list.push({
            x: cx + dx * (0.4 + rnd() * 2.2), y: cy + dy * rnd() * 0.5, ux: dx * Math.cos(a), uy: dy * Math.sin(a),
            len: S.L * (0.8 + rnd() * 0.5) * (1.2 - n * 0.1), amp: (n % 2 ? -0.11 : 0.16) * (0.8 + rnd() * 0.4),
            sig: 0.75 + rnd() * 0.7, fadeOut: true
          });
        });
      });
    });
    [0, 1].forEach(function (end) {
      var cy = yIn[end], dy = end ? -1 : 1;
      for (var x = 3 + rnd() * 2; x < S.w - 3; x += 2 + rnd() * 2.6) {
        var a = (90 + (rnd() - 0.5) * 26) * DEG;
        list.push({ x: x, y: cy, ux: Math.cos(a), uy: dy * Math.sin(a), len: 1.6 + rnd() * 3.4, amp: (rnd() < 0.5 ? -1 : 1) * (0.03 + rnd() * 0.04), sig: 0.42 + rnd() * 0.3, fadeOut: true });
      }
    });
    addCreases(D, list);
    addFilmNoise(D, 0.11, 14);
    return D;
  }
  function knurlTile(T) { // fine lines for the fin seal (tiles along its length)
    var W = 8, H = 32, data = new Uint8Array(W * H * 4);
    for (var j = 0; j < H; j++) {
      var ny = -Math.sin(2 * Math.PI * j * 4 / H) * 0.55, l = 1 / Math.sqrt(1 + ny * ny);
      for (var i = 0; i < W; i++) {
        var k = (j * W + i) * 4;
        data[k] = 128; data[k + 1] = (ny * l * 0.5 + 0.5) * 255 | 0; data[k + 2] = (l * 0.5 + 0.5) * 255 | 0; data[k + 3] = 255;
      }
    }
    var t = new T.DataTexture(data, W, H, T.RGBAFormat, T.UnsignedByteType);
    t.wrapS = t.wrapT = T.RepeatWrapping; t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter;
    t.generateMipmaps = true; t.needsUpdate = true;
    return t;
  }

  // ------------------------------------------------------------------ bag (stand-up zip pouch)
  function buildBagGeos(T, S, full) {
    var hw = S.hw, xF0 = S.xF0;
    var xs = axisPoints(-hw, hw, full ? 1.6 : 7,
      full ? [[-hw, -xF0 + 6, 0.3], [xF0 - 6, hw, 0.3]] : [[-hw, -xF0 + 3, 1.5], [xF0 - 3, hw, 1.5]], [-xF0, xF0]);
    var ys = axisPoints(0, S.h, full ? 1.8 : 8, full ? [
      [0, S.liftH, 0.5], [S.yZb - 12, S.yZb, 0.6], [S.yZb - 1.5, S.yZt + 1.5, 0.18],
      [S.yN - S.notchH - 1, S.yN + S.notchH + 1, 0.2], [S.yTs - 1, S.yTs + 1, 0.3], [S.h - S.rc - 1, S.h, 0.35]
    ] : [[0, S.liftH, 2], [S.yZb - 2, S.yZt + 2, 1.5], [S.h - S.rc - 1, S.h, 1.5]],
      [S.yTs, S.yZt, S.yZb].concat(S.notchD > 0 ? [S.yN] : []));
    var cache = new Map();
    function row(y) { var k = Math.round(y * 1e5), r = cache.get(k); if (!r) { r = bagRow(S, y); cache.set(k, r); } return r; }
    var nu = xs.length, nv = ys.length, n = nu * nv;
    var POS = new Float32Array(n * 3), NOR = new Float32Array(n * 3), UVS = new Float32Array(n * 2), FX = new Float64Array(n), FY = new Float64Array(n);
    var c = [0, 0], p = [0, 0, 0], a1 = [0, 0, 0], a2 = [0, 0, 0], b1 = [0, 0, 0], b2 = [0, 0, 0], e = full ? 0.04 : 0.2;
    for (var j = 0; j < nv; j++) {
      for (var i = 0; i < nu; i++) {
        bagOutline(S, xs[i], ys[j], c);                    // die cut (flat): corners, notches
        var x0 = c[0], y0 = c[1], r = row(y0), k = j * nu + i;
        FX[k] = x0; FY[k] = y0;
        bagMap(S, r, x0, p);
        POS[3 * k] = p[0]; POS[3 * k + 1] = p[1]; POS[3 * k + 2] = p[2];
        UVS[2 * k] = x0 / S.w + 0.5; UVS[2 * k + 1] = y0 / S.h;
        if (!full) continue;
        // normal of the (uncut) surface at that film point: d/dx0 x d/dy of the mapping
        bagMap(S, r, x0 + e, a1); bagMap(S, r, x0 - e, a2);
        var yp = Math.min(S.h, y0 + e), ym = Math.max(0, y0 - e);
        bagMap(S, row(yp), x0, b1); bagMap(S, row(ym), x0, b2);
        var ux = a1[0] - a2[0], uy = a1[1] - a2[1], uz = a1[2] - a2[2], vx = b1[0] - b2[0], vy = b1[1] - b2[1], vz = b1[2] - b2[2];
        var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz);
        if (!(l > 1e-12) || nz < 0) { nx = 0; ny = 0; nz = 1; l = 1; }
        NOR[3 * k] = nx / l; NOR[3 * k + 1] = ny / l; NOR[3 * k + 2] = nz / l;
      }
    }
    if (!full) for (var q = 0; q < n; q++) NOR[3 * q + 2] = 1;
    S.floorWidth = 2 * (row(0).xF + S.sw);                 // the filled bag's width at the floor (front view)
    S.zipWidth = 2 * (row((S.yZt + S.yZb) / 2).xF + S.sw);
    function fill(sign) {
      return function (i, j, P, N, U) {
        var k = j * nu + i;
        P[0] = POS[3 * k]; P[1] = POS[3 * k + 1]; P[2] = sign * POS[3 * k + 2];
        N[0] = NOR[3 * k]; N[1] = NOR[3 * k + 1]; N[2] = sign * NOR[3 * k + 2];
        U[0] = sign > 0 ? UVS[2 * k] : 1 - UVS[2 * k];     // the back art is seen from behind: never mirrored
        U[1] = UVS[2 * k + 1];
      };
    }
    // vertices outside the die-cut line were moved onto it; drop the triangles left spanning a notch's opening
    function keep(a, b, cc) { return !bagInNotch(S, (FX[a] + FX[b] + FX[cc]) / 3, (FY[a] + FY[b] + FY[cc]) / 3); }
    var out = {
      front: gridGeometry(T, nu, nv, fill(1), false, keep),
      back: gridGeometry(T, nu, nv, fill(-1), true, keep)
    };
    // the gusset base: an oval between the front and back panels' bottom edges (the bag stands on it)
    var r0 = row(0), tsb = [0, 0.15, 0.32, 0.5, 0.68, 0.85, 1];
    out.base = gridGeometry(T, nu, tsb.length, function (i, jj, P, N, U) {
      bagMap(S, r0, clamp(xs[i], -xF0, xF0), p);
      var z0 = p[2], t = tsb[jj];
      P[0] = p[0]; P[1] = 0.15 + 1.2 * Math.sin(Math.PI * t) * (z0 / (S.Zb || 1)); P[2] = lerp(-z0, z0, t);
      N[0] = 0; N[1] = -1; N[2] = 0; U[0] = 0.5; U[1] = 0.5;
    }, false);
    return out;
  }
  function bagDetail(S) {
    var D = new Detail(S.w, S.h, 12, 1600), W = D.W, H = D.H, hf = D.h, m = D.m, i, j;
    var xF = S.xF0, yt = S.yTs, per = 0.9, TAU = 2 * Math.PI;
    // per-column terms (side seals) computed once; only rows / columns near a seal pay for exp / cos
    var colSide = new Float32Array(W), colMask = new Float32Array(W), colEdge = new Float32Array(W), colLines = new Float32Array(W);
    for (i = 0; i < W; i++) {
      var axc = Math.abs((i + 0.5) / D.px - S.w / 2), ds = axc - xF;
      colSide[i] = ds; colMask[i] = smoothstep(-0.25, 0.25, ds);
      colEdge[i] = Math.abs(ds) < 1.5 ? 0.05 * Math.exp(-(ds / 0.3) * (ds / 0.3)) : 0;
      colLines[i] = Math.cos(TAU * axc / per);
    }
    for (j = 0; j < H; j++) {
      var y = (j + 0.5) / D.py, inTop = y > yt, dTop = y - yt, rowMask = smoothstep(-0.25, 0.25, dTop);
      var rowEdge = Math.abs(dTop) < 1.5 ? 0.05 * Math.exp(-(dTop / 0.3) * (dTop / 0.3)) : 0;
      var rowZip = 0;
      if (S.hasZip) {   // the zip tape's weld lines at the top and bottom of the track
        var dz1 = (y - S.yZt) / 0.22, dz2 = (y - S.yZb) / 0.22;
        if (Math.abs(dz1) < 6 || Math.abs(dz2) < 6) rowZip = -0.035 * (Math.exp(-dz1 * dz1) + Math.exp(-dz2 * dz2));
      }
      var rowLines = Math.cos(TAU * y / per), base = j * W;
      for (i = 0; i < W; i++) {
        var dSide = colSide[i], h = rowZip, mask = Math.max(rowMask, colMask[i]);
        if (inTop || dSide > 0) h += 0.03 * mask * (inTop && (dSide < 0 || dTop < dSide) ? rowLines : colLines[i]);
        if (y < yt + 0.5) h -= colEdge[i];                                                 // side seal edge
        if (dSide < 0.5) h -= rowEdge;                                                     // top seal edge
        hf[base + i] = h; m[base + i] = mask;
      }
    }
    var list = [], rnd = mulberry32(11), yz = S.yZb;
    [-1, 1].forEach(function (sx) {
      var bx = sx < 0 ? S.sw : S.w - S.sw, inward = -sx;
      [S.h * 0.1, S.h * 0.2, S.h * 0.33, S.h * 0.5, yz - 16, yz - 7].forEach(function (y0, n) {
        var a = (74 + (rnd() - 0.5) * 18) * DEG, up = n % 2 ? 1 : -1;
        list.push({ x: bx + inward * (1.2 + rnd() * 3.5), y: y0, ux: inward * Math.cos(a), uy: up * Math.sin(a), len: 14 + rnd() * 26, amp: (n % 2 ? 0.2 : -0.16) * (0.8 + rnd() * 0.5), sig: 1.1 + rnd() * 1.3 });
      });
      for (var y = 6 + rnd() * 3; y < yz - 3; y += 3.5 + rnd() * 4.5) {
        list.push({ x: bx, y: y, ux: inward, uy: (rnd() - 0.5) * 0.5, len: 2.5 + rnd() * 4.5, amp: (rnd() < 0.5 ? -1 : 1) * (0.035 + rnd() * 0.045), sig: 0.5 + rnd() * 0.4, fadeOut: true });
      }
      [58, 70].forEach(function (ang, n) {
        var a = (ang + (rnd() - 0.5) * 8) * DEG;
        list.push({ x: bx + inward * (0.5 + n * 2.5), y: 0.8, ux: inward * Math.cos(a), uy: Math.sin(a), len: 16 + rnd() * 14, amp: (n ? -0.14 : 0.2), sig: 1.3 + rnd() * 0.7, fadeOut: true });
      });
    });
    for (var x = S.sw + 2 + rnd() * 2; x < S.w - S.sw - 2; x += 3 + rnd() * 3.5) {   // puckers just below the zip
      list.push({ x: x, y: yz - 0.6, ux: (rnd() - 0.5) * 0.35, uy: -1, len: 2 + rnd() * 4.5, amp: (rnd() < 0.5 ? -1 : 1) * (0.03 + rnd() * 0.04), sig: 0.55 + rnd() * 0.3, fadeOut: true });
    }
    addCreases(D, list);
    addFilmNoise(D, 0.1, 16);
    return D;
  }

  // ------------------------------------------------------------------ sleeve (paperboard box)
  // Rounded box from six face grids pushed onto the rounded surface (SDF projection): each face owns its half
  // of every folded edge, so the art ends exactly on the fold line and shading is seamless across the fold.
  function buildSleeveGeos(T, S, full) {
    var hw = S.w / 2, hh = S.h / 2, hd = S.d / 2, r = S.r;
    var inner = [hw - r, hh - r, hd - r];
    function ax(L, nMid) {
      var p = [], k, n = full ? 5 : 1;
      for (k = 0; k <= n; k++) p.push(-L + r * k / n);
      for (k = 1; k < nMid; k++) p.push(-L + r + (2 * L - 2 * r) * k / nMid);
      for (k = n; k >= 0; k--) p.push(L - r * k / n);
      return p;
    }
    var faces = [
      { key: 'front', U: ax(hw, full ? 12 : 1), V: ax(hh, full ? 8 : 1), f: function (u, v) { return [u, v, hd]; } },
      { key: 'back', U: ax(hw, full ? 8 : 1), V: ax(hh, full ? 6 : 1), f: function (u, v) { return [-u, v, -hd]; } },
      { key: 'right', U: ax(hd, full ? 3 : 1), V: ax(hh, full ? 6 : 1), f: function (u, v) { return [hw, v, -u]; } },
      { key: 'left', U: ax(hd, full ? 3 : 1), V: ax(hh, full ? 6 : 1), f: function (u, v) { return [-hw, v, u]; } },
      { key: 'top', U: ax(hw, full ? 8 : 1), V: ax(hd, full ? 3 : 1), f: function (u, v) { return [u, hh, -v]; } },
      { key: 'bottom', U: ax(hw, full ? 8 : 1), V: ax(hd, full ? 3 : 1), f: function (u, v) { return [u, -hh, v]; } }
    ];
    var out = {};
    faces.forEach(function (F) {
      out[F.key] = gridGeometry(T, F.U.length, F.V.length, function (i, j, P, N, U) {
        var u = F.U[i], v = F.V[j], p = F.f(u, v);
        var c0 = clamp(p[0], -inner[0], inner[0]), c1 = clamp(p[1], -inner[1], inner[1]), c2 = clamp(p[2], -inner[2], inner[2]);
        var dx = p[0] - c0, dy = p[1] - c1, dz = p[2] - c2, l = Math.hypot(dx, dy, dz) || 1;
        N[0] = dx / l; N[1] = dy / l; N[2] = dz / l;
        P[0] = c0 + N[0] * r; P[1] = c1 + N[1] * r + hh; P[2] = c2 + N[2] * r;
        if (F.key === 'front' || F.key === 'back') { U[0] = u / S.w + 0.5; U[1] = v / S.h + 0.5; }   // the back seen from behind
        else { U[0] = u / 25; U[1] = v / 25; }   // paper fibre tile, 25 mm
      }, false);
    });
    return out;
  }
  function fibreTile(T) { // tileable coated-board fibre texture (normal map), 256 px = 25 mm
    var N = 256, hf = new Float32Array(N * N), rnd = mulberry32(5), i, j;
    for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
      hf[j * N + i] = 0.6 * pnoise(i / 32, j / 32, 8) + 0.3 * pnoise(i / 10.667, j / 10.667, 24) + 0.25 * pnoise(i / 4, j / 16, 64);
    }
    for (var f = 0; f < 700; f++) {
      var x0 = rnd() * N, y0 = rnd() * N, a = (rnd() - 0.5) * 0.9, len = 6 + rnd() * 20, amp = (rnd() - 0.5) * 0.5, ca = Math.cos(a), sa = Math.sin(a);
      for (var t = 0; t < len; t += 0.5) {
        var px = x0 + ca * t, py = y0 + sa * t;
        for (var dj = -1; dj <= 1; dj++) for (var di = -1; di <= 1; di++) {
          var xi = ((Math.round(px) + di) % N + N) % N, yi = ((Math.round(py) + dj) % N + N) % N;
          hf[yi * N + xi] += amp * (di === 0 && dj === 0 ? 0.25 : 0.06);
        }
      }
    }
    var data = new Uint8Array(N * N * 4), s = 0.35;
    for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
      var dx = hf[j * N + (i + 1) % N] - hf[j * N + (i + N - 1) % N], dy = hf[((j + 1) % N) * N + i] - hf[((j + N - 1) % N) * N + i];
      var nx = -dx * s, ny = -dy * s, l = 1 / Math.sqrt(nx * nx + ny * ny + 1), k = (j * N + i) * 4;
      data[k] = (nx * l * 0.5 + 0.5) * 255 | 0; data[k + 1] = (ny * l * 0.5 + 0.5) * 255 | 0; data[k + 2] = (l * 0.5 + 0.5) * 255 | 0; data[k + 3] = 255;
    }
    var tex = new T.DataTexture(data, N, N, T.RGBAFormat, T.UnsignedByteType);
    tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.magFilter = T.LinearFilter; tex.minFilter = T.LinearMipmapLinearFilter;
    tex.generateMipmaps = true; tex.needsUpdate = true;
    return tex;
  }

  // ------------------------------------------------------------------ studio environment (PMREM)
  function studioEnvironment(T, renderer) {
    var scene = new T.Scene(), geos = [], mats = [];
    function mat(rgb, k) {
      var m = new T.MeshBasicMaterial({ color: new T.Color(rgb[0] * k, rgb[1] * k, rgb[2] * k), side: T.DoubleSide, toneMapped: false });
      mats.push(m); return m;
    }
    function quad(w, h, m) { var g = new T.PlaneGeometry(w, h); geos.push(g); var q = new T.Mesh(g, m); scene.add(q); return q; }
    var R = 10, yF = -2.6, yC = 8, Hh = yC - yF;
    var floor = quad(2 * R, 2 * R, mat([1, 0.975, 0.955], 0.40)); floor.rotation.x = -Math.PI / 2; floor.position.y = yF;
    var ceil = quad(2 * R, 2 * R, mat([1, 1, 1], 0.12)); ceil.rotation.x = Math.PI / 2; ceil.position.y = yC;
    var wb = quad(2 * R, Hh, mat([1, 0.98, 0.97], 0.17)); wb.position.set(0, (yF + yC) / 2, -R);
    var wf = quad(2 * R, Hh, mat([1, 0.98, 0.97], 0.21)); wf.position.set(0, (yF + yC) / 2, R); wf.rotation.y = Math.PI;
    var wl = quad(2 * R, Hh, mat([1, 0.98, 0.97], 0.16)); wl.position.set(-R, (yF + yC) / 2, 0); wl.rotation.y = Math.PI / 2;
    var wr = quad(2 * R, Hh, mat([1, 0.98, 0.97], 0.15)); wr.position.set(R, (yF + yC) / 2, 0); wr.rotation.y = -Math.PI / 2;
    function panel(az, el, dist, w, h, k, rgb) {
      var q = quad(w, h, mat(rgb || [1, 1, 1], k)), ce = Math.cos(el * DEG);
      q.position.set(Math.sin(az * DEG) * ce * dist, Math.sin(el * DEG) * dist, Math.cos(az * DEG) * ce * dist);
      q.lookAt(0, 0, 0);
      return q;
    }
    var kd = 7, kw = 2 * kd * Math.tan(KEY.halfAz * DEG), kh = 2 * kd * Math.tan(KEY.halfEl * DEG);
    panel(KEY.az, KEY.el, kd, kw, kh, 8.5, [1, 0.985, 0.965]);   // key softbox: upper left, front
    panel(58, 14, 7.5, 5.6, 3.3, 2.0, [0.97, 0.985, 1]);           // fill: right, low
    panel(0, 34, 8.5, 10, 2.8, 1.0);                               // front bounce: high enough that a gloss film seen head-on does not mirror it over the print
    panel(138, 22, 7, 1.3, 5.2, 4.2);                              // rim strip: back right
    panel(-150, 26, 7, 1.1, 4.4, 2.4);                             // kicker: back left
    var top = quad(1.5, 8.5, mat([1, 1, 1], 3.0)); top.rotation.x = Math.PI / 2; top.position.set(-1.2, 7.6, 0.6);  // overhead strip
    var pm = new T.PMREMGenerator(renderer);
    var rt = pm.fromScene(scene, 0.025, 0.1, 100);
    pm.dispose();
    geos.forEach(function (g) { g.dispose(); });
    mats.forEach(function (m) { m.dispose(); });
    return rt;
  }

  // ------------------------------------------------------------------ baked area-light ground shadow
  function dirFromAzEl(T, az, el) {
    var ce = Math.cos(el * DEG);
    return new T.Vector3(Math.sin(az * DEG) * ce, Math.sin(el * DEG), Math.cos(az * DEG) * ce);
  }
  // The key softbox sampled on a jittered 8 x 6 grid: the union of 48 hard shadows = a true area-light
  // penumbra (sharp where the pack touches the floor, soft far from it).
  function shadowDirections(T) {
    var out = [], KA = 8, KE = 6, a, e, r = mulberry32(21);
    for (a = 0; a < KA; a++) for (e = 0; e < KE; e++) {
      var az = KEY.az + ((a + 0.25 + 0.5 * r()) / KA - 0.5) * 2 * KEY.halfAz;
      var el = KEY.el + ((e + 0.25 + 0.5 * r()) / KE - 0.5) * 2 * KEY.halfEl;
      out.push({ v: dirFromAzEl(T, az, el), key: 1 / (KA * KE) });
    }
    return out;
  }
  // Contact occlusion: steep projections (a narrow cone round the zenith) of how close each part of the pack
  // is to the floor, max-blended; walls become thin slivers that fade with height.
  function contactDirections(T) {
    var out = [new T.Vector3(0, 1, 0)];
    for (var i = 0; i < 12; i++) out.push(dirFromAzEl(T, i * 30 + 15, 66));
    return out;
  }

  var PROJ_VS = [
    'uniform vec3 uLight;',
    'uniform vec3 uRegion;',
    'void main() {',
    '\tvec4 wp = modelMatrix * vec4( position, 1.0 );',
    '\tvec3 g = wp.xyz - uLight * ( max( wp.y, 0.0 ) / uLight.y );',
    '\tgl_Position = vec4( ( g.x - uRegion.x ) / uRegion.z, ( g.z - uRegion.y ) / uRegion.z, 0.0, 1.0 );',
    '}'].join('\n');
  var PROJ_FS = 'uniform vec4 uWeight;\nvoid main() { gl_FragColor = uWeight; }';
  var CONTACT_VS = [
    'uniform vec3 uLight;',
    'uniform vec3 uRegion;',
    'varying float vH;',
    'void main() {',
    '\tvec4 wp = modelMatrix * vec4( position, 1.0 );',
    '\tvH = max( wp.y, 0.0 );',
    '\tvec3 g = wp.xyz - uLight * ( vH / uLight.y );',
    '\tgl_Position = vec4( ( g.x - uRegion.x ) / uRegion.z, ( g.z - uRegion.y ) / uRegion.z, 0.0, 1.0 );',
    '}'].join('\n');
  var CONTACT_FS = 'uniform float uTau;\nvarying float vH;\nvoid main() { gl_FragColor = vec4( 0.0, 0.0, exp( - vH / uTau ), 0.0 ); }';
  var BLUR_VS = 'varying vec2 vUv;\nvoid main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }';
  var BLUR_FS = [
    'uniform sampler2D tMap;',
    'uniform vec2 uDir;',
    'varying vec2 vUv;',
    'void main() {',
    '\tvec4 s = texture2D( tMap, vUv ) * 0.2270270270;',
    '\ts += ( texture2D( tMap, vUv + uDir * 1.3846153846 ) + texture2D( tMap, vUv - uDir * 1.3846153846 ) ) * 0.3162162162;',
    '\ts += ( texture2D( tMap, vUv + uDir * 3.2307692308 ) + texture2D( tMap, vUv - uDir * 3.2307692308 ) ) * 0.0702702703;',
    '\tgl_FragColor = s;',
    '}'].join('\n');
  var GROUND_VS = [
    'varying vec2 vXZ;',
    'void main() {',
    '\tvec4 wp = modelMatrix * vec4( position, 1.0 );',
    '\tvXZ = wp.xz;',
    '\tgl_Position = projectionMatrix * viewMatrix * wp;',
    '}'].join('\n');
  var GROUND_FS = [
    'uniform sampler2D tShadow;',
    'uniform sampler2D tSoft;',
    'uniform vec3 uRegion;',
    'uniform vec3 uColor;',
    'uniform vec3 uStrength;',
    'varying vec2 vXZ;',
    'void main() {',
    '\tvec2 st = ( vXZ - uRegion.xy ) / ( 2.0 * uRegion.z ) + 0.5;',
    '\tvec4 s = texture2D( tShadow, st );',
    '\tvec4 w = texture2D( tSoft, st );',
    '\tfloat edge = smoothstep( 0.0, 0.07, st.x ) * smoothstep( 0.0, 0.07, st.y ) * smoothstep( 0.0, 0.07, 1.0 - st.x ) * smoothstep( 0.0, 0.07, 1.0 - st.y );',
    '\tfloat k = clamp( s.r, 0.0, 1.0 );',
    '\tfloat core = clamp( s.b, 0.0, 1.0 ), halo = clamp( w.b, 0.0, 1.0 );',
    '\tfloat occ = 1.0 - ( 1.0 - uStrength.x * k ) * ( 1.0 - uStrength.y * core ) * ( 1.0 - uStrength.z * halo );',
    '\tgl_FragColor = vec4( uColor, occ * edge );',
    '\t#include <colorspace_fragment>',
    '}'].join('\n');

  // ------------------------------------------------------------------ create
  function create(container, opts) {
    if (!container || typeof container.appendChild !== 'function') {
      return Promise.reject(new Error('MPMockup.create: a container element is required'));
    }
    opts = opts || {};
    return loadThree().then(function (T) {
      try { return build(T, container, opts); }
      catch (e) {   // a failed set-up must not leave a dead canvas behind
        var left = container.querySelector('canvas.mp-mockup-canvas[data-mp-init]');
        if (left && left.parentNode) left.parentNode.removeChild(left);
        throw e;
      }
    });
  }

  function build(T, container, opts) {
    var t0 = performance.now();
    var specOpt = opts.spec && typeof opts.spec === 'object' ? opts.spec : null, sizeOpt = opts.sizeMM || null;
    var specType = typeOfSpec(specOpt), type = normType(opts.type || specType);
    if (specType && opts.type && specType !== type) {
      warn('opts.type "' + opts.type + '" does not match the spec (' + (specOpt.construction || specOpt.type) + '); the spec wins.');
      type = specType;
    }
    var R = resolveSpec(type, specOpt, sizeOpt);   // the numbers the item is built from (mm)
    var finish = normFinish(opts.finish);
    var viewName = normView(opts.view), interactive = opts.interactive !== false;
    var bg = opts.background == null ? '#f4ece9' : opts.background;
    var backColorOpt = opts.backColor || null;
    var onError = typeof opts.onError === 'function' ? opts.onError : null;
    var lastError = null;

    // ---------- renderer + canvas
    var canvas = document.createElement('canvas');
    canvas.className = 'mp-mockup-canvas';
    canvas.setAttribute('data-mp-init', '1');   // removed once the first frame is up
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;outline:none;touch-action:none;' +
      'user-select:none;-webkit-user-select:none;' + (interactive ? 'cursor:grab;' : '');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', '3D mockup of the pack.' + (interactive ? ' Drag to turn it, scroll to zoom, double-click to reset.' : ''));
    if (interactive) canvas.tabIndex = 0;
    try { if (getComputedStyle(container).position === 'static') container.style.position = 'relative'; } catch (e) { /* ignore */ }
    if (interactive && !document.getElementById('mp-mockup-style')) {
      var st = document.createElement('style');
      st.id = 'mp-mockup-style';
      st.textContent = '.mp-mockup-canvas:focus-visible{outline:2px solid rgba(226,32,127,.55);outline-offset:-2px}' +
        '.mp-mockup-canvas:active{cursor:grabbing}';
      (document.head || document.documentElement).appendChild(st);
    }
    var renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    } catch (e) {
      return Promise.reject(new Error('MPMockup: WebGL is not available (' + (e && e.message || e) + ')'));
    }
    container.insertBefore(canvas, container.firstChild);   // the host's overlays (busy, notes) stay on top
    var gl = renderer.getContext();
    renderer.outputColorSpace = T.SRGBColorSpace;
    // default: Khronos PBR Neutral (keeps the print's hue + saturation). 'aces' / 'agx' on request.
    // Exposures calibrated so a flat white print seen straight on renders ~240/255.
    var tmName = String(opts.toneMapping || 'neutral').toLowerCase();
    if (tmName === 'agx' && T.AgXToneMapping !== undefined) { renderer.toneMapping = T.AgXToneMapping; renderer.toneMappingExposure = 2.6; }
    else if (tmName === 'aces' || !NEUTRAL_OK) { tmName = 'aces'; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.45; }
    else { tmName = 'neutral'; renderer.toneMapping = T.CustomToneMapping; renderer.toneMappingExposure = 1.55; }
    var dpr = opts.pixelRatio || Math.min(global.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    var maxAniso = renderer.capabilities.getMaxAnisotropy();
    var maxTex = renderer.capabilities.maxTextureSize;
    var cssW = 0, cssH = 0;
    function measure() {
      var r = container.getBoundingClientRect(), w = Math.round(r.width), h = Math.round(r.height);
      if (w < 2) w = cssW || 640;
      if (h < 2) h = cssH || Math.round(w * 1.25);
      var changed = w !== cssW || h !== cssH;
      cssW = w; cssH = h;
      if (changed) renderer.setSize(w, h, false);
      return changed;
    }
    measure();

    // ---------- scene
    var scene = new T.Scene();
    var te = performance.now();
    var envRT = studioEnvironment(T, renderer);
    var envMs = Math.round(performance.now() - te);
    scene.environment = envRT.texture;
    var camera = new T.PerspectiveCamera(26, cssW / cssH, 1, 20000);
    var pkgGroup = new T.Group();
    scene.add(pkgGroup);

    // ---------- art textures (front, and optional back)
    var artSrc = null, artInfo = null, artTex = null, faceAspect = R.w / R.h;
    var backSrc = null, backTex = null, bkW = 0, bkH = 0;
    function makeArtTexture(img) {
      var src = img;
      if (Math.max(src.width, src.height) > maxTex) {
        var k = maxTex / Math.max(src.width, src.height), c = document.createElement('canvas');
        c.width = Math.max(1, Math.floor(src.width * k)); c.height = Math.max(1, Math.floor(src.height * k));
        c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
        src = c;
      }
      var t = new T.Texture(src);
      t.colorSpace = T.SRGBColorSpace;
      t.anisotropy = maxAniso;
      t.generateMipmaps = true;
      t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter;
      t.wrapS = t.wrapT = T.ClampToEdgeWrapping;
      t.needsUpdate = true;
      return t;
    }
    function reportError(err) {
      lastError = err;
      warn(err.message);
      if (onError) { try { onError(err); } catch (e) { /* ignore */ } }
    }
    // Prepare the image for the current face (taint check, aspect fit). Returns the image to upload.
    function prepareArt(src, quiet) {
      var info = analyzeArt(src);
      if (!info.ok) {
        var msg = info.reason === 'tainted'
          ? 'the art canvas is "tainted" (a picture was loaded from a file path on file://), so WebGL may not read it. Draw pictures from data: or blob: URLs.'
          : 'the art is empty (0 x 0).';
        reportError(new Error(msg));
        artInfo = { ok: false, edge: '#efe6e3', top: '#efe6e3', bottom: '#efe6e3', left: '#efe6e3', right: '#efe6e3' };
        return placeholderArt(faceAspect, info.reason === 'tainted'
          ? ['Art blocked by the browser', 'pictures must come from data: URLs on file://']
          : ['No art yet']);
      }
      artInfo = info;
      lastError = null;
      return fitArt(src, faceAspect, info.edge, quiet);
    }
    var warnedSmall = {}, upW = 0, upH = 0;   // size the GPU storage of artTex was allocated with
    function uploadArt(src, sameObject, isPlaceholder, quiet) {
      var img = isPlaceholder ? src : prepareArt(src, quiet);
      if (isPlaceholder) artInfo = { ok: false, edge: '#efe6e3', top: '#efe6e3', bottom: '#efe6e3', left: '#efe6e3', right: '#efe6e3' };
      var old = artTex;
      if (old && img.width === upW && img.height === upH && img.width <= maxTex && img.height <= maxTex) {
        if (old.image !== img) old.image = img;                  // (a redrawn or a new canvas of the same size)
        old.needsUpdate = true;                                  // re-upload into the existing GPU storage
      } else {
        artTex = makeArtTexture(img);                            // new size: new texture (immutable storage)
        upW = artTex.image.width; upH = artTex.image.height;
        if (old) old.dispose();
      }
      void sameObject;
      var key = artTex.image ? artTex.image.width + 'x' + artTex.image.height : '';
      if (artTex.image && artTex.image.width < 2048 && artTex.image.height < 2048 && artInfo && artInfo.ok && !warnedSmall[key]) {
        warnedSmall[key] = true;
        warn('the art is ' + key + ' px; 2048+ px on the long side keeps small print sharp when zoomed.');
      }
    }
    function noArt() { return placeholderArt(faceAspect, ['No art yet']); }
    // Back art: the back panel as seen from behind (same flat size as the front). null = plain back.
    function uploadBack(src, quiet) {
      var info = src ? analyzeArt(src) : null;
      if (src && !info.ok) {
        reportError(new Error(info.reason === 'tainted'
          ? 'the back art canvas is "tainted" (a picture was loaded from a file path on file://), so WebGL may not read it; the back is shown plain. Draw pictures from data: or blob: URLs.'
          : 'the back art is empty (0 x 0); the back is shown plain.'));
        src = null;
      }
      if (!src) {
        if (backTex) backTex.dispose();
        backTex = null; bkW = bkH = 0;
        return;
      }
      var img = fitArt(src, faceAspect, info.edge, quiet, 'back art');
      if (backTex && img.width === bkW && img.height === bkH && img.width <= maxTex && img.height <= maxTex) {
        if (backTex.image !== img) backTex.image = img;
        backTex.needsUpdate = true;
      } else {
        var old = backTex;
        backTex = makeArtTexture(img);
        bkW = backTex.image.width; bkH = backTex.image.height;
        if (old) old.dispose();
      }
    }

    // ---------- back colour
    function backColorHex() {
      if (backColorOpt) return backColorOpt;
      if (artSrc && typeof artSrc.backColor === 'string' && artSrc.backColor) return artSrc.backColor;
      return (artInfo && artInfo.edge) || '#e9a3bd';
    }
    // the sleeve's sides continue the front's matching edge (top edge colour on the top face, and so on), so
    // the box reads as one printed carton; backColor is for the back face only
    function sideColorHex(side) {
      return (artInfo && artInfo.ok && artInfo[side]) || backColorHex();
    }
    function safeColor(hex) { var c = new T.Color(); try { c.set(hex); } catch (e) { c.set('#e9a3bd'); } return c; }

    // ---------- shared textures
    var fibreTex = null, knurlTex = null;
    function getFibre() { if (!fibreTex) { fibreTex = fibreTile(T); fibreTex.anisotropy = Math.min(8, maxAniso); } return fibreTex; }
    function getKnurl() { if (!knurlTex) { knurlTex = knurlTile(T); knurlTex.anisotropy = Math.min(8, maxAniso); } return knurlTex; }
    function dataTex(data, W, H, aniso) {
      var t = new T.DataTexture(data, W, H, T.RGBAFormat, T.UnsignedByteType);
      t.wrapS = t.wrapT = T.ClampToEdgeWrapping; t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter;
      t.generateMipmaps = true; t.anisotropy = aniso || 1; t.needsUpdate = true;
      return t;
    }

    // ---------- the pack
    var pkg = null;   // { type, spec, meshes[], materials{}, textures[], detail, proxy, bbox, rho, height }
    function filmMaterial(colorHex, mapTex, d) {
      var m = new T.MeshPhysicalMaterial({
        color: mapTex ? 0xffffff : safeColor(colorHex),
        map: mapTex || null,
        normalMap: d.normal, normalScale: new T.Vector2(1, 1),
        roughnessMap: d.rough, clearcoatRoughnessMap: d.ccRough,
        clearcoatNormalMap: d.normal, clearcoatNormalScale: new T.Vector2(0.9, 0.9),
        metalness: 0, ior: 1.5
      });
      return m;
    }
    function boardMaterial(withArt, normalTex, scale) {
      return new T.MeshPhysicalMaterial({
        color: 0xffffff, map: withArt ? artTex : null, vertexColors: !withArt,
        normalMap: normalTex, normalScale: new T.Vector2(scale, scale), metalness: 0, ior: 1.5
      });
    }
    function applyFinish() {
      if (!pkg) return;
      var F = FINISHES[finish];
      if (pkg.kind === 'film') {
        var f = F.film;
        if (pkg.detail) {
          var r1 = roughData(pkg.detail, f.rough[0], f.rough[1], 0.06), r2 = roughData(pkg.detail, Math.max(f.ccRough[0], 0.02), f.ccRough[1], 0.18);
          pkg.rough.image.data.set(r1.data); pkg.rough.needsUpdate = true;
          pkg.ccRough.image.data.set(r2.data); pkg.ccRough.needsUpdate = true;
        }
        pkg.filmMats.forEach(function (m) {
          m.roughness = Math.max(f.rough[0], f.rough[1]);
          m.clearcoat = Math.max(f.cc, 0.001);
          m.clearcoatRoughness = Math.max(f.ccRough[0], f.ccRough[1]);
          m.sheen = Math.max(f.sheen, 0.0001); m.sheenRoughness = f.sheenRough; m.sheenColor.setRGB(1, 1, 1);
          m.specularIntensity = f.spec;
        });
        if (pkg.finMat) {
          pkg.finMat.roughness = f.rough[1]; pkg.finMat.clearcoat = Math.max(f.cc, 0.001);
          pkg.finMat.clearcoatRoughness = Math.max(f.ccRough[1], 0.05);
          pkg.finMat.sheen = Math.max(f.sheen, 0.0001); pkg.finMat.sheenRoughness = f.sheenRough; pkg.finMat.sheenColor.setRGB(1, 1, 1);
          pkg.finMat.specularIntensity = f.spec;
        }
      } else {
        var b = F.board;
        pkg.boardMats.forEach(function (m) {
          m.roughness = b.rough; m.clearcoat = Math.max(b.cc, 0.001); m.clearcoatRoughness = b.ccRough;
          m.sheen = Math.max(b.sheen, 0.0001); m.sheenRoughness = b.sheenRough; m.sheenColor.setRGB(1, 1, 1);
          m.specularIntensity = b.spec;
        });
      }
      requestRender();
    }
    // The back panel (and the wrapper's fin) wear the back art when there is one, else the plain back colour;
    // the bag's gusset base is always plain. (Switching map <-> no map recompiles that material once.)
    function applyBackColors() {
      if (!pkg) return;
      if (pkg.kind === 'film') {
        var c = safeColor(backColorHex()), want = backTex || null;
        pkg.backMats.forEach(function (m) {
          if (m.map !== want) { m.map = want; m.needsUpdate = true; }
          if (want) m.color.setRGB(1, 1, 1); else m.color.copy(c);
        });
        pkg.plainMats.forEach(function (m) { m.color.copy(c); });
      } else if (pkg.colorAttrs) {
        var bt = backTex || null;
        pkg.backMats.forEach(function (m) {
          if (m.map !== bt) { m.map = bt; m.vertexColors = !bt; m.needsUpdate = true; }
        });
        Object.keys(pkg.colorAttrs).forEach(function (face) {
          var attr = pkg.colorAttrs[face], col = safeColor(face === 'back' ? backColorHex() : sideColorHex(face));
          for (var i = 0; i < attr.count; i++) attr.setXYZ(i, col.r, col.g, col.b);
          attr.needsUpdate = true;
        });
      }
      requestRender();
    }
    function disposePackage() {
      if (!pkg) return;
      pkg.meshes.forEach(function (m) { pkgGroup.remove(m); m.geometry.dispose(); });
      pkg.materials.forEach(function (m) { m.dispose(); });
      pkg.textures.forEach(function (t) { t.dispose(); });
      if (pkg.proxy) pkg.proxy.dispose();
      pkg = null;
    }
    var timing = {};
    function buildPackage() {
      var tb = performance.now();
      disposePackage();
      var p = { type: type, meshes: [], materials: [], textures: [], filmMats: [], backMats: [], plainMats: [], boardMats: [] };
      var spec, geos, full;
      function addMesh(g, m) { var mesh = new T.Mesh(g, m); pkgGroup.add(mesh); p.meshes.push(mesh); return mesh; }
      if (type === 'wrapper' || type === 'bag') {
        p.kind = 'film';
        spec = type === 'wrapper' ? wrapperShape(R) : bagShape(R);
        var td = performance.now();
        var D = type === 'wrapper' ? wrapperDetail(spec) : bagDetail(spec);
        var nrm = dataTex(normalData(D, 1.0), D.W, D.H, Math.min(8, maxAniso));
        timing.detailMs = Math.round(performance.now() - td);
        var F = FINISHES[finish].film;
        var r1 = roughData(D, F.rough[0], F.rough[1], 0.06), r2 = roughData(D, Math.max(F.ccRough[0], 0.02), F.ccRough[1], 0.18);
        p.detail = D; p.rough = dataTex(r1.data, r1.W, r1.H, 4); p.ccRough = dataTex(r2.data, r2.W, r2.H, 4);
        p.textures.push(nrm, p.rough, p.ccRough);
        var d = { normal: nrm, rough: p.rough, ccRough: p.ccRough };
        var front = filmMaterial(null, artTex, d), back = filmMaterial(backColorHex(), backTex, d);
        p.filmMats.push(front, back); p.backMats.push(back); p.materials.push(front, back);
        var tg = performance.now();
        full = type === 'wrapper' ? buildWrapperGeos(T, spec, true) : buildBagGeos(T, spec, true);
        var lo = type === 'wrapper' ? buildWrapperGeos(T, spec, false) : buildBagGeos(T, spec, false);
        timing.geoMs = Math.round(performance.now() - tg);
        timing.vertices = full.front.attributes.position.count + full.back.attributes.position.count;
        addMesh(full.front, front); addMesh(full.back, back);
        if (full.fin) {
          var kt = getKnurl().clone(); kt.needsUpdate = true; kt.repeat.set(1, spec.h / 3.2); p.textures.push(kt);
          var fin = new T.MeshPhysicalMaterial({
            color: backTex ? 0xffffff : safeColor(backColorHex()), map: backTex || null,
            normalMap: kt, normalScale: new T.Vector2(0.8, 0.8), metalness: 0, ior: 1.5
          });
          p.finMat = fin; p.backMats.push(fin); p.materials.push(fin);
          addMesh(full.fin, fin);
        }
        if (full.base) {
          var baseM = filmMaterial(backColorHex(), null, d);
          p.filmMats.push(baseM); p.plainMats.push(baseM); p.materials.push(baseM);
          addMesh(full.base, baseM);
        }
        p.proxy = mergePositions(T, [lo.front, lo.back]);
        lo.front.dispose(); lo.back.dispose(); if (lo.base) lo.base.dispose();
        // both stand on their bottom edge (the geometry starts at y = 0)
        p.height = spec.h;
        p.rho = type === 'wrapper' ? Math.hypot(spec.w / 2, spec.T) : Math.hypot(spec.w / 2, spec.Zb);
      } else {
        p.kind = 'board';
        spec = sleeveShape(R);
        geos = buildSleeveGeos(T, spec, true);
        var fib = getFibre(), fibFront = fib.clone();
        fibFront.needsUpdate = true; fibFront.repeat.set(spec.w / 25, spec.h / 25); p.textures.push(fibFront);
        var frontB = boardMaterial(true, fibFront, 0.22), sideB = boardMaterial(false, fib, 0.22);
        var backB = boardMaterial(false, fibFront, 0.22);   // the back face: back art when given, else its plain colour
        p.boardMats.push(frontB, sideB, backB); p.backMats.push(backB); p.materials.push(frontB, sideB, backB);
        p.colorAttrs = {};
        addMesh(geos.front, frontB);
        ['back', 'right', 'left', 'top', 'bottom'].forEach(function (k) {
          var g = geos[k], n = g.attributes.position.count, attr = new T.BufferAttribute(new Float32Array(n * 3), 3);
          g.setAttribute('color', attr); p.colorAttrs[k] = attr;
          addMesh(g, k === 'back' ? backB : sideB);
        });
        var lo2 = buildSleeveGeos(T, spec, false), list = ['front', 'back', 'right', 'left', 'top', 'bottom'].map(function (k) { return lo2[k]; });
        p.proxy = mergePositions(T, list);
        list.forEach(function (g) { g.dispose(); });
        p.height = spec.h; p.rho = Math.hypot(spec.w / 2, spec.d / 2);
      }
      p.spec = spec;
      var bb = new T.Box3();
      p.meshes.forEach(function (m) { m.geometry.computeBoundingBox(); bb.union(m.geometry.boundingBox); });
      p.bbox = bb;
      pkg = p;
      applyFinish();
      applyBackColors();
      setupShadowRegion();
      shadowDirty = true;
      timing.buildMs = Math.round(performance.now() - tb);
    }

    // ---------- ground shadow
    var SH_N = 768, halfOK = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
    var rtBase = {
      type: halfOK ? T.HalfFloatType : T.UnsignedByteType, format: T.RGBAFormat, generateMipmaps: false,
      minFilter: T.LinearFilter, magFilter: T.LinearFilter, wrapS: T.ClampToEdgeWrapping, wrapT: T.ClampToEdgeWrapping
    };
    var shAcc = new T.WebGLRenderTarget(SH_N, SH_N, Object.assign({ depthBuffer: true, stencilBuffer: true }, rtBase));
    var shTmp = new T.WebGLRenderTarget(SH_N, SH_N, Object.assign({ depthBuffer: false, stencilBuffer: false }, rtBase));
    var shOut = new T.WebGLRenderTarget(SH_N, SH_N, Object.assign({ depthBuffer: false, stencilBuffer: false }, rtBase));
    var shSoft = new T.WebGLRenderTarget(SH_N, SH_N, Object.assign({ depthBuffer: false, stencilBuffer: false }, rtBase));
    var DIRS = shadowDirections(T), CDIRS = contactDirections(T);
    var contactMat = new T.ShaderMaterial({
      uniforms: { uLight: { value: new T.Vector3(0, 1, 0) }, uRegion: { value: new T.Vector3(0, 0, 1) }, uTau: { value: 6 } },
      vertexShader: CONTACT_VS, fragmentShader: CONTACT_FS, side: T.DoubleSide, depthTest: false, depthWrite: false,
      blending: T.CustomBlending, blendEquation: T.MaxEquation, blendSrc: T.OneFactor, blendDst: T.OneFactor
    });
    var projMat = new T.ShaderMaterial({
      uniforms: { uLight: { value: new T.Vector3(0, 1, 0) }, uRegion: { value: new T.Vector3(0, 0, 1) }, uWeight: { value: new T.Vector4() } },
      vertexShader: PROJ_VS, fragmentShader: PROJ_FS, side: T.DoubleSide, depthTest: false, depthWrite: false,
      blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneFactor,
      stencilWrite: true, stencilRef: 0, stencilFunc: T.EqualStencilFunc,
      stencilFail: T.KeepStencilOp, stencilZFail: T.KeepStencilOp, stencilZPass: T.IncrementStencilOp
    });
    var blurMat = new T.ShaderMaterial({
      uniforms: { tMap: { value: null }, uDir: { value: new T.Vector2() } },
      vertexShader: BLUR_VS, fragmentShader: BLUR_FS, depthTest: false, depthWrite: false, blending: T.NoBlending
    });
    var quadGeo = new T.PlaneGeometry(2, 2), quad = new T.Mesh(quadGeo, blurMat);
    quad.frustumCulled = false;
    var quadScene = new T.Scene(); quadScene.add(quad);
    var bakeScene = new T.Scene(), proxyMesh = new T.Mesh(new T.BufferGeometry(), projMat);
    proxyMesh.frustumCulled = false; proxyMesh.matrixAutoUpdate = false; bakeScene.add(proxyMesh);
    var orthoCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var groundMat = new T.ShaderMaterial({
      uniforms: {
        tShadow: { value: shOut.texture }, tSoft: { value: shSoft.texture }, uRegion: { value: new T.Vector3(0, 0, 100) },
        uColor: { value: new T.Color(0.05, 0.04, 0.04) }, uStrength: { value: new T.Vector3(0.42, 0.5, 0.35) }
      },
      vertexShader: GROUND_VS, fragmentShader: GROUND_FS, transparent: true, depthWrite: false, toneMapped: false
    });
    var groundGeo = new T.PlaneGeometry(1, 1); groundGeo.rotateX(-Math.PI / 2);
    var ground = new T.Mesh(groundGeo, groundMat);
    ground.renderOrder = -1;
    scene.add(ground);
    var region = { cx: 0, cz: 0, half: 100 }, shadowDirty = true, bakedYaw = null;
    function setupShadowRegion() {
      var H = pkg.height, rho = pkg.rho, m = Math.max(12, H * 0.12), x0 = -rho - m, x1 = rho + m, z0 = -rho - m, z1 = rho + m;
      DIRS.forEach(function (d) {
        var dx = -d.v.x * H / d.v.y, dz = -d.v.z * H / d.v.y;
        x0 = Math.min(x0, dx - rho); x1 = Math.max(x1, dx + rho); z0 = Math.min(z0, dz - rho); z1 = Math.max(z1, dz + rho);
      });
      var half = Math.max(x1 - x0, z1 - z0) / 2 * 1.1;
      region.cx = (x0 + x1) / 2; region.cz = (z0 + z1) / 2; region.half = half;
      ground.scale.set(2 * half, 1, 2 * half);
      ground.position.set(region.cx, 0, region.cz);
      groundMat.uniforms.uRegion.value.set(region.cx, region.cz, half);
      contactMat.uniforms.uTau.value = clamp(H * 0.06, 4, 12);
      if (proxyMesh.geometry !== pkg.proxy) proxyMesh.geometry = pkg.proxy;
    }
    function blurPass(src, dst, dx, dy) {
      blurMat.uniforms.tMap.value = src.texture; blurMat.uniforms.uDir.value.set(dx, dy);
      renderer.setRenderTarget(dst); renderer.render(quadScene, orthoCam);
    }
    // fast = while turning: every 4th key direction (x4 weight) and 5 contact directions; full again once settled
    var bakedFast = false;
    function bakeShadow(fast) {
      if (!pkg) return;
      var kStep = fast ? 4 : 1, cStep = fast ? 3 : 1;
      pkgGroup.updateMatrixWorld(true);
      proxyMesh.matrix.copy(pkgGroup.matrixWorld); proxyMesh.matrixWorldNeedsUpdate = true;
      var prevRT = renderer.getRenderTarget(), prevAuto = renderer.autoClear;
      var prevColor = renderer.getClearColor(new T.Color()), prevAlpha = renderer.getClearAlpha();
      renderer.autoClear = false;
      renderer.setRenderTarget(shAcc);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, true, true);
      // R: key softbox, 48 hard shadows summed (stencil = each direction counts once per texel)
      proxyMesh.material = projMat;
      projMat.uniforms.uRegion.value.set(region.cx, region.cz, region.half);
      for (var i = 0; i < DIRS.length; i += kStep) {
        projMat.uniforms.uLight.value.copy(DIRS[i].v);
        projMat.uniforms.uWeight.value.set(DIRS[i].key * kStep, 0, 0, 0);
        renderer.clear(false, false, true);
        renderer.render(bakeScene, orthoCam);
      }
      // B: contact (max-blended closeness to the floor)
      proxyMesh.material = contactMat;
      contactMat.uniforms.uRegion.value.set(region.cx, region.cz, region.half);
      for (i = 0; i < CDIRS.length; i += cStep) {
        contactMat.uniforms.uLight.value.copy(CDIRS[i]);
        renderer.render(bakeScene, orthoCam);
      }
      proxyMesh.material = projMat;
      var px = 1 / SH_N;
      blurPass(shAcc, shTmp, 1.6 * px, 0); blurPass(shTmp, shOut, 0, 1.6 * px);         // crisp: key + contact core
      blurPass(shOut, shTmp, 4.5 * px, 0); blurPass(shTmp, shSoft, 0, 4.5 * px);        // soft: contact halo
      blurPass(shSoft, shTmp, 4.5 * px, 0); blurPass(shTmp, shSoft, 0, 4.5 * px);
      renderer.setRenderTarget(prevRT);
      renderer.autoClear = prevAuto;
      renderer.setClearColor(prevColor, prevAlpha);
      shadowDirty = false;
      bakedYaw = cur.yaw;
      bakedFast = !!fast;
    }
    function ensureShadow(moving) {
      var turned = bakedYaw === null || Math.abs(bakedYaw - cur.yaw) > 0.005;
      if (shadowDirty || turned) bakeShadow(moving);
      else if (!moving && bakedFast) bakeShadow(false);
    }

    // ---------- background
    var bgTransparent = false, bgCurrent = '#f4ece9', lastSolid = '#f4ece9';
    function applyBackground(c, forSnapshot) {
      var transparent = isTransparent(c);
      if (transparent) {
        renderer.setClearColor(0x000000, 0);
        groundMat.uniforms.uColor.value.setRGB(0.045, 0.035, 0.035);
      } else {
        var col = safeColor(c);
        renderer.setClearColor(col, 1);
        // shadow tinted with the backdrop's own hue (multiply-like), never grey on pink
        groundMat.uniforms.uColor.value.copy(col).multiplyScalar(0.16);
      }
      if (!forSnapshot) { bgTransparent = transparent; bgCurrent = transparent ? 'transparent' : c; if (!transparent) lastSolid = c; }
    }

    // ---------- views, framing, animation
    var cur = { yaw: 0, elev: 8, fov: 26, dist: 400, zoom: 1 }, tgt = { yaw: 0, elev: 8, fov: 26, dist: 400, zoom: 1 };
    var center = new T.Vector3(), yawVel = 0, transition = false;
    function framing(v) {
      var V = VIEWS[v], aspect = cssW / cssH, bb = pkg.bbox, yaw = V.yaw * DEG, el = V.elev * DEG;
      var t = Math.tan(V.fov * DEG / 2), m = V.margin, cy = (bb.min.y + bb.max.y) / 2;
      center.set(0, cy, 0);
      var b = [0, Math.sin(el), Math.cos(el)], u = [0, Math.cos(el), -Math.sin(el)], R = 0;
      for (var i = 0; i < 8; i++) {
        var x = i & 1 ? bb.max.x : bb.min.x, y = i & 2 ? bb.max.y : bb.min.y, z = i & 4 ? bb.max.z : bb.min.z;
        var wx = x * Math.cos(yaw) + z * Math.sin(yaw), wz = -x * Math.sin(yaw) + z * Math.cos(yaw), wy = y - cy;
        var depth = wy * b[1] + wz * b[2], sx = wx, sy = wy * u[1] + wz * u[2];
        R = Math.max(R, depth + Math.abs(sx) / (t * aspect * (1 - m)), depth + Math.abs(sy) / (t * (1 - m)));
      }
      return R;
    }
    function setTargetsFor(v, instant) {
      var V = VIEWS[v];
      var dy = ((V.yaw - cur.yaw) % 360 + 540) % 360 - 180;   // shortest way round
      tgt.yaw = cur.yaw + dy; tgt.elev = V.elev; tgt.fov = V.fov; tgt.dist = framing(v); tgt.zoom = 1;
      yawVel = 0;
      if (instant) { cur.yaw = tgt.yaw; cur.elev = tgt.elev; cur.fov = tgt.fov; cur.dist = tgt.dist; cur.zoom = 1; transition = false; }
      else transition = true;
    }
    function settle() {
      cur.yaw = tgt.yaw; cur.elev = tgt.elev; cur.fov = tgt.fov; cur.dist = tgt.dist; cur.zoom = tgt.zoom;
      yawVel = 0; transition = false;
    }
    function updateCamera() {
      var el = cur.elev * DEG, R = cur.dist * cur.zoom;
      camera.fov = cur.fov; camera.aspect = cssW / cssH;
      camera.position.set(center.x, center.y + R * Math.sin(el), center.z + R * Math.cos(el));
      camera.lookAt(center);
      camera.near = Math.max(0.5, R * 0.05); camera.far = R * 12 + 2000;
      camera.updateProjectionMatrix();
      pkgGroup.rotation.y = cur.yaw * DEG;
    }
    function step(dt) {
      var moving = false;
      if (!drag && Math.abs(yawVel) > 1) { tgt.yaw += yawVel * dt; yawVel *= Math.exp(-dt * 4.2); moving = true; }
      else if (!drag) yawVel = 0;
      var k = 1 - Math.exp(-dt * (transition ? 5.2 : 13));
      var eps = { yaw: 0.01, elev: 0.01, fov: 0.005, dist: 0.02, zoom: 0.0005 };
      Object.keys(eps).forEach(function (key) {
        var d = tgt[key] - cur[key];
        if (Math.abs(d) > eps[key]) { cur[key] += d * k; moving = true; } else cur[key] = tgt[key];
      });
      if (!moving) transition = false;
      return moving;
    }

    // ---------- render loop (on demand; paused offscreen / hidden)
    var raf = 0, lastT = 0, visible = true, disposed = false, needsFrame = false, initializing = true;
    function renderNow(moving) {
      if (disposed) return;
      updateCamera();
      ensureShadow(!!moving);
      renderer.render(scene, camera);
    }
    function requestRender() {
      needsFrame = true;
      if (raf || disposed || initializing || !visible || document.hidden) return;
      raf = requestAnimationFrame(frame);
    }
    function frame(now) {
      raf = 0;
      if (disposed) return;
      var dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 1 / 60;
      lastT = now;
      var moving = step(dt);
      try { renderNow(moving); } catch (e) { reportError(e instanceof Error ? e : new Error(String(e))); }
      needsFrame = false;
      if (moving) requestRender(); else lastT = 0;
    }
    function onVisibility() { if (!document.hidden && needsFrame) requestRender(); }
    document.addEventListener('visibilitychange', onVisibility);
    var io = null;
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver(function (ents) {
        visible = ents[ents.length - 1].isIntersecting;
        if (visible && needsFrame) requestRender();
      });
      io.observe(container);
    }
    var ro = null;
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(function () {
        if (disposed || !pkg) return;
        if (measure()) { tgt.dist = framing(viewName); cur.dist = tgt.dist; requestRender(); }
      });
      ro.observe(container);
    }

    // ---------- interaction
    var drag = null;
    function onDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (drag) return;
      try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), v: 0 };
      yawVel = 0; transition = false;
      canvas.style.cursor = 'grabbing';
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now(), dt = Math.max(4, now - drag.t) / 1000;
      drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
      tgt.yaw += dx * 0.45;
      tgt.elev = clamp(tgt.elev + dy * 0.22, 1, 58);
      drag.v = drag.v * 0.55 + (dx * 0.45 / dt) * 0.45;
      requestRender();
    }
    function onUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      yawVel = performance.now() - drag.t < 90 ? clamp(drag.v * 0.8, -400, 400) : 0;
      drag = null;
      canvas.style.cursor = 'grab';
      requestRender();
    }
    function onWheel(e) {
      e.preventDefault();
      var dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
      tgt.zoom = clamp(tgt.zoom * Math.exp(clamp(dy, -120, 120) * 0.0011), 0.55, 1.5);
      requestRender();
    }
    function onDbl() { setTargetsFor(viewName, false); requestRender(); }
    function onKey(e) {
      var k = e.key, used = true;
      if (k === 'ArrowLeft') tgt.yaw -= 15;
      else if (k === 'ArrowRight') tgt.yaw += 15;
      else if (k === 'ArrowUp') tgt.elev = clamp(tgt.elev + 5, 1, 58);
      else if (k === 'ArrowDown') tgt.elev = clamp(tgt.elev - 5, 1, 58);
      else if (k === '+' || k === '=') tgt.zoom = clamp(tgt.zoom * 0.9, 0.55, 1.5);
      else if (k === '-' || k === '_') tgt.zoom = clamp(tgt.zoom / 0.9, 0.55, 1.5);
      else if (k === 'Home' || k === '0') setTargetsFor(viewName, false);
      else used = false;
      if (used) { e.preventDefault(); requestRender(); }
    }
    if (interactive) {
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);
      canvas.addEventListener('lostpointercapture', onUp);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      canvas.addEventListener('dblclick', onDbl);
      canvas.addEventListener('keydown', onKey);
    }
    function onContextLost(e) { e.preventDefault(); reportError(new Error('the WebGL context was lost (GPU reset); it is restored automatically.')); }
    function onContextRestored() {
      // render-target contents do not survive a context loss: rebuild the studio light and the shadow
      try { envRT.dispose(); envRT = studioEnvironment(T, renderer); scene.environment = envRT.texture; } catch (e) { /* ignore */ }
      shadowDirty = true; requestRender();
    }
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);

    // ---------- initial content
    artSrc = opts.art || null;
    uploadArt(artSrc || noArt(), false, !artSrc);
    backSrc = opts.artBack || opts.backArt || null;
    if (backSrc) uploadBack(backSrc);
    applyBackground(bg);
    buildPackage();
    setTargetsFor(viewName, true);

    // Rebuild the item from the current spec / size options (type change, new spec, new size). New front /
    // back art can come in the same step; without it the current art is fitted to the new panel until setArt().
    function rebuild(nt, art, back) {
      type = nt;
      R = resolveSpec(type, specOpt, sizeOpt);
      var na = R.w / R.h, aspectChanged = Math.abs(na - faceAspect) > 1e-6;
      faceAspect = na;
      if (art !== undefined) { artSrc = art || null; uploadArt(artSrc || noArt(), false, !artSrc); }
      else if (aspectChanged) uploadArt(artSrc || noArt(), false, !artSrc, true);   // interim fit until setArt()
      if (back !== undefined) { backSrc = back || null; uploadBack(backSrc); }
      else if (aspectChanged && backSrc) uploadBack(backSrc, true);
      buildPackage();
      setTargetsFor(viewName, true);
      requestRender();
      return api;
    }
    function itemSummary() {
      if (!pkg) return null;
      var S = pkg.spec, r2 = function (v) { return Math.round(v * 100) / 100; };
      if (type === 'wrapper') {
        return {
          flat: { w: S.w, h: S.h }, endSeal: { top: S.sealT, bottom: S.sealB, ribs: S.ribs }, finSeal: S.fin, finFold: S.finFold, bulge: S.bulge,
          shoulder: r2(S.L), bodyWidthMid: r2(2 * S.aMin), thicknessMid: r2(2 * S.T)
        };
      }
      if (type === 'bag') {
        return {
          flat: { w: S.w, h: S.h }, cornerRadius: S.rc, topSeal: S.ts, sideSeal: S.sw, gusset: S.D,
          zip: R.zip, tearNotch: R.tearNotch, widthAtZip: r2(S.zipWidth), widthAtFloor: r2(S.floorWidth), depthAtFloor: r2(2 * S.Zb),
          cornerLift: r2(S.lift)
        };
      }
      return { flat: { w: S.w, h: S.h }, depth: S.d };
    }

    // ---------- public API
    var api = {
      version: VERSION,
      get type() { return type; },
      get finish() { return finish; },
      get view() { return viewName; },
      get spec() { return JSON.parse(JSON.stringify(R)); },
      get sizeMM() { return { w: R.w, h: R.h, d: type === 'bag' ? R.gusset : type === 'sleeve3' ? R.depth : undefined }; },
      get canvas() { return canvas; },
      get lastError() { return lastError; },
      // setArt(front[, back]): front = the front panel canvas; back = the back panel canvas (as seen from
      // behind), null for a plain back, or left out to keep the back as it is. Re-uploads in place, no rebuild.
      setArt: function (c, back) {
        if (disposed) return api;
        var same = !!c && c === artSrc;
        artSrc = c || null;
        uploadArt(artSrc || noArt(), same, !artSrc);
        if (back !== undefined) { backSrc = back || null; uploadBack(backSrc); }
        if (pkg && pkg.filmMats) pkg.filmMats.forEach(function (m) { if (m.map && pkg.backMats.indexOf(m) < 0) m.map = artTex; });
        if (pkg && pkg.boardMats) pkg.boardMats.forEach(function (m) { if (m.map && pkg.backMats.indexOf(m) < 0) m.map = artTex; });
        applyBackColors();
        requestRender();
        return api;
      },
      // setSpec(spec[, front[, back]]): rebuild from new spec numbers (items.js shape); the item type follows
      // spec.construction. null = back to window.MPItems[type]. A legacy sizeMM override is dropped.
      setSpec: function (spec, art, back) {
        if (disposed) return api;
        var s = spec && typeof spec === 'object' ? spec : null, nt = typeOfSpec(s) || type;
        if (nt !== type && back === undefined) back = null;   // the old back art belongs to the other item
        specOpt = s; sizeOpt = null;
        return rebuild(nt, art, back);
      },
      // setType(type[, sizeMM | spec[, front[, back]]]) (legacy): rebuild as another type / size. A new type
      // takes window.MPItems[type]; the same type keeps the current spec; sizeMM overrides its flat size.
      setType: function (t, sz, art, back) {
        if (disposed) return api;
        var nt = normType(t);
        if (sz && typeof sz === 'object' && sz.flat) { specOpt = sz; sizeOpt = null; nt = typeOfSpec(sz) || nt; }
        else {
          if (nt !== type) specOpt = null;
          sizeOpt = sz || (nt === type ? sizeOpt : null);
        }
        if (nt !== type && back === undefined) back = null;
        return rebuild(nt, art, back);
      },
      setFinish: function (f) { if (disposed) return api; finish = normFinish(f); applyFinish(); return api; },
      setView: function (v) { if (disposed) return api; viewName = normView(v); setTargetsFor(viewName, false); requestRender(); return api; },
      setBackground: function (c) { if (disposed) return api; applyBackground(c); requestRender(); return api; },
      setBackColor: function (c) { if (disposed) return api; backColorOpt = c || null; applyBackColors(); return api; },
      resize: function () { if (!disposed && measure()) { tgt.dist = framing(viewName); cur.dist = tgt.dist; } requestRender(); return api; },
      snapshot: function (o) {
        if (disposed) return Promise.reject(new Error('MPMockup: disposed'));
        o = o || {};
        var scale = clamp(+o.scale || 2, 0.25, 8), transparent = !!o.transparent;
        measure();
        var outW = Math.max(1, Math.round(cssW * scale)), outH = Math.max(1, Math.round(cssH * scale));
        var cap = Math.min(1, 16384 / Math.max(outW, outH), Math.sqrt(120e6 / (outW * outH)));
        if (cap < 1) { warn('snapshot clamped to ' + Math.round(outW * cap) + 'x' + Math.round(outH * cap) + ' px'); outW = Math.round(outW * cap); outH = Math.round(outH * cap); }
        var out = document.createElement('canvas'); out.width = outW; out.height = outH;
        var ctx = out.getContext('2d');
        settle();
        applyBackground(transparent ? 'transparent' : (bgTransparent ? lastSolid : bgCurrent), true);
        var bw = canvas.width, bh = canvas.height;
        try {
          updateCamera();
          ensureShadow(false);
          for (var ty = 0; ty < outH; ty += bh) {
            for (var tx = 0; tx < outW; tx += bw) {
              camera.setViewOffset(outW, outH, tx, ty, bw, bh);
              renderer.render(scene, camera);
              var sw = Math.min(bw, outW - tx), sh = Math.min(bh, outH - ty);
              ctx.drawImage(canvas, 0, 0, sw, sh, tx, ty, sw, sh);   // same task as the render: no preserveDrawingBuffer
            }
          }
        } finally {
          camera.clearViewOffset();
          applyBackground(bgCurrent, true);
          renderNow();
        }
        return new Promise(function (res, rej) {
          out.toBlob(function (b) { if (b) res(b); else rej(new Error('MPMockup: PNG encoding failed')); }, 'image/png');
        });
      },
      info: function () {
        var dbg = gl.getExtension('WEBGL_debug_renderer_info');
        return {
          version: VERSION, type: type, sizeMM: api.sizeMM, finish: finish, view: viewName, backColor: backColorHex(),
          spec: api.spec, specSource: R.source, item: itemSummary(),
          art: artTex && artTex.image ? { w: artTex.image.width, h: artTex.image.height } : null,
          artBack: backTex && backTex.image ? { w: backTex.image.width, h: backTex.image.height } : null,
          toneMapping: tmName, exposure: renderer.toneMappingExposure, gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown',
          css: { w: cssW, h: cssH }, buffer: { w: canvas.width, h: canvas.height }, firstFrameMs: firstFrameMs,
          timing: {
            envMs: timing.envMs, buildMs: timing.buildMs, detailMs: timing.detailMs, geoMs: timing.geoMs, vertices: timing.vertices,
            compileMs: timing.compileMs, frameMs: timing.frameMs
          }
        };
      },
      dispose: function () {
        if (disposed) return;
        disposed = true;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        document.removeEventListener('visibilitychange', onVisibility);
        if (io) io.disconnect();
        if (ro) ro.disconnect();
        canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
        canvas.removeEventListener('lostpointercapture', onUp); canvas.removeEventListener('wheel', onWheel);
        canvas.removeEventListener('dblclick', onDbl); canvas.removeEventListener('keydown', onKey);
        canvas.removeEventListener('webglcontextlost', onContextLost); canvas.removeEventListener('webglcontextrestored', onContextRestored);
        disposePackage();
        if (artTex) artTex.dispose();
        if (backTex) backTex.dispose();
        if (fibreTex) fibreTex.dispose();
        if (knurlTex) knurlTex.dispose();
        envRT.dispose();
        [shAcc, shTmp, shOut, shSoft].forEach(function (rt) { rt.dispose(); });
        [projMat, contactMat, blurMat, groundMat].forEach(function (m) { m.dispose(); });
        quadGeo.dispose(); groundGeo.dispose(); proxyMesh.geometry.dispose();
        renderer.dispose();
        try { renderer.forceContextLoss(); } catch (e) { /* ignore */ }
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        artSrc = null; backSrc = null;
      },
      _debug: {
        THREE: T, renderer: renderer, scene: scene, camera: camera, ground: ground, region: region,
        shadow: { acc: shAcc, tmp: shTmp, out: shOut, soft: shSoft }, bake: function (fast) { bakeShadow(fast); }, render: function () { renderNow(false); },
        get pkg() { return pkg; }, get cur() { return cur; }, get tgt() { return tgt; }, get shape() { return pkg && pkg.spec; }
      }
    };

    // ---------- first frame (synchronous: resolves even in a background tab), after shaders compile in parallel
    var firstFrameMs = 0;
    timing.envMs = envMs;
    updateCamera();
    var tc = performance.now();
    var warm = typeof renderer.compileAsync === 'function'
      ? renderer.compileAsync(scene, camera).catch(function () { /* fall back to compile-on-render */ })
      : Promise.resolve();
    return warm.then(function () {
      initializing = false;
      if (disposed) return api;
      timing.compileMs = Math.round(performance.now() - tc);
      var tf = performance.now();
      try { renderNow(); } catch (e) { api.dispose(); throw e; }
      timing.frameMs = Math.round(performance.now() - tf);
      canvas.removeAttribute('data-mp-init');
      needsFrame = false;
      firstFrameMs = Math.round(performance.now() - t0);
      return api;
    });
  }

  var M = {
    version: VERSION,
    create: create,
    preload: function () { return loadThree().then(function () { return true; }); },
    // the geometry numbers (mm) an item would be built from: resolveSpec('bag'), resolveSpec('wrapper', spec)
    resolveSpec: function (type, spec, sizeMM) { return resolveSpec(type, spec, sizeMM); },
    // pure geometry (no WebGL): flat panel point -> its place in a straight-on front view of the filled item (mm)
    frontMap: function (type, spec) { return frontMap(type, spec); },
    TYPES: ['wrapper', 'bag', 'sleeve3'],
    FINISHES: ['gloss', 'satin', 'matte'],
    VIEWS: ['front', 'three-quarter', 'hero', 'back']
  };
  // flat size of each item from the current spec (window.MPItems, read when asked: items.js may load later)
  Object.defineProperty(M, 'DEFAULT_SIZE', {
    enumerable: true,
    get: function () {
      var o = {};
      M.TYPES.forEach(function (t) {
        var r = resolveSpec(t);
        o[t] = { w: r.w, h: r.h };
        if (t === 'bag') o[t].d = r.gusset;
        if (t === 'sleeve3') o[t].d = r.depth;
      });
      return o;
    }
  });
  global.MPMockup = M;
})(typeof window !== 'undefined' ? window : this);
