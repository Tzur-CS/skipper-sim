import { useApp, useLang, useT } from '../store/appStore';
import { SCENARIOS } from '../training/scenarios';

export function Home() {
  const t = useT();
  const lang = useLang();
  const go = useApp((s) => s.go);
  const startSession = useApp((s) => s.startSession);
  const history = useApp((s) => s.history);
  return (
    <div className="fixed inset-0 overflow-y-auto bg-gradient-to-b from-sea-800 to-sea-950 safe-t safe-b safe-l safe-r" data-testid="home">
      <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col gap-4 min-h-full">
        <header className="flex items-center gap-3">
          <img src="./icon.svg" alt="" className="w-12 h-12 rounded-xl" />
          <div>
            <h1 className="text-2xl font-extrabold">{t('appName')}</h1>
            <p className="text-sm text-slate-300">{t('appSubtitle')}</p>
          </div>
        </header>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button className="btn btn-primary min-h-[72px] text-lg" data-testid="home-training" onClick={() => go('select')}>
            🧭 {t('startTraining')}
          </button>
          <button className="btn min-h-[72px] text-lg" data-testid="home-free" onClick={() => startSession({ kind: 'free' })}>
            ⛵ {t('freeSailing')}
          </button>
          <a href="#progress" className="btn min-h-[72px] text-lg flex items-center justify-center">
            📈 {t('progress')}
          </a>
          <button className="btn min-h-[72px] text-lg" data-testid="home-settings" onClick={() => go('settings')}>
            ⚙️ {t('settings')}
          </button>
        </div>
        <section id="progress" className="glass rounded-xl p-3">
          <h2 className="font-bold mb-2">{t('progress')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SCENARIOS.map((s) => {
              const runs = history.filter((h) => h.scenarioId === s.id);
              const best = runs.reduce((m, r) => Math.max(m, r.score), 0);
              const ok = runs.some((r) => r.success);
              return (
                <div key={s.id} className="rounded-lg bg-white/5 p-2 text-sm">
                  <div className="font-semibold">
                    {s.order}. {s.title[lang]} {ok ? '✅' : ''}
                  </div>
                  <div className="text-slate-300 text-xs">
                    {runs.length ? `${t('best')}: ${best} · ${t('attempts')}: ${runs.length}` : t('noAttempts')}
                  </div>
                  <div className="h-1.5 bg-white/10 rounded mt-1">
                    <div className="h-full rounded bg-emerald-400" style={{ width: `${best}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <p className="text-xs text-slate-400 mt-auto">{t('disclaimer')}</p>
      </div>
    </div>
  );
}
