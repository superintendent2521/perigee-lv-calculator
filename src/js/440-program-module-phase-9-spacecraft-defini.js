
// ─── PROGRAM MODULE — Phase 9: Spacecraft Definition Editor ─────────────────
//
// SpacecraftDefinition: a named, ordered stage stack stored in the program.
// LAUNCH events may reference a spacecraftId; the spacecraft's stages are
// appended on top of (i.e. above) the launch vehicle upper stage.
//
// stage stack convention (same as Phase 2/3): stages[0]=bottom, stages[last]=top.
// A spacecraft typically sits above the LV upper stage, so spacecraft stages are
// appended AFTER the LV stages in the array.

// ── Structs ───────────────────────────────────────────────────────────────────

/**
 * A single stage blueprint inside a SpacecraftDefinition.
 * These are serializable (no live propellant state). Convert via progSpacecraftToLiveStages.
 */
function progMakeSpacecraftStageDef(name) {
  return {
    stageId:             progUUID(),
    name:                name ?? 'Stage',
    dry_mass:            500,        // kg
    isp:                 320,        // s, vacuum Isp
    propKg:              0,          // propellant capacity kg
    propType:            'MMH/NTO',  // propellant type key
    // Spec §3.4 extended fields
    crewCapacity:        0,          // number of crew seats
    dockingPorts:        0,          // number of docking ports
    tunnelCapable:       false,      // pressurised tunnel to adjacent stage
    isLandingTruss:      false,      // structural-only; auto-candidate for surface separation (spec §3.4)
    descentPropFraction: 0,          // fraction of propKg reserved for powered descent (0–1)
  };
}

function progMakeSpacecraftDefinition(name) {
  return {
    spacecraftId: progUUID(),
    name:         name ?? 'Spacecraft',
    stages:       [],  // SpacecraftStageDef[], bottom → top
  };
}

/**
 * Convert a SpacecraftDefinition to LiveStages[] for inclusion in a LAUNCH event.
 * Returns stages ordered bottom → top, matching the stage stack convention.
 */
function progSpacecraftToLiveStages(scd) {
  return scd.stages.map(def => {
    const tanks = def.propKg > 0
      ? [progMakeTank(def.propType || 'MMH/NTO', def.propKg)]
      : [];
    const ls = progMakeLiveStage(def.stageId, tanks, 0, def.dry_mass, def.isp);
    ls.crewCapacity        = def.crewCapacity        ?? 0;
    ls.dockingPorts        = def.dockingPorts         ?? 0;
    ls.tunnelCapable       = def.tunnelCapable        ?? false;
    ls.isLandingTruss      = def.isLandingTruss       ?? false;
    ls.descentPropFraction = def.descentPropFraction  ?? 0;
    return ls;
  });
}

// ── Spacecraft editor UI ──────────────────────────────────────────────────────

let _progScSelId = null;  // currently selected spacecraft ID in editor modal











// ── Tests ─────────────────────────────────────────────────────────────────────
const PROG_P9_TEST_RESULTS = (() => { try {
  const sc = progMakeSpacecraftDefinition('CSM');
  sc.stages.push(progMakeSpacecraftStageDef('SM'));
  sc.stages.push(progMakeSpacecraftStageDef('CM'));
  sc.stages[0].dry_mass   = 6000;
  sc.stages[0].isp        = 314;
  sc.stages[0].propKg     = 18410;
  sc.stages[0].propType   = 'MMH/NTO';
  sc.stages[1].dry_mass   = 5560;
  sc.stages[1].crewCapacity = 3;
  sc.stages[1].dockingPorts = 1;
  sc.stages[1].tunnelCapable = true;

  const ls = progSpacecraftToLiveStages(sc);

  // LAUNCH integration test
  const p = progMakeProgram('SC-test');
  p.spacecraftDefinitions.push(sc);
  const ev = progMakeEvent('LAUNCH', {
    label:        'Apollo CSM',
    spacecraftId:  sc.spacecraftId,
    stages:        [],
    targetOrbit:   { body:'Earth', alt_km:185, inc_deg:28.5, lan_deg:0 },
    tStart:        0,
  });
  p.events.push(ev);
  const res = progDispatchEvent(p, ev);

  const fv = res.vehicleId ? p.vehicles[res.vehicleId] : null;

  const T = [
    { label:'P9: SpacecraftDef has spacecraftId',             val: typeof sc.spacecraftId,            target:'string',  tol:null },
    { label:'P9: SpacecraftDef stages array',                 val: sc.stages.length,                  target:2,         tol:0 },
    { label:'P9: StageDef has 5 extended fields',             val: ['crewCapacity','dockingPorts','tunnelCapable','isLandingTruss','descentPropFraction'].every(f=>f in sc.stages[0]) ? 1:0, target:1, tol:0 },
    { label:'P9: toLS – correct count',                       val: ls.length,                         target:2,         tol:0 },
    { label:'P9: toLS – SM has 1 tank',                       val: ls[0].tanks.length,                target:1,         tol:0 },
    { label:'P9: toLS – CM has 0 tanks',                      val: ls[1].tanks.length,                target:0,         tol:0 },
    { label:'P9: toLS – crewCapacity propagated',             val: ls[1].crewCapacity,                target:3,         tol:0 },
    { label:'P9: toLS – tunnelCapable propagated',            val: ls[1].tunnelCapable ? 1 : 0,       target:1,         tol:0 },
    { label:'P9: LAUNCH spacecraftId – result SUCCESS',       val: res.result,                        target:'SUCCESS', tol:null },
    { label:'P9: LAUNCH spacecraftId – vehicle created',      val: fv ? 1 : 0,                        target:1,         tol:0 },
    { label:'P9: LAUNCH spacecraftId – 2 stages in vehicle',  val: fv ? fv.stages.length : -1,        target:2,         tol:0 },
  ];
  return T.map(t => ({
    label: t.label, val: t.val, target: t.target,
    pass: t.tol === null
      ? (t.val === t.target)
      : (Math.abs(Number(t.val) - Number(t.target)) <= t.tol),
  }));
} catch(e){console.error('Test IIFE error:',e);return[];} })();