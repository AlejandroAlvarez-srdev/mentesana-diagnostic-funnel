// Pesos del match ponderado del 9,99 (nov-2026, detrás de MATCH_PONDERADO=1; APAGADO por defecto).
//
// Hoy /api/diagnostico/match-pool devuelve el pool y el cliente (DiagnosticoMatching.tsx) elige
// al azar uniforme entre las candidatas (las que tienen hueco hoy/mañana, o las 8 con primer
// hueco más próximo). Con el flag, cada psicóloga lleva un `weight` y el azar se pondera por:
//   (a) capacidad libre: menos citas reservadas en los próximos 7 días → más peso;
//   (b) asistencia histórica de SUS 9,99 en los últimos 90 días (semántica Amelia de
//       customer_bookings.status: 'pending' = ASISTIÓ, 'no-show'/'rejected' = NO asistió;
//       'approved' = aún sin marcar/futura y 'canceled' NO entran en el ratio),
//       con suavizado bayesiano hacia la media del pool para no castigar a las nuevas.
// Un suelo y un techo relativos mantienen la diversidad: nadie baja a ~0 ni acapara.
//
// Función pura (sin E/S) para poder testearla; la consulta SQL vive en la ruta.

export type ProviderMatchStats = {
  providerId: number;
  /** Citas reservadas (no canceladas/rechazadas) en los próximos 7 días, cualquier servicio. */
  bookedNext7d: number;
  /** 9,99 de los últimos 90 días con customer_bookings.status = 'pending' (asistió). */
  attended: number;
  /** 9,99 de los últimos 90 días con status 'no-show' o 'rejected' (no asistió). */
  missed: number;
};

export type MatchWeightOptions = {
  /** Peso del prior (en «citas equivalentes») del suavizado bayesiano de la asistencia. */
  priorStrength?: number;
  /** Suelo del peso relativo a la media (0,35 → nadie baja del 35 % de la psicóloga media). */
  floor?: number;
  /** Techo del peso relativo a la media. */
  cap?: number;
  /** Tasa de asistencia a usar si el pool no tiene ningún dato. */
  defaultAttendance?: number;
};

export const MATCH_WEIGHT_DEFAULTS: Required<MatchWeightOptions> = {
  priorStrength: 10,
  floor: 0.35,
  cap: 3,
  defaultAttendance: 0.7,
};

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const nn = (x: number) => (Number.isFinite(x) && x > 0 ? x : 0);

/**
 * Devuelve { providerId: peso } con media ≈ 1 (antes de suelo/techo), redondeado a 3 decimales.
 *
 *   capacidad  = (m + 1) / (m + 1 + reservadas)        m = mediana de reservadas del pool
 *                → 1 con agenda vacía, ≈ 0,5 con la carga mediana, → 0 si está llena.
 *   asistencia = ((asistió + k·r) / (asistió + no + k)) / r     r = tasa del pool, k = priorStrength
 *                → 1 para una psicóloga sin datos (nueva) o en la media del pool.
 *   peso       = capacidad · asistencia, normalizado a media 1 y acotado a [floor, cap].
 */
export function computeMatchWeights(stats: ProviderMatchStats[], options: MatchWeightOptions = {}): Record<number, number> {
  const o = { ...MATCH_WEIGHT_DEFAULTS, ...options };
  const out: Record<number, number> = {};
  if (!stats.length) return out;

  const rows = stats.map((s) => ({ id: s.providerId, booked: nn(s.bookedNext7d), att: nn(s.attended), miss: nn(s.missed) }));
  const totAtt = rows.reduce((a, r) => a + r.att, 0);
  const totMiss = rows.reduce((a, r) => a + r.miss, 0);
  // Tasa del pool acotada para que el prior nunca sea 0 ni 1 (evita divisiones degeneradas).
  const poolRate = Math.min(0.99, Math.max(0.01, totAtt + totMiss > 0 ? totAtt / (totAtt + totMiss) : o.defaultAttendance));
  const k = Math.max(0, o.priorStrength);
  const m = median(rows.map((r) => r.booked));

  const raw = rows.map((r) => {
    const capacity = (m + 1) / (m + 1 + r.booked);
    const n = r.att + r.miss;
    const posterior = n + k > 0 ? (r.att + k * poolRate) / (n + k) : poolRate;
    const attendance = posterior / poolRate;
    return { id: r.id, w: capacity * attendance };
  });
  const mean = raw.reduce((a, r) => a + r.w, 0) / raw.length;
  for (const r of raw) {
    const rel = mean > 0 ? r.w / mean : 1;
    const clamped = Math.min(o.cap, Math.max(o.floor, rel));
    out[r.id] = Math.round(clamped * 1000) / 1000;
  }
  return out;
}

/**
 * Elige un índice al azar proporcional a `weights`. `rnd` ∈ [0,1) (Math.random por defecto).
 * Pesos no finitos o ≤ 0 cuentan como 0; si todos son 0, reparto uniforme.
 */
export function weightedIndex(weights: number[], rnd: number = Math.random()): number {
  const ws = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const total = ws.reduce((a, w) => a + w, 0);
  if (!(total > 0)) return Math.min(weights.length - 1, Math.floor(rnd * weights.length));
  let target = rnd * total;
  for (let i = 0; i < ws.length; i++) {
    if (target < ws[i]) return i;
    target -= ws[i];
  }
  // Redondeo flotante: el último con peso > 0.
  for (let i = ws.length - 1; i >= 0; i--) if (ws[i] > 0) return i;
  return 0;
}
