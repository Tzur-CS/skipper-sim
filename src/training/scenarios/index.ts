import type { ScenarioCatalogEntry } from './types';
import { t } from './common';
import { buildRaiseMain } from './raiseMain';
import { buildOpenJib } from './openJib';
import { buildTack } from './tack';
import { buildGybe } from './gybe';
import { buildPointsOfSail } from './pointsOfSail';
import { buildLowerSails } from './lowerSails';
import type { Dir } from './common';
import { buildLeaveMarina } from './leaveMarina';
import { buildEnterMarina, type EnterVariant } from './enterMarina';
import { buildRightOfWay, type RowVariant } from './rightOfWay';
import { buildCoastTraffic } from './coastTraffic';
import { buildNightLights } from './nightLights';

const dirVariants = [
  { id: 'starboardToPort', label: t('ממפנה ימני לשמאלי', 'Starboard → port') },
  { id: 'portToStarboard', label: t('ממפנה שמאלי לימני', 'Port → starboard') },
];

const dayNight = [
  { id: 'day', label: t('יום', 'Day') },
  { id: 'night', label: t('לילה', 'Night') },
];
const rowVariants = [
  { id: 'giveWay', label: t('אתה מפנה דרך', 'You give way') },
  { id: 'standOn', label: t('אתה שומר דרך', 'You stand on') },
];

/** Catalogue of training scenarios (data-driven; see docs/SCENARIOS.md). */
export const SCENARIOS: ScenarioCatalogEntry[] = [
  { id: 'raiseMain', order: 1, title: t('הרמת ראשי', 'Raise the mainsail'), summary: t('חרטום אל הרוח, שחרור שוט והרמה', 'Head to wind, ease sheet, hoist'), build: () => buildRaiseMain() },
  { id: 'openJib', order: 2, title: t('פתיחת חלוץ', 'Open the jib'), summary: t('פתיחה, בחירת שוט עבודה וכוונון', 'Unfurl, choose working sheet, trim'), build: () => buildOpenJib() },
  { id: 'tack', order: 3, title: t('סיבוב', 'Tacking'), summary: t('מעבר החרטום דרך הרוח', 'Bow through the wind'), variants: dirVariants, build: (v) => buildTack((v as Dir) ?? 'starboardToPort') },
  { id: 'gybe', order: 4, title: t('מהפך מבוקר', 'Controlled gybe'), summary: t('מעבר הירכתיים דרך הרוח', 'Stern through the wind'), variants: dirVariants, build: (v) => buildGybe((v as Dir) ?? 'starboardToPort') },
  { id: 'pointsOfSail', order: 5, title: t('כיווני הפלגה', 'Points of sail'), summary: t('קדמית, צד, גבית חלקית ומלאה', 'Close-hauled to running'), build: () => buildPointsOfSail() },
  { id: 'lowerSails', order: 6, title: t('גלילה והורדה', 'Furl & lower'), summary: t('גלילת חלוץ והורדת ראשי', 'Furl the jib, lower the main'), build: () => buildLowerSails() },
  { id: 'leaveMarina', order: 7, title: t('יציאה מהמרינה', 'Leaving the marina'), summary: t('מרינת גורדון: מנוע, צד ימין, ילדים באופטימיסט', 'Gordon marina: engine, keep right, kids in Optimists'), build: () => buildLeaveMarina() },
  { id: 'enterMarina', order: 8, title: t('כניסה למרינה', 'Entering the marina'), summary: t('האטה, פתח, נתיב ועצירה ליד המזח', 'Slow down, entrance, fairway, stop at the berth'), variants: dayNight, build: (v) => buildEnterMarina((v as EnterVariant) ?? 'day') },
  { id: 'rightOfWay', order: 9, title: t('חוקי דרך במפרש', 'Right of way under sail'), summary: t('מפנה ימני מול שמאלי: מפנה ושומר דרך', 'Starboard vs port tack: give way or stand on'), variants: rowVariants, build: (v) => buildRightOfWay((v as RowVariant) ?? 'giveWay') },
  { id: 'coastTraffic', order: 10, title: t('תנועה ליד החוף', 'Coastal traffic'), summary: t('גלשנים, קייט, דייג, משטרה וסירות ילדים', 'Windsurfers, kites, fishing, police, dinghies'), build: () => buildCoastTraffic() },
  { id: 'nightLights', order: 11, title: t('ניווט לילי', 'Night navigation'), summary: t('זיהוי אורות ניווט ופעולה נכונה', 'Identify navigation lights and act'), build: () => buildNightLights() },
];

export function getScenario(id: string, variant?: string) {
  const entry = SCENARIOS.find((s) => s.id === id);
  if (!entry) throw new Error(`Unknown scenario ${id}`);
  return entry.build(variant ?? entry.variants?.[0].id);
}
