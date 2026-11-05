import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import {
  RECONCILE_MIN_AGE_MS,
  RECONCILE_WINDOW_MS,
  decideReconcile,
  diagBookingFields,
  extractDiagMeta,
  isDiag999Session,
  isSessionPaid,
  type ReconcileState,
} from "./diag-reconcile";

const base: ReconcileState = {
  ageMs: 60 * 60_000,
  paid: true,
  isDiag999: true,
  hasBookingMeta: true,
  hasEmail: true,
  hasAppointment: false,
  providerFound: true,
  slot: { ok: true },
};
const d = (over: Partial<ReconcileState>) => decideReconcile({ ...base, ...over });

describe("decideReconcile", () => {
  it("repara si el hueco original sigue libre", () => {
    expect(d({})).toEqual({ action: "repair" });
  });

  it("no pagado / fuera de la rama 9,99 → skip", () => {
    expect(d({ paid: false })).toEqual({ action: "skip", reason: "not_paid" });
    expect(d({ isDiag999: false })).toEqual({ action: "skip", reason: "not_diag_999" });
  });

  it("respeta la ventana de edad (mín 15 min ≥ 10 min, máx 48 h)", () => {
    expect(RECONCILE_MIN_AGE_MS).toBeGreaterThanOrEqual(10 * 60_000);
    expect(d({ ageMs: 5 * 60_000 })).toEqual({ action: "skip", reason: "too_recent" });
    expect(d({ ageMs: RECONCILE_MIN_AGE_MS - 1 })).toEqual({ action: "skip", reason: "too_recent" });
    expect(d({ ageMs: RECONCILE_MIN_AGE_MS })).toEqual({ action: "repair" });
    expect(d({ ageMs: RECONCILE_WINDOW_MS + 1 })).toEqual({ action: "skip", reason: "too_old" });
  });

  it("ya tiene cita → skip (idempotente), aunque el hueco esté ocupado", () => {
    expect(d({ hasAppointment: true, slot: { ok: false, reason: "overlap_appointment" } })).toEqual({ action: "skip", reason: "has_appointment" });
  });

  it("sin datos de cita en la metadata → skip", () => {
    expect(d({ hasBookingMeta: false })).toEqual({ action: "skip", reason: "no_booking_metadata" });
  });

  it("sin email o psicóloga inexistente → needs_human", () => {
    expect(d({ hasEmail: false })).toEqual({ action: "needs_human", reason: "no_email" });
    expect(d({ providerFound: false })).toEqual({ action: "needs_human", reason: "provider_not_found" });
  });

  it("hueco ocupado / pasado / bloqueado → needs_human (NUNCA otro hueco)", () => {
    for (const reason of ["overlap_appointment", "past", "day_off", "manual_block", "out_of_working_hours"]) {
      expect(d({ slot: { ok: false, reason } })).toEqual({ action: "needs_human", reason: `slot_${reason}` });
    }
  });

  it("fallo transitorio comprobando el hueco → skip (se reintenta)", () => {
    expect(d({ slot: { ok: false, reason: "manual_block", transient: true } })).toEqual({ action: "skip", reason: "slot_check_transient" });
  });

  it("pendiente de resolver psicóloga/hueco → skip, nunca repair a ciegas", () => {
    expect(d({ providerFound: null })).toEqual({ action: "skip", reason: "provider_unresolved" });
    expect(d({ slot: null })).toEqual({ action: "skip", reason: "slot_unchecked" });
  });
});

const sess = (over: Partial<Stripe.Checkout.Session>) => ({
  id: "cs_test_1",
  amount_total: 999,
  metadata: {},
  payment_status: "paid",
  status: "complete",
  client_reference_id: null,
  customer_details: null,
  customer_email: null,
  ...over,
}) as unknown as Stripe.Checkout.Session;

describe("filtros de sesión", () => {
  it("isDiag999Session = misma condición que el webhook", () => {
    expect(isDiag999Session(sess({}))).toBe(true);
    expect(isDiag999Session(sess({ metadata: { producto: "logopedia" } }))).toBe(true);
    expect(isDiag999Session(sess({ metadata: { product: "ebook-sanando" } }))).toBe(false);
    expect(isDiag999Session(sess({ amount_total: 1399 }))).toBe(false);
  });

  it("isSessionPaid", () => {
    expect(isSessionPaid(sess({ payment_status: "unpaid", status: "open" }))).toBe(false);
    expect(isSessionPaid(sess({ payment_status: "paid", status: "open" }))).toBe(true);
  });

  it("extrae la cita de metadata o de client_reference_id (payment links)", () => {
    const ref = Buffer.from(JSON.stringify({ psychologist: "Ana P", scheduled_date: "2026-11-10", scheduled_time: "18:00" })).toString("base64").replace(/=+$/, "");
    expect(extractDiagMeta(sess({ client_reference_id: ref })).scheduled_time).toBe("18:00");
    const f = diagBookingFields(sess({
      metadata: { psychologist: " Ana P ", scheduled_date: "2026-11-10", scheduled_time: "18:00", patient_name: "X" },
      customer_details: { email: " x@y.z ", name: null, phone: null } as Stripe.Checkout.Session.CustomerDetails,
    }));
    expect(f).toEqual({ patientEmail: "x@y.z", patientName: "X", patientPhone: null, psychologist: "Ana P", scheduledDate: "2026-11-10", scheduledTime: "18:00" });
  });
});
