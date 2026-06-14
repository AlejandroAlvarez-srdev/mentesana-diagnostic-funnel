// Devuelve el pool completo de psicólogas de Amelia (type='provider', status='visible')
// para que /test-diagnostico haga match aleatorio sobre TODAS, no solo las 16
// hardcoded. Para cada una intenta encontrar el vídeo en /public/videos/welcome/
// por slug del nombre; si no existe, marca has_video=false y el cliente usa avatar.
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { ameliaQuery, ameliaTable } from "@/lib/amelia-db";

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

export async function GET() {
  const ub = ameliaTable("users");
  const rows = await ameliaQuery<{ id: number; firstName: string; lastName: string; description: string | null; pictureFullPath: string | null; pictureThumbPath: string | null }>(
    `SELECT id, firstName, lastName, description, pictureFullPath, pictureThumbPath FROM ${ub} WHERE type='provider' AND status='visible' ORDER BY id ASC`,
  );
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
    // Foto y descripción REALES de Amelia (perfil de la psicóloga). La foto puede ser
    // pictureFullPath (alta) o pictureThumbPath (miniatura); description es texto libre
    // que la propia psicóloga escribió sobre su enfoque.
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
  // SOLO devolvemos las psicólogas con vídeo — el match aleatorio se hace únicamente
  // entre éstas. El total se mantiene visible para que sepamos cuántas activas hay
  // realmente y cuántas faltan por grabar vídeo.
  const pool = all.filter(p => p.has_video);
  return NextResponse.json({
    pool,
    total_active: all.length,
    with_video: pool.length,
  });
}
