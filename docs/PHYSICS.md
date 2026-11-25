# Physics model

The simulation lives in `src/simulation/` and has no dependency on React or Three.js.
`SimEngine` (`physics/engine.ts`) steps at a fixed **1/60 s** timestep through an accumulator,
so results are deterministic for the same inputs (covered by tests). All tunable numbers live
in `src/simulation/config.ts`.

## Frames and conventions
- Heading: degrees clockwise from north. True wind direction: where the wind blows **from**.
- Boat frame: +x starboard, +y forward. Angles relative to the bow are positive to starboard.
- TWA = wind-from minus heading, normalised to (-180, 180]. Positive TWA = starboard tack.
- Sail/boom angles: measured from the aft centreline, positive = sail to starboard.

## Wind
Apparent wind = true wind "from" vector + boat velocity (`wind/wind.ts`). The engine recomputes
AWA/AWS each step, so speeding up moves the apparent wind forward and strengthens it upwind.

## Sail angle (rig constraints)
- **Mainsheet** maps to a maximum boom angle: sheet 1 → 3°, sheet 0 → 86°.
- A free sail weathervanes (chord along the flow, angle = −AWA). The boom sits at that angle
  clamped by the sheet. Downwind, the boom stays on its side until the boat is more than 12°
  "by the lee", then the wind throws it across (`sails/rig.ts`).
- The boom is a damped spring toward that target; stiffness scales with wind pressure, so an
  eased main slams across in a gybe (uncontrolled gybe = boom crosses at >70°/s while downwind).
- **Jib**: each sheet limits how far the clew can go out on its side; a sheet above 0.32 also keeps
  the clew on its own side. If the old sheet is not released after a tack, the jib stays **aback**.

## Aerodynamics (`sails/aero.ts`)
Each sail uses lift/drag coefficients interpolated from an editable table vs. incidence (angle of
the chord to the apparent wind). Lift is perpendicular to the flow toward the side the sail is
pushed; drag is along the flow. Below ~12–20° incidence the sail **luffs**: lift collapses and a
flogging drag remains. Over-trimmed sails stall (high drag, more heel, less drive). A backed jib
produces backward force and a yaw moment pushing the bow away from the wind. The jib is
partially blanketed when running with both sails on the same side.

## Hull and motion
- Longitudinal: `m·dv/dt = drive − R(v)`, with `R = k·v² (1 + 2.2 (v/v_hull)^6) + c·v`
  (quadratic + steep wave-making + linear term so the boat glides to a stop). Momentum is real:
  with sails down the boat coasts for tens of seconds.
- Heel: heeling moment (side force × centre-of-effort height) against a righting moment
  `RM·sin(heel)`, with a first-order lag.
- Yaw: rudder yaw rate = `v·tan(rudder)/L`, so steering depends on boat speed (no speed, no
  steering; reversed when drifting astern). Sail side forces produce weather/lee helm via lever arms.
  When nearly stopped, the hull weathercocks slowly (falls off the wind).
- Rudder moves at 45°/s toward the helm input.

## Calibrated behaviour (12 kt true wind, optimal trim)
| TWA | 15° | 22° | 30° | 40° | 60° | 90° | 120° | 150° | 175° |
|---|---|---|---|---|---|---|---|---|---|
| speed (kt) | −1.1 | 0 | 2.5 | 4.9 | 6.2 | 6.6 | 6.0 | 4.8 | 4.0 |

`npx tsx scripts/polar.ts` prints this table after you change coefficients.

## Events
The engine emits timestamped events with a state snapshot: crew command, rudder changed, sheet
eased/trimmed, sail hoisted/lowered (start & complete), jib unfurled/furled, crossed wind, tack
changed, boom/jib changed side, entered/exited no-go, uncontrolled gybe, in irons, point-of-sail
changed, stabilised, reset.

## Crew model (`controls/crew.ts`)
Commands create crew tasks that work lines at winch/halyard rates. "Trim" commands trim to the
optimal incidence ("to the telltales") and keep tending for ~8 s. "Tack"/"Gybe" run multi-phase
tasks (release old sheet as the bow nears the wind / stern crosses, trim the new one; centre the
main before the boom crosses, then ease). If the crew was not prepared ("ready about") they react
2.2 s late. Hoisting a loaded main or furling a loaded jib is 3–4× slower.

## Known simplifications
No leeway, no waves acting on the hull, no current, no traveller/vang/outhaul/backstay, no reefing,
headway assist instead of an engine in raise/lower drills, single generic yacht.
