
// ─── USER-DEFINED TRACKING ────────────────────
function markOrbitUserDefined(){
  if(activeOrbitKey!=='user_defined_orbit'){activeOrbitKey='user_defined_orbit';userDefinedOrbit=true;buildOrbitCategories();}
  drawOrbitDiagram();
}
function markLVUserDefined(){
  if(!_suppressUD&&activePresetKey!=='user_defined'){activePresetKey='user_defined';userDefinedLV=true;buildPresets();}
}
