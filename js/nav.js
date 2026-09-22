// Mobile Navigationsleiste. Laeuft nach dem Boot.
function updateMobileNav(pageId) {
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
  const idx = {'standort':0,'erfassen':1,'entwicklung':2,'datenbank':3,'monitoring':4,'sessionreport':5};
  const btns = document.querySelectorAll('.mobile-nav-btn');
  if (btns[idx[pageId]] !== undefined) btns[idx[pageId]].classList.add('active');
}
// Runs at the end of bootSport (after auth) — window functions are installed by then
function bootOpenInitialPage() {
  if(localStorage.getItem(CFG.sessionKey)){
    const sessBtn=Array.from(document.querySelectorAll('.nav-tab')).find(t=>t.textContent.trim()==='Session');
    if(sessBtn) sessBtn.click();
  }
  updateMobileNav(localStorage.getItem(CFG.sessionKey)?'erfassen':'standort');
}
