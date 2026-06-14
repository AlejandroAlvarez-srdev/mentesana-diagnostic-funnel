"use client";

import { useEffect } from "react";
import Image from "next/image";
import { track } from "@/lib/tracking";

// ─────────────────────────────────────────────────────────────────────────────
// VARIANTE B del A/B test ms_ab_warming — capa de "calentamiento" entre el match
// y la página de agendar. Mismo dato que el control (matchedPsych), pero enmarcado
// para subir convicción: (1) match personal, (2) qué haréis juntas, (3) confianza
// de ELLA con su descripción real de Amelia, (4) desactivar el pico de compromiso,
// (5) un único CTA hacia agendar.
//
// REGLA DE HONESTIDAD: cada afirmación es verdadera. La personalización se apoya en
// lo que el usuario respondió (sus palabras) + datos reales de Amelia (nombre, foto,
// descripción). Solo afirmamos especialidad cuando la propia descripción la respalda.
// ─────────────────────────────────────────────────────────────────────────────

type Psych = {
  name: string;
  exp?: string;
  specialty?: string;
  video?: string;
  photo?: string | null;
  description?: string | null;
};

// Cómo nombramos el motivo principal (answers.feeling) en lenguaje del paciente.
const FEELING_LABEL: Record<string, string> = {
  ansiedad: "la ansiedad y la preocupación que no para",
  depresion: "el bajón de ánimo y la falta de energía",
  relaciones: "lo que te está pasando en tus relaciones",
  crecimiento: "tu proceso de conocerte y decidir mejor",
  estres: "el agotamiento y el estrés que arrastras",
  otro: "lo que te está pasando ahora mismo",
};

// Palabras que, si aparecen en la descripción real de la psicóloga, nos permiten
// afirmar honestamente que trabaja ese tema. Si no hay match, no lo afirmamos.
const FEELING_KW: Record<string, string[]> = {
  ansiedad: ["ansiedad", "pánico", "panico", "estrés", "estres", "fobia", "preocup", "tcc"],
  depresion: ["depres", "ánimo", "animo", "triste", "duelo", "motivac", "autoestima"],
  relaciones: ["pareja", "relacion", "famili", "víncul", "vincul", "apego", "comunicac"],
  crecimiento: ["autoconoc", "crecimiento", "identidad", "decision", "propósito", "proposito", "autoestima"],
  estres: ["burnout", "laboral", "estrés", "estres", "trabajo", "mindfulness", "regulac"],
  otro: [],
};

export default function WarmingMatch({
  psych,
  answers,
  contextText,
  onContinue,
}: {
  psych: Psych;
  answers: Record<string, string>;
  contextText: string;
  onContinue: () => void;
}) {
  const firstName = psych.name.split(" ")[0] || "tu psicóloga";
  const feeling = answers.feeling || "otro";
  const feelingLabel = FEELING_LABEL[feeling] || FEELING_LABEL.otro;
  const descLc = (psych.description || "").toLowerCase();
  const supported = (FEELING_KW[feeling] || []).some((k) => descLc.includes(k));
  const isFirstTime = answers.experience === "nunca";
  const hasContext = contextText.trim().length > 0;

  useEffect(() => {
    track("view_warming_match", { profile: feeling, psychologist: psych.name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bloque 1 — el "porque", honesto en ambos caminos.
  const reason = supported
    ? `Trabaja específicamente con ${feelingLabel} — justo lo que nos has contado.`
    : `Nos has contado que ahora mismo lo que más pesa es ${feelingLabel}. ${firstName} es psicóloga colegiada y llegará a tu sesión con tu informe ya leído.`;

  return (
    <div className="min-h-screen bg-[#FFFAF2] flex flex-col">
      <header className="bg-white border-b border-purple/10 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Image src="/images/logo.webp" alt="Mente Sana" width={120} height={24} priority className="h-6 w-auto" />
          <span className="text-[11px] text-foreground/40 font-medium">Tu psicóloga</span>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-lg w-full mx-auto">
          {/* Intro */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold mb-3">
              ✓ Te hemos encontrado psicóloga
            </div>
            <h1 className="font-serif text-2xl md:text-3xl leading-tight">
              No es al azar. Es <em className="text-purple italic font-normal">para ti</em>.
            </h1>
          </div>

          {/* ── BLOQUE 1 — Match personal (foto + descripción reales de Amelia) ── */}
          <div className="bg-white rounded-3xl overflow-hidden border border-purple/10 shadow-xl">
            <div className="aspect-[4/5] overflow-hidden bg-purple/5 relative">
              {psych.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={psych.photo} alt={psych.name} className="absolute inset-0 w-full h-full object-cover" />
              ) : psych.video ? (
                <video src={psych.video} muted autoPlay loop playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-5xl">💜</div>
              )}
              <div className="absolute top-3 right-3 bg-purple text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">TU PSICÓLOGA</div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                <h2 className="font-serif text-2xl font-semibold text-white leading-tight">{psych.name}</h2>
                <p className="text-xs text-white/85 font-medium mt-0.5">Psicóloga colegiada · sesiones online</p>
              </div>
            </div>
            <div className="p-5">
              <div className="bg-purple/5 rounded-xl p-4 border border-purple/10">
                <p className="text-xs font-bold text-purple mb-1">¿Por qué ella?</p>
                <p className="text-sm text-foreground/75 leading-relaxed">{reason}</p>
              </div>
            </div>
          </div>

          {/* ── BLOQUE 2 — Qué haréis juntas (atado a sus respuestas) ── */}
          <div className="mt-5 bg-white rounded-2xl border border-purple/10 p-5 shadow-sm">
            <p className="text-xs font-bold text-purple uppercase tracking-wider mb-3">Tu sesión de 50 minutos con {firstName}</p>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-purple/10 text-purple text-[11px] font-bold flex items-center justify-center mt-0.5">1</span>
                <span className="text-sm text-foreground/75 leading-relaxed">Te devuelve qué muestran tus respuestas sobre <strong>{feelingLabel}</strong>, con palabras que se entienden.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-purple/10 text-purple text-[11px] font-bold flex items-center justify-center mt-0.5">2</span>
                <span className="text-sm text-foreground/75 leading-relaxed">Le ponéis nombre a lo que sientes — no etiquetas que asustan, patrones concretos.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-purple/10 text-purple text-[11px] font-bold flex items-center justify-center mt-0.5">3</span>
                <span className="text-sm text-foreground/75 leading-relaxed">Sales con un primer plan de trabajo concreto, no con consejos de manual.</span>
              </li>
            </ul>
            {(isFirstTime || hasContext) && (
              <p className="mt-3 pt-3 border-t border-black/5 text-[13px] text-foreground/60 leading-relaxed">
                {isFirstTime && "Es tu primera vez en terapia: irá sin prisa y sin tecnicismos. "}
                {hasContext && `Ya tiene delante lo que nos escribiste, así que no tendrás que volver a contarlo todo desde cero.`}
              </p>
            )}
          </div>

          {/* ── BLOQUE 3 — Confianza de ELLA (su descripción real de Amelia) ── */}
          {psych.description ? (
            <div className="mt-5 bg-gradient-to-br from-purple/[0.04] to-white rounded-2xl border border-purple/10 p-5">
              <p className="text-xs font-bold text-purple uppercase tracking-wider mb-2">Su forma de trabajar</p>
              <p className="text-sm text-foreground/80 leading-relaxed italic">“{psych.description}”</p>
              <p className="text-[11px] text-foreground/45 mt-2">— {psych.name}, en sus propias palabras</p>
            </div>
          ) : (
            <div className="mt-5 bg-gradient-to-br from-purple/[0.04] to-white rounded-2xl border border-purple/10 p-5">
              <p className="text-xs font-bold text-purple uppercase tracking-wider mb-2">Sobre {firstName}</p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Es psicóloga colegiada y trabaja online con personas que están justo donde estás tú. La conocerás en la sesión — y si no encajáis, la cambias gratis cuando quieras.
              </p>
            </div>
          )}

          {/* ── BLOQUE 4 — Desactivar el pico de compromiso (cosas que YA son verdad) ── */}
          <div className="mt-5 bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-200/60 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-700 text-sm">🛡️</span>
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Reservar hoy no te compromete a nada grande</p>
            </div>
            <ul className="space-y-2.5">
              {[
                "Es una videollamada de 50 min. Desde casa, cuando te venga bien.",
                "Pago único de 9,99€. Sin suscripción y sin archivar tu tarjeta.",
                "Si no te aporta valor, te devolvemos los 9,99€ con un email. Sin formularios.",
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center mt-0.5">✓</span>
                  <span className="text-[13px] text-foreground/80 leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── BLOQUE 5 — CTA único ── */}
          <div className="mt-7 text-center">
            <button
              onClick={onContinue}
              className="block w-full bg-purple hover:bg-[#4e0d68] text-white font-bold rounded-full py-4 text-base shadow-lg transition-colors"
            >
              Ver la disponibilidad de {firstName} →
            </button>
            <p className="mt-3 text-xs text-foreground/40">Sin compromiso · 9,99€ pago único · Devolución garantizada</p>
          </div>
        </div>
      </main>
    </div>
  );
}
