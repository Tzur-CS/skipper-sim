import type { ScenarioDef } from './types';
import { REVIEW_NOTE, safetyRules, t } from './common';
import { HARBOUR_REVIEW_NOTE, closeRule, collisionFail, wrongAnswerRule } from './harbourCommon';

export type RowVariant = 'giveWay' | 'standOn';

/** Two sailing yachts crossing on opposite tacks off Tel Aviv (COLREGs Rule 12). */
export function buildRightOfWay(variant: RowVariant = 'giveWay'): ScenarioDef {
  const give = variant === 'giveWay';
  const own = { x: -1200, y: 0 };
  return {
    id: 'rightOfWay',
    variant,
    title: give ? t('חוקי דרך: אתה מפנה דרך', 'Right of way: you give way') : t('חוקי דרך: אתה שומר דרך', 'Right of way: you stand on'),
    objective: give
      ? t('מפרשית במפנה ימני חוצה את דרכך. אתה במפנה שמאלי: פנה לה דרך מוקדם וברור, עבור מאחורי הירכתיים שלה וחזור לקדמית.', 'A yacht on starboard tack is crossing. You are on port tack: give way early and clearly, pass astern of her and return to close-hauled.')
      : t('מפרשית במפנה שמאלי חוצה את דרכך. אתה במפנה ימני: שמור על כיוון ומהירות ועקוב אחריה עד שתעבור.', 'A yacht on port tack is crossing. You are on starboard tack: hold your course and speed and watch her until she has passed.'),
    learningObjective: t(
      'שתי מפרשיות עם רוח מצדדים שונים: זו שבמפנה שמאלי (רוח משמאל) מפנה דרך (תקנה 12). המפנה דרך פועל מוקדם וברור (תקנה 16) ועובר מאחור; השומר דרך שומר על כיוון ומהירות (תקנה 17), אבל פועל בעצמו אם המפנה לא פועל.',
      'Two sailing vessels with the wind on different sides: the one on port tack (wind from port) gives way (Rule 12). The give-way vessel acts early and clearly (Rule 16) and passes astern; the stand-on vessel keeps its course and speed (Rule 17), but acts itself if the other does not.',
    ),
    initial: {
      ...own,
      heading: 0,
      speed: 5.5,
      wind: { trueFrom: give ? 315 : 45, trueSpeed: 12 },
      mainHoist: 1,
      mainsheet: 0.9,
      jibDeployed: 1,
      jibPortSheet: give ? 0 : 1,
      jibStarboardSheet: give ? 1 : 0,
      autoTrim: true,
      world: {
        time: 'day',
        marina: true,
        vessels: [
          give
            ? { id: 'y1', kind: 'sailingYacht', x: own.x + 280, y: own.y + 255, heading: 270, speed: 6, intercept: [0, 8], closeDist: 40 }
            : { id: 'y1', kind: 'sailingYacht', x: own.x - 280, y: own.y + 255, heading: 90, speed: 6, intercept: [0, 8], giveWay: { atRange: 230, turn: 50 }, closeDist: 30 },
        ],
      },
    },
    questions: [
      {
        id: 'who',
        prompt: give
          ? t('מפרשית מתקרבת מימין. הרוח מגיעה אליה מימין (מפנה ימני) ואליך משמאל (מפנה שמאלי). מי מפנה דרך?', 'A yacht is approaching from starboard. Her wind is from starboard (starboard tack) and yours from port (port tack). Who gives way?')
          : t('מפרשית מתקרבת משמאל. הרוח מגיעה אליה משמאל (מפנה שמאלי) ואליך מימין (מפנה ימני). מי מפנה דרך?', 'A yacht is approaching from port. Her wind is from port (port tack) and yours from starboard (starboard tack). Who gives way?'),
        options: [
          { id: 'me', text: t('אני', 'I do') },
          { id: 'them', text: t('המפרשית השנייה', 'The other yacht') },
          { id: 'faster', text: t('המהירה מבין השתיים', 'Whichever is faster') },
        ],
        correct: give ? 'me' : 'them',
        explanation: t(
          'כשלשתי מפרשיות רוח מצדדים שונים, זו שהרוח מגיעה אליה משמאל (מפנה שמאלי) מפנה דרך לזו שבמפנה ימני (תקנה 12(א)(1)).',
          'When two sailing vessels have the wind on different sides, the one with the wind on her port side (port tack) keeps out of the way of the other (Rule 12(a)(i)).',
        ),
      },
    ],
    steps: give
      ? [
          { id: 'identify', title: t('זהה מי מפנה דרך', 'Identify who gives way'), hint: t('ענה על השאלה.', 'Answer the question.'), done: { answered: 'who' }, source: 'general' },
          {
            id: 'actEarly',
            title: t('פעל מוקדם וברור', 'Act early and clearly'),
            hint: t('הסט את החרטום ימינה (התרחק מהרוח) בלפחות 20°, כך שהמפרשית השנייה תראה שאתה פונה לה דרך. אפשרות אחרת: סיבוב מוקדם.', 'Bear away to starboard by at least 20° so the other skipper sees you giving way. Alternatively, tack early.'),
            done: { any: [{ headingChange: { min: 20 } }, { tack: 'starboard' }] },
            holdSeconds: 2,
            highlight: ['helm'],
            source: 'general',
          },
          {
            id: 'passAstern',
            title: t('עבור מאחוריה', 'Pass astern of her'),
            hint: t('שמור את החרטום מכוון אל מאחורי הירכתיים שלה עד שתעבור.', 'Keep your bow pointed behind her stern until she has passed.'),
            done: { event: 'vesselCpa', data: { id: 'y1', astern: true } },
            highlight: ['helm'],
            source: 'general',
          },
          {
            id: 'resume',
            title: t('חזור לקדמית', 'Return to close-hauled'),
            hint: t('אחרי שעברת, עלה חזרה לכ-45° מהרוח.', 'Once clear, head back up to about 45° off the wind.'),
            done: { all: [{ twaAbs: { min: 35, max: 75 } }, { speed: { min: 3 } }] },
            holdSeconds: 3,
            highlight: ['helm'],
            source: 'general',
          },
        ]
      : [
          { id: 'identify', title: t('זהה מי מפנה דרך', 'Identify who gives way'), hint: t('ענה על השאלה.', 'Answer the question.'), done: { answered: 'who' }, source: 'general' },
          {
            id: 'holdCourse',
            title: t('שמור על כיוון ומהירות', 'Hold your course and speed'),
            hint: t('אתה הכלי השומר דרך: אל תשנה כיוון. עקוב אחרי המפרשית ובדוק שהיא אכן פונה.', 'You are the stand-on vessel: do not change course. Watch the other yacht and check that she does give way.'),
            done: { event: 'vesselCpa', data: { id: 'y1' } },
            highlight: ['helm'],
            source: 'general',
          },
          {
            id: 'continue',
            title: t('המשך בקדמית', 'Carry on close-hauled'),
            hint: t('היא עברה מאחוריך. המשך בדרכך.', 'She has passed astern. Carry on.'),
            done: { all: [{ twaAbs: { min: 35, max: 70 } }, { speed: { min: 3 } }] },
            holdSeconds: 2,
            source: 'general',
          },
        ],
    success: give
      ? { cond: { all: [{ event: 'vesselCpa', data: { id: 'y1', astern: true } }, { twaAbs: { min: 35, max: 75 } }, { speed: { min: 3 } }] }, holdSeconds: 3 }
      : { cond: { all: [{ event: 'vesselCpa', data: { id: 'y1' } }, { twaAbs: { min: 35, max: 70 } }, { speed: { min: 3 } }] }, holdSeconds: 2 },
    timeLimit: 150,
    failOn: collisionFail,
    rules: [
      ...safetyRules(),
      wrongAnswerRule(),
      ...(give
        ? [
            {
              id: 'crossedAhead',
              type: 'forbidEvent' as const,
              event: 'vesselCpa' as const,
              eventData: { id: 'y1', astern: false },
              category: 'unsafe' as const,
              area: 'steering' as const,
              penalty: 35,
              source: 'general' as const,
              message: t('חצית לפני החרטום של הכלי השומר דרך.', 'You crossed ahead of the stand-on vessel.'),
              explanation: t('המפנה דרך צריך להימנע מלחצות לפני החרטום של הכלי השני (תקנה 15) – אם תאט או תיתקע, תהיה התנגשות.', 'The give-way vessel should avoid crossing ahead of the other (Rule 15) – if you slow down or stall, you collide.'),
              suggestion: t('פנה ימינה ועבור מאחורי הירכתיים שלה.', 'Bear away and pass astern of her.'),
            },
            {
              id: 'lateAction',
              type: 'checkAtEvent' as const,
              event: 'vesselClose' as const,
              eventData: { id: 'y1' },
              require: { any: [{ headingDelta: { min: 15 } }, { tack: 'starboard' as const }] },
              category: 'timing' as const,
              area: 'steering' as const,
              penalty: 15,
              source: 'general' as const,
              message: t('פעלת מאוחר מדי.', 'You acted too late.'),
              explanation: t('פעולת המפנה דרך צריכה להיות מוקדמת וגדולה מספיק כדי שהשני יבין אותה (תקנה 16). שינוי קטן ומאוחר מלחיץ את הכלי השומר דרך.', 'Give-way action must be early and large enough to be obvious (Rule 16). A small, late change leaves the stand-on skipper guessing.'),
              suggestion: t('שנה כיוון ברגע שזיהית סיכון התנגשות (כיוון קבוע ומרחק שהולך וקטן).', 'Alter as soon as you see risk of collision (steady bearing, closing range).'),
            },
          ]
        : [
            {
              id: 'standOnAltered',
              type: 'condDuration' as const,
              cond: { all: [{ headingDelta: { min: 20 } }, { not: { event: 'vesselCpa' as const, data: { id: 'y1' } } }, { range: { id: 'y1', range: { min: 50 } } }] },
              seconds: 3,
              category: 'procedural' as const,
              area: 'steering' as const,
              penalty: 25,
              source: 'general' as const,
              message: t('שינית כיוון כשאתה השומר דרך.', 'You altered course as the stand-on vessel.'),
              explanation: t('השומר דרך חייב לשמור על כיוון ומהירות (תקנה 17), כדי שהמפנה יוכל לתכנן את המעבר. שינוי שלך עלול "להיכנס" לתוך התמרון שלו.', 'The stand-on vessel must keep her course and speed (Rule 17) so the give-way vessel can plan its move. Changing course can turn straight into its manoeuvre.'),
              suggestion: t('שמור על הכיוון. פעל בעצמך רק אם ברור שהשני לא פונה ושההתנגשות קרובה – ואז לא שמאלה לכיוון כלי שמשמאלך.', 'Hold on. Act yourself only if it is clear the other is not giving way and collision is close – and then not to port towards a vessel on your port side.'),
            },
          ]),
      closeRule('closeYacht', { id: 'y1' }, 25, t('עברתם קרוב מדי.', 'You passed too close.'), t('מעבר קרוב משאיר מעט מרווח לטעות, ובמפרשיות גם לשינויי רוח.', 'A close pass leaves little margin for error or a wind shift.'), give ? t('פנה מוקדם יותר ובזווית גדולה יותר.', 'Bear away earlier and by more.') : t('אם המפנה מתמהמה – אותת (5 צפירות קצרות) והתכונן לפעול.', 'If the other is slow to act, signal (five short blasts) and be ready to act.')),
    ],
    commonErrors: [
      t('בלבול בין מפנה ימני לשמאלי.', 'Confusing port and starboard tack.'),
      t('שינוי כיוון קטן ומאוחר.', 'A small, late alteration.'),
      t('חציה לפני החרטום של השומר דרך.', 'Crossing ahead of the stand-on vessel.'),
      t('השומר דרך "עוזר" ומשנה כיוון.', 'The stand-on vessel "helping" by changing course.'),
    ],
    review: { status: 'needsInstructorReview', notes: [REVIEW_NOTE, HARBOUR_REVIEW_NOTE, 'Other vessel is kinematic; it re-aims at the start to create a collision course.'] },
  };
}
