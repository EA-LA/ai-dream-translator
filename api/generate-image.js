// api/generate-image.js
// Uses Cloudflare Workers AI (Stable Diffusion) to return a base64 PNG.
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

    // Stable Diffusion XL (text-to-image)
    const model = '@cf/stabilityai/stable-diffusion-xl-base-1.0';

    const prompt = [
      'dreamlike surreal cinematic artwork, soft light, high detail, vivid but tasteful colors,',
      'inspired by the user dream: ',
      text
    ].join(' ');

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${encodeURIComponent(model)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          // optional params: width, height, steps, cfg_scale, seed
          // width: 832, height: 512
        })
      }
    );

    if (!cfRes.ok) {
      const err = await cfRes.text();
      console.error('CF image error:', err);
      return res.status(502).json({ error: 'cloudflare-failed', detail: err });
    }

    const data = await cfRes.json(); // { result: { image: "<base64>" } }
    const b64  = data?.result?.image;
    if (!b64) return res.status(500).json({ error: 'no-image' });

    return res.status(200).json({ imageDataUrl: `data:image/png;base64,${b64}` });
  } catch (err) {
    console.error(err);
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
