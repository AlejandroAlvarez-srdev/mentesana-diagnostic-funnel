"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
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

const PSICOLOGAS = [
  { name: "Adriana Salas", video: `${PSY_CDN}/adriana-salas.mp4` },
  { name: "Alejandra Elías", video: `${PSY_CDN}/alejandra-elias.mp4` },
  { name: "Giovanna Vago", video: `${PSY_CDN}/giovanna-vago.mp4` },
  { name: "Juliana Urioste", video: `${PSY_CDN}/juliana-urioste.mp4` },
  { name: "Leidy Vicuña", video: `${PSY_CDN}/leidy-vicuna.mp4` },
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

function PsychVideo({ src }: { src: string }) {
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
  return <video ref={ref} muted loop playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />;
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

export default function PorQueDiagnosticoB({ precio = PRECIO_ESTANDAR }: { precio?: PrecioDiagnostico } = {}) {
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
    if (typeof window === "undefined") return pv ? `${base}?${pv}` : base;
    const params = new URLSearchParams(window.location.search);
    const keep = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
    const qs = [...keep.filter((k) => params.get(k)).map((k) => `${k}=${encodeURIComponent(params.get(k)!)}`), pv].filter(Boolean).join("&");
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
              Un diagnóstico psicológico real — informe clínico + 50 min con tu psicóloga — por <strong className="text-white">{precio.texto}</strong>.
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
                <span className="text-[#E8D4F0] font-semibold">★ 4,6/5 <span className="text-white/55 font-normal">· 750 reseñas</span></span>
                <span className="text-white/70">🏛️ Firmado por colegiada</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ TESTIMONIO RÁPIDO (prueba social fuerte arriba) ═══════════ */}
        <section className="py-10 md:py-14 px-4 bg-[#FAF7F2]">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#6A178C]/10 shadow-[0_10px_40px_rgba(106,23,140,.06)]">
              <div className="flex items-center gap-3 mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/por-que-diagnostico/laura.webp" alt="Laura" className="w-12 h-12 rounded-full object-cover ring-2 ring-[#6A178C]/15" />
                <div>
                  <p className="text-sm font-semibold text-black">Laura M., 29 años</p>
                  <p className="text-[11px] text-black/45">tras 5 sesiones con su psicóloga asignada</p>
                </div>
                <span className="ml-auto text-[#E8B400] text-sm">★★★★★</span>
              </div>
              <p className="font-serif text-lg md:text-xl text-[#6A178C] italic leading-snug">
                &ldquo;Por primera vez sentí que estaba empezando desde algún sitio, no desde cero otra vez.&rdquo;
              </p>
              <p className="mt-3 text-sm text-black/65 leading-relaxed">
                Probó dos plataformas con primera sesión gratis y lo dejó en ambas. Con el Diagnóstico recibió un informe de 6 páginas y una psicóloga que llegó a la sesión con un plan concreto.
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════ QUÉ TE LLEVAS (valor antes que precio) ═══════════ */}
        <section className="py-12 md:py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-9">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">qué te llevas por {precio.texto}</p>
              <h2 className="font-serif text-[1.6rem] md:text-[2.5rem] leading-[1.15] text-black">No es una sesión más. Es claridad.</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4 md:gap-6">
              {[
                { icon: "📄", t: "Informe clínico de 5-7 páginas", d: "Firmado por tu psicóloga colegiada. Es tuyo, lo relees cuando quieras, hagas lo que hagas después." },
                { icon: "🎯", t: "Matching con tu psicóloga", d: "Algorítmico clínico, no la primera disponible. Por eso el 73% sigue en terapia después." },
                { icon: "💬", t: "50 min de videollamada", d: "Tu psicóloga llega con tu informe leído y un plan. No empiezas desde cero." },
              ].map((c) => (
                <div key={c.t} className="bg-white rounded-3xl p-6 md:p-7 border border-black/5 shadow-[0_10px_40px_rgba(106,23,140,.06)]">
                  <div className="w-12 h-12 rounded-2xl bg-[#6A178C]/10 flex items-center justify-center text-2xl mb-4">{c.icon}</div>
                  <h3 className="font-serif text-xl text-black mb-2">{c.t}</h3>
                  <p className="text-sm text-black/70 leading-relaxed">{c.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ CÓMO FUNCIONA (baja; precio reencuadrado) ═══════════ */}
        <section className="py-12 md:py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-9">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">así de fácil</p>
              <h2 className="font-serif text-[1.6rem] md:text-[2.5rem] leading-[1.15] text-black">Cómo funciona, paso a paso</h2>
            </div>
            <div className="relative">
              <div className="absolute left-[22px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-[#6A178C]/30 via-[#6A178C]/20 to-[#6A178C]/10" />
              {PASOS(precio).map((step) => (
                <div key={step.n} className="flex items-start gap-4 py-2.5 relative">
                  <div className="relative z-10 w-11 h-11 rounded-full bg-[#6A178C] text-white flex items-center justify-center text-lg shrink-0 shadow-lg shadow-[#6A178C]/25">{step.icon}</div>
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

        {/* ═══════════ PSICÓLOGAS REALES (compacto) ═══════════ */}
        <section className="py-12 md:py-16 px-4 bg-[#FAF7F2]">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">no son stock · son reales</p>
              <h2 className="font-serif text-[1.6rem] md:text-[2.5rem] leading-[1.15] text-black">Psicólogas que te atenderán</h2>
              <p className="mt-2 text-sm text-black/60">Todas colegiadas. Media de <strong>10 años</strong> de experiencia.</p>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 max-w-4xl mx-auto">
              {PSICOLOGAS.map((p) => (
                <div key={p.name} className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(106,23,140,.04)] border border-black/[0.04]">
                  <div className="relative aspect-square overflow-hidden bg-[#6A178C]/5">
                    <PsychVideo src={p.video} />
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    <div className="absolute bottom-1.5 left-1.5 bg-white/95 text-[8px] font-bold text-[#6A178C] px-1.5 py-0.5 rounded-full">Colegiada</div>
                  </div>
                  <div className="p-2 text-center">
                    <p className="font-serif text-[12px] md:text-sm text-black leading-tight">{p.name}</p>
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
        <section id="cta-final" className="py-14 md:py-20 px-4 bg-gradient-to-br from-[#1a0a1f] via-[#2d0d3f] to-[#4A2368] text-white relative overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#6A178C] opacity-15 blur-3xl pointer-events-none" />
          <div className="max-w-3xl mx-auto text-center relative">
            <p className="font-handwriting text-xl text-[#E8D4F0] mb-3">empieza hoy</p>
            <h2 className="font-serif text-[2rem] md:text-[3rem] leading-[1.15] mb-5">
              {precio.texto} para entender<br /><em className="italic text-[#E8D4F0]">qué te pasa</em>.
            </h2>
            <p className="text-base md:text-lg text-white/75 max-w-lg mx-auto mb-9">Informe + matching + 50 min con tu psicóloga.</p>
            <Link href={ctaHref(CTA_HREF)} onClick={() => handleCTA("final")}
              className="inline-block bg-white text-[#4A2368] font-bold rounded-full px-10 py-4 text-base md:text-lg hover:-translate-y-0.5 transition-all shadow-[0_10px_40px_rgba(255,255,255,.25)]">
              Empezar ahora ({precio.texto}) →
            </Link>
            <p className="mt-4 text-xs text-white/55">Pago único · Sin suscripción</p>
          </div>
        </section>

        <JustificacionPrecio precio={precio} />

        <Footer />
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
