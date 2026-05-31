// Genuine 3D glossy lollipop (WebGL via Three.js) for the "Why Glow Pop" section.
// Solid pink candy + glistening cool sheen (no stripes), rotating slowly.
// Sits behind the left of the title/chart as an off-center background accent.
import * as THREE from 'three';

const mount = document.getElementById('lolly3dMount');
if (mount) {
  init(mount).catch(() => { /* if WebGL/three fails, section just shows no lollipop */ });
}

async function init(mount) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = mount.clientWidth || 600;
  let H = mount.clientHeight || 760;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 100);
  camera.position.set(0, 0.3, 13);
  camera.lookAt(0, 0.3, 0);

  // Procedural studio environment (gradient) -> glossy reflections that read as "sheen".
  const envTex = makeEnvTexture();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromEquirectangular(envTex);
  scene.environment = envRT.texture;
  envTex.dispose();
  pmrem.dispose();

  // ── Lollipop assembly ──
  // yaw (spins around world Y) > tilt (fixed lean) > candy + stick.
  const yaw = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.rotation.z = 0.24;
  yaw.add(tilt);
  scene.add(yaw);

  const candy = new THREE.Mesh(
    new THREE.SphereGeometry(1.9, 96, 96),
    new THREE.MeshPhysicalMaterial({
      color: 0xff2b95,                       // solid Glow-Pop pink
      roughness: 0.16,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,              // wet, glassy candy shell
      envMapIntensity: 1.35,
      emissive: new THREE.Color(0xff2b95),   // self-glow floor -> silhouette can never go black
      emissiveIntensity: 0.4,
      sheen: 0.8,
      sheenRoughness: 0.35,
      sheenColor: new THREE.Color(0xcfe6ff)
    })
  );
  candy.position.y = 1.5;
  tilt.add(candy);

  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 3.4, 40),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.35, clearcoat: 0.5, envMapIntensity: 0.8 })
  );
  stick.position.y = -1.1;
  tilt.add(stick);

  // ── Lights (bright & wrap-around so no edge goes dark) ──
  scene.add(new THREE.AmbientLight(0xfff2f8, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 6, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xcfe6ff, 1.9);   // icy cool fill, brightens shadow side
  fill.position.set(-6, -1, 2);
  scene.add(fill);
  const under = new THREE.DirectionalLight(0xffe6f2, 1.2);  // bounce from below -> kills dark rim
  under.position.set(0, -6, 3);
  scene.add(under);
  const back = new THREE.DirectionalLight(0xffd9ec, 1.1);   // back light wraps the silhouette
  back.position.set(0, 1, -6);
  scene.add(back);

  function resize() {
    W = mount.clientWidth || W;
    H = mount.clientHeight || H;
    renderer.setSize(W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  // Only animate while the section is on screen (saves battery/CPU).
  let onScreen = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { onScreen = entries[0].isIntersecting; }, { threshold: 0.01 })
      .observe(mount);
  }

  let frames = 0;
  function loop() {
    if (onScreen) {
      if (!reduce) yaw.rotation.y += 0.0032;   // very slow, elegant spin
      candy.position.y = 1.5 + Math.sin(frames * 0.012) * 0.05; // tiny breathing bob
      renderer.render(scene, camera);
      frames++;
    }
    requestAnimationFrame(loop);
  }
  renderer.render(scene, camera);
  loop();

  // Lightweight debug hook (lit-pixel sampler) for verification.
  window.__lolly3d = {
    get frames() { return frames; },
    sample() {
      const gl = renderer.getContext();
      const w = renderer.domElement.width, h = renderer.domElement.height;
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let lit = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 10) lit++;
      return { w, h, lit };
    }
  };
}

function makeEnvTexture() {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0.00, '#ffffff');
  grad.addColorStop(0.40, '#f3f8ff');
  grad.addColorStop(0.72, '#ffe6f3');
  grad.addColorStop(1.00, '#ffd2ea');   // kept light all the way down -> no dark grazing reflections
  g.fillStyle = grad; g.fillRect(0, 0, 32, 128);
  // bright cool "softbox" blooms for icy, lively highlights
  g.globalAlpha = 0.95;
  g.fillStyle = '#ffffff';
  g.beginPath(); g.ellipse(10, 24, 7, 17, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#dff1ff';
  g.beginPath(); g.ellipse(24, 56, 4, 11, 0, 0, Math.PI * 2); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
