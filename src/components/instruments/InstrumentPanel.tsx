import { useHud } from '../../store/hudStore';
import { useT } from '../../store/appStore';

function Cell({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: string }) {
  return (
    <div className="flex flex-col leading-tight min-w-0">
      <span className="text-[9px] tracking-wide text-slate-300/80 truncate">{label}</span>
      <span className={`tnum text-[14px] font-bold ${tone ?? ''}`} dir="ltr">
        {value}
        {unit && <span className="text-[10px] font-normal text-slate-300 ms-0.5">{unit}</span>}
      </span>
    </div>
  );
}

/** Compact instrument display (top-left). */
export function InstrumentPanel() {
  const t = useT();
  const h = useHud();
  const tackTone = h.tack === 'port' ? 'text-port' : h.tack === 'starboard' ? 'text-stbd' : 'text-amber-300';
  const awaSide = h.awa > 0 ? 'S' : h.awa < 0 ? 'P' : '';
  return (
    <div className="glass rounded-xl px-2 py-1 grid grid-cols-4 gap-x-2 gap-y-0.5 w-[262px]" data-testid="instruments">
      <Cell label={t('boatSpeed')} value={h.speed.toFixed(1)} unit={t('kt')} tone="text-sky-300" />
      <Cell label={t('heading')} value={`${Math.round(h.heading).toString().padStart(3, '0')}°`} />
      <Cell label={t('tws')} value={h.tws.toFixed(0)} unit={t('kt')} />
      <Cell label={t('aws')} value={h.aws.toFixed(1)} unit={t('kt')} />
      <Cell label={t('awa')} value={`${Math.abs(Math.round(h.awa))}°${awaSide}`} tone={h.awa < 0 ? 'text-port' : 'text-stbd'} />
      <Cell label={t('heel')} value={`${Math.abs(h.heel).toFixed(0)}°`} tone={Math.abs(h.heel) > 25 ? 'text-red-400' : ''} />
      <Cell label={t('mainsail')} value={`${Math.round(h.mainHoist * 100)}%`} />
      <Cell label={t('jib')} value={`${Math.round(h.jibDeployed * 100)}%`} />
      <div className="col-span-2 leading-tight">
        <span className="text-[9px] text-slate-300/80">{t('tackLabel')}</span>
        <div className={`text-[12px] font-bold ${tackTone}`} data-testid="tack">{t(`tack.${h.tack}`)}</div>
      </div>
      <div className="col-span-2 leading-tight">
        <span className="text-[9px] text-slate-300/80">{t('pointOfSail')}</span>
        <div className={`text-[12px] font-bold ${h.pos === 'noGo' ? 'text-red-400' : ''}`} data-testid="pos">{t(`pos.${h.pos}`)}</div>
      </div>
    </div>
  );
}
