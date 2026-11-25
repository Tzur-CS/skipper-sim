import { useApp, useT } from '../../store/appStore';
import { finishRuntime, restartRuntime } from '../../store/runtime';
import { resetView } from '../../rendering/cameras/view';
import type { CameraMode } from '../../store/appStore';

const I = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);
const ICON = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  view: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  pause: 'M8 5v14M16 5v14',
  play: 'M7 5l12 7-12 7z',
  restart: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  flag: 'M5 21V4h11l-2 4 2 4H5',
};

export function TopBar() {
  const t = useT();
  const camera = useApp((s) => s.camera);
  const setCamera = useApp((s) => s.setCamera);
  const paused = useApp((s) => s.paused);
  const setPaused = useApp((s) => s.setPaused);
  const go = useApp((s) => s.go);
  const isScenario = useApp((s) => s.session.kind === 'scenario');
  const cams: CameraMode[] = ['helm', 'chase', 'top'];
  const label: Record<CameraMode, string> = { helm: t('camHelm'), chase: t('camChase'), top: t('camTop') };
  return (
    <div className="flex items-center gap-1" data-testid="topbar">
      <button className="btn bs glass" data-testid="btn-menu" onClick={() => go(isScenario ? 'select' : 'home')}>
        <I d={ICON.menu} />
      </button>
      <button
        className="btn bs glass btn-primary"
        data-testid="cam-cycle"
        data-camera={camera}
        onClick={() => setCamera(cams[(cams.indexOf(camera) + 1) % cams.length])}
      >
        🎥 {label[camera]}
      </button>
      <button className="btn bs glass" data-testid="btn-reset-view" title={t('resetView')} onClick={resetView}>
        <I d={ICON.view} />
      </button>
      <button className="btn bs glass" data-testid="btn-pause" onClick={() => setPaused(!paused)}>
        <I d={paused ? ICON.play : ICON.pause} />
      </button>
      <button className="btn bs glass" data-testid="btn-restart" title={t('restart')} onClick={restartRuntime}>
        <I d={ICON.restart} />
      </button>
      {isScenario && (
        <button className="btn bs glass" data-testid="btn-finish" title={t('finish')} onClick={finishRuntime}>
          <I d={ICON.flag} />
        </button>
      )}
    </div>
  );
}
