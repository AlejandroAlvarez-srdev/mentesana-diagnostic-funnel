import { describe, expect, it } from "vitest";
import { CircuitBreaker, CircuitOpenError } from "./circuit-breaker";
import { AmeliaUnavailableError, isAmeliaConnectionError, isAmeliaUnavailable } from "./amelia-errors";

function connErr(code = "ECONNREFUSED") {
  return Object.assign(new Error(`connect ${code}`), { code });
}
function sqlErr() {
  return Object.assign(new Error("You have an error in your SQL syntax"), { code: "ER_PARSE_ERROR", errno: 1064 });
}

function setup(threshold = 5, openMs = 20_000) {
  let t = 1_000_000;
  const cb = new CircuitBreaker({
    failureThreshold: threshold,
    openMs,
    isFailure: isAmeliaConnectionError,
    now: () => t,
  });
  return { cb, advance: (ms: number) => { t += ms; } };
}

const fail = (e: unknown) => () => Promise.reject(e);
const ok = <T>(v: T) => () => Promise.resolve(v);

describe("CircuitBreaker", () => {
  it("empieza cerrado y deja pasar", async () => {
    const { cb } = setup();
    expect(cb.getState()).toBe("closed");
    await expect(cb.exec(ok(1))).resolves.toBe(1);
  });

  it("se abre tras 5 fallos de conexión seguidos y rechaza sin llamar", async () => {
    const { cb } = setup();
    for (let i = 0; i < 4; i++) await expect(cb.exec(fail(connErr()))).rejects.toThrow("ECONNREFUSED");
    expect(cb.getState()).toBe("closed");
    await expect(cb.exec(fail(connErr()))).rejects.toThrow("ECONNREFUSED");
    expect(cb.getState()).toBe("open");
    let called = false;
    await expect(cb.exec(async () => { called = true; return 1; })).rejects.toBeInstanceOf(CircuitOpenError);
    expect(called).toBe(false);
  });

  it("nunca se abre por errores de SQL (y estos resetean el contador)", async () => {
    const { cb } = setup();
    for (let i = 0; i < 20; i++) await expect(cb.exec(fail(sqlErr()))).rejects.toThrow("SQL syntax");
    expect(cb.getState()).toBe("closed");
    for (let i = 0; i < 4; i++) await expect(cb.exec(fail(connErr()))).rejects.toThrow();
    await expect(cb.exec(fail(sqlErr()))).rejects.toThrow();
    expect(cb.getConsecutiveFailures()).toBe(0);
    for (let i = 0; i < 4; i++) await expect(cb.exec(fail(connErr()))).rejects.toThrow();
    expect(cb.getState()).toBe("closed");
  });

  it("un éxito resetea los fallos consecutivos", async () => {
    const { cb } = setup();
    for (let i = 0; i < 4; i++) await expect(cb.exec(fail(connErr()))).rejects.toThrow();
    await cb.exec(ok(1));
    for (let i = 0; i < 4; i++) await expect(cb.exec(fail(connErr()))).rejects.toThrow();
    expect(cb.getState()).toBe("closed");
  });

  it("pasa a half-open a los 20 s y una sonda OK lo cierra", async () => {
    const { cb, advance } = setup();
    for (let i = 0; i < 5; i++) await expect(cb.exec(fail(connErr()))).rejects.toThrow();
    advance(19_999);
    expect(cb.getState()).toBe("open");
    advance(1);
    expect(cb.getState()).toBe("half_open");
    await expect(cb.exec(ok("probe"))).resolves.toBe("probe");
    expect(cb.getState()).toBe("closed");
  });

  it("en half-open solo deja pasar UNA sonda a la vez", async () => {
    const { cb, advance } = setup();
    for (let i = 0; i < 5; i++) await expect(cb.exec(fail(connErr()))).rejects.toThrow();
    advance(20_000);
    let release!: () => void;
    const probe = cb.exec(() => new Promise<string>((r) => { release = () => r("done"); }));
    await expect(cb.exec(ok(2))).rejects.toBeInstanceOf(CircuitOpenError);
    release();
    await expect(probe).resolves.toBe("done");
    expect(cb.getState()).toBe("closed");
  });

  it("si la sonda falla por conexión, se reabre otros 20 s", async () => {
    const { cb, advance } = setup();
    for (let i = 0; i < 5; i++) await expect(cb.exec(fail(connErr()))).rejects.toThrow();
    advance(20_000);
    await expect(cb.exec(fail(connErr("ETIMEDOUT")))).rejects.toThrow();
    expect(cb.getState()).toBe("open");
    advance(10_000);
    expect(cb.getState()).toBe("open");
    advance(10_000);
    expect(cb.getState()).toBe("half_open");
  });

  it("si la sonda da error de SQL, el servidor está vivo → se cierra", async () => {
    const { cb, advance } = setup();
    for (let i = 0; i < 5; i++) await expect(cb.exec(fail(connErr()))).rejects.toThrow();
    advance(20_000);
    await expect(cb.exec(fail(sqlErr()))).rejects.toThrow();
    expect(cb.getState()).toBe("closed");
  });

  it("usa el error de rechazo configurado", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, isFailure: () => true, onReject: () => new AmeliaUnavailableError() });
    await expect(cb.exec(fail(new Error("x")))).rejects.toThrow("x");
    await expect(cb.exec(ok(1))).rejects.toBeInstanceOf(AmeliaUnavailableError);
  });
});

describe("isAmeliaConnectionError", () => {
  it.each(["ECONNREFUSED", "ETIMEDOUT", "PROTOCOL_CONNECTION_LOST", "ER_CON_COUNT_ERROR", "ENOTFOUND", "EHOSTUNREACH", "EAI_AGAIN"])(
    "%s es de conexión",
    (code) => expect(isAmeliaConnectionError(connErr(code))).toBe(true),
  );

  it("connect timeout de mysql2 (errorno ETIMEDOUT)", () => {
    const e = Object.assign(new Error("connect ETIMEDOUT"), { errorno: "ETIMEDOUT", code: "ETIMEDOUT" });
    expect(isAmeliaConnectionError(e)).toBe(true);
    expect(isAmeliaConnectionError(new Error("connect ETIMEDOUT"))).toBe(true);
  });

  it("AggregateError de Node con ECONNREFUSED anidados", () => {
    const e = new AggregateError([connErr(), connErr()], "");
    expect(isAmeliaConnectionError(e)).toBe(true);
  });

  it.each([
    ["ER_PARSE_ERROR", sqlErr()],
    ["ER_NO_SUCH_TABLE", Object.assign(new Error("Table doesn't exist"), { code: "ER_NO_SUCH_TABLE" })],
    ["ER_DUP_ENTRY", Object.assign(new Error("Duplicate entry"), { code: "ER_DUP_ENTRY" })],
    ["ER_LOCK_DEADLOCK", Object.assign(new Error("Deadlock"), { code: "ER_LOCK_DEADLOCK" })],
    ["query timeout", Object.assign(new Error("Query inactivity timeout"), { code: "PROTOCOL_SEQUENCE_TIMEOUT" })],
    ["queue limit", new Error("Queue limit reached.")],
    ["env no configurado", new Error("AMELIA_DB_* env vars not configured")],
  ])("%s NO es de conexión", (_n, e) => expect(isAmeliaConnectionError(e)).toBe(false));

  it("valores raros no rompen", () => {
    expect(isAmeliaConnectionError(null)).toBe(false);
    expect(isAmeliaConnectionError("ECONNREFUSED")).toBe(false);
    expect(isAmeliaConnectionError(undefined)).toBe(false);
  });

  it("isAmeliaUnavailable cubre circuito abierto y errores de conexión", () => {
    expect(isAmeliaUnavailable(new AmeliaUnavailableError())).toBe(true);
    expect(isAmeliaUnavailable(connErr())).toBe(true);
    expect(isAmeliaUnavailable(sqlErr())).toBe(false);
  });
});
