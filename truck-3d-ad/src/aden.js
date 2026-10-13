// Aden as a pop-up paper diorama at golden hour: layered cut-outs (far ridges, the Crater mountains,
// Sira castle on its rock, the clock tower and city, the old minaret with palms, the sea), a sky in
// the brand colors, seagulls and a road that unrolls toward the viewer.
import * as THREE from 'three';
import { rng, canvas, seg, easeOutBack, easeIn, lerp } from './common.js';

const rect = (x0, y0, x1, y1) => { const p = new THREE.Path(); p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x1, y1); p.lineTo(x0, y1); p.lineTo(x0, y0); return p; };
function shapeFrom(pts) { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) s.lineTo(p[0], p[1]); s.lineTo(pts[0][0], pts[0][1]); return s; }
function archHole(cx, y0, w, h) {
  const p = new THREE.Path();
  p.moveTo(cx - w / 2, y0); p.lineTo(cx + w / 2, y0); p.lineTo(cx + w / 2, y0 + h - w / 2);
  p.absarc(cx, y0 + h - w / 2, w / 2, 0, Math.PI, false);
  p.lineTo(cx - w / 2, y0);
  return p;
}
function ridge(x0, x1, minH, maxH, step, seed, sharp = 1) {
  const r = rng(seed);
  const pts = [[x0, 0]];
  let x = x0;
  while (x < x1) {
    pts.push([x, minH + Math.pow(r(), sharp) * (maxH - minH)]);
    x += step * (0.5 + r());
  }
  pts.push([x1, minH + r() * (maxH - minH) * 0.5], [x1, 0]);
  return shapeFrom(pts);
}
function building(x0, w, h, seed, opts = {}) {
  const r = rng(seed);
  const s = new THREE.Shape();
  s.moveTo(x0, 0); s.lineTo(x0 + w, 0); s.lineTo(x0 + w, h);
  if (opts.dome) { s.lineTo(x0 + w * 0.75, h); s.absarc(x0 + w / 2, h, w * 0.25, 0, Math.PI, false); }
  if (opts.parapet) { for (let k = 0; k < 4; k++) { const xx = x0 + w - (k + 0.5) * w / 4; s.lineTo(xx + w / 16, h); s.lineTo(xx + w / 16, h + 0.08); s.lineTo(xx - w / 16, h + 0.08); s.lineTo(xx - w / 16, h); } }
  s.lineTo(x0, h); s.lineTo(x0, 0);
  const wins = [];
  const cols = Math.max(1, Math.floor(w / 0.32)), rows = Math.max(1, Math.floor((h - 0.3) / 0.42));
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    if (r() < 0.25) continue;
    const cx = x0 + (i + 0.5) * w / cols, y = 0.25 + j * 0.42;
    s.holes.push(opts.arched ? archHole(cx, y, 0.12, 0.24) : rect(cx - 0.06, y, cx + 0.06, y + 0.2));
    wins.push([cx, y + 0.1]);
  }
  return { shape: s, wins };
}
function clockTower(cx) {
  const s = new THREE.Shape();
  const pts = [[-0.55, 0], [0.55, 0], [0.55, 0.5], [0.42, 0.5], [0.42, 3.6], [0.52, 3.6], [0.52, 4.5], [0.4, 4.5], [0.4, 5.05], [0.48, 5.05], [0.48, 5.15], [0.04, 6.05], [0.04, 6.35], [-0.04, 6.35], [-0.04, 6.05], [-0.48, 5.15], [-0.48, 5.05], [-0.4, 5.05], [-0.4, 4.5], [-0.52, 4.5], [-0.52, 3.6], [-0.42, 3.6], [-0.42, 0.5], [-0.55, 0.5]];
  s.moveTo(cx + pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) s.lineTo(cx + p[0], p[1]);
  s.holes.push(archHole(cx, 4.58, 0.22, 0.38));
  for (const y of [1.1, 1.9, 2.7]) s.holes.push(archHole(cx, y, 0.12, 0.42));
  return { shape: s, wins: [[cx, 4.75], [cx, 1.3], [cx, 2.1], [cx, 2.9]], clock: [cx, 4.05] };
}
function minaret(cx, k = 1) {
  const R = [[0.95, 0], [0.95, 0.55], [0.6, 0.55], [0.55, 3.0], [0.82, 3.06], [0.82, 3.2], [0.46, 3.2], [0.41, 4.4], [0.64, 4.46], [0.64, 4.58], [0.35, 4.58], [0.32, 5.3], [0.5, 5.34], [0.5, 5.44], [0.3, 5.44], [0.3, 5.86], [0.38, 5.86], [0.38, 5.94]];
  const s = new THREE.Shape();
  const P = (x, y) => [cx + x * k, y * k];
  s.moveTo(...P(-R[0][0], R[0][1]));
  for (const [x, y] of R) s.lineTo(...P(x, y));
  // onion-ish dome + finial
  s.quadraticCurveTo(...P(0.42, 6.2), ...P(0.05, 6.42));
  s.lineTo(...P(0.03, 6.75)); s.lineTo(...P(-0.03, 6.75)); s.lineTo(...P(-0.05, 6.42));
  s.quadraticCurveTo(...P(-0.42, 6.2), ...P(-0.38, 5.94));
  for (const [x, y] of R.slice().reverse()) s.lineTo(...P(-x, y));
  const wins = [];
  for (const y of [1.2, 2.2]) { s.holes.push(archHole(cx, y * k, 0.16 * k, 0.5 * k)); wins.push([cx, (y + 0.2) * k]); }
  s.holes.push(archHole(cx, 3.6 * k, 0.13 * k, 0.45 * k)); wins.push([cx, 3.8 * k]);
  s.holes.push(archHole(cx, 4.75 * k, 0.11 * k, 0.35 * k)); wins.push([cx, 4.9 * k]);
  for (const dx of [-0.13, 0.13]) { s.holes.push(archHole(cx + dx * k, 5.5 * k, 0.12 * k, 0.3 * k)); wins.push([cx + dx * k, 5.62 * k]); }
  return { shape: s, wins };
}
function castle(x0) {
  // rock + Sira fortress: keep, curtain wall and a round tower with merlons
  const r = rng(77);
  const pts = [[x0 - 0.5, 0]];
  for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push([x0 + u * 7, 0.4 + 2.1 * Math.sin(Math.PI * Math.min(1, u * 1.15)) + r() * 0.25]); }
  pts.push([x0 + 7.4, 0]);
  const rock = shapeFrom(pts);
  const merlons = (s, a, b, y) => { const n = Math.round((b - a) / 0.22); for (let i = 0; i < n; i++) { const xx = b - i * (b - a) / n; s.lineTo(xx, y + 0.14); s.lineTo(xx - (b - a) / n / 2, y + 0.14); s.lineTo(xx - (b - a) / n / 2, y); s.lineTo(xx - (b - a) / n, y); } };
  const keep = new THREE.Shape();
  const kx = x0 + 2.4, ky = 2.1;
  keep.moveTo(kx, ky - 0.3); keep.lineTo(kx + 2.6, ky - 0.3); keep.lineTo(kx + 2.6, ky + 0.7);
  merlons(keep, kx + 1.8, kx + 2.6, ky + 0.7);
  keep.lineTo(kx + 1.8, ky + 1.35);
  merlons(keep, kx + 0.9, kx + 1.8, ky + 1.35);
  keep.lineTo(kx + 0.9, ky + 0.85);
  merlons(keep, kx, kx + 0.9, ky + 0.85);
  keep.lineTo(kx, ky - 0.3);
  keep.holes.push(archHole(kx + 1.35, ky + 0.6, 0.12, 0.32), archHole(kx + 0.45, ky + 0.3, 0.1, 0.25), archHole(kx + 2.2, ky + 0.2, 0.1, 0.25));
  return { shapes: [rock, keep], wins: [[kx + 1.35, ky + 0.75], [kx + 0.45, ky + 0.42], [kx + 2.2, ky + 0.32]] };
}
function palm(x, h, lean, seed) {
  const r = rng(seed);
  const shapes = [];
  const trunk = [];
  const N = 10;
  for (let i = 0; i <= N; i++) { const u = i / N; trunk.push([x + lean * u * u + 0.08 * (1 - u), u * h]); }
  for (let i = N; i >= 0; i--) { const u = i / N; trunk.push([x + lean * u * u - 0.08 * (1 - u) - 0.04, u * h]); }
  shapes.push(shapeFrom(trunk));
  const tx = x + lean, ty = h;
  for (let k = 0; k < 8; k++) {
    const a = Math.PI * (0.05 + k / 7 * 0.9) + (r() - 0.5) * 0.2;
    const len = 0.9 + r() * 0.5;
    const pts = [];
    for (let i = 0; i <= 8; i++) { const u = i / 8; const droop = -0.5 * u * u * len; pts.push([tx + Math.cos(a) * u * len, ty + Math.sin(a) * u * len * 0.6 + droop + 0.09 * Math.sin(Math.PI * u)]); }
    for (let i = 8; i >= 0; i--) { const u = i / 8; const droop = -0.5 * u * u * len; pts.push([tx + Math.cos(a) * u * len, ty + Math.sin(a) * u * len * 0.6 + droop - 0.09 * Math.sin(Math.PI * u)]); }
    shapes.push(shapeFrom(pts));
  }
  return shapes;
}
function waveStrip(x0, x1, h, phase) {
  const pts = [[x0, 0]];
  for (let i = 0; i <= 40; i++) { const u = i / 40; const x = lerp(x0, x1, u); pts.push([x, h * (0.6 + 0.4 * Math.sin(x * 2.2 + phase)) + 0.12 * Math.sin(x * 5.3 + phase * 2)]); }
  pts.push([x1, 0]);
  return shapeFrom(pts);
}

function skyTexture() {
  const [c, g] = canvas(1024, 512);
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#071640'); grd.addColorStop(0.35, '#13348f'); grd.addColorStop(0.62, '#3b62c4');
  grd.addColorStop(0.78, '#f2a93b'); grd.addColorStop(0.9, '#ffcf6b'); grd.addColorStop(1, '#ffe2a1');
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 512);
  const r = rng(5);
  g.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 70; i++) { g.globalAlpha = 0.3 + r() * 0.6; g.fillRect(r() * 1024, r() * 170, 2, 2); }
  g.globalAlpha = 1;
  for (let i = 0; i < 5; i++) { // soft clouds lit from below
    const y = 230 + i * 24, x = r() * 1024;
    const cg = g.createRadialGradient(x, y, 0, x, y, 220);
    cg.addColorStop(0, 'rgba(255,190,120,0.35)'); cg.addColorStop(1, 'rgba(255,190,120,0)');
    g.fillStyle = cg; g.fillRect(x - 260, y - 50, 520, 100);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function roadTexture() {
  const [c, g] = canvas(256, 1024);
  g.fillStyle = '#2a2d33'; g.fillRect(0, 0, 256, 1024);
  const r = rng(9);
  for (let i = 0; i < 4000; i++) { const v = 30 + r() * 40; g.fillStyle = `rgb(${v},${v},${v + 3})`; g.fillRect(r() * 256, r() * 1024, 2, 2); }
  g.fillStyle = '#f4f4f4'; g.fillRect(12, 0, 8, 1024); g.fillRect(236, 0, 8, 1024);
  g.fillStyle = '#f6b01e';
  for (let y = 0; y < 1024; y += 128) g.fillRect(122, y, 12, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

export function makeAden({ HX, HY, RD }) {
  const root = new THREE.Group();
  const layers = [];
  const winMats = [];
  const addLayer = (shapes, color, z, wins = [], opts = {}) => {
    const pivot = new THREE.Group();
    pivot.position.set(0, -HY, z);
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: opts.depth ?? 0.12, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 10 });
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.0, emissive: color, emissiveIntensity: (opts.glow ?? 0.08) * 0.35 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    pivot.add(mesh);
    if (wins.length) {
      // warm light behind every window hole
      const wm = new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0), toneMapped: false });
      winMats.push(wm);
      for (const [x, y] of wins) {
        const q = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.6), wm);
        q.position.set(x, y, -0.06);
        pivot.add(q);
      }
    }
    root.add(pivot);
    layers.push({ pivot, z, mesh });
    return pivot;
  };

  // sky + sun on the back wall
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HY * 2), new THREE.MeshBasicMaterial({ map: skyTexture(), transparent: true, opacity: 0 }));
  sky.position.set(0, 0, -22.5);
  root.add(sky);
  const sunMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.35, 0.35), toneMapped: false, transparent: true, opacity: 0 });
  const sun = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64), sunMat);
  sun.position.set(-1.5, -1.3, -22.3);
  root.add(sun);

  addLayer([ridge(-HX, HX, 2.6, 4.6, 0.9, 3, 1.3)], 0x30355e, -21);
  addLayer([ridge(-HX, HX, 1.4, 5.6, 0.7, 11, 2.0)], 0x6a4a3d, -17);
  const cs = castle(1.0);
  addLayer([ridge(-HX, -1.0, 0.6, 2.2, 0.8, 19, 1.5), ...cs.shapes], 0x9c7a5c, -13, cs.wins);
  // city with the clock tower (gap in the middle for the road)
  const city = [];
  const cityWins = [];
  const ct = clockTower(-4.6);
  city.push(ct.shape); cityWins.push(...ct.wins);
  let seed = 100;
  for (const [x0, w, h, o] of [[-8.9, 1.3, 1.8, {}], [-7.6, 1.1, 2.4, { parapet: 1 }], [-6.4, 1.2, 1.5, { dome: 1 }], [-3.9, 1.2, 2.0, {}], [-2.7, 0.9, 1.4, { arched: 1 }],
    [1.9, 1.0, 1.7, { arched: 1 }], [2.9, 1.4, 2.6, { parapet: 1 }], [4.3, 1.1, 1.6, { dome: 1 }], [5.4, 1.3, 2.2, {}], [6.7, 1.0, 1.4, { arched: 1 }], [7.7, 1.2, 2.0, { parapet: 1 }]]) {
    const b = building(x0, w, h, seed++, o); city.push(b.shape); cityWins.push(...b.wins);
  }
  const cityPivot = addLayer(city, 0xd8c29e, -9, cityWins, { glow: 0.1 });
  // clock face
  const faceMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.4, 1.0), toneMapped: false });
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.32, 40), faceMat);
  face.position.set(ct.clock[0], ct.clock[1], 0.15);
  cityPivot.add(face);
  const hands = [];
  for (const [len, w] of [[0.22, 0.035], [0.15, 0.05]]) {
    const hgeo = new THREE.PlaneGeometry(w, len); hgeo.translate(0, len / 2, 0);
    const h = new THREE.Mesh(hgeo, new THREE.MeshBasicMaterial({ color: 0x111111 }));
    h.position.set(ct.clock[0], ct.clock[1], 0.16);
    cityPivot.add(h); hands.push(h);
  }
  // the old minaret with houses and palms
  const mn = minaret(4.4, 0.95);
  const front = [mn.shape];
  const frontWins = [...mn.wins];
  for (const [x0, w, h, o] of [[-8.8, 1.4, 1.0, { dome: 1 }], [-7.2, 1.0, 1.3, { arched: 1 }], [-2.9, 1.0, 0.9, {}], [2.0, 1.2, 1.1, { arched: 1 }], [6.0, 1.4, 1.2, { dome: 1 }], [7.6, 1.2, 0.9, {}]]) {
    const b = building(x0, w, h, seed++, o); front.push(b.shape); frontWins.push(...b.wins);
  }
  front.push(...palm(-5.6, 2.6, 0.35, 1), ...palm(-4.3, 2.0, -0.25, 2), ...palm(2.6, 2.3, -0.3, 3), ...palm(7.0, 2.7, 0.3, 4));
  addLayer(front, 0xf2e4c8, -6, frontWins, { glow: 0.12 });
  // the sea in front, split by the road
  const seaA = addLayer([waveStrip(-HX, -2.0, 0.7, 0), waveStrip(2.0, HX, 0.7, 1.3)], 0x1d56e0, -3.6, [], { glow: 0.25 });
  const seaB = addLayer([waveStrip(-HX, -2.0, 0.45, 2.1), waveStrip(2.0, HX, 0.45, 0.4)], 0x0b2466, -2.9, [], { glow: 0.2 });

  // road
  const road = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1), new THREE.MeshStandardMaterial({ map: roadTexture(), roughness: 0.7 }));
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  root.add(road);
  const ROAD0 = -10, ROAD1 = 8;

  root.visible = false;

  function update(t, a, b) {
    // a = pop-up start, b = fold-down start
    root.visible = t > a - 0.05 && t < b + 1.4;
    if (!root.visible) return;
    const skyK = seg(t, a, a + 1.2) * (1 - seg(t, b + 0.6, b + 1.3));
    sky.material.opacity = skyK;
    sunMat.opacity = skyK;
    sun.position.y = lerp(-4.5, -1.3, seg(t, a, a + 2.5)) - 0.3 * seg(t, a + 3, b);
    const n = layers.length;
    layers.forEach((L, i) => {
      // back layers first, then forward; fold-down front first
      const up = easeOutBack(seg(t, a + i * 0.16, a + i * 0.16 + 0.75), 1.6);
      const down = easeIn(seg(t, b + (n - 1 - i) * 0.08, b + (n - 1 - i) * 0.08 + 0.55));
      L.pivot.rotation.x = -(1 - up) * Math.PI / 2 - down * Math.PI / 2;
      L.pivot.visible = up > 0.001 && down < 0.999;
    });
    seaA.position.x = 0.25 * Math.sin(t * 1.3);
    seaB.position.x = -0.3 * Math.sin(t * 1.1 + 1);
    const lights = seg(t, a + 1.5, a + 2.5);
    winMats.forEach((m, i) => m.color.setRGB(1.9 * lights, 1.1 * lights, 0.35 * lights));
    hands[0].rotation.z = -t * 2.0; hands[1].rotation.z = -t * 0.3;
    const unroll = seg(t, a + 1.4, a + 2.4) * (1 - seg(t, b, b + 0.6));
    const len = (ROAD1 - ROAD0) * unroll;
    road.visible = len > 0.01;
    road.scale.y = Math.max(0.001, len);
    road.position.set(0, -HY + 0.012, ROAD0 + len / 2);
    road.material.map.repeat.set(1, len / 4);
  }
  return { root, update, sunLightPos: sun.position };
}

// ---------- seagulls ----------
export function makeGull() {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const grey = new THREE.MeshStandardMaterial({ color: 0xb8c0ca, roughness: 0.6, side: THREE.DoubleSide });
  const tip = new THREE.MeshStandardMaterial({ color: 0x22252b, roughness: 0.6, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), white);
  body.scale.set(0.8, 0.75, 2.0); body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), white);
  head.position.set(0, 0.08, 0.42); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 6), new THREE.MeshStandardMaterial({ color: 0xf2a516 }));
  beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.06, 0.58); g.add(beak);
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.15); wingShape.lineTo(0.55, 0.12); wingShape.lineTo(0.95, 0.0); wingShape.lineTo(0.6, -0.2); wingShape.lineTo(0, -0.18);
  const tipShape = new THREE.Shape();
  tipShape.moveTo(0.85, 0.03); tipShape.lineTo(1.15, -0.06); tipShape.lineTo(0.75, -0.16);
  const wingGeo = new THREE.ShapeGeometry(wingShape); wingGeo.rotateX(-Math.PI / 2);
  const tipGeo = new THREE.ShapeGeometry(tipShape); tipGeo.rotateX(-Math.PI / 2);
  const wings = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    const w = new THREE.Mesh(wingGeo, grey); w.castShadow = true; w.scale.x = s; pivot.add(w);
    const wt = new THREE.Mesh(tipGeo, tip); wt.scale.x = s; pivot.add(wt);
    pivot.position.set(s * 0.1, 0.05, 0);
    g.add(pivot);
    wings.push({ pivot, s });
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 4), white);
  tail.rotation.x = -Math.PI / 2; tail.position.z = -0.45; tail.scale.y = 0.3; g.add(tail);
  g.userData.wings = wings;
  g.visible = false;
  return g;
}
