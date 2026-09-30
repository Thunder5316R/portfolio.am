/* ==========================================================
   Asiful Mowla — Portfolio · Three.js scene
   A robot head that stares at your cursor + particle field.
   ========================================================== */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const canvas = document.getElementById("webgl");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = window.matchMedia("(hover: none)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
} catch (e) {
  console.warn("WebGL not available", e);
}

if (renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0c0d10, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0c0d10, 9, 24);
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 8);

  // Soft studio reflections for the metal
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const ACCENT = new THREE.Color("#c6ff3d");
  const VIOLET = new THREE.Color("#7c5cff");

  /* ---------- Shared glow texture ---------- */
  const dotTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.35, "rgba(255,255,255,.45)"); grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const glows = [];
  function makeGlow(color, size, opacity) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: dotTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false
    }));
    s.scale.setScalar(size); s.userData.base = opacity; glows.push(s);
    return s;
  }

  /* ---------- Lights ---------- */
  const lights = [
    [new THREE.AmbientLight(0xffffff, 0.25), 0.25, null],
    [new THREE.DirectionalLight(0xffffff, 1.3), 1.3, [-3, 4, 6]],   // key (front-left)
    [new THREE.DirectionalLight(ACCENT, 2.4), 2.4, [-6, 2, -4]],     // lime rim
    [new THREE.DirectionalLight(VIOLET, 3.2), 3.2, [6, -1, -3]]      // violet rim
  ];
  lights.forEach(([l, , p]) => { if (p) l.position.set(...p); scene.add(l); });

  /* ---------- Materials ---------- */
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x2a2e37, metalness: 0.55, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4, envMapIntensity: 0.55 });
  const darkMetal = new THREE.MeshPhysicalMaterial({ color: 0x15171c, metalness: 0.8, roughness: 0.4, envMapIntensity: 0.7 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x010102, metalness: 0.1, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.6 });
  const led = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true });
  const seam = new THREE.MeshBasicMaterial({ color: 0x31353f, transparent: true });
  const envMats = [[metal, 0.55], [darkMetal, 0.7], [glass, 0.6]];

  /* ---------- Robot head ---------- */
  const group = new THREE.Group();   // position / scale on page
  const rig = new THREE.Group();     // head + neck
  const head = new THREE.Group();    // rotates to look at the cursor
  scene.add(group); group.add(rig); rig.add(head);

  const R = 1.5, SY = 1.08;
  const onSphere = (psi, theta, r) =>
    new THREE.Vector3(r * Math.cos(psi) * Math.sin(theta), r * Math.cos(theta) * SY, r * Math.sin(psi) * Math.sin(theta));
  const faceOut = (obj, p) => { obj.position.copy(p); obj.lookAt(p.clone().multiplyScalar(2)); };

  // Skull
  const skull = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 96), metal);
  skull.scale.set(1, SY, 1); head.add(skull);

  // Glass visor across the eyes
  const V_PHI = 2.0, V_T0 = 1.02, V_TL = 0.8;
  const visor = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 96, 48, Math.PI / 2 - V_PHI / 2, V_PHI, V_T0, V_TL), glass);
  visor.scale.set(1, SY, 1); head.add(visor);

  // Latitude arcs hugging the visor edges
  function latArc(theta, arc, radius, tube, mat) {
    const w = new THREE.Group();
    w.position.y = radius * Math.cos(theta) * SY;
    w.rotation.y = arc / 2 - Math.PI / 2;
    const m = new THREE.Mesh(new THREE.TorusGeometry(radius * Math.sin(theta), tube, 8, 96, arc), mat);
    m.rotation.x = Math.PI / 2; w.add(m);
    return w;
  }
  head.add(latArc(V_T0 + V_TL, V_PHI, R * 1.018, 0.014, led));   // glowing lower edge
  head.add(latArc(V_T0, V_PHI, R * 1.016, 0.01, seam));          // upper edge

  // Panel seam over the top, ear to ear
  const seamRing = new THREE.Mesh(new THREE.TorusGeometry(R * 1.003, 0.008, 8, 160), seam);
  seamRing.scale.set(1, SY, 1); head.add(seamRing);

  // Eyes
  function makeEye(psi) {
    const g = new THREE.Group();
    faceOut(g, onSphere(psi, 1.4, R * 1.03));
    const lid = new THREE.Group(); g.add(lid);
    lid.add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.024, 12, 64), led));
    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.19, 48), new THREE.MeshBasicMaterial({ color: 0x07080a }));
    iris.position.z = -0.003; lid.add(iris);
    const pupil = new THREE.Group(); lid.add(pupil);
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.085, 40), led); core.position.z = 0.004; pupil.add(core);
    const shine = new THREE.Mesh(new THREE.CircleGeometry(0.024, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    shine.position.set(0.03, 0.035, 0.008); pupil.add(shine);
    const glow = makeGlow(ACCENT, 0.95, 0.32); glow.position.z = 0.03; lid.add(glow);
    head.add(g);
    return { lid, pupil };
  }
  const eyes = [makeEye(Math.PI / 2 + 0.36), makeEye(Math.PI / 2 - 0.36)];

  // LED-dot mouth (smiles on buttons, "o" when you hover the head)
  const mouthG = new THREE.Group();
  faceOut(mouthG, onSphere(Math.PI / 2, 1.98, R * 1.012));
  head.add(mouthG);
  const DOTS = 9, MW = 0.26;
  const dotGeo = new THREE.SphereGeometry(0.024, 12, 12);
  const mouthDots = Array.from({ length: DOTS }, () => { const d = new THREE.Mesh(dotGeo, led); mouthG.add(d); return d; });
  const mouthGlow = makeGlow(ACCENT, 0.9, 0.12); mouthG.add(mouthGlow);

  // Ears
  [-1, 1].forEach((s) => {
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.32, 48), darkMetal);
    ear.rotation.z = (Math.PI / 2) * s; ear.position.set(s * 1.47, 0.05, 0); head.add(ear);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.018, 8, 48), led);
    ring.rotation.y = Math.PI / 2; ring.position.set(s * 1.635, 0.05, 0); head.add(ring);
    const g = makeGlow(ACCENT, 0.75, 0.16); g.position.set(s * 1.68, 0.05, 0); head.add(g);
  });

  // Antenna
  const ant = new THREE.Group(); ant.position.y = R * SY - 0.03; ant.rotation.z = -0.22; head.add(ant);
  const antBase = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.14, 32), darkMetal); ant.add(antBase);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 12), darkMetal); stalk.position.y = 0.33; ant.add(stalk);
  const tipMat = led.clone();
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 24), tipMat); tip.position.y = 0.64; ant.add(tip);
  const tipGlow = makeGlow(ACCENT, 0.85, 0.55); tipGlow.position.y = 0.64; ant.add(tipGlow);

  // Neck (doesn't rotate with the head)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.64, 0.85, 48), darkMetal); neck.position.y = -1.75; rig.add(neck);
  [-1.55, -1.8].forEach((y) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.56 + (-1.55 - y) * 0.2, 0.02, 8, 64), seam);
    r.rotation.x = Math.PI / 2; r.position.y = y; rig.add(r);
  });
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.045, 12, 72), led);
  collar.rotation.x = Math.PI / 2; collar.position.y = -2.16; rig.add(collar);

  /* ---------- Orbit rings around the head ---------- */
  const rings = new THREE.Group(); rings.position.y = -1.25; group.add(rings);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.006, 8, 220), ringMat);
  ring1.rotation.x = Math.PI / 2.12;
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.004, 8, 220), ringMat.clone());
  ring2.rotation.set(Math.PI / 1.9, 0.25, 0);
  rings.add(ring1, ring2);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true }));
  rings.add(moon);

  /* ---------- Floating wireframe shapes ---------- */
  const floaters = [];
  const shapeGeos = [
    new THREE.OctahedronGeometry(0.35), new THREE.TorusGeometry(0.28, 0.09, 12, 32),
    new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.TetrahedronGeometry(0.38), new THREE.IcosahedronGeometry(0.3)
  ];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(shapeGeos[i % shapeGeos.length], new THREE.MeshBasicMaterial({
      color: i % 3 === 0 ? ACCENT : i % 3 === 1 ? VIOLET : 0xffffff, wireframe: true, transparent: true, opacity: 0.3
    }));
    m.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 30 - 8, -3 - Math.random() * 6);
    m.userData = { speed: 0.2 + Math.random() * 0.5, offset: Math.random() * Math.PI * 2, baseY: m.position.y };
    scene.add(m); floaters.push(m);
  }

  /* ---------- Particle field ---------- */
  const COUNT = window.innerWidth < 768 ? 1200 : 2600;
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const white = new THREE.Color(0xffffff);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 50 - 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
    const c = Math.random() < 0.12 ? ACCENT : Math.random() < 0.2 ? VIOLET : white;
    colors.set([c.r, c.g, c.b], i * 3);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: 0.06, map: dotTex, vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(particles);

  /* ---------- Layout ---------- */
  // Desktop: head on the right of the text. Tablet/mobile: head above the text.
  let baseX = 3, baseY = 0.1, baseScale = 1.1;
  function layout() {
    const w = window.innerWidth;
    if (w < 576) { baseX = 0; baseY = 1.75; baseScale = 0.5; }
    else if (w < 992) { baseX = 0; baseY = 1.7; baseScale = 0.6; }
    else if (w < 1200) { baseX = 2.5; baseY = 0.1; baseScale = 0.9; }
    else { baseX = 3; baseY = 0.1; baseScale = 1.1; }
  }
  layout();

  /* ---------- Input ---------- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let lastMove = -1e9, hoverBtn = false;
  const setPointer = (cx, cy) => {
    mouse.tx = (cx / window.innerWidth) * 2 - 1;
    mouse.ty = -(cy / window.innerHeight) * 2 + 1;
    lastMove = performance.now();
  };
  window.addEventListener("mousemove", (e) => setPointer(e.clientX, e.clientY));
  window.addEventListener("touchstart", (e) => setPointer(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  window.addEventListener("touchmove", (e) => setPointer(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  document.addEventListener("mouseover", (e) => { hoverBtn = !!e.target.closest(".btn, .contact-link, .nav-link, .navbar-brand"); });

  let scrollY = window.scrollY, smoothScroll = scrollY;
  window.addEventListener("scroll", () => (scrollY = window.scrollY), { passive: true });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    layout();
  });

  /* ---------- Animation state ---------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const lookPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -3);   // z = 3, in front of the head
  const lookTarget = new THREE.Vector3(), headWorld = new THREE.Vector3(), dir = new THREE.Vector3();
  const dummy = new THREE.Object3D(), euler = new THREE.Euler(0, 0, 0, "YXZ"), goalQ = new THREE.Quaternion(), invQ = new THREE.Quaternion();
  const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;

  let nextBlink = 1.5, blinkAt = -10, eyeSize = 1, smile = 0, surprise = 0, sideS = 1;

  const clock = new THREE.Clock();
  let running = true;
  document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) { clock.getDelta(); loop(); } });

  function loop() {
    if (!running) return;
    clock.getDelta();
    const t = clock.elapsedTime;
    const speed = reduceMotion ? 0.2 : 1;

    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    smoothScroll += (scrollY - smoothScroll) * 0.08;

    const vh = window.innerHeight;
    const heroProgress = Math.min(smoothScroll / vh, 1);
    const pageProgress = smoothScroll / Math.max(document.body.scrollHeight - vh, 1);

    // Camera drifts down through the particle field as you scroll
    camera.position.y = -pageProgress * 18;
    camera.position.x = mouse.x * 0.3;
    camera.lookAt(camera.position.x * 0.5, camera.position.y, 0);

    // Place the head: right of the hero text, then slides to the right edge and keeps watching
    sideS = 1;   // stays on the right edge, watching you scroll
    group.position.x = lerp(baseX, sideS * (Math.max(baseX, 2) + 4.2), heroProgress);
    group.position.y = baseY * (1 - heroProgress) + Math.sin(t * 0.8 * speed) * 0.08 - heroProgress * 0.4 + camera.position.y;
    group.position.z = -heroProgress * 3;
    group.scale.setScalar(baseScale * (1 - heroProgress * 0.45));
    group.updateMatrixWorld();

    // Where to look: the cursor, or wander around when idle / on touch devices
    const idle = performance.now() - lastMove > (isTouch ? 2500 : 3500);
    let lx = mouse.tx, ly = mouse.ty;
    if (idle) { lx = Math.sin(t * 0.45) * 0.75 + Math.sin(t * 1.7) * 0.08; ly = Math.cos(t * 0.33) * 0.35; }
    ndc.set(lx, ly);
    raycaster.setFromCamera(ndc, camera);
    raycaster.ray.intersectPlane(lookPlane, lookTarget);

    head.getWorldPosition(headWorld);
    dummy.position.copy(headWorld);
    dummy.lookAt(lookTarget);
    euler.setFromQuaternion(dummy.quaternion, "YXZ");
    euler.y = clamp(euler.y, -1.05, 1.05);
    euler.x = clamp(euler.x, -0.6, 0.55);
    euler.z = -euler.y * 0.12;                         // curious head tilt
    goalQ.setFromEuler(euler);
    head.quaternion.slerp(goalQ, (idle ? 0.03 : 0.085) * (reduceMotion ? 0.5 : 1));

    // Pupils lead the head a little
    dir.copy(lookTarget).sub(headWorld).normalize();
    invQ.copy(head.quaternion).invert();
    dir.applyQuaternion(invQ);
    const px = clamp(dir.x * 0.35, -0.075, 0.075), py = clamp(dir.y * 0.35, -0.07, 0.07);

    // Hovering the head -> surprised
    let over = false;
    if (!idle && heroProgress < 0.6) {
      ndc.set(mouse.tx, mouse.ty);
      raycaster.setFromCamera(ndc, camera);
      over = raycaster.intersectObjects([skull, visor], false).length > 0;
    }
    surprise += ((over ? 1 : 0) - surprise) * 0.12;
    smile += ((hoverBtn && !over ? 1 : 0) - smile) * 0.1;

    // Blink
    if (t > nextBlink) {
      blinkAt = t;
      nextBlink = t + (Math.random() < 0.2 ? 0.3 : 2 + Math.random() * 3.5);
    }
    const bp = (t - blinkAt) / 0.16;
    const lidOpen = bp >= 0 && bp < 1 ? Math.max(Math.abs(Math.cos(bp * Math.PI)), 0.06) : 1;
    eyeSize += ((1 + surprise * 0.25) - eyeSize) * 0.15;
    eyes.forEach((e) => {
      e.lid.scale.set(eyeSize, eyeSize * lidOpen, 1);
      e.pupil.position.x += (px - e.pupil.position.x) * 0.2;
      e.pupil.position.y += (py - e.pupil.position.y) * 0.2;
      e.pupil.scale.setScalar(1 - surprise * 0.3);
    });

    // Mouth: flat line -> smile (buttons) -> "o" (surprised)
    const k = 0.012 + smile * 0.1 + Math.sin(t * 2) * 0.004;
    mouthDots.forEach((d, i) => {
      const u = i / (DOTS - 1) * 2 - 1;
      const cx = u * MW, cy = -k * (1 - u * u) + k * 0.5;
      const a = (i / DOTS) * Math.PI * 2;
      d.position.set(lerp(cx, Math.cos(a) * 0.1, surprise), lerp(cy, Math.sin(a) * 0.1 - 0.02, surprise), 0.01);
    });

    // Antenna beacon
    const beat = surprise > 0.5 ? (Math.sin(t * 18) > 0 ? 1 : 0.2) : 0.55 + 0.45 * Math.sin(t * 3);

    // Dim the head once you scroll past the hero so content stays readable
    const dim = lerp(1, 0.38, heroProgress);
    lights.forEach(([l, base]) => (l.intensity = base * dim));
    envMats.forEach(([m, base]) => (m.envMapIntensity = base * dim));
    led.opacity = dim; seam.opacity = dim;
    tipMat.opacity = dim * beat;
    glows.forEach((g) => (g.material.opacity = g.userData.base * dim));
    tipGlow.material.opacity = 0.55 * dim * beat;
    moon.material.opacity = dim;
    ring1.material.opacity = ring2.material.opacity = 0.1 * dim;

    // Rings & moon
    ring1.rotation.z = t * 0.2 * speed;
    ring2.rotation.z = -t * 0.15 * speed;
    const a = t * 0.7 * speed, tilt = Math.PI / 2.12;
    moon.position.set(Math.cos(a) * 3.1, Math.sin(a) * 3.1 * Math.cos(tilt), Math.sin(a) * 3.1 * Math.sin(tilt));

    particles.rotation.y = t * 0.015;
    floaters.forEach((m) => {
      m.rotation.x += 0.008 * m.userData.speed * speed;
      m.rotation.y += 0.012 * m.userData.speed * speed;
      m.position.y = m.userData.baseY + Math.sin(t * m.userData.speed + m.userData.offset) * 0.4;
    });

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();
}
