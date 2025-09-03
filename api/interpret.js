// /api/interpret.js
// POST { text: "your dream..." } -> { scientific, psychological, spiritual }
// Falls back to a short demo response if OPENAI_API_KEY is not set.

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
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const body = await readJSON(req);
    const text = (body?.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Missing "text"' });

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      // demo response if no key configured
      return res.status(200).json({
        scientific:
          'Dreams combine REM physiology with memory consolidation; themes often echo recent stressors.',
        psychological:
          'Notice what the situation mirrors in waking life. Choose one small action to regain agency.',
        spiritual:
          'Treat this as a gentle nudge to act with courage and clarity today.'
      });
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Return JSON ONLY with keys {scientific, psychological, spiritual}. Each key: 2–4 concise sentences. No markdown.'
          },
          { role: 'user', content: `Analyze this dream:\n\n${text}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8
      })
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(502).json({ error: 'openai-failed', detail: err });
    }

    const j = await r.json();
    let out = {};
    try { out = JSON.parse(j?.choices?.[0]?.message?.content || '{}'); } catch {}

    return res.status(200).json({
      scientific: out.scientific || '',
      psychological: out.psychological || '',
      spiritual: out.spiritual || ''
    });
  } catch (e) {
    return res.status(500).json({ error: 'interpret-failed', detail: String(e?.message || e) });
  }
}

function readJSON(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', c => (d += c));
    req.on('end', () => {
      try { resolve(JSON.parse(d || '{}')); }
      catch (e) { reject(e); }
    });
  });
}
