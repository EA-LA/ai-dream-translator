// /api/generate-image.js
// POST { text: string }
// Returns: { imageDataUrl: 'data:image/png;base64,...' }
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

    // Use OpenAI images (vectorizer is good; you can switch to dall-e-3 if you prefer)
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: [
          'dreamlike surreal cinematic artwork, soft light, high detail, tasteful color grading,',
          'inspired by this dream description: ',
          text
        ].join(' '),
        size: '1024x1024',
        response_format: 'b64_json'
      })
    });

    if (!r.ok) {
      const err = await r.text();
      console.error('openai image error:', err);
      return res.status(502).json({ error: 'openai-failed', detail: err });
    }

    const data = await r.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return res.status(500).json({ error: 'no-image' });

    return res.status(200).json({ imageDataUrl: `data:image/png;base64,${b64}` });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'image-failed' });
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
