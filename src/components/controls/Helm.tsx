import { useEffect, useRef } from 'react';
import { engine } from '../../store/runtime';
import { useHud } from '../../store/hudStore';
import { useT } from '../../store/appStore';
import { useHighlight } from '../useHighlight';
import { clamp } from '../../simulation/math';

/**
 * Virtual wheel: drag horizontally (or around) to turn; it holds its position like a real wheel.
 * Physical layout is always port = left, starboard = right, regardless of UI language.
 */
export function Helm() {
  const t = useT();
  const helm = useHud((s) => s.helm);
  const rudder = useHud((s) => s.rudder);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const hl = useHighlight('helm');
  const hlCenter = useHighlight('helmCenter');
  const nudge = useRef<number | null>(null);

  const set = (v: number) => engine.setHelm(clamp(v, -1, 1));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') set(engine.state.input.helm - 0.1);
      if (e.key === 'ArrowRight') set(engine.state.input.helm + 0.1);
      if (e.key === ' ' || e.key === 'ArrowDown') set(0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const startNudge = (dir: number) => {
    stopNudge();
    set(engine.state.input.helm + dir * 0.08);
    nudge.current = window.setInterval(() => set(engine.state.input.helm + dir * 0.05), 70);
  };
  const stopNudge = () => {
    if (nudge.current) window.clearInterval(nudge.current);
    nudge.current = null;
  };

  return (
    <div className="flex items-end gap-2" dir="ltr" data-testid="helm">
      <div className="flex flex-col gap-1.5">
        <button className="btn bs btn-port w-11 h-11 text-lg" aria-label="port" data-testid="helm-port" onPointerDown={() => startNudge(-1)} onPointerUp={stopNudge} onPointerLeave={stopNudge} onPointerCancel={stopNudge}>
          ◀
        </button>
        <button className={`btn bs w-11 ${hlCenter ? 'hl' : ''}`} data-testid="helm-center" onClick={() => set(0)}>
          {t('center')}
        </button>
      </div>
      <div
        className={`glass rounded-full relative touch-none ${hl ? 'hl' : ''}`}
        style={{ width: 104, height: 104 }}
        data-testid="wheel"
        onPointerDown={(e) => {
          try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* synthetic events */ }
          drag.current = { x: e.clientX, start: engine.state.input.helm };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          set(drag.current.start + (e.clientX - drag.current.x) / 120);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onDoubleClick={() => set(0)}
      >
        <svg viewBox="-66 -66 132 132" width="104" height="104" style={{ transform: `rotate(${helm * 250}deg)` }}>
          <circle r={56} fill="none" stroke="#c9d1d9" strokeWidth={7} />
          <circle r={56} fill="none" stroke="#0b1d2e" strokeWidth={1} strokeDasharray="3 9" />
          {Array.from({ length: 6 }, (_, i) => (
            <line key={i} x1={0} y1={-12} x2={0} y2={-52} stroke="#c9d1d9" strokeWidth={4} transform={`rotate(${i * 60})`} />
          ))}
          <circle r={12} fill="#8b949e" />
          <circle cx={0} cy={-58} r={5} fill="#e3b341" />
        </svg>
        <div className="absolute inset-x-0 -bottom-4 text-center text-[10px] whitespace-nowrap font-bold tnum pointer-events-none">
          <span className={rudder < -1 ? 'text-port' : rudder > 1 ? 'text-stbd' : 'text-slate-200'}>
            {t('rudder')} {Math.abs(rudder).toFixed(0)}° {rudder < -1 ? 'P' : rudder > 1 ? 'S' : ''}
          </span>
        </div>
      </div>
      <button className="btn bs btn-stbd w-11 h-11 text-lg" aria-label="starboard" data-testid="helm-stbd" onPointerDown={() => startNudge(1)} onPointerUp={stopNudge} onPointerLeave={stopNudge} onPointerCancel={stopNudge}>
        ▶
      </button>
    </div>
  );
}
