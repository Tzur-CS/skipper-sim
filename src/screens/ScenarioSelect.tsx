import { useState } from 'react';
import { useApp, useLang, useT } from '../store/appStore';
import { SCENARIOS } from '../training/scenarios';
import type { TrainingMode } from '../training/evaluation/evaluator';

export function ScenarioSelect() {
  const t = useT();
  const lang = useLang();
  const go = useApp((s) => s.go);
  const startSession = useApp((s) => s.startSession);
  const history = useApp((s) => s.history);
  const [mode, setMode] = useState<TrainingMode>('guided');
  const [variants, setVariants] = useState<Record<string, string>>({});
  const modes: TrainingMode[] = ['guided', 'practice', 'exam'];
  return (
    <div className="fixed inset-0 overflow-y-auto bg-sea-900 safe-t safe-b safe-l safe-r" data-testid="select">
      <div className="max-w-5xl mx-auto px-3 py-3 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button className="btn" onClick={() => go('home')} data-testid="select-back">
            ← {t('back')}
          </button>
          <h1 className="text-xl font-bold flex-1">{t('chooseScenario')}</h1>
        </div>
        <div className="glass rounded-xl p-2 flex flex-wrap gap-2 items-center">
          <span className="text-sm font-semibold">{t('mode')}:</span>
          {modes.map((m) => (
            <button key={m} className={`btn text-sm ${mode === m ? 'btn-primary' : ''}`} data-testid={`mode-${m}`} onClick={() => setMode(m)}>
              {t(`mode${m[0].toUpperCase()}${m.slice(1)}`)}
              <span className="block text-[10px] font-normal opacity-80">{t(`mode${m[0].toUpperCase()}${m.slice(1)}Desc`)}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {SCENARIOS.map((s) => {
            const runs = history.filter((h) => h.scenarioId === s.id);
            const best = runs.reduce((m, r) => Math.max(m, r.score), 0);
            const v = variants[s.id] ?? s.variants?.[0].id;
            return (
              <div key={s.id} className="glass rounded-xl p-2.5 flex flex-col gap-1.5" data-testid={`scenario-${s.id}`}>
                <div className="font-bold">
                  {s.order}. {s.title[lang]}
                </div>
                <div className="text-xs text-slate-300">{s.summary[lang]}</div>
                {s.variants && (
                  <div className="flex gap-1">
                    {s.variants.map((vv) => (
                      <button key={vv.id} className={`btn text-[11px] min-h-[32px] flex-1 ${v === vv.id ? 'btn-primary' : ''}`} data-testid={`variant-${s.id}-${vv.id}`} onClick={() => setVariants({ ...variants, [s.id]: vv.id })}>
                        {vv.label[lang]}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-auto">
                  <span className="text-[11px] text-slate-400 flex-1">{runs.length ? `${t('best')}: ${best}` : t('noAttempts')}</span>
                  <button className="btn btn-primary" data-testid={`start-${s.id}`} onClick={() => startSession({ kind: 'scenario', scenarioId: s.id, variant: v, mode })}>
                    ▶ {t('start')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400">{t('disclaimer')}</p>
      </div>
    </div>
  );
}
