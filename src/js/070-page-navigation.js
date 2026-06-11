
// ─── PAGE NAVIGATION ──────────────────────────
function showPage(p){
  document.querySelectorAll('.page').forEach(el=>{
    el.classList.remove('active');
    el.style.display='none';
  });
  document.querySelectorAll('.nav-btn').forEach(el=>el.classList.remove('active'));
  const pg=document.getElementById('page-'+p);
  pg.classList.add('active');
  pg.style.display=(p==='program'||p==='art')?'flex':'block';
  document.getElementById('nav-'+p).classList.add('active');
  const vvw=document.getElementById('veh-view-wrap');
  if(vvw){vvw.style.display=(p==='vehicles')?'flex':'none';}
  if(p==='art'){ _progArtRebuildManagerList(); artPageRebuildSlots(); }
}
