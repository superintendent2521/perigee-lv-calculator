
// ─── THEMES ─────────────────────────────────────
const BUILTIN_THEMES={
  default:{name:'Default (Dark)',
    '--bg':'#0a0c10','--panel':'#0f1318','--border':'#1e2530','--border-bright':'#2e3d50',
    '--accent':'#00c8ff','--accent2':'#ff6b35','--accent3':'#7fff6b',
    '--text':'#c8d8e8','--text-dim':'#5a7080','--text-bright':'#e8f4ff',
    '--mono':"'JetBrains Mono',monospace",'--sans':"'Outfit',sans-serif",
    '--nm-bg':'#080a0e','--nm-earth':'#44b06a','--nm-lunar':'#7888c8','--nm-interp':'#cc5040',
    '--nm-edge':'#2a3545','--nm-edge-act':'#00c8ff','--nm-node-fill':'#0f1318',
    '--nm-label':'#5a7080','--nm-pill-bg':'#0f1318','--nm-pill-bd':'#1e2530','--nm-pill-text':'#5a7080',
    '--nm-pal-bg':'#070910','--nm-pal-hdr':'#060709','--nm-pal-item':'#0f1318','--nm-pal-item-act':'#081210','--nm-ghost':'#1e2530'},
  perigee:{name:'Perigee',
    '--bg':'#3b393a','--panel':'#2e2c2d','--border':'#524f50','--border-bright':'#6e6b6c',
    '--accent':'#88c657','--accent2':'#c6a057','--accent3':'#b0e080',
    '--text':'#e7e8ea','--text-dim':'#a7a6a4','--text-bright':'#ffffff',
    '--mono':"'JetBrains Mono',monospace",'--sans':"'Outfit',sans-serif",
    '--nm-bg':'#282628','--nm-earth':'#5db877','--nm-lunar':'#8890bc','--nm-interp':'#b85848',
    '--nm-edge':'#5a5758','--nm-edge-act':'#88c657','--nm-node-fill':'#2e2c2d',
    '--nm-label':'#a7a6a4','--nm-pill-bg':'#2e2c2d','--nm-pill-bd':'#524f50','--nm-pill-text':'#a7a6a4',
    '--nm-pal-bg':'#252325','--nm-pal-hdr':'#1e1c1e','--nm-pal-item':'#2e2c2d','--nm-pal-item-act':'#1e2419','--nm-ghost':'#524f50'},
  spacex:{name:'SpaceX',
    '--bg':'#849199','--panel':'#6e7a82','--border':'#9aaab4','--border-bright':'#b8c8d4',
    '--accent':'#015289','--accent2':'#ffffff','--accent3':'#ffffff',
    '--text':'#ffffff','--text-dim':'#d0dde5','--text-bright':'#ffffff',
    '--mono':"'JetBrains Mono',monospace",'--sans':"'Outfit',sans-serif",
    '--nm-bg':'#7a8890','--nm-earth':'#2a7040','--nm-lunar':'#3850a0','--nm-interp':'#903028',
    '--nm-edge':'#9aaab4','--nm-edge-act':'#015289','--nm-node-fill':'#6e7a82',
    '--nm-label':'#d0dde5','--nm-pill-bg':'#6e7a82','--nm-pill-bd':'#9aaab4','--nm-pill-text':'#d0dde5',
    '--nm-pal-bg':'#7a8890','--nm-pal-hdr':'#6e7a82','--nm-pal-item':'#849199','--nm-pal-item-act':'#6e8878','--nm-ghost':'#9aaab4'},
  blueorigin:{name:'Blue Origin',
    '--bg':'#0000fe','--panel':'#ffffff','--border':'#99aaff','--border-bright':'#0000fe',
    '--accent':'#0000fe','--accent2':'#3333cc','--accent3':'#0000cc',
    '--text':'#00008b','--text-dim':'#4444cc','--text-bright':'#000080',
    '--mono':"'JetBrains Mono',monospace",'--sans':"'Outfit',sans-serif",
    '--nm-bg':'#0000e0','--nm-earth':'#44cc66','--nm-lunar':'#aabbff','--nm-interp':'#ff6644',
    '--nm-edge':'#6677ff','--nm-edge-act':'#ffffff','--nm-node-fill':'#ffffff',
    '--nm-label':'#0000aa','--nm-pill-bg':'#ffffff','--nm-pill-bd':'#0000fe','--nm-pill-text':'#0000aa',
    '--nm-pal-bg':'#0000d0','--nm-pal-hdr':'#0000b8','--nm-pal-item':'#ffffff','--nm-pal-item-act':'#ccffcc','--nm-ghost':'#9999ff'},
};;
let customThemes={};
let activeThemeKey='perigee';

function getTheme(key){return customThemes[key]||BUILTIN_THEMES[key]||BUILTIN_THEMES.perigee;}
function applyTheme(key){
  activeThemeKey=key;
  const t=getTheme(key);
  Object.entries(t).forEach(([k,v])=>{if(k.startsWith('--'))document.documentElement.style.setProperty(k,v);});
  document.body.style.backgroundImage='none';
  const sel=document.getElementById('theme-select');
  if(sel){for(const o of sel.options){if(o.value===key){sel.value=key;break;}}}
  if(typeof progRenderNodeMap==='function')progRenderNodeMap();
  if(typeof artUpdateInvertFilter==='function')artUpdateInvertFilter();
}
function rebuildThemeSelect(){
  const sel=document.getElementById('theme-select');const cur=sel.value;sel.innerHTML='';
  Object.entries(BUILTIN_THEMES).forEach(([k,t])=>{const o=document.createElement('option');o.value=k;o.textContent=t.name;sel.appendChild(o);});
  Object.entries(customThemes).forEach(([k,t])=>{const o=document.createElement('option');o.value=k;o.textContent=(t.name||k)+' (custom)';sel.appendChild(o);});
  sel.value=(cur in BUILTIN_THEMES||cur in customThemes)?cur:'perigee';
}