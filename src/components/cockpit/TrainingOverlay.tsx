import { useEffect, useState } from 'react';
import { useHud } from '../../store/hudStore';
import { useLang, useT } from '../../store/appStore';
import { runtime } from '../../store/runtime';

/** Objective, current step / hint (guided), success progress and error feedback. */
export function TrainingOverlay() {
  const t = useT();
  const lang = useLang();
  const h = useHud();
  const ev = runtime.evaluator;
  const [showToast, setShowToast] = useState(false);
  useEffect(() => {
    if (!h.toast) return;
    setShowToast(true);
    const id = setTimeout(() => setShowToast(false), 6000);
    return () => clearTimeout(id);
  }, [h.toast]);
  if (!ev) return null;
  const def = ev.def;
  const step = def.steps[h.currentStep];
  const done = h.stepStatus.filter((s) => s === 'done' || s === 'skipped').length;
  return (
    <div className="flex flex-col items-center gap-1 w-[min(300px,calc(100vw-400px))]" data-testid="training-overlay">
      <div className="glass rounded-xl px-2 py-1 w-full">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-bold text-amber-200">{def.title[lang]}</span>
          <span className="text-[10px] text-slate-300 tnum">
            {t(`mode${ev.mode[0].toUpperCase()}${ev.mode.slice(1)}`)} · {Math.floor(h.elapsed)}/{def.timeLimit}
            {t('seconds')}
          </span>
        </div>
        <div className="text-[11px] leading-snug" data-testid="objective">{def.objective[lang]}</div>
        {ev.mode === 'guided' && step && (
          <div className="mt-1 border-t border-white/10 pt-1" data-testid="guided-step">
            <div className="text-[11px] text-sky-300 font-bold">
              {t('step')} {h.currentStep + 1} {t('of')} {def.steps.length}: {step.title[lang]}
            </div>
            <div className="text-[11px] leading-snug text-slate-100">{step.hint[lang]}</div>
          </div>
        )}
        {ev.mode !== 'exam' && (
          <div className="flex gap-1 mt-1">
            {h.stepStatus.map((s, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded ${s === 'done' ? 'bg-emerald-400' : s === 'skipped' ? 'bg-slate-500' : s === 'active' ? 'bg-sky-400' : 'bg-white/15'}`} />
            ))}
          </div>
        )}
        {h.successProgress > 0 && (
          <div className="mt-1 text-[11px] text-emerald-300 flex items-center gap-2">
            {t('holding')}
            <div className="h-1.5 flex-1 bg-white/10 rounded">
              <div className="h-full bg-emerald-400 rounded" style={{ width: `${h.successProgress * 100}%` }} />
            </div>
          </div>
        )}
        <span className="sr-only">{done}</span>
      </div>
      {showToast && h.toast && (
        <div className="glass rounded-xl px-3 py-1.5 w-full border-red-400/50 bg-red-950/60" data-testid="error-toast">
          <div className="text-[12px] font-bold text-red-300">
            {t(`cat.${h.toast.error.category}`)}: {h.toast.error.message[lang]}
          </div>
          <div className="text-[11px] text-slate-200">{h.toast.error.suggestion[lang]}</div>
        </div>
      )}
    </div>
  );
}

/** Big warning banner for uncontrolled gybe / in irons. Always shown (safety). */
export function WarningBanner() {
  const t = useT();
  const w = useHud((s) => s.warning);
  const now = useHud((s) => s.t);
  if (!w || now - w.t > 3.5) return null;
  return (
    <div className="absolute inset-x-0 top-[38%] flex justify-center pointer-events-none" data-testid="warning">
      <div className="flash rounded-2xl px-6 py-3 bg-red-600/85 text-white text-2xl font-extrabold shadow-2xl">⚠ {t(w.key)}</div>
    </div>
  );
}
