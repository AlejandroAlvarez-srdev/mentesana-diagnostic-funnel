// Catálogo canónico de productos 9,99€ que se venden desde landings de la web.
// Fuente de verdad para los paneles de citas (citas-hoy, today, psi, jefe-psi):
// permite mostrar de dónde viene una reserva (terapia unitaria vs diagnóstico
// clásico vs plan digital vs acompañamiento familiar vs VSL), con badge visual
// y descripción para la modal ℹ️.
//
// El marker [PRODUCT:<slug>] se persiste en internalNotes del appointment desde
// amelia-create-booking.ts (bookFirstFree) y terapia/hold-slot.ts (createTerapiaHold),
// alimentado por session.metadata.product del webhook Stripe. Los paneles llaman a
// extractProductoFromNotes(internalNotes) para renderizar el badge.
//
// Slugs deben coincidir EXACTAMENTE con los que envía cada checkout:
//   /api/terapia/checkout             → 'terapia-<dolencia-slug>'    (8 productos)
//   /api/acompanamiento-familiar/checkout → 'acompanamiento-familiar' (1 slug, 6 variantes)
//   /api/planes/checkout              → 'plan-<plan-slug>'           (4 productos)
//   /api/create-checkout              → NO envía product              (diagnóstico clásico)
//   /api/app/terapia-checkout         → NO envía product              (diagnóstico app)
// Para diagnóstico y VSL usamos slugs sintéticos ('diagnostico' / 'diagnostico-vsl')
// que sólo aparecen si un panel/backfill los inyecta manualmente en internalNotes.

export type ProductoCategoria =
  | "terapia"
  | "acompanamiento"
  | "diagnostico"
  | "plan"
  | "gratuita";

export interface Producto {
  /** ej 'terapia-para-llorar-por-todo' — lo que llega en metadata.product Stripe */
  slug: string;
  categoria: ProductoCategoria;
  /** Nombre corto para el badge ('Llorar por todo') */
  label: string;
  /** Sub-etiqueta ('Terapia · Dolencia') para tooltip / modal */
  labelCategoria: string;
  /** Emoji del badge */
  emoji: string;
  /** Colores del badge (bg suave + fg contraste + border sutil) */
  colors: { bg: string; fg: string; border: string };
  /** Landing URL relativa desde la que se compra */
  landing: string;
  /** 3-4 líneas para la modal ℹ️ del panel */
  descripcion: string;
  /** Ángulo comercial / posicionamiento */
  angulo?: string;
  /** Precio en euros (todos 9,99 en el catálogo actual) */
  precio: number;
}

// ─── Colores por categoría ─────────────────────────────────────────────────
// Alineados con la paleta del proyecto (morado corporativo #6A178C). Cada
// categoría tiene identidad visual propia para escaneo rápido en un listado.
const COLORS: Record<ProductoCategoria, { bg: string; fg: string; border: string }> = {
  // Morado — Terapia directa por ángulo (dolencia específica)
  terapia:        { bg: "#F5EBFB", fg: "#6A178C", border: "#D9BFEA" },
  // Verde — Acompañamiento familiar / red de apoyo
  acompanamiento: { bg: "#E9F7EF", fg: "#1B7C4A", border: "#B8E0C8" },
  // Azul — Diagnóstico 9,99€ (incluye las variantes VSL de diagnóstico)
  diagnostico:    { bg: "#E7F0FA", fg: "#1E4E8C", border: "#B8CFEA" },
  // Rosa — Plan digital autoservicio (sin psicóloga)
  plan:           { bg: "#FDECEF", fg: "#B01E3E", border: "#F4C0CB" },
  // Turquesa / dorado — Cita gratuita (promos, reactivación, VIP, garantías)
  gratuita:       { bg: "#FEF9E7", fg: "#8B6B00", border: "#F0D874" },
};

// ─── Catálogo hardcodeado ──────────────────────────────────────────────────
//
// TERAPIA — 8 landings /terapia-para-* → /api/terapia/checkout → metadata.product='terapia-<slug>'
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
      "1 sesión de 50 min con psicóloga colegiada para trabajar el insomnio por rumiación. Sin diagnóstico previo, directo al problema. Videollamada privada, hoy o mañana.",
    angulo: "Dolencia emocional específica · Insomnio por rumiación",
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
      "1 sesión de 50 min con psicóloga colegiada para la sensación de vacío / anhedonia sin nombre. No hace falta que sepas qué te pasa. Videollamada privada.",
    angulo: "Dolencia emocional específica · Vacío afectivo",
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
      "1 sesión de 50 min con psicóloga colegiada para la anhedonia (dejar de disfrutar lo que antes te gustaba). Sin diagnóstico, sin cuestionarios largos.",
    angulo: "Dolencia emocional específica · Anhedonia",
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
      "1 sesión de 50 min con psicóloga colegiada para la hipersensibilidad emocional (lloras por cualquier cosa). Videollamada privada, sin lista de espera.",
    angulo: "Dolencia emocional específica · Labilidad emocional",
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
      "1 sesión de 50 min con psicóloga colegiada para la soledad emocional (te sientes solo/a aunque haya gente alrededor). Videollamada privada.",
    angulo: "Dolencia emocional específica · Soledad emocional",
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
      "1 sesión de 50 min con psicóloga colegiada para dejar de pensar en tu ex / ruptura reciente. Herramientas concretas para esta misma semana.",
    angulo: "Dolencia emocional específica · Duelo por ruptura",
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
      "1 sesión de 50 min con psicóloga colegiada para agorafobia leve / ansiedad social. Sin exposición violenta, ritmo respetuoso, videollamada privada.",
    angulo: "Dolencia emocional específica · Agorafobia / evitación",
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
      "1 sesión de 50 min con psicóloga colegiada para la irritabilidad crónica (todo te enfada, saltas por nada). Videollamada privada.",
    angulo: "Dolencia emocional específica · Irritabilidad crónica",
    precio: 9.99,
  },
];

// ACOMPAÑAMIENTO — 6 landings al MISMO endpoint /api/acompanamiento-familiar/checkout
// → metadata.product='acompanamiento-familiar' (fijo) + metadata.variant=<slug>.
// Para el catálogo mostramos el slug base (que es lo que llega al webhook).
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
      "1 cita con psicóloga (50 min) + camino guiado de 21 días en la app para acompañar a un familiar en dificultad (hijo, pareja, tío, amigo…). 6 variantes específicas: hijo, pareja, esposo/a, tía/tío, mejor amigo/a, familiar genérico.",
    angulo: "Red de apoyo · Ayudar a alguien que quiero",
    precio: 9.99,
  },
];

// VSL — 3 landings a /api/create-checkout (SIN metadata.product real; slugs sintéticos
// para que los paneles puedan clasificar si se enriquece a mano el internalNotes).
const VSL: Producto[] = [
  {
    slug: "diagnostico-vsl",
    categoria: "diagnostico",
    label: "VSL genérica",
    labelCategoria: "Diagnóstico 9,99€ · VSL",
    emoji: "🎬",
    colors: COLORS.diagnostico,
    landing: "/diagnostico-vsl",
    descripcion:
      "Landing de vídeo (VSL) para el diagnóstico clínico 9,99€. Trafico frío Meta con vídeo largo + CTA a checkout. Post-pago crea booking igual que /test-diagnostico.",
    angulo: "VSL · Traffic frío escalable",
    precio: 9.99,
  },
  {
    slug: "diagnostico-vsl-clinico",
    categoria: "diagnostico",
    label: "VSL clínico",
    labelCategoria: "Diagnóstico 9,99€ · VSL",
    emoji: "🎬",
    colors: COLORS.diagnostico,
    landing: "/diagnostico-vsl-clinico",
    descripcion:
      "Variante VSL con tono clínico / profesional (más frío, más autoridad). Mismo producto: diagnóstico 9,99€ con psicóloga colegiada.",
    angulo: "VSL · Autoridad clínica",
    precio: 9.99,
  },
  {
    slug: "diagnostico-vsl-urgencia",
    categoria: "diagnostico",
    label: "VSL urgencia",
    labelCategoria: "Diagnóstico 9,99€ · VSL",
    emoji: "🎬",
    colors: COLORS.diagnostico,
    landing: "/diagnostico-vsl-urgencia",
    descripcion:
      "Variante VSL con narrativa de urgencia (cupos limitados ≤15, decrementa en vivo). Mismo producto: diagnóstico 9,99€.",
    angulo: "VSL · Urgencia / escasez",
    precio: 9.99,
  },
];

// DIAGNÓSTICO CLÁSICO — 11 landings a /api/create-checkout / /api/app/terapia-checkout
// (NO envían metadata.product; el webhook lo trata como diagnóstico por descarte).
// Slug sintético 'diagnostico' para clasificación de paneles.
const DIAGNOSTICO: Producto[] = [
  {
    slug: "diagnostico",
    categoria: "diagnostico",
    label: "Diagnóstico 9,99€",
    labelCategoria: "Diagnóstico clínico · 9,99€",
    emoji: "🧠",
    colors: COLORS.diagnostico,
    landing: "/diagnostico",
    descripcion:
      "Sesión de 50 min con psicóloga colegiada + informe clínico. Producto insignia de captación (11 landings: /diagnostico, /test-diagnostico, /reservar-diagnostico, /por-que-diagnostico[-social-proof], /diagnostico-clinico[-corta/-urgencia], /diagnostico-gratis). Post-pago da +1 mes Premium en la app.",
    angulo: "Producto insignia · Entrada clínica",
    precio: 9.99,
  },
];

// PLANES — 4 landings /api/planes/checkout → metadata.product='plan-<slug>'.
// Producto DIGITAL autoservicio: sin psicóloga, sin videollamada. Se activa en la app.
const PLANES: Producto[] = [
  {
    slug: "plan-3-dias-dormir-mejor",
    categoria: "plan",
    label: "Dormir mejor · 3 días",
    labelCategoria: "Plan digital · 3 días",
    emoji: "😴",
    colors: COLORS.plan,
    landing: "/plan-3-dias-dormir-mejor",
    descripcion:
      "Plan digital autoservicio de 3 días para dormir mejor. Se activa en la app al momento del pago. Sin psicóloga, sin videollamadas — sólo audios + ejercicios diarios.",
    angulo: "Plan digital · Sueño",
    precio: 9.99,
  },
  {
    slug: "plan-7-dias-dejar-sobrepensar",
    categoria: "plan",
    label: "Dejar de sobrepensar · 7 días",
    labelCategoria: "Plan digital · 7 días",
    emoji: "🌀",
    colors: COLORS.plan,
    landing: "/plan-7-dias-dejar-sobrepensar",
    descripcion:
      "Plan digital autoservicio de 7 días para cortar el bucle de rumiación (técnica STOP, cita con la preocupación, 3 preguntas). Se activa en la app.",
    angulo: "Plan digital · Rumiación",
    precio: 9.99,
  },
  {
    slug: "plan-10-dias-foco-tdah",
    categoria: "plan",
    label: "Foco TDAH · 10 días",
    labelCategoria: "Plan digital · 10 días",
    emoji: "🎯",
    colors: COLORS.plan,
    landing: "/plan-10-dias-foco-tdah",
    descripcion:
      "Plan digital autoservicio de 10 días de foco para TDAH (batching por energía, timer visual, dopamina inteligente). Diseñado para cerebros TDAH, no neurotípicos.",
    angulo: "Plan digital · TDAH",
    precio: 9.99,
  },
  {
    slug: "plan-5-dias-organizarte",
    categoria: "plan",
    label: "Organizarte mejor · 5 días",
    labelCategoria: "Plan digital · 5 días",
    emoji: "🗂️",
    colors: COLORS.plan,
    landing: "/plan-5-dias-organizarte",
    descripcion:
      "Plan digital autoservicio de 5 días de organización personal (vaciado mental, matriz Eisenhower, libreta simple). Se activa en la app.",
    angulo: "Plan digital · Organización",
    precio: 9.99,
  },
];

// GRATUITAS — citas sin coste (promos, reactivación de exclientes, VIP,
// cortesía por incidencia, sesión regalada del equipo). Slug se inyecta
// manualmente en internalNotes cuando soporte crea la cita: [PRODUCT:gratuita-*].
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
      "Sesión de cortesía sin coste. Se usa para reactivar exclientes, compensar una incidencia, cerrar una venta o probar el servicio. El agente que la creó dejó el motivo en internalNotes.",
    angulo: "Cortesía · Sin coste",
    precio: 0,
  },
  {
    slug: "gratuita-reactivacion",
    categoria: "gratuita",
    label: "Reactivación",
    labelCategoria: "Cita gratuita · Reactivación",
    emoji: "🔄",
    colors: COLORS.gratuita,
    landing: "/",
    descripcion:
      "Sesión gratuita para reenganchar a un excliente que estaba bien pero se fue. Suele salir de la campaña de reactivación de ventas.",
    angulo: "Retención · Exclientes",
    precio: 0,
  },
  {
    slug: "gratuita-compensacion",
    categoria: "gratuita",
    label: "Compensación",
    labelCategoria: "Cita gratuita · Compensación",
    emoji: "🙏",
    colors: COLORS.gratuita,
    landing: "/",
    descripcion:
      "Sesión regalada por soporte tras una incidencia (psi que no apareció, error de agenda, doble cobro). Cierra la queja sin coste para el paciente.",
    angulo: "Soporte · Recuperar confianza",
    precio: 0,
  },
];

export const CATALOGO: Producto[] = [
  ...TERAPIA,
  ...ACOMPANAMIENTO,
  ...VSL,
  ...DIAGNOSTICO,
  ...PLANES,
  ...GRATUITAS,
];

// Index para lookups O(1).
const BY_SLUG: Map<string, Producto> = new Map(CATALOGO.map((p) => [p.slug, p]));

/**
 * Devuelve el producto del catálogo por slug exacto. Devuelve null si no existe
 * (no lanza). Útil para renderizar badges desde el slug persistido.
 */
export function getProductoBySlug(slug: string): Producto | null {
  if (!slug) return null;
  return BY_SLUG.get(slug) ?? null;
}

/**
 * Parse internalNotes de un appointment Amelia buscando el marker [PRODUCT:slug].
 * El marker lo inyectan amelia-create-booking.ts y terapia/hold-slot.ts al INSERT.
 * Devuelve el Producto del catálogo o null si no hay marker / slug desconocido.
 */
export function extractProductoFromNotes(internalNotes: string | null): Producto | null {
  if (!internalNotes) return null;
  // [PRODUCT:<slug>] — slug es [a-z0-9-]{1,60}. Case-insensitive por robustez.
  const m = /\[PRODUCT:([a-z0-9-]{1,60})\]/i.exec(internalNotes);
  if (!m) return null;
  return getProductoBySlug(m[1].toLowerCase());
}

/**
 * Devuelve todos los productos de una categoría (útil para filtros / dashboards).
 */
export function getProductosByCategoria(categoria: ProductoCategoria): Producto[] {
  return CATALOGO.filter((p) => p.categoria === categoria);
}

/** Devuelve los colores canónicos de una categoría (para chips / filtros). */
export function getColorsForCategoria(categoria: ProductoCategoria): { bg: string; fg: string; border: string } {
  return COLORS[categoria];
}
