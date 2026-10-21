import type { Metadata } from "next";
import { headers } from "next/headers";
import PorQueDiagnostico from "./PorQueDiagnostico";
import PorQueDiagnosticoB from "./PorQueDiagnosticoB";

export const metadata: Metadata = {
  title: "Cómo funciona un diagnóstico psicológico online — Paso a paso | Mente Sana",
  description: "Qué es un diagnóstico psicológico, qué incluye el informe clínico, cómo se hace el matching con tu psicóloga y qué esperar en la sesión de 50 minutos. Explicado paso a paso.",
  keywords: [
    "cómo funciona diagnóstico psicológico", "qué es un diagnóstico psicológico",
    "qué incluye un informe psicológico", "diagnóstico psicológico paso a paso",
    "qué esperar diagnóstico psicológico", "matching con psicóloga cómo funciona",
    "evaluación psicológica online qué es", "diferencia diagnóstico y terapia",
  ],
  alternates: { canonical: "https://mentesanapsicologia.com/por-que-diagnostico" },
  openGraph: {
    title: "Cómo funciona un diagnóstico psicológico online — Paso a paso",
    description: "Qué es, qué incluye y cómo se hace un diagnóstico psicológico online: informe, matching y sesión de 50 minutos con tu psicóloga.",
    url: "https://mentesanapsicologia.com/por-que-diagnostico",
    type: "article",
    locale: "es_ES", images: [{ url: "https://your-project.supabase.co/storage/v1/object/public/mentesana-images/og/home.jpg", width: 1200, height: 675, alt: "Mente Sana Psicología" }] },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      headline: "Cómo funciona un diagnóstico psicológico online: guía paso a paso",
      description: "Qué es un diagnóstico psicológico, qué incluye el informe clínico, cómo funciona el matching con la psicóloga y qué esperar en la sesión.",
      url: "https://mentesanapsicologia.com/por-que-diagnostico",
      datePublished: "2026-01-15",
      dateModified: "2026-05-16",
      author: { "@type": "Organization", name: "Mente Sana Psicología", url: "https://mentesanapsicologia.com" },
      publisher: { "@id": "https://mentesanapsicologia.com/#organization" },
      inLanguage: "es-ES",
      about: { "@type": "Thing", name: "Diagnóstico psicológico online" },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "¿Y si ya he hecho terapia antes y no me funcionó?", acceptedAnswer: { "@type": "Answer", text: "Precisamente por eso existe el Diagnóstico. La mayoría de las terapias fallidas empiezan sin un plan claro. Aquí tu psicóloga llega a la primera sesión con tu informe leído y con un plan propuesto. Trabajáis desde algo, no desde cero." } },
        { "@type": "Question", name: "¿Y si no conecto con la psicóloga asignada?", acceptedAnswer: { "@type": "Answer", text: "Cambio gratuito, cuando tú quieras, sin dar explicaciones. Tu matching se ajusta y te asignamos otra profesional del equipo." } },
        { "@type": "Question", name: "¿Me van a diagnosticar con algo grave?", acceptedAnswer: { "@type": "Answer", text: "No trabajamos con etiquetas asustadoras. Describimos patrones y proponemos trabajo. Si tu caso requiere derivación a un profesional sanitario de mayor complejidad, te lo indicamos honestamente en el informe." } },
        { "@type": "Question", name: "¿Cuánto cuesta después?", acceptedAnswer: { "@type": "Answer", text: "Después del diagnóstico, solo si decides continuar: bonos desde 28,75€ por sesión (pack de 8) o sesiones sueltas a 50€. Sin suscripción, sin permanencia." } },
        { "@type": "Question", name: "¿Mi pareja, familia o banco pueden ver que he pagado esto?", acceptedAnswer: { "@type": "Answer", text: "El cargo en tu extracto aparece como \"MENTE SANA\" sin más detalle. No mencionamos terapia ni diagnóstico en el concepto." } },
        { "@type": "Question", name: "¿Necesito saber qué me pasa antes de empezar?", acceptedAnswer: { "@type": "Answer", text: "No. Las 5 preguntas están pensadas para personas que no saben explicarse todavía. Nosotros ponemos las palabras — tú solo tienes que responder cómo te sientes." } },
        { "@type": "Question", name: "¿Quién firma el informe? ¿Es generado por IA?", acceptedAnswer: { "@type": "Answer", text: "Lo firma una psicóloga senior del equipo, colegiada y habilitada. El sistema estructura la información desde tus respuestas, pero la firma y la validación final son humanas — siempre." } },
        { "@type": "Question", name: "¿Puedo empezar si nunca he ido al psicólogo?", acceptedAnswer: { "@type": "Answer", text: "Es el momento perfecto. El diagnóstico es justo para quien no ha empezado nunca. No hace falta preparación." } },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: "https://mentesanapsicologia.com" },
        { "@type": "ListItem", position: 2, name: "Por qué el Diagnóstico", item: "https://mentesanapsicologia.com/por-que-diagnostico" },
      ],
    },
  ],
};

export default async function Page() {
  // Variante del A/B test de landing (la fija proxy.ts vía header de request).
  // Bots / sin asignación → "A" (control indexado). El JSON-LD y la metadata son
  // idénticos en ambas variantes → SEO intacto.
  const h = await headers();
  const variant = h.get("x-ab-landing") === "B" ? "B" : "A";
  // A/B #4 "directo" (cookie ms_ab_directo, la fija proxy.ts): en B el botón de la
  // landing salta la portada de /test-diagnostico y entra en la pregunta 1 con
  // ?directo=1. Estudio /interno/subir-el-082: la entrada directa paga 4,4 % por
  // sesión frente al 0,64 % de la portada. En A todo sigue exactamente igual.
  const directo = h.get("x-ab-directo") === "B";
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {variant === "B"
        ? <PorQueDiagnosticoB ctaBase={directo ? "/test-diagnostico?directo=1" : undefined} flow={directo ? "directo" : undefined} />
        : <PorQueDiagnostico />}
    </>
  );
}
