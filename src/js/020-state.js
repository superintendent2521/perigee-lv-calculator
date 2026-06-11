
// ─── STATE ────────────────────────────────────
let numStages=1,useBooster=false,restartable=false,trajectory='two-burn',destMode='orbit';
let activePresetKey=null,activeOrbitKey=null;
let userDefinedLV=false,userDefinedOrbit=false;
let _suppressUD=false;
let lastResult=null;
const stageStore={};
