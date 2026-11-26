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
winch handling, crew positions, MOB, docking lines, prop walk.

## Harbour, traffic and night scenarios (added 2026-11)
**The Gordon (Tel Aviv) marina is schematic.** Its layout, the entrance opening to the north-west,
the pontoon numbering, the berth, the 3 kn speed limit and the entrance light characteristics
(Fl G / Fl R 5 s) were not taken from a chart and must be checked against the current chart and
marina regulations.

| Scenario | Item | Source |
|---|---|---|
| Leave / enter marina | Keep to starboard in the fairway and entrance (Rule 9); meet oncoming boats port-to-port | COLREGs |
| Leave / enter marina | Under engine = power-driven: keep clear of sailing dinghies and boards (Rule 18) | COLREGs |
| Enter marina | IALA region A: entering, green to starboard, red to port | IALA |
| Enter marina | Stop with a burst astern, then neutral | general |
| Right of way | Port tack gives way to starboard tack (Rule 12); give-way acts early (16) and passes astern (15); stand-on holds course (17) | COLREGs |
| Coastal traffic | Sail gives way to a vessel engaged in fishing (18); day shape two cones (26); keep away from trawl astern | COLREGs |
| Coastal traffic | Distances: windsurfer 25 m, kite 40 m, Optimists 20 m, trawler 90 m | developer estimate |
| Coastal traffic | Bathing area off Gordon beach (yellow buoys) – position invented | developer estimate |
| Police | Flashing blue = law enforcement; slow down, VHF 16, follow instructions | needs check (Israeli law) |
| Night | Sailing: sidelights + sternlight (25); power: masthead + sidelights + stern (23); trawling green over white, other fishing red over white (26) | COLREGs |
| Night | Stand-on vessel that acts turns to starboard, never to port for a vessel on its port side (17(c)) | COLREGs |
| All | Kitesurfers' legal status under COLREGs is debated; the drill treats them as craft to keep well clear of | needs check |

The engine is a simple thrust model with propeller wash over the rudder; prop walk, windage under
engine and current are not modelled. Other vessels move on scripted paths; some re-aim once at
the start so a real risk of collision exists if the student does nothing.
