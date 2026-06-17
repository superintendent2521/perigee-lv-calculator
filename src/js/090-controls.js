
// ─── CONTROLS ─────────────────────────────────
function onStageCountInput(v){const n=Math.max(1,Math.min(MAX_STAGES,parseInt(v)||1));if(n!==numStages)setStages(n,false);}
function setStages(n,updateInput=true){
  n=Math.max(1,Math.min(MAX_STAGES,n));numStages=n;
  if(updateInput)document.getElementById('stage-count-input').value=n;
  _suppressUD=true;buildTable();
}
function setBoosters(val){
  useBooster=val;
  document.querySelectorAll('#booster-toggle button').forEach((b,i)=>b.classList.toggle('active',i===(val?0:1)));
  document.getElementById('booster-count-wrap').style.display=val?'flex':'none';
  const mw=document.getElementById('booster-mode-wrap');if(mw)mw.style.display=val?'flex':'none';
  // throttle % row only when boosters on AND mode is 'throttle'
  const tw=document.getElementById('booster-throttle-wrap');
  if(tw)tw.style.display=(val&&document.getElementById('b_parallel_mode')?.value==='throttle')?'flex':'none';
  _suppressUD=true;
  buildTable();
}
// Booster parallel-staging mode: 'independent' | 'crossfeed' | 'throttle'. The throttle %
// row is only shown for 'throttle'. Triggers a recompute of the composition preview.
function setBoosterMode(mode){
  const hid=document.getElementById('b_parallel_mode'); if(hid)hid.value=mode;
  document.querySelectorAll('#b-parallel-seg button').forEach(b=>b.classList.toggle('active',b.dataset.pm===mode));
  const row=document.getElementById('booster-throttle-wrap'); if(row)row.style.display=(mode==='throttle')?'flex':'none';
  if(typeof markLVUserDefined==='function')markLVUserDefined();
  _suppressUD=true; if(typeof buildStageComposition==='function')buildStageComposition();
}
// Restore the mode UI from a loaded vehicle's boosterData (or defaults).
function applyBoosterModeUI(bd){
  const mode=(bd&&bd.parallelMode)||'independent';
  const thrEl=document.getElementById('b_core_throttle');
  if(thrEl&&bd&&isFinite(bd.coreThrottle))thrEl.value=Math.round(bd.coreThrottle*100);
  setBoosterMode(mode);
}
function setRestart(val){restartable=val;document.querySelectorAll('#restart-toggle button').forEach((b,i)=>b.classList.toggle('active',i===(val?0:1)));}
function setTraj(t){trajectory=t;document.querySelectorAll('#traj-toggle button').forEach((b,i)=>b.classList.toggle('active',['direct','two-burn','optimal'][i]===t));drawOrbitDiagram();}
function setDestMode(mode){
  destMode=mode;
  document.getElementById('dest-orbit').style.display=mode==='orbit'?'block':'none';
  document.getElementById('dest-escape').style.display=mode==='escape'?'block':'none';
  document.getElementById('mode-orbit-btn').classList.toggle('active',mode==='orbit');
  document.getElementById('mode-escape-btn').classList.toggle('active',mode==='escape');
  drawOrbitDiagram();
}
