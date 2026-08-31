/** Resmî kaynak listesini canlı ölçer: erişilebiliyor mu, metin çıkıyor mu. */
import { OFFICIAL_SOURCES } from "../lib/bot/official-sources";
import { extractReferenceTextFromHtml } from "../lib/bot/evergreen";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function main() {
  for (const source of OFFICIAL_SOURCES) {
    try {
      const res = await fetch(source.url, {
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
        redirect: "follow", signal: AbortSignal.timeout(15000),
      });
      const ct = res.headers.get("content-type") || "";
      if (!res.ok || !ct.includes("text/html")) {
        console.log(`❌ ${res.status} ${ct.slice(0, 20).padEnd(20)} ${source.name}`);
        continue;
      }
      const html = await res.text();
      const text = extractReferenceTextFromHtml(html);
      console.log(`${text ? "✅" : "⚠️ "} html=${String(html.length).padEnd(7)} metin=${String(text?.length ?? 0).padEnd(6)} ${source.name}`);
    } catch (e) {
      console.log(`💥 ${(e as Error).message.slice(0, 40).padEnd(40)} ${source.name}`);
    }
  }
}
main();
