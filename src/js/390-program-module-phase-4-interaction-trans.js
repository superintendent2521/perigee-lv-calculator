
// ─── PROGRAM MODULE — Phase 4: Interaction & Transfer Events ─────────────────
//
// DOCK, TRANSFER_PROPELLANT, TRANSFER_CREW, TRANSFER_STAGE, LAND,
// ASCENT_SURFACE, RECONFIGURE.
//
// Key rule: LAND is zero ΔV / zero prop (Rule 5). Powered descent prop is
// consumed by preceding BURN events. ASCENT_SURFACE DOES consume prop (not
// in Rule 5's exclusion list).

/** DOCK: merge two FlightVehicles that share the same OrbitalState (Rule 3).
 *  event.vehicleIds     = [id1, id2]
 *  event.bottomVehicleId = which vehicle's stages form the lower portion (default: vehicleIds[0])
 *
 *  Both source vehicles are removed from program.vehicles.
 *  A new merged FlightVehicle is created and added.
 */
function progExecDock(program, event) {
  const [idA, idB] = event.vehicleIds ?? [];
  const fvA = program.vehicles[idA];
  const fvB = program.vehicles[idB];
  if (!fvA || !fvB) {
    event.result = 'FAILED'; event.warnings = ['One or both vehicles not found'];
    return { result: 'FAILED' };
  }
  if (!progOrbitalStateMatch(fvA.orbitState, fvB.orbitState)) {
    event.result = 'FAILED';
    event.warnings = ['\u26a0 Orbital states do not match — burn to match first'];
    return { result: 'FAILED' };
  }

  // Bottom vehicle goes at stages[0..], other goes on top
  const bottomId = event.bottomVehicleId ?? idA;
  const [bot, top] = bottomId === idA ? [fvA, fvB] : [fvB, fvA];
  const mergedStages = [...bot.stages, ...top.stages];

  const merged = progMakeFlightVehicle(bot.name + '+' + top.name, mergedStages, bot.orbitState, bot.color);
  merged.status = bot.status;

  // Info note if no tunnel-capable port between the docking faces
  const warns = [];
  const botTop  = bot.stages[bot.stages.length - 1];
  const topBot  = top.stages[0];
  if (botTop && !botTop.tunnelCapable && topBot && !topBot.tunnelCapable) {
    warns.push('// No tunnel-capable port at docking face — EVA required for crew transfer');
  }

  delete program.vehicles[idA];
  delete program.vehicles[idB];
  program.vehicles[merged.vehicleId] = merged;

  event.vehicleId = merged.vehicleId;
  event.result = 'SUCCESS'; event.warnings = warns;
  return { result: 'SUCCESS', vehicleId: merged.vehicleId };
}

/** TRANSFER_PROPELLANT: move propellant between stages of the same (merged) vehicle.
 *  Same propellant type only. Zero ΔV, zero clock (Rule 4).
 *  event.vehicleId
 *  event.sourceStageId    stageDefinitionId of source
 *  event.destStageId      stageDefinitionId of dest
 *  event.propellantType
 *  event.mass_kg
 */
function progExecTransferPropellant(program, event) {
  const fv = program.vehicles[event.vehicleId];
  if (!fv) { event.result = 'FAILED'; event.warnings = ['Vehicle not found']; return { result: 'FAILED' }; }

  const src = fv.stages.find(s => s.stageDefinitionId === event.sourceStageId);
  const dst = fv.stages.find(s => s.stageDefinitionId === event.destStageId);
  if (!src || !dst) { event.result = 'FAILED'; event.warnings = ['Stage not found']; return { result: 'FAILED' }; }

  const pt = event.propellantType;
  let to_take = event.mass_kg ?? 0;

  // Drain from source tanks of matching type
  for (const tank of src.tanks) {
    if (tank.propellantType !== pt) continue;
    const drain = Math.min(tank.fill, to_take);
    tank.fill -= drain; to_take -= drain;
    if (to_take <= 0) break;
  }
  const transferred = (event.mass_kg ?? 0) - to_take;

  // Fill into dest tanks of matching type
  let to_fill = transferred;
  for (const tank of dst.tanks) {
    if (tank.propellantType !== pt) continue;
    const space = tank.capacity - tank.fill;
    const fill  = Math.min(space, to_fill);
    tank.fill += fill; to_fill -= fill;
    if (to_fill <= 0) break;
  }

  const warns = [];
  if (to_take > 0) warns.push('\u26a0 Source had less prop than requested: short ' + Math.round(to_take) + ' kg');
  if (to_fill > 0) warns.push('\u26a0 Dest tanks full, ' + Math.round(to_fill) + ' kg could not be received');

  event.result = 'SUCCESS'; event.warnings = warns;
  return { result: 'SUCCESS', transferred_kg: transferred };
}

/** TRANSFER_CREW: move crew between stages of the same (or same-orbit) vehicle.
 *  event.vehicleId
 *  event.sourceStageId   stageDefinitionId
 *  event.destStageId     stageDefinitionId
 *  event.count
 *  event.subtype         'TUNNEL' | 'EVA'  (recorded for fidelity; no cost difference)
 */
function progExecTransferCrew(program, event) {
  const fv = program.vehicles[event.vehicleId];
  if (!fv) { event.result = 'FAILED'; event.warnings = ['Vehicle not found']; return { result: 'FAILED' }; }

  const src = fv.stages.find(s => s.stageDefinitionId === event.sourceStageId);
  const dst = fv.stages.find(s => s.stageDefinitionId === event.destStageId);
  if (!src || !dst) { event.result = 'FAILED'; event.warnings = ['Stage not found']; return { result: 'FAILED' }; }

  const move   = Math.min(src.crewAboard, event.count ?? 0);
  src.crewAboard -= move;
  dst.crewAboard += move;

  const warns = [];
  if (move < (event.count ?? 0)) warns.push('\u26a0 Only ' + move + ' crew available to transfer');

  event.result = 'SUCCESS'; event.warnings = warns;
  return { result: 'SUCCESS', transferred: move };
}

/** TRANSFER_STAGE: tug takes a stage from one vehicle and adds it to another.
 *  Both vehicles must be in the same orbit (post-dock context).
 *  The stage is removed from source and appended to the top of dest's stack.
 *  event.sourceVehicleId
 *  event.destVehicleId
 *  event.stageDefinitionId
 */
function progExecTransferStage(program, event) {
  const src = program.vehicles[event.sourceVehicleId];
  const dst = program.vehicles[event.destVehicleId];
  if (!src || !dst) { event.result = 'FAILED'; event.warnings = ['Vehicle not found']; return { result: 'FAILED' }; }

  const idx = src.stages.findIndex(s => s.stageDefinitionId === event.stageDefinitionId);
  if (idx < 0) { event.result = 'FAILED'; event.warnings = ['Stage not found in source']; return { result: 'FAILED' }; }

  const [stage] = src.stages.splice(idx, 1);
  dst.stages.push(stage);

  event.result = 'SUCCESS'; event.warnings = [];
  return { result: 'SUCCESS' };
}

/** LAND: set vehicle status to LANDED and orbitState to surface.
 *  Zero ΔV, zero propellant consumed (Rule 5).
 *  Powered descent propellant was consumed by preceding BURN events.
 *  event.vehicleId
 *  event.body              body name to land on (falls back to current orbitState.body)
 *  event.aerocapture       boolean — informational flag (no physics difference in Phase 4)
 */
function progExecLand(program, event) {
  const fv = program.vehicles[event.vehicleId];
  if (!fv) { event.result = 'FAILED'; event.warnings = ['Vehicle not found']; return { result: 'FAILED' }; }

  const body = event.body ?? fv.orbitState?.body ?? 'Moon';
  fv.status    = 'LANDED';
  fv.orbitState = progMakeSurfaceState(body);

  const warns = [];
  if (event.aerocapture) warns.push('// Aerocapture — no propellant consumed');

  event.deltaV   = 0;
  event.result   = 'SUCCESS'; event.warnings = warns;
  return { result: 'SUCCESS' };
}

/** ASCENT_SURFACE: ascend from a body surface to a target orbit.
 *  Computes ΔV from body model (progDvLunarAscent / progDvMarsAscent).
 *  Consumes propellant via rocket equation from the firing stage.
 *  event.vehicleId
 *  event.body                body name (falls back to current orbitState.body)
 *  event.targetOrbit         { alt_km, inc_deg, lan_deg }
 *  event.firingStageId       stageDefinitionId of firing stage (default: bottom)
 *  event.dv_override_ms      override body model ΔV (for Venus or custom bodies)
 */
function progExecAscentSurface(program, event) {
  const fv = program.vehicles[event.vehicleId];
  if (!fv || fv.status !== 'LANDED') {
    event.result = 'FAILED'; event.warnings = ['Vehicle not found or not LANDED'];
    return { result: 'FAILED' };
  }

  const body   = event.body ?? fv.orbitState?.body ?? 'Moon';
  const target = event.targetOrbit ?? {};
  const alt    = target.alt_km ?? 100;

  // Determine ascent ΔV from body model
  let dv_target;
  if (event.dv_override_ms != null) {
    dv_target = event.dv_override_ms;
  } else if (body === 'Moon') {
    dv_target = progDvLunarAscent(alt);
  } else if (body === 'Mars') {
    dv_target = progDvMarsAscent(alt);
  } else {
    event.result = 'FAILED'; event.warnings = ['No ascent model for body: ' + body + ' — use dv_override_ms'];
    return { result: 'FAILED' };
  }

  // Fire the specified stage (default: bottom)
  const stageIdx = event.firingStageId
    ? fv.stages.findIndex(s => s.stageDefinitionId === event.firingStageId)
    : 0;
  if (stageIdx < 0) { event.result = 'FAILED'; event.warnings = ['Firing stage not found']; return { result: 'FAILED' }; }

  const fs         = fv.stages[stageIdx];
  const isp        = fs.isp ?? 0;
  const m_wet      = progVehicleTotalMass(fv);
  const prop_avail = progStageRemainingProp(fs);
  const prop_need  = progRocketEqPropNeeded(m_wet, dv_target, isp);

  let dv_actual, result;
  const warns = [];
  if (prop_need > prop_avail) {
    dv_actual = progRocketEqDv(m_wet, prop_avail, isp);
    result    = 'MARGINAL';
    warns.push('\u26a0 Insufficient prop: delivered ' + Math.round(dv_actual) + ' m/s vs ' + Math.round(dv_target) + ' m/s target');
    progBurnPropellant(fs, prop_avail);
  } else {
    dv_actual = dv_target;
    result    = 'SUCCESS';
    progBurnPropellant(fs, prop_need);
  }

  progRecordBurn(fs, event.eventId, dv_actual, Math.min(prop_need, prop_avail), event.tStart ?? 0, event.tEnd ?? 0);

  fv.status    = 'ORBIT';
  fv.orbitState = progMakeOrbitalState(body, alt, target.inc_deg ?? 0, target.lan_deg ?? 0);

  event.deltaV = dv_actual; event.result = result; event.warnings = warns;
  return { result, dv_actual, prop_consumed: Math.min(prop_need, prop_avail) };
}

/** RECONFIGURE: the ONLY event that can reorder the stage stack.
 *  Internally: SEPARATE → RCS BURN → DOCK (not modeled separately here).
 *  event.vehicleId
 *  event.newStageOrder   array of stageDefinitionIds in desired order (same set, reordered)
 *  event.rcs_dv_ms       RCS ΔV for transposition (default 10 m/s, e.g. Apollo LM extraction)
 */
function progExecReconfigure(program, event) {
  const fv = program.vehicles[event.vehicleId];
  if (!fv) { event.result = 'FAILED'; event.warnings = ['Vehicle not found']; return { result: 'FAILED' }; }

  const order = event.newStageOrder ?? [];
  if (order.length !== fv.stages.length) {
    event.result = 'FAILED'; event.warnings = ['newStageOrder length must match current stage count'];
    return { result: 'FAILED' };
  }

  const reordered = order.map(id => fv.stages.find(s => s.stageDefinitionId === id));
  if (reordered.some(s => !s)) {
    event.result = 'FAILED'; event.warnings = ['Unknown stageDefinitionId in newStageOrder'];
    return { result: 'FAILED' };
  }

  fv.stages = reordered;
  event.deltaV   = event.rcs_dv_ms ?? 10;
  event.result   = 'SUCCESS'; event.warnings = [];
  return { result: 'SUCCESS' };
}

// ── Phase 4 self-tests ────────────────────────────────────────────────────────
const PROG_P4_TEST_RESULTS = (() => { try {
  // Helper: build a fresh program with one vehicle
  function mkProg(stagesA, orbitA) {
    const p  = progMakeProgram('p4-test');
    const fv = progMakeFlightVehicle('FV', stagesA, orbitA, null);
    fv.status = 'ORBIT';
    p.vehicles[fv.vehicleId] = fv;
    return { p, fv };
  }
  const LEO = progMakeOrbitalState('Earth', 185, 28.5, 0);
  const GEO = progMakeOrbitalState('Earth', 35786, 0, 0);

  // T1: DOCK merges stage stacks
  const pDock = progMakeProgram('dock-test');
  const fvA = progMakeFlightVehicle('A', [progMakeLiveStage('A1',[],0,1000,0), progMakeLiveStage('A2',[],0,500,0)], LEO, null);
  const fvB = progMakeFlightVehicle('B', [progMakeLiveStage('B1',[],0,800,0)],  LEO, null);
  fvA.status = fvB.status = 'ORBIT';
  pDock.vehicles[fvA.vehicleId] = fvA; pDock.vehicles[fvB.vehicleId] = fvB;
  const dockEv = progMakeEvent('DOCK', { vehicleIds:[fvA.vehicleId, fvB.vehicleId], bottomVehicleId: fvA.vehicleId });
  const dockRes = progDispatchEvent(pDock, dockEv);
  const mergedFV = pDock.vehicles[dockEv.vehicleId];

  // T2: DOCK fails on orbit mismatch
  const pDock2 = progMakeProgram('dock-fail');
  const fvC = progMakeFlightVehicle('C', [], LEO, null); fvC.status='ORBIT';
  const fvD = progMakeFlightVehicle('D', [], GEO, null); fvD.status='ORBIT';
  pDock2.vehicles[fvC.vehicleId]=fvC; pDock2.vehicles[fvD.vehicleId]=fvD;
  const dockFail = progDispatchEvent(pDock2, progMakeEvent('DOCK',{vehicleIds:[fvC.vehicleId,fvD.vehicleId]}));

  // T3: TRANSFER_PROPELLANT
  const pTP = progMakeProgram('tp-test');
  const tpFV = progMakeFlightVehicle('TP', [
    progMakeLiveStage('SRC', [progMakeTank('LOX_LH2', 50000)], 0, 1000, 421),
    progMakeLiveStage('DST', [progMakeTank('LOX_LH2', 30000)], 0, 500,  421),
  ], LEO, null);
  tpFV.stages[1].tanks[0].fill = 5000; // partial fill on dest
  tpFV.status = 'ORBIT';
  pTP.vehicles[tpFV.vehicleId] = tpFV;
  progDispatchEvent(pTP, progMakeEvent('TRANSFER_PROPELLANT', {
    vehicleId: tpFV.vehicleId, sourceStageId:'SRC', destStageId:'DST',
    propellantType:'LOX_LH2', mass_kg: 10000,
  }));

  // T4: TRANSFER_CREW
  const pTC = progMakeProgram('tc-test');
  const tcFV = progMakeFlightVehicle('TC', [
    progMakeLiveStage('LMascent', [], 2, 2100, 311),  // 2 crew
    progMakeLiveStage('CM',       [], 0, 5800, 0),    // 0 crew
  ], LEO, null);
  tcFV.status = 'ORBIT';
  pTC.vehicles[tcFV.vehicleId] = tcFV;
  progDispatchEvent(pTC, progMakeEvent('TRANSFER_CREW', {
    vehicleId: tcFV.vehicleId, sourceStageId:'LMascent', destStageId:'CM',
    count: 2, subtype: 'TUNNEL',
  }));

  // T5: TRANSFER_STAGE (between two separate vehicles)
  const pTS = progMakeProgram('ts-test');
  const tsSrc = progMakeFlightVehicle('Src', [progMakeLiveStage('TugPayload',[],0,5000,0), progMakeLiveStage('Depot',[],0,10000,0)], LEO, null);
  const tsDst = progMakeFlightVehicle('Tug', [progMakeLiveStage('TugEngine',[],0,2000,445)], LEO, null);
  tsSrc.status = tsDst.status = 'ORBIT';
  pTS.vehicles[tsSrc.vehicleId]=tsSrc; pTS.vehicles[tsDst.vehicleId]=tsDst;
  progDispatchEvent(pTS, progMakeEvent('TRANSFER_STAGE', {
    sourceVehicleId: tsSrc.vehicleId, destVehicleId: tsDst.vehicleId, stageDefinitionId: 'Depot',
  }));

  // T6: LAND — status LANDED, surface orbitState
  const pLand = progMakeProgram('land-test');
  const landFV = progMakeFlightVehicle('LM', [progMakeLiveStage('LMdescent',[],0,2200,311)], progMakeOrbitalState('Moon',100,0,0), null);
  landFV.status = 'ORBIT';
  pLand.vehicles[landFV.vehicleId] = landFV;
  progDispatchEvent(pLand, progMakeEvent('LAND', { vehicleId: landFV.vehicleId, body:'Moon' }));

  // T7: ASCENT_SURFACE — Moon, dv≈1870, status ORBIT
  const pAsc = progMakeProgram('asc-test');
  const ascFV = progMakeFlightVehicle('LM-asc', [progMakeLiveStage('LMasc',[progMakeTank('NTO_A50',2350)],0,2100,311)], progMakeSurfaceState('Moon'), null);
  ascFV.status = 'LANDED';
  pAsc.vehicles[ascFV.vehicleId] = ascFV;
  const ascEv = progMakeEvent('ASCENT_SURFACE', { vehicleId: ascFV.vehicleId, body:'Moon', targetOrbit:{ alt_km:100, inc_deg:0, lan_deg:0 } });
  progDispatchEvent(pAsc, ascEv);

  // T8: RECONFIGURE reorders stack
  const pRc = progMakeProgram('rc-test');
  const rcFV = progMakeFlightVehicle('CSM-LM', [
    progMakeLiveStage('S-IVB',  [], 0, 13300, 421),
    progMakeLiveStage('CSM',    [], 0, 28800, 314),
    progMakeLiveStage('LM',     [], 0, 15000, 311),
  ], LEO, null);
  rcFV.status = 'ORBIT';
  pRc.vehicles[rcFV.vehicleId] = rcFV;
  progDispatchEvent(pRc, progMakeEvent('RECONFIGURE', {
    vehicleId: rcFV.vehicleId, newStageOrder: ['S-IVB', 'LM', 'CSM'],
  }));

  const T = [
    { label:'DOCK merges 2+1 stages',    val: mergedFV ? mergedFV.stages.length : -1,  target: 3,    tol: 0 },
    { label:'DOCK result SUCCESS',        val: dockRes.result==='SUCCESS'?1:0,            target: 1,    tol: 0 },
    { label:'DOCK fail on mismatch',      val: dockFail.result==='FAILED'?1:0,            target: 1,    tol: 0 },
    { label:'XFER PROP source -10000',    val: tpFV.stages[0].tanks[0].fill,              target:40000, tol: 0 },
    { label:'XFER PROP dest +10000',      val: tpFV.stages[1].tanks[0].fill,              target:15000, tol: 0 },
    { label:'XFER CREW moved 2',          val: tcFV.stages[1].crewAboard,                 target: 2,    tol: 0 },
    { label:'XFER STAGE src shrinks',     val: tsSrc.stages.length,                       target: 1,    tol: 0 },
    { label:'XFER STAGE dst grows',       val: tsDst.stages.length,                       target: 2,    tol: 0 },
    { label:'LAND status LANDED',         val: landFV.status==='LANDED'?1:0,              target: 1,    tol: 0 },
    { label:'LAND surface true',          val: landFV.orbitState.surface?1:0,             target: 1,    tol: 0 },
    { label:'ASCENT status ORBIT',        val: ascFV.status==='ORBIT'?1:0,               target: 1,    tol: 0 },
    { label:'ASCENT dv 1870',             val: Math.round(ascEv.deltaV),                  target: 1870, tol: 5 },
    { label:'RECONFIG stage[1] is LM',    val: rcFV.stages[1].stageDefinitionId==='LM'?1:0, target:1,  tol: 0 },
  ];
  return T.map(t => {
    const pass = Math.abs(t.val - t.target) <= t.tol;
    return { label: t.label, val: t.val, target: t.target, pass };
  });
} catch(e){console.error('Test IIFE error:',e);return[];} })();
