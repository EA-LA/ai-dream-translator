// =======================================
// app.js — site-wide helpers + homepage demo
// =======================================

// Shorthands
const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// ------------------------
// Footer year
// ------------------------
(() => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

// ------------------------
// Responsive navbar (mobile hamburger)
// ------------------------
(() => {
  const shell = document.querySelector('.nav .nav-in');
  if (!shell) return;

  // ensure we have a hamburger button
  let btn = shell.querySelector('#menuBtn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'menuBtn';
    btn.className = 'hamburger';
    btn.setAttribute('aria-label', 'Toggle menu');
    btn.innerHTML = '<span></span>'; // middle bar; :before/:after are in CSS
    const links = shell.querySelector('.nav-links');
    if (links) shell.insertBefore(btn, links);
  }

  const open  = () => document.body.classList.add('nav-open');
  const close = () => document.body.classList.remove('nav-open');
  const toggle = () => document.body.classList.toggle('nav-open');

  btn.addEventListener('click', toggle);

  // close drawer when clicking any menu link/button
  document.addEventListener('click', (e) => {
    const a = e.target.closest('.nav-links a, .nav-links .btn');
    if (a) close();
  });

  // close when scrolling (prevents translucent bar overlaying content)
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (Math.abs(y - lastY) > 4) close();
    lastY = y;
  });

  // close when going back to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) close();
  });
})();

// ------------------------
// Tabs (interpretation panels)
// ------------------------
const setActiveTab = (name) => {
  $$('.tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
  $$('.panel').forEach((p) => p.classList.toggle('is-active', p.id === `pane-${name}`));
};
$$('.tab').forEach((btn) => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)));

// ------------------------
// Demo interpreter (no API cost)
// ------------------------
const demoInterpret = (text) => {
  const motifs = [];
  if (/fly|flying|sky/i.test(text)) motifs.push('flying');
  if (/water|ocean|sea|rain/i.test(text)) motifs.push('water');
  if (/teeth|tooth/i.test(text)) motifs.push('teeth');
  if (/chase|chasing|run/i.test(text)) motifs.push('chase');

  const s = [];
  if (motifs.includes('flying')) s.push('REM sleep often includes vestibular sensations; flying dreams may reflect sensory integration during REM.');
  if (motifs.includes('water')) s.push('Water symbols often mirror emotions and homeostasis; consider recent changes in mood or stress.');
  if (motifs.includes('teeth')) s.push('Teeth imagery can map to control/appearance concerns or nocturnal jaw tension.');
  if (motifs.includes('chase')) s.push('Threat simulation theory: chase dreams rehearse avoidance or boundary-setting.');

  return {
    scientific: `<p>${s.join(' ') || 'Dreams blend REM physiology, memory processing, and emotion regulation.'}</p>`,
    psychological: `<p>Look at real-life parallels: autonomy (flying), feelings (water), control (teeth), stress (chase). Identify one small action that reduces pressure.</p>`,
    spiritual: `<p>Read this as a gentle nudge to trust intuition and take one aligned step this week.</p>`
  };
};

const showText = (obj) => {
  const put = (id, html) => { const n = document.getElementById(id); if (n) n.innerHTML = html; };
  put('pane-scientific',   obj.scientific   || '—');
  put('pane-psychological',obj.psychological|| '—');
  put('pane-spiritual',    obj.spiritual    || '—');
};

const showImage = (dataUrl) => {
  const wrap = $('#imageWrap'); if (!wrap) return;
  wrap.innerHTML = '';
  const img = new Image(); img.src = dataUrl; img.alt = 'Dream Art';
  wrap.appendChild(img);
  const dl = $('#downloadBtn');
  if (dl){
    dl.disabled = false;
    dl.onclick = () => { const a=document.createElement('a'); a.href=dataUrl; a.download='dream-art.png'; a.click(); };
  }
};

const clearImage = () => {
  const wrap = $('#imageWrap');
  if (wrap) wrap.innerHTML = '<div class="image-empty">No image yet. Click <em>Generate Dream Art</em>.</div>';
  const dl = $('#downloadBtn'); if (dl) dl.disabled = true;
};

// ------------------------
// Hook homepage buttons
// ------------------------
const interpretBtn = $('#interpretBtn');
if (interpretBtn) {
  interpretBtn.addEventListener('click', () => {
    const textEl = $('#dreamInput');
    const text = textEl ? textEl.value.trim() : '';
    if (!text) { alert('Please describe your dream.'); return; }
    const out = demoInterpret(text);
    showText(out);
  });
}

const imageBtn = $('#imageBtn');
if (imageBtn) {
  imageBtn.addEventListener('click', () => {
    const svg = encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='700'>
        <defs>
          <linearGradient id='g' x1='0' x2='1'>
            <stop offset='0' stop-color='%23121c3b'/>
            <stop offset='1' stop-color='%237aa8ff'/>
          </linearGradient>
        </defs>
        <rect fill='url(%23g)' width='100%' height='100%'/>
        <text x='50%' y='50%' fill='white' font-family='ui-sans-serif,system-ui' font-size='36' text-anchor='middle'>
          Demo Dream Art
        </text>
      </svg>`
    );
    showImage(`data:image/svg+xml;utf8,${svg}`);
  });
}

const clearBtn = $('#clearBtn');
if (clearBtn) clearBtn.addEventListener('click', clearImage);

// ------------------------
// FAQ accordion
// ------------------------
$$('.faq-q').forEach((q) => {
  q.addEventListener('click', () => {
    q.classList.toggle('is-open');
    // close others
    $$('.faq-q').forEach((other) => { if (other !== q) other.classList.remove('is-open'); });
  });
});

// Initialize image placeholder (if present)
clearImage();
