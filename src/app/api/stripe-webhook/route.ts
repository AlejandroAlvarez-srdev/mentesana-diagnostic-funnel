import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, diagnosticoPaidEmail, diagnosticoSlotTakenEmail, ebookDeliveryEmail } from "@/lib/emails";
import { processCheckoutSessionCompleted } from "./process";
import { sendCAPIPurchase } from "@/lib/meta-capi-server";

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

  async function fireCapiPurchase(session: Stripe.Checkout.Session) {
    const md = session.metadata ?? {};
    const email = session.customer_details?.email || session.customer_email || "";
    const fullName = session.customer_details?.name || md.patient_name || "";
    const [firstName, ...rest] = fullName.split(" ").filter(Boolean);
    const lastName = rest.join(" ");
    const value = (session.amount_total ?? 0) / 100;
    if (value <= 0) {
      console.log("[webhook] CAPI skip: amount 0", session.id);
      return;
    }
    // event_id: prefiere el guardado en metadata para dedupe con el pixel client-side
    // (si el TYP page disparó Purchase con ese mismo id, Meta los une como 1 solo).
    const eventId = md.fb_event_id || `purchase_${session.id}`;
    const landing = md.landing_url || "https://mentesanapsicologia.com/test-diagnostico";
    // fbc: el de la metadata, o reconstruido desde el fbclid crudo (formato oficial
    // fb.1.{ts}.{fbclid}) si por lo que sea no se guardó el fbc derivado.
    const fbc = md.fbc || (md.fbclid ? `fb.1.${Date.now()}.${md.fbclid}` : undefined);
    const out = await sendCAPIPurchase({
      event_id: eventId,
      event_source_url: landing,
      value,
      currency: (session.currency || "EUR").toUpperCase(),
      content_name: md.product === "ebook" ? "Ebook Sanando desde adentro" : "Diagnóstico psicológico",
      user_data: {
        email: email || undefined,
        phone: md.patient_phone || undefined,
        fn: firstName || undefined,
        ln: lastName || undefined,
        country: "ES",
        fbc: fbc,
        fbp: md.fbp || undefined,
        external_id: md.patient_phone || email || session.id,
        client_ip_address: md.client_ip || undefined,
        client_user_agent: md.client_ua || undefined,
      },
      custom_data: {
        stripe_session_id: session.id,
        utm_source: md.utm_source || undefined,
        utm_campaign: md.utm_campaign || undefined,
        utm_content: md.utm_content || undefined,
      },
    });
    console.log("[webhook] CAPI Purchase:", out.ok ? "ok" : `FAIL ${out.error}`, "session=" + session.id, "fbc?", !!fbc, "fbclid?", !!md.fbclid, "value=" + value);
  }

  async function runProcessing(session: Stripe.Checkout.Session) {
    // Idempotency coarse-check: skip if already processed.
    // Real atomic claim happens inside processCheckoutSessionCompleted before
    // each sendEmail call via an UPDATE ... WHERE email_sent_at IS NULL.
    const existing = await supabase
      .from("payments")
      .select("status")
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
        buildSessionEmail: ({ name, psychologistName }: { name: string; amount: string; psychologistName: string }) => diagnosticoPaidEmail({ name, psychologistName, email: session.customer_details?.email || session.customer_email || "" }),
        buildSlotTakenEmail: ({ name, psychologistName }: { name: string; psychologistName: string }) => diagnosticoSlotTakenEmail({ name, psychologistName }),
        origin,
      });
      console.log("[webhook] result", JSON.stringify(result));
    } catch (err) {
      console.error("[webhook] FAIL inside processCheckoutSessionCompleted:", err instanceof Error ? err.stack : String(err));
    }
  }

  // ============ MAIN EVENT ROUTING ============
  // Solo escuchamos checkout.session.completed. Stripe también dispara
  // payment_intent.succeeded y charge.succeeded por el mismo pago, lo que
  // causaba 3x emails. La idempotencia atómica vive dentro de process.ts.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log("[webhook] completed", { id: session.id, product: session.metadata?.product, amount: session.amount_total });
    await runProcessing(session);
    // Dispara Purchase a Meta CAPI server-side (recupera atribución que el pixel
    // client-side se pierde si el usuario cierra el browser antes del TYP page).
    fireCapiPurchase(session).catch((e) => console.error("[webhook] CAPI fire fail:", e));
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
