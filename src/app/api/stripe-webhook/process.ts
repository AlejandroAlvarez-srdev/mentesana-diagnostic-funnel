// Pure, dependency-injected logic for the Stripe webhook handler.
// Kept separate from route.ts so it can be unit tested without
// pulling in Next.js, Supabase clients, or Stripe HTTP.

import type Stripe from "stripe";
import { generateCouponCode } from "@/lib/partners/codes";
import { generateCommissions } from "@/lib/partners/commissions";
import { attributePatient } from "@/lib/partners/attribution";
import { detectProductType } from "@/lib/partners/config";
import { getPartnersDb } from "@/lib/partners/supabase";

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
  // Tel: del funnel (metadata) o del formulario de Stripe (phone_number_collection)
  const patientPhone = session.metadata?.patient_phone || session.customer_details?.phone || null;
  const psychologist = session.metadata?.psychologist || "";
  const product = session.metadata?.product;

  // Extract UTMs from metadata (embedded checkout) or client_reference_id (Payment Links)
  let utms: Record<string, string> = {};
  const meta = session.metadata || {};
  if (meta.utm_source || meta.utm_medium || meta.utm_campaign || meta.first_utm_source) {
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
    // First-touch attribution (persiste en localStorage del cliente)
    if (meta.first_utm_source) utms.first_utm_source = meta.first_utm_source;
    if (meta.first_utm_medium) utms.first_utm_medium = meta.first_utm_medium;
    if (meta.first_utm_campaign) utms.first_utm_campaign = meta.first_utm_campaign;
    if (meta.first_utm_content) utms.first_utm_content = meta.first_utm_content;
    if (meta.first_touch_at) utms.first_touch_at = meta.first_touch_at;
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
      patient_phone: patientPhone,
      psychologist: psychologist || null,
      source: session.metadata?.source || "unknown",
      metadata: {
        payment_method_types: session.payment_method_types,
        payment_status: session.payment_status,
        ...utms,
        // Variantes A/B (vienen en la metadata de Stripe vía /api/create-checkout) →
        // así la conversión a PAGO por variante se consulta directa en Supabase.
        ab_landing: session.metadata?.ab_landing || null,
        ab_warming: session.metadata?.ab_warming || null,
        ab_diag: session.metadata?.ab_diag || null,
      },
    },
    { onConflict: "stripe_session_id" },
  );
  if (paymentsRes.error) result.errors.push(`payments: ${paymentsRes.error.message}`);
  else result.paymentSaved = true;

  // 1b. PARTNERS: compra de pack de cupones por un partner
  if (meta.partner_pack_tier && meta.partner_id && meta.partner_pack_row_id) {
    try {
      const pdb = getPartnersDb();
      const packId = parseInt(meta.partner_pack_row_id);
      const { data: pack } = await pdb.from("partner_coupon_packs").select("*").eq("id", packId).maybeSingle();
      if (pack && pack.status === "pending") {
        // Genera N cupones canjeables
        const codes: string[] = [];
        for (let i = 0; i < (pack.quantity || 0); i++) {
          codes.push(await generateCouponCode());
        }
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 año
        await pdb.from("partner_coupon_codes").insert(
          codes.map((code) => ({ code, pack_id: pack.id, partner_id: meta.partner_id, expires_at: expiresAt })),
        );
        await pdb.from("partner_coupon_packs").update({
          status: "paid", paid_at: new Date().toISOString(),
        }).eq("id", pack.id);
        await pdb.from("partner_audit_log").insert({
          partner_id: meta.partner_id,
          event_type: "coupon_pack_paid",
          metadata: { pack_id: pack.id, tier: pack.tier, quantity: pack.quantity, codes_generated: codes.length },
        });
        console.log("[webhook][partners] generated", codes.length, "coupons for partner", meta.partner_id);
      }
    } catch (e) {
      console.error("[webhook][partners] coupon-pack processing failed:", e);
      result.errors.push(`partner-pack: ${e instanceof Error ? e.message : "unknown"}`);
    }
    return result; // este pago no genera comisiones MLM
  }

  // 1c. PARTNERS: atribución de paciente (si viene partner_ref o partner_coupon_code)
  let attributedPartnerCode: string | null = null;
  let attributionSource: "link" | "cupon" | null = null;

  if (patientEmail && meta.partner_coupon_code) {
    // Marca cupón como redeemed
    try {
      const pdb = getPartnersDb();
      const { data: coupon } = await pdb
        .from("partner_coupon_codes")
        .update({
          status: "redeemed",
          redeemed_at: new Date().toISOString(),
          redeemed_by_email: patientEmail.toLowerCase(),
          redeemed_payment_id: session.id,
        })
        .eq("code", meta.partner_coupon_code)
        .eq("status", "active")
        .select("partner_id")
        .maybeSingle();
      if (coupon) {
        // Resuelve el código default del partner para atribución
        const { data: defCode } = await pdb
          .from("partner_codes")
          .select("code")
          .eq("partner_id", coupon.partner_id)
          .eq("is_default", true)
          .maybeSingle();
        if (defCode) {
          attributedPartnerCode = defCode.code;
          attributionSource = "cupon";
        }
      }
    } catch (e) {
      console.error("[webhook][partners] coupon redemption failed:", e);
    }
  } else if (patientEmail && meta.partner_ref) {
    attributedPartnerCode = meta.partner_ref.toUpperCase();
    attributionSource = "link";
  }

  if (patientEmail && attributedPartnerCode && attributionSource) {
    try {
      await attributePatient({
        patientEmail,
        patientName: patientName || undefined,
        partnerCode: attributedPartnerCode,
        via: attributionSource,
        paymentId: session.id,
      });
    } catch (e) {
      console.error("[webhook][partners] attribution failed:", e);
    }
  }

  // 1d. PARTNERS: generar comisiones MLM si el paciente está atribuido
  if (patientEmail && session.amount_total) {
    try {
      const productType = detectProductType(session.amount_total, meta);
      if (productType && productType !== "diagnostico" && productType !== "cupon-pack") {
        await generateCommissions({
          paymentId: session.id,
          patientEmail,
          patientName: patientName || undefined,
          productType,
          productAmountCents: session.amount_total,
        });
      }
    } catch (e) {
      console.error("[webhook][partners] commission generation failed:", e);
      result.errors.push(`partner-commissions: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

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
        customer_phone: patientPhone,
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
    if (patientPhone) diagUpsert.user_phone = patientPhone;
    if (psychologist) diagUpsert.matched_psychologist = psychologist;
    if (utms.scheduled_date) diagUpsert.scheduled_date = utms.scheduled_date;
    if (utms.scheduled_time) diagUpsert.scheduled_time = utms.scheduled_time;
    if (utms.utm_source) diagUpsert.utm_source = utms.utm_source;
    if (utms.utm_medium) diagUpsert.utm_medium = utms.utm_medium;
    if (utms.utm_campaign) diagUpsert.utm_campaign = utms.utm_campaign;

    await deps.supabase.from("diagnostico_tests").upsert(diagUpsert, { onConflict: "user_email" });

    // ─── Google Ads Enhanced Conversion (server-side, best-effort) ─────────
    // No bloquea el flujo. Si falta config, no-opera.
    try {
      const { sendGoogleAdsConversion } = await import("@/lib/google-ads-capi");
      const gclid = (session.metadata?.gclid as string) || (utms.gclid as string | undefined);
      void sendGoogleAdsConversion({
        email: patientEmail,
        phone: patientPhone || undefined,
        firstName: patientName?.split(" ")[0],
        lastName: patientName?.split(" ").slice(1).join(" ") || undefined,
        conversionValue: (session.amount_total ?? 999) / 100,
        currency: (session.currency ?? "eur").toUpperCase(),
        orderId: session.id,
        gclid,
      }).then((r) => {
        if (!r.ok && !r.skipped) console.warn("[stripe-webhook] google-ads-capi failed:", r.error);
      });
    } catch (e) {
      console.warn("[stripe-webhook] google-ads-capi exception:", (e as Error).message);
    }

    // ─── Crear cuenta en WordPress + Amelia + booking de diagnóstico ────────
    // Solo si tenemos psicóloga matched y slot elegido. Best-effort: si falla,
    // el flujo de email sigue, pero apuntamos error para revisión manual.
    if (psychologist && utms.scheduled_date && utms.scheduled_time) {
      try {
        const { createDiagnosticoBookingFromPayment, resolveProviderIdByName } = await import("@/lib/amelia-create-booking");
        const providerId = await resolveProviderIdByName(psychologist);
        if (providerId) {
          const booking = await createDiagnosticoBookingFromPayment({
            email: patientEmail,
            fullName: patientName || patientEmail.split("@")[0],
            phone: patientPhone,
            scheduledDate: String(utms.scheduled_date),
            scheduledTime: String(utms.scheduled_time),
            providerId,
            stripeSessionId: session.id,
          });
          if (booking.ok) {
            (result as any).amelia = { customer_id: booking.customer_id, appointment_id: booking.appointment_id, cb_id: booking.customer_booking_id, wp_user_id: booking.wp_user_id, reused: booking.reused_existing ?? false };
            // Marca scheduled_at en el row de diagnostico_tests
            await deps.supabase.from("diagnostico_tests")
              .update({ session_scheduled_at: new Date(`${utms.scheduled_date}T${utms.scheduled_time}:00`).toISOString() })
              .eq("stripe_session_id", session.id);
          } else {
            result.errors.push(`amelia_booking: ${booking.error}${booking.detail ? ` (${booking.detail})` : ""}`);
          }
        } else {
          result.errors.push(`amelia_booking: provider_not_found "${psychologist}"`);
        }
      } catch (e) {
        result.errors.push(`amelia_booking_exc: ${(e as Error).message.slice(0, 100)}`);
      }
    }

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
