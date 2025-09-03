// /api/generate-image.js
// POST { text: "prompt..." } -> { imageDataUrl: "data:image/png;base64,..." }
// If no OPENAI_API_KEY, returns an SVG placeholder.

const SVG_FALLBACK = (t) =>
  `data:image/svg+xml;utf8,` +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1024' height='1024'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#0a1026'/>
          <stop offset='100%' stop-color='#0f274b'/>
        </linearGradient>
      </defs>
      <rect width='100%' height='100%' fill='url(#g)'/>
      <g fill='white' font-family='Inter,system-ui,-apple-system,Segoe UI,Roboto' text-anchor='middle'>
        <text x='50%' y='50%' font-size='42'>Dream Art Placeholder</text>
        <text x='50%' y='56%' font-size='20' opacity='.8'>${(t||'').slice(0,80)}</text>
      </g>
    </svg>`
  );

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
      return res.status(200).json({ imageDataUrl: SVG_FALLBACK(text) });
    }

    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt:
          `Create a surreal, dreamlike, cinematic artwork based on this dream: ${text}. ` +
          `Soft volumetric light, high detail, tasteful color, subtle glow.`,
        size: '1024x1024'
      })
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(502).json({ error: 'openai-failed', detail: err });
    }

    const j = await r.json();
    const b64 = j?.data?.[0]?.b64_json;
    if (!b64) return res.status(500).json({ error: 'no-image' });

    return res.status(200).json({ imageDataUrl: `data:image/png;base64,${b64}` });
  } catch (e) {
    return res.status(500).json({ error: 'image-failed', detail: String(e?.message || e) });
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
