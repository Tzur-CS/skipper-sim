import { getScenario } from '../src/training/scenarios';
import { setup } from '../src/tests/helpers';
const which = process.argv[2];
const log = (e: any) => { const s = e.state; console.log(`t${s.t.toFixed(1)} hdg${s.boat.heading.toFixed(0)} twa${s.derived.twa.toFixed(0)} awa${s.derived.awa.toFixed(0)} v${s.boat.speed.toFixed(2)} r${s.boat.yawRate.toFixed(1)} rud${s.boat.rudder.toFixed(0)} boom${s.main.boomAngle.toFixed(0)} ms${s.main.sheet.toFixed(2)} mt${s.main.trim.toFixed(2)} jib${s.jib.angle.toFixed(0)} jt${s.jib.trim.toFixed(2)} jl${s.jib.luff.toFixed(2)} P${s.jib.portSheet.toFixed(2)} S${s.jib.starboardSheet.toFixed(2)} bk${s.jib.backed} dep${s.jib.deployed.toFixed(2)}`); };
if (which === 'irons') {
  const { engine, ev, run, holdTwa } = setup(getScenario('tack', 'starboardToPort'));
  engine.command('prepareTack'); run(3, () => holdTwa(45)); engine.command('tack');
  for (let i = 0; i < 15; i++) { run(2, () => holdTwa(0, 1 / 6)); log(engine); }
  console.log(ev.errors.map(e=>e.ruleId));
}
if (which === 'gybe') {
  const def = getScenario('gybe', 'starboardToPort');
  const { engine, ev, run, holdTwa } = setup(def);
  run(2, () => holdTwa(145)); log(engine);
  engine.command('prepareGybe'); run(3, () => holdTwa(145)); engine.command('gybe'); run(6, () => holdTwa(145)); log(engine);
  run(25, () => { holdTwa(178, 1 / 20); if (engine.state.main.boomAngle > 3) return true; }); log(engine);
  for (let i = 0; i < 10; i++) { run(3, () => holdTwa(-145, 1 / 20)); log(engine); }
  console.log(ev.errors.map(e=>e.ruleId), ev.stepStatus, ev.finished?.success);
}
if (which === 'jib') {
  const { engine, ev, run, holdTwa } = setup(getScenario('openJib'));
  engine.command('unfurlJib'); run(10, () => holdTwa(75)); log(engine);
  engine.command('trimJibStarboard'); for (let i = 0; i < 5; i++) { run(2, () => holdTwa(75)); log(engine); }
}
if (which === 'pos') {
  const { engine, ev, run, holdTwa } = setup(getScenario('pointsOfSail'));
  const leg = (twa: number, secs: number) => { run(10, () => holdTwa(twa)); engine.command('trimMain'); engine.command('trimJibPort'); run(secs, () => holdTwa(twa)); log(engine); console.log(ev.stepStatus.join(',')); };
  leg(45, 10); run(8, () => holdTwa(20, 1 / 6)); log(engine); console.log(ev.stepStatus.join(','));
  leg(90, 10); leg(135, 10); leg(168, 12);
  console.log(ev.errors.map(e=>e.ruleId));
}
