// /api/generate-image.js — Vercel Serverless Function
export default async function handler(req, res) {
if (req.method === 'OPTIONS') {
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
return res.status(200).end();
}
if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });


try {
const { prompt } = req.body || {};
if (!prompt) return res.status(400).json({ error: 'Missing prompt' });


// OpenAI Images — returns base64 to keep it simple
const r = await fetch('https://api.openai.com/v1/images/generations', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
},
body: JSON.stringify({
model: 'gpt-image-1',
prompt: `Dreamlike surreal art, cinematic, soft moonlight, ethereal mist, detailed, ${prompt}`,
size: '1024x1024',
response_format: 'b64_json'
})
});


if (!r.ok) {
const err = await r.text();
return res.status(500).json({ error: 'Upstream error', detail: err });
}


const data = await r.json();
const b64 = data?.data?.[0]?.b64_json;
const dataUrl = `data:image/png;base64,${b64}`;
res.setHeader('Access-Control-Allow-Origin', '*');
res.status(200).json({ dataUrl });
} catch (e) {
res.status(500).json({ error: 'Server error', detail: String(e) });
}
}
