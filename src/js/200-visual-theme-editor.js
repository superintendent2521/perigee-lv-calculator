
// ─── VISUAL THEME EDITOR ──────────────────────
const TE_VARS=[
  {key:'--bg',        label:'Page Background'},
  {key:'--panel',     label:'Panel / Card'},
  {key:'--border',    label:'Border'},
  {key:'--border-bright',label:'Border (highlight)'},
  {key:'--accent',    label:'Primary Accent'},
  {key:'--accent2',   label:'Secondary Accent'},
  {key:'--accent3',   label:'Accent Glow'},
  {key:'--text-dim',  label:'Text (dim)'},
  {key:'--text-bright',label:'Text (bright)'},
];
function teGetCurrent(){
  const style=document.documentElement.style;
  const computed=getComputedStyle(document.documentElement);
  const out={};
  TE_VARS.forEach(({key})=>{
    out[key]=(style.getPropertyValue(key)||computed.getPropertyValue(key)).trim();
  });
  out['--sans']=(style.getPropertyValue('--sans')||computed.getPropertyValue('--sans')).trim();
  out['--mono']=(style.getPropertyValue('--mono')||computed.getPropertyValue('--mono')).trim();
  return out;
}
function teApplyLive(){
  TE_VARS.forEach(({key})=>{
    const hex=document.getElementById('te-hex-'+key.slice(2))?.value||'';
    if(/^#[0-9a-f]{3,8}$/i.test(hex))
      document.documentElement.style.setProperty(key,hex);
  });
  const sans=document.getElementById('te-font-sans').value.trim();
  const mono=document.getElementById('te-font-mono').value.trim();
  if(sans)document.documentElement.style.setProperty('--sans',`'${sans.replace(/'/g,'')}'`);
  if(mono)document.documentElement.style.setProperty('--mono',`'${mono.replace(/'/g,'')}'`);
}
function teSwatchUpdate(key,hexVal){
  document.getElementById('te-fill-'+key.slice(2)).style.background=hexVal;
  document.getElementById('te-hex-'+key.slice(2)).value=hexVal;
  teApplyLive();
}
function openThemeEditor(){
  // Build preset buttons
  const pr=document.getElementById('te-preset-row');
  pr.innerHTML='';
  Object.entries(BUILTIN_THEMES).forEach(([k,t])=>{
    const btn=document.createElement('button');
    btn.className='te-preset-btn'+(k===activeThemeKey?' active':'');
    btn.textContent=t.name;
    btn.onclick=()=>{
      applyTheme(k);
      document.querySelectorAll('.te-preset-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      tePopulate();
    };
    pr.appendChild(btn);
  });
  // Build color rows
  const cr=document.getElementById('te-color-rows');
  cr.innerHTML='';
  TE_VARS.forEach(({key,label})=>{
    const id=key.slice(2);
    const row=document.createElement('div');row.className='te-row';
    row.innerHTML=`
      <span class="te-label">${label}</span>
      <button class="te-swatch" title="Pick colour">
        <div class="te-swatch-fill" id="te-fill-${id}"></div>
        <input type="color" id="te-picker-${id}"
          oninput="teSwatchUpdate('${key}',this.value);document.getElementById('te-hex-${id}').value=this.value;">
      </button>
      <input class="te-hex" id="te-hex-${id}" maxlength="7" placeholder="#000000"
        oninput="if(/^#[0-9a-f]{6}$/i.test(this.value)){document.getElementById('te-picker-${id}').value=this.value;document.getElementById('te-fill-${id}').style.background=this.value;teApplyLive();}">`;
    cr.appendChild(row);
  });
  tePopulate();
  openModal('modal-theme');
}
function tePopulate(){
  const cur=teGetCurrent();
  TE_VARS.forEach(({key})=>{
    const id=key.slice(2);
    const val=cur[key]||'#000000';
    const hex=val.startsWith('#')?val:'#000000';
    const fill=document.getElementById('te-fill-'+id);
    const picker=document.getElementById('te-picker-'+id);
    const hexEl=document.getElementById('te-hex-'+id);
    if(fill)fill.style.background=hex;
    if(picker)picker.value=hex;
    if(hexEl)hexEl.value=hex;
  });
  // Fonts — strip quotes for display
  const stripQ=v=>v.replace(/['"]/g,'').split(',')[0].trim();
  document.getElementById('te-font-sans').value=stripQ(cur['--sans']||'Outfit');
  document.getElementById('te-font-mono').value=stripQ(cur['--mono']||'JetBrains Mono');
}
function teSaveCustom(){
  const name=document.getElementById('te-theme-name').value.trim()||'Custom Theme';
  const t={name};
  TE_VARS.forEach(({key})=>{
    const val=document.getElementById('te-hex-'+key.slice(2))?.value||'#000000';
    t[key]=val;
  });
  t['--sans']="'"+document.getElementById('te-font-sans').value.replace(/'/g,'')+"',sans-serif";
  t['--mono']="'"+document.getElementById('te-font-mono').value.replace(/'/g,'')+"',monospace";
  const key='custom_'+name.replace(/\s+/g,'_').toLowerCase();
  customThemes[key]=t;
  rebuildThemeSelect();
  applyTheme(key);
  document.querySelectorAll('.te-preset-btn').forEach(b=>b.classList.remove('active'));
}
function teExportJSON(){
  const name=document.getElementById('te-theme-name').value.trim()||'custom';
  const t={name};
  TE_VARS.forEach(({key})=>{t[key]=document.getElementById('te-hex-'+key.slice(2))?.value||'';});
  t['--sans']="'"+document.getElementById('te-font-sans').value.replace(/'/g,'')+"',sans-serif";
  t['--mono']="'"+document.getElementById('te-font-mono').value.replace(/'/g,'')+"',monospace";
  downloadJSON(t,name.replace(/\s+/g,'_').toLowerCase()+'_theme.json');
}
function saveThemeFromEditor(){const txt=document.getElementById('theme-editor').value;try{const t=JSON.parse(txt);downloadJSON(t,(t.name||'theme').replace(/[^a-z0-9_-]/gi,'_').toLowerCase()+'_theme.json');}catch(e){document.getElementById('theme-error').textContent='// JSON parse error: '+e.message;document.getElementById('theme-error').style.display='block';}}
function saveTheme(){const t=getTheme(activeThemeKey);downloadJSON(t,(t.name||activeThemeKey).replace(/[^a-z0-9_-]/gi,'_').toLowerCase()+'_theme.json');}
function loadThemeFile(input){const file=input.files[0];if(!file)return;const reader=new FileReader();reader.onload=e=>{try{const t=JSON.parse(e.target.result);const key='custom_'+(t.name||'theme').replace(/\s+/g,'_').toLowerCase();customThemes[key]=t;rebuildThemeSelect();applyTheme(key);}catch(err){showAlert('Invalid theme JSON: '+err.message,'Invalid File');}};reader.readAsText(file);input.value='';}

