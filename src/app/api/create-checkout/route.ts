import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  httpClient: Stripe.createFetchHttpClient(),
});

export async function POST(req: NextRequest) {
  const { email, name, phone, psychologistName, utms } = await req.json();
  const u = utms || {};

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email || undefined,
      locale: "es",
      ui_mode: "embedded_page" as Stripe.Checkout.SessionCreateParams.UiMode,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Diagnóstico Psicológico — Mente Sana",
              description: `Diagnóstico clínico con ${psychologistName || "tu psicóloga"}. Incluye: informe personalizado, matching, sesión con tu psicóloga 50 min, plan de acción.`,
              images: ["https://mentesanapsicologia.com/images/logo.webp"],
            },
            unit_amount: 999,
          },
          quantity: 1,
        },
      ],
      metadata: {
        patient_name: name,
        patient_phone: phone || "",
        psychologist: psychologistName || "",
        source: "test-sobrio",
        scheduled_date: (u.scheduled_date || "").slice(0, 20),
        scheduled_time: (u.scheduled_time || "").slice(0, 10),
        utm_source: (u.utm_source || "").slice(0, 120),
        utm_medium: (u.utm_medium || "").slice(0, 120),
        utm_campaign: (u.utm_campaign || "").slice(0, 120),
        utm_content: (u.utm_content || "").slice(0, 120),
        utm_term: (u.utm_term || "").slice(0, 120),
        referrer: (u.referrer || "").slice(0, 200),
        landing_page: (u.landing_page || "").slice(0, 200),
      },
      client_reference_id: [u.utm_source, u.utm_medium, u.utm_campaign].filter(Boolean).join("|").slice(0, 200) || undefined,
      return_url: `https://confrimacionregistro.vercel.app/?session_id={CHECKOUT_SESSION_ID}&name=${encodeURIComponent(name || "")}&psych=${encodeURIComponent(psychologistName || "")}`,
    });

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Stripe error:", message);
    return NextResponse.json({ error: "Stripe failed", detail: message }, { status: 500 });
  }
}
