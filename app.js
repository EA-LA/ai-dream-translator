// ===== Helpers =====
const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const todayISO = () => new Date().toISOString().slice(0,10);

// Footer year
const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

// Mobile menu
const hamburger = $('#hamburger');
if (hamburger) hamburger.addEventListener('click', () => document.body.classList.toggle('nav-open'));

// ===== Local storage model =====
const LS_KEYS = { dreams:'adt_dreams', profile:'adt_profile', prefs:'adt_prefs' };

const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// ===== Profile / prefs =====
function getProfile(){ return load(LS_KEYS.profile, {displayName:'', username:'', email:'', avatar:''}); }
function setProfile(p){ save(LS_KEYS.profile, p); }

function getPrefs(){ return load(LS_KEYS.prefs, {reminders:false, private:false}); }
function setPrefs(p){ save(LS_KEYS.prefs, p); }

// ===== Dreams =====
function getDreams(){ return load(LS_KEYS.dreams, []); }
function setDreams(arr){ save(LS_KEYS.dreams, arr); }

function addDream(text){
  const arr = getDreams();
  arr.unshift({ id:crypto.randomUUID(), text, date: new Date().toISOString() });
  setDreams(arr);
}

// Streak: consecutive days with at least one dream
function calcStreak(){
  const byDay = new Set(getDreams().map(d => d.date.slice(0,10)));
  let streak = 0;
  for (let i=0; ; i++){
    const d = new Date(); d.setDate(d.getDate()-i);
    const iso = d.toISOString().slice(0,10);
    if (byDay.has(iso)) streak++;
    else break;
  }
  return streak;
}
function countThisWeek(){
  const now = new Date(); const start = new Date(); start.setDate(now.getDate()-6);
  return getDreams().filter(d => new Date(d.date) >= start).length;
}

// ===== Dashboard wiring =====
(function initDashboard(){
  const welcome = $('#welcomeName');
  if (welcome){ welcome.textContent = (getProfile().displayName || 'friend'); }

  const saveBtn = $('#saveDreamBtn');
  if (saveBtn){
    saveBtn.addEventListener('click', () => {
      const t = $('#dreamText').value.trim();
      if (!t) return alert('Please write something first.');
      addDream(t);
      $('#dreamText').value = '';
      renderJournal();
      renderStats();
      alert('Saved!');
    });
  }

  const shareBtn = $('#shareLastBtn');
  if (shareBtn){
    shareBtn.addEventListener('click', async () => {
      const last = getDreams()[0];
      if (!last) return alert('No entries yet.');
      const text = `My dream (${last.date.slice(0,10)}): ${last.text}`;
      if (navigator.share) await navigator.share({ text, title:'Dream Journal' });
      else { await navigator.clipboard.writeText(text); alert('Copied to clipboard.'); }
    });
  }

  const clearAllBtn = $('#clearAllBtn');
  if (clearAllBtn){
    clearAllBtn.addEventListener('click', () => {
      if (confirm('Delete ALL local dreams?')){ setDreams([]); renderJournal(); renderStats(); }
    });
  }

  const filter = $('#filterSelect');
  if (filter) filter.addEventListener('change', renderJournal);

  const interp2 = $('#interpretBtn2');
  if (interp2) interp2.addEventListener('click', () => {
    // send them to homepage interpreter (keeps current page simple)
    location.href = 'index.html#interpreter';
  });

  if ($('#journalList')){ renderJournal(); renderStats(); }
})();

function renderStats(){
  const dreams = getDreams();
  const c = $('#statCount'); if (c) c.textContent = dreams.length;
  const s = $('#statStreak'); if (s) s.textContent = calcStreak();
  const w = $('#statThisWeek'); if (w) w.textContent = countThisWeek();
}

function renderJournal(){
  const list = $('#journalList'); const empty = $('#emptyMsg'); if (!list) return;
  const range = ($('#filterSelect')?.value) || 'all';
  let items = getDreams();

  const now = new Date();
  if (range === 'week'){
    const start = new Date(); start.setDate(now.getDate()-6);
    items = items.filter(d => new Date(d.date) >= start);
  } else if (range === 'month'){
    const start = new Date(); start.setDate(now.getDate()-30);
    items = items.filter(d => new Date(d.date) >= start);
  }

  list.innerHTML = '';
  if (!items.length){ empty?.classList.remove('hidden'); return; }
  empty?.classList.add('hidden');

  items.forEach(d => {
    const li = document.createElement('li');
    li.className = 'journal-item';
    li.innerHTML = `
      <div class="journal-date">${new Date(d.date).toLocaleString()}</div>
      <div class="journal-text">${escapeHTML(d.text)}</div>
      <div class="row mt">
        <button class="btn ghost" data-share="${d.id}">Share</button>
        <button class="btn ghost" data-delete="${d.id}">Delete</button>
      </div>`;
    list.appendChild(li);
  });

  list.querySelectorAll('[data-delete]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-delete');
      setDreams(getDreams().filter(x=>x.id!==id));
      renderJournal(); renderStats();
    });
  });
  list.querySelectorAll('[data-share]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.getAttribute('data-share');
      const it = getDreams().find(x=>x.id===id);
      if (!it) return;
      const txt = `My dream (${it.date.slice(0,10)}): ${it.text}`;
      if (navigator.share) await navigator.share({ text:txt, title:'Dream Journal' });
      else { await navigator.clipboard.writeText(txt); alert('Copied to clipboard.'); }
    });
  });
}

function escapeHTML(s){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

/* =============================
   INTERPRETER + DREAM ART (Cloudflare-backed)
   ============================= */

// Tabs support (if present on page)
const setActiveTab = (name) => {
  $$('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.tab === name));
  $$('.panel').forEach(p => p.classList.toggle('is-active', p.id === `pane-${name}`));
};
$$('.tab').forEach(btn => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)));

function showTextPanels(obj){
  const put = (id, html) => { const n = document.getElementById(id); if (n) n.innerHTML = html; };
  put('pane-scientific', obj.scientific || '—');
  put('pane-psychological', obj.psychological || '—');
  put('pane-spiritual', obj.spiritual || '—');
  setActiveTab('scientific');
}

// Dream art preview (data URL)
function showImage(dataUrl){
  const wrap = $('#imageWrap'); if (!wrap) return;
  wrap.innerHTML = '';
  const img = new Image(); img.src = dataUrl; img.alt = 'Dream Art'; wrap.appendChild(img);
  const dl = $('#downloadBtn');
  if (dl){
    dl.disabled = false;
    dl.onclick = () => { const a=document.createElement('a'); a.href=dataUrl; a.download='dream-art.png'; a.click(); };
  }
}
function clearImage(){
  const wrap = $('#imageWrap');
  if (wrap) wrap.innerHTML = '<div class="image-empty">No image yet. Click <em>Generate Dream Art</em>.</div>';
  const dl = $('#downloadBtn'); if (dl) dl.disabled = true;
}

// Hook homepage controls (now call your API routes)
const interpretBtn = $('#interpretBtn');
if (interpretBtn){
  interpretBtn.addEventListener('click', async ()=>{
    const text = ($('#dreamInput')?.value || '').trim();
    if (!text) return alert('Please describe your dream first.');

    try{
      const r = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!r.ok) throw new Error('Server error');
      const out = await r.json(); // { scientific, psychological, spiritual }
      showTextPanels({
        scientific: `<p>${out.scientific || ''}</p>`,
        psychological: `<p>${out.psychological || ''}</p>`,
        spiritual: `<p>${out.spiritual || ''}</p>`
      });
    }catch(e){
      console.error(e);
      alert('Sorry, interpretation failed. Please try again.');
    }
  });
}

const imageBtn = $('#imageBtn');
if (imageBtn){
  imageBtn.addEventListener('click', async ()=>{
    const text = ($('#dreamInput')?.value || '').trim();
    if (!text) return alert('Please describe your dream first.');

    try{
      const r = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!r.ok) throw new Error('Server error');
      const data = await r.json(); // { imageDataUrl }
      if (!data.imageDataUrl) throw new Error('No image');
      showImage(data.imageDataUrl);
    }catch(e){
      console.error(e);
      alert('Sorry, image generation failed. Please try again.');
    }
  });
}

const clearBtn = $('#clearBtn');
if (clearBtn) clearBtn.addEventListener('click', clearImage);

// Init default state for art box if it's on the page
clearImage();

// === Pro Account Menu (global) ===

// Helper: read auth user from localStorage or window (fallbacks)
function adtGetUser() {
  const name = localStorage.getItem('adt_user_name') || (window._authUser && window._authUser.displayName) || null;
  const email = localStorage.getItem('adt_user_email') || (window._authUser && window._authUser.email) || null;
  return (email ? { name: name || (email.split('@')[0].toUpperCase()), email } : null);
}

// Helper: theme
function adtApplyTheme(mode) {
  // mode: 'system' | 'light' | 'dark'
  localStorage.setItem('adt_theme', mode);
  document.documentElement.dataset.theme = mode;
}
(function initThemeFromStore(){
  const mode = localStorage.getItem('adt_theme') || 'dark';
  adtApplyTheme(mode);
})();

(function mountAccountMenu(){
  const navLinks = document.querySelector('.nav .nav-links');
  if (!navLinks) return;

  const user = adtGetUser();
  if (!user) return; // keep Sign in / Sign up

  // Remove auth links if present
  [...navLinks.querySelectorAll('a[href*="signin"], a[href*="signup"]')].forEach(a => a.remove());

  // Create the button + menu
  const wrap = document.createElement('div');
  wrap.className = 'account-wrap';

  wrap.innerHTML = `
    <div class="account-btn" id="accBtn">
      <div class="avatar" id="accAvatar"></div>
      <span id="accName" style="font-weight:700">${(user.name || 'ACCOUNT').toUpperCase()}</span>
      <span class="dot"></span>
    </div>
    <div class="account-menu" id="accMenu" role="menu" aria-hidden="true">
      <div class="acc-header">
        <div class="name" id="accHeaderName">${(user.name || 'USER').toUpperCase()}</div>
        <div class="email" id="accHeaderEmail">${user.email}</div>
      </div>

      <div class="acc-item" id="accTheme"> <span>🌐 Theme</span> <span class="acc-right">›</span> </div>
      <div class="acc-item" id="accManage"> <span>⚙️ Manage account</span> <span class="acc-right">settings</span> </div>
      <div class="acc-item" id="accPricing"> <span>⚡ Pricing</span> <span class="acc-right">plans</span> </div>
      <div class="acc-item" id="accContact"> <span>✉️ Contact us</span> <span class="acc-right">support</span> </div>
      <div class="acc-item" id="accTerms"> <span>📄 Terms & Conditions</span> <span class="acc-right">legal</span> </div>
      <div style="border-top:1px solid rgba(255,255,255,.06); margin:6px 0"></div>
      <div class="acc-item" id="accLogout"> <span>↪ Log out</span></div>

      <div class="acc-sub" id="accThemeSub">
        <div class="acc-radio" data-theme="system"><span class="tick"></span><span>System</span></div>
        <div class="acc-radio" data-theme="light"><span class="tick"></span><span>Light</span></div>
        <div class="acc-radio" data-theme="dark"><span class="tick"></span><span>Dark</span></div>
      </div>
    </div>
  `;
  navLinks.appendChild(wrap);

  // Avatar initial (simple letter)
  const av = wrap.querySelector('#accAvatar');
  const letter = (user.name || user.email || 'U').trim().charAt(0).toUpperCase();
  av.textContent = letter;
  av.style.display = 'grid'; av.style.placeItems = 'center'; av.style.fontWeight = '800'; av.style.color = '#cfe2ff';

  // Open/close
  const btn = wrap.querySelector('#accBtn');
  const menu = wrap.querySelector('#accMenu');
  const themeItem = wrap.querySelector('#accTheme');
  const themeSub = wrap.querySelector('#accThemeSub');

  const closeMenus = () => { menu.classList.remove('open'); themeSub.classList.remove('open'); };
  btn.addEventListener('click', (e)=>{ e.stopPropagation(); menu.classList.toggle('open'); });
  document.addEventListener('click', closeMenus);

  themeItem.addEventListener('mouseenter', ()=> themeSub.classList.add('open'));
  themeItem.addEventListener('mouseleave', ()=> themeSub.classList.remove('open'));
  themeSub.addEventListener('mouseenter', ()=> themeSub.classList.add('open'));
  themeSub.addEventListener('mouseleave', ()=> themeSub.classList.remove('open'));

  // Theme radio state
  const currentTheme = localStorage.getItem('adt_theme') || 'dark';
  themeSub.querySelectorAll('.acc-radio').forEach(el=>{
    if (el.dataset.theme === currentTheme) el.classList.add('active');
    el.addEventListener('click', ()=>{
      themeSub.querySelectorAll('.acc-radio').forEach(r=>r.classList.remove('active'));
      el.classList.add('active');
      adtApplyTheme(el.dataset.theme);
    });
  });

  // Routes
  wrap.querySelector('#accManage').addEventListener('click', ()=> location.href='/settings.html');
  wrap.querySelector('#accPricing').addEventListener('click', ()=> location.href='/pricing.html');
  wrap.querySelector('#accContact').addEventListener('click', ()=> location.href='/contact.html');
  wrap.querySelector('#accTerms').addEventListener('click', ()=> location.href='/terms.html');

  // Logout
  const doSignOut = async () => {
    const existing = document.getElementById('signOutBtn');
    if (existing) { existing.click(); return; }
    localStorage.removeItem('adt_user_name');
    localStorage.removeItem('adt_user_email');
    localStorage.removeItem('adt_tier');
    location.href = '/signin.html';
  };
  wrap.querySelector('#accLogout').addEventListener('click', doSignOut);

})();

/* =============================
   PLAN / USAGE — FULL ENTITLEMENTS (FREE/LITE/STANDARD/PRO)
   (unchanged from your last version)
   ============================= */

const ENTITLEMENTS = {
  free: { label:"Free", daily:{ interpret:2, art:1 }, lensesUnlocked:["psychological"],
    features:{ export:false,tags:false,historySearch:false,weeklyInsights:false,commercial:false,priority:"none",hdArt:false,voiceToDream:false,customPrompts:false,multilingual:false,earlyAccess:false,teamSeats:0 } },
  lite: { label:"Lite", daily:{ interpret:8, art:3 }, lensesUnlocked:["psychological","symbolic"],
    features:{ export:true,tags:true,historySearch:false,weeklyInsights:false,commercial:"lite",priority:"lite",hdArt:false,voiceToDream:false,customPrompts:false,multilingual:false,earlyAccess:false,teamSeats:0 } },
  standard: { label:"Standard", daily:{ interpret:Infinity, art:10 }, lensesUnlocked:["psychological","symbolic","cultural","spiritual"],
    features:{ export:true,tags:true,historySearch:true,weeklyInsights:true,commercial:true,priority:"std",hdArt:false,voiceToDream:false,customPrompts:false,multilingual:false,earlyAccess:true,teamSeats:0 } },
  pro: { label:"Pro", daily:{ interpret:Infinity, art:150 }, lensesUnlocked:["psychological","symbolic","cultural","spiritual"],
    features:{ export:true,tags:true,historySearch:true,weeklyInsights:true,commercial:true,priority:"max",hdArt:true,voiceToDream:true,customPrompts:true,multilingual:true,earlyAccess:true,teamSeats:2 } },
};

const USAGE_KEY = "adt_usage";
const PLAN_KEY  = "adt_plan";
(function planFromQuery(){ const p=new URLSearchParams(location.search).get("plan"); if (p && ENTITLEMENTS[p]) localStorage.setItem(PLAN_KEY,p); })();
function dayKey(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function getPlan(){ return localStorage.getItem(PLAN_KEY) || "free"; }
function setPlan(p){ if (ENTITLEMENTS[p]) localStorage.setItem(PLAN_KEY,p); }
function getUsage(){ const raw=localStorage.getItem(USAGE_KEY); const today=dayKey(); if(!raw) return {date:today,interpret:0,art:0}; try{const u=JSON.parse(raw); return (u.date===today)?u:{date:today,interpret:0,art:0};}catch{return {date:today,interpret:0,art:0};}}
function saveUsage(u){ localStorage.setItem(USAGE_KEY, JSON.stringify(u)); }
function currentLimits(){ return ENTITLEMENTS[getPlan()]?.daily || { interpret:0, art:0 }; }
function hasQuota(action){ const lim=currentLimits(); const u=getUsage(); const used=u[action]||0; const max=lim[action]; return (max===Infinity)||(used<max); }
function requireQuota(action){ const plan=getPlan(); if (hasQuota(action)) return true; const lim=currentLimits()[action]; const msg = action==="interpret" ? `Limit reached: ${ENTITLEMENTS[plan].label} allows ${lim===Infinity?'unlimited':lim} interpretations/day.` : `Limit reached: ${ENTITLEMENTS[plan].label} allows ${lim===Infinity?'unlimited':lim} dream-art/day.`; alert(msg + "\nVisit Pricing to upgrade."); return false; }
function recordUsage(action){ const u=getUsage(); u[action]=(u[action]||0)+1; saveUsage(u); updateUsageUI(); }
function updateUsageUI(){ const plan=getPlan(); const u=getUsage(); const lim=currentLimits(); const boxes=document.querySelectorAll(".stat-box p"); if (boxes[0]) boxes[0].textContent=`${u.interpret||0} / ${lim.interpret===Infinity?"∞":lim.interpret}`; if (boxes[1]) boxes[1].textContent=`${u.art||0} / ${lim.art===Infinity?"∞":lim.art}`; document.querySelectorAll("[data-plan-badge]").forEach(el=> el.textContent = ENTITLEMENTS[plan].label ); }
function applyFeatureLocks(){ const plan=getPlan(); const cfg=ENTITLEMENTS[plan]; document.querySelectorAll("[data-feature]").forEach(el=>{ const key=el.getAttribute("data-feature"); const val=cfg.features[key]; const allowed=(val===true)||(typeof val==="string")||(typeof val==="number" && val>0); el.classList.toggle("locked", !allowed); el.toggleAttribute("aria-disabled", !allowed); if (!allowed){ el.addEventListener("click",(e)=>{e.preventDefault(); alert("Upgrade to unlock this feature.");},{once:true}); }}); const allowedLenses=new Set(cfg.lensesUnlocked.map(s=>s.toLowerCase())); document.querySelectorAll("[data-lens]").forEach(el=>{ const lens=(el.getAttribute("data-lens")||"").toLowerCase(); const ok=allowedLenses.has(lens); el.classList.toggle("locked", !ok); el.toggleAttribute("aria-disabled", !ok); if (!ok){ el.addEventListener("click",(e)=>{e.preventDefault(); alert("Upgrade to unlock this lens.");},{once:true}); }}); }
(function wireHdArt(){ const t=document.getElementById("hdArtToggle"); if(!t) return; const plan=getPlan(); const allowed=!!ENTITLEMENTS[plan].features.hdArt; t.checked=allowed; t.disabled=!allowed; })();
function wireGuardsV2(){ const interpretTargets=[document.getElementById("interpretBtn"),document.getElementById("interpretBtn2")].filter(Boolean); interpretTargets.forEach(btn=>{ btn.addEventListener("click",(e)=>{ if(!requireQuota("interpret")) { e.stopImmediatePropagation(); e.preventDefault(); return; } setTimeout(()=>recordUsage("interpret"),0); }, true);}); const artTargets=[document.getElementById("imageBtn"),document.getElementById("generateBtn")].filter(Boolean); artTargets.forEach(btn=>{ btn.addEventListener("click",(e)=>{ if(!requireQuota("art")) { e.stopImmediatePropagation(); e.preventDefault(); return; } setTimeout(()=>recordUsage("art"),0); }, true);}); }
window.setPlanForTesting=function(p){ if(!ENTITLEMENTS[p]) return alert("Unknown plan: "+p); setPlan(p); updateUsageUI(); applyFeatureLocks(); alert("Plan set to: "+ENTITLEMENTS[p].label); };
(function initPlans(){ if(!localStorage.getItem(PLAN_KEY)) setPlan("free"); updateUsageUI(); applyFeatureLocks(); wireGuardsV2(); const now=new Date(); const midnight=new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 0,0,1); setTimeout(()=>{ saveUsage({date:dayKey(), interpret:0, art:0}); updateUsageUI(); }, midnight-now); })();
