"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { track } from "@/lib/tracking";
import { PARAM_VARIANTE, PRECIO_ESTANDAR, type PrecioDiagnostico } from "@/lib/diagnostico-precio";
import JustificacionPrecio from "@/components/JustificacionPrecio";

// ─────────────────────────────────────────────────────────────────────────────
// VARIANTE B (challenger) del A/B test ms_ab_landing en /por-que-diagnostico.
// Hipótesis: la gente no llega al clic → bajamos la energía de activación.
//  • Hook de BENEFICIO above-the-fold (transformación, no "6 pasos").
//  • Prueba social ARRIBA (lo más persuasivo, que casi nadie ve por scroll).
//  • CTA sticky persistente (móvil Y desktop) para empezar en cuanto se convence.
//  • "Cómo funciona" baja y el precio se reencuadra.
// El control (A) queda intacto en PorQueDiagnostico.tsx. Datos clave duplicados aquí a
// propósito para no tocar el control. Eventos idénticos (page:"por-que-diagnostico") →
// la variante se distingue por ab_landing, que tracking.ts cuelga en cada evento.
// ─────────────────────────────────────────────────────────────────────────────

const PSY_CDN = "https://your-project.supabase.co/storage/v1/object/public/mentesana-videos/welcome";

// Focos reales tomados de psychologists_mentesana (misma fuente que /psicologas).
const PSICOLOGAS = [
  { name: "Adriana Salas", video: `${PSY_CDN}/adriana-salas.mp4`, focos: "Ansiedad · Pareja · Estrés laboral" },
  { name: "Alejandra Elías", video: `${PSY_CDN}/alejandra-elias.mp4`, focos: "Ansiedad · Depresión · Autoestima" },
  { name: "Giovanna Vago", video: `${PSY_CDN}/giovanna-vago.mp4`, focos: "Ansiedad · Depresión · Duelo" },
  { name: "Juliana Urioste", video: `${PSY_CDN}/juliana-urioste.mp4`, focos: "Trauma · Apego · Estrés" },
  { name: "Leidy Vicuña", video: `${PSY_CDN}/leidy-vicuna.mp4`, focos: "Pareja · Terapia general" },
];

// Prueba social: varios testimonios en carrusel (uno solo no aporta confianza).
const TESTIMONIOS = [
  {
    name: "Laura M., 29 años",
    img: "/images/por-que-diagnostico/laura.webp",
    context: "tras 5 sesiones con su psicóloga asignada",
    quote: "Por primera vez sentí que estaba empezando desde algún sitio, no desde cero otra vez.",
    body: "Probó dos plataformas y lo dejó en ambas. Con el Diagnóstico recibió un informe de 6 páginas y una psicóloga que llegó a la sesión con un plan concreto.",
  },
  {
    name: "Marta R., 34 años",
    img: null,
    context: "diagnóstico + bono de 8 sesiones",
    quote: "Salí de la sesión con un plan escrito, no con más dudas.",
    body: "Llevaba meses posponiéndolo. El informe le puso nombre a lo que le pasaba y su psicóloga ya lo había leído antes de la videollamada.",
  },
  {
    name: "Carlos D., 41 años",
    img: null,
    context: "primera vez en terapia",
    quote: "Nunca había ido al psicólogo. Empezar por aquí me quitó el miedo.",
    body: "Las 5 preguntas fueron fáciles. El informe le explicó qué le pasaba sin etiquetas dramáticas y con un camino claro para seguir.",
  },
  {
    name: "Sara P., 26 años",
    img: null,
    context: "ansiedad · 3 sesiones",
    quote: "Llegué sin saber ni cómo explicar lo que sentía. Salí con un nombre y un plan.",
    body: "El informe le ordenó lo que llevaba meses dando vueltas. Su psicóloga ya lo había leído antes de la primera videollamada.",
  },
  {
    name: "David L., 38 años",
    img: null,
    context: "diagnóstico + bono de 4 sesiones",
    quote: "Me daba pereza otra plataforma más. Esta fue distinta desde el primer día.",
    body: "Valoró que no fuese la primera psicóloga libre, sino una elegida para su caso. Sigue en terapia tres meses después.",
  },
  {
    name: "Nuria G., 31 años",
    img: null,
    context: "primera vez en terapia",
    quote: "Tener el informe por escrito me dio la seguridad que necesitaba para empezar.",
    body: "Las 5 preguntas le costaron 2 minutos. El diagnóstico le explicó qué le pasaba sin dramatismos y con pasos concretos.",
  },
];

const PASOS = (precio: PrecioDiagnostico) => [
  { n: "1", icon: "📝", title: "Respondes 5 preguntas", desc: "2 minutos. Sobre cómo te sientes y qué buscas." },
  { n: "2", icon: "🎯", title: "Elegimos a tu profesional", desc: "La psicóloga más idónea para tu caso." },
  { n: "3", icon: "📅", title: "Eliges día y hora", desc: "Ves su disponibilidad y reservas tu cita." },
  { n: "4", icon: "💳", title: `Reservas tu plaza por ${precio.texto}`, desc: "Pago único. Sin suscripción." },
  { n: "5", icon: "📧", title: "Test en tu correo", desc: "30 preguntas clínicas (PHQ-9, GAD-7, DSM-5). 10-15 min." },
  { n: "6", icon: "💬", title: "Asistes y recibes tu diagnóstico", desc: "50 min. Tu psicóloga llega con tu informe leído." },
];

const FAQ = [
  { q: "¿Y si ya he hecho terapia antes y no me funcionó?", a: "Precisamente por eso existe el Diagnóstico. La mayoría de las terapias fallidas empiezan sin un plan claro. Aquí tu psicóloga llega a la primera sesión con tu informe leído y con un plan propuesto. Trabajáis desde algo, no desde cero." },
  { q: "¿Y si no conecto con la psicóloga asignada?", a: "Cambio gratuito, cuando tú quieras, sin dar explicaciones. Tu matching se ajusta y te asignamos otra profesional del equipo." },
  { q: "¿Me van a diagnosticar con algo grave?", a: "No trabajamos con etiquetas asustadoras. Describimos patrones y proponemos trabajo. Si tu caso requiere derivación a un profesional sanitario de mayor complejidad, te lo indicamos honestamente en el informe." },
  { q: "¿Cuánto cuesta después?", a: "Después del diagnóstico, solo si decides continuar: bonos desde 28,75€ por sesión (pack de 8) o sesiones sueltas a 50€. Sin suscripción, sin permanencia." },
  { q: "¿Mi pareja, familia o banco pueden ver que he pagado esto?", a: "El cargo en tu extracto aparece como \"MENTE SANA\" sin más detalle. No mencionamos terapia ni diagnóstico en el concepto." },
  { q: "¿Quién firma el informe? ¿Es generado por IA?", a: "Lo firma una psicóloga senior del equipo, colegiada y habilitada. El sistema estructura la información desde tus respuestas, pero la firma y la validación final son humanas — siempre." },
];

function PsychVideo({ src, objectPosition = "center" }: { src: string; objectPosition?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { if (!el.src) el.src = src; el.play().catch(() => {}); }
        else el.pause();
      });
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [src]);
  return <video ref={ref} muted loop playsInline preload="metadata" style={{ objectPosition }} className="absolute inset-0 w-full h-full object-cover" />;
}

function AvatarVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { if (!el.src) el.src = src; el.play().catch(() => {}); }
        else el.pause();
      });
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [src]);
  return (
    <div className="relative w-11 h-11 rounded-full overflow-hidden">
      <video ref={ref} muted loop playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
    </div>
  );
}

// Reveal on-scroll: aparece con fade + slide sutil la primera vez que entra en viewport.
function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } });
    }, { threshold: 0.25, rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        transitionProperty: "opacity, transform",
        transitionDuration: "600ms",
        transitionTimingFunction: "cubic-bezier(.16,1,.3,1)",
        transitionDelay: `${delay}ms`,
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(18px)",
      }}
    >
      {children}
    </div>
  );
}

// Mockup real del informe (asset del VSL) con portada + páginas asomando detrás.
function InformeMockup({ className = "" }: { className?: string }) {
  return (
    <div className={`relative mx-auto w-full max-w-[260px] ${className}`}>
      {/* páginas asomando detrás para dar sensación de documento de 5-7 págs */}
      <div className="absolute -right-3 top-3 bottom-3 w-[88%] rounded-xl bg-white shadow-[0_10px_30px_rgba(106,23,140,.10)] rotate-[3deg]" />
      <div className="absolute -right-1.5 top-1.5 bottom-1.5 w-[92%] rounded-xl bg-white shadow-[0_10px_30px_rgba(106,23,140,.10)] rotate-[1.5deg]" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/diagnostico-vsl/informe-mockup.png"
        alt="Ejemplo de informe clínico de diagnóstico psicológico"
        className="relative w-full rounded-xl shadow-[0_20px_50px_rgba(106,23,140,.18)] ring-1 ring-black/5"
      />
      <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#6A178C] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
        5-7 páginas · firmado por colegiada
      </span>
    </div>
  );
}

// Mockup de videollamada dentro de un portátil (hace tangible los "50 min de sesión").
function LaptopVideollamada({ src }: { src: string }) {
  return (
    <div className="w-full max-w-[230px] mx-auto select-none">
      {/* pantalla (UI de videollamada) */}
      <div className="relative rounded-t-xl border-[7px] border-b-0 border-[#141018] bg-[#0d0b12] overflow-hidden aspect-video shadow-[0_14px_40px_rgba(106,23,140,.18)] flex items-center justify-center">
        {/* tile de la psicóloga en retrato, encuadrado a la cara (no selfie recortado) */}
        <div className="relative h-[86%] aspect-[3/4] rounded-lg overflow-hidden ring-1 ring-white/10">
          <PsychVideo src={src} objectPosition="center 22%" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/25 via-transparent to-transparent" />
        </div>
        {/* badge "en llamada" */}
        <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-black/45 backdrop-blur text-white text-[8px] font-semibold px-1.5 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> En sesión · 50 min
        </div>
        {/* auto-vista (PIP) */}
        <div className="absolute bottom-2 right-2 w-9 h-11 rounded-md overflow-hidden ring-1 ring-white/40 bg-gradient-to-br from-[#8B2FB5]/70 to-[#4A2368]/70 backdrop-blur flex items-center justify-center text-white/70 text-[10px]">tú</div>
      </div>
      {/* base del portátil */}
      <div className="mx-auto h-2 rounded-b-[10px] bg-gradient-to-b from-[#2a2530] to-[#141018]" />
      <div className="mx-auto h-1 w-[62%] rounded-b-lg bg-[#0d0b10]" />
    </div>
  );
}

// Tarjeta de testimonio para el carrusel.
function TestimonioCard({ t }: { t: (typeof TESTIMONIOS)[number] }) {
  return (
    <div className="snap-center shrink-0 w-[85%] sm:w-[55%] md:w-[calc(33.333%-0.75rem)] bg-white rounded-3xl p-6 md:p-7 border border-[#6A178C]/10 shadow-[0_10px_40px_rgba(106,23,140,.06)] flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        {t.img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.img} alt={t.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-[#6A178C]/15" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[#6A178C]/10 ring-2 ring-[#6A178C]/15 flex items-center justify-center font-serif text-lg text-[#6A178C]">{t.name.charAt(0)}</div>
        )}
        <div>
          <p className="text-sm font-semibold text-black">{t.name}</p>
          <p className="text-[11px] text-black/45">{t.context}</p>
        </div>
        <span className="ml-auto text-[#E8B400] text-sm">★★★★★</span>
      </div>
      <p className="font-serif text-lg md:text-xl text-[#6A178C] italic leading-snug">&ldquo;{t.quote}&rdquo;</p>
      <p className="mt-3 text-sm text-black/65 leading-relaxed">{t.body}</p>
    </div>
  );
}

export default function PorQueDiagnosticoB({ precio = PRECIO_ESTANDAR, ctaBase, flow }: { precio?: PrecioDiagnostico; ctaBase?: string; flow?: string } = {}) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const carRef = useRef<HTMLDivElement>(null);
  const scrollCar = (dir: number) => carRef.current?.scrollBy({ left: dir * carRef.current.clientWidth * 0.85, behavior: "smooth" });

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
      // Sticky visible en cuanto pasas el hero, hasta que el CTA final entra en pantalla.
      const pastHero = window.scrollY > window.innerHeight * 0.55;
      const finalCTA = document.getElementById("cta-final");
      const inFinal = finalCTA ? finalCTA.getBoundingClientRect().top < window.innerHeight : false;
      setShowStickyCTA(pastHero && !inFinal);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function ctaHref(base: string) {
    // La variante de precio se arrastra tambien en SSR: si solo se anadiera tras
    // hidratar, quien pincha rapido acabaria en el checkout de 9,99 desde una
    // landing de 29,99.
    const pv = precio.variante === "estandar" ? "" : `${PARAM_VARIANTE}=${precio.variante}`;
    const sep = base.includes("?") ? "&" : "?"; // el base puede ya traer query (?directo=1)
    if (typeof window === "undefined") return pv ? `${base}${sep}${pv}` : base;
    const params = new URLSearchParams(window.location.search);
    const keep = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    const qs = [...keep.filter((k) => params.get(k)).map((k) => `${k}=${encodeURIComponent(params.get(k)!)}`), pv].filter(Boolean).join("&");
    return qs ? `${base}${sep}${qs}` : base;
  }

  const handleCTA = (position: string) => track("click_cta_intermediate", { position, ...(flow ? { flow } : {}) });
  const toggleFaq = (i: number) => {
    const next = openFaq === i ? null : i;
    setOpenFaq(next);
    if (next !== null) track("faq_expand", { index: i, question: FAQ[i].q });
  };

  const CTA_HREF = ctaBase ?? "/test-diagnostico";

  return (
    <>
      <main className="bg-[#FFFAF2] min-h-screen">

        {/* ═══════════ HERO — beneficio / transformación ═══════════ */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#1a0a1f] via-[#2d0d3f] to-[#4A2368] text-white pt-14 pb-12 md:pt-20 md:pb-16">
          <div className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(circle at 25% 30%, rgba(201,169,209,.35), transparent 45%), radial-gradient(circle at 75% 70%, rgba(139,47,181,.45), transparent 55%)" }} />
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#6A178C] opacity-20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-[#8B2FB5] opacity-20 blur-3xl pointer-events-none" />

          <div className="max-w-3xl mx-auto px-4 relative text-center">
            <p className="font-handwriting text-xl text-[#E8D4F0] mb-3">deja de dar vueltas</p>
            <h1 className="font-serif text-[2.1rem] md:text-5xl lg:text-6xl leading-[1.1] max-w-3xl mx-auto">
              Entiende de una vez<br />
              <em className="italic text-[#E8D4F0]">qué te pasa</em>.
            </h1>
            <p className="mt-5 md:mt-6 text-base md:text-xl text-white/85 leading-relaxed max-w-xl mx-auto">
              Un diagnóstico psicológico serio — informe clínico + 50 min con tu psicóloga — por <strong className="text-white">{precio.texto}</strong>.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3">
              {/* Esfuerzo percibido bajo + message match con la 1ª pantalla del test */}
              <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 text-[#E8D4F0] text-xs md:text-sm font-semibold px-4 py-1.5 rounded-full">
                ⏱️ 5 preguntas · 2 minutos · sin compromiso
              </span>
              <Link href={ctaHref(CTA_HREF)} onClick={() => handleCTA("hero")}
                className="bg-white text-[#4A2368] font-bold rounded-full px-10 py-4 text-base md:text-lg hover:-translate-y-0.5 transition-all shadow-[0_10px_40px_rgba(255,255,255,.25)]">
                Responder las 5 preguntas →
              </Link>
              <p className="text-xs text-white/55">Pago único · Sin suscripción</p>
            </div>

            {/* Prueba social compacta, above-the-fold */}
            <div className="mt-9 flex flex-col items-center gap-4">
              <div className="flex items-center justify-center gap-3">
                <div className="flex -space-x-3">
                  {PSICOLOGAS.map((p) => (
                    <div key={p.name} className="ring-2 ring-[#2d0d3f] rounded-full">
                      <AvatarVideo src={p.video} />
                    </div>
                  ))}
                  <div className="w-11 h-11 rounded-full bg-white/15 backdrop-blur border-2 border-[#2d0d3f] flex items-center justify-center text-[11px] font-bold text-white">+150</div>
                </div>
                <p className="text-sm text-white/80 text-left leading-tight">Psicólogas<br /><span className="text-xs text-white/55">colegiadas reales</span></p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
                <span className="text-[#E8D4F0] font-semibold">★ 4,9/5 <span className="text-white/55 font-normal">· +8.000 pacientes hacen terapia con nosotros</span></span>
                <span className="text-white/70">🏛️ Firmado por colegiada</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ PRUEBA SOCIAL — rating destacado + carrusel de testimonios ═══════════ */}
        <section className="py-10 md:py-14 px-4 bg-[#FAF7F2]">
          <div className="max-w-5xl mx-auto">
            {/* Rating grande y protagonista */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mb-8 md:mb-10">
              <div className="text-center">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-serif text-5xl md:text-6xl text-[#6A178C] leading-none">4,9</span>
                  <span className="font-serif text-2xl md:text-3xl text-[#6A178C]/50">/5</span>
                </div>
                <div className="mt-1.5 text-[#E8B400] text-lg tracking-wide">★★★★★</div>
                <p className="mt-1 text-sm font-semibold text-black/70">750 reseñas verificadas</p>
              </div>
              <div className="hidden sm:block w-px h-16 bg-black/10" />
              <div className="flex flex-col gap-2 text-sm text-black/70">
                <span className="inline-flex items-center gap-2">🏛️ <span>Informes <strong className="text-black">firmados por colegiada</strong></span></span>
                <span className="inline-flex items-center gap-2">👩‍⚕️ <span><strong className="text-black">+150 psicólogas</strong> colegiadas reales</span></span>
                <span className="inline-flex items-center gap-2">🔁 <span>El <strong className="text-black">73%</strong> sigue en terapia después</span></span>
              </div>
            </div>

            {/* Carrusel de testimonios (6): scroll horizontal + flechas para ver el resto */}
            <div className="relative">
              <div ref={carRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {TESTIMONIOS.map((t) => (
                  <TestimonioCard key={t.name} t={t} />
                ))}
              </div>
              {/* Flechas (desktop) para recorrer los 6 testimonios */}
              <button type="button" aria-label="Ver testimonios anteriores" onClick={() => scrollCar(-1)}
                className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-[0_6px_20px_rgba(106,23,140,.15)] border border-[#6A178C]/10 items-center justify-center text-[#6A178C] text-xl hover:-translate-y-[calc(50%+2px)] transition-transform z-10">‹</button>
              <button type="button" aria-label="Ver más testimonios" onClick={() => scrollCar(1)}
                className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-[0_6px_20px_rgba(106,23,140,.15)] border border-[#6A178C]/10 items-center justify-center text-[#6A178C] text-xl hover:-translate-y-[calc(50%+2px)] transition-transform z-10">›</button>
            </div>
            <p className="text-center text-[11px] text-black/35 mt-2"><span className="md:hidden">desliza para ver más →</span><span className="hidden md:inline">usa las flechas para ver los 6 testimonios →</span></p>
          </div>
        </section>

        {/* ═══════════ QUÉ TE LLEVAS (valor antes que precio) ═══════════ */}
        <section className="py-12 md:py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-9">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">qué te llevas por {precio.texto}</p>
              <h2 className="font-serif text-[1.6rem] md:text-[2.5rem] leading-[1.15] text-black">No es una sesión más.<br />Es claridad.</h2>
              {/* Badge de los 3 entregables (mismo estilo persuasivo que el hero) */}
              <span className="mt-4 inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-[#6A178C]/8 border border-[#6A178C]/15 text-[#6A178C] text-xs md:text-sm font-semibold px-4 py-2 rounded-full">
                📄 Informe <span className="opacity-40">·</span> 👥 Psicóloga adecuada <span className="opacity-40">·</span> 💬 50 min de sesión
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              {/* Mockup real del informe — hace tangible el entregable principal */}
              <Reveal className="order-1 md:order-none">
                <InformeMockup className="md:max-w-[300px]" />
              </Reveal>

              {/* 3 entregables destacados — imagen ENCIMA (más estético), texto debajo */}
              <div className="grid gap-4">
                {[
                  { kind: "emoji", icon: "📄", t: "Informe clínico de 5-7 páginas", d: "Firmado por tu psicóloga colegiada. Es tuyo, lo relees cuando quieras, hagas lo que hagas después." },
                  { kind: "avatars", icon: "", t: "Matching con tu psicóloga", d: "Algorítmico clínico, no la primera disponible. Por eso el 73% sigue en terapia después." },
                  { kind: "laptop", icon: "💬", t: "50 min de videollamada", d: "Tu psicóloga llega con tu informe leído y un plan. No empiezas desde cero." },
                ].map((c) => (
                  <div key={c.t} className="bg-white rounded-3xl p-6 md:p-7 border border-black/5 shadow-[0_10px_40px_rgba(106,23,140,.06)] flex flex-col items-center text-center gap-4">
                    {/* visual encima */}
                    {c.kind === "avatars" ? (
                      <div className="flex -space-x-4">
                        {PSICOLOGAS.slice(0, 4).map((p) => (
                          <div key={p.name} className="ring-2 ring-white rounded-full scale-110">
                            <AvatarVideo src={p.video} />
                          </div>
                        ))}
                        <div className="w-11 h-11 rounded-full bg-[#6A178C]/10 ring-2 ring-white flex items-center justify-center text-[10px] font-bold text-[#6A178C]">+150</div>
                      </div>
                    ) : c.kind === "laptop" ? (
                      <LaptopVideollamada src={PSICOLOGAS[2].video} />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-[#6A178C]/10 flex items-center justify-center text-3xl">{c.icon}</div>
                    )}
                    <div>
                      <h3 className="font-serif text-xl text-black mb-1">{c.t}</h3>
                      <p className="text-sm text-black/70 leading-relaxed">{c.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ REGALO: ACCESO A LA APP ═══════════ */}
        <section className="px-4 pb-4 md:pb-8">
          <div className="max-w-5xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#6A178C] to-[#4A2368] text-white p-6 md:p-8 flex flex-col sm:flex-row items-center gap-5 shadow-[0_14px_40px_rgba(106,23,140,.18)]">
              <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="shrink-0 w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-3xl">🎁</div>
              <div className="relative text-center sm:text-left flex-1">
                <p className="font-handwriting text-lg text-[#E8D4F0]">y además, de regalo</p>
                <h3 className="font-serif text-xl md:text-2xl leading-tight">1 mes de Premium en la app de Mente Sana</h3>
                <p className="mt-1.5 text-sm text-white/80 leading-relaxed">Acceso completo a todo: tu informe siempre a mano, ejercicios, meditaciones y seguimiento con tu psicóloga. Incluido con tu diagnóstico.</p>
              </div>
              <span className="relative shrink-0 inline-flex items-center gap-1.5 bg-white text-[#4A2368] text-xs font-bold px-4 py-2 rounded-full">🎁 1 mes incluido</span>
            </div>
          </div>
        </section>

        {/* ═══════════ CÓMO FUNCIONA (baja; precio reencuadrado) — fondo lila para separarla ═══════════ */}
        <section className="py-12 md:py-16 px-4 bg-[#F3ECF9]">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-9">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">así de fácil</p>
              <h2 className="font-serif text-[1.6rem] md:text-[2.5rem] leading-[1.15] text-black">Cómo funciona, paso a paso</h2>
            </div>
            <div className="relative">
              {/* línea vertical que conecta los pasos */}
              <div className="absolute left-7 md:left-8 top-5 bottom-5 w-0.5 bg-gradient-to-b from-[#6A178C]/40 via-[#6A178C]/20 to-[#6A178C]/5" />
              <div className="space-y-7 md:space-y-8">
                {PASOS(precio).map((step, i) => {
                  const nn = String(step.n).padStart(2, "0");
                  return (
                    <Reveal key={step.n} delay={i * 60}>
                      <div className="flex items-start gap-4 md:gap-6 relative">
                        {/* número protagonista; el fondo tapa la línea detrás */}
                        <div className="relative z-10 shrink-0 w-14 md:w-16 flex justify-center">
                          <div className="relative bg-[#F3ECF9] px-1">
                            <span className="font-serif font-bold text-4xl md:text-5xl text-[#6A178C] leading-none tabular-nums">{nn}</span>
                          </div>
                        </div>
                        <div className="pt-1.5 md:pt-2.5">
                          {/* icono a la izquierda del título para que cada paso se lea de un vistazo */}
                          <h3 className="font-serif text-lg md:text-xl text-black leading-tight"><span className="mr-2" aria-hidden>{step.icon}</span>{step.title}</h3>
                          <p className="text-sm text-black/65 mt-1 leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ PSICÓLOGAS REALES (compacto) ═══════════ */}
        <section className="py-12 md:py-16 px-4 bg-[#FAF7F2]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">no son stock · son reales</p>
              <h2 className="font-serif text-[1.6rem] md:text-[2.5rem] leading-[1.15] text-black">Psicólogas que te atenderán</h2>
              <p className="mt-2 text-sm text-black/60">Todas colegiadas. Media de <strong>10 años</strong> de experiencia.</p>
            </div>
            {/* flex + justify-center: las dos últimas quedan centradas (grid equilibrado) */}
            <div className="flex flex-wrap justify-center gap-3 md:gap-4 max-w-4xl mx-auto">
              {PSICOLOGAS.map((p) => (
                <div key={p.name} className="w-[calc(33.333%-0.5rem)] md:w-[calc(20%-0.8rem)] bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(106,23,140,.04)] border border-black/[0.04]">
                  <div className="relative aspect-square overflow-hidden bg-[#6A178C]/5">
                    <PsychVideo src={p.video} />
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    <div className="absolute bottom-1.5 left-1.5 bg-white/95 text-[8px] font-bold text-[#6A178C] px-1.5 py-0.5 rounded-full">Colegiada</div>
                  </div>
                  <div className="p-2 text-center">
                    <p className="font-serif text-[12px] md:text-sm text-black leading-tight">{p.name}</p>
                    <p className="text-[9px] md:text-[10px] text-black/45 mt-0.5">Psicóloga colegiada</p>
                    <p className="text-[9px] md:text-[10px] font-semibold text-[#6A178C] mt-1 leading-tight">{p.focos}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ FAQ (comprimida) ═══════════ */}
        <section className="py-12 md:py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">las dudas reales</p>
              <h2 className="font-serif text-[1.6rem] md:text-[2.5rem] leading-[1.15] text-black">Preguntas que todo el mundo se hace</h2>
            </div>
            <div className="space-y-3">
              {FAQ.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={i} className="bg-white rounded-2xl border border-black/5 overflow-hidden">
                    <button onClick={() => toggleFaq(i)} className="w-full text-left p-5 flex items-center justify-between gap-4" aria-expanded={open}>
                      <span className="font-serif text-lg text-black pr-2">{f.q}</span>
                      <span className={`shrink-0 w-8 h-8 rounded-full bg-[#6A178C]/8 flex items-center justify-center text-[#6A178C] transition-transform ${open ? "rotate-45" : ""}`}>
                        <span className="text-lg leading-none">+</span>
                      </span>
                    </button>
                    {open && <div className="px-5 pb-5 -mt-1"><p className="text-sm text-black/70 leading-relaxed">{f.a}</p></div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════ CTA FINAL ═══════════ */}
        <section id="cta-final" className="py-14 md:py-20 px-4 bg-gradient-to-br from-[#08030c] via-[#170625] to-[#301049] text-white relative overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#6A178C] opacity-15 blur-3xl pointer-events-none" />
          <div className="max-w-4xl mx-auto relative">

            {/* Resumen de valor antes del CTA: mockup del informe + checklist */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-10 items-center mb-11 md:mb-14">
              <Reveal className="order-1 md:order-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/diagnostico-vsl/bodegon-informe.png"
                  alt="Informe de diagnóstico psicológico junto a la videollamada con tu psicóloga"
                  className="w-full max-w-[360px] mx-auto rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,.35)] ring-1 ring-white/10"
                />
              </Reveal>
              <div className="order-2 md:order-1 text-center md:text-left">
                <p className="font-handwriting text-lg text-[#E8D4F0] mb-2">esto es lo que te llevas</p>
                <p className="font-serif text-2xl md:text-[2rem] leading-tight mb-5">Por {precio.texto} recibes:</p>
                <ul className="space-y-3 max-w-sm mx-auto md:mx-0 text-left">
                  {[
                    "Informe clínico de 5-7 páginas",
                    "Psicóloga seleccionada para ti",
                    "50 min de videollamada",
                    "1 mes de Premium en la app (acceso a todo)",
                    "Pago único · Sin suscripción",
                  ].map((x) => (
                    <li key={x} className="flex items-start gap-3">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-[13px] text-[#E8D4F0]">✓</span>
                      <span className="text-sm md:text-base text-white/90 leading-snug">{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <h2 className="font-serif text-[2rem] md:text-[3rem] leading-[1.15] mb-6">
                {precio.texto} para entender<br /><em className="italic text-[#E8D4F0]">qué te pasa</em>.
              </h2>
              <Link href={ctaHref(CTA_HREF)} onClick={() => handleCTA("final")}
                className="inline-block bg-white text-[#4A2368] font-bold rounded-full px-10 py-4 text-base md:text-lg hover:-translate-y-0.5 transition-all shadow-[0_10px_40px_rgba(255,255,255,.25)]">
                Empezar ahora ({precio.texto}) →
              </Link>
              <p className="mt-4 text-xs text-white/55">Pago único · Sin suscripción</p>
            </div>
          </div>
        </section>

        <JustificacionPrecio precio={precio} />
      </main>

      {/* ═══════════ STICKY CTA PERSISTENTE (móvil + desktop) ═══════════ */}
      <div
        aria-hidden={!showStickyCTA}
        className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-black/5 shadow-[0_-8px_24px_rgba(106,23,140,.08)] px-4 py-3 transition-all duration-300 ${showStickyCTA ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-full opacity-0 pointer-events-none"}`}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-black leading-tight">Tu diagnóstico por {precio.texto}</p>
            <p className="text-[11px] text-black/50">2 min</p>
          </div>
          <Link href={ctaHref(CTA_HREF)} onClick={() => handleCTA("sticky")}
            className="flex-1 sm:flex-none flex items-center justify-center bg-[#6A178C] text-white font-bold rounded-full px-6 py-3.5 text-sm shadow-[0_8px_24px_rgba(106,23,140,.3)] hover:-translate-y-0.5 transition-all">
            Empezar ahora · {precio.texto}
          </Link>
        </div>
      </div>
    </>
  );
}
