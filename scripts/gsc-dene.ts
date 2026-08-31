import { isGscConfigured, fetchSearchRows } from "../lib/gsc";

async function main() {
  if (!isGscConfigured()) {
    console.log("GSC kimlik bilgileri eksik");
    return;
  }
  const rows = await fetchSearchRows(28, 25);
  console.log(`satır: ${rows.length}`);
  for (const r of rows.slice(0, 15)) {
    console.log(
      `${r.date.toISOString().slice(0, 10)} | ${r.query} | sıra ${r.position.toFixed(1)} | gös ${r.impressions} | tık ${r.clicks} | ${r.page}`,
    );
  }
}

main().catch((e) => console.error("HATA:", (e as Error).message));
