import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

/**
 * A thick (screen-space width) polyline whose points are rewritten every frame, with optional
 * catenary-like sag. Uses fat lines so ropes stay readable on phone screens.
 */
export class DynLine {
  readonly object: LineSegments2;
  private geom: LineSegmentsGeometry;
  private buf: Float32Array;
  private n: number;
  private p = new THREE.Vector3();
  private q = new THREE.Vector3();
  constructor(points: number, color: string, width = 3) {
    this.n = points;
    this.buf = new Float32Array((points - 1) * 6);
    this.geom = new LineSegmentsGeometry();
    this.geom.setPositions(this.buf);
    const mat = new LineMaterial({ color: new THREE.Color(color).getHex(), linewidth: width, worldUnits: false });
    this.object = new LineSegments2(this.geom, mat);
    this.object.frustumCulled = false;
  }
  private at(pts: THREE.Vector3[], sag: number, i: number, out: THREE.Vector3): THREE.Vector3 {
    const segs = pts.length - 1;
    const f = (i / (this.n - 1)) * segs;
    const s = Math.min(segs - 1, Math.floor(f));
    const t = f - s;
    const a = pts[s];
    const b = pts[s + 1];
    const drop = sag * 4 * t * (1 - t) * (s === 0 ? 1 : 0.4);
    return out.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - drop, a.z + (b.z - a.z) * t);
  }
  /** Set a path through `pts`, inserting sag on each segment (the first segment sags most). */
  setPath(pts: THREE.Vector3[], sag = 0): void {
    this.at(pts, sag, 0, this.p);
    for (let i = 1; i < this.n; i++) {
      this.at(pts, sag, i, this.q);
      const o = (i - 1) * 6;
      this.buf[o] = this.p.x;
      this.buf[o + 1] = this.p.y;
      this.buf[o + 2] = this.p.z;
      this.buf[o + 3] = this.q.x;
      this.buf[o + 4] = this.q.y;
      this.buf[o + 5] = this.q.z;
      this.p.copy(this.q);
    }
    (this.geom.attributes.instanceStart as THREE.InterleavedBufferAttribute).data.needsUpdate = true;
  }
}

export function staticLine(points: Array<[number, number, number]>, color: string): THREE.Line {
  const g = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.Line(g, new THREE.LineBasicMaterial({ color }));
}
