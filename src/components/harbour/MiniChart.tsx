import { useEffect, useRef, useState } from 'react';
import { engine, runtime } from '../../store/runtime';
import type { Cond } from '../../training/scenarios/types';
import { useHud } from '../../store/hudStore';
import { useT } from '../../store/appStore';
import { ENTRANCE_LIGHTS } from '../../simulation/world/gordon';
import type { VesselKind } from '../../simulation/world/types';

const COLORS: Record<VesselKind, string> = {
  optimist: '#ffd43b',
  windsurfer: '#ff922b',
  kitesurfer: '#f06595',
  sailingYacht: '#e9ecef',
  motorYacht: '#74c0fc',
  fishing: '#69db7c',
  police: '#4c6ef5',
};
/** Zone ids the current guided step refers to (drawn as the target on the chart). */
function zonesIn(c: Cond | undefined, out: Set<string>): Set<string> {
  if (!c) return out;
  if ('inZone' in c) out.add(c.inZone);
  if ('all' in c) c.all.forEach((x) => zonesIn(x, out));
  if ('any' in c) c.any.forEach((x) => zonesIn(x, out));
  return out;
}
const HIDDEN = new Set(['marina', 'fairway', 'fairwayEast', 'fairwayWest', 'entranceEast', 'entranceWest', 'pastBoards']);

/**
 * North-up chart plotter: marina structures, zones, other vessels and the own boat.
 * Drawn on a canvas from the engine state every frame (no React re-renders). Tap to change range.
 */
export function MiniChart({ size = 150 }: { size?: number }) {
  const t = useT();
  const worldKey = useHud((s) => s.worldKey);
  const ref = useRef<HTMLCanvasElement>(null);
  const ranges = [250, 600, 1500];
  const [ri, setRi] = useState(1);
  const has = worldKey >= 0 && !!engine.world;
  useEffect(() => {
    if (!has) return;
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const c = ref.current;
      const w = engine.world;
      if (!c || !w) return;
      if (c.width !== size * dpr) {
        c.width = c.height = size * dpr;
      }
      const g = c.getContext('2d')!;
      const s = engine.state;
      const R = ranges[ri];
      const ev = runtime.evaluator;
      const step = ev?.def.steps[ev.currentStep];
      const targets = zonesIn(step?.done, new Set());
      if (!targets.size) zonesIn(ev?.def.success.cond, targets);
      const k = (size / 2 / R) * dpr;
      const X = (x: number) => (x - s.boat.x) * k + (size * dpr) / 2;
      const Y = (y: number) => -(y - s.boat.y) * k + (size * dpr) / 2;
      g.clearRect(0, 0, c.width, c.height);
      g.fillStyle = 'rgba(8,30,48,0.82)';
      g.fillRect(0, 0, c.width, c.height);
      // Land (east of the shore).
      if (w.def.marina) {
        g.fillStyle = '#5c5446';
        g.fillRect(X(0), 0, c.width, c.height);
      }
      // Zones.
      for (const z of w.zones) {
        if (z.id === 'swim' && z.kind === 'rect') {
          g.strokeStyle = '#ffd43b';
          g.setLineDash([4 * dpr, 3 * dpr]);
          g.lineWidth = 1.2 * dpr;
          g.strokeRect(X(z.x0), Y(z.y1), (z.x1 - z.x0) * k, (z.y1 - z.y0) * k);
          g.setLineDash([]);
        }
        if (targets.has(z.id) && !HIDDEN.has(z.id)) {
          g.strokeStyle = 'rgba(56,217,169,0.9)';
          g.lineWidth = 1.5 * dpr;
          g.beginPath();
          if (z.kind === 'circle') g.arc(X(z.x), Y(z.y), Math.max(3 * dpr, z.r * k), 0, Math.PI * 2);
          else g.rect(X(z.x0), Y(z.y1), (z.x1 - z.x0) * k, (z.y1 - z.y0) * k);
          g.stroke();
        }
      }
      // Structures.
      g.lineCap = 'round';
      for (const sg of w.structures) {
        if (sg.kind === 'shore') continue;
        g.strokeStyle = sg.kind === 'pontoon' ? '#b08d63' : '#adb5bd';
        g.lineWidth = Math.max(1.5 * dpr, (sg.kind === 'pontoon' ? 4 : sg.w) * k);
        g.beginPath();
        g.moveTo(X(sg.a[0]), Y(sg.a[1]));
        g.lineTo(X(sg.b[0]), Y(sg.b[1]));
        g.stroke();
      }
      if (w.def.marina)
        for (const l of ENTRANCE_LIGHTS) {
          g.fillStyle = l.color === 'green' ? '#40c057' : '#fa5252';
          g.beginPath();
          g.arc(X(l.pos[0]), Y(l.pos[1]), 2.5 * dpr, 0, Math.PI * 2);
          g.fill();
        }
      // Vessels.
      for (const v of s.vessels) {
        const x = X(v.x);
        const y = Y(v.y);
        if (x < -10 || y < -10 || x > c.width + 10 || y > c.height + 10) continue;
        const h = (v.heading * Math.PI) / 180;
        g.fillStyle = COLORS[v.kind];
        g.beginPath();
        g.arc(x, y, 2.6 * dpr, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = COLORS[v.kind];
        g.lineWidth = 1 * dpr;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.sin(h) * 9 * dpr, y - Math.cos(h) * 9 * dpr);
        g.stroke();
      }
      // Own boat.
      const cx = (size * dpr) / 2;
      const h = (s.boat.heading * Math.PI) / 180;
      g.save();
      g.translate(cx, cx);
      g.rotate(h);
      g.fillStyle = '#ff6b6b';
      g.beginPath();
      g.moveTo(0, -7 * dpr);
      g.lineTo(4 * dpr, 5 * dpr);
      g.lineTo(-4 * dpr, 5 * dpr);
      g.closePath();
      g.fill();
      g.restore();
      // North and scale.
      g.fillStyle = '#dee2e6';
      g.font = `${9 * dpr}px system-ui`;
      g.fillText('N↑', 4 * dpr, 11 * dpr);
      g.fillText(`${R} m`, c.width - 34 * dpr, c.height - 4 * dpr);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [has, ri, size]);
  if (!has) return null;
  return (
    <canvas
      ref={ref}
      className="rounded-lg border border-white/15 cursor-pointer"
      style={{ width: size, height: size }}
      data-testid="minichart"
      aria-label={t('chart')}
      onClick={() => setRi((i) => (i + 1) % ranges.length)}
    />
  );
}
