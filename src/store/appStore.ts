import { create } from 'zustand';
import type { Lang } from '../i18n/translations';
import { translate } from '../i18n/translations';
import type { TrainingMode, TrainingResult } from '../training/evaluation/evaluator';
import { load, loadArray, save } from './storage';

export type Screen = 'home' | 'select' | 'sim' | 'results' | 'settings';
export type CameraMode = 'helm' | 'chase' | 'top' | 'winches';

export interface Settings {
  lang: Lang;
  quality: 'auto' | 'low' | 'high';
  cameraHeel: boolean;
  showNoGo: boolean;
}

export type Session = { kind: 'free' } | { kind: 'scenario'; scenarioId: string; variant?: string; mode: TrainingMode };

interface AppState {
  screen: Screen;
  settings: Settings;
  session: Session;
  lastResult: TrainingResult | null;
  history: TrainingResult[];
  camera: CameraMode;
  paused: boolean;
  go: (s: Screen) => void;
  setSettings: (p: Partial<Settings>) => void;
  startSession: (s: Session) => void;
  setResult: (r: TrainingResult) => void;
  clearHistory: () => void;
  setCamera: (c: CameraMode) => void;
  setPaused: (p: boolean) => void;
}

const SETTINGS_KEY = 'skipperSim.settings.v1';
const HISTORY_KEY = 'skipperSim.history.v1';

const defaultSettings: Settings = { lang: 'he', quality: 'auto', cameraHeel: true, showNoGo: true };

export const useApp = create<AppState>((set, get) => ({
  screen: 'home',
  settings: load(SETTINGS_KEY, defaultSettings),
  session: { kind: 'free' },
  lastResult: null,
  history: loadArray<TrainingResult>(HISTORY_KEY),
  camera: 'helm',
  paused: false,
  go: (screen) => set({ screen }),
  setSettings: (p) => {
    const settings = { ...get().settings, ...p };
    save(SETTINGS_KEY, settings);
    set({ settings });
  },
  startSession: (session) => set({ session, screen: 'sim', paused: false }),
  setResult: (r) => {
    const history = [...get().history, r].slice(-200);
    save(HISTORY_KEY, history);
    set({ lastResult: r, history, screen: 'results' });
  },
  clearHistory: () => {
    save(HISTORY_KEY, []);
    set({ history: [] });
  },
  setCamera: (camera) => set({ camera }),
  setPaused: (paused) => set({ paused }),
}));

export function useT() {
  const lang = useApp((s) => s.settings.lang);
  return (key: string) => translate(lang, key);
}

export function useLang() {
  return useApp((s) => s.settings.lang);
}
