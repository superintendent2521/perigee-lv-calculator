
// ─── PHYSICS ──────────────────────────────────
function circVel(alt){return Math.sqrt(MU/(RE+alt))*1000;}
function rotVel(lat,azMin,azMax){
  const Vm=OMEGA_E*RE*1000*Math.cos(lat*Math.PI/180);
  let best=0;[azMin,azMax,90].forEach(az=>{const c=Vm*Math.cos((az-90)*Math.PI/180);if(c>best)best=c;});
  return Math.max(0,Math.min(best,Vm));
}
function rocketEq(isp,m0,mf){return(mf<=0||m0<=mf)?0:G0*isp*Math.log(m0/mf);}
function gv(id){return parseFloat(document.getElementById(id)?.value)||0;}

function collectVehicle(){
  saveStoreFromDOM();
  const stages=[];
  for(let s=0;s<numStages;s++){
    const sd=stageStore[s]||{};
    const st={dry:parseFloat(sd.dry)||0,prop:parseFloat(sd.prop)||0,thrust:parseFloat(sd.thrust)||0,isp:parseFloat(sd.isp)||1,res:parseFloat(sd.res)||0};
    // Persist S1.5 fields so they survive save/load
    if(sd.s15){st.s15=true;st.s15_sust_thrust=sd.s15_sust_thrust||0;st.s15_sust_isp=sd.s15_sust_isp||0;st.s15_jet_mass=sd.s15_jet_mass||0;st.s15_beco_twr=sd.s15_beco_twr||1.2;}
    stages.push(st);
  }
  const booster=useBooster?{dry:gv('b_dry'),prop:gv('b_prop'),thrust:gv('b_thrust'),isp:parseFloat(document.getElementById('b_isp').value)||1,res:gv('b_res'),count:parseInt(document.getElementById('num-boosters').value)||0}:null;
  return{name:'',note:'',stages:numStages,boosters:useBooster,restartable,stageData:stages,boosterData:booster,payload:gv('payload-mass'),fairingMass:gv('fairing-mass'),fairingJettison:parseInt(document.getElementById('fairing-jettison').value),site:{lat:gv('site-lat'),azMin:gv('az-min'),azMax:gv('az-max')},mode:destMode,orbit:destMode==='orbit'?{apogee:gv('apogee'),perigee:gv('perigee'),inc:gv('inclination')}:null,escape:destMode==='escape'?{c3:gv('c3'),decl:gv('decl'),perigee:gv('escape-perigee')}:null,trajectory,parkingAlt:destMode==='orbit'?gv('parking-alt'):gv('escape-perigee')};
}
