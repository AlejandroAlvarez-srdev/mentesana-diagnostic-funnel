// Endpoint PÚBLICO de slots disponibles para el flujo /test-diagnostico.
// Recibe ?psychologist_name=Brenda+Castillo&days=7
// Devuelve { provider_id, slots:[{day,weekday,hour,iso}], error? }.
// Considera: appointments existentes + provider_blocked_slots (supabase) + days off (amelia).
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ameliaQuery, ameliaTable } from "@/lib/amelia-db";

const sb = createClient(
  process.env.NEXT_PUBLIC_BLOG_SUPABASE_URL!,
  process.env.BLOG_SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

// Guardarraíles del flujo de diagnóstico (hora Madrid): primera entrada 11:00,
// última entrada 20:00 (la sesión de las 20:00 termina a las 21:00). Las horas
// REALES salen del horario semanal que cada psicóloga tiene en Amelia
// (providers_to_weekdays + providers_to_periods); esto solo recorta los extremos.
const MIN_START_HOUR = 11;
const MAX_START_HOUR = 20;

// "HH:MM:SS" -> minutos desde medianoche.
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Madrid offset en minutos para un instante dado (CET=+60, CEST=+120).
function madridOffsetMin(at: Date): number {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", timeZoneName: "shortOffset" });
  const off = fmt.formatToParts(at).find(p => p.type === "timeZoneName")?.value ?? "GMT+1";
  const m = off.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const sign = m?.[1] === "-" ? -1 : 1;
  const hh = m ? +m[2] : 1;
  const mm = m?.[3] ? +m[3] : 0;
  return sign * (hh * 60 + mm);
}

// "YYYY-MM-DD" + hora Madrid → instante UTC ms.
function madridLocalToUtcMs(dateStr: string, hour: number, minute = 0): number {
  const [Y, M, D] = dateStr.split("-").map(Number);
  const naiveUtc = Date.UTC(Y, M - 1, D, hour, minute, 0);
  return naiveUtc - madridOffsetMin(new Date(naiveUtc)) * 60_000;
}

// "YYYY-MM-DD" para hoy en Madrid.
function todayMadridISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

// Suma days a una fecha "YYYY-MM-DD" en Madrid y devuelve el nuevo "YYYY-MM-DD".
function addDaysMadrid(dateStr: string, days: number): string {
  const [Y, M, D] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(Y, M - 1, D + days, 12));
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(dt);
}

// Día de la semana 0..6 para una fecha Madrid "YYYY-MM-DD".
function weekdayMadrid(dateStr: string): number {
  const [Y, M, D] = dateStr.split("-").map(Number);
  // Calendario gregoriano puro (sin TZ porque "YYYY-MM-DD" Madrid representa el día civil)
  return new Date(Date.UTC(Y, M - 1, D)).getUTCDay();
}

async function resolveProviderByName(name: string): Promise<{ id: number; name: string } | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/);
  // Intento 1: exact match firstName + último apellido contiene
  if (parts.length >= 2) {
    const fn = parts[0];
    const ln = parts.slice(1).join(" ");
    const r = await ameliaQuery<any>(
      `SELECT id, firstName, lastName FROM ${ameliaTable("users")}
       WHERE type='provider' AND status='visible' AND LOWER(firstName)=LOWER(?) AND LOWER(lastName) LIKE LOWER(?) LIMIT 1`,
      [fn, `%${ln}%`],
    );
    if (r.length > 0) return { id: Number(r[0].id), name: `${r[0].firstName} ${r[0].lastName}` };
  }
  // Intento 2: nombre completo LIKE
  const r2 = await ameliaQuery<any>(
    `SELECT id, firstName, lastName FROM ${ameliaTable("users")}
     WHERE type='provider' AND status='visible' AND LOWER(CONCAT(firstName,' ',lastName)) LIKE LOWER(?) LIMIT 1`,
    [`%${trimmed}%`],
  );
  if (r2.length > 0) return { id: Number(r2[0].id), name: `${r2[0].firstName} ${r2[0].lastName}` };
  // Intento 3 (fallback): solo firstName si es único entre providers visibles.
  // Cubre el caso de marketing hardcoded ("Brenda Castillo") vs Amelia real ("Brenda Jaramillo").
  const fn = parts[0];
  const r3 = await ameliaQuery<any>(
    `SELECT id, firstName, lastName FROM ${ameliaTable("users")}
     WHERE type='provider' AND status='visible' AND LOWER(firstName)=LOWER(?) LIMIT 2`,
    [fn],
  );
  if (r3.length === 1) return { id: Number(r3[0].id), name: `${r3[0].firstName} ${r3[0].lastName}` };
  return null;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const psyName = url.searchParams.get("psychologist_name") ?? "";
  const providerIdParam = url.searchParams.get("provider_id");
  const days = Math.min(Math.max(parseInt(url.searchParams.get("days") || "7"), 1), 14);

  let providerId: number | null = providerIdParam ? Number(providerIdParam) : null;
  let resolvedName: string | null = null;
  if (!providerId && psyName) {
    const r = await resolveProviderByName(psyName);
    providerId = r?.id ?? null;
    resolvedName = r?.name ?? null;
  }
  if (!providerId) {
    return NextResponse.json({ slots: [], provider_id: null, error: "psychologist_not_found" });
  }

  const ab = ameliaTable("appointments");
  const nowUtcMs = Date.now();
  const todayMad = todayMadridISO();
  const endMad = addDaysMadrid(todayMad, days);
  const endUtcMs = madridLocalToUtcMs(endMad, 0);
  const fmtMy = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");

  const rows = await ameliaQuery<{ bookingStart: string }>(
    `SELECT bookingStart FROM ${ab} WHERE providerId = ? AND bookingStart >= ? AND bookingStart < ? AND status NOT IN ('canceled','rejected') ORDER BY bookingStart ASC`,
    [providerId, fmtMy(nowUtcMs), fmtMy(endUtcMs)],
  );
  // Set de slots ocupados, indexados por (díaMadrid, horaMadrid) — convertimos
  // el bookingStart UTC del row a Madrid.
  const booked = new Set<string>();
  for (const r of rows) {
    if (!r.bookingStart) continue;
    const utcMs = new Date(r.bookingStart + "Z").getTime();
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
    }).formatToParts(new Date(utcMs)).reduce<Record<string, string>>((a, p) => { a[p.type] = p.value; return a; }, {});
    const dayKey = `${parts.year}-${parts.month}-${parts.day}`;
    const hourKey = parseInt(parts.hour, 10);
    booked.add(`${dayKey}_${hourKey}`);
  }

  const { data: blockedRows } = await sb
    .from("provider_blocked_slots")
    .select("start_at, end_at")
    .eq("provider_id", providerId)
    .gte("end_at", new Date(nowUtcMs).toISOString())
    .lte("start_at", new Date(endUtcMs).toISOString());
  const blockedRanges: { start: number; end: number }[] = (blockedRows ?? []).map((r: { start_at: string; end_at: string }) => ({
    start: new Date(r.start_at).getTime(),
    end: new Date(r.end_at).getTime(),
  }));

  const daysOff = await ameliaQuery<{ startDate: string; endDate: string }>(
    `SELECT startDate, endDate FROM ${ameliaTable("providers_to_daysoff")} WHERE userId = ?`,
    [providerId],
  );
  const fullDaysOff = new Set<string>();
  for (const r of (daysOff ?? [])) {
    if (!r.startDate || !r.endDate) continue;
    const s = new Date(r.startDate);
    const e = new Date(r.endDate);
    for (let t = s.getTime(); t <= e.getTime(); t += 86400000) {
      fullDaysOff.add(new Date(t).toISOString().slice(0, 10));
    }
  }

  // Horario semanal REAL de la psicóloga en Amelia. Cada (dayIndex 1=lun..7=dom)
  // tiene uno o varios periodos bookables; los huecos entre periodos (p.ej. un
  // descanso a mediodía) = horas bloqueadas que no se ofrecen.
  const weekRows = await ameliaQuery<{ dayIndex: number; startTime: string; endTime: string }>(
    `SELECT w.dayIndex AS dayIndex, p.startTime AS startTime, p.endTime AS endTime
       FROM ${ameliaTable("providers_to_weekdays")} w
       JOIN ${ameliaTable("providers_to_periods")} p ON p.weekDayId = w.id
      WHERE w.userId = ?`,
    [providerId],
  );
  const scheduleByDay = new Map<number, { startMin: number; endMin: number }[]>();
  for (const r of (weekRows ?? [])) {
    if (!r.startTime || !r.endTime) continue;
    const arr = scheduleByDay.get(r.dayIndex) ?? [];
    arr.push({ startMin: timeToMinutes(r.startTime), endMin: timeToMinutes(r.endTime) });
    scheduleByDay.set(r.dayIndex, arr);
  }
  const hasSchedule = scheduleByDay.size > 0;

  // Horas de inicio válidas (Madrid) para un día Amelia según su horario real,
  // recortadas a [MIN_START_HOUR, MAX_START_HOUR]. Una hora h vale si el slot de
  // 1h cabe entero dentro de algún periodo. Sin horario cargado -> ventana por
  // defecto, para no devolver 0 slots por un hueco de datos.
  function allowedHoursFor(ameliaDay: number): number[] {
    if (!hasSchedule) {
      return Array.from({ length: MAX_START_HOUR - MIN_START_HOUR + 1 }, (_, i) => MIN_START_HOUR + i);
    }
    const periods = scheduleByDay.get(ameliaDay) ?? [];
    const set = new Set<number>();
    for (const pr of periods) {
      for (let h = MIN_START_HOUR; h <= MAX_START_HOUR; h++) {
        if (h * 60 >= pr.startMin && (h + 1) * 60 <= pr.endMin) set.add(h);
      }
    }
    return [...set].sort((a, b) => a - b);
  }

  // Genera slots en hora MADRID, ordenados por día y por hora ascendente.
  const slots: { day: string; weekday: string; hour: number; iso: string }[] = [];
  const weekdayNames = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  // i=0 incluye HOY (mismo día); los slots ya pasados se filtran abajo por slotStartUtc<=now.
  for (let i = 0; i <= days; i++) {
    const dayStr = addDaysMadrid(todayMad, i);
    const dow = weekdayMadrid(dayStr);
    if (dow === 0 || dow === 6) continue; // sin sáb/dom
    if (fullDaysOff.has(dayStr)) continue;
    const ameliaDay = dow === 0 ? 7 : dow; // JS dom=0 -> Amelia 7; resto coincide
    for (const h of allowedHoursFor(ameliaDay)) {
      if (booked.has(`${dayStr}_${h}`)) continue;
      const slotStartUtc = madridLocalToUtcMs(dayStr, h);
      // No mostrar slots que ya pasaron (Madrid)
      if (slotStartUtc <= nowUtcMs) continue;
      const slotEndUtc = slotStartUtc + 3600_000;
      if (blockedRanges.some(r => slotStartUtc < r.end && slotEndUtc > r.start)) continue;
      slots.push({
        day: dayStr,
        weekday: weekdayNames[dow],
        hour: h,
        iso: new Date(slotStartUtc).toISOString(),
      });
    }
  }

  return NextResponse.json({
    slots,
    provider_id: providerId,
    psychologist_name: resolvedName ?? psyName,
    tz: "Europe/Madrid",
    debug: { booked_count: booked.size, blocked: blockedRanges.length, days_off: fullDaysOff.size, schedule_days: scheduleByDay.size, scanned_days: days },
  });
}
