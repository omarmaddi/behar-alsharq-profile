// Brand assets: extruded Arabic lettering, the 3D logo, and the artwork shown on the truck LED screens.
import * as THREE from 'three';
import { ROYAL, SKY, NAVY, canvas, lerp, seg, easeOutBack, easeOut } from './common.js';

// ---------- materials ----------
export const mats = {
  goldFace: new THREE.MeshStandardMaterial({ color: 0xffc23a, metalness: 0.9, roughness: 0.28, emissive: 0x4a2a00, emissiveIntensity: 0.12 }),
  goldSide: new THREE.MeshStandardMaterial({ color: 0xb8650a, metalness: 0.95, roughness: 0.3 }),
  whiteFace: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.05, roughness: 0.3 }),
  royalSide: new THREE.MeshStandardMaterial({ color: ROYAL, metalness: 0.4, roughness: 0.3 }),
  navySide: new THREE.MeshStandardMaterial({ color: NAVY, metalness: 0.5, roughness: 0.35 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xf2f5fa, metalness: 1, roughness: 0.1 }),
};

// ---------- 3D Arabic text from HarfBuzz-shaped outlines ----------
let TEXT;
export async function loadText() {
  TEXT = await (await fetch(new URL('./text-paths.json', import.meta.url))).json();
}
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
export function makeText(key, size, depth, faceMat, sideMat, opts = {}) {
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
  return group;
}

// glyph-by-glyph fly-in from deep in the box (Arabic: the right-most glyph lands first)
export function placeGlyphs(group, t, start, opts = {}) {
  const { from = new THREE.Vector3(0, 0, -28), stagger = 0.06, dur = 0.8, spin = 1 } = opts;
  const gl = group.userData.glyphs;
  const n = gl.length;
  gl.forEach((g, i) => {
    const idx = n - 1 - i;
    const a = seg(t, start + idx * stagger, start + idx * stagger + dur);
    const e = easeOutBack(a, 1.4);
    g.visible = a > 0;
    const h = g.userData.home;
    g.position.set(lerp(from.x + h.x * 0.1, h.x, e), lerp(from.y, h.y, e), lerp(from.z, h.z, e));
    g.rotation.set(0, (1 - e) * spin * Math.PI * 1.5, (1 - e) * spin * 0.6);
    g.scale.setScalar(Math.max(0.001, lerp(0.3, 1, easeOut(a))));
  });
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
export function makeLogo() {
  const logo = new THREE.Group();
  const discMat = new THREE.MeshStandardMaterial({ color: 0xffb11a, metalness: 0.55, roughness: 0.3, emissive: 0xff9a10, emissiveIntensity: 0.55 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.5, 64), [mats.goldSide, discMat, discMat]);
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
    const r = new THREE.Mesh(rayGeo, [discMat, mats.goldSide]);
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
  const playMesh = new THREE.Mesh(playGeo, [mats.whiteFace, mats.royalSide]);
  playMesh.castShadow = true;
  const playPivot = new THREE.Group();
  playPivot.add(playMesh);
  playPivot.position.set(0, 0.05, 0.25);
  logo.add(playPivot);
  const waves = new THREE.Group();
  const wdefs = [
    [waveShape(5.6, 0.7, 0.28, -0.25, -0.4), new THREE.MeshBasicMaterial({ color: ROYAL }), -0.95, 0.75],
    [waveShape(4.9, 0.26, 0.26, -0.2, -0.2), mats.whiteFace, -1.5, 0.9],
    [waveShape(4.3, 0.5, 0.24, -0.15, 0.0), new THREE.MeshBasicMaterial({ color: SKY }), -1.95, 1.0],
  ];
  wdefs.forEach(([sh, mat, y, z], i) => {
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3, curveSegments: 4 });
    const m = new THREE.Mesh(geo, [mat, mats.navySide]);
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
  return logo;
}

// ---------- 2D logo for decals and LED artwork ----------
export function drawLogo2D(g, cx, cy, r) {
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

// ---------- truck LED screens: a small slideshow, redrawn every frame ----------
function streaks(g, w, h, t, k0 = 0) {
  for (let k = 0; k < 16; k++) {
    g.strokeStyle = k % 3 === 0 ? 'rgba(246,176,30,0.6)' : 'rgba(90,170,255,0.5)';
    g.lineWidth = 1 + (k % 4);
    g.beginPath();
    for (let i = 0; i <= 50; i++) {
      const u = i / 50;
      const y = h * (0.6 + 0.012 * k) + h * 0.16 * Math.sin(u * 5 + k * 0.4 + t * 1.5 + k0) * (0.4 + u);
      i ? g.lineTo(u * w, y) : g.moveTo(u * w, y);
    }
    g.stroke();
  }
}
function navyBg(g, w, h) {
  const grd = g.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, '#071a52'); grd.addColorStop(0.55, '#0e3192'); grd.addColorStop(1, '#061440');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
}
const SLIDES = [
  // brand
  (g, w, h, t) => {
    navyBg(g, w, h); streaks(g, w, h, t);
    drawLogo2D(g, w * 0.8, h * 0.4, h * 0.17);
    g.direction = 'rtl'; g.textAlign = 'right';
    g.fillStyle = '#fff'; g.font = `${h * 0.21}px CairoBlack`; g.fillText('بحار الشرق', w * 0.62, h * 0.38);
    g.fillStyle = '#f6b01e'; g.font = `${h * 0.12}px CairoBold`; g.fillText('للتسويق والإعلان', w * 0.62, h * 0.58);
    g.fillStyle = '#fff'; g.font = `${h * 0.085}px CairoBold`; g.fillText('إعلانك ... يصل للجميع', w * 0.62, h * 0.76);
  },
  // "your ad here"
  (g, w, h, t) => {
    const grd = g.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, '#f6b01e'); grd.addColorStop(1, '#ff7a00');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(w * (0.1 + i * 0.11), h * (0.5 + 0.35 * Math.sin(i * 1.7 + t * 2)), h * 0.12, 0, 7); g.fill(); }
    g.direction = 'rtl'; g.textAlign = 'center';
    g.fillStyle = '#0b2466'; g.font = `${h * 0.24}px CairoBlack`; g.fillText('إعلانك هنا', w * 0.5, h * 0.48);
    g.font = `${h * 0.1}px CairoBold`; g.fillText('بتقنية ثلاثية الأبعاد 3D', w * 0.5, h * 0.7);
  },
  // contacts
  (g, w, h, t) => {
    navyBg(g, w, h); streaks(g, w, h, t, 2);
    drawLogo2D(g, w * 0.5, h * 0.3, h * 0.13);
    g.direction = 'rtl'; g.textAlign = 'center';
    g.fillStyle = '#fff'; g.font = `${h * 0.12}px CairoBlack`; g.fillText('784006800  |  784007800', w * 0.5, h * 0.74);
    g.fillStyle = '#f6b01e'; g.font = `${h * 0.08}px CairoBold`; g.fillText('@baharalsharq', w * 0.5, h * 0.88);
  },
];
export class LedScreen {
  constructor(w, h, order = [0, 1, 2], offset = 0) {
    [this.c, this.g] = canvas(w, h);
    this.slides = order.map(() => canvas(w, h));
    this.order = order; this.offset = offset;
    this.tex = new THREE.CanvasTexture(this.c);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 8;
  }
  // forced: index of a slide to hold (e.g. while things burst out of the screen)
  update(t, forced = -1) {
    const { c, g } = this, w = c.width, h = c.height;
    const period = 3.2;
    const tt = t + this.offset;
    const k = forced >= 0 ? this.order.indexOf(forced) : Math.floor(tt / period) % this.order.length;
    const f = forced >= 0 ? 0 : seg(tt % period, period - 0.4, period);
    const draw = (i) => { const [sc, sg] = this.slides[i]; SLIDES[this.order[i]](sg, w, h, t); return sc; };
    g.globalAlpha = 1; g.drawImage(draw(k), 0, 0);
    if (f > 0) { g.globalAlpha = f; g.drawImage(draw((k + 1) % this.order.length), 0, 0); g.globalAlpha = 1; }
    // LED pixel grid
    g.fillStyle = 'rgba(0,0,0,0.2)';
    for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1, h);
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
    this.tex.needsUpdate = true;
  }
}
