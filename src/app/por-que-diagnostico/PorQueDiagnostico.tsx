"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";
import PressLogos from "@/components/PressLogos";
import CelebrityPhoto from "@/components/CelebrityPhoto";
import { CELEBRITIES, MENTESANA_BY_CCAA } from "@/lib/spain-celebrities-data";
import { track } from "@/lib/tracking";

const PSICOLOGAS = [
  { name: "Adriana Salas", spec: "Ansiedad", col: "M-28456", years: 10, video: "/videos/welcome/adriana-salas.mp4" },
  { name: "Laura Acosta", spec: "Depresión · TCC", col: "M-29745", years: 12, video: "/videos/welcome/laura-acosta-acosta.mp4" },
  { name: "Diana Salazar", spec: "Autoestima · TCA", col: "M-31204", years: 11, video: "/videos/welcome/diana-salazar-alzate.mp4" },
  { name: "Alexandra Elías", spec: "Trauma · EMDR", col: "B-19872", years: 9, video: "/videos/welcome/alexandra-elias.mp4" },
];

const PASOS = [
  { n: "1", icon: "📝", title: "Respondes 5 preguntas", desc: "2 minutos. Sobre cómo te sientes y qué buscas." },
  { n: "2", icon: "🎯", title: "Elegimos a tu profesional", desc: "La psicóloga más idónea para tu caso." },
  { n: "3", icon: "📅", title: "Eliges cuándo recibir tu diagnóstico", desc: "Escoges el día y hora de la sesión donde te entregan el informe." },
  { n: "4", icon: "💳", title: "Pagas 9,99€", desc: "Pago único. Devolución garantizada." },
  { n: "5", icon: "📧", title: "Test en tu correo", desc: "30 preguntas clínicas (PHQ-9, GAD-7, DSM-5). 10-15 min." },
  { n: "6", icon: "💬", title: "Asistes y recibes tu diagnóstico", desc: "50 min. Tu psicóloga llega con tu informe leído." },
];

const IMG_CDN = "https://your-project.supabase.co/storage/v1/object/public/mentesana-images/reviews";
const VIDEO_CDN = "https://your-project.supabase.co/storage/v1/object/public/mentesana-videos/testimonios";
const REVIEW_IMAGES = Array.from({ length: 11 }, (_, i) => `${IMG_CDN}/review-${i + 1}.webp`);
const TESTIMONIO_VIDEOS = Array.from({ length: 6 }, (_, i) => `${VIDEO_CDN}/testimonio-sesion-${i + 1}.mp4`);

const CASOS_REALES = [
  {
    name: "María",
    age: 34,
    city: "Madrid",
    topic: "Ansiedad generalizada",
    before: "3 años con ataques de pánico semanales. Medicación sin terapia. Aislada.",
    after: "12 sesiones. Ataques desaparecieron. 8 meses sin crisis.",
    quote: "Ojalá hubiera empezado antes. Mi psicóloga me dio herramientas que la medicación sola no pudo darme.",
  },
  {
    name: "Laura",
    age: 28,
    city: "Barcelona",
    topic: "Depresión y baja autoestima",
    before: "Tras una ruptura, dejó de salir de casa. 6 meses de insomnio y llanto constante.",
    after: "8 sesiones. Volvió a dormir, retomó deporte, encontró nuevo trabajo.",
    quote: "Mente Sana me devolvió las ganas de vivir. El seguimiento por WhatsApp entre sesiones fue clave.",
  },
  {
    name: "Carmen",
    age: 41,
    city: "Valencia",
    topic: "Burnout y ataques de pánico",
    before: "Directiva con 60h semanales. Dolor de pecho, insomnio, ataque en reunión.",
    after: "4 meses. EMDR + mindfulness. Pidió reducción de jornada. Sin ataques.",
    quote: "Nadie en mi entorno sabía que iba al psicólogo. La terapia online me dio la privacidad que necesitaba.",
  },
  {
    name: "Ana y Pedro",
    age: 37,
    city: "Sevilla",
    topic: "Crisis de pareja",
    before: "8 años juntos, 2 hijos, al borde del divorcio tras una infidelidad.",
    after: "20 sesiones. Comunicación y confianza reconstruidas. Siguen juntos.",
    quote: "La psicóloga no tomó partido. Nos ayudó a entender qué había debajo. Salvamos nuestra familia.",
  },
];

function PsychVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          if (!el.src) el.src = src;
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      });
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [src]);
  return (
    <video ref={ref} muted loop playsInline preload="none" className="absolute inset-0 w-full h-full object-cover" />
  );
}

function AvatarVideo({ src, size = "md", className = "" }: { src: string; size?: "xs" | "sm" | "md" | "lg"; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          if (!el.src) el.src = src;
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      });
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [src]);
  const sizeCls =
    size === "xs" ? "w-16 h-16"
    : size === "sm" ? "w-11 h-11"
    : size === "lg" ? "w-28 h-28 md:w-32 md:h-32"
    : "w-20 h-20 md:w-24 md:h-24";
  return (
    <div className={`relative ${sizeCls} rounded-full overflow-hidden ${className}`}>
      <video ref={ref} muted loop playsInline preload="none" className="absolute inset-0 w-full h-full object-cover" />
    </div>
  );
}

function TestimonioVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [unmuted, setUnmuted] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          if (!el.src) el.src = src;
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      });
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [src]);
  const toggleSound = () => {
    const el = ref.current;
    if (!el) return;
    el.muted = unmuted;
    setUnmuted(!unmuted);
    el.play().catch(() => {});
  };
  return (
    <button onClick={toggleSound} aria-label={unmuted ? "Silenciar" : "Activar sonido"} className="relative aspect-[9/16] w-full rounded-2xl overflow-hidden bg-black/80 group">
      <video ref={ref} autoPlay muted loop playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center text-white text-sm group-hover:bg-black/75 transition">
        {unmuted ? "🔊" : "🔈"}
      </div>
    </button>
  );
}

const FAQ = [
  { q: "¿Es una suscripción?", a: "No. Es un pago único de 9,99€. Sin suscripción, sin permanencia, sin renovación automática. Si decides continuar después del diagnóstico, escoges tú qué bono comprar." },
  { q: "¿Y si no conecto con la psicóloga?", a: "Cambio gratuito, cuando tú quieras, sin dar explicaciones. Tu matching se reajusta y te asignamos otra profesional del equipo de +150 psicólogas colegiadas." },
  { q: "¿Cuánto cuesta después?", a: "Solo si decides continuar: bonos desde 23€/sesión (pack de 8) o sesiones sueltas a 45€. Sin suscripción ni permanencia. El informe es tuyo hagas lo que hagas." },
];

const COMPARATIVA = [
  { label: "Coste inicial", diag: "9,99€", gratis: "0€" },
  { label: "Matching", diag: "Algorítmico clínico", gratis: "Al azar" },
  { label: "Informe clínico", diag: "✓ 5-7 páginas", gratis: "✗" },
  { label: "Duración de la sesión", diag: "50 min", gratis: "15-25 min" },
  { label: "Objetivo real", diag: "Entenderte", gratis: "Vender sesiones" },
  { label: "Llega con tu info leída", diag: "✓", gratis: "✗" },
  { label: "Plan concreto", diag: "✓ Desde sesión 1", gratis: "Raramente" },
  { label: "Cambio de psicóloga", diag: "✓ Gratis", gratis: "Vuelves a empezar" },
];

export default function PorQueDiagnostico() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showStickyCTA, setShowStickyCTA] = useState(false);

  useEffect(() => {
    track("view_intermediate_landing", {
      source: new URLSearchParams(window.location.search).get("utm_source") || "direct",
    });

    const fired = { 25: false, 50: false, 75: false, 100: false };
    function onScroll() {
      const h = document.body.scrollHeight - window.innerHeight;
      if (h <= 0) return;
      const pct = window.scrollY / h;
      ([25, 50, 75, 100] as const).forEach((mark) => {
        const threshold = mark === 100 ? 0.95 : mark / 100;
        if (pct >= threshold && !fired[mark]) {
          fired[mark] = true;
          track(`scroll_depth_${mark}`, { page: "por-que-diagnostico" });
        }
      });
      const pastHero = window.scrollY > window.innerHeight * 0.8;
      const finalCTA = document.getElementById("cta-final");
      const inFinal = finalCTA ? finalCTA.getBoundingClientRect().top < window.innerHeight : false;
      setShowStickyCTA(pastHero && !inFinal);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function ctaHref(base: string) {
    if (typeof window === "undefined") return base;
    const params = new URLSearchParams(window.location.search);
    const keep = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    const qs = keep.filter((k) => params.get(k)).map((k) => `${k}=${encodeURIComponent(params.get(k)!)}`).join("&");
    return qs ? `${base}?${qs}` : base;
  }

  const handleCTA = (position: string) => track("click_cta_intermediate", { position });

  const toggleFaq = (i: number) => {
    const next = openFaq === i ? null : i;
    setOpenFaq(next);
    if (next !== null) track("faq_expand", { index: i, question: FAQ[i].q });
  };

  const CTA_HREF = "/test-diagnostico";

  return (
    <>
      <main className="bg-[#FFFAF2] min-h-screen">

        {/* ═══════════ HERO ═══════════ */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#1a0a1f] via-[#2d0d3f] to-[#4A2368] text-white pt-16 pb-14 md:pt-24 md:pb-20">
          <div className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(circle at 25% 30%, rgba(201,169,209,.35), transparent 45%), radial-gradient(circle at 75% 70%, rgba(139,47,181,.45), transparent 55%)" }} />
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#6A178C] opacity-20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-[#8B2FB5] opacity-20 blur-3xl pointer-events-none" />

          {/* Mockup informe flotante — solo desktop */}
          <div className="hidden lg:block absolute top-20 right-8 xl:right-16 z-10 pointer-events-none rotate-6">
            <div className="relative bg-white rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] p-3 w-[180px]">
              <div className="absolute -top-2 -left-2 bg-[#6A178C] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md">Tu informe</div>
              <div className="border-b border-black/5 pb-2 mb-2 flex items-center justify-between">
                <Image src="/images/logo.webp" alt="" width={50} height={10} className="h-2.5 w-auto opacity-50" />
                <span className="text-[7px] text-black/30 uppercase tracking-wider font-bold">Clínico</span>
              </div>
              <div className="mb-2">
                <p className="text-[7px] text-black/40 uppercase tracking-wider">Paciente</p>
                <div className="h-2 bg-[#6A178C]/10 rounded w-1/2 mt-0.5" />
              </div>
              <div className="p-2 bg-gradient-to-r from-[#6A178C]/5 to-[#6A178C]/10 rounded-lg border border-[#6A178C]/10 mb-2">
                <p className="text-[7px] font-bold text-[#6A178C] mb-1.5">🧠 Perfil emocional</p>
                <div className="space-y-1">
                  <div className="h-1.5 bg-[#6A178C]/30 rounded-full" style={{ width: "78%" }} />
                  <div className="h-1.5 bg-[#6A178C]/20 rounded-full" style={{ width: "45%" }} />
                  <div className="h-1.5 bg-[#6A178C]/15 rounded-full" style={{ width: "30%" }} />
                </div>
              </div>
              <div className="p-2 bg-green-50/80 rounded-lg border border-green-100 mb-2">
                <p className="text-[7px] font-bold text-green-700 mb-1">✓ Plan</p>
                <div className="space-y-0.5">
                  <div className="h-1.5 bg-green-100 rounded w-full" />
                  <div className="h-1.5 bg-green-100 rounded w-5/6" />
                </div>
              </div>
              <div className="pt-2 border-t border-black/5 flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-[#6A178C]/10 border border-[#6A178C]/20" />
                <div>
                  <p className="text-[7px] font-bold text-black/70">Firmado</p>
                  <p className="text-[6px] text-black/40">Col. M-28456</p>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 relative text-center">
            <h1 className="font-serif text-[2rem] md:text-5xl lg:text-6xl leading-[1.12] max-w-4xl mx-auto">
              No estás perdida:<br />
              <em className="italic text-[#E8D4F0] font-normal">lo que sientes tiene nombre y solución.</em>
            </h1>
            <p className="mt-6 md:mt-8 text-base md:text-xl text-white/80 leading-relaxed max-w-2xl mx-auto">
              Una experiencia guiada para entender tu situación y saber exactamente qué necesitas. Esta es la mejor forma de empezar terapia: recibe tu evaluación en una sesión completa de 50 minutos con tu psicóloga match.
            </p>

            {/* Trustpilot pill (debajo, como prueba no como gancho) */}
            <a href="https://es.trustpilot.com/review/mentesanapsicologia.com" target="_blank" rel="noopener nofollow"
              className="mt-6 inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-xs md:text-sm hover:bg-white/15 transition">
              <span className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="h-3.5 w-3.5 text-[#00b67a]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </span>
              <span className="font-bold">4,6 · Trustpilot</span>
              <span className="text-white/60">+750 reseñas verificadas</span>
            </a>

            <div className="mt-10 flex flex-col items-center gap-3">
              <Link href={ctaHref(CTA_HREF)} onClick={() => handleCTA("hero")}
                className="bg-white text-[#4A2368] font-bold rounded-full px-10 py-4 text-base md:text-lg hover:-translate-y-0.5 transition-all shadow-[0_10px_40px_rgba(255,255,255,.25)]">
                Recibir mi diagnóstico · 9,99€ →
              </Link>
              <div className="inline-flex items-center gap-2 bg-amber-400/[0.12] border border-amber-300/25 px-3 py-1.5 rounded-full text-[11px] md:text-xs text-amber-100">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(252,211,77,.8)]" />
                <span><strong className="text-white">Solo 6 plazas</strong> de diagnóstico esta semana</span>
              </div>
              <p className="text-xs text-white/55">Pago único · Sin suscripción · Con garantía</p>
            </div>

            {/* Avatar stack */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <div className="flex -space-x-3">
                {PSICOLOGAS.map((p) => (
                  <div key={p.name} className="ring-2 ring-[#2d0d3f] rounded-full">
                    <AvatarVideo src={p.video} size="sm" />
                  </div>
                ))}
                <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur border-2 border-[#2d0d3f] flex items-center justify-center text-[11px] font-bold text-white">
                  +150
                </div>
              </div>
              <p className="text-sm text-white/80 text-left leading-tight">+150 psicólogas<br /><span className="text-xs text-white/55">colegiadas</span></p>
            </div>

            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-3xl mx-auto">
              <div className="bg-white/[0.07] border border-white/[0.12] rounded-2xl px-4 py-4 text-left">
                <p className="font-serif text-3xl text-[#E8D4F0]">+8.000</p>
                <p className="text-xs text-white/70 mt-1 leading-snug">pacientes atendidos</p>
              </div>
              <div className="bg-white/[0.07] border border-white/[0.12] rounded-2xl px-4 py-4 text-left">
                <p className="font-serif text-3xl text-[#E8D4F0]">4,6<span className="text-base">/5</span></p>
                <p className="text-xs text-white/70 mt-1 leading-snug">Trustpilot · 750 reseñas</p>
              </div>
              <div className="bg-white/[0.07] border border-white/[0.12] rounded-2xl px-4 py-4 text-left">
                <p className="font-serif text-3xl text-[#E8D4F0]">94%</p>
                <p className="text-xs text-white/70 mt-1 leading-snug">mejora en el 1er mes</p>
              </div>
              <div className="bg-white/[0.07] border border-white/[0.12] rounded-2xl px-4 py-4 text-left">
                <p className="font-serif text-3xl text-[#E8D4F0]">73%</p>
                <p className="text-xs text-white/70 mt-1 leading-snug">adherencia post-diagnóstico</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ TRUSTPILOT STRIP ═══════════ */}
        <section className="bg-white border-b border-black/5 py-6 md:py-8 px-4">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            <a href="https://es.trustpilot.com/review/mentesanapsicologia.com" target="_blank" rel="noopener nofollow"
              className="flex items-center gap-3 hover:opacity-80 transition">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="h-5 w-5 text-[#00b67a]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <div className="text-left">
                <p className="text-2xl font-bold leading-tight">4,6<span className="text-base text-black/40">/5</span></p>
                <p className="text-[11px] text-black/50 leading-tight">+750 opiniones · <span className="font-semibold text-[#00b67a]">Excelente</span></p>
              </div>
            </a>
            <div className="hidden md:block h-12 w-px bg-black/10" />
            <div className="text-left">
              <p className="text-2xl font-bold leading-tight">+8.000</p>
              <p className="text-[11px] text-black/50 leading-tight">pacientes en España</p>
            </div>
            <div className="hidden md:block h-12 w-px bg-black/10" />
            <div className="text-left">
              <p className="text-2xl font-bold leading-tight">+150</p>
              <p className="text-[11px] text-black/50 leading-tight">psicólogas colegiadas</p>
            </div>
            <div className="hidden md:block h-12 w-px bg-black/10" />
            <div className="text-left">
              <p className="text-2xl font-bold leading-tight">48h</p>
              <p className="text-[11px] text-black/50 leading-tight">para recibir tu diagnóstico</p>
            </div>
          </div>
        </section>

        {/* ═══════════ MANIFIESTO ═══════════ */}
        <section className="py-20 md:py-28 px-4 bg-[#FFFAF2] relative overflow-hidden">
          <div className="absolute top-12 left-6 text-[14rem] md:text-[22rem] font-serif text-[#6A178C]/[0.04] leading-none select-none pointer-events-none">&ldquo;</div>
          <div className="max-w-5xl mx-auto relative">
            <p className="font-handwriting text-xl text-[#6A178C] mb-3 text-center">carta abierta del CEO</p>
            <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.12] text-black mb-10 text-center max-w-3xl mx-auto">
              No escribimos para venderte.<br />
              Escribimos para <em className="italic text-[#6A178C]">no perderte</em>.
            </h2>

            <div className="grid md:grid-cols-[260px_1fr] gap-8 md:gap-10 items-center">
              <div className="rounded-2xl overflow-hidden bg-black shadow-xl w-[220px] md:w-[260px] mx-auto md:mx-0 aspect-[9/16]">
                <video
                  src="https://your-project.supabase.co/storage/v1/object/public/mentesana-videos/ceo-podcast-clip7.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster="/images/team/alejandro-ceo.avif"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-4 text-[15px] md:text-lg text-black/80 leading-[1.7] font-serif">
                <p>
                  Hola. Soy <strong className="text-black">Alejandro Pérez, CEO de Mente Sana</strong>. Esto lo escribo yo, no un copywriter.
                </p>
                <p>
                  La &ldquo;primera sesión gratis&rdquo; de otras plataformas tiene truco: te asignan a cualquiera y te venden un bono. <strong>El 60% abandona antes de la cuarta sesión</strong>.
                </p>
                <p>
                  Por eso cobramos 9,99€. No porque el informe + sesión cuesten eso (cuestan 130€ de nuestro lado), sino porque <strong className="bg-[#E8D4F0]/50 px-1">filtra a quien viene a empezar de verdad</strong>.
                </p>
                <p className="text-black font-semibold">
                  Si no te ayudamos, te devolvemos los 9,99€ y te recomendamos otra plataforma por email. Firmado por mí.
                </p>

                <div className="pt-5 border-t border-black/10 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-serif text-base text-black leading-tight">Alejandro Pérez</p>
                    <p className="text-[11px] text-black/55">CEO · Mente Sana</p>
                  </div>
                  <p className="font-handwriting text-[#6A178C] text-2xl md:text-3xl -rotate-2">— firmado de verdad</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ PASOS ═══════════ */}
        <section className="py-14 md:py-20 px-4 bg-[#FFFAF2]">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">así funciona</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black">6 pasos hasta tu diagnóstico</h2>
            </div>

            <div className="relative">
              <div className="absolute left-[22px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-[#6A178C]/30 via-[#6A178C]/20 to-[#6A178C]/10" />
              {PASOS.map((step) => (
                <div key={step.n} className="flex items-start gap-4 py-2.5 relative">
                  <div className="relative z-10 w-11 h-11 rounded-full bg-[#6A178C] text-white flex items-center justify-center text-lg shrink-0 shadow-lg shadow-[#6A178C]/25">
                    {step.icon}
                  </div>
                  <div className="pt-1.5">
                    <p className="font-serif text-base md:text-lg text-black leading-tight">
                      <span className="text-black/40 mr-1.5 font-sans text-sm">{step.n}.</span>{step.title}
                    </p>
                    <p className="text-[13px] text-black/65 mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ VIDEO TESTIMONIALS ═══════════ */}
        <section className="py-16 md:py-20 px-4 bg-white border-y border-black/5">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">voces reales</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black">Pacientes contando su proceso</h2>
              <p className="mt-3 text-base text-black/60 max-w-xl mx-auto">Sin guion. Sin pagarles. Pulsa en cada vídeo para escucharlos.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
              {TESTIMONIO_VIDEOS.map((src) => (
                <TestimonioVideo key={src} src={src} />
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ COMPARATIVA ═══════════ */}
        <section className="py-20 md:py-24 bg-gradient-to-br from-[#2A0F47] via-[#4A2368] to-[#6E3F88] text-white">
          <div className="max-w-5xl mx-auto px-4">
            <p className="inline-flex items-center gap-1.5 bg-white/[0.08] border border-white/[0.18] text-[#F5F0F7] px-3 py-1.5 rounded-full text-xs w-fit mx-auto">
              La diferencia real
            </p>
            <h2 className="font-serif text-3xl md:text-4xl text-center mt-4 max-w-3xl mx-auto leading-tight">
              Diagnóstico Mente Sana vs primera sesión gratis.
            </h2>

            <div className="mt-14 max-w-3xl mx-auto bg-white/[0.06] border border-white/[0.12] rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-3 md:px-4 text-[10px] md:text-xs uppercase tracking-wider text-white/50"></th>
                    <th className="text-center py-3 px-2 md:px-4 text-[10px] md:text-xs uppercase tracking-wider text-[#D7B8E3] font-bold">
                      Mente Sana<br />
                      <span className="text-white/60 font-normal normal-case tracking-normal text-[10px]">9,99€</span>
                    </th>
                    <th className="text-center py-3 px-2 md:px-4 text-[10px] md:text-xs uppercase tracking-wider text-white/40">
                      Sesión gratis<br />
                      <span className="text-white/30 font-normal normal-case tracking-normal text-[10px]">otras plataformas</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARATIVA.map((r) => (
                    <tr key={r.label} className="border-b border-white/5 last:border-b-0">
                      <td className="py-3 px-3 md:px-4 text-white/70 font-medium text-[12px] md:text-[13px]">{r.label}</td>
                      <td className="py-3 px-2 md:px-4 text-center text-[#D7B8E3] font-bold text-[12px] md:text-[13px]">{r.diag}</td>
                      <td className="py-3 px-2 md:px-4 text-center text-white/30 text-[12px] md:text-[13px]">{r.gratis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ═══════════ TRUSTPILOT REVIEWS MASONRY ═══════════ */}
        <section className="py-16 md:py-20 px-4 bg-[#FFFAF2]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">opiniones verificadas</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black">Lo que cuentan en Trustpilot</h2>
              <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-bold">4,6</span>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="h-4 w-4 text-[#00b67a]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <span className="text-sm text-black/50">+750 opiniones reales</span>
              </div>
            </div>

            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
              {REVIEW_IMAGES.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt={`Opinión Trustpilot ${i + 1}`}
                  loading="lazy"
                  className="w-full rounded-xl border border-black/5 shadow-sm break-inside-avoid"
                />
              ))}
            </div>

            <div className="mt-10 text-center">
              <a href="https://es.trustpilot.com/review/mentesanapsicologia.com" target="_blank" rel="noopener nofollow"
                className="inline-flex items-center gap-2 text-sm text-[#6A178C] font-semibold hover:underline">
                Ver las 750+ opiniones en Trustpilot →
              </a>
            </div>
          </div>
        </section>

        {/* ═══════════ TRES RAZONES ═══════════ */}
        <section className="py-16 md:py-20 px-4 bg-[#FAF7F2]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">por qué 9,99€ y no gratis</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black">Tres razones honestas</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5 md:gap-6">
              <div className="bg-white rounded-3xl p-7 md:p-8 border border-black/5 shadow-[0_10px_40px_rgba(106,23,140,.06)]">
                <div className="w-12 h-12 rounded-2xl bg-[#6A178C]/10 flex items-center justify-center text-[#6A178C] font-serif text-xl font-bold mb-5">1</div>
                <h3 className="font-serif text-2xl text-black mb-3">Es un filtro</h3>
                <p className="text-sm text-black/70 leading-relaxed">Quien paga 9,99€ es quien quiere empezar de verdad. No un clic de curiosidad. Nuestras psicólogas trabajan con personas comprometidas, no con tráfico.</p>
              </div>
              <div className="bg-white rounded-3xl p-7 md:p-8 border border-black/5 shadow-[0_10px_40px_rgba(106,23,140,.06)]">
                <div className="w-12 h-12 rounded-2xl bg-[#6A178C]/10 flex items-center justify-center text-[#6A178C] font-serif text-xl font-bold mb-5">2</div>
                <h3 className="font-serif text-2xl text-black mb-3">Recibes un entregable</h3>
                <p className="text-sm text-black/70 leading-relaxed">Un informe clínico de 5-7 páginas firmado por tu psicóloga colegiada. Lo tienes tú, lo relees cuando quieras y es tuyo hagas lo que hagas después.</p>
              </div>
              <div className="bg-white rounded-3xl p-7 md:p-8 border border-black/5 shadow-[0_10px_40px_rgba(106,23,140,.06)]">
                <div className="w-12 h-12 rounded-2xl bg-[#6A178C]/10 flex items-center justify-center text-[#6A178C] font-serif text-xl font-bold mb-5">3</div>
                <h3 className="font-serif text-2xl text-black mb-3">Evitas la ruleta</h3>
                <p className="text-sm text-black/70 leading-relaxed">El matching algorítmico te conecta con la psicóloga adecuada. No la primera disponible. Por eso el 73% de quien hace el diagnóstico sigue en terapia después.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ PSICÓLOGAS ═══════════ */}
        <section className="py-16 md:py-20 px-4 bg-[#FAF7F2]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">no son stock · son reales</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black">Psicólogas que te atenderán</h2>
              <p className="mt-3 text-base text-black/60 max-w-xl mx-auto">Todas colegiadas. Media de <strong>10 años de experiencia</strong>.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 max-w-5xl mx-auto">
              {PSICOLOGAS.map((p) => (
                <div key={p.name} className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(106,23,140,.04)] border border-black/[0.04] hover:shadow-[0_12px_40px_rgba(106,23,140,.10)] hover:-translate-y-0.5 transition-all">
                  <div className="relative aspect-square overflow-hidden bg-[#6A178C]/5">
                    <PsychVideo src={p.video} />
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm text-[9px] font-bold text-[#6A178C] px-2 py-1 rounded-full tracking-wide">
                      COL. {p.col}
                    </div>
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      EN VIVO
                    </div>
                  </div>
                  <div className="p-3 md:p-4 text-center">
                    <p className="font-serif text-sm md:text-base text-black leading-tight">{p.name}</p>
                    <p className="text-[11px] text-[#6A178C] font-semibold mt-1">{p.spec}</p>
                    <p className="text-[10px] text-black/45 mt-0.5">{p.years} años exp.</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center mt-8 text-sm text-black/55">
              <span className="font-serif text-2xl text-[#6A178C] font-bold align-middle">+150</span> <span className="align-middle">psicólogas colegiadas en el equipo</span>
            </p>
          </div>
        </section>

        {/* ═══════════ CASOS REALES ═══════════ */}
        <section className="py-16 md:py-20 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">transformaciones reales</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black">4 pacientes. 4 procesos. 4 antes y después.</h2>
              <p className="mt-3 text-base text-black/60 max-w-xl mx-auto">Historias anonimizadas con permiso. Sin filtros de marketing.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-5 md:gap-6">
              {CASOS_REALES.map((c) => (
                <div key={c.name} className="bg-gradient-to-br from-[#FAF7F2] to-white rounded-3xl p-6 md:p-7 border border-[#6A178C]/10 shadow-[0_8px_30px_rgba(106,23,140,.05)]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6A178C] to-[#8B2FB5] flex items-center justify-center text-white font-serif font-bold text-lg">
                      {c.name[0]}
                    </div>
                    <div>
                      <p className="font-serif text-lg text-black leading-tight">{c.name}, {c.age}</p>
                      <p className="text-[11px] text-black/50">{c.city} · {c.topic}</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm text-black/75 leading-relaxed">
                    <div className="flex gap-2">
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-black/40 pt-1 w-12">Antes</span>
                      <p>{c.before}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[#6A178C] pt-1 w-12">Después</span>
                      <p>{c.after}</p>
                    </div>
                  </div>
                  <p className="mt-5 pt-4 border-t border-black/5 font-serif italic text-[#6A178C] text-sm md:text-base leading-snug">
                    &ldquo;{c.quote}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ POR QUÉ TAN BARATO ═══════════ */}
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <p className="font-handwriting text-xl text-[#6A178C] mb-2">una pregunta razonable</p>
            <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black mb-6">¿Por qué solo 9,99€?</h2>
            <p className="text-base md:text-lg text-black/75 leading-relaxed mb-4">
              En consulta privada, un informe firmado + sesión de 50 min cuesta <strong>60-120€</strong>. Nosotros lo damos por 9,99€ como precio de entrada.
            </p>
            <p className="text-base md:text-lg text-black/75 leading-relaxed">
              Si decides seguir, bonos desde <strong>23€/sesión</strong>. Si no, el informe ya es tuyo.
            </p>
          </div>
        </section>

        {/* ═══════════ A QUIÉN LE DECIMOS NO ═══════════ */}
        <section className="py-16 md:py-20 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">honestidad radical</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black">
                A quién le decimos <em className="italic text-[#6A178C]">&ldquo;no somos para ti&rdquo;</em>
              </h2>
              <p className="mt-4 text-base text-black/65 max-w-2xl mx-auto">
                Ningún servicio es para todo el mundo — y el primero que te mienta sobre eso te está haciendo daño. Esto es lo que decimos, por escrito, a las personas a las que <strong>no podemos ayudar bien</strong>.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { t: "Crisis suicida activa con intento reciente", sol: "Derivamos a teléfono 024 y recomendamos atención presencial urgente. La terapia online no es segura en ese estado.", icon: "⚠️" },
                { t: "Trastornos psicóticos en fase aguda", sol: "Necesitas un equipo con psiquiatra. Te recomendamos unidades de salud mental concretas por provincia.", icon: "⚕️" },
                { t: "Terapia obligada por tribunales o familia", sol: "La terapia no funciona sin motivación propia. Preferimos no aceptar el caso a cobrarte por algo que no va a funcionar.", icon: "🙅" },
                { t: "Trastornos alimentarios graves con bajo peso", sol: "Requieren equipo multidisciplinar presencial con control médico del peso. Online no es suficiente.", icon: "🏥" },
              ].map((c) => (
                <div key={c.t} className="bg-[#FAF7F2] rounded-2xl p-5 md:p-6 border border-black/5 flex gap-4">
                  <div className="text-2xl shrink-0">{c.icon}</div>
                  <div>
                    <p className="font-serif text-base text-black mb-2 leading-tight">{c.t}</p>
                    <p className="text-sm text-black/65 leading-relaxed">{c.sol}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center mt-8 text-sm text-black/55 italic max-w-xl mx-auto">
              En 2025 hemos dicho &ldquo;no&rdquo; a 147 personas y les hemos recomendado por email el recurso concreto que sí podía ayudarles. Sin cobrar nada.
            </p>
          </div>
        </section>

        {/* ═══════════ EL 23% QUE NO VUELVE ═══════════ */}
        <section className="py-16 md:py-20 px-4 bg-[#FAF7F2]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">el dato incómodo</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black">El 23% que <em className="italic text-[#6A178C]">no</em> vuelve</h2>
            </div>
            <div className="bg-white rounded-3xl p-7 md:p-10 border border-black/5 shadow-[0_10px_40px_rgba(106,23,140,.06)]">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="shrink-0 relative">
                  <div className="w-36 h-36 md:w-44 md:h-44 rounded-full bg-gradient-to-br from-[#6A178C] to-[#8B2FB5] flex items-center justify-center text-white shadow-xl">
                    <div className="text-center">
                      <p className="font-serif text-5xl md:text-6xl font-bold leading-none">23%</p>
                      <p className="text-[10px] uppercase tracking-widest mt-2 opacity-80">no vuelve</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 text-[15px] md:text-base text-black/75 leading-[1.75] space-y-3">
                  <p>
                    De cada 100 personas que compran el Diagnóstico, <strong className="text-black">23 deciden no continuar con terapia en Mente Sana</strong>. Y nos parece bien.
                  </p>
                  <p>
                    Algunas se dan cuenta con el informe de que su necesidad es otra (un coach, un médico, un grupo, un libro). Otras entienden algo con la sesión y siguen por su cuenta. Otras simplemente no conectaron con el estilo de su psicóloga.
                  </p>
                  <p className="text-black">
                    <strong>Todas se quedan con el informe clínico escrito</strong> — tengan o no tengan un contrato con nosotros después. Es suyo. Lo compraron por 9,99€.
                  </p>
                  <p className="italic text-black/60 pt-1">
                    Si fuéramos un embudo de ventas, esto sería un fracaso. Como somos un diagnóstico, es el sistema funcionando bien.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ CELEBRIDADES ═══════════ */}
        <section className="py-16 md:py-20 px-4 bg-gradient-to-br from-[#FAF4FC] to-[#F0E3F7]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">ellos también van a terapia</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black">
                Pedir ayuda <em className="italic text-[#6A178C]">no</em> te hace débil.
              </h2>
              <p className="mt-3 text-base text-black/60 max-w-xl mx-auto">Figuras públicas españolas hablan abiertamente de su salud mental y de ir al psicólogo.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CELEBRITIES.slice(0, 12).map((c) => (
                <div key={c.name} className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm flex gap-3 items-start hover:shadow-md transition">
                  <CelebrityPhoto wikiTitle={c.wikiTitle} name={c.name} sizeClass="w-14 h-14" />
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-base text-black leading-tight">{c.name}</p>
                    <p className="text-[11px] text-[#6A178C] font-semibold mt-0.5">{c.profession} · {c.topic}</p>
                    <p className="text-sm text-black/70 italic mt-2 leading-snug">&ldquo;{c.quote}&rdquo;</p>
                    <p className="text-[10px] text-black/35 mt-1.5">Fuente: {c.source}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ NO TE ETIQUETAMOS ═══════════ */}
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">cómo funciona el informe</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black">No te etiquetamos.<br />Te entendemos.</h2>
            </div>
            <div className="bg-white rounded-3xl p-7 md:p-10 border border-black/5 shadow-[0_10px_40px_rgba(106,23,140,.06)] space-y-4 text-base md:text-lg text-black/75 leading-relaxed">
              <p>Describimos <strong>patrones</strong>, no etiquetas asustadoras. Y a partir de ahí, una propuesta de trabajo concreta.</p>
              <p>Si tu caso requiere un sanitario de mayor complejidad, te lo decimos con honestidad en el informe.</p>
              <p className="pt-2 border-t border-black/5 italic text-black/60">Escrito para que lo entiendas. Firmado por quien sí te puede ayudar.</p>
            </div>
          </div>
        </section>

        {/* ═══════════ MEDIOS ═══════════ */}
        <div className="bg-white border-t border-black/5">
          <PressLogos />
        </div>

        {/* ═══════════ METODOLOGÍA ═══════════ */}
        <section className="py-16 md:py-20 px-4 bg-[#FAF7F2]">
          <div className="max-w-4xl mx-auto text-center">
            <p className="font-handwriting text-xl text-[#6A178C] mb-2">el rigor detrás</p>
            <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black mb-4">Respaldo metodológico</h2>
            <p className="text-base text-black/65 max-w-xl mx-auto mb-8">
              Herramientas clínicas validadas. No un quiz de internet.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                { code: "PHQ-9", desc: "Escala de depresión" },
                { code: "GAD-7", desc: "Escala de ansiedad" },
                { code: "DSM-5", desc: "Manual diagnóstico" },
                { code: "CIE-11", desc: "Clasificación OMS" },
              ].map((t) => (
                <div key={t.code} className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm">
                  <p className="font-serif text-2xl md:text-3xl font-bold text-[#6A178C] mb-1">{t.code}</p>
                  <p className="text-xs text-black/55">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ TESTIMONIOS POR CCAA ═══════════ */}
        <section className="py-16 md:py-20 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">España entera confía en nosotros</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black">Pacientes en cada rincón del país</h2>
              <p className="mt-3 text-base text-black/60 max-w-xl mx-auto">Desde Madrid a Ceuta. Testimonios reales anonimizados por comunidad autónoma.</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {MENTESANA_BY_CCAA.slice(0, 12).map((t) => (
                <div key={t.ccaaId} className="bg-[#FAF7F2] rounded-2xl p-5 border border-black/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-[#6A178C]/10 flex items-center justify-center text-[#6A178C] font-bold text-xs">
                        {t.testimonial.initials}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-black leading-tight">{t.testimonial.initials} · {t.testimonial.age} años</p>
                        <p className="text-[10px] text-black/50">{t.testimonial.topic}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-[#6A178C]">{t.improvementPct}%</p>
                      <p className="text-[9px] text-black/45 uppercase tracking-wide">mejora</p>
                    </div>
                  </div>
                  <p className="text-[13px] text-black/70 italic leading-snug">&ldquo;{t.testimonial.quote}&rdquo;</p>
                </div>
              ))}
            </div>

            <div className="mt-10 grid grid-cols-3 md:grid-cols-5 gap-3 text-center max-w-3xl mx-auto">
              {MENTESANA_BY_CCAA.slice(0, 10).map((t) => (
                <div key={t.ccaaId} className="bg-[#6A178C]/5 rounded-xl py-3 px-2">
                  <p className="text-lg font-bold text-[#6A178C] leading-tight">{t.patients.toLocaleString("es-ES")}</p>
                  <p className="text-[10px] text-black/55 uppercase tracking-wide">{ccaaName(t.ccaaId)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ CASO LAURA ═══════════ */}
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">una historia real con nombre</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black">El caso de Laura</h2>
            </div>
            <div className="bg-gradient-to-br from-[#6A178C]/[0.04] to-[#8B2FB5]/[0.06] rounded-3xl p-7 md:p-10 border border-[#6A178C]/10 space-y-5 text-base md:text-lg text-black/80 leading-relaxed">
              <p>
                Laura, 29, llevaba tres años dándole vueltas. Probó dos plataformas de terapia con primera sesión gratis. En ambas conectó 20 minutos con dos psicólogas distintas, pagó el primer bono, fue a tres sesiones y lo dejó. <em className="text-black/60">&ldquo;Nunca supe si estaba haciendo terapia o hablando con alguien que apuntaba cosas.&rdquo;</em>
              </p>
              <p>
                Cuando hizo el Diagnóstico Mente Sana, recibió un informe de 6 páginas que le puso palabras a algo que llevaba años sin saber nombrar. En la sesión, su psicóloga ya había leído el informe y llegó con un plan concreto de 8 sesiones.
              </p>

              <div className="flex items-center gap-4 justify-center py-3">
                <div className="text-center">
                  <Image src="/images/por-que-diagnostico/laura.webp" alt="Laura" width={64} height={64} className="w-16 h-16 rounded-full object-cover ring-2 ring-[#6A178C]/15 mx-auto" />
                  <p className="text-[11px] text-black/60 mt-1.5 font-semibold">Laura M.</p>
                  <p className="text-[10px] text-black/40">paciente</p>
                </div>
                <div className="flex flex-col items-center text-[#6A178C]/40">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  <span className="text-[9px] uppercase tracking-wider mt-0.5 text-[#6A178C]/60 font-bold">matching</span>
                </div>
                <div className="text-center">
                  <div className="ring-2 ring-[#6A178C]/20 rounded-full inline-block">
                    <AvatarVideo src="/videos/welcome/laura-acosta-acosta.mp4" size="xs" />
                  </div>
                  <p className="text-[11px] text-[#6A178C] mt-1.5 font-semibold">Laura Acosta</p>
                  <p className="text-[10px] text-black/40">Col. M-29745</p>
                </div>
              </div>

              <p className="font-serif text-xl text-[#6A178C] italic pt-3 border-t border-[#6A178C]/10">
                &ldquo;Por primera vez sentí que estaba empezando desde algún sitio, no desde cero otra vez.&rdquo;
              </p>
              <p className="text-sm text-black/55">— Laura M., 29 años · tras 5 sesiones con su psicóloga asignada</p>
            </div>
          </div>
        </section>

        {/* ═══════════ WALL DE STATS ═══════════ */}
        <section className="py-16 md:py-20 px-4 bg-gradient-to-br from-[#1a0a1f] via-[#2d0d3f] to-[#4A2368] text-white">
          <div className="max-w-5xl mx-auto text-center">
            <p className="font-handwriting text-xl text-[#E8D4F0] mb-2">los números hablan</p>
            <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] mb-12">Lo que hemos construido en España</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[
                { n: "+8.000", l: "pacientes atendidos" },
                { n: "+150", l: "psicólogas colegiadas" },
                { n: "4,6★", l: "en Trustpilot" },
                { n: "+750", l: "reseñas verificadas" },
                { n: "94%", l: "mejora en 1er mes" },
                { n: "73%", l: "adherencia post-diagnóstico" },
                { n: "48h", l: "hasta tu diagnóstico" },
                { n: "+130K", l: "seguidores redes" },
              ].map((s) => (
                <div key={s.l} className="bg-white/[0.07] border border-white/[0.12] rounded-2xl px-4 py-6">
                  <p className="font-serif text-3xl md:text-5xl text-[#E8D4F0] leading-none">{s.n}</p>
                  <p className="text-xs md:text-sm text-white/65 mt-3 leading-snug">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ 3 REGALOS EXTRA ═══════════ */}
        <section className="py-16 md:py-20 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">lo que no te contamos arriba</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black">
                Con los 9,99€ también recibes
              </h2>
              <p className="mt-3 text-base text-black/60 max-w-xl mx-auto">
                No son bonus de landing page. Son cosas que tus psicólogas suelen decirte en la tercera sesión. Aquí las tienes en la primera.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              <div className="bg-gradient-to-br from-[#FAF4FC] to-white rounded-3xl p-7 border border-[#6A178C]/10 relative">
                <div className="absolute -top-3 left-6 bg-[#6A178C] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Regalo 1</div>
                <p className="font-serif text-xl md:text-2xl text-black leading-tight mt-3 mb-3">Las 7 preguntas que deberías hacerle a cualquier psicóloga en la primera sesión</p>
                <p className="text-sm text-black/65 leading-relaxed">Un PDF de 2 páginas que usan nuestras propias psicólogas. Sirve tanto con nosotros como con cualquier otra consulta. Para que nunca más te vendan sesiones.</p>
              </div>

              <div className="bg-gradient-to-br from-[#FAF4FC] to-white rounded-3xl p-7 border border-[#6A178C]/10 relative">
                <div className="absolute -top-3 left-6 bg-[#6A178C] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Regalo 2</div>
                <p className="font-serif text-xl md:text-2xl text-black leading-tight mt-3 mb-3">Carta de tu informe a tu gente</p>
                <p className="text-sm text-black/65 leading-relaxed">Una versión del informe escrita para que la leas con tu pareja, padres o amigos. Para que no tengas que explicar por qué estás yendo a terapia — ya está explicado.</p>
              </div>

              <div className="bg-gradient-to-br from-[#FAF4FC] to-white rounded-3xl p-7 border border-[#6A178C]/10 relative">
                <div className="absolute -top-3 left-6 bg-[#6A178C] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Regalo 3</div>
                <p className="font-serif text-xl md:text-2xl text-black leading-tight mt-3 mb-3">Tu predicción a 90 días</p>
                <p className="text-sm text-black/65 leading-relaxed">Al final del informe, tu psicóloga escribe qué debería pasar en 90 días si sigues el plan. Si a los 90 días no ha pasado nada de eso, escríbenos: revisamos y ajustamos — sin coste.</p>
              </div>
            </div>

            <p className="text-center mt-10 text-sm text-black/55 italic max-w-xl mx-auto">
              Los tres llegan con el informe, por email, firmados por tu psicóloga asignada.
            </p>
          </div>
        </section>

        {/* ═══════════ GARANTÍA AUDAZ FIRMADA ═══════════ */}
        <section className="py-16 md:py-20 px-4 bg-[#FAF7F2]">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-white rounded-3xl p-8 md:p-12 border-2 border-[#6A178C]/20 shadow-[0_20px_60px_rgba(106,23,140,.12)]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#6A178C] text-white text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">
                La garantía más incómoda del sector
              </div>

              <div className="text-center mt-2">
                <p className="font-handwriting text-xl text-[#6A178C] mb-2">nuestra promesa — por escrito</p>
                <h2 className="font-serif text-[1.75rem] md:text-[2.5rem] leading-[1.15] text-black mb-6">
                  Si no te ayudamos,<br className="hidden md:block" /> te recomendamos <em className="italic text-[#6A178C]">a la competencia</em>.
                </h2>
              </div>

              <div className="space-y-4 text-base md:text-lg text-black/80 leading-relaxed">
                <p>
                  Si después del diagnóstico y la sesión de 50 minutos <strong>no te aportamos valor real</strong>, hacemos dos cosas por escrito:
                </p>
                <ol className="space-y-3 pl-1">
                  <li className="flex gap-3">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-[#6A178C] text-white text-sm font-bold flex items-center justify-center">1</span>
                    <span>Te devolvemos los <strong>9,99€</strong>. Un email, sin preguntas, sin formularios raros. En 48h está en tu cuenta.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-[#6A178C] text-white text-sm font-bold flex items-center justify-center">2</span>
                    <span>Te mandamos por email <strong>qué otra plataforma, psicóloga o recurso</strong> creemos que sí encaja con tu caso. Concreto. Con nombre. Incluso si es competencia directa.</span>
                  </li>
                </ol>
                <p className="pt-3 border-t border-black/10 italic text-black/65">
                  Preferimos que llegues a tu proceso terapéutico con otra persona a que te quedes con el sabor de que &ldquo;la terapia no es para mí&rdquo;.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-black/10 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-handwriting text-2xl text-[#6A178C] -rotate-3">Alejandro Pérez</p>
                  <p className="text-[11px] text-black/55 mt-1">CEO · responsable directo de esta garantía</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-black/40">respuesta en</p>
                  <p className="font-serif text-3xl text-[#6A178C]">48h</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ FAQ — 3 preguntas clave antes del footer ═══════════ */}
        <section className="py-12 md:py-16 px-4 bg-[#FFFAF2]">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <p className="font-handwriting text-lg text-[#6A178C] mb-1">3 dudas antes de darle al botón</p>
              <h2 className="font-serif text-xl md:text-2xl leading-tight text-black">Lo que todos preguntan</h2>
            </div>
            <div className="space-y-2">
              {FAQ.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={i} className="bg-white rounded-xl border border-black/5">
                    <button
                      onClick={() => toggleFaq(i)}
                      className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
                      aria-expanded={open}
                    >
                      <span className="font-semibold text-sm md:text-base text-black pr-2">{f.q}</span>
                      <span className={`shrink-0 w-6 h-6 rounded-full bg-[#6A178C]/8 flex items-center justify-center text-[#6A178C] transition-transform ${open ? "rotate-45" : ""}`}>
                        <span className="text-sm leading-none">+</span>
                      </span>
                    </button>
                    {open && (
                      <div className="px-4 pb-3.5 -mt-0.5">
                        <p className="text-[13px] md:text-sm text-black/70 leading-relaxed">{f.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════ CTA FINAL ═══════════ */}
        <section id="cta-final" className="py-16 md:py-24 px-4 bg-gradient-to-br from-[#1a0a1f] via-[#2d0d3f] to-[#4A2368] text-white relative overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#6A178C] opacity-15 blur-3xl pointer-events-none" />
          <div className="max-w-3xl mx-auto text-center relative">
            <p className="font-handwriting text-xl text-[#E8D4F0] mb-3">ya lo entiendes</p>
            <h2 className="font-serif text-[2rem] md:text-[3rem] lg:text-[3.25rem] leading-[1.15] mb-6">
              Lo peor que te puede pasar es que te <em className="italic text-[#E8D4F0]">devolvamos el dinero</em> y te digamos dónde ir.
            </h2>
            <p className="text-base md:text-lg text-white/75 max-w-xl mx-auto mb-10">
              9,99€. Una vez. Informe + matching + 50 min con tu psicóloga + tres regalos que nadie más da + una garantía que incluye recomendarte a la competencia.
            </p>
            <Link href={ctaHref(CTA_HREF)} onClick={() => handleCTA("final")}
              className="inline-block bg-white text-[#4A2368] font-bold rounded-full px-10 py-4 text-base md:text-lg hover:-translate-y-0.5 transition-all shadow-[0_10px_40px_rgba(255,255,255,.25)]">
              Recibir mi diagnóstico · 9,99€ →
            </Link>
            <p className="mt-4 text-xs text-white/55">Pago único · Sin suscripción · Con garantía firmada</p>

            <div className="mt-12 pt-8 border-t border-white/10 max-w-md mx-auto">
              <p className="font-handwriting text-[#E8D4F0] text-2xl md:text-3xl -rotate-2 leading-tight mb-3">&ldquo;si algo sale mal, escríbeme.&rdquo;</p>
              <p className="text-sm text-white/60">alejandro@mentesanapsicologia.com</p>
              <p className="text-[11px] text-white/40 mt-1">— Alejandro Pérez, CEO. Leo yo los emails.</p>
            </div>
          </div>
        </section>

        <Footer />
      </main>

      {/* STICKY MOBILE CTA — 60px, morado sobre blanco, aparece a 80vh */}
      <div
        aria-hidden={!showStickyCTA}
        style={{ height: "60px" }}
        className={`fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-black/5 shadow-[0_-8px_24px_rgba(106,23,140,.12)] flex items-center justify-center px-4 transition-all duration-300 ${showStickyCTA ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-full opacity-0 pointer-events-none"}`}
      >
        <Link href={ctaHref(CTA_HREF)} onClick={() => handleCTA("sticky_mobile")}
          className="flex items-center justify-center gap-1.5 w-full text-[#6A178C] font-bold text-[15px]">
          Recibir mi diagnóstico 9,99€ <span aria-hidden>→</span>
        </Link>
      </div>
    </>
  );
}

function ccaaName(id: string): string {
  const map: Record<string, string> = {
    MD: "Madrid", CT: "Cataluña", AN: "Andalucía", VC: "Valencia",
    GA: "Galicia", PV: "País Vasco", AS: "Asturias", CL: "Castilla y León",
    AR: "Aragón", MC: "Murcia", CN: "Canarias", IB: "Baleares",
    CM: "Cast.-Mancha", EX: "Extremadura", NC: "Navarra", CB: "Cantabria",
    RI: "La Rioja", CE: "Ceuta", ML: "Melilla",
  };
  return map[id] || id;
}
