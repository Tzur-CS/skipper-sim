# Content requiring review by a qualified sailing instructor

**Nothing in this MVP has been validated by a qualified Israeli sailing instructor, and none of it
is an official licensing requirement.** It was written from generally accepted keelboat sailing
practice. Every scenario carries `review.status = 'needsInstructorReview'`. Each step and rule is
tagged `general` (broadly accepted principle), `school` (common practice that varies between
schools) or `vessel` (depends on the boat's equipment).

## Terminology (`src/i18n/translations.ts`)
- All terms provided in the brief are used as given. Added by the developer and needing review:
  "קדמית-צד" (close reach), "מרכז ראשי" (centre main), "חבל גלילה", "מעלן ראשי", "נתקע ברוח" (in irons),
  "מפרש הפוך" (jib aback), crew acknowledgement "מוכן!".
- Point-of-sail angle bands (no-go < 40°, close-hauled 40–60°, close reach 60–80°, beam 80–105°,
  broad 105–155°, running > 155°) are an educational convention.

## Procedures
| Scenario | Item | Tag |
|---|---|---|
| Raise main | Head to wind, ease mainsheet, hoist, bear away and trim | general |
| Raise main | Headway assist stands in for motoring; engine use is not taught | vessel |
| Open jib | Unfurl, trim the leeward sheet, leave windward slack | general / vessel (furler) |
| Tack | "היכון לסיבוב" → wait for "מוכן" → "סיבוב" → turn; crew releases old sheet as the bow nears the wind and trims the new one | school (wording/order) |
| Tack | Penalties for not preparing crew (20) and not calling the tack (10) | school |
| Gybe | "היכון למהפך" → centre main → bear away → boom crosses → ease, move jib → counter-steer | general (order) / school (wording) |
| Points of sail | Trim in when heading up, ease when bearing away | general |
| Lower sails | Ease jib sheet, furl, head to wind, ease main, lower | general |
| Lower sails | Furl jib before lowering main (5-point "preference" penalty) | school |
| Lower sails | Ease mainsheet before lowering (optional step) | school |
| All | Penalty values and time limits | developer estimate |

Not modelled and therefore not taught: preventer, traveller, vang, reefing, topping lift / lazy jacks,
winch handling, crew positions, right-of-way, MOB, docking, engine.
