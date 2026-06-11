
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
  _suppressUD=true;
  buildTable();
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
