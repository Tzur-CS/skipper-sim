import * as THREE from 'three';

/** A polyline whose points are rewritten every frame, with optional catenary-like sag. */
export class DynLine {
  readonly object: THREE.Line;
  private geom: THREE.BufferGeometry;
  private n: number;
  constructor(points: number, color: string, opacity = 1) {
    this.n = points;
    this.geom = new THREE.BufferGeometry();
    this.geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points * 3), 3));
    const mat = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
    this.object = new THREE.Line(this.geom, mat);
    this.object.frustumCulled = false;
  }
  /** Set a path through `pts`, inserting sag on each segment. */
  setPath(pts: THREE.Vector3[], sag = 0): void {
    const pos = this.geom.getAttribute('position') as THREE.BufferAttribute;
    const segs = pts.length - 1;
    for (let i = 0; i < this.n; i++) {
      const f = (i / (this.n - 1)) * segs;
      const s = Math.min(segs - 1, Math.floor(f));
      const t = f - s;
      const a = pts[s];
      const b = pts[s + 1];
      const drop = sag * 4 * t * (1 - t) * (s === 0 ? 1 : 0.4);
      pos.setXYZ(i, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - drop, a.z + (b.z - a.z) * t);
    }
    pos.needsUpdate = true;
  }
}

export function staticLine(points: Array<[number, number, number]>, color: string): THREE.Line {
  const g = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.Line(g, new THREE.LineBasicMaterial({ color }));
}
