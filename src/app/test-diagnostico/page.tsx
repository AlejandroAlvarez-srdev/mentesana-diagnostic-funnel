import type { Metadata } from "next";
import DiagnosticoMatching from "./DiagnosticoMatching";

export const metadata: Metadata = {
  title: "Encuentra a tu psicóloga ideal — Mente Sana",
  description: "5 preguntas para asignarte la psicóloga más idónea para tu diagnóstico clínico. 2 minutos.",
  robots: { index: false, follow: false },
};

export default function TestMentalHealthPage() {
  return <DiagnosticoMatching />;
}
