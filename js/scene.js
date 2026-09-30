/* ==========================================================
   Asiful Mowla — Portfolio · Three.js background scene
   ========================================================== */
import * as THREE from "three";

const canvas = document.getElementById("webgl");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  scene.fog = new THREE.Fog(0x0c0d10, 8, 22);
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 8);

  const ACCENT = new THREE.Color("#c6ff3d");
  const VIOLET = new THREE.Color("#7c5cff");

  /* ---------- Noise-deformed blob (custom shader) ---------- */
  const noiseGLSL = /* glsl */ `
    vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
    float snoise(vec3 v){
      const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
      vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
      i=mod289(i);
      vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
      float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
      vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
      vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
      return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }`;

  const blobUniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.32 },
    uFreq: { value: 1.3 },
    uColorA: { value: VIOLET },
    uColorB: { value: ACCENT },
    uHover: { value: 0 },
    uOpacity: { value: 1 }
  };

  const blobMat = new THREE.ShaderMaterial({
    uniforms: blobUniforms,
    transparent: true,
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uAmp; uniform float uFreq; uniform float uHover;
      varying vec3 vNormal; varying vec3 vView; varying float vNoise;
      ${noiseGLSL}
      void main(){
        float n = snoise(normal * uFreq + uTime * 0.35);
        float n2 = snoise(normal * uFreq * 2.5 - uTime * 0.2) * 0.35;
        float d = (n + n2) * (uAmp + uHover * 0.15);
        vNoise = n;
        vec3 pos = position + normal * d;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorA; uniform vec3 uColorB; uniform float uOpacity;
      varying vec3 vNormal; varying vec3 vView; varying float vNoise;
      void main(){
        float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.2);
        vec3 base = mix(vec3(0.05,0.05,0.07), uColorA * 0.55, smoothstep(-0.6, 0.9, vNoise));
        vec3 col = mix(base, uColorB, fres * 0.9);
        col += uColorB * pow(fres, 4.0) * 0.6;
        gl_FragColor = vec4(col, uOpacity);
      }`
  });

  const group = new THREE.Group();
  scene.add(group);

  const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 64), blobMat);
  group.add(blob);

  // Wireframe shell
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.35, 2),
    new THREE.MeshBasicMaterial({ color: ACCENT, wireframe: true, transparent: true, opacity: 0.09 })
  );
  group.add(shell);

  // Orbit rings
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.006, 8, 200), ringMat);
  ring1.rotation.x = Math.PI / 2.3;
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.004, 8, 200), ringMat.clone());
  ring2.rotation.set(Math.PI / 1.7, 0.4, 0);
  group.add(ring1, ring2);

  // Small satellite on ring
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), new THREE.MeshBasicMaterial({ color: ACCENT }));
  group.add(moon);

  /* ---------- Floating wireframe shapes ---------- */
  const floaters = [];
  const shapeGeos = [
    new THREE.OctahedronGeometry(0.35),
    new THREE.TorusGeometry(0.28, 0.09, 12, 32),
    new THREE.BoxGeometry(0.4, 0.4, 0.4),
    new THREE.TetrahedronGeometry(0.38),
    new THREE.IcosahedronGeometry(0.3)
  ];
  for (let i = 0; i < 14; i++) {
    const m = new THREE.Mesh(
      shapeGeos[i % shapeGeos.length],
      new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? ACCENT : i % 3 === 1 ? VIOLET : 0xffffff, wireframe: true, transparent: true, opacity: 0.35 })
    );
    m.position.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 30 - 8, -2 - Math.random() * 6);
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
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 4;
    const c = Math.random() < 0.12 ? ACCENT : Math.random() < 0.2 ? VIOLET : white;
    colors.set([c.r, c.g, c.b], i * 3);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const dotTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.4, "rgba(255,255,255,.5)"); grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: 0.06, map: dotTex, vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(particles);

  /* ---------- Layout (responsive position) ---------- */
  let baseX = 2.6, baseY = 0, baseScale = 1, baseOpacity = 1;
  function layout() {
    const w = window.innerWidth;
    if (w < 768) { baseX = 0.9; baseY = 1.6; baseScale = 0.55; baseOpacity = 0.45; }
    else if (w < 1200) { baseX = 2.4; baseY = 0; baseScale = 0.8; baseOpacity = 0.8; }
    else { baseX = 2.8; baseY = 0; baseScale = 1; baseOpacity = 1; }
  }
  layout();

  /* ---------- Input ---------- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("mousemove", (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = -(e.clientY / window.innerHeight) * 2 + 1;
  });
  let scrollY = window.scrollY, smoothScroll = scrollY;
  window.addEventListener("scroll", () => (scrollY = window.scrollY), { passive: true });

  // Hover detection on blob (raises distortion)
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hoverTarget = 0;

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    layout();
  });

  /* ---------- Animate ---------- */
  const clock = new THREE.Clock();
  let running = true;
  document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) { clock.getDelta(); loop(); } });

  function loop() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const speed = reduceMotion ? 0.15 : 1;

    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;
    smoothScroll += (scrollY - smoothScroll) * 0.08;

    const vh = window.innerHeight;
    const heroProgress = Math.min(smoothScroll / vh, 1);           // 0 → 1 while leaving hero
    const pageProgress = smoothScroll / Math.max(document.body.scrollHeight - vh, 1);

    blobUniforms.uTime.value += dt * speed;

    // Hover
    ndc.set(mouse.tx, mouse.ty);
    raycaster.setFromCamera(ndc, camera);
    hoverTarget = raycaster.intersectObject(blob).length && heroProgress < 0.5 ? 1 : 0;
    blobUniforms.uHover.value += (hoverTarget - blobUniforms.uHover.value) * 0.06;

    // Main group: sits right in hero, drifts to the side/back as you scroll
    const side = pageProgress > 0.5 ? -1 : 1;
    group.position.x = THREE.MathUtils.lerp(baseX, side * (Math.max(baseX, 1.5) + 3), heroProgress) + mouse.x * 0.3;
    group.position.y = baseY * (1 - heroProgress) + mouse.y * 0.3 + Math.sin(t * 0.6) * 0.12 - heroProgress * 0.5;
    group.position.z = -heroProgress * 4;
    const s = baseScale * (1 - heroProgress * 0.25);
    // dim the centerpiece once we leave the hero so content stays readable
    const op = THREE.MathUtils.lerp(baseOpacity, Math.min(baseOpacity, 0.22), heroProgress);
    blobUniforms.uOpacity.value = op;
    shell.material.opacity = 0.09 * op;
    ring1.material.opacity = ring2.material.opacity = 0.12 * op;
    group.scale.setScalar(s);
    group.rotation.y = t * 0.12 * speed + pageProgress * Math.PI * 2 + mouse.x * 0.4;
    group.rotation.x = mouse.y * 0.3 + pageProgress * 1.2;

    shell.rotation.y = -t * 0.08; shell.rotation.z = t * 0.05;
    ring1.rotation.z = t * 0.2 * speed;
    ring2.rotation.z = -t * 0.15 * speed;
    const a = t * 0.8 * speed;
    moon.position.set(Math.cos(a) * 2.9, Math.sin(a) * 2.9 * Math.cos(Math.PI / 2.3), Math.sin(a) * 2.9 * Math.sin(Math.PI / 2.3));

    // Camera travels down through the particle field with scroll
    camera.position.y = -pageProgress * 18;
    camera.position.x = mouse.x * 0.4;
    camera.lookAt(camera.position.x * 0.5, camera.position.y, 0);
    group.position.y += camera.position.y;           // keep blob in view

    particles.rotation.y = t * 0.015;
    floaters.forEach((m) => {
      m.rotation.x += 0.004 * m.userData.speed * speed * 2;
      m.rotation.y += 0.006 * m.userData.speed * speed * 2;
      m.position.y = m.userData.baseY + Math.sin(t * m.userData.speed + m.userData.offset) * 0.4;
    });

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();
}
