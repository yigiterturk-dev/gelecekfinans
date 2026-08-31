import { createBrandedCard } from "../lib/bot/images";
import { put } from "@vercel/blob";
async function main() {
  console.log("token var mı:", Boolean(process.env.BLOB_READ_WRITE_TOKEN));
  const buf = await createBrandedCard({
    title: "EPDK'dan doğal gaz ve LPG tarifelerinde güncelleme",
    keyword: "EPDK düzenleme", category: "ekonomi", slug: "epdk-test-gorsel",
  });
  console.log("kart bayt:", buf?.length);
  const blob = await put("gorseller/epdk-test-gorsel.png", buf, { access: "public", contentType: "image/png", addRandomSuffix: false });
  console.log("yüklendi:", blob.url);
}
main().catch((e) => console.error("HATA:", e?.message || e));
