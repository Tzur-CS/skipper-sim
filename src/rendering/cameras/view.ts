/** Mutable look offsets driven by touch drag (kept outside React to avoid re-renders). */
export const view = { yaw: 0, pitch: 0, zoom: 1 };
export function resetView(): void {
  view.yaw = 0;
  view.pitch = 0;
  view.zoom = 1;
}
