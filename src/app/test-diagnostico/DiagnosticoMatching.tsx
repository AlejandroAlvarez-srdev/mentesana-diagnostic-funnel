"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { track, getVisitorId as getAnalyticsVisitorId, getSessionId } from "@/lib/tracking";
import { getVariant, getVisitorId, getForcedVariant } from "@/lib/ab-test";
import { PRECIO_ESTANDAR, type PrecioDiagnostico } from "@/lib/diagnostico-precio";
import PagoUnaPantalla from "./PagoUnaPantalla";

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
    title: "¿Cuándo prefieres tener tu sesión con tu psicóloga?",
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

// ═══ Psychologists pool — rotación determinista por email (ver matchedPsych abajo) ═══
export type PsychologistEntry = {
  name: string;
  city: string;
  exp: string;
  specialty: string;
  video: string;
  profiles: string[];
};

export const PSYCHOLOGISTS: PsychologistEntry[] = [
  // Ansiedad
  { name: "Adriana Salas", city: "Madrid", exp: "10 años", specialty: "Ansiedad, pánico, TCC", video: "/videos/welcome/adriana-salas.mp4", profiles: ["ansiedad", "estres"] },
  { name: "Carolina Prudencio", city: "Madrid", exp: "9 años", specialty: "Ansiedad generalizada, mindfulness", video: "/videos/welcome/carolina-prudencio.mp4", profiles: ["ansiedad", "otro"] },
  { name: "María Infante", city: "Valencia", exp: "8 años", specialty: "Ansiedad social, fobias, TCC", video: "/videos/welcome/maria-infante.mp4", profiles: ["ansiedad", "relaciones"] },
  // Depresión
  { name: "Diana Salazar", city: "Madrid", exp: "11 años", specialty: "Depresión, insomnio, duelo", video: "/videos/welcome/diana-salazar-alzate.mp4", profiles: ["depresion", "otro"] },
  { name: "Brenda Castillo", city: "Barcelona", exp: "10 años", specialty: "Depresión, terapia sistémica", video: "/videos/welcome/brenda-castillo.mp4", profiles: ["depresion", "relaciones"] },
  { name: "Melanie Camejo", city: "Sevilla", exp: "8 años", specialty: "Depresión, duelo, autoestima", video: "/videos/welcome/melanie-camejo.mp4", profiles: ["depresion", "crecimiento"] },
  { name: "Rosana Juárez", city: "Madrid", exp: "12 años", specialty: "Depresión, terapia integrativa", video: "/videos/welcome/rosana-juarez.mp4", profiles: ["depresion", "otro"] },
  // Relaciones
  { name: "Gabriela Delgado", city: "Valencia", exp: "8 años", specialty: "Relaciones, autoestima, fobias", video: "/videos/welcome/gabriela-delgado.mp4", profiles: ["relaciones", "crecimiento"] },
  { name: "Tatiana Castro", city: "Barcelona", exp: "9 años", specialty: "Terapia de pareja, vínculos", video: "/videos/welcome/tatiana-castro.mp4", profiles: ["relaciones", "otro"] },
  { name: "Mónica Guiza", city: "Madrid", exp: "10 años", specialty: "Relaciones, apego, familia", video: "/videos/welcome/monica-guiza.mp4", profiles: ["relaciones", "crecimiento"] },
  { name: "Laura Acosta", city: "Málaga", exp: "7 años", specialty: "Relaciones, dependencia emocional", video: "/videos/welcome/laura-acosta-acosta.mp4", profiles: ["relaciones", "otro"] },
  // Estrés / burnout
  { name: "Alexandra Elías", city: "Barcelona", exp: "9 años", specialty: "Burnout, EMDR, estrés laboral", video: "/videos/welcome/alexandra-elias.mp4", profiles: ["estres", "crecimiento"] },
  { name: "Greslimar Padilla", city: "Madrid", exp: "8 años", specialty: "Estrés laboral, mindfulness", video: "/videos/welcome/greslimar-padilla.mp4", profiles: ["estres", "ansiedad"] },
  { name: "Antonella Matinella", city: "Bilbao", exp: "10 años", specialty: "Burnout, sueño, regulación emocional", video: "/videos/welcome/antonella-matinella.mp4", profiles: ["estres", "otro"] },
  // Crecimiento / otros
  { name: "Selene Oropeza", city: "Madrid", exp: "9 años", specialty: "Crecimiento personal, autoconocimiento", video: "/videos/welcome/selene-oropeza.mp4", profiles: ["crecimiento", "otro"] },
  { name: "Juliana Urioste", city: "Valencia", exp: "7 años", specialty: "Crecimiento, decisiones vitales", video: "/videos/welcome/juliana-urioste.mp4", profiles: ["crecimiento", "relaciones"] },
  { name: "Yohaira Espinoza", city: "Zaragoza", exp: "11 años", specialty: "Terapia integrativa, psicoanálisis", video: "/videos/welcome/yohaira-espinoza.mp4", profiles: ["otro", "crecimiento"] },
  { name: "Mallerly Mesa", city: "Barcelona", exp: "8 años", specialty: "Autoestima, identidad, duelo", video: "/videos/welcome/mallerly-mesa.mp4", profiles: ["crecimiento", "depresion"] },
];

// Videos del "equipo" que se ven en el hero del home (src/components/Hero.tsx).
// Se muestran en la fase intro de /test-diagnostico-app (variant="app") para dar
// continuidad visual desde el home cuando el usuario entra desde la app móvil.
const TEAM_VIDEOS: { src: string; video: string; caption: string; alt: string }[] = [
  { src: "/images/studio/img_1775329545580.webp", video: "/videos/studio/vid_1775330061942.mp4", alt: "Psicóloga online",      caption: "Tu psicóloga" },
  { src: "/images/studio/img_1775329570001.webp", video: "/videos/studio/vid_1775330265017.mp4", alt: "Terapia desde casa",    caption: "Desde casa" },
  { src: "/images/studio/img_1775329636833.webp", video: "/videos/studio/vid_1775330460566.mp4", alt: "Consulta online",       caption: "Tu espacio" },
  { src: "/images/studio/img_1775329661586.webp", video: "/videos/studio/vid_1775330658684.mp4", alt: "Psicóloga Mente Sana",  caption: "Empatía real" },
  { src: "/images/studio/img_1775330229663.webp", video: "/videos/studio/vid_1775334512609.mp4", alt: "Terapia de pareja",     caption: "Sin tabúes" },
  { src: "/images/studio/img_1775329736019.webp", video: "/videos/studio/vid_1775331064457.mp4", alt: "Equipo Mente Sana",     caption: "Nuestro equipo" },
  { src: "/images/studio/img_1775330204983.webp", video: "/videos/studio/vid_1775334709433.mp4", alt: "Terapia digital",       caption: "100% online" },
  { src: "/images/studio/img_1775329824110.webp", video: "/videos/studio/vid_1775331485286.mp4", alt: "Psicóloga profesional", caption: "Profesional" },
];

function TeamVideosStrip() {
  return (
    <section className="mt-6 -mx-4">
      <div className="px-4 mb-2.5 text-center">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-purple/70">Conoce a nuestro equipo</p>
        <p className="text-[11.5px] text-foreground/60 mt-0.5">Psicólogas colegiadas que atienden desde estudios profesionales</p>
      </div>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-3 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        {TEAM_VIDEOS.map((v) => (
          <div key={v.video} className="snap-start shrink-0 w-[128px]">
            <div className="w-full aspect-[3/4] rounded-xl overflow-hidden bg-purple/5 border-2 border-white shadow-md relative">
              <video src={v.video} poster={v.src} muted autoPlay loop playsInline preload="metadata" className="w-full h-full object-cover" />
            </div>
            <p className="text-[10px] font-semibold text-foreground/75 text-center mt-1.5 leading-tight">{v.caption}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DiagnosticoMatching({ variant = "web", precio = PRECIO_ESTANDAR }: { variant?: "web" | "app"; precio?: PrecioDiagnostico } = {}) {
  const isApp = variant === "app";

  // A/B test "diagnostico-v2" — 50/50 split determinista por visitor_id.
  // A = control (diseño actual); B = variante con Quick Wins CRO aplicados.
  // Override manual: si vienes con ?ab=A o ?ab=B en la URL, forzamos esa variante
  // (útil para QA/demo). Marcamos `forced=true` en el event para poder excluirlos
  // del análisis estadístico del test real.
  const [ab, abForced] = useMemo(() => {
    const forced = getForcedVariant();
    if (forced) return [forced, true] as const;
    return [getVariant("diagnostico-v2", getVisitorId()), false] as const;
  }, []);
  useEffect(() => {
    track("variant_assigned", { test: "diagnostico-v2", ab, forced: abForced });
  }, [ab, abForced]);
  const COPY = {
    intro: {
      kicker: isApp ? "Bienvenida desde la app" : "Así funciona tu diagnóstico",
      titleLine1: isApp ? "Tu premium, tu diagnóstico" : "6 pasos para entender qué te pasa",
      titleLine2: isApp ? "y tu 1ª cita psicológica." : "y tener un plan real.",
      step4Title: isApp ? `Pagas ${precio.texto} (incluye todo)` : `Pagas ${precio.texto}`,
      step4Desc: isApp ? "Pago único que incluye premium de la app + diagnóstico + cita psicológica. Sin suscripción." : "Pago único. Sin suscripción.",
    },
    contact: {
      kicker: isApp ? "Un paso más" : "Ya tenemos tu match ✨",
      title: isApp ? "Usa el mismo email con el que te registraste en la app" : "¿A qué email te enviamos tu psicóloga y tu diagnóstico?",
      subtitle: isApp ? "Así activamos tu premium en el mismo email + te enviamos tu diagnóstico + confirmamos tu cita." : "Te guardamos tu match y tu hueco para que no lo pierdas.",
      placeholder: isApp ? "El email con el que te registraste en la app" : "tucorreo@email.com",
    },
  };
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [contextText] = useState(""); // antes lo capturaba la fase 'context' (eliminada); ahora siempre vacío
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [phase, setPhase] = useState<"intro" | "questions" | "analyzing" | "contact" | "schedule" | "payment">("intro");
  // true si se entró con ?directo=1: quien salta la portada no ha visto qué es esto
  // ni cuánto cuesta → en la pregunta 1 se le muestra precio + prueba social.
  const [directEntry, setDirectEntry] = useState(false);
  // A/B #5 "una pantalla" (acción 2 de /interno/subir-el-082): en B la psicóloga, el
  // hueco y el pago van en una sola pantalla (PagoUnaPantalla); en A, el flujo de
  // siempre (calendario → pago). La variante la fija proxy.ts en la cookie
  // ms_ab_pago; ?pantalla=A|B la fuerza. Sin cookie (otras rutas) → A.
  const [abPago, setAbPago] = useState<"A" | "B">("A");
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  // Slots reales desde Amelia (se carga al entrar en phase='schedule')
  const [realSlots, setRealSlots] = useState<{ day: string; weekday: string; hour: number; iso: string }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  // Pool COMPLETO de psicólogas desde Amelia — el match aleatorio sale de aquí.
  // Si la API falla o todavía no cargó, se cae al array hardcoded.
  const [ameliaPool, setAmeliaPool] = useState<{ id: number; name: string; video_url: string | null; has_video: boolean; photo_url: string | null; description: string | null; earliest_iso?: string | null; earliest_day?: string | null; soon?: boolean }[] | null>(null);
  // Pool base para el fallback (fase 2 del match): antes era el array hardcoded
  // PSYCHOLOGISTS a pelo. Ahora arrancamos con ese hardcoded (no romper UX
  // mientras el fetch está en vuelo) y lo reemplazamos por el que devuelve
  // /api/test-diagnostico/pool — que es el MISMO catálogo filtrado por psicólogas
  // con status='visible' en Amelia (excluye hidden). Si el fetch falla, seguimos
  // con el hardcoded (mejor mostrar más que menos).
  const [dynamicPool, setDynamicPool] = useState<PsychologistEntry[] | null>(null);
  const effectivePool = useMemo<PsychologistEntry[]>(
    () => (dynamicPool && dynamicPool.length > 0 ? dynamicPool : PSYCHOLOGISTS),
    [dynamicPool],
  );
  const checkoutRef = useRef<HTMLDivElement>(null);

  // Carga el pool COMPLETO de psicólogas desde Amelia (una vez por sesión)
  useEffect(() => {
    fetch("/api/diagnostico/match-pool")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.pool) && d.pool.length > 0) setAmeliaPool(d.pool); })
      .catch(() => { /* silencio: fallback al hardcoded */ });
  }, []);

  // Carga el pool del /test-diagnostico filtrado por visibles en Amelia
  // (endpoint dinámico). Si falla o llega vacío, dejamos dynamicPool=null y
  // el `effectivePool` sigue siendo el array hardcoded (fallback seguro).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/test-diagnostico/pool")
      .then((r) => r.json())
      .then((d: { pool?: PsychologistEntry[] }) => {
        if (cancelled) return;
        if (Array.isArray(d?.pool) && d.pool.length > 0) setDynamicPool(d.pool);
      })
      .catch(() => { /* silencio: fallback al hardcoded */ });
    return () => { cancelled = true; };
  }, []);

  // A/B "flujo directo": si la landing envía ?directo=1 (o ?paso=test) saltamos la
  // intro (paso 2) y entramos directo a las 5 preguntas (paso 3). OPT-IN — sin el
  // parámetro el comportamiento por defecto (phase="intro") NO cambia nada.
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.get("directo") === "1" || p.get("paso") === "test") {
        setPhase("questions");
        setDirectEntry(true);
        track("start_matching", { source: "landing_directo" });
      }
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("pantalla");
      if (q === "A" || q === "B") { setAbPago(q); return; }
      const m = document.cookie.match(/(?:^|;\s*)ms_ab_pago=([AB])/);
      if (m?.[1] === "B") setAbPago("B");
    } catch { /* noop */ }
  }, []);

  // Carga slots reales cuando entramos a la fase "schedule"
  useEffect(() => {
    if (phase !== "schedule") return;
    // Evento de embudo: el usuario ha llegado a la página de agendar (antes no se
    // registraba nada hasta select_slot → no se podía medir el drop match→agendar).
    // ab_warming va colgado automáticamente desde tracking.ts.
    track("view_schedule", { psychologist: matchedPsych?.name ?? "" });
    let cancel = false;
    setSlotsLoading(true);
    setSlotsError(null);
    const name = encodeURIComponent(matchedPsych?.name ?? "");
    fetch(`/api/diagnostico/free-slots?psychologist_name=${name}&days=14`)
      .then(r => r.json())
      .then((d) => {
        if (cancel) return;
        if (d.error) { setSlotsError(d.error); setRealSlots([]); }
        else setRealSlots(d.slots ?? []);
      })
      .catch(() => { if (!cancel) setSlotsError("network"); })
      .finally(() => { if (!cancel) setSlotsLoading(false); });
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // FRICCIÓN (fuga match→agenda): al cargar los huecos reales pre-seleccionamos el
  // día y la hora MÁS CERCANOS, de modo que el usuario solo tenga que CONFIRMAR
  // (antes había que elegir día + hora a mano → ahí se caía ~69%). Si ya eligió algo
  // manualmente, respetamos su elección.
  useEffect(() => {
    if (phase !== "schedule" || realSlots.length === 0 || selectedDay) return;
    const firstDay = realSlots[0].day;
    const firstSlot = realSlots.find((s) => s.day === firstDay);
    if (firstDay) setSelectedDay(firstDay);
    if (firstSlot) setSelectedSlot(`${String(firstSlot.hour).padStart(2, "0")}:00`);
  }, [phase, realSlots, selectedDay]);

  // Persist in localStorage for remarketing recovery
  useEffect(() => {
    // Pre-rellena email/nombre/teléfono si ya los dejó en una sesión previa
    // (el gate pre-match solo pide email; nombre/teléfono se conservan si los tiene).
    const savedEmail = localStorage.getItem("ms_user_email") || localStorage.getItem("ms_diagnostico_email");
    if (savedEmail) setUserEmail(savedEmail);
    const savedName = localStorage.getItem("ms_user_name") || localStorage.getItem("ms_diagnostico_name");
    if (savedName) setUserName(savedName);
    const savedPhone = localStorage.getItem("ms_user_phone");
    if (savedPhone) setUserPhone(savedPhone);

    const saved = localStorage.getItem("ms_diagnostico_answers");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAnswers(parsed);
        const answered = Object.keys(parsed).length;
        if (answered >= QUESTIONS.length) {
          setPhase("schedule");
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
      // After all 5 questions → email gate (antes pasaba por analyzing primero).
      // Pedimos el email mientras la persona aún siente el cierre del test, sin
      // gastar el suspense; las animaciones del match vienen DESPUÉS del email
      // como recompensa por dejarlo.
      setTimeout(() => {
        track("view_email_gate", { profile: newAnswers.feeling || "", ab });
        setPhase("contact");
      }, 400);
    }
  }, [answers, currentQ]);

  // Save to API (always, whether they pay or not).
  // Teléfono OPCIONAL en el gate pre-match (antes era obligatorio): pedirlo aquí
  // frenaba el embudo y, con WhatsApp caído, el email es el canal de recuperación.
  // Se sigue capturando el número si el usuario lo escribe.
  const saveAndProceed = async () => {
    // El email es obligatorio (es nuestro canal de recuperación de carrito). El
    // teléfono es OPCIONAL en este gate pre-match: pedirlo aquí frenaba el embudo
    // y, con WhatsApp caído, el email es lo que de verdad recupera. Se captura si lo dan.
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
          source: "test-diagnostico",
          answers,
          context: contextText,
          name: userName,
          email: userEmail,
          phone: userPhone,
          matchedPsychologist: matchedPsych.name,
        }),
      });
    } catch {}

    track("start_matching_analysis", { profile: answers.feeling || "", email: userEmail, ab });
    setSaving(false);
    // Tras email → animaciones de match (analyzing) → calendario (schedule).
    // Las animaciones materializan el valor de dejar el email: la persona ve
    // reveal de foto, por qué encaja, y entra al calendario ya enamorada.
    setPhase("analyzing");
  };

  // Match logic — 100% aleatorio sobre el pool COMPLETO de Amelia
  // (las +150 psicólogas activas). Si el pool no cargó aún, fallback al
  // array hardcoded para no romper la UI. Se fija en localStorage para
  // que no parpadee en re-renders.
  const matchedPsych = (() => {
    const feeling = answers.feeling || "ansiedad";

    if (typeof window === "undefined") return effectivePool[0];

    // 1) Si tenemos pool real de Amelia → random puro sobre TODAS las que tienen vídeo
    //    (preferimos vídeo para mantener el card visual de la sección "TU MATCH").
    if (ameliaPool && ameliaPool.length > 0) {
      // v4: prioriza disponibilidad cercana (ver selección abajo).
      const storageKey = `ms_match_amelia_v4_${feeling}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const found = ameliaPool.find(p => p.name === stored);
        if (found) {
          return {
            name: found.name,
            city: "España",
            exp: "Colegiada",
            specialty: "Psicóloga colegiada · sesiones online",
            video: found.video_url ?? "/videos/welcome/diana-salazar-alzate.mp4",
            photo: found.photo_url ?? null,
            description: found.description ?? null,
          };
        }
      }
      // Priorizar disponibilidad cercana: 1º las que tienen hueco HOY o MAÑANA (random entre ellas);
      // si no hay ninguna, las de primer hueco más próximo (top 8); si no hay datos, random puro.
      const soonOnes = ameliaPool.filter(p => p.soon);
      let candidates = soonOnes;
      if (candidates.length === 0) {
        const withSlot = ameliaPool.filter(p => p.earliest_iso);
        candidates = withSlot.length > 0
          ? [...withSlot].sort((a, b) => String(a.earliest_iso).localeCompare(String(b.earliest_iso))).slice(0, 8)
          : ameliaPool;
      }
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      try { localStorage.setItem(storageKey, pick.name); } catch {}
      return {
        name: pick.name,
        city: "España",
        exp: "Colegiada",
        specialty: "Psicóloga colegiada · sesiones online",
        video: pick.video_url ?? "/videos/welcome/diana-salazar-alzate.mp4",
        photo: pick.photo_url ?? null,
        description: pick.description ?? null,
      };
    }

    // 2) Fallback: pool dinámico (endpoint /api/test-diagnostico/pool) o
    //    array hardcoded si el fetch aún no llegó / falló. Antes esto era
    //    PSYCHOLOGISTS a pelo — ahora respeta status='visible' de Amelia.
    const candidates = effectivePool.filter((p) => p.profiles.includes(feeling));
    const pool = candidates.length > 0 ? candidates : effectivePool;
    const storageKey = `ms_match_pick_v2_${feeling}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const found = pool.find(p => p.name === stored);
      if (found) return found;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    try { localStorage.setItem(storageKey, pick.name); } catch {}
    return pick;
  })();

  // Guarda el hueco elegido (local + BD) para no perderlo si abandona el pago. Lo
  // usan el control (al pulsar «Confirmar y pagar») y la variante de una pantalla
  // (en cuanto hay hueco elegido).
  const persistSchedule = async (day: string, slot: string) => {
    try {
      localStorage.setItem("ms_diagnostico_schedule", JSON.stringify({ day, slot, psychologist: matchedPsych.name }));
    } catch {}
    const emailForSave = userEmail || localStorage.getItem("ms_user_email") || localStorage.getItem("ms_diagnostico_email") || "";
    if (!emailForSave) return;
    try {
      await fetch("/api/diagnostico-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "test-diagnostico",
          answers,
          context: contextText,
          name: userName || localStorage.getItem("ms_diagnostico_name") || "",
          email: emailForSave,
          phone: userPhone || localStorage.getItem("ms_user_phone") || "",
          matchedPsychologist: matchedPsych.name,
          scheduledDate: day,
          scheduledTime: slot,
        }),
      });
    } catch {}
  };

  if (phase === "analyzing") {
    const psychPhoto: string | null = "photo" in matchedPsych ? (matchedPsych.photo ?? null) : null;
    const TEMA_PSI: Record<string, string> = { ansiedad: "ansiedad", depresion: "ánimo y motivación", relaciones: "relaciones y vínculos", estres: "estrés y burnout", crecimiento: "autoconocimiento", otro: "lo que te está pasando" };
    return (
      <AnalyzingPhase
        onComplete={() => {
          track("view_match_result", { profile: answers.feeling || "", email: userEmail, ab });
          setPhase("schedule");
        }}
        matchedPsychName={matchedPsych.name}
        matchedPsychPhoto={psychPhoto}
        feelingLabel={TEMA_PSI[answers.feeling] || TEMA_PSI.otro}
      />
    );
  }

  // ═══ SCHEDULE PHASE — calendario con disponibilidad REAL Amelia ═══
  if (phase === "schedule") {
    // matchedPsych puede ser el tipo Amelia (con photo) o el fallback hardcoded (sin photo).
    const psychPhoto: string | null = "photo" in matchedPsych ? (matchedPsych.photo ?? null) : null;
    // Tema del usuario (en su lenguaje) para personalizar el "encaja con tu perfil".
    const TEMA: Record<string, string> = { ansiedad: "ansiedad", depresion: "ánimo y motivación", relaciones: "relaciones y vínculos", estres: "estrés y burnout", crecimiento: "autoconocimiento", otro: "lo que te está pasando" };
    const temaLabel = TEMA[answers.feeling] || TEMA.otro;

    // Variante B del A/B #5: psicóloga + hueco + pago en una sola pantalla. Usa los
    // mismos slots, la misma preselección del hueco más cercano y el mismo checkout.
    if (abPago === "B") {
      return (
        <PagoUnaPantalla
          psych={{ name: matchedPsych.name, video: matchedPsych.video, photo: psychPhoto }}
          temaLabel={temaLabel}
          slots={realSlots}
          slotsLoading={slotsLoading}
          slotsError={slotsError}
          selectedDay={selectedDay}
          selectedSlot={selectedSlot}
          onSelect={(d, s) => { setSelectedDay(d); setSelectedSlot(s); }}
          onPersistSchedule={persistSchedule}
          onReroll={() => {
            track("reroll_match_requested", { current_psi: matchedPsych.name, ab });
            try { localStorage.removeItem(`ms_match_amelia_v4_${answers.feeling || "ansiedad"}`); } catch {}
            window.location.reload();
          }}
          precio={precio}
          ab={ab}
        />
      );
    }

    // Agrupar slots reales por día (los slots vienen ya en hora Madrid, en orden).
    const byDay = new Map<string, { hour: number; label: string; period: string }[]>();
    for (const s of realSlots) {
      const period = s.hour < 13 ? "manana" : s.hour < 20 ? "tarde" : "noche";
      const label = `${String(s.hour).padStart(2, "0")}:00`;
      const arr = byDay.get(s.day) ?? [];
      arr.push({ hour: s.hour, label, period });
      byDay.set(s.day, arr);
    }
    // Aseguramos orden ascendente por hora dentro de cada día.
    for (const [k, arr] of byDay) {
      arr.sort((a, b) => a.hour - b.hour);
      byDay.set(k, arr);
    }
    const days = Array.from(byDay.keys()).sort().map((key) => {
      const [y, m, dd] = key.split("-").map(Number);
      return { key, date: new Date(y, m - 1, dd) };
    });

    // Calendario visual: rejilla de mes (L M X J V S D) con todos los días entre
    // hoy y el último día disponible. Días sin huecos quedan deshabilitados.
    const availableDayKeys = new Set(days.map((d) => d.key));
    const toKey = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastAvailable = days.length > 0 ? days[days.length - 1].date : today;
    // Alinear el inicio al lunes de la semana de hoy y el fin al domingo de la última.
    const gridStart = new Date(today);
    const dayOfWeekStart = (gridStart.getDay() + 6) % 7; // 0=lunes
    gridStart.setDate(gridStart.getDate() - dayOfWeekStart);
    const gridEnd = new Date(lastAvailable);
    const dayOfWeekEnd = (gridEnd.getDay() + 6) % 7;
    gridEnd.setDate(gridEnd.getDate() + (6 - dayOfWeekEnd));
    const calendarCells: { key: string; date: Date; available: boolean; isPast: boolean; isToday: boolean }[] = [];
    for (let cur = new Date(gridStart); cur <= gridEnd; cur.setDate(cur.getDate() + 1)) {
      const key = toKey(cur);
      calendarCells.push({
        key,
        date: new Date(cur),
        available: availableDayKeys.has(key),
        isPast: cur < today,
        isToday: cur.getTime() === today.getTime(),
      });
    }
    // Etiqueta del mes (o "Junio · Julio" si el rango cruza meses)
    const firstAvailableMonth = days[0]?.date ?? today;
    const lastAvailableMonth = lastAvailable;
    const monthLabel = firstAvailableMonth.getMonth() === lastAvailableMonth.getMonth()
      ? firstAvailableMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
      : `${firstAvailableMonth.toLocaleDateString("es-ES", { month: "long" })} · ${lastAvailableMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}`;

    // Las horas siempre se muestran en orden ascendente. La preferencia
    // (mañana/tarde/noche) solo resalta visualmente — nunca reordena.
    const pref = answers.schedule || "flexible";
    const slotsForSelectedDay = (selectedDay ? byDay.get(selectedDay) : []) ?? [];

    const handleConfirmSlot = async () => {
      if (!selectedDay || !selectedSlot) return;
      setSaving(true);
      track("select_slot", { day: selectedDay, slot: selectedSlot, psychologist: matchedPsych.name, ab });

      await persistSchedule(selectedDay, selectedSlot);

      track("initiate_checkout", { amount: precio.decimal, ab });
      setSaving(false);
      setPhase("payment");
    };

    // Loader full-screen mientras Amelia devuelve los slots reales.
    // Da una microespera intencional con foto + tagline + bullets para que
    // el calendario no aparezca en seco.
    if (slotsLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-[#FFFAF2] via-[#FAF4FC] to-[#F0E3F7] flex flex-col">
          <header className="bg-white/60 backdrop-blur-md border-b border-purple/10 px-4 py-4">
            <div className="max-w-2xl mx-auto flex items-center justify-center">
              <Image src="/images/logo.webp" alt="Mente Sana" width={120} height={24} priority className="h-6 w-auto" />
            </div>
          </header>
          <main className="flex-1 flex items-center justify-center px-4 py-8">
            <div className="max-w-md w-full text-center">
              {/* Foto de la psi con halo pulsante */}
              <div className="flex justify-center mb-6">
                <div className="relative w-28 h-28">
                  <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-purple/30 via-[#D4AF37]/30 to-purple/30 blur-2xl animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-2 border-purple/30 animate-[ping_2s_ease-out_infinite]" />
                  <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-2xl shadow-purple/40 bg-purple/5">
                    {psychPhoto ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={psychPhoto} alt={matchedPsych.name} className="w-full h-full object-cover" />
                    ) : matchedPsych.video ? (
                      <video src={matchedPsych.video} muted autoPlay loop playsInline preload="metadata" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">💜</div>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs font-bold text-purple uppercase tracking-wider mb-2">{matchedPsych.name}</p>
              <h1 className="font-serif text-2xl md:text-3xl leading-tight mb-2">
                Preparando tus <em className="text-purple italic font-normal">horas disponibles</em>
              </h1>
              <p className="text-sm text-foreground/60 mb-6">Mirando la agenda real de tu psicóloga esta semana…</p>
              <ul className="space-y-2.5 max-w-xs mx-auto text-left">
                {[
                  "Sincronizando su calendario clínico",
                  "Filtrando huecos libres compatibles contigo",
                  "Dejándote pre-elegido el más cercano",
                ].map((b, i) => (
                  <li
                    key={b}
                    className="flex items-start gap-2.5 bg-white/70 backdrop-blur rounded-xl border border-purple/10 px-3.5 py-2.5 shadow-sm"
                    style={{ animation: `fadeInUp 600ms ease-out ${i * 200}ms both` }}
                  >
                    <span className="w-4 h-4 mt-0.5 border-2 border-purple/20 border-t-purple rounded-full animate-spin flex-shrink-0" />
                    <span className="text-[13px] leading-snug text-foreground/80">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </main>
          <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#FFFAF2] flex flex-col">
        <header className="bg-white border-b border-purple/10 px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Image src="/images/logo.webp" alt="Mente Sana" width={120} height={24} priority className="h-6 w-auto" />
            <span className="text-[11px] text-foreground/40 font-medium">Elige tu sesión psicológica</span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="max-w-lg w-full">
            {/* PANTALLA ÚNICA: tu psicóloga (con valor) + tu agenda + pago, todo junto. */}
            <div className="bg-white rounded-2xl border border-purple/10 p-3 mb-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-[76px] h-[76px] rounded-xl overflow-hidden bg-purple/5 shrink-0 relative">
                  {/* QW4 (variante B): video como default con foto de fallback.
                      Control (A) mantiene foto primero + video como fallback. */}
                  {ab === "B" && matchedPsych.video ? (
                    <video src={matchedPsych.video} muted autoPlay loop playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                  ) : psychPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={psychPhoto} alt={matchedPsych.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : matchedPsych.video ? (
                    <video src={matchedPsych.video} muted autoPlay loop playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">💜</div>
                  )}
                  <span className="absolute top-1 left-1 bg-purple text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow">TU MATCH</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[17px] font-semibold leading-tight truncate">{matchedPsych.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="bg-green-50 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">✓ Colegiada</span>
                    <span className="text-[10px] text-foreground/45">Sesiones online</span>
                  </div>
                  <p className="text-[12px] text-purple/90 font-medium mt-1.5 leading-snug">
                    ✦ Elegida para tu perfil de <strong>{temaLabel}</strong> — llegará a la sesión con tu test ya leído.
                  </p>
                  {/* QW3 (variante B): mini-bio de la psi debajo del match badge */}
                  {ab === "B" && (
                    <p className="text-[11px] text-foreground/60 mt-1.5 leading-snug">
                      Colegiada · <strong>especializada en {temaLabel}</strong> · suele empezar preguntándote por lo que pasó esta semana.
                    </p>
                  )}
                </div>
              </div>

              {/* QW2 (variante B): precio arriba, antes del calendario — evita price surprise al final. */}
              {ab === "B" && (
                <div className="mt-3 flex items-center justify-center gap-2 rounded-full bg-purple/5 border border-purple/15 px-3 py-1.5">
                  <span className="text-[13px] font-bold text-purple">{precio.texto}</span>
                  <span className="text-[10px] text-foreground/60">· pago único · sin suscripción · devolución si no encaja</span>
                </div>
              )}

              {/* QW3 (variante B): micro-testimonial genérico (por si no tenemos por psi específica). */}
              {ab === "B" && (
                <div className="mt-3 rounded-xl bg-[#FBF7EE] border-l-2 border-[#D4AF37] px-3 py-2">
                  <p className="text-[12px] italic text-foreground/70 leading-snug">
                    &ldquo;Con mi psicóloga conecté desde la primera sesión. Me ayudó a entender por qué me pasaba lo que me pasaba.&rdquo;
                  </p>
                  <p className="text-[10px] text-foreground/45 mt-1">— Marina, 34 · 4 meses después</p>
                </div>
              )}
            </div>

            <div className="text-center mb-4">
              <h1 className="font-serif text-xl md:text-2xl leading-tight">Reserva tu sesión psicológica con {matchedPsych.name.split(" ")[0]}</h1>
              <p className="mt-1 text-xs text-foreground/45">50 minutos con tu psicóloga colegiada · te dejamos pre-elegido el hueco más cercano 👇</p>
            </div>

            {/* Loader / empty */}
            {slotsLoading && (
              <div className="text-center text-sm text-foreground/50 py-8">Cargando disponibilidad real de {matchedPsych.name}…</div>
            )}
            {!slotsLoading && slotsError && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700 mb-4">
                {slotsError === "psychologist_not_found"
                  ? `No hemos podido localizar la agenda de ${matchedPsych.name} ahora mismo. Escríbenos por WhatsApp y te confirmamos la cita manualmente.`
                  : `Error cargando disponibilidad. Vuelve a intentarlo en unos segundos.`}
              </div>
            )}
            {!slotsLoading && !slotsError && days.length === 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800 mb-4">
                {matchedPsych.name} no tiene huecos esta semana. Estamos buscando alternativas — escríbenos por WhatsApp y te asignamos una colega con tu mismo perfil.
              </div>
            )}

            {/* Calendario visual del mes — días disponibles en morado clickeable, no disponibles en gris */}
            {!slotsLoading && days.length > 0 && (
              <div className="bg-white rounded-2xl border border-purple/10 p-4 mb-6 shadow-sm">
                <p className="text-center font-serif text-base font-semibold text-foreground capitalize mb-3">
                  {monthLabel}
                </p>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
                    <p key={d} className="text-center text-[10px] font-bold text-foreground/40 uppercase tracking-wider py-1">
                      {d}
                    </p>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarCells.map((cell) => {
                    const isSelected = selectedDay === cell.key;
                    const clickable = cell.available && !cell.isPast;
                    return (
                      <button
                        key={cell.key}
                        onClick={() => { if (clickable) { setSelectedDay(cell.key); setSelectedSlot(""); } }}
                        disabled={!clickable}
                        aria-label={cell.date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
                        className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-semibold transition-all ${
                          isSelected
                            ? "bg-purple text-white shadow-md scale-105"
                            : clickable
                              ? "bg-purple/5 text-purple hover:bg-purple/10 hover:scale-105 cursor-pointer"
                              : cell.isToday
                                ? "text-foreground/40 ring-1 ring-purple/20"
                                : "text-foreground/20 cursor-not-allowed"
                        }`}
                      >
                        <span>{cell.date.getDate()}</span>
                        {clickable && !isSelected && (
                          <span className="absolute bottom-1 w-1 h-1 rounded-full bg-purple/60" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-center text-[10px] text-foreground/40">
                  <span className="inline-block w-2 h-2 rounded-full bg-purple/60 align-middle mr-1" />
                  Días con disponibilidad
                </p>
              </div>
            )}

            {/* Time slots reales del día seleccionado — siempre orden ascendente, hora ES */}
            {selectedDay && slotsForSelectedDay.length > 0 && (
              <>
                <p className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-3">
                  Hora disponible <span className="text-foreground/30 normal-case font-normal">· hora España</span>
                </p>
                <div className="grid grid-cols-5 gap-2 mb-6">
                  {slotsForSelectedDay.map((slot) => {
                    const isSelected = selectedSlot === slot.label;
                    const isPreferred = pref !== "flexible" && pref !== "finde" && slot.period === pref;
                    return (
                      <button
                        key={slot.label}
                        onClick={() => setSelectedSlot(slot.label)}
                        className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                          isSelected
                            ? "bg-purple text-white border-purple shadow-md"
                            : isPreferred
                              ? "bg-purple/5 border-purple/30 hover:border-purple text-purple"
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
                    <p className="text-sm font-semibold text-foreground">Tu sesión psicológica</p>
                    <p className="text-xs text-foreground/50 mt-0.5">
                      {new Date(selectedDay).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })} a las {selectedSlot}h
                    </p>
                    <p className="text-xs text-purple font-medium mt-0.5">Con {matchedPsych.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-2xl font-bold text-purple">{precio.texto}</p>
                    <p className="text-[10px] text-foreground/40">pago único</p>
                  </div>
                </div>
              </div>
            )}

            {/* CTA sticky abajo: en móvil queda siempre visible al hacer scroll. */}
            <div className="sticky bottom-0 z-10 -mx-4 px-4 pt-3 pb-4 bg-[#FFFAF2]/95 backdrop-blur supports-[backdrop-filter]:bg-[#FFFAF2]/80 border-t border-purple/10">
              <button
                onClick={handleConfirmSlot}
                disabled={!selectedDay || !selectedSlot || saving}
                className="w-full bg-purple hover:bg-[#4e0d68] text-white font-bold rounded-full py-4 text-base shadow-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving
                  ? "Procesando..."
                  : ab === "B"
                    ? `Reservar mi sesión con ${matchedPsych.name.split(" ")[0]} · ${precio.texto} →`
                    : `Confirmar y pagar ${precio.texto} →`}
              </button>
              {/* QW7 (variante B): social proof + garantía dividida en 2 líneas para el fold final. */}
              {ab === "B" ? (
                <>
                  <p className="mt-2 text-center text-[11px] text-foreground/40">🔒 Pago único · sin suscripción · devolución si no encaja</p>
                  <p className="mt-1 text-center text-[10.5px] text-foreground/50">+8.000 personas han empezado su proceso con nosotras · ★ 4,9</p>
                </>
              ) : (
                <p className="mt-2 text-center text-[11px] text-foreground/40">🔒 Pago único de {precio.texto} · Sin suscripción ni renovación automática</p>
              )}
              {/* QW6 (variante B): CTA secundario para reroll de psicóloga (recupera dropouts por mismatch de fit). */}
              {ab === "B" && (
                <button
                  onClick={() => {
                    track("reroll_match_requested", { current_psi: matchedPsych.name, ab });
                    // Fuerza reroll: borra el match cacheado y recarga (se elige uno nuevo del pool).
                    try {
                      const feeling = answers.feeling || "ansiedad";
                      localStorage.removeItem(`ms_match_amelia_v4_${feeling}`);
                    } catch {}
                    window.location.reload();
                  }}
                  className="mt-2 w-full text-center text-[12px] text-purple hover:text-[#4e0d68] underline underline-offset-2"
                >
                  ¿Prefieres otra psicóloga? →
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ═══ PAYMENT PHASE — Stripe Embedded Checkout ═══
  if (phase === "payment") {
    return <PaymentPhase
      precio={precio}
      email=""
      name=""
      phone=""
      psychologistName={matchedPsych.name}
      selectedDay={selectedDay}
      selectedSlot={selectedSlot}
      checkoutRef={checkoutRef}
      ab={ab}
    />;
  }

  // ═══ INTRO PHASE — paso a paso creativo ═══
  if (phase === "intro") {
    // QW1 (variante B): rediseño del hero con promesa arriba, 3 caras de psicólogas
    // reales sobre el fold, CTA con precio {precio.texto} visible, y timeline colapsado por
    // defecto en un <details> "¿Cómo funciona?".
    // Los 3 del hero usan las tomas del home (CDN Supabase, versión curada) — son
    // los mismos videos que se ven en Psychologists.tsx en la home.
    const HOME_CDN = "https://your-project.supabase.co/storage/v1/object/public/mentesana-videos/welcome";
    const heroPsis = [
      { ...PSYCHOLOGISTS[0], video: `${HOME_CDN}/adriana-salas.mp4` },   // Adriana Salas — ansiedad
      // Giovanna Vago y Leidy Vicuña no están en el pool PSYCHOLOGISTS (solo en el home Psychologists.tsx)
      { name: "Giovanna Vago", city: "Madrid", exp: "9 años", specialty: "Psicóloga clínica", video: `${HOME_CDN}/giovanna-vago.mp4`, profiles: ["crecimiento", "otro"] },
      { name: "Leidy Vicuña", city: "Barcelona", exp: "8 años", specialty: "Ansiedad, mindfulness", video: `${HOME_CDN}/leidy-vicuna.mp4`, profiles: ["ansiedad", "crecimiento"] },
    ];

    return (
      <div className="min-h-screen bg-[#FFFAF2] flex flex-col">
        <header className="bg-white border-b border-purple/10 px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-center">
            <Image src="/images/logo.webp" alt="Mente Sana" width={120} height={24} priority className="h-6 w-auto" />
          </div>
        </header>

        <main className="flex-1 px-4 py-8 md:py-10">
          <div className="max-w-lg w-full mx-auto">
            {ab === "B" ? (
              <>
                {/* HERO B v2 — beneficio arriba (no proceso), 3 caras reales, CTA con precio+garantía */}
                <div className="text-center mb-5">
                  <span className="inline-block bg-purple/8 text-purple text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3">
                    ✦ Diagnóstico con psicóloga colegiada
                  </span>
                  <h1 className="font-serif text-[26px] md:text-[30px] leading-[1.08] mb-3">
                    Entiende qué te pasa y sal con un <em className="text-purple italic font-normal not-italic font-bold">plan real</em>
                  </h1>
                  <p className="text-[13.5px] text-foreground/75 leading-snug px-2">
                    Una sesión de 50 min con tu psicóloga colegiada. Hoy, por {precio.texto}.
                  </p>
                </div>

                {/* 3 rostros reales del pool */}
                <div className="flex justify-center items-center gap-2 mb-4">
                  {heroPsis.map((p) => (
                    <div key={p.name} className="flex-1 max-w-[100px] text-center">
                      <div className="w-full aspect-square rounded-2xl overflow-hidden bg-purple/5 border-2 border-white shadow-md relative">
                        <video src={p.video} muted autoPlay loop playsInline preload="metadata" className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 left-1 right-1 bg-white/90 backdrop-blur-sm text-[8px] font-bold text-purple py-0.5 rounded-full leading-none">Colegiada</span>
                      </div>
                      <p className="text-[10px] font-semibold text-foreground/80 mt-1.5 truncate px-1">{p.name.split(" ")[0]}</p>
                      <p className="text-[9px] text-foreground/50 truncate px-1">{p.specialty.split(",")[0]}</p>
                    </div>
                  ))}
                </div>
                <p className="text-center text-[10.5px] text-foreground/50 mb-4">
                  y otras +150 psicólogas colegiadas · elegimos la tuya según tu perfil
                </p>

                {/* CTA principal con precio visible + trust bar */}
                <div className="text-center">
                  <button
                    onClick={() => { setPhase("questions"); track("start_matching", { ab }); }}
                    className="w-full bg-purple hover:bg-[#4e0d68] text-white font-bold rounded-full py-4 text-base shadow-lg shadow-purple/30 transition-colors"
                  >
                    Reservar mi diagnóstico · {precio.texto} →
                  </button>
                  <p className="mt-2.5 text-[11.5px] text-foreground/70">🔒 Pago único · Sin suscripción</p>
                  <p className="mt-1 text-[10.5px] text-foreground/55">★ 4,9 · +8.000 pacientes · +150 psicólogas colegiadas</p>
                </div>

                {/* Videos del equipo (mismo que el home) — solo en la landing de la app */}
                {isApp && <TeamVideosStrip />}

                {/* Prueba social — 3 testimonios cortos de pacientes reales del funnel */}
                <div className="mt-7 -mx-4 px-4">
                  <p className="text-center text-[10.5px] font-bold uppercase tracking-wider text-purple/70 mb-3">Lo que cuentan quienes ya lo hicieron</p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {[
                      { q: `Salí con un plan claro de qué hacer esta semana, no con más dudas. Por ${precio.texto}, vale mucho más.`, a: "Marina, 34", tag: "ansiedad" },
                      { q: "Pensé que era otra app impersonal. Mi psicóloga había leído mi test antes de la sesión. Se notó.", a: "Carla, 29", tag: "estado de ánimo" },
                      { q: "Nunca había hablado con una psicóloga. Fue más fácil de lo que pensaba, y no me sentí juzgada ni un segundo.", a: "Laura, 41", tag: "primera vez" },
                    ].map((t) => (
                      <div key={t.a} className="bg-white rounded-2xl border border-purple/10 p-3.5 shadow-sm">
                        <p className="text-[12.5px] text-foreground/85 leading-snug italic">&ldquo;{t.q}&rdquo;</p>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-[10.5px] font-semibold text-purple">— {t.a}</p>
                          <span className="text-[9px] text-foreground/50 bg-purple/5 px-2 py-0.5 rounded-full">{t.tag}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline colapsable — proceso DESPUÉS del beneficio */}
                <details className="mt-6 group">
                  <summary className="list-none cursor-pointer text-center py-2.5 text-[12.5px] text-purple font-semibold hover:underline">
                    ¿Cómo funciona? Ver los 6 pasos <span className="inline-block transition-transform group-open:rotate-90">→</span>
                  </summary>
                  <div className="mt-4 space-y-0 relative">
                    <div className="absolute left-[22px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-purple/30 via-purple/20 to-purple/10" />
                    {[
                      { n: "1", icon: "📝", title: "Respondes 5 preguntas", desc: "2 minutos. Sobre cómo te sientes y qué buscas.", active: true },
                      { n: "2", icon: "🎯", title: "Elegimos a tu profesional", desc: "La psicóloga colegiada más idónea para tu caso." },
                      { n: "3", icon: "📅", title: "Eliges día y hora", desc: "Ves su disponibilidad real y reservas." },
                      { n: "4", icon: "💳", title: `Reservas tu diagnóstico — ${precio.texto} únicos`, desc: "Pago único, sin suscripción." },
                      { n: "5", icon: "📧", title: "Recibes tu test clínico por email", desc: "PHQ-9, GAD-7, DSM-5. Para que tu psicóloga prepare tu sesión." },
                      { n: "6", icon: "💬", title: "Sesión de 50 min + tu diagnóstico", desc: "Tu psicóloga llega con tu informe leído. Plan de acción concreto." },
                    ].map((step) => (
                      <div key={step.n} className={`flex items-start gap-3 py-2 ${step.active ? "" : "opacity-95"}`}>
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0 ${step.active ? "bg-purple text-white shadow-lg shadow-purple/30" : "bg-white border-2 border-purple/30"}`}>
                          {step.icon}
                        </div>
                        <div className="pt-1">
                          <p className={`text-sm font-semibold ${step.active ? "text-purple" : "text-foreground"}`}>
                            <span className="text-foreground/60 mr-1.5">{step.n}.</span>{step.title}
                          </p>
                          <p className="text-[11px] text-foreground/80 mt-0.5 leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>

                {/* CTA secundario tras testimonios/timeline */}
                <div className="mt-6 text-center">
                  <button
                    onClick={() => { setPhase("questions"); track("start_matching", { ab, source: "cta_secondary" }); }}
                    className="text-purple font-semibold text-[13px] underline underline-offset-4 hover:text-[#4e0d68]"
                  >
                    Empezar las 5 preguntas ahora →
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* HERO A — control (diseño actual, sin cambios) */}
                <div className="text-center mb-6">
                  <p className="font-handwriting text-lg text-purple mb-1">{COPY.intro.kicker}</p>
                  <h1 className="font-serif text-xl md:text-2xl leading-tight">
                    {COPY.intro.titleLine1}<br />
                    <em className="text-purple italic font-normal">{COPY.intro.titleLine2}</em>
                  </h1>
                </div>

                <div className="space-y-0 relative">
                  <div className="absolute left-[22px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-purple/30 via-purple/20 to-purple/10" />

                  {[
                    { n: "1", icon: "📝", title: "Respondes 5 preguntas", desc: "2 minutos. Sobre cómo te sientes y qué buscas. Es lo que harás ahora.", active: true },
                    { n: "2", icon: "🎯", title: "Elegimos a tu profesional", desc: "La psicóloga más idónea para estudiar tu caso y elaborar tu diagnóstico." },
                    { n: "3", icon: "📅", title: "Eliges día y hora", desc: "Ves la disponibilidad de tu psicóloga y reservas tu cita." },
                    { n: "4", icon: "💳", title: COPY.intro.step4Title, desc: COPY.intro.step4Desc },
                    { n: "5", icon: "📧", title: "Recibes tu test en el correo", desc: "30 preguntas clínicas (PHQ-9, GAD-7, DSM-5) para que tu psicóloga prepare tu sesión y tu informe personalizado. Unos 10-15 minutos, tranquila." },
                    { n: "6", icon: "💬", title: "Asistes a tu cita y recibes tu diagnóstico", desc: "50 min de videollamada. Tu psicóloga llega con tu informe leído, te explica cada hallazgo y construís un plan juntos." },
                  ].map((step) => (
                    <div key={step.n} className={`flex items-start gap-3 py-2 ${step.active ? "" : "opacity-95"}`}>
                      <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0 ${step.active ? "bg-purple text-white shadow-lg shadow-purple/30" : "bg-white border-2 border-purple/30"}`}>
                        {step.icon}
                      </div>
                      <div className="pt-1">
                        <p className={`text-sm font-semibold ${step.active ? "text-purple" : "text-foreground"}`}>
                          <span className="text-foreground/60 mr-1.5">{step.n}.</span>{step.title}
                        </p>
                        <p className="text-[11px] text-foreground/80 mt-0.5 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => { setPhase("questions"); track("start_matching", { ab }); }}
                    className="w-full bg-purple hover:bg-[#4e0d68] text-white font-bold rounded-full py-3.5 text-base shadow-lg transition-colors"
                  >
                    Empezar las 5 preguntas →
                  </button>
                  <p className="mt-2 text-[11px] text-foreground/70">🔒 Tus respuestas son confidenciales · 2 minutos</p>
                </div>

                {/* Videos del equipo (mismo que el home) — solo en la landing de la app */}
                {isApp && <TeamVideosStrip />}
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ═══ CONTEXT PHASE — pregunta abierta ═══
  // ═══ CONTACT PHASE — email (gate pre-match) ═══
  if (phase === "contact") {
    return (
      <div className="min-h-screen bg-[#FFFAF2] flex flex-col">
        <header className="bg-white border-b border-purple/10 px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Image src="/images/logo.webp" alt="Mente Sana" width={120} height={24} priority className="h-6 w-auto" />
            <span className="text-[11px] text-foreground/40 font-medium">Último paso</span>
          </div>
        </header>
        <div className="bg-purple/10 h-1.5"><div className="h-full bg-purple rounded-r-full" style={{ width: "75%" }} /></div>

        <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-10">
          <div className="max-w-lg w-full">
            <div className="text-center mb-6">
              <p className="text-xs font-bold text-purple uppercase tracking-wider mb-2">{COPY.contact.kicker}</p>
              <h1 className="font-serif text-2xl md:text-3xl leading-tight">{COPY.contact.title}</h1>
              <p className="mt-2 text-sm text-foreground/50">{COPY.contact.subtitle}</p>
            </div>

            <input
              type="email"
              inputMode="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && userEmail) void saveAndProceed(); }}
              placeholder={COPY.contact.placeholder}
              autoComplete="email"
              autoFocus
              required
              className="w-full bg-white rounded-xl border border-purple/15 px-4 py-4 text-base text-center focus:outline-none focus:ring-2 focus:ring-purple/30 focus:border-purple/30"
            />

            <button
              onClick={saveAndProceed}
              disabled={!userEmail || saving}
              className="w-full mt-6 bg-purple hover:bg-[#4e0d68] text-white font-bold rounded-full py-4 text-base shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Guardando..." : "Conocer a mi psicóloga y agendar mi cita →"}
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
          <Image src="/images/logo.webp" alt="Mente Sana" width={120} height={24} priority className="h-6 w-auto" />
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
          {/* Burbuja de calentamiento contextual — recuerda que el test elige a la
              psicóloga que llevará la cita y va calentando hacia la 1ª sesión. */}
          {(() => {
            const bubbles = [
              { icon: "📋", text: <>Estas 5 preguntas son <strong>solo para hacer match con tu psicóloga</strong>. El diagnóstico clínico (30 preguntas) llega después de agendar tu sesión.</> },
              { icon: "🌱", text: <>Este test va a elegir a <strong>la psicóloga que te atenderá</strong> en tu sesión.</> },
              { icon: "💜", text: <>Lo que respondas le ayuda a <strong>tu psicóloga a llegar preparada</strong>.</> },
              { icon: "✨", text: <>Hay <strong>+150 psicólogas colegiadas</strong> esperando — buscamos la tuya.</> },
              { icon: "🎯", text: <>Última pregunta — en segundos verás <strong>quién será tu psicóloga</strong>.</> },
            ];
            const b = bubbles[Math.min(currentQ, bubbles.length - 1)];
            // Entrada directa (A/B "directo"): en la pregunta 1 sustituimos la burbuja por
            // qué es, cuánto cuesta y quién lo avala — lo que la portada contaba y aquí se
            // ha saltado. Evita la sorpresa del precio al llegar al pago.
            if (directEntry && currentQ === 0) {
              return (
                <div className="mb-6 rounded-2xl border border-purple/15 bg-white px-4 py-3 text-center shadow-[0_4px_20px_rgba(106,23,140,.05)]">
                  <p className="text-[13px] font-semibold text-foreground/85">
                    Diagnóstico psicológico online · <span className="text-purple">{precio.texto}</span>, pago único
                  </p>
                  <p className="mt-1 text-[11.5px] leading-snug text-foreground/55">
                    Informe clínico + sesión de 50 min con tu psicóloga colegiada · ★ 4,9 · +8.000 personas
                  </p>
                </div>
              );
            }
            return (
              <div className="mb-6 flex justify-center">
                <div className="inline-flex items-center gap-2 bg-purple/8 border border-purple/15 rounded-full px-4 py-2 text-[12px] text-purple/90 max-w-full">
                  <span className="text-base flex-shrink-0">{b.icon}</span>
                  <span className="leading-snug">{b.text}</span>
                </div>
              </div>
            );
          })()}

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
function PaymentPhase({ email, name, phone, psychologistName, selectedDay, selectedSlot, checkoutRef, ab, precio }: {
  email: string; name: string; phone: string; psychologistName: string;
  selectedDay: string; selectedSlot: string; checkoutRef: React.RefObject<HTMLDivElement | null>;
  ab: "A" | "B";
  precio: PrecioDiagnostico;
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
        // Fuente canónica de UTMs: lib/utm.ts (mantiene first-touch en
        // localStorage["ms_utm_first"] y last-touch en sessionStorage["ms_utm"]).
        // Antes este componente leía claves legacy "ms_first_${k}" que solo
        // /eva y /vuelve poblaban — el resto del funnel iba siempre vacío
        // y el webhook tagueaba todo como "direct-seo / organic".
        const { getUtms } = await import("@/lib/utm");
        const stored = getUtms();
        const p = new URLSearchParams(window.location.search);
        const utms: Record<string, string> = { ...stored } as Record<string, string>;
        // Last-touch override desde la URL actual (por si el usuario llega aquí con UTMs nuevos)
        ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(k => {
          const v = p.get(k);
          if (v) utms[k] = v;
        });
        utms.referrer = utms.referrer || document.referrer || "";
        utms.landing_page = utms.landing_page || "/test-diagnostico";

        const res = await fetch("/api/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name,
            phone,
            psychologistName,
            source: "test-diagnostico",
            utms: { ...utms, scheduled_date: selectedDay, scheduled_time: selectedSlot },
            ab_diagnostico: ab, // QW5: A=card-only · B=Apple/Google Pay + wallets
            // Token de variante de precio, NO el importe: el servidor lo
            // resuelve contra su tabla. Ver src/lib/diagnostico-precio.ts.
            variante_precio: precio.variante,
            // Para poder unir la compra con el resto del embudo en analytics.
            ms_visitor_id: getAnalyticsVisitorId(),
            ms_session_id: getSessionId(),
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
        // RESTAURADO: createEmbeddedCheckoutPage es la función que esta versión de Stripe.js
        // tiene disponible (combina con ui_mode='embedded_page'). Yo cambié esto por error
        // a initEmbeddedCheckout pensando que era la API correcta — fue mi confusión entre
        // dos sistemas embebidos distintos de Stripe.
        const { loadStripe } = await import("@stripe/stripe-js");
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);
        if (!stripe || !mounted.current) return;

        const checkout = await (stripe as any).createEmbeddedCheckoutPage({ clientSecret: data.clientSecret });
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
          <Image src="/images/logo.webp" alt="Mente Sana" width={120} height={24} priority className="h-6 w-auto" />
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
                <p className="font-serif text-2xl font-bold text-purple">{precio.texto}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-black/5 grid grid-cols-3 gap-2 text-center">
              <div><p className="text-[10px] text-foreground/40">📄 Informe</p></div>
              <div><p className="text-[10px] text-foreground/40">🎯 Matching</p></div>
              <div><p className="text-[10px] text-foreground/40">💬 50 min</p></div>
            </div>
          </div>

          {/* Qué recibes justo después del pago */}
          <div className="mb-6">
            <NextStepsCard />
          </div>

          {/* Reasegurador anti-objeción #1 del RAG */}
          <div className="mb-6">
            <NoSurprisesBox precio={precio} />
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
          <div ref={checkoutRef} className={`w-full min-h-[500px] ${loading ? "hidden" : ""}`} />

          <div className="mt-6 text-center space-y-2">
            <p className="text-[11px] text-foreground/40">🔒 Pago único cifrado · Stripe · Sin tarjeta archivada para futuros cobros</p>
            <p className="text-[10px] text-foreground/30">En tu extracto aparece como &ldquo;MS Servicios&rdquo;</p>
          </div>
        </div>
      </main>
    </div>
  );
}

// ═══ ANALYZING PHASE — pantalla de carga antes del match ═══
function AnalyzingPhase({
  onComplete,
  matchedPsychName,
  matchedPsychPhoto,
  feelingLabel,
}: {
  onComplete: () => void;
  matchedPsychName: string;
  matchedPsychPhoto: string | null;
  feelingLabel: string;
}) {
  const firstName = matchedPsychName.split(" ")[0];

  // 5 frames narrativos. Total ≈ 14 s. La gente lee, anticipa el match, ve la
  // foto con un reveal, entiende por qué encaja y le da contexto al calendario.
  const FRAMES = [
    {
      ms: 2800,
      title: "Analizando tus 5 respuestas",
      sub: "Las cruzamos con criterios clínicos, no con un test cualquiera.",
      bullets: [
        "Perfil emocional · qué te trae aquí",
        "Tono que necesitas · cómo prefieres trabajar",
        "Especialidad clínica que mejor encaja",
      ],
    },
    {
      ms: 2800,
      title: `Buscando tu match en +150 psicólogas`,
      sub: "Todas colegiadas, con experiencia validada en clínica privada.",
      bullets: [
        "Especialidad en " + feelingLabel,
        "Disponibilidad esta semana",
        "Estilo terapéutico compatible con tu perfil",
      ],
    },
    {
      ms: 3800,
      title: `Encontramos a tu psicóloga`,
      reveal: true,
    },
    {
      ms: 2700,
      title: `Por qué ${firstName} encaja contigo`,
      bullets: [
        `Experiencia trabajando ${feelingLabel}`,
        "Tono cercano y directo en sesión",
        "Lee tu test antes de la cita — no empiezas de cero",
      ],
    },
    {
      ms: 1900,
      title: "Preparando tu calendario",
      sub: "Cruzando los huecos reales que tiene esta semana…",
    },
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (current >= FRAMES.length) {
      const t = setTimeout(onComplete, 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCurrent((c) => c + 1), FRAMES[current].ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, onComplete]);

  const frame = FRAMES[Math.min(current, FRAMES.length - 1)];
  const progress = Math.min(100, Math.round(((current + 1) / FRAMES.length) * 100));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFAF2] via-[#FAF4FC] to-[#F0E3F7] flex flex-col">
      <header className="bg-white/60 backdrop-blur-md border-b border-purple/10 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-center">
          <Image src="/images/logo.webp" alt="Mente Sana" width={120} height={24} priority className="h-6 w-auto" />
        </div>
      </header>

      {/* Progress sutil */}
      <div className="h-1 bg-purple/10">
        <div
          className="h-full bg-gradient-to-r from-purple to-[#8B2FB5] transition-all ease-out"
          style={{ width: `${progress}%`, transitionDuration: "800ms" }}
        />
      </div>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full" key={current}>
          {/* Orbe o foto reveal */}
          <div className="flex justify-center mb-8 animate-[fadeInUp_500ms_ease-out]">
            {frame.reveal ? (
              <div className="relative w-36 h-36">
                {/* Halo animado */}
                <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-purple/30 via-[#D4AF37]/30 to-purple/30 blur-2xl animate-pulse" />
                <div className="absolute inset-0 rounded-full border-2 border-purple/30 animate-[ping_2s_ease-out_infinite]" />
                <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-white shadow-2xl shadow-purple/40 bg-purple/5">
                  {matchedPsychPhoto ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={matchedPsychPhoto} alt={matchedPsychName} className="w-full h-full object-cover animate-[fadeIn_700ms_ease-out]" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">💜</div>
                  )}
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-purple text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg">
                  Tu match
                </div>
              </div>
            ) : (
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-purple/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-purple/30 animate-pulse" />
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-purple to-[#8B2FB5] shadow-2xl shadow-purple/40 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white animate-spin" viewBox="0 0 24 24" fill="none" style={{ animationDuration: "2s" }}>
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="35 20" strokeLinecap="round" opacity="0.9" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Título dinámico */}
          <h1 className="font-serif text-2xl md:text-3xl text-center leading-tight mb-2 animate-[fadeInUp_600ms_ease-out]">
            {frame.reveal ? (
              <>Tu psicóloga es <em className="text-purple italic font-normal not-italic font-semibold">{matchedPsychName}</em></>
            ) : (
              frame.title
            )}
          </h1>
          {frame.sub && (
            <p className="text-center text-sm text-foreground/60 mb-6 animate-[fadeInUp_700ms_ease-out]">{frame.sub}</p>
          )}
          {frame.reveal && (
            <p className="text-center text-sm text-foreground/60 mb-6 animate-[fadeInUp_700ms_ease-out]">
              Colegiada · sesiones online · perfil clínico compatible con el tuyo
            </p>
          )}

          {/* Bullets */}
          {frame.bullets && (
            <ul className="space-y-2.5 max-w-xs mx-auto animate-[fadeInUp_800ms_ease-out]">
              {frame.bullets.map((b, i) => (
                <li
                  key={b}
                  className="flex items-start gap-2.5 bg-white/70 backdrop-blur rounded-xl border border-purple/10 px-3.5 py-2.5 shadow-sm"
                  style={{ animation: `fadeInUp 600ms ease-out ${i * 120}ms both` }}
                >
                  <span className="text-purple text-base leading-snug flex-shrink-0">✓</span>
                  <span className="text-[13px] leading-snug text-foreground/80">{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ═══ NEXT STEPS CARD — "justo después del pago recibes…" ═══
function NextStepsCard() {
  const items = [
    {
      icon: "📧",
      title: "Tu test clínico en el correo",
      desc: "30 preguntas (PHQ-9, GAD-7, DSM-5) — 10-15 min. Tu psicóloga las lee antes de la sesión.",
    },
    {
      icon: "📅",
      title: "Confirmación de tu cita",
      desc: "Recordatorios por email y WhatsApp. Enlace a la videollamada.",
    },
    {
      icon: "🩺",
      title: "Tu diagnóstico en la sesión",
      desc: "50 min con tu psicóloga. Te explica cada hallazgo y construís el plan juntas.",
    },
  ];
  return (
    <div className="bg-white rounded-2xl border border-purple/10 p-5 mb-4 shadow-sm">
      <p className="text-xs font-bold text-purple uppercase tracking-wider mb-4">
        Justo después del pago recibes
      </p>
      <div className="relative">
        {/* Línea vertical que conecta los pasos */}
        <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-gradient-to-b from-purple via-purple/40 to-purple/15" />

        <div className="space-y-4">
          {items.map((it, i) => (
            <div key={i} className="flex items-start gap-3 relative">
              <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple to-[#8B2FB5] text-white flex items-center justify-center shadow-md shadow-purple/25 relative z-10">
                <span className="text-[15px]">{it.icon}</span>
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border-2 border-purple text-purple text-[9px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <div className="flex-1 pt-1">
                <p className="text-sm font-semibold text-foreground leading-tight">{it.title}</p>
                <p className="text-[12px] text-foreground/60 leading-relaxed mt-0.5">{it.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Reasegurador anti-objeción #1 del cerebro Voyage: 96 menciones de confusión con
// renovación automática / suscripción. Se muestra ANTES del botón de pago y encima
// del checkout Stripe para neutralizar la objeción en el momento exacto de la fricción.
function NoSurprisesBox({ precio }: { precio: PrecioDiagnostico }) {
  const items = [
    `Es un pago único de ${precio.texto}. No te cobramos nada más automáticamente.`,
    "No archivamos tu tarjeta para futuros cargos.",
    "Si después quieres seguir, tú eliges cuándo y qué bono (desde 28,75€/sesión). Pagas al usarlo.",
  ];
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-200/60 p-5 mb-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-700 text-sm">🛡️</span>
        <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Sin letra pequeña</p>
      </div>
      <ul className="space-y-2.5">
        {items.map((t, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] flex items-center justify-center mt-0.5">✓</span>
            <span className="text-[13px] text-foreground/80 leading-relaxed">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
