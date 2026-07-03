
// ─── CONDENSE RESULTS PANEL ───────────────────
// Progressive-disclosure pass for #results-panel, run AFTER calculateWithS15()
// (never inside calculate()/evalAtPayload() — those are untouchable). renderResults()
// in 160-calculate.js writes a flat sequence of `.result-row` divs into #results-panel:
//   1. Target
//   2. Est. Max Payload        <- headline
//   3. Capacity Range (±10%)   <- headline
//   4. Mission Feasible?
//   5. Total ΔV Available
//   ... (several more .result-row)
//   .stage-breakdown  (bars + per-stage list)
//   .note             (method footnote)
// This walks the rendered DOM and wraps everything AFTER "Capacity Range" in a
// collapsible "▸ Full breakdown" section. Idempotent: if the wrapper already
// exists it just re-collects any new trailing siblings (safe to call repeatedly,
// e.g. after every recalculation). Remembers expanded/collapsed state for the
// session in a module var. Safe no-op if calculate() rendered an error message
// (no .result-row present) or if the panel is missing.
let _condenseResultsExpanded = false;

function condenseResultsPanel(){
  const panel = document.getElementById('results-panel');
  if (!panel) return;
  if (panel.querySelector('.error-msg') || panel.querySelector('.placeholder-msg')) return;

  const rows = Array.from(panel.querySelectorAll(':scope > .result-row'));
  if (rows.length < 3) return; // not the expected result shape — bail safely

  // Headline = Target + Est. Max Payload + Capacity Range (first 3 rows).
  const headlineRows = rows.slice(0, 3);
  const restStart = rows[3] || null;

  // Idempotency: if a previous condense pass left a wrapper, remove it and its
  // contents' ownership marker so we can rebuild cleanly from the current
  // (freshly re-rendered) panel.innerHTML — calculate() re-renders the whole
  // panel from scratch each time, so any prior wrapper is now stale/detached
  // markup risk; simplest safe approach is to rebuild every time.
  const existingWrap = panel.querySelector('#results-full-breakdown-wrap');
  if (existingWrap) {
    // Unwrap: move children back to panel before the wrapper, then drop it.
    while (existingWrap.firstChild) panel.insertBefore(existingWrap.firstChild, existingWrap);
    existingWrap.remove();
  }
  const existingToggle = panel.querySelector('#results-full-breakdown-toggle');
  if (existingToggle) existingToggle.remove();

  // Re-collect: everything in the panel after the 3rd headline row.
  const allChildren = Array.from(panel.children);
  const headlineEls = new Set(headlineRows);
  let pastHeadline = false;
  const trailing = [];
  for (const el of allChildren) {
    if (headlineEls.has(el)) { pastHeadline = true; continue; }
    if (pastHeadline) trailing.push(el);
  }
  if (!trailing.length) return; // nothing to collapse

  const toggle = document.createElement('div');
  toggle.className = 'sl';
  toggle.id = 'results-full-breakdown-toggle';
  toggle.style.cssText = 'margin-top:14px;cursor:pointer;';
  toggle.onclick = _resultsToggleFullBreakdown;
  toggle.innerHTML = `Full Breakdown <span id="results-full-breakdown-caret" style="margin-left:auto;">${_condenseResultsExpanded ? '▾' : '▸'}</span>`;

  const wrap = document.createElement('div');
  wrap.id = 'results-full-breakdown-wrap';
  wrap.style.display = _condenseResultsExpanded ? '' : 'none';
  trailing.forEach(el => wrap.appendChild(el));

  panel.appendChild(toggle);
  panel.appendChild(wrap);
}

function _resultsToggleFullBreakdown(){
  const wrap = document.getElementById('results-full-breakdown-wrap');
  const caret = document.getElementById('results-full-breakdown-caret');
  if (!wrap) return;
  _condenseResultsExpanded = !_condenseResultsExpanded;
  wrap.style.display = _condenseResultsExpanded ? '' : 'none';
  if (caret) caret.textContent = _condenseResultsExpanded ? '▾' : '▸';
}
