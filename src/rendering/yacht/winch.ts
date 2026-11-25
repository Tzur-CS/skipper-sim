import * as THREE from 'three';

/** Procedural self-tailing sheet winch with the sheet wrapped on the drum and a tail led into the cockpit. */
export interface WinchModel {
  group: THREE.Group;
  /** Rotating part (drum, self-tailer and the wraps of rope). */
  drum: THREE.Group;
  /** Full wraps (loaded sheet) and a single loose wrap (lazy sheet). */
  wrapsLoaded: THREE.Mesh;
  wrapsLazy: THREE.Mesh;
  tail: THREE.Mesh;
}

export const WINCH = { drumR: 0.1, wrapY0: 0.05, wrapY1: 0.17, height: 0.3 };

const CHROME = new THREE.MeshStandardMaterial({ color: '#c3cbd3', metalness: 0.9, roughness: 0.22 });
const DARK = new THREE.MeshStandardMaterial({ color: '#2b3138', metalness: 0.4, roughness: 0.5 });

function helix(turns: number, y0: number, y1: number, r: number): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [];
  const n = Math.ceil(turns * 16);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = -t * turns * Math.PI * 2; // clockwise seen from above, like a real winch
    pts.push(new THREE.Vector3(Math.cos(a) * r, y0 + (y1 - y0) * t, Math.sin(a) * r));
  }
  return new THREE.CatmullRomCurve3(pts);
}

/**
 * @param color rope colour (matches the line and its control buttons)
 * @param tailTo where the tail ends, in the winch's local frame (e.g. down into the cockpit)
 */
export function createWinch(color: string, tailTo: THREE.Vector3): WinchModel {
  const rope = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.035, 20), DARK);
  base.position.y = 0.0175;
  group.add(base);

  const drum = new THREE.Group();
  group.add(drum);
  // Drum with a waisted profile.
  const prof = [
    new THREE.Vector2(0.001, 0.035),
    new THREE.Vector2(0.118, 0.035),
    new THREE.Vector2(0.1, 0.07),
    new THREE.Vector2(0.094, 0.12),
    new THREE.Vector2(0.1, 0.18),
    new THREE.Vector2(0.112, 0.2),
    new THREE.Vector2(0.001, 0.2),
  ];
  drum.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 24), CHROME));
  // Self-tailing jaws (dark ring) with stripper arm.
  const tailer = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.12, 0.06, 24), DARK);
  tailer.position.y = 0.23;
  drum.add(tailer);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.035, 20), CHROME);
  cap.position.y = 0.275;
  drum.add(cap);
  const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.01, 8), DARK);
  socket.position.y = 0.295;
  drum.add(socket);
  // Ribs on the drum make the rotation visible.
  for (let i = 0; i < 6; i++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.1, 0.006), DARK);
    const a = (i / 6) * Math.PI * 2;
    rib.position.set(Math.cos(a) * 0.098, 0.125, Math.sin(a) * 0.098);
    rib.rotation.y = -a;
    drum.add(rib);
  }

  const R = WINCH.drumR + 0.008;
  const wrapsLoaded = new THREE.Mesh(new THREE.TubeGeometry(helix(3, WINCH.wrapY0, WINCH.wrapY1, R), 96, 0.009, 6), rope);
  const wrapsLazy = new THREE.Mesh(new THREE.TubeGeometry(helix(1, WINCH.wrapY0, 0.09, R + 0.004), 40, 0.009, 6), rope);
  drum.add(wrapsLoaded, wrapsLazy);

  // Tail: from the self-tailer jaws over the top, down into the cockpit (static, does not rotate).
  const start = new THREE.Vector3(0.11, 0.24, 0);
  const tailCurve = new THREE.CatmullRomCurve3([
    start,
    new THREE.Vector3(0.2, 0.26, 0.02),
    new THREE.Vector3((0.2 + tailTo.x) / 2, (0.26 + tailTo.y) / 2 + 0.08, (0.02 + tailTo.z) / 2),
    tailTo.clone(),
  ]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 32, 0.009, 6), rope);
  group.add(tail);
  return { group, drum, wrapsLoaded, wrapsLazy, tail };
}

/**
 * Point where an incoming line touches the drum: on the side facing `from`, at the bottom wrap height.
 * Both points are in the yacht frame; `pos` is the winch base.
 */
export function drumEntry(pos: THREE.Vector3, from: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  const dx = from.x - pos.x;
  const dz = from.z - pos.z;
  // Rope leaves tangent to the drum; approximate with the side facing the lead, rotated toward the wrap direction.
  const a = Math.atan2(dz, dx) + 0.6;
  return out.set(pos.x + Math.cos(a) * (WINCH.drumR + 0.008), pos.y + WINCH.wrapY0, pos.z + Math.sin(a) * (WINCH.drumR + 0.008));
}
