import type { Question, Rule, ScenarioDef } from './types';
import { REVIEW_NOTE, safetyRules, t } from './common';
import { HARBOUR_REVIEW_NOTE, closeRule, collisionFail, wrongAnswerRule } from './harbourCommon';
import { optimistFleet } from './leaveMarina';

export const POLICE_Q: Question = {
  id: 'police',
  prompt: t('סירת משטרה עם אור כחול מהבהב מתקרבת ומסמנת לך לעצור. מה עושים?', 'A police boat with a flashing blue light comes up and signals you to stop. What do you do?'),
  options: [
    { id: 'stop', text: t('מאטים ועוצרים, מאזינים בערוץ 16 וממלאים את ההוראות', 'Slow down and stop, listen on VHF 16 and follow the instructions') },
    { id: 'ignore', text: t('ממשיכים – אני מפרשית ויש לי זכות דרך', 'Carry on – I am under sail and have right of way') },
    { id: 'away', text: t('פונים ממנה ומתרחקים מהר', 'Turn away and get clear quickly') },
  ],
  correct: 'stop',
  explanation: t(
    'אור כחול מהבהב מסמן כלי אכיפה (משטרה). חובה למלא את הוראותיו: מאטים, מוכנים לעצור, מאזינים בערוץ 16 ומחזיקים מסמכים (רישיון, רישיון כלי, ציוד בטיחות) זמינים.',
    'A flashing blue light marks a law-enforcement vessel. You must follow its instructions: slow down, be ready to stop, listen on VHF 16 and have documents (licence, boat registration, safety gear) ready.',
  ),
};

export function ignoredPoliceRule(id: string): Rule {
  return {
    id: 'ignoredPolice',
    type: 'condDuration',
    cond: { all: [{ range: { id, range: { max: 70 } } }, { speed: { min: 3 } }] },
    seconds: 25,
    category: 'procedural',
    area: 'completion',
    penalty: 20,
    source: 'general',
    message: t('לא האטת לפי הוראת המשטרה.', 'You did not slow down for the police.'),
    explanation: t('הוראות של כלי אכיפה מחייבות. אי-ציות הוא עבירה, ובקרבת סירה נוספת מהירות גבוהה מסוכנת.', 'Instructions from law enforcement are binding. Ignoring them is an offence, and speed close alongside another boat is dangerous.'),
    suggestion: t('האט מתחת ל-2.5 קשר: שחרר את השוטים (המפרשים מתנפנפים) או עלה לכיוון הרוח.', 'Slow below 2.5 kt: ease the sheets right out (sails luff) or head up towards the wind.'),
  };
}

/** Sailing north along Gordon beach: boards, a kite, a trawler, the police and a sailing school. */
export function buildCoastTraffic(): ScenarioDef {
  return {
    id: 'coastTraffic',
    title: t('תנועה לאורך חוף גורדון', 'Traffic off Gordon beach'),
    objective: t(
      'הפלג צפונה לאורך החוף מחוץ לאזור הרחצה. התרחק מגלשנים וגולשי קייט, פנה דרך לסירת דייג, עצור לבקשת המשטרה ועקוף את סירות הילדים ליד המרינה.',
      'Sail north along the beach outside the bathing area. Keep clear of windsurfers and kitesurfers, give way to a trawler, stop for the police and go round the children\'s dinghies by the marina.',
    ),
    learningObjective: t(
      'ליד החוף יש הרבה כלים קטנים ומהירים. כלי מפרש מפנה דרך לכלי העוסק בדיג (תקנה 18), נמנע ממעבר קרוב מאחורי מכמורת, נותן מרחב לגלשנים ולקייטים (קווים ארוכים, נפילות), ונשמע להוראות כלי אכיפה.',
      'Near the beach there are many small, fast craft. A sailing vessel gives way to a vessel engaged in fishing (Rule 18), avoids passing close astern of a trawl, gives boards and kites plenty of room (long lines, falls), and obeys law enforcement.',
    ),
    initial: {
      x: -380,
      y: -450,
      heading: 0,
      speed: 6,
      wind: { trueFrom: 270, trueSpeed: 12 },
      mainHoist: 1,
      mainsheet: 0.5,
      jibDeployed: 1,
      jibPortSheet: 0,
      jibStarboardSheet: 0.5,
      autoTrim: true,
      world: {
        time: 'day',
        marina: true,
        swimZone: true,
        zones: [
          { id: 'pastBoards', kind: 'rect', x0: -2000, y0: -20, x1: 0, y1: 3000 },
          { id: 'north', kind: 'rect', x0: -1200, y0: 520, x1: -250, y1: 3000 },
        ],
        vessels: [
          { id: 'ws1', kind: 'windsurfer', x: -540, y: -300, heading: 90, speed: 12, path: [[-120, -290], [-540, -300]], loop: true, closeDist: 25 },
          { id: 'ws2', kind: 'windsurfer', x: -160, y: -180, heading: 270, speed: 11, path: [[-560, -170], [-160, -180]], loop: true, closeDist: 25 },
          { id: 'k1', kind: 'kitesurfer', x: -620, y: -60, heading: 90, speed: 16, path: [[-180, -45], [-620, -60]], loop: true, closeDist: 40 },
          { id: 'f1', kind: 'fishing', fishing: 'trawl', x: -720, y: 120, heading: 90, speed: 3, intercept: [0, 40], closeDist: 90 },
          { id: 'p1', kind: 'police', blue: true, x: -380, y: -1100, heading: 0, speed: 18, startT: 100, follow: { offset: -35, releaseBelowKt: 2.5 }, closeDist: 12 },
          ...optimistFleet(-310, 320, 26),
        ],
      },
    },
    questions: [
      {
        id: 'trawler',
        prompt: t('משמאל לפניך סירת דייג ועל התורן שלה שני חרוטים שחורים שקודקודיהם נוגעים זה בזה. מי מפנה דרך?', 'On your port bow is a fishing boat showing two black cones with their points together. Who gives way?'),
        options: [
          { id: 'me', text: t('אני – היא עוסקת בדיג, ויש לה רשת מאחור', 'I do – she is engaged in fishing, with a net astern') },
          { id: 'them', text: t('היא – אני מפרשית', 'She does – I am under sail') },
          { id: 'starboard', text: t('מי שמימין', 'Whoever is on the right') },
        ],
        correct: 'me',
        explanation: t(
          'שני חרוטים קודקוד-אל-קודקוד = כלי העוסק בדיג (תקנה 26). כלי מפרש מפנה לו דרך (תקנה 18). מכמורת גוררת רשת מאות מטרים מאחוריה – לא עוברים קרוב מאחור.',
          'Two cones point-to-point = vessel engaged in fishing (Rule 26). A sailing vessel keeps out of its way (Rule 18). A trawler tows its net hundreds of metres astern – never pass close behind.',
        ),
        showWhen: { range: { id: 'f1', range: { max: 450 } } },
      },
      { ...POLICE_Q, showWhen: { range: { id: 'p1', range: { max: 250 } } } },
    ],
    steps: [
      {
        id: 'boards',
        title: t('עבור את הגלשנים והקייט', 'Get past the boards and the kite'),
        hint: t('גלשנים וקייט חוצים את דרכך במהירות. שמור מרחק (קייט: לפחות 40 מ׳ – הקווים ארוכים), אל תיכנס לאזור הרחצה שמימין (מצופים צהובים).', 'Boards and a kite cross your track at speed. Keep your distance (kite: at least 40 m – the lines are long) and stay out of the bathing area to starboard (yellow buoys).'),
        done: { inZone: 'pastBoards' },
        highlight: ['helm'],
        source: 'general',
      },
      {
        id: 'fishing',
        title: t('פנה דרך לסירת הדייג', 'Give way to the trawler'),
        hint: t('ענה על השאלה, ואז שנה כיוון מוקדם כך שתעבור רחוק ממנה (לפחות 90 מ׳), לא קרוב מאחוריה.', 'Answer the question, then alter course early to pass well clear (at least 90 m), not close astern.'),
        done: { all: [{ answered: 'trawler' }, { event: 'vesselCpa', data: { id: 'f1' } }] },
        highlight: ['helm'],
        source: 'general',
      },
      {
        id: 'police',
        title: t('האט לבקשת המשטרה', 'Slow down for the police'),
        hint: t('ענה על השאלה והאט מתחת ל-2.5 קשר: שחרר שוטים או עלה לרוח.', 'Answer the question and slow below 2.5 kt: ease the sheets or head up.'),
        done: { all: [{ answered: 'police' }, { speed: { max: 2.5 } }] },
        holdSeconds: 3,
        highlight: ['easeMain', 'releaseJibStarboard'],
        source: 'general',
      },
      {
        id: 'kids',
        title: t('עקוף את סירות בית הספר', 'Go round the sailing school'),
        hint: t('מתח שוב את המפרשים והמשך צפונה. אופטימיסטים של ילדים ליד פתח המרינה – עבור רחוק מהם.', 'Trim the sails again and carry on north. Children\'s Optimists are sailing by the marina entrance – pass well clear.'),
        done: { inZone: 'north' },
        highlight: ['helm', 'trimMain', 'trimJibStarboard'],
        source: 'general',
      },
    ],
    success: { cond: { inZone: 'north' }, holdSeconds: 1, requireAllSteps: true },
    timeLimit: 540,
    failOn: collisionFail,
    rules: [
      ...safetyRules(),
      wrongAnswerRule(),
      {
        id: 'swimZone',
        type: 'condDuration',
        cond: { inZone: 'swim' },
        seconds: 1,
        category: 'unsafe',
        area: 'steering',
        penalty: 30,
        source: 'general',
        message: t('נכנסת לאזור הרחצה!', 'You entered the bathing area!'),
        explanation: t('אסור לכלי שייט להיכנס לאזור רחצה מסומן. שחיינים כמעט אינם נראים מהסירה.', 'Vessels must not enter a marked bathing area. Swimmers are almost invisible from a boat.'),
        suggestion: t('שמור מרחק מקו המצופים הצהובים.', 'Keep well outside the line of yellow buoys.'),
      },
      closeRule('closeBoard', { kind: 'windsurfer' }, 15, t('עברת קרוב מדי לגלשן.', 'Too close to a windsurfer.'), t('גלשן הוא כלי מפרש מהיר. הוא יכול ליפול או להחליף כיוון פתאום, ובעיקר בגלישה מתחת לרוח שלך הוא מאבד רוח.', 'A windsurfer is a fast sailing craft. The rider can fall or change direction suddenly, and loses wind in your wind shadow.'), t('צפה את המסלול שלו ועבור מאחוריו, בפער גדול.', 'Predict his track and pass astern with a wide margin.'), 2),
      closeRule('closeKite', { kind: 'kitesurfer' }, 20, t('עברת קרוב מדי לגולש הקייט.', 'Too close to the kitesurfer.'), t('הקייט נמצא 20–30 מ׳ מהגולש, והקווים כמעט לא נראים. התורן שלך יכול להסתבך בהם.', 'The kite flies 20–30 m from the rider and the lines are almost invisible. Your rig can foul them.'), t('שמור לפחות 40 מ׳, ובמיוחד אל תעבור מתחת לרוח שלו (בצד שאליו הקייט מושך).', 'Keep at least 40 m away, especially downwind of him (the side the kite is on).')),
      closeRule('closeTrawler', { id: 'f1' }, 25, t('עברת קרוב מדי לסירת הדייג.', 'Too close to the trawler.'), t('הרשת נגררת הרחק מאחור, וכלי הדייג מוגבל בתמרון.', 'The net is towed far astern and the fishing vessel cannot manoeuvre freely.'), t('שנה כיוון מוקדם ועבור רחוק ממנה.', 'Alter course early and pass well clear.')),
      closeRule('closeKids', { kind: 'optimist' }, 20, t('עברת קרוב מדי לסירות הילדים.', 'Too close to the children\'s dinghies.'), t('ילדים באופטימיסט עלולים להתהפך או לשנות כיוון, והמפרשית שלך מסתירה להם את הרוח.', 'Children in Optimists can capsize or change course, and your sails take their wind.'), t('עבור הרחק מהקבוצה, רצוי מתחת לרוח שלה.', 'Pass well clear of the group, preferably downwind of it.'), 2),
      ignoredPoliceRule('p1'),
    ],
    commonErrors: [
      t('הפלגה קרובה מדי לחוף ולאזור הרחצה.', 'Sailing too close to the beach and the bathing area.'),
      t('הנחה שהגלשן "יזוז" כי הוא קטן.', 'Assuming the board will move because it is small.'),
      t('מעבר קרוב מאחורי מכמורת.', 'Passing close astern of a trawler.'),
      t('המשך הפלגה כשהמשטרה מסמנת לעצור.', 'Carrying on when the police signal to stop.'),
    ],
    review: {
      status: 'needsInstructorReview',
      notes: [REVIEW_NOTE, HARBOUR_REVIEW_NOTE, 'Bathing area, distances to boards/kites and police procedure are training values, not official limits. Whether kitesurfers count as "vessels" under COLREGs is debated; the drill treats them as craft to keep well clear of.'],
    },
  };
}
