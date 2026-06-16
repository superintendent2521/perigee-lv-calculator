
// ─── STAGE EDIT (WRENCH) ──────────────────────
let _editSlot=null; // {stageIdx, isBooster}

function openEditStageModal(stageIdx,isBooster){
  _editSlot={stageIdx,isBooster};
  // Get current values
  let dry,prop,thrust,isp,res,engines='',note='',tags=[],name='',cat='Upper Stages',isB=false;
  if(isBooster){
    dry=document.getElementById('b_dry')?.value||0;
    prop=document.getElementById('b_prop')?.value||0;
    thrust=document.getElementById('b_thrust')?.value||0;
    isp=document.getElementById('b_isp')?.value||0;
    res=document.getElementById('b_res')?.value||2;
    name=currentBoosterName||'Strap-on Booster';
    isB=true;
    cat='Side Boosters';
  } else {
    const store=stageStore[stageIdx]||{};
    dry=store.dry||0;prop=store.prop||0;thrust=store.thrust||0;isp=store.isp||0;res=store.res||2;
    name=currentStageNames[stageIdx]||'Stage '+(stageIdx+1);
    // Try to find category from library
    const foundCat=findStageCategory(name);
    if(foundCat)cat=foundCat;
    // Find engines/note/tags from library
    const libStage=findStageInLibrary(name);
    if(libStage){engines=libStage.engines||'';note=libStage.note||'';tags=libStage.tags||[];}
  }
  // Fill modal fields
  document.getElementById('stg-name').value=name;
  document.getElementById('stg-dry').value=dry;
  document.getElementById('stg-prop').value=prop;
  document.getElementById('stg-thrust').value=thrust;
  document.getElementById('stg-isp').value=isp;
  document.getElementById('stg-res').value=res;
  document.getElementById('stg-engines').value=engines;
  document.getElementById('stg-note').value=note;
  document.getElementById('stg-tags').value=tags.join(', ');
  document.getElementById('stg-is-booster').checked=isB;
  document.getElementById('stg-new-cat-wrap').style.display='none';
  // Set category
  const sel=document.getElementById('stg-category');
  if([...sel.options].some(o=>o.value===cat))sel.value=cat;
  // Swap footer buttons: hide Add, show Save Changes
  document.getElementById('add-stage-lib-btn').style.display='none';
  document.getElementById('add-stage-save-btn').style.display='none';
  document.getElementById('edit-stage-save-btn').style.display='';
  document.getElementById('stg-base').value='';
  document.querySelector('#modal-add-stage .modal-title').textContent='Edit Stage';

  // S1.5 section — only meaningful for real stage slots (not boosters)
  const s15Sec = document.getElementById('stg-s15-section');
  if (s15Sec) s15Sec.style.display = isBooster ? 'none' : '';
  // s15 (stage-and-a-half) markup is optional — only populate it when present,
  // otherwise getElementById(...).checked throws and the modal never opens.
  if (s15Sec && !isBooster && stageIdx >= 0) {
    const sd = stageStore[stageIdx] || {};
    const on = !!sd.s15;
    document.getElementById('stg-s15').checked = on;
    document.getElementById('stg-s15-thrust').value = sd.s15_sust_thrust || '';
    document.getElementById('stg-s15-isp').value    = sd.s15_sust_isp   || '';
    document.getElementById('stg-s15-jet').value    = sd.s15_jet_mass   || '';
    document.getElementById('stg-s15-twr').value    = sd.s15_beco_twr != null ? sd.s15_beco_twr : 1.2;
    toggleS15Fields(on);
    _s15UpdatePreview(stageIdx);
  }

  openModal('modal-add-stage');
}

function toggleS15Fields(on) {
  const fields = document.getElementById('stg-s15-fields');
  if (fields) fields.style.display = on ? '' : 'none';
}

/** Live BECO split preview shown inside the edit modal. stageIdx is unused but kept for back-compat. */
function _s15UpdatePreview(_stageIdx) {
  const pre = document.getElementById('stg-s15-preview');
  if (!pre || !document.getElementById('stg-s15')?.checked) return;
  const dry    = parseFloat(document.getElementById('stg-dry')?.value)    || 0;
  const prop   = parseFloat(document.getElementById('stg-prop')?.value)   || 0;
  const isp    = parseFloat(document.getElementById('stg-isp')?.value)    || 1;
  const thrust = parseFloat(document.getElementById('stg-thrust')?.value) || 0;
  const sThrust = parseFloat(document.getElementById('stg-s15-thrust')?.value) || 0;
  const sIsp    = parseFloat(document.getElementById('stg-s15-isp')?.value)    || isp;
  const jetM    = parseFloat(document.getElementById('stg-s15-jet')?.value)    || 0;
  const twr     = parseFloat(document.getElementById('stg-s15-twr')?.value)    || 1.2;
  const split   = _s15BecoSplit({ dry, prop, isp, thrust,
    s15_sust_thrust: sThrust, s15_sust_isp: sIsp, s15_jet_mass: jetM, s15_beco_twr: twr });
  if (split.error) { pre.textContent = '// ' + split.error; pre.style.color='var(--accent2)'; return; }
  pre.style.color = 'var(--text-dim)';
  const fM = v => Math.round(v).toLocaleString() + ' kg';
  pre.textContent =
    `Ph.1 → Ph.2 prop split:  ${fM(split.prop_ph1)}  →  ${fM(split.prop_ph2)}`+
    `   |   dry after BECO: ${fM(dry - jetM)}`+
    `   |   booster thrust: ${(thrust - sThrust).toFixed(1)} kN`;
}

function doEditStage(){
  if(!_editSlot)return;
  const {stageIdx,isBooster}=_editSlot;
  const name=document.getElementById('stg-name').value.trim();
  const dry=parseFloat(document.getElementById('stg-dry').value)||0;
  const prop=parseFloat(document.getElementById('stg-prop').value)||0;
  const thrust=parseFloat(document.getElementById('stg-thrust').value)||0;
  const isp=parseFloat(document.getElementById('stg-isp').value)||1;
  const res=parseFloat(document.getElementById('stg-res').value)||2;
  const engines=document.getElementById('stg-engines').value.trim();
  const note=document.getElementById('stg-note').value.trim();
  const tags=document.getElementById('stg-tags').value.split(',').map(t=>t.trim()).filter(Boolean);
  const cat=document.getElementById('stg-category').value;

  if(isBooster){
    // Update booster fields
    ['dry','prop','thrust','isp','res'].forEach(k=>{
      const el=document.getElementById('b_'+k);
      if(el)el.value={dry,prop,thrust,isp,res}[k];
    });
    currentBoosterName=name;
    boosterSaved=false;
    // If UGC, update library entry
    updateUGCStage(currentBoosterName,{name,dry,prop,thrust,isp,res,engines,note,tags,isBooster:true,_userGenerated:true,_category:cat});
  } else {
    // Update stageStore
    if(!stageStore[stageIdx])stageStore[stageIdx]={};
    Object.assign(stageStore[stageIdx],{dry:String(dry),prop:String(prop),thrust:String(thrust),isp:String(isp),res:String(res)});
    // Update DOM table cells
    ['dry','prop','thrust','isp','res'].forEach(k=>{
      const el=document.getElementById('s'+(stageIdx+1)+'_'+k);
      if(el)el.value={dry,prop,thrust,isp,res}[k];
    });
    // ── S1.5 fields ──
    const s15On = document.getElementById('stg-s15')?.checked ?? false;
    if (s15On) {
      stageStore[stageIdx].s15             = true;
      stageStore[stageIdx].s15_sust_thrust = parseFloat(document.getElementById('stg-s15-thrust')?.value) || 0;
      stageStore[stageIdx].s15_sust_isp   = parseFloat(document.getElementById('stg-s15-isp')?.value)    || 0;
      stageStore[stageIdx].s15_jet_mass   = parseFloat(document.getElementById('stg-s15-jet')?.value)    || 0;
      stageStore[stageIdx].s15_beco_twr   = parseFloat(document.getElementById('stg-s15-twr')?.value)    || 1.2;
    } else {
      // Clear any previous s15 data
      delete stageStore[stageIdx].s15;
      delete stageStore[stageIdx].s15_sust_thrust;
      delete stageStore[stageIdx].s15_sust_isp;
      delete stageStore[stageIdx].s15_jet_mass;
      delete stageStore[stageIdx].s15_beco_twr;
    }
    const wasUGC=isUGCStage(currentStageNames[stageIdx]);
    currentStageNames[stageIdx]=name;
    stageSaved[stageIdx]=false;
    // If UGC, update library entry directly
    if(wasUGC){
      updateUGCStage(currentStageNames[stageIdx]||name,{name,dry,prop,thrust,isp,res,engines,note,tags,_userGenerated:true,_category:cat});
    }
  }
  _editSlot=null;
  closeModal('modal-add-stage');
  buildStageComposition();
  markLVUserDefined();
  buildStageLibrary();
}

function isUGCStage(name){
  if(!name)return false;
  for(const stages of Object.values(userStagesByCategory)){
    if(stages.some(s=>s.name===name))return true;
  }
  return false;
}

function findStageCategory(name){
  for(const [cat,stages] of Object.entries(userStagesByCategory)){
    if(stages.some(s=>s.name===name))return cat;
  }
  for(const [cat,stages] of Object.entries(STAGE_LIBRARY)){
    if(stages.some(s=>s.name===name))return cat;
  }
  return null;
}

function findStageInLibrary(name){
  for(const stages of Object.values(userStagesByCategory)){
    const s=stages.find(s=>s.name===name);if(s)return s;
  }
  for(const stages of Object.values(STAGE_LIBRARY)){
    const s=stages.find(s=>s.name===name);if(s)return s;
  }
  return null;
}

function updateUGCStage(oldName,newStage){
  for(const [cat,stages] of Object.entries(userStagesByCategory)){
    const idx=stages.findIndex(s=>s.name===oldName);
    if(idx>=0){stages[idx]={...newStage,_category:cat};return;}
  }
}
