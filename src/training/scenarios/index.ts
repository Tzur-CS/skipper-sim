import type { ScenarioCatalogEntry } from './types';
import { t } from './common';
import { buildRaiseMain } from './raiseMain';
import { buildOpenJib } from './openJib';
import { buildTack } from './tack';
import { buildGybe } from './gybe';
import { buildPointsOfSail } from './pointsOfSail';
import { buildLowerSails } from './lowerSails';
import type { Dir } from './common';

const dirVariants = [
  { id: 'starboardToPort', label: t('ממפנה ימני לשמאלי', 'Starboard → port') },
  { id: 'portToStarboard', label: t('ממפנה שמאלי לימני', 'Port → starboard') },
];

/** Catalogue of the six MVP training scenarios (data-driven; see docs/SCENARIOS.md). */
export const SCENARIOS: ScenarioCatalogEntry[] = [
  { id: 'raiseMain', order: 1, title: t('הרמת ראשי', 'Raise the mainsail'), summary: t('חרטום אל הרוח, שחרור שוט והרמה', 'Head to wind, ease sheet, hoist'), build: () => buildRaiseMain() },
  { id: 'openJib', order: 2, title: t('פתיחת חלוץ', 'Open the jib'), summary: t('פתיחה, בחירת שוט עבודה וכוונון', 'Unfurl, choose working sheet, trim'), build: () => buildOpenJib() },
  { id: 'tack', order: 3, title: t('סיבוב', 'Tacking'), summary: t('מעבר החרטום דרך הרוח', 'Bow through the wind'), variants: dirVariants, build: (v) => buildTack((v as Dir) ?? 'starboardToPort') },
  { id: 'gybe', order: 4, title: t('מהפך מבוקר', 'Controlled gybe'), summary: t('מעבר הירכתיים דרך הרוח', 'Stern through the wind'), variants: dirVariants, build: (v) => buildGybe((v as Dir) ?? 'starboardToPort') },
  { id: 'pointsOfSail', order: 5, title: t('כיווני הפלגה', 'Points of sail'), summary: t('קדמית, צד, גבית חלקית ומלאה', 'Close-hauled to running'), build: () => buildPointsOfSail() },
  { id: 'lowerSails', order: 6, title: t('גלילה והורדה', 'Furl & lower'), summary: t('גלילת חלוץ והורדת ראשי', 'Furl the jib, lower the main'), build: () => buildLowerSails() },
];

export function getScenario(id: string, variant?: string) {
  const entry = SCENARIOS.find((s) => s.id === id);
  if (!entry) throw new Error(`Unknown scenario ${id}`);
  return entry.build(variant ?? entry.variants?.[0].id);
}
