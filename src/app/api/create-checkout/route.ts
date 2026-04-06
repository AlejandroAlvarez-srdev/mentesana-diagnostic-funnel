import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  httpClient: Stripe.createFetchHttpClient(),
});

export async function POST(req: NextRequest) {
  const { email, name, phone, psychologistName } = await req.json();

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      locale: "es",
      ui_mode: "embedded" as Stripe.Checkout.SessionCreateParams.UiMode,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Primera Sesión — Mente Sana",
              description: `Sesión de 50 min con ${psychologistName || "tu psicóloga"}. Incluye: videollamada HD, informe personalizado, seguimiento WhatsApp 24h, asistente IA, eBook y meditaciones.`,
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
      },
      return_url: `${req.nextUrl.origin}/test/confirmacion?session_id={CHECKOUT_SESSION_ID}&name=${encodeURIComponent(name || "")}&psych=${encodeURIComponent(psychologistName || "")}`,
    });

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Stripe error:", message);
    return NextResponse.json({ error: "Stripe failed", detail: message }, { status: 500 });
  }
}
