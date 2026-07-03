
// ─── PERFORMANCE CASES ────────────────────────
let performanceCases=[];   // { label, timestamp, vehicleName, result, config }
let activeCaseIndex=null;
let loadedVehicleName='';  // name from last loaded file

// Cases panel collapse/expand (collapsed by default, per session — Orbits page).
let _casesPanelOpen=false;
function casesPanelToggle(){
  const body=document.getElementById('cases-panel-body');
  const caret=document.getElementById('cases-toggle-caret');
  if(!body)return;
  _casesPanelOpen=!_casesPanelOpen;
  body.style.display=_casesPanelOpen?'':'none';
  if(caret)caret.textContent=_casesPanelOpen?'▾':'▸';
}

function buildCaseList(){
  const list=document.getElementById('case-list');
  if(!list)return;
  list.innerHTML='';
  if(!performanceCases.length){
    list.innerHTML='<div class="cases-empty">// No cases saved yet.<br>Calculate then save.</div>';
    const dlBtn=document.getElementById('download-cases-btn');
    if(dlBtn)dlBtn.disabled=true;
    return;
  }
  const dlBtn=document.getElementById('download-cases-btn');
  if(dlBtn)dlBtn.disabled=false;
  performanceCases.forEach((c,i)=>{
    const item=document.createElement('div');item.className='case-item';
    const btn=document.createElement('button');
    btn.className='case-btn'+(activeCaseIndex===i?' active':'');
    const payload=c.result?.maxPayload;
    const payStr=payload!=null?(payload>=1000?(payload/1000).toFixed(1)+'t':Math.round(payload)+'kg'):'—';
    btn.innerHTML=`<div class="case-label">${c.label||'Case '+(i+1)}</div>
      <div class="case-sub">${payStr} · ${c.config?.modeLabel||''}</div>`;
    btn.onclick=()=>viewCase(i);
    const del=document.createElement('button');
    del.className='case-del';del.textContent='×';del.title='Remove case';
    del.onclick=()=>{
      performanceCases.splice(i,1);
      if(activeCaseIndex===i)activeCaseIndex=null;
      else if(activeCaseIndex>i)activeCaseIndex--;
      buildCaseList();
    };
    item.appendChild(btn);item.appendChild(del);
    list.appendChild(item);
  });
}

function openSaveCaseModal(){
  if(!lastResult){showAlert('Run a calculation first.','No Results');return;}
  // Auto-suggest label from site + orbit
  const site=activeSiteKey||'Custom';
  const orbit=lastResult.modeLabel||'';
  document.getElementById('case-label-input').value=`${orbit} — ${site}`;
  openModal('modal-save-case');
  setTimeout(()=>document.getElementById('case-label-input').select(),100);
}

function doSaveCase(){
  if(!lastResult)return;
  const label=document.getElementById('case-label-input').value.trim()||('Case '+(performanceCases.length+1));
  // Snapshot current config
  const config={
    modeLabel:lastResult.modeLabel,
    site:{lat:gv('site-lat'),azMin:gv('az-min'),azMax:gv('az-max'),name:activeSiteKey},
    orbit:lastResult.orbitParams||null,
  };
  performanceCases.push({
    label,
    timestamp:new Date().toISOString(),
    vehicleName:loadedVehicleName||document.getElementById('lv-save-name')?.value||'',
    result:{...lastResult},
    config,
  });
  activeCaseIndex=performanceCases.length-1;
  closeModal('modal-save-case');
  buildCaseList();
}

function viewCase(i){
  activeCaseIndex=i;
  const c=performanceCases[i];
  if(!c)return;
  // Restore lastResult and re-render results panel
  lastResult={...c.result};
  renderResults(lastResult);
  buildCaseList();
}

// loadVehicleForCases removed — loadLVFile + applyLVObject handle both pages

function downloadAllCases(){
  if(!performanceCases.length){showAlert('No cases to download.','No Data');return;}
  // Bundle vehicle config + cases as a single loadable file
  const obj=buildLVObject(loadedVehicleName||'vehicle','');
  downloadJSON(obj,((loadedVehicleName||'vehicle').replace(/[^a-z0-9_-]/gi,'_').toLowerCase())+'.json');
}


