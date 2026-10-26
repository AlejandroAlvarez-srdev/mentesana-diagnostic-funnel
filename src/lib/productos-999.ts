/** Logopedia has its own service, appointments and payment processing. */
export const logopediaProduct = {
  id: "logopedia",
  mode: "live",
  priceCents: 999,
  price: "9,99 €",
  durationMinutes: 45,
  durationConfirmed: true,
  ameliaServiceId: 400,
  stripeProductId: null,
  professionalIds: ["maria-alejandra-quintero", "giovanna-vago"],
} as const;

export type LogopediaSegment = "general" | "infantil" | "adultos" | "voz" | "lectoescritura" | "fluidez";
export type LogopediaQuestionId = "para_quien" | "motivo" | "duracion" | "valoracion_previa" | "horario";
export type LogopediaAnswers = Partial<Record<LogopediaQuestionId, string>>;
export const logopediaProfessionals = [
  { id: "maria-alejandra-quintero", providerId: 26129, name: "Logopeda 01", shortName: "Logopeda 01", image: "/images/logopedia/logopeda-01.webp", role: "Logopeda de Mente Sana" },
  { id: "giovanna-vago", providerId: 15, name: "Logopeda 02", shortName: "Logopeda 02", image: "/images/logopedia/logopeda-02.webp", role: "Logopeda de Mente Sana" },
] as const;

export const logopediaQuestionIds: LogopediaQuestionId[] = ["para_quien", "motivo", "duracion", "valoracion_previa", "horario"];
export const isMinor = (answers: LogopediaAnswers) => ["peque", "escolar", "adolescente"].includes(answers.para_quien ?? "");
export const isLogopediaPath = (path: string) => /^\/(?:logopedia|test-logopedia)(?:\/|$)/.test(path);
export const parseLogopediaSegment = (value: string | string[] | undefined): LogopediaSegment =>
  typeof value === "string" && ["infantil", "adultos", "voz", "lectoescritura", "fluidez"].includes(value) ? value as LogopediaSegment : "general";

export function getLogopediaQuestion(id: LogopediaQuestionId, answers: LogopediaAnswers) {
  const minor = isMinor(answers);
  const questions = {
    para_quien: { title: "¿Para quién es este primer paso?", hint: "Cada edad tiene su forma de comunicarse. Empecemos por ahí.", options: [
      ["peque", "Para mi peque", "De 2 a 5 años"], ["escolar", "Para mi hijo o hija", "De 6 a 12 años"], ["adolescente", "Para un adolescente", "De 13 a 17 años"], ["adulto", "Para una persona adulta", "De 18 a 64 años"], ["mayor", "Para una persona mayor", "65 años o más"],
    ] },
    motivo: { title: minor ? "¿Qué te gustaría entender mejor?" : "¿En qué te gustaría recibir ayuda?", hint: "No necesitas saber cómo se llama. Elige lo que más se acerque.", options: [
      ["habla", minor ? "Le cuesta pronunciar algunos sonidos" : "Mi pronunciación o claridad al hablar", "Habla"],
      ["lenguaje", minor ? "Le cuesta expresarse o entender" : "Encontrar palabras o comprender", "Lenguaje"],
      ["lectoescritura", minor ? "La lectura o la escritura le cuestan" : "La lectura o la escritura", "Lectoescritura"],
      ["fluidez", minor ? "Se bloquea o repite al hablar" : "Me bloqueo o repito al hablar", "Fluidez"],
      ["voz", minor ? "Su voz se cansa o cambia" : "Mi voz se cansa o cambia", "Voz"],
      ["deglucion", "Dificultades al tragar", "Puede necesitar atención presencial"],
      ["neuro", "Cambios tras una enfermedad o lesión", "Orientación sobre los siguientes pasos"],
      ["otro", "No lo tengo claro todavía", "También podemos empezar aquí"],
    ] },
    duracion: { title: "¿Desde cuándo lo notas?", hint: "Una aproximación está bien.", options: [["dias", "Hace unos días", ""], ["semanas", "Hace unas semanas", ""], ["meses", "Hace unos meses", ""], ["anios", "Hace años", ""], ["no_se", "No sabría decirlo", ""]] },
    valoracion_previa: { title: "¿Lo habéis consultado antes?", hint: "No hace falta tener un informe para dar este primer paso.", options: [["nadie", "Es la primera vez", ""], ["pediatra_o_cole", "Lo hemos hablado con un médico o en el colegio", ""], ["diagnostico", "Ya existe una valoración o diagnóstico", ""], ["logopedia_antes", "Ya hemos hecho logopedia", ""]] },
    horario: { title: "¿Qué momento encaja mejor?", hint: "Después podrás consultar la agenda y elegir día y hora.", options: [["manana", "Por la mañana", "Antes de las 14:00"], ["tarde", "Por la tarde", "Desde las 14:00"], ["flexible", "Tengo flexibilidad", "Me adapto al horario"]] },
  };
  return questions[id];
}

export type LogopediaLandingContent = {
  eyebrow: string; title: string; accent: string; description: string; image: "infantil" | "adultos" | "voz" | "lectoescritura" | "fluidez";
  photoAlt: string; handwritten: string; concernTitle: string; concernIntro: string;
  concerns: { title: string; text: string; icon: "speech" | "book" | "wave" }[];
};
export const logopediaLandings: Record<LogopediaSegment, LogopediaLandingContent> = {
  general: {
    eyebrow: "LOGOPEDIA ONLINE · MENTE SANA", title: "Lo que quieres decir", accent: "merece su espacio.",
    description: "Para tu peque, para ti, para esa voz que usas cada día. Un primer encuentro para entender qué está pasando y cómo acompañarte.",
    image: "infantil", photoAlt: "Escena ilustrativa de una madre y su hijo compartiendo un juego de palabras en casa", handwritten: "A tu ritmo. Con tu voz.",
    concernTitle: "No hace falta saber cómo se llama.", concernIntro: "A veces solo sabes que algo cuesta. Ese ya es un buen lugar para empezar.",
    concerns: [{ title: "Las palabras no salen como quisieras", text: "Pronunciar, expresarse o entender puede necesitar un poco de acompañamiento.", icon: "speech" }, { title: "Leer o escribir se hace cuesta arriba", text: "Ponemos atención a lo que cuesta, sin convertirlo en una etiqueta.", icon: "book" }, { title: "Hablar te supone un esfuerzo", text: "Bloqueos, cambios en la voz o cansancio al usarla: hay espacio para escucharlo.", icon: "wave" }],
  },
  infantil: {
    eyebrow: "LOGOPEDIA INFANTIL · EN FAMILIA", title: "Tiene mucho", accent: "que contarte.",
    description: "Si a tu peque le cuesta hablar, expresarse o leer, no tienes que resolverlo a solas. Empezamos escuchándote y conociendo su forma de comunicarse.",
    image: "infantil", photoAlt: "Escena ilustrativa de una madre y su hijo jugando con tarjetas de animales junto a un portátil", handwritten: "Sin comparaciones. Con cariño.",
    concernTitle: "Quizá alguna de estas escenas te suena.", concernIntro: "Cada peque tiene su historia. La primera valoración sirve para conocer la vuestra.",
    concerns: [{ title: "Tú le entiendes. Otros, no siempre", text: "Hay sonidos o palabras que le cuestan y quieres saber cómo acompañarle.", icon: "speech" }, { title: "Los deberes terminan en frustración", text: "Leer o escribir le supone mucho esfuerzo. Quieres comprender qué necesita.", icon: "book" }, { title: "Tiene algo que decir, pero se bloquea", text: "Repite, se atasca o evita algunas palabras. Podemos escucharos sin prisas.", icon: "wave" }],
  },
  lectoescritura: {
    eyebrow: "LOGOPEDIA · LECTURA Y ESCRITURA", title: "Leer no debería ser", accent: "una pelea cada tarde.",
    description: "Cuando las letras se convierten en esfuerzo, una primera valoración ayuda a entender qué cuesta y cómo acompañar. Sin culpas. Sin poner etiquetas antes de conocer su historia.",
    image: "lectoescritura", photoAlt: "Escena ilustrativa de una madre acompañando a su hija con un libro en casa", handwritten: "Menos presión. Más comprensión.",
    concernTitle: "Detrás de un «no quiero leer» puede haber mucho.", concernIntro: "El esfuerzo no siempre se ve en la nota. Empecemos por escuchar lo que ocurre en casa y en el colegio.",
    concerns: [{title:"Cada página cuesta mucho",text:"Leer despacio, perder el hilo o evitar la lectura puede generar preguntas. Las ponemos en contexto.",icon:"book"},{title:"Escribir termina en frustración",text:"Quieres entender qué hace difíciles las tareas y cómo acompañar sin convertir cada tarde en una discusión.",icon:"speech"},{title:"El colegio os ha dado una pista",text:"Una observación o un informe puede ser el punto de partida. No necesitas tener un diagnóstico para consultar.",icon:"book"}],
  },
  fluidez: {
    eyebrow: "LOGOPEDIA · TARTAMUDEZ Y FLUIDEZ", title: "Lo que tienes que decir", accent: "merece tiempo.",
    description: "Un espacio para hablar de las repeticiones, los bloqueos y lo que se siente al comunicarse. Para peques, adolescentes y adultos, con una primera orientación adaptada a cada historia.",
    image: "fluidez", photoAlt: "Escena ilustrativa de dos personas conversando sin prisa en un espacio tranquilo", handwritten: "Te escuchamos. Sin completar tus frases.",
    concernTitle: "La conversación también necesita espacio.", concernIntro: "No buscamos que hables de una única manera. Empezamos por entender tu experiencia.",
    concerns: [{title:"Hay palabras que se atascan",text:"Repeticiones, pausas o bloqueos que quieres comprender con acompañamiento profesional.",icon:"speech"},{title:"A veces es más fácil callar",text:"Las situaciones al hablar también importan. Puedes contar qué ocurre sin sentir que tienes que demostrar nada.",icon:"wave"},{title:"Quieres acompañar mejor",text:"Si consultas por tu hijo o hija, la primera sesión también es un espacio para las preguntas de la familia.",icon:"book"}],
  },
  adultos: {
    eyebrow: "LOGOPEDIA PARA ADULTOS", title: "Volver a expresarte", accent: "a tu manera.",
    description: "Cuando hablar, encontrar las palabras o comunicarte se vuelve difícil, un primer encuentro puede ayudarte a entender por dónde empezar.",
    image: "adultos", photoAlt: "Escena ilustrativa de un hombre adulto conversando por videollamada en su casa", handwritten: "Tu historia también importa.",
    concernTitle: "Para lo que ha cambiado. Y lo que siempre ha costado.", concernIntro: "No tienes que llegar con una explicación. Empezamos por lo que notas en tu día a día.",
    concerns: [{ title: "Las palabras se resisten", text: "Te cuesta encontrar la palabra, articularla o seguir una conversación.", icon: "speech" }, { title: "Comunicarte exige más esfuerzo", text: "Leer, escribir o entender ciertos mensajes ya no resulta igual de sencillo.", icon: "book" }, { title: "Algo cambió después de una lesión", text: "Una primera orientación para valorar tus necesidades y el tipo de atención adecuado.", icon: "wave" }],
  },
  voz: {
    eyebrow: "LOGOPEDIA PARA TU VOZ", title: "Tu voz te acompaña.", accent: "Cuídala también.",
    description: "Das clase, cantas, atiendes a personas o simplemente quieres hablar con menos esfuerzo. Empezamos por escuchar cómo usas tu voz y qué te preocupa.",
    image: "voz", photoAlt: "Escena ilustrativa de una mujer junto a un micrófono y un portátil en un espacio de trabajo tranquilo", handwritten: "Una voz muy tuya.",
    concernTitle: "Cuando tu voz pide una pausa.", concernIntro: "No se trata de sonar como otra persona. Se trata de entender lo que necesita tu voz.",
    concerns: [{ title: "Tu voz se agota antes que tu día", text: "Tras hablar durante horas, notas fatiga o esfuerzo y quieres saber cómo cuidarte.", icon: "wave" }, { title: "La notas distinta", text: "Cambios, ronquera o molestias que merecen una valoración y, si procede, derivación médica.", icon: "speech" }, { title: "La voz es parte de tu trabajo", text: "Quieres revisar tus hábitos y recibir orientación adaptada al uso que haces de ella.", icon: "book" }],
  },
};
