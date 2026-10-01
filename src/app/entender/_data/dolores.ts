// Landings "por dolor" (brief Ad Boost, 01-oct-2026): ruptura · ansiedad · dependencia.
// Misma estructura de 11 bloques; cambia solo el copy de este archivo.
//
// Reglas del brief que se aplican aquí:
// - Ninguna condición clínica nombrada en eyebrow/H1/subtítulo/espejo (política de
//   atributos personales de Meta): solo escenas y acciones.
// - Se promete entender, no mejorar. Sin "gratis". Siempre "Mente Sana".
// - Testimonios: SOLO los del banco con consentimiento (src/data/testimonios.ts);
//   los propuestos en el brief quedan pendientes de verificación y no se publican.
// - Cifras del brief ({CIFRA}) sustituidas por las de marca: +150 psicólogas,
//   4,9/5, +8.000 pacientes, +750 reseñas, informe de 5-7 páginas, media 6 años
//   de experiencia (psychologists_mentesana, 39 activas con dato: 6,2).

export type DolorSlug = "ruptura" | "ansiedad" | "dependencia";

export interface DolorConfig {
  slug: DolorSlug;
  seo: { title: string; ogTitle: string; ogDescription: string };
  eyebrow: string;
  hero: { h1: string; sub: string };
  espejo: { kicker: string; title: string; scenes: string[]; scenes2?: { intro: string; items: string[] }; closing: string };
  reencuadre: { kicker: string; title: string; paragraphs: string[] };
  /** Qué resume el informe en esta landing. */
  informe: string;
  /** Preguntas específicas del dolor; detrás van las FIJAS de la base. */
  faq: { q: string; a: string }[];
  cierreLinea: string;
  /** Nombres (campo `name`) del banco de testimonios, en orden de aparición. */
  testimonios: string[];
  /** Orden de las psicólogas en esta landing (slug de vídeo). */
  psicologas: string[];
}

export const SITE = "https://www.sesiondecitasms.com";

export const PSICOLOGAS_DOLOR: Record<string, { name: string; video: string; tags: string }> = {
  "adriana-salas": { name: "Adriana Salas", video: "adriana-salas", tags: "Ansiedad · Pareja · Estrés laboral" },
  "alejandra-elias": { name: "Alexandra Elías", video: "alejandra-elias", tags: "Ansiedad · Depresión · Autoestima" },
  "giovanna-vago": { name: "Giovanna Vago", video: "giovanna-vago", tags: "Ansiedad · Depresión · Duelo" },
  "juliana-urioste": { name: "Juliana Urioste", video: "juliana-urioste", tags: "Trauma · Apego · Estrés" },
  "leidy-vicuna": { name: "Leidy Vicuña", video: "leidy-vicuna", tags: "Pareja · Terapia general" },
};

export const DOLORES: Record<DolorSlug, DolorConfig> = {
  ruptura: {
    slug: "ruptura",
    seo: {
      title: "Entender qué ha pasado después de una ruptura · Mente Sana",
      ogTitle: "Entender qué ha pasado después de una ruptura · Mente Sana",
      ogDescription: "Un informe firmado por una psicóloga colegiada y 50 minutos con ella para ordenar qué ha pasado y por dónde seguir. 9,99€, pago único.",
    },
    eyebrow: "Pasar página no es olvidar",
    hero: {
      h1: "No va a entender a la otra persona. Va a entender qué te ha pasado a ti.",
      sub: "Un informe firmado por una psicóloga colegiada y 50 minutos con ella para ordenar qué ha pasado y por dónde seguir. 9,99€, pago único.",
    },
    espejo: {
      kicker: "Lo que no se cuenta",
      title: "Lo que nadie ve después de una ruptura.",
      scenes: [
        "Dormir en el mismo lado de la cama, aunque ahora sobre sitio.",
        "Mirar el móvil a la hora en que solía escribir.",
        "Sus cosas en una caja, sin devolver ni tirar.",
        "Contestar \"bien, ya está superado\" cada vez que alguien pregunta.",
        "Borrar las fotos y recuperarlas de la papelera dos días después.",
        "Una canción en el súper, y cambiar de pasillo.",
      ],
      closing: "Cosas pequeñas. Son las que se comen el día.",
    },
    reencuadre: {
      kicker: "Tiene un porqué",
      title: "Una ruptura no se lleva solo a una persona.",
      paragraphs: [
        "Se lleva rutinas, planes y una versión del futuro que ya estaba en marcha. Eso no se ordena solo con tiempo.",
        "El informe pone por escrito qué ha pasado, por qué cuesta cerrarlo y por dónde seguir. Sin repasar quién tuvo la culpa.",
      ],
    },
    informe: "Qué ha pasado, por qué cuesta cerrarlo y por dónde seguir.",
    faq: [
      { q: "¿Tiene sentido si la ruptura fue hace mucho?", a: "Sí. El tiempo que haya pasado no decide si hay algo que entender. Si sigue pesando después de meses o de años, eso ya es información, y el informe la ordena." },
      { q: "¿Y si fui yo quien lo dejó?", a: "También cuenta. Tomar la decisión no quita el duelo por lo que se termina, ni las dudas sobre si fue lo correcto. La sesión no va de quién tuvo la culpa. Va de entender qué te ha pasado a ti." },
    ],
    cierreLinea: "9,99€ para entender qué ha pasado. Y por dónde seguir.",
    testimonios: ["Lucía R.", "Marta G.", "Helena T.", "Tania B."],
    psicologas: ["adriana-salas", "leidy-vicuna", "giovanna-vago", "juliana-urioste", "alejandra-elias"],
  },
  ansiedad: {
    slug: "ansiedad",
    seo: {
      title: "Cuando el cuerpo avisa · Mente Sana",
      ogTitle: "Cuando el cuerpo avisa · Mente Sana",
      ogDescription: "Un informe firmado por una psicóloga colegiada y 50 minutos con ella para entender qué hay detrás. 9,99€, pago único.",
    },
    eyebrow: "Cuando el cuerpo va por delante",
    hero: {
      h1: "Por fuera, todo normal. Por dentro, todo acelerado y falta el aire.",
      sub: "Un informe firmado por una psicóloga colegiada y 50 minutos con ella para entender qué hay detrás. 9,99€, pago único.",
    },
    espejo: {
      kicker: "Lo que no se ve",
      title: "Lo que nadie nota desde fuera.",
      scenes: [
        "Despertarse a las cuatro con el corazón a mil, sin motivo a la vista.",
        "El domingo por la tarde, el estómago ya cerrado por el lunes.",
        "El pecho apretado en mitad de una reunión, y seguir hablando.",
        "Bajarse del metro una parada antes para poder respirar.",
        "Sonreír a la cajera como si nada mientras por dentro todo va a mil.",
        "Buscar síntomas en Google a la una de la madrugada.",
      ],
      closing: "Y después, el \"no será para tanto\" de siempre.",
    },
    reencuadre: {
      kicker: "Tiene una explicación",
      title: "El cuerpo no se lo inventa. Tiene una explicación.",
      paragraphs: [
        "Cuando avisa así, suele ir por delante de algo que todavía no tiene nombre. Aguantar o quitarle importancia no lo explica.",
        "El informe pone por escrito qué hay detrás, desde cuándo y por dónde empezar.",
      ],
    },
    informe: "Qué hay detrás de lo que notas y por dónde empezar.",
    faq: [
      { q: "¿Y si lo que noto es físico?", a: "Si no se ha descartado una causa física, el primer paso es tu médico de cabecera. Lo que pasa en el cuerpo merece una revisión médica antes que nada. Si ya está descartado y sigue pasando, aquí es donde tiene sentido entender qué hay detrás." },
      { q: "¿Y si me cuesta hablar por videollamada?", a: "Es más habitual de lo que parece, y tu psicóloga lo sabe. No hace falta llegar con nada preparado: el test y el informe ya hacen parte del trabajo, así que la sesión no empieza en blanco." },
    ],
    cierreLinea: "9,99€ para entender qué hay detrás.",
    testimonios: ["Andrea V.", "Beatriz F.", "Carlos R.", "Paula S."],
    psicologas: ["adriana-salas", "alejandra-elias", "giovanna-vago", "juliana-urioste", "leidy-vicuna"],
  },
  dependencia: {
    slug: "dependencia",
    seo: {
      title: "Entender cómo te vinculas · Mente Sana",
      ogTitle: "Entender cómo te vinculas · Mente Sana",
      ogDescription: "Un informe firmado por una psicóloga colegiada y 50 minutos con ella para entender de dónde viene el patrón y por dónde empezar. 9,99€, pago único.",
    },
    eyebrow: "Cuando un mensaje decide el día",
    hero: {
      h1: "Cuando un silencio decide cómo va el día entero.",
      sub: "Un informe firmado por una psicóloga colegiada y 50 minutos con ella para entender por qué pesa tanto y por dónde empezar. 9,99€, pago único.",
    },
    espejo: {
      kicker: "Lo que no se cuenta",
      title: "Lo que pasa entre un mensaje y el siguiente.",
      scenes: [
        "Escribir un mensaje, borrarlo y volver a escribirlo.",
        "Doble check, sin respuesta, y la tarde entera pendiente del móvil.",
        "Releer la conversación buscando qué se dijo mal.",
        "El móvil boca arriba en la mesa, por si acaso.",
      ],
      scenes2: {
        intro: "Y para que no se vaya:",
        items: [
          "Decir que sí a planes que no apetecen, para que no se enfade.",
          "Pedir perdón primero, aunque no se sepa muy bien por qué.",
          "Callarse lo que molesta para no discutir.",
        ],
      },
      closing: "Desde fuera parece cariño. Por dentro, agota.",
    },
    reencuadre: {
      kicker: "Tiene un porqué",
      title: "No es cuestión de intensidad. Tiene un porqué.",
      paragraphs: [
        "Y no pasa solo en pareja. A veces es una amistad, a veces la familia. Si se repite con distintas personas, es porque tiene un origen.",
        "El informe explica de dónde viene y por dónde empezar.",
      ],
    },
    informe: "De dónde viene el patrón y por dónde empezar.",
    faq: [
      { q: "¿Es solo para relaciones de pareja?", a: "No. Lo mismo puede pasar con una amistad o con la familia. La sesión parte de lo que más pesa ahora, sea con quien sea." },
      { q: "¿Puedo hacerlo si sigo en la relación?", a: "Sí. No hace falta haber tomado ninguna decisión. Se trata de entender qué está pasando. Lo que hagas después lo decides tú." },
      { q: "¿Y si en la relación hay miedo?", a: "Si hay miedo, control o amenazas, no esperes a la sesión. El 016 atiende 24 horas, todos los días, y no aparece en la factura del teléfono. En una emergencia, llama al 112." },
    ],
    cierreLinea: "9,99€ para entender el porqué.",
    testimonios: ["Tania B.", "Sofía M.", "Diego L.", "Lucía R."],
    psicologas: ["juliana-urioste", "adriana-salas", "leidy-vicuna", "alejandra-elias", "giovanna-vago"],
  },
};

// FAQ fija de la base /por-que-diagnostico (copiada tal cual, marcadas [FIJO] en el brief).
export const FAQ_FIJA: { q: string; a: string }[] = [
  { q: "¿Y si ya he hecho terapia antes y no me funcionó?", a: "Precisamente por eso existe el Diagnóstico. La mayoría de las terapias fallidas empiezan sin un plan claro. Aquí tu psicóloga llega a la primera sesión con tu informe leído y con un plan propuesto. Trabajáis desde algo, no desde cero." },
  { q: "¿Y si no conecto con la psicóloga asignada?", a: "Cambio gratuito, cuando tú quieras, sin dar explicaciones. Tu matching se ajusta y te asignamos otra profesional del equipo." },
  { q: "¿Me van a diagnosticar con algo grave?", a: "No trabajamos con etiquetas asustadoras. Describimos patrones y proponemos trabajo. Si tu caso requiere derivación a un profesional sanitario de mayor complejidad, te lo indicamos honestamente en el informe." },
  { q: "¿Cuánto cuesta después?", a: "Después del diagnóstico, solo si decides continuar: bonos desde 28,75€ por sesión (pack de 8) o sesiones sueltas a 50€. Sin suscripción, sin permanencia." },
  { q: "¿Mi pareja, familia o banco pueden ver que he pagado esto?", a: "El cargo en tu extracto aparece como \"MENTE SANA\" sin más detalle. No mencionamos terapia ni diagnóstico en el concepto." },
  { q: "¿Quién firma el informe? ¿Es generado por IA?", a: "Lo firma una psicóloga senior del equipo, colegiada y habilitada. El sistema estructura la información desde tus respuestas, pero la firma y la validación final son humanas — siempre." },
];

export const PASOS = [
  { n: "01", t: "Respondes 5 preguntas.", d: "2 minutos. Sobre cómo te sientes y qué buscas." },
  { n: "02", t: "Elegimos a tu profesional.", d: "La psicóloga más idónea para tu caso." },
  { n: "03", t: "Eliges día y hora.", d: "Ves su disponibilidad y reservas tu cita." },
  { n: "04", t: "Reservas tu plaza por 9,99€.", d: "Pago único. Sin suscripción." },
  { n: "05", t: "Test en tu correo.", d: "30 preguntas clínicas (PHQ-9, GAD-7, DSM-5). 10-15 min." },
  { n: "06", t: "Asistes y recibes tu diagnóstico.", d: "50 min. Tu psicóloga llega con tu informe leído." },
];

export function esDolor(v: string): v is DolorSlug {
  return v === "ruptura" || v === "ansiedad" || v === "dependencia";
}
