import { useHud } from '../../store/hudStore';
import { useT } from '../../store/appStore';

/**
 * What the helmsman feels: the boat pulling into the wind (weather helm) and gusts / lulls.
 * Shown only when it matters, so it stays out of the way of the scene.
 */
export function WindFeel({ compact }: { compact?: boolean }) {
  const t = useT();
  const wh = useHud((s) => s.weatherHelm);
  const gust = useHud((s) => s.gust);
  const speed = useHud((s) => s.speed);
  const pull = Math.abs(wh);
  const showPull = pull > 0.8 && speed > 1.5;
  const showGust = gust > 2;
  const showLull = gust < -1.5;
  if (!showPull && !showGust && !showLull) return null;
  // wh > 0: the bow is pulled to starboard, so the helm has to hold it to port (and the reverse).
  const toStbd = wh > 0;
  const level = Math.min(1, pull / 4);
  return (
    <div className={`flex items-center gap-1 ${compact ? 'text-[10px]' : 'text-[11px]'}`} dir="ltr" data-testid="wind-feel">
      {showPull && (
        <div className="glass rounded-lg px-1.5 py-0.5 flex items-center gap-1" data-testid="weather-helm">
          {!toStbd && <span className="text-amber-300 font-bold">↶</span>}
          <span className="text-amber-200 font-bold whitespace-nowrap" dir="auto">{t('pullsToWind')}</span>
          <div className="h-1.5 w-10 rounded bg-white/15 overflow-hidden">
            <div className={`h-full rounded ${level > 0.7 ? 'bg-red-400' : 'bg-amber-300'}`} style={{ width: `${Math.round(level * 100)}%` }} />
          </div>
          {toStbd && <span className="text-amber-300 font-bold">↷</span>}
          {!compact && (
            <span className={`whitespace-nowrap ${toStbd ? 'text-port' : 'text-stbd'}`} dir="auto">
              {t(toStbd ? 'holdHelmPort' : 'holdHelmStbd')}
            </span>
          )}
        </div>
      )}
      {showGust && (
        <div className="glass rounded-lg px-1.5 py-0.5 text-sky-200 font-bold whitespace-nowrap tnum" dir="auto" data-testid="gust">
          💨 {t('gust')} +{Math.round(gust)}
        </div>
      )}
      {showLull && (
        <div className="glass rounded-lg px-1.5 py-0.5 text-slate-300 whitespace-nowrap tnum" dir="auto" data-testid="lull">
          {t('lull')} {Math.round(gust)}
        </div>
      )}
    </div>
  );
}
