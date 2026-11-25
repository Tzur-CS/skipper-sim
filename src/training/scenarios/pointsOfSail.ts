import type { Cond, Rule, ScenarioDef, ScenarioStep } from './types';
import { REVIEW_NOTE, safetyRules, t } from './common';

export function buildPointsOfSail(): ScenarioDef {
  const trimmed: Cond = { all: [{ mainTrim: { min: 0.6 } }, { any: [{ jibTrim: { min: 0.5 } }, { jibDeployed: { max: 0.05 } }, { twaAbs: { min: 150 } }] }] };
  const steps: ScenarioStep[] = [
    {
      id: 'closeHauled',
      title: t('קדמית', 'Close-hauled'),
      hint: t('התקרב לרוח (הגה ימינה) עד כ-45° ומתח את שני המפרשים.', 'Head up (steer to starboard) to about 45° and trim both sails in.'),
      done: { all: [{ twaAbs: { min: 38, max: 55 } }, trimmed] },
      holdSeconds: 3,
      highlight: ['helm', 'trimMain', 'trimJibPort'],
      source: 'general',
    },
    {
      id: 'noGo',
      title: t('השטח המת', 'The no-go zone'),
      hint: t('התקרב עוד אל הרוח (מתחת ל-30°). שים לב למפרשים המרפרפים ולירידת המהירות.', 'Head up further (under 30°). Watch the sails luff and the speed drop.'),
      done: { twaAbs: { max: 30 } },
      holdSeconds: 2,
      highlight: ['helm'],
      source: 'general',
    },
    {
      id: 'beam',
      title: t('צד', 'Beam reach'),
      hint: t('התרחק מהרוח (הגה שמאלה) עד שהרוח מהצד (כ-90°), ושחרר את המפרשים בהתאם.', 'Bear away (steer to port) until the wind is on the beam (~90°) and ease both sails.'),
      done: { all: [{ twaAbs: { min: 80, max: 105 } }, trimmed] },
      holdSeconds: 3,
      highlight: ['helm', 'mainsheet', 'jibPort'],
      source: 'general',
    },
    {
      id: 'broad',
      title: t('גבית חלקית', 'Broad reach'),
      hint: t('המשך להתרחק עד כ-135° ושחרר עוד.', 'Keep bearing away to about 135° and ease further.'),
      done: { all: [{ twaAbs: { min: 120, max: 150 } }, trimmed] },
      holdSeconds: 3,
      highlight: ['helm', 'mainsheet'],
      source: 'general',
    },
    {
      id: 'run',
      title: t('גבית מלאה', 'Running'),
      hint: t('התרחק עד שהרוח כמעט מאחור (160°–175°). ראשי משוחרר כמעט עד הסוף. היזהר ממהפך לא מבוקר!', 'Bear away until the wind is nearly astern (160–175°). Main almost fully eased. Beware of an accidental gybe!'),
      done: { all: [{ twaAbs: { min: 158, max: 178 } }, { mainTrim: { min: 0.5 } }] },
      holdSeconds: 3,
      highlight: ['helm', 'mainsheet'],
      source: 'general',
    },
  ];
  const luffRule: Rule = {
    id: 'luffing',
    type: 'condDuration',
    cond: { all: [{ mainLuff: { min: 0.6 } }, { twaAbs: { min: 35 } }] },
    seconds: 8,
    maxCount: 3,
    category: 'sail',
    area: 'sails',
    penalty: 5,
    source: 'general',
    message: t('הראשי מרפרף – הוא משוחרר מדי.', 'The main is luffing – it is eased too far.'),
    explanation: t('כשמתקרבים לרוח יש למתוח את המפרשים, אחרת הם מרפרפים ולא מניעים.', 'When heading up you must trim in, otherwise the sails luff and stop driving.'),
    suggestion: t('מתח ראשי עד שהרפרוף נעלם.', 'Trim the main until the luffing stops.'),
  };
  const stallRule: Rule = {
    id: 'stalled',
    type: 'condDuration',
    cond: { all: [{ mainIncidence: { min: 45 } }, { awaAbs: { max: 115 } }, { mainHoist: { min: 0.5 } }] },
    seconds: 8,
    maxCount: 3,
    category: 'sail',
    area: 'sails',
    penalty: 5,
    source: 'general',
    message: t('הראשי מתוח מדי לכיוון ההפלגה.', 'The main is over-trimmed for this point of sail.'),
    explanation: t('כשמתרחקים מהרוח יש לשחרר. מפרש מתוח מדי גורם לנטייה ולהאטה.', 'When bearing away you must ease. An over-sheeted sail causes heel and slows the boat.'),
    suggestion: t('שחרר ראשי עד שקדמתו כמעט מתחילה לרפרף.', 'Ease the main until its luff is about to flutter.'),
  };
  return {
    id: 'pointsOfSail',
    title: t('שינוי כיווני הפלגה', 'Changing points of sail'),
    objective: t('עבור בין כיווני ההפלגה – קדמית, שטח מת, צד, גבית חלקית וגבית מלאה – וכוונן את המפרשים בכל אחד.', 'Sail through close-hauled, the no-go zone, beam reach, broad reach and running, trimming the sails for each.'),
    learningObjective: t(
      'זווית הסירה לרוח קובעת את כיוון ההפלגה. כשמתקרבים לרוח – מותחים; כשמתרחקים – משחררים.',
      'The angle to the wind defines the point of sail. Heading up – trim in; bearing away – ease out.',
    ),
    initial: { heading: 0, speed: 6, wind: { trueFrom: 90, trueSpeed: 12 }, mainHoist: 1, mainsheet: 0.5, jibDeployed: 1, jibPortSheet: 0.5, jibStarboardSheet: 0, autoTrim: true },
    steps,
    success: { cond: { all: [{ mainTrim: { min: 0.5 } }] }, holdSeconds: 0.5, requireAllSteps: true },
    timeLimit: 240,
    rules: [...safetyRules(), luffRule, stallRule, {
      id: 'inIrons',
      type: 'forbidEvent',
      event: 'inIrons',
      category: 'steering',
      area: 'steering',
      penalty: 15,
      source: 'general',
      recoverable: true,
      message: t('הסירה נעצרה בשטח המת.', 'The boat stopped in the no-go zone.'),
      explanation: t('בשטח המת המפרשים לא מניעים והסירה מאטה עד עצירה.', 'In the no-go zone the sails give no drive and the boat slows to a stop.'),
      suggestion: t('אל תשהה בשטח המת – התרחק מהרוח לפני שהמהירות אובדת.', 'Do not linger in the no-go zone – bear away before you lose all speed.'),
    }],
    commonErrors: [
      t('שינוי כיוון בלי לכוונן מפרשים.', 'Changing course without adjusting the sails.'),
      t('שהייה ארוכה בשטח המת.', 'Staying too long in the no-go zone.'),
      t('הטיית הירכתיים מעבר לרוח בגבית מלאה.', 'Sailing by the lee on a run.'),
    ],
    review: { status: 'needsInstructorReview', notes: [REVIEW_NOTE, 'Angle bands for each point of sail are an educational convention (see simulation/config.ts POINTS_OF_SAIL).'] },
  };
}
