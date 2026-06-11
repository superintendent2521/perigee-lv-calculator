
// ─── PROGRAM MODULE — Phase 7: Band View ─────────────────────────────────────

// ── Constants ─────────────────────────────────────────────────────────────────

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
// Result → node colour

// ΔV → node radius

// ── Band View state ───────────────────────────────────────────────────────────

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


