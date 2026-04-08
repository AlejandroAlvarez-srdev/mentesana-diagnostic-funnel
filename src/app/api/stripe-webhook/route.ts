import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, paymentConfirmationEmail, ebookDeliveryEmail } from "@/lib/emails";
import { processCheckoutSessionCompleted } from "./process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fetchEbookPdfBase64(origin: string): Promise<string | null> {
  try {
    const url = `${origin}/ebooks/SANANDO%20DESDE%20ADENTRO.pdf`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("[webhook] PDF fetch failed", res.status, url);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.toString("base64");
  } catch (err) {
    console.error("[webhook] PDF fetch error:", err);
    return null;
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  httpClient: Stripe.createFetchHttpClient(),
});

function getSupabase() {
  // payments / ebook_purchases / feedback_responses live in the BLOG project (your-project).
  const url = process.env.NEXT_PUBLIC_BLOG_SUPABASE_URL!;
  const key =
    process.env.BLOG_SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_BLOG_SUPABASE_ANON_KEY!;
  return createClient(url.trim(), key.trim(), { auth: { persistSession: false } });
}

function getSecrets(): string[] {
  // Support multiple secrets (one per Stripe webhook endpoint) separated by comma.
  // Also keep backwards compat with the single-secret env var.
  const multi = process.env.STRIPE_WEBHOOK_SECRETS;
  const single = process.env.STRIPE_WEBHOOK_SECRET;
  const raw = (multi || single || "").split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
  return raw;
}

export async function POST(req: NextRequest) {
  const rawBody = Buffer.from(await req.arrayBuffer());
  const sig = req.headers.get("stripe-signature")?.trim();
  const secrets = getSecrets();

  console.log("[webhook] incoming", {
    hasSig: !!sig,
    secretsCount: secrets.length,
    secretPrefixes: secrets.map((s) => s.slice(0, 10)),
    bodyLen: rawBody.length,
  });

  if (!sig || secrets.length === 0) {
    return NextResponse.json({ error: "No signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event | null = null;
  let lastError = "";
  for (const secret of secrets) {
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, sig, secret);
      console.log("[webhook] signature OK with secret prefix", secret.slice(0, 10));
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  if (!event) {
    console.error("[webhook] CRITICAL: all secrets failed signature check:", lastError);
    return NextResponse.json({ error: "Invalid signature", detail: lastError }, { status: 400 });
  }

  console.log("[webhook] received", { type: event.type, id: (event.data.object as { id?: string })?.id });

  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
    console.log("[webhook] supabase client OK");
  } catch (err) {
    console.error("[webhook] FAIL building supabase client:", err);
    return NextResponse.json({ error: "Supabase init failed", detail: String(err) }, { status: 500 });
  }

  // Resolves a checkout session from a payment_intent id when Stripe sends
  // payment_intent.succeeded or charge.succeeded instead of checkout.session.completed.
  async function findSessionByPaymentIntent(paymentIntentId: string): Promise<Stripe.Checkout.Session | null> {
    try {
      const list = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
      return list.data[0] || null;
    } catch (err) {
      console.error("[webhook] could not look up session for PI:", paymentIntentId, err);
      return null;
    }
  }

  async function runProcessing(session: Stripe.Checkout.Session) {
    // Idempotency: skip if we already processed this session (sent email)
    const existing = await supabase
      .from("payments")
      .select("status, metadata")
      .eq("stripe_session_id", session.id)
      .maybeSingle();
    if (existing.data?.status === "completed") {
      console.log("[webhook] session already processed, skipping:", session.id);
      return;
    }
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://mentesanapsicologia.com";
    try {
      const result = await processCheckoutSessionCompleted(session, {
        supabase: supabase as unknown as Parameters<typeof processCheckoutSessionCompleted>[1]["supabase"],
        sendEmail,
        fetchPdf: fetchEbookPdfBase64,
        buildEbookEmail: ebookDeliveryEmail,
        buildSessionEmail: paymentConfirmationEmail,
        origin,
      });
      console.log("[webhook] result", JSON.stringify(result));
    } catch (err) {
      console.error("[webhook] FAIL inside processCheckoutSessionCompleted:", err instanceof Error ? err.stack : String(err));
    }
  }

  // ============ MAIN EVENT ROUTING ============
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log("[webhook] completed", { id: session.id, product: session.metadata?.product, amount: session.amount_total });
    await runProcessing(session);
  }

  else if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    console.log("[webhook] payment_intent.succeeded", { id: pi.id, amount: pi.amount });
    const session = await findSessionByPaymentIntent(pi.id);
    if (session) {
      console.log("[webhook] resolved session for PI:", session.id);
      await runProcessing(session);
    } else {
      console.log("[webhook] no checkout session found for PI:", pi.id);
    }
  }

  else if (event.type === "charge.succeeded") {
    const charge = event.data.object as Stripe.Charge;
    console.log("[webhook] charge.succeeded", { id: charge.id, amount: charge.amount, pi: charge.payment_intent });
    if (charge.payment_intent) {
      const session = await findSessionByPaymentIntent(charge.payment_intent as string);
      if (session) {
        console.log("[webhook] resolved session for charge:", session.id);
        await runProcessing(session);
      } else {
        console.log("[webhook] no checkout session found for charge:", charge.id);
      }
    }
  }

  else if (event.type === "checkout.session.expired") {
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

  else {
    console.log("[webhook] event ignored:", event.type);
  }

  return NextResponse.json({ received: true });
}
