import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useApp } from '../store/appStore';
import { frame } from '../store/runtime';
import { CameraRig } from './cameras/CameraRig';
import { Buoys, Lights, NoGoOverlay, SkyDome, WindStreaks } from './environment/Environment';
import { Ocean } from './ocean/Ocean';
import { Yacht } from './yacht/Yacht';

function Driver() {
  useFrame((_, dt) => frame(Math.min(dt, 0.1)));
  return null;
}

export function Scene() {
  const quality = useApp((s) => s.settings.quality);
  const camera = useApp((s) => s.camera);
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
      <Buoys />
      <WindStreaks />
      {camera !== 'helm' && <NoGoOverlay />}
      <Yacht yawRef={yawRef} heelRef={heelRef} />
      <CameraRig heelRef={heelRef} />
    </Canvas>
  );
}
