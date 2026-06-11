
// ─── USER STAGE MANAGEMENT ─────────────────────
function openAddStageModal(){
  ['stg-name','stg-note','stg-engines'].forEach(id=>document.getElementById(id).value='');
  ['stg-dry','stg-prop','stg-thrust','stg-isp'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('stg-res').value=2;
  document.getElementById('stg-is-booster').checked=false;
  document.getElementById('stg-new-cat-wrap').style.display='none';
  // Populate category dropdown
  const sel=document.getElementById('stg-category');
  while(sel.options.length>5)sel.remove(4);
  Object.keys(userStagesByCategory).filter(k=>!Object.keys(STAGE_LIBRARY).includes(k)).forEach(k=>{
    const o=document.createElement('option');o.value=k;o.textContent=k+' (custom)';
    sel.insertBefore(o,sel.lastElementChild);
  });
  sel.value='Upper Stages';
  // Populate base stage picker
  const base=document.getElementById('stg-base');
  base.innerHTML='<option value="">— Blank —</option>';
  const allCats={...STAGE_LIBRARY};
  Object.entries(userStagesByCategory).forEach(([k,v])=>{
    if(!allCats[k])allCats[k]=[];
    allCats[k]=[...v,...(allCats[k]||[])];
  });
  Object.entries(allCats).forEach(([cat,stages])=>{
    if(!stages.length)return;
    const grp=document.createElement('optgroup');grp.label=cat;
    stages.forEach(s=>{
      const o=document.createElement('option');o.value=s.name;o.textContent=s.name;
      grp.appendChild(o);
    });
    base.appendChild(grp);
  });
  // Restore Add mode footer
  _editSlot=null;
  document.getElementById('add-stage-lib-btn').style.display='';
  document.getElementById('add-stage-save-btn').style.display='';
  document.getElementById('edit-stage-save-btn').style.display='none';
  document.querySelector('#modal-add-stage .modal-title').textContent='Add Stage to Library';
  openModal('modal-add-stage');
  setTimeout(()=>document.getElementById('stg-name').focus(),100);
}

function onBaseStageChange(val){
  if(!val)return;
  // Find stage across all sources
  let found=null;
  for(const stages of Object.values(STAGE_LIBRARY)){
    found=stages.find(s=>s.name===val);if(found)break;
  }
  if(!found)for(const stages of Object.values(userStagesByCategory)){
    found=stages.find(s=>s.name===val);if(found)break;
  }
  if(!found)return;
  document.getElementById('stg-name').value=found.name+' (mod)';
  document.getElementById('stg-dry').value=found.dry||'';
  document.getElementById('stg-prop').value=found.prop||'';
  document.getElementById('stg-thrust').value=found.thrust||'';
  document.getElementById('stg-isp').value=found.isp||'';
  document.getElementById('stg-res').value=found.res??2;
  document.getElementById('stg-engines').value=found.engines||'';
  document.getElementById('stg-note').value=found.note||'';
  document.getElementById('stg-tags').value=(found.tags||[]).join(', ');
  document.getElementById('stg-is-booster').checked=!!found.isBooster;
  // Set category to match base stage
  const cat=found._category||(found.isBooster?'Side Boosters':'Upper Stages');
  const catSel=document.getElementById('stg-category');
  if([...catSel.options].some(o=>o.value===cat))catSel.value=cat;
  onStageCatChange(catSel.value);
}

function onStageCatChange(val){
  document.getElementById('stg-new-cat-wrap').style.display=val==='__new__'?'grid':'none';
}

function doAddStage(andSave){
  const name=document.getElementById('stg-name').value.trim();
  if(!name){showAlert('Please enter a stage name.','Validation');return;}
  let cat=document.getElementById('stg-category').value;
  if(cat==='__new__'){
    cat=document.getElementById('stg-new-cat').value.trim()||'Custom';
  }
  const stage={
    name,_userGenerated:true,
    dry:    parseFloat(document.getElementById('stg-dry').value)||0,
    prop:   parseFloat(document.getElementById('stg-prop').value)||0,
    thrust: parseFloat(document.getElementById('stg-thrust').value)||0,
    isp:    parseFloat(document.getElementById('stg-isp').value)||1,
    res:    parseFloat(document.getElementById('stg-res').value)||2,
    engines:document.getElementById('stg-engines').value.trim()||'—',
    note:   document.getElementById('stg-note').value.trim(),
    tags:   document.getElementById('stg-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
    isBooster:document.getElementById('stg-is-booster').checked,
    _category:cat,
  };
  if(!userStagesByCategory[cat])userStagesByCategory[cat]=[];
  userStagesByCategory[cat].unshift(stage); // prepend so new stages appear first
  if(andSave){
    downloadJSON(stage,(name.replace(/[^a-z0-9_-]/gi,'_').toLowerCase())+'_stage.json');
  }
  closeModal('modal-add-stage');
  buildStageLibrary();
}

function loadUserStageFile(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const s=JSON.parse(e.target.result);
      if(!s.name||s.dry===undefined){showAlert('Invalid stage file: missing name or dry mass.','Invalid File');return;}
      s._userGenerated=true; // mark as user content on import
      const cat=s._category||'Custom';
      if(!userStagesByCategory[cat])userStagesByCategory[cat]=[];
      userStagesByCategory[cat].unshift(s); // prepend so it appears first
      buildStageLibrary();
    }catch(err){showAlert('Invalid stage JSON: '+err.message,'Invalid File');}
  };
  reader.readAsText(file);input.value='';
}
