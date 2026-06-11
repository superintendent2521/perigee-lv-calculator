# lv_calc.html — Project Guide

Single-file orbital mission planning tool. Everything lives in `lv_calc.html` (~7100 lines): all CSS in `<style>`, all JS in one `<script>` block at end of body. No build system, no npm, no bundler.

## Hard invariants

- **Never modify `calculate()` or `evalAtPayload()`** — LV calculator core, do not touch
- **`showPage(id)`** only for page navigation
- **`openModal()` / `closeModal()`** for all modals
- **CSS custom properties only** — `var(--accent)`, `var(--text-bright)`, `var(--border)`, etc. No hex colors in CSS rules. Use `-webkit-text-fill-color` to override Chrome's autofill/transparent-input color behavior.
- **Stage stack convention**: `stages[0]` = bottom engine, `stages[last]` = top/payload nose

## Key globals

```js
PROG_ACTIVE_PROGRAM          // { vehicles: {}, ... }
PROG_BODIES                  // { Earth:{mu,R}, Moon:{mu,R}, Mars:{mu,R}, Venus, Mercury, Titan }
_missions[]                  // Mission Manager state
_missionSel                  // selected mission id
_scEdSC[]                    // spacecraft definitions
```

## Stage identity — critical dual-use

`stageDefinitionId` is overloaded:
- **LV stages**: human-readable name string (e.g. `"S-IC"`, `"S-II"`)
- **SC stages**: UUID from `progUUID()`

Use `_missionStageLabelById(stageDefId)` to resolve either to a display name. Don't assume it's always readable.

## Key math functions

| Function | What it does |
|---|---|
| `progVcirc(body, alt_km)` | Circular orbital velocity (km/s) |
| `progRocketEqDv(m_wet, prop_kg, isp)` | Tsiolkovsky ΔV (m/s) |
| `progRocketEqPropNeeded(m_wet, dv, isp)` | Propellant mass for a given ΔV |
| `progStageMass(liveStage)` | Total mass of a live stage (dry + prop) |
| `progStageRemainingProp(liveStage)` | Remaining propellant kg |
| `progStageTotalCapacity(liveStage)` | Max propellant capacity |
| `progBurnPropellant(liveStage, kg)` | Consume propellant in-place |
| `progMakeLiveStage(stageDefinitionId, tanks, crewAboard, dry_mass, isp)` | Create live stage object |
| `_missionDvToOrbit(body, alt_km)` | Required ΔV to orbit = v_circ + gravity/drag losses |

## Mission Manager

**Data model:**
```js
{
  missionId, name,
  fleetEntryId,       // which LV/fleet entry
  payloadScIds: [],   // spacecraft IDs (copied from fleet entry on selection)
  launchOrbit: { body, alt_km, inc_deg, lan_deg },
  log: [],            // event entries
  vehicleId: null,    // set after LAUNCH
}
```

**Log entry types:** `LAUNCH`, `BURN`, `EXPEND`

**LAUNCH log entry** includes `stagingResult`:
```js
stagingResult: {
  dvRequired, dvDelivered, status,  // 'SUCCESS' | 'MARGINAL'
  stages: [{ name, propTotal, propBurned, propRemaining, dvContrib, expended }]
}
```

**Ascent staging** (`missionExecLaunch`): iterates stages bottom→top, expends stages fully consumed, partially burns insertion stage, removes expended stages from `fv.stages`.

## File structure markers

Phase boundaries: `// ─── END PROGRAM MODULE Phase N ───` (dashes are U+2500 box-drawing chars)

New code goes **before** the Phase 8 END marker.

Init block at bottom:
```js
applyTheme('perigee');
scEdInit();
fleetInit();
missionInit();
```

## Editing approach

- Use the **Edit tool** for targeted replacements — safe, no encoding issues
- Python patch scripts work but: write to file only at the end (`f.write`), so any assertion failure before that leaves the file unchanged. Use `encoding='utf-8'` on both read and write. Avoid `\t`, `\n` in match strings — use raw triple-quoted strings.
- After any edit, grep for the anchor string to confirm placement

## Pages

| Page id | Tab |
|---|---|
| `page-lv` | Vehicles (LV calculator) |
| `page-orbits` | Orbits |
| `page-results` | Results |
| `page-program` | Program (SC editor / Fleet / Missions) |

Program tab sub-panels toggled by `progShowTab('spacecraft' | 'fleet' | 'mission')`.

## Current state & next steps

**Last completed:** Mission Manager Steps 1 & 2 — fleet/payload selection, BURN event UI, and ascent staging simulation in `missionExecLaunch`. The staging patch was just applied (2026-06-11); verify it works correctly before moving on:
- Launch a Saturn V mission and check the log card: S-IC and S-II should show EXPENDED, S-IVB should show INSERTION with partial prop remaining
- Confirm `stagingResult.status` is `'SUCCESS'` for a nominal LEO mission

**Step 3 (not started):** Orbit transfers — let the user plan and execute burns between the current orbit and a target (e.g. TLI after parking orbit, LOI). Needs a multi-burn sequence UI and cumulative ΔV tracking.

**Step 4 (not started):** Mission completion / scoring — mark mission as complete, tally payload delivered, ΔV margin, and any remaining propellant. Tie back to program-level goals/scoring if that feature exists.

## Related files

- `implementation_onboarding.md` — full architecture doc
- `dev_notes.md` — implementation decisions and gotchas  
- `conops_mockups.html` — visual reference for UI
- `program_math_reference.md` — math documentation
