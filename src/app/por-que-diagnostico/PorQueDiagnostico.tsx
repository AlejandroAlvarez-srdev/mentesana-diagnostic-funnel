"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import PressLogos from "@/components/PressLogos";
import { track } from "@/lib/tracking";

const PSICOLOGAS = [
  { name: "Adriana Salas", spec: "Ansiedad", col: "M-28456", years: 10, video: "/videos/welcome/adriana-salas.mp4" },
  { name: "Laura Acosta", spec: "Depresión · TCC", col: "M-29745", years: 12, video: "/videos/welcome/laura-acosta-acosta.mp4" },
  { name: "Diana Salazar", spec: "Autoestima · TCA", col: "M-31204", years: 11, video: "/videos/welcome/diana-salazar-alzate.mp4" },
  { name: "Alexandra Elías", spec: "Trauma · EMDR", col: "B-19872", years: 9, video: "/videos/welcome/alexandra-elias.mp4" },
  { name: "Gabriela Delgado", spec: "Pareja · Relaciones", col: "V-24589", years: 8, video: "/videos/welcome/gabriela-delgado.mp4" },
];

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

const FAQ = [
  {
    q: "¿Y si ya he hecho terapia antes y no me funcionó?",
    a: "Precisamente por eso existe el Diagnóstico. La mayoría de las terapias fallidas empiezan sin un plan claro. Aquí tu psicóloga llega a la primera sesión con tu informe leído y con un plan propuesto. Trabajáis desde algo, no desde cero.",
  },
  {
    q: "¿Y si no conecto con la psicóloga asignada?",
    a: "Cambio gratuito, cuando tú quieras, sin dar explicaciones. Tu matching se ajusta y te asignamos otra profesional del equipo.",
  },
  {
    q: "¿Me van a diagnosticar con algo grave?",
    a: "No trabajamos con etiquetas asustadoras. Describimos patrones y proponemos trabajo. Si tu caso requiere derivación a un profesional sanitario de mayor complejidad, te lo indicamos honestamente en el informe.",
  },
  {
    q: "¿Cuánto cuesta después?",
    a: "Después del diagnóstico, solo si decides continuar: bonos desde 23€ por sesión (pack de 8) o sesiones sueltas a 45€. Sin suscripción, sin permanencia.",
  },
  {
    q: "¿Mi pareja, familia o banco pueden ver que he pagado esto?",
    a: "El cargo en tu extracto aparece como \"MENTE SANA\" sin más detalle. No mencionamos terapia ni diagnóstico en el concepto.",
  },
  {
    q: "¿Necesito saber qué me pasa antes de empezar?",
    a: "No. Las 5 preguntas están pensadas para personas que no saben explicarse todavía. Nosotros ponemos las palabras — tú solo tienes que responder cómo te sientes.",
  },
  {
    q: "¿Quién firma el informe? ¿Es generado por IA?",
    a: "Lo firma una psicóloga senior del equipo, colegiada y habilitada. El sistema estructura la información desde tus respuestas, pero la firma y la validación final son humanas — siempre.",
  },
  {
    q: "¿Puedo empezar si nunca he ido al psicólogo?",
    a: "Es el momento perfecto. El diagnóstico es justo para quien no ha empezado nunca. No hace falta preparación.",
  },
];

const COMPARATIVA = [
  { label: "Coste inicial", gratis: "0€", diag: "9,99€" },
  { label: "Matching", gratis: "Al azar o por disponibilidad", diag: "Algorítmico + validado por clínica" },
  { label: "Informe clínico", gratis: "No", diag: "5-7 páginas firmado por colegiada" },
  { label: "Duración de la sesión", gratis: "15-25 min (comercial)", diag: "50 min (clínica)" },
  { label: "Objetivo real", gratis: "Vender sesiones", diag: "Entender tu caso" },
  { label: "¿Llega con tu info leída?", gratis: "No", diag: "Sí, lee tu informe antes" },
  { label: "¿Hay plan concreto?", gratis: "Raramente", diag: "Sí, propuesta desde la primera sesión" },
  { label: "Cambio de psicóloga", gratis: "Vuelves a empezar", diag: "Gratis, sin dar explicaciones" },
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
      <main className="bg-[#FFFAF2] min-h-screen pb-28 md:pb-0">

        {/* ═══════════ HERO ═══════════ */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#1a0a1f] via-[#2d0d3f] to-[#4A2368] text-white pt-16 pb-14 md:pt-24 md:pb-20">
          <div className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(circle at 25% 30%, rgba(201,169,209,.35), transparent 45%), radial-gradient(circle at 75% 70%, rgba(139,47,181,.45), transparent 55%)" }} />
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#6A178C] opacity-20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-[#8B2FB5] opacity-20 blur-3xl pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 relative text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-xs md:text-sm mb-6">
              <span className="font-handwriting text-base text-[#E8D4F0]">un momento antes de empezar</span>
            </div>
            <h1 className="font-serif text-[2rem] md:text-5xl lg:text-6xl leading-[1.12] max-w-4xl mx-auto">
              Por 9,99€ empiezas con<br />
              <em className="italic text-[#E8D4F0]">claridad</em>. No con <em className="italic text-[#C9A9D1]">ruleta</em>.
            </h1>
            <p className="mt-6 md:mt-8 text-base md:text-xl text-white/80 leading-relaxed max-w-2xl mx-auto">
              La mayoría de psicólogos online te ofrecen una primera sesión gratis. Nosotros cobramos 9,99€ para darte algo que ellos no pueden: un diagnóstico real antes de que empieces.
            </p>

            <div className="mt-10 flex flex-col items-center gap-3">
              <Link href={ctaHref(CTA_HREF)} onClick={() => handleCTA("hero")}
                className="bg-white text-[#4A2368] font-bold rounded-full px-10 py-4 text-base md:text-lg hover:-translate-y-0.5 transition-all shadow-[0_10px_40px_rgba(255,255,255,.25)]">
                Comenzar →
              </Link>
              <p className="text-xs text-white/55">Pago único · Sin suscripción · Con garantía</p>
            </div>

            {/* Avatar stack — social proof */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <div className="flex -space-x-3">
                {PSICOLOGAS.slice(0, 4).map((p) => (
                  <div key={p.name} className="ring-2 ring-[#2d0d3f] rounded-full">
                    <AvatarVideo src={p.video} size="sm" />
                  </div>
                ))}
                <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur border-2 border-[#2d0d3f] flex items-center justify-center text-[11px] font-bold text-white">
                  +28
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm text-white font-semibold leading-tight">32 psicólogas colegiadas</p>
                <p className="text-xs text-white/60 leading-tight">validadas por nuestra clínica</p>
              </div>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 max-w-3xl mx-auto">
              <div className="bg-white/[0.07] border border-white/[0.12] rounded-2xl px-5 py-4 flex items-center gap-3">
                <span className="font-serif text-3xl text-[#E8D4F0]">73%</span>
                <span className="text-xs text-white/70 text-left leading-snug">de adherencia post-diagnóstico</span>
              </div>
              <div className="bg-white/[0.07] border border-white/[0.12] rounded-2xl px-5 py-4 flex items-center gap-3">
                <span className="font-serif text-3xl text-[#E8D4F0]">4,6<span className="text-base">/5</span></span>
                <span className="text-xs text-white/70 text-left leading-snug">Trustpilot · 750 reseñas</span>
              </div>
              <div className="bg-white/[0.07] border border-white/[0.12] rounded-2xl px-5 py-4 flex items-center gap-3">
                <span className="text-2xl">🏛️</span>
                <span className="text-xs text-white/70 text-left leading-snug">Firmado por psicóloga colegiada</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ COMPARATIVA ═══════════ */}
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">la diferencia real</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black">
                Primera sesión gratis <span className="text-black/40">vs</span><br />
                Diagnóstico Mente Sana
              </h2>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-3xl border border-black/5 shadow-[0_20px_60px_rgba(106,23,140,.08)]">
              <div className="grid grid-cols-3 bg-[#FAF7F2] border-b border-black/5 sticky top-0 z-10 rounded-t-3xl overflow-hidden">
                <div className="p-5 text-xs font-bold uppercase tracking-wider text-black/50">Qué recibes</div>
                <div className="p-5 text-sm font-semibold text-black/60 border-l border-black/5">Primera sesión gratis<br /><span className="text-xs font-normal text-black/45">(la mayoría de plataformas)</span></div>
                <div className="p-5 text-sm font-bold text-[#6A178C] border-l border-black/5 bg-[#6A178C]/[0.06]">Diagnóstico Mente Sana<br /><span className="text-xs font-semibold">9,99€</span></div>
              </div>
              {COMPARATIVA.map((row, i) => (
                <div key={i} className={`grid grid-cols-3 ${i % 2 === 0 ? "bg-white" : "bg-[#FAF9F6]"} border-b border-black/5 last:border-b-0`}>
                  <div className="p-5 text-sm font-semibold text-black/80">{row.label}</div>
                  <div className="p-5 text-sm text-black/60 border-l border-black/5">{row.gratis}</div>
                  <div className="p-5 text-sm text-black font-medium border-l border-black/5 bg-[#6A178C]/[0.04]">{row.diag}</div>
                </div>
              ))}
            </div>

            {/* Mobile cards */}
            <div className="md:hidden">
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-black/[0.04] rounded-2xl p-3 text-center border border-black/5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-black/55">Primera sesión gratis</p>
                  <p className="text-[11px] text-black/45 mt-0.5">la mayoría</p>
                </div>
                <div className="bg-[#6A178C]/[0.06] rounded-2xl p-3 text-center border border-[#6A178C]/15">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6A178C]">Diagnóstico Mente Sana</p>
                  <p className="text-[11px] text-[#6A178C]/80 mt-0.5 font-semibold">9,99€</p>
                </div>
              </div>
            </div>
            <div className="md:hidden space-y-4">
              {COMPARATIVA.map((row, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-black/5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-black/50 mb-3">{row.label}</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-black/30 text-sm mt-0.5">✕</span>
                      <div>
                        <p className="text-[11px] text-black/40 font-semibold uppercase tracking-wide">Gratis</p>
                        <p className="text-sm text-black/60">{row.gratis}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-[#6A178C]/[0.04] rounded-xl p-3 -mx-1">
                      <span className="text-[#6A178C] text-sm mt-0.5">✓</span>
                      <div>
                        <p className="text-[11px] text-[#6A178C] font-semibold uppercase tracking-wide">Mente Sana</p>
                        <p className="text-sm text-black font-medium">{row.diag}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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

        {/* ═══════════ PSICÓLOGAS REALES ═══════════ */}
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">no son stock · son reales</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black">Las psicólogas que te atenderán</h2>
              <p className="mt-4 text-base text-black/60 max-w-2xl mx-auto">Te matcheamos con una de ellas según tu caso. Todas colegiadas, con media de <strong>10 años de experiencia clínica</strong>.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5 md:gap-6">
              {PSICOLOGAS.map((p) => (
                <div key={p.name} className="text-center">
                  <div className="mx-auto mb-3 ring-4 ring-[#6A178C]/10 rounded-full">
                    <AvatarVideo src={p.video} size="lg" className="mx-auto" />
                  </div>
                  <p className="font-serif text-base md:text-lg text-black leading-tight">{p.name}</p>
                  <p className="text-[11px] text-black/55 mt-0.5">{p.spec}</p>
                  <p className="text-[10px] text-[#6A178C]/70 font-semibold mt-1">Col. {p.col} · {p.years} años</p>
                </div>
              ))}
            </div>

            <p className="text-center mt-10 text-xs text-black/45">+ 27 psicólogas más en el equipo · especialistas en ansiedad, depresión, pareja, duelo, TCA, autoestima, trauma y adicciones</p>
          </div>
        </section>

        {/* ═══════════ POR QUÉ TAN BARATO ═══════════ */}
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <p className="font-handwriting text-xl text-[#6A178C] mb-2">una pregunta razonable</p>
            <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black mb-6">¿Por qué solo 9,99€?</h2>
            <p className="text-base md:text-lg text-black/75 leading-relaxed mb-5">
              Un informe clínico firmado y una sesión de 50 minutos con una psicóloga colegiada, en una consulta privada, cuestan entre 60 y 120€. Nosotros te lo damos por 9,99€.
            </p>
            <p className="text-base md:text-lg text-black/75 leading-relaxed mb-5">
              No es precio premium. Es precio de entrada. Queremos que cualquier persona pueda empezar con claridad, no con dudas.
            </p>
            <p className="text-base md:text-lg text-black/75 leading-relaxed">
              Si luego decides seguir, las sesiones vienen a <strong>23€-45€</strong>. Si no decides seguir, no pasa nada: el informe ya es tuyo.
            </p>
          </div>
        </section>

        {/* ═══════════ TIMELINE ═══════════ */}
        <section className="py-16 md:py-20 px-4 bg-[#1a0a1f] text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(circle at 20% 50%, rgba(139,47,181,.4), transparent 40%), radial-gradient(circle at 80% 50%, rgba(201,169,209,.3), transparent 40%)" }} />
          <div className="max-w-4xl mx-auto relative">
            <div className="text-center mb-14">
              <p className="font-handwriting text-xl text-[#E8D4F0] mb-2">qué pasa exactamente</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15]">Desde hoy hasta tu sesión</h2>
            </div>

            <div className="space-y-6 md:space-y-8">
              {[
                { when: "HOY", title: "Respondes 5 preguntas", desc: "5 minutos. No hay test ni ranking. Solo cuéntanos qué estás sintiendo y desde cuándo." },
                { when: "+48h", title: "Recibes tu matching", desc: "Te asignamos la psicóloga cuyo perfil clínico encaja con tu caso. No la primera disponible." },
                { when: "TU HORA", title: "Sesión de 50 minutos", desc: "Tu psicóloga llega con tu informe leído. Te lo explica, te da el plan propuesto y empezáis a trabajar." },
                { when: "DESPUÉS", title: "Tú decides", desc: "Si quieres seguir, bonos desde 23€/sesión. Si no, el informe es tuyo y no se cobra nada más." },
              ].map((step, i) => (
                <div key={i} className="flex gap-4 md:gap-6 items-start">
                  <div className="shrink-0 w-16 md:w-24 text-right">
                    <span className="font-handwriting text-lg md:text-2xl text-[#E8D4F0]">{step.when}</span>
                  </div>
                  <div className="shrink-0 w-px bg-gradient-to-b from-[#8B2FB5] to-transparent self-stretch mt-2 relative">
                    <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-[#E8D4F0]" />
                  </div>
                  <div className="flex-1 pb-2">
                    <h3 className="font-serif text-xl md:text-2xl mb-2">{step.title}</h3>
                    <p className="text-sm md:text-base text-white/65 leading-relaxed">{step.desc}</p>
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
            <div className="bg-white rounded-3xl p-7 md:p-10 border border-black/5 shadow-[0_10px_40px_rgba(106,23,140,.06)] space-y-5 text-base md:text-lg text-black/75 leading-relaxed">
              <p>Hay informes que abres esperando saber qué te pasa y sales con una etiqueta que te deja peor. El nuestro no va por ahí.</p>
              <p>Describimos <strong>patrones</strong>, no diagnósticos asustadores. Tus patrones de pensamiento, de relación, de cómo regulas lo que sientes. Y, a partir de ahí, una propuesta de trabajo concreta.</p>
              <p>Si tu caso requiere un profesional sanitario de mayor complejidad (psiquiatra, terapia especializada), te lo decimos con honestidad en el informe. Sin drama.</p>
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
            <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black mb-8">Respaldo metodológico</h2>
            <p className="text-base md:text-lg text-black/75 leading-relaxed max-w-2xl mx-auto mb-10">
              Nuestro informe se apoya en herramientas clínicas validadas internacionalmente. No es un quiz de internet.
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

        {/* ═══════════ CASO LAURA ═══════════ */}
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">una historia real</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black">El caso de Laura</h2>
            </div>
            <div className="bg-gradient-to-br from-[#6A178C]/[0.04] to-[#8B2FB5]/[0.06] rounded-3xl p-7 md:p-10 border border-[#6A178C]/10 space-y-5 text-base md:text-lg text-black/80 leading-relaxed">
              <p>
                Laura, 29, llevaba tres años dándole vueltas. Probó dos plataformas de terapia con primera sesión gratis. En ambas conectó 20 minutos con dos psicólogas distintas, pagó el primer bono, fue a tres sesiones y lo dejó. <em className="text-black/60">"Nunca supe si estaba haciendo terapia o hablando con alguien que apuntaba cosas."</em>
              </p>
              <p>
                Cuando hizo el Diagnóstico Mente Sana, recibió un informe de 6 páginas que le puso palabras a algo que llevaba años sin saber nombrar. En la sesión, su psicóloga ya había leído el informe y llegó con un plan concreto de 8 sesiones.
              </p>

              {/* Emparejamiento visual Laura ↔ psicóloga */}
              <div className="flex items-center gap-4 justify-center py-3">
                <div className="text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/Reviews/review-3.webp" alt="Laura" className="w-16 h-16 rounded-full object-cover ring-2 ring-[#6A178C]/15 mx-auto" />
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
                "Por primera vez sentí que estaba empezando desde algún sitio, no desde cero otra vez."
              </p>
              <p className="text-sm text-black/55">— Laura M., 29 años · tras 5 sesiones con su psicóloga asignada</p>
            </div>
          </div>
        </section>

        {/* ═══════════ GARANTÍA ═══════════ */}
        <section className="py-16 md:py-20 px-4 bg-[#FAF7F2]">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl p-8 md:p-12 border-2 border-[#6A178C]/20 shadow-[0_20px_60px_rgba(106,23,140,.12)] text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#6A178C]/10 mb-6">
                <span className="text-3xl">🛡️</span>
              </div>
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">nuestra promesa</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black mb-5">Garantía audaz</h2>
              <p className="text-base md:text-lg text-black/75 leading-relaxed mb-4">
                Si después del diagnóstico y la sesión de 50 minutos no te aportamos valor, te devolvemos los 9,99€. Sin preguntas. Sin formularios. Un email y se procesa.
              </p>
              <p className="text-sm text-black/55 italic">No queremos tu dinero si no te ayudamos. Punto.</p>
            </div>
          </div>
        </section>

        {/* ═══════════ FAQ ═══════════ */}
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">preguntas que todo el mundo se hace</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15] text-black">Las dudas reales</h2>
            </div>
            <div className="space-y-3">
              {FAQ.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={i} className="bg-white rounded-2xl border border-black/5 overflow-hidden transition-shadow hover:shadow-[0_6px_24px_rgba(106,23,140,.06)]">
                    <button
                      onClick={() => toggleFaq(i)}
                      className="w-full text-left p-5 md:p-6 flex items-center justify-between gap-4"
                      aria-expanded={open}
                    >
                      <span className="font-serif text-lg md:text-xl text-black pr-2">{f.q}</span>
                      <span className={`shrink-0 w-8 h-8 rounded-full bg-[#6A178C]/8 flex items-center justify-center text-[#6A178C] transition-transform ${open ? "rotate-45" : ""}`}>
                        <span className="text-lg leading-none">+</span>
                      </span>
                    </button>
                    {open && (
                      <div className="px-5 md:px-6 pb-5 md:pb-6 -mt-1">
                        <p className="text-sm md:text-base text-black/70 leading-relaxed">{f.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════ CTA FINAL ═══════════ */}
        <section id="cta-final" className="py-16 md:py-20 px-4 bg-gradient-to-br from-[#1a0a1f] via-[#2d0d3f] to-[#4A2368] text-white relative overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#6A178C] opacity-15 blur-3xl pointer-events-none" />
          <div className="max-w-3xl mx-auto text-center relative">
            <p className="font-handwriting text-xl text-[#E8D4F0] mb-3">ya lo entiendes</p>
            <h2 className="font-serif text-[2rem] md:text-[3rem] lg:text-[3.25rem] leading-[1.15] mb-6">
              9,99€ para empezar con<br />
              <em className="italic text-[#E8D4F0]">claridad</em>.
            </h2>
            <p className="text-base md:text-lg text-white/75 leading-relaxed max-w-xl mx-auto mb-10">
              Informe clínico firmado + matching real + sesión de 50 minutos con tu psicóloga. Todo por menos que una cena.
            </p>
            <Link href={ctaHref(CTA_HREF)} onClick={() => handleCTA("final")}
              className="inline-block bg-white text-[#4A2368] font-bold rounded-full px-10 py-4 text-base md:text-lg hover:-translate-y-0.5 transition-all shadow-[0_10px_40px_rgba(255,255,255,.25)]">
              Comenzar (9,99€) →
            </Link>
            <p className="mt-4 text-xs text-white/55">Pago único · Sin suscripción · Devolución garantizada</p>
          </div>
        </section>

        <Footer />
      </main>

      {/* ═══════════ STICKY MOBILE CTA ═══════════ */}
      <div
        aria-hidden={!showStickyCTA}
        className={`fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-lg border-t border-black/5 shadow-[0_-8px_24px_rgba(106,23,140,.08)] px-4 py-3 transition-all duration-300 ${showStickyCTA ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-full opacity-0 pointer-events-none"}`}
      >
        <Link href={ctaHref(CTA_HREF)} onClick={() => handleCTA("sticky_mobile")}
          className="flex items-center justify-center bg-[#6A178C] text-white font-bold rounded-full px-6 py-3.5 text-sm shadow-[0_8px_24px_rgba(106,23,140,.3)]">
          Comenzar · 9,99€
        </Link>
      </div>
    </>
  );
}
