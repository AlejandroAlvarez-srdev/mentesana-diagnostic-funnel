// Pure, dependency-injected logic for the Stripe webhook handler.
// Kept separate from route.ts so it can be unit tested without
// pulling in Next.js, Supabase clients, or Stripe HTTP.

import type Stripe from "stripe";

export interface UpsertResult { error?: { message: string } | null }

export interface ClaimResult {
  data?: { id: string | number }[] | null;
  error?: { message: string } | null;
}

export interface SupabaseLike {
  from(table: string): {
    upsert(payload: Record<string, unknown>, options?: { onConflict?: string }): PromiseLike<UpsertResult>;
    update(payload: Record<string, unknown>): {
      eq(column: string, value: string): PromiseLike<UpsertResult> & {
        is(column: string, value: null): {
          select(columns?: string): PromiseLike<ClaimResult>;
        };
      };
    };
  };
}

export interface EmailResult { success: boolean; error?: string }

export interface SendEmailFn {
  (args: {
    to: string;
    toName?: string;
    subject: string;
    html: string;
    attachments?: { name: string; content: string }[];
  }): Promise<EmailResult>;
}

export interface FetchPdfFn { (origin: string): Promise<string | null> }

export interface BuildEbookEmailFn {
  (args: { name: string; downloadUrl: string }): { subject: string; html: string };
}

export interface BuildSessionEmailFn {
  (args: { name: string; amount: string; psychologistName: string }): { subject: string; html: string };
}

export interface ProcessDeps {
  supabase: SupabaseLike;
  sendEmail: SendEmailFn;
  fetchPdf: FetchPdfFn;
  buildEbookEmail: BuildEbookEmailFn;
  buildSessionEmail: BuildSessionEmailFn;
  origin: string;
}

export interface ProcessResult {
  paymentSaved: boolean;
  ebookSaved: boolean;
  emailSent: boolean;
  emailWithPdf: boolean;
  branch: "ebook" | "session" | "no-email" | "skipped";
  errors: string[];
}

export async function processCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  deps: ProcessDeps,
): Promise<ProcessResult> {
  const result: ProcessResult = {
    paymentSaved: false,
    ebookSaved: false,
    emailSent: false,
    emailWithPdf: false,
    branch: "skipped",
    errors: [],
  };

  const patientEmail = session.customer_details?.email || session.customer_email || null;
  const patientName = session.metadata?.patient_name || session.customer_details?.name || "";
  const psychologist = session.metadata?.psychologist || "";
  const product = session.metadata?.product;

  // Extract UTMs from metadata (embedded checkout) or client_reference_id (Payment Links)
  let utms: Record<string, string> = {};
  const meta = session.metadata || {};
  if (meta.utm_source || meta.utm_medium || meta.utm_campaign) {
    // Embedded checkout: UTMs stored directly in metadata
    if (meta.utm_source) utms.utm_source = meta.utm_source;
    if (meta.utm_medium) utms.utm_medium = meta.utm_medium;
    if (meta.utm_campaign) utms.utm_campaign = meta.utm_campaign;
    if (meta.utm_content) utms.utm_content = meta.utm_content;
    if (meta.utm_term) utms.utm_term = meta.utm_term;
    if (meta.referrer) utms.referrer = meta.referrer;
    if (meta.landing_page) utms.landing_page = meta.landing_page;
    if (meta.scheduled_date) utms.scheduled_date = meta.scheduled_date;
    if (meta.scheduled_time) utms.scheduled_time = meta.scheduled_time;
  } else if (session.client_reference_id) {
    // Payment Links: UTMs encoded as base64 JSON in client_reference_id
    const ref = session.client_reference_id;
    try {
      // Re-add padding that was stripped by the enhancer
      const padded = ref + "=".repeat((4 - (ref.length % 4)) % 4);
      const jsonStr = Buffer.from(padded, "base64").toString("utf-8");
      const decoded = JSON.parse(jsonStr);
      if (typeof decoded === "object" && decoded !== null) utms = decoded;
    } catch {
      // client_reference_id might be plain "source|medium|campaign" format
      const parts = ref.split("|");
      if (parts.length >= 2) {
        if (parts[0]) utms.utm_source = parts[0];
        if (parts[1]) utms.utm_medium = parts[1];
        if (parts[2]) utms.utm_campaign = parts[2];
      }
      // If still nothing, store the raw ref for debugging
      if (Object.keys(utms).length === 0) {
        utms.client_reference_id_raw = ref.slice(0, 100);
      }
    }
  }

  // If no UTMs at all, tag based on amount
  if (Object.keys(utms).length === 0) {
    const is999 = (session.amount_total || 0) <= 1050;
    utms.utm_source = is999 ? "direct-seo" : "link-stripe-directo";
    utms.utm_medium = is999 ? "organic" : "payment-link";
  }

  // 1. payments upsert — includes UTMs in metadata
  const paymentsRes = await deps.supabase.from("payments").upsert(
    {
      stripe_session_id: session.id,
      stripe_payment_intent_id: (session.payment_intent as string) || null,
      stripe_customer_id: (session.customer as string) || null,
      amount_cents: session.amount_total || 999,
      currency: session.currency || "eur",
      status: "completed",
      patient_name: patientName || null,
      patient_email: patientEmail,
      patient_phone: session.metadata?.patient_phone || null,
      psychologist: psychologist || null,
      source: session.metadata?.source || "unknown",
      metadata: {
        payment_method_types: session.payment_method_types,
        payment_status: session.payment_status,
        ...utms,
      },
    },
    { onConflict: "stripe_session_id" },
  );
  if (paymentsRes.error) result.errors.push(`payments: ${paymentsRes.error.message}`);
  else result.paymentSaved = true;

  // 2. ebook purchase branch
  if (product) {
    const ebookRes = await deps.supabase.from("ebook_purchases").upsert(
      {
        stripe_session_id: session.id,
        stripe_payment_intent_id: (session.payment_intent as string) || null,
        stripe_customer_id: (session.customer as string) || null,
        product,
        amount_cents: session.amount_total || 0,
        currency: session.currency || "eur",
        status: "completed",
        customer_email: patientEmail,
        customer_name: patientName || null,
        customer_phone: session.metadata?.patient_phone || null,
        source: session.metadata?.source || null,
        metadata: { payment_status: session.payment_status },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_session_id" },
    );
    if (ebookRes.error) result.errors.push(`ebook_purchases: ${ebookRes.error.message}`);
    else result.ebookSaved = true;

    if (product === "ebook-sanando" && patientEmail) {
      result.branch = "ebook";

      // Atomic claim — solo un handler concurrente gana el derecho a enviar.
      // Si email_sent_at ya no es NULL, otro evento/retry ya lo envió.
      const claim = await deps.supabase
        .from("ebook_purchases")
        .update({ email_sent_at: new Date().toISOString(), email_error: null })
        .eq("stripe_session_id", session.id)
        .is("email_sent_at", null)
        .select("id");
      if (!claim.data || claim.data.length === 0) {
        console.log("[webhook] ebook email already claimed, skipping send:", session.id);
        result.branch = "skipped";
        return result;
      }

      const downloadUrl = `${deps.origin}/sanando-desde-adentro`;
      const { subject, html } = deps.buildEbookEmail({ name: patientName, downloadUrl });
      const pdfBase64 = await deps.fetchPdf(deps.origin);
      const emailResult = await deps.sendEmail({
        to: patientEmail,
        toName: patientName,
        subject,
        html,
        attachments: pdfBase64 ? [{ name: "Sanando-Desde-Adentro.pdf", content: pdfBase64 }] : undefined,
      });
      result.emailSent = emailResult.success;
      result.emailWithPdf = !!pdfBase64 && emailResult.success;

      if (!emailResult.success) {
        // Liberamos el claim para que un retry posterior pueda reintentar.
        await deps.supabase.from("ebook_purchases").update({
          email_sent_at: null,
          email_error: emailResult.error || "unknown",
        }).eq("stripe_session_id", session.id);
        result.errors.push(`email: ${emailResult.error || "unknown"}`);
      }
    } else {
      result.branch = "no-email";
    }
  } else if (patientEmail && session.amount_total === 999) {
    // Diagnóstico 9,99€ — create/update diagnostico_tests record + send email
    result.branch = "session";

    // Upsert diagnostico_tests with real email from Stripe.
    // Only include optional fields when present — so we never overwrite a pre-payment
    // save (answers, schedule) with nulls.
    const diagUpsert: Record<string, unknown> = {
      user_email: patientEmail,
      paid: true,
      paid_at: new Date().toISOString(),
      stripe_session_id: session.id,
      source: session.metadata?.source || "test-diagnostico",
      updated_at: new Date().toISOString(),
    };
    if (patientName) diagUpsert.user_name = patientName;
    if (session.metadata?.patient_phone) diagUpsert.user_phone = session.metadata.patient_phone;
    if (psychologist) diagUpsert.matched_psychologist = psychologist;
    if (utms.scheduled_date) diagUpsert.scheduled_date = utms.scheduled_date;
    if (utms.scheduled_time) diagUpsert.scheduled_time = utms.scheduled_time;
    if (utms.utm_source) diagUpsert.utm_source = utms.utm_source;
    if (utms.utm_medium) diagUpsert.utm_medium = utms.utm_medium;
    if (utms.utm_campaign) diagUpsert.utm_campaign = utms.utm_campaign;

    await deps.supabase.from("diagnostico_tests").upsert(diagUpsert, { onConflict: "user_email" });

    // Atomic claim — solo un handler concurrente envía el email
    const claim = await deps.supabase
      .from("diagnostico_tests")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("stripe_session_id", session.id)
      .is("email_sent_at", null)
      .select("id");
    if (!claim.data || claim.data.length === 0) {
      console.log("[webhook] diagnóstico email already claimed, skipping send:", session.id);
      result.branch = "skipped";
      return result;
    }

    const amount = `${((session.amount_total || 999) / 100).toFixed(2).replace(".", ",")} €`;
    const { subject, html } = deps.buildSessionEmail({ name: patientName, amount, psychologistName: psychologist });
    const emailResult = await deps.sendEmail({ to: patientEmail, toName: patientName, subject, html });
    result.emailSent = emailResult.success;

    if (!emailResult.success) {
      // Liberamos el claim para permitir reintento
      await deps.supabase.from("diagnostico_tests")
        .update({ email_sent_at: null })
        .eq("stripe_session_id", session.id);
      result.errors.push(`email: ${emailResult.error || "unknown"}`);
    }
  } else {
    result.branch = "no-email";
  }

  return result;
}
