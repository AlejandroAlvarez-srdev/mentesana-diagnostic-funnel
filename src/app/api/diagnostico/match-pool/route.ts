// Devuelve el pool completo de profesionales de Amelia (type='provider', status='visible')
// para que el test haga match aleatorio sobre TODAS, no solo las 16 hardcoded. Para
// cada una intenta encontrar el vídeo en /public/videos/welcome/ por slug del nombre;
// si no existe, marca has_video=false y el cliente usa avatar.
//
// ?producto=logopedia (28-oct-2026): mismo embudo, otro pool. La profesión la decide
// el servicio asignado en Amelia (providers_to_services):
//   · logopedia  → proveedoras con el servicio 400 (vídeo opcional: son pocas).
//   · psicología → como siempre (con vídeo), EXCLUYENDO a quien solo tenga el servicio
//     de logopedia y ninguno de diagnóstico (8/11). Quien tiene ambos (hoy las dos
//     logopedas también son psicólogas) sigue en los dos pools.
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { ameliaQuery, ameliaTable } from "@/lib/amelia-db";
import { computeEarliestForProviders } from "@/lib/diagnostico-availability";
import { PRODUCTOS, productoDesdeSlug } from "@/lib/productos-999";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Quita el número de colegiada/matrícula/profesional de la descripción de Amelia.
// Las psicólogas lo escriben en formatos muy distintos (ES "Col. M-12345", LATAM
// "matrícula profesional P-123456", "nº de colegiada ...") → cubrimos los patrones
// comunes + códigos sueltos tipo "P-123456". Se limpia en ORIGEN para que desaparezca
// de todos los sitios que consuman esta descripción.
function stripLicenseNumbers(text: string): string {
  let t = text;
  const CODE = "[A-Za-zÑ]{0,4}[-\\s.]?\\d[\\d.\\-\\s/]*";
  // 1) "(con) número/nº/núm (de) colegiada/profesional/matrícula/registro/licencia: CÓDIGO"
  t = t.replace(new RegExp(`,?\\s*\\(?\\s*(?:con\\s+(?:el\\s+|la\\s+)?)?(?:n[úu]mero|n[úu]m\\.?|n[º°o]\\.?|nro\\.?)\\s+(?:de\\s+)?(?:colegiad[oa]|colegiaci[óo]n|colegiatura|profesional|matr[íi]cula|registro|licencia)\\s*[:#]?\\s*${CODE}\\)?`, "gi"), " ");
  // 2) "(con) colegiada/matrícula/registro/licencia/colegiatura (profesional) (nº) CÓDIGO"
  t = t.replace(new RegExp(`,?\\s*\\(?\\s*(?:con\\s+(?:el\\s+|la\\s+)?)?(?:colegiad[oa]|colegiatura|matr[íi]cula|registro|licencia)(?:\\s+profesional)?\\s*(?:n[º°o]\\.?|n[úu]m\\.?|n[úu]mero|nro\\.?)?\\s*[:#]?\\s*${CODE}\\)?`, "gi"), " ");
  // 3) Abreviatura "Col. nº 12345"
  t = t.replace(new RegExp(`,?\\s*\\bcol\\.\\s*(?:n[º°o]\\.?|n[úu]m\\.?|n[úu]mero)?\\s*[:#]?\\s*${CODE}\\.?`, "gi"), " ");
  // 4) Código suelto con prefijo de letras y guion: "P-123456", "M-08234", "COP-12345"
  t = t.replace(/\b[A-ZÑ]{1,4}-\d{3,7}\b/g, " ");
  // Limpieza de restos (paréntesis vacíos, comas dobles, conectores colgados, etc.)
  t = t.replace(/\(\s*\)/g, " ")
       .replace(/\s*,\s*,/g, ",")
       .replace(/\b(con|y|de)\s*,/gi, ",")
       .replace(/\s+([,.;])/g, "$1")
       .replace(/\s{2,}/g, " ")
       .replace(/^\s*[,;.]\s*/, "")
       .trim();
  return t;
}

let videoSlugCache: { slugs: Set<string>; ts: number } | null = null;
async function getAvailableVideoSlugs(): Promise<Set<string>> {
  if (videoSlugCache && Date.now() - videoSlugCache.ts < 5 * 60_000) return videoSlugCache.slugs;
  try {
    const dir = path.join(process.cwd(), "public", "videos", "welcome");
    const files = await fs.readdir(dir);
    const slugs = new Set(files.filter(f => f.endsWith(".mp4")).map(f => f.replace(/\.mp4$/, "")));
    videoSlugCache = { slugs, ts: Date.now() };
    return slugs;
  } catch {
    return new Set();
  }
}

export async function GET(req: NextRequest) {
  const producto = productoDesdeSlug(req.nextUrl.searchParams.get("producto"));
  const ub = ameliaTable("users");
  const LOGO_ID = PRODUCTOS.logopedia.ameliaServiceId;
  const DIAG_IDS = PRODUCTOS.diagnostico.ameliaServiceIds;
  const [rows, services] = await Promise.all([
    ameliaQuery<{ id: number; firstName: string; lastName: string; description: string | null; pictureFullPath: string | null; pictureThumbPath: string | null }>(
      `SELECT id, firstName, lastName, description, pictureFullPath, pictureThumbPath FROM ${ub} WHERE type='provider' AND status='visible' ORDER BY id ASC`,
    ),
    // Profesión por servicio asignado. Si la consulta falla, nadie queda excluido del
    // pool de psicología (comportamiento histórico) y el de logopedia sale vacío → el
    // cliente cae al catálogo fijo de /api/test-diagnostico/pool?producto=logopedia.
    ameliaQuery<{ userId: number; serviceId: number }>(
      `SELECT userId, serviceId FROM ${ameliaTable("providers_to_services")} WHERE serviceId IN (${[...DIAG_IDS, LOGO_ID].map(() => "?").join(",")})`,
      [...DIAG_IDS, LOGO_ID],
    ).catch((e) => { console.error("match-pool providers_to_services", e); return [] as { userId: number; serviceId: number }[]; }),
  ]);
  const svcByProvider = new Map<number, Set<number>>();
  for (const s of services) {
    const set = svcByProvider.get(Number(s.userId)) ?? new Set<number>();
    set.add(Number(s.serviceId));
    svcByProvider.set(Number(s.userId), set);
  }
  const tieneLogopedia = (id: number) => svcByProvider.get(id)?.has(LOGO_ID) ?? false;
  const tieneDiagnostico = (id: number) => DIAG_IDS.some((sid) => svcByProvider.get(id)?.has(sid));

  const videoSlugs = await getAvailableVideoSlugs();
  const all = rows.map((r) => {
    const fullName = `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim();
    const slug = slugify(fullName);
    // Match exacto del slug; si no, intenta solo firstName-lastName1
    let videoSlug: string | null = videoSlugs.has(slug) ? slug : null;
    if (!videoSlug) {
      const reduced = slugify(`${r.firstName ?? ""} ${(r.lastName ?? "").split(/\s+/)[0]}`);
      if (videoSlugs.has(reduced)) videoSlug = reduced;
    }
    // Foto y descripción REALES de Amelia (perfil de la profesional). La foto puede ser
    // pictureFullPath (alta) o pictureThumbPath (miniatura); description es texto libre
    // que la propia profesional escribió sobre su enfoque.
    const photoUrl = (r.pictureFullPath || r.pictureThumbPath || null)?.trim() || null;
    const rawDescription = (r.description ?? "").trim();
    const description = rawDescription ? (stripLicenseNumbers(rawDescription) || null) : null;
    return {
      id: Number(r.id),
      name: fullName,
      first_name: r.firstName ?? "",
      last_name: r.lastName ?? "",
      slug,
      video_url: videoSlug ? `/videos/welcome/${videoSlug}.mp4` : null,
      has_video: !!videoSlug,
      photo_url: photoUrl,
      description,
    };
  });

  const poolBase = producto.slug === "logopedia"
    // Logopedia: las que tienen el servicio 400. Son pocas → el vídeo es opcional (la
    // tarjeta enseña la foto de Amelia si no lo hay).
    ? all.filter(p => tieneLogopedia(p.id))
    // Psicología: SOLO con vídeo (el match se hace únicamente entre éstas) y sin las
    // que son solo logopedas.
    : all.filter(p => p.has_video && !(tieneLogopedia(p.id) && !tieneDiagnostico(p.id)));

  // Disponibilidad: primer hueco de cada una (incluyendo HOY) para que el match
  // priorice a las que pueden ver al paciente antes. Si falla, se cae a sin-prioridad.
  let avail = new Map<number, { iso: string; day: string; soon: boolean }>();
  try {
    avail = await computeEarliestForProviders(poolBase.map(p => p.id), { includeToday: true, days: 10 });
  } catch (e) {
    console.error("match-pool availability", e);
  }
  const pool = poolBase
    .map(p => {
      const a = avail.get(p.id);
      return { ...p, earliest_iso: a?.iso ?? null, earliest_day: a?.day ?? null, soon: !!a?.soon };
    })
    // Soonest primero (las "soon" arriba, luego por primer hueco); el cliente sesga sobre esto.
    .sort((a, b) => (Number(b.soon) - Number(a.soon)) || String(a.earliest_iso ?? "9999").localeCompare(String(b.earliest_iso ?? "9999")));

  return NextResponse.json({
    pool,
    producto: producto.slug,
    total_active: all.length,
    with_video: pool.filter(p => p.has_video).length,
    soon_count: pool.filter(p => p.soon).length,
  });
}
