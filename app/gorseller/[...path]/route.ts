import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * NEDEN: `next start`, `public/` dosya listesini AÇILIŞTA alır. Bot sunucu
 * çalışırken `public/gorseller/` altına yeni görsel yazınca dosya diskte olsa
 * bile bir sonraki restart'a kadar 404 dönüyordu (11-17 Pixabay doldurmasında
 * ölçüldü: yeni .jpg yerel 404, restart sonrası 200). Listede olan dosyayı
 * Next yine kendisi sunar; bu rota yalnızca sonradan eklenenleri karşılar.
 */
const ROOT = path.join(process.cwd(), "public", "gorseller");
const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const rel = path.normalize(parts.join("/"));
  const mime = MIME[path.extname(rel).toLowerCase()];
  const full = path.join(ROOT, rel);
  if (!mime || rel.startsWith("..") || !full.startsWith(ROOT + path.sep)) {
    return new NextResponse(null, { status: 404 });
  }
  try {
    const buf = await fs.promises.readFile(full);
    return new NextResponse(buf, {
      headers: { "Content-Type": mime, "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
