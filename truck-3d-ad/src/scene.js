// Bahar Al-Sharq — anamorphic ("naked-eye 3D") ad for the LED screens on the company trucks.
// The camera never moves: the screen shows a deep, lit "box" set into a black bezel, and objects
// break out of that box over the bezel toward the viewer, which is what sells the illusion.
// Every frame is a pure function of time, so the offline renderer can step frame by frame.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const params = new URLSearchParams(location.search);
const WIDTH = +(params.get('w') || 1920);
const HEIGHT = +(params.get('h') || 960);
const PREVIEW = params.has('preview');
export const DURATION = 24;

// ---------- brand palette ----------
const NAVY = 0x0a1f5c;
const DEEP = 0x040c26;
const ROYAL = 0x1f56d6;
const ELECTRIC = 0x2f8bff;
const GOLD = 0xf6b01e;
const WHITE = 0xffffff;

// ---------- timing helpers ----------
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const smooth = (x) => x * x * (3 - 2 * x);
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeIn = (x) => x * x * x;
const easeOutBack = (x, s = 1.7) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
const lerp = (a, b, x) => a + (b - a) * x;
const pulse = (t, a, b) => (t < a || t > b ? 0 : Math.sin(Math.PI * (t - a) / (b - a)));
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- renderer / camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// The screen plane is z = 0 and spans SW x SH; the camera sits straight in front of it.
const SW = 20, SH = SW * HEIGHT / WIDTH;
const CZ = 18;
const camera = new THREE.PerspectiveCamera(2 * Math.atan(SH / 2 / CZ) * 180 / Math.PI, WIDTH / HEIGHT, 0.1, 200);
camera.position.set(0, 0, CZ);
camera.lookAt(0, 0, 0);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

// ---------- the box ("room") behind the bezel ----------
const OW = SW * 0.78, OH = SH * 0.76; // opening
const HX = OW / 2, HY = OH / 2;
const RD = 30; // room depth

function panelTexture(base, line, glow) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  const grd = g.createLinearGradient(0, 0, 512, 512);
  grd.addColorStop(0, 'rgba(255,255,255,0.05)'); grd.addColorStop(1, 'rgba(0,0,0,0.15)');
  g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = line; g.lineWidth = 6;
  g.strokeRect(3, 3, 506, 506);
  g.strokeStyle = glow; g.lineWidth = 2;
  g.beginPath(); g.moveTo(40, 256); g.lineTo(472, 256); g.stroke();
  g.fillStyle = glow;
  for (const [x, y] of [[24, 24], [488, 24], [24, 488], [488, 488]]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

const room = new THREE.Group();
scene.add(room);
const wallTex = panelTexture('#0b1f57', '#06102e', '#2a5fd8');
const floorTex = panelTexture('#081640', '#030a22', '#2f6cff');
function wall(w, h, mat, pos, rot, rx, ry) {
  const m = mat.clone();
  m.map = m.map.clone(); m.map.needsUpdate = true; m.map.repeat.set(rx, ry);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  mesh.position.copy(pos); mesh.rotation.set(...rot);
  mesh.receiveShadow = true;
  room.add(mesh);
  return mesh;
}
const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.6, metalness: 0.3 });
const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.38, metalness: 0.5 });
wall(RD, OH, wallMat, new THREE.Vector3(-HX, 0, -RD / 2), [0, Math.PI / 2, 0], RD / 3, OH / 3);
wall(RD, OH, wallMat, new THREE.Vector3(HX, 0, -RD / 2), [0, -Math.PI / 2, 0], RD / 3, OH / 3);
wall(OW, RD, floorMat, new THREE.Vector3(0, -HY, -RD / 2), [-Math.PI / 2, 0, 0], OW / 3, RD / 3);
wall(OW, RD, wallMat, new THREE.Vector3(0, HY, -RD / 2), [Math.PI / 2, 0, 0], OW / 3, RD / 3);
const backWall = wall(OW, OH, wallMat, new THREE.Vector3(0, 0, -RD), [0, 0, 0], OW / 3, OH / 3);

// neon rings running down the box
const neonRings = [];
const RING_Z = [];
for (let z = -1.5; z > -RD; z -= 4.6) RING_Z.push(z);
RING_Z.forEach((z, i) => {
  const color = new THREE.Color(i % 2 ? ELECTRIC : GOLD);
  const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const g = new THREE.Group();
  const th = 0.07, inset = 0.03;
  const bars = [
    [OW - 0.1, th, 0, HY - inset], [OW - 0.1, th, 0, -HY + inset],
    [th, OH - 0.1, -HX + inset, 0], [th, OH - 0.1, HX - inset, 0],
  ];
  for (const [w, h, x, y] of bars) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.07), mat);
    m.position.set(x, y, z);
    g.add(m);
  }
  room.add(g);
  neonRings.push({ group: g, mat, base: color.clone(), z, i });
});
// corner strips running along the depth
const stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(ELECTRIC), toneMapped: false });
for (const [x, y] of [[-HX, -HY], [HX, -HY], [-HX, HY], [HX, HY]]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, RD), stripMat);
  m.position.set(x * 0.995, y * 0.995, -RD / 2);
  room.add(m);
}

// ---------- the bezel ----------
const bezel = new THREE.Group();
scene.add(bezel);
{
  const outer = new THREE.Shape();
  outer.moveTo(-SW, -SH); outer.lineTo(SW, -SH); outer.lineTo(SW, SH); outer.lineTo(-SW, SH); outer.lineTo(-SW, -SH);
  const hole = new THREE.Path();
  hole.moveTo(-HX, -HY); hole.lineTo(-HX, HY); hole.lineTo(HX, HY); hole.lineTo(HX, -HY); hole.lineTo(-HX, -HY);
  outer.holes.push(hole);
  const geo = new THREE.ShapeGeometry(outer);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x000000 }));
  bezel.add(m);
  // thin lip around the opening
  const lip = new THREE.Shape();
  const L = 0.16;
  lip.moveTo(-HX - L, -HY - L); lip.lineTo(HX + L, -HY - L); lip.lineTo(HX + L, HY + L); lip.lineTo(-HX - L, HY + L); lip.lineTo(-HX - L, -HY - L);
  lip.holes.push(hole);
  const lipGeo = new THREE.ExtrudeGeometry(lip, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3 });
  lipGeo.translate(0, 0, -0.5);
  const lipMesh = new THREE.Mesh(lipGeo, new THREE.MeshStandardMaterial({ color: 0x0d1d48, metalness: 0.9, roughness: 0.3 }));
  bezel.add(lipMesh);
}
const bezelLineMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(GOLD), toneMapped: false });
{
  const t = 0.035, L = 0.26;
  for (const [w, h, x, y] of [[OW + 2 * L, t, 0, HY + L], [OW + 2 * L, t, 0, -HY - L], [t, OH + 2 * L, -HX - L, 0], [t, OH + 2 * L, HX + L, 0]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), bezelLineMat);
    m.position.set(x, y, 0.01);
    bezel.add(m);
  }
}

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0x9cc4ff, 0x0a1030, 0.35);
scene.add(hemi);
const key = new THREE.SpotLight(0xffffff, 260, 80, Math.PI / 5, 0.6, 1.6);
key.position.set(3, 14, 16);
key.target.position.set(0, -2, -6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.bias = -0.0004;
key.shadow.camera.near = 4; key.shadow.camera.far = 60;
scene.add(key, key.target);
const backGlow = new THREE.PointLight(ELECTRIC, 30, 40, 1.4);
backGlow.position.set(0, 0, -22);
scene.add(backGlow);
const sunLight = new THREE.PointLight(GOLD, 0, 30, 1.5);
scene.add(sunLight);
const rim = new THREE.DirectionalLight(0x6aa8ff, 1.2);
rim.position.set(-8, 4, -10);
scene.add(rim);

// ---------- materials ----------
const goldFace = new THREE.MeshStandardMaterial({ color: 0xffc23a, metalness: 1, roughness: 0.22, emissive: 0x5a3000, emissiveIntensity: 0.25 });
const goldSide = new THREE.MeshStandardMaterial({ color: 0xb8640a, metalness: 1, roughness: 0.32 });
const whiteFace = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.25, emissive: 0x9fb8ff, emissiveIntensity: 0.08 });
const blueSide = new THREE.MeshStandardMaterial({ color: ROYAL, metalness: 0.6, roughness: 0.3 });
const navySide = new THREE.MeshStandardMaterial({ color: NAVY, metalness: 0.7, roughness: 0.3 });
const chromeFace = new THREE.MeshStandardMaterial({ color: 0xe8f0ff, metalness: 1, roughness: 0.12 });

// ---------- 3D Arabic text from HarfBuzz-shaped outlines ----------
const TEXT = await (await fetch(new URL('./text-paths.json', import.meta.url))).json();

function parsePath(d) {
  const sp = new THREE.ShapePath();
  const re = /([MLQCZ])([^MLQCZ]*)/g;
  let m;
  while ((m = re.exec(d))) {
    const n = m[2].split(/[ ,]+/).filter(Boolean).map(Number);
    switch (m[1]) {
      case 'M': sp.moveTo(n[0], n[1]); break;
      case 'L': sp.lineTo(n[0], n[1]); break;
      case 'Q': sp.quadraticCurveTo(n[0], n[1], n[2], n[3]); break;
      case 'C': sp.bezierCurveTo(n[0], n[1], n[2], n[3], n[4], n[5]); break;
    }
  }
  return sp;
}

// Returns a group of per-glyph meshes (so glyphs can be animated one by one), centered on x,
// with y = 0 on the baseline-ish middle and the front face at z = 0.
function makeText(key, size, depth, faceMat, sideMat, opts = {}) {
  const info = TEXT[key];
  const s = size / info.upem;
  const group = new THREE.Group();
  const glyphs = [];
  const bevel = opts.bevel ?? 0.06;
  for (const g of info.glyphs) {
    const shapes = parsePath(g.d).toShapes(false);
    if (!shapes.length) continue;
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: depth / s, curveSegments: opts.curve ?? 5,
      bevelEnabled: bevel > 0, bevelThickness: bevel / s, bevelSize: bevel * 0.6 / s, bevelSegments: 2,
    });
    geo.scale(s, s, s);
    geo.translate(0, 0, -depth);
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const cx = (bb.min.x + bb.max.x) / 2, cy = (bb.min.y + bb.max.y) / 2;
    geo.translate(-cx, -cy, 0);
    const mesh = new THREE.Mesh(geo, [faceMat, sideMat]);
    mesh.castShadow = true;
    const pivot = new THREE.Group();
    pivot.add(mesh);
    pivot.userData.home = new THREE.Vector3((g.x) * s + cx, g.y * s + cy - size * 0.32, 0);
    pivot.position.copy(pivot.userData.home);
    group.add(pivot);
    glyphs.push(pivot);
  }
  const w = info.advance * s;
  for (const p of glyphs) { p.userData.home.x -= w / 2; p.position.copy(p.userData.home); }
  group.userData.glyphs = glyphs;
  group.userData.width = w;
  return group;
}

// ---------- the logo in 3D: sun + rays + play button + three waves ----------
function waveShape(len, thick, amp, skew, phase = 0) {
  // a long tapered swoosh like the waves under the sun in the logo
  const sh = new THREE.Shape();
  const N = 48;
  const top = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = -len / 2 + u * len;
    const y = amp * Math.sin(u * Math.PI * 1.6 + phase) + skew * u;
    const th = thick * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 0.9);
    top.push([x, y + th * 0.6]);
    bot.push([x, y - th * 0.4]);
  }
  sh.moveTo(...top[0]);
  for (const p of top) sh.lineTo(...p);
  for (const p of bot.reverse()) sh.lineTo(...p);
  return sh;
}

function makeLogo() {
  const logo = new THREE.Group();
  const sun = new THREE.Group();
  logo.add(sun);
  const discMat = new THREE.MeshStandardMaterial({ color: 0xffb11a, metalness: 0.85, roughness: 0.25, emissive: 0xff8a00, emissiveIntensity: 0.3 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.55, 64), [discMat, goldFace, goldFace]);
  disc.rotation.x = Math.PI / 2;
  disc.castShadow = true;
  sun.add(disc);
  // rays
  const rays = new THREE.Group();
  const rayShape = new THREE.Shape();
  rayShape.moveTo(-0.09, 0); rayShape.lineTo(0.09, 0); rayShape.lineTo(0.15, 0.85); rayShape.lineTo(-0.15, 0.85); rayShape.lineTo(-0.09, 0);
  const rayGeo = new THREE.ExtrudeGeometry(rayShape, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
  rayGeo.translate(0, 0, -0.15);
  const rayMat = new THREE.MeshStandardMaterial({ color: 0xffb11a, metalness: 0.8, roughness: 0.3, emissive: 0xff9500, emissiveIntensity: 0.4 });
  for (let i = 0; i < 7; i++) {
    const a = THREE.MathUtils.degToRad(10 + i * 26.7);
    const pivot = new THREE.Group();
    pivot.rotation.z = a - Math.PI / 2;
    const r = new THREE.Mesh(rayGeo, rayMat);
    r.position.y = 1.85;
    r.castShadow = true;
    pivot.add(r);
    pivot.userData.ray = r;
    rays.add(pivot);
  }
  sun.add(rays);
  // play button
  const play = new THREE.Shape();
  const R = 0.75;
  play.moveTo(-R * 0.5, -R * 0.82); play.lineTo(R * 0.95, 0); play.lineTo(-R * 0.5, R * 0.82); play.lineTo(-R * 0.5, -R * 0.82);
  const playGeo = new THREE.ExtrudeGeometry(play, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 4 });
  playGeo.translate(-0.1, 0, 0);
  const playMesh = new THREE.Mesh(playGeo, [whiteFace, blueSide]);
  playMesh.castShadow = true;
  const playPivot = new THREE.Group();
  playPivot.add(playMesh);
  playPivot.position.set(0, 0.05, 0.3);
  sun.add(playPivot);
  // waves
  const waves = new THREE.Group();
  const waveBlue = new THREE.MeshBasicMaterial({ color: 0x1d56e0 });
  const waveLight = new THREE.MeshBasicMaterial({ color: 0x3a8cff });
  const wdefs = [
    [waveShape(5.6, 0.7, 0.28, -0.25, -0.4), waveBlue, -0.95, 0.75],
    [waveShape(4.9, 0.26, 0.26, -0.2, -0.2), whiteFace, -1.5, 0.9],
    [waveShape(4.3, 0.5, 0.24, -0.15, 0.0), waveLight, -1.95, 1.0],
  ];
  wdefs.forEach(([sh, mat, y, z], i) => {
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 4 });
    const m = new THREE.Mesh(geo, [mat, navySide]);
    m.castShadow = true;
    const p = new THREE.Group();
    p.add(m);
    p.position.set(0.2 - i * 0.15, y, z);
    p.userData.home = p.position.clone();
    waves.add(p);
  });
  logo.add(waves);
  logo.userData = { sun, disc, rays, playPivot, waves };
  return logo;
}

// ---------- build the cast ----------
const logo = makeLogo();
scene.add(logo);
const brand = makeText('brand', 2.5, 0.9, goldFace, goldSide, { bevel: 0.07 });
const sub = makeText('sub', 0.95, 0.35, whiteFace, blueSide, { bevel: 0.03 });
const design = makeText('design', 1.25, 0.45, whiteFace, blueSide, { bevel: 0.04 });
const illusion = makeText('illusion', 1.25, 0.45, goldFace, goldSide, { bevel: 0.04 });
const threeD = makeText('threeD', 5.2, 1.6, chromeFace, goldSide, { bevel: 0.12, curve: 8 });
const screensTxt = makeText('screens', 0.72, 0.22, whiteFace, blueSide, { bevel: 0.02 });
const wow = makeText('wow', 1.05, 0.38, whiteFace, blueSide, { bevel: 0.03 });
const endBrand = makeText('brand', 1.75, 0.55, goldFace, goldSide, { bevel: 0.05 });
const endSub = makeText('sub', 0.82, 0.25, whiteFace, blueSide, { bevel: 0.02 });
const slogan = makeText('slogan', 0.8, 0.25, goldFace, goldSide, { bevel: 0.02 });
const phones = makeText('phones', 0.5, 0.12, whiteFace, blueSide, { bevel: 0.0 });
const handle = makeText('handle', 0.5, 0.12, whiteFace, blueSide, { bevel: 0.0 });
for (const t of [brand, sub, design, illusion, threeD, screensTxt, wow, endBrand, endSub, slogan, phones, handle]) scene.add(t);
// the 3D digit "3" sits on the right in visual order; recenter the pair a bit bolder
threeD.userData.glyphs.forEach((g) => g.children[0].material = [chromeFace, goldSide]);

// ---------- water slab ----------
const WX = 64, WZ = 120;
const water = new THREE.Group();
scene.add(water);
const waterMat = new THREE.MeshPhysicalMaterial({
  color: 0x0d4fc4, roughness: 0.06, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05,
  transparent: true, opacity: 0.9, vertexColors: true, emissive: 0x041a52, emissiveIntensity: 0.35, side: THREE.DoubleSide,
  envMapIntensity: 1.4,
});
const topGeo = new THREE.PlaneGeometry(1, 1, WX, WZ);
topGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(topGeo.attributes.position.count * 3), 3));
const waterTop = new THREE.Mesh(topGeo, waterMat);
water.add(waterTop);
const frontGeo = new THREE.PlaneGeometry(1, 1, WX, 2);
frontGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(frontGeo.attributes.position.count * 3), 3));
const waterFront = new THREE.Mesh(frontGeo, waterMat);
water.add(waterFront);
const sideGeos = [-1, 1].map(() => {
  const g = new THREE.PlaneGeometry(1, 1, 24, 2);
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
  return g;
});
const waterSides = sideGeos.map((g) => { const m = new THREE.Mesh(g, waterMat); water.add(m); return m; });

function waterState(t) {
  const rise = easeInOut(seg(t, 1.9, 3.4));
  const drain = easeIn(seg(t, 6.1, 7.4));
  const level = lerp(-HY - 0.4, -0.9, rise) - drain * 4;
  const surge = seg(t, 3.9, 6.0); // crest travel
  const front = lerp(0, 4.5, easeOut(seg(t, 4.6, 5.5))) * (1 - easeIn(seg(t, 5.6, 6.4))); // slab pushes out of the screen
  return { level, surge, front, on: t > 1.85 && t < 7.5 };
}
function waterHeight(x, z, t, st) {
  let y = st.level;
  y += 0.16 * Math.sin(1.4 * x + 2.3 * t) * Math.cos(0.6 * z - 1.7 * t);
  y += 0.1 * Math.sin(0.8 * z + 3.1 * t + x * 0.3);
  y += 0.06 * Math.sin(3.2 * x - 4 * t + z);
  // big crest rolling toward the viewer
  const zc = lerp(-28, 5, easeInOut(st.surge));
  const amp = 2.6 * pulse(st.surge, 0, 1.05) ;
  const dz = z - zc;
  const w = dz > 0 ? 1.3 : 4.5; // steep front, long back
  y += amp * Math.exp(-(dz * dz) / (w * w)) * (1 + 0.12 * Math.sin(x * 1.7 + t * 5));
  return y;
}
const tmpC = new THREE.Color();
function foamColor(y, base, out, i) {
  const f = clamp01((y - base - 0.6) / 1.6);
  tmpC.setRGB(0.12, 0.38, 0.95).lerp(new THREE.Color(1, 1, 1), f);
  out.setXYZ(i, tmpC.r, tmpC.g, tmpC.b);
}
function updateWater(t) {
  const st = waterState(t);
  water.visible = st.on;
  if (!st.on) return st;
  const zBack = -RD + 0.05, zFront = st.front;
  const x0 = -HX + 0.03, x1 = HX - 0.03;
  // top surface
  const p = topGeo.attributes.position, c = topGeo.attributes.color;
  for (let j = 0; j <= WZ; j++) {
    const z = lerp(zBack, zFront, j / WZ);
    for (let i = 0; i <= WX; i++) {
      const x = lerp(x0, x1, i / WX);
      const k = j * (WX + 1) + i;
      let y = waterHeight(x, z, t, st);
      // outside the box the slab sags under gravity toward the viewer
      if (z > 0) y -= 0.25 * z * z * seg(t, 5.0, 6.0);
      y = Math.max(y, -HY - 0.6);
      p.setXYZ(k, x, y, z);
      foamColor(y, st.level, c, k);
    }
  }
  p.needsUpdate = true; c.needsUpdate = true;
  topGeo.computeVertexNormals();
  // front face from the floor line up to the surface
  const fp = frontGeo.attributes.position, fc = frontGeo.attributes.color;
  for (let r = 0; r <= 2; r++) {
    for (let i = 0; i <= WX; i++) {
      const k = r * (WX + 1) + i;
      const x = lerp(x0, x1, i / WX);
      let top = waterHeight(x, zFront, t, st);
      if (zFront > 0) top -= 0.25 * zFront * zFront * seg(t, 5.0, 6.0);
      top = Math.max(top, -HY - 0.6);
      const bottom = -HY - 0.6;
      const y = lerp(top, bottom, r / 2);
      fp.setXYZ(k, x, y, zFront + 0.001);
      const d = r / 2;
      fc.setXYZ(k, lerp(0.35, 0.03, d), lerp(0.65, 0.12, d), lerp(1, 0.45, d));
    }
  }
  fp.needsUpdate = true; fc.needsUpdate = true;
  frontGeo.computeVertexNormals();
  // side faces (only visible once the slab leaves the box)
  sideGeos.forEach((g, s) => {
    const x = s ? x1 : x0;
    const gp = g.attributes.position, gc = g.attributes.color;
    for (let r = 0; r <= 2; r++) {
      for (let i = 0; i <= 24; i++) {
        const k = r * 25 + i;
        const z = lerp(-0.2, zFront, i / 24);
        let top = waterHeight(x, z, t, st);
        if (z > 0) top -= 0.25 * z * z * seg(t, 5.0, 6.0);
        top = Math.max(top, -HY - 0.6);
        gp.setXYZ(k, x, lerp(top, -HY - 0.6, r / 2), z);
        const d = r / 2;
        gc.setXYZ(k, lerp(0.35, 0.03, d), lerp(0.65, 0.12, d), lerp(1, 0.45, d));
      }
    }
    gp.needsUpdate = true; gc.needsUpdate = true;
    g.computeVertexNormals();
  });
  waterSides.forEach((m) => (m.visible = zFront > 0.05));
  return st;
}

// ---------- particles (spray, sparks, dust) ----------
function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}
const DOT = dotTexture();
function makePoints(n, color, size, additive = true) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  const mat = new THREE.PointsMaterial({
    size, map: DOT, vertexColors: true, transparent: true, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, color, sizeAttenuation: true, toneMapped: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);
  return pts;
}

// spray: launched from the crest as it bursts out of the screen
const SPRAY_N = 2600;
const spray = makePoints(SPRAY_N, new THREE.Color(0x9fcbff), 0.16);
const sprayData = (() => {
  const r = rng(7);
  return Array.from({ length: SPRAY_N }, () => ({
    t0: 4.75 + r() * 1.0,
    x: (r() * 2 - 1) * HX,
    y: -1.2 + r() * 1.5,
    vx: (r() * 2 - 1) * 4.5,
    vy: 3 + r() * 6,
    vz: 6 + r() * 12,
    life: 1.2 + r() * 1.2,
    s: 0.4 + r(),
  }));
})();
function updateSpray(t) {
  const p = spray.geometry.attributes.position, c = spray.geometry.attributes.color;
  let any = false;
  sprayData.forEach((d, i) => {
    const a = t - d.t0;
    if (a < 0 || a > d.life) { p.setXYZ(i, 0, -999, 0); return; }
    any = true;
    p.setXYZ(i, d.x + d.vx * a, d.y + d.vy * a - 6.5 * a * a, 0.5 + d.vz * a);
    const f = 1 - a / d.life;
    c.setXYZ(i, f * 0.9, f * 0.95, f);
  });
  p.needsUpdate = true; c.needsUpdate = true;
  spray.visible = any;
}

// golden dust floating in the box all the time (+ bursts toward the viewer)
const DUST_N = 900;
const dust = makePoints(DUST_N, new THREE.Color(0xffd27a), 0.09);
const dustData = (() => {
  const r = rng(11);
  return Array.from({ length: DUST_N }, () => ({
    x: (r() * 2 - 1) * HX * 0.95, y: (r() * 2 - 1) * HY * 0.95, z: -r() * RD,
    sp: 0.4 + r() * 1.2, ph: r() * 6.28, blue: r() < 0.4,
  }));
})();
function updateDust(t, burst) {
  const p = dust.geometry.attributes.position, c = dust.geometry.attributes.color;
  const fade = seg(t, 0.8, 2.2) * (1 - seg(t, 23.2, 23.9));
  dustData.forEach((d, i) => {
    // drift slowly toward the viewer and loop within the box (period = DURATION so the loop is seamless)
    const cyc = (d.z + RD + (t / DURATION) * RD * Math.round(d.sp * 2)) % RD - RD;
    let z = cyc;
    let x = d.x + 0.3 * Math.sin(t * d.sp + d.ph);
    let y = d.y + 0.25 * Math.cos(t * d.sp * 0.8 + d.ph);
    // burst: blow the dust out past the bezel toward the viewer
    if (burst > 0) { z += burst * (12 + d.sp * 8); x *= 1 + burst * 0.8; y *= 1 + burst * 0.8; }
    p.setXYZ(i, x, y, z);
    const tw = 0.6 + 0.4 * Math.sin(t * 3 * d.sp + d.ph);
    const k = fade * tw;
    if (d.blue) c.setXYZ(i, 0.35 * k, 0.6 * k, 1.2 * k); else c.setXYZ(i, 1.2 * k, 0.8 * k, 0.3 * k);
  });
  p.needsUpdate = true; c.needsUpdate = true;
}

// ---------- flying LED panels ("our screens") ----------
function screenTexture(i) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  const hues = [[GOLD, ROYAL], [ELECTRIC, NAVY], [0xff8a00, 0x0a1f5c], [0x31d0ff, 0x1f56d6]][i % 4];
  const grd = g.createLinearGradient(0, 0, 256, 128);
  grd.addColorStop(0, '#' + hues[0].toString(16).padStart(6, '0'));
  grd.addColorStop(1, '#' + hues[1].toString(16).padStart(6, '0'));
  g.fillStyle = grd; g.fillRect(0, 0, 256, 128);
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath(); g.arc(70, 64, 26, 0, 7); g.fill();
  g.fillStyle = '#' + hues[1].toString(16).padStart(6, '0');
  g.beginPath(); g.moveTo(62, 50); g.lineTo(84, 64); g.lineTo(62, 78); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.fillRect(118, 44, 110, 12); g.fillRect(118, 66, 80, 9);
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 122);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const panels = [];
{
  const r = rng(23);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.3 });
  for (let i = 0; i < 16; i++) {
    const mat = new THREE.MeshBasicMaterial({ map: screenTexture(i), toneMapped: false });
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.12), [frameMat, frameMat, frameMat, frameMat, mat, frameMat]);
    m.castShadow = true;
    scene.add(m);
    const ang = r() * Math.PI * 2;
    panels.push({ m, t0: 14.9 + i * 0.12 + r() * 0.1, ex: Math.cos(ang) * (4 + r() * 6), ey: Math.sin(ang) * (2.5 + r() * 3.5), spin: (r() - 0.5) * 2 });
  }
}

// light beams behind the sun
const beams = new THREE.Group();
{
  const bm = new THREE.MeshBasicMaterial({ color: new THREE.Color(GOLD).multiplyScalar(0.5), transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  for (let i = 0; i < 12; i++) {
    const geo = new THREE.PlaneGeometry(0.5, 30);
    geo.translate(0, 15, 0);
    const b = new THREE.Mesh(geo, bm);
    b.rotation.z = (i / 12) * Math.PI * 2;
    beams.add(b);
  }
  beams.userData.mat = bm;
  scene.add(beams);
}

// shockwave ring that flies out of the screen at impacts
const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(GOLD).multiplyScalar(2), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const shock = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 8, 96), ringMat);
scene.add(shock);

// ---------- post ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(WIDTH, HEIGHT), 0.5, 0.4, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- timeline ----------
function hideGlyphs(group) { group.visible = false; }
function placeGlyphs(group, t, start, opts) {
  // glyph-by-glyph fly-in from deep in the box to the group's resting position
  const { from = new THREE.Vector3(0, 0, -26), stagger = 0.07, dur = 0.9, spin = 1, order = 1 } = opts;
  const gl = group.userData.glyphs;
  const n = gl.length;
  gl.forEach((g, i) => {
    const idx = order > 0 ? n - 1 - i : i; // Arabic reads right to left, so the right-most glyph lands first
    const a = seg(t, start + idx * stagger, start + idx * stagger + dur);
    const e = easeOutBack(a, 1.4);
    g.visible = a > 0;
    const h = g.userData.home;
    g.position.set(lerp(from.x + h.x * 0.1, h.x, e), lerp(from.y, h.y, e), lerp(from.z, h.z, e));
    g.rotation.set(0, (1 - e) * spin * Math.PI * 1.5, (1 - e) * spin * 0.8);
    g.scale.setScalar(Math.max(0.001, lerp(0.3, 1, easeOut(a))));
  });
}
function exitGroup(group, t, a, b, toZ = -40) {
  const x = easeIn(seg(t, a, b));
  if (x <= 0) return;
  group.position.z += lerp(0, toZ - group.position.z, x);
  group.scale.multiplyScalar(lerp(1, 0.2, x));
  if (x >= 1) group.visible = false;
}

function setNeon(t) {
  // power-on rush from the back of the box to the front, then a gentle breathing glow
  const on = (i) => seg(t, 0.2 + (RING_Z.length - 1 - i) * 0.14, 0.45 + (RING_Z.length - 1 - i) * 0.14);
  const off = 1 - seg(t, 23.2, 23.95);
  const kick = Math.max(pulse(t, 5.0, 5.8), pulse(t, 9.1, 9.7), pulse(t, 11.0, 11.6), pulse(t, 14.2, 14.8), pulse(t, 19.0, 19.6));
  neonRings.forEach((r) => {
    const flick = on(r.i) < 1 ? (Math.sin(t * 90 + r.i * 7) > 0 ? 1 : 0.25) : 1;
    const wave = 0.75 + 0.25 * Math.sin(t * 3 - r.z * 0.35);
    const k = on(r.i) * flick * off * (0.9 * wave + 1.3 * kick);
    r.mat.color.copy(r.base).multiplyScalar(k);
  });
  stripMat.color.set(ELECTRIC).multiplyScalar(seg(t, 0.9, 1.8) * off * (0.7 + 0.6 * kick));
  bezelLineMat.color.set(GOLD).multiplyScalar(seg(t, 1.6, 2.0) * off * (1.0 + 1.0 * kick));
  backGlow.intensity = 30 * seg(t, 0.6, 2) * off;
  key.intensity = 260 * seg(t, 0.4, 1.8) * off + 15;
}

function renderAt(t) {
  t = ((t % DURATION) + DURATION) % DURATION;
  setNeon(t);
  const st = updateWater(t);
  updateSpray(t);

  // ---- logo / sun (6.4 – 11.4) and end card (18.9 – 23.6)
  const L = logo.userData;
  logo.visible = t > 6.3 && t < 11.6 || t > 18.8 && t < 23.7;
  beams.visible = false;
  let dustBurst = 0;
  if (t < 12) {
    // sun rises out of the draining water at the back, then the logo flies out of the screen
    const rise = easeOut(seg(t, 6.3, 8.0));
    const fly = easeInOut(seg(t, 8.3, 9.3));
    const back = easeInOut(seg(t, 10.4, 11.5));
    logo.position.set(0, lerp(-6, 0.3, rise), lerp(-18, -6, rise));
    logo.position.z = lerp(logo.position.z, 5.2, fly);
    logo.position.y = lerp(logo.position.y, 0.6, fly);
    logo.position.z = lerp(logo.position.z, -40, easeIn(back));
    logo.rotation.set(0, Math.sin(t * 1.3) * 0.25 * (1 - fly * 0.6), 0);
    logo.scale.setScalar(lerp(1, 1.12, fly) * lerp(1, 0.1, back));
    L.rays.children.forEach((p, i) => {
      const g = easeOutBack(seg(t, 7.0 + i * 0.07, 7.6 + i * 0.07));
      p.userData.ray.scale.set(1, Math.max(0.001, g * (1 + 0.15 * Math.sin(t * 6 + i))), 1);
    });
    L.rays.rotation.z = 0;
    L.waves.children.forEach((w, i) => {
      const a = easeOutBack(seg(t, 7.6 + i * 0.15, 8.4 + i * 0.15));
      w.position.x = w.userData.home.x + (1 - a) * (i % 2 ? -9 : 9);
      w.visible = a > 0;
    });
    // the play button jumps out toward the viewer and comes back
    const jump = pulse(t, 9.2, 10.4);
    L.playPivot.position.set(0, 0.05 + jump * 0.4, 0.3 + easeOut(jump) * 3.8);
    L.playPivot.rotation.set(0, jump * Math.PI * 2 * seg(t, 9.2, 10.4), 0);
    L.playPivot.scale.setScalar(1 + jump * 0.3);
    beams.visible = t > 6.8 && t < 11.4;
    beams.position.copy(logo.position).add(new THREE.Vector3(0, 0, -0.5));
    beams.rotation.z = t * 0.25;
    beams.userData.mat.opacity = 0.07 * seg(t, 6.8, 7.8) * (1 - seg(t, 10.3, 11));
    sunLight.position.copy(logo.position).add(new THREE.Vector3(0, 0.5, 2));
    sunLight.intensity = 28 * seg(t, 6.4, 7.5) * (1 - back);
    dustBurst = pulse(t, 8.4, 10.4) * 0.6;
  } else {
    // end card: logo on the right (Arabic layout), gently floating just in front of the bezel
    const a = easeOutBack(seg(t, 18.9, 19.9), 1.2);
    logo.position.set(lerp(0, 5.0, a), lerp(-1, 0.1, a) + 0.08 * Math.sin(t * 2), lerp(-30, 1.6, a));
    logo.rotation.set(0, -0.28 + 0.12 * Math.sin(t * 1.4), 0);
    logo.scale.setScalar(Math.max(0.01, a * 0.95));
    L.rays.children.forEach((p, i) => p.userData.ray.scale.set(1, 1 + 0.18 * Math.sin(t * 5 + i), 1));
    L.waves.children.forEach((w, i) => { w.visible = true; w.position.x = w.userData.home.x + 0.12 * Math.sin(t * 2.2 + i); });
    L.playPivot.position.set(0, 0.05, 0.3); L.playPivot.rotation.set(0, 0, 0); L.playPivot.scale.setScalar(1);
    beams.visible = true;
    beams.position.copy(logo.position).add(new THREE.Vector3(0, 0, -0.6));
    beams.rotation.z = t * 0.2;
    beams.userData.mat.opacity = 0.05 * seg(t, 19.2, 20) * (1 - seg(t, 23.0, 23.6));
    sunLight.position.copy(logo.position).add(new THREE.Vector3(0, 0.5, 2));
    sunLight.intensity = 20 * a;
    exitGroup(logo, t, 23.0, 23.7);
  }

  // ---- brand name bursting out of the screen (11.0 – 14.4)
  brand.visible = t > 10.9 && t < 14.6;
  if (brand.visible) {
    brand.position.set(0, 1.55, 3.6);
    brand.scale.setScalar(1);
    brand.rotation.set(-0.05, 0.12 * Math.sin(t * 1.1), 0);
    placeGlyphs(brand, t, 11.0, { from: new THREE.Vector3(0, 0, -30), stagger: 0.09, dur: 0.85 });
    exitGroup(brand, t, 13.9, 14.6);
  }
  sub.visible = t > 11.7 && t < 14.6;
  if (sub.visible) {
    sub.position.set(0, -2.1, -1.6);
    sub.scale.setScalar(1); sub.rotation.set(0, 0, 0);
    placeGlyphs(sub, t, 11.8, { from: new THREE.Vector3(0, -2, -26), stagger: 0.05, dur: 0.7, spin: 0.4 });
    exitGroup(sub, t, 13.95, 14.6);
  }

  // ---- "3D" + message (14.2 – 18.9)
  threeD.visible = t > 14.2 && t < 17.6;
  if (threeD.visible) {
    const a = easeOutBack(seg(t, 14.2, 15.2), 1.3);
    threeD.position.set(lerp(0, 3.9, a), 0.1, lerp(-30, 3.0, a));
    threeD.scale.setScalar(Math.max(0.01, a));
    const spin = easeInOut(seg(t, 15.9, 16.9));
    threeD.rotation.set(0.08 * Math.sin(t * 1.3), (1 - a) * -2.5 + spin * Math.PI * 2 + 0.22 * Math.sin(t * 1.1), 0);
    threeD.userData.glyphs.forEach((g) => { g.visible = true; g.position.copy(g.userData.home); g.rotation.set(0, 0, 0); g.scale.setScalar(1); });
    exitGroup(threeD, t, 17.1, 17.6);
  }
  design.visible = t > 14.6 && t < 17.6;
  if (design.visible) {
    design.position.set(-4.2, 1.0, 0.2); design.scale.setScalar(1); design.rotation.set(0, 0, 0);
    placeGlyphs(design, t, 14.7, { from: new THREE.Vector3(0, 4, -26), stagger: 0.05, dur: 0.7, spin: 0.5 });
    exitGroup(design, t, 17.1, 17.6);
  }
  illusion.visible = t > 15.0 && t < 17.6;
  if (illusion.visible) {
    illusion.position.set(-4.2, -0.9, 0.2); illusion.scale.setScalar(1); illusion.rotation.set(0, 0, 0);
    placeGlyphs(illusion, t, 15.1, { from: new THREE.Vector3(0, -4, -26), stagger: 0.05, dur: 0.7, spin: 0.5 });
    exitGroup(illusion, t, 17.1, 17.6);
  }
  // panels rush from the vanishing point past the viewer
  panels.forEach((p, i) => {
    const a = seg(t, p.t0, p.t0 + 1.7);
    p.m.visible = a > 0 && a < 1;
    if (!p.m.visible) return;
    const e = easeIn(a);
    p.m.position.set(p.ex * e * 1.3, p.ey * e * 1.2, lerp(-29, 17, e));
    p.m.rotation.set(0.3 * p.spin * a, p.spin * a * 2, 0.2 * p.spin * a);
  });
  screensTxt.visible = false;

  // ---- tagline between the 3D section and the end card (17.3 – 18.9)
  wow.visible = t > 17.4 && t < 18.9;
  if (wow.visible) {
    wow.position.set(0, 0.1, 1.5); wow.scale.setScalar(1); wow.rotation.set(0, 0, 0);
    placeGlyphs(wow, t, 17.45, { from: new THREE.Vector3(0, 0, -26), stagger: 0.035, dur: 0.55, spin: 0.3 });
    exitGroup(wow, t, 18.4, 18.9);
  }
  // design text moves aside when the tagline lands

  // ---- end card text (19.2 – 23.7)
  const card = [
    [endBrand, 19.15, new THREE.Vector3(-3.0, 1.75, 0.6), 0.07],
    [endSub, 19.6, new THREE.Vector3(-3.0, 0.25, 0.2), 0.04],
    [slogan, 20.0, new THREE.Vector3(-3.0, -1.0, 0.2), 0.04],
    [phones, 20.5, new THREE.Vector3(-3.0, -2.15, -0.2), 0.03],
    [handle, 20.8, new THREE.Vector3(-3.0, -2.95, -0.2), 0.03],
  ];
  for (const [g, start, pos, stagger] of card) {
    g.visible = t > start - 0.05 && t < 23.7;
    if (!g.visible) continue;
    g.position.copy(pos); g.position.y += 0.05 * Math.sin(t * 1.8 + pos.x);
    g.scale.setScalar(1); g.rotation.set(0, 0.06 * Math.sin(t * 1.2), 0);
    placeGlyphs(g, t, start, { from: new THREE.Vector3(0, 0, -26), stagger, dur: 0.7, spin: 0.35 });
    exitGroup(g, t, 23.0, 23.7);
  }

  // ---- shockwave rings at the big pop-outs
  const shocks = [[9.25, 0.5], [11.7, 1.5], [14.9, 0.3], [19.6, 0.2]];
  ringMat.opacity = 0; shock.visible = false;
  for (const [s, y] of shocks) {
    const a = seg(t, s, s + 0.7);
    if (a > 0 && a < 1) {
      shock.visible = true;
      shock.position.set(0, y, lerp(-2, 9, easeOut(a)));
      shock.scale.setScalar(lerp(1.5, 9, easeOut(a)));
      ringMat.opacity = (1 - a) * 0.45;
    }
  }
  dustBurst = Math.max(dustBurst, pulse(t, 14.9, 16.4) * 0.7, pulse(t, 5.0, 6.3) * 0.5);
  updateDust(t, dustBurst);

  composer.render();
}

window.renderAt = renderAt;
window.DURATION = DURATION;
window.sceneReady = true;

if (PREVIEW) {
  const t0 = performance.now();
  const loop = () => { renderAt((performance.now() - t0) / 1000); requestAnimationFrame(loop); };
  loop();
} else {
  renderAt(+(params.get('t') || 0));
}
