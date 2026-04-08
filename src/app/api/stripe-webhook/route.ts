import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, paymentConfirmationEmail, ebookDeliveryEmail } from "@/lib/emails";

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

export async function POST(req: NextRequest) {
  const rawBody = Buffer.from(await req.arrayBuffer());
  const sig = req.headers.get("stripe-signature")?.trim();
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  console.log("[webhook] incoming", {
    hasSig: !!sig,
    hasSecret: !!endpointSecret,
    secretPrefix: endpointSecret ? endpointSecret.slice(0, 8) : null,
    bodyLen: rawBody.length,
  });

  if (!sig || !endpointSecret) {
    return NextResponse.json({ error: "No signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, endpointSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[webhook] signature verification failed:", msg);
    return NextResponse.json({ error: "Invalid signature", detail: msg }, { status: 400 });
  }

  const supabase = getSupabase();

  console.log("[webhook] received", event.type, (event.data.object as { id?: string })?.id);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const patientEmail = session.customer_details?.email || session.customer_email;
    const patientName = session.metadata?.patient_name || session.customer_details?.name || "";
    const psychologist = session.metadata?.psychologist || "";
    console.log("[webhook] completed", { id: session.id, email: patientEmail, product: session.metadata?.product, amount: session.amount_total });

    const paymentsRes = await supabase.from("payments").upsert(
      {
        stripe_session_id: session.id,
        stripe_payment_intent_id: (session.payment_intent as string) || null,
        stripe_customer_id: (session.customer as string) || null,
        amount_cents: session.amount_total || 999,
        currency: session.currency || "eur",
        status: "completed",
        patient_name: patientName || null,
        patient_email: patientEmail || null,
        patient_phone: session.metadata?.patient_phone || null,
        psychologist: psychologist || null,
        source: session.metadata?.source || "unknown",
        metadata: {
          payment_method_types: session.payment_method_types,
          payment_status: session.payment_status,
        },
      },
      { onConflict: "stripe_session_id" },
    );
    if (paymentsRes.error) console.error("[webhook] payments upsert error:", paymentsRes.error.message);

    // Ebook purchase → record + send delivery email with PDF attached
    if (session.metadata?.product) {
      const ebookRes = await supabase.from("ebook_purchases").upsert(
        {
          stripe_session_id: session.id,
          stripe_payment_intent_id: (session.payment_intent as string) || null,
          stripe_customer_id: (session.customer as string) || null,
          product: session.metadata.product,
          amount_cents: session.amount_total || 0,
          currency: session.currency || "eur",
          status: "completed",
          customer_email: patientEmail || null,
          customer_name: patientName || null,
          customer_phone: session.metadata?.patient_phone || null,
          source: session.metadata?.source || null,
          metadata: { payment_status: session.payment_status },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "stripe_session_id" },
      );
      if (ebookRes.error) console.error("[webhook] ebook_purchases upsert error:", ebookRes.error.message);

      if (session.metadata.product === "ebook-sanando" && patientEmail) {
        const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://mentesanapsicologia.com";
        const downloadUrl = `${origin}/sanando-desde-adentro`;
        const { subject, html } = ebookDeliveryEmail({ name: patientName, downloadUrl });
        const pdfBase64 = await fetchEbookPdfBase64(origin);
        const emailResult = await sendEmail({
          to: patientEmail,
          toName: patientName,
          subject,
          html,
          attachments: pdfBase64 ? [{ name: "Sanando-Desde-Adentro.pdf", content: pdfBase64 }] : undefined,
        });
        console.log("[webhook] ebook email", { to: patientEmail, success: emailResult.success, withPdf: !!pdfBase64, err: emailResult.error });
        await supabase
          .from("ebook_purchases")
          .update({
            email_sent_at: emailResult?.success ? new Date().toISOString() : null,
            email_error: emailResult?.success ? null : (emailResult?.error || "unknown"),
          })
          .eq("stripe_session_id", session.id);
      }
    } else if (patientEmail) {
      // Default session purchase → confirmation email
      const amount = `${((session.amount_total || 999) / 100).toFixed(2).replace(".", ",")} €`;
      const { subject, html } = paymentConfirmationEmail({ name: patientName, amount, psychologistName: psychologist });
      await sendEmail({ to: patientEmail, toName: patientName, subject, html });
    }
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
