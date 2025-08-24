// /api/create-checkout-session.js — Vercel Serverless Function

export default async function handler(req, res) {
  // Quick GET so you can open in the browser and NOT get 404 HTML.
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    return res
      .status(200)
      .end(JSON.stringify({ ok: true, info: 'POST here to create a Stripe Checkout session.' }));
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).end(JSON.stringify({ error: 'Method not allowed' }));
  }

  try {
    const body = req.body || {};
    const wantYearly = body.priceId === 'YEARLY';
    const priceId = wantYearly
      ? process.env.STRIPE_PRICE_YEARLY || process.env.STRIPE_PRICE_MONTHLY
      : process.env.STRIPE_PRICE_MONTHLY;

    if (!process.env.STRIPE_SECRET_KEY) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).end(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY env var' }));
    }
    if (!priceId) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).end(JSON.stringify({ error: 'Server missing price IDs' }));
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      customer_email: body.email || undefined,
      success_url: body.successUrl || `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: body.cancelUrl || `${req.headers.origin}/pricing.html`
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).end(JSON.stringify({ url: session.url }));
  } catch (err) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).end(JSON.stringify({ error: 'Stripe error', detail: String(err) }));
  }
}
