const $ = (sel) => document.querySelector(sel);
$('#downloadBtn').onclick = () => {
const a = document.createElement('a');
a.href = dataUrl; a.download = 'dream-art.png'; a.click();
};
},
clearImage: () => {
$('#imageWrap').innerHTML = '<div class="image-empty">No image yet. Click <em>Generate Dream Art</em>.</div>';
$('#downloadBtn').disabled = true;
}
};


// Tabs click
Array.from(document.querySelectorAll('.tab')).forEach(btn => {
btn.addEventListener('click', () => UI.setActiveTab(btn.dataset.tab));
});


UI.year();
UI.clearImage();


const API_BASE = '';// same origin on Vercel; if using GitHub Pages + external API, set to 'https://your-vercel-app.vercel.app'


const demoInterpret = (text) => {
// Cheap local mock (no AI cost) — gives plausible content
const motifs = [];
if (/fly|flying|sky/i.test(text)) motifs.push('flying');
if (/water|ocean|sea/i.test(text)) motifs.push('water');
if (/teeth|tooth/i.test(text)) motifs.push('teeth');
if (/chase|chasing|run/i.test(text)) motifs.push('chase');
const s = [];
if (motifs.includes('flying')) s.push('REM sleep often includes vestibular sensations; flying dreams may reflect sensory integration during REM.');
if (motifs.includes('water')) s.push('Dream content frequently mirrors interoception; water can map to autonomic arousal and homeostatic themes.');
if (motifs.includes('teeth')) s.push('Teeth imagery may reflect nocturnal jaw activity or somatosensory input processed during REM.');
if (motifs.includes('chase')) s.push('Threat simulation theory suggests chase dreams rehearse avoidance behavior in a safe setting.');


return {
scientific: `<p>${s.join(' ') || 'Dreams arise from REM physiology, memory consolidation, and emotion regulation.'}</p>`,
psychological: `<p>Symbols point to current concerns. Flying → autonomy/escape. Water → emotions. Teeth → control/appearance. Chase → unresolved stress. Consider what in waking life matches these themes.</p>`,
spiritual: `<p>Read this as guidance: you are being nudged to release control and trust flow. Take a small brave step this week aligned with your deeper path.</p>`
};
};


async function interpretDream() {
const text = $('#dreamInput').value.trim();
if (!text) { alert('Please describe your dream.'); return; }
UI.setLoading(true);
try {
const demo = $('#demoToggle').checked || API_BASE === '' && typeof window.__NO_BACKEND !== 'undefined';
if (demo) {
const res = demoInterpret(text);
UI.showText(res);
return;
}
const r = await fetch(`${API_BASE}/api/interpret`, {
method: 'POST', headers: {'Content-Type':'application/json'},
body: JSON.stringify({ text })
});
const data = await r.json();
UI.showText(data);
} catch (e) {
console.error(e);
UI.showText({
scientific: '<p>Demo: Dreams involve REM physiology and memory replay.</p>',
psychological: '<p>Demo: Consider current stressors and needs.</p>',
spiritual: '<p>Demo: Trust intuitive signals; act gently.</p>'
});
} finally {
UI.setLoading(false);
}
}


async function generateImage() {
const text = $('#dreamInput').value.trim();
if (!text) { alert('Please describe your dream.'); return; }
try {
if ($('#demoToggle').checked) {
// Placeholder gradient image when in demo
const svg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='700'><defs><linearGradient id='g' x1='0' x2='1'><stop offset='0' stop-color='%23121c3b'/><stop offset='1' stop-color='%237aa8ff'/></linearGradient></defs><rect fill='url(%23g)' width='100%' height='100%'/><text x='50%' y='50%' fill='white' font-family='sans-serif' font-size='36' text-anchor='middle'>Demo Dream Art</text></svg>`);
UI.showImage(`data:image/svg+xml;utf8,${svg}`);
return;
}
const r = await fetch(`${API_BASE}/api/generate-image`, {
method: 'POST', headers: {'Content-Type':'application/json'},
body: JSON.stringify({ prompt: text })
});
const data = await r.json();
if (data.dataUrl) UI.showImage(data.dataUrl);
} catch (e) { console.error(e); }
}


$('#interpretBtn').addEventListener('click', interpretDream);
$('#imageBtn').addEventListener('click', generateImage);
$('#clearBtn').addEventListener('click', UI.clearImage);
