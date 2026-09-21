import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { sendCAPILead, sendCAPISchedule, sendCAPIContact, metaTestCodeFromCookie } from "@/lib/meta-capi-server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    // From test-diagnostico (5 preguntas matching)
    answers: matchingAnswers,
    matchedPsychologist,
    scheduledDate,
    scheduledTime,
    // From test-mental-health (30 preguntas clínicas)
    answers: rawAnswers,
    scores,
    profile,
    dominant_category,
    urgency_level,
    expectations,
    // Shared
    email,
    name,
    phone,
    context,
    source,
  } = body;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_BLOG_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.BLOG_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_BLOG_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Minúsculas siempre: la clave de conflicto/lectura (user_email) debe ser
  // consistente con check-access, que consulta en minúsculas.
  const userEmail = (email || `anon-${Date.now()}@pendiente.com`).toLowerCase();
  const isTestMentalHealth = source === "test-mental-health";
  const isTestDiagnostico = source === "test-diagnostico";

  // Build the upsert payload — only set fields that are present
  const upsertData: Record<string, unknown> = {
    user_email: userEmail,
    updated_at: new Date().toISOString(),
  };

  if (name) upsertData.user_name = name;
  if (phone) upsertData.user_phone = phone;
  if (context) upsertData.context_text = context;

  if (isTestDiagnostico) {
    // 5 preguntas del matching
    upsertData.matching_answers = matchingAnswers || rawAnswers;
    if (matchedPsychologist) upsertData.matched_psychologist = matchedPsychologist;
    if (scheduledDate) upsertData.scheduled_date = scheduledDate;
    if (scheduledTime) upsertData.scheduled_time = scheduledTime;
    upsertData.source = "test-diagnostico";
  }

  if (isTestMentalHealth) {
    // 30 preguntas clínicas
    upsertData.test_mental_health_answers = rawAnswers;
    upsertData.test_mental_health_scores = scores;
    upsertData.test_mental_health_completed_at = new Date().toISOString();
    upsertData.test_mental_health_expectations = expectations;
    upsertData.perfil_tipo = typeof profile === "string" ? profile : (profile?.tipo || dominant_category);
    upsertData.perfil_nombre = typeof profile === "object" ? profile?.nombre : null;
    upsertData.perfil_urgencia = urgency_level;
    upsertData.scores = scores;
    upsertData.expectations = expectations;
    // Don't overwrite source if already set from test-diagnostico
    if (!isTestDiagnostico) upsertData.source = "test-mental-health";
  }

  // If neither specific source, store as generic
  if (!isTestMentalHealth && !isTestDiagnostico) {
    upsertData.answers = rawAnswers || matchingAnswers;
    upsertData.source = source || "unknown";
    if (scores) upsertData.scores = scores;
    if (dominant_category) upsertData.perfil_tipo = dominant_category;
    if (urgency_level) upsertData.perfil_urgencia = urgency_level;
    if (expectations) upsertData.expectations = expectations;
  }

  // UPSERT by email — same person, one row
  const { error } = await supabase
    .from("diagnostico_tests")
    .upsert(upsertData, { onConflict: "user_email" });

  if (error) {
    console.error("[diagnostico-test] Supabase upsert error:", error);

    // If upsert fails (maybe unique index issue), try insert
    const { error: insertErr } = await supabase
      .from("diagnostico_tests")
      .insert({ ...upsertData, paid: false });

    if (insertErr) {
      console.error("[diagnostico-test] Insert fallback error:", insertErr);
      // Last resort: mental_health_tests
      await supabase.from("mental_health_tests").insert({
        user_email: userEmail,
        user_name: name || null,
        test_answers: rawAnswers || matchingAnswers,
        source: source || "diagnostico",
        perfil_tipo: dominant_category || (typeof profile === "string" ? profile : profile?.tipo) || null,
        perfil_nombre: typeof profile === "object" ? profile?.nombre : null,
        perfil_nivel_urgencia: urgency_level || null,
      });
    }
  }

  // ── Meta CAPI SERVER-SIDE: Lead (deja email) + Schedule (elige slot) ─────────
  // El pixel client-side solo dispara con consentimiento marketing y se pierde >50%
  // (Consent Mode default-denied + ITP/iOS). Aquí mandamos Lead y Schedule server-side
  // → llegan a Meta aunque el navegador bloquee el pixel. Matching por email + fbc/fbp
  // (cookies del mismo dominio) + IP/UA. event_id determinista por email → dedup con el
  // Schedule del booking (amelia-create-booking usa el MISMO id).
  const capi: Record<string, unknown> = {};
  let leadEventId: string | undefined;
  if (isTestDiagnostico && email && !userEmail.startsWith("anon-")) {
    const c = req.cookies;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ua = req.headers.get("user-agent") || undefined;
    const srcUrl = req.headers.get("referer") || "https://www.mentesanapsicologia.com/test-diagnostico";
    const [fn, ...lnParts] = String(name || "").trim().split(/\s+/);
    // .trim() ANTES de hashear: el navegador usa sha256(email.trim().toLowerCase()); si el
    // usuario mete espacios al final y aquí no trimáramos, Lead/Contact NO deduplicarían.
    const emailHash = createHash("sha256").update(userEmail.trim()).digest("hex").slice(0, 24);
    leadEventId = `lead_${emailHash}`;
    const testCode = metaTestCodeFromCookie(req.headers.get("cookie"));
    const ud = {
      email: userEmail,
      phone: phone || undefined,
      fn: fn || undefined,
      ln: lnParts.join(" ") || undefined,
      country: "ES",
      fbc: c.get("_fbc")?.value,
      fbp: c.get("_fbp")?.value,
      client_ip_address: ip || undefined,
      client_user_agent: ua,
    };
    // Lead: dejó el email.
    try {
      capi.lead = await sendCAPILead({
        event_id: `lead_${emailHash}`,
        event_source_url: srcUrl,
        content_name: "Diagnóstico 9,99 — email gate",
        value: 0,
        user_data: ud,
        test_event_code: testCode,
      });
    } catch (e) { capi.lead = { ok: false, error: (e as Error).message }; }
    // Contact: dejó el email. NO es evento restringido → Meta lo DEJA PASAR aunque el dataset
    // sea de salud (donde Lead se suprime). Es la conversión utilizable del 9,99. Mismo
    // event_id contact_<emailHash> que el navegador (email_capturado→Contact) → dedup.
    try {
      capi.contact = await sendCAPIContact({
        event_id: `contact_${emailHash}`,
        event_source_url: srcUrl,
        content_name: "Diagnóstico 9,99 — dejó el email",
        value: 0,
        user_data: ud,
        test_event_code: testCode,
      });
    } catch (e) { capi.contact = { ok: false, error: (e as Error).message }; }
    // Schedule: eligió hueco (fecha + hora). Mismo event_id que el booking → sin doble conteo.
    if (scheduledDate && scheduledTime) {
      try {
        capi.schedule = await sendCAPISchedule({
          event_id: `schedule_${emailHash}`,
          event_source_url: srcUrl,
          content_name: "Diagnóstico 9,99 — slot elegido",
          value: 9.99,
          user_data: ud,
          test_event_code: testCode,
        });
      } catch (e) { capi.schedule = { ok: false, error: (e as Error).message }; }
    }
  }

  // lead_event_id: el navegador puede reusar el MISMO id para su pixel Lead → dedup total.
  // ?debug=capi además devuelve el resultado real del CAPI (para verificar sin mirar logs).
  const debug = new URL(req.url).searchParams.get("debug") === "capi";
  return NextResponse.json({ success: true, lead_event_id: leadEventId, ...(debug ? { capi } : {}) });
}
