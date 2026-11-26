import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useApp } from '../store/appStore';
import { engine, frame } from '../store/runtime';
import { CameraRig } from './cameras/CameraRig';
import { Buoys, Lights, NoGoOverlay, SkyDome, WindStreaks } from './environment/Environment';
import { Ocean } from './ocean/Ocean';
import { Yacht } from './yacht/Yacht';
import { Marina, OwnLights } from './world/Marina';
import { Traffic } from './world/Traffic';
import { useHud } from '../store/hudStore';

function Driver() {
  useFrame((_, dt) => frame(Math.min(dt, 0.1)));
  return null;
}

export function Scene() {
  const quality = useApp((s) => s.settings.quality);
  const camera = useApp((s) => s.camera);
  const worldKey = useHud((s) => s.worldKey);
  // Re-evaluated whenever a session (re)starts and loads a new world.
  const hasWorld = useMemo(() => worldKey >= 0 && !!engine.world, [worldKey]);
  const yawRef = useRef<THREE.Group>(null);
  const heelRef = useRef<THREE.Group>(null);
  const dpr: [number, number] = quality === 'low' ? [1, 1] : quality === 'high' ? [1, 2] : [1, 1.6];
  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: quality !== 'low', powerPreference: 'high-performance' }}
      camera={{ fov: 68, near: 0.1, far: 5000, position: [0, 2.3, 5] }}
      style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
    >
      <Driver />
      <SkyDome />
      <Lights />
      <Ocean />
      {!hasWorld && <Buoys />}
      {hasWorld && <Marina />}
      {hasWorld && <Traffic />}
      <OwnLights />
      <WindStreaks />
      {camera !== 'helm' && <NoGoOverlay />}
      <Yacht yawRef={yawRef} heelRef={heelRef} />
      <CameraRig heelRef={heelRef} />
    </Canvas>
  );
}
