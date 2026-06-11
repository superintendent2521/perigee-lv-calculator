
// ─── STAGE DETAIL MODAL ───────────────────────
let _didDrag = false;

function propShort(tags){
  const t = (tags||[]).find(t=>
    t.includes('Liquid Oxygen')||t.includes('Nitrogen')||t.includes('Fluorine')||
    t.includes('Inhibited')||t.includes('Solid')||t.includes('Ethanol'));
  if(!t) return '';
  if(t.includes('Liquid Hydrogen')) return 'LOX / LH₂';
  if(t.includes('Kerosene'))        return 'LOX / RP-1';
  if(t.includes('Methane'))         return 'LOX / CH₄';
  if(t.includes('Ethanol'))         return 'LOX / Ethanol';
  if(t.includes('Aerozine'))        return 'NTO / Aerozine-50';
  if(t.includes('UDMH')&&t.includes('Nitrogen')) return 'NTO / UDMH';
  if(t.includes('IRFNA'))           return 'IRFNA / UDMH';
  if(t.includes('Fluorine'))        return 'LF₂ / Hydrazine';
  if(t.includes('Solid'))           return 'Solid Propellant';
  return t;
}

function openStageModal(stage){
  document.getElementById('sdm-title').textContent = stage.name;
  const fT=v=>v>=1000?(v/1000).toFixed(2)+' MN':v+' kN';
  const fM=v=>v>=1000?(v/1000).toFixed(1)+' t':v+' kg';
  const body = document.getElementById('sdm-body');
  const fuel = propShort(stage.tags);
  const nonPropTags=(stage.tags||[]).filter(t=>!['Liquid Oxygen','Nitrogen Tetroxide','Inhibited','Solid Propellant','Liquid Fluorine','Liquid Oxygen / Ethanol'].some(p=>t.startsWith(p)));
  body.innerHTML=`
    <div class="stage-detail-grid">
      <div class="stage-detail-row"><label>Dry Mass</label><span>${fM(stage.dry||0)}</span></div>
      <div class="stage-detail-row"><label>Propellant</label><span>${fM(stage.prop||0)}</span></div>
      <div class="stage-detail-row"><label>Thrust (vac)</label><span>${fT(stage.thrust||0)}</span></div>
      <div class="stage-detail-row"><label>Isp (vac)</label><span>${stage.isp||0} s</span></div>
      <div class="stage-detail-row"><label>Residuals</label><span>${stage.res??2} %</span></div>
      <div class="stage-detail-row"><label>Engines</label><span>${stage.engines||'—'}</span></div>
      ${fuel?`<div class="stage-detail-row" style="grid-column:1/-1;"><label>Propellant</label><span>${fuel}</span></div>`:''}
    </div>
    ${stage.note?`<div class="note" style="margin:0 0 8px;">${stage.note}</div>`:''}
    <div class="stage-detail-tags">${nonPropTags.map(t=>`<span class="stage-detail-tag">${t}</span>`).join('')}</div>
  `;
  openModal('modal-stage-detail');
}

function openVehicleModal(p){
  document.getElementById('sdm-title').textContent = p.name;
  const body = document.getElementById('sdm-body');
  const tags = computeVehicleTags(p);
  const nonEra = tags.filter(t=>!['1940s','1950s','1960s','1970s','1980s','1990s-2000s','2010s+'].includes(t));
  body.innerHTML=`
    <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:.08em;margin-bottom:10px;">
      ${(p.stageNames||[]).join(' → ')}${p.boosterName?' + '+p.boosterName+(p.boosterCount>1?' ×'+p.boosterCount:''):''}
    </div>
    ${p.note?`<div class="note" style="margin:0 0 8px;">${p.note}</div>`:''}
    <div class="stage-detail-tags">${nonEra.map(t=>`<span class="stage-detail-tag">${t}</span>`).join('')}</div>
  `;
  openModal('modal-stage-detail');
}


