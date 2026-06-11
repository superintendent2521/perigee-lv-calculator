
// ─── USER SPACEPORTS ──────────────────────────
let userSpaceports=[];

function persistUserSpaceports(){
  try{localStorage.setItem('lv_user_spaceports',JSON.stringify(userSpaceports));}catch(e){}
}
function loadPersistedUserSpaceports(){
  try{
    const raw=localStorage.getItem('lv_user_spaceports');
    if(raw)userSpaceports=JSON.parse(raw);
  }catch(e){userSpaceports=[];}
}

function saveUserSpaceport(){
  document.getElementById('ssp-name').value='';
  document.getElementById('ssp-short').value='';
  document.getElementById('ssp-country').value='';
  // Pre-fill from active site if one is selected
  const cur=getCurrentSite();
  if(cur){
    document.getElementById('ssp-name').value=cur.name||'';
    document.getElementById('ssp-short').value='';
    document.getElementById('ssp-country').value=cur.country||'';
  }
  openModal('modal-save-spaceport');
  setTimeout(()=>document.getElementById('ssp-name').focus(),100);
}

function doSaveUserSpaceport(){
  const name=document.getElementById('ssp-name').value.trim()||'My Site';
  const short=(document.getElementById('ssp-short').value.trim()||name.slice(0,4)).toUpperCase();
  const country=document.getElementById('ssp-country').value.trim()||'Custom';
  const lat=parseFloat(document.getElementById('site-lat').value)||0;
  const lon=parseFloat(document.getElementById('sp-lon-hidden')?.value)||0;
  const azMin=parseFloat(document.getElementById('az-min').value)||0;
  const azMax=parseFloat(document.getElementById('az-max').value)||360;
  const cur=getCurrentSite();
  const sp={
    _uid:Date.now(),
    name, short, country,
    lat, lon: (cur?.lon??lon),
    azMin, azMax,
    note:'User-defined spaceport.',
    desc: cur?.desc||'',
    pads:[]  // reserved for future pad definitions
  };
  userSpaceports.push(sp);
  persistUserSpaceports();
  activeSiteKey='usp_'+sp._uid;
  downloadJSON(sp, (name+'.spaceport.json').replace(/[^a-z0-9_.\-]/gi,'_').toLowerCase());
  closeModal('modal-save-spaceport');
  buildSiteSelector();
  updateSiteNotes(sp);
}

function loadSpaceportFile(input){
  const file=input.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const sp=JSON.parse(e.target.result);
      if(!sp.name||sp.lat==null)throw new Error('Invalid spaceport file');
      sp._uid=sp._uid||Date.now();
      if(!Array.isArray(sp.pads))sp.pads=[];
      userSpaceports.push(sp);
      persistUserSpaceports();
      activeSiteKey='usp_'+sp._uid;
      buildSiteSelector();
      // Load its values into the fields
      document.getElementById('site-lat').value=sp.lat;
      if(sp.azMin!=null)document.getElementById('az-min').value=sp.azMin;
      if(sp.azMax!=null)document.getElementById('az-max').value=sp.azMax;
      updateSiteNotes(sp);
    }catch(err){alert('Could not load spaceport: '+err.message);}
  };
  reader.readAsText(file);
  input.value='';
}

function deleteUserSpaceport(uid){
  userSpaceports=userSpaceports.filter(s=>s._uid!==uid);
  if(activeSiteKey==='usp_'+uid){activeSiteKey=null;updateSiteNotes(null);}
  persistUserSpaceports();
  buildSiteSelector();
}

