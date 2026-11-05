/* Glo Pop — shared 3D candy for the redesign prototypes (lollipop + gummies).  v3
 * Classic script, so it works from file:// as well as http. three.js is loaded from the CDN on demand
 * with a dynamic import(). Real CC0 assets (Poly Haven beach HDRIs, ambientCG paper / sugar / surface
 * imperfection maps — see assets/LICENSES.md) load relative to THIS script and never block: create()
 * renders at once with a procedural environment + procedural surface detail and upgrades in place
 * when the files arrive (same framing, no pop). On plain file:// (no --allow-file-access-from-files)
 * browsers refuse local images in WebGL; that is detected silently and the procedural look stays.
 *
 *   <script src="../_shared/candy3d.js"></script>
 *   const candy = await GloCandy.create(el, { product: { kind: 'lollipop', color: '#FF1493' } });
 *   candy.setProduct({ kind: 'gummy', color: '#1FA453' });   // animated swap (spin out / pop in)
 *   candy.setColor('#F26A1B');                              // animated recolor, same shape
 *   candy.setEnvironment('golden');                         // relight: 'beach' | 'golden' | 'studio'
 *   candy.bite(); candy.poke(); candy.regrow();             // programmatic crunch / jiggle / heal
 *
 * Options (all optional):
 *   product      { kind: 'lollipop' | 'gummy', color: '#hex' }   default: pink lollipop
 *   preset       'gloss' | 'jewel' (alias 'glass') | 'iridescent' | 'satin'   (default 'gloss')
 *   environment  'beach'  (default) midday Mondello beach HDRI, crisp high sun
 *                'golden' Umhlanga sunrise HDRI, warm low glow
 *                'studio' neutral procedural studio (no download)
 *   spin         idle auto-spin, radians per 60 Hz frame (default 0.0032; 0 = still). Time-based:
 *                the same speed on 60 / 120 / 144 Hz screens.
 *   tilt         lean of the lollipop in radians (default 0.24)
 *   drag         grab-and-fling to spin, with inertia (default true)
 *   bite         tap the lollipop to take a crunchy bite (default true; false = it just wobbles)
 *   interactive  false = no pointer interaction at all (no drag, no taps)
 *   pointerTilt  subtle lean toward the mouse (default true)
 *   bob          gentle breathing bob (default true)
 *   zoom         >1 renders the candy bigger in its box (default 1)
 *   exposure     brightness, relative: 1.2 = the environment's calibrated exposure (the legacy
 *                default); other values trim it gently (sqrt, clamped 0.75 .. 1.3)
 *   quality      'high' | 'medium' (default) | 'low': 'low' caps the pixel ratio at 1.5, lightens the
 *                gummy meshes and trims bite shards / sparkles
 *   assets       false = never download HDRIs / textures (procedural look only)
 *   env          legacy 4-colour studio gradient — ignored (the light comes from `environment`)
 *   onBite(e)    e = { bites, max, point (root-space Vector3), regrowIn (ms) }
 *   onPoke(e)    e = { kind: 'gummy', index } or { kind: 'lollipop' } (a wobble)
 *   onRegrow()   the bitten lollipop finished healing
 *   fallback     element to un-hide if WebGL / the CDN is unavailable
 *   backdrop     lab / preview aid: show the (blurred) environment behind the candy (default false;
 *                pages keep a transparent canvas)
 *   onReady(api)
 *   onRender(api)  called right after every frame the candy renders (default: none, zero cost; frames
 *                are skipped while it is offscreen, paused or the tab is hidden). The canvas
 *                (api.renderer.domElement) holds that frame only until the current task ends (no
 *                preserveDrawingBuffer), so this is the moment to copy it, e.g. drawImage() it into a
 *                small 2D canvas for a cast shadow. It runs every rendered frame: keep it cheap.
 *
 * Gestures: tap (< 6 px and < 350 ms) = bite / jiggle; anything else is a drag-to-spin with inertia.
 * touch-action stays pan-y, so vertical swipes scroll the page and never bite.
 *
 * The mount element should have a real size (the canvas fills it). The candy is framed to fit the box
 * at any aspect ratio. Returned api:
 *   setProduct(product, {duration}) · setColor(hex, {duration}) · setSpin(rad per 60 Hz frame)
 *   setEnvironment(name) · environment (getter { name, hdr }) · assetsReady (Promise<bool>)
 *   bite([{clientX, clientY}]) -> bool · poke([index]) -> bool · regrow() -> bool · bites (getter)
 *   pause() · resume() · dispose() · frames · product · interaction · lighting (QA)
 *   root (THREE.Group you may move / scale / rotate) · THREE · scene · camera · renderer
 *
 * Hierarchy: scene > root > lean > spinner > model (root.children[0] = lean, lean.children[0] =
 * spinner, spinner.children[0] = model; model.userData.kind = 'lollipop' | 'gummy'). The bite shards
 * and sparkles are added to root AFTER lean. The sun lives in the scene (like the environment it stays
 * put when a page rotates root) and its shadow frustum is refitted to the model every frame, so it
 * follows root moves / scales and model swaps. The canvas stays transparent (no scene.background).
 *
 * Performance: no long task after the first frame. Heavy one-off CPU work (HDR parse + grade, CC0 sugar
 * processing, the gummy cluster) runs as job()s of short steps, the sugar and gummies at idle, ahead of
 * the first switch; CC0 maps are decoded off-thread and uploaded one per frame; each renderer keeps one
 * material set per kind (recoloured on reuse, the other kind compiled at idle), so swaps never compile.
 *
 * ── MODULES (each self-contained; needs only THREE = T) ─────────────────────────────────────────
 * WORK
 *   job(steps, {idle, budget, timeout}) -> J {done, ms, promise, flush(), hurry()}: runs a list of
 *   short steps a few ms per slice (idle slices never wait longer than ~40 ms); flush() = finish now
 * ASSETS
 *   ASSET_BASE (assets/ next to this script; window.GloCandyAssets overrides) · assetsUsable() ->
 *   Promise<bool> (false on plain file://, probed silently) · loadTextures(T) -> Promise<{name: Texture}>
 *   (all 9 CC0 maps, once per page; every candy instance clones what it draws with)
 * LIGHTING
 *   ENVIRONMENTS (beach | golden | studio tuning) · envName(x) · configureRenderer(T, renderer, which, opts)
 *   buildEnvironment(T, renderer, which, onReady, useAssets) -> env {which, texture, sun, hdr, ready, dispose()}
 *     Builds a procedural PMREM in the palette of `which` synchronously (frame 1 is lit), then loads the
 *     HDRI, cuts the sun out of it (its energy becomes the DirectionalLight, so nothing is counted
 *     twice and the env is pure unshadowed sky + sand fill), mirrors / rotates it so the sun sits
 *     front-left, grades it and swaps env.texture in place (onReady(env)). env.ready: Promise<bool>.
 *     The procedural panorama is upsampled to the HDRIs' 1024 x 512, so both PMREMs are the same size
 *     and the upgrade recompiles nothing; the HDRI is parsed + processed in short slices.
 *   buildLightRig(T, scene, which, sun) -> rig {sun, lights, setSun(info, which), fitShadow(model), dispose()}
 *     One shadow-casting DirectionalLight. fitShadow(model) right before every render: flags the
 *     model's meshes cast + receive, fits a tight ortho shadow camera to the model's world bounding
 *     sphere (quantised radius, texel-snapped centre: no crawling edges), bias scaled to the texel.
 *     Tiny maps (224..320 texels across the model) = soft sun penumbra in model units on any device.
 * LOLLIPOP
 *   lollipopMaterials(T, preset, hex, assets) -> { candy, stick, preset }
 *     candy: MeshPhysicalMaterial (no clearcoat, no bumpMap, emissive = colour at ~0.03) + shader patch:
 *     triplanar CC0 smudge roughness + micro-normal (object space: no UV poles, sticks to the candy),
 *     faint mould seam, light scattering at the terminator, baked AO (attribute gloAO) on indirect
 *     light, and the bite attribute gloBite (fresh glassy fracture, crater occlusion, stress halo).
 *     stick: MeshStandardMaterial (emissive exactly 0x000000), CC0 rolled paper + glued edge + AO.
 *   applyLollipopAssets(mats, assets)   swaps the real maps in when they arrive (no recompile)
 *   buildLollipop(T, mats, {tilt}) -> Group  userData { kind:'lollipop', size:{w:3.4,h:6}, candy,
 *     stick, collar, tilt, mats, mat, bob(t seconds) }. candy: 192x144 slightly hand-poured sphere
 *     (r 1.33 at y 1.5 in the tilt group; geometry.userData { origPositions, origNormals, radius });
 *     collar: candy meniscus around the stick (child of candy, same material); stick y -2.8 .. 0.6.
 *   bakeAO(positions, normals, occluders, {rays, dist, strength, inside}) -> Float32Array (cached per
 *     page; the ball and stick are lathes, so they bake one vertex per ring). Buried vertices get
 *     `inside` (0.3): a crease still blends dark, anything a deep bite exposes is shaded, never black.
 * GUMMIES
 *   gummyMaterial(T, hex, assets) -> MeshPhysicalMaterial (bumpMap = packed sugar map from frame 1,
 *     emissive = colour at 0.02). Sugar, best first: the high-passed CC0 Candy003 grains (processed
 *     once per page, at idle, in ~250 short steps) > procedural crystals (no assets) > a plain stand-in
 *     while the CC0 grains are still being made; upgrades happen in place (userData.sugar tells which;
 *     userData.applyAssets(assets) hands it the CC0 source when that arrives).
 *   buildGummies(T, mat, {quality}) -> Group > cluster > 3 individually shaped gumdrops that touch
 *     (ray-cast contact solve) with baked contact AO, gel thickness and sugar coverage. The shapes and
 *     bakes are deterministic: made once per page + quality (gummyGeoJob, prepared at idle), copied.
 *     userData { size:{w:3.9,h:3.6}, pieces, cluster, bounds, bob(t seconds) }
 * INTERACTION
 *   attachInteraction(ctx) -> ix {update(dt, now), onModelChange(model), bite([at]), poke([i]),
 *     regrow(), dispose(), dragging, bites, active}
 *     ctx = { T, renderer, camera, scene, root, lean, spinner, canvas, getModel(), reduce, opts, isBusy() }
 *     The loop ASSIGNS the base lean, calls bob(), then ix.update() ADDS drag pitch / fling tilt /
 *     bite recoil, integrates spin inertia, squashes the candy / jiggles gummies through their own
 *     matrices, and runs the pooled shards + sparkles (added to root after lean, never in shadows).
 *     A bite = one scoop + a crescent of 7 tooth spheres, carved by Newton-projecting the ball's
 *     vertices onto smooth-max(own poured surface, -smooth-union(cutters)); crisp scalloped rims, a
 *     deeper denser interior, a stress-white edge. Hits low on the ball slide up to BITE.minY so the
 *     crater never opens the stick junction. It regrows after a pause. Shards take a free slot first
 *     (else the oldest), so three quick bites never recycle a shard mid-air.
 *   patchBiteMaterial(mat)   adds the gloBite attribute to a foreign Standard/Physical material
 */
(function () {
  'use strict';

  var THREE_URL = 'https://unpkg.com/three@0.160.0/build/three.module.js';
  var threeP = null;
  function loadThree() { return threeP || (threeP = import(THREE_URL)); }

  var easeOutBack = function (t) { var c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  var easeInBack = function (t) { var c = 1.70158; return (c + 1) * t * t * t - c * t * t; };
  var easeInOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var smooth = function (a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };   // smoothstep
  var smooth01 = function (t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
  var DEG = Math.PI / 180;

  // seeded PRNG (mulberry32)
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // smooth seeded 3D field: a sum of random plane waves (no lattice artefacts), ~unit std
  function waveField(r, n, fmin, fmax) {
    var W = [], e = 0;
    for (var i = 0; i < n; i++) {
      var u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), f = fmin + (fmax - fmin) * r(), a = 1 / (1 + i * 0.3);
      W.push([s * Math.cos(th) * f, u * f, s * Math.sin(th) * f, r() * Math.PI * 2, a]);
      e += a * a;
    }
    var k = 1 / Math.sqrt(e / 2);
    return function (x, y, z) {
      var v = 0;
      for (var i = 0; i < W.length; i++) { var w = W[i]; v += Math.sin(w[0] * x + w[1] * y + w[2] * z + w[3]) * w[4]; }
      return v * k;
    };
  }

  // ── cooperative work: heavy CPU jobs are lists of short steps, run a few ms per slice ──
  var ric = window.requestIdleCallback
    ? function (f, timeout) { return window.requestIdleCallback(f, { timeout: timeout || 2000 }); }
    : function (f) { return setTimeout(f, 24); };
  var cic = window.requestIdleCallback ? function (h) { window.cancelIdleCallback(h); } : function (h) { clearTimeout(h); };
  // job(steps, {idle, budget, timeout}) -> J { done, ms, promise, flush(), hurry() }. Steps run in
  // slices of ~budget ms, so no slice becomes a long task; a step may push more steps. `idle` slices
  // use the browser's idle time (all of it when there is some) but never wait longer than `timeout`
  // (default 40 ms), so a job still progresses on a page that animates all the time. flush() runs
  // whatever is left synchronously (the result is needed now); hurry() stops waiting for idle time.
  // A throwing step rejects J.promise (and makes flush() throw). The step list is dropped when done,
  // so its buffers can be collected.
  function job(steps, o) {
    o = o || {};
    var i = 0, budget = o.budget || 6, J = { done: false, failed: null, ms: 0 }, res, rej;
    J.promise = new Promise(function (a, b) { res = a; rej = b; });
    J.promise.catch(function () {});              // a failure is handled by whoever awaits it
    function run(limit) {
      var t0 = performance.now();
      try {
        while (i < steps.length) {
          steps[i++]();
          if (limit && performance.now() - t0 > limit) break;
        }
      } catch (e) { J.failed = e; }
      J.ms += performance.now() - t0;
      if (J.failed) { J.done = true; steps = null; rej(J.failed); }
      else if (i >= steps.length) { J.done = true; steps = null; res(J); }
    }
    var handle = null, viaIdle = false;
    function slice(deadline) {
      handle = null;
      if (J.done) return;
      var spare = deadline && deadline.timeRemaining && !deadline.didTimeout ? deadline.timeRemaining() - 2 : 0;
      run(Math.max(budget, Math.min(spare, 16)));   // at most a frame's worth, even when idle
      if (!J.done) next();
    }
    function next() { viaIdle = !!o.idle; handle = viaIdle ? ric(slice, o.timeout || 40) : setTimeout(slice, 0); }
    J.flush = function () { if (!J.done) run(0); if (J.failed) throw J.failed; return J; };
    J.hurry = function () {
      if (!o.idle) return;
      o.idle = false;
      if (handle != null && viaIdle) { cic(handle); next(); }
    };
    next();
    return J;
  }

  // ══ ASSETS ═════════════════════════════════════════════════════════════════════════════════════
  // Resolved relative to this script (captured while it runs), not the page.
  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';
  var ASSET_BASE = (function () {
    if (window.GloCandyAssets) return String(window.GloCandyAssets);
    try {
      var u = new URL(SCRIPT_SRC || location.href, location.href);
      // the library lives in _shared/ (assets in _shared/assets/); lab forks sit two folders deeper
      return new URL(/\/lab\/[^\/]+\/[^\/]*$/.test(u.pathname) ? '../../assets/' : 'assets/', u).href;
    } catch (e) { return 'assets/'; }
  })();
  function isFileURL(u) { return /^file:/i.test(u); }
  function crossOriginFor(u) {
    try { return (isFileURL(u) || new URL(u, location.href).origin === location.origin) ? undefined : 'anonymous'; }
    catch (e) { return undefined; }
  }

  // Over same-origin http(s) assets always work. From file:// browsers block local images in WebGL (and
  // fetch) unless file access is allowed, so draw one tiny asset into a canvas first: a tainted canvas
  // throws (silently caught) and we keep the procedural look without a single console error.
  var assetsP = null;
  function assetsUsable() {
    if (assetsP) return assetsP;
    if (window.GLO_CANDY_NO_ASSETS) return (assetsP = Promise.resolve(false));
    if (!isFileURL(ASSET_BASE) && !crossOriginFor(ASSET_BASE)) return (assetsP = Promise.resolve(true));
    return (assetsP = new Promise(function (resolve) {
      var img = new Image(), co = crossOriginFor(ASSET_BASE);
      if (co) img.crossOrigin = co;
      img.onload = function () {
        try {
          var c = document.createElement('canvas'); c.width = c.height = 1;
          var g = c.getContext('2d'); g.drawImage(img, 0, 0, 1, 1); g.getImageData(0, 0, 1, 1);
          resolve(true);
        } catch (e) { resolve(false); }
      };
      img.onerror = function () { resolve(false); };
      img.src = ASSET_BASE + 'tex/paper_color.webp';
    }));
  }

  // The CC0 maps (name -> sRGB colour data?), loaded once per page.
  var TEXTURES = {
    smudge_spots: false, smudge_streaks: false, smudge_spots_normal: false,   // candy gloss break-up
    paper_color: true, paper_rough: false, paper_normal: false,               // rolled-paper stick
    sugar_height: false, sugar_rough: false, sugar_normal: false              // gummy sugar coating
  };
  var texP = null;
  function loadTextures(T) {
    if (texP) return texP;
    return (texP = assetsUsable().then(function (ok) {
      if (!ok) return null;
      var loader = new T.TextureLoader();
      loader.setCrossOrigin(crossOriginFor(ASSET_BASE));
      var out = {};
      return Promise.all(Object.keys(TEXTURES).map(function (name) {
        return new Promise(function (resolve) {
          loader.load(ASSET_BASE + 'tex/' + name + '.webp', function (t) {
            t.wrapS = t.wrapT = T.RepeatWrapping;
            t.colorSpace = TEXTURES[name] ? T.SRGBColorSpace : T.NoColorSpace;
            out[name] = t;
            resolve();
          }, undefined, function () { resolve(); });
        });
      })).then(function () { return out; });
    }));
  }

  // ══ LIGHTING ═══════════════════════════════════════════════════════════════════════════════
  // Directions: azimuth 0 = toward the camera (+z), negative = camera-left (-x); elevation above
  // the horizon. Colours are linear RGB. Sun intensity is irradiance (three's physical units):
  // the Mondello HDRI's own sun measures ~5.3 against ~1.4 of sky on a sun-facing surface.
  var ENVIRONMENTS = {
    beach: {                                   // Poly Haven "Spiaggia di Mondello" (CC0)
      hdri: 'hdri/spiaggia_di_mondello_1k.hdr', mirror: true,
      sun: { azimuth: -40, elevation: 50, intensity: 4.4, color: [1.0, 0.96, 0.87] },
      clamp: 6,                                // HDRI luminance above this (near the sun) moves into the light
      grade: { gain: 1.2, saturation: 0.6, tint: [1.02, 1.0, 0.96] },   // lifted, less blue fill
      shadowMap: 320,                          // texels across the model: crisp-ish midday penumbra
      exposure: 0.95, glowElevation: 25, paint: 'beach'
    },
    golden: {                                  // Poly Haven "Umhlanga Sunrise" (CC0)
      hdri: 'hdri/umhlanga_sunrise_1k.hdr', mirror: true,
      sun: { azimuth: -48, elevation: 46, intensity: 3.3, color: [1.0, 0.73, 0.46] },
      clamp: 6,
      grade: { gain: 1.12, saturation: 0.6, tint: [1.28, 1.0, 0.7] },  // pale blue dawn sky -> warm peach
      shadowMap: 256,                          // hazy low sun: softer
      exposure: 1.0, glowElevation: 4, paint: 'golden'
    },
    studio: {                                  // procedural: soft white cyc + softboxes
      hdri: null,
      sun: { azimuth: -40, elevation: 52, intensity: 3.4, color: [1.0, 0.98, 0.95] },
      shadowMap: 224,                          // big softbox: softest
      exposure: 1.0, glowElevation: 48, paint: 'studio'
    }
  };
  function envName(x) {
    x = String(x || 'beach').toLowerCase();
    if (x === 'golden' || x === 'sunrise' || x === 'sunset' || x === 'golden-hour') return 'golden';
    if (x === 'studio' || x === 'neutral') return 'studio';
    return 'beach';
  }
  function sunDirArray(az, el) {
    var a = az * DEG, e = el * DEG;
    return [Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)];
  }

  function exposureFor(which, opts) {
    // pages tuned `exposure` around the old default 1.2; keep it as a gentle relative trim
    var k = opts && opts.exposure ? clamp(Math.sqrt(opts.exposure / 1.2), 0.75, 1.3) : 1;
    return ENVIRONMENTS[envName(which)].exposure * k;
  }
  function configureRenderer(T, renderer, which, opts) {
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = exposureFor(which, opts);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
  }

  // ── Radiance .hdr (RGBE) parsing — inlined from assets/hdr-loader.js ──
  // The header is read at once; the scanlines are decoded by steps (row chunks, see job()) into st.img.
  function parseRGBESteps(buffer, st) {
    var b = new Uint8Array(buffer), p = 0;
    function line() {
      var s = '';
      while (p < b.length) { var c = b[p++]; if (c === 10) break; s += String.fromCharCode(c); }
      return s;
    }
    if (!/^#\?(RADIANCE|RGBE)/.test(line())) throw new Error('not a Radiance .hdr file');
    while (line() !== '' && p < b.length) { /* header lines */ }
    var m = line().match(/-Y\s+(\d+)\s+\+X\s+(\d+)/);
    if (!m) throw new Error('unsupported .hdr orientation');
    var H = +m[1], W = +m[2], y = 0, steps = [];
    var rgbe = new Uint8Array(W * H * 4), scan = new Uint8Array(W * 4);
    st.img = { width: W, height: H, rgbe: rgbe };
    function rows() {
      for (var end = Math.min(H, y + 32); y < end; y++) {
        if (W < 8 || W > 0x7fff || b[p] !== 2 || b[p + 1] !== 2 || (b[p + 2] & 0x80)) {
          for (var i = 0; i < W * 4; i++) scan[i] = b[p++];
        } else {
          p += 4;
          for (var c = 0; c < 4; c++) {
            var x = 0;
            while (x < W) {
              var n = b[p++];
              if (n > 128) { n -= 128; var v = b[p++]; while (n--) scan[(x++) * 4 + c] = v; }
              else { while (n--) scan[(x++) * 4 + c] = b[p++]; }
            }
          }
        }
        rgbe.set(scan, y * W * 4);
      }
    }
    for (var k = 0; k < H; k += 32) steps.push(rows);
    return steps;
  }

  function makeEquirect(T, data, W, H) {
    var tex = new T.DataTexture(data, W, H, T.RGBAFormat, T.HalfFloatType);
    tex.mapping = T.EquirectangularReflectionMapping;
    tex.colorSpace = T.LinearSRGBColorSpace;
    tex.magFilter = T.LinearFilter; tex.minFilter = T.LinearFilter;
    tex.generateMipmaps = false; tex.flipY = false;
    tex.needsUpdate = true;
    return tex;
  }

  // Decode, cut the sun out (measuring its energy), mirror/rotate so the sun sits at the configured
  // azimuth, grade, and pack to a HalfFloat equirect (row 0 = bottom, as DataTextures upload).
  // Returned as steps (row chunks, see job()); the result lands in st.result.
  function processHDRSteps(T, st, cfg) {
    var img = st.img, W = img.width, H = img.height, src = img.rgbe, N = W * H, steps = [];
    var EXP = new Float32Array(256);
    for (var e = 1; e < 256; e++) EXP[e] = Math.pow(2, e - 136);
    var lin = new Float32Array(N * 3), best = -1, bi = 0, yd = 0, yp = 0;
    var Er = 0, Eg = 0, Eb = 0, sx = 0, sy = 0, sz = 0, shift = 0, out = null, sat, tR, tG, tB, toHalf, one;
    function decode() {                        // 0 · RGBE -> linear, tracking the brightest pixel
      var end = Math.min(H, yd + 64);
      for (var i = yd * W, k = i * 3, n = end * W; i < n; i++, k += 3) {
        var f = EXP[src[i * 4 + 3]];
        var r = src[i * 4] * f, g = src[i * 4 + 1] * f, b = src[i * 4 + 2] * f;
        lin[k] = r; lin[k + 1] = g; lin[k + 2] = b;
        var l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (l > best) { best = l; bi = i; }
      }
      yd = end;
    }
    function sun() {
      var bx = bi % W, by = (bi / W) | 0;
      // 1 · sun extraction within ~20° of the peak (pixel → three equirect direction:
      //     theta = (u - .5)·2π from +x toward +z, phi = latitude, file row 0 = top)
      var cl = cfg.clamp || 6, dA = (2 * Math.PI / W) * (Math.PI / H);
      var rows = Math.ceil(H * 20 / 180);
      for (var y = Math.max(0, by - rows); y <= Math.min(H - 1, by + rows); y++) {
        var ph = (0.5 - (y + 0.5) / H) * Math.PI, cp = Math.cos(ph), sp = Math.sin(ph);
        var cols = Math.min((W >> 1) - 1, Math.ceil(rows / Math.max(0.1, cp)));
        for (var xx = bx - cols; xx <= bx + cols; xx++) {
          var x = ((xx % W) + W) % W, q = (y * W + x) * 3;
          var R = lin[q], G = lin[q + 1], B = lin[q + 2], L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
          if (L <= cl) continue;
          var s = cl / L, w = (1 - s) * dA * cp;
          Er += R * w; Eg += G * w; Eb += B * w;
          var th = ((x + 0.5) / W - 0.5) * 2 * Math.PI, lw = L * w;
          sx += cp * Math.cos(th) * lw; sy += sp * lw; sz += cp * Math.sin(th) * lw;
          lin[q] = R * s; lin[q + 1] = G * s; lin[q + 2] = B * s;
        }
      }
      // 2 · placement: mirroring columns maps theta -> -theta; then shift so the sun lands at azimuth
      var thSun = Math.atan2(sz, sx);
      if (!(sx || sz)) thSun = ((bx + 0.5) / W - 0.5) * 2 * Math.PI;
      if (cfg.mirror) thSun = -thSun;
      var a = cfg.sun.azimuth * DEG, thWant = Math.atan2(Math.cos(a), Math.sin(a));
      shift = Math.round((thWant - thSun) / (2 * Math.PI) * W);
      shift = ((shift % W) + W) % W;
      var gr = cfg.grade || {}, gain = gr.gain || 1, tint = gr.tint || [1, 1, 1];
      sat = gr.saturation == null ? 1 : gr.saturation;
      tR = tint[0] * gain; tG = tint[1] * gain; tB = tint[2] * gain;
      toHalf = T.DataUtils.toHalfFloat; one = toHalf(1); out = new Uint16Array(N * 4);
    }
    function pack() {                          // 3 · grade + pack
      for (var end = Math.min(H, yp + 16); yp < end; yp++) {
        var dstRow = (H - 1 - yp) * W;
        for (var x = 0; x < W; x++) {
          var q = (yp * W + x) * 3;
          var R = lin[q], G = lin[q + 1], B = lin[q + 2], L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
          R = Math.max(0, L + (R - L) * sat) * tR; G = Math.max(0, L + (G - L) * sat) * tG; B = Math.max(0, L + (B - L) * sat) * tB;
          var xm = cfg.mirror ? W - 1 - x : x, d = (dstRow + (xm + shift) % W) * 4;
          out[d] = toHalf(Math.min(R, 60000)); out[d + 1] = toHalf(Math.min(G, 60000)); out[d + 2] = toHalf(Math.min(B, 60000)); out[d + 3] = one;
        }
      }
    }
    for (var r = 0; r < H; r += 64) steps.push(decode);
    steps.push(sun);
    for (r = 0; r < H; r += 16) steps.push(pack);
    steps.push(function () {
      var mx = Math.max(Er, Eg, Eb) || 1, sl = Math.hypot(sx, sy, sz) || 1;
      st.result = {
        texture: makeEquirect(T, out, W, H),
        sun: {   // what was cut out of the panorama (the light itself is aimed/tuned by ENVIRONMENTS)
          color: [Er / mx, Eg / mx, Eb / mx], irradiance: 0.2126 * Er + 0.7152 * Eg + 0.0722 * Eb,
          elevation: Math.asin(clamp(sy / sl, -1, 1)) / DEG, peak: best, rotation: shift / W
        }
      };
      lin = null;
    });
    return steps;
  }

  // ── procedural environments (no download): same palette + sun placement as the HDRIs ──
  function softbox(dAz, dEl, hw, hh, edge) {           // rounded rectangle in angle space, 0..1
    var u = Math.abs(dAz) / hw, v = Math.abs(dEl) / hh;
    var d = Math.pow(u * u * u * u + v * v * v * v, 0.25);
    return 1 - smooth(1 - edge, 1, d);
  }
  var PAINT = {
    // soft white cyclorama: bright ceiling, grey walls, darker floor; key softbox around the sun,
    // a tall strip light back-right (glossy rim line) and a low fill card camera-right
    studio: function (x, y, z, c, P) {
      var t = y > 0 ? Math.pow(y, 0.7) : 0, fl = y < 0 ? Math.min(1, -y * 2.4) : 0;
      var v = 0.56 + 0.44 * t - 0.30 * fl;
      c[0] = v * (1 + 0.03 * fl); c[1] = v; c[2] = v * (1 - 0.04 * fl + 0.03 * t);
      var az = Math.atan2(x, z), el = Math.asin(clamp(y, -1, 1));
      var dk = Math.atan2(Math.sin(az - P.az), Math.cos(az - P.az)) * Math.cos(el);
      var key = softbox(dk, el - P.gel, 26 * DEG, 18 * DEG, 0.35);
      var ds = Math.atan2(Math.sin(az - P.az - 2.5), Math.cos(az - P.az - 2.5)) * Math.cos(el);
      var strip = softbox(ds, el - 12 * DEG, 5 * DEG, 34 * DEG, 0.5);
      var df = Math.atan2(Math.sin(az - P.az - 1.45), Math.cos(az - P.az - 1.45)) * Math.cos(el);
      var fill = softbox(df, el - 6 * DEG, 24 * DEG, 20 * DEG, 0.8);
      var add = key * 3.4 + strip * 2.4 + fill * 0.55;
      c[0] += add; c[1] += add * 0.995; c[2] += add * 0.985;
    },
    // midday beach: deep blue zenith -> pale haze, glow around the sun, thin sea line, bright sand
    beach: function (x, y, z, c, P) {
      if (y >= 0) {                          // ≈ the graded HDRI: sky avg (0.27, 0.35, 0.52), sand (0.64, 0.54, 0.47)
        var t = Math.pow(1 - y, 5);
        c[0] = 0.15 + 0.48 * t; c[1] = 0.25 + 0.47 * t; c[2] = 0.48 + 0.40 * t;
      } else {
        // sea band (~5°) under the horizon, then sun-bleached sand fading darker underfoot
        var s = Math.pow(Math.min(1, -y * 1.4), 0.7), sea = 1 - smooth(0.06, 0.1, -y);
        c[0] = 0.98 - 0.44 * s; c[1] = 0.88 - 0.41 * s; c[2] = 0.75 - 0.36 * s;
        c[0] += (0.05 - c[0]) * sea; c[1] += (0.19 - c[1]) * sea; c[2] += (0.30 - c[2]) * sea;
      }
      var cg = x * P.glow[0] + y * P.glow[1] + z * P.glow[2];
      if (cg > 0) {
        var h = Math.pow(cg, 160) * 5.0 + Math.pow(cg, 14) * 0.55;
        c[0] += h; c[1] += h * 0.96; c[2] += h * 0.86;
      }
    },
    // sunrise: cool zenith, warm horizon toward the sun, big low glow, dark sea with a glitter path
    golden: function (x, y, z, c, P) {
      var hl = Math.hypot(x, z) || 1, toward = (x * P.glow[0] + z * P.glow[2]) / (hl * (Math.hypot(P.glow[0], P.glow[2]) || 1));
      var wm = Math.pow((1 + toward) / 2, 2.2);
      if (y >= 0) {                          // ≈ the graded HDRI: bright peach-white sky, warm sand
        var t = Math.pow(1 - y, 4);
        var hr = 1.25 + 1.0 * wm, hg = 1.05 + 0.4 * wm, hb = 0.92 - 0.05 * wm;
        c[0] = 0.95 + (hr - 0.95) * t; c[1] = 0.90 + (hg - 0.90) * t; c[2] = 0.88 + (hb - 0.88) * t;
      } else {
        var s = Math.pow(Math.min(1, -y * 1.4), 0.7), sea = 1 - smooth(0.02, 0.07, -y);
        c[0] = 0.66 - 0.36 * s; c[1] = 0.45 - 0.25 * s; c[2] = 0.30 - 0.17 * s;
        var gl = Math.pow(Math.max(0, toward), 40) * 1.6;
        c[0] += (0.16 + gl * 1.2 - c[0]) * sea; c[1] += (0.13 + gl * 0.7 - c[1]) * sea; c[2] += (0.15 + gl * 0.3 - c[2]) * sea;
      }
      var cg = x * P.glow[0] + y * P.glow[1] + z * P.glow[2];
      if (cg > 0) {
        var h = Math.pow(cg, 40) * 3.2, h2 = Math.pow(cg, 5) * 0.55;
        c[0] += h + h2; c[1] += h * 0.55 + h2 * 0.55; c[2] += h * 0.22 + h2 * 0.25;
      }
    }
  };
  // Painted at 512 x 256 (cheap), then 2x-upsampled to 1024 x 512 = the HDRIs' size, so the PMREM
  // (whose size every env-mapped shader program is keyed on) is identical before and after the HDRI
  // lands: the upgrade swaps a texture and recompiles nothing.
  function proceduralEquirect(T, which) {
    var cfg = ENVIRONMENTS[which], W = 512, H = 256, out = new Uint16Array(W * H * 4);
    var toHalf = T.DataUtils.toHalfFloat, one = toHalf(1), paint = PAINT[cfg.paint] || PAINT.studio;
    var P = { az: cfg.sun.azimuth * DEG, gel: cfg.glowElevation * DEG, glow: sunDirArray(cfg.sun.azimuth, cfg.glowElevation) };
    var c = [0, 0, 0];
    for (var y = 0; y < H; y++) {
      var ph = (0.5 - (y + 0.5) / H) * Math.PI, cp = Math.cos(ph), sp = Math.sin(ph), dstRow = (H - 1 - y) * W;
      for (var x = 0; x < W; x++) {
        var th = ((x + 0.5) / W - 0.5) * 2 * Math.PI;
        paint(cp * Math.cos(th), sp, cp * Math.sin(th), c, P);
        var d = (dstRow + x) * 4;
        out[d] = toHalf(c[0]); out[d + 1] = toHalf(c[1]); out[d + 2] = toHalf(c[2]); out[d + 3] = one;
      }
    }
    return makeEquirect(T, upsample2(out, W, H), W * 2, H * 2);
  }
  // 2x upsample of an RGBA half-float image that interpolates the raw bit patterns: for positive
  // halves those are monotonic, so every new texel lies between its neighbours (no float round trip).
  function upsample2(s, W, H) {
    var W2 = W * 2, o = new Uint16Array(W2 * H * 2 * 4);
    for (var y = 0; y < H; y++) {
      var y1 = Math.min(H - 1, y + 1);
      for (var x = 0; x < W; x++) {
        var x1 = (x + 1) % W, a = (y * W + x) * 4, b = (y * W + x1) * 4, c = (y1 * W + x) * 4, d = (y1 * W + x1) * 4;
        var o0 = (2 * y * W2 + 2 * x) * 4, o1 = o0 + 4, o2 = o0 + W2 * 4, o3 = o2 + 4;
        for (var k = 0; k < 4; k++) {
          var A = s[a + k], B = s[b + k], C = s[c + k];
          o[o0 + k] = A; o[o1 + k] = (A + B + 1) >> 1; o[o2 + k] = (A + C + 1) >> 1; o[o3 + k] = (A + B + C + s[d + k] + 2) >> 2;
        }
      }
    }
    return o;
  }

  // page-wide caches (CPU side only; every renderer builds its own PMREM)
  var HDR_FETCH = {}, PREPARING = {}, PREPARED = {}, PROCEDURAL = {};
  function prepareHDRI(T, which) {
    if (PREPARING[which]) return PREPARING[which];
    var cfg = ENVIRONMENTS[which], url = ASSET_BASE + cfg.hdri;
    return (PREPARING[which] = assetsUsable().then(function (ok) {
      if (!ok) throw new Error('assets unavailable here');
      return HDR_FETCH[url] || (HDR_FETCH[url] = fetch(url).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
        return r.arrayBuffer();
      }));
    }).then(function (buf) {
      // parse + process in short slices (no long task), then hand the finished equirect over
      var st = {}, steps = parseRGBESteps(buf, st);
      steps.push(function () { Array.prototype.push.apply(steps, processHDRSteps(T, st, cfg)); });
      return job(steps).promise.then(function (J) {
        st.result.sun.processMs = Math.round(J.ms);
        return (PREPARED[which] = st.result);
      });
    }));
  }

  function buildEnvironment(T, renderer, which, onReady, useAssets) {
    which = envName(which);
    var cfg = ENVIRONMENTS[which], pm = new T.PMREMGenerator(renderer), rt = null, dead = false;
    var env = { which: which, texture: null, sun: null, hdr: false, ready: null, dispose: dispose };
    function use(src, sun, hdr) {
      var next = pm.fromEquirectangular(src);
      src.dispose();                        // frees this renderer's GPU copy; the CPU data stays cached
      if (rt) rt.dispose();
      rt = next; env.texture = rt.texture; env.sun = sun; env.hdr = hdr;
    }
    function done() { if (pm) { pm.dispose(); pm = null; } }
    var wantHDR = cfg.hdri && useAssets !== false;
    if (wantHDR && PREPARED[which]) { use(PREPARED[which].texture, PREPARED[which].sun, true); done(); env.ready = Promise.resolve(true); }
    else {
      use(PROCEDURAL[which] || (PROCEDURAL[which] = proceduralEquirect(T, which)), null, false);
      if (!wantHDR) { done(); env.ready = Promise.resolve(false); }
      else env.ready = prepareHDRI(T, which).then(function (p) {
        if (dead) return false;
        use(p.texture, p.sun, true); done();
        if (onReady) onReady(env);
        return true;
      }, function () { if (!dead) done(); return false; });
    }
    function dispose() { dead = true; if (rt) rt.dispose(); rt = null; done(); }
    return env;
  }

  // Shadow softness: PCF-soft's bilinear 3×3 filter gives a ~2.5-texel penumbra, and the frustum is
  // fitted to the model, so the map size sets the penumbra in MODEL units (identical at any root
  // scale, on any device). Small maps = soft sun shadows for free; see ENVIRONMENTS[x].shadowMap.
  function buildLightRig(T, scene, which, sunInfo) {
    var size = 0;
    var light = new T.DirectionalLight(0xffffff, 1);
    light.name = 'sun';
    light.castShadow = true;
    scene.add(light, light.target);
    var dir = new T.Vector3(0, 1, 0), bx = new T.Vector3(), by = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    var sph = new T.Sphere(), part = new T.Sphere(), ctr = new T.Vector3();
    var lastModel = null, lastR = -1;
    function setSun(info, w) {
      which = envName(w || which);
      var cfg = ENVIRONMENTS[which], s = cfg.sun, d = sunDirArray(s.azimuth, s.elevation);
      dir.set(d[0], d[1], d[2]).normalize();
      bx.crossVectors(up, dir).normalize(); by.crossVectors(dir, bx);   // = the shadow camera's lookAt basis
      var col = s.color || (info && info.color) || [1, 1, 1];
      light.color.setRGB(col[0], col[1], col[2]);
      light.intensity = s.intensity;
      var n = cfg.shadowMap || 320;
      if (n !== size) {
        size = n; light.shadow.mapSize.set(n, n);
        if (light.shadow.map) { light.shadow.map.dispose(); light.shadow.map = null; }   // re-created at the new size
      }
      lastR = -1;
    }
    setSun(sunInfo, which);
    function fitShadow(model) {
      if (!model) return;
      if (model !== lastModel) {
        lastModel = model;
        model.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      }
      model.updateWorldMatrix(true, true);
      sph.makeEmpty();
      model.traverse(function (o) {
        if (!o.isMesh || !o.visible) return;
        var g = o.geometry;
        if (!g.boundingSphere) g.computeBoundingSphere();
        part.copy(g.boundingSphere).applyMatrix4(o.matrixWorld);
        sph.union(part);
      });
      if (sph.isEmpty() || !(sph.radius > 0)) return;
      // stable size (1/8-octave steps) and texel-snapped centre: no crawling edges while spinning
      var r = Math.pow(2, Math.ceil(Math.log2(sph.radius * 1.03 + 1e-4) * 8) / 8);
      var texel = 2 * r / size;
      var u = Math.round(sph.center.dot(bx) / texel) * texel, v = Math.round(sph.center.dot(by) / texel) * texel;
      ctr.copy(bx).multiplyScalar(u).addScaledVector(by, v).addScaledVector(dir, sph.center.dot(dir));
      var dist = r * 2 + 1;
      light.target.position.copy(ctr);
      light.position.copy(ctr).addScaledVector(dir, dist);
      if (r !== lastR) {
        lastR = r;
        var cam = light.shadow.camera;
        cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r;
        cam.near = dist - r * 1.1; cam.far = dist + r * 1.1;
        cam.updateProjectionMatrix();
        light.shadow.normalBias = texel * 1.4;                    // world units
        light.shadow.bias = -0.6 * texel / (cam.far - cam.near);  // normalised depth
      }
    }
    function dispose() { scene.remove(light, light.target); light.dispose(); }
    return { sun: light, lights: [light], setSun: setSun, fitShadow: fitShadow, dispose: dispose };
  }
  // ══ end LIGHTING ═══════════════════════════════════════════════════════════════════════════

  // ══ LOLLIPOP ═════════════════════════════════════════════════════════════════════════════════════
  // ── lollipop: materials ────────────────────────────────────────────────
  var LOLLY = { R: 1.33, CY: 1.5, SR: 0.13, TOP: 0.6, BOT: -2.8, SEG: 192, RINGS: 144 };

  // Surface tuning per preset. rough/spots/streaks/rmin/rmax: roughness = rough + spots*S + streaks*K
  // (S, K from the CC0 Surface Imperfections maps); nrm: micro-normal strength; sss: wrap light at the
  // terminator (light scattering in the sugar); alb: colour-density variation along the pour streaks;
  // E: emissive (near zero; 04-prism needs it non-zero).
  // (sss is calibrated against the lighting rig's cut-out sun, ~4.4 at midday)
  var PRESETS = {
    gloss:      { rough: 0.05, spots: 0.18, streaks: 0.10, rmin: 0.04, rmax: 0.38, nrm: 0.85, sss: 0.1, alb: 0.22, E: 0.03, env: 1.0 },
    jewel:      { rough: 0.03, spots: 0.08, streaks: 0.06, rmin: 0.02, rmax: 0.22, nrm: 0.6, sss: 0.0, alb: 0.18, E: 0.04, env: 1.15 },
    iridescent: { rough: 0.07, spots: 0.14, streaks: 0.08, rmin: 0.05, rmax: 0.34, nrm: 0.7, sss: 0.08, alb: 0.18, E: 0.03, env: 1.1 },
    satin:      { rough: 0.34, spots: 0.16, streaks: 0.10, rmin: 0.25, rmax: 0.62, nrm: 0.45, sss: 0.09, alb: 0.2, E: 0.03, env: 1.0 }
  };
  var TRI = { spots: 0.42, streaks: 0.29 };                 // triplanar tiles per object unit
  var SEAM = { n: [0.766, 0, 0.643], w: 0.012, slope: 0.13 }; // mould seam: plane through the stick axis
  // glued edge of the rolled paper: at object azimuth 0, where the paper's UV seam also sits; the stick
  // mesh is turned by `turn` so the edge shows front-left at rest
  var PAPER = { w: 0.035, slope: 0.35, dark: 0.10, turn: -2.0, aroundTiles: 0.5, normal: 1.3 };

  // 1x1 neutral maps until the real ones load. One set PER RENDERER (build() owns it and disposes it):
  // a texture shared by several renderers keeps every one of them reachable through its dispose
  // listeners, so disposed candies could never be garbage-collected (and leaked WebGL contexts).
  function neutral(T) {
    function px(r, g, b, srgb) {
      var t = new T.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1);
      t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace;
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.needsUpdate = true;
      return t;
    }
    var set = { black: px(0, 0, 0), flat: px(128, 128, 255), white: px(255, 255, 255, true), grey: px(255, 255, 255) };
    set.dispose = function () { ['black', 'flat', 'white', 'grey'].forEach(function (k) { set[k].dispose(); }); };
    return set;
  }

  var GLSL_AO_VERT_PARS = '\nattribute float gloAO;\nvarying float vGloAO;\nvarying vec3 vGloP;\nvarying vec3 vGloN;\n';
  var GLSL_AO_VERT = '\nvGloAO = gloAO;\nvGloP = transformed;\nvGloN = objectNormal;\n';
  // baked AO darkens indirect light only (as three's aoMap does); direct sun keeps its real shadow
  var GLSL_AO_FRAG = [
    '{',
    '  float gAo = vGloAO;',
    '  reflectedLight.indirectDiffuse *= gAo;',
    '  #if defined( USE_SHEEN )',
    '  sheenSpecularIndirect *= gAo;',
    '  #endif',
    '  #if defined( USE_ENVMAP ) && defined( STANDARD )',
    '  float gNV = saturate( dot( geometryNormal, geometryViewDir ) );',
    '  reflectedLight.indirectSpecular *= computeSpecularOcclusion( gNV, gAo, material.roughness );',
    '  #endif',
    '}'
  ].join('\n');

  // The candy shader also carries the bite attribute natively (gloBite = fresh fracture, crater
  // occlusion, stress-white halo; written by the interaction), so patchBiteMaterial skips it.
  function patchCandy(mat, u) {
    // geometry without the attributes (the collar, foreign meshes): unoccluded, unbitten
    mat.defaultAttributeValues = { gloAO: [1], gloBite: [0, 0, 0] };
    mat.userData.gloBite = true;
    mat.customProgramCacheKey = function () { return 'glo-candy-v3b'; };
    mat.onBeforeCompile = function (sh) {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>' + GLSL_AO_VERT_PARS + 'attribute vec3 gloBite;\nvarying vec3 vGloBite;\n')
        .replace('#include <project_vertex>', '#include <project_vertex>' + GLSL_AO_VERT + 'vGloBite = gloBite;\n');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <color_fragment>', [
          '#include <color_fragment>',
          'diffuseColor.rgb = mix( diffuseColor.rgb, pow( diffuseColor.rgb, vec3( 1.35 ) ), vGloBite.x );',   // fresh fracture: the deeper, denser interior
          'diffuseColor.rgb = mix( diffuseColor.rgb, mix( diffuseColor.rgb, vec3( 1.0, 0.96, 0.98 ), 0.5 ), vGloBite.z * 0.55 );'   // stress-white rim
        ].join('\n'))
        .replace('#include <common>', [
          '#include <common>',
          'varying float vGloAO;', 'varying vec3 vGloP;', 'varying vec3 vGloN;', 'varying vec3 vGloBite;',
          'uniform sampler2D gloSpots;', 'uniform sampler2D gloStreaks;', 'uniform sampler2D gloNormal;',
          'uniform vec4 gloTex;', 'uniform vec4 gloRough;', 'uniform vec4 gloSeam;', 'uniform float gloSeamW;', 'uniform float gloAlb;',
          '#ifndef USE_NORMALMAP_OBJECTSPACE', 'uniform mat3 normalMatrix;', '#endif',
          'vec4 gloTri( sampler2D s, vec3 p, vec3 w ) {',
          '  return texture2D( s, p.zy ) * w.x + texture2D( s, p.xz ) * w.y + texture2D( s, p.xy ) * w.z;',
          '}'
        ].join('\n'))
        // triplanar (object space: no UV poles, follows the candy when it spins or squashes)
        .replace('#include <roughnessmap_fragment>', [
          'vec3 gN = normalize( vGloN );',
          'vec3 gW = pow( abs( gN ), vec3( 4.0 ) );',
          'gW /= ( gW.x + gW.y + gW.z );',
          'float gSp = smoothstep( 0.08, 0.55, gloTri( gloSpots, vGloP * gloTex.x, gW ).g );',
          'float gSt = gloTri( gloStreaks, vGloP * gloTex.y + vec3( 0.37, 0.11, 0.53 ), gW ).g;',
          'diffuseColor.rgb *= 1.0 - gloAlb * ( gSt - 0.2 ) * ( 1.0 - vGloBite.x );',   // denser sugar along the pour streaks
          'float roughnessFactor = clamp( roughness + gloRough.x * gSp + gloRough.y * gSt, gloRough.z, gloRough.w );',
          'roughnessFactor = mix( roughnessFactor, 0.07, vGloBite.x );',        // a fresh fracture is glassy
          'roughnessFactor = mix( roughnessFactor, 0.4, vGloBite.z * 0.25 );'
        ].join('\n'))
        .replace('#include <normal_fragment_maps>', [
          '#include <normal_fragment_maps>',
          '{',
          '  vec3 gq = vGloP * gloTex.x;',
          '  vec3 tX = texture2D( gloNormal, gq.zy ).xyz * 2.0 - 1.0;',
          '  vec3 tY = texture2D( gloNormal, gq.xz ).xyz * 2.0 - 1.0;',
          '  vec3 tZ = texture2D( gloNormal, gq.xy ).xyz * 2.0 - 1.0;',
          '  float gNs = gloTex.z * ( 1.0 - 0.7 * vGloBite.x );',            // the fracture is smoother than the skin
          '  tX.xy *= gNs; tY.xy *= gNs; tZ.xy *= gNs;',
          '  tX = vec3( tX.xy + gN.zy, abs( tX.z ) * gN.x );',      // whiteout blend
          '  tY = vec3( tY.xy + gN.xz, abs( tY.z ) * gN.y );',
          '  tZ = vec3( tZ.xy + gN.xy, abs( tZ.z ) * gN.z );',
          '  vec3 gNo = normalize( tX.zyx * gW.x + tY.xzy * gW.y + tZ.xyz * gW.z );',
          '  float gd = dot( vGloP, gloSeam.xyz );',                // mould seam: a faint ridge
          '  float gw = gloSeamW;',
          '  #if __VERSION__ >= 300',
          '  gw = max( gw, fwidth( gd ) * 1.5 );',
          '  #endif',
          '  float gk = gd / gw;',
          '  gNo = normalize( gNo + ( 1.0 - vGloBite.x ) * gloSeam.w * ( gloSeamW / gw ) * 2.0 * gk * exp( -gk * gk ) * gloSeam.xyz );',
          '  normal = normalize( normalMatrix * gNo );',
          '}'
        ].join('\n'))
        .replace('#include <aomap_fragment>', [
          '#include <aomap_fragment>',
          GLSL_AO_FRAG,
          '{',                                                          // bite crater: depth occlusion
          '  float gOcc = 1.0 - vGloBite.y;',
          '  reflectedLight.indirectDiffuse *= gOcc;',
          '  reflectedLight.indirectSpecular *= mix( 1.0, gOcc, 0.7 );',
          '  reflectedLight.directDiffuse *= mix( 1.0, gOcc, 0.5 );',
          '}',
          '#if NUM_DIR_LIGHTS > 0',
          'if ( gloTex.w > 0.0 ) {',                                  // light scattering through the sugar
          '  float gNL = dot( geometryNormal, directionalLights[ 0 ].direction );',
          '  float gWrap = saturate( ( gNL + 0.5 ) / 1.5 ) - saturate( gNL );',
          '  reflectedLight.indirectDiffuse += gloTex.w * gWrap * vGloAO * vGloAO * directionalLights[ 0 ].color * material.diffuseColor * material.diffuseColor;',
          '}',
          '#endif'
        ].join('\n'));
    };
  }

  function patchStick(mat, u) {
    mat.defaultAttributeValues = { gloAO: [1] };
    mat.customProgramCacheKey = function () { return 'glo-stick-v3'; };
    mat.onBeforeCompile = function (sh) {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>' + GLSL_AO_VERT_PARS)
        .replace('#include <project_vertex>', '#include <project_vertex>' + GLSL_AO_VERT);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', [
          '#include <common>',
          'varying float vGloAO;', 'varying vec3 vGloP;', 'varying vec3 vGloN;',
          'uniform vec4 gloPaper;',   // y: half-width (rad), z: groove slope, w: darkening
          '#ifndef USE_NORMALMAP_OBJECTSPACE', 'uniform mat3 normalMatrix;', '#endif'
        ].join('\n'))
        .replace('#include <roughnessmap_fragment>', [
          '#include <roughnessmap_fragment>',
          'float gPh = atan( vGloP.z, vGloP.x );',
          'float gDa = mod( gPh + 3.14159265, 6.28318531 ) - 3.14159265;',
          'float gPw = 0.035;',
          '#if __VERSION__ >= 300',
          'gPw = max( gPw, fwidth( gDa ) * 1.5 );',
          '#endif',
          'float gSide = ( 1.0 - smoothstep( 0.25, 0.6, abs( normalize( vGloN ).y ) ) ) * ( 0.035 / gPw );',
          'float gK = gDa / gPw;',
          'float gG = exp( -gK * gK ) * gSide;',
          'diffuseColor.rgb *= 1.0 - gloPaper.w * gG;'
        ].join('\n'))
        .replace('#include <normal_fragment_maps>', [
          '#include <normal_fragment_maps>',
          '{',
          '  vec3 gT = normalize( normalMatrix * vec3( -sin( gPh ), 0.0, cos( gPh ) ) );',
          '  normal = normalize( normal - gloPaper.z * 2.0 * gK * gG * gT );',
          '}'
        ].join('\n'))
        .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + GLSL_AO_FRAG);
    };
  }

  function lollipopMaterials(T, preset, hex, assets) {
    if (preset === 'glass') preset = 'jewel';
    // placeholders: the renderer's own set (assets.ph, from build()), else a set owned by these materials
    var own = !(assets && assets.ph), N = own ? neutral(T) : assets.ph;
    var P = PRESETS[preset] || PRESETS.gloss, c = new T.Color(hex);
    var o = {
      color: c.clone(), emissive: c.clone(), emissiveIntensity: P.E, metalness: 0,
      roughness: P.rough, ior: 1.5, specularIntensity: 1, envMapIntensity: P.env
    };
    if (preset === 'jewel') {
      Object.assign(o, { transmission: 0.9, thickness: 1.6, ior: 1.42, attenuationColor: c.clone(), attenuationDistance: 1.3 });
    } else if (preset === 'iridescent') {
      Object.assign(o, { iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [120, 980],
        sheen: 0.3, sheenRoughness: 0.4, sheenColor: new T.Color(0xdff1ff) });
    } else if (preset === 'satin') {
      // a soft, broad sheen (0.8 / 0.5 bleached half the ball under the midday sun)
      Object.assign(o, { sheen: 0.3, sheenRoughness: 0.8, sheenColor: new T.Color(0xffffff) });
    }
    var candy = new T.MeshPhysicalMaterial(o);
    var cu = {
      gloSpots: { value: N.black }, gloStreaks: { value: N.black }, gloNormal: { value: N.flat },
      gloTex: { value: new T.Vector4(TRI.spots, TRI.streaks, P.nrm, P.sss) },
      gloRough: { value: new T.Vector4(P.spots, P.streaks, P.rmin, P.rmax) },
      gloSeam: { value: new T.Vector4(SEAM.n[0], SEAM.n[1], SEAM.n[2], SEAM.slope) },
      gloSeamW: { value: SEAM.w },
      gloAlb: { value: P.alb }
    };
    patchCandy(candy, cu);
    candy._glo = cu;

    var stick = new T.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.9, metalness: 0, envMapIntensity: 1.0,
      map: N.white, roughnessMap: N.grey, normalMap: N.flat, normalScale: new T.Vector2(PAPER.normal, PAPER.normal)
    });
    var su = { gloPaper: { value: new T.Vector4(0, PAPER.w, PAPER.slope, PAPER.dark) } };
    patchStick(stick, su);
    stick._glo = su;
    if (own) candy.addEventListener('dispose', function () { N.dispose(); });

    var mats = { candy: candy, stick: stick, preset: preset };
    applyLollipopAssets(mats, assets);
    return mats;
  }

  // Swap the real maps in for the 1x1 placeholders (same slots and colour spaces -> no recompile).
  function applyLollipopAssets(mats, assets) {
    var t = assets && assets.tex;
    if (!t || !mats) return;
    var u = mats.candy._glo, s = mats.stick;
    if (t.smudge_spots) u.gloSpots.value = t.smudge_spots;
    if (t.smudge_streaks) u.gloStreaks.value = t.smudge_streaks;
    if (t.smudge_spots_normal) u.gloNormal.value = t.smudge_spots_normal;
    if (t.paper_color) s.map = t.paper_color;
    if (t.paper_rough) s.roughnessMap = t.paper_rough;
    if (t.paper_normal) s.normalMap = t.paper_normal;
  }

  // ── lollipop: baked ambient occlusion ──────────────────────────────────
  function hemiDirs(n) {                         // cosine-weighted Fibonacci hemisphere, z up
    var out = new Float32Array(n * 3), ga = Math.PI * (3 - Math.sqrt(5));
    for (var k = 0; k < n; k++) {
      var u = (k + 0.5) / n, r = Math.sqrt(u), a = k * ga;
      out[k * 3] = r * Math.cos(a); out[k * 3 + 1] = r * Math.sin(a); out[k * 3 + 2] = Math.sqrt(1 - u);
    }
    return out;
  }
  function occDist(o, px, py, pz) {              // signed distance to an occluder
    if (o.sphere) return Math.hypot(px - o.sphere[0], py - o.sphere[1], pz - o.sphere[2]) - o.r;
    var ax = o.a[0], ay = o.a[1], az = o.a[2], bx = o.b[0] - ax, by = o.b[1] - ay, bz = o.b[2] - az;
    var t = clamp(((px - ax) * bx + (py - ay) * by + (pz - az) * bz) / (bx * bx + by * by + bz * bz), 0, 1);
    return Math.hypot(px - ax - bx * t, py - ay - by * t, pz - az - bz * t) - o.r;
  }
  function occHit(o, ox, oy, oz, dx, dy, dz) {    // ray distance to an occluder, -1 = miss
    var b, c, h;
    if (o.sphere) {
      var px = ox - o.sphere[0], py = oy - o.sphere[1], pz = oz - o.sphere[2];
      b = px * dx + py * dy + pz * dz; c = px * px + py * py + pz * pz - o.r * o.r;
      if (c < 0) return 0;
      h = b * b - c;
      if (h < 0 || b > 0) return -1;
      return -b - Math.sqrt(h);
    }
    // capsule (after Inigo Quilez)
    var bax = o.b[0] - o.a[0], bay = o.b[1] - o.a[1], baz = o.b[2] - o.a[2];
    var oax = ox - o.a[0], oay = oy - o.a[1], oaz = oz - o.a[2];
    var baba = bax * bax + bay * bay + baz * baz, bard = bax * dx + bay * dy + baz * dz;
    var baoa = bax * oax + bay * oay + baz * oaz, rdoa = dx * oax + dy * oay + dz * oaz;
    var oaoa = oax * oax + oay * oay + oaz * oaz, r2 = o.r * o.r;
    var A = baba - bard * bard;
    b = baba * rdoa - baoa * bard; c = baba * oaoa - baoa * baoa - r2 * baba;
    h = b * b - A * c;
    if (A > 1e-9 && h >= 0) {
      var t = (-b - Math.sqrt(h)) / A, y = baoa + t * bard;
      if (y > 0 && y < baba) return t >= 0 ? t : -1;
    }
    var cx, cy, cz, yy = baoa + ((A > 1e-9 && h >= 0) ? (-b - Math.sqrt(h)) / A : 0) * bard;
    if (yy <= 0) { cx = oax; cy = oay; cz = oaz; } else { cx = ox - o.b[0]; cy = oy - o.b[1]; cz = oz - o.b[2]; }
    b = dx * cx + dy * cy + dz * cz; c = cx * cx + cy * cy + cz * cz - r2;
    h = b * b - c;
    if (h > 0) { var tc = -b - Math.sqrt(h); return tc >= 0 ? tc : -1; }
    return -1;
  }
  // Per-vertex AO from analytic occluders: cosine-weighted rays, soft distance falloff.
  // Vertices inside an occluder (hidden contact zones) get o.inside (default 0.3) so the visible crease
  // blends dark, yet anything a deep bite ever exposes is shaded, never pure black.
  function bakeAO(pos, nrm, occ, o) {
    o = o || {};
    var N = o.rays || 48, D = o.dist || 1.2, S = o.strength == null ? 1 : o.strength, eps = o.eps || 0.004;
    var IN = o.inside == null ? 0.3 : o.inside;
    var dirs = hemiDirs(N), n = pos.length / 3, out = new Float32Array(n);
    for (var i = 0; i < n; i++) {
      var px = pos[i * 3], py = pos[i * 3 + 1], pz = pos[i * 3 + 2];
      var nx = nrm[i * 3], ny = nrm[i * 3 + 1], nz = nrm[i * 3 + 2];
      var near = false, inside = false;
      for (var k = 0; k < occ.length; k++) {
        var d = occDist(occ[k], px, py, pz);
        if (d < -0.001) inside = true;
        if (d < D) near = true;
      }
      if (inside) { out[i] = IN; continue; }
      if (!near) { out[i] = 1; continue; }
      var tx, ty, tz;
      if (Math.abs(ny) < 0.99) { tx = nz; ty = 0; tz = -nx; } else { tx = 0; ty = -nz; tz = ny; }
      var tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      var bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx;
      var ox = px + nx * eps, oy = py + ny * eps, oz = pz + nz * eps, acc = 0;
      for (var r = 0; r < N; r++) {
        var a = dirs[r * 3], b = dirs[r * 3 + 1], c = dirs[r * 3 + 2];
        var dx = tx * a + bx * b + nx * c, dy = ty * a + by * b + ny * c, dz = tz * a + bz * b + nz * c;
        var tmin = D;
        for (var q = 0; q < occ.length; q++) {
          var t = occHit(occ[q], ox, oy, oz, dx, dy, dz);
          if (t >= 0 && t < tmin) tmin = t;
        }
        if (tmin < D) acc += 1 - tmin / D;
      }
      out[i] = clamp(1 - S * acc / N, 0, 1);
    }
    return out;
  }
  // Same bake for a lathe-like mesh (rows of `cols` vertices around the y axis) whose occluders all sit
  // on the y axis: the AO is the same all the way round, so one vertex per row is baked and copied
  // along its row (the ball: 145 bakes instead of 28k; it was the main cost of the first lollipop).
  function bakeAORows(arr, cols, occ, o) {
    var rows = arr.position.length / 3 / cols, P = new Float32Array(rows * 3), Nn = new Float32Array(rows * 3);
    for (var r = 0; r < rows; r++) for (var a = 0; a < 3; a++) { P[r * 3 + a] = arr.position[r * cols * 3 + a]; Nn[r * 3 + a] = arr.normal[r * cols * 3 + a]; }
    var one = bakeAO(P, Nn, occ, o), out = new Float32Array(rows * cols);
    for (r = 0; r < rows; r++) out.fill(one[r], r * cols, (r + 1) * cols);
    return out;
  }

  // ── lollipop: geometry ─────────────────────────────────────────────────
  // Hand-poured, die-pressed ball: a little out of round, slightly oblate; exact near the stick so
  // the collar meets it cleanly.
  function ballShape(x, y, z) {
    return 0.0042 * Math.sin(2.3 * x + 1.1 * y + 0.4)
         + 0.0036 * Math.sin(1.9 * z - 2.1 * x + 2.2)
         + 0.0030 * Math.sin(2.7 * y + 1.3 * z + 4.1)
         + 0.0011 * Math.sin(6.1 * x + 4.3 * z - 3.1 * y + 0.9)
         + 0.0009 * Math.sin(5.3 * z - 6.2 * y + 1.7 * x + 2.6)
         - 0.005 * (y * y - 0.333);
  }

  function ballArrays(T) {
    var S = LOLLY.SEG, Rn = LOLLY.RINGS, R = LOLLY.R;
    var geo = new T.SphereGeometry(1, S, Rn);
    var p = geo.attributes.position;
    for (var i = 0; i < p.count; i++) {
      var x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      var r = R * (1 + smooth(-0.97, -0.78, y) * ballShape(x, y, z));
      p.setXYZ(i, x * r, y * r, z * r);
    }
    geo.computeVertexNormals();
    var nr = geo.attributes.normal, row = S + 1;
    for (var iy = 0; iy <= Rn; iy++) {          // weld the UV seam and the poles
      var a = iy * row, b = a + S;
      if (iy === 0 || iy === Rn) {
        var sx = 0, sy = 0, sz = 0;
        for (var j = 0; j <= S; j++) { sx += nr.getX(a + j); sy += nr.getY(a + j); sz += nr.getZ(a + j); }
        var l = Math.hypot(sx, sy, sz) || 1;
        for (j = 0; j <= S; j++) nr.setXYZ(a + j, sx / l, sy / l, sz / l);
      } else {
        var mx = nr.getX(a) + nr.getX(b), my = nr.getY(a) + nr.getY(b), mz = nr.getZ(a) + nr.getZ(b);
        var ml = Math.hypot(mx, my, mz) || 1;
        nr.setXYZ(a, mx / ml, my / ml, mz / ml); nr.setXYZ(b, mx / ml, my / ml, mz / ml);
      }
    }
    var out = { position: p.array.slice(), normal: nr.array.slice(), uv: geo.attributes.uv.array.slice(), index: geo.index.array.slice() };
    geo.dispose();
    return out;
  }

  // Lathe-style ring mesh from a per-azimuth profile fn(phi) -> [[r, y, nr, ny, v], ...].
  function ringMesh(seg, profileAt) {
    var cols = seg + 1, prof0 = profileAt(0), rows = prof0.length;
    var pos = new Float32Array(cols * rows * 3), nrm = new Float32Array(cols * rows * 3), uv = new Float32Array(cols * rows * 2);
    for (var j = 0; j < cols; j++) {
      var phi = (j / seg) * Math.PI * 2, cs = Math.cos(phi), sn = Math.sin(phi);
      var prof = j === seg ? prof0 : (j === 0 ? prof0 : profileAt(phi));
      for (var k = 0; k < rows; k++) {
        var q = prof[k], i = k * cols + j;
        pos[i * 3] = q[0] * cs; pos[i * 3 + 1] = q[1]; pos[i * 3 + 2] = q[0] * sn;
        nrm[i * 3] = q[2] * cs; nrm[i * 3 + 1] = q[3]; nrm[i * 3 + 2] = q[2] * sn;
        uv[i * 2] = j / seg; uv[i * 2 + 1] = q[4];
      }
    }
    var idx = [];
    for (var kk = 0; kk < rows - 1; kk++) {
      for (var jj = 0; jj < seg; jj++) {
        var a = kk * cols + jj, b = (kk + 1) * cols + jj, c = kk * cols + jj + 1, d = (kk + 1) * cols + jj + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
    return { position: pos, normal: nrm, uv: uv, index: new Uint32Array(idx), cols: cols };
  }

  // The candy "collar": the fillet of sugar where the ball grips the stick (ball-local coordinates).
  // Per azimuth a circle tangent to the ball that meets the stick at a small contact angle (like a
  // meniscus, and with no depth fight against the paper); its radius wanders a little.
  function collarArrays() {
    var R = LOLLY.R, rs = LOLLY.SR, A = 14, kap = 0.92, a0 = Math.acos(kap);
    return ringMesh(96, function (phi) {
      var rho = 0.13 * (1 + 0.2 * Math.sin(2 * phi + 0.7) + 0.08 * Math.sin(3 * phi + 2.1) + 0.05 * Math.sin(5 * phi + 4.0));
      var rc = rs + kap * rho, yc = -Math.sqrt((R + rho) * (R + rho) - rc * rc), aB = Math.atan2(-yc, rc);
      var pts = [], s0 = a0 - 0.5;
      pts.push([rc - rho * Math.cos(s0), yc + rho * Math.sin(s0), Math.cos(s0), -Math.sin(s0), 0]);
      for (var k = 0; k <= A; k++) {
        var a = (a0 - 0.06) + (aB - a0 + 0.06) * k / A;
        pts.push([rc - rho * Math.cos(a), yc + rho * Math.sin(a), Math.cos(a), -Math.sin(a), (k + 1) / (A + 3)]);
      }
      var bl = Math.hypot(rc, yc), br = rc / bl, by = yc / bl;  // ball normal at the tangent point
      pts.push([br * (R - 0.008), by * (R - 0.008), br, by, (A + 2) / (A + 3)]);
      pts.push([br * (R - 0.03), by * (R - 0.03), br, by, 1]);
      return pts;
    });
  }

  // Rolled-paper stick: flat end with a softly rounded edge; v in paper-tile units (fibres a touch
  // longer along the stick), u = exactly one tile around so the paper wraps seamlessly.
  function stickArrays() {
    var rs = LOLLY.SR, B = LOLLY.BOT, TOP = LOLLY.TOP, e = 0.032, rf = rs - e;
    var tile = 2 * Math.PI * rs / PAPER.aroundTiles * 1.25;     // fibres a touch longer along the stick
    var pts = [], s = 0, last = null;
    function add(r, y, nr, ny) {
      if (last) s += Math.hypot(r - last[0], y - last[1]);
      last = [r, y];
      pts.push([r, y, nr, ny, s / tile]);
    }
    for (var k = 0; k <= 4; k++) add(rf * k / 4, B, 0, -1);
    for (k = 1; k <= 9; k++) { var a = -Math.PI / 2 + (Math.PI / 2) * k / 9; add(rf + e * Math.cos(a), B + e + e * Math.sin(a), Math.cos(a), Math.sin(a)); }
    var y = B + e + 0.2;
    for (; y < TOP - 1.7; y += 0.26) add(rs, y, 1, 0);
    for (; y < TOP - 0.01; y += 0.055) add(rs, y, 1, 0);
    add(rs, TOP, 1, 0);
    add(rs, TOP, 0, 1); add(0, TOP, 0, 1);
    var m = ringMesh(48, function () { return pts; });
    for (var i = 0; i < m.uv.length; i += 2) m.uv[i] *= PAPER.aroundTiles;   // seam at azimuth 0 = glued edge
    return m;
  }

  var lollyCache = null;                         // geometry + AO are identical for every lollipop
  function lollipopArrays(T) {
    if (lollyCache) return lollyCache;
    var t0 = performance.now(), R = LOLLY.R, CY = LOLLY.CY, rs = LOLLY.SR;
    var ball = ballArrays(T), collar = collarArrays(), stick = stickArrays();
    // occluders in ball-local space (stick body, a conservative proxy of the collar) and stick space
    var stickL = { a: [0, LOLLY.BOT + rs - CY, 0], b: [0, LOLLY.TOP - CY, 0], r: rs };
    // proxy for the collar, used for the ball only: inside stick+collar wherever ball vertices are visible
    var collarL = { a: [0, -1.37, 0], b: [0, -1.33, 0], r: 0.15 };
    // ball and stick are lathes around the y axis with on-axis occluders: bake one vertex per ring
    ball.ao = bakeAORows(ball, LOLLY.SEG + 1, [stickL, collarL], { dist: 0.9, strength: 1.4 });
    collar.ao = bakeAO(collar.position, collar.normal, [{ sphere: [0, 0, 0], r: R }, stickL], { dist: 0.8, strength: 1.3 });
    stick.ao = bakeAORows(stick, stick.cols, [{ sphere: [0, CY, 0], r: R }], { dist: 1.6, strength: 1.5 });
    lollyCache = { ball: ball, collar: collar, stick: stick, ms: performance.now() - t0 };
    return lollyCache;
  }

  function toGeometry(T, a) {
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(a.position.slice(), 3));
    g.setAttribute('normal', new T.BufferAttribute(a.normal.slice(), 3));
    g.setAttribute('uv', new T.BufferAttribute(a.uv.slice(), 2));
    g.setAttribute('gloAO', new T.BufferAttribute(a.ao.slice(), 1));
    g.setIndex(new T.BufferAttribute(a.index.slice(), 1));
    g.computeBoundingSphere();
    return g;
  }

  function buildLollipop(T, mats, opts) {
    opts = opts || {};
    var A = lollipopArrays(T);
    var g = new T.Group();
    var tiltG = new T.Group();
    tiltG.rotation.z = opts.tilt == null ? 0.24 : opts.tilt;
    var cgeo = toGeometry(T, A.ball);
    cgeo.userData.origPositions = A.ball.position.slice();
    cgeo.userData.origNormals = A.ball.normal.slice();
    cgeo.userData.radius = LOLLY.R;
    var candy = new T.Mesh(cgeo, mats.candy);
    candy.position.y = LOLLY.CY;
    candy.castShadow = true;                     // the ball's own terminator does its self-shading
    var collar = new T.Mesh(toGeometry(T, A.collar), mats.candy);
    collar.castShadow = true; collar.receiveShadow = true;
    candy.add(collar);
    var stick = new T.Mesh(toGeometry(T, A.stick), mats.stick);
    stick.rotation.y = PAPER.turn;
    stick.castShadow = true; stick.receiveShadow = true;
    tiltG.add(candy, stick);
    g.add(tiltG);
    g.userData.kind = 'lollipop';
    g.userData.size = { w: 3.4, h: 6.0 };
    g.userData.candy = candy; g.userData.stick = stick; g.userData.collar = collar; g.userData.tilt = tiltG;
    g.userData.mats = mats; g.userData.mat = mats.candy;
    g.userData.bob = function (t) { tiltG.position.y = Math.sin(t * 0.72) * 0.05; };   // t in seconds
    return g;
  }

  // ══ GUMMIES ═══════════════════════════════════════════════════════════════════════════════════
  // ── sugar maps ────────────────────────────────────────────────────────────────────────────────
  // The CC0 "Candy 003" relief + roughness carry the source candy's diagonal ridges; a wrap-around
  // high-pass removes them and keeps only the sugar grain (tileable). Output, shared page-wide:
  //   hr: RGBA8  R = crystal height, G = roughness, B = crystal mask   -> material.bumpMap
  //   n : RGBA8  tangent-space normal (height relief + the asset's own normal detail) -> uSugarN
  var SUGAR = { real: null, realP: null, realJ: null, urgent: false, proc: null, procJ: null };
  // stand-in while the CC0 grains are still being made: plain soft gel (no crystals, no relief)
  var SUGAR_PENDING = (function () {
    var hr = new Uint8Array(64), n = new Uint8Array(64);
    for (var i = 0; i < 16; i++) { hr.set([128, 128, 0, 255], i * 4); n.set([128, 128, 255, 255], i * 4); }
    return { S: 4, hr: hr, n: n, nScale: 0, real: false, pending: true };
  })();

  // [a, b) ranges of 0..n as job steps
  function chunks(n, size, fn) {
    var out = [];
    for (var a = 0; a < n; a += size) out.push(fn.bind(null, a, Math.min(n, a + size)));
    return out;
  }
  // separable box blur with wrap-around (stays tileable): src -> out (via tmp), as row-chunk steps;
  // the vertical pass keeps a running sum per column, so it also walks memory row by row
  function blurSteps(src, out, tmp, S, r) {
    var inv = 1 / (2 * r + 1), add = new Int32Array(S), sub = new Int32Array(S), acc = new Float64Array(S);
    for (var i = 0; i < S; i++) { add[i] = (i + r + 1) % S; sub[i] = ((i - r) % S + S) % S; }
    return chunks(S, 64, function (y0, y1) {
      for (var y = y0; y < y1; y++) {
        var row = y * S, s = 0, k, x;
        for (k = -r; k <= r; k++) s += src[row + ((k % S) + S) % S];
        for (x = 0; x < S; x++) { tmp[row + x] = s * inv; s += src[row + add[x]] - src[row + sub[x]]; }
      }
    }).concat([function () {
      acc.fill(0);
      for (var k = -r; k <= r; k++) { var row = (((k % S) + S) % S) * S; for (var x = 0; x < S; x++) acc[x] += tmp[row + x]; }
    }], chunks(S, 64, function (y0, y1) {
      for (var y = y0; y < y1; y++) {
        var o = y * S, a = add[y] * S, b = sub[y] * S;
        for (var x = 0; x < S; x++) { out[o + x] = acc[x] * inv; acc[x] += tmp[a + x] - tmp[b + x]; }
      }
    }));
  }
  function highPassSteps(a, b, n) {          // a <- (a - b) / std, in place (b = tent blur of a)
    var s2 = 0;
    return chunks(n, 65536, function (i0, i1) { for (var i = i0; i < i1; i++) { var v = a[i] - b[i]; a[i] = v; s2 += v * v; } })
      .concat(chunks(n, 131072, function (i0, i1) { var k = 1 / (Math.sqrt(s2 / n) || 1); for (var i = i0; i < i1; i++) a[i] *= k; }));
  }
  function evenOutSteps(a, sq, v, tmp, S, r, amt) {   // soft local-contrast equalisation, in place
    var n = S * S;
    return chunks(n, 131072, function (i0, i1) { for (var i = i0; i < i1; i++) sq[i] = a[i] * a[i]; })
      .concat(blurSteps(sq, v, tmp, S, r))
      .concat(chunks(n, 65536, function (i0, i1) { for (var i = i0; i < i1; i++) a[i] /= (1 - amt) + amt * Math.sqrt(v[i] + 1e-4); }));
  }
  function packNormalRows(h, S, strength, extra, extraK, out, y0, y1) {   // height -> tangent normal (Sobel, wrap)
    for (var y = y0; y < y1; y++) {
      var yu = ((y - 1 + S) % S) * S, yc = y * S, yd = ((y + 1) % S) * S;
      for (var x = 0; x < S; x++) {
        var xl = (x - 1 + S) % S, xr = (x + 1) % S;
        var dx = (h[yu + xr] + 2 * h[yc + xr] + h[yd + xr]) - (h[yu + xl] + 2 * h[yc + xl] + h[yd + xl]);
        var dy = (h[yd + xl] + 2 * h[yd + x] + h[yd + xr]) - (h[yu + xl] + 2 * h[yu + x] + h[yu + xr]);
        var nx = -dx * strength / 8, ny = dy * strength / 8, i = (yc + x) * 4;
        if (extra) { nx += (extra[i] / 127.5 - 1) * extraK; ny += (extra[i + 1] / 127.5 - 1) * extraK; }
        var l = 1 / Math.sqrt(nx * nx + ny * ny + 1);
        out[i] = (nx * l * 0.5 + 0.5) * 255; out[i + 1] = (ny * l * 0.5 + 0.5) * 255; out[i + 2] = (l * 0.5 + 0.5) * 255; out[i + 3] = 255;
      }
    }
  }
  var SUGAR_P = { S: 1024, r: 6, even: 0.5, mixR: 0.6, strength: 2.0, nK: 0.35, nScale: 0.43 };

  // an image's pixels in row strips; the first strip throws if the image is unreadable (tainted)
  function readSteps(img, S, each) {
    var g = null;
    return [function () {
      var c = document.createElement('canvas'); c.width = c.height = S;
      g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, S, S);
    }].concat(chunks(S, 128, function (y0, y1) { each(g.getImageData(0, y0, S, y1 - y0).data, y0 * S, (y1 - y0) * S); }));
  }
  // CC0 sugar: high-pass relief + roughness (the source candy's ridges go, the grain stays), packed
  // to hr (R relief, G roughness, B crystal mask) and a tangent normal map. ~250 short steps.
  function sugarJobSteps(imgH, imgR, imgN, out) {
    var P = SUGAR_P, S = P.S, n = S * S;
    var A = new Float32Array(n), B = new Float32Array(n), C = new Float32Array(n), D = new Float32Array(n), TMP = new Float32Array(n);
    var Nimg = imgN ? new Uint8Array(n * 4) : null, hr = new Uint8Array(n * 4), nm = new Uint8Array(n * 4);
    function gray(dst) { return function (d, o, len) { for (var i = 0; i < len; i++) dst[o + i] = d[i * 4] / 255; }; }
    return [].concat(
      readSteps(imgH, S, gray(A)),
      readSteps(imgR, S, gray(B)),
      imgN ? readSteps(imgN, S, function (d, o) { Nimg.set(d, o * 4); }) : [],
      blurSteps(A, C, TMP, S, P.r), blurSteps(C, D, TMP, S, P.r), highPassSteps(A, D, n),   // A: relief grain
      evenOutSteps(A, C, D, TMP, S, 24, P.even),
      blurSteps(B, C, TMP, S, P.r), blurSteps(C, D, TMP, S, P.r), highPassSteps(B, D, n),   // B: roughness grain
      evenOutSteps(B, C, D, TMP, S, 24, P.even),
      chunks(n, 65536, function (i0, i1) {
        for (var i = i0; i < i1; i++) {
          var rel = C[i] = A[i] * (1 - P.mixR) + B[i] * P.mixR;                            // relief: grain + sugar bubbles
          hr[i * 4] = clamp(128 + rel * 40, 0, 255);
          hr[i * 4 + 1] = clamp(128 + B[i] * 46, 0, 255);
          hr[i * 4 + 2] = smooth(0.15, 1.4, B[i] * 0.6 + A[i] * 0.4) * 255;
          hr[i * 4 + 3] = 255;
        }
      }),
      chunks(S, 64, function (y0, y1) { packNormalRows(C, S, P.strength, Nimg, P.nK, nm, y0, y1); }),
      [function () { out.data = { S: S, hr: hr, n: nm, nScale: P.nScale, real: true }; }]
    );
  }
  // Procedural stand-in (file:// / assets off): little faceted crystals (square pyramids).
  function proceduralSugarSteps(out) {
    var S = 512, n = S * S, H = new Float32Array(n), r = rng(7), m = 0;
    var hr = new Uint8Array(n * 4), nm = new Uint8Array(n * 4);
    return chunks(7000, 350, function (k0, k1) {
      for (var k = k0; k < k1; k++) {
        var cx = Math.floor(r() * S), cy = Math.floor(r() * S), sz = 1.4 + r() * r() * 4.2, h = 0.35 + r() * 0.65;
        var a = r() * Math.PI, ca = Math.cos(a), sa = Math.sin(a), Rr = Math.ceil(sz * 1.45);
        for (var dy = -Rr; dy <= Rr; dy++) for (var dx = -Rr; dx <= Rr; dx++) {
          var u = (dx * ca + dy * sa) / sz, v = (-dx * sa + dy * ca) / sz, d = Math.max(Math.abs(u), Math.abs(v));
          if (d >= 1) continue;
          var id = (((cy + dy) % S + S) % S) * S + (((cx + dx) % S + S) % S), val = h * (1 - d);
          if (val > H[id]) H[id] = val;
        }
      }
    }).concat([function () { for (var i = 0; i < n; i++) m += H[i]; m /= n; }], chunks(n, 65536, function (i0, i1) {
      for (var i = i0; i < i1; i++) {
        hr[i * 4] = clamp(128 + (H[i] - m) * 260, 0, 255);
        hr[i * 4 + 1] = clamp(150 - H[i] * 120, 0, 255);
        hr[i * 4 + 2] = smooth(0.12, 0.5, H[i]) * 255;
        hr[i * 4 + 3] = 255;
      }
    }), chunks(S, 64, function (y0, y1) { packNormalRows(H, S, 9, null, 0, nm, y0, y1); }), [function () {
      out.data = { S: S, hr: hr, n: nm, nScale: 0.9, real: false };
    }]);
  }
  // the procedural crystals, made once per page: at idle when they can be foreseen (assets off), or
  // finished right now when a gummy needs them first (now = true)
  function procSugar(now) {
    if (SUGAR.proc) return SUGAR.proc;
    if (!SUGAR.procJ) {
      var out = {};
      SUGAR.procJ = job(proceduralSugarSteps(out), { idle: true });
      SUGAR.procJ.promise.then(function () { SUGAR.proc = out.data; });
      SUGAR.procJ.out = out;
    }
    if (now) { SUGAR.procJ.flush(); SUGAR.proc = SUGAR.procJ.out.data; }
    return SUGAR.proc;
  }
  function procSugarLater() {
    procSugar(false);
    return SUGAR.procJ.promise.then(function () { return SUGAR.procJ.out.data; });
  }
  function sugarSource(assets) {
    var tx = assets && (assets.tex || assets);
    return tx && tx.sugar_height && tx.sugar_rough && tx.sugar_height.image && tx.sugar_rough.image ? tx : null;
  }
  // The processed CC0 maps (once per page, in short idle slices; `urgent` = a gummy is waiting, so
  // keep going between frames instead of waiting for idle time). Resolves null if unavailable.
  function sugarLater(assets, urgent) {
    var tx = sugarSource(assets);
    if (!tx) return Promise.resolve(null);
    if (urgent) { SUGAR.urgent = true; if (SUGAR.realJ) SUGAR.realJ.hurry(); }
    if (!SUGAR.realP) {
      var out = {}, imgs = [tx.sugar_height.image, tx.sugar_rough.image, tx.sugar_normal && tx.sugar_normal.image];
      // decode off the main thread first, so drawing them into the canvas is a plain copy
      SUGAR.realP = Promise.all(imgs.map(function (im) { return im && im.decode ? im.decode().catch(function () {}) : null; }))
        .then(function () {
          SUGAR.realJ = job(sugarJobSteps(imgs[0], imgs[1], imgs[2], out), { idle: !SUGAR.urgent });
          return SUGAR.realJ.promise;
        })
        .then(function () { return (SUGAR.real = out.data); }, function () { SUGAR.real = false; return null; });
    }
    return SUGAR.realP;
  }
  function dataTex(T, data, S) {
    var t = new T.DataTexture(data, S, S, T.RGBAFormat, T.UnsignedByteType);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.magFilter = T.LinearFilter; t.minFilter = T.LinearMipmapLinearFilter; t.generateMipmaps = true;
    t.anisotropy = 8; t.colorSpace = T.NoColorSpace; t.needsUpdate = true;
    return t;
  }

  // ── material ──────────────────────────────────────────────────────────────────────────────────
  var GUMMY_VERT_PARS = [
    'attribute vec3 aTP;', 'attribute vec3 aGum;',
    'varying vec3 vTP;', 'varying vec3 vTN;', 'varying vec3 vGum;'
  ].join('\n');
  var GUMMY_FRAG_PARS = [
    'varying vec3 vTP;', 'varying vec3 vTN;', 'varying vec3 vGum;',
    'uniform sampler2D uSugarN;',
    'uniform float uSugarNS;',      // crystal relief strength
    'uniform float uSugarW;',       // how much the sugar frosts (whitens) the gel
    'uniform float uTexK;',         // crystal density multiplier (1.8: ~0.2-0.5 mm grains on a 2 cm gummy)
    'uniform vec3 uRough;',         // roughness: bare gel, sugar between crystals, crystal facets
    'uniform float uSpecK;',        // broad specular kept on frosted sugar (it is mostly diffuse)
    'uniform vec3 uBody;',          // gel colour: thin exponent, deep exponent, deep gain
    'uniform float uSSS;',          // sun light scattering through the jelly
    'uniform float uTrans;',        // environment light seen through thin gel
    'uniform vec4 uGlint;',         // sun glints: cells per tile, facet tilt, share of cells, sharpness
    'uniform float uGlintI;',
    '#ifndef USE_NORMALMAP_OBJECTSPACE',
    'uniform mat3 normalMatrix;',
    '#endif',
    'vec3 gHash3( vec2 p ) {',
    '  vec3 q = vec3( dot( p, vec2( 127.1, 311.7 ) ), dot( p, vec2( 269.5, 183.3 ) ), dot( p, vec2( 419.2, 371.9 ) ) );',
    '  return fract( sin( q ) * 43758.5453 );',
    '}'
  ].join('\n');
  var GUMMY_ROUGH = [
    // triplanar sugar, in the piece's own space so it sticks to the gummy as it turns
    'vec3 gN0 = normalize( vTN );',
    'vec3 gTW = pow( abs( gN0 ), vec3( 4.0 ) ); gTW /= ( gTW.x + gTW.y + gTW.z );',
    'vec3 gTP = vTP * uTexK;',
    'vec2 gUX = gTP.zy, gUY = gTP.xz, gUZ = gTP.xy;',
    'vec4 gHR = texture2D( bumpMap, gUX ) * gTW.x + texture2D( bumpMap, gUY ) * gTW.y + texture2D( bumpMap, gUZ ) * gTW.z;',
    'float gCoat = vGum.z;',
    'float gCrys = smoothstep( 0.3, 0.85, gHR.b );',                    // sugar crystals (white grains, glossy facets)
    'float gRS = mix( uRough.y, uRough.z, gCrys ) * mix( 0.8, 1.2, gHR.g );',
    'float roughnessFactor = roughness * mix( uRough.x, gRS, gCoat );',
    'float gVis = 1.0;',
    'float gGl = 0.0;'
  ].join('\n');
  var GUMMY_NORMAL = [
    '{',
    '  vec3 sX = texture2D( uSugarN, gUX ).xyz * 2.0 - 1.0;',
    '  vec3 sY = texture2D( uSugarN, gUY ).xyz * 2.0 - 1.0;',
    '  vec3 sZ = texture2D( uSugarN, gUZ ).xyz * 2.0 - 1.0;',
    '  float k = uSugarNS * mix( 0.2, 1.0, gCoat );',      // thin-coated patches are smoother
    '  sX.xy *= k; sY.xy *= k; sZ.xy *= k;',
    '  vec3 tX = vec3( sX.xy + gN0.zy, abs( sX.z ) * gN0.x );',   // whiteout blend
    '  vec3 tY = vec3( sY.xy + gN0.xz, abs( sY.z ) * gN0.y );',
    '  vec3 tZ = vec3( sZ.xy + gN0.xy, abs( sZ.z ) * gN0.z );',
    '  normal = normalize( normalMatrix * normalize( tX.zyx * gTW.x + tY.xzy * gTW.y + tZ.xyz * gTW.z ) );',
    '}'
  ].join('\n');
  var GUMMY_ALBEDO = [
    // jelly body: lighter where the light path through the gel is short, deeper where it is long
    '{',
    '  vec3 gV = normalize( vViewPosition );',
    '  float gNV = saturate( dot( nonPerturbedNormal, gV ) );',
    '  float gPath = smoothstep( 0.0, 1.0, vGum.y * ( 0.25 + 0.75 * gNV ) );',
    '  vec3 gBase = diffuseColor.rgb;',
    '  vec3 gBody = mix( pow( gBase, vec3( uBody.x ) ), pow( gBase, vec3( uBody.y ) ) * uBody.z, gPath );',
    '  float gFrost = gCoat * mix( 0.12, 1.0, gCrys );',    // sugar grains scatter white over the gel
    '  diffuseColor.rgb = mix( gBody, mix( gBody, vec3( 0.93 ), 0.6 ), gFrost * uSugarW );',
    '}'
  ].join('\n');
  var GUMMY_SSS = [
    '{',
    '  vec3 gGel = pow( diffuse, vec3( 1.2 ) );',
    '  #ifdef USE_ENVMAP',
    // the beach behind a thin edge shows through it, coloured by the gel
    '  reflectedLight.indirectDiffuse += getIBLIrradiance( -nonPerturbedNormal ) * BRDF_Lambert( gGel ) * ( 1.0 - vGum.y ) * uTrans;',
    '  #endif',
    '  #if NUM_DIR_LIGHTS > 0',
    '  vec3 gL = directionalLights[ 0 ].direction;',
    '  #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0',
    '    gVis = receiveShadow ? getShadow( directionalShadowMap[ 0 ], directionalLightShadows[ 0 ].shadowMapSize, directionalLightShadows[ 0 ].shadowBias, directionalLightShadows[ 0 ].shadowRadius, vDirectionalShadowCoord[ 0 ] ) : 1.0;',
    '  #endif',
    '  float gNL = dot( nonPerturbedNormal, gL );',
    '  float gWrap = max( 0.0, ( gNL + 0.55 ) / 1.55 ) - 0.8 * max( 0.0, gNL );',          // light scattered past the terminator
    '  float gBack = pow( saturate( dot( geometryViewDir, -gL ) ), 3.0 ) * ( 1.0 - vGum.y );', // sun shining through thin parts
    '  reflectedLight.directDiffuse += directionalLights[ 0 ].color * gGel * ( 0.5 * gWrap * mix( 0.35, 1.0, gVis ) + 0.9 * gBack ) * uSSS;',
    // sugar glints: each crystal cell has its own facet tilt and flashes when it mirrors the sun
    '  vec2 gC = ( gTW.x > gTW.y && gTW.x > gTW.z ) ? vTP.zy : ( gTW.y > gTW.z ? vTP.xz : vTP.xy );',   // fixed crystal grid (~0.4 mm)
    '  vec2 gq = gC * uGlint.x, gid = floor( gq ), gf = fract( gq ) - 0.5;',
    '  vec3 gh = gHash3( gid ), gh2 = gHash3( gid + 31.7 ), gh3 = gHash3( gid + 71.3 );',
    '  vec3 gFacet = normalize( normal + ( gh * 2.0 - 1.0 ) * uGlint.y );',
    // a small square facet, turned and sized at random inside its cell
    '  float ga = gh3.x * 6.2832; vec2 gr = mat2( cos( ga ), -sin( ga ), sin( ga ), cos( ga ) ) * ( gf - ( gh2.xy - 0.5 ) * 0.4 );',
    '  float gsz = mix( 0.07, 0.24, gh3.y * gh3.y );',
    '  float gSpot = 1.0 - smoothstep( gsz * 0.6, gsz, max( abs( gr.x ), abs( gr.y ) ) );',
    '  float gOn = step( 1.0 - uGlint.z, gh2.z ) * gCoat * mix( 0.3, 1.0, gh3.z ) * mix( 0.35, 1.0, gCrys );',
    '  float gFade = smoothstep( 0.75, 0.35, length( fwidth( gq ) ) );',  // no shimmer when cells get sub-pixel
    '  gGl = pow( saturate( dot( gFacet, normalize( gL + geometryViewDir ) ) ), uGlint.w ) * gSpot * gOn * gFade * gVis * saturate( gNL * 4.0 );',
    '  #endif',
    '}'
  ].join('\n');
  var GUMMY_AO = [
    '{',
    '  float gAO = vGum.x;',
    '  reflectedLight.indirectDiffuse *= gAO;',
    '  reflectedLight.indirectSpecular *= computeSpecularOcclusion( saturate( dot( geometryNormal, geometryViewDir ) ), gAO, material.roughness );',
    '  float gAOd = mix( 1.0, gAO, 0.55 );',               // creases where pieces touch: the sun can't get in either
    '  float gSK = mix( 1.0, uSpecK, gCoat );',
    '  reflectedLight.directDiffuse *= gAOd;',
    '  reflectedLight.directSpecular *= gAOd * gSK; reflectedLight.indirectSpecular *= gSK;',
    '  #ifdef USE_SHEEN',
    '  sheenSpecularIndirect *= gAO; sheenSpecularDirect *= gAOd;',
    '  #endif',
    '  #if NUM_DIR_LIGHTS > 0',
    '  reflectedLight.directSpecular += directionalLights[ 0 ].color * gGl * uGlintI;',
    '  #endif',
    '}'
  ].join('\n');

  function gummyMaterial(T, hex, assets) {
    var col = new T.Color(hex);
    var mat = new T.MeshPhysicalMaterial({
      color: col.clone(), emissive: col.clone(), emissiveIntensity: 0.02, metalness: 0,
      roughness: 1,                                    // multiplier; the shader derives the real value
      ior: 1.45, specularIntensity: 1, envMapIntensity: 0.85,
      sheen: 0, sheenRoughness: 0.5, sheenColor: new T.Color(0xffffff)
    });
    var U = {
      // frosted grain that whitens the gel a little less (uSugarW; uTexK 1.8 keeps it visible at 1x DPR),
      // lighter thin-edge gel (uTrans, uBody.x, uSSS), more crystal sparkle (uGlint.z, uGlintI):
      // sugared jelly rather than speckled pebbles
      uSugarN: { value: null }, uSugarNS: { value: 1 }, uSugarW: { value: 0.46 }, uTexK: { value: 1.8 },
      uRough: { value: new T.Vector3(0.14, 0.5, 0.18) }, uSpecK: { value: 0.3 },
      // uSSS / uGlintI are calibrated against the lighting rig's cut-out sun (~4.4 at midday)
      uBody: { value: new T.Vector3(0.68, 2.0, 0.65) }, uSSS: { value: 0.85 }, uTrans: { value: 1.25 },
      uGlint: { value: new T.Vector4(70, 0.8, 0.75, 150) }, uGlintI: { value: 8 }
    };
    var own = [], dead = false;
    function use(d) {
      var hr = dataTex(T, d.hr, d.S), nm = dataTex(T, d.n, d.S);
      own.forEach(function (t) { t.dispose(); });
      own = [hr, nm];
      mat.bumpMap = hr; mat.bumpScale = 1;            // contract: the gummy material keeps a bumpMap
      U.uSugarN.value = nm; U.uSugarNS.value = d.nScale;
      mat.userData.sugar = d.pending ? 'pending' : d.real ? 'cc0' : 'procedural';
    }
    // Sugar, best first: the CC0 grains (high-passed once per page, at idle) > the procedural crystals
    // > a plain stand-in while the CC0 grains are still being made. Upgrades happen in place (same
    // program), so the tap that brings the gummies in never pays for the processing.
    function upgrade(a) {
      if (dead || mat.userData.sugar === 'cc0') return;
      if (sugarSource(a)) {
        sugarLater(a, true).then(function (d) {
          if (dead || mat.userData.sugar === 'cc0') return;
          if (d) use(d); else fallback();
        });
      } else if (!(a && a.pending)) fallback();
    }
    function fallback() {                             // no CC0 grains after all: procedural crystals
      if (mat.userData.sugar !== 'pending') return;
      procSugarLater().then(function (d) { if (!dead && mat.userData.sugar === 'pending') use(d); });
    }
    var src = sugarSource(assets);
    if (src && SUGAR.real) use(SUGAR.real);
    else if (SUGAR.proc) use(SUGAR.proc);
    else if ((src && SUGAR.real !== false) || (assets && assets.pending)) use(SUGAR_PENDING);
    else use(procSugar(true));
    if (assets) upgrade(assets);
    mat.onBeforeCompile = function (sh) {
      Object.keys(U).forEach(function (k) { sh.uniforms[k] = U[k]; });
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\n' + GUMMY_VERT_PARS)
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n\tvTN = objectNormal; vTP = aTP; vGum = aGum;');
      sh.fragmentShader = sh.fragmentShader
        .replace('void main() {', GUMMY_FRAG_PARS + '\nvoid main() {')
        .replace('#include <roughnessmap_fragment>', GUMMY_ROUGH)
        .replace('#include <normal_fragment_maps>', GUMMY_NORMAL)
        .replace('#include <lights_physical_fragment>', GUMMY_ALBEDO + '\n#include <lights_physical_fragment>')
        .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + GUMMY_SSS)
        .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + GUMMY_AO);
    };
    mat.customProgramCacheKey = function () { return 'glo-gummy-v3'; };
    mat.userData.gummy = U;
    mat.userData.applyAssets = upgrade;
    mat.addEventListener('dispose', function () { dead = true; own.forEach(function (t) { t.dispose(); }); own = []; });
    return mat;
  }

  // ── shapes ────────────────────────────────────────────────────────────────────────────────────
  // Unit sphere from a subdivided cube; vertices are shared along the cube edges, so the mesh is
  // seam-free and computeVertexNormals() gives smooth normals everywhere.
  var CUBE = {};
  function cubeSphere(N) {
    if (CUBE[N]) return CUBE[N];
    var pos = [], idx = [], map = new Map(), M = N + 1;
    function vid(l) {
      var key = (l[0] * M + l[1]) * M + l[2], id = map.get(key);
      if (id !== undefined) return id;
      var x = l[0] / N * 2 - 1, y = l[1] / N * 2 - 1, z = l[2] / N * 2 - 1, x2 = x * x, y2 = y * y, z2 = z * z;
      pos.push(x * Math.sqrt(1 - y2 / 2 - z2 / 2 + y2 * z2 / 3), y * Math.sqrt(1 - z2 / 2 - x2 / 2 + z2 * x2 / 3), z * Math.sqrt(1 - x2 / 2 - y2 / 2 + x2 * y2 / 3));
      id = pos.length / 3 - 1; map.set(key, id);
      return id;
    }
    function tri(a, b, c) {                // keep every triangle wound outward
      var ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
      var ux = pos[b * 3] - ax, uy = pos[b * 3 + 1] - ay, uz = pos[b * 3 + 2] - az;
      var vx = pos[c * 3] - ax, vy = pos[c * 3 + 1] - ay, vz = pos[c * 3 + 2] - az;
      var d = (uy * vz - uz * vy) * ax + (uz * vx - ux * vz) * ay + (ux * vy - uy * vx) * az;
      if (d < 0) idx.push(a, c, b); else idx.push(a, b, c);
    }
    for (var f = 0; f < 6; f++) {
      var ax = f >> 1, side = (f & 1) ? N : 0, ua = (ax + 1) % 3, va = (ax + 2) % 3;
      for (var i = 0; i < N; i++) for (var j = 0; j < N; j++) {
        var q = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(function (p) { var l = [0, 0, 0]; l[ax] = side; l[ua] = p[0]; l[va] = p[1]; return vid(l); });
        tri(q[0], q[1], q[2]); tri(q[0], q[2], q[3]);
      }
    }
    return (CUBE[N] = { pos: new Float32Array(pos), index: new Uint32Array(idx) });
  }
  var sgnpow = function (v, e) { return v < 0 ? -Math.pow(-v, e) : Math.pow(v, e); };

  // One moulded "gumdrop pillow": rounded-square footprint, domed top, flatter base. The three
  // pieces share the mould but each gets its own proportions, lean, sag and organic wobble.
  function pieceSpec(i) {
    var r = rng(1013 + i * 7919), j = function (a) { return (r() * 2 - 1) * a; };
    return {
      seed: 4099 + i * 131, a: 0.92 * (1 + j(0.05)), c: 0.88 * (1 + j(0.06)), b: 0.5 * (1 + j(0.07)),
      ex: 0.56 + j(0.05), ey: 0.68 + j(0.05), dome: 0.36 + j(0.08), flat: 0.86 + j(0.04),
      taper: 0.1 + j(0.04), sag: 0.07 + j(0.03), shear: [j(0.07), j(0.07)],
      wob: 0.03 + j(0.008), dent: 0.006, coat: 0.8 + j(0.08),
      tex: 0.34 * (1 + j(0.14)), off: [r() * 9, r() * 9, r() * 9]
    };
  }
  function gummyPieceGeometry(T, sp, N) {
    var base = cubeSphere(N), cnt = base.pos.length / 3, P = new Float32Array(cnt * 3), i;
    var wob = waveField(rng(sp.seed), 7, 1.0, 2.4), dent = waveField(rng(sp.seed + 77), 6, 4.5, 7.5);
    for (i = 0; i < cnt; i++) {
      var sx = base.pos[i * 3], sy = base.pos[i * 3 + 1], sz = base.pos[i * 3 + 2];
      var x = sgnpow(sx, sp.ex), y = sgnpow(sy, sp.ey), z = sgnpow(sz, sp.ex);
      var X = x * sp.a, Y = y * sp.b, Z = z * sp.c, r2 = Math.min(1, x * x + z * z);
      if (Y > 0) Y += sp.dome * sp.b * Math.pow(1 - r2, 1.4) * y;    // domed top
      else Y *= sp.flat;                                              // flatter moulded base
      var h = Y / sp.b, k = 1 - sp.taper * h + sp.sag * Math.max(0, -h) * Math.max(0, -h);
      X *= k; Z *= k;
      X += sp.shear[0] * Y; Z += sp.shear[1] * Y;                      // the soft gel leans a little
      var len = Math.sqrt(X * X + Y * Y + Z * Z) || 1, d = sp.wob * wob(X, Y, Z) + sp.dent * dent(X, Y, Z);
      P[i * 3] = X + X / len * d; P[i * 3 + 1] = Y + Y / len * d; P[i * 3 + 2] = Z + Z / len * d;
    }
    var geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(P, 3));
    geo.setIndex(new T.BufferAttribute(base.index, 1));
    geo.computeBoundingBox();
    var c = geo.boundingBox.getCenter(new T.Vector3());
    geo.translate(-c.x, -c.y, -c.z);                                   // centred on its bounding box
    geo.computeVertexNormals();
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    var uv = new Float32Array(cnt * 2), tp = new Float32Array(cnt * 3);
    for (i = 0; i < cnt; i++) {
      uv[i * 2] = base.pos[i * 3] * 0.5 + 0.5; uv[i * 2 + 1] = base.pos[i * 3 + 1] * 0.5 + 0.5;
      for (var a = 0; a < 3; a++) tp[i * 3 + a] = P[i * 3 + a] * sp.tex + sp.off[a];   // per-piece crystal scale + offset
    }
    geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
    geo.setAttribute('aTP', new T.BufferAttribute(tp, 3));
    return geo;
  }

  // distance from the origin along d to the mesh surface (Möller–Trumbore, local space)
  function rayDist(P, I, dx, dy, dz) {
    var best = Infinity;
    for (var k = 0; k < I.length; k += 3) {
      var a = I[k] * 3, b = I[k + 1] * 3, c = I[k + 2] * 3;
      var e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2];
      var e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2];
      var px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
      var det = e1x * px + e1y * py + e1z * pz;
      if (det > -1e-12 && det < 1e-12) continue;
      var inv = 1 / det, tx = -P[a], ty = -P[a + 1], tz = -P[a + 2];
      var u = (tx * px + ty * py + tz * pz) * inv; if (u < 0 || u > 1) continue;
      var qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
      var v = (dx * qx + dy * qy + dz * qz) * inv; if (v < 0 || u + v > 1) continue;
      var t = (e2x * qx + e2y * qy + e2z * qz) * inv;
      if (t > 1e-6 && t < best) best = t;
    }
    return best;
  }
  // Nudge pieces along their centre lines until the surfaces just touch (a little squish).
  function settleCluster(T, pieces, pairs, iters) {
    var q = new T.Quaternion(), d = new T.Vector3(), o = new T.Vector3();
    function radius(m, dir) {
      o.copy(dir).applyQuaternion(q.copy(m.quaternion).invert());
      var g = m.geometry, t = rayDist(g.attributes.position.array, g.index.array, o.x, o.y, o.z);
      return (isFinite(t) ? t : 0.8) * m.scale.x;
    }
    for (var it = 0; it < (iters || 8); it++) {
      pairs.forEach(function (pr) {
        var A = pieces[pr[0]], B = pieces[pr[1]];
        d.subVectors(B.position, A.position);
        var dist = d.length(); d.divideScalar(dist || 1);
        var rA = radius(A, d), rB = radius(B, d.clone().negate());
        var err = dist - (rA + rB - pr[2]);
        A.position.addScaledVector(d, err * pr[3]);
        B.position.addScaledVector(d, -err * (1 - pr[3]));
      });
    }
  }
  // Per-vertex bake: x = AO from the neighbouring pieces (analytic ellipsoid occlusion),
  // y = gel thickness along the inward normal, z = sugar coverage (low-frequency patches).
  // `only` = bake just that piece (one job step each).
  function bakeGummies(T, pieces, specs, only) {
    var E = pieces.map(function (m) {
      m.updateMatrixWorld(true);
      var bb = m.geometry.boundingBox, half = bb.getSize(new T.Vector3()).multiplyScalar(0.5);
      return { c: m.position.clone(), qi: m.quaternion.clone().invert(), r: half.clone().multiplyScalar(m.scale.x), half: half };
    });
    var p = new T.Vector3(), nW = new T.Vector3(), qv = new T.Vector3(), mv = new T.Vector3(), nm = new T.Matrix3();
    pieces.forEach(function (m, i) {
      if (only != null && i !== only) return;
      var g = m.geometry, P = g.attributes.position.array, Nn = g.attributes.normal.array, cnt = P.length / 3;
      var out = new Float32Array(cnt * 3), sp = specs[i], hf = E[i].half;
      var coat = waveField(rng(sp.seed + 501), 6, 1.2, 2.6), maxR = Math.max(hf.x, hf.y, hf.z);
      nm.getNormalMatrix(m.matrixWorld);
      for (var v = 0; v < cnt; v++) {
        var lx = P[v * 3], ly = P[v * 3 + 1], lz = P[v * 3 + 2], nx = Nn[v * 3], ny = Nn[v * 3 + 1], nz = Nn[v * 3 + 2];
        // AO from the other pieces
        p.set(lx, ly, lz).applyMatrix4(m.matrixWorld);
        nW.set(nx, ny, nz).applyMatrix3(nm).normalize();
        var occ = 0;
        for (var j = 0; j < pieces.length; j++) {
          if (j === i) continue;
          var e = E[j];
          qv.subVectors(p, e.c).applyQuaternion(e.qi).divide(e.r);
          mv.copy(nW).applyQuaternion(e.qi).multiply(e.r).normalize();
          var l = Math.max(1, qv.length());
          occ += Math.max(0, -mv.dot(qv) / l) / (l * l);
        }
        var ao = Math.pow(clamp(1 - occ * 0.9, 0.2, 1), 1.25);
        // chord through the piece's own ellipsoid along -n
        var qx = lx / hf.x, qy = ly / hf.y, qz = lz / hf.z, wx = -nx / hf.x, wy = -ny / hf.y, wz = -nz / hf.z;
        var A2 = wx * wx + wy * wy + wz * wz, B2 = 2 * (qx * wx + qy * wy + qz * wz), C2 = qx * qx + qy * qy + qz * qz - 1;
        var disc = B2 * B2 - 4 * A2 * C2, chord = 0;
        if (disc > 0) { var sq = Math.sqrt(disc), t1 = (-B2 - sq) / (2 * A2), t2 = (-B2 + sq) / (2 * A2); chord = Math.max(0, t2 - Math.max(0, t1)); }
        out[v * 3] = ao;
        out[v * 3 + 1] = smooth(0.04, 0.95, chord / (2 * maxR));
        out[v * 3 + 2] = clamp(sp.coat + 0.32 * coat(lx * 1.3, ly * 1.3, lz * 1.3), 0.12, 1);
      }
      g.setAttribute('aGum', new T.BufferAttribute(out, 3));
    });
  }
  // cluster space: y up, +z toward the camera; two pieces at the bottom, one resting on them
  var GUMMY_LAYOUT = [
    { p: [-0.9, -0.5, 0.16], r: [0.5, 0.35, 0.24], s: 0.95 },
    { p: [0.92, -0.42, -0.22], r: [-0.3, -0.62, -0.58], s: 0.93 },
    { p: [0.02, 0.78, 0.04], r: [0.78, 0.22, -0.26], s: 0.96 }
  ];
  // The cluster's shapes, contact solve and bakes are deterministic, so they are made ONCE per page
  // and quality, as a job of ~20 short steps (prepared at idle after the first candy appears) and
  // every gummy cluster after that is a copy: the tap that brings the gummies in stays cheap.
  var GUMMY_GEO = {};
  function gummyGeoJob(T, N, idle) {
    if (GUMMY_GEO[N]) return GUMMY_GEO[N];
    var specs = GUMMY_LAYOUT.map(function (L, i) { return pieceSpec(i); }), pieces = [], out = {}, box = null;
    var pairs = [[0, 1, 0.035, 0.5], [0, 2, 0.045, 0], [1, 2, 0.045, 0]];
    var steps = [function () { cubeSphere(N); }];
    specs.forEach(function (sp, i) {
      steps.push(function () {
        var L = GUMMY_LAYOUT[i], m = new T.Mesh(gummyPieceGeometry(T, sp, N));
        m.position.fromArray(L.p); m.rotation.set(L.r[0], L.r[1], L.r[2]); m.scale.setScalar(L.s);
        pieces[i] = m;
      });
    });
    for (var it = 0; it < 8; it++) steps.push(function () { settleCluster(T, pieces, pairs, 1); });
    steps.push(function () {
      var cluster = new T.Group();
      pieces.forEach(function (m) { cluster.add(m); });
      cluster.updateMatrixWorld(true);
      box = new T.Box3().setFromObject(cluster, true);
      var c = box.getCenter(new T.Vector3());
      pieces.forEach(function (m) { m.position.sub(c); });             // spin about the cluster's centre
    });
    specs.forEach(function (sp, i) { steps.push(function () { bakeGummies(T, pieces, specs, i); }); });
    steps.push(function () {
      out.bounds = box.getSize(new T.Vector3());
      out.pieces = pieces.map(function (m) {
        var g = m.geometry, a = g.attributes;
        return {
          position: a.position.array, normal: a.normal.array, uv: a.uv.array, aTP: a.aTP.array, aGum: a.aGum.array,
          index: g.index.array, box: g.boundingBox.clone(), sphere: g.boundingSphere.clone(),
          rest: { p: m.position.clone(), q: m.quaternion.clone(), s: m.scale.x }
        };
      });
      pieces.forEach(function (m) { if (m.material) m.material.dispose(); });
      pieces = null;
    });
    var J = job(steps, { idle: idle });
    J.out = out;
    return (GUMMY_GEO[N] = J);
  }
  function buildGummies(T, mat, opts) {
    opts = opts || {};
    var N = opts.quality === 'low' ? 18 : 30;
    var D = gummyGeoJob(T, N, false).flush().out;   // instant when it was prepared at idle
    var g = new T.Group(), cluster = new T.Group();
    g.add(cluster);
    var pieces = D.pieces.map(function (pd) {
      var geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pd.position.slice(), 3));
      geo.setAttribute('normal', new T.BufferAttribute(pd.normal.slice(), 3));
      geo.setAttribute('uv', new T.BufferAttribute(pd.uv.slice(), 2));
      geo.setAttribute('aTP', new T.BufferAttribute(pd.aTP.slice(), 3));
      geo.setAttribute('aGum', new T.BufferAttribute(pd.aGum.slice(), 3));
      geo.setIndex(new T.BufferAttribute(pd.index, 1));                // the cube-sphere topology, shared read-only
      geo.boundingBox = pd.box.clone(); geo.boundingSphere = pd.sphere.clone();
      var m = new T.Mesh(geo, mat);
      m.position.copy(pd.rest.p); m.quaternion.copy(pd.rest.q); m.scale.setScalar(pd.rest.s);
      m.castShadow = m.receiveShadow = true;
      m.userData.rest = { p: pd.rest.p.clone(), q: pd.rest.q.clone(), s: pd.rest.s };
      cluster.add(m);
      return m;
    });
    g.userData.pieces = pieces;
    g.userData.cluster = cluster;
    g.userData.bounds = D.bounds.clone();
    g.userData.size = { w: 3.9, h: 3.6 };
    g.userData.bob = function (t) {
      cluster.position.y = Math.sin(t * 0.84) * 0.06;
      cluster.rotation.x = Math.sin(t * 0.54 + 1.3) * 0.035;
      cluster.rotation.z = Math.sin(t * 0.47 + 0.4) * 0.03;
    };
    return g;
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════
  // INTERACTION TRACK — tap-to-crunch bites with shard physics + regrow, gummy jiggle,
  // drag-to-spin with time-based inertia, fling tilt and recoil springs.
  // ════════════════════════════════════════════════════════════════════════════════════════════
  var TAP_SLOP = 6, TAP_MS = 350;
  var BITE = {
    max: 3,
    regrowAfter: 4500,          // ms after the last bite (fewer than max bites)
    regrowAfterMax: 1500,       // ms after the final bite (shards have landed by then)
    regrowDur: 1.15,            // s
    scoopR: 0.78, scoopDepth: 0.3,                  // the big scoop cutter (ball radius 1.33)
    teeth: 7, toothR: 0.19, toothDepth: 0.1,        // the crescent of tooth cutters (they notch the rim)
    arcR: 0.44, arcSpan: 4.0,                       // arc radius / angular span (rad) of the crescent
    halo: 0.03,                                     // width of the stress-whitened rim
    minY: -0.62                                     // lowest bite centre (x R below the ball centre): keeps the
                                                    // crater (scoop + teeth reach ~32 deg) off the stick junction
  };

  // Patch a (standard/physical) candy material, in place, to read the 'gloBite' vertex attribute:
  //   x = fresh fracture (lighter, glassier), y = crater occlusion (depth based), z = white rim halo.
  // Chains any existing onBeforeCompile and keeps the program cache key distinct.
  function patchBiteMaterial(mat) {
    if (!mat || !mat.isMaterial || mat.userData.gloBite) return;     // (the lollipop candy has it built in)
    mat.userData.gloBite = true;
    mat.defaultAttributeValues = Object.assign({}, mat.defaultAttributeValues, { gloBite: [0, 0, 0] });
    var prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey();
    mat.onBeforeCompile = function (sh, r) {
      if (prev) prev.call(this, sh, r);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 gloBite;\nvarying vec3 vGloBite;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvGloBite = gloBite;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vGloBite;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n' +
          '\tdiffuseColor.rgb = mix(diffuseColor.rgb, pow(diffuseColor.rgb, vec3(1.35)), vGloBite.x);\n' +
          '\tdiffuseColor.rgb = mix(diffuseColor.rgb, mix(diffuseColor.rgb, vec3(1.0, 0.96, 0.98), 0.5), vGloBite.z * 0.55);')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' +
          '\troughnessFactor = mix(roughnessFactor, 0.07, vGloBite.x);\n' +
          '\troughnessFactor = mix(roughnessFactor, 0.4, vGloBite.z * 0.25);')
        .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' +
          '\t{ float gloOcc = 1.0 - vGloBite.y;\n' +
          '\t  reflectedLight.indirectDiffuse *= gloOcc;\n' +
          '\t  reflectedLight.indirectSpecular *= mix(1.0, gloOcc, 0.7);\n' +
          '\t  reflectedLight.directDiffuse *= mix(1.0, gloOcc, 0.5); }');
    };
    mat.customProgramCacheKey = function () { return prevKey + '|gloBite1'; };
    mat.needsUpdate = true;
  }

  // Three jittered low-poly shard shapes (chunk, flake, sliver); flat-shaded, shared by all bites.
  function shardGeometries(T) {
    var seed = 11;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    var bases = [new T.IcosahedronGeometry(1, 0), new T.OctahedronGeometry(1, 0), new T.DodecahedronGeometry(1, 0)];
    var aspect = [[1, 0.62, 0.86], [1.28, 0.44, 0.92], [0.86, 0.66, 1.18]];
    return bases.map(function (g, gi) {
      var p = g.attributes.position, jit = {};
      for (var i = 0; i < p.count; i++) {
        var k = Math.round(p.getX(i) * 100) + ',' + Math.round(p.getY(i) * 100) + ',' + Math.round(p.getZ(i) * 100);
        if (!jit[k]) jit[k] = [0.68 + rnd() * 0.6, (rnd() - 0.5) * 0.25, (rnd() - 0.5) * 0.25];
        var j = jit[k];
        p.setXYZ(i, (p.getX(i) * j[0] + j[1]) * aspect[gi][0], (p.getY(i) * j[0]) * aspect[gi][1], (p.getZ(i) * j[0] + j[2]) * aspect[gi][2]);
      }
      g.computeVertexNormals();
      g.computeBoundingSphere();
      return g;
    });
  }

  function attachInteraction(ctx) {
    var T = ctx.T, opts = ctx.opts || {}, reduce = !!ctx.reduce;
    var canvas = ctx.canvas, camera = ctx.camera, root = ctx.root, lean = ctx.lean, spinner = ctx.spinner;
    var isBusy = ctx.isBusy || function () { return false; };
    var interactive = opts.interactive !== false;
    var dragOn = interactive && opts.drag !== false;
    var biteOn = opts.bite !== false;
    var low = opts.quality === 'low';
    var rnd = Math.random;
    var raycaster = new T.Raycaster(), ndc = new T.Vector2();
    var _m = new T.Matrix4(), _m2 = new T.Matrix4(), _q = new T.Quaternion(), _s = new T.Vector3();
    var _a = new T.Vector3(), _b = new T.Vector3(), _c = new T.Vector3();
    var ZERO = new T.Matrix4().makeScale(0, 0, 0), WHITE = new T.Color(0xffffff);

    // ── damped springs (semi-implicit Euler, sub-stepped) ──
    function spring(k, c) { return { x: 0, v: 0, k: k, c: c, target: 0 }; }
    function stepSpring(s, dt) {
      if (!s.v && s.x === s.target) return;
      var n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
      for (var i = 0; i < n; i++) { s.v += (-s.k * (s.x - s.target) - s.c * s.v) * h; s.x += s.v * h; }
      if (Math.abs(s.v) < 1e-4 && Math.abs(s.x - s.target) < 1e-5) { s.v = 0; s.x = s.target; }
    }
    var recX = spring(95, 7.5), recZ = spring(95, 7.5), tiltS = spring(55, 6.5), sq = spring(330, 13);

    // ── state for the current model ──
    var lol = null, gum = null, shardFloor = -2.98;

    // ── shards: 3 instanced shapes, pooled; no shadows. Room for three quick bites (12-18 each) ──
    var SLOTS = low ? 24 : 54;
    var shardGeos = shardGeometries(T);
    var shardMat = new T.MeshPhysicalMaterial({
      color: 0xff1493, roughness: 0.1, metalness: 0, ior: 1.5, specularIntensity: 1, flatShading: true, envMapIntensity: 1.2
    });
    var shardMeshes = shardGeos.map(function (g) {
      var m = new T.InstancedMesh(g, shardMat, SLOTS / 3);
      m.instanceMatrix.setUsage(T.DynamicDrawUsage);
      for (var i = 0; i < SLOTS / 3; i++) m.setMatrixAt(i, ZERO);
      // always in the draw list (dead slots are zero-scale), so the shader compiles with the first
      // frame instead of hitching the first tap
      m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false;
      m.name = 'glo-shards';
      root.add(m);
      return m;
    });
    var shards = [], shardNext = 0, shardsAlive = 0;
    for (var si = 0; si < SLOTS; si++) {
      shards.push({ mesh: shardMeshes[si % 3], slot: Math.floor(si / 3), p: new T.Vector3(), v: new T.Vector3(), w: new T.Vector3(),
        q: new T.Quaternion(), size: 0.1, ax: 1, ay: 1, az: 1, t: 0, life: 1, bounced: false, alive: false });
    }

    // ── sugar sparkles: one Points pool with a procedural 4-point glint ──
    var SPK = low ? 48 : 96;
    var spPos = new Float32Array(SPK * 3), spSize = new Float32Array(SPK), spAlpha = new Float32Array(SPK);
    var spGeo = new T.BufferGeometry();
    spGeo.setAttribute('position', new T.BufferAttribute(spPos, 3).setUsage(T.DynamicDrawUsage));
    spGeo.setAttribute('aSize', new T.BufferAttribute(spSize, 1).setUsage(T.DynamicDrawUsage));
    spGeo.setAttribute('aAlpha', new T.BufferAttribute(spAlpha, 1).setUsage(T.DynamicDrawUsage));
    var spMat = new T.ShaderMaterial({
      uniforms: { uScale: { value: 400 } },
      vertexShader: [
        'attribute float aSize; attribute float aAlpha; uniform float uScale; varying float vAlpha;',
        'void main() {',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  gl_Position = projectionMatrix * mv;',
        '  gl_PointSize = aAlpha > 0.0 ? aSize * uScale / max(0.05, -mv.z) : 0.0;',
        '  vAlpha = aAlpha;',
        '}'].join('\n'),
      fragmentShader: [
        'varying float vAlpha;',
        'void main() {',
        '  vec2 p = gl_PointCoord * 2.0 - 1.0;',
        '  float core = exp(-dot(p, p) * 16.0);',
        '  float glint = exp(-abs(p.x) * 24.0) * exp(-abs(p.y) * 3.4) + exp(-abs(p.y) * 24.0) * exp(-abs(p.x) * 3.4);',
        '  float a = clamp((core * 1.25 + glint * 0.8) * vAlpha, 0.0, 1.0);',
        '  if (a < 0.004) discard;',
        '  gl_FragColor = vec4(vec3(1.0, 0.985, 0.99) * a, a);',
        '}'].join('\n'),
      transparent: true, depthWrite: false, premultipliedAlpha: true
    });
    var spPts = new T.Points(spGeo, spMat);
    spPts.frustumCulled = false; spPts.renderOrder = 3; spPts.name = 'glo-sparkles';   // always drawn (size 0 when idle)
    root.add(spPts);
    var sparks = [], spNext = 0, spAlive = 0;
    for (var pi = 0; pi < SPK; pi++) sparks.push({ p: new T.Vector3(), v: new T.Vector3(), t: 0, life: 1, size: 0.1, seed: 0, g: 0, alive: false });

    function emitSpark(p, v, life, size, g) {
      var s = sparks[spNext]; spNext = (spNext + 1) % SPK;
      s.p.copy(p); s.v.copy(v); s.t = 0; s.life = life; s.size = size; s.g = g; s.seed = rnd() * 6.283;
      if (!s.alive) { s.alive = true; spAlive++; }
    }
    function stepSparkles(dt) {
      if (!spAlive) return;
      var fr = Math.exp(-1.8 * dt);
      for (var i = 0; i < SPK; i++) {
        var s = sparks[i], i3 = i * 3;
        if (!s.alive) { spAlpha[i] = 0; continue; }
        s.t += dt;
        if (s.t >= s.life) { s.alive = false; spAlive--; spAlpha[i] = 0; continue; }
        s.v.y -= s.g * dt; s.v.multiplyScalar(fr); s.p.addScaledVector(s.v, dt);
        var k = s.t / s.life, env = k < 0.15 ? k / 0.15 : 1 - smooth01((k - 0.15) / 0.85);
        spAlpha[i] = env * (0.6 + 0.4 * Math.sin(s.t * 34 + s.seed));
        spSize[i] = s.size * (0.75 + 0.25 * env);
        spPos[i3] = s.p.x; spPos[i3 + 1] = s.p.y; spPos[i3 + 2] = s.p.z;
      }
      spGeo.attributes.position.needsUpdate = true; spGeo.attributes.aSize.needsUpdate = true; spGeo.attributes.aAlpha.needsUpdate = true;
      root.getWorldScale(_s);
      spMat.uniforms.uScale.value = canvas.height / (2 * Math.tan(T.MathUtils.degToRad(camera.fov) / 2)) * _s.x;
    }
    function clearSparkles() {
      for (var i = 0; i < SPK; i++) { sparks[i].alive = false; spAlpha[i] = 0; }
      spAlive = 0; spGeo.attributes.aAlpha.needsUpdate = true;
    }

    function spawnShards(Pr, Nr) {
      var n = low ? 8 : 12 + Math.floor(rnd() * 7);
      var side = new T.Vector3(0, 1, 0).cross(Nr); if (side.lengthSq() < 1e-4) side.set(1, 0, 0); side.normalize();
      var up = new T.Vector3().crossVectors(Nr, side).normalize();
      syncShardLook();
      for (var i = 0; i < n; i++) {
        var s = takeShard();
        var a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * 0.42, ox = Math.cos(a) * rr, oy = Math.sin(a) * rr;
        s.p.copy(Pr).addScaledVector(side, ox).addScaledVector(up, oy).addScaledVector(Nr, 0.02 + rnd() * 0.12);
        s.v.copy(Nr).multiplyScalar(1.3 + rnd() * 2.1)
          .addScaledVector(side, ox * 3.4 + (rnd() - 0.5) * 1.0)
          .addScaledVector(up, oy * 2.6 + (rnd() - 0.5) * 0.6);
        s.v.y += 0.9 + rnd() * 1.6;
        s.w.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(5 + rnd() * 11);
        s.q.random();
        s.size = rnd() < 0.25 ? 0.11 + rnd() * 0.07 : 0.045 + rnd() * 0.06;
        s.ax = 0.8 + rnd() * 0.5; s.ay = 0.55 + rnd() * 0.5; s.az = 0.75 + rnd() * 0.5;
        s.t = 0; s.life = 1.15 + rnd() * 0.45; s.bounced = false;
        if (!s.alive) { s.alive = true; shardsAlive++; }
      }
    }
    // a free slot (round-robin from the last one), else the shard nearest the end of its life: a
    // fresh shard never vanishes mid-air because a later bite needed its slot
    function takeShard() {
      var pick = -1, oldest = -1;
      for (var k = 0; k < SLOTS; k++) {
        var j = (shardNext + k) % SLOTS, s = shards[j];
        if (!s.alive) { pick = j; break; }
        var age = s.t / s.life;
        if (age > oldest) { oldest = age; pick = j; }
      }
      shardNext = (pick + 1) % SLOTS;
      return shards[pick];
    }
    function syncShardLook() {
      var cm = lol && lol.mesh.material;
      if (!cm || !cm.color) return;
      shardMat.color.copy(cm.color).lerp(WHITE, 0.08);
      if (cm.emissive) { shardMat.emissive.copy(cm.emissive); shardMat.emissiveIntensity = cm.emissiveIntensity; }
      if (cm.envMapIntensity != null) shardMat.envMapIntensity = cm.envMapIntensity * 1.1;
    }
    function stepShards(dt) {
      if (!shardsAlive) return;
      var fr = Math.exp(-0.6 * dt);
      syncShardLook();
      for (var i = 0; i < SLOTS; i++) {
        var s = shards[i];
        if (!s.alive) continue;
        s.t += dt;
        if (s.t >= s.life) { s.alive = false; shardsAlive--; s.mesh.setMatrixAt(s.slot, ZERO); s.mesh.instanceMatrix.needsUpdate = true; continue; }
        s.v.y -= 15 * dt; s.v.multiplyScalar(fr);
        s.p.addScaledVector(s.v, dt);
        var rad = s.size * 0.55;
        if (s.p.y < shardFloor + rad) {
          s.p.y = shardFloor + rad;
          if (s.v.y < 0) {
            if (!s.bounced) { s.v.y *= -0.34; s.v.x *= 0.55; s.v.z *= 0.55; s.w.multiplyScalar(0.45); s.bounced = true; }
            else { s.v.y = 0; s.v.x *= 0.9; s.v.z *= 0.9; s.w.multiplyScalar(0.9); }
          }
        }
        var wl = s.w.length();
        if (wl > 1e-4) { _q.setFromAxisAngle(_a.copy(s.w).multiplyScalar(1 / wl), wl * dt); s.q.premultiply(_q); }
        var k = s.t / s.life, env = Math.min(1, s.t / 0.05) * (k < 0.55 ? 1 : 1 - smooth01((k - 0.55) / 0.45));
        var sz = s.size * Math.max(env, 1e-4);
        _s.set(sz * s.ax, sz * s.ay, sz * s.az);
        _m.compose(s.p, s.q, _s);
        s.mesh.setMatrixAt(s.slot, _m);
        s.mesh.instanceMatrix.needsUpdate = true;
      }
    }
    function clearShards() {
      shards.forEach(function (s) { if (s.alive) { s.alive = false; s.mesh.setMatrixAt(s.slot, ZERO); } });
      shardsAlive = 0;
      shardMeshes.forEach(function (m) { m.instanceMatrix.needsUpdate = true; });
    }

    // ── lollipop carving ──
    function setupCandy(model) {
      var candy = model.userData.candy;
      if (!candy || !candy.geometry || !candy.geometry.attributes.position) return null;
      var geo = candy.geometry;
      if (geo.userData.gloBiteState) return geo.userData.gloBiteState;
      var pos = geo.attributes.position, nrm = geo.attributes.normal;
      if (!nrm) { geo.computeVertexNormals(); nrm = geo.attributes.normal; }
      var n = pos.count;
      var orig = geo.userData.origPos || new Float32Array(pos.array);
      geo.userData.origPos = orig;
      pos.setUsage(T.DynamicDrawUsage); nrm.setUsage(T.DynamicDrawUsage);
      var bAttr = geo.attributes.gloBite;
      if (!bAttr) { bAttr = new T.BufferAttribute(new Float32Array(n * 3), 3); geo.setAttribute('gloBite', bAttr); }
      bAttr.setUsage(T.DynamicDrawUsage);
      if (!geo.boundingSphere) geo.computeBoundingSphere();
      (Array.isArray(candy.material) ? candy.material : [candy.material]).forEach(patchBiteMaterial);
      // The poured ball is slightly out of round: its design centre / nominal radius drive the hit test,
      // and every vertex keeps its OWN radius as the "skin" term of the carve, so carving never snaps the
      // untouched surface around a bite onto a perfect sphere (no ring / bulge around the crater).
      var C = geo.userData.radius ? new T.Vector3(0, 0, 0) : geo.boundingSphere.center.clone();
      var R = geo.userData.radius || geo.boundingSphere.radius, rad0 = new Float32Array(n);
      for (var v = 0; v < n; v++) rad0[v] = Math.hypot(orig[v * 3] - C.x, orig[v * 3 + 1] - C.y, orig[v * 3 + 2] - C.z);
      var L = {
        mesh: candy, geo: geo, pos: pos, nrm: nrm, bAttr: bAttr, orig: orig, origN: new Float32Array(nrm.array), n: n,
        C: C, R: R, rad0: rad0, Rv: 0,
        cutters: [], bites: 0, mark: new Uint8Array(n), list: [], regrowAt: 0, regrow: null,
        sqAxis: new T.Vector3(0, 0, 1)
      };
      geo.userData.gloBiteState = L;
      return L;
    }
    // Signed distance of the carved ball = smooth-max(sphere, -smooth-union(cutters)). The small
    // blend radii round the rim / tooth cusps just enough for the vertex grid to sample them without
    // stair-steps. Writes the gradient to SG[0..2], the sphere's blend weight (1 = untouched skin,
    // 0 = fresh cut) to SG[3] and the cutter-union distance to SG[4].
    var K_SUB = 0.018, K_UNI = 0.014, SG = new Float64Array(5);   // crisp scalloped rims (~1 vertex spacing)
    function sdf(L, x, y, z) {
      var all = L.cutters, du = Infinity, gx = 0, gy = 0, gz = 0;
      for (var k = 0; k < all.length; k++) {
        var c = all[k], dx = x - c.x, dy = y - c.y, dz = z - c.z, l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9;
        var di = l - c.r;
        if (du === Infinity) { du = di; gx = dx / l; gy = dy / l; gz = dz / l; continue; }
        var h = clamp(0.5 + 0.5 * (di - du) / K_UNI, 0, 1);      // weight of the running union
        du = di + (du - di) * h - K_UNI * h * (1 - h);
        gx = gx * h + (dx / l) * (1 - h); gy = gy * h + (dy / l) * (1 - h); gz = gz * h + (dz / l) * (1 - h);
      }
      var sx = x - L.C.x, sy = y - L.C.y, sz = z - L.C.z, sl = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1e-9, ds = sl - (L.Rv > 0 ? L.Rv : L.R);
      if (du === Infinity) { SG[0] = sx / sl; SG[1] = sy / sl; SG[2] = sz / sl; SG[3] = 1; SG[4] = 1e9; return ds; }
      var a = -ds, h2 = clamp(0.5 + 0.5 * (du - a) / K_SUB, 0, 1);  // smin(-ds, du): h2 = sphere weight
      var sm = du + (a - du) * h2 - K_SUB * h2 * (1 - h2);
      SG[0] = h2 * sx / sl - (1 - h2) * gx; SG[1] = h2 * sy / sl - (1 - h2) * gy; SG[2] = h2 * sz / sl - (1 - h2) * gz;
      SG[3] = h2; SG[4] = du;
      return -sm;
    }
    // Analytic hit on the carved ball (sphere-traced SDF): exact, and cheap next to a raycast
    // through 55k triangles. Returns { local (candy space), dist (world) } or null.
    function hitCandy(rayW) {
      var L = lol;
      if (!L) return null;
      _m.copy(L.mesh.matrixWorld).invert();
      var o = _a.copy(rayW.origin).applyMatrix4(_m), d = _b.copy(rayW.direction).transformDirection(_m);
      var ox = o.x - L.C.x, oy = o.y - L.C.y, oz = o.z - L.C.z;
      var bq = ox * d.x + oy * d.y + oz * d.z, cq = ox * ox + oy * oy + oz * oz - L.R * L.R, disc = bq * bq - cq;
      if (disc < 0) return null;
      var sd = Math.sqrt(disc), t0 = Math.max(0, -bq - sd), t1 = -bq + sd;
      if (t1 < 0) return null;
      var t = t0;
      if (L.cutters.length) {
        var hitT = -1;
        for (var it = 0; it < 300 && t <= t1; it++) {
          var dd = sdf(L, o.x + d.x * t, o.y + d.y * t, o.z + d.z * t);
          if (dd < 2e-4) { hitT = t; break; }
          t += Math.max(dd * 0.85, 0.002);
        }
        if (hitT < 0) return null;
        t = hitT;
      }
      var P = new T.Vector3(o.x + d.x * t, o.y + d.y * t, o.z + d.z * t);
      var W = P.clone().applyMatrix4(L.mesh.matrixWorld);
      return { local: P, dist: W.distanceTo(rayW.origin) };
    }
    // One scoop + a crescent of overlapping tooth spheres; every centre sits outside the surface.
    function makeCutters(L, P, N, upL) {
      var up = upL.clone().addScaledVector(N, -upL.dot(N));
      if (up.lengthSq() < 1e-6) up.set(Math.abs(N.y) < 0.9 ? 0 : 1, Math.abs(N.y) < 0.9 ? 1 : 0, 0).addScaledVector(N, -(Math.abs(N.y) < 0.9 ? N.y : N.x));
      up.normalize();
      var side = new T.Vector3().crossVectors(up, N).normalize();
      var sz = 0.9 + rnd() * 0.2, out = [];
      var Rs = BITE.scoopR * sz, ds = BITE.scoopDepth * sz, h = Rs - ds;
      out.push({ x: P.x + N.x * h, y: P.y + N.y * h, z: P.z + N.z * h, r: Rs, r2: Rs * Rs });
      var rot = (rnd() - 0.5) * 1.1, nT = BITE.teeth;
      for (var i = 0; i < nT; i++) {
        var a = Math.PI / 2 + rot + (i / (nT - 1) - 0.5) * BITE.arcSpan;
        var j = 1 + (rnd() - 0.5) * 0.16;
        var ox = Math.cos(a) * BITE.arcR * sz * 1.08, oy = Math.sin(a) * BITE.arcR * sz * 0.94;
        var r = BITE.toothR * sz * j, dig = BITE.toothDepth * sz * j;
        var hh = r - dig - (ox * ox + oy * oy) / (2 * Math.max(0.3, L.R));
        out.push({
          x: P.x + side.x * ox + up.x * oy + N.x * hh,
          y: P.y + side.y * ox + up.y * oy + N.y * hh,
          z: P.z + side.z * ox + up.z * oy + N.z * hh, r: r, r2: r * r
        });
      }
      return out;
    }
    // Project every vertex near the new cutters onto the carved SDF with Newton steps along its
    // gradient. Deep inside a cutter this is exactly v = c + normalize(v - c) * r; at the rim it
    // lands on the small fillet. The normal is the SDF gradient (analytic), so the UV seam and the
    // poles stay consistent by construction and nothing needs computeVertexNormals().
    function carve(L, cut) {
      var p = L.pos.array, nn = L.nrm.array, b = L.bAttr.array, o = L.orig;
      var cx = L.C.x, cy = L.C.y, cz = L.C.z, HALO = BITE.halo, pad = HALO + K_SUB + K_UNI;
      var mnx = Infinity, mny = Infinity, mnz = Infinity, mxx = -Infinity, mxy = -Infinity, mxz = -Infinity;
      cut.forEach(function (c) {
        mnx = Math.min(mnx, c.x - c.r - pad); mxx = Math.max(mxx, c.x + c.r + pad);
        mny = Math.min(mny, c.y - c.r - pad); mxy = Math.max(mxy, c.y + c.r + pad);
        mnz = Math.min(mnz, c.z - c.r - pad); mxz = Math.max(mxz, c.z + c.r + pad);
      });
      var on = L.origN;
      for (var i = 0, i3 = 0; i < L.n; i++, i3 += 3) {
        var x = p[i3], y = p[i3 + 1], z = p[i3 + 2];
        if (x < mnx || x > mxx || y < mny || y > mxy || z < mnz || z > mxz) continue;
        L.Rv = L.rad0[i];                          // this vertex's own poured radius is its skin
        var d = sdf(L, x, y, z);
        for (var it = 0; it < 10 && Math.abs(d) > 1e-4; it++) {
          var g2 = SG[0] * SG[0] + SG[1] * SG[1] + SG[2] * SG[2];
          if (g2 < 1e-6) break;
          var st = clamp(d / g2, -0.25, 0.25);
          x -= SG[0] * st; y -= SG[1] * st; z -= SG[2] * st;
          d = sdf(L, x, y, z);
        }
        var moved = Math.abs(x - p[i3]) + Math.abs(y - p[i3 + 1]) + Math.abs(z - p[i3 + 2]) > 1e-6;
        var fresh = 1 - SG[3], du = Math.max(0, SG[4]);
        var halo = du < HALO ? (1 - du / HALO) * (1 - du / HALO) * 0.8 * SG[3] : 0;
        if (!moved && halo <= b[i3 + 2] && fresh <= b[i3]) continue;
        if (moved) {
          p[i3] = x; p[i3 + 1] = y; p[i3 + 2] = z;
          // SDF gradient with its skin part (weight SG[3]) swapped from radial to the vertex's own
          // original normal: the skin keeps its exact shading, the cut takes the cutter gradient
          var rx = x - cx, ry = y - cy, rz = z - cz, rl = Math.hypot(rx, ry, rz) || 1, w = SG[3];
          var nx = SG[0] + w * (on[i3] - rx / rl), ny = SG[1] + w * (on[i3 + 1] - ry / rl), nz = SG[2] + w * (on[i3 + 2] - rz / rl);
          var gl = Math.hypot(nx, ny, nz) || 1;
          nn[i3] = nx / gl; nn[i3 + 1] = ny / gl; nn[i3 + 2] = nz / gl;
        }
        var r0 = Math.hypot(o[i3] - cx, o[i3 + 1] - cy, o[i3 + 2] - cz), r1 = Math.hypot(x - cx, y - cy, z - cz);
        b[i3] = Math.max(b[i3], fresh);
        b[i3 + 1] = clamp((r0 - r1) / 0.3, 0, 1) * 0.8;             // crater occlusion: deeper = darker
        b[i3 + 2] = b[i3] > 0.98 ? 0 : Math.max(b[i3 + 2] * (1 - fresh), halo);
        if (!L.mark[i]) { L.mark[i] = 1; L.list.push(i); }
      }
      L.Rv = 0;
      L.pos.needsUpdate = true; L.nrm.needsUpdate = true; L.bAttr.needsUpdate = true;
    }
    function rootFrame(L, P, N) {             // candy-local point/normal -> root space
      _m.copy(root.matrixWorld).invert().multiply(L.mesh.matrixWorld);
      return { P: P.clone().applyMatrix4(_m), N: N.clone().transformDirection(_m) };
    }
    function biteAt(P) {
      var L = lol;
      if (!L) return false;
      if (L.regrow || L.bites >= BITE.max) { wobble(P, 0.6); return false; }
      // Teeth can't reach in next to the stick, and a crater there would open up the buried stick and
      // collar: a hit low on the ball slides up its meridian until the whole bite clears the junction.
      var minY = BITE.minY * L.R;
      if (P.y - L.C.y < minY) {
        var hx = P.x - L.C.x, hz = P.z - L.C.z, hr = Math.hypot(hx, hz);
        if (hr < 1e-3) {                           // dead centre underneath: turn toward the camera
          _a.setFromMatrixPosition(camera.matrixWorld); L.mesh.worldToLocal(_a);
          hx = _a.x - L.C.x; hz = _a.z - L.C.z; hr = Math.hypot(hx, hz) || 1;
        }
        var nr = Math.sqrt(Math.max(0, L.R * L.R - minY * minY)) / hr;
        P = new T.Vector3(L.C.x + hx * nr, L.C.y + minY, L.C.z + hz * nr);
        if (L.cutters.length) {                    // already bitten there: drop onto the crater floor
          var u = P.clone().sub(L.C).normalize();
          for (var it = 0; it < 40; it++) { var dd = sdf(L, P.x, P.y, P.z); if (dd < 2e-4) break; P.addScaledVector(u, -dd * 0.9); }
        }
      }
      var N = P.clone().sub(L.C).normalize();
      L.mesh.getWorldQuaternion(_q).invert();
      var upL = new T.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).applyQuaternion(_q);
      var cut = makeCutters(L, P, N, upL);
      Array.prototype.push.apply(L.cutters, cut);
      carve(L, cut);
      L.bites++;
      var t = performance.now();
      L.regrowAt = t + (L.bites >= BITE.max ? BITE.regrowAfterMax : BITE.regrowAfter);
      var f = rootFrame(L, P, N);
      if (!reduce) {
        spawnShards(f.P, f.N);
        var nS = low ? 3 : 6;
        for (var i = 0; i < nS; i++) {
          _c.copy(f.N).multiplyScalar(0.6 + rnd() * 0.9);
          _c.x += (rnd() - 0.5) * 1.2; _c.y += 0.5 + rnd() * 0.9; _c.z += (rnd() - 0.5) * 1.2;
          emitSpark(_b.copy(f.P).addScaledVector(f.N, 0.08), _c, 0.45 + rnd() * 0.35, 0.1 + rnd() * 0.07, 2.5);
        }
        recX.v += -f.N.z * 0.95; recZ.v += f.N.x * 0.95;
        L.sqAxis.copy(N); sq.v += 1.35;
        omega += f.N.x * 1.1;
      }
      if (opts.onBite) opts.onBite({ bites: L.bites, max: BITE.max, point: f.P, regrowIn: L.regrowAt - t });
      return true;
    }
    function wobble(P, amt) {
      if (reduce) return;
      var L = lol;
      if (L && P) {
        var f = rootFrame(L, P, P.clone().sub(L.C).normalize());
        recX.v += -f.N.z * 0.6 * amt; recZ.v += f.N.x * 0.6 * amt;
        L.sqAxis.copy(P).sub(L.C).normalize(); sq.v += 0.7 * amt;
      } else { recZ.v += (rnd() < 0.5 ? -1 : 1) * 0.6 * amt; }
    }
    function startRegrow() {
      var L = lol;
      if (!L || L.regrow) return false;
      L.regrowAt = 0;
      if (!L.list.length) { L.bites = 0; L.cutters.length = 0; return false; }
      var list = L.list, m = list.length, p = L.pos.array, n = L.nrm.array, b = L.bAttr.array, o = L.orig;
      var fp = new Float32Array(m * 3), fn = new Float32Array(m * 3), fb = new Float32Array(m * 3), dl = new Float32Array(m), maxD = 1e-3;
      for (var j = 0; j < m; j++) {
        var i3 = list[j] * 3, j3 = j * 3;
        fp[j3] = p[i3]; fp[j3 + 1] = p[i3 + 1]; fp[j3 + 2] = p[i3 + 2];
        fn[j3] = n[i3]; fn[j3 + 1] = n[i3 + 1]; fn[j3 + 2] = n[i3 + 2];
        fb[j3] = b[i3]; fb[j3 + 1] = b[i3 + 1]; fb[j3 + 2] = b[i3 + 2];
        var d = Math.hypot(o[i3] - p[i3], o[i3 + 1] - p[i3 + 1], o[i3 + 2] - p[i3 + 2]);
        dl[j] = d; if (d > maxD) maxD = d;
      }
      for (j = 0; j < m; j++) dl[j] = dl[j] / maxD * 0.4;          // the deepest parts heal last
      L.regrow = { t: 0, dur: reduce ? 0.4 : BITE.regrowDur, fp: fp, fn: fn, fb: fb, dl: dl, acc: 0 };
      return true;
    }
    function stepRegrow(dt) {
      var L = lol, R = L.regrow;
      R.t += dt;
      var K = Math.min(1, R.t / R.dur), list = L.list, p = L.pos.array, n = L.nrm.array, b = L.bAttr.array, o = L.orig, on = L.origN;
      for (var j = 0, m = list.length; j < m; j++) {
        var i3 = list[j] * 3, j3 = j * 3;
        var k = reduce ? K : clamp(K * 1.4 - R.dl[j], 0, 1);
        var e = reduce ? k : easeOutBack(k), ec = smooth01(k);
        p[i3] = R.fp[j3] + (o[i3] - R.fp[j3]) * e;
        p[i3 + 1] = R.fp[j3 + 1] + (o[i3 + 1] - R.fp[j3 + 1]) * e;
        p[i3 + 2] = R.fp[j3 + 2] + (o[i3 + 2] - R.fp[j3 + 2]) * e;
        var nx = R.fn[j3] + (on[i3] - R.fn[j3]) * ec, ny = R.fn[j3 + 1] + (on[i3 + 1] - R.fn[j3 + 1]) * ec, nz = R.fn[j3 + 2] + (on[i3 + 2] - R.fn[j3 + 2]) * ec;
        var nl = Math.hypot(nx, ny, nz) || 1;
        n[i3] = nx / nl; n[i3 + 1] = ny / nl; n[i3 + 2] = nz / nl;
        b[i3] = R.fb[j3] * (1 - ec); b[i3 + 1] = R.fb[j3 + 1] * (1 - ec); b[i3 + 2] = R.fb[j3 + 2] * (1 - ec);
      }
      L.pos.needsUpdate = true; L.nrm.needsUpdate = true; L.bAttr.needsUpdate = true;
      if (!reduce && K < 0.85) {                                  // sugar shimmer over the healing crater
        R.acc += dt * (low ? 18 : 36);
        if (R.acc >= 1) _m2.copy(root.matrixWorld).invert().multiply(L.mesh.matrixWorld);
        while (R.acc >= 1) {
          R.acc -= 1;
          var pick = -1;
          for (var tries = 0; tries < 6 && pick < 0; tries++) { var jj = Math.floor(rnd() * list.length); if (R.fb[jj * 3] > 0.5) pick = jj; }
          if (pick < 0) continue;
          var idx = list[pick] * 3;
          _a.set(o[idx], o[idx + 1], o[idx + 2]).applyMatrix4(_m2);
          _b.set(on[idx], on[idx + 1], on[idx + 2]).transformDirection(_m2).multiplyScalar(0.25 + rnd() * 0.2);
          _b.x += (rnd() - 0.5) * 0.2; _b.y += rnd() * 0.25; _b.z += (rnd() - 0.5) * 0.2;
          emitSpark(_a, _b, 0.4 + rnd() * 0.3, 0.08 + rnd() * 0.06, 0);
        }
      }
      if (K >= 1) finishRegrow();
    }
    function finishRegrow() {
      var L = lol, list = L.list, p = L.pos.array, n = L.nrm.array, b = L.bAttr.array;
      for (var j = 0; j < list.length; j++) {
        var i = list[j], i3 = i * 3;
        p[i3] = L.orig[i3]; p[i3 + 1] = L.orig[i3 + 1]; p[i3 + 2] = L.orig[i3 + 2];
        n[i3] = L.origN[i3]; n[i3 + 1] = L.origN[i3 + 1]; n[i3 + 2] = L.origN[i3 + 2];
        b[i3] = b[i3 + 1] = b[i3 + 2] = 0;
        L.mark[i] = 0;
      }
      L.list = []; L.cutters.length = 0; L.bites = 0; L.regrow = null; L.regrowAt = 0;
      L.pos.needsUpdate = true; L.nrm.needsUpdate = true; L.bAttr.needsUpdate = true;
      if (opts.onRegrow) opts.onRegrow();
    }
    // Squash the ball along the bite axis about its centre, through the mesh's own matrix
    // (position/scale stay untouched, so bob() and page code never fight it).
    function applySquash() {
      var m = lol.mesh;
      if (!sq.x && !sq.v) { if (!m.matrixAutoUpdate) m.matrixAutoUpdate = true; return; }
      m.matrixAutoUpdate = false;
      m.updateMatrix();
      var s = sq.x, a = lol.sqAxis, sa = 1 - s, sp = 1 + s * 0.45, k = sa - sp, e = _m2.elements, C = lol.C;
      e[0] = sp + k * a.x * a.x; e[1] = k * a.y * a.x; e[2] = k * a.z * a.x; e[3] = 0;
      e[4] = k * a.x * a.y; e[5] = sp + k * a.y * a.y; e[6] = k * a.z * a.y; e[7] = 0;
      e[8] = k * a.x * a.z; e[9] = k * a.y * a.z; e[10] = sp + k * a.z * a.z; e[11] = 0;
      e[12] = C.x - (e[0] * C.x + e[4] * C.y + e[8] * C.z);
      e[13] = C.y - (e[1] * C.x + e[5] * C.y + e[9] * C.z);
      e[14] = C.z - (e[2] * C.x + e[6] * C.y + e[10] * C.z); e[15] = 1;
      m.matrix.multiply(_m2);
      m.matrixWorldNeedsUpdate = true;
    }

    // ── gummy jiggle ──
    function setupGummies(model) {
      var pieces = model.userData.pieces || model.children.filter(function (o) { return o.isMesh; });
      return pieces.map(function (o) { return { obj: o, t: 0, amp: 0, delay: 0, hop: 0, active: false }; });
    }
    function jiggle(i, notify) {
      var G = gum;
      if (!G || !G[i]) return false;
      for (var j = 0; j < G.length; j++) {
        var g = G[j];
        if (j === i) { g.amp = reduce ? 0.3 : 1; g.delay = 0; g.hop = reduce ? 0 : 0.13; }
        else if (!reduce) { g.amp = 0.3; g.delay = 0.05 + 0.04 * Math.abs(j - i); g.hop = 0; }
        else continue;
        g.t = 0; g.active = true;
      }
      if (!reduce) puff(G[i].obj);
      if (notify !== false && opts.onPoke) opts.onPoke({ kind: 'gummy', index: i });
      return true;
    }
    function puff(obj) {
      obj.updateWorldMatrix(true, false);
      var c = obj.getWorldPosition(new T.Vector3());
      root.worldToLocal(c);
      var n = low ? 5 : 10;
      for (var i = 0; i < n; i++) {
        _a.set((rnd() - 0.5) * 0.9, 0.3 + rnd() * 0.35, (rnd() - 0.5) * 0.9).add(c);
        _b.set((rnd() - 0.5) * 1.6, 1.0 + rnd() * 1.4, (rnd() - 0.5) * 1.6);
        emitSpark(_a, _b, 0.5 + rnd() * 0.3, 0.08 + rnd() * 0.06, 3);
      }
    }
    function stepJiggle(dt) {
      for (var j = 0; j < gum.length; j++) {
        var g = gum[j];
        if (!g.active) continue;
        g.t += dt;
        var tau = g.t - g.delay, o = g.obj, TIN = 0.07, a, end;
        if (tau < 0) continue;
        if (reduce) { a = tau < 0.08 ? tau / 0.08 : Math.max(0, 1 - (tau - 0.08) / 0.22); end = 0.3; }
        else { a = tau < TIN ? 1 - (1 - tau / TIN) * (1 - tau / TIN) : Math.exp(-5.2 * (tau - TIN)) * Math.cos(19 * (tau - TIN)); end = TIN + 0.95; }
        if (tau >= end) { g.active = false; o.matrixAutoUpdate = true; continue; }
        a *= g.amp;
        o.matrixAutoUpdate = false;
        o.updateMatrix();
        // squash along the model's vertical about the piece's own centre: scale the matrix ROWS
        var e = o.matrix.elements, sxz = 1 + 0.14 * a, sy = 1 - 0.28 * a;
        e[0] *= sxz; e[4] *= sxz; e[8] *= sxz;
        e[1] *= sy; e[5] *= sy; e[9] *= sy;
        e[2] *= sxz; e[6] *= sxz; e[10] *= sxz;
        if (g.hop) { var u = (tau - TIN) / 0.34; if (u > 0 && u < 1) e[13] += g.hop * Math.sin(Math.PI * u); }
        o.matrixWorldNeedsUpdate = true;
      }
    }
    function pickPiece() {
      var objs = gum.map(function (g) { return g.obj; });
      var hits = raycaster.intersectObjects(objs, true);
      if (!hits.length) return -1;
      for (var o = hits[0].object; o; o = o.parent) { var i = objs.indexOf(o); if (i >= 0) return i; }
      return -1;
    }

    // ── pointer: tap vs drag ──
    var ptr = null, omega = 0, pitch = 0, pitchT = 0;
    var cursorIdle = dragOn ? 'grab' : (interactive ? 'pointer' : '');
    function onDown(e) {
      if (ptr || (e.pointerType === 'mouse' && e.button !== 0)) return;
      var t = performance.now();
      ptr = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, t0: t, lt: t, drag: false };
      omega = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    }
    function onMove(e) {
      if (!ptr || e.pointerId !== ptr.id) return;
      var t = performance.now();
      if (!ptr.drag) {
        if (Math.hypot(e.clientX - ptr.x0, e.clientY - ptr.y0) < TAP_SLOP) return;
        ptr.drag = true;                         // past the slop: it's a drag (the slop is applied too)
        if (dragOn) canvas.style.cursor = 'grabbing';
      }
      if (!dragOn) return;
      var dx = e.clientX - ptr.lx, dy = e.clientY - ptr.ly, dts = Math.max(0.008, (t - ptr.lt) / 1000);
      ptr.lx = e.clientX; ptr.ly = e.clientY; ptr.lt = t;
      var d = dx * 0.011;
      if (!isBusy()) spinner.rotation.y += d;
      omega = omega * 0.5 + (d / dts) * 0.5;
      pitchT = clamp(pitchT + dy * 0.005, -0.55, 0.55);
    }
    function onUp(e) {
      if (!ptr || e.pointerId !== ptr.id) return;
      var p = ptr, t = performance.now();
      ptr = null;
      if (dragOn) canvas.style.cursor = cursorIdle;
      if (p.drag) { var idle = t - p.lt; if (idle > 60) omega *= Math.exp(-(idle - 60) / 90); return; }
      if (t - p.t0 < TAP_MS && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < TAP_SLOP) tap(p.x0, p.y0);
    }
    function onCancel(e) {
      if (!ptr || e.pointerId !== ptr.id) return;
      ptr = null;
      if (dragOn) canvas.style.cursor = cursorIdle;
    }
    function setRay(cx, cy) {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      return true;
    }
    function tap(cx, cy) {
      if (isBusy() || !setRay(cx, cy)) return;
      var model = ctx.getModel();
      if (!model) return;
      if (gum) { var i = pickPiece(); if (i >= 0) jiggle(i, true); return; }
      if (!lol) return;
      var hit = hitCandy(raycaster.ray), stickHit = null, stick = model.userData.stick;
      if (stick) { var hs = raycaster.intersectObject(stick, true); if (hs.length) stickHit = hs[0]; }
      if (hit && (!stickHit || hit.dist <= stickHit.distance + 1e-3)) {
        if (biteOn) biteAt(hit.local);
        else { wobble(hit.local, 1); if (opts.onPoke) opts.onPoke({ kind: 'lollipop' }); }
      } else if (stickHit) wobble(null, 1);
    }
    if (interactive) {
      canvas.style.cursor = cursorIdle;
      canvas.style.touchAction = 'pan-y';
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onCancel);
      canvas.addEventListener('lostpointercapture', onCancel);
    }

    // ── programmatic api ──
    var SPOTS = [[0.38, 0.3], [-0.42, 0.1], [0.08, -0.38]];
    function apiBite(at) {
      if (isBusy() || !lol) return false;
      if (at && at.clientX != null) {
        if (!setRay(at.clientX, at.clientY)) return false;
      } else {
        var L = lol;
        L.mesh.updateWorldMatrix(true, false);
        var c = L.mesh.localToWorld(L.C.clone());
        var sc = L.mesh.getWorldScale(new T.Vector3()).x * L.R;
        var off = SPOTS[L.bites % SPOTS.length];
        var right = new T.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), upv = new T.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
        var target = c.addScaledVector(right, off[0] * sc).addScaledVector(upv, off[1] * sc);
        var origin = new T.Vector3().setFromMatrixPosition(camera.matrixWorld);
        raycaster.ray.origin.copy(origin); raycaster.ray.direction.copy(target.sub(origin).normalize());
      }
      var hit = hitCandy(raycaster.ray);
      return hit ? biteAt(hit.local) : false;
    }
    function apiPoke(i) {
      if (isBusy()) return false;
      if (gum) {
        if (i == null) {                          // the piece nearest the camera
          var best = Infinity, cam = new T.Vector3().setFromMatrixPosition(camera.matrixWorld);
          gum.forEach(function (g, j) { var d = g.obj.getWorldPosition(_a).distanceTo(cam); if (d < best) { best = d; i = j; } });
        }
        return jiggle(i, true);
      }
      if (lol) { wobble(lol.C.clone().add(new T.Vector3(0, 0, lol.R)), 1); if (opts.onPoke) opts.onPoke({ kind: 'lollipop' }); return true; }
      return false;
    }

    function onModelChange(model) {
      if (lol && lol.mesh) lol.mesh.matrixAutoUpdate = true;
      if (gum) gum.forEach(function (g) { g.obj.matrixAutoUpdate = true; });
      clearShards(); clearSparkles();
      sq.x = sq.v = 0;
      lol = null; gum = null;
      if (!model) return;
      shardFloor = -((model.userData.size && model.userData.size.h) || 6) / 2 + 0.02;
      if (model.userData.kind === 'gummy') gum = setupGummies(model);
      else lol = setupCandy(model);
    }

    function update(dt, now) {
      if (!ptr && !isBusy()) {
        if (omega) { spinner.rotation.y += omega * dt; omega *= Math.exp(-3.1 * dt); if (Math.abs(omega) < 1e-3) omega = 0; }
        pitchT *= Math.exp(-5 * dt);
      } else if (ptr && ptr.drag && now - ptr.lt > 50) omega *= Math.exp(-10 * dt);   // held still mid-drag
      pitch += (pitchT - pitch) * (1 - Math.exp(-9.7 * dt));
      tiltS.target = reduce ? 0 : clamp(-omega * 0.03, -0.2, 0.2);
      stepSpring(recX, dt); stepSpring(recZ, dt); stepSpring(tiltS, dt); stepSpring(sq, dt);
      lean.rotation.x += pitch + recX.x;
      lean.rotation.z += tiltS.x + recZ.x;
      if (lol) {
        if (lol.regrow) stepRegrow(dt);
        else if (lol.regrowAt && now >= lol.regrowAt) startRegrow();
        applySquash();
      }
      if (gum) stepJiggle(dt);
      stepShards(dt);
      stepSparkles(dt);
    }

    function dispose() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('lostpointercapture', onCancel);
      shardMeshes.forEach(function (m) { root.remove(m); m.dispose(); });
      shardGeos.forEach(function (g) { g.dispose(); });
      shardMat.dispose();
      root.remove(spPts); spGeo.dispose(); spMat.dispose();
      if (lol && lol.mesh) lol.mesh.matrixAutoUpdate = true;
      lol = gum = null;
    }

    onModelChange(ctx.getModel());
    return {
      update: update, onModelChange: onModelChange, dispose: dispose,
      bite: apiBite, poke: apiPoke,
      regrow: function () { return lol && lol.bites && !lol.regrow ? startRegrow() : false; },
      get dragging() { return !!ptr; },
      get bites() { return lol ? lol.bites : 0; },
      get active() { return { shards: shardsAlive, sparkles: spAlive, regrowing: !!(lol && lol.regrow), omega: omega }; }
    };
  }

  // ══ MAIN ═══════════════════════════════════════════════════════════════════════════════════════
  function create(mount, opts) {
    opts = opts || {};
    return loadThree().then(function (T) {
      // each candy builds in its own task: two candies on a page = two shorter tasks, not one long one
      return new Promise(function (res) { setTimeout(res, 0); }).then(function () { return build(T, mount, opts); });
    }).catch(function (err) {
      if (opts.fallback) opts.fallback.hidden = false;
      if (window.console) console.warn('[GloCandy] 3D unavailable:', err && err.message);
      return null;
    });
  }

  function pickQuality(q) { return q === 'high' || q === 'low' ? q : 'medium'; }

  function build(T, mount, opts) {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var preset = opts.preset === 'glass' ? 'jewel' : (opts.preset || 'gloss');
    var product = Object.assign({ kind: 'lollipop', color: '#FF1493' }, opts.product || {});
    var spinRate = (opts.spin == null ? 0.0032 : opts.spin) * 60;      // rad/s (opts.spin is per 60 Hz frame)
    var tilt = opts.tilt == null ? 0.24 : opts.tilt;
    var zoom = opts.zoom || 1;
    var quality = pickQuality(opts.quality);
    var useAssets = opts.assets !== false && !window.GLO_CANDY_NO_ASSETS;
    var W = mount.clientWidth || 400, H = mount.clientHeight || 500;
    var alive = true;
    var onRender = typeof opts.onRender === 'function' ? opts.onRender : null;   // opt-in per-frame hook

    var renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'low' ? 1.5 : 2));
    renderer.setSize(W, H, false);
    var envWhich = envName(opts.environment);
    configureRenderer(T, renderer, envWhich, opts);
    var canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'display:block;width:100%;height:100%;outline:none;-webkit-tap-highlight-color:transparent;';
    mount.appendChild(canvas);

    var scene = new T.Scene();
    var camera = new T.PerspectiveCamera(32, W / H, 0.1, 100);

    // lighting: environment (procedural now, the HDRI when it arrives) + one sun with soft shadows
    var env = null, rig = null;
    function applyEnv() {
      scene.environment = env.texture;
      if (opts.backdrop) { scene.background = env.texture; scene.backgroundBlurriness = 0.12; }   // lab / preview aid only
      rig.setSun(env.sun, env.which);
      renderer.toneMappingExposure = exposureFor(env.which, opts);
    }
    function setEnvironment(name) {
      var which = envName(name);
      if (env && env.which === which) return;
      var old = env;
      env = buildEnvironment(T, renderer, which, function (e) { if (alive && e === env) applyEnv(); }, useAssets);
      if (rig) applyEnv();
      if (old) old.dispose();
    }
    setEnvironment(envWhich);
    rig = buildLightRig(T, scene, env.which, env.sun);
    applyEnv();
    var hdrReady = env.ready;

    // root (yours to move) > pointer lean > spin > model
    var root = new T.Group(); scene.add(root);
    var lean = new T.Group(); root.add(lean);
    var spinner = new T.Group(); lean.add(spinner);

    // CC0 maps: per-instance clones of the page-wide images, swapped into the live materials on arrival.
    // They are decoded off the main thread, then uploaded ONE PER FRAME (or idle slot), and only then
    // handed to the materials, so no frame pays for six 1k uploads at once. The sugar maps are only
    // read on the CPU (once per page, at idle), never uploaded. ph = this renderer's own placeholders.
    var assets = { tex: null, ph: neutral(T), pending: useAssets }, texClones = [];
    var aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    var upQ = [], idleUp = false;                 // textures to upload ahead of use
    function queueUpload(t, done) { upQ.push({ t: t, done: done }); if (!idleUp) { idleUp = true; ric(idleUploads, 300); } }
    function pumpUpload() {
      if (!alive || !upQ.length) return false;
      var it = upQ.shift();
      try { renderer.initTexture(it.t); } catch (e) { /* it uploads on first use instead */ }
      if (it.done) it.done();
      return true;
    }
    function idleUploads() { idleUp = false; if (pumpUpload() && upQ.length) { idleUp = true; ric(idleUploads, 300); } }
    var texReady = (useAssets ? loadTextures(T) : Promise.resolve(null)).then(function (base) {
      assets.pending = false;
      if (!alive) return false;
      var gpu = {}, keys = [];
      if (base) {
        assets.tex = {};
        Object.keys(base).forEach(function (k) {
          if (/^sugar_/.test(k)) { assets.tex[k] = base[k]; return; }  // CPU-only source images
          var c = base[k].clone(); c.anisotropy = aniso; c.needsUpdate = true;
          gpu[k] = c; texClones.push(c); keys.push(k);
        });
      }
      // gummies: the live material takes the CC0 sugar source (or learns it is missing), and the
      // page-wide sugar is prepared at idle, long before anyone asks for gummies
      if (mats.gummy) mats.gummy.userData.applyAssets(assets);
      ric(function () { if (sugarSource(assets)) sugarLater(assets); else procSugarLater(); }, 1500);
      if (!keys.length) return false;
      return Promise.all(keys.map(function (k) {
        var im = gpu[k].image;
        return im && im.decode ? im.decode().catch(function () {}) : null;
      })).then(function () {
        if (!alive) return false;
        return new Promise(function (res) {
          keys.forEach(function (k, i) {
            queueUpload(gpu[k], i < keys.length - 1 ? null : function () {
              keys.forEach(function (kk) { assets.tex[kk] = gpu[kk]; });
              if (mats.lolly) applyLollipopAssets(mats.lolly, assets);
              res(true);
            });
          });
        });
      });
    }, function () { assets.pending = false; return false; });

    // One material set per kind, kept for this renderer's lifetime and recoloured on reuse: swapping
    // back and forth never recompiles a shader, and the kind not on show can be compiled at idle.
    var mats = { lolly: null, gummy: null };
    function lollyMats(hex) {
      if (!mats.lolly) mats.lolly = lollipopMaterials(T, preset, hex, assets);
      else recolor(mats.lolly.candy, hex);
      return mats.lolly;
    }
    function gummyMat(hex) {
      if (!mats.gummy) mats.gummy = gummyMaterial(T, hex, assets);
      else recolor(mats.gummy, hex);
      return mats.gummy;
    }
    function recolor(m, hex) {
      m.userData.gloTween = (m.userData.gloTween || 0) + 1;   // stop any colour tween still running on it
      m.color.set(hex);
      if (m.emissive) m.emissive.copy(m.color);
      if (m.attenuationColor) m.attenuationColor.copy(m.color);
    }
    function modelFor(p) {
      var m;
      if (p.kind === 'gummy') {
        var gm = gummyMat(p.color);
        m = buildGummies(T, gm, { quality: quality });
        m.userData.mat = gm; m.userData.mats = null;
      } else {
        m = buildLollipop(T, lollyMats(p.color), { tilt: tilt });
      }
      m.userData.kind = p.kind;
      return m;
    }
    var model = modelFor(product), incoming = null;
    spinner.add(model);

    // framing: back the camera off until the model fits the box at this aspect
    var camZ = 13, camZTarget = 13;
    function fitDistance(m) {
      var s = m.userData.size, half = Math.tan(T.MathUtils.degToRad(camera.fov / 2));
      var dh = (s.h / 2) / half, dw = (s.w / 2) / (half * camera.aspect);
      return Math.max(dh, dw) * 1.08 / zoom;
    }
    function applySize() {
      W = mount.clientWidth || W; H = mount.clientHeight || H;
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      camZTarget = fitDistance(model);
    }
    applySize();
    camZ = camZTarget;
    camera.position.set(0, 0, camZ);

    var dirty = false;
    var onWinResize = function () { dirty = true; };
    var ro = 'ResizeObserver' in window ? new ResizeObserver(function () { dirty = true; }) : null;
    if (ro) ro.observe(mount); else window.addEventListener('resize', onWinResize);

    var onScreen = true, paused = false;
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (e) { onScreen = e[0].isIntersecting; }, { threshold: 0 }) : null;
    if (io) io.observe(mount);

    // subtle lean toward the mouse (fine pointers only)
    var px = 0, py = 0, pxT = 0, pyT = 0;
    var finePointer = window.matchMedia('(pointer: fine)').matches;
    function onPointer(e) {
      var r = mount.getBoundingClientRect();
      pxT = clamp(((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1, -1.5, 1.5);
      pyT = clamp(((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1, -1.5, 1.5);
    }
    if (opts.pointerTilt !== false && finePointer && !reduce) window.addEventListener('pointermove', onPointer, { passive: true });

    // tweens are time-based, so they finish correctly even if the canvas was offscreen
    var tweens = [];
    function tween(dur, fn, done) { tweens.push({ t0: performance.now(), dur: Math.max(1, dur), fn: fn, done: done }); }
    function runTweens(now) {
      for (var i = tweens.length - 1; i >= 0; i--) {
        var tw = tweens[i], k = clamp((now - tw.t0) / tw.dur, 0, 1);
        tw.fn(k);
        if (k >= 1) { tweens.splice(i, 1); if (tw.done) tw.done(); }
      }
    }
    function lerpMatColor(mat, hex, ms) {
      var from = mat.color.clone(), to = new T.Color(hex), id = (mat.userData.gloTween || 0) + 1;
      mat.userData.gloTween = id;                  // a newer recolour of this material supersedes it
      tween(ms, function (k) {
        if (mat.userData.gloTween !== id) return;
        var e = easeInOut(k);
        mat.color.copy(from).lerp(to, e);
        if (mat.emissive) mat.emissive.copy(mat.color);
        if (mat.attenuationColor) mat.attenuationColor.copy(mat.color);
      });
    }

    // drag-to-spin, tap-to-bite / jiggle, inertia, recoil, shards (the interaction owns pointer input)
    var swapping = false, queued = null;
    var ix = attachInteraction({
      T: T, renderer: renderer, camera: camera, scene: scene, root: root, lean: lean, spinner: spinner,
      canvas: canvas, getModel: function () { return model; }, reduce: reduce, opts: opts,
      isBusy: function () { return swapping; }
    });

    function setProduct(p, o) {
      p = Object.assign({}, product, p || {});
      var ms = ((o && o.duration) || 0.9) * 1000;
      if (swapping) { queued = [p, o]; return; }
      if (p.kind === product.kind) {
        if (p.color !== product.color) lerpMatColor(model.userData.mat, p.color, ms * 0.8);
        product = p;
        return;
      }
      product = p;
      var out = model, inn = modelFor(p);
      if (reduce || !onScreen) {
        spinner.remove(out); disposeModel(out);
        spinner.add(inn); model = inn; ix.onModelChange(model); camZTarget = fitDistance(model);
        return;
      }
      swapping = true; incoming = inn;
      var spin0 = spinner.rotation.y;
      tween(ms * 0.42, function (k) {
        out.scale.setScalar(1 - easeInBack(k) * 0.999);
        spinner.rotation.y = spin0 + easeInBack(k) * 2.2;
      }, function () {
        if (!alive) return;
        spinner.remove(out); disposeModel(out);
        inn.scale.setScalar(0.001);
        spinner.add(inn); model = inn; incoming = null; ix.onModelChange(model);
        camZTarget = fitDistance(model);
        var spin1 = spinner.rotation.y;
        tween(ms * 0.62, function (k) {
          inn.scale.setScalar(Math.max(0.001, easeOutBack(k)));
          spinner.rotation.y = spin1 + (1 - k) * (1 - k) * 1.4;
        }, function () {
          swapping = false;
          if (queued) { var q = queued; queued = null; setProduct(q[0], q[1]); }
        });
      });
    }
    function disposeModel(m) {                     // geometry only: the materials stay (see mats)
      var geos = [];
      m.traverse(function (o) { if (o.isMesh && o.geometry && geos.indexOf(o.geometry) < 0) geos.push(o.geometry); });
      geos.forEach(function (g) { g.dispose(); });
    }

    // The kind not on show is prepared at idle: its materials are made and their shader programs
    // created against this scene's lights + environment. compile() only queues the compile / link in
    // the GPU process (nothing blocks until first use, by when it is long done), so the first switch
    // doesn't stall mid-animation. (Not compileAsync: its polling would outlive a dispose().)
    var warmed = false;
    function warmOther() {
      if (!alive || warmed) return;
      if (swapping || paused || !onScreen || document.hidden) { ric(warmOther, 4000); return; }
      warmed = true;
      var list = model.userData.kind === 'gummy' ? [lollyMats(product.color).candy, mats.lolly.stick] : [gummyMat(product.color)];
      var tmp = new T.Scene(), geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(new Float32Array(9), 3));
      list.forEach(function (m) { var o = new T.Mesh(geo, m); o.castShadow = o.receiveShadow = true; tmp.add(o); });
      try { renderer.compile(tmp, camera, scene); } catch (e) { /* compiles on first use instead */ }
      geo.dispose();
    }

    var frames = 0, raf = 0, last = performance.now(), clock = 0;
    function loop(now) {
      if (!alive) return;
      raf = requestAnimationFrame(loop);
      now = now || performance.now();
      var dt = clamp((now - last) / 1000, 0, 0.05);
      last = now;
      runTweens(now);
      if (paused || !onScreen || document.hidden) return;
      if (upQ.length) pumpUpload();                // one map per frame (idle slots take the rest)
      clock += dt;
      if (dirty) { dirty = false; applySize(); }
      if (!ix.dragging && !swapping && !reduce) spinner.rotation.y += spinRate * dt;   // time-based idle spin
      var kp = 1 - Math.exp(-3.1 * dt);
      px += (pxT - px) * kp; py += (pyT - py) * kp;
      lean.rotation.x = py * 0.12;                 // base lean; the interaction adds pitch / recoil / fling
      lean.rotation.z = -px * 0.08;
      camZ += (camZTarget - camZ) * (1 - Math.exp(-5 * dt));
      camera.position.z = camZ;
      if (opts.bob !== false && !reduce && model.userData.bob) model.userData.bob(clock);
      ix.update(dt, now);
      rig.fitShadow(model);
      renderer.render(scene, camera);
      frames++;
      if (onRender) onRender(api);               // the frame is still in the canvas: copy it now if needed
    }
    rig.fitShadow(model);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
    // the gummy cluster (page-wide geometry + bakes) is prepared at idle, so a switch to gummies is cheap
    ric(function () { if (alive) gummyGeoJob(T, quality === 'low' ? 18 : 30, true); }, 4000);

    var assetsReady = Promise.all([texReady, hdrReady]).then(function (r) { return !!(r[0] && r[1]); });
    assetsReady.then(function () { ric(warmOther, 3000); });

    var api = {
      THREE: T, scene: scene, camera: camera, renderer: renderer, root: root, interaction: ix,
      assetsReady: assetsReady,
      get frames() { return frames; },
      get product() { return Object.assign({}, product); },
      get environment() { return { name: env.which, hdr: env.hdr }; },
      get lighting() { return { env: env, rig: rig, quality: quality }; },     // debugging / QA
      get bites() { return ix.bites; },
      setProduct: setProduct,
      setColor: function (hex, o) { setProduct({ color: hex }, o); },
      setSpin: function (s) { spinRate = s * 60; },
      setEnvironment: setEnvironment,
      bite: function (at) { return ix.bite(at); },
      poke: function (i) { return ix.poke(i); },
      regrow: function () { return ix.regrow(); },
      pause: function () { paused = true; },
      resume: function () { paused = false; },
      dispose: function () {
        if (!alive) return;
        alive = false; cancelAnimationFrame(raf);
        if (ro) ro.disconnect(); else window.removeEventListener('resize', onWinResize);
        if (io) io.disconnect();
        window.removeEventListener('pointermove', onPointer);
        ix.dispose();
        disposeModel(model);
        if (incoming && incoming !== model) disposeModel(incoming);
        if (mats.lolly) { mats.lolly.candy.dispose(); mats.lolly.stick.dispose(); }
        if (mats.gummy) mats.gummy.dispose();
        texClones.forEach(function (t) { t.dispose(); });
        assets.ph.dispose();
        env.dispose(); rig.dispose(); scene.environment = null;
        renderer.dispose();
        try { renderer.forceContextLoss(); } catch (e) { /* already gone */ }   // free the context now, not at GC
        canvas.remove();
      }
    };
    if (opts.onReady) opts.onReady(api);
    return api;
  }

  window.GloCandy = {
    create: create, loadThree: loadThree, THREE_URL: THREE_URL, ASSET_BASE: ASSET_BASE,
    // modules, for reuse and the lab pages
    lighting: {
      ENVIRONMENTS: ENVIRONMENTS, envName: envName, assetsUsable: assetsUsable,
      configureRenderer: configureRenderer, buildEnvironment: buildEnvironment, buildLightRig: buildLightRig
    },
    attachInteraction: attachInteraction, patchBiteMaterial: patchBiteMaterial,
    _lab: {
      loadTextures: loadTextures, lollipopMaterials: lollipopMaterials, applyLollipopAssets: applyLollipopAssets,
      buildLollipop: buildLollipop, bakeAO: bakeAO, gummyMaterial: gummyMaterial, buildGummies: buildGummies,
      PRESETS: PRESETS, SUGAR: SUGAR,
      GUMMY_GEO: GUMMY_GEO,
      stats: function () {                  // QA: one-off costs and what the idle jobs have prepared
        var st = lollyCache ? { aoMs: lollyCache.ms, ballVerts: lollyCache.ball.position.length / 3 } : {};
        st.gummyGeo = Object.keys(GUMMY_GEO).map(function (k) { var J = GUMMY_GEO[k]; return { N: +k, done: J.done, ms: Math.round(J.ms) }; });
        st.sugar = SUGAR.real ? 'cc0' : SUGAR.real === false ? 'cc0 failed' : SUGAR.realJ ? 'cc0 processing' : SUGAR.realP ? 'cc0 decoding' : SUGAR.proc ? 'procedural' : 'not started';
        if (SUGAR.realJ) st.sugarMs = Math.round(SUGAR.realJ.ms);
        return st;
      }
    }
  };
})();
