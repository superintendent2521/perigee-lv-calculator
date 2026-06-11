
// ─── STAGE CARD SAVE ──────────────────────────
function saveStageCardAsFile(stageIdx,isBooster){
  let stage;
  if(isBooster){
    stage={
      name:currentBoosterName||'Strap-on Booster',
      dry:parseFloat(document.getElementById('b_dry')?.value)||0,
      prop:parseFloat(document.getElementById('b_prop')?.value)||0,
      thrust:parseFloat(document.getElementById('b_thrust')?.value)||0,
      isp:parseFloat(document.getElementById('b_isp')?.value)||0,
      res:parseFloat(document.getElementById('b_res')?.value)||2,
      isBooster:true,_userGenerated:true,
    };
    boosterSaved=true;
  } else {
    const store=stageStore[stageIdx]||{};
    stage={
      name:currentStageNames[stageIdx]||`Stage ${stageIdx+1}`,
      dry:parseFloat(store.dry)||0,
      prop:parseFloat(store.prop)||0,
      thrust:parseFloat(store.thrust)||0,
      isp:parseFloat(store.isp)||0,
      res:parseFloat(store.res)||2,
      _userGenerated:true,
    };
    stageSaved[stageIdx]=true;
  }
  const fname=stage.name.replace(/[^a-z0-9_-]/gi,'_').toLowerCase()+'_stage.json';
  downloadJSON(stage,fname);
  buildStageComposition();
}
