
// ─── CALCULATE ────────────────────────────────
function calculate(){
  const invalidMath=[...document.querySelectorAll('#stage-tbody .math-input')].find(input=>!commitMathInput(input));
  if(invalidMath){invalidMath.reportValidity();return;}
  saveStoreFromDOM();
  const panel=document.getElementById('results-panel');
  showPage('results');
  try{
    const fairingM=gv('fairing-mass');
    const fairingJ=parseInt(document.getElementById('fairing-jettison').value);
    const siteLat=gv('site-lat'),azMin=gv('az-min'),azMax=gv('az-max');
    const stages=[];
    for(let s=0;s<numStages;s++)stages.push({dry:gv(`s${s+1}_dry`),prop:gv(`s${s+1}_prop`),thrust:gv(`s${s+1}_thrust`),isp:parseFloat(document.getElementById(`s${s+1}_isp`).value)||1,res:gv(`s${s+1}_res`)});
    let booster=null;
    if(useBooster){
      booster={dry:gv('b_dry'),prop:gv('b_prop'),thrust:gv('b_thrust'),isp:parseFloat(document.getElementById('b_isp').value)||1,res:gv('b_res'),count:parseInt(document.getElementById('num-boosters').value)||0,...boosterModeFromDOM()};
      if(booster.count<1){panel.innerHTML='<div class="error-msg">// ERROR: Set booster count > 0.</div>';return;}
    }
    // full booster-group list (primary + any additional / air-lit groups) for the shared math
    const boosterArg = useBooster ? lvBoosterGroups() : null;

    let parkingAlt,onOrbitDV=0,modeLabel;

    if(destMode==='escape'){
      const c3=gv('c3'),decl=gv('decl'),escPeri=gv('escape-perigee');
      parkingAlt=escPeri;
      const Vesc2=2*MU/(RE+parkingAlt);
      if(c3<-Vesc2){panel.innerHTML=`<div class="error-msg">// ERROR: C3=${c3} km²/s² below minimum (${(-Vesc2).toFixed(1)}) for ${parkingAlt} km orbit.</div>`;return;}
      const Vh=Math.sqrt(Vesc2+c3);
      onOrbitDV=(Vh-Math.sqrt(MU/(RE+parkingAlt)))*1000;
      const ds=Math.max(0,Math.abs(siteLat)-Math.abs(decl)-0.5);
      if(ds>0){onOrbitDV+=2*circVel(parkingAlt)*Math.sin(ds*Math.PI/360);}
      modeLabel=`C3 = ${c3} km²/s²`;
    } else {
      const apogee=gv('apogee'),perigee=gv('perigee'),inc=gv('inclination');
      parkingAlt=gv('parking-alt');
      const rPk=RE+parkingAlt,rAp=RE+apogee,rPe=RE+perigee;
      const Vc_park=Math.sqrt(MU/rPk);
      const vPeri=(rp,ra)=>Math.sqrt(2*MU*ra/(rp*(rp+ra)));
      const vApo=(rp,ra)=>Math.sqrt(2*MU*rp/(ra*(rp+ra)));
      const destIsCirc=Math.abs(apogee-perigee)<5;
      const destIsPark=Math.abs(apogee-parkingAlt)<5&&Math.abs(perigee-parkingAlt)<5;
      const needsPlane=inc<Math.abs(siteLat)-0.5;
      const planeAngle=needsPlane?(Math.abs(siteLat)-inc)*Math.PI/180:0;
      if(destIsPark){
        onOrbitDV=0;
      }else if(destIsCirc){
        const dv1=Math.abs(vPeri(rPk,rAp)-Vc_park)*1000;
        if(needsPlane&&apogee>10000){
          const va=vApo(rPk,rAp)*1000,vc=Math.sqrt(MU/rAp)*1000;
          onOrbitDV=dv1+Math.sqrt(va*va+vc*vc-2*va*vc*Math.cos(planeAngle));
        }else{
          onOrbitDV=dv1+Math.abs(Math.sqrt(MU/rAp)-vApo(rPk,rAp))*1000;
          if(needsPlane)onOrbitDV+=2*Vc_park*1000*Math.sin(planeAngle/2);
        }
      }else{
        const dv1=Math.abs(vPeri(rPk,rAp)-Vc_park)*1000;
        const dv2=Math.abs(perigee-parkingAlt)<50?0:Math.abs(vApo(rPe,rAp)-vApo(rPk,rAp))*1000;
        onOrbitDV=dv1+dv2;
        if(needsPlane)onOrbitDV+=2*Vc_park*1000*Math.sin(planeAngle/2);
      }
      modeLabel=`${apogee}×${perigee} km @ ${inc}°`;
    }

    const Vcirc=circVel(parkingAlt),Vrot=rotVel(siteLat,azMin,azMax);
    const Hp=parkingAlt;
    const K3=429.9+1.602*Hp+1.224e-3*Hp*Hp,K4=2.328-9.687e-4*Hp;

    // Delegates to the shared lvPerformance() so the LV calculator and the Program
    // section compute launch performance from the SAME math (incl. the corrected Ta).
    // A0 = liftoff thrust / total mass (ground-lit boosters only) → TWR = A0/G0.
    function evalAtPayload(pay){
      const r=lvPerformance(stages,boosterArg,pay,fairingM,fairingJ,parkingAlt,onOrbitDV,siteLat,azMin,azMax);
      return{sDVs:r.sDVs,sBTs:r.sBTs,tDV:r.tDV,tBT:r.tBT,Ta_:r.Ta,tMas_:r.tMas,A0_:r.A0,Tmix_:r.Tmix,DVpen_:r.DVpen,DVasc_:r.DVasc,DVtot_:r.DVtot,margin_:r.margin};
    }

    const r0=evalAtPayload(0);
    // shared max-payload search (same code the Program uses)
    const maxPay=lvMaxPayload(stages,boosterArg,fairingM,fairingJ,parkingAlt,onOrbitDV,siteLat,azMin,azMax);

    const res=evalAtPayload(maxPay);
    const stageDVs=res.sDVs,stageBTs=res.sBTs;
    const totDV=res.tDV,totBT=res.tBT;
    const DVpen=res.DVpen_,DVasc=res.DVasc_,DVtot=res.DVtot_,DVmarg=res.margin_,Tmix=res.Tmix_,tMas=res.tMas_;
    const feasible=r0.margin_>=-50;
    const TWR=res.A0_/G0;   // liftoff T:W from the shared math (all ground-lit boosters + core)

    lastResult={modeLabel,maxPayload:maxPay,feasible,totalDV:totDV,DVasc,onOrbitDV,DVtot,DVmarg,DVpen,Vrot,TWR,totBT,ascentTime:res.Ta_,Tmix,stageDVs:[...stageDVs],destMode,boosterMode:(useBooster&&booster)?{mode:booster.parallelMode,thr:booster.coreThrottle}:null,orbitParams:destMode==='orbit'?{apogee:gv('apogee'),perigee:gv('perigee'),inc:gv('inclination'),parkingAlt}:{c3:gv('c3'),decl:gv('decl'),perigee:gv('escape-perigee')}};
    const _spb2=document.getElementById('save-case-btn');if(_spb2)_spb2.disabled=false;

    renderResults(lastResult);

  }catch(e){panel.innerHTML=`<div class="error-msg">// CALCULATION ERROR: ${e.message}</div>`;console.error(e);}
}

function renderResults(r){
  const panel=document.getElementById('results-panel');
  if(!panel||!r)return;
  const {modeLabel,maxPayload:maxPay,feasible,totalDV:totDV,DVasc,onOrbitDV,DVtot,DVmarg,DVpen,Vrot,TWR,totBT,ascentTime,Tmix,stageDVs,destMode,boosterMode}=r;
  const bmBadge = (boosterMode && boosterMode.mode === 'crossfeed')
    ? `<span style="font-family:var(--mono);font-size:9px;letter-spacing:.08em;padding:1px 6px;margin-left:6px;border:1px solid var(--accent3);color:var(--accent3)">CROSSFEED</span>`
    : (boosterMode && boosterMode.mode === 'throttle')
    ? `<span style="font-family:var(--mono);font-size:9px;letter-spacing:.08em;padding:1px 6px;margin-left:6px;border:1px solid var(--accent3);color:var(--accent3)">THROTTLE ${Math.round((boosterMode.thr||0)*100)}%</span>`
    : '';
  const fD=v=>(v/1000).toFixed(3)+' km/s';
  const fRenderM=v=>Math.round(v).toLocaleString()+' kg';
  const fS=v=>Math.round(v)+' s';
  const dvMax=Math.max(...stageDVs,1);
  const bars=stageDVs.map((dv,i)=>`<div style="margin-bottom:4px;"><div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-bottom:2px;">STG ${i+1}</div><div class="dv-bar"><div class="dv-bar-fill" style="width:${Math.min(100,dv/dvMax*100)}%"></div></div></div>`).join('');
  const bdown=stageDVs.map((dv,i)=>`<div class="breakdown-row"><span>Stage ${i+1}</span><span>${fD(dv)}</span></div>`).join('');
  const badge=destMode==='escape'?'<span class="escape-badge">ESCAPE</span>':'';
  panel.innerHTML=`
    <div class="result-row"><span class="result-label">Target${badge}${bmBadge}</span><span class="result-val" style="font-size:11px;color:var(--text-dim)">${modeLabel}</span></div>
    <div class="result-row"><span class="result-label">Est. Max Payload</span><span class="result-val ${maxPay>0?'hl':'neg'}">${fRenderM(maxPay)}</span></div>
    <div class="result-row"><span class="result-label">Capacity Range (±10%)</span><span class="result-val" style="font-size:11px;">${maxPay>0?fRenderM(maxPay*.9)+' – '+fRenderM(maxPay*1.1):'—'}</span></div>
    <div class="result-row"><span class="result-label">Mission Feasible?</span><span class="result-val ${feasible?'':'neg'}">${feasible?'✓ YES':'✗ NO'}</span></div>
    <div class="result-row"><span class="result-label">Total ΔV Available</span><span class="result-val">${fD(totDV)}</span></div>
    <div class="result-row"><span class="result-label">ΔV Required (ascent to park)</span><span class="result-val">${fD(DVasc)}</span></div>
    <div class="result-row"><span class="result-label">ΔV Required (${destMode==='escape'?'injection':'on-orbit'})</span><span class="result-val">${fD(onOrbitDV)}</span></div>
    <div class="result-row"><span class="result-label">ΔV Required (total)</span><span class="result-val">${fD(DVtot)}</span></div>
    <div class="result-row"><span class="result-label">ΔV Margin</span><span class="result-val ${DVmarg>=0?'':'neg'}">${fD(DVmarg)}</span></div>
    <div class="result-row"><span class="result-label">Ascent Penalty (ΔVpen)</span><span class="result-val warn">${fD(DVpen)}</span></div>
    <div class="result-row"><span class="result-label">Earth Rotation Gain</span><span class="result-val">${fD(Vrot)}</span></div>
    <div class="result-row"><span class="result-label">Launch T:W Ratio</span><span class="result-val ${TWR>=1.2?'':'neg'}">${TWR.toFixed(3)}</span></div>
    <div class="result-row"><span class="result-label">Ascent Time (to orbit)</span><span class="result-val">${fS(ascentTime!=null?ascentTime:totBT)}</span></div>
    <div class="result-row"><span class="result-label">Total Burn Time</span><span class="result-val">${fS(totBT)}</span></div>
    <div class="result-row"><span class="result-label">Mixed Ascent Time (Tmix)</span><span class="result-val">${fS(Tmix)}</span></div>
    <div class="stage-breakdown" style="margin-top:14px;">
      <div class="sl" style="margin-bottom:8px;">Stage ΔV Breakdown</div>
      ${bars}${bdown}
    </div>
    <div class="note">Method: Townsend-Schilling (2009). RMS ~260 m/s; &lt;10% payload error.<br>${destMode==='escape'?'Escape: hyperbolic injection Vinj=√(Vesc²+C3).':'Orbit: verified Hohmann from parking orbit.'} Always use vacuum Isp.</div>`;
}
