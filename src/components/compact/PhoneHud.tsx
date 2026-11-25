import { useEffect, useRef, useState } from 'react';
import { engine } from '../../store/runtime';
import { runtime } from '../../store/runtime';
import { useHud } from '../../store/hudStore';
import { useApp, useLang, useT } from '../../store/appStore';
import { useHighlight } from '../useHighlight';
import { clamp } from '../../simulation/math';
import type { CrewCommandId, LineId } from '../../simulation/types';
import { Cmd, Gauge, Hold, SailControls } from '../controls/SailControls';
import { InstrumentPanel } from '../instruments/InstrumentPanel';
import { Compass } from '../instruments/Compass';
import { TopBar } from '../cockpit/TopBar';
import { FreeSailPanel } from '../cockpit/FreeSailPanel';

/**
 * Phone layout (landscape, short screens): everything sits on the edges so the sea and the boat
 * stay visible. Physical left/right is kept for port/starboard regardless of UI language.
 */
export function PhoneHud() {
  const t = useT();
  const session = useApp((s) => s.session);
  const camera = useApp((s) => s.camera);
  const [drawer, setDrawer] = useState(false);
  const [panel, setPanel] = useState<null | 'instruments' | 'wind'>(null);
  const toggle = (p: 'instruments' | 'wind') => setPanel((cur) => (cur === p ? null : p));
  const inset = 'max(env(safe-area-inset-left),6px)';
  const insetR = 'max(env(safe-area-inset-right),6px)';
  return (
    <>
      {/* Top-left: menu / camera / pause, then a one-line instrument strip. */}
      <div className="absolute top-[max(env(safe-area-inset-top),4px)] pointer-events-auto flex flex-col gap-1 items-start" style={{ left: inset }}>
        <div className="flex items-center gap-1">
          <TopBar />
          {session.kind === 'free' && <WindChip open={panel === 'wind'} onClick={() => toggle('wind')} />}
        </div>
        {camera !== 'winches' && <InstrumentStrip open={panel === 'instruments'} onClick={() => toggle('instruments')} />}
        {panel === 'instruments' && camera !== 'winches' && <InstrumentPanel />}
        {panel === 'wind' && session.kind === 'free' && <FreeSailPanel />}
      </div>

      {/* Top-right: small compass. */}
      <div className="absolute top-[max(env(safe-area-inset-top),4px)] pointer-events-auto" style={{ right: insetR }}>
        <Compass size={72} legend={false} />
      </div>

      {/* Training card: top centre, narrow. */}
      {session.kind === 'scenario' && (
        <div className="absolute top-[max(env(safe-area-inset-top),4px)] pointer-events-auto" style={{ right: `calc(${insetR} + 80px)` }}>
          <PhoneTrainingCard />
        </div>
      )}

      {/* Bottom-left: steering bar. */}
      <div className="absolute bottom-[max(env(safe-area-inset-bottom),6px)] pointer-events-auto" style={{ left: inset }}>
        <SteerBar />
      </div>

      {/* Bottom-right: quick sheets + crew drawer button. */}
      <div className="absolute bottom-[max(env(safe-area-inset-bottom),6px)] pointer-events-auto flex flex-col items-end gap-1" style={{ right: insetR }}>
        <CrewAck />
        <QuickSheets />
        <button className="btn bs glass btn-primary w-full" data-testid="controls-open" onClick={() => setDrawer(true)}>
          ⛵ {t('crew')}
        </button>
      </div>

      {drawer && (
        <div className="absolute inset-0 pointer-events-auto" onClick={() => setDrawer(false)} data-testid="drawer-backdrop">
          <div
            className="absolute top-0 bottom-0 glass !bg-sea-950/90 overflow-y-auto w-[min(420px,58vw)] rounded-s-xl"
            style={{ right: 0, paddingRight: insetR, paddingTop: 'max(env(safe-area-inset-top),4px)' }}
            onClick={(e) => e.stopPropagation()}
            data-testid="drawer"
          >
            <SailControls drawer onClose={() => setDrawer(false)} />
          </div>
        </div>
      )}
    </>
  );
}

function InstrumentStrip({ open, onClick }: { open: boolean; onClick: () => void }) {
  const t = useT();
  const h = useHud();
  const awaSide = h.awa > 0 ? 'S' : h.awa < 0 ? 'P' : '';
  const tackTone = h.tack === 'port' ? 'text-port' : h.tack === 'starboard' ? 'text-stbd' : 'text-amber-300';
  return (
    <button className="glass rounded-lg px-2 py-0.5 flex items-center gap-2.5 text-[12px] leading-tight" onClick={onClick} data-testid="instrument-strip">
      <span className="tnum font-bold text-sky-300" dir="ltr">
        {h.speed.toFixed(1)}
        <span className="text-[9px] font-normal text-slate-300 ms-0.5">{t('kt')}</span>
      </span>
      <span className={`tnum font-bold ${h.awa < 0 ? 'text-port' : 'text-stbd'}`} dir="ltr" title={t('awa')}>
        {Math.abs(Math.round(h.awa))}°{awaSide}
      </span>
      <span className={`tnum ${Math.abs(h.heel) > 25 ? 'text-red-400 font-bold' : ''}`} dir="ltr" title={t('heel')}>
        ∠{Math.abs(h.heel).toFixed(0)}°
      </span>
      <span className={`font-bold ${h.pos === 'noGo' ? 'text-red-400' : ''}`} data-testid="pos">{t(`pos.${h.pos}`)}</span>
      <span className={`font-bold ${tackTone}`} data-testid="tack">{t(`tack.${h.tack}`)}</span>
      <span className="text-slate-400 text-[10px]">{open ? '▴' : '▾'}</span>
    </button>
  );
}

function WindChip({ open, onClick }: { open: boolean; onClick: () => void }) {
  const twd = useHud((s) => s.twd);
  const tws = useHud((s) => s.tws);
  return (
    <button className={`btn bs glass ${open ? 'btn-primary' : ''}`} data-testid="wind-open" onClick={onClick} dir="ltr">
      💨 {Math.round(twd)}° {Math.round(tws)}kt
    </button>
  );
}

function CrewAck() {
  const t = useT();
  const h = useHud();
  const crewStatus = h.crew.preparing > 0 ? t('crewPreparing') : h.crew.readyFor ? t('crewReady') : h.crew.busy > 0 ? t('crewWorking') : '';
  const ack = h.crew.lastAck && h.t - h.crew.lastAck.t < 3 ? t(h.crew.lastAck.key) : '';
  const text = ack || crewStatus;
  return (
    <div className={`text-[11px] text-amber-200 px-2 rounded-md max-w-[240px] truncate ${text ? 'glass' : ''}`} data-testid="crew-ack">
      {text}
    </div>
  );
}

/** Mainsheet and the working jib sheet, always at hand (hold to ease / trim). */
function QuickSheets() {
  const t = useT();
  const h = useHud();
  const hlPort = useHighlight('jibPort');
  const hlStbd = useHighlight('jibStarboard');
  // Working jib sheet is on the leeward side: starboard tack → jib to port.
  let jibSide: 'port' | 'stbd' = h.tack === 'port' ? 'stbd' : 'port';
  if (hlPort) jibSide = 'port';
  else if (hlStbd) jibSide = 'stbd';
  return (
    <div className="glass rounded-xl p-1 flex flex-col gap-1 w-[244px]">
      <QuickRow line="mainsheet" label={t('mainsheet')} value={h.mainsheet} color="#388bfd" />
      {h.jibDeployed > 0.05 &&
        (jibSide === 'port' ? (
          <QuickRow line="jibPort" label={t('jibPortSheet')} value={h.jibPort} color="#e5484d" tone="port" />
        ) : (
          <QuickRow line="jibStarboard" label={t('jibStbdSheet')} value={h.jibStbd} color="#30a46c" tone="stbd" />
        ))}
    </div>
  );
}

function QuickRow({ line, label, value, color, tone }: { line: LineId; label: string; value: number; color: string; tone?: 'port' | 'stbd' }) {
  const t = useT();
  const hl = useHighlight(line);
  return (
    <div className={`flex items-center gap-1 rounded-lg ${hl ? 'hl' : ''}`} dir="ltr">
      <Hold line={line} dir={-1} label={`− ${t('ease')}`} tone={tone} className="min-w-[64px] !min-h-[36px]" />
      <div className="flex-1 min-w-0 flex flex-col items-stretch leading-none gap-1">
        <span className="text-[10px] text-slate-200 text-center truncate">{label}</span>
        <div className="flex">
          <Gauge value={value} color={color} />
        </div>
      </div>
      <Hold line={line} dir={1} label={`${t('trimIn')} +`} tone={tone} className="min-w-[64px] !min-h-[36px]" />
    </div>
  );
}

/**
 * Steering bar: drag along it to turn the wheel (it keeps its position), hold the arrows to nudge,
 * tap "centre" to straighten. Port is always on the left.
 */
function SteerBar() {
  const t = useT();
  const helm = useHud((s) => s.helm);
  const rudder = useHud((s) => s.rudder);
  const hl = useHighlight('helm');
  const hlCenter = useHighlight('helmCenter');
  const drag = useRef<{ x: number; start: number } | null>(null);
  const nudge = useRef<number | null>(null);
  const set = (v: number) => engine.setHelm(clamp(v, -1, 1));
  const W = 190;

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
  const nudgeProps = (dir: number) => ({
    onPointerDown: () => startNudge(dir),
    onPointerUp: stopNudge,
    onPointerLeave: stopNudge,
    onPointerCancel: stopNudge,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  return (
    <div className="flex items-center gap-1" dir="ltr" data-testid="helm">
      <button className="btn bs glass btn-port w-12 !min-h-[48px] text-lg" aria-label="port" data-testid="helm-port" {...nudgeProps(-1)}>
        ◀
      </button>
      <div
        className={`glass rounded-xl relative touch-none ${hl ? 'hl' : ''}`}
        style={{ width: W, height: 48 }}
        data-testid="wheel"
        onPointerDown={(e) => {
          try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* synthetic events */ }
          drag.current = { x: e.clientX, start: engine.state.input.helm };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          set(drag.current.start + ((e.clientX - drag.current.x) / (W / 2)) * 1.0);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onDoubleClick={() => set(0)}
      >
        {/* centre mark and port/starboard halves */}
        <div className="absolute inset-y-2 left-2 right-1/2 rounded-s-md bg-red-500/10" />
        <div className="absolute inset-y-2 right-2 left-1/2 rounded-e-md bg-emerald-500/10" />
        <div className="absolute inset-y-1.5 left-1/2 w-px bg-white/50" />
        <div
          className="absolute top-1 bottom-1 w-6 -ml-3 rounded-md bg-amber-300/90 shadow"
          style={{ left: `${50 + helm * 44}%` }}
        />
        <div className="absolute inset-x-0 bottom-0 text-center text-[9.5px] font-bold tnum pointer-events-none">
          <span className={rudder < -1 ? 'text-port' : rudder > 1 ? 'text-stbd' : 'text-slate-200'}>
            {t('rudder')} {Math.abs(rudder).toFixed(0)}° {rudder < -1 ? 'P' : rudder > 1 ? 'S' : ''}
          </span>
        </div>
      </div>
      <button className="btn bs glass btn-stbd w-12 !min-h-[48px] text-lg" aria-label="starboard" data-testid="helm-stbd" {...nudgeProps(1)}>
        ▶
      </button>
      <button className={`btn bs glass !min-h-[48px] ${hlCenter ? 'hl' : ''}`} data-testid="helm-center" onClick={() => set(0)}>
        {t('center')}
      </button>
    </div>
  );
}

const CREW_IDS = new Set<string>([
  'prepareTack', 'tack', 'prepareGybe', 'gybe', 'hoistMain', 'lowerMain', 'trimMain', 'easeMain', 'centerMain',
  'releaseJibPort', 'trimJibPort', 'trimJibStarboard', 'releaseJibStarboard', 'unfurlJib', 'furlJib',
]);

/**
 * Compact training card: objective (tap to expand), current guided step with its hint, and the
 * crew command(s) the step asks for as buttons, so the drawer does not need to be opened.
 */
function PhoneTrainingCard() {
  const t = useT();
  const lang = useLang();
  const h = useHud();
  const ev = runtime.evaluator;
  const [expanded, setExpanded] = useState(false);
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
  const cmds = ev.mode === 'guided' ? ((step?.highlight ?? []).filter((x) => CREW_IDS.has(x)) as CrewCommandId[]) : [];
  return (
    <div className="flex flex-col items-center gap-1 w-[min(330px,40vw)]" data-testid="training-overlay">
      <div className="glass rounded-xl px-2 py-1 w-full" onClick={() => setExpanded((x) => !x)}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11.5px] font-bold text-amber-200 truncate">{def.title[lang]}</span>
          <span className="text-[10px] text-slate-300 tnum whitespace-nowrap">
            {Math.floor(h.elapsed)}/{def.timeLimit}
            {t('seconds')} {expanded ? '▴' : '▾'}
          </span>
        </div>
        {(expanded || ev.mode !== 'guided') && (
          <div className="text-[11px] leading-snug" data-testid="objective">{def.objective[lang]}</div>
        )}
        {ev.mode === 'guided' && step && (
          <div className="mt-0.5" data-testid="guided-step">
            <div className="text-[11px] text-sky-300 font-bold leading-tight">
              {h.currentStep + 1}/{def.steps.length}: {step.title[lang]}
            </div>
            <div className={`text-[10.5px] leading-snug text-slate-100 ${expanded ? '' : 'line-clamp-2'}`}>{step.hint[lang]}</div>
          </div>
        )}
        {cmds.length > 0 && (
          <div className="flex gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
            {cmds.map((c) => (
              <Cmd key={c} id={c} className="flex-1 !min-h-[34px]" />
            ))}
          </div>
        )}
        {ev.mode !== 'exam' && (
          <div className="flex gap-1 mt-1">
            {h.stepStatus.map((s, i) => (
              <div key={i} className={`h-1 flex-1 rounded ${s === 'done' ? 'bg-emerald-400' : s === 'skipped' ? 'bg-slate-500' : s === 'active' ? 'bg-sky-400' : 'bg-white/15'}`} />
            ))}
          </div>
        )}
        {h.successProgress > 0 && (
          <div className="mt-1 text-[10.5px] text-emerald-300 flex items-center gap-2">
            {t('holding')}
            <div className="h-1.5 flex-1 bg-white/10 rounded">
              <div className="h-full bg-emerald-400 rounded" style={{ width: `${h.successProgress * 100}%` }} />
            </div>
          </div>
        )}
      </div>
      {showToast && h.toast && (
        <div className="glass rounded-xl px-2 py-1 w-full border-red-400/50 bg-red-950/60" data-testid="error-toast">
          <div className="text-[11px] font-bold text-red-300">
            {t(`cat.${h.toast.error.category}`)}: {h.toast.error.message[lang]}
          </div>
          <div className="text-[10.5px] text-slate-200">{h.toast.error.suggestion[lang]}</div>
        </div>
      )}
    </div>
  );
}
