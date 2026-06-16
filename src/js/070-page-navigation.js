
// ─── PAGE NAVIGATION ──────────────────────────
// Two top-level sections: "LV Calculator" (Vehicles / Orbits / Results sub-tabs)
// and "Program Manager" (page-program, with its own Spacecraft/Fleet/Missions tabs).
const _LV_PAGES = ['vehicles', 'orbits', 'results'];
let _lvSubPage = 'vehicles';   // remembers the last LV sub-tab

function showPage(p){
  document.querySelectorAll('.page').forEach(el=>{
    el.classList.remove('active');
    el.style.display='none';
  });
  const pg=document.getElementById('page-'+p);
  if(!pg) return;
  pg.classList.add('active');
  pg.style.display=(p==='program'||p==='art')?'flex':'block';

  const isLv=_LV_PAGES.includes(p);
  // top-level nav highlight (LV section folds vehicles/orbits/results under nav-lv)
  document.querySelectorAll('.nav-btn').forEach(el=>el.classList.remove('active'));
  const topBtn=document.getElementById(isLv?'nav-lv':'nav-'+p);
  if(topBtn) topBtn.classList.add('active');
  // LV sub-tab bar: only visible inside the LV section
  const sub=document.getElementById('lv-subnav');
  if(sub) sub.style.display=isLv?'flex':'none';
  if(isLv){
    _lvSubPage=p;
    document.querySelectorAll('#lv-subnav .lv-sub-btn').forEach(b=>b.classList.toggle('active', b.dataset.lv===p));
  }
  // Program sub-tab bar + header Save/Load: only visible inside Program Manager
  const psub=document.getElementById('prog-subnav');
  if(psub) psub.style.display=(p==='program')?'flex':'none';
  const pha=document.getElementById('prog-header-actions');
  if(pha) pha.style.display=(p==='program')?'flex':'none';

  const vvw=document.getElementById('veh-view-wrap');
  if(vvw){vvw.style.display=(p==='vehicles')?'flex':'none';}
  if(p==='art'){ _progArtRebuildManagerList(); artPageRebuildSlots(); }
}

// "LV Calculator" top-nav button → return to the last-used LV sub-tab.
function showLvSection(){ showPage(_lvSubPage || 'vehicles'); }
