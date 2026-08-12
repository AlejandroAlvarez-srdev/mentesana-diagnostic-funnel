// Catálogo canónico de productos 9,99€ que se venden desde landings de la web.
// Fuente de verdad para los paneles de citas (citas-hoy, today, psi, jefe-psi):
// permite mostrar de dónde viene una reserva y GUIAR a la psi sobre cómo
// abordar la sesión (gancho emocional de la landing + perfil probable +
// tono sugerido para los primeros minutos).
//
// El marker [PRODUCT:<slug>] se persiste en internalNotes del appointment desde
// amelia-create-booking.ts (bookFirstFree) y terapia/hold-slot.ts (createTerapiaHold),
// alimentado por session.metadata.product del webhook Stripe. Los paneles llaman a
// inferProducto({...}) para renderizar el badge (marker exacto o inferencia por señal).

export type ProductoCategoria =
  | "terapia"
  | "acompanamiento"
  | "diagnostico"
  | "recurrente"
  | "plan"
  | "gratuita";

export interface Producto {
  /** ej 'terapia-para-llorar-por-todo' — lo que llega en metadata.product Stripe */
  slug: string;
  categoria: ProductoCategoria;
  /** Nombre corto para el badge ('Llorar por todo') */
  label: string;
  /** Sub-etiqueta ('Terapia directa · Dolencia') para tooltip / modal */
  labelCategoria: string;
  /** Emoji del badge */
  emoji: string;
  /** Colores del badge (bg suave + fg contraste + border sutil) */
  colors: { bg: string; fg: string; border: string };
  /** Landing URL relativa desde la que se compra */
  landing: string;
  /** Guía CLÍNICA para la psi: qué vio el paciente + qué esperar + cómo empezar la sesión */
  descripcion: string;
  /** Perfil emocional resumido para el badge */
  angulo?: string;
  /** Precio en euros */
  precio: number;
}

// ─── Colores por categoría ─────────────────────────────────────────────────
const COLORS: Record<ProductoCategoria, { bg: string; fg: string; border: string }> = {
  // Morado — Terapia directa por ángulo (dolencia específica)
  terapia:        { bg: "#F5EBFB", fg: "#6A178C", border: "#D9BFEA" },
  // Verde — Acompañamiento familiar / red de apoyo
  acompanamiento: { bg: "#E9F7EF", fg: "#1B7C4A", border: "#B8E0C8" },
  // Azul — Diagnóstico 9,99€ (incluye las variantes VSL de diagnóstico)
  diagnostico:    { bg: "#E7F0FA", fg: "#1E4E8C", border: "#B8CFEA" },
  // Teal — Cita recurrente (paciente con bono/pack activo, continuidad terapéutica)
  recurrente:     { bg: "#E0F7F5", fg: "#0F766E", border: "#99DEDA" },
  // Rosa — Plan digital autoservicio (sin psicóloga)
  plan:           { bg: "#FDECEF", fg: "#B01E3E", border: "#F4C0CB" },
  // Dorado suave — Cita gratuita (cortesía real, marcada a mano por soporte)
  gratuita:       { bg: "#FEF9E7", fg: "#8B6B00", border: "#F0D874" },
};

// ─── TERAPIA DIRECTA — 8 landings /terapia-para-* ──────────────────────────
// Descripciones = guía clínica: gancho de la landing + perfil + primer paso.
const TERAPIA: Producto[] = [
  {
    slug: "terapia-para-no-dormir-pensando",
    categoria: "terapia",
    label: "No dormir pensando",
    labelCategoria: "Terapia directa · Dolencia",
    emoji: "🌙",
    colors: COLORS.terapia,
    landing: "/terapia-para-no-dormir-pensando",
    descripcion:
      "El paciente llegó desde una landing con el gancho 'cuando te acuestas y tu mente se enciende'. Perfil: mente hiperactiva, rumia nocturna, no puede desconectar. Sugerencia primeros minutos: NO abrir el problema directamente, primero calmar el sistema (respiración 4-7-8) + explorar rutina de noche y estresores del día. Higiene del sueño + técnica STOP para el bucle. Descartar cafeína/pantallas antes de patologizar.",
    angulo: "Insomnio por rumiación",
    precio: 9.99,
  },
  {
    slug: "terapia-para-sentirme-vacio",
    categoria: "terapia",
    label: "Sentirme vacío/a",
    labelCategoria: "Terapia directa · Dolencia",
    emoji: "🕳️",
    colors: COLORS.terapia,
    landing: "/terapia-para-sentirme-vacio",
    descripcion:
      "Gancho de la landing: 'estás mal pero no sabes por qué'. Perfil: bajón sin nombre, funcional en apariencia pero se siente hueco. NO forzar diagnóstico ni etiqueta (DEPRE/ANSIEDAD). Explorar cronología: '¿desde cuándo?', '¿hubo algo que se apagara?'. Validar el vacío como señal legítima antes de reencuadrar. Ojo a anhedonia enmascarada + posible duelo no elaborado.",
    angulo: "Vacío afectivo / anhedonia latente",
    precio: 9.99,
  },
  {
    slug: "terapia-para-no-disfrutar-nada",
    categoria: "terapia",
    label: "No disfrutar nada",
    labelCategoria: "Terapia directa · Dolencia",
    emoji: "🌫️",
    colors: COLORS.terapia,
    landing: "/terapia-para-no-disfrutar-nada",
    descripcion:
      "Gancho: 'las cosas que antes te gustaban ya no te llenan'. Perfil: anhedonia explícita, posible cuadro depresivo latente. Evitar reencuadre motivacional ('busca cosas nuevas'). Activación conductual muy pequeña (micro-experimento de placer <10 min). Cribar sueño, alimentación, medicación. Sensibilidad al riesgo suicida — preguntar directo si aparece.",
    angulo: "Anhedonia explícita",
    precio: 9.99,
  },
  {
    slug: "terapia-para-llorar-por-todo",
    categoria: "terapia",
    label: "Llorar por todo",
    labelCategoria: "Terapia directa · Dolencia",
    emoji: "💧",
    colors: COLORS.terapia,
    landing: "/terapia-para-llorar-por-todo",
    descripcion:
      "Gancho: 'cualquier cosa te hace llorar'. Perfil: hipersensibilidad emocional, sistema saturado (no debilidad). PROHIBIDO patologizar como 'PAS' o 'estás dramática'. Validar: 'tu sistema está en carga máxima, llorar es la válvula'. Mapa de disparadores + respiración + descarga corporal. Cribar duelo no cerrado, síndrome premenstrual, sobrecarga cuidadora.",
    angulo: "Desregulación / labilidad emocional",
    precio: 9.99,
  },
  {
    slug: "terapia-para-soledad-emocional",
    categoria: "terapia",
    label: "Soledad emocional",
    labelCategoria: "Terapia directa · Dolencia",
    emoji: "🫥",
    colors: COLORS.terapia,
    landing: "/terapia-para-soledad-emocional",
    descripcion:
      "Gancho: 'te sientes sola aunque haya gente alrededor'. Perfil: vínculos superficiales, aislamiento afectivo. NO sugerir 'conocer más gente' o 'salir más'. Explorar historia vincular (apego, primeras figuras), calidad vs cantidad. Si hay historia de trauma relacional, ir despacio. Posible codependencia inversa (dar sin recibir).",
    angulo: "Soledad emocional / vínculo",
    precio: 9.99,
  },
  {
    slug: "terapia-para-superar-ruptura",
    categoria: "terapia",
    label: "Superar ruptura",
    labelCategoria: "Terapia directa · Dolencia",
    emoji: "💔",
    colors: COLORS.terapia,
    landing: "/terapia-para-superar-ruptura",
    descripcion:
      "Gancho: 'han pasado meses y sigues pensando en tu ex'. Perfil: rumiación post-ruptura, posible dependencia emocional. Ojo especial: si es <30 días es agudo (validar dolor, sostener SIN técnica); >6 meses hablar de duelo prolongado. Limpieza digital (ex en redes), ritual de cierre, red de apoyo. Cribar posible violencia previa disfrazada de 'era intenso'.",
    angulo: "Duelo por ruptura",
    precio: 9.99,
  },
  {
    slug: "terapia-para-miedo-a-salir",
    categoria: "terapia",
    label: "Miedo a salir",
    labelCategoria: "Terapia directa · Dolencia",
    emoji: "🚪",
    colors: COLORS.terapia,
    landing: "/terapia-para-miedo-a-salir",
    descripcion:
      "Gancho: 'cancelas planes porque salir da miedo'. Perfil: agorafobia leve, ansiedad social o pánico. NO exposición violenta primera sesión. Jerarquía muy suave. Cribar ataques de pánico (¿el miedo es a la calle o al ataque en la calle?), duelo reciente, cambio vital. Validar sin invalidar ('salir es difícil de verdad, no eres cobarde').",
    angulo: "Agorafobia / evitación",
    precio: 9.99,
  },
  {
    slug: "terapia-para-irritabilidad-constante",
    categoria: "terapia",
    label: "Irritabilidad constante",
    labelCategoria: "Terapia directa · Dolencia",
    emoji: "🔥",
    colors: COLORS.terapia,
    landing: "/terapia-para-irritabilidad-constante",
    descripcion:
      "Gancho: 'todo te enfada, saltas por nada'. Perfil: agotamiento emocional, posible burnout somatizado. NO moralizar sobre 'controlar la rabia'. La irritabilidad es SÍNTOMA — buscar la causa (sobrecarga laboral, no dormir, hormonas, resentimiento acumulado en pareja). Cribar horas de sueño y estresores actuales antes de trabajar 'gestión emocional'.",
    angulo: "Irritabilidad crónica / síntoma",
    precio: 9.99,
  },
];

// ─── ACOMPAÑAMIENTO — 6 landings acompanamiento-familiar / apoya-a-tu-* ────
const ACOMPANAMIENTO: Producto[] = [
  {
    slug: "acompanamiento-familiar",
    categoria: "acompanamiento",
    label: "Acompañamiento familiar",
    labelCategoria: "Acompañamiento · Familiar",
    emoji: "🤝",
    colors: COLORS.acompanamiento,
    landing: "/acompanamiento-familiar",
    descripcion:
      "IMPORTANTE: el paciente que viene NO es el 'enfermo', es el FAMILIAR / cuidador que quiere ayudar (a hijo, pareja, esposo, tía, mejor amigo). Perfil: culpa, impotencia, sobrecarga, 'no sé qué hacer con él/ella'. NO dar consejos para el 'otro' hasta trabajar al cuidador. Primero: validar su cansancio + poner el foco en sus propios límites. Luego: qué SÍ está en su mano vs qué no. Riesgo: codependencia. Cribar quién es la persona por la que consulta y desde cuándo cuida.",
    angulo: "Red de apoyo · Cuidador",
    precio: 9.99,
  },
];

// ─── DIAGNÓSTICO 9,99€ (clásico + VSL) ─────────────────────────────────────
const DIAGNOSTICO: Producto[] = [
  {
    slug: "diagnostico",
    categoria: "diagnostico",
    label: "Diagnóstico",
    labelCategoria: "Diagnóstico clínico · 9,99€",
    emoji: "🧠",
    colors: COLORS.diagnostico,
    landing: "/diagnostico",
    descripcion:
      "El paciente compró el producto insignia: 50 min + informe clínico. Vino desde una de las 11 landings /diagnostico* /test-diagnostico /reservar-diagnostico /por-que-diagnostico. Espera estructura clínica clara. Sesión sugerida: anamnesis breve → identificar dolor principal → escala/cribado ligero → devolución con recomendaciones → decisión de continuidad. Post-pago recibe +1 mes Premium en la app. Cerrar con próximo paso concreto.",
    angulo: "Entrada clínica · Producto insignia",
    precio: 9.99,
  },
  {
    slug: "diagnostico-vsl",
    categoria: "diagnostico",
    label: "Diagnóstico (VSL)",
    labelCategoria: "Diagnóstico clínico · VSL",
    emoji: "🎬",
    colors: COLORS.diagnostico,
    landing: "/diagnostico-vsl",
    descripcion:
      "Mismo diagnóstico 9,99€ pero vino desde una landing con vídeo largo (VSL). Perfil probable: viene de tráfico frío Meta, quizá con menos preparación que quien entra por /test-diagnostico. Puede llegar más emocionado o con expectativas específicas del vídeo. Empezar preguntando '¿qué te movió a reservar?' para calibrar.",
    angulo: "Entrada clínica · Vino de VSL",
    precio: 9.99,
  },
  {
    slug: "diagnostico-vsl-clinico",
    categoria: "diagnostico",
    label: "Diagnóstico (VSL clínico)",
    labelCategoria: "Diagnóstico clínico · VSL profesional",
    emoji: "🎬",
    colors: COLORS.diagnostico,
    landing: "/diagnostico-vsl-clinico",
    descripcion:
      "Diagnóstico 9,99€ desde landing VSL con tono clínico / profesional. Perfil probable: busca autoridad clínica, quizá con historia previa de terapia. Puede pedir informe formal, hablar de colegiatura o preguntar credenciales. Sesión estructurada al estilo consulta.",
    angulo: "Entrada clínica · VSL autoridad",
    precio: 9.99,
  },
  {
    slug: "diagnostico-vsl-urgencia",
    categoria: "diagnostico",
    label: "Diagnóstico (VSL urgencia)",
    labelCategoria: "Diagnóstico clínico · VSL urgencia",
    emoji: "🎬",
    colors: COLORS.diagnostico,
    landing: "/diagnostico-vsl-urgencia",
    descripcion:
      "Diagnóstico 9,99€ desde landing VSL con narrativa de urgencia (cupos limitados ≤15). Perfil probable: alta ansiedad de decisión, puede estar en fase aguda, necesita sentir que 'llegó justo a tiempo'. Sostener la calma sin restar valor a su urgencia. Primeros minutos importan mucho.",
    angulo: "Entrada clínica · VSL urgencia",
    precio: 9.99,
  },
];

// ─── PLANES DIGITALES — autoservicio sin psi ───────────────────────────────
const PLANES: Producto[] = [
  {
    slug: "plan-3-dias-dormir-mejor",
    categoria: "plan",
    label: "Plan Dormir 3d",
    labelCategoria: "Plan digital · 3 días",
    emoji: "😴",
    colors: COLORS.plan,
    landing: "/plan-3-dias-dormir-mejor",
    descripcion:
      "Producto DIGITAL autoservicio (sin psi). 3 días de ejercicios de sueño en la app. Si esta cita salió por error o por seguimiento post-plan, la psi puede aprovechar para preguntar cómo fue el plan y detectar si necesita apoyo humano.",
    angulo: "Plan digital · Sueño",
    precio: 9.99,
  },
  {
    slug: "plan-7-dias-dejar-sobrepensar",
    categoria: "plan",
    label: "Plan Sobrepensar 7d",
    labelCategoria: "Plan digital · 7 días",
    emoji: "🌀",
    colors: COLORS.plan,
    landing: "/plan-7-dias-dejar-sobrepensar",
    descripcion:
      "Producto DIGITAL 7 días para reducir rumiación (STOP, cita con la preocupación, defusión). Si esta cita existe, probable seguimiento o venta cruzada — preguntar cómo fue el plan.",
    angulo: "Plan digital · Rumiación",
    precio: 9.99,
  },
  {
    slug: "plan-10-dias-foco-tdah",
    categoria: "plan",
    label: "Plan TDAH 10d",
    labelCategoria: "Plan digital · 10 días",
    emoji: "⚡",
    colors: COLORS.plan,
    landing: "/plan-10-dias-foco-tdah",
    descripcion:
      "Producto DIGITAL 10 días para foco con TDAH adulto (batching, dopamina inteligente, timeboxing). El paciente se identifica como neurodivergente — ajustar la sesión con pausas cortas, estructura clara.",
    angulo: "Plan digital · TDAH",
    precio: 9.99,
  },
  {
    slug: "plan-5-dias-organizarte",
    categoria: "plan",
    label: "Plan Organizar 5d",
    labelCategoria: "Plan digital · 5 días",
    emoji: "📋",
    colors: COLORS.plan,
    landing: "/plan-5-dias-organizarte",
    descripcion:
      "Producto DIGITAL 5 días de organización personal (vaciado mental, Eisenhower, sistema simple). Puede indicar sobrecarga cognitiva o rasgo TDAH sin diagnosticar.",
    angulo: "Plan digital · Organización",
    precio: 9.99,
  },
];

// ─── GRATUITAS — cortesías reales (soporte inyecta marker a mano) ──────────
const GRATUITAS: Producto[] = [
  {
    slug: "gratuita",
    categoria: "gratuita",
    label: "Cita gratuita",
    labelCategoria: "Cita gratuita · Cortesía",
    emoji: "🎁",
    colors: COLORS.gratuita,
    landing: "/",
    descripcion:
      "Sesión sin coste concedida por soporte. Motivo específico en internalNotes (leerlo antes). Perfil variable — puede ser paciente enfadado que compensamos, VIP invitado, o prueba de servicio. Sensibilidad ALTA: la persona sabe que es gratis y puede llegar con expectativas polarizadas (o muy agradecida o muy exigente).",
    angulo: "Cortesía · Sin coste",
    precio: 0,
  },
  {
    slug: "gratuita-reactivacion",
    categoria: "gratuita",
    label: "Reactivación",
    labelCategoria: "Cita gratuita · Reactivación excliente",
    emoji: "🔄",
    colors: COLORS.gratuita,
    landing: "/",
    descripcion:
      "Sesión gratuita para reenganchar a un excliente que se fue. Es paciente CONOCIDO — revisar su HC antes. Objetivo velado: volver al bono. NO forzar la venta en sesión, sí dejar puerta abierta. Preguntar qué pasó desde la última vez y si el motivo por el que se fue sigue activo.",
    angulo: "Retención · Excliente",
    precio: 0,
  },
  {
    slug: "gratuita-compensacion",
    categoria: "gratuita",
    label: "Compensación",
    labelCategoria: "Cita gratuita · Compensación incidencia",
    emoji: "🙏",
    colors: COLORS.gratuita,
    landing: "/",
    descripcion:
      "Sesión regalada tras una incidencia (psi que no apareció, error de agenda, cobro no autorizado, etc). El paciente PUEDE llegar molesto — abrir con 'sabemos que hubo un fallo, gracias por darnos otra oportunidad'. Ir con calma, no defender la marca, escuchar la queja completa antes de trabajar clínicamente.",
    angulo: "Soporte · Recuperar confianza",
    precio: 0,
  },
];

export const CATALOGO: Producto[] = [
  ...TERAPIA,
  ...ACOMPANAMIENTO,
  ...DIAGNOSTICO,
  ...PLANES,
  ...GRATUITAS,
];

// Index para lookups O(1).
const BY_SLUG: Map<string, Producto> = new Map(CATALOGO.map((p) => [p.slug, p]));

/**
 * Devuelve el producto del catálogo por slug exacto. Devuelve null si no existe.
 */
export function getProductoBySlug(slug: string): Producto | null {
  if (!slug) return null;
  return BY_SLUG.get(slug) ?? null;
}

/**
 * Parse internalNotes buscando el marker [PRODUCT:slug].
 */
export function extractProductoFromNotes(internalNotes: string | null): Producto | null {
  if (!internalNotes) return null;
  const m = /\[PRODUCT:([a-z0-9-]{1,60})\]/i.exec(internalNotes);
  if (!m) return null;
  return getProductoBySlug(m[1].toLowerCase());
}

/**
 * Contexto de la cita para inferir producto cuando NO hay marker.
 */
export interface AppointmentContext {
  internal_notes?: string | null;
  service_id?: number | null;
  service_name?: string | null;
  price?: number | null;
  service_price?: number | null;
}

/**
 * Producto sintético para el fallback por señal. Reusa las descripciones
 * canónicas del catálogo (misma guía clínica para la psi), no dice "inferido".
 */
function syntheticProducto(base: Producto): Producto {
  return {
    ...base,
    slug: `${base.categoria}-generico`,
    angulo: base.angulo,
  };
}

const DIAGNOSTICO_CANONICO = DIAGNOSTICO[0];
const RECURRENTE_CANONICO: Producto = {
  slug: "recurrente-generico",
  categoria: "recurrente",
  label: "Recurrente",
  labelCategoria: "Sesión recurrente · Bono/Pack",
  emoji: "🔁",
  colors: COLORS.recurrente,
  landing: "/",
  descripcion:
    "Sesión de continuidad del bono/pack del paciente (ya pagó el paquete, va consumiendo sesiones). Es un paciente CONOCIDO — abrir su HC para ver la última sesión, tareas asignadas, temas abiertos. Preguntar por la evolución de lo que trabajaron la última vez antes de meter tema nuevo. Continuidad = confianza acumulada, aprovechar.",
  angulo: "Continuidad terapéutica · Bono",
  precio: 0,
};

/**
 * Infiere el producto de una cita usando (en orden de prioridad):
 *   1. Marker [PRODUCT:slug] en internalNotes → producto exacto (guía completa).
 *   2. service_id ∈ [8, 11] → Diagnóstico (guía clínica del diagnóstico).
 *   3. service_id ≠ 8/11 → Recurrente (guía de continuidad de bono).
 *   4. price == 9,99 sin service_id → probable diagnóstico.
 *   5. null → no se puede inferir.
 *
 * La categoría 'gratuita' NO se infiere por price=0 (recurrentes también son 0).
 * Solo aparece con marker explícito [PRODUCT:gratuita*].
 */
export function inferProducto(ctx: AppointmentContext): Producto | null {
  const marker = extractProductoFromNotes(ctx.internal_notes ?? null);
  if (marker) return marker;

  if (ctx.service_id === 8 || ctx.service_id === 11) {
    return syntheticProducto(DIAGNOSTICO_CANONICO);
  }

  if (typeof ctx.service_id === "number" && ctx.service_id > 0) {
    return RECURRENTE_CANONICO;
  }

  const price = ctx.price ?? ctx.service_price ?? null;
  if (price === 9.99) {
    return syntheticProducto(DIAGNOSTICO_CANONICO);
  }

  return null;
}

/**
 * Devuelve todos los productos de una categoría.
 */
export function getProductosByCategoria(categoria: ProductoCategoria): Producto[] {
  return CATALOGO.filter((p) => p.categoria === categoria);
}

/** Devuelve los colores canónicos de una categoría. */
export function getColorsForCategoria(categoria: ProductoCategoria): { bg: string; fg: string; border: string } {
  return COLORS[categoria];
}
