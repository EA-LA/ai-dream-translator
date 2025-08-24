// /api/interpret.js — Vercel Serverless Function
export default async function handler(req, res) {
if (req.method === 'OPTIONS') {
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
return res.status(200).end();
}
if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });


try {
const { text } = req.body || {};
if (!text) return res.status(400).json({ error: 'Missing text' });


const sys = `You are an expert dream analyst. Return strict JSON with keys scientific, psychological, spiritual.\n- scientific: REM/physiology/neuroscience angle in 3-5 sentences.\n- psychological: Jung/Freud/Cognitive insights in 3-5 sentences, grounded & practical.\n- spiritual: kind, non-dogmatic reflection + 1 gentle action for the week.\nDo not include markdown.`;


const r = await fetch('https://api.openai.com/v1/chat/completions', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
},
body: JSON.stringify({
model: 'gpt-4o-mini',
temperature: 0.7,
response_format: { type: 'json_object' },
messages: [
{ role: 'system', content: sys },
{ role: 'user', content: text }
]
})
});


if (!r.ok) {
const err = await r.text();
return res.status(500).json({ error: 'Upstream error', detail: err });
}


const out = await r.json();
const content = out?.choices?.[0]?.message?.content || '{}';
res.setHeader('Access-Control-Allow-Origin', '*');
res.status(200).send(content);
} catch (e) {
res.status(500).json({ error: 'Server error', detail: String(e) });
}
}
