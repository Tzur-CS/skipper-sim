import * as THREE from 'three';

export const SAIL_U = 10; // chordwise segments
export const SAIL_V = 14; // spanwise segments

export function createSailGeometry(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  const n = (SAIL_U + 1) * (SAIL_V + 1);
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  const idx: number[] = [];
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let v = 0; v <= SAIL_V; v++)
    for (let u = 0; u <= SAIL_U; u++) uv.setXY(v * (SAIL_U + 1) + u, u / SAIL_U, v / SAIL_V);
  for (let v = 0; v < SAIL_V; v++) {
    for (let u = 0; u < SAIL_U; u++) {
      const a = v * (SAIL_U + 1) + u;
      const b = a + SAIL_U + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  g.setIndex(idx);
  return g;
}

export interface SailShapeParams {
  /** Luff point at span fraction v (local coords). */
  luff: (v: number, out: THREE.Vector3) => THREE.Vector3;
  /** Chord length at span fraction v (m). */
  chord: (v: number) => number;
  /** Chord angle at the foot (deg, + = starboard, measured from aft). */
  angle: number;
  /** Additional twist at the head (deg, opening to the sail's side). */
  twist: number;
  /** Max camber depth as a fraction of chord. */
  camber: number;
  /** +1 bulges outboard (filled), -1 inboard (aback). */
  bulge: number;
  /** 0..1 luffing amount. */
  luff01: number;
  /** Vertical drop of the chord along its length (m per m), e.g. jib foot rising aft. */
  chordSlope?: number;
  time: number;
  /** Per-sail phase for flutter. */
  phase: number;
}

const P = new THREE.Vector3();

/** Procedural sail surface: chord lines from the luff, rotated by trim + twist, cambered, with luff flutter. */
export function updateSail(g: THREE.BufferGeometry, p: SailShapeParams): void {
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const side = p.angle >= 0 ? 1 : -1;
  for (let v = 0; v <= SAIL_V; v++) {
    const fv = v / SAIL_V;
    p.luff(fv, P);
    const c = p.chord(fv);
    const th = ((p.angle + side * p.twist * fv) * Math.PI) / 180;
    const dx = Math.sin(th);
    const dz = Math.cos(th);
    // Horizontal normal toward the sail's outboard side.
    const nx = Math.cos(th) * side;
    const nz = -Math.sin(th) * side;
    for (let u = 0; u <= SAIL_U; u++) {
      const fu = u / SAIL_U;
      // Draft forward of mid-chord.
      const shape = Math.pow(fu, 0.8) * (1 - fu) * 2.6;
      let off = p.bulge * p.camber * (1 - 0.8 * p.luff01) * c * shape;
      if (p.luff01 > 0.01) {
        const w = Math.sin(fu * 7 - p.time * 11 + fv * 4 + p.phase) * Math.sin(fu * Math.PI);
        off += p.luff01 * 0.06 * c * w;
      }
      const along = fu * c;
      pos.setXYZ(
        v * (SAIL_U + 1) + u,
        P.x + dx * along + nx * off,
        P.y - (p.chordSlope ?? 0) * along,
        P.z + dz * along + nz * off,
      );
    }
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  g.computeBoundingSphere();
}
