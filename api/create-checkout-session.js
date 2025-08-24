// /api/create-checkout-session.js — Vercel Serverless Function
// Needs env vars: STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_YEARLY (optional)

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const wantYearly = body.priceId === 'YEARLY';
    const priceId = wantYearly
      ? process.env.STRIPE_PRICE_YEARLY || process.env.STRIPE_PRICE_MONTHLY
      : process.env.STRIPE_PRICE_MONTHLY;

    if (!priceId) return res.status(500).json({ error: 'Server missing price IDs' });

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      customer_email: body.email || undefined,
      success_url: body.successUrl || `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: body.cancelUrl || `${req.headers.origin}/pricing.html`,
      // later: client_reference_id: body.uid || null,
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: 'Stripe error', detail: String(err) });
  }
}
