import { useState } from 'react';
import { useHud } from '../../store/hudStore';
import { useT } from '../../store/appStore';
import { engine, restartRuntime, setFreeWind, setFreeWindVariation } from '../../store/runtime';

/** Free sailing: adjustable wind in real time + instant reset. */
export function FreeSailPanel() {
  const t = useT();
  // Sliders set the mean wind; gusts and shifts vary around it.
  const mean = useHud((s) => s.windMean);
  const twd = mean.trueFrom;
  const tws = mean.trueSpeed;
  const [open, setOpen] = useState(true);
  if (!open)
    return (
      <button className="btn bs glass" onClick={() => setOpen(true)} data-testid="wind-open">
        💨 {t('windDir')}
      </button>
    );
  return (
    <div className="glass rounded-xl px-2 py-1 w-[230px] text-[11px]" data-testid="free-panel">
      <div className="flex items-center justify-between">
        <b className="text-amber-200">{t('freeSailing')}</b>
        <button className="text-slate-300 px-1" onClick={() => setOpen(false)} aria-label="collapse">▴</button>
      </div>
      <label className="flex items-center gap-2">
        <span className="w-16 truncate">{t('windDir')}</span>
        <input data-testid="wind-dir" type="range" min={0} max={359} value={Math.round(twd)} className="flex-1" dir="ltr" onChange={(e) => setFreeWind(Number(e.target.value), engine.meanWind.trueSpeed)} />
        <span className="tnum w-10 text-end">{Math.round(twd)}°</span>
      </label>
      <label className="flex items-center gap-2">
        <span className="w-16 truncate">{t('windSpeed')}</span>
        <input data-testid="wind-speed" type="range" min={5} max={25} value={Math.round(tws)} className="flex-1" dir="ltr" onChange={(e) => setFreeWind(engine.meanWind.trueFrom, Number(e.target.value))} />
        <span className="tnum w-10 text-end">{Math.round(tws)}</span>
      </label>
      <label className="flex items-center gap-2">
        <span className="w-16 truncate">{t('windGusts')}</span>
        <input data-testid="wind-gusts" type="range" min={0} max={10} value={Math.round(mean.gusts)} className="flex-1" dir="ltr" onChange={(e) => setFreeWindVariation(Number(e.target.value), engine.meanWind.shifts)} />
        <span className="tnum w-10 text-end">+{Math.round(mean.gusts)}</span>
      </label>
      <label className="flex items-center gap-2">
        <span className="w-16 truncate">{t('windShifts')}</span>
        <input data-testid="wind-shifts" type="range" min={0} max={20} value={Math.round(mean.shifts)} className="flex-1" dir="ltr" onChange={(e) => setFreeWindVariation(engine.meanWind.gusts, Number(e.target.value))} />
        <span className="tnum w-10 text-end">±{Math.round(mean.shifts)}°</span>
      </label>
      <button className="btn bs w-full mt-0.5" data-testid="free-reset" onClick={restartRuntime}>
        ↺ {t('reset')}
      </button>
    </div>
  );
}
