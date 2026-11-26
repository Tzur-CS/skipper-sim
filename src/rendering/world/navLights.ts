import * as THREE from 'three';
import type { VesselDef, VesselKind } from '../../simulation/world/types';

/**
 * Navigation lights (COLREGs Part C, simplified). Each light has a horizontal sector relative to
 * the vessel's bow: sidelights 112.5° each side, sternlight 135° aft, masthead 225° forward,
 * all-round 360°. A light is drawn only when the viewer is inside its sector, which is exactly
 * what lets a skipper tell a vessel's aspect from its lights.
 */
export type LightColor = 'red' | 'green' | 'white' | 'blue' | 'yellow';
export type Sector = 'all' | 'port' | 'stbd' | 'stern' | 'masthead';

export interface LightSpec {
  color: LightColor;
  /** Vessel frame: x = starboard, y = up, f = forward (m). */
  pos: [number, number, number];
  sector: Sector;
  /** Flash period (s); undefined = fixed. */
  flash?: number;
  /** Also shown by day (police blue). */
  day?: boolean;
}

/** Is a viewer at relative bearing `rel` (deg from bow, -180..180, + = starboard) inside the sector? */
export function inSector(sector: Sector, rel: number): boolean {
  const a = Math.abs(rel);
  switch (sector) {
    case 'all':
      return true;
    case 'stbd':
      return rel >= -1 && rel <= 112.5;
    case 'port':
      return rel <= 1 && rel >= -112.5;
    case 'stern':
      return a >= 112.5;
    case 'masthead':
      return a <= 112.5;
  }
}

export function lightsFor(kind: VesselKind, def?: Pick<VesselDef, 'fishing' | 'blue'>, motoring = false): LightSpec[] {
  const side = (half: number, y: number, f: number): LightSpec[] => [
    { color: 'red', pos: [-half, y, f], sector: 'port' },
    { color: 'green', pos: [half, y, f], sector: 'stbd' },
  ];
  switch (kind) {
    case 'sailingYacht':
      return [...side(1.5, 1.3, 4.8), { color: 'white', pos: [0, 1.4, -5.4], sector: 'stern' }, ...(motoring ? [{ color: 'white' as const, pos: [0, 9, 0.4] as [number, number, number], sector: 'masthead' as const }] : [])];
    case 'motorYacht':
      return [...side(1.9, 2.4, 2.5), { color: 'white', pos: [0, 6.2, 1.2], sector: 'masthead' }, { color: 'white', pos: [0, 2.2, -6.4], sector: 'stern' }];
    case 'police':
      return [
        ...side(1.5, 2.1, 1.6),
        { color: 'white', pos: [0, 4.6, 0.6], sector: 'masthead' },
        { color: 'white', pos: [0, 1.6, -4.4], sector: 'stern' },
        { color: 'blue', pos: [0, 3.9, 0.2], sector: 'all', flash: 0.7, day: true },
      ];
    case 'fishing': {
      const top: LightColor = def?.fishing === 'trawl' ? 'green' : 'red';
      return [
        { color: top, pos: [0, 6.4, 1.5], sector: 'all' },
        { color: 'white', pos: [0, 5.2, 1.5], sector: 'all' },
        ...side(1.7, 2.2, 2.5),
        { color: 'white', pos: [0, 1.8, -4.6], sector: 'stern' },
      ];
    }
    default:
      // Dinghies and boards: a white torch at most; they should not be out at night.
      return [];
  }
}

export const LIGHT_RGB: Record<LightColor, string> = {
  red: '#ff3b30',
  green: '#3dff7a',
  white: '#fff8e8',
  blue: '#3d7bff',
  yellow: '#ffd23d',
};

let glowTex: THREE.Texture | null = null;
/** Soft round glow sprite texture (shared). */
export function glowTexture(): THREE.Texture {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.18, 'rgba(255,255,255,0.95)');
  grd.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

export function makeLightSprite(color: LightColor): THREE.Sprite {
  const m = new THREE.SpriteMaterial({ map: glowTexture(), color: LIGHT_RGB[color], transparent: true, depthWrite: false, fog: false, sizeAttenuation: false, blending: THREE.AdditiveBlending });
  const s = new THREE.Sprite(m);
  s.scale.setScalar(0.03);
  s.renderOrder = 5;
  return s;
}

/** Screen size for a light at `dist` metres: big close up, a steady point far away. */
export function lightScale(dist: number): number {
  return Math.max(0.028, Math.min(0.07, 8 / Math.max(1, dist)));
}
