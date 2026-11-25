import type { L, Rule } from './types';

export const t = (he: string, en: string): L => ({ he, en });

export type Dir = 'starboardToPort' | 'portToStarboard';

export const REVIEW_NOTE =
  'MVP content written from generally accepted keelboat sailing practice. Not validated by a qualified Israeli sailing instructor. Terminology, command wording and order must be reviewed before use as training material.';

/** Rules shared by most scenarios. */
export function safetyRules(): Rule[] {
  return [
    {
      id: 'uncontrolledGybe',
      type: 'forbidEvent',
      event: 'uncontrolledGybe',
      category: 'unsafe',
      area: 'sails',
      penalty: 35,
      maxCount: 2,
      source: 'general',
      message: t('מהפך לא מבוקר! הבום חצה את הסירה במהירות.', 'Uncontrolled gybe! The boom swung across at high speed.'),
      explanation: t(
        'כשהרוח עוברת מאחורי הירכתיים והראשי משוחרר, הבום נזרק לצד השני בכוח רב. זה עלול לפגוע באנשים ובציוד.',
        'When the stern passes through the wind with the mainsail eased, the boom slams across with great force. It can injure crew and damage the rig.',
      ),
      suggestion: t(
        'בגבית מלאה הימנע מהטיית הירכתיים מעבר לרוח. לפני מהפך: הכן צוות, מרכז את הראשי, ורק אז פנה.',
        'On a run avoid sailing by the lee. Before a gybe: prepare the crew, centre the mainsail, then turn.',
      ),
    },
    {
      id: 'excessHeel',
      type: 'condDuration',
      cond: { heelAbs: { min: 30 } },
      seconds: 3,
      category: 'unsafe',
      area: 'sails',
      penalty: 10,
      source: 'general',
      message: t('נטייה מוגזמת של הסירה.', 'Excessive heel.'),
      explanation: t('נטייה גדולה מדי מאטה את הסירה, מקשה על ההיגוי ומסוכנת לצוות.', 'Too much heel slows the boat, causes weather helm and is uncomfortable or unsafe for crew.'),
      suggestion: t('שחרר מעט את הראשי או חלוץ, או התרחק מעט מהרוח.', 'Ease the mainsheet or jib sheet, or bear away slightly.'),
    },
  ];
}
