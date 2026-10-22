"use client";

// Variante B del A/B #5 "una pantalla" (acción 2 de /interno/subir-el-082, oct-2026):
// psicóloga + hueco + pago en una sola vista. Hoy, de cada 100 que ven a su psicóloga
// pagan 22 (52 % eligen hora y 43 % de esos pagan); el objetivo es ≥ 30 %.
//
// Qué cambia respecto al control (fases schedule + payment de DiagnosticoMatching):
//   · el hueco más cercano llega ya elegido y los dos siguientes están a un toque;
//   · «Cambiar hora» y «¿Prefieres otra psicóloga?» son enlaces, no pantallas;
//   · el checkout de Stripe se monta embebido aquí mismo, sin botón de confirmar
//     (Apple Pay / Google Pay salen solos en móvil cuando el dispositivo los tiene);
//   · una barra fija arriba con el hueco, el precio y «Pagar» que baja al formulario.
// Cada hueco elegido crea una sesión nueva de Stripe (la anterior caduca sola, igual
// que el hold de 15 min de create-checkout). La variante la decide la cookie
// ms_ab_pago (proxy.ts); DiagnosticoMatching solo decide si pinta esto o el control.

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { track, getVisitorId as getAnalyticsVisitorId, getSessionId } from "@/lib/tracking";
import type { PrecioDiagnostico } from "@/lib/diagnostico-precio";

export type SlotLibre = { day: string; weekday: string; hour: number; iso: string };

type Props = {
  psych: { name: string; video?: string | null; photo?: string | null };
  temaLabel: string;
  slots: SlotLibre[];
  slotsLoading: boolean;
  slotsError: string | null;
  selectedDay: string;
  selectedSlot: string; // "HH:00" (hora Madrid)
  onSelect: (day: string, slot: string) => void;
  onPersistSchedule: (day: string, slot: string) => Promise<void>;
  onReroll: () => void;
  precio: PrecioDiagnostico;
  /** Variante del test diagnostico-v2 (va en la metadata de Stripe, como en el control). */
  ab: "A" | "B";
};

const hhmm = (hour: number) => `${String(hour).padStart(2, "0")}:00`;
const dayDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
// Solo la primera letra en mayúscula ("Jue 22 oct", "Jueves, 22 de octubre").
const cap1 = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const dayShort = (key: string) =>
  cap1(dayDate(key).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }).replace(/[.,]/g, ""));
const dayLong = (key: string) =>
  cap1(dayDate(key).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }));

// Stripe solo admite UNA instancia de Embedded Checkout viva. Las creaciones van en
// cola para que, si la persona cambia de hueco mientras la anterior aún se monta,
// la vieja termine (y se destruya) antes de arrancar la nueva.
let liveCheckout: { destroy: () => void } | null = null;
let queue: Promise<void> = Promise.resolve();

function InlineCheckout({ day, slot, psychName, precio, ab }: {
  day: string; slot: string; psychName: string; precio: PrecioDiagnostico; ab: "A" | "B";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    let mine: { destroy: () => void } | null = null;
    const job = async () => {
      if (!alive) return;
      try {
        // Misma fuente de UTMs que el control (lib/utm.ts: first-touch + last-touch).
        const { getUtms } = await import("@/lib/utm");
        const utms: Record<string, string> = { ...(getUtms() as Record<string, string>) };
        const p = new URLSearchParams(window.location.search);
        ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((k) => {
          const v = p.get(k);
          if (v) utms[k] = v;
        });
        utms.referrer = utms.referrer || document.referrer || "";
        utms.landing_page = utms.landing_page || "/test-diagnostico";

        const res = await fetch("/api/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Igual que el control: Stripe pide el email en su formulario y el
            // webhook lo recoge de customer_details.
            email: "",
            name: "",
            phone: "",
            psychologistName: psychName,
            source: "test-diagnostico",
            utms: { ...utms, scheduled_date: day, scheduled_time: slot },
            ab_diagnostico: ab,
            variante_precio: precio.variante,
            ms_visitor_id: getAnalyticsVisitorId(),
            ms_session_id: getSessionId(),
          }),
        });
        const data = await res.json();
        if (!alive) return;
        if (data.error) {
          setError(data.detail || data.error);
          setLoading(false);
          return;
        }
        const { loadStripe } = await import("@stripe/stripe-js");
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);
        if (!stripe || !alive) return;
        if (liveCheckout) {
          try { liveCheckout.destroy(); } catch { /* ya destruido */ }
          liveCheckout = null;
        }
        // createEmbeddedCheckoutPage ↔ ui_mode 'embedded_page' (ver create-checkout).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const checkout = await (stripe as any).createEmbeddedCheckoutPage({ clientSecret: data.clientSecret });
        if (!alive) { checkout.destroy(); return; }
        mine = checkout;
        liveCheckout = checkout;
        if (ref.current) {
          ref.current.innerHTML = "";
          checkout.mount(ref.current);
        }
        setLoading(false);
        // En el control este evento sale al pulsar «Confirmar y pagar»; aquí sale al
        // montarse el formulario (no hay botón). Para comparar variantes se usa
        // view_match_result → purchase, no este paso.
        track("initiate_checkout", { amount: precio.decimal, ab, pantalla: "una" });
      } catch (e) {
        if (alive) {
          setError(e instanceof Error ? e.message : "Error al cargar el pago");
          setLoading(false);
        }
      }
    };
    queue = queue.then(job, job);
    return () => {
      alive = false;
      if (mine) {
        try { mine.destroy(); } catch { /* ya destruido */ }
        if (liveCheckout === mine) liveCheckout = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, slot, psychName, retry]);

  return (
    <div>
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-9 h-9 border-4 border-purple/20 border-t-purple rounded-full animate-spin mb-3" />
          <p className="text-[13px] text-foreground/50">Cargando pago seguro…</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => { setError(""); setLoading(true); setRetry((r) => r + 1); }}
            className="mt-3 text-xs text-purple font-bold underline"
          >
            Reintentar
          </button>
        </div>
      )}
      <div ref={ref} className={`w-full ${loading || error ? "hidden" : "min-h-[480px]"}`} />
    </div>
  );
}

export default function PagoUnaPantalla({
  psych, temaLabel, slots, slotsLoading, slotsError, selectedDay, selectedSlot,
  onSelect, onPersistSchedule, onReroll, precio, ab,
}: Props) {
  const firstName = psych.name.split(" ")[0];
  const [expanded, setExpanded] = useState(false);
  // "day|slot" del hueco para el que está montado el checkout.
  const [activeKey, setActiveKey] = useState("");
  const userPicked = useRef(false);
  const payRef = useRef<HTMLDivElement>(null);

  // Agrupar por día (los slots ya vienen ordenados por día y hora, en hora Madrid).
  const byDay = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const s of slots) {
      const arr = m.get(s.day) ?? [];
      arr.push(s.hour);
      m.set(s.day, arr);
    }
    for (const [k, arr] of m) m.set(k, [...arr].sort((a, b) => a - b));
    return m;
  }, [slots]);
  const days = useMemo(() => Array.from(byDay.keys()).sort(), [byDay]);
  // Los tres huecos más cercanos a un toque; si la persona eligió otro, se añade.
  const chips = useMemo(() => {
    const list = slots.slice(0, 3).map((s) => ({ day: s.day, slot: hhmm(s.hour) }));
    if (selectedDay && selectedSlot && !list.some((c) => c.day === selectedDay && c.slot === selectedSlot)) {
      list.push({ day: selectedDay, slot: selectedSlot });
    }
    return list;
  }, [slots, selectedDay, selectedSlot]);

  // Cada hueco elegido (el automático o el que toca la persona) → select_slot,
  // guardado en BD y checkout nuevo para ese hueco. Con un pequeño retardo para no
  // crear una sesión de Stripe por cada toque rápido.
  useEffect(() => {
    if (!selectedDay || !selectedSlot) return;
    const key = `${selectedDay}|${selectedSlot}`;
    if (key === activeKey) return;
    const t = setTimeout(() => {
      track("select_slot", { day: selectedDay, slot: selectedSlot, psychologist: psych.name, ab, auto: !userPicked.current, pantalla: "una" });
      void onPersistSchedule(selectedDay, selectedSlot);
      setActiveKey(key);
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, selectedSlot, activeKey]);

  const pick = (day: string, slot: string) => {
    userPicked.current = true;
    onSelect(day, slot);
  };
  const scrollToPay = () => payRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const [activeDay, activeSlot] = activeKey ? activeKey.split("|") : ["", ""];
  const haveSlots = !slotsLoading && !slotsError && days.length > 0;

  return (
    <div className="min-h-screen bg-[#FFFAF2] flex flex-col">
      <header className="bg-white border-b border-purple/10 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Image src="/images/logo.webp" alt="Mente Sana" width={120} height={24} priority className="h-6 w-auto" />
          <span className="text-[11px] text-foreground/40 font-medium">Tu sesión y tu pago</span>
        </div>
      </header>

      {/* Barra fija: hueco elegido + precio + Pagar (baja al formulario de Stripe). */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 border-b border-purple/10 px-4 py-2">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12.5px] font-semibold text-foreground truncate">
              {selectedDay && selectedSlot ? `${dayShort(selectedDay)} · ${selectedSlot}h` : slotsLoading ? "Buscando tu hueco…" : "Sin hueco elegido"}
            </p>
            <p className="text-[11px] text-foreground/50 truncate">con {firstName} · {precio.texto}, pago único</p>
          </div>
          <button
            onClick={scrollToPay}
            disabled={!activeKey}
            className="shrink-0 bg-purple hover:bg-[#4e0d68] text-white font-bold rounded-full px-4 py-2 text-[13px] shadow-md transition-colors disabled:opacity-40"
          >
            Pagar {precio.texto} →
          </button>
        </div>
      </div>

      <main className="flex-1 px-4 py-5">
        <div className="max-w-lg mx-auto">
          {/* 1 · Tu psicóloga */}
          <section className="bg-white rounded-2xl border border-purple/10 p-3 mb-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-[76px] h-[76px] rounded-xl overflow-hidden bg-purple/5 shrink-0 relative">
                {psych.video ? (
                  <video src={psych.video} muted autoPlay loop playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                ) : psych.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={psych.photo} alt={psych.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">💜</div>
                )}
                <span className="absolute top-1 left-1 bg-purple text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow">TU MATCH</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-[17px] font-semibold leading-tight truncate">{psych.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="bg-green-50 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">✓ Colegiada</span>
                  <span className="text-[10px] text-foreground/45">Sesiones online</span>
                </div>
                <p className="text-[12px] text-purple/90 font-medium mt-1.5 leading-snug">
                  ✦ Elegida para tu perfil de <strong>{temaLabel}</strong> — llega a la sesión con tu test ya leído.
                </p>
              </div>
            </div>
          </section>

          {/* 2 · Tu hueco (ya elegido) */}
          <section className="bg-white rounded-2xl border border-purple/10 p-4 mb-3 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[11px] font-bold text-purple uppercase tracking-wider">Tu sesión · 50 min</p>
              {haveSlots && (
                <button onClick={() => setExpanded((e) => !e)} className="text-[12px] text-purple underline underline-offset-2">
                  {expanded ? "Ocultar horas" : "Cambiar hora →"}
                </button>
              )}
            </div>

            {slotsLoading && (
              <div className="flex items-center gap-2.5 py-3 text-[13px] text-foreground/60">
                <span className="w-4 h-4 border-2 border-purple/20 border-t-purple rounded-full animate-spin shrink-0" />
                Mirando la agenda real de {firstName}…
              </div>
            )}
            {!slotsLoading && slotsError && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-[13px] text-red-700">
                {slotsError === "psychologist_not_found"
                  ? `No hemos podido localizar la agenda de ${psych.name} ahora mismo. Escríbenos por WhatsApp y te confirmamos la cita manualmente.`
                  : "Error cargando disponibilidad. Vuelve a intentarlo en unos segundos."}
              </div>
            )}
            {!slotsLoading && !slotsError && days.length === 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-[13px] text-amber-800">
                {psych.name} no tiene huecos esta semana. Escríbenos por WhatsApp y te asignamos una colega con tu mismo perfil.
              </div>
            )}
            {haveSlots && (
              <>
                <p className="text-[12px] text-foreground/55 mb-2.5">Te hemos dejado elegido el más cercano. Toca otro si te viene mejor.</p>
                <div className="flex flex-wrap gap-2">
                  {chips.map((c) => {
                    const sel = c.day === selectedDay && c.slot === selectedSlot;
                    return (
                      <button
                        key={`${c.day}|${c.slot}`}
                        onClick={() => pick(c.day, c.slot)}
                        className={`rounded-xl border px-3 py-2 text-left transition-all ${
                          sel ? "bg-purple text-white border-purple shadow-md" : "bg-white border-purple/15 text-foreground/80 hover:border-purple/40"
                        }`}
                      >
                        <span className="block text-[11px] opacity-80">{dayShort(c.day)}</span>
                        <span className="block text-[15px] font-bold leading-tight">{c.slot}</span>
                      </button>
                    );
                  })}
                </div>
                {expanded && (
                  <div className="mt-3 pt-3 border-t border-purple/10">
                    <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                      {days.map((d) => {
                        const sel = d === selectedDay;
                        return (
                          <button
                            key={d}
                            onClick={() => pick(d, hhmm((byDay.get(d) ?? [])[0]))}
                            className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
                              sel ? "bg-purple text-white border-purple" : "bg-white border-purple/15 text-foreground/70"
                            }`}
                          >
                            {dayShort(d)}
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {(byDay.get(selectedDay) ?? []).map((h) => {
                        const s = hhmm(h);
                        const sel = s === selectedSlot;
                        return (
                          <button
                            key={s}
                            onClick={() => pick(selectedDay, s)}
                            className={`py-2 rounded-xl border text-[13px] font-semibold transition-all ${
                              sel ? "bg-purple text-white border-purple" : "bg-white border-purple/10 text-foreground/70 hover:border-purple/30"
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[10px] text-foreground/40">Hora de España</p>
                  </div>
                )}
              </>
            )}
          </section>

          {/* 3 · Pago, aquí mismo */}
          <section ref={payRef} className="scroll-mt-16 bg-white rounded-2xl border border-purple/10 p-4 mb-3 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-purple uppercase tracking-wider">Paga y deja reservado tu hueco</p>
                <p className="text-[13px] font-semibold mt-1">
                  {activeDay ? `${dayLong(activeDay)} · ${activeSlot}h` : "Elige un hueco arriba"}
                </p>
                <p className="text-[12px] text-foreground/55">Informe clínico + sesión de 50 min con {firstName}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-serif text-2xl font-bold text-purple">{precio.texto}</p>
                <p className="text-[10px] text-foreground/40">pago único</p>
              </div>
            </div>
            {activeKey ? (
              <InlineCheckout key={activeKey} day={activeDay} slot={activeSlot} psychName={psych.name} precio={precio} ab={ab} />
            ) : (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="w-9 h-9 border-4 border-purple/20 border-t-purple rounded-full animate-spin mb-3" />
                <p className="text-[13px] text-foreground/50">{haveSlots || slotsLoading ? "Preparando tu pago seguro…" : "Cuando tengas hueco, el pago aparece aquí."}</p>
              </div>
            )}
            <p className="mt-3 text-center text-[11px] text-foreground/45">
              🔒 Pago único de {precio.texto} · sin suscripción ni cargos automáticos · devolución si no encaja
            </p>
          </section>

          <button onClick={onReroll} className="w-full text-center text-[12px] text-purple hover:text-[#4e0d68] underline underline-offset-2 py-1">
            ¿Prefieres otra psicóloga? →
          </button>
          <p className="mt-2 text-center text-[10px] text-foreground/30">En tu extracto aparece como &ldquo;MS Servicios&rdquo;</p>
        </div>
      </main>
    </div>
  );
}
