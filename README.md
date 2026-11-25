# Skipper Sailing Simulator – Mobile MVP (סימולטור משיט)

A mobile-first, client-side 3D sailing training simulator for students preparing for the Israeli
skipper licence (משיט 30). You stand at the helm of a ~40 ft sloop, steer with a touch wheel, give
crew commands, trim sails, and practise six drills with deterministic evaluation and feedback.

> Educational simulator only. Not a substitute for certified instruction and **not** an official
> licensing exam. All instructional content awaits review by a qualified sailing instructor –
> see [docs/INSTRUCTOR_REVIEW.md](docs/INSTRUCTOR_REVIEW.md).

## Quick start
```bash
npm install
npm run dev          # http://localhost:5173 (also on your LAN: open it from your phone)
npm test             # Vitest: physics + scenario engine (44 tests)
npm run build        # type-check + production PWA build → dist/
npm run preview      # serve dist/ on port 4173
npm run e2e          # Playwright e2e (Chromium with iPhone/iPad emulation), needs `npm run build` first
npm run build:single # one self-contained HTML file → dist-single/index.html
```
Node 20+ recommended. To test on an iPhone, run `npm run dev` and open the LAN URL in Safari, or
deploy `dist/` to any static host (HTTPS is required for the PWA "Add to Home Screen" install).

## Stack
React 19 + TypeScript + Vite, Three.js via React Three Fiber (+ drei `Sky`), Zustand, Tailwind CSS 4,
Vitest, Playwright, vite-plugin-pwa. No backend; progress and settings are kept in `localStorage`.
Capacitor-friendly: static `dist/`, relative base path, no server APIs.

## Architecture
```
src/
  simulation/      pure TS engine (no React/Three): config, math, wind, sails, boat, controls (crew), physics/engine
  training/        scenarios (data), evaluation (conditions + evaluator), scoring
  rendering/       R3F scene: yacht (procedural hull/rig), sails (procedural mesh), ocean shader, environment, cameras
  components/      HUD: instruments, compass, helm wheel, sail/crew controls, training overlay
                   compact/PhoneHud: phone layout (screens ≤520px tall): one-line instruments, steering bar,
                   mainsheet + working jib sheet always on screen, crew commands in a slide-in drawer,
                   guided step shows its command as a button
  screens/         Home, ScenarioSelect, SimScreen, Results, Settings
  store/           app store (screens/settings/history), throttled HUD store, runtime (engine + evaluator glue)
  i18n/            all UI text and sailing terminology (Hebrew default, English)
  tests/           Vitest unit/integration tests
tests/e2e/         Playwright browser tests
docs/              physics model, scenario format, instructor review list, asset licences
```
The engine is the single source of truth. It runs at a fixed 60 Hz step; the 3D scene reads it every
frame, and the 2D HUD gets a 10 Hz snapshot to avoid React re-renders. See
[docs/PHYSICS.md](docs/PHYSICS.md) and [docs/SCENARIOS.md](docs/SCENARIOS.md).

## Implemented features
- 3D open sea (lightweight per-pixel wave shader), sky, sun, horizon fog, tiled buoys for speed
  reference, wind streaks moving with the true wind, masthead wind indicator (windex).
- Procedural 40 ft sloop: lofted hull, deck, coachroof, cockpit, wheel that turns with the rudder,
  mast, spreaders, boom, mainsail, jib on a furler, port/starboard winches, mainsheet, both jib
  sheets (red = port, green = starboard), main halyard, furling line, forestay/backstay/shrouds.
- Dynamic sails: angle, camber, twist, hoisting/lowering along the mast, furling, luffing flutter,
  backing, transition between sides; boom rotation; visible heel.
- Cameras: first-person helm view (default, drag to look around, reset), outside chase view, top-down
  view with the no-go zone drawn on the water.
- Physics: true/apparent wind, no-go zone, trim-dependent drive, momentum, speed-dependent steering,
  heel, luffing, boom/jib behaviour through tacks and gybes, uncontrolled gybe detection, in irons.
- Controls: virtual wheel (drag, nudge buttons, centre), keyboard arrows on desktop; 15 crew
  commands in Hebrew; hold-to-adjust manual lines (mainsheet, both jib sheets, halyard, furler).
  Port controls are always on the left and starboard on the right, also in RTL.
- Instruments: speed, heading, TWS, AWS, AWA, heel, tack, point of sail, main/jib deployment,
  compass with true/apparent wind arrows and no-go sector, sail state (trimmed/luffing/aback/over-trimmed).
- Six data-driven drills (tack and gybe in both directions), guided/practice/exam modes,
  deterministic evaluator, results with score by area, errors with explanation and suggestion,
  recoveries, timeline; progress stored locally and shown on the home screen.
- Free sailing with live wind direction (0–360°) and speed (5–25 kt) and instant reset.
- Hebrew default with RTL, English option; PWA manifest and offline service worker;
  pause when the app goes to the background; safe-area and orientation handling.

## Testing – what was and was not verified
- **Unit/integration (Vitest, Node):** 44 tests: angle maths, apparent wind, tack/point-of-sail,
  no-go zone, trim vs speed, momentum, steering, sail deployment, tack/gybe transitions, irons,
  determinism/reset, and scripted runs of every scenario (success, failure/timeout, error detection,
  valid alternatives such as manual sheet handling, recovery).
- **Browser e2e (Playwright):** headless **Chromium** with iPhone 13 landscape and iPad landscape
  *emulation* (viewport, touch, device pixel ratio) and software WebGL. Checks: home → free sailing,
  touch steering, live wind change, camera modes, guided tack to results, uncontrolled-gybe warning,
  English switch, manual line control, localStorage progress, no console errors. Screenshots in
  `screenshots/`.
- **Not verified:** real iPhone/Safari (WebKit) on a physical device, real frame rate on phones,
  PWA install on iOS, multi-touch (simultaneous wheel + line buttons) on real hardware.

## Known limitations
- Physics is educational, not racing-grade (no leeway, waves, current, traveller, reefing, vang).
- Raise/lower drills use a steady "headway assist" instead of an engine simulation.
- Crew is represented by text acknowledgements and line motion, no human models or audio.
- Sail geometry is procedural, so extreme states (e.g. fully lowered main) look simplified.
- Look-around in the helm view is single-finger drag; pinch zoom is mouse-wheel only.
- Content and terminology are unreviewed (see instructor review list).

## Recommended next steps
1. Instructor review of procedures, wording and penalties; adjust `src/training/scenarios` and `src/i18n`.
2. Test on physical iPhones (Safari + installed PWA), measure FPS, add adaptive quality if needed.
3. Audio crew call-outs (pre-recorded Hebrew), haptics.
4. Reefing, traveller and vang; leeway and waves; gusts and wind shifts in free sailing.
5. More drills (heaving-to, sailing to a mark, MOB under sail) and instructor-defined drill packs.
6. Capacitor packaging for app stores.

## Licence of assets
See [docs/ASSETS.md](docs/ASSETS.md) – no third-party art assets are used.
