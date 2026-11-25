import { describe, expect, it } from 'vitest';
import { getScenario, SCENARIOS } from '../training/scenarios';
import { setup } from './helpers';

describe('scenario catalogue', () => {
  it('defines six data-driven scenarios, all flagged for instructor review', () => {
    expect(SCENARIOS).toHaveLength(6);
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
    it(`succeeds with a correct, prepared tack (${dir})`, () => {
      const def = getScenario('tack', dir);
      const { engine, ev, run, holdTwa } = setup(def);
      const sign = dir === 'starboardToPort' ? 1 : -1;
      run(2, () => holdTwa(45 * sign));
      engine.command('prepareTack');
      run(3, () => holdTwa(45 * sign));
      engine.command('tack');
      engine.setHelm(0.7 * sign);
      run(20, () => (sign * engine.state.derived.twa < -25 ? true : undefined));
      run(60, () => holdTwa(-45 * sign));
      expect(ev.finished?.success).toBe(true);
      expect(ev.errors.map((e) => e.ruleId)).toEqual([]);
      expect(ev.finished!.score).toBeGreaterThanOrEqual(90);
    });
  }

  it('flags missing crew preparation but accepts manual sheet handling as an alternative', () => {
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
    it(`controlled gybe succeeds (${dir})`, () => {
      const def = getScenario('gybe', dir);
      const { engine, ev, run, holdTwa } = setup(def);
      const sign = dir === 'starboardToPort' ? 1 : -1;
      run(2, () => holdTwa(145 * sign));
      engine.command('prepareGybe');
      run(3, () => holdTwa(145 * sign));
      engine.command('gybe');
      run(6, () => holdTwa(145 * sign));
      run(25, () => {
        holdTwa(178 * sign, 1 / 20);
        if (engine.state.main.boomAngle * sign > 3) return true;
      });
      run(80, () => holdTwa(-145 * sign, 1 / 20));
      expect(ev.errors.map((e) => e.ruleId)).toEqual([]);
      expect(ev.finished?.success).toBe(true);
    });
  }

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
  it('succeeds by unfurling and trimming the leeward sheet', () => {
    const def = getScenario('openJib');
    const { engine, ev, run, holdTwa } = setup(def);
    engine.command('unfurlJib');
    run(10, () => holdTwa(75));
    engine.command('trimJibPort');
    run(30, () => holdTwa(75));
    expect(ev.errors.map((e) => e.ruleId)).toEqual([]);
    expect(ev.finished?.success).toBe(true);
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
