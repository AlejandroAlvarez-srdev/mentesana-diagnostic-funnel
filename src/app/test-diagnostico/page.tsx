import type { Metadata } from "next";
import DiagnosticoMatching from "./DiagnosticoMatching";
import { PARAM_VARIANTE, precioDe } from "@/lib/diagnostico-precio";

export const metadata: Metadata = {
  title: "Encuentra a tu psicóloga ideal — Mente Sana",
  description: "5 preguntas para asignarte la psicóloga más idónea para tu diagnóstico clínico. 2 minutos.",
  robots: { index: false, follow: false },
};

// El test es COMPARTIDO por las landings de 9,99 € y las de 29,99 €. La variante
// llega en `?p=premium` desde la landing; sin parámetro son 9,99 € de siempre,
// así que ninguna URL existente cambia de comportamiento.
export default async function TestMentalHealthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const p = sp[PARAM_VARIANTE];
  return <DiagnosticoMatching precio={precioDe(Array.isArray(p) ? p[0] : p)} />;
}
