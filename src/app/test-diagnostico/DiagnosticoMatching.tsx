"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { track } from "@/lib/tracking";

// ═══ Questions config ═══
interface Option {
  id: string;
  label: string;
  icon: string;
}

interface Question {
  id: string;
  title: string;
  subtitle: string;
  options: Option[];
}

const QUESTIONS: Question[] = [
  {
    id: "feeling",
    title: "¿Qué describe mejor cómo te sientes ahora mismo?",
    subtitle: "Elige la que más resuene contigo. No hay respuestas correctas.",
    options: [
      { id: "ansiedad", label: "Nervios constantes, preocupación excesiva, no puedo parar de pensar", icon: "🌀" },
      { id: "depresion", label: "Tristeza, vacío, falta de motivación, me cuesta levantarme", icon: "🌧️" },
      { id: "relaciones", label: "Problemas con mi pareja, familia o relaciones que me afectan", icon: "💔" },
      { id: "crecimiento", label: "Quiero conocerme mejor, crecer o tomar decisiones importantes", icon: "🌱" },
      { id: "estres", label: "Agotamiento, burnout, siento que no doy más", icon: "🔥" },
      { id: "otro", label: "Otra cosa que no encaja aquí", icon: "💭" },
    ],
  },
  {
    id: "duration",
    title: "¿Hace cuánto tiempo que sientes esto?",
    subtitle: "Nos ayuda a calibrar la urgencia y el enfoque de tu diagnóstico.",
    options: [
      { id: "dias", label: "Menos de 2 semanas", icon: "📅" },
      { id: "semanas", label: "Entre 2 semanas y 3 meses", icon: "🗓️" },
      { id: "meses", label: "Entre 3 y 12 meses", icon: "⏳" },
      { id: "anios", label: "Más de un año", icon: "🕰️" },
      { id: "no_se", label: "No sabría decirlo", icon: "🤷" },
    ],
  },
  {
    id: "experience",
    title: "¿Has hecho terapia antes?",
    subtitle: "No pasa nada si es tu primera vez. Solo queremos entender tu punto de partida.",
    options: [
      { id: "nunca", label: "Nunca he ido al psicólogo", icon: "🆕" },
      { id: "hace_tiempo", label: "Sí, pero hace tiempo que no voy", icon: "🔙" },
      { id: "reciente", label: "Sí, hace poco pero no encajé", icon: "🔄" },
      { id: "actual", label: "Estoy en terapia pero quiero otra opinión", icon: "🔍" },
    ],
  },
  {
    id: "preference",
    title: "¿Qué prefieres en tu psicóloga?",
    subtitle: "Así elegimos la profesional que mejor encaja contigo.",
    options: [
      { id: "cercania", label: "Cercanía emocional — que me entienda y empatice", icon: "🤗" },
      { id: "practica", label: "Enfoque práctico — herramientas concretas desde el día uno", icon: "🛠️" },
      { id: "clinica", label: "Experiencia clínica — alguien senior que haya visto muchos casos", icon: "🏛️" },
      { id: "sin_preferencia", label: "No tengo preferencia, confío en vuestra recomendación", icon: "✨" },
    ],
  },
  {
    id: "schedule",
    title: "¿Cuándo prefieres tener tu sesión de lectura?",
    subtitle: "Para buscar disponibilidad con tu psicóloga asignada.",
    options: [
      { id: "manana", label: "Por la mañana (9:00 – 13:00)", icon: "☀️" },
      { id: "tarde", label: "Por la tarde (16:00 – 20:00)", icon: "🌅" },
      { id: "noche", label: "Por la noche (20:00 – 22:00)", icon: "🌙" },
      { id: "finde", label: "Fines de semana", icon: "📆" },
      { id: "flexible", label: "Soy flexible, cualquier horario", icon: "🔀" },
    ],
  },
];

// ═══ Psychologists pool (round robin match) ═══
const PSYCHOLOGISTS = [
  { name: "Adriana Salas", col: "M-28456", city: "Madrid", exp: "10 años", specialty: "Ansiedad, pánico, TCC", video: "/videos/welcome/adriana-salas.mp4", profiles: ["ansiedad", "estres"] },
  { name: "Alexandra Elías", col: "B-19872", city: "Barcelona", exp: "9 años", specialty: "Burnout, EMDR, estrés laboral", video: "/videos/welcome/alexandra-elias.mp4", profiles: ["estres", "crecimiento"] },
  { name: "Diana Salazar", col: "M-31204", city: "Madrid", exp: "11 años", specialty: "Depresión, insomnio, duelo", video: "/videos/welcome/diana-salazar-alzate.mp4", profiles: ["depresion", "otro"] },
  { name: "Gabriela Delgado", col: "V-24589", city: "Valencia", exp: "8 años", specialty: "Relaciones, autoestima, fobias", video: "/videos/welcome/gabriela-delgado.mp4", profiles: ["relaciones", "crecimiento"] },
];

export default function DiagnosticoMatching() {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [contextText, setContextText] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [phase, setPhase] = useState<"intro" | "questions" | "context" | "contact" | "match" | "schedule" | "payment">("intro");
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const checkoutRef = useRef<HTMLDivElement>(null);

  // Persist in localStorage for remarketing recovery
  useEffect(() => {
    const saved = localStorage.getItem("ms_diagnostico_answers");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAnswers(parsed);
        const answered = Object.keys(parsed).length;
        if (answered >= QUESTIONS.length) {
          // Check if we already have contact info
          const email = localStorage.getItem("ms_diagnostico_email");
          if (email) {
            setUserEmail(email);
            setUserName(localStorage.getItem("ms_diagnostico_name") || "");
            setContextText(localStorage.getItem("ms_diagnostico_context") || "");
            setPhase("match");
          } else {
            setPhase("context");
          }
        } else if (answered > 0) {
          setPhase("questions");
          setCurrentQ(answered);
        }
      } catch {}
    }
  }, []);

  const selectOption = useCallback((questionId: string, optionId: string) => {
    const newAnswers = { ...answers, [questionId]: optionId };
    setAnswers(newAnswers);
    localStorage.setItem("ms_diagnostico_answers", JSON.stringify(newAnswers));

    track(`complete_q${currentQ + 1}` as string, { question: questionId, answer: optionId });

    if (currentQ < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(currentQ + 1), 300);
    } else {
      // After all 5 questions → context question
      setTimeout(() => setPhase("context"), 400);
    }
  }, [answers, currentQ]);

  // Save to API (always, whether they pay or not)
  const saveAndProceed = async () => {
    if (!userEmail) return;
    setSaving(true);
    localStorage.setItem("ms_diagnostico_email", userEmail);
    localStorage.setItem("ms_diagnostico_name", userName);
    localStorage.setItem("ms_diagnostico_context", contextText);
    localStorage.setItem("ms_user_email", userEmail);
    if (userName) localStorage.setItem("ms_user_name", userName);
    if (userPhone) localStorage.setItem("ms_user_phone", userPhone);

    try {
      await fetch("/api/diagnostico-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          context: contextText,
          name: userName,
          email: userEmail,
          phone: userPhone,
          matchedPsychologist: matchedPsych.name,
        }),
      });
    } catch {}

    track("view_match_result", { profile: answers.feeling || "", email: userEmail });
    setSaving(false);
    setPhase("match");
  };

  // Match logic: find best psychologist based on feeling profile
  const matchedPsych = (() => {
    const feeling = answers.feeling || "ansiedad";
    const match = PSYCHOLOGISTS.find((p) => p.profiles.includes(feeling));
    return match || PSYCHOLOGISTS[0];
  })();

  // Match justification
  const justification = (() => {
    const feeling = answers.feeling;
    const pref = answers.preference;
    const parts: string[] = [];
    if (feeling === "ansiedad") parts.push("experiencia especializada en ansiedad y TCC");
    else if (feeling === "depresion") parts.push("especialista en depresión y estados de ánimo");
    else if (feeling === "relaciones") parts.push("especialista en relaciones y vínculos");
    else if (feeling === "estres") parts.push("experta en burnout y estrés laboral");
    else parts.push("perfil senior con visión integrativa");

    if (pref === "cercania") parts.push("su enfoque cálido y empático encaja con lo que buscas");
    else if (pref === "practica") parts.push("su enfoque orientado a herramientas prácticas");
    else if (pref === "clinica") parts.push(`${matchedPsych.exp} de experiencia clínica`);

    return `Hemos elegido a ${matchedPsych.name} por su ${parts.join(" y ")}.`;
  })();

  if (phase === "match") {
    return (
      <div className="min-h-screen bg-[#FFFAF2] flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-purple/10 px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.webp" alt="Mente Sana" className="h-6" />
            <span className="text-[11px] text-foreground/40 font-medium">Diagnóstico clínico</span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="max-w-lg w-full">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold mb-4">
                ✓ Matching completado
              </div>
              <h1 className="font-serif text-2xl md:text-3xl leading-tight">
                Hemos elegido a tu psicóloga.
              </h1>
              <p className="mt-2 text-sm text-foreground/60">La profesional más idónea para estudiar tu caso y elaborar tu diagnóstico.</p>
            </div>

            {/* Psychologist card with video */}
            <div className="bg-white rounded-3xl overflow-hidden border border-purple/10 shadow-xl">
              <div className="aspect-[4/5] overflow-hidden bg-purple/5 relative">
                <video
                  src={matchedPsych.video}
                  muted
                  autoPlay
                  loop
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
                  <p className="text-white text-xs font-medium opacity-80">Vídeo de bienvenida</p>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-serif text-xl font-semibold">{matchedPsych.name}</h2>
                    <p className="text-xs text-purple font-medium mt-0.5">Col. {matchedPsych.col} · {matchedPsych.city} · {matchedPsych.exp}</p>
                  </div>
                  <div className="bg-purple/10 text-purple text-[10px] font-bold px-2 py-1 rounded-full">TU MATCH</div>
                </div>
                <p className="text-sm text-foreground/60 mt-2">{matchedPsych.specialty}</p>

                {/* Justification */}
                <div className="mt-4 bg-purple/5 rounded-xl p-4 border border-purple/10">
                  <p className="text-xs font-bold text-purple mb-1">¿Por qué ella?</p>
                  <p className="text-sm text-foreground/70 leading-relaxed">{justification}</p>
                </div>

                {/* Change option */}
                <button
                  onClick={() => { /* TODO: show alternative */ }}
                  className="mt-3 text-xs text-foreground/40 hover:text-purple transition-colors underline underline-offset-2"
                >
                  ¿No te convence? Ver otra recomendación
                </button>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-8 text-center">
              <button
                onClick={() => setPhase("schedule")}
                className="block w-full bg-purple hover:bg-[#4e0d68] text-white font-bold rounded-full py-4 text-base shadow-lg transition-colors"
              >
                Elegir día y hora de mi cita →
              </button>
              <p className="mt-3 text-xs text-foreground/40">Tu psicóloga preparará tu diagnóstico antes de la sesión.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ═══ SCHEDULE PHASE — calendario 4 días ═══
  if (phase === "schedule") {
    // Generate next 4 available days (skip Sundays)
    const days: { date: Date; label: string; short: string }[] = [];
    const now = new Date();
    let d = new Date(now);
    d.setDate(d.getDate() + 1); // start tomorrow
    while (days.length < 4) {
      if (d.getDay() !== 0 && d.getDay() !== 6) { // skip Saturday & Sunday
        days.push({
          date: new Date(d),
          label: d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" }),
          short: d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" }),
        });
      }
      d.setDate(d.getDate() + 1);
    }

    // Time slots based on user preference
    const pref = answers.schedule || "flexible";
    const allSlots = [
      { id: "09:00", label: "9:00", period: "manana" },
      { id: "10:00", label: "10:00", period: "manana" },
      { id: "11:00", label: "11:00", period: "manana" },
      { id: "12:00", label: "12:00", period: "manana" },
      { id: "16:00", label: "16:00", period: "tarde" },
      { id: "17:00", label: "17:00", period: "tarde" },
      { id: "18:00", label: "18:00", period: "tarde" },
      { id: "19:00", label: "19:00", period: "tarde" },
      { id: "20:00", label: "20:00", period: "noche" },
      { id: "21:00", label: "21:00", period: "noche" },
    ];
    // Show preferred slots first, then others
    const slots = pref === "flexible" || pref === "finde"
      ? allSlots
      : [...allSlots.filter(s => s.period === pref), ...allSlots.filter(s => s.period !== pref)];

    const handleConfirmSlot = async () => {
      if (!selectedDay || !selectedSlot) return;
      setSaving(true);
      track("select_slot", { day: selectedDay, slot: selectedSlot, psychologist: matchedPsych.name });

      // Save session date in Supabase
      try {
        await fetch("/api/diagnostico-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers,
            context: contextText,
            name: userName,
            email: userEmail,
            phone: userPhone,
            matchedPsychologist: matchedPsych.name,
            scheduledDate: selectedDay,
            scheduledTime: selectedSlot,
          }),
        });
      } catch {}

      track("initiate_checkout", { amount: "9.99" });
      setSaving(false);
      setPhase("payment");
    };

    return (
      <div className="min-h-screen bg-[#FFFAF2] flex flex-col">
        <header className="bg-white border-b border-purple/10 px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.webp" alt="Mente Sana" className="h-6" />
            <span className="text-[11px] text-foreground/40 font-medium">Elige tu cita</span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="max-w-lg w-full">
            <div className="text-center mb-6">
              <p className="text-xs font-bold text-purple uppercase tracking-wider mb-2">Paso 3 de 6</p>
              <h1 className="font-serif text-xl md:text-2xl leading-tight">Elige el día y hora de tu cita de diagnóstico</h1>
              <p className="mt-2 text-sm text-foreground/50">Con {matchedPsych.name}. Videollamada de 50 min.</p>
            </div>

            {/* Day selector */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {days.map((day) => {
                const key = day.date.toISOString().split("T")[0];
                const isSelected = selectedDay === key;
                return (
                  <button
                    key={key}
                    onClick={() => { setSelectedDay(key); setSelectedSlot(""); }}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? "bg-purple text-white border-purple shadow-lg"
                        : "bg-white border-purple/10 hover:border-purple/30"
                    }`}
                  >
                    <p className={`text-[10px] uppercase font-bold ${isSelected ? "text-white/70" : "text-foreground/40"}`}>
                      {day.date.toLocaleDateString("es-ES", { weekday: "short" })}
                    </p>
                    <p className={`font-serif text-xl font-bold mt-0.5 ${isSelected ? "text-white" : "text-foreground"}`}>
                      {day.date.getDate()}
                    </p>
                    <p className={`text-[10px] ${isSelected ? "text-white/60" : "text-foreground/40"}`}>
                      {day.date.toLocaleDateString("es-ES", { month: "short" })}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Time slots */}
            {selectedDay && (
              <>
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-3">Hora disponible</p>
                <div className="grid grid-cols-5 gap-2 mb-6">
                  {slots.map((slot) => {
                    const isSelected = selectedSlot === slot.id;
                    return (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot.id)}
                        className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                          isSelected
                            ? "bg-purple text-white border-purple shadow-md"
                            : "bg-white border-purple/10 hover:border-purple/30 text-foreground/70"
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Confirm + pay */}
            {selectedDay && selectedSlot && (
              <div className="bg-white rounded-2xl border border-purple/10 p-5 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Tu cita de diagnóstico</p>
                    <p className="text-xs text-foreground/50 mt-0.5">
                      {new Date(selectedDay).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })} a las {selectedSlot}h
                    </p>
                    <p className="text-xs text-purple font-medium mt-0.5">Con {matchedPsych.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-2xl font-bold text-purple">9,99€</p>
                    <p className="text-[10px] text-foreground/40">pago único</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleConfirmSlot}
              disabled={!selectedDay || !selectedSlot || saving}
              className="w-full bg-purple hover:bg-[#4e0d68] text-white font-bold rounded-full py-4 text-base shadow-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Procesando..." : "Confirmar y pagar 9,99€ →"}
            </button>

            <p className="mt-3 text-center text-[10px] text-foreground/30">🔒 Pago seguro · Devolución garantizada · Sin suscripción</p>
          </div>
        </main>
      </div>
    );
  }

  // ═══ PAYMENT PHASE — Stripe Embedded Checkout ═══
  if (phase === "payment") {
    return <PaymentPhase
      email={userEmail}
      name={userName}
      phone={userPhone}
      psychologistName={matchedPsych.name}
      selectedDay={selectedDay}
      selectedSlot={selectedSlot}
      checkoutRef={checkoutRef}
    />;
  }

  // ═══ INTRO PHASE — paso a paso creativo ═══
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-[#FFFAF2] flex flex-col">
        <header className="bg-white border-b border-purple/10 px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.webp" alt="Mente Sana" className="h-6" />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="max-w-lg w-full">
            <div className="text-center mb-8">
              <p className="font-handwriting text-xl text-purple mb-2">Así funciona tu diagnóstico</p>
              <h1 className="font-serif text-2xl md:text-3xl leading-tight">
                6 pasos para entender qué te pasa<br />
                <em className="text-purple italic font-normal">y tener un plan real.</em>
              </h1>
            </div>

            {/* Timeline creativa */}
            <div className="space-y-0 relative">
              {/* Línea vertical */}
              <div className="absolute left-[22px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-purple/30 via-purple/20 to-purple/10" />

              {[
                { n: "1", icon: "📝", title: "Respondes 5 preguntas", desc: "2 minutos. Sobre cómo te sientes y qué buscas. Es lo que harás ahora.", active: true },
                { n: "2", icon: "🎯", title: "Elegimos a tu profesional", desc: "La psicóloga más idónea para estudiar tu caso y elaborar tu diagnóstico." },
                { n: "3", icon: "📅", title: "Eliges día y hora", desc: "Ves la disponibilidad de tu psicóloga y reservas tu cita de diagnóstico." },
                { n: "4", icon: "💳", title: "Pagas 9,99€", desc: "Pago único. Sin suscripción. Devolución garantizada si no te ayuda." },
                { n: "5", icon: "📄", title: "Recibes el formulario completo", desc: "Por email. Tu psicóloga lo usa para preparar tu informe antes de la cita." },
                { n: "6", icon: "💬", title: "Asistes a tu cita y recibes tu diagnóstico", desc: "50 min de videollamada. Te explica tu informe, cada hallazgo, y construís un plan juntos." },
              ].map((step) => (
                <div key={step.n} className={`flex items-start gap-4 py-3 ${step.active ? "" : "opacity-70"}`}>
                  <div className={`relative z-10 w-11 h-11 rounded-full flex items-center justify-center text-lg shrink-0 ${step.active ? "bg-purple text-white shadow-lg shadow-purple/30" : "bg-white border-2 border-purple/20"}`}>
                    {step.icon}
                  </div>
                  <div className="pt-1.5">
                    <p className={`text-sm font-semibold ${step.active ? "text-purple" : "text-foreground/80"}`}>
                      <span className="text-foreground/30 mr-1.5">{step.n}.</span>{step.title}
                    </p>
                    <p className="text-xs text-foreground/50 mt-0.5 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-8 text-center">
              <button
                onClick={() => { setPhase("questions"); track("start_matching", {}); }}
                className="w-full bg-purple hover:bg-[#4e0d68] text-white font-bold rounded-full py-4 text-base shadow-lg transition-colors"
              >
                Empezar las 5 preguntas →
              </button>
              <p className="mt-3 text-[11px] text-foreground/40">🔒 Tus respuestas son confidenciales · 2 minutos</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ═══ CONTEXT PHASE — pregunta abierta ═══
  if (phase === "context") {
    return (
      <div className="min-h-screen bg-[#FFFAF2] flex flex-col">
        <header className="bg-white border-b border-purple/10 px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.webp" alt="Mente Sana" className="h-6" />
            <span className="text-[11px] text-foreground/40 font-medium">Casi listo</span>
          </div>
        </header>
        <div className="bg-purple/10 h-1.5"><div className="h-full bg-purple rounded-r-full" style={{ width: "85%" }} /></div>

        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="max-w-lg w-full">
            <div className="text-center mb-6">
              <p className="text-xs font-bold text-purple uppercase tracking-wider mb-2">Una última cosa</p>
              <h1 className="font-serif text-xl md:text-2xl leading-tight">Cuéntanos un poco más con tus palabras</h1>
              <p className="mt-2 text-sm text-foreground/50">Esto ayuda a tu psicóloga a preparar mejor tu diagnóstico. Puedes escribir lo que quieras o dejarlo en blanco.</p>
            </div>

            <textarea
              value={contextText}
              onChange={(e) => setContextText(e.target.value)}
              placeholder="Ej: Llevo meses sin dormir bien. Trabajo demasiado y siento que estoy al límite. Mi pareja me dice que he cambiado pero no sé cómo explicar qué me pasa..."
              className="w-full h-32 bg-white rounded-2xl border border-purple/15 p-4 text-sm text-foreground/80 placeholder:text-foreground/30 resize-none focus:outline-none focus:ring-2 focus:ring-purple/30 focus:border-purple/30"
            />

            <button
              onClick={() => setPhase("contact")}
              className="w-full mt-6 bg-purple hover:bg-[#4e0d68] text-white font-bold rounded-full py-4 text-base shadow-lg transition-colors"
            >
              {contextText.trim() ? "Continuar →" : "Saltar y continuar →"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ═══ CONTACT PHASE — email + nombre (obligatorio) ═══
  if (phase === "contact") {
    return (
      <div className="min-h-screen bg-[#FFFAF2] flex flex-col">
        <header className="bg-white border-b border-purple/10 px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.webp" alt="Mente Sana" className="h-6" />
            <span className="text-[11px] text-foreground/40 font-medium">Último paso</span>
          </div>
        </header>
        <div className="bg-purple/10 h-1.5"><div className="h-full bg-purple rounded-r-full" style={{ width: "95%" }} /></div>

        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="max-w-lg w-full">
            <div className="text-center mb-6">
              <p className="text-xs font-bold text-purple uppercase tracking-wider mb-2">¿Dónde te enviamos tu diagnóstico?</p>
              <h1 className="font-serif text-xl md:text-2xl leading-tight">Necesitamos tu email para enviarte el resultado</h1>
              <p className="mt-2 text-sm text-foreground/50">También lo usará tu psicóloga para contactarte con tu cita.</p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
                className="w-full bg-white rounded-xl border border-purple/15 px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple/30 focus:border-purple/30"
              />
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="Tu email *"
                autoComplete="email"
                required
                className="w-full bg-white rounded-xl border border-purple/15 px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple/30 focus:border-purple/30"
              />
              <input
                type="tel"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
                placeholder="WhatsApp (opcional, para recordatorios)"
                autoComplete="tel"
                className="w-full bg-white rounded-xl border border-purple/15 px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple/30 focus:border-purple/30"
              />
            </div>

            <button
              onClick={saveAndProceed}
              disabled={!userEmail || saving}
              className="w-full mt-6 bg-purple hover:bg-[#4e0d68] text-white font-bold rounded-full py-4 text-base shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Guardando..." : "Ver mi psicóloga asignada →"}
            </button>

            <p className="mt-3 text-center text-[10px] text-foreground/30">🔒 No spam. Solo te escribiremos para tu diagnóstico.</p>
          </div>
        </main>
      </div>
    );
  }

  // ═══ QUESTIONS PHASE ═══
  const q = QUESTIONS[currentQ];
  const progress = ((currentQ) / QUESTIONS.length) * 100;

  return (
    <div className="min-h-screen bg-[#FFFAF2] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-purple/10 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.webp" alt="Mente Sana" className="h-6" />
          <span className="text-[11px] text-foreground/40 font-medium">{currentQ + 1} de {QUESTIONS.length}</span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-purple/10 h-1.5">
        <div
          className="h-full bg-purple rounded-r-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-lg w-full" key={q.id}>
          <div className="text-center mb-8">
            <p className="text-xs font-bold text-purple uppercase tracking-wider mb-2">Pregunta {currentQ + 1}</p>
            <h1 className="font-serif text-xl md:text-2xl leading-tight">{q.title}</h1>
            <p className="mt-2 text-sm text-foreground/50">{q.subtitle}</p>
          </div>

          <div className="space-y-3">
            {q.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => selectOption(q.id, opt.id)}
                className={`w-full text-left bg-white rounded-2xl p-4 border transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  answers[q.id] === opt.id
                    ? "border-purple ring-2 ring-purple/20 shadow-md"
                    : "border-purple/10 hover:border-purple/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl flex-shrink-0">{opt.icon}</span>
                  <span className="text-sm font-medium text-foreground/80">{opt.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-purple/10 px-4 py-3 text-center">
        <p className="text-[11px] text-foreground/30">🔒 Tus respuestas son confidenciales · No compartimos datos con terceros</p>
      </footer>
    </div>
  );
}

// ═══ PAYMENT COMPONENT — Stripe Embedded Checkout ═══
function PaymentPhase({ email, name, phone, psychologistName, selectedDay, selectedSlot, checkoutRef }: {
  email: string; name: string; phone: string; psychologistName: string;
  selectedDay: string; selectedSlot: string; checkoutRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    async function initCheckout() {
      try {
        const utms: Record<string, string> = {};
        try {
          const p = new URLSearchParams(window.location.search);
          ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(k => {
            const v = p.get(k) || localStorage.getItem(`ms_first_${k}`) || "";
            if (v) utms[k] = v;
          });
          utms.referrer = document.referrer || "";
          utms.landing_page = "/test-diagnostico";
        } catch {}

        const res = await fetch("/api/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name,
            phone,
            psychologistName,
            utms: { ...utms, scheduled_date: selectedDay, scheduled_time: selectedSlot },
          }),
        });

        const data = await res.json();
        if (!mounted.current) return;

        if (data.error) {
          setError(data.detail || data.error);
          setLoading(false);
          return;
        }

        // Load Stripe.js and mount embedded checkout
        const { loadStripe } = await import("@stripe/stripe-js");
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
        if (!stripe || !mounted.current) return;

        const checkout = await (stripe as any).initEmbeddedCheckout({ clientSecret: data.clientSecret });
        if (!mounted.current) { checkout.destroy(); return; }

        if (checkoutRef.current) {
          checkoutRef.current.innerHTML = "";
          checkout.mount(checkoutRef.current);
        }
        setLoading(false);
      } catch (e) {
        if (mounted.current) {
          setError(e instanceof Error ? e.message : "Error al cargar el pago");
          setLoading(false);
        }
      }
    }
    initCheckout();
  }, [email, name, phone, psychologistName, selectedDay, selectedSlot, checkoutRef]);

  return (
    <div className="min-h-screen bg-[#FFFAF2] flex flex-col">
      <header className="bg-white border-b border-purple/10 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo.webp" alt="Mente Sana" className="h-6" />
          <span className="text-[11px] text-foreground/40 font-medium">Pago seguro</span>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-lg mx-auto">
          {/* Resumen de cita */}
          <div className="bg-white rounded-2xl border border-purple/10 p-5 mb-6">
            <p className="text-xs font-bold text-purple uppercase tracking-wider mb-3">Tu cita de diagnóstico</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {new Date(selectedDay).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })} · {selectedSlot}h
                </p>
                <p className="text-xs text-purple font-medium mt-0.5">Con {psychologistName}</p>
                <p className="text-xs text-foreground/50 mt-0.5">{email}</p>
              </div>
              <div className="text-right">
                <p className="font-serif text-2xl font-bold text-purple">9,99€</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-black/5 grid grid-cols-3 gap-2 text-center">
              <div><p className="text-[10px] text-foreground/40">📄 Informe</p></div>
              <div><p className="text-[10px] text-foreground/40">🎯 Matching</p></div>
              <div><p className="text-[10px] text-foreground/40">💬 50 min</p></div>
            </div>
          </div>

          {/* Stripe Checkout */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-purple/20 border-t-purple rounded-full animate-spin mb-4" />
              <p className="text-sm text-foreground/50">Cargando pago seguro...</p>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button onClick={() => window.location.reload()} className="mt-3 text-xs text-purple font-bold underline">Reintentar</button>
            </div>
          )}
          <div ref={checkoutRef} className={loading ? "hidden" : ""} />

          <div className="mt-6 text-center space-y-2">
            <p className="text-[10px] text-foreground/30">🔒 Pago cifrado · Stripe · Devolución garantizada</p>
            <p className="text-[10px] text-foreground/30">En tu extracto aparece como &ldquo;MS Servicios&rdquo;</p>
          </div>
        </div>
      </main>
    </div>
  );
}
