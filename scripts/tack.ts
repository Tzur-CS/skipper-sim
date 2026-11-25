import { SimEngine } from '../src/simulation/physics/engine';
const prep = process.argv[2] !== 'noprep';
const e = new SimEngine({ heading: 0, speed: 5.4, wind: { trueFrom: 45, trueSpeed: 12 }, mainHoist: 1, mainsheet: 0.95, jibDeployed: 1, jibPortSheet: 1, jibStarboardSheet: 0 });
e.run(5);
if (prep) { e.command('prepareTack'); e.run(3); }
e.command('tack');
e.setHelm(0.55);
let done = false;
for (let i = 0; i < 40; i++) {
  e.run(0.5);
  const s = e.state;
  if (!done && s.derived.twa < -30) { e.setHelm(0); done = true; }
  if (i % 2 === 0) console.log(`t${s.t.toFixed(1)} hdg${s.boat.heading.toFixed(0)} twa${s.derived.twa.toFixed(0)} v${s.boat.speed.toFixed(1)} r${s.boat.yawRate.toFixed(1)} boom${s.main.boomAngle.toFixed(0)} jib${s.jib.angle.toFixed(0)} P${s.jib.portSheet.toFixed(2)} S${s.jib.starboardSheet.toFixed(2)} back${s.jib.backed} heel${s.boat.heel.toFixed(0)}`);
}
console.log(e.events.filter(x=>!['rudderChanged','sheetTrimmed','sheetEased'].includes(x.type)).map(x=>x.t+':'+x.type+JSON.stringify(x.data??{})).join('\n'));
