import { Sky } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { engine } from '../../store/runtime';
import { useApp } from '../../store/appStore';
import { useHud } from '../../store/hudStore';
import { SIM } from '../../simulation/config';
import { HORIZON, SUN_DIR } from '../ocean/Ocean';

export const NIGHT_SKY = new THREE.Color('#03070f');
const MOON_DIR = new THREE.Vector3(0.5, 0.45, 0.6).normalize();

export function Lights() {
  const night = useHud((s) => s.timeOfDay) === 'night';
  if (night)
    return (
      <>
        <hemisphereLight args={['#5a6f99', '#05080d', 0.22]} />
        <directionalLight position={MOON_DIR.clone().multiplyScalar(100)} intensity={0.25} color="#b8c8ff" />
        <ambientLight intensity={0.06} />
      </>
    );
  return (
    <>
      <hemisphereLight args={['#dbe9f6', '#2a4a63', 0.9]} />
      <directionalLight position={SUN_DIR.clone().multiplyScalar(100)} intensity={2.1} color="#fff4e0" />
      <ambientLight intensity={0.15} />
    </>
  );
}

/** Star field and a moon for night scenarios. */
function NightSky() {
  const stars = useMemo(() => {
    const p: number[] = [];
    for (let i = 0; i < 900; i++) {
      const a = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      const b = Math.abs(Math.sin(i * 78.233) * 24634.6345) % 1;
      const th = a * Math.PI * 2;
      const el = Math.asin(0.04 + b * 0.96);
      p.push(Math.cos(el) * Math.sin(th) * 3000, Math.sin(el) * 3000, Math.cos(el) * Math.cos(th) * 3000);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    return g;
  }, []);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera }) => ref.current?.position.copy(camera.position));
  return (
    <group ref={ref}>
      <points geometry={stars}>
        <pointsMaterial color="#dfe8ff" size={1.6} sizeAttenuation={false} fog={false} transparent opacity={0.8} />
      </points>
      <mesh position={MOON_DIR.clone().multiplyScalar(2800)}>
        <sphereGeometry args={[40, 16, 12]} />
        <meshBasicMaterial color="#e9ecf5" fog={false} />
      </mesh>
    </group>
  );
}

export function SkyDome() {
  const tod = useHud((s) => s.timeOfDay);
  if (tod === 'night')
    return (
      <>
        <color attach="background" args={[NIGHT_SKY]} />
        <fog attach="fog" args={[NIGHT_SKY, 600, 7000]} />
        <NightSky />
      </>
    );
  return (
    <>
      <color attach="background" args={[HORIZON]} />
      <fog attach="fog" args={[HORIZON, 250, 2200]} />
      <Sky distance={4500} sunPosition={SUN_DIR.clone().multiplyScalar(100).toArray()} turbidity={4} rayleigh={0.6} mieCoefficient={0.004} mieDirectionalG={0.85} />
    </>
  );
}

const BUOY_SPACING = 220;

/** Tiled navigation buoys around the boat: visual reference for speed and heading. */
export function Buoys() {
  const group = useRef<THREE.Group>(null);
  const offsets = useMemo(() => {
    const o: Array<[number, number, string]> = [];
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) o.push([i, j, (i + j) % 2 === 0 ? '#e3b341' : '#d73a49']);
    return o;
  }, []);
  useFrame(({ clock }) => {
    const s = engine.state;
    const g = group.current;
    if (!g) return;
    const cx = Math.round(s.boat.x / BUOY_SPACING) * BUOY_SPACING;
    const cz = Math.round(-s.boat.y / BUOY_SPACING) * BUOY_SPACING;
    g.children.forEach((c, k) => {
      const [i, j] = offsets[k];
      // deterministic jitter
      const jx = Math.sin((cx / BUOY_SPACING + i) * 12.9898 + (cz / BUOY_SPACING + j) * 78.233) * 60;
      const jz = Math.cos((cx / BUOY_SPACING + i) * 39.346 + (cz / BUOY_SPACING + j) * 11.135) * 60;
      c.position.set(cx + i * BUOY_SPACING + jx, Math.sin(clock.getElapsedTime() * 1.3 + k) * 0.15, cz + j * BUOY_SPACING + jz);
    });
  });
  return (
    <group ref={group}>
      {offsets.map(([i, j, color]) => (
        <group key={`${i},${j}`}>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.35, 0.6, 1.4, 10]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          <mesh position={[0, 1.6, 0]}>
            <coneGeometry args={[0.3, 0.6, 8]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const STREAKS = 36;
const BOX = 90;

/** Faint wind streaks moving with the true wind (shows wind direction and strength). */
export function WindStreaks() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => Array.from({ length: STREAKS }, (_, i) => [Math.sin(i * 91.7) * 0.5 + 0.5, Math.sin(i * 37.3) * 0.5 + 0.5, 2 + (Math.sin(i * 13.1) * 0.5 + 0.5) * 10]), []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const sc = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  useFrame(({ clock }) => {
    const s = engine.state;
    const mesh = ref.current;
    if (!mesh) return;
    const toward = ((s.wind.trueFrom + 180) * Math.PI) / 180;
    const dx = Math.sin(toward);
    const dz = -Math.cos(toward);
    const speed = s.wind.trueSpeed * 0.514;
    const t = clock.getElapsedTime();
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -toward);
    const len = 1.5 + s.wind.trueSpeed * 0.18;
    sc.set(1, 1, len);
    for (let i = 0; i < STREAKS; i++) {
      const [a, b, h] = seeds[i];
      const along = ((a * BOX + t * speed) % BOX) - BOX / 2;
      const across = b * BOX - BOX / 2;
      p.set(s.boat.x + dx * along - dz * across, h, -s.boat.y + dz * along + dx * across);
      m.compose(p, q, sc);
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, STREAKS]} frustumCulled={false}>
      <boxGeometry args={[0.03, 0.03, 1]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.35} depthWrite={false} />
    </instancedMesh>
  );
}

/** Translucent sector on the water showing the no-go zone around the true wind. */
export function NoGoOverlay() {
  const show = useApp((s) => s.settings.showNoGo);
  const ref = useRef<THREE.Mesh>(null);
  const geo = useMemo(() => {
    const a = (SIM.noGoAngle * Math.PI) / 180;
    // Ring sector centred on -z (forward = wind direction "from"), spanning ±a.
    return new THREE.RingGeometry(8, 40, 32, 1, Math.PI / 2 - a, 2 * a);
  }, []);
  useFrame(() => {
    const s = engine.state;
    if (!ref.current) return;
    ref.current.position.set(s.boat.x, 0.05, -s.boat.y);
    ref.current.rotation.set(-Math.PI / 2, 0, (-s.wind.trueFrom * Math.PI) / 180);
  });
  if (!show) return null;
  return (
    <mesh ref={ref} geometry={geo}>
      <meshBasicMaterial color="#ff4d4f" transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}
