
// ─── AUTOSAVE / SESSION RESTORE ──────────────────────────────────────────────
//
// Persists the whole session (program + current LV) to localStorage on a
// debounce, and offers to restore it on next load via a dismissible banner.
// Never allowed to throw into the caller — save/restore failures are caught
// and swallowed (with a single console.warn) so a full/corrupt localStorage
// can never break the app.

const AUTOSAVE_KEY = 'lv_autosave_v1';

let _autosaveTimer = null;
let _autosaveDisabled = false;   // set true after a save failure (quota, etc.)
// Suspended from module load until the startup restore-banner decision is made
// (or immediately if there's nothing to restore). Without this, the page's own
// init calls (scEdInit/fleetInit/missionInit rendering default state) would
// schedule an autosave that clobbers the still-unread saved blob before the
// user ever sees the banner.
let _autosaveSuspended = true;

function autosaveScheduleSave() {
  if (_autosaveDisabled || _autosaveSuspended) return;
  clearTimeout(_autosaveTimer);
  _autosaveTimer = setTimeout(autosaveNow, 2000);
}

function autosaveNow() {
  if (_autosaveDisabled || _autosaveSuspended) return;
  try {
    const blob = {
      savedAt: new Date().toISOString(),
      program: (typeof buildProgramObject === 'function') ? buildProgramObject() : null,
      lv: (typeof buildLVObject === 'function') ? buildLVObject((typeof loadedVehicleName !== 'undefined' ? loadedVehicleName : '') || '', '') : null,
    };
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(blob));
  } catch (err) {
    _autosaveDisabled = true;
    console.warn('Autosave disabled for this session (localStorage write failed):', err);
  }
}

function autosaveClear() {
  try { localStorage.removeItem(AUTOSAVE_KEY); } catch (err) { /* ignore */ }
}

function autosaveRestore() {
  let blob = null;
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return false;
    blob = JSON.parse(raw);
  } catch (err) {
    return false; // corrupt data — bail silently
  }
  if (!blob) return false;
  _autosaveSuspended = true;
  try {
    if (blob.program && typeof applyProgramObject === 'function') {
      applyProgramObject(blob.program);
    }
    if (blob.lv && typeof applyLVObject === 'function') {
      applyLVObject(blob.lv);
    }
  } catch (err) {
    console.warn('Autosave restore failed partway through:', err);
  } finally {
    _autosaveSuspended = false;
  }
  return true;
}

// ── Restore banner ──────────────────────────────────────────────────────────

function _autosaveRelativeTime(iso) {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return 'earlier';
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return diffSec + 's ago';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return diffMin + 'm ago';
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return diffHr + 'h ago';
  const diffDay = Math.round(diffHr / 24);
  return diffDay + 'd ago';
}

function _autosaveDismissBanner() {
  const el = document.getElementById('autosave-banner');
  if (el) el.remove();
}

function autosaveShowBannerIfPresent() {
  let raw;
  try { raw = localStorage.getItem(AUTOSAVE_KEY); } catch (err) { _autosaveSuspended = false; return; }
  if (!raw) { _autosaveSuspended = false; return; }
  let blob;
  try { blob = JSON.parse(raw); } catch (err) { _autosaveSuspended = false; return; }
  if (!blob) { _autosaveSuspended = false; return; }

  const banner = document.createElement('div');
  banner.id = 'autosave-banner';
  banner.className = 'autosave-banner';
  const when = _autosaveRelativeTime(blob.savedAt);
  banner.innerHTML =
    '<span class="autosave-banner-msg">Restored session from ' + when + '?</span>' +
    '<button type="button" class="autosave-banner-btn autosave-banner-restore">Restore</button>' +
    '<button type="button" class="autosave-banner-btn autosave-banner-discard">Discard</button>';
  document.body.appendChild(banner);

  banner.querySelector('.autosave-banner-restore').addEventListener('click', () => {
    autosaveRestore();
    _autosaveSuspended = false;
    _autosaveDismissBanner();
  });
  banner.querySelector('.autosave-banner-discard').addEventListener('click', () => {
    autosaveClear();
    _autosaveSuspended = false;
    _autosaveDismissBanner();
  });

  setTimeout(() => { _autosaveSuspended = false; _autosaveDismissBanner(); }, 60000);
}

window.addEventListener('beforeunload', () => {
  try { autosaveNow(); } catch (err) { /* never block unload */ }
});

function _autosaveInitStartup() {
  autosaveShowBannerIfPresent();
}

document.addEventListener('DOMContentLoaded', _autosaveInitStartup);
// In case this script runs after DOMContentLoaded already fired (it's loaded
// at the end of body via the build), also try immediately.
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  _autosaveInitStartup();
}
