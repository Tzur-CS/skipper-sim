import { engine } from '../../store/runtime';
import { useHud } from '../../store/hudStore';
import { useT } from '../../store/appStore';
import { useHighlight } from '../useHighlight';
import { MOTOR } from '../../simulation/config';

const LEVELS = MOTOR.levels;
const LABEL: Record<string, string> = { '-0.3': 'throttleAstern', '0': 'throttleNeutral', '0.22': 'throttleSlow', '0.45': 'throttleHalf', '1': 'throttleFull' };

function nearestIndex(v: number): number {
  let best = 0;
  LEVELS.forEach((l, i) => {
    if (Math.abs(l - v) < Math.abs(LEVELS[best] - v)) best = i;
  });
  return best;
}

/** Engine throttle lever: astern / neutral / slow / half / full ahead. Only shown when the boat has its engine in use. */
export function ThrottleControl({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const fitted = useHud((s) => s.motorFitted);
  const target = useHud((s) => s.throttleTarget);
  const actual = useHud((s) => s.throttle);
  const hlUp = useHighlight('throttleUp');
  const hlDown = useHighlight('throttleDown');
  const hlN = useHighlight('throttleNeutral');
  if (!fitted) return null;
  const i = nearestIndex(target);
  const set = (k: number) => engine.setThrottle(LEVELS[Math.max(0, Math.min(LEVELS.length - 1, k))]);
  const label = t(LABEL[String(LEVELS[i])] ?? 'throttleNeutral');
  const tone = target < 0 ? 'text-amber-300' : target > 0 ? 'text-emerald-300' : 'text-slate-200';
  const h = compact ? '!min-h-[40px]' : '!min-h-[44px]';
  return (
    <div className="glass rounded-xl px-1 py-1 flex items-center gap-1" dir="ltr" data-testid="throttle">
      <button className={`btn bs w-11 ${h} text-base ${hlDown ? 'hl' : ''}`} aria-label="throttle down" data-testid="throttle-down" onClick={() => set(i - 1)}>
        ▼
      </button>
      <div className="flex flex-col items-center min-w-[72px] leading-tight">
        <span className="text-[9.5px] text-slate-400">⚙ {t('throttle')}</span>
        <span className={`text-[12px] font-bold ${tone}`} data-testid="throttle-label">
          {label}
        </span>
        {/* lever position bar: astern left, ahead right */}
        <div className="relative h-1.5 w-full rounded bg-white/10 mt-0.5">
          <div className="absolute inset-y-0 w-px bg-white/50" style={{ left: `${(0.3 / 1.3) * 100}%` }} />
          <div className="absolute top-0 bottom-0 w-2 -ml-1 rounded bg-amber-300" style={{ left: `${((actual + 0.3) / 1.3) * 100}%` }} />
        </div>
      </div>
      <button className={`btn bs w-11 ${h} text-base ${hlUp ? 'hl' : ''}`} aria-label="throttle up" data-testid="throttle-up" onClick={() => set(i + 1)}>
        ▲
      </button>
      <button className={`btn bs ${h} text-[11px] ${hlN ? 'hl' : ''}`} data-testid="throttle-neutral" onClick={() => engine.setThrottle(0)}>
        N
      </button>
    </div>
  );
}
