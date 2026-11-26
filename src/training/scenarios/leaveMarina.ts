import type { ScenarioDef } from './types';
import type { VesselDef } from '../../simulation/world/types';
import { t } from './common';
import { HARBOUR_REVIEW_NOTE, MARINA_SPEED_KT, closeRule, collisionFail, cpaSideRule, marinaSpeedRule } from './harbourCommon';

/** Sailing-school dinghies circling just outside the entrance. */
export function optimistFleet(cx: number, cy: number, r: number, n = 4): VesselDef[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + 0.4;
    return {
      id: `opt${i + 1}`,
      kind: 'optimist' as const,
      x: cx + Math.sin(a) * r,
      y: cy + Math.cos(a) * r,
      heading: ((a * 180) / Math.PI + 90) % 360,
      speed: 2.2 + (i % 2) * 0.4,
      wander: { x: cx, y: cy, r: r * (0.8 + 0.15 * i) },
      closeDist: 20,
    };
  });
}

export function buildLeaveMarina(): ScenarioDef {
  return {
    id: 'leaveMarina',
    title: t('יציאה מהמרינה', 'Leaving the marina'),
    objective: t(
      'צא במנוע ממרינת גורדון אל הים הפתוח: לאט, בצד ימין של הנתיב, ותן מקום ליאכטה הנכנסת ולילדים באופטימיסטים.',
      'Motor out of Gordon marina to open water: slowly, on the starboard side of the fairway, keeping clear of the incoming yacht and the children in Optimists.',
    ),
    learningObjective: t(
      'במרינה ובתעלה צרה שומרים על צד ימין (תקנה 9), שטים לאט, ונפגשים עם כלי נגדי שמאל-לשמאל. במנוע אתה "כלי ממונע" ועליך להתרחק מכלי מפרש, גם מסירות קטנות של ילדים, שאינן תמיד צפויות.',
      'In a marina or narrow channel keep to starboard (Rule 9), go slowly, and meet oncoming boats port-to-port. Under engine you are a power-driven vessel and must keep clear of sailing craft, including children\'s dinghies, which are not always predictable.',
    ),
    initial: {
      x: -150,
      y: -30,
      heading: 0,
      speed: 0,
      wind: { trueFrom: 290, trueSpeed: 10 },
      mainHoist: 0,
      mainsheet: 0.6,
      jibDeployed: 0,
      jibPortSheet: 0,
      jibStarboardSheet: 0,
      motor: true,
      throttle: 0,
      world: {
        time: 'day',
        marina: true,
        vessels: [
          {
            id: 'my1',
            kind: 'motorYacht',
            x: -250,
            y: 300,
            heading: 150,
            speed: 3.5,
            path: [[-205, 250], [-196, 200], [-205, 150], [-205, -60], [-160, -90]],
            closeDist: 14,
          },
          ...optimistFleet(-250, 365, 28),
        ],
      },
    },
    steps: [
      {
        id: 'engineAhead',
        title: t('הילוך קדימה, איטי', 'Engine ahead, slow'),
        hint: t('לחץ ▲ במצערת עד "איטי". הסירה תתחיל לנוע לאט קדימה.', 'Press ▲ on the throttle to "slow". The boat starts to move ahead slowly.'),
        done: { all: [{ throttle: { min: 0.1 } }, { speed: { min: 0.8 } }] },
        highlight: ['throttleUp'],
        source: 'general',
      },
      {
        id: 'keepRight',
        title: t('שמור על צד ימין של הנתיב', 'Keep to the starboard side of the fairway'),
        hint: t('נווט צפונה לאורך הנתיב, בחצי הימני שלו (קרוב לקצות המזחים, לא צמוד אליהם).', 'Steer north along the fairway in its right-hand half (towards the pontoon ends, not touching them).'),
        done: { all: [{ inZone: 'fairwayEast' }, { speed: { min: 1 } }, { heading: { min: 330, max: 30 } }] },
        holdSeconds: 3,
        highlight: ['helm'],
        source: 'general',
      },
      {
        id: 'passYacht',
        title: t('פגוש את היאכטה הנכנסת שמאל-לשמאל', 'Meet the incoming yacht port-to-port'),
        hint: t('יאכטה נכנסת למרינה מולך. המשך בצד ימין ותן לה לעבור לשמאלך.', 'A yacht is coming in towards you. Stay on your side and let it pass on your port side.'),
        done: { event: 'vesselCpa', data: { id: 'my1' } },
        highlight: ['helm'],
        source: 'general',
      },
      {
        id: 'exit',
        title: t('צא מפתח המרינה', 'Leave through the entrance'),
        hint: t(`עבור את הפתח לאט (עד ${MARINA_SPEED_KT} קשר) בצד ימין שלו – ליד שובר הגלים הצפוני (האור האדום). מאחורי שובר הגלים לא רואים מי נכנס.`, `Pass the entrance slowly (max ${MARINA_SPEED_KT} kt) on its starboard side, near the north jetty (red light). You cannot see who is coming in behind the breakwater.`),
        done: { event: 'gateCrossed', data: { id: 'entrance', dir: 'out' } },
        highlight: ['helm'],
        source: 'general',
      },
      {
        id: 'clearKids',
        title: t('התרחק מהאופטימיסטים', 'Keep clear of the Optimists'),
        hint: t('ילדים מבית הספר לשיט מפליגים ליד הפתח. עבור רחוק מהם (לפחות 20 מ׳) והמשך אל הים הפתוח מערבה.', 'Sailing-school children are sailing near the entrance. Pass well clear (at least 20 m) and continue west to open water.'),
        done: { inZone: 'open' },
        highlight: ['helm', 'throttleUp'],
        source: 'general',
      },
    ],
    success: { cond: { all: [{ inZone: 'open' }, { event: 'gateCrossed', data: { id: 'entrance', dir: 'out' } }] }, holdSeconds: 2 },
    timeLimit: 360,
    failOn: collisionFail,
    rules: [
      marinaSpeedRule(),
      {
        id: 'wrongSideFairway',
        type: 'condDuration',
        cond: { all: [{ inZone: 'fairwayWest' }, { heading: { min: 300, max: 60 } }, { speed: { min: 0.8 } }] },
        seconds: 6,
        category: 'procedural',
        area: 'steering',
        penalty: 15,
        source: 'general',
        message: t('אתה בצד השמאלי של הנתיב.', 'You are on the port side of the fairway.'),
        explanation: t('בתעלה או בנתיב צר כל כלי שומר על הצד הימני שלו (תקנה 9), כך שכלים נגדיים נפגשים שמאל-לשמאל.', 'In a narrow channel every vessel keeps to its own starboard side (Rule 9), so oncoming boats meet port-to-port.'),
        suggestion: t('עבור לחצי הימני של הנתיב.', 'Move over to the right-hand half of the fairway.'),
      },
      {
        id: 'exitWrongSide',
        type: 'checkAtEvent',
        event: 'gateCrossed',
        eventData: { id: 'entrance', dir: 'out' },
        require: { inZone: 'entranceEast' },
        category: 'procedural',
        area: 'steering',
        penalty: 10,
        source: 'general',
        message: t('יצאת בצד הלא נכון של הפתח.', 'You left on the wrong side of the entrance.'),
        explanation: t('ביציאה שומרים על ימין: קרוב לראש שובר הגלים הצפוני (אור אדום). כלי שנכנס יגיע בצד השני.', 'Leaving, keep to starboard: near the north jetty head (red light). A vessel coming in will be on the other side.'),
        suggestion: t('כוון לחצי הימני של הפתח לפני שאתה עובר אותו.', 'Line up on the right-hand half of the entrance before passing it.'),
      },
      {
        id: 'exitFast',
        type: 'checkAtEvent',
        event: 'gateCrossed',
        eventData: { id: 'entrance', dir: 'out' },
        require: { speed: { max: MARINA_SPEED_KT + 0.8 } },
        category: 'unsafe',
        area: 'steering',
        penalty: 10,
        source: 'general',
        message: t('עברת את הפתח מהר מדי.', 'You went through the entrance too fast.'),
        explanation: t('פתח המרינה הוא "פינה עיוורת": כלי שנכנס, גלשן או שחיין יכולים להופיע מאחורי שובר הגלים.', 'The entrance is a blind corner: an incoming boat, a board or a swimmer can appear from behind the breakwater.'),
        suggestion: t('האט ל"איטי" לפני הפתח.', 'Slow down before the entrance.'),
      },
      cpaSideRule(
        'yachtWrongSide',
        'my1',
        'starboard',
        15,
        t('עברת את היאכטה ימין-לימין.', 'You passed the yacht starboard-to-starboard.'),
        t('כלים נגדיים בנתיב צר נפגשים שמאל-לשמאל. מעבר ימין-לימין מבלבל את הכלי השני ועלול להביא להתנגשות.', 'Oncoming vessels in a channel meet port-to-port. Passing starboard-to-starboard confuses the other skipper and can lead to a collision.'),
        t('שמור על צד ימין של הנתיב כשכלי מתקרב מולך.', 'Keep to the starboard side when a boat is coming towards you.'),
      ),
      closeRule(
        'closeYacht',
        { id: 'my1' },
        15,
        t('עברת קרוב מדי ליאכטה.', 'You passed too close to the yacht.'),
        t('מרחק קטן לא משאיר זמן לתקן טעות של מישהו.', 'A small distance leaves no time to correct anyone\'s mistake.'),
        t('האט ותן יותר מקום.', 'Slow down and give more room.'),
      ),
      closeRule(
        'closeKids',
        { kind: 'optimist' },
        20,
        t('עברת קרוב מדי לאופטימיסט.', 'Too close to an Optimist.'),
        t('אתה כלי ממונע: עליך להתרחק מכלי מפרש (תקנה 18). ילדים באופטימיסט יכולים להתהפך או לשנות כיוון פתאום, ושובל המנוע מטלטל אותם.', 'You are power-driven: keep clear of sailing craft (Rule 18). Children in Optimists may capsize or change course suddenly, and your wash rocks them.'),
        t('האט ועבור רחוק מהם, רצוי מאחוריהם.', 'Slow down and pass well clear, preferably astern of them.'),
        3,
      ),
    ],
    commonErrors: [
      t('מהירות גבוהה מדי בתוך המרינה ובפתח.', 'Going too fast inside the marina and through the entrance.'),
      t('שיוט באמצע הנתיב או בצד שמאל שלו.', 'Motoring in the middle or on the port side of the fairway.'),
      t('חיתוך קרוב ליד ראש שובר הגלים.', 'Cutting close around the breakwater head.'),
      t('מעבר קרוב לסירות ילדים.', 'Passing close to children\'s dinghies.'),
    ],
    review: {
      status: 'needsInstructorReview',
      notes: [HARBOUR_REVIEW_NOTE, 'Engine is a simple thrust model with propeller wash on the rudder; prop walk is not modelled.'],
    },
  };
}
