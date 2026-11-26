import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { engine } from '../../store/runtime';
import { useHud } from '../../store/hudStore';

export const HORIZON = new THREE.Color('#b9d3e6');
export const SUN_DIR = new THREE.Vector3(-0.45, 0.55, -0.7).normalize();
const NIGHT_HORIZON = new THREE.Color('#03070f');
const MOON = new THREE.Vector3(0.5, 0.45, 0.6).normalize();

/**
 * Lightweight ocean: one large plane following the boat. Waves are shaded per-pixel from
 * an analytic sum of sines in world space (no vertex displacement, no textures).
 */
export function Ocean() {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSun: { value: SUN_DIR },
          uHorizon: { value: HORIZON },
          uDeep: { value: new THREE.Color('#0d3a5c') },
          uShallow: { value: new THREE.Color('#1f6f8b') },
          uWindDir: { value: new THREE.Vector2(0, 1) },
          uWind: { value: 12 },
          uSunI: { value: 1 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vWorld;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          precision mediump float;
          uniform float uTime; uniform vec3 uSun; uniform vec3 uHorizon; uniform vec3 uDeep; uniform vec3 uShallow;
          uniform vec2 uWindDir; uniform float uWind; uniform float uSunI;
          varying vec3 vWorld;
          vec2 wave(vec2 p, vec2 d, float k, float a, float s) {
            float ph = dot(p, d) * k + uTime * s;
            return d * (a * k * cos(ph));
          }
          void main() {
            vec2 p = vWorld.xz;
            vec2 wd = normalize(uWindDir);
            vec2 wp = vec2(-wd.y, wd.x);
            float amp = 0.25 + uWind * 0.02;
            vec2 g = vec2(0.0);
            g += wave(p, wd, 0.16, 0.35 * amp, 1.25);
            g += wave(p, normalize(wd + wp * 0.6), 0.27, 0.22 * amp, 1.6);
            g += wave(p, normalize(wd - wp * 0.5), 0.45, 0.12 * amp, 2.1);
            g += wave(p, normalize(wp + wd * 0.2), 0.9, 0.05 * amp, 3.0);
            g += wave(p, normalize(-wp + wd * 0.4), 1.7, 0.025 * amp, 4.2);
            float flat_ = smoothstep(25.0, 80.0, cameraPosition.y);
            vec3 n = normalize(vec3(-g.x * (1.0 - 0.7 * flat_), 1.0, -g.y * (1.0 - 0.7 * flat_)));
            vec3 viewDir = normalize(cameraPosition - vWorld);
            float dist = length(cameraPosition.xz - vWorld.xz);
            float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 4.0);
            vec3 base = mix(uDeep, uShallow, clamp(0.5 + g.x * 0.8, 0.0, 1.0) * 0.35);
            vec3 sky = mix(uHorizon, mix(uHorizon, vec3(0.45, 0.65, 0.85), uSunI), clamp(reflect(-viewDir, n).y * 2.0, 0.0, 1.0));
            vec3 col = mix(base, sky, clamp(fres * 0.9 + 0.08, 0.0, 1.0));
            vec3 h = normalize(uSun + viewDir);
            col += vec3(1.0, 0.95, 0.85) * pow(max(dot(n, h), 0.0), 180.0) * 1.6 * uSunI * (1.0 - smoothstep(30.0, 90.0, cameraPosition.y));
            // whitecaps hint in stronger wind
            float crest = smoothstep(0.85, 1.0, length(g) / (0.07 * amp + 0.01)) * clamp((uWind - 12.0) / 10.0, 0.0, 1.0);
            col = mix(col, vec3(0.95), crest * 0.5);
            float fog = smoothstep(150.0, mix(5000.0, 1800.0, uSunI), dist);
            gl_FragColor = vec4(mix(col, uHorizon, fog), 1.0);
          }`,
      }),
    [],
  );
  const night = useHud((h) => h.timeOfDay) === 'night';
  useEffect(() => {
    const u = mat.uniforms;
    (u.uDeep.value as THREE.Color).set(night ? '#02070d' : '#0d3a5c');
    (u.uShallow.value as THREE.Color).set(night ? '#071722' : '#1f6f8b');
    u.uHorizon.value = night ? NIGHT_HORIZON : HORIZON;
    u.uSun.value = night ? MOON : SUN_DIR;
    u.uSunI.value = night ? 0.12 : 1;
  }, [night, mat]);
  useFrame(({ clock }) => {
    const s = engine.state;
    mat.uniforms.uTime.value = clock.getElapsedTime();
    const a = ((s.wind.trueFrom + 180) * Math.PI) / 180; // direction the wind blows toward
    (mat.uniforms.uWindDir.value as THREE.Vector2).set(Math.sin(a), -Math.cos(a));
    mat.uniforms.uWind.value = s.wind.trueSpeed;
    ref.current?.position.set(s.boat.x, 0, -s.boat.y);
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} material={mat} renderOrder={-1}>
      <planeGeometry args={[4000, 4000, 1, 1]} />
    </mesh>
  );
}
