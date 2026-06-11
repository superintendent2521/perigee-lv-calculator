with open(r'F:\LocalLLM Area\lv_calc.html', 'r', encoding='utf-8') as f:
    html = f.read()

original = html

# ── 1. Add helper fns before _missionBurnSectionHTML ──────────────────────────
HELPERS = """
function _missionDvToOrbit(body, alt_km) {
  const b = PROG_BODIES[body];
  if (!b) return 9400;
  const vCirc_ms = progVcirc(body, alt_km) * 1000;
  const losses = { Earth: 1550, Moon: 20, Mars: 1100, Venus: 1700, Mercury: 200, Titan: 1400 };
  return vCirc_ms + (losses[body] || 800);
}

function _missionStageLabelById(stageDefId) {
  for (const sc of _scEdSC) {
    const def = sc.stages.find(d => d.stageId === stageDefId);
    if (def) return def.name + ' (' + sc.name + ')';
  }
  return stageDefId;
}

"""
html = html.replace("function _missionBurnSectionHTML(m) {", HELPERS + "function _missionBurnSectionHTML(m) {", 1)
assert 'function _missionDvToOrbit' in html, "helpers not inserted"
print("Helpers: ok")

# ── 2. Remove local _sname, use module-level fn ────────────────────────────────
OLD_SNAME_BLOCK = """  // Resolve human-readable name: LV stages store the name in stageDefinitionId; SC stages use a UUID
  const _sname = ls => {
    for (const sc of _scEdSC) {
      const def = sc.stages.find(d => d.stageId === ls.stageDefinitionId);
      if (def) return def.name + ' (' + sc.name + ')';
    }
    return ls.stageDefinitionId;
  };

  const propRows"""
html = html.replace(OLD_SNAME_BLOCK, "  const propRows", 1)
assert OLD_SNAME_BLOCK not in html, "_sname block still present"
print("_sname removal: ok")

# Replace _sname(s) usages
html = html.replace('${_sname(s)}:', '${_missionStageLabelById(s.stageDefinitionId)}:', 2)
html = html.replace(
    "}>${_sname(s)} (",
    "}>${_missionStageLabelById(s.stageDefinitionId)} (", 1)
print("_sname usages replaced: ok")

# ── 3. Replace missionExecLaunch ───────────────────────────────────────────────
OLD_LAUNCH = """function missionExecLaunch(id) {
  const m = _missionGet(id);
  if (!m || !m.fleetEntryId) return;
  const entry = _fleetGet(m.fleetEntryId);
  if (!entry) return;

  const lvStages = progVehicleDefToLiveStages(entry);

  let scStages = [];
  for (const scId of m.payloadScIds) {
    const sc = _scEdSC.find(s => s.spacecraftId === scId);
    if (sc) scStages = scStages.concat(progSpacecraftToLiveStages(sc));
  }

  const allStages = [...lvStages, ...scStages];
  const ev = progMakeEvent('LAUNCH', {
    label:       m.name + ' — ' + entry.name,
    stages:      allStages,
    targetOrbit: { ...m.launchOrbit },
    color:       '#61afef',
  });

  const result = progDispatchEvent(PROG_ACTIVE_PROGRAM, ev);
  m.vehicleId = result.vehicleId;

  const payloadMass = m.payloadScIds.reduce((s, scId) => s + _fleetScMassById(scId), 0);
  const lvDvRows    = _fleetLvDvBreakdown(entry, payloadMass);
  const lvTotal     = lvDvRows.reduce((s, r) => s + r.dv, 0);

  m.log.push({
    type:         'LAUNCH',
    label:        entry.name,
    orbit:        { ...m.launchOrbit },
    vehicleId:    result.vehicleId,
    lvDvRows,
    lvTotal,
    payloadMass,
    payloadNames: m.payloadScIds.map(scId => _scEdSC.find(s => s.spacecraftId === scId)?.name).filter(Boolean),
  });

  missionRenderDetail();
}"""

NEW_LAUNCH = """function missionExecLaunch(id) {
  const m = _missionGet(id);
  if (!m || !m.fleetEntryId) return;
  const entry = _fleetGet(m.fleetEntryId);
  if (!entry) return;

  const lvStages = progVehicleDefToLiveStages(entry);
  let scStages = [];
  for (const scId of m.payloadScIds) {
    const sc = _scEdSC.find(s => s.spacecraftId === scId);
    if (sc) scStages = scStages.concat(progSpacecraftToLiveStages(sc));
  }

  const allStages = [...lvStages, ...scStages];
  const ev = progMakeEvent('LAUNCH', {
    label:       m.name + ' — ' + entry.name,
    stages:      allStages,
    targetOrbit: { ...m.launchOrbit },
    color:       '#61afef',
  });
  const result = progDispatchEvent(PROG_ACTIVE_PROGRAM, ev);
  m.vehicleId = result.vehicleId;

  // Ascent staging simulation: stage-by-stage dv delivery
  const fv           = PROG_ACTIVE_PROGRAM.vehicles[result.vehicleId];
  const dvRequired   = _missionDvToOrbit(m.launchOrbit.body, m.launchOrbit.alt_km);
  let   dvRemaining  = dvRequired;
  const stagingLog   = [];
  const stagesToDrop = [];

  for (let i = 0; i < fv.stages.length; i++) {
    const s = fv.stages[i];
    if ((s.isp || 0) <= 0) continue;
    const prop = progStageRemainingProp(s);
    if (prop <= 0) continue;

    const massAbove = fv.stages.slice(i + 1).reduce((sum, st) => sum + progStageMass(st), 0);
    const m_wet     = progStageMass(s) + massAbove;
    const dvAvail   = progRocketEqDv(m_wet, prop, s.isp);
    const sname     = _missionStageLabelById(s.stageDefinitionId);

    if (dvAvail >= dvRemaining) {
      // Insertion stage: partially burned
      const propNeeded = progRocketEqPropNeeded(m_wet, dvRemaining, s.isp);
      progBurnPropellant(s, propNeeded);
      stagingLog.push({ name: sname, propTotal: Math.round(prop), propBurned: Math.round(propNeeded), propRemaining: Math.round(prop - propNeeded), dvContrib: Math.round(dvRemaining), expended: false });
      dvRemaining = 0;
      break;
    } else {
      // Stage fully consumed
      progBurnPropellant(s, prop);
      stagingLog.push({ name: sname, propTotal: Math.round(prop), propBurned: Math.round(prop), propRemaining: 0, dvContrib: Math.round(dvAvail), expended: true });
      dvRemaining -= dvAvail;
      stagesToDrop.push(s.stageDefinitionId);
    }
  }

  fv.stages = fv.stages.filter(s => !stagesToDrop.includes(s.stageDefinitionId));

  const stagingResult = {
    dvRequired:  Math.round(dvRequired),
    dvDelivered: Math.round(dvRequired - Math.max(dvRemaining, 0)),
    status:      dvRemaining <= 0 ? 'SUCCESS' : 'MARGINAL',
    stages:      stagingLog,
  };

  const payloadMass = m.payloadScIds.reduce((s, scId) => s + _fleetScMassById(scId), 0);
  m.log.push({
    type:         'LAUNCH',
    label:        entry.name,
    orbit:        { ...m.launchOrbit },
    vehicleId:    result.vehicleId,
    stagingResult,
    payloadMass,
    payloadNames: m.payloadScIds.map(scId => _scEdSC.find(s => s.spacecraftId === scId)?.name).filter(Boolean),
  });

  missionRenderDetail();
}"""

html = html.replace(OLD_LAUNCH, NEW_LAUNCH, 1)
assert 'stagingResult' in html and 'stagesToDrop' in html, "missionExecLaunch not replaced"
print("missionExecLaunch: ok")

with open(r'F:\LocalLLM Area\lv_calc.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Done.")
