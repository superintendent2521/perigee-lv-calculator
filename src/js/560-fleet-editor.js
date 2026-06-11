
// ─── FLEET EDITOR ────────────────────────────────────────────────────────────

const _PROG_LV_PRESETS = [
  { name: 'Saturn V', stageNames: ['S-IC', 'S-II', 'S-IVB'], boosterName: null, boosterData: null,
    stageData: [
      { dry: 131000,  prop: 2077000, isp: 304, thrust: 34020, res: 2 },
      { dry: 36200,   prop: 444000,  isp: 421, thrust: 4400,  res: 2 },
      { dry: 10000,   prop: 106000,  isp: 421, thrust: 1000,  res: 2 },
    ]},
  { name: 'Falcon 9 Block 5', stageNames: ['First Stage', 'Second Stage'], boosterName: null, boosterData: null,
    stageData: [
      { dry: 22200,  prop: 395700, isp: 339, thrust: 7607, res: 10 },
      { dry: 4500,   prop: 92670,  isp: 348, thrust: 934,  res: 2  },
    ]},
  { name: 'SLS Block 1', stageNames: ['Core Stage', 'ICPS'], boosterName: 'SRBs',
    boosterData: { dry: 100000, prop: 628000, isp: 269, thrust: 16000, count: 2 },
    stageData: [
      { dry: 85275,  prop: 978340, isp: 452, thrust: 7440, res: 2 },
      { dry: 3490,   prop: 27220,  isp: 451, thrust: 110,  res: 2 },
    ]},
  { name: 'Vulcan Centaur', stageNames: ['First Stage', 'Centaur V'], boosterName: 'SRBs',
    boosterData: { dry: 4500, prop: 42000, isp: 279, thrust: 1680, count: 2 },
    stageData: [
      { dry: 20000,  prop: 220000, isp: 360, thrust: 4400, res: 3 },
      { dry: 2780,   prop: 35400,  isp: 454, thrust: 220,  res: 2 },
    ]},
];

let _fleetEntries = [];   // FleetEntry[]
let _fleetSel     = null; // selected fleetId

function _fleetClonePreset(p) {
  return {
    fleetId: progUUID(),
    name: p.name,
    stageNames: [...(p.stageNames || [])],
    stageData: p.stageData.map(s => ({ ...s })),
    boosterName: p.boosterName || null,
    boosterData: p.boosterData ? { ...p.boosterData } : null,
    payloads: [],
  };
}

function fleetOpenImportModal() {
  document.getElementById('fleet-import-search').value = '';
  fleetImportRenderList();
  openModal('modal-fleet-import');
  setTimeout(() => document.getElementById('fleet-import-search')?.focus(), 100);
}

function fleetImportRenderList() {
  const el = document.getElementById('fleet-import-list');
  if (!el) return;
  const q = (document.getElementById('fleet-import-search')?.value ?? '').toLowerCase();

  let html = '';

  // User-saved / loaded vehicles first
  const myVehicles = userLVs.filter(v => !q || v.name.toLowerCase().includes(q));
  if (myVehicles.length) {
    html += '<div style="padding:6px 14px 3px;font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:.15em;text-transform:uppercase;border-bottom:1px solid var(--border);">My Vehicles</div>';
    html += myVehicles.map(v => {
      const i = userLVs.indexOf(v);
      const n = (v.stageData || v.stageNames || []).length;
      return `<div class="fleet-import-item" onclick="fleetImportVehicle('user',${i})">
        <span class="fleet-import-name">${v.name}</span>
        <span class="fleet-import-sub">${n} stage${n !== 1 ? 's' : ''}</span>
      </div>`;
    }).join('');
  }

  // Built-in library
  const builtins = BUILTIN_PRESETS.filter(v => !q ||
    v.name.toLowerCase().includes(q) ||
    (v.note || '').toLowerCase().includes(q) ||
    (v.tags || []).some(t => t.toLowerCase().includes(q)));
  if (builtins.length) {
    html += `<div style="padding:6px 14px 3px;font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:.15em;text-transform:uppercase;border-bottom:1px solid var(--border);${myVehicles.length ? 'margin-top:4px;' : ''}">Vehicle Library</div>`;
    html += builtins.map(v => {
      const idx = BUILTIN_PRESETS.indexOf(v);
      const n   = (v.stageNames || []).length;
      const tags = (v.tags || []).map(t => `<span class="fleet-import-tag">${t}</span>`).join(' ');
      const note = v.note ? v.note.split('.')[0] : '';
      return `<div class="fleet-import-item" onclick="fleetImportVehicle('builtin',${idx})">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:2px;">
          <span class="fleet-import-name">${v.name}</span>${tags}
        </div>
        <span class="fleet-import-sub">${n} stage${n !== 1 ? 's' : ''}${note ? ' &nbsp;&middot;&nbsp; ' + note : ''}</span>
      </div>`;
    }).join('');
  }

  if (!html) html = '<div style="padding:20px 16px;font-family:var(--mono);font-size:10px;color:var(--text-dim);">No vehicles match.</div>';
  el.innerHTML = html;
}

function fleetImportVehicle(source, idx) {
  const p = source === 'builtin' ? BUILTIN_PRESETS[idx] : userLVs[idx];
  if (!p) return;
  const stageData   = resolvePresetStages(p);
  const boosterData = resolvePresetBooster(p);
  const entry = {
    fleetId:     progUUID(),
    name:        p.name,
    stageNames:  p.stageNames || stageData.map((_, i) => 'Stage ' + (i + 1)),
    stageData:   stageData.map(s => ({ dry: s.dry||0, prop: s.prop||0, isp: s.isp||1, thrust: s.thrust||0, res: s.res||2 })),
    boosterName: p.boosterName || null,
    boosterData: boosterData || null,
    payloads:    [],
  };
  _fleetEntries.push(entry);
  _fleetSel = entry.fleetId;
  fleetRender();
  closeModal('modal-fleet-import');
}

function fleetInit() {
  _fleetEntries = _PROG_LV_PRESETS.map(_fleetClonePreset);
  _fleetSel = _fleetEntries[0]?.fleetId ?? null;
  fleetRender();
}

function _fleetGet(id) {
  return _fleetEntries.find(e => e.fleetId === (id ?? _fleetSel)) ?? null;
}

function fleetRender() { fleetRenderList(); fleetRenderDetail(); }

function fleetRenderList() {
  const el = document.getElementById('fleet-list');
  if (!el) return;
  const q = (document.getElementById('fleet-search')?.value ?? '').toLowerCase();
  const rows = _fleetEntries.filter(e => e.name.toLowerCase().includes(q));
  el.innerHTML = rows.map(e => {
    const pCount = (e.payloads || []).length;
    const payloadNote = pCount > 0 ? ` &nbsp;&middot;&nbsp; ${pCount} payload${pCount !== 1 ? 's' : ''}` : '';
    return `<div class="lv-item">
      <button class="lv-item-btn${e.fleetId === _fleetSel ? ' active' : ''}" onclick="fleetSelect('${e.fleetId}')">
        <span style="display:block;font-size:11px;color:var(--text-bright)">${e.name}</span>
        <span style="color:var(--text-dim);font-size:9px">${e.stageData.length} stage${e.stageData.length !== 1 ? 's' : ''}${payloadNote}</span>
      </button>
      <button class="lv-del" onclick="fleetDelete('${e.fleetId}')" title="Delete">&#x2715;</button>
    </div>`;
  }).join('') || '<div style="padding:12px;font-family:var(--mono);font-size:10px;color:var(--text-dim);">No launch vehicles</div>';
}

function fleetSelect(id) { _fleetSel = id; fleetRenderList(); fleetRenderDetail(); }

function fleetNew() {
  const entry = {
    fleetId: progUUID(),
    name: 'New Launch Vehicle',
    stageNames: ['Stage 1'],
    stageData: [{ dry: 5000, prop: 50000, isp: 311, thrust: 1000, res: 2 }],
    boosterName: null,
    boosterData: null,
    payloads: [],
  };
  _fleetEntries.push(entry);
  _fleetSel = entry.fleetId;
  fleetRender();
}

function fleetDelete(id) {
  _fleetEntries = _fleetEntries.filter(e => e.fleetId !== id);
  if (_fleetSel === id) _fleetSel = _fleetEntries[0]?.fleetId ?? null;
  fleetRender();
}

function fleetSnapshotCurrent() {
  if (typeof saveStoreFromDOM === 'function') saveStoreFromDOM();
  const stages = [];
  const names  = [];
  for (let s = 0; s < (typeof numStages !== 'undefined' ? numStages : 0); s++) {
    const st = stageStore[s] || {};
    stages.push({ dry: parseFloat(st.dry)||0, prop: parseFloat(st.prop)||0, isp: parseFloat(st.isp)||1, thrust: parseFloat(st.thrust)||0, res: parseFloat(st.res)||2 });
    names.push((typeof currentStageNames !== 'undefined' && currentStageNames[s]) ? currentStageNames[s] : ('Stage ' + (s+1)));
  }
  if (!stages.length) { alert('No stages in LV Calc — configure a vehicle on the Vehicles page first.'); return; }
  const lvName = (typeof loadedVehicleName !== 'undefined' && loadedVehicleName) ? loadedVehicleName : 'Snapshot ' + new Date().toLocaleDateString();
  const entry = {
    fleetId: progUUID(),
    name: lvName,
    stageNames: names,
    stageData: stages,
    boosterName: (typeof currentBoosterName !== 'undefined' && currentBoosterName) ? currentBoosterName : null,
    boosterData: (typeof useBooster !== 'undefined' && useBooster) ? (() => {
      const b = document.getElementById('b_dry');
      return b ? { dry: parseFloat(document.getElementById('b_dry').value)||0, prop: parseFloat(document.getElementById('b_prop').value)||0, isp: parseFloat(document.getElementById('b_isp').value)||1, thrust: parseFloat(document.getElementById('b_thrust').value)||0, count: parseInt(document.getElementById('num-boosters').value)||0 } : null;
    })() : null,
    payloads: [],
  };
  _fleetEntries.push(entry);
  _fleetSel = entry.fleetId;
  fleetRender();
}

function fleetLoadJSON(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const obj = JSON.parse(e.target.result);
      if (!obj.stageData && !obj.stages) { alert('Invalid LV JSON'); return; }
      // Support both program fleet format and LV calc save format
      const stages = obj.stageData || [];
      const names  = obj.stageNames || stages.map((_,i) => 'Stage '+(i+1));
      const entry = {
        fleetId: progUUID(),
        name: obj.name || obj.vehicleName || file.name.replace(/\.json$/i,''),
        stageNames: names,
        stageData: stages.map(s => ({ dry: s.dry||0, prop: s.prop||0, isp: s.isp||1, thrust: s.thrust||0, res: s.res||2 })),
        boosterName: obj.boosterName || null,
        boosterData: obj.boosterData || null,
        payloads: Array.isArray(obj.payloads) ? obj.payloads : [],
      };
      _fleetEntries.push(entry);
      _fleetSel = entry.fleetId;
      fleetRender();
    } catch(err) { alert('Failed to parse JSON: ' + err.message); }
  };
  reader.readAsText(file);
  input.value = '';
}

function fleetSaveJSON(id) {
  const e = _fleetGet(id);
  if (!e) return;
  const blob = new Blob([JSON.stringify(e, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = e.name.replace(/[^a-zA-Z0-9_-]/g, '_') + '.fleet.json';
  a.click();
}

function fleetAddPayload(fleetId, scId) {
  const e = _fleetGet(fleetId);
  if (!e || !scId) return;
  if (!e.payloads) e.payloads = [];
  if (!e.payloads.includes(scId)) e.payloads.push(scId);
  fleetRenderList();
  _fleetRefreshBudget(fleetId);
  // Re-render detail so the "add" dropdown resets and list updates
  const sel = document.getElementById('fleet-payload-add-' + fleetId);
  if (sel) sel.value = '';
  const listEl = document.getElementById('fleet-payload-list-' + fleetId);
  if (listEl) listEl.innerHTML = _fleetPayloadListHTML(e);
}

function fleetRemovePayload(fleetId, scId) {
  const e = _fleetGet(fleetId);
  if (!e) return;
  e.payloads = (e.payloads || []).filter(id => id !== scId);
  fleetRenderList();
  _fleetRefreshBudget(fleetId);
  const listEl = document.getElementById('fleet-payload-list-' + fleetId);
  if (listEl) listEl.innerHTML = _fleetPayloadListHTML(e);
  const sel = document.getElementById('fleet-payload-add-' + fleetId);
  if (sel) { sel.innerHTML = _fleetAddPayloadOptions(e); sel.value = ''; }
}

function fleetNameSet(id, val) {
  const e = _fleetGet(id);
  if (e) e.name = val;
  fleetRenderList();
}

function _fleetScMassById(scId) {
  const sc = _scEdSC.find(s => s.spacecraftId === scId);
  return sc ? sc.stages.reduce((s, st) => s + (st.dry_mass||0) + (st.propKg||0), 0) : 0;
}

function _fleetTotalPayloadMass(entry) {
  return (entry.payloads || []).reduce((t, id) => t + _fleetScMassById(id), 0);
}

function _fleetPayloadListHTML(entry) {
  const ids = entry.payloads || [];
  if (!ids.length) return '<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);padding:6px 0;">No payloads assigned</div>';
  return ids.map(scId => {
    const sc = _scEdSC.find(s => s.spacecraftId === scId);
    const mass = _fleetScMassById(scId);
    return `<div class="lv-item" style="margin-bottom:4px;">
      <button class="lv-item-btn" style="cursor:default;flex:1;">
        <span style="display:block;font-size:11px;color:var(--text-bright)">${sc ? sc.name : '(missing)'}</span>
        <span style="color:var(--text-dim);font-size:9px">${mass.toLocaleString()} kg &nbsp;&middot;&nbsp; ${sc ? sc.stages.length + ' stage' + (sc.stages.length !== 1 ? 's' : '') : 'N/A'}</span>
      </button>
      <button class="lv-del" onclick="fleetRemovePayload('${entry.fleetId}','${scId}')" title="Remove">&#x2715;</button>
    </div>`;
  }).join('');
}

function _fleetAddPayloadOptions(entry) {
  const ids = entry.payloads || [];
  const available = _scEdSC.filter(s => !ids.includes(s.spacecraftId));
  return '<option value="">+ Add spacecraft...</option>' +
    available.map(s => `<option value="${s.spacecraftId}">${s.name}</option>`).join('');
}

function _fleetLvDvBreakdown(entry, payloadMass) {
  let cum = 0;
  return entry.stageData.map((st, i) => {
    // wet mass = this stage + all stages above + payload
    const massAbove = entry.stageData.slice(i+1).reduce((s, x) => s + (x.dry||0) + (x.prop||0), 0);
    const m_wet = (st.dry||0) + (st.prop||0) + massAbove + payloadMass;
    const dv = (st.prop > 0 && st.isp > 0) ? progRocketEqDv(m_wet, st.prop, st.isp) : 0;
    cum += dv;
    return { name: entry.stageNames[i] || ('Stage '+(i+1)), dry: st.dry||0, prop: st.prop||0, isp: st.isp||0, dv, cum };
  });
}

function _fleetBudgetHTML(entry) {
  const payMass = _fleetTotalPayloadMass(entry);
  const lvRows  = _fleetLvDvBreakdown(entry, payMass);
  const lvTotal = lvRows.reduce((s, r) => s + r.dv, 0);

  // One section per spacecraft payload (on-orbit ΔV computed independently)
  let scSections = '';
  let scGrandDv = 0;
  for (const scId of (entry.payloads || [])) {
    const sc = _scEdSC.find(s => s.spacecraftId === scId);
    if (!sc) continue;
    let scCum = 0;
    const scRows = sc.stages.map((st, i) => {
      const m_wet = sc.stages.slice(i).reduce((s, x) => s + (x.dry_mass||0) + (x.propKg||0), 0);
      const dv = (st.propKg > 0 && st.isp > 0) ? progRocketEqDv(m_wet, st.propKg, st.isp) : 0;
      scCum += dv;
      return `<tr><td class="rl" style="padding-left:20px">${st.name}</td>
        <td style="text-align:right">${st.propKg > 0 ? st.propKg.toLocaleString() : '&#x2014;'}</td>
        <td style="text-align:right">${st.isp > 0 ? st.isp : '&#x2014;'}</td>
        <td style="text-align:right;color:${dv > 0 ? 'var(--accent3)' : 'var(--text-dim)'}">${dv > 0 ? Math.round(dv).toLocaleString() : '&#x2014;'}</td>
        <td style="text-align:right;color:var(--accent2)">${scCum > 0 ? Math.round(scCum).toLocaleString() : '&#x2014;'}</td>
      </tr>`;
    }).join('');
    scSections += `<tr><td colspan="5" style="padding:4px 8px 2px;font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:.15em;text-transform:uppercase;border-top:1px solid var(--border);">&#8627; ${sc.name} (on-orbit)</td></tr>` + scRows;
    scGrandDv = Math.max(scGrandDv, scCum);
  }

  const lvTrs = lvRows.map(r => `<tr>
    <td class="rl">${r.name}</td>
    <td style="text-align:right">${r.prop > 0 ? r.prop.toLocaleString() : '&#x2014;'}</td>
    <td style="text-align:right">${r.isp > 0 ? r.isp : '&#x2014;'}</td>
    <td style="text-align:right;color:${r.dv > 0 ? 'var(--accent3)' : 'var(--text-dim)'}">${r.dv > 0 ? Math.round(r.dv).toLocaleString() : '&#x2014;'}</td>
    <td style="text-align:right;color:var(--accent)">${r.cum > 0 ? Math.round(r.cum).toLocaleString() : '&#x2014;'}</td>
  </tr>`).join('');

  const payloadsCount = (entry.payloads || []).length;
  return `<table class="sc-dv-tbl" style="width:100%"><thead><tr>
    <th>Stage</th><th style="text-align:right">Prop (kg)</th><th style="text-align:right">Isp (s)</th>
    <th style="text-align:right">dv (m/s)</th><th style="text-align:right">Cumul. (m/s)</th>
  </tr></thead><tbody>${lvTrs}${scSections}</tbody></table>
  <div style="display:flex;justify-content:flex-end;align-items:baseline;gap:16px;margin-top:10px;padding-top:8px;border-top:1px solid var(--border);flex-wrap:wrap;">
    <span style="font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:.1em;text-transform:uppercase;">LV &#916;v</span>
    <span style="font-family:var(--mono);font-size:16px;color:var(--accent3)">${Math.round(lvTotal).toLocaleString()} m/s</span>
    ${payloadsCount ? `<span style="font-family:var(--mono);font-size:10px;color:var(--text-dim);letter-spacing:.1em;text-transform:uppercase;">Total payload</span>
    <span style="font-family:var(--mono);font-size:16px;color:var(--accent)">${payMass.toLocaleString()} kg</span>` : ''}
  </div>`;
}

function _fleetRefreshBudget(id) {
  const el = document.getElementById('fleet-budget-' + id);
  if (el) el.innerHTML = _fleetBudgetHTML(_fleetGet(id));
  fleetRenderList();
}

function fleetRenderDetail() {
  const el = document.getElementById('fleet-detail');
  if (!el) return;
  const entry = _fleetGet();
  if (!entry) { el.innerHTML = '<div class="placeholder-msg">Add or select a launch vehicle</div>'; return; }
  const id = entry.fleetId;

  // Stage table
  const stageTrs = entry.stageData.map((st, i) => `<tr>
    <td class="rl">${entry.stageNames[i] || 'Stage '+(i+1)}</td>
    <td>${(st.dry||0).toLocaleString()}</td>
    <td>${(st.prop||0).toLocaleString()}</td>
    <td>${st.isp||0}</td>
    <td style="color:var(--text-dim)">${((st.dry||0)+(st.prop||0)).toLocaleString()}</td>
  </tr>`).join('');

  const boosterRow = entry.boosterData ? `<tr style="color:var(--text-dim)">
    <td class="rl">${entry.boosterName||'Booster'} (x${entry.boosterData.count||1})</td>
    <td>${(entry.boosterData.dry||0).toLocaleString()}</td>
    <td>${(entry.boosterData.prop||0).toLocaleString()}</td>
    <td>${entry.boosterData.isp||0}</td>
    <td>${((entry.boosterData.dry||0)+(entry.boosterData.prop||0)).toLocaleString()}</td>
  </tr>` : '';

  const totalPayMass = _fleetTotalPayloadMass(entry);

  el.innerHTML = `
    <div class="cfg-row" style="margin-bottom:16px;gap:16px;align-items:flex-end;">
      <div class="cfg-item" style="flex:1;min-width:180px;"><label>Vehicle Name</label>
        <input type="text" class="field" style="width:100%;max-width:340px;" value="${entry.name.replace(/"/g,'&quot;')}"
          oninput="fleetNameSet('${id}',this.value)"></div>
      <button class="act-btn green" onclick="fleetSaveJSON('${id}')">&#x2B07; Save JSON</button>
    </div>

    <div class="sc-ed-detail-grid">
      <div>
        <div class="sl">Launch Vehicle Configuration</div>
        <div class="panel" style="padding:12px;">
          <table class="fleet-lv-tbl">
            <thead><tr><th>Stage</th><th>Dry (kg)</th><th>Prop (kg)</th><th>Isp (s)</th><th>Wet (kg)</th></tr></thead>
            <tbody>${stageTrs}${boosterRow}</tbody>
          </table>
        </div>
      </div>

      <div>
        <div class="sl">Payload Manifest <span style="color:var(--text);font-size:10px;letter-spacing:0;text-transform:none;">${totalPayMass > 0 ? '(' + totalPayMass.toLocaleString() + ' kg total)' : ''}</span></div>
        <div class="panel" style="padding:12px;">
          <div id="fleet-payload-list-${id}">${_fleetPayloadListHTML(entry)}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
            <select class="field" id="fleet-payload-add-${id}" style="width:220px" onchange="if(this.value)fleetAddPayload('${id}',this.value)">
              ${_fleetAddPayloadOptions(entry)}
            </select>
          </div>
        </div>
      </div>

      <div>
        <div class="sl">&#916;V Budget</div>
        <div class="panel" style="padding:12px;" id="fleet-budget-${id}">${_fleetBudgetHTML(entry)}</div>
      </div>
    </div>`;
}

