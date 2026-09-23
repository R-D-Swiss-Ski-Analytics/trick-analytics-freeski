// Gemeinsamer Kern: alles, was in beiden Sportarten identisch ist.
// ═══════════════ GEMEINSAMER KERN (identisch in beiden Apps) ═══════════════
const SUPABASE_URL = CFG.supabaseUrl;

const SUPABASE_KEY = CFG.supabaseKey;

// ── Rail-Tricks: Vorschlagsliste kommt aus der Config, der Rest ist gemeinsam ──
const SB_RAIL_SUGGESTIONS = CFG.railSuggestions || [];
let SB_CUSTOM_RAIL_TYPES = [];   // in dieser Session neu erfasste Rail-Arten
let SB_RAIL_TRICKS = [];         // team-weit bereits verwendete Rail-Tricks (aus der DB)

// Invite-/Recovery-Links tragen den Typ im URL-Hash — vor supabase-js einlesen
const AUTH_URL_TYPE = (location.hash.match(/type=(\w+)/) || [])[1] || null;
const AUTH_URL_ERROR = decodeURIComponent(((location.hash.match(/error_description=([^&]*)/) || [])[1] || '').replace(/\+/g, ' '));

const { createClient } = supabase;

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ═══════════════ AUTH (Coach-Login) + Gruppen-Filter ═══════════════
const AUTH_ENABLED = true;
let AUTH_USER = null;
let COACH_SQUAD = null;                       // squad key from the coaches table, null = unknown
let GROUP_FILTER = 'all';
const ALL_SQUADS = CFG.squads.map(s => ({...s})); // unfiltered copy for the selector
// Selector entries; a value can combine several squad keys (joined with '+')
const FILTER_GROUPS = ALL_SQUADS.map(s => ({value:s.key, short:s.short || s.label}));

function showAuthGate(msg) {
  document.getElementById('auth-gate')?.remove();
  const gate = document.createElement('div');
  gate.id = 'auth-gate';
  gate.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:5000;display:flex;align-items:center;justify-content:center;padding:20px;';
  gate.innerHTML = `<form id="auth-form" style="width:100%;max-width:360px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px;">
    <div style="font-size:20px;font-weight:800;color:var(--text);margin-bottom:2px;">${CFG.title}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:20px;">Coach login</div>
    <label style="display:block;margin-bottom:4px;">E-Mail</label>
    <input class="abstand-12" type="email" id="auth-email" autocomplete="username" required>
    <label style="display:block;margin-bottom:4px;">Password</label>
    <input type="password" id="auth-pass" autocomplete="current-password" required style="margin-bottom:6px;">
    <div id="auth-err" style="min-height:16px;font-size:11px;color:#e2001a;margin-bottom:10px;">${msg||''}</div>
    <button type="submit" style="width:100%;padding:12px;border:none;border-radius:10px;background:#39c3d4;color:#06281c;font-family:'Poppins',sans-serif;font-size:15px;font-weight:700;cursor:pointer;">Sign in</button>
    <div style="text-align:center;margin-top:12px;"><a class="hinweis" href="#" onclick="authForgotPassword();return false;">Forgot password?</a> <span class="hinweis">·</span> <a class="hinweis" href="#" onclick="authHaveCode();return false;">Have a code?</a></div>
  </form>`;
  document.body.appendChild(gate);
  document.getElementById('auth-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Signing in…';
    const {error} = await db.auth.signInWithPassword({
      email: document.getElementById('auth-email').value.trim(),
      password: document.getElementById('auth-pass').value,
    });
    if (error) {
      btn.disabled = false; btn.textContent = 'Sign in';
      document.getElementById('auth-err').textContent = 'Login failed: ' + error.message;
    } else {
      location.reload();
    }
  });
}

function showSetPasswordGate() {
  document.getElementById('auth-gate')?.remove();
  const gate = document.createElement('div');
  gate.id = 'auth-gate';
  gate.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:5000;display:flex;align-items:center;justify-content:center;padding:20px;';
  gate.innerHTML = `<form id="setpw-form" style="width:100%;max-width:360px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px;">
    <div style="font-size:20px;font-weight:800;color:var(--text);margin-bottom:2px;">${CFG.title}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:20px;">Welcome! Choose your password.</div>
    <label style="display:block;margin-bottom:4px;">New password</label>
    <input class="abstand-12" type="password" id="setpw-1" autocomplete="new-password" required minlength="8">
    <label style="display:block;margin-bottom:4px;">Repeat password</label>
    <input type="password" id="setpw-2" autocomplete="new-password" required minlength="8" style="margin-bottom:6px;">
    <div id="setpw-err" style="min-height:16px;font-size:11px;color:#e2001a;margin-bottom:10px;"></div>
    <button type="submit" style="width:100%;padding:12px;border:none;border-radius:10px;background:#39c3d4;color:#06281c;font-family:'Poppins',sans-serif;font-size:15px;font-weight:700;cursor:pointer;">Save password</button>
  </form>`;
  document.body.appendChild(gate);
  document.getElementById('setpw-form').addEventListener('submit', async e => {
    e.preventDefault();
    const p1 = document.getElementById('setpw-1').value, p2 = document.getElementById('setpw-2').value;
    const err = document.getElementById('setpw-err');
    if (p1 !== p2) { err.textContent = 'Passwords do not match.'; return; }
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Saving…';
    const {error} = await db.auth.updateUser({password: p1});
    if (error) {
      btn.disabled = false; btn.textContent = 'Save password';
      err.textContent = 'Error: ' + error.message;
    } else {
      history.replaceState(null, '', location.pathname + location.search);
      location.reload();
    }
  });
}

// Reset via 6-stelligem Code statt Link — Links werden vom Outlook-Link-Scanner
// verbraucht, bevor die Coaches sie öffnen können (Mail-Template muss {{ .Token }} enthalten)
async function authForgotPassword() {
  const email = (document.getElementById('auth-email')?.value || '').trim();
  const err = document.getElementById('auth-err');
  if (!email) { err.textContent = 'Enter your e-mail above first, then tap the link again.'; return; }
  err.style.color = 'var(--muted)';
  err.textContent = 'Sending code…';
  const {error} = await db.auth.resetPasswordForEmail(email);
  if (error) {
    err.style.color = '#e2001a';
    err.textContent = 'Error: ' + error.message;
    return;
  }
  showOtpGate(email);
}

// Code-Eingabe öffnen ohne neue Mail auszulösen (Mail-Stundenlimit, verspätete Mail)
function authHaveCode() {
  const email = (document.getElementById('auth-email')?.value || '').trim();
  const err = document.getElementById('auth-err');
  if (!email) { err.textContent = 'Enter your e-mail above first, then tap the link again.'; return; }
  showOtpGate(email);
}

function showOtpGate(email) {
  document.getElementById('auth-gate')?.remove();
  const gate = document.createElement('div');
  gate.id = 'auth-gate';
  gate.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:5000;display:flex;align-items:center;justify-content:center;padding:20px;';
  gate.innerHTML = `<form id="otp-form" style="width:100%;max-width:360px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:28px;">
    <div style="font-size:20px;font-weight:800;color:var(--text);margin-bottom:2px;">${CFG.title}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:20px;">We sent a code to<br><b>${email}</b> — enter it below.</div>
    <label style="display:block;margin-bottom:4px;">Code</label>
    <input type="text" id="otp-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" required style="margin-bottom:6px;text-align:center;font-size:20px;letter-spacing:4px;">
    <div id="otp-err" style="min-height:16px;font-size:11px;color:#e2001a;margin-bottom:10px;"></div>
    <button type="submit" style="width:100%;padding:12px;border:none;border-radius:10px;background:#39c3d4;color:#06281c;font-family:'Poppins',sans-serif;font-size:15px;font-weight:700;cursor:pointer;">Verify code</button>
    <div style="text-align:center;margin-top:12px;"><a class="hinweis" href="#" onclick="showAuthGate();return false;">Back to login</a></div>
  </form>`;
  document.body.appendChild(gate);
  document.getElementById('otp-code').focus();
  document.getElementById('otp-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Checking…';
    const {error} = await db.auth.verifyOtp({
      email,
      token: document.getElementById('otp-code').value.trim(),
      type: 'recovery',
    });
    if (error) {
      btn.disabled = false; btn.textContent = 'Verify code';
      document.getElementById('otp-err').textContent = 'Code invalid or expired (' + error.message + '). Go back and request a new one.';
    } else {
      showSetPasswordGate();
    }
  });
}

async function initAuth() {
  if (!AUTH_ENABLED) return true;   // Login pausiert — App startet ohne Anmeldung
  let session = null;
  try { session = (await db.auth.getSession()).data.session; } catch (e) { console.error(e); }
  if (session && (AUTH_URL_TYPE === 'invite' || AUTH_URL_TYPE === 'recovery')) {
    showSetPasswordGate();
    return false;
  }
  if (!session) {
    showAuthGate(AUTH_URL_ERROR
      ? 'This link is invalid or was already used (' + AUTH_URL_ERROR + '). Ask for a new invite or use “Forgot password?”.'
      : '');
    return false;
  }
  AUTH_USER = session.user;
  try {
    const {data} = await db.from('coaches').select('squad').eq('email', AUTH_USER.email).maybeSingle();
    COACH_SQUAD = data && data.squad ? data.squad : null;
  } catch (e) { COACH_SQUAD = null; }
  return true;
}

function authLogout() {
  db.auth.signOut().finally(() => location.reload());
}

function applyGroupFilter() {
  const saved = localStorage.getItem(SPORT + '_group_filter');
  // Map the coach's squad key to the filter entry that contains it (e.g. freeski X → 'GK+X')
  const coachDefault = COACH_SQUAD
    ? (FILTER_GROUPS.find(g => g.value.split('+').includes(COACH_SQUAD)) || {}).value || 'all'
    : 'all';
  GROUP_FILTER = saved || coachDefault;
  if (GROUP_FILTER !== 'all' && !FILTER_GROUPS.some(g => g.value === GROUP_FILTER)) GROUP_FILTER = 'all';
  if (GROUP_FILTER !== 'all') {
    const keys = new Set(GROUP_FILTER.split('+'));
    // Mutate in place — modules captured these array references at parse time
    const keepA = CFG.athletes.filter(a => keys.has(a.squad));
    CFG.athletes.length = 0; CFG.athletes.push(...keepA);
    const keepS = CFG.squads.filter(s => keys.has(s.key));
    CFG.squads.length = 0; CFG.squads.push(...keepS);
    CFG.athleteOptgroups = CFG.squads.map(sq =>
      `<optgroup label="${sq.label}">` +
      CFG.athletes.filter(a => a.squad === sq.key).map(a => `<option>${a.name}</option>`).join('') +
      `</optgroup>`).join('');
  }
}

function setGroupFilter(v) {
  localStorage.setItem(SPORT + '_group_filter', v);
  location.reload();
}

// «＋ Add new…»-Option in Selects: fragt nach Text, ergänzt und wählt die neue Option
function sbSelectAddNew(sel) {
  if (sel.value !== '__add__') return;
  const v = (window.prompt('New entry:') || '').replace(/\s+/g, ' ').trim();
  if (!v) { sel.value = ''; return; }
  const existing = [...sel.options].find(o => o.value.toLowerCase() === v.toLowerCase());
  if (existing) { sel.value = existing.value; return; }
  const o = document.createElement('option'); o.textContent = v;
  const addOpt = sel.querySelector('option[value="__add__"]');
  if (addOpt) sel.insertBefore(o, addOpt); else sel.appendChild(o);
  sel.value = v;
}

// Team-weit bereits verwendete Combo-/Transfer-Werte aus der DB als Optionen anbieten
async function sbLoadCustomSelectValues() {
  const fill = async (col, selId) => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    try {
      const vals = new Set();
      let from = 0;
      while (true) {
        const {data, error} = await db.from('standort').select(col).not(col, 'is', null).range(from, from + 999);
        if (error || !data) break;
        data.forEach(r => { const v = (r[col] || '').trim(); if (v) vals.add(v); });
        if (data.length < 1000) break;
        from += 1000;
      }
      const have = new Set([...sel.options].map(o => o.value.toLowerCase()));
      const addOpt = sel.querySelector('option[value="__add__"]');
      [...vals].sort((a, b) => a.localeCompare(b)).forEach(v => {
        if (have.has(v.toLowerCase())) return;
        const o = document.createElement('option'); o.textContent = v;
        if (addOpt) sel.insertBefore(o, addOpt); else sel.appendChild(o);
      });
    } catch (e) { /* Basis bleibt: nur «＋ Add new…» */ }
  };
  fill('swap', 'sb-swap');
  fill('transfer', 'sb-transfer');
}

// Session-Typen nach Trainingsgruppe: HP-Gruppen sehen Bag + Halfpipe,
// Park-Gruppen (SS&BA) Bag + Big Air/Slopestyle; DVLP und «All» sehen alles.
const HP_SQUAD_KEYS = new Set(SPORT === 'freeski' ? ['HP'] : ['M']);
const ALLROUND_SQUAD_KEYS = new Set(['DVLP']);
function updateSessTypeButtons() {
  const hasHp = CFG.squads.some(sq => HP_SQUAD_KEYS.has(sq.key) || ALLROUND_SQUAD_KEYS.has(sq.key));
  const hasPark = CFG.squads.some(sq => !HP_SQUAD_KEYS.has(sq.key));
  document.querySelectorAll('.sess-type-btn').forEach(b => {
    const t = b.textContent.trim();
    const isHp = t.startsWith('Halfpipe');
    const isPark = t.startsWith('Big Air') || t.startsWith('Slopestyle');
    b.style.display = (isHp && !hasHp) || (isPark && !hasPark) ? 'none' : '';
  });
}

function renderAuthControls() {
  const wrap = document.getElementById('auth-controls');
  const sel = document.getElementById('group-filter-sel');
  if (!wrap || !sel) return;
  sel.innerHTML = `<option value="all" ${GROUP_FILTER==='all'?'selected':''}>All</option>` +
    FILTER_GROUPS.map(g => `<option value="${g.value}" ${GROUP_FILTER===g.value?'selected':''}>${g.short}</option>`).join('');
  const logoutBtn = wrap.querySelector('button');
  if (logoutBtn) logoutBtn.style.display = AUTH_USER ? '' : 'none';
  wrap.style.display = 'flex';
}









function val(id) { const el = document.getElementById(id); return el ? el.value || null : null; }


function readFields(prefix) {
  const p = prefix + '-';
  return {
    disziplin: val(p+'disziplin'),
    drehrichtung: val(p+'drehrichtung'), flips: val(p+'flips'), achse: val(p+'achse'),
    rotation: val(p+'rotation'), absprung: val(p+'absprung'), grab: val(p+'grab'),
    bringback: val(p+'bringback'), style: val(p+'style'), railart: val(p+'railart'), slideform: val(p+'slideform'),
    slidevar: val(p+'slidevar'), inspin: val(p+'inspin'), swap: val(p+'swap'), outspin: val(p+'outspin'),
    transfer: val(p+'transfer'), foot: val(p+'foot'),
  };
}


function badge(d) {
  const cls = d==='Jump'||d==='Side Hit'||d==='Landing Bag'?'badge-kicker':d==='Rail'?'badge-rail':'badge-halfpipe';
  return `<span class="badge ${cls}">${d||'?'}</span>`;
}

function avg(arr) {
  const v = arr.filter(x=>x!=null&&x!=='');
  return v.length ? parseFloat((v.reduce((a,b)=>a+parseFloat(b),0)/v.length).toFixed(1)) : null;
}

function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

function fmtDate(d) {
  if (!d) return '–';
  try { return new Date(d).toLocaleDateString('de-CH', {day:'2-digit',month:'2-digit',year:'numeric'}); } catch { return d; }
}


let dbAllTricks = [];    // session tricks

let dbAllStandort = [];  // standort tricks

let dbSessionReports = [];







function parsePerfDate(val) {
  if (!val) return '';
  const m = val.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (m) {
    const d=m[1].padStart(2,'0'), mo=m[2].padStart(2,'0');
    const y=m[3].length===2?'20'+m[3]:m[3];
    return `${y}-${mo}-${d}`;
  }
  return '';
}






function rcFilter(query) {
  const q = query.toLowerCase().trim();
  document.querySelectorAll('.rc-ath-row').forEach(row => {
    row.style.display = (!q || row.dataset.name.includes(q)) ? '' : 'none';
  });
}






let _rebuildInProgress = false;

async function autoRebuildAllReports() {
  if (_rebuildInProgress || !dbSessionReports.length) return;
  _rebuildInProgress = true;
  for (const report of dbSessionReports) {
    await rebuildReportFromTimestamps(report.id, true);
  }
  _rebuildInProgress = false;
}


function arSeasonChange() {
  const v = document.getElementById('ar-season-sel')?.value;
  const dr = document.getElementById('ar-date-range');
  if (dr) dr.style.display = v === 'custom' ? 'flex' : 'none';
}

function trSeasonChange() {
  const v = document.getElementById('tr-season-sel')?.value;
  const dr = document.getElementById('tr-date-range');
  if (dr) dr.style.display = v === 'custom' ? 'flex' : 'none';
}

const SESS_TYPE_SHORT = {'Landing Bag':'Bag','Jump On-Snow':'BA Train','Big Air Training':'BA Train','Big Air Competition':'BA Comp','Slopestyle Training':'SS Train','Slopestyle Competition':'SS Comp','Halfpipe Training':'HP Train','Halfpipe Competition':'HP Comp'};

function populateAthleteReportDropdown() {
  const sel = document.getElementById('ar-athlete-sel');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">— Select athlete —</option>'
    + SESS_ALL_ATHLETES.map(a => `<option value="${a.name}" ${a.name===current?'selected':''}>${a.name}</option>`).join('');
}


function shortName(full) {
  if (!full) return '';
  const parts = full.trim().split(' ');
  if (parts.length === 1) return full;
  return parts[0] + ' ' + parts[parts.length - 1][0] + '.';
}




async function deleteTrick(id) {
  if (!confirm('Delete trick?')) return;
  const { error } = await db.from('tricks').delete().eq('id', id);
  if (error) { showToast('Error deleting', 'error'); return; }
  showToast('Trick deleted', 'success'); loadDB();
}

async function deleteStandort(id) {
  if (!confirm('Delete assessment entry?')) return;
  const { error } = await db.from('standort').delete().eq('id', id);
  if (error) { showToast('Error deleting', 'error'); return; }
  showToast('Entry deleted', 'success'); loadDB();
}


// ── Grab-Status-Matrix (Variante B): standort.grab_status = {"Safety":"mastered","Blunt":"goal"} ──
// Solange die Spalte in Supabase fehlt, fällt die App still auf das alte Verhalten zurück.
let _standortHasGrabStatus = true;

function effGrabStatus(entry) {
  if (entry && entry.grab_status && typeof entry.grab_status === 'object') return entry.grab_status;
  if (entry && entry.grab && (entry.status === 'mastered' || entry.status === 'goal')) {
    const out = {};
    entry.grab.split(',').map(g => g.trim()).filter(Boolean).forEach(g => { out[g] = entry.status; });
    return out;
  }
  return {};
}

async function fetchStandortTricks(athlet) {
  if (_standortHasGrabStatus) {
    const {data, error} = await db.from('standort').select('trick_label,disziplin,status,grab,grab_status')
      .eq('athlet', athlet).or('status.eq.mastered,status.eq.goal').order('trick_label');
    if (!error) return data || [];
    if (/grab_status/.test(error.message || '')) _standortHasGrabStatus = false;
    else return [];
  }
  const {data} = await db.from('standort').select('trick_label,disziplin,status,grab')
    .eq('athlet', athlet).or('status.eq.mastered,status.eq.goal').order('trick_label');
  return data || [];
}

async function updateGrabStatus(entryId, gs, localEntry) {
  if (!_standortHasGrabStatus) {
    showToast('grab_status column missing in Supabase — please run the SQL', 'error');
    return false;
  }
  const payload = { grab_status: gs, grab: Object.keys(gs).join(', ') || null };
  const {error} = await db.from('standort').update(payload).eq('id', entryId);
  if (error) {
    if (/grab_status/.test(error.message || '')) {
      _standortHasGrabStatus = false;
      showToast('grab_status column missing in Supabase — please run the SQL', 'error');
    } else showToast('Error: ' + error.message, 'error');
    return false;
  }
  if (localEntry) { localEntry.grab_status = gs; localEntry.grab = payload.grab; }
  return true;
}

function styleAssessGrabBtn(btn, g, st) {
  const base = "border-radius:20px;padding:5px 12px;font-size:12px;cursor:pointer;font-family:'Poppins',sans-serif;";
  if (st === 'mastered')  { btn.textContent = '✓ ' + g;  btn.style.cssText = base + `background:${UI_GREEN_BG25};border:1px solid ${UI_GREEN};color:${UI_GREEN_TEXT};`; }
  else if (st === 'goal') { btn.textContent = '🎯 ' + g; btn.style.cssText = base + "background:rgba(245,158,11,0.2);border:1px solid #f59e0b;color:#f59e0b;"; }
  else                    { btn.textContent = g;         btn.style.cssText = base + "background:#112236;border:1px solid #1a3450;color:#6b8299;"; }
}

function nextGrabState(cur) {
  return cur === undefined ? 'mastered' : cur === 'mastered' ? 'goal' : undefined;
}

function grabChipsHtml(e) {
  if (!e || !e.id || e.disziplin === 'Rail') return '';
  if (e.status !== 'mastered' && e.status !== 'goal') return '';
  const gs = (e.grab_status && typeof e.grab_status === 'object') ? e.grab_status : null;
  if (!gs || !Object.keys(gs).length) return '';
  const chips = Object.entries(gs).map(([g, st]) => {
    const col  = st === 'mastered' ? UI_GREEN_TEXT : '#f59e0b';
    const bg   = st === 'mastered' ? UI_GREEN_BG20 : 'rgba(245,158,11,0.15)';
    const icon = st === 'mastered' ? '✓' : '🎯';
    return `<span onclick="event.stopPropagation();cycleGrabStatus(${e.id},'${g.replace(/'/g,"\\'")}')" title="Tap: ✓ ${SPORT==='snowboard'?'Learned':'Mastered'} → 🎯 Goal → remove" style="cursor:pointer;font-size:10px;padding:2px 8px;border-radius:10px;background:${bg};border:1px solid ${col};color:${col};white-space:nowrap;">${icon} ${g}</span>`;
  }).join('');
  return `<span style="display:flex;flex-wrap:wrap;gap:4px;margin-top:3px;align-items:center;">${chips}</span>`;
}

// Was vom Label übrig bleibt, wenn man die aus Feldern ableitbaren Teile + Grabs entfernt
// (z. B. «Frontfoot Bone», «Todeo» — Angaben ohne eigene Spalte, die nur im Label leben)
function labelResidual(label, knownTokens) {
  let s = ' ' + (label || '') + ' ';
  knownTokens.filter(Boolean).forEach(t => {
    const esc = String(t).trim().replace(/[-.*+?^${}()|[\]\\]/g, '\\$&');
    s = s.replace(new RegExp('\\s' + esc + '(?=\\s)', 'i'), ' ');
  });
  return s.trim().replace(/\s{2,}/g, ' ');
}

function splitTrickGrab(label) {
  const i = (label || '').lastIndexOf(' — ');
  if (i === -1) return { base: (label || '').trim(), grab: '' };
  return { base: label.slice(0, i).trim(), grab: label.slice(i + 3).trim() };
}

function grabSelectHtml(id, grabs, current) {
  const opts = [...grabs];
  if (current && !opts.includes(current)) opts.unshift(current);
  return `<div class="reihe"><span style="font-size:10px;color:var(--muted);min-width:36px;">Grab</span>
    <select id="${id}" style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:12px;font-family:'Poppins',sans-serif;">
      <option value="">— No Grab —</option>
      ${opts.map(g => `<option value="${g.replace(/"/g,'&quot;')}"${g === current ? ' selected' : ''}>${g}</option>`).join('')}
    </select></div>`;
}

const SESS_ALL_ATHLETES = CFG.athletes;

const SESS_SQUADS = CFG.squads;

let sessSelectedAthletes = [];

let sessAthleteData = {};

let sessLog = [];

let sessType = '';

let sessDate = '';

let sessStartTime = 0;

function sessTodayStr() { return new Date().toISOString().split('T')[0]; }

function sessCurrentDate() { return sessDate || sessTodayStr(); }

function sessDisplayDate() {
  const d = sessDate ? new Date(sessDate + 'T12:00:00') : new Date();
  return d.toLocaleDateString('en-GB', {weekday:'long',day:'numeric',month:'long',year:'numeric'});
}

let sessAudioCtx = null;

function sessPlayLogSound(result) {
  try {
    if (!sessAudioCtx) sessAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (sessAudioCtx.state === 'suspended') sessAudioCtx.resume();
    const t = sessAudioCtx.currentTime;
    const beep = (freq, start, dur, type, gain) => {
      const o = sessAudioCtx.createOscillator();
      const g = sessAudioCtx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t + start);
      g.gain.exponentialRampToValueAtTime(gain, t + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
      o.connect(g); g.connect(sessAudioCtx.destination);
      o.start(t + start); o.stop(t + start + dur + 0.05);
    };
    beep(520, 0, 0.12, 'sine', 0.12);
  } catch(e) {}
}

function onSessDateChange() {
  const inp = document.getElementById('sess-datum');
  if (!inp) return;
  const today = sessTodayStr();
  if (inp.value && inp.value > today) {
    inp.value = today;
    showToast('Session date cannot be in the future', 'error');
  }
  sessDate = (inp.value && inp.value !== today) ? inp.value : '';
  const hint = document.getElementById('sess-datum-hint');
  if (hint) hint.style.display = sessDate ? 'inline' : 'none';
  const label = document.getElementById('sess-date-label');
  if (label) label.textContent = sessDisplayDate();
}




function selectSessType(btn, type) {
  document.querySelectorAll('.sess-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  sessType = type;
}

async function initSessionSetup() {
  if (await restoreSessionState()) return;
  sessDate = '';
  const dInp = document.getElementById('sess-datum');
  if (dInp) { dInp.value = sessTodayStr(); dInp.max = sessTodayStr(); }
  const dHint = document.getElementById('sess-datum-hint');
  if (dHint) dHint.style.display = 'none';
  document.getElementById('sess-date-label').textContent = sessDisplayDate();
  const grid = document.getElementById('sess-athlete-grid');
  grid.innerHTML = SESS_SQUADS.map(sq => {
    const athletes = SESS_ALL_ATHLETES.filter(a => a.squad === sq.key);
    return `<div style="margin-bottom:14px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${sq.color};margin-bottom:8px;">${sq.label}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${athletes.map(a => `
          <label style="display:flex;align-items:center;gap:8px;padding:9px 14px;background:var(--surface2);border:2px solid var(--border);border-radius:10px;cursor:pointer;transition:border-color .15s;" id="sess-ath-card-${a.name.replace(/\s/g,'_')}">
            <input type="checkbox" value="${a.name}" onchange="toggleSessionAthlete('${a.name}')" style="width:16px;height:16px;accent-color:${sq.color};cursor:pointer;flex-shrink:0;">
            <span style="font-weight:600;font-size:13px;color:var(--text);">${shortName(a.name)}</span>
          </label>`).join('')}
      </div>
    </div>`;
  }).join('');
}




function startSession() {
  if (!sessType) { showToast('Please select a session type (Bag / On-Snow / Comp)', 'error'); return; }
  if (sessSelectedAthletes.length === 0) { showToast('Please select at least one athlete', 'error'); return; }
  const isResume = sessStartTime > 0 && sessLog.length > 0;
  sessSelectedAthletes.forEach(name => {
    if (!sessAthleteData[name]) sessAthleteData[name] = {tricks:[],currentTrick:'',stats:{attempts:0,landed:0,perfect:0}};
    sessAthleteData[name].currentTrick = sessAthleteData[name].currentTrick || '';
    if (!isResume) sessAthleteData[name].stats = {attempts:0,landed:0,perfect:0};
  });
  if (!isResume) { sessLog = []; sessStartTime = Date.now(); }
  document.getElementById('sess-setup').style.display = 'none';
  document.getElementById('sess-live').style.display = 'block';
  document.getElementById('sess-live-date').textContent =
    sessDisplayDate()
    + (sessType ? '  ·  ' + sessType : '')
    + (sessDate ? '  ·  ⚠ BACKDATED' : '');
  renderLiveSession();
  saveSessionState();
}










function sessPickTrick(name, trick, btn) {
  sessAthleteData[name].currentTrick = trick;
  const col = document.getElementById('sess-col-' + name.replace(/\s/g,'_'));
  col.querySelectorAll('.sess-trick-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}




let sessEditIdx = -1;




function cancelFsEdit() {
  sessEditIdx = -1;
  renderSessionLog();
}







let _srCondition = 0;

function setSrCondition(val, btn) {
  _srCondition = val;
  document.querySelectorAll('#sr-cond-btns button').forEach(b => {
    const active = b === btn;
    b.style.borderColor = active ? '#39c3d4' : '#1a3450';
    b.style.color = active ? '#39c3d4' : '#6b8299';
    b.style.background = active ? 'rgba(57,195,212,0.15)' : '#112236';
  });
}

async function submitSessionReport(duration) {
  const durVal = parseInt(document.getElementById('sr-duration')?.value, 10);
  if (Number.isFinite(durVal) && durVal > 0) duration = durVal;
  const location = (document.getElementById('sr-location')?.value||'').trim();
  const jumpSize = document.getElementById('sr-jumpsize')?.value || '';
  const comments = (document.getElementById('sr-comments')?.value||'').trim();
  const conditions = _srCondition || null;
  const athleteNotes = {};
  sessSelectedAthletes.forEach(n => {
    const v = (document.getElementById('sr-ath-'+n.replace(/\s/g,'_'))?.value||'').trim();
    if (v) athleteNotes[shortName(n)] = v;
  });
  const contestScores = {};
  sessSelectedAthletes.forEach(n => {
    const sid = n.replace(/\s/g,'_');
    const grab = ids => ids.map(id => parseFloat(document.getElementById(id + sid)?.value)).filter(Number.isFinite);
    const quali = grab(['sr-q1-','sr-q2-']);
    const finals = grab(['sr-f1-','sr-f2-','sr-f3-']);
    const rank = parseInt(document.getElementById('sr-rank-' + sid)?.value, 10);
    if (quali.length || finals.length || Number.isFinite(rank)) contestScores[shortName(n)] = {quali, finals, rank: Number.isFinite(rank) ? rank : null};
  });
  document.getElementById('sess-report-modal')?.remove();
  await saveSessionReport(duration, location, conditions, comments, athleteNotes, jumpSize, contestScores);
}







let sbAthlet = '';

let sbData   = []; // all standort entries for current athlete
let sbSessTricks = []; // all session tricks for current athlete (for direction balance)

function toggleSbForm() {
  const card = document.getElementById('sb-form-card');
  const visible = card.style.display !== 'none';
  card.style.display = visible ? 'none' : 'block';
  if (!visible) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}




function sessionDirLegendHtml(dirCnt, dirs, dirColors, total) {
  return dirs.filter(d=>dirCnt[d].att>0).map(d=>{
    const pct = total ? Math.round(dirCnt[d].att/total*100) : 0;
    return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
      <div style="width:12px;height:12px;border-radius:3px;background:${dirColors[d]};flex-shrink:0;"></div>
      <div>
        <div style="font-size:12px;font-weight:600;color:var(--text);">${d} <span style="font-weight:800;color:${dirColors[d]};">${pct}%</span></div>
        <div style="font-size:11px;color:var(--muted);">${dirCnt[d].tricks} trick${dirCnt[d].tricks!==1?'s':''} &middot; ${dirCnt[d].att} att.</div>
      </div>
    </div>`;
  }).join('');
}



// Direction-Balance-Balken der gewählten Athlet:in (Session-Tricks + Mastered-Assessment),
// gerendert unterhalb des Richtungs-Radars auf der Assessment-Seite.
function renderAthleteDirBalance(wrap, dirs, colors, dirOf) {
  let bal = document.getElementById('sb-dir-balance');
  if (!bal) {
    bal = document.createElement('div');
    bal.id = 'sb-dir-balance';
    (wrap.querySelector('.card') || wrap).appendChild(bal);
  }
  const counts = {}; dirs.forEach(d => counts[d] = 0);
  sbSessTricks.forEach(t => { const d = dirOf(t); if (d in counts) counts[d]++; });
  const total = dirs.reduce((s,d) => s + counts[d], 0);
  if (!total) { bal.innerHTML = ''; return; }
  bal.innerHTML = '<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px;">'
    + '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--muted);font-weight:700;margin-bottom:10px;">Direction Balance — Session Data Only</div>'
    + dirs.map(dir => {
        const pct = Math.round(counts[dir] / total * 100);
        const col = colors[dir];
        return '<div style="margin-bottom:8px;">'
          + '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">'
          + '<span style="color:var(--text);">' + dir + '</span>'
          + '<span style="color:' + col + ';font-weight:700;">' + pct + '%</span></div>'
          + '<div style="background:var(--surface2);border-radius:4px;height:7px;overflow:hidden;">'
          + '<div style="background:' + col + ';width:' + pct + '%;height:7px;border-radius:4px;transition:width .4s;"></div>'
          + '</div></div>';
      }).join('')
    + '<div style="font-size:10px;color:var(--muted);margin-top:6px;">Based on logged session attempts only — assessment entries are not included.</div>'
    + '</div>';
}

async function deleteSbEntry(id) {
  if (!confirm('Remove entry?')) return;
  const { error } = await db.from('standort').delete().eq('id', id);
  if (error) { showToast('Error', 'error'); return; }
  sbData = sbData.filter(e => e.id !== id);
  renderStandort();
  showToast('Removed', 'success');
}

const EV_COLORS = ['#3b82f6','#06b6d4','#10b981','#f59e0b','#a78bfa','#f472b6','#34d399','#fb923c','#60a5fa','#fbbf24'];







function extractRotFromLabel(label) {
  const m = (label||'').match(/\b(180|270|360|450|540|630|720|810|900|1080|1260|1440|1620|1800|1980|2160)\b/);
  return m ? parseInt(m[1]) : 0;
}


















function updateQualityChart() {
  const sel = document.getElementById('ev-trick-filter');
  const cvLine = document.getElementById('cv-line');
  const cvEmpty = document.getElementById('cv-line-empty');
  if (!sel || !window._evTricksWithRating) return;
  const chosen = sel.value;
  if (!chosen) {
    if (cvLine) cvLine.style.display = 'none';
    if (cvEmpty) { cvEmpty.style.display = 'block'; cvEmpty.textContent = 'Please select a trick.'; }
    return;
  }
  const filtered = window._evTricksWithRating.filter(t => window._evTrickLabel(t) === chosen);
  if (!filtered.length) {
    if (cvLine) cvLine.style.display = 'none';
    if (cvEmpty) { cvEmpty.style.display = 'block'; cvEmpty.textContent = 'No data for this trick.'; }
    return;
  }
  // Group by date, average rating
  const byDate = {};
  filtered.forEach(t => {
    if (!byDate[t.datum]) byDate[t.datum] = [];
    byDate[t.datum].push(parseFloat(t.gesamt));
  });
  const dates = Object.keys(byDate).sort();
  const avgs = dates.map(d => parseFloat((byDate[d].reduce((a,b)=>a+b,0)/byDate[d].length).toFixed(1)));
  if (cvLine) cvLine.style.display = 'block';
  if (cvEmpty) cvEmpty.style.display = 'none';
  drawLine('cv-line', dates, avgs);
}

function drawRadarDual(canvasId, labels, vals1, vals2, raw1, raw2, lbl1, lbl2, col1, col2) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2, r = Math.min(W,H)/2 - 72;
  ctx.clearRect(0,0,W,H);
  const n = labels.length;
  const angles = labels.map((_,i) => (i * 2*Math.PI/n) - Math.PI/2);

  // Grid rings
  [0.25,0.5,0.75,1].forEach(frac => {
    ctx.beginPath();
    angles.forEach((a,i) => { const x=cx+Math.cos(a)*r*frac,y=cy+Math.sin(a)*r*frac; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
    ctx.closePath(); ctx.strokeStyle='#1e2d45'; ctx.lineWidth=1; ctx.stroke(); ctx.fillStyle='#111827'; ctx.fill();
  });
  angles.forEach(a => { ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r); ctx.strokeStyle='#1e2d45'; ctx.lineWidth=1; ctx.stroke(); });

  // Polygon 2
  if(vals2.some(v=>v>0)){ ctx.beginPath(); angles.forEach((a,i)=>{ const x=cx+Math.cos(a)*r*vals2[i],y=cy+Math.sin(a)*r*vals2[i]; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }); ctx.closePath(); ctx.fillStyle=col2+'33'; ctx.fill(); ctx.strokeStyle=col2; ctx.lineWidth=2; ctx.stroke(); }
  // Polygon 1
  if(vals1.some(v=>v>0)){ ctx.beginPath(); angles.forEach((a,i)=>{ const x=cx+Math.cos(a)*r*vals1[i],y=cy+Math.sin(a)*r*vals1[i]; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); }); ctx.closePath(); ctx.fillStyle=col1+'33'; ctx.fill(); ctx.strokeStyle=col1; ctx.lineWidth=2; ctx.stroke(); }

  angles.forEach((a,i) => {
    if(vals1[i]>0){ const x=cx+Math.cos(a)*r*vals1[i],y=cy+Math.sin(a)*r*vals1[i]; ctx.beginPath(); ctx.arc(x,y,4,0,2*Math.PI); ctx.fillStyle=col1; ctx.fill(); }
    if(vals2[i]>0){ const x=cx+Math.cos(a)*r*vals2[i],y=cy+Math.sin(a)*r*vals2[i]; ctx.beginPath(); ctx.arc(x,y,4,0,2*Math.PI); ctx.fillStyle=col2; ctx.fill(); }
    const lx=cx+Math.cos(a)*(r+36), ly=cy+Math.sin(a)*(r+36);
    ctx.fillStyle='#e2e8f0'; ctx.font='bold 11px DM Sans,sans-serif';
    ctx.textAlign = Math.cos(a) < -0.3 ? 'right' : Math.cos(a) > 0.3 ? 'left' : 'center';
    ctx.textBaseline='middle';
    ctx.fillText(labels[i], lx, ly-10);
    let drawX = lx - 30;
    [[raw1[i],col1,lbl1],[raw2[i],col2,lbl2]].forEach(([v,c,l]) => {
      if(v>0){ ctx.fillStyle=c; ctx.font='bold 11px Bebas Neue,sans-serif'; ctx.textAlign='left'; const t=v+'×'; ctx.fillText(t, drawX, ly+6); drawX+=ctx.measureText(t+' ').width+2; }
    });
  });

  // Legend
  [[lbl1,col1],[lbl2,col2]].forEach(([l,c],i) => {
    ctx.fillStyle=c; ctx.fillRect(10, H-22+i*12, 10, 8);
    ctx.fillStyle='#64748b'; ctx.font='10px DM Sans,sans-serif'; ctx.textAlign='left'; ctx.fillText(l, 24, H-14+i*12);
  });
}

function drawRadarSplit(canvasId, labels, valsT, valsS, rawT, rawS) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2, r = Math.min(W,H)/2 - 80;
  ctx.clearRect(0,0,W,H);

  const n = labels.length;
  // Rotated 45° so Right=top-right, Left=top-left, Switch Right=bottom-right, Switch Left=bottom-left
  const angles = labels.map((_,i) => (i * 2*Math.PI/n) - Math.PI/4);

  // Grid rings
  [0.25,0.5,0.75,1].forEach(frac => {
    ctx.beginPath();
    angles.forEach((a,i) => {
      const x=cx+Math.cos(a)*r*frac, y=cy+Math.sin(a)*r*frac;
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.closePath();
    ctx.strokeStyle='#1e2d45'; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle='#111827'; ctx.fill();
  });

  // Spokes
  angles.forEach(a => {
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.lineTo(cx+Math.cos(a)*r, cy+Math.sin(a)*r);
    ctx.strokeStyle='#1e2d45'; ctx.lineWidth=1; ctx.stroke();
  });

  // Standort polygon (amber)
  if (valsS.some(v=>v>0)) {
    ctx.beginPath();
    angles.forEach((a,i) => {
      const x=cx+Math.cos(a)*r*valsS[i], y=cy+Math.sin(a)*r*valsS[i];
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.closePath();
    ctx.fillStyle='rgba(245,158,11,0.18)'; ctx.fill();
    ctx.strokeStyle='#f59e0b'; ctx.lineWidth=2; ctx.stroke();
  }

  // Training polygon (blue)
  if (valsT.some(v=>v>0)) {
    ctx.beginPath();
    angles.forEach((a,i) => {
      const x=cx+Math.cos(a)*r*valsT[i], y=cy+Math.sin(a)*r*valsT[i];
      i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
    });
    ctx.closePath();
    ctx.fillStyle='rgba(59,130,246,0.22)'; ctx.fill();
    ctx.strokeStyle='#3b82f6'; ctx.lineWidth=2; ctx.stroke();
  }

  // Dots + labels
  angles.forEach((a,i) => {
    // Training dot
    if(valsT[i]>0){
      const x=cx+Math.cos(a)*r*valsT[i], y=cy+Math.sin(a)*r*valsT[i];
      ctx.beginPath(); ctx.arc(x,y,4,0,2*Math.PI); ctx.fillStyle='#3b82f6'; ctx.fill();
    }
    // Standort dot
    if(valsS[i]>0){
      const x=cx+Math.cos(a)*r*valsS[i], y=cy+Math.sin(a)*r*valsS[i];
      ctx.beginPath(); ctx.arc(x,y,4,0,2*Math.PI); ctx.fillStyle='#f59e0b'; ctx.fill();
    }
    // Label
    const lx=cx+Math.cos(a)*(r+30), ly=cy+Math.sin(a)*(r+30);
    ctx.fillStyle='#e2e8f0'; ctx.font='bold 11px DM Sans,sans-serif';
    ctx.textAlign = Math.cos(a) < -0.3 ? 'right' : Math.cos(a) > 0.3 ? 'left' : 'center';
    ctx.textBaseline='middle';
    ctx.fillText(labels[i], lx, ly-10);
    // Counts: blue / amber
    ctx.font='bold 11px Bebas Neue,sans-serif';
    const countStr = (rawT[i]>0?`\u25CF${rawT[i]}`:'') + (rawT[i]>0&&rawS[i]>0?' ':'') + (rawS[i]>0?`\u25CF${rawS[i]}`:'');
    // Draw each part in correct color
    const parts=[];
    if(rawT[i]!=null && rawT[i]!==0) parts.push({text:`●${rawT[i]}%`,color:'#39c3d4'});
    if(rawS[i]>0) parts.push({text:`●${rawS[i]}`,color:'#f59e0b'});
    let totalW=0;
    parts.forEach(p=>{ ctx.font='bold 11px Bebas Neue,sans-serif'; totalW+=ctx.measureText(p.text+' ').width; });
    let drawX=lx-totalW/2;
    parts.forEach(p=>{
      ctx.font='bold 11px Bebas Neue,sans-serif';
      ctx.fillStyle=p.color; ctx.textAlign='left';
      ctx.fillText(p.text+' ', drawX, ly+6);
      drawX+=ctx.measureText(p.text+' ').width;
    });
  });
}

function drawBarsSplit(containerId, entries) {
  const el = document.getElementById(containerId);
  if (!el || !entries.length) { if(el) el.innerHTML='<div style="color:var(--muted);font-size:13px;padding:8px;">No data</div>'; return; }
  const max = Math.max(...entries.map(e=>e[1]+e[2]), 1);
  el.innerHTML = entries.map(([label, cT, cS]) => {
    const pctT = Math.round(cT/max*100);
    const pctS = Math.round(cS/max*100);
    const total = cT + cS;
    return `<div class="bar-row">
      <div class="bar-label">${label}</div>
      <div class="bar-track" style="position:relative;">
        <div style="position:absolute;left:0;top:0;height:100%;width:${pctT+pctS}%;display:flex;border-radius:4px;overflow:hidden;">
          ${cT>0?`<div style="width:${total?Math.round(cT/total*100):0}%;background:#3b82f6;display:flex;align-items:center;padding-left:6px;"><span class="bar-val">${cT>0?cT+'×':''}</span></div>`:''}
          ${cS>0?`<div style="width:${total?Math.round(cS/total*100):0}%;background:#f59e0b;display:flex;align-items:center;padding-left:${cT>0?2:6}px;"><span class="bar-val">${cS+'×'}</span></div>`:''}
        </div>
      </div>
    </div>`;
  }).join('');
}

function drawBarsRating(containerId, entries) {
  const el = document.getElementById(containerId);
  if (!el || !entries.length) { if(el) el.innerHTML='<div style="color:var(--muted);font-size:13px;padding:8px;">No rating data</div>'; return; }
  el.innerHTML = entries.map(([label, avg], i) => {
    const pct = Math.round(avg/10*100);
    const col = avg>=8?'#10b981':avg>=6?'#84cc16':'#f59e0b';
    return `<div class="bar-row">
      <div class="bar-label">${label}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${pct}%;background:${col};">
          <span class="bar-val">${avg}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

function drawLine(canvasId, labels, values) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !labels.length) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top:20, right:20, bottom:40, left:36 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;
  ctx.clearRect(0,0,W,H);

  const maxV = 10, minV = 0;
  const xStep = labels.length > 1 ? cw / (labels.length-1) : cw;

  // Grid lines
  [0,2,4,6,8,10].forEach(v => {
    const y = pad.top + ch - (v-minV)/(maxV-minV)*ch;
    ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(pad.left+cw,y);
    ctx.strokeStyle='#1e2d45'; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle='#64748b'; ctx.font='11px DM Sans,sans-serif';
    ctx.textAlign='right'; ctx.textBaseline='middle';
    ctx.fillText(v, pad.left-6, y);
  });

  if (values.length === 0) return;

  // Gradient fill
  const grad = ctx.createLinearGradient(0,pad.top,0,pad.top+ch);
  grad.addColorStop(0,'rgba(59,130,246,0.3)');
  grad.addColorStop(1,'rgba(59,130,246,0)');

  const pts = values.map((v,i) => ({
    x: pad.left + (labels.length>1 ? i*xStep : cw/2),
    y: pad.top + ch - (v-minV)/(maxV-minV)*ch
  }));

  ctx.beginPath();
  pts.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
  ctx.lineTo(pts[pts.length-1].x, pad.top+ch);
  ctx.lineTo(pts[0].x, pad.top+ch);
  ctx.closePath(); ctx.fillStyle=grad; ctx.fill();

  // Line
  ctx.beginPath();
  pts.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y));
  ctx.strokeStyle='#3b82f6'; ctx.lineWidth=2.5; ctx.lineJoin='round'; ctx.stroke();

  // Dots + values
  pts.forEach((p,i) => {
    ctx.beginPath(); ctx.arc(p.x,p.y,4,0,2*Math.PI);
    ctx.fillStyle='#3b82f6'; ctx.fill();
    ctx.strokeStyle='#0a0e1a'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#e2e8f0'; ctx.font='bold 11px DM Sans,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText(values[i], p.x, p.y-7);
  });

  // X-axis labels (show max 8 to avoid overlap)
  ctx.fillStyle='#64748b'; ctx.font='10px DM Sans,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='top';
  const step = Math.ceil(labels.length/8);
  labels.forEach((l,i) => {
    if (i % step !== 0 && i !== labels.length-1) return;
    const x = pad.left + (labels.length>1 ? i*xStep : cw/2);
    const shortLabel = l.slice(5); // MM-DD
    ctx.fillText(shortLabel, x, pad.top+ch+6);
  });
}


function sbeToggle(){
  const v=document.getElementById('sbe-disziplin').value;
  const isK=v==='Jump'||v==='Side Hit'||v==='Halfpipe'||v==='Landing Bag';
  document.querySelectorAll('.sbe-kicker').forEach(el=>el.style.display=isK?'':'none');
  document.querySelectorAll('.sbe-rail').forEach(el=>el.style.display=v==='Rail'?'':'none');
}


function closeSbEdit(){document.getElementById('sb-edit-overlay').style.display='none';}



  if(document.getElementById('sb-datum')) document.getElementById('sb-datum').valueAsDate = new Date();

// ═══════════════ AUS BEIDEN MODULEN ZUSAMMENGEFUEHRT ═══════════════
// Diese Funktionen standen wortgleich in snowboard.js und freeski.js.
// Aenderungen hier wirken auf beide Sportarten.

function parseDateInput(val) {
  if (!val) return '';
  const m = val.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (m) {
    const d=m[1].padStart(2,'0'), mo=m[2].padStart(2,'0');
    const y=m[3].length===2?'20'+m[3]:m[3];
    return `${y}-${mo}-${d}`;
  }
  return '';
}

function sbMonRing(pct, color, size, stroke) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return `<svg width="${size}" height="${size}" style="transform:rotate(-90deg);">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="var(--border)" stroke-width="${stroke}" fill="none"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - Math.min(1, Math.max(0, pct)))).toFixed(1)}" stroke-linecap="round"/>
  </svg>`;
}

function sbRunMaxEl() { return sessType && sessType.startsWith('Halfpipe') ? 10 : 8; }

function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  btn.classList.add('active');
  if (id === 'datenbank') loadDB();
  if (id === 'entwicklung') loadEntwicklung();
  if (id === 'erfassen') initSessionSetup();
  if (id === 'monitoring') loadMonitoring();
  if (id === 'sessionreport') loadReportsTab();
  if (typeof updateMobileNav === 'function') updateMobileNav(id);
}

function typMatches(typ, filter) { return !filter || typ === filter || (filter === 'Big Air Training' && typ === 'Jump On-Snow'); }

// ═══════════════ AUS BEIDEN MODULEN ZUSAMMENGEFUEHRT ═══════════════
// Diese Funktionen standen wortgleich in snowboard.js und freeski.js.
// Aenderungen hier wirken auf beide Sportarten.

function sbAllRailTricks() {
  return [...new Set(SB_RAIL_SUGGESTIONS.concat(SB_RAIL_TRICKS))];
}

function sbAllRailTypes() {
  const fromSelect = [...(document.getElementById('sb-railart')?.options || [])]
    .map(o => o.value).filter(Boolean);
  return [...new Set(fromSelect.concat(SB_CUSTOM_RAIL_TYPES))];
}

function sbCanonRailTrick(txt) {
  const norm = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const hit = sbAllRailTricks().find(t => norm(t) === norm(txt));
  return hit || txt.replace(/\s+/g, ' ').trim();
}

function sbRunState(name) {
  const d = sessAthleteData[name];
  if (!d.run) d.run = {no: 1, elements: [], ratings: [], addMode: '', railType: sbAllRailTypes()[0] || 'Rail', noteOpen: null};
  return d.run;
}

// ── Monitoring: Zustand, in beiden Sportarten gleich ──────────────────
let sbMonView = {level:'team', athlete:null, trick:null};
let sbMonFrom = '';            // custom range bounds (YYYY-MM-DD)
let sbMonTo = '';
let sbMonRows = null;          // cached attempt rows (tricks table, all pages)
let sbMonTyp = '';             // '' | session type
let sbMonRange = 'season';     // 'season' | 'last' | 'all' | 'custom'
let _monAthletes = [];
let _monTricks = [];

// ═══════════════ AUS BEIDEN MODULEN ZUSAMMENGEFUEHRT ═══════════════
// Diese Funktionen standen wortgleich in snowboard.js und freeski.js.
// Aenderungen hier wirken auf beide Sportarten.

function renderMonitoring() {
  const v = sbMonView;
  if (v.level === 'trick' && v.athlete && v.trick) renderMonTrick();
  else if (v.level === 'athlete' && v.athlete) renderMonAthlete();
  else renderMonTeam();
}

function sbMonApplyCustom() {
  sbMonFrom = document.getElementById('mon-date-from')?.value || '';
  sbMonTo = document.getElementById('mon-date-to')?.value || '';
  renderMonitoring();
}

function sbMonBack() {
  sbMonView = sbMonView.level === 'trick'
    ? {level:'athlete', athlete:sbMonView.athlete, trick:null}
    : {level:'team', athlete:null, trick:null};
  renderMonitoring();
}

function sbMonOpenAthlete(i) { sbMonView = {level:'athlete', athlete:_monAthletes[i], trick:null}; renderMonitoring(); window.scrollTo(0,0); }

function sbMonOpenTrick(i) { sbMonView = {level:'trick', athlete:sbMonView.athlete, trick:_monTricks[i] ? _monTricks[i].trick : null}; renderMonitoring(); window.scrollTo(0,0); }

function sbMonRangeBounds() {
  const now = new Date();
  const y = now.getMonth() + 1 >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  if (sbMonRange === 'season') return {from: y + '-05-01', to: ''};
  if (sbMonRange === 'last')   return {from: (y-1) + '-05-01', to: y + '-04-30'};
  if (sbMonRange === 'custom') return {from: sbMonFrom || '', to: sbMonTo || ''};
  return {from: '', to: ''};
}

function sbMonSetRange(val) { sbMonRange = val; renderMonitoring(); }

function sbMonSetTyp(val) { sbMonTyp = val; renderMonitoring(); }

function sbRunAddJump(name, label) {
  if (!label) return;
  const r = sbRunState(name);
  if (r.elements.length >= sbRunMaxEl()) { showToast('Max ' + sbRunMaxEl() + ' elements per run', 'error'); return; }
  r.elements.push({kind:'jump', label});
  r.ratings.push(null);
  r.addMode = '';
  renderLiveSession();
}

function sbRunNewRailType(name) {
  const v = (window.prompt('New rail type:') || '').replace(/\s+/g, ' ').trim();
  if (!v) return;
  const norm = s => s.toLowerCase();
  const existing = sbAllRailTypes().find(t => norm(t) === norm(v));
  const type = existing || v;
  if (!existing) {
    SB_CUSTOM_RAIL_TYPES.push(type);
    // auch im Assessment-Formular als Auswahl ergänzen
    const sel = document.getElementById('sb-railart');
    if (sel) { const o = document.createElement('option'); o.textContent = type; sel.appendChild(o); }
    const sel2 = document.getElementById('sbe-railart');
    if (sel2) { const o = document.createElement('option'); o.textContent = type; sel2.appendChild(o); }
  }
  sbRunState(name).railType = type;
  renderLiveSession();
}

function sbRunNoteToggle(name, i) {
  const r = sbRunState(name);
  r.noteOpen = (i === null || r.noteOpen === i) ? null : i;
  renderLiveSession();
}

function sbRunRate(name, i, val) {
  const r = sbRunState(name);
  r.ratings[i] = r.ratings[i] === val ? null : val;
  renderLiveSession();
}

function sbRunRemoveEl(name, i) {
  const r = sbRunState(name);
  r.elements.splice(i, 1);
  r.ratings.splice(i, 1);
  renderLiveSession();
}

function sbRunSetRailType(name, t) {
  sbRunState(name).railType = t;
  renderLiveSession();
  const inp = document.getElementById('run-rail-trick-' + name.replace(/\s/g,'_'));
  if (inp) inp.focus();
}

function sbRunToggleAdd(name, mode) {
  const r = sbRunState(name);
  r.addMode = r.addMode === mode ? '' : mode;
  renderLiveSession();
}

function setStatsMode(mode) {
  const trickSel = document.getElementById('ev-trick-sel');
  const dateSel  = document.getElementById('ev-date-sel');
  const btnT = document.getElementById('ev-mode-trick');
  const btnS = document.getElementById('ev-mode-session');
  [btnT,btnS].forEach(b=>{if(b){b.style.background='var(--surface2)';b.style.borderColor='var(--border)';b.style.color='var(--muted)';}});
  const active = mode==='trick'?btnT:btnS;
  if(active){active.style.background='rgba(57,195,212,0.2)';active.style.borderColor='#39c3d4';active.style.color='#39c3d4';}
  if(trickSel) trickSel.style.display = mode==='trick' ? '' : 'none';
  if(dateSel)  dateSel.style.display  = mode==='session' ? '' : 'none';
  const fRow = document.getElementById('ev-type-filter');
  if(fRow) fRow.style.display = mode==='session' ? 'none' : 'flex';
  if(mode!=='trick'   && trickSel) trickSel.value='';
  if(mode!=='session' && dateSel)  dateSel.value='';
  renderTrickAnalytics();
}

function sbMonFiltered() {
  let rows = sbMonRows || [];
  const {from, to} = sbMonRangeBounds();
  if (from) rows = rows.filter(t => (t.datum || '') >= from);
  if (to)   rows = rows.filter(t => (t.datum || '') <= to);
  if (sbMonTyp) rows = rows.filter(t => typMatches(t.typ, sbMonTyp));
  return rows;
}

function sbMonSyncSelects(prefix) {
  const {from, to} = sbMonRangeBounds();
  const seasonSel = document.getElementById(prefix + '-season-sel');
  const typSel = document.getElementById(prefix + '-typ-sel');
  const fromEl = document.getElementById(prefix + '-date-from');
  const toEl = document.getElementById(prefix + '-date-to');
  if (seasonSel) seasonSel.value = sbMonRange === 'season' ? 'current' : sbMonRange === 'all' ? 'all' : 'custom';
  if (fromEl) fromEl.value = from;
  if (toEl) toEl.value = to;
  if (typSel) typSel.value = sbMonTyp;
}
