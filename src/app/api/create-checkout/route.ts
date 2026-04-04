import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const { email, name, phone, psychologistName } = await req.json();

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      locale: "es",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Primera Sesión — Mente Sana",
              description: `Sesión de 50 min con ${psychologistName || "tu psicóloga"}. Incluye: videollamada HD, informe personalizado, seguimiento WhatsApp 24h, asistente IA, eBook y meditaciones.`,
              images: ["https://mentesanapsicologia.comhttps://your-project.supabase.co/storage/v1/object/public/mentesana-images/logo.webp"],
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
      success_url: `${req.nextUrl.origin}/test/confirmacion?name=${encodeURIComponent(name || "")}&psych=${encodeURIComponent(psychologistName || "")}`,
      cancel_url: `${req.nextUrl.origin}/test/sobrio`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe error:", error);
    return NextResponse.json({ error: "Stripe failed" }, { status: 500 });
  }
}
