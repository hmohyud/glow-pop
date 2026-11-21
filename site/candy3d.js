/* Model Pops — the site's 3D candy: the Collagen Boost and Green Veggies lollipops and the Liposomal Vitamin C
 * capsules (plus a generic gummy kind the site never shows).  v5 (three products, four lights)
 * Classic script, so it works from file:// as well as http. three.js is loaded from the CDN on demand
 * with a dynamic import(). Real CC0 assets (Poly Haven beach HDRIs, ambientCG paper / surface
 * imperfection maps — see assets/LICENSES.md) load relative to THIS script and never block: create()
 * renders at once with a procedural environment + procedural surface detail and upgrades in place
 * when the files arrive (same framing, no pop). On plain file:// (no --allow-file-access-from-files)
 * browsers refuse local images in WebGL; that is detected silently and the procedural look stays.
 *
 *   <script src="site/candy3d.js"></script>
 *   const candy = await GloCandy.create(el, { product: GloCandy.PRODUCTS['strawberry-pop'] });
 *   candy.setProduct(GloCandy.PRODUCTS['green-pop']);         // the same pop, recoloured (animated)
 *   candy.setProduct({ kind: 'capsule', color: '#F2E8CF' });  // the three ivory capsules (animated swap)
 *   candy.setColor('#F26A1B');                                // animated recolor, same shape
 *   candy.setEnvironment('snow');                             // relight: 'beach' | 'golden' | 'studio' | 'snow'
 *   candy.bite(); candy.poke(); candy.regrow();               // programmatic crunch / jiggle / heal
 *
 * Products ({ kind, color }; GloCandy.PRODUCTS has the line-up, keyed by the site's ids):
 *   'strawberry-pop'  { kind: 'lollipop', color: '#FF1493' }   No 1 Collagen Boost (the pack's pink)
 *   'green-pop'       { kind: 'lollipop', color: GREEN_POP }   No 2 Green Veggies: the same pop and material in the
 *                     green of its pack art (calibrated, see GREEN_POP): a stand-in (only the pack art shows this pop)
 *   'vitamin-c'       { kind: 'capsule', color: '#F2E8CF' }    No 3 Liposomal Vitamin C: three two-piece size-0
 *                     capsules, two crossed and one apart (the client's reference photo); color = the shell
 *   (aliases: PRODUCTS.pinkPop, .greenPop, .capsules.)  { kind: 'gummy', color } still draws the gumdrops.
 *   The pops are one product shape: the material model is the approved pop's, only the colour differs.
 *   A product of the same kind recolours in place; another kind plays the swap (spin out / pop in). A new
 *   kind without a colour takes its own default.
 *
 * Options (all optional):
 *   product      { kind, color } (see above)                         default: the pink Collagen Boost pop
 *   kinds        the kinds this page may switch to, prepared at idle (their shaders compiled, geometry made)
 *                so a switch never stalls: 'lollipop' | 'capsule' | 'gummy'
 *                (default ['lollipop', 'capsule']; the one on show is always added)
 *   ground       capsules: true = they rest on a transparent ground that shows only their soft contact
 *                shadows (sun shadow + contact occlusion); false = they float, no ground. Default: true,
 *                unless onRender is set (a page that copies the frames to cast its own shadow wants the
 *                capsules alone in the canvas)
 *   preset       'gloss' | 'jewel' (alias 'glass') | 'iridescent' | 'satin'   (default 'gloss')
 *   environment  'beach'  (default) midday Mondello beach HDRI, crisp high sun
 *                'golden' Umhlanga sunrise HDRI, warm low glow
 *                'studio' neutral procedural studio (no download)
 *                'snow'   procedural winter day (no download): high-key and cool, a white snowfield, a pale
 *                         blue sky, a hazy alpine skyline. Light only: the candy's material never changes
 *                         with the environment
 *                (aliases: 'sunrise' / 'sunset' / 'golden-hour', 'neutral', 'winter' / 'alpine')
 *                Every one has the sun up-left (azimuth -40 .. -48, elevation 46 .. 52): shadows fall right / back.
 *   spin         idle auto-spin, radians per 60 Hz frame (default 0.0032; 0 = still). Time-based:
 *                the same speed on 60 / 120 / 144 Hz screens. The capsules sway instead (CAPSULE.sway, at the
 *                same speed through the middle of the swing): they never turn round, idle.
 *   tilt         lean of the lollipop in radians (default 0.24)
 *   drag         grab-and-fling to spin, with inertia (default true)
 *   bite         tap the lollipop to take a crunchy bite (default true; false = it just wobbles). A tap on
 *                the capsules always just wobbles them (never a bite)
 *   interactive  false = no pointer interaction at all (no drag, no taps)
 *   pointerTilt  subtle lean toward the mouse (default true)
 *   bob          gentle breathing bob (default true; the capsules rest, they never bob)
 *   zoom         >1 renders the candy bigger in its box (default 1)
 *   exposure     brightness, relative: 1.2 = the environment's calibrated exposure (the legacy
 *                default); other values trim it gently (sqrt, clamped 0.75 .. 1.3)
 *   quality      'high' | 'medium' (default) | 'low': 'low' caps the pixel ratio at 1.5, lightens the
 *                gummy meshes and trims bite shards / sparkles
 *   assets       false = never download HDRIs / textures (procedural look only)
 *   env          legacy 4-colour studio gradient — ignored (the light comes from `environment`)
 *   onBite(e)    e = { bites, max, point (root-space Vector3), regrowIn (ms) }
 *   onPoke(e)    e = { kind: 'gummy' | 'capsule', index } or { kind: 'lollipop' } (a wobble)
 *   onRegrow()   the bitten lollipop finished healing
 *   fallback     element to un-hide if WebGL / the CDN is unavailable
 *   backdrop     preview aid: show the (blurred) environment behind the candy (default false;
 *                pages keep a transparent canvas)
 *   onReady(api)
 *   onRender(api)  called right after every frame the candy renders (default: none, zero cost; frames
 *                are skipped while it is offscreen, paused or the tab is hidden). The canvas
 *                (api.renderer.domElement) holds that frame only until the current task ends (no
 *                preserveDrawingBuffer), so this is the moment to copy it, e.g. drawImage() it into a
 *                small 2D canvas for a cast shadow. It runs every rendered frame: keep it cheap.
 *
 * Gestures: tap (< 6 px and < 350 ms) = bite / jiggle / wobble; anything else is a drag-to-spin with
 * inertia (the capsules turn on their ground, like a plate, and drift back to their photo pose once the
 * fling has run out). touch-action stays pan-y, so vertical swipes scroll the page and never bite.
 *
 * The mount element should have a real size (the canvas fills it). The candy is framed to fit the box
 * at any aspect ratio. Returned api:
 *   setProduct(product, {duration}) · setColor(hex, {duration}) · setSpin(rad per 60 Hz frame)
 *   setEnvironment(name) · environment (getter { name, hdr }) · assetsReady (Promise<bool>)
 *   bite([{clientX, clientY}]) -> bool (false on capsules) · poke([index]) -> bool · regrow() -> bool
 *   bites (getter) · pause() · resume() · dispose() · frames · product · interaction · lighting (QA)
 *   root (THREE.Group you may move / scale / rotate) · THREE · scene · camera · renderer
 * window.GloCandy: create · PRODUCTS · ENVIRONMENT_NAMES · kinds · supports(kind) · loadThree · THREE_URL ·
 *   ASSET_BASE · lighting {ENVIRONMENTS, envName, ...} · attachInteraction · patchBiteMaterial · _lab (QA)
 *
 * Hierarchy: scene > root > lean > spinner > model (root.children[0] = lean, lean.children[0] =
 * spinner, spinner.children[0] = model; model.userData.kind = 'lollipop' | 'capsule' | 'gummy'). The bite
 * shards and sparkles are added to root AFTER lean. The sun lives in the scene (like the environment it
 * stays put when a page rotates root) and its shadow frustum is refitted to the model every frame, so it
 * follows root moves / scales and model swaps. The capsules' ground tilts with them (userData.pitch: the
 * view from above, eased across a swap). The canvas stays transparent (no scene.background).
 *
 * Performance: create() resolves after the first frame, which waits for its shader programs without
 * blocking (compile(), then KHR_parallel_shader_compile polling; the panorama is painted in a task of its
 * own first), so the only long task is the ~0.1 s build itself, none after it. Heavy one-off CPU work
 * (HDR parse + grade, the gummy cluster and its sugar, the capsule cluster and its AO) runs as
 * job()s of short steps, at idle, ahead of the first switch; CC0 maps are decoded off-thread and uploaded
 * one per frame; each renderer keeps one material set per kind (recoloured on reuse; the other kinds in
 * `kinds` compiled at idle, one per idle slot), so swaps never compile.
 *
 * ── MODULES (each self-contained; needs only THREE = T) ─────────────────────────────────────────
 * WORK
 *   job(steps, {idle, budget, timeout}) -> J {done, ms, promise, flush(), hurry()}: runs a list of
 *   short steps a few ms per slice (idle slices never wait longer than ~40 ms); flush() = finish now
 * ASSETS
 *   ASSET_BASE (assets/ next to this script; window.GloCandyAssets overrides) · assetsUsable() ->
 *   Promise<bool> (false on plain file://, probed silently) · loadTextures(T) -> Promise<{name: Texture}>
 *   (the 6 CC0 maps, once per page; every candy instance clones what it draws with)
 * LIGHTING
 *   ENVIRONMENTS (beach | golden | studio | snow tuning: sun, shadow map, exposure, the procedural paint;
 *     light only, never the candy's material) · envName(x) · configureRenderer(T, renderer, which, opts)
 *   buildEnvironment(T, renderer, which, onReady, useAssets) -> env {which, texture, sun, hdr, mean, ready, dispose()}
 *     Builds a procedural PMREM in the palette of `which` synchronously (frame 1 is lit), then loads the
 *     HDRI, cuts the sun out of it (its energy becomes the DirectionalLight, so nothing is counted
 *     twice and the env is pure unshadowed sky + sand fill), mirrors / rotates it so the sun sits
 *     front-left, grades it and swaps env.texture in place (onReady(env)). env.ready: Promise<bool>.
 *     The procedural panorama is upsampled to the HDRIs' 1024 x 512, so both PMREMs are the same size
 *     and the upgrade recompiles nothing; the HDRI is parsed + processed in short slices. env.mean =
 *     the panorama's mean radiance (linear RGB, solid-angle weighted), measured while it is made.
 *     'snow' is procedural only: a pale blue sky over white haze, a hazy ridged skyline (snowRidge(),
 *     made once per page), a snowfield at ~1.5x the sky's radiance, a crisp sun glow.
 *   buildLightRig(T, scene, which, sun) -> rig {sun, lights, dir, setSun(info, which), fitShadow(model), dispose()}
 *     One shadow-casting DirectionalLight (dir: unit vector toward it, world space). fitShadow(model)
 *     right before every render: flags the model's meshes cast + receive (not userData.gloNoShadow ones),
 *     fits a tight ortho shadow camera to the model's world bounding sphere (quantised radius,
 *     texel-snapped centre: no crawling edges), bias scaled to the texel. Tiny maps (224..320 texels
 *     across the model) = soft sun penumbra in model units on any device.
 *   GROUND_SHADE (per environment: the capsules' ground shade colour + sun-shadow / contact opacities)
 * LOLLIPOP
 *   lollipopMaterials(T, preset, hex, assets) -> { candy, stick, preset }   (the approved pop's material:
 *     every lollipop on the site, pink or green, is this exact model; only the colour differs)
 *     candy: MeshPhysicalMaterial (no clearcoat, no bumpMap, emissive = colour at ~0.03) + shader patch:
 *     triplanar CC0 smudge roughness + micro-normal (object space: no UV poles, sticks to the candy;
 *     'gloss' = the pack's smooth candy, only a whisper of either), softer reflections below the
 *     horizon (a 1k HDRI's sand would mirror as grain), light scattering at the terminator, a
 *     translucent body ('gloss': PRESETS.flat of the diffuse light evened out to the mean irradiance
 *     over the candy, gloMean = environment mean radiance x pi + sun / 4, synced every frame, and the
 *     diffuse scaled by PRESETS.body, so a sunlit top stays the pack's saturated pink instead of
 *     blowing out to pastel), baked AO (attribute gloAO) on indirect light (ignored on a fresh cut),
 *     and the bite attribute gloBite (fresh glassy fracture, crater occlusion, stress halo).
 *     stick: MeshStandardMaterial (emissive exactly 0x000000): plain white satin, the CC0 paper only
 *     whispers (faint fibre, barely-there glued edge) + AO.
 *   applyLollipopAssets(mats, assets)   swaps the real maps in when they arrive (no recompile)
 *   buildLollipop(T, mats, {tilt}) -> Group  userData { kind:'lollipop', size:{w:3.4,h:6}, candy,
 *     stick, collar, tilt, mats, mat, bob(t seconds) }. candy: the pack's head, ONE watertight lathe
 *     (192 columns x ~160 rows): a true sphere (r LOLLY.RB 1.243 at y 1.5 in the tilt group) with a raised
 *     band round its equator (outer r LOLLY.R 1.33 = the old ball's width, so it stands out 7% of the
 *     ball's radius, as on the pack art; 0.36 tall, centred on the equator, outer edges rounded 0.04,
 *     0.022 fillets where it meets the ball). Its meridian is the zero set of headSDF2 (sphere +
 *     rounded band, round union). geometry.userData
 *     { origPositions, origNormals, radius (the ball), outerRadius (the band), center, head (profile) }.
 *     collar: candy meniscus around the stick (child of candy, same material); stick y -2.8 .. 0.6,
 *     r 0.135 (0.11 x the ball's diameter). The green pop is this same pop, shape, stick and all.
 *   bakeAO(positions, normals, occluders, {rays, dist, strength, inside}) -> Float32Array (cached per
 *     page; the head and stick are lathes, so they bake one vertex per ring; occluders: spheres,
 *     capsules, planes and the band's rounded "puck", so the band shades the ball beside it). Buried
 *     vertices get `inside` (0.3): a crease still blends dark, anything a deep bite exposes is shaded.
 * CAPSULES
 *   CAPSULE: real size-0 proportions, 1 unit = 10 mm: closed length 21.7 mm, body 7.34 mm, cap 7.64 mm
 *     across and 10.9 mm long; the cap overlaps the body, so the seam is the cap's rim (a 0.15 mm step,
 *     softly rounded). pitch = the view from above (the ground tilts toward the camera, 0.9 rad); sway = how
 *     far the idle cluster swings either side of its photo pose (it never turns round: see CAPSULE).
 *   CAPSULE_LAYOUT: A lies flat, B stands its foot on the ground in front of A and leans across it (its
 *     lean is solved: raised until it just touches A), C lies apart; matched to the reference photo.
 *   capsuleMaterials(T, hex) -> { shell, ground }
 *     shell: MeshPhysicalMaterial, an ivory gelatin satin (roughness 0.3); the powder inside shows
 *     faintly through it (CAPSULE.powder, a pale cream, mixed in by how densely it packs: soft clumps,
 *     fine grain, a few denser specks, in each capsule's own space), a slightly clearer cap tip, light
 *     wrapping past the terminator through the thin shell (end translucency), baked contact AO.
 *     ground: ShaderMaterial on a transparent disc, analytic per capsule: a soft sun shadow (its penumbra
 *     widening with the distance to the caster) in the environment's shade colour and contact occlusion
 *     ((r / l)^6: dark at the contact, gone a radius out) warmed by the light through the capsules.
 *   buildCapsules(T, mats, {ground}) -> Group > cluster > 3 capsule meshes (+ the ground). The mesh, poses
 *     and AO bake are made once per page (capsuleGeoJob, at idle), then copied. userData { kind:'capsule',
 *     size, pitch, pieces (each with userData.rest), cluster, ground, mats, mat, sync(sunDir, which) }:
 *     sync() runs every frame (the ground's shadows follow the sun, the spin and a rocking capsule; a
 *     hidden piece casts nothing).
 * GUMMIES
 *   gummyMaterial(T, hex, assets) -> MeshPhysicalMaterial (bumpMap = packed sugar map from frame 1,
 *     emissive = colour at 0.02). Sugar, best first: the high-passed CC0 Candy003 grains (processed
 *     once per page, at idle, in ~250 short steps) > procedural crystals (no assets) > a plain stand-in
 *     while the CC0 grains are still being made; upgrades happen in place (userData.sugar tells which;
 *     userData.applyAssets(assets) hands it the CC0 source when that arrives). This copy no longer loads
 *     the CC0 sugar maps (see TEXTURES), so its gummies get the procedural crystals.
 *   buildGummies(T, mat, {quality}) -> Group > cluster > 3 individually shaped gumdrops that touch
 *     (ray-cast contact solve) with baked contact AO, gel thickness and sugar coverage. The shapes and
 *     bakes are deterministic: made once per page + quality (gummyGeoJob, prepared at idle), copied.
 *     userData { size:{w:3.9,h:3.6}, pieces, cluster, bounds, bob(t seconds) }
 * INTERACTION
 *   attachInteraction(ctx) -> ix {update(dt, now), onModelChange(model), bite([at]), poke([i]),
 *     regrow(), dispose(), dragging, bites, active}
 *     ctx = { T, renderer, camera, scene, root, lean, spinner, canvas, getModel(), reduce, opts, isBusy() }
 *     The loop ASSIGNS the base lean, calls bob(), then ix.update() ADDS drag pitch / fling tilt /
 *     bite recoil, integrates spin inertia, squashes the candy / jiggles gummies / rocks capsules through
 *     their own transforms, and runs the pooled shards + sparkles (added to root after lean, never in
 *     shadows). A capsule tap = a damped rock from its rest pose: a lying one rolls a little (moving
 *     sideways as it rolls), the leaning one nods on its foot; never a bite.
 *     A bite = one scoop + a crescent of 7 tooth spheres, carved onto smooth-max(own surface,
 *     -smooth-union(cutters)): the ball's vertices are Newton-projected along its gradient, the band's
 *     move down their own rays from the centre (so its ledges never fold over the ball and its cut ends
 *     stay clean walls); crisp scalloped rims, a deeper denser interior, a stress-white edge, on the
 *     ball and the band alike. The hit test traces the head's exact profile; a hit on the band bites in
 *     from the ball's surface under it (as deep as anywhere). Hits low on the ball slide up to BITE.minY
 *     so the crater never opens the stick junction. It regrows after a pause. Shards take a free slot
 *     first (else the oldest), so three quick bites never recycle a shard mid-air.
 *   patchBiteMaterial(mat)   adds the gloBite attribute to a foreign Standard/Physical material
 */
(function () {
  'use strict';

  var THREE_URL = 'https://unpkg.com/three@0.160.0/build/three.module.min.js';   // r160, minified (same code)
  var threeP = null;
  function loadThree() { return threeP || (threeP = import(THREE_URL)); }

  var easeOutBack = function (t) { var c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  var easeInBack = function (t) { var c = 1.70158; return (c + 1) * t * t * t - c * t * t; };
  var easeInOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var smooth = function (a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };   // smoothstep
  var smooth01 = function (t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
  var DEG = Math.PI / 180;

  // WebGL context restore (see build()): three.js registers a 'dispose' listener on every geometry, texture, material
  // and render target it uploads, and does so again for the new context. The dead context's listeners would delete
  // its dead GL objects through the new one when a swap or dispose() frees them (a WebGL warning each), so they are
  // dropped (three.js r160 keeps them in o._listeners). The library's own 'dispose' listeners are marked keep().
  function keep(fn) { fn.gloKeep = true; return fn; }
  function forgetDeadGL(o) {
    var L = o && o._listeners && o._listeners.dispose;
    if (L) L.slice().forEach(function (fn) { if (!fn.gloKeep) o.removeEventListener('dispose', fn); });
  }

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
      // assets/ next to this script (site/assets/ for site/candy3d.js); the old prototype forks sat two folders deeper
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

  // The CC0 maps (name -> sRGB colour data?), loaded once per page. (The gummies' CC0 sugar maps are not loaded:
  // the site never shows gummies, so that kind draws its procedural sugar.)
  var TEXTURES = {
    smudge_spots: false, smudge_streaks: false, smudge_spots_normal: false,   // candy gloss break-up
    paper_color: true, paper_rough: false, paper_normal: false                // rolled-paper stick
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
    },
    snow: {                                    // procedural (no download): a clear winter day on fresh snow
      hdri: null,
      sun: { azimuth: -40, elevation: 50, intensity: 4.0, color: [1.0, 0.95, 0.86] },   // crisp, a touch warm
      shadowMap: 320,                          // crisp winter sun
      exposure: 0.8, glowElevation: 50, paint: 'snow'
    }
  };
  // Ground shadow tint per environment (the capsules' contact shadows): shade on a sunny day is lit by the
  // sky, so it is cool; [r, g, b] in display sRGB, then [sun shadow opacity, contact opacity].
  var GROUND_SHADE = {
    beach: { color: [0.13, 0.19, 0.30], k: [0.34, 0.62] },
    golden: { color: [0.24, 0.17, 0.27], k: [0.36, 0.62] },
    studio: { color: [0.16, 0.16, 0.19], k: [0.30, 0.62] },
    snow: { color: [0.18, 0.30, 0.52], k: [0.30, 0.55] }
  };
  function envName(x) {
    x = String(x || 'beach').toLowerCase();
    if (x === 'golden' || x === 'sunrise' || x === 'sunset' || x === 'golden-hour') return 'golden';
    if (x === 'studio' || x === 'neutral') return 'studio';
    if (x === 'snow' || x === 'winter' || x === 'alpine') return 'snow';
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
    var mR = 0, mG = 0, mB = 0, mW = 0;          // mean radiance of the graded panorama (solid-angle weighted)
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
        var dstRow = (H - 1 - yp) * W, wr = Math.cos((0.5 - (yp + 0.5) / H) * Math.PI), rR = 0, rG = 0, rB = 0;
        for (var x = 0; x < W; x++) {
          var q = (yp * W + x) * 3;
          var R = lin[q], G = lin[q + 1], B = lin[q + 2], L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
          R = Math.min(60000, Math.max(0, L + (R - L) * sat) * tR); G = Math.min(60000, Math.max(0, L + (G - L) * sat) * tG); B = Math.min(60000, Math.max(0, L + (B - L) * sat) * tB);
          rR += R; rG += G; rB += B;
          var xm = cfg.mirror ? W - 1 - x : x, d = (dstRow + (xm + shift) % W) * 4;
          out[d] = toHalf(R); out[d + 1] = toHalf(G); out[d + 2] = toHalf(B); out[d + 3] = one;
        }
        mR += rR * wr; mG += rG * wr; mB += rB * wr; mW += W * wr;
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
      st.result.texture.userData.mean = [mR / mW, mG / mW, mB / mW];   // (see the candy's translucent body)
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
    },
    // a bright winter day, high-key and cool: a pale blue sky over almost white haze, a hazy alpine skyline
    // (sunlit snow faces, pale blue shade faces), a white snowfield that outshines the sky (warm toward the
    // sun, a little bluer in the drifts away from it) and a crisp sun glow.
    snow: function (x, y, z, c, P) {
      var az = Math.atan2(x, z), R = snowRidge(), n = R.el.length;
      var fk = ((az / (2 * Math.PI) + 1) % 1) * n, k0 = Math.floor(fk) % n, k1 = (k0 + 1) % n, fr = fk - Math.floor(fk);
      var ridge = R.el[k0] + (R.el[k1] - R.el[k0]) * fr, slope = R.sl[k0] + (R.sl[k1] - R.sl[k0]) * fr;
      var dSun = Math.atan2(Math.sin(az - P.az), Math.cos(az - P.az));           // azimuth from the sun
      var toward = Math.cos(dSun);                                                // 1 = the sun's side of the sky
      var el = Math.asin(clamp(y, -1, 1));
      if (y >= 0) {
        var t = Math.pow(1 - y, 2.4);                                             // pale blue zenith -> white haze
        c[0] = 0.5 + 0.56 * t; c[1] = 0.68 + 0.42 * t; c[2] = 1.02 + 0.16 * t;
        if (el < ridge) {                                                         // the mountains, softened by the haze
          var lit = smooth(-0.35, 0.35, slope * (dSun > 0 ? 1 : -1)) * 0.75 + 0.25 * smooth(-0.6, 0.6, toward);
          var mr = 0.72 + 0.56 * lit, mg = 0.82 + 0.48 * lit, mb = 1.08 + 0.3 * lit;
          var haze = 0.45 + 0.35 * (1 - el / Math.max(1e-3, ridge));
          c[0] = mr + (1.06 - mr) * haze; c[1] = mg + (1.1 - mg) * haze; c[2] = mb + (1.18 - mb) * haze;
        }
      } else {
        // the snowfield: sunlit fresh snow, a soft glare toward the sun, faint drifts
        var s = Math.pow(Math.min(1, -y * 1.2), 0.6), drift = 0.04 * Math.sin(az * 9 + 1.3) * Math.sin(az * 4 - 0.7) * (1 - s);
        var w = 0.5 + 0.5 * toward;
        c[0] = 1.42 + 0.12 * w - 0.1 * s + drift; c[1] = 1.45 + 0.08 * w - 0.08 * s + drift; c[2] = 1.52 - 0.02 * w - 0.03 * s + drift;
        var gl = Math.pow(Math.max(0, toward), 24) * (1 - s) * 0.6;
        c[0] += gl; c[1] += gl * 0.97; c[2] += gl * 0.9;
      }
      var cg = x * P.glow[0] + y * P.glow[1] + z * P.glow[2];
      if (cg > 0) {
        var hh = Math.pow(cg, 220) * 6.0 + Math.pow(cg, 20) * 0.45;
        c[0] += hh; c[1] += hh * 0.97; c[2] += hh * 0.9;
      }
    }
  };
  // The snow panorama's skyline, made once per page: elevation (rad) and slope per azimuth step. Ridged
  // sums of sines (sharp peaks, soft cols), a nearer range in front of a lower, hazier one.
  var SNOW_RIDGE = null;
  function snowRidge() {
    if (SNOW_RIDGE) return SNOW_RIDGE;
    var n = 1024, near = new Float32Array(n), far = new Float32Array(n), r = rng(271), W1 = [], W2 = [], i, k;
    for (i = 0; i < 7; i++) W1.push([2 + Math.floor(r() * (3 + i * 4)), r() * 6.283, 1 / (1 + i * 0.7)]);
    for (i = 0; i < 6; i++) W2.push([3 + Math.floor(r() * (5 + i * 5)), r() * 6.283, 1 / (1 + i * 0.6)]);
    function ridged(W, a) { var v = 0; for (var j = 0; j < W.length; j++) v += (1 - Math.abs(Math.sin(a * W[j][0] + W[j][1]))) * W[j][2]; return v; }
    var mn1 = 1e9, mx1 = -1e9, mn2 = 1e9, mx2 = -1e9;
    for (k = 0; k < n; k++) {
      var a = k / n * Math.PI * 2;
      near[k] = ridged(W1, a); far[k] = ridged(W2, a);
      mn1 = Math.min(mn1, near[k]); mx1 = Math.max(mx1, near[k]); mn2 = Math.min(mn2, far[k]); mx2 = Math.max(mx2, far[k]);
    }
    var el = new Float32Array(n), sl = new Float32Array(n);
    for (k = 0; k < n; k++) {
      var e1 = Math.pow((near[k] - mn1) / (mx1 - mn1), 1.7) * 7.5 + 0.8, e2 = Math.pow((far[k] - mn2) / (mx2 - mn2), 1.3) * 4.5 + 1.6;
      el[k] = Math.max(e1, e2) * DEG;
    }
    for (k = 0; k < n; k++) sl[k] = (el[(k + 1) % n] - el[(k - 1 + n) % n]) / (2 * 2 * Math.PI / n);
    return (SNOW_RIDGE = { el: el, sl: sl });
  }
  // Painted at 512 x 256 (cheap), then 2x-upsampled to 1024 x 512 = the HDRIs' size, so the PMREM
  // (whose size every env-mapped shader program is keyed on) is identical before and after the HDRI
  // lands: the upgrade swaps a texture and recompiles nothing.
  function proceduralEquirect(T, which) {
    var cfg = ENVIRONMENTS[which], W = 512, H = 256, out = new Uint16Array(W * H * 4);
    var toHalf = T.DataUtils.toHalfFloat, one = toHalf(1), paint = PAINT[cfg.paint] || PAINT.studio;
    var P = { az: cfg.sun.azimuth * DEG, gel: cfg.glowElevation * DEG, glow: sunDirArray(cfg.sun.azimuth, cfg.glowElevation) };
    var c = [0, 0, 0], m = [0, 0, 0, 0];
    for (var y = 0; y < H; y++) {
      var ph = (0.5 - (y + 0.5) / H) * Math.PI, cp = Math.cos(ph), sp = Math.sin(ph), dstRow = (H - 1 - y) * W;
      for (var x = 0; x < W; x++) {
        var th = ((x + 0.5) / W - 0.5) * 2 * Math.PI;
        paint(cp * Math.cos(th), sp, cp * Math.sin(th), c, P);
        var d = (dstRow + x) * 4;
        out[d] = toHalf(c[0]); out[d + 1] = toHalf(c[1]); out[d + 2] = toHalf(c[2]); out[d + 3] = one;
        m[0] += c[0] * cp; m[1] += c[1] * cp; m[2] += c[2] * cp; m[3] += cp;
      }
    }
    var tex = makeEquirect(T, upsample2(out, W, H), W * 2, H * 2);
    tex.userData.mean = [m[0] / m[3], m[1] / m[3], m[2] / m[3]];   // mean radiance (see the candy's translucent body)
    return tex;
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
    var cfg = ENVIRONMENTS[which], pm = new T.PMREMGenerator(renderer), rt = null, dead = false, src0 = null;
    var env = { which: which, texture: null, sun: null, hdr: false, mean: null, ready: null, dispose: dispose, restore: restore };
    function use(src, sun, hdr) {
      env.mean = (src.userData && src.userData.mean) || null;   // its mean radiance (linear RGB), kept on the CPU
      var next = pm.fromEquirectangular(src);
      src.dispose();                        // frees this renderer's GPU copy; the CPU data stays cached
      if (rt) rt.dispose();
      rt = next; env.texture = rt.texture; env.sun = sun; env.hdr = hdr; src0 = src;
    }
    // After a WebGL context restore the PMREM (a render target: it has no CPU copy) comes back empty, so it is made
    // again from the panorama in use (its pixels stay on the CPU, page-wide), with a new generator: the old one's
    // targets died with the old context. The dead target is dropped, not disposed (its GL objects are gone already).
    // The caller re-applies env.texture.
    function restore() {
      if (dead) return;
      var waiting = !!pm;                   // the HDRI is still on its way: keep a generator for it
      pm = new T.PMREMGenerator(renderer);
      if (src0) { rt = pm.fromEquirectangular(src0); env.texture = rt.texture; src0.dispose(); }
      if (!waiting) { pm.dispose(); pm = null; }
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
        // (userData.gloNoShadow: a mesh outside the shadow map, e.g. the capsules' contact-shadow ground)
        model.traverse(function (o) { if (o.isMesh && !o.userData.gloNoShadow) { o.castShadow = true; o.receiveShadow = true; } });
      }
      model.updateWorldMatrix(true, true);
      sph.makeEmpty();
      model.traverse(function (o) {
        if (!o.isMesh || !o.visible || o.userData.gloNoShadow) return;
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
    // after a WebGL context restore: the shadow map's target died with the old context. It is dropped, not disposed
    // (its GL objects are gone already), and three.js makes a fresh one at the next render.
    function restore() { light.shadow.map = null; light.shadow.needsUpdate = true; }
    // dir: unit vector toward the sun (world space), kept current by setSun
    return { sun: light, lights: [light], dir: dir, setSun: setSun, fitShadow: fitShadow, dispose: dispose, restore: restore };
  }
  // ══ end LIGHTING ═══════════════════════════════════════════════════════════════════════════

  // ══ LOLLIPOP ═════════════════════════════════════════════════════════════════════════════════════
  // ── lollipop: materials ────────────────────────────────────────────────
  // The pack's lollipop: a true sphere (RB) with a raised moulded band round its equator. The band's
  // outer radius R is the old ball radius, so the head keeps its old width and every layout its framing.
  // BAND (ball-local, y up): h full height, y centre (the equator, as on the pack), edge = rounding of its
  // outer edges, fillet = the small concave round where its flat faces meet the ball.
  var LOLLY = { R: 1.33, RB: 1.243, CY: 1.5, SR: 0.135, TOP: 0.6, BOT: -2.8, SEG: 192,
    BAND: { h: 0.36, y: 0, edge: 0.04, fillet: 0.022 } };

  // Surface tuning per preset. rough/spots/streaks/rmin/rmax: roughness = rough + spots*S + streaks*K
  // (S, K from the CC0 Surface Imperfections maps); nrm: micro-normal strength; sss: wrap light at the
  // terminator (light scattering in the sugar); alb: colour-density variation along the pour streaks;
  // E: emissive (near zero; 04-prism needs it non-zero); ground: roughness of reflections that look
  // below the horizon (a 1k HDRI's sand mirrors as grain on a glossy ball; real candy blurs it).
  // (sss is calibrated against the lighting rig's cut-out sun, ~4.4 at midday)
  // 'gloss' is the pack's candy: smooth, saturated, crisp highlights; the smudge maps only break the
  // gloss up a hair (no visible grain).
  // flat: how much of the diffuse light the candy body evens out (hard candy is translucent: light that
  // enters on the sunny side scatters through the sugar and leaves all over, so a sunlit top does not
  // blow out to pastel and the shade side stays a deep, saturated colour, as on the pack).
  var PRESETS = {
    gloss:      { rough: 0.045, spots: 0.035, streaks: 0.02, rmin: 0.035, rmax: 0.1, nrm: 0.1, sss: 0.1, alb: 0.035, E: 0.03, env: 1.0, ground: 0.2, flat: 0.6, body: 0.8 },
    jewel:      { rough: 0.03, spots: 0.05, streaks: 0.03, rmin: 0.02, rmax: 0.14, nrm: 0.25, sss: 0.0, alb: 0.1, E: 0.04, env: 1.15, ground: 0.16, flat: 0 },
    iridescent: { rough: 0.06, spots: 0.08, streaks: 0.04, rmin: 0.05, rmax: 0.2, nrm: 0.3, sss: 0.08, alb: 0.1, E: 0.03, env: 1.1, ground: 0.2, flat: 0 },
    satin:      { rough: 0.34, spots: 0.12, streaks: 0.08, rmin: 0.25, rmax: 0.55, nrm: 0.3, sss: 0.09, alb: 0.12, E: 0.03, env: 1.0, ground: 0.34, flat: 0 }
  };
  var TRI = { spots: 0.42, streaks: 0.29 };                 // triplanar tiles per object unit
  // The pack's stick is plain, clean white with a soft satin sheen: the CC0 paper only whispers (a faint
  // fibre normal, a barely-there glued edge at object azimuth 0, where the paper's UV seam also sits;
  // the stick mesh is turned by `turn` so the edge shows front-left at rest).
  var PAPER = { w: 0.035, slope: 0.08, dark: 0.02, turn: -2.0, aroundTiles: 0.5, normal: 0.3, rough: 0.5 };

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
    mat.customProgramCacheKey = function () { return 'glo-candy-v5'; };
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
          'uniform vec4 gloTex;', 'uniform vec4 gloRough;', 'uniform float gloAlb;', 'uniform float gloGround;',
          'uniform vec2 gloBody;', 'uniform vec3 gloMean;',
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
          '  vec3 gNo = normalize( tX.zyx * gW.x + tY.xzy * gW.y + tZ.xyz * gW.z );',   // (the band is the mould seam now)
          '  normal = normalize( normalMatrix * gNo );',
          '  vec3 gR = inverseTransformDirection( reflect( - normalize( vViewPosition ), normal ), viewMatrix );',
          '  roughnessFactor = mix( roughnessFactor, max( roughnessFactor, gloGround ), 1.0 - smoothstep( -0.35, 0.02, gR.y ) );',   // the sand reflects soft (no grain)
          '}'
        ].join('\n'))
        .replace('#include <aomap_fragment>', [
          '#include <aomap_fragment>',
          // a fresh cut is new surface: the crease AO baked for the uncut head (the band's fillets) must
          // not ride into the crater with its vertices (the crater has its own occlusion, vGloBite.y)
          'float gAoC = mix( vGloAO, 1.0, vGloBite.x );',
          GLSL_AO_FRAG.replace('float gAo = vGloAO;', 'float gAo = gAoC;'),
          '{',                                                          // bite crater: depth occlusion
          '  float gOcc = 1.0 - vGloBite.y;',
          '  reflectedLight.indirectDiffuse *= gOcc;',
          '  reflectedLight.indirectSpecular *= mix( 1.0, gOcc, 0.7 );',
          '  reflectedLight.directDiffuse *= mix( 1.0, gOcc, 0.5 );',
          // translucent body: part of the diffuse light is what the sugar scattered inside, which leaves
          // evenly (the mean irradiance over the candy, sun + environment): no pastel blow-out on top, a
          // saturated shade side. Creases (baked AO) and craters (gOcc) still darken it.
          '  if ( gloBody.x > 0.0 ) {',
          '    vec3 gMean = gloMean * BRDF_Lambert( material.diffuseColor ) * gAoC * gOcc;',
          '    reflectedLight.directDiffuse *= ( 1.0 - gloBody.x ) * gloBody.y;',
          '    reflectedLight.indirectDiffuse = mix( reflectedLight.indirectDiffuse, gMean, gloBody.x ) * gloBody.y;',
          '  }',
          '}',
          '#if NUM_DIR_LIGHTS > 0',
          'if ( gloTex.w > 0.0 ) {',                                  // light scattering through the sugar
          '  float gNL = dot( geometryNormal, directionalLights[ 0 ].direction );',
          '  float gWrap = saturate( ( gNL + 0.5 ) / 1.5 ) - saturate( gNL );',
          '  reflectedLight.indirectDiffuse += gloTex.w * gWrap * gAoC * gAoC * directionalLights[ 0 ].color * material.diffuseColor * material.diffuseColor;',
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
      gloAlb: { value: P.alb },
      gloGround: { value: P.ground },
      gloBody: { value: new T.Vector2(P.flat || 0, P.body || 1) },
      gloMean: { value: new T.Vector3(0, 0, 0) }   // mean irradiance over the candy (see syncLollipopMean)
    };
    patchCandy(candy, cu);
    candy._glo = cu;

    var stick = new T.MeshStandardMaterial({
      color: 0xffffff, roughness: PAPER.rough, metalness: 0, envMapIntensity: 1.0,
      map: N.white, roughnessMap: N.grey, normalMap: N.flat, normalScale: new T.Vector2(PAPER.normal, PAPER.normal)
    });
    var su = { gloPaper: { value: new T.Vector4(0, PAPER.w, PAPER.slope, PAPER.dark) } };
    patchStick(stick, su);
    stick._glo = su;
    if (own) candy.addEventListener('dispose', keep(function () { N.dispose(); }));

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
    if (o.plane) return px * o.plane[0] + py * o.plane[1] + pz * o.plane[2] + o.plane[3];   // [n, d]: n.p + d
    if (o.sphere) return Math.hypot(px - o.sphere[0], py - o.sphere[1], pz - o.sphere[2]) - o.r;
    if (o.puck) {                                // rounded cylinder on the y axis: [centre y, half height, radius, edge]
      var P = o.puck, qx = Math.hypot(px, pz) - P[2] + P[3], qy = Math.abs(py - P[0]) - P[1] + P[3];
      var mx = qx > 0 ? qx : 0, my = qy > 0 ? qy : 0;
      return Math.sqrt(mx * mx + my * my) + Math.min(Math.max(qx, qy), 0) - P[3];
    }
    var ax = o.a[0], ay = o.a[1], az = o.a[2], bx = o.b[0] - ax, by = o.b[1] - ay, bz = o.b[2] - az;
    var t = clamp(((px - ax) * bx + (py - ay) * by + (pz - az) * bz) / (bx * bx + by * by + bz * bz), 0, 1);
    return Math.hypot(px - ax - bx * t, py - ay - by * t, pz - az - bz * t) - o.r;
  }
  function occHit(o, ox, oy, oz, dx, dy, dz) {    // ray distance to an occluder, -1 = miss
    var b, c, h;
    if (o.plane) {                               // the ground: hit only on the way down to it
      var Pl = o.plane, dn = dx * Pl[0] + dy * Pl[1] + dz * Pl[2], h0 = ox * Pl[0] + oy * Pl[1] + oz * Pl[2] + Pl[3];
      if (h0 <= 0) return 0;
      return dn < -1e-6 ? h0 / -dn : -1;
    }
    if (o.puck) {                                // convex: sphere-trace its exact SDF inside its bounding sphere
      var Q = o.puck, br = Math.hypot(Q[2], Q[1]), qy0 = oy - Q[0];
      b = ox * dx + qy0 * dy + oz * dz; c = ox * ox + qy0 * qy0 + oz * oz - br * br; h = b * b - c;
      if (h < 0) return -1;
      h = Math.sqrt(h);
      var tq = Math.max(0, -b - h), tq1 = -b + h;
      for (var it = 0; it < 64 && tq <= tq1; it++) {
        var dq = occDist(o, ox + dx * tq, oy + dy * tq, oz + dz * tq);
        if (dq < 1e-4) return tq;
        tq += dq;
      }
      return -1;
    }
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
  // The head = a true sphere + the moulded band, as ONE watertight lathe (so a bite carves the ball and
  // the band alike). Its meridian profile is the zero set of an exact-enough 2D signed distance (r from
  // the axis, y from the ball centre): the sphere, a rounded rectangle for the band (from the axis out to
  // R, outer edges rounded), joined by a round fillet (hg_sdf's fOpUnionRound: a circular fillet where
  // the band's flat faces meet the ball). The interaction's hit test uses the same function.
  function headSpec() {
    var B = LOLLY.BAND;
    return { rb: LOLLY.RB, ro: LOLLY.R, yc: B.y, hh: B.h / 2, e: B.edge, f: B.fillet };
  }
  function headSDF2(S, r, y) {
    var db = Math.sqrt(r * r + y * y) - S.rb;
    var qx = Math.abs(r - S.ro * 0.5) - S.ro * 0.5 + S.e, qy = Math.abs(y - S.yc) - S.hh + S.e;
    var mx = qx > 0 ? qx : 0, my = qy > 0 ? qy : 0;
    var dd = Math.sqrt(mx * mx + my * my) + Math.min(Math.max(qx, qy), 0) - S.e;
    var k = S.f, ux = k - db > 0 ? k - db : 0, uy = k - dd > 0 ? k - dd : 0;
    return Math.max(k, Math.min(db, dd)) - Math.sqrt(ux * ux + uy * uy);
  }
  // The meridian, bottom pole -> top pole, traced along the zero set: steps of at most DS (the sphere
  // gets ~1.3 deg rows, like the old 192 x 144 ball) and at most TURN of normal turn per step, so the
  // band's small rounded edges and fillets get 5 rows each (smooth even at 4x the hero framing; 10 deg
  // steps doubled the band's rows, and with them the cost of every bite through it). Rows: [r, y, nr,
  // ny, v] (v = arc length).
  function headProfile(S) {
    var DS = 0.028, DSMIN = 0.0015, TURN = 18 * DEG, h = 1e-6, pts = [];
    function nrm(r, y) {
      var gx = headSDF2(S, r + h, y) - headSDF2(S, r - h, y), gy = headSDF2(S, r, y + h) - headSDF2(S, r, y - h), l = Math.hypot(gx, gy) || 1;
      return [gx / l, gy / l];
    }
    function snap(r, y) {
      for (var k = 0; k < 12; k++) {
        var d = headSDF2(S, r, y);
        if (Math.abs(d) < 1e-10) break;
        var n = nrm(r, y); r -= d * n[0]; y -= d * n[1];
      }
      return [r, y];
    }
    var p = [0, -S.rb], n = [0, -1], s = 0, ds = DS;
    pts.push([0, -S.rb, 0, -1, 0]);
    for (var guard = 0; guard < 2000; guard++) {
      var left = p[1] > 0 ? S.rb * Math.atan2(p[0], p[1]) : Infinity;   // arc still to go on the top cap
      if (left < 1.6 * DS) {                     // finish on the sphere in equal steps, then the pole
        var a0 = Math.atan2(p[0], p[1]), m = left < 0.8 * DS ? 1 : 2;
        for (var k = 1; k < m; k++) {
          var a = a0 * (1 - k / m), qq = [S.rb * Math.sin(a), S.rb * Math.cos(a)];
          s += Math.hypot(qq[0] - p[0], qq[1] - p[1]); p = qq;
          pts.push([qq[0], qq[1], Math.sin(a), Math.cos(a), s]);
        }
        s += Math.hypot(p[0], S.rb - p[1]);
        pts.push([0, S.rb, 0, 1, s]);
        break;
      }
      var tx = -n[1], ty = n[0], q, nq;
      for (var tries = 0; ; tries++) {
        q = snap(p[0] + tx * ds, p[1] + ty * ds);
        nq = nrm(q[0], q[1]);
        var turn = Math.acos(clamp(n[0] * nq[0] + n[1] * nq[1], -1, 1));
        if (turn <= TURN || ds <= DSMIN || tries > 40) break;
        ds = Math.max(DSMIN, ds * Math.max(0.25, 0.85 * TURN / turn));
      }
      s += Math.hypot(q[0] - p[0], q[1] - p[1]);
      pts.push([q[0], q[1], nq[0], nq[1], s]);
      p = q; n = nq;
      ds = Math.min(DS, ds * 1.6);
    }
    for (var i = 0; i < pts.length; i++) pts[i][4] /= s;
    return pts;
  }
  function headArrays() {
    var S = headSpec(), prof = headProfile(S), m = ringMesh(LOLLY.SEG, function () { return prof; }, true);
    m.spec = S; m.rows = prof.length;
    return m;
  }

  // Lathe-style ring mesh from a per-azimuth profile fn(phi) -> [[r, y, nr, ny, v], ...]. skipPoles:
  // rows on the axis (r = 0) emit no zero-area triangles.
  function ringMesh(seg, profileAt, skipPoles) {
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
      var pole0 = skipPoles && prof0[kk][0] === 0, pole1 = skipPoles && prof0[kk + 1][0] === 0;
      for (var jj = 0; jj < seg; jj++) {
        var a = kk * cols + jj, b = (kk + 1) * cols + jj, c = kk * cols + jj + 1, d = (kk + 1) * cols + jj + 1;
        if (!pole0) idx.push(a, b, c);
        if (!pole1) idx.push(b, d, c);
      }
    }
    return { position: pos, normal: nrm, uv: uv, index: new Uint32Array(idx), cols: cols };
  }

  // The candy "collar": the fillet of sugar where the ball grips the stick (ball-local coordinates).
  // Per azimuth a circle tangent to the ball that meets the stick at a small contact angle (like a
  // meniscus, and with no depth fight against the paper); its radius wanders a little.
  function collarArrays() {
    var R = LOLLY.RB, rs = LOLLY.SR, A = 14, kap = 0.92, a0 = Math.acos(kap);
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
    var t0 = performance.now(), RB = LOLLY.RB, CY = LOLLY.CY, rs = LOLLY.SR;
    var ball = headArrays(), collar = collarArrays(), stick = stickArrays(), S = ball.spec;
    // occluders in ball-local space (stick body, a conservative proxy of the collar) and stick space
    var stickL = { a: [0, LOLLY.BOT + rs - CY, 0], b: [0, LOLLY.TOP - CY, 0], r: rs };
    // proxy for the collar, used for the ball only: inside stick+collar wherever ball vertices are visible
    var collarL = { a: [0, -RB - 0.04, 0], b: [0, -RB, 0], r: rs + 0.02 };
    // head and stick are lathes around the y axis with on-axis occluders: bake one vertex per ring.
    // The head also shades itself where the band meets the ball (sphere + band puck): a soft crease above
    // and below the band, so it reads as raised in the indirect light too.
    var cols = LOLLY.SEG + 1, aoS = bakeAORows(ball, cols, [stickL, collarL], { dist: 0.9, strength: 1.4 });
    var aoB = bakeAORows(ball, cols, [{ sphere: [0, 0, 0], r: S.rb }, { puck: [S.yc, S.hh, S.ro, S.e] }], { dist: 0.5, strength: 1.0 });
    for (var i = 0; i < aoS.length; i++) aoS[i] *= aoB[i];
    ball.ao = aoS;
    collar.ao = bakeAO(collar.position, collar.normal, [{ sphere: [0, 0, 0], r: RB }, stickL], { dist: 0.8, strength: 1.3 });
    stick.ao = bakeAORows(stick, stick.cols, [{ sphere: [0, CY, 0], r: RB }], { dist: 1.6, strength: 1.5 });
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
    cgeo.userData.radius = LOLLY.RB;             // the ball (a true sphere), centred on the mesh origin
    cgeo.userData.outerRadius = LOLLY.R;         // the band's outer radius: the head's widest point
    cgeo.userData.center = [0, 0, 0];
    cgeo.userData.head = A.ball.spec;            // profile parameters: exact hit test (see headSDF2)
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
    mat.addEventListener('dispose', keep(function () { dead = true; own.forEach(function (t) { t.dispose(); }); own = []; }));
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

  // ══ CAPSULES ═══════════════════════════════════════════════════════════════════════════════════
  // Swiss Vitamin C: three two-piece hard capsules resting on the ground, two crossed and one apart (as in
  // the client's reference photo). Real size-0 proportions, 1 unit = 10 mm: closed length 21.7 mm, body
  // Ø 7.34 mm, cap Ø 7.64 mm and 10.9 mm long. The cap overlaps the body, so the seam is the cap's rim:
  // a 0.15 mm step with a softly rounded edge. pitch = how far the ground tilts toward the camera (the
  // view from above, ~52 deg, about the photo's). sway (rad): idle, the cluster swings this far either side of
  // its photo pose and never turns round: with B's foot behind A and no floor in view (the hero floats them)
  // a leaning capsule reads as standing on its neighbour. A drag still turns it like a plate.
  var CAPSULE = { L: 2.17, rb: 0.367, rc: 0.382, cap: 1.09, lip: 0.007, SEG: 64, pitch: 0.9, sway: 0.5, powder: '#E6B67A' };
  // Rest poses in the ground's frame (y up, +z toward the camera before the tilt). yaw: heading of the
  // axis in degrees (0 = +x, positive turns it toward the back); capEnd: which way the cap points along
  // that heading. A and C lie flat (each rests on its body dome and the cap's rim, so the cap's dome sits
  // 0.15 mm up); B stands its body dome on the ground at `foot` and leans onto A: its lean is solved (it
  // is raised until it just touches A), not guessed. roll / seed only vary the powder pattern.
  var CAPSULE_LAYOUT = [
    { at: [-0.75, -0.42], yaw: -6, capEnd: -1, roll: 0.4, seed: 1.7 },
    { foot: [-1.1, 0.55], yaw: 50, onto: 0, capEnd: 1, roll: 2.1, seed: 5.3 },
    { at: [1.15, 0.8], yaw: 12, capEnd: 1, roll: 4.4, seed: 9.1 }
  ];

  // The meridian, body pole (y -L/2) -> cap pole (y +L/2): rows [r, y, nr, ny, v] (v = arc length).
  function capsuleProfile() {
    var C = CAPSULE, L = C.L, rb = C.rb, rc = C.rc, e = C.lip;
    var ys = L / 2 - C.cap, yb = -L / 2 + rb, yc = L / 2 - rc;
    var pts = [], s = 0, last = null, k, a, nD = 16;
    function add(r, y, nr, ny) {
      if (last) s += Math.hypot(r - last[0], y - last[1]);
      last = [r, y];
      pts.push([r, y, nr, ny, s]);
    }
    for (k = 0; k <= nD; k++) { a = -Math.PI / 2 + (Math.PI / 2) * k / nD; add(k ? rb * Math.cos(a) : 0, yb + rb * Math.sin(a), Math.cos(a), Math.sin(a)); }
    var n1 = Math.ceil((ys - yb) / 0.05);
    for (k = 1; k <= n1; k++) add(rb, yb + (ys - yb) * k / n1, 1, 0);
    add(rb, ys, 0, -1);                               // the cap's rim face: a crisp inside corner on the body
    add(rc - e, ys, 0, -1);
    for (k = 1; k <= 5; k++) { a = -Math.PI / 2 + (Math.PI / 2) * k / 5; add(rc - e + e * Math.cos(a), ys + e + e * Math.sin(a), Math.cos(a), Math.sin(a)); }
    var n2 = Math.ceil((yc - ys - e) / 0.05);
    for (k = 1; k <= n2; k++) add(rc, ys + e + (yc - ys - e) * k / n2, 1, 0);
    for (k = 1; k <= nD; k++) { a = (Math.PI / 2) * k / nD; add(k === nD ? 0 : rc * Math.cos(a), yc + rc * Math.sin(a), Math.cos(a), Math.sin(a)); }
    for (var i = 0; i < pts.length; i++) pts[i][4] /= s;
    return { pts: pts, ys: ys, yb: yb, yc: yc };
  }
  // closest points of two segments (Ericson, Real-Time Collision Detection 5.1.9): { d, s, t }
  function segSeg(T, p1, q1, p2, q2) {
    var d1 = new T.Vector3().subVectors(q1, p1), d2 = new T.Vector3().subVectors(q2, p2), r = new T.Vector3().subVectors(p1, p2);
    var a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r), c = d1.dot(r), b = d1.dot(d2), den = a * e - b * b;
    var s = den > 1e-9 ? clamp((b * f - c * e) / den, 0, 1) : 0, t = (b * s + f) / e;
    if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); }
    var c1 = p1.clone().addScaledVector(d1, s), c2 = p2.clone().addScaledVector(d2, t);
    return { d: c1.distanceTo(c2), s: s, t: t };
  }
  // The rest poses (centred on the spin axis) + the cluster's extents: R (ground radius it spans), H (top).
  function capsulePoses(T, prof) {
    var C = CAPSULE, yb = prof.yb, yc = prof.yc, ys = prof.ys, rb = C.rb, rc = C.rc;
    var up = new T.Vector3(0, 1, 0), tilt = Math.asin((rc - rb) / (ys - yb)), out = [];
    function rAt(s) { return yb + s * (yc - yb) > ys ? rc : rb; }   // radius at a fraction of the axis
    function pose(L, d, origin, mode) {
      var q = new T.Quaternion().setFromUnitVectors(up, d).multiply(new T.Quaternion().setFromAxisAngle(up, L.roll));
      return { p: origin, q: q, d: d.clone(), mode: mode, seed: L.seed,
        a: origin.clone().addScaledVector(d, yb), b: origin.clone().addScaledVector(d, yc) };
    }
    CAPSULE_LAYOUT.forEach(function (L) {
      var a = L.yaw * DEG, h = new T.Vector3(Math.cos(a), 0, -Math.sin(a)).multiplyScalar(L.capEnd), d;
      if (L.onto == null) {
        d = new T.Vector3(h.x * Math.cos(tilt), Math.sin(tilt), h.z * Math.cos(tilt));
        out.push(pose(L, d, new T.Vector3(L.at[0], rb - yb * Math.sin(tilt), L.at[1]), 'roll'));
        return;
      }
      var A = out[L.onto], P0 = new T.Vector3(L.foot[0], rb, L.foot[1]), lo = 0, hi = 1.2;
      function dirAt(th) { return new T.Vector3(h.x * Math.cos(th), Math.sin(th), h.z * Math.cos(th)); }
      function gap(th) {
        var q2 = P0.clone().addScaledVector(dirAt(th), yc - yb), cp = segSeg(T, A.a, A.b, P0, q2);
        return cp.d - rAt(cp.s) - rAt(cp.t);
      }
      for (var it = 0; it < 48; it++) { var m = (lo + hi) / 2; if (gap(m) < 0) lo = m; else hi = m; }
      d = dirAt(hi);
      out.push(pose(L, d, P0.clone().addScaledVector(d, -yb), 'nod'));
      out[out.length - 1].pivot = P0.clone().setY(0);
    });
    // centre on the spin axis: the middle of the cluster's ground footprint
    var mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9, H = 0;
    out.forEach(function (P) {
      [P.a, P.b].forEach(function (v) {
        mnx = Math.min(mnx, v.x - rc); mxx = Math.max(mxx, v.x + rc); mnz = Math.min(mnz, v.z - rc); mxz = Math.max(mxz, v.z + rc);
        H = Math.max(H, v.y + rc);
      });
    });
    var cx = (mnx + mxx) / 2, cz = (mnz + mxz) / 2, R = 0;
    out.forEach(function (P) {
      [P.p, P.a, P.b, P.pivot].forEach(function (v) { if (v) { v.x -= cx; v.z -= cz; } });
      [P.a, P.b].forEach(function (v) { R = Math.max(R, Math.hypot(v.x, v.z) + rc); });
    });
    return { poses: out, R: R, H: H };
  }

  // Shell: an ivory gelatin satin (not glassy) with the powder inside faintly showing through it: the
  // shell's colour mixed with the powder's (CAPSULE.powder, a pale cream) by how densely it packs there
  // (soft clumps, a fine grain, a few denser specks, in each capsule's own space so they turn with it), a
  // clearer, slightly translucent shell at the cap's end (no powder right behind it), light wrapping
  // past the terminator through the thin shell, and baked contact AO (ground + neighbours).
  var CAPSULE_FRAG_PARS = [
    'varying float vGloAO;', 'varying vec3 vGloP;', 'varying vec3 vGloN;', 'varying float vGloSeed;',
    'uniform vec4 gloCap;',   // x |y| where the domes begin, y the seam (cap rim) y, z powder strength, w shell translucency
    'uniform vec3 gloPowder;',   // the powder's colour (linear)
    'float gloHc( vec3 p ) { return fract( sin( dot( p, vec3( 127.1, 311.7, 74.7 ) ) ) * 43758.5453 ); }',
    'float gloVN( vec3 p ) {',
    '  vec3 i = floor( p ), f = fract( p );',
    '  f = f * f * ( 3.0 - 2.0 * f );',
    '  return mix( mix( mix( gloHc( i ), gloHc( i + vec3( 1.0, 0.0, 0.0 ) ), f.x ), mix( gloHc( i + vec3( 0.0, 1.0, 0.0 ) ), gloHc( i + vec3( 1.0, 1.0, 0.0 ) ), f.x ), f.y ),',
    '              mix( mix( gloHc( i + vec3( 0.0, 0.0, 1.0 ) ), gloHc( i + vec3( 1.0, 0.0, 1.0 ) ), f.x ), mix( gloHc( i + vec3( 0.0, 1.0, 1.0 ) ), gloHc( i + 1.0 ), f.x ), f.y ), f.z );',
    '}'
  ].join('\n');
  var CAPSULE_COLOR = [
    'float gDomeL = smoothstep( gloCap.x - 0.05, gloCap.x + 0.2, abs( vGloP.y ) );',   // 0 on the cylinders, 1 at the dome tips
    'float gCapEnd = smoothstep( gloCap.x - 0.05, gloCap.x + 0.2, vGloP.y );',          // the cap's dome only
    '{',
    '  vec3 gP = vGloP + vec3( vGloSeed, vGloSeed * 1.7, vGloSeed * 0.6 );',
    '  float gFine = 1.0;',
    '  #if __VERSION__ >= 300',
    '  gFine = 1.0 - smoothstep( 0.3, 0.8, length( fwidth( gP * 60.0 ) ) );',
    '  #endif',
    '  float gM = gloVN( gP * vec3( 7.0, 3.0, 7.0 ) ) * 0.55 + gloVN( gP * 17.0 ) * 0.45;',
    '  float gG = gloVN( gP * 60.0 ) - 0.5;',
    '  float gS = smoothstep( 0.8, 0.94, gloVN( gP * 27.0 + 7.1 ) );',
    '  float gDen = clamp( 0.5 + ( gM - 0.5 ) * 1.3 + gG * 0.35 * gFine + gS * 0.4, 0.0, 1.0 );',   // how densely the powder packs
    '  float gShow = gloCap.z * ( 0.3 + 0.32 * gDen ) * ( 1.0 - 0.3 * gCapEnd );',
    '  diffuseColor.rgb = mix( diffuseColor.rgb, gloPowder, gShow ) * ( 1.0 - 0.05 * gS * gloCap.z );',
    '  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * 0.94 + 0.06, gCapEnd * 0.35 );',
    '}'
  ].join('\n');
  var CAPSULE_LIGHT = [
    '#if NUM_DIR_LIGHTS > 0',
    '{',
    '  float gNLc = dot( geometryNormal, directionalLights[ 0 ].direction );',
    '  float gWr = saturate( ( gNLc + 0.6 ) / 1.6 ) - saturate( gNLc );',
    '  reflectedLight.directDiffuse += directionalLights[ 0 ].color * material.diffuseColor * gWr * mix( 0.12, 0.45, gDomeL ) * gloCap.w * vGloAO;',
    '}',
    '#endif',
    '#ifdef USE_ENVMAP',
    'reflectedLight.indirectDiffuse += getIBLIrradiance( - geometryNormal ) * BRDF_Lambert( material.diffuseColor ) * gCapEnd * gloCap.w * 0.3;',
    '#endif'
  ].join('\n');
  function capsuleShell(T, hex, prof) {
    var mat = new T.MeshPhysicalMaterial({
      color: new T.Color(hex), emissive: 0x000000, emissiveIntensity: 0, metalness: 0,   // (recolor() copies the colour into emissive: 0 keeps it dark)
      roughness: 0.3, ior: 1.5, specularIntensity: 0.7, envMapIntensity: 1.0
    });
    var U = { gloCap: { value: new T.Vector4(Math.min(-prof.yb, prof.yc), prof.ys, 1.15, 0.5) }, gloPowder: { value: new T.Color(CAPSULE.powder) } };
    mat.defaultAttributeValues = { gloAO: [1], gloSeed: [0] };
    mat.onBeforeCompile = function (sh) {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>' + GLSL_AO_VERT_PARS + 'attribute float gloSeed;\nvarying float vGloSeed;\n')
        .replace('#include <project_vertex>', '#include <project_vertex>' + GLSL_AO_VERT + 'vGloSeed = gloSeed;\n');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\n' + CAPSULE_FRAG_PARS)
        .replace('#include <color_fragment>', '#include <color_fragment>\n' + CAPSULE_COLOR)
        .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + GLSL_AO_FRAG + '\n' + CAPSULE_LIGHT);
    };
    mat.customProgramCacheKey = function () { return 'glo-capsule-v2'; };
    mat.userData.capsule = U;
    return mat;
  }
  // The ground: only the contact shadows, on a transparent disc (the page shows through). Per capsule an
  // analytic soft sun shadow (closest approach of the ray toward the sun to its axis; the penumbra widens
  // with the distance to the caster: crisp at the contact, soft further out) and contact occlusion (sphere
  // occlusion at the nearest point of its axis). The sun shadow takes the environment's shade colour (shade
  // is lit by the sky: cool); right under the capsules it warms (uWarm: light through the creamy capsules,
  // as in the reference photo). Output is premultiplied display colour.
  var GROUND_VERT = [
    'varying vec3 vP;',
    'void main() {',
    '  vP = position;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
    '}'
  ].join('\n');
  var GROUND_FRAG = [
    'uniform vec3 uA[ 3 ];', 'uniform vec3 uB[ 3 ];', 'uniform vec3 uR;',
    'uniform vec3 uSun;',      // direction to the sun, ground space
    'uniform vec3 uColor;',    // shade colour (display sRGB)
    'uniform vec3 uWarm;',     // contact colour (display sRGB)
    'uniform vec4 uK;',        // x sun-shadow opacity, y contact opacity, z penumbra growth, w fade radius
    'varying vec3 vP;',
    'float capSun( vec3 p, vec3 a, vec3 b, float r ) {',
    '  vec3 ba = b - a, oa = p - a;',
    '  float baba = dot( ba, ba ), bard = dot( ba, uSun ), baoa = dot( ba, oa ), rdoa = dot( uSun, oa );',
    '  float den = baba - bard * bard;',
    '  float s = den > 1e-6 ? clamp( ( baoa - bard * rdoa ) / den, 0.0, 1.0 ) : 0.0;',
    '  float t = bard * s - rdoa;',
    '  if ( t <= 0.0 ) return 1.0;',
    '  s = clamp( ( baoa + t * bard ) / baba, 0.0, 1.0 );',
    '  float d = length( oa + uSun * t - ba * s ) - r;',
    '  float w = uK.z * t + 0.006;',
    '  return smoothstep( -w, w, d );',
    '}',
    'float capOcc( vec3 p, vec3 a, vec3 b, float r ) {',
    '  vec3 ba = b - a;',
    '  float h = clamp( dot( p - a, ba ) / dot( ba, ba ), 0.0, 1.0 );',
    '  vec3 d = a + ba * h - p;',
    '  float l2 = max( dot( d, d ), 1e-6 ), l = sqrt( l2 );',
    '  float k = r / l, k3 = k * k * k;',
    '  return max( 0.0, d.y / l ) * k3 * k3;',   // (r / l)^6: dark at the contact, gone a radius out (no wide halo)
    '}',
    'void main() {',
    '  float lit = capSun( vP, uA[ 0 ], uB[ 0 ], uR.x ) * capSun( vP, uA[ 1 ], uB[ 1 ], uR.y ) * capSun( vP, uA[ 2 ], uB[ 2 ], uR.z );',
    '  float occ = capOcc( vP, uA[ 0 ], uB[ 0 ], uR.x ) + capOcc( vP, uA[ 1 ], uB[ 1 ], uR.y ) + capOcc( vP, uA[ 2 ], uB[ 2 ], uR.z );',
    '  float sh = ( 1.0 - lit ) * uK.x;',
    '  float ao = ( 1.0 - exp( -1.6 * occ ) ) * uK.y;',
    '  float a = 1.0 - ( 1.0 - sh ) * ( 1.0 - ao );',
    '  a *= 1.0 - smoothstep( uK.w * 0.7, uK.w, length( vP.xz ) );',
    '  vec3 col = mix( uColor, uWarm, 0.7 * ao / max( a, 1e-4 ) );',
    '  gl_FragColor = vec4( col * a, a );',
    '}'
  ].join('\n');
  function capsuleGround(T) {
    var C = CAPSULE;
    return new T.ShaderMaterial({
      uniforms: {
        uA: { value: [new T.Vector3(), new T.Vector3(), new T.Vector3()] },
        uB: { value: [new T.Vector3(), new T.Vector3(), new T.Vector3()] },
        uR: { value: new T.Vector3((C.rb + C.rc) / 2, (C.rb + C.rc) / 2, (C.rb + C.rc) / 2) },
        uSun: { value: new T.Vector3(0, 1, 0) },
        uColor: { value: new T.Vector3(0.13, 0.19, 0.3) },
        uWarm: { value: new T.Vector3(0.36, 0.27, 0.15) },
        uK: { value: new T.Vector4(0.34, 0.62, 0.11, 3.4) }
      },
      vertexShader: GROUND_VERT, fragmentShader: GROUND_FRAG,
      transparent: true, depthWrite: false, premultipliedAlpha: true, toneMapped: false
    });
  }
  // one material set per renderer (kept for its lifetime, like the candies')
  function capsuleMaterials(T, hex) {
    var prof = capsuleGeoProfile();
    return { shell: capsuleShell(T, hex, prof), ground: capsuleGround(T) };
  }
  var CAPSULE_PROFILE = null;
  function capsuleGeoProfile() { return CAPSULE_PROFILE || (CAPSULE_PROFILE = capsuleProfile()); }

  // The cluster's mesh, poses and AO bake are deterministic: made ONCE per page as a job of short steps
  // (prepared at idle after the first candy appears), every capsule cluster after that is a copy.
  var CAPSULE_GEO = null;
  function capsuleGeoJob(T, idle) {
    if (CAPSULE_GEO) return CAPSULE_GEO;
    var out = {}, prof, base, lay, steps = [];
    steps.push(function () {
      prof = capsuleGeoProfile();
      base = ringMesh(CAPSULE.SEG, function () { return prof.pts; }, true);
      lay = capsulePoses(T, prof);
      out.ao = lay.poses.map(function () { return new Float32Array(base.position.length / 3); });
    });
    // AO: each capsule against the ground and its two neighbours, in ground space, ~600 vertices a step
    var CH = 600, n = 0;
    steps.push(function () {
      n = base.position.length / 3;
      lay.poses.forEach(function (P, i) {
        var M = new T.Matrix4().compose(P.p, P.q, new T.Vector3(1, 1, 1)), NM = new T.Matrix3().getNormalMatrix(M);
        var occ = [{ plane: [0, 1, 0, 0] }];
        lay.poses.forEach(function (Q, j) { if (j !== i) occ.push({ a: Q.a.toArray(), b: Q.b.toArray(), r: (CAPSULE.rb + CAPSULE.rc) / 2 }); });
        for (var v0 = 0; v0 < n; v0 += CH) {
          steps.push(function (v0) {
            var v1 = Math.min(n, v0 + CH), cnt = v1 - v0, pw = new Float32Array(cnt * 3), nw = new Float32Array(cnt * 3), t = new T.Vector3();
            for (var v = v0; v < v1; v++) {
              t.fromArray(base.position, v * 3).applyMatrix4(M).toArray(pw, (v - v0) * 3);
              t.fromArray(base.normal, v * 3).applyMatrix3(NM).normalize().toArray(nw, (v - v0) * 3);
            }
            out.ao[i].set(bakeAO(pw, nw, occ, { rays: 32, dist: 0.5, strength: 0.95, inside: 0.4 }), v0);
          }.bind(null, v0));
        }
      });
      steps.push(function () {                      // (queued after the bake steps above)
        var g = new T.BufferGeometry();
        g.setAttribute('position', new T.BufferAttribute(base.position, 3));
        g.computeBoundingBox(); g.computeBoundingSphere();
        out.base = base; out.prof = prof; out.poses = lay.poses; out.R = lay.R; out.H = lay.H;
        out.box = g.boundingBox; out.sphere = g.boundingSphere;
        g.dispose();
      });
    });
    var J = job(steps, { idle: idle });
    J.out = out;
    return (CAPSULE_GEO = J);
  }
  // opts.ground: false = no ground (the capsules float; no contact shadows), default true
  function buildCapsules(T, mats, opts) {
    var D = capsuleGeoJob(T, false).flush().out, C = CAPSULE, prof = D.prof, withGround = !opts || opts.ground !== false;
    var g = new T.Group(), cluster = new T.Group();
    cluster.position.y = -D.H * 0.5;               // the cluster's middle (not its ground) on the spin axis
    g.add(cluster);
    var pieces = D.poses.map(function (P, i) {
      var geo = new T.BufferGeometry(), nv = D.base.position.length / 3;
      geo.setAttribute('position', new T.BufferAttribute(D.base.position, 3));   // shared, read-only
      geo.setAttribute('normal', new T.BufferAttribute(D.base.normal, 3));
      geo.setAttribute('uv', new T.BufferAttribute(D.base.uv, 2));
      geo.setAttribute('gloAO', new T.BufferAttribute(D.ao[i], 1));
      geo.setAttribute('gloSeed', new T.BufferAttribute(new Float32Array(nv).fill(P.seed), 1));
      geo.setIndex(new T.BufferAttribute(D.base.index, 1));
      geo.boundingBox = D.box.clone(); geo.boundingSphere = D.sphere.clone();
      var m = new T.Mesh(geo, mats.shell);
      m.position.copy(P.p); m.quaternion.copy(P.q);
      m.castShadow = m.receiveShadow = true;
      m.userData.rest = { p: P.p.clone(), q: P.q.clone(), d: P.d.clone(), mode: P.mode, pivot: P.pivot ? P.pivot.clone() : null };
      cluster.add(m);
      return m;
    });
    var groundR = D.R + 1.3, ground = null;
    if (withGround) {
      ground = new T.Mesh(new T.CircleGeometry(groundR, 72).rotateX(-Math.PI / 2), mats.ground);
      ground.userData.gloNoShadow = true;          // outside the shadow map (its shadows are analytic)
      ground.castShadow = ground.receiveShadow = false;
      ground.renderOrder = 1;
      cluster.add(ground);
    }
    var U = mats.ground.uniforms, inv = new T.Matrix4();
    function sync(sunWorld, which) {               // every frame, right before it renders
      if (!ground) return;
      U.uK.value.w = groundR;
      for (var i = 0; i < pieces.length; i++) {
        var m = pieces[i];
        m.updateMatrix();
        if (!m.visible) { U.uA.value[i].set(0, -100, 0); U.uB.value[i].set(1, -100, 0); continue; }   // (a hidden one casts nothing)
        U.uA.value[i].set(0, prof.yb, 0).applyMatrix4(m.matrix);
        U.uB.value[i].set(0, prof.yc, 0).applyMatrix4(m.matrix);
      }
      cluster.updateWorldMatrix(true, false);
      inv.copy(cluster.matrixWorld).invert();
      U.uSun.value.copy(sunWorld).transformDirection(inv);
      var S = GROUND_SHADE[which] || GROUND_SHADE.beach;
      U.uColor.value.fromArray(S.color); U.uK.value.x = S.k[0]; U.uK.value.y = S.k[1];
    }
    var sp = Math.sin(C.pitch), cp = Math.cos(C.pitch), R = D.R + 0.2;
    g.userData.kind = 'capsule';
    g.userData.size = { w: 2 * R, h: 2 * R * sp + D.H * cp, near: R * cp };   // near: how far its near edge comes toward the camera
    g.userData.pitch = C.pitch;
    g.userData.sway = C.sway;                      // idle: a swing about the photo pose, never a full turn
    g.userData.pieces = pieces; g.userData.cluster = cluster; g.userData.ground = ground;
    g.userData.mats = mats; g.userData.mat = mats.shell;
    g.userData.bob = function () {};               // resting on the ground: no bob
    g.userData.sync = sync;
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
    scoopR: 0.78, scoopDepth: 0.3,                  // the big scoop cutter (ball radius 1.243)
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
    var lol = null, gum = null, cap = null, shardFloor = -2.98;

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
      // The head is not a plain sphere (the band stands out of it): its centre / ball radius drive the
      // bite placement, its exact profile (userData.head, see headSDF2) the hit test, and every vertex
      // keeps its OWN radius as the "skin" term of the carve, so carving never snaps the untouched
      // surface around a bite onto a sphere (no ring / bulge around the crater, the band keeps its shape).
      var ud = geo.userData;
      var C = ud.center ? new T.Vector3().fromArray(ud.center) : ud.radius ? new T.Vector3(0, 0, 0) : geo.boundingSphere.center.clone();
      var R = ud.radius || geo.boundingSphere.radius, rad0 = new Float32Array(n), Rout = R;
      for (var v = 0; v < n; v++) {
        rad0[v] = Math.hypot(orig[v * 3] - C.x, orig[v * 3 + 1] - C.y, orig[v * 3 + 2] - C.z);
        if (rad0[v] > Rout) Rout = rad0[v];
      }
      var L = {
        mesh: candy, geo: geo, pos: pos, nrm: nrm, bAttr: bAttr, orig: orig, origN: new Float32Array(nrm.array), n: n,
        C: C, R: R, Rout: Rout, head: ud.head || null, rad0: rad0, Rv: 0,
        cutters: [], bites: 0, mark: new Uint8Array(n), list: [], regrowAt: 0, regrow: null,
        sqAxis: new T.Vector3(0, 0, 1)
      };
      geo.userData.gloBiteState = L;
      return L;
    }
    // Signed distance of the carved head = smooth-max(skin, -smooth-union(cutters)). The skin is the
    // carved vertex's own radius while carving (L.Rv > 0: every vertex is carved along its own ray from
    // the centre), else the head's exact profile (hit tests). The small blend radii round the rim /
    // tooth cusps just enough for the vertex grid to sample them without stair-steps. Writes the
    // gradient to SG[0..2], the skin's blend weight (1 = untouched skin, 0 = fresh cut) to SG[3] and the
    // cutter-union distance to SG[4].
    var K_SUB = 0.018, K_UNI = 0.014, SG = new Float64Array(5);   // crisp scalloped rims (~1 vertex spacing)
    var SK = new Float64Array(3);
    function skin(L, sx, sy, sz, sl) {         // skin distance at C + (sx, sy, sz), |..| = sl; gradient -> SK
      if (L.Rv > 0 || !L.head) {
        SK[0] = sx / sl; SK[1] = sy / sl; SK[2] = sz / sl;
        return sl - (L.Rv > 0 ? L.Rv : L.R);
      }
      var H = L.head, r = Math.sqrt(sx * sx + sz * sz), e = 1e-5;
      var d = headSDF2(H, r, sy);
      var gr = headSDF2(H, r + e, sy) - headSDF2(H, Math.abs(r - e), sy), gy = headSDF2(H, r, sy + e) - headSDF2(H, r, sy - e);
      var gl = Math.hypot(gr, gy) || 1, rr = r > 1e-9 ? 1 / r : 0;
      gr /= gl; gy /= gl;
      SK[0] = gr * sx * rr; SK[1] = gy; SK[2] = gr * sz * rr;
      return d;
    }
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
      var sx = x - L.C.x, sy = y - L.C.y, sz = z - L.C.z, sl = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1e-9, ds = skin(L, sx, sy, sz, sl);
      if (du === Infinity) { SG[0] = SK[0]; SG[1] = SK[1]; SG[2] = SK[2]; SG[3] = 1; SG[4] = 1e9; return ds; }
      var a = -ds, h2 = clamp(0.5 + 0.5 * (du - a) / K_SUB, 0, 1);  // smin(-ds, du): h2 = skin weight
      var sm = du + (a - du) * h2 - K_SUB * h2 * (1 - h2);
      SG[0] = h2 * SK[0] - (1 - h2) * gx; SG[1] = h2 * SK[1] - (1 - h2) * gy; SG[2] = h2 * SK[2] - (1 - h2) * gz;
      SG[3] = h2; SG[4] = du;
      return -sm;
    }
    // Analytic hit on the carved head (sphere-traced SDF inside its bounding sphere): exact, and cheap
    // next to a raycast through 70k triangles. Returns { local (candy space), dist (world) } or null.
    function hitCandy(rayW) {
      var L = lol;
      if (!L) return null;
      _m.copy(L.mesh.matrixWorld).invert();
      var o = _a.copy(rayW.origin).applyMatrix4(_m), d = _b.copy(rayW.direction).transformDirection(_m);
      var ox = o.x - L.C.x, oy = o.y - L.C.y, oz = o.z - L.C.z, RO = L.Rout + 1e-3;
      var bq = ox * d.x + oy * d.y + oz * d.z, cq = ox * ox + oy * oy + oz * oz - RO * RO, disc = bq * bq - cq;
      if (disc < 0) return null;
      var sd = Math.sqrt(disc), t0 = Math.max(0, -bq - sd), t1 = -bq + sd;
      if (t1 < 0) return null;
      var t = t0;
      if (L.cutters.length || L.head || RO > L.R + 2e-3) {
        var hitT = -1;
        for (var it = 0; it < 600 && t <= t1; it++) {
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
    // Newton on the carved SDF along its gradient minus the meridional part: the point stays on the cone
    // of elevation asin(sinE) about the centre (moves in and out and sideways only, never up or down).
    // Result -> CP; false = it left [rmin, rmax] or did not converge.
    var CP = new Float64Array(3);
    function coneSlide(L, x, y, z, sinE, rmin, rmax) {
      var cx = L.C.x, cy = L.C.y, cz = L.C.z, ch = Math.sqrt(Math.max(0, 1 - sinE * sinE));
      var wx = x - cx, wz = z - cz, wl = Math.sqrt(wx * wx + (y - cy) * (y - cy) + wz * wz), hl = Math.sqrt(wx * wx + wz * wz);
      if (hl < 1e-9) return false;
      x = cx + wx * wl * ch / hl; y = cy + wl * sinE; z = cz + wz * wl * ch / hl;   // onto the cone
      var d = sdf(L, x, y, z);
      for (var it = 0; it < 16 && Math.abs(d) > 1e-5; it++) {
        wx = x - cx; var wy = y - cy; wz = z - cz; wl = Math.sqrt(wx * wx + wy * wy + wz * wz) || 1;
        var sy = wy / wl, mx = -sy * wx / wl, my = 1 - sy * sy, mz = -sy * wz / wl, ml = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
        mx /= ml; my /= ml; mz /= ml;
        var gm = SG[0] * mx + SG[1] * my + SG[2] * mz;
        var tx = SG[0] - gm * mx, ty = SG[1] - gm * my, tz = SG[2] - gm * mz, t2 = tx * tx + ty * ty + tz * tz;
        if (t2 < 1e-6) return false;
        var st = clamp(d / t2, -0.12, 0.12);
        x -= tx * st; y -= ty * st; z -= tz * st;
        wx = x - cx; wz = z - cz; wl = Math.sqrt(wx * wx + (y - cy) * (y - cy) + wz * wz); hl = Math.sqrt(wx * wx + wz * wz) || 1;
        x = cx + wx * wl * ch / hl; y = cy + wl * sinE; z = cz + wz * wl * ch / hl;
        if (wl < rmin || wl > rmax) return false;
        d = sdf(L, x, y, z);
      }
      CP[0] = x; CP[1] = y; CP[2] = z;
      return Math.abs(d) <= 1e-3;
    }
    // Carve every vertex near the new cutters onto the carved SDF. A ball point is Newton-projected along
    // the SDF gradient (deep inside a cutter exactly v = c + normalize(v - c) * r; at the rim it lands on
    // the small fillet): crisp scalloped rims. The band's rows sit edge-on to that gradient wherever a
    // cutter crosses a ledge (above, below or on the band), and projecting them folded the ledges over
    // the ball and piled vertices up at the band's cut ends (hundreds of folded triangles a bite), so a
    // band vertex (it stands out of the ball) moves down its own ray from the centre instead: rays never
    // cross, the band's rows and columns keep their order and its cut ends are clean walls. Under a bite
    // centred on the band (cone) the ball rows above / below it move away from it (the scoop's centre
    // lies at the band's height); an order-preserving floor (ceiling, coneSlide) keeps a jittered tooth
    // from pushing one into the band's rows anyway.
    // Cutters only ever remove material, so the result does not depend on the bite order. The normal is
    // the SDF gradient (analytic, the skin part swapped for the vertex's own normal), so the UV seam and
    // the poles stay consistent by construction and nothing needs computeVertexNormals().
    function carve(L, cut, cone) {
      var p = L.pos.array, nn = L.nrm.array, b = L.bAttr.array, o = L.orig;
      var cx = L.C.x, cy = L.C.y, cz = L.C.z, HALO = BITE.halo, pad = HALO + K_SUB + K_UNI, RB = L.R;
      var H = L.head, eTop = H ? Math.atan2(H.yc + H.hh, H.ro) : 0, eBot = H ? Math.atan2(H.yc - H.hh, H.ro) : 0;
      var mnx = Infinity, mny = Infinity, mnz = Infinity, mxx = -Infinity, mxy = -Infinity, mxz = -Infinity;
      cut.forEach(function (c) {
        mnx = Math.min(mnx, c.x - c.r - pad); mxx = Math.max(mxx, c.x + c.r + pad);
        mny = Math.min(mny, c.y - c.r - pad); mxy = Math.max(mxy, c.y + c.r + pad);
        mnz = Math.min(mnz, c.z - c.r - pad); mxz = Math.max(mxz, c.z + c.r + pad);
      });
      var on = L.origN, nc = cut.length, reach = new Float64Array(nc);
      for (var k = 0; k < nc; k++) reach[k] = (cut[k].r + pad) * (cut[k].r + pad);
      for (var i = 0, i3 = 0; i < L.n; i++, i3 += 3) {
        var x0 = p[i3], y0 = p[i3 + 1], z0 = p[i3 + 2], x = x0, y = y0, z = z0;
        if (x < mnx || x > mxx || y < mny || y > mxy || z < mnz || z > mxz) continue;
        for (k = 0; k < nc; k++) { var cu = cut[k], ex = x - cu.x, ey = y - cu.y, ez = z - cu.z; if (ex * ex + ey * ey + ez * ez < reach[k]) break; }
        if (k === nc) continue;                    // out of every new cutter's reach: nothing changes here
        var r0 = L.rad0[i], d, it, ball = true;
        var ux = (o[i3] - cx) / r0, uy = (o[i3 + 1] - cy) / r0, uz = (o[i3 + 2] - cz) / r0;
        L.Rv = r0;                                 // this vertex's own radius is its skin
        if (H && r0 > RB + 1e-5) {                 // a band vertex (it stands out of the ball)
          ball = false;
          // down its own ray from the centre (a bracketed 1D Newton): rays never cross, so the band's cut
          // ends stay clean walls (sliding sideways piled vertices up there and folded the triangles);
          // one already on the carved surface stays put
          d = sdf(L, x0, y0, z0);
          if (Math.abs(d) > 1e-4) {
            var lo = 0.05, hi = r0, t = r0;
            d = sdf(L, cx + ux * t, cy + uy * t, cz + uz * t);
            for (it = 0; it < 30 && Math.abs(d) > 1e-6; it++) {
              if (d > 0) hi = t; else lo = t;
              var g = SG[0] * ux + SG[1] * uy + SG[2] * uz;      // d(sdf)/dt along the ray
              var tn = g > 0.05 ? t - d / g : -1;
              if (!(tn > lo && tn < hi)) tn = 0.5 * (lo + hi);
              t = tn;
              d = sdf(L, cx + ux * t, cy + uy * t, cz + uz * t);
            }
            x = cx + ux * t; y = cy + uy * t; z = cz + uz * t;
          }
        }
        if (ball) {                                // Newton along the SDF gradient
          d = sdf(L, x, y, z);
          for (it = 0; it < 10 && Math.abs(d) > 1e-4; it++) {
            var g2 = SG[0] * SG[0] + SG[1] * SG[1] + SG[2] * SG[2];
            if (g2 < 1e-6) break;
            var st = clamp(d / g2, -0.25, 0.25);
            x -= SG[0] * st; y -= SG[1] * st; z -= SG[2] * st;
            d = sdf(L, x, y, z);
          }
          if (cone && H && r0 <= RB + 1e-5) {      // never into the band's rows: an order-preserving floor
            var e0 = Math.asin(clamp(uy, -1, 1)), e1 = Math.asin(clamp((y - cy) / (Math.hypot(x - cx, y - cy, z - cz) || 1), -1, 1));
            var lim = e0 > eTop ? eTop + (e0 - eTop) * 0.5 : eBot - (eBot - e0) * 0.5;
            if ((e0 > eTop && e1 < lim) || (e0 < eBot && e1 > lim)) {
              if (coneSlide(L, x, y, z, Math.sin(lim), 0.05, r0 + 1e-4)) { x = CP[0]; y = CP[1]; z = CP[2]; }
            }
          }
          if (L.Rv !== r0) { L.Rv = r0; sdf(L, x, y, z); }   // blend weights against its real skin
        } else sdf(L, x, y, z);                    // (SG at the final point)
        var moved = Math.abs(x - x0) + Math.abs(y - y0) + Math.abs(z - z0) > 1e-6;
        var fresh = 1 - SG[3], du = Math.max(0, SG[4]);
        var halo = du < HALO ? (1 - du / HALO) * (1 - du / HALO) * 0.8 * SG[3] : 0;
        if (!moved && halo <= b[i3 + 2] && fresh <= b[i3]) continue;
        var rx = x - cx, ry = y - cy, rz = z - cz, rl = Math.hypot(rx, ry, rz) || 1;
        if (moved) {
          p[i3] = x; p[i3 + 1] = y; p[i3 + 2] = z;
          // SDF gradient with its skin part (weight SG[3]) swapped from radial to the vertex's own
          // original normal: the skin keeps its exact shading, the cut takes the cutter gradient
          var w = SG[3];
          var nx = SG[0] + w * (on[i3] - rx / rl), ny = SG[1] + w * (on[i3 + 1] - ry / rl), nz = SG[2] + w * (on[i3 + 2] - rz / rl);
          var gl = Math.hypot(nx, ny, nz) || 1;
          nn[i3] = nx / gl; nn[i3 + 1] = ny / gl; nn[i3 + 2] = nz / gl;
        }
        b[i3] = Math.max(b[i3], fresh);
        // crater occlusion: depth below the BALL (not the band), so the band's share of a crater is
        // shaded exactly like the ball beside it
        b[i3 + 1] = clamp((Math.min(r0, RB) - rl) / 0.3, 0, 1) * 0.8;
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
      // a hit on the band: the teeth go in from the ball's surface under it, so a bite there is as deep
      // as anywhere else and takes the band out with it (shards / events keep the real hit point)
      var Pc = P.distanceTo(L.C) > L.R ? L.C.clone().addScaledVector(N, L.R) : P;
      var cut = makeCutters(L, Pc, N, upL), H = L.head, eN = Math.asin(clamp(N.y, -1, 1));
      Array.prototype.push.apply(L.cutters, cut);
      carve(L, cut, !!H && eN > Math.atan2(H.yc - H.hh, H.ro) && eN < Math.atan2(H.yc + H.hh, H.ro));
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
    function pickPiece(list) {
      var objs = (list || gum).map(function (g) { return g.obj; });
      var hits = raycaster.intersectObjects(objs, true);
      if (!hits.length) return -1;
      for (var o = hits[0].object; o; o = o.parent) { var i = objs.indexOf(o); if (i >= 0) return i; }
      return -1;
    }

    // ── capsule rocking: a tap never bites a capsule. A lying one rolls a little on the ground and
    // settles (rolling: it moves sideways by r x the angle), the leaning one nods on its foot. Rigid, damped,
    // through position / quaternion from its rest pose (the ground shadows follow, see sync).
    var _up = new T.Vector3(0, 1, 0), _ax = new T.Vector3();
    function setupCapsules(model) {
      return (model.userData.pieces || []).map(function (o) { return { obj: o, rest: o.userData.rest, t: 0, amp: 0, active: false }; });
    }
    function rock(i, notify) {
      var C = cap;
      if (!C || !C[i]) return false;
      var c = C[i];
      c.t = 0; c.amp = reduce ? 0.4 : 1; c.active = true;
      if (!reduce) { recX.v += (rnd() - 0.5) * 0.25; recZ.v += (rnd() < 0.5 ? -1 : 1) * 0.12; }   // the tray barely notices
      if (notify !== false && opts.onPoke) opts.onPoke({ kind: 'capsule', index: i });
      return true;
    }
    function stepRock(dt) {
      for (var j = 0; j < cap.length; j++) {
        var c = cap[j];
        if (!c.active) continue;
        c.t += dt;
        var o = c.obj, R = c.rest, tau = c.t, end = reduce ? 0.5 : 1.7;
        if (tau >= end) { c.active = false; o.position.copy(R.p); o.quaternion.copy(R.q); continue; }
        var a = reduce ? Math.sin(Math.PI * tau / end) * 0.5 : Math.sin(11.5 * tau) * Math.exp(-3.3 * tau) * Math.min(1, tau / 0.04);
        a *= c.amp;
        if (R.mode === 'nod') {                      // pivot on the foot: lifts off A and drops back (never into it)
          var phi = 0.045 * Math.max(0, a);
          _ax.crossVectors(R.d, _up).normalize();    // (a turn about d x up raises the far end)
          _q.setFromAxisAngle(_ax, phi);
          o.position.copy(R.p).sub(R.pivot).applyQuaternion(_q).add(R.pivot);
          o.quaternion.copy(R.q).premultiply(_q);
        } else {                                     // roll about its own axis, moving sideways as it rolls
          var th = 0.13 * a;
          _ax.crossVectors(R.d, _up).normalize();    // rolling without slipping: the centre moves r th along d x up
          o.position.copy(R.p).addScaledVector(_ax, CAPSULE.rc * th);
          _q.setFromAxisAngle(R.d, th);
          o.quaternion.copy(R.q).premultiply(_q);
        }
      }
    }
    function restCapsules() {
      if (cap) cap.forEach(function (c) { c.active = false; c.obj.position.copy(c.rest.p); c.obj.quaternion.copy(c.rest.q); });
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
      if (cap) { var ic = pickPiece(cap); if (ic >= 0) rock(ic, true); return; }   // capsules: a gentle rock, never a bite
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
      if (gum || cap) {
        var list = gum || cap;
        if (i == null) {                          // the piece nearest the camera
          var best = Infinity, cam = new T.Vector3().setFromMatrixPosition(camera.matrixWorld);
          list.forEach(function (g, j) { var d = g.obj.getWorldPosition(_a).distanceTo(cam); if (d < best) { best = d; i = j; } });
        }
        return gum ? jiggle(i, true) : rock(i, true);
      }
      if (lol) { wobble(lol.C.clone().add(new T.Vector3(0, 0, lol.R)), 1); if (opts.onPoke) opts.onPoke({ kind: 'lollipop' }); return true; }
      return false;
    }

    function onModelChange(model) {
      if (lol && lol.mesh) lol.mesh.matrixAutoUpdate = true;
      if (gum) gum.forEach(function (g) { g.obj.matrixAutoUpdate = true; });
      restCapsules();
      clearShards(); clearSparkles();
      sq.x = sq.v = 0;
      lol = null; gum = null; cap = null;
      if (!model) return;
      shardFloor = -((model.userData.size && model.userData.size.h) || 6) / 2 + 0.02;
      if (model.userData.kind === 'gummy') gum = setupGummies(model);
      else if (model.userData.kind === 'capsule') cap = setupCapsules(model);
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
      if (cap) stepRock(dt);
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
      restCapsules();
      lol = gum = cap = null;
    }

    onModelChange(ctx.getModel());
    return {
      update: update, onModelChange: onModelChange, dispose: dispose,
      bite: apiBite, poke: apiPoke,
      regrow: function () { return lol && lol.bites && !lol.regrow ? startRegrow() : false; },
      get dragging() { return !!ptr; },
      get spinning() { return omega !== 0; },     // a fling's inertia is still turning it
      get bites() { return lol ? lol.bites : 0; },
      get active() { return { shards: shardsAlive, sparkles: spAlive, regrowing: !!(lol && lol.regrow), omega: omega }; }
    };
  }

  // ══ MAIN ═══════════════════════════════════════════════════════════════════════════════════════
  function create(mount, opts) {
    opts = opts || {};
    return loadThree().then(function (T) {
      // each candy builds in its own task: two candies on a page = two shorter tasks, not one long one; the
      // environment's procedural panorama (made once per page) is painted in a task of its own before it
      var which = envName(opts.environment), tick = function () { return new Promise(function (res) { setTimeout(res, 0); }); };
      return tick().then(function () {
        if (!PROCEDURAL[which] && !PREPARED[which]) PROCEDURAL[which] = proceduralEquirect(T, which);
        return tick();
      }).then(function () { return build(T, mount, opts); });
    }).catch(function (err) {
      if (opts.fallback) opts.fallback.hidden = false;
      if (window.console) console.warn('[GloCandy] 3D unavailable:', err && err.message);
      return null;
    });
  }

  function pickQuality(q) { return q === 'high' || q === 'low' ? q : 'medium'; }

  // ── products ──
  // The Model Pops line-up, as product objects for create({ product }) / setProduct(). Frozen: copy before
  // changing (Object.assign({}, GloCandy.PRODUCTS.greenPop, { color: '#..' })).
  // Keyed by the site's product ids, with camelCase aliases (the same frozen objects). The two pops are one
  // product shape in one material, the approved pop's: only their colour differs.
  // GREEN_POP: the green of the pop on its pack art, calibrated on this pop. The pack shows only the bottom 20 % of
  // its ball (body mid-tone #2B8802); in 'beach' light, upright, that same cap of this pop renders a body mid-tone
  // #3B872A for this input: dE2000 3.49 (its ten tone bands: mean dE2000 5.6). No input matches closer: the sky and
  // sand reflections lift every channel a little and the pack's blue is 0. (site/_qa/fidelity/calibrate-green.mjs)
  var GREEN_POP = '#2A9500';
  var PRODUCTS = {
    'strawberry-pop': Object.freeze({ kind: 'lollipop', color: '#FF1493' }),   // No 1 Collagen Boost: the pack's pink
    'green-pop': Object.freeze({ kind: 'lollipop', color: GREEN_POP }),        // No 2 Green Veggies (working name): its pack's green
    'vitamin-c': Object.freeze({ kind: 'capsule', color: '#F2E8CF' })          // No 3 Liposomal Vitamin C: ivory capsules
  };
  PRODUCTS.pinkPop = PRODUCTS['strawberry-pop']; PRODUCTS.greenPop = PRODUCTS['green-pop']; PRODUCTS.capsules = PRODUCTS['vitamin-c'];
  var KINDS = ['lollipop', 'capsule', 'gummy'];
  // the colour a product gets when none is given, per kind
  var DEFAULT_COLOR = { lollipop: '#FF1493', capsule: '#F2E8CF', gummy: '#1FA453' };
  // { kind, color }: kind 'lollipop' (the default) | 'capsule' | 'gummy'
  function normProduct(p) {
    var k = p.kind === 'gummy' || p.kind === 'capsule' ? p.kind : 'lollipop';
    return { kind: k, color: p.color || DEFAULT_COLOR[k] };
  }

  function build(T, mount, opts) {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var preset = opts.preset === 'glass' ? 'jewel' : (opts.preset || 'gloss');
    var product = normProduct(opts.product || {});
    // the kinds this page may switch to: their materials compile and their geometry is prepared at idle
    // (default: the line-up; 'gummy' only when asked for, or shown first)
    var kinds = (Array.isArray(opts.kinds) ? opts.kinds : ['lollipop', 'capsule']).filter(function (k) { return KINDS.indexOf(k) >= 0; });
    if (kinds.indexOf(product.kind) < 0) kinds.push(product.kind);
    var spinRate = (opts.spin == null ? 0.0032 : opts.spin) * 60;      // rad/s (opts.spin is per 60 Hz frame)
    var tilt = opts.tilt == null ? 0.24 : opts.tilt;
    var zoom = opts.zoom || 1;
    var quality = pickQuality(opts.quality);
    var useAssets = opts.assets !== false && !window.GLO_CANDY_NO_ASSETS;
    var W = mount.clientWidth || 400, H = mount.clientHeight || 500;
    var alive = true;
    var onRender = typeof opts.onRender === 'function' ? opts.onRender : null;   // opt-in per-frame hook
    // the capsules rest on a transparent ground that shows only their contact shadows, unless the page
    // copies the frames to cast its own shadow (onRender) or says so (ground: false)
    var groundOn = opts.ground == null ? !onRender : opts.ground !== false;

    // 'default': a light page never asks a dual-GPU laptop for its discrete GPU (the water asks the same)
    var renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'default' });
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
      if (opts.backdrop) { scene.background = env.texture; scene.backgroundBlurriness = 0.12; }   // preview aid only
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
    // handed to the materials, so no frame pays for six 1k uploads at once. ph = this renderer's own placeholders.
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
      if (kinds.indexOf('gummy') >= 0) ric(function () { if (sugarSource(assets)) sugarLater(assets); else procSugarLater(); }, 1500);
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
    var mats = { lolly: null, gummy: null, capsule: null };
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
    function capsuleMats(hex) {
      if (!mats.capsule) mats.capsule = capsuleMaterials(T, hex);
      else recolor(mats.capsule.shell, hex);
      return mats.capsule;
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
      } else if (p.kind === 'capsule') {
        m = buildCapsules(T, capsuleMats(p.color), { ground: groundOn });
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
    // (size.near: a model that reaches toward the camera, like the capsules' tilted ground as it spins, is
    // seen bigger there: the camera backs off by that much more, so no spin ever leaves the box)
    function fitDistance(m) {
      var s = m.userData.size, half = Math.tan(T.MathUtils.degToRad(camera.fov / 2)), zn = s.near || 0;
      var dh = (s.h / 2) / half + zn, dw = (s.w / 2) / (half * camera.aspect) + zn * 0.5;
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
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (e) { onScreen = e[e.length - 1].isIntersecting; }, { threshold: 0 }) : null;
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

    // A product of the same kind recolours in place (the pink and the green pop are one shape); another kind
    // plays the swap (spin out, pop in).
    function setProduct(p0, o) {
      var p = Object.assign({}, product, p0 || {});
      // a new kind without a colour of its own takes its default (never the old product's colour)
      if (!(p0 && p0.color) && normProduct(p).kind !== product.kind) delete p.color;
      p = normProduct(p);
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
        pitch0 = model.userData.pitch || 0;       // no tilt animation nobody saw
        toPhotoPose(inn);
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
        toPhotoPose(inn);                          // (the new model is still a dot: the turn is unseen)
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
    // Every kind in `kinds` but the one on show: one per idle slot (no slot makes a long task).
    var warmed = false;
    function warmOther() {
      if (!alive || warmed) return;
      if (swapping || paused || !onScreen || document.hidden) { ric(warmOther, 4000); return; }
      warmed = true;
      var todo = kinds.filter(function (k) { return k !== product.kind; });
      (function next() {
        if (!alive || !todo.length) return;
        if (swapping || paused || !onScreen || document.hidden) { ric(next, 2000); return; }
        var k = todo.shift(), list;
        if (k === 'lollipop') { var s = mats.lolly || lollyMats(DEFAULT_COLOR.lollipop); list = [s.candy, s.stick]; }
        else if (k === 'capsule') { var cs = mats.capsule || capsuleMats(DEFAULT_COLOR.capsule); list = [cs.shell, cs.ground]; }
        else list = [mats.gummy || gummyMat(DEFAULT_COLOR.gummy)];
        var tmp = new T.Scene(), geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(new Float32Array(9), 3));
        list.forEach(function (m) { var o = new T.Mesh(geo, m); o.castShadow = o.receiveShadow = true; tmp.add(o); });
        try { renderer.compile(tmp, camera, scene); } catch (e) { /* compiles on first use instead */ }
        geo.dispose();
        if (todo.length) ric(next, 1500);
      })();
    }

    // the candy's translucent body needs the mean irradiance over it: the environment's mean radiance
    // (measured once per panorama on the CPU) x pi x envMapIntensity, plus the sun's irradiance / 4.
    // A few multiplies per frame, so a relight, an HDRI upgrade or a page's own tweaks are always in.
    function syncLollipopMean() {
      var c = mats.lolly && mats.lolly.candy, u = c && c._glo && c._glo.gloMean;
      if (!u) return;
      var m = env.mean || [0.5, 0.5, 0.5], k = Math.PI * (c.envMapIntensity == null ? 1 : c.envMapIntensity);
      var s = rig.sun, si = s.intensity / 4;
      u.value.set(m[0] * k + s.color.r * si, m[1] * k + s.color.g * si, m[2] * k + s.color.b * si);
    }
    // per-frame model hooks (the capsules' contact shadows follow the sun, the spin and a rocking capsule)
    function syncModel() {
      syncLollipopMean();
      if (model.userData.sync) model.userData.sync(rig.dir, env.which);
    }
    var pitch0 = model.userData.pitch || 0;        // the tray tilt (capsules), eased across a swap
    // A model with userData.sway (the capsules) swings that far either side of its photo pose at the spin's own
    // speed through the middle, easing toward the nearest whole turn of it: so a fling runs out, then it drifts
    // back. Everything else spins round.
    var swayT = 0, TAU = Math.PI * 2;
    function idleSpin(dt) {
      var A = model.userData.sway;
      if (!A) { spinner.rotation.y += spinRate * dt; return; }
      if (!spinRate || ix.spinning) return;
      swayT += dt;
      var off = A * Math.sin(swayT * Math.abs(spinRate) / A), home = Math.round((spinner.rotation.y - off) / TAU) * TAU;
      spinner.rotation.y += (home + off - spinner.rotation.y) * (1 - Math.exp(-1.6 * dt));
    }
    function toPhotoPose(m) {                      // a swayed model starts at its photo pose (unseen: a swap's dot)
      if (!m.userData.sway) return;
      spinner.rotation.y = Math.round(spinner.rotation.y / TAU) * TAU; swayT = 0;
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
      if (!ix.dragging && !swapping && !reduce) idleSpin(dt);   // time-based idle spin (the capsules: a sway)
      var kp = 1 - Math.exp(-3.1 * dt);
      px += (pxT - px) * kp; py += (pyT - py) * kp;
      pitch0 += ((model.userData.pitch || 0) - pitch0) * (reduce ? 1 : 1 - Math.exp(-6 * dt));
      lean.rotation.x = py * 0.12 + pitch0;        // base lean; the interaction adds pitch / recoil / fling
      lean.rotation.z = -px * 0.08;
      camZ += (camZTarget - camZ) * (1 - Math.exp(-5 * dt));
      camera.position.z = camZ;
      if (opts.bob !== false && !reduce && model.userData.bob) model.userData.bob(clock);
      ix.update(dt, now);
      rig.fitShadow(model);
      syncModel();
      renderer.render(scene, camera);
      frames++;
      if (onRender) onRender(api);               // the frame is still in the canvas: copy it now if needed
    }
    lean.rotation.x = pitch0;
    rig.fitShadow(model);
    syncModel();
    // The first frame waits for its shader programs without blocking: compile() queues them and, where the
    // browser links in parallel (KHR_parallel_shader_compile), they are polled every few ms until linked;
    // only then does it render (so the first draw never sits waiting on a link) and the loop start.
    // create() resolves after that first frame. (No extension: it renders at once, as before.)
    var firstFrame = new Promise(function (resolve) {
      var list = null, t0 = performance.now();
      try {
        var set = renderer.compile(scene, camera);
        if (set && set.forEach && renderer.extensions.has('KHR_parallel_shader_compile')) { list = []; set.forEach(function (m) { list.push(m); }); }
      } catch (e) { list = null; }
      (function poll() {
        if (!alive) { resolve(); return; }
        if (list) list = list.filter(function (m) { var p = renderer.properties.get(m).currentProgram; return !!(p && p.isReady && !p.isReady()); });
        if (list && list.length && performance.now() - t0 < 4000) { setTimeout(poll, 8); return; }
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
        resolve();
      })();
    });
    // page-wide geometry + bakes of the kinds this page may show are prepared at idle, so a switch is cheap
    if (kinds.indexOf('capsule') >= 0) ric(function () { if (alive) capsuleGeoJob(T, true); }, 3000);
    if (kinds.indexOf('gummy') >= 0) ric(function () { if (alive) gummyGeoJob(T, quality === 'low' ? 18 : 30, true); }, 4000);

    var assetsReady = Promise.all([texReady, hdrReady]).then(function (r) { return !!(r[0] && r[1]); });
    assetsReady.then(function () { ric(warmOther, 3000); });

    // WebGL context loss: a phone reclaiming the GPU from a background tab, a driver reset. three.js keeps the canvas (it
    // calls preventDefault on the loss); on the restore it makes its GL state again and, at the next render, uploads every
    // buffer, image and data texture again from its CPU copy and compiles the programs. Render targets have no CPU copy:
    // the environment's PMREM (else no reflections and a black shade side on the stick) and the sun's shadow map are
    // rebuilt here, before the next frame. First the dead context's 'dispose' listeners are dropped from everything this
    // candy owns (see forgetDeadGL), while nothing has been uploaded to the new context yet.
    function onRestored() {
      if (!alive) return;
      function forgetMat(m) {
        if (!m) return;
        var u = m._glo || m.userData.gummy || {};
        forgetDeadGL(m);
        Object.keys(m).forEach(function (k) { if (m[k] && m[k].isTexture) forgetDeadGL(m[k]); });
        Object.keys(u).forEach(function (k) { var v = u[k] && u[k].value; if (v && v.isTexture) forgetDeadGL(v); });
      }
      scene.traverse(function (o) { forgetDeadGL(o); forgetDeadGL(o.geometry); [].concat(o.material || []).forEach(forgetMat); });
      [mats.lolly && mats.lolly.candy, mats.lolly && mats.lolly.stick, mats.gummy,
        mats.capsule && mats.capsule.shell, mats.capsule && mats.capsule.ground].forEach(forgetMat);
      texClones.forEach(forgetDeadGL);
      ['black', 'flat', 'white', 'grey'].forEach(function (k) { forgetDeadGL(assets.ph[k]); });
      env.restore(); rig.restore();
      renderer.shadowMap.needsUpdate = true;
      applyEnv();
      warmed = false; ric(warmOther, 3000);        // the kinds not on show compile again at idle, so a swap never stalls
    }
    canvas.addEventListener('webglcontextrestored', onRestored, false);

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
        canvas.removeEventListener('webglcontextrestored', onRestored, false);
        if (ro) ro.disconnect(); else window.removeEventListener('resize', onWinResize);
        if (io) io.disconnect();
        window.removeEventListener('pointermove', onPointer);
        ix.dispose();
        disposeModel(model);
        if (incoming && incoming !== model) disposeModel(incoming);
        if (mats.lolly) { mats.lolly.candy.dispose(); mats.lolly.stick.dispose(); }
        if (mats.gummy) mats.gummy.dispose();
        if (mats.capsule) { mats.capsule.shell.dispose(); mats.capsule.ground.dispose(); }
        texClones.forEach(function (t) { t.dispose(); });
        assets.ph.dispose();
        env.dispose(); rig.dispose(); scene.environment = null;
        renderer.dispose();
        try { renderer.forceContextLoss(); } catch (e) { /* already gone */ }   // free the context now, not at GC
        canvas.remove();
      }
    };
    return firstFrame.then(function () {
      if (opts.onReady) opts.onReady(api);
      return api;
    });
  }

  window.GloCandy = {
    create: create, loadThree: loadThree, THREE_URL: THREE_URL, ASSET_BASE: ASSET_BASE,
    PRODUCTS: PRODUCTS,                     // 'strawberry-pop' | 'green-pop' | 'vitamin-c' (+ pinkPop, greenPop, capsules): frozen
    ENVIRONMENT_NAMES: ['beach', 'golden', 'studio', 'snow'],
    kinds: KINDS.slice(),                   // what create() / setProduct() can draw
    supports: function (kind) { return KINDS.indexOf(kind) >= 0; },
    // modules, for reuse and QA benches
    lighting: {
      ENVIRONMENTS: ENVIRONMENTS, envName: envName, assetsUsable: assetsUsable,
      configureRenderer: configureRenderer, buildEnvironment: buildEnvironment, buildLightRig: buildLightRig
    },
    attachInteraction: attachInteraction, patchBiteMaterial: patchBiteMaterial,
    _lab: {
      loadTextures: loadTextures, lollipopMaterials: lollipopMaterials, applyLollipopAssets: applyLollipopAssets,
      buildLollipop: buildLollipop, bakeAO: bakeAO, gummyMaterial: gummyMaterial, buildGummies: buildGummies,
      capsuleMaterials: capsuleMaterials, buildCapsules: buildCapsules,
      PRESETS: PRESETS, SUGAR: SUGAR, CAPSULE: CAPSULE, CAPSULE_LAYOUT: CAPSULE_LAYOUT, GROUND_SHADE: GROUND_SHADE,
      GUMMY_GEO: GUMMY_GEO,
      stats: function () {                  // QA: one-off costs and what the idle jobs have prepared
        var st = lollyCache ? { aoMs: lollyCache.ms, ballVerts: lollyCache.ball.position.length / 3 } : {};
        st.capsuleGeo = CAPSULE_GEO ? { done: CAPSULE_GEO.done, ms: Math.round(CAPSULE_GEO.ms) } : null;
        st.gummyGeo = Object.keys(GUMMY_GEO).map(function (k) { var J = GUMMY_GEO[k]; return { N: +k, done: J.done, ms: Math.round(J.ms) }; });
        st.sugar = SUGAR.real ? 'cc0' : SUGAR.real === false ? 'cc0 failed' : SUGAR.realJ ? 'cc0 processing' : SUGAR.realP ? 'cc0 decoding' : SUGAR.proc ? 'procedural' : 'not started';
        if (SUGAR.realJ) st.sugarMs = Math.round(SUGAR.realJ.ms);
        return st;
      }
    }
  };
})();
