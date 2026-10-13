// The Bahar Al-Sharq LED truck, modelled after the company fleet photos: a royal-blue cab-over
// light truck, a black-framed LED box with screens on both sides and the back, a yellow rail with
// the contact numbers under the box, and black/white chevron guards.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvas } from './common.js';
import { drawLogo2D } from './brand.js';

const paint = new THREE.MeshPhysicalMaterial({ color: 0x1846c4, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
const black = new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.55, metalness: 0.4 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x0d0d0f, roughness: 0.9 });
const glass = new THREE.MeshPhysicalMaterial({ color: 0x0a1222, metalness: 0.2, roughness: 0.04, clearcoat: 1, side: THREE.DoubleSide });
const chrome = new THREE.MeshStandardMaterial({ color: 0xe6eaf0, metalness: 1, roughness: 0.12 });
const greyPlastic = new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.6, metalness: 0.2 });
const rim = new THREE.MeshStandardMaterial({ color: 0xd9dde3, metalness: 0.85, roughness: 0.25 });
const amber = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.7, 0.05), toneMapped: false });
const redLamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.05, 0.05), toneMapped: false });

function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

function railTexture() {
  const [c, g] = canvas(2048, 96);
  g.fillStyle = '#f2b705'; g.fillRect(0, 0, 2048, 96);
  g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, 2048, 6); g.fillRect(0, 90, 2048, 6);
  g.direction = 'rtl'; g.textAlign = 'center'; g.fillStyle = '#111';
  g.font = '54px CairoBold';
  g.fillText('بحار الشرق للتسويق والإعلان   |   أرقام التواصل: 784007800 - 784006800', 1024, 66);
  return tex(c);
}
function chevronTexture() {
  const [c, g] = canvas(512, 64);
  g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, 512, 64);
  g.fillStyle = '#111';
  for (let x = -64; x < 576; x += 64) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 32, 64); g.lineTo(x + 64, 0); g.lineTo(x + 32, 0); g.fill(); }
  const t = tex(c); t.wrapS = THREE.RepeatWrapping;
  return t;
}
function doorDecal() {
  const [c, g] = canvas(512, 256);
  g.clearRect(0, 0, 512, 256);
  drawLogo2D(g, 420, 110, 50);
  g.direction = 'rtl'; g.textAlign = 'right';
  g.fillStyle = '#ffffff'; g.font = '64px CairoBlack'; g.fillText('بحار الشرق', 320, 120);
  g.fillStyle = '#f6b01e'; g.font = '34px CairoBold'; g.fillText('للتسويق والإعلان', 320, 175);
  return tex(c);
}
const RAIL = railTexture(), CHEV = chevronTexture(), DOOR = doorDecal();

// screens: { side: LedScreen, rear: LedScreen }
export function makeTruck(screens) {
  const truck = new THREE.Group(); // forward = +z, ground at y = 0, origin between the axles
  const body = new THREE.Group();
  truck.add(body);
  const add = (geo, mat, x, y, z, parent = body) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const box = (w, h, d, mat, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);

  // ---- cab: side profile extruded across the width, bevelled for rounded edges
  const CW = 1.96;
  const prof = new THREE.Shape();
  prof.moveTo(1.55, 0.8);
  prof.lineTo(3.2, 0.8);
  prof.lineTo(3.24, 1.62);
  prof.lineTo(3.1, 2.46);
  prof.quadraticCurveTo(3.06, 2.66, 2.86, 2.67);
  prof.lineTo(1.6, 2.67);
  prof.quadraticCurveTo(1.55, 2.67, 1.55, 2.6);
  prof.lineTo(1.55, 0.8);
  const cabGeo = new THREE.ExtrudeGeometry(prof, { depth: CW - 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 4, curveSegments: 8 });
  cabGeo.rotateY(-Math.PI / 2);
  cabGeo.translate((CW - 0.12) / 2, 0, 0);
  add(cabGeo, paint, 0, 0, 0);
  // windshield on the sloped face
  const slope = Math.atan2(3.24 - 3.1, 2.46 - 1.62);
  const ws = add(new RoundedBoxGeometry(1.78, 0.8, 0.03, 2, 0.05), glass, 0, 2.05, 3.235);
  ws.rotation.x = -slope;
  // roof marker lights
  for (const x of [-0.6, -0.3, 0, 0.3, 0.6]) box(0.12, 0.04, 0.05, amber, x, 2.72, 2.95);
  // side windows + door seams + decal
  for (const s of [-1, 1]) {
    const win = new THREE.Shape();
    win.moveTo(2.15, 1.72); win.lineTo(3.05, 1.72); win.lineTo(2.96, 2.48); win.lineTo(2.15, 2.48); win.lineTo(2.15, 1.72);
    const wg = new THREE.ShapeGeometry(win); wg.rotateY(-Math.PI / 2);
    const w = new THREE.Mesh(wg, glass);
    w.position.x = s * (CW / 2 + 0.002);
    body.add(w);
    box(0.012, 1.5, 0.02, black, s * (CW / 2 + 0.003), 1.65, 2.1);
    box(0.012, 0.03, 0.18, black, s * (CW / 2 + 0.003), 1.6, 2.35); // handle
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.475), new THREE.MeshStandardMaterial({ map: DOOR, transparent: true, roughness: 0.3 }));
    decal.position.set(s * (CW / 2 + 0.004), 1.28, 2.6);
    decal.rotation.y = s * Math.PI / 2;
    body.add(decal);
    // mirror arm + mirror
    box(0.22, 0.03, 0.03, black, s * 1.08, 2.25, 3.0);
    add(new RoundedBoxGeometry(0.1, 0.42, 0.2, 2, 0.03), black, s * 1.2, 2.12, 3.02);
    // fender arch
    const arch = add(new THREE.TorusGeometry(0.5, 0.06, 6, 20, Math.PI), black, s * 0.9, 0.44, 2.35);
    arch.rotation.y = Math.PI / 2;
  }
  // grille band, lamps, bumper
  add(new RoundedBoxGeometry(1.7, 0.42, 0.06, 2, 0.03), black, 0, 1.3, 3.255);
  for (let i = 0; i < 3; i++) box(1.4, 0.025, 0.02, chrome, 0, 1.18 + i * 0.12, 3.29);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  for (const s of [-1, 1]) {
    add(new RoundedBoxGeometry(0.36, 0.2, 0.05, 2, 0.03), chrome, s * 0.74, 1.12, 3.25);
    add(new RoundedBoxGeometry(0.3, 0.15, 0.03, 2, 0.02), lampMat, s * 0.74, 1.12, 3.275);
    box(0.14, 0.07, 0.03, amber, s * 0.96, 1.3, 3.25);
  }
  add(new RoundedBoxGeometry(2.04, 0.3, 0.22, 2, 0.05), greyPlastic, 0, 0.78, 3.28);
  box(0.5, 0.12, 0.02, new THREE.MeshStandardMaterial({ color: 0xf5f5f5 }), 0, 0.76, 3.4);
  for (const s of [-1, 1]) box(0.45, 0.05, 0.25, black, s * 0.75, 0.55, 2.95); // steps

  // ---- chassis
  box(0.12, 0.22, 6.6, black, -0.45, 0.62, -0.25);
  box(0.12, 0.22, 6.6, black, 0.45, 0.62, -0.25);
  add(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 16), chrome, 0.75, 0.55, 0.6).rotation.x = Math.PI / 2; // fuel tank

  // ---- LED box
  const BW = 2.3, BH = 2.36, BL = 4.6, BY = 1.06 + BH / 2, BZ = -0.88;
  const E = 0.09;
  box(BW - 0.02, BH - 0.02, BL - 0.02, black, 0, BY, BZ);
  // aluminium edge profiles
  const edge = new THREE.MeshStandardMaterial({ color: 0x1b1d22, metalness: 0.8, roughness: 0.3 });
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) box(E, E, BL + E, edge, sx * BW / 2, BY + sy * BH / 2, BZ);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(E, BH + E, E, edge, sx * BW / 2, BY, BZ + sz * BL / 2);
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) box(BW + E, E, E, edge, 0, BY + sy * BH / 2, BZ + sz * BL / 2);
  const led = (t, w, h) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
  const L = led(screens.side.tex, BL - E, BH - E); L.position.set(-BW / 2 - 0.006, BY, BZ); L.rotation.y = -Math.PI / 2; body.add(L);
  const R = led(screens.side.tex, BL - E, BH - E); R.position.set(BW / 2 + 0.006, BY, BZ); R.rotation.y = Math.PI / 2; body.add(R);
  const B = led(screens.rear.tex, BW - E, BH - E); B.position.set(0, BY, BZ - BL / 2 - 0.006); B.rotation.y = Math.PI; body.add(B);
  // yellow rail with contact numbers + chevron guard
  const railMat = new THREE.MeshStandardMaterial({ map: RAIL, roughness: 0.45 });
  for (const s of [-1, 1]) {
    const r = add(new THREE.PlaneGeometry(BL, 0.16), railMat, s * (BW / 2 + 0.02), 0.97, BZ);
    r.rotation.y = s * Math.PI / 2;
    const cm = new THREE.MeshStandardMaterial({ map: CHEV.clone(), roughness: 0.5 });
    cm.map.needsUpdate = true; cm.map.repeat.set(5, 1);
    const ch = add(new THREE.PlaneGeometry(BL - 1.6, 0.14), cm, s * (BW / 2 - 0.05), 0.8, BZ + 0.3);
    ch.rotation.y = s * Math.PI / 2;
  }
  const rr = add(new THREE.PlaneGeometry(BW, 0.16), railMat, 0, 0.97, BZ - BL / 2 - 0.02); rr.rotation.y = Math.PI;
  const rbm = new THREE.MeshStandardMaterial({ map: CHEV.clone(), roughness: 0.5 }); rbm.map.needsUpdate = true; rbm.map.repeat.set(3, 1);
  add(new THREE.BoxGeometry(2.0, 0.16, 0.08), [black, black, black, black, black, rbm], 0, 0.6, BZ - BL / 2 - 0.1).rotation.y = Math.PI;
  for (const s of [-1, 1]) box(0.2, 0.1, 0.04, redLamp, s * 0.8, 0.82, BZ - BL / 2 - 0.08);
  for (const z of [-2.6, -1.6, -0.6, 0.4]) for (const s of [-1, 1]) box(0.03, 0.05, 0.08, amber, s * (BW / 2 + 0.03), 0.86, z);

  // ---- wheels
  const wheels = [];
  const tireGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.26, 32);
  const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.27, 16);
  const hubGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.29, 8);
  for (const [z, dual] of [[2.35, false], [-1.55, true]]) {
    for (const s of [-1, 1]) {
      const w = new THREE.Group();
      const offs = dual ? [-0.14, 0.14] : [0];
      for (const o of offs) {
        const tt = new THREE.Mesh(tireGeo, rubber); tt.rotation.z = Math.PI / 2; tt.position.x = o; tt.castShadow = true; w.add(tt);
        const rr2 = new THREE.Mesh(rimGeo, rim); rr2.rotation.z = Math.PI / 2; rr2.position.x = o; w.add(rr2);
      }
      const hb = new THREE.Mesh(hubGeo, chrome); hb.rotation.z = Math.PI / 2; w.add(hb);
      // spokes so the rotation reads
      for (let k = 0; k < 6; k++) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.04, 0.2), black);
        sp.rotation.x = k * Math.PI / 3; w.add(sp);
      }
      w.position.set(s * (dual ? 0.82 : 0.86), 0.42, z);
      truck.add(w); wheels.push(w);
    }
  }
  truck.userData = { wheels, body, lampMat, sideCenter: new THREE.Vector3(-BW / 2 - 0.05, BY, BZ) };
  truck.visible = false;
  return truck;
}

// lamp + headlight helpers
export function setHeadlights(truck, k) {
  truck.userData.lampMat.color.setScalar(k);
}
