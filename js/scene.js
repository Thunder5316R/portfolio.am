/* ==========================================================
   Asiful Mowla — Portfolio · Three.js scene
   · A cute chrome robot that watches your cursor (hero)
   · One 3D "set piece" per section that animates in on scroll
   · Particle field + floating wireframe shapes
   ========================================================== */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const canvas = document.getElementById("webgl");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = window.matchMedia("(hover: none)").matches;
const isMobile = () => window.innerWidth < 992;

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
  scene.fog = new THREE.Fog(0x0c0d10, 10, 26);
  const FOV = 45, CAM_Z = 8;
  const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, CAM_Z);

  // Studio reflections for the chrome
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const ACCENT = new THREE.Color("#c6ff3d");
  const VIOLET = new THREE.Color("#7c5cff");
  const { clamp, lerp } = THREE.MathUtils;
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const easeBack = (x) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);

  /* ---------- Shared glow sprite ---------- */
  const dotTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.35, "rgba(255,255,255,.45)"); grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const glows = [];
  function makeGlow(color, size, opacity) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(size); s.userData.base = opacity; glows.push(s);
    return s;
  }

  /* ---------- Lights ---------- */
  const lights = [
    [new THREE.AmbientLight(0xffffff, 0.2), 0.2, null],
    [new THREE.DirectionalLight(0xffffff, 1.6), 1.6, [-3, 5, 6]],     // key
    [new THREE.DirectionalLight(ACCENT, 2.0), 2.0, [-6, 1, -3]],      // lime rim
    [new THREE.DirectionalLight(VIOLET, 2.6), 2.6, [6, -2, -3]]       // violet rim
  ];
  lights.forEach(([l, , p]) => { if (p) l.position.set(...p); scene.add(l); });

  /* ---------- Materials ---------- */
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xd9dde3, metalness: 1, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.25 });
  const darkChrome = new THREE.MeshPhysicalMaterial({ color: 0x3a3d45, metalness: 0.95, roughness: 0.3, envMapIntensity: 0.9 });
  const bronze = new THREE.MeshPhysicalMaterial({ color: 0x8a6a2c, metalness: 1, roughness: 0.32, envMapIntensity: 0.9 });
  const screen = new THREE.MeshPhysicalMaterial({ color: 0x050607, metalness: 0.35, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 0.9 });
  const ledSolid = new THREE.MeshBasicMaterial({ color: ACCENT });
  const ledSoft = new THREE.MeshBasicMaterial({ color: ACCENT.clone().multiplyScalar(0.55) });
  // robot-only copies (these get dimmed once you scroll past the hero; the section pieces stay bright)
  const rChrome = chrome.clone(), rDark = darkChrome.clone(), rBronze = bronze.clone(), rScreen = screen.clone();
  const led = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true });
  const envMats = [[rChrome, 1.25], [rDark, 0.9], [rBronze, 0.9], [rScreen, 0.9]];

  /* ==========================================================
     ROBOT (hero)
     ========================================================== */
  const group = new THREE.Group();   // position / scale on page
  const rig = new THREE.Group();     // head + base
  const head = new THREE.Group();    // rotates to look at the cursor
  scene.add(group); group.add(rig); rig.add(head);

  const R = 1.5;
  // Point on the sphere for tangent-plane coords (x, y) on the front face
  const onFace = (x, y, r = R) => new THREE.Vector3(x, y, Math.sqrt(Math.max(r * r - x * x - y * y, 0)));
  const faceOut = (obj, p) => { obj.position.copy(p); obj.lookAt(p.clone().multiplyScalar(2)); };

  // Chrome ball
  rChrome.polygonOffset = true; rChrome.polygonOffsetFactor = 2; rChrome.polygonOffsetUnits = 2;   // the screen always wins the depth test
  const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), rChrome);
  head.add(ball);

  // Black glossy rounded screen, wrapped onto the sphere
  function screenPatch(w, h, rad, r) {
    const seg = 48;
    const geo = new THREE.PlaneGeometry(w, h, seg, seg);
    const pos = geo.attributes.position;
    const hw = w / 2 - rad, hh = h / 2 - rad;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i);
      // clamp points outside the rounded rect onto its boundary
      const cx = clamp(x, -hw, hw), cy = clamp(y, -hh, hh);
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
      if (d > rad) { x = cx + dx / d * rad; y = cy + dy / d * rad; }
      const p = onFace(x, y, r);
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    // exact sphere normals (computeVertexNormals breaks on the clamped edge triangles)
    const nrm = geo.attributes.normal;
    for (let i = 0; i < pos.count; i++) { const n = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize(); nrm.setXYZ(i, n.x, n.y, n.z); }
    return geo;
  }
  const face = new THREE.Mesh(screenPatch(1.9, 1.5, 0.42, R * 1.006), rScreen);
  face.position.y = -0.02;
  head.add(face);
  // Soft green ambient glow on the screen
  const faceGlow = makeGlow(ACCENT, 1.4, 0.07); faceGlow.position.set(0, 0.05, R + 0.05); head.add(faceGlow);

  // Eyes — two states: happy arcs (default) and round eyes that track the cursor
  function makeEye(x) {
    const g = new THREE.Group(); faceOut(g, onFace(x, 0.14, R * 1.012)); head.add(g);
    // happy arc  ∩
    const arc = new THREE.Group(); g.add(arc);
    const a = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.055, 12, 48, Math.PI), led); arc.add(a);
    [-1, 1].forEach((s) => { const cap = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), led); cap.position.x = s * 0.19; arc.add(cap); });
    arc.position.y = -0.06;
    // round eye
    const round = new THREE.Group(); g.add(round);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.2, 48), led); round.add(disc);
    const pupil = new THREE.Group(); round.add(pupil);
    const pupilDisc = new THREE.Mesh(new THREE.CircleGeometry(0.1, 32), new THREE.MeshBasicMaterial({ color: 0x06130a })); pupilDisc.position.z = 0.004; pupil.add(pupilDisc);
    const shine = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), new THREE.MeshBasicMaterial({ color: 0xffffff })); shine.position.set(0.035, 0.04, 0.008); pupil.add(shine);
    const glow = makeGlow(ACCENT, 1.0, 0.35); glow.position.z = 0.04; g.add(glow);
    return { arc, round, pupil, glow };
  }
  const eyes = [makeEye(-0.36), makeEye(0.36)];

  // Mouth — thin smile  ∪ ; becomes an "o" when surprised
  const mouthG = new THREE.Group(); faceOut(mouthG, onFace(0, -0.33, R * 1.012)); head.add(mouthG);
  const smileArc = new THREE.Group(); mouthG.add(smileArc);
  const smileMesh = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.022, 10, 40, Math.PI), led);
  smileMesh.rotation.z = Math.PI; smileArc.add(smileMesh); smileArc.position.y = 0.06;
  const oMouth = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.022, 10, 32), led); mouthG.add(oMouth);
  const mouthGlow = makeGlow(ACCENT, 0.7, 0.12); mouthG.add(mouthGlow);

  // Glowing LED ring where the ball meets the base + bronze base (base does not turn with the head)
  const ringY = -1.2, ringR = Math.sqrt(R * R - ringY * ringY) + 0.035;
  const ledRing = new THREE.Mesh(new THREE.TorusGeometry(ringR, 0.035, 12, 96), led);
  ledRing.rotation.x = Math.PI / 2; ledRing.position.y = ringY; rig.add(ledRing);
  const ringGlow = makeGlow(ACCENT, 2.6, 0.16); ringGlow.position.y = ringY - 0.1; rig.add(ringGlow);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(ringR - 0.06, ringR + 0.02, 0.5, 64), rBronze);
  base.position.y = ringY - 0.3; rig.add(base);
  const baseCap = new THREE.Mesh(new THREE.CylinderGeometry(ringR + 0.02, ringR - 0.1, 0.12, 64), rDark);
  baseCap.position.y = ringY - 0.61; rig.add(baseCap);

  /* ---------- Orbit rings around the robot ---------- */
  const rings = new THREE.Group(); rings.position.y = -1.0; group.add(rings);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(3.0, 0.006, 8, 220), ringMat); ring1.rotation.x = Math.PI / 2.12;
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.004, 8, 220), ringMat.clone()); ring2.rotation.set(Math.PI / 1.9, 0.25, 0);
  rings.add(ring1, ring2);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true })); rings.add(moon);

  /* ==========================================================
     SCROLL-TRIGGERED SET PIECES (one per section)
     Each piece: build() adds meshes to `g`, update(s) animates with
       s.enter : 0→1 eased as the section scrolls into view
       s.prog  : 0→1 progress of the section through the viewport
       s.t     : time,  s.vel : scroll speed
     ========================================================== */
  const pieces = [];
  function piece(sectionId, opts, build, update) {
    const g = new THREE.Group(); g.visible = false; scene.add(g);
    const p = { id: sectionId, el: document.getElementById(sectionId), g, enter: 0, ...opts, update };
    build(g, p); pieces.push(p); return p;
  }
  const edgeMat = (c, o = 0.5) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o });

  // 01 ABOUT — 27 mini cubes fly in and assemble into one big cube, then spin with the scroll
  piece("about", { x: 0.86, yPx: 60, xm: 0.78, ymPx: 30, scale: 0.85, scaleM: 0.5 }, (g, p) => {
    const geo = new THREE.BoxGeometry(0.42, 0.42, 0.42);
    const edges = new THREE.EdgesGeometry(geo);
    p.cubes = [];
    let i = 0;
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      const accent = (x + y + z + 3) % 4 === 0;
      const m = new THREE.Mesh(geo, accent ? new THREE.MeshPhysicalMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.35, metalness: 0.2, roughness: 0.35 }) : darkChrome);
      m.add(new THREE.LineSegments(edges, edgeMat(accent ? 0x0c0d10 : 0x8b93a1, 0.35)));
      m.userData = {
        home: new THREE.Vector3(x, y, z).multiplyScalar(0.47),
        away: new THREE.Vector3().randomDirection().multiplyScalar(3 + Math.random() * 2),
        delay: (i++ / 27) * 0.5
      };
      g.add(m); p.cubes.push(m);
    }
  }, (p, s) => {
    p.cubes.forEach((m) => {
      const k = easeBack(clamp((s.enter - m.userData.delay) / 0.5, 0, 1));
      m.position.lerpVectors(m.userData.away, m.userData.home, k);
      m.rotation.set((1 - k) * 2, (1 - k) * 3, 0);
    });
    p.g.rotation.y = s.prog * Math.PI * 1.5 + s.t * 0.15 + s.spin;
    p.g.rotation.x = 0.5 + Math.sin(s.t * 0.4) * 0.15 + s.prog * 0.6;
  });

  // 02 SKILLS — an atom: glowing core, three rings, electrons that speed up when you scroll
  piece("skills", { x: 0.88, yPx: 100, xm: 0.78, ymPx: 30, scale: 0.9, scaleM: 0.5 }, (g, p) => {
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 3), new THREE.MeshPhysicalMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.1 }));
    g.add(core, makeGlow(ACCENT, 2.2, 0.35));
    p.orbits = [];
    [[0, 0, 0], [Math.PI / 3, 0, Math.PI / 4], [-Math.PI / 3, 0, -Math.PI / 4]].forEach((rot, i) => {
      const o = new THREE.Group(); o.rotation.set(...rot);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.012, 8, 120), new THREE.MeshBasicMaterial({ color: i === 1 ? VIOLET : 0xffffff, transparent: true, opacity: 0.5 }));
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), chrome);
      const eg = makeGlow(i === 1 ? VIOLET : ACCENT, 0.6, 0.5); e.add(eg);
      o.add(ring, e); g.add(o); p.orbits.push({ o, e, ring, phase: i * 2.1, speed: 1 + i * 0.3 });
    });
  }, (p, s) => {
    const k = easeBack(s.enter);
    p.orbits.forEach((ob, i) => {
      ob.ring.scale.setScalar(Math.max(k, 0.001));
      const a = s.t * ob.speed + ob.phase + s.spin * 2;
      ob.e.position.set(Math.cos(a) * 1.25 * k, Math.sin(a) * 1.25 * k, 0);
      ob.o.rotation.y = s.prog * (i % 2 ? -1 : 1) * 1.5;
    });
    p.g.rotation.y = s.t * 0.2 + s.prog;
  });

  // 03 SERVICES — three glass layers that fan out like stacked UI cards
  piece("services", { x: 0.84, yPx: 100, xm: 0.76, ymPx: 30, scale: 0.72, scaleM: 0.45 }, (g, p) => {
    p.layers = [];
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x9aa3b4, metalness: 0.2, roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.4, envMapIntensity: 1, side: THREE.DoubleSide });
    [0, 1, 2].forEach((i) => {
      const geo = new THREE.BoxGeometry(2.4, 1.5, 0.08);
      const m = new THREE.Mesh(geo, glass);
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat(i === 2 ? ACCENT : 0xffffff, 0.6)));
      // "content" bars on each card
      for (let b = 0; b < 3; b++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(b === 0 ? 1.1 : 1.6, 0.12, 0.02), b === 0 ? ledSolid : ledSoft);
        bar.position.set(-1.2 + (b === 0 ? 0.55 : 0.8) + 0.2, 0.45 - b * 0.35, 0.05); m.add(bar);
      }
      g.add(m); p.layers.push(m);
    });
    g.rotation.set(0.35, -0.5, 0.1);
  }, (p, s) => {
    const k = easeBack(s.enter);
    p.layers.forEach((m, i) => {
      m.position.set(0.25 * (i - 1) * k, -0.4 * (i - 1) * k + s.prog * 0.3 * (i - 1), (i - 1) * 0.9 * k);
      m.material.opacity = 0.1 + 0.35 * s.enter;
    });
    p.g.rotation.y = -0.5 + s.prog * 0.9 + Math.sin(s.t * 0.5) * 0.08 + s.spin;
  });

  // 04 PROJECTS — chrome torus knot that grows in and twists with the scroll
  piece("projects", { x: 0.82, yPx: 130, fromBottom: true, xm: 0.78, ymPx: 20, scale: 0.75, scaleM: 0.45 }, (g, p) => {
    const geo = new THREE.TorusKnotGeometry(0.95, 0.28, 180, 24, 2, 3);
    p.knot = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0xb8bcc8, metalness: 1, roughness: 0.2, envMapIntensity: 1.1 }));
    p.wire = new THREE.Mesh(new THREE.TorusKnotGeometry(1.0, 0.33, 90, 12, 2, 3), new THREE.MeshBasicMaterial({ color: ACCENT, wireframe: true, transparent: true, opacity: 0.12 }));
    g.add(p.knot, p.wire);
  }, (p, s) => {
    const k = easeBack(s.enter);
    p.g.scale.setScalar(Math.max(k, 0.001) * s.baseScale);
    p.g.rotation.set(s.prog * 2 + 0.4, s.t * 0.25 + s.prog * 3 + s.spin, 0);
    p.wire.rotation.y = -s.t * 0.1;
  });

  // 05 JOURNEY — a double helix that draws itself as you scroll down the timeline
  piece("journey", { x: 0.8, yPx: 460, xm: 0.86, ymPx: 30, scale: 1, scaleM: 0.45 }, (g, p) => {
    p.beads = []; const N = 64, H = 4.2;
    const geo = new THREE.SphereGeometry(0.075, 12, 12);
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      [0, Math.PI].forEach((off, strand) => {
        const b = new THREE.Mesh(geo, strand ? chrome : new THREE.MeshBasicMaterial({ color: ACCENT }));
        b.userData = { u, off, strand }; g.add(b); p.beads.push(b);
      });
      if (i % 4 === 0) {
        const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
        rung.rotation.z = Math.PI / 2; rung.userData = { u, rung: true }; g.add(rung); p.beads.push(rung);
      }
    }
    p.H = H;
  }, (p, s) => {
    const drawn = s.enter * 0.35 + s.prog * 0.75;                      // draws in, then keeps growing as you scroll
    const spin = s.t * 0.4 + s.prog * 4 + s.spin;
    p.beads.forEach((b) => {
      const { u } = b.userData;
      const vis = clamp((drawn - u) / 0.08, 0, 1);
      const y = p.H / 2 - u * p.H, a = u * Math.PI * 4 + spin;
      if (b.userData.rung) { b.position.set(0, y, 0); b.rotation.y = -a; }
      else b.position.set(Math.cos(a + b.userData.off) * 0.65, y, Math.sin(a + b.userData.off) * 0.65);
      b.scale.setScalar(Math.max(vis, 0.001));
    });
  });

  // 06 CONTACT — a radio signal: rings pulse outward, a paper plane circles in
  piece("contact", { x: 0.74, yPx: 110, fromBottom: true, xm: 0.3, ymPx: -20, scale: 0.8, scaleM: 0.5 }, (g, p) => {
    p.rings = [];
    for (let i = 0; i < 4; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.4 + i * 0.36, 0.02 - i * 0.003, 8, 96), new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.6 }));
      r.rotation.x = Math.PI / 3; g.add(r); p.rings.push(r);
    }
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 24), chrome); g.add(dot, makeGlow(ACCENT, 1.2, 0.4));
    p.plane = new THREE.Mesh(new THREE.TetrahedronGeometry(0.28), new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.25, envMapIntensity: 1 }));
    p.plane.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.TetrahedronGeometry(0.28)), edgeMat(0x0c0d10, 0.5)));
    g.add(p.plane);
  }, (p, s) => {
    p.rings.forEach((r, i) => {
      const w = ((s.t * 0.6 + i * 0.25 + s.prog) % 1);              // 0→1 pulse per ring
      const k = easeBack(clamp((s.enter - i * 0.12) / 0.6, 0, 1));
      r.scale.setScalar(Math.max((0.4 + w * 1.2) * k, 0.001));
      r.material.opacity = (1 - w) * 0.6 * s.enter;
    });
    const a = s.t * 1.2 + s.prog * 3;
    p.plane.position.set(Math.cos(a) * 2.0 * s.enter, Math.sin(a * 0.7) * 0.5, Math.sin(a) * 2.0 * s.enter);
    p.plane.rotation.set(a, a * 0.7, 0);
    p.g.rotation.y = s.prog * 0.8 + s.spin;
  });

  /* ---------- Floating wireframe shapes ---------- */
  const floaters = [];
  const shapeGeos = [new THREE.OctahedronGeometry(0.35), new THREE.TorusGeometry(0.28, 0.09, 12, 32), new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.TetrahedronGeometry(0.38), new THREE.IcosahedronGeometry(0.3)];
  for (let i = 0; i < 18; i++) {
    const m = new THREE.Mesh(shapeGeos[i % shapeGeos.length], new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? ACCENT : i % 3 === 1 ? VIOLET : 0xffffff, wireframe: true, transparent: true, opacity: 0.3 }));
    m.userData = { speed: 0.2 + Math.random() * 0.5, offset: Math.random() * Math.PI * 2, u: Math.random(), x: (Math.random() - 0.5) * 16, z: -3 - Math.random() * 6 };
    scene.add(m); floaters.push(m);
  }

  /* ---------- Particle field ---------- */
  const COUNT = window.innerWidth < 768 ? 1600 : 3600;
  const positions = new Float32Array(COUNT * 3), colors = new Float32Array(COUNT * 3);
  const white = new THREE.Color(0xffffff);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = Math.random();              // 0..1 — stretched to the page height in layout()
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;
    const c = Math.random() < 0.12 ? ACCENT : Math.random() < 0.2 ? VIOLET : white;
    colors.set([c.r, c.g, c.b], i * 3);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.06, map: dotTex, vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(particles);

  /* ---------- Layout ---------- */
  // World units per CSS pixel at z = 0 (so 3D pieces can be anchored to page positions)
  let upp = 1, visibleH = 1, pageUnits = 20, docH = 1;
  let baseX = 3, baseY = 0.1, baseScale = 1.1;
  function layout() {
    const w = window.innerWidth, vh = window.innerHeight;
    visibleH = 2 * CAM_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    upp = visibleH / vh;
    docH = Math.max(document.documentElement.scrollHeight, vh);
    pageUnits = docH * upp;
    if (w < 576) { baseX = 0; baseY = 1.75; baseScale = 0.5; }
    else if (w < 992) { baseX = 0; baseY = 1.7; baseScale = 0.6; }
    else if (w < 1200) { baseX = 2.5; baseY = 0.1; baseScale = 0.9; }
    else { baseX = 3; baseY = 0.1; baseScale = 1.1; }
    // stretch particles & floaters over the whole page
    const pos = pGeo.attributes.position;
    for (let i = 0; i < COUNT; i++) {
      const u = i / COUNT; // deterministic spread
      pos.setY(i, visibleH - (u + ((i * 7919) % 1000) / 1000 * 0.002) * (pageUnits + visibleH * 2));
    }
    pos.needsUpdate = true;
    floaters.forEach((m) => { m.userData.baseY = visibleH * 0.5 - m.userData.u * pageUnits; m.position.set(m.userData.x, m.userData.baseY, m.userData.z); });
  }
  layout();
  window.addEventListener("load", layout);
  // Re-measure when the page height changes (fonts, project filters, images)
  if (window.ResizeObserver) new ResizeObserver(() => layout()).observe(document.body);

  /* ---------- Input ---------- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let lastMove = -1e9, hoverBtn = false;
  const setPointer = (cx, cy) => { mouse.tx = (cx / window.innerWidth) * 2 - 1; mouse.ty = -(cy / window.innerHeight) * 2 + 1; lastMove = performance.now(); };
  window.addEventListener("mousemove", (e) => setPointer(e.clientX, e.clientY));
  window.addEventListener("touchstart", (e) => setPointer(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  window.addEventListener("touchmove", (e) => setPointer(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  document.addEventListener("mouseover", (e) => { hoverBtn = !!e.target.closest(".btn, .contact-link, .nav-link, .navbar-brand, .project-card, .chip"); });

  let scrollY = window.scrollY, smoothScroll = scrollY, prevScroll = scrollY, vel = 0, spin = 0;
  window.__snapScroll = () => { scrollY = smoothScroll = prevScroll = window.scrollY; };
  window.addEventListener("scroll", () => (scrollY = window.scrollY), { passive: true });
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight); layout();
  });

  /* ---------- Animation state ---------- */
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const lookPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -3);
  const lookTarget = new THREE.Vector3(), headWorld = new THREE.Vector3(), dir = new THREE.Vector3();
  const dummy = new THREE.Object3D(), euler = new THREE.Euler(0, 0, 0, "YXZ"), goalQ = new THREE.Quaternion(), invQ = new THREE.Quaternion();
  let nextBlink = 2, blinkAt = -10, happy = 1, surprise = 0, smile = 0, eyeSize = 1;

  const clock = new THREE.Clock();
  let running = true;
  document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) { clock.getDelta(); loop(); } });

  function loop() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;
    const speed = reduceMotion ? 0.2 : 1;
    const vh = window.innerHeight, vw = window.innerWidth, mobile = isMobile();
    const K = (rate) => 1 - Math.exp(-rate * dt);                     // frame-rate independent easing factor

    mouse.x += (mouse.tx - mouse.x) * K(3);
    mouse.y += (mouse.ty - mouse.y) * K(3);
    smoothScroll += (scrollY - smoothScroll) * K(5);
    vel = (smoothScroll - prevScroll) / Math.max(dt, 0.001); prevScroll = smoothScroll;
    spin += vel * 0.00015 * speed;                                  // scroll speed adds a little extra spin to the pieces

    const heroProgress = clamp(smoothScroll / vh, 0, 1);

    // Camera rides down the page 1:1 with the scroll
    camera.position.y = -smoothScroll * upp;
    camera.position.x = mouse.x * 0.3;
    camera.lookAt(camera.position.x * 0.5, camera.position.y, 0);

    /* ---- Robot placement: beside the hero text, then parks at the right edge and keeps watching ---- */
    group.position.x = lerp(baseX, Math.max(baseX, 2) + 4.2, heroProgress);
    group.position.y = baseY * (1 - heroProgress) + Math.sin(t * 0.8 * speed) * 0.08 - heroProgress * 0.4 + camera.position.y;
    group.position.z = -heroProgress * 3;
    group.scale.setScalar(baseScale * (1 - heroProgress * 0.45));
    group.updateMatrixWorld();

    // Where to look: the cursor, or wander when idle / on touch screens
    const idleFor = (performance.now() - lastMove) / 1000;
    let idle = idleFor > (isTouch ? 2.5 : 3.5);
    if (!isTouch && heroProgress < 0.6) { ndc.set(mouse.tx, mouse.ty); raycaster.setFromCamera(ndc, camera); if (raycaster.intersectObject(ball, false).length) idle = false; }
    let lx = mouse.tx, ly = mouse.ty;
    if (idle) { lx = Math.sin(t * 0.45) * 0.75 + Math.sin(t * 1.7) * 0.08; ly = Math.cos(t * 0.33) * 0.35; }
    ndc.set(lx, ly); raycaster.setFromCamera(ndc, camera); raycaster.ray.intersectPlane(lookPlane, lookTarget);
    head.getWorldPosition(headWorld);
    dummy.position.copy(headWorld); dummy.lookAt(lookTarget);
    euler.setFromQuaternion(dummy.quaternion, "YXZ");
    euler.y = clamp(euler.y, -1.05, 1.05); euler.x = clamp(euler.x, -0.6, 0.55); euler.z = -euler.y * 0.12;
    goalQ.setFromEuler(euler);
    head.quaternion.slerp(goalQ, K(idle ? 1.8 : 5.3) * (reduceMotion ? 0.5 : 1));

    // Pupils lead the head a little
    dir.copy(lookTarget).sub(headWorld).normalize(); invQ.copy(head.quaternion).invert(); dir.applyQuaternion(invQ);
    const px = clamp(dir.x * 0.35, -0.08, 0.08), py = clamp(dir.y * 0.35, -0.07, 0.07);

    // Expressions: hover the robot → surprised; hover a button → big smile; idle → happy closed eyes (default look)
    let over = false;
    if (!isTouch && heroProgress < 0.6) { ndc.set(mouse.tx, mouse.ty); raycaster.setFromCamera(ndc, camera); over = raycaster.intersectObjects([ball, face], false).length > 0; }
    surprise += ((over ? 1 : 0) - surprise) * K(7.7);
    smile += ((hoverBtn && !over ? 1 : 0) - smile) * K(6.3);
    const happyTarget = over ? 0 : (idle || hoverBtn || idleFor > 1.6) ? 1 : 0;   // eyes open to track while you move the mouse
    happy += (happyTarget - happy) * K(6.3);

    // Blink (only while the round eyes are open)
    if (t > nextBlink) { blinkAt = t; nextBlink = t + (Math.random() < 0.2 ? 0.3 : 2 + Math.random() * 3.5); }
    const bp = (t - blinkAt) / 0.16;
    const lidOpen = bp >= 0 && bp < 1 ? Math.max(Math.abs(Math.cos(bp * Math.PI)), 0.06) : 1;
    eyeSize += ((1 + surprise * 0.3) - eyeSize) * K(9.8);
    eyes.forEach((e) => {
      e.round.visible = happy < 0.96;
      e.arc.visible = happy > 0.04;
      e.round.scale.set(eyeSize, Math.max(eyeSize * lidOpen * (1 - happy), 0.001), 1);
      e.arc.scale.set(Math.max(happy, 0.001) * (1 + smile * 0.15), Math.max(happy, 0.001) * (1 + Math.sin(t * 2) * 0.03), 1);
      e.pupil.position.x += (px - e.pupil.position.x) * K(13); e.pupil.position.y += (py - e.pupil.position.y) * K(13);
      e.pupil.scale.setScalar(1 - surprise * 0.3);
      e.glow.material.opacity = e.glow.userData.base * (0.8 + surprise * 0.5);
    });
    // Mouth
    smileArc.scale.set(Math.max((1 + smile * 0.5) * (1 - surprise), 0.001), Math.max((1 + smile * 0.6) * (1 - surprise), 0.001), 1);
    oMouth.scale.setScalar(Math.max(surprise, 0.001)); oMouth.visible = surprise > 0.03; smileArc.visible = surprise < 0.97;

    // Dim the robot once you scroll past the hero so the content stays readable
    const dim = lerp(1, 0.4, heroProgress);
    lights.forEach(([l, b]) => (l.intensity = b));
    envMats.forEach(([m, b]) => (m.envMapIntensity = b * lerp(1, 0.55, heroProgress)));
    led.opacity = dim;
    const pulse = 0.85 + 0.15 * Math.sin(t * 3);
    glows.forEach((g) => (g.material.opacity = g.userData.base * pulse));
    ringGlow.material.opacity = 0.16 * dim * pulse;
    moon.material.opacity = dim; ring1.material.opacity = ring2.material.opacity = 0.1 * dim;
    ring1.rotation.z = t * 0.2 * speed; ring2.rotation.z = -t * 0.15 * speed;
    const a = t * 0.7 * speed, tilt = Math.PI / 2.12;
    moon.position.set(Math.cos(a) * 3.0, Math.sin(a) * 3.0 * Math.cos(tilt), Math.sin(a) * 3.0 * Math.sin(tilt));

    /* ---- Scroll-triggered set pieces ---- */
    pieces.forEach((p) => {
      if (!p.el) return;
      const r = p.el.getBoundingClientRect();
      const inView = r.top < vh * 0.85 && r.bottom > vh * 0.15;
      p.enter += ((inView ? 1 : 0) - p.enter) * K(inView ? 2.8 : 5) * (reduceMotion ? 3 : 1);
      p.g.visible = p.enter > 0.002 && r.bottom > -vh && r.top < vh * 2;
      if (!p.g.visible) return;
      const prog = clamp((vh * 0.8 - r.top) / (r.height + vh * 0.8), 0, 1);
      const xFrac = mobile ? p.xm : p.x, baseScale = mobile ? p.scaleM : p.scale;
      let yPx = mobile ? p.ymPx : p.yPx;
      if (p.fromBottom && !mobile) yPx = r.height - yPx;                 // measured up from the section's bottom
      // anchor: xFrac across the viewport, yPx below the section's top (document position → world units)
      p.g.position.set((xFrac - 0.5) * vw * upp, -((r.top + scrollY) + yPx) * upp + visibleH / 2, 0);
      p.g.scale.setScalar(baseScale);
      p.update(p, { enter: reduceMotion ? 1 : p.enter, prog, t: t * speed, vel, spin, baseScale });
    });

    particles.rotation.y = 0; particles.position.x = Math.sin(t * 0.05) * 0.3;
    floaters.forEach((m) => {
      m.rotation.x += (0.008 * m.userData.speed + Math.abs(vel) * 0.00002) * speed;
      m.rotation.y += (0.012 * m.userData.speed + Math.abs(vel) * 0.00003) * speed;
      m.position.y = m.userData.baseY + Math.sin(t * m.userData.speed + m.userData.offset) * 0.4;
    });

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();
}
