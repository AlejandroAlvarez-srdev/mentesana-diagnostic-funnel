import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { cookies } from "next/headers";
import { getPartnersDb } from "@/lib/partners/supabase";
import { ATTRIBUTION_COOKIE_NAME } from "@/lib/partners/config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  httpClient: Stripe.createFetchHttpClient(),
});

export async function POST(req: NextRequest) {
  const { email, name, phone, psychologistName, utms, source, partner_ref: bodyRef, coupon_code: bodyCoupon } = await req.json();
  const u = utms || {};
  const src = (typeof source === "string" && source.trim()) ? source.trim().slice(0, 60) : "test-sobrio";

  // Resuelve partner_ref: body > cookie
  let partner_ref = "";
  if (typeof bodyRef === "string" && bodyRef.trim()) {
    partner_ref = bodyRef.trim().toUpperCase().slice(0, 20);
  } else {
    try {
      const cookieRef = (await cookies()).get(ATTRIBUTION_COOKIE_NAME)?.value;
      if (cookieRef) partner_ref = cookieRef.toUpperCase().slice(0, 20);
    } catch {}
  }

  // Si viene coupon_code: valida que esté activo y aplica descuento total (0€ = primera sesión gratis para el paciente)
  let coupon_code = "";
  let unit_amount = 999;
  let coupon_partner_id = "";
  if (typeof bodyCoupon === "string" && bodyCoupon.trim()) {
    const candidate = bodyCoupon.trim().toUpperCase();
    try {
      const db = getPartnersDb();
      const { data: cc } = await db
        .from("partner_coupon_codes")
        .select("code, status, partner_id")
        .eq("code", candidate)
        .maybeSingle();
      if (cc && cc.status === "active") {
        coupon_code = cc.code;
        coupon_partner_id = cc.partner_id;
        unit_amount = 0; // gratis al canjear (Stripe requiere mínimo 50, ver fallback abajo)
      }
    } catch (e) {
      console.error("[create-checkout] coupon validation error:", e);
    }
  }

  // Stripe no permite Checkout Session con monto 0. Fallback: cobrar 0,50€ y rebajar producto.
  // Mejor approach: redirigir a una página interna sin Stripe cuando el cupón cubre todo.
  // Por ahora, si hay cupón, el monto se mantiene a 0,50€ simbólico (manejable).
  if (coupon_code) unit_amount = 50;

  try {
    const session = await stripe.checkout.sessions.create({
      // FIX: omitir payment_method_types deja Stripe activar todos los habilitados en Dashboard
      // (Card + Apple Pay + Google Pay + Bizum + Link). En España Bizum convierte 2x en móvil y
      // Apple/Google Pay quitan toda la fricción de teclear tarjeta. 70%+ del tráfico de Meta es móvil.
      // IMPORTANTE: activar Bizum/Apple Pay/Google Pay en Stripe Dashboard → Settings → Payment methods.
      mode: "payment",
      customer_email: email || undefined,
      // Crea Stripe Customer si no existe → en la compra del bono después podemos hacer autofill.
      customer_creation: "if_required",
      locale: "es",
      ui_mode: "embedded" as Stripe.Checkout.SessionCreateParams.UiMode,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: coupon_code ? "Diagnóstico Psicológico — Cupón canjeado" : "Diagnóstico Psicológico — Mente Sana",
              description: coupon_code
                ? `Cupón ${coupon_code} aplicado. Cargo simbólico de 0,50€ para validar el método de pago.`
                : `Diagnóstico clínico con ${psychologistName || "tu psicóloga"}. Incluye: informe personalizado, matching, sesión con tu psicóloga 50 min, plan de acción.`,
              images: ["https://mentesanapsicologia.com/images/logo.webp"],
            },
            unit_amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        patient_name: name,
        patient_phone: phone || "",
        psychologist: psychologistName || "",
        source: src,
        scheduled_date: (u.scheduled_date || "").slice(0, 20),
        scheduled_time: (u.scheduled_time || "").slice(0, 10),
        utm_source: (u.utm_source || "").slice(0, 120),
        utm_medium: (u.utm_medium || "").slice(0, 120),
        utm_campaign: (u.utm_campaign || "").slice(0, 120),
        utm_content: (u.utm_content || "").slice(0, 120),
        utm_term: (u.utm_term || "").slice(0, 120),
        referrer: (u.referrer || "").slice(0, 200),
        landing_page: (u.landing_page || "").slice(0, 200),
        first_utm_source: (u.first_utm_source || "").slice(0, 120),
        first_utm_medium: (u.first_utm_medium || "").slice(0, 120),
        first_utm_campaign: (u.first_utm_campaign || "").slice(0, 120),
        first_utm_content: (u.first_utm_content || "").slice(0, 120),
        first_touch_at: (u.first_touch_at || "").slice(0, 30),
        // === Partners attribution ===
        partner_ref: partner_ref || "",
        partner_coupon_code: coupon_code || "",
        partner_coupon_partner_id: coupon_partner_id || "",
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
