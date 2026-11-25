import { SimEngine } from '../src/simulation/physics/engine';
const e = new SimEngine({ heading: 0, speed: 3, wind: { trueFrom: 0, trueSpeed: 12 }, mainHoist: 1, mainsheet: 0.5, jibDeployed: 1, jibPortSheet: 0.5, jibStarboardSheet: 0, autoTrim: true });
for (let i=0;i<10;i++){ e.run(2); const s=e.state; console.log(s.t.toFixed(0), s.boat.speed.toFixed(2), s.derived.twa.toFixed(1), s.jib.angle.toFixed(0), s.jib.backed, s.boat.yawRate.toFixed(2)); }
