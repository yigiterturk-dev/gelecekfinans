import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "path";

const BOT = path.join(process.env.HOME || "", "gelecekfinans-bot");
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("p");
  if (!p) return new NextResponse(null, { status: 400 });

  const normalized = path.normalize(p);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    return new NextResponse(null, { status: 400 });
  }

  const ext = path.extname(normalized).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const root = await fs.realpath(BOT);
    const full = await fs.realpath(path.join(root, normalized));
    if (!full.startsWith(root + path.sep)) {
      return new NextResponse(null, { status: 400 });
    }

    const stat = await fs.stat(full);
    if (!stat.isFile()) return new NextResponse(null, { status: 404 });
    if (stat.size > MAX_IMAGE_BYTES) return new NextResponse(null, { status: 413 });

    const buf = await fs.readFile(full);
    const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".gif" ? "image/gif" : "image/jpeg";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(buf.byteLength),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
