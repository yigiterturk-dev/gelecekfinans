/**
 * Admin kullanıcısı oluşturur / şifresini günceller.
 *
 * Kullanım:
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... npx tsx --env-file=.env.local scripts/create-admin.ts
 *
 * 2026-09-09'da üç ayrı sızıntı yolu kapatıldı (nocturn-audit "Personal data
 * written to logs" dedi, ölçünce daha genişti):
 *
 * 1. 🔴 Varsayılan şifre "admin123" idi. Argümansız çalıştıran biri siteye
 *    tahmin edilebilir şifreli bir admin açıyordu. Artık varsayılan YOK,
 *    şifre verilmezse script çalışmadan durur (fail-closed).
 * 2. 🔴 Şifre komut satırı argümanıydı. Argümanlar kabuk geçmişine yazılır ve
 *    makinedeki HER kullanıcı `ps` çıktısında görebilir. Artık yalnızca
 *    ortam değişkeninden okunuyor.
 * 3. 🔴 Şifre `console.log` ile ekrana basılıyordu. Bu bir kez gerçekten
 *    başa geldi: admin şifresi bir oturum dökümünde göründü. Artık hiçbir
 *    koşulda basılmıyor.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const MIN_UZUNLUK = 12;

function hataylaDur(mesaj: string): never {
  console.error(`\n✖ ${mesaj}\n`);
  console.error("Kullanım:");
  console.error("  ADMIN_EMAIL=admin@gelecekfinans.com ADMIN_PASSWORD='<güçlü şifre>' \\");
  console.error("    npx tsx --env-file=.env.local scripts/create-admin.ts\n");
  console.error("⚠️ Şifreyi argüman olarak GEÇME — argümanlar kabuk geçmişine yazılır");
  console.error("   ve makinedeki her kullanıcı `ps` çıktısında görebilir.\n");
  process.exit(1);
}

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (process.argv[3]) {
    hataylaDur("Şifre argüman olarak verilmiş. ADMIN_PASSWORD ortam değişkenini kullan.");
  }
  if (!email) hataylaDur("ADMIN_EMAIL tanımlı değil.");
  if (!email.includes("@")) hataylaDur("ADMIN_EMAIL geçerli bir e-posta değil.");
  if (!password) hataylaDur("ADMIN_PASSWORD tanımlı değil. Varsayılan şifre YOK — bu kasıtlı.");
  if (password.length < MIN_UZUNLUK) {
    hataylaDur(`ADMIN_PASSWORD en az ${MIN_UZUNLUK} karakter olmalı (verilen: ${password.length}).`);
  }

  const hash = await bcrypt.hash(password, 12);
  const user = await prisma.adminUser.upsert({
    where: { email },
    update: { password: hash },
    create: { email, password: hash, name: "Admin" },
  });

  // Şifre ASLA basılmaz. E-posta da maskelenir: bu çıktı çoğu zaman bir
  // oturum dökümüne ya da CI log'una düşüyor.
  const [ad, alan] = user.email.split("@");
  const maskeli = `${ad.slice(0, 2)}${"*".repeat(Math.max(1, ad.length - 2))}@${alan}`;
  console.log(`✓ Admin hazır: ${maskeli}`);
  console.log("  Şifre bilerek yazdırılmadı — kendi verdiğin değer geçerli.");
}

main()
  .catch((e) => {
    console.error("✖ Admin oluşturulamadı:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
