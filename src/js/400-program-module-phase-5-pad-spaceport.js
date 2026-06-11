
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

function progSetActiveProgram(p) { PROG_ACTIVE_PROGRAM = p; }

/** Format seconds as "Xh Ym" countdown string. */
function _progFmtCountdown(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.ceil((seconds % 3600) / 60);
  return h > 0 ? h + 'h ' + m + 'm' : m + 'm';
}

/** Render the spaceport pad list into #prog-pad-list. */
/** Load an LV Calculator .json file into the active program's vehicleDefinitions[]. */

/**
 * Convert a VehicleDefinition (LV .json) to LiveStage[] for use in a LAUNCH event.
 * Assigns propellant type based on Isp: >400 → LOX_LH2, 310-400 → LOX_CH4, else LOX_RP1.
 */
function progVehicleDefToLiveStages(vdef) {
  const stages = vdef.stageData || [];
  const names  = vdef.stageNames || [];
  return stages.map((sd, i) => {
    const isp  = sd.isp || 1;
    const prop = sd.prop || 0;
    const ptype = isp > 400 ? 'LOX_LH2' : isp > 310 ? 'LOX_CH4' : 'LOX_RP1';
    const tanks = prop > 0 ? [progMakeTank(ptype, prop)] : [];
    const name  = names[i] || ('Stage ' + (i + 1));
    return progMakeLiveStage(name, tanks, 0, sd.dry || 0, isp);
  });
}

/** Render the loaded vehicle list into #prog-vehicle-list. */



// ── Phase 5 self-tests ────────────────────────────────────────────────────────
const PROG_P5_TEST_RESULTS = (() => { try {
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
} catch(e){console.error('Test IIFE error:',e);return[];} })();
