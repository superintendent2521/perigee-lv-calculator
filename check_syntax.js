
// ─── CONSTANTS ────────────────────────────────
const G0=9.80665,RE=6371.0,MU=398600.4418,OMEGA_E=7.2921150e-5;
const MAX_STAGES=15;

// ─── STATE ────────────────────────────────────
let numStages=1,useBooster=false,restartable=false,trajectory='two-burn',destMode='orbit';
let activePresetKey=null,activeOrbitKey=null;
let userDefinedLV=false,userDefinedOrbit=false;
let _suppressUD=false;
let lastResult=null;
const stageStore={};

// ─── ROW DEFAULTS ─────────────────────────────
const ROWS=[
  {key:'dry',   label:'Dry Mass (kg)',   def:[8000,2000,500,200,100,50,30,20,15,10,8,6,5,4,3]},
  {key:'prop',  label:'Propellant (kg)', def:[180000,35000,8000,2000,600,200,80,40,25,15,10,8,6,5,4]},
  {key:'thrust',label:'Thrust (kN)',     def:[5000,600,100,30,10,4,2,1,0.5,0.5,0.5,0.5,0.5,0.5,0.5]},
  {key:'isp',   label:'Isp (s)',         def:[290,345,380,290,285,280,275,270,268,265,265,265,265,265,265]},
  {key:'res',   label:'Residuals (%)',   def:[2,2,2,2,2,2,2,2,2,2,2,2,2,2,2]},
];

// ─── BUILTIN PRESETS ──────────────────────────
const BUILTIN_PRESETS=[
  // ───── UNITED STATES ─────
  {name:'Juno I',
   stageNames:['Redstone','Sergeant (11×)','Sergeant (3×)','Sergeant (1×)'],
   payload:14,fairingMass:0,fairingJettison:0,boosterName:null,boosterCount:0,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:370,perigee:370,inc:33},
   tags:['Historical','Crewed'],
   note:'Explorer 1 (1958). First US satellite. ~10 kg to 370 km.'},

  {name:'Vanguard',
   stageNames:['Vanguard S1','Vanguard S2','Vanguard S3'],
   payload:1.5,fairingMass:50,fairingJettison:2,boosterName:null,boosterCount:0,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:660,perigee:660,inc:33},
   tags:['Historical'],
   note:'NRL 3-stage. Only 3 of 11 launches succeeded.'},

  {name:'Thor-Able',
   stageNames:['Thor DSV-2','Able (Thor-Able)'],
   payload:90,fairingMass:0,fairingJettison:0,boosterName:null,boosterCount:0,
   site:{lat:28.5,azMin:37,azMax:112},mode:'escape',escape:{c3:0.1,decl:28.5,perigee:185},
   tags:['Historical','Deep Space'],
   note:'Pioneer lunar probes. LOX/RP-1 + NTO/UDMH.'},

  {name:'Thor-Agena D',
   stageNames:['Thor DSV-2','Agena D'],
   payload:900,fairingMass:80,fairingJettison:2,boosterName:null,boosterCount:0,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:500,perigee:500,inc:28.5},
   tags:['Historical'],
   note:'Workhorse of the 1960s. LOX/RP-1 + IRFNA/UDMH. Discoverer/Corona recon.'},

  {name:'Atlas-Agena D',
   stageNames:['Atlas SLV-3','Agena D'],
   payload:1700,fairingMass:100,fairingJettison:2,boosterName:null,boosterCount:0,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:500,perigee:500,inc:28.5},
   tags:['Historical'],
   note:'Mariner, Ranger, Lunar Orbiter missions.'},

  {name:'Atlas-Centaur',
   stageNames:['Atlas SLV-3','Centaur A'],
   payload:3600,fairingMass:200,fairingJettison:2,boosterName:null,boosterCount:0,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:400,perigee:400,inc:28.5},
   tags:['Historical','Deep Space'],
   note:'First LOX/LH2 upper stage in service. Surveyor, Pioneer.'},

  {name:'Saturn I',
   stageNames:['Saturn I S-I','Saturn S-IV'],
   payload:10000,fairingMass:0,fairingJettison:0,boosterName:null,boosterCount:0,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:185,perigee:185,inc:28.5},
   tags:['Historical'],
   note:'SA-1 to SA-10. Tested Apollo hardware. ~10t LEO.'},

  {name:'Saturn IB',
   stageNames:['Saturn IB S-IB','Saturn IB S-IVB'],
   payload:21000,fairingMass:0,fairingJettison:0,boosterName:null,boosterCount:0,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:185,perigee:185,inc:28.5},
   tags:['Historical','Crewed'],
   note:'Apollo 7, Skylab, ASTP. ~21t LEO.'},

  {name:'Saturn V',
   stageNames:['Saturn V S-IC','Saturn V S-II','Saturn V S-IVB'],
   payload:118000,fairingMass:0,fairingJettison:0,boosterName:null,boosterCount:0,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:185,perigee:185,inc:28.5},
   tags:['Historical','Crewed','Deep Space'],
   note:'Apollo/Skylab. F-1 vac Isp 304s / J-2 421s. ~118t LEO.'},

  {name:'Titan I',
   stageNames:['Titan I Stage 1','Titan I Stage 2'],
   payload:1800,fairingMass:0,fairingJettison:0,boosterName:null,boosterCount:0,
   site:{lat:34.7,azMin:150,azMax:220},mode:'orbit',orbit:{apogee:185,perigee:185,inc:34.7},
   tags:['Historical'],
   note:'Titan I ICBM-derived. Only LOX/RP-1 Titan.'},

  {name:'Titan II GLV',
   stageNames:['Titan II GLV S1','Titan II GLV S2'],
   payload:3600,fairingMass:0,fairingJettison:0,boosterName:null,boosterCount:0,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:270,perigee:160,inc:28.9},
   tags:['Historical','Crewed'],
   note:'Gemini LV. LR-87 vac Isp 290s / LR-91 316s.'},

  {name:'Titan IIIC',
   stageNames:['Titan IIIC/D S1','Titan IIIC/D S2','Transtage'],
   boosterName:'UA1205 SRB',boosterCount:2,
   payload:13600,fairingMass:600,fairingJettison:2,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:35786,perigee:185,inc:28.5},
   tags:['Historical'],
   note:'First Titan with SRBs. ~13.6t to GTO (reference). NTO/Aerozine-50.'},

  {name:'Titan IIIE / Centaur',
   stageNames:['Titan IIIE S1','Titan IIIE S2','Centaur D-1T'],
   boosterName:'UA1205 SRB',boosterCount:2,
   payload:722,fairingMass:400,fairingJettison:2,
   site:{lat:28.5,azMin:37,azMax:112},mode:'escape',escape:{c3:98.5,decl:28.5,perigee:185},
   tags:['Historical','Deep Space'],
   note:'Voyager 1/2, Viking, Helios. C3=98.5 km²/s² (Voyager trajectory).'},

  {name:'Scout G-1',
   stageNames:['Algol III','Castor II','Antares 3A','Altair 3'],
   payload:210,fairingMass:60,fairingJettison:3,boosterName:null,boosterCount:0,
   site:{lat:37.8,azMin:150,azMax:225},mode:'orbit',orbit:{apogee:500,perigee:500,inc:90},
   tags:['Historical'],
   note:'All-solid 4-stage. ~210 kg to 500 km polar from Vandenberg.'},

  {name:'Delta E',
   stageNames:['Thor (Long Tank)','Delta-K'],
   payload:900,fairingMass:80,fairingJettison:2,boosterName:null,boosterCount:0,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:800,perigee:800,inc:28.5},
   tags:['Historical'],
   note:'Extended Thor with Delta-K upper stage.'},

  {name:'Delta II 7920',
   stageNames:['Delta II S1','Delta-K'],
   boosterName:'GEM-40',boosterCount:9,
   payload:5100,fairingMass:200,fairingJettison:2,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:400,perigee:400,inc:28.5},
   tags:['Historical'],
   note:'9× GEM-40 strap-ons. GPS constellation workhorse. ~5.1t LEO.'},

  {name:'Atlas V 401',
   stageNames:['Atlas V CCB','Centaur III'],
   payload:9800,fairingMass:1950,fairingJettison:2,boosterName:null,boosterCount:0,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:400,perigee:400,inc:28.5},
   tags:['Active'],
   note:'Atlas V baseline. RD-180 + 2× RL-10. No SRBs, 4m fairing. ~9.8t LEO.'},

  {name:'Atlas V 551',
   stageNames:['Atlas V CCB','Centaur III'],
   boosterName:'Atlas V SRB (AJ-60A)',boosterCount:5,
   payload:18810,fairingMass:2316,fairingJettison:2,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:400,perigee:400,inc:28.5},
   tags:['Active'],
   note:'Atlas V heaviest config. 5× AJ-60A SRBs, 5m fairing. ~18.8t LEO.'},

  {name:'Delta IV Medium',
   stageNames:['Delta IV CBC','DCSS (Delta IV)'],
   payload:9420,fairingMass:1680,fairingJettison:2,boosterName:null,boosterCount:0,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:400,perigee:400,inc:28.5},
   tags:['Historical'],
   note:'Delta IV Medium. RS-68A + RL-10B-2. LOX/LH2 both stages. ~9.4t LEO.'},

  {name:'Delta IV Heavy',
   stageNames:['Delta IV CBC','DCSS (Delta IV)'],
   boosterName:'Delta IV CBC',boosterCount:2,
   payload:28790,fairingMass:2034,fairingJettison:2,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:400,perigee:400,inc:28.5},
   tags:['Historical'],
   note:'3× CBC cores + DCSS. ~28.8t LEO. Largest US launcher before SLS.'},

  {name:'Falcon 9 Block 5',
   stageNames:['Falcon 9 B5 S1','Falcon 9 MVac'],
   payload:22800,fairingMass:1900,fairingJettison:2,boosterName:null,boosterCount:0,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:400,perigee:400,inc:51.6},
   tags:['Active','Reusable'],
   note:'Expendable config. Merlin 1D+ vac Isp 311s / MVac 348s. ~22.8t LEO.'},

  {name:'Falcon Heavy',
   stageNames:['Falcon 9 B5 S1','Falcon 9 MVac'],
   boosterName:'Falcon 9 B5 S1',boosterCount:2,
   payload:63800,fairingMass:1900,fairingJettison:2,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:400,perigee:400,inc:28.5},
   tags:['Active','Reusable'],
   note:'3× F9 cores + MVac. Expendable config. ~63.8t LEO. Side boosters separate earlier.'},

  {name:'Vulcan Centaur',
   stageNames:['Vulcan S1','Centaur V'],
   payload:27200,fairingMass:2500,fairingJettison:2,boosterName:null,boosterCount:0,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:400,perigee:400,inc:28.5},
   tags:['Active'],
   note:'BE-4 (LOX/CH4) + Centaur V (LOX/LH2). ~27.2t LEO expendable.'},

  {name:'New Glenn',
   stageNames:['New Glenn S1','New Glenn S2'],
   payload:45000,fairingMass:3500,fairingJettison:2,boosterName:null,boosterCount:0,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:400,perigee:400,inc:28.5},
   tags:['Active','Reusable'],
   note:'Blue Origin. 7× BE-4 (LOX/CH4) + BE-3U (LOX/LH2). ~45t LEO expendable.'},

  {name:'Antares 230+',
   stageNames:['Antares S1','Castor 4A'],
   payload:8000,fairingMass:200,fairingJettison:2,boosterName:null,boosterCount:0,
   site:{lat:37.8,azMin:40,azMax:100},mode:'orbit',orbit:{apogee:400,perigee:400,inc:51.6},
   tags:['Active'],
   note:'2× RD-181 first stage + Castor 30XL solid. ~8t to ISS orbit from Wallops.'},

  {name:'Electron',
   stageNames:['Electron S1','Electron S2'],
   payload:300,fairingMass:40,fairingJettison:2,boosterName:null,boosterCount:0,
   site:{lat:-39.3,azMin:40,azMax:150},mode:'orbit',orbit:{apogee:500,perigee:500,inc:45},
   tags:['Active'],
   note:'Rocket Lab. 9× Rutherford + Vacuum Rutherford. ~300 kg to 500 km. Mahia Peninsula, NZ.'},

  {name:'SLS Block 1',
   stageNames:['SLS Core Stage','ICPS (SLS Block 1)'],
   boosterName:'SLS 5-Seg SRB',boosterCount:2,
   payload:95000,fairingMass:0,fairingJettison:0,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:185,perigee:185,inc:28.5},
   tags:['Active','Crewed'],
   note:'SLS Block 1. 4× RS-25 + 2× 5-seg SRB + ICPS. ~95t LEO. Artemis program.'},

  {name:'SLS Block 1B',
   stageNames:['SLS Core Stage','EUS (SLS Block 1B)'],
   boosterName:'SLS 5-Seg SRB',boosterCount:2,
   payload:105000,fairingMass:0,fairingJettison:0,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:185,perigee:185,inc:28.5},
   tags:['Active','Crewed','Deep Space'],
   note:'SLS Block 1B with Exploration Upper Stage. 4× RL-10C. ~105t LEO.'},

  // ── Proposed / Exotic ──
  {name:'Atlas / NOMAD',
   stageNames:['Atlas SLV-3','NOMAD (G-1)'],
   payload:1200,fairingMass:80,fairingJettison:2,boosterName:null,boosterCount:0,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:500,perigee:500,inc:28.5},
   tags:['Unbuilt','Exotic','Historical'],
   note:'Proposed Atlas + NOMAD LF2/Hydrazine upper stage. Agena replacement that never flew. Stage masses estimated.'},

  {name:'Titan III / CHARIOT',
   stageNames:['Titan IIIC/D S1','Titan IIIC/D S2','CHARIOT'],
   boosterName:'UA1205 SRB',boosterCount:2,
   payload:15000,fairingMass:600,fairingJettison:2,
   site:{lat:28.5,azMin:37,azMax:112},mode:'orbit',orbit:{apogee:35786,perigee:185,inc:28.5},
   tags:['Unbuilt','Exotic','Historical'],
   note:'Titan IIIC with CHARIOT LF2 upper stage in place of Transtage. Never built. Stage masses estimated.'},

  // ───── SOVIET UNION ─────
  {name:'Vostok-K',
   stageNames:['R-7 Blok A (core)','R-7 Blok E'],
   boosterName:'R-7 Blok B/V/G/D',boosterCount:4,
   payload:4700,fairingMass:0,fairingJettison:0,
   site:{lat:45.9,azMin:40,azMax:100},mode:'orbit',orbit:{apogee:327,perigee:169,inc:65},
   tags:['Historical','Crewed'],
   note:'Vostok 1–6 (Gagarin). Blok E upper. ~4.7t to inclined LEO.'},

  {name:'Soyuz-U',
   stageNames:['R-7 Blok A (core)','Soyuz Blok I'],
   boosterName:'R-7 Blok B/V/G/D',boosterCount:4,
   payload:6850,fairingMass:0,fairingJettison:0,
   site:{lat:45.9,azMin:40,azMax:100},mode:'orbit',orbit:{apogee:250,perigee:200,inc:51.6},
   tags:['Historical','Crewed'],
   note:'Most-launched rocket. 1973–2017. ~6.85t to ISS orbit.'},

  {name:'Molniya-M',
   stageNames:['R-7 Blok A (core)','Soyuz Blok I','Blok L (kick)'],
   boosterName:'R-7 Blok B/V/G/D',boosterCount:4,
   payload:1900,fairingMass:0,fairingJettison:0,
   site:{lat:45.9,azMin:40,azMax:100},mode:'orbit',orbit:{apogee:39700,perigee:600,inc:63.4},
   tags:['Historical'],
   note:'Molniya HEO comms. 4-stage R-7 variant with Blok L. ~1.9t to Molniya.'},

  {name:'Proton-K',
   stageNames:['Proton Blok A','Proton Blok B','Proton Blok V'],
   payload:21000,fairingMass:0,fairingJettison:0,boosterName:null,boosterCount:0,
   site:{lat:45.9,azMin:50,azMax:100},mode:'orbit',orbit:{apogee:200,perigee:200,inc:51.6},
   tags:['Historical'],
   note:'3-stage Proton. N2O4/UDMH. ~21t LEO. Salyut, Mir modules.'},

  {name:'Proton-K / Blok D',
   stageNames:['Proton Blok A','Proton Blok B','Proton Blok V','Blok D'],
   payload:2100,fairingMass:0,fairingJettison:0,boosterName:null,boosterCount:0,
   site:{lat:45.9,azMin:50,azMax:100},mode:'escape',escape:{c3:8.7,decl:45,perigee:185},
   tags:['Historical','Deep Space'],
   note:'Mars/Venus probes. Blok D deep-space stage. LOX/Kero upper.'},

  {name:'N1',
   stageNames:['N1 Blok A','N1 Blok B','N1 Blok V','N1 Blok G (TLI)'],
   payload:95000,fairingMass:0,fairingJettison:0,boosterName:null,boosterCount:0,
   site:{lat:45.9,azMin:50,azMax:100},mode:'orbit',orbit:{apogee:185,perigee:185,inc:51.6},
   tags:['Historical','Never Succeeded'],
   note:'Soviet Moon rocket. 30× NK-15. All 4 launches failed. ~95t design LEO.'},

  {name:'Zenit-2',
   stageNames:['Zenit S1','Zenit Blok II'],
   payload:13740,fairingMass:0,fairingJettison:0,boosterName:null,boosterCount:0,
   site:{lat:45.9,azMin:50,azMax:100},mode:'orbit',orbit:{apogee:200,perigee:200,inc:51.6},
   tags:['Historical'],
   note:'RD-171 + RD-120. LOX/Kerosene. ~13.7t LEO. Baikonur.'},

  {name:'Kosmos-3M',
   stageNames:['Kosmos-3M S1','Kosmos-3M S2'],
   payload:1500,fairingMass:0,fairingJettison:0,boosterName:null,boosterCount:0,
   site:{lat:62.8,azMin:60,azMax:100},mode:'orbit',orbit:{apogee:800,perigee:800,inc:74},
   tags:['Historical'],
   note:'Workhorse small satellite launcher. N2O4/UDMH. 446 launches. ~1.5t.'},

  {name:'Energia',
   stageNames:['Energia Blok Ts'],
   boosterName:'Energia Zenit SRB',boosterCount:4,
   payload:100000,fairingMass:0,fairingJettison:0,
   site:{lat:45.9,azMin:50,azMax:100},mode:'orbit',orbit:{apogee:200,perigee:200,inc:51.6},
   tags:['Historical'],
   note:'Buran/Polyus. 4× Zenit strap-ons + LOX/LH2 core. ~100t LEO (design).'},
];
// ─── ORBIT CATEGORIES ─────────────────────────
// All C3 values are Earth-departure hyperbolic excess energy (km²/s²)
// Injection burn computed via vis-viva: Vinj = √(Vesc² + C3) where Vesc²=2μ/r
const ORBIT_CATEGORIES=[
  {planet:'Earth', icon:'⊕', color:'#4a9fff', orbits:[
    {name:'LEO 200 km',      mode:'orbit',apogee:200,  perigee:200,  inc:28.5,parking:185,incTracksLat:true,note:'Minimum stable LEO. Inclination = launch site latitude.'},
    {name:'ISS',             mode:'orbit',apogee:418,  perigee:408,  inc:51.6,parking:185,note:'International Space Station. 51.6° for Russian site access.'},
    {name:'Sun-Sync 700 km', mode:'orbit',apogee:700,  perigee:700,  inc:98.2,parking:185,note:'Sun-synchronous Earth observation. 98.2° retrograde.'},
    {name:'Polar 800 km',    mode:'orbit',apogee:800,  perigee:800,  inc:90,  parking:185,note:'True polar. Full Earth coverage.'},
    {name:'GPS / MEO',       mode:'orbit',apogee:20200,perigee:20200,inc:55,  parking:185,note:'GPS constellation. 12-hour period.'},
    {name:'Molniya',         mode:'orbit',apogee:39700,perigee:600,  inc:63.4,parking:185,note:'HEO 12-hr. 63.4° freezes apsides. Soviet Arctic comms.'},
    {name:'Tundra',          mode:'orbit',apogee:46300,perigee:17900,inc:63.4,parking:185,note:'24-hr HEO. Single-satellite Arctic coverage.'},
    {name:'GTO',             mode:'orbit',apogee:35786,perigee:185,  inc:28.5,parking:185,incTracksLat:true,note:'Geostationary Transfer Orbit. Inclination = launch site latitude (or range safety minimum).'},
    {name:'GEO',             mode:'orbit',apogee:35786,perigee:35786,inc:0,   parking:185,note:'Geostationary. 0° inc. Plane change combined at apogee.'},
    {name:'Graveyard',       mode:'orbit',apogee:36086,perigee:36086,inc:0,   parking:185,note:'300 km above GEO per IADC guidelines.'},
    {name:'Sun-Sync GTO',    mode:'orbit',apogee:35786,perigee:500,  inc:98.2,parking:185,note:'High-inclination GTO for SSO replenishment.'},
  ]},
  {planet:'Moon', icon:'☽', color:'#c0c0c0', orbits:[
    {name:'Trans-Lunar Inj.', mode:'escape',c3:-1.9,  decl:28.5,perigee:185,note:'TLI from 185 km. C3≈−1.9 km²/s². ~3.14 km/s injection burn.'},
    {name:'TLI (polar appr.)',mode:'escape',c3:-1.9,  decl:45,  perigee:185,note:'TLI for polar lunar approach. Higher departure declination.'},
    {name:'Fast Lunar',       mode:'escape',c3:0.5,   decl:28.5,perigee:185,note:'Higher energy TLI for faster transit. ~3.26 km/s.'},
  ]},
  {planet:'Mars', icon:'♂', color:'#cc4433', orbits:[
    {name:'Mars (min energy)',mode:'escape',c3:8.7,   decl:28.5,perigee:185,note:'Hohmann-like minimum energy. C3=8.7 km²/s². ~3.62 km/s.'},
    {name:'Mars (fast)',      mode:'escape',c3:16.0,  decl:28.5,perigee:185,note:'~7 month transit. C3=16 km²/s². ~3.93 km/s.'},
    {name:'Mars (opposition)',mode:'escape',c3:25.0,  decl:28.5,perigee:185,note:'Short-period opposition class. Higher C3 but shorter transit.'},
  ]},
  {planet:'Venus', icon:'♀', color:'#ffaa44', orbits:[
    {name:'Venus (min energy)',mode:'escape',c3:6.3,  decl:28.5,perigee:185,note:'Minimum Hohmann to Venus. C3≈6.3 km²/s². ~3.54 km/s.'},
    {name:'Venus (fast)',      mode:'escape',c3:12.0, decl:28.5,perigee:185,note:'Faster Venus transfer. C3≈12 km²/s².'},
  ]},
  {planet:'Mercury', icon:'☿', color:'#aa8866', orbits:[
    {name:'Mercury (direct)', mode:'escape',c3:56.7, decl:28.5,perigee:185,note:'Direct Hohmann to Mercury. C3≈56.7 km²/s². Very high energy.'},
  ]},
  {planet:'Jupiter', icon:'♃', color:'#cc8844', orbits:[
    {name:'Jupiter (direct)', mode:'escape',c3:77.4, decl:28.5,perigee:185,note:'Direct to Jupiter. C3≈77.4 km²/s². ~6.37 km/s injection.'},
    {name:'Jupiter (Voyager)',mode:'escape',c3:98.5, decl:28.5,perigee:185,note:'Voyager 1 trajectory. C3=98.5 km²/s². Jupiter gravity assist to Saturn.'},
  ]},
  {planet:'Saturn', icon:'♄', color:'#ccbb88', orbits:[
    {name:'Saturn (direct)',  mode:'escape',c3:105.7,decl:28.5,perigee:185,note:'Direct Hohmann to Saturn. C3≈105.7 km²/s².'},
  ]},
  {planet:'Uranus', icon:'♅', color:'#44cccc', orbits:[
    {name:'Uranus (direct)',  mode:'escape',c3:127.5,decl:28.5,perigee:185,note:'Direct to Uranus. C3≈127.5 km²/s².'},
  ]},
  {planet:'Neptune', icon:'♆', color:'#4455cc', orbits:[
    {name:'Neptune (direct)', mode:'escape',c3:135.9,decl:28.5,perigee:185,note:'Direct to Neptune. C3≈135.9 km²/s².'},
  ]},
  {planet:'Beyond', icon:'✦', color:'#9944cc', orbits:[
    {name:'Solar Escape',     mode:'escape',c3:152.0,decl:28.5,perigee:185,note:'Solar system escape velocity. C3≈152 km²/s².'},
    {name:'Earth Escape',     mode:'escape',c3:0.1,  decl:28.5,perigee:185,note:'Minimum Earth escape. C3≈0 km²/s². ~3.23 km/s.'},
  ]},
];

let userLVs=[];
let userOrbitsByCategory={}; // { categoryName: [{orbit}, ...] }
let collapsedPlanets=new Set();

// ─── PAGE NAVIGATION ──────────────────────────
function showPage(p){
  document.querySelectorAll('.page').forEach(el=>{
    el.classList.remove('active');
    el.style.display='none';
  });
  document.querySelectorAll('.nav-btn').forEach(el=>el.classList.remove('active'));
  const pg=document.getElementById('page-'+p);
  pg.classList.add('active');
  pg.style.display=(p==='program')?'flex':'block';
  document.getElementById('nav-'+p).classList.add('active');
}

// ─── BUILD TABLE ──────────────────────────────
function saveStoreFromDOM(){
  for(let s=0;s<MAX_STAGES;s++){
    if(!stageStore[s])stageStore[s]={};
    ROWS.forEach(row=>{const el=document.getElementById(`s${s+1}_${row.key}`);if(el)stageStore[s][row.key]=el.value;});
  }
}

function buildTable(){
  _suppressUD=true;
  const hr=document.getElementById('stage-header-row');
  hr.innerHTML='<th style="white-space:nowrap;">Parameter</th>';

  // ── Booster column before Stage 1 ──
  if(useBooster){
    const cnt=parseInt(document.getElementById('num-boosters')?.value)||0;
    const bth=document.createElement('th');
    bth.className='sh sh-booster';
    bth.textContent=`Strap-on ×${cnt}`;
    bth.title='Strap-on boosters — fire in parallel with Stage 1. Drop a stage here.';
    bth.style.cursor='copy';
    bth.addEventListener('dragover',e=>{e.preventDefault();bth.classList.add('sh-booster-hover');});
    bth.addEventListener('dragleave',()=>{bth.classList.remove('sh-booster-hover');});
    bth.addEventListener('drop',e=>{e.preventDefault();bth.classList.remove('sh-booster-hover');if(_draggingStage)applyBoosterData(_draggingStage);});
    hr.appendChild(bth);
  }

  // ── Stage columns ──
  for(let s=0;s<numStages;s++){
    const th=document.createElement('th');
    th.className='sh';
    th.textContent=`Stage ${s+1}`;
    th.style.cursor='copy';
    th.title='Drop a stage from the library here';
    const si=s;
    th.addEventListener('dragover', e=>onColDragOver(e,si));
    th.addEventListener('dragleave',e=>onColDragLeave(e,si));
    th.addEventListener('drop',     e=>onColDrop(e,si));
    hr.appendChild(th);
  }
  // ── Ghost columns (up to 4 total) ──
  const numGhost=Math.max(0,4-numStages);
  for(let g=0;g<numGhost;g++){
    const slotIdx=numStages+g;
    const gth=document.createElement('th');
    gth.className='sh sh-ghost';
    gth.textContent=`Stage ${slotIdx+1}`;
    gth.title='Drop a stage here to add it';
    gth.addEventListener('dragover',e=>{e.preventDefault();gth.classList.add('drop-hover');});
    gth.addEventListener('dragleave',()=>gth.classList.remove('drop-hover'));
    gth.addEventListener('drop',e=>{
      e.preventDefault();gth.classList.remove('drop-hover');
      if(!_draggingStage||_draggingStage._isVehicle)return;
      setStages(slotIdx+1);
      applyStageData(slotIdx,_draggingStage);
    });
    hr.appendChild(gth);
  }

  // ── Booster row values (read from DOM before rebuild wipes them) ──
  const bDefaults={dry:500,prop:5000,thrust:400,isp:265,res:2};
  const bVals={};
  ['dry','prop','thrust','isp','res'].forEach(k=>{
    const el=document.getElementById(`b_${k}`);
    bVals[k]=el?el.value:bDefaults[k];
  });

  const tbody=document.getElementById('stage-tbody');
  tbody.innerHTML='';
  ROWS.forEach(row=>{
    const tr=document.createElement('tr');
    let html=`<td class="rl">${row.label}</td>`;
    // Booster cell (before Stage 1)
    if(useBooster){
      html+=`<td class="s-active booster-cell"><input type="number" id="b_${row.key}" value="${bVals[row.key]??bDefaults[row.key]}" min="0" step="any" oninput="buildStageComposition();markLVUserDefined()"></td>`;
    }
    for(let s=0;s<numStages;s++){
      const id=`s${s+1}_${row.key}`;
      const val=(stageStore[s]&&stageStore[s][row.key]!==undefined)?stageStore[s][row.key]:row.def[s];
      html+=`<td class="s-active"><input type="number" id="${id}" value="${val}" min="0" step="any"></td>`;
    }
    // Ghost cells
    for(let g=0;g<numGhost;g++){
      html+=`<td class="s-active ghost-cell"><input type="number" value="0" disabled tabindex="-1"></td>`;
    }
    tr.innerHTML=html;
    tbody.appendChild(tr);
  });
  const fj=document.getElementById('fairing-jettison');
  const prev=fj.value;
  fj.innerHTML='<option value="0">Never</option>';
  for(let s=1;s<=numStages;s++){const o=document.createElement('option');o.value=s;o.textContent=`Stage ${s}`;fj.appendChild(o);}
  fj.value=parseInt(prev)<=numStages?prev:Math.min(2,numStages);
  buildStageButtons();
  _suppressUD=false;
  buildStageComposition();
}

function buildStageButtons(){
  const sel=document.getElementById('stage-selector');
  sel.innerHTML='';
  const minus=document.createElement('button');
  minus.textContent='−';minus.style.cssText='font-size:15px;padding:4px 14px;letter-spacing:0;';
  minus.onclick=()=>{setStages(numStages-1);markLVUserDefined();};
  sel.appendChild(minus);
  const count=document.createElement('button');
  count.textContent=numStages;count.style.cssText='font-size:13px;padding:4px 16px;font-weight:600;pointer-events:none;color:var(--accent);';
  sel.appendChild(count);
  const plus=document.createElement('button');
  plus.textContent='+';plus.style.cssText='font-size:15px;padding:4px 14px;letter-spacing:0;';
  plus.onclick=()=>{setStages(numStages+1);markLVUserDefined();};
  sel.appendChild(plus);
  if(typeof vehicleMode!=='undefined'&&vehicleMode==='advanced')syncAdvControls();
}

// ─── CONTROLS ─────────────────────────────────
function onStageCountInput(v){const n=Math.max(1,Math.min(MAX_STAGES,parseInt(v)||1));if(n!==numStages)setStages(n,false);}
function setStages(n,updateInput=true){
  n=Math.max(1,Math.min(MAX_STAGES,n));numStages=n;
  if(updateInput)document.getElementById('stage-count-input').value=n;
  _suppressUD=true;buildTable();
}
function setBoosters(val){
  useBooster=val;
  document.querySelectorAll('#booster-toggle button').forEach((b,i)=>b.classList.toggle('active',i===(val?0:1)));
  document.getElementById('booster-count-wrap').style.display=val?'flex':'none';
  _suppressUD=true;
  buildTable();
}
function setRestart(val){restartable=val;document.querySelectorAll('#restart-toggle button').forEach((b,i)=>b.classList.toggle('active',i===(val?0:1)));}
function setTraj(t){trajectory=t;document.querySelectorAll('#traj-toggle button').forEach((b,i)=>b.classList.toggle('active',['direct','two-burn','optimal'][i]===t));}
function setDestMode(mode){
  destMode=mode;
  document.getElementById('dest-orbit').style.display=mode==='orbit'?'block':'none';
  document.getElementById('dest-escape').style.display=mode==='escape'?'block':'none';
  document.getElementById('mode-orbit-btn').classList.toggle('active',mode==='orbit');
  document.getElementById('mode-escape-btn').classList.toggle('active',mode==='escape');
}

// ─── USER-DEFINED TRACKING ────────────────────
function markOrbitUserDefined(){
  if(activeOrbitKey!=='user_defined_orbit'){activeOrbitKey='user_defined_orbit';userDefinedOrbit=true;buildOrbitCategories();}
}
function markLVUserDefined(){
  if(!_suppressUD&&activePresetKey!=='user_defined'){activePresetKey='user_defined';userDefinedLV=true;buildPresets();}
}

// ─── VEHICLES PANEL ───────────────────────────
// Vehicle filter state
let vehicleFilters={};
let vehicleFilterOpen=false;
const VEHICLE_FILTER_TREE={
  'Propellant':['Liquid Oxygen / Liquid Hydrogen','Liquid Oxygen / Kerosene','Liquid Oxygen / Methane','Liquid Oxygen / Ethanol','Nitrogen Tetroxide / Aerozine-50','Nitrogen Tetroxide / UDMH','Inhibited Red Fuming Nitric Acid / UDMH','Liquid Fluorine / Hydrazine','Solid Propellant'],
  'Payload Class':['Nano (<50 kg)','Small (<1 t)','Medium (1–10 t)','Heavy (10–50 t)','Super Heavy (>50 t)'],
  'Era':['1940s','1950s','1960s','1970s','1980s','1990s-2000s','2010s+'],
  'Origin':['American','Soviet / Russian','European'],
  'Mission':['Crewed','Deep Space','Historical','Active','Unbuilt','Exotic'],
};

function vehicleMatchesFilters(tags){
  return Object.entries(vehicleFilters).every(([cat,sel])=>{
    if(!sel.size)return true;
    return[...sel].some(t=>tags.includes(t));
  });
}

function buildVehicleFilterPanel(){
  const panel=document.getElementById('vehicle-filter-panel');
  if(!panel)return;
  panel.innerHTML='';
  Object.entries(VEHICLE_FILTER_TREE).forEach(([cat,opts])=>{
    const div=document.createElement('div');div.className='filter-cat';
    const hdr=document.createElement('div');hdr.className='filter-cat-hdr';
    const chev=document.createElement('span');chev.className='filter-cat-chevron open';chev.textContent='▶';
    hdr.appendChild(chev);
    const lbl=document.createElement('span');lbl.className='filter-cat-label';lbl.textContent=cat;hdr.appendChild(lbl);
    const active=vehicleFilters[cat]?.size||0;
    if(active){const b=document.createElement('span');b.style.cssText='font-family:var(--mono);font-size:8px;color:var(--accent);border:1px solid var(--accent);padding:1px 4px;margin-left:4px;';b.textContent=active;hdr.appendChild(b);}
    let collapsed=false;
    hdr.onclick=()=>{collapsed=!collapsed;row.style.display=collapsed?'none':'';chev.classList.toggle('open',!collapsed);};
    div.appendChild(hdr);
    const row=document.createElement('div');row.className='filter-opts';
    opts.forEach(opt=>{
      const active=vehicleFilters[cat]?.has(opt);
      const btn=document.createElement('div');btn.className='filter-opt'+(active?' active':'');
      btn.textContent=opt;
      btn.onclick=()=>{
        if(!vehicleFilters[cat])vehicleFilters[cat]=new Set();
        vehicleFilters[cat].has(opt)?vehicleFilters[cat].delete(opt):vehicleFilters[cat].add(opt);
        if(!vehicleFilters[cat].size)delete vehicleFilters[cat];
        buildVehicleFilterPanel();updateVehicleFilterChips();buildPresets();
      };
      row.appendChild(btn);
    });
    div.appendChild(row);panel.appendChild(div);
  });
}

function updateVehicleFilterChips(){
  const chips=document.getElementById('vehicle-filter-chips');
  if(!chips)return;
  chips.innerHTML='';
  let any=false;
  Object.entries(vehicleFilters).forEach(([cat,tags])=>{
    tags.forEach(tag=>{
      any=true;
      const chip=document.createElement('div');chip.className='filter-chip';
      const chx2=document.createElement('span');chx2.className='filter-chip-x';chx2.textContent='×';const cc2=cat,tt2=tag;chx2.onclick=()=>removeVehicleFilter(cc2,tt2);chip.innerHTML=`<span>${tag}</span>`;chip.appendChild(chx2);
      chips.appendChild(chip);
    });
  });
  const clr=document.getElementById('vehicle-clear-filters');
  if(clr)clr.style.display=any?'':'none';
  const ftb=document.getElementById('vehicle-filter-btn');
  if(ftb)ftb.classList.toggle('active',any||vehicleFilterOpen);
}

function removeVehicleFilter(cat,tag){
  if(vehicleFilters[cat]){vehicleFilters[cat].delete(tag);if(!vehicleFilters[cat].size)delete vehicleFilters[cat];}
  buildVehicleFilterPanel();updateVehicleFilterChips();buildPresets();
}

function toggleVehicleFilters(){
  vehicleFilterOpen=!vehicleFilterOpen;
  const p=document.getElementById('vehicle-filter-panel');
  if(p)p.style.display=vehicleFilterOpen?'block':'none';
  if(vehicleFilterOpen)buildVehicleFilterPanel();
  const ftb=document.getElementById('vehicle-filter-btn');
  if(ftb)ftb.classList.toggle('active',vehicleFilterOpen||Object.keys(vehicleFilters).length>0);
}

function buildPresets(){
  const grid=document.getElementById('preset-grid');
  const q=(document.getElementById('lv-search')?.value||'').toLowerCase();
  grid.innerHTML='';

  const addItem=(p,key,isUser,isDefined,onDel)=>{
    const tags=isUser?(p.tags||[]):computeVehicleTags(p);
    if(!vehicleMatchesFilters(tags))return;
    const label=p.name||'Unnamed LV';
    const subtext=isUser?'':(p.stageNames||[]).join(' + ');
    const searchStr=(label+' '+subtext+' '+(p.note||'')+' '+tags.join(' ')).toLowerCase();
    if(q&&!searchStr.includes(q))return;
    const item=document.createElement('div');item.className='lv-item';
    const btn=document.createElement('button');
    btn.className='lv-item-btn'+(activePresetKey===key?' active':'')+(isUser?' user-lv':'')+(isDefined?' user-defined':'');
    btn.onclick=isUser?()=>loadPreset(p,key):()=>loadPreset(p,key);
    // Name + stage summary
    const nameEl=document.createElement('div');nameEl.style.cssText='font-size:11px;';nameEl.textContent=label;
    btn.appendChild(nameEl);
    if(subtext){
      const sub=document.createElement('div');
      sub.style.cssText='font-size:8px;color:var(--text-dim);margin-top:2px;white-space:normal;line-height:1.4;';
      sub.textContent=subtext;btn.appendChild(sub);
    }
    item.appendChild(btn);
    if(onDel){const x=document.createElement('button');x.className='lv-del';x.textContent='×';x.title='Remove from list';x.onclick=onDel;item.appendChild(x);}
    grid.appendChild(item);
  };

  BUILTIN_PRESETS.forEach((p,i)=>addItem(p,'builtin_'+i,false,false,null));
  userLVs.forEach((lv,i)=>addItem(lv,'user_'+i,true,false,()=>{userLVs.splice(i,1);if(activePresetKey==='user_'+i)activePresetKey=null;buildPresets();}));
  if(userDefinedLV)addItem({name:'[ User-Defined LV ]',tags:[]},'user_defined',false,true,null);
}

function loadPreset(p,key){
  activePresetKey=key||null;userDefinedLV=false;
  // Set stage name tracking BEFORE resolving
  currentStageNames=new Array(15).fill(null);
  currentBoosterName=null;
  stageSaved=new Array(15).fill(false);
  boosterSaved=false;
  if(p.stageNames)p.stageNames.forEach((n,i)=>currentStageNames[i]=n);
  if(p.boosterName)currentBoosterName=p.boosterName;
  // Resolve stage names to data
  const stageData=resolvePresetStages(p);
  const boosterData=resolvePresetBooster(p);
  const numStgs=stageData.length;
  stageData.forEach((sd,si)=>{stageStore[si]={dry:String(sd.dry),prop:String(sd.prop),thrust:String(sd.thrust),isp:String(sd.isp),res:String(sd.res??2)};});
  _suppressUD=true;setStages(numStgs);
  const hasBoosters=!!boosterData;
  setBoosters(hasBoosters);
  if(hasBoosters){
    const bd=boosterData;
    ['dry','prop','thrust','isp','res'].forEach(k=>{const el=document.getElementById(`b_${k}`);if(el)el.value=bd[k]??0;});
    document.getElementById('num-boosters').value=bd.count||0;
  }
  if(p.payload!==undefined)document.getElementById('payload-mass').value=p.payload;
  if(p.fairingMass!==undefined)document.getElementById('fairing-mass').value=p.fairingMass;
  if(p.site){document.getElementById('site-lat').value=p.site.lat??28.5;document.getElementById('az-min').value=p.site.azMin??37;document.getElementById('az-max').value=p.site.azMax??112;matchSiteFromFields();}
  setDestMode(p.mode||'orbit');
  if(p.mode==='escape'&&p.escape){document.getElementById('c3').value=p.escape.c3;document.getElementById('decl').value=p.escape.decl;document.getElementById('escape-perigee').value=p.escape.perigee;}
  else if(p.orbit){document.getElementById('apogee').value=p.orbit.apogee;document.getElementById('perigee').value=p.orbit.perigee;document.getElementById('inclination').value=p.orbit.inc;}
  if(p.parkingAlt!==undefined)document.getElementById('parking-alt').value=p.parkingAlt;
  if(p.trajectory)setTraj(p.trajectory);
  setTimeout(()=>{const fj=document.getElementById('fairing-jettison');if(fj)fj.value=Math.min(p.fairingJettison??0,p.stages??1);},20);
  lastResult=p.performanceResults||null;
  const _spb=document.getElementById('save-case-btn');if(_spb)_spb.disabled=!lastResult;
    const scBtn=document.getElementById('save-case-btn');if(scBtn)scBtn.disabled=!lastResult;
  document.getElementById('results-panel').innerHTML=`<div class="placeholder-msg">// ${p.name||'LV'} loaded — click Results to calculate</div>${p.note?`<div class="note" style="margin:12px 0 0">${p.note}</div>`:''}`;
  buildPresets();
  buildStageComposition();
}

// ─── ORBIT CATEGORIES ─────────────────────────
function buildOrbitCategories(){
  const container=document.getElementById('orbit-categories');
  container.innerHTML='';
  const _oq=(document.getElementById('orbit-search')?.value||'').toLowerCase();

  // Build list of all categories: built-in + any user-created ones not in built-ins
  const builtinNames=new Set(ORBIT_CATEGORIES.map(c=>c.planet));
  const userCatNames=Object.keys(userOrbitsByCategory).filter(k=>!builtinNames.has(k));

  // Helper: render one orbit button (with optional delete)
  const renderOrbit=(grid,o,key,onDel)=>{
    const wrap=document.createElement('div');
    wrap.style.cssText='display:flex;gap:2px;';
    const btn=document.createElement('button');
    btn.className='orbit-btn'+(onDel?' user-orbit':'')+(activeOrbitKey===key?' active':'');
    btn.style.flex='1';
    btn.innerHTML=`<b>${o.mode==='escape'?'↗ ':'⊙ '}${o.name}</b>`;
    btn.title=o.note||'';
    btn.onclick=()=>loadOrbitPreset(o,key);
    wrap.appendChild(btn);
    if(onDel){
      const x=document.createElement('button');
      x.className='orbit-btn';
      x.style.cssText='flex:none;width:22px;padding:4px 3px;color:#ff4444;border-color:rgba(255,68,68,.4);font-size:13px;';
      x.textContent='×';x.title='Remove from list';x.onclick=onDel;
      wrap.appendChild(x);
    }
    grid.appendChild(wrap);
  };

  // Helper: render one planet section
  const renderSection=(name,icon,color,builtinOrbits,userOrbitsInCat)=>{
    const collapsed=_oq?false:collapsedPlanets.has(name); // auto-expand when searching
    const hasContent=builtinOrbits.length+userOrbitsInCat.length>0||(name==='(current)'&&userDefinedOrbit);
    if(!hasContent)return;
    const sec=document.createElement('div');sec.className='planet-section';
    const hdr=document.createElement('div');hdr.className='planet-header';
    hdr.style.cssText=`border-left:3px solid ${color};`;
    hdr.innerHTML=`<span class="planet-icon">${icon}</span><span class="planet-name" style="color:${color}">${name}</span><span class="planet-chevron${collapsed?' collapsed':''}">▼</span>`;
    hdr.onclick=()=>{collapsedPlanets.has(name)?collapsedPlanets.delete(name):collapsedPlanets.add(name);buildOrbitCategories();};
    sec.appendChild(hdr);
    if(!collapsed){
      const grid=document.createElement('div');grid.className='planet-orbits';
      // Built-in orbits (no delete)
      builtinOrbits.forEach((o,oi)=>{
        const key=`orbit_${name}_${oi}`;
        renderOrbit(grid,o,key,null);
      });
      // User orbits (with delete)
      userOrbitsInCat.forEach((o,ui)=>{
        const key=`uorbit_${name}_${ui}`;
        renderOrbit(grid,o,key,()=>{
          userOrbitsByCategory[name].splice(ui,1);
          if(!userOrbitsByCategory[name].length)delete userOrbitsByCategory[name];
          if(activeOrbitKey===key)activeOrbitKey=null;
          buildOrbitCategories();
        });
      });
      sec.appendChild(grid);
    }
    container.appendChild(sec);
  };

  // Render built-in categories (filtered by search)
  ORBIT_CATEGORIES.forEach(cat=>{
    const filtBuiltin=_oq?cat.orbits.filter(o=>o.name.toLowerCase().includes(_oq)||cat.planet.toLowerCase().includes(_oq)):cat.orbits;
    const filtUser=_oq?(userOrbitsByCategory[cat.planet]||[]).filter(o=>o.name.toLowerCase().includes(_oq)):userOrbitsByCategory[cat.planet]||[];
    renderSection(cat.planet,cat.icon,cat.color,filtBuiltin,filtUser);
  });

  // Render user-created categories (filtered by search)
  userCatNames.forEach(name=>{
    const filtUser=_oq?(userOrbitsByCategory[name]||[]).filter(o=>o.name.toLowerCase().includes(_oq)):userOrbitsByCategory[name]||[];
    renderSection(name,'◆','var(--accent3)',[],filtUser);
  });

  // "Current Parameters" tracking button (unsaved edits)
  if(userDefinedOrbit){
    const sec=document.createElement('div');sec.className='planet-section';
    const hdr=document.createElement('div');hdr.className='planet-header';
    hdr.style.cssText='border-left:3px solid var(--text-dim);opacity:0.7;';
    hdr.innerHTML=`<span class="planet-icon">✏</span><span class="planet-name">Unsaved</span>`;
    sec.appendChild(hdr);
    const grid=document.createElement('div');grid.className='planet-orbits';
    const btn=document.createElement('button');
    btn.className='orbit-btn user-orbit'+(activeOrbitKey==='user_defined_orbit'?' active':'');
    btn.innerHTML='<b>Current Parameters</b>';
    btn.title='Current unsaved orbit parameters';
    btn.onclick=()=>{activeOrbitKey='user_defined_orbit';buildOrbitCategories();};
    grid.appendChild(btn);
    sec.appendChild(grid);container.appendChild(sec);
  }
}

function loadOrbitPreset(o,key){
  activeOrbitKey=key;userDefinedOrbit=false;
  setDestMode(o.mode||'orbit');
  if(o.mode==='escape'){
    document.getElementById('c3').value=o.c3;
    document.getElementById('decl').value=o.decl;
    document.getElementById('escape-perigee').value=o.perigee??185;
  } else {
    document.getElementById('apogee').value=o.apogee;
    document.getElementById('perigee').value=o.perigee;
    // If incTracksLat, override with effective site inclination
    const site=getCurrentSite();
    const inc=o.incTracksLat&&site ? siteEffectiveInc(site) : o.inc;
    document.getElementById('inclination').value=inc;
    document.getElementById('parking-alt').value=o.parking??185;
  }
  buildOrbitCategories();
  // Update tracked-inc note
  const site=getCurrentSite();
  if(site)updateIncTrackedNote(site);
  else document.getElementById('inc-tracked-note').style.display='none';
}

// ─── SAVE / LOAD ORBITS ───────────────────────
function saveUserOrbit(){
  document.getElementById('orbit-save-name').value='';
  // Populate category dropdown
  const sel=document.getElementById('orbit-save-category');
  sel.innerHTML='';
  ORBIT_CATEGORIES.forEach(cat=>{
    const o=document.createElement('option');o.value=cat.planet;o.textContent=cat.planet;sel.appendChild(o);
  });
  Object.keys(userOrbitsByCategory).filter(k=>!ORBIT_CATEGORIES.find(c=>c.planet===k)).forEach(k=>{
    const o=document.createElement('option');o.value=k;o.textContent=k+' (custom)';sel.appendChild(o);
  });
  const newOpt=document.createElement('option');newOpt.value='__new__';newOpt.textContent='[ New Category... ]';sel.appendChild(newOpt);
  document.getElementById('orbit-new-cat-wrap').style.display='none';
  openModal('modal-save-orbit');
  setTimeout(()=>document.getElementById('orbit-save-name').focus(),100);
}

function onOrbitCategoryChange(val){
  document.getElementById('orbit-new-cat-wrap').style.display=val==='__new__'?'block':'none';
}

function doSaveOrbit(){
  const name=document.getElementById('orbit-save-name').value.trim()||'My Orbit';
  let cat=document.getElementById('orbit-save-category').value;
  if(cat==='__new__'){
    cat=document.getElementById('orbit-new-cat-name').value.trim()||'Custom';
  }
  const o=collectCurrentOrbit();o.name=name;o.note=o.note||'User-defined orbit.';
  if(!userOrbitsByCategory[cat])userOrbitsByCategory[cat]=[];
  const idx=userOrbitsByCategory[cat].length;
  userOrbitsByCategory[cat].push(o);
  downloadJSON({...o,_category:cat},(name+'.json').replace(/[^a-z0-9_.\-]/gi,'_').toLowerCase());
  activeOrbitKey=`uorbit_${cat}_${idx}`;
  userDefinedOrbit=false;
  closeModal('modal-save-orbit');
  buildOrbitCategories();
}

function collectCurrentOrbit(){
  if(destMode==='escape')return{mode:'escape',c3:gv('c3'),decl:gv('decl'),perigee:gv('escape-perigee')};
  return{mode:'orbit',apogee:gv('apogee'),perigee:gv('perigee'),inc:gv('inclination'),parking:gv('parking-alt')};
}

function loadOrbitFile(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const o=JSON.parse(e.target.result);
      if(!o.mode){alert('Invalid orbit file: missing mode field.');return;}
      const cat=o._category||'Custom';
      if(!userOrbitsByCategory[cat])userOrbitsByCategory[cat]=[];
      const idx=userOrbitsByCategory[cat].length;
      userOrbitsByCategory[cat].push(o);
      const key=`uorbit_${cat}_${idx}`;
      loadOrbitPreset(o,key);
    }catch(err){alert('Invalid orbit JSON: '+err.message);}
  };
  reader.readAsText(file);input.value='';
}

// ─── PHYSICS ──────────────────────────────────
function circVel(alt){return Math.sqrt(MU/(RE+alt))*1000;}
function rotVel(lat,azMin,azMax){
  const Vm=OMEGA_E*RE*1000*Math.cos(lat*Math.PI/180);
  let best=0;[azMin,azMax,90].forEach(az=>{const c=Vm*Math.cos((az-90)*Math.PI/180);if(c>best)best=c;});
  return Math.max(0,Math.min(best,Vm));
}
function rocketEq(isp,m0,mf){return(mf<=0||m0<=mf)?0:G0*isp*Math.log(m0/mf);}
function gv(id){return parseFloat(document.getElementById(id)?.value)||0;}

function collectVehicle(){
  saveStoreFromDOM();
  const stages=[];
  for(let s=0;s<numStages;s++)stages.push({dry:parseFloat(stageStore[s].dry)||0,prop:parseFloat(stageStore[s].prop)||0,thrust:parseFloat(stageStore[s].thrust)||0,isp:parseFloat(stageStore[s].isp)||1,res:parseFloat(stageStore[s].res)||0});
  const booster=useBooster?{dry:gv('b_dry'),prop:gv('b_prop'),thrust:gv('b_thrust'),isp:parseFloat(document.getElementById('b_isp').value)||1,res:gv('b_res'),count:parseInt(document.getElementById('num-boosters').value)||0}:null;
  return{name:'',note:'',stages:numStages,boosters:useBooster,restartable,stageData:stages,boosterData:booster,payload:gv('payload-mass'),fairingMass:gv('fairing-mass'),fairingJettison:parseInt(document.getElementById('fairing-jettison').value),site:{lat:gv('site-lat'),azMin:gv('az-min'),azMax:gv('az-max')},mode:destMode,orbit:destMode==='orbit'?{apogee:gv('apogee'),perigee:gv('perigee'),inc:gv('inclination')}:null,escape:destMode==='escape'?{c3:gv('c3'),decl:gv('decl'),perigee:gv('escape-perigee')}:null,trajectory,parkingAlt:destMode==='orbit'?gv('parking-alt'):gv('escape-perigee')};
}

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
      const Tmix_=0.405*tBT+0.595*T3s_;
      const DVpen_=K3+K4*Tmix_;
      const DVasc_=Vcirc+DVpen_-Vrot;
      const DVtot_=DVasc_+onOrbitDV;
      const margin_=tDV-DVtot_;
      return{sDVs,sBTs,tDV,tBT,tMas_,Tmix_,DVpen_,DVasc_,DVtot_,margin_};
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

    lastResult={modeLabel,maxPayload:maxPay,feasible,totalDV:totDV,DVasc,onOrbitDV,DVtot,DVmarg,DVpen,Vrot,TWR,totBT,Tmix,stageDVs:[...stageDVs],destMode,orbitParams:destMode==='orbit'?{apogee:gv('apogee'),perigee:gv('perigee'),inc:gv('inclination'),parkingAlt}:{c3:gv('c3'),decl:gv('decl'),perigee:gv('escape-perigee')}};
    const _spb2=document.getElementById('save-case-btn');if(_spb2)_spb2.disabled=false;

    renderResults(lastResult);

  }catch(e){panel.innerHTML=`<div class="error-msg">// CALCULATION ERROR: ${e.message}</div>`;console.error(e);}
}

function renderResults(r){
  const panel=document.getElementById('results-panel');
  if(!panel||!r)return;
  const {modeLabel,maxPayload:maxPay,feasible,totalDV:totDV,DVasc,onOrbitDV,DVtot,DVmarg,DVpen,Vrot,TWR,totBT,Tmix,stageDVs,destMode}=r;
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
    <div class="result-row"><span class="result-label">Total Ascent Time</span><span class="result-val">${fS(totBT)}</span></div>
    <div class="result-row"><span class="result-label">Mixed Ascent Time (Tmix)</span><span class="result-val">${fS(Tmix)}</span></div>
    <div class="stage-breakdown" style="margin-top:14px;">
      <div class="sl" style="margin-bottom:8px;">Stage ΔV Breakdown</div>
      ${bars}${bdown}
    </div>
    <div class="note">Method: Townsend-Schilling (2009). RMS ~260 m/s; &lt;10% payload error.<br>${destMode==='escape'?'Escape: hyperbolic injection Vinj=√(Vesc²+C3).':'Orbit: verified Hohmann from parking orbit.'} Always use vacuum Isp.</div>`;
}

// ─── SAVE / LOAD LV ───────────────────────────
function buildLVObject(name,note){
  const v=collectVehicle();v.name=name||'Unnamed LV';v.note=note||'';
  // Save stage names alongside data for composition view on load
  v.stageNames=currentStageNames.slice(0,numStages).map((n,i)=>n||null);
  if(currentBoosterName)v.boosterName=currentBoosterName;
  v.performanceCases=[...performanceCases];
  return v;
}
function downloadJSON(obj,filename){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();URL.revokeObjectURL(a.href);}
function openSaveLVModal(){document.getElementById('lv-save-name').value='';document.getElementById('lv-save-note').value='';openModal('modal-save-lv');setTimeout(()=>document.getElementById('lv-save-name').focus(),100);}
function doSaveLV(){
  const name=document.getElementById('lv-save-name').value.trim()||'LV';
  const note=document.getElementById('lv-save-note').value.trim();
  const obj=buildLVObject(name,note);
  downloadJSON(obj,name.replace(/[^a-z0-9_-]/gi,'_').toLowerCase()+'.json');
  obj._sessionId=Date.now();userLVs.push(obj);buildPresets();closeModal('modal-save-lv');
}
function savePerformance(){openSaveCaseModal();} // legacy alias
function loadLVFile(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{try{const obj=JSON.parse(e.target.result);applyLVObject(obj);if(!userLVs.find(lv=>lv.name===obj.name&&lv._sessionId===obj._sessionId)){obj._sessionId=obj._sessionId||Date.now();userLVs.push(obj);buildPresets();}}catch(err){alert('Invalid LV JSON: '+err.message);}};
  reader.readAsText(file);input.value='';
}
function applyLVObject(obj){
  currentStageNames=new Array(15).fill(null);
  currentBoosterName=null;
  stageSaved=new Array(15).fill(false);
  boosterSaved=false;
  if(obj.stageNames)obj.stageNames.forEach((n,i)=>currentStageNames[i]=n);
  if(obj.boosterName)currentBoosterName=obj.boosterName;
  // ── Vehicle config ──
  if(obj.stageData)obj.stageData.forEach((sd,si)=>{stageStore[si]={dry:String(sd.dry),prop:String(sd.prop),thrust:String(sd.thrust),isp:String(sd.isp),res:String(sd.res??2)};});
  // Resolve stage names if present (new format)
  if(obj.stageNames){
    const resolved=resolvePresetStages(obj);
    resolved.forEach((sd,si)=>{stageStore[si]={dry:String(sd.dry),prop:String(sd.prop),thrust:String(sd.thrust),isp:String(sd.isp),res:String(sd.res??2)};});
    _suppressUD=true;setStages(resolved.length);
    const bData=resolvePresetBooster(obj);
    setBoosters(!!bData);
    if(bData){['dry','prop','thrust','isp','res'].forEach(k=>{const el=document.getElementById(`b_${k}`);if(el)el.value=bData[k]??0;});document.getElementById('num-boosters').value=bData.count||0;}
  } else {
    _suppressUD=true;setStages(obj.stages||1);
    setBoosters(obj.boosters||false);
    if(obj.boosters&&obj.boosterData){const bd=obj.boosterData;['dry','prop','thrust','isp','res'].forEach(k=>{const el=document.getElementById(`b_${k}`);if(el)el.value=bd[k]??0;});document.getElementById('num-boosters').value=bd.count||0;}
  }
  if(obj.payload!==undefined)document.getElementById('payload-mass').value=obj.payload;
  if(obj.fairingMass!==undefined)document.getElementById('fairing-mass').value=obj.fairingMass;
  if(obj.site){document.getElementById('site-lat').value=obj.site.lat??28.5;document.getElementById('az-min').value=obj.site.azMin??37;document.getElementById('az-max').value=obj.site.azMax??112;matchSiteFromFields();}
  setDestMode(obj.mode||'orbit');
  if(obj.mode==='escape'&&obj.escape){document.getElementById('c3').value=obj.escape.c3??0;document.getElementById('decl').value=obj.escape.decl??28.5;document.getElementById('escape-perigee').value=obj.escape.perigee??185;}
  else if(obj.orbit){document.getElementById('apogee').value=obj.orbit.apogee??400;document.getElementById('perigee').value=obj.orbit.perigee??400;document.getElementById('inclination').value=obj.orbit.inc??28.5;}
  if(obj.parkingAlt!==undefined)document.getElementById('parking-alt').value=obj.parkingAlt;
  if(obj.trajectory)setTraj(obj.trajectory);
  setTimeout(()=>{const fj=document.getElementById('fairing-jettison');if(fj)fj.value=Math.min(obj.fairingJettison??0,obj.stages??1);},20);
  // ── Performance cases ──
  performanceCases=obj.performanceCases||[];
  // If no cases but legacy single result, wrap it
  if(!performanceCases.length&&obj.performanceResults){
    performanceCases=[{label:(obj.name||'LV')+' — imported',timestamp:new Date().toISOString(),result:obj.performanceResults,config:{modeLabel:obj.performanceResults.modeLabel||''}}];
  }
  activeCaseIndex=performanceCases.length>0?performanceCases.length-1:null;
  lastResult=activeCaseIndex!=null?performanceCases[activeCaseIndex].result:null;
  buildCaseList();
  const scBtn=document.getElementById('save-case-btn');if(scBtn)scBtn.disabled=!lastResult;
  // Show last case result or placeholder
  if(lastResult){renderResults(lastResult);}
  else{const panel=document.getElementById('results-panel');if(panel)panel.innerHTML=`<div class="placeholder-msg">// ${obj.name||'LV'} loaded — no performance cases yet. Calculate to add one.</div>`;}
  loadedVehicleName=obj.name||'';
}
function openJSONModal(){const obj=collectVehicle();if(lastResult)obj.performanceResults=lastResult;document.getElementById('json-editor').value=JSON.stringify(obj,null,2);document.getElementById('json-error').style.display='none';openModal('modal-json');}
function applyJSON(){const txt=document.getElementById('json-editor').value;try{const obj=JSON.parse(txt);applyLVObject(obj);closeModal('modal-json');}catch(e){const err=document.getElementById('json-error');err.textContent='// JSON parse error: '+e.message;err.style.display='block';}}

// ─── MODAL HELPERS ──────────────────────────────
function openModal(id){document.getElementById(id).style.display='flex';}
function closeModal(id){document.getElementById(id).style.display='none';}
document.addEventListener('click',e=>{if(e.target.classList.contains('modal-overlay'))e.target.style.display='none';});

// ─── THEMES ─────────────────────────────────────
const BUILTIN_THEMES={
  default:{name:'Default (Dark)',
    '--bg':'#0a0c10','--panel':'#0f1318','--border':'#1e2530','--border-bright':'#2e3d50',
    '--accent':'#00c8ff','--accent2':'#ff6b35','--accent3':'#7fff6b',
    '--text':'#c8d8e8','--text-dim':'#5a7080','--text-bright':'#e8f4ff',
    '--mono':"'JetBrains Mono',monospace",'--sans':"'Outfit',sans-serif"},
  perigee:{name:'Perigee',
    '--bg':'#3b393a','--panel':'#2e2c2d','--border':'#524f50','--border-bright':'#6e6b6c',
    '--accent':'#88c657','--accent2':'#c6a057','--accent3':'#b0e080',
    '--text':'#e7e8ea','--text-dim':'#a7a6a4','--text-bright':'#ffffff',
    '--mono':"'JetBrains Mono',monospace",'--sans':"'Outfit',sans-serif"},
  spacex:{name:'SpaceX',
    '--bg':'#849199','--panel':'#6e7a82','--border':'#9aaab4','--border-bright':'#b8c8d4',
    '--accent':'#015289','--accent2':'#ffffff','--accent3':'#ffffff',
    '--text':'#ffffff','--text-dim':'#d0dde5','--text-bright':'#ffffff',
    '--mono':"'JetBrains Mono',monospace",'--sans':"'Outfit',sans-serif"},
  blueorigin:{name:'Blue Origin',
    '--bg':'#0000fe','--panel':'#ffffff','--border':'#99aaff','--border-bright':'#0000fe',
    '--accent':'#0000fe','--accent2':'#3333cc','--accent3':'#0000cc',
    '--text':'#00008b','--text-dim':'#4444cc','--text-bright':'#000080',
    '--mono':"'JetBrains Mono',monospace",'--sans':"'Outfit',sans-serif"},
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
}
function rebuildThemeSelect(){
  const sel=document.getElementById('theme-select');const cur=sel.value;sel.innerHTML='';
  Object.entries(BUILTIN_THEMES).forEach(([k,t])=>{const o=document.createElement('option');o.value=k;o.textContent=t.name;sel.appendChild(o);});
  Object.entries(customThemes).forEach(([k,t])=>{const o=document.createElement('option');o.value=k;o.textContent=(t.name||k)+' (custom)';sel.appendChild(o);});
  sel.value=(cur in BUILTIN_THEMES||cur in customThemes)?cur:'perigee';
}
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
function loadThemeFile(input){const file=input.files[0];if(!file)return;const reader=new FileReader();reader.onload=e=>{try{const t=JSON.parse(e.target.result);const key='custom_'+(t.name||'theme').replace(/\s+/g,'_').toLowerCase();customThemes[key]=t;rebuildThemeSelect();applyTheme(key);}catch(err){alert('Invalid theme JSON: '+err.message);}};reader.readAsText(file);input.value='';}


// ─── STAGE LIBRARY ────────────────────────────
const STAGE_LIBRARY={
  'Booster Stages':[
    // ── US liquid-fuelled first stages ──
    {name:'WAC Corporal',      dry:90,    prop:474,    thrust:6.7,  isp:195, engines:'XCAL-200',       note:'First US guided missile. Sounding rocket.',                    tags:['Nitrogen Tetroxide / Aniline','First Stage','1940s','1950s','American']},
    {name:'Viking',            dry:480,   prop:6800,   thrust:94,   isp:225, engines:'XLR10-RM-2',     note:'NRL sounding rocket. LOX/Ethanol. Predecessor to Vanguard.',   tags:['Liquid Oxygen / Ethanol','First Stage','1950s','American']},
    {name:'Redstone',          dry:5443,  prop:23820,  thrust:370,  isp:215, engines:'LR-89 (A-7)',    note:'Mercury/Juno first stage. LOX/Ethanol.',                        tags:['Liquid Oxygen / Ethanol','First Stage','1950s','1960s','American']},
    {name:'Jupiter (A-7)',     dry:5624,  prop:54431,  thrust:750,  isp:247, engines:'S-3D/A-7',       note:'PGM-19 Jupiter IRBM. Used in Juno II.',                         tags:['Liquid Oxygen / Kerosene','First Stage','1950s','1960s','American']},
    {name:'Thor DSV-2',        dry:3400,  prop:46400,  thrust:758,  isp:296, engines:'LR-79-7',        note:'Thor IRBM. LOX/RP-1. Used in Thor-Able/Agena/Delta.',           tags:['Liquid Oxygen / Kerosene','First Stage','1950s','1960s','1970s','American']},
    {name:'Thor (Long Tank)',   dry:3600,  prop:66800,  thrust:758,  isp:296, engines:'LR-79-NA-11',   note:'Extended Thor. Delta variants.',                                tags:['Liquid Oxygen / Kerosene','First Stage','1960s','1970s','American']},
    {name:'Atlas D Sust.',     dry:3310,  prop:90000,  thrust:1600, isp:316, engines:'LR-105+LR-89',   note:'Stage-and-a-half. Boosters jettisoned at 2m 11s.',              tags:['Liquid Oxygen / Kerosene','First Stage','1960s','American']},
    {name:'Atlas SLV-3',       dry:3400,  prop:117000, thrust:1920, isp:316, engines:'MA-3',           note:'Atlas SLV-3 for Agena/Centaur missions.',                       tags:['Liquid Oxygen / Kerosene','First Stage','1960s','1970s','American']},
    {name:'Atlas I/II Booster', dry:3600, prop:145000, thrust:1920, isp:316, engines:'MA-5A',          note:'Atlas I/II first stage. LOX/RP-1.',                             tags:['Liquid Oxygen / Kerosene','First Stage','1990s-2000s','American']},
    {name:'Saturn I S-I',      dry:37500, prop:375000, thrust:7557, isp:288, engines:'8× H-1',         note:'Saturn I first stage. 8× H-1. LOX/RP-1.',                      tags:['Liquid Oxygen / Kerosene','First Stage','1960s','American']},
    {name:'Saturn IB S-IB',    dry:41594, prop:395979, thrust:7100, isp:294, engines:'8× H-1 (uprat)', note:'Saturn IB first stage. Uprated H-1.',                           tags:['Liquid Oxygen / Kerosene','First Stage','1960s','1970s','American']},
    {name:'Saturn V S-IC',     dry:135218,prop:2150999,thrust:34020,isp:304, engines:'5× F-1',         note:'Largest booster stage flown. F-1 vac Isp 304s.',               tags:['Liquid Oxygen / Kerosene','First Stage','1960s','1970s','American']},
    {name:'Titan I Stage 1',   dry:3230,  prop:72900,  thrust:1512, isp:290, engines:'LR-87-1',        note:'First Titan. LOX/RP-1. Only 2-stage LOX Titan.',                tags:['Liquid Oxygen / Kerosene','First Stage','1960s','American']},
    {name:'Titan II GLV S1',   dry:4526,  prop:112500, thrust:2090, isp:290, engines:'LR-87-7',        note:'Gemini LV. NTO/Aerozine-50.',                                  tags:['Nitrogen Tetroxide / Aerozine-50','First Stage','1960s','American']},
    {name:'Titan IIIC/D S1',   dry:8200,  prop:142000, thrust:2340, isp:301, engines:'LR-87-11',       note:'Titan III core stage 1.',                                       tags:['Nitrogen Tetroxide / Aerozine-50','First Stage','1970s','1980s','American']},
    {name:'Titan IIIE S1',     dry:9200,  prop:158000, thrust:2340, isp:301, engines:'LR-87-11',       note:'Titan IIIE core first stage.',                                  tags:['Nitrogen Tetroxide / Aerozine-50','First Stage','1970s','American']},
    {name:'Titan IV Stage 1',  dry:9200,  prop:165000, thrust:2340, isp:302, engines:'LR-87-AJ11',     note:'Titan IV. Uprated LR-87. NTO/Aerozine-50.',                    tags:['Nitrogen Tetroxide / Aerozine-50','First Stage','1990s-2000s','American']},
    {name:'Delta II S1',       dry:4800,  prop:96900,  thrust:1050, isp:302, engines:'RS-27A',         note:'LOX/RP-1. RS-27A.',                                             tags:['Liquid Oxygen / Kerosene','First Stage','1980s','1990s-2000s','American']},
    {name:'Delta III/IV S1',   dry:6100,  prop:151700, thrust:2141, isp:360, engines:'RS-68',          note:'LOX/LH2. Common Booster Core. Delta III/IV.',                  tags:['Liquid Oxygen / Liquid Hydrogen','First Stage','2000s','2010s+','American']},
    {name:'Antares S1 (Castor 30)', dry:3500, prop:44000, thrust:1285, isp:289, engines:'Castor 30XL', note:'Solid first stage for Antares 230.',                             tags:['Solid Propellant','First Stage','2010s+','American']},
    {name:'Vanguard S1',       dry:1990,  prop:10200,  thrust:125,  isp:248, engines:'GE X-405',         note:'Vanguard first stage. LOX/Kerosene.',                         tags:['Liquid Oxygen / Kerosene','First Stage','1950s','1960s','American']},
    {name:'Atlas V CCB',        dry:21054, prop:284089, thrust:4152, isp:338, engines:'RD-180',           note:'Atlas V Common Core Booster. LOX/RP-1. RD-180 single shaft.',      tags:['Liquid Oxygen / Kerosene','First Stage','1990s-2000s','2010s+','American']},
    {name:'Delta IV CBC',       dry:26760, prop:199640, thrust:3137, isp:412, engines:'RS-68A',           note:'Delta IV Common Booster Core. LOX/LH2. RS-68A.',                    tags:['Liquid Oxygen / Liquid Hydrogen','First Stage','2000s','2010s+','American']},
    {name:'Vulcan S1',          dry:15600, prop:372000, thrust:4800, isp:340, engines:'2× BE-4',           note:'Vulcan first stage. LOX/Methane. 2× Blue Origin BE-4.',              tags:['Liquid Oxygen / Methane','First Stage','2010s+','American']},
    {name:'New Glenn S1',       dry:45000, prop:875000, thrust:16800,isp:340, engines:'7× BE-4',           note:'New Glenn first stage. LOX/Methane. 7× BE-4.',                      tags:['Liquid Oxygen / Methane','First Stage','2010s+','American']},
    {name:'Antares S1',         dry:8000,  prop:218000, thrust:3840, isp:338, engines:'2× RD-181',         note:'Antares 230+ first stage. LOX/RP-1. 2× Energomash RD-181.',         tags:['Liquid Oxygen / Kerosene','First Stage','2010s+','American','Soviet / Russian']},
    {name:'Electron S1',        dry:950,   prop:9300,   thrust:224,  isp:320, engines:'9× Rutherford',     note:'Rocket Lab Electron. LOX/RP-1. Electric-pump fed.',                 tags:['Liquid Oxygen / Kerosene','First Stage','2010s+','American']},
    {name:'Falcon 9 B5 S1',    dry:25600, prop:407500, thrust:8829, isp:311, engines:'9× Merlin 1D+',  note:'Expendable config. LOX/RP-1.',                                  tags:['Liquid Oxygen / Kerosene','First Stage','2010s+','American']},
    // ── Soviet/Russian first stages ──
    {name:'R-7 Blok A (core)', dry:6545,  prop:91440,  thrust:941,  isp:315, engines:'RD-108',         note:'R-7/Sputnik/Vostok/Soyuz core stage. LOX/Kerosene.',           tags:['Liquid Oxygen / Kerosene','First Stage','1950s','1960s','1970s','Soviet / Russian']},
    {name:'Proton Blok A',     dry:31000, prop:419400, thrust:10470,isp:285, engines:'6× RD-253',      note:'Proton first stage. N2O4/UDMH. 6 engines radially.',            tags:['Nitrogen Tetroxide / UDMH','First Stage','1960s','1970s','1980s','1990s-2000s','Soviet / Russian']},
    {name:'N1 Blok A',         dry:209000,prop:1880000,thrust:45400,isp:297, engines:'30× NK-15',      note:'N1 first stage. 30× NK-15. LOX/RP-1. Never succeeded.',         tags:['Liquid Oxygen / Kerosene','First Stage','1960s','1970s','Soviet / Russian']},
    {name:'Zenit S1',          dry:10400, prop:262800, thrust:8180, isp:337, engines:'RD-171',         note:'Zenit first stage. LOX/Kerosene. RD-171 — worlds most powerful single-chamber engine.',tags:['Liquid Oxygen / Kerosene','First Stage','1980s','1990s-2000s','Soviet / Russian']},
    {name:'Kosmos-3M S1',      dry:3000,  prop:65000,  thrust:1510, isp:276, engines:'RD-216',         note:'Based on R-14 IRBM. N2O4/UDMH. Reliable workhorse.',             tags:['Nitrogen Tetroxide / UDMH','First Stage','1970s','1980s','1990s-2000s','Soviet / Russian']},
    {name:'Tsyklon-2 S1',      dry:4000,  prop:131000, thrust:2750, isp:301, engines:'RD-261',         note:'Based on R-36 ICBM. N2O4/UDMH.',                               tags:['Nitrogen Tetroxide / UDMH','First Stage','1970s','1980s','Soviet / Russian']},
    {name:'Energia Blok Ts',   dry:34500, prop:730000, thrust:5888, isp:455, engines:'4× RD-0120',     note:'Energia core. LOX/LH2. Most powerful Soviet LH2 engine.',      tags:['Liquid Oxygen / Liquid Hydrogen','First Stage','1980s','Soviet / Russian']},
  ],
  'Upper Stages':[
    // ── US upper stages ──
    {name:'Able (Thor-Able)',   dry:200,   prop:1400,   thrust:33,   isp:271, engines:'AJ10-101',       note:'Thor-Able upper stage. NTO/UDMH. Pioneer probes.',              tags:['Nitrogen Tetroxide / UDMH','Upper Stage','1950s','1960s','American']},
    {name:'Vanguard S2',       dry:200,   prop:1360,   thrust:33,   isp:271, engines:'AJ10-118',         note:'Vanguard second stage. NTO/Aerozine-50.',                      tags:['Nitrogen Tetroxide / Aerozine-50','Upper Stage','1950s','1960s','American']},
    {name:'Vanguard S3',       dry:22,    prop:104,    thrust:10,   isp:250, engines:'X-248',            note:'Vanguard third stage. Solid kick motor.',                       tags:['Solid Propellant','Upper Stage','Kick Stage','1950s','1960s','American']},
    {name:'Kosmos-3M S2',      dry:450,   prop:5300,   thrust:157,  isp:300, engines:'RD-48',            note:'Kosmos-3M second stage. N2O4/UDMH.',                            tags:['Nitrogen Tetroxide / UDMH','Upper Stage','1970s','1980s','1990s-2000s','Soviet / Russian']},
    {name:'Agena A',           dry:620,   prop:5000,   thrust:68,   isp:276, engines:'Bell 8048',       note:'IRFNA/UDMH. First Agena variant.',                              tags:['Inhibited Red Fuming Nitric Acid / UDMH','Upper Stage','Restartable','1950s','1960s','American']},
    {name:'Agena B',           dry:720,   prop:6200,   thrust:71,   isp:285, engines:'Bell 8081',       note:'Extended Agena. IRFNA/UDMH.',                                  tags:['Inhibited Red Fuming Nitric Acid / UDMH','Upper Stage','Restartable','1960s','American']},
    {name:'Agena D',           dry:670,   prop:6497,   thrust:71,   isp:291, engines:'Bell 8096',       note:'IRFNA/UDMH. Standard upper stage for Atlas/Thor.',              tags:['Inhibited Red Fuming Nitric Acid / UDMH','Upper Stage','Restartable','1960s','1970s','American']},
    {name:'Saturn S-IV',       dry:4400,  prop:40800,  thrust:400,  isp:421, engines:'6× RL-10A-1',    note:'Saturn I upper stage. 6× RL-10. LOX/LH2.',                     tags:['Liquid Oxygen / Liquid Hydrogen','Upper Stage','1960s','American']},
    {name:'Saturn V S-II',     dry:43000, prop:437000, thrust:5165, isp:421, engines:'5× J-2',         note:'LOX/LH2. Five J-2 engines.',                                   tags:['Liquid Oxygen / Liquid Hydrogen','Upper Stage','1960s','1970s','American']},
    {name:'Saturn V S-IVB',    dry:15200, prop:104700, thrust:1000, isp:421, engines:'J-2',            note:'Restartable. Used for TLI on Apollo.',                          tags:['Liquid Oxygen / Liquid Hydrogen','Upper Stage','Restartable','1960s','1970s','American']},
    {name:'Saturn IB S-IVB',   dry:13300, prop:107300, thrust:1000, isp:421, engines:'J-2',            note:'Saturn IB S-IVB. Slightly different to Saturn V variant.',       tags:['Liquid Oxygen / Liquid Hydrogen','Upper Stage','Restartable','1960s','American']},
    {name:'Centaur A',         dry:1800,  prop:9000,   thrust:133,  isp:428, engines:'2× RL-10A-1',    note:'First Centaur. LOX/LH2. Atlas-Centaur.',                       tags:['Liquid Oxygen / Liquid Hydrogen','Upper Stage','Restartable','1960s','American']},
    {name:'Centaur D-1T',      dry:2100,  prop:13500,  thrust:133,  isp:444, engines:'2× RL-10A-3-3',  note:'Titan IIIE upper stage. LOX/LH2.',                             tags:['Liquid Oxygen / Liquid Hydrogen','Upper Stage','Restartable','1970s','American']},
    {name:'Centaur II (AC)',    dry:2100,  prop:15900,  thrust:147,  isp:449, engines:'2× RL-10A-4',    note:'Atlas-Centaur II. LOX/LH2.',                                   tags:['Liquid Oxygen / Liquid Hydrogen','Upper Stage','Restartable','1980s','1990s-2000s','American']},
    {name:'Centaur III',       dry:2247,  prop:20830,  thrust:147,  isp:451, engines:'2× RL-10A-4-2',  note:'Atlas V upper stage. LOX/LH2.',                                tags:['Liquid Oxygen / Liquid Hydrogen','Upper Stage','Restartable','1990s-2000s','2010s+','American']},
    {name:'Titan I Stage 2',   dry:1630,  prop:27000,  thrust:444,  isp:308, engines:'LR-91-1',        note:'Titan I second stage. LOX/RP-1.',                              tags:['Liquid Oxygen / Kerosene','Upper Stage','1960s','American']},
    {name:'Titan II GLV S2',   dry:2404,  prop:26535,  thrust:444,  isp:316, engines:'LR-91-7',        note:'Gemini LV second stage. NTO/Aerozine-50.',                     tags:['Nitrogen Tetroxide / Aerozine-50','Upper Stage','1960s','American']},
    {name:'Titan IIIC/D S2',   dry:4100,  prop:28800,  thrust:444,  isp:316, engines:'LR-91-11',       note:'Titan III second stage.',                                       tags:['Nitrogen Tetroxide / Aerozine-50','Upper Stage','1970s','1980s','American']},
    {name:'Titan IIIE S2',     dry:4500,  prop:27500,  thrust:467,  isp:316, engines:'LR-91-11',       note:'Titan IIIE second stage.',                                     tags:['Nitrogen Tetroxide / Aerozine-50','Upper Stage','1970s','American']},
    {name:'Transtage',         dry:1100,  prop:10000,  thrust:71,   isp:311, engines:'AJ10-138',       note:'Titan IIIC third stage. NTO/Aerozine-50. Restartable.',        tags:['Nitrogen Tetroxide / Aerozine-50','Upper Stage','Restartable','1960s','1970s','1980s','American']},
    {name:'Delta-K',           dry:950,   prop:6000,   thrust:43,   isp:319, engines:'AJ10-118K',      note:'Delta upper stage. NTO/Aerozine-50.',                          tags:['Nitrogen Tetroxide / Aerozine-50','Upper Stage','1980s','1990s-2000s','American']},
    {name:'PAM-D (Star-48)',   dry:130,   prop:2010,   thrust:67,   isp:292, engines:'Star-48B',       note:'Payload Assist Module. Solid. Used on Delta/Shuttle.',          tags:['Solid Propellant','Upper Stage','Kick Stage','1980s','1990s-2000s','American']},
    {name:'Inertial Upper Stg',dry:944,   prop:9707,   thrust:89,   isp:304, engines:'STAR-63D',       note:'IUS solid. Used on Shuttle/Titan. Two-stage solid.',            tags:['Solid Propellant','Upper Stage','1980s','1990s-2000s','American']},
    {name:'DCSS (Delta IV)',   dry:3380,  prop:27220,  thrust:110,  isp:462, engines:'RL-10B-2',       note:'Delta Cryogenic Second Stage. LOX/LH2.',                       tags:['Liquid Oxygen / Liquid Hydrogen','Upper Stage','Restartable','1990s-2000s','2010s+','American']},
    {name:'Falcon 9 MVac',     dry:4000,  prop:107500, thrust:934,  isp:348, engines:'Merlin Vac',     note:'LOX/RP-1. Expendable config.',                                  tags:['Liquid Oxygen / Kerosene','Upper Stage','Restartable','2010s+','American']},
    {name:'Centaur V',          dry:2700,  prop:41000,  thrust:110,  isp:452, engines:'RL-10C-1-1',       note:'Vulcan Centaur upper stage. LOX/LH2. Single RL-10C.',               tags:['Liquid Oxygen / Liquid Hydrogen','Upper Stage','Restartable','2010s+','American']},
    {name:'New Glenn S2',       dry:3000,  prop:47000,  thrust:710,  isp:445, engines:'BE-3U',             note:'New Glenn second stage. LOX/LH2. Blue Origin BE-3U.',               tags:['Liquid Oxygen / Liquid Hydrogen','Upper Stage','Restartable','2010s+','American']},
    {name:'Electron S2',        dry:250,   prop:2150,   thrust:27,   isp:343, engines:'Rutherford Vac',    note:'Rocket Lab Electron upper stage. LOX/RP-1. Vacuum Rutherford.',      tags:['Liquid Oxygen / Kerosene','Upper Stage','2010s+','American']},
    {name:'SLS Core Stage',     dry:99000, prop:987000, thrust:8360, isp:452, engines:'4× RS-25',          note:'SLS Core Stage. 4× RS-25 (SSME). LOX/LH2. ~8,360 kN total.',        tags:['Liquid Oxygen / Liquid Hydrogen','First Stage','2010s+','American']},
    {name:'ICPS (SLS Block 1)', dry:3380,  prop:27220,  thrust:110,  isp:462, engines:'RL-10B-2',           note:'Interim Cryogenic Propulsion Stage. Same as DCSS. LOX/LH2.',          tags:['Liquid Oxygen / Liquid Hydrogen','Upper Stage','Restartable','2010s+','American']},
    {name:'EUS (SLS Block 1B)', dry:15000, prop:120000, thrust:440,  isp:462, engines:'4× RL-10C-3',        note:'Exploration Upper Stage. 4× RL-10C. LOX/LH2. SLS Block 1B.',          tags:['Liquid Oxygen / Liquid Hydrogen','Upper Stage','Restartable','2010s+','American']},
    {name:'NOMAD (G-1)',        dry:600,   prop:5500,   thrust:53.5, isp:357, engines:'Rocketdyne G-1',    note:'LF2/Hydrazine. Atlas upper stage (Agena replacement). Never flown due to fluorine toxicity. Engine specs confirmed; stage masses estimated.', tags:['Liquid Fluorine / Hydrazine','Upper Stage','Exotic','Unbuilt','1950s','1960s','American']},
    {name:'CHARIOT',            dry:1600,  prop:12000,  thrust:155.9,isp:350, engines:'Bell LF2',          note:'LF2/MMH+H2O+Hydrazine. Titan III Transtage replacement. Never flown. Burned to CO and HF. Engine specs confirmed; stage masses estimated.', tags:['Liquid Fluorine / Hydrazine','Upper Stage','Exotic','Unbuilt','1960s','American']},
    {name:'Vulcan ACES',       dry:2500,  prop:41000,  thrust:110,  isp:462, engines:'2× RL-10C-1-1', note:'Advanced Cryogenic Evolved Stage. LOX/LH2.',                   tags:['Liquid Oxygen / Liquid Hydrogen','Upper Stage','Restartable','2010s+','American']},
    // ── Soviet/Russian upper stages ──
    {name:'R-7 Blok E',        dry:600,   prop:5600,   thrust:55,   isp:323, engines:'RD-0109',        note:'Vostok 3rd stage. LOX/Kerosene. First orbital upper stage.',   tags:['Liquid Oxygen / Kerosene','Upper Stage','1950s','1960s','Soviet / Russian']},
    {name:'Soyuz Blok I',      dry:2355,  prop:22000,  thrust:298,  isp:326, engines:'RD-0110',        note:'Soyuz/Molniya 3rd stage. LOX/Kerosene. Restartable.',           tags:['Liquid Oxygen / Kerosene','Upper Stage','Restartable','1960s','1970s','1980s','1990s-2000s','Soviet / Russian']},
    {name:'Blok L (8S814)',    dry:1200,  prop:8000,   thrust:54,   isp:340, engines:'S1.5400',        note:'Luna/Molniya 4th stage. LOX/Kerosene. Deep space kick.',        tags:['Liquid Oxygen / Kerosene','Upper Stage','Kick Stage','1960s','1970s','Soviet / Russian']},
    {name:'Proton Blok B',     dry:11000, prop:157300, thrust:2399, isp:327, engines:'3× RD-0210 + RD-0211', note:'Proton 2nd stage. N2O4/UDMH.',                          tags:['Nitrogen Tetroxide / UDMH','Upper Stage','1960s','1970s','1980s','1990s-2000s','Soviet / Russian']},
    {name:'Proton Blok V',     dry:4185,  prop:46562,  thrust:599,  isp:325, engines:'RD-0212',        note:'Proton 3rd stage. N2O4/UDMH. Restartable.',                    tags:['Nitrogen Tetroxide / UDMH','Upper Stage','Restartable','1960s','1970s','1980s','1990s-2000s','Soviet / Russian']},
    {name:'Blok D',            dry:2400,  prop:15200,  thrust:85,   isp:352, engines:'11D58',          note:'Deep space stage. LOX/Kerosene. Used on Proton/Zond/Lunna.',   tags:['Liquid Oxygen / Kerosene','Upper Stage','Restartable','1960s','1970s','1980s','Soviet / Russian']},
    {name:'Blok DM-03',        dry:2750,  prop:19800,  thrust:85,   isp:352, engines:'11D58M',         note:'Modernised Blok D. LOX/Kerosene. Proton upper stage.',          tags:['Liquid Oxygen / Kerosene','Upper Stage','Restartable','1990s-2000s','2010s+','Soviet / Russian']},
    {name:'Fregat',            dry:930,   prop:5250,   thrust:20,   isp:332, engines:'S5.92',          note:'Soyuz/Zenit upper stage. N2O4/UDMH. Highly restartable.',      tags:['Nitrogen Tetroxide / UDMH','Upper Stage','Restartable','1990s-2000s','2010s+','Soviet / Russian']},
    {name:'Zenit Blok II',     dry:8800,  prop:82600,  thrust:912,  isp:350, engines:'RD-120',         note:'Zenit second stage. LOX/Kerosene.',                             tags:['Liquid Oxygen / Kerosene','Upper Stage','1980s','1990s-2000s','Soviet / Russian']},
    {name:'N1 Blok B',         dry:11400, prop:300000, thrust:14040,isp:346, engines:'8× NK-15V',      note:'N1 second stage. LOX/Kerosene. NK-15V high-alt variant.',      tags:['Liquid Oxygen / Kerosene','Upper Stage','1960s','1970s','Soviet / Russian']},
    {name:'N1 Blok V',         dry:4400,  prop:93000,  thrust:4080, isp:354, engines:'4× NK-19',       note:'N1 third stage. LOX/Kerosene.',                                tags:['Liquid Oxygen / Kerosene','Upper Stage','1960s','1970s','Soviet / Russian']},
    {name:'N1 Blok G (TLI)',   dry:4900,  prop:15600,  thrust:980,  isp:353, engines:'NK-21',          note:'N1 TLI stage. LOX/Kerosene.',                                   tags:['Liquid Oxygen / Kerosene','Upper Stage','Kick Stage','1960s','1970s','Soviet / Russian']},
  ],
  'Kick Stages':[
    // ── US solid kick stages ──
    {name:'Sergeant (1×)',     dry:6,    prop:22,    thrust:7.3, isp:214, engines:'Solid', note:'Single Sergeant motor. Juno I 4th stage.',            tags:['Solid Propellant','Kick Stage','1950s','1960s','American']},
    {name:'Sergeant (3×)',     dry:18,   prop:73,    thrust:22,  isp:214, engines:'Solid', note:'3× Sergeant cluster. Juno I 3rd stage.',              tags:['Solid Propellant','Kick Stage','1950s','1960s','American']},
    {name:'Sergeant (11×)',    dry:68,   prop:295,   thrust:73,  isp:214, engines:'Solid', note:'11× Sergeant cluster. Juno I 2nd stage.',             tags:['Solid Propellant','Kick Stage','1950s','1960s','American']},
    {name:'Altair 1 (X-248)', dry:40,   prop:388,   thrust:12,  isp:256, engines:'Solid', note:'Scout/Vanguard 3rd stage. X-248 motor.',               tags:['Solid Propellant','Kick Stage','1950s','1960s','American']},
    {name:'Altair 3',          dry:25,   prop:276,   thrust:27.4,isp:280, engines:'Solid', note:'Scout 4th stage. HTPB.',                               tags:['Solid Propellant','Kick Stage','1960s','American']},
    {name:'Antares 3A',        dry:98,   prop:1286,  thrust:80,  isp:294, engines:'Solid', note:'Scout 3rd stage.',                                    tags:['Solid Propellant','Kick Stage','1960s','American']},
    {name:'Castor II',         dry:695,  prop:3729,  thrust:259, isp:262, engines:'Solid', note:'Scout 2nd stage / Delta strap-on.',                    tags:['Solid Propellant','Kick Stage','1960s','American']},
    {name:'Algol III',         dry:1600, prop:12720, thrust:472, isp:284, engines:'Solid', note:'Scout 1st stage.',                                    tags:['Solid Propellant','Kick Stage','1970s','American']},
    {name:'Star-17',           dry:22,   prop:88,    thrust:9.5, isp:278, engines:'Solid', note:'Small kick motor. Spin-stabilised.',                  tags:['Solid Propellant','Kick Stage','1970s','1980s','American']},
    {name:'Star-37FM',         dry:100,  prop:1000,  thrust:45,  isp:289, engines:'Solid', note:'Kick motor. Spin-stabilised.',                        tags:['Solid Propellant','Kick Stage','1980s','American']},
    {name:'Star-48B',          dry:123,  prop:2010,  thrust:67,  isp:292, engines:'Solid', note:'Payload kick stage. Widely used.',                    tags:['Solid Propellant','Kick Stage','1980s','1990s-2000s','American']},
    {name:'Star-48BV',         dry:120,  prop:2010,  thrust:66,  isp:292, engines:'Solid', note:'Star-48B with vectored nozzle.',                      tags:['Solid Propellant','Kick Stage','1990s-2000s','American']},
    {name:'Star-63D (IUS)',    dry:620,  prop:9250,  thrust:182, isp:299, engines:'Solid', note:'Inertial Upper Stage 1st stage. Shuttle payload.',     tags:['Solid Propellant','Kick Stage','1980s','1990s-2000s','American']},
    {name:'MAGE-1 (Apogee)',   dry:40,   prop:550,   thrust:27,  isp:285, engines:'Solid', note:'Apogee kick motor. Used on European/US commsats.',     tags:['Solid Propellant','Kick Stage','1970s','1980s','American','European']},
    {name:'MAGE-2',            dry:55,   prop:813,   thrust:36,  isp:286, engines:'Solid', note:'Larger apogee kick motor.',                           tags:['Solid Propellant','Kick Stage','1980s','American','European']},
    {name:'AKM / Thiokol TE-364-4', dry:50, prop:545, thrust:39, isp:290, engines:'Solid', note:'Standard apogee kick motor.',                         tags:['Solid Propellant','Kick Stage','1970s','1980s','American']},
    // ── Soviet kick stages ──
    {name:'Blok L (kick)',     dry:1200, prop:8000,  thrust:54,  isp:340, engines:'S1.5400', note:'LOX/Kerosene. Molniya/Luna escape stage.',           tags:['Liquid Oxygen / Kerosene','Kick Stage','1960s','1970s','Soviet / Russian']},
  ],
  'Side Boosters':[
    // ── US strap-on boosters ──
    {name:'UA1205 SRB',       dry:6200,  prop:110000, thrust:5340, isp:268, engines:'Solid', note:'Titan IIIC/E strap-on. Per booster.',               tags:['Solid Propellant','Strap-on Booster','1960s','1970s','American'],isBooster:true},
    {name:'UA1207 SRB',       dry:7600,  prop:143000, thrust:6846, isp:272, engines:'Solid', note:'Titan IVA strap-on. Per booster.',                  tags:['Solid Propellant','Strap-on Booster','1980s','1990s-2000s','American'],isBooster:true},
    {name:'UA1212 SRB (TIV-B)',dry:8300, prop:182000, thrust:7560, isp:275, engines:'Solid', note:'Titan IVB upgraded SRB. Per booster.',               tags:['Solid Propellant','Strap-on Booster','1990s-2000s','American'],isBooster:true},
    {name:'Space Shuttle SRB', dry:87500, prop:503000, thrust:12450,isp:269, engines:'Solid', note:'Thiokol SRB. Per booster. Sea level thrust.',        tags:['Solid Propellant','Strap-on Booster','1980s','1990s-2000s','American'],isBooster:true},
    {name:'GEM-40',           dry:874,   prop:11765,  thrust:490,  isp:274, engines:'Solid', note:'Delta II strap-on. Per booster.',                   tags:['Solid Propellant','Strap-on Booster','1980s','1990s-2000s','American'],isBooster:true},
    {name:'GEM-46',           dry:910,   prop:14175,  thrust:490,  isp:274, engines:'Solid', note:'Delta II 7925 strap-on. Per booster.',              tags:['Solid Propellant','Strap-on Booster','1990s-2000s','American'],isBooster:true},
    {name:'GEM-60 (Delta IV)', dry:1600,  prop:27000,  thrust:827,  isp:275, engines:'Solid', note:'Delta IV strap-on. Per booster.',                   tags:['Solid Propellant','Strap-on Booster','2000s','2010s+','American'],isBooster:true},
    {name:'Castor 4A',        dry:1150,  prop:11600,  thrust:478,  isp:265, engines:'Solid', note:'Delta/Scout strap-on. Per booster.',                tags:['Solid Propellant','Strap-on Booster','1970s','1980s','American'],isBooster:true},
    {name:'Atlas V SRB (AJ-60A)', dry:1000, prop:42000, thrust:1688, isp:279, engines:'Solid', note:'Atlas V strap-on. Per booster.',                   tags:['Solid Propellant','Strap-on Booster','2000s','2010s+','American'],isBooster:true},
    // ── Soviet/Russian strap-on boosters ──
    {name:'Delta IV CBC (booster)',dry:26760,prop:199640, thrust:3137, isp:412, engines:'RS-68A',  note:'Delta IV Heavy side CBC. LOX/LH2. Per booster.',    tags:['Liquid Oxygen / Liquid Hydrogen','Strap-on Booster','2000s','2010s+','American'],isBooster:true},
    {name:'Atlas V CCB (booster)', dry:21054,prop:284089, thrust:4152, isp:338, engines:'RD-180',  note:'Atlas V CCB used as future strap-on concept. LOX/RP-1.',tags:['Liquid Oxygen / Kerosene','Strap-on Booster','2000s','2010s+','American'],isBooster:true},
    {name:'SLS 5-Seg SRB',        dry:97000,prop:628000, thrust:16000,isp:269, engines:'RSRM-V',   note:'SLS Block 1 solid strap-on. Per booster. Largest SRBs ever flown.', tags:['Solid Propellant','Strap-on Booster','2010s+','American'],isBooster:true},
    {name:'R-7 Blok B/V/G/D', dry:3450,  prop:38600,  thrust:1021, isp:313, engines:'RD-107', note:'R-7 strap-on. Per booster. LOX/Kerosene.',          tags:['Liquid Oxygen / Kerosene','Strap-on Booster','1950s','1960s','1970s','Soviet / Russian'],isBooster:true},
    {name:'Energia Zenit SRB', dry:30000, prop:278000, thrust:7904, isp:309, engines:'RD-170', note:'Energia liquid strap-on (Zenit-based). Per booster.',tags:['Liquid Oxygen / Kerosene','Strap-on Booster','1980s','Soviet / Russian'],isBooster:true},
  ],
};
let userStagesByCategory={}; // { catName: [stage, ...] }
let collapsedLibCats=new Set();
let showUserOnly=false;

function toggleLibrary(){
  libOpen=!libOpen;
  document.getElementById('lib-body').style.display=libOpen?'block':'none';
  document.getElementById('lib-arrow').classList.toggle('open',libOpen);
}

function makeCard(stage,cat,onDel){
  const card=document.createElement('div');
  card.className='stage-card'+(stage.isBooster?' booster-card':'')+(onDel?' lib-user-stage-card':'');
  card.draggable=true;
  // Slim display: name + fuel + prop mass
  const fuel=propShort(stage.tags);
  const fM=v=>v>=1000?(v/1000).toFixed(0)+'t':v+' kg';
  const propStr=stage.prop>=1000?fM(stage.prop)+' prop':'';
  const ispStr=stage.isp?stage.isp+'s':'';
  const thrStr=stage.thrust?fT(stage.thrust):'';
  const line1=[fuel,propStr].filter(Boolean).join(' · ');
  const line2=[ispStr,thrStr].filter(Boolean).join(' · ');
  card.innerHTML=`<div class="stage-card-name" title="${stage.name}">${stage.name}</div>
    ${line1?`<div class="stage-card-mini">${line1}</div>`:''}
    ${line2?`<div class="stage-card-mini" style="opacity:.7;">${line2}</div>`:''}`;
  if(onDel){
    const x=document.createElement('button');x.className='lib-del-btn';x.textContent='×';x.title='Remove stage';
    x.onclick=e=>{e.stopPropagation();onDel();};card.appendChild(x);
  }
  // Drag (separate from click via _didDrag flag)
  card.addEventListener('dragstart',e=>{
    _didDrag=true;
    _draggingStage={...stage,_cat:cat};
    e.dataTransfer.setData('text/plain',JSON.stringify(_draggingStage));
    e.dataTransfer.effectAllowed='copy';
    setTimeout(()=>card.classList.add('dragging'),0);
  });
  card.addEventListener('dragend',()=>{
    card.classList.remove('dragging');_draggingStage=null;
    setTimeout(()=>{_didDrag=false;},80);
  });
  card.addEventListener('click',e=>{
    e.stopPropagation();
    if(_didDrag)return;
    openStageModal(stage);
  });
  return card;
}

function buildLibCat(container,cat,stages,userStages,q){
  const filtBuiltin=stages.filter(s=>stageMatchesFilters(s)&&(!q||s.name.toLowerCase().includes(q)||
    (s.engines||'').toLowerCase().includes(q)||(s.note||'').toLowerCase().includes(q)||
    (s.tags||[]).some(t=>t.toLowerCase().includes(q))));
  const filtUser=(userStages||[]).filter(s=>stageMatchesFilters(s)&&(!q||s.name.toLowerCase().includes(q)||
    (s.engines||'').toLowerCase().includes(q)||(s.note||'').toLowerCase().includes(q)||
    (s.tags||[]).some(t=>t.toLowerCase().includes(q))));
  // In showUserOnly mode, show category even if empty (so users know it exists)
  if(!showUserOnly&&!filtBuiltin.length&&!filtUser.length)return;
  if(showUserOnly&&!filtUser.length&&q)return; // hide empty cats when searching
  const collapsed=!q&&collapsedLibCats.has(cat);
  const div=document.createElement('div');div.className='lib-cat';
  // Header
  const hdr=document.createElement('div');hdr.className='lib-cat-hdr';
  const lbl=document.createElement('span');lbl.className='lib-cat-label';lbl.textContent=cat;
  const count=document.createElement('span');
  count.style.cssText='font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-left:4px;';
  count.textContent=showUserOnly?`(${filtUser.length})`:`(${filtBuiltin.length+filtUser.length})`;
  const chev=document.createElement('span');chev.className='lib-cat-chevron'+(collapsed?'':' open');chev.textContent='▶';
  hdr.appendChild(lbl);hdr.appendChild(count);hdr.appendChild(chev);
  hdr.addEventListener('click',e=>{e.stopPropagation();collapsedLibCats.has(cat)?collapsedLibCats.delete(cat):collapsedLibCats.add(cat);buildStageLibrary();});
  div.appendChild(hdr);
  if(!collapsed){
    const scroll=document.createElement('div');scroll.className='lib-scroll';
    if(showUserOnly&&!filtUser.length){
      const empty=document.createElement('div');
      empty.style.cssText='font-family:var(--mono);font-size:9px;color:var(--text-dim);opacity:.5;padding:6px 4px;letter-spacing:.06em;white-space:nowrap;';
      empty.textContent='// no user stages here yet';
      scroll.appendChild(empty);
    }
    if(!showUserOnly)filtBuiltin.forEach(stage=>scroll.appendChild(makeCard(stage,cat,null)));
    filtUser.forEach((stage,ui)=>scroll.appendChild(makeCard(stage,cat,()=>{
      userStagesByCategory[cat].splice(ui,1);
      if(!userStagesByCategory[cat].length)delete userStagesByCategory[cat];
      buildStageLibrary();
    })));
    div.appendChild(scroll);
  }
  container.appendChild(div);
}

function buildStageLibrary(){
  const q=(document.getElementById('lib-search')?.value||'').toLowerCase();
  const cont=document.getElementById('lib-content');
  cont.innerHTML='';
  // ── Preset Vehicles ──
  const vehicleStages=BUILTIN_PRESETS.filter(p=>{
    if(!q)return true;
    const sub=(p.stageNames||[]).join(' ');
    return(p.name+' '+sub+' '+(p.note||'')+' '+(p.tags||[]).join(' ')).toLowerCase().includes(q);
  });
  if(vehicleStages.length){
    const collapsed=collapsedLibCats.has('__vehicles__');
    const catDiv=document.createElement('div');catDiv.className='lib-cat';
    const hdr=document.createElement('div');hdr.className='lib-cat-hdr';
    const chev=document.createElement('span');chev.className='lib-cat-chevron'+(collapsed?'':' open');chev.textContent='▶';
    const lbl=document.createElement('span');lbl.className='lib-cat-label';lbl.textContent='Preset Vehicles';
    const cnt=document.createElement('span');cnt.style.cssText='font-family:var(--mono);font-size:9px;color:var(--text-dim);margin-left:4px;';cnt.textContent='('+(showUserOnly?0:vehicleStages.length)+')';
    hdr.appendChild(lbl);hdr.appendChild(cnt);hdr.appendChild(chev);
    hdr.addEventListener('click',e=>{e.stopPropagation();collapsedLibCats.has('__vehicles__')?collapsedLibCats.delete('__vehicles__'):collapsedLibCats.add('__vehicles__');buildStageLibrary();});
    catDiv.appendChild(hdr);
    if(!collapsed){
      const scroll=document.createElement('div');scroll.className='lib-scroll';
      if(showUserOnly){
        const empty=document.createElement('div');
        empty.style.cssText='font-family:var(--mono);font-size:9px;color:var(--text-dim);opacity:.5;padding:6px 4px;letter-spacing:.06em;';
        empty.textContent='// built-in vehicles hidden';
        scroll.appendChild(empty);
      }
      (!showUserOnly?vehicleStages:[]).forEach((p,pi)=>{
        const card=document.createElement('div');
        card.className='stage-card';card.style.width='180px';card.draggable=true;
        const sub=(p.stageNames||[]).join(' + ');
        card.innerHTML=`<div class="stage-card-name" title="${p.name}">${p.name}</div>
          ${p.note?`<div class="stage-card-mini" style="white-space:normal;line-height:1.4;">${p.note.slice(0,70)}${p.note.length>70?'…':''}</div>`:''}`;
        card.title='Click for details · Drag to load all stages';
        card.addEventListener('dragstart',e=>{
          _didDrag=true;
          _draggingStage={_isVehicle:true,_preset:p,name:p.name};
          e.dataTransfer.setData('text/plain',JSON.stringify({_isVehicle:true,name:p.name}));
          e.dataTransfer.effectAllowed='copy';
          setTimeout(()=>card.classList.add('dragging'),0);
        });
        card.addEventListener('dragend',()=>{card.classList.remove('dragging');setTimeout(()=>{_didDrag=false;},80);});
        card.addEventListener('click',e=>{e.stopPropagation();if(_didDrag)return;openVehicleModal(p);});
        scroll.appendChild(card);
      });
      catDiv.appendChild(scroll);
    }
    cont.appendChild(catDiv);
  }
  // Built-in categories (always shown; built-in stages hidden in showUserOnly)
  Object.entries(STAGE_LIBRARY).forEach(([cat,stages])=>{
    buildLibCat(cont,cat,showUserOnly?[]:stages,userStagesByCategory[cat],q);
  });
  // User-created categories not in built-ins
  const builtinNames=new Set(Object.keys(STAGE_LIBRARY));
  Object.keys(userStagesByCategory).filter(k=>!builtinNames.has(k)).forEach(cat=>{
    buildLibCat(cont,cat,[],userStagesByCategory[cat],q);
  });
}

function applyStageData(stageIdx,stage){
  const s=stageIdx+1;
  const set=(key,val)=>{const el=document.getElementById(`s${s}_${key}`);if(el){el.value=val;stageStore[stageIdx]={...stageStore[stageIdx],[key]:String(val)};}};
  set('dry',stage.dry);set('prop',stage.prop);set('thrust',stage.thrust);set('isp',stage.isp);set('res',stage.res??2);
  currentStageNames[stageIdx]=stage.name||null;
  stageSaved[stageIdx]=false;
  buildStageComposition();
  markLVUserDefined();
}

// ── Booster drop zone handlers ──
// Booster populate helper (called from table drop)
function applyBoosterData(s){setBoosters(true);document.getElementById('b_dry').value=s.dry;document.getElementById('b_prop').value=s.prop;document.getElementById('b_thrust').value=s.thrust;document.getElementById('b_isp').value=s.isp;document.getElementById('b_res').value=s.res??2;currentBoosterName=s.name||null;boosterSaved=false;buildStageComposition();markLVUserDefined();}

// ── Stage column drop handlers (called from buildTable) ──
function onColDragOver(e,stageIdx){
  if(!_draggingStage||_draggingStage.isBooster)return;
  e.preventDefault();e.dataTransfer.dropEffect='copy';
  // Highlight whole column by adding class to the row containing this header
  document.getElementById('stage-header-row').classList.add('stage-col-hover');
  // Store target column for visual highlight
  document.getElementById('stage-header-row').dataset.hoverCol=stageIdx;
  // Highlight just this header cell
  const ths=document.getElementById('stage-header-row').querySelectorAll('th');
  ths.forEach((th,i)=>th.style.background=i===stageIdx+1?'rgba(0,200,255,.15)':'');
}
function onColDragLeave(e,stageIdx){
  const ths=document.getElementById('stage-header-row').querySelectorAll('th');
  ths.forEach(th=>th.style.background='');
}
function onColDrop(e,stageIdx){
  e.preventDefault();
  const ths=document.getElementById('stage-header-row').querySelectorAll('th');
  ths.forEach(th=>th.style.background='');
  if(!_draggingStage)return;
  if(_draggingStage._isVehicle){
    // Drop vehicle card on any column → load whole preset
    loadPreset(_draggingStage._preset,'builtin_'+BUILTIN_PRESETS.indexOf(_draggingStage._preset));
  } else if(!_draggingStage.isBooster){
    applyStageData(stageIdx,_draggingStage);
  }
}



const FILTER_TREE={
  'Propellant':[
    'Liquid Oxygen / Liquid Hydrogen',
    'Liquid Oxygen / Kerosene',
    'Liquid Oxygen / Ethanol',
    'Nitrogen Tetroxide / Aerozine-50',
    'Nitrogen Tetroxide / UDMH',
    'Inhibited Red Fuming Nitric Acid / UDMH',
    'Solid Propellant',
  ],
  'Application':['First Stage','Upper Stage','Kick Stage','Strap-on Booster','Restartable'],
  'Era':['1950s','1960s','1970s','1980s','1990s-2000s','2010s+'],
  'Origin':['American','Soviet / Russian','European'],
};
let activeFilters={};
let collapsedFilterCats=new Set(['Origin']);
let filterPanelOpen=false;



// ─── LAUNCH SITES ─────────────────────────────
const LAUNCH_SITES=[
  {region:'North America',sites:[
    {name:'Kennedy Space Center', short:'KSC',  country:'USA',        lat:28.5, azMin:37,  azMax:112, note:'Cape Canaveral. Primary US launch site.'},
    {name:'Vandenberg SFB',       short:'VAFB', country:'USA',        lat:34.6, azMin:147, azMax:201, note:'Polar & sun-sync. Retrograde only from here.'},
    {name:'Wallops Island',       short:'WLPS', country:'USA',        lat:37.8, azMin:90,  azMax:159, note:'MARS. Mid-inclination and polar capable.'},
    {name:'Kodiak / PSCA',        short:'KDK',  country:'USA',        lat:57.4, azMin:110, azMax:220, note:'Alaska. High-inclination and polar.'},
  ]},
  {region:'Russia',sites:[
    {name:'Baikonur Cosmodrome',  short:'BKR',  country:'Russia',     lat:45.9, azMin:51,  azMax:100, minInc:51.6, note:'Range safety forces min inc ≈ 51.6° despite 45.9° latitude.'},
    {name:'Plesetsk Cosmodrome',  short:'PLSK', country:'Russia',     lat:62.8, azMin:66,  azMax:160, note:'Primary Russian military site. Polar capable.'},
    {name:'Vostochny Cosmodrome', short:'VST',  country:'Russia',     lat:51.9, azMin:60,  azMax:120, note:'New Russian civilian site.'},
  ]},
  {region:'Europe / Americas',sites:[
    {name:'Kourou (CSG)',         short:'CSG',  country:'France/ESA', lat:5.2,  azMin:10,  azMax:95,  note:'Near-equatorial. Ariane advantage: GTO inc ≈ 5.2°.'},
    {name:'Alcântara (ALZ)',      short:'ALZ',  country:'Brazil',     lat:-2.3, azMin:10,  azMax:180, note:'Near-equatorial. Southern hemisphere.'},
  ]},
  {region:'Asia / Pacific',sites:[
    {name:'Tanegashima',          short:'TNGS', country:'Japan',      lat:30.4, azMin:90,  azMax:115, note:'JAXA primary launch site.'},
    {name:'Jiuquan (JSLC)',       short:'JSLC', country:'China',      lat:40.6, azMin:57,  azMax:100, note:'Chinese crewed launches.'},
    {name:'Xichang (XSLC)',       short:'XSLC', country:'China',      lat:28.2, azMin:90,  azMax:115, note:'Chinese GTO launches.'},
    {name:'Wenchang (WSLC)',      short:'WSLC', country:'China',      lat:19.6, azMin:90,  azMax:115, note:'Newest Chinese site. Lower latitude.'},
    {name:'Sriharikota (SHAR)',   short:'SHAR', country:'India',      lat:13.7, azMin:50,  azMax:140, note:'ISRO primary launch site.'},
    {name:'Mahia Peninsula',      short:'MHI',  country:'New Zealand',lat:-39.3,azMin:57,  azMax:185, note:'Rocket Lab. Southern hemisphere. ~39° min inc.'},
  ]},
];

let activeSiteKey=null;

function siteEffectiveInc(site){
  // Minimum achievable inclination from this site
  return site.minInc!==undefined ? site.minInc : Math.abs(site.lat);
}

function buildSiteSelector(){
  const grid=document.getElementById('site-selector-grid');
  if(!grid)return;
  grid.innerHTML='';
  LAUNCH_SITES.forEach(region=>{
    const regionDiv=document.createElement('div');regionDiv.className='site-region';
    const lbl=document.createElement('div');lbl.className='site-region-label';lbl.textContent=region.region;
    regionDiv.appendChild(lbl);
    const btnRow=document.createElement('div');btnRow.className='site-grid';
    region.sites.forEach(site=>{
      const key=site.short;
      const btn=document.createElement('button');
      btn.className='site-btn'+(activeSiteKey===key?' active':'');
      btn.textContent=site.short;
      btn.title=site.name+' — '+site.note;
      btn.onclick=()=>loadSite(site);
      btnRow.appendChild(btn);
    });
    regionDiv.appendChild(btnRow);
    grid.appendChild(regionDiv);
  });
  // Custom option
  const customDiv=document.createElement('div');customDiv.className='site-region';
  const customRow=document.createElement('div');customRow.className='site-grid';
  const customBtn=document.createElement('button');
  customBtn.className='site-btn'+(activeSiteKey===null?' active':'');
  customBtn.textContent='Custom';customBtn.title='Edit fields manually';
  customBtn.onclick=()=>{activeSiteKey=null;buildSiteSelector();updateSiteNotes(null);};
  customRow.appendChild(customBtn);customDiv.appendChild(customRow);grid.appendChild(customDiv);
}

function loadSite(site){
  activeSiteKey=site.short;
  document.getElementById('site-lat').value=site.lat;
  document.getElementById('az-min').value=site.azMin;
  document.getElementById('az-max').value=site.azMax;
  buildSiteSelector();
  updateSiteNotes(site);
  // Update any active incTracksLat orbit
  updateIncForSite(site);
}

function updateSiteNotes(site){
  const noteEl=document.getElementById('site-note');
  const trackEl=document.getElementById('inc-tracked-note');
  if(!site){noteEl.textContent='';trackEl.style.display='none';return;}
  noteEl.textContent=site.name+(site.note?' — '+site.note:'');
  updateIncTrackedNote(site);
}

function updateIncTrackedNote(site){
  const trackEl=document.getElementById('inc-tracked-note');
  if(!site){trackEl.style.display='none';return;}
  const effectiveInc=siteEffectiveInc(site);
  // Check if active orbit tracks lat
  const activeOrbitTracksLat=checkActiveOrbitTracksLat();
  if(activeOrbitTracksLat){
    trackEl.style.display='block';
    trackEl.textContent='↻ Active orbit inclination updated to '+effectiveInc.toFixed(1)+'° ('+
      (site.minInc!==undefined?'range safety minimum':'site latitude')+')';
  } else {
    trackEl.style.display='none';
  }
}

function checkActiveOrbitTracksLat(){
  if(!activeOrbitKey)return false;
  // Search ORBIT_CATEGORIES for the active orbit
  for(const cat of ORBIT_CATEGORIES){
    for(let i=0;i<cat.orbits.length;i++){
      if('orbit_'+cat.planet+'_'+i===activeOrbitKey){
        return cat.orbits[i].incTracksLat===true;
      }
    }
  }
  return false;
}

function updateIncForSite(site){
  if(!checkActiveOrbitTracksLat())return;
  const inc=siteEffectiveInc(site);
  document.getElementById('inclination').value=inc;
  updateIncTrackedNote(site);
}


function matchSiteFromFields(){
  // Try to match current lat/azMin/azMax to a known site
  const lat=parseFloat(document.getElementById('site-lat').value);
  const azMin=parseFloat(document.getElementById('az-min').value);
  const azMax=parseFloat(document.getElementById('az-max').value);
  for(const region of LAUNCH_SITES){
    for(const site of region.sites){
      if(Math.abs(site.lat-lat)<0.1&&Math.abs(site.azMin-azMin)<1&&Math.abs(site.azMax-azMax)<1){
        activeSiteKey=site.short;
        buildSiteSelector();
        updateSiteNotes(site);
        return;
      }
    }
  }
  // No match — stay custom
  activeSiteKey=null;
  buildSiteSelector();
  updateSiteNotes(null);
}
function onSiteFieldEdit(){
  // User manually edited fields → switch to custom
  if(activeSiteKey!==null){
    activeSiteKey=null;
    buildSiteSelector();
    document.getElementById('site-note').textContent='';
    document.getElementById('inc-tracked-note').style.display='none';
  }
}

function getCurrentSite(){
  if(!activeSiteKey)return null;
  for(const region of LAUNCH_SITES){
    const s=region.sites.find(s=>s.short===activeSiteKey);
    if(s)return s;
  }
  return null;
}


// ─── PERFORMANCE CASES ────────────────────────
let performanceCases=[];   // { label, timestamp, vehicleName, result, config }
let activeCaseIndex=null;
let loadedVehicleName='';  // name from last loaded file

function buildCaseList(){
  const list=document.getElementById('case-list');
  if(!list)return;
  list.innerHTML='';
  if(!performanceCases.length){
    list.innerHTML='<div class="cases-empty">// No cases saved yet.<br>Calculate then save.</div>';
    const dlBtn=document.getElementById('download-cases-btn');
    if(dlBtn)dlBtn.disabled=true;
    return;
  }
  const dlBtn=document.getElementById('download-cases-btn');
  if(dlBtn)dlBtn.disabled=false;
  performanceCases.forEach((c,i)=>{
    const item=document.createElement('div');item.className='case-item';
    const btn=document.createElement('button');
    btn.className='case-btn'+(activeCaseIndex===i?' active':'');
    const payload=c.result?.maxPayload;
    const payStr=payload!=null?(payload>=1000?(payload/1000).toFixed(1)+'t':Math.round(payload)+'kg'):'—';
    btn.innerHTML=`<div class="case-label">${c.label||'Case '+(i+1)}</div>
      <div class="case-sub">${payStr} · ${c.config?.modeLabel||''}</div>`;
    btn.onclick=()=>viewCase(i);
    const del=document.createElement('button');
    del.className='case-del';del.textContent='×';del.title='Remove case';
    del.onclick=()=>{
      performanceCases.splice(i,1);
      if(activeCaseIndex===i)activeCaseIndex=null;
      else if(activeCaseIndex>i)activeCaseIndex--;
      buildCaseList();
    };
    item.appendChild(btn);item.appendChild(del);
    list.appendChild(item);
  });
}

function openSaveCaseModal(){
  if(!lastResult){alert('Run a calculation first.');return;}
  // Auto-suggest label from site + orbit
  const site=activeSiteKey||'Custom';
  const orbit=lastResult.modeLabel||'';
  document.getElementById('case-label-input').value=`${orbit} — ${site}`;
  openModal('modal-save-case');
  setTimeout(()=>document.getElementById('case-label-input').select(),100);
}

function doSaveCase(){
  if(!lastResult)return;
  const label=document.getElementById('case-label-input').value.trim()||('Case '+(performanceCases.length+1));
  // Snapshot current config
  const config={
    modeLabel:lastResult.modeLabel,
    site:{lat:gv('site-lat'),azMin:gv('az-min'),azMax:gv('az-max'),name:activeSiteKey},
    orbit:lastResult.orbitParams||null,
  };
  performanceCases.push({
    label,
    timestamp:new Date().toISOString(),
    vehicleName:loadedVehicleName||document.getElementById('lv-save-name')?.value||'',
    result:{...lastResult},
    config,
  });
  activeCaseIndex=performanceCases.length-1;
  closeModal('modal-save-case');
  buildCaseList();
}

function viewCase(i){
  activeCaseIndex=i;
  const c=performanceCases[i];
  if(!c)return;
  // Restore lastResult and re-render results panel
  lastResult={...c.result};
  renderResults(lastResult);
  buildCaseList();
}

// loadVehicleForCases removed — loadLVFile + applyLVObject handle both pages

function downloadAllCases(){
  if(!performanceCases.length){alert('No cases to download.');return;}
  // Bundle vehicle config + cases as a single loadable file
  const obj=buildLVObject(loadedVehicleName||'vehicle','');
  downloadJSON(obj,((loadedVehicleName||'vehicle').replace(/[^a-z0-9_-]/gi,'_').toLowerCase())+'.json');
}



// ─── BEGINNER / ADVANCED MODE ─────────────────
let vehicleMode='beginner';

function setVehicleMode(mode){
  vehicleMode=mode;
  document.querySelectorAll('#view-mode-toggle button').forEach((b,i)=>{
    b.classList.toggle('active',i===(mode==='beginner'?0:1));
  });
  const beg=document.getElementById('vehicles-beginner');
  const adv=document.getElementById('vehicles-advanced');
  const tbl=document.getElementById('vehicles-stage-params');
  if(mode==='beginner'){
    beg.style.display='grid';
    adv.style.display='none';
    tbl.style.display='none';
  } else {
    beg.style.display='none';
    adv.style.display='block';
    tbl.style.display='block';
    syncAdvControls();
  }
}

function syncAdvControls(){
  // Mirror primary controls to advanced duplicates
  const advSel=document.getElementById('stage-selector-adv');
  if(advSel){advSel.innerHTML='';
    const minus=document.createElement('button');minus.textContent='−';minus.style.cssText='font-size:15px;padding:4px 14px;letter-spacing:0;';
    minus.onclick=()=>{setStages(numStages-1);markLVUserDefined();};advSel.appendChild(minus);
    const count=document.createElement('button');count.textContent=numStages;count.style.cssText='font-size:13px;padding:4px 16px;font-weight:600;pointer-events:none;color:var(--accent);';
    advSel.appendChild(count);
    const plus=document.createElement('button');plus.textContent='+';plus.style.cssText='font-size:15px;padding:4px 14px;letter-spacing:0;';
    plus.onclick=()=>{setStages(numStages+1);markLVUserDefined();};advSel.appendChild(plus);
  }
  // Booster toggle
  document.querySelectorAll('#booster-toggle-adv button').forEach((b,i)=>b.classList.toggle('active',i===(useBooster?0:1)));
  const bcw=document.getElementById('booster-count-wrap-adv');
  if(bcw)bcw.style.display=useBooster?'flex':'none';
  const nb=document.getElementById('num-boosters-adv');
  if(nb)nb.value=document.getElementById('num-boosters')?.value||4;
  // Restartable toggle
  document.querySelectorAll('#restart-toggle-adv button').forEach((b,i)=>{
    const isRestart=document.querySelector('#restart-toggle button.active')?.textContent==='Yes';
    b.classList.toggle('active',i===(isRestart?0:1));
  });
  // Fairing jettison — sync options
  const fj=document.getElementById('fairing-jettison');
  const fja=document.getElementById('fairing-jettison-adv');
  if(fj&&fja){fja.innerHTML=fj.innerHTML;fja.value=fj.value;}
  // Fairing mass
  const fm=document.getElementById('fairing-mass');
  const fma=document.getElementById('fairing-mass-adv');
  if(fm&&fma)fma.value=fm.value;
}

// Advanced mode: load stage → prompt slot
let _advStageObj=null;
function advLoadStage(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      _advStageObj=JSON.parse(e.target.result);
      openAdvSlotModal();
    }catch(err){alert('Invalid stage JSON.');}
  };
  reader.readAsText(file);input.value='';
}
function openAdvSlotModal(){
  const sel=document.getElementById('adv-slot-select');
  sel.innerHTML='';
  if(useBooster){
    const o=document.createElement('option');o.value='booster';o.textContent='Strap-on Booster';
    sel.appendChild(o);
  }
  for(let s=0;s<numStages;s++){
    const o=document.createElement('option');o.value=s;
    o.textContent='Stage '+(s+1)+(currentStageNames[s]?' — '+currentStageNames[s]:'');
    sel.appendChild(o);
  }
  openModal('modal-adv-slot');
}
function openAdvSaveSlotModal(){
  const sel=document.getElementById('adv-save-slot-select');
  sel.innerHTML='';
  if(useBooster){const o=document.createElement('option');o.value='booster';o.textContent='Strap-on Booster';sel.appendChild(o);}
  for(let s=0;s<numStages;s++){const o=document.createElement('option');o.value=s;o.textContent='Stage '+(s+1)+(currentStageNames[s]?' — '+currentStageNames[s]:'');sel.appendChild(o);}
  openModal('modal-adv-save-slot');
}
function doAdvSaveSlot(){const val=document.getElementById('adv-save-slot-select').value;saveStageCardAsFile(val==='booster'?null:parseInt(val),val==='booster');closeModal('modal-adv-save-slot');}
function doAdvSlotLoad(){
  if(!_advStageObj)return;
  const val=document.getElementById('adv-slot-select').value;
  if(val==='booster'){applyBoosterData(_advStageObj);}
  else{applyStageData(parseInt(val),_advStageObj);}
  _advStageObj=null;
  closeModal('modal-adv-slot');
  buildTable();
}

// ─── STAGE COMPOSITION VIEW ───────────────────
let currentStageNames=new Array(15).fill(null); // library name for each stage slot
let stageSaved=new Array(15).fill(false);
let boosterSaved=false;

function buildStageComposition(){
  const body=document.getElementById('comp-body');
  if(!body)return;
  body.innerHTML='';

  function makeCompCard(label,stageName,dry,prop,thrust,isp,stageIdx,isBooster){
    const saved=isBooster?boosterSaved:(stageIdx>=0?stageSaved[stageIdx]:false);
    const wrap=document.createElement('div');
    wrap.style.cssText='display:flex;flex-direction:column;';
    const lbl=document.createElement('div');
    lbl.className='comp-stage-label';lbl.textContent=label;
    wrap.appendChild(lbl);
    // Outer row: card content + save area
    const row=document.createElement('div');
    row.style.cssText='display:flex;align-items:stretch;gap:0;';
    const card=document.createElement('div');
    card.className='comp-card'+(stageName?'':' custom-stage');
    card.style.flex='1';
    card.addEventListener('dragover',e=>{e.preventDefault();card.classList.add('drop-hover');});
    card.addEventListener('dragleave',()=>card.classList.remove('drop-hover'));
    card.addEventListener('drop',e=>{
      e.preventDefault();card.classList.remove('drop-hover');
      if(!_draggingStage)return;
      if(_draggingStage._isVehicle){loadPreset(_draggingStage._preset,'builtin_'+BUILTIN_PRESETS.indexOf(_draggingStage._preset));}
      else if(isBooster){applyBoosterData(_draggingStage);}
      else{applyStageData(stageIdx,_draggingStage);}
    });
    const nameEl=document.createElement('div');
    nameEl.className='comp-card-name'+(stageName?'':' unnamed');
    nameEl.textContent=stageName||'Unnamed';
    card.appendChild(nameEl);
    if(dry||prop||thrust||isp){
      const specs=document.createElement('div');specs.className='comp-card-specs';
      specs.innerHTML=`<span><b>Isp</b> ${isp||0} s</span><span><b>F</b> ${fT(thrust||0)}</span><span><b>Dry</b> ${fM(dry||0)}</span><span><b>Prop</b> ${fM(prop||0)}</span>`;
      card.appendChild(specs);
    }
    const hint=document.createElement('div');hint.className='comp-card-hint';
    hint.textContent='// drop to replace';
    card.appendChild(hint);
    row.appendChild(card);
    // Wrench / edit button
    const editBtn=document.createElement('button');
    editBtn.className='comp-edit-btn';
    editBtn.title='Edit stage';
    editBtn.innerHTML='<svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 1a3 3 0 0 0-2.9 3.7L1 8.3A1.1 1.1 0 1 0 2.7 10l3.6-3.6A3 3 0 1 0 7.5 1z"/><circle cx="7.5" cy="4" r="1" fill="currentColor" stroke="none"/></svg>';
    editBtn.addEventListener('mouseenter',()=>editBtn.style.color='var(--accent2)');
    editBtn.addEventListener('mouseleave',()=>editBtn.style.color='');
    editBtn.addEventListener('click',e=>{e.stopPropagation();openEditStageModal(stageIdx,isBooster);});
    row.appendChild(editBtn);
    // Save button / saved dot
    const saveBtn=document.createElement('div');
    saveBtn.style.cssText=`width:32px;display:flex;align-items:center;justify-content:center;
      border:1px solid var(--border);border-left:none;cursor:${saved?'default':'pointer'};
      color:${saved?'var(--accent3)':'var(--text-dim)'};flex-shrink:0;transition:color .15s;`;
    if(saved){
      saveBtn.innerHTML='<span style="font-size:9px;line-height:1;">●</span>';
      saveBtn.title='Saved';
    } else {
      saveBtn.innerHTML='<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><line x1="5.5" y1="1" x2="5.5" y2="7.5"/><polyline points="2.5,5 5.5,8.5 8.5,5"/><line x1="1.5" y1="10" x2="9.5" y2="10"/></svg>';
      saveBtn.title='Save stage as .json';
      saveBtn.addEventListener('mouseenter',()=>saveBtn.style.color='var(--accent)');
      saveBtn.addEventListener('mouseleave',()=>saveBtn.style.color='var(--text-dim)');
      saveBtn.addEventListener('click',e=>{e.stopPropagation();saveStageCardAsFile(stageIdx,isBooster);});
    }
    row.appendChild(saveBtn);
    wrap.appendChild(row);
    return wrap;
  }

  // Booster first
  if(useBooster){
    const bCount=parseInt(document.getElementById('num-boosters')?.value)||0;
    body.appendChild(makeCompCard(
      `Strap-on ×${bCount}`,
      currentBoosterName,
      parseFloat(document.getElementById('b_dry')?.value)||0,
      parseFloat(document.getElementById('b_prop')?.value)||0,
      parseFloat(document.getElementById('b_thrust')?.value)||0,
      parseFloat(document.getElementById('b_isp')?.value)||0,
      null,true
    ));
  }

  for(let s=0;s<numStages;s++){
    const store=stageStore[s]||{};
    body.appendChild(makeCompCard(
      `Stage ${s+1}`,
      currentStageNames[s]||null,
      parseFloat(store.dry)||0,
      parseFloat(store.prop)||0,
      parseFloat(store.thrust)||0,
      parseFloat(store.isp)||0,
      s,false
    ));
  }
  // Ghost placeholder cards up to 4 total
  const ghostCount=Math.max(0,4-numStages);
  for(let g=0;g<ghostCount;g++){
    const slotIdx=numStages+g;
    const wrap=document.createElement('div');
    wrap.style.cssText='display:flex;flex-direction:column;';
    const lbl=document.createElement('div');
    lbl.className='comp-stage-label';lbl.style.opacity='.35';
    lbl.textContent=`Stage ${slotIdx+1}`;
    wrap.appendChild(lbl);
    // Ghost row (card + empty save area)
    const row=document.createElement('div');row.style.cssText='display:flex;align-items:stretch;';
    const ghost=document.createElement('div');
    ghost.className='comp-card-ghost';ghost.style.flex='1';
    const ghostLbl=document.createElement('div');
    ghostLbl.className='comp-card-ghost-label';
    ghostLbl.textContent='// drop stage here';
    ghost.appendChild(ghostLbl);
    ghost.addEventListener('dragover',e=>{e.preventDefault();ghost.classList.add('drop-hover');});
    ghost.addEventListener('dragleave',()=>ghost.classList.remove('drop-hover'));
    ghost.addEventListener('drop',e=>{
      e.preventDefault();ghost.classList.remove('drop-hover');
      if(!_draggingStage||_draggingStage._isVehicle)return;
      setStages(slotIdx+1);
      applyStageData(slotIdx,_draggingStage);
    });
    // Empty save area placeholder
    const savePh=document.createElement('div');
    savePh.style.cssText='width:32px;border:1px dashed var(--border);border-left:none;opacity:.3;flex-shrink:0;';
    row.appendChild(ghost);row.appendChild(savePh);
    wrap.appendChild(row);
    body.appendChild(wrap);
  }
}

// Track booster name
let currentBoosterName=null;
// applyBoosterData moved below(s){setBoosters(true);document.getElementById('b_dry').value=s.dry;document.getElementById('b_prop').value=s.prop;document.getElementById('b_thrust').value=s.thrust;document.getElementById('b_isp').value=s.isp;document.getElementById('b_res').value=s.res??2;currentBoosterName=s.name||null;boosterSaved=false;buildStageComposition();markLVUserDefined();}

// ─── SHARED FORMATTERS ───────────────────────
const fT=v=>v>=1000?(v/1000).toFixed(1)+' MN':v+' kN';
const fM=v=>v>=1000?(v/1000).toFixed(0)+'t':v+' kg';

// ─── STAGE DETAIL MODAL ───────────────────────
let _didDrag = false;

function propShort(tags){
  const t = (tags||[]).find(t=>
    t.includes('Liquid Oxygen')||t.includes('Nitrogen')||t.includes('Fluorine')||
    t.includes('Inhibited')||t.includes('Solid')||t.includes('Ethanol'));
  if(!t) return '';
  if(t.includes('Liquid Hydrogen')) return 'LOX / LH₂';
  if(t.includes('Kerosene'))        return 'LOX / RP-1';
  if(t.includes('Methane'))         return 'LOX / CH₄';
  if(t.includes('Ethanol'))         return 'LOX / Ethanol';
  if(t.includes('Aerozine'))        return 'NTO / Aerozine-50';
  if(t.includes('UDMH')&&t.includes('Nitrogen')) return 'NTO / UDMH';
  if(t.includes('IRFNA'))           return 'IRFNA / UDMH';
  if(t.includes('Fluorine'))        return 'LF₂ / Hydrazine';
  if(t.includes('Solid'))           return 'Solid Propellant';
  return t;
}

function openStageModal(stage){
  document.getElementById('sdm-title').textContent = stage.name;
  const fT=v=>v>=1000?(v/1000).toFixed(2)+' MN':v+' kN';
  const fM=v=>v>=1000?(v/1000).toFixed(1)+' t':v+' kg';
  const body = document.getElementById('sdm-body');
  const fuel = propShort(stage.tags);
  const nonPropTags=(stage.tags||[]).filter(t=>!['Liquid Oxygen','Nitrogen Tetroxide','Inhibited','Solid Propellant','Liquid Fluorine','Liquid Oxygen / Ethanol'].some(p=>t.startsWith(p)));
  body.innerHTML=`
    <div class="stage-detail-grid">
      <div class="stage-detail-row"><label>Dry Mass</label><span>${fM(stage.dry||0)}</span></div>
      <div class="stage-detail-row"><label>Propellant</label><span>${fM(stage.prop||0)}</span></div>
      <div class="stage-detail-row"><label>Thrust (vac)</label><span>${fT(stage.thrust||0)}</span></div>
      <div class="stage-detail-row"><label>Isp (vac)</label><span>${stage.isp||0} s</span></div>
      <div class="stage-detail-row"><label>Residuals</label><span>${stage.res??2} %</span></div>
      <div class="stage-detail-row"><label>Engines</label><span>${stage.engines||'—'}</span></div>
      ${fuel?`<div class="stage-detail-row" style="grid-column:1/-1;"><label>Propellant</label><span>${fuel}</span></div>`:''}
    </div>
    ${stage.note?`<div class="note" style="margin:0 0 8px;">${stage.note}</div>`:''}
    <div class="stage-detail-tags">${nonPropTags.map(t=>`<span class="stage-detail-tag">${t}</span>`).join('')}</div>
  `;
  openModal('modal-stage-detail');
}

function openVehicleModal(p){
  document.getElementById('sdm-title').textContent = p.name;
  const body = document.getElementById('sdm-body');
  const tags = computeVehicleTags(p);
  const nonEra = tags.filter(t=>!['1940s','1950s','1960s','1970s','1980s','1990s-2000s','2010s+'].includes(t));
  body.innerHTML=`
    <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:.08em;margin-bottom:10px;">
      ${(p.stageNames||[]).join(' → ')}${p.boosterName?' + '+p.boosterName+(p.boosterCount>1?' ×'+p.boosterCount:''):''}
    </div>
    ${p.note?`<div class="note" style="margin:0 0 8px;">${p.note}</div>`:''}
    <div class="stage-detail-tags">${nonEra.map(t=>`<span class="stage-detail-tag">${t}</span>`).join('')}</div>
  `;
  openModal('modal-stage-detail');
}



// ─── STAGE EDIT (WRENCH) ──────────────────────
let _editSlot=null; // {stageIdx, isBooster}

function openEditStageModal(stageIdx,isBooster){
  _editSlot={stageIdx,isBooster};
  // Get current values
  let dry,prop,thrust,isp,res,engines='',note='',tags=[],name='',cat='Upper Stages',isB=false;
  if(isBooster){
    dry=document.getElementById('b_dry')?.value||0;
    prop=document.getElementById('b_prop')?.value||0;
    thrust=document.getElementById('b_thrust')?.value||0;
    isp=document.getElementById('b_isp')?.value||0;
    res=document.getElementById('b_res')?.value||2;
    name=currentBoosterName||'Strap-on Booster';
    isB=true;
    cat='Side Boosters';
  } else {
    const store=stageStore[stageIdx]||{};
    dry=store.dry||0;prop=store.prop||0;thrust=store.thrust||0;isp=store.isp||0;res=store.res||2;
    name=currentStageNames[stageIdx]||'Stage '+(stageIdx+1);
    // Try to find category from library
    const foundCat=findStageCategory(name);
    if(foundCat)cat=foundCat;
    // Find engines/note/tags from library
    const libStage=findStageInLibrary(name);
    if(libStage){engines=libStage.engines||'';note=libStage.note||'';tags=libStage.tags||[];}
  }
  // Fill modal fields
  document.getElementById('stg-name').value=name;
  document.getElementById('stg-dry').value=dry;
  document.getElementById('stg-prop').value=prop;
  document.getElementById('stg-thrust').value=thrust;
  document.getElementById('stg-isp').value=isp;
  document.getElementById('stg-res').value=res;
  document.getElementById('stg-engines').value=engines;
  document.getElementById('stg-note').value=note;
  document.getElementById('stg-tags').value=tags.join(', ');
  document.getElementById('stg-is-booster').checked=isB;
  document.getElementById('stg-new-cat-wrap').style.display='none';
  // Set category
  const sel=document.getElementById('stg-category');
  if([...sel.options].some(o=>o.value===cat))sel.value=cat;
  // Swap footer buttons: hide Add, show Save Changes
  document.getElementById('add-stage-lib-btn').style.display='none';
  document.getElementById('add-stage-save-btn').style.display='none';
  document.getElementById('edit-stage-save-btn').style.display='';
  document.getElementById('stg-base').value='';
  document.querySelector('#modal-add-stage .modal-title').textContent='Edit Stage';
  openModal('modal-add-stage');
}

function doEditStage(){
  if(!_editSlot)return;
  const {stageIdx,isBooster}=_editSlot;
  const name=document.getElementById('stg-name').value.trim();
  const dry=parseFloat(document.getElementById('stg-dry').value)||0;
  const prop=parseFloat(document.getElementById('stg-prop').value)||0;
  const thrust=parseFloat(document.getElementById('stg-thrust').value)||0;
  const isp=parseFloat(document.getElementById('stg-isp').value)||1;
  const res=parseFloat(document.getElementById('stg-res').value)||2;
  const engines=document.getElementById('stg-engines').value.trim();
  const note=document.getElementById('stg-note').value.trim();
  const tags=document.getElementById('stg-tags').value.split(',').map(t=>t.trim()).filter(Boolean);
  const cat=document.getElementById('stg-category').value;

  if(isBooster){
    // Update booster fields
    ['dry','prop','thrust','isp','res'].forEach(k=>{
      const el=document.getElementById('b_'+k);
      if(el)el.value={dry,prop,thrust,isp,res}[k];
    });
    currentBoosterName=name;
    boosterSaved=false;
    // If UGC, update library entry
    updateUGCStage(currentBoosterName,{name,dry,prop,thrust,isp,res,engines,note,tags,isBooster:true,_userGenerated:true,_category:cat});
  } else {
    // Update stageStore
    if(!stageStore[stageIdx])stageStore[stageIdx]={};
    Object.assign(stageStore[stageIdx],{dry:String(dry),prop:String(prop),thrust:String(thrust),isp:String(isp),res:String(res)});
    // Update DOM table cells
    ['dry','prop','thrust','isp','res'].forEach(k=>{
      const el=document.getElementById('s'+(stageIdx+1)+'_'+k);
      if(el)el.value={dry,prop,thrust,isp,res}[k];
    });
    const wasUGC=isUGCStage(currentStageNames[stageIdx]);
    currentStageNames[stageIdx]=name;
    stageSaved[stageIdx]=false;
    // If UGC, update library entry directly
    if(wasUGC){
      updateUGCStage(currentStageNames[stageIdx]||name,{name,dry,prop,thrust,isp,res,engines,note,tags,_userGenerated:true,_category:cat});
    }
  }
  _editSlot=null;
  closeModal('modal-add-stage');
  buildStageComposition();
  markLVUserDefined();
  buildStageLibrary();
}

function isUGCStage(name){
  if(!name)return false;
  for(const stages of Object.values(userStagesByCategory)){
    if(stages.some(s=>s.name===name))return true;
  }
  return false;
}

function findStageCategory(name){
  for(const [cat,stages] of Object.entries(userStagesByCategory)){
    if(stages.some(s=>s.name===name))return cat;
  }
  for(const [cat,stages] of Object.entries(STAGE_LIBRARY)){
    if(stages.some(s=>s.name===name))return cat;
  }
  return null;
}

function findStageInLibrary(name){
  for(const stages of Object.values(userStagesByCategory)){
    const s=stages.find(s=>s.name===name);if(s)return s;
  }
  for(const stages of Object.values(STAGE_LIBRARY)){
    const s=stages.find(s=>s.name===name);if(s)return s;
  }
  return null;
}

function updateUGCStage(oldName,newStage){
  for(const [cat,stages] of Object.entries(userStagesByCategory)){
    const idx=stages.findIndex(s=>s.name===oldName);
    if(idx>=0){stages[idx]={...newStage,_category:cat};return;}
  }
}

// ─── STAGE CARD SAVE ──────────────────────────
function saveStageCardAsFile(stageIdx,isBooster){
  let stage;
  if(isBooster){
    stage={
      name:currentBoosterName||'Strap-on Booster',
      dry:parseFloat(document.getElementById('b_dry')?.value)||0,
      prop:parseFloat(document.getElementById('b_prop')?.value)||0,
      thrust:parseFloat(document.getElementById('b_thrust')?.value)||0,
      isp:parseFloat(document.getElementById('b_isp')?.value)||0,
      res:parseFloat(document.getElementById('b_res')?.value)||2,
      isBooster:true,_userGenerated:true,
    };
    boosterSaved=true;
  } else {
    const store=stageStore[stageIdx]||{};
    stage={
      name:currentStageNames[stageIdx]||`Stage ${stageIdx+1}`,
      dry:parseFloat(store.dry)||0,
      prop:parseFloat(store.prop)||0,
      thrust:parseFloat(store.thrust)||0,
      isp:parseFloat(store.isp)||0,
      res:parseFloat(store.res)||2,
      _userGenerated:true,
    };
    stageSaved[stageIdx]=true;
  }
  const fname=stage.name.replace(/[^a-z0-9_-]/gi,'_').toLowerCase()+'_stage.json';
  downloadJSON(stage,fname);
  buildStageComposition();
}

// ─── STAGE RESOLVER ───────────────────────────
function findStageByName(name){
  for(const stages of Object.values(STAGE_LIBRARY)){
    const s=stages.find(s=>s.name===name);
    if(s)return s;
  }
  for(const stages of Object.values(userStagesByCategory)){
    const s=stages.find(s=>s.name===name);
    if(s)return s;
  }
  return null;
}

function resolvePresetStages(p){
  // Convert stageNames array to stageData array by looking up library
  if(p.stageData)return p.stageData; // already resolved (user LV)
  return (p.stageNames||[]).map(name=>{
    const s=findStageByName(name);
    if(!s)return {dry:0,prop:0,thrust:0,isp:300,res:2,_missing:name};
    return {dry:s.dry,prop:s.prop,thrust:s.thrust,isp:s.isp,res:s.res??2};
  });
}

function resolvePresetBooster(p){
  if(p.boosterData)return p.boosterData;
  if(!p.boosterName)return null;
  const s=findStageByName(p.boosterName);
  if(!s)return null;
  return {dry:s.dry,prop:s.prop,thrust:s.thrust,isp:s.isp,res:s.res??2,count:p.boosterCount||1};
}

// Compute tags for a vehicle from its stages + vehicle-specific tags
function computeVehicleTags(p){
  const stageTags=new Set();
  (p.stageNames||[]).forEach(name=>{
    const s=findStageByName(name);
    if(s)(s.tags||[]).forEach(t=>stageTags.add(t));
  });
  if(p.boosterName){
    const s=findStageByName(p.boosterName);
    if(s)(s.tags||[]).forEach(t=>stageTags.add(t));
  }
  // Add payload class tag
  const pay=p.payload||0;
  if(pay<50)stageTags.add('Nano (<50 kg)');
  else if(pay<1000)stageTags.add('Small (<1 t)');
  else if(pay<10000)stageTags.add('Medium (1–10 t)');
  else if(pay<50000)stageTags.add('Heavy (10–50 t)');
  else stageTags.add('Super Heavy (>50 t)');
  // Merge with vehicle's own tags
  (p.tags||[]).forEach(t=>stageTags.add(t));
  return [...stageTags];
}

// ─── FILTER SYSTEM ─────────────────────────────
function buildFilterPanel(){
  const panel=document.getElementById('filter-panel');
  panel.innerHTML='';
  Object.entries(FILTER_TREE).forEach(([cat,opts])=>{
    const collapsed=collapsedFilterCats.has(cat);
    const div=document.createElement('div');div.className='filter-cat';
    const hdr=document.createElement('div');hdr.className='filter-cat-hdr';
    const chev=document.createElement('span');chev.className='filter-cat-chevron'+(collapsed?'':' open');chev.textContent='▶';
    hdr.appendChild(chev);
    hdr.appendChild(Object.assign(document.createElement('span'),{textContent:cat}));
    const activeInCat=activeFilters[cat]?.size||0;
    if(activeInCat){
      const badge=document.createElement('span');
      badge.style.cssText='font-family:var(--mono);font-size:8px;color:var(--accent);border:1px solid var(--accent);padding:1px 5px;margin-left:4px;';
      badge.textContent=activeInCat;hdr.appendChild(badge);
    }
    hdr.onclick=()=>{collapsedFilterCats.has(cat)?collapsedFilterCats.delete(cat):collapsedFilterCats.add(cat);buildFilterPanel();};
    div.appendChild(hdr);
    if(!collapsed){
      const row=document.createElement('div');row.className='filter-opts';
      opts.forEach(opt=>{
        const active=activeFilters[cat]?.has(opt);
        const btn=document.createElement('div');btn.className='filter-opt'+(active?' active':'');
        btn.textContent=opt;
        btn.onclick=()=>{
          if(!activeFilters[cat])activeFilters[cat]=new Set();
          if(activeFilters[cat].has(opt))activeFilters[cat].delete(opt);else activeFilters[cat].add(opt);
          if(!activeFilters[cat].size)delete activeFilters[cat];
          buildFilterPanel();updateFilterChips();buildStageLibrary();
        };
        row.appendChild(btn);
      });
      div.appendChild(row);
    }
    panel.appendChild(div);
  });
}

function updateFilterChips(){
  const chips=document.getElementById('active-filter-chips');
  chips.innerHTML='';
  let any=false;
  Object.entries(activeFilters).forEach(([cat,tags])=>{
    tags.forEach(tag=>{
      any=true;
      const chip=document.createElement('div');chip.className='filter-chip';
      chip.innerHTML=`<span>${tag}</span><span class="filter-chip-x" onclick="removeFilter('${cat}','${tag}')">×</span>`;
      chips.appendChild(chip);
    });
  });
  document.getElementById('clear-filters-btn').style.display=any?'':'none';
  document.getElementById('filter-toggle-btn').classList.toggle('active',any||filterPanelOpen);
}

function removeFilter(cat,tag){
  if(activeFilters[cat]){activeFilters[cat].delete(tag);if(!activeFilters[cat].size)delete activeFilters[cat];}
  buildFilterPanel();updateFilterChips();buildStageLibrary();
}

function clearAllFilters(){
  activeFilters={};buildFilterPanel();updateFilterChips();buildStageLibrary();
}

function toggleFilterPanel(){
  filterPanelOpen=!filterPanelOpen;
  const panel=document.getElementById('filter-panel');
  panel.style.display=filterPanelOpen?'block':'none';
  if(filterPanelOpen)buildFilterPanel();
  document.getElementById('filter-toggle-btn').classList.toggle('active',filterPanelOpen||Object.keys(activeFilters).length>0);
}

function stageMatchesFilters(stage){
  // AND across filter categories, OR within each category
  return Object.entries(activeFilters).every(([cat,tags])=>{
    if(!tags.size)return true;
    const stageTags=stage.tags||[];
    return [...tags].some(t=>stageTags.includes(t));
  });
}

// ─── USER STAGE MANAGEMENT ─────────────────────
function openAddStageModal(){
  ['stg-name','stg-note','stg-engines'].forEach(id=>document.getElementById(id).value='');
  ['stg-dry','stg-prop','stg-thrust','stg-isp'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('stg-res').value=2;
  document.getElementById('stg-is-booster').checked=false;
  document.getElementById('stg-new-cat-wrap').style.display='none';
  // Populate category dropdown
  const sel=document.getElementById('stg-category');
  while(sel.options.length>5)sel.remove(4);
  Object.keys(userStagesByCategory).filter(k=>!Object.keys(STAGE_LIBRARY).includes(k)).forEach(k=>{
    const o=document.createElement('option');o.value=k;o.textContent=k+' (custom)';
    sel.insertBefore(o,sel.lastElementChild);
  });
  sel.value='Upper Stages';
  // Populate base stage picker
  const base=document.getElementById('stg-base');
  base.innerHTML='<option value="">— Blank —</option>';
  const allCats={...STAGE_LIBRARY};
  Object.entries(userStagesByCategory).forEach(([k,v])=>{
    if(!allCats[k])allCats[k]=[];
    allCats[k]=[...v,...(allCats[k]||[])];
  });
  Object.entries(allCats).forEach(([cat,stages])=>{
    if(!stages.length)return;
    const grp=document.createElement('optgroup');grp.label=cat;
    stages.forEach(s=>{
      const o=document.createElement('option');o.value=s.name;o.textContent=s.name;
      grp.appendChild(o);
    });
    base.appendChild(grp);
  });
  // Restore Add mode footer
  _editSlot=null;
  document.getElementById('add-stage-lib-btn').style.display='';
  document.getElementById('add-stage-save-btn').style.display='';
  document.getElementById('edit-stage-save-btn').style.display='none';
  document.querySelector('#modal-add-stage .modal-title').textContent='Add Stage to Library';
  openModal('modal-add-stage');
  setTimeout(()=>document.getElementById('stg-name').focus(),100);
}

function onBaseStageChange(val){
  if(!val)return;
  // Find stage across all sources
  let found=null;
  for(const stages of Object.values(STAGE_LIBRARY)){
    found=stages.find(s=>s.name===val);if(found)break;
  }
  if(!found)for(const stages of Object.values(userStagesByCategory)){
    found=stages.find(s=>s.name===val);if(found)break;
  }
  if(!found)return;
  document.getElementById('stg-name').value=found.name+' (mod)';
  document.getElementById('stg-dry').value=found.dry||'';
  document.getElementById('stg-prop').value=found.prop||'';
  document.getElementById('stg-thrust').value=found.thrust||'';
  document.getElementById('stg-isp').value=found.isp||'';
  document.getElementById('stg-res').value=found.res??2;
  document.getElementById('stg-engines').value=found.engines||'';
  document.getElementById('stg-note').value=found.note||'';
  document.getElementById('stg-tags').value=(found.tags||[]).join(', ');
  document.getElementById('stg-is-booster').checked=!!found.isBooster;
  // Set category to match base stage
  const cat=found._category||(found.isBooster?'Side Boosters':'Upper Stages');
  const catSel=document.getElementById('stg-category');
  if([...catSel.options].some(o=>o.value===cat))catSel.value=cat;
  onStageCatChange(catSel.value);
}

function onStageCatChange(val){
  document.getElementById('stg-new-cat-wrap').style.display=val==='__new__'?'grid':'none';
}

function doAddStage(andSave){
  const name=document.getElementById('stg-name').value.trim();
  if(!name){alert('Please enter a stage name.');return;}
  let cat=document.getElementById('stg-category').value;
  if(cat==='__new__'){
    cat=document.getElementById('stg-new-cat').value.trim()||'Custom';
  }
  const stage={
    name,_userGenerated:true,
    dry:    parseFloat(document.getElementById('stg-dry').value)||0,
    prop:   parseFloat(document.getElementById('stg-prop').value)||0,
    thrust: parseFloat(document.getElementById('stg-thrust').value)||0,
    isp:    parseFloat(document.getElementById('stg-isp').value)||1,
    res:    parseFloat(document.getElementById('stg-res').value)||2,
    engines:document.getElementById('stg-engines').value.trim()||'—',
    note:   document.getElementById('stg-note').value.trim(),
    tags:   document.getElementById('stg-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
    isBooster:document.getElementById('stg-is-booster').checked,
    _category:cat,
  };
  if(!userStagesByCategory[cat])userStagesByCategory[cat]=[];
  userStagesByCategory[cat].unshift(stage); // prepend so new stages appear first
  if(andSave){
    downloadJSON(stage,(name.replace(/[^a-z0-9_-]/gi,'_').toLowerCase())+'_stage.json');
  }
  closeModal('modal-add-stage');
  buildStageLibrary();
}

function loadUserStageFile(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const s=JSON.parse(e.target.result);
      if(!s.name||s.dry===undefined){alert('Invalid stage file: missing name or dry mass.');return;}
      s._userGenerated=true; // mark as user content on import
      const cat=s._category||'Custom';
      if(!userStagesByCategory[cat])userStagesByCategory[cat]=[];
      userStagesByCategory[cat].unshift(s); // prepend so it appears first
      buildStageLibrary();
    }catch(err){alert('Invalid stage JSON: '+err.message);}
  };
  reader.readAsText(file);input.value='';
}

// ─── PROGRAM MODULE — Phase 1: Delta-V Engine ───────────────────────
// Pure JS, no UI. Band View and Node Map: Phases 7 and 8.

// ── Body constants ─────────────────────────────────────────────────────────
const PROG_BODIES = {
  Earth: { mu: 398600.4418, R: 6371.0  },   // km³/s², km
  Moon:  { mu:   4902.800,  R: 1737.4  },
  Mars:  { mu:  42828.375,  R: 3389.5  },
  Venus: { mu: 324858.592,  R: 6051.8  },
};
const PROG_MU_SUN       = 1.32712440018e11; // km³/s² — heliocentric
const PROG_HELIO_R      = {                  // km — mean orbital radii
  Earth: 149597870.7,
  Mars:  227939200,
  Venus: 108208930,
};
const PROG_MOON_ORBIT_R = 384400; // km — Moon orbital radius from Earth centre

// ── Propellant type registry ────────────────────────────────────────────────
const PROG_PROPELLANT_TYPES = {
  LOX_LH2:  { boiloff_rate: 0.0030, label: 'LOX/LH2',         cryo: true      },
  LOX_RP1:  { boiloff_rate: 0.0002, label: 'LOX/RP-1',        cryo: 'partial' },
  LOX_CH4:  { boiloff_rate: 0.0010, label: 'LOX/Methane',      cryo: true      },
  NTO_A50:  { boiloff_rate: 0.0000, label: 'NTO/Aerozine-50',  cryo: false     },
  NTO_UDMH: { boiloff_rate: 0.0000, label: 'NTO/UDMH',         cryo: false     },
  SOLID:    { boiloff_rate: 0.0000, label: 'Solid',             cryo: false     },
};

// ── OrbitalState ──────────────────────────────────────────────────────────────
/**
 * Create an OrbitalState (spec §3.8).
 * For circular orbits apogee === perigee === alt_km.
 * surface is inferred true when alt_km === 0.
 */
function progMakeOrbitalState(body, alt_km, inc_deg, lan_deg) {
  return {
    body,
    apogee:      alt_km  ?? 0,
    perigee:     alt_km  ?? 0,
    inclination: inc_deg ?? 0,
    lan:         lan_deg ?? 0,
    epoch:       0,                        // T+ seconds; set by event engine
    surface:     (alt_km ?? 0) === 0,
  };
}

/** Surface OrbitalState shorthand. */
function progMakeSurfaceState(body) {
  return progMakeOrbitalState(body, 0, 0, 0);
}

/** True if two OrbitalStates are close enough to dock (Rule 3). */
function progOrbitalStateMatch(a, b) {
  return a.body === b.body &&
    Math.abs((a.apogee      ?? 0) - (b.apogee      ?? 0)) < 1 &&
    Math.abs((a.perigee     ?? 0) - (b.perigee     ?? 0)) < 1 &&
    Math.abs((a.inclination ?? 0) - (b.inclination ?? 0)) < 0.1 &&
    Math.abs((a.lan         ?? 0) - (b.lan         ?? 0)) < 1;
}

// ── Core ΔV functions ───────────────────────────────────────────────────────

/** Circular orbital speed at altitude, km/s. */
function progVcirc(body, alt_km) {
  const b = PROG_BODIES[body];
  return Math.sqrt(b.mu / (b.R + alt_km));
}

/** Hohmann transfer ΔVs between two circular orbits.
 *  Returns { dv1_ms, dv2_ms, total_ms } in m/s. */
function progDvHohmann(body, alt1_km, alt2_km) {
  const b  = PROG_BODIES[body];
  const r1 = b.R + alt1_km, r2 = b.R + alt2_km;
  const a  = (r1 + r2) / 2;
  const v1 = Math.sqrt(b.mu / r1);
  const v2 = Math.sqrt(b.mu / r2);
  const vp = Math.sqrt(b.mu * (2/r1 - 1/a));
  const va = Math.sqrt(b.mu * (2/r2 - 1/a));
  const dv1 = Math.abs(vp - v1) * 1000;
  const dv2 = Math.abs(v2 - va) * 1000;
  return { dv1_ms: dv1, dv2_ms: dv2, total_ms: dv1 + dv2 };
}

/** Simple plane change ΔV at a circular orbit, m/s. */
function progDvPlaneChange(body, alt_km, delta_inc_deg) {
  const v     = progVcirc(body, alt_km);
  const theta = delta_inc_deg * Math.PI / 180;
  return 2 * v * Math.sin(theta / 2) * 1000;
}

/** Combined plane change + propulsive burn (vector addition), m/s. */
function progDvCombined(body, alt_km, delta_inc_deg, dv_prop_ms) {
  const dv_plane = progDvPlaneChange(body, alt_km, delta_inc_deg);
  return Math.sqrt(dv_plane * dv_plane + dv_prop_ms * dv_prop_ms);
}

/**
 * Full plane change ΔV including both inclination and LAN change, m/s.
 * Uses spherical law of cosines to compute the angle between two orbit planes:
 *   cos(θ) = cos(i1)·cos(i2) + sin(i1)·sin(i2)·cos(ΔLAN)
 * This generalises progDvPlaneChange (which only handles Δinclination).
 * ΔLAN = 0 → reduces exactly to progDvPlaneChange(body, alt, |i2-i1|).
 */
function progDvPlaneChangeFull(body, alt_km, i1_deg, lan1_deg, i2_deg, lan2_deg) {
  const i1   = i1_deg  * Math.PI / 180;
  const i2   = i2_deg  * Math.PI / 180;
  const dlan = (lan2_deg - lan1_deg) * Math.PI / 180;
  const cos_theta = Math.cos(i1)*Math.cos(i2) + Math.sin(i1)*Math.sin(i2)*Math.cos(dlan);
  const theta = Math.acos(Math.max(-1, Math.min(1, cos_theta)));
  const v     = progVcirc(body, alt_km);
  return 2 * v * Math.sin(theta / 2) * 1000;
}

/** Circularize at apoapsis of an elliptical orbit (e.g. GTO → GEO), m/s.
 *  alt_peri_km and alt_apo_km are altitudes above body surface (same convention
 *  as all other progDv* functions). */
function progDvCircularizeAtApo(body, alt_peri_km, alt_apo_km) {
  const b   = PROG_BODIES[body];
  const r_p = b.R + alt_peri_km;
  const r_a = b.R + alt_apo_km;
  const a   = (r_p + r_a) / 2;
  const va  = Math.sqrt(b.mu * (2/r_a - 1/a));
  const vc  = Math.sqrt(b.mu / r_a);
  return Math.abs(vc - va) * 1000;
}

// ── Cis-lunar transfers ───────────────────────────────────────────────────

/** Trans-Lunar Injection ΔV from LEO, m/s.
 *  Models TLI as a Hohmann transfer with apoapsis at the Moon's orbital radius. */
function progDvTLI(leo_alt_km) {
  const mu  = PROG_BODIES.Earth.mu;
  const r1  = PROG_BODIES.Earth.R + leo_alt_km;
  const r_m = PROG_MOON_ORBIT_R;
  const a   = (r1 + r_m) / 2;
  const v_leo  = Math.sqrt(mu / r1);
  const v_peri = Math.sqrt(mu * (2/r1 - 1/a));
  return Math.abs(v_peri - v_leo) * 1000;
}

/** Lunar Orbit Insertion ΔV, m/s.
 *  Computes v_inf at Moon SOI from TLI Hohmann, then LOI burn to LLO.
 *  NOTE: Hohmann model gives ~822 m/s; real Apollo LOI ~900 m/s via
 *  free-return trajectory — known Hohmann-model underestimate. */
function progDvLOI(llo_alt_km, leo_alt_km) {
  const mu_E   = PROG_BODIES.Earth.mu;
  const mu_M   = PROG_BODIES.Moon.mu;
  const r1     = PROG_BODIES.Earth.R + (leo_alt_km ?? 185);
  const r_m    = PROG_MOON_ORBIT_R;
  const a_tli  = (r1 + r_m) / 2;
  const v_moon = Math.sqrt(mu_E / r_m);        // Moon's orbital speed
  const v_apo  = Math.sqrt(mu_E * (2/r_m - 1/a_tli)); // TLI apo speed
  const v_inf  = Math.abs(v_moon - v_apo);     // hyperbolic excess at Moon SOI
  const r_llo  = PROG_BODIES.Moon.R + llo_alt_km;
  const v_hyp  = Math.sqrt(v_inf*v_inf + 2*mu_M/r_llo);
  const v_llo  = Math.sqrt(mu_M / r_llo);
  return Math.abs(v_hyp - v_llo) * 1000;
}

/** Trans-Earth Injection ΔV (symmetric to LOI in Hohmann model), m/s. */
function progDvTEI(llo_alt_km, leo_alt_km) {
  return progDvLOI(llo_alt_km, leo_alt_km);
}

// ── Interplanetary transfers ──────────────────────────────────────────────

/** Trans-Mars Injection ΔV from LEO, m/s. */
function progDvTMI(leo_alt_km) {
  const r_E   = PROG_HELIO_R.Earth;
  const r_M   = PROG_HELIO_R.Mars;
  const a     = (r_E + r_M) / 2;
  const v_E   = Math.sqrt(PROG_MU_SUN / r_E);
  const v_dep = Math.sqrt(PROG_MU_SUN * (2/r_E - 1/a));
  const v_inf = v_dep - v_E;                   // positive: outer planet
  const mu = PROG_BODIES.Earth.mu;
  const r  = PROG_BODIES.Earth.R + leo_alt_km;
  return Math.abs(Math.sqrt(v_inf*v_inf + 2*mu/r) - Math.sqrt(mu/r)) * 1000;
}

/** Mars Orbit Insertion ΔV, m/s. */
function progDvMOI(mco_alt_km) {
  const r_E     = PROG_HELIO_R.Earth;
  const r_M     = PROG_HELIO_R.Mars;
  const a       = (r_E + r_M) / 2;
  const v_M_orb = Math.sqrt(PROG_MU_SUN / r_M);
  const v_apo   = Math.sqrt(PROG_MU_SUN * (2/r_M - 1/a));
  const v_inf   = Math.abs(v_M_orb - v_apo);
  const mu_M  = PROG_BODIES.Mars.mu;
  const r_mco = PROG_BODIES.Mars.R + mco_alt_km;
  return Math.abs(Math.sqrt(v_inf*v_inf + 2*mu_M/r_mco) - Math.sqrt(mu_M/r_mco)) * 1000;
}

/** Trans-Venus Injection ΔV from LEO, m/s. */
function progDvTVI(leo_alt_km) {
  const r_E       = PROG_HELIO_R.Earth;
  const r_V       = PROG_HELIO_R.Venus;
  const a         = (r_E + r_V) / 2;
  const v_E       = Math.sqrt(PROG_MU_SUN / r_E);
  const v_apo_dep = Math.sqrt(PROG_MU_SUN * (2/r_E - 1/a));
  const v_inf     = Math.abs(v_E - v_apo_dep); // Earth faster than apo (inner planet)
  const mu = PROG_BODIES.Earth.mu;
  const r  = PROG_BODIES.Earth.R + leo_alt_km;
  return Math.abs(Math.sqrt(v_inf*v_inf + 2*mu/r) - Math.sqrt(mu/r)) * 1000;
}

/** Venus Orbit Insertion ΔV, m/s. */
function progDvVOI(vco_alt_km) {
  const r_E     = PROG_HELIO_R.Earth;
  const r_V     = PROG_HELIO_R.Venus;
  const a       = (r_E + r_V) / 2;
  const v_V_orb = Math.sqrt(PROG_MU_SUN / r_V);
  const v_peri  = Math.sqrt(PROG_MU_SUN * (2/r_V - 1/a));
  const v_inf   = Math.abs(v_peri - v_V_orb);
  const mu_V  = PROG_BODIES.Venus.mu;
  const r_vco = PROG_BODIES.Venus.R + vco_alt_km;
  return Math.abs(Math.sqrt(v_inf*v_inf + 2*mu_V/r_vco) - Math.sqrt(mu_V/r_vco)) * 1000;
}

// ── Ascent ΔV estimates ───────────────────────────────────────────────────

/** Lunar ascent ΔV, surface to LLO, m/s.
 *  Scaled from 1870 m/s baseline at LLO 100 km. */
function progDvLunarAscent(llo_alt_km) {
  const BASE_DV = 1870;
  const v_ref   = Math.sqrt(PROG_BODIES.Moon.mu / (PROG_BODIES.Moon.R + 100));
  const v_h     = Math.sqrt(PROG_BODIES.Moon.mu / (PROG_BODIES.Moon.R + llo_alt_km));
  return BASE_DV * (v_h / v_ref);
}

/** Mars ascent ΔV, surface to MCO, m/s.
 *  Scaled from 3810 m/s baseline at MCO 400 km. */
function progDvMarsAscent(mco_alt_km) {
  const BASE_DV = 3810;
  const v_ref   = Math.sqrt(PROG_BODIES.Mars.mu / (PROG_BODIES.Mars.R + 400));
  const v_h     = Math.sqrt(PROG_BODIES.Mars.mu / (PROG_BODIES.Mars.R + mco_alt_km));
  return BASE_DV * (v_h / v_ref);
}

// ── Boiloff ──────────────────────────────────────────────────────────────────

/** Propellant remaining after cryo boiloff, kg.
 *  rate_per_day: fractional loss rate (0.003 = 0.3 %/day for LH2 baseline).
 *  insulation_factor: 1.0 = baseline MLI, < 1.0 = better insulation. */
function progBoiloff(fill_kg, rate_per_day, delta_t_days, insulation_factor) {
  return fill_kg * Math.exp(-rate_per_day * (insulation_factor ?? 1) * delta_t_days);
}

// ── Built-in node table (18 nodes) ────────────────────────────────────────
// NodeMapState: { nodeId, label, body, apogee, perigee, inclination, surface, isCustom }
// Extra fields: zone, isTransfer — used by Phase 7/8 rendering.
// apogee/perigee are km altitude from body surface (same convention as OrbitalState).
// Transfer corridor nodes have apogee/perigee = null (heliocentric or injection trajectory).
// EML altitudes are approximate geocentric distances minus Earth radius.
// NRHO: highly elliptical (apogee ~68263 km, periapsis ~1500 km from Moon surface).
const PROG_BUILTIN_NODES = [
  // ── Earth zone ──────────────────────────────────────────────────────────
  { nodeId:'earth-surface', label:'Earth Surface', body:'Earth', apogee:0,       perigee:0,       inclination:0,  surface:true,  isCustom:false, zone:'earth',          isTransfer:false },
  { nodeId:'leo-185',       label:'LEO 185 km',    body:'Earth', apogee:185,     perigee:185,     inclination:0,  surface:false, isCustom:false, zone:'earth',          isTransfer:false },
  { nodeId:'leo-400',       label:'LEO 400 km',    body:'Earth', apogee:400,     perigee:400,     inclination:0,  surface:false, isCustom:false, zone:'earth',          isTransfer:false },
  { nodeId:'gto',           label:'GTO',           body:'Earth', apogee:35786,   perigee:185,     inclination:0,  surface:false, isCustom:false, zone:'earth',          isTransfer:false },
  { nodeId:'geo',           label:'GEO',           body:'Earth', apogee:35786,   perigee:35786,   inclination:0,  surface:false, isCustom:false, zone:'earth',          isTransfer:false },
  { nodeId:'eml1',          label:'EML-1',         body:'Earth', apogee:320000,  perigee:320000,  inclination:0,  surface:false, isCustom:false, zone:'earth',          isTransfer:false },
  { nodeId:'eml2',          label:'EML-2',         body:'Earth', apogee:437000,  perigee:437000,  inclination:0,  surface:false, isCustom:false, zone:'earth',          isTransfer:false },
  // ── Cis-lunar zone ──────────────────────────────────────────────────
  { nodeId:'tli-corridor',  label:'TLI Corridor',  body:'Earth', apogee:378000,  perigee:185,     inclination:0,  surface:false, isCustom:false, zone:'cislunar',       isTransfer:true  },
  { nodeId:'dro',           label:'DRO',           body:'Moon',  apogee:68263,   perigee:68263,   inclination:90, surface:false, isCustom:false, zone:'cislunar',       isTransfer:false },
  { nodeId:'nrho',          label:'NRHO',          body:'Moon',  apogee:68263,   perigee:1500,    inclination:90, surface:false, isCustom:false, zone:'cislunar',       isTransfer:false },
  { nodeId:'llo-100',       label:'LLO 100 km',    body:'Moon',  apogee:100,     perigee:100,     inclination:0,  surface:false, isCustom:false, zone:'cislunar',       isTransfer:false },
  { nodeId:'lunar-surface', label:'Lunar Surface', body:'Moon',  apogee:0,       perigee:0,       inclination:0,  surface:true,  isCustom:false, zone:'cislunar',       isTransfer:false },
  // ── Interplanetary zone ───────────────────────────────────────────
  { nodeId:'mars-transfer',  label:'Mars Transfer', body:'Earth', apogee:null,    perigee:null,    inclination:0,  surface:false, isCustom:false, zone:'interplanetary', isTransfer:true  },
  { nodeId:'mars-orbit-400', label:'MCO 400 km',    body:'Mars',  apogee:400,     perigee:400,     inclination:0,  surface:false, isCustom:false, zone:'interplanetary', isTransfer:false },
  { nodeId:'mars-surface',   label:'Mars Surface',  body:'Mars',  apogee:0,       perigee:0,       inclination:0,  surface:true,  isCustom:false, zone:'interplanetary', isTransfer:false },
  { nodeId:'venus-transfer', label:'Venus Transfer', body:'Earth', apogee:null,    perigee:null,    inclination:0,  surface:false, isCustom:false, zone:'interplanetary', isTransfer:true  },
  { nodeId:'venus-orbit',    label:'VCO 300 km',    body:'Venus', apogee:300,     perigee:300,     inclination:0,  surface:false, isCustom:false, zone:'interplanetary', isTransfer:false },
  { nodeId:'venus-surface',  label:'Venus Surface', body:'Venus', apogee:0,       perigee:0,       inclination:0,  surface:true,  isCustom:false, zone:'interplanetary', isTransfer:false },
];

function progGetNode(id) {
  return PROG_BUILTIN_NODES.find(n => n.nodeId === id) || null;
}

// ── Phase 1 self-tests ────────────────────────────────────────────────────────────
const PROG_TEST_RESULTS = (() => {
  const T = [
    { label:'TLI (LEO 185km)',       fn:()=> progDvTLI(185),                            target:3136, tol:50 },
    { label:'LOI (LLO 100km)',       fn:()=> progDvLOI(100, 185),                       target:822,  tol:20 },
    { label:'TEI (LLO 100km)',       fn:()=> progDvTEI(100, 185),                       target:822,  tol:20 },
    { label:'Hohmann LEO-GEO dv1',  fn:()=> progDvHohmann('Earth',185,35786).dv1_ms,   target:2459, tol:30 },
    { label:'GTO-GEO circularize',  fn:()=> progDvCircularizeAtApo('Earth',185,35786),  target:1481, tol:30 },
    { label:'Plane chg 400km 10deg',fn:()=> progDvPlaneChange('Earth',400,10),          target:1338, tol:20 },
    { label:'TMI (LEO 185km)',       fn:()=> progDvTMI(185),                            target:3620, tol:50 },
    { label:'MOI (MCO 400km)',       fn:()=> progDvMOI(400),                            target:2081, tol:50 },
    { label:'TVI (LEO 185km)',       fn:()=> progDvTVI(185),                            target:3506, tol:50 },
    { label:'Lunar ascent 100km',    fn:()=> progDvLunarAscent(100),                    target:1870, tol:1  },
    { label:'LH2 boiloff 30d',       fn:()=> progBoiloff(10000,0.003,30,1.0),           target:9139, tol:5  },
    { label:'Plane chg full (LAN)',  fn:()=> progDvPlaneChangeFull('Earth',400,28.5,0,28.5,10), target:635, tol:10 },
  ];
  return T.map(t => {
    try {
      const val  = t.fn();
      const pass = Math.abs(val - t.target) <= t.tol;
      return { label:t.label, val:Math.round(val), target:t.target, pass };
    } catch(e) {
      return { label:t.label, val:'ERR', target:t.target, pass:false, err:e.message };
    }
  });
})();

function _progRenderSection(results, label) {
  const pass = results.filter(r => r.pass).length;
  const total = results.length;
  const lines = results.map(r => {
    const icon = r.pass ? '\u2713' : '\u2717';
    const col  = r.pass ? 'var(--accent)' : '#e06c75';
    const valS = typeof r.val === 'number' ? r.val.toLocaleString() : String(r.val);
    const lbl  = r.label.padEnd(24, ' ');
    const val7 = valS.padStart(7, ' ');
    return '<span style="color:' + col + '">' + icon + ' ' + lbl + val7 + '  </span>' +
           '<span style="color:var(--text-dim)">/ ' + r.target.toLocaleString() + ' target</span>';
  });
  const sc = pass === total ? 'var(--accent)' : '#e06c75';
  const hdr = '<span style="color:var(--text-dim);letter-spacing:.1em;">' + label + '</span>';
  return hdr + '\n' + lines.join('\n') +
    '\n<span style="color:' + sc + '">' + label + ': ' + pass + '/' + total + ' passing</span>';
}

function progRenderTestResults() {
  const el = document.getElementById('prog-phase1-results');
  if (!el) return;
  const p1 = _progRenderSection(PROG_TEST_RESULTS,    '// Phase 1 — ΔV Engine');
  const p2 = _progRenderSection(PROG_P2_TEST_RESULTS, '// Phase 2 — Propellant & Boiloff');
  const p3 = _progRenderSection(PROG_P3_TEST_RESULTS, '// Phase 3 — FlightVehicle & Events');
  const p4 = _progRenderSection(PROG_P4_TEST_RESULTS, '// Phase 4 — Interaction & Transfer');
  const p5 = _progRenderSection(PROG_P5_TEST_RESULTS, '// Phase 5 — Pad & Spaceport');
  const p6 = _progRenderSection(PROG_P6_TEST_RESULTS, '// Phase 6 — Pork Chop / Lambert');
  const p7 = _progRenderSection(PROG_P7_TEST_RESULTS, '// Phase 7 — Band View');
  const p8 = _progRenderSection(PROG_P8_TEST_RESULTS, '// Phase 8 — Node Map');
  const p9 = _progRenderSection(PROG_P9_TEST_RESULTS, '// Phase 9 — Spacecraft Editor');
  const p10 = _progRenderSection(PROG_P10_TEST_RESULTS, '// Phase 10 — Save/Load & Closure');
  el.innerHTML = p1 + '\n\n' + p2 + '\n\n' + p3 + '\n\n' + p4 + '\n\n' + p5 + '\n\n' + p6 + '\n\n' + p7 + '\n\n' + p8 + '\n\n' + p9 + '\n\n' + p10;
  const allTests  = [...PROG_TEST_RESULTS, ...PROG_P2_TEST_RESULTS, ...PROG_P3_TEST_RESULTS, ...PROG_P4_TEST_RESULTS, ...PROG_P5_TEST_RESULTS, ...PROG_P6_TEST_RESULTS, ...PROG_P7_TEST_RESULTS, ...PROG_P8_TEST_RESULTS, ...PROG_P9_TEST_RESULTS, ...PROG_P10_TEST_RESULTS];
  const pass = allTests.filter(r => r.pass).length;
  console.log('[Program] Total: ' + pass + '/' + allTests.length + ' tests passing');
  allTests.forEach(r => {
    if (!r.pass) console.warn('[Program] FAIL ' + r.label + ': got ' + r.val + ', target ' + r.target);
  });
}

// ─── PROGRAM MODULE — Phase 2: Propellant & Boiloff ────────────────────────────
//
// Structs: Tank, LiveStage.
// Boiloff runs only during COAST events (Rule 4); not during burns, docking, or assembly.

// ── Tank ─────────────────────────────────────────────────────────────────────

/**
 * Create a Tank. Starts full (fill === capacity).
 * @param {string}  propellantType   - key into PROG_PROPELLANT_TYPES
 * @param {number}  capacity_kg      - maximum propellant mass, kg
 * @param {number}  [insulationFactor=1.0] - 1.0 = baseline MLI, <1.0 = better
 */
function progMakeTank(propellantType, capacity_kg, insulationFactor) {
  return {
    propellantType,
    capacity:         capacity_kg,
    fill:             capacity_kg,      // kg remaining
    insulationFactor: insulationFactor ?? 1.0,
  };
}

/**
 * Apply boiloff to a Tank for one COAST period. Mutates tank.fill.
 * Returns kg lost. Zero for non-cryo propellants.
 */
function progApplyBoiloff(tank, delta_t_days) {
  const pt = PROG_PROPELLANT_TYPES[tank.propellantType];
  if (!pt || pt.boiloff_rate === 0) return 0;
  const remaining = progBoiloff(tank.fill, pt.boiloff_rate, delta_t_days, tank.insulationFactor);
  const lost      = tank.fill - remaining;
  tank.fill       = remaining;
  return lost;
}

/**
 * Apply boiloff to all cryo tanks in a LiveStage for one COAST period.
 * Returns total kg lost across all tanks.
 */
function progApplyStageBoiloff(liveStage, delta_t_days) {
  return liveStage.tanks.reduce((sum, t) => sum + progApplyBoiloff(t, delta_t_days), 0);
}

// ── LiveStage ─────────────────────────────────────────────────────────────

/**
 * Create a live stage instance.
 * @param {string}   stageDefinitionId - ID from the stage library or vehicle JSON
 * @param {Tank[]}   tanks             - array of Tank objects for this stage
 * @param {number}   [crewAboard=0]
 */
function progMakeLiveStage(stageDefinitionId, tanks, crewAboard, dry_mass, isp) {
  return {
    stageDefinitionId,
    dry_mass:   dry_mass  ?? 0,        // kg — structural + engine dry mass
    isp:        isp       ?? 0,        // s  — vacuum Isp; set from stage def at load time
    tanks:      tanks ?? [],
    burnLog:    [],                    // BurnEntry[] appended by progRecordBurn
    status:     'ACTIVE',              // 'ACTIVE' | 'EXPENDED' | 'SEPARATED'
    crewAboard: crewAboard ?? 0,
  };
}

/**
 * Record a completed BURN event on a stage. Appends to burnLog.
 * @param {object} liveStage
 * @param {string} eventId        - event UUID from the timeline
 * @param {number} dvActual_ms    - ΔV actually delivered, m/s
 * @param {number} propUsed_kg    - propellant consumed, kg
 * @param {number} [t_start=0]   - mission clock, seconds
 * @param {number} [t_end=0]     - mission clock, seconds
 */
function progRecordBurn(liveStage, eventId, dvActual_ms, propUsed_kg, t_start, t_end) {
  liveStage.burnLog.push({
    eventId,
    dvActual_ms,
    propUsed_kg,
    t_start: t_start ?? 0,
    t_end:   t_end   ?? 0,
  });
}

/**
 * Drain propUsed_kg from the stage's tanks in order.
 * Returns kg actually drained (may be less if tanks run dry).
 * Note: Phase 3 will handle mixture ratios and mid-burn separation.
 */
function progBurnPropellant(liveStage, propUsed_kg) {
  let remaining = propUsed_kg;
  for (const tank of liveStage.tanks) {
    if (remaining <= 0) break;
    const drain = Math.min(tank.fill, remaining);
    tank.fill  -= drain;
    remaining  -= drain;
  }
  return propUsed_kg - remaining;
}

/** Total propellant remaining across all tanks in a stage, kg. */
function progStageRemainingProp(liveStage) {
  return liveStage.tanks.reduce((sum, t) => sum + t.fill, 0);
}

/** Total propellant capacity of a stage, kg (sum of all tank capacities). */
function progStageTotalCapacity(liveStage) {
  return liveStage.tanks.reduce((sum, t) => sum + t.capacity, 0);
}

/** Propellant load fraction for a stage (0 = empty, 1 = full). */
function progStageFillFraction(liveStage) {
  const cap = progStageTotalCapacity(liveStage);
  return cap > 0 ? progStageRemainingProp(liveStage) / cap : 0;
}

// ── Phase 2 self-tests ────────────────────────────────────────────────────────
const PROG_P2_TEST_RESULTS = (() => {
  // T1: Tank starts full
  const tk1 = progMakeTank('LOX_LH2', 50000, 1.0);

  // T2/T3: Boiloff on cryo tank
  const tk2      = progMakeTank('LOX_LH2', 100000, 1.0);
  const lh2_lost = progApplyBoiloff(tk2, 30);   // mutates tk2.fill

  // T4: Non-cryo tank unchanged
  const tk3      = progMakeTank('NTO_UDMH', 50000, 1.0);
  const nto_lost = progApplyBoiloff(tk3, 30);

  // T5: LOX_RP1 partial cryo (spec rate: 0.0002/day)
  const tk4 = progMakeTank('LOX_RP1', 50000, 1.0);
  progApplyBoiloff(tk4, 10);

  // T6/T7: burnLog tracking
  const stg1      = progMakeLiveStage('J-2', [progMakeTank('LOX_LH2', 75000, 1.0)], 0);
  const pre_burns = stg1.burnLog.length;        // 0, captured before
  progRecordBurn(stg1, 'e1', 3136, 15000, 0, 360);
  progRecordBurn(stg1, 'e2',  822,  4500, 7200, 7560);
  const post_burns = stg1.burnLog.length;       // 2, captured after

  // T8: BurnPropellant drains tank
  const stg2 = progMakeLiveStage('RL10', [progMakeTank('LOX_LH2', 10000, 1.0)]);
  progBurnPropellant(stg2, 3000);

  // T9: StageRemainingProp sums tanks
  const stg3 = progMakeLiveStage('AJ10', [
    progMakeTank('NTO_A50', 7000, 1.0),
    progMakeTank('NTO_A50', 5000, 1.0),
  ]);

  const T = [
    { label:'Tank fill init',         val: tk1.fill,                        target: 50000, tol: 0 },
    { label:'LH2 30d boiloff lost',   val: Math.round(lh2_lost),            target: 8607,  tol: 5 },
    { label:'LH2 30d fill remain',    val: Math.round(tk2.fill),            target: 91393, tol: 5 },
    { label:'NTO no boiloff',         val: nto_lost,                        target: 0,     tol: 0 },
    { label:'LOX-RP1 10d fill',       val: Math.round(tk4.fill),            target: 49900, tol: 2 },
    { label:'BurnLog pre-burn len',   val: pre_burns,                       target: 0,     tol: 0 },
    { label:'BurnLog post-2-burns',   val: post_burns,                      target: 2,     tol: 0 },
    { label:'BurnProp drain',         val: stg2.tanks[0].fill,              target: 7000,  tol: 0 },
    { label:'RemainingProp sum',      val: progStageRemainingProp(stg3),    target: 12000, tol: 0 },
  ];
  return T.map(t => {
    const pass = Math.abs(t.val - t.target) <= t.tol;
    return { label: t.label, val: t.val, target: t.target, pass };
  });
})();

// ─── PROGRAM MODULE — Phase 3: FlightVehicle & Event Engine ──────────────────
//
// Structs: FlightVehicle, Event envelope.
// Executors: LAUNCH, BURN, SEPARATE, COAST, EXPEND.
// A BURN fires exactly one stage. Nothing expends automatically (Rules 2 & 4).

// ── Helpers ───────────────────────────────────────────────────────────────────
function progUUID() {
  return 'p' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-5);
}

const PROG_VEHICLE_COLORS = [
  '#61afef','#e5c07b','#98c379','#c678dd','#e06c75','#56b6c2','#d19a66','#be5046',
];
let _progColorIdx = 0;

// ── FlightVehicle ─────────────────────────────────────────────────────────────
function progMakeFlightVehicle(name, stages, orbitState, color) {
  return {
    vehicleId:       progUUID(),
    name:            name  ?? 'Vehicle',
    color:           color ?? PROG_VEHICLE_COLORS[_progColorIdx++ % PROG_VEHICLE_COLORS.length],
    stages:          stages ?? [],      // LiveStage[], bottom → top
    orbitState:      orbitState ?? null,
    status:          'PRELAUNCH',       // PRELAUNCH | ASCENT | ORBIT | TRANSFER | LANDED | EXPENDED
    parentVehicleId: null,
  };
}

/** Total mass of one live stage (dry + propellant remaining), kg. */
function progStageMass(liveStage) {
  return (liveStage.dry_mass ?? 0) + progStageRemainingProp(liveStage);
}

/** Total wet mass of a FlightVehicle (all stages), kg. */
function progVehicleTotalMass(fv) {
  return fv.stages.reduce((sum, s) => sum + progStageMass(s), 0);
}

// ── Rocket equation ───────────────────────────────────────────────────────────
const PROG_G0 = 9.80665; // m/s²

/** ΔV delivered by burning m_prop_consumed kg from wet mass m_wet, m/s. */
function progRocketEqDv(m_wet, m_prop_consumed, isp) {
  const m_final = m_wet - m_prop_consumed;
  if (m_wet <= 0 || m_final <= 0 || isp <= 0) return 0;
  return isp * PROG_G0 * Math.log(m_wet / m_final);
}

/** Propellant mass needed to deliver dv_ms from wet mass m_wet, kg. */
function progRocketEqPropNeeded(m_wet, dv_ms, isp) {
  if (isp <= 0 || m_wet <= 0) return 0;
  return m_wet * (1 - Math.exp(-dv_ms / (isp * PROG_G0)));
}

// ── Event factory ─────────────────────────────────────────────────────────────
function progMakeEvent(type, fields) {
  const ev = {
    eventId:   progUUID(),
    type,
    label:     type,
    vehicleId: null,
    tStart:    0,
    tEnd:      0,
    deltaV:    0,
    dvBudget:  {},
    fromNode:  null,
    toNode:    null,
    result:    'PENDING',
    warnings:  [],
  };
  return Object.assign(ev, fields);
}

// ── Program container ─────────────────────────────────────────────────────────
function progMakeProgram(name) {
  return {
    programId:             progUUID(),
    name:                  name ?? 'Untitled Program',
    missionClock:          0,        // T+ seconds; only COAST and LAUNCH advance this
    vehicles:              {},       // vehicleId → FlightVehicle (Phase 3+)
    pads:                  [],       // Pad[] (spec §3.2)
    vehicleDefinitions:    [],       // loaded LV Calculator .json files (spec §3.3; Phase 10)
    spacecraftDefinitions: [],       // SpacecraftDefinition[] (spec §3.4; Phase 9)
    events:                [],       // ordered event list (Phase 7 owns rendering)
    nodeMapCustomNodes:    [],       // user-added nodes (Phase 8)
    performanceCases:      [],       // archived perf cases (Phase 10)
    warnings:              [],
  };
}

// ── Event executors ───────────────────────────────────────────────────────────

/**
 * LAUNCH: creates a FlightVehicle at the target orbit and adds it to the program.
 * event.stages     — LiveStage[] for the initial stack (upper stage + spacecraft)
 * event.targetOrbit — { body, alt_km, inc_deg, lan_deg }
 * event.ascent_duration_s — defaults to 600
 */
function progExecLaunch(program, event) {
  const o = event.targetOrbit ?? {};
  const orbit = progMakeOrbitalState(o.body ?? 'Earth', o.alt_km ?? 185, o.inc_deg ?? 0, o.lan_deg ?? 0);
  // Resolve spacecraft stages: LV stages (bottom) + spacecraft stages (top)
  let launchStages = event.stages ? [...event.stages] : [];
  if (event.spacecraftId && program.spacecraftDefinitions?.length) {
    const scd = program.spacecraftDefinitions.find(s => s.spacecraftId === event.spacecraftId);
    if (scd) launchStages = [...launchStages, ...progSpacecraftToLiveStages(scd)];
  }
  const fv = progMakeFlightVehicle(event.label ?? 'Vehicle', launchStages, orbit, event.color ?? null);
  fv.status = 'ORBIT';
  program.vehicles[fv.vehicleId] = fv;
  event.vehicleId = fv.vehicleId;
  event.tEnd      = (event.tStart ?? 0) + (event.ascent_duration_s ?? 600);
  event.result    = 'SUCCESS';
  return { result: 'SUCCESS', vehicleId: fv.vehicleId };
}

/**
 * BURN: fires exactly one stage. Consumes propellant via rocket equation.
 * event.stagingStageId    — stageDefinitionId of firing stage; null = bottom of stack
 * event.burnType          — 'HOHMANN'|'TLI'|'LOI'|'TMI'|'MOI'|'TVI'|'VOI'|'CIRC'|
 *                           'PLANE_CHANGE'|'COMBINED'|'PARTIAL'|…
 * event.dvTarget          — target ΔV in m/s (ignored for PARTIAL)
 * event.propStopThreshold — for PARTIAL: fraction remaining when burn halts (0–1)
 * event.toNode            — NodeMapId; updates orbitState if non-transfer node
 */
function progExecBurn(program, event) {
  const fv = program.vehicles[event.vehicleId];
  if (!fv) {
    event.result = 'FAILED';
    event.warnings = ['Vehicle not found: ' + event.vehicleId];
    return { result: 'FAILED' };
  }

  const stageIdx = (event.stagingStageId != null)
    ? fv.stages.findIndex(s => s.stageDefinitionId === event.stagingStageId)
    : 0;
  if (stageIdx < 0) {
    event.result = 'FAILED';
    event.warnings = ['Firing stage not found: ' + event.stagingStageId];
    return { result: 'FAILED' };
  }

  const fs        = fv.stages[stageIdx];
  const isp       = fs.isp ?? 0;
  const m_wet     = progVehicleTotalMass(fv);
  const prop_avail = progStageRemainingProp(fs);
  const warnings  = [];

  let prop_to_burn, dv_actual, result;

  if (event.burnType === 'PARTIAL' && event.propStopThreshold != null) {
    prop_to_burn = prop_avail * (1 - event.propStopThreshold);
    dv_actual    = progRocketEqDv(m_wet, prop_to_burn, isp);
    result       = 'SUCCESS';
  } else {
    const dv_target   = event.dvTarget ?? 0;
    const prop_needed = progRocketEqPropNeeded(m_wet, dv_target, isp);
    if (prop_needed > prop_avail) {
      prop_to_burn = prop_avail;
      dv_actual    = progRocketEqDv(m_wet, prop_to_burn, isp);
      result       = 'MARGINAL';
      warnings.push('\u26a0 Insufficient prop: delivered ' + Math.round(dv_actual) + ' m/s vs ' + Math.round(dv_target) + ' m/s target');
    } else {
      prop_to_burn = prop_needed;
      dv_actual    = dv_target;
      result       = 'SUCCESS';
    }
  }

  progBurnPropellant(fs, prop_to_burn);
  progRecordBurn(fs, event.eventId, dv_actual, prop_to_burn, event.tStart ?? 0, event.tEnd ?? event.tStart ?? 0);

  event.deltaV   = dv_actual;
  event.result   = result;
  event.warnings = warnings;

  // Update orbital state if toNode resolves to a non-transfer node
  if (event.toNode) {
    const node = progGetNode(event.toNode);
    if (node && !node.isTransfer) {
      if (node.surface) {
        fv.orbitState = progMakeSurfaceState(node.body);
        fv.status = 'LANDED';
      } else if (node.apogee != null) {
        // Preserve vehicle inclination/LAN; update body + altitude from node
        fv.orbitState = {
          body:        node.body,
          apogee:      node.apogee,
          perigee:     node.perigee ?? node.apogee,
          inclination: fv.orbitState?.inclination ?? 0,
          lan:         fv.orbitState?.lan ?? 0,
          epoch:       0,
          surface:     false,
        };
        fv.status = 'ORBIT';
      }
    }
  }
  return { result, dv_actual, prop_consumed: prop_to_burn, warnings };
}

/**
 * SEPARATE: splits a FlightVehicle at separationIndex.
 * Lower portion = stages[0 .. separationIndex-1], upper = stages[separationIndex ..].
 * Neither is auto-expended (Rule 2). Both inherit the parent's orbitState.
 */
function progExecSeparate(program, event) {
  const fv = program.vehicles[event.vehicleId];
  if (!fv) { event.result = 'FAILED'; return { result: 'FAILED', warnings: ['Vehicle not found'] }; }

  const idx = event.separationIndex ?? 1;
  if (idx <= 0 || idx >= fv.stages.length) {
    event.result = 'FAILED';
    return { result: 'FAILED', warnings: ['Invalid separationIndex: ' + idx + ' for stack of ' + fv.stages.length] };
  }

  const fvL = progMakeFlightVehicle(fv.name + '-L', fv.stages.slice(0, idx),  fv.orbitState, fv.color);
  const fvU = progMakeFlightVehicle(fv.name + '-U', fv.stages.slice(idx),      fv.orbitState, null);
  fvL.status = fvU.status = fv.status;
  fvL.parentVehicleId = fvU.parentVehicleId = fv.vehicleId;

  delete program.vehicles[fv.vehicleId];
  program.vehicles[fvL.vehicleId] = fvL;
  program.vehicles[fvU.vehicleId] = fvU;

  event.result = 'SUCCESS'; event.warnings = [];
  return { result: 'SUCCESS', lowerVehicleId: fvL.vehicleId, upperVehicleId: fvU.vehicleId };
}

/**
 * COAST: advances mission clock and applies boiloff to all cryo tanks.
 * event.vehicleId — specific vehicle or 'ALL' (default)
 * event.duration_s — coast duration in seconds
 */
function progExecCoast(program, event) {
  const dur_s    = event.duration_s ?? 0;
  const dur_days = dur_s / 86400;

  const ids = (!event.vehicleId || event.vehicleId === 'ALL')
    ? Object.keys(program.vehicles)
    : [event.vehicleId];

  ids.forEach(vid => {
    const v = program.vehicles[vid];
    if (v && v.status !== 'EXPENDED') v.stages.forEach(s => progApplyStageBoiloff(s, dur_days));
  });

  program.missionClock += dur_s;
  event.tEnd   = (event.tStart ?? 0) + dur_s;
  event.result = 'SUCCESS'; event.warnings = [];
  return { result: 'SUCCESS' };
}

/**
 * EXPEND: explicitly marks a FlightVehicle as expended (Rule 2 — user-initiated only).
 */
function progExecExpend(program, event) {
  const fv = program.vehicles[event.vehicleId];
  if (!fv) { event.result = 'FAILED'; return { result: 'FAILED', warnings: ['Vehicle not found'] }; }
  fv.status    = 'EXPENDED';
  event.result = 'SUCCESS'; event.warnings = [];
  return { result: 'SUCCESS' };
}

/** Dispatch an event to the appropriate executor. */
function progDispatchEvent(program, event) {
  switch (event.type) {
    case 'LAUNCH':               return progExecLaunch(program, event);
    case 'BURN':                 return progExecBurn(program, event);
    case 'SEPARATE':             return progExecSeparate(program, event);
    case 'COAST':                return progExecCoast(program, event);
    case 'EXPEND':               return progExecExpend(program, event);
    case 'DOCK':                 return progExecDock(program, event);
    case 'TRANSFER_PROPELLANT':  return progExecTransferPropellant(program, event);
    case 'TRANSFER_CREW':        return progExecTransferCrew(program, event);
    case 'TRANSFER_STAGE':       return progExecTransferStage(program, event);
    case 'LAND':                 return progExecLand(program, event);
    case 'ASCENT_SURFACE':       return progExecAscentSurface(program, event);
    case 'RECONFIGURE':          return progExecReconfigure(program, event);
    default: return { result: 'FAILED', warnings: ['Unknown event type: ' + event.type] };
  }
}

// ── Phase 3 self-tests ────────────────────────────────────────────────────────
const PROG_P3_TEST_RESULTS = (() => {
  // T1/T2: Rocket equation round-trip
  const prop500 = progRocketEqPropNeeded(100000, 500, 421);
  const dv_rt   = progRocketEqDv(100000, prop500, 421);

  // T3: FlightVehicle stage count
  const fv3 = progMakeFlightVehicle('3-Stage', [
    progMakeLiveStage('S1', [], 0, 500,  350),
    progMakeLiveStage('S2', [], 0, 1200, 421),
    progMakeLiveStage('S3', [], 0, 800,  320),
  ], null, '#61afef');

  // T4: LAUNCH creates vehicle in program
  const pLaunch = progMakeProgram('Launch Test');
  const eLaunch = progMakeEvent('LAUNCH', {
    label: 'SaturnV', targetOrbit: { body:'Earth', alt_km:185, inc_deg:28.5, lan_deg:0 },
    stages: [progMakeLiveStage('S-IVB', [progMakeTank('LOX_LH2', 40000)], 0, 13300, 421)],
    ascent_duration_s: 660,
  });
  progDispatchEvent(pLaunch, eLaunch);

  // T5/T6: BURN — prop consumed & SUCCESS result
  const pBurn = progMakeProgram('Burn Test');
  const bFV   = progMakeFlightVehicle('TLI-Stack', [
    progMakeLiveStage('S-IVB-TLI', [progMakeTank('LOX_LH2', 50000)], 0, 1000, 421),
  ], progMakeOrbitalState('Earth', 185, 28.5, 0), '#98c379');
  bFV.status = 'ORBIT';
  pBurn.vehicles[bFV.vehicleId] = bFV;

  const eBurn = progMakeEvent('BURN', {
    vehicleId: bFV.vehicleId, burnType: 'TLI', dvTarget: 3136, toNode: 'tli-corridor',
  });
  const bRes = progDispatchEvent(pBurn, eBurn);

  // T7: BURN MARGINAL (impossible dvTarget)
  const pMarg = progMakeProgram('Marginal Test');
  const mFV   = progMakeFlightVehicle('Marginal', [
    progMakeLiveStage('Stage', [progMakeTank('LOX_LH2', 50000)], 0, 1000, 421),
  ], null, null);
  mFV.status = 'ORBIT';
  pMarg.vehicles[mFV.vehicleId] = mFV;
  const eMarg = progMakeEvent('BURN', { vehicleId: mFV.vehicleId, burnType: 'HOHMANN', dvTarget: 20000 });
  const mRes  = progDispatchEvent(pMarg, eMarg);

  // T8/T9: SEPARATE creates 2 vehicles, lower has 1 stage
  const pSep = progMakeProgram('Separate Test');
  const sFV  = progMakeFlightVehicle('3-Stack', [
    progMakeLiveStage('Bot', [], 0, 10000, 300),
    progMakeLiveStage('Mid', [], 0, 5000,  421),
    progMakeLiveStage('Top', [], 0, 3000,  320),
  ], null, null);
  pSep.vehicles[sFV.vehicleId] = sFV;
  const eSep = progMakeEvent('SEPARATE', { vehicleId: sFV.vehicleId, separationIndex: 1 });
  progDispatchEvent(pSep, eSep);
  const sepVehicles = Object.values(pSep.vehicles);
  const sepLower    = sepVehicles.find(v => v.stages.length === 1);

  // T10: COAST applies boiloff
  const pCoast = progMakeProgram('Coast Test');
  const cFV    = progMakeFlightVehicle('Cryo', [
    progMakeLiveStage('CryoStage', [progMakeTank('LOX_LH2', 100000, 1.0)], 0, 5000, 421),
  ], null, null);
  cFV.status = 'ORBIT';
  pCoast.vehicles[cFV.vehicleId] = cFV;
  progDispatchEvent(pCoast, progMakeEvent('COAST', { vehicleId: cFV.vehicleId, duration_s: 30*86400 }));

  // T11: EXPEND sets status
  const pExp = progMakeProgram('Expend Test');
  const eFV  = progMakeFlightVehicle('ToExpend', [], null, null);
  eFV.status = 'ORBIT';
  pExp.vehicles[eFV.vehicleId] = eFV;
  progDispatchEvent(pExp, progMakeEvent('EXPEND', { vehicleId: eFV.vehicleId }));

  const T = [
    { label:'Rocket eq prop needed',   val: Math.round(prop500),                                      target: 11406, tol: 50  },
    { label:'Rocket eq dv roundtrip',  val: Math.round(dv_rt),                                        target: 500,   tol: 2   },
    { label:'FV stage count',          val: fv3.stages.length,                                        target: 3,     tol: 0   },
    { label:'LAUNCH vehicle in prog',  val: Object.keys(pLaunch.vehicles).length,                     target: 1,     tol: 0   },
    { label:'BURN tank fill after',    val: Math.round(bFV.stages[0].tanks[0].fill),                  target: 22861, tol: 100 },
    { label:'BURN result SUCCESS',     val: bRes.result === 'SUCCESS'  ? 1 : 0,                        target: 1,     tol: 0   },
    { label:'BURN MARGINAL result',    val: mRes.result === 'MARGINAL' ? 1 : 0,                        target: 1,     tol: 0   },
    { label:'SEPARATE vehicle count',  val: Object.keys(pSep.vehicles).length,                        target: 2,     tol: 0   },
    { label:'SEPARATE lower 1 stage',  val: sepLower ? sepLower.stages.length : -1,                   target: 1,     tol: 0   },
    { label:'COAST boiloff fill',      val: Math.round(cFV.stages[0].tanks[0].fill),                  target: 91393, tol: 5   },
    { label:'EXPEND sets status',      val: eFV.status === 'EXPENDED'  ? 1 : 0,                        target: 1,     tol: 0   },
  ];
  return T.map(t => {
    const pass = Math.abs(t.val - t.target) <= t.tol;
    return { label: t.label, val: t.val, target: t.target, pass };
  });
})();

// ─── PROGRAM MODULE — Phase 4: Interaction & Transfer Events ─────────────────
//
// DOCK, TRANSFER_PROPELLANT, TRANSFER_CREW, TRANSFER_STAGE, LAND,
// ASCENT_SURFACE, RECONFIGURE.
//
// Key rule: LAND is zero ΔV / zero prop (Rule 5). Powered descent prop is
// consumed by preceding BURN events. ASCENT_SURFACE DOES consume prop (not
// in Rule 5's exclusion list).

/** DOCK: merge two FlightVehicles that share the same OrbitalState (Rule 3).
 *  event.vehicleIds     = [id1, id2]
 *  event.bottomVehicleId = which vehicle's stages form the lower portion (default: vehicleIds[0])
 *
 *  Both source vehicles are removed from program.vehicles.
 *  A new merged FlightVehicle is created and added.
 */
function progExecDock(program, event) {
  const [idA, idB] = event.vehicleIds ?? [];
  const fvA = program.vehicles[idA];
  const fvB = program.vehicles[idB];
  if (!fvA || !fvB) {
    event.result = 'FAILED'; event.warnings = ['One or both vehicles not found'];
    return { result: 'FAILED' };
  }
  if (!progOrbitalStateMatch(fvA.orbitState, fvB.orbitState)) {
    event.result = 'FAILED';
    event.warnings = ['\u26a0 Orbital states do not match — burn to match first'];
    return { result: 'FAILED' };
  }

  // Bottom vehicle goes at stages[0..], other goes on top
  const bottomId = event.bottomVehicleId ?? idA;
  const [bot, top] = bottomId === idA ? [fvA, fvB] : [fvB, fvA];
  const mergedStages = [...bot.stages, ...top.stages];

  const merged = progMakeFlightVehicle(bot.name + '+' + top.name, mergedStages, bot.orbitState, bot.color);
  merged.status = bot.status;

  // Info note if no tunnel-capable port between the docking faces
  const warns = [];
  const botTop  = bot.stages[bot.stages.length - 1];
  const topBot  = top.stages[0];
  if (botTop && !botTop.tunnelCapable && topBot && !topBot.tunnelCapable) {
    warns.push('// No tunnel-capable port at docking face — EVA required for crew transfer');
  }

  delete program.vehicles[idA];
  delete program.vehicles[idB];
  program.vehicles[merged.vehicleId] = merged;

  event.vehicleId = merged.vehicleId;
  event.result = 'SUCCESS'; event.warnings = warns;
  return { result: 'SUCCESS', vehicleId: merged.vehicleId };
}

/** TRANSFER_PROPELLANT: move propellant between stages of the same (merged) vehicle.
 *  Same propellant type only. Zero ΔV, zero clock (Rule 4).
 *  event.vehicleId
 *  event.sourceStageId    stageDefinitionId of source
 *  event.destStageId      stageDefinitionId of dest
 *  event.propellantType
 *  event.mass_kg
 */
function progExecTransferPropellant(program, event) {
  const fv = program.vehicles[event.vehicleId];
  if (!fv) { event.result = 'FAILED'; event.warnings = ['Vehicle not found']; return { result: 'FAILED' }; }

  const src = fv.stages.find(s => s.stageDefinitionId === event.sourceStageId);
  const dst = fv.stages.find(s => s.stageDefinitionId === event.destStageId);
  if (!src || !dst) { event.result = 'FAILED'; event.warnings = ['Stage not found']; return { result: 'FAILED' }; }

  const pt = event.propellantType;
  let to_take = event.mass_kg ?? 0;

  // Drain from source tanks of matching type
  for (const tank of src.tanks) {
    if (tank.propellantType !== pt) continue;
    const drain = Math.min(tank.fill, to_take);
    tank.fill -= drain; to_take -= drain;
    if (to_take <= 0) break;
  }
  const transferred = (event.mass_kg ?? 0) - to_take;

  // Fill into dest tanks of matching type
  let to_fill = transferred;
  for (const tank of dst.tanks) {
    if (tank.propellantType !== pt) continue;
    const space = tank.capacity - tank.fill;
    const fill  = Math.min(space, to_fill);
    tank.fill += fill; to_fill -= fill;
    if (to_fill <= 0) break;
  }

  const warns = [];
  if (to_take > 0) warns.push('\u26a0 Source had less prop than requested: short ' + Math.round(to_take) + ' kg');
  if (to_fill > 0) warns.push('\u26a0 Dest tanks full, ' + Math.round(to_fill) + ' kg could not be received');

  event.result = 'SUCCESS'; event.warnings = warns;
  return { result: 'SUCCESS', transferred_kg: transferred };
}

/** TRANSFER_CREW: move crew between stages of the same (or same-orbit) vehicle.
 *  event.vehicleId
 *  event.sourceStageId   stageDefinitionId
 *  event.destStageId     stageDefinitionId
 *  event.count
 *  event.subtype         'TUNNEL' | 'EVA'  (recorded for fidelity; no cost difference)
 */
function progExecTransferCrew(program, event) {
  const fv = program.vehicles[event.vehicleId];
  if (!fv) { event.result = 'FAILED'; event.warnings = ['Vehicle not found']; return { result: 'FAILED' }; }

  const src = fv.stages.find(s => s.stageDefinitionId === event.sourceStageId);
  const dst = fv.stages.find(s => s.stageDefinitionId === event.destStageId);
  if (!src || !dst) { event.result = 'FAILED'; event.warnings = ['Stage not found']; return { result: 'FAILED' }; }

  const move   = Math.min(src.crewAboard, event.count ?? 0);
  src.crewAboard -= move;
  dst.crewAboard += move;

  const warns = [];
  if (move < (event.count ?? 0)) warns.push('\u26a0 Only ' + move + ' crew available to transfer');

  event.result = 'SUCCESS'; event.warnings = warns;
  return { result: 'SUCCESS', transferred: move };
}

/** TRANSFER_STAGE: tug takes a stage from one vehicle and adds it to another.
 *  Both vehicles must be in the same orbit (post-dock context).
 *  The stage is removed from source and appended to the top of dest's stack.
 *  event.sourceVehicleId
 *  event.destVehicleId
 *  event.stageDefinitionId
 */
function progExecTransferStage(program, event) {
  const src = program.vehicles[event.sourceVehicleId];
  const dst = program.vehicles[event.destVehicleId];
  if (!src || !dst) { event.result = 'FAILED'; event.warnings = ['Vehicle not found']; return { result: 'FAILED' }; }

  const idx = src.stages.findIndex(s => s.stageDefinitionId === event.stageDefinitionId);
  if (idx < 0) { event.result = 'FAILED'; event.warnings = ['Stage not found in source']; return { result: 'FAILED' }; }

  const [stage] = src.stages.splice(idx, 1);
  dst.stages.push(stage);

  event.result = 'SUCCESS'; event.warnings = [];
  return { result: 'SUCCESS' };
}

/** LAND: set vehicle status to LANDED and orbitState to surface.
 *  Zero ΔV, zero propellant consumed (Rule 5).
 *  Powered descent propellant was consumed by preceding BURN events.
 *  event.vehicleId
 *  event.body              body name to land on (falls back to current orbitState.body)
 *  event.aerocapture       boolean — informational flag (no physics difference in Phase 4)
 */
function progExecLand(program, event) {
  const fv = program.vehicles[event.vehicleId];
  if (!fv) { event.result = 'FAILED'; event.warnings = ['Vehicle not found']; return { result: 'FAILED' }; }

  const body = event.body ?? fv.orbitState?.body ?? 'Moon';
  fv.status    = 'LANDED';
  fv.orbitState = progMakeSurfaceState(body);

  const warns = [];
  if (event.aerocapture) warns.push('// Aerocapture — no propellant consumed');

  event.deltaV   = 0;
  event.result   = 'SUCCESS'; event.warnings = warns;
  return { result: 'SUCCESS' };
}

/** ASCENT_SURFACE: ascend from a body surface to a target orbit.
 *  Computes ΔV from body model (progDvLunarAscent / progDvMarsAscent).
 *  Consumes propellant via rocket equation from the firing stage.
 *  event.vehicleId
 *  event.body                body name (falls back to current orbitState.body)
 *  event.targetOrbit         { alt_km, inc_deg, lan_deg }
 *  event.firingStageId       stageDefinitionId of firing stage (default: bottom)
 *  event.dv_override_ms      override body model ΔV (for Venus or custom bodies)
 */
function progExecAscentSurface(program, event) {
  const fv = program.vehicles[event.vehicleId];
  if (!fv || fv.status !== 'LANDED') {
    event.result = 'FAILED'; event.warnings = ['Vehicle not found or not LANDED'];
    return { result: 'FAILED' };
  }

  const body   = event.body ?? fv.orbitState?.body ?? 'Moon';
  const target = event.targetOrbit ?? {};
  const alt    = target.alt_km ?? 100;

  // Determine ascent ΔV from body model
  let dv_target;
  if (event.dv_override_ms != null) {
    dv_target = event.dv_override_ms;
  } else if (body === 'Moon') {
    dv_target = progDvLunarAscent(alt);
  } else if (body === 'Mars') {
    dv_target = progDvMarsAscent(alt);
  } else {
    event.result = 'FAILED'; event.warnings = ['No ascent model for body: ' + body + ' — use dv_override_ms'];
    return { result: 'FAILED' };
  }

  // Fire the specified stage (default: bottom)
  const stageIdx = event.firingStageId
    ? fv.stages.findIndex(s => s.stageDefinitionId === event.firingStageId)
    : 0;
  if (stageIdx < 0) { event.result = 'FAILED'; event.warnings = ['Firing stage not found']; return { result: 'FAILED' }; }

  const fs         = fv.stages[stageIdx];
  const isp        = fs.isp ?? 0;
  const m_wet      = progVehicleTotalMass(fv);
  const prop_avail = progStageRemainingProp(fs);
  const prop_need  = progRocketEqPropNeeded(m_wet, dv_target, isp);

  let dv_actual, result;
  const warns = [];
  if (prop_need > prop_avail) {
    dv_actual = progRocketEqDv(m_wet, prop_avail, isp);
    result    = 'MARGINAL';
    warns.push('\u26a0 Insufficient prop: delivered ' + Math.round(dv_actual) + ' m/s vs ' + Math.round(dv_target) + ' m/s target');
    progBurnPropellant(fs, prop_avail);
  } else {
    dv_actual = dv_target;
    result    = 'SUCCESS';
    progBurnPropellant(fs, prop_need);
  }

  progRecordBurn(fs, event.eventId, dv_actual, Math.min(prop_need, prop_avail), event.tStart ?? 0, event.tEnd ?? 0);

  fv.status    = 'ORBIT';
  fv.orbitState = progMakeOrbitalState(body, alt, target.inc_deg ?? 0, target.lan_deg ?? 0);

  event.deltaV = dv_actual; event.result = result; event.warnings = warns;
  return { result, dv_actual, prop_consumed: Math.min(prop_need, prop_avail) };
}

/** RECONFIGURE: the ONLY event that can reorder the stage stack.
 *  Internally: SEPARATE → RCS BURN → DOCK (not modeled separately here).
 *  event.vehicleId
 *  event.newStageOrder   array of stageDefinitionIds in desired order (same set, reordered)
 *  event.rcs_dv_ms       RCS ΔV for transposition (default 10 m/s, e.g. Apollo LM extraction)
 */
function progExecReconfigure(program, event) {
  const fv = program.vehicles[event.vehicleId];
  if (!fv) { event.result = 'FAILED'; event.warnings = ['Vehicle not found']; return { result: 'FAILED' }; }

  const order = event.newStageOrder ?? [];
  if (order.length !== fv.stages.length) {
    event.result = 'FAILED'; event.warnings = ['newStageOrder length must match current stage count'];
    return { result: 'FAILED' };
  }

  const reordered = order.map(id => fv.stages.find(s => s.stageDefinitionId === id));
  if (reordered.some(s => !s)) {
    event.result = 'FAILED'; event.warnings = ['Unknown stageDefinitionId in newStageOrder'];
    return { result: 'FAILED' };
  }

  fv.stages = reordered;
  event.deltaV   = event.rcs_dv_ms ?? 10;
  event.result   = 'SUCCESS'; event.warnings = [];
  return { result: 'SUCCESS' };
}

// ── Phase 4 self-tests ────────────────────────────────────────────────────────
const PROG_P4_TEST_RESULTS = (() => {
  // Helper: build a fresh program with one vehicle
  function mkProg(stagesA, orbitA) {
    const p  = progMakeProgram('p4-test');
    const fv = progMakeFlightVehicle('FV', stagesA, orbitA, null);
    fv.status = 'ORBIT';
    p.vehicles[fv.vehicleId] = fv;
    return { p, fv };
  }
  const LEO = progMakeOrbitalState('Earth', 185, 28.5, 0);
  const GEO = progMakeOrbitalState('Earth', 35786, 0, 0);

  // T1: DOCK merges stage stacks
  const pDock = progMakeProgram('dock-test');
  const fvA = progMakeFlightVehicle('A', [progMakeLiveStage('A1',[],0,1000,0), progMakeLiveStage('A2',[],0,500,0)], LEO, null);
  const fvB = progMakeFlightVehicle('B', [progMakeLiveStage('B1',[],0,800,0)],  LEO, null);
  fvA.status = fvB.status = 'ORBIT';
  pDock.vehicles[fvA.vehicleId] = fvA; pDock.vehicles[fvB.vehicleId] = fvB;
  const dockEv = progMakeEvent('DOCK', { vehicleIds:[fvA.vehicleId, fvB.vehicleId], bottomVehicleId: fvA.vehicleId });
  const dockRes = progDispatchEvent(pDock, dockEv);
  const mergedFV = pDock.vehicles[dockEv.vehicleId];

  // T2: DOCK fails on orbit mismatch
  const pDock2 = progMakeProgram('dock-fail');
  const fvC = progMakeFlightVehicle('C', [], LEO, null); fvC.status='ORBIT';
  const fvD = progMakeFlightVehicle('D', [], GEO, null); fvD.status='ORBIT';
  pDock2.vehicles[fvC.vehicleId]=fvC; pDock2.vehicles[fvD.vehicleId]=fvD;
  const dockFail = progDispatchEvent(pDock2, progMakeEvent('DOCK',{vehicleIds:[fvC.vehicleId,fvD.vehicleId]}));

  // T3: TRANSFER_PROPELLANT
  const pTP = progMakeProgram('tp-test');
  const tpFV = progMakeFlightVehicle('TP', [
    progMakeLiveStage('SRC', [progMakeTank('LOX_LH2', 50000)], 0, 1000, 421),
    progMakeLiveStage('DST', [progMakeTank('LOX_LH2', 30000)], 0, 500,  421),
  ], LEO, null);
  tpFV.stages[1].tanks[0].fill = 5000; // partial fill on dest
  tpFV.status = 'ORBIT';
  pTP.vehicles[tpFV.vehicleId] = tpFV;
  progDispatchEvent(pTP, progMakeEvent('TRANSFER_PROPELLANT', {
    vehicleId: tpFV.vehicleId, sourceStageId:'SRC', destStageId:'DST',
    propellantType:'LOX_LH2', mass_kg: 10000,
  }));

  // T4: TRANSFER_CREW
  const pTC = progMakeProgram('tc-test');
  const tcFV = progMakeFlightVehicle('TC', [
    progMakeLiveStage('LMascent', [], 2, 2100, 311),  // 2 crew
    progMakeLiveStage('CM',       [], 0, 5800, 0),    // 0 crew
  ], LEO, null);
  tcFV.status = 'ORBIT';
  pTC.vehicles[tcFV.vehicleId] = tcFV;
  progDispatchEvent(pTC, progMakeEvent('TRANSFER_CREW', {
    vehicleId: tcFV.vehicleId, sourceStageId:'LMascent', destStageId:'CM',
    count: 2, subtype: 'TUNNEL',
  }));

  // T5: TRANSFER_STAGE (between two separate vehicles)
  const pTS = progMakeProgram('ts-test');
  const tsSrc = progMakeFlightVehicle('Src', [progMakeLiveStage('TugPayload',[],0,5000,0), progMakeLiveStage('Depot',[],0,10000,0)], LEO, null);
  const tsDst = progMakeFlightVehicle('Tug', [progMakeLiveStage('TugEngine',[],0,2000,445)], LEO, null);
  tsSrc.status = tsDst.status = 'ORBIT';
  pTS.vehicles[tsSrc.vehicleId]=tsSrc; pTS.vehicles[tsDst.vehicleId]=tsDst;
  progDispatchEvent(pTS, progMakeEvent('TRANSFER_STAGE', {
    sourceVehicleId: tsSrc.vehicleId, destVehicleId: tsDst.vehicleId, stageDefinitionId: 'Depot',
  }));

  // T6: LAND — status LANDED, surface orbitState
  const pLand = progMakeProgram('land-test');
  const landFV = progMakeFlightVehicle('LM', [progMakeLiveStage('LMdescent',[],0,2200,311)], progMakeOrbitalState('Moon',100,0,0), null);
  landFV.status = 'ORBIT';
  pLand.vehicles[landFV.vehicleId] = landFV;
  progDispatchEvent(pLand, progMakeEvent('LAND', { vehicleId: landFV.vehicleId, body:'Moon' }));

  // T7: ASCENT_SURFACE — Moon, dv≈1870, status ORBIT
  const pAsc = progMakeProgram('asc-test');
  const ascFV = progMakeFlightVehicle('LM-asc', [progMakeLiveStage('LMasc',[progMakeTank('NTO_A50',2350)],0,2100,311)], progMakeSurfaceState('Moon'), null);
  ascFV.status = 'LANDED';
  pAsc.vehicles[ascFV.vehicleId] = ascFV;
  const ascEv = progMakeEvent('ASCENT_SURFACE', { vehicleId: ascFV.vehicleId, body:'Moon', targetOrbit:{ alt_km:100, inc_deg:0, lan_deg:0 } });
  progDispatchEvent(pAsc, ascEv);

  // T8: RECONFIGURE reorders stack
  const pRc = progMakeProgram('rc-test');
  const rcFV = progMakeFlightVehicle('CSM-LM', [
    progMakeLiveStage('S-IVB',  [], 0, 13300, 421),
    progMakeLiveStage('CSM',    [], 0, 28800, 314),
    progMakeLiveStage('LM',     [], 0, 15000, 311),
  ], LEO, null);
  rcFV.status = 'ORBIT';
  pRc.vehicles[rcFV.vehicleId] = rcFV;
  progDispatchEvent(pRc, progMakeEvent('RECONFIGURE', {
    vehicleId: rcFV.vehicleId, newStageOrder: ['S-IVB', 'LM', 'CSM'],
  }));

  const T = [
    { label:'DOCK merges 2+1 stages',    val: mergedFV ? mergedFV.stages.length : -1,  target: 3,    tol: 0 },
    { label:'DOCK result SUCCESS',        val: dockRes.result==='SUCCESS'?1:0,            target: 1,    tol: 0 },
    { label:'DOCK fail on mismatch',      val: dockFail.result==='FAILED'?1:0,            target: 1,    tol: 0 },
    { label:'XFER PROP source -10000',    val: tpFV.stages[0].tanks[0].fill,              target:40000, tol: 0 },
    { label:'XFER PROP dest +10000',      val: tpFV.stages[1].tanks[0].fill,              target:15000, tol: 0 },
    { label:'XFER CREW moved 2',          val: tcFV.stages[1].crewAboard,                 target: 2,    tol: 0 },
    { label:'XFER STAGE src shrinks',     val: tsSrc.stages.length,                       target: 1,    tol: 0 },
    { label:'XFER STAGE dst grows',       val: tsDst.stages.length,                       target: 2,    tol: 0 },
    { label:'LAND status LANDED',         val: landFV.status==='LANDED'?1:0,              target: 1,    tol: 0 },
    { label:'LAND surface true',          val: landFV.orbitState.surface?1:0,             target: 1,    tol: 0 },
    { label:'ASCENT status ORBIT',        val: ascFV.status==='ORBIT'?1:0,               target: 1,    tol: 0 },
    { label:'ASCENT dv 1870',             val: Math.round(ascEv.deltaV),                  target: 1870, tol: 5 },
    { label:'RECONFIG stage[1] is LM',    val: rcFV.stages[1].stageDefinitionId==='LM'?1:0, target:1,  tol: 0 },
  ];
  return T.map(t => {
    const pass = Math.abs(t.val - t.target) <= t.tol;
    return { label: t.label, val: t.val, target: t.target, pass };
  });
})();

// ─── PROGRAM MODULE — Phase 5: Pad & Spaceport ────────────────────────────────

const PROG_SIDEREAL_DAY_S = 86164.1; // seconds per sidereal day

// ── Pad struct ────────────────────────────────────────────────────────────────

/**
 * Create a launch pad.
 * @param {string} name              e.g. 'LC-39A'
 * @param {string} siteKey           e.g. 'KSC' — matches a key in LAUNCH_SITES
 * @param {number} recycleTimeHours  hours before pad is ready to launch again
 */
function progMakePad(name, shortCode, siteKey, recycleTimeHours) {
  return {
    padId:          progUUID(),
    name,
    shortCode:      shortCode ?? name,  // compact identifier for tight spaces
    siteKey,
    recycleTime:    recycleTimeHours,  // hours
    lastLaunchTime: null,              // T+ seconds; null = never launched (always ready)
  };
}

/**
 * True if the pad is ready to accept a launch at mission clock t_plus_s.
 */
function progPadAvailable(pad, t_plus_s) {
  if (pad.lastLaunchTime == null) return true;
  return progPadRecycleRemaining(pad, t_plus_s) === 0;
}

/**
 * Seconds until the pad is ready. 0 if already available.
 */
function progPadRecycleRemaining(pad, t_plus_s) {
  if (pad.lastLaunchTime == null) return 0;
  const recycle_s    = pad.recycleTime * 3600;
  const available_at = pad.lastLaunchTime + recycle_s;
  return Math.max(0, available_at - t_plus_s);
}

// ── LAN alignment window calculator ──────────────────────────────────────────

/**
 * Compute ascending and descending LAN launch windows.
 *
 * Given a launch site longitude and a target orbit RAAN (LAN), returns the
 * wait time (in seconds from T+0) until the Earth's rotation brings the site's
 * meridian into alignment with the target orbit plane.
 *
 * Math (spec §7.1):
 *   current_raan = (gast_deg + site_lng_deg) mod 360
 *   delta_asc    = (target_lan - current_raan + 360) mod 360
 *   asc_wait_s   = delta_asc / (360 / SIDEREAL_DAY)
 *   desc_wait_s  = asc_wait_s + SIDEREAL_DAY/2  (mod SIDEREAL_DAY)
 *
 * @param {number} site_lng_deg    East longitude of launch site (0–360)
 * @param {number} target_lan_deg  Target orbit RAAN / LAN (0–360)
 * @param {number} [gast_deg=0]    Greenwich Apparent Sidereal Time at T+0 (deg)
 * @returns {{ asc_wait_s: number, desc_wait_s: number }}
 */
function progLanWindow(site_lng_deg, target_lan_deg, gast_deg) {
  const omega        = 360 / PROG_SIDEREAL_DAY_S;        // °/s
  const current_raan = ((gast_deg ?? 0) + site_lng_deg) % 360;
  const delta_asc    = ((target_lan_deg - current_raan) + 360) % 360;
  const asc_wait_s   = delta_asc / omega;
  let   desc_wait_s  = asc_wait_s + PROG_SIDEREAL_DAY_S / 2;
  if (desc_wait_s >= PROG_SIDEREAL_DAY_S) desc_wait_s -= PROG_SIDEREAL_DAY_S;
  return { asc_wait_s, desc_wait_s };
}

/**
 * Launch azimuth(s) from a site for a given target inclination.
 *
 * From spec §7.1: cos(i) = cos(φ) × sin(az)
 * Returns prograde (northeasterly) and retrograde (southeasterly) azimuths in degrees.
 * Returns null if the inclination is impossible from this latitude (|cos(i)/cos(φ)| > 1).
 *
 * @param {number} site_lat_deg  Launch site latitude (deg)
 * @param {number} inc_deg       Target orbit inclination (deg, 0–180)
 * @returns {{ prograde: number, retrograde: number } | null}
 */
function progAzimuthForInclination(site_lat_deg, inc_deg) {
  const cos_i   = Math.cos(inc_deg       * Math.PI / 180);
  const cos_lat = Math.cos(site_lat_deg  * Math.PI / 180);
  if (cos_lat === 0) return null;
  const ratio = cos_i / cos_lat;
  if (Math.abs(ratio) > 1) return null;            // inclination impossible from this site
  const az_prograde   = Math.asin(ratio) * 180 / Math.PI;
  const az_retrograde = 180 - az_prograde;
  return { prograde: az_prograde, retrograde: az_retrograde };
}

// ── Active program state & spaceport panel ─────────────────────────────────────

let PROG_ACTIVE_PROGRAM = null;

function progSetActiveProgram(p) {
  PROG_ACTIVE_PROGRAM = p;
  progRenderSpaceport();
}

/** Format seconds as "Xh Ym" countdown string. */
function _progFmtCountdown(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.ceil((seconds % 3600) / 60);
  return h > 0 ? h + 'h ' + m + 'm' : m + 'm';
}

/** Render the spaceport pad list into #prog-pad-list. */
function progRenderSpaceport() {
  const el = document.getElementById('prog-pad-list');
  if (!el) return;
  const prog = PROG_ACTIVE_PROGRAM;

  if (!prog || !prog.pads || prog.pads.length === 0) {
    el.innerHTML = '<div style="color:var(--text-dim);font-family:var(--mono);font-size:11px;padding:10px 8px;line-height:1.6;">// No pads in\n// active program</div>';
    return;
  }

  const t = prog.missionClock;
  el.innerHTML = prog.pads.map(pad => {
    const avail    = progPadAvailable(pad, t);
    const rem_s    = progPadRecycleRemaining(pad, t);
    const dot      = avail ? '\u25cf' : '\u25cb';
    const dotCol   = avail ? 'var(--accent)' : '#e5c07b';
    const stateTxt = avail ? 'Ready' : '\u23f1 ' + _progFmtCountdown(rem_s);
    const stateCol = avail ? 'var(--accent)' : '#e5c07b';
    return '<div style="padding:6px 8px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:6px;">' +
      '<span style="color:' + dotCol + ';font-size:9px;line-height:22px">' + dot + '</span>' +
      '<div style="min-width:0;flex:1;">' +
        '<div style="font-family:var(--mono);font-size:11px;color:var(--text-bright);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + pad.name + '</div>' +
        '<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);">' + pad.siteKey +
          ' \u00b7 <span style="color:' + stateCol + '">' + stateTxt + '</span></div>' +
      '</div></div>';
  }).join('');
}

// ── Phase 5 self-tests ────────────────────────────────────────────────────────
const PROG_P5_TEST_RESULTS = (() => {
  // T1: Pad creation
  const pad0 = progMakePad('LC-39A', '39A', 'KSC', 72);

  // T2: Pad available after recycle
  const padA = progMakePad('LC-39B', '39B', 'KSC', 72); padA.lastLaunchTime = 0;

  // T3: Pad not available during recycle (12h of 72h elapsed)
  const padB = progMakePad('LC-39C', '39C', 'KSC', 72); padB.lastLaunchTime = 0;

  // T4: Recycle remaining at 12h
  // T5: Fresh pad (null lastLaunchTime) always available

  // T6/T7: LAN window
  const { asc_wait_s, desc_wait_s } = progLanWindow(280, 45, 0);

  // T8/T9: Azimuth for inclination
  const az28  = progAzimuthForInclination(28.5, 28.5);
  const az45  = progAzimuthForInclination(28.5, 45);

  const T = [
    { label:'Pad recycleTime',           val: pad0.recycleTime,                                  target: 72,    tol: 0   },
    { label:'Pad avail after 80h',        val: progPadAvailable(padA, 80*3600) ? 1 : 0,           target: 1,     tol: 0   },
    { label:'Pad recycling at 12h',       val: progPadAvailable(padB, 12*3600) ? 0 : 1,           target: 1,     tol: 0   },
    { label:'Recycle remain 60h',         val: Math.round(progPadRecycleRemaining(padB,12*3600)/3600), target: 60, tol: 0 },
    { label:'Fresh pad available',        val: progPadAvailable(pad0, 0) ? 1 : 0,                 target: 1,     tol: 0   },
    { label:'LAN asc window hrs',         val: Math.round(asc_wait_s  / 3600 * 10) / 10,          target: 8.3,   tol: 0.1 },
    { label:'LAN desc window hrs',        val: Math.round(desc_wait_s / 3600 * 10) / 10,          target: 20.3,  tol: 0.1 },
    { label:'Azimuth inc=lat 90deg',      val: Math.round(az28.prograde),                          target: 90,    tol: 1   },
    { label:'Azimuth inc=45 ~54deg',      val: Math.round(az45.prograde),                          target: 54,    tol: 2   },
  ];
  return T.map(t => ({ label:t.label, val:t.val, target:t.target, pass: Math.abs(t.val-t.target)<=t.tol }));
})();

// ─── PROGRAM MODULE — Phase 6: Pork Chop Plotter ─────────────────────────────
//
// Lambert solver → C3 departure grid → canvas heatmap → click-to-select window.
// Selected window sets PROG_ACTIVE_PROGRAM.launchWindow which drives COAST duration.
//
// Planet model: circular, coplanar ecliptic orbits.
// theta0_rad: phase angle at T=0 calibrated so a Hohmann departure is near day 0.

const PROG_PORK_MU = 1.32712440018e11;   // km³/s² — Sun

// Planet data.  theta0_rad chosen so optimal (Hohmann) departure ≈ T+0.
const PROG_PORK_DATA = {
  Earth: { period_d: 365.256, r_km: 149597870.7, theta0_rad: 0       },
  Mars:  { period_d: 686.971, r_km: 227939200,   theta0_rad: 0.7729  }, // 44.3°
  Venus: { period_d: 224.701, r_km: 108208930,   theta0_rad: 5.3390  }, // 305.9°
};

// ── Stumpff functions ─────────────────────────────────────────────────────────
// C(ψ) = ∫₀¹ cos(√ψ·t) dt-equivalent  |  S(ψ) = ∫₀¹ sin(√ψ·t)/√ψ dt-equivalent
function progStumpffC(psi) {
  if (psi >  1e-6) return (1 - Math.cos(Math.sqrt(psi))) / psi;
  if (psi < -1e-6) return (Math.cosh(Math.sqrt(-psi)) - 1) / (-psi);
  return 0.5;                      // series limit
}
function progStumpffS(psi) {
  if (psi >  1e-6) { const s = Math.sqrt(psi);  return (s - Math.sin(s))       / (s * psi); }
  if (psi < -1e-6) { const s = Math.sqrt(-psi); return (Math.sinh(s) - s)      / (s * (-psi)); }
  return 1/6;                      // series limit
}

// ── Lambert solver (universal variable method, bisection) ─────────────────────
// Algorithm: Universal Variable Method, bisection on ψ.
// Source: Curtis, H. (2013). Orbital Mechanics for Engineering Students, §5.3.
//         Butterworth-Heinemann. The same algorithm is used in
//         EGPAerospace/LambertCalculator (MIT) and is the textbook foundation
//         for Gooding (1990) and Izzo (2015).
// Implementation by Rocket Playground / Anthropic Claude, 2026.
/**
 * Solve Lambert's problem in 2-D heliocentric space (prograde = CCW).
 * Returns { v1:[vx,vy], v2:[vx,vy] } in km/s, or null if degenerate / diverged.
 * @param {[number,number]} r1v  departure pos [x,y] km
 * @param {[number,number]} r2v  arrival pos   [x,y] km
 * @param {number} tof_s         time of flight, seconds
 * @param {number} mu            gravitational parameter km³/s²
 */
function progLambert2D(r1v, r2v, tof_s, mu) {
  const r1  = Math.hypot(r1v[0], r1v[1]);
  const r2  = Math.hypot(r2v[0], r2v[1]);
  const dot = r1v[0]*r2v[0] + r1v[1]*r2v[1];
  const cz  = r1v[0]*r2v[1] - r1v[1]*r2v[0];   // cross-product z

  // Transfer angle (prograde = counter-clockwise in ecliptic plane)
  const dv_raw = Math.acos(Math.max(-1, Math.min(1, dot / (r1 * r2))));
  const dv     = cz >= 0 ? dv_raw : (2*Math.PI - dv_raw);

  // Degenerate: 0° or ≈180° transfer
  if (dv < 1e-4 || Math.abs(dv - Math.PI) < 1e-4) return null;

  const A = Math.sin(dv) * Math.sqrt(r1 * r2 / (1 - Math.cos(dv)));

  let psi_lo = -4 * Math.PI * Math.PI;
  let psi_hi =  4 * Math.PI * Math.PI;
  let psi    = 0;
  let c2     = 0.5;
  let c3     = 1/6;

  for (let k = 0; k < 150; k++) {
    let y = r1 + r2 + A * (psi * c3 - 1) / Math.sqrt(c2);

    // Ensure y stays positive when A > 0
    if (A > 0 && y < 0) {
      psi_lo = psi;
      const psi_next = 0.8 * (1/c3) * (1 - (r1 + r2) * Math.sqrt(c2) / A);
      psi = Math.max(psi_next, psi_lo + 0.1);
      c2  = progStumpffC(psi);
      c3  = progStumpffS(psi);
      continue;
    }
    if (y < 0) return null;

    const chi    = Math.sqrt(y / c2);
    const t_test = (chi*chi*chi * c3 + A * Math.sqrt(y)) / Math.sqrt(mu);

    if (Math.abs(t_test - tof_s) < 1e-6 * tof_s) break;

    if (t_test < tof_s) psi_lo = psi;
    else                psi_hi = psi;

    psi = (psi_lo + psi_hi) / 2;
    c2  = progStumpffC(psi);
    c3  = progStumpffS(psi);
  }

  const y    = r1 + r2 + A * (psi * c3 - 1) / Math.sqrt(c2);
  if (y <= 0) return null;

  const f     = 1 - y / r1;
  const g     = A * Math.sqrt(y / mu);
  const g_dot = 1 - y / r2;
  if (Math.abs(g) < 1e-12) return null;

  return {
    v1: [(r2v[0] - f*r1v[0]) / g,         (r2v[1] - f*r1v[1]) / g],
    v2: [(g_dot*r2v[0] - r1v[0]) / g,     (g_dot*r2v[1] - r1v[1]) / g],
  };
}

// ── Planet state (circular orbit model) ──────────────────────────────────────

/** Heliocentric position [x,y] km at t_days from epoch. */
function progHelioPos(body, t_days) {
  const d = PROG_PORK_DATA[body];
  if (!d) return null;
  const theta = d.theta0_rad + 2*Math.PI * t_days / d.period_d;
  return [d.r_km * Math.cos(theta), d.r_km * Math.sin(theta)];
}

/** Heliocentric velocity [vx,vy] km/s at t_days (tangential, CCW). */
function progHelioVel(body, t_days) {
  const d = PROG_PORK_DATA[body];
  if (!d) return null;
  const theta = d.theta0_rad + 2*Math.PI * t_days / d.period_d;
  const v     = 2*Math.PI * d.r_km / (d.period_d * 86400);
  return [-v * Math.sin(theta), v * Math.cos(theta)];
}

// ── C3 grid computation ───────────────────────────────────────────────────────

/**
 * Departure C3 (km²/s²) for a heliocentric transfer.
 * Returns Infinity if Lambert fails.
 */
function progDepartureC3(dep_body, arr_body, dep_day, tof_day) {
  if (tof_day < 10) return Infinity;
  const r1v = progHelioPos(dep_body, dep_day);
  const r2v = progHelioPos(arr_body, dep_day + tof_day);
  if (!r1v || !r2v) return Infinity;
  const sol = progLambert2D(r1v, r2v, tof_day * 86400, PROG_PORK_MU);
  if (!sol) return Infinity;
  const ve  = progHelioVel(dep_body, dep_day);
  const vix = sol.v1[0] - ve[0];
  const viy = sol.v1[1] - ve[1];
  return vix*vix + viy*viy;
}

/**
 * Compute a C3 pork chop grid.
 * Returns { grid[j][i], dep_days[], tof_days[], c3_min, c3_min_dep, c3_min_tof }
 */
function progPorkchopGrid(dep_body, arr_body, opts) {
  const { dep_start=0, dep_end=800, tof_start=120, tof_end=540, nx=130, ny=80 } = opts ?? {};
  const dep_step = (dep_end - dep_start) / Math.max(nx - 1, 1);
  const tof_step = (tof_end - tof_start) / Math.max(ny - 1, 1);
  const dep_days = Array.from({length: nx}, (_, i) => dep_start + i*dep_step);
  const tof_days = Array.from({length: ny}, (_, j) => tof_start + j*tof_step);
  const grid = [];
  let c3_min = Infinity, c3_min_dep = dep_start, c3_min_tof = tof_start;

  for (let j = 0; j < ny; j++) {
    const row = [];
    for (let i = 0; i < nx; i++) {
      const c3 = progDepartureC3(dep_body, arr_body, dep_days[i], tof_days[j]);
      row.push(c3);
      if (c3 < c3_min) { c3_min = c3; c3_min_dep = dep_days[i]; c3_min_tof = tof_days[j]; }
    }
    grid.push(row);
  }
  return { grid, dep_days, tof_days, dep_step, tof_step, c3_min, c3_min_dep, c3_min_tof, dep_body, arr_body };
}

// ── Canvas rendering ──────────────────────────────────────────────────────────

let PROG_PORKCHOP_STATE = null;   // { result, arrBody, sel: {dep,tof,c3}|null }

/** Map C3 to a CSS colour string (blue=low, red=high, black=Infinity). */
function _progC3Colour(c3, lo, hi) {
  if (!isFinite(c3)) return '#0a0a0a';
  const t   = Math.max(0, Math.min(1, (Math.log(Math.max(c3, lo)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))));
  const hue = Math.round(240 * (1 - t));            // 240=blue, 0=red
  const lgt = Math.round(28 + 22 * (1 - Math.abs(t - 0.5)*2));
  return `hsl(${hue},90%,${lgt}%)`;
}

function progRenderPorkchopCanvas(arrBody) {
  const canvas = document.getElementById('prog-porkchop-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // Show loading
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'var(--panel, #111)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#555';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Computing\u2026', W/2, H/2);

  // Compute in the next tick so the loading state renders first
  setTimeout(() => {
    const opts = arrBody === 'Venus'
      ? { dep_start:0, dep_end:650, tof_start:80,  tof_end:400, nx:130, ny:80 }
      : { dep_start:0, dep_end:800, tof_start:120, tof_end:560, nx:130, ny:80 };
    const result = progPorkchopGrid('Earth', arrBody, opts);
    const nx = result.dep_days.length, ny = result.tof_days.length;
    const c3_lo = result.c3_min;
    const c3_hi = Math.min(c3_lo * 20, 150);
    const pw = W / nx, ph = H / ny;

    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        ctx.fillStyle = _progC3Colour(result.grid[j][i], c3_lo, c3_hi);
        ctx.fillRect(Math.floor(i*pw), Math.floor(j*ph), Math.ceil(pw)+1, Math.ceil(ph)+1);
      }
    }

    // Mark minimum
    const mi = result.dep_days.findIndex(d => Math.abs(d - result.c3_min_dep) <= result.dep_step);
    const mj = result.tof_days.findIndex(t => Math.abs(t - result.c3_min_tof) <= result.tof_step);
    if (mi >= 0 && mj >= 0) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.strokeRect(mi*pw - 4, mj*ph - 4, 8, 8);
    }

    // Axis annotations
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, H - 15, W, 15);
    ctx.fillStyle = '#777';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    const d0 = Math.round(result.dep_days[0]), d1 = Math.round(result.dep_days[nx-1]);
    const t0 = Math.round(result.tof_days[0]), t1 = Math.round(result.tof_days[ny-1]);
    ctx.fillText(`dep: T+${d0}\u2013${d1}d \u2502 tof: ${t0}\u2013${t1}d \u2502 min C3\u2248${result.c3_min.toFixed(1)} km\u00b2/s\u00b2`, 6, H - 4);

    // Save the rendered canvas as base image — restored on each click to remove old markers
    const baseImageData = ctx.getImageData(0, 0, W, H);
    PROG_PORKCHOP_STATE = { result, arrBody, sel: null, W, H, pw, ph, nx, ny, baseImageData };
    progUpdatePorkchopInfo();
  }, 10);
}

function progHandlePorkchopClick(evt) {
  if (!PROG_PORKCHOP_STATE) return;
  const canvas = document.getElementById('prog-porkchop-canvas');
  const rect   = canvas.getBoundingClientRect();
  const { result, W, H, nx, ny } = PROG_PORKCHOP_STATE;
  const i = Math.floor((evt.clientX - rect.left)  / W * nx);
  const j = Math.floor((evt.clientY - rect.top)   / H * ny);
  if (i < 0 || i >= nx || j < 0 || j >= ny) return;

  PROG_PORKCHOP_STATE.sel = {
    dep: result.dep_days[i],
    tof: result.tof_days[j],
    c3:  result.grid[j][i],
  };
  progUpdatePorkchopInfo();

  // Restore clean canvas, then draw single selection marker
  const ctx = canvas.getContext('2d');
  const { pw, ph, baseImageData } = PROG_PORKCHOP_STATE;
  if (baseImageData) ctx.putImageData(baseImageData, 0, 0);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
  ctx.strokeRect(i*pw - 3, j*ph - 3, 6, 6);
}

function progUpdatePorkchopInfo() {
  const el = document.getElementById('prog-porkchop-info');
  if (!el) return;
  if (!PROG_PORKCHOP_STATE) { el.textContent = ''; return; }
  const { sel, arrBody } = PROG_PORKCHOP_STATE;
  if (!sel) {
    el.textContent = '// click to select a launch window';
    return;
  }
  const c3Str = isFinite(sel.c3) ? sel.c3.toFixed(1) : '\u221e';
  el.innerHTML =
    '<span style="color:var(--accent)">T+' + Math.round(sel.dep) + 'd \u2502 TOF ' +
    Math.round(sel.tof) + 'd \u2502 C3 ' + c3Str + ' km\u00b2/s\u00b2</span>' +
    '<button onclick="progApplyPorkchopWindow()" style="margin-left:10px;font-family:var(--mono);font-size:9px;' +
    'background:transparent;border:1px solid var(--border);color:var(--text-dim);padding:1px 6px;cursor:pointer;">' +
    'Set COAST</button>';

  // Store in active program
  if (PROG_ACTIVE_PROGRAM) {
    PROG_ACTIVE_PROGRAM.launchWindow = {
      dep_body: 'Earth', arr_body: arrBody,
      dep_day: sel.dep, tof_day: sel.tof, c3: sel.c3,
    };
  }
}

/**
 * Create / update a COAST event in the active program with the selected
 * inter-planetary transit duration. The COAST event represents the
 * heliocentric cruise from TMI to arrival.
 */
function progApplyPorkchopWindow() {
  if (!PROG_ACTIVE_PROGRAM || !PROG_PORKCHOP_STATE?.sel) return;
  const { dep, tof } = PROG_PORKCHOP_STATE.sel;
  const dur_s = Math.round(tof) * 86400;

  // Find existing transit COAST event (type COAST, label contains 'Transit')
  let ev = PROG_ACTIVE_PROGRAM.events.find(e => e.type === 'COAST' && e.label.includes('Transit'));
  if (ev) {
    ev.duration_s = dur_s;
    ev.tStart     = Math.round(dep * 86400);
    ev.label      = 'Transit COAST (' + Math.round(tof) + 'd)';
  } else {
    ev = progMakeEvent('COAST', {
      label:      'Transit COAST (' + Math.round(tof) + 'd)',
      duration_s: dur_s,
      tStart:     Math.round(dep * 86400),
      vehicleId:  'ALL',
    });
    PROG_ACTIVE_PROGRAM.events.push(ev);
  }

  const info = document.getElementById('prog-porkchop-info');
  if (info) info.innerHTML += ' <span style="color:var(--accent);">\u2713 COAST set</span>';
}

/** Switch the pork chop between Earth\u2192Mars and Earth\u2192Venus. */
function progSelectPorkchop(arrBody) {
  ['Mars','Venus'].forEach(b => {
    const btn = document.getElementById('prog-pc-' + b.slice(0,2).toLowerCase());
    if (btn) btn.classList.toggle('active', b === arrBody);
  });
  progRenderPorkchopCanvas(arrBody);
}

/** Initialise the pork chop plotter (called from INIT). */
function progInitPorkchop() {
  // Default: Earth\u2192Mars
  progRenderPorkchopCanvas('Mars');
}

// ── Phase 6 self-tests (pure math — no DOM) ────────────────────────────────────
const PROG_P6_TEST_RESULTS = (() => {
  // T1/T2: Stumpff limits
  const c0 = progStumpffC(0);
  const s0 = progStumpffS(0);

  // T3: Stumpff C at π²
  const pi2  = Math.PI * Math.PI;
  const cPi2 = progStumpffC(pi2);   // should = (1-cos(π))/π² = 2/π²

  // T4: Earth orbital speed
  const vE = Math.hypot(...progHelioVel('Earth', 0));

  // T5: Lambert Earth→Mars 180-day — should return non-null
  const r1t = progHelioPos('Earth', 50);
  const r2t = progHelioPos('Mars',  50 + 180);
  const lamTest = progLambert2D(r1t, r2t, 180*86400, PROG_PORK_MU);

  // T6: Lambert gives plausible |v1| for above (heliocentric speed ~28-35 km/s)
  const v1mag = lamTest ? Math.hypot(...lamTest.v1) : -1;

  // T7: C3 at sub-optimal departure (dep=50d, tof=180d) is finite and < 80
  const c3_test = progDepartureC3('Earth', 'Mars', 50, 180);

  // T8: Pork chop grid min C3 for Earth→Mars is < 12 km²/s² (Hohmann ≈8.73)
  const sm_grid = progPorkchopGrid('Earth', 'Mars', {
    dep_start:0, dep_end:200, tof_start:200, tof_end:350, nx:25, ny:25,
  });

  // T9: Stumpff C negative psi (hyperbolic)
  const cNeg = progStumpffC(-1);   // (cosh(1)-1)/1 ≈ 0.5431

  const T = [
    { label:'Stumpff C(0) = 0.5',       val: c0,                              target: 0.5,   tol: 1e-9  },
    { label:'Stumpff S(0) = 1/6',        val: s0,                              target: 1/6,   tol: 1e-9  },
    { label:'Stumpff C(\u03c0\u00b2) = 2/\u03c0\u00b2', val: Math.round(cPi2*10000)/10000, target: Math.round(2/pi2*10000)/10000, tol: 0.001 },
    { label:'Earth orbital speed km/s',  val: Math.round(vE*100)/100,          target: 29.78, tol: 0.1   },
    { label:'Lambert returns solution',  val: lamTest !== null ? 1 : 0,        target: 1,     tol: 0     },
    { label:'Lambert |v1| 28-35 km/s',   val: v1mag > 28 && v1mag < 35 ? 1:0, target: 1,     tol: 0     },
    { label:'C3 Earth\u2192Mars 50/180d finite', val: isFinite(c3_test) ? 1 : 0, target: 1, tol: 0     },
    { label:'Porkchop min C3 < 12',      val: sm_grid.c3_min < 12 ? 1 : 0,    target: 1,     tol: 0     },
    { label:'Stumpff C(-1) hyperbolic',  val: Math.round(cNeg*1000)/1000,      target: Math.round((Math.cosh(1)-1)*1000)/1000, tol: 0.001 },
  ];
  return T.map(t => ({ label:t.label, val:t.val, target:t.target, pass: Math.abs(t.val-t.target)<=t.tol }));
})();

// ─── PROGRAM MODULE — Phase 7: Band View ─────────────────────────────────────

// ── Constants ─────────────────────────────────────────────────────────────────
const PROG_BV = {
  AXIS_H:    26,   // px — time axis strip at top of canvas
  MINIMAP_H: 28,   // px — overview scrubber strip at bottom
  ZONE_H:    18,   // px — collapsed zone header
  ZONE_HDR:  20,   // px — zone header when expanded
  TRACK_H:   32,   // px — height per vehicle lane
  TRACK_PAD: 6,    // px — padding above/below track line within lane
  ICON_R:    5,    // px — base radius for non-burn event nodes
  LEFT_W:    72,   // px — left margin for rotated zone labels
};

const PROG_BV_T_REF = 3600;
const PROG_BV_TICK_CANDS=[0,60,300,600,1800,3600,3*3600,6*3600,12*3600,86400,2*86400,3*86400,7*86400,14*86400,30*86400,60*86400,90*86400,180*86400,365*86400,2*365*86400,5*365*86400,10*365*86400];

// Body → zone mapping
const PROG_ZONES = [
  { key:'interplanetary', label:'INTERPLANETARY', bodies:['Mars','Venus','Jupiter'],       bg:'rgba(224,108,117,.05)', lc:'#e06c754c' },
  { key:'cislunar',       label:'CIS-LUNAR',       bodies:['Moon'],                         bg:'rgba(180,180,220,.05)', lc:'#9b9bc84c' },
  { key:'earth',          label:'EARTH',            bodies:['Earth','__surface__','__pre__'], bg:'rgba(97,175,239,.05)',  lc:'#61afef4c' },
];

// Event visual config: symbol + base colour
const PROG_EV_STYLE = {
  LAUNCH:              { sym:'\u25b2', col:'#98c379' },
  BURN:                { sym:'\u25c6', col:'#e5c07b' },
  SEPARATE:            { sym:'\u21d5', col:'#61afef' },
  DOCK:                { sym:'\u2295', col:'#c678dd' },
  LAND:                { sym:'\u25bc', col:'#56b6c2' },
  ASCENT_SURFACE:      { sym:'\u25b2', col:'#98c379' },
  EXPEND:              { sym:'\u00d7', col:'#e06c75' },
  TRANSFER_PROPELLANT: { sym:'+',      col:'#56b6c2' },
  TRANSFER_CREW:       { sym:'\u21c4', col:'#d19a66' },
  TRANSFER_STAGE:      { sym:'\u2261', col:'#888'    },
  RECONFIGURE:         { sym:'\u21ba', col:'#c678dd' },
  COAST:               { sym:'\u2014', col:'#4b5263' },
};

const PROG_NODE_BAND_Y={
  'earth-surface':{band:'earth',frac:0.90},'leo':{band:'earth',frac:0.52},
  'gto':{band:'earth',frac:0.28},'geo':{band:'earth',frac:0.12},'escape':{band:'earth',frac:0.04},
  'tlc':{band:'cislunar',frac:0.55},'dro':{band:'cislunar',frac:0.16},
  'llo':{band:'cislunar',frac:0.72},'moon-surface':{band:'cislunar',frac:0.90},
  'mars-transit':{band:'interplanetary',frac:0.50},'mars-orbit':{band:'interplanetary',frac:0.18},
  'mars-surface':{band:'interplanetary',frac:0.85},'venus-transit':{band:'interplanetary',frac:0.62},
  'venus-orbit':{band:'interplanetary',frac:0.32},
};
function _progBvStateToNode(os){
  if(!os)return 'earth-surface';
  if(os.surface){if(os.body==='Moon')return 'moon-surface';if(os.body==='Mars')return 'mars-surface';return 'earth-surface';}
  const alt=(os.apogee+os.perigee)/2;
  if(os.body==='Earth'){if(alt<1500)return 'leo';if(alt<15000)return 'gto';return 'geo';}
  if(os.body==='Moon')return alt<500?'llo':'dro';
  if(os.body==='Mars')return alt<1000?'mars-surface':'mars-orbit';
  if(os.body==='Venus')return 'venus-orbit';
  return 'leo';
}
function _progBvNodePxY(nodeId,layout){
  if(!nodeId||!layout)return null;
  const spec=PROG_NODE_BAND_Y[nodeId];if(!spec)return null;
  const zone=layout.zones.find(z=>z.key===spec.band);if(!zone)return null;
  return zone.y+zone.h*spec.frac;
}
function _progBvComputeSegments(fv,evs,layout,W){
  const segs=[],sorted=[...evs].sort((a,b)=>a.tStart-b.tStart);
  if(!sorted.length)return segs;
  let curNode=_progBvStateToNode(fv.orbitState);
  let curY=_progBvNodePxY(curNode,layout)??((layout.zones[layout.zones.length-1]?.y??0)+20);
  for(let i=0;i<sorted.length;i++){
    const ev=sorted[i],prev=sorted[i-1];
    if(prev){const pe=prev.tEnd??prev.tStart;if(ev.tStart>pe+30)segs.push({t1:pe,t2:ev.tStart,y1:curY,y2:curY,dash:false});}
    if(ev.type==='LAUNCH'){const fn=ev.fromNode||'earth-surface',tn=ev.toNode||'leo';const y1=_progBvNodePxY(fn,layout)??curY,y2=_progBvNodePxY(tn,layout)??curY;segs.push({t1:ev.tStart,t2:ev.tEnd??ev.tStart+600,y1,y2,dash:true});curY=y2;curNode=tn;}
    else if(ev.type==='BURN'){const fn=ev.fromNode||curNode,tn=ev.toNode||curNode;const y1=_progBvNodePxY(fn,layout)??curY,y2=_progBvNodePxY(tn,layout)??curY;segs.push({t1:ev.tStart,t2:ev.tEnd??ev.tStart+600,y1,y2,dash:true});curY=y2;curNode=tn;}
    else if(ev.type==='COAST'){segs.push({t1:ev.tStart,t2:ev.tEnd??ev.tStart,y1:curY,y2:curY,dash:false});}
    else if(ev.type==='ASCENT_SURFACE'){const fn=ev.fromNode||'moon-surface',tn=ev.toNode||'llo';const y1=_progBvNodePxY(fn,layout)??curY,y2=_progBvNodePxY(tn,layout)??curY;segs.push({t1:ev.tStart,t2:ev.tEnd??ev.tStart+600,y1,y2,dash:true});curY=y2;curNode=tn;}
  }
  return segs;
}
// Result → node colour
function _progBvResultCol(result) {
  if (result === 'SUCCESS')  return '#98c379';
  if (result === 'MARGINAL') return '#e5c07b';
  if (result === 'FAILED')   return '#e06c75';
  return '#565c78';  // PENDING / uncomputed
}

// ΔV → node radius
function _progBvDvR(dv) {
  if (!dv || dv <= 0) return PROG_BV.ICON_R;
  if (dv < 100)  return 4;
  if (dv < 500)  return 5;
  if (dv < 2000) return 7;
  if (dv < 5000) return 9;
  return 11;
}

// ── Band View state ───────────────────────────────────────────────────────────
let PROG_BAND_STATE = {
  tStart:    0,
  tEnd:      8 * 86400,
  selId:     null,   // selected eventId
  drag:      false,
  dragX0:    0,
  dragTS0:   0,      // tStart when drag began
  dragTE0:   0,      // tEnd when drag began
  hitNodes:  [],     // [{evId,cx,cy,r}] — built per render, used for click
  trackHits: [],     // [{vehicleId,y0,y1}] — built per render, used for right-click
  layout:    null,   // last computed layout
};

// ── Time helpers ──────────────────────────────────────────────────────────────

/** Format T+ seconds as a human-readable label. */
function progFmtT(s) {
  s = Math.round(s);
  const d = Math.floor(s / 86400), rem = s % 86400;
  const h = Math.floor(rem / 3600), rm = rem % 3600;
  const m = Math.floor(rm / 60);
  if (d > 0) return 'T+' + d + 'd ' + h + 'h';
  if (h > 0) return 'T+' + h + 'h ' + m + 'm';
  if (m > 0) return 'T+' + m + 'm';
  return 'T+' + s + 's';
}

function _progBvTx(t,W){const{tStart,tEnd}=PROG_BAND_STATE,cW=W-PROG_BV.LEFT_W;const l0=Math.log1p(Math.max(0,tStart)/PROG_BV_T_REF),l1=Math.log1p(Math.max(0,tEnd)/PROG_BV_T_REF),lt=Math.log1p(Math.max(0,t)/PROG_BV_T_REF);if(l1<=l0)return PROG_BV.LEFT_W;return PROG_BV.LEFT_W+(lt-l0)/(l1-l0)*cW;}
function _progBvXt(x,W){const{tStart,tEnd}=PROG_BAND_STATE,cW=W-PROG_BV.LEFT_W;const l0=Math.log1p(Math.max(0,tStart)/PROG_BV_T_REF),l1=Math.log1p(Math.max(0,tEnd)/PROG_BV_T_REF);return Math.max(0,(Math.exp(l0+((x-PROG_BV.LEFT_W)/cW)*(l1-l0))-1)*PROG_BV_T_REF);}

function _progBvAxisTicks(W){const{tStart,tEnd}=PROG_BAND_STATE;const ticks=[];let lastX=-60;for(const t of PROG_BV_TICK_CANDS){if(t<tStart||t>tEnd)continue;const x=_progBvTx(t,W);if(x-lastX>=50){ticks.push(t);lastX=x;}}return ticks;}
function _progBvFmtTick(t){if(t===0)return 'T+0';const d=Math.floor(t/86400),h=Math.floor((t%86400)/3600),m=Math.floor((t%3600)/60);if(d>=1)return 'T+'+d+'d';if(h>=1)return 'T+'+h+'h';if(m>=1)return 'T+'+m+'m';return 'T+'+Math.round(t)+'s';}

// ── Demo mission ──────────────────────────────────────────────────────────────

function progCreateDemoMission() {
  const prog = progMakeProgram('Apollo 11 Demo');
  prog.pads = [
    progMakePad('LC-39A',     '39A', 'KSC',  72),
    progMakePad('LC-39B',     '39B', 'KSC',  72),
    progMakePad('Baikonur 1', 'BK1', 'BK',   48),
    progMakePad('Vandenberg', 'SLC', 'VAFB', 48),
  ];

  // Vehicle 1: Apollo stack (CSM + LM)
  const apollo = progMakeFlightVehicle(
    'Apollo 11',
    [
      progMakeLiveStage('LM',  [progMakeTank('NTO_A50',   8165)], 2, 15095, 311),
      progMakeLiveStage('CSM', [progMakeTank('NTO_A50',  18410)], 3, 28800, 314),
    ],
    progMakeOrbitalState('Earth', 185, 28.5, 0),
    '#61afef'
  );
  apollo.status = 'ORBIT';
  prog.vehicles[apollo.vehicleId] = apollo;

  // Vehicle 2: S-IVB (separated, expended)
  const sivb = progMakeFlightVehicle(
    'S-IVB',
    [progMakeLiveStage('S-IVB', [progMakeTank('LOX_LH2', 4200)], 0, 13300, 421)],
    progMakeOrbitalState('Earth', 185, 28.5, 0),
    '#4b5263'
  );
  sivb.status = 'EXPENDED';
  prog.vehicles[sivb.vehicleId] = sivb;

  // Convenience shorthand
  const T = (d, h, m) => d*86400 + h*3600 + m*60;
  const av = apollo.vehicleId, sv = sivb.vehicleId;

  prog.events=[
    progMakeEvent('LAUNCH',  {vehicleId:av,label:'LAUNCH',tStart:0,tEnd:600,result:'SUCCESS',fromNode:'earth-surface',toNode:'leo'}),
    progMakeEvent('COAST',   {vehicleId:av,label:'Parking Orbit',tStart:600,tEnd:T(0,2,40),duration_s:T(0,2,30),result:'SUCCESS'}),
    progMakeEvent('BURN',    {vehicleId:av,label:'TLI',tStart:T(0,2,40),tEnd:T(0,2,46),dvTarget:3136,result:'SUCCESS',fromNode:'leo',toNode:'tlc'}),
    progMakeEvent('SEPARATE',{vehicleId:av,label:'Separate S-IVB',tStart:T(0,2,47),tEnd:T(0,2,47),result:'SUCCESS'}),
    progMakeEvent('COAST',   {vehicleId:av,label:'Trans-Lunar Coast',tStart:T(0,2,47),tEnd:T(3,0,0),duration_s:T(2,21,13),result:'SUCCESS'}),
    progMakeEvent('BURN',    {vehicleId:av,label:'LOI',tStart:T(3,0,0),tEnd:T(3,0,6),dvTarget:900,result:'SUCCESS',fromNode:'tlc',toNode:'llo'}),
    progMakeEvent('COAST',   {vehicleId:av,label:'Lunar Orbit Ops',tStart:T(3,0,6),tEnd:T(8,0,0),duration_s:T(4,23,54),result:'PENDING'}),
    progMakeEvent('BURN',    {vehicleId:av,label:'TEI',tStart:T(8,0,0),tEnd:T(8,0,6),dvTarget:950,result:'PENDING',fromNode:'llo',toNode:'tlc'}),
    progMakeEvent('LAUNCH',  {vehicleId:sv,label:'S-IVB Launch',tStart:0,tEnd:600,result:'SUCCESS',fromNode:'earth-surface',toNode:'leo'}),
    progMakeEvent('COAST',   {vehicleId:sv,label:'S-IVB Coast',tStart:600,tEnd:T(0,2,47),duration_s:T(0,2,7),result:'SUCCESS'}),
    progMakeEvent('EXPEND',  {vehicleId:sv,label:'S-IVB Expend',tStart:T(0,2,50),tEnd:T(0,2,50),result:'SUCCESS'}),
  ];

  return prog;
}

function progLoadDemoMission() {
  PROG_ACTIVE_PROGRAM = progCreateDemoMission();
  PROG_BAND_STATE.tStart = 0;
  PROG_BAND_STATE.tEnd   = 9 * 86400;
  PROG_BAND_STATE.selId  = null;
  progRenderSpaceport();
  progUpdateEventEditor(null);
  progRenderBandView();
}

function progClearMission() {
  const p = progMakeProgram('New Program');
  p.pads = PROG_ACTIVE_PROGRAM ? [...PROG_ACTIVE_PROGRAM.pads] : [];
  PROG_ACTIVE_PROGRAM = p;
  PROG_BAND_STATE.tStart = 0;
  PROG_BAND_STATE.tEnd   = 30 * 86400;
  PROG_BAND_STATE.selId  = null;
  progRenderSpaceport();
  progUpdateEventEditor(null);
  progRenderBandView();
}

// ── Right panel tabs ──────────────────────────────────────────────────────────
function progRightTab(tab) {
  const panes = { ev:'prog-rt-ev-pane', pc:'prog-rt-pc-pane', ts:'prog-rt-ts-pane' };
  const btns  = { ev:'prog-rt-ev-btn',  pc:'prog-rt-pc-btn',  ts:'prog-rt-ts-btn'  };
  Object.entries(panes).forEach(([k, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = (k === tab) ? (k === 'pc' ? 'flex' : 'block') : 'none';
  });
  Object.entries(btns).forEach(([k, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const active = (k === tab);
    el.style.background      = active ? 'var(--panel)' : 'transparent';
    el.style.color            = active ? 'var(--accent)' : 'var(--text-dim)';
    el.style.borderBottom     = active ? '2px solid var(--accent)' : '2px solid transparent';
  });
  // Initialise pork chop on first open
  if (tab === 'pc' && PROG_PORKCHOP_STATE === null) progInitPorkchop();
}

// ── Event editor ──────────────────────────────────────────────────────────────
function progUpdateEventEditor(evId) {
  const panel = document.getElementById('prog-event-detail');
  if (!panel) return;
  PROG_BAND_STATE.selId = evId || null;

  if (!evId || !PROG_ACTIVE_PROGRAM) {
    panel.innerHTML = '<span style="color:var(--text-dim);font-size:10px;">// Select an event in the timeline</span>';
    return;
  }
  const ev = PROG_ACTIVE_PROGRAM.events.find(e => e.eventId === evId);
  if (!ev) { panel.innerHTML = '<span style="color:var(--text-dim)">// Not found</span>'; return; }

  const es = PROG_EV_STYLE[ev.type] || { sym:'●', col:'#888' };
  const hasDV  = ['BURN','ASCENT_SURFACE'].includes(ev.type);
  const fld = (id, lbl, val, type='text', step='') =>
    `<div style="margin-bottom:8px;">
      <div style="font-size:9px;color:var(--text-dim);letter-spacing:.1em;margin-bottom:2px;">${lbl}</div>
      <input id="${id}" type="${type}" step="${step}" value="${val}"
        oninput="progEvUpdate()"
        style="width:100%;background:rgba(0,0,0,.4);border:1px solid var(--border);color:var(--text-bright);font-family:var(--mono);font-size:11px;padding:4px 6px;box-sizing:border-box;">
    </div>`;
  const sel = (id, lbl, opts, cur) =>
    `<div style="margin-bottom:8px;">
      <div style="font-size:9px;color:var(--text-dim);letter-spacing:.1em;margin-bottom:2px;">${lbl}</div>
      <select id="${id}" onchange="progEvUpdate()"
        style="width:100%;background:rgba(0,0,0,.4);border:1px solid var(--border);color:var(--text-bright);font-family:var(--mono);font-size:11px;padding:4px 6px;box-sizing:border-box;">
        ${opts.map(o=>`<option${o===cur?' selected':''}>${o}</option>`).join('')}
      </select>
    </div>`;

  panel.innerHTML =
    `<div style="color:${es.col};font-size:12px;font-weight:bold;letter-spacing:.08em;margin-bottom:10px;">${es.sym} ${ev.type}</div>` +
    fld('prog-ev-label',  'LABEL',         ev.label || '') +
    fld('prog-ev-tstart', 'T-START (days)', (ev.tStart/86400).toFixed(4), 'number', '0.001') +
    fld('prog-ev-tend',   'T-END (days)',   ((ev.tEnd||ev.tStart)/86400).toFixed(4), 'number', '0.001') +
    (hasDV ? fld('prog-ev-dv', '\u0394V TARGET (m/s)', ev.dvTarget ?? 0, 'number', '1') : '') +
    sel('prog-ev-result', 'RESULT', ['PENDING','SUCCESS','MARGINAL','FAILED'], ev.result||'PENDING') +
    `<button onclick="progEvDelete()" style="margin-top:4px;font-family:var(--mono);font-size:10px;background:transparent;border:1px solid var(--border);color:var(--accent2,#e06c75);padding:4px 10px;cursor:pointer;letter-spacing:.06em;width:100%;">Delete Event</button>`;
}

function progEvUpdate() {
  if (!PROG_BAND_STATE.selId || !PROG_ACTIVE_PROGRAM) return;
  const ev = PROG_ACTIVE_PROGRAM.events.find(e => e.eventId === PROG_BAND_STATE.selId);
  if (!ev) return;
  const g = id => document.getElementById(id);
  if (g('prog-ev-label'))  ev.label   = g('prog-ev-label').value;
  if (g('prog-ev-tstart')) ev.tStart  = parseFloat(g('prog-ev-tstart').value) * 86400 || 0;
  if (g('prog-ev-tend'))   { ev.tEnd  = parseFloat(g('prog-ev-tend').value)   * 86400 || ev.tStart; if (ev.type==='COAST') ev.duration_s = ev.tEnd - ev.tStart; }
  if (g('prog-ev-dv'))     ev.dvTarget = parseFloat(g('prog-ev-dv').value)    || 0;
  if (g('prog-ev-result')) ev.result  = g('prog-ev-result').value;
  progRenderBandView();
}

function progEvDelete() {
  if (!PROG_BAND_STATE.selId || !PROG_ACTIVE_PROGRAM) return;
  PROG_ACTIVE_PROGRAM.events = PROG_ACTIVE_PROGRAM.events.filter(
    e => e.eventId !== PROG_BAND_STATE.selId
  );
  PROG_BAND_STATE.selId = null;
  progUpdateEventEditor(null);
  progRenderBandView();
}

// ── Layout computation ────────────────────────────────────────────────────────
function _progBvLayout(prog,W,H){
  const{AXIS_H,MINIMAP_H}=PROG_BV,contentH=H-AXIS_H-MINIMAP_H;
  const ZF={earth:0.50,cislunar:0.32,interplanetary:0.18},CH=22;
  const evN=new Set((prog.events||[]).flatMap(e=>[e.fromNode,e.toNode]).filter(Boolean));
  const zA={};
  PROG_ZONES.forEach(z=>{
    const cross=Object.keys(PROG_NODE_BAND_Y).filter(id=>PROG_NODE_BAND_Y[id].band===z.key).some(id=>evN.has(id));
    const hasV=Object.values(prog.vehicles).some(fv=>{const b=fv.orbitState?.body;if(z.key==='cislunar')return b==='Moon';if(z.key==='interplanetary')return['Mars','Venus','Jupiter'].includes(b);return z.key==='earth';});
    zA[z.key]=cross||hasV;
  });
  zA['earth']=true;
  const aF=PROG_ZONES.reduce((s,z)=>s+(zA[z.key]?ZF[z.key]:0),0);
  const cH=PROG_ZONES.reduce((s,z)=>s+(zA[z.key]?0:CH),0),aH=contentH-cH;
  const zH={};PROG_ZONES.forEach(z=>{zH[z.key]=zA[z.key]?Math.max(56,aH*ZF[z.key]/(aF||1)):CH;});
  let yB=AXIS_H+contentH;const zones=[];
  [...PROG_ZONES].reverse().forEach(zD=>{
    const h=zH[zD.key],y=yB-h;yB=y;
    const fvs=Object.values(prog.vehicles).filter(fv=>{const b=fv.orbitState?.body;if(zD.key==='cislunar')return b==='Moon';if(zD.key==='interplanetary')return['Mars','Venus','Jupiter'].includes(b);return zD.key==='earth';});
    zones.push({...zD,y,h,vehicles:fvs.map(fv=>({fv,trackY:y+h*0.52})),active:zA[zD.key]});
  });
  zones.reverse();
  const allT=(prog.events||[]).flatMap(e=>[e.tStart,e.tEnd??e.tStart]);
  const missionEnd=allT.length?Math.max(...allT,PROG_BAND_STATE.tEnd):PROG_BAND_STATE.tEnd;
  return{W,H,AXIS_H,MINIMAP_H,contentH,contentY:AXIS_H,minimapY:H-MINIMAP_H,zones,missionEnd};
}

// ── Band View renderer ────────────────────────────────────────────────────────

function progRenderBandView() {
  const canvas = document.getElementById('prog-band-canvas');
  if (!canvas) return;

  // Sync pixel dimensions to CSS container size
  const wrap = canvas.parentElement;
  const W = wrap.clientWidth  || 700;
  const H = wrap.clientHeight || 420;
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W; canvas.height = H;
  }

  const ctx   = canvas.getContext('2d');
  const prog  = PROG_ACTIVE_PROGRAM;

  // Background
  ctx.fillStyle = '#1a1b26';
  ctx.fillRect(0, 0, W, H);

  if (!prog || Object.keys(prog.vehicles).length === 0) {
    ctx.fillStyle = '#3a3b4a';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('// No vehicles \u2014 click Demo, or right-click to insert a LAUNCH', W/2, H/2);
    ctx.textAlign = 'left';
    _progBvDrawAxis(ctx, W, H, { AXIS_H:PROG_BV.AXIS_H, minimapY:H-PROG_BV.MINIMAP_H });
    return;
  }

  const layout = _progBvLayout(prog, W, H);
  PROG_BAND_STATE.layout = layout;

  _progBvDrawZones(ctx, W, layout);
  _progBvDrawAxis(ctx, W, H, layout);
  _progBvDrawTracks(ctx, prog, W, layout);
  _progBvDrawMinimap(ctx, prog, W, H, layout);

  // Update range label
  const rEl = document.getElementById('prog-band-range');
  if (rEl) rEl.textContent = progFmtT(PROG_BAND_STATE.tStart) + ' \u2013 ' + progFmtT(PROG_BAND_STATE.tEnd);

  // Keep Node Map and closure bar in sync
  if (typeof progRenderNodeMap === 'function') progRenderNodeMap();
  if (typeof progRenderClosureBar === 'function') progRenderClosureBar();
}

function _progBvDrawAxis(ctx,W,H,layout){const{AXIS_H,LEFT_W}=PROG_BV;ctx.fillStyle='#11121a';ctx.fillRect(0,0,W,AXIS_H);ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(0,0,LEFT_W,AXIS_H);ctx.fillStyle='#2a2b36';ctx.fillRect(0,AXIS_H-1,W,1);ctx.fillStyle='#3a3b50';ctx.font='8px monospace';ctx.textBaseline='middle';ctx.fillText('T+',4,AXIS_H/2);const ticks=_progBvAxisTicks(W);ctx.font='9px monospace';for(const t of ticks){const x=_progBvTx(t,W);if(x<LEFT_W||x>W)continue;ctx.strokeStyle='#1e1f2a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,AXIS_H);ctx.lineTo(x,layout.minimapY??H);ctx.stroke();ctx.strokeStyle='#3a3b50';ctx.beginPath();ctx.moveTo(x,AXIS_H-5);ctx.lineTo(x,AXIS_H);ctx.stroke();ctx.fillStyle='#6a6b80';ctx.fillText(_progBvFmtTick(t),x+3,AXIS_H/2);}ctx.textBaseline='alphabetic';}

function _progBvDrawZones(ctx,W,layout){const LW=PROG_BV.LEFT_W;for(const zone of layout.zones){ctx.fillStyle=zone.bg;ctx.fillRect(0,zone.y,W,zone.h);ctx.fillStyle='rgba(0,0,0,.20)';ctx.fillRect(0,zone.y,LW,zone.h);ctx.strokeStyle=zone.lc;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,zone.y);ctx.lineTo(W,zone.y);ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.04)';ctx.beginPath();ctx.moveTo(LW,zone.y);ctx.lineTo(LW,zone.y+zone.h);ctx.stroke();if(zone.h<8)continue;ctx.save();ctx.translate(LW/2,zone.y+zone.h/2);ctx.rotate(-Math.PI/2);const lc=zone.lc.replace(/,[^)]+\)$/,',0.7)');ctx.fillStyle=zone.active?lc:'#2e2f40';ctx.font=(zone.active?'8':'7')+'px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(zone.label,0,0);ctx.restore();ctx.textAlign='left';ctx.textBaseline='alphabetic';}}

function _progBvDrawTracks(ctx,prog,W,layout){const hitNodes=[],trackHits=[],LW=PROG_BV.LEFT_W;for(const fv of Object.values(prog.vehicles)){const col=fv.color||'#888',evs=(prog.events||[]).filter(e=>e.vehicleId===fv.vehicleId),segs=_progBvComputeSegments(fv,evs,layout,W);const initY=_progBvNodePxY(_progBvStateToNode(fv.orbitState),layout)??((layout.zones[layout.zones.length-1]?.y??0)+20);ctx.fillStyle=col+'cc';ctx.font='8px monospace';ctx.textBaseline='bottom';ctx.fillText(fv.name.substring(0,10),2,initY-2);ctx.textBaseline='alphabetic';const ys=segs.flatMap(s=>[s.y1,s.y2]);const minY=ys.length?Math.min(...ys):initY,maxY=ys.length?Math.max(...ys):initY;trackHits.push({vehicleId:fv.vehicleId,y0:minY-14,y1:maxY+14});for(const seg of segs){const x1=_progBvTx(seg.t1,W),x2=_progBvTx(Math.max(seg.t1+1,seg.t2),W);if(x2<LW-2||x1>W+2)continue;const cx1=Math.max(LW-1,Math.min(W+1,x1)),cx2=Math.max(LW-1,Math.min(W+1,x2));const sp=x2-x1,f1=sp>0.5?(cx1-x1)/sp:0,f2=sp>0.5?(cx2-x1)/sp:1;const cy1=seg.y1+(seg.y2-seg.y1)*f1,cy2=seg.y1+(seg.y2-seg.y1)*f2;ctx.globalAlpha=seg.dash?.72:.88;ctx.lineWidth=seg.dash?1.5:2;ctx.strokeStyle=col;if(seg.dash)ctx.setLineDash([4,2]);else ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(cx1,cy1);ctx.lineTo(cx2,cy2);ctx.stroke();}ctx.setLineDash([]);ctx.globalAlpha=1;for(const ev of evs){const x=_progBvTx(ev.tStart,W);if(x<LW-14||x>W+14)continue;const nid=ev.fromNode||(ev.type==='LAUNCH'?'earth-surface':null);const evY=(nid?_progBvNodePxY(nid,layout):null)??initY;const es=PROG_EV_STYLE[ev.type]||{sym:'●',col:'#888'};const ncol=_progBvResultCol(ev.result),isSel=PROG_BAND_STATE.selId===ev.eventId;const r=['BURN','ASCENT_SURFACE'].includes(ev.type)?_progBvDvR(ev.dvTarget):PROG_BV.ICON_R;ctx.beginPath();ctx.arc(x,evY,r,0,2*Math.PI);ctx.fillStyle=ncol;ctx.fill();if(isSel){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();}ctx.font=`${r+2}px monospace`;ctx.fillStyle='#000000bb';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(es.sym,x,evY);ctx.textAlign='left';ctx.textBaseline='alphabetic';if(ev.warnings?.length){ctx.fillStyle='#e5c07b';ctx.font='8px monospace';ctx.textAlign='center';ctx.fillText('⚠',x,evY-r-3);ctx.textAlign='left';}hitNodes.push({evId:ev.eventId,cx:x,cy:evY,r:Math.max(r,8)});}}PROG_BAND_STATE.hitNodes=hitNodes;PROG_BAND_STATE.trackHits=trackHits;}

function _progBvDrawMinimap(ctx, prog, W, H, layout) {
  const { MINIMAP_H } = PROG_BV;
  const mapY = layout.minimapY;

  // Background
  ctx.fillStyle = '#0f1018';
  ctx.fillRect(0, mapY, W, MINIMAP_H);
  ctx.strokeStyle = '#2a2b36';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, mapY); ctx.lineTo(W, mapY); ctx.stroke();

  const mEnd = layout.missionEnd || PROG_BAND_STATE.tEnd;
  if (mEnd <= 0) return;

  // Vehicle tracks in minimap
  const vehicles = Object.values(prog.vehicles);
  const nv = vehicles.length;
  if (!nv) return;
  const rowH = (MINIMAP_H - 6) / nv;

  vehicles.forEach((fv, idx) => {
    const my = mapY + 3 + idx * rowH + rowH / 2;
    ctx.strokeStyle = fv.color + '66';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, my); ctx.lineTo(W, my); ctx.stroke();

    (prog.events || []).filter(e => e.vehicleId === fv.vehicleId).forEach(ev => {
      const mx = Math.round((ev.tStart / mEnd) * W);
      if (mx >= 0 && mx <= W) {
        ctx.fillStyle = _progBvResultCol(ev.result);
        ctx.beginPath();
        ctx.arc(mx, my, 2, 0, 2*Math.PI);
        ctx.fill();
      }
    });
  });

  // Viewport indicator
  const vpX1 = Math.max(0,   Math.round((PROG_BAND_STATE.tStart / mEnd) * W));
  const vpX2 = Math.min(W,   Math.round((PROG_BAND_STATE.tEnd   / mEnd) * W));
  ctx.fillStyle   = 'rgba(255,255,255,.07)';
  ctx.fillRect(vpX1, mapY + 1, vpX2 - vpX1, MINIMAP_H - 2);
  ctx.strokeStyle = 'rgba(255,255,255,.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(vpX1, mapY + 1, vpX2 - vpX1, MINIMAP_H - 2);
}

// ── Interaction: zoom (log / multiplicative) ──────────────────────────────────
/**
 * Zoom the time axis.
 * factor > 1 = zoom OUT (range grows).  factor < 1 = zoom IN (range shrinks).
 * cx, W: canvas x coordinate of zoom anchor (null = center).
 */
function progBandZoom(factor,cx,W){const canvas=document.getElementById('prog-band-canvas');if(!canvas)return;const cW=W??canvas.width??700,px=cx??cW/2;const{tStart,tEnd}=PROG_BAND_STATE;const l0=Math.log1p(Math.max(0,tStart)/PROG_BV_T_REF),l1=Math.log1p(Math.max(0,tEnd)/PROG_BV_T_REF),lR=l1-l0;const frac=Math.max(0,Math.min(1,(px-PROG_BV.LEFT_W)/(cW-PROG_BV.LEFT_W)));const lC=l0+frac*lR;const lMin=Math.log1p(60/PROG_BV_T_REF),lMax=Math.log1p(365*20*86400/PROG_BV_T_REF);const lNR=Math.max(lMin,Math.min(lR*factor,lMax));PROG_BAND_STATE.tStart=Math.max(0,(Math.exp(lC-frac*lNR)-1)*PROG_BV_T_REF);PROG_BAND_STATE.tEnd=Math.max(PROG_BAND_STATE.tStart+60,(Math.exp(lC+(1-frac)*lNR)-1)*PROG_BV_T_REF);progRenderBandView();}

function progBandHandleWheel(e) {
  e.preventDefault();
  const factor = e.deltaY > 0 ? 1.18 : (1 / 1.18);   // each notch = ×1.18
  progBandZoom(factor, e.offsetX, e.target.width);
}

// ── Interaction: pan (drag) ───────────────────────────────────────────────────
function progBandStartDrag(e) {
  if (e.button !== 0) return;
  PROG_BAND_STATE.drag   = true;
  PROG_BAND_STATE.dragX0 = e.offsetX;
  PROG_BAND_STATE.dragTS0 = PROG_BAND_STATE.tStart;
  PROG_BAND_STATE.dragTE0 = PROG_BAND_STATE.tEnd;
}
function progBandDrag(e) {
  if (!PROG_BAND_STATE.drag) return;
  const canvas = e.target;
  const W = canvas.width || 700;
  const dx = e.offsetX - PROG_BAND_STATE.dragX0;
  const range = PROG_BAND_STATE.dragTE0 - PROG_BAND_STATE.dragTS0;
  const dt = -(dx / W) * range;
  PROG_BAND_STATE.tStart = PROG_BAND_STATE.dragTS0 + dt;
  PROG_BAND_STATE.tEnd   = PROG_BAND_STATE.dragTE0 + dt;
  progRenderBandView();
}
function progBandEndDrag(e) { PROG_BAND_STATE.drag = false; }

// ── Interaction: click (select event) ────────────────────────────────────────
function progBandHandleClick(e) {
  progBvHideMenu();
  const { hitNodes } = PROG_BAND_STATE;
  const x = e.offsetX, y = e.offsetY;
  for (const n of (hitNodes || [])) {
    if ((x - n.cx)**2 + (y - n.cy)**2 <= (n.r + 2)**2) {
      progUpdateEventEditor(n.evId);
      // Switch to Event tab if not already there
      const evPane = document.getElementById('prog-rt-ev-pane');
      if (evPane && evPane.style.display === 'none') progRightTab('ev');
      progRenderBandView();
      return;
    }
  }
  // Click on empty area: deselect
  PROG_BAND_STATE.selId = null;
  progUpdateEventEditor(null);
  progRenderBandView();
}

// ── Interaction: right-click (context menu) ───────────────────────────────────
function progBandHandleRightClick(e) {
  e.preventDefault();
  progBvHideMenu();
  if (!PROG_ACTIVE_PROGRAM) return;

  const x = e.offsetX, y = e.offsetY;
  const canvas = e.target;
  const W = canvas.width || 700;
  const tClick = _progBvXt(x, W);

  // Find which vehicle track was clicked
  let vehicleId = null;
  for (const th of (PROG_BAND_STATE.trackHits || [])) {
    if (y >= th.y0 && y <= th.y1) { vehicleId = th.vehicleId; break; }
  }

  const fv = vehicleId && PROG_ACTIVE_PROGRAM.vehicles[vehicleId];
  const validTypes = _progBvValidInsertTypes(fv);

  if (!validTypes.length) return;

  const items = validTypes.map(type => ({
    label: 'Insert ' + type,
    action: () => progBvMenuInsert(type, tClick, vehicleId),
  }));

  progBvShowMenu(e.offsetX, e.offsetY, items);
}

/** Determine which event types can be inserted for a vehicle's current state. */
function _progBvValidInsertTypes(fv) {
  if (!fv) return ['LAUNCH'];
  if (fv.status === 'EXPENDED') return [];
  if (fv.status === 'LANDED')   return ['ASCENT_SURFACE', 'EXPEND'];
  return ['COAST', 'BURN', 'SEPARATE', 'DOCK', 'EXPEND'];
}

function progBvShowMenu(x, y, items) {
  const menu = document.getElementById('prog-ctx-menu');
  if (!menu) return;
  menu.innerHTML = items.map((item, i) =>
    `<div onclick="progBvMenuClick(${i})" style="padding:5px 14px;cursor:pointer;font-family:var(--mono);font-size:10px;color:var(--text-dim);white-space:nowrap;"
      onmouseover="this.style.background='rgba(97,175,239,.12)';this.style.color='var(--text-bright)';"
      onmouseout="this.style.background='';this.style.color='var(--text-dim)';">${item.label}</div>`
  ).join('');
  menu._items = items;
  menu.style.display = 'block';
  // Clamp to canvas
  const wrap = document.getElementById('prog-band-wrap');
  const W = wrap ? wrap.clientWidth  : 700;
  const H = wrap ? wrap.clientHeight : 400;
  menu.style.left = Math.min(x, W - 160) + 'px';
  menu.style.top  = Math.min(y, H - items.length * 26 - 8) + 'px';
}

function progBvMenuClick(i) {
  const menu = document.getElementById('prog-ctx-menu');
  if (menu && menu._items && menu._items[i]) {
    menu._items[i].action();
  }
  progBvHideMenu();
}

function progBvHideMenu() {
  const menu = document.getElementById('prog-ctx-menu');
  if (menu) { menu.style.display = 'none'; menu._items = null; }
}

/** Insert a new event of given type at tClick for a vehicle. */
function progBvMenuInsert(type, tClick, vehicleId) {
  if (!PROG_ACTIVE_PROGRAM) return;
  const defaults = {
    COAST:          { duration_s: 86400, tEnd: tClick + 86400 },
    BURN:           { dvTarget: 300, tEnd: tClick + 360 },
    SEPARATE:       { tEnd: tClick },
    DOCK:           { tEnd: tClick },
    EXPEND:         { tEnd: tClick },
    ASCENT_SURFACE: { dvTarget: 1870, tEnd: tClick + 600 },
    LAUNCH:         { tEnd: tClick + 600 },
  };
  const d = defaults[type] || { tEnd: tClick };
  const ev = progMakeEvent(type, {
    label:     type.charAt(0) + type.slice(1).toLowerCase(),
    vehicleId: vehicleId || null,
    tStart:    tClick,
    result:    'PENDING',
    ...d,
  });
  PROG_ACTIVE_PROGRAM.events.push(ev);
  PROG_ACTIVE_PROGRAM.events.sort((a, b) => a.tStart - b.tStart);
  progUpdateEventEditor(ev.eventId);
  const evPane = document.getElementById('prog-rt-ev-pane');
  if (evPane && evPane.style.display === 'none') progRightTab('ev');
  progRenderBandView();
}

// ── Init ──────────────────────────────────────────────────────────────────────
function progInitBandView() {
  // Load demo if program has no events
  if (!PROG_ACTIVE_PROGRAM || !PROG_ACTIVE_PROGRAM.events.length) {
    PROG_ACTIVE_PROGRAM = progCreateDemoMission();
    progRenderSpaceport();
  }

  // Initial render
  progRenderBandView();

  // Re-render on container resize
  const wrap = document.getElementById('prog-band-wrap');
  if (wrap && window.ResizeObserver) {
    new ResizeObserver(() => progRenderBandView()).observe(wrap);
  }

  // Close context menu on any outside click
  document.addEventListener('click', e => {
    const menu = document.getElementById('prog-ctx-menu');
    if (menu && !menu.contains(e.target) && e.target.id !== 'prog-band-canvas') {
      progBvHideMenu();
    }
  }, true);
}

// ── Phase 7 tests (pure JS) ───────────────────────────────────────────────────
const PROG_P7_TEST_RESULTS = (() => {
  // T1/T2/T3: time formatting
  const f0 = progFmtT(0);
  const f1h = progFmtT(3600);
  const f3d = progFmtT(3*86400 + 5*3600);

  // T4/T5: demo mission structure
  const demo = progCreateDemoMission();

  // T6/T7: coordinate mapping roundtrip
  const savedState = { ...PROG_BAND_STATE };
  PROG_BAND_STATE.tStart = 0; PROG_BAND_STATE.tEnd = 86400;
  const T_test = 43200, W_test = 1000;
  const x_mapped = _progBvTx(T_test, W_test);
  const t_back   = _progBvXt(x_mapped, W_test);
  Object.assign(PROG_BAND_STATE, savedState);

  // T8: tick config — 8-day range should give 1-day steps
  const tCfg = _progBvTickCfg(8 * 86400);

  const T = [
    { label:'progFmtT(0) contains T+',           val: f0.startsWith('T+')         ? 1:0, target:1, tol:0 },
    { label:'progFmtT(3600) = T+1h 0m',          val: f1h,                 target:'T+1h 0m', tol:null },
    { label:'progFmtT(3d+5h) = T+3d 5h',         val: f3d,                 target:'T+3d 5h', tol:null },
    { label:'Demo mission: 9 events',             val: demo.events.length,  target:11,   tol:0 },
    { label:'Demo mission: 2 vehicles',           val: Object.keys(demo.vehicles).length, target:2, tol:0 },
    { label:'Coord map: x in valid range',         val: (x_mapped > PROG_BV.LEFT_W && x_mapped < W_test) ? 1:0, target:1, tol:0 },
    { label:'Coord roundtrip error < 1s',         val: Math.abs(t_back - T_test) < 1 ? 1:0, target:1, tol:0 },
    { label:'Tick config 8d \u2192 step=1d',      val: tCfg.step,           target:86400, tol:0 },
  ];
  return T.map(t => {
    const pass = t.tol === null
      ? (t.val === t.target)
      : (typeof t.val === 'number' ? Math.abs(t.val - t.target) <= t.tol : t.val === t.target);
    return { label:t.label, val:t.val, target:t.target, pass };
  });
})();

// ─── PROGRAM MODULE — Phase 8: Node Map ──────────────────────────────────────
//
// Subway-style ΔV topology graph (Model 3 from conops_mockups.html).
// Rendered as programmatic SVG in #prog-nm-canvas (viewBox 0 0 1100 520).
// Three vertical zones: Earth | Lunar | Interplanetary.
// Hover on edge: tooltip with ΔV.
// Click on edge: insert BURN event in Band View with that ΔV.
// Active mission path highlighted in vehicle color.

// ── Tooltip element ───────────────────────────────────────────────────────────
let _progNmTip = null;
function progNmGetTip() {
  if (!_progNmTip) {
    _progNmTip = document.createElement('div');
    _progNmTip.style.cssText =
      'position:fixed;background:#111318;border:1px solid #3a3b50;color:#cdd0d8;' +
      'font-family:monospace;font-size:10px;padding:6px 10px;z-index:200;display:none;' +
      'pointer-events:none;max-width:190px;line-height:1.55;white-space:nowrap;';
    document.body.appendChild(_progNmTip);
  }
  return _progNmTip;
}
function progNmHideTip() {
  const t = progNmGetTip(); if (t) t.style.display = 'none';
}

// ── Node map data (positions for viewBox 0 0 360 290) ─────────────────────────
// Node positions match the conops_mockups.html Model 3 layout (viewBox 0 0 1100 520).
// Zone columns: Earth x=80-380, Lunar x=400-660, Interplanetary x=680-1080.
const PROG_NM_NODES = [
  // Earth zone
  { id:'earth-surface', label:'EARTH',   sub:'surface',        zone:'earth',  cx:160, cy:440, r:22, col:'#57c687' },
  { id:'leo',           label:'LEO',     sub:'185-400 km',     zone:'earth',  cx:230, cy:340, r:18, col:'#57c687' },
  { id:'gto',           label:'GTO',     sub:'35,786 km apo',  zone:'earth',  cx:160, cy:250, r:16, col:'#57c687' },
  { id:'geo',           label:'GEO',     sub:'35,786 km circ', zone:'earth',  cx:310, cy:250, r:16, col:'#57c687' },
  { id:'escape',        label:'ESCAPE',  sub:'C3 >= 0',        zone:'earth',  cx:350, cy:160, r:16, col:'#57c687', dashed:true },
  // Lunar zone
  { id:'tlc',           label:'TLC',     sub:'trans-lunar',    zone:'lunar',  cx:480, cy:260, r:16, col:'#aaaacc', dashed:true },
  { id:'dro',           label:'DRO',     sub:'cis-lunar',      zone:'lunar',  cx:530, cy:150, r:18, col:'#57b4c6' },
  { id:'llo',           label:'LLO',     sub:'100 km lunar',   zone:'lunar',  cx:530, cy:340, r:18, col:'#aaaacc' },
  { id:'moon-surface',  label:'MOON',    sub:'surface',        zone:'lunar',  cx:600, cy:430, r:18, col:'#aaaacc' },
  // Interplanetary
  { id:'mars-transit',  label:'TRANSIT', sub:'Earth to Mars',  zone:'interp', cx:780, cy:200, r:16, col:'#c6a057', dashed:true },
  { id:'venus-transit', label:'TRANSIT', sub:'Earth to Venus', zone:'interp', cx:780, cy:370, r:16, col:'#c69057', dashed:true },
  { id:'mars-orbit',    label:'MARS',    sub:'orbit',          zone:'interp', cx:960, cy:150, r:20, col:'#c66057' },
  { id:'mars-surface',  label:'MARS',    sub:'surface',        zone:'interp', cx:1060,cy:250, r:18, col:'#c66057' },
  { id:'venus-orbit',   label:'VENUS',   sub:'orbit',          zone:'interp', cx:960, cy:400, r:18, col:'#c69057' },
];

// dv label pill positions (lx,ly) are midpoints on each edge line.
const PROG_NM_EDGES = [
  { id:'surface-leo',  from:'earth-surface', to:'leo',           dv:9400,  lx:205, ly:394 },
  { id:'leo-gto',      from:'leo',           to:'gto',           dv:2440,  lx:175, ly:300 },
  { id:'gto-geo',      from:'gto',           to:'geo',           dv:1500,  lx:235, ly:243 },
  { id:'leo-tlc',      from:'leo',           to:'tlc',           dv:3150,  lx:360, ly:293 },
  { id:'tlc-dro',      from:'tlc',           to:'dro',           dv:820,   lx:496, ly:198 },
  { id:'tlc-llo',      from:'tlc',           to:'llo',           dv:900,   lx:512, ly:307 },
  { id:'llo-moon',     from:'llo',           to:'moon-surface',  dv:1870,  lx:554, ly:392 },
  { id:'leo-mars',     from:'leo',           to:'mars-transit',  dv:3650,  lx:492, ly:257, dashed:true },
  { id:'mars-moi',     from:'mars-transit',  to:'mars-orbit',    dv:900,   lx:870, ly:165 },
  { id:'mars-land',    from:'mars-orbit',    to:'mars-surface',  dv:3800,  lx:1022,ly:196 },
  { id:'leo-venus',    from:'leo',           to:'venus-transit', dv:3500,  lx:492, ly:362, dashed:true },
  { id:'venus-voi',    from:'venus-transit', to:'venus-orbit',   dv:820,   lx:870, ly:383 },
];
// ── Node Map renderer ─────────────────────────────────────────────────────────
function progRenderNodeMap() {
  const svg = document.getElementById('prog-nm-canvas');
  if (!svg) return;

  const W = 1100, H = 520;

  // Zone column backgrounds — match conops_mockups.html Model 3 layout
  const ZONES = [
    { x:80,  w:300, bg:'rgba(87,198,136,.03)',  lbl:'EARTH ZONE',     lc:'#57c687' },
    { x:400, w:260, bg:'rgba(180,180,200,.025)',lbl:'LUNAR ZONE',      lc:'#aaaacc' },
    { x:680, w:400, bg:'rgba(198,96,87,.02)',   lbl:'INTERPLANETARY',  lc:'#c66057' },
  ];

  // Determine which edges are in the current mission's active path
  const activeEdges = _progNmActiveEdgeIds();

  let s = '';

  // Defs: arrowhead markers
  s += '<defs>';
  s += '<marker id="nm-a" markerWidth="6" markerHeight="6" refX="5" refY="2.5" orient="auto"><path d="M0,0 L0,5 L6,2.5 z" fill="#3a3b55"/></marker>';
  s += '<marker id="nm-ag" markerWidth="6" markerHeight="6" refX="5" refY="2.5" orient="auto"><path d="M0,0 L0,5 L6,2.5 z" fill="#88c657"/></marker>';
  s += '</defs>';

  // Zone backgrounds + bottom labels
  for (const z of ZONES) {
    s += `<rect x="${z.x}" y="20" width="${z.w}" height="${H - 30}" fill="${z.bg}" rx="4"/>`;
    s += `<text x="${z.x + z.w/2}" y="${H - 4}" text-anchor="middle" fill="${z.lc}" font-size="9" font-family="monospace" letter-spacing="2" opacity=".6">${z.lbl}</text>`;
  }

  // Zone dividers
  s += `<line x1="400" y1="0" x2="400" y2="${H}" stroke="#2a2b38" stroke-width=".5"/>`;
  s += `<line x1="680" y1="0" x2="680" y2="${H}" stroke="#2a2b38" stroke-width=".5"/>`;

  // Edges (dim first, then active on top)
  for (const pass of ['dim', 'active']) {
    for (const edge of PROG_NM_EDGES) {
      const fn = PROG_NM_NODES.find(n => n.id === edge.from);
      const tn = PROG_NM_NODES.find(n => n.id === edge.to);
      if (!fn || !tn) continue;
      const isAct = activeEdges.includes(edge.id);
      if ((pass === 'active') !== isAct) continue;

      const col     = isAct ? '#88c657' : '#3a3b55';
      const lw      = isAct ? 2.2 : 1.3;
      const da      = edge.dashed ? '5,3' : '';
      const opacity = isAct ? '.85' : '.7';
      const marker  = isAct ? 'nm-ag' : 'nm-a';

      s += `<line x1="${fn.cx}" y1="${fn.cy}" x2="${tn.cx}" y2="${tn.cy}"` +
           ` stroke="${col}" stroke-width="${lw}" stroke-opacity="${opacity}"` +
           (da ? ` stroke-dasharray="${da}"` : '') +
           ` marker-end="url(#${marker})"` +
           ` class="nm-edge" data-eid="${edge.id}"` +
           ` onmousemove="progNmEdgeHover(event,'${edge.id}')" onmouseleave="progNmHideTip()"` +
           ` onclick="progNmEdgeClick('${edge.id}')"` +
           ` style="cursor:pointer;pointer-events:stroke;"/>`;

      // ΔV label pill — sized for 1100x520 canvas
      const dvStr = (edge.dv >= 1000)
        ? (edge.dv/1000).toFixed(1) + 'k m/s'
        : edge.dv + ' m/s';
      s += `<rect x="${edge.lx - 26}" y="${edge.ly - 8}" width="52" height="14" rx="3" fill="#13141c" opacity=".92"/>`;
      s += `<text x="${edge.lx}" y="${edge.ly + 2}" text-anchor="middle" fill="${isAct ? '#88c657' : '#4a4b60'}" font-size="8" font-family="monospace">${dvStr}</text>`;
    }
  }

  // Nodes — label + sublabel sized for the full canvas
  for (const node of PROG_NM_NODES) {
    const da  = node.dashed ? 'stroke-dasharray="4,3"' : '';
    const sw  = node.r >= 20 ? 2.5 : 2;
    const fs  = node.r >= 20 ? 10 : 9;   // font size scales with node radius
    const fss = 7;                        // sub-label font size
    s += `<circle cx="${node.cx}" cy="${node.cy}" r="${node.r}" fill="#16181c" stroke="${node.col}" stroke-width="${sw}" ${da}/>`;
    s += `<text x="${node.cx}" y="${node.cy - 1}" text-anchor="middle" dominant-baseline="middle" fill="${node.col}" font-size="${fs}" font-family="monospace" font-weight="500">${node.label}</text>`;
    s += `<text x="${node.cx}" y="${node.cy + node.r + 10}" text-anchor="middle" fill="#5a6070" font-size="${fss}" font-family="monospace">${node.sub}</text>`;
  }

  // Vehicle position indicators — dashed ring + name tag below node
  if (PROG_ACTIVE_PROGRAM) {
    Object.values(PROG_ACTIVE_PROGRAM.vehicles).forEach(fv => {
      if (fv.status === 'EXPENDED') return;
      const nid = _progNmVehicleNode(fv);
      const n   = PROG_NM_NODES.find(nd => nd.id === nid);
      if (!n) return;
      s += `<circle cx="${n.cx}" cy="${n.cy}" r="${n.r + 6}" fill="none" stroke="${fv.color}" stroke-width="2" stroke-dasharray="4,3" opacity=".8"/>`;
      s += `<text x="${n.cx}" y="${n.cy + n.r + 22}" text-anchor="middle" fill="${fv.color}" font-size="8" font-family="monospace">${fv.name.slice(0,14)}</text>`;
    });
  }

  svg.innerHTML = s;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Return edge IDs that appear in the current program's BURN events. */
function _progNmActiveEdgeIds() {
  if (!PROG_ACTIVE_PROGRAM) return [];
  const ids = [];
  for (const ev of (PROG_ACTIVE_PROGRAM.events || [])) {
    if (ev.type !== 'BURN') continue;
    if (ev.fromNode && ev.toNode) {
      const e = PROG_NM_EDGES.find(ed => ed.from === ev.fromNode && ed.to === ev.toNode);
      if (e && !ids.includes(e.id)) ids.push(e.id);
    }
  }
  return ids;
}

/** Map a FlightVehicle's current OrbitalState to the nearest canonical node id. */
function _progNmVehicleNode(fv) {
  const os = fv.orbitState;
  if (!os) return 'earth-surface';
  if (os.surface) {
    if (os.body === 'Moon')  return 'moon-surface';
    if (os.body === 'Mars')  return 'mars-surface';
    return 'earth-surface';
  }
  const alt = (os.apogee + os.perigee) / 2;
  const body = os.body;
  if (body === 'Earth') {
    if (alt < 2000)   return 'leo';
    if (alt < 20000)  return 'gto';
    return 'geo';
  }
  if (body === 'Moon') return alt < 500 ? 'llo' : 'dro';
  if (body === 'Mars') return alt < 1000 ? 'mars-surface' : 'mars-orbit';
  if (body === 'Venus') return 'venus-orbit';
  return 'leo';
}

// ── Interactions ───────────────────────────────────────────────────────────────

function progNmEdgeHover(evt, edgeId) {
  const edge = PROG_NM_EDGES.find(e => e.id === edgeId);
  if (!edge) return;
  const fn = PROG_NM_NODES.find(n => n.id === edge.from);
  const tn = PROG_NM_NODES.find(n => n.id === edge.to);
  const tip = progNmGetTip();
  tip.innerHTML =
    `<span style="color:#88c657">${fn?.label || edge.from}</span>` +
    ` \u2192 <span style="color:#88c657">${tn?.label || edge.to}</span><br>` +
    `\u0394V: <span style="color:#e5c07b">${edge.dv.toLocaleString()} m/s</span><br>` +
    `<span style="color:#4a4b60;font-size:9px">click to insert BURN event</span>`;
  tip.style.display  = 'block';
  tip.style.left     = (evt.clientX + 14) + 'px';
  tip.style.top      = (evt.clientY - 10) + 'px';
}

/**
 * Edge click: create a BURN event in the active program with this edge's ΔV.
 * Attaches to the currently selected vehicle, or the first non-expended one.
 */
function progNmEdgeClick(edgeId) {
  progNmHideTip();
  if (!PROG_ACTIVE_PROGRAM) return;
  const edge = PROG_NM_EDGES.find(e => e.id === edgeId);
  if (!edge) return;

  // Pick a vehicle
  const fvList = Object.values(PROG_ACTIVE_PROGRAM.vehicles).filter(fv => fv.status !== 'EXPENDED');
  if (!fvList.length) { alert('No active vehicles. Load a demo or insert a LAUNCH first.'); return; }
  const selEv = PROG_BAND_STATE.selId
    ? PROG_ACTIVE_PROGRAM.events.find(e => e.eventId === PROG_BAND_STATE.selId)
    : null;
  const fv = (selEv && PROG_ACTIVE_PROGRAM.vehicles[selEv.vehicleId]) || fvList[0];

  // Pick tStart: day after last event on this vehicle (or mid-view)
  const fvEvs  = (PROG_ACTIVE_PROGRAM.events || []).filter(e => e.vehicleId === fv.vehicleId);
  const lastT  = fvEvs.length ? Math.max(...fvEvs.map(e => e.tEnd ?? e.tStart)) : 0;
  const tStart = lastT + 86400;
  const tEnd   = tStart + 600;   // 10-minute burn default

  const ev = progMakeEvent('BURN', {
    label:     edge.from.toUpperCase().replace(/-/g, '\u2192') + ' burn',
    vehicleId: fv.vehicleId,
    tStart, tEnd,
    dvTarget:  edge.dv,
    fromNode:  edge.from,
    toNode:    edge.to,
    result:    'PENDING',
  });
  PROG_ACTIVE_PROGRAM.events.push(ev);
  PROG_ACTIVE_PROGRAM.events.sort((a, b) => a.tStart - b.tStart);

  // Scroll Band View to show the new event
  const margin = (PROG_BAND_STATE.tEnd - PROG_BAND_STATE.tStart) * 0.1;
  if (tStart > PROG_BAND_STATE.tEnd - margin) {
    PROG_BAND_STATE.tEnd = tEnd + (PROG_BAND_STATE.tEnd - PROG_BAND_STATE.tStart) * 0.2;
  }

  progUpdateEventEditor(ev.eventId);
  const evPane = document.getElementById('prog-rt-ev-pane');
  if (evPane && evPane.style.display === 'none') progRightTab('ev');
  progRenderBandView();   // This also calls progRenderNodeMap()
}

// ── Phase 8 tests (pure JS, no DOM) ──────────────────────────────────────────
const PROG_P8_TEST_RESULTS = (() => {
  const T = [
    { label:'NM: 14 nodes defined',            val: PROG_NM_NODES.length,                   target:14, tol:0 },
    { label:'NM: 12 edges defined',            val: PROG_NM_EDGES.length,                   target:12, tol:0 },
    { label:'NM: leo node present',            val: PROG_NM_NODES.some(n=>n.id==='leo')?1:0, target:1, tol:0 },
    { label:'NM: surface-leo edge present',    val: PROG_NM_EDGES.some(e=>e.id==='surface-leo')?1:0, target:1, tol:0 },
    { label:'NM: Earth LEO maps to leo',       val: _progNmVehicleNode({orbitState:progMakeOrbitalState('Earth',185,28.5,0)}), target:'leo', tol:null },
    { label:'NM: Moon surface maps to moon',   val: _progNmVehicleNode({orbitState:progMakeSurfaceState('Moon')}),            target:'moon-surface', tol:null },
    { label:'NM: active edges empty w/o burns',val: _progNmActiveEdgeIds().length,           target:0, tol:0 },
  ];
  return T.map(t => ({
    label: t.label, val: t.val, target: t.target,
    pass: t.tol === null
      ? (t.val === t.target)
      : (Math.abs(Number(t.val) - Number(t.target)) <= t.tol),
  }));
})();
// ─── PROGRAM MODULE — Phase 9: Spacecraft Definition Editor ─────────────────
//
// SpacecraftDefinition: a named, ordered stage stack stored in the program.
// LAUNCH events may reference a spacecraftId; the spacecraft's stages are
// appended on top of (i.e. above) the launch vehicle upper stage.
//
// stage stack convention (same as Phase 2/3): stages[0]=bottom, stages[last]=top.
// A spacecraft typically sits above the LV upper stage, so spacecraft stages are
// appended AFTER the LV stages in the array.

// ── Structs ───────────────────────────────────────────────────────────────────

/**
 * A single stage blueprint inside a SpacecraftDefinition.
 * These are serializable (no live propellant state). Convert via progSpacecraftToLiveStages.
 */
function progMakeSpacecraftStageDef(name) {
  return {
    stageId:             progUUID(),
    name:                name ?? 'Stage',
    dry_mass:            500,        // kg
    isp:                 320,        // s, vacuum Isp
    propKg:              0,          // propellant capacity kg
    propType:            'MMH/NTO',  // propellant type key
    // Spec §10 extended fields
    crewCapacity:        0,          // number of crew seats
    dockingPorts:        0,          // number of docking ports
    tunnelCapable:       false,      // pressurised tunnel to adjacent stage
    descentPropFraction: 0,          // fraction of propKg reserved for powered descent (0–1)
  };
}

function progMakeSpacecraftDefinition(name) {
  return {
    spacecraftId: progUUID(),
    name:         name ?? 'Spacecraft',
    stages:       [],  // SpacecraftStageDef[], bottom → top
  };
}

/**
 * Convert a SpacecraftDefinition to LiveStages[] for inclusion in a LAUNCH event.
 * Returns stages ordered bottom → top, matching the stage stack convention.
 */
function progSpacecraftToLiveStages(scd) {
  return scd.stages.map(def => {
    const tanks = def.propKg > 0
      ? [progMakeTank(def.propType || 'MMH/NTO', def.propKg)]
      : [];
    const ls = progMakeLiveStage(def.stageId, tanks, 0, def.dry_mass, def.isp);
    ls.crewCapacity        = def.crewCapacity        ?? 0;
    ls.dockingPorts        = def.dockingPorts         ?? 0;
    ls.tunnelCapable       = def.tunnelCapable        ?? false;
    ls.descentPropFraction = def.descentPropFraction  ?? 0;
    return ls;
  });
}

// ── Spacecraft editor UI ──────────────────────────────────────────────────────

let _progScSelId = null;  // currently selected spacecraft ID in editor modal

function progOpenSpacecraftEditor() {
  if (!PROG_ACTIVE_PROGRAM) return;
  _progScSelId = PROG_ACTIVE_PROGRAM.spacecraftDefinitions[0]?.spacecraftId ?? null;
  progRenderSpacecraftList();
  progRenderSpacecraftDetail(_progScSelId);
  openModal('modal-spacecraft');
}

function progRenderSpacecraftList() {
  const col = document.getElementById('prog-sc-list-col');
  if (!col || !PROG_ACTIVE_PROGRAM) return;
  const defs = PROG_ACTIVE_PROGRAM.spacecraftDefinitions;
  const items = defs.map(sc =>
    `<div onclick="progSelectSpacecraft('${sc.spacecraftId}')"
      style="padding:6px 8px;cursor:pointer;border-radius:2px;font-family:var(--mono);font-size:10px;
             color:${sc.spacecraftId===_progScSelId?'var(--text-bright)':'var(--text-dim)'};
             background:${sc.spacecraftId===_progScSelId?'rgba(255,255,255,.07)':'transparent'};
             border-left:2px solid ${sc.spacecraftId===_progScSelId?'var(--accent)':'transparent'};
             margin-bottom:2px;">
      ${sc.name}
    </div>`
  ).join('');
  col.innerHTML =
    `<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:.12em;margin-bottom:6px;">SPACECRAFT</div>` +
    (items || '<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);opacity:.5;padding:4px 0;">// none defined</div>') +
    `<button onclick="progAddSpacecraft()" style="margin-top:8px;width:100%;font-family:var(--mono);font-size:10px;background:transparent;border:1px solid var(--border);color:var(--accent);padding:4px;cursor:pointer;letter-spacing:.06em;">+ New</button>`;
}

function progSelectSpacecraft(id) {
  _progScSelId = id;
  progRenderSpacecraftList();
  progRenderSpacecraftDetail(id);
}

function progAddSpacecraft() {
  if (!PROG_ACTIVE_PROGRAM) return;
  const sc = progMakeSpacecraftDefinition('Spacecraft ' + (PROG_ACTIVE_PROGRAM.spacecraftDefinitions.length + 1));
  PROG_ACTIVE_PROGRAM.spacecraftDefinitions.push(sc);
  progSelectSpacecraft(sc.spacecraftId);
}

function progDeleteSpacecraft(id) {
  if (!PROG_ACTIVE_PROGRAM) return;
  PROG_ACTIVE_PROGRAM.spacecraftDefinitions = PROG_ACTIVE_PROGRAM.spacecraftDefinitions.filter(s => s.spacecraftId !== id);
  _progScSelId = PROG_ACTIVE_PROGRAM.spacecraftDefinitions[0]?.spacecraftId ?? null;
  progRenderSpacecraftList();
  progRenderSpacecraftDetail(_progScSelId);
}

function progRenderSpacecraftDetail(id) {
  const col = document.getElementById('prog-sc-detail-col');
  if (!col) return;
  if (!id || !PROG_ACTIVE_PROGRAM) {
    col.innerHTML = '<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);padding:12px 0;">// Select or create a spacecraft</div>';
    return;
  }
  const sc = PROG_ACTIVE_PROGRAM.spacecraftDefinitions.find(s => s.spacecraftId === id);
  if (!sc) { col.innerHTML = '<div style="font-family:var(--mono);font-size:10px;color:var(--text-dim);">// Not found</div>'; return; }

  const stagePropTypes = Object.keys(PROG_PROPELLANT_TYPES);

  const stageRows = sc.stages.map((st, i) => `
    <div style="border:1px solid var(--border);border-radius:2px;padding:10px;margin-bottom:8px;background:rgba(0,0,0,.25);">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
        <span style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:.1em;">STAGE ${i}</span>
        <input value="${st.name}" oninput="progUpdateStageDef('${id}','${st.stageId}','name',this.value)"
          style="flex:1;background:rgba(0,0,0,.4);border:1px solid var(--border);color:var(--text-bright);font-family:var(--mono);font-size:11px;padding:3px 6px;">
        <button onclick="progDeleteSpacecraftStage('${id}','${st.stageId}')"
          style="font-family:var(--mono);font-size:9px;background:transparent;border:1px solid var(--border);color:var(--accent2,#e06c75);padding:2px 6px;cursor:pointer;">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:6px;">
        <div>
          <div style="font-size:8px;color:var(--text-dim);letter-spacing:.1em;margin-bottom:2px;">DRY MASS (kg)</div>
          <input type="number" value="${st.dry_mass}" oninput="progUpdateStageDef('${id}','${st.stageId}','dry_mass',+this.value)"
            style="width:100%;background:rgba(0,0,0,.4);border:1px solid var(--border);color:var(--text-bright);font-family:var(--mono);font-size:10px;padding:3px 5px;box-sizing:border-box;">
        </div>
        <div>
          <div style="font-size:8px;color:var(--text-dim);letter-spacing:.1em;margin-bottom:2px;">ISP (s)</div>
          <input type="number" value="${st.isp}" oninput="progUpdateStageDef('${id}','${st.stageId}','isp',+this.value)"
            style="width:100%;background:rgba(0,0,0,.4);border:1px solid var(--border);color:var(--text-bright);font-family:var(--mono);font-size:10px;padding:3px 5px;box-sizing:border-box;">
        </div>
        <div>
          <div style="font-size:8px;color:var(--text-dim);letter-spacing:.1em;margin-bottom:2px;">PROP (kg)</div>
          <input type="number" value="${st.propKg}" oninput="progUpdateStageDef('${id}','${st.stageId}','propKg',+this.value)"
            style="width:100%;background:rgba(0,0,0,.4);border:1px solid var(--border);color:var(--text-bright);font-family:var(--mono);font-size:10px;padding:3px 5px;box-sizing:border-box;">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
        <div>
          <div style="font-size:8px;color:var(--text-dim);letter-spacing:.1em;margin-bottom:2px;">PROPELLANT TYPE</div>
          <select oninput="progUpdateStageDef('${id}','${st.stageId}','propType',this.value)"
            style="width:100%;background:rgba(0,0,0,.4);border:1px solid var(--border);color:var(--text-bright);font-family:var(--mono);font-size:10px;padding:3px 5px;box-sizing:border-box;">
            ${stagePropTypes.map(k=>`<option${k===st.propType?' selected':''}>${k}</option>`).join('')}
          </select>
        </div>
        <div>
          <div style="font-size:8px;color:var(--text-dim);letter-spacing:.1em;margin-bottom:2px;">CREW CAPACITY</div>
          <input type="number" min="0" value="${st.crewCapacity}" oninput="progUpdateStageDef('${id}','${st.stageId}','crewCapacity',+this.value)"
            style="width:100%;background:rgba(0,0,0,.4);border:1px solid var(--border);color:var(--text-bright);font-family:var(--mono);font-size:10px;padding:3px 5px;box-sizing:border-box;">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;">
        <div>
          <div style="font-size:8px;color:var(--text-dim);letter-spacing:.1em;margin-bottom:2px;">DOCKING PORTS</div>
          <input type="number" min="0" value="${st.dockingPorts}" oninput="progUpdateStageDef('${id}','${st.stageId}','dockingPorts',+this.value)"
            style="width:100%;background:rgba(0,0,0,.4);border:1px solid var(--border);color:var(--text-bright);font-family:var(--mono);font-size:10px;padding:3px 5px;box-sizing:border-box;">
        </div>
        <div style="display:flex;align-items:center;gap:4px;padding-top:14px;">
          <input type="checkbox" id="sc-tunnel-${st.stageId}" ${st.tunnelCapable?'checked':''}
            onchange="progUpdateStageDef('${id}','${st.stageId}','tunnelCapable',this.checked)"
            style="accent-color:var(--accent);">
          <label for="sc-tunnel-${st.stageId}" style="font-family:var(--mono);font-size:9px;color:var(--text-dim);cursor:pointer;">TUNNEL</label>
        </div>
        <div>
          <div style="font-size:8px;color:var(--text-dim);letter-spacing:.1em;margin-bottom:2px;">DESCENT PROP FRAC</div>
          <input type="number" min="0" max="1" step="0.05" value="${st.descentPropFraction}" oninput="progUpdateStageDef('${id}','${st.stageId}','descentPropFraction',+this.value)"
            style="width:100%;background:rgba(0,0,0,.4);border:1px solid var(--border);color:var(--text-bright);font-family:var(--mono);font-size:10px;padding:3px 5px;box-sizing:border-box;">
        </div>
      </div>
    </div>`).join('');

  col.innerHTML =
    `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
      <input value="${sc.name}" oninput="progUpdateSpacecraftName('${id}',this.value)"
        style="flex:1;background:rgba(0,0,0,.4);border:1px solid var(--border);color:var(--text-bright);font-family:var(--mono);font-size:13px;padding:5px 8px;font-weight:bold;">
      <button onclick="progDeleteSpacecraft('${id}')"
        style="font-family:var(--mono);font-size:9px;background:transparent;border:1px solid var(--border);color:var(--accent2,#e06c75);padding:4px 10px;cursor:pointer;letter-spacing:.05em;">Delete</button>
    </div>
    <div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);letter-spacing:.12em;margin-bottom:8px;">STAGE STACK &nbsp;<span style="opacity:.5;">(bottom → top)</span></div>` +
    (stageRows || '<div style="font-family:var(--mono);font-size:9px;color:var(--text-dim);opacity:.5;margin-bottom:8px;">// No stages — add one below</div>') +
    `<button onclick="progAddSpacecraftStage('${id}')"
      style="width:100%;font-family:var(--mono);font-size:10px;background:transparent;border:1px solid var(--border);color:var(--accent);padding:5px;cursor:pointer;letter-spacing:.06em;">+ Add Stage</button>
    <div style="margin-top:12px;font-family:var(--mono);font-size:9px;color:var(--text-dim);opacity:.6;">
      Spacecraft ID: ${id.slice(0,12)}… &nbsp;·&nbsp; ${sc.stages.length} stage${sc.stages.length!==1?'s':''}
    </div>`;
}

function progUpdateSpacecraftName(id, val) {
  if (!PROG_ACTIVE_PROGRAM) return;
  const sc = PROG_ACTIVE_PROGRAM.spacecraftDefinitions.find(s => s.spacecraftId === id);
  if (sc) { sc.name = val; progRenderSpacecraftList(); }
}

function progAddSpacecraftStage(scId) {
  if (!PROG_ACTIVE_PROGRAM) return;
  const sc = PROG_ACTIVE_PROGRAM.spacecraftDefinitions.find(s => s.spacecraftId === scId);
  if (!sc) return;
  sc.stages.push(progMakeSpacecraftStageDef('Stage ' + (sc.stages.length + 1)));
  progRenderSpacecraftDetail(scId);
}

function progDeleteSpacecraftStage(scId, stageId) {
  if (!PROG_ACTIVE_PROGRAM) return;
  const sc = PROG_ACTIVE_PROGRAM.spacecraftDefinitions.find(s => s.spacecraftId === scId);
  if (!sc) return;
  sc.stages = sc.stages.filter(s => s.stageId !== stageId);
  progRenderSpacecraftDetail(scId);
}

function progUpdateStageDef(scId, stageId, field, val) {
  if (!PROG_ACTIVE_PROGRAM) return;
  const sc = PROG_ACTIVE_PROGRAM.spacecraftDefinitions.find(s => s.spacecraftId === scId);
  if (!sc) return;
  const st = sc.stages.find(s => s.stageId === stageId);
  if (st) st[field] = val;
}

// ── Tests ─────────────────────────────────────────────────────────────────────
const PROG_P9_TEST_RESULTS = (() => {
  const sc = progMakeSpacecraftDefinition('CSM');
  sc.stages.push(progMakeSpacecraftStageDef('SM'));
  sc.stages.push(progMakeSpacecraftStageDef('CM'));
  sc.stages[0].dry_mass   = 6000;
  sc.stages[0].isp        = 314;
  sc.stages[0].propKg     = 18410;
  sc.stages[0].propType   = 'MMH/NTO';
  sc.stages[1].dry_mass   = 5560;
  sc.stages[1].crewCapacity = 3;
  sc.stages[1].dockingPorts = 1;
  sc.stages[1].tunnelCapable = true;

  const ls = progSpacecraftToLiveStages(sc);

  // LAUNCH integration test
  const p = progMakeProgram('SC-test');
  p.spacecraftDefinitions.push(sc);
  const ev = progMakeEvent('LAUNCH', {
    label:        'Apollo CSM',
    spacecraftId:  sc.spacecraftId,
    stages:        [],
    targetOrbit:   { body:'Earth', alt_km:185, inc_deg:28.5, lan_deg:0 },
    tStart:        0,
  });
  p.events.push(ev);
  const res = progDispatchEvent(p, ev);

  const fv = res.vehicleId ? p.vehicles[res.vehicleId] : null;

  const T = [
    { label:'P9: SpacecraftDef has spacecraftId',             val: typeof sc.spacecraftId,            target:'string',  tol:null },
    { label:'P9: SpacecraftDef stages array',                 val: sc.stages.length,                  target:2,         tol:0 },
    { label:'P9: StageDef has 4 extended fields',             val: ['crewCapacity','dockingPorts','tunnelCapable','descentPropFraction'].every(f=>f in sc.stages[0]) ? 1:0, target:1, tol:0 },
    { label:'P9: toLS – correct count',                       val: ls.length,                         target:2,         tol:0 },
    { label:'P9: toLS – SM has 1 tank',                       val: ls[0].tanks.length,                target:1,         tol:0 },
    { label:'P9: toLS – CM has 0 tanks',                      val: ls[1].tanks.length,                target:0,         tol:0 },
    { label:'P9: toLS – crewCapacity propagated',             val: ls[1].crewCapacity,                target:3,         tol:0 },
    { label:'P9: toLS – tunnelCapable propagated',            val: ls[1].tunnelCapable ? 1 : 0,       target:1,         tol:0 },
    { label:'P9: LAUNCH spacecraftId – result SUCCESS',       val: res.result,                        target:'SUCCESS', tol:null },
    { label:'P9: LAUNCH spacecraftId – vehicle created',      val: fv ? 1 : 0,                        target:1,         tol:0 },
    { label:'P9: LAUNCH spacecraftId – 2 stages in vehicle',  val: fv ? fv.stages.length : -1,        target:2,         tol:0 },
  ];
  return T.map(t => ({
    label: t.label, val: t.val, target: t.target,
    pass: t.tol === null
      ? (t.val === t.target)
      : (Math.abs(Number(t.val) - Number(t.target)) <= t.tol),
  }));
})();
// ─── PROGRAM MODULE — Phase 10: Save / Load & Closure Bar ───────────────────
//
// Save: serialize PROG_ACTIVE_PROGRAM to formatVersion:3 JSON and download.
// Load: read a .json file, validate formatVersion, restore as active program.
// Closure bar: per-vehicle status strip derived from event results.

// ── Save / Load ───────────────────────────────────────────────────────────────

function progSaveProgram() {
  if (!PROG_ACTIVE_PROGRAM) return;
  const data = Object.assign({ formatVersion: 3 }, PROG_ACTIVE_PROGRAM);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (PROG_ACTIVE_PROGRAM.name || 'program').replace(/[^a-z0-9_\-]/gi, '_') + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

function progLoadProgramFromFile() {
  const inp = document.getElementById('prog-load-file-input');
  if (inp) inp.click();
}

function _progHandleLoadFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    progLoadProgramJSON(ev.target.result);
    e.target.value = '';
  };
  reader.readAsText(file);
}

function progLoadProgramJSON(jsonStr) {
  let data;
  try { data = JSON.parse(jsonStr); } catch(err) { alert('Invalid JSON: ' + err.message); return; }
  if (data.formatVersion !== 3) {
    alert('Expected formatVersion 3, got ' + data.formatVersion + '.\nThis file may be from an older version.');
    return;
  }
  delete data.formatVersion;
  // Ensure required arrays exist (graceful forward-compat)
  data.events               = data.events               ?? [];
  data.vehicles             = data.vehicles             ?? {};
  data.pads                 = data.pads                 ?? [];
  data.spacecraftDefinitions = data.spacecraftDefinitions ?? [];
  data.nodeMapCustomNodes   = data.nodeMapCustomNodes   ?? [];
  data.performanceCases     = data.performanceCases     ?? [];
  PROG_ACTIVE_PROGRAM = data;
  PROG_BAND_STATE.selId   = null;
  PROG_BAND_STATE.tStart  = 0;
  const lastT = Math.max(...(data.events.map(e => e.tEnd ?? e.tStart ?? 0).concat([0])));
  PROG_BAND_STATE.tEnd    = Math.max(8 * 86400, lastT * 1.1);
  const nameEl = document.getElementById('prog-name-label');
  if (nameEl) nameEl.textContent = data.name || 'Untitled';
  progRenderSpaceport();
  progUpdateEventEditor(null);
  progRenderBandView();
}

// ── Closure bar ───────────────────────────────────────────────────────────────

function progRenderClosureBar() {
  const bar = document.getElementById('prog-closure-bar');
  if (!bar || !PROG_ACTIVE_PROGRAM) return;
  const vids = Object.keys(PROG_ACTIVE_PROGRAM.vehicles ?? {});
  if (!vids.length) { bar.style.display = 'none'; return; }

  const badges = vids.map(vid => {
    const fv  = PROG_ACTIVE_PROGRAM.vehicles[vid];
    const evs = (PROG_ACTIVE_PROGRAM.events ?? []).filter(e => e.vehicleId === vid);
    const hasFail = evs.some(e => e.result === 'FAILED');
    const hasMarg = evs.some(e => e.result === 'MARGINAL');
    const allDone = evs.length > 0 && evs.every(e => e.result === 'SUCCESS' || e.result === 'MARGINAL' || e.result === 'FAILED');
    const status  = hasFail ? 'FAIL' : hasMarg ? 'MARG' : allDone ? 'OK' : 'PEND';
    const scol    = { FAIL:'#e06c75', MARG:'#e5c07b', PEND:'#abb2bf', OK:'#98c379' }[status];
    return `<span style="display:inline-flex;align-items:center;gap:4px;font-family:var(--mono);font-size:9px;` +
           `padding:1px 7px;border:1px solid var(--border);margin-right:3px;white-space:nowrap;">` +
           `<span style="width:6px;height:6px;border-radius:50%;background:${fv.color||'#888'};flex-shrink:0;display:inline-block;"></span>` +
           `<span style="color:var(--text-dim);">${fv.name}</span>` +
           `<span style="color:${scol};letter-spacing:.04em;">${status}</span></span>`;
  }).join('');

  bar.style.display = 'flex';
  bar.innerHTML =
    `<span style="font-family:var(--mono);font-size:8px;color:var(--text-dim);letter-spacing:.15em;` +
    `margin-right:8px;white-space:nowrap;align-self:center;">CLOSURE</span>` + badges;
}

// ── Tests ─────────────────────────────────────────────────────────────────────
const PROG_P10_TEST_RESULTS = (() => {
  // Save/load round-trip
  const orig = progMakeProgram('Save Test');
  orig.pads  = [progMakePad('LC-39A','39A','KSC',72)];
  const sc   = progMakeSpacecraftDefinition('Orion');
  sc.stages.push(progMakeSpacecraftStageDef('CM'));
  orig.spacecraftDefinitions.push(sc);
  const json = JSON.stringify(Object.assign({ formatVersion: 3 }, orig));

  let parsed;
  try { parsed = JSON.parse(json); } catch(e) { parsed = null; }
  const fmtOk = parsed?.formatVersion === 3;
  delete parsed?.formatVersion;

  // Restore: simulate progLoadProgramJSON without touching global state
  const restored = parsed ? Object.assign({ events:[], vehicles:{}, pads:[], spacecraftDefinitions:[], nodeMapCustomNodes:[], performanceCases:[] }, parsed) : null;

  // Closure bar logic unit test
  const prog2 = progMakeProgram('Closure Test');
  const fv2   = progMakeFlightVehicle('Rocket', [], progMakeOrbitalState('Earth',185,0,0), '#61afef');
  prog2.vehicles[fv2.vehicleId] = fv2;
  const evOK  = progMakeEvent('COAST', { vehicleId: fv2.vehicleId, tStart:0, tEnd:3600 });
  evOK.result = 'SUCCESS';
  prog2.events.push(evOK);
  const vids2 = Object.keys(prog2.vehicles);
  const evs2  = prog2.events.filter(e => e.vehicleId === vids2[0]);
  const status2 = evs2.every(e => e.result === 'SUCCESS') ? 'OK' : 'FAIL';

  const T = [
    { label:'P10: save produces formatVersion:3',          val: fmtOk ? 1 : 0,                                   target:1,     tol:0 },
    { label:'P10: round-trip preserves program name',      val: restored?.name,                                  target:'Save Test', tol:null },
    { label:'P10: round-trip preserves pad count',         val: restored?.pads?.length,                          target:1,     tol:0 },
    { label:'P10: round-trip preserves spacecraft count',  val: restored?.spacecraftDefinitions?.length,         target:1,     tol:0 },
    { label:'P10: round-trip spacecraft name intact',      val: restored?.spacecraftDefinitions?.[0]?.name,      target:'Orion', tol:null },
    { label:'P10: closure – all-SUCCESS → OK',             val: status2,                                         target:'OK',  tol:null },
  ];
  return T.map(t => ({
    label: t.label, val: t.val, target: t.target,
    pass: t.tol === null
      ? (t.val === t.target)
      : (Math.abs(Number(t.val) - Number(t.target)) <= t.tol),
  }));
})();
// ─── END PROGRAM MODULE Phase 10 ──────────────────────────────────────────────

// ─── END PROGRAM MODULE Phase 9 ───────────────────────────────────────────────

// ── View switching ────────────────────────────────────────────────────────────
let PROG_VIEW_MODE = 'timeline'; // 'timeline' | 'nodemap'

function progSwitchView(mode) {
  PROG_VIEW_MODE = mode;
  const bw   = document.getElementById('prog-band-wrap');
  const nmv  = document.getElementById('prog-nm-view');
  const rp   = document.getElementById('prog-right-panel');
  const tlB  = document.getElementById('prog-view-tl-btn');
  const nmB  = document.getElementById('prog-view-nm-btn');

  if (mode === 'nodemap') {
    if (bw)  bw.style.display  = 'none';
    if (nmv) nmv.style.display = 'flex';
    // Right panel stays visible for event editor access
    if (tlB) { tlB.style.background = 'transparent'; tlB.style.borderColor = 'var(--border)'; tlB.style.color = 'var(--text-dim)'; }
    if (nmB) { nmB.style.background = 'rgba(136,198,87,.1)'; nmB.style.borderColor = 'var(--accent)'; nmB.style.color = 'var(--accent)'; }
    progRenderNodeMap();
  } else {
    if (bw)  bw.style.display  = 'block';
    if (nmv) nmv.style.display = 'none';
    if (tlB) { tlB.style.background = 'rgba(136,198,87,.1)'; tlB.style.borderColor = 'var(--accent)'; tlB.style.color = 'var(--accent)'; }
    if (nmB) { nmB.style.background = 'transparent'; nmB.style.borderColor = 'var(--border)'; nmB.style.color = 'var(--text-dim)'; }
    progRenderBandView();
  }
}

// ─── END PROGRAM MODULE Phase 8 ───────────────────────────────────────────────

// ─── END PROGRAM MODULE Phase 7 ───────────────────────────────────────────────

// ─── END PROGRAM MODULE Phase 6 ───────────────────────────────────────────────

// ─── END PROGRAM MODULE Phase 5 ───────────────────────────────────────────────

// ─── END PROGRAM MODULE Phase 4 ───────────────────────────────────────────────

// ─── END PROGRAM MODULE Phase 3 ───────────────────────────────────────────────

// ─── END PROGRAM MODULE Phase 2 ─────────────────────────────────────────────────────────

// ─── END PROGRAM MODULE Phase 1 ─────────────────────────────────────────────────────


// ─── INIT ────────────────────────────────────────
buildTable();
buildPresets();
buildOrbitCategories();
buildSiteSelector();
buildStageLibrary();
buildCaseList();
updateFilterChips();
applyTheme('perigee');
// Initialise default active program with demo pads
(function(){
  const p = progMakeProgram('New Program');
  p.pads = [
    progMakePad('LC-39A',     '39A', 'KSC',  72),
    progMakePad('LC-39B',     '39B', 'KSC',  72),
    progMakePad('Baikonur 1', 'BK1', 'BK',   48),
    progMakePad('Vandenberg', 'SLC', 'VAFB', 48),
  ];
  PROG_ACTIVE_PROGRAM = p;
  progRenderSpaceport();
})();
progRenderTestResults();
progInitPorkchop();
progInitBandView();
progRenderNodeMap();

// Delegated listeners for user-defined tracking
document.getElementById('stage-tbody').addEventListener('input',e=>{
  if(_suppressUD)return;
  // Clear the library name for the column being manually edited
  const td=e.target.closest('td');
  const tr=e.target.closest('tr');
  if(td&&tr){
    const colIdx=[...tr.cells].indexOf(td)-1; // -1 for label column
    if(colIdx>=0&&colIdx<15){currentStageNames[colIdx]=null;stageSaved[colIdx]=false;}
    buildStageComposition();
  }
  markLVUserDefined();
});
['fairing-mass','fairing-jettison','b_dry','b_prop','b_thrust','b_isp','b_res','num-boosters'].forEach(id=>{
  const el=document.getElementById(id);
  if(el)el.addEventListener('change',()=>markLVUserDefined());
});
