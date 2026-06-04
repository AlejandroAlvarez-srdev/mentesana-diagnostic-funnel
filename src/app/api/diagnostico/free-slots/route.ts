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

const HOURS = [9, 10, 11, 12, 16, 17, 18, 19, 20, 21];

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
       WHERE type='provider' AND LOWER(firstName)=LOWER(?) AND LOWER(lastName) LIKE LOWER(?) LIMIT 1`,
      [fn, `%${ln}%`],
    );
    if (r.length > 0) return { id: Number(r[0].id), name: `${r[0].firstName} ${r[0].lastName}` };
  }
  // Intento 2: nombre completo LIKE
  const r2 = await ameliaQuery<any>(
    `SELECT id, firstName, lastName FROM ${ameliaTable("users")}
     WHERE type='provider' AND LOWER(CONCAT(firstName,' ',lastName)) LIKE LOWER(?) LIMIT 1`,
    [`%${trimmed}%`],
  );
  if (r2.length > 0) return { id: Number(r2[0].id), name: `${r2[0].firstName} ${r2[0].lastName}` };
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
  const now = new Date();
  const endDate = new Date(now.getTime() + days * 86400000);
  const fmt = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
  const rows = await ameliaQuery<any>(
    `SELECT bookingStart FROM ${ab} WHERE providerId = ? AND bookingStart >= ? AND bookingStart < ? AND status NOT IN ('canceled','rejected') ORDER BY bookingStart ASC`,
    [providerId, fmt(now), fmt(endDate)],
  );
  const booked = new Set<string>();
  for (const r of rows) {
    if (!r.bookingStart) continue;
    const d = new Date(r.bookingStart);
    booked.add(`${d.toISOString().slice(0, 10)}_${d.getHours()}`);
  }

  const { data: blockedRows } = await sb
    .from("provider_blocked_slots")
    .select("start_at, end_at")
    .eq("provider_id", providerId)
    .gte("end_at", now.toISOString())
    .lte("start_at", endDate.toISOString());
  const blockedRanges: { start: number; end: number }[] = (blockedRows ?? []).map((r: any) => ({
    start: new Date(r.start_at).getTime(),
    end: new Date(r.end_at).getTime(),
  }));

  const daysOff = await ameliaQuery<any>(
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

  const slots: { day: string; weekday: string; hour: number; iso: string }[] = [];
  const weekdayNames = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  for (let i = 1; i <= days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    const dayStr = d.toISOString().slice(0, 10);
    if (fullDaysOff.has(dayStr)) continue;
    for (const h of HOURS) {
      const key = `${dayStr}_${h}`;
      if (booked.has(key)) continue;
      const slotStart = new Date(d.getTime() + h * 3600 * 1000).getTime();
      const slotEnd = slotStart + 3600 * 1000;
      if (blockedRanges.some(r => slotStart < r.end && slotEnd > r.start)) continue;
      slots.push({ day: dayStr, weekday: weekdayNames[dow], hour: h, iso: new Date(slotStart).toISOString() });
    }
  }

  return NextResponse.json({
    slots,
    provider_id: providerId,
    psychologist_name: resolvedName ?? psyName,
    debug: { booked_count: booked.size, blocked: blockedRanges.length, days_off: fullDaysOff.size },
  });
}
