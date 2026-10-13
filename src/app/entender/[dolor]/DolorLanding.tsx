"use client";

// Landing "por dolor" (brief Ad Boost 01-oct-2026). Misma estructura de 11 bloques
// para las tres: eyebrow · hero · espejo · reencuadre · prueba social · qué te llevas ·
// cómo funciona · psicólogas · FAQ · cierre · barra fija. El copy vive en
// ../_data/dolores.ts; aquí solo hay maqueta (heredada de /por-que-diagnostico).
import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import AppFeatureBanner from "@/components/AppFeatureBanner";
import { track } from "@/lib/tracking";
import { PRECIO_ESTANDAR } from "@/lib/diagnostico-precio";
import { FAQ_FIJA, PASOS, PSICOLOGAS_DOLOR, type DolorConfig } from "../_data/dolores";

const PRECIO = PRECIO_ESTANDAR.texto;
const PSY_CDN = "https://your-project.supabase.co/storage/v1/object/public/mentesana-videos/welcome";
// Dato de marca de la base (/por-que-diagnostico): adherencia post-diagnóstico.
const PCT_SIGUE_TERAPIA = "73%";
// Capturas reales de reseñas publicadas en Trustpilot (public/images/reviews). Se muestran
// como selección, sin atribuir una media global de Trustpilot.
const TRUSTPILOT_URL = "https://es.trustpilot.com/review/mentesanapsicologia.com";
const TRUSTPILOT_CAPTURAS = Array.from({ length: 11 }, (_, i) => i + 1);

function PsychVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = true;
    el.defaultMuted = true;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { if (!el.src) el.src = src; el.play().catch(() => {}); }
        else el.pause();
      });
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [src]);
  return <video ref={ref} autoPlay muted loop playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />;
}

function AvatarVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = true;
    if (!el.src) el.src = src;
    el.play().catch(() => {});
  }, [src]);
  return (
    <div className="relative w-11 h-11 rounded-full overflow-hidden bg-[#6A178C]/30">
      <video ref={ref} autoPlay muted loop playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
    </div>
  );
}

export default function DolorLanding({ cfg }: { cfg: DolorConfig }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showSticky, setShowSticky] = useState(false);
  const espejoRef = useRef<HTMLDivElement>(null);
  const testiRef = useRef<HTMLDivElement>(null);
  const scrollBy = (ref: RefObject<HTMLDivElement | null>, dir: number) => ref.current?.scrollBy({ left: dir * Math.min(360, ref.current.clientWidth * 0.85), behavior: "smooth" });
  const page = `dolor_${cfg.slug}`;
  const psicologas = cfg.psicologas.map((k) => PSICOLOGAS_DOLOR[k]).filter(Boolean);
  const faq = [...cfg.faq, ...FAQ_FIJA];

  useEffect(() => {
    track("view_dolor_landing", { dolor: cfg.slug, source: new URLSearchParams(window.location.search).get("utm_source") || "direct" });
    const fired = { 25: false, 50: false, 75: false, 100: false };
    function onScroll() {
      const h = document.body.scrollHeight - window.innerHeight;
      if (h <= 0) return;
      const pct = window.scrollY / h;
      ([25, 50, 75, 100] as const).forEach((m) => {
        const th = m === 100 ? 0.95 : m / 100;
        if (pct >= th && !fired[m]) { fired[m] = true; track(`scroll_depth_${m}`, { page }); }
      });
      const final = document.getElementById("cta-final");
      const inFinal = final ? final.getBoundingClientRect().top < window.innerHeight : false;
      setShowSticky(window.scrollY > window.innerHeight * 0.8 && !inFinal);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [cfg.slug, page]);

  // CTA del brief: /test-diagnostico?angulo=<dolor>. Arrastra UTMs/click-ids de la URL.
  const ctaHref = (position: string) => {
    const sp = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
    sp.set("angulo", cfg.slug);
    sp.set("ref", `entender-${cfg.slug}`);
    sp.set("cta", position);
    return `/test-diagnostico?${sp.toString()}`;
  };
  const onCta = (position: string) => track(`click_cta_${page}`, { position });

  return (
    <>
      <main className="min-h-screen bg-[#FFFAF2] text-black">
        {/* ═══════════ 01 · HERO ═══════════ */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#1a0a1f] via-[#2d0d3f] to-[#4A2368] text-white pt-14 pb-14 md:pt-24 md:pb-20">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle at 25% 30%, rgba(201,169,209,.35), transparent 45%), radial-gradient(circle at 75% 70%, rgba(139,47,181,.45), transparent 55%)" }} />
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#6A178C] opacity-20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-[#8B2FB5] opacity-20 blur-3xl pointer-events-none" />
          {/* Foto real sutil entrando desde el lateral, integrada con un degradado morado.
              Si aún no existe la imagen del ángulo, el degradado la tapa y no se nota. */}
          <div className="absolute inset-y-0 right-0 w-3/5 hidden lg:block pointer-events-none" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/images/entender/${cfg.slug}/hero.jpg`} alt="" className="w-full h-full object-cover object-center opacity-50" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, #2d0d3f 0%, rgba(45,13,63,0.92) 38%, rgba(45,13,63,0.55) 70%, rgba(45,13,63,0.35) 100%)" }} />
          </div>
          <div className="max-w-5xl mx-auto px-4 relative z-10 text-center">
            {/* EYEBROW — pegado al H1, sin pill flotante (quita el tercer nivel de lectura) */}
            <p className="font-handwriting text-lg md:text-xl text-[#E8D4F0] mb-2">{cfg.eyebrow}</p>
            <h1 className="font-serif text-[2rem] md:text-5xl lg:text-[3.4rem] leading-[1.12] max-w-4xl mx-auto" style={{ textWrap: "balance" }}>{cfg.hero.h1}</h1>
            <p className="mt-5 md:mt-7 text-base md:text-xl text-white/80 leading-relaxed max-w-2xl mx-auto">{cfg.hero.sub}</p>
            {/* 9,99€ PROTAGONISTA — es uno de los mayores argumentos de la oferta */}
            <div className="mt-7 flex flex-col items-center">
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-5xl md:text-6xl leading-none text-white">{PRECIO}</span>
                <span className="text-xs md:text-sm font-bold tracking-[0.15em] text-white/70 uppercase">Pago único</span>
              </div>
              <p className="mt-2 text-sm text-white/60">Sin suscripción · Sin compromiso</p>
            </div>
            {/* CTA — sin duplicar microfrases alrededor del botón */}
            <div className="mt-7 flex flex-col items-center gap-3">
              <p className="text-sm text-white/55">5 preguntas · 2 minutos</p>
              <Link href={ctaHref("hero")} onClick={() => onCta("hero")} className="bg-white text-[#4A2368] font-bold rounded-full px-10 py-4 text-base md:text-lg hover:-translate-y-0.5 transition-all shadow-[0_10px_40px_rgba(255,255,255,.25)]">
                Responder las 5 preguntas →
              </Link>
            </div>
            {/* Prueba social — una sola franja; caras para humanizar, sin repetir la cifra */}
            <div className="mt-10 flex flex-col items-center gap-3">
              <div className="flex -space-x-3">
                {psicologas.map((p) => (
                  <div key={p.name} className="ring-2 ring-[#2d0d3f] rounded-full"><AvatarVideo src={`${PSY_CDN}/${p.video}.mp4`} /></div>
                ))}
              </div>
              <p className="text-sm text-white/80 leading-relaxed">
                <strong className="text-white">+150</strong> psicólogas colegiadas <span className="text-white/35">·</span> <strong className="text-white">★ 4,9/5</strong> <span className="text-white/35">·</span> <strong className="text-white">+8.000</strong> pacientes
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════ 02 · ESPEJO (tarjetas visuales en carrusel) ═══════════ */}
        <section className="py-16 md:py-20 overflow-hidden">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <p className="font-handwriting text-xl text-[#6A178C] mb-2">{cfg.espejo.kicker}</p>
            <h2 className="font-serif text-[1.75rem] md:text-[2.5rem] leading-[1.15]">{cfg.espejo.title}</h2>
          </div>
          <div className="relative mt-9 max-w-6xl mx-auto">
            {/* Flechas (desktop) para recorrer las situaciones */}
            <button type="button" aria-label="Anterior" onClick={() => scrollBy(espejoRef, -1)} className="hidden lg:flex absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-black/10 shadow-md items-center justify-center text-[#6A178C] hover:bg-[#F3ECF9]">‹</button>
            <button type="button" aria-label="Siguiente" onClick={() => scrollBy(espejoRef, 1)} className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-black/10 shadow-md items-center justify-center text-[#6A178C] hover:bg-[#F3ECF9]">›</button>
            <div ref={espejoRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth px-4 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {[...cfg.espejo.scenes, ...(cfg.espejo.scenes2?.items ?? [])].map((s, i) => (
                <figure key={s} className="snap-start shrink-0 w-[240px] md:w-[280px]">
                  <div className="rounded-2xl overflow-hidden bg-white border border-black/[0.05] shadow-[0_4px_20px_rgba(106,23,140,.06)] h-full flex flex-col">
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-[#2d0d3f] via-[#4A2368] to-[#6A178C]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/images/entender/${cfg.slug}/escena-${i + 1}.jpg`} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    </div>
                    <figcaption className="p-5 text-[15px] leading-relaxed text-black/80 font-serif flex-1">{s}</figcaption>
                  </div>
                </figure>
              ))}
            </div>
          </div>
          <p className="mt-9 text-center font-serif text-xl md:text-2xl text-black px-4">{cfg.espejo.closing}</p>
        </section>

        {/* ═══════════ 03 · REENCUADRE (texto, más compacta; informe destacado) ═══════════ */}
        <section className="py-12 md:py-16 px-4 bg-white border-y border-black/5">
          <div className="max-w-2xl mx-auto">
            <p className="font-handwriting text-xl text-[#6A178C] mb-2">{cfg.reencuadre.kicker}</p>
            <h2 className="font-serif text-[1.9rem] md:text-[2.75rem] leading-[1.12]">{cfg.reencuadre.title}</h2>
            {cfg.reencuadre.paragraphs.slice(0, -1).map((p) => <p key={p} className="mt-5 text-[17px] md:text-[19px] leading-relaxed text-black/75">{p}</p>)}
            {cfg.reencuadre.paragraphs.length > 0 && (
              <div className="mt-7 rounded-2xl p-5 md:p-6 border" style={{ background: "linear-gradient(135deg, #FBF4E8 0%, #F0E3F7 100%)", borderColor: "rgba(106,23,140,0.15)" }}>
                <p className="text-[16px] md:text-[17px] leading-relaxed text-black/80">{cfg.reencuadre.paragraphs[cfg.reencuadre.paragraphs.length - 1]}</p>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════ 04 · PRUEBA SOCIAL (franja de autoridad + carrusel) ═══════════ */}
        <section className="py-14 md:py-20 px-4">
          <div className="max-w-5xl mx-auto">
            {/* Franja de autoridad — cada dato separado y fácil de identificar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-10">
              {[
                { big: "★ 4,9/5", small: "+750 reseñas verificadas" },
                { big: "Informes", small: "firmados por colegiada" },
                { big: "+150", small: "psicólogas colegiadas" },
                { big: PCT_SIGUE_TERAPIA, small: "sigue en terapia después" },
              ].map((a) => (
                <div key={a.small} className="rounded-2xl bg-white border border-black/[0.05] p-4 text-center">
                  <p className="font-serif text-xl md:text-2xl text-[#6A178C] leading-tight">{a.big}</p>
                  <p className="text-xs text-black/55 mt-1 leading-tight">{a.small}</p>
                </div>
              ))}
            </div>
            {/* Testimonios — carrusel, una historia protagonista por vez */}
            <div className="relative">
              <button type="button" aria-label="Anterior testimonio" onClick={() => scrollBy(testiRef, -1)} className="hidden lg:flex absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-black/10 shadow-md items-center justify-center text-[#6A178C] hover:bg-[#F3ECF9]">‹</button>
              <button type="button" aria-label="Siguiente testimonio" onClick={() => scrollBy(testiRef, 1)} className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-black/10 shadow-md items-center justify-center text-[#6A178C] hover:bg-[#F3ECF9]">›</button>
              <div ref={testiRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {cfg.testimonios.map((t) => (
                  <figure key={t.quien} className="snap-center shrink-0 w-[88%] sm:w-[62%] md:w-[47%] bg-white rounded-2xl p-6 md:p-7 border border-black/[0.05] shadow-[0_4px_20px_rgba(106,23,140,.05)]">
                    <figcaption className="text-sm text-black/55"><strong className="text-[#6A178C]">{t.quien}</strong> · {t.contexto}</figcaption>
                    <blockquote className="font-serif leading-snug text-black mt-3 text-xl md:text-2xl">«{t.cita}»</blockquote>
                    <p className="mt-3 text-[15px] text-black/65 leading-relaxed">{t.detalle}</p>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ 04b · TRUSTPILOT (bloque independiente, fondo propio) ═══════════ */}
        <section className="py-12 md:py-16 bg-[#F3ECF9] border-y border-black/5 overflow-hidden">
          <div className="max-w-5xl mx-auto text-center mb-7 px-4">
            <p className="font-handwriting text-xl text-[#6A178C] mb-2">Reseñas reales</p>
            <h3 className="font-serif text-[1.5rem] md:text-[2rem] leading-[1.15]">Lo que cuentan <em className="italic text-[#6A178C]">en Trustpilot</em></h3>
          </div>
          <div aria-label="Capturas de reseñas publicadas en Trustpilot" className="marquee-track flex gap-5 w-max" style={{ animation: "marquee 75s linear infinite" }}>
            {[0, 1].flatMap((dup) => TRUSTPILOT_CAPTURAS.map((n) => (
              <div key={`${dup}-${n}`} aria-hidden={dup === 1} className="shrink-0 rounded-2xl overflow-hidden bg-white border border-black/[0.06]" style={{ width: "clamp(260px, 32vw, 340px)", boxShadow: "0 10px 30px rgba(106,23,140,0.06)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/images/reviews/review-${n}.webp`} alt={dup === 0 ? `Reseña ${n} publicada en Trustpilot` : ""} loading="lazy" className="block w-full h-auto" />
              </div>
            )))}
          </div>
          <p className="text-center text-xs text-black/45 mt-5 px-4">
            Capturas sin editar ·{" "}
            <a href={TRUSTPILOT_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-[#6A178C]">ver el perfil en Trustpilot ↗</a>
          </p>
        </section>

        {/* ═══════════ 05 · QUÉ TE LLEVAS ═══════════ */}
        <section className="py-16 md:py-20 px-4 bg-white border-y border-black/5">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">Qué te llevas por {PRECIO}</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.5rem] leading-[1.15]">No es una sesión más. Es claridad.</h2>
              <p className="mt-3 text-black/55">Informe · Psicóloga adecuada · 50 min de sesión</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4 md:gap-5">
              {[
                { icon: "📄", t: "Informe clínico de 5-7 páginas", d: `${cfg.informe} Firmado por tu psicóloga colegiada. Es tuyo, lo relees cuando quieras, hagas lo que hagas después.` },
                { icon: "🎯", t: "Matching con tu psicóloga", d: `Algorítmico clínico, no la primera disponible. Por eso el ${PCT_SIGUE_TERAPIA} sigue en terapia después.` },
                { icon: "💬", t: "50 min de videollamada", d: "Tu psicóloga llega con tu informe leído y un plan. No empiezas desde cero." },
              ].map((c) => (
                <div key={c.t} className="rounded-2xl p-6 bg-[#FFFAF2] border border-black/[0.05]">
                  <div className="text-2xl mb-3" aria-hidden>{c.icon}</div>
                  <h3 className="font-serif text-xl leading-snug">{c.t}</h3>
                  <p className="mt-2 text-[15px] text-black/65 leading-relaxed">{c.d}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl p-5 md:p-6 border flex gap-4 items-start" style={{ background: "linear-gradient(135deg, #FBF4E8 0%, #F0E3F7 100%)", borderColor: "rgba(106,23,140,0.15)" }}>
              <span className="text-2xl" aria-hidden>🎁</span>
              <div>
                <h3 className="font-serif text-lg leading-snug">Y además, de regalo: 1 mes de Premium en la app de Mente Sana</h3>
                <p className="mt-1 text-[15px] text-black/65 leading-relaxed">Acceso completo a todo: tu informe siempre a mano, ejercicios, meditaciones y seguimiento con tu psicóloga. Incluido con tu diagnóstico.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ 06 · CÓMO FUNCIONA (línea de tiempo) ═══════════ */}
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">Así de fácil</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.5rem] leading-[1.15]">Cómo funciona, paso a paso</h2>
            </div>
            {/* Desktop: timeline horizontal con línea fina que conecta 01→06 */}
            <ol className="hidden md:grid grid-cols-6 gap-2 relative">
              <div className="absolute top-5 left-[8.33%] right-[8.33%] h-px bg-[#6A178C]/25" aria-hidden />
              {PASOS.map((p) => {
                const hot = p.n === "04";
                return (
                  <li key={p.n} className="relative text-center px-1.5">
                    <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center font-serif text-sm relative z-10 ${hot ? "bg-[#6A178C] text-white ring-4 ring-[#6A178C]/15" : "bg-white text-[#6A178C] border border-[#6A178C]/30"}`}>{p.n}</div>
                    <h3 className="font-semibold text-sm mt-3 leading-tight">{p.t}</h3>
                    <p className="text-xs text-black/55 mt-1 leading-relaxed">{p.d}</p>
                  </li>
                );
              })}
            </ol>
            {/* Móvil: timeline vertical */}
            <ol className="md:hidden relative pl-12">
              <div className="absolute left-[19px] top-3 bottom-3 w-px bg-[#6A178C]/25" aria-hidden />
              {PASOS.map((p) => {
                const hot = p.n === "04";
                return (
                  <li key={p.n} className="relative pb-7 last:pb-0">
                    <div className={`absolute -left-12 top-0 w-10 h-10 rounded-full flex items-center justify-center font-serif text-sm ${hot ? "bg-[#6A178C] text-white ring-4 ring-[#6A178C]/15" : "bg-white text-[#6A178C] border border-[#6A178C]/30"}`}>{p.n}</div>
                    <h3 className="font-semibold leading-tight">{p.t}</h3>
                    <p className="text-sm text-black/55 mt-1 leading-relaxed">{p.d}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ═══════════ 07 · PSICÓLOGAS ═══════════ */}
        <section className="py-16 md:py-20 px-4 bg-[#FAF7F2]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">no son stock · son reales</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.15]">Psicólogas que te atenderán</h2>
              <p className="mt-3 text-base text-black/60 max-w-xl mx-auto">Todas colegiadas. Media de <strong>6 años de experiencia</strong>.</p>
            </div>
            <div className="flex md:grid md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5 max-w-5xl mx-auto overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {psicologas.map((p) => (
                <div key={p.name} className="shrink-0 w-[44%] sm:w-[38%] md:w-auto snap-start bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(106,23,140,.04)] border border-black/[0.04]">
                  <div className="relative aspect-square overflow-hidden bg-[#6A178C]/5">
                    <PsychVideo src={`${PSY_CDN}/${p.video}.mp4`} />
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm text-[9px] font-bold text-[#6A178C] px-2 py-1 rounded-full tracking-wide">Colegiada</div>
                  </div>
                  <div className="p-3 md:p-4 text-center">
                    <p className="font-serif text-sm md:text-base leading-tight">{p.name}</p>
                    <p className="text-[11px] text-[#6A178C] font-semibold mt-1">Psicóloga colegiada</p>
                    <p className="text-[11px] text-black/55 mt-1">{p.tags}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-14">
              <p className="font-serif text-5xl md:text-6xl text-[#6A178C] font-bold leading-none">+500</p>
              <p className="mt-2 text-sm text-black/55">psicólogas en el equipo</p>
            </div>
          </div>
        </section>

        {/* ═══════════ 08 · FAQ ═══════════ */}
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <p className="font-handwriting text-xl text-[#6A178C] mb-2">Las dudas reales</p>
              <h2 className="font-serif text-[1.75rem] md:text-[2.5rem] leading-[1.15]">Preguntas que todo el mundo se hace</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-3 items-start">
              {faq.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={f.q} className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: open ? "#6A178C" : "rgba(0,0,0,0.08)" }}>
                    <button type="button" aria-expanded={open} onClick={() => { setOpenFaq(open ? null : i); if (!open) track("faq_open", { page, q: f.q }); }} className="w-full text-left px-5 py-4 flex justify-between items-center gap-4">
                      <span className="font-semibold text-[15px] md:text-base" style={{ color: open ? "#6A178C" : "#111" }}>{f.q}</span>
                      <span className="text-xl shrink-0 text-[#6A178C]" aria-hidden>{open ? "−" : "+"}</span>
                    </button>
                    {open && <p className="px-5 pb-5 text-[15px] text-black/70 leading-relaxed">{f.a}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* App Mente Sana (iconografía de la base: el brief la mantiene; el mes Premium va en "Qué te llevas") */}
        <div className="py-10 md:py-14"><AppFeatureBanner variant="asistente" tone="dark" /></div>

        {/* ═══════════ 09 · CIERRE ═══════════ */}
        <section id="cta-final" className="py-16 md:py-20 px-4 bg-gradient-to-br from-[#1a0a1f] via-[#2d0d3f] to-[#4A2368] text-white relative overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#6A178C] opacity-15 blur-3xl pointer-events-none" />
          <div className="max-w-2xl mx-auto relative text-center">
            <p className="font-handwriting text-xl text-[#E8D4F0] mb-3">Esto es lo que te llevas</p>
            {/* Precio protagonista */}
            <p className="flex items-baseline justify-center gap-3 flex-wrap">
              <span className="text-base text-white/70">Por solo</span>
              <span className="font-serif text-5xl md:text-6xl leading-none">{PRECIO}</span>
              <span className="text-base text-white/70">recibes:</span>
            </p>
            {/* Checklist en pills, dos columnas, con aire */}
            <ul className="mt-8 grid sm:grid-cols-2 gap-3 max-w-xl mx-auto text-left">
              {["Informe clínico de 5-7 páginas", "Psicóloga seleccionada para ti", "50 min de videollamada", "1 mes de Premium en la app (acceso a todo)", "Pago único · Sin suscripción"].map((t) => (
                <li key={t} className="flex items-center gap-3 text-[15px] bg-white/[0.06] border border-white/10 rounded-full px-4 py-3 leading-tight">
                  <span className="w-6 h-6 rounded-full bg-[#E8D4F0] text-[#2d0d3f] text-xs font-bold flex items-center justify-center shrink-0" aria-hidden>✓</span>{t}
                </li>
              ))}
            </ul>
            <h2 className="font-serif text-[1.75rem] md:text-[2.75rem] leading-[1.12] mt-10" style={{ textWrap: "balance" }}>{cfg.cierreLinea}</h2>
            <div className="mt-8 flex flex-col items-center gap-3">
              <Link href={ctaHref("final")} onClick={() => onCta("final")} className="inline-block bg-white text-[#4A2368] font-bold rounded-full px-10 py-4 text-base md:text-lg hover:-translate-y-0.5 transition-all shadow-[0_10px_40px_rgba(255,255,255,.25)]">
                Empezar ahora ({PRECIO}) →
              </Link>
              <p className="text-xs text-white/55">Pago único · Sin suscripción</p>
            </div>
          </div>
        </section>
      </main>

      {/* ═══════════ 10 · BARRA FIJA (móvil) ═══════════ */}
      <div aria-hidden={!showSticky} className={`fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-lg border-t border-black/5 shadow-[0_-8px_24px_rgba(106,23,140,.08)] px-4 py-3 transition-all duration-300 ${showSticky ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-full opacity-0 pointer-events-none"}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-black/60 leading-tight">Tu diagnóstico por {PRECIO}<br />2 min</span>
          <Link href={ctaHref("sticky")} onClick={() => onCta("sticky")} tabIndex={showSticky ? 0 : -1} className="flex-1 flex items-center justify-center bg-[#6A178C] text-white font-bold rounded-full px-6 py-3.5 text-sm shadow-[0_8px_24px_rgba(106,23,140,.3)]">
            Empezar ahora · {PRECIO}
          </Link>
        </div>
      </div>
    </>
  );
}
