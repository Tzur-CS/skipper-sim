import { useState } from 'react';
import { engine } from '../../store/runtime';
import { useHud } from '../../store/hudStore';
import { useT } from '../../store/appStore';
import { useHighlight } from '../useHighlight';
import type { CrewCommandId, LineId } from '../../simulation/types';

function Cmd({ id, tone }: { id: CrewCommandId; tone?: 'port' | 'stbd' }) {
  const t = useT();
  const hl = useHighlight(id);
  return (
    <button
      className={`btn bs ${tone === 'port' ? 'btn-port' : tone === 'stbd' ? 'btn-stbd' : ''} ${hl ? 'hl' : ''}`}
      data-testid={`cmd-${id}`}
      onClick={() => engine.command(id)}
    >
      {t(`cmd.${id}`)}
    </button>
  );
}

function Hold({ line, dir, label, tone }: { line: LineId; dir: 1 | -1; label: string; tone?: 'port' | 'stbd' }) {
  const [p, setP] = useState(false);
  const start = (e: React.PointerEvent) => {
    try { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* synthetic events */ }
    setP(true);
    engine.setLineInput(line, dir);
  };
  const stop = () => {
    setP(false);
    engine.setLineInput(line, 0);
  };
  return (
    <button
      className={`btn bs min-w-[44px] ${tone === 'port' ? 'btn-port' : tone === 'stbd' ? 'btn-stbd' : ''}`}
      data-pressed={p}
      data-testid={`line-${line}-${dir > 0 ? 'in' : 'out'}`}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

function Gauge({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2.5 flex-1 rounded bg-white/10 overflow-hidden min-w-[40px]">
      <div className="h-full rounded" style={{ width: `${Math.round(value * 100)}%`, background: color }} />
    </div>
  );
}

function LineRow({ line, label, value, color, outLabel, inLabel, tone }: { line: LineId; label: string; value: number; color: string; outLabel: string; inLabel: string; tone?: 'port' | 'stbd' }) {
  const hl = useHighlight(line);
  return (
    <div className={`flex items-center gap-1.5 rounded-lg ${hl ? 'hl' : ''}`}>
      <span className="text-[10.5px] w-[70px] truncate">{label}</span>
      <Hold line={line} dir={-1} label={outLabel} tone={tone} />
      <Gauge value={value} color={color} />
      <Hold line={line} dir={1} label={inLabel} tone={tone} />
    </div>
  );
}

/** Bottom-right collapsible panel: crew commands and manual line handling. */
export function SailControls() {
  const t = useT();
  const [tab, setTab] = useState<'crew' | 'lines'>('crew');
  const [open, setOpen] = useState(true);
  const h = useHud();
  const crewStatus = h.crew.preparing > 0 ? t('crewPreparing') : h.crew.readyFor ? t('crewReady') : h.crew.busy > 0 ? t('crewWorking') : '';
  const ack = h.crew.lastAck && h.t - h.crew.lastAck.t < 3 ? t(h.crew.lastAck.key) : '';
  if (!open)
    return (
      <button className="btn bs glass" data-testid="controls-open" onClick={() => setOpen(true)}>
        ⛵ {t('crew')}
      </button>
    );
  return (
    <div className="glass rounded-xl p-1.5 w-[408px]" data-testid="sail-controls">
      <div className="flex items-center gap-1 mb-1">
        <button className={`btn bs ${tab === 'crew' ? 'btn-primary' : ''}`} data-testid="tab-crew" onClick={() => setTab('crew')}>
          {t('crew')}
        </button>
        <button className={`btn bs ${tab === 'lines' ? 'btn-primary' : ''}`} data-testid="tab-lines" onClick={() => setTab('lines')}>
          {t('lines')}
        </button>
        <span className="flex-1 text-[11px] text-amber-200 truncate px-1" data-testid="crew-ack">
          {ack || crewStatus}
        </span>
        <button className="btn bs" aria-label="collapse" onClick={() => setOpen(false)}>
          ▾
        </button>
      </div>
      {tab === 'crew' ? (
        <div className="flex flex-col gap-1">
          <div className="grid grid-cols-4 gap-1">
            <Cmd id="prepareTack" />
            <Cmd id="tack" />
            <Cmd id="prepareGybe" />
            <Cmd id="gybe" />
          </div>
          <div className="grid grid-cols-5 gap-1">
            <Cmd id="hoistMain" />
            <Cmd id="lowerMain" />
            <Cmd id="trimMain" />
            <Cmd id="easeMain" />
            <Cmd id="centerMain" />
          </div>
          {/* Physical layout: port controls on the left, starboard on the right. */}
          <div className="grid grid-cols-[1fr_1fr_0.9fr_0.9fr] gap-1" dir="ltr">
            <Cmd id="releaseJibPort" tone="port" />
            <Cmd id="trimJibPort" tone="port" />
            <Cmd id="trimJibStarboard" tone="stbd" />
            <Cmd id="releaseJibStarboard" tone="stbd" />
          </div>
          <div className="grid grid-cols-2 gap-1">
            <Cmd id="unfurlJib" />
            <Cmd id="furlJib" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <LineRow line="mainsheet" label={t('mainsheet')} value={h.mainsheet} color="#1f6feb" outLabel={t('ease')} inLabel={t('trimIn')} />
          <LineRow line="jibPort" label={t('jibPortSheet')} value={h.jibPort} color="#e5484d" outLabel={t('ease')} inLabel={t('trimIn')} tone="port" />
          <LineRow line="jibStarboard" label={t('jibStbdSheet')} value={h.jibStbd} color="#30a46c" outLabel={t('ease')} inLabel={t('trimIn')} tone="stbd" />
          <LineRow line="halyard" label={t('halyard')} value={h.mainHoist} color="#e3b341" outLabel={t('lower')} inLabel={t('hoist')} />
          <LineRow line="furler" label={t('furler')} value={h.jibDeployed} color="#a371f7" outLabel={t('furl')} inLabel={t('unfurl')} />
        </div>
      )}
      <SailState />
    </div>
  );
}

function SailState() {
  const t = useT();
  const h = useHud();
  const status = (luff: number, backed: boolean, incidence: number, present: boolean) => {
    if (!present) return { txt: '—', c: 'text-slate-400' };
    if (backed) return { txt: t('backed'), c: 'text-red-400' };
    if (luff > 0.5) return { txt: t('luffing'), c: 'text-amber-300' };
    if (incidence > 40 && Math.abs(h.awa) < 115) return { txt: t('stalled'), c: 'text-orange-300' };
    return { txt: t('trimGood'), c: 'text-emerald-300' };
  };
  const m = status(h.mainLuff, false, h.mainIncidence, h.mainHoist > 0.05);
  const j = status(h.jibLuff, h.jibBacked, h.jibIncidence, h.jibDeployed > 0.05);
  return (
    <div className="flex gap-3 text-[10.5px] mt-0.5 px-1" data-testid="sail-state">
      <span>
        {t('mainsail')}: <b className={m.c}>{m.txt}</b>
      </span>
      <span>
        {t('jib')}: <b className={j.c}>{j.txt}</b>
      </span>
    </div>
  );
}
