import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { engine } from '../../store/runtime';
import { useHud } from '../../store/hudStore';
import { DEG, norm180, sign } from '../../simulation/math';
import { trueWindAngle } from '../../simulation/wind/wind';
import type { VesselDef, VesselKind } from '../../simulation/world/types';
import { inSector, lightScale, lightsFor, makeLightSprite, type LightSpec } from './navLights';

interface Built {
  id: string;
  kind: VesselKind;
  group: THREE.Group;
  /** Rotates to leeward (sails). */
  rigs: THREE.Object3D[];
  kite?: { kite: THREE.Object3D; lines: THREE.Line };
  lights: Array<{ spec: LightSpec; sprite: THREE.Sprite }>;
}

const mat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });

function box(w: number, h: number, l: number, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const g = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), m);
  g.position.set(x, y, z);
  return g;
}

/** Hull with a pointed bow (towards -z). */
function hull(len: number, beam: number, height: number, m: THREE.Material): THREE.Mesh {
  const s = new THREE.Shape();
  s.moveTo(0, -len / 2);
  s.quadraticCurveTo(beam / 2, -len / 4, beam / 2, len / 4);
  s.lineTo(beam * 0.42, len / 2);
  s.lineTo(-beam * 0.42, len / 2);
  s.lineTo(-beam / 2, len / 4);
  s.quadraticCurveTo(-beam / 2, -len / 4, 0, -len / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: height, bevelEnabled: false });
  g.rotateX(Math.PI / 2);
  g.translate(0, height, 0);
  return new THREE.Mesh(g, m);
}

/** Triangular sail in the x=0 plane: luff up the mast from `y0`, foot aft along +z. */
function sail(height: number, foot: number, color: string, y0 = 0.5): THREE.Mesh {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, y0, 0, 0, y0 + height, 0, 0, y0, foot], 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.8 }));
}

function mast(h: number, y0 = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, h, 6), mat('#c8ccd0'));
  m.position.y = y0 + h / 2;
  return m;
}

const SAIL_COLORS = ['#ff6b35', '#f7d02c', '#2ec4b6', '#e71d36', '#8338ec', '#3a86ff'];

function buildVessel(def: VesselDef, idx: number): Built {
  const group = new THREE.Group();
  const rigs: THREE.Object3D[] = [];
  let kite: Built['kite'];
  const accent = SAIL_COLORS[idx % SAIL_COLORS.length];
  switch (def.kind) {
    case 'optimist': {
      group.add(box(1.15, 0.4, 2.3, mat('#f4f4f4'), 0, 0.2, 0));
      const rig = new THREE.Group();
      rig.add(sail(2.6, 1.9, '#ffffff', 0.55));
      rig.position.z = -0.7;
      group.add(rig, mast(3, 0.3).translateZ(-0.7));
      // child sailor
      group.add(box(0.35, 0.55, 0.3, mat(accent), 0.25, 0.6, 0.6));
      rigs.push(rig);
      break;
    }
    case 'windsurfer': {
      group.add(box(0.65, 0.12, 2.6, mat('#fafafa'), 0, 0.06, 0));
      const rig = new THREE.Group();
      rig.add(sail(4.3, 2.3, accent, 0.4), mast(4.6, 0.1));
      rig.position.z = -0.3;
      group.add(rig);
      group.add(box(0.35, 1.6, 0.3, mat('#1d3557'), 0.55, 0.9, 0.4));
      rigs.push(rig);
      break;
    }
    case 'kitesurfer': {
      group.add(box(0.45, 0.08, 1.4, mat('#fafafa'), 0, 0.05, 0));
      group.add(box(0.35, 1.6, 0.3, mat('#14213d'), 0, 0.9, 0));
      const k = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.35, 6, 16, Math.PI), mat(accent, { side: THREE.DoubleSide }));
      const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const lines = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: '#444', transparent: true, opacity: 0.6 }));
      kite = { kite: k, lines };
      break;
    }
    case 'sailingYacht': {
      group.add(hull(11, 3.6, 1.4, mat('#f3f5f7')));
      group.add(box(2, 0.6, 3.5, mat('#e0e4e8'), 0, 1.7, -0.5));
      group.add(mast(15, 1.4));
      const main = new THREE.Group();
      main.add(sail(13, 4.2, '#f7f4ea', 2.2));
      group.add(main);
      const jib = new THREE.Group();
      jib.add(sail(12, 4.2, '#f7f4ea', 1.6));
      jib.position.z = -4.6;
      group.add(jib);
      rigs.push(main, jib);
      break;
    }
    case 'motorYacht': {
      group.add(hull(13, 4.2, 1.9, mat('#f7f7f7')));
      group.add(box(3.2, 1.3, 6, mat('#ededed'), 0, 2.5, 0.8));
      group.add(box(3.25, 0.5, 4.5, mat('#1b263b'), 0, 2.7, 0.3));
      group.add(box(2.4, 0.9, 3, mat('#ededed'), 0, 3.6, 1.2));
      group.add(mast(1.6, 4.1).translateZ(1.2));
      break;
    }
    case 'fishing': {
      group.add(hull(10, 3.6, 1.8, mat('#2b5f8a')));
      group.add(box(2.4, 1.8, 2.6, mat('#e9e2d0'), 0, 2.6, 1.2));
      group.add(mast(5.5, 1.8).translateZ(-1.5));
      group.add(box(0.12, 0.12, 6, mat('#888'), 0, 3, 3)); // boom / gallows
      // Day shape: two black cones, points together (vessel engaged in fishing).
      const coneG = new THREE.ConeGeometry(0.45, 0.8, 10);
      const top = new THREE.Mesh(coneG, mat('#111'));
      top.position.set(0, 5.6, 1.5);
      top.rotation.x = Math.PI;
      const bot = new THREE.Mesh(coneG, mat('#111'));
      bot.position.set(0, 4.8, 1.5);
      top.position.z = -1.5;
      bot.position.z = -1.5;
      top.userData.dayShape = bot.userData.dayShape = true;
      group.add(top, bot);
      break;
    }
    case 'police': {
      group.add(hull(9, 3.2, 1.4, mat('#f2f2f2')));
      group.add(box(3.25, 0.35, 8, mat('#1d4ed8'), 0, 1.15, 0.4));
      group.add(box(2.2, 1.4, 2.8, mat('#e5e7eb'), 0, 2.1, 0.4));
      group.add(box(1.6, 0.25, 0.5, mat('#1e3a8a', { emissive: '#1e40af', emissiveIntensity: 0.3 }), 0, 3.0, 0.2));
      break;
    }
  }
  const lights = lightsFor(def.kind, def).map((spec) => {
    const sprite = makeLightSprite(spec.color);
    sprite.position.set(spec.pos[0], spec.pos[1], -spec.pos[2]);
    group.add(sprite);
    return { spec, sprite };
  });
  return { id: def.id, kind: def.kind, group, rigs, kite, lights };
}

/** Other vessels in the world, with sails set to leeward and sector-correct navigation lights. */
export function Traffic() {
  const worldKey = useHud((s) => s.worldKey);
  const night = useHud((s) => s.timeOfDay !== 'day');
  const built = useMemo(() => {
    void worldKey;
    const w = engine.world;
    if (!w) return [] as Built[];
    return w.def.vessels.map((d, i) => buildVessel(d, i));
  }, [worldKey]);
  const root = useMemo(() => {
    const g = new THREE.Group();
    for (const b of built) {
      g.add(b.group);
      if (b.kite) g.add(b.kite.kite, b.kite.lines);
    }
    return g;
  }, [built]);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, clock }) => {
    const s = engine.state;
    const time = clock.getElapsedTime();
    for (const b of built) {
      const v = s.vessels.find((x) => x.id === b.id);
      if (!v) continue;
      const g = b.group;
      const small = b.kind === 'optimist' || b.kind === 'windsurfer' || b.kind === 'kitesurfer';
      g.position.set(v.x, Math.sin(time * 1.2 + v.x * 0.01) * (small ? 0.08 : 0.12), -v.y);
      g.rotation.y = -v.heading * DEG;
      const twa = trueWindAngle(s.wind.trueFrom, v.heading);
      const boom = -sign(twa) * Math.max(8, Math.min(80, (Math.abs(twa) - 25) * 0.55));
      for (const r of b.rigs) r.rotation.y = boom * DEG;
      if (b.kind === 'windsurfer') g.rotation.z = sign(twa) * 0.12;
      if (b.kite) {
        // Kite flies downwind of the rider, up and to the side.
        const down = (s.wind.trueFrom + 180) * DEG;
        const sideA = (s.wind.trueFrom + 180 + sign(twa) * 35) * DEG;
        const kx = v.x + Math.sin(sideA) * 20;
        const ky = v.y + Math.cos(sideA) * 20;
        b.kite.kite.position.set(kx, 15 + Math.sin(time * 0.7) * 1.5, -ky);
        b.kite.kite.rotation.set(0, -down + Math.PI / 2, 0);
        const p = b.kite.lines.geometry.getAttribute('position') as THREE.BufferAttribute;
        p.setXYZ(0, v.x, 1.4, -v.y);
        p.setXYZ(1, kx, 13.5, -ky);
        p.needsUpdate = true;
      }
      for (const c of g.children) if (c.userData.dayShape) c.visible = !night;
      // Lights: visible inside their sector as seen from the camera.
      const rel = norm180(Math.atan2(camera.position.x - v.x, -camera.position.z - v.y) / DEG - v.heading);
      const dist = tmp.set(v.x, 2, -v.y).distanceTo(camera.position);
      for (const { spec, sprite } of b.lights) {
        const lit = (night || !!spec.day) && inSector(spec.sector, rel) && (!spec.flash || time % spec.flash < spec.flash * 0.45);
        sprite.visible = lit;
        if (lit) {
          sprite.scale.setScalar(lightScale(dist) * (spec.color === 'blue' ? 1.3 : 1));
          // Far lights stay visible through the own boat's sails (a lookout looks under/around them).
          sprite.material.depthTest = dist < 40;
        }
      }
    }
  });
  return <primitive object={root} />;
}
