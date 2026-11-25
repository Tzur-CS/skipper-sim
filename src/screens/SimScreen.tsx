import { useEffect, useRef, useState } from 'react';
import { Scene } from '../rendering/Scene';
import { view } from '../rendering/cameras/view';
import { InstrumentPanel } from '../components/instruments/InstrumentPanel';
import { Compass } from '../components/instruments/Compass';
import { Helm } from '../components/controls/Helm';
import { SailControls } from '../components/controls/SailControls';
import { TrainingOverlay, WarningBanner } from '../components/cockpit/TrainingOverlay';
import { TopBar } from '../components/cockpit/TopBar';
import { FreeSailPanel } from '../components/cockpit/FreeSailPanel';
import { useApp, useT } from '../store/appStore';
import { startRuntime } from '../store/runtime';
import { clamp } from '../simulation/math';

export function SimScreen() {
  const session = useApp((s) => s.session);
  const paused = useApp((s) => s.paused);
  const setPaused = useApp((s) => s.setPaused);
  const camera = useApp((s) => s.camera);
  const t = useT();
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    startRuntime(session);
  }, [session]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) setPaused(true);
    };
    const onResize = () => setPortrait(window.innerHeight > window.innerWidth);
    onResize();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [setPaused]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-sea-900" data-testid="sim-screen">
      <div
        className="absolute inset-0"
        data-testid="viewport"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY };
          try { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); } catch { /* synthetic events */ }
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dx = e.clientX - drag.current.x;
          const dy = e.clientY - drag.current.y;
          drag.current = { x: e.clientX, y: e.clientY };
          view.yaw = clamp(view.yaw + dx * 0.005, -Math.PI, Math.PI);
          view.pitch = clamp(view.pitch + dy * 0.004, -1, 1);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onWheel={(e) => {
          view.zoom = clamp(view.zoom * (e.deltaY > 0 ? 1.1 : 0.9), 0.4, 3);
        }}
      >
        <Scene />
      </div>

      {/* HUD layout uses physical positions (left/right) so RTL never swaps port and starboard. */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="hud-scale absolute inset-0">
        <div className="absolute top-[max(env(safe-area-inset-top),6px)] left-[max(env(safe-area-inset-left),6px)] pointer-events-auto flex flex-col gap-1">
          <TopBar />
          <InstrumentPanel />
        </div>
        <div className="absolute top-[max(env(safe-area-inset-top),6px)] right-[max(env(safe-area-inset-right),8px)] pointer-events-auto flex flex-col items-end gap-5">
          <Compass />
        </div>
        <div className="absolute top-[max(env(safe-area-inset-top),6px)] left-[calc(max(env(safe-area-inset-left),6px)+270px)] pointer-events-auto">
          {session.kind === 'scenario' ? <TrainingOverlay /> : <FreeSailPanel />}
        </div>
        <div className="absolute bottom-[max(env(safe-area-inset-bottom),8px)] left-[max(env(safe-area-inset-left),8px)] pointer-events-auto">
          <Helm />
        </div>
        <div className="absolute bottom-[max(env(safe-area-inset-bottom),8px)] right-[max(env(safe-area-inset-right),8px)] pointer-events-auto">
          <SailControls />
        </div>
        <WarningBanner />
        {paused && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto bg-black/40" onClick={() => setPaused(false)} data-testid="paused">
            <div className="glass rounded-2xl px-6 py-4 text-xl font-bold">▶ {t('resume')}</div>
          </div>
        )}
        {portrait && (
          <div className="absolute bottom-1/2 inset-x-4 text-center glass rounded-xl p-2 text-sm pointer-events-none" data-testid="rotate-hint">
            📱↻ {t('rotateHint')}
          </div>
        )}
        {camera === 'helm' && <div className="sr-only">helm view</div>}
        </div>
      </div>
    </div>
  );
}
