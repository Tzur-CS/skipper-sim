import { SimEngine } from '../src/simulation/physics/engine';
const mode = process.argv[2] ?? 'controlled';
const e = new SimEngine({ heading: 0, speed: 5, wind: { trueFrom: 210, trueSpeed: 14 }, mainHoist: 1, mainsheet: 0.1, jibDeployed: 1, jibPortSheet: 0, jibStarboardSheet: 0.3 });
e.run(5);
if (mode === 'controlled') { e.command('prepareGybe'); e.run(3); e.command('gybe'); e.run(4); }
e.setHelm(0.35);
let done = false;
for (let i = 0; i < 40; i++) {
  e.run(0.5);
  const s = e.state;
  if (!done && s.derived.twa > 155 && s.derived.twa < 170) { e.setHelm(0); done = true; }
  if (i % 2 === 0) console.log(`t${s.t.toFixed(1)} hdg${s.boat.heading.toFixed(0)} twa${s.derived.twa.toFixed(0)} awa${s.derived.awa.toFixed(0)} v${s.boat.speed.toFixed(1)} boom${s.main.boomAngle.toFixed(0)} br${s.main.boomRate.toFixed(0)} ms${s.main.sheet.toFixed(2)} jib${s.jib.angle.toFixed(0)} P${s.jib.portSheet.toFixed(2)} S${s.jib.starboardSheet.toFixed(2)}`);
}
console.log(e.events.filter(x=>!['rudderChanged','sheetTrimmed','sheetEased'].includes(x.type)).map(x=>x.t+':'+x.type+JSON.stringify(x.data??{})).join('\n'));
