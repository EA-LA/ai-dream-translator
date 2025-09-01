// /api/create-checkout-session.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const PRICES = {
  lite: {
    monthly: process.env.STRIPE_PRICE_LITE_MONTHLY,
    yearly:  process.env.STRIPE_PRICE_LITE_YEARLY,
  },
  standard: {
    monthly: process.env.STRIPE_PRICE_STANDARD_MONTHLY,
    yearly:  process.env.STRIPE_PRICE_STANDARD_YEARLY,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
    yearly:  process.env.STRIPE_PRICE_PRO_YEARLY,
  },
};

export default async function handler(req, res) {
  try {
    // Accept both GET (query) and POST (json) for convenience
    const src = req.method === "POST" ? req.body : req.query;
    const plan = (src.plan || "lite").toLowerCase();
    const mode = (src.mode || "monthly").toLowerCase(); // 'monthly' | 'yearly'

    const priceId = PRICES[plan]?.[mode];
    if (!priceId) return res.status(400).json({ error: "Invalid plan or mode." });

    const origin =
      (req.headers["x-forwarded-proto"] ? `${req.headers["x-forwarded-proto"]}://` : "https://") +
      (req.headers.host || "ai-dream-translator.vercel.app");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/success.html?plan=${encodeURIComponent(plan)}&mode=${encodeURIComponent(mode)}`,
      cancel_url: `${origin}/pricing.html`,
      allow_promotion_codes: true,
      metadata: { plan, mode },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create checkout session." });
  }
}
