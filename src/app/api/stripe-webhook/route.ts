import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !endpointSecret) {
    return NextResponse.json({ error: "No signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getSupabase();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    await supabase.from("payments").upsert(
      {
        stripe_session_id: session.id,
        stripe_payment_intent_id: (session.payment_intent as string) || null,
        stripe_customer_id: (session.customer as string) || null,
        amount_cents: session.amount_total || 999,
        currency: session.currency || "eur",
        status: "completed",
        patient_name: session.metadata?.patient_name || null,
        patient_email: session.customer_details?.email || session.customer_email || null,
        patient_phone: session.metadata?.patient_phone || null,
        psychologist: session.metadata?.psychologist || null,
        source: session.metadata?.source || "unknown",
        metadata: {
          payment_method_types: session.payment_method_types,
          payment_status: session.payment_status,
        },
      },
      { onConflict: "stripe_session_id" },
    );
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;

    await supabase.from("payments").upsert(
      {
        stripe_session_id: session.id,
        amount_cents: session.amount_total || 999,
        currency: session.currency || "eur",
        status: "expired",
        patient_name: session.metadata?.patient_name || null,
        patient_email: session.customer_email || null,
        source: session.metadata?.source || "unknown",
      },
      { onConflict: "stripe_session_id" },
    );
  }

  return NextResponse.json({ received: true });
}
