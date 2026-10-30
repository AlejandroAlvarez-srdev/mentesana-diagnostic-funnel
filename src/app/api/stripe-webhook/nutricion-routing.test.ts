import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ query: vi.fn(), availability: vi.fn(async () => new Map()) }));
vi.mock("@/lib/amelia-db", () => ({ ameliaQuery: mocks.query, ameliaTable: (table: string) => table }));
vi.mock("@/lib/diagnostico-availability", () => ({ computeEarliestForProviders: mocks.availability }));
vi.mock("fs", () => ({ promises: { readdir: async () => ["nutricionista-uno.mp4", "profesional-doble.mp4", "psicologa-general.mp4", "logopeda-uno.mp4"] } }));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.clearAllMocks(); });

describe("aislamiento de nutrición en el embudo compartido", () => {
  it("sin servicio devuelve pool vacío sin consultar Amelia", async () => {
    vi.stubEnv("NUTRICION_AMELIA_SERVICE_ID", "0");
    const { GET } = await import("../diagnostico/match-pool/route");
    const result = await (await GET(new NextRequest("http://localhost/api/diagnostico/match-pool?producto=nutricion"))).json();
    expect(result.pool).toEqual([]);
    expect(result.producto).toBe("nutricion");
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("con servicio selecciona solo nutricionistas y excluye especialistas exclusivos del pool psicológico", async () => {
    vi.stubEnv("NUTRICION_AMELIA_SERVICE_ID", "910");
    mocks.query.mockImplementation(async (sql: string) => sql.includes("providers_to_services") ? [
      { userId: 1, serviceId: 910 }, { userId: 2, serviceId: 910 }, { userId: 2, serviceId: 8 },
      { userId: 3, serviceId: 8 }, { userId: 4, serviceId: 400 },
    ] : [
      { id: 1, firstName: "Nutricionista", lastName: "Uno" }, { id: 2, firstName: "Profesional", lastName: "Doble" },
      { id: 3, firstName: "Psicologa", lastName: "General" }, { id: 4, firstName: "Logopeda", lastName: "Uno" },
    ]);
    const { GET } = await import("../diagnostico/match-pool/route");
    const nutri = await (await GET(new NextRequest("http://localhost/api/diagnostico/match-pool?producto=nutricion"))).json();
    const diag = await (await GET(new NextRequest("http://localhost/api/diagnostico/match-pool"))).json();
    const logo = await (await GET(new NextRequest("http://localhost/api/diagnostico/match-pool?producto=logopedia"))).json();
    expect(nutri.pool.map((p: { id: number }) => p.id)).toEqual([1, 2]);
    expect(diag.pool.map((p: { id: number }) => p.id)).toEqual([2, 3]);
    expect(logo.pool.map((p: { id: number }) => p.id)).toEqual([4]);
  });

  it("identifica nutrición desde source, ruta y metadata, sin confundir prefijos", async () => {
    const { productoDesdeSource, productoDesdeMetadata, productoDesdePath } = await import("@/lib/productos-999");
    expect(productoDesdeSource("test-nutricion")?.slug).toBe("nutricion");
    expect(productoDesdeMetadata({ source: "test-nutricion" }).slug).toBe("nutricion");
    expect(productoDesdePath("/nutricion/40").slug).toBe("nutricion");
    expect(productoDesdePath("/test-nutricion").slug).toBe("nutricion");
    expect(productoDesdePath("/nutricionista").slug).toBe("diagnostico");
  });
});
