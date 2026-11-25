import { SimEngine } from '../src/simulation/physics/engine';
import { optimalLineValue } from '../src/simulation/controls/crew';
for (const tws of [8, 12, 18]) {
  const row: string[] = [];
  for (const twa of [15, 22, 30, 40, 50, 60, 90, 120, 150, 175]) {
    const e = new SimEngine({ heading: 0, speed: 4, wind: { trueFrom: twa, trueSpeed: tws }, mainHoist: 1, mainsheet: 0.5, jibDeployed: 1, jibPortSheet: 0.5, jibStarboardSheet: 0 });
    for (let i = 0; i < 60 * 40; i++) {
      const s = e.state;
      s.main.sheet = optimalLineValue(s, 'mainsheet');
      s.jib.portSheet = optimalLineValue(s, 'jibPort');
      s.boat.heading = 0; s.boat.yawRate = 0;
      e.step(1 / 60);
    }
    const s = e.state;
    row.push(`${twa}:${s.boat.speed.toFixed(1)}kt h${s.boat.heel.toFixed(0)} awa${s.derived.awa.toFixed(0)} b${s.main.boomAngle.toFixed(0)} j${s.jib.angle.toFixed(0)} L${s.main.luff.toFixed(1)}/${s.jib.luff.toFixed(1)}`);
  }
  console.log('TWS', tws, row.join(' | '));
}
