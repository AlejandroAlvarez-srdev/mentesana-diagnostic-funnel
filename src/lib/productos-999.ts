// Productos del embudo de 9,99 € — UN embudo, varios productos (28-oct-2026).
//
// El CTO decidió que logopedia use EXACTAMENTE el embudo del diagnóstico psicológico
// (landing → test de 5 preguntas → email → match → hora → pago embebido → cita en
// Amelia → email) cambiando solo las preguntas y el copy. Este módulo es la única
// fuente de esas diferencias: DiagnosticoMatching, PagoUnaPantalla, match-pool,
// free-slots, create-checkout, el webhook de Stripe y la creación de la cita leen de
// aquí. Cualquier sitio que antes tenía "test-diagnostico", "psicóloga", 8/[8, 11] o
// "Diagnóstico Psicológico" escrito a mano pasa a leer de PRODUCTOS[slug].
//
// Módulo .ts PLANO (sin "use client") a propósito: lo importan route handlers y en
// Next 16 importar desde un componente cliente devuelve una client reference.
//
// Regla: las cadenas del diagnóstico son las que ya estaban en producción (A/B
// activos ms_ab_directo y ms_ab_pago); no cambiar ni una coma sin leer
// project_ab_directo_landing / project_ab_pago_una_pantalla.

export type ProductoSlug = "diagnostico" | "logopedia";
export type Profesion = "psicologia" | "logopedia";

export interface Opcion999 { id: string; label: string; icon: string }
export interface Pregunta999 { id: string; title: string; subtitle: string; options: Opcion999[] }
export type Respuestas999 = Record<string, string>;

export interface Paso999 { n: string; icon: string; title: string; desc: string; active?: boolean }

export interface Producto999 {
  slug: ProductoSlug;
  profesion: Profesion;
  /** "Diagnóstico psicológico" | "Valoración logopédica" */
  nombre: string;
  /** "psicóloga" | "logopeda" (siempre en femenino: el equipo lo es) */
  pro: string;
  landingPath: string;
  testPath: string;
  /** diagnostico_tests.source, payments.source y metadata.source de Stripe. */
  source: string;
  /** Servicio de Amelia en el que se crea la cita pagada. */
  ameliaServiceId: number;
  /** Servicios que cuentan como "cita de este producto" (crons, paneles). */
  ameliaServiceIds: number[];
  /** Duración de la sesión en minutos (copy; la real sale de Amelia). */
  sesionMin: number;
  stripeProductName: string;
  stripeDescription: (pro: string) => string;
  /** Meta: content_name del Purchase/Schedule/Lead y content_category. */
  metaContentName: string;
  metaCategory: string;
  /** payments.producto / producto_embudo (panel traficker). */
  productoEmbudo: string;
  /** Las 5 preguntas; pueden depender de respuestas previas (logopedia: menor/adulto). */
  preguntas: (answers: Respuestas999) => Pregunta999[];
  /** Pregunta cuyo valor define el "perfil" (match, copy, clave de localStorage). */
  perfilKey: string;
  perfilDefault: string;
  /** Pregunta de horario (resalta las horas en el calendario). */
  horarioKey: string;
  /** Tema en el lenguaje del paciente, por perfil. */
  tema: Record<string, string>;
  /** Cuándo la persona que responde habla de un MENOR → consentimiento del tutor. */
  esMenor?: (answers: Respuestas999) => boolean;
  /** Perfiles que pueden necesitar atención presencial (derivación honesta). */
  avisoPresencial?: { perfiles: string[]; texto: string };
  /** Prefijo de las claves de localStorage (respuestas, email, hora). */
  storagePrefix: string;
  /** Prefijo de la clave del match persistido ("<prefijo>_<perfil>") — pool de Amelia. */
  matchStorageKey: string;
  /** Ídem para el pick del catálogo fijo de respaldo. */
  matchPickStorageKey: string;
  /** Vídeo que enseña la tarjeta si la profesional no tiene el suyo (null → foto). */
  videoFallback: string | null;
  /** Catálogo fijo de respaldo del match (módulo .ts plano) y su endpoint. */
  poolFallbackPath: string;
  /** Copy de la interfaz. {precio} se sustituye por precio.texto. */
  ui: ProductoUI;
}

export interface ProductoUI {
  intro: {
    kicker: string; kickerApp: string;
    titleLine1: string; titleLine1App: string; titleLine2: string; titleLine2App: string;
    pasosA: Paso999[]; pasosAApp4: { title: string; desc: string };
    pasosB: Paso999[];
    badgeB: string; h1B: string; h1BEm: string; subB: string;
    caras: { name: string; specialty: string; video: string }[];
    carasNota: string; ctaB: string; ctaBSocial: string;
    testimonios: { q: string; a: string; tag: string }[];
    testimoniosTitulo: string; verPasos: string;
  };
  preguntas: {
    burbujas: { icon: string; text: string }[];
    directoTitulo: string; directoSub: string;
  };
  contacto: {
    kicker: string; kickerApp: string; title: string; titleApp: string; subtitle: string; subtitleApp: string;
    placeholder: string; placeholderApp: string; boton: string; nota: string;
    consentimientoMenor?: string;
  };
  analisis: {
    f1Title: string; f1Sub: string; f1Bullets: string[];
    f2Title: string; f2Sub: string; f2Bullets: string[]; // {tema}
    f3Title: string; f3Reveal: string; f3Sub: string;     // "Tu psicóloga es"
    f4Title: string; f4Bullets: string[];                  // {first} {tema}
    f5Title: string; f5Sub: string;
  };
  hora: {
    cargandoPro: string; loaderH1: string; loaderH1Em: string; loaderSub: string; loaderBullets: string[];
    header: string; colegiada: string; online: string; elegida: string; elegidaUna: string; bioB: string;
    testimonioB: { q: string; a: string } | null;
    h1: string; sub: string; sesion: string; reroll: string;
    especialidadCard: string;
  };
  pago: {
    titulo: string; iconos: [string, string, string];
    siguientes: { icon: string; title: string; desc: string }[];
    sinSorpresas: string[];
    unaPantallaHeader: string; unaPantallaSesion: string; unaPantallaQue: string;
  };
}

// ─── Diagnóstico psicológico (producto original; copy = producción) ──────────────
const DIAG_CDN = "https://your-project.supabase.co/storage/v1/object/public/mentesana-videos/welcome";

const PREGUNTAS_DIAGNOSTICO: Pregunta999[] = [
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

const TEMA_DIAGNOSTICO: Record<string, string> = {
  ansiedad: "ansiedad", depresion: "ánimo y motivación", relaciones: "relaciones y vínculos",
  estres: "estrés y burnout", crecimiento: "autoconocimiento", otro: "lo que te está pasando",
};

export const DIAGNOSTICO: Producto999 = {
  slug: "diagnostico",
  profesion: "psicologia",
  nombre: "Diagnóstico psicológico",
  pro: "psicóloga",
  landingPath: "/por-que-diagnostico",
  testPath: "/test-diagnostico",
  source: "test-diagnostico",
  ameliaServiceId: 8,
  ameliaServiceIds: [8, 11],
  sesionMin: 50,
  stripeProductName: "Diagnóstico Psicológico — Mente Sana",
  stripeDescription: (pro) => `Diagnóstico clínico con ${pro || "tu psicóloga"}. Incluye: informe personalizado, matching, sesión con tu psicóloga 50 min, plan de acción.`,
  metaContentName: "Diagnóstico psicológico",
  metaCategory: "diagnostico",
  productoEmbudo: "diagnostico_9_99",
  preguntas: () => PREGUNTAS_DIAGNOSTICO,
  perfilKey: "feeling",
  perfilDefault: "ansiedad",
  horarioKey: "schedule",
  tema: TEMA_DIAGNOSTICO,
  storagePrefix: "ms_diagnostico",
  matchStorageKey: "ms_match_amelia_v4",
  matchPickStorageKey: "ms_match_pick_v2",
  videoFallback: "/videos/welcome/diana-salazar-alzate.mp4",
  poolFallbackPath: "/api/test-diagnostico/pool",
  ui: {
    intro: {
      kicker: "Así funciona tu diagnóstico", kickerApp: "Bienvenida desde la app",
      titleLine1: "6 pasos para entender qué te pasa", titleLine1App: "Tu premium, tu diagnóstico",
      titleLine2: "y tener un plan real.", titleLine2App: "y tu 1ª cita psicológica.",
      pasosA: [
        { n: "1", icon: "📝", title: "Respondes 5 preguntas", desc: "2 minutos. Sobre cómo te sientes y qué buscas. Es lo que harás ahora.", active: true },
        { n: "2", icon: "🎯", title: "Elegimos a tu profesional", desc: "La psicóloga más idónea para estudiar tu caso y elaborar tu diagnóstico." },
        { n: "3", icon: "📅", title: "Eliges día y hora", desc: "Ves la disponibilidad de tu psicóloga y reservas tu cita." },
        { n: "4", icon: "💳", title: "Pagas {precio}", desc: "Pago único. Sin suscripción." },
        { n: "5", icon: "📧", title: "Recibes tu test en el correo", desc: "30 preguntas clínicas (PHQ-9, GAD-7, DSM-5) para que tu psicóloga prepare tu sesión y tu informe personalizado. Unos 10-15 minutos, tranquila." },
        { n: "6", icon: "💬", title: "Asistes a tu cita y recibes tu diagnóstico", desc: "50 min de videollamada. Tu psicóloga llega con tu informe leído, te explica cada hallazgo y construís un plan juntos." },
      ],
      pasosAApp4: { title: "Pagas {precio} (incluye todo)", desc: "Pago único que incluye premium de la app + diagnóstico + cita psicológica. Sin suscripción." },
      pasosB: [
        { n: "1", icon: "📝", title: "Respondes 5 preguntas", desc: "2 minutos. Sobre cómo te sientes y qué buscas.", active: true },
        { n: "2", icon: "🎯", title: "Elegimos a tu profesional", desc: "La psicóloga colegiada más idónea para tu caso." },
        { n: "3", icon: "📅", title: "Eliges día y hora", desc: "Ves su disponibilidad real y reservas." },
        { n: "4", icon: "💳", title: "Reservas tu diagnóstico — {precio} únicos", desc: "Pago único, sin suscripción." },
        { n: "5", icon: "📧", title: "Recibes tu test clínico por email", desc: "PHQ-9, GAD-7, DSM-5. Para que tu psicóloga prepare tu sesión." },
        { n: "6", icon: "💬", title: "Sesión de 50 min + tu diagnóstico", desc: "Tu psicóloga llega con tu informe leído. Plan de acción concreto." },
      ],
      badgeB: "✦ Diagnóstico con psicóloga colegiada",
      h1B: "Entiende qué te pasa y sal con un ", h1BEm: "plan real",
      subB: "Una sesión de 50 min con tu psicóloga colegiada. Hoy, por {precio}.",
      caras: [
        { name: "Adriana Salas", specialty: "Ansiedad, pánico, TCC", video: `${DIAG_CDN}/adriana-salas.mp4` },
        { name: "Giovanna Vago", specialty: "Psicóloga clínica", video: `${DIAG_CDN}/giovanna-vago.mp4` },
        { name: "Leidy Vicuña", specialty: "Ansiedad, mindfulness", video: `${DIAG_CDN}/leidy-vicuna.mp4` },
      ],
      carasNota: "y otras +150 psicólogas colegiadas · elegimos la tuya según tu perfil",
      ctaB: "Reservar mi diagnóstico · {precio} →",
      ctaBSocial: "★ 4,9 · +8.000 pacientes · +150 psicólogas colegiadas",
      testimonios: [
        { q: "Salí con un plan claro de qué hacer esta semana, no con más dudas. Por {precio}, vale mucho más.", a: "Marina, 34", tag: "ansiedad" },
        { q: "Pensé que era otra app impersonal. Mi psicóloga había leído mi test antes de la sesión. Se notó.", a: "Carla, 29", tag: "estado de ánimo" },
        { q: "Nunca había hablado con una psicóloga. Fue más fácil de lo que pensaba, y no me sentí juzgada ni un segundo.", a: "Laura, 41", tag: "primera vez" },
      ],
      testimoniosTitulo: "Lo que cuentan quienes ya lo hicieron",
      verPasos: "¿Cómo funciona? Ver los 6 pasos",
    },
    preguntas: {
      burbujas: [
        { icon: "📋", text: "Estas 5 preguntas son **solo para hacer match con tu psicóloga**. El diagnóstico clínico (30 preguntas) llega después de agendar tu sesión." },
        { icon: "🌱", text: "Este test va a elegir a **la psicóloga que te atenderá** en tu sesión." },
        { icon: "💜", text: "Lo que respondas le ayuda a **tu psicóloga a llegar preparada**." },
        { icon: "✨", text: "Hay **+150 psicólogas colegiadas** esperando — buscamos la tuya." },
        { icon: "🎯", text: "Última pregunta — en segundos verás **quién será tu psicóloga**." },
      ],
      directoTitulo: "Diagnóstico psicológico online · {precio}, pago único",
      directoSub: "Informe clínico + sesión de 50 min con tu psicóloga colegiada · ★ 4,9 · +8.000 personas",
    },
    contacto: {
      kicker: "Ya tenemos tu match ✨", kickerApp: "Un paso más",
      title: "¿A qué email te enviamos tu psicóloga y tu diagnóstico?", titleApp: "Usa el mismo email con el que te registraste en la app",
      subtitle: "Te guardamos tu match y tu hueco para que no lo pierdas.", subtitleApp: "Así activamos tu premium en el mismo email + te enviamos tu diagnóstico + confirmamos tu cita.",
      placeholder: "tucorreo@email.com", placeholderApp: "El email con el que te registraste en la app",
      boton: "Conocer a mi psicóloga y agendar mi cita →",
      nota: "🔒 No spam. Solo te escribiremos para tu diagnóstico.",
    },
    analisis: {
      f1Title: "Analizando tus 5 respuestas", f1Sub: "Las cruzamos con criterios clínicos, no con un test cualquiera.",
      f1Bullets: ["Perfil emocional · qué te trae aquí", "Tono que necesitas · cómo prefieres trabajar", "Especialidad clínica que mejor encaja"],
      f2Title: "Buscando tu match en +150 psicólogas", f2Sub: "Todas colegiadas, con experiencia validada en clínica privada.",
      f2Bullets: ["Especialidad en {tema}", "Disponibilidad esta semana", "Estilo terapéutico compatible con tu perfil"],
      f3Title: "Encontramos a tu psicóloga", f3Reveal: "Tu psicóloga es ", f3Sub: "Colegiada · sesiones online · perfil clínico compatible con el tuyo",
      f4Title: "Por qué {first} encaja contigo",
      f4Bullets: ["Experiencia trabajando {tema}", "Tono cercano y directo en sesión", "Lee tu test antes de la cita — no empiezas de cero"],
      f5Title: "Preparando tu calendario", f5Sub: "Cruzando los huecos reales que tiene esta semana…",
    },
    hora: {
      cargandoPro: "Cargando tu psicóloga…",
      loaderH1: "Preparando tus ", loaderH1Em: "horas disponibles", loaderSub: "Mirando la agenda real de tu psicóloga esta semana…",
      loaderBullets: ["Sincronizando su calendario clínico", "Filtrando huecos libres compatibles contigo", "Dejándote pre-elegido el más cercano"],
      header: "Elige tu sesión psicológica", colegiada: "✓ Colegiada", online: "Sesiones online",
      elegida: "✦ Elegida para tu perfil de **{tema}** — llegará a la sesión con tu test ya leído.",
      elegidaUna: "✦ Elegida para tu perfil de **{tema}** — llega a la sesión con tu test ya leído.",
      bioB: "Colegiada · **especializada en {tema}** · suele empezar preguntándote por lo que pasó esta semana.",
      testimonioB: { q: "Con mi psicóloga conecté desde la primera sesión. Me ayudó a entender por qué me pasaba lo que me pasaba.", a: "— Marina, 34 · 4 meses después" },
      h1: "Reserva tu sesión psicológica con {first}",
      sub: "50 minutos con tu psicóloga colegiada · te dejamos pre-elegido el hueco más cercano 👇",
      sesion: "Tu sesión psicológica", reroll: "¿Prefieres otra psicóloga? →",
      especialidadCard: "Psicóloga colegiada · sesiones online",
    },
    pago: {
      titulo: "Tu cita de diagnóstico", iconos: ["📄 Informe", "🎯 Matching", "💬 50 min"],
      siguientes: [
        { icon: "📧", title: "Tu test clínico en el correo", desc: "30 preguntas (PHQ-9, GAD-7, DSM-5) — 10-15 min. Tu psicóloga las lee antes de la sesión." },
        { icon: "📅", title: "Confirmación de tu cita", desc: "Recordatorios por email y WhatsApp. Enlace a la videollamada." },
        { icon: "🩺", title: "Tu diagnóstico en la sesión", desc: "50 min con tu psicóloga. Te explica cada hallazgo y construís el plan juntas." },
      ],
      sinSorpresas: [
        "Es un pago único de {precio}. No te cobramos nada más automáticamente.",
        "No archivamos tu tarjeta para futuros cargos.",
        "Si después quieres seguir, tú eliges cuándo y qué bono (desde 28,75€/sesión). Pagas al usarlo.",
      ],
      unaPantallaHeader: "Tu sesión y tu pago", unaPantallaSesion: "Tu sesión · 50 min",
      unaPantallaQue: "Informe clínico + sesión de 50 min con {first}",
    },
  },
};

// ─── Logopedia (valoración logopédica 9,99 €) ────────────────────────────────────
// Quien responde casi siempre es la madre o el padre; el test habla de la persona que
// necesita ayuda. Con un menor, el gate del email exige el consentimiento del tutor
// (datos de salud, RGPD art. 9). Nada de diagnósticos: es una valoración.
const MENORES = ["peque", "escolar", "adolescente"];
export const esMenorLogopedia = (answers: Respuestas999) => MENORES.includes(answers.para_quien ?? "");

function preguntasLogopedia(answers: Respuestas999): Pregunta999[] {
  const menor = esMenorLogopedia(answers);
  const respondePorOtro = menor || answers.para_quien === "mayor";
  return [
    {
      id: "para_quien",
      title: "¿Para quién buscas logopeda?",
      subtitle: "Cada edad se comunica a su manera. Empecemos por ahí.",
      options: [
        { id: "peque", label: "Para mi hijo o hija de 2 a 5 años", icon: "🧒" },
        { id: "escolar", label: "Para mi hijo o hija de 6 a 12 años", icon: "🎒" },
        { id: "adolescente", label: "Para un adolescente (13 a 17 años)", icon: "🎧" },
        { id: "adulto", label: "Para mí", icon: "🙋" },
        { id: "mayor", label: "Para un familiar mayor o tras un ictus", icon: "👵" },
      ],
    },
    {
      id: "motivo",
      title: respondePorOtro ? "¿Qué es lo que más te preocupa?" : "¿En qué te gustaría recibir ayuda?",
      subtitle: "No hace falta saber cómo se llama. Elige lo que más se acerque.",
      options: respondePorOtro
        ? [
          { id: "habla", label: "Pronuncia mal o cuesta entenderle", icon: "🗣️" },
          { id: "lenguaje", label: "Habla poco para su edad, no hace frases o no comprende bien", icon: "💬" },
          { id: "lectoescritura", label: "Le cuesta leer o escribir", icon: "📖" },
          { id: "fluidez", label: "Tartamudea o se bloquea al hablar", icon: "⏸️" },
          { id: "voz", label: "Ronquera, se queda sin voz o le duele al hablar", icon: "🎤" },
          { id: "deglucion", label: "Problemas para tragar o comer", icon: "🥄" },
          { id: "neuro", label: "Dificultades tras un ictus, daño cerebral o enfermedad", icon: "🧠" },
          { id: "otro", label: "Otra cosa o no lo tengo claro todavía", icon: "💭" },
        ]
        : [
          { id: "habla", label: "Mi pronunciación o claridad al hablar", icon: "🗣️" },
          { id: "lenguaje", label: "Me cuesta encontrar palabras o comprender", icon: "💬" },
          { id: "lectoescritura", label: "La lectura o la escritura me cuestan", icon: "📖" },
          { id: "fluidez", label: "Me bloqueo o repito al hablar", icon: "⏸️" },
          { id: "voz", label: "Mi voz se cansa, cambia o me duele al hablar", icon: "🎤" },
          { id: "deglucion", label: "Dificultades al tragar", icon: "🥄" },
          { id: "neuro", label: "Cambios tras un ictus, una lesión o una enfermedad", icon: "🧠" },
          { id: "otro", label: "Otra cosa o no lo tengo claro todavía", icon: "💭" },
        ],
    },
    {
      id: "duracion",
      title: "¿Desde cuándo lo notas?",
      subtitle: "Una aproximación está bien.",
      options: [
        { id: "dias", label: "Hace unos días", icon: "📅" },
        { id: "semanas", label: "Hace unas semanas", icon: "🗓️" },
        { id: "meses", label: "Hace unos meses", icon: "⏳" },
        { id: "anios", label: "Hace años", icon: "🕰️" },
        { id: "no_se", label: "No sabría decirlo", icon: "🤷" },
      ],
    },
    {
      id: "valoracion_previa",
      title: "¿Alguien lo ha valorado ya?",
      subtitle: "No hace falta tener un informe para dar este primer paso.",
      options: [
        { id: "nadie", label: "Es la primera vez que lo consultamos", icon: "🆕" },
        { id: "pediatra_o_cole", label: "El pediatra, el cole o el médico lo han comentado", icon: "🏫" },
        { id: "diagnostico", label: "Ya existe una valoración o un diagnóstico", icon: "📋" },
        { id: "logopedia_antes", label: "Ya hemos hecho logopedia antes", icon: "🔄" },
      ],
    },
    {
      id: "horario",
      title: "¿Cuándo os viene mejor la sesión?",
      subtitle: "Para buscar disponibilidad con la logopeda asignada.",
      options: [
        { id: "manana", label: "Por la mañana (11:00 – 14:00)", icon: "☀️" },
        { id: "tarde", label: "Por la tarde (16:00 – 20:00)", icon: "🌅" },
        { id: "flexible", label: "Soy flexible, cualquier horario", icon: "🔀" },
      ],
    },
  ];
}

const TEMA_LOGOPEDIA: Record<string, string> = {
  habla: "pronunciación y claridad al hablar", lenguaje: "lenguaje y comprensión", lectoescritura: "lectura y escritura",
  fluidez: "fluidez y tartamudez", voz: "cuidado de la voz", deglucion: "deglución",
  neuro: "comunicación tras un ictus o una lesión", otro: "lo que nos cuentas",
};

export const LOGOPEDIA: Producto999 = {
  slug: "logopedia",
  profesion: "logopedia",
  nombre: "Valoración logopédica",
  pro: "logopeda",
  landingPath: "/logopedia",
  testPath: "/test-logopedia",
  source: "test-logopedia",
  ameliaServiceId: 400,
  ameliaServiceIds: [400],
  sesionMin: 45,
  stripeProductName: "Logopedia · primera sesión de valoración — Mente Sana",
  stripeDescription: (pro) => `Primera sesión de valoración de logopedia con ${pro || "tu logopeda"}. Incluye: matching, sesión online de 45 min y orientación con los siguientes pasos.`,
  metaContentName: "Valoración logopédica",
  metaCategory: "logopedia",
  productoEmbudo: "logopedia_9_99",
  preguntas: preguntasLogopedia,
  perfilKey: "motivo",
  perfilDefault: "otro",
  horarioKey: "horario",
  tema: TEMA_LOGOPEDIA,
  esMenor: esMenorLogopedia,
  avisoPresencial: {
    perfiles: ["deglucion", "neuro"],
    texto: "La primera sesión online sirve para valorar y orientarte. Si hace falta trabajo presencial o de otro especialista, tu logopeda te lo dirá con claridad.",
  },
  storagePrefix: "ms_logopedia",
  matchStorageKey: "ms_match_logopedia_v1",
  matchPickStorageKey: "ms_match_logopedia_pick_v1",
  videoFallback: null,
  poolFallbackPath: "/api/test-diagnostico/pool?producto=logopedia",
  ui: {
    intro: {
      kicker: "Así funciona tu valoración", kickerApp: "Así funciona tu valoración",
      titleLine1: "5 pasos para entender qué está pasando", titleLine1App: "5 pasos para entender qué está pasando",
      titleLine2: "y saber cómo ayudar.", titleLine2App: "y saber cómo ayudar.",
      pasosA: [
        { n: "1", icon: "📝", title: "Respondes 5 preguntas", desc: "2 minutos. Sobre quién necesita ayuda y qué notas. Es lo que harás ahora.", active: true },
        { n: "2", icon: "🎯", title: "Elegimos a tu logopeda", desc: "La logopeda colegiada más adecuada para vuestro caso." },
        { n: "3", icon: "📅", title: "Eliges día y hora", desc: "Ves la disponibilidad de tu logopeda y reservas la cita." },
        { n: "4", icon: "💳", title: "Pagas {precio}", desc: "Pago único. Sin suscripción." },
        { n: "5", icon: "💬", title: "Primera sesión de valoración", desc: "45 min de videollamada. Tu logopeda explora qué está pasando, te orienta y os propone los siguientes pasos." },
      ],
      pasosAApp4: { title: "Pagas {precio}", desc: "Pago único. Sin suscripción." },
      pasosB: [
        { n: "1", icon: "📝", title: "Respondes 5 preguntas", desc: "2 minutos. Sobre quién necesita ayuda y qué notas.", active: true },
        { n: "2", icon: "🎯", title: "Elegimos a tu logopeda", desc: "La logopeda colegiada más adecuada para vuestro caso." },
        { n: "3", icon: "📅", title: "Eliges día y hora", desc: "Ves su disponibilidad real y reservas." },
        { n: "4", icon: "💳", title: "Reservas tu valoración — {precio} únicos", desc: "Pago único, sin suscripción." },
        { n: "5", icon: "💬", title: "Sesión de 45 min + orientación", desc: "Tu logopeda llega con tus respuestas leídas y os propone un plan de siguientes pasos." },
      ],
      badgeB: "✦ Valoración con logopeda colegiada",
      h1B: "Entiende qué está pasando y sal con un ", h1BEm: "plan real",
      subB: "Una sesión de 45 min con una logopeda colegiada. Hoy, por {precio}.",
      caras: [
        { name: "Giovanna Vago", specialty: "Logopeda colegiada", video: "/videos/welcome/giovanna-vago.mp4" },
        { name: "Maria Alejandra Quintero", specialty: "Logopeda colegiada", video: "/videos/welcome/maria-alejandra-quintero.mp4" },
      ],
      carasNota: "logopedas colegiadas de Mente Sana · elegimos la vuestra según el caso",
      ctaB: "Reservar mi valoración · {precio} →",
      ctaBSocial: "★ 4,9 · +8.000 pacientes en Mente Sana",
      testimonios: [],
      testimoniosTitulo: "",
      verPasos: "¿Cómo funciona? Ver los 5 pasos",
    },
    preguntas: {
      burbujas: [
        { icon: "📋", text: "Estas 5 preguntas son **solo para hacer match con tu logopeda**. La valoración se hace en la sesión, con calma." },
        { icon: "🌱", text: "Este test va a elegir a **la logopeda que os atenderá** en la sesión." },
        { icon: "💜", text: "Lo que respondas le ayuda a **tu logopeda a llegar preparada**." },
        { icon: "✨", text: "Las logopedas de Mente Sana están **colegiadas** — buscamos la vuestra." },
        { icon: "🎯", text: "Última pregunta — en segundos verás **quién será tu logopeda**." },
      ],
      directoTitulo: "Valoración logopédica online · {precio}, pago único",
      directoSub: "Sesión de 45 min con una logopeda colegiada · ★ 4,9 · +8.000 pacientes en Mente Sana",
    },
    contacto: {
      kicker: "Ya tenemos tu match ✨", kickerApp: "Ya tenemos tu match ✨",
      title: "¿A qué email te enviamos tu logopeda y tu cita?", titleApp: "¿A qué email te enviamos tu logopeda y tu cita?",
      subtitle: "Te guardamos tu match y tu hueco para que no lo pierdas.", subtitleApp: "Te guardamos tu match y tu hueco para que no lo pierdas.",
      placeholder: "tucorreo@email.com", placeholderApp: "tucorreo@email.com",
      boton: "Conocer a mi logopeda y agendar la cita →",
      nota: "🔒 No spam. Solo te escribiremos para tu valoración.",
      consentimientoMenor: "Soy el padre, la madre o el tutor legal y consiento el tratamiento de estos datos para preparar la valoración.",
    },
    analisis: {
      f1Title: "Analizando tus 5 respuestas", f1Sub: "Las cruzamos con criterios de logopedia, no con un test cualquiera.",
      f1Bullets: ["Para quién es · edad y momento", "Qué notas · habla, lenguaje, lectura o voz", "Especialidad que mejor encaja"],
      f2Title: "Buscando a vuestra logopeda", f2Sub: "Colegiadas, con experiencia en logopedia infantil y de adultos.",
      f2Bullets: ["Especialidad en {tema}", "Disponibilidad esta semana", "Forma de trabajar compatible con vuestro caso"],
      f3Title: "Encontramos a tu logopeda", f3Reveal: "Tu logopeda es ", f3Sub: "Colegiada · sesiones online · especialidad compatible con lo que nos cuentas",
      f4Title: "Por qué {first} encaja con vuestro caso",
      f4Bullets: ["Experiencia trabajando {tema}", "Tono cercano con familias y adultos", "Lee tus respuestas antes de la cita — no empezáis de cero"],
      f5Title: "Preparando tu calendario", f5Sub: "Cruzando los huecos reales que tiene esta semana…",
    },
    hora: {
      cargandoPro: "Cargando tu logopeda…",
      loaderH1: "Preparando tus ", loaderH1Em: "horas disponibles", loaderSub: "Mirando la agenda real de tu logopeda esta semana…",
      loaderBullets: ["Sincronizando su calendario", "Filtrando huecos libres compatibles contigo", "Dejándote pre-elegido el más cercano"],
      header: "Elige tu sesión de logopedia", colegiada: "✓ Colegiada", online: "Sesiones online",
      elegida: "✦ Elegida para vuestro caso de **{tema}** — llegará a la sesión con tus respuestas leídas.",
      elegidaUna: "✦ Elegida para vuestro caso de **{tema}** — llega a la sesión con tus respuestas leídas.",
      bioB: "Colegiada · **especializada en {tema}** · suele empezar preguntando qué notáis en el día a día.",
      testimonioB: null,
      h1: "Reserva tu sesión de logopedia con {first}",
      sub: "45 minutos con tu logopeda colegiada · te dejamos pre-elegido el hueco más cercano 👇",
      sesion: "Tu sesión de logopedia", reroll: "¿Prefieres otra logopeda? →",
      especialidadCard: "Logopeda colegiada · sesiones online",
    },
    pago: {
      titulo: "Tu cita de valoración", iconos: ["🗣️ Valoración", "🎯 Matching", "💬 45 min"],
      siguientes: [
        { icon: "📅", title: "Confirmación de tu cita", desc: "Email con el día, la hora y el enlace a la videollamada." },
        { icon: "📝", title: "Tu logopeda prepara la sesión", desc: "Lee tus respuestas antes de la cita para no empezar de cero." },
        { icon: "🗣️", title: "Valoración y siguientes pasos", desc: "45 min con tu logopeda. Explora qué está pasando y os orienta con un plan." },
      ],
      sinSorpresas: [
        "Es un pago único de {precio}. No te cobramos nada más automáticamente.",
        "No archivamos tu tarjeta para futuros cargos.",
        "Si después queréis seguir, tu logopeda os propone un plan con número de sesiones. Decides tú, sin compromiso.",
      ],
      unaPantallaHeader: "Tu sesión y tu pago", unaPantallaSesion: "Tu sesión · 45 min",
      unaPantallaQue: "Sesión de valoración de 45 min con {first}",
    },
  },
};

export const PRODUCTOS: Record<ProductoSlug, Producto999> = { diagnostico: DIAGNOSTICO, logopedia: LOGOPEDIA };

export function productoDesdeSlug(v: unknown): Producto999 {
  return v === "logopedia" ? LOGOPEDIA : DIAGNOSTICO;
}

/** Producto a partir de `source` (diagnostico_tests, payments, metadata de Stripe). Null si no es un test del 9,99. */
export function productoDesdeSource(source: unknown): Producto999 | null {
  if (source === DIAGNOSTICO.source) return DIAGNOSTICO;
  if (source === LOGOPEDIA.source) return LOGOPEDIA;
  return null;
}

/** Producto del 9,99 a partir de la metadata de un Checkout Session de Stripe. */
export function productoDesdeMetadata(md: Record<string, string | undefined> | null | undefined): Producto999 {
  return productoDesdeSlug(md?.producto ?? (md?.source === LOGOPEDIA.source ? "logopedia" : "diagnostico"));
}

export function productoDesdePath(pathname: string): Producto999 {
  return isLogopediaPath(pathname) ? LOGOPEDIA : DIAGNOSTICO;
}

export const isLogopediaPath = (path: string) => /^\/(?:logopedia|test-logopedia)(?:\/|$)/.test(path);

/** Sustituye {precio} en el copy. */
export const conPrecio = (s: string, precioTexto: string) => s.split("{precio}").join(precioTexto);
