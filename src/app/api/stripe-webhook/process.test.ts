import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";
import { processCheckoutSessionCompleted, type ProcessDeps, type SupabaseLike } from "./process";
import { nutricionPaidEmail } from "@/lib/emails/nutricion-paid";
import { diagnosticoSlotTakenEmail } from "@/lib/emails/diagnostico-slot-taken";

// ---------- helpers ----------

function makeSupabaseMock(opts: { upsertError?: string; claimEmpty?: boolean } = {}): {
  client: SupabaseLike;
  upsertCalls: Array<{ table: string; payload: Record<string, unknown> }>;
  updateCalls: Array<{ table: string; payload: Record<string, unknown>; where: [string, string] }>;
} {
  const upsertCalls: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const updateCalls: Array<{ table: string; payload: Record<string, unknown>; where: [string, string] }> = [];
  const client: SupabaseLike = {
    from(table: string) {
      return {
        upsert: async (payload) => {
          upsertCalls.push({ table, payload });
          return { error: opts.upsertError ? { message: opts.upsertError } : null };
        },
        update: (payload) => ({
          eq: (col, val) => {
            updateCalls.push({ table, payload, where: [col, val] });
            const awaited = { error: null as null };
            return {
              then: (resolve: (v: typeof awaited) => void) => resolve(awaited),
              is: (_isCol: string, _isVal: null) => ({
                select: async (_columns?: string) => ({
                  data: opts.claimEmpty ? [] : [{ id: "1" }],
                  error: null,
                }),
              }),
            } as unknown as PromiseLike<{ error: null }> & {
              is(column: string, value: null): {
                select(columns?: string): Promise<{ data: { id: string }[]; error: null }>;
              };
            };
          },
        }),
      };
    },
  };
  return { client, upsertCalls, updateCalls };
}

function makeDeps(overrides: Partial<ProcessDeps> = {}): {
  deps: ProcessDeps;
  sendEmail: ReturnType<typeof vi.fn>;
  fetchPdf: ReturnType<typeof vi.fn>;
  supabaseMock: ReturnType<typeof makeSupabaseMock>;
} {
  const supabaseMock = makeSupabaseMock();
  const sendEmail = vi.fn(async () => ({ success: true }));
  const fetchPdf = vi.fn(async () => "BASE64PDFDATA");
  const deps: ProcessDeps = {
    supabase: supabaseMock.client,
    sendEmail,
    fetchPdf,
    buildEbookEmail: ({ name }) => ({ subject: `eBook ${name}`, html: "<p>ebook</p>" }),
    buildSessionEmail: ({ name, amount }) => ({ subject: `Sesión ${name} ${amount}`, html: "<p>sesion</p>" }),
    buildSlotTakenEmail: ({ name }) => ({ subject: `Slot ocupado ${name}`, html: "<p>slot-taken</p>" }),
    origin: "https://mentesanapsicologia.com",
    ...overrides,
  };
  return { deps, sendEmail, fetchPdf, supabaseMock };
}

function makeSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_test_123",
    object: "checkout.session",
    amount_total: 999,
    currency: "eur",
    customer_email: "test@example.com",
    customer_details: { email: "test@example.com", name: "Leidy Galindo" } as Stripe.Checkout.Session.CustomerDetails,
    payment_intent: "pi_test_1",
    payment_status: "paid",
    status: "complete",
    payment_method_types: ["card"],
    metadata: {
      patient_name: "Leidy Galindo",
      patient_phone: "+34 XXX XXX XXX",
      psychologist: "Monica Guiza",
      source: "test-sobrio",
    },
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

// ---------- tests ----------

describe("processCheckoutSessionCompleted", () => {
  beforeEach(() => vi.clearAllMocks());

  it("guarda en payments y envía email de sesión cuando NO hay product", async () => {
    const { deps, sendEmail, supabaseMock } = makeDeps();
    const session = makeSession();

    const result = await processCheckoutSessionCompleted(session, deps);

    expect(result.branch).toBe("session");
    expect(result.paymentSaved).toBe(true);
    expect(result.emailSent).toBe(true);
    expect(result.errors).toEqual([]);

    // upsert payments
    const payments = supabaseMock.upsertCalls.find((c) => c.table === "payments");
    expect(payments).toBeDefined();
    expect(payments?.payload.stripe_session_id).toBe("cs_test_123");
    expect(payments?.payload.patient_email).toBe("test@example.com");
    expect(payments?.payload.amount_cents).toBe(999);
    expect(payments?.payload.psychologist).toBe("Monica Guiza");

    // email
    expect(sendEmail).toHaveBeenCalledOnce();
    const emailArgs = sendEmail.mock.calls[0][0];
    expect(emailArgs.to).toBe("test@example.com");
    expect(emailArgs.subject).toContain("Leidy Galindo");
    expect(emailArgs.subject).toContain("9,99");
    expect(emailArgs.attachments).toBeUndefined();
  });

  it("logopedia (metadata.producto): etiqueta payments, mantiene source y pide la plantilla de logopedia", async () => {
    const buildSessionEmail = vi.fn(({ name, producto }: { name: string; producto?: string }) => ({ subject: `Sesión ${name} ${producto}`, html: "<p>logopedia</p>" }));
    const { deps, sendEmail, supabaseMock } = makeDeps({ buildSessionEmail });
    const session = makeSession({
      metadata: { patient_name: "Ana Pérez", psychologist: "Maria Alejandra Quintero", source: "test-logopedia", producto: "logopedia" },
    });

    const result = await processCheckoutSessionCompleted(session, deps);

    expect(result.branch).toBe("session");
    expect(result.emailSent).toBe(true);
    const payments = supabaseMock.upsertCalls.find((c) => c.table === "payments");
    expect(payments?.payload.producto).toBe("logopedia");
    expect(payments?.payload.producto_embudo).toBe("logopedia_9_99");
    expect(payments?.payload.source).toBe("test-logopedia");
    const diag = supabaseMock.upsertCalls.find((c) => c.table === "diagnostico_tests");
    expect(diag?.payload.source).toBe("test-logopedia");
    expect(buildSessionEmail).toHaveBeenCalledWith(expect.objectContaining({ producto: "logopedia", psychologistName: "Maria Alejandra Quintero" }));
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendEmail.mock.calls[0][0].subject).toContain("logopedia");
  });

  it("diagnóstico de siempre: payments NO lleva columnas de producto y el email es el del diagnóstico", async () => {
    const buildSessionEmail = vi.fn(({ name, producto }: { name: string; producto?: string }) => ({ subject: `Sesión ${name} ${producto}`, html: "<p>diag</p>" }));
    const { deps, supabaseMock } = makeDeps({ buildSessionEmail });
    const session = makeSession({ metadata: { patient_name: "Leidy Galindo", psychologist: "Monica Guiza", source: "test-diagnostico" } });

    await processCheckoutSessionCompleted(session, deps);

    const payments = supabaseMock.upsertCalls.find((c) => c.table === "payments");
    expect(payments?.payload).not.toHaveProperty("producto");
    expect(payments?.payload).not.toHaveProperty("producto_embudo");
    expect(buildSessionEmail).toHaveBeenCalledWith(expect.objectContaining({ producto: "diagnostico" }));
  });

  it.each([true, false])("nutrición conserva producto, source y email (metadata explícita: %s)", async (explicit) => {
    const buildSessionEmail = vi.fn(nutricionPaidEmail);
    const { deps, sendEmail, supabaseMock } = makeDeps({ buildSessionEmail });
    const session = makeSession({ metadata: { patient_name: "Ana", psychologist: "Nutricionista 01", source: "test-nutricion", ...(explicit ? { producto: "nutricion" } : {}) } });
    const result = await processCheckoutSessionCompleted(session, deps);
    expect(result.emailSent).toBe(true);
    expect(supabaseMock.upsertCalls.find(c => c.table === "payments")?.payload).toMatchObject({ producto: "nutricion", producto_embudo: "nutricion", source: "test-nutricion", amount_cents: 999 });
    expect(supabaseMock.upsertCalls.find(c => c.table === "diagnostico_tests")?.payload.source).toBe("test-nutricion");
    expect(buildSessionEmail).toHaveBeenCalledWith(expect.objectContaining({ producto: "nutricion" }));
    expect(sendEmail.mock.calls[0][0].html).toContain("48 h tras la consulta");
    expect(sendEmail.mock.calls[0][0].html).not.toMatch(/logopeda|psicóloga|App Store|Google Play/);
  });

  it("email de nutrición incluye la cita real, Meet y plan; el de incidencia usa la profesión correcta", () => {
    const email = nutricionPaidEmail({ name: "Ana", psychologistName: "Nutricionista 01", scheduledDate: "2026-11-04", scheduledTime: "16:00", meetUrl: "https://meet.google.com/test" });
    expect(email.html).toContain("16:00 h (hora de Madrid)");
    expect(email.html).toContain("https://meet.google.com/test");
    expect(email.html).toContain("seguimiento de 15 días por chat");
    const incident = diagnosticoSlotTakenEmail({ producto: "nutricion", name: "Ana" });
    expect(incident.html).toContain("tu nutricionista");
    expect(incident.subject).toContain("nutrición");
    expect(incident.html).not.toMatch(/tu psicóloga|logopedia/);
  });

  it("guarda en ebook_purchases y envía email con PDF cuando product=ebook-sanando", async () => {
    const { deps, sendEmail, fetchPdf, supabaseMock } = makeDeps();
    const session = makeSession({
      amount_total: 3999,
      metadata: { product: "ebook-sanando", patient_name: "Brayan", source: "sanando-desde-adentro" },
    });

    const result = await processCheckoutSessionCompleted(session, deps);

    expect(result.branch).toBe("ebook");
    expect(result.paymentSaved).toBe(true);
    expect(result.ebookSaved).toBe(true);
    expect(result.emailSent).toBe(true);
    expect(result.emailWithPdf).toBe(true);

    expect(fetchPdf).toHaveBeenCalledWith("https://mentesanapsicologia.com");
    expect(sendEmail).toHaveBeenCalledOnce();
    const emailArgs = sendEmail.mock.calls[0][0];
    expect(emailArgs.attachments).toHaveLength(1);
    expect(emailArgs.attachments[0].name).toBe("Sanando-Desde-Adentro.pdf");
    expect(emailArgs.attachments[0].content).toBe("BASE64PDFDATA");

    // marca email_sent_at en update
    const update = supabaseMock.updateCalls.find((c) => c.table === "ebook_purchases");
    expect(update).toBeDefined();
    expect(update?.payload.email_sent_at).toBeTypeOf("string");
    expect(update?.payload.email_error).toBeNull();
  });

  it("envía email sin attachment si fetchPdf falla", async () => {
    const { deps, sendEmail } = makeDeps({ fetchPdf: vi.fn(async () => null) });
    const session = makeSession({
      amount_total: 3999,
      metadata: { product: "ebook-sanando", patient_name: "Brayan" },
    });

    const result = await processCheckoutSessionCompleted(session, deps);

    expect(result.emailSent).toBe(true);
    expect(result.emailWithPdf).toBe(false);
    expect(sendEmail.mock.calls[0][0].attachments).toBeUndefined();
  });

  it("registra error si payments.upsert falla pero sigue ejecutando email", async () => {
    const supabaseMock = makeSupabaseMock({ upsertError: "relation does not exist" });
    const sendEmail = vi.fn(async () => ({ success: true }));
    const deps: ProcessDeps = {
      supabase: supabaseMock.client,
      sendEmail,
      fetchPdf: async () => null,
      buildEbookEmail: () => ({ subject: "x", html: "x" }),
      buildSessionEmail: () => ({ subject: "x", html: "x" }),
      buildSlotTakenEmail: () => ({ subject: "x", html: "x" }),
      origin: "https://mentesanapsicologia.com",
    };
    const session = makeSession();

    const result = await processCheckoutSessionCompleted(session, deps);

    expect(result.paymentSaved).toBe(false);
    expect(result.errors[0]).toContain("payments");
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it("no envía email si no hay patientEmail ni en customer_details ni metadata", async () => {
    const { deps, sendEmail } = makeDeps();
    const session = makeSession({
      customer_email: null,
      customer_details: null,
    });

    const result = await processCheckoutSessionCompleted(session, deps);

    expect(result.branch).toBe("no-email");
    expect(result.emailSent).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
    // payments igual se guarda
    expect(result.paymentSaved).toBe(true);
  });

  it("propaga el fallo del email", async () => {
    const failingEmail = vi.fn(async () => ({ success: false, error: "Brevo 401" }));
    const { deps } = makeDeps({ sendEmail: failingEmail });
    const session = makeSession();

    const result = await processCheckoutSessionCompleted(session, deps);

    expect(result.emailSent).toBe(false);
    expect(result.errors.find((e) => e.includes("Brevo 401"))).toBeDefined();
    expect(failingEmail).toHaveBeenCalledOnce();
  });

  it("usa patient_name del metadata por encima del de customer_details", async () => {
    const { deps, supabaseMock } = makeDeps();
    const session = makeSession({
      customer_details: { email: "x@y.com", name: "Nombre Stripe" } as Stripe.Checkout.Session.CustomerDetails,
      metadata: { patient_name: "Nombre Form", source: "test-sobrio" },
    });

    await processCheckoutSessionCompleted(session, deps);

    const payments = supabaseMock.upsertCalls.find((c) => c.table === "payments");
    expect(payments?.payload.patient_name).toBe("Nombre Form");
  });
});
