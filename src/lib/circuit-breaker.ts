// Circuit breaker genérico (sin dependencias). Pensado para Amelia (MySQL de
// WordPress): cuando el servidor cae, en vez de que cada request espere al timeout
// de la función, tras N fallos SEGUIDOS de tipo "conexión" se abre el circuito y
// las llamadas fallan al instante durante `openMs`. Pasado ese tiempo pasa a
// half-open: deja pasar UNA sonda; si conecta, se cierra; si vuelve a fallar por
// conexión, se reabre otros `openMs`.
//
// Conservador a propósito (un falso "abierto" bloquea reservas reales):
//  - Solo cuentan los errores que `isFailure` clasifica (p. ej. ECONNREFUSED). Un
//    error de SQL significa que el servidor RESPONDE → cuenta como éxito de conexión.
//  - Cualquier éxito resetea el contador de fallos consecutivos.
//  - El estado vive en memoria de la instancia (serverless: cada lambda tiene el suyo).

export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerOptions {
  /** Fallos consecutivos clasificados para abrir. Default 5. */
  failureThreshold?: number;
  /** Tiempo abierto antes de pasar a half-open (ms). Default 20 000. */
  openMs?: number;
  /** Decide si un error cuenta como fallo del circuito (p. ej. de conexión). */
  isFailure: (err: unknown) => boolean;
  /** Reloj inyectable para tests. */
  now?: () => number;
  /** Error que se lanza cuando el circuito rechaza una llamada. */
  onReject?: (state: CircuitState) => Error;
}

export class CircuitOpenError extends Error {
  constructor(message = "circuit_open") {
    super(message);
    this.name = "CircuitOpenError";
  }
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private consecutiveFailures = 0;
  private openedAt = 0;
  private probeInFlight = false;
  private readonly threshold: number;
  private readonly openMs: number;
  private readonly isFailure: (err: unknown) => boolean;
  private readonly now: () => number;
  private readonly onReject: (state: CircuitState) => Error;

  constructor(opts: CircuitBreakerOptions) {
    this.threshold = Math.max(1, opts.failureThreshold ?? 5);
    this.openMs = Math.max(0, opts.openMs ?? 20_000);
    this.isFailure = opts.isFailure;
    this.now = opts.now ?? Date.now;
    this.onReject = opts.onReject ?? (() => new CircuitOpenError());
  }

  /** Estado actual (pasa de open → half_open si ya venció el tiempo abierto). */
  getState(): CircuitState {
    if (this.state === "open" && this.now() - this.openedAt >= this.openMs) {
      this.state = "half_open";
      this.probeInFlight = false;
    }
    return this.state;
  }

  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  /**
   * Ejecuta `fn` protegida por el circuito. Si está abierto (o half-open con la
   * sonda ya en vuelo) lanza `onReject()` sin llamar a `fn`.
   */
  async exec<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.getState();
    let isProbe = false;
    if (state === "open") throw this.onReject("open");
    if (state === "half_open") {
      if (this.probeInFlight) throw this.onReject("half_open");
      this.probeInFlight = true;
      isProbe = true;
    }
    try {
      const out = await fn();
      this.onSuccess();
      return out;
    } catch (err) {
      if (this.isFailure(err)) this.onFailure(isProbe);
      else this.onSuccess(); // el servidor respondió (p. ej. error SQL): conexión sana
      throw err;
    } finally {
      if (isProbe) this.probeInFlight = false;
    }
  }

  private onSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = "closed";
  }

  private onFailure(isProbe: boolean): void {
    this.consecutiveFailures++;
    if (isProbe || this.consecutiveFailures >= this.threshold) {
      this.state = "open";
      this.openedAt = this.now();
    }
  }

  /** Solo tests / operación manual. */
  reset(): void {
    this.state = "closed";
    this.consecutiveFailures = 0;
    this.openedAt = 0;
    this.probeInFlight = false;
  }
}
