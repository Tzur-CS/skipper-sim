import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { engine } from '../../store/runtime';
import { DEG } from '../../simulation/math';
import { createSailGeometry, updateSail } from '../sails/sailGeometry';
import { buildDeck, buildHull } from './hullGeometry';
import { L } from './dimensions';
import { DynLine, staticLine } from './DynLine';

const WHITE = '#f3f5f7';
const SAIL = '#f7f4ea';

/** Procedural ~40 ft sloop driven entirely by the simulation state. */
export function Yacht({ yawRef, heelRef }: { yawRef: React.RefObject<THREE.Group | null>; heelRef: React.RefObject<THREE.Group | null> }) {
  const boomRef = useRef<THREE.Group>(null);
  const wheelRef = useRef<THREE.Group>(null);
  const windexRef = useRef<THREE.Group>(null);
  const furledRef = useRef<THREE.Mesh>(null);
  const mainRef = useRef<THREE.Mesh>(null);
  const jibRef = useRef<THREE.Mesh>(null);

  const hull = useMemo(buildHull, []);
  const deck = useMemo(buildDeck, []);
  const mainGeo = useMemo(createSailGeometry, []);
  const jibGeo = useMemo(createSailGeometry, []);

  const lines = useMemo(() => {
    const masthead: [number, number, number] = [0, L.mastTopY, L.mastZ];
    const hounds: [number, number, number] = [0, L.hounds, L.mastZ];
    const spreader = (s: number): [number, number, number] => [s * 1.05, 10.5, L.mastZ + 0.15];
    const chain = (s: number): [number, number, number] => [s * 1.78, 1.25, L.mastZ + 0.35];
    const group = new THREE.Group();
    const wire = '#8b949e';
    group.add(staticLine([L.tack as unknown as [number, number, number], hounds], wire)); // forestay
    group.add(staticLine([masthead, [0, 1.25, L.sternZ - 0.15]], wire)); // backstay
    for (const s of [-1, 1]) {
      group.add(staticLine([chain(s), spreader(s), masthead], wire)); // cap shroud
      group.add(staticLine([[s * 1.7, 1.25, L.mastZ - 0.4], [0.05 * s, 10.4, L.mastZ]], wire)); // lower shroud
      group.add(staticLine([[0, 10.5, L.mastZ + 0.1], spreader(s)], '#c0c6cc'));
      // lifelines
      group.add(staticLine([[s * 1.55, 1.95, -4.6], [s * 1.9, 1.85, 0], [s * 1.82, 1.75, 5.4]], '#b0b8c0'));
    }
    return group;
  }, []);

  const dyn = useMemo(
    () => ({
      mainsheet: new DynLine(8, '#1f6feb'),
      jibPort: new DynLine(16, '#d73a49'),
      jibStbd: new DynLine(16, '#2ea043'),
      halyard: new DynLine(4, '#e3b341'),
      furling: new DynLine(6, '#a371f7'),
    }),
    [],
  );

  const tmp = useMemo(() => ({ v: new THREE.Vector3(), clew: new THREE.Vector3(), head: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3() }), []);
  const forestay = useMemo(() => {
    const a = new THREE.Vector3(...L.tack);
    const b = new THREE.Vector3(0, L.hounds - 0.5, L.mastZ);
    return { a, b, dir: b.clone().sub(a), len: b.distanceTo(a) };
  }, []);
  const luffLen = L.mastTopY - 0.6 - L.goosenecY;

  useFrame(({ clock }) => {
    const s = engine.state;
    const time = clock.getElapsedTime();
    const yaw = yawRef.current;
    const heel = heelRef.current;
    if (!yaw || !heel) return;
    yaw.position.set(s.boat.x, 0, -s.boat.y);
    yaw.rotation.y = -s.boat.heading * DEG;
    heel.rotation.z = -s.boat.heel * DEG;
    heel.rotation.x = Math.sin(time * 0.9) * 0.012;
    heel.position.y = Math.sin(time * 1.1) * 0.05;

    if (boomRef.current) boomRef.current.rotation.y = s.main.boomAngle * DEG;
    if (wheelRef.current) wheelRef.current.rotation.z = -(s.boat.rudder / 32) * 4.4;
    if (windexRef.current) windexRef.current.rotation.y = -s.derived.awa * DEG;

    // Mainsail
    const mainVisible = s.main.hoist > 0.005;
    if (mainRef.current) mainRef.current.visible = mainVisible;
    if (mainVisible) {
      const hoist = s.main.hoist;
      updateSail(mainGeo, {
        luff: (v, out) => out.set(0, L.goosenecY + 0.12 + v * hoist * luffLen, L.mastZ + 0.12),
        chord: (v) => L.mainFoot * Math.pow(1 - v, 0.92) + 0.22,
        angle: s.main.boomAngle || 0.001,
        twist: 5 + 16 * (1 - s.main.sheet),
        camber: 0.085,
        bulge: s.main.backed ? -1 : 1,
        luff01: s.main.luff * Math.min(1, hoist * 2),
        time,
        phase: 0,
      });
    }
    // Jib
    const dep = s.jib.deployed;
    const jibVisible = dep > 0.01;
    if (jibRef.current) jibRef.current.visible = jibVisible;
    if (jibVisible) {
      const active = s.jib.angle < 0 ? s.jib.portSheet : s.jib.starboardSheet;
      updateSail(jibGeo, {
        luff: (v, out) => out.copy(forestay.a).addScaledVector(forestay.dir, 0.02 + v * 0.98),
        chord: (v) => (L.jibFoot * (1 - v) + 0.12) * dep,
        angle: s.jib.angle || 0.001,
        twist: 5 + 12 * (1 - active),
        camber: 0.1,
        bulge: s.jib.backed ? -1 : 1,
        luff01: s.jib.luff,
        chordSlope: -0.06,
        time,
        phase: 1.7,
      });
    }
    if (furledRef.current) {
      const r = 0.03 + 0.11 * (1 - dep);
      furledRef.current.scale.set(r / 0.1, 1, r / 0.1);
    }

    // Running rigging
    const th = s.main.boomAngle * DEG;
    const boomEnd = tmp.a.set(Math.sin(th) * (L.boomLength - 1.3), L.goosenecY - 0.05, L.mastZ + Math.cos(th) * (L.boomLength - 1.3));
    dyn.mainsheet.setPath([boomEnd, tmp.b.set(boomEnd.x * 0.3, L.traveller.y, L.traveller.z)], (1 - s.main.sheet) * 0.2);
    const jt = s.jib.angle * DEG;
    const jc = L.jibFoot * dep;
    tmp.clew.set(L.tack[0] + Math.sin(jt) * jc, L.tack[1] + 0.06 * jc, L.tack[2] + Math.cos(jt) * jc);
    for (const side of [-1, 1] as const) {
      const sheet = side < 0 ? s.jib.portSheet : s.jib.starboardSheet;
      const line = side < 0 ? dyn.jibPort : dyn.jibStbd;
      const car = tmp.v.set(side * L.jibCar.x, L.jibCar.y, L.jibCar.z);
      const winch = tmp.c.set(side * L.winch.x, L.winch.y + 0.25, L.winch.z);
      const onSide = Math.sign(s.jib.angle) === side;
      line.setPath([tmp.clew.clone(), car.clone(), winch.clone()], onSide ? (1 - sheet) * 0.35 : 0.9 * (1 - sheet) + 0.15);
      line.object.visible = dep > 0.02;
    }
    const headY = L.goosenecY + 0.12 + s.main.hoist * luffLen;
    dyn.halyard.setPath([tmp.a.set(0.12, L.mastBaseY, L.mastZ - 0.1), tmp.b.set(0.12, L.mastTopY, L.mastZ - 0.1), tmp.c.set(0.02, headY, L.mastZ + 0.1)]);
    dyn.furling.setPath([tmp.a.set(0, 1.5, -5.85), tmp.b.set(1.45, 1.55, -3.5), tmp.c.set(1.55, 1.45, 3.2)], 0.02);
  });

  return (
    <group ref={yawRef}>
      <group ref={heelRef}>
        <mesh geometry={hull}>
          <meshStandardMaterial vertexColors roughness={0.45} metalness={0.05} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={deck}>
          <meshStandardMaterial color="#d9cfb8" roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
        {/* Keel and rudder */}
        <mesh position={[0, -1.25, -0.6]}>
          <boxGeometry args={[0.18, 1.5, 1.3]} />
          <meshStandardMaterial color="#3b1c1f" />
        </mesh>
        <mesh position={[0, -0.75, 4.7]}>
          <boxGeometry args={[0.1, 1.1, 0.5]} />
          <meshStandardMaterial color="#3b1c1f" />
        </mesh>
        {/* Coachroof */}
        <mesh position={[0, 1.62, -0.8]}>
          <boxGeometry args={[2.4, 0.5, 4.8]} />
          <meshStandardMaterial color={WHITE} roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.66, -0.8]}>
          <boxGeometry args={[2.44, 0.14, 3.6]} />
          <meshStandardMaterial color="#1d2733" roughness={0.2} metalness={0.3} />
        </mesh>
        <mesh position={[0, 1.88, 1.45]} rotation={[0.5, 0, 0]}>
          <boxGeometry args={[1.2, 0.1, 0.6]} />
          <meshStandardMaterial color="#26323f" />
        </mesh>
        {/* Cockpit well */}
        <mesh position={[0, L.cockpit.floorY, (L.cockpit.zFwd + L.cockpit.zAft) / 2]}>
          <boxGeometry args={[L.cockpit.x * 2, 0.06, L.cockpit.zAft - L.cockpit.zFwd]} />
          <meshStandardMaterial color="#b9a888" roughness={0.9} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s}>
            {/* bench */}
            <mesh position={[s * 0.95, L.cockpit.floorY + 0.25, 3.0]}>
              <boxGeometry args={[0.5, 0.45, 2.6]} />
              <meshStandardMaterial color="#cdbf9f" roughness={0.9} />
            </mesh>
            {/* coaming */}
            <mesh position={[s * 1.22, 1.28, 3.3]}>
              <boxGeometry args={[0.06, 0.32, 3.4]} />
              <meshStandardMaterial color={WHITE} />
            </mesh>
            {/* inner wall */}
            <mesh position={[s * 1.2, 0.85, 3.7]}>
              <boxGeometry args={[0.04, 0.6, 4.0]} />
              <meshStandardMaterial color="#e8e8e2" side={THREE.DoubleSide} />
            </mesh>
            {/* primary winch */}
            <mesh position={[s * L.winch.x, L.winch.y + 0.12, L.winch.z]}>
              <cylinderGeometry args={[0.1, 0.13, 0.24, 14]} />
              <meshStandardMaterial color="#9aa4ad" metalness={0.8} roughness={0.3} />
            </mesh>
            {/* coachroof winch */}
            <mesh position={[s * 0.85, 1.95, 1.2]}>
              <cylinderGeometry args={[0.07, 0.09, 0.16, 12]} />
              <meshStandardMaterial color="#9aa4ad" metalness={0.8} roughness={0.3} />
            </mesh>
            {/* jib car */}
            <mesh position={[s * L.jibCar.x, L.jibCar.y, L.jibCar.z]}>
              <boxGeometry args={[0.08, 0.06, 0.16]} />
              <meshStandardMaterial color="#444c56" />
            </mesh>
          </group>
        ))}
        <mesh position={[0, L.cockpit.floorY + 0.3, 5.85]}>
          <boxGeometry args={[2.4, 0.04, 0.4]} />
          <meshStandardMaterial color="#cdbf9f" />
        </mesh>
        {/* Traveller bar */}
        <mesh position={[0, L.traveller.y, L.traveller.z]}>
          <boxGeometry args={[1.9, 0.05, 0.08]} />
          <meshStandardMaterial color="#6e7781" metalness={0.7} />
        </mesh>
        {/* Wheel pedestal + wheel */}
        <mesh position={[0, L.cockpit.floorY + 0.45, L.wheel.z - 0.15]}>
          <cylinderGeometry args={[0.07, 0.09, 0.9, 10]} />
          <meshStandardMaterial color="#c9d1d9" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, L.cockpit.floorY + 0.95, L.wheel.z - 0.17]} rotation={[0.25, 0, 0]}>
          <boxGeometry args={[0.24, 0.16, 0.12]} />
          <meshStandardMaterial color="#21262d" />
        </mesh>
        <group ref={wheelRef} position={[0, L.wheel.y, L.wheel.z]}>
          <mesh>
            <torusGeometry args={[L.wheel.r, 0.025, 8, 40]} />
            <meshStandardMaterial color="#c9d1d9" metalness={0.8} roughness={0.25} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh key={i} rotation={[0, 0, (i * Math.PI) / 3]}>
              <boxGeometry args={[0.02, L.wheel.r * 2, 0.02]} />
              <meshStandardMaterial color="#c9d1d9" metalness={0.8} roughness={0.25} />
            </mesh>
          ))}
          {/* king spoke marker (top when rudder centred) */}
          <mesh position={[0, L.wheel.r, 0]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#e3b341" />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.06, 0.06, 0.1, 10]} />
            <meshStandardMaterial color="#8b949e" />
          </mesh>
        </group>
        {/* Mast */}
        <mesh position={[0, (L.mastBaseY + L.mastTopY) / 2, L.mastZ]}>
          <cylinderGeometry args={[0.07, 0.1, L.mastTopY - L.mastBaseY, 10]} />
          <meshStandardMaterial color="#c4ccd4" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0, 10.5, L.mastZ + 0.1]}>
          <boxGeometry args={[2.1, 0.04, 0.08]} />
          <meshStandardMaterial color="#c4ccd4" />
        </mesh>
        {/* Windex */}
        <group ref={windexRef} position={[0, L.mastTopY + 0.15, L.mastZ]}>
          <mesh position={[0, 0, -0.25]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.05, 0.25, 6]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[0, 0, 0.15]}>
            <boxGeometry args={[0.01, 0.18, 0.3]} />
            <meshStandardMaterial color="#d73a49" />
          </mesh>
        </group>
        {/* Boom */}
        <group ref={boomRef} position={[0, L.goosenecY, L.mastZ + 0.1]}>
          <mesh position={[0, 0, L.boomLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, L.boomLength, 8]} />
            <meshStandardMaterial color="#aeb7c0" metalness={0.6} roughness={0.35} />
          </mesh>
        </group>
        {/* Furled jib / furler */}
        <mesh
          ref={furledRef}
          position={forestay.a.clone().addScaledVector(forestay.dir, 0.5)}
          quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), forestay.dir.clone().normalize())}
        >
          <cylinderGeometry args={[0.1, 0.1, forestay.len, 8]} />
          <meshStandardMaterial color="#e6e1d3" />
        </mesh>
        <mesh ref={mainRef} geometry={mainGeo}>
          <meshStandardMaterial color={SAIL} roughness={0.75} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={jibRef} geometry={jibGeo}>
          <meshStandardMaterial color={SAIL} roughness={0.75} side={THREE.DoubleSide} />
        </mesh>
        <primitive object={lines} />
        <primitive object={dyn.mainsheet.object} />
        <primitive object={dyn.jibPort.object} />
        <primitive object={dyn.jibStbd.object} />
        <primitive object={dyn.halyard.object} />
        <primitive object={dyn.furling.object} />
      </group>
    </group>
  );
}
