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
  const rows = await ameliaQuery<{ id: number; firstName: string; lastName: string }>(
    `SELECT id, firstName, lastName FROM ${ub} WHERE type='provider' AND status='visible' ORDER BY id ASC`,
  );
  const videoSlugs = await getAvailableVideoSlugs();
  const pool = rows.map((r) => {
    const fullName = `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim();
    const slug = slugify(fullName);
    // Match exacto del slug; si no, intenta solo firstName-lastName1
    let videoSlug: string | null = videoSlugs.has(slug) ? slug : null;
    if (!videoSlug) {
      const reduced = slugify(`${r.firstName ?? ""} ${(r.lastName ?? "").split(/\s+/)[0]}`);
      if (videoSlugs.has(reduced)) videoSlug = reduced;
    }
    return {
      id: Number(r.id),
      name: fullName,
      first_name: r.firstName ?? "",
      last_name: r.lastName ?? "",
      slug,
      video_url: videoSlug ? `/videos/welcome/${videoSlug}.mp4` : null,
      has_video: !!videoSlug,
    };
  });
  return NextResponse.json({
    pool,
    total: pool.length,
    with_video: pool.filter(p => p.has_video).length,
  });
}
