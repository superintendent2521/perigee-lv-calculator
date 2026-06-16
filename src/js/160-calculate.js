
// ─── CALCULATE ────────────────────────────────
function calculate(){
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
      booster={dry:gv('b_dry'),prop:gv('b_prop'),thrust:gv('b_thrust'),isp:parseFloat(document.getElementById('b_isp').value)||1,res:gv('b_res'),count:parseInt(document.getElementById('num-boosters').value)||0};
      if(booster.count<1){panel.innerHTML='<div class="error-msg">// ERROR: Set booster count > 0.</div>';return;}
    }

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
    let tThr=stages[0].thrust*1000;
    if(useBooster&&booster)tThr+=booster.thrust*1000*booster.count;

    function evalAtPayload(pay){
      let spM=new Array(numStages).fill(0),abv=pay;
      for(let s=numStages-1;s>=0;s--){spM[s]=abv+((fairingJ>0&&s<fairingJ)?fairingM:0);abv+=stages[s].dry+stages[s].prop;}
      let sDVs=[],sBTs=[],tDV=0,tBT=0;
      for(let s=0;s<numStages;s++){
        const sd=stages[s],up=sd.prop*(1-sd.res/100),pa=spM[s];
        const m0=sd.dry+up+pa,mf=sd.dry+pa;
        if(m0<=0||mf<=0||m0<=mf){sDVs.push(0);sBTs.push(0);continue;}
        const dv=rocketEq(sd.isp,m0,mf);
        const mflow=(sd.thrust*1000)/(G0*sd.isp);
        const bt=mflow>0?up/mflow:0;
        sDVs.push(dv);sBTs.push(bt);tDV+=dv;tBT+=bt;
      }
      if(useBooster&&booster){
        const nB=booster.count,s1=stages[0],pa0=spM[0];
        const upB=booster.prop*(1-booster.res/100)*nB,upS1=s1.prop*(1-s1.res/100);
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
      const tMas_=stages.reduce((a,s)=>a+s.dry+s.prop,0)+pay+fairingM+(useBooster&&booster?(booster.dry+booster.prop)*booster.count:0);
      const A0_=tThr/Math.max(tMas_,1);
      const avgIsp_=sBTs.reduce((a,bt,i)=>a+stages[i].isp*bt,0)/Math.max(tBT,1);
      const T3s_=3*(1-Math.exp(-0.333*Vcirc/(G0*avgIsp_)))*G0*avgIsp_/Math.max(A0_,0.01);
      // Townsend ascent time Ta = time to accelerate to local CIRCULAR ORBIT VELOCITY,
      // NOT the full burn of every stage. A low-thrust / high-Isp upper stage keeps firing
      // long after reaching orbital velocity to add ΔV efficiently in vacuum (past the
      // high-loss regime); counting that as "ascent" over-states gravity/drag losses and
      // badly under-predicts payload. Accumulate burn time only until cumulative ΔV reaches
      // Vcirc, partial-counting the stage that crosses it (burn time ∝ propellant mass).
      let Ta_=0,cumDV_=0;
      for(let s=0;s<numStages;s++){
        const dv=sDVs[s],bt=sBTs[s];if(dv<=0)continue;
        if(cumDV_+dv>=Vcirc){const need=Vcirc-cumDV_,isp=stages[s].isp||1;
          const fr=(1-Math.exp(-need/(G0*isp)))/Math.max(1e-9,1-Math.exp(-dv/(G0*isp)));
          Ta_+=bt*Math.min(1,Math.max(0,fr));cumDV_=Vcirc;break;}
        Ta_+=bt;cumDV_+=dv;
      }
      if(cumDV_<Vcirc)Ta_=tBT;   // can't reach orbit on its own → fall back to full burn
      const Tmix_=0.405*Ta_+0.595*T3s_;
      const DVpen_=K3+K4*Tmix_;
      const DVasc_=Vcirc+DVpen_-Vrot;
      const DVtot_=DVasc_+onOrbitDV;
      const margin_=tDV-DVtot_;
      return{sDVs,sBTs,tDV,tBT,Ta_,tMas_,Tmix_,DVpen_,DVasc_,DVtot_,margin_};
    }

    let lo=0,hi=2000000,maxPay=0;
    const r0=evalAtPayload(0);
    if(r0.margin_>=0){
      for(let i=0;i<40;i++){const mid=(lo+hi)/2;const rm=evalAtPayload(mid);if(rm.margin_>0)lo=mid;else hi=mid;if(hi-lo<1)break;}
      maxPay=lo;
    }

    const res=evalAtPayload(maxPay);
    const stageDVs=res.sDVs,stageBTs=res.sBTs;
    const totDV=res.tDV,totBT=res.tBT;
    const DVpen=res.DVpen_,DVasc=res.DVasc_,DVtot=res.DVtot_,DVmarg=res.margin_,Tmix=res.Tmix_,tMas=res.tMas_;
    const feasible=r0.margin_>=-50;
    const TWR=tThr/(tMas*G0);

    lastResult={modeLabel,maxPayload:maxPay,feasible,totalDV:totDV,DVasc,onOrbitDV,DVtot,DVmarg,DVpen,Vrot,TWR,totBT,ascentTime:res.Ta_,Tmix,stageDVs:[...stageDVs],destMode,orbitParams:destMode==='orbit'?{apogee:gv('apogee'),perigee:gv('perigee'),inc:gv('inclination'),parkingAlt}:{c3:gv('c3'),decl:gv('decl'),perigee:gv('escape-perigee')}};
    const _spb2=document.getElementById('save-case-btn');if(_spb2)_spb2.disabled=false;

    renderResults(lastResult);

  }catch(e){panel.innerHTML=`<div class="error-msg">// CALCULATION ERROR: ${e.message}</div>`;console.error(e);}
}

function renderResults(r){
  const panel=document.getElementById('results-panel');
  if(!panel||!r)return;
  const {modeLabel,maxPayload:maxPay,feasible,totalDV:totDV,DVasc,onOrbitDV,DVtot,DVmarg,DVpen,Vrot,TWR,totBT,ascentTime,Tmix,stageDVs,destMode}=r;
  const fD=v=>(v/1000).toFixed(3)+' km/s';
  const fRenderM=v=>Math.round(v).toLocaleString()+' kg';
  const fS=v=>Math.round(v)+' s';
  const dvMax=Math.max(...stageDVs,1);
  const bars=stageDVs.map((dv,i)=>`<div style="margin-bottom:4px;"><div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-bottom:2px;">STG ${i+1}</div><div class="dv-bar"><div class="dv-bar-fill" style="width:${Math.min(100,dv/dvMax*100)}%"></div></div></div>`).join('');
  const bdown=stageDVs.map((dv,i)=>`<div class="breakdown-row"><span>Stage ${i+1}</span><span>${fD(dv)}</span></div>`).join('');
  const badge=destMode==='escape'?'<span class="escape-badge">ESCAPE</span>':'';
  panel.innerHTML=`
    <div class="result-row"><span class="result-label">Target${badge}</span><span class="result-val" style="font-size:11px;color:var(--text-dim)">${modeLabel}</span></div>
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
