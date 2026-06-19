
// ─── STATE ────────────────────────────────────
let numStages=1,useBooster=false,restartable=false,trajectory='two-burn',destMode='orbit';
let activePresetKey=null,activeOrbitKey=null;
let userDefinedLV=false,userDefinedOrbit=false;
let _suppressUD=false;
let lastResult=null;
const stageStore={};
// Additional strap-on booster groups beyond the primary (Group 1 = the existing booster
// inputs, always ground-lit). Each: {dry,prop,thrust,isp,res,count,parallelMode,coreThrottle,ignition}
// ignition: 'ground' | {after:groupIndex} | {atTime:seconds}.  Group indices: 0 = primary, 1.. = these.
let _extraBoosterGroups=[];
