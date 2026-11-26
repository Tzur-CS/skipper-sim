/**
 * Learning content shown on the info pages (Hebrew default, English secondary).
 *
 * REVIEW: written from generally accepted keelboat sailing knowledge. Not validated by a qualified
 * Israeli sailing instructor and not an official statement of licensing rules. Official, binding
 * details are only on the authority's website (linked below). Do not add fees, ages, exam formats or
 * other requirements here unless they are copied from, and linked to, an official source.
 */
export interface L {
  he: string;
  en: string;
}
const t = (he: string, en: string): L => ({ he, en });

export interface LinkItem {
  url: string;
  title: L;
  desc: L;
  tag: L;
}

/** Only links the project owner supplied, with descriptions checked against the pages themselves. */
export const LINKS: LinkItem[] = [
  {
    url: 'https://www.gov.il/he/pages/exame_small_vessel',
    title: t('בחינות לכלי שיט קטנים – gov.il', 'Small-vessel exams – gov.il'),
    desc: t(
      'עמוד השירות הממשלתי על הבחינות לרישיונות כלי שיט קטנים. כאן בודקים תנאים, הרשמה, מועדים ואגרות – המידע הרשמי והעדכני.',
      'The government service page for small-vessel licence exams. Check eligibility, registration, dates and fees here – the official, current information.',
    ),
    tag: t('רשמי', 'Official'),
  },
  {
    url: 'https://yamsailing.vp4.me/welcometoyam',
    title: t('ים סיילינג – קורס הסקיפרים', 'Yam Sailing – skipper course'),
    desc: t(
      'עמוד הפתיחה של קורס הסקיפרים בבית הספר ים סיילינג: הפלגות תלמידים, הרשמה לבחינות, שיעורי תיאוריה, תשלום אגרות וטופס כחול.',
      'Welcome page of the Yam Sailing school skipper course: student sailings, exam registration, theory lessons, fee payment and the blue form.',
    ),
    tag: t('בית ספר לשיט', 'Sailing school'),
  },
];

export interface Section {
  title: L;
  body?: L;
  items?: L[];
}

/** About the licence: general orientation only, pointing to the official page for every rule. */
export const LICENCE: Section[] = [
  {
    title: t('מה זה רישיון משיט 30?', 'What is the skipper (30) licence?'),
    body: t(
      'רישיון משיט 30 הוא רישיון ישראלי להשטת יאכטה או סירת מנוע. בדרך כלל מגיעים אליו אחרי קורס בבית ספר לשיט, שמשלב שיעורי תיאוריה והפלגות מעשיות, ואחריו בחינות. מה בדיוק כל רישיון מתיר ומה התנאים לקבל אותו – מופיע בעמוד הרשמי.',
      'The skipper (30) licence is an Israeli licence to skipper a yacht or motor boat. People usually reach it through a sailing-school course that combines theory lessons and practical sailing, followed by exams. Exactly what each licence allows and the conditions for getting it are on the official page.',
    ),
  },
  {
    title: t('הדרך המקובלת לרישיון', 'The usual path to the licence'),
    items: [
      t('קורס בבית ספר לשיט: שיעורי תיאוריה והפלגות תלמידים.', 'A course at a sailing school: theory lessons and student sailings.'),
      t('בחינה עיונית (תיאוריה).', 'A theory exam.'),
      t('בחינה מעשית בים.', 'A practical exam at sea.'),
      t('הנפקת הרישיון לאחר עמידה בדרישות.', 'The licence is issued once the requirements are met.'),
    ],
    body: t(
      'הסדר, התנאים המקדימים, המסמכים (למשל טפסים רפואיים) והאגרות נקבעים על ידי הרשות ועשויים להשתנות. בדקו תמיד בעמוד הרשמי ומול בית הספר.',
      'The order, prerequisites, documents (for example medical forms) and fees are set by the authority and may change. Always check the official page and with your school.',
    ),
  },
  {
    title: t('במה הסימולטור עוזר', 'Where the simulator helps'),
    items: [
      t('להבין איך הרוח, המפרשים וההגה עובדים יחד – לפני שעולים לסירה.', 'Understand how wind, sails and helm work together – before you step aboard.'),
      t('לתרגל את סדר הפקודות בסיבוב ובמהפך עד שהוא טבעי.', 'Rehearse the order of commands for tacking and gybing until it is natural.'),
      t('לזהות נתיבי הפלגה וכיוון רוח מדומה מהמכשירים.', 'Recognise points of sail and apparent wind from the instruments.'),
      t('לראות טעויות נפוצות (כמו מהפך לא מבוקר) בלי סיכון.', 'See common mistakes (such as an uncontrolled gybe) without risk.'),
    ],
    body: t(
      'הסימולטור לא מחליף הדרכה מעשית, ואינו מבחן רשמי.',
      'The simulator does not replace practical instruction and is not an official exam.',
    ),
  },
];

export interface Term {
  term: L;
  def: L;
}

/** Parts of the boat (same terms as the simulator's HUD). */
export const BOAT_PARTS: Term[] = [
  { term: t('חרטום', 'Bow'), def: t('החלק הקדמי של הסירה.', 'The front of the boat.') },
  { term: t('ירכתיים', 'Stern'), def: t('החלק האחורי של הסירה, שם נמצא ההגה.', 'The back of the boat, where the helm is.') },
  { term: t('ימין / שמאל', 'Starboard / Port'), def: t('ימין ושמאל של הסירה כשמסתכלים קדימה. בסימולטור ימין ירוק ושמאל אדום.', 'Right and left of the boat when facing forward. In the simulator starboard is green and port is red.') },
  { term: t('תורן', 'Mast'), def: t('העמוד האנכי שמחזיק את המפרשים.', 'The vertical spar that carries the sails.') },
  { term: t('בום', 'Boom'), def: t('המוט האופקי בתחתית המפרש הראשי. במהפך הוא עובר צד בכוח – שימו לב לראש.', 'The horizontal spar along the foot of the mainsail. In a gybe it swings across hard – mind your head.') },
  { term: t('מפרש ראשי', 'Mainsail'), def: t('המפרש שמאחורי התורן, מחובר לבום.', 'The sail behind the mast, attached to the boom.') },
  { term: t('חלוץ', 'Jib'), def: t('המפרש הקדמי, לפני התורן. בסימולטור הוא נגלל ונפתח.', 'The front sail, ahead of the mast. In the simulator it furls and unfurls.') },
  { term: t('שוט', 'Sheet'), def: t('החבל ששולט בזווית המפרש: מותחים כדי לקרב את המפרש, משחררים כדי לפתוח אותו.', 'The line that controls the sail’s angle: trim to bring the sail in, ease to let it out.') },
  { term: t('מעלן', 'Halyard'), def: t('החבל שמרים ומוריד את המפרש.', 'The line that hoists and lowers a sail.') },
  { term: t('כננת', 'Winch'), def: t('תוף שעליו מלפפים שוט כדי למתוח בכוח. בסירה בסימולטור יש ארבע: שתיים לחלוץ ושתיים לראשי.', 'A drum the sheet is wrapped around to pull it in under load. The simulator boat has four: two for the jib, two for the main.') },
  { term: t('מסילת עגלה', 'Traveller'), def: t('מסילה רוחבית שעליה נע חיבור שוט הראשי.', 'A track across the boat along which the mainsheet attachment slides.') },
  { term: t('הגה', 'Helm'), def: t('גלגל ההגה שמפנה את הסירה דרך סנפיר ההגה שמתחת למים.', 'The wheel that turns the boat through the rudder under the water.') },
  { term: t('קיל', 'Keel'), def: t('הסנפיר הכבד מתחת לסירה שמונע ממנה לגלוש הצידה ומייצב אותה.', 'The heavy fin under the boat that stops it slipping sideways and keeps it upright.') },
];

/** Points of sail, using the simulator's own angle ranges (relative to the true wind). */
export const POINTS: Array<{ id: string; from: number; to: number; color: string; def: L }> = [
  { id: 'noGo', from: 0, to: 40, color: '#ef4444', def: t('קרוב מדי לרוח: המפרשים מתנפנפים והסירה נעצרת.', 'Too close to the wind: the sails flap and the boat stops.') },
  { id: 'closeHauled', from: 40, to: 60, color: '#f59e0b', def: t('הכי קרוב לרוח שאפשר לשוט. המפרשים מתוחים כמעט עד הסוף.', 'As close to the wind as you can sail. Sails trimmed nearly all the way in.') },
  { id: 'closeReach', from: 60, to: 80, color: '#eab308', def: t('בין קדמית לצד. משחררים מעט את השוטים.', 'Between close-hauled and beam reach. Ease the sheets a little.') },
  { id: 'beamReach', from: 80, to: 105, color: '#22c55e', def: t('הרוח מהצד. בדרך כלל הנתיב המהיר והנוח.', 'Wind from the side. Usually the fastest, most comfortable course.') },
  { id: 'broadReach', from: 105, to: 155, color: '#06b6d4', def: t('הרוח מאחור באלכסון. המפרשים פתוחים הרבה.', 'Wind from behind at an angle. Sails eased well out.') },
  { id: 'running', from: 155, to: 180, color: '#3b82f6', def: t('הרוח מאחור. זהירות ממהפך לא מבוקר.', 'Wind from behind. Beware of an uncontrolled gybe.') },
];

export const MANOEUVRES: Section[] = [
  {
    title: t('סיבוב (Tack)', 'Tacking'),
    body: t(
      'מעבירים את החרטום דרך הרוח, מצד לצד. החלוץ עובר צד: משחררים את השוט הישן ומותחים את החדש. משמשים בו כדי להתקדם נגד הרוח בזיגזג.',
      'Turn the bow through the wind from one side to the other. The jib changes sides: release the old sheet and trim the new one. Used to make progress upwind in a zigzag.',
    ),
  },
  {
    title: t('מהפך (Gybe)', 'Gybing'),
    body: t(
      'מעבירים את הירכתיים דרך הרוח, כשהרוח מאחור. הבום עובר צד בכוח, ולכן ממרכזים את הראשי לפני ומשחררים אחרי. מהפך לא מבוקר הוא מצב מסוכן.',
      'Turn the stern through the wind, with the wind behind. The boom swings across hard, so centre the main first and ease it after. An uncontrolled gybe is dangerous.',
    ),
  },
  {
    title: t('תקוע ברוח (In irons)', 'In irons'),
    body: t(
      'הסירה נעצרה כשהחרטום מול הרוח ואין לה דרך. בסימולטור תראו אזהרה. יוצאים על ידי הגה לצד אחד ופתיחת החלוץ לצד השני.',
      'The boat has stopped head to wind with no way on. The simulator warns you. Get out by putting the helm one way and backing the jib the other way.',
    ),
  },
];

export const HOW_TO: L[] = [
  t('התחילו ב"התחל אימון" במצב מודרך – כל שלב מסביר מה לעשות ומדגיש את הכפתור הנכון.', 'Start with “Start training” in guided mode – every step explains what to do and highlights the right control.'),
  t('בטלפון: גוררים על פס ההגה עם האגודל, השוטים תמיד בפינה, ופקודות לצוות במגירה.', 'On a phone: drag the steering bar with your thumb; sheets are always in the corner; crew commands are in the drawer.'),
  t('כפתור 🎥 מחליף מבט: הגאי, חיצוני, מלמעלה ותקריב כננות.', 'The 🎥 button switches views: helm, outside, top-down and a winch close-up.'),
  t('כשמרגישים בטוחים – נסו מצב תרגול ואחר כך מצב מבחן.', 'When you feel confident, try practice mode and then exam mode.'),
];
