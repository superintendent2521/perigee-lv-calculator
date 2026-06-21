
// ─── INIT ────────────────────────────────────────
buildTable();
buildPresets();
buildOrbitCategories();
buildSiteSelector();
buildStageLibrary();
buildCaseList();
updateFilterChips();
loadPersistedUserSpaceports();
initSiteMap();
initOrbitDiagram();
applyTheme('perigee');
_initVersionUI();
scEdInit();
fleetInit();
missionInit();
// Initialise default active program with demo pads
(function(){
  const p = progMakeProgram('New Program');
  p.pads = [
    progMakePad('LC-39A',     '39A', 'KSC',  72),
    progMakePad('LC-39B',     '39B', 'KSC',  72),
    progMakePad('Baikonur 1', 'BK1', 'BK',   48),
    progMakePad('Vandenberg', 'SLC', 'VAFB', 48),
  ];
  PROG_ACTIVE_PROGRAM = p;
})();

// Delegated listeners for user-defined tracking
document.getElementById('stage-tbody').addEventListener('input',e=>{
  if(_suppressUD)return;
  // Clear the library name for the column being manually edited
  const td=e.target.closest('td');
  const tr=e.target.closest('tr');
  if(td&&tr){
    const colIdx=[...tr.cells].indexOf(td)-1; // -1 for label column
    if(colIdx>=0&&colIdx<15){currentStageNames[colIdx]=null;stageSaved[colIdx]=false;}
    buildStageComposition();
  }
  markLVUserDefined();
});
['fairing-mass','fairing-jettison','b_dry','b_prop','b_thrust','b_isp','b_res','num-boosters'].forEach(id=>{
  const el=document.getElementById(id);
  if(el)el.addEventListener('change',()=>markLVUserDefined());
});
