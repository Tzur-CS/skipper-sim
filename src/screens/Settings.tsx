import { useState } from 'react';
import { useApp, useT } from '../store/appStore';

export function Settings() {
  const t = useT();
  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);
  const clearHistory = useApp((s) => s.clearHistory);
  const go = useApp((s) => s.go);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="fixed inset-0 overflow-y-auto bg-sea-900 safe-t safe-b safe-l safe-r" data-testid="settings">
      <div className="max-w-xl mx-auto px-3 py-3 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button className="btn" onClick={() => go('home')} data-testid="settings-back">
            ← {t('back')}
          </button>
          <h1 className="text-xl font-bold">{t('settings')}</h1>
        </div>
        <div className="glass rounded-xl p-3 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="flex-1">{t('language')}</span>
            <button className={`btn ${settings.lang === 'he' ? 'btn-primary' : ''}`} data-testid="lang-he" onClick={() => setSettings({ lang: 'he' })}>
              עברית
            </button>
            <button className={`btn ${settings.lang === 'en' ? 'btn-primary' : ''}`} data-testid="lang-en" onClick={() => setSettings({ lang: 'en' })}>
              English
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-1">{t('quality')}</span>
            {(['auto', 'low', 'high'] as const).map((q) => (
              <button key={q} className={`btn ${settings.quality === q ? 'btn-primary' : ''}`} onClick={() => setSettings({ quality: q })}>
                {t(`quality${q[0].toUpperCase()}${q.slice(1)}`)}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2">
            <span className="flex-1">{t('cameraHeel')}</span>
            <input type="checkbox" className="w-6 h-6" checked={settings.cameraHeel} onChange={(e) => setSettings({ cameraHeel: e.target.checked })} />
          </label>
          <label className="flex items-center gap-2">
            <span className="flex-1">{t('showNoGo')}</span>
            <input type="checkbox" className="w-6 h-6" checked={settings.showNoGo} onChange={(e) => setSettings({ showNoGo: e.target.checked })} />
          </label>
          {confirming ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm">{t('confirmClear')}</span>
              <button className="btn btn-primary" onClick={() => { clearHistory(); setConfirming(false); }}>✓</button>
              <button className="btn" onClick={() => setConfirming(false)}>✕</button>
            </div>
          ) : (
            <button className="btn" onClick={() => setConfirming(true)}>
              🗑 {t('clearProgress')}
            </button>
          )}
        </div>
        <div className="glass rounded-xl p-3 text-sm">
          <h2 className="font-bold">{t('about')}</h2>
          <p className="text-slate-300">{t('aboutText')}</p>
          <p className="text-slate-400 text-xs mt-2">{t('disclaimer')}</p>
        </div>
      </div>
    </div>
  );
}
