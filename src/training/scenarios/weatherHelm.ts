import type { Cond, ScenarioDef } from './types';
import { REVIEW_NOTE, safetyRules, t } from './common';

/** In the close-hauled groove: wind 36–58° off the bow. */
const GROOVE: Cond = { twaAbs: { min: 36, max: 58 } };

/**
 * Holding close-hauled in gusty, shifting wind. A heeled boat always wants to round up into the
 * wind (weather helm); in a gust it heels more and pulls harder. The helmsman keeps making small
 * corrections: a little lee helm all the time, more in the gusts, less in the lulls, and follows
 * the shifts.
 */
export function buildWeatherHelm(): ScenarioDef {
  return {
    id: 'weatherHelm',
    title: t('קדמית ברוח משתנה', 'Close-hauled in shifty wind'),
    objective: t('החזק קדמית במפנה ימני ברוח עם משבים ושינויי כיוון, בתיקוני הגה קטנים.', 'Hold close-hauled on starboard tack in gusty, shifting wind with small helm corrections.'),
    learningObjective: t(
      'בקדמית הסירה נוטה ותמיד נמשכת לעלות לרוח. במשב היא נוטה יותר ונמשכת חזק יותר, ברגיעה פחות, והרוח גם משנה כיוון. ההגאי מחזיק כל הזמן מעט הגה נגד ומתקן לאט ובקטן לפי שינויי הרוח.',
      'Close-hauled, the boat heels and always wants to round up into the wind. In a gust it heels more and pulls harder, in a lull less, and the wind also shifts. The helmsman holds a little opposite helm all the time and makes small, gradual corrections as the wind changes.',
    ),
    initial: {
      heading: 0,
      speed: 5.5,
      wind: { trueFrom: 45, trueSpeed: 14, gusts: 7, shifts: 8 },
      mainHoist: 1,
      mainsheet: 0.9,
      jibDeployed: 1,
      jibPortSheet: 1,
      jibStarboardSheet: 0,
      autoTrim: true,
    },
    steps: [
      {
        id: 'feel',
        title: t('הרגש את הנטייה לרוח', 'Feel the boat pull into the wind'),
        hint: t('ההגה במרכז. שים לב שהחרטום עולה לרוח מעצמו – הסירה הנוטה נמשכת אל הרוח. המחוון "נמשכת לרוח" מראה כמה חזק.', 'The wheel is centred. Watch the bow head up into the wind by itself – a heeled boat pulls towards the wind. The "Pulling into the wind" indicator shows how hard.'),
        done: { headingChange: { min: 4 } },
        optional: true,
        highlight: ['helm'],
        source: 'general',
      },
      {
        id: 'counter',
        title: t('החזק מעט הגה נגד', 'Hold a little opposite helm'),
        hint: t('סובב את ההגה מעט שמאלה – כמה מעלות בלבד, בדיוק כמה שצריך כדי שהחרטום יפסיק לעלות – והחזר לכ-45° מהרוח. זה המצב הרגיל בקדמית.', 'Turn the wheel a little to port – only a few degrees, just enough to stop the bow climbing – and settle back to about 45° off the wind. That is normal close-hauled.'),
        done: { all: [GROOVE, { rudderAbs: { min: 2 } }, { yawRateAbs: { max: 1.5 } }] },
        holdSeconds: 3,
        highlight: ['helm'],
        source: 'general',
      },
      {
        id: 'gust',
        title: t('משב – הוסף הגה לפני שהיא עולה', 'Gust – add helm before she rounds up'),
        hint: t('כשמגיע משב הסירה נוטה יותר ונמשכת חזק יותר לרוח. הוסף מעט הגה נגד (ואפשר לשחרר מעט ראשי) ושמור על הכיוון.', 'When a gust arrives the boat heels more and pulls harder into the wind. Add a little more opposite helm (you can also ease the main a little) and keep your course.'),
        done: { all: [{ gust: { min: 3 } }, GROOVE] },
        holdSeconds: 3,
        highlight: ['helm', 'mainsheet'],
        source: 'general',
      },
      {
        id: 'lull',
        title: t('רגיעה ושינויי כיוון – תיקונים קטנים', 'Lulls and shifts – small corrections'),
        hint: t('כשהמשב עובר הסירה פחות נמשכת – הקטן את ההגה. אם הרוח עוברת לחרטום והמפרשים מרפרפים – רד מעט; אם היא נפתחת – עלה מעט חזרה. תיקונים קטנים ואיטיים.', 'As the gust passes she pulls less – take some helm off. If the wind moves forward and the sails luff, bear away a little; if it frees, head back up a little. Small, slow corrections.'),
        done: { all: [{ elapsed: { min: 50 } }, GROOVE] },
        holdSeconds: 3,
        highlight: ['helm'],
        source: 'general',
      },
      {
        id: 'groove',
        title: t('שמור על קדמית', 'Stay in the groove'),
        hint: t('המשך להחזיק כ-45° מהרוח במהירות טובה, בלי לעלות לרוח ובלי לרדת ממנה.', 'Keep about 45° off the wind at good speed, neither luffing nor sagging off.'),
        done: { all: [GROOVE, { speed: { min: 4 } }] },
        holdSeconds: 5,
        highlight: ['helm'],
        source: 'general',
      },
    ],
    success: {
      cond: { all: [GROOVE, { speed: { min: 4 } }, { yawRateAbs: { max: 2.5 } }, { elapsed: { min: 60 } }] },
      holdSeconds: 15,
    },
    timeLimit: 150,
    rules: [
      ...safetyRules(),
      {
        id: 'roundUp',
        type: 'condDuration',
        cond: { twaAbs: { max: 30 } },
        seconds: 3,
        maxCount: 3,
        category: 'steering',
        area: 'steering',
        penalty: 10,
        source: 'general',
        recoverable: true,
        message: t('הסירה עלתה לרוח – המפרשים מרפרפים.', 'The boat rounded up – the sails are luffing.'),
        explanation: t('הסירה הנוטה נמשכת לרוח, ובמשב חזק יותר. בלי הגה נגד היא עולה עד שהמפרשים מאבדים את הרוח והמהירות יורדת.', 'The heeled boat pulls into the wind, harder in a gust. Without opposite helm she climbs until the sails lose their wind and the speed drops.'),
        suggestion: t('החזק מעט הגה נגד כל הזמן, והוסף עוד ברגע שהמשב מגיע (או שחרר מעט ראשי).', 'Hold a little opposite helm all the time and add more as the gust arrives (or ease the main a little).'),
      },
      {
        id: 'sagOff',
        type: 'condDuration',
        cond: { twaAbs: { min: 65 } },
        seconds: 6,
        maxCount: 2,
        category: 'steering',
        area: 'steering',
        penalty: 10,
        source: 'general',
        recoverable: true,
        message: t('ירדת רחוק מדי מהקדמית.', 'You sagged off too far from close-hauled.'),
        explanation: t('תיקון גדול מדי נגד הנטייה לרוח מוריד את הסירה לצד, ומאבדים גובה.', 'Over-correcting the weather helm bears the boat away to a reach and you lose ground upwind.'),
        suggestion: t('תקן בקטן: כמה מעלות הגה מספיקות. כשהמשב עובר – הקטן את ההגה.', 'Correct in small steps: a few degrees of helm are enough. When the gust passes, take some helm off.'),
      },
      {
        id: 'bigHelm',
        type: 'condDuration',
        cond: { all: [{ rudderAbs: { min: 15 } }, { pointOfSail: ['closeHauled', 'closeReach', 'noGo'] }] },
        seconds: 4,
        maxCount: 2,
        category: 'steering',
        area: 'steering',
        penalty: 5,
        source: 'general',
        message: t('תיקוני הגה גדולים מדי.', 'Helm corrections are too big.'),
        explanation: t('הגה גדול בולם את הסירה ומחליף נטייה אחת בשנייה. ההגאי הטוב מתקן מעט ומוקדם.', 'A lot of rudder brakes the boat and swaps one swing for another. A good helmsman corrects early and a little.'),
        suggestion: t('תקן מוקדם ובקטן, לפי ההרגשה של הסירה והמחוון "נמשכת לרוח".', 'Correct early and a little, by the feel of the boat and the "Pulling into the wind" indicator.'),
      },
      {
        id: 'inIrons',
        type: 'forbidEvent',
        event: 'inIrons',
        category: 'steering',
        area: 'steering',
        penalty: 20,
        source: 'general',
        recoverable: true,
        message: t('הסירה נעצרה מול הרוח.', 'The boat stopped head to wind.'),
        explanation: t('הנטייה לרוח לא תוקנה והסירה עלתה עד שנעצרה.', 'The weather helm was not held and the boat rounded up until she stopped.'),
        suggestion: t('החזק הגה נגד מוקדם, לפני שהסירה מאיצה פנייה לרוח.', 'Hold opposite helm early, before the boat swings into the wind.'),
      },
    ],
    commonErrors: [
      t('ההגה במרכז בקדמית – הסירה עולה לרוח לבד.', 'Wheel centred close-hauled – the boat rounds up by itself.'),
      t('תגובה מאוחרת למשב – הסירה כבר עלתה לרוח.', 'Reacting late to a gust – the boat has already rounded up.'),
      t('תיקונים גדולים מדי – זיגזג וירידה לצד.', 'Over-correcting – zig-zagging and sagging off to a reach.'),
      t('שכחה להקטין הגה כשהמשב עובר.', 'Forgetting to take helm off when the gust passes.'),
    ],
    review: {
      status: 'needsInstructorReview',
      notes: [
        REVIEW_NOTE,
        'Drill requested by the project owner (2026-11-27): close-hauled the boat always wants to head up; show it in varying wind so the student keeps making small corrections.',
        'Weather helm is modelled as a yaw tendency proportional to heel (about 4° of rudder at 10 kt, 6° at 14 kt, 7–8° at 20 kt close-hauled). Gusts and shifts follow a fixed repeating pattern, not real wind statistics. Traveller, backstay and crew weight are not modelled.',
      ],
    },
  };
}
