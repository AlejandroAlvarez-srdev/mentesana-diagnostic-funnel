import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { answers, context, name, email, phone, matchedPsychologist, scores, profile, dominant_category, urgency_level, expectations } = body;

  if (!answers) {
    return NextResponse.json({ error: "Respuestas son requeridas" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const record = {
    user_name: name || null,
    user_email: email || `anon-${Date.now()}@pendiente.com`,
    user_phone: phone || null,
    answers,
    context_text: context || null,
    matched_psychologist: matchedPsychologist || null,
    source: body.source || "test-mental-health",
    paid: false,
    scores: scores || null,
    perfil_tipo: profile || dominant_category || null,
    perfil_nombre: typeof profile === "object" ? profile?.nombre : null,
    perfil_urgencia: urgency_level || null,
    expectations: expectations || null,
  };

  const { error } = await supabase.from("diagnostico_tests").insert(record);

  if (error) {
    console.error("[diagnostico-test] Supabase error:", error);
    // Fallback to mental_health_tests
    const { error: err2 } = await supabase.from("mental_health_tests").insert({
      user_name: name || null,
      user_email: email || `anon-${Date.now()}@pendiente.com`,
      user_phone: phone || null,
      test_answers: answers,
      source: body.source || "test-mental-health",
      perfil_tipo: dominant_category || (typeof profile === "string" ? profile : profile?.tipo) || "pendiente",
      perfil_nombre: typeof profile === "object" ? profile?.nombre : null,
      perfil_nivel_urgencia: urgency_level || null,
      perfil_descripcion: context || null,
    });
    if (err2) console.error("[diagnostico-test] Fallback error:", err2);
  }

  return NextResponse.json({ success: true });
}
