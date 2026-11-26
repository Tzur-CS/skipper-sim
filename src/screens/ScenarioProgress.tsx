import { useApp, useLang, useT } from '../store/appStore';
import { SCENARIOS } from '../training/scenarios';
import type { DetectedError } from '../training/evaluation/evaluator';

/**
 * Per-exercise progress: recent attempts, average score by area, and recurring mistakes with
 * what to improve (from the stored results, local to this device).
 */
export function ScenarioProgress() {
  const t = useT();
  const lang = useLang();
  const id = useApp((s) => s.progressScenario);
  const history = useApp((s) => s.history);
  const go = useApp((s) => s.go);
  const startSession = useApp((s) => s.startSession);
  const entry = SCENARIOS.find((s) => s.id === id);
  if (!entry) return null;
  const runs = history.filter((h) => h.scenarioId === id);
  const recent = runs.slice(-8).reverse();
  const avg = (k: 'completion' | 'steering' | 'sails' | 'crew') => (runs.length ? Math.round(runs.reduce((m, r) => m + r.areas[k], 0) / runs.length) : 0);
  const mistakes = new Map<string, { e: DetectedError; n: number }>();
  for (const r of runs) for (const e of r.errors) mistakes.set(e.ruleId, { e, n: (mistakes.get(e.ruleId)?.n ?? 0) + 1 });
  const sorted = [...mistakes.values()].sort((a, b) => b.n - a.n);
  const best = runs.reduce((m, r) => Math.max(m, r.score), 0);
  const bar = (v: number) => (v >= 80 ? '#3fb950' : v >= 60 ? '#d29922' : '#f85149');

  return (
    <div className="fixed inset-0 overflow-y-auto bg-gradient-to-b from-sea-800 to-sea-950 safe-t safe-b safe-l safe-r" data-testid="scenario-progress">
      <div className="max-w-3xl mx-auto px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button className="btn" data-testid="progress-back" onClick={() => go('home')}>
            {t('back')}
          </button>
          <h1 className="text-xl font-extrabold flex-1">
            {entry.order}. {entry.title[lang]}
          </h1>
          <button className="btn btn-primary" data-testid="progress-practise" onClick={() => startSession({ kind: 'scenario', scenarioId: entry.id, variant: entry.variants?.[0].id, mode: 'guided' })}>
            ▶ {t('practiseNow')}
          </button>
        </div>
        <p className="text-sm text-slate-300">{entry.summary[lang]}</p>

        {runs.length === 0 ? (
          <div className="glass rounded-xl p-4 text-center text-slate-300">{t('noAttempts')}</div>
        ) : (
          <>
            <section className="glass rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-extrabold tnum text-emerald-300">{best}</div>
                <div className="text-xs text-slate-300">{t('best')}</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold tnum">{runs.length}</div>
                <div className="text-xs text-slate-300">{t('attempts')}</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold tnum">{runs.filter((r) => r.success).length}</div>
                <div className="text-xs text-slate-300">{t('success')}</div>
              </div>
            </section>

            <section className="glass rounded-xl p-3">
              <h2 className="font-bold mb-2">{t('areaAverages')}</h2>
              {(
                [
                  ['completion', t('completion')],
                  ['steering', t('steering')],
                  ['sails', t('sails')],
                  ['crew', t('crewCoordination')],
                ] as const
              ).map(([k, label]) => (
                <div key={k} className="flex items-center gap-2 text-sm mb-1">
                  <span className="w-32 truncate">{label}</span>
                  <div className="flex-1 h-2.5 bg-white/10 rounded">
                    <div className="h-full rounded" style={{ width: `${avg(k)}%`, background: bar(avg(k)) }} />
                  </div>
                  <span className="w-8 tnum text-end">{avg(k)}</span>
                </div>
              ))}
            </section>

            <section className="glass rounded-xl p-3">
              <h2 className="font-bold mb-2">{t('commonMistakes')}</h2>
              {sorted.length === 0 ? (
                <p className="text-emerald-300 text-sm">{t('noMistakes')}</p>
              ) : (
                <ul className="flex flex-col gap-2" data-testid="progress-mistakes">
                  {sorted.map(({ e, n }) => (
                    <li key={e.ruleId} className="rounded-lg bg-white/5 p-2 text-sm">
                      <div className="flex gap-2 items-baseline">
                        <span className="text-[10px] px-1.5 rounded bg-red-500/30 text-red-200">{t(`cat.${e.category}`)}</span>
                        <b className="flex-1">{e.message[lang]}</b>
                        <span className="text-xs text-slate-300 tnum whitespace-nowrap">
                          ×{n} {t('timesSeen')}
                        </span>
                      </div>
                      <div className="text-xs text-sky-200 mt-1">
                        <b>{t('improve')}:</b> {e.suggestion[lang]}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="glass rounded-xl p-3">
              <h2 className="font-bold mb-2">{t('lastAttempts')}</h2>
              <ul className="flex flex-col gap-1 text-sm">
                {recent.map((r, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className={`w-10 tnum font-bold ${r.success ? 'text-emerald-300' : 'text-red-300'}`}>{r.score}</span>
                    <span className="flex-1 text-slate-300">
                      {t(`mode${r.mode[0].toUpperCase()}${r.mode.slice(1)}`)} · {r.duration}
                      {t('seconds')} · {r.errors.length} {t('errors')}
                    </span>
                    <span className="text-xs text-slate-400 tnum" dir="ltr">
                      {new Date(r.date).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB')}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
