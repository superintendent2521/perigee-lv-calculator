
// ─── STAGE COMPOSITION VIEW ───────────────────
let currentStageNames=new Array(15).fill(null); // library name for each stage slot
let stageSaved=new Array(15).fill(false);
let boosterSaved=false;

// ── Vehicle performance panel (per-stage ΔV tracker + spec table) ──
const VP_COLORS = ['#ff8844','#5599ff','#88cc55','#cc77ff','#55ccff','#ffcc33','#ff5577'];

function updatePerfPanel() {
  const dvBody    = document.getElementById('vp-dv-body');
  const statsBody = document.getElementById('vp-stats-body');
  const tblBody   = document.getElementById('vp-table-body');
  if (!dvBody || !statsBody || !tblBody) return;

  // ── Collect stage data ────────────────────────────────────────
  const pF = v => parseFloat(v) || 0;
  const segments = []; // {label, shortLabel, dry, prop, thrust, isp, res, color, isBooster}

  if (useBooster) {
    const bCount = parseInt(document.getElementById('num-boosters')?.value) || 0;
    segments.push({
      label:      (currentBoosterName || 'Strap-on') + (bCount > 1 ? ` ×${bCount}` : ''),
      shortLabel: currentBoosterName ? currentBoosterName.slice(0,10) : 'Booster',
      dry:    pF(document.getElementById('b_dry')?.value),
      prop:   pF(document.getElementById('b_prop')?.value),
      thrust: pF(document.getElementById('b_thrust')?.value) * bCount,
      isp:    pF(document.getElementById('b_isp')?.value) || 1,
      res:    pF(document.getElementById('b_res')?.value),
      count:  bCount,
      color:  VP_COLORS[0],
      isBooster: true,
    });
  }

  for (let s = 0; s < numStages; s++) {
    const st = stageStore[s] || {};
    const colorIdx = useBooster ? (s + 1) : s;
    segments.push({
      label:      currentStageNames[s] || `Stage ${s+1}`,
      shortLabel: currentStageNames[s] ? currentStageNames[s].slice(0,10) : `S${s+1}`,
      dry:    pF(st.dry),
      prop:   pF(st.prop),
      thrust: pF(st.thrust),
      isp:    pF(st.isp) || 1,
      res:    pF(st.res),
      count:  1,
      color:  VP_COLORS[colorIdx % VP_COLORS.length],
      isBooster: false,
    });
  }

  // Helpers
  const fmt  = v => Math.round(v).toLocaleString();
  const fmtF = (v, dec=1) => v >= 1000 ? (v/1000).toFixed(dec) + ' MN' : v.toFixed(dec) + ' kN';
  const fmtM = v => v >= 1e6 ? (v/1e6).toFixed(2) + ' Mt' : v >= 1000 ? (v/1000).toFixed(1) + ' t' : Math.round(v) + ' kg';

  // ── Per-segment calculations ──────────────────────────────────
  let totalDV = 0, liftoffMass = 0, totalThrust = 0, totalDry = 0, totalProp = 0;

  const calcs = segments.map(seg => {
    const propUsable = seg.prop * (1 - seg.res / 100);
    const m0 = seg.dry + propUsable;
    const mf = seg.dry;
    const dv = (m0 > mf && mf > 0) ? G0 * seg.isp * Math.log(m0 / mf) : 0;
    const massFlow = (seg.thrust * 1000) / (G0 * seg.isp);
    const burnTime = massFlow > 0 ? propUsable / massFlow : 0;
    const propFrac = (seg.dry + seg.prop) > 0 ? seg.prop / (seg.dry + seg.prop) * 100 : 0;
    const massRatio = mf > 0 ? m0 / mf : 0;

    // For vehicle-level totals, multiply boosters by count
    const effectiveDry   = seg.dry   * seg.count;
    const effectiveProp  = seg.prop  * seg.count;
    totalDry    += effectiveDry;
    totalProp   += effectiveProp;
    liftoffMass += effectiveDry + effectiveProp;
    totalThrust += seg.thrust; // already has ×count baked in for boosters
    totalDV     += dv;

    return { ...seg, dv, burnTime, propFrac, massRatio };
  });

  // ── ΔV Panel ─────────────────────────────────────────────────
  const hasAnyDV = totalDV > 0;
  if (!hasAnyDV) {
    dvBody.innerHTML = '<div class="vp-dv-empty">// Drop stages into the composition above</div>';
  } else {
    const maxDV = Math.max(...calcs.map(c => c.dv), 1);
    const rows = calcs.map(c => {
      const barPct = (c.dv / maxDV * 100).toFixed(1);
      const dvStr  = c.dv > 0 ? fmt(Math.round(c.dv)) + ' m/s' : '—';
      const mrStr  = c.massRatio > 0 ? 'MR ' + c.massRatio.toFixed(2) : '';
      const ispStr = c.isp > 1 ? 'Isp ' + Math.round(c.isp) + ' s' : '';
      return `<div class="vp-dv-row">
        <div class="vp-dv-label">${c.label}</div>
        <div class="vp-dv-track">
          <div class="vp-dv-fill" style="width:${barPct}%;background:${c.color};opacity:.85;"></div>
        </div>
        <div class="vp-dv-val" style="color:${c.color};">${dvStr}</div>
        <div class="vp-dv-meta">${ispStr}&nbsp;&nbsp;${mrStr}</div>
      </div>`;
    }).join('');

    dvBody.innerHTML = rows + `
      <div class="vp-dv-total">
        <div class="vp-dv-total-label">Total ΔV (stage-isolation)</div>
        <div class="vp-dv-total-val">${fmt(Math.round(totalDV))} m/s</div>
      </div>`;
  }

  // ── Stats Panel ───────────────────────────────────────────────
  if (liftoffMass === 0) {
    statsBody.innerHTML = '<div class="vp-dv-empty">// —</div>';
  } else {
    const weightKN   = liftoffMass * G0 / 1000;
    const twr        = weightKN > 0 ? totalThrust / weightKN : 0;
    const twrClass   = twr < 1.05 ? 'warn' : twr >= 1.2 ? 'ok' : '';
    const massFrac   = liftoffMass > 0 ? (totalDry / liftoffMass * 100) : 0;

    statsBody.innerHTML = `
      <div class="vp-stat">
        <div class="vp-stat-label">Liftoff Mass</div>
        <div class="vp-stat-val">${fmtM(liftoffMass)}</div>
      </div>
      <div class="vp-stat">
        <div class="vp-stat-label">Total Propellant</div>
        <div class="vp-stat-val">${fmtM(totalProp)}</div>
      </div>
      <div class="vp-stat">
        <div class="vp-stat-label">Liftoff Thrust</div>
        <div class="vp-stat-val">${fmtF(totalThrust, totalThrust >= 100 ? 0 : 1)}</div>
      </div>
      <div class="vp-stat">
        <div class="vp-stat-label">Liftoff T/W</div>
        <div class="vp-stat-val ${twrClass}">${twr > 0 ? twr.toFixed(2) : '—'}</div>
      </div>
      <div class="vp-stat">
        <div class="vp-stat-label">Structural Fraction</div>
        <div class="vp-stat-val">${massFrac.toFixed(1)} %</div>
      </div>
      <div class="vp-stat">
        <div class="vp-stat-label">Total ΔV</div>
        <div class="vp-stat-val" style="color:var(--accent);">${hasAnyDV ? fmt(Math.round(totalDV)) + ' m/s' : '—'}</div>
      </div>`;
  }

  // ── Spec Table ────────────────────────────────────────────────
  if (calcs.length === 0) {
    tblBody.innerHTML = '<div class="vp-dv-empty">// No stages loaded</div>';
    return;
  }

  const dotH = c => `<span class="vp-col-dot" style="background:${c.color};"></span>`;
  const th = c => `<th>${dotH(c)}${c.shortLabel}</th>`;
  const headers = `<tr><th></th>${calcs.map(th).join('')}</tr>`;

  const row = (label, fn) =>
    `<tr><td>${label}</td>${calcs.map(c => `<td>${fn(c)}</td>`).join('')}</tr>`;

  tblBody.innerHTML = `<table class="vp-spec-tbl">
    <thead>${headers}</thead>
    <tbody>
      ${row('Dry Mass',      c => fmtM(c.dry))}
      ${row('Propellant',    c => fmtM(c.prop))}
      ${row('Gross Mass',    c => fmtM(c.dry + c.prop))}
      ${row('Isp',           c => c.isp > 1 ? Math.round(c.isp) + ' s' : '—')}
      ${row('Thrust',        c => c.thrust > 0 ? fmtF(c.thrust / (c.isBooster ? 1 : 1), c.thrust >= 100 ? 0 : 1) : '—')}
      ${row('Prop Fraction', c => c.propFrac > 0 ? c.propFrac.toFixed(1) + ' %' : '—')}
      ${row('Mass Ratio',    c => c.massRatio > 1 ? c.massRatio.toFixed(2) : '—')}
      ${row('ΔV (isol.)',    c => `<span class="vp-dv-accent">${c.dv > 0 ? fmt(Math.round(c.dv)) + ' m/s' : '—'}</span>`)}
      ${row('Burn Time',     c => c.burnTime > 0 ? (c.burnTime >= 60 ? (c.burnTime/60).toFixed(1) + ' min' : Math.round(c.burnTime) + ' s') : '—')}
    </tbody>
  </table>`;
}

// ── Art-page stubs: the dedicated art page was not restored in this merge.
// These keep the LV stage-composition / library code from throwing on its
// art-slot refresh calls. Restore the real art system later if wanted.
function artPageRebuildSlots(){}
function _progArtRebuildManagerList(){}

function buildStageComposition(){
  const body=document.getElementById('comp-body');
  if(!body)return;
  body.innerHTML='';
  // Update count badge
  const cntEl=document.getElementById('comp-stage-count');
  if(cntEl){const total=numStages+(useBooster?1:0);cntEl.textContent=total===1?'1 stage':total+' stages';}

  function makeCompCard(label,stageName,dry,prop,thrust,isp,stageIdx,isBooster){
    const saved=isBooster?boosterSaved:(stageIdx>=0?stageSaved[stageIdx]:false);
    const wrap=document.createElement('div');
    wrap.style.cssText='display:flex;flex-direction:column;';
    const lbl=document.createElement('div');
    lbl.className='comp-stage-label';lbl.textContent=label;
    wrap.appendChild(lbl);
    // Outer row: card content + save area
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:stretch;gap:0;';
    const card=document.createElement('div');
    card.className='comp-card'+(stageName?'':' custom-stage');
    card.style.flex='1';
    card.addEventListener('dragover',e=>{e.preventDefault();card.classList.add('drop-hover');});
    card.addEventListener('dragleave',()=>card.classList.remove('drop-hover'));
    card.addEventListener('drop',e=>{
      e.preventDefault();card.classList.remove('drop-hover');
      if(!_draggingStage)return;
      if(_draggingStage._isVehicle){loadPreset(_draggingStage._preset,'builtin_'+BUILTIN_PRESETS.indexOf(_draggingStage._preset));}
      else if(isBooster){applyBoosterData(_draggingStage);}
      else{applyStageData(stageIdx,_draggingStage);}
    });
    const nameEl=document.createElement('div');
    nameEl.className='comp-card-name'+(stageName?'':' unnamed');
    nameEl.style.display='flex';nameEl.style.alignItems='center';nameEl.style.gap='6px';
    const nameText=document.createElement('span');
    nameText.style.overflow='hidden';nameText.style.textOverflow='ellipsis';nameText.style.whiteSpace='nowrap';
    nameText.textContent=stageName||'Unnamed';
    nameEl.appendChild(nameText);
    // S1.5 badge
    if(!isBooster&&stageIdx>=0&&stageStore[stageIdx]?.s15){
      const badge=document.createElement('span');
      badge.textContent='½';
      badge.title='Stage-and-a-Half';
      badge.style.cssText='font-size:9px;font-family:var(--mono);color:var(--accent);background:rgba(136,198,87,.12);border:1px solid var(--accent);border-radius:2px;padding:1px 4px;flex-shrink:0;letter-spacing:0;';
      nameEl.appendChild(badge);
    }
    // Crossfeed / center-throttle badge (booster only)
    if(isBooster){
      const pm=document.getElementById('b_parallel_mode')?.value||'independent';
      if(pm!=='independent'){
        const thr=Math.round(parseFloat(document.getElementById('b_core_throttle')?.value)||57);
        const badge=document.createElement('span');
        badge.textContent = pm==='crossfeed' ? 'XFEED' : (thr+'%');
        badge.title = pm==='crossfeed' ? 'Crossfeed — boosters feed first stage' : ('First stage throttled to '+thr+'% during boost');
        badge.style.cssText='font-size:9px;font-family:var(--mono);color:var(--accent);background:rgba(136,198,87,.12);border:1px solid var(--accent);border-radius:2px;padding:1px 4px;flex-shrink:0;letter-spacing:0;';
        nameEl.appendChild(badge);
      }
    }
    card.appendChild(nameEl);
    if(dry||prop||thrust||isp){
      const specs=document.createElement('div');specs.className='comp-card-specs';
      specs.innerHTML=`<span><b>Isp</b> ${isp||0} s</span><span><b>F</b> ${fT(thrust||0)}</span><span><b>Dry</b> ${fM(dry||0)}</span><span><b>Prop</b> ${fM(prop||0)}</span>`;
      card.appendChild(specs);
    }
    const hint=document.createElement('div');hint.className='comp-card-hint';
    hint.textContent='// drop to replace';
    card.appendChild(hint);
    row.appendChild(card);
    // Wrench / edit button
    const editBtn=document.createElement('button');
    editBtn.className='comp-edit-btn';
    editBtn.title='Edit stage';
    editBtn.innerHTML='<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 1a3 3 0 0 0-2.9 3.7L1 8.3A1.1 1.1 0 1 0 2.7 10l3.6-3.6A3 3 0 1 0 7.5 1z"/><circle cx="7.5" cy="4" r="1" fill="currentColor" stroke="none"/></svg>';
    editBtn.addEventListener('mouseenter',()=>editBtn.style.color='var(--accent2)');
    editBtn.addEventListener('mouseleave',()=>editBtn.style.color='');
    editBtn.addEventListener('click',e=>{e.stopPropagation();openEditStageModal(stageIdx,isBooster);});
    row.appendChild(editBtn);
    // Save button / saved dot
    const saveBtn=document.createElement('div');
    saveBtn.style.cssText=`width:32px;display:flex;align-items:center;justify-content:center;
      border:1px solid var(--border);border-left:none;cursor:${saved?'default':'pointer'};
      color:${saved?'var(--accent3)':'var(--text-dim)'};flex-shrink:0;transition:color .15s;`;
    if(saved){
      saveBtn.innerHTML='<span style="font-size:9px;line-height:1;">●</span>';
      saveBtn.title='Saved';
    } else {
      saveBtn.innerHTML='<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><line x1="5.5" y1="1" x2="5.5" y2="7.5"/><polyline points="2.5,5 5.5,8.5 8.5,5"/><line x1="1.5" y1="10" x2="9.5" y2="10"/></svg>';
      saveBtn.title='Save stage as .json';
      saveBtn.addEventListener('mouseenter',()=>saveBtn.style.color='var(--accent)');
      saveBtn.addEventListener('mouseleave',()=>saveBtn.style.color='var(--text-dim)');
      saveBtn.addEventListener('click',e=>{e.stopPropagation();saveStageCardAsFile(stageIdx,isBooster);});
    }
    row.appendChild(saveBtn);
    wrap.appendChild(row);
    return wrap;
  }

  // Booster first
  if(useBooster){
    const bCount=parseInt(document.getElementById('num-boosters')?.value)||0;
    body.appendChild(makeCompCard(
      `Strap-on ×${bCount}`,
      currentBoosterName,
      parseFloat(document.getElementById('b_dry')?.value)||0,
      parseFloat(document.getElementById('b_prop')?.value)||0,
      parseFloat(document.getElementById('b_thrust')?.value)||0,
      parseFloat(document.getElementById('b_isp')?.value)||0,
      null,true
    ));
  }

  for(let s=0;s<numStages;s++){
    const store=stageStore[s]||{};
    body.appendChild(makeCompCard(
      `Stage ${s+1}`,
      currentStageNames[s]||null,
      parseFloat(store.dry)||0,
      parseFloat(store.prop)||0,
      parseFloat(store.thrust)||0,
      parseFloat(store.isp)||0,
      s,false
    ));
  }
  // Ghost placeholder cards up to 4 total
  const ghostCount=Math.max(0,4-numStages);
  for(let g=0;g<ghostCount;g++){
    const slotIdx=numStages+g;
    const wrap=document.createElement('div');
    wrap.style.cssText='display:flex;flex-direction:column;';
    const lbl=document.createElement('div');
    lbl.className='comp-stage-label';lbl.style.opacity='.35';
    lbl.textContent=`Stage ${slotIdx+1}`;
    wrap.appendChild(lbl);
    // Ghost row (card + empty save area)
    const row=document.createElement('div');row.style.cssText='display:flex;align-items:stretch;';
    const ghost=document.createElement('div');
    ghost.className='comp-card-ghost';ghost.style.flex='1';
    const ghostLbl=document.createElement('div');
    ghostLbl.className='comp-card-ghost-label';
    ghostLbl.textContent='// drop stage here';
    ghost.appendChild(ghostLbl);
    ghost.addEventListener('dragover',e=>{e.preventDefault();ghost.classList.add('drop-hover');});
    ghost.addEventListener('dragleave',()=>ghost.classList.remove('drop-hover'));
    ghost.addEventListener('drop',e=>{
      e.preventDefault();ghost.classList.remove('drop-hover');
      if(!_draggingStage||_draggingStage._isVehicle)return;
      setStages(slotIdx+1);
      applyStageData(slotIdx,_draggingStage);
    });
    // Empty save area placeholder
    const savePh=document.createElement('div');
    savePh.style.cssText='width:32px;border:1px dashed var(--border);border-left:none;opacity:.3;flex-shrink:0;';
    row.appendChild(ghost);row.appendChild(savePh);
    wrap.appendChild(row);
    body.appendChild(wrap);
  }
  vehCanvasOnStagesChanged();
  vehBuildAssignStrip();
  artPageRebuildSlots();
  updatePerfPanel();
}
