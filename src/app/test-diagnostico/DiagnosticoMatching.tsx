"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Fragment } from "react";
import Image from "next/image";
import { track, getVisitorId as getAnalyticsVisitorId, getSessionId } from "@/lib/tracking";
import { getVariant, getVisitorId, getForcedVariant } from "@/lib/ab-test";
import { PRECIO_ESTANDAR, type PrecioDiagnostico } from "@/lib/diagnostico-precio";
import { PRODUCTOS, conPrecio, type Producto999, type ProductoSlug, type ProductoUI } from "@/lib/productos-999";
import { LOGOPEDAS } from "@/app/test-logopedia/logopedas";
import PagoUnaPantalla from "./PagoUnaPantalla";

// ═══ Questions config ═══
// Las preguntas, el copy y el pool viven en src/lib/productos-999.ts (PRODUCTOS):
// este componente es el embudo de 9,99 € de TODOS los productos (diagnóstico
// psicológico y logopedia) y solo cambia lo que el producto le dice. El copy del
// diagnóstico es el de siempre, carácter por carácter.
//
// "**texto**" en el copy del producto → <strong>texto</strong>.
export function Strong({ text }: { text: string }) {
  const parts = text.split("**");
  return <>{parts.map((p, i) => (i % 2 ? <strong key={i}>{p}</strong> : <Fragment key={i}>{p}</Fragment>))}</>;
}

// ═══ Psychologists pool — catálogo fijo en ./psychologists (fallback del match) ═══
// El array y su tipo viven en un módulo sin "use client" para que los route handlers
// (/api/test-diagnostico/pool) puedan importarlos como datos y no como client reference.
import { PSYCHOLOGISTS, type PsychologistEntry } from "./psychologists";
export { PSYCHOLOGISTS, type PsychologistEntry };
type Question = ReturnType<Producto999["preguntas"]>[number];

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

export default function DiagnosticoMatching({ variant = "web", precio = PRECIO_ESTANDAR, producto: productoSlug = "diagnostico", segmento }: { variant?: "web" | "app"; precio?: PrecioDiagnostico; producto?: ProductoSlug; segmento?: string } = {}) {
  const isApp = variant === "app";
  // Producto del embudo ("diagnostico" por defecto → nada cambia para /test-diagnostico).
  // Llega como slug porque la página es un server component y el objeto lleva funciones.
  const producto: Producto999 = PRODUCTOS[productoSlug] ?? PRODUCTOS.diagnostico;
  const ui = producto.ui;
  const esLogopedia = producto.slug === "logopedia";
  const P = (s: string) => conPrecio(s, precio.texto);
  const CATALOGO = esLogopedia ? LOGOPEDAS : PSYCHOLOGISTS;
  const LS = {
    answers: `${producto.storagePrefix}_answers`,
    email: `${producto.storagePrefix}_email`,
    name: `${producto.storagePrefix}_name`,
    context: `${producto.storagePrefix}_context`,
    schedule: `${producto.storagePrefix}_schedule`,
  };

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
      kicker: isApp ? ui.intro.kickerApp : ui.intro.kicker,
      titleLine1: isApp ? ui.intro.titleLine1App : ui.intro.titleLine1,
      titleLine2: isApp ? ui.intro.titleLine2App : ui.intro.titleLine2,
      step4Title: isApp ? P(ui.intro.pasosAApp4.title) : P(ui.intro.pasosA[3].title),
      step4Desc: isApp ? ui.intro.pasosAApp4.desc : ui.intro.pasosA[3].desc,
    },
    contact: {
      kicker: isApp ? ui.contacto.kickerApp : ui.contacto.kicker,
      title: isApp ? ui.contacto.titleApp : ui.contacto.title,
      subtitle: isApp ? ui.contacto.subtitleApp : ui.contacto.subtitle,
      placeholder: isApp ? ui.contacto.placeholderApp : ui.contacto.placeholder,
    },
  };
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [contextText] = useState(""); // antes lo capturaba la fase 'context' (eliminada); ahora siempre vacío
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  // Logopedia: cuando el test habla de un MENOR, el gate del email exige el
  // consentimiento del padre/madre/tutor (datos de salud de un menor, RGPD art. 9).
  const [consentTutor, setConsentTutor] = useState(false);
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
  // El pool de Amelia (/api/diagnostico/match-pool) ya respondió (bien o mal). Hasta
  // entonces matchedPsych puede ser el pick PROVISIONAL de la lista fija y no se puede
  // pedir su agenda: en las sesiones que se restauran directamente en la fase de hora
  // (vuelven desde un email/WA o tras «otra psicóloga») la agenda se pedía para la
  // provisional y medio segundo después la tarjeta cambiaba a la psicóloga de Amelia →
  // el paciente elegía hora en el calendario de OTRA psicóloga (ago→oct 2026: ~70
  // pagos/mes con hueco de otra agenda; el webhook los movía de hora o de psicóloga).
  const [poolSettled, setPoolSettled] = useState(false);
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
    () => (dynamicPool && dynamicPool.length > 0 ? dynamicPool : CATALOGO),
    [dynamicPool, CATALOGO],
  );
  const checkoutRef = useRef<HTMLDivElement>(null);
  // Preguntas del producto (en logopedia el texto de la 2ª depende de la 1ª).
  const QUESTIONS: Question[] = producto.preguntas(answers);
  // Perfil = respuesta de la pregunta que define el match (feeling / motivo).
  const perfil = answers[producto.perfilKey] || "";
  const requiereConsentTutor = !!producto.esMenor?.(answers);

  // Carga el pool COMPLETO de psicólogas desde Amelia (una vez por sesión)
  useEffect(() => {
    fetch(`/api/diagnostico/match-pool${esLogopedia ? "?producto=logopedia" : ""}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.pool) && d.pool.length > 0) setAmeliaPool(d.pool); })
      .catch(() => { /* silencio: fallback al hardcoded */ })
      .finally(() => setPoolSettled(true));
  }, []);

  // Carga el pool del /test-diagnostico filtrado por visibles en Amelia
  // (endpoint dinámico). Si falla o llega vacío, dejamos dynamicPool=null y
  // el `effectivePool` sigue siendo el array hardcoded (fallback seguro).
  useEffect(() => {
    let cancelled = false;
    fetch(producto.poolFallbackPath)
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
        track("start_matching", { source: "landing_directo", ...(segmento ? { segmento } : {}) });
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

  // Carga slots reales cuando entramos a la fase "schedule". Espera a que el pool de
  // Amelia haya respondido (poolSettled) para pedir la agenda de la psicóloga
  // DEFINITIVA (matchedPsych se declara más abajo: no puede ir en las deps).
  useEffect(() => {
    if (phase !== "schedule" || !poolSettled) return;
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
  }, [phase, poolSettled]);

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
    const savedEmail = localStorage.getItem("ms_user_email") || localStorage.getItem(LS.email);
    if (savedEmail) setUserEmail(savedEmail);
    const savedName = localStorage.getItem("ms_user_name") || localStorage.getItem(LS.name);
    if (savedName) setUserName(savedName);
    const savedPhone = localStorage.getItem("ms_user_phone");
    if (savedPhone) setUserPhone(savedPhone);

    const saved = localStorage.getItem(LS.answers);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAnswers(parsed);
        if (parsed.consentimiento_tutor === "si") setConsentTutor(true);
        const answered = QUESTIONS.filter((q) => parsed[q.id]).length;
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
    localStorage.setItem(LS.answers, JSON.stringify(newAnswers));

    track(`complete_q${currentQ + 1}` as string, { question: questionId, answer: optionId });

    if (currentQ < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(currentQ + 1), 300);
    } else {
      // After all 5 questions → email gate (antes pasaba por analyzing primero).
      // Pedimos el email mientras la persona aún siente el cierre del test, sin
      // gastar el suspense; las animaciones del match vienen DESPUÉS del email
      // como recompensa por dejarlo.
      setTimeout(() => {
        track("view_email_gate", { profile: newAnswers[producto.perfilKey] || "", ab });
        setPhase("contact");
      }, 400);
    }
  }, [answers, currentQ, QUESTIONS, producto.perfilKey, ab, LS.answers]);

  // Save to API (always, whether they pay or not).
  // Teléfono OPCIONAL en el gate pre-match (antes era obligatorio): pedirlo aquí
  // frenaba el embudo y, con WhatsApp caído, el email es el canal de recuperación.
  // Se sigue capturando el número si el usuario lo escribe.
  const saveAndProceed = async () => {
    // El email es obligatorio (es nuestro canal de recuperación de carrito). El
    // teléfono es OPCIONAL en este gate pre-match: pedirlo aquí frenaba el embudo
    // y, con WhatsApp caído, el email es lo que de verdad recupera. Se captura si lo dan.
    if (!userEmail) return;
    if (requiereConsentTutor && !consentTutor) return;
    setSaving(true);
    localStorage.setItem(LS.email, userEmail);
    localStorage.setItem(LS.name, userName);
    localStorage.setItem(LS.context, contextText);
    // El consentimiento del tutor viaja con las respuestas (JSON de diagnostico_tests),
    // nunca como evento de analítica ni a Stripe.
    const answersToSave = requiereConsentTutor && consentTutor ? { ...answers, consentimiento_tutor: "si" } : answers;
    try { localStorage.setItem(LS.answers, JSON.stringify(answersToSave)); } catch {}
    localStorage.setItem("ms_user_email", userEmail);
    if (userName) localStorage.setItem("ms_user_name", userName);
    if (userPhone) localStorage.setItem("ms_user_phone", userPhone);

    try {
      await fetch("/api/diagnostico-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: producto.source,
          answers: answersToSave,
          context: contextText,
          name: userName,
          email: userEmail,
          phone: userPhone,
          matchedPsychologist: matchedPsych.name,
        }),
      });
    } catch {}

    track("start_matching_analysis", { profile: perfil, email: userEmail, ab });
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
    const feeling = perfil || producto.perfilDefault;

    if (typeof window === "undefined") return effectivePool[0];

    // 1) Si tenemos pool real de Amelia → random puro sobre TODAS las que tienen vídeo
    //    (preferimos vídeo para mantener el card visual de la sección "TU MATCH").
    if (ameliaPool && ameliaPool.length > 0) {
      // v4: prioriza disponibilidad cercana (ver selección abajo).
      const storageKey = `${producto.matchStorageKey}_${feeling}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const found = ameliaPool.find(p => p.name === stored);
        if (found) {
          return {
            name: found.name,
            city: "España",
            exp: "Colegiada",
            specialty: ui.hora.especialidadCard,
            video: found.video_url ?? producto.videoFallback ?? "",
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
        specialty: ui.hora.especialidadCard,
        video: pick.video_url ?? producto.videoFallback ?? "",
        photo: pick.photo_url ?? null,
        description: pick.description ?? null,
      };
    }

    // 2) Fallback: pool dinámico (endpoint /api/test-diagnostico/pool) o
    //    array hardcoded si el fetch aún no llegó / falló. Antes esto era
    //    PSYCHOLOGISTS a pelo — ahora respeta status='visible' de Amelia.
    const candidates = effectivePool.filter((p) => p.profiles.includes(feeling));
    const pool = candidates.length > 0 ? candidates : effectivePool;
    const storageKey = `${producto.matchPickStorageKey}_${feeling}`;
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
      localStorage.setItem(LS.schedule, JSON.stringify({ day, slot, psychologist: matchedPsych.name }));
    } catch {}
    const emailForSave = userEmail || localStorage.getItem("ms_user_email") || localStorage.getItem(LS.email) || "";
    if (!emailForSave) return;
    try {
      await fetch("/api/diagnostico-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: producto.source,
          answers,
          context: contextText,
          name: userName || localStorage.getItem(LS.name) || "",
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
    const TEMA_PSI = producto.tema;
    return (
      <AnalyzingPhase
        ui={ui.analisis}
        onComplete={() => {
          track("view_match_result", { profile: perfil, email: userEmail, ab });
          setPhase("schedule");
        }}
        matchedPsychName={matchedPsych.name}
        matchedPsychPhoto={psychPhoto}
        feelingLabel={TEMA_PSI[perfil] || TEMA_PSI.otro}
      />
    );
  }

  // ═══ SCHEDULE PHASE — calendario con disponibilidad REAL Amelia ═══
  if (phase === "schedule") {
    // Hasta que el pool de Amelia responda no sabemos quién es la psicóloga definitiva
    // (sesiones restauradas en esta fase): un loader evita pintar tarjeta y agenda de la
    // provisional y que cambien delante del paciente. Tarda lo que tarde match-pool (~0,5 s).
    if (!poolSettled) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-6">
          <p className="text-sm text-foreground/50 animate-pulse">{ui.hora.cargandoPro}</p>
        </div>
      );
    }
    // matchedPsych puede ser el tipo Amelia (con photo) o el fallback hardcoded (sin photo).
    const psychPhoto: string | null = "photo" in matchedPsych ? (matchedPsych.photo ?? null) : null;
    // Tema del usuario (en su lenguaje) para personalizar el "encaja con tu perfil".
    const TEMA = producto.tema;
    const temaLabel = TEMA[perfil] || TEMA.otro;
    // Derivación honesta (logopedia: deglución / neuro pueden necesitar presencial).
    const avisoPresencial = producto.avisoPresencial && producto.avisoPresencial.perfiles.includes(perfil) ? producto.avisoPresencial.texto : null;

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
            try { localStorage.removeItem(`${producto.matchStorageKey}_${perfil || producto.perfilDefault}`); } catch {}
            window.location.reload();
          }}
          precio={precio}
          ab={ab}
          producto={producto}
          avisoPresencial={avisoPresencial}
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
    const pref = answers[producto.horarioKey] || "flexible";
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
                {ui.hora.loaderH1}<em className="text-purple italic font-normal">{ui.hora.loaderH1Em}</em>
              </h1>
              <p className="text-sm text-foreground/60 mb-6">{ui.hora.loaderSub}</p>
              <ul className="space-y-2.5 max-w-xs mx-auto text-left">
                {ui.hora.loaderBullets.map((b, i) => (
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
            <span className="text-[11px] text-foreground/40 font-medium">{ui.hora.header}</span>
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
                    <span className="bg-green-50 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{ui.hora.colegiada}</span>
                    <span className="text-[10px] text-foreground/45">{ui.hora.online}</span>
                  </div>
                  <p className="text-[12px] text-purple/90 font-medium mt-1.5 leading-snug">
                    <Strong text={ui.hora.elegida.replace("{tema}", temaLabel)} />
                  </p>
                  {/* QW3 (variante B): mini-bio de la psi debajo del match badge */}
                  {ab === "B" && (
                    <p className="text-[11px] text-foreground/60 mt-1.5 leading-snug">
                      <Strong text={ui.hora.bioB.replace("{tema}", temaLabel)} />
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
              {ab === "B" && ui.hora.testimonioB && (
                <div className="mt-3 rounded-xl bg-[#FBF7EE] border-l-2 border-[#D4AF37] px-3 py-2">
                  <p className="text-[12px] italic text-foreground/70 leading-snug">
                    &ldquo;{ui.hora.testimonioB.q}&rdquo;
                  </p>
                  <p className="text-[10px] text-foreground/45 mt-1">{ui.hora.testimonioB.a}</p>
                </div>
              )}
              {avisoPresencial && (
                <p className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-[11.5px] leading-snug text-amber-900">{avisoPresencial}</p>
              )}
            </div>

            <div className="text-center mb-4">
              <h1 className="font-serif text-xl md:text-2xl leading-tight">{ui.hora.h1.replace("{first}", matchedPsych.name.split(" ")[0])}</h1>
              <p className="mt-1 text-xs text-foreground/45">{ui.hora.sub}</p>
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
                    <p className="text-sm font-semibold text-foreground">{ui.hora.sesion}</p>
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
                      const feeling = perfil || producto.perfilDefault;
                      localStorage.removeItem(`${producto.matchStorageKey}_${feeling}`);
                    } catch {}
                    window.location.reload();
                  }}
                  className="mt-2 w-full text-center text-[12px] text-purple hover:text-[#4e0d68] underline underline-offset-2"
                >
                  {ui.hora.reroll}
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
      producto={producto}
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
    // Caras del hero (vídeos del home vía CDN para el diagnóstico; locales para logopedia).
    const heroPsis = ui.intro.caras;

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
                    {ui.intro.badgeB}
                  </span>
                  <h1 className="font-serif text-[26px] md:text-[30px] leading-[1.08] mb-3">
                    {ui.intro.h1B}<em className="text-purple italic font-normal not-italic font-bold">{ui.intro.h1BEm}</em>
                  </h1>
                  <p className="text-[13.5px] text-foreground/75 leading-snug px-2">
                    {P(ui.intro.subB)}
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
                  {ui.intro.carasNota}
                </p>

                {/* CTA principal con precio visible + trust bar */}
                <div className="text-center">
                  <button
                    onClick={() => { setPhase("questions"); track("start_matching", { ab }); }}
                    className="w-full bg-purple hover:bg-[#4e0d68] text-white font-bold rounded-full py-4 text-base shadow-lg shadow-purple/30 transition-colors"
                  >
                    {P(ui.intro.ctaB)}
                  </button>
                  <p className="mt-2.5 text-[11.5px] text-foreground/70">🔒 Pago único · Sin suscripción</p>
                  <p className="mt-1 text-[10.5px] text-foreground/55">{ui.intro.ctaBSocial}</p>
                </div>

                {/* Videos del equipo (mismo que el home) — solo en la landing de la app */}
                {isApp && <TeamVideosStrip />}

                {/* Prueba social — 3 testimonios cortos de pacientes reales del funnel (ninguno en logopedia: no inventamos) */}
                {ui.intro.testimonios.length > 0 && (
                <div className="mt-7 -mx-4 px-4">
                  <p className="text-center text-[10.5px] font-bold uppercase tracking-wider text-purple/70 mb-3">{ui.intro.testimoniosTitulo}</p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {ui.intro.testimonios.map((t) => (
                      <div key={t.a} className="bg-white rounded-2xl border border-purple/10 p-3.5 shadow-sm">
                        <p className="text-[12.5px] text-foreground/85 leading-snug italic">&ldquo;{P(t.q)}&rdquo;</p>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-[10.5px] font-semibold text-purple">— {t.a}</p>
                          <span className="text-[9px] text-foreground/50 bg-purple/5 px-2 py-0.5 rounded-full">{t.tag}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                )}

                {/* Timeline colapsable — proceso DESPUÉS del beneficio */}
                <details className="mt-6 group">
                  <summary className="list-none cursor-pointer text-center py-2.5 text-[12.5px] text-purple font-semibold hover:underline">
                    {ui.intro.verPasos} <span className="inline-block transition-transform group-open:rotate-90">→</span>
                  </summary>
                  <div className="mt-4 space-y-0 relative">
                    <div className="absolute left-[22px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-purple/30 via-purple/20 to-purple/10" />
                    {ui.intro.pasosB.map((step) => ({ ...step, title: P(step.title) })).map((step) => (
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

                  {ui.intro.pasosA.map((step, i) => (i === 3 ? { ...step, title: COPY.intro.step4Title, desc: COPY.intro.step4Desc } : { ...step, title: P(step.title) })).map((step) => (
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

            {requiereConsentTutor && ui.contacto.consentimientoMenor && (
              <label className="mt-4 flex items-start gap-2.5 rounded-xl border border-purple/15 bg-white px-3.5 py-3 text-left text-[12px] leading-snug text-foreground/75">
                <input type="checkbox" checked={consentTutor} onChange={(e) => setConsentTutor(e.target.checked)} className="mt-0.5 h-4 w-4 accent-purple" />
                <span>{ui.contacto.consentimientoMenor} <a href="/legal/privacidad" target="_blank" rel="noreferrer" className="underline text-purple">Privacidad</a></span>
              </label>
            )}

            <button
              onClick={saveAndProceed}
              disabled={!userEmail || saving || (requiereConsentTutor && !consentTutor)}
              className="w-full mt-6 bg-purple hover:bg-[#4e0d68] text-white font-bold rounded-full py-4 text-base shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Guardando..." : ui.contacto.boton}
            </button>

            <p className="mt-3 text-center text-[10px] text-foreground/30">{ui.contacto.nota}</p>
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
            const bubbles = ui.preguntas.burbujas.map((bb) => ({ icon: bb.icon, text: <Strong text={bb.text} /> }));
            const b = bubbles[Math.min(currentQ, bubbles.length - 1)];
            const [directoA, directoB] = ui.preguntas.directoTitulo.split("{precio}");
            // Entrada directa (A/B "directo"): en la pregunta 1 sustituimos la burbuja por
            // qué es, cuánto cuesta y quién lo avala — lo que la portada contaba y aquí se
            // ha saltado. Evita la sorpresa del precio al llegar al pago.
            if (directEntry && currentQ === 0) {
              return (
                <div className="mb-6 rounded-2xl border border-purple/15 bg-white px-4 py-3 text-center shadow-[0_4px_20px_rgba(106,23,140,.05)]">
                  <p className="text-[13px] font-semibold text-foreground/85">
                    {directoA}<span className="text-purple">{precio.texto}</span>{directoB}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-snug text-foreground/55">
                    {ui.preguntas.directoSub}
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
function PaymentPhase({ producto, email, name, phone, psychologistName, selectedDay, selectedSlot, checkoutRef, ab, precio }: {
  producto: Producto999;
  email: string; name: string; phone: string; psychologistName: string;
  selectedDay: string; selectedSlot: string; checkoutRef: React.RefObject<HTMLDivElement | null>;
  ab: "A" | "B";
  precio: PrecioDiagnostico;
}) {
  const ui = producto.ui.pago;
  const P = (s: string) => conPrecio(s, precio.texto);
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
        utms.landing_page = utms.landing_page || producto.testPath;

        const res = await fetch("/api/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name,
            phone,
            psychologistName,
            source: producto.source,
            producto: producto.slug,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <p className="text-xs font-bold text-purple uppercase tracking-wider mb-3">{ui.titulo}</p>
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
              {ui.iconos.map((t) => (<div key={t}><p className="text-[10px] text-foreground/40">{t}</p></div>))}
            </div>
          </div>

          {/* Qué recibes justo después del pago */}
          <div className="mb-6">
            <NextStepsCard items={ui.siguientes} />
          </div>

          {/* Reasegurador anti-objeción #1 del RAG */}
          <div className="mb-6">
            <NoSurprisesBox items={ui.sinSorpresas.map(P)} />
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
  ui,
  onComplete,
  matchedPsychName,
  matchedPsychPhoto,
  feelingLabel,
}: {
  ui: ProductoUI["analisis"];
  onComplete: () => void;
  matchedPsychName: string;
  matchedPsychPhoto: string | null;
  feelingLabel: string;
}) {
  const firstName = matchedPsychName.split(" ")[0];
  const T = (s: string) => s.replace("{tema}", feelingLabel).replace("{first}", firstName);

  // 5 frames narrativos. Total ≈ 14 s. La gente lee, anticipa el match, ve la
  // foto con un reveal, entiende por qué encaja y le da contexto al calendario.
  // El copy viene del producto (productos-999.ts): diagnóstico o logopedia.
  const FRAMES: { ms: number; title: string; sub?: string; bullets?: string[]; reveal?: boolean }[] = [
    { ms: 2800, title: ui.f1Title, sub: ui.f1Sub, bullets: ui.f1Bullets.map(T) },
    { ms: 2800, title: ui.f2Title, sub: ui.f2Sub, bullets: ui.f2Bullets.map(T) },
    { ms: 3800, title: ui.f3Title, reveal: true },
    { ms: 2700, title: T(ui.f4Title), bullets: ui.f4Bullets.map(T) },
    { ms: 1900, title: ui.f5Title, sub: ui.f5Sub },
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
              <>{ui.f3Reveal}<em className="text-purple italic font-normal not-italic font-semibold">{matchedPsychName}</em></>
            ) : (
              frame.title
            )}
          </h1>
          {frame.sub && (
            <p className="text-center text-sm text-foreground/60 mb-6 animate-[fadeInUp_700ms_ease-out]">{frame.sub}</p>
          )}
          {frame.reveal && (
            <p className="text-center text-sm text-foreground/60 mb-6 animate-[fadeInUp_700ms_ease-out]">
              {ui.f3Sub}
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
function NextStepsCard({ items }: { items: { icon: string; title: string; desc: string }[] }) {
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
function NoSurprisesBox({ items }: { items: string[] }) {
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
