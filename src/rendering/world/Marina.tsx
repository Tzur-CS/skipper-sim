import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { engine } from '../../store/runtime';
import { useHud } from '../../store/hudStore';
import { DEG, norm180 } from '../../simulation/math';
import { ENTRANCE_LIGHTS, SHORE_X, STRUCTURES, SWIM_ZONE, cityBlocks, mooredBoats } from '../../simulation/world/gordon';
import { inSector, lightScale, makeLightSprite, type LightSpec } from './navLights';

const ROCK = new THREE.MeshStandardMaterial({ color: '#8d8a84', roughness: 0.95 });
const WOOD = new THREE.MeshStandardMaterial({ color: '#9b7b56', roughness: 0.9 });

/** Gordon marina: breakwaters, pontoons with moored boats, beach, city skyline and entrance lights. */
export function Marina() {
  const worldKey = useHud((s) => s.worldKey);
  const tod = useHud((s) => s.timeOfDay);
  const night = tod !== 'day';
  const show = useMemo(() => {
    void worldKey;
    return { marina: !!engine.world?.def.marina, swim: !!engine.world?.def.swimZone };
  }, [worldKey]);

  const structures = useMemo(() => {
    const g = new THREE.Group();
    for (const s of STRUCTURES) {
      if (s.kind === 'shore') continue;
      const dx = s.b[0] - s.a[0];
      const dy = s.b[1] - s.a[1];
      const len = Math.hypot(dx, dy);
      const pontoon = s.kind === 'pontoon';
      const m = new THREE.Mesh(new THREE.BoxGeometry(pontoon ? 2.4 : s.w, pontoon ? 0.5 : 4, len + (pontoon ? 0 : s.w * 0.6)), pontoon ? WOOD : ROCK);
      m.position.set((s.a[0] + s.b[0]) / 2, pontoon ? 0.25 : 1.2, -(s.a[1] + s.b[1]) / 2);
      m.rotation.y = Math.atan2(dx, dy);
      g.add(m);
    }
    // Moored boats (instanced hulls + masts).
    const boats = mooredBoats();
    const hullGeo = new THREE.BoxGeometry(1, 1, 1);
    const hulls = new THREE.InstancedMesh(hullGeo, new THREE.MeshStandardMaterial({ color: '#f1f3f5', roughness: 0.5 }), boats.length);
    const masts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 5), new THREE.MeshStandardMaterial({ color: '#cfd4d9' }), boats.length);
    const m4 = new THREE.Matrix4();
    boats.forEach((b, i) => {
      // Moored bow-out from the pontoon: hull length north-south.
      m4.compose(new THREE.Vector3(b.x, 0.6, -b.y), new THREE.Quaternion(), new THREE.Vector3(2.9, 1.1, b.len * 0.33));
      hulls.setMatrixAt(i, m4);
      m4.compose(new THREE.Vector3(b.x, b.mast ? 7 : -5, -b.y), new THREE.Quaternion(), new THREE.Vector3(1, b.mast ? 13 : 0.01, 1));
      masts.setMatrixAt(i, m4);
    });
    g.add(hulls, masts);
    // Light towers on the breakwater heads.
    for (const l of ENTRANCE_LIGHTS) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 6, 10), new THREE.MeshStandardMaterial({ color: l.color === 'green' ? '#2f9e44' : '#e03131' }));
      tower.position.set(l.pos[0], 4.5, -l.pos[1]);
      g.add(tower);
    }
    return g;
  }, []);

  const entranceLights = useMemo(
    () =>
      ENTRANCE_LIGHTS.map((l) => {
        const sp = makeLightSprite(l.color);
        sp.position.set(l.pos[0], 8, -l.pos[1]);
        return { sp, period: l.period, pos: l.pos };
      }),
    [],
  );

  const land = useMemo(() => {
    const g = new THREE.Group();
    const beach = new THREE.Mesh(new THREE.PlaneGeometry(70, 6000), new THREE.MeshStandardMaterial({ color: '#e6d3a3', roughness: 1 }));
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(SHORE_X + 35, 0.25, 0);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 6000), new THREE.MeshStandardMaterial({ color: '#6d6a63', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(SHORE_X + 70 + 1500, 0.3, 0);
    g.add(beach, ground);
    const blocks = cityBlocks();
    const bm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#d9d4c7', roughness: 0.8 }), blocks.length);
    const m4 = new THREE.Matrix4();
    const windows: number[] = [];
    blocks.forEach((b, i) => {
      m4.compose(new THREE.Vector3(b.x, b.h / 2, -b.y), new THREE.Quaternion(), new THREE.Vector3(b.w, b.h, b.d));
      bm.setMatrixAt(i, m4);
      // lit windows on the sea-facing side
      const n = Math.floor(b.h / 4) * 4;
      for (let k = 0; k < n; k++) {
        const r = Math.abs(Math.sin((i + 1) * 91.3 + k * 17.1)) % 1;
        if (r < 0.45) continue;
        windows.push(b.x - b.w / 2 - 0.3, 2 + (k % Math.floor(b.h / 4)) * 3.6, -(b.y - b.d / 2 + ((k * 0.37) % 1) * b.d));
      }
    });
    g.add(bm);
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(windows, 3));
    const pts = new THREE.Points(wg, new THREE.PointsMaterial({ color: '#ffd98a', size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 }));
    pts.userData.night = true;
    g.add(pts);
    return { g, pts, bm };
  }, []);

  const swim = useMemo(() => {
    const g = new THREE.Group();
    const z = SWIM_ZONE;
    if (z.kind !== 'rect') return g;
    const geo = new THREE.SphereGeometry(0.45, 10, 8);
    const m = new THREE.MeshStandardMaterial({ color: '#ffd400' });
    for (let y = z.y0; y <= z.y1; y += 40) g.add(new THREE.Mesh(geo, m).translateX(z.x0).translateZ(-y));
    for (let x = z.x0; x < z.x1; x += 40) g.add(new THREE.Mesh(geo, m).translateX(x).translateZ(-z.y1));
    return g;
  }, []);

  useFrame(({ camera, clock }) => {
    const time = clock.getElapsedTime();
    land.pts.visible = night;
    (land.bm.material as THREE.MeshStandardMaterial).color.set(night ? '#2a2f3a' : '#d9d4c7');
    for (const l of entranceLights) {
      const lit = night && time % l.period < 1;
      l.sp.visible = lit;
      if (lit) l.sp.scale.setScalar(lightScale(camera.position.distanceTo(l.sp.position)) * 1.2);
    }
  });

  return (
    <group>
      <primitive object={land.g} />
      {show.marina && <primitive object={structures} />}
      {show.marina && entranceLights.map((l, i) => <primitive key={i} object={l.sp} />)}
      {show.swim && <primitive object={swim} />}
    </group>
  );
}

/** The own yacht's navigation lights: sidelights + sternlight; masthead (steaming) light when motoring. */
export function OwnLights() {
  const tod = useHud((s) => s.timeOfDay);
  const night = tod !== 'day';
  const specs = useMemo<LightSpec[]>(
    () => [
      { color: 'red', pos: [-0.75, 1.75, 5.7], sector: 'port' },
      { color: 'green', pos: [0.75, 1.75, 5.7], sector: 'stbd' },
      { color: 'white', pos: [0, 1.6, -6.0], sector: 'stern' },
      { color: 'white', pos: [0, 10.5, 1.45], sector: 'masthead' },
    ],
    [],
  );
  const sprites = useMemo(() => specs.map((s) => makeLightSprite(s.color)), [specs]);
  useFrame(({ camera }) => {
    const s = engine.state;
    const h = s.boat.heading * DEG;
    const motoring = s.motor.fitted && Math.abs(s.motor.target) > 0.01;
    const rel = norm180(Math.atan2(camera.position.x - s.boat.x, -camera.position.z - s.boat.y) / DEG - s.boat.heading);
    const onboard = Math.hypot(camera.position.x - s.boat.x, -camera.position.z - s.boat.y) < 8;
    specs.forEach((sp, i) => {
      const o = sprites[i];
      const [x, y, f] = sp.pos;
      o.position.set(s.boat.x + Math.sin(h) * f + Math.cos(h) * x, y, -(s.boat.y + Math.cos(h) * f - Math.sin(h) * x));
      const isMast = i === 3;
      // From the helm, the lights are seen from inside the boat: show the sidelights' glow only.
      const vis = night && (isMast ? motoring : true) && (onboard ? i < 2 : inSector(sp.sector, rel));
      o.visible = vis;
      if (vis) o.scale.setScalar(onboard ? 0.01 : lightScale(camera.position.distanceTo(o.position)));
    });
  });
  return (
    <group>
      {sprites.map((s, i) => (
        <primitive key={i} object={s} />
      ))}
    </group>
  );
}
