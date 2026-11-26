import { describe, expect, it } from 'vitest';
import { getScenario } from '../training/scenarios';
import { SimEngine } from '../simulation/physics/engine';
import { evalCond } from '../training/evaluation/conditions';
import { interceptHeading } from '../simulation/world/worldSim';
import { inSector, lightsFor } from '../rendering/world/navLights';
import { route, setup, steerTo } from './helpers';

const ids = (ev: { errors: Array<{ ruleId: string }> }) => ev.errors.map((e) => e.ruleId);

describe('engine and world', () => {
  it('motor: slow ≈ 3 kn, half ≈ 4.8 kn, neutral glides to a stop', () => {
    const e = new SimEngine({ heading: 0, speed: 0, wind: { trueFrom: 0, trueSpeed: 0 }, mainHoist: 0, mainsheet: 0.5, jibDeployed: 0, jibPortSheet: 0, jibStarboardSheet: 0, motor: true });
    e.setThrottle(0.22);
    e.run(90);
    expect(e.state.boat.speed).toBeGreaterThan(2.6);
    expect(e.state.boat.speed).toBeLessThan(3.4);
    e.setThrottle(0.45);
    e.run(90);
    expect(e.state.boat.speed).toBeGreaterThan(4.3);
    expect(e.state.boat.speed).toBeLessThan(5.3);
    e.setThrottle(0);
    e.run(120);
    expect(e.state.boat.speed).toBeLessThan(0.5);
  });

  it('throttle is ignored on a boat without an engine', () => {
    const e = new SimEngine();
    e.setThrottle(1);
    expect(e.state.motor.target).toBe(0);
  });

  it('intercept heading meets a moving target', () => {
    const h = interceptHeading([1000, 0], 5, [0, 0], [0, 3])!;
    // target moves north at 3 m/s; a faster interceptor east of it must lead it: aim north of west
    expect(h).toBeGreaterThan(270);
    expect(h).toBeLessThan(360);
  });

  it('heading window wraps through north and signed heading change', () => {
    const e = new SimEngine({ heading: 350, speed: 0, wind: { trueFrom: 0, trueSpeed: 5 }, mainHoist: 0, mainsheet: 0, jibDeployed: 0, jibPortSheet: 0, jibStarboardSheet: 0 });
    const ctx = { s: e.state, events: e.events, startT: 0, stepT: 0, initHeading: 10 };
    expect(evalCond({ heading: { min: 330, max: 30 } }, ctx)).toBe(true);
    expect(evalCond({ heading: { min: 30, max: 330 } }, ctx)).toBe(false);
    expect(evalCond({ headingChange: { max: -15 } }, ctx)).toBe(true);
    expect(evalCond({ headingDelta: { min: 19, max: 21 } }, ctx)).toBe(true);
  });

  it('hitting a pontoon stops the boat and reports a collision', () => {
    const { engine, ev, run } = setup(getScenario('leaveMarina'));
    engine.setThrottle(0.22);
    run(80, () => void steerTo(engine, -60, -60)); // straight into a pontoon
    expect(engine.events.some((x) => x.type === 'collision' && x.data?.with === 'structure')).toBe(true);
    expect(ev.finished?.reason).toBe('failed');
    expect(ev.finished?.failMessage?.en).toMatch(/Collision/);
  });
});

describe('navigation lights', () => {
  it('sector arcs: sidelights 112.5°, sternlight 135°, masthead 225°', () => {
    expect(inSector('stbd', 10)).toBe(true);
    expect(inSector('stbd', -10)).toBe(false);
    expect(inSector('port', -100)).toBe(true);
    expect(inSector('port', -120)).toBe(false);
    expect(inSector('stern', 170)).toBe(true);
    expect(inSector('stern', 100)).toBe(false);
    expect(inSector('masthead', 100)).toBe(true);
    expect(inSector('masthead', 130)).toBe(false);
  });
  it('vessel types show the right lights', () => {
    const colors = (k: Parameters<typeof lightsFor>[0], d?: Parameters<typeof lightsFor>[1]) => lightsFor(k, d).map((l) => `${l.color}:${l.sector}`).sort();
    expect(colors('sailingYacht')).toEqual(['green:stbd', 'red:port', 'white:stern']);
    expect(colors('motorYacht')).toContain('white:masthead');
    expect(colors('fishing', { fishing: 'trawl' })).toEqual(expect.arrayContaining(['green:all', 'white:all']));
    expect(colors('fishing', { fishing: 'other' })).toEqual(expect.arrayContaining(['red:all', 'white:all']));
    expect(colors('police', { blue: true })).toContain('blue:all');
  });
});

describe('leaving the marina', () => {
  const OUT: Array<[number, number]> = [[-150, 100], [-150, 160], [-160, 192], [-175, 245], [-340, 290]];
  it('succeeds slowly on the starboard side, passing the yacht port-to-port', () => {
    const { engine, ev, run } = setup(getScenario('leaveMarina'), 'guided');
    engine.setThrottle(0.22);
    const ctl = route(engine, OUT);
    run(360, () => {
      ctl();
      if (engine.state.zones.length === 0 && engine.state.boat.y > 215) engine.setThrottle(0.45);
    });
    expect(ev.finished?.success).toBe(true);
    expect(ids(ev)).toEqual([]);
    expect(engine.events.find((x) => x.type === 'vesselCpa' && x.data?.id === 'my1')?.data?.side).toBe('port');
  });
  it('flags speeding inside the marina and the wrong side of the fairway', () => {
    const { engine, ev, run } = setup(getScenario('leaveMarina'));
    engine.setThrottle(1);
    const ctl = route(engine, [[-215, 0], [-215, 60]]);
    run(40, ctl);
    expect(ids(ev)).toContain('marinaSpeed');
    expect(ids(ev)).toContain('wrongSideFairway');
  });
});

describe('entering the marina', () => {
  for (const v of ['day', 'night'] as const) {
    it(`slows down, enters on the green side and stops at the berth (${v})`, () => {
      const { engine, ev, run } = setup(getScenario('enterMarina', v));
      const ctl = route(engine, [[-215, 270], [-190, 215], [-200, 150], [-200, 30], [-150, 15], [-135, 15]], 6);
      let k = 0;
      let stopped = false;
      run(420, () => {
        ctl();
        const s = engine.state;
        const near = s.vessels.some((x) => (x.id === 'ws1' && x.range < 130) || (x.id === 'my2' && x.range < 70 && !x.passed));
        if (k > 30 && !stopped) engine.setThrottle(near ? 0 : 0.22);
        if (k === 60 && v === 'night') {
          ev.answer('entranceLights', 'green');
          ev.answer('fishLights', 'fishing');
        }
        if (v === 'night' && ev.activeQuestion()?.id === 'yachtLights') ev.answer('yachtLights', 'powerHeadOn');
        if (s.zones.includes('berth') && !stopped) {
          engine.setThrottle(-0.3);
          stopped = true;
        }
        if (stopped && s.boat.speed < 0.15) engine.setThrottle(0);
        k++;
      });
      expect(ev.finished?.success).toBe(true);
      expect(ids(ev)).toEqual([]);
    });
  }
  it('scores a wrong light identification', () => {
    const { ev, run } = setup(getScenario('enterMarina', 'night'));
    run(1);
    expect(ev.activeQuestion()?.id).toBe('entranceLights');
    expect(ev.answer('entranceLights', 'red')).toBe(false);
    run(1);
    expect(ids(ev)).toContain('wrongAnswer');
    // answering again is ignored, the next question becomes active
    expect(ev.answer('entranceLights', 'green')).toBe(false);
    expect(ev.activeQuestion()?.id).toBe('fishLights');
  });
});

describe('right of way under sail', () => {
  it('give-way: bearing away early and passing astern succeeds', () => {
    const { engine, ev, run, holdTwa } = setup(getScenario('rightOfWay', 'giveWay'));
    ev.answer('who', 'me');
    run(150, () => (engine.state.t > 15 && !engine.state.vessels[0].passed ? holdTwa(-95) : holdTwa(-45)));
    expect(ev.finished?.success).toBe(true);
    expect(ids(ev)).toEqual([]);
  });
  it('give-way: holding course ends in a collision', () => {
    const { ev, run, holdTwa } = setup(getScenario('rightOfWay', 'giveWay'));
    run(150, () => holdTwa(-45));
    expect(ev.finished?.reason).toBe('failed');
    expect(ids(ev)).toContain('lateAction');
  });
  it('stand-on: holding course succeeds, altering is flagged', () => {
    const ok = setup(getScenario('rightOfWay', 'standOn'));
    ok.ev.answer('who', 'them');
    ok.run(150, () => ok.holdTwa(45));
    expect(ok.ev.finished?.success).toBe(true);
    expect(ids(ok.ev)).toEqual([]);
    const bad = setup(getScenario('rightOfWay', 'standOn'));
    bad.ev.answer('who', 'them');
    bad.run(150, () => bad.holdTwa(bad.engine.state.t > 20 && bad.engine.state.t < 50 ? 100 : 45));
    expect(ids(bad.ev)).toContain('standOnAltered');
  });
});

describe('coastal traffic and night lights', () => {
  it('coastal traffic: completes with the trawler avoided and the police obeyed', () => {
    const { engine, ev, run } = setup(getScenario('coastTraffic'));
    let k = 0;
    let mode = 'sail';
    let tStop = 0;
    run(540, () => {
      const s = engine.state;
      const f1 = s.vessels.find((v) => v.id === 'f1')!;
      const q = ev.activeQuestion();
      if (q?.id === 'trawler') ev.answer('trawler', 'me');
      if (q?.id === 'police' && mode === 'sail') {
        ev.answer('police', 'stop');
        mode = 'stop';
        tStop = s.t;
      }
      if (mode === 'stop' && s.t > tStop + 10 && ev.stepStatus[2] === 'done') mode = 'go';
      if (k % 90 === 0) {
        if (mode === 'stop') {
          engine.command('easeMain');
          engine.command('releaseJibStarboard');
        } else {
          engine.command('trimMain');
          engine.command('trimJibStarboard');
        }
      }
      const avoid = !f1.passed && f1.range < 420;
      steerTo(engine, avoid ? s.boat.x - 60 : s.boat.y > 150 && s.boat.y < 450 ? -400 : -380, s.boat.y + 100);
      k++;
    });
    expect(ev.finished?.success).toBe(true);
    expect(ids(ev)).not.toContain('ignoredPolice');
    expect(ids(ev)).not.toContain('swimZone');
  });
  it('coastal traffic: sailing into the bathing area is flagged', () => {
    const { engine, ev, run } = setup(getScenario('coastTraffic'));
    run(200, () => void steerTo(engine, -60, -300));
    expect(ids(ev)).toContain('swimZone');
  });
  it('night lights: all identifications and actions complete the drill', () => {
    const { engine, ev, run, holdTwa } = setup(getScenario('nightLights'));
    const answers: Record<string, string> = { ownLights: 'sideStern', pvLights: 'powerHeadOn', trLights: 'trawlerPort', police: 'stop' };
    let slow = false;
    run(540, () => {
      const s = engine.state;
      const q = ev.activeQuestion();
      if (q) {
        ev.answer(q.id, answers[q.id]);
        if (q.id === 'police') {
          slow = true;
          engine.command('easeMain');
          engine.command('releaseJibStarboard');
        }
      }
      const tr = s.vessels.find((v) => v.id === 'tr')!;
      holdTwa(!slow && s.vessels[0].passed && !tr.passed && tr.range < 600 ? -130 : -90);
    });
    expect(ev.finished?.success).toBe(true);
    expect(ids(ev)).toEqual([]);
  });
});
