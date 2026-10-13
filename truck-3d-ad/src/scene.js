// Bahar Al-Sharq — anamorphic ("naked-eye 3D") ad for the 4 m x 2 m LED screens on the company trucks.
// The camera never moves: the screen shows a deep, neutral white "box" behind a thin black bezel
// (black = LEDs off, so on the truck the box reads as a real cavity), and things break out of
// that box over the bezel toward people in the street. Only the logo and the trucks carry the
// brand colors, so they pop against the neutral set.
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
export const DURATION = 30;

// ---------- brand palette (used on logo + trucks only) ----------
const NAVY = 0x0b2466;
const ROYAL = 0x1d56e0;
const SKY = 0x3a8cff;

// ---------- timing helpers ----------
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
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

// ---------- fonts for the truck LED artwork ----------
const cairo = new FontFace('CairoBlack', 'url(./node_modules/@expo-google-fonts/cairo/900Black/Cairo_900Black.ttf)');
const cairoB = new FontFace('CairoBold', 'url(./node_modules/@expo-google-fonts/cairo/700Bold/Cairo_700Bold.ttf)');
await Promise.all([cairo.load(), cairoB.load()]);
document.fonts.add(cairo); document.fonts.add(cairoB);

// ---------- renderer / camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// The screen plane is z = 0 and spans SW x SH (2:1 = 4 m x 2 m); the camera is straight in front.
const SW = 20, SH = SW * HEIGHT / WIDTH;
const CZ = 18;
const camera = new THREE.PerspectiveCamera(2 * Math.atan(SH / 2 / CZ) * 180 / Math.PI, WIDTH / HEIGHT, 0.1, 200);
camera.position.set(0, 0, CZ);
camera.lookAt(0, 0, 0);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.7;

// ---------- the neutral box behind a thin bezel ----------
const OW = SW * 0.9, OH = SH * 0.86;
const HX = OW / 2, HY = OH / 2;
const RD = 32;

function concreteTexture(base, groove, seed, vertical) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  const r = rng(seed);
  for (let i = 0; i < 2600; i++) {
    const v = 120 + r() * 40;
    g.fillStyle = `rgba(${v},${v},${v + 4},${0.03 + r() * 0.04})`;
    g.fillRect(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 3);
  }
  g.strokeStyle = groove; g.lineWidth = 4;
  if (vertical) { g.beginPath(); g.moveTo(2, 0); g.lineTo(2, 512); g.stroke(); }
  else g.strokeRect(2, 2, 508, 508);
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2;
  if (vertical) { g.beginPath(); g.moveTo(6, 0); g.lineTo(6, 512); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
const room = new THREE.Group();
scene.add(room);
function wall(w, h, mat, pos, rot) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.copy(pos); mesh.rotation.set(...rot);
  mesh.receiveShadow = true;
  room.add(mesh);
  return mesh;
}
function texMat(tex, rx, ry, opts) {
  const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({ map: t, ...opts });
}
const wallTex = concreteTexture('#e9eaec', 'rgba(150,154,160,0.9)', 3, true);
const floorTex = concreteTexture('#d7d9dc', 'rgba(140,144,150,0.8)', 5, false);
const ceilTex = concreteTexture('#f1f1f2', 'rgba(170,172,176,0.8)', 9, false);
wall(RD, OH, texMat(wallTex, RD / 2.2, 1, { roughness: 0.8 }), new THREE.Vector3(-HX, 0, -RD / 2), [0, Math.PI / 2, 0]);
wall(RD, OH, texMat(wallTex, RD / 2.2, 1, { roughness: 0.8 }), new THREE.Vector3(HX, 0, -RD / 2), [0, -Math.PI / 2, 0]);
wall(OW, RD, texMat(floorTex, OW / 3, RD / 3, { roughness: 0.32, metalness: 0.15 }), new THREE.Vector3(0, -HY, -RD / 2), [-Math.PI / 2, 0, 0]);
wall(OW, RD, texMat(ceilTex, OW / 3, RD / 3, { roughness: 0.85 }), new THREE.Vector3(0, HY, -RD / 2), [Math.PI / 2, 0, 0]);
wall(OW, OH, texMat(wallTex, OW / 2.2, 1, { roughness: 0.8, color: 0xc4c7cc }), new THREE.Vector3(0, 0, -RD), [0, 0, 0]);

// white LED light bars in the ceiling (like a gallery / studio)
const lightBars = [];
for (let z = -1.6, i = 0; z > -RD + 1; z -= 3.2, i++) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  for (const x of [-OW * 0.28, 0, OW * 0.28]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(OW * 0.2, 0.05, 0.3), mat);
    m.position.set(x, HY - 0.03, z);
    room.add(m);
  }
  lightBars.push({ mat, i, z });
}

// ---------- the thin bezel ----------
{
  const outer = new THREE.Shape();
  outer.moveTo(-SW, -SH); outer.lineTo(SW, -SH); outer.lineTo(SW, SH); outer.lineTo(-SW, SH); outer.lineTo(-SW, -SH);
  const hole = new THREE.Path();
  hole.moveTo(-HX, -HY); hole.lineTo(-HX, HY); hole.lineTo(HX, HY); hole.lineTo(HX, -HY); hole.lineTo(-HX, -HY);
  outer.holes.push(hole);
  scene.add(new THREE.Mesh(new THREE.ShapeGeometry(outer), new THREE.MeshBasicMaterial({ color: 0x000000 })));
}

// ---------- lights (all neutral white) ----------
const hemi = new THREE.HemisphereLight(0xffffff, 0xb9bcc2, 1.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(5, 14, 12);
sun.target.position.set(0, -3, -8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0xffffff, 0.6);
fill.position.set(-6, 3, 14);
scene.add(fill);
const headlight = new THREE.SpotLight(0xffffff, 0, 30, 0.5, 0.6, 1.2);
scene.add(headlight, headlight.target);

// ---------- materials ----------
const navyFace = new THREE.MeshStandardMaterial({ color: NAVY, metalness: 0.35, roughness: 0.35 });
const navySide = new THREE.MeshStandardMaterial({ color: 0x07163f, metalness: 0.4, roughness: 0.4 });
const goldFace = new THREE.MeshStandardMaterial({ color: 0xffbd2e, metalness: 0.9, roughness: 0.25, emissive: 0x5a3200, emissiveIntensity: 0.25 });
const goldSide = new THREE.MeshStandardMaterial({ color: 0xc27410, metalness: 0.9, roughness: 0.32 });
const whiteFace = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.05, roughness: 0.3 });
const royalSide = new THREE.MeshStandardMaterial({ color: ROYAL, metalness: 0.3, roughness: 0.35 });
const stone = new THREE.MeshStandardMaterial({ color: 0xf3ede2, roughness: 0.75 });

// ---------- 3D Arabic text from HarfBuzz-shaped outlines ----------
const TEXT = await (await fetch(new URL('./text-paths.json', import.meta.url))).json();
function parsePath(d) {
  const sp = new THREE.ShapePath();
  const re = /([MLQCZ])([^MLQCZ]*)/g;
  let m;
  while ((m = re.exec(d))) {
    const n = m[2].split(/[ ,]+/).filter(Boolean).map(Number);
    if (m[1] === 'M') sp.moveTo(n[0], n[1]);
    else if (m[1] === 'L') sp.lineTo(n[0], n[1]);
    else if (m[1] === 'Q') sp.quadraticCurveTo(n[0], n[1], n[2], n[3]);
    else if (m[1] === 'C') sp.bezierCurveTo(n[0], n[1], n[2], n[3], n[4], n[5]);
  }
  return sp;
}
// A group of per-glyph pivots (each glyph can fly on its own), centered on x, front face at z = 0.
function makeText(key, size, depth, faceMat, sideMat, opts = {}) {
  const info = TEXT[key];
  const s = size / info.upem;
  const group = new THREE.Group();
  const glyphs = [];
  const bevel = opts.bevel ?? 0.05;
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
    pivot.userData.home = new THREE.Vector3(g.x * s + cx, g.y * s + cy - size * 0.32, 0);
    group.add(pivot);
    glyphs.push(pivot);
  }
  const w = info.advance * s;
  for (const p of glyphs) { p.userData.home.x -= w / 2; p.position.copy(p.userData.home); }
  group.userData.glyphs = glyphs;
  group.userData.width = w;
  group.visible = false;
  scene.add(group);
  return group;
}

// ---------- the logo in 3D: sun + rays + play button + three waves ----------
function waveShape(len, thick, amp, skew, phase = 0) {
  const sh = new THREE.Shape();
  const N = 48, top = [], bot = [];
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
  const discMat = new THREE.MeshStandardMaterial({ color: 0xffb11a, metalness: 0.6, roughness: 0.3, emissive: 0xff8f00, emissiveIntensity: 0.35 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.5, 64), [goldSide, discMat, discMat]);
  disc.rotation.x = Math.PI / 2;
  disc.castShadow = true;
  logo.add(disc);
  const rays = new THREE.Group();
  const rayShape = new THREE.Shape();
  rayShape.moveTo(-0.09, 0); rayShape.lineTo(0.09, 0); rayShape.lineTo(0.15, 0.85); rayShape.lineTo(-0.15, 0.85); rayShape.lineTo(-0.09, 0);
  const rayGeo = new THREE.ExtrudeGeometry(rayShape, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
  rayGeo.translate(0, 0, -0.15);
  for (let i = 0; i < 7; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.z = THREE.MathUtils.degToRad(10 + i * 26.7) - Math.PI / 2;
    const r = new THREE.Mesh(rayGeo, [discMat, goldSide]);
    r.position.y = 1.85;
    r.castShadow = true;
    pivot.add(r);
    pivot.userData.ray = r;
    rays.add(pivot);
  }
  logo.add(rays);
  const play = new THREE.Shape();
  const R = 0.75;
  play.moveTo(-R * 0.5, -R * 0.82); play.lineTo(R * 0.95, 0); play.lineTo(-R * 0.5, R * 0.82); play.lineTo(-R * 0.5, -R * 0.82);
  const playGeo = new THREE.ExtrudeGeometry(play, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 4 });
  playGeo.translate(-0.1, 0, 0);
  const playMesh = new THREE.Mesh(playGeo, [whiteFace, royalSide]);
  playMesh.castShadow = true;
  const playPivot = new THREE.Group();
  playPivot.add(playMesh);
  playPivot.position.set(0, 0.05, 0.25);
  logo.add(playPivot);
  const waves = new THREE.Group();
  const wdefs = [
    [waveShape(5.6, 0.7, 0.28, -0.25, -0.4), new THREE.MeshStandardMaterial({ color: ROYAL, roughness: 0.35, metalness: 0.2 }), -0.95, 0.75],
    [waveShape(4.9, 0.26, 0.26, -0.2, -0.2), whiteFace, -1.5, 0.9],
    [waveShape(4.3, 0.5, 0.24, -0.15, 0.0), new THREE.MeshStandardMaterial({ color: SKY, roughness: 0.35, metalness: 0.2 }), -1.95, 1.0],
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
  logo.userData = { disc, rays, playPivot, waves };
  logo.visible = false;
  scene.add(logo);
  return logo;
}

// ---------- truck LED artwork (2D canvas, brand identity) ----------
function drawLogo2D(g, cx, cy, r) {
  g.save();
  g.translate(cx, cy);
  g.fillStyle = '#ffb11a';
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + THREE.MathUtils.degToRad(10 + i * 26.7);
    g.save(); g.rotate(a + Math.PI / 2);
    g.beginPath(); g.moveTo(-r * 0.06, -r * 1.22); g.lineTo(r * 0.06, -r * 1.22); g.lineTo(r * 0.1, -r * 1.8); g.lineTo(-r * 0.1, -r * 1.8); g.fill();
    g.restore();
  }
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath(); g.moveTo(-r * 0.32, -r * 0.5); g.lineTo(r * 0.55, 0); g.lineTo(-r * 0.32, r * 0.5); g.closePath(); g.fill();
  const wave = (y, th, col, len) => {
    g.fillStyle = col; g.beginPath();
    for (let i = 0; i <= 40; i++) { const u = i / 40; const x = -len / 2 + u * len; const yy = y + r * 0.18 * Math.sin(u * Math.PI * 1.6 - 0.4) - r * 0.15 * u - th * Math.sin(Math.PI * u) * 0.6; i ? g.lineTo(x, yy) : g.moveTo(x, yy); }
    for (let i = 40; i >= 0; i--) { const u = i / 40; const x = -len / 2 + u * len; const yy = y + r * 0.18 * Math.sin(u * Math.PI * 1.6 - 0.4) - r * 0.15 * u + th * Math.sin(Math.PI * u) * 0.4; g.lineTo(x, yy); }
    g.fill();
  };
  wave(r * 0.62, r * 0.45, '#1d56e0', r * 3.6);
  wave(r * 0.98, r * 0.16, '#ffffff', r * 3.2);
  wave(r * 1.28, r * 0.32, '#3a8cff', r * 2.8);
  g.restore();
}
function ledArt(w, h, variant) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, '#071a52'); grd.addColorStop(0.55, '#0d2f8a'); grd.addColorStop(1, '#061440');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  // light streaks like the brand billboard
  for (let k = 0; k < 14; k++) {
    g.strokeStyle = k % 3 === 0 ? 'rgba(246,176,30,0.55)' : 'rgba(80,160,255,0.45)';
    g.lineWidth = 1 + (k % 4);
    g.beginPath();
    for (let i = 0; i <= 60; i++) { const u = i / 60; const x = u * w; const y = h * (0.62 + 0.012 * k) + h * 0.16 * Math.sin(u * 5 + k * 0.4) * (0.4 + u); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  g.direction = 'rtl';
  if (variant === 'side') {
    drawLogo2D(g, w * 0.8, h * 0.4, h * 0.17);
    g.textAlign = 'right';
    g.fillStyle = '#ffffff'; g.font = `${h * 0.2}px CairoBlack`; g.fillText('بحار الشرق', w * 0.6, h * 0.36);
    g.fillStyle = '#f6b01e'; g.font = `${h * 0.12}px CairoBold`; g.fillText('للتسويق والإعلان', w * 0.6, h * 0.56);
    g.fillStyle = '#ffffff'; g.font = `${h * 0.08}px CairoBold`; g.fillText('إعلانك ... يصل للجميع', w * 0.6, h * 0.74);
  } else {
    drawLogo2D(g, w * 0.5, h * 0.36, h * 0.17);
    g.textAlign = 'center';
    g.fillStyle = '#ffffff'; g.font = `${h * 0.15}px CairoBlack`; g.fillText('بحار الشرق', w * 0.5, h * 0.82);
  }
  // LED pixel grid
  g.fillStyle = 'rgba(0,0,0,0.18)';
  for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1, h);
  for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const sideArt = ledArt(1024, 560, 'side');
const rearArt = ledArt(512, 540, 'rear');

// ---------- company truck (white cab, LED box with the Bahar Al-Sharq artwork) ----------
function makeTruck() {
  const truck = new THREE.Group(); // forward = +z, ground at y = 0
  const body = new THREE.Group();
  truck.add(body);
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f5f7, metalness: 0.3, roughness: 0.28 });
  const black = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.6, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0c1220, metalness: 0.9, roughness: 0.06 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xdfe3ea, metalness: 1, roughness: 0.15 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf2b705, roughness: 0.45 });
  const box = (w, h, d, mat, x, y, z, parent = body) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  // chassis + bumper rail
  box(1.7, 0.28, 6.4, black, 0, 0.72, -0.4);
  box(2.24, 0.16, 4.3, yellow, 0, 0.92, -0.95);
  // cab
  const cab = new THREE.Group(); body.add(cab);
  box(2.05, 1.25, 1.55, white, 0, 1.55, 2.05, cab);
  box(2.0, 0.95, 1.35, white, 0, 2.62, 1.95, cab);
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.84, 0.86), glass);
  ws.position.set(0, 2.62, 2.635); ws.rotation.x = -0.12; cab.add(ws);
  for (const s of [-1, 1]) {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.72), glass);
    sw.position.set(s * 1.005, 2.62, 2.0); sw.rotation.y = s * Math.PI / 2; cab.add(sw);
    box(0.06, 0.5, 0.08, black, s * 1.2, 2.45, 2.55, cab); // mirrors
    box(0.05, 0.05, 0.3, black, s * 1.1, 2.75, 2.5, cab);
  }
  box(1.6, 0.42, 0.06, black, 0, 1.35, 2.84, cab); // grille
  for (let i = 0; i < 4; i++) box(1.5, 0.03, 0.02, chrome, 0, 1.2 + i * 0.1, 2.875, cab);
  box(2.15, 0.28, 0.22, new THREE.MeshStandardMaterial({ color: 0x9aa1ab, metalness: 0.6, roughness: 0.35 }), 0, 0.95, 2.86, cab);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  for (const s of [-1, 1]) box(0.38, 0.2, 0.05, lampMat, s * 0.78, 1.42, 2.86, cab);
  const plateCanvas = document.createElement('canvas');
  plateCanvas.width = 512; plateCanvas.height = 88;
  {
    const g = plateCanvas.getContext('2d');
    g.fillStyle = '#0b2466'; g.fillRect(0, 0, 512, 88);
    g.fillStyle = '#fff'; g.font = '56px CairoBlack'; g.textAlign = 'center'; g.direction = 'rtl'; g.fillText('بحار الشرق', 256, 64);
  }
  const plateTex = new THREE.CanvasTexture(plateCanvas); plateTex.colorSpace = THREE.SRGBColorSpace;
  const brandPlate = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.22), new THREE.MeshBasicMaterial({ map: plateTex }));
  brandPlate.position.set(0, 3.0, 2.63); cab.add(brandPlate);
  // LED box
  const BOXW = 2.3, BOXH = 2.45, BOXL = 4.4, BOXY = 1.0 + BOXH / 2, BOXZ = -0.95;
  box(BOXW + 0.08, BOXH + 0.08, BOXL + 0.08, black, 0, BOXY, BOXZ);
  const led = (tex, w, h) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: 0xbfbfbf }));
  // the side art is drawn for the left side seen from outside; the right side mirrors the plane
  const left = led(sideArt, BOXL - 0.1, BOXH - 0.1); left.position.set(-BOXW / 2 - 0.045, BOXY, BOXZ); left.rotation.y = -Math.PI / 2; body.add(left);
  const right = led(sideArt, BOXL - 0.1, BOXH - 0.1); right.position.set(BOXW / 2 + 0.045, BOXY, BOXZ); right.rotation.y = Math.PI / 2; body.add(right);
  const rear = led(rearArt, BOXW - 0.1, BOXH - 0.1); rear.position.set(0, BOXY, BOXZ - BOXL / 2 - 0.045); rear.rotation.y = Math.PI; body.add(rear);
  const front = led(rearArt, BOXW - 0.1, BOXH - 0.1); front.position.set(0, BOXY, BOXZ + BOXL / 2 + 0.045); body.add(front);
  // wheels
  const wheels = [];
  const tire = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85 });
  const hub = new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.9, roughness: 0.3 });
  for (const [z, dual] of [[2.0, false], [-1.75, true]]) {
    for (const s of [-1, 1]) {
      const w = new THREE.Group();
      const width = dual ? 0.55 : 0.32;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, width, 28), tire); t.rotation.z = Math.PI / 2; w.add(t);
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, width + 0.02, 10), hub); h.rotation.z = Math.PI / 2; w.add(h);
      w.position.set(s * (dual ? 0.86 : 0.93), 0.47, z);
      truck.add(w); wheels.push(w);
    }
  }
  truck.userData = { wheels, body, lampMat, sideLocal: new THREE.Vector3(-BOXW / 2 - 0.2, BOXY, BOXZ) };
  truck.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  truck.visible = false;
  scene.add(truck);
  return truck;
}

// ---------- Aden minaret (منارة عدن): white octagonal tiers, balconies, domed kiosk ----------
function nicheTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#f3ede2'; g.fillRect(0, 0, 128, 512);
  g.fillStyle = 'rgba(120,105,85,0.08)';
  for (let y = 0; y < 512; y += 32) g.fillRect(0, y, 128, 2);
  const niche = (y, h) => {
    g.fillStyle = '#8f8576';
    g.beginPath(); g.moveTo(44, y + h); g.lineTo(44, y + 18); g.quadraticCurveTo(64, y - 8, 84, y + 18); g.lineTo(84, y + h); g.fill();
    g.fillStyle = '#3e3a35';
    g.beginPath(); g.moveTo(52, y + h - 6); g.lineTo(52, y + 22); g.quadraticCurveTo(64, y + 6, 76, y + 22); g.lineTo(76, y + h - 6); g.fill();
  };
  niche(80, 120); niche(310, 120);
  g.strokeStyle = 'rgba(160,145,125,0.6)'; g.lineWidth = 3; g.strokeRect(1, -2, 126, 516);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
function makeMinaret() {
  const m = new THREE.Group();
  const nt = nicheTexture();
  const tierMat = (ry) => { const t = nt.clone(); t.needsUpdate = true; t.repeat.set(8, ry); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.78 }); };
  const add = (geo, mat, y) => { const o = new THREE.Mesh(geo, mat); o.position.y = y; o.castShadow = true; o.receiveShadow = true; m.add(o); return o; };
  const parMat = new THREE.MeshStandardMaterial({ color: 0xe9e1d3, roughness: 0.8, side: THREE.DoubleSide });
  let y = 0;
  add(new THREE.BoxGeometry(2.6, 0.9, 2.6), stone, y + 0.45); y += 0.9;
  add(new THREE.BoxGeometry(2.8, 0.14, 2.8), stone, y); y += 0.07;
  const tiers = [[1.0, 0.9, 3.0, 2], [0.78, 0.7, 1.9, 1], [0.6, 0.55, 1.15, 1]];
  for (const [r0, r1, h, ry] of tiers) {
    add(new THREE.CylinderGeometry(r1, r0, h, 8, 1), [tierMat(ry), stone, stone], y + h / 2).rotation.y = Math.PI / 8;
    y += h;
    // balcony: corbel + slab + low parapet
    add(new THREE.CylinderGeometry(r1 + 0.3, r1, 0.22, 8), stone, y + 0.11).rotation.y = Math.PI / 8; y += 0.22;
    add(new THREE.CylinderGeometry(r1 + 0.32, r1 + 0.32, 0.08, 8), stone, y + 0.04).rotation.y = Math.PI / 8; y += 0.08;
    add(new THREE.CylinderGeometry(r1 + 0.3, r1 + 0.3, 0.26, 8, 1, true), parMat, y + 0.13).rotation.y = Math.PI / 8;
  }
  // kiosk with 8 slender columns and a dome
  const kR = 0.48, kH = 0.75;
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    add(new THREE.CylinderGeometry(0.05, 0.05, kH, 6), stone, 0).position.set(Math.cos(a) * kR, y + kH / 2, Math.sin(a) * kR);
  }
  add(new THREE.CylinderGeometry(0.32, 0.32, kH, 8), new THREE.MeshStandardMaterial({ color: 0x5b544b, roughness: 0.9 }), y + kH / 2);
  y += kH;
  add(new THREE.CylinderGeometry(kR + 0.12, kR + 0.12, 0.1, 8), stone, y + 0.05); y += 0.1;
  const dome = add(new THREE.SphereGeometry(kR + 0.02, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), stone, y);
  dome.scale.y = 1.25;
  y += (kR + 0.02) * 1.25;
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.8, roughness: 0.3 });
  add(new THREE.CylinderGeometry(0.025, 0.04, 0.35, 6), brass, y + 0.17);
  add(new THREE.SphereGeometry(0.06, 10, 8), brass, y + 0.37);
  m.userData.height = y + 0.43;
  m.visible = false;
  scene.add(m);
  return m;
}

// ---------- seagulls ----------
function makeGull() {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const grey = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.6, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), white);
  body.scale.set(0.8, 0.75, 2.0); body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), white);
  head.position.set(0, 0.08, 0.42); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 6), new THREE.MeshStandardMaterial({ color: 0xf2a516 }));
  beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.06, 0.58); g.add(beak);
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.15); wingShape.lineTo(0.55, 0.12); wingShape.lineTo(1.1, -0.05); wingShape.lineTo(0.6, -0.2); wingShape.lineTo(0, -0.18);
  const wingGeo = new THREE.ShapeGeometry(wingShape);
  wingGeo.rotateX(-Math.PI / 2);
  const wings = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    const w = new THREE.Mesh(wingGeo, grey);
    w.castShadow = true;
    w.scale.x = s;
    pivot.add(w);
    pivot.position.set(s * 0.1, 0.05, 0);
    g.add(pivot);
    wings.push({ pivot, s });
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 4), white);
  tail.rotation.x = -Math.PI / 2; tail.position.z = -0.45; tail.scale.y = 0.3; g.add(tail);
  g.userData.wings = wings;
  g.visible = false;
  scene.add(g);
  return g;
}

// ---------- water ----------
const WX = 64, WZ = 110;
const water = new THREE.Group();
scene.add(water);
const waterMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff, roughness: 0.05, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.04,
  transparent: true, opacity: 0.92, vertexColors: true, side: THREE.DoubleSide, envMapIntensity: 1.0,
});
function colorGeo(g) { g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3)); return g; }
const topGeo = colorGeo(new THREE.PlaneGeometry(1, 1, WX, WZ));
const frontGeo = colorGeo(new THREE.PlaneGeometry(1, 1, WX, 2));
const sideGeos = [0, 1].map(() => colorGeo(new THREE.PlaneGeometry(1, 1, 24, 2)));
water.add(new THREE.Mesh(topGeo, waterMat), new THREE.Mesh(frontGeo, waterMat));
const waterSides = sideGeos.map((g) => { const m = new THREE.Mesh(g, waterMat); water.add(m); return m; });

function waterState(t) {
  const rise = easeInOut(seg(t, 1.6, 3.2));
  const drain = easeIn(seg(t, 6.0, 7.6));
  const level = lerp(-HY - 0.4, -0.6, rise) - drain * 4.5;
  const surge = seg(t, 3.5, 5.8);
  const front = lerp(0, 4.6, easeOut(seg(t, 4.3, 5.2))) * (1 - easeIn(seg(t, 5.4, 6.3)));
  return { level, surge, front, on: t > 1.55 && t < 7.7 };
}
function waterHeight(x, z, t, st) {
  let y = st.level;
  y += 0.16 * Math.sin(1.4 * x + 2.3 * t) * Math.cos(0.6 * z - 1.7 * t);
  y += 0.1 * Math.sin(0.8 * z + 3.1 * t + x * 0.3);
  y += 0.05 * Math.sin(3.2 * x - 4 * t + z);
  const zc = lerp(-30, 5, easeInOut(st.surge));
  const amp = 2.8 * pulse(st.surge, 0, 1.05);
  const dz = z - zc;
  const w = dz > 0 ? 1.3 : 4.5;
  y += amp * Math.exp(-(dz * dz) / (w * w)) * (1 + 0.12 * Math.sin(x * 1.7 + t * 5));
  if (z > 0) y -= 0.25 * z * z * seg(t, 4.7, 5.7);
  return Math.max(y, -HY - 0.6);
}
const tmpC = new THREE.Color(), foamC = new THREE.Color(1, 1, 1), deepC = new THREE.Color(0.0, 0.22, 0.4);
function updateWater(t) {
  const st = waterState(t);
  water.visible = st.on;
  if (!st.on) return;
  const zBack = -RD + 0.05, zFront = st.front;
  const x0 = -HX + 0.03, x1 = HX - 0.03;
  const p = topGeo.attributes.position, c = topGeo.attributes.color;
  for (let j = 0; j <= WZ; j++) {
    const z = lerp(zBack, zFront, j / WZ);
    for (let i = 0; i <= WX; i++) {
      const x = lerp(x0, x1, i / WX);
      const k = j * (WX + 1) + i;
      const y = waterHeight(x, z, t, st);
      p.setXYZ(k, x, y, z);
      tmpC.copy(deepC).lerp(foamC, clamp01((y - st.level - 0.5) / 1.5));
      c.setXYZ(k, tmpC.r, tmpC.g, tmpC.b);
    }
  }
  p.needsUpdate = true; c.needsUpdate = true;
  topGeo.computeVertexNormals();
  const curtain = (g, n, xz) => {
    const gp = g.attributes.position, gc = g.attributes.color;
    for (let r = 0; r <= 2; r++) {
      for (let i = 0; i <= n; i++) {
        const k = r * (n + 1) + i;
        const [x, z] = xz(i / n);
        const top = waterHeight(x, z, t, st);
        gp.setXYZ(k, x, lerp(top, -HY - 0.6, r / 2), z);
        const d = r / 2;
        gc.setXYZ(k, lerp(0.1, 0.0, d), lerp(0.45, 0.12, d), lerp(0.62, 0.25, d));
      }
    }
    gp.needsUpdate = true; gc.needsUpdate = true;
    g.computeVertexNormals();
  };
  curtain(frontGeo, WX, (u) => [lerp(x0, x1, u), zFront + 0.001]);
  curtain(sideGeos[0], 24, (u) => [x0, lerp(-0.2, zFront, u)]);
  curtain(sideGeos[1], 24, (u) => [x1, lerp(-0.2, zFront, u)]);
  waterSides.forEach((m) => (m.visible = zFront > 0.05));
}

// ---------- particles ----------
function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(255,255,255,0.7)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const DOT = dotTexture();
function makePoints(n, size, opacity) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  const mat = new THREE.PointsMaterial({ size, map: DOT, vertexColors: true, transparent: true, opacity, depthWrite: false, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);
  return pts;
}
// spray when the sea bursts out of the screen
const SPRAY_N = 2400;
const spray = makePoints(SPRAY_N, 0.2, 0.9);
const sprayData = (() => {
  const r = rng(7);
  return Array.from({ length: SPRAY_N }, () => ({
    t0: 4.4 + r() * 1.0, x: (r() * 2 - 1) * HX, y: -1 + r() * 1.5,
    vx: (r() * 2 - 1) * 4.5, vy: 3 + r() * 6, vz: 6 + r() * 12, life: 1.2 + r() * 1.2,
  }));
})();
// dust kicked up by the minaret and by the braking truck
const DUST_N = 1200;
const dust = makePoints(DUST_N, 0.55, 0.45);
const dustData = (() => {
  const r = rng(13);
  return Array.from({ length: DUST_N }, (_, i) => ({
    ev: i < 600 ? 0 : 1, a: r() * Math.PI * 2, v: 1 + r() * 3, up: 0.5 + r() * 2, life: 1.2 + r() * 1.5, s: r(),
  }));
})();
function updateParticles(t, minaretPos, truckDust) {
  const p = spray.geometry.attributes.position, c = spray.geometry.attributes.color;
  sprayData.forEach((d, i) => {
    const a = t - d.t0;
    if (a < 0 || a > d.life) { p.setXYZ(i, 0, -999, 0); return; }
    p.setXYZ(i, d.x + d.vx * a, d.y + d.vy * a - 6.5 * a * a, 0.5 + d.vz * a);
    const f = 1 - a / d.life;
    c.setXYZ(i, lerp(0.7, 1, f), lerp(0.85, 1, f), 1);
  });
  p.needsUpdate = true; c.needsUpdate = true;
  const dp = dust.geometry.attributes.position, dc = dust.geometry.attributes.color;
  dustData.forEach((d, i) => {
    const src = d.ev === 0 ? { t0: 7.0 + d.s * 1.4, x: minaretPos.x, z: minaretPos.z, r: 1.4 } : { ...truckDust, t0: truckDust.t0 + d.s * 0.4 };
    const a = t - src.t0;
    if (a < 0 || a > d.life) { dp.setXYZ(i, 0, -999, 0); return; }
    const rad = src.r + d.v * a;
    dp.setXYZ(i, src.x + Math.cos(d.a) * rad, -HY + 0.1 + d.up * a * (1 - a / (2 * d.life)), src.z + Math.sin(d.a) * rad * 0.7);
    const f = 0.85 - 0.3 * (a / d.life);
    dc.setXYZ(i, f, f * 0.97, f * 0.93);
  });
  dp.needsUpdate = true; dc.needsUpdate = true;
}

// ---------- cast ----------
const logo = makeLogo();
const minaret = makeMinaret();
const gulls = Array.from({ length: 9 }, makeGull);
const gullData = (() => {
  const r = rng(31);
  return gulls.map((g, i) => {
    const side = i % 2 ? 1 : -1;
    return {
      t0: 8.4 + i * 0.32 + r() * 0.2, dur: 2.6 + r() * 0.8, ph: r() * 6,
      p0: new THREE.Vector3(-4.2 + (r() - 0.5) * 2, 0.5 + r() * 2.5, -9 + r() * 2),
      p1: new THREE.Vector3(side * (3 + r() * 4), 2 + r() * 2, -3 + r() * 3),
      p2: new THREE.Vector3(side * (4 + r() * 7), (r() - 0.3) * 6, 15 + r() * 3),
    };
  });
})();
const truck = makeTruck();
const truck2 = makeTruck();
truck.scale.setScalar(1.2);
truck2.scale.setScalar(1.1);
const brand = makeText('brand', 2.5, 0.9, navyFace, navySide, { bevel: 0.07 });
const sub = makeText('sub', 1.0, 0.35, goldFace, goldSide, { bevel: 0.03 });
const aden = makeText('aden', 1.3, 0.45, navyFace, navySide, { bevel: 0.04 });
const adenSub = makeText('adenSub', 0.8, 0.25, goldFace, goldSide, { bevel: 0.03 });
const design = makeText('design', 1.3, 0.45, navyFace, navySide, { bevel: 0.04 });
const illusion = makeText('illusion', 0.95, 0.35, goldFace, goldSide, { bevel: 0.03 });
const threeD = makeText('threeD', 5.4, 1.7, navyFace, goldSide, { bevel: 0.12, curve: 8 });
const screens = makeText('screens', 0.72, 0.22, navyFace, navySide, { bevel: 0.02 });
const endBrand = makeText('brand', 1.9, 0.6, navyFace, navySide, { bevel: 0.05 });
const endSub = makeText('sub', 0.9, 0.28, goldFace, goldSide, { bevel: 0.025 });
const slogan = makeText('slogan', 0.78, 0.25, navyFace, navySide, { bevel: 0.02 });
const phones = makeText('phones', 0.52, 0.14, navyFace, navySide, { bevel: 0.0 });
const handle = makeText('handle', 0.5, 0.14, navyFace, navySide, { bevel: 0.0 });

// ---------- post ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(WIDTH, HEIGHT), 0.25, 0.2, 2.2));
composer.addPass(new OutputPass());

// ---------- animation helpers ----------
function placeGlyphs(group, t, start, opts = {}) {
  const { from = new THREE.Vector3(0, 0, -28), stagger = 0.06, dur = 0.8, spin = 1 } = opts;
  const gl = group.userData.glyphs;
  const n = gl.length;
  gl.forEach((g, i) => {
    const idx = n - 1 - i; // Arabic reads right to left: the right-most glyph lands first
    const a = seg(t, start + idx * stagger, start + idx * stagger + dur);
    const e = easeOutBack(a, 1.4);
    g.visible = a > 0;
    const h = g.userData.home;
    g.position.set(lerp(from.x + h.x * 0.1, h.x, e), lerp(from.y, h.y, e), lerp(from.z, h.z, e));
    g.rotation.set(0, (1 - e) * spin * Math.PI * 1.5, (1 - e) * spin * 0.6);
    g.scale.setScalar(Math.max(0.001, lerp(0.3, 1, easeOut(a))));
  });
}
function showText(group, t, start, end, pos, opts = {}) {
  group.visible = t > start - 0.02 && t < end;
  if (!group.visible) return;
  group.position.copy(pos);
  group.position.y += 0.05 * Math.sin(t * 1.7 + pos.x);
  group.rotation.set(opts.rx ?? 0, (opts.ry ?? 0) + 0.05 * Math.sin(t * 1.1 + pos.y), 0);
  group.scale.setScalar(1);
  placeGlyphs(group, t, start, opts);
  // leave by flying back into the depth of the box
  const x = easeIn(seg(t, end - 0.55, end));
  if (x > 0) {
    group.position.z = lerp(group.position.z, -34, x);
    group.scale.setScalar(lerp(1, 0.3, x));
  }
}
function placeTruck(tr, t, pathFn) {
  const s = pathFn(t);
  tr.visible = s.on;
  if (!s.on) return s;
  tr.position.set(s.x, -HY, s.z);
  tr.rotation.y = s.yaw;
  tr.userData.wheels.forEach((w) => (w.rotation.x = s.roll / 0.47));
  tr.userData.body.rotation.x = s.pitch || 0;
  tr.userData.body.position.y = s.bounce || 0;
  return s;
}

// truck 1: drives out of the depth, its nose breaks out over the bezel, brakes, then reverses away
function truck1Path(t) {
  const on = t > 11.6 && t < 18.6;
  const a = easeOut(seg(t, 11.7, 14.2));
  const back = easeIn(seg(t, 16.9, 18.6));
  const zIn = lerp(-40, 3.0, a), xIn = lerp(-2.5, -1.5, a);
  const z = lerp(zIn, -40, back), x = lerp(xIn, 2.5, back);
  const brake = pulse(t, 13.9, 14.7);
  return { on, x, z, roll: z, yaw: lerp(0.32, 0.38, a) - back * 0.3, pitch: brake * 0.04 - pulse(t, 16.9, 17.5) * 0.03, bounce: brake * -0.03 };
}
// truck 2: crosses the box behind the hero truck to show the fleet
function truck2Path(t) {
  const on = t > 12.4 && t < 16.4;
  const x = lerp(14, -14, seg(t, 12.5, 16.3));
  return { on, x, z: -17, roll: -x, yaw: -Math.PI / 2 };
}

function setLights(t) {
  const on = (i) => seg(t, 0.15 + i * 0.09, 0.3 + i * 0.09);
  const off = 1 - seg(t, 29.3, 29.95);
  lightBars.forEach((b) => {
    const flick = on(b.i) < 1 ? (Math.sin(t * 80 + b.i * 9) > 0 ? 1 : 0.2) : 1;
    b.mat.color.setScalar(on(b.i) * flick * off * 4);
  });
  const lit = seg(t, 0.2, 1.6) * off;
  hemi.intensity = 0.05 + 0.55 * lit;
  sun.intensity = 0.1 + 1.9 * lit;
  fill.intensity = 0.35 * lit;
  scene.environmentIntensity = 0.03 + 0.35 * lit;
}

// ---------- timeline ----------
const minPos = new THREE.Vector3(-3.8, 0, -7.5);
function renderAt(t) {
  t = ((t % DURATION) + DURATION) % DURATION;
  setLights(t);
  updateWater(t);

  // --- Aden minaret rises out of the draining sea, gulls fly out of the screen (6.8 – 12.4)
  const mRise = easeOut(seg(t, 6.8, 8.8));
  const mSink = easeIn(seg(t, 11.4, 12.4));
  minaret.visible = t > 6.8 && t < 12.4;
  if (minaret.visible) {
    minaret.scale.setScalar(1.0);
    minaret.position.set(minPos.x, -HY - minaret.userData.height * 1.0 * (1 - mRise + mSink), minPos.z);
    minaret.rotation.y = 0.3 + 0.25 * (1 - mRise);
  }
  gulls.forEach((g, i) => {
    const d = gullData[i];
    const a = seg(t, d.t0, d.t0 + d.dur);
    g.visible = a > 0 && a < 1;
    if (!g.visible) return;
    const e = easeIn(a) * 0.6 + a * 0.4;
    const pt = (u) => new THREE.Vector3().copy(d.p0).multiplyScalar((1 - u) * (1 - u)).addScaledVector(d.p1, 2 * u * (1 - u)).addScaledVector(d.p2, u * u);
    g.position.copy(pt(e));
    g.lookAt(pt(Math.min(1, e + 0.02)));
    g.scale.setScalar(1.3);
    const flap = Math.sin(t * 13 + d.ph);
    g.userData.wings.forEach(({ pivot, s }) => (pivot.rotation.z = s * flap * 0.7));
  });
  showText(aden, t, 8.9, 11.6, new THREE.Vector3(3.4, 1.0, -2.5), { from: new THREE.Vector3(3, 0, -28), stagger: 0.07 });
  showText(adenSub, t, 9.5, 11.6, new THREE.Vector3(3.4, -0.6, -2.5), { from: new THREE.Vector3(3, -1, -28), stagger: 0.05, spin: 0.5 });

  // --- the trucks (11.6 – 18.6)
  const s1 = placeTruck(truck, t, truck1Path);
  placeTruck(truck2, t, truck2Path);
  const flash = pulse(t, 14.2, 14.45) + pulse(t, 14.6, 14.85);
  truck.userData.lampMat.color.setScalar(1 + 2.5 * flash);
  headlight.intensity = truck.visible ? 60 * (1 + 2 * flash) : 0;
  if (truck.visible) {
    truck.updateMatrixWorld();
    headlight.position.copy(truck.localToWorld(new THREE.Vector3(0, 1.4, 3.0)));
    headlight.target.position.copy(truck.localToWorld(new THREE.Vector3(0, 0.4, 12)));
  }
  const truckDust = { t0: 13.9, x: s1.x || 0, z: (s1.z || 0) + 1.5, r: 1.2 };

  // --- the logo bursts out of the truck's LED screen and flies at the viewer (15.0 – 21.0),
  //     then returns for the end card (24.6 – 29.9)
  const L = logo.userData;
  logo.visible = (t > 15.0 && t < 21.0) || (t > 24.6 && t < 29.9);
  if (t < 22) {
    const out = easeOutBack(seg(t, 15.0, 16.2), 1.2);
    const toSide = easeInOut(seg(t, 17.6, 18.4));
    if (truck.visible) truck.updateMatrixWorld();
    const start = truck.localToWorld(truck.userData.sideLocal.clone());
    logo.position.set(lerp(start.x, 0, out), lerp(start.y, 0.6, out), lerp(start.z, 4.6, out));
    logo.position.x = lerp(logo.position.x, 5.6, toSide);
    logo.position.z = lerp(logo.position.z, 1.4, toSide);
    logo.position.y += 0.08 * Math.sin(t * 2);
    logo.rotation.set(0, lerp(-Math.PI / 2 + 0.35, 0, out) + 0.15 * Math.sin(t * 1.3) - 0.25 * toSide, 0);
    logo.scale.setScalar(Math.max(0.05, lerp(0.35, 1.05, out) * lerp(1, 0.8, toSide)));
    const leave = easeIn(seg(t, 20.4, 21.0));
    logo.position.z = lerp(logo.position.z, -34, leave);
    L.rays.children.forEach((p, i) => p.userData.ray.scale.set(1, Math.max(0.01, easeOutBack(seg(t, 15.5 + i * 0.05, 16.1 + i * 0.05)) * (1 + 0.12 * Math.sin(t * 5 + i))), 1));
    const jump = pulse(t, 16.2, 17.3);
    L.playPivot.position.set(0, 0.05 + jump * 0.3, 0.25 + easeOut(jump) * 3.4);
    L.playPivot.rotation.set(0, Math.PI * 2 * seg(t, 16.2, 17.3), 0);
  } else {
    const a = easeOutBack(seg(t, 24.6, 25.6), 1.2);
    logo.position.set(lerp(0, 5.0, a), 0.15 + 0.08 * Math.sin(t * 2), lerp(-30, 1.8, a));
    logo.rotation.set(0, -0.3 + 0.12 * Math.sin(t * 1.4), 0);
    logo.scale.setScalar(Math.max(0.02, a));
    logo.position.z = lerp(logo.position.z, -34, easeIn(seg(t, 29.2, 29.9)));
    L.rays.children.forEach((p, i) => p.userData.ray.scale.set(1, 1 + 0.15 * Math.sin(t * 5 + i), 1));
    L.playPivot.position.set(0, 0.05, 0.25); L.playPivot.rotation.set(0, 0, 0);
  }
  L.waves.children.forEach((w, i) => (w.position.x = w.userData.home.x + 0.12 * Math.sin(t * 2.2 + i)));
  showText(brand, t, 18.1, 21.0, new THREE.Vector3(-2.6, 1.6, 3.4), { from: new THREE.Vector3(0, 0, -30), stagger: 0.08, dur: 0.85, rx: -0.04 });
  showText(sub, t, 18.7, 21.0, new THREE.Vector3(-2.6, -1.0, 1.0), { from: new THREE.Vector3(0, -2, -28), stagger: 0.045, dur: 0.7, spin: 0.4 });

  // --- 3D message (20.8 – 24.7)
  threeD.visible = t > 20.8 && t < 24.7;
  if (threeD.visible) {
    const a = easeOutBack(seg(t, 20.8, 21.8), 1.3);
    const spin = easeInOut(seg(t, 22.4, 23.4));
    threeD.position.set(lerp(0, 4.3, a), 0.2, lerp(-32, 3.4, a));
    threeD.scale.setScalar(Math.max(0.01, a));
    threeD.rotation.set(0.06 * Math.sin(t * 1.3), (1 - a) * -2.5 + spin * Math.PI * 2 - 0.2 + 0.12 * Math.sin(t * 1.1), 0);
    threeD.userData.glyphs.forEach((g) => { g.visible = true; g.position.copy(g.userData.home); g.rotation.set(0, 0, 0); g.scale.setScalar(1); });
    threeD.position.z = lerp(threeD.position.z, -34, easeIn(seg(t, 24.15, 24.7)));
  }
  showText(design, t, 21.2, 24.7, new THREE.Vector3(-3.6, 1.7, 0.4), { from: new THREE.Vector3(-3, 2, -28), stagger: 0.05, dur: 0.7, spin: 0.5 });
  showText(illusion, t, 21.6, 24.7, new THREE.Vector3(-3.6, 0.2, 0.4), { from: new THREE.Vector3(-3, 0, -28), stagger: 0.04, dur: 0.7, spin: 0.5 });
  showText(screens, t, 22.4, 24.7, new THREE.Vector3(-3.4, -1.3, 0.2), { from: new THREE.Vector3(-3, -2, -28), stagger: 0.03, dur: 0.6, spin: 0.3 });

  // --- end card (24.8 – 29.9)
  showText(endBrand, t, 24.9, 29.9, new THREE.Vector3(-3.1, 1.85, 0.8), { stagger: 0.07, dur: 0.75 });
  showText(endSub, t, 25.35, 29.9, new THREE.Vector3(-3.1, 0.3, 0.3), { stagger: 0.04, dur: 0.7, spin: 0.4 });
  showText(slogan, t, 25.8, 29.9, new THREE.Vector3(-3.1, -1.0, 0.3), { stagger: 0.04, dur: 0.7, spin: 0.4 });
  showText(phones, t, 26.3, 29.9, new THREE.Vector3(-3.1, -2.2, 0.0), { stagger: 0.03, dur: 0.6, spin: 0.3 });
  showText(handle, t, 26.6, 29.9, new THREE.Vector3(-3.1, -3.0, 0.0), { stagger: 0.03, dur: 0.6, spin: 0.3 });

  updateParticles(t, minPos, truckDust);
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
