import { useState } from 'react';
import { useApp, useLang, useT, type LearnTopic } from '../store/appStore';
import { SCENARIOS } from '../training/scenarios';
import { HeroArt } from '../components/HeroArt';
import { LINKS } from '../content/learn';

const GEAR = 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.4-2.5a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.4-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3.5h-4l-.4 2.6c-.6.3-1.2.6-1.7 1l-2.5-1-2 3.4L6.6 11a7.5 7.5 0 0 0 0 2l-2.1 1.6 2 3.4 2.5-1c.5.4 1.1.7 1.7 1l.4 2.5h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.4-2.1-1.5Z';

/**
 * Home: what the app is for in one line, two big actions, learning pages, and the training
 * progress (collapsible) at the bottom. Works in portrait and landscape.
 */
export function Home() {
  const t = useT();
  const lang = useLang();
  const go = useApp((s) => s.go);
  const startSession = useApp((s) => s.startSession);
  const openLearn = useApp((s) => s.openLearn);
  const openProgress = useApp((s) => s.openProgress);
  const history = useApp((s) => s.history);
  const [showProgress, setShowProgress] = useState(false);

  const stats = SCENARIOS.map((s) => {
    const runs = history.filter((h) => h.scenarioId === s.id);
    return { s, runs, best: runs.reduce((m, r) => Math.max(m, r.score), 0), ok: runs.some((r) => r.success) };
  });
  const doneCount = stats.filter((x) => x.ok).length;

  const topics: Array<{ id: LearnTopic; icon: string; title: string; desc: string }> = [
    { id: 'licence', icon: '🪪', title: t('topicLicence'), desc: t('topicLicenceDesc') },
    { id: 'terms', icon: '🧭', title: t('topicTerms'), desc: t('topicTermsDesc') },
    { id: 'links', icon: '🔗', title: t('topicLinks'), desc: t('topicLinksDesc') },
  ];

  return (
    <div className="fixed inset-0 overflow-y-auto bg-gradient-to-b from-sea-800 to-sea-950 safe-t safe-b safe-l safe-r" data-testid="home">
      <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col gap-4 min-h-full">
        {/* Title row with a small settings icon */}
        <header className="flex items-center gap-3">
          <img src="./icon.svg" alt="" className="w-10 h-10 rounded-xl" />
          <h1 className="text-xl font-extrabold flex-1">{t('appName')}</h1>
          <button className="w-10 h-10 rounded-full grid place-items-center bg-white/5 border border-white/10 active:bg-white/15" aria-label={t('settings')} title={t('settings')} data-testid="home-settings" onClick={() => go('settings')}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
              <path d={GEAR} />
            </svg>
          </button>
        </header>

        {/* Hero: the purpose in a few words over the illustration, then the two main actions */}
        <section className="flex flex-col gap-3">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-xl min-h-[170px] lp:min-h-[130px] md:min-h-[230px] flex items-end">
            <HeroArt className="absolute inset-0 w-full h-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-sea-950/95 via-sea-950/55 to-transparent" />
            <div className="relative p-3 md:p-5">
              <h2 className="text-2xl md:text-3xl font-extrabold leading-tight drop-shadow">{t('heroTitle')}</h2>
              <p className="text-slate-100 mt-1 text-[14.5px] md:text-base leading-snug max-w-xl drop-shadow" data-testid="home-purpose">
                {t('heroText')}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn btn-primary min-h-[84px] lp:min-h-[60px] text-lg flex flex-col lp:flex-row items-center justify-center gap-1 lp:gap-2 shadow-lg shadow-blue-900/40" data-testid="home-training" onClick={() => go('select')}>
              <span className="text-2xl leading-none">🧭</span>
              {t('startTraining')}
            </button>
            <button className="btn min-h-[84px] lp:min-h-[60px] text-lg flex flex-col lp:flex-row items-center justify-center gap-1 lp:gap-2 !bg-white/10" data-testid="home-free" onClick={() => startSession({ kind: 'free' })}>
              <span className="text-2xl leading-none">⛵</span>
              {t('freeSailing')}
            </button>
          </div>
        </section>

        {/* Learning pages */}
        <section>
          <h3 className="text-sm font-bold text-slate-300 mb-2">{t('learnTitle')}</h3>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
            {topics.map((x) => (
              <button key={x.id} className="glass rounded-xl p-3 text-start flex items-start gap-3 active:bg-white/10" data-testid={`learn-${x.id}`} onClick={() => openLearn(x.id)}>
                <span className="text-2xl leading-none">{x.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold">{x.title}</span>
                  <span className="block text-xs text-slate-300 leading-snug">{x.desc}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {LINKS.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-sky-200 active:bg-white/15">
                ↗ {l.title[lang]}
              </a>
            ))}
          </div>
        </section>

        {/* Training progress, pinned lower; the title toggles it */}
        <section className="glass rounded-xl mt-auto" id="progress">
          <button className="w-full flex items-center gap-3 p-3 text-start" data-testid="progress-toggle" aria-expanded={showProgress} onClick={() => setShowProgress((v) => !v)}>
            <span className="font-bold flex-1">📈 {t('progress')}</span>
            <span className="text-xs text-slate-300 tnum">
              {doneCount}/{SCENARIOS.length} {t('progressOf')}
            </span>
            <span className="text-slate-400">{showProgress ? '▴' : '▾'}</span>
          </button>
          <div className="h-1.5 mx-3 mb-3 bg-white/10 rounded -mt-1">
            <div className="h-full rounded bg-emerald-400" style={{ width: `${(doneCount / SCENARIOS.length) * 100}%` }} />
          </div>
          {showProgress && (
            <div className="px-3 pb-3" data-testid="progress-list">
              <p className="text-[11px] text-slate-400 mb-2">{t('tapForDetails')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {stats.map(({ s, runs, best, ok }) => (
                  <button key={s.id} className="rounded-lg bg-white/5 p-2 text-sm text-start active:bg-white/15" data-testid={`progress-${s.id}`} onClick={() => openProgress(s.id)}>
                    <div className="font-semibold">
                      {s.order}. {s.title[lang]} {ok ? '✅' : ''}
                    </div>
                    <div className="text-slate-300 text-xs">{runs.length ? `${t('best')}: ${best} · ${t('attempts')}: ${runs.length}` : t('noAttempts')}</div>
                    <div className="h-1.5 bg-white/10 rounded mt-1">
                      <div className="h-full rounded bg-emerald-400" style={{ width: `${best}%` }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
        <p className="text-[11px] text-slate-400">{t('disclaimer')}</p>
      </div>
    </div>
  );
}
