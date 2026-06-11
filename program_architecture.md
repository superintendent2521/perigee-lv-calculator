# Rocket Playground — Program Architecture Specification
**Version 0.5 | For implementation by future Claude instances**
*Staging rules are now UI shortcuts that generate explicit visible events.
 A BURN fires exactly one stage. The timeline is always the truth.*

---

## 1. Philosophy and Scope

A **Program** is a mission architecture: a real-clock timeline of events acting on one
or more vehicles, launching from one or more pads, interacting in space, and ultimately
closing (or failing to close) a set of mission objectives.

The headline output is **closure**: does the architecture close? Secondary outputs are
per-vehicle, per-stage, per-event ΔV budgets, propellant remaining, payload delivered,
and mission duration.

### The LV Calculator Relationship

The LV Calculator is the engine that builds and validates rockets. It is completely
independent of the Program module. The relationship is one-way:

```
LV Calculator  ──(saves)──►  vehicle .json  ──(loads)──►  Program
```

The Program loads vehicle files. It never writes back to them. If a user wants to edit
a rocket, they return to the LV Calculator, make changes, save a new file, and reload
it into the Program. The Program stores a reference to the loaded vehicle definition
plus whatever the mission does with it from that point forward.

No changes to the LV Calculator are required to implement the Program.

### The Two Views

The Program is edited through two synchronized views:

- **Band View** (primary): horizontal body-band timeline with log-zoomable time axis
- **Node Map** (secondary): subway-style ΔV topology graph, also editable

Changes in either view propagate to the other. The Band View owns time; the Node Map
owns ΔV topology. Neither is read-only.

### Physics Model

Patched conics, impulsive burns, Hohmann/bi-elliptic transfers, SOI transitions
modeled as instantaneous. Ascent losses use the existing Townsend-Schilling model
from the LV Calculator output. Boiloff accrues against the real clock on cryo tanks
during tracked coast periods.

---

## 2. Foundational Rules

These rules govern simulation behavior throughout. Implementers must not deviate.

**Rule 1 — LV Calculator is read-only.**
The Program loads vehicle definitions. It never modifies them. Editing a vehicle
means going back to the LV Calculator.

**Rule 2 — No stage is automatically expended.**
When a stage separates or exhausts its propellant, it becomes an independent
FlightVehicle with whatever propellant remains. The user decides what happens to
it next. Nothing is expended without a deliberate user action.
*Implication: an S-IVB with 200 kg residual prop is still a live vehicle that
can perform small burns, dock with a depot, or be explicitly expended.*

**Rule 3 — Docking is free once orbits match.**
The last significant maneuver is matching orbital state (altitude + inclination + LAN).
Once two vehicles share the same OrbitalState, docking is treated as instantaneous
with zero ΔV cost. No proximity ΔV. No rendezvous phasing. Same orbit → can dock.

**Rule 4 — The clock tracks only transit times.**
The mission clock advances for:
  • Pad recycle (waiting for a launch pad to be available)
  • Orbital coasts (parking orbit holds, trans-lunar, interplanetary transits)
  • Explicit user-set holds
The clock does NOT advance for:
  • Docking or undocking
  • Crew transfer (tunnel or EVA)
  • Propellant transfer
  • On-orbit assembly
*Reason: pad recycle and transit times are the schedule drivers. Everything else
completes faster than the next launch window or the next transfer opportunity.*

**Rule 5 — ΔV is only consumed by engine burns.**
BURN events consume ΔV and propellant. All other events (SEPARATE, DOCK,
TRANSFER_CREW, TRANSFER_PROPELLANT, LAND) consume neither.

---

## 3. Entity Model

### 3.1 Program
- `name`
- `pads[]` — Pad entities
- `vehicleDefinitions[]` — loaded from .json files (immutable)
- `spacecraftDefinitions[]` — payload spacecraft built within the program file
- `events[]` — ordered Event list (the timeline)
- `nodeMapCustomNodes[]` — user-added nodes in Node Map
- `performanceCases[]`

### 3.2 Pad
- `name`, `shortCode`, `siteKey` (links to LAUNCH_SITES)
- `recycleTime` — hours before pad can launch again
- `lastLaunchTime` — T+ timestamp
- `available(t)` — `t >= lastLaunchTime + recycleTime`

### 3.3 VehicleDefinition
Loaded from an LV Calculator .json file. Immutable within the Program.
Contains the existing vehicle format (stages, site, orbit target, performance cases).

### 3.4 SpacecraftDefinition
A payload spacecraft defined within the program file. An ordered stage stack
with no launch vehicle. Used for LMs, CSMs, LOKs, LKs, depots, tugs, etc.

Stage fields (extends existing stage form with 4 new fields):
```
{
  ...existing fields (name, dry, prop, thrust, isp, res, engines, note, tags)...
  crewCapacity:         integer,        // 0 = uncrewed
  dockingPorts:         integer,        // 0–4
  tunnelCapable:        boolean,        // internal crew transfer possible?
  isLandingTruss:       boolean,        // structural-only; auto-candidate for surface separation
}
```

The spacecraft stage stack is ordered bottom → top (same convention as LV Calculator).
Any stage can be separated from the one below it by a SEPARATE event.

### 3.5 FlightVehicle
A live mission instance. Created by a LAUNCH event or a SEPARATE event.
- `vehicleId` — UUID
- `sourceDefinitionId` — which VehicleDefinition or SpacecraftDefinition this came from
- `stages[]` — ordered live stage stack (bottom → top)
- `orbitState` — current OrbitalState
- `status` — `PRELAUNCH | ASCENT | ORBIT | TRANSFER | LANDED | EXPENDED`
- `color` — assigned at creation; used for Band View lane coloring

When a SEPARATE event fires at position N of the stack:
  FlightVehicle A: stages[0..N-1]  (lower portion)
  FlightVehicle B: stages[N..]     (upper portion)
Both get new vehicleIds and their own Band View lanes.

### 3.6 Stage (live)
- `stageDefinitionId` — source stage
- `tanks[]` — Tank instances (propellant remaining per tank)
- `burnLog[]` — record of each BURN event this stage participated in
- `status` — `ACTIVE | EXPENDED | SEPARATED`
- `crewAboard` — integer

### 3.7 Tank
- `propellantType` — key into PROPELLANT_TYPES
- `capacity` (kg)
- `fill` (kg) — decremented by burns and boiloff

### 3.8 OrbitalState
```
{
  body:        string,   // "Earth" | "Moon" | "Mars" | "Venus"
  apogee:      km,
  perigee:     km,
  inclination: deg,
  lan:         deg,
  epoch:       T+_seconds,
  surface:     boolean
}
```

Two FlightVehicles share an OrbitalState when body, apogee, perigee, inclination,
and LAN all match within tolerance. At that point Rule 3 applies — docking is free.

### 3.9 NodeMapState
A canonical named orbital state used as a vertex in the Node Map.
```
{
  nodeId, label, body, apogee, perigee, inclination, surface, isCustom
}
```

---

## 4. Propellant Types

| Key | Name | Boiloff (kg/day/kg) | Cryo |
|---|---|---|---|
| `LOX_LH2` | LOX / LH2 | 0.003 | yes |
| `LOX_RP1` | LOX / RP-1 | 0.0002 | partial |
| `LOX_CH4` | LOX / Methane | 0.001 | yes |
| `NTO_A50` | NTO / Aerozine-50 | 0 | no |
| `NTO_UDMH` | NTO / UDMH | 0 | no |
| `SOLID` | Solid | 0 | no |

Boiloff runs only during tracked COAST periods (Rule 4). Not during docking,
transfer, or assembly operations.

---

## 5. The Handoff: LV Calculator → Program

When a user launches a vehicle in a Program, they configure a LAUNCH event that
references a VehicleDefinition plus three choices:

**Choice 1 — Target orbit**
Which orbit does this launch achieve? Pulled from the LV Calculator's result,
or selected fresh. This becomes the starting OrbitalState for all vehicles from
this launch.

**Choice 2 — Payload**
  a) Simple mass (kg) — existing behavior, no further structure
  b) Spacecraft — select a SpacecraftDefinition from the program file
  c) None — the upper stage itself is the entire deliverable (tanker mission)

**Choice 3 — Upper stage disposition**
  Keep → upper stage enters the CONOPS as the bottom of the starting vehicle stack,
          with remainingProp = totalProp − propConsumedDuringAscent (from LV Calculator)
  Expend → upper stage is expended at orbit insertion (user can still choose not to)

The starting FlightVehicle stack:
```
[upper_stage (if kept) | spacecraft_stage_1 | ... | spacecraft_stage_N]
  ↑ bottom (engine end)                                    ↑ top (nose)
```

---

## 6. Event Taxonomy

Common envelope:
```
{
  eventId, type, label,
  vehicleId:   UUID | UUID[],
  tStart:      T+_seconds,     // computed or set
  tEnd:        T+_seconds,     // computed
  deltaV:      m/s,            // BURN events only; 0 for all others
  dvBudget:    { stageId: dv },
  fromNode:    NodeMapId,      // orbital state before event
  toNode:      NodeMapId,      // orbital state after event
  result:      PENDING | SUCCESS | FAILED | MARGINAL,
  warnings:    string[]
}
```

### 6.1 LAUNCH
- Inputs: vehicleDefinitionId, padId, targetOrbit, payload choice (§5)
- Computes:
  - LAN alignment wait → sets tStart automatically (user does not set it manually)
  - Ascent ΔV via LV Calculator model
  - Upper stage remaining propellant
  - Pad recycleTime stamp
- Creates starting FlightVehicle at target orbit
- Sets pad.lastLaunchTime = tEnd
- Warning: if a second launch from same pad is scheduled before recycle completes

### 6.2 BURN
A BURN event fires **exactly one stage**. This is a hard rule.

Multi-stage sequences (Saturn V ascent, crasher descent, tug+payload) are modeled
as multiple sequential BURN events with SEPARATE events between them. Every
separation is a visible event in the timeline. Nothing stages invisibly.

- Inputs: vehicleId, burnType, stagingStageId, targetOrbit
- `stagingStageId`: which specific stage in the stack is firing for this burn.
  Defaults to the bottom stage if not specified.
- BurnTypes:
  - `HOHMANN`, `BIELLIPTIC`, `PLANE_CHANGE`, `COMBINED`, `CIRC`
  - `TLI`, `LOI`, `TEI`
  - `TMI`, `MOI` (Mars)
  - `TVI`, `VOI` (Venus)
  - `PARTIAL` — fires until a specific propellant threshold, then stops.
    Used for crashers, descent reserve, tug separation.
    Additional input: `propStopThreshold` (fraction remaining when burn halts).
- Computes: ΔV delivered, propellant consumed, new OrbitalState.
- Warning: if the burn does not achieve the target orbit (PARTIAL burns, insufficient
  propellant), the event node turns amber/red and all downstream events receive
  a propagated warning showing the actual vs. intended orbital state.

**Multi-burn stages:**
A stage stays in the stack between burns with its remaining propellant intact.
The S-IVB between parking orbit insertion and TLI is the canonical case: same
stage, two separate BURN events, one COAST between them.

**Staging Trigger Shortcuts**

The user can define staging triggers on a vehicle to auto-generate BURN + SEPARATE
sequences rather than building them manually. A staging trigger is a rule that,
when confirmed by the user, inserts explicit events into the timeline.

```
StagingTrigger {
  label:           string,
  firingStageId:   UUID,    // the stage that is burning
  separateStageId: UUID,    // the stage that separates when condition met
  condition:       EMPTY | THRESHOLD | AT_DV,
  propThreshold:   float 0.0–1.0,   // for THRESHOLD
  dvContribution:  m/s,             // for AT_DV
  separationSide:  LOWER | UPPER,
  nextAction:      CONTINUE_BURN | STOP | COAST
}
```

When the user adds a staging trigger to a vehicle and runs the simulation (or clicks
"Apply Staging"), the program **inserts explicit events into the timeline**:

  Before:   [BURN: full sequence]
  After:    [BURN: Stage A fires to threshold]
            [SEPARATE: Stage A at propThreshold]  ← inserted, visible, editable
            [BURN: Stage B continues]             ← inserted, visible, editable

These inserted events appear in the Band View like any other user-created events.
The user can edit their parameters, reorder them, or delete them. The staging
trigger is just the mechanism that created them; once inserted, the events are
authoritative. Deleting the inserted events removes the staging sequence.

If the user wants to build a staging sequence manually without triggers, they can:
add a PARTIAL BURN, then add a SEPARATE, then add another BURN. Triggers are
convenience, not requirement.

**Condition types:**
- `EMPTY` — stage fires until propellant runs out. The SEPARATE is inserted when
  the BURN's propellant consumption reaches the tank capacity. Classic staging.
- `THRESHOLD` — stage fires until propThreshold fraction remains. The inserted
  SEPARATE fires at that point. Remaining propellant stays in the separated stage.
  *Crasher (Block D, threshold 0.05)*: fires until 5% remains, then crashes.
  *Descent reserve (Block E, threshold 0.35)*: fires until 35% remains, lands.
  *Reusable tug (threshold 0.30)*: tug keeps 30% for return, releases payload.
- `AT_DV` — stage fires until it has contributed dvContribution m/s. The SEPARATE
  inserts after that ΔV is delivered. Useful for precise mission design where the
  ΔV split between stages is the design variable, not the propellant fraction.

**`nextAction` after separation:**
- `CONTINUE_BURN` — an additional BURN event is inserted for the next stage.
  Both the SEPARATE and the new BURN are visible in the timeline.
- `STOP` — no additional BURN is inserted. Vehicle coasts on the trajectory
  achieved so far. The user adds the next burn manually when ready.
- `COAST` — same as STOP but both vehicles (the separated stage and the
  continuing vehicle) are explicitly placed in COAST state.

**`separationSide`:**
- `LOWER` — bottom portion of stack separates. Upper continues. Classic staging.
- `UPPER` — upper portion separates. Lower continues. Tug-above-payload case.

**When the math breaks:**
If a staging sequence results in an OrbitalState that doesn't match the intended
target (because a PARTIAL burn didn't deliver enough ΔV, or the separated stage
had less propellant than expected), the program does NOT adjust anything silently.
Every downstream event that assumed the original target orbit receives a warning:
  "⚠ Orbital state differs from expected: apogee 312km vs 185km target.
   Results below assume actual state. Adjust upstream burns to close."
The mission continues computing. Red numbers everywhere it matters. Nothing hidden.

### 6.3 SEPARATE
- Inputs: vehicleId, separationIndex (which stage boundary to cut)
- Creates two FlightVehicles from the split stack
- Zero ΔV, zero clock time
- Neither vehicle is automatically expended (Rule 2)

### 6.4 DOCK
- Precondition: two FlightVehicles share the same OrbitalState (Rule 3)
- Zero ΔV, zero clock time (Rule 4)
- Merges two FlightVehicle stage stacks into one
- Stack ordering at dock time: user specifies which vehicle goes on top
- DOCK between vehicles with no tunnel_capable port generates an info note
  (historically required EVA, but this doesn't affect simulation)

### 6.5 TRANSFER_PROPELLANT
- Precondition: docked
- Inputs: sourceVehicle, destVehicle, propellantType, mass
- Same propellant type only
- Zero ΔV, zero clock time

### 6.6 TRANSFER_CREW
- Precondition: docked (or TRANSFER_CREW_EVA variant: just in proximity — same orbit)
- Inputs: fromVehicle, toVehicle, count
- Two subtypes:
  - `TUNNEL`: internal transfer (tunnelCapable port required on both sides)
  - `EVA`: external spacewalk (no tunnel required; historically significant but
            no simulation cost difference — zero ΔV, zero clock time per Rule 4)
- The EVA/tunnel distinction is recorded for mission fidelity, not for cost.

### 6.7 TRANSFER_STAGE
- Precondition: docked
- Tug takes a stage from another vehicle's stack
- Zero ΔV, zero clock time

### 6.8 LAND
- Inputs: vehicleId, body, site (optional)
- Computes: deorbit burn ΔV + landing burn ΔV (or aerocapture flag: zero ΔV)
- isLandingTruss stages: when LAND completes, a SEPARATE event at the truss boundary
  is automatically suggested (but not forced — user confirms)
- fromNode: orbit → toNode: surface

### 6.9 ASCENT_SURFACE
- Inputs: vehicleId, body, targetOrbit
- Computes: surface ascent ΔV per body model
- Ascent budget = prop remaining after descent BURN staging rule fired (ABORT_BURN
  at threshold). No special stage type required; the staging rule on the descent BURN
  fully defines the split.
- fromNode: surface → toNode: orbit

### 6.10 RECONFIGURE
A compound event for transposition-and-docking style reconfigurations.
Contains an ordered sub-sequence: SEPARATE, BURN (RCS, small ΔV), DOCK.
May reorder the stage stack (the only event that can do this).
Zero clock time. Small ΔV (~10 m/s typical).
Not commonly needed — primarily for Apollo-style payload extraction.

### 6.11 COAST
A tracked waiting period. The clock advances.
- Duration sources:
  - Explicit user-set duration
  - Derived: time until next launch window (from LAN calculator)
  - Derived: time until next transfer window (from pork chop plotter)
- Boiloff accrues on all cryo tanks during COAST
- COAST is the only event type that advances the mission clock
  (LAUNCH advances clock by ascent duration; all other events are instantaneous
   on the clock — this is intentional, see Rule 4)

### 6.12 EXPEND (explicit)
User explicitly marks a FlightVehicle as expended.
Sets status = EXPENDED. Lane ends in Band View.
Optional: set trajectory (e.g. lunar impact, heliocentric) for display.

---

## 7. Orbital Mechanics — Math Required

### 7.1 LAN Alignment Window
```
cos(i) = cos(φ) × sin(az)
window_t = ΔLAN / (360/86164)  [mod sidereal day]
```
Returns two windows (ascending and descending node). Display as LAN vs. wait heatmap.
Selected window → automatically sets LAUNCH tStart. User does not set it manually.

### 7.2 Pork Chop Plotter (Earth–Mars, Earth–Venus, Earth–Moon)
Lambert's problem (universal variable method) on a departure × flight-time grid.
User clicks to select window → sets TMI departure time → drives COAST duration.

### 7.3 SOI Transitions
Departure: Vinj = √(Vesc² + C3)
Arrival: V∞_arrival → capture burn to target orbit

### 7.4 Lunar Surface Ascent
ΔV ≈ 1,870 m/s to LLO 100km (baseline). Rocket equation on top.

### 7.5 Mars Surface Ascent
Simplified T-S with g_mars = 3.72 m/s², ρ₀ = 0.015 kg/m³. Drag penalty 50–150 m/s.

### 7.6 Plane Change (full vector including LAN)
ΔV = 2 × V × sin(Δi_total / 2)

### 7.7 Boiloff Integration
fill = fill₀ × exp(−boiloffRate × insulationFactor × Δt_days)
Runs only during COAST events and launch ascent.

### 7.8 Lander Ascent Budget (Staging Rule Model)
For a lander that reuses its engine for both descent and ascent (Block E / LK style):

1. Descent BURN is type PARTIAL with propStopThreshold = X.
2. Burn stops when prop_remaining = X × prop_total.
3. SEPARATE fires (via staging trigger or manually) to release landing truss.
4. Vehicle lands with prop_remaining in tank.
5. Ascent BURN uses that same stage with prop_remaining as its budget.

Closure check: prop_remaining after descent must yield sufficient ΔV for ASCENT_SURFACE.
  required_prop = m_dry × (exp(ΔV_ascent / (Isp × g0)) − 1)
  closure passes if prop_remaining ≥ required_prop

The threshold X is the key design variable. The program shows the closure margin
on the ASCENT_SURFACE event as a function of X — implementers should show this
as a small sensitivity chart on the event detail panel.

---

## 8. UI Architecture

### 8.1 Program Page
Fourth top-level tab. Loads after Results in the existing nav.

### 8.2 Overall Layout
```
┌────────────┬────────────────────────────────────┬──────────────────┐
│  Spaceport │         BAND VIEW                  │   NODE MAP       │
│  (160px)   │      (primary, ~55% width)         │  (~35% width)    │
│            │                                    │                  │
│ [pad] ●    │ MARS  ─────────────────────────    │  [Earth]──[LEO]  │
│ [pad] ●    │ MOON  ──────────────────────────   │      │      │    │
│ [pad] ○    │ DRO   ──────────────────────────   │   [GTO]  [TLI]   │
│ [pad] ●    │ EARTH ────[A]──[B]──[C]─────────   │      │      │    │
│            │        ─────────────────────────   │   [GEO]  [LLO]   │
│            │   ←── log-zoom scroll ──►          │                  │
├────────────┴────────────────────────────────────┴──────────────────┤
│  SUMMARY: [closure ✓/✗] [total ΔV] [propellant consumed] [duration]│
└────────────────────────────────────────────────────────────────────┘
```

### 8.3 Band View

**Body bands (top → bottom):**
Mars · Venus (collapsed by default) · Moon · DRO/cis-lunar (collapsed by default) ·
Earth Orbit · Earth Surface

**Time axis:**
- Horizontal, left = T+0
- Log-zoom via scroll/pinch. Zoom anchor = cursor position.
- Minimap scrubber at bottom shows full timeline; drag to navigate.
- Tick labels auto-scale: minutes → hours → days → months.
- Only COAST and LAUNCH events have nonzero duration on the time axis.
  All other events appear as instantaneous dots.

**Vehicle tracks:**
- Each FlightVehicle is a colored horizontal line in its body band.
- Body band transitions: diagonal connector crossing band boundaries.
- Separated stages spawn new thinner lanes (same color family).
- Expended vehicles: lane ends with an × symbol.

**Event nodes:**
- Circles on the track. Size = ΔV magnitude (zero for non-burn events).
- Color: green (within budget), amber (<5% margin), red (over budget), grey (uncomputed).
- Hover: inline detail panel.
- Click: opens event editor.
- Right-click on track: "Insert event here" → event type picker for that vehicle's state.

**Adding events:**
- Right-click on a vehicle track → context menu.
- Context menu shows only valid event types for that vehicle's current state
  (e.g. ASCENT_SURFACE only shown for surface vehicles, DOCK only if another
  vehicle is in matching orbit).

**Warnings (non-blocking):**
- ΔV over budget: event node turns red.
- Scheduled launch before pad recycle: red connector between launch events.
- descentPropFraction may not leave enough ascent budget: amber on LAND event.
- All warnings shown in summary bar count.

### 8.4 Node Map

**Structure:** three-zone layout matching Band View bands.
Left: Earth nodes. Middle: Lunar nodes. Right: Interplanetary.

**Built-in nodes:**
```
Earth:   Surface · LEO 185km · LEO 400km · GTO · GEO · EML1 · EML2
Moon:    Trans-Lunar Corridor · DRO · NRHO · LLO 100km · Lunar Surface
Mars:    Mars Transfer · Mars Orbit 400km · Mars Surface
Venus:   Venus Transfer · Venus Orbit · Venus Surface
```

**Interaction:**
- Click edge → create a BURN event for that transfer, assign to a vehicle
- Drag vehicle icon between nodes → same as clicking the connecting edge
- Edit ΔV on edge → overrides canonical value for that event instance
- Add custom node → new NodeMapState + edges computed to neighbors
- Mission path highlighted in vehicle color

**Sync with Band View:**
- Selecting event in Band View → Node Map highlights corresponding edge
- Creating event in Node Map → Band View scrolls to new event
- Editing orbital parameters → Node Map edge ΔV labels update live

### 8.5 Spaceport Panel
- Pad list with status indicators (● available, ● recycling, ○ in use)
- Countdown to next availability per pad
- Click pad → pad editor (recycle time, site key, name)

### 8.6 Summary Bar
```
[✓ CLOSES] [ΔV: 48,320 m/s] [LH2: 240t] [Crew: 180d] [Duration: 450d] [⚠ 2]
```

### 8.7 Export: CONOPS Diagram
"Export CONOPS" → clean SVG/PNG of Band View without interactive chrome.
Labeled events, ΔV callouts, vehicle color legend, mission title.
This is a communication artifact, not the working file.

---

## 9. Data Format

```json
{
  "formatVersion": 3,
  "type": "program",
  "name": "Lunar Gateway Assembly",
  "pads": [
    { "padId": "p1", "name": "LC-39A", "siteKey": "KSC", "recycleTime": 72 }
  ],
  "loadedVehicles": [
    { "refId": "v1", "fileName": "saturn_v.json", "definition": { ...immutable copy... } }
  ],
  "spacecraftDefinitions": [
    {
      "scId": "sc1", "name": "Apollo CSM + LM",
      "stages": [
        { "name": "LM Descent", "dry": 2200, "prop": 8200, "thrust": 45, "isp": 311,
          "crewCapacity": 0, "dockingPorts": 0, "isLandingTruss": false,
          "descentPropFraction": 0.95 },
        { "name": "LM Ascent", "dry": 2100, "prop": 2350, "thrust": 16, "isp": 311,
          "crewCapacity": 2, "dockingPorts": 1, "tunnelCapable": true },
        { "name": "Command Module", "dry": 5800, "prop": 0, "thrust": 0, "isp": 0,
          "crewCapacity": 3, "dockingPorts": 1, "tunnelCapable": true },
        { "name": "Service Module", "dry": 6100, "prop": 18400, "thrust": 97, "isp": 314,
          "crewCapacity": 0, "dockingPorts": 0 }
      ]
    }
  ],
  "events": [
    {
      "eventId": "e1", "type": "LAUNCH", "label": "Apollo 11",
      "vehicleRefId": "v1", "padId": "p1",
      "spacecraftId": "sc1",
      "keepUpperStage": true,
      "targetOrbit": { "body": "Earth", "apogee": 185, "perigee": 185,
                       "inclination": 28.5, "lan": 0 },
      "fromNode": "earth-surface", "toNode": "leo-185",
      "tStart": 0, "tEnd": 600
    }
  ],
  "nodeMapCustomNodes": [],
  "performanceCases": []
}
```

---

## 10. Implementation Order

### Phase 1 — Orbital state and ΔV engine
1. OrbitalState struct (body/apogee/perigee/inc/LAN/surface)
2. Extend ΔV functions to return OrbitalState
3. Plane change with LAN component
4. SOI transitions (TLI/LOI/TEI; TMI/MOI; TVI/VOI)
5. Lunar and Mars surface ascent models
6. NodeMapState struct + built-in node table

### Phase 2 — Propellant and boiloff
1. PROPELLANT_TYPES table
2. Tank struct + insulationFactor
3. Boiloff integration (runs during COAST only)
4. burnLog per stage for multi-burn tracking

### Phase 3 — FlightVehicle and event engine
1. FlightVehicle struct (UUID, ordered stage stack, OrbitalState, status)
2. Event envelope with fromNode/toNode
3. LAUNCH event (LAN window → tStart, ascent model, handoff choices)
4. BURN event (all types, mid-burn stage separation when tank empties)
5. SEPARATE event (creates two FlightVehicles, neither expended)
6. COAST event (clock advances, boiloff accrues)
7. EXPEND event (explicit user action)

### Phase 4 — Interaction and transfer events
1. DOCK event (precondition: matching OrbitalState; zero ΔV)
2. TRANSFER_PROPELLANT (instantaneous, same type only)
3. TRANSFER_CREW (TUNNEL and EVA subtypes; both zero ΔV and zero clock)
4. TRANSFER_STAGE (tug grab; zero ΔV)
5. LAND event (deorbit + landing burn, or aerocapture flag)
6. ASCENT_SURFACE (per-body model; LANDER_COMBINED prop split)
7. RECONFIGURE event (compound; reorders stack)

### Phase 5 — Pad and spaceport
1. Pad struct with recycle tracking
2. LAN alignment window calculator + heatmap display
3. Spaceport panel UI

### Phase 6 — Pork chop plotter
1. Lambert solver (universal variable method)
2. C3 grid for Earth–Mars and Earth–Venus
3. Pork chop canvas + click to select
4. Selected window drives COAST duration before TMI/TVI

### Phase 7 — Band View
1. Program page, four-panel layout
2. Body band rendering
3. Vehicle track and event node rendering
4. Log-zoom time axis + minimap scrubber
5. Right-click context menu (state-aware event insertion)
6. Event editor panel
7. Non-blocking warnings system

### Phase 8 — Node Map and sync
1. Node graph, three-zone layout
2. Built-in nodes + ΔV edge computation
3. Mission path highlighting
4. Edge click → BURN event creation → Band View sync
5. Band View selection → Node Map highlight (bidirectional)
6. Custom node addition
7. Live ΔV recalculation on mass change

### Phase 9 — Spacecraft payload editor
1. SpacecraftDefinition builder (ordered stage stack with 4 new fields)
2. Stage library integration (drag existing stages in, edit parameters)
3. Store SpacecraftDefinitions in program file
4. CONOPS diagram SVG export

### Phase 10 — Program file and polish
1. Program save/load (.program JSON format v3)
2. Summary closure bar
3. "Use in Program" button on LV Calculator (creates LAUNCH event in active program)

---

## 11. Design Principles for Future Implementers

**The LV Calculator is the rocket-building tool. The Program is the mission-planning tool.**
They share a file format for vehicles but are otherwise independent.

**Nothing is expended without the user saying so.**
Every separated stage is a resource. The simulation treats it as such until explicitly told otherwise.

**Same orbit = free dock. Different orbit = must burn first.**
The ΔV budget is about getting to the right place. Once there, assembly is free.

**The clock is a schedule tool, not a simulation tool.**
It tracks the things that make you wait. It doesn't simulate the things you do while waiting.

**Warnings, not blocks.**
A mission that doesn't close still runs to completion. Red numbers and the summary bar
tell the user how much it fails by. This drives design iteration.

---

## 12. Open Questions for Future Sessions

- **Aerobraking**: heatshield flag on spacecraft → LAND ΔV = 0 for aerocapture.
- **Electric propulsion**: high Isp / low thrust → spiral correction factor needed.
- **Crew consumables**: mass decreasing at fixed rate per crew per day during tracked COASTs.
- **Surface launch windows from Moon/Mars**: LAN alignment problem with body rotation.
- **Node Map ΔV for non-coplanar transfers**: should edge labels update based on
  actual vehicle inclination vs. canonical node inclination?
- **Multi-rev Lambert solutions**: sometimes cheaper for slow missions.
- **Staging trigger UI**: should triggers be defined on the vehicle definition
  (and carried into every program that uses it) or defined per-BURN event in
  the program? Vehicle-level is convenient; program-level is more flexible.
  Likely: vehicle carries default triggers, program can override per-event.
- **Partial BURN intermediate OrbitalState**: when a PARTIAL burn stops before
  the target orbit, the actual new OrbitalState must be computed precisely
  (intermediate ellipse, not the target). This propagates forward and must be
  handled correctly by all downstream event computations.

---

*End of specification v0.3*
