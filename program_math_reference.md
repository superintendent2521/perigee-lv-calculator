# Program Manager — Math Reference

All functions are in `lv_calc.html` in the `// PROGRAM MODULE` section.  
Units: km, km/s, m/s, kg, seconds, degrees — noted per function.

---

## Physical Constants

```
PROG_G0               = 9.80665 m/s²        (standard gravity)
PROG_SIDEREAL_DAY_S   = 86164.1 s           (Earth sidereal day)
PROG_MOON_ORBIT_R     = 384400 km           (Moon orbital radius from Earth centre)
PROG_MU_SUN           = 1.32712440018e11 km³/s²  (heliocentric)
PROG_PORK_MU          = same as PROG_MU_SUN (used in Lambert solver)
```

### Body Parameters  (`PROG_BODIES`)

| Body  | μ (km³/s²)    | R (km)  |
|-------|---------------|---------|
| Earth | 398600.4418   | 6371.0  |
| Moon  | 4902.800      | 1737.4  |
| Mars  | 42828.375     | 3389.5  |
| Venus | 324858.592    | 6051.8  |

### Heliocentric Radii  (`PROG_HELIO_R`, km)

| Body  | Mean orbital radius (km) |
|-------|--------------------------|
| Earth | 149 597 870.7            |
| Mars  | 227 939 200              |
| Venus | 108 208 930              |

### Propellant Boiloff Rates  (`PROG_PROPELLANT_TYPES`)

| Key       | Propellant       | rate/day  |
|-----------|------------------|-----------|
| LOX_LH2   | LOX/LH2          | 0.30 %    |
| LOX_RP1   | LOX/RP-1         | 0.02 %    |
| LOX_CH4   | LOX/Methane      | 0.10 %    |
| NTO_A50   | NTO/Aerozine-50  | 0 %       |
| NTO_UDMH  | NTO/UDMH         | 0 %       |
| SOLID     | Solid            | 0 %       |

---

## Orbital Mechanics — ΔV Budget

### `progVcirc(body, alt_km)` → km/s

Circular orbital speed at altitude via vis-viva:

```
v_circ = sqrt(μ / (R + alt))
```

### `progDvHohmann(body, alt1_km, alt2_km)` → `{ dv1_ms, dv2_ms, total_ms }` m/s

Hohmann transfer between two circular orbits.

```
r1 = R + alt1,  r2 = R + alt2
a  = (r1 + r2) / 2              (transfer ellipse semi-major axis)

v1 = sqrt(μ / r1)               (circular speed at departure)
v2 = sqrt(μ / r2)               (circular speed at arrival)
vp = sqrt(μ · (2/r1 − 1/a))    (speed at transfer periapsis)
va = sqrt(μ · (2/r2 − 1/a))    (speed at transfer apoapsis)

dv1 = |vp − v1| × 1000   m/s
dv2 = |v2 − va| × 1000   m/s
```

### `progDvPlaneChange(body, alt_km, delta_inc_deg)` → m/s

Simple plane change at a circular orbit:

```
dv = 2 · v_circ · sin(Δi / 2) × 1000   m/s
```

### `progDvCombined(body, alt_km, delta_inc_deg, dv_prop_ms)` → m/s

Simultaneous plane change + propulsive burn (vector addition):

```
dv_combined = sqrt(dv_plane² + dv_prop²)
```

### `progDvPlaneChangeFull(body, alt_km, i1, lan1, i2, lan2)` → m/s

Full 3-D plane change including both inclination and LAN difference.  
Uses spherical law of cosines to find the angle θ between the two orbit planes:

```
cos θ = cos(i1)·cos(i2) + sin(i1)·sin(i2)·cos(ΔLAN)
dv    = 2 · v_circ · sin(θ / 2) × 1000   m/s
```

Reduces to `progDvPlaneChange` when ΔLAN = 0.

### `progDvCircularizeAtApo(body, alt_peri_km, alt_apo_km)` → m/s

Circularization at apoapsis (e.g. GTO → GEO):

```
r_p = R + alt_peri,  r_a = R + alt_apo
a   = (r_p + r_a) / 2
v_a = sqrt(μ · (2/r_a − 1/a))   (apo speed on transfer ellipse)
v_c = sqrt(μ / r_a)              (circular speed at apo altitude)
dv  = |v_c − v_a| × 1000   m/s
```

---

## Cislunar Transfers

### `progDvTLI(leo_alt_km)` → m/s

Trans-Lunar Injection from LEO: Hohmann with apoapsis at Moon orbital radius.

```
r1      = R_Earth + leo_alt
r_moon  = 384400 km
a       = (r1 + r_moon) / 2
v_leo   = sqrt(μ_E / r1)
v_peri  = sqrt(μ_E · (2/r1 − 1/a))
dv_TLI  = |v_peri − v_leo| × 1000   m/s
```

### `progDvLOI(llo_alt_km, leo_alt_km)` → m/s

Lunar Orbit Insertion. Computes hyperbolic excess velocity at Moon SOI from the TLI ellipse, then the retro burn to capture into LLO:

```
a_tli  = (r_LEO + r_moon) / 2
v_moon = sqrt(μ_E / r_moon)     (Moon orbital speed)
v_apo  = sqrt(μ_E · (2/r_moon − 1/a_tli))
v_inf  = |v_moon − v_apo|       (km/s, hyperbolic excess at Moon SOI)

r_llo  = R_Moon + llo_alt
v_hyp  = sqrt(v_inf² + 2·μ_M / r_llo)   (hyperbolic speed at periapsis)
v_llo  = sqrt(μ_M / r_llo)              (circular LLO speed)
dv_LOI = |v_hyp − v_llo| × 1000   m/s
```

Note: Hohmann model gives ~822 m/s; real free-return trajectory gives ~900 m/s.

### `progDvTEI(llo_alt_km, leo_alt_km)` → m/s

Trans-Earth Injection. Treated as symmetric with LOI in this model:

```
dv_TEI = progDvLOI(llo_alt_km, leo_alt_km)
```

---

## Interplanetary Transfers  (Hohmann approximation)

All use Sun μ and circular mean orbital radii.

### `progDvTMI(leo_alt_km)` → m/s

Trans-Mars Injection from LEO:

```
a       = (r_Earth + r_Mars) / 2
v_E     = sqrt(μ_sun / r_Earth)        (Earth orbital speed)
v_dep   = sqrt(μ_sun · (2/r_Earth − 1/a))
v_inf   = v_dep − v_E                  (km/s, positive for outer planet)

r = R_Earth + leo_alt
dv = |sqrt(v_inf² + 2·μ_E / r) − sqrt(μ_E / r)| × 1000   m/s
```

### `progDvMOI(mco_alt_km)` → m/s

Mars Orbit Insertion. Same structure as LOI:

```
a       = (r_Earth + r_Mars) / 2
v_M_orb = sqrt(μ_sun / r_Mars)
v_apo   = sqrt(μ_sun · (2/r_Mars − 1/a))
v_inf   = |v_M_orb − v_apo|

r_mco = R_Mars + mco_alt
dv = |sqrt(v_inf² + 2·μ_M / r_mco) − sqrt(μ_M / r_mco)| × 1000   m/s
```

### `progDvTVI(leo_alt_km)` / `progDvVOI(vco_alt_km)` → m/s

Trans-Venus Injection and Venus Orbit Insertion. Same pattern as TMI/MOI using Venus orbital radius.  
Venus is an inner planet, so `v_inf = |v_E − v_apo_dep|` (Earth moves faster than the transfer apo).

---

## Ascent ΔV Estimates

### `progDvLunarAscent(llo_alt_km)` → m/s

Scales from a 1870 m/s baseline at LLO 100 km using orbital velocity ratio:

```
dv = 1870 · v_h / v_ref
v_ref = sqrt(μ_Moon / (R_Moon + 100))
v_h   = sqrt(μ_Moon / (R_Moon + llo_alt))
```

### `progDvMarsAscent(mco_alt_km)` → m/s

Same approach, baseline 3810 m/s at MCO 400 km:

```
dv = 3810 · v_h / v_ref
v_ref = sqrt(μ_Mars / (R_Mars + 400))
v_h   = sqrt(μ_Mars / (R_Mars + mco_alt))
```

---

## Propellant & Boiloff

### `progBoiloff(fill_kg, rate_per_day, delta_t_days, insulation_factor)` → kg

Exponential decay model for cryogenic propellant:

```
remaining = fill · exp(−rate_per_day · insulation_factor · delta_t_days)
```

`insulation_factor` defaults to 1.0 (baseline MLI). Lower = better insulation.

### `progApplyBoiloff(tank, delta_t_days)`

Applies boiloff to a Tank struct in-place. Uses the tank's `propellantType` to look up `boiloff_rate` from `PROG_PROPELLANT_TYPES`. Returns kg lost. Zero for non-cryo propellants.

### `progApplyStageBoiloff(liveStage, delta_t_days)` → total kg lost

Sums `progApplyBoiloff` across all tanks in a stage.

---

## Rocket Equation  (Tsiolkovsky)

### `progRocketEqDv(m_wet, m_prop_consumed, isp)` → m/s

```
dv = Isp · g₀ · ln(m_wet / (m_wet − m_prop))
```

### `progRocketEqPropNeeded(m_wet, dv_ms, isp)` → kg

Inverse of rocket equation:

```
m_prop = m_wet · (1 − exp(−dv / (Isp · g₀)))
```

---

## Pad & Launch Window

### `progPadAvailable(pad, t_plus_s)` → bool

Pad is available if `pad.lastLaunchTime` is null, or if the recycle period has elapsed:

```
available = (lastLaunchTime === null) || (t_plus_s − lastLaunchTime ≥ recycleTime_s)
```

### `progPadRecycleRemaining(pad, t_plus_s)` → seconds

```
remaining = max(0, recycleTime_s − (t_plus_s − lastLaunchTime))
```

### `progLanWindow(site_lng_deg, target_lan_deg, gast_deg)` → `{ asc_wait_s, desc_wait_s }`

Time to wait until the ascending or descending node window opens:

```
ω = 360 / sidereal_day_s     (°/s Earth rotation rate)
current_RAAN = (GAST + site_lng) mod 360
Δasc = (target_LAN − current_RAAN + 360) mod 360
asc_wait  = Δasc / ω
desc_wait = asc_wait + sidereal_day_s / 2    (mod sidereal_day if > 1 day)
```

### `progAzimuthForInclination(site_lat_deg, inc_deg)` → `{ prograde, retrograde }` or null

Launch azimuth from spherical geometry  (spec §7.1):

```
cos(i) = cos(φ) · sin(az)
sin(az) = cos(i) / cos(φ)
```

Returns two azimuths (prograde = NE, retrograde = SE). Returns null if `|cos(i)/cos(φ)| > 1` (inclination not achievable from this latitude).

---

## Lambert Solver  (Universal Variable Method)

Source: Curtis, H. (2013). *Orbital Mechanics for Engineering Students*, §5.3.

### Stumpff Functions

```
C(ψ) = (1 − cos √ψ) / ψ          for ψ > 0
     = (cosh √(−ψ) − 1) / (−ψ)   for ψ < 0
     = 0.5                         limit at ψ → 0

S(ψ) = (√ψ − sin √ψ) / (√ψ · ψ)         for ψ > 0
     = (sinh √(−ψ) − √(−ψ)) / (√(−ψ)·(−ψ))  for ψ < 0
     = 1/6                                  limit at ψ → 0
```

### `progLambert2D(r1v, r2v, tof_s, mu)` → `{ v1:[vx,vy], v2:[vx,vy] }` km/s or null

2-D heliocentric Lambert problem (prograde = CCW). Uses bisection on the universal variable ψ.

**Transfer angle:**
```
cos(Δν) = r̂₁ · r̂₂
Δν = (cz ≥ 0) ? arccos(...) : 2π − arccos(...)   (cz = cross product z-component)
```

**Iteration variable:**
```
A = sin(Δν) · sqrt(r1 · r2 / (1 − cos(Δν)))
```

**Bisection on ψ** (bounds: ψ ∈ [−4π², +4π²]):
```
y      = r1 + r2 + A·(ψ·S(ψ) − 1) / sqrt(C(ψ))
χ      = sqrt(y / C(ψ))
t_test = (χ³·S(ψ) + A·sqrt(y)) / sqrt(μ)
```

Bisect until `|t_test − tof| < 1e-6 · tof` (max 150 iterations).

**Recover velocities** (Lagrange f/g coefficients):
```
f     = 1 − y/r1
g     = A · sqrt(y/μ)
g_dot = 1 − y/r2
v1 = (r2 − f·r1) / g
v2 = (g_dot·r2 − r1) / g
```

---

## Pork Chop Grid (C3 Map)

### `progHelioPos(body, t_days)` → [x, y] km

Circular orbit model:

```
θ(t) = θ₀ + 2π · t / period
x = r · cos θ,  y = r · sin θ
```

### `progHelioVel(body, t_days)` → [vx, vy] km/s

```
v = 2π · r / (period_d · 86400)
vx = −v · sin θ,  vy = v · cos θ
```

### `progDepartureC3(dep_body, arr_body, dep_day, tof_day)` → km²/s²

Calls `progLambert2D`, then subtracts planet velocity from departure:

```
C3 = |v1 − v_Earth|²
```

Returns Infinity if Lambert fails or tof < 10 days.

### `progPorkchopGrid(dep_body, arr_body, opts)` → `{ grid, dep_days, tof_days, c3_min, ... }`

Evaluates `progDepartureC3` on a 2-D grid of (departure day, time of flight).  
Default grid: 130 departure × 80 TOF points, dep 0–800 d, TOF 120–540 d.  
Returns the full C3 grid and the location of the global minimum.

---

## Node Map ΔV Physics

### `_nmOrbitVAtR(body, orbit, r_km)` → km/s

Vis-viva speed at radial distance r from body centre:

```
circular:  v = sqrt(μ / r)
elliptic:  v = sqrt(μ · (2/r − 1/a))   where a = (R+perigee + R+apogee) / 2
```

### `_nmDvDepart(body, orbit, v_inf_kms)` → m/s

ΔV to depart from orbit onto a hyperbola with hyperbolic excess speed v∞ (burn at periapsis):

```
r  = R + perigee (or apogee)
v0 = _nmOrbitVAtR(body, orbit, r)
ve = sqrt(v∞² + 2·μ/r)
dv = |ve − v0| × 1000   m/s
```

### `progNmComputeEdgeDv(fromId, toId)` → `{ dv, note, method }` or null

Dispatcher. Resolves nodes from `PROG_NM_NODES` plus `PROG_ACTIVE_PROGRAM.nodeMapCustomNodes`, then calls `_nmDvPhysics`. If that returns null, tries the reverse direction (most transfers are symmetric).

### `_nmDvPhysics(nA, nB)` → `{ dv, note, method }` or null

Physics engine for node-to-node ΔV. Decision tree by orbit type:

| From → To | Model |
|---|---|
| surface → surface (same body) | 0 m/s (trivial) |
| surface → orbit (Earth) | 9400 m/s empirical (gravity + drag losses) |
| surface → orbit (Moon) | `progDvLunarAscent(h)` scaled model |
| surface → orbit (Mars) | `progDvMarsAscent(h)` scaled model |
| orbit → surface | same as ascent (symmetric for planning) |
| orbit → escape (C3 given) | vis-viva: `dv = \|sqrt(2μ/r + C3) − v0\|` |
| orbit → transit (TLI, TMI…) | vis-viva departure burn, C3 from transit node |
| orbit → orbit (same body, SMA diff) | `progDvHohmann` using mean SMA |
| TLC → Moon orbit/surface | `progDvLOI` (patched-conic) |
| Mars transit → Mars | `progDvMOI` / `progDvMarsAscent` |
| Venus transit → Venus | `progDvVOI` |

---

## Event Executors

All executors are called via `progDispatchEvent(program, event)` and return `{ result, ... }`.

### `progExecLaunch`

1. Resolves stages from event (LV stages + optional spacecraft stages via `progSpacecraftToLiveStages`).
2. Computes total wet mass (dry + all tank fills).
3. If `targetOrbit` given: uses rocket equation to compute prop consumed per stage to reach orbit ΔV budget:
   ```
   For each stage bottom→top:
     dv_stage = progRocketEqDv(m_wet, prop_available, isp)
     If dv_stage ≥ dv_remaining: consume only what's needed, separate remaining stages
     Else: expend stage fully, advance dv_remaining
   ```
4. Creates `FlightVehicle` at `targetOrbit`.

### `progExecBurn`

Applies a ΔV burn to the topmost ACTIVE stage in the vehicle:

```
m_prop = progRocketEqPropNeeded(m_wet, dvTarget, isp)
Drains prop from topmost stage's tanks
Records burn in stage.burnLog
Updates vehicle's orbitState
```

### `progExecCoast`

Advances mission clock. Applies boiloff to ALL active stages via `progApplyStageBoiloff`. Duration = `tEnd − tStart` seconds.

### `progExecSeparate`

Removes a stage from a vehicle. The separated stage becomes an independent `FlightVehicle` if `createVehicle = true`.

### `progExecDock`

Merges two vehicles. Transfers all stages from source vehicle into target vehicle's stage stack.  
Validates orbital match via `progOrbitalStateMatch`.

### `progExecTransferPropellant`

Moves `amount_kg` of propellant from one stage to another. Respects tank capacity limits.

### `progExecTransferCrew`

Updates `crewAboard` counts for two stages. Source count decreases; destination count increases.

### `progExecTransferStage`

Moves a stage from one vehicle to another (e.g. module handoff at a space station).

### `progExecLand`

Sets vehicle orbitState to `surface`. Marks stage as `LANDED`.

### `progExecAscentSurface`

Ascent from a planetary surface:

1. Determines ascent ΔV via `progDvLunarAscent` / `progDvMarsAscent` / 9400 m/s (Earth).
2. Applies rocket equation to consume propellant stage-by-stage.
3. Updates orbitState to target orbit.

### `progExecExpend`

Marks a stage as `EXPENDED`. No mass/prop changes.

### `progExecReconfigure`

Updates metadata on a stage (name, crew capacity, docking ports, etc.) without a propellant burn.

---

## Vehicle Definition → Live Stages

### `progVehicleDefToLiveStages(vdef)` → `LiveStage[]`

Converts an LV Calculator `.json` stage array to LiveStages.  
Propellant type is inferred from Isp:

```
Isp > 400  → LOX_LH2
Isp > 310  → LOX_CH4 (Methane)
else       → LOX_RP1
```

### `progSpacecraftToLiveStages(scd)` → `LiveStage[]`

Converts a `SpacecraftDefinition` (serializable blueprint) to live stages.  
Each `SpacecraftStageDef` with `propKg > 0` gets one tank of `propType`.  
Extended fields (`crewCapacity`, `dockingPorts`, `tunnelCapable`, etc.) are propagated to the live stage.

---

## Utility Functions

### `progFmtT(seconds)` → string

Formats T+ elapsed time:

```
d > 0 → "T+Nd Nh"
h > 0 → "T+Nh Nm"
m > 0 → "T+Nm"
else  → "T+Ns"
```

### `_progFmtCountdown(seconds)` → string

Short countdown format: `"Xh Ym"` or `"Ym"`.

### `progUUID()` → string

Generates a random UUID v4 via `crypto.randomUUID()` with fallback to `Math.random()` hex string.

### `progOrbitalStateMatch(a, b)` → bool

Two OrbitalStates are considered matching (dock-compatible) when:

```
same body AND
|Δapogee|     < 1 km AND
|Δperigee|    < 1 km AND
|Δinclination| < 0.1° AND
|ΔLAN|         < 1°
```
