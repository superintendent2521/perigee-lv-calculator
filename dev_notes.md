# Rocket Playground — Program Module: Development Notes

**For future Claude instances picking up this work.**
Read `implementation_onboarding.md` and `program_architecture.md` first. This document
records decisions made, bugs fixed, and gotchas discovered during implementation.

---

## Current State (as of Phase 4)

### What is built and tested

| Phase | What | Tests |
|-------|------|-------|
| 1 | ΔV engine: OrbitalState, Hohmann, plane change, TLI/LOI/TEI, TMI/MOI, TVI/VOI, lunar/Mars ascent, boiloff formula | 11 |
| 2 | Propellant system: Tank struct, progApplyBoiloff, LiveStage, burnLog, BurnPropellant | 9 |
| 3 | FlightVehicle, rocket equation, Program container, event executors: LAUNCH, BURN, SEPARATE, COAST, EXPEND | 11 |
| 4 | Interaction events: DOCK, TRANSFER_PROPELLANT, TRANSFER_CREW, TRANSFER_STAGE, LAND, ASCENT_SURFACE, RECONFIGURE | 13 |
| 5 | Pad struct, LAN window calculator, azimuth-inclination formula, spaceport panel UI | 9 |

All tests run as IIFEs at load time and render in the Program tab.

### Working file

`/mnt/user-data/outputs/lv_calc.html` — always edit this one.
The project copies in `/mnt/project/` are read-only.

---

## Architectural Decisions and Spec Deviations

### OrbitalState fields (FIXED after Phase 3)

My `progMakeOrbitalState` now returns the spec-correct fields:
```javascript
{ body, apogee, perigee, inclination, lan, epoch, surface }
```
**Never use** `alt_km`, `inc_deg`, `lan_deg` as OrbitState field names — those were
the wrong names used in early Phase 1 drafts. They're gone.

For circular orbits `apogee === perigee === alt_km`. The function signature still
accepts `alt_km` as the third parameter and stores it in both `apogee` and `perigee`.

`surface` is automatically `true` when `alt_km === 0`.
`progMakeSurfaceState(body)` is a convenience wrapper.

### `progDvCircularizeAtApo` takes ALTITUDES (FIXED after Phase 3)

Both parameters are altitude above body surface (km), same convention as every other
`progDv*` function. Earlier it incorrectly took geocentric radii. Tests updated.

### Stage stack convention

`stages[]` is ordered **bottom → top**, meaning `stages[0]` is the engine/bottom and
`stages[stages.length - 1]` is the nose/top. This matches the LV Calculator convention.

### `progMakeLiveStage` extended in Phase 3

Signature: `progMakeLiveStage(stageDefinitionId, tanks, crewAboard, dry_mass, isp)`
`dry_mass` and `isp` are optional 4th/5th params, defaulting to 0.
Phase 2 calls that only pass 3 args still work fine.

### `progBoiloff` vs `progApplyBoiloff` — naming inconsistency

- `progBoiloff(fill, rate, days, insulation)` → returns **remaining** propellant (not the loss)
- `progApplyBoiloff(tank, days)` → mutates `tank.fill`, returns **kg lost**

This is an unfortunate naming inconsistency. Both functions work correctly and are
tested. Don't change the API at this point; just be aware of it.

### DOCK merges two FlightVehicles permanently

After `progExecDock`, the two source vehicles are deleted from `program.vehicles` and
a NEW merged vehicle is created with a new UUID. Subsequent TRANSFER and SEPARATE
events reference this merged vehicle's ID.

Stack order: `bottomVehicleId`'s stages go at `[0..N-1]`, the other vehicle's stages
at `[N..]`. If `event.bottomVehicleId` is not set, `vehicleIds[0]` is treated as bottom.

### LAND is zero ΔV and zero propellant (Rule 5)

The spec is explicit: "BURN events consume ΔV and propellant. All other events
(SEPARATE, DOCK, TRANSFER_CREW, TRANSFER_PROPELLANT, **LAND**) consume neither."

Powered descent propellant is consumed by preceding explicit BURN events (PARTIAL
burns with propStopThreshold). The LAND event just sets `status = 'LANDED'` and
`orbitState = surface`. Aerocapture flag is informational only.

### ASCENT_SURFACE DOES consume propellant

ASCENT_SURFACE is NOT in Rule 5's exclusion list. It computes ΔV from body model
(`progDvLunarAscent`, `progDvMarsAscent`) and drains propellant via rocket equation
from the firing stage (defaults to bottom stage). Returns MARGINAL if insufficient prop.

### RECONFIGURE is the ONLY event that reorders the stage stack

All other events either preserve order, add stages at defined positions, or remove
stages. If you need stages in a different order for any reason, RECONFIGURE is the
path. It applies a small RCS ΔV (~10 m/s, configurable via `event.rcs_dv_ms`).

### TRANSFER events operate on stages within a (possibly merged) vehicle

After DOCK, stages from both original vehicles exist in one merged vehicle's
`stages[]` array. TRANSFER_PROPELLANT and TRANSFER_CREW identify stages by
`stageDefinitionId` within that merged vehicle (`event.vehicleId`).

TRANSFER_STAGE operates between two separate (but same-orbit) vehicles — it removes
a stage from `sourceVehicleId`'s stack and adds it to `destVehicleId`'s stack.

### EML-1 / EML-2 node altitudes are approximate

`alt_km: 326400` (EML-1) and `alt_km: 444000` (EML-2) are geocentric distances,
not true altitudes from Earth's surface (those would be ~320,000 km and ~438,000 km).
EML points don't have meaningful circular orbit altitudes anyway; these values are
placeholders for node display. Don't compute `progVcirc('Earth', 326400)` expecting
a meaningful answer.

---

## Test Infrastructure

Tests are const IIFEs defined at module scope. Declaration order matters:

```
PROG_TEST_RESULTS (P1 IIFE runs immediately)
_progRenderSection (function — defined but not called yet)
progRenderTestResults (function — defined but not called yet)
PROG_P2_TEST_RESULTS (P2 IIFE runs immediately)
PROG_P3_TEST_RESULTS (P3 IIFE runs immediately)
PROG_P4_TEST_RESULTS (P4 IIFE runs immediately)
...
INIT block → calls progRenderTestResults()
```

`progRenderTestResults` references P2/P3/P4 test consts that are defined after it.
This is safe because the function is only CALLED in INIT, by which time all IIFEs
have already run.

Each phase renders as a section in `#prog-phase1-results` (the element kept its name
from Phase 1; don't rename it). The div has `white-space: pre` set by the render
function.

To add tests for a new phase:
1. Add `PROG_PX_TEST_RESULTS` const IIFE after the phase's function definitions
2. Add `const pX = _progRenderSection(PROG_PX_TEST_RESULTS, '// Phase X ...');` in
   `progRenderTestResults`
3. Add `...PROG_PX_TEST_RESULTS` to the `allTests` spread in `progRenderTestResults`

---

## Key Function Reference (Program Module)

### Phase 1
```
progMakeOrbitalState(body, alt_km, inc_deg, lan_deg) → OrbitalState
progMakeSurfaceState(body) → OrbitalState with surface:true
progOrbitalStateMatch(a, b) → boolean
progVcirc(body, alt_km) → km/s
progDvHohmann(body, alt1, alt2) → {dv1_ms, dv2_ms, total_ms}
progDvPlaneChange(body, alt, delta_inc_deg) → m/s
progDvCombined(body, alt, delta_inc_deg, dv_prop_ms) → m/s
progDvCircularizeAtApo(body, alt_peri_km, alt_apo_km) → m/s  [altitudes, not radii]
progDvTLI(leo_alt_km) → m/s
progDvLOI(llo_alt_km, leo_alt_km) → m/s
progDvTEI(llo_alt_km, leo_alt_km) → m/s
progDvTMI(leo_alt_km) → m/s
progDvMOI(mco_alt_km) → m/s
progDvTVI(leo_alt_km) → m/s
progDvVOI(vco_alt_km) → m/s
progDvLunarAscent(llo_alt_km) → m/s
progDvMarsAscent(mco_alt_km) → m/s
progBoiloff(fill_kg, rate_per_day, days, insulation) → kg REMAINING
progGetNode(id) → node object or null
```

### Phase 2
```
progMakeTank(propellantType, capacity_kg, insulationFactor?) → Tank
progApplyBoiloff(tank, delta_t_days) → kg LOST (mutates tank.fill)
progApplyStageBoiloff(liveStage, delta_t_days) → total kg LOST
progMakeLiveStage(defId, tanks, crew?, dry_mass?, isp?) → LiveStage
progRecordBurn(stage, eventId, dv, propKg, t0, t1)
progBurnPropellant(stage, kg) → kg actually drained
progStageRemainingProp(stage) → kg
progStageTotalCapacity(stage) → kg
progStageFillFraction(stage) → 0–1
```

### Phase 3
```
progUUID() → string
progMakeFlightVehicle(name, stages, orbitState?, color?) → FlightVehicle
progStageMass(liveStage) → kg (dry + prop)
progVehicleTotalMass(fv) → kg
PROG_G0 = 9.80665 m/s²
progRocketEqDv(m_wet, m_prop_consumed, isp) → m/s
progRocketEqPropNeeded(m_wet, dv_ms, isp) → kg
progMakeEvent(type, fields) → Event
progMakeProgram(name?) → Program
progDispatchEvent(program, event) → result object
progExecLaunch / progExecBurn / progExecSeparate / progExecCoast / progExecExpend
```

### Phase 4
```
progExecDock / progExecTransferPropellant / progExecTransferCrew
progExecTransferStage / progExecLand / progExecAscentSurface / progExecReconfigure
```

---

## Common Gotchas

**`progExecSeparate` separationIndex semantics:**
Index N means "cut BEFORE stage at index N". Lower gets `stages[0..N-1]`, upper gets
`stages[N..]`. To split a 3-stage vehicle after stage 0: `separationIndex: 1`.

**`progExecBurn` with isp=0:**
If a stage has `isp: 0` (default), both ΔV functions return 0. Silent — no propellant
is drained, the event result is SUCCESS with deltaV=0. Always set `isp` when creating
live stages for anything involving burns.

**Color cycling is stateful:**
`_progColorIdx` is a module-level counter. Each call to `progMakeFlightVehicle` with
`color: null` increments it. Test IIFEs create many FVs and advance the counter.
Don't rely on specific color assignments in tests.

**`progExecCoast` with no vehicleId:**
If `event.vehicleId` is null or `'ALL'`, boiloff is applied to ALL non-EXPENDED
vehicles in the program. Set `vehicleId` explicitly if you only want to coast one.

**DOCK precondition is enforced:**
`progExecDock` checks `progOrbitalStateMatch` and returns `result: 'FAILED'` if
orbits don't match. This is one of the few hard failures (as opposed to MARGINAL).
The user must BURN to match orbits first.

**RECONFIGURE replaces `stages[]` in-place:**
The function validates that `event.newStageOrder` contains exactly the same
`stageDefinitionId` values (no additions or removals), just reordered.
It does NOT allow adding or removing stages — use SEPARATE/DOCK for that.

---

## What Phases 5–10 Need to Build

**Phase 5 (Pad & spaceport):** Pad struct, LAN alignment window calculator, spaceport panel UI.

**Phase 6 (Pork chop plotter):** Lambert solver (universal variable method), C3 grids,
canvas click-to-select. Read `program_architecture.md §7.2` carefully.

**Phase 7 (Band View):** Four-panel layout, body-band rendering, log-zoom time axis,
vehicle tracks, event nodes, right-click context menu. Read SKILL.md before any UI.

**Phase 8 (Node Map):** Subway-style graph, three-zone layout, bidirectional sync with Band View.

**Phase 9 (Spacecraft editor):** SpacecraftDefinition builder, 4 new stage fields.

**Phase 10 (Program file):** JSON save/load (format v3), closure summary bar.

---

## Invariants — Never Break

1. `calculate()` and `evalAtPayload()` — do not touch.
2. `showPage()` — only way to switch pages. Never set `.page` display directly.
3. `openModal()` / `closeModal()` — always use these.
4. `#rp-root` — wraps all visible content.
5. CSS custom properties only (`var(--accent)`, etc.) — no hardcoded hex in new CSS.
6. LV Calculator pages (Vehicles, Orbits, Results) must remain fully functional.

### Phase 5
```
PROG_SIDEREAL_DAY_S = 86164.1 s
progMakePad(name, shortCode, siteKey, recycleTimeHours) → Pad
  shortCode: compact identifier for Band View (spec §3.2)
progPadAvailable(pad, t_plus_s) → boolean
progPadRecycleRemaining(pad, t_plus_s) → seconds (0 if ready)
progLanWindow(site_lng_deg, target_lan_deg, gast_deg?) → {asc_wait_s, desc_wait_s}
progAzimuthForInclination(site_lat_deg, inc_deg) → {prograde, retrograde} | null
progDvPlaneChangeFull(body, alt_km, i1_deg, lan1_deg, i2_deg, lan2_deg) → m/s
  Full plane change including LAN component (spec §7.6).
  Uses spherical law of cosines: cos(θ) = cos(i1)cos(i2) + sin(i1)sin(i2)cos(ΔLAN)
  ΔLAN=0 → identical to progDvPlaneChange.
PROG_ACTIVE_PROGRAM (global let — set by progSetActiveProgram(p))
progSetActiveProgram(p) — sets active program and re-renders spaceport
progRenderSpaceport() — renders pad list into #prog-pad-list
```

**LAN window formula:**
`current_raan = (gast_deg + site_lng_deg) % 360`
`asc_wait_s = ((target_lan - current_raan + 360) % 360) * (86164.1 / 360)`
`desc_wait_s = asc_wait_s + 86164.1/2` (mod sidereal day)

**Pad `lastLaunchTime`:** `null` = never launched = always available. Set to T+ seconds when a LAUNCH event completes. The INIT block sets up a default demo program (`PROG_ACTIVE_PROGRAM`) with 4 pads so the spaceport column shows something on first open.

**Program page layout:** Updated in Phase 5 to a flex column with a top bar + body row. Body has 160px spaceport column (left) and scrollable content area (right). Phase 7 replaces the content area with Band View.

---

## Spec Compliance Audit (Post-Phase 5 Review)

**Fixed during review:**
- `PROG_BUILTIN_NODES`: renamed `id`→`nodeId`, `alt_km`→`apogee`/`perigee`; added `surface`, `isCustom`, `inclination`; GTO now correctly has `perigee:185`; EML altitudes corrected from geocentric radii to surface altitudes; NRHO now has correct elliptical `apogee:68263, perigee:1500`.
- `progGetNode`: searches by `.nodeId` (was `.id`).
- `progExecBurn`: orbit update now uses `node.apogee`/`node.perigee`; handles elliptical destination orbits (GTO etc.); handles surface destination nodes.
- `progMakePad`: added `shortCode` field (spec §3.2).
- `progMakeProgram`: added `vehicleDefinitions`, `spacecraftDefinitions`, `nodeMapCustomNodes`, `performanceCases` (spec §3.1).
- `progDvPlaneChangeFull`: added for full LAN-inclusive plane change (spec §7.6, Phase 1 item 3).

**Known gaps (to fix in future phases):**
- Phase 1 item 2: "Extend ΔV functions to return OrbitalState" — ΔV functions return scalars only. The event engine uses `toNode` to determine resulting orbit. This is workable but not spec-exact. Phase 7 may need result OrbitalStates for Band View rendering.
- Phase 3 item: "BURN event — mid-burn stage separation when tank empties" — StagingTrigger system (EMPTY, THRESHOLD, AT_DV) not implemented. BURN executor currently doesn't auto-separate when tank empties. Phase 7 work.
- ASCENT_SURFACE for Venus, Mercury — no body model; requires `event.dv_override_ms`.

---

*Last updated: Phase 5 complete + spec compliance audit. 54 tests passing.*
