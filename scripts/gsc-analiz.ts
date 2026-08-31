import { prisma } from "../lib/db";

async function main() {
  const rows = await prisma.searchPerformance.findMany({ where: { source: "gsc" } });

  const byQuery = new Map<string, { imp: number; clk: number; pos: number[]; page: string }>();
  const byPage = new Map<string, { imp: number; clk: number; pos: number[] }>();

  for (const r of rows) {
    const q = byQuery.get(r.query) ?? { imp: 0, clk: 0, pos: [], page: r.page };
    q.imp += r.impressions; q.clk += r.clicks; q.pos.push(r.position);
    byQuery.set(r.query, q);
    const p = byPage.get(r.page) ?? { imp: 0, clk: 0, pos: [] };
    p.imp += r.impressions; p.clk += r.clicks; p.pos.push(r.position);
    byPage.set(r.page, p);
  }

  const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;

  console.log(`toplam satır: ${rows.length} | tekil sorgu: ${byQuery.size} | tekil sayfa: ${byPage.size}`);
  console.log(`toplam gösterim: ${rows.reduce((s, r) => s + r.impressions, 0)} | toplam tık: ${rows.reduce((s, r) => s + r.clicks, 0)}`);

  console.log("\n=== SAYFALAR (gösterime göre) ===");
  [...byPage.entries()].sort((a, b) => b[1].imp - a[1].imp).slice(0, 15)
    .forEach(([p, v]) => console.log(`gös ${String(v.imp).padStart(4)} | tık ${String(v.clk).padStart(3)} | ort.sıra ${avg(v.pos).toFixed(1).padStart(5)} | ${p.replace("https://gelecekfinans.com", "")}`));

  console.log("\n=== FIRSAT: ort. sıra 8-30 arası sorgular ===");
  [...byQuery.entries()].filter(([, v]) => { const a = avg(v.pos); return a >= 8 && a <= 30; })
    .sort((a, b) => b[1].imp - a[1].imp).slice(0, 20)
    .forEach(([q, v]) => console.log(`gös ${String(v.imp).padStart(3)} | sıra ${avg(v.pos).toFixed(1).padStart(5)} | ${q}  →  ${v.page.replace("https://gelecekfinans.com", "")}`));

  console.log("\n=== EN ÇOK GÖSTERİM ALAN SORGULAR ===");
  [...byQuery.entries()].sort((a, b) => b[1].imp - a[1].imp).slice(0, 20)
    .forEach(([q, v]) => console.log(`gös ${String(v.imp).padStart(3)} | tık ${v.clk} | sıra ${avg(v.pos).toFixed(1).padStart(5)} | ${q}`));
}

main().catch((e) => console.error("HATA:", (e as Error).message));
