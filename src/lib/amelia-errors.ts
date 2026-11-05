// Errores tipados y clasificación de fallos de Amelia (MySQL de WordPress).
// Archivo puro (sin mysql2) para poder importarlo desde rutas y tests.

/** Amelia no está disponible (circuito abierto). Las rutas lo traducen a 503. */
export class AmeliaUnavailableError extends Error {
  readonly code = "AMELIA_UNAVAILABLE";
  constructor(message = "amelia_unavailable") {
    super(message);
    this.name = "AmeliaUnavailableError";
  }
}

// Códigos que indican que NO llegamos a hablar con el servidor (caída, red, DNS,
// sin conexiones libres). Un error de SQL (ER_PARSE_ERROR, ER_NO_SUCH_TABLE…) o
// un timeout de una query lenta (PROTOCOL_SEQUENCE_TIMEOUT) NO están aquí: el
// servidor está vivo y abrir el circuito por eso bloquearía reservas reales.
const CONNECTION_CODES = new Set([
  "ECONNREFUSED",
  "ETIMEDOUT",
  "PROTOCOL_CONNECTION_LOST",
  "ER_CON_COUNT_ERROR",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EAI_AGAIN",
]);

function codesOf(err: unknown): string[] {
  if (!err || typeof err !== "object") return [];
  const e = err as { code?: unknown; errorno?: unknown };
  const out: string[] = [];
  if (typeof e.code === "string") out.push(e.code);
  if (typeof e.errorno === "string") out.push(e.errorno);
  return out;
}

/**
 * true si el error es de CONEXIÓN con MySQL (no de SQL). Mira `code`/`errorno`, los
 * errores anidados de un AggregateError (Node intenta IPv4+IPv6 y agrega los
 * ECONNREFUSED) y, como último recurso, el mensaje "connect ETIMEDOUT" de mysql2.
 */
export function isAmeliaConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if (codesOf(err).some((c) => CONNECTION_CODES.has(c))) return true;
  const nested = (err as { errors?: unknown }).errors;
  if (Array.isArray(nested) && nested.some((n) => codesOf(n).some((c) => CONNECTION_CODES.has(c)))) return true;
  const msg = String((err as { message?: unknown }).message ?? "");
  return /^connect (ETIMEDOUT|ECONNREFUSED)\b/.test(msg);
}

/** true si conviene responder "Amelia no disponible" (circuito abierto o error de conexión). */
export function isAmeliaUnavailable(err: unknown): boolean {
  return err instanceof AmeliaUnavailableError || isAmeliaConnectionError(err);
}
