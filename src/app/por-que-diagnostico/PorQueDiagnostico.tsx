"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";
import { track } from "@/lib/tracking";

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

  useEffect(() => {
    track("view_intermediate_landing", {
      source: new URLSearchParams(window.location.search).get("utm_source") || "direct",
    });

    let fired50 = false, fired100 = false;
    function onScroll() {
      const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (pct >= 0.5 && !fired50) { fired50 = true; track("scroll_depth_50", { page: "por-que-diagnostico" }); }
      if (pct >= 0.95 && !fired100) { fired100 = true; track("scroll_depth_100", { page: "por-que-diagnostico" }); }
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
        <section className="relative overflow-hidden bg-gradient-to-br from-[#1a0a1f] via-[#2d0d3f] to-[#4A2368] text-white pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(circle at 25% 30%, rgba(201,169,209,.35), transparent 45%), radial-gradient(circle at 75% 70%, rgba(139,47,181,.45), transparent 55%)" }} />
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#6A178C] opacity-20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-[#8B2FB5] opacity-20 blur-3xl pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 relative text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-xs md:text-sm mb-6">
              <span className="font-handwriting text-base text-[#E8D4F0]">un momento antes de empezar</span>
            </div>
            <h1 className="font-serif text-[2.25rem] md:text-6xl lg:text-7xl leading-[1.05] max-w-4xl mx-auto">
              Por 9,99€ empiezas con<br />
              <em className="italic text-[#E8D4F0]">claridad</em>. No con <em className="italic text-[#C9A9D1]">ruleta</em>.
            </h1>
            <p className="mt-6 md:mt-8 text-base md:text-xl text-white/80 leading-relaxed max-w-2xl mx-auto">
              La mayoría de psicólogos online te ofrecen una primera sesión gratis. Nosotros cobramos 9,99€ para darte algo que ellos no pueden: un diagnóstico real antes de que empieces.
            </p>

            <div className="mt-10 flex flex-col items-center gap-3">
              <Link href={ctaHref(CTA_HREF)} onClick={() => handleCTA("hero")}
                className="bg-white text-[#4A2368] font-bold rounded-full px-10 py-4 text-base md:text-lg hover:-translate-y-0.5 transition-all shadow-[0_10px_40px_rgba(255,255,255,.25)]">
                Quiero mi diagnóstico →
              </Link>
              <p className="text-xs text-white/55">Pago único · Sin suscripción · Con garantía</p>
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
        <section className="section-padding px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">la diferencia real</p>
              <h2 className="font-serif text-3xl md:text-5xl text-black">
                Primera sesión gratis <span className="text-black/40">vs</span><br />
                Diagnóstico Mente Sana
              </h2>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-3xl overflow-hidden border border-black/5 shadow-[0_20px_60px_rgba(106,23,140,.08)]">
              <div className="grid grid-cols-3 bg-[#FAF7F2] border-b border-black/5">
                <div className="p-5 text-sm font-semibold text-black/50"></div>
                <div className="p-5 text-sm font-semibold text-black/50 border-l border-black/5">Primera sesión gratis<br /><span className="text-xs font-normal">(la mayoría de plataformas)</span></div>
                <div className="p-5 text-sm font-bold text-[#6A178C] border-l border-black/5 bg-[#6A178C]/[0.04]">Diagnóstico Mente Sana<br /><span className="text-xs font-semibold">9,99€</span></div>
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
        <section className="section-padding px-4 bg-[#FAF7F2]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">por qué 9,99€ y no gratis</p>
              <h2 className="font-serif text-3xl md:text-5xl text-black">Tres razones honestas</h2>
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

        {/* ═══════════ POR QUÉ TAN BARATO ═══════════ */}
        <section className="section-padding px-4">
          <div className="max-w-3xl mx-auto text-center">
            <p className="font-handwriting text-xl text-[#6A178C] mb-2">una pregunta razonable</p>
            <h2 className="font-serif text-3xl md:text-5xl text-black mb-6">¿Por qué solo 9,99€?</h2>
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
        <section className="section-padding px-4 bg-[#1a0a1f] text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(circle at 20% 50%, rgba(139,47,181,.4), transparent 40%), radial-gradient(circle at 80% 50%, rgba(201,169,209,.3), transparent 40%)" }} />
          <div className="max-w-4xl mx-auto relative">
            <div className="text-center mb-14">
              <p className="font-handwriting text-xl text-[#E8D4F0] mb-2">qué pasa exactamente</p>
              <h2 className="font-serif text-3xl md:text-5xl">Desde hoy hasta tu sesión</h2>
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
        <section className="section-padding px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">cómo funciona el informe</p>
              <h2 className="font-serif text-3xl md:text-5xl text-black">No te etiquetamos.<br />Te entendemos.</h2>
            </div>
            <div className="bg-white rounded-3xl p-7 md:p-10 border border-black/5 shadow-[0_10px_40px_rgba(106,23,140,.06)] space-y-5 text-base md:text-lg text-black/75 leading-relaxed">
              <p>Hay informes que abres esperando saber qué te pasa y sales con una etiqueta que te deja peor. El nuestro no va por ahí.</p>
              <p>Describimos <strong>patrones</strong>, no diagnósticos asustadores. Tus patrones de pensamiento, de relación, de cómo regulas lo que sientes. Y, a partir de ahí, una propuesta de trabajo concreta.</p>
              <p>Si tu caso requiere un profesional sanitario de mayor complejidad (psiquiatra, terapia especializada), te lo decimos con honestidad en el informe. Sin drama.</p>
              <p className="pt-2 border-t border-black/5 italic text-black/60">Escrito para que lo entiendas. Firmado por quien sí te puede ayudar.</p>
            </div>
          </div>
        </section>

        {/* ═══════════ METODOLOGÍA ═══════════ */}
        <section className="section-padding px-4 bg-[#FAF7F2]">
          <div className="max-w-4xl mx-auto text-center">
            <p className="font-handwriting text-xl text-[#6A178C] mb-2">el rigor detrás</p>
            <h2 className="font-serif text-3xl md:text-5xl text-black mb-8">Respaldo metodológico</h2>
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
        <section className="section-padding px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">una historia real</p>
              <h2 className="font-serif text-3xl md:text-5xl text-black">El caso de Laura</h2>
            </div>
            <div className="bg-gradient-to-br from-[#6A178C]/[0.04] to-[#8B2FB5]/[0.06] rounded-3xl p-7 md:p-10 border border-[#6A178C]/10 space-y-5 text-base md:text-lg text-black/80 leading-relaxed">
              <p>
                Laura, 29, llevaba tres años dándole vueltas. Probó dos plataformas de terapia con primera sesión gratis. En ambas conectó 20 minutos con dos psicólogas distintas, pagó el primer bono, fue a tres sesiones y lo dejó. <em className="text-black/60">"Nunca supe si estaba haciendo terapia o hablando con alguien que apuntaba cosas."</em>
              </p>
              <p>
                Cuando hizo el Diagnóstico Mente Sana, recibió un informe de 6 páginas que le puso palabras a algo que llevaba años sin saber nombrar. En la sesión, su psicóloga ya había leído el informe y llegó con un plan concreto de 8 sesiones.
              </p>
              <p className="font-serif text-xl text-[#6A178C] italic pt-3 border-t border-[#6A178C]/10">
                "Por primera vez sentí que estaba empezando desde algún sitio, no desde cero otra vez."
              </p>
              <p className="text-sm text-black/55">— Laura M., 29 años · tras 5 sesiones con su psicóloga asignada</p>
            </div>
          </div>
        </section>

        {/* ═══════════ GARANTÍA ═══════════ */}
        <section className="section-padding px-4 bg-[#FAF7F2]">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl p-8 md:p-12 border-2 border-[#6A178C]/20 shadow-[0_20px_60px_rgba(106,23,140,.12)] text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#6A178C]/10 mb-6">
                <span className="text-3xl">🛡️</span>
              </div>
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">nuestra promesa</p>
              <h2 className="font-serif text-3xl md:text-5xl text-black mb-5">Garantía audaz</h2>
              <p className="text-base md:text-lg text-black/75 leading-relaxed mb-4">
                Si después del diagnóstico y la sesión de 50 minutos no te aportamos valor, te devolvemos los 9,99€. Sin preguntas. Sin formularios. Un email y se procesa.
              </p>
              <p className="text-sm text-black/55 italic">No queremos tu dinero si no te ayudamos. Punto.</p>
            </div>
          </div>
        </section>

        {/* ═══════════ FAQ ═══════════ */}
        <section className="section-padding px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">preguntas que todo el mundo se hace</p>
              <h2 className="font-serif text-3xl md:text-5xl text-black">Las dudas reales</h2>
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
        <section className="section-padding px-4 bg-gradient-to-br from-[#1a0a1f] via-[#2d0d3f] to-[#4A2368] text-white relative overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#6A178C] opacity-15 blur-3xl pointer-events-none" />
          <div className="max-w-3xl mx-auto text-center relative">
            <p className="font-handwriting text-xl text-[#E8D4F0] mb-3">ya lo entiendes</p>
            <h2 className="font-serif text-3xl md:text-5xl lg:text-6xl leading-[1.05] mb-6">
              9,99€ para empezar con<br />
              <em className="italic text-[#E8D4F0]">claridad</em>.
            </h2>
            <p className="text-base md:text-lg text-white/75 leading-relaxed max-w-xl mx-auto mb-10">
              Informe clínico firmado + matching real + sesión de 50 minutos con tu psicóloga. Todo por menos que una cena.
            </p>
            <Link href={ctaHref(CTA_HREF)} onClick={() => handleCTA("final")}
              className="inline-block bg-white text-[#4A2368] font-bold rounded-full px-10 py-4 text-base md:text-lg hover:-translate-y-0.5 transition-all shadow-[0_10px_40px_rgba(255,255,255,.25)]">
              Recibir mi diagnóstico (9,99€) →
            </Link>
            <p className="mt-4 text-xs text-white/55">Pago único · Sin suscripción · Devolución garantizada</p>
          </div>
        </section>

        <Footer />
      </main>

      {/* ═══════════ STICKY MOBILE CTA ═══════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-lg border-t border-black/5 shadow-[0_-8px_24px_rgba(106,23,140,.08)] px-4 py-3">
        <Link href={ctaHref(CTA_HREF)} onClick={() => handleCTA("sticky_mobile")}
          className="flex items-center justify-center bg-[#6A178C] text-white font-bold rounded-full px-6 py-3.5 text-sm shadow-[0_8px_24px_rgba(106,23,140,.3)]">
          Recibir mi diagnóstico · 9,99€
        </Link>
      </div>
    </>
  );
}
