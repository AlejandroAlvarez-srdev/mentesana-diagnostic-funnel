import type { Metadata } from "next";
import PorQueDiagnostico from "./PorQueDiagnostico";

export const metadata: Metadata = {
  title: "Diagnóstico Mente Sana 9,99€ — Por qué y cómo funciona | Mente Sana",
  description: "Todo lo que incluye tu Diagnóstico Mente Sana por 9,99€: informe clínico firmado, matching con psicóloga y sesión de 50 min. Comparativa vs primera sesión gratis.",
  alternates: { canonical: "https://mentesanapsicologia.com/por-que-diagnostico" },
  openGraph: {
    title: "Diagnóstico Mente Sana 9,99€ — Por qué y cómo funciona",
    description: "Informe clínico firmado + matching real + sesión 50 min. 9,99€. Con garantía.",
    url: "https://mentesanapsicologia.com/por-que-diagnostico",
    type: "website",
    locale: "es_ES",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Product",
      name: "Diagnóstico Psicológico — Mente Sana",
      description: "Informe clínico personalizado de 5-7 páginas firmado por psicóloga colegiada, matching con la profesional ideal, y sesión de 50 minutos por videollamada.",
      url: "https://mentesanapsicologia.com/por-que-diagnostico",
      brand: { "@type": "Brand", name: "Mente Sana Psicología" },
      offers: {
        "@type": "Offer",
        price: "9.99",
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        priceValidUntil: "2026-12-31",
      },
      aggregateRating: { "@type": "AggregateRating", ratingValue: "4.6", reviewCount: "750", bestRating: "5" },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "¿Y si ya he hecho terapia antes y no me funcionó?", acceptedAnswer: { "@type": "Answer", text: "Precisamente por eso existe el Diagnóstico. La mayoría de las terapias fallidas empiezan sin un plan claro. Aquí tu psicóloga llega a la primera sesión con tu informe leído y con un plan propuesto. Trabajáis desde algo, no desde cero." } },
        { "@type": "Question", name: "¿Y si no conecto con la psicóloga asignada?", acceptedAnswer: { "@type": "Answer", text: "Cambio gratuito, cuando tú quieras, sin dar explicaciones. Tu matching se ajusta y te asignamos otra profesional del equipo." } },
        { "@type": "Question", name: "¿Me van a diagnosticar con algo grave?", acceptedAnswer: { "@type": "Answer", text: "No trabajamos con etiquetas asustadoras. Describimos patrones y proponemos trabajo. Si tu caso requiere derivación a un profesional sanitario de mayor complejidad, te lo indicamos honestamente en el informe." } },
        { "@type": "Question", name: "¿Cuánto cuesta después?", acceptedAnswer: { "@type": "Answer", text: "Después del diagnóstico, solo si decides continuar: bonos desde 23€ por sesión (pack de 8) o sesiones sueltas a 45€. Sin suscripción, sin permanencia." } },
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

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PorQueDiagnostico />
    </>
  );
}
