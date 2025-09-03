/* =======================
   Helpers
   ======================= */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const todayISO = () => new Date().toISOString().slice(0,10);
const escapeHTML = (s) => s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

/* =======================
   Local storage model
   ======================= */
const LS = { dreams:'adt_dreams', profile:'adt_profile', prefs:'adt_prefs', usage:'adt_usage', plan:'adt_plan' };
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

function getDreams(){ return load(LS.dreams, []); }
function setDreams(v){ save(LS.dreams, v); }
function addDream(text){
  const arr = getDreams();
  arr.unshift({ id:crypto.randomUUID(), text, date:new Date().toISOString() });
  setDreams(arr);
}
function calcStreak(){
  const byDay = new Set(getDreams().map(d => d.date.slice(0,10)));
  let s=0; for(let i=0;;i++){ const d=new Date(); d.setDate(d.getDate()-i); if(byDay.has(d.toISOString().slice(0,10))) s++; else break; }
  return s;
}
function countThisWeek(){ const now=new Date(), start=new Date(); start.setDate(now.getDate()-6); return getDreams().filter(d=>new Date(d.date)>=start).length; }

/* =======================
   Plans / limits
   ======================= */
const ENTITLEMENTS = {
  free:{ label:"Free", daily:{interpret:2, art:1} },
  lite:{ label:"Lite", daily:{interpret:8, art:3} },
  standard:{ label:"Standard", daily:{interpret:Infinity, art:10} },
  pro:{ label:"Pro", daily:{interpret:Infinity, art:150} },
};
const plan = () => localStorage.getItem(LS.plan) || 'free';
const setPlan = (p) => ENTITLEMENTS[p] && localStorage.setItem(LS.plan, p);

const dayKey = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
function usage(){ const u=load(LS.usage, null); const t=dayKey(); return (u && u.date===t)?u:{date:t, interpret:0, art:0}; }
function saveUsage(u){ save(LS.usage, u); }
function hasQuota(kind){
  const lim = ENTITLEMENTS[plan()].daily[kind];
  const u = usage()[kind] || 0;
  return (lim===Infinity) || (u<lim);
}
function bump(kind){ const u=usage(); u[kind]=(u[kind]||0)+1; saveUsage(u); updateUsageUI(); }

/* =======================
   UI helpers
   ======================= */
function renderStats(){
  const c=$('#statCount'), s=$('#statStreak'), w=$('#statThisWeek');
  if(c) c.textContent = getDreams().length;
  if(s) s.textContent = calcStreak();
  if(w) w.textContent = countThisWeek();
}
function renderJournal(){
  const list=$('#journalList'), empty=$('#emptyMsg'); if(!list) return;
  const range = ($('#filterSelect')?.value)||'all';
  let items = getDreams();
  const now = new Date();
  if(range==='week'){ const start=new Date(); start.setDate(now.getDate()-6); items=items.filter(d=>new Date(d.date)>=start); }
  if(range==='month'){ const start=new Date(); start.setDate(now.getDate()-30); items=items.filter(d=>new Date(d.date)>=start); }

  list.innerHTML='';
  if(!items.length){ empty?.classList.remove('hidden'); return; }
  empty?.classList.add('hidden');

  items.forEach(d=>{
    const li=document.createElement('li'); li.className='journal-item';
    li.innerHTML = `
      <div class="journal-date">${new Date(d.date).toLocaleString()}</div>
      <div class="journal-text">${escapeHTML(d.text)}</div>
      <div class="row mt">
        <button class="btn ghost" data-share="${d.id}">Share</button>
        <button class="btn ghost" data-delete="${d.id}">Delete</button>
      </div>`;
    list.appendChild(li);
  });

  list.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>{
    const id=b.getAttribute('data-delete'); setDreams(getDreams().filter(x=>x.id!==id)); renderJournal(); renderStats();
  }));
  list.querySelectorAll('[data-share]').forEach(b=>b.addEventListener('click', async ()=>{
    const id=b.getAttribute('data-share'); const it=getDreams().find(x=>x.id===id); if(!it) return;
    const txt=`My dream (${it.date.slice(0,10)}): ${it.text}`;
    if(navigator.share) await navigator.share({title:'Dream Journal', text:txt}); else { await navigator.clipboard.writeText(txt); alert('Copied to clipboard'); }
  }));
}

function updateUsageUI(){
  const u=usage(), lim=ENTITLEMENTS[plan()].daily;
  const boxes=$$('.stat-box p');
  if(boxes[0]) boxes[0].textContent = `${u.interpret||0} / ${lim.interpret===Infinity?'∞':lim.interpret}`;
  if(boxes[1]) boxes[1].textContent = `${u.art||0} / ${lim.art===Infinity?'∞':lim.art}`;
  $$('.plan-badge,[data-plan-badge]').forEach(el=>el.textContent=ENTITLEMENTS[plan()].label);
}

/* =======================
   Backend calls
   ======================= */
async function callInterpretAPI(text){
  try{
    const r = await fetch('/api/interpret',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ text })
    });
    if(!r.ok) throw new Error('bad');
    const j = await r.json();
    if(j && (j.scientific||j.psychological||j.spiritual)) return j;
    throw new Error('shape');
  }catch(e){
    // tiny built-in fallback
    const motifs=[], add=(re,t)=>re.test(text)&&motifs.push(t);
    add(/\bfly|float|sky|airplane|plane|crash|fall/i,'flight');
    add(/\bwater|ocean|sea|wave|rain|river/i,'water');
    add(/\bteeth|tooth|dentist/i,'teeth');
    add(/\bchase|run|escape/i,'chase');
    const out=[];
    if(motifs.includes('flight')) out.push('Vestibular sensations in REM can feel like falling or flying—your brain rehearses loss-of-control safely.');
    if(motifs.includes('water')) out.push('Water often mirrors big emotions during REM.');
    if(motifs.includes('teeth')) out.push('Teeth images can reflect jaw tension or control/appearance concerns.');
    if(motifs.includes('chase')) out.push('Threat-simulation: your brain practices boundaries & avoidance.');
    if(!out.length) out.push('Dreams blend memory, emotion regulation, and REM physiology.');
    return {
      scientific:`<p>${out.join(' ')}</p>`,
      psychological:`<p>Look for a real-life parallel. What felt out of control? Pick one 5-minute action that reduces stress.</p>`,
      spiritual:`<p>Treat this as a nudge to ground yourself. Write one-sentence intention for tomorrow morning.</p>`
    };
  }
}

async function callImageAPI(text){
  try{
    // IMPORTANT: send { text } to match our /api/generate-image.js
    const r = await fetch('/api/generate-image',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ text })
    });
    if(!r.ok) throw new Error('bad');
    const j = await r.json();
    if(j?.imageDataUrl) return j.imageDataUrl;
    throw new Error('shape');
  }catch(e){
    // gradient SVG fallback
    const n=Math.max(1,Math.min(99,text.length%100));
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' width='1200' height='700'>
        <defs>
          <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0' stop-color='#121c3b'/><stop offset='1' stop-color='#7aa8ff'/>
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
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
}

/* =======================
   Renderers
   ======================= */
function showInterpretation(obj){
  const simple = $('#interpretationText'); // index.html target
  if(simple){
    const html = `
      <div class="mt small"><strong>Scientific</strong> ${obj.scientific||''}</div>
      <div class="mt small"><strong>Psychological</strong> ${obj.psychological||''}</div>
      <div class="mt small"><strong>Spiritual</strong> ${obj.spiritual||''}</div>`;
    simple.innerHTML = html;
    return;
  }
  // 3-pane fallback (if you made panes elsewhere)
  const put = (id, html) => { const n = $('#'+id); if(n) n.innerHTML = html; };
  put('pane-scientific', obj.scientific||'—');
  put('pane-psychological', obj.psychological||'—');
  put('pane-spiritual', obj.spiritual||'—');
}

function showImage(dataUrl){
  const wrap = $('#imageWrap') || $('#artResult');
  if(!wrap) return;
  wrap.innerHTML = '';
  const img=new Image(); img.src=dataUrl; img.alt='Dream Art'; img.style.maxWidth='100%';
  wrap.appendChild(img);

  const dl = $('#downloadBtn') || $('#downloadArtBtn');
  if(dl){
    dl.removeAttribute('disabled');
    dl.onclick = ()=>{
      const a=document.createElement('a'); a.href=dataUrl; a.download='dream-art.png'; a.click();
    };
  }
}
function clearImage(){
  const wrap = $('#imageWrap') || $('#artResult');
  if(wrap) wrap.innerHTML = 'No image yet. Click <strong>Generate Dream Art</strong>.';
  ( $('#downloadBtn') || $('#downloadArtBtn') )?.setAttribute('disabled','disabled');
}

/* =======================
   Wire: NAV + footer
   ======================= */
$('#year') && ($('#year').textContent = new Date().getFullYear());
$('#hamburger')?.addEventListener('click',()=>document.body.classList.toggle('nav-open'));

/* =======================
   Wire: Index (home) page
   ======================= */
(function wireHome(){
  const dream = $('#dreamInput'); if(!dream) return; // only on index
  const interpretBtn = $('#interpretBtn');
  const imageBtn = $('#generateArtBtn') || $('#imageBtn');
  const clearBtn = $('#clearArtBtn') || $('#clearBtn');

  interpretBtn?.addEventListener('click', async ()=>{
    const text = dream.value.trim();
    if(!text) return alert('Please describe your dream first.');
    if(!hasQuota('interpret')) return alert(`Limit reached on ${ENTITLEMENTS[plan()].label} plan.`);
    const out = await callInterpretAPI(text);
    showInterpretation(out);
    bump('interpret');
  });

  imageBtn?.addEventListener('click', async ()=>{
    const text = dream.value.trim();
    if(!text) return alert('Please describe your dream first.');
    if(!hasQuota('art')) return alert(`Limit reached on ${ENTITLEMENTS[plan()].label} plan.`);
    const url = await callImageAPI(text);
    showImage(url);
    bump('art');
  });

  clearBtn?.addEventListener('click', clearImage);
  clearImage();
})();

/* =======================
   Wire: Dashboard page
   ======================= */
(function wireDashboard(){
  const txt = $('#dreamText') || $('#quickStart textarea') || $('#dashboard textarea');
  if(!txt) return; // not on dashboard

  // Save
  const saveBtn = $('#saveDreamBtn') || $$('button').find(b=>/^\s*save\s*$/i.test(b.textContent));
  saveBtn?.addEventListener('click', ()=>{
    const t = (txt.value||'').trim();
    if(!t) return alert('Please write something first.');
    addDream(t); txt.value='';
    renderJournal(); renderStats();
    alert('Saved!');
  });

  // Interpret & Art
  const goBtn = $('#interpretBtn2') || $$('button').find(b=>/interpret\s*&?\s*art/i.test(b.textContent));
  goBtn?.addEventListener('click', async ()=>{
    const t=(txt.value||'').trim(); if(!t) return alert('Please describe your dream first.');
    if(!hasQuota('interpret')) return alert(`Limit reached on ${ENTITLEMENTS[plan()].label} plan.`);
    const out = await callInterpretAPI(t);
    addDream(t); renderJournal(); renderStats(); bump('interpret');
    alert('Interpretation ready on Home.');
  });

  // Share last
  $('#shareLastBtn')?.addEventListener('click', async ()=>{
    const last=getDreams()[0]; if(!last) return alert('No entries yet.');
    const text = `My dream (${last.date.slice(0,10)}): ${last.text}`;
    if(navigator.share) await navigator.share({title:'Dream Journal', text}); else { await navigator.clipboard.writeText(text); alert('Copied to clipboard'); }
  });

  // Clear all
  $('#clearAllBtn')?.addEventListener('click', ()=>{
    if(confirm('Delete ALL local dreams?')){ setDreams([]); renderJournal(); renderStats(); }
  });

  // Quick actions
  $('#exportDataBtn')?.addEventListener('click', ()=>{
    const blob=new Blob([JSON.stringify({dreams:getDreams()},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`dream-journal-${todayISO()}.json`; a.click(); URL.revokeObjectURL(url);
  });
  $('#importDataInput')?.addEventListener('change', async (e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    try{
      const j=JSON.parse(await f.text());
      if(Array.isArray(j.dreams)) setDreams(j.dreams);
      renderJournal(); renderStats(); alert('Imported.');
    }catch{ alert('Invalid file.'); }
  });
  $('#deleteLocalBtn')?.addEventListener('click', ()=>{
    if(confirm('Delete all local data?')){
      localStorage.removeItem(LS.dreams);
      localStorage.removeItem(LS.usage);
      renderJournal(); renderStats();
    }
  });

  renderJournal(); renderStats(); updateUsageUI();
})();

/* =======================
   Midnight reset (daily quota)
   ======================= */
(function midnightReset(){
  const now=new Date(); const midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,0,0,1);
  setTimeout(()=>{ saveUsage({date:dayKey(), interpret:0, art:0}); updateUsageUI(); }, midnight-now);
})();
