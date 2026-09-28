// Gemeinsame Gestaltungsregeln für Freeski, Snowboard und Moguls (wie Youth-App):
// 1) keine Gedankenstriche in der Anzeige: « — » wird zu «: », «— Auswahl —» zu «Auswahl»
// 2) bunte Emojis werden durch einheitliche Linien-Icons ersetzt (Farbe = Textfarbe)
// Nur die ANZEIGE wird angepasst, gespeicherte Daten (z.B. Trick-Labels) bleiben unverändert.
(() => {
  const P = {
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
    star:'<path fill="currentColor" stroke="none" d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/>',
    file:'<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13M9 7V4h6v3"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    checkc:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 10"/>',
    inbox:'<path d="M3 13l2.5-8h13L21 13v6a1 1 0 01-1 1H4a1 1 0 01-1-1z"/><path d="M3 13h5l1.5 2.5h5L16 13h5"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    msg:'<path d="M4 5h16v11H9l-5 4z"/>',
    upload:'<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    pencil:'<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
    alert:'<path d="M12 3L2 20h20z"/><path d="M12 10v4M12 17.2v.1"/>',
    trophy:'<path d="M8 4h8v5a4 4 0 01-8 0zM8 6H4v1a3 3 0 003 3M16 6h4v1a3 3 0 01-3 3M12 13v4M8 20h8M9 17h6"/>',
    note:'<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h6M9 15h6M9 7h3"/>',
    play:'<path fill="currentColor" stroke="none" d="M8 5.5v13l10.5-6.5z"/>',
    chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    save:'<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    fire:'<path d="M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-3 2-4 2-7 1 1 2 2 3 4 0-3 0-5 0-7z"/>',
    snow:'<path d="M12 2v20M4 6l16 12M20 6L4 18"/>',
    mountain:'<path d="M2 20l7-12 4 6 3-4 6 10z"/>',
  };
  const MAP = {'🎯':'target','⭐':'star','🌟':'star','📄':'file','📋':'note','🗑':'trash','⏳':'clock','⌛':'clock','⏱':'clock','✅':'checkc','📥':'inbox','🔍':'search','💬':'msg','⬆':'upload','✏':'pencil','✎':'pencil','⚠':'alert','🏆':'trophy','📝':'note','▶':'play','📊':'chart','📈':'chart','💾':'save','📅':'calendar','🗓':'calendar','🔥':'fire','❄':'snow','🏔':'mountain','⛰':'mountain'};
  const RX = new RegExp('(' + Object.keys(MAP).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\uFE0F?', 'g');
  const ico = k => `<svg class="ico ico-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[k]}</svg>`;
  const SKIP = 'svg,option,select,textarea,input,script,style,title,[data-noicon],[contenteditable]';
  const dash = t => t.replace(/—\s*([^—\n]{1,40}?)\s*—/g, (m, x) => x.charAt(0).toUpperCase() + x.slice(1)).replace(/\s+—\s+/g, ': ').replace(/^\s*—\s*/, '').replace(/—/g, ':');
  function fix(n){
    const pe = n.parentElement;
    if (!pe) return;
    let v = n.nodeValue;
    // Gedankenstriche: auch in Tooltips (SVG-title) und in Auswahl-Optionen mit eigenem value (Text ≠ Wert)
    const opt = pe.closest('option');
    const dashOk = !pe.closest('textarea,input,script,style,[contenteditable]') && (!opt || opt.hasAttribute('value'));
    if (dashOk && v.includes('—')){ const d = dash(v); if (d !== v){ n.nodeValue = d; v = d; } }
    if (pe.closest(SKIP)) return;
    RX.lastIndex = 0;
    if (!RX.test(v)) return;
    const tmp = document.createElement('span');
    tmp.innerHTML = v.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[c]).replace(RX, (m, e) => ico(MAP[e]));
    n.replaceWith(...tmp.childNodes);
  }
  // Handy: breite Tabellen (ab 3 Spalten) als Karten statt horizontal scrollen
  function cardify(root){
    const tables = root.nodeType !== 1 ? [] : root.matches('table') ? [root] : root.closest('table') ? [root.closest('table')] : [...root.querySelectorAll('table')];
    for (const t of tables){
      const ths = [...t.querySelectorAll('thead th')]; if (ths.length < 3) continue;
      t.classList.add('m-cards');
      const labels = ths.map(th => th.textContent.trim());
      t.querySelectorAll('tbody tr').forEach(tr => [...tr.children].forEach((td, i) => { if (labels[i] && !td.hasAttribute('data-l')) td.setAttribute('data-l', labels[i]); }));
    }
  }
  function walk(root){
    if (root.nodeType === 3){ fix(root); return; }
    if (root.nodeType === 1) cardify(root);
    if (root.nodeType !== 1 || root.matches?.('script,style')) return;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const list = []; let n; while ((n = tw.nextNode())) list.push(n);
    list.forEach(fix);
  }
  const st = document.createElement('style');
  st.textContent = '.ico{width:1.05em;height:1.05em;vertical-align:-.17em;display:inline-block;flex-shrink:0}.ico-star{color:#fbbf24}.ico-checkc{color:#34d399}.ico-alert{color:#f59e0b}'
    + '@media (max-width:768px){table.m-cards{min-width:0!important;width:100%!important}table.m-cards thead{display:none}table.m-cards tbody{display:block}'
    + 'table.m-cards tr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 12px;padding:10px 4px;border-bottom:1px solid var(--border)}'
    + 'table.m-cards td{display:block;padding:0!important;border:0!important;text-align:left!important;min-width:0;white-space:normal!important;overflow-wrap:anywhere}'
    + 'table.m-cards td:first-child{grid-column:1/-1;font-weight:700}'
    + 'table.m-cards td[data-l]:not(:first-child)::before{content:attr(data-l);display:block;font-size:11px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--muted);margin-bottom:1px}'
    + 'table.m-cards td:empty{display:none}table.m-cards td:last-child:not(:first-child){grid-column:1/-1}table.m-cards .dist-bar{min-width:0!important}'
    + '[style*="overflow-x"] > svg[viewBox],.table-wrap svg[viewBox],.chart-scroll svg[viewBox]{max-width:100%;height:auto}}';
  document.head.appendChild(st);
  const start = () => {
    walk(document.body);
    new MutationObserver(ms => { for (const m of ms){ if (m.type === 'characterData') fix(m.target); else m.addedNodes.forEach(walk); } })
      .observe(document.body, {childList:true, subtree:true, characterData:true});
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  // Dialoge ohne Gedankenstriche
  const _c = window.confirm.bind(window), _a = window.alert.bind(window), _p = window.prompt.bind(window);
  window.confirm = m => _c(dash(String(m)));
  window.alert = m => _a(dash(String(m)));
  window.prompt = (m, d) => _p(dash(String(m)), d);
})();
