// Sample client products that burst out of the truck's LED screen: "whatever you sell, we make it
// come out of the screen". Generic labels only (no third-party brands).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvas } from './common.js';
import { drawLogo2D } from './brand.js';

function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

function canLabel(c1, c2, word) {
  const [c, g] = canvas(1024, 512);
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, c1); grd.addColorStop(1, c2);
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(80 + i * 85, 420 - (i % 3) * 30, 18 + (i % 4) * 8, 0, 7); g.fill(); }
  g.direction = 'rtl'; g.textAlign = 'center'; g.fillStyle = '#fff';
  g.font = '150px CairoBlack'; g.fillText(word, 256, 300);
  g.fillText(word, 768, 300);
  g.fillRect(0, 40, 1024, 10); g.fillRect(0, 462, 1024, 10);
  return tex(c);
}
function cartonLabel() {
  const [c, g] = canvas(512, 512);
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, '#e8f1ff');
  g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
  g.fillStyle = '#2fa84f'; g.beginPath(); g.ellipse(256, 330, 150, 110, 0, 0, 7); g.fill();
  g.fillStyle = '#ffb11a'; g.beginPath(); g.arc(256, 320, 70, 0, 7); g.fill();
  g.direction = 'rtl'; g.textAlign = 'center';
  g.fillStyle = '#0b2466'; g.font = '96px CairoBlack'; g.fillText('منتجك', 256, 150);
  return tex(c);
}
function phoneScreen() {
  const [c, g] = canvas(256, 512);
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#0a1f5c'); grd.addColorStop(1, '#1d56e0');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 512);
  drawLogo2D(g, 128, 200, 52);
  g.direction = 'rtl'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = '40px CairoBlack'; g.fillText('بحار الشرق', 128, 380);
  return tex(c);
}

const LABELS = [canLabel('#ff3b3b', '#a30d1d', 'منعش'), canLabel('#22c1ff', '#0b5fd6', 'طاقة'), canLabel('#ffcc33', '#ff7a00', 'عصير')];
const CARTON = cartonLabel();
const PHONE = phoneScreen();
const metal = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: 1, roughness: 0.2 });

export function makeCan(i) {
  const g = new THREE.Group();
  const side = new THREE.MeshPhysicalMaterial({ map: LABELS[i % 3], metalness: 0.6, roughness: 0.25, clearcoat: 1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 1.1, 40, 1, true), side);
  g.add(body);
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(s > 0 ? 0.28 : 0.3, 0.33, 0.1, 40), metal);
    cap.position.y = s * 0.6; if (s < 0) cap.rotation.x = Math.PI; g.add(cap);
  }
  const tab = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 6, 16), metal);
  tab.rotation.x = Math.PI / 2; tab.position.set(0.08, 0.66, 0); g.add(tab);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
export function makeCarton() {
  const g = new THREE.Group();
  const lab = new THREE.MeshStandardMaterial({ map: CARTON, roughness: 0.4 });
  const plain = new THREE.MeshStandardMaterial({ color: 0xf2f5fb, roughness: 0.5 });
  const b = new THREE.Mesh(new RoundedBoxGeometry(0.7, 1.2, 0.7, 2, 0.04), [plain, plain, plain, plain, lab, lab]);
  g.add(b);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.5, 0.35, 4, 1), plain);
  roof.rotation.y = Math.PI / 4; roof.position.y = 0.77; g.add(roof);
  const capm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 20), new THREE.MeshStandardMaterial({ color: 0x2fa84f, roughness: 0.4 }));
  capm.position.set(0.15, 0.82, 0.12); g.add(capm);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
export function makePhone() {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new RoundedBoxGeometry(0.75, 1.5, 0.09, 4, 0.08), new THREE.MeshStandardMaterial({ color: 0x1b1e24, metalness: 0.9, roughness: 0.25 }));
  g.add(frame);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 1.38), new THREE.MeshBasicMaterial({ map: PHONE, toneMapped: false }));
  scr.position.z = 0.047; g.add(scr);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}
