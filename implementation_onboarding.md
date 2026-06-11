# Rocket Playground — Implementation Onboarding
## Updated for handoff after Phase 7 + 8

**Read this before touching any code.**

---

## Where Things Stand

Phases 1–8 of the Program module are implemented. The working file is:

```
/mnt/user-data/outputs/lv_calc.html   (~6,425 lines)
```

The file is clean. `node --check` passes. The Program page renders in browser with:
- A **Band View** canvas (Model 1) showing vehicles raising through orbital bands
- A **Node Map** SVG (Model 3) in the right panel showing the ΔV topology graph
- Full log-zoom time axis, pan, click-to-select, right-click event insertion
- Node Map edge-click → BURN event creation with sync back to Band View

**Phases 9 and 10 are not yet started.** See "What's Next" below.

---

## File Structure (current)

```
<html>
  <head><style>          CSS (~400 lines)
  <body>
    <nav>                Four buttons: vehicles / orbits / results / program
    <div id=page-vehicles class=page active>
    <div id=page-orbits   class=page>
    <div id=page-results  class=page>
    <div id=page-program  class=page>   ← Program page (Phases 1–8 live here)
    <!-- modals (15+) -->
  <script>               ALL JS (~6,000 lines)
    // LV Calculator code (do not modify)
    // ─── PROGRAM MODULE — Phase 1 ───   (orbital state, ΔV engine)
    // ─── PROGRAM MODULE — Phase 2 ───   (propellant / boiloff)
    // ─── PROGRAM MODULE — Phase 3 ───   (FlightVehicle, event engine)
    // ─── PROGRAM MODULE — Phase 4 ───   (DOCK, TRANSFER, LAND, RECONFIGURE)
    // ─── PROGRAM MODULE — Phase 5 ───   (pad / LAN window)
    // ─── PROGRAM MODULE — Phase 6 ───   (Lambert solver / pork chop)
    // ─── PROGRAM MODULE — Phase 7 ───   (Band View)
    // ─── PROGRAM MODULE — Phase 8 ───   (Node Map + sync)
    // ─── INIT ───
    buildTable(); ... progRenderTestResults(); progInitPorkchop();
    progInitBandView(); progRenderNodeMap();
  </script>
</html>
```

Phase end markers are literal lines:
```
// ─── END PROGRAM MODULE Phase N ───────────────────────────────────────────────
```
Use these as str_replace anchors when inserting new phases.

---

## Program Page HTML Layout

```
<div id="page-program" style="padding:0;overflow:hidden;display:flex;flex-direction:column;">
  <!-- Top bar: program name, range display, zoom+/−, Demo, Clear -->
  <div style="flex-shrink:0; ...">
  <!-- Body row -->
  <div style="display:flex;flex:1;...">
    <!-- Spaceport column (160px) -->
    <div id="prog-spaceport">
      <div id="prog-pad-list">
    <!-- Band View canvas (flex:1) -->
    <div id="prog-band-wrap">
      <canvas id="prog-band-canvas">
      <div id="prog-ctx-menu">        ← right-click context menu
    <!-- Right panel (320px) -->
    <div>
      <!-- Node Map SVG -->
      <div id="prog-map-wrap">
        <svg id="prog-map-svg" viewBox="0 0 360 290">
      <!-- Tool tabs: EVENT | PORK CHOP | TESTS -->
      <div id="prog-rt-ev-pane">      ← event editor (default visible)
        <div id="prog-event-detail">
      <div id="prog-rt-pc-pane">      ← pork chop (lazy-initialized)
        <canvas id="prog-porkchop-canvas" width="260" height="148">
      <div id="prog-rt-ts-pane">      ← test results
        <div id="prog-phase1-results">
```

---

## Key Constants and State (Phase 7+8)

### PROG_BV  (Band View dimensions)
```javascript
const PROG_BV = {
  AXIS_H:    26,    // top time-axis strip height
  MINIMAP_H: 28,    // bottom scrubber height
  ZONE_HDR:  20,    // zone header height (legacy, less used now)
  TRACK_H:   32,    // legacy per-vehicle lane height
  ICON_R:    5,     // base radius for non-burn event nodes
  LEFT_W:    72,    // left margin for rotated zone labels
};
const PROG_BV_T_REF = 3600;   // log-zoom reference time (1 hour)
```

### PROG_BV_TICK_CANDS  (log-spaced axis ticks)
Array of candidate tick values in seconds: 0, 1m, 5m, 10m, 30m, 1h, 3h, 6h, 12h, 1d, 2d, 3d, 7d, 14d, 30d, 60d, 90d, 180d, 1y, 2y, 5y, 10y.

### PROG_NODE_BAND_Y  (node → zone + vertical fraction)
```javascript
const PROG_NODE_BAND_Y = {
  'earth-surface': { band:'earth',          frac:0.90 },
  'leo':           { band:'earth',          frac:0.52 },
  'gto':           { band:'earth',          frac:0.28 },
  'geo':           { band:'earth',          frac:0.12 },
  'escape':        { band:'earth',          frac:0.04 },
  'tlc':           { band:'cislunar',       frac:0.55 },
  'dro':           { band:'cislunar',       frac:0.16 },
  'llo':           { band:'cislunar',       frac:0.72 },
  'moon-surface':  { band:'cislunar',       frac:0.90 },
  'mars-transit':  { band:'interplanetary', frac:0.50 },
  'mars-orbit':    { band:'interplanetary', frac:0.18 },
  'mars-surface':  { band:'interplanetary', frac:0.85 },
  'venus-transit': { band:'interplanetary', frac:0.62 },
  'venus-orbit':   { band:'interplanetary', frac:0.32 },
};
```
`frac:0` = top of zone, `frac:1` = bottom. Earth-surface is near the bottom of the Earth band; GEO is near the top. This drives the "raising" visual where tracks slope upward as vehicles gain altitude.

### PROG_BAND_STATE
```javascript
let PROG_BAND_STATE = {
  tStart, tEnd,        // visible time window (seconds)
  selId,               // selected eventId or null
  drag, dragX0, dragTS0, dragTE0,
  hitNodes,            // [{evId, cx, cy, r}] rebuilt each render
  trackHits,           // [{vehicleId, y0, y1}] rebuilt each render
  layout,              // last computed _progBvLayout() result
};
```

### PROG_NM_NODES / PROG_NM_EDGES
14 canonical nodes, 12 edges. Positions are for viewBox `0 0 360 290`. Node IDs match keys in `PROG_NODE_BAND_Y`. See Phase 8 block for full definitions.

---

## Key Functions (Phase 7+8)

### Coordinate mapping
```javascript
_progBvTx(t, W)        // time → canvas x pixel (log-zoom, accounts for LEFT_W)
_progBvXt(x, W)        // canvas x pixel → time (inverse)
```
Both use `log1p(t / PROG_BV_T_REF)` for the log transform. The LEFT_W margin is excluded from the content width: `cW = W - PROG_BV.LEFT_W`.

### Layout
```javascript
_progBvLayout(prog, W, H)
// Returns { zones, minimapY, missionEnd, ... }
// Zone heights: Earth 50%, Cislunar 32%, Interplanetary 18% of content area.
// A zone is "active" if it has vehicles OR if any event's fromNode/toNode points
// into it. Active zones get proportional height; empty zones collapse to 22px.
// zones[] array is in top-to-bottom canvas order (Interplanetary first, Earth last).
```

### Track segments
```javascript
_progBvComputeSegments(fv, evs, layout, W)
// Returns [{t1, t2, y1, y2, dash}]
// LAUNCH/BURN: dashed diagonal (fromNode Y → toNode Y, potentially crossing bands)
// COAST: solid horizontal at current Y
// Gap connectors between events: solid horizontal at current Y
// Requires fromNode/toNode on BURN and LAUNCH events to draw correctly.
// Falls back to current-state Y if fromNode/toNode absent (no diagonal).
```

### Node position
```javascript
_progBvNodePxY(nodeId, layout)   // node ID → canvas Y pixel (uses PROG_NODE_BAND_Y)
_progBvStateToNode(orbitState)   // OrbitalState → canonical node ID
```

### Rendering pipeline
```javascript
progRenderBandView()
  → _progBvLayout()
  → _progBvDrawZones()     // zone backgrounds + rotated labels in LEFT_W margin
  → _progBvDrawAxis()      // log-spaced time axis + T+ label
  → _progBvDrawTracks()    // segment-based tracks + event nodes for ALL vehicles
  → _progBvDrawMinimap()   // overview scrubber
  → (updates range display)
  → progRenderNodeMap()    // always called after Band View render for sync

progRenderNodeMap()
  → _progNmActiveEdgeIds()  // finds edges matching mission's BURN fromNode/toNode
  → builds SVG innerHTML    // nodes, edges, ΔV labels, active path highlight
```

### Sync
Calling `progRenderBandView()` always also calls `progRenderNodeMap()`. No other sync mechanism is needed right now because:
- Band View selection changes call `progUpdateEventEditor()` then `progRenderBandView()`
- Node Map edge clicks call `progNmEdgeClick()` which calls `progRenderBandView()`

Full bidirectional sync (Band View event selection → Node Map path highlight per selected vehicle) is not yet implemented. The Node Map highlights all BURN event edges in the program; it does not filter to the selected vehicle or event.

---

## Critical Patterns

### str_replace workflow
Every patch must:
1. Load the file into a Python string
2. Assert the old anchor is present (`assert OLD in c`)
3. Replace once (`c.replace(OLD, NEW, 1)`)
4. Save
5. Syntax-check: extract `<script>` to first `</script>`, write to `/tmp/check.js`, run `node --check`

**Never use line numbers. Always use text anchors.**

The file has been patched many times this session. Anchors drift. Always verify with `grep -n` or a Python `print(repr(c[idx:idx+200]))` before writing a replacement.

### Anchor text with unicode
The range label line in `progRenderBandView` contains a literal backslash-u2013 (6 chars), not the actual em-dash character. When using it as a Python anchor, use a raw string or explicit `\\u2013`:
```python
OLD = r"' \u2013 '"   # correct
OLD = "' \u2013 '"   # WRONG — Python interprets \u2013 as the Unicode char
```

### Phase end markers
Each phase ends with:
```javascript
// ─── END PROGRAM MODULE Phase N ───────────────────────────────────────────────
```
The em-dashes are `\u2500` (not `\u2014`). When inserting a new phase, insert BEFORE the marker for that phase:
```python
ANCHOR = "// \u2500\u2500\u2500 END PROGRAM MODULE Phase 8"
# Insert Phase 9 content before this anchor
```

### Syntax check (mandatory)
```python
with open('/mnt/user-data/outputs/lv_calc.html', 'r') as f: h = f.read()
s = h.index('<script>')
e = h.index('</script>', s)   # FIRST </script>, not last
open('/tmp/check.js','w').write(h[s+8:e])
# then: node --check /tmp/check.js
```

---

## BURN Events: fromNode / toNode Required

The `fromNode` and `toNode` fields on BURN (and LAUNCH) events are what makes the Band View draw diagonal tracks. Without them, `_progBvComputeSegments` treats the BURN as a no-op and only draws the event node at the fallback Y.

**When inserting a BURN via Node Map edge click:** `progNmEdgeClick()` automatically sets `fromNode` and `toNode` from the edge definition.

**When inserting a BURN via right-click context menu:** the event is created without `fromNode`/`toNode`. The event editor in the right panel does not currently have UI for these fields. This is a known gap — users can't get diagonal BURN tracks unless they click a Node Map edge or the event has these set programmatically.

The demo mission (`progCreateDemoMission`) sets `fromNode`/`toNode` on all LAUNCH and BURN events, serving as a visual reference for correct behavior.

---

## Demo Mission (Apollo 11 Analog)

Two vehicles:

- **Apollo 11** (`#61afef` blue): CSM + LM stack
  - LAUNCH earth-surface → leo
  - COAST (parking orbit)
  - BURN TLI leo → tlc
  - SEPARATE (S-IVB splits off)
  - COAST (trans-lunar)
  - BURN LOI tlc → llo
  - COAST (lunar orbit ops)
  - BURN TEI llo → tlc

- **S-IVB** (`#4b5263` gray):
  - LAUNCH earth-surface → leo
  - COAST (brief)
  - EXPEND

The resulting Band View shows:
- Both vehicles rising from earth-surface to leo (dashed diagonal, within Earth band)
- S-IVB coasting horizontal at leo, then ending
- Apollo coasting at leo, then TLI diagonal crossing from Earth band into Cislunar band
- Trans-lunar coast horizontal at tlc level (Cislunar band)
- LOI diagonal dropping from tlc to llo (within Cislunar band)
- Lunar ops coast horizontal at llo level

---

## Test Coverage (current)

Tests are inline IIFE expressions that run at parse time. Results go to `PROG_P1_TEST_RESULTS` through `PROG_P8_TEST_RESULTS`. `progRenderTestResults()` renders all of them into the Tests pane.

Passing counts at last check:
- Phase 1: 10 tests (ΔV engine, orbital mechanics)
- Phase 2: 8 tests (boiloff, propellant mass)
- Phase 3: 12 tests (FlightVehicle construction, event execution)
- Phase 4: 8 tests (DOCK, TRANSFER, LAND, SEPARATE preconditions)
- Phase 5: 5 tests (pad recycle, LAN window)
- Phase 6: 20 tests (Lambert solver, pork chop grid accuracy)
- Phase 7: 8 tests (time formatting, demo structure, coord roundtrip, tick config)
- Phase 8: 7 tests (node/edge counts, vehicle-node mapping, active edge detection)

**Known issue with Phase 7 tests:** The coord roundtrip test (`_progBvTx` / `_progBvXt`) was written against the old linear mapping. After the log-zoom upgrade the roundtrip is still accurate but `T_test=43200, W_test=1000` maps to `x≈500` only in linear mode. With log-zoom it maps to a different x. The test checks `x_mapped ≈ 500` which will fail. The roundtrip accuracy test (error < 1s) should still pass. This should be fixed in Phase 9 prep.

---

## What's Next: Phase 9 + 10

### Phase 9 — Spacecraft payload editor

Per spec §10:

1. `SpacecraftDefinition` struct (ordered stage stack with 4 extra fields per stage: `crewCapacity`, `dockingPorts`, `tunnelCapable`, `descentPropFraction`)
2. A builder UI (probably a modal or right-panel view) letting users drag existing stages from the stage library into a spacecraft definition
3. `SpacecraftDefinition`s stored in `PROG_ACTIVE_PROGRAM.spacecraft[]`
4. LAUNCH event can reference a `spacecraftId` (instead of raw payload mass) — the spacecraft's stages become part of the FlightVehicle stack above the upper stage

Open question per spec §12: should staging triggers be defined on the vehicle definition (carries into every program) or per-BURN event in the program? Likely: vehicle carries defaults, program can override.

### Phase 10 — Program save/load + polish

1. **`formatVersion: 3` JSON save/load**: `progSaveProgram()` / `progLoadProgram()`. Save button in the top bar. The full program file format is in spec §9. Key fields: `formatVersion: 3`, `vehicles{}`, `events[]`, `pads[]`, `spacecraft[]`, `nodeMapCustomNodes[]`, `performanceCases[]`.

2. **Closure bar**: A summary strip (probably below the top bar) showing mission pass/fail. Spec §1: "does the architecture close?" — final orbital state of each vehicle vs. its mission objective. Green = closed; red = did not close with ΔV deficit.

3. **"Use in Program" button**: On the LV Calculator Results page, a button that creates a LAUNCH event in the active program referencing the current vehicle. Low priority.

### Known gaps not yet addressed

- **Boiloff during COAST:** The boiloff math (`progBoiloff`, `progApplyBoiloffToStage`, `progApplyBoiloffToVehicle`) is implemented and tested (Phase 2), but it is not called during COAST event execution. The executor for COAST events needs to call `progApplyBoiloffToVehicle(fv, duration_days)` and record the propellant loss. This will cause mass changes that affect downstream ΔV calculations.

- **LAN window display:** The LAN window heatmap (Phase 5) is implemented but not displayed in the current UI. It was designed for a launch scheduling view that hasn't been built yet. Currently pads exist and recycle times are tracked but the LAN visualizer is dormant.

- **Phase 8 bidirectional sync (spec §8.4 item 5):** The spec says selecting an event in Band View should highlight the corresponding path in Node Map. Currently the Node Map highlights all BURN edges in the program, not the selected vehicle's subset. True per-selection highlighting requires `_progNmActiveEdgeIds()` to accept a `selId` parameter and filter to the selected vehicle's edges only.

- **Phase 7 test fix:** The `Coord map: T_test → x=500` test was written for linear mapping. With log-zoom and LEFT_W=72, a mid-range time does not map to x=500. The test should be rewritten to check `|_progBvXt(_progBvTx(T_test, W), W) - T_test| < 1` (roundtrip accuracy only).

- **Custom Node Map nodes:** Spec §8.4 includes "custom node addition" — letting users add planets, Lagrange points, or custom orbits to the Node Map. `PROG_ACTIVE_PROGRAM.nodeMapCustomNodes[]` exists in the data model but the UI to add/edit these nodes is not built.

---

## Invariants — Never Break

1. `calculate()` and `evalAtPayload()` — do not modify, do not call from Program code
2. `showPage()` — only way to switch pages; never set `.page` display directly
3. CSS custom properties only — never hardcode hex colors in new CSS
4. `openModal()` / `closeModal()` — only way to show/hide modals
5. `#rp-root` wraps everything — no content outside it
6. LV Calculator pages (Vehicles, Orbits, Results) must continue working independently
7. No stage is auto-expended — staging must be explicit
8. Docking is free when orbits match — no rendezvous ΔV
9. Mission clock advances only during transit events — not during docking/EVA
10. ΔV comes only from engine burns — BURN events fire exactly one stage

---

## Useful grep Patterns

```bash
# Find phase markers
grep -n "END PROGRAM MODULE Phase" lv_calc.html

# Find all PROG_ globals
grep -n "^const PROG_\|^let PROG_\|^function prog" lv_calc.html | head -40

# Check INIT block
grep -n "// ─── INIT\|progRenderTestResults\|progInitBandView\|progRenderNodeMap" lv_calc.html

# Check for a specific node ID
grep -n "fromNode\|toNode" lv_calc.html | grep -v "//\|spec\|comment" | head -20

# Verify syntax
python3 -c "
with open('/mnt/user-data/outputs/lv_calc.html','r') as f: h=f.read()
s=h.index('<script>'); e=h.index('</script>',s)
open('/tmp/check.js','w').write(h[s+8:e])
"
node --check /tmp/check.js
```

---

## File Locations

```
/mnt/user-data/outputs/lv_calc.html          ← WORKING FILE (edit this)
/mnt/project/lv_calc.html                    ← read-only reference copy
/mnt/project/program_architecture.md         ← spec (read before any new phase)
/mnt/project/staging_analysis_v3.md          ← worked Apollo/N1-L3 examples
/mnt/project/conops_mockups.html             ← visual reference for Band View + Node Map
/mnt/user-data/outputs/implementation_onboarding.md  ← this file
```

The `conops_mockups.html` file shows three views. **Only Model 1 (Body Bands) and Model 3 (Node Map) are implemented.** Model 2 (Altitude Scale) was intentionally skipped per the project owner.

---

*Last updated: after Phase 7+8 implementation session. Phases 9–10 remain.*
