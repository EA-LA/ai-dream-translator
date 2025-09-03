// /api/create-checkout-session.js
// POST { price: 'price_XXXXX', success_url: string, cancel_url: string }
// Returns: { url }
import Stripe from 'stripe';

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
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'STRIPE_SECRET_KEY missing' });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const body = await readJSON(req);
    const { price, success_url, cancel_url } = body || {};
    if (!price) return res.status(400).json({ error: 'Missing "price"' });

    // Use the caller origin if URLs not explicitly passed
    const origin = req.headers['origin'] || `https://${req.headers['host']}`;
    const successURL = success_url || `${origin}/success.html`;
    const cancelURL  = cancel_url  || `${origin}/pricing.html`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: successURL + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelURL
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'checkout-failed' });
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
