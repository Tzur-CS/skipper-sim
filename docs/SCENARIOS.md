# Scenario configuration format

Scenarios are typed data in `src/training/scenarios/*.ts` (`ScenarioDef` in `types.ts`).
They are TypeScript so instructors' edits are type-checked, but contain no logic beyond
choosing mirrored values for direction variants. Text is `{ he, en }`.

```ts
{
  id: 'tack', variant: 'starboardToPort',
  title, objective, learningObjective,          // localized text
  initial: { heading, speed, wind: { trueFrom, trueSpeed }, mainHoist, mainsheet,
             jibDeployed, jibPortSheet, jibStarboardSheet, autoTrim? },
  headwayAssistKt?: 2.5,                        // steady headway (stands in for motoring)
  steps: [ { id, title, hint, done: Cond, holdSeconds?, optional?, highlight?: ['tack'], source } ],
  success: { cond: Cond, holdSeconds, requireAllSteps? },
  timeLimit: 100,
  rules: [ Rule, ... ],
  commonErrors: [ L ],
  review: { status: 'needsInstructorReview', notes: [...] },
}
```

## Conditions (`Cond`)
Composable: `{ all: [...] }`, `{ any: [...] }`, `{ not: ... }` plus:
`tack`, `pointOfSail`, `twaAbs`, `awaAbs`, `speed`, `heelAbs`, `yawRateAbs`, `rudderAbs`,
`mainHoist`, `mainsheet`, `mainTrim`, `mainLuff`, `mainIncidence`, `jibDeployed`, `jibTrim`,
`jibLuff`, `jibIncidence`, `jibSheet {side: port|starboard|leeward|windward, range}`,
`jibSide`, `jibBacked`, `boomSide`, `line {halyard|furler|mainsheet, moving: up|down}`,
`event {type, data?, since?}`, `command`, `crewReady`, `elapsed`. Ranges are `{min?, max?}`.

## Steps
Steps drive guided hints and the completion score. The evaluator advances when the current step's
condition holds (for `holdSeconds`). **Optional** steps (e.g. crew commands, a school preference)
are skipped if a later step completes first, so alternative valid approaches are accepted.
Success is judged on the **physical final state** (`success.cond` held for `holdSeconds`), not on
a button sequence.

## Rules (error detection and scoring)
| type | meaning |
|---|---|
| `requireBefore` | when `event` first occurs, `require` must already be true (e.g. "ready about" before the tack) |
| `checkAtEvent` | check a state condition at the moment of an event (e.g. mainsheet centred when the boom crosses) |
| `forbidEvent` | error if an event happens (uncontrolled gybe, in irons, gybing instead of tacking) |
| `condDuration` | error if a condition holds longer than N s (jib aback, luffing, over-heel) |
| `eventGap` | error if too long between two events (slow turn through the no-go zone) |
| `atEnd` | checked at completion |

Every rule has `category` (procedural, timing, sail, steering, unsafe, crew), `area` (completion,
steering, sails, crew), `penalty`, `message`, `explanation`, `suggestion`, `source`
(`general` principle / `school` preference / `vessel` specific), optional `after` event gate,
`maxCount`, and `recoverable` (reported as a successful recovery if the drill still succeeds).

## Scoring
Each area starts at 100 minus its penalties. Completion = 100 on success, otherwise 60 × steps
done. Overall = 0.4 completion + 0.2 steering + 0.25 sails + 0.15 crew (`scoring/score.ts`);
failures are capped at 59.

## Modes
Guided: objective + step hints + highlighted controls + immediate error feedback.
Practice: objective + immediate error feedback. Exam: objective only; feedback only in results.
