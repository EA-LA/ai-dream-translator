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

// ===== Settings wiring =====
(function initSettings(){
  const emailEl = $('#emailReadonly');
  const nameEl  = $('#displayName');
  const userEl  = $('#username');
  const avatarPreview = $('#avatarPreview');
  const avatarInput   = $('#avatarInput');
  const notifToggle   = $('#notifToggle');
  const privateToggle = $('#privateToggle');

  if (!emailEl) return; // not on settings page

  // Load profile
  const p = getProfile();
  emailEl.value = p.email || '(signed in)';
  nameEl.value  = p.displayName || '';
  userEl.value  = p.username || '';
  if (p.avatar){ avatarPreview.style.backgroundImage = `url(${p.avatar})`; }

  // Load prefs
  const prefs = getPrefs();
  notifToggle.checked = !!prefs.reminders;
  privateToggle.checked = !!prefs.private;

  // Save profile
  $('#saveProfileBtn').addEventListener('click', ()=>{
    const np = { ...getProfile(), displayName:nameEl.value.trim(), username:userEl.value.trim(), email:emailEl.value };
    setProfile(np);
    alert('Profile saved.');
    const onDash = $('#welcomeName'); if (onDash) onDash.textContent = np.displayName || 'friend';
  });

  // Avatar upload preview (stored locally)
  avatarInput.addEventListener('change', async (e)=>{
    const f = e.target.files?.[0]; if (!f) return;
    const data = await fileToDataURL(f);
    avatarPreview.style.backgroundImage = `url(${data})`;
    const np = { ...getProfile(), avatar:data }; setProfile(np);
  });

  // Prefs
  notifToggle.addEventListener('change', ()=>{
    const pr = { ...getPrefs(), reminders:notifToggle.checked };
    setPrefs(pr); alert('Reminder preference saved.');
  });
  privateToggle.addEventListener('change', ()=>{
    const pr = { ...getPrefs(), private:privateToggle.checked };
    setPrefs(pr); alert('Privacy preference saved.');
  });

  // Export / Import / Clear
  $('#exportBtn').addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify({ dreams:getDreams(), profile:getProfile(), prefs:getPrefs() }, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `dream-journal-${todayISO()}.json`; a.click();
    URL.revokeObjectURL(url);
  });
  $('#importBtn').addEventListener('click', ()=> $('#importFile').click());
  $('#importFile').addEventListener('change', async (e)=>{
    const f = e.target.files?.[0]; if (!f) return;
    const txt = await f.text();
    try{
      const data = JSON.parse(txt);
      if (data.dreams) setDreams(data.dreams);
      if (data.profile) setProfile(data.profile);
      if (data.prefs) setPrefs(data.prefs);
      alert('Imported.');
    }catch{ alert('Invalid file.'); }
  });

  $('#clearLocalBtn').addEventListener('click', ()=>{
    if (!confirm('Delete all local data (profile, prefs, dreams)?')) return;
    localStorage.removeItem(LS_KEYS.dreams);
    localStorage.removeItem(LS_KEYS.profile);
    localStorage.removeItem(LS_KEYS.prefs);
    location.reload();
  });
})();

function fileToDataURL(file){
  return new Promise((res, rej)=>{
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ===== Global auth hooks (sign out) =====
const signOutBtn = $('#signOutBtn');
if (signOutBtn){
  signOutBtn.addEventListener('click', ()=>{
    // Front-end only signout UI; if you have Firebase Auth, call signOut() inside auth.js
    sessionStorage.clear();
    alert('Signed out.');
    location.href = 'index.html';
  });
}

// ===================
// ADDED: Interpreter + Dream Art demo (no backend required)
// Keeps your old features intact
// ===================

// Tabs support (if present on page)
const setActiveTab = (name) => {
  $$('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.tab === name));
  $$('.panel').forEach(p => p.classList.toggle('is-active', p.id === `pane-${name}`));
};
$$('.tab').forEach(btn => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)));

// Simple local interpreter
function interpretDemo(text) {
  const motifs = [];
  const addIf = (re, tag) => re.test(text) && motifs.push(tag);

  addIf(/\bfly(?:ing)?\b|sky|float/i, 'flying');
  addIf(/\bwater|ocean|sea|rain|river|wave/i, 'water');
  addIf(/\bteeth?\b|tooth|dentist/i, 'teeth');
  addIf(/\bchase|chasing|run|running|escape/i, 'chase');
  addIf(/\bplane|airplane|crash|fall/i, 'flight');

  const sci = [];
  if (motifs.includes('flying') || motifs.includes('flight'))
    sci.push('REM sleep can include vestibular sensations—feeling of motion or flight—related to brainstem activity.');
  if (motifs.includes('water'))
    sci.push('Water often maps to interoception (body state) and emotion processing during REM.');
  if (motifs.includes('teeth'))
    sci.push('Teeth imagery can reflect somatic input (jaw tension) and concerns about control/appearance.');
  if (motifs.includes('chase'))
    sci.push('Threat-simulation theory: chase scenes rehearse avoidance and boundary-setting.');
  if (motifs.includes('flight'))
    sci.push('Crash/fall themes are common when stress or uncertainty rises; the brain simulates loss-of-control scenarios.');
  if (!sci.length) sci.push('Dreams blend memory, emotion regulation, and REM physiology.');

  const psych = 'Look for real-life parallels. Ask: What felt out of control? Choose one 5-minute action to reduce stress.';
  const spirit = 'Treat this dream as a nudge to ground yourself; write one sentence intention for tomorrow morning.';

  return {
    scientific: `<p>${sci.join(' ')}</p>`,
    psychological: `<p>${psych}</p>`,
    spiritual: `<p>${spirit}</p>`
  };
}

function showTextPanels(obj){
  const put = (id, html) => { const n = document.getElementById(id); if (n) n.innerHTML = html; };
  put('pane-scientific', obj.scientific || '—');
  put('pane-psychological', obj.psychological || '—');
  put('pane-spiritual', obj.spiritual || '—');
  setActiveTab('scientific');
}

// Dream art preview (SVG → data URL)
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

// Hook homepage controls if they exist
const interpretBtn = $('#interpretBtn');
if (interpretBtn){
  interpretBtn.addEventListener('click', ()=>{
    const text = ($('#dreamInput')?.value || '').trim();
    if (!text) return alert('Please describe your dream first.');
    const out = interpretDemo(text);
    showTextPanels(out);
  });
}

const imageBtn = $('#imageBtn');
if (imageBtn){
  imageBtn.addEventListener('click', ()=>{
    const text = ($('#dreamInput')?.value || '').trim();
    const n = Math.max(1, Math.min(99, text.length % 100));
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' width='1200' height='700'>
        <defs>
          <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0' stop-color='#121c3b'/>
            <stop offset='1' stop-color='#7aa8ff'/>
          </linearGradient>
          <filter id='glow'><feGaussianBlur stdDeviation='8' result='b'/><feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge></filter>
        </defs>
        <rect fill='url(#g)' width='100%' height='100%'/>
        <g filter='url(#glow)' opacity='0.85'>
          <circle cx='${200 + n*7}' cy='${160 + n*4}' r='${120 + n}' fill='#a7c4ff'/>
          <circle cx='${760 - n*3}' cy='${380 - n*2}' r='${90 + n/2}' fill='#7aa8ff'/>
        </g>
        <text x='50%' y='92%' fill='#e9f0ff' font-family='ui-sans-serif, system-ui' font-size='28' text-anchor='middle'>Dream Art (demo)</text>
      </svg>`;
    showImage(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
  });
}

const clearBtn = $('#clearBtn');
if (clearBtn) clearBtn.addEventListener('click', clearImage);

// Init default state for art box if it's on the page
clearImage();
