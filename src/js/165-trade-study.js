
// ─── TRADE STUDY ──────────────────────────────
// Sweep-chart panel for the Results page. Reuses the pure math in 140-physics.js
// (lvPerformance / lvMaxPayload) — never touches calculate()/evalAtPayload(). Reads
// the CURRENT vehicle + destination straight off the DOM (own small assembler below,
// deliberately not shared with calculate()'s local closure).
let _tsRunToken=0;   // increments to cancel an in-flight chunked sweep
let _tsResult=null;  // {xLabel,yLabel,xUnit,yUnit,series:[{name,points:[{x,y}]}],zeroLine}
// Vehicle comparison selection: array of {kind:'builtin'|'user', idx, name}. Max 4.
// The current DOM vehicle is always series 0 and is NOT stored in this array.
let _tsCompareVehicles=[];
const TS_MAX_COMPARE=4;
const TS_SERIES_COLORS=['var(--accent)','var(--accent2)','var(--accent3)','var(--nm-earth)','var(--nm-lunar)'];

// Trade Studies is now its own always-expanded page (#page-trades). Ensure the
// panel is populated the first time the page is shown.
function tsEnsureRendered(){
  const panel=document.getElementById('ts-panel');
  if(!panel)return;
  if(!panel.innerHTML.trim())tsRenderForm();
}

// Assemble the vehicle/site/booster args the same way calculate() does, from the DOM.
function _tsCollectBase(){
  const fairingM=gv('fairing-mass');
  const fairingJ=parseInt(document.getElementById('fairing-jettison').value);
  const siteLat=gv('site-lat'),azMin=gv('az-min'),azMax=gv('az-max');
  const stages=[];
  for(let s=0;s<numStages;s++)stages.push({dry:gv(`s${s+1}_dry`),prop:gv(`s${s+1}_prop`),thrust:gv(`s${s+1}_thrust`),isp:parseFloat(document.getElementById(`s${s+1}_isp`).value)||1,res:gv(`s${s+1}_res`)});
  const boosterArg=useBooster?lvBoosterGroups():null;
  const parkingAlt=destMode==='orbit'?gv('parking-alt'):gv('escape-perigee');
  const payload=gv('payload-mass');
  return{fairingM,fairingJ,siteLat,azMin,azMax,stages,boosterArg,parkingAlt,payload};
}

// On-orbit ΔV for the CURRENT DOM target, replicated minimally for a circular orbit
// (matches the destIsCirc/destIsPark branch of calculate() when apogee≈perigee≈parking).
// Not valid for elliptical or escape targets — callers must not use this off that path.
function _tsOnOrbitDVCircular(parkingAlt,inc,siteLat){
  const rPk=RE+parkingAlt;
  const Vc=Math.sqrt(MU/rPk)*1000;
  const needsPlane=inc<Math.abs(siteLat)-0.5;
  if(!needsPlane)return 0;
  const planeAngle=(Math.abs(siteLat)-inc)*Math.PI/180;
  return 2*Vc*Math.sin(planeAngle/2);
}

const TS_VARS={
  altitude:{label:'Parking Altitude',unit:'km',from:200,to:2000,dom:'parking-alt'},
  inclination:{label:'Inclination',unit:'deg',from:0,to:90,dom:'inclination'},
  payload:{label:'Payload Mass',unit:'kg',from:0,to:20000,dom:'payload-mass'},
  destination:{label:'Destination',unit:'',from:0,to:0,dom:null},
};

// Destination sweep: which destinations are enabled. Keyed by `${planet}::${name}`.
// Populated lazily on first render of the destination picker (Earth checked by default).
let _tsDestEnabled=null;

function _tsDestKey(planet,name){return planet+'::'+name;}

function _tsInitDestEnabled(){
  if(_tsDestEnabled)return;
  _tsDestEnabled=new Set();
  ORBIT_CATEGORIES.forEach(cat=>{
    if(cat.planet==='Earth'){
      cat.orbits.forEach(o=>_tsDestEnabled.add(_tsDestKey(cat.planet,o.name)));
    }
  });
}

function tsRenderForm(){
  const panel=document.getElementById('ts-panel');
  if(!panel)return;
  _tsInitDestEnabled();
  panel.innerHTML=`
    <div style="border:1px solid var(--border);padding:10px;">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:10px;">
        <div>
          <div class="sl" style="margin-bottom:4px;">Sweep Variable</div>
          <select id="ts-var" onchange="tsOnVarChange()" style="font-family:var(--mono);font-size:11px;background:var(--panel);color:var(--text-bright);border:1px solid var(--border-bright);padding:5px 8px;">
            <option value="altitude">Parking Altitude (km)</option>
            <option value="inclination">Inclination (deg)</option>
            <option value="payload">Payload Mass (kg)</option>
            <option value="destination">Destination</option>
          </select>
        </div>
        <div id="ts-range-fields" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;">
          <div><div class="sl" style="margin-bottom:4px;">From</div><input id="ts-from" type="number" style="width:90px;font-family:var(--mono);font-size:11px;background:var(--panel);color:var(--text-bright);border:1px solid var(--border-bright);padding:5px 8px;"></div>
          <div><div class="sl" style="margin-bottom:4px;">To</div><input id="ts-to" type="number" style="width:90px;font-family:var(--mono);font-size:11px;background:var(--panel);color:var(--text-bright);border:1px solid var(--border-bright);padding:5px 8px;"></div>
          <div><div class="sl" style="margin-bottom:4px;">Steps</div><input id="ts-steps" type="number" value="20" min="2" max="60" style="width:70px;font-family:var(--mono);font-size:11px;background:var(--panel);color:var(--text-bright);border:1px solid var(--border-bright);padding:5px 8px;"></div>
        </div>
        <button class="act-btn green" onclick="tsRunSweep()">▶ Run Sweep</button>
        <button class="act-btn" id="ts-csv-btn" onclick="tsDownloadCSV()" disabled>Download CSV</button>
      </div>
      <div id="ts-dest-picker" style="display:none;border:1px solid var(--border);padding:8px 10px;margin-bottom:10px;max-height:220px;overflow:auto;"></div>
      <div style="border:1px solid var(--border);padding:8px 10px;margin-bottom:10px;">
        <div class="sl" style="margin-bottom:6px;">Compare Vehicles <span style="color:var(--text-dim);font-weight:normal;">(current vehicle always included, up to ${TS_MAX_COMPARE} more)</span></div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px;">
          <select id="ts-cmp-select" style="font-family:var(--mono);font-size:11px;background:var(--panel);color:var(--text-bright);border:1px solid var(--border-bright);padding:5px 8px;max-width:280px;">
            ${_tsCompareOptionsHTML()}
          </select>
          <button class="act-btn" onclick="tsAddCompareVehicle()">+ Add</button>
        </div>
        <div id="ts-cmp-chips" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
      </div>
      <div id="ts-error" style="color:#ff4444;font-family:var(--mono);font-size:10px;margin-bottom:8px;"></div>
      <div id="ts-note" style="color:var(--text-dim);font-family:var(--mono);font-size:10px;margin-bottom:8px;"></div>
      <div id="ts-progress" style="color:var(--text-dim);font-family:var(--mono);font-size:10px;margin-bottom:8px;"></div>
      <div class="ts-chart-card" id="ts-chart-wrap"></div>
      <div id="ts-table-wrap" style="margin-top:10px;max-height:280px;overflow:auto;"></div>
    </div>`;
  tsOnVarChange();
  tsRenderCompareChips();
}

function _tsDestPickerHTML(){
  let html='';
  ORBIT_CATEGORIES.forEach(cat=>{
    const rows=cat.orbits.map(o=>{
      const key=_tsDestKey(cat.planet,o.name);
      const checked=_tsDestEnabled.has(key)?'checked':'';
      return `<label style="display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10px;color:var(--text-bright);padding:2px 0;cursor:pointer;">
        <input type="checkbox" ${checked} onchange="tsToggleDest('${_tsEsc(key).replace(/'/g,"\\'")}',this.checked)">
        ${_tsEsc(o.name)} <span style="color:var(--text-dim);">${o.mode==='escape'?`C3=${o.c3}`:`${o.apogee}×${o.perigee} km, ${o.inc}°`}</span>
      </label>`;
    }).join('');
    html+=`<div style="margin-bottom:8px;">
      <div class="sl" style="margin-bottom:4px;">${cat.icon} ${_tsEsc(cat.planet)}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:2px 12px;">${rows}</div>
    </div>`;
  });
  return html;
}

function tsToggleDest(key,on){
  if(!_tsDestEnabled)_tsInitDestEnabled();
  if(on)_tsDestEnabled.add(key);else _tsDestEnabled.delete(key);
}

// ── Vehicle comparison: selection UI ──────────

function _tsCompareOptionsHTML(){
  const opts=[];
  (typeof BUILTIN_PRESETS!=='undefined'?BUILTIN_PRESETS:[]).forEach((p,i)=>{
    opts.push(`<option value="builtin:${i}">[Preset] ${_tsEsc(p.name)}</option>`);
  });
  (typeof userLVs!=='undefined'?userLVs:[]).forEach((v,i)=>{
    opts.push(`<option value="user:${i}">[My Stuff] ${_tsEsc(v.name)}</option>`);
  });
  return opts.join('')||'<option disabled>No vehicles available</option>';
}

function _tsEsc(s){return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

function tsAddCompareVehicle(){
  const sel=document.getElementById('ts-cmp-select');
  if(!sel||!sel.value)return;
  if(_tsCompareVehicles.length>=TS_MAX_COMPARE){_tsSetError(`You can compare up to ${TS_MAX_COMPARE} additional vehicles.`);return;}
  const [kind,idxStr]=sel.value.split(':');
  const idx=parseInt(idxStr);
  const src=kind==='builtin'?BUILTIN_PRESETS[idx]:userLVs[idx];
  if(!src)return;
  // Avoid duplicate entries
  if(_tsCompareVehicles.some(cv=>cv.kind===kind&&cv.idx===idx))return;
  _tsCompareVehicles.push({kind,idx,name:src.name||'Unnamed'});
  tsRenderCompareChips();
}

function tsRemoveCompareVehicle(i){
  _tsCompareVehicles.splice(i,1);
  tsRenderCompareChips();
}

function tsRenderCompareChips(){
  const wrap=document.getElementById('ts-cmp-chips');
  if(!wrap)return;
  const curName=(typeof loadedVehicleName!=='undefined'&&loadedVehicleName)?loadedVehicleName:'Worksheet';
  let html=`<span style="display:inline-flex;align-items:center;gap:5px;font-family:var(--mono);font-size:10px;color:var(--text-bright);border:1px solid var(--accent);padding:3px 8px;background:rgba(0,0,0,.2);">
    <span style="width:9px;height:9px;background:${TS_SERIES_COLORS[0]};display:inline-block;"></span>Current: ${_tsEsc(curName)}</span>`;
  _tsCompareVehicles.forEach((cv,i)=>{
    const color=TS_SERIES_COLORS[(i+1)%TS_SERIES_COLORS.length];
    html+=`<span style="display:inline-flex;align-items:center;gap:5px;font-family:var(--mono);font-size:10px;color:var(--text-bright);border:1px solid var(--border-bright);padding:3px 8px;">
      <span style="width:9px;height:9px;background:${color};display:inline-block;"></span>${_tsEsc(cv.name)}
      <span style="cursor:pointer;color:var(--text-dim);" onclick="tsRemoveCompareVehicle(${i})">✕</span></span>`;
  });
  wrap.innerHTML=html;
}

// Convert a saved/preset vehicle object (buildLVObject shape) into the same
// {fairingM,fairingJ,siteLat,azMin,azMax,stages,boosterArg,parkingAlt,payload} bundle
// _tsCollectBase() returns for the current DOM vehicle. Uses the vehicle's OWN
// stages/booster/fairing/site — but callers overlay the swept variable + shared
// orbit params so curves stay comparable (see tsRunSweep).
function _tsVehicleToBase(vehObj){
  const stages=resolvePresetStages(vehObj).map(sd=>({dry:sd.dry,prop:sd.prop,thrust:sd.thrust,isp:sd.isp,res:sd.res??2,
    ...(sd.s15?{s15:true,s15_sust_thrust:sd.s15_sust_thrust||0,s15_sust_isp:sd.s15_sust_isp||0,s15_jet_mass:sd.s15_jet_mass||0,s15_beco_twr:sd.s15_beco_twr||1.2}:{})}));
  // boosterGroups (array, Group 2+) takes precedence like the live-DOM assembler (lvBoosterGroups);
  // fall back to a single resolved boosterData/boosterName group.
  let boosterArg=null;
  if(Array.isArray(vehObj.boosterGroups)&&vehObj.boosterGroups.length){
    boosterArg=vehObj.boosterGroups.map(g=>({...g}));
  }else{
    const b=resolvePresetBooster(vehObj);
    if(b)boosterArg=[{...b}];
  }
  const fairingM=vehObj.fairingMass||0;
  const fairingJ=vehObj.fairingJettison||0;
  const site=vehObj.site||{};
  const siteLat=site.lat??28.5,azMin=site.azMin??37,azMax=site.azMax??112;
  const parkingAlt=vehObj.mode==='orbit'?(vehObj.parkingAlt??(vehObj.orbit?vehObj.orbit.perigee:400)):(vehObj.parkingAlt??(vehObj.escape?vehObj.escape.perigee:185));
  const payload=vehObj.payload||0;
  return{fairingM,fairingJ,siteLat,azMin,azMax,stages,boosterArg,parkingAlt,payload};
}

function tsOnVarChange(){
  const key=document.getElementById('ts-var')?.value||'altitude';
  const v=TS_VARS[key];
  const isDest=key==='destination';
  const rangeEl=document.getElementById('ts-range-fields');
  const pickerEl=document.getElementById('ts-dest-picker');
  if(rangeEl)rangeEl.style.display=isDest?'none':'flex';
  if(pickerEl){
    pickerEl.style.display=isDest?'block':'none';
    if(isDest){_tsInitDestEnabled();pickerEl.innerHTML=_tsDestPickerHTML();}
  }
  if(!isDest){
    const fromEl=document.getElementById('ts-from'),toEl=document.getElementById('ts-to');
    if(fromEl)fromEl.value=v.from;
    if(toEl)toEl.value=v.to;
  }
}

function _tsSetError(msg){
  const el=document.getElementById('ts-error');
  if(el)el.textContent=msg||'';
}

function tsRunSweep(){
  _tsSetError('');
  const key=document.getElementById('ts-var')?.value||'altitude';
  if(key==='destination'){tsRunDestinationSweep();return;}
  const v=TS_VARS[key];
  const from=parseFloat(document.getElementById('ts-from')?.value);
  const to=parseFloat(document.getElementById('ts-to')?.value);
  const steps=parseInt(document.getElementById('ts-steps')?.value);
  if(!Number.isFinite(from)||!Number.isFinite(to)){_tsSetError('From/To must be numbers.');return;}
  if(from>=to){_tsSetError('From must be less than To.');return;}
  if(!Number.isFinite(steps)||steps<2||steps>60){_tsSetError('Steps must be an integer between 2 and 60.');return;}

  const curName=(typeof loadedVehicleName!=='undefined'&&loadedVehicleName)?loadedVehicleName:'Worksheet';
  // Series 0 = current DOM vehicle; series 1..N = selected comparison vehicles.
  const seriesDefs=[{name:'Current: '+curName,base:_tsCollectBase(),isCurrent:true}];
  _tsCompareVehicles.forEach(cv=>{
    const src=cv.kind==='builtin'?BUILTIN_PRESETS[cv.idx]:userLVs[cv.idx];
    if(!src)return;
    seriesDefs.push({name:cv.name,base:_tsVehicleToBase(src),isCurrent:false});
  });

  const xs=[];
  for(let i=0;i<steps;i++)xs.push(from+(to-from)*i/(steps-1));

  const token=++_tsRunToken;
  const noteEl=document.getElementById('ts-note');
  const csvBtn=document.getElementById('ts-csv-btn');
  if(csvBtn)csvBtn.disabled=true;
  _tsResult=null;

  let xLabel=v.label,xUnit=v.unit,yLabel,yUnit,zeroLine=false;

  if(key==='altitude'){
    yLabel='Max Payload';yUnit='kg';
    if(noteEl)noteEl.textContent='Varies: parking/target altitude (circular, apogee=perigee=parking). Holds constant: inclination, payload path, booster, all stage masses (per vehicle). Site latitude/azimuth is per-vehicle. On-orbit ΔV recomputed per point via the minimal circular-orbit plane-change formula (see 165-trade-study.js) — NOT calculate()\'s full elliptical logic.';
  }else if(key==='inclination'){
    yLabel='Max Payload';yUnit='kg';
    if(noteEl)noteEl.textContent='Varies: target inclination at the shared sweep parking altitude (circular orbit assumed). Holds constant: parking altitude, booster, all stage masses (per vehicle). Site latitude/azimuth is per-vehicle. On-orbit ΔV = plane-change only, via the minimal circular-orbit formula — NOT calculate()\'s full elliptical logic.';
  }else{
    yLabel='ΔV Margin';yUnit='m/s';zeroLine=true;
    if(noteEl)noteEl.textContent='Varies: payload mass. Holds constant: parking altitude, inclination (on-orbit ΔV taken from the last Calculate run for the current vehicle, or 0 if none — same fixed value applied to all compared vehicles for a fair x-axis), booster, all stage masses (per vehicle). Site latitude/azimuth is per-vehicle. Uses lvPerformance() margin directly (same math as Calculate).';
  }

  const fixedOnOrbitDV=(key==='payload')?((lastResult&&Number.isFinite(lastResult.onOrbitDV))?lastResult.onOrbitDV:0):null;
  const curInc=gv('inclination');
  // Shared parking altitude for the inclination sweep so all vehicles are compared at the same altitude.
  const sharedParkingAlt=seriesDefs[0].base.parkingAlt;

  const progEl=document.getElementById('ts-progress');
  const series=seriesDefs.map(sd=>({name:sd.name,points:[]}));
  let si=0,i=0;

  function chunk(){
    if(token!==_tsRunToken)return; // superseded by a newer run
    const sd=seriesDefs[si];
    const base=sd.base;
    const pts=series[si].points;
    const end=Math.min(i+5,xs.length);
    for(;i<end;i++){
      const x=xs[i];
      let y;
      if(key==='altitude'){
        const onOrbitDV=_tsOnOrbitDVCircular(x,curInc,base.siteLat);
        y=lvMaxPayload(base.stages,base.boosterArg,base.fairingM,base.fairingJ,x,onOrbitDV,base.siteLat,base.azMin,base.azMax);
      }else if(key==='inclination'){
        const onOrbitDV=_tsOnOrbitDVCircular(sharedParkingAlt,x,base.siteLat);
        y=lvMaxPayload(base.stages,base.boosterArg,base.fairingM,base.fairingJ,sharedParkingAlt,onOrbitDV,base.siteLat,base.azMin,base.azMax);
      }else{
        const r=lvPerformance(base.stages,base.boosterArg,x,base.fairingM,base.fairingJ,base.parkingAlt,fixedOnOrbitDV,base.siteLat,base.azMin,base.azMax);
        y=r.margin;
      }
      pts.push({x,y:Number.isFinite(y)?y:0});
    }
    if(progEl)progEl.textContent=`computing ${sd.name} … ${i}/${xs.length}${seriesDefs.length>1?` (vehicle ${si+1}/${seriesDefs.length})`:''}`;
    if(i<xs.length){
      setTimeout(chunk,0);
    }else if(si<seriesDefs.length-1){
      si++;i=0;
      setTimeout(chunk,0);
    }else{
      if(progEl)progEl.textContent='';
      // Zero-clip capability curves (altitude/inclination): end the polyline at the
      // last positive point, interpolating a clean zero-crossing x. The margin (payload)
      // sweep is exempt — it legitimately has a negative region.
      const clip=(key==='altitude'||key==='inclination');
      _tsResult={xLabel,xUnit,yLabel,yUnit,zeroLine,series,type:'line',clip};
      tsRenderChart(_tsResult);
      tsRenderTable(_tsResult);
      if(csvBtn)csvBtn.disabled=false;
    }
  }
  chunk();
}

// ── Destination sweep (categorical x-axis, grouped bars) ──────────

function tsRunDestinationSweep(){
  _tsInitDestEnabled();
  const selected=[];
  ORBIT_CATEGORIES.forEach(cat=>{
    cat.orbits.forEach(o=>{
      if(_tsDestEnabled.has(_tsDestKey(cat.planet,o.name)))selected.push({planet:cat.planet,...o});
    });
  });
  if(!selected.length){_tsSetError('Select at least one destination.');return;}

  const curName=(typeof loadedVehicleName!=='undefined'&&loadedVehicleName)?loadedVehicleName:'Worksheet';
  const seriesDefs=[{name:'Current: '+curName,base:_tsCollectBase(),isCurrent:true}];
  _tsCompareVehicles.forEach(cv=>{
    const src=cv.kind==='builtin'?BUILTIN_PRESETS[cv.idx]:userLVs[cv.idx];
    if(!src)return;
    seriesDefs.push({name:cv.name,base:_tsVehicleToBase(src),isCurrent:false});
  });

  const token=++_tsRunToken;
  const noteEl=document.getElementById('ts-note');
  const csvBtn=document.getElementById('ts-csv-btn');
  if(csvBtn)csvBtn.disabled=true;
  _tsResult=null;
  if(noteEl)noteEl.textContent='Varies: destination (per ORBIT_CATEGORIES). Holds constant: all stage masses, booster, fairing per vehicle. On-orbit ΔV per destination computed via the pinned pure destOnOrbitDV() (145-dest-dv.js) — same math as the main calculator. Impossible C3 (below escape minimum for the parking perigee) shows payload = 0.';

  const progEl=document.getElementById('ts-progress');
  const series=seriesDefs.map(sd=>({name:sd.name,points:[]}));
  let si=0,i=0;

  function chunk(){
    if(token!==_tsRunToken)return;
    const sd=seriesDefs[si];
    const base=sd.base;
    const pts=series[si].points;
    const end=Math.min(i+3,selected.length);
    for(;i<end;i++){
      const dest=selected[i];
      const destArg=dest.mode==='escape'
        ?{mode:'escape',c3:dest.c3,decl:dest.decl,perigee:dest.parking!=null?dest.parking:(dest.perigee!=null?dest.perigee:185)}
        :{mode:'orbit',apogee:dest.apogee,perigee:dest.perigee,inc:dest.incTracksLat?base.siteLat:dest.inc,parkingAlt:dest.parking!=null?dest.parking:185};
      const r=destOnOrbitDV(destArg,base.siteLat);
      let y=0;
      if(!r.error){
        y=lvMaxPayload(base.stages,base.boosterArg,base.fairingM,base.fairingJ,r.parkingAlt,r.onOrbitDV,base.siteLat,base.azMin,base.azMax);
        if(!Number.isFinite(y)||y<0)y=0;
      }
      pts.push({x:dest.name,y,planet:dest.planet,error:r.error||null});
    }
    if(progEl)progEl.textContent=`computing ${sd.name} … ${i}/${selected.length}${seriesDefs.length>1?` (vehicle ${si+1}/${seriesDefs.length})`:''}`;
    if(i<selected.length){
      setTimeout(chunk,0);
    }else if(si<seriesDefs.length-1){
      si++;i=0;
      setTimeout(chunk,0);
    }else{
      if(progEl)progEl.textContent='';
      const anyNonzero=series.some(s=>s.points.some(p=>p.y>0));
      _tsResult={xLabel:'Destination',xUnit:'',yLabel:'Max Payload',yUnit:'kg',zeroLine:false,series,type:'bar',anyNonzero};
      tsRenderChart(_tsResult);
      tsRenderTable(_tsResult);
      if(csvBtn)csvBtn.disabled=false;
    }
  }
  chunk();
}

function tsRenderTable(res){
  const wrap=document.getElementById('ts-table-wrap');
  if(!wrap)return;
  const n=res.series.length;
  const maxLen=Math.max(...res.series.map(s=>s.points.length));
  let rows='';
  for(let r=0;r<maxLen;r++){
    const xVal=res.series[0].points[r]?res.series[0].points[r].x:null;
    let row=`<td style="padding:3px 10px;border-bottom:1px solid var(--border);">${xVal!=null?_tsFmtX(xVal):'—'}</td>`;
    res.series.forEach(s=>{
      const p=s.points[r];
      const cell=p?(p.error?'—':_tsFmt(p.y)):'—';
      row+=`<td style="padding:3px 10px;border-bottom:1px solid var(--border);" title="${p&&p.error?_tsEsc(p.error):''}">${cell}</td>`;
    });
    rows+=`<tr>${row}</tr>`;
  }
  const unitSuffix=res.yUnit?` (${res.yUnit})`:'';
  const headCols=res.series.map((s,i)=>`<th style="text-align:left;padding:3px 10px;color:${TS_SERIES_COLORS[i%TS_SERIES_COLORS.length]};border-bottom:1px solid var(--border-bright);">${_tsEsc(s.name)} — ${res.yLabel}${unitSuffix}</th>`).join('');
  const xUnitSuffix=res.xUnit?` (${res.xUnit})`:'';
  wrap.innerHTML=`<table style="width:100%;border-collapse:collapse;font-family:var(--mono);font-size:10px;color:var(--text-bright);">
    <thead><tr><th style="text-align:left;padding:3px 10px;color:var(--text-dim);border-bottom:1px solid var(--border-bright);">${res.xLabel}${xUnitSuffix}</th>${headCols}</tr></thead>
    <tbody>${rows}</tbody></table>`;
}

function _tsFmt(v){return Number.isFinite(v)?(Math.abs(v)>=1000?v.toLocaleString(undefined,{maximumFractionDigits:1}):v.toFixed(2)):'—';}
function _tsFmtX(v){return typeof v==='string'?_tsEsc(v):_tsFmt(v);}

function tsRenderChart(res){
  const wrap=document.getElementById('ts-chart-wrap');
  if(!wrap)return;
  if(res.type==='bar'){tsRenderBarChart(res);return;}
  tsRenderLineChart(res);
}

// Zero-clip helper: for each series, walk points in order and stop at the last
// positive y; if the next point is <=0, linear-interpolate the x where y crosses 0
// and append a terminus marker point there instead of continuing the polyline flat.
function _tsClipSeriesAtZero(points){
  const clipped=[];
  let terminus=null;
  for(let i=0;i<points.length;i++){
    const p=points[i];
    if(p.y>0){
      clipped.push(p);
    }else{
      const prev=points[i-1];
      if(prev&&prev.y>0){
        const t=prev.y/(prev.y-p.y);
        const xz=prev.x+(p.x-prev.x)*t;
        terminus={x:xz,y:0};
      }
      break;
    }
  }
  return {clipped,terminus};
}

function tsRenderLineChart(res){
  const wrap=document.getElementById('ts-chart-wrap');
  const W=960,H=340,ML=64,MR=24,MT=16,MB=40;
  const plotW=W-ML-MR,plotH=H-MT-MB;

  // Build per-series render data: clipped points + optional zero-crossing terminus.
  const renderSeries=res.series.map(s=>{
    if(res.clip){
      const {clipped,terminus}=_tsClipSeriesAtZero(s.points);
      return {name:s.name,points:clipped,terminus};
    }
    return {name:s.name,points:s.points,terminus:null};
  });

  const allPts=res.series.flatMap(s=>s.points);
  const xs=allPts.map(p=>p.x),ys=allPts.map(p=>p.y);
  let xMin=Math.min(...xs),xMax=Math.max(...xs);
  let yMin=Math.min(...ys),yMax=Math.max(...ys);
  if(res.zeroLine){yMin=Math.min(yMin,0);yMax=Math.max(yMax,0);}
  if(res.clip)yMin=Math.min(yMin,0);
  if(xMin===xMax){xMin-=1;xMax+=1;}
  if(yMin===yMax){yMin-=1;yMax+=1;}
  const yPad=(yMax-yMin)*0.08||1;
  yMin-=yPad;yMax+=yPad;
  const xToPx=x=>ML+(x-xMin)/(xMax-xMin)*plotW;
  const yToPx=y=>MT+plotH-(y-yMin)/(yMax-yMin)*plotH;

  const nTicks=6;
  let xTicks='',yTicks='';
  for(let i=0;i<=nTicks;i++){
    const xv=xMin+(xMax-xMin)*i/nTicks;
    const px=xToPx(xv);
    xTicks+=`<line x1="${px}" y1="${MT}" x2="${px}" y2="${MT+plotH}" stroke="var(--border)" stroke-width="1"/>`;
    xTicks+=`<text x="${px}" y="${MT+plotH+16}" font-size="9" fill="var(--text-dim)" text-anchor="middle" font-family="var(--mono)">${_tsFmt(xv)}</text>`;
  }
  for(let i=0;i<=nTicks;i++){
    const yv=yMin+(yMax-yMin)*i/nTicks;
    const py=yToPx(yv);
    yTicks+=`<line x1="${ML}" y1="${py}" x2="${ML+plotW}" y2="${py}" stroke="var(--border)" stroke-width="1"/>`;
    yTicks+=`<text x="${ML-6}" y="${py+3}" font-size="9" fill="var(--text-dim)" text-anchor="end" font-family="var(--mono)">${_tsFmt(yv)}</text>`;
  }

  const zero=(res.zeroLine||res.clip)?`<line x1="${ML}" y1="${yToPx(0)}" x2="${ML+plotW}" y2="${yToPx(0)}" stroke="var(--border-bright)" stroke-width="1.5" stroke-dasharray="4,3"/>`:'';

  const polylines=renderSeries.map((s,i)=>{
    const color=TS_SERIES_COLORS[i%TS_SERIES_COLORS.length];
    const linePts=s.terminus?[...s.points,s.terminus]:s.points;
    const pts=linePts.map(p=>`${xToPx(p.x)},${yToPx(p.y)}`).join(' ');
    const line=`<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.75"/>`;
    const dot=s.terminus?`<circle cx="${xToPx(s.terminus.x)}" cy="${yToPx(s.terminus.y)}" r="3.5" fill="var(--panel)" stroke="${color}" stroke-width="1.75"/>`:'';
    return line+dot;
  }).join('');

  const legend=res.series.map((s,i)=>{
    const color=TS_SERIES_COLORS[i%TS_SERIES_COLORS.length];
    return `<span style="display:inline-flex;align-items:center;gap:5px;font-family:var(--mono);font-size:10px;color:var(--text-bright);margin-right:14px;"><span style="width:10px;height:10px;background:${color};display:inline-block;"></span>${_tsEsc(s.name)}</span>`;
  }).join('');

  const svg=`<div style="margin-bottom:6px;">${legend}</div>
  <svg id="ts-svg" viewBox="0 0 ${W} ${H}" width="100%" style="display:block;" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${W}" height="${H}" fill="transparent"/>
    ${xTicks}${yTicks}
    <line x1="${ML}" y1="${MT}" x2="${ML}" y2="${MT+plotH}" stroke="var(--border-bright)" stroke-width="1"/>
    <line x1="${ML}" y1="${MT+plotH}" x2="${ML+plotW}" y2="${MT+plotH}" stroke="var(--border-bright)" stroke-width="1"/>
    ${zero}
    ${polylines}
    <text x="${ML+plotW/2}" y="${H-4}" font-size="10" fill="var(--text-dim)" text-anchor="middle" font-family="var(--mono)">${res.xLabel} (${res.xUnit})</text>
    <text x="12" y="${MT+plotH/2}" font-size="10" fill="var(--text-dim)" text-anchor="middle" font-family="var(--mono)" transform="rotate(-90 12 ${MT+plotH/2})">${res.yLabel} (${res.yUnit})</text>
    <circle id="ts-hover-dot" r="3.5" fill="var(--text-bright)" style="display:none;"/>
  </svg>
  <div id="ts-hover-readout" style="font-family:var(--mono);font-size:10px;color:var(--text-bright);margin-top:4px;height:14px;"></div>`;
  wrap.innerHTML=svg;

  const svgEl=document.getElementById('ts-svg');
  const dot=document.getElementById('ts-hover-dot');
  const readout=document.getElementById('ts-hover-readout');
  svgEl.addEventListener('mousemove',ev=>{
    const rect=svgEl.getBoundingClientRect();
    const px=(ev.clientX-rect.left)/rect.width*W;
    let nearest=null,nearestSeries=null,bestD=Infinity;
    res.series.forEach(s=>{
      s.points.forEach(p=>{
        const d=Math.abs(xToPx(p.x)-px);
        if(d<bestD){bestD=d;nearest=p;nearestSeries=s;}
      });
    });
    if(!nearest)return;
    dot.style.display='';
    dot.setAttribute('cx',xToPx(nearest.x));
    dot.setAttribute('cy',yToPx(nearest.y));
    readout.textContent=`${_tsEsc(nearestSeries.name)} — ${res.xLabel}: ${_tsFmt(nearest.x)} ${res.xUnit}   →   ${res.yLabel}: ${_tsFmt(nearest.y)} ${res.yUnit}`;
  });
  svgEl.addEventListener('mouseleave',()=>{dot.style.display='none';readout.textContent='';});
}

// Grouped-bar chart for the Destination sweep. Linear y-axis with a per-bar value
// label (log scale would be nicer for the LEO→C3 span but adds tick complexity;
// labels keep small bars legible without it).
function tsRenderBarChart(res){
  const wrap=document.getElementById('ts-chart-wrap');
  if(!res.anyNonzero){
    wrap.innerHTML=`<div style="font-family:var(--mono);font-size:11px;color:var(--text-dim);padding:24px;text-align:center;border:1px dashed var(--border);">No capability at these destinations — every compared vehicle returns zero payload (ΔV insufficient or destination C3 unreachable). Try fewer/closer destinations or a bigger vehicle.</div>`;
    return;
  }
  const W=960,H=380,ML=70,MR=24,MT=16,MB=90;
  const plotW=W-ML-MR,plotH=H-MT-MB;
  const dests=res.series[0].points.map(p=>p.x);
  const nGroups=dests.length;
  const nSeries=res.series.length;
  let yMax=0;
  res.series.forEach(s=>s.points.forEach(p=>{if(p.y>yMax)yMax=p.y;}));
  if(yMax<=0)yMax=1;
  yMax*=1.15;
  const yToPx=y=>MT+plotH-(y/yMax)*plotH;

  const groupW=plotW/nGroups;
  const barPad=groupW*0.12;
  const barsAreaW=groupW-2*barPad;
  const barW=barsAreaW/nSeries;

  const nTicks=6;
  let yTicks='';
  for(let i=0;i<=nTicks;i++){
    const yv=yMax*i/nTicks;
    const py=yToPx(yv);
    yTicks+=`<line x1="${ML}" y1="${py}" x2="${ML+plotW}" y2="${py}" stroke="var(--border)" stroke-width="1"/>`;
    yTicks+=`<text x="${ML-6}" y="${py+3}" font-size="9" fill="var(--text-dim)" text-anchor="end" font-family="var(--mono)">${_tsFmt(yv)}</text>`;
  }

  let bars='',xLabels='';
  for(let g=0;g<nGroups;g++){
    const gx=ML+g*groupW;
    xLabels+=`<text x="${gx+groupW/2}" y="${MT+plotH+14}" font-size="9" fill="var(--text-dim)" text-anchor="end" font-family="var(--mono)" transform="rotate(-40 ${gx+groupW/2} ${MT+plotH+14})">${_tsEsc(String(dests[g]).length>16?String(dests[g]).slice(0,15)+'…':dests[g])}</text>`;
    for(let si=0;si<nSeries;si++){
      const p=res.series[si].points[g];
      const color=TS_SERIES_COLORS[si%TS_SERIES_COLORS.length];
      const bx=gx+barPad+si*barW;
      const by=yToPx(p.y);
      const bh=(MT+plotH)-by;
      const title=p.error?_tsEsc(p.error):`${_tsEsc(res.series[si].name)}: ${_tsFmt(p.y)} kg`;
      bars+=`<g><title>${title}</title><rect x="${bx}" y="${by}" width="${Math.max(barW-1.5,0.5)}" height="${Math.max(bh,0)}" fill="${color}"/>
        ${p.y>0?`<text x="${bx+barW/2}" y="${by-3}" font-size="8" fill="var(--text-dim)" text-anchor="middle" font-family="var(--mono)">${_tsFmt(p.y)}</text>`:''}</g>`;
    }
  }

  const legend=res.series.map((s,i)=>{
    const color=TS_SERIES_COLORS[i%TS_SERIES_COLORS.length];
    return `<span style="display:inline-flex;align-items:center;gap:5px;font-family:var(--mono);font-size:10px;color:var(--text-bright);margin-right:14px;"><span style="width:10px;height:10px;background:${color};display:inline-block;"></span>${_tsEsc(s.name)}</span>`;
  }).join('');

  const svg=`<div style="margin-bottom:6px;">${legend}</div>
  <svg id="ts-svg" viewBox="0 0 ${W} ${H}" width="100%" style="display:block;" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${W}" height="${H}" fill="transparent"/>
    ${yTicks}
    <line x1="${ML}" y1="${MT}" x2="${ML}" y2="${MT+plotH}" stroke="var(--border-bright)" stroke-width="1"/>
    <line x1="${ML}" y1="${MT+plotH}" x2="${ML+plotW}" y2="${MT+plotH}" stroke="var(--border-bright)" stroke-width="1"/>
    ${bars}
    ${xLabels}
    <text x="12" y="${MT+plotH/2}" font-size="10" fill="var(--text-dim)" text-anchor="middle" font-family="var(--mono)" transform="rotate(-90 12 ${MT+plotH/2})">${res.yLabel} (${res.yUnit})</text>
  </svg>`;
  wrap.innerHTML=svg;
}

function tsDownloadCSV(){
  if(!_tsResult){showAlert('Run a sweep first.','No Data');return;}
  const seriesNames=_tsResult.series.map(s=>s.name.replace(/"/g,'""'));
  const header=[`${_tsResult.xLabel} (${_tsResult.xUnit})`,...seriesNames.map(n=>`"${n}" — ${_tsResult.yLabel} (${_tsResult.yUnit})`)];
  const lines=[header.join(',')];
  const maxLen=Math.max(...(_tsResult.series.map(s=>s.points.length)));
  for(let r=0;r<maxLen;r++){
    const xRaw=_tsResult.series[0].points[r]?_tsResult.series[0].points[r].x:'';
    const x=typeof xRaw==='string'?`"${xRaw.replace(/"/g,'""')}"`:xRaw;
    const row=[x,...(_tsResult.series.map(s=>s.points[r]?s.points[r].y:''))];
    lines.push(row.join(','));
  }
  const blob=new Blob([lines.join('\n')],{type:'text/csv'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='trade_study.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}
