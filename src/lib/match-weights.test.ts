import { describe, expect, it } from "vitest";
import { computeMatchWeights, weightedIndex, type ProviderMatchStats } from "./match-weights";

const s = (providerId: number, bookedNext7d: number, attended: number, missed: number): ProviderMatchStats => ({ providerId, bookedNext7d, attended, missed });

describe("computeMatchWeights", () => {
  it("pool vacío → {}", () => {
    expect(computeMatchWeights([])).toEqual({});
  });

  it("todas iguales → peso 1", () => {
    const w = computeMatchWeights([s(1, 5, 8, 2), s(2, 5, 8, 2), s(3, 5, 8, 2)]);
    expect(w).toEqual({ 1: 1, 2: 1, 3: 1 });
  });

  it("sin ningún dato → peso 1 para todas", () => {
    expect(computeMatchWeights([s(1, 0, 0, 0), s(2, 0, 0, 0)])).toEqual({ 1: 1, 2: 1 });
  });

  it("menos reservas → más peso (misma asistencia)", () => {
    const w = computeMatchWeights([s(1, 0, 7, 3), s(2, 4, 7, 3), s(3, 12, 7, 3)]);
    expect(w[1]).toBeGreaterThan(w[2]);
    expect(w[2]).toBeGreaterThan(w[3]);
    // m = 4: capacidad 1, 5/9, 5/17 → relativo a la media
    const caps = [1, 5 / 9, 5 / 17];
    const mean = caps.reduce((a, b) => a + b) / 3;
    expect(w[1]).toBeCloseTo(caps[0] / mean, 3);
    expect(w[3]).toBeCloseTo(caps[2] / mean, 3);
  });

  it("mejor asistencia → más peso (misma carga)", () => {
    const w = computeMatchWeights([s(1, 3, 18, 2), s(2, 3, 10, 10), s(3, 3, 14, 6)]);
    expect(w[1]).toBeGreaterThan(w[3]);
    expect(w[3]).toBeGreaterThan(w[2]);
  });

  it("suavizado bayesiano: una nueva (0 datos) queda en la media de asistencia, no castigada", () => {
    // Pool: 70 % de asistencia. La nueva tiene posterior = tasa del pool → factor 1.
    const w = computeMatchWeights([s(1, 2, 70, 30), s(2, 2, 0, 0)]);
    expect(w[1]).toBeCloseTo(w[2], 2);
    // Con 1 no-show sobre 1 cita, el prior (k=10) la deja cerca de la media, no a 0.
    const w2 = computeMatchWeights([s(1, 2, 70, 30), s(2, 2, 0, 1)]);
    expect(w2[2]).toBeGreaterThan(0.85);
    expect(w2[2]).toBeLessThan(w2[1]);
  });

  it("suelo y techo: nadie baja de 0,35 ni pasa de 3", () => {
    const stats = [s(1, 200, 0, 40), ...Array.from({ length: 9 }, (_, i) => s(10 + i, 5, 20, 5)), s(99, 0, 40, 0)];
    const w = computeMatchWeights(stats);
    expect(w[1]).toBe(0.35);
    for (const v of Object.values(w)) {
      expect(v).toBeGreaterThanOrEqual(0.35);
      expect(v).toBeLessThanOrEqual(3);
    }
    // Una con agenda libre y asistencia perfecta en un pool que casi no asiste → techo.
    const w2 = computeMatchWeights([s(1, 0, 100, 0), ...Array.from({ length: 9 }, (_, i) => s(2 + i, 10, 5, 100))]);
    expect(w2[1]).toBe(3);
  });

  it("opciones personalizadas y entradas sucias", () => {
    const w = computeMatchWeights([s(1, -3, NaN, 2), s(2, 0, 2, 0)], { priorStrength: 0, floor: 0.1, cap: 10 });
    // booked/attended negativos o NaN cuentan como 0
    expect(w[1]).toBeGreaterThanOrEqual(0.1);
    expect(w[2]).toBeGreaterThan(w[1]);
  });
});

describe("weightedIndex", () => {
  it("respeta proporciones", () => {
    const ws = [1, 3];
    expect(weightedIndex(ws, 0)).toBe(0);
    expect(weightedIndex(ws, 0.2499)).toBe(0);
    expect(weightedIndex(ws, 0.25)).toBe(1);
    expect(weightedIndex(ws, 0.9999)).toBe(1);
  });
  it("pesos 0/NaN no salen; todo 0 → uniforme", () => {
    expect(weightedIndex([0, NaN, 2], 0.1)).toBe(2);
    expect(weightedIndex([0, 0], 0.6)).toBe(1);
  });
  it("frecuencias con un PRNG fijo", () => {
    let seed = 42;
    const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
    const counts = [0, 0, 0];
    for (let i = 0; i < 60000; i++) counts[weightedIndex([1, 2, 3], rnd())]++;
    expect(counts[0] / 60000).toBeCloseTo(1 / 6, 2);
    expect(counts[2] / 60000).toBeCloseTo(3 / 6, 2);
  });
});
