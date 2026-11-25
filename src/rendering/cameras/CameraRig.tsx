import { useFrame, useThree } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useApp } from '../../store/appStore';
import { engine } from '../../store/runtime';
import { DEG, clamp } from '../../simulation/math';
import { L } from '../yacht/dimensions';
import { view } from './view';

/** First-person helm camera (primary), plus optional chase and top-down educational views. */
export function CameraRig({ heelRef }: { heelRef: React.RefObject<THREE.Group | null> }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const mode = useApp((s) => s.camera);
  const cameraHeel = useApp((s) => s.settings.cameraHeel);
  const tmp = useMemo(() => ({ eye: new THREE.Vector3(), look: new THREE.Vector3(), q: new THREE.Quaternion(), e: new THREE.Euler(0, 0, 0, 'YXZ') }), []);

  useFrame((_, dt) => {
    const s = engine.state;
    const heading = s.boat.heading * DEG;
    const bx = s.boat.x;
    const bz = -s.boat.y;
    const k = 1 - Math.exp(-dt * 6);
    if (mode === 'helm') {
      const heel = heelRef.current;
      tmp.eye.set(0, L.eye.y, L.eye.z);
      if (heel) {
        heel.updateWorldMatrix(true, false);
        tmp.eye.applyMatrix4(heel.matrixWorld);
      }
      camera.position.copy(tmp.eye);
      const pitch = clamp(-0.06 + view.pitch, -1.2, 1.2);
      tmp.e.set(pitch, -heading + view.yaw, cameraHeel ? -s.boat.heel * DEG * 0.9 : 0, 'YXZ');
      camera.quaternion.setFromEuler(tmp.e);
      camera.fov = 72;
      camera.filmOffset = 0;
    } else if (mode === 'chase') {
      const az = heading + Math.PI + 0.5 - view.yaw;
      const el = clamp(0.32 + view.pitch, 0.05, 1.4);
      const dist = 32 * view.zoom;
      tmp.eye.set(bx + Math.sin(az) * Math.cos(el) * dist, 3 + Math.sin(el) * dist, bz - Math.cos(az) * Math.cos(el) * dist);
      camera.position.lerp(tmp.eye, k);
      camera.lookAt(bx, 1, bz);
      camera.fov = 55;
      camera.filmOffset = 12;
    } else {
      tmp.eye.set(bx, 95 * view.zoom, bz + 0.01);
      camera.position.lerp(tmp.eye, k);
      camera.up.set(0, 0, -1);
      camera.lookAt(bx, 0, bz);
      camera.up.set(0, 1, 0);
      camera.fov = 50;
      camera.filmOffset = 12;
    }
    camera.updateProjectionMatrix();
  });
  return null;
}
