// Snowboard-Modul. Nur Verhalten, das sich von Freeski unterscheidet.
// ═══════════════ SNOWBOARD-MODUL ═══════════════
const SnowboardModule = (() => {

// Supabase caps responses at 1000 rows — page through with .range()
async function sbFetchAllRows(buildQuery) {
  let all = [], from = 0;
  while (true) {
    const {data, error} = await buildQuery().range(from, from + 999);
    if (error) return {data: all, error};
    all = all.concat(data || []);
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return {data: all, error: null};
}

const CLASSIC_ACRO_AXES_FS = new Set(['Backroll','Frontroll','Underflip','Wildcat','Tamedog']);

function updateFwdSwBtn(prefix) {
  const achse = (document.getElementById(prefix+'-achse') || document.getElementById('edit-achse') || document.getElementById('sbe-achse'))?.value || '';
  const isClassic = CLASSIC_ACRO_AXES_FS.has(achse);
  const dirSelect = document.getElementById(prefix+'-drehrichtung') || document.getElementById('edit-drehrichtung') || document.getElementById('sbe-drehrichtung');
  const btnWrap = document.getElementById('fwsw-btns-'+prefix);
  if (!dirSelect) return;
  if (isClassic) {
    dirSelect.style.display = 'none';
    const dirOptions = achse === 'Underflip' ? ['Frontside','Switch Frontside'] : ['Forward','Switch'];
    if (btnWrap) btnWrap.remove();
    {
      const wrap = document.createElement('div');
      wrap.id = 'fwsw-btns-' + prefix;
      wrap.style.cssText = 'display:flex;gap:8px;margin-top:2px;';
      dirOptions.forEach(val => {
        const btn = document.createElement('button');
        btn.type='button'; btn.textContent=val; btn.dataset.val=val;
        const isActive = dirSelect.value === val;
        btn.style.cssText = `flex:1;padding:8px;border-radius:8px;font-family:'Poppins',sans-serif;font-size:13px;font-weight:600;cursor:pointer;border:1.5px solid;transition:all .15s;background:${isActive?'rgba(57,195,212,0.18)':'var(--surface2)'};border-color:${isActive?'#39c3d4':'var(--border)'};color:${isActive?'#39c3d4':'var(--muted)'};`;
        btn.onclick = () => {
          dirSelect.value = val;
          wrap.querySelectorAll('button').forEach(b => {
            const a = b.dataset.val === val;
            b.style.background=a?'rgba(57,195,212,0.18)':'var(--surface2)';
            b.style.borderColor=a?'#39c3d4':'var(--border)';
            b.style.color=a?'#39c3d4':'var(--muted)';
          });
        };
        wrap.appendChild(btn);
      });
      dirSelect.parentElement.appendChild(wrap);
    }
  } else {
    dirSelect.style.display = '';
    if (btnWrap) btnWrap.style.display = 'none';
  }
}

function updateSbDisciplines() {
  if (typeof renderSbGrabs === 'function') renderSbGrabs();
  const athlet = document.getElementById('sb-athlet').value;
  const sel = document.getElementById('sb-disziplin');
  if (!athlet) return;
  const hpAthletes = ['Demo HP Snowboard', 'Isabelle Lötscher', 'Berenice Wicki', 'David Hablützel', 'Mischa Zürcher', 'Lura Wick', 'Leonardo Saraiva', 'Soha Janett'];
  const isHP = hpAthletes.includes(athlet);
  if (isHP) {
    sel.innerHTML = '<option value="Halfpipe">Halfpipe</option>';
    sel.value = 'Halfpipe';
    sel.style.display = 'none';
  } else {
    sel.innerHTML = '<option value="">— select —</option><option>Jump</option><option>Side Hit</option><option>Rail</option>';
    sel.value = '';
    sel.style.display = '';
  }
  toggleDisziplin('sb');
}

const SB_DIR_NORMAL = '<option value="">–</option><option>Frontside</option><option>Backside</option><option>Switch Frontside</option><option>Switch Backside</option>';

const SB_DIR_HP     = '<option value="">–</option><option>Frontside</option><option>Frontside Alley Oop</option><option>Backside</option><option>Backside Alley Oop</option><option>Cab</option><option>Cab Alley Oop</option><option>Switch Backside</option><option>Switch Backside Alley Oop</option>';

function toggleDisziplin(prefix) {
  const v = document.getElementById(prefix + '-disziplin').value;
  if (prefix === 'sb') {
    const divider = document.getElementById('sb-disc-divider');
    if (divider) divider.textContent = v || 'Jump / Halfpipe';
    const dirSel = document.getElementById('sb-drehrichtung');
    if (dirSel) dirSel.innerHTML = v === 'Halfpipe' ? SB_DIR_HP : SB_DIR_NORMAL;
    initStandortGrabs();
  }
  const isJump = v === 'Jump' || v === 'Side Hit' || v === 'Halfpipe' || v === 'Landing Bag';
  document.querySelectorAll('.kicker-field-' + prefix).forEach(el => el.classList.toggle('hidden', !isJump));
  document.querySelectorAll('.rail-field-' + prefix).forEach(el => el.classList.toggle('hidden', v !== 'Rail'));
}

function trickDesc(t, prefix) {
  // Works for both DB trick objects and field-read objects (using prefix)
  const p = prefix ? prefix + '-' : '';
  const disziplin = t ? t.disziplin : val(p + 'disziplin');
  if (!disziplin) return null;

  if (disziplin === 'Rail') {
    const parts = [
      t ? t.inspin   : val(p+'inspin'),
      t ? t.slideform : val(p+'slideform'),
      t ? t.slidevar  : val(p+'slidevar'),
      t ? t.foot      : val(p+'foot'),
      t ? t.swap      : val(p+'swap'),
      t ? t.transfer  : val(p+'transfer'),
      t ? t.outspin   : val(p+'outspin'),
      t ? t.railart   : val(p+'railart'),
    ].filter(Boolean);
    return parts.join(' ') || '–';
  } else {
    const parts = [
      t ? t.absprung  : val(p+'absprung'),
      t ? t.drehrichtung : val(p+'drehrichtung'),
      (t ? t.flips : val(p+'flips')) && !['keine','None','none','—'].includes(t ? t.flips : val(p+'flips')) ? (t ? t.flips : val(p+'flips')) : null,
      t ? t.achse : val(p+'achse'),
      t ? t.rotation     : val(p+'rotation'),
      t ? t.grab  : val(p+'grab'),
      (t ? t.bringback : val(p+'bringback')) ? 'Bringback ' + (t ? t.bringback : val(p+'bringback')) : null,
      t ? t.style : val(p+'style'),
    ].filter(Boolean);
    return parts.join(' ') || '–';
  }
}

async function loadDB() {
  updateSeasonLabels();
  const perfEl = document.getElementById('perf-table');
  if (perfEl) perfEl.innerHTML = '<div class="loading"><span class="spinner"></span></div>';

  const [{ data: tricks, error: e1 }, { data: standort, error: e2 }, { data: reports }] = await Promise.all([
    sbFetchAllRows(() => db.from('tricks').select('*').order('datum', { ascending: false })),
    sbFetchAllRows(() => db.from('standort').select('*').order('created_at', { ascending: false })),
    db.from('session_reports').select('*').eq('app','snowboard').order('datum',{ascending:false}).limit(50),
  ]);

  if (e1 || e2) {
    showToast('Error loading data', 'error');
    return;
  }

  dbAllTricks   = (tricks   || []).map(t => ({ ...t, _quelle: 'session' }));
  dbAllStandort = (standort || []).map(t => ({ ...t, _quelle: 'standort' }));
  dbSessionReports = reports || [];
  if (GROUP_FILTER !== 'all') {
    const names = new Set(SESS_ALL_ATHLETES.map(a => a.name));
    dbAllTricks = dbAllTricks.filter(t => names.has(t.athlet));
    dbAllStandort = dbAllStandort.filter(t => names.has(t.athlet));
    dbSessionReports = dbSessionReports.filter(r => Array.isArray(r.athletes) && r.athletes.some(n => names.has(n)));
  }

  renderSessionPerformance();
  renderSessionReports();
  autoRebuildAllReports();
}

function generateAthleteReport() {
  const athName = document.getElementById('ar-athlete-sel')?.value;
  const season  = document.getElementById('ar-season-sel')?.value || 'current';
  if (!athName) { showToast('Please select an athlete', 'error'); return; }

  const { from } = getSeasonRange();
  let data = dbAllTricks.filter(t => t.athlet === athName && t.trickaufbau);
  let seasonLabel = 'All time';
  if (season === 'current' && from) {
    data = data.filter(t => t.datum >= from);
    seasonLabel = 'Current season';
  } else if (season === 'custom') {
    const dateFrom = document.getElementById('ar-date-from')?.value;
    const dateTo   = document.getElementById('ar-date-to')?.value;
    if (!dateFrom && !dateTo) { showToast('Please select a date range', 'error'); return; }
    if (dateFrom) data = data.filter(t => t.datum >= dateFrom);
    if (dateTo)   data = data.filter(t => t.datum <= dateTo);
    const fmt = d => { if (!d) return ''; const p=d.split('-'); return p[2]+'.'+p[1]+'.'+p[0].slice(2); };
    seasonLabel = (dateFrom ? fmt(dateFrom) : '…') + ' – ' + (dateTo ? fmt(dateTo) : '…');
  }
  const arTyp = document.getElementById('ar-typ-sel')?.value || '';
  if (arTyp) {
    data = data.filter(t => t.typ === arTyp);
    seasonLabel += ' · ' + (SESS_TYPE_SHORT[arTyp] || arTyp);
  }
  data.sort((a,b) => (a.created_at||'').localeCompare(b.created_at||''));

  if (!data.length) { showToast('No session data for this athlete / period', 'error'); return; }

  showToast('Generating PDF…', 'success');

  // Build per-trick summary
  const trickMap = {};
  data.forEach(e => {
    const trick = normSbTrick(e.trickaufbau);
    if (!trickMap[trick]) trickMap[trick] = {att:0,land:0,stomped:0};
    trickMap[trick].att++;
    if (e.gelandet==='Yes') trickMap[trick].land++;
    if ((e.gesamt||0)>=10) trickMap[trick].stomped++;
  });
  const trickRows = Object.entries(trickMap)
    .sort((a,b) => b[1].att - a[1].att)
    .map(([trick,s]) => {
      const lp = s.att ? Math.round(s.land/s.att*100) : 0;
      return [trick, s.att, s.land-(s.stomped||0), s.stomped, lp+'%'];
    });

  // Build per-session breakdown
  const sessMap = {};
  data.forEach(e => {
    const key = e.datum+'|'+(e.typ||'');
    if (!sessMap[key]) sessMap[key] = {datum:e.datum, typ:e.typ||'', att:0, land:0};
    sessMap[key].att++;
    if (e.gelandet==='Yes') sessMap[key].land++;
  });
  const sessRows = Object.values(sessMap)
    .sort((a,b) => a.datum.localeCompare(b.datum))
    .map(s => {
      const p=s.datum.split('-'); const d=p[2]+'.'+p[1]+'.'+p[0].slice(2);
      const lp = s.att ? Math.round(s.land/s.att*100) : 0;
      return [d, s.typ||'—', s.att, s.land, lp+'%'];
    });

  const totalAtt  = data.length;
  const totalLand = data.filter(e=>e.gelandet==='Yes').length;
  const totalPct  = totalAtt ? Math.round(totalLand/totalAtt*100) : 0;
  const filename = 'Athlete_Report_'+athName.replace(/\s/g,'_')+'_'+(new Date().toISOString().split('T')[0].replace(/-/g,''))+'.pdf';

  function generate() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'mm', format:'a4', orientation:'portrait' });
    const W=210, margin=16, cw=W-margin*2;
    let y = margin;

    // Header bar
    doc.setFillColor(26,26,26);
    doc.rect(margin, y, cw, 10, 'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(11);
    doc.setTextColor(255,255,255);
    doc.text('ATHLETE REPORT', margin+4, y+6.8);
    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    doc.setTextColor(180,180,180);
    doc.text('Swiss-Ski Trick Analyses — Snowboard', W-margin-2, y+6.8, {align:'right'});
    y += 14;

    // Meta
    const meta = [['Athlete', athName], ['Period', seasonLabel], ['Sessions', sessRows.length+''],
                  ['Total Attempts', totalAtt+''], ['Landed+Stomped', totalLand+''], ['Landing Rate', totalPct+'%']];
    const col = cw/3;
    doc.setFontSize(7.5);
    meta.forEach(([label, val], i) => {
      const cx = margin + (i%3)*col;
      const cy = y + Math.floor(i/3)*11;
      doc.setFont('helvetica','normal'); doc.setTextColor(130,130,130);
      doc.text(label.toUpperCase(), cx, cy);
      doc.setFont('helvetica','bold'); doc.setTextColor(26,26,26);
      doc.text(String(val), cx, cy+4.5);
    });
    y += 26;

    doc.setDrawColor(220,220,220);
    doc.line(margin, y, W-margin, y);
    y += 5;

    // Trick summary table
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(130,130,130);
    doc.text('TRICK SUMMARY', margin, y); y += 4;
    doc.autoTable({
      startY: y, margin:{left:margin,right:margin},
      head:[['Trick','Att.','Landed','Stomped','Rate']],
      body: trickRows,
      theme:'grid',
      styles:{fontSize:8.5,cellPadding:2.5,textColor:[34,34,34],lineColor:[230,230,230]},
      headStyles:{fillColor:[240,240,240],textColor:[100,100,100],fontStyle:'bold',fontSize:7.5},
      columnStyles:{0:{cellWidth:cw*0.44},1:{cellWidth:cw*0.13,halign:'center'},2:{cellWidth:cw*0.15,halign:'center'},3:{cellWidth:cw*0.13,halign:'center'},4:{cellWidth:cw*0.15,halign:'center'}},
      didParseCell(data) {
        if (data.column.index===4 && data.section==='body') {
          const v=parseInt(data.cell.raw);
          data.cell.styles.textColor=v>=70?[45,138,78]:v>=50?[180,100,0]:[200,30,30];
          data.cell.styles.fontStyle='bold';
        }
      }
    });
    y = doc.lastAutoTable.finalY + 8;

    if (y > 240) { doc.addPage(); y = margin; }

    // Session breakdown table
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(130,130,130);
    doc.text('SESSION BREAKDOWN', margin, y); y += 4;
    doc.autoTable({
      startY: y, margin:{left:margin,right:margin},
      head:[['Date','Type','Attempts','Landed','Rate']],
      body: sessRows,
      theme:'grid',
      styles:{fontSize:8.5,cellPadding:2.5,textColor:[34,34,34],lineColor:[230,230,230]},
      headStyles:{fillColor:[240,240,240],textColor:[100,100,100],fontStyle:'bold',fontSize:7.5},
      columnStyles:{0:{cellWidth:cw*0.2},1:{cellWidth:cw*0.3},2:{cellWidth:cw*0.17,halign:'center'},3:{cellWidth:cw*0.17,halign:'center'},4:{cellWidth:cw*0.16,halign:'center'}},
      didParseCell(data) {
        if (data.column.index===4 && data.section==='body') {
          const v=parseInt(data.cell.raw);
          data.cell.styles.textColor=v>=70?[45,138,78]:v>=50?[180,100,0]:[200,30,30];
          data.cell.styles.fontStyle='bold';
        }
      }
    });

    // Footer
    const pg = doc.internal.getNumberOfPages();
    for (let i=1;i<=pg;i++) {
      doc.setPage(i);
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(170,170,170);
      doc.text('Generated '+new Date().toLocaleDateString('de-CH'), margin, 295);
      doc.text(i+' / '+pg, W-margin, 295, {align:'right'});
    }
    doc.save(filename);
  }

  function loadAndGenerate() {
    if (window.jspdf && window.jspdf.jsPDF) { generate(); return; }
    const s1 = document.createElement('script');
    s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
      s2.onload = generate;
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  }
  loadAndGenerate();
}

function renderSessionReports() {
  const el = document.getElementById('session-reports-list');
  if (!el) return;
  if (!dbSessionReports.length) { el.innerHTML = '<div style="color:var(--muted);padding:12px;font-size:13px;">No session reports yet.</div>'; return; }
  // Card layout (works well on mobile AND desktop)
  el.innerHTML = dbSessionReports.map((r,idx) => {
    const dateStr = r.datum ? (() => { const p=r.datum.split('-'); return p[2]+'.'+p[1]+'.'+p[0].slice(2); })() : '';
    const condStars = r.conditions ? '★'.repeat(r.conditions)+'☆'.repeat(5-r.conditions) : '';
    const athStr = Array.isArray(r.athletes) ? r.athletes.map(a=>shortName(a)).join(', ') : '';
    const durStr = r.duration_min ? (r.duration_min/60).toFixed(1).replace('.0','')+'h' : '—';
    const typeShort = {'Landing Bag':'Bag','Jump On-Snow':'On-Snow','Big Air Competition':'Comp'}[r.session_type]||r.session_type||'—';
    return `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);">
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;color:var(--text);">${dateStr} &nbsp;<span style="color:var(--muted);font-weight:400;font-size:12px;">${typeShort} · ${durStr}</span></div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${athStr}${condStars?' · '+condStars:''}</div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button onclick="openSessionReportView(window._srReports[${idx}])" style="padding:6px 12px;border-radius:6px;background:rgba(57,195,212,0.15);border:1px solid #39c3d4;color:#39c3d4;font-family:'Poppins',sans-serif;font-size:12px;cursor:pointer;">View</button>
<button onclick="deleteSessionReport(${r.id},false)" title="Delete report only" style="padding:6px 8px;border-radius:6px;background:none;border:1px solid #e2001a33;color:#e2001a;font-size:13px;cursor:pointer;">🗑</button>
        <button onclick="deleteSessionReport(${r.id},true)" title="Delete report + all trick data" style="padding:6px 8px;border-radius:6px;background:none;border:1px solid #e2001a;color:#e2001a;font-size:11px;cursor:pointer;font-weight:700;">🗑+</button>
      </div>
    </div>`;
  }).join('');
  window._srReports = dbSessionReports;
  populateAthleteReportDropdown();
}

async function rebuildReportFromTimestamps(id, silent=false) {
  const report = dbSessionReports.find(r => r.id === id) || _sbRepList.find(r => r.id === id);
  if (!report) return;
  if (!silent) showToast('Rebuilding…', 'success');
  const athletes = Array.isArray(report.athletes) ? report.athletes : [];
  const storedIds = Array.isArray(report.trick_data)
    ? report.trick_data.flatMap(t => Array.isArray(t.trickIds) ? t.trickIds : [])
    : [];

  let query = db.from('tricks').select('*');
  query = storedIds.length
    ? query.in('id', storedIds)
    : query.eq('datum', report.datum).in('athlet', athletes);
  const {data: entries, error} = await query.order('created_at', {ascending: true});
  if (error || !entries) { showToast('Error: '+(error?.message||'no data'), 'error'); return; }

  const athleteEntries = {};
  entries.forEach(e => {
    const name = e.athlet;
    if (!athleteEntries[name]) athleteEntries[name] = [];
    const result = e.outcome === 'stomped' ? 'perfect' : e.outcome === 'failed' ? 'miss'
      : e.outcome === 'landed' ? 'landed'
      : (e.gesamt||0) >= 10 ? 'perfect' : e.gelandet==='Yes' ? 'landed' : 'miss';
    athleteEntries[name].push({trick: e.trickaufbau||'—', result, dbId: e.id,
      kpis: e.kpis||null, fail: e.fail_grund||null,
      sterne: typeof e.sterne==='number' ? e.sterne : null,
      time: e.created_at ? new Date(e.created_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : null,
      comment: e.kommentar||''});
  });

  const existingNotes = {};
  const existingScores = {};
  (report.trick_data||[]).forEach(a => {
    if (a.note) existingNotes[a.athlet] = a.note;
    if ((a.quali_scores && a.quali_scores.length) || (a.final_scores && a.final_scores.length) || a.contest_rank) existingScores[a.athlet] = {q: a.quali_scores || null, f: a.final_scores || null, r: a.contest_rank || null};
  });

  const trickData = Object.entries(athleteEntries).map(([name, ents]) => {
    const trickList = buildFsTrickBlocks(ents);
    const totalAtt  = trickList.reduce((a,t)=>a+t.att,0);
    const totalLand = trickList.reduce((a,t)=>a+t.land,0);
    const note = existingNotes[shortName(name)] || '';
    const trickIds = ents.map(e=>e.dbId).filter(Boolean);
    const attempts = ents.map(e => ({trick: e.trick,
      outcome: e.result==='miss'?'failed':e.result==='perfect'?'stomped':'landed',
      sterne: e.sterne, kpis: e.kpis, fail: e.fail, time: e.time,
      dbId: e.dbId || null,
      comment: e.comment || undefined}));
    const exs = existingScores[shortName(name)] || {};
    return {athlet: shortName(name), totalAtt, totalLand, tricks: trickList, note, trickIds, attempts,
      quali_scores: exs.q ?? null, final_scores: exs.f ?? null, contest_rank: exs.r ?? null};
  });

  const {error: updErr} = await db.from('session_reports').update({trick_data: trickData}).eq('id', id);
  if (updErr) { if (!silent) showToast('Error saving: '+updErr.message, 'error'); return; }
  if (!silent) showToast('Report rebuilt from timestamps', 'success');
  // Update local caches so the report is current without re-fetching
  const idx = dbSessionReports.findIndex(r => r.id === id);
  if (idx >= 0) dbSessionReports[idx].trick_data = trickData;
  const rIdx = _sbRepList.findIndex(r => r.id === id);
  if (rIdx >= 0) _sbRepList[rIdx].trick_data = trickData;
}

async function deleteSessionReport(id, withTricks) {
  const report = dbSessionReports.find(r => r.id === id) || _sbRepList.find(r => r.id === id);
  if (!withTricks) {
    if (!confirm('Delete this session report?\n\nOption 1: Click OK to delete ONLY the report.\nTo also delete all trick entries from this session, use the trash + data button.')) return;
    const {error} = await db.from('session_reports').delete().eq('id', id);
    if (error) { showToast('Error: '+error.message, 'error'); return; }
    showToast('Session report deleted', 'success');
  } else {
    const storedIds = (report && Array.isArray(report.trick_data))
      ? report.trick_data.flatMap(t => Array.isArray(t.trickIds) ? t.trickIds : [])
      : [];
    const usesFallback = storedIds.length === 0;
    const warning = usesFallback
      ? '\n\n⚠️ This report predates precise trick tracking — it will delete ALL trick entries for these athletes on this date, including any from OTHER sessions that day.'
      : '';
    if (!confirm('Delete this session report AND all trick entries from this session?' + warning)) return;
    if (usesFallback) {
      if (report && report.datum && report.athletes) {
        for (const ath of report.athletes) {
          await db.from('tricks').delete().eq('athlet', ath).eq('datum', report.datum);
        }
      }
    } else {
      await db.from('tricks').delete().in('id', storedIds);
    }
    const {error} = await db.from('session_reports').delete().eq('id', id);
    if (error) { showToast('Error: '+error.message, 'error'); return; }
    showToast('Session + all trick entries deleted', 'success');
  }
  if (document.getElementById('page-sessionreport')?.classList.contains('active')) loadReportsTab();
  else loadDB();
}

function openTeamPdfReport() {
  const trSeason = document.getElementById('tr-season-sel')?.value || 'current';
  const trTyp = document.getElementById('tr-typ-sel')?.value || '';
  let sessData = (dbAllTricks||[]);
  let periodLabel = 'All time';
  if (trSeason === 'current') {
    const now = new Date();
    const y = now.getMonth()+1 >= 5 ? now.getFullYear() : now.getFullYear()-1;
    sessData = sessData.filter(t => t.datum >= y + '-05-01');
    periodLabel = 'Current season';
  } else if (trSeason === 'custom') {
    const f = document.getElementById('tr-date-from')?.value, to = document.getElementById('tr-date-to')?.value;
    if (!f && !to) { showToast('Please select a date range', 'error'); return; }
    if (f)  sessData = sessData.filter(t => t.datum >= f);
    if (to) sessData = sessData.filter(t => t.datum <= to);
    const fmtP = d => { if (!d) return '…'; const p=d.split('-'); return p[2]+'.'+p[1]+'.'+p[0].slice(2); };
    periodLabel = fmtP(f) + ' – ' + fmtP(to);
  }
  if (trTyp) {
    sessData = sessData.filter(t => t.typ === trTyp);
    periodLabel += ' · ' + (SESS_TYPE_SHORT[trTyp] || trTyp);
  }
  const assData = (dbAllStandort||[]);
  if (!sessData.length && !assData.length) { showToast('No data to export', 'error'); return; }

  function fmtDate(d) { if(!d) return '—'; const p=d.split('-'); return p[2]+'.'+p[1]+'.'+p[0].slice(2); }

  const athletes = [...new Set([...sessData.map(t=>t.athlet), ...assData.map(t=>t.athlet)])].filter(Boolean).sort();

  const athleteSections = athletes.map(athlet => {
    const tricks = sessData.filter(t=>t.athlet===athlet);
    const totalAtt = tricks.length;
    const totalLand = tricks.filter(t=>t.gelandet==='Yes').length;
    const totalStomped = tricks.filter(t=>(t.gesamt||0)>=10).length;
    const landPct = totalAtt ? Math.round(totalLand/totalAtt*100) : 0;

    const byTrick = {};
    tricks.forEach(t => {
      const key = normSbTrick(t.trickaufbau||'—');
      if (!byTrick[key]) byTrick[key] = {att:0,land:0,stomped:0,dates:new Set(),type:new Set()};
      byTrick[key].att++;
      if(t.gelandet==='Yes') byTrick[key].land++;
      if((t.gesamt||0)>=10) byTrick[key].stomped++;
      if(t.datum) byTrick[key].dates.add(fmtDate(t.datum));
      if(t.typ) byTrick[key].type.add(t.typ);
    });
    const sessRows = Object.entries(byTrick).sort((a,b)=>b[1].att-a[1].att).map(([trick,s]) => {
      const lp = s.att ? Math.round(s.land/s.att*100) : 0;
      const typeStr = [...s.type].map(t=>({'Landing Bag':'Bag','Jump On-Snow':'On-Snow','Big Air Competition':'Comp'}[t]||t)).join(', ');
      return `<tr><td>${trick}</td><td>${typeStr}</td><td style="text-align:center">${s.att}</td><td style="text-align:center">${s.land-s.stomped}</td><td style="text-align:center">${s.stomped}</td><td style="text-align:center;font-weight:700;color:${lp>=70?'#34d399':lp>=40?'#f59e0b':'#cc0000'}">${lp}%</td><td style="font-size:11px;color:#777">${[...s.dates].slice(-3).join(', ')}</td></tr>`;
    }).join('');

    const mastered = assData.filter(t=>t.athlet===athlet&&t.status==='mastered');
    const goals    = assData.filter(t=>t.athlet===athlet&&t.status==='goal');
    const grabRowsFor = st => assData
      .filter(t => t.athlet===athlet && t.grab_status && typeof t.grab_status==='object')
      .map(e => Object.entries(e.grab_status)
        .filter(([,s2]) => s2===st)
        .map(([g]) => `<tr><td>${normSbTrick(e.trick_label||'—')} — ${g}</td><td>${e.disziplin||'—'}</td><td style="color:${st==='mastered'?'#34d399':'#f59e0b'};font-weight:600">${st==='mastered'?'Learned':'Goal'}</td></tr>`)
        .join(''))
      .join('');
    const mastRows = mastered.map(e=>`<tr><td>${normSbTrick(e.trick_label||'—')}</td><td>${e.disziplin||'—'}</td><td style="color:#34d399;font-weight:600">Learned</td></tr>`).join('') + grabRowsFor('mastered');
    const goalRows = goals.map(e=>`<tr><td>${normSbTrick(e.trick_label||'—')}</td><td>${e.disziplin||'—'}</td><td style="color:#f59e0b;font-weight:600">Goal</td></tr>`).join('') + grabRowsFor('goal');

    return `<div class="ath-block">
      <div class="ath-name">${athlet}</div>
      ${totalAtt>0?`
      <div class="section-title">Session Performance</div>
      <div class="ath-sum">${totalAtt} attempts &nbsp;·&nbsp; ${totalLand-totalStomped} landed &nbsp;·&nbsp; ${totalStomped} stomped &nbsp;·&nbsp; ${landPct}%</div>
      <table><thead><tr><th>Trick</th><th>Type</th><th>Att.</th><th>Landed</th><th>Stomped</th><th>Rate</th><th>Sessions</th></tr></thead><tbody>${sessRows||'<tr><td colspan="7" style="color:#aaa">No session data</td></tr>'}</tbody></table>` : ''}
      ${(mastRows||goalRows)?`
      <div class="section-title">Assessment</div>
      <table><thead><tr><th>Trick</th><th>Discipline</th><th>Status</th></tr></thead><tbody>${mastRows}${goalRows}</tbody></table>` : ''}
    </div>`;
  }).join('');

  const today = new Date().toLocaleDateString('en-GB');
  const title = 'Full Team — ' + periodLabel;
  const win = window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Team Report — ${title}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a1a;padding:32px 40px;max-width:900px;margin:0 auto;font-size:13px;}
  .print-btn{margin-bottom:24px;}
  .print-btn button{padding:9px 22px;background:#1a1a1a;color:#fff;border:none;border-radius:4px;font-size:13px;cursor:pointer;}
  h1{font-size:20px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;border-bottom:2px solid #1a1a1a;padding-bottom:12px;margin-bottom:20px;}
  .ath-block{margin-bottom:24px;border:1px solid #e0e0e0;border-radius:4px;overflow:hidden;page-break-inside:avoid;}
  .ath-name{background:#1a1a1a;color:#fff;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:8px 12px;}
  .ath-sum{background:#f9f9f9;border-bottom:1px solid #e0e0e0;padding:6px 12px;font-size:12px;color:#555;}
  table{width:100%;border-collapse:collapse;}
  th{background:#f0f0f0;padding:6px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#666;}
  td{padding:6px 10px;border-top:1px solid #eee;font-size:12px;}
  .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#777;padding:8px 12px 4px;background:#fafafa;border-top:1px solid #e0e0e0;border-bottom:1px solid #eee;}
  footer{margin-top:28px;border-top:1px solid #ddd;padding-top:10px;font-size:11px;color:#aaa;display:flex;justify-content:space-between;}
  @media print{.print-btn{display:none;} body{padding:16px;}}
</style></head><body>
  <div class="print-btn"><button onclick="window.print()">Print / Save as PDF</button></div>
  <h1>Team Report — ${title}</h1>
  ${athleteSections}
  <footer><span>Swiss-Ski Trick Analyses Snowboard</span><span>Generated ${today}</span></footer>
</body></html>`);
  win.document.close();
}

let sessActiveTricks = {};

function saveSessionState() {
  const state = {
    athletes: sessSelectedAthletes,
    log: sessLog,
    type: sessType,
    date: sessDate,
    startTime: sessStartTime,
    activeAthlete: sessActiveSbAthlete || '',
    athleteState: {}
  };
  sessSelectedAthletes.forEach(name => {
    const d = sessAthleteData[name];
    if (d) state.athleteState[name] = { currentTrick: d.currentTrick, currentGrab: d.currentGrab||'', stats: {...d.stats}, run: d.run || null };
  });
  localStorage.setItem('sb_session', JSON.stringify(state));
}

function clearSessionStorage() {
  localStorage.removeItem('sb_session');
}

async function restoreSessionState() {
  const raw = localStorage.getItem('sb_session');
  if (!raw) return false;
  try {
    const state = JSON.parse(raw);
    if (!state.athletes || !state.athletes.length) { clearSessionStorage(); return false; }
    sessSelectedAthletes = state.athletes;
    sessLog = state.log || [];
    sessType = state.type || '';
    sessDate = state.date || '';
    sessStartTime = state.startTime || Date.now();
    sessActiveSbAthlete = state.activeAthlete || state.athletes[0];
    for (const name of sessSelectedAthletes) {
      const saved = (state.athleteState || {})[name] || {};
      sessAthleteData[name] = { tricks: [], currentTrick: saved.currentTrick || '', currentGrab: saved.currentGrab || '', stats: saved.stats || {attempts:0,landed:0,perfect:0}, run: saved.run || null };
    }
    document.getElementById('sess-setup').style.display = 'none';
    document.getElementById('sess-live').style.display = 'block';
    document.getElementById('sess-live-date').textContent =
      (sessDate ? sessDisplayDate() : new Date(sessStartTime).toLocaleDateString('en-GB', {weekday:'long',day:'numeric',month:'long',year:'numeric'}))
      + (sessType ? '  ·  ' + sessType : '')
      + (sessDate ? '  ·  ⚠ BACKDATED' : '');
    renderLiveSession();
    renderSessionLog();
    showToast('Session restored', 'success');
    // Load tricks from DB in background, then re-render dropdown
    Promise.all(sessSelectedAthletes.map(async name => {
      sessAthleteData[name].tricks = await fetchStandortTricks(name);
    })).then(() => renderLiveSession());
    return true;
  } catch(e) { clearSessionStorage(); return false; }
}

async function toggleSessionAthlete(name) {
  const cb = document.querySelector(`#sess-athlete-grid input[value="${CSS.escape(name)}"]`);
  if (sessSelectedAthletes.includes(name)) {
    sessSelectedAthletes = sessSelectedAthletes.filter(a => a !== name);
    delete sessAthleteData[name];
    delete sessActiveTricks[name];
    const card = document.getElementById('sess-ath-card-' + name.replace(/\s/g,'_'));
    if (card) card.style.borderColor = 'var(--border)';
  } else {
    if (sessSelectedAthletes.length >= 8) {
      showToast('Max. 8 athletes per session', 'error');
      if (cb) cb.checked = false;
      return;
    }
    sessSelectedAthletes.push(name);
    sessAthleteData[name] = { tricks: [], currentTrick: '', currentGrab: '', stats: {attempts:0,landed:0,perfect:0} };
    const card = document.getElementById('sess-ath-card-' + name.replace(/\s/g,'_'));
    if (card) card.style.borderColor = '#39c3d4';
    sessAthleteData[name].tricks = await fetchStandortTricks(name);
  }
  // Show/hide start button directly — no trick pre-selection step
  const startBtn = document.getElementById('sess-start-btn');
  if (startBtn) startBtn.style.display = sessSelectedAthletes.length ? 'block' : 'none';
  // Hide the old trick-selection div
  const trickSel = document.getElementById('sess-trick-selection');
  if (trickSel) trickSel.style.display = 'none';
}

const SESS_DIRECTIONS = ['Frontside','Backside','Switch Frontside','Switch Backside','Forward','Switch'];

const SESS_GRABS = ['Bloody Dracula', 'Canadian Bacon', 'Chicken Salad', 'Cookie Monster', 'Crail', 'Crooked Cop', 'Cross Rocket', 'Double Tail', 'Dracula Method', 'Drunk Driver', 'Freshfish', 'Frontside', 'Indy', 'Japan', 'Lien', 'Melon', 'Method', 'Nose', 'Nuclear', 'Nuclear Method', 'Reach Around', 'Roast Beef', 'Rocket Air', 'Rusty Trombone', 'Sad Air', 'Seat Belt', 'Slob', 'Spaghetti', 'Stalefish', 'Stelmasky', 'Stink Bug', 'Suitcase', 'Swiss Cheese', 'Tai Pan', 'Tail', 'Truck Driver', 'Tuck Knee', 'Weddle (Mute)'];

function normSbTrick(label) {
  if (!label) return label;
  // Grab-Separator vereinheitlichen: Live-Session schreibt «Trick — Grab»,
  // das Erfassen-Formular «Trick Grab» — sonst erscheint derselbe Trick doppelt.
  label = label.replace(/\s+—\s+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  // Alte Label-Reihenfolge «Rotation Achse» (z. B. «1440 Cork») → «Achse Rotation»,
  // damit bestehende Einträge gleich angezeigt und mit neuen gruppiert werden.
  label = label.replace(/\b(180|270|360|450|540|630|720|810|900|1080|1260|1440|1620|1800|1980|2160)\s+(Infinity Axis|Upright Spins|Bio\/Misty|Backroll|Frontroll|Underflip|Crippler|McTwist|Wildcat|Tamedog|Todeo|Rodeo|Cork|Flat)\b/g, '$2 $1');
  // «SH »-Präfix (Side Hit) abtrennen und am Schluss wieder voranstellen
  let shPre = '';
  if (label.startsWith('SH ')) { shPre = 'SH '; label = label.slice(3); }
  const dirs = ['Switch Backside','Switch Frontside','Frontside','Backside','Cab'];
  let dir = null;
  for (const d of dirs) if (label.startsWith(d + ' ')) { dir = d; break; }
  if (!dir) {
    // Direction appended at end?
    for (const d of dirs) {
      if (label.endsWith(' ' + d)) { label = d + ' ' + label.slice(0, -(d.length+1)).trim(); dir = d; break; }
    }
  }
  if (!dir) return shPre + label;
  // Grab-Position vereinheitlichen: das Formular schreibt den Grab vor Bringback/Style,
  // die Live-Session ans Ende — Grabs ans Ende verschieben, sonst doppelte Tricks.
  let rest = label.slice(dir.length + 1);
  const grabsSorted = [...new Set([...SESS_GRABS, ...(typeof SB_HP_GRABS !== 'undefined' ? SB_HP_GRABS : []), ...(typeof SB_JUMP_GRABS !== 'undefined' ? SB_JUMP_GRABS : [])])].sort((a,b) => b.length - a.length);
  const endsWithGrab = grabsSorted.some(g => rest === g || rest.endsWith(' ' + g));
  if (!endsWithGrab) {
    const found = [];
    for (const g of grabsSorted) {
      const re = new RegExp('(^|\\s)' + g.replace(/[-.*+?^${}()|[\]\\]/g, '\\$&') + '(?=\\s|$)');
      if (re.test(rest)) { found.push(g); rest = rest.replace(re, ' ').replace(/\s{2,}/g, ' ').trim(); }
    }
    if (found.length) rest = (rest ? rest + ' ' : '') + found.join(' ');
  }
  return shPre + dir + ' ' + rest;
}

function tricksForDir(tricks, dir) {
  return tricks.filter(t => {
    const lbl = (t.trick_label||'').toLowerCase();
    if (dir === 'Switch Backside')  return lbl.startsWith('switch backside');
    if (dir === 'Switch Frontside') return lbl.startsWith('switch frontside') || lbl.startsWith('cab');
    if (dir === 'Frontside')       return lbl.startsWith('frontside');
    if (dir === 'Backside')        return lbl.startsWith('backside') && !lbl.startsWith('switch backside');
    if (dir === 'Forward')         return lbl.startsWith('forward');
    if (dir === 'Switch')          return lbl.startsWith('switch ') && !lbl.startsWith('switch backside') && !lbl.startsWith('switch frontside');
    return false;
  });
}

function baseLabel(label) {
  let result = ' ' + label + ' ';
  // Remove "None" (standalone word, from flips field)
  result = result.replace(/\bNone\b/gi, '');
  [...SESS_GRABS].sort((a,b) => b.length - a.length).forEach(t => {
    const esc = t.trim().replace(/[-.*+?^${}()|[\]\\]/g,'\\$&');
    result = result.replace(new RegExp('[, ]+' + esc + '(?=[, ]|$)', 'gi'), '');
  });
  return result.trim().replace(/\s{2,}/g,' ').replace(/[,\s]+$/, '');
}

// Anzeige-Label in der Live-Session: ohne Grabs (leben in grab_status), Direction vorne.
// Die führende Direction wird vor dem Grab-Strippen abgetrennt, weil «Frontside»
// zugleich Grab-Name ist; Rail-Labels bleiben unangetastet (keine Grabs, Wort-Kollisionen).
function sbLiveLabel(label, disziplin) {
  const core = sbLiveLabelCore(label, disziplin);
  // Side-Hit-Tricks im Log/Dropdown mit «SH »-Präfix kennzeichnen
  return disziplin === 'Side Hit' && !core.startsWith('SH ') ? 'SH ' + core : core;
}

function sbLiveLabelCore(label, disziplin) {
  const norm = normSbTrick((label||'').replace(/\bNone\b/gi,'').replace(/\s{2,}/g,' ').trim());
  if (disziplin === 'Rail') return norm;
  for (const d of ['Switch Backside','Switch Frontside','Frontside','Backside','Cab']) {
    if (norm.startsWith(d + ' ')) return d + ' ' + baseLabel(norm.slice(d.length + 1));
  }
  // Direction kann auch nach dem Absprung stehen («Hardway Frontside 720») —
  // die früheste Fundstelle schützen, sonst strippt baseLabel «Frontside» als Grab.
  let dirIdx = -1, dirFound = null;
  for (const d of ['Switch Backside','Switch Frontside','Frontside','Backside','Cab']) {
    const idx = norm.indexOf(' ' + d + ' ');
    if (idx >= 0 && (dirIdx < 0 || idx < dirIdx)) { dirIdx = idx; dirFound = d; }
  }
  if (dirFound) {
    const cut = dirIdx + 1 + dirFound.length;
    return norm.slice(0, cut) + ' ' + baseLabel(norm.slice(cut + 1));
  }
  return baseLabel(norm);
}

function parseGrabsFromLabel(label) {
  const found = SESS_GRABS.filter(g => {
    const re = new RegExp('(^|[,\\s])' + g.replace(/[-.*+?^${}()|[\]\\]/g,'\\$&') + '($|[,\\s])', 'i');
    return re.test(label);
  });
  return found.length ? found : SESS_GRABS;
}

const doubleGrabFirst = {};

function sessGrabsForTrick(name, trickLabel) {
  // Prefer the entry's grab-status matrix; fall back to grabs parsed from the label (legacy)
  const gsKeys = new Set();
  (((sessAthleteData[name] || {}).tricks) || []).forEach(t => {
    if (t.trick_label === trickLabel) Object.keys(effGrabStatus(t)).forEach(g => gsKeys.add(g));
  });
  if (gsKeys.size) return [...gsKeys].sort();
  return parseGrabsFromLabel(trickLabel);
}

function showGrabPicker(name, trickLabel, status, btn) {
  const safeId = name.replace(/\s/g,'_');
  document.querySelectorAll('.grab-picker-' + safeId).forEach(el => el.remove());
  document.querySelectorAll('.trick-wrap-' + safeId).forEach(el => el.style.display = 'inline-block');
  delete doubleGrabFirst[name];

  const base = baseLabel(trickLabel);
  const alreadySelected = (sessActiveTricks[name] || [])
    .filter(t => t.startsWith(base + ' — ')).map(t => t.slice(base.length + 3));

  const grabs = sessGrabsForTrick(name, trickLabel);
  const pickerId = 'gp-' + safeId;
  const picker = document.createElement('div');
  picker.className = 'grab-picker-' + safeId;
  picker.id = pickerId;
  picker.style.cssText = 'margin-top:8px;padding:10px 14px;background:var(--surface);border:1px solid #39c3d4;border-radius:10px;width:100%;';
  picker.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
      <span style="font-size:10px;color:#39c3d4;font-weight:700;text-transform:uppercase;letter-spacing:.8px;">Select grab(s)</span>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:var(--muted);">
        <input type="checkbox" id="dg-toggle-${safeId}" onchange="toggleDoubleGrab('${name}','${trickLabel.replace(/'/g,"\\'")}','${pickerId}')" style="accent-color:#f59e0b;width:15px;height:15px;">
        Double Grab
      </label>
    </div>
    <div id="dg-hint-${safeId}" style="display:none;font-size:11px;color:#f59e0b;margin-bottom:8px;">Select first grab →</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;" id="dg-grabs-${safeId}">
      ${grabs.map(g => {
        const sel = alreadySelected.includes(g);
        const s = sel ? 'background:rgba(57,195,212,0.18);border-color:#39c3d4;color:#39c3d4;' : 'background:var(--surface2);border-color:var(--border);color:var(--text);';
        return `<button onclick="addTrickWithGrab('${name}','${trickLabel.replace(/'/g,"\\'")}','${g}',this)"
          style="padding:6px 14px;${s}border-width:1.5px;border-style:solid;border-radius:7px;font-family:'Poppins',sans-serif;font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;">${g}</button>`;
      }).join('')}
    </div>`;

  const wrapper = btn.parentElement;
  wrapper.style.display = 'block';
  wrapper.appendChild(picker);
}

function toggleDoubleGrab(name, trickLabel, pickerId) {
  const safeId = name.replace(/\s/g,'_');
  const isDouble = document.getElementById('dg-toggle-' + safeId).checked;
  const hint = document.getElementById('dg-hint-' + safeId);
  const grabsDiv = document.getElementById('dg-grabs-' + safeId);
  delete doubleGrabFirst[name];
  hint.style.display = isDouble ? 'block' : 'none';
  const grabs = sessGrabsForTrick(name, trickLabel);
  if (isDouble) {
    grabsDiv.querySelectorAll('button').forEach((btn, i) => {
      const g = grabs[i];
      btn.onclick = () => doubleGrabClick(name, trickLabel, g, btn, safeId);
      btn.style.background = 'var(--surface2)'; btn.style.borderColor = 'var(--border)'; btn.style.color = 'var(--text)';
    });
  } else {
    grabsDiv.querySelectorAll('button').forEach((btn, i) => {
      const g = grabs[i];
      btn.onclick = () => addTrickWithGrab(name, trickLabel, g, btn);
    });
  }
}

function doubleGrabClick(name, trickLabel, grab, btn, safeId) {
  if (!doubleGrabFirst[name]) {
    doubleGrabFirst[name] = grab;
    btn.style.background = 'rgba(245,158,11,0.2)'; btn.style.borderColor = '#f59e0b'; btn.style.color = '#f59e0b';
    const hint = document.getElementById('dg-hint-' + safeId);
    if (hint) hint.textContent = grab + ' to → select second grab';
  } else {
    const combined = doubleGrabFirst[name] + ' to ' + grab;
    delete doubleGrabFirst[name];
    if (!sessActiveTricks[name]) sessActiveTricks[name] = [];
    const label = baseLabel(trickLabel) + ' — ' + combined;
    if (!sessActiveTricks[name].includes(label)) sessActiveTricks[name].push(label);
    renderSessSelected(name);
    const grabsDiv = document.getElementById('dg-grabs-' + safeId);
    if (grabsDiv) grabsDiv.querySelectorAll('button').forEach(b => {
      b.style.background = 'var(--surface2)'; b.style.borderColor = 'var(--border)'; b.style.color = 'var(--text)';
    });
    const hint = document.getElementById('dg-hint-' + safeId);
    if (hint) hint.textContent = 'Select first grab →';
    showToast('Added: ' + combined, 'success');
  }
}

function addTrickWithGrab(name, trickLabel, grab, btn) {
  if (!sessActiveTricks[name]) sessActiveTricks[name] = [];
  const label = baseLabel(trickLabel) + ' — ' + grab;
  const idx = sessActiveTricks[name].indexOf(label);
  if (idx === -1) {
    sessActiveTricks[name].push(label);
    btn.style.background = 'rgba(57,195,212,0.18)';
    btn.style.borderColor = '#39c3d4';
    btn.style.color = '#39c3d4';
  } else {
    sessActiveTricks[name].splice(idx, 1);
    btn.style.background = 'var(--surface2)';
    btn.style.borderColor = 'var(--border)';
    btn.style.color = 'var(--text)';
  }
  renderSessSelected(name);
}

function renderSessionTrickSelection() {
  const container = document.getElementById('sess-trick-selection');
  const startBtn = document.getElementById('sess-start-btn');
  if (sessSelectedAthletes.length === 0) { container.style.display='none'; startBtn.style.display='none'; return; }
  container.style.display = 'block';
  container.innerHTML = '<div class="card"><div class="card-title">Step 3 — Select tricks to work on</div>'
    + sessSelectedAthletes.map(name => {
      if (!sessAthleteData[name]) return ''; // race condition guard
      const safeId = name.replace(/\s/g,'_');
      const allTricks = sessAthleteData[name].tricks || [];
      return `<div style="margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid var(--border);">
        <div style="font-weight:700;font-size:14px;color:#39c3d4;margin-bottom:14px;">${shortName(name)}</div>
        ${SESS_DIRECTIONS.map(dir => {
          const rotSort = (a,b) => extractRotFromLabel(b.trick_label) - extractRotFromLabel(a.trick_label);
          const mastered = tricksForDir(allTricks.filter(t=>t.status==='mastered'), dir).sort(rotSort);
          const goals    = tricksForDir(allTricks.filter(t=>t.status==='goal'), dir).sort(rotSort);
          return `<div style="margin-bottom:14px;">
            <div class="sess-dir-section-${safeId}" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--accent2);margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid var(--border);">${dir}</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${mastered.map(t => `<div class="trick-wrap-${safeId}" style="display:inline-block;">
                <button
                  class="trick-selecting-${safeId}"
                  data-trick="${t.trick_label.replace(/"/g,'&quot;')}"
                  onclick="showGrabPicker('${name}','${t.trick_label.replace(/'/g,"\\'")}','mastered',this)"
                  style="padding:6px 12px;background:var(--surface2);border:1.5px solid var(--border);border-radius:7px;color:var(--text);font-family:'Poppins',sans-serif;font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;">${normSbTrick(baseLabel(t.trick_label))}</button>
              </div>`).join('')}
              ${goals.map(t => `<div class="trick-wrap-${safeId}" style="display:inline-block;">
                <button
                  class="trick-selecting-${safeId}"
                  data-trick="${t.trick_label.replace(/"/g,'&quot;')}"
                  onclick="showGrabPicker('${name}','${t.trick_label.replace(/'/g,"\\'")}','goal',this)"
                  style="padding:6px 12px;background:var(--surface2);border:1.5px solid var(--border);border-radius:7px;color:var(--text);font-family:'Poppins',sans-serif;font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;">${normSbTrick(baseLabel(t.trick_label))}</button>
              </div>`).join('')}
              ${mastered.length === 0 && goals.length === 0 ? `<span style="color:var(--muted);font-size:11px;font-style:italic;">No assessment entry</span>` : ''}
            </div>
          </div>`;
        }).join('')}
        <div style="margin-top:10px;">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">Selected tricks</div>
          <div id="sess-selected-${safeId}" style="display:flex;flex-wrap:wrap;gap:6px;min-height:28px;">
            <span style="color:var(--muted);font-size:12px;">None yet</span>
          </div>
        </div>
      </div>`;
    }).join('') + '</div>';
  startBtn.style.display = 'block';
}

function toggleSessGrab(name, dir, grab, btn) {
  if (!sessActiveTricks[name]) sessActiveTricks[name] = [];
  const label = dir + ' — ' + grab;
  const idx = sessActiveTricks[name].indexOf(label);
  if (idx === -1) {
    sessActiveTricks[name].push(label);
    btn.style.background = 'rgba(57,195,212,0.18)';
    btn.style.borderColor = '#39c3d4';
    btn.style.color = '#39c3d4';
  } else {
    sessActiveTricks[name].splice(idx, 1);
    btn.style.background = 'var(--surface2)';
    btn.style.borderColor = 'var(--border)';
    btn.style.color = 'var(--muted)';
  }
  renderSessSelected(name);
}

function renderSessSelected(name) {
  const el = document.getElementById('sess-selected-' + name.replace(/\s/g,'_'));
  if (!el) return;
  const tricks = sessActiveTricks[name] || [];
  el.innerHTML = tricks.length
    ? tricks.map((t,i) => `<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 8px 4px 10px;background:rgba(57,195,212,0.15);border:1px solid #39c3d4;border-radius:6px;font-size:12px;color:#39c3d4;">
        ${t}
        <button onclick="removeSessTrick('${name}',${i})" style="background:none;border:none;color:#39c3d4;cursor:pointer;font-size:14px;line-height:1;padding:0;opacity:.7;" title="Remove">×</button>
      </span>`).join('')
    : '<span style="color:var(--muted);font-size:12px;">None yet</span>';
}

function toggleSessAssessmentTrick(name, trick, btn) {
  if (!sessActiveTricks[name]) sessActiveTricks[name] = [];
  const idx = sessActiveTricks[name].indexOf(trick);
  if (idx === -1) {
    sessActiveTricks[name].push(trick);
    btn.style.background = 'rgba(57,195,212,0.18)';
    btn.style.borderColor = '#39c3d4';
    btn.style.color = '#39c3d4';
  } else {
    sessActiveTricks[name].splice(idx, 1);
    btn.style.background = 'var(--surface2)';
    btn.style.borderColor = 'var(--border)';
    btn.style.color = 'var(--muted)';
  }
  renderSessSelected(name);
}

function removeSessTrick(name, idx) {
  sessActiveTricks[name].splice(idx, 1);
  renderSessSelected(name);
}

function toggleSessTrick(name, trick, checked) {
  if (checked) { if (!sessActiveTricks[name].includes(trick)) sessActiveTricks[name].push(trick); }
  else { sessActiveTricks[name] = sessActiveTricks[name].filter(t => t !== trick); }
}

let sessActiveSbAthlete = '';

function selectSessAthlete(name) {
  sessActiveSbAthlete = name;
  renderLiveSession();
  renderSessionLog();
}

function sbSetTrick(name, val) {
  sessAthleteData[name].currentTrick = val;
  sessAthleteData[name].currentGrab = '';
  renderLiveSession();
}

function sbSelectGrab(name, grab) {
  // Double Grab: zweiter Tap auf einen anderen Grab kombiniert zu «A + B»,
  // Tap auf einen gewählten Grab entfernt ihn wieder.
  const d = sessAthleteData[name];
  const parts = (d.currentGrab || '').split(' to ').filter(Boolean);
  if (!grab) d.currentGrab = '';
  else if (parts.includes(grab)) d.currentGrab = parts.filter(g => g !== grab).join(' to ');
  else if (parts.length === 1) d.currentGrab = parts[0] + ' to ' + grab;
  else d.currentGrab = grab;
  renderLiveSession();
}

function renderLiveSession() {
  const cols = document.getElementById('sess-athlete-cols');
  if (!sessSelectedAthletes.length) { cols.innerHTML=''; return; }
  cols.style.gridTemplateColumns = '';

  if (!sessActiveSbAthlete || !sessSelectedAthletes.includes(sessActiveSbAthlete)) {
    sessActiveSbAthlete = sessSelectedAthletes[0];
  }

  // Tabs
  const tabsHtml = `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
    ${sessSelectedAthletes.map(name => {
      const last = sessLog.find(e => e.name === name);
      const dot = last ? (last.result==='miss'?'🔴':last.result==='perfect'?'⭐':'🟢') : '';
      const active = name === sessActiveSbAthlete;
      return `<button onclick="selectSessAthlete('${name}')" style="padding:10px 18px;border-radius:10px;font-family:'Poppins',sans-serif;font-size:14px;font-weight:700;cursor:pointer;background:${active?'rgba(57,195,212,0.2)':'var(--surface2)'};border:2px solid ${active?'#39c3d4':'var(--border)'};color:${active?'#39c3d4':'var(--muted)'};">${dot} ${shortName(name)}</button>`;
    }).join('')}
  </div>`;

  // Active athlete card
  const name = sessActiveSbAthlete;
  const d = sessAthleteData[name] || {tricks:[],currentTrick:'',stats:{attempts:0,landed:0,perfect:0}};
  const s = d.stats;
  const pct = s.attempts ? Math.round((s.landed+s.perfect)/s.attempts*100) : 0;
  const sid = name.replace(/\s/g,'_');

  const dirOrder = {'Frontside':0,'Backside':1,'Switch Frontside':2,'Switch Backside':3,'Cab':2};
  const getDirKey = lbl => {
    for (const d of ['Switch Backside','Switch Frontside','Frontside','Backside','Cab']) {
      if (lbl.startsWith(d)) return dirOrder[d];
      if (lbl.includes(' '+d+' ') || lbl.includes(' '+d)) return dirOrder[d];
    }
    return 4;
  };
  const seenLbl = new Set();
  const sortedTricks = [...(d.tricks||[])].map(t => ({
    ...t, _lbl: sbLiveLabel(t.trick_label, t.disziplin)
  })).filter(t => { if (seenLbl.has(t._lbl)) return false; seenLbl.add(t._lbl); return true; })
  .sort((a,b) => {
    const da = getDirKey(a._lbl), db = getDirKey(b._lbl);
    if (da !== db) return da - db;
    return extractRotFromLabel(a._lbl) - extractRotFromLabel(b._lbl);
  });
  let trickOptions = '';
  let lastDir = -1;
  const dirNames = ['Frontside','Backside','Switch Frontside','Switch Backside','Other'];
  sortedTricks.forEach(t => {
    const dir = getDirKey(t._lbl);
    if (dir !== lastDir) {
      if (lastDir >= 0) trickOptions += '</optgroup>';
      trickOptions += `<optgroup label="${dirNames[dir] || 'Other'}">`;
      lastDir = dir;
    }
    trickOptions += `<option value="${t._lbl}" ${t._lbl===d.currentTrick?'selected':''}>${t._lbl}${t.status==='goal'?' 🎯':''}</option>`;
  });
  if (lastDir >= 0) trickOptions += '</optgroup>';

  // Grab-Auswahl: Grabs aus dem Assessment (grab_status) des gewählten Tricks
  let grabHtml = '';
  if (d.currentTrick) {
    const grabStat = {};
    (d.tricks||[]).forEach(t => {
      if (sbLiveLabel(t.trick_label, t.disziplin) !== d.currentTrick) return;
      Object.entries(effGrabStatus(t)).forEach(([g, st]) => {
        if (grabStat[g] !== 'mastered') grabStat[g] = st;
      });
    });
    const grabs = Object.keys(grabStat).sort();
    if (grabs.length) {
      const selParts = (d.currentGrab || '').split(' to ').filter(Boolean);
      grabHtml = `<div style="margin-bottom:16px;">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;text-align:center;">Grab <span style="text-transform:none;letter-spacing:0;">(tap a 2nd grab for a double grab)</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;justify-content:center;" id="sess-grabs-${sid}">
          <button onclick="sbSelectGrab('${name}','')"
            style="padding:5px 10px;border-radius:6px;font-size:11px;cursor:pointer;border:1.5px solid ${!d.currentGrab?'#39c3d4':'var(--border)'};background:${!d.currentGrab?'rgba(57,195,212,0.18)':'var(--surface2)'};color:${!d.currentGrab?'#39c3d4':'var(--muted)'};font-family:'Poppins',sans-serif;">No Grab</button>
          ${grabs.map(g => {
            const active = selParts.includes(g);
            return `<button onclick="sbSelectGrab('${name}','${g.replace(/'/g,"\\'")}')"
              style="padding:5px 10px;border-radius:6px;font-size:11px;cursor:pointer;border:1.5px solid ${active?'#39c3d4':'var(--border)'};background:${active?'rgba(57,195,212,0.18)':'var(--surface2)'};color:${active?'#39c3d4':'var(--muted)'};font-family:'Poppins',sans-serif;">${g}${grabStat[g]==='goal'?' 🎯':''}</button>`;
          }).join('')}
        </div>
      </div>`;
    }
  }

  const cardHtml = `<div class="card" style="padding:24px;" id="sess-col-${sid}">
    <div style="font-size:28px;font-weight:800;color:#39c3d4;margin-bottom:16px;text-align:center;">${shortName(name)}</div>
    <div style="margin-bottom:20px;">
      <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;text-align:center;">Working on</div>
      <select onchange="sbSetTrick('${name}',this.value)"
        style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:13px;font-family:'Poppins',sans-serif;">
        <option value="">— select trick —</option>
        ${trickOptions}
      </select>
    </div>
    ${grabHtml}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px;text-align:center;">
      <div style="background:var(--surface2);border-radius:8px;padding:12px 4px;">
        <div style="font-size:28px;font-weight:800;color:var(--text);">${s.attempts}</div>
        <div style="font-size:10px;color:var(--muted);">Attempts</div>
      </div>
      <div style="background:var(--surface2);border-radius:8px;padding:12px 4px;">
        <div style="font-size:28px;font-weight:800;color:#34d399;">${s.landed+s.perfect}</div>
        <div style="font-size:10px;color:var(--muted);">Landed</div>
      </div>
      <div style="background:var(--surface2);border-radius:8px;padding:12px 4px;">
        <div style="font-size:28px;font-weight:800;color:#39c3d4;">${pct}%</div>
        <div style="font-size:10px;color:var(--muted);">Rate</div>
      </div>
    </div>
    ${d.currentTrick ? `<div style="display:flex;justify-content:flex-end;margin-bottom:8px;"><span style="background:var(--surface2);border:1px solid var(--border);border-radius:999px;padding:4px 12px;font-size:11px;font-weight:700;color:var(--muted);">Attempt #${sbAttemptNo(name)}</span></div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <button onclick="logAttemptStart('${name}','failed')" id="sess-btn-failed-${sid}" style="padding:28px 4px;background:${sessPending&&sessPending.name===name&&sessPending.mode==='failed'?'rgba(226,0,26,0.25)':'rgba(226,0,26,0.1)'};border:2px solid #e2001a;color:#e2001a;border-radius:12px;font-family:'Poppins',sans-serif;font-size:13px;font-weight:700;cursor:pointer;line-height:1.6;-webkit-tap-highlight-color:transparent;">✗<br>FAILED</button>
      <button onclick="logAttemptStart('${name}','landed')" id="sess-btn-landed-${sid}" style="padding:28px 4px;background:${sessPending&&sessPending.name===name&&sessPending.mode==='landed'?'rgba(52,211,153,0.25)':'rgba(52,211,153,0.1)'};border:2px solid #34d399;color:#34d399;border-radius:12px;font-family:'Poppins',sans-serif;font-size:13px;font-weight:700;cursor:pointer;line-height:1.6;-webkit-tap-highlight-color:transparent;">✓<br>LANDED</button>
    </div>
    <div id="sess-disclose-${sid}"></div>
    <input type="text" id="sess-comment-${sid}" placeholder="Comment before rating (optional)" style="width:100%;margin-top:10px;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:12px;font-family:'Poppins',sans-serif;">
  </div>`;

  if (sessType && (sessType.startsWith('Slopestyle') || sessType.startsWith('Halfpipe'))) {
    cols.innerHTML = tabsHtml + sbRunCardHtml(name, d, trickOptions);
    return;
  }
  cols.innerHTML = tabsHtml + cardHtml;
  if (sessPending && sessPending.name === name) renderSbDisclosure();
}

// ═══════ SLOPESTYLE RUN-BUILDER — PROTOTYP (speichert noch nicht) ═══════
// Konzept: Ein Run = 1–8 Elemente (Jumps aus dem bestehenden Trick-Picker,
// Rails frei komponiert: Rail-Art-Vorauswahl + Trick-Text mit Vorschlägen —
// OHNE Pflicht, den Trick vorher im Assessment zu erfassen).

// Rail-Arten: EINE Quelle — die Optionen des Assessment-Selects (#sb-railart) + neue Custom-Arten

// Schreibweise stabil halten: passt der getippte Trick (case-/spacing-insensitiv) auf einen
// bekannten, wird automatisch dessen kanonische Schreibweise übernommen

async function sbLoadRailData() {
  try {
    let all = [], from = 0;
    while (true) {
      const {data, error} = await db.from('tricks').select('trickaufbau').like('trickaufbau', 'Rail %').range(from, from + 999);
      if (error || !data) break;
      all = all.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
    const types = new Set(), tricks = new Set();
    all.forEach(r => {
      const m = (r.trickaufbau || '').match(/^Rail (.+?) — (.+)$/);
      if (m) { types.add(m[1]); tricks.add(m[2]); }
    });
    const known = new Set(sbAllRailTypes());
    SB_CUSTOM_RAIL_TYPES = SB_CUSTOM_RAIL_TYPES.concat([...types].filter(t => !known.has(t)));
    SB_RAIL_TRICKS = [...tricks].sort();
  } catch (e) { /* Basis-Listen reichen */ }
}


function sbRunTagToggle(name, i, tag) {
  const el = sbRunState(name).elements[i];
  el.tags = el.tags || [];
  const idx = el.tags.indexOf(tag);
  if (idx >= 0) el.tags.splice(idx, 1); else el.tags.push(tag);
  renderLiveSession();
}
function sbRunSave(name) {
  const r = sbRunState(name);
  if (!r.elements.length || r.ratings.some(x => !x)) { showToast('Rate every element first', 'error'); return; }
  const runNo = r.no, N = r.elements.length;
  const d = sessAthleteData[name];
  r.elements.forEach((el, i) => {
    const rate = r.ratings[i];
    const gesamt = rate === 'failed' ? 3 : rate === 'landed' ? 7 : 10;
    const outcome = rate === 'stomped' ? 'stomped' : rate;
    const sterne = rate === 'failed' ? 0 : rate === 'landed' ? 3 : 5;
    const tags = el.tags || [];
    const extra = [];
    if (tags.length > 1) extra.push('Tags: ' + tags.slice(1).join(', '));
    if (el.note) extra.push(el.note);
    const logEntry = {name, trick: el.label, result: rate === 'failed' ? 'miss' : rate === 'stomped' ? 'perfect' : 'landed',
      kpis: null, failGrund: tags[0] || null, sterne,
      comment: extra.join(' | '),
      time: new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', second:'2-digit'}),
      run: runNo, runPos: i + 1, runLen: N};
    sessLog.unshift(logEntry);
    d.stats.attempts++;
    if (rate !== 'failed') d.stats.landed++;
    if (rate === 'stomped') d.stats.perfect++;
    const baseIns = {athlet: name, datum: sessCurrentDate(), typ: sessType || 'Training',
      disziplin: el.kind === 'rail' ? 'Rail' : 'Jump', trickaufbau: el.label,
      gelandet: rate === 'failed' ? 'No' : 'Yes', gesamt, ausfuehrung: gesamt, landung: gesamt, setup: gesamt,
      kommentar: [`Run ${runNo} · ${i+1}/${N}`].concat(extra).join(' | ')};
    const fullIns = {...baseIns, outcome, sterne, fail_grund: tags[0] || null, kpis: null};
    db.from('tricks').insert(fullIns).select('id').then(async res => {
      let {data, error} = res;
      if (error && /column|outcome|sterne|fail_grund|kpis|schema/i.test(error.message || '')) {
        ({data, error} = await db.from('tricks').insert(baseIns).select('id'));
      }
      if (error) { console.error(error); showToast('Error saving element: ' + error.message, 'error'); return; }
      if (data && data[0]) { logEntry.dbId = data[0].id; saveSessionState(); }
    });
  });
  sbRunEnsureAssessment(name, r.elements.filter(e => e.kind === 'rail'));
  sessPlayLogSound('landed');
  sbMonRows = null;
  r.no++;
  r.ratings = r.ratings.map(() => null);
  r.elements.forEach(el => { el.tags = []; el.note = ''; });
  r.noteOpen = null;
  renderLiveSession();
  renderSessionLog();
  saveSessionState();
  showToast(`Run ${runNo} saved (${N} elements)`, 'success');
}

// Neue Rail-Tricks automatisch als Goal ins Assessment der Athlet:in
async function sbRunEnsureAssessment(name, railEls) {
  if (!railEls.length) return;
  try {
    const {data} = await db.from('standort').select('trick_label').eq('athlet', name);
    const have = new Set((data || []).map(x => (x.trick_label || '').toLowerCase()));
    const missing = [...new Map(railEls.map(e => [e.label.toLowerCase(), e])).values()]
      .filter(e => !have.has(e.label.toLowerCase()));
    for (const e of missing) {
      await db.from('standort').insert({athlet: name, trick_label: e.label, disziplin: 'Rail',
        railart: e.railType || null, status: 'goal', datum: new Date().toISOString().slice(0, 10)});
    }
    if (missing.length) showToast(`${missing.length} new rail trick(s) added to Assessment as Goal`, 'success');
  } catch (e) { console.error(e); }
}

function sessSetTrick(name, trick) { sessAthleteData[name].currentTrick = trick; }

// ── New capture flow: Failed/Landed + progressive disclosure (KPIs / fail reasons) ──
const SB_KPIS = [['grab','Grab'],['amplitude','Amplitude'],['control','Control'],['quality_landing','Quality Landing'],['axis','Take-Off']];
const SB_FAIL_REASONS = ['Timing rotation','Position Take-off','Spin power','Air Position','Timing Grab','Spotting'];
// Custom-Fail-Tags: team-weit — werden aus den bereits erfassten fail_grund-Werten geladen
// und sofort ergänzt, wenn ein Coach via «Other…» einen neuen Grund eintippt.
let SB_CUSTOM_FAILS = [];
function sbAllFailReasons() { return SB_FAIL_REASONS.concat(SB_CUSTOM_FAILS); }
async function sbLoadCustomFails() {
  try {
    let all = [], from = 0;
    while (true) {
      const {data, error} = await db.from('tricks').select('fail_grund').not('fail_grund', 'is', null).range(from, from + 999);
      if (error || !data) break;
      all = all.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
    const seen = new Set(SB_FAIL_REASONS);
    SB_CUSTOM_FAILS = [...new Set(all.map(r => sbFailLabel(r.fail_grund)).filter(v => v && !seen.has(v) && !SB_RETIRED_FAILS.has(v)))].sort();
  } catch (e) { /* offline o.ä. — Basis-Tags reichen */ }
}
function sbCustomFailPrompt(name) {
  const v = (window.prompt('New fail reason:') || '').trim();
  if (!v) return;
  if (!sbAllFailReasons().includes(v)) SB_CUSTOM_FAILS.push(v);
  if (!sessPendingFails.includes(v)) sessPendingFails.push(v);
  renderSbDisclosure();
}
// Alte fail_grund-Werte: gleichbedeutende auf die neuen Labels mappen (Anzeige + Zählung),
// ausgemusterte Alt-Tags bleiben in den Daten sichtbar, werden aber nicht mehr als Chips angeboten.
const SB_FAIL_RENAMES = {'Takeoff':'Take-Off','Air position':'Air Position','Grab timing':'Timing Grab'};
const SB_RETIRED_FAILS = new Set(['Rotation too early','Rotation too late','Take-Off','Center of gravity','Orientation']);
const sbFailLabel = v => SB_FAIL_RENAMES[v] || (v || '');
let sessPending = null;        // {name, mode:'failed'|'landed'}
let sessPendingKpis = {};      // key -> bool while landed panel open
let sessEditKpis = {};         // key -> bool while editing a log entry
let sessEditFail = '';         // selected fail reason while editing
let sessPendingFails = [];     // gewählte Fail-Gründe, solange das Failed-Panel offen ist

function sbAttemptNo(name) {
  const d = sessAthleteData[name];
  if (!d || !d.currentTrick) return 1;
  return sessLog.filter(e => e.name === name && splitTrickGrab(e.trick||'').base === d.currentTrick).length + 1;
}

function logAttemptStart(name, mode) {
  const d = sessAthleteData[name];
  if (!d || !d.currentTrick) { showToast('Please select a trick first', 'error'); return; }
  if (sessPending && sessPending.name === name && sessPending.mode === mode) {
    sessPending = null; sessPendingKpis = {}; sessPendingFails = [];
  } else {
    sessPending = {name, mode};
    sessPendingKpis = {}; sessPendingFails = [];
  }
  renderLiveSession();
}

function renderSbDisclosure() {
  if (!sessPending) return;
  const {name, mode} = sessPending;
  const el = document.getElementById('sess-disclose-' + name.replace(/\s/g,'_'));
  if (!el) return;
  if (mode === 'landed') {
    const count = SB_KPIS.filter(([k]) => sessPendingKpis[k]).length;
    el.innerHTML = `<div style="margin-top:10px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:600;">KPI's met</span>
        <span style="font-size:13px;font-weight:800;color:#39c3d4;">${count}/5</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;text-align:center;">
        ${SB_KPIS.map(([k,label]) => {
          const on = !!sessPendingKpis[k];
          return `<button onclick="toggleSbKpi('${k}')" style="background:none;border:none;cursor:pointer;padding:4px 0;-webkit-tap-highlight-color:transparent;">
            <div style="font-size:26px;line-height:1;filter:${on?'none':'grayscale(1) opacity(.35)'};">⭐</div>
            <div style="font-size:9px;margin-top:4px;color:${on?'#39c3d4':'var(--muted)'};font-weight:${on?'700':'500'};line-height:1.2;">${label}</div>
          </button>`;
        }).join('')}
      </div>
      <div style="font-size:10px;color:var(--muted);text-align:center;margin:8px 0 10px;">5/5 = automatically Stomped</div>
      <button onclick="commitLandedAttempt('${name}')" style="width:100%;padding:12px;border-radius:10px;border:none;background:${count===5?'#39c3d4':'#34d399'};color:#060f1a;font-family:'Poppins',sans-serif;font-size:14px;font-weight:700;cursor:pointer;">${count===5?'⭐ Save as Stomped':'✓ Save Landed ('+count+'/5)'}</button>
    </div>`;
  } else {
    const nSel = sessPendingFails.length;
    el.innerHTML = `<div style="margin-top:10px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;">
      <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:10px;">Select reason(s)</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${sbAllFailReasons().map(r => { const on = sessPendingFails.includes(r); return `<button onclick="toggleSbFail('${r.replace(/'/g,"\\'")}')" style="padding:9px 12px;border-radius:8px;border:1.5px solid ${on?'#e2001a':'var(--border)'};background:${on?'rgba(226,0,26,0.12)':'var(--surface)'};color:${on?'#e2001a':'var(--text)'};font-family:'Poppins',sans-serif;font-size:12px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent;">${r}</button>`; }).join('')}
        <button onclick="sbCustomFailPrompt('${name}')" style="padding:9px 12px;border-radius:8px;border:1.5px dashed #39c3d4;background:none;color:#39c3d4;font-family:'Poppins',sans-serif;font-size:12px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent;">＋ Other…</button>
      </div>
      <button onclick="commitFailedMulti('${name}')" style="width:100%;margin-top:12px;padding:12px;border-radius:10px;border:none;background:#e2001a;color:#fff;font-family:'Poppins',sans-serif;font-size:14px;font-weight:700;cursor:pointer;">✗ Save Failed${nSel ? ' (' + nSel + ' reason' + (nSel > 1 ? 's' : '') + ')' : ' (no reason)'}</button>
    </div>`;
  }
}

function toggleSbKpi(key) {
  sessPendingKpis[key] = !sessPendingKpis[key];
  renderSbDisclosure();
}

function toggleSbFail(r) {
  const i = sessPendingFails.indexOf(r);
  if (i >= 0) sessPendingFails.splice(i, 1); else sessPendingFails.push(r);
  renderSbDisclosure();
}

function commitFailedMulti(name) {
  const fails = [...sessPendingFails];
  sessPending = null; sessPendingKpis = {}; sessPendingFails = [];
  logAttempt(name, 'miss', {failGrund: fails[0] || null, extraFails: fails.slice(1), sterne: 0});
}

function commitLandedAttempt(name) {
  const kpis = {};
  SB_KPIS.forEach(([k]) => kpis[k] = !!sessPendingKpis[k]);
  const sterne = SB_KPIS.filter(([k]) => kpis[k]).length;
  const result = sterne === 5 ? 'perfect' : 'landed';
  sessPending = null; sessPendingKpis = {}; sessPendingFails = [];
  logAttempt(name, result, {kpis, sterne});
}

function commitFailedAttempt(name, reason) {
  sessPending = null; sessPendingKpis = {}; sessPendingFails = [];
  logAttempt(name, 'miss', {failGrund: reason || null, sterne: 0});
}

async function logAttempt(name, result, detail) {
  const d = sessAthleteData[name];
  if (!d.currentTrick) { showToast('Please select a trick first', 'error'); return; }
  detail = detail || {};
  d.stats.attempts++;
  if (result==='landed') d.stats.landed++;
  if (result==='perfect') d.stats.perfect++;

  // Flash feedback
  const col = document.getElementById('sess-col-'+name.replace(/\s/g,'_'));
  const flashColor = result==='miss'?'rgba(226,0,26,0.2)':result==='landed'?'rgba(52,211,153,0.2)':'rgba(57,195,212,0.2)';
  col.style.background = flashColor;
  setTimeout(()=>{ col.style.background=''; }, 250);
  sessPlayLogSound(result);

  const sid = name.replace(/\s/g,'_');
  const commentEl = document.getElementById('sess-comment-'+sid);
  let comment = commentEl ? commentEl.value.trim() : '';
  if (commentEl) commentEl.value = '';
  if (detail.extraFails && detail.extraFails.length) comment = ['Tags: ' + detail.extraFails.join(', '), comment].filter(Boolean).join(' | ');

  const selectedGrab = d.currentGrab || '';
  const trickWithGrab = selectedGrab ? d.currentTrick + ' — ' + selectedGrab : d.currentTrick;
  const outcome = result==='miss' ? 'failed' : result==='perfect' ? 'stomped' : 'landed';
  const logEntry = {name, trick:trickWithGrab, result, comment, selectedGrab,
    kpis: detail.kpis || null, failGrund: detail.failGrund || null,
    sterne: typeof detail.sterne === 'number' ? detail.sterne : null,
    time: new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'})};
  sessLog.unshift(logEntry);
  renderLiveSession();
  renderSessionLog();
  saveSessionState();

  // Save to DB (non-blocking)
  const gesamt = result==='miss'?3:result==='landed'?7:10;
  const trickInfo = sessAthleteData[name].tricks.find(t=>sbLiveLabel(t.trick_label, t.disziplin)===d.currentTrick)||{};
  const baseRow = {
    athlet:name, datum:sessCurrentDate(),
    typ:sessType||'Training', disziplin:trickInfo.disziplin||null,
    trickaufbau:trickWithGrab, gelandet:result==='miss'?'No':'Yes',
    grab: selectedGrab || null,
    gesamt, ausfuehrung:gesamt, landung:gesamt, setup:gesamt,
    kommentar: comment || null,
  };
  const fullRow = {...baseRow, outcome,
    kpis: detail.kpis || null,
    fail_grund: detail.failGrund || null,
    sterne: typeof detail.sterne === 'number' ? detail.sterne : null};
  db.from('tricks').insert(fullRow).select().then(({data,error})=>{
    if (error && /column|kpis|outcome|fail_grund|sterne|schema/i.test(error.message||'')) {
      // Fallback: DB columns not yet added — save legacy fields so no attempt is lost
      console.warn('New columns missing, saving legacy row:', error.message);
      return db.from('tricks').insert(baseRow).select().then(({data,error})=>{
        if(error) console.error('Save error:',error);
        else if(data&&data[0]) { logEntry.dbId=data[0].id; logEntry.legacySaved=true; saveSessionState(); }
      });
    }
    if(error) console.error('Save error:',error);
    else if(data&&data[0]) { logEntry.dbId=data[0].id; saveSessionState(); }
  });
}

function deleteLogEntry(idx) {
  const e = sessLog[idx];
  if (!e) return;
  const d = sessAthleteData[e.name];
  if (d) {
    d.stats.attempts = Math.max(0, d.stats.attempts-1);
    if (e.result!=='miss') d.stats.landed = Math.max(0, d.stats.landed-1);
    if (e.result==='perfect') d.stats.perfect = Math.max(0, d.stats.perfect-1);
  }
  sessLog.splice(idx, 1);
  renderLiveSession();
  renderSessionLog();
  saveSessionState();
  if (e.dbId) db.from('tricks').delete().eq('id', e.dbId).then(()=>{});
}

function editLogEntry(idx) {
  sessEditIdx = sessEditIdx === idx ? -1 : idx;
  if (sessEditIdx >= 0) {
    const e = sessLog[idx];
    sessEditKpis = {...(e && e.kpis ? e.kpis : {})};
    sessEditFail = sbFailLabel(e && e.failGrund);
  }
  renderSessionLog();
}

function toggleSbEditKpi(key) {
  sessEditKpis[key] = !sessEditKpis[key];
  renderSessionLog();
}

function setSbEditFail(reason) {
  sessEditFail = reason;
  renderSessionLog();
}

async function saveSbLogEdit(idx, mode) {
  const e = sessLog[idx];
  if (!e) return;
  const trickEl  = document.getElementById('sess-edit-trick');
  const commentEl = document.getElementById('sess-edit-comment');
  const grabEl   = document.getElementById('sess-edit-grab');
  const oldTg    = splitTrickGrab(e.trick||'');
  const newBase  = trickEl ? (trickEl.value.trim() || oldTg.base) : oldTg.base;
  const newGrab  = grabEl ? grabEl.value : oldTg.grab;
  const newTrick = (newBase + (newGrab ? ' — ' + newGrab : '')) || e.trick;
  const newComment = commentEl ? commentEl.value.trim() : (e.comment||'');

  let newResult, newKpis = null, newFail = null, newSterne;
  if (mode === 'failed') {
    newResult = 'miss'; newFail = sessEditFail || null; newSterne = 0;
  } else {
    const kpis = {};
    SB_KPIS.forEach(([k]) => kpis[k] = !!sessEditKpis[k]);
    newSterne = SB_KPIS.filter(([k]) => kpis[k]).length;
    newResult = newSterne === 5 ? 'perfect' : 'landed';
    newKpis = kpis;
  }

  const oldResult = e.result;
  const d = sessAthleteData[e.name];
  if (oldResult !== newResult && d) {
    if (oldResult!=='miss') d.stats.landed--;
    if (oldResult==='perfect') d.stats.perfect--;
    if (newResult!=='miss') d.stats.landed++;
    if (newResult==='perfect') d.stats.perfect++;
  }
  const trickChanged = newTrick !== e.trick;
  if (trickChanged) e.trick = newTrick;
  e.result = newResult;
  e.comment = newComment;
  e.kpis = newKpis;
  e.failGrund = newFail;
  e.sterne = newSterne;
  if (e.dbId) {
    const gesamt = newResult==='miss'?3:newResult==='landed'?7:10;
    const outcome = newResult==='miss'?'failed':newResult==='perfect'?'stomped':'landed';
    const baseUpd = { gesamt, ausfuehrung:gesamt, landung:gesamt, setup:gesamt,
      gelandet:newResult==='miss'?'No':'Yes', kommentar: newComment||null };
    if (trickChanged) baseUpd.trickaufbau = newTrick;
    const fullUpd = {...baseUpd, outcome, kpis:newKpis, fail_grund:newFail, sterne:newSterne};
    const {error} = await db.from('tricks').update(fullUpd).eq('id', e.dbId);
    if (error && /column|kpis|outcome|fail_grund|sterne|schema/i.test(error.message||'')) {
      await db.from('tricks').update(baseUpd).eq('id', e.dbId);
    }
    if (trickChanged) syncTrickNameLocally(e.dbId, newTrick);
  }
  sessEditIdx = -1;
  renderLiveSession();
  renderSessionLog();
  saveSessionState();
  showToast('Updated', 'success');
}

function renderSessionLog() {
  const el = document.getElementById('sess-log');
  if (!el) return;
  if (!sessLog.length) { el.innerHTML=''; return; }
  const filtered = sessActiveSbAthlete
    ? sessLog.map((e,i)=>({...e,_i:i})).filter(e=>e.name===sessActiveSbAthlete)
    : sessLog.map((e,i)=>({...e,_i:i}));
  el.innerHTML = filtered.slice(0,30).map(e=>{ const i=e._i;
    const icon = e.result==='miss'?'✗':e.result==='landed'?'✓':'⭐';
    const c = e.result==='miss'?'#e2001a':e.result==='landed'?'#34d399':'#39c3d4';
    const isEditing = sessEditIdx === i;
    let editRow = '';
    if (isEditing) {
      const tg = splitTrickGrab(e.trick||'');
      const editStars = SB_KPIS.filter(([k]) => sessEditKpis[k]).length;
      editRow = `<div style="padding:8px 12px 4px 38px;">
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px;">
          <input type="text" id="sess-edit-trick" value="${tg.base.replace(/"/g,'&quot;')}" placeholder="Trick name" style="width:100%;padding:6px 10px;border-radius:6px;border:1px solid #39c3d4;background:var(--surface2);color:var(--text);font-size:12px;font-family:'Poppins',sans-serif;">
          ${grabSelectHtml('sess-edit-grab', [...new Set([...SB_HP_GRABS, ...SB_JUMP_GRABS])].sort(), tg.grab)}
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-bottom:6px;">
          ${SB_KPIS.map(([k,label]) => {
            const on = !!sessEditKpis[k];
            return `<button onclick="toggleSbEditKpi('${k}')" style="padding:5px 8px;border-radius:6px;border:1.5px solid ${on?'#39c3d4':'var(--border)'};background:${on?'rgba(57,195,212,0.18)':'var(--surface2)'};color:${on?'#39c3d4':'var(--muted)'};font-family:'Poppins',sans-serif;font-size:10px;font-weight:600;cursor:pointer;">⭐ ${label}</button>`;
          }).join('')}
          <button onclick="saveSbLogEdit(${i},'landed')" style="padding:6px 12px;border-radius:8px;border:2px solid ${editStars===5?'#39c3d4':'#34d399'};background:${editStars===5?'rgba(57,195,212,0.15)':'rgba(52,211,153,0.15)'};color:${editStars===5?'#39c3d4':'#34d399'};font-family:'Poppins',sans-serif;font-size:11px;font-weight:700;cursor:pointer;">${editStars===5?'⭐ Save Stomped':'✓ Save Landed '+editStars+'/5'}</button>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px;">
          <select id="sess-edit-fail" onchange="setSbEditFail(this.value)" style="padding:6px 8px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:11px;font-family:'Poppins',sans-serif;">
            <option value="">— no reason —</option>
            ${[...new Set(sbAllFailReasons().concat(sessEditFail ? [sessEditFail] : []))].map(r => `<option ${sessEditFail===r?'selected':''}>${r}</option>`).join('')}
          </select>
          <button onclick="saveSbLogEdit(${i},'failed')" style="padding:6px 12px;border-radius:8px;border:2px solid #e2001a;background:rgba(226,0,26,0.15);color:#e2001a;font-family:'Poppins',sans-serif;font-size:11px;font-weight:700;cursor:pointer;">✗ Save Failed</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="text" id="sess-edit-comment" value="${(e.comment||'').replace(/"/g,'&quot;')}" placeholder="Comment (optional)" style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:12px;font-family:'Poppins',sans-serif;">
          <button onclick="cancelFsEdit()" style="padding:6px 12px;border-radius:8px;background:none;border:1px solid var(--border);color:var(--muted);font-size:11px;cursor:pointer;font-family:'Poppins',sans-serif;">Cancel</button>
        </div>
      </div>`;
    }
    return `<div style="border-radius:8px;${isEditing?'background:rgba(57,195,212,0.08);border:1px solid #39c3d433;':''}">
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;${isEditing?'':'background:var(--surface2);border-radius:8px;'}font-size:12px;">
        <span style="color:${c};font-weight:800;font-size:15px;min-width:16px;">${icon}</span>
        <span style="color:#39c3d4;font-weight:600;min-width:60px;">${shortName(e.name)}</span>
        <span style="flex:1;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${normSbTrick(e.trick||'—')}${e.comment?` <span style="color:var(--muted);font-size:10px;">— ${e.comment}</span>`:''}</span>
        ${e.result!=='miss' && typeof e.sterne==='number' ? `<span style="color:${e.sterne===5?'#39c3d4':'#34d399'};font-size:10px;font-weight:700;white-space:nowrap;">${e.sterne}/5★</span>` : ''}
        ${e.result==='miss' && e.failGrund ? `<span style="color:#e2001a;font-size:10px;white-space:nowrap;background:rgba(226,0,26,0.08);border-radius:4px;padding:2px 6px;">${sbFailLabel(e.failGrund)}</span>` : ''}
        <span style="color:var(--muted);font-size:11px;">${e.time}</span>
        <button onclick="editLogEntry(${i})" title="Edit" style="background:none;border:1px solid ${isEditing?'#39c3d4':'var(--border)'};border-radius:6px;color:${isEditing?'#39c3d4':'var(--muted)'};cursor:pointer;padding:2px 7px;font-size:11px;flex-shrink:0;">✏️</button>
        <button onclick="deleteLogEntry(${i})" style="background:none;border:1px solid #e2001a33;border-radius:6px;color:#e2001a;cursor:pointer;font-size:13px;padding:2px 6px;flex-shrink:0;">🗑</button>
      </div>
      ${editRow}
    </div>`;
  }).join('');
}

function clearSessionSelection() {
  sessSelectedAthletes=[]; sessAthleteData={}; sessActiveTricks={};
  document.querySelectorAll('#sess-athlete-grid input[type=checkbox]').forEach(c => c.checked=false);
  document.querySelectorAll('#sess-athlete-grid label').forEach(c => c.style.borderColor='var(--border)');
  document.getElementById('sess-trick-selection').style.display='none';
  document.getElementById('sess-start-btn').style.display='none';
}

function addAthleteToSession() {
  document.getElementById('sess-setup').style.display = 'block';
  document.getElementById('sess-live').style.display = 'none';
  document.getElementById('sess-date-label').textContent =
    new Date(sessStartTime).toLocaleDateString('en-GB', {weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const grid = document.getElementById('sess-athlete-grid');
  grid.innerHTML = SESS_SQUADS.map(sq => {
    const athletes = SESS_ALL_ATHLETES.filter(a => a.squad === sq.key);
    return `<div style="margin-bottom:14px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${sq.color};margin-bottom:8px;">${sq.label}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${athletes.map(a => {
          const checked = sessSelectedAthletes.includes(a.name);
          return `<label style="display:flex;align-items:center;gap:8px;padding:9px 14px;background:var(--surface2);border:2px solid ${checked?'#39c3d4':'var(--border)'};border-radius:10px;cursor:pointer;transition:border-color .15s;" id="sess-ath-card-${a.name.replace(/\s/g,'_')}">
            <input type="checkbox" value="${a.name}" onchange="toggleSessionAthlete('${a.name}')" ${checked?'checked':''} style="width:16px;height:16px;accent-color:${sq.color};cursor:pointer;flex-shrink:0;">
            <span style="font-weight:600;font-size:13px;color:var(--text);">${shortName(a.name)}</span>
          </label>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
  document.querySelectorAll('.sess-type-btn').forEach(b => {
    const active = b.textContent.trim() === sessType;
    b.classList.toggle('active', active);
  });
  document.getElementById('sess-start-btn').style.display = sessSelectedAthletes.length ? 'block' : 'none';
}

function resetSession() {
  sessSelectedAthletes=[]; sessAthleteData={}; sessActiveTricks={}; sessLog=[];
  clearSessionStorage();
  document.getElementById('sess-setup').style.display='block';
  document.getElementById('sess-live').style.display='none';
  initSessionSetup();
}

async function cancelSession() {
  const confirmed = confirm(
    'Are you sure you want to cancel this session?\n\n' +
    'All recorded attempts will be permanently deleted and cannot be recovered.'
  );
  if (!confirmed) return;
  // Delete already-saved DB entries
  const ids = sessLog.filter(e => e.dbId).map(e => e.dbId);
  if (ids.length > 0) {
    await db.from('tricks').delete().in('id', ids);
  }
  sessLog = [];
  resetSession();
  showToast('Session cancelled — all data deleted', 'error');
}


function buildFsTrickBlocks(entries) {
  // entries = [{trick, result}] in chronological order
  // Returns array of {trick, att, land, stomped} blocks
  // A new block starts whenever the trick changes and then comes back
  const blocks = [];
  entries.forEach(e => {
    const trick = e.trick || '—';
    const last = blocks[blocks.length - 1];
    if (last && last.trick === trick) {
      last.att++;
      if (e.result !== 'miss') last.land++;
      if (e.result === 'perfect') last.stomped++;
    } else {
      blocks.push({trick, att:1, land:e.result!=='miss'?1:0, stomped:e.result==='perfect'?1:0});
    }
  });
  return blocks;
}

async function saveSessionReport(duration, location, conditions, comments, athleteNotes, jumpSize, contestScores) {
  // Geister-Reports verhindern: ohne einen einzigen geloggten Versuch gibt es nichts zu rapportieren
  if (!sessLog.length) { showToast('No attempts logged — session ended without saving a report', 'error'); resetSession(); return; }
  const athleteEntries = {};
  // sessLog is newest-first (unshift), reverse to get chronological order
  sessLog.slice().reverse().forEach(e => {
    if (!athleteEntries[e.name]) athleteEntries[e.name] = [];
    athleteEntries[e.name].push({trick: e.trick||'—', result: e.result, dbId: e.dbId,
      kpis: e.kpis||null, fail: e.failGrund||null,
      sterne: typeof e.sterne==='number' ? e.sterne : null,
      time: e.time||null, comment: e.comment||''});
  });
  const trickData = Object.entries(athleteEntries).map(([name, entries]) => {
    const trickList = buildFsTrickBlocks(entries);
    const totalAtt  = trickList.reduce((a,t)=>a+t.att,0);
    const totalLand = trickList.reduce((a,t)=>a+t.land,0);
    const note = (athleteNotes||{})[shortName(name)] || '';
    const trickIds = entries.map(e=>e.dbId).filter(Boolean);
    const attempts = entries.map(e => ({trick: e.trick,
      outcome: e.result==='miss'?'failed':e.result==='perfect'?'stomped':'landed',
      sterne: e.sterne, kpis: e.kpis, fail: e.fail, time: e.time,
      dbId: e.dbId || null,
      comment: e.comment || undefined}));
    const cs = (contestScores || {})[shortName(name)] || {};
    return {athlet: shortName(name), totalAtt, totalLand, tricks: trickList, note, trickIds, attempts,
      quali_scores: cs.quali && cs.quali.length ? cs.quali : null,
      final_scores: cs.finals && cs.finals.length ? cs.finals : null,
      contest_rank: Number.isFinite(cs.rank) ? cs.rank : null};
  });

  const row = {
    datum: sessCurrentDate(),
    session_type: sessType,
    app: 'snowboard',
    athletes: sessSelectedAthletes,
    duration_min: duration,
    location,
    jump_size: jumpSize || null,
    conditions,
    comments,
    trick_data: trickData
  };
  let {error} = await db.from('session_reports').insert(row);
  if (error && /jump_size/.test(error.message||'')) {
    delete row.jump_size;
    ({error} = await db.from('session_reports').insert(row));
  }

  if (error) { showToast('Error saving report: ' + error.message, 'error'); }
  else {
    showToast('Session report saved', 'success');
    try { openSessionReportView(row); } catch(e) { console.error(e); }
    resetSession();
    setTimeout(async () => {
      const {data} = await db.from('session_reports').select('*').eq('app','snowboard').order('created_at',{ascending:false}).limit(1);
      if (data && data[0]) { window._lastReport = data[0]; }
    }, 500);
  }
}

async function loadLastSessionReport() {
  const {data} = await db.from('session_reports').select('*').eq('app','snowboard').order('created_at',{ascending:false}).limit(1);
  if (data && data[0]) openSessionReportView(data[0]);
}

function openReportPrint(report) {
  const d = report;
  const dateStr = d.datum ? (() => { const p=d.datum.split('-'); return p[2]+'.'+p[1]+'.'+p[0].slice(2); })() : '';
  const durH = d.duration_min ? (d.duration_min/60).toFixed(1).replace('.0','')+'h' : '—';
  const condLabel = d.conditions ? ['','Poor','Below Average','Average','Good','Excellent'][d.conditions]||d.conditions+'/5' : '—';
  const condDots = d.conditions ? (d.conditions+'/5') : '—';
  const typeShort = d.session_type||'—';
  const athleteStr = Array.isArray(d.athletes) ? d.athletes.map(a=>shortName(a)).join(', ') : (d.athletes||'');
  const trickData = Array.isArray(d.trick_data) ? d.trick_data : [];
  const filename = 'Session_Report_' + (d.datum||'').replace(/-/g,'') + '.pdf';

  showToast('Generating PDF…', 'success');

  function generate() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'mm', format:'a4', orientation:'portrait' });
    const W = 210, margin = 16, cw = W - margin*2;
    let y = margin;

    // Header bar
    doc.setFillColor(26,26,26);
    doc.rect(margin, y, cw, 10, 'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(11);
    doc.setTextColor(255,255,255);
    doc.text('SESSION REPORT', margin+4, y+6.8);
    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    doc.setTextColor(180,180,180);
    doc.text('Swiss-Ski Trick Analyses — Snowboard', W-margin-2, y+6.8, {align:'right'});
    y += 14;

    // Meta grid (2 columns)
    const meta = [
      ['Date', dateStr], ['Session Type', typeShort], ['Duration', durH],
      ['Location', (d.location||'—') + (d.jump_size ? ' · Jump ' + d.jump_size : '')], ['Conditions', condDots+' '+condLabel], ['Athletes', athleteStr]
    ];
    doc.setFontSize(7.5);
    const col = cw/3;
    meta.forEach(([label, val], i) => {
      const cx = margin + (i%3)*col;
      const cy = y + Math.floor(i/3)*11;
      doc.setFont('helvetica','normal');
      doc.setTextColor(130,130,130);
      doc.text(label.toUpperCase(), cx, cy);
      doc.setFont('helvetica','bold');
      doc.setTextColor(26,26,26);
      doc.text(String(val), cx, cy+4.5);
    });
    y += 26;

    // Divider
    doc.setDrawColor(220,220,220);
    doc.line(margin, y, W-margin, y);
    y += 5;

    // Comments
    if (d.comments) {
      doc.setFont('helvetica','bold');
      doc.setFontSize(7.5);
      doc.setTextColor(130,130,130);
      doc.text('COACH COMMENTS', margin, y);
      y += 4;
      doc.setFillColor(246,246,246);
      const lines = doc.splitTextToSize(d.comments, cw-8);
      const bh = lines.length*4.5+5;
      doc.rect(margin, y, cw, bh, 'F');
      doc.setFillColor(26,26,26);
      doc.rect(margin, y, 2, bh, 'F');
      doc.setFont('helvetica','normal');
      doc.setFontSize(9);
      doc.setTextColor(60,60,60);
      doc.text(lines, margin+5, y+4.5);
      y += bh+5;
    }

    // Per-athlete tables
    trickData.forEach(a => {
      const pct = a.totalAtt ? Math.round(a.totalLand/a.totalAtt*100) : 0;
      if (y > 250) { doc.addPage(); y = margin; }

      // Athlete name bar
      doc.setFillColor(26,26,26);
      doc.rect(margin, y, cw, 8, 'F');
      doc.setFont('helvetica','bold');
      doc.setFontSize(9);
      doc.setTextColor(255,255,255);
      doc.text((a.athlet||'').toUpperCase(), margin+3, y+5.5);
      doc.setFont('helvetica','normal');
      doc.setFontSize(8);
      doc.setTextColor(180,180,180);
      doc.text(`${a.totalAtt} att.  |  ${a.totalLand} landed+stomped  |  ${pct}%`, W-margin-3, y+5.5, {align:'right'});
      y += 9;

      // Trick table
      const rows = (a.tricks||[]).map(t => {
        const lp = t.att ? Math.round(t.land/t.att*100) : 0;
        return [normSbTrick(t.trick), t.att, t.land-(t.stomped||0), t.stomped||0, lp+'%'];
      });

      doc.autoTable({
        startY: y,
        margin: {left:margin, right:margin},
        head: [['Trick','Att.','Landed','Stomped','Rate']],
        body: rows,
        theme: 'grid',
        styles: {fontSize:8.5, cellPadding:2.5, textColor:[34,34,34], lineColor:[230,230,230]},
        headStyles: {fillColor:[240,240,240], textColor:[100,100,100], fontStyle:'bold', fontSize:7.5},
        columnStyles: {0:{cellWidth:cw*0.42}, 1:{cellWidth:cw*0.13,halign:'center'}, 2:{cellWidth:cw*0.15,halign:'center'}, 3:{cellWidth:cw*0.15,halign:'center'}, 4:{cellWidth:cw*0.15,halign:'center'}},
        didParseCell(data) {
          if (data.column.index===4 && data.section==='body') {
            const v = parseInt(data.cell.raw);
            data.cell.styles.textColor = v>=70?[45,138,78]:v>=50?[180,100,0]:[200,30,30];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });
      y = doc.lastAutoTable.finalY + 2;

      // Note
      if (a.note) {
        doc.setFillColor(255,251,235);
        const noteLines = doc.splitTextToSize('Note: '+a.note, cw-8);
        const nh = noteLines.length*4+5;
        doc.rect(margin, y, cw, nh, 'F');
        doc.setDrawColor(230,215,150);
        doc.rect(margin, y, cw, nh, 'S');
        doc.setFont('helvetica','normal');
        doc.setFontSize(8);
        doc.setTextColor(100,80,20);
        doc.text(noteLines, margin+3, y+4);
        y += nh+2;
      }
      y += 4;
    });

    // Footer
    const pg = doc.internal.getNumberOfPages();
    for (let i=1;i<=pg;i++) {
      doc.setPage(i);
      doc.setFont('helvetica','normal');
      doc.setFontSize(7.5);
      doc.setTextColor(170,170,170);
      doc.text('Generated '+new Date().toLocaleDateString('de-CH'), margin, 295);
      doc.text(`${i} / ${pg}`, W-margin, 295, {align:'right'});
    }

    doc.save(filename);
  }

  function loadAndGenerate() {
    if (window.jspdf && window.jspdf.jsPDF) { generate(); return; }
    const s1 = document.createElement('script');
    s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
      s2.onload = generate;
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  }

  loadAndGenerate();
}

// ── Interactive Session Report: per-trick bar+line chart with click-to-detail ──

function sbGroupAttempts(attempts) {
  const groups = [], byTrick = {};
  (attempts||[]).forEach(a => {
    const key = normSbTrick(a.trick||'—');
    if (!byTrick[key]) { byTrick[key] = {trick:key, attempts:[]}; groups.push(byTrick[key]); }
    byTrick[key].attempts.push(a);
  });
  return groups;
}

function sbTrickChartSvg(g, ai, ti) {
  const n = g.attempts.length;
  const H = 90, TOP = 12, PADL = 26, PADR = 6, barW = n > 14 ? 14 : 22, gap = n > 14 ? 5 : 8;
  const PH = H - TOP;
  const chartW = n*(barW+gap);
  let grid = '';
  // Linke Achse: Sterne (Balkenhöhe), rechte Achse: % (laufende Stomp-Rate-Linie)
  [0, 3, 5].forEach(s => {
    const y = H - s/5*PH;
    grid += `<line x1="${PADL}" y1="${y.toFixed(1)}" x2="${PADL + chartW}" y2="${y.toFixed(1)}" stroke="var(--border)" stroke-width="1" ${s ? 'stroke-dasharray="2 4"' : ''}/>`;
    grid += `<text x="${PADL - 4}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="#6b8299" font-family="Poppins,sans-serif">${s}★</text>`;
  });
  let stompCum = 0;
  const pts = [];
  let labels = '';
  const bars = g.attempts.map((a, i) => {
    if (a.outcome === 'stomped') stompCum++;
    pts.push(stompCum / (i+1));
    const isFail = a.outcome === 'failed';
    const st = typeof a.sterne === 'number' ? a.sterne : (a.outcome==='stomped' ? 5 : 3);
    const h = isFail ? 6 : Math.max(12, st/5*PH);
    const x = PADL + i*(barW+gap);
    labels += `<text x="${x + barW/2}" y="${H + 12}" text-anchor="middle" font-size="8" font-weight="${isFail?'700':'400'}" fill="${isFail?'#e2001a':'#6b8299'}" font-family="Poppins,sans-serif">${i+1}</text>`;
    return `<rect x="${x}" y="${H-h}" width="${barW}" height="${h}" rx="3" fill="${isFail?'#e2001a':'#4a7dd6'}" style="cursor:pointer;" onclick="sbRVShowDetail(${ai},${ti},${i})"/>`;
  }).join('');
  const line = pts.map((p,i) => `${PADL + i*(barW+gap)+barW/2},${(H - p*PH).toFixed(1)}`).join(' ');
  const w = PADL + Math.max(chartW, 40) + PADR;
  const axisTitle = `<text x="${PADL + chartW/2}" y="${H + 24}" text-anchor="middle" font-size="8" fill="#6b8299" font-family="Poppins,sans-serif" font-weight="600">Attempts</text>`;
  return `<div style="overflow-x:auto;padding:4px 0;"><svg width="${w}" height="${H+28}" style="display:block;">${grid}${bars}
    ${n>1?`<polyline points="${line}" fill="none" stroke="#9aa8b8" stroke-width="1.5" opacity="0.75"/>`:''}
    ${labels}${axisTitle}
  </svg></div>`;
}

function sbRVShowDetail(ai, ti, i) {
  if (!_sbRV) return;
  const g = _sbRV.groups[ai][ti];
  const a = g.attempts[i];
  const el = document.getElementById(`sbrv-det-${ai}-${ti}`);
  if (!el || !a) return;
  if (_sbRVEdit && _sbRVEdit.ai === ai && _sbRVEdit.ti === ti && _sbRVEdit.i === i) {
    const stars = SB_KPIS.filter(([k]) => _sbRVEditKpis[k]).length;
    el.innerHTML = `<div style="background:var(--surface);border:1px solid #39c3d433;border-radius:10px;padding:10px;margin-top:4px;">
      <div style="font-size:11px;font-weight:700;color:#39c3d4;margin-bottom:8px;">Edit attempt ${i+1} — ${g.trick}</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin-bottom:6px;">
        ${SB_KPIS.map(([k,label]) => {
          const on = !!_sbRVEditKpis[k];
          return `<button onclick="sbRVEditKpiToggle('${k}')" style="padding:5px 8px;border-radius:6px;border:1.5px solid ${on?'#39c3d4':'var(--border)'};background:${on?'rgba(57,195,212,0.18)':'var(--surface2)'};color:${on?'#39c3d4':'var(--muted)'};font-family:'Poppins',sans-serif;font-size:10px;font-weight:600;cursor:pointer;">⭐ ${label}</button>`;
        }).join('')}
        <button onclick="sbRVEditSave('landed')" style="padding:6px 12px;border-radius:8px;border:2px solid ${stars===5?'#39c3d4':'#34d399'};background:${stars===5?'rgba(57,195,212,0.15)':'rgba(52,211,153,0.15)'};color:${stars===5?'#39c3d4':'#34d399'};font-family:'Poppins',sans-serif;font-size:11px;font-weight:700;cursor:pointer;">${stars===5?'⭐ Save Stomped':'✓ Save Landed '+stars+'/5'}</button>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
        <select onchange="sbRVEditFailSet(this.value)" style="padding:6px 8px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:11px;font-family:'Poppins',sans-serif;">
          <option value="">— no reason —</option>
          ${[...new Set(sbAllFailReasons().concat(_sbRVEditFail ? [_sbRVEditFail] : []))].map(r => `<option ${_sbRVEditFail===r?'selected':''}>${r}</option>`).join('')}
        </select>
        <button onclick="sbRVEditSave('failed')" style="padding:6px 12px;border-radius:8px;border:2px solid #e2001a;background:rgba(226,0,26,0.15);color:#e2001a;font-family:'Poppins',sans-serif;font-size:11px;font-weight:700;cursor:pointer;">✗ Save Failed</button>
        <button onclick="sbRVEditCancel()" style="padding:6px 12px;border-radius:8px;background:none;border:1px solid var(--border);color:var(--muted);font-size:11px;cursor:pointer;font-family:'Poppins',sans-serif;">Cancel</button>
        <button onclick="sbRVEditDelete()" style="margin-left:auto;padding:6px 12px;border-radius:8px;background:none;border:1px solid #e2001a55;color:#e2001a;font-size:11px;cursor:pointer;font-family:'Poppins',sans-serif;">🗑 Delete attempt</button>
      </div>
    </div>`;
    return;
  }
  let txt;
  if (a.outcome === 'failed') {
    txt = `<span style="color:#e2001a;font-weight:600;">Attempt ${i+1} — Failed${a.fail ? ': '+sbFailLabel(a.fail) : ''}</span>`;
  } else if (a.kpis) {
    const met = SB_KPIS.filter(([k])=>a.kpis[k]).map(([,l])=>l);
    const open = SB_KPIS.filter(([k])=>!a.kpis[k]).map(([,l])=>l);
    txt = `<span style="color:${a.outcome==='stomped'?'#39c3d4':'#34d399'};font-weight:600;">Attempt ${i+1} — ${a.outcome==='stomped'?'Stomped ⭐ 5/5':'Landed '+(a.sterne??'?')+'/5'}</span>`
      + (met.length ? ` <span style="color:#34d399;">✓ ${met.join(', ')}</span>` : '')
      + (open.length ? ` <span style="color:var(--muted);">✗ ${open.join(', ')}</span>` : '');
  } else {
    txt = `<span style="color:#34d399;font-weight:600;">Attempt ${i+1} — ${a.outcome==='stomped'?'Stomped':'Landed'}</span> <span style="color:var(--muted);">(no detail data)</span>`;
  }
  if (a.comment) txt += ` <span style="color:var(--muted);">— ${a.comment}</span>`;
  if (a.time) txt += ` <span style="color:var(--muted);font-size:10px;">${a.time}</span>`;
  if (_sbRVEditable && _sbRV.report && _sbRV.report.id && a.dbId) {
    txt += ` <button onclick="sbRVEditStart(${ai},${ti},${i})" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);cursor:pointer;padding:1px 7px;font-size:10px;">✏️ Edit</button>`;
  }
  el.innerHTML = txt;
}

// Inline onclick handlers run in global scope and can't see _sbRV — go through this instead.
// The PDF reuses sbReportInnerHtml(), so print and web view render from the exact same markup.
function sbRVPrintPdf() {
  const report = _sbRV && _sbRV.report;
  if (!report) { showToast('No report open', 'error'); return; }
  const inner = sbReportInnerHtml(report);
  // Legacy reports without per-attempt data have no web view — fall back to the table export
  if (inner === null) { openReportPrint(report); return; }

  const dateStr = report.datum ? (() => { const p=report.datum.split('-'); return p[2]+'.'+p[1]+'.'+p[0].slice(2); })() : '';
  const athleteStr = Array.isArray(report.athletes) ? report.athletes.map(a=>shortName(a)).join(', ') : (report.athletes||'');
  const condLabel = report.conditions ? (report.conditions+'/5 '+(['','Poor','Below Average','Average','Good','Excellent'][report.conditions]||'')) : '—';
  const printable = inner
    .replace(/<div id="sbrv-det-\d+-\d+"[^>]*>Tap a bar for details<\/div>/g, '')  // interaction hint only
    .replace(/ onclick="sbRVShowDetail\([^"]*\)"/g, '')
    .replace(/cursor:pointer;/g, '');
  const today = new Date().toLocaleDateString('de-CH');

  const win = window.open('', '_blank');
  if (!win) { showToast('Please allow pop-ups to export the PDF', 'error'); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Session Report ${dateStr} — Snowboard</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  :root { --bg:#060f1a; --surface:#0c1a2b; --surface2:#112236; --border:#1a3450;
          --accent2:#39c3d4; --text:#e8edf2; --muted:#6b8299; --success:#34d399; --danger:#e2001a; }
  *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  body{font-family:'Poppins',-apple-system,'Helvetica Neue',Arial,sans-serif;background:var(--bg);
       color:var(--text);padding:28px 32px;max-width:820px;margin:0 auto;}
  .print-btn{margin-bottom:20px;}
  .print-btn button{padding:9px 22px;background:var(--accent2);color:#060f1a;border:none;border-radius:8px;
       font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;}
  h1{font-size:20px;font-weight:800;margin-bottom:10px;}
  .meta{display:flex;flex-wrap:wrap;gap:6px 26px;border-top:1px solid var(--border);
        border-bottom:1px solid var(--border);padding:10px 0;margin-bottom:16px;}
  .meta div{font-size:11px;color:var(--muted);}
  .meta b{display:block;color:var(--text);font-size:12px;font-weight:600;margin-top:2px;}
  .comments{background:var(--surface2);border-left:3px solid var(--accent2);border-radius:8px;
            padding:10px 12px;font-size:12px;margin-bottom:18px;}
  /* Wide charts scroll in the web view; on paper they must scale to fit instead of being clipped */
  svg{max-width:100%;height:auto;}
  footer{margin-top:24px;border-top:1px solid var(--border);padding-top:10px;font-size:10px;
         color:var(--muted);display:flex;justify-content:space-between;}
  @media print{
    .print-btn{display:none;}
    body{padding:12mm;max-width:none;}
    @page{size:A4;margin:0;}
    /* Keep a trick card whole; matches the card divs sbReportInnerHtml() emits */
    div[style*="border-radius:12px"]{break-inside:avoid;page-break-inside:avoid;}
  }
</style></head><body>
  <div class="print-btn"><button onclick="window.print()">Print / Save as PDF</button></div>
  <h1>Session Report · ${dateStr}</h1>
  <div class="meta">
    <div>ATHLETES<b>${athleteStr||'—'}</b></div>
    <div>LOCATION<b>${(report.location||'—')}${report.jump_size ? ' · Jump '+report.jump_size : ''}</b></div>
    <div>CONDITIONS<b>${condLabel}</b></div>
  </div>
  ${printable}
  <footer><span>Swiss-Ski Trick Analyses — Snowboard</span><span>Generated ${today}</span></footer>
</body></html>`);
  win.document.close();
}

function sbRVEditStart(ai, ti, i) {
  const a = _sbRV.groups[ai][ti].attempts[i];
  _sbRVEdit = {ai, ti, i};
  _sbRVEditKpis = {...(a.kpis || {})};
  _sbRVEditFail = sbFailLabel(a.fail);
  sbRVShowDetail(ai, ti, i);
}

function sbRVEditKpiToggle(k) {
  _sbRVEditKpis[k] = !_sbRVEditKpis[k];
  const {ai, ti, i} = _sbRVEdit;
  sbRVShowDetail(ai, ti, i);
}

function sbRVEditFailSet(v) { _sbRVEditFail = v; }

async function sbRVEditDelete() {
  if (!_sbRVEdit || !_sbRV) return;
  if (!confirm('Delete this attempt? It will be removed from the report and the database.')) return;
  const {ai, ti, i} = _sbRVEdit;
  const report = _sbRV.report;
  const a = _sbRV.groups[ai][ti].attempts[i];
  if (a.dbId) {
    const {error} = await db.from('tricks').delete().eq('id', a.dbId);
    if (error) { showToast('Error deleting: ' + error.message, 'error'); return; }
  }
  const td = report.trick_data[ai];
  const idx = td.attempts.indexOf(a);
  if (idx >= 0) td.attempts.splice(idx, 1);
  if (a.dbId && Array.isArray(td.trickIds)) {
    const tIdx = td.trickIds.indexOf(a.dbId);
    if (tIdx >= 0) td.trickIds.splice(tIdx, 1);
  }
  const ents = td.attempts.map(x => ({trick: x.trick, result: x.outcome==='failed'?'miss':x.outcome==='stomped'?'perfect':'landed'}));
  td.tricks = buildFsTrickBlocks(ents);
  td.totalAtt = td.tricks.reduce((s,t)=>s+t.att,0);
  td.totalLand = td.tricks.reduce((s,t)=>s+t.land,0);
  if (report.id) {
    const {error: rErr} = await db.from('session_reports').update({trick_data: report.trick_data}).eq('id', report.id);
    if (rErr) { showToast('Error saving report: ' + rErr.message, 'error'); return; }
  }
  sbMonRows = null;
  _sbRVEdit = null;
  if (_sbRepSelIdx >= 0) {
    const sy = window.scrollY;
    await sbOpenReportInline(_sbRepSelIdx);
    window.scrollTo(0, sy);
  }
  showToast('Attempt deleted', 'success');
}


async function sbRVEditSave(mode) {
  if (!_sbRVEdit || !_sbRV) return;
  const {ai, ti, i} = _sbRVEdit;
  const report = _sbRV.report;
  const a = _sbRV.groups[ai][ti].attempts[i]; // same object reference as in report.trick_data
  let outcome, kpis = null, fail = null, sterne;
  if (mode === 'failed') {
    outcome = 'failed'; fail = _sbRVEditFail || null; sterne = 0;
  } else {
    kpis = {};
    SB_KPIS.forEach(([k]) => kpis[k] = !!_sbRVEditKpis[k]);
    sterne = SB_KPIS.filter(([k]) => kpis[k]).length;
    outcome = sterne === 5 ? 'stomped' : 'landed';
  }
  // 1. Update the tricks row
  if (a.dbId) {
    const gesamt = outcome==='failed' ? 3 : outcome==='stomped' ? 10 : 7;
    const baseUpd = {gesamt, ausfuehrung:gesamt, landung:gesamt, setup:gesamt, gelandet: outcome==='failed'?'No':'Yes'};
    const fullUpd = {...baseUpd, outcome, kpis, fail_grund: fail, sterne};
    const {error} = await db.from('tricks').update(fullUpd).eq('id', a.dbId);
    if (error && /column|kpis|outcome|fail_grund|sterne|schema/i.test(error.message||'')) {
      await db.from('tricks').update(baseUpd).eq('id', a.dbId);
    } else if (error) { showToast('Error saving: ' + error.message, 'error'); return; }
  }
  // 2. Update the report JSON (attempt + recomputed per-trick blocks and totals)
  a.outcome = outcome; a.kpis = kpis; a.fail = fail; a.sterne = sterne;
  const td = report.trick_data[ai];
  const ents = td.attempts.map(x => ({trick: x.trick, result: x.outcome==='failed'?'miss':x.outcome==='stomped'?'perfect':'landed'}));
  td.tricks = buildFsTrickBlocks(ents);
  td.totalAtt = td.tricks.reduce((s,t)=>s+t.att,0);
  td.totalLand = td.tricks.reduce((s,t)=>s+t.land,0);
  if (report.id) {
    const {error: rErr} = await db.from('session_reports').update({trick_data: report.trick_data}).eq('id', report.id);
    if (rErr) { showToast('Error saving report: ' + rErr.message, 'error'); return; }
  }
  sbMonRows = null; // monitoring cache is stale now
  _sbRVEdit = null;
  if (_sbRepSelIdx >= 0) {
    const sy = window.scrollY;
    await sbOpenReportInline(_sbRepSelIdx);
    window.scrollTo(0, sy);
  }
  showToast('Attempt updated', 'success');
}

function sbReportInnerHtml(report) {
  const trickData = Array.isArray(report.trick_data) ? report.trick_data : [];
  const hasAttempts = trickData.some(a => Array.isArray(a.attempts) && a.attempts.length);
  if (!hasAttempts) return null;
  _sbRV = {report, groups: trickData.map(a => sbGroupAttempts(a.attempts))};
  const typeShort = {'Landing Bag':'Bag','Jump On-Snow':'On-Snow','Big Air Competition':'Comp'}[report.session_type]||report.session_type||'—';

  const sections = trickData.map((a, ai) => {
    const attempts = a.attempts || [];
    if (!attempts.length) return '';
    const groups = _sbRV.groups[ai];
    const totStomp = attempts.filter(x=>x.outcome==='stomped').length;
    const rate = attempts.length ? Math.round(totStomp/attempts.length*100) : 0;
    const cards = groups.map((g, ti) => {
      const n = g.attempts.length;
      const s = g.attempts.filter(x=>x.outcome==='stomped').length;
      const l = g.attempts.filter(x=>x.outcome==='landed').length;
      const f = g.attempts.filter(x=>x.outcome==='failed').length;
      const gRate = n ? Math.round(s/n*100) : 0;
      const failCnt = {};
      g.attempts.forEach(x => { if (x.outcome==='failed' && x.fail) { const fl = sbFailLabel(x.fail); failCnt[fl]=(failCnt[fl]||0)+1; } });
      const topFail = Object.entries(failCnt).sort((a,b)=>b[1]-a[1])[0];
      let fatigue = '';
      if (n >= 6) {
        const half = Math.floor(n/2);
        const r1 = g.attempts.slice(0,half).filter(x=>x.outcome==='stomped').length/half;
        const r2 = g.attempts.slice(half).filter(x=>x.outcome==='stomped').length/(n-half);
        const i1 = g.attempts.slice(0,half).filter(x=>x.outcome!=='failed').length/half;
        const i2 = g.attempts.slice(half).filter(x=>x.outcome!=='failed').length/(n-half);
        if (r2 < r1 - 0.15 || i2 < i1 - 0.2) fatigue = `<span style="color:#f59e0b;">↘ Rate drops in 2nd half</span>`;
      }
      const cmtRows = g.attempts.map((x, ci) => x.comment ? `<div style="font-size:11px;color:var(--muted);margin-bottom:6px;">💬 <b style="color:var(--text);">Attempt ${ci+1}:</b> ${x.comment}</div>` : '').join('');
      const cmtCol = cmtRows ? `<div style="flex:0 1 220px;min-width:170px;border-left:1px solid var(--border);padding-left:14px;">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:6px;">Comments</div>${cmtRows}</div>` : '';
      return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap;">
          <div style="font-size:14px;font-weight:700;color:var(--text);">${g.trick}</div>
          <div style="font-size:11px;color:var(--muted);">${n} attempt${n!==1?'s':''}</div>
        </div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;">
          <div style="flex:1 1 300px;min-width:0;">
            ${sbTrickChartSvg(g, ai, ti)}
            <div id="sbrv-det-${ai}-${ti}" style="font-size:11px;color:var(--muted);min-height:16px;margin:2px 0 8px;">Tap a bar for details</div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11px;">
              <span><b style="color:#39c3d4;">${s}</b> stomped</span>
              <span><b style="color:#34d399;">${l}</b> landed</span>
              <span><b style="color:#e2001a;">${f}</b> failed</span>
              <span><b>${gRate}%</b> stomp rate</span>
              ${topFail ? `<span style="color:#e2001a;">✗ mostly: ${topFail[0]} (${topFail[1]}×)</span>` : ''}
              ${fatigue}
            </div>
          </div>
          ${cmtCol}
        </div>
      </div>`;
    }).join('');
    return `<div style="margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
        <div style="font-size:17px;font-weight:800;color:#39c3d4;">${a.athlet}</div>
        <div style="font-size:11px;color:var(--muted);">${attempts.length} attempts · ${groups.length} trick${groups.length!==1?'s':''} · Ø stomp rate <b style="color:var(--text);">${rate}%</b>${a.quali_scores && a.quali_scores.length ? ' · Quali <b style="color:#f59e0b;">' + a.quali_scores.join(' / ') + '</b>' : ''}${a.final_scores && a.final_scores.length ? ' · Final <b style="color:#f59e0b;">' + a.final_scores.join(' / ') + '</b>' : ''}${a.contest_rank ? ' · Rank <b style="color:#f59e0b;">' + a.contest_rank + '</b>' : ''}</div>
      </div>
      ${a.note ? `<div style="font-size:11px;color:#f59e0b;background:rgba(245,158,11,0.08);border-left:3px solid #f59e0b;border-radius:8px;padding:8px 10px;margin-bottom:10px;">📝 <b>Coach note:</b> ${a.note}</div>` : ''}
      ${cards}
    </div>`;
  }).join('');

  return `<div style="font-size:11px;color:var(--muted);margin-bottom:14px;">${typeShort}${report.location ? ' · '+report.location : ''}${report.duration_min ? ' · '+report.duration_min+' min' : ''}</div>
${report.comments ? `<div style="background:var(--surface2);border-left:3px solid #39c3d4;border-radius:8px;padding:10px 12px;font-size:12px;color:var(--text);margin-bottom:14px;"><b style="color:#39c3d4;">Coach comments:</b> ${report.comments}</div>` : ''}
    <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:10px;color:var(--muted);margin-bottom:14px;">
      <span><span style="display:inline-block;width:10px;height:10px;background:#4a7dd6;border-radius:2px;vertical-align:-1px;"></span> Landed/Stomped (height = stars)</span>
      <span><span style="display:inline-block;width:10px;height:10px;background:#e2001a;border-radius:2px;vertical-align:-1px;"></span> Failed</span>
      <span><span style="display:inline-block;width:14px;height:2px;background:#9aa8b8;vertical-align:3px;"></span> running stomp rate (0–100%)</span>
    </div>
    ${sections}`;
}

function openSessionReportView(report) {
  _sbRVEditable = false;
  _sbRVEdit = null;
  const inner = sbReportInnerHtml(report);
  if (inner === null) { openReportPrint(report); return; }
  const dateStr = report.datum ? (() => { const p=report.datum.split('-'); return p[2]+'.'+p[1]+'.'+p[0].slice(2); })() : '';
  document.getElementById('sbrv-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'sbrv-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:2100;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto;';
  modal.innerHTML = `<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px;max-width:640px;width:100%;margin:auto 0;">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px;">
      <div style="font-size:16px;font-weight:800;color:var(--text);">Session Report · ${dateStr}</div>
      <div style="display:flex;gap:8px;">
        <button onclick="sbRVPrintPdf()" style="padding:7px 14px;border-radius:8px;background:none;border:1px solid var(--border);color:var(--muted);font-family:'Poppins',sans-serif;font-size:12px;cursor:pointer;">PDF</button>
        <button onclick="document.getElementById('sbrv-modal').remove()" style="padding:7px 14px;border-radius:8px;background:rgba(57,195,212,0.15);border:1px solid #39c3d4;color:#39c3d4;font-family:'Poppins',sans-serif;font-size:12px;font-weight:700;cursor:pointer;">Close</button>
      </div>
    </div>
    ${inner}
  </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

// ── Reports tab: browse past sessions in the interactive chart view ──

let _sbRVEditKpis = {};
let _sbRVEditFail = '';

const SB_TYPE_FILTERS = [['','All'],['Landing Bag','Bag'],['Big Air Training','BA Train'],['Big Air Competition','BA Comp'],['Slopestyle Training','SS Train'],['Slopestyle Competition','SS Comp'],['Halfpipe Training','HP Train'],['Halfpipe Competition','HP Comp']];
// Alt-Daten: «Jump On-Snow» zählt zum neuen «Big Air Training»


function sbTypeChipsHtml(current, handler) {
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;">${SB_TYPE_FILTERS.map(([v,l]) =>
    `<button onclick="${handler}('${v}')" style="padding:6px 14px;border-radius:999px;border:1.5px solid ${current===v?'#39c3d4':'var(--border)'};background:${current===v?'rgba(57,195,212,0.18)':'var(--surface2)'};color:${current===v?'#39c3d4':'var(--muted)'};font-family:'Poppins',sans-serif;font-size:12px;font-weight:600;cursor:pointer;">${l}</button>`).join('')}</div>`;
}

async function loadReportsTab() {
  const root = document.getElementById('sbrep-root');
  if (!root) return;
  root.innerHTML = '<div class="loading"><span class="spinner"></span></div>';
  const {data, error} = await db.from('session_reports').select('*').eq('app','snowboard')
    .order('datum', {ascending:false}).order('created_at', {ascending:false}).limit(200);
  if (error) { root.innerHTML = '<div style="color:var(--muted);padding:16px;">Error loading reports: '+error.message+'</div>'; return; }
  _sbRepList = data || [];
  renderReportsList();
}

function renderReportsList() {
  const root = document.getElementById('sbrep-root');
  if (!root) return;
  if (!_sbRepList.length) {
    root.innerHTML = '<div class="card" style="padding:20px;color:var(--muted);">No session reports yet.</div>';
    return;
  }
  const {from: repFrom, to: repTo} = sbRepRangeBounds();
  const filtered = _sbRepList.map((r, i) => ({r, i}))
    .filter(x => typMatches(x.r.session_type, _sbRepTyp))
    .filter(x => !repFrom || (x.r.datum || '') >= repFrom)
    .filter(x => !repTo || (x.r.datum || '') <= repTo)
    .filter(x => GROUP_FILTER === 'all' || (Array.isArray(x.r.athletes) && x.r.athletes.some(n => SESS_ALL_ATHLETES.some(a => a.name === n))));
  const rows = filtered.map(({r, i}) => {
    const dateStr = r.datum ? (() => { const p=r.datum.split('-'); return p[2]+'.'+p[1]+'.'+p[0].slice(2); })() : '—';
    const typeShort = {'Landing Bag':'Bag','Jump On-Snow':'On-Snow','Big Air Competition':'Comp'}[r.session_type]||r.session_type||'—';
    const athStr = Array.isArray(r.athletes) ? r.athletes.map(a=>shortName(a)).join(', ') : '';
    const att = Array.isArray(r.trick_data) ? r.trick_data.reduce((s,a)=>s+(a.totalAtt||0),0) : 0;
    const durStr = r.duration_min ? (r.duration_min/60).toFixed(1).replace('.0','')+'h' : '—';
    return `<div onclick="sbOpenReportInline(${i})" style="display:flex;align-items:center;gap:12px;padding:13px 6px;border-bottom:1px solid var(--border);cursor:pointer;">
      <div style="min-width:64px;font-size:14px;font-weight:700;color:#39c3d4;">${dateStr}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;color:var(--text);font-weight:600;">${typeShort} · ${durStr}${r.location ? ' · '+r.location : ''}</div>
        <div style="font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${athStr}</div>
      </div>
      <div style="font-size:11px;color:var(--muted);flex-shrink:0;">${att ? att+' att.' : ''}</div>
      <div style="color:#39c3d4;font-size:14px;flex-shrink:0;">→</div>
    </div>`;
  }).join('');
  const dateInput = id => `<input type="date" id="${id}" value="${id==='rep-date-from'?_sbRepFrom:_sbRepTo}" onchange="sbRepApplyCustom()" style="padding:7px 8px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:11px;font-family:'Poppins',sans-serif;">`;
  root.innerHTML = `<div class="card" style="padding:20px;">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:2px;">
      <div style="flex:1;min-width:160px;">
        <div style="font-size:20px;font-weight:800;color:var(--text);">Session Reports</div>
        <div style="font-size:12px;color:var(--muted);">Tap a session to open the report</div>
      </div>
      <select onchange="sbRepSetRange(this.value)" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:12px;font-family:'Poppins',sans-serif;">
        <option value="all" ${_sbRepRange==='all'?'selected':''}>All time</option>
        <option value="season" ${_sbRepRange==='season'?'selected':''}>Current season</option>
        <option value="last" ${_sbRepRange==='last'?'selected':''}>Last season</option>
        <option value="custom" ${_sbRepRange==='custom'?'selected':''}>Custom period…</option>
      </select>
    </div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0 12px;">
      ${sbTypeChipsHtml(_sbRepTyp, 'sbRepSetTyp')}
      ${_sbRepRange==='custom' ? `<div style="display:flex;align-items:center;gap:6px;">${dateInput('rep-date-from')}<span style="color:var(--muted);">–</span>${dateInput('rep-date-to')}</div>` : ''}
    </div>
    ${rows || '<div style="color:var(--muted);padding:12px;">No reports match the current filters.</div>'}
  </div>`;
}

async function sbOpenReportInline(i) {
  let report = _sbRepList[i];
  if (!report) return;
  _sbRepSelIdx = i;
  _sbRVEdit = null;
  // Ältere Reports ohne attempts (oder ohne dbIds) — einmalig aus der tricks-Tabelle rekonstruieren
  const hasAttempts = Array.isArray(report.trick_data) && report.trick_data.some(a => Array.isArray(a.attempts) && a.attempts.length);
  const missingIds = hasAttempts && report.trick_data.some(a => Array.isArray(a.attempts) && a.attempts.some(x => !x.dbId));
  if (report.id && (!hasAttempts || missingIds)) {
    await rebuildReportFromTimestamps(report.id, true);
    report = _sbRepList[i];
  }
  const root = document.getElementById('sbrep-root');
  _sbRVEditable = true;
  const inner = sbReportInnerHtml(report);
  if (inner === null) { openReportPrint(report); return; }
  const dateStr = report.datum ? (() => { const p=report.datum.split('-'); return p[2]+'.'+p[1]+'.'+p[0].slice(2); })() : '';
  root.innerHTML = `<div class="card" style="padding:20px;">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <button onclick="renderReportsList()" style="padding:8px 14px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:'Poppins',sans-serif;font-size:13px;font-weight:600;cursor:pointer;">← Back</button>
        <div style="font-size:16px;font-weight:800;color:var(--text);">Session Report · ${dateStr}</div>
      </div>
      <button onclick="sbRVPrintPdf()" style="padding:7px 14px;border-radius:8px;background:none;border:1px solid var(--border);color:var(--muted);font-family:'Poppins',sans-serif;font-size:12px;cursor:pointer;">PDF</button>
    </div>
    ${inner}
    <div style="border-top:1px solid var(--border);margin-top:20px;padding-top:16px;display:flex;justify-content:center;">
      <button onclick="sbRepDeleteCurrent()" style="padding:10px 20px;border-radius:8px;background:none;border:1px solid #e2001a;color:#e2001a;font-family:'Poppins',sans-serif;font-size:12px;font-weight:600;cursor:pointer;">🗑 Delete session (report + all attempts)</button>
    </div>
  </div>`;
  window.scrollTo(0,0);
}


async function viewSessionReportByDate(date) {
  const {data, error} = await db.from('session_reports').select('*').eq('datum', date).eq('app','snowboard');
  if (error || !data || data.length === 0) { showToast('No session report found for this date', 'error'); return; }
  if (data.length === 1) { openSessionReportView(data[0]); return; }
  let existingModal = document.getElementById('sr-pick-modal');
  if (existingModal) existingModal.remove();
  const modal = document.createElement('div');
  modal.id = 'sr-pick-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px;';
  modal.innerHTML = `<div style="background:#0c1a2b;border:1px solid #1a3450;border-radius:16px;padding:24px;max-width:400px;width:100%;">
    <div style="font-size:16px;font-weight:700;color:#39c3d4;margin-bottom:16px;">Multiple reports for ${date}</div>
    ${data.map((r,i)=>`<button onclick="document.getElementById('sr-pick-modal').remove();openSessionReportView(window._srPickData[${i}])" style="display:block;width:100%;text-align:left;padding:10px 14px;margin-bottom:8px;background:#112236;border:1px solid #1a3450;border-radius:8px;color:#e8edf2;font-family:'Poppins',sans-serif;font-size:13px;cursor:pointer;">
      ${({'Landing Bag':'Bag','Jump On-Snow':'On-Snow','Big Air Competition':'Competition'}[r.session_type]||r.session_type||'—')} · ${(r.athletes||[]).map(a=>a.split(' ')[0]).join(', ')} · ${r.duration_min}min
    </button>`).join('')}
    <button onclick="document.getElementById('sr-pick-modal').remove()" style="padding:8px 16px;background:none;border:1px solid #1a3450;border-radius:8px;color:#6b8299;font-family:'Poppins',sans-serif;font-size:13px;cursor:pointer;margin-top:4px;">Cancel</button>
  </div>`;
  window._srPickData = data;
  document.body.appendChild(modal);
}

async function loadStandort() {
  sbAthlet = document.getElementById('sb-athlet').value;
  const empty = document.getElementById('sb-empty');
  const main  = document.getElementById('sb-main');
  const addBtn = document.getElementById('sb-add-btn');

  if (!sbAthlet) {
    empty.style.display = 'block';
    main.style.display  = 'none';
    addBtn.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  main.style.display  = 'block';
  addBtn.style.display = 'inline-block';

  // Show loading
  document.getElementById('sb-columns').innerHTML = '<div class="loading" style="grid-column:1/-1"><span class="spinner"></span>Loading...</div>';

  // Load standort entries + tricks from DB in parallel
  const [sbRes, tricksRes] = await Promise.all([
    db.from('standort').select('*').eq('athlet', sbAthlet).order('created_at', { ascending: false }),
    sbFetchAllRows(() => db.from('tricks').select('*').eq('athlet', sbAthlet)),
  ]);

  if (sbRes.error || tricksRes.error) {
    const errMsg = (sbRes.error || tricksRes.error)?.message || 'Unbekannt';
    document.getElementById('sb-columns').innerHTML = '<div style="color:var(--danger);padding:20px;grid-column:1/-1">Error: ' + errMsg + '</div>';
    return;
  }

  sbData = sbRes.data || [];
  sbSessTricks = tricksRes.data || [];

  // Auto-check: if a "goal" entry now appears in tricks DB → mark as erreicht
  const dbTrickLabels = new Set((tricksRes.data || []).map(t => trickDesc(t)));

  const toMarkReached = sbData.filter(e =>
    e.status === 'goal' && dbTrickLabels.has(e.trick_label)
  );
  for (const e of toMarkReached) {
    await db.from('standort').update({ status: 'erreicht', updated_at: new Date().toISOString() }).eq('id', e.id);
    e.status = 'erreicht';
  }

  renderStandort();
}

function renderSbDirRadar() {
  // Charts removed from the Assessment page (14.8.2026) — direction balance
  // now lives in the Monitoring tab (athlete level).
  const wrap = document.getElementById('sb-dir-radar-wrap');
  if (wrap) wrap.style.display = 'none';
  return;
  /* eslint-disable no-unreachable */
  const mastered = sbData.filter(e => e.status === 'mastered');
  const goals    = sbData.filter(e => e.status === 'goal');
  if (!mastered.length && !goals.length) { wrap.style.display='none'; return; }
  wrap.style.display = 'block';

  // Clockwise from top-left: Frontside(TL), Backside(TR), Switch Frontside(BR), Switch Backside(BL)
  const DIRS = ['Backside','Switch Frontside','Switch Backside','Frontside'];
  const getDir = raw => {
    const s = (raw||'').trim();
    if(s==='Frontside') return 'Frontside';
    if(s==='Backside') return 'Backside';
    if(s==='Switch Frontside' || s==='Cab') return 'Switch Frontside';
    if(s==='Switch Backside') return 'Switch Backside';
    return null;
  };

  const mastC = {}; DIRS.forEach(d=>mastC[d]=0);
  mastered.forEach(e=>{const d=getDir(e.drehrichtung);if(d)mastC[d]++;});
  const goalC = {}; DIRS.forEach(d=>goalC[d]=0);
  goals.forEach(e=>{const d=getDir(e.drehrichtung);if(d)goalC[d]++;});

  const mastTotal=DIRS.reduce((s,d)=>s+mastC[d],0)||1;
  const goalTotal=DIRS.reduce((s,d)=>s+goalC[d],0)||1;
  const mastVals=DIRS.map(d=>mastC[d]/mastTotal);
  const goalVals=DIRS.map(d=>goalC[d]/goalTotal);

  let canvas = document.getElementById('sb-dir-radar');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'sb-dir-radar';
    canvas.style.cssText = 'width:100%;max-width:420px;display:block;margin:0 auto;';
    wrap.querySelector('.card').appendChild(canvas);
  }
  const dpr=window.devicePixelRatio||1;
  const size=Math.min(wrap.querySelector('.card')?.offsetWidth-16||420,420);
  canvas.style.width=size+'px'; canvas.style.height=size+'px';
  canvas.width=size*dpr; canvas.height=size*dpr;
  const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
  const W=size,H=size,cx=W/2,cy=H/2,r=Math.min(W,H)/2-130;
  ctx.clearRect(0,0,W,H);
  const angles=DIRS.map((_,i)=>i*2*Math.PI/4-Math.PI/4);

  // Grid
  ctx.beginPath();
  angles.forEach((a,i)=>{const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
  ctx.closePath();ctx.fillStyle='rgba(57,195,212,0.07)';ctx.fill();
  [0.25,0.5,0.75,1].forEach(f=>{
    ctx.beginPath();
    angles.forEach((a,i)=>{const x=cx+Math.cos(a)*r*f,y=cy+Math.sin(a)*r*f;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
    ctx.closePath();ctx.strokeStyle='rgba(255,255,255,0.18)';ctx.lineWidth=1;ctx.stroke();
  });
  angles.forEach(a=>{ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);ctx.strokeStyle='rgba(255,255,255,0.18)';ctx.lineWidth=1;ctx.stroke();});

  // Goals polygon (orange dashed)
  if(goals.length){
    ctx.setLineDash([8,5]);ctx.strokeStyle='#f59e0b';ctx.lineWidth=1.5;
    ctx.beginPath();
    angles.forEach((a,i)=>{const x=cx+Math.cos(a)*r*goalVals[i],y=cy+Math.sin(a)*r*goalVals[i];i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
    ctx.closePath();ctx.fillStyle='rgba(245,158,11,0.35)';ctx.fill();ctx.stroke();
    ctx.setLineDash([]);
    angles.forEach((a,i)=>{
      const x=cx+Math.cos(a)*r*goalVals[i],y=cy+Math.sin(a)*r*goalVals[i];
      ctx.beginPath();ctx.arc(x,y,5,0,2*Math.PI);ctx.fillStyle='#f59e0b';ctx.fill();
      ctx.strokeStyle='#0b1929';ctx.lineWidth=1.5;ctx.stroke();
    });
  }

  // Learned polygon (green solid)
  if(mastered.length){
    ctx.setLineDash([]);ctx.strokeStyle='#34d399';ctx.lineWidth=1.5;
    ctx.beginPath();
    angles.forEach((a,i)=>{const x=cx+Math.cos(a)*r*mastVals[i],y=cy+Math.sin(a)*r*mastVals[i];i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
    ctx.closePath();ctx.fillStyle='rgba(52,211,153,0.45)';ctx.fill();ctx.stroke();
    angles.forEach((a,i)=>{
      const x=cx+Math.cos(a)*r*mastVals[i],y=cy+Math.sin(a)*r*mastVals[i];
      ctx.beginPath();ctx.arc(x,y,5,0,2*Math.PI);ctx.fillStyle='#34d399';ctx.fill();
      ctx.strokeStyle='#0b1929';ctx.lineWidth=1.5;ctx.stroke();
    });
  }

  // Labels
  const DIR_COL={'Frontside':'#39c3d4','Backside':'#f59e0b','Switch Frontside':'#a78bfa','Switch Backside':'#4a7dd6'};
  angles.forEach((a,i)=>{
    const lx=cx+Math.cos(a)*(r+62),ly=cy+Math.sin(a)*(r+62);
    const align=Math.cos(a)<-0.3?'right':Math.cos(a)>0.3?'left':'center';
    ctx.textAlign=align;ctx.textBaseline='middle';
    ctx.font='bold 12px Poppins,sans-serif';ctx.fillStyle='#e8edf2';
    ctx.fillText(DIRS[i],lx,ly-14);
    ctx.font='bold 13px Poppins,sans-serif';ctx.fillStyle='#34d399';
    ctx.fillText('✓ '+mastC[DIRS[i]],lx,ly+2);
    ctx.font='bold 13px Poppins,sans-serif';ctx.fillStyle='#f59e0b';
    ctx.fillText('◎ '+goalC[DIRS[i]],lx,ly+17);
  });

  renderAthleteDirBalance(wrap, ['Frontside','Backside','Switch Frontside','Switch Backside'],
    {'Frontside':'#39c3d4','Backside':'#f59e0b','Switch Frontside':'#a78bfa','Switch Backside':'#4a7dd6'},
    t => {
      const tb = t.trickaufbau || t.trick_label || '';
      const fromTb = ['Switch Backside','Switch Frontside','Frontside','Backside','Cab'].find(d => tb.startsWith(d+' ') || tb.startsWith(d+' —')) || null;
      const raw = fromTb || (t.drehrichtung||'').trim() || null;
      return raw === 'Cab' ? 'Switch Frontside' : raw;
    });
}

function renderStandort() {
  // Stats
  const mastered = sbData.filter(e => e.status === 'mastered').length;
  const goale      = sbData.filter(e => e.status === 'goal').length;
  const erreicht   = sbData.filter(e => e.status === 'erreicht').length;

  renderSbDirRadar();

  document.getElementById('sb-overview').innerHTML = `
    <div class="sb-ov-card">
      <div class="sb-ov-num" style="color:var(--success);">${mastered}</div>
      <div class="sb-ov-label">Learned Tricks</div>
    </div>
    <div class="sb-ov-card">
      <div class="sb-ov-num" style="color:var(--warn);">${goale}</div>
      <div class="sb-ov-label">Open Goals</div>
    </div>
    <div class="sb-ov-card">
      <div class="sb-ov-num" style="color:var(--accent);">${erreicht}</div>
      <div class="sb-ov-label">Goals Achieved</div>
    </div>
  `;

  // Two columns: Learned | Ziele
  const bList = sbData.filter(e => e.status === 'mastered');
  const zList = sbData.filter(e => e.status === 'goal');

  const DIR_ORDER = ['Frontside','Backside','Switch Frontside','Switch Backside'];
  const DIR_COLORS = {'Frontside':'#39c3d4','Backside':'#f59e0b','Switch Frontside':'#a78bfa','Switch Backside':'#4a7dd6'};

  function normDir4(d) {
    if (!d) return null;
    const s = d.trim();
    if (s === 'Frontside') return 'Frontside';
    if (s === 'Backside') return 'Backside';
    if (s === 'Switch Frontside' || s === 'Cab') return 'Switch Frontside';
    if (s === 'Switch Backside') return 'Switch Backside';
    return null;
  }

  function renderTrickRow(e) {
    return `<div class="sb-trick-row">
      <span class="sb-trick-name">
        <span style="font-weight:500;">${normSbTrick((e.trick_label||'').replace(/\bNone\b/gi,'').replace(/\s{2,}/g,' ').trim())}</span>
        <span style="display:flex;gap:8px;align-items:center;margin-top:2px;">
          ${e.datum ? `<span style="font-size:10px;color:var(--muted);">📅 ${e.datum}</span>` : ''}
          ${e.notiz ? `<span style="font-size:10px;color:var(--muted);">${e.notiz}</span>` : ''}
        </span>
        ${grabChipsHtml(e)}
      </span>
      <button style="background:none;border:1px solid #1a3450;border-radius:5px;color:#6b8299;cursor:pointer;padding:2px 7px;font-size:11px;margin-right:2px;" onclick="openSbEdit(${e.id})" title="Edit">✏️</button>
      <button class="btn-del" onclick="deleteSbEntry(${e.id})" title="Remove">✕</button>
    </div>`;
  }

  function extractRotFS(label) {
    const m = (label||'').match(/\b(180|270|360|450|540|630|720|810|900|1080|1260|1440|1620|1800|1980|2160)\b/);
    return m ? parseInt(m[1]) : 0;
  }

  function renderList(items, emptyMsg) {
    if (!items.length) return `<div style="padding:20px;color:var(--muted);font-size:13px;text-align:center;">${emptyMsg}</div>`;
    // Group by direction
    const groups = {};
    items.forEach(e => {
      const dir = normDir4(e.drehrichtung) || 'Other';
      if (!groups[dir]) groups[dir] = [];
      groups[dir].push(e);
    });
    // Sort each group: highest rotation first
    Object.keys(groups).forEach(dir => {
      groups[dir].sort((a,b) => extractRotFS(b.trick_label) - extractRotFS(a.trick_label));
    });
    const orderedKeys = [...DIR_ORDER.filter(d => groups[d]), ...(groups['Other'] ? ['Other'] : [])];
    return orderedKeys.map(dir => {
      const col = DIR_COLORS[dir] || 'var(--muted)';
      return `<div style="border-bottom:1px solid var(--border);">
        <div style="padding:6px 14px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${col};background:var(--surface2);">${dir}</div>
        ${groups[dir].map(e => renderTrickRow(e)).join('')}
      </div>`;
    }).join('');
  }

  document.getElementById('sb-columns').innerHTML = `
    <div>
      <div class="sb-col-header mastered">✅ LEARNED TRICKS <span style="opacity:.6;font-size:13px;">(${bList.length})</span></div>
      <div class="sb-col-body mastered">${renderList(bList, 'No entries yet')}</div>
    </div>
    <div>
      <div class="sb-col-header goal">🎯 GOALS / IN PROGRESS <span style="opacity:.6;font-size:13px;">(${zList.length})</span></div>
      <div class="sb-col-body goal">${renderList(zList, 'No goals yet')}</div>
    </div>
  `;

  // Progress / erreichte Ziele
  const reachedList = sbData.filter(e => e.status === 'erreicht');
  const timelineCard = document.getElementById('sb-timeline-card');
  if (reachedList.length) {
    timelineCard.style.display = 'block';
    document.getElementById('sb-timeline').innerHTML = reachedList.map(e => `
      <div class="timeline-item">
        <div class="timeline-dot dot-erreicht"></div>
        <div class="timeline-body">
          <div class="timeline-title">${badge(e.disziplin)} ${e.trick_label}
            <span class="sb-status-erreicht" style="margin-left:6px;">✓ Achieved</span>
          </div>
          ${e.notiz ? `<div class="timeline-meta">${e.notiz}</div>` : ''}
          <div class="timeline-meta">Logged: ${fmtDate(e.created_at)}</div>
        </div>
      </div>`).join('');
  } else {
    timelineCard.style.display = 'none';
  }
}

async function cycleGrabStatus(entryId, grab) {
  const e = sbData.find(x => x.id === entryId);
  if (!e) return;
  const gs = {...effGrabStatus(e)};
  const next = nextGrabState(gs[grab]);
  if (next) gs[grab] = next; else delete gs[grab];
  if (await updateGrabStatus(entryId, gs, e)) renderStandort();
}

async function sbSave(status) {
  const fields = readFields('sb');
  if (!fields.disziplin) { showToast('Please select a discipline', 'error'); return; }

  const trickLabel = trickDesc(null, 'sb');
  if (!trickLabel || trickLabel === '–') { showToast('Please fill in at least one trick field', 'error'); return; }

  const notiz = val('sb-notiz');

  const row = {
    athlet: sbAthlet,
    datum: document.getElementById('sb-datum').value || new Date().toISOString().split('T')[0],
    disziplin: fields.disziplin,
    trick_label: trickLabel,
    // Store all individual fields too for reference
    drehrichtung: fields.drehrichtung, flips: fields.flips, achse: fields.achse,
    rotation: fields.rotation, absprung: fields.absprung,
    grab: Object.keys(sbAssessGrabMatrix).join(', ') || fields.grab,
    bringback: fields.bringback, railart: fields.railart, slideform: fields.slideform,
    slidevar: fields.slidevar, inspin: fields.inspin, swap: fields.swap, outspin: fields.outspin,
    notiz,
    status,
  };
  if (fields.transfer) row.transfer = fields.transfer;
  if (fields.foot) row.foot = fields.foot;
  if (_standortHasGrabStatus && Object.keys(sbAssessGrabMatrix).length) row.grab_status = {...sbAssessGrabMatrix};
  let { data, error } = await db.from('standort').insert(row).select();
  if (error && /grab_status/.test(error.message||'')) {
    _standortHasGrabStatus = false;
    delete row.grab_status;
    ({ data, error } = await db.from('standort').insert(row).select());
  }
  if (error && row.transfer && /transfer/.test(error.message||'')) {
    delete row.transfer;
    ({ data, error } = await db.from('standort').insert(row).select());
    if (!error) showToast('Transfer not saved — run the transfer SQL first', 'error');
  }
  if (error && row.foot && /foot/.test(error.message||'')) {
    delete row.foot;
    ({ data, error } = await db.from('standort').insert(row).select());
    if (!error) showToast('Foot not saved — run the foot SQL first', 'error');
  }

  if (error) { showToast('Error: ' + error.message, 'error'); return; }

  showToast(status === 'mastered' ? '✓ Saved as mastered!' : '🎯 Saved as goal!', 'success');

  // Reset sb form fields
  ['sb-disziplin','sb-drehrichtung','sb-flips','sb-achse','sb-rotation','sb-absprung',
   'sb-grab','sb-bringback','sb-style','sb-railart','sb-slideform','sb-slidevar','sb-foot','sb-inspin','sb-swap','sb-transfer','sb-outspin','sb-notiz',
  ].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  initStandortGrabs();
  toggleDisziplin('sb');

  sbData = [data[0], ...sbData];
  renderStandort();
  toggleSbForm();

  if (sessSelectedAthletes.includes(sbAthlet) && sessAthleteData[sbAthlet]) {
    sessAthleteData[sbAthlet].tricks = await fetchStandortTricks(sbAthlet);
    saveSessionState();
  }
}

async function loadEntwicklung() {
  const athlet = document.getElementById('ev-athlet').value;
  const empty  = document.getElementById('ev-empty');
  const main   = document.getElementById('ev-main');
  if (!athlet) { empty.style.display='block'; main.style.display='none'; return; }
  empty.style.display = 'none';
  main.style.display  = 'block';
  main.innerHTML = '<div class="loading" style="padding:60px;text-align:center;"><span class="spinner"></span>Loading...</div>';

  const [tricksRes, standortRes] = await Promise.all([
    sbFetchAllRows(() => db.from('tricks').select('*').eq('athlet', athlet).order('datum', { ascending: true })),
    db.from('standort').select('*').eq('athlet', athlet),
  ]);

  const tricks   = tricksRes.data  || [];
  const standort = standortRes.data || [];

  if (!tricks.length && !standort.length) {
    main.innerHTML = '<div class="empty-state">No entries yet for this athlete</div>';
    return;
  }

  // Restore HTML structure
  main.innerHTML = `
    <div style="display:flex;gap:16px;align-items:center;margin-bottom:20px;flex-wrap:wrap;">
      <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);">
        ${tricks.length} session logs
      </div>
    </div>
    <div class="chart-grid single">
      <div class="chart-card" id="ev-analytics-card">
        <div style="margin-bottom:16px;">
          <div class="chart-title" style="margin-bottom:12px;">📊 Trick Statistics</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
            <button id="ev-mode-trick"   onclick="setStatsMode('trick')"   style="padding:8px 18px;border-radius:8px;font-family:'Poppins',sans-serif;font-size:13px;font-weight:600;cursor:pointer;border:2px solid #39c3d4;background:rgba(57,195,212,0.2);color:#39c3d4;">Individual Trick</button>
            <button id="ev-mode-session" onclick="setStatsMode('session')" style="padding:8px 18px;border-radius:8px;font-family:'Poppins',sans-serif;font-size:13px;font-weight:600;cursor:pointer;border:2px solid var(--border);background:var(--surface2);color:var(--muted);">Individual Session</button>
          </div>
          <select id="ev-trick-sel" onchange="renderTrickAnalytics()" style="display:none;width:100%;font-size:13px;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);">
            <option value="">— Select a trick —</option>
          </select>
          <select id="ev-date-sel" onchange="renderTrickAnalytics()" style="display:none;width:100%;font-size:13px;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);">
            <option value="">— Select a session —</option>
          </select>
        </div>
        <div id="ev-trick-analytics"></div>
      </div>
    </div>
    <div id="ev-raw-wrap" style="margin-top:16px;"></div>
    </div>`;

  // ── Normalise standort entries to same shape as tricks
  // standort has: drehrichtung, rotation, achse, grab, flips, disziplin, status
  // We tag each entry with its source
  const tTagged = tricks.map(t  => ({ ...t,  _src: 'training' }));
  const sTagged = standort.filter(s => s.status === 'mastered' || s.status === 'erreicht').map(s => ({
    drehrichtung: s.drehrichtung, rotation: s.rotation, achse: s.achse,
    grab: s.grab, flips: s.flips, disziplin: s.disziplin,
    gesamt: null, datum: null,
    _src: 'standort', _status: s.status,
  }));
  const all = [...tTagged, ...sTagged];

  // ── Count helpers (supports split by source)
  function countBySplit(field) {
    const train={}, stand={};
    tTagged.forEach(t => { const v=t[field]; if(v) train[v]=(train[v]||0)+1; });
    sTagged.forEach(s => { const v=s[field]; if(v) stand[v]=(stand[v]||0)+1; });
    const keys = [...new Set([...Object.keys(train),...Object.keys(stand)])];
    return { train, stand, keys };
  }

  function avgByField(groupField, valueField) {
    const sums={}, counts={};
    tTagged.forEach(t => {
      const k=t[groupField], v=parseFloat(t[valueField]);
      if(k && !isNaN(v)){ sums[k]=(sums[k]||0)+v; counts[k]=(counts[k]||0)+1; }
    });
    const res={};
    Object.keys(sums).forEach(k => res[k]=parseFloat((sums[k]/counts[k]).toFixed(1)));
    return res;
  }

  // ── 1. RADAR: Directions — session landing rate (blue) + assessment volume (amber)
  const directions = ['Frontside','Backside','Switch Frontside','Switch Backside'];

  // Parse direction from trickaufbau (session format: "Switch Frontside 900 — Indy")
  function dirFromTrickaufbau(tb) {
    if (!tb) return null;
    if (tb.startsWith('SH ')) tb = tb.slice(3);
    for (const d of ['Switch Backside','Switch Frontside','Frontside','Backside','Cab']) {
      if (tb.startsWith(d + ' ') || tb.startsWith(d + ' —')) return d === 'Cab' ? 'Switch Frontside' : d;
    }
    return null;
  }

  // Calculate landing rate per direction from session data
  const dirStats = {};
  tTagged.forEach(t => {
    const rawDir = dirFromTrickaufbau(t.trickaufbau) || t.drehrichtung;
    const dir = rawDir === 'Cab' ? 'Switch Frontside' : rawDir;
    if (!dir) return;
    if (!dirStats[dir]) dirStats[dir] = { total: 0, landed: 0 };
    dirStats[dir].total++;
    if (t.gelandet === 'Yes') dirStats[dir].landed++;
  });

  const dirRates    = directions.map(d => dirStats[d]?.total ? dirStats[d].landed / dirStats[d].total : 0);
  const dirRatePct  = directions.map(d => dirStats[d]?.total ? Math.round(dirStats[d].landed / dirStats[d].total * 100) : null);

  // Assessment volume for amber polygon (Cab = HP-Terminologie → zählt zu Switch Frontside)
  const { stand: dirS } = countBySplit('drehrichtung');
  dirS['Switch Frontside'] = (dirS['Switch Frontside']||0) + (dirS['Cab']||0);
  const maxDirS = Math.max(...directions.map(d => dirS[d]||0), 1);

  drawRadarSplit('cv-radar', directions,
    dirRates,
    directions.map(d => (dirS[d]||0)/maxDirS),
    dirRatePct,
    directions.map(d => dirS[d]||0));

  // ── 1b. RADAR: Achsen by direction (Cork & Bio/Misty × Richtung)
  const corkCounts = {}, bioMistyCounts = {}, swCorkCounts = {}, swBioCounts = {};
  tTagged.concat(sTagged).forEach(t => {
    const d = t.drehrichtung, a = t.achse;
    if (!d || !a) return;
    if (a === 'Cork')      { if (!d.startsWith('Switch')) corkCounts[d]=(corkCounts[d]||0)+1; else swCorkCounts[d]=(swCorkCounts[d]||0)+1; }
    if (a === 'Bio/Misty') { if (!d.startsWith('Switch')) bioMistyCounts[d]=(bioMistyCounts[d]||0)+1; else swBioCounts[d]=(swBioCounts[d]||0)+1; }
  });
  const allDirs = ['Left','Right','Switch Left','Switch Right'];
  const corkE = allDirs.map(d=>[d,(corkCounts[d]||0)+(swCorkCounts[d]||0),0]).filter(e=>e[1]>0);
  drawBarsSplit('bars-cork', corkE.length ? corkE : [['– no data –',0,0]]);
  const bioE = allDirs.map(d=>[d,(bioMistyCounts[d]||0)+(swBioCounts[d]||0),0]).filter(e=>e[1]>0);
  drawBarsSplit('bars-bio', bioE.length ? bioE : [['– no data –',0,0]]);

  // ── 2. Rotationen
  const { train: rotT, stand: rotS, keys: rotKeys } = countBySplit('rotation');
  const rotSorted = rotKeys.sort((a,b)=>parseInt(a)-parseInt(b)).map(k=>[k, rotT[k]||0, rotS[k]||0]);
  drawBarsSplit('bars-rotation', rotSorted);

  // ── 3. Achsen
  const { train: achseT, stand: achseS, keys: achseKeys } = countBySplit('achse');
  const achseSorted = achseKeys.sort((a,b)=>((achseT[b]||0)+(achseS[b]||0))-((achseT[a]||0)+(achseS[a]||0))).map(k=>[k, achseT[k]||0, achseS[k]||0]);
  drawBarsSplit('bars-achse', achseSorted);

  // ── 4. Grabs
  // Count grabs separately (one entry can have multiple grabs separated by comma)
  const grabTrainMap = {}, grabStandMap = {};
  tTagged.forEach(t => {
    if (!t.grab) return;
    t.grab.split(',').map(g => g.trim()).filter(Boolean).forEach(g => {
      grabTrainMap[g] = (grabTrainMap[g] || 0) + 1;
    });
  });
  sTagged.forEach(s => {
    if (!s.grab) return;
    s.grab.split(',').map(g => g.trim()).filter(Boolean).forEach(g => {
      grabStandMap[g] = (grabStandMap[g] || 0) + 1;
    });
  });
  const grabKeys2 = [...new Set([...Object.keys(grabTrainMap), ...Object.keys(grabStandMap)])];
  const grabSorted = grabKeys2.sort((a,b) => ((grabTrainMap[b]||0)+(grabStandMap[b]||0)) - ((grabTrainMap[a]||0)+(grabStandMap[a]||0))).map(k => [k, grabTrainMap[k]||0, grabStandMap[k]||0]);
  drawBarsSplit('bars-grab', grabSorted);

  // ── 5. Qualität über Zeit — nach Trick gefiltert
  // Build trick label for each session entry
  function trickLabel(t) {
    const parts = [t.drehrichtung, t.achse, t.rotation, t.grab].filter(Boolean);
    return parts.join(' · ');
  }
  const tricksWithRating = tTagged.filter(t => t.datum && t.gesamt != null && trickLabel(t));
  const trickOptions = [...new Set(tricksWithRating.map(trickLabel))].sort();

  // Store for later use by updateQualityChart
  window._evTricksWithRating = tricksWithRating;
  window._evTrickLabel = trickLabel;

  const sel = document.getElementById('ev-trick-filter');
  if (sel) {
    sel.innerHTML = '<option value="">— select trick —</option>'
      + trickOptions.map(l => `<option value="${l}">${l}</option>`).join('');
  }
  // Clear chart until trick selected
  const cvLine = document.getElementById('cv-line');
  const cvEmpty = document.getElementById('cv-line-empty');
  if (cvLine) cvLine.style.display = 'none';
  if (cvEmpty) cvEmpty.style.display = 'block';

  // ── 6. Quality per Direction (training only)
  const qualByDir = avgByField('drehrichtung','gesamt');
  const qualSorted = Object.entries(qualByDir).sort((a,b)=>b[1]-a[1]);
  drawBarsRating('bars-qualitaet', qualSorted);

  // ── 7. Landing Rate per Trick
  const landMap = {};
  tTagged.forEach(t => {
    const label = [t.drehrichtung, t.achse, t.rotation, t.grab].filter(Boolean).join(' · ');
    if (!label) return;
    if (!landMap[label]) landMap[label] = { ja: 0, total: 0 };
    landMap[label].total++;
    if (t.gelandet === 'Ja') landMap[label].ja++;
  });
  const landSorted = Object.entries(landMap)
    .filter(([,v]) => v.total > 0)
    .map(([label, v]) => [label, Math.round(v.ja / v.total * 100), v.ja, v.total])
    .sort((a, b) => b[1] - a[1]);
  const landEl = document.getElementById('bars-landing');
  if (landEl) {
    if (!landSorted.length) {
      landEl.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px;">No session entries with landing data yet.</div>';
    } else {
      landEl.innerHTML = landSorted.map(([label, pct, ja, total]) => {
        const col = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
        return `<div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
            <span style="color:var(--text);font-weight:600;">${label}</span>
            <span style="color:${col};font-weight:700;">${pct}% <span style="color:var(--muted);font-weight:400;">(${ja}/${total})</span></span>
          </div>
          <div style="background:var(--border);border-radius:4px;height:8px;">
            <div style="background:${col};width:${pct}%;height:8px;border-radius:4px;transition:width .4s;"></div>
          </div>
        </div>`;
      }).join('');
    }
  }

  // ── 8. Repertoire Development Over Time ──────────────────────────
  const verlaufEl = document.getElementById('ev-verlauf');
  if (verlaufEl) {
    // Only mastered/erreicht standort entries with datum
    const sbMitDatum = standort.filter(s =>
      (s.status === 'mastered' || s.status === 'erreicht') && (s.datum || s.created_at)
    );
    if (!sbMitDatum.length) {
      verlaufEl.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px;">No mastered tricks in assessment yet.</div>';
    } else {
      // Group by date
      const byDate = {};
      sbMitDatum.forEach(s => {
        const d = (s.datum || s.created_at || '').slice(0, 10);
        if (!byDate[d]) byDate[d] = [];
        const parts = [s.drehrichtung,
          s.flips && s.flips !== 'keine' ? s.flips : null,
          s.achse, s.rotation, s.grab].filter(Boolean);
        byDate[d].push(parts.join(' ') || s.railart || '–');
      });
      const dates = Object.keys(byDate).sort();
      // Accumulate: what was new on each date
      let known = new Set();
      const rows = dates.map(d => {
        const tricks = byDate[d];
        const newTricks = tricks.filter(t => !known.has(t));
        tricks.forEach(t => known.add(t));
        return { date: d, total: known.size, newTricks };
      });
      verlaufEl.innerHTML = rows.map((r, i) => {
        const dateStr = new Date(r.date).toLocaleDateString('de-CH', { day:'2-digit', month:'2-digit', year:'numeric' });
        const newBadge = r.newTricks.length > 0
          ? `<span style="background:rgba(52,211,153,0.15);color:#34d399;border:1px solid #34d399;border-radius:12px;padding:2px 8px;font-size:11px;margin-left:8px;">+${r.newTricks.length} neu</span>`
          : '';
        const newList = r.newTricks.length > 0
          ? `<div style="margin-top:6px;padding-left:12px;border-left:2px solid #34d399;">${r.newTricks.map(t =>
              `<span style="display:inline-block;background:rgba(52,211,153,0.12);color:#34d399;border-radius:10px;padding:2px 8px;font-size:11px;margin:2px;">${t}</span>`
            ).join('')}</div>`
          : '';
        const borderTop = i > 0 ? 'border-top:1px solid var(--border);' : '';
        return `<div style="padding:12px 0;${borderTop}">
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;">
            <span style="font-family:'Poppins',sans-serif;font-size:15px;letter-spacing:1px;color:#ffffff;">${dateStr}</span>
            <span style="font-size:13px;color:var(--text);font-weight:600;">${r.total} Tricks mastered</span>
            ${newBadge}
          </div>
          ${newList}
        </div>`;
      }).join('');
    }
  }

  // ── Inject type filter row for Trick Statistics ──────────────────
  (() => {
    const modeDiv = document.querySelector('#ev-mode-trick')?.parentElement;
    if (!modeDiv || document.getElementById('ev-type-filter')) return;
    const fRow = document.createElement('div');
    fRow.id = 'ev-type-filter';
    fRow.style.cssText = 'display:none;gap:6px;flex-wrap:wrap;margin-bottom:10px;';
    fRow.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <span style="font-size:11px;color:var(--muted);">Filter:</span>
          <button id="ev-tf-all"  onclick="setTypeFilter('')"                    style="padding:4px 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;border:1px solid #39c3d4;background:rgba(57,195,212,0.2);color:#39c3d4;">All</button>
          <button id="ev-tf-bag"  onclick="setTypeFilter('Landing Bag')"         style="padding:4px 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;border:1px solid var(--border);background:var(--surface2);color:var(--muted);">Bag</button>
          <button id="ev-tf-jump" onclick="setTypeFilter('Jump On-Snow')"        style="padding:4px 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;border:1px solid var(--border);background:var(--surface2);color:var(--muted);">On-Snow</button>
          <button id="ev-tf-comp" onclick="setTypeFilter('Big Air Competition')" style="padding:4px 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;border:1px solid var(--border);background:var(--surface2);color:var(--muted);">Comp</button>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:11px;color:var(--muted);white-space:nowrap;">Period:</span>
          <input type="text" id="ev-date-from" oninput="setDateRange()" placeholder="DD.MM.YY"
            style="padding:3px 8px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);color:var(--muted);font-size:11px;font-family:Poppins,sans-serif;width:90px;">
          <span style="font-size:11px;color:var(--muted);">→</span>
          <input type="text" id="ev-date-to" oninput="setDateRange()" placeholder="DD.MM.YY"
            style="padding:3px 8px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);color:var(--muted);font-size:11px;font-family:Poppins,sans-serif;width:90px;">
          <button onclick="clearDateRange()" style="padding:3px 8px;border-radius:6px;font-size:11px;cursor:pointer;font-family:Poppins,sans-serif;border:1px solid var(--border);background:var(--surface2);color:var(--muted);">✕</button>
        </div>
      </div>`;
    modeDiv.after(fRow);
  })();

  // ── 9. Trick + Grab Session Stats ─────────────────────────────────
  const statsEl = document.getElementById('ev-trick-stats');
  if (statsEl) {
    const sessionTricks = tricks.filter(t => t.trickaufbau && t.trickaufbau.includes(' — '));
    if (!sessionTricks.length) {
      statsEl.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px;">No session data yet.</div>';
    } else {
      // Group by trickaufbau + datum
      const byTrick = {};
      sessionTricks.forEach(t => {
        const key = t.trickaufbau;
        if (!byTrick[key]) byTrick[key] = { total: 0, landed: 0, perfect: 0, dates: new Set() };
        byTrick[key].total++;
        if (t.gelandet === 'Yes') byTrick[key].landed++;
        if (t.gesamt >= 10) byTrick[key].perfect++;
        if (t.datum) byTrick[key].dates.add(t.datum);
      });

      const rows = Object.entries(byTrick).sort((a,b) => {
        const pctA = a[1].total ? a[1].landed / a[1].total : 0;
        const pctB = b[1].total ? b[1].landed / b[1].total : 0;
        return pctB - pctA;
      });

      statsEl.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr>
          <th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Trick — Grab</th>
          <th style="text-align:center;padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Date(s)</th>
          <th style="text-align:center;padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Landed / Total</th>
          <th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border);color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Rate</th>
        </tr></thead>
        <tbody>
          ${rows.map(([trick, s]) => {
            const pct = s.total ? Math.round(s.landed / s.total * 100) : 0;
            const barColor = pct >= 70 ? '#34d399' : pct >= 40 ? '#f59e0b' : '#e2001a';
            const dates = [...s.dates].sort().map(d => new Date(d).toLocaleDateString('de-CH', {day:'2-digit',month:'2-digit'})).join(', ');
            const parts = trick.split(' — ');
            return `<tr style="border-bottom:1px solid var(--border);">
              <td style="padding:10px 12px;">
                <div style="font-weight:600;color:var(--text);">${parts[0]||trick}</div>
                ${parts[1] ? `<div style="font-size:11px;color:#39c3d4;margin-top:2px;">Grab: ${parts[1]}</div>` : ''}
              </td>
              <td style="padding:10px 12px;text-align:center;color:var(--muted);font-size:12px;">${dates}</td>
              <td style="padding:10px 12px;text-align:center;">
                <div style="font-family:'Poppins',sans-serif;font-weight:700;font-size:15px;color:var(--text);">${s.landed}/${s.total}</div>
                ${s.perfect > 0 ? `<div style="font-size:10px;color:#39c3d4;margin-top:2px;">⭐ ${s.perfect}× perfect</div>` : ''}
              </td>
              <td style="padding:10px 12px;min-width:120px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div style="flex:1;background:var(--surface2);border-radius:4px;height:8px;overflow:hidden;">
                    <div style="background:${barColor};width:${pct}%;height:8px;border-radius:4px;transition:width .4s;"></div>
                  </div>
                  <span style="font-weight:700;color:${barColor};min-width:36px;font-size:13px;">${pct}%</span>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
    }
  }

  // ── SB Trick Analytics ────────────────────────────────────────────
  initTrickAnalytics(tricks);
  renderRawEntries(tricks, 'all entries');
}

let sbeGrabMatrix={};
let sbeLabelResidual='';

function openSbEdit(id){
  const e=sbData.find(r=>r.id===id); if(!e)return;
  document.getElementById('sbe-id').value=id;
  document.getElementById('sbe-datum').value=e.datum||'';
  const sv=(fid,val)=>{const el=document.getElementById(fid);if(el)el.value=val||'';};
  sv('sbe-disziplin',e.disziplin);sbeToggle();
  sv('sbe-drehrichtung',e.drehrichtung);sv('sbe-rotation',e.rotation);
  sv('sbe-flips',e.flips);sv('sbe-achse',e.achse);
  sv('sbe-style',e.style);sv('sbe-absprung',e.absprung);
  sv('sbe-bringback',e.bringback);sv('sbe-railart',e.railart);
  sv('sbe-slideform',e.slideform);sv('sbe-inspin',e.inspin);
  sv('sbe-outspin',e.outspin);sv('sbe-notiz',e.notiz);
  sv('sbe-status',e.status);
  // Grab-Ampel wie im Erfassungs-Formular: 1×=✓ Learned, 2×=🎯 Goal, 3×=aus
  const wrap=document.getElementById('sbe-grab-wrap');
  sbeGrabMatrix={...effGrabStatus(e)};
  // Label-Rest merken (Angaben ohne eigene Spalte, z. B. Bones/Todeo) — wird beim Speichern wieder angehängt
  const oldIsK=['Jump','Side Hit','Halfpipe','Landing Bag'].includes(e.disziplin);
  const oldBb=e.bringback?'Bringback '+e.bringback:null;
  const oldParts=oldIsK?[e.absprung,e.drehrichtung,e.flips&&!['keine','None','none','—'].includes(e.flips)?e.flips:null,e.rotation,e.achse,oldBb]:[e.inspin,e.slideform,e.railart,e.outspin];
  sbeLabelResidual=labelResidual(e.trick_label,[...oldParts,...Object.keys(sbeGrabMatrix),...(e.grab||'').split(',').map(s=>s.trim())]);
  Array.from(wrap.querySelectorAll('button')).forEach(b=>b.remove());
  [...new Set([...assessGrabList(e.disziplin),...Object.keys(sbeGrabMatrix)])].forEach(g=>{
    const btn=document.createElement('button');
    btn.type='button';btn.dataset.grab=g;
    styleAssessGrabBtn(btn,g,sbeGrabMatrix[g]);
    btn.onclick=()=>{
      const next=nextGrabState(sbeGrabMatrix[g]);
      if(next)sbeGrabMatrix[g]=next;else delete sbeGrabMatrix[g];
      styleAssessGrabBtn(btn,g,next);
    };
    wrap.appendChild(btn);
  });
  const ov=document.getElementById('sb-edit-overlay');
  ov.style.display='flex';
}

async function saveSbEdit(){
  const id=parseInt(document.getElementById('sbe-id').value);
  const gv=id=>{const el=document.getElementById(id);return el?el.value:'';};
  const updates={
    datum:gv('sbe-datum'),disziplin:gv('sbe-disziplin'),
    drehrichtung:gv('sbe-drehrichtung'),rotation:gv('sbe-rotation'),
    flips:gv('sbe-flips'),achse:gv('sbe-achse'),
    absprung:gv('sbe-absprung'),bringback:gv('sbe-bringback'),
    railart:gv('sbe-railart'),slideform:gv('sbe-slideform'),
    inspin:gv('sbe-inspin'),outspin:gv('sbe-outspin'),notiz:gv('sbe-notiz'),
    status:gv('sbe-status'),
    grab:Object.keys(sbeGrabMatrix).join(', ')||null,
  };
  const isK=['Jump','Side Hit','Halfpipe','Landing Bag'].includes(updates.disziplin);
  const bb = updates.bringback ? 'Bringback ' + updates.bringback : null;
  // Label aus Feldern OHNE Grab (lebt in grab_status/Chips) + gemerktem Label-Rest
  const parts=isK?[updates.absprung,updates.drehrichtung,updates.flips&&!['keine','None','none','—'].includes(updates.flips)?updates.flips:null,updates.achse,updates.rotation,bb]:[updates.inspin,updates.slideform,updates.railart,updates.outspin];
  updates.trick_label=(parts.filter(Boolean).join(' ')+(sbeLabelResidual?' '+sbeLabelResidual:'')).trim()||'–';
  if(_standortHasGrabStatus)updates.grab_status={...sbeGrabMatrix};
  let {error}=await db.from('standort').update(updates).eq('id',id);
  if(error&&/grab_status/.test(error.message||'')){
    _standortHasGrabStatus=false;delete updates.grab_status;
    ({error}=await db.from('standort').update(updates).eq('id',id));
  }
  if(error){showToast('Error: '+error.message,'error');return;}
  showToast('✓ Trick updated!');closeSbEdit();loadStandort();
}

function extractQuality(t) {
  const g = t.gesamt;
  if (!g && g !== 0) return null;
  if (g >= 10) return 100;
  if (g >= 7)  return 50;
  return 0;
}

function trickDir(name) {
  if (!name) return null;
  if (name.includes('Switch Backside')) return 'Switch Backside';
  if (name.includes('Switch Frontside')) return 'Switch Frontside';
  if (name.includes('Backside'))  return 'Backside';
  if (name.includes('Frontside')) return 'Frontside';
  if (name.includes('Cab'))       return 'Switch Frontside';
  return null;
}

let _sbTaData = [];

let _sbTaTypeFilter = '';

let _sbTaDateFrom = '';

let _sbTaDateTo = '';

function sortFsTricksByDir(tricks) {
  const dirOrder = {'Frontside':0,'Backside':1,'Switch Frontside':2,'Switch Backside':3};
  const getDir = lbl => {
    for (const d of ['Switch Backside','Switch Frontside','Frontside','Backside','Cab']) {
      if (lbl.startsWith(d)) return d === 'Cab' ? 'Switch Frontside' : d;
      if (lbl.includes(' '+d+' ') || lbl.includes(' '+d)) return d === 'Cab' ? 'Switch Frontside' : d;
    }
    return 'Other';
  };
  const sorted = tricks.map(t => ({name:t, dir:getDir(t), rot:extractRotFromLabel(t)}))
    .sort((a,b) => {
      const da = dirOrder[a.dir] ?? 4, db = dirOrder[b.dir] ?? 4;
      if (da !== db) return da - db;
      return a.rot - b.rot;
    });
  let html = '', lastDir = '';
  sorted.forEach(t => {
    if (t.dir !== lastDir) {
      if (lastDir) html += '</optgroup>';
      html += `<optgroup label="${t.dir}">`;
      lastDir = t.dir;
    }
    html += `<option value="${t.name.replace(/"/g,'&quot;')}">${t.name}</option>`;
  });
  if (lastDir) html += '</optgroup>';
  return html;
}

function initTrickAnalytics(tricks) {
  // Normalize trick names on load
  _sbTaData = tricks.filter(t => t.trickaufbau).map(t => ({...t, trickaufbau: normSbTrick(t.trickaufbau)}));
  const sel = document.getElementById('ev-trick-sel');
  const dateSel = document.getElementById('ev-date-sel');
  if (!sel) return;

  // Populate trick filter sorted by direction + rotation
  const unique = [...new Set(_sbTaData.map(t => t.trickaufbau))];
  sel.innerHTML = '<option value="">— Select a trick —</option><option value="__ALL__">── All Tricks ──</option>' +
    sortFsTricksByDir(unique);

  // Build session list
  if (dateSel) {
    const sessions = buildSessionList(_sbTaData);
    dateSel.innerHTML = '<option value="">— Select a session —</option>' +
      sessions.map(s => `<option value="${s.key}">${s.label}</option>`).join('');
  }
  setStatsMode('trick');
}

function buildSessionList(data) {
  const byDate = {};
  data.forEach(t => {
    if (!t.datum) return;
    if (!byDate[t.datum]) byDate[t.datum] = [];
    byDate[t.datum].push(t);
  });
  const sessions = [];
  function swissDate(d) { const [y,m,day] = d.split('-'); return `${day}.${m}.${y.slice(2)}`; }
  function sessType(dayData) {
    const types = [...new Set(dayData.map(t=>t.typ||'Training'))];
    const short = {'Landing Bag':'Bag','Jump On-Snow':'On-Snow','Big Air Competition':'Competition','Training':'Training'};
    return types.map(t=>short[t]||t).join(', ');
  }
  Object.keys(byDate).sort().forEach(date => {
    const dayData = byDate[date];
    const withTime = dayData.filter(t => t.created_at).sort((a,b) => a.created_at.localeCompare(b.created_at));
    if (withTime.length === 0) {
      sessions.push({key: date+'|0', label: `${swissDate(date)} — ${sessType(dayData)}`, date, sessionIdx: 0});
      return;
    }
    let sessIdx = 0, lastTime = null;
    withTime.forEach(t => {
      if (lastTime) { const gap = (new Date(t.created_at) - new Date(lastTime)) / 3600000; if (gap > 2) sessIdx++; }
      lastTime = t.created_at;
    });
    const sessCount = sessIdx + 1;
    for (let s = 0; s < sessCount; s++) {
      const suffix = sessCount > 1 ? ` (${s+1})` : '';
      sessions.push({key: `${date}|${s}`, label: `${swissDate(date)} — ${sessType(dayData)}${suffix}`, date, sessionIdx: s, sessCount});
    }
  });
  return sessions;
}

function setTypeFilter(typ) {
  _sbTaTypeFilter = typ;
  const map = {'':'ev-tf-all','Landing Bag':'ev-tf-bag','Jump On-Snow':'ev-tf-jump','Big Air Competition':'ev-tf-comp'};
  Object.values(map).forEach(id=>{
    const b=document.getElementById(id); if(!b) return;
    b.style.background='var(--surface2)'; b.style.borderColor='var(--border)'; b.style.color='var(--muted)';
  });
  const active = document.getElementById(map[typ]||'ev-tf-all');
  if(active){active.style.background='rgba(57,195,212,0.2)';active.style.borderColor='#39c3d4';active.style.color='#39c3d4';}
  const sel = document.getElementById('ev-trick-sel');
  if (sel) {
    const filtered = typ ? _sbTaData.filter(t=>t.typ===typ) : _sbTaData;
    const unique = [...new Set(filtered.map(t=>t.trickaufbau))];
    const prev = sel.value;
    sel.innerHTML = '<option value="">— Select a trick —</option><option value="__ALL__">── All Tricks ──</option>' +
      sortFsTricksByDir(unique);
    if (unique.includes(prev)) sel.value = prev; else sel.value = '';
  }
  renderTrickAnalytics();
}

function setDateRange() {
  const fromEl = document.getElementById('ev-date-from');
  const toEl   = document.getElementById('ev-date-to');
  _sbTaDateFrom = parseDateInput(fromEl?.value);
  _sbTaDateTo   = parseDateInput(toEl?.value);
  [[fromEl,_sbTaDateFrom],[toEl,_sbTaDateTo]].forEach(([el,parsed])=>{
    if(!el) return;
    el.style.borderColor = parsed ? '#39c3d4' : 'var(--border)';
    el.style.color       = parsed ? '#39c3d4' : 'var(--muted)';
  });
  renderTrickAnalytics();
}

function clearDateRange() {
  _sbTaDateFrom = ''; _sbTaDateTo = '';
  const f=document.getElementById('ev-date-from'), t=document.getElementById('ev-date-to');
  if(f){f.value='';f.style.borderColor='var(--border)';f.style.color='var(--muted)';}
  if(t){t.value='';t.style.borderColor='var(--border)';t.style.color='var(--muted)';}
  renderTrickAnalytics();
}

function renderTrickAnalytics() {
  const el = document.getElementById('ev-trick-analytics');
  if (!el || !_sbTaData.length) {
    if(el) el.innerHTML = '<div style="color:var(--muted);text-align:center;padding:24px;">No session data yet.</div>';
    return;
  }
  const sel = document.getElementById('ev-trick-sel');
  const dateSel = document.getElementById('ev-date-sel');
  const chosen = sel ? sel.value : '';
  const isSessionMode = dateSel?.style.display !== 'none';
  const baseData = isSessionMode ? _sbTaData : _sbTaData.filter(t => {
    if (_sbTaTypeFilter && t.typ !== _sbTaTypeFilter) return false;
    if (_sbTaDateFrom && t.datum && t.datum < _sbTaDateFrom) return false;
    if (_sbTaDateTo   && t.datum && t.datum > _sbTaDateTo)   return false;
    return true;
  });
  const dateKey = dateSel ? dateSel.value : '';

  const trickVisible = sel && sel.style.display !== 'none';
  const sessionVisible = dateSel && dateSel.style.display !== 'none';
  if (trickVisible && !chosen && chosen !== '__ALL__') {
    el.innerHTML = '<div style="color:var(--muted);text-align:center;padding:32px;font-size:13px;">Select a trick to view its progression.</div>';
    renderRawEntries(_sbTaData, 'all entries');
    return;
  }
  if (sessionVisible && !dateKey) {
    el.innerHTML = '<div style="color:var(--muted);text-align:center;padding:32px;font-size:13px;">Select a session to view its tricks.</div>';
    renderRawEntries(_sbTaData, 'all entries');
    return;
  }

  const avg = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : null;
  const colQ = v => v>=70?'#34d399':v>=40?'#f59e0b':'#e2001a';

  // SB directions and colors
  const SB_DIRS = ['Frontside','Backside','Switch Frontside','Switch Backside'];
  const SB_DIR_COL = {'Frontside':'#39c3d4','Backside':'#f59e0b','Switch Frontside':'#a78bfa','Switch Backside':'#4a7dd6'};

  // ── SESSION VIEW ─────────────────────────────────────────────────
  if (dateKey) {
    const label = dateSel.options[dateSel.selectedIndex]?.text || dateKey;
    const filterDate = dateKey.split('|')[0];
    const sessIdx = parseInt(dateKey.split('|')[1]||'0');
    const dayData = _sbTaData.filter(t=>t.datum===filterDate).sort((a,b)=>(a.created_at||'').localeCompare(b.created_at||''));
    const sessions=[[]]; let si=0,lt=null;
    dayData.forEach(t=>{if(lt&&t.created_at&&(new Date(t.created_at)-new Date(lt))/3600000>2){si++;sessions.push([]);}sessions[si].push(t);lt=t.created_at;});
    const sd = sessions[sessIdx]||dayData;

    if (!sd.length) { el.innerHTML='<div style="color:var(--muted);text-align:center;padding:24px;">No data for this session.</div>'; renderRawEntries(_sbTaData,'all entries'); return; }

    // Group by trick (normalize names)
    const tmap = {};
    sd.forEach(t => {
      const key = normSbTrick(t.trickaufbau||'—');
      if (!tmap[key]) tmap[key]={att:0,land:0,perf:0,stomped:0,landed_n:0,failed:0};
      tmap[key].att++;
      const q = extractQuality(t);
      if (q===100) { tmap[key].stomped++; tmap[key].land++; tmap[key].perf++; }
      else if (q===50) { tmap[key].landed_n++; tmap[key].land++; }
      else if (q===0) tmap[key].failed++;
    });

    // Direction distribution
    const dirCnt = {}; SB_DIRS.forEach(d=>dirCnt[d]={tricks:0,att:0});
    Object.entries(tmap).forEach(([trick,s])=>{
      const dir = trickDir(trick);
      if(dir&&dirCnt[dir]){dirCnt[dir].tricks++;dirCnt[dir].att+=s.att;}
    });
    const radarTotal = SB_DIRS.reduce((s,d)=>s+dirCnt[d].att,0);

    const cardsHtml = Object.entries(tmap).sort((a,b)=>b[1].att-a[1].att).map(([trick,s])=>{
      const landPct = s.att ? Math.round(s.land/s.att*100) : 0;
      const total = s.att || 1;
      return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px 16px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <span style="font-size:13px;font-weight:600;color:var(--text);flex:1;">${normSbTrick(trick)}${s.perf>0?` <span style="font-size:11px;color:#39c3d4;font-weight:400;">⭐ ${s.perf}×</span>`:''}</span>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:18px;font-weight:800;color:${colQ(landPct)};">${s.land} / ${s.att}</div>
            <div style="font-size:10px;color:var(--muted);">landed+stomped</div>
            <div style="font-size:11px;margin-top:2px;">
              <span style="color:#34d399;font-weight:700;">${s.landed_n}✓</span>
              <span style="color:var(--muted);margin:0 2px;">·</span>
              <span style="color:#39c3d4;font-weight:700;">⭐${s.stomped}</span>
              <span style="color:var(--muted);"> / ${s.att}</span>
            </div>
          </div>
        </div>
        <div style="margin-top:10px;display:flex;flex-direction:column;gap:5px;">
          ${[['Stomped',s.stomped,'#39c3d4'],['Landed',s.landed_n,'#34d399'],['Failed',s.failed,'#e2001a']].map(([lbl,n,col])=>n>0?`<div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:10px;color:var(--muted);min-width:52px;">${lbl}</span>
            <div style="flex:1;background:var(--border);border-radius:3px;height:7px;overflow:hidden;">
              <div style="background:${col};width:${Math.round(n/total*100)}%;height:7px;border-radius:3px;"></div>
            </div>
            <span style="font-size:10px;font-weight:700;color:${col};min-width:20px;text-align:right;">${n}</span>
          </div>`:'').join('')}
        </div>
      </div>`;
    }).join('');

    el.innerHTML =
      `<div style="font-size:12px;color:var(--muted);margin-bottom:16px;">📅 ${label} — ${sd.length} attempts, ${Object.keys(tmap).length} tricks</div>` +
      cardsHtml +
      (radarTotal > 0 ? `
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-top:8px;">
          <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;">Direction Distribution</div>
          <div style="display:flex;align-items:center;justify-content:center;gap:32px;">
            <div>${sessionDirLegendHtml(dirCnt,SB_DIRS,SB_DIR_COL,radarTotal)}</div>
            <div style="width:160px;height:160px;flex-shrink:0;min-width:160px;">
              <canvas id="sess-dir-radar" style="display:block;width:160px;height:160px;"></canvas>
            </div>
          </div>
        </div>` : '');

    if (radarTotal > 0) requestAnimationFrame(() => drawSessionDirRadar('sess-dir-radar', dirCnt, SB_DIRS, SB_DIR_COL));

    // Load athlete notes from session report
    const sessionDate = filterDate;
    db.from('session_reports').select('trick_data,comments').eq('app','snowboard').eq('datum',sessionDate).limit(1).then(({data:reps})=>{
      if (!reps||!reps[0]) return;
      const rep = reps[0];
      const notes = (rep.trick_data||[]).filter(a=>a.note).map(a=>
        `<div style="display:flex;gap:8px;align-items:baseline;margin-bottom:4px;"><span style="font-weight:600;color:#39c3d4;min-width:70px;">${a.athlet}</span><span style="color:var(--text);font-size:12px;">${a.note}</span></div>`
      ).join('');
      if (notes || rep.comments) {
        const notesDiv = document.createElement('div');
        notesDiv.style.cssText = 'background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-top:10px;';
        notesDiv.innerHTML = `<div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Coach Notes</div>`
          + (rep.comments ? `<div style="color:var(--text);font-size:12px;margin-bottom:8px;padding:6px 10px;background:rgba(57,195,212,0.06);border-radius:6px;">${rep.comments}</div>` : '')
          + notes;
        el.appendChild(notesDiv);
      }
    });

    const reportBtnDiv = document.createElement('div');
    reportBtnDiv.style.cssText = 'margin-top:12px;text-align:center;';
    reportBtnDiv.innerHTML = `<button onclick="viewSessionReportByDate('${sessionDate}')" style="padding:10px 22px;border-radius:8px;background:rgba(57,195,212,0.15);border:1px solid #39c3d4;color:#39c3d4;font-family:'Poppins',sans-serif;font-size:13px;font-weight:600;cursor:pointer;">📄 View Session Report</button>`;
    el.appendChild(reportBtnDiv);

    renderRawEntries(sd, label);
    return;
  }

  // ── ALL TRICKS — one chart per trick, scrollable ──────────────────
  if (chosen === '__ALL__') {
    const dirOrder = {'Frontside':0,'Backside':1,'Switch Frontside':2,'Switch Backside':3};
    const getDirAll = lbl => { for (const d of ['Switch Backside','Switch Frontside','Frontside','Backside','Cab']) { if (lbl.startsWith(d) || lbl.includes(' '+d+' ') || lbl.includes(' '+d)) return d === 'Cab' ? 'Switch Frontside' : d; } return 'Other'; };
    const allTricks = [...new Set(baseData.map(t=>t.trickaufbau))]
      .map(t => ({name:t, dir:getDirAll(t), rot:extractRotFromLabel(t)}))
      .sort((a,b) => { const da=dirOrder[a.dir]??4, db=dirOrder[b.dir]??4; return da!==db ? da-db : a.rot-b.rot; });
    if (!allTricks.length) { el.innerHTML='<div style="color:var(--muted);text-align:center;padding:24px;">No data.</div>'; return; }
    const colQ = v => v>=70?'#34d399':v>=40?'#f59e0b':'#e2001a';
    let html = `<div style="font-size:12px;color:var(--muted);margin-bottom:12px;">${allTricks.length} tricks</div>`;
    let lastDir = '';
    const chartIds = [];
    allTricks.forEach((tObj,ti) => {
      if (tObj.dir !== lastDir) {
        html += `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#39c3d4;margin:${lastDir?'20':'4'}px 0 8px;">${tObj.dir}</div>`;
        lastDir = tObj.dir;
      }
      const td = baseData.filter(t=>t.trickaufbau===tObj.name);
      const byDate = {};
      td.forEach(t => { if(!t.datum) return; if(!byDate[t.datum]) byDate[t.datum]={att:0,land:0,stomped:0}; byDate[t.datum].att++; if(t.gelandet==='Yes') byDate[t.datum].land++; if((t.gesamt||0)>=10) byDate[t.datum].stomped++; });
      const dates = Object.keys(byDate).sort();
      const totAtt = td.length, totLand = td.filter(t=>t.gelandet==='Yes').length;
      const landRate = totAtt ? Math.round(totLand/totAtt*100) : 0;
      const cid = 'ta-all-'+ti+'-'+Date.now();
      chartIds.push({cid, dates, byDate});
      html += `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:13px;font-weight:600;color:var(--text);">${tObj.name}</span>
          <span style="font-size:16px;font-weight:800;color:${colQ(landRate)};">${totLand}/${totAtt} <span style="font-size:11px;font-weight:400;">(${landRate}%)</span></span>
        </div>
        <canvas id="${cid}" style="width:100%;height:100px;"></canvas>
      </div>`;
    });
    el.innerHTML = html;
    requestAnimationFrame(() => {
      chartIds.forEach(({cid, dates, byDate}) => {
        const canvas = document.getElementById(cid); if(!canvas) return;
        const dpr = window.devicePixelRatio||1;
        const W = canvas.parentElement.offsetWidth-28, H = 100;
        canvas.style.width=W+'px'; canvas.style.height=H+'px';
        canvas.width=W*dpr; canvas.height=H*dpr;
        const ctx = canvas.getContext('2d'); ctx.scale(dpr,dpr);
        const pad = {l:32,r:8,t:8,b:22};
        const n = dates.length;
        if (!n) return;
        const pts = dates.map(d=>({d,pct:Math.round(byDate[d].land/byDate[d].att*100),att:byDate[d].att}));
        const xs = pts.map((_,i) => pad.l+(n===1?(W-pad.l-pad.r)/2:i/(n-1)*(W-pad.l-pad.r)));
        const toY = v => pad.t+(1-v/100)*(H-pad.t-pad.b);
        [0,50,100].forEach(pct => {
          const y=toY(pct); ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;
          ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();
        });
        const barW = Math.max(4,Math.min(12,(W-pad.l-pad.r)/(n*4)));
        pts.forEach((p,i) => {
          const by=toY(p.pct), bh=H-pad.b-by;
          ctx.fillStyle='#39c3d4cc';ctx.fillRect(xs[i]-barW/2,by,barW,bh);
        });
        if (pts.length >= 2) {
          ctx.beginPath();ctx.strokeStyle='#39c3d455';ctx.lineWidth=1.5;ctx.setLineDash([3,3]);
          pts.forEach((p,i)=>{const y=toY(p.pct);i===0?ctx.moveTo(xs[i],y):ctx.lineTo(xs[i],y);});
          ctx.stroke();ctx.setLineDash([]);
        }
        ctx.textAlign='center';ctx.fillStyle='#6b8299';ctx.font='9px Poppins,sans-serif';
        pts.forEach((p,i)=>ctx.fillText(p.d.split('-')[2]+'.'+p.d.split('-')[1]+'.',xs[i],H-pad.b+12));
      });
    });
    renderRawEntries(baseData, 'all entries');
    return;
  }

  // ── TRICK / OVERALL VIEW ──────────────────────────────────────────
  const chartData = chosen ? baseData.filter(t=>t.trickaufbau===chosen) : baseData;
  if (!chartData.length) { el.innerHTML='<div style="color:var(--muted);text-align:center;padding:24px;">No session data yet.</div>'; renderRawEntries(baseData,'all entries'); return; }

  // Per-date stats
  const byDate={};
  chartData.forEach(t=>{
    if(!t.datum)return;
    if(!byDate[t.datum])byDate[t.datum]={att:0,land:0,stomped:0};
    byDate[t.datum].att++;
    if(t.gelandet==='Yes')byDate[t.datum].land++;
    if((t.gesamt||0)>=10)byDate[t.datum].stomped++;
  });
  const dates=Object.keys(byDate).sort();
  const pts=dates.map(d=>({d,att:byDate[d].att,
    landPct:Math.round(byDate[d].land/byDate[d].att*100),
    land:byDate[d].land,
    stomped:byDate[d].stomped}));

  // Overall stats
  const totAtt=chartData.length;
  const totLand=chartData.filter(t=>t.gelandet==='Yes').length;
  const totStomped=chartData.filter(t=>(t.gesamt||0)>=10).length;
  const totLandedOnly=totLand-totStomped;
  const landRate=totAtt?Math.round(totLand/totAtt*100):0;

  const statsHtml = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;text-align:center;">
    <div><div style="font-size:22px;font-weight:800;color:var(--text);">${totAtt}</div><div style="font-size:11px;color:var(--muted);">Attempts</div></div>
    <div><div style="font-size:22px;font-weight:800;color:#34d399;">${totLandedOnly}</div><div style="font-size:11px;color:var(--muted);">✓ Landed</div></div>
    <div><div style="font-size:22px;font-weight:800;color:#39c3d4;">${totStomped}</div><div style="font-size:11px;color:var(--muted);">⭐ Stomped</div></div>
    <div><div style="font-size:22px;font-weight:800;color:${colQ(landRate)};">${landRate}%</div><div style="font-size:11px;color:var(--muted);">Success</div></div>
  </div>`;

  // Direction distribution for Overall mode only (not individual trick)
  const ovDirCnt = {}; SB_DIRS.forEach(d=>ovDirCnt[d]={tricks:new Set(),att:0});
  chartData.forEach(t=>{
    const name=t.trickaufbau||'';
    const dir=trickDir(name);
    if(dir&&ovDirCnt[dir]){ovDirCnt[dir].tricks.add(name);ovDirCnt[dir].att++;}
  });
  const ovDirTotal = SB_DIRS.reduce((s,d)=>s+ovDirCnt[d].att,0);
  const ovDirCntFinal = {}; SB_DIRS.forEach(d=>ovDirCntFinal[d]={tricks:ovDirCnt[d].tricks.size, att:ovDirCnt[d].att});

  const pieId = 'ta-pie-'+Date.now();
  const cid = 'ta-chart-'+Date.now();
  el.innerHTML = statsHtml + `<canvas id="${cid}" style="width:100%;"></canvas>` +
    (!chosen && ovDirTotal>0 ? `
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-top:16px;">
        <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;">Direction Distribution</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:32px;">
          <div>${sessionDirLegendHtml(ovDirCntFinal,SB_DIRS,SB_DIR_COL,ovDirTotal)}</div>
          <div style="width:160px;height:160px;flex-shrink:0;min-width:160px;">
            <canvas id="${pieId}" style="display:block;width:160px;height:160px;"></canvas>
          </div>
        </div>
      </div>` : '');

  requestAnimationFrame(()=>{
    const canvas=document.getElementById(cid); if(!canvas)return;
    const dpr=window.devicePixelRatio||1, W=(el.offsetWidth||600)-16, H=220;
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    canvas.width=W*dpr; canvas.height=H*dpr;
    const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
    const pad={l:42,r:16,t:14,b:52};
    const n=pts.length;
    const barW=Math.max(6,Math.min(16,(W-pad.l-pad.r)/(n*5)));
    const margin=barW/2+6;
    const xs=pts.map((_,i)=>pad.l+margin+(n===1?(W-pad.l-pad.r-margin*2)/2:i/(n-1)*(W-pad.l-pad.r-margin*2)));
    const toY=v=>pad.t+(1-v/100)*(H-pad.t-pad.b);

    [0,25,50,75,100].forEach(pct=>{
      const y=toY(pct);
      ctx.strokeStyle='rgba(255,255,255,0.07)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();
      ctx.fillStyle='#6b8299';ctx.font='10px Poppins,sans-serif';ctx.textAlign='right';
      ctx.fillText(pct+'%',pad.l-5,y+3);
    });

    // Connect line for quality
    function drawConn(values,col){
      const pts2=values.map((v,i)=>v!==null?{x:xs[i],y:toY(v)}:null).filter(Boolean);
      if(pts2.length<2)return;
      ctx.beginPath();ctx.strokeStyle=col+'55';ctx.lineWidth=1.5;ctx.setLineDash([3,3]);
      pts2.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);
    }
    function drawBars(pt,x){
      const val=pt.landPct; const bx=x-barW/2; const by=toY(val); const bh=H-pad.b-by;
      ctx.fillStyle='#39c3d4cc';ctx.fillRect(bx,by,barW,bh);
      ctx.fillStyle='#39c3d4';ctx.font='9px Poppins,sans-serif';ctx.textAlign='center';
      ctx.fillText(val+'%',bx+barW/2,by-3);
    }

    drawConn(pts.map(p=>p.quality),'#f59e0b');
    drawConn(pts.map(p=>p.landPct),'#39c3d4');
    pts.forEach((p,i)=>drawBars(p,xs[i]));

    ctx.textAlign='center';
    pts.forEach((p,i)=>{
      ctx.fillStyle='#6b8299';ctx.font='10px Poppins,sans-serif';
      ctx.fillText(p.d.split('-')[2]+'.'+p.d.split('-')[1]+'.',xs[i],H-pad.b+14);
      ctx.fillText(p.att+'×',xs[i],H-pad.b+28);
    });

    // ── Hover tooltip: exakte Zahlen pro Trainingstag ──
    let tt = document.getElementById('ta-chart-tooltip');
    if (!tt) {
      tt = document.createElement('div');
      tt.id = 'ta-chart-tooltip';
      tt.style.cssText = 'position:fixed;background:#0d1f33;border:1px solid #39c3d4;border-radius:10px;padding:10px 14px;font-size:12px;font-family:Poppins,sans-serif;pointer-events:none;display:none;z-index:9999;min-width:150px;box-shadow:0 4px 20px rgba(0,0,0,0.5);';
      document.body.appendChild(tt);
    }
    const fmtD = d => { const [y,m,dd]=d.split('-'); return `${dd}.${m}.${y.slice(2)}`; };
    canvas.onmousemove = e => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      let ni=-1, nd=Infinity;
      xs.forEach((x,i)=>{ const dist=Math.abs(mx-x); if(dist<nd&&dist<Math.max(40,(xs[1]-xs[0]||80)/2)){nd=dist;ni=i;} });
      if(ni<0){tt.style.display='none';return;}
      const p=pts[ni], lo=p.land-p.stomped, ms=p.att-p.land;
      tt.innerHTML =
        `<div style="font-weight:700;color:#e8edf2;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:5px;">${fmtD(p.d)} &nbsp;·&nbsp; ${p.att} attempts</div>`
        +`<div style="color:#39c3d4;">⭐ Stomped: <b>${p.stomped}×</b></div>`
        +`<div style="color:#34d399;">✓ Landed&nbsp;: <b>${lo}×</b></div>`
        +`<div style="color:#e2001a;">✗ Missed&nbsp;: <b>${ms}×</b></div>`
        +`<div style="color:#6b8299;margin-top:4px;">Success: <b style="color:#39c3d4;">${p.landPct}%</b></div>`;
      tt.style.display='block';
      const tx = e.clientX+14, ty = e.clientY-10;
      tt.style.left=(tx+tt.offsetWidth>window.innerWidth-10?e.clientX-tt.offsetWidth-14:tx)+'px';
      tt.style.top=ty+'px';
    };
    canvas.onmouseleave = () => { tt.style.display='none'; };
  });

  if(!chosen && ovDirTotal>0) requestAnimationFrame(()=>drawSessionDirRadar(pieId, ovDirCntFinal, SB_DIRS, SB_DIR_COL));

  const filterLabel = _sbTaTypeFilter ? _sbTaTypeFilter : 'all types';
  if (chosen) {
    renderRawEntries(chartData, (chosen.length > 40 ? chosen.slice(0,40)+'…' : chosen) + (filterLabel!=='all types' ? ' · '+filterLabel : ''));
  } else {
    renderRawEntries(baseData, filterLabel);
  }
}

function renderRawEntries(entries, subtitle) {
  const wrap = document.getElementById('ev-raw-wrap');
  if (!wrap) return;
  const wasOpen = document.getElementById('ev-raw-list')?.style.display !== 'none';
  const sorted = [...entries].sort((a,b)=>(b.datum||'').localeCompare(a.datum||'') || (b.id||0)-(a.id||0));

  const fmtDate = d => { if(!d) return '—'; const [y,m,dd]=d.split('-'); return `${dd}.${m}.${y.slice(2)}`; };
  const typShort = t => t==='Landing Bag'?'Bag':t==='Jump On-Snow'?'On-Snow':t==='Big Air Competition'?'Comp':t||'—';
  const resultBadge = t => {
    const g = t.gesamt;
    if (g >= 10) return '<span style="color:#39c3d4;font-weight:700;">⭐ Stomped</span>';
    if (g >= 7)  return '<span style="color:#34d399;font-weight:700;">✓ Landed</span>';
    return '<span style="color:#e2001a;font-weight:700;">✗ Failed</span>';
  };

  wrap.innerHTML = `
    <div style="border:1px solid var(--border);border-radius:12px;overflow:hidden;">
      <button onclick="(function(b,c){c.style.display=c.style.display==='none'?'block':'none';b.querySelector('.raw-arrow').textContent=c.style.display==='none'?'▶':'▼';})(this,document.getElementById('ev-raw-list'))"
        style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--surface2);border:none;cursor:pointer;font-family:Poppins,sans-serif;color:var(--muted);font-size:12px;font-weight:600;">
        <span style="display:flex;align-items:center;gap:8px;"><span class="raw-arrow">${wasOpen?'▼':'▶'}</span> Raw Entries (${sorted.length})${subtitle?` <span style="font-weight:400;opacity:.7;">— ${subtitle}</span>`:''}</span>
        <span style="font-size:11px;opacity:.6;">Inspect or delete entries</span>
      </button>
      <div id="ev-raw-list" style="display:${wasOpen?'block':'none'};max-height:420px;overflow-y:auto;">
        ${sorted.length ? sorted.map(e=>{
          const ts = e.created_at ? new Date(e.created_at).toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Zurich'}) : '';
          const isEditing = _sbRawEditId === e.id;
          const curResult = (e.gesamt||0)>=10?'perfect':e.gelandet==='Yes'?'landed':'miss';
          const editForm = isEditing ? `
            <div style="grid-column:1/-1;padding:8px 0 4px;display:flex;flex-direction:column;gap:6px;">
              <input id="raw-edit-trick-${e.id}" type="text" value="${(e.trickaufbau||'').replace(/"/g,'&quot;')}"
                style="width:100%;padding:6px 10px;border-radius:6px;border:1px solid #39c3d4;background:var(--surface2);color:var(--text);font-size:12px;font-family:'Poppins',sans-serif;">
              <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                <select id="raw-edit-result-${e.id}" style="padding:5px 8px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:12px;font-family:'Poppins',sans-serif;">
                  <option value="miss" ${curResult==='miss'?'selected':''}>✗ Failed</option>
                  <option value="landed" ${curResult==='landed'?'selected':''}>✓ Landed</option>
                  <option value="perfect" ${curResult==='perfect'?'selected':''}>⭐ Stomped</option>
                </select>
                <button onclick="saveRawEdit(${e.id})" style="padding:5px 12px;border-radius:6px;background:#39c3d4;border:none;color:#060f1a;font-size:12px;font-weight:700;cursor:pointer;font-family:'Poppins',sans-serif;">Save</button>
                <button onclick="cancelRawEdit()" style="padding:5px 12px;border-radius:6px;background:none;border:1px solid var(--border);color:var(--muted);font-size:12px;cursor:pointer;font-family:'Poppins',sans-serif;">Cancel</button>
              </div>
            </div>` : '';
          return `
          <div id="ev-raw-row-${e.id}" style="display:grid;grid-template-columns:60px 36px 48px 1fr 80px 28px 28px;align-items:center;gap:8px;padding:8px 14px;border-top:1px solid var(--border);font-size:11px;${isEditing?'background:rgba(57,195,212,0.06);':''};flex-wrap:wrap;">
            <span style="color:var(--muted);">${fmtDate(e.datum)}</span>
            <span style="color:var(--muted);font-size:10px;">${ts}</span>
            <span style="color:var(--muted);font-size:10px;">${typShort(e.typ)}</span>
            <span style="color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${normSbTrick(e.trickaufbau||'')}">${normSbTrick(e.trickaufbau||'—')}</span>
            <span>${resultBadge(e)}</span>
            <button onclick="editRawEntry(${e.id})" title="Edit entry"
              style="background:none;border:1px solid ${isEditing?'#39c3d4':'var(--border)'};border-radius:6px;color:${isEditing?'#39c3d4':'var(--muted)'};cursor:pointer;font-size:11px;padding:2px 5px;line-height:1;">✏</button>
            <button onclick="deleteRawEntry(${e.id})" title="Delete entry"
              style="background:none;border:1px solid #e2001a33;border-radius:6px;color:#e2001a;cursor:pointer;font-size:13px;padding:2px 6px;line-height:1;">🗑</button>
            ${editForm}
          </div>`;
        }).join('')
        : '<div style="padding:16px;text-align:center;color:var(--muted);font-size:12px;">No entries for this selection.</div>'}
      </div>
    </div>`;
}

function syncTrickNameLocally(dbId, newTrick) {
  const i = dbAllTricks.findIndex(t => t.id === dbId);
  if (i >= 0) dbAllTricks[i].trickaufbau = newTrick;
  const j = _sbTaData.findIndex(t => t.id === dbId);
  if (j >= 0) _sbTaData[j].trickaufbau = normSbTrick(newTrick);
  sessLog.forEach(e => { if (e.dbId === dbId) e.trick = newTrick; });
}

let _sbRawEditId = null;

function editRawEntry(id) {
  _sbRawEditId = _sbRawEditId === id ? null : id;
  renderTrickAnalytics();
}

function cancelRawEdit() {
  _sbRawEditId = null;
  renderTrickAnalytics();
}

async function saveRawEdit(id) {
  const trickInput = document.getElementById('raw-edit-trick-'+id);
  const newTrick = trickInput ? trickInput.value.trim() : '';
  const resultSel = document.getElementById('raw-edit-result-'+id);
  const newResult = resultSel ? resultSel.value : '';
  if (!newTrick) { showToast('Trick name cannot be empty', 'error'); return; }

  const gesamt = newResult==='miss'?3:newResult==='landed'?7:10;
  const {error} = await db.from('tricks').update({
    trickaufbau: newTrick,
    gesamt, ausfuehrung:gesamt, landung:gesamt, setup:gesamt,
    gelandet: newResult==='miss'?'No':'Yes'
  }).eq('id', id);
  if (error) { showToast('Error: '+error.message, 'error'); return; }

  syncTrickNameLocally(id, newTrick);
  _sbRawEditId = null;
  renderTrickAnalytics();
  renderSessionLog();
  saveSessionState();
  showToast('Entry updated', 'success');
}

async function deleteRawEntry(id) {
  if (!confirm('Delete this entry? This cannot be undone.')) return;
  const row = document.getElementById('ev-raw-row-'+id);
  if (row) row.style.opacity = '0.4';
  const { error } = await db.from('tricks').delete().eq('id', id);
  if (error) { alert('Error: '+error.message); if(row) row.style.opacity='1'; return; }
  _sbTaData = _sbTaData.filter(t => t.id !== id);
  if (row) row.remove();
  const wrap = document.getElementById('ev-raw-wrap');
  if (wrap) {
    const remaining = wrap.querySelectorAll('[id^="ev-raw-row-"]').length;
    const btn = wrap.querySelector('button');
    if (btn) { const sp = btn.querySelector('span'); if(sp) { const child = sp.childNodes[1]; if(child) child.textContent = ` Raw Entries (${remaining})`; } }
  }
  renderTrickAnalytics();
}

let _sbPerfTypeFilter = '';

let _sbPfCustomFrom = '', _sbPfCustomTo = '';

function showPerfTip(e, text) {
  let tt = document.getElementById('perf-tooltip');
  if (!tt) {
    tt = document.createElement('div');
    tt.id = 'perf-tooltip';
    tt.style.cssText = 'position:fixed;background:#0d1f33;border:1px solid #39c3d4;border-radius:8px;padding:8px 12px;font-size:12px;font-family:Poppins,sans-serif;pointer-events:none;z-index:9999;max-width:320px;box-shadow:0 4px 16px rgba(0,0,0,0.5);';
    document.body.appendChild(tt);
  }
  const parts = text.split(' | ');
  tt.innerHTML = `<div style="font-weight:700;color:#e8edf2;margin-bottom:4px;">${parts[0]||''}</div>
    <div style="color:var(--muted);font-size:11px;">${parts[1]||''}</div>`;
  tt.style.display = 'block';
  const tx = e.clientX+14, ty = e.clientY-10;
  tt.style.left = (tx+tt.offsetWidth > window.innerWidth-10 ? e.clientX-tt.offsetWidth-14 : tx)+'px';
  tt.style.top  = ty+'px';
}

function hidePerfTip() {
  const tt = document.getElementById('perf-tooltip');
  if (tt) tt.style.display = 'none';
}

function setPerfFilter(typ) {
  _sbPerfTypeFilter = typ;
  const map = {'':'pf-all','Landing Bag':'pf-bag','Jump On-Snow':'pf-jump','Big Air Competition':'pf-comp'};
  Object.values(map).forEach(id=>{
    const b=document.getElementById(id); if(!b) return;
    b.style.background='var(--surface2)'; b.style.borderColor='var(--border)'; b.style.color='var(--muted)';
  });
  const act=document.getElementById(map[typ]||'pf-all');
  if(act){act.style.background='rgba(57,195,212,0.2)';act.style.borderColor='#39c3d4';act.style.color='#39c3d4';}
  renderSessionPerformance();
}

function onPfSeasonChange() {
  const sel = document.getElementById('pf-season')?.value;
  const rangeDiv = document.getElementById('pf-custom-range');
  if (rangeDiv) rangeDiv.style.display = sel === 'custom' ? 'flex' : 'none';
  if (sel !== 'custom') {
    _sbPfCustomFrom = ''; _sbPfCustomTo = '';
    renderSessionPerformance();
  }
}

function setPerfDateRange() {
  const f = document.getElementById('pf-from')?.value || '';
  const t = document.getElementById('pf-to')?.value   || '';
  _sbPfCustomFrom = parsePerfDate(f);
  _sbPfCustomTo   = parsePerfDate(t);
  [['pf-from',_sbPfCustomFrom],['pf-to',_sbPfCustomTo]].forEach(([id,parsed])=>{
    const el=document.getElementById(id); if(!el) return;
    el.style.borderColor = parsed ? '#39c3d4' : 'var(--border)';
    el.style.color       = parsed ? '#39c3d4' : 'var(--muted)';
  });
  renderSessionPerformance();
}

function clearPerfDateRange() {
  _sbPfCustomFrom = ''; _sbPfCustomTo = '';
  ['pf-from','pf-to'].forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    el.value=''; el.style.borderColor='var(--border)'; el.style.color='var(--muted)';
  });
  renderSessionPerformance();
}

function getSeasonRange() {
  const sel = document.getElementById('pf-season')?.value || 'current';
  if (sel === 'custom') return { from: _sbPfCustomFrom, to: _sbPfCustomTo };
  const now = new Date();
  const yr = now.getFullYear();
  const mo = now.getMonth()+1;
  const seasonStart = mo >= 5 ? yr : yr-1;
  if (sel === 'current') return { from: `${seasonStart}-05-01`, to: `${seasonStart+1}-04-30` };
  if (sel === 'last')    return { from: `${seasonStart-1}-05-01`, to: `${seasonStart}-04-30` };
  return { from: '', to: '' };
}


function renderSessionPerformance() {
  const el = document.getElementById('perf-table');
  if (!el || !dbAllTricks) return;

  const DIRS = ['Frontside','Backside','Switch Frontside','Switch Backside'];
  const DIR_COL = {'Frontside':'#39c3d4','Backside':'#f59e0b','Switch Frontside':'#a78bfa','Switch Backside':'#4a7dd6'};

  function status(landPct, avgQ) {
    if (landPct >= 70 && avgQ >= 70) return {icon:'🟢', label:'Ready', color:'#34d399'};
    if (landPct >= 50 || avgQ  >= 50) return {icon:'🟡', label:'Developing', color:'#f59e0b'};
    return {icon:'🔴', label:'Not ready', color:'#e2001a'};
  }

  function extractRotation(name) {
    if (!name) return 0;
    const m = name.match(/\b(180|270|360|450|540|630|720|810|900|1080|1260|1440)\b/);
    return m ? parseInt(m[1]) : 0;
  }

  const { from, to } = getSeasonRange();
  let data = dbAllTricks.filter(t => t.trickaufbau && t.athlet);
  if (_sbPerfTypeFilter) data = data.filter(t => t.typ === _sbPerfTypeFilter);
  if (from) data = data.filter(t => t.datum && t.datum >= from);
  if (to)   data = data.filter(t => t.datum && t.datum <= to);

  if (!data.length) {
    el.innerHTML = '<div style="color:var(--muted);text-align:center;padding:24px;font-size:13px;">No session data for this period / filter.</div>';
    return;
  }

  // Build per-athlete, per-trick summary (normalize trick names first)
  const athTricks = {};
  data.forEach(t => {
    const a = t.athlet;
    const trick = normSbTrick(t.trickaufbau || '');
    const dir = trickDir(trick);
    if (!athTricks[a]) athTricks[a] = {};
    if (!athTricks[a][trick]) athTricks[a][trick] = {att:0, land:0, stomped:0, rot:extractRotation(trick), dir};
    const s = athTricks[a][trick];
    s.att++;
    if (t.gelandet==='Yes') s.land++;
    if ((t.gesamt||0) >= 10) s.stomped++;
  });

  const athList = Object.keys(athTricks).sort();

  const bkg  = {'🟢':'rgba(52,211,153,0.12)','🟡':'rgba(245,158,11,0.1)','🔴':'rgba(226,0,26,0.08)'};
  const brd  = {'🟢':'rgba(52,211,153,0.4)', '🟡':'rgba(245,158,11,0.4)','🔴':'rgba(226,0,26,0.3)'};

  // Traffic light for SB: based on Landing% only (Stomped = extra info, same weight as Landed)
  function sbPerfStatus(landPct) {
    if (landPct >= 70) return {icon:'🟢', label:'Ready'};
    if (landPct >= 50) return {icon:'🟡', label:'Developing'};
    return {icon:'🔴', label:'Not ready'};
  }

  el.innerHTML = `
    <div style="font-size:11px;color:var(--muted);margin-bottom:14px;">
      <span>All recorded tricks per athlete, grouped by direction</span>
    </div>
    <div>
      ${athList.map(athlet => {
        const tricks = athTricks[athlet];

        const byDir = {};
        DIRS.forEach(d => byDir[d] = []);
        Object.entries(tricks).forEach(([trick, s]) => {
          const d = s.dir || 'Other';
          if (!byDir[d]) byDir[d] = [];
          byDir[d].push([trick, s]);
        });

        DIRS.forEach(d => {
          byDir[d].sort(([,a],[,b]) => {
            const lA=a.att?Math.round(a.land/a.att*100):0;
            const lB=b.att?Math.round(b.land/b.att*100):0;
            return lB-lA || b.rot-a.rot;
          });
        });

        const dirBlocks = DIRS.map(d => {
          const entries = byDir[d];
          return `<div style="flex:1;min-width:200px;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${DIR_COL[d]};margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid ${DIR_COL[d]}33;">${d}</div>
            ${entries.length ? entries.map(([trick, s]) => {
              const landPct    = s.att ? Math.round(s.land/s.att*100) : 0;
              const landedOnly = s.land - s.stomped;
              const st  = sbPerfStatus(landPct);
              const colL = landPct>=70?'#34d399':landPct>=50?'#f59e0b':'#e2001a';
              const failed = s.att - s.land;
              return `<div style="background:${bkg[st.icon]};border:1px solid ${brd[st.icon]};border-radius:8px;padding:6px 10px;margin-bottom:5px;">
                <div style="font-size:12px;color:var(--text);">${normSbTrick(trick)}</div>
                <div style="display:flex;align-items:center;gap:8px;margin-top:4px;font-size:11px;font-weight:700;flex-wrap:wrap;">
                  <span style="color:${colL};">${landPct}%</span>
                  <span style="color:#e2001a;">F&nbsp;${failed}</span>
                  <span style="color:#34d399;">L&nbsp;${landedOnly}</span>
                  <span style="color:#39c3d4;">S&nbsp;${s.stomped}</span>
                  <span style="color:var(--muted);font-weight:400;">/ ${s.att}</span>
                </div>
              </div>`;
            }).join('') : `<div style="color:var(--muted);font-size:11px;padding:6px 0;">—</div>`}
          </div>`;
        }).join('');

        return `<div style="padding:16px 0;border-bottom:1px solid var(--border);">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:14px;">${athlet}</div>
          <div class="perf-dir-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;">
            ${dirBlocks}
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

async function realityCheck() {
  if (!dbAllTricks || !dbAllStandort) { showToast('Load data first', 'error'); return; }

  const { from } = getSeasonRange();
  const seasonFrom = from || new Date(Date.now()-365*24*3600*1000).toISOString().split('T')[0];

  const mastered = dbAllStandort.filter(t => t.status === 'mastered' && t.athlet);
  const flagged = [];

  // Entries with a grab-status matrix are handled grab-by-grab below
  const hasMatrix = s => s.grab_status && typeof s.grab_status === 'object' && Object.keys(s.grab_status).length;
  const legacyGrabsOf = s => s.grab ? s.grab.split(',').map(x=>x.trim()).filter(Boolean) : [];

  mastered.forEach(s => {
    const dir = s.drehrichtung?.trim();
    const rot = s.rotation ? String(s.rotation).match(/\d+/)?.[0] : null;
    if (!dir || !rot) return;
    if (hasMatrix(s)) return;
    const legacyGrabs = legacyGrabsOf(s);

    const sessions = dbAllTricks.filter(t =>
      t.athlet === s.athlet &&
      t.datum >= seasonFrom &&
      t.trickaufbau &&
      t.trickaufbau.includes(rot) &&
      (!legacyGrabs.length || legacyGrabs.some(g => t.trickaufbau.includes(' — ' + g)))
    );

    if (!sessions.length) {
      flagged.push({ ...s, action: 'downgrade', reason: 'Not attempted this season', avgQ: null, sessions: 0 });
      return;
    }

    const quals = sessions.map(t => extractQuality(t)).filter(v => v !== null);
    if (!quals.length) return;
    const avgQ = Math.round(quals.reduce((a,b)=>a+b,0)/quals.length);

    if (avgQ < 70) {
      const landRate = Math.round(sessions.filter(t=>t.gelandet==='Yes').length/sessions.length*100);
      flagged.push({ ...s, action: 'downgrade', reason: `Avg quality ${avgQ}% (<70%)`, avgQ, sessions: sessions.length, landRate });
    }
  });

  // Upgrade candidates: goals performing ≥70% in sessions → suggest Learned
  dbAllStandort.filter(t => t.status === 'goal' && t.athlet).forEach(s => {
    const rot = s.rotation ? String(s.rotation).match(/\d+/)?.[0] : null;
    if (!s.drehrichtung?.trim() || !rot) return;
    if (hasMatrix(s)) return;
    const legacyGrabs = legacyGrabsOf(s);
    const sessions = dbAllTricks.filter(t =>
      t.athlet === s.athlet && t.datum >= seasonFrom && t.trickaufbau && t.trickaufbau.includes(rot) &&
      (!legacyGrabs.length || legacyGrabs.some(g => t.trickaufbau.includes(' — ' + g))));
    if (!sessions.length) return;
    const quals = sessions.map(t => extractQuality(t)).filter(v => v !== null);
    if (!quals.length) return;
    const avgQ = Math.round(quals.reduce((a,b)=>a+b,0)/quals.length);
    if (avgQ >= 70) {
      flagged.push({ ...s, action: 'upgrade', reason: `Avg quality ${avgQ}% (≥70%) → Learned`, avgQ, sessions: sessions.length });
    }
  });

  // Grab-level suggestions from grab-status matrices (per trick+grab)
  dbAllStandort.filter(t => t.athlet && hasMatrix(t)).forEach(s => {
    const rot = s.rotation ? String(s.rotation).match(/\d+/)?.[0] : null;
    if (!rot) return;
    Object.entries(s.grab_status).forEach(([g, st]) => {
      if (st !== 'mastered' && st !== 'goal') return;
      const sessions = dbAllTricks.filter(t =>
        t.athlet === s.athlet && t.datum >= seasonFrom && t.trickaufbau &&
        t.trickaufbau.includes(rot) && t.trickaufbau.includes(' — ' + g));
      if (!sessions.length) {
        if (st === 'mastered') flagged.push({ ...s, grabName: g, action: 'downgrade-grab', reason: `${g}: not attempted this season`, avgQ: null, sessions: 0 });
        return;
      }
      const quals = sessions.map(t => extractQuality(t)).filter(v => v !== null);
      if (!quals.length) return;
      const avgQ = Math.round(quals.reduce((a,b)=>a+b,0)/quals.length);
      if (st === 'mastered' && avgQ < 70)  flagged.push({ ...s, grabName: g, action: 'downgrade-grab', reason: `${g}: avg quality ${avgQ}% (<70%)`, avgQ, sessions: sessions.length });
      if (st === 'goal' && avgQ >= 70)     flagged.push({ ...s, grabName: g, action: 'upgrade-grab', reason: `${g}: avg quality ${avgQ}% (≥70%) → Learned`, avgQ, sessions: sessions.length });
    });
  });

  if (!flagged.length) {
    showToast('✅ Assessment matches session data — nothing to change!', 'success');
    return;
  }

  const byAthlet = {};
  flagged.forEach(f => {
    if (!byAthlet[f.athlet]) byAthlet[f.athlet] = [];
    byAthlet[f.athlet].push(f);
  });
  const athletes = Object.keys(byAthlet).sort();

  function rcTrickDesc(f) {
    const label = f.trick_label
      ? f.trick_label
      : ([f.drehrichtung, f.flips, f.achse, f.rotation ? f.rotation+'°' : null, f.grab].filter(Boolean).join(' ') || '—');
    return f.grabName ? label + ' — ' + f.grabName : label;
  }

  window._rcFlagged = flagged;

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:#0d1f33;border:1px solid var(--border);border-radius:16px;padding:24px;max-width:660px;width:100%;max-height:88vh;display:flex;flex-direction:column;">
      <div style="font-family:Poppins,sans-serif;font-size:18px;font-weight:700;color:var(--text);margin-bottom:4px;">🔍 Reality Check</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:14px;">
        Session data since ${seasonFrom.split('-').reverse().join('.')} · ${flagged.length} suggestion${flagged.length!==1?'s':''} (Learned &lt;70% ↓ · Goals ≥70% ↑) · select athletes to apply
      </div>
      <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center;">
        <input id="rc-search" type="text" placeholder="Search athlete…" oninput="rcFilter(this.value)"
          style="flex:1;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:12px;font-family:Poppins,sans-serif;">
        <button onclick="document.querySelectorAll('.rc-chk').forEach(c=>c.checked=true)"  style="padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;font-family:Poppins,sans-serif;border:1px solid var(--border);background:var(--surface2);color:var(--muted);white-space:nowrap;">✓ All</button>
        <button onclick="document.querySelectorAll('.rc-chk').forEach(c=>c.checked=false)" style="padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;font-family:Poppins,sans-serif;border:1px solid var(--border);background:var(--surface2);color:var(--muted);white-space:nowrap;">✗ None</button>
      </div>
      <div id="rc-list" style="overflow-y:auto;flex:1;margin-bottom:14px;">
        ${athletes.map(athlet => `
          <div class="rc-ath-row" data-name="${athlet.toLowerCase()}" style="border:1px solid var(--border);border-radius:10px;margin-bottom:8px;overflow:hidden;">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 14px;background:var(--surface2);">
              <input type="checkbox" class="rc-chk" data-athlet="${athlet}" checked
                style="width:15px;height:15px;accent-color:#f59e0b;cursor:pointer;flex-shrink:0;">
              <span style="font-size:13px;font-weight:700;color:var(--text);flex:1;">${athlet}</span>
              <span style="font-size:11px;color:var(--muted);">${byAthlet[athlet].length} trick${byAthlet[athlet].length!==1?'s':''} affected</span>
            </label>
            ${byAthlet[athlet].map(f=>`
              <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start;padding:7px 14px 7px 38px;border-top:1px solid var(--border);">
                <div>
                  <div style="font-size:12px;color:var(--text);font-weight:500;">${rcTrickDesc(f)}</div>
                  ${f.disziplin?`<div style="font-size:10px;color:var(--muted);margin-top:1px;">${f.disziplin}</div>`:''}
                </div>
                <span style="font-size:11px;color:${f.action.startsWith('upgrade')?'#34d399':'#f59e0b'};white-space:nowrap;font-weight:600;">${f.action.startsWith('upgrade')?'↑':'↓'} ${f.reason}</span>
              </div>`).join('')}
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;border-top:1px solid var(--border);padding-top:14px;">
        <button onclick="this.closest('[style*=inset]').remove()" style="padding:8px 18px;border-radius:8px;font-family:Poppins,sans-serif;font-size:13px;cursor:pointer;border:1px solid var(--border);background:var(--surface2);color:var(--muted);">Cancel</button>
        <button onclick="applyRealityCheckSelected(window._rcFlagged,this)" style="padding:8px 18px;border-radius:8px;font-family:Poppins,sans-serif;font-size:13px;font-weight:600;cursor:pointer;border:none;background:#f59e0b;color:#000;">Apply selected</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function applyRealityCheckSelected(flagged, btn) {
  const checked = [...document.querySelectorAll('.rc-chk:checked')].map(c => c.dataset.athlet);
  if (!checked.length) { showToast('No athletes selected', 'error'); return; }
  const sel = flagged.filter(f => checked.includes(f.athlet));
  const downIds = sel.filter(f => f.action === 'downgrade').map(f => f.id);
  const upIds   = sel.filter(f => f.action === 'upgrade').map(f => f.id);
  const grabSel = sel.filter(f => f.action === 'downgrade-grab' || f.action === 'upgrade-grab');
  if (!downIds.length && !upIds.length && !grabSel.length) { showToast('No entries to update', 'error'); return; }
  btn.textContent = 'Applying…'; btn.disabled = true;
  let error = null;
  if (downIds.length) ({ error } = await db.from('standort').update({status:'goal'}).in('id', downIds));
  if (!error && upIds.length) ({ error } = await db.from('standort').update({status:'mastered'}).in('id', upIds));
  if (!error && grabSel.length) {
    const byId = {};
    grabSel.forEach(f => {
      if (!byId[f.id]) byId[f.id] = {...((dbAllStandort.find(e => e.id === f.id) || {}).grab_status || {})};
      byId[f.id][f.grabName] = f.action === 'upgrade-grab' ? 'mastered' : 'goal';
    });
    for (const [id, gs] of Object.entries(byId)) {
      ({ error } = await db.from('standort').update({grab_status: gs}).eq('id', id));
      if (error) break;
    }
  }
  if (error) { showToast('Error: '+error.message, 'error'); btn.textContent='Apply selected'; btn.disabled=false; return; }
  btn.closest('[style*=inset]').remove();
  showToast(`✅ ${downIds.length} → Goal · ${upIds.length} → Learned · ${grabSel.length} grab update${grabSel.length!==1?'s':''} (${checked.length} athlete${checked.length!==1?'s':''})`, 'success');
  loadDB();
}


const SB_HP_GRABS = ['Bloody Dracula', 'Canadian Bacon', 'Chicken Salad', 'Cookie Monster', 'Crail', 'Crooked Cop', 'Cross Rocket', 'Double Tail', 'Dracula Method', 'Drunk Driver', 'Freshfish', 'Frontside', 'Indy', 'Japan', 'Lien', 'Melon', 'Method', 'Nose', 'Nuclear', 'Nuclear Method', 'Reach Around', 'Roast Beef', 'Rocket Air', 'Rusty Trombone', 'Sad Air', 'Seat Belt', 'Slob', 'Spaghetti', 'Stalefish', 'Stelmasky', 'Stink Bug', 'Suitcase', 'Swiss Cheese', 'Tai Pan', 'Tail', 'Truck Driver', 'Tuck Knee', 'Weddle (Mute)'];
const SB_JUMP_GRABS = ['Canadian Bacon', 'Chicken Salad', 'Crail', 'Double Japan', 'Double Nose', 'Double Tail', 'Drunk Driver', 'Indy', 'Japan', 'Melon', 'Method', 'Nose', 'Roast Beef', 'Rocket Air', 'Rusty Trombone', 'Seat Belt', 'Stalefish', 'Tai Pan', 'Tail', 'Truck Driver', 'Tuck Knee', 'Weddle (Mute)'];

function assessGrabList(disziplin) {
  return disziplin === 'Halfpipe' ? SB_HP_GRABS : SB_JUMP_GRABS;
}

let sbAssessGrabMatrix = {};

function initStandortGrabs() {
  const wrap = document.getElementById('sb-grab-wrap');
  const hid  = document.getElementById('sb-grab');
  if (!wrap || !hid) return;
  const grabs = assessGrabList(document.getElementById('sb-disziplin')?.value || '');
  Array.from(wrap.querySelectorAll('button')).forEach(b => b.remove());
  hid.value = '';
  sbAssessGrabMatrix = {};
  grabs.forEach(g => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.dataset.grab = g;
    styleAssessGrabBtn(btn, g, undefined);
    btn.onclick = () => {
      const next = nextGrabState(sbAssessGrabMatrix[g]);
      if (next) sbAssessGrabMatrix[g] = next; else delete sbAssessGrabMatrix[g];
      styleAssessGrabBtn(btn, g, next);
    };
    wrap.appendChild(btn);
  });
}

// ═══════════════ MONITORING (Team → Athlete → Trick) ═══════════════

const SB_MON_STATUS = {
  ready:    {label:'Ready',    color:'#34d399'},
  building: {label:'Building', color:'#f59e0b'},
  critical: {label:'Critical', color:'#e2001a'},
  lowdata:  {label:'Low data', color:'#6b8299'},
};
const SB_MON_DIR_COLORS = {'Frontside':'#39c3d4','Backside':'#f59e0b','Switch Frontside':'#a78bfa','Switch Backside':'#4a7dd6','Other':'#6b8299'};

function sbMonOutcome(t) {
  if (t.outcome === 'stomped' || t.outcome === 'landed' || t.outcome === 'failed') return t.outcome;
  if ((t.gesamt||0) >= 10) return 'stomped';
  return t.gelandet === 'Yes' ? 'landed' : 'failed';
}

function sbMonKey(label) {
  // Grab-Anteil komplett strippen — auch Kombis wie « — Tail to Weddle (Mute)»,
  // damit alle Varianten eines Tricks auf der Athlet:innen-Ebene EINE Karte ergeben
  const n = normSbTrick((label || '—').split(' — ')[0]);
  // «SH »-Präfix (Side Hit) schützen, sonst strippt baseLabel die Direction als Grab
  const shPre = n.startsWith('SH ') ? 'SH ' : '';
  const m = shPre ? n.slice(3) : n;
  const dirs = ['Switch Backside','Switch Frontside','Frontside','Backside','Cab'];
  for (const d of dirs) if (m.startsWith(d + ' ')) return (shPre + d + ' ' + baseLabel(m.slice(d.length + 1))).trim();
  // Richtung mitten im Label (Hardway/Nosebutter/N'Ollie …) schützen: «Frontside» ist
  // auch ein Grab-Name — wenn baseLabel die Richtung wegfressen würde, Label behalten
  const stripped = baseLabel(m) || m;
  const kept = (trickDir(m) && !trickDir(stripped)) ? m : stripped;
  return (shPre + kept).trim() || n;
}

async function sbMonFetchAll() {
  let all = [], from = 0;
  while (true) {
    const {data, error} = await db.from('tricks').select('*').order('id', {ascending:true}).range(from, from + 999);
    if (error) { showToast('Error loading data: ' + error.message, 'error'); return sbMonRows || []; }
    all = all.concat(data || []);
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  sbMonRows = all;
  return all;
}


function sbMonStatusKey(att, stomped) {
  if (att < 5) return 'lowdata';
  const r = stomped / att;
  return r >= 0.7 ? 'ready' : r >= 0.4 ? 'building' : 'critical';
}

function sbMonTrickAgg(rows) {
  const map = {};
  rows.forEach(t => {
    const key = sbMonKey(t.trickaufbau);
    if (!map[key]) map[key] = {trick:key, att:0, stomped:0, landed:0, failed:0, rows:[]};
    const m = map[key];
    m.att++; m[sbMonOutcome(t)]++; m.rows.push(t);
  });
  return Object.values(map);
}

function sbMonTrend(rows, isHit) {
  const hit = isHit || (x => sbMonOutcome(x) === 'stomped');
  const by = {};
  rows.forEach(t => { const d = t.datum || '?'; (by[d] = by[d] || []).push(t); });
  const dates = Object.keys(by).sort();
  if (dates.length < 2) return null;
  const rate = d => by[d].filter(hit).length / by[d].length;
  const last = rate(dates[dates.length - 1]);
  const prev = dates.slice(0, -1).slice(-3);
  const prevAvg = prev.reduce((a, d) => a + rate(d), 0) / prev.length;
  const diff = last - prevAvg;
  if (diff >= 0.05) return {dir:'up', diff};
  if (diff <= -0.05) return {dir:'down', diff};
  return {dir:'flat', diff};
}


function sbMonDonut(s, l, f, size) {
  const total = s + l + f;
  const stroke = 14, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  if (!total) return sbMonRing(0, 'var(--border)', size, stroke);
  const segs = [[s, '#34d399'], [l, '#4a7dd6'], [f, '#e2001a']];
  let off = 0, out = '';
  segs.forEach(([n, col]) => {
    if (!n) return;
    const frac = n / total;
    out += `<circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="${col}" stroke-width="${stroke}" fill="none"
      stroke-dasharray="${(frac * c).toFixed(1)} ${(c - frac * c).toFixed(1)}" stroke-dashoffset="${(-off * c).toFixed(1)}"/>`;
    off += frac;
  });
  return `<svg width="${size}" height="${size}" style="transform:rotate(-90deg);">${out}</svg>`;
}

async function loadMonitoring() {
  const root = document.getElementById('mon-root');
  if (!root) return;
  if (!sbMonRows) root.innerHTML = '<div class="loading"><span class="spinner"></span></div>';
  await sbMonFetchAll();
  renderMonitoring();
}

// Sync the Database-page period selects with Monitoring's choice, then reuse the existing exports

async function sbMonEnsureDbData() {
  if (!dbAllTricks || !dbAllTricks.length || !dbAllStandort || !dbAllStandort.length) await loadDB();
}

async function sbMonRealityCheck() {
  await sbMonEnsureDbData();
  realityCheck();
}

async function sbMonTeamPdf() {
  await sbMonEnsureDbData();
  sbMonSyncSelects('tr');
  openTeamPdfReport();
}

async function sbMonAthletePdf() {
  await sbMonEnsureDbData();
  populateAthleteReportDropdown();
  const sel = document.getElementById('ar-athlete-sel');
  if (sel) sel.value = sbMonView.athlete || '';
  sbMonSyncSelects('ar');
  generateAthleteReport();
}

function monHeaderHtml(title, sub, backable) {
  const dateInput = id => `<input type="date" id="${id}" value="${id==='mon-date-from'?sbMonFrom:sbMonTo}" onchange="sbMonApplyCustom()" style="padding:7px 8px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:11px;font-family:'Poppins',sans-serif;">`;
  return `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px;">
    ${backable ? `<button onclick="sbMonBack()" style="padding:8px 14px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);color:var(--text);font-family:'Poppins',sans-serif;font-size:13px;font-weight:600;cursor:pointer;">← Back</button>` : ''}
    <div style="flex:1;min-width:160px;">
      <div style="font-size:20px;font-weight:800;color:var(--text);">${title}</div>
      ${sub ? `<div style="font-size:12px;color:var(--muted);">${sub}</div>` : ''}
    </div>
    <select onchange="sbMonSetRange(this.value)" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:12px;font-family:'Poppins',sans-serif;">
      <option value="season" ${sbMonRange==='season'?'selected':''}>Current season</option>
      <option value="last" ${sbMonRange==='last'?'selected':''}>Last season</option>
      <option value="all" ${sbMonRange==='all'?'selected':''}>All time</option>
      <option value="custom" ${sbMonRange==='custom'?'selected':''}>Custom period…</option>
    </select>
  </div>
  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
    ${sbTypeChipsHtml(sbMonTyp, 'sbMonSetTyp')}
    ${sbMonRange==='custom' ? `<div style="display:flex;align-items:center;gap:6px;">${dateInput('mon-date-from')}<span style="color:var(--muted);">–</span>${dateInput('mon-date-to')}</div>` : ''}
  </div>`;
}

function renderMonTeam() {
  const root = document.getElementById('mon-root');
  const rows = sbMonFiltered();
  const byAth = {};
  rows.forEach(t => { (byAth[t.athlet] = byAth[t.athlet] || []).push(t); });
  _monAthletes = SESS_ALL_ATHLETES.map(a => a.name);
  const sections = SESS_SQUADS.map(sq => {
    const aths = SESS_ALL_ATHLETES.filter(a => a.squad === sq.key);
    if (!aths.length) return '';
    const tiles = aths.map(a => {
      const i = _monAthletes.indexOf(a.name);
      const ar = byAth[a.name] || [];
      const att = ar.length;
      const stomped = ar.filter(t => sbMonOutcome(t) === 'stomped').length;
      const rate = att ? stomped / att : 0;
      const cnt = {ready:0, building:0, critical:0, lowdata:0};
      sbMonTrickAgg(ar).forEach(tr => cnt[sbMonStatusKey(tr.att, tr.stomped)]++);
      const initials = a.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
      const ringColor = att < 5 ? '#6b8299' : rate >= 0.7 ? '#34d399' : rate >= 0.4 ? '#f59e0b' : '#e2001a';
      return `<div onclick="sbMonOpenAthlete(${i})" style="background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:16px;cursor:pointer;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          <div style="width:34px;height:34px;border-radius:50%;background:rgba(57,195,212,0.15);color:#39c3d4;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">${initials}</div>
          <div style="min-width:0;">
            <div style="font-weight:700;font-size:13px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${a.name}</div>
            <div style="font-size:10px;color:${sq.color};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${sq.label}</div>
          </div>
        </div>
        <div style="display:flex;justify-content:center;position:relative;margin-bottom:12px;">
          ${sbMonRing(rate, ringColor, 92, 9)}
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
            <div style="font-size:17px;font-weight:800;color:var(--text);">${att ? Math.round(rate*100)+'%' : '—'}</div>
            <div style="font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;">Stomp rate</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;text-align:center;border-top:1px solid var(--border);padding-top:10px;">
          <div><div style="font-size:15px;font-weight:800;color:#34d399;">${cnt.ready}</div><div style="font-size:9px;color:var(--muted);">Ready</div></div>
          <div><div style="font-size:15px;font-weight:800;color:#f59e0b;">${cnt.building}</div><div style="font-size:9px;color:var(--muted);">Building</div></div>
          <div><div style="font-size:15px;font-weight:800;color:#e2001a;">${cnt.critical}</div><div style="font-size:9px;color:var(--muted);">Critical</div></div>
        </div>
        <div style="text-align:center;font-size:11px;color:#39c3d4;margin-top:10px;">View details →</div>
      </div>`;
    }).join('');
    return `<div style="margin-bottom:22px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${sq.color};margin-bottom:10px;">${sq.label}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;">${tiles}</div>
    </div>`;
  }).join('');
  root.innerHTML = `<div class="card" style="padding:20px;">
    ${monHeaderHtml('Team Monitoring', rows.length + ' attempts · ' + sbMonPeriodLabel(), false)}
    <div style="font-size:11px;color:var(--muted);margin-bottom:16px;">Trick status: ≥70% stomp rate = <b style="color:#34d399;">Ready</b> · 40–69% = <b style="color:#f59e0b;">Building</b> · &lt;40% = <b style="color:#e2001a;">Critical</b> · fewer than 5 attempts = Low data</div>
    ${sections || '<div style="color:var(--muted);padding:12px;">No athletes configured.</div>'}
    <div style="border-top:1px solid var(--border);margin-top:8px;padding-top:16px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
      <button onclick="sbMonRealityCheck()" style="padding:8px 16px;border-radius:8px;font-family:'Poppins',sans-serif;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #f59e0b;background:rgba(245,158,11,0.15);color:#f59e0b;">🔍 Reality Check</button>
      <button onclick="sbMonTeamPdf()" style="padding:8px 16px;border-radius:8px;font-family:'Poppins',sans-serif;font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:var(--surface2);color:var(--text);">📄 Team PDF</button>
    </div>
  </div>`;
}

function renderMonAthlete() {
  const root = document.getElementById('mon-root');
  const name = sbMonView.athlete;
  const rows = sbMonFiltered().filter(t => t.athlet === name);
  const att = rows.length;
  const stomped = rows.filter(t => sbMonOutcome(t) === 'stomped').length;
  const rate = att ? Math.round(stomped/att*100) : 0;

  // Direction balance (session attempts only)
  const dirOrderList = ['Frontside','Backside','Switch Frontside','Switch Backside','Other'];
  const dirCnt = {};
  rows.forEach(t => {
    const d = trickDir(sbMonKey(t.trickaufbau)) || 'Other';
    dirCnt[d] = (dirCnt[d]||0) + 1;
  });
  const balanceBar = att ? `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px;">
    <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:10px;">Direction balance — session data only</div>
    <div style="display:flex;height:12px;border-radius:999px;overflow:hidden;margin-bottom:10px;">
      ${dirOrderList.filter(d => dirCnt[d]).map(d => `<div style="width:${(dirCnt[d]/att*100).toFixed(1)}%;background:${SB_MON_DIR_COLORS[d]};"></div>`).join('')}
    </div>
    <div style="display:flex;gap:14px;flex-wrap:wrap;">
      ${dirOrderList.filter(d => dirCnt[d]).map(d => `<span style="font-size:11px;color:var(--text);"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${SB_MON_DIR_COLORS[d]};margin-right:5px;vertical-align:0;"></span>${d} <b style="color:${SB_MON_DIR_COLORS[d]};">${Math.round(dirCnt[d]/att*100)}%</b></span>`).join('')}
    </div>
  </div>` : '';

  const agg = sbMonTrickAgg(rows);
  _monTricks = agg;
  const groups = dirOrderList.map(dir => {
    const list = agg.map((tr, i) => ({...tr, _i: i})).filter(tr => (trickDir(tr.trick) || 'Other') === dir)
      .sort((a, b) => extractRotFromLabel(b.trick) - extractRotFromLabel(a.trick) || b.att - a.att);
    if (!list.length) return '';
    const cards = list.map(tr => {
      const st = sbMonStatusKey(tr.att, tr.stomped);
      const stInfo = SB_MON_STATUS[st];
      const r = tr.att ? Math.round(tr.stomped/tr.att*100) : 0;
      const rateCol = st==='lowdata' ? 'var(--muted)' : stInfo.color;
      const trend = sbMonTrend(tr.rows);
      return `<div onclick="sbMonOpenTrick(${tr._i})" style="background:var(--surface2);border:1px solid ${st==='critical' ? 'rgba(226,0,26,0.45)' : 'var(--border)'};border-radius:12px;padding:13px 14px;cursor:pointer;">
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:8px;line-height:1.3;">${tr.trick}</div>
        <div style="display:flex;gap:12px;align-items:center;">
          <div style="font-size:24px;font-weight:800;color:${rateCol};flex-shrink:0;">${r}%</div>
          <div style="flex:1;font-size:10px;color:var(--muted);line-height:1.7;">
            <div style="display:flex;justify-content:space-between;"><span>Total</span><b style="color:var(--text);">${tr.att}</b></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:#34d399;">Stomped</span><b style="color:#34d399;">${tr.stomped}</b></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:#4a7dd6;">Landed</span><b style="color:#4a7dd6;">${tr.landed}</b></div>
            <div style="display:flex;justify-content:space-between;"><span style="color:#e2001a;">Fail</span><b style="color:#e2001a;">${tr.failed}</b></div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:10px;">
          ${trend ? sbMonTrendHtml(trend) : '<span></span>'}
          <span style="color:${stInfo.color};font-weight:700;">${stInfo.label}</span>
        </div>
      </div>`;
    }).join('');
    return `<div style="margin-bottom:18px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${SB_MON_DIR_COLORS[dir]};margin-bottom:10px;">${dir}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;">${cards}</div>
    </div>`;
  }).join('');

  root.innerHTML = `<div class="card" style="padding:20px;">
    ${monHeaderHtml(name, att + ' attempts · ' + stomped + ' stomped · <b>' + rate + '% stomp rate</b> · ' + sbMonPeriodLabel(), true)}
    ${balanceBar}
    ${groups || '<div style="color:var(--muted);padding:12px;">No session attempts in this period.</div>'}
    <div style="border-top:1px solid var(--border);margin-top:8px;padding-top:16px;display:flex;justify-content:center;">
      <button onclick="sbMonAthletePdf()" style="padding:8px 16px;border-radius:8px;font-family:'Poppins',sans-serif;font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:var(--surface2);color:var(--text);">📄 Athlete Report (PDF)</button>
    </div>
  </div>`;
}

// Varianten & Grabs eines Kern-Tricks: volle Bezeichnung, Versuche, Stomp-Rate
function sbMonVariantsHtml(rows) {
  const map = {};
  rows.forEach(t => {
    const full = (t.trickaufbau || '—').trim();   // Roh-Label: enthält den Grab-Teil
    if (!map[full]) map[full] = {att:0, s:0, l:0, f:0};
    const m = map[full];
    m.att++; m[{stomped:'s', landed:'l', failed:'f'}[sbMonOutcome(t)]]++;
  });
  const list = Object.entries(map).sort((a,b) => b[1].att - a[1].att);
  // Auch bei nur EINER Variante anzeigen, wenn sie einen Grab trägt — sonst wäre er unsichtbar
  if (list.length < 2 && !list.some(([f]) => f.includes(' — '))) return '';
  const rowsHtml = list.map(([full, m]) => {
    const r = m.att ? Math.round(m.s/m.att*100) : 0;
    const col = m.att < 5 ? 'var(--muted)' : r >= 70 ? '#34d399' : r >= 40 ? '#f59e0b' : '#e2001a';
    const grab = full.includes(' — ') ? full.split(' — ').slice(1).join(' — ') : 'no grab';
    return `<div style="display:grid;grid-template-columns:1fr auto auto auto;gap:10px;align-items:center;padding:7px 0;border-top:1px solid var(--border);font-size:12px;">
      <span style="color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${full}">${grab}</span>
      <span style="color:var(--muted);font-size:11px;white-space:nowrap;">${m.att} att.</span>
      <span style="font-size:11px;white-space:nowrap;"><b style="color:#39c3d4;">${m.s}</b><span style="color:var(--muted);">/</span><b style="color:#34d399;">${m.l}</b><span style="color:var(--muted);">/</span><b style="color:#e2001a;">${m.f}</b></span>
      <b style="color:${col};min-width:38px;text-align:right;">${r}%</b>
    </div>`;
  }).join('');
  return `<div style="border-top:1px solid var(--border);margin-top:14px;padding-top:12px;">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;">
      <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:4px;">Variants &amp; grabs (${list.length})</div>
      <div style="font-size:9px;color:var(--muted);">Stomped/Landed/Failed · stomp rate</div>
    </div>
    ${rowsHtml}
  </div>`;
}

function renderMonTrick() {
  const root = document.getElementById('mon-root');
  const name = sbMonView.athlete, trick = sbMonView.trick;
  const rows = sbMonFiltered().filter(t => t.athlet === name && sbMonKey(t.trickaufbau) === trick)
    .sort((a, b) => (a.datum||'').localeCompare(b.datum||'') || (a.created_at||'').localeCompare(b.created_at||''));
  const s = rows.filter(t => sbMonOutcome(t) === 'stomped').length;
  const l = rows.filter(t => sbMonOutcome(t) === 'landed').length;
  const f = rows.filter(t => sbMonOutcome(t) === 'failed').length;
  const n = rows.length;
  const rate = n ? Math.round(s/n*100) : 0;
  const landedRate = n ? Math.round((s+l)/n*100) : 0;
  const stKey = sbMonStatusKey(n, s);
  const trend = sbMonTrend(rows);
  const trendLanded = sbMonTrend(rows, x => sbMonOutcome(x) !== 'failed');

  // KPI fulfillment (new data only)
  const kpiRows = rows.filter(t => t.kpis && sbMonOutcome(t) !== 'failed');
  const kpiChips = kpiRows.length
    ? SB_KPIS.map(([k, label]) => {
        const pct = Math.round(kpiRows.filter(t => t.kpis[k]).length / kpiRows.length * 100);
        const col = pct >= 80 ? '#34d399' : pct >= 50 ? '#f59e0b' : '#e2001a';
        return `<span style="border:1px solid ${col};color:${col};border-radius:999px;padding:4px 10px;font-size:11px;font-weight:600;">${label} ${pct}%</span>`;
      }).join(' ')
    : `<span style="font-size:11px;color:var(--muted);">No KPI data yet — fills up with new session logs</span>`;

  // Fail reasons + tendency
  const failRows = rows.filter(t => sbMonOutcome(t) === 'failed' && t.fail_grund);
  let failHtml = '';
  if (failRows.length) {
    const cnt = {};
    failRows.forEach(t => cnt[sbFailLabel(t.fail_grund)] = (cnt[sbFailLabel(t.fail_grund)]||0) + 1);
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    const half = Math.floor(failRows.length / 2) || 1;
    const early = failRows.slice(0, half).filter(t => sbFailLabel(t.fail_grund) === top[0]).length / half;
    const late = failRows.slice(half).filter(t => sbFailLabel(t.fail_grund) === top[0]).length / Math.max(1, failRows.length - half);
    const tend = failRows.length >= 4 ? (late < early - 0.15 ? ' · <span style="color:#34d399;">decreasing</span>' : late > early + 0.15 ? ' · <span style="color:#e2001a;">increasing</span>' : ' · stable') : '';
    failHtml = `<div style="font-size:11px;color:var(--muted);margin-top:10px;">Most common fail reason: <b style="color:#e2001a;">${top[0]}</b> (${top[1]}×)${tend}</div>`;
  }

  const kpiNote = n > kpiRows.length + f ? `<div style="font-size:10px;color:var(--muted);margin-top:6px;">KPI rates based on ${kpiRows.length} attempts with detail data (n=${n} total incl. legacy attempts).</div>` : '';

  root.innerHTML = `<div class="card" style="padding:20px;">
    ${monHeaderHtml(trick, name, true)}
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:14px;">
      <div style="display:flex;justify-content:flex-end;margin-bottom:4px;">
        ${stKey === 'ready' ? '<span style="border:1px solid #34d399;color:#34d399;border-radius:999px;padding:4px 12px;font-size:11px;font-weight:700;background:rgba(52,211,153,0.08);">Comp Ready</span>' : `<span style="border:1px solid ${SB_MON_STATUS[stKey].color};color:${SB_MON_STATUS[stKey].color};border-radius:999px;padding:4px 12px;font-size:11px;font-weight:700;">${SB_MON_STATUS[stKey].label}</span>`}
      </div>
      <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
        <div style="position:relative;flex-shrink:0;">
          ${sbMonDonut(s, l, f, 130)}
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
            <div style="font-size:26px;font-weight:800;color:var(--text);">${n}</div>
            <div style="font-size:9px;color:var(--muted);">attempts</div>
          </div>
        </div>
        <div style="flex:1;min-width:170px;font-size:12px;">
          <div style="display:flex;justify-content:space-between;padding:4px 0;"><span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#34d399;margin-right:6px;"></span>Stomped (5/5 KPI's)</span><b>${s}</b></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;"><span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#4a7dd6;margin-right:6px;"></span>Landed</span><b>${l}</b></div>
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);"><span><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:#e2001a;margin-right:6px;"></span>Failed</span><b>${f}</b></div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;"><span>Landed rate <span style="color:var(--muted);font-size:10px;">(Landed+Stomped)</span></span><span style="white-space:nowrap;"><b style="color:#34d399;">${landedRate}%</b>${trendLanded ? ' ' + sbMonTrendHtml(trendLanded) : ''}</span></div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:2px 0;"><span>Stomp rate</span><span style="white-space:nowrap;"><b style="color:${SB_MON_STATUS[stKey].color};">${rate}%</b>${trend ? ' ' + sbMonTrendHtml(trend) : ''}</span></div>
        </div>
      </div>
      <div style="border-top:1px solid var(--border);margin-top:14px;padding-top:12px;">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:8px;">KPI fulfillment (Landed + Stomped)</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">${kpiChips}</div>
        ${kpiNote}
        ${failHtml}
      </div>
      ${sbMonVariantsHtml(rows)}
    </div>
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:18px;">
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px;">Progress over sessions</div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:10px;color:var(--muted);margin-bottom:8px;">
        <span><span style="display:inline-block;width:10px;height:10px;background:#4a7dd6;border-radius:2px;vertical-align:-1px;"></span> Volume (attempts)</span>
        <span><span style="display:inline-block;width:14px;height:2px;background:#34d399;vertical-align:3px;"></span> Landed rate (Landed+Stomped)</span>
        <span><span style="display:inline-block;width:14px;height:2px;background:#f59e0b;vertical-align:3px;border-bottom:2px dashed #f59e0b;background:none;"></span> Stomp rate</span>
      </div>
      ${sbMonTimeChart(rows)}
      <div style="font-size:10px;color:var(--muted);margin-top:8px;">⚠ Sessions with fewer than 5 attempts — rates are statistically weak.</div>
      <div id="mon-time-detail" style="font-size:11px;color:var(--muted);min-height:16px;margin-top:8px;">Tap a bar for session details</div>
    </div>
    ${sbMonCoachingHtml(rows)}
  </div>`;
  sbMonLoadComments();
}

function sbMonTimeChart(rows) {
  const by = {};
  rows.forEach(t => { const d = t.datum || '?'; (by[d] = by[d] || []).push(t); });
  _monTimeBy = by;
  const dates = Object.keys(by).sort().slice(-12);
  if (!dates.length) return '<div style="color:var(--muted);font-size:12px;">No data.</div>';
  const H = 110, slot = 46, barW = 26, PAD = 34;
  const maxN = Math.max(...dates.map(d => by[d].length));
  const chartW = dates.length * slot;
  const yOf = p => H - p/100 * (H - 12);
  let grid = '';
  [0, 25, 50, 75, 100].forEach(p => {
    grid += `<line x1="${PAD}" y1="${yOf(p).toFixed(1)}" x2="${PAD + chartW}" y2="${yOf(p).toFixed(1)}" stroke="var(--border)" stroke-width="1" ${p ? 'stroke-dasharray="2 4"' : ''}/>`;
    grid += `<text x="${PAD - 5}" y="${(yOf(p) + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="#6b8299" font-family="Poppins,sans-serif">${p}%</text>`;
  });
  const sPts = [], stPts = [];
  let bars = '', labels = '';
  dates.forEach((d, i) => {
    const rs = by[d], nn = rs.length;
    const succ = rs.filter(x => sbMonOutcome(x) !== 'failed').length / nn;
    const st = rs.filter(x => sbMonOutcome(x) === 'stomped').length / nn;
    const h = Math.max(6, nn / maxN * (H - 12));
    const x = PAD + i * slot + (slot - barW) / 2;
    const cx = PAD + i * slot + slot/2;
    sPts.push([cx, (H - succ * (H - 12)).toFixed(1)]);
    stPts.push([cx, (H - st * (H - 12)).toFixed(1)]);
    bars += `<rect x="${x}" y="${(H - h).toFixed(1)}" width="${barW}" height="${h.toFixed(1)}" rx="3" fill="#4a7dd6" opacity="${(0.35 + 0.65 * nn / maxN).toFixed(2)}" style="cursor:pointer;" onclick="sbMonTimeSel('${d}')"/>`;
    bars += `<text x="${cx}" y="${(H - h - 3).toFixed(1)}" text-anchor="middle" font-size="8" fill="#4a7dd6" font-family="Poppins,sans-serif">${nn}</text>`;
    const lbl = d.length === 10 ? d.slice(8,10) + '.' + d.slice(5,7) + '.' : d;
    labels += `<text x="${cx}" y="${H + 15}" text-anchor="middle" font-size="9" fill="${nn < 5 ? '#f59e0b' : '#6b8299'}" font-family="Poppins,sans-serif">${lbl}${nn < 5 ? ' ⚠' : ''}</text>`;
  });
  const line = pts => pts.map(p => p.join(',')).join(' ');
  const axisTitle = `<text x="${PAD + chartW/2}" y="${H + 30}" text-anchor="middle" font-size="9" fill="#6b8299" font-family="Poppins,sans-serif" font-weight="600">Sessions</text>`;
  return `<div style="overflow-x:auto;"><svg width="${PAD + chartW}" height="${H + 36}" style="display:block;">
    ${grid}
    ${bars}
    ${dates.length > 1 ? `<polyline points="${line(sPts)}" fill="none" stroke="#34d399" stroke-width="2"/>
    <polyline points="${line(stPts)}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 3"/>` : ''}
    ${labels}
    ${axisTitle}
  </svg></div>`;
}

// ═══════ COACHING ANALYSIS (Trick-Detail, 3. Block) — regelbasiert, Basis letzte 3 Sessions ═══════
// Effizienz-Rate = Stomp-Rate pro Session (Entscheid Emilie 31.8.2026).
// «Current status» = neuester Kommentar (V1); LLM-Synthese via Edge Function ist Phase 2.
let _monTimeBy = {};

const MON_PLATEAU_TOL = 5; // Prozentpunkte über 3 Sessions — offener Parameter, an echten Daten testen


function sbMonCoachingHtml(rows) {
  const GREY = '#6b8299', AMBER = '#f59e0b', RED = '#e2001a';
  const sessions = sbMonSessions(rows);
  const nS = sessions.length;
  const srOf = s => s.rows.filter(x => sbMonOutcome(x) === 'stomped').length / s.rows.length;
  const avg = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0;
  const items = [];

  // 1 · Comp-readiness: alle 5 KPI ≥80% erfüllt über das 3-Session-Fenster (Landed+Stomped mit KPI-Daten)
  const kpiWindowOk = sess => {
    const atts = sess.flatMap(s => s.rows).filter(t => t.kpis && sbMonOutcome(t) !== 'failed');
    if (!atts.length) return false;
    return SB_KPIS.every(([k]) => atts.filter(t => t.kpis[k]).length / atts.length >= 0.8);
  };
  if (nS >= 3) {
    const nowOk = kpiWindowOk(sessions.slice(-3));
    const prevOk = nS >= 4 && kpiWindowOk(sessions.slice(Math.max(0, nS-6), nS-3));
    if (nowOk) items.push(['Comp-readiness', 'Reached', GREY]);
    else if (prevOk) items.push(['Comp-readiness', 'Lost — was reached before', RED]);
    else items.push(['Comp-readiness', 'Not reached', AMBER]);
  } else items.push(['Comp-readiness', `Not enough data (${nS}/3 sessions)`, GREY]);

  // 2 · Efficiency trend: Stomp-Rate letzte 3 vs. vorangehende (bis 3) Sessions
  if (nS >= 4) {
    const last = avg(sessions.slice(-3).map(srOf));
    const prev = avg(sessions.slice(Math.max(0, nS-6), nS-3).map(srOf));
    const diff = Math.round((last - prev) * 100);
    if (diff <= -5) items.push(['Efficiency trend', `Falling, ${diff}% (3 sessions)`, RED]);
    else if (diff >= 5) items.push(['Efficiency trend', `Rising, +${diff}% (3 sessions)`, GREY]);
    else items.push(['Efficiency trend', 'Stable (3 sessions)', GREY]);
  } else items.push(['Efficiency trend', `Not enough data (${nS}/4 sessions)`, GREY]);

  // 3 · Volume effect: Session-Volumen >150% des Trick-Schnitts UND Stomp-Rate unter Trick-Schnitt
  if (nS >= 3) {
    const avgVol = avg(sessions.map(s => s.rows.length));
    const avgSr = avg(sessions.map(srOf));
    const flagged = sessions.filter(s => s.rows.length > 1.5 * avgVol && srOf(s) < avgSr);
    if (flagged.length) items.push(['Volume effect', `Drops at high volume, cause unclear (${flagged.length}×)`, AMBER]);
    else items.push(['Volume effect', 'No volume effect', GREY]);
  } else items.push(['Volume effect', `Not enough data (${nS}/3 sessions)`, GREY]);

  // 4 · Plateau: Stomp-Rate-Spanne der letzten 3 Sessions unter Toleranzband
  if (nS >= 3) {
    const last3 = sessions.slice(-3).map(s => srOf(s) * 100);
    const range = Math.max(...last3) - Math.min(...last3);
    if (range < MON_PLATEAU_TOL) items.push(['Plateau', `Flat over last 3 sessions (±${Math.round(range)}%)`, AMBER]);
    else items.push(['Plateau', 'None, still moving', GREY]);
  } else items.push(['Plateau', `Not enough data (${nS}/3 sessions)`, GREY]);

  // 5 · Consistency: Streuung der Stomp-Rate über die letzten (bis 6) Sessions
  if (nS >= 3) {
    const vals = sessions.slice(-6).map(s => srOf(s) * 100);
    const m = avg(vals);
    const sd = Math.sqrt(avg(vals.map(v => (v - m) ** 2)));
    if (sd > 15) items.push(['Consistency', 'Irregular, session to session', AMBER]);
    else items.push(['Consistency', 'Consistent', GREY]);
  } else items.push(['Consistency', `Not enough data (${nS}/3 sessions)`, GREY]);

  // 6 · Most common fail: häufigster Fail-Grund der letzten 3 Sessions, mit Trendrichtung
  const last3Rows = sessions.slice(-3).flatMap(s => s.rows);
  const failCnt = {};
  last3Rows.forEach(t => { if (sbMonOutcome(t) === 'failed' && t.fail_grund) { const fl = sbFailLabel(t.fail_grund); failCnt[fl] = (failCnt[fl]||0) + 1; } });
  const top = Object.entries(failCnt).sort((a,b)=>b[1]-a[1])[0];
  if (top) {
    const prevRows = sessions.slice(Math.max(0, nS-6), nS-3).flatMap(s => s.rows);
    const shareNow = last3Rows.length ? top[1] / last3Rows.length : 0;
    const prevN = prevRows.filter(t => sbMonOutcome(t) === 'failed' && sbFailLabel(t.fail_grund) === top[0]).length;
    const sharePrev = prevRows.length ? prevN / prevRows.length : 0;
    const tend = prevRows.length < 3 ? '' : shareNow > sharePrev + 0.05 ? ', increasing' : shareNow < sharePrev - 0.05 ? ', decreasing' : ', stable';
    items.push(['Most common fail', `${top[0]} (${top[1]}×)${tend}`, tend === ', increasing' ? RED : AMBER]);
  } else items.push(['Most common fail', 'No fail pattern', GREY]);

  const grid = items.map(([label, txt, col]) => `
    <div style="border-left:3px solid ${col};padding-left:10px;">
      <div style="font-size:9px;letter-spacing:.6px;text-transform:uppercase;color:var(--muted);font-weight:600;">${label}</div>
      <div style="font-size:13px;font-weight:600;color:var(--text);">${txt}</div>
    </div>`).join('');

  return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:18px;margin-top:14px;">
    <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px;">Coaching Analysis</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px 24px;">${grid}</div>
    <div style="border-top:1px solid var(--border);margin-top:14px;padding-top:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px;">
        <span style="font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);font-weight:600;">Coach comment · Current status</span>
        <span id="mon-cmt-ai-tag" style="font-size:10px;color:#4a7dd6;font-weight:600;display:none;">AI summary</span>
        <a href="#" id="mon-cmt-hist-link" onclick="sbMonToggleHistory();return false;" style="font-size:11px;color:#39c3d4;display:none;">History</a>
      </div>
      <div id="mon-cmt-status" style="font-size:13px;color:var(--text);min-height:18px;">Loading…</div>
      <div id="mon-cmt-history" style="display:none;margin-top:8px;"></div>
      <div style="display:flex;gap:8px;margin-top:10px;align-items:flex-start;">
        <textarea id="mon-cmt-input" rows="2" placeholder="Add new comment" style="flex:1;resize:vertical;"></textarea>
        <button onclick="sbMonSaveComment()" style="padding:9px 16px;border-radius:8px;border:1px solid #39c3d4;background:rgba(57,195,212,0.15);color:#39c3d4;font-family:'Poppins',sans-serif;font-size:12px;font-weight:700;cursor:pointer;">Save</button>
      </div>
    </div>
  </div>`;
}

function sbMonTimeSel(d) {
  const el = document.getElementById('mon-time-detail');
  const rs = _monTimeBy[d];
  if (!el || !rs) return;
  const n = rs.length;
  const s = rs.filter(x => sbMonOutcome(x) === 'stomped').length;
  const l = rs.filter(x => sbMonOutcome(x) === 'landed').length;
  const f = n - s - l;
  const fmt = d.length === 10 ? d.slice(8,10) + '.' + d.slice(5,7) + '.' + d.slice(2,4) : d;
  el.innerHTML = `<b style="color:var(--text);">${fmt}</b> — ${n} attempts ·
    <span style="color:#39c3d4;">${s} stomped</span> ·
    <span style="color:#34d399;">${l} landed</span> ·
    <span style="color:#e2001a;">${f} failed</span> ·
    <b>${n ? Math.round(s/n*100) : 0}%</b> stomp rate
    <button onclick="sbMonOpenTrickReport('${d}')" style="margin-left:8px;padding:3px 10px;border-radius:6px;border:1px solid #39c3d4;background:rgba(57,195,212,0.12);color:#39c3d4;font-family:'Poppins',sans-serif;font-size:11px;font-weight:600;cursor:pointer;">Open session view →</button>`;
}

// Fokussierte Session-Ansicht: NUR dieser Trick dieser Athlet:in aus dieser Session
// (aus den Monitoring-Daten gebaut, gleiche Darstellung wie die Report-Trick-Karte, read-only)
function sbMonOpenTrickReport(d) {
  const rows = (_monTimeBy[d] || []).slice().sort((a,b) => (a.created_at||'').localeCompare(b.created_at||''));
  if (!rows.length) return;
  const attempts = rows.map(t => ({trick: t.trickaufbau || '—', outcome: sbMonOutcome(t),
    sterne: typeof t.sterne === 'number' ? t.sterne : null, kpis: t.kpis || null,
    fail: t.fail_grund || null,
    time: t.created_at ? new Date(t.created_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Zurich'}) : null,
    comment: t.kommentar || '', dbId: t.id}));
  _sbRVEditable = false;
  _sbRVEdit = null;
  const g = {trick: sbMonView.trick, attempts};
  _sbRV = {report: {datum: d}, groups: [[g]]};
  const n = attempts.length;
  const s = attempts.filter(x => x.outcome === 'stomped').length;
  const l = attempts.filter(x => x.outcome === 'landed').length;
  const f = n - s - l;
  const failCnt = {};
  attempts.forEach(x => { if (x.outcome === 'failed' && x.fail) { const fl = sbFailLabel(x.fail); failCnt[fl] = (failCnt[fl]||0) + 1; } });
  const top = Object.entries(failCnt).sort((a,b)=>b[1]-a[1])[0];
  const cmtRows = attempts.map((x, ci) => x.comment ? `<div style="font-size:11px;color:var(--muted);margin-bottom:6px;">💬 <b style="color:var(--text);">Attempt ${ci+1}:</b> ${x.comment}</div>` : '').join('');
  const cmtCol = cmtRows ? `<div style="flex:0 1 220px;min-width:170px;border-left:1px solid var(--border);padding-left:14px;">
      <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:6px;">Comments</div>${cmtRows}</div>` : '';
  const fmt = d.length === 10 ? d.slice(8,10) + '.' + d.slice(5,7) + '.' + d.slice(2,4) : d;
  document.getElementById('sbrv-modal')?.remove();
  const modal = document.createElement('div');
  modal.id = 'sbrv-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:2100;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto;';
  modal.innerHTML = `<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px;max-width:640px;width:100%;margin:auto 0;">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px;">
      <div style="min-width:0;">
        <div style="font-size:16px;font-weight:800;color:var(--text);">${g.trick}</div>
        <div style="font-size:12px;color:var(--muted);">${sbMonView.athlete} · Session ${fmt}</div>
      </div>
      <button onclick="document.getElementById('sbrv-modal').remove()" style="padding:7px 14px;border-radius:8px;background:rgba(57,195,212,0.15);border:1px solid #39c3d4;color:#39c3d4;font-family:'Poppins',sans-serif;font-size:12px;font-weight:700;cursor:pointer;">Close</button>
    </div>
    <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:10px;color:var(--muted);margin-bottom:10px;">
      <span><span style="display:inline-block;width:10px;height:10px;background:#4a7dd6;border-radius:2px;vertical-align:-1px;"></span> Landed/Stomped (height = stars)</span>
      <span><span style="display:inline-block;width:10px;height:10px;background:#e2001a;border-radius:2px;vertical-align:-1px;"></span> Failed</span>
      <span><span style="display:inline-block;width:14px;height:2px;background:#9aa8b8;vertical-align:3px;"></span> running stomp rate (0–100%)</span>
    </div>
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px;">
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;">
        <div style="flex:1 1 300px;min-width:0;">
          ${sbTrickChartSvg(g, 0, 0)}
          <div id="sbrv-det-0-0" style="font-size:11px;color:var(--muted);min-height:16px;margin:2px 0 8px;">Tap a bar for details</div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11px;">
            <span><b style="color:#39c3d4;">${s}</b> stomped</span>
            <span><b style="color:#34d399;">${l}</b> landed</span>
            <span><b style="color:#e2001a;">${f}</b> failed</span>
            <span><b>${n ? Math.round(s/n*100) : 0}%</b> stomp rate</span>
            ${top ? `<span style="color:#e2001a;">✗ mostly: ${top[0]} (${top[1]}×)</span>` : ''}
          </div>
        </div>
        ${cmtCol}
      </div>
    </div>
  </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

// ── Trick-Kommentare (Tabelle trick_comments; Key = Athlet + normalisierter Trick) ──
async function sbMonLoadComments() {
  const st = document.getElementById('mon-cmt-status');
  if (!st || !sbMonView.athlete || !sbMonView.trick) return;
  _monCmts = []; _monCmtHistOpen = false;
  const {data, error} = await db.from('trick_comments').select('*')
    .eq('athlet', sbMonView.athlete).eq('trick', sbMonView.trick)
    .order('datum', {ascending: false}).order('id', {ascending: false});
  if (error) {
    st.innerHTML = '<span style="color:var(--muted);font-size:11px;">Comments unavailable — run the trick_comments SQL in Supabase first.</span>';
    return;
  }
  _monCmts = data || [];
  _monStatus = null;
  try {
    const {data: st} = await db.from('trick_status').select('status_text,updated_at')
      .eq('athlet', sbMonView.athlete).eq('trick', sbMonView.trick).maybeSingle();
    if (st && st.status_text) _monStatus = st;
  } catch (e) { /* Tabelle/Function noch nicht eingerichtet → neuester Kommentar */ }
  sbMonRenderComments();
}



async function sbMonSaveComment() {
  const inp = document.getElementById('mon-cmt-input');
  const txt = (inp?.value || '').trim();
  if (!txt) { showToast('Write a comment first', 'error'); return; }
  const {error} = await db.from('trick_comments').insert({
    athlet: sbMonView.athlete, trick: sbMonView.trick,
    datum: new Date().toISOString().slice(0,10), kommentar: txt
  });
  if (error) { showToast('Error saving: ' + error.message, 'error'); return; }
  inp.value = '';
  showToast('Comment saved', 'success');
  sbMonLoadComments();
  // KI-Zusammenfassung im Hintergrund aktualisieren (Edge Function; fehlt sie, bleibt der neueste Kommentar stehen)
  try {
    db.functions.invoke('trick-status', {body: {athlet: sbMonView.athlete, trick: sbMonView.trick}})
      .then(res => { if (res && !res.error) sbMonLoadComments(); })
      .catch(() => {});
  } catch (e) { /* functions-API nicht verfügbar */ }
}

const fragments = {
  evMain: `
    <!-- Row 1: Drehrichtungen (Radar) + Rotationen (Balken) -->
    <div class="chart-grid">
      <div class="chart-card">
        <div class="chart-title">🔄 Drehrichtungen</div>
        <div class="radar-wrap">
          <canvas id="cv-radar" width="360" height="360"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <div class="chart-title">🔢 Rotationen</div>
        <div id="bars-rotation"></div>
      </div>
    </div>

`,
  dirRadar: `      <div class="card">
        <div class="card-title">🔄 Direction Balance</div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:8px;">
          <span style="color:#34d399;font-weight:600;">— Learned</span> &nbsp;&nbsp;
          <span style="color:#f59e0b;font-weight:600;">- - Goals</span>
        </div>
      </div>`,
  dbRankings: `  <div class="card" style="margin-bottom:20px;display:flex;justify-content:flex-end;align-items:center;gap:12px;flex-wrap:wrap;">
    <div style="font-size:12px;color:var(--muted);">Compare assessment with actual session data</div>
    <button onclick="realityCheck()" style="padding:8px 16px;border-radius:8px;font-family:Poppins,sans-serif;font-size:13px;font-weight:600;cursor:pointer;border:1px solid #f59e0b;background:rgba(245,158,11,0.15);color:#f59e0b;">🔍 Reality Check</button>
  </div>`,
  grabBlock: `        <div class="form-group kicker-field-sb hidden"><label>Grab <span style="font-size:10px;color:var(--muted);font-weight:400;">(1× click = ✓ Learned · 2× = 🎯 Goal · 3× = off)</span></label>
          <div id="sb-grab-wrap" style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0;">
            <input type="hidden" id="sb-grab" value="">
          </div>
        </div>`,
  coachFields: ``,
};
function init() {
  initStandortGrabs();
  ['nav-tab-monitoring','mobile-nav-monitoring','nav-tab-sessionreport','mobile-nav-sessionreport'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  });
  // Visual order: Assessment, Session, Reports, Development, Database, Monitoring
  // (DOM order stays appended so shared mobile-nav indices keep working for Freeski)
  const orders = [['standort',0],['erfassen',1],['sessionreport',2],['entwicklung',3],['datenbank',4],['monitoring',5]];
  const deskTabs = document.querySelectorAll('.nav-tabs .nav-tab');
  const deskMap = {standort:deskTabs[0], erfassen:deskTabs[1], entwicklung:deskTabs[2], datenbank:deskTabs[3],
    monitoring:document.getElementById('nav-tab-monitoring'), sessionreport:document.getElementById('nav-tab-sessionreport')};
  const mobBtns = document.querySelectorAll('.mobile-nav-btn');
  const mobMap = {standort:mobBtns[0], erfassen:mobBtns[1], entwicklung:mobBtns[2], datenbank:mobBtns[3],
    monitoring:document.getElementById('mobile-nav-monitoring'), sessionreport:document.getElementById('mobile-nav-sessionreport')};
  orders.forEach(([key, o]) => {
    if (deskMap[key]) deskMap[key].style.order = o;
    if (mobMap[key]) mobMap[key].style.order = o;
  });
  // Development + Database are fully covered by Monitoring/Reports — hide their tabs.
  // The page markup stays in the DOM: Reality Check / PDF exports still use its elements.
  ['entwicklung','datenbank'].forEach(key => {
    if (deskMap[key]) deskMap[key].style.display = 'none';
    if (mobMap[key]) mobMap[key].style.display = 'none';
  });
  document.body.classList.add('sport-snowboard');
  sbLoadCustomFails();   // team-weite Custom-Fail-Tags nachladen
  sbLoadRailData();      // team-weite Rail-Arten und -Tricks nachladen
}
return { fragments, init, showPage, sbCustomFailPrompt, toggleSbFail, commitFailedMulti, sbRunToggleAdd, sbRunSetRailType, sbRunNewRailType, sbRunAddJump, sbRunAddRailCommit, sbRunRemoveEl, sbRunRate, sbRunNoteToggle, sbRunTagToggle, sbRunNoteInput, sbRunSave, updateFwdSwBtn, updateSbDisciplines, toggleDisziplin, trickDesc, loadDB, generateAthleteReport, renderSessionReports, rebuildReportFromTimestamps, deleteSessionReport, openTeamPdfReport, saveSessionState, clearSessionStorage, restoreSessionState, toggleSessionAthlete, normSbTrick, tricksForDir, baseLabel, parseGrabsFromLabel, showGrabPicker, toggleDoubleGrab, doubleGrabClick, addTrickWithGrab, renderSessionTrickSelection, toggleSessGrab, renderSessSelected, toggleSessAssessmentTrick, removeSessTrick, toggleSessTrick, selectSessAthlete, sbSetTrick, sbSelectGrab, renderLiveSession, sessSetTrick, logAttempt, logAttemptStart, renderSbDisclosure, toggleSbKpi, commitLandedAttempt, commitFailedAttempt, sbAttemptNo, toggleSbEditKpi, setSbEditFail, saveSbLogEdit, deleteLogEntry, editLogEntry, renderSessionLog, clearSessionSelection, addAthleteToSession, resetSession, cancelSession, endSession, buildFsTrickBlocks, saveSessionReport, loadLastSessionReport, openReportPrint, openSessionReportView, sbReportInnerHtml, sbRVShowDetail, sbRVPrintPdf, loadReportsTab, renderReportsList, sbOpenReportInline, sbRepSetTyp, sbRepSetRange, sbRepApplyCustom, sbRepDeleteCurrent, sbRVEditStart, sbRVEditKpiToggle, sbRVEditFailSet, sbRVEditCancel, sbRVEditDelete, sbRVEditSave, sbMonSetTyp, sbMonApplyCustom, sbMonRealityCheck, sbMonTeamPdf, sbMonAthletePdf, sbMonTimeSel, sbMonOpenTrickReport, sbMonToggleHistory, sbMonSaveComment, viewSessionReportByDate, loadStandort, renderSbDirRadar, renderStandort, sbSave, cycleGrabStatus, loadEntwicklung, openSbEdit, saveSbEdit, extractQuality, trickDir, sortFsTricksByDir, initTrickAnalytics, buildSessionList, setStatsMode, setTypeFilter, parseDateInput, setDateRange, clearDateRange, renderTrickAnalytics, renderRawEntries, syncTrickNameLocally, editRawEntry, cancelRawEdit, saveRawEdit, deleteRawEntry, showPerfTip, hidePerfTip, setPerfFilter, onPfSeasonChange, setPerfDateRange, clearPerfDateRange, getSeasonRange, updateSeasonLabels, renderSessionPerformance, realityCheck, applyRealityCheckSelected, drawSessionDirRadar, loadMonitoring, renderMonitoring, sbMonSetRange, sbMonOpenAthlete, sbMonOpenTrick, sbMonBack, renderMonAthlete, renderMonTeam, renderMonTrick }
})();
