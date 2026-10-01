import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DolorLanding from "./DolorLanding";
import { DOLORES, SITE, esDolor } from "../_data/dolores";

// Landings "por dolor" para pauta (brief Ad Boost 01-oct-2026). Tráfico de pago:
// noindex, follow. Canónica en el dominio de campañas (sesiondecitasms.com).
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(DOLORES).map((dolor) => ({ dolor }));
}

export async function generateMetadata({ params }: { params: Promise<{ dolor: string }> }): Promise<Metadata> {
  const { dolor } = await params;
  if (!esDolor(dolor)) return {};
  const c = DOLORES[dolor];
  const url = `${SITE}/entender/${c.slug}`;
  return {
    title: { absolute: c.seo.title },
    description: c.seo.ogDescription,
    alternates: { canonical: url },
    robots: { index: false, follow: true },
    openGraph: {
      title: c.seo.ogTitle,
      description: c.seo.ogDescription,
      url,
      type: "website",
      locale: "es_ES",
      siteName: "Mente Sana",
      images: [{ url: "https://your-project.supabase.co/storage/v1/object/public/mentesana-images/og/home.jpg", width: 1200, height: 675, alt: "Mente Sana" }],
    },
  };
}

export default async function Page({ params }: { params: Promise<{ dolor: string }> }) {
  const { dolor } = await params;
  if (!esDolor(dolor)) notFound();
  return <DolorLanding cfg={DOLORES[dolor]} />;
}
