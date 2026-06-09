# Adding Stages and Vehicle Presets to lv_calc.html

This document is the authoritative guide for adding new stages to the Stage Library and new vehicle presets to the Vehicles dropdown in `lv_calc.html`. Read the whole thing before editing — the two data structures are separate and serve different purposes.

---

## Overview

There are two independent data stores:

| Store | What it is | Where |
|---|---|---|
| `STAGE_LIBRARY` | Named stage records users can select in the stage editor | Search for `const STAGE_LIBRARY={` |
| `BUILTIN_PRESETS` | Complete vehicle configurations shown in the Vehicles panel | Search for `const BUILTIN_PRESETS=[` |

A preset can reference stages by name from `STAGE_LIBRARY` **or** embed its own stage data inline. A stage in `STAGE_LIBRARY` does not automatically become a preset, and a preset does not need to have its stages in the library.

---

## 1. Adding a Stage to the Stage Library

### Location

`STAGE_LIBRARY` is a plain object whose keys are category names (strings like `'Booster Stages'`, `'Upper Stages'`). Each value is an array of stage objects.

```javascript
const STAGE_LIBRARY = {
  'Booster Stages': [ ...stage objects... ],
  'Upper Stages':   [ ...stage objects... ],
  // ...
};
```

### Stage object fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | **Yes** | Unique display name. This is the lookup key used by `stageNames` in presets. |
| `dry` | number | **Yes** | Dry mass in **kg** (structure, engines, everything except propellant). |
| `prop` | number | **Yes** | Propellant mass in **kg** (fully loaded). |
| `thrust` | number | **Yes** | Sea-level (or vacuum for upper stages) thrust in **kN**. |
| `isp` | number | **Yes** | Effective Isp in **seconds**. Use vacuum Isp for upper stages; sea-level for first stages. |
| `res` | number | No | Reserve propellant percentage (default `2`). Propellant actually consumed = `prop × (1 − res/100)`. |
| `engines` | string | No | Human-readable engine description, shown in the UI. |
| `note` | string | No | One-line historical/technical note. |
| `tags` | string[] | No | Filter tags (see tag reference below). |

### Example

```javascript
{ name:'Agena D',
  dry:670, prop:5100, thrust:71, isp:291,
  engines:'Bell 8096 (Model 8096)', res:2,
  note:'Workhorse upper stage. IRFNA/UDMH. Used on Atlas, Thor, Titan.',
  tags:['Nitrogen Tetroxide / UDMH','Upper Stage','1960s','1970s','American'] }
```

### Stage Library tag reference

Tags control the filter chips in the Stage Library browser. Use existing tags where possible — new tags will appear automatically as new chips.

**Propellant tags** (first tag by convention):
- `'Liquid Oxygen / Kerosene'`
- `'Liquid Oxygen / Liquid Hydrogen'`
- `'Liquid Oxygen / Methane'`
- `'Liquid Oxygen / Ethanol'`
- `'Nitrogen Tetroxide / Aerozine-50'`
- `'Nitrogen Tetroxide / UDMH'`
- `'Nitrogen Tetroxide / Aniline'`
- `'Solid Propellant'`

**Role tags:**
- `'First Stage'`, `'Upper Stage'`, `'Kick Stage'`

**Era tags:** `'1940s'`, `'1950s'`, `'1960s'`, `'1970s'`, `'1980s'`, `'1990s-2000s'`, `'2000s'`, `'2010s+'`

**Origin tags:** `'American'`, `'Soviet / Russian'`, `'European'`, `'Chinese'`, `'Indian'`

---

## 2. Adding a Vehicle Preset

### Location

`BUILTIN_PRESETS` is an array of preset objects. They render under category section comments that look like `// ── Section name ──`. Insert new entries in the appropriate chronological/thematic spot.

### Preset object — all fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | **Yes** | Display name for the vehicle. |
| `stageNames` | string[] | One of these | Array of stage names to look up in `STAGE_LIBRARY`. Index 0 = bottom stage, last index = top stage / nose. |
| `stageData` | object[] | One of these | Inline stage data array (same fields as a library entry). Use when stages don't exist in the library, or when s15 fields are needed. |
| `payload` | number | **Yes** | Payload mass in **kg**. |
| `fairingMass` | number | **Yes** | Fairing/payload shroud mass in **kg**. `0` if no fairing. |
| `fairingJettison` | number | **Yes** | Stage index (1-based) at which the fairing is jettisoned. `0` = never. `2` = jettisoned at end of stage 2. |
| `boosterName` | string\|null | **Yes** | Library stage name for strap-on boosters, or `null`. |
| `boosterCount` | number | **Yes** | Number of strap-on boosters, or `0`. |
| `boosterData` | object | No | Inline booster stage data (use when booster isn't in the library). Requires a `count` field inside it. |
| `site` | object | **Yes** | Launch site: `{ lat, azMin, azMax }` in degrees. |
| `mode` | string | **Yes** | Destination type: `'orbit'` or `'escape'`. |
| `orbit` | object | If `mode='orbit'` | `{ perigee, apogee, inc }` all in km or degrees. |
| `escape` | object | If `mode='escape'` | `{ c3, decl, perigee }` — C3 in km²/s², departure declination in degrees, parking perigee in km. |
| `parkingAlt` | number | No | Parking orbit altitude in km (overrides default). |
| `tags` | string[] | No | Vehicle-level filter tags (see below). |
| `note` | string | No | Multi-sentence historical/technical description shown in the results panel. |

### Vehicle preset tag reference

| Tag | Meaning |
|---|---|
| `'Historical'` | No longer operational |
| `'Active'` | Currently operational |
| `'Reusable'` | Has a recoverable first stage |
| `'Crewed'` | Human-rated / crewed missions |
| `'Deep Space'` | Designed for lunar, planetary, or escape trajectories |
| `'Stage-and-a-Half'` | Uses the Atlas-style s15 mechanism (see §3) |
| `'Unbuilt'` | Proposed or paper vehicle |
| `'Exotic'` | Unusual propellants, staging, or configuration |

---

## 3. Stage-and-a-Half (s15) Vehicles

Atlas-style vehicles use a single propellant tank with two engine groups: a booster pack that is jettisoned mid-ascent and a sustainer engine that continues to SECO. The calculator handles this through a "virtual stage" expansion at calculation time — the stage is split into Phase 1 (all engines) and Phase 2 (sustainer only) without modifying the protected `calculate()` function.

### When to use s15

Enable s15 on a stage when:
- The vehicle has a **single propellant tank** shared by booster and sustainer engines.
- The booster engine package is **jettisoned at a defined point** (BECO), leaving a lighter sustainer stage.

Do **not** use s15 for:
- Normal multi-stage rockets (use multiple stages).
- Strap-on solid boosters (use `boosterName`/`boosterCount` instead).

### s15 fields on a stage data object

These go inside a stage entry in `stageData` (not in `stageNames`-based presets, which pull data from the library and can't carry extra fields that way).

| Field | Type | Description |
|---|---|---|
| `s15` | `true` | Enables stage-and-a-half mode for this stage. |
| `s15_sust_thrust` | number | Sustainer-only thrust in **kN** after BECO. |
| `s15_sust_isp` | number | Sustainer Isp in **seconds** (typically vacuum Isp, since BECO is at altitude). |
| `s15_jet_mass` | number | Mass of the jettisoned booster pack in **kg** (engines + skirt structure). |
| `s15_beco_twr` | number | Thrust-to-weight ratio of the sustainer at the moment of jettison. Controls **when** BECO occurs (how much propellant has been consumed). |

### How `s15_beco_twr` works

At BECO, the remaining stage mass (sustainer structure + remaining propellant) must equal:

```
m_after_jettison = s15_sust_thrust × 1000 / (s15_beco_twr × 9.80665)
```

The propellant burned in Phase 1 is then: `(dry + prop) − (m_after + s15_jet_mass)`.

**Typical values:**
- `1.2` — BECO while sustainer still has solid ground-level TWR > 1 (most conventional staging)
- `0.5` — Atlas-style, BECO at altitude where velocity makes low TWR acceptable (the vehicle is moving fast enough that gravity losses are minimal)
- Values below ~`0.3` will likely cause `_s15BecoSplit` to return an error (too little propellant burned in Phase 1)

### s15 validation

`_s15BecoSplit(s)` will return `{ error: '...' }` if:
- Phase 2 propellant is zero or negative (BECO point is past SECO)
- BECO mass ≥ gross liftoff mass (sustainer TWR is physically impossible)

The calculator surfaces these errors in the results panel when `calculateWithS15()` is called.

### Example — Atlas B / SCORE

```javascript
{name:'Atlas B / SCORE',
 stageData:[{
   // Combined stage (all engines, single tank)
   dry:3800, prop:107000, thrust:1590, isp:290, res:1,
   // Stage-and-a-half parameters
   s15:true,
   s15_sust_thrust:270,   // LR-105 sustainer, kN
   s15_sust_isp:309,      // Vacuum Isp of LR-105
   s15_jet_mass:1800,     // 2× LR-89 engine pods + skirt, kg
   s15_beco_twr:0.5       // Atlas BECO at altitude, low TWR is fine
 }],
 payload:68, fairingMass:0, fairingJettison:0,
 boosterName:null, boosterCount:0,
 site:{lat:28.5, azMin:37, azMax:120},
 mode:'orbit', orbit:{apogee:1484, perigee:185, inc:32.3},
 tags:['Historical','Stage-and-a-Half'],
 note:'Project SCORE (1958). First communications relay satellite...'}
```

---

## 4. Preset Resolution — How the Code Works

Understanding this is important when debugging a broken preset.

### `resolvePresetStages(p)`

Called by `loadPreset()` before writing to `stageStore`.

```
if p.stageData exists  →  return p.stageData directly (skips library)
else                   →  map p.stageNames through findStageByName()
                          missing names return a placeholder {dry:0,...,_missing:name}
```

**Consequence:** If you use `stageNames`, the stage data comes from the library. s15 fields on the named library entries are **not** automatically used — the library schema does not include s15. To use s15 on a preset, you **must** use `stageData`.

### s15 passthrough in `loadPreset()`

After `resolvePresetStages` returns, `loadPreset` reads s15 fields from `p.stageData[si]` (the original preset object, not the resolved copy) and merges them into `stageStore`:

```javascript
const orig = (p.stageData || [])[si] || {};
if (orig.s15) {
  entry.s15 = true;
  entry.s15_sust_thrust = orig.s15_sust_thrust || 0;
  // ...
}
```

This means: `stageData` is the single source of truth for s15 fields, even if `resolvePresetStages` would have been able to find mass/thrust/isp from the library. In practice, a preset using s15 should always use `stageData` for the affected stage(s).

---

## 5. Quick-Reference Checklist

### New Stage Library entry

- [ ] Unique `name` (checked against all other entries by hand — no runtime dedup warning)
- [ ] `dry`, `prop`, `thrust`, `isp` are all numbers, not strings
- [ ] Propellant and thrust consistent (sea-level vs. vacuum intent noted in `note`)
- [ ] `tags` array contains at least a propellant tag + role tag + era tag
- [ ] Inserted into the correct category section of `STAGE_LIBRARY`

### New Preset (stageNames path)

- [ ] All names in `stageNames` exist in `STAGE_LIBRARY` (or a user stage with that name)
- [ ] `boosterName` exists in library, or is `null`
- [ ] `payload`, `fairingMass`, `fairingJettison`, `boosterCount` are all set (none missing)
- [ ] `site.lat`, `site.azMin`, `site.azMax` are reasonable for the actual launch site
- [ ] `mode` is `'orbit'` or `'escape'`; matching `orbit` or `escape` sub-object is present
- [ ] `tags` includes at least one of `'Historical'` / `'Active'` / `'Unbuilt'`

### New Preset (stageData path / s15)

- [ ] Everything above except `stageNames` checks
- [ ] s15 stages have all five s15 fields (`s15`, `s15_sust_thrust`, `s15_sust_isp`, `s15_jet_mass`, `s15_beco_twr`)
- [ ] `s15_beco_twr` yields a physically sane BECO point (prop_ph1 > 0 and prop_ph2 > 0)
- [ ] Preset tagged `'Stage-and-a-Half'`

---

## 6. Do Not Touch

The following functions are **protected** — they must not be modified:

- `calculate()` — the core ΔV/TWR/payload solver
- `evalAtPayload()` — iterative payload-mass bisection

`calculateWithS15()` is the only approved way to invoke `calculate()` for s15 vehicles. It expands the virtual stages, calls `calculate()`, restores the DOM, and patches the results labels. Never call `calculate()` directly when s15 stages are present.
