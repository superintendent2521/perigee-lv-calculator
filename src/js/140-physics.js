
// ─── PHYSICS ──────────────────────────────────
function circVel(alt){return Math.sqrt(MU/(RE+alt))*1000;}
function rotVel(lat,azMin,azMax){
  const Vm=OMEGA_E*RE*1000*Math.cos(lat*Math.PI/180);
  let best=0;[azMin,azMax,90].forEach(az=>{const c=Vm*Math.cos((az-90)*Math.PI/180);if(c>best)best=c;});
  return Math.max(0,Math.min(best,Vm));
}
function rocketEq(isp,m0,mf){return(mf<=0||m0<=mf)?0:G0*isp*Math.log(m0/mf);}
function gv(id){return parseFloat(document.getElementById(id)?.value)||0;}

// ── Shared launch performance (Townsend-Schilling) — single source of truth for
//    BOTH the LV calculator (evalAtPayload) and the Program/mission launch. Pure: no
//    DOM. stages = [{dry,prop,thrust,isp,res}] bottom→top; booster =
//    {dry,prop,thrust,isp,res,count} or null. Masses kg, thrust kN, Isp s, res %.
//    Ta (ascent time feeding the penalty) = burn time only up to circular velocity,
//    so low-thrust upper stages aren't over-charged for gravity/drag losses.
function lvPerformance(stages, booster, pay, fairingMass, fairingJ, parkingAlt, onOrbitDV, siteLat, azMin, azMax){
  const n=stages.length;
  const Vcirc=circVel(parkingAlt), Vrot=rotVel(siteLat,azMin,azMax), Hp=parkingAlt;
  const K3=429.9+1.602*Hp+1.224e-3*Hp*Hp, K4=2.328-9.687e-4*Hp;
  let tThr=(stages[0]?stages[0].thrust:0)*1000;
  if(booster)tThr+=booster.thrust*1000*booster.count;
  const spM=new Array(n).fill(0); let abv=pay;
  for(let s=n-1;s>=0;s--){spM[s]=abv+((fairingJ>0&&s<fairingJ)?fairingMass:0);abv+=stages[s].dry+stages[s].prop;}
  const sDVs=[],sBTs=[]; let tDV=0,tBT=0;
  for(let s=0;s<n;s++){
    const sd=stages[s],up=sd.prop*(1-(sd.res||0)/100),pa=spM[s];
    const m0=sd.dry+up+pa,mf=sd.dry+pa;
    if(m0<=0||mf<=0||m0<=mf){sDVs.push(0);sBTs.push(0);continue;}
    const dv=rocketEq(sd.isp,m0,mf),mflow=(sd.thrust*1000)/(G0*sd.isp),bt=mflow>0?up/mflow:0;
    sDVs.push(dv);sBTs.push(bt);tDV+=dv;tBT+=bt;
  }
  if(booster){
    const nB=booster.count,s1=stages[0],pa0=spM[0];
    const upB=booster.prop*(1-(booster.res||0)/100)*nB,upS1=s1.prop*(1-(s1.res||0)/100);
    const mBW=(booster.dry+booster.prop)*nB,m0c=s1.dry+s1.prop+mBW+pa0;
    const mfB=booster.thrust*1000*nB,mfS1=s1.thrust*1000;
    const btB=upB/(mfB/G0/booster.isp);
    const pc1=Math.min((mfS1/G0/s1.isp)*btB,upS1),mfc=m0c-upB-pc1;
    const ieff=(booster.isp*(mfB/G0/booster.isp)+s1.isp*(mfS1/G0/s1.isp))/((mfB/G0/booster.isp)+(mfS1/G0/s1.isp));
    const dvbp=rocketEq(ieff,m0c,mfc),rs1=upS1-pc1;
    const m0s1a=mfc-booster.dry*nB,mfs1a=Math.max(m0s1a-rs1,s1.dry+pa0);
    const dvs1a=rocketEq(s1.isp,m0s1a,mfs1a),bts1a=rs1/Math.max(mfS1/G0/s1.isp,0.001);
    sDVs[0]=dvbp+dvs1a;sBTs[0]=btB+bts1a;
    tDV=sDVs.reduce((a,b)=>a+b,0);tBT=sBTs.reduce((a,b)=>a+b,0);
  }
  const tMas=stages.reduce((a,s)=>a+s.dry+s.prop,0)+pay+fairingMass+(booster?(booster.dry+booster.prop)*booster.count:0);
  const A0=tThr/Math.max(tMas,1);
  const avgIsp=sBTs.reduce((a,bt,i)=>a+stages[i].isp*bt,0)/Math.max(tBT,1);
  const T3s=3*(1-Math.exp(-0.333*Vcirc/(G0*avgIsp)))*G0*avgIsp/Math.max(A0,0.01);
  // Ta = burn time to reach circular velocity (not the full burn of every stage)
  let Ta=0,cum=0;
  for(let s=0;s<n;s++){const dv=sDVs[s],bt=sBTs[s];if(dv<=0)continue;
    if(cum+dv>=Vcirc){const need=Vcirc-cum,isp=stages[s].isp||1;
      const fr=(1-Math.exp(-need/(G0*isp)))/Math.max(1e-9,1-Math.exp(-dv/(G0*isp)));
      Ta+=bt*Math.min(1,Math.max(0,fr));cum=Vcirc;break;}
    Ta+=bt;cum+=dv;}
  if(cum<Vcirc)Ta=tBT;
  const Tmix=0.405*Ta+0.595*T3s, DVpen=K3+K4*Tmix;
  const DVasc=Vcirc+DVpen-Vrot, DVtot=DVasc+(onOrbitDV||0), margin=tDV-DVtot;
  return{sDVs,sBTs,tDV,tBT,Ta,Tmix,DVpen,DVasc,DVtot,margin,tMas,A0,avgIsp,Vcirc,Vrot};
}

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
