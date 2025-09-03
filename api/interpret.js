// /api/interpret.js
// POST { text: string }
// Returns: { scientific, psychological, spiritual }
export default async function handler(req, res) {
  // CORS + preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  try {
    const body = await readJSON(req);
    const text = (body?.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Missing "text".' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY missing' });

    const prompt = `
You are a concise dream analyst. Given a user's dream, return JSON with 3 keys:
- scientific: 1–2 sentences grounded in sleep science/REM.
- psychological: 1–2 sentences with practical reflection prompts.
- spiritual: 1 sentence on gentle meaning and symbols.
Keep each value plain text (no quotes inside), and do not add any extra keys.

User dream: """${text}"""
`.trim();

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // small + cheap, good quality
        messages: [
          { role: 'system', content: 'You are concise and helpful. Output valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6
      })
    });

    if (!r.ok) {
      const err = await r.text();
      console.error('openai interpret error:', err);
      return res.status(502).json({ error: 'openai-failed', detail: err });
    }

    const data = await r.json();
    const raw = data?.choices?.[0]?.message?.content || '{}';

    // Make sure we return a clean object with our 3 keys.
    let out = { scientific: '', psychological: '', spiritual: '' };
    try {
      const j = JSON.parse(raw);
      out.scientific = (j.scientific || '').toString();
      out.psychological = (j.psychological || '').toString();
      out.spiritual = (j.spiritual || '').toString();
    } catch {
      // fallback: dump everything into scientific
      out.scientific = raw;
    }

    return res.status(200).json(out);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'interpret-failed' });
  }
}

function readJSON(req){
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', c => (d += c));
    req.on('end', () => {
      try { resolve(JSON.parse(d || '{}')); }
      catch (e) { reject(e); }
    });
  });
}
