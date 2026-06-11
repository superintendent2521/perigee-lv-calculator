
// ─── PROGRAM MODULE — Phase 2: Propellant & Boiloff ────────────────────────────
//
// Structs: Tank, LiveStage.
// Boiloff runs only during COAST events (Rule 4); not during burns, docking, or assembly.

// ── Tank ─────────────────────────────────────────────────────────────────────

/**
 * Create a Tank. Starts full (fill === capacity).
 * @param {string}  propellantType   - key into PROG_PROPELLANT_TYPES
 * @param {number}  capacity_kg      - maximum propellant mass, kg
 * @param {number}  [insulationFactor=1.0] - 1.0 = baseline MLI, <1.0 = better
 */
function progMakeTank(propellantType, capacity_kg, insulationFactor) {
  return {
    propellantType,
    capacity:         capacity_kg,
    fill:             capacity_kg,      // kg remaining
    insulationFactor: insulationFactor ?? 1.0,
  };
}

/**
 * Apply boiloff to a Tank for one COAST period. Mutates tank.fill.
 * Returns kg lost. Zero for non-cryo propellants.
 */
function progApplyBoiloff(tank, delta_t_days) {
  const pt = PROG_PROPELLANT_TYPES[tank.propellantType];
  if (!pt || pt.boiloff_rate === 0) return 0;
  const remaining = progBoiloff(tank.fill, pt.boiloff_rate, delta_t_days, tank.insulationFactor);
  const lost      = tank.fill - remaining;
  tank.fill       = remaining;
  return lost;
}

/**
 * Apply boiloff to all cryo tanks in a LiveStage for one COAST period.
 * Returns total kg lost across all tanks.
 */
function progApplyStageBoiloff(liveStage, delta_t_days) {
  return liveStage.tanks.reduce((sum, t) => sum + progApplyBoiloff(t, delta_t_days), 0);
}

// ── LiveStage ─────────────────────────────────────────────────────────────

/**
 * Create a live stage instance.
 * @param {string}   stageDefinitionId - ID from the stage library or vehicle JSON
 * @param {Tank[]}   tanks             - array of Tank objects for this stage
 * @param {number}   [crewAboard=0]
 */
function progMakeLiveStage(stageDefinitionId, tanks, crewAboard, dry_mass, isp) {
  return {
    stageDefinitionId,
    dry_mass:   dry_mass  ?? 0,        // kg — structural + engine dry mass
    isp:        isp       ?? 0,        // s  — vacuum Isp; set from stage def at load time
    tanks:      tanks ?? [],
    burnLog:    [],                    // BurnEntry[] appended by progRecordBurn
    status:     'ACTIVE',              // 'ACTIVE' | 'EXPENDED' | 'SEPARATED'
    crewAboard: crewAboard ?? 0,
  };
}

/**
 * Record a completed BURN event on a stage. Appends to burnLog.
 * @param {object} liveStage
 * @param {string} eventId        - event UUID from the timeline
 * @param {number} dvActual_ms    - ΔV actually delivered, m/s
 * @param {number} propUsed_kg    - propellant consumed, kg
 * @param {number} [t_start=0]   - mission clock, seconds
 * @param {number} [t_end=0]     - mission clock, seconds
 */
function progRecordBurn(liveStage, eventId, dvActual_ms, propUsed_kg, t_start, t_end) {
  liveStage.burnLog.push({
    eventId,
    dvActual_ms,
    propUsed_kg,
    t_start: t_start ?? 0,
    t_end:   t_end   ?? 0,
  });
}

/**
 * Drain propUsed_kg from the stage's tanks in order.
 * Returns kg actually drained (may be less if tanks run dry).
 * Note: Phase 3 will handle mixture ratios and mid-burn separation.
 */
function progBurnPropellant(liveStage, propUsed_kg) {
  let remaining = propUsed_kg;
  for (const tank of liveStage.tanks) {
    if (remaining <= 0) break;
    const drain = Math.min(tank.fill, remaining);
    tank.fill  -= drain;
    remaining  -= drain;
  }
  return propUsed_kg - remaining;
}

/** Total propellant remaining across all tanks in a stage, kg. */
function progStageRemainingProp(liveStage) {
  return liveStage.tanks.reduce((sum, t) => sum + t.fill, 0);
}

/** Total propellant capacity of a stage, kg (sum of all tank capacities). */
function progStageTotalCapacity(liveStage) {
  return liveStage.tanks.reduce((sum, t) => sum + t.capacity, 0);
}

/** Propellant load fraction for a stage (0 = empty, 1 = full). */
function progStageFillFraction(liveStage) {
  const cap = progStageTotalCapacity(liveStage);
  return cap > 0 ? progStageRemainingProp(liveStage) / cap : 0;
}

// ── Phase 2 self-tests ────────────────────────────────────────────────────────
const PROG_P2_TEST_RESULTS = (() => { try {
  // T1: Tank starts full
  const tk1 = progMakeTank('LOX_LH2', 50000, 1.0);

  // T2/T3: Boiloff on cryo tank
  const tk2      = progMakeTank('LOX_LH2', 100000, 1.0);
  const lh2_lost = progApplyBoiloff(tk2, 30);   // mutates tk2.fill

  // T4: Non-cryo tank unchanged
  const tk3      = progMakeTank('NTO_UDMH', 50000, 1.0);
  const nto_lost = progApplyBoiloff(tk3, 30);

  // T5: LOX_RP1 partial cryo (spec rate: 0.0002/day)
  const tk4 = progMakeTank('LOX_RP1', 50000, 1.0);
  progApplyBoiloff(tk4, 10);

  // T6/T7: burnLog tracking
  const stg1      = progMakeLiveStage('J-2', [progMakeTank('LOX_LH2', 75000, 1.0)], 0);
  const pre_burns = stg1.burnLog.length;        // 0, captured before
  progRecordBurn(stg1, 'e1', 3136, 15000, 0, 360);
  progRecordBurn(stg1, 'e2',  822,  4500, 7200, 7560);
  const post_burns = stg1.burnLog.length;       // 2, captured after

  // T8: BurnPropellant drains tank
  const stg2 = progMakeLiveStage('RL10', [progMakeTank('LOX_LH2', 10000, 1.0)]);
  progBurnPropellant(stg2, 3000);

  // T9: StageRemainingProp sums tanks
  const stg3 = progMakeLiveStage('AJ10', [
    progMakeTank('NTO_A50', 7000, 1.0),
    progMakeTank('NTO_A50', 5000, 1.0),
  ]);

  const T = [
    { label:'Tank fill init',         val: tk1.fill,                        target: 50000, tol: 0 },
    { label:'LH2 30d boiloff lost',   val: Math.round(lh2_lost),            target: 8607,  tol: 5 },
    { label:'LH2 30d fill remain',    val: Math.round(tk2.fill),            target: 91393, tol: 5 },
    { label:'NTO no boiloff',         val: nto_lost,                        target: 0,     tol: 0 },
    { label:'LOX-RP1 10d fill',       val: Math.round(tk4.fill),            target: 49900, tol: 2 },
    { label:'BurnLog pre-burn len',   val: pre_burns,                       target: 0,     tol: 0 },
    { label:'BurnLog post-2-burns',   val: post_burns,                      target: 2,     tol: 0 },
    { label:'BurnProp drain',         val: stg2.tanks[0].fill,              target: 7000,  tol: 0 },
    { label:'RemainingProp sum',      val: progStageRemainingProp(stg3),    target: 12000, tol: 0 },
  ];
  return T.map(t => {
    const pass = Math.abs(t.val - t.target) <= t.tol;
    return { label: t.label, val: t.val, target: t.target, pass };
  });
} catch(e){console.error('Test IIFE error:',e);return[];} })();
