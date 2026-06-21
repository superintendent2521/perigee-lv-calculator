
// ─── LIBRARY TAG SCHEMA ───────────────────────
// Single source of truth for the 4 structured browse dimensions used by the
// redesigned Vehicles-page library (see 220-library-browser.js).
//   era · origin · prop · cls   (cls vocab differs vehicle vs stage)
// LENIENT by design: nothing is forced. Values are resolved from any explicit
// structured field (lib_era / lib_origin / lib_prop / lib_cls) first, then by
// parsing the item's existing flat tags[] against the controlled vocab below
// (which intentionally REUSES the legacy FILTER_TREE / VEHICLE_FILTER_TREE
// strings so no data rewrite is needed), and finally falls back to 'Unspecified'.
// All dimensions resolve to an ARRAY of values (an item can be e.g. both 1990s
// and 2000s) — facet matching is includes() semantics.

const LIB_DIMS = ['era','origin','prop','cls'];
const LIB_DIMLBL = {era:'Era', origin:'Origin', prop:'Propellant', cls:'Class'};

const LIB_VOCAB = {
  era:    ['1940s','1950s','1960s','1970s','1980s','1990s','2000s','2010s+'],
  origin: ['American','Soviet / Russian','European','Chinese','Other'],
  prop:   [
    'Liquid Oxygen / Liquid Hydrogen','Liquid Oxygen / Kerosene','Liquid Oxygen / Methane',
    'Liquid Oxygen / Ethanol','Nitrogen Tetroxide / Aerozine-50','Nitrogen Tetroxide / UDMH',
    'Inhibited Red Fuming Nitric Acid / UDMH','Liquid Fluorine / Hydrazine',
    'Nitrogen Tetroxide / Aniline','Solid Propellant',
  ],
  // stage class = the legacy "Application" tag values (+ Sustainer for stage-and-a-half)
  cls_stage:   ['Strap-on Booster','First Stage','Sustainer','Upper Stage','Kick Stage'],
  // vehicle class = payload class (computeVehicleTags already emits one of these)
  cls_vehicle: ['Nano (<50 kg)','Small (<1 t)','Medium (1–10 t)','Heavy (10–50 t)','Super Heavy (>50 t)'],
};

function libVocabFor(dim, mode){
  if(dim==='cls') return mode==='veh' ? LIB_VOCAB.cls_vehicle : LIB_VOCAB.cls_stage;
  return LIB_VOCAB[dim] || [];
}

// Resolve a dimension to its array of vocab values for one item.
//   mode: 'veh' (BUILTIN_PRESETS / userLVs) | 'stg' (STAGE_LIBRARY / user stages)
function libResolveTags(item, dim, mode){
  if(!item) return ['Unspecified'];
  const vocab = libVocabFor(dim, mode);
  const out = new Set();
  // 1 — explicit structured field (set by the editors, Phase 3)
  const f = item['lib_'+dim];
  if(Array.isArray(f)) f.forEach(v=>{ if(v) out.add(v); });
  else if(typeof f==='string' && f) out.add(f);
  // 2 — parse the flat tag list against the controlled vocab
  const raw = (mode==='veh' && typeof computeVehicleTags==='function')
    ? computeVehicleTags(item) : (item.tags || []);
  raw.forEach(t=>{
    if(t==='1990s-2000s'){ if(dim==='era'){ out.add('1990s'); out.add('2000s'); } return; }
    if(vocab.includes(t)) out.add(t);
  });
  if(!out.size) return ['Unspecified'];
  // sort by vocab order (chronological for era, etc.); unknowns last
  return [...out].sort((a,b)=>{
    const ia=vocab.indexOf(a), ib=vocab.indexOf(b);
    return (ia<0?99:ia)-(ib<0?99:ib);
  });
}

// All four dims for an item at once → {era:[],origin:[],prop:[],cls:[]}
function libItemTags(item, mode){
  const o={}; LIB_DIMS.forEach(d=>o[d]=libResolveTags(item,d,mode)); return o;
}

// ── Phase 1 verification: how cleanly do the built-ins resolve? ──
// Call libTagCoverageReport() from the console; logs Unspecified counts per dim
// so we can tune parsing (vocab strings) WITHOUT rewriting the library data.
function libTagCoverageReport(){
  const report=(label, list, mode)=>{
    const tot=list.length, miss={era:0,origin:0,prop:0,cls:0}, missNames={era:[],origin:[],prop:[],cls:[]};
    list.forEach(it=>LIB_DIMS.forEach(d=>{
      if(libResolveTags(it,d,mode)[0]==='Unspecified'){ miss[d]++; if(missNames[d].length<8)missNames[d].push(it.name); }
    }));
    console.log(`%c${label} — ${tot} items`, 'color:#00c8ff;font-weight:bold');
    LIB_DIMS.forEach(d=>console.log(
      `  ${d.padEnd(7)}: ${tot-miss[d]}/${tot} tagged` + (miss[d]?`  · Unspecified: ${missNames[d].join(', ')}${miss[d]>missNames[d].length?'…':''}`:'')));
  };
  if(typeof BUILTIN_PRESETS!=='undefined') report('VEHICLES', BUILTIN_PRESETS, 'veh');
  if(typeof STAGE_LIBRARY!=='undefined'){
    const stg=[]; Object.values(STAGE_LIBRARY).forEach(a=>stg.push(...a));
    report('STAGES', stg, 'stg');
  }
  return 'done';
}
