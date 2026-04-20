import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  const userEmail = email || `anon-${Date.now()}@pendiente.com`;
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

  return NextResponse.json({ success: true });
}
