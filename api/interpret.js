// api/interpret.js
// Uses Cloudflare Workers AI (free tier) to return 3 perspectives.
// Needs env vars: CF_ACCOUNT_ID, CF_API_TOKEN (set in Vercel)

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
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = await readJSON(req);
    const text = (body?.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Missing "text" in body.' });

    const accountId = process.env.CF_ACCOUNT_ID;
    const token     = process.env.CF_API_TOKEN;

    if (!accountId || !token) {
      return res.status(500).json({ error: 'Cloudflare credentials missing' });
    }

    // Good, inexpensive instruction-tuned model
    const model = '@cf/meta/llama-3.1-8b-instruct';

    const prompt = `
You are a friendly dream analyst. Given a user's dream, return three short sections as JSON keys:
- scientific: 1–2 sentences grounded in sleep science/REM
- psychological: 1–2 sentences with practical reflection prompts
- spiritual: 1 sentence gentle/meaning focused
Keep it concise. Return plain text in each value.
User dream: """${text}"""`.trim();

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${encodeURIComponent(model)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are concise and helpful.' },
            { role: 'user', content: prompt }
          ]
        })
      }
    );

    if (!cfRes.ok) {
      const err = await cfRes.text();
      console.error('CF interpret error:', err);
      return res.status(502).json({ error: 'cloudflare-failed', detail: err });
    }

    const data = await cfRes.json(); // { result: { response: "..." } }
    const raw = data?.result?.response || '';
    // Very light parser: try to split into three sections if present, otherwise return same text in scientific.
    const out = smartSplit(raw);

    return res.status(200).json(out);
  } catch (err) {
    console.error(err);
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

// Try to detect keys in the LLM response.
// Falls back to putting everything into "scientific".
function smartSplit(s) {
  const lower = s.toLowerCase();
  const o = { scientific: '', psychological: '', spiritual: '' };

  // JSON-looking?
  try {
    const maybe = JSON.parse(s);
    if (maybe.scientific || maybe.psychological || maybe.spiritual) {
      return {
        scientific: (maybe.scientific || '').toString(),
        psychological: (maybe.psychological || '').toString(),
        spiritual: (maybe.spiritual || '').toString()
      };
    }
  } catch {}

  // Headings style
  const sciIdx = lower.indexOf('scientific');
  const psyIdx = lower.indexOf('psychological');
  const spiIdx = lower.indexOf('spiritual');

  if (sciIdx !== -1 || psyIdx !== -1 || spiIdx !== -1) {
    const parts = [
      ['scientific', sciIdx === -1 ? 1e9 : sciIdx],
      ['psychological', psyIdx === -1 ? 1e9 : psyIdx],
      ['spiritual', spiIdx === -1 ? 1e9 : spiIdx]
    ].sort((a,b)=>a[1]-b[1]);

    const get = (i) => s.slice(parts[i][1], parts[i+1]?.[1] ?? s.length)
      .replace(/^\s*[-*#: ]*\w+\s*[:\-–]\s*/i,'')
      .trim();

    return {
      scientific: parts[0][1]===1e9 ? '' : get(0),
      psychological: parts[1][1]===1e9 ? '' : get(1),
      spiritual: parts[2][1]===1e9 ? '' : get(2)
    };
  }

  // Fallback
  o.scientific = s.trim();
  return o;
}
