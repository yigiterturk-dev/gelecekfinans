/** Aday resmî/referans URL'lerini canlı ölçer: gerçekten metin çıkıyor mu. */
import { readFileSync } from "node:fs";
import { extractReferenceTextFromHtml } from "../lib/bot/evergreen";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function main() {
  const urls = readFileSync(process.argv[2], "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
  await Promise.all(urls.map(async (url) => {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(15000) });
      const ct = res.headers.get("content-type") || "";
      if (!res.ok || !ct.includes("text/html")) return console.log(`❌ ${res.status} ${url}`);
      const text = extractReferenceTextFromHtml(await res.text());
      console.log(`${(text?.length ?? 0) >= 1200 ? "✅" : "⚠️ "} ${String(text?.length ?? 0).padStart(6)} ${url}`);
    } catch (e) {
      console.log(`💥 ${(e as Error).message.slice(0, 25).padEnd(25)} ${url}`);
    }
  }));
}
main();
