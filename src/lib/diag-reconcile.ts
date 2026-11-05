// Reconciliación "pagó el 9,99 pero no tiene cita". Piezas PURAS compartidas entre
// el reconcile manual (/api/admin/reconcile-diag-booking) y el automático
// (/api/cron/reconcile-diag). Sin Stripe/MySQL aquí: solo tipos y decisiones, para
// poder testearlas.
import type Stripe from "stripe";

// ─── Metadata de la sesión ──────────────────────────────────────────────────
/** Metadata: directa o decodificada de client_reference_id (payment links base64). */
export function extractDiagMeta(s: Stripe.Checkout.Session): Record<string, string> {
  const meta = (s.metadata || {}) as Record<string, string>;
  if (meta.scheduled_date || meta.psychologist) return meta;
  if (s.client_reference_id) {
    try {
      const ref = s.client_reference_id;
      const padded = ref + "=".repeat((4 - (ref.length % 4)) % 4);
      const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf-8"));
      if (decoded && typeof decoded === "object") return { ...meta, ...decoded };
    } catch {}
  }
  return meta;
}

export interface DiagBookingFields {
  patientEmail: string;
  patientName: string;
  patientPhone: string | null;
  psychologist: string;
  scheduledDate: string; // 'YYYY-MM-DD' Madrid
  scheduledTime: string; // 'HH:MM' Madrid
}

/** Datos de la cita que el paciente eligió, tal y como los lee el reconcile manual. */
export function diagBookingFields(session: Stripe.Checkout.Session): DiagBookingFields {
  const meta = extractDiagMeta(session);
  return {
    patientEmail: (session.customer_details?.email || session.customer_email || "").trim(),
    patientName: (meta.patient_name || session.customer_details?.name || "").trim(),
    patientPhone: (meta.patient_phone || session.customer_details?.phone || "").trim() || null,
    psychologist: (meta.psychologist || "").trim(),
    scheduledDate: (meta.scheduled_date || "").trim(),
    scheduledTime: (meta.scheduled_time || "").trim(),
  };
}

export function isSessionPaid(s: Pick<Stripe.Checkout.Session, "payment_status" | "status">): boolean {
  return s.payment_status === "paid" || s.status === "complete";
}

/**
 * ¿Es una sesión que el webhook manda a la rama de cita del 9,99? Misma condición
 * que stripe-webhook/process.ts: sin metadata.product y amount_total === 999 (incluye
 * logopedia/nutrición, que llevan metadata.producto y comparten esa rama).
 */
export function isDiag999Session(s: Pick<Stripe.Checkout.Session, "amount_total" | "metadata">): boolean {
  return s.amount_total === 999 && !s.metadata?.product;
}

// ─── Decisión del cron ──────────────────────────────────────────────────────
export const RECONCILE_WINDOW_MS = 48 * 3600_000;
// Mínimo 10 min (el webhook puede seguir procesando) y nunca menos que el TTL del
// hold del checkout (15 min): antes de eso el hold del PROPIO paciente aún bloquea
// su hueco y canBookSlot lo vería como "manual_block" → falso needs_human.
export const RECONCILE_MIN_AGE_MS = 15 * 60_000;
export const RECONCILE_MAX_REPAIRS = 10;

export type SlotCheck =
  | { ok: true }
  | { ok: false; reason: string; transient?: boolean };

export interface ReconcileState {
  /** ms desde que se creó la checkout session. */
  ageMs: number;
  paid: boolean;
  isDiag999: boolean;
  /** psicóloga + fecha + hora presentes en la metadata. */
  hasBookingMeta: boolean;
  hasEmail: boolean;
  /** Ya existe una cita de Amelia ligada a esta sesión (o una activa desde el pago). */
  hasAppointment: boolean;
  /** null = no se pudo resolver/aún no consultado. */
  providerFound: boolean | null;
  /** null = no comprobado. */
  slot: SlotCheck | null;
}

export type ReconcileDecision =
  | { action: "repair" }
  | { action: "needs_human"; reason: string }
  | { action: "skip"; reason: string };

/**
 * Qué hacer con un pago de 9,99:
 *  - skip: no aplica (no pagado, no es la rama de cita, muy reciente/antiguo, ya tiene
 *    cita, sin datos de cita) o fallo transitorio (se reintenta en la próxima pasada).
 *  - needs_human: no se puede reparar sin decidir por el paciente (su hueco ya no está
 *    libre, la psicóloga no existe…). NUNCA se elige otro hueco automáticamente.
 *  - repair: el hueco ORIGINAL sigue libre → se crea la cita con la lógica oficial.
 */
export function decideReconcile(s: ReconcileState): ReconcileDecision {
  if (!s.paid) return { action: "skip", reason: "not_paid" };
  if (!s.isDiag999) return { action: "skip", reason: "not_diag_999" };
  if (s.ageMs < RECONCILE_MIN_AGE_MS) return { action: "skip", reason: "too_recent" };
  if (s.ageMs > RECONCILE_WINDOW_MS) return { action: "skip", reason: "too_old" };
  if (s.hasAppointment) return { action: "skip", reason: "has_appointment" };
  // Sin psicóloga/hueco en la metadata el webhook tampoco intenta crear cita (no es
  // un "pagó sin cita" de esta rama): no hay hueco original que respetar.
  if (!s.hasBookingMeta) return { action: "skip", reason: "no_booking_metadata" };
  if (!s.hasEmail) return { action: "needs_human", reason: "no_email" };
  if (s.providerFound === null) return { action: "skip", reason: "provider_unresolved" };
  if (!s.providerFound) return { action: "needs_human", reason: "provider_not_found" };
  if (!s.slot) return { action: "skip", reason: "slot_unchecked" };
  if (s.slot.ok) return { action: "repair" };
  if (s.slot.transient) return { action: "skip", reason: `slot_check_transient` };
  return { action: "needs_human", reason: `slot_${s.slot.reason}` };
}
