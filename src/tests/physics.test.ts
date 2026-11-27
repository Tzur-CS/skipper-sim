import { describe, expect, it } from 'vitest';
import { norm180, norm360, interp } from '../simulation/math';
import { apparentWind, trueWindAngle } from '../simulation/wind/wind';
import { pointOfSailFromTwa, tackFromTwa } from '../simulation/boat/classify';
import { SimEngine } from '../simulation/physics/engine';
import { optimalLineValue } from '../simulation/controls/crew';
import { jibBounds, mainBoomTarget } from '../simulation/sails/rig';
import type { InitialConditions } from '../simulation/types';

const base = (o: Partial<InitialConditions> = {}): InitialConditions => ({
  heading: 0, speed: 5, wind: { trueFrom: 90, trueSpeed: 12 }, mainHoist: 1, mainsheet: 0.5, jibDeployed: 1, jibPortSheet: 0.5, jibStarboardSheet: 0, autoTrim: true, ...o,
});

/** Hold heading fixed and keep sails optimally trimmed; return steady speed. */
function steadySpeed(init: InitialConditions, opts: { trim?: boolean; seconds?: number } = {}) {
  const e = new SimEngine(init);
  const n = (opts.seconds ?? 40) * 60;
  for (let i = 0; i < n; i++) {
    const s = e.state;
    if (opts.trim !== false) {
      s.main.sheet = optimalLineValue(s, 'mainsheet');
      if (s.derived.awa > 0) s.jib.portSheet = optimalLineValue(s, 'jibPort');
      else s.jib.starboardSheet = optimalLineValue(s, 'jibStarboard');
    }
    s.boat.heading = init.heading;
    s.boat.yawRate = 0;
    e.step(1 / 60);
  }
  return e.state;
}

describe('angle normalisation', () => {
  it('normalises to (-180, 180] and [0, 360)', () => {
    expect(norm180(190)).toBe(-170);
    expect(norm180(-190)).toBe(170);
    expect(norm180(180)).toBe(180);
    expect(norm180(-180)).toBe(180);
    expect(norm180(720 + 45)).toBe(45);
    expect(norm360(-10)).toBe(350);
    expect(norm360(370)).toBe(10);
  });
  it('interpolates tables', () => {
    expect(interp([[0, 0], [10, 1]], 5)).toBeCloseTo(0.5);
    expect(interp([[0, 0], [10, 1]], 20)).toBe(1);
  });
});

describe('apparent wind', () => {
  it('equals true wind when stopped', () => {
    const a = apparentWind(90, 10, 0);
    expect(a.awa).toBeCloseTo(90);
    expect(a.aws).toBeCloseTo(10);
  });
  it('moves forward and strengthens when sailing upwind', () => {
    const a = apparentWind(45, 10, 6);
    expect(a.awa).toBeLessThan(45);
    expect(a.awa).toBeGreaterThan(20);
    expect(a.aws).toBeGreaterThan(14);
  });
  it('weakens when running', () => {
    const a = apparentWind(180, 12, 5);
    expect(Math.abs(a.awa)).toBeCloseTo(180);
    expect(a.aws).toBeCloseTo(7);
  });
  it('beam reach: apparent wind ahead of true wind (vector check)', () => {
    const a = apparentWind(90, 10, 5);
    expect(a.awa).toBeCloseTo((Math.atan2(10, 5) * 180) / Math.PI, 5);
    expect(a.aws).toBeCloseTo(Math.hypot(10, 5), 5);
  });
  it('is symmetric for port side wind', () => {
    const a = apparentWind(-60, 12, 5);
    const b = apparentWind(60, 12, 5);
    expect(a.awa).toBeCloseTo(-b.awa);
    expect(a.aws).toBeCloseTo(b.aws);
  });
});

describe('tack and point of sail', () => {
  it('identifies port/starboard tack from the side the wind comes over', () => {
    expect(trueWindAngle(45, 0)).toBe(45);
    expect(tackFromTwa(trueWindAngle(45, 0))).toBe('starboard');
    expect(tackFromTwa(trueWindAngle(315, 0))).toBe('port');
    expect(tackFromTwa(trueWindAngle(10, 10))).toBe('headToWind');
    expect(tackFromTwa(trueWindAngle(180, 10))).toBe('starboard');
    expect(tackFromTwa(trueWindAngle(180, 350))).toBe('port');
  });
  it('classifies points of sail', () => {
    expect(pointOfSailFromTwa(20)).toBe('noGo');
    expect(pointOfSailFromTwa(-45)).toBe('closeHauled');
    expect(pointOfSailFromTwa(90)).toBe('beamReach');
    expect(pointOfSailFromTwa(-135)).toBe('broadReach');
    expect(pointOfSailFromTwa(175)).toBe('running');
  });
});

describe('sailing physics', () => {
  it('cannot sail directly into the wind (no-go zone)', () => {
    const s = steadySpeed(base({ wind: { trueFrom: 15, trueSpeed: 12 } }));
    expect(s.boat.speed).toBeLessThan(0.5);
    const ok = steadySpeed(base({ wind: { trueFrom: 50, trueSpeed: 12 } }));
    expect(ok.boat.speed).toBeGreaterThan(4.5);
  });
  it('slows down when entering the no-go zone', () => {
    const e = new SimEngine(base({ wind: { trueFrom: 50, trueSpeed: 12 }, speed: 5.5 }));
    e.state.boat.heading = 35; // TWA 15
    const v0 = e.state.boat.speed;
    for (let i = 0; i < 600; i++) { e.state.boat.heading = 35; e.state.boat.yawRate = 0; e.step(1 / 60); }
    expect(e.state.boat.speed).toBeLessThan(v0 - 2);
    expect(e.events.some((x) => x.type === 'enteredNoGo' || x.type === 'reset')).toBe(true);
  });
  it('sail trim affects speed: optimal beats over-trimmed and luffing', () => {
    const good = steadySpeed(base());
    const over = steadySpeed(base({ mainsheet: 1, jibPortSheet: 1, autoTrim: false }), { trim: false });
    const luff = steadySpeed(base({ mainsheet: 0, jibPortSheet: 0.05, autoTrim: false }), { trim: false });
    expect(good.boat.speed).toBeGreaterThan(over.boat.speed + 0.5);
    expect(good.boat.speed).toBeGreaterThan(luff.boat.speed + 1.5);
    expect(luff.main.luff).toBeGreaterThan(0.8);
  });
  it('wind pressure heels the boat to leeward, more in stronger wind', () => {
    const light = steadySpeed(base({ wind: { trueFrom: 50, trueSpeed: 8 } }));
    const strong = steadySpeed(base({ wind: { trueFrom: 50, trueSpeed: 20 } }));
    expect(light.boat.heel).toBeLessThan(0); // starboard tack heels to port
    expect(Math.abs(strong.boat.heel)).toBeGreaterThan(Math.abs(light.boat.heel) + 5);
  });
  it('has momentum and glides to a stop with sails down', () => {
    const e = new SimEngine(base({ mainHoist: 0, jibDeployed: 0, speed: 6 }));
    e.run(3);
    expect(e.state.boat.speed).toBeGreaterThan(3);
    e.run(60);
    expect(e.state.boat.speed).toBeLessThan(1.2);
  });
  it('steering rate depends on boat speed', () => {
    const turn = (speed: number) => {
      const e = new SimEngine(base({ speed, mainHoist: 0, jibDeployed: 0 }));
      e.setHelm(1);
      e.run(2);
      return e.state.boat.yawRate;
    };
    expect(turn(6)).toBeGreaterThan(turn(2) * 2);
    expect(Math.abs(turn(0))).toBeLessThan(1);
  });
  it('rudder moves gradually and the boat turns toward the rudder', () => {
    const e = new SimEngine(base());
    e.setHelm(1);
    e.step(1 / 60);
    expect(e.state.boat.rudder).toBeLessThan(5);
    e.run(3);
    expect(e.state.boat.rudder).toBeGreaterThan(25);
    expect(e.state.boat.yawRate).toBeGreaterThan(3);
    e.setHelm(-1);
    e.run(4);
    expect(e.state.boat.yawRate).toBeLessThan(0);
  });
  it('raising, lowering and furling take time', () => {
    const e = new SimEngine(base({ mainHoist: 0, jibDeployed: 0, wind: { trueFrom: 0, trueSpeed: 10 }, speed: 0 }));
    e.command('hoistMain');
    e.command('unfurlJib');
    e.run(4);
    expect(e.state.main.hoist).toBeGreaterThan(0.1);
    expect(e.state.main.hoist).toBeLessThan(0.5);
    e.run(30);
    expect(e.state.main.hoist).toBeCloseTo(1, 5);
    expect(e.state.jib.deployed).toBeCloseTo(1, 5);
    expect(e.events.some((x) => x.type === 'sailHoisted' && x.data?.phase === 'complete')).toBe(true);
    e.command('lowerMain');
    e.command('furlJib');
    e.run(20);
    expect(e.state.main.hoist).toBeCloseTo(0, 5);
    expect(e.state.jib.deployed).toBeCloseTo(0, 5);
  });
  it('manual line input overrides crew and moves continuously', () => {
    const e = new SimEngine(base());
    const before = e.state.main.sheet;
    e.setLineInput('mainsheet', -1);
    e.run(0.5);
    e.setLineInput('mainsheet', 0);
    expect(e.state.main.sheet).toBeLessThan(before - 0.1);
    expect(e.events.some((x) => x.type === 'sheetEased' && x.data?.line === 'mainsheet')).toBe(true);
  });
  it('responds to real-time wind changes', () => {
    const e = new SimEngine(base());
    e.setWind(270, 20);
    e.run(0.1);
    expect(e.state.derived.tack).toBe('port');
    expect(e.state.wind.trueSpeed).toBe(20);
  });
});

describe('sail rig geometry', () => {
  it('boom goes to leeward limited by the mainsheet', () => {
    expect(mainBoomTarget(90, 0.5, -10)).toBeLessThan(0); // wind from starboard → boom to port
    expect(mainBoomTarget(-90, 0.5, 10)).toBeGreaterThan(0);
    expect(Math.abs(mainBoomTarget(90, 1, -10))).toBeLessThan(5);
  });
  it('boom stays on its side slightly by the lee, then flips', () => {
    // Boom on port (wind was from starboard). Wind now 5° by the lee from port:
    expect(mainBoomTarget(-175, 0, -80)).toBeLessThan(0);
    // 20° by the lee → wind throws it across.
    expect(mainBoomTarget(-160, 0, -80)).toBeGreaterThan(0);
  });
  it('a loaded jib sheet prevents the jib crossing', () => {
    const [lo, hi] = jibBounds(0.8, 0);
    expect(hi).toBeLessThan(0);
    expect(lo).toBeLessThan(-8);
    const [lo2, hi2] = jibBounds(0, 0);
    expect(lo2).toBeLessThan(-80);
    expect(hi2).toBeGreaterThan(80);
  });
});

describe('tack and gybe transitions', () => {
  it('jib changes side during a tack once the old sheet is released', () => {
    const e = new SimEngine(base({ wind: { trueFrom: 45, trueSpeed: 12 }, speed: 5.5 }));
    e.command('prepareTack');
    e.run(3);
    e.command('tack');
    e.setHelm(0.7);
    while (e.state.jib.luff < 0.8 && e.state.t < 20) e.run(0.1);
    e.command('switchJib');
    e.run(10);
    const types = e.events.map((x) => x.type);
    expect(types).toContain('crossedWind');
    expect(types).toContain('tackChanged');
    expect(types).toContain('jibChangedSide');
    expect(types).toContain('boomChangedSide');
    expect(e.state.derived.tack).toBe('port');
    expect(e.state.jib.angle).toBeGreaterThan(0); // jib now on starboard (leeward on port tack)
  });
  it('jib stays aback if the old sheet is held', () => {
    const e = new SimEngine(base({ wind: { trueFrom: 45, trueSpeed: 12 }, speed: 5.5 }));
    e.setHelm(0.7);
    e.run(9);
    expect(e.state.derived.tack).toBe('port');
    expect(e.state.jib.backed).toBe(true);
  });
  it('gybe: boom crosses fast when the main is eased (uncontrolled) and slowly when centred', () => {
    const gybe = (center: boolean) => {
      const e = new SimEngine(base({ wind: { trueFrom: 150, trueSpeed: 15 }, speed: 6 }));
      if (center) { e.command('centerMain'); e.run(6); }
      e.setHelm(-0.4);
      e.run(15);
      const ev = e.events.find((x) => x.type === 'boomChangedSide');
      return { rate: Number(ev?.data?.rate ?? 0), uncontrolled: e.events.some((x) => x.type === 'uncontrolledGybe') };
    };
    const loose = gybe(false);
    const ctrl = gybe(true);
    expect(loose.uncontrolled).toBe(true);
    expect(ctrl.uncontrolled).toBe(false);
    expect(loose.rate).toBeGreaterThan(ctrl.rate * 2);
  });
  it('becomes stuck in irons when stopping head to wind', () => {
    const e = new SimEngine(base({ wind: { trueFrom: 0, trueSpeed: 12 }, speed: 3 }));
    e.run(20);
    expect(e.state.boat.speed).toBeLessThan(0.8);
    expect(e.isInIrons || e.events.some((x) => x.type === 'inIrons')).toBe(true);
  });
});

describe('reset', () => {
  it('reset restores identical initial state', () => {
    const init = base();
    const e = new SimEngine(init);
    const s0 = JSON.stringify({ ...e.state, t: 0 });
    e.setHelm(1);
    e.run(10);
    e.reset(init);
    expect(JSON.stringify({ ...e.state, t: 0 })).toBe(s0);
    expect(e.events.map((x) => x.type)).toEqual(['reset']);
  });
});

describe('weather helm', () => {
  it('a heeled boat close-hauled turns into the wind with the wheel centred, more in stronger wind', () => {
    const drift = (tws: number) => {
      const e = new SimEngine(base({ wind: { trueFrom: 45, trueSpeed: tws }, speed: 5.5 }));
      e.run(1);
      const h0 = e.state.boat.heading;
      e.run(4);
      expect(e.state.derived.weatherHelm).toBeGreaterThan(0); // wind from starboard: pulled to starboard
      return norm180(e.state.boat.heading - h0);
    };
    const light = drift(8);
    const strong = drift(18);
    expect(light).toBeGreaterThan(1);
    expect(strong).toBeGreaterThan(light * 1.5);
  });
  it('heeled to windward (running by the lee) gives no weather helm', () => {
    const e = new SimEngine(base({ wind: { trueFrom: 170, trueSpeed: 12 }, speed: 5 }));
    e.run(3);
    expect(Math.abs(e.state.derived.weatherHelm)).toBeLessThan(0.5);
  });
});
