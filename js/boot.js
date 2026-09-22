// Sport-Boot: waehlt das Modul, haengt es ans window und fuellt die Platzhalter.
// ═══════════════ SPORT BOOT ═══════════════
document.addEventListener('DOMContentLoaded', async function bootSport(){
  document.title = CFG.title;
  const h1 = document.querySelector('header h1'); if (h1) h1.textContent = CFG.title;
  if (!(await initAuth())) return;   // not signed in → login gate, stop booting
  applyGroupFilter();
  updateSessTypeButtons();
  renderAuthControls();
  const M = SPORT === 'snowboard' ? SnowboardModule : FreeskiModule;
  for (const k of Object.keys(M)) if (typeof M[k] === 'function' && k !== 'init') window[k] = M[k];
  ['sb-athlet','ev-athlet'].forEach(id => {
    const el = document.getElementById(id); if (el) el.insertAdjacentHTML('beforeend', CFG.athleteOptgroups);
  });
  for (const [id, html] of Object.entries(CFG.selectFill)) {
    const el = document.getElementById(id); if (el) el.innerHTML = html;
  }
  sbLoadCustomSelectValues();
  document.getElementById('ev-main').innerHTML = M.fragments.evMain;
  document.getElementById('sb-dir-radar-wrap').innerHTML = M.fragments.dirRadar;
  document.getElementById('db-rankings-placeholder').outerHTML = M.fragments.dbRankings;
  document.getElementById('grab-block-placeholder').outerHTML = M.fragments.grabBlock;
  const cf = document.getElementById('sbe-coach-fields-placeholder');
  if (cf) cf.outerHTML = M.fragments.coachFields;
  M.init();
  if (typeof bootOpenInitialPage === 'function') bootOpenInitialPage();
});
