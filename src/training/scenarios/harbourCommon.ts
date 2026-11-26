import type { SimEventType } from '../../simulation/types';
import type { VesselKind } from '../../simulation/world/types';
import type { L, Rule, ScenarioDef } from './types';
import { t } from './common';

export const HARBOUR_REVIEW_NOTE =
  'Harbour, traffic and night-light content written from the COLREGs (International Regulations for Preventing Collisions at Sea) and general practice. The Gordon (Tel Aviv) marina layout, entrance orientation, light characteristics, speed limit and local rules are SCHEMATIC and must be checked against the current chart and marina regulations by a qualified Israeli instructor.';

export const collisionFail: NonNullable<ScenarioDef['failOn']> = {
  cond: { event: 'collision' },
  message: t('התנגשות! התרגיל נכשל.', 'Collision! The drill failed.'),
};

export const VESSEL_NAME: Record<VesselKind, L> = {
  optimist: t('אופטימיסט (ילד בסירת מפרש קטנה)', 'Optimist dinghy (child sailor)'),
  windsurfer: t('גלשן רוח', 'Windsurfer'),
  kitesurfer: t('גולש קייט', 'Kitesurfer'),
  sailingYacht: t('מפרשית', 'Sailing yacht'),
  motorYacht: t('יאכטה ממונעת', 'Motor yacht'),
  fishing: t('סירת דייג', 'Fishing vessel'),
  police: t('סירת משטרה', 'Police boat'),
};

/** Speed limit inside the marina (kt). REVIEW: check the marina's published limit. */
export const MARINA_SPEED_KT = 3;

export function marinaSpeedRule(): Rule {
  return {
    id: 'marinaSpeed',
    type: 'condDuration',
    cond: { all: [{ inZone: 'marina' }, { speed: { min: MARINA_SPEED_KT + 0.6 } }] },
    seconds: 3,
    category: 'unsafe',
    area: 'steering',
    penalty: 15,
    maxCount: 2,
    source: 'school',
    message: t('מהירות גבוהה מדי בתוך המרינה.', 'Too fast inside the marina.'),
    explanation: t(
      `בתוך המרינה שטים לאט (כ-${MARINA_SPEED_KT} קשר): יש כלים שיוצאים מבין המזחים, אנשים על המזחים ושובל שמטלטל סירות קשורות.`,
      `Inside the marina keep to about ${MARINA_SPEED_KT} kt: boats pull out between the pontoons, people work on the docks and your wash rocks moored boats.`,
    ),
    suggestion: t('העבר את המצערת ל"איטי". מהירות נמוכה נותנת זמן לעצור.', 'Bring the throttle back to "slow". Low speed gives you time to stop.'),
  };
}

/** Error when too close to a vessel (or kind of vessel). */
export function closeRule(id: string, data: Record<string, string>, penalty: number, message: L, explanation: L, suggestion: L, maxCount = 1): Rule {
  return {
    id,
    type: 'forbidEvent',
    event: 'closeQuarters',
    eventData: data,
    category: 'unsafe',
    area: 'steering',
    penalty,
    maxCount,
    source: 'general',
    message,
    explanation,
    suggestion,
  };
}

/** Wrong answer to an identification question. */
export function wrongAnswerRule(): Rule {
  return {
    id: 'wrongAnswer',
    type: 'forbidEvent',
    event: 'answer',
    eventData: { correct: false },
    category: 'procedural',
    area: 'completion',
    penalty: 10,
    maxCount: 6,
    source: 'general',
    message: t('זיהוי שגוי.', 'Wrong identification.'),
    explanation: t('זיהוי נכון של כלי השייט ושל מצבו (לפי האורות והצורה) קובע מי מפנה דרך ומה עליך לעשות.', 'Correctly identifying the vessel and what it is doing (from its lights and shape) decides who gives way and what you must do.'),
    suggestion: t('קרא את ההסבר שמופיע אחרי התשובה וחזור על זיהוי האורות.', 'Read the explanation after the answer and revise the light combinations.'),
  };
}

/** Passed on the wrong side (e.g. starboard-to-starboard in a channel). */
export function cpaSideRule(id: string, vessel: string, side: 'port' | 'starboard', penalty: number, message: L, explanation: L, suggestion: L): Rule {
  return {
    id,
    type: 'forbidEvent',
    event: 'vesselCpa',
    eventData: { id: vessel, side },
    category: 'procedural',
    area: 'steering',
    penalty,
    source: 'general',
    message,
    explanation,
    suggestion,
  };
}

export function eventIs(type: SimEventType, data?: Record<string, string | number | boolean>) {
  return { event: type, data } as const;
}
