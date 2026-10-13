// Bahar Al-Sharq — anamorphic ("naked-eye 3D") ad for the 4 m x 2 m LED screens on the company trucks.
//
// The camera never moves. The screen shows a deep box set into a thin black bezel (black = LEDs
// off, so on the truck the box reads as a real cavity in the vehicle) and things break out of the
// box over the bezel toward people in the street. The set is a dark navy-graphite studio so the
// brand colors — gold sun, royal-blue waves, blue company trucks — glow against it.
//
// Story ("sunrise over the eastern seas"): a gold line draws the box -> the sea fills it and a wave
// crashes out of the screen -> the gold sun rises from the sea and flies out as the logo -> Aden
// pops up at golden hour, gulls fly out -> a road unrolls, one company truck drives out of the
// screen at the viewer, a second stops and products burst out of its LED screen -> "3D" message
// -> end card. Every frame is a pure function of time so the offline renderer can step it.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GOLD, clamp01, seg, easeInOut, easeOut, easeIn, easeOutBack, lerp, pulse, rng, canvas } from './common.js';
import { mats, loadText, makeText, placeGlyphs, makeLogo, LedScreen } from './brand.js';
import { makeTruck } from './truck.js';
import { makeAden, makeGull } from './aden.js';
import { makeCan, makeCarton, makePhone } from './products.js';

const params = new URLSearchParams(location.search);
const WIDTH = +(params.get('w') || 1920);
const HEIGHT = +(params.get('h') || 960);
const PREVIEW = params.has('preview');
export const DURATION = 32;

const fontA = new FontFace('CairoBlack', 'url(./node_modules/@expo-google-fonts/cairo/900Black/Cairo_900Black.ttf)');
const fontB = new FontFace('CairoBold', 'url(./node_modules/@expo-google-fonts/cairo/700Bold/Cairo_700Bold.ttf)');
await Promise.all([fontA.load(), fontB.load()]);
document.fonts.add(fontA); document.fonts.add(fontB);
await loadText();

// ---------- renderer / camera ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
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
scene.environmentIntensity = 0.5;

// ---------- the box behind a thin bezel ----------
const OW = SW * 0.9, OH = SH * 0.86;
const HX = OW / 2, HY = OH / 2;
const RD = 32;

function panelTexture(base, groove, seed) {
  const [c, g] = canvas(512, 512);
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  const r = rng(seed);
  for (let i = 0; i < 3000; i++) {
    const v = r() * 255;
    g.fillStyle = `rgba(${v},${v},${v},${0.02 + r() * 0.03})`;
    g.fillRect(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 3);
  }
  g.strokeStyle = groove; g.lineWidth = 5; g.strokeRect(2, 2, 508, 508);
  g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 2; g.strokeRect(8, 8, 496, 496);
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
const wallTex = panelTexture('#283149', 'rgba(8,12,24,0.95)', 3);
const floorTex = panelTexture('#1c2233', 'rgba(5,8,16,0.95)', 5);
wall(RD, OH, texMat(wallTex, RD / 2.4, OH / 2.4, { roughness: 0.6, metalness: 0.25 }), new THREE.Vector3(-HX, 0, -RD / 2), [0, Math.PI / 2, 0]);
wall(RD, OH, texMat(wallTex, RD / 2.4, OH / 2.4, { roughness: 0.6, metalness: 0.25 }), new THREE.Vector3(HX, 0, -RD / 2), [0, -Math.PI / 2, 0]);
wall(OW, RD, texMat(floorTex, OW / 2.4, RD / 2.4, { roughness: 0.28, metalness: 0.45 }), new THREE.Vector3(0, -HY, -RD / 2), [-Math.PI / 2, 0, 0]);
wall(OW, RD, texMat(wallTex, OW / 2.4, RD / 2.4, { roughness: 0.7, metalness: 0.2 }), new THREE.Vector3(0, HY, -RD / 2), [Math.PI / 2, 0, 0]);
wall(OW, OH, texMat(wallTex, OW / 2.4, OH / 2.4, { roughness: 0.7, metalness: 0.2 }), new THREE.Vector3(0, 0, -RD), [0, 0, 0]);

// white light bars in the ceiling
const barMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
for (let z = -2; z > -RD + 1; z -= 4) {
  for (const x of [-OW * 0.3, OW * 0.3]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(OW * 0.26, 0.05, 0.22), barMat);
    m.position.set(x, HY - 0.03, z);
    room.add(m);
  }
}
// gold trim: the four depth edges of the box + the opening outline (drawn on in the intro)
const trimMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(GOLD), toneMapped: false });
const rails = [];
for (const [x, y] of [[-HX, -HY], [HX, -HY], [-HX, HY], [HX, HY]]) {
  const geo = new THREE.BoxGeometry(0.05, 0.05, RD);
  geo.translate(0, 0, -RD / 2);
  const m = new THREE.Mesh(geo, trimMat);
  m.position.set(x * 0.997, y * 0.997, 0);
  room.add(m);
  rails.push(m);
}
const outline = [];
for (const [w, h, x, y] of [[OW, 0.05, 0, HY], [OW, 0.05, 0, -HY], [0.05, OH, -HX, 0], [0.05, OH, HX, 0]]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), trimMat);
  m.position.set(x, y, 0.02);
  scene.add(m);
  outline.push(m);
}
{
  const outer = new THREE.Shape();
  outer.moveTo(-SW, -SH); outer.lineTo(SW, -SH); outer.lineTo(SW, SH); outer.lineTo(-SW, SH); outer.lineTo(-SW, -SH);
  const hole = new THREE.Path();
  hole.moveTo(-HX, -HY); hole.lineTo(-HX, HY); hole.lineTo(HX, HY); hole.lineTo(HX, -HY); hole.lineTo(-HX, -HY);
  outer.holes.push(hole);
  scene.add(new THREE.Mesh(new THREE.ShapeGeometry(outer), new THREE.MeshBasicMaterial({ color: 0x000000 })));
}

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0xc8d8ff, 0x1a1f2e, 0.6);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(5, 14, 13);
key.target.position.set(0, -3, -8);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 80 });
key.shadow.bias = -0.0005;
key.shadow.normalBias = 0.02;
scene.add(key, key.target);
const fill = new THREE.DirectionalLight(0xdfe8ff, 0.5);
fill.position.set(-8, 2, 14);
scene.add(fill);
const warm = new THREE.PointLight(0xffb347, 0, 60, 1.2); // the sun's light
scene.add(warm);
const flash = new THREE.PointLight(0xffffff, 0, 40, 1.5); // pops at the big moments
flash.position.set(0, 1, 6);
scene.add(flash);
const headA = new THREE.SpotLight(0xffffff, 0, 40, 0.45, 0.6, 1.0);
scene.add(headA, headA.target);

// ---------- cast ----------
const logo = makeLogo(); scene.add(logo);
const ledSide = new LedScreen(1024, 528, [0, 1, 2], 0);
const ledRear = new LedScreen(512, 528, [0, 2], 1.2);
const ledSideB = new LedScreen(1024, 528, [1, 0, 2], 1.7);
const truckA = makeTruck({ side: ledSide, rear: ledRear });
const truckB = makeTruck({ side: ledSideB, rear: ledRear });
truckA.scale.setScalar(1.25); truckB.scale.setScalar(1.25);
scene.add(truckA, truckB);
const aden = makeAden({ HX, HY, RD });
scene.add(aden.root);
const gulls = Array.from({ length: 10 }, () => { const g = makeGull(); scene.add(g); return g; });
const gullData = (() => {
  const r = rng(31);
  return gulls.map((g, i) => {
    const side = i % 2 ? 1 : -1;
    return {
      t0: 13.3 + i * 0.3 + r() * 0.2, dur: 2.6 + r() * 0.8, ph: r() * 6,
      p0: new THREE.Vector3(3.5 + (r() - 0.5) * 3, 1.2 + r() * 1.5, -6 + r() * 2),
      p1: new THREE.Vector3(side * (2 + r() * 4), 2 + r() * 2, -3 + r() * 3),
      p2: new THREE.Vector3(side * (5 + r() * 7), (r() - 0.2) * 6, 15 + r() * 3),
    };
  });
})();
const products = [];
{
  const r = rng(91);
  for (let i = 0; i < 12; i++) {
    const p = i % 4 === 3 ? makePhone() : i % 4 === 2 ? makeCarton() : makeCan(i);
    p.visible = false;
    scene.add(p);
    const ang = -0.6 + r() * 4.4;
    products.push({
      p, t0: 18.4 + i * 0.13 + r() * 0.08,
      end: new THREE.Vector3(Math.cos(ang) * (3 + r() * 5.5), Math.sin(ang) * (1.2 + r() * 2.6) + 0.6, 4 + r() * 5),
      spin: new THREE.Vector3((r() - 0.5) * 6, (r() - 0.5) * 8, (r() - 0.5) * 4),
    });
  }
}
const T = {
  brand: makeText('brand', 2.4, 0.85, mats.goldFace, mats.goldSide, { bevel: 0.07 }),
  sub: makeText('sub', 1.0, 0.35, mats.whiteFace, mats.royalSide, { bevel: 0.03 }),
  design: makeText('design', 1.3, 0.45, mats.whiteFace, mats.royalSide, { bevel: 0.04 }),
  illusion: makeText('illusion', 0.95, 0.35, mats.goldFace, mats.goldSide, { bevel: 0.03 }),
  threeD: makeText('threeD', 5.4, 1.7, mats.chrome, mats.royalSide, { bevel: 0.12, curve: 8 }),
  screens: makeText('screens', 0.85, 0.28, mats.whiteFace, mats.royalSide, { bevel: 0.02 }),
  endBrand: makeText('brand', 1.9, 0.6, mats.goldFace, mats.goldSide, { bevel: 0.05 }),
  endSub: makeText('sub', 0.9, 0.28, mats.whiteFace, mats.royalSide, { bevel: 0.025 }),
  slogan: makeText('slogan', 0.78, 0.25, mats.goldFace, mats.goldSide, { bevel: 0.02 }),
  phones: makeText('phones', 0.52, 0.14, mats.whiteFace, mats.royalSide, { bevel: 0.0 }),
  handle: makeText('handle', 0.5, 0.14, mats.whiteFace, mats.royalSide, { bevel: 0.0 }),
};
for (const g of Object.values(T)) scene.add(g);

// glow sprite behind the sun / logo
function glowTexture() {
  const [c, g] = canvas(256, 256);
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,200,90,1)'); grd.addColorStop(0.3, 'rgba(255,170,40,0.45)'); grd.addColorStop(1, 'rgba(255,150,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
glow.scale.set(14, 14, 1);
scene.add(glow);

// ---------- water ----------
const WX = 64, WZ = 110;
const water = new THREE.Group();
scene.add(water);
const waterMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff, roughness: 0.12, metalness: 0.0, clearcoat: 0.5, clearcoatRoughness: 0.06,
  transparent: true, opacity: 0.93, vertexColors: true, side: THREE.DoubleSide, envMapIntensity: 0.4,
});
function colorGeo(g) { g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3)); return g; }
const topGeo = colorGeo(new THREE.PlaneGeometry(1, 1, WX, WZ));
const frontGeo = colorGeo(new THREE.PlaneGeometry(1, 1, WX, 2));
const sideGeos = [0, 1].map(() => colorGeo(new THREE.PlaneGeometry(1, 1, 24, 2)));
water.add(new THREE.Mesh(topGeo, waterMat), new THREE.Mesh(frontGeo, waterMat));
const waterSides = sideGeos.map((g) => { const m = new THREE.Mesh(g, waterMat); water.add(m); return m; });

function waterState(t) {
  const rise = easeInOut(seg(t, 1.4, 2.8));
  const drain = easeIn(seg(t, 6.6, 7.8));
  const level = lerp(-HY - 0.4, -0.8, rise) - 0.8 * seg(t, 5.2, 6.2) - drain * 4.2;
  const surge = seg(t, 2.9, 5.1);
  const front = lerp(0, 4.6, easeOut(seg(t, 3.7, 4.6))) * (1 - easeIn(seg(t, 4.8, 5.7)));
  return { level, surge, front, on: t > 1.35 && t < 7.9 };
}
function waterHeight(x, z, t, st) {
  let y = st.level;
  y += 0.16 * Math.sin(1.4 * x + 2.3 * t) * Math.cos(0.6 * z - 1.7 * t);
  y += 0.1 * Math.sin(0.8 * z + 3.1 * t + x * 0.3);
  y += 0.05 * Math.sin(3.2 * x - 4 * t + z);
  const zc = lerp(-30, 5, easeInOut(st.surge));
  const amp = 2.9 * pulse(st.surge, 0, 1.05);
  const dz = z - zc;
  const w = dz > 0 ? 1.3 : 4.5;
  y += amp * Math.exp(-(dz * dz) / (w * w)) * (1 + 0.12 * Math.sin(x * 1.7 + t * 5));
  if (z > 0) y -= 0.25 * z * z * seg(t, 4.1, 5.1);
  return Math.max(y, -HY - 0.6);
}
const tmpC = new THREE.Color(), foamC = new THREE.Color(0.95, 0.97, 1), deepC = new THREE.Color(0.005, 0.05, 0.26);
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
      tmpC.copy(deepC).lerp(foamC, clamp01((y - st.level - 0.45) / 1.4));
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
        gc.setXYZ(k, lerp(0.05, 0.0, d), lerp(0.18, 0.02, d), lerp(0.6, 0.12, d));
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
  const [c, g] = canvas(64, 64);
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(255,255,255,0.7)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const DOT = dotTexture();
function makePoints(n, size, opacity, additive) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  const mat = new THREE.PointsMaterial({ size, map: DOT, vertexColors: true, transparent: true, opacity, depthWrite: false, sizeAttenuation: true, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);
  return pts;
}
// sea spray (bursting out of the screen) and gold sparks (logo / product bursts)
const SPRAY_N = 2600;
const spray = makePoints(SPRAY_N, 0.2, 0.9, false);
const sprayData = (() => {
  const r = rng(7);
  return Array.from({ length: SPRAY_N }, () => ({
    t0: 3.8 + r() * 1.0, x: (r() * 2 - 1) * HX, y: -1 + r() * 1.5,
    vx: (r() * 2 - 1) * 4.5, vy: 3 + r() * 6, vz: 6 + r() * 12, life: 1.2 + r() * 1.2,
  }));
})();
const SPARK_N = 1600;
const sparks = makePoints(SPARK_N, 0.12, 1, true);
const sparkData = (() => {
  const r = rng(17);
  return Array.from({ length: SPARK_N }, (_, i) => {
    const th = r() * Math.PI * 2, ph = Math.acos(2 * r() - 1);
    const v = 3 + r() * 9;
    return { ev: i % 3, v: new THREE.Vector3(Math.sin(ph) * Math.cos(th) * v, Math.sin(ph) * Math.sin(th) * v, Math.abs(Math.cos(ph)) * v * 1.3), d: r() * 0.25, life: 0.9 + r() * 0.9 };
  });
})();
function updateParticles(t, burstSrc) {
  const p = spray.geometry.attributes.position, c = spray.geometry.attributes.color;
  sprayData.forEach((d, i) => {
    const a = t - d.t0;
    if (a < 0 || a > d.life) { p.setXYZ(i, 0, -999, 0); return; }
    p.setXYZ(i, d.x + d.vx * a, d.y + d.vy * a - 6.5 * a * a, 0.5 + d.vz * a);
    const f = 1 - a / d.life;
    c.setXYZ(i, lerp(0.6, 1, f), lerp(0.75, 1, f), 1);
  });
  p.needsUpdate = true; c.needsUpdate = true;
  const sp = sparks.geometry.attributes.position, sc = sparks.geometry.attributes.color;
  sparkData.forEach((d, i) => {
    const src = burstSrc[d.ev];
    const a = t - src.t - d.d;
    if (a < 0 || a > d.life) { sp.setXYZ(i, 0, -999, 0); return; }
    sp.setXYZ(i, src.p.x + d.v.x * a, src.p.y + d.v.y * a - 3 * a * a, src.p.z + d.v.z * a);
    const f = 1 - a / d.life;
    sc.setXYZ(i, 1.4 * f, 0.9 * f, 0.3 * f);
  });
  sp.needsUpdate = true; sc.needsUpdate = true;
}

// ---------- post ----------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(WIDTH, HEIGHT), 0.45, 0.35, 1.7));
composer.addPass(new OutputPass());

// ---------- helpers ----------
function showText(group, t, start, end, pos, opts = {}) {
  group.visible = t > start - 0.02 && t < end;
  if (!group.visible) return;
  group.position.copy(pos);
  group.position.y += 0.05 * Math.sin(t * 1.7 + pos.x);
  group.rotation.set(opts.rx ?? 0, (opts.ry ?? 0) + 0.05 * Math.sin(t * 1.1 + pos.y), 0);
  group.scale.setScalar(1);
  placeGlyphs(group, t, start, opts);
  const x = easeIn(seg(t, end - 0.55, end));
  if (x > 0) {
    group.position.z = lerp(group.position.z, -34, x);
    group.scale.setScalar(lerp(1, 0.3, x));
  }
}
function driveTruck(tr, s) {
  tr.visible = s.on;
  if (!s.on) return;
  tr.position.set(s.x, -HY, s.z);
  tr.rotation.y = s.yaw;
  tr.userData.wheels.forEach((w) => (w.rotation.x = s.dist / 0.42));
  tr.userData.body.rotation.x = s.pitch || 0;
  tr.updateMatrixWorld(true);
}
// truck A: comes out of the city along the road and drives right out of the screen at the viewer
function truckAPath(t) {
  const a = seg(t, 14.6, 18.2);
  const e = Math.pow(a, 1.7);
  const z = lerp(-11, 19, e);
  const x = lerp(0.9, 2.4, Math.pow(a, 3));
  return { on: t > 14.6 && t < 18.1, x, z, yaw: 0.06 * Math.pow(a, 3), dist: z, pitch: 0.01 * Math.sin(t * 9) };
}
// truck B: follows, stops broadside, products burst out of its screen, then it drives off to the right
function truckBPath(t) {
  const arrive = easeOut(seg(t, 15.7, 18.0));
  const turn = easeInOut(seg(t, 16.9, 18.1));
  const leave = easeIn(seg(t, 20.5, 21.8));
  const z = lerp(-11, -1.6, arrive) + leave * 1.5;
  const x = lerp(-0.9, -1.6, turn) + leave * 15;
  return { on: t > 15.7 && t < 21.8, x, z, yaw: turn * 1.0 + leave * 0.55, dist: z + x, pitch: -0.025 * pulse(t, 17.9, 18.5) };
}

function setLights(t) {
  const off = 1 - seg(t, 31.3, 31.95);
  const lit = seg(t, 0.9, 1.9) * off;
  barMat.color.setScalar(lit * 1.3);
  hemi.intensity = 0.05 + 0.55 * lit;
  key.intensity = 0.05 + 2.4 * lit;
  fill.intensity = 0.5 * lit;
  scene.environmentIntensity = 0.03 + 0.45 * lit;
  // gold trim draws itself from the back of the box toward the viewer, then settles
  const draw = easeInOut(seg(t, 0.1, 1.2));
  rails.forEach((r) => { r.scale.z = Math.max(0.001, draw); r.position.z = -RD * (1 - draw); });
  const ol = seg(t, 1.0, 1.4);
  outline.forEach((o) => (o.visible = ol > 0));
  trimMat.color.set(GOLD).multiplyScalar(off * (draw < 1 ? 2.5 : lerp(2.5, 1.1, seg(t, 1.2, 2.2))) + 1.5 * (pulse(t, 7.6, 8.3) + pulse(t, 18.3, 18.9)));
}

// ---------- timeline ----------
const burstSrc = [
  { t: 7.75, p: new THREE.Vector3(0, 0.5, 3) },
  { t: 18.4, p: new THREE.Vector3(-2, -1.2, -1.8) },
  { t: 22.4, p: new THREE.Vector3(4, 0.2, 3) },
];
function renderAt(t) {
  t = ((t % DURATION) + DURATION) % DURATION;
  setLights(t);
  updateWater(t);

  // --- sunrise -> logo (5.2 – 11.9)
  const L = logo.userData;
  logo.visible = (t > 5.2 && t < 11.9) || (t > 26.0 && t < 31.9);
  glow.material.opacity = 0;
  warm.intensity = 0;
  if (t < 20) {
    const rise = easeOut(seg(t, 5.2, 6.9));
    const fly = easeOutBack(seg(t, 7.0, 8.0), 1.3);
    const toSide = easeInOut(seg(t, 9.3, 10.1));
    const leave = easeIn(seg(t, 11.3, 11.9));
    logo.position.set(0, lerp(-6, 0.0, rise) + fly * 0.4, lerp(-24, 3.4, fly));
    logo.position.x = lerp(logo.position.x, 5.3, toSide);
    logo.position.z = lerp(logo.position.z, 1.4, toSide);
    logo.position.y += 0.08 * Math.sin(t * 2);
    logo.position.z = lerp(logo.position.z, -34, leave);
    logo.rotation.set(0, 0.18 * Math.sin(t * 1.3) * fly - 0.25 * toSide, 0);
    logo.scale.setScalar(lerp(1.5, 1.05, fly) * lerp(1, 0.85, toSide));
    L.rays.children.forEach((p, i) => p.userData.ray.scale.set(1, Math.max(0.01, easeOutBack(seg(t, 6.2 + i * 0.06, 6.9 + i * 0.06)) * (1 + 0.12 * Math.sin(t * 5 + i))), 1));
    L.waves.children.forEach((w, i) => {
      const a = easeOutBack(seg(t, 7.5 + i * 0.12, 8.2 + i * 0.12));
      w.visible = a > 0;
      w.position.x = w.userData.home.x + (1 - a) * (i % 2 ? -10 : 10) + 0.12 * Math.sin(t * 2.2 + i);
    });
    const pop = pulse(t, 8.4, 9.4);
    L.playPivot.visible = t > 7.6;
    L.playPivot.position.set(0, 0.05 + pop * 0.3, 0.25 + easeOut(pop) * 4.2);
    L.playPivot.rotation.set(0, Math.PI * 2 * seg(t, 8.4, 9.4), 0);
    L.playPivot.scale.setScalar(Math.max(0.01, easeOutBack(seg(t, 7.6, 8.1))) * (1 + 0.3 * pop));
    glow.position.copy(logo.position).add(new THREE.Vector3(0, 0, -0.8));
    glow.material.opacity = 0.5 * seg(t, 5.2, 6.2) * (1 - leave) * lerp(1, 0.5, fly);
    glow.scale.setScalar(lerp(16, 9, fly));
    warm.position.copy(logo.position).add(new THREE.Vector3(0, 0.5, 2));
    warm.intensity = 14 * seg(t, 5.2, 6.2) * (1 - leave);
  } else {
    const a = easeOutBack(seg(t, 26.0, 27.0), 1.2);
    logo.position.set(lerp(0, 5.0, a), 0.15 + 0.08 * Math.sin(t * 2), lerp(-30, 1.8, a));
    logo.rotation.set(0, -0.3 + 0.12 * Math.sin(t * 1.4), 0);
    logo.scale.setScalar(Math.max(0.02, a));
    logo.position.z = lerp(logo.position.z, -34, easeIn(seg(t, 31.2, 31.9)));
    L.rays.children.forEach((p, i) => p.userData.ray.scale.set(1, 1 + 0.15 * Math.sin(t * 5 + i), 1));
    L.waves.children.forEach((w, i) => { w.visible = true; w.position.x = w.userData.home.x + 0.12 * Math.sin(t * 2.2 + i); });
    L.playPivot.visible = true; L.playPivot.position.set(0, 0.05, 0.25); L.playPivot.rotation.set(0, 0, 0); L.playPivot.scale.setScalar(1);
    glow.position.copy(logo.position).add(new THREE.Vector3(0, 0, -0.8));
    glow.material.opacity = 0.35 * a * (1 - seg(t, 31.2, 31.9));
    glow.scale.setScalar(9);
    warm.position.copy(logo.position).add(new THREE.Vector3(0, 0.5, 2));
    warm.intensity = 10 * a;
  }
  showText(T.brand, t, 9.5, 11.9, new THREE.Vector3(-1.7, 1.4, 1.8), { from: new THREE.Vector3(0, 0, -30), stagger: 0.08, dur: 0.85, rx: -0.04 });
  showText(T.sub, t, 10.0, 11.9, new THREE.Vector3(-1.7, -1.2, 1.0), { from: new THREE.Vector3(0, -2, -28), stagger: 0.045, dur: 0.7, spin: 0.4 });

  // --- Aden (11.8 – 21.8)
  aden.update(t, 11.8, 20.6);
  if (aden.root.visible) {
    warm.position.set(-1.5, -1, -26);
    warm.intensity = Math.max(warm.intensity, 25 * seg(t, 11.8, 13) * (1 - seg(t, 20.6, 21.6)));
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
    g.scale.setScalar(1.4);
    const fl = Math.sin(t * 13 + d.ph);
    g.userData.wings.forEach(({ pivot, s }) => (pivot.rotation.z = s * fl * 0.7));
  });

  // --- trucks (14.6 – 21.8)
  const holdAd = t > 18.0 && t < 20.6;
  ledSide.update(t);
  ledRear.update(t);
  ledSideB.update(t, holdAd ? 1 : -1);
  driveTruck(truckA, truckAPath(t));
  driveTruck(truckB, truckBPath(t));
  const beamA = truckA.visible ? 1 + 1.5 * (pulse(t, 16.6, 16.85) + pulse(t, 17.0, 17.25)) : 0;
  truckA.userData.lampMat.color.setScalar(1.5 * beamA);
  truckB.userData.lampMat.color.setScalar(1.5);
  headA.intensity = 50 * beamA;
  if (truckA.visible) {
    headA.position.copy(truckA.localToWorld(new THREE.Vector3(0, 1.2, 3.3)));
    headA.target.position.copy(truckA.localToWorld(new THREE.Vector3(0, 0.3, 14)));
  }
  // products burst out of truck B's LED screen
  const src = truckB.visible ? truckB.localToWorld(truckB.userData.sideCenter.clone()) : new THREE.Vector3(-2, -1.2, -2);
  burstSrc[1].p.copy(src);
  products.forEach((o) => {
    const a = seg(t, o.t0, o.t0 + 2.6);
    o.p.visible = a > 0 && a < 1;
    if (!o.p.visible) return;
    const e = easeOut(a);
    o.p.position.lerpVectors(src, o.end, e);
    o.p.position.y += Math.sin(Math.PI * e) * 1.2;
    o.p.rotation.set(o.spin.x * a, o.spin.y * a, o.spin.z * a);
    o.p.scale.setScalar(lerp(0.25, 1.9, easeOut(Math.min(1, a * 1.6))));
  });

  // --- 3D message (21.8 – 26.0)
  T.threeD.visible = t > 21.8 && t < 26.0;
  if (T.threeD.visible) {
    const a = easeOutBack(seg(t, 21.8, 22.8), 1.3);
    const spin = easeInOut(seg(t, 23.4, 24.4));
    T.threeD.position.set(lerp(0, 4.3, a), 0.2, lerp(-32, 3.4, a));
    T.threeD.scale.setScalar(Math.max(0.01, a));
    T.threeD.rotation.set(0.06 * Math.sin(t * 1.3), (1 - a) * -2.5 + spin * Math.PI * 2 - 0.2 + 0.12 * Math.sin(t * 1.1), 0);
    T.threeD.userData.glyphs.forEach((g) => { g.visible = true; g.position.copy(g.userData.home); g.rotation.set(0, 0, 0); g.scale.setScalar(1); });
    T.threeD.position.z = lerp(T.threeD.position.z, -34, easeIn(seg(t, 25.45, 26.0)));
  }
  showText(T.design, t, 22.2, 26.0, new THREE.Vector3(-3.6, 1.8, 0.6), { from: new THREE.Vector3(-3, 2, -28), stagger: 0.05, dur: 0.7, spin: 0.5 });
  showText(T.illusion, t, 22.6, 26.0, new THREE.Vector3(-3.6, 0.3, 0.6), { from: new THREE.Vector3(-3, 0, -28), stagger: 0.04, dur: 0.7, spin: 0.5 });
  showText(T.screens, t, 23.2, 26.0, new THREE.Vector3(-3.6, -1.15, 0.4), { from: new THREE.Vector3(-3, -2, -28), stagger: 0.035, dur: 0.6, spin: 0.3 });

  // --- end card (26 – 32)
  showText(T.endBrand, t, 26.1, 31.9, new THREE.Vector3(-3.1, 1.85, 0.8), { stagger: 0.07, dur: 0.75 });
  showText(T.endSub, t, 26.55, 31.9, new THREE.Vector3(-3.1, 0.3, 0.3), { stagger: 0.04, dur: 0.7, spin: 0.4 });
  showText(T.slogan, t, 27.0, 31.9, new THREE.Vector3(-3.1, -1.0, 0.3), { stagger: 0.04, dur: 0.7, spin: 0.4 });
  showText(T.phones, t, 27.5, 31.9, new THREE.Vector3(-3.1, -2.2, 0.0), { stagger: 0.03, dur: 0.6, spin: 0.3 });
  showText(T.handle, t, 27.8, 31.9, new THREE.Vector3(-3.1, -3.0, 0.0), { stagger: 0.03, dur: 0.6, spin: 0.3 });

  flash.intensity = 30 * (pulse(t, 7.7, 8.2) + pulse(t, 18.35, 18.8) + pulse(t, 22.5, 23.0));
  updateParticles(t, burstSrc);
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
