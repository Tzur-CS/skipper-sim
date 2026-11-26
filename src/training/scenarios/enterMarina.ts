import type { Question, Rule, ScenarioDef } from './types';
import type { VesselDef } from '../../simulation/world/types';
import { t } from './common';
import { HARBOUR_REVIEW_NOTE, MARINA_SPEED_KT, closeRule, collisionFail, cpaSideRule, marinaSpeedRule, wrongAnswerRule } from './harbourCommon';

export type EnterVariant = 'day' | 'night';

export const ENTRANCE_LIGHTS_Q: Question = {
  id: 'entranceLights',
  prompt: t(
    'לפניך פתח המרינה: אור ירוק מהבהב על ראש שובר הגלים המערבי ואור אדום מהבהב על השובר הצפוני. איזה אור צריך להיות מימינך כשאתה נכנס?',
    'Ahead is the marina entrance: a flashing green light on the west breakwater head and a flashing red light on the north jetty. Which light should be on your starboard side as you enter?',
  ),
  options: [
    { id: 'green', text: t('הירוק', 'The green one') },
    { id: 'red', text: t('האדום', 'The red one') },
    { id: 'either', text: t('לא משנה, נכנסים באמצע', 'Either – just enter in the middle') },
  ],
  correct: 'green',
  explanation: t(
    'בישראל (אזור IALA A) בכניסה לנמל האדום משמאל והירוק מימין. נכנסים בחצי הימני של הפתח, קרוב לירוק, כדי שכלי יוצא יעבור לשמאלך.',
    'In Israel (IALA region A), entering harbour, red is to port and green to starboard. Enter in the right-hand half, near the green light, so a vessel leaving passes on your port side.',
  ),
};

export const FISHING_OTHER_Q: Question = {
  id: 'fishLights',
  prompt: t('במים לפני הנמל נראים אור אדום מעל אור לבן (כל-אופקיים), כמעט בלי תנועה. מה זה?', 'Off the harbour you see a red light above a white light (all-round), hardly moving. What is it?'),
  options: [
    { id: 'fishing', text: t('כלי עוסק בדיג (לא מכמורת) – להתרחק ממנו ומהציוד שלו', 'A vessel engaged in fishing (not trawling) – keep clear of it and its gear') },
    { id: 'anchored', text: t('כלי עוגן', 'A vessel at anchor') },
    { id: 'pilot', text: t('סירת נתב', 'A pilot boat') },
    { id: 'power', text: t('כלי ממונע שמתקרב', 'A power-driven vessel approaching') },
  ],
  correct: 'fishing',
  explanation: t(
    'אדום מעל לבן = עוסק בדיג שאינו מכמורת (תקנה 26). כלי מפרש וכלי ממונע מפנים לו דרך (תקנה 18). לבן מעל אדום = סירת נתב; עוגן מציג לבן כל-אופקי.',
    'Red over white = vessel fishing other than trawling (Rule 26). Sail and power give way to it (Rule 18). White over red = pilot vessel; a vessel at anchor shows an all-round white.',
  ),
};

export const POWER_HEADON_Q: Question = {
  id: 'yachtLights',
  prompt: t('מהפתח יוצא כלי ומראה אור לבן גבוה, ומתחתיו אדום וירוק יחד. מה אתה רואה?', 'A vessel coming out shows a high white light with both red and green below it. What do you see?'),
  options: [
    { id: 'powerHeadOn', text: t('כלי ממונע שבא ישר לקראתי', 'A power-driven vessel heading straight at me') },
    { id: 'sailAway', text: t('מפרשית שמתרחקת ממני', 'A sailing vessel moving away from me') },
    { id: 'anchored', text: t('כלי עוגן', 'A vessel at anchor') },
  ],
  correct: 'powerHeadOn',
  explanation: t(
    'אור תורן לבן + שני אורות הצד = כלי ממונע שחרטומו מכוון אליך (תקנה 23). כל אחד פונה ימינה ועוברים שמאל-לשמאל.',
    'White masthead light + both sidelights = a power-driven vessel heading at you (Rule 23). Each turns to starboard and you pass port-to-port.',
  ),
};

export function buildEnterMarina(variant: EnterVariant = 'day'): ScenarioDef {
  const night = variant === 'night';
  const fishing: VesselDef = { id: 'f1', kind: 'fishing', fishing: 'other', x: -395, y: 255, heading: 250, speed: 0.2, closeDist: 30 };
  const vessels: VesselDef[] = night
    ? [
        fishing,
        { id: 'my2', kind: 'motorYacht', x: -158, y: 100, heading: 0, speed: 3, path: [[-158, 150], [-155, 195], [-165, 250], [-200, 330], [-420, 520]], closeDist: 14, startT: 5 },
      ]
    : [
        fishing,
        { id: 'ws1', kind: 'windsurfer', x: -420, y: 320, heading: 80, speed: 10, path: [[-150, 345], [-130, 420], [-500, 720]], closeDist: 20 },
      ];
  const questions = night ? [ENTRANCE_LIGHTS_Q, { ...FISHING_OTHER_Q, showWhen: { answered: 'entranceLights' } }, { ...POWER_HEADON_Q, showWhen: { all: [{ answered: 'fishLights' }, { range: { id: 'my2', range: { max: 320 } } }] } }] : undefined;
  const nightRules: Rule[] = night
    ? [
        wrongAnswerRule(),
        cpaSideRule(
          'yachtWrongSide',
          'my2',
          'starboard',
          15,
          t('עברת את היאכטה היוצאת ימין-לימין.', 'You passed the outgoing yacht starboard-to-starboard.'),
          t('כשכלי ממונע בא מולך, כל אחד פונה ימינה ועוברים שמאל-לשמאל (תקנה 14). בתעלה – כל אחד שומר על ימין (תקנה 9).', 'With a power-driven vessel head-on, each alters to starboard and you pass port-to-port (Rule 14). In a channel each keeps to starboard (Rule 9).'),
          t('פנה מעט ימינה מוקדם, כך שהכלי השני יראה את האור האדום שלך.', 'Alter a little to starboard early so the other skipper sees your red sidelight.'),
        ),
        closeRule('closeYacht', { id: 'my2' }, 15, t('עברת קרוב מדי ליאכטה.', 'Too close to the yacht.'), t('בלילה קשה להעריך מרחק ומהירות. צריך מרווח גדול יותר.', 'At night distance and speed are hard to judge, so allow more room.'), t('האט ופנה ימינה מוקדם.', 'Slow down and alter to starboard early.')),
        {
          id: 'unanswered',
          type: 'atEnd',
          require: { all: [{ answered: 'entranceLights' }, { answered: 'fishLights' }] },
          category: 'procedural',
          area: 'completion',
          penalty: 10,
          source: 'general',
          message: t('לא ענית על שאלות הזיהוי.', 'You did not answer the identification questions.'),
          explanation: t('בלילה הכרת האורות היא הדרך היחידה להבין מה סביבך.', 'At night the lights are your only way to understand what is around you.'),
          suggestion: t('ענה על כל שאלה כשהיא מופיעה.', 'Answer each question when it appears.'),
        },
      ]
    : [
        closeRule(
          'closeWindsurfer',
          { kind: 'windsurfer' },
          15,
          t('עברת קרוב מדי לגלשן.', 'Too close to the windsurfer.'),
          t('גלשן רוח הוא כלי מפרש, ואתה במנוע – עליך להתרחק (תקנה 18). גלשנים מהירים ויכולים ליפול למים מולך.', 'A windsurfer is a sailing vessel and you are under engine – keep clear (Rule 18). Boards are fast and the rider may fall in right ahead of you.'),
          t('האט ותן לו לעבור לפני שאתה ממשיך.', 'Slow down and let it pass before you continue.'),
          2,
        ),
      ];
  return {
    id: 'enterMarina',
    variant,
    title: night ? t('כניסה למרינה בלילה', 'Entering the marina at night') : t('כניסה למרינה', 'Entering the marina'),
    objective: night
      ? t('היכנס במנוע למרינת גורדון בלילה, זהה את האורות, עבור את הפתח לאט בצד ימין ועצור ליד המזח שלך.', 'Motor into Gordon marina at night, identify the lights, pass the entrance slowly on its starboard side and stop at your pontoon.')
      : t('היכנס במנוע למרינת גורדון, עבור את הפתח לאט בצד ימין והגע לעצירה ליד המזח שלך.', 'Motor into Gordon marina, pass the entrance slowly on its starboard side and come to a stop at your pontoon.'),
    learningObjective: t(
      'כניסה לנמל: מורידים מפרשים בחוץ, מאטים לפני הפתח, נכנסים בחצי הימני (ירוק מימין), שומרים על ימין בנתיב ועוצרים בעזרת הילוך אחורי.',
      'Entering harbour: sails down outside, slow down before the entrance, enter in the right-hand half (green to starboard), keep right in the fairway and stop using astern.',
    ),
    initial: {
      x: -335,
      y: 435,
      heading: 140,
      speed: 4.5,
      wind: { trueFrom: 290, trueSpeed: 10 },
      mainHoist: 0,
      mainsheet: 0.6,
      jibDeployed: 0,
      jibPortSheet: 0,
      jibStarboardSheet: 0,
      motor: true,
      throttle: 0.45,
      world: { time: night ? 'night' : 'day', marina: true, vessels },
    },
    questions,
    steps: [
      {
        id: 'slowDown',
        title: t('האט לפני הפתח', 'Slow down before the entrance'),
        hint: t(`הורד את המצערת ל"איטי" (▼). בתוך המרינה עד ${MARINA_SPEED_KT} קשר.`, `Bring the throttle down to "slow" (▼). Inside the marina, max ${MARINA_SPEED_KT} kt.`),
        done: { all: [{ throttle: { max: 0.3 } }, { speed: { max: MARINA_SPEED_KT + 0.4 } }] },
        highlight: ['throttleDown'],
        source: 'general',
      },
      {
        id: 'lineUp',
        title: t('התיישר מול הפתח', 'Line up with the entrance'),
        hint: t('התקרב מבחוץ כך שתוכל לראות לתוך הפתח. האור הירוק צריך להיות מימינך.', 'Approach from outside so you can see into the entrance. The green light should be on your starboard side.'),
        done: { inZone: 'approach' },
        highlight: ['helm'],
        source: 'general',
      },
      {
        id: 'enter',
        title: t('היכנס בחצי הימני של הפתח', 'Enter in the right-hand half'),
        hint: t('עבור את הפתח קרוב לראש שובר הגלים המערבי (הירוק), לא צמוד אליו.', 'Pass the entrance towards the west breakwater head (green), not touching it.'),
        done: { event: 'gateCrossed', data: { id: 'entrance', dir: 'in' } },
        highlight: ['helm'],
        source: 'general',
      },
      {
        id: 'fairway',
        title: t('שמור על ימין בנתיב', 'Keep right in the fairway'),
        hint: t('פנה דרומה לאורך הנתיב, בחצי הימני שלו (צמוד יותר לשובר הגלים).', 'Turn south along the fairway, in its right-hand half (towards the breakwater).'),
        done: { all: [{ inZone: 'fairwayWest' }, { heading: { min: 150, max: 210 } }] },
        holdSeconds: 2,
        highlight: ['helm'],
        source: 'general',
      },
      {
        id: 'berth',
        title: t('הגע למזח הרביעי', 'Reach the 4th pontoon'),
        hint: t('המקום שלך בין המזח הרביעי לחמישי מצפון לדרום (מסומן במפה). פנה שמאלה לכיוונו לאט.', 'Your berth is between the 4th and 5th pontoons from the north (marked on the chart). Turn to port towards it slowly.'),
        done: { inZone: 'berth' },
        highlight: ['helm'],
        source: 'school',
      },
      {
        id: 'stop',
        title: t('עצור', 'Stop the boat'),
        hint: t('הילוך אחורי קצר (▼) עוצר את הסירה, ואז ניוטרל. הסירה צריכה לעמוד במקום.', 'A short burst astern (▼) stops the boat, then neutral. The boat should be stationary.'),
        done: { all: [{ inZone: 'berth' }, { throttle: { min: -0.05, max: 0.05 } }, { speed: { max: 0.4 } }] },
        holdSeconds: 2,
        highlight: ['throttleDown', 'throttleNeutral'],
        source: 'general',
      },
    ],
    success: { cond: { all: [{ inZone: 'berth' }, { throttle: { min: -0.05, max: 0.05 } }, { speed: { max: 0.4 } }] }, holdSeconds: 2 },
    timeLimit: 420,
    failOn: collisionFail,
    rules: [
      marinaSpeedRule(),
      {
        id: 'enterFast',
        type: 'checkAtEvent',
        event: 'gateCrossed',
        eventData: { id: 'entrance', dir: 'in' },
        require: { speed: { max: MARINA_SPEED_KT + 0.8 } },
        category: 'unsafe',
        area: 'steering',
        penalty: 15,
        source: 'general',
        message: t('נכנסת לפתח מהר מדי.', 'You entered too fast.'),
        explanation: t('בפתח אין מקום לתמרון, ומאחורי שובר הגלים יכול להופיע כלי יוצא.', 'There is no room to manoeuvre in the entrance and an outgoing boat may appear behind the breakwater.'),
        suggestion: t('האט כבר בגישה, הרבה לפני הפתח.', 'Slow down on the approach, well before the entrance.'),
      },
      {
        id: 'enterWrongSide',
        type: 'checkAtEvent',
        event: 'gateCrossed',
        eventData: { id: 'entrance', dir: 'in' },
        require: { inZone: 'entranceWest' },
        category: 'procedural',
        area: 'steering',
        penalty: 10,
        source: 'general',
        message: t('נכנסת בצד הלא נכון של הפתח.', 'You entered on the wrong side of the entrance.'),
        explanation: t('נכנסים בחצי הימני – קרוב לאור הירוק. כלי יוצא שומר על הצד השני.', 'Enter in the right-hand half – towards the green light. An outgoing boat keeps to the other side.'),
        suggestion: t('התיישר מול החצי הימני של הפתח לפני הכניסה.', 'Line up with the right-hand half before entering.'),
      },
      {
        id: 'wrongSideFairway',
        type: 'condDuration',
        cond: { all: [{ inZone: 'fairwayEast' }, { heading: { min: 120, max: 240 } }, { speed: { min: 0.8 } }] },
        seconds: 6,
        category: 'procedural',
        area: 'steering',
        penalty: 10,
        source: 'general',
        message: t('אתה בצד השמאלי של הנתיב.', 'You are on the port side of the fairway.'),
        explanation: t('בנתיב צר שומרים על ימין (תקנה 9), כדי שכלים יוצאים יוכלו לעבור.', 'In a narrow channel keep to starboard (Rule 9) so boats leaving can pass.'),
        suggestion: t('עבור לחצי הקרוב לשובר הגלים.', 'Move to the half nearer the breakwater.'),
      },
      closeRule(
        'closeFishing',
        { id: 'f1' },
        15,
        t('עברת קרוב מדי לסירת הדייג.', 'Too close to the fishing boat.'),
        t('כלי העוסק בדיג מוגבל בתמרון, ויש לו חכות, קווים או רשתות במים. כלים אחרים מפנים לו דרך (תקנה 18).', 'A vessel engaged in fishing is restricted by its gear – lines or nets in the water. Other vessels give way to it (Rule 18).'),
        t('עבור במרחק גדול ממנו.', 'Pass at a good distance.'),
      ),
      ...nightRules,
    ],
    commonErrors: [
      t('כניסה מהירה מדי לפתח.', 'Entering too fast.'),
      t('כניסה באמצע או בצד שמאל של הפתח.', 'Entering in the middle or on the port side.'),
      t('עצירה מאוחרת – לסירה יש תנופה גם בניוטרל.', 'Stopping late – the boat carries way even in neutral.'),
      ...(night ? [t('בלבול בין אורות הכניסה.', 'Confusing the entrance lights.')] : []),
    ],
    review: { status: 'needsInstructorReview', notes: [HARBOUR_REVIEW_NOTE, 'Berth position and pontoon numbering are invented for the drill.'] },
  };
}
