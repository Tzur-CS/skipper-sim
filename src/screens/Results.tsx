import { useApp, useLang, useT } from '../store/appStore';
import { getScenario } from '../training/scenarios';
import type { TrainingResult } from '../training/evaluation/evaluator';

function Bar({ label, value }: { label: string; value: number }) {
  const c = value >= 80 ? '#3fb950' : value >= 60 ? '#d29922' : '#f85149';
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-36 truncate">{label}</span>
      <div className="flex-1 h-2.5 bg-white/10 rounded">
        <div className="h-full rounded" style={{ width: `${value}%`, background: c }} />
      </div>
      <span className="w-8 tnum text-end">{value}</span>
    </div>
  );
}

function eventText(e: TrainingResult['timeline'][number], t: (k: string) => string): string {
  let s = t(`ev.${e.type}`);
  if (e.type === 'crewCommand' && e.data?.command) s += `: ${t(`cmd.${e.data.command}`)}`;
  if (e.type === 'crewReport') s += `: ${t(e.data?.side === 'main' ? 'mainsail' : e.data?.side === 'furler' ? 'furler' : e.data?.side === 'port' ? 'port' : 'starboard')} – ${t(e.data?.ready ? 'reportReady' : 'reportNotYet')}`;
  if (e.type === 'tackChanged' && e.data?.to) s += ` → ${t(`tack.${e.data.to}`)}`;
  if (e.type === 'pointOfSailChanged' && e.data?.to) s += ` → ${t(`pos.${e.data.to}`)}`;
  if ((e.type === 'sheetEased' || e.type === 'sheetTrimmed') && e.data?.line) s += ` (${t(e.data.line === 'jibPort' ? 'jibPortSheet' : e.data.line === 'jibStarboard' ? 'jibStbdSheet' : String(e.data.line))})`;
  if (e.data?.phase) s += ` (${t(`${e.data.phase}_`)})`;
  if (e.type === 'gateCrossed') s += ` (${t(e.data?.dir === 'in' ? 'gateIn' : 'gateOut')})`;
  if ((e.type === 'vesselCpa' || e.type === 'closeQuarters' || e.type === 'collision') && e.data?.kind) s += `: ${t(`vessel.${e.data.kind}`)}${typeof e.data.dist === 'number' ? ` ${e.data.dist} m` : ''}`;
  if (e.type === 'answer') s += e.data?.correct ? ' ✓' : ' ✗';
  if (e.type === 'throttleChanged' && typeof e.data?.throttle === 'number') s += `: ${Math.round(e.data.throttle * 100)}%`;
  return s;
}

export function Results() {
  const t = useT();
  const lang = useLang();
  const r = useApp((s) => s.lastResult);
  const go = useApp((s) => s.go);
  const startSession = useApp((s) => s.startSession);
  const session = useApp((s) => s.session);
  if (!r) return null;
  const def = getScenario(r.scenarioId, r.variant);
  const timeline = r.timeline.filter((e) => e.type !== 'sheetEased' && e.type !== 'sheetTrimmed').slice(0, 40);
  return (
    <div className="fixed inset-0 overflow-y-auto bg-sea-900 safe-t safe-b safe-l safe-r" data-testid="results">
      <div className="max-w-5xl mx-auto px-3 py-3 grid md:grid-cols-2 gap-3">
        <div className="flex flex-col gap-3">
          <div className="glass rounded-xl p-3">
            <div className="text-sm text-slate-300">{t('results')} · {def.title[lang]}</div>
            <div className="flex items-center gap-3 mt-1">
              <div className={`text-4xl font-extrabold tnum ${r.success ? 'text-emerald-400' : 'text-red-400'}`} data-testid="result-score">
                {r.score}
              </div>
              <div>
                <div className={`text-lg font-bold ${r.success ? 'text-emerald-300' : 'text-red-300'}`} data-testid="result-status">
                  {r.success ? t('success') : r.reason === 'timeout' ? t('timeout') : t('failure')}
                </div>
                <div className="text-xs text-slate-300">
                  {t('overallScore')} · {t(`mode${r.mode[0].toUpperCase()}${r.mode.slice(1)}`)} · {t('duration')} {r.duration}
                  {t('seconds')} · {t('steps')} {r.stepsDone}/{r.stepsTotal}
                </div>
                {r.failMessage && <div className="text-sm text-red-300 font-semibold" data-testid="fail-message">{r.failMessage[lang]}</div>}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 mt-3">
              <Bar label={t('completion')} value={r.areas.completion} />
              <Bar label={t('steering')} value={r.areas.steering} />
              <Bar label={t('sails')} value={r.areas.sails} />
              <Bar label={t('crewCoordination')} value={r.areas.crew} />
            </div>
            {r.mode === 'exam' && <p className="text-xs text-amber-200 mt-2">{t('examNote')}</p>}
            <div className="flex gap-2 mt-3">
              <button className="btn btn-primary flex-1" data-testid="result-retry" onClick={() => startSession({ ...session })}>
                ↺ {t('tryAgain')}
              </button>
              <button className="btn flex-1" data-testid="result-other" onClick={() => go('select')}>
                {t('otherScenario')}
              </button>
              <button className="btn" onClick={() => go('home')}>
                {t('home')}
              </button>
            </div>
          </div>
          <div className="glass rounded-xl p-3">
            <h2 className="font-bold mb-1">{t('timeline')}</h2>
            <ol className="text-xs flex flex-col gap-0.5 max-h-72 overflow-y-auto" data-testid="timeline">
              {timeline.map((e, i) => (
                <li key={i} className="flex gap-2">
                  <span className="tnum text-slate-400 w-12" dir="ltr">{e.t.toFixed(1)}s</span>
                  <span className="flex-1">{eventText(e, t)}</span>
                  <span className="tnum text-slate-400" dir="ltr">{e.speed.toFixed(1)}kt {e.heading}°</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="glass rounded-xl p-3">
          <h2 className="font-bold mb-2">{t('errors')}</h2>
          {r.errors.length === 0 ? (
            <p className="text-emerald-300 text-sm">{t('noErrors')}</p>
          ) : (
            <ul className="flex flex-col gap-2" data-testid="errors">
              {r.errors.map((e, i) => (
                <li key={i} className="rounded-lg bg-white/5 p-2 text-sm">
                  <div className="flex gap-2 items-baseline">
                    <span className="text-[10px] px-1.5 rounded bg-red-500/30 text-red-200">{t(`cat.${e.category}`)}</span>
                    <b className="flex-1">{e.message[lang]}</b>
                    <span className="text-[10px] text-slate-400 tnum" dir="ltr">{e.t}s −{e.penalty}</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    <b>{t('why')}:</b> {e.explanation[lang]}
                  </div>
                  <div className="text-xs text-sky-200">
                    <b>{t('improve')}:</b> {e.suggestion[lang]}
                  </div>
                  {r.recoveries.includes(e.ruleId) && <div className="text-xs text-emerald-300">✓ {t('recovered')}</div>}
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-slate-400 mt-3">{t('disclaimer')}</p>
        </div>
      </div>
    </div>
  );
}
