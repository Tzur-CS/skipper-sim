import { describe, expect, it } from 'vitest';
import { getScenario, SCENARIOS } from '../training/scenarios';
import { setup } from './helpers';

describe('scenario catalogue', () => {
  it('defines twelve data-driven scenarios, all flagged for instructor review', () => {
    expect(SCENARIOS).toHaveLength(12);
    for (const s of SCENARIOS) {
      const def = s.build(s.variants?.[0].id);
      expect(def.steps.length).toBeGreaterThan(2);
      expect(def.rules.length).toBeGreaterThan(0);
      expect(def.review.status).toBe('needsInstructorReview');
      expect(def.title.he.length).toBeGreaterThan(0);
      expect(def.title.en.length).toBeGreaterThan(0);
    }
  });
});

describe('tack scenario', () => {
  for (const dir of ['starboardToPort', 'portToStarboard'] as const) {
    it(`succeeds with the full command sequence (${dir})`, () => {
      const def = getScenario('tack', dir);
      const { engine, ev, run, holdTwa } = setup(def);
      const sign = dir === 'starboardToPort' ? 1 : -1;
      run(2, () => holdTwa(45 * sign));
      engine.command('prepareTack');
      run(3, () => holdTwa(45 * sign));
      engine.command('checkStarboardReady');
      run(0.5, () => holdTwa(45 * sign));
      engine.command('checkPortReady');
      run(0.5, () => holdTwa(45 * sign));
      engine.command('tack');
      engine.setHelm(0.7 * sign);
      // Wait for the jib to collapse head to wind, then "העבר חלוץ!".
      run(15, () => (engine.state.jib.luff >= 0.8 ? true : undefined));
      expect(Math.abs(engine.state.derived.twa)).toBeLessThan(35);
      engine.command('switchJib');
      run(20, () => (sign * engine.state.derived.twa < -25 ? true : undefined));
      run(60, () => holdTwa(-45 * sign));
      expect(ev.finished?.success).toBe(true);
      expect(ev.errors.map((e) => e.ruleId)).toEqual([]);
      expect(ev.stepStatus.every((x) => x === 'done')).toBe(true);
      expect(ev.finished!.score).toBeGreaterThanOrEqual(90);
    });
  }

  it('a side asked before the crew finished preparing answers "not yet"', () => {
    const def = getScenario('tack', 'starboardToPort');
    const { engine, run, holdTwa } = setup(def);
    engine.command('prepareTack');
    engine.command('checkStarboardReady');
    expect(engine.state.crew.sidesReady.starboard).toBe(false);
    expect(engine.state.crew.lastAck?.key).toBe('ack.sideNotYet');
    run(3, () => holdTwa(45));
    engine.command('checkStarboardReady');
    expect(engine.state.crew.sidesReady.starboard).toBe(true);
    expect(engine.state.crew.lastAck?.key).toBe('ack.ready.starboard');
  });

  it('flags "Tacking" before both sides answered ready', () => {
    const def = getScenario('tack', 'starboardToPort');
    const { engine, ev, run, holdTwa } = setup(def);
    engine.command('prepareTack');
    run(3, () => holdTwa(45));
    engine.command('checkStarboardReady');
    engine.command('tack');
    engine.setHelm(0.7);
    run(15, () => (engine.state.jib.luff >= 0.8 ? true : undefined));
    engine.command('switchJib');
    run(20, () => (engine.state.derived.twa < -25 ? true : undefined));
    run(60, () => holdTwa(-45));
    expect(ev.finished?.success).toBe(true);
    expect(ev.errors.map((e) => e.ruleId)).toEqual(['noSideCheck']);
  });

  it('flags "Switch jib" called before the jib collapsed', () => {
    const def = getScenario('tack', 'starboardToPort');
    const { engine, ev, run, holdTwa } = setup(def);
    engine.command('prepareTack');
    run(3, () => holdTwa(45));
    engine.command('checkStarboardReady');
    engine.command('checkPortReady');
    engine.command('tack');
    engine.setHelm(0.7);
    run(0.3);
    expect(engine.state.jib.luff).toBeLessThan(0.5);
    engine.command('switchJib');
    run(20, () => (engine.state.derived.twa < -25 ? true : undefined));
    run(60, () => holdTwa(-45));
    expect(ev.errors.map((e) => e.ruleId)).toContain('earlySwitch');
  });

  it('the crew holds the jib until "Switch jib": without it the jib stays aback', () => {
    const def = getScenario('tack', 'starboardToPort');
    const { engine, ev, run, holdTwa } = setup(def);
    engine.command('prepareTack');
    run(3, () => holdTwa(45));
    engine.command('checkStarboardReady');
    engine.command('checkPortReady');
    engine.command('tack');
    engine.setHelm(0.7);
    run(20, () => (engine.state.derived.twa < -25 ? true : undefined));
    run(8, () => holdTwa(-45));
    expect(engine.state.jib.backed).toBe(true);
    expect(engine.state.jib.portSheet).toBeGreaterThan(0.8);
    expect(ev.errors.map((e) => e.ruleId)).toContain('jibBackedAfterTack');
    // A late call still gets the jib across.
    engine.command('switchJib');
    run(15, () => holdTwa(-45));
    expect(engine.state.jib.backed).toBe(false);
    expect(engine.state.jib.portSheet).toBeLessThan(0.05);
  });

  it('flags missing crew commands but accepts manual sheet handling as an alternative', () => {
    const def = getScenario('tack', 'starboardToPort');
    const { engine, ev, run, holdTwa } = setup(def);
    run(2, () => holdTwa(45));
    engine.setHelm(0.7);
    // Skipper works the sheets manually instead of commanding the crew.
    run(20, () => {
      const s = engine.state;
      if (Math.abs(s.derived.awa) < 18) engine.setLineInput('jibPort', -1);
      if (s.derived.twa < -10) { engine.setLineInput('jibPort', 0); engine.command('trimJibStarboard'); }
      return s.derived.twa < -25 ? true : undefined;
    });
    run(60, () => holdTwa(-45));
    expect(ev.finished?.success).toBe(true);
    const ids = ev.errors.map((e) => e.ruleId);
    expect(ids).toContain('noPrepare');
    expect(ids).toContain('noAnnounce');
    expect(ids).toContain('noSwitchCall');
    expect(ids).not.toContain('jibBackedAfterTack');
  });

  it('gets stuck in irons when the turn stops head to wind', () => {
    const def = getScenario('tack', 'starboardToPort');
    const { engine, ev, run, holdTwa } = setup(def);
    engine.command('prepareTack');
    run(3, () => holdTwa(45));
    engine.command('tack');
    run(30, () => holdTwa(0, 1 / 6));
    expect(ev.errors.map((e) => e.ruleId)).toContain('inIrons');
    expect(engine.state.boat.speed).toBeLessThan(1);
  });

  it('times out as a failure when nothing is done', () => {
    const def = getScenario('tack', 'starboardToPort');
    const { ev, run, holdTwa } = setup(def);
    run(def.timeLimit + 2, () => holdTwa(45));
    expect(ev.finished?.success).toBe(false);
    expect(ev.finished?.reason).toBe('timeout');
    expect(ev.finished!.score).toBeLessThan(60);
  });
});

describe('gybe scenario', () => {
  for (const dir of ['starboardToPort', 'portToStarboard'] as const) {
    it(`controlled gybe with the full command sequence succeeds (${dir})`, () => {
      const def = getScenario('gybe', dir);
      const { engine, ev, run, holdTwa } = setup(def);
      const sign = dir === 'starboardToPort' ? 1 : -1;
      run(2, () => holdTwa(145 * sign));
      engine.command('prepareGybe');
      run(3, () => holdTwa(145 * sign));
      engine.command('checkStarboardReady');
      engine.command('checkPortReady');
      engine.command('checkMainReady');
      engine.command('centerMain');
      run(6, () => holdTwa(145 * sign));
      engine.command('gybe');
      run(25, () => {
        holdTwa(178 * sign, 1 / 20);
        if (Math.abs(engine.state.derived.twa) >= 167) return true;
      });
      engine.command('deadRun');
      run(0.5, () => holdTwa(178 * sign, 1 / 20));
      engine.command('switchJib');
      run(25, () => {
        holdTwa(178 * sign, 1 / 20);
        if (engine.state.main.boomAngle * sign > 3) return true;
      });
      run(6, () => holdTwa(-145 * sign, 1 / 20));
      engine.command('easeMain');
      run(80, () => holdTwa(-145 * sign, 1 / 20));
      expect(ev.errors.map((e) => e.ruleId)).toEqual([]);
      expect(ev.finished?.success).toBe(true);
      expect(ev.stepStatus.every((x) => x === 'done')).toBe(true);
    });
  }

  it('flags turning before centring the main, a missing "Dead run" and a missing roll call', () => {
    const def = getScenario('gybe', 'starboardToPort');
    const { engine, ev, run, holdTwa } = setup(def);
    run(2, () => holdTwa(145));
    engine.command('prepareGybe');
    run(3, () => holdTwa(145));
    engine.command('gybe');
    engine.command('centerMain');
    run(45, () => {
      holdTwa(-175, 1 / 20);
      if (engine.state.main.boomAngle > 3) return true;
    });
    run(4, () => holdTwa(-150, 1 / 20));
    const ids = ev.errors.map((e) => e.ruleId);
    expect(ids).toContain('noSideCheck');
    expect(ids).toContain('turnBeforeCentre');
    expect(ids).toContain('noDeadRun');
  });

  it('detects an uncontrolled gybe when the main is left eased', () => {
    const def = getScenario('gybe', 'starboardToPort');
    const { engine, ev, run, holdTwa } = setup(def);
    run(2, () => holdTwa(145));
    run(25, () => {
      holdTwa(-170, 1 / 20);
    });
    const ids = ev.errors.map((e) => e.ruleId);
    expect(ids).toContain('uncontrolledGybe');
    expect(ids).toContain('mainNotCentred');
    expect(engine.events.some((e) => e.type === 'uncontrolledGybe')).toBe(true);
  });
});

describe('raise main scenario', () => {
  it('succeeds head to wind with sheet eased', () => {
    const def = getScenario('raiseMain');
    const { engine, ev, run, holdTwa } = setup(def);
    run(15, () => holdTwa(8, 1 / 8));
    engine.command('easeMain');
    run(3, () => holdTwa(8, 1 / 8));
    engine.command('hoistMain');
    run(25, () => holdTwa(8, 1 / 8));
    expect(engine.state.main.hoist).toBeGreaterThan(0.98);
    run(10, () => holdTwa(55));
    engine.command('trimMain');
    run(40, () => holdTwa(55));
    expect(ev.errors.map((e) => e.ruleId)).toEqual([]);
    expect(ev.finished?.success).toBe(true);
  });

  it('flags hoisting on a beam reach with a tight sheet', () => {
    const def = getScenario('raiseMain');
    const { engine, ev, run, holdTwa } = setup(def);
    engine.command('hoistMain');
    run(20, () => holdTwa(70));
    const ids = ev.errors.map((e) => e.ruleId);
    expect(ids).toContain('hoistSheetTight');
    expect(ids).toContain('hoistNotHeadToWind');
    // Hoisting under load is slower.
    expect(engine.state.main.hoist).toBeLessThan(0.6);
  });
});

describe('open jib scenario', () => {
  it('succeeds with the full command sequence: the furler eases while the port side pulls', () => {
    const def = getScenario('openJib');
    const { engine, ev, run, holdTwa } = setup(def);
    run(3, () => holdTwa(75));
    engine.command('prepareUnfurl');
    run(3, () => holdTwa(75));
    engine.command('checkFurlerReady');
    engine.command('checkPortReady');
    engine.command('unfurlJib');
    run(40, () => holdTwa(75));
    expect(ev.errors.map((e) => e.ruleId)).toEqual([]);
    expect(ev.finished?.success).toBe(true);
    expect(ev.stepStatus.every((x) => x === 'done')).toBe(true);
  });

  it('unfurling without preparation: the sheet is not pulled and the commands are flagged', () => {
    const def = getScenario('openJib');
    const { engine, ev, run, holdTwa } = setup(def);
    engine.command('unfurlJib');
    run(10, () => holdTwa(75));
    expect(engine.state.jib.portSheet).toBeLessThan(0.05);
    engine.command('trimJibPort');
    run(30, () => holdTwa(75));
    expect(ev.finished?.success).toBe(true);
    const ids = ev.errors.map((e) => e.ruleId);
    expect(ids).toContain('noPrepare');
    expect(ids).toContain('noRollCall');
  });

  it('trimming the windward sheet backs the jib and is flagged', () => {
    const def = getScenario('openJib');
    const { engine, ev, run, holdTwa } = setup(def);
    engine.command('unfurlJib');
    run(10, () => holdTwa(75));
    engine.command('trimJibStarboard');
    run(10, () => holdTwa(75));
    expect(engine.state.jib.backed).toBe(true);
    expect(ev.errors.map((e) => e.ruleId)).toContain('windwardSheet');
    // Recovery: release windward, trim leeward → still succeeds.
    engine.command('releaseJibStarboard');
    run(2, () => holdTwa(75));
    engine.command('trimJibPort');
    run(30, () => holdTwa(75));
    expect(ev.finished?.success).toBe(true);
    expect(ev.finished?.recoveries).toContain('windwardSheet');
  });
});

describe('points of sail scenario', () => {
  it('can be completed by changing course and trimming at each point of sail', () => {
    const def = getScenario('pointsOfSail');
    const { engine, ev, run, holdTwa } = setup(def);
    const leg = (twa: number, secs: number) => {
      run(10, () => holdTwa(twa));
      engine.command('trimMain');
      engine.command('trimJibPort');
      run(secs, () => holdTwa(twa));
    };
    leg(45, 10);
    run(8, () => holdTwa(20, 1 / 6));
    leg(90, 10);
    leg(135, 10);
    leg(168, 12);
    expect(ev.stepStatus.every((s) => s === 'done')).toBe(true);
    expect(ev.finished?.success).toBe(true);
  });
});

describe('lower sails scenario', () => {
  it('succeeds: ease jib, furl, head to wind, lower main', () => {
    const def = getScenario('lowerSails');
    const { engine, ev, run, holdTwa } = setup(def);
    engine.command('releaseJibPort');
    run(3, () => holdTwa(70));
    engine.command('furlJib');
    run(14, () => holdTwa(70));
    expect(engine.state.jib.deployed).toBeLessThan(0.02);
    run(15, () => holdTwa(5, 1 / 8));
    engine.command('easeMain');
    engine.command('lowerMain');
    run(20, () => holdTwa(5, 1 / 8));
    expect(ev.errors.map((e) => e.ruleId)).toEqual([]);
    expect(ev.finished?.success).toBe(true);
  });

  it('flags furling with a loaded sheet', () => {
    const def = getScenario('lowerSails');
    const { engine, ev, run, holdTwa } = setup(def);
    engine.command('furlJib');
    run(6, () => holdTwa(70));
    expect(ev.errors.map((e) => e.ruleId)).toContain('furlLoaded');
  });
});

describe('reset consistency', () => {
  it('produces identical trajectories after reset (deterministic)', () => {
    const def = getScenario('tack', 'starboardToPort');
    const a = setup(def);
    const trace = () => {
      a.engine.command('tack');
      a.engine.setHelm(0.6);
      a.run(15);
      return { ...a.engine.state.boat };
    };
    const first = trace();
    a.engine.reset(def.initial);
    const second = trace();
    expect(second).toEqual(first);
  });
});

describe('close-hauled in shifty wind (weather helm)', () => {
  it('rounds up by itself with the wheel centred', () => {
    const def = getScenario('weatherHelm');
    const { engine, ev, run } = setup(def);
    engine.setHelm(0);
    run(40);
    expect(Math.abs(engine.state.derived.twa)).toBeLessThan(30);
    expect(ev.errors.map((e) => e.ruleId)).toContain('roundUp');
    expect(ev.stepStatus[0]).toBe('done');
  });

  it('succeeds with small, continuous corrections through gusts, lulls and shifts', () => {
    const def = getScenario('weatherHelm');
    const { engine, ev, run, holdTwa } = setup(def);
    const rudders: number[] = [];
    run(2);
    run(140, () => {
      holdTwa(45);
      rudders.push(engine.state.boat.rudder);
    });
    expect(ev.finished?.success).toBe(true);
    expect(ev.errors.map((e) => e.ruleId)).toEqual([]);
    expect(ev.stepStatus.slice(1).every((x) => x === 'done')).toBe(true);
    // Holding the course takes opposite (port) helm all the time, and more in the gusts.
    const settled = rudders.slice(150);
    expect(Math.max(...settled)).toBeLessThan(0);
    expect(Math.min(...settled) - Math.max(...settled)).toBeLessThan(-2);
  });
});

describe('wind variation', () => {
  it('gusts and shifts vary around the mean wind and repeat after a reset', () => {
    const def = getScenario('weatherHelm');
    const a = setup(def);
    const speeds: number[] = [];
    const dirs: number[] = [];
    a.run(90, () => {
      a.holdTwa(45);
      speeds.push(a.engine.state.wind.trueSpeed);
      dirs.push(a.engine.state.wind.trueFrom);
    });
    expect(Math.max(...speeds)).toBeGreaterThan(18);
    expect(Math.min(...speeds)).toBeLessThan(13);
    expect(Math.max(...dirs) - Math.min(...dirs)).toBeGreaterThan(8);
    expect(a.engine.meanWind.trueSpeed).toBe(14);
    a.engine.reset(def.initial);
    a.engine.run(10);
    const b = setup(def);
    b.engine.run(10);
    expect(a.engine.state.wind).toEqual(b.engine.state.wind);
  });
});
