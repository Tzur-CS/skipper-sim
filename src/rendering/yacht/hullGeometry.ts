import * as THREE from 'three';
import { L, depthAt, halfBeamAt, sheerAt, zAt } from './dimensions';

const STATIONS = 28;
const SECTION = 10;

/** Lofted hull surface (both sides) with vertex colours: antifouling, boot stripe, topsides. */
export function buildHull(): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const topside = new THREE.Color('#f4f6f8');
  const stripe = new THREE.Color('#123a63');
  const bottom = new THREE.Color('#5a1f24');
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let i = 0; i <= STATIONS; i++) {
      const u = i / STATIONS;
      const z = zAt(u);
      const b = halfBeamAt(u);
      const sh = sheerAt(u);
      const d = depthAt(u);
      for (let k = 0; k <= SECTION; k++) {
        const a = (k / SECTION) * (Math.PI / 2);
        const x = side * b * Math.pow(Math.sin(a), 0.85);
        const y = sh - (sh + d) * Math.pow(Math.cos(a), 1.6);
        pos.push(x, y, z);
        const c = y < 0.02 ? bottom : y < 0.16 ? stripe : y > sh - 0.12 ? stripe : topside;
        col.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < STATIONS; i++) {
      for (let k = 0; k < SECTION; k++) {
        const a = base + i * (SECTION + 1) + k;
        const b2 = a + SECTION + 1;
        if (side < 0) idx.push(a, b2, a + 1, a + 1, b2, b2 + 1);
        else idx.push(a, a + 1, b2, a + 1, b2 + 1, b2);
      }
    }
  }
  // Transom
  const tb = pos.length / 3;
  const u = 1;
  const z = zAt(u);
  const b = halfBeamAt(u);
  const sh = sheerAt(u);
  const d = depthAt(u);
  pos.push(0, sh, z);
  col.push(topside.r, topside.g, topside.b);
  for (let k = 0; k <= SECTION * 2; k++) {
    const kk = k <= SECTION ? SECTION - k : k - SECTION;
    const side = k <= SECTION ? -1 : 1;
    const a = (kk / SECTION) * (Math.PI / 2);
    pos.push(side * b * Math.pow(Math.sin(a), 0.85), sh - (sh + d) * Math.pow(Math.cos(a), 1.6), z);
    col.push(topside.r, topside.g, topside.b);
  }
  for (let k = 0; k < SECTION * 2; k++) idx.push(tb, tb + 1 + k, tb + 2 + k);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Deck following the sheer, with an opening for the cockpit. */
export function buildDeck(): THREE.BufferGeometry {
  const COLS = 12;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= STATIONS; i++) {
    const u = i / STATIONS;
    const z = zAt(u);
    const b = halfBeamAt(u) * 0.985;
    const sh = sheerAt(u);
    for (let c = 0; c <= COLS; c++) {
      const f = (c / COLS) * 2 - 1;
      pos.push(f * b, sh + 0.06 * (1 - f * f), z);
    }
  }
  const cp = L.cockpit;
  for (let i = 0; i < STATIONS; i++) {
    for (let c = 0; c < COLS; c++) {
      const a = i * (COLS + 1) + c;
      const ax = pos[a * 3], az = pos[a * 3 + 2];
      const bx = pos[(a + COLS + 2) * 3], bz = pos[(a + COLS + 2) * 3 + 2];
      const cx = (ax + bx) / 2, cz = (az + bz) / 2;
      if (Math.abs(cx) < cp.x && cz > cp.zFwd && cz < cp.zAft) continue;
      const b2 = a + COLS + 1;
      idx.push(a, b2, a + 1, a + 1, b2, b2 + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
