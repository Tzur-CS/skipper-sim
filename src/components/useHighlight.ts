import { useHud } from '../store/hudStore';
import { runtime } from '../store/runtime';

/** True when the current guided-mode step asks to highlight this control. */
export function useHighlight(id: string): boolean {
  const step = useHud((s) => s.currentStep);
  const ev = runtime.evaluator;
  if (!ev || ev.mode !== 'guided') return false;
  return ev.def.steps[step]?.highlight?.includes(id) ?? false;
}
