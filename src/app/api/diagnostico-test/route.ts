import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { answers, context, name, email, phone, matchedPsychologist } = body;

  if (!email || !answers) {
    return NextResponse.json({ error: "Email y respuestas son requeridos" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error } = await supabase.from("diagnostico_tests").insert({
    user_name: name || null,
    user_email: email,
    user_phone: phone || null,
    answers,
    context_text: context || null,
    matched_psychologist: matchedPsychologist || null,
    source: "test-diagnostico",
    paid: false,
  });

  if (error) {
    console.error("[diagnostico-test] Supabase error:", error);
    // Try mental_health_tests as fallback if table doesn't exist yet
    const { error: err2 } = await supabase.from("mental_health_tests").insert({
      user_name: name || null,
      user_email: email,
      user_phone: phone || null,
      test_answers: answers,
      source: "test-diagnostico",
      perfil_tipo: answers.feeling || "otro",
      perfil_nombre: `Diagnóstico - ${answers.feeling || "general"}`,
      perfil_descripcion: context || null,
      psicologo_match: matchedPsychologist || null,
    });
    if (err2) console.error("[diagnostico-test] Fallback error:", err2);
  }

  return NextResponse.json({ success: true });
}
