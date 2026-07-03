
// ─── VERSION & CHANGELOG ──────────────────────
// Single source of truth for the displayed version + patch notes (header button
// opens #modal-patch-notes). Bump APP_VERSION and prepend an entry on release.
const APP_VERSION='1.1.1';
const APP_REPO_URL='https://github.com/rp1-lox/perigee-lv-calculator';
const APP_CHANGELOG=[
  {v:'1.1.1', title:'Extended Math', date:'2026-07-01', notes:[
    'Added ability to do use equations in stage and vehicle information boxes.',
  ]},
  {v:'1.1.0A', title:'Unified Library', date:'2026-06-21', notes:[
    'An all-new unified stages & vehicles panel across both Program and Calculator mode — designed to increase UI cohesion and discoverability. Vehicles and stages are now sorted directly by their characteristics, while keeping the earlier search capability.',
    'Tags are now simpler. (This mostly makes my life easier.)',
    'The website now fetches from GitHub Pages instead of static HTML — which makes my life really nice.',
    'Bulk downloads: grab ALL of your user-created vehicles and stages in one convenient button.',
    'The “A” at the end is because I pushed too early. Enjoy!',
  ]},
  {v:'1.1.0', title:'Spotlights', date:'2026-06-21', notes:[
    'New Vehicles & Stages library — browse by Era / Origin / Propellant / Class.',
    'Vehicles use a taxonomy browse (tiles → drill → stacked refine); stages use a class-first layout with a side Filters panel.',
    'A "Spotlight" surfaces a random vehicle or stage to discover.',
    'Search composes with whatever filters are active.',
  ]},
  {v:'1.0.3', title:'Added Release Tracking', date:'2026-06-20', notes:[
    'Began tracking releases on GitHub with downloadable builds.',
  ]},
];

function _renderPatchNotes(){
  const el=document.getElementById('patch-notes-body'); if(!el)return;
  el.innerHTML=APP_CHANGELOG.map(c=>`
    <div style="margin-bottom:16px;">
      <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;">
        <span style="font-family:var(--mono);color:var(--accent);font-size:13px;">v${c.v}</span>
        <span style="font-weight:600;color:var(--text-bright);">${c.title}</span>
        <span style="font-family:var(--mono);font-size:10px;color:var(--text-dim);margin-left:auto;">${c.date}</span>
      </div>
      <ul style="margin:6px 0 0;padding-left:18px;color:var(--text);font-size:12px;line-height:1.6;">
        ${c.notes.map(n=>`<li>${n}</li>`).join('')}
      </ul>
    </div>`).join('');
}
function openPatchNotes(){ _renderPatchNotes(); openModal('modal-patch-notes'); }
function _initVersionUI(){
  const v=document.getElementById('patch-notes-ver'); if(v)v.textContent='v'+APP_VERSION;
  _renderPatchNotes();
}
