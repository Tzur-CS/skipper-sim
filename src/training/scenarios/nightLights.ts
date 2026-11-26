import type { ScenarioDef } from './types';
import { REVIEW_NOTE, safetyRules, t } from './common';
import { HARBOUR_REVIEW_NOTE, closeRule, collisionFail, wrongAnswerRule } from './harbourCommon';
import { POLICE_Q, ignoredPoliceRule } from './coastTraffic';

/** Night sail off Tel Aviv: identify vessels from their navigation lights and act on it. */
export function buildNightLights(): ScenarioDef {
  return {
    id: 'nightLights',
    title: t('ניווט לילי: אורות ודרך', 'Night sailing: lights and right of way'),
    objective: t(
      'הפלגה בלילה מול תל אביב. זהה כל כלי לפי האורות שלו, ופעל נכון: שמור דרך מול כלי ממונע, פנה דרך למכמורת ועצור לבקשת המשטרה.',
      'Night sail off Tel Aviv. Identify each vessel from its lights and act correctly: stand on for a power-driven vessel, give way to a trawler and stop for the police.',
    ),
    learningObjective: t(
      'בלילה רואים רק אורות. מצירוף האורות יודעים איזה כלי זה, מה הוא עושה ולאן הוא פונה: אור תורן לבן = ממונע; אדום = הצד השמאלי שלו, ירוק = הימני; ירוק מעל לבן = מכמורת; כחול מהבהב = אכיפה.',
      'At night you only see lights. Their combination tells you what the vessel is, what it is doing and which way it is heading: white masthead = power-driven; red = its port side, green = its starboard side; green over white = trawling; flashing blue = law enforcement.',
    ),
    initial: {
      x: -1500,
      y: 0,
      heading: 0,
      speed: 6,
      wind: { trueFrom: 270, trueSpeed: 10 },
      mainHoist: 1,
      mainsheet: 0.5,
      jibDeployed: 1,
      jibPortSheet: 0,
      jibStarboardSheet: 0.5,
      autoTrim: true,
      world: {
        time: 'night',
        marina: true,
        vessels: [
          { id: 'pv', kind: 'motorYacht', x: -1500, y: 760, heading: 180, speed: 10, intercept: [0, 15], giveWay: { atRange: 380, turn: 35 }, closeDist: 50 },
          { id: 'tr', kind: 'fishing', fishing: 'trawl', x: -1100, y: 980, heading: 270, speed: 3.5, intercept: [75], closeDist: 120 },
          { id: 'po', kind: 'police', blue: true, x: -1490, y: -380, heading: 0, speed: 16, startT: 175, follow: { offset: -40, releaseBelowKt: 2.5 }, closeDist: 12 },
        ],
      },
    },
    questions: [
      {
        id: 'ownLights',
        prompt: t('אתה מפליג בלילה במפרשים בלבד (בלי מנוע). אילו אורות הסירה שלך צריכה להציג?', 'You are sailing at night under sail only (no engine). Which lights must your yacht show?'),
        options: [
          { id: 'sideStern', text: t('אורות צד (אדום וירוק) ואור ירכתיים לבן', 'Sidelights (red and green) and a white sternlight') },
          { id: 'masthead', text: t('אור תורן לבן, אורות צד ואור ירכתיים', 'White masthead light, sidelights and sternlight') },
          { id: 'allRound', text: t('אור לבן כל-אופקי בראש התורן', 'An all-round white light at the masthead') },
        ],
        correct: 'sideStern',
        explanation: t(
          'כלי מפרש בדרכו מציג אורות צד ואור ירכתיים (תקנה 25); בסירה עד 20 מ׳ מותר אור תלת-צבעי בראש התורן במקומם. אור תורן לבן מדליקים רק כשמפליגים במנוע – ואז אתה "כלי ממונע". לבן כל-אופקי = עוגן.',
          'A sailing vessel underway shows sidelights and a sternlight (Rule 25); under 20 m a masthead tricolour may replace them. The white masthead (steaming) light is only for motoring – then you are power-driven. All-round white = at anchor.',
        ),
      },
      {
        id: 'pvLights',
        prompt: t('ממש לפניך: אור לבן גבוה, ומתחתיו אדום וירוק יחד. מה זה ומה אתה עושה?', 'Dead ahead: a high white light with red and green together below it. What is it and what do you do?'),
        options: [
          { id: 'powerHeadOn', text: t('כלי ממונע שבא ישר אליי. הוא מפנה דרך למפרשית – אני שומר כיוון ועוקב, ומוכן לפעול', 'A power-driven vessel coming straight at me. It gives way to sail – I hold course, watch it and stand ready to act') },
          { id: 'sailHeadOn', text: t('מפרשית שבאה אליי – פונים שמאלה', 'A sailing yacht coming at me – turn to port') },
          { id: 'anchored', text: t('כלי עוגן – אפשר להתעלם', 'A vessel at anchor – ignore it') },
        ],
        correct: 'powerHeadOn',
        explanation: t(
          'אור תורן + שני אורות צד = כלי ממונע שחרטומו אליך (תקנה 23). כלי ממונע מפנה דרך לכלי מפרש (תקנה 18), אבל בלילה ייתכן שלא ראה אותך – עקוב, ואם צריך לפעול, פנה ימינה ולעולם לא שמאלה.',
          'Masthead + both sidelights = power-driven vessel heading at you (Rule 23). Power gives way to sail (Rule 18), but at night it may not have seen you – watch it, and if you must act, turn to starboard, never to port.',
        ),
        showWhen: { answered: 'ownLights' },
      },
      {
        id: 'trLights',
        prompt: t('מימין לפניך: אור ירוק מעל אור לבן (כל-אופקיים) ולידם אור אדום. מה זה?', 'On your starboard bow: a green light above a white light (all-round) and a red light near them. What is it?'),
        options: [
          { id: 'trawlerPort', text: t('מכמורת שמראה לי את הצד השמאלי שלה – אני מפנה דרך', 'A trawler showing me her port side – I give way') },
          { id: 'pilot', text: t('סירת נתב – היא מפנה לי דרך', 'A pilot boat – it gives way to me') },
          { id: 'powerCrossing', text: t('כלי ממונע חוצה – הוא מפנה דרך', 'A power vessel crossing – it gives way') },
        ],
        correct: 'trawlerPort',
        explanation: t(
          'ירוק מעל לבן = עוסק במכמורת (תקנה 26). האדום הוא אור הצד השמאלי שלו, כלומר הוא חוצה מימינך לשמאלך. כלי מפרש מפנה דרך לכלי העוסק בדיג (תקנה 18): שנה כיוון ימינה מוקדם ועבור רחוק מאחוריו – הרשת ארוכה. לבן מעל אדום = נתב.',
          'Green over white = trawling (Rule 26). The red is its port sidelight, so it is crossing from your starboard to port. Sail gives way to a vessel engaged in fishing (Rule 18): alter to starboard early and pass well astern – the net is long. White over red = pilot.',
        ),
        showWhen: { all: [{ answered: 'pvLights' }, { range: { id: 'tr', range: { max: 700 } } }] },
      },
      { ...POLICE_Q, prompt: t('מאחוריך מתקרב כלי עם אור כחול מהבהב, וקורא לך בקשר לעצור. מה עושים?', 'A vessel with a flashing blue light is coming up astern and calls you on the radio to stop. What do you do?'), showWhen: { range: { id: 'po', range: { max: 320 } } } },
    ],
    steps: [
      { id: 'ownLights', title: t('האורות שלך', 'Your own lights'), hint: t('ענה על השאלה.', 'Answer the question.'), done: { answered: 'ownLights' }, source: 'general' },
      { id: 'pvLights', title: t('זהה את הכלי שלפניך', 'Identify the vessel ahead'), hint: t('ענה על השאלה.', 'Answer the question.'), done: { answered: 'pvLights' }, source: 'general' },
      {
        id: 'pvPass',
        title: t('שמור דרך ועקוב', 'Stand on and watch'),
        hint: t('שמור על הכיוון. הכלי הממונע צריך לפנות ימינה – תראה את האור הירוק שלו נעלם ורק האדום נשאר.', 'Hold your course. The power vessel should turn to starboard – you will see its green light disappear and only the red remain.'),
        done: { event: 'vesselCpa', data: { id: 'pv' } },
        highlight: ['helm'],
        source: 'general',
      },
      { id: 'trLights', title: t('זהה את האורות מימין', 'Identify the lights to starboard'), hint: t('המשך צפונה. כשיופיעו אורות חדשים מימין – ענה על השאלה.', 'Carry on north. When new lights appear to starboard, answer the question.'), done: { answered: 'trLights' }, source: 'general' },
      {
        id: 'trClear',
        title: t('פנה דרך למכמורת', 'Give way to the trawler'),
        hint: t('פנה ימינה מוקדם (לפחות 30°) ועבור הרחק מאחוריה (לפחות 120 מ׳), ואז חזור לכיוון צפון.', 'Alter to starboard early (at least 30°) and pass well astern (at least 120 m), then come back to north.'),
        done: { event: 'vesselCpa', data: { id: 'tr' } },
        highlight: ['helm'],
        source: 'general',
      },
      { id: 'policeLights', title: t('אור כחול מאחור', 'Blue light astern'), hint: t('ענה על השאלה כשהכלי מתקרב.', 'Answer the question as it comes close.'), done: { answered: 'police' }, source: 'general' },
      {
        id: 'police',
        title: t('האט לבקשת המשטרה', 'Slow down for the police'),
        hint: t('האט מתחת ל-2.5 קשר: שחרר שוטים או עלה לרוח.', 'Slow below 2.5 kt: ease the sheets or head up.'),
        done: { speed: { max: 2.5 } },
        holdSeconds: 3,
        highlight: ['easeMain', 'releaseJibStarboard'],
        source: 'general',
      },
    ],
    success: { cond: { elapsed: { min: 0 } }, holdSeconds: 0.5, requireAllSteps: true },
    timeLimit: 540,
    failOn: collisionFail,
    rules: [
      ...safetyRules(),
      wrongAnswerRule(),
      {
        id: 'turnedToPort',
        type: 'condDuration',
        cond: { all: [{ headingChange: { max: -20 } }, { not: { event: 'vesselCpa', data: { id: 'pv' } } }] },
        seconds: 3,
        category: 'unsafe',
        area: 'steering',
        penalty: 25,
        source: 'general',
        message: t('פנית שמאלה מול כלי שבא ממולך.', 'You turned to port towards an oncoming vessel.'),
        explanation: t('אם הכלי השני יפנה ימינה (כמו שהוא אמור), פנייה שלך שמאלה תביא אתכם אחד לתוך השני. שומר דרך שפועל – פונה ימינה (תקנה 17(ג)).', 'If the other vessel turns to starboard (as it should), your turn to port puts you into each other. A stand-on vessel that acts turns to starboard (Rule 17(c)).'),
        suggestion: t('שמור כיוון, ואם חייבים – ימינה.', 'Hold course, and if you must act – to starboard.'),
      },
      closeRule('closePower', { id: 'pv' }, 20, t('הכלי הממונע עבר קרוב מדי.', 'The power vessel passed too close.'), t('גם כשאתה השומר דרך, אתה אחראי למנוע התנגשות (תקנה 17(ב)).', 'Even as stand-on vessel you must act to avoid collision (Rule 17(b)).'), t('אם הוא לא פונה – אותת ופנה ימינה בזמן.', 'If it does not turn, signal and alter to starboard in time.')),
      closeRule('closeTrawler', { id: 'tr' }, 25, t('עברת קרוב מדי למכמורת.', 'Too close to the trawler.'), t('המכמורת גוררת רשת ארוכה ומוגבלת בתמרון.', 'The trawler tows a long net and cannot manoeuvre freely.'), t('פנה ימינה מוקדם יותר ובזווית גדולה יותר.', 'Alter to starboard earlier and by more.')),
      ignoredPoliceRule('po'),
    ],
    commonErrors: [
      t('הדלקת אור תורן בזמן הפלגה במפרשים.', 'Showing a masthead light while sailing.'),
      t('בלבול בין ירוק-מעל-לבן (מכמורת) ללבן-מעל-אדום (נתב).', 'Confusing green-over-white (trawler) with white-over-red (pilot).'),
      t('פנייה שמאלה מול כלי שבא ממול.', 'Turning to port for an oncoming vessel.'),
      t('הסקת כיוון הכלי השני לפי אור אחד בלבד.', 'Judging the other vessel\'s heading from a single light.'),
    ],
    review: { status: 'needsInstructorReview', notes: [REVIEW_NOTE, HARBOUR_REVIEW_NOTE, 'Light colours and arcs follow COLREGs Annex I in simplified form; ranges of visibility are not modelled.'] },
  };
}
