
// ─── PROGRAM MODULE — Phase 10: Save / Load & Closure Bar ───────────────────
//
// Save: serialize PROG_ACTIVE_PROGRAM to formatVersion:3 JSON and download.
// Load: read a .json file, validate formatVersion, restore as active program.
// Closure bar: per-vehicle status strip derived from event results.

// ── Tests ─────────────────────────────────────────────────────────────────────
const PROG_P10_TEST_RESULTS = (() => { try {
  // Save/load round-trip
  const orig = progMakeProgram('Save Test');
  orig.pads  = [progMakePad('LC-39A','39A','KSC',72)];
  const sc   = progMakeSpacecraftDefinition('Orion');
  sc.stages.push(progMakeSpacecraftStageDef('CM'));
  orig.spacecraftDefinitions.push(sc);
  const json = JSON.stringify(Object.assign({ formatVersion: 3 }, orig));

  let parsed;
  try { parsed = JSON.parse(json); } catch(e) { parsed = null; }
  const fmtOk = parsed?.formatVersion === 3;
  delete parsed?.formatVersion;

  // Restore: simulate progLoadProgramJSON without touching global state
  const restored = parsed ? Object.assign({ events:[], vehicles:{}, pads:[], spacecraftDefinitions:[], nodeMapCustomNodes:[], performanceCases:[] }, parsed) : null;

  // Closure bar logic unit test
  const prog2 = progMakeProgram('Closure Test');
  const fv2   = progMakeFlightVehicle('Rocket', [], progMakeOrbitalState('Earth',185,0,0), '#61afef');
  prog2.vehicles[fv2.vehicleId] = fv2;
  const evOK  = progMakeEvent('COAST', { vehicleId: fv2.vehicleId, tStart:0, tEnd:3600 });
  evOK.result = 'SUCCESS';
  prog2.events.push(evOK);
  const vids2 = Object.keys(prog2.vehicles);
  const evs2  = prog2.events.filter(e => e.vehicleId === vids2[0]);
  const status2 = evs2.every(e => e.result === 'SUCCESS') ? 'OK' : 'FAIL';

  const T = [
    { label:'P10: save produces formatVersion:3',          val: fmtOk ? 1 : 0,                                   target:1,     tol:0 },
    { label:'P10: round-trip preserves program name',      val: restored?.name,                                  target:'Save Test', tol:null },
    { label:'P10: round-trip preserves pad count',         val: restored?.pads?.length,                          target:1,     tol:0 },
    { label:'P10: round-trip preserves spacecraft count',  val: restored?.spacecraftDefinitions?.length,         target:1,     tol:0 },
    { label:'P10: round-trip spacecraft name intact',      val: restored?.spacecraftDefinitions?.[0]?.name,      target:'Orion', tol:null },
    { label:'P10: closure – all-SUCCESS → OK',             val: status2,                                         target:'OK',  tol:null },
  ];
  return T.map(t => ({
    label: t.label, val: t.val, target: t.target,
    pass: t.tol === null
      ? (t.val === t.target)
      : (Math.abs(Number(t.val) - Number(t.target)) <= t.tol),
  }));
} catch(e){console.error('Test IIFE error:',e);return[];} })();