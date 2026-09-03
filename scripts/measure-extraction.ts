/**
 * Kanıt metni çıkarımının GERÇEK başarı oranını yayıncı yayıncı ölçer.
 * 7 günde 29 konu "Kanıt metni kısa" diyerek öldü; hangi domainin sayfasından
 * metin çıkmadığını tahminle değil ölçümle bilmek için.
 */
import Parser from "rss-parser";
import { RSS_FEEDS } from "@/lib/bot/config";
import { extractArticleTextFromHtml } from "@/lib/bot/research";

const parser = new Parser({ timeout: 15000 });
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

type Row = { ok: number; fail: number; reasons: Record<string, number> };

async function main() {
  const urls: string[] = [];
  await Promise.allSettled(RSS_FEEDS.map(async (feedUrl) => {
    const res = await fetch(feedUrl, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12000) });
    const feed = await parser.parseString(await res.text());
    for (const entry of (feed.items || []).slice(0, 4)) if (entry.link) urls.push(entry.link);
  }));

  const perDomain: Record<string, Row> = {};
  const note = (domain: string, ok: boolean, reason?: string) => {
    const row = perDomain[domain] ||= { ok: 0, fail: 0, reasons: {} };
    if (ok) row.ok++;
    else { row.fail++; if (reason) row.reasons[reason] = (row.reasons[reason] || 0) + 1; }
  };

  await Promise.allSettled(urls.map(async (url) => {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
      });
      const type = res.headers.get("content-type") || "";
      if (!res.ok) return note(domain, false, `HTTP ${res.status}`);
      if (!type.includes("text/html")) return note(domain, false, "html değil");
      const extracted = extractArticleTextFromHtml(await res.text());
      if (!extracted) return note(domain, false, "ayrıştırılamadı");
      if (extracted.content.length < 800) return note(domain, false, `kısa (${extracted.content.length})`);
      note(domain, true);
    } catch (error) {
      note(domain, false, (error as Error).name || "ağ hatası");
    }
  }));

  const rows = Object.entries(perDomain).sort((a, b) => (b[1].ok + b[1].fail) - (a[1].ok + a[1].fail));
  let ok = 0, total = 0;
  console.log("yayıncı".padEnd(26), "başarı", "  sebepler");
  for (const [domain, row] of rows) {
    ok += row.ok; total += row.ok + row.fail;
    const reasons = Object.entries(row.reasons).map(([k, v]) => `${k}×${v}`).join(", ");
    console.log(domain.padEnd(26), `${row.ok}/${row.ok + row.fail}`.padEnd(7), reasons);
  }
  console.log(`\nTOPLAM: ${ok}/${total} (%${(100 * ok / total).toFixed(0)}) sayfadan 800+ karakter kanıt metni çıktı`);
}
main();
