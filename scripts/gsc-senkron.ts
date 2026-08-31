import { syncSearchPerformance } from "../lib/gsc";

async function main() {
  const res = await syncSearchPerformance(90);
  console.log(JSON.stringify(res));
}

main().catch((e) => console.error("HATA:", (e as Error).message));
