# GelecekFinans — Claude'a verilecek görev briefi (2026-11-21)

Bu dosyayı olduğu gibi Claude Code'a ver. Bağlam, kanıt ve öncelik sırası içinde.

---

## Bağlam

- Repo: `~/projects/gelecekfinans` (branch `main`, 1 push edilmemiş commit var)
- GitHub: `github.com/yigiterturk-dev/gelecekfinans` (PUBLIC)
- Canlı: https://gelecekfinans.com
- Hosting: netcup VPS, `/opt/gelecekfinans`, systemd + Caddy, Postgres `127.0.0.1:5434`
- Stack: Next.js 16 App Router, Prisma, NextAuth, Tailwind, OpenAI (gpt-5 yazar / gpt-5-mini doğrulayıcı), Resend
- Prod env: `/opt/gelecekfinans/.env.production` (lokal `.env` canlıya gitmez)
- Cron state: `/var/lib/gelecekfinans/cron/`
- Yedekler: `/var/backups/nocturn/gelecekfinans/`

**Mevcut durum kanıtı (2026-11-21 ölçümü):**

| Ölçüm | Değer |
|---|---|
| GSC son 28 gün | 1.714 gösterim / **5 tık** / ort. pozisyon 80 |
| Sitemap URL | 232 |
| news-sitemap URL | 3 |
| Yayınlanmış makale (1 Kasım itibarı) | 108 PUBLISHED, 23 ARCHIVED |
| `/rehber` | **HTTP 500** |
| `/doviz`, `/doviz/usd-try` | **3,5–3,7 sn TTFB** |
| `pg_dump` | **2 gecedir başarısız** (yedek yok) |
| `gf-nobet` | bugün 3 kez kırmızı |
| Resend | anahtar yok → bülten gönderilmiyor |
| AdSense | publisher ID yok, canlı HTML'de `adsbygoogle` yok |
| GSC API | kimlik yok → trafik raporu alınamıyor |

**Teşhis:** Ürün ve mühendislik tamam. Eksik olan talep, güven, dağıtım ve gelir. Günlük AI haber özeti modeli AA/Bloomberg HT/Dünya karşısında kazanamaz; konumlandırma **araç/veri-önce** modele kaymalı.

---

## Kısıtlar (hepsi zorunlu)

1. Prod'a dokunmadan önce taze `pg_dump` al ve geri yüklenebilirliğini doğrula. Yedek alınamıyorsa hiçbir prod değişikliği yapma; önce yedeği düzelt.
2. Uydurma yazar, uydurma istatistik, uydurma kaynak yok. Mevcut "review-gated" yayın sınırını koru; bot çıktısı asla otomatik yayınlanmasın.
3. Haber/metin üretimini artırma. Bu brief üretimi **azaltıp** niyeti yükseltmeyi hedefliyor.
4. Her adımda `npm run lint`, `npm run check`/`tsc`, `npm test`, `npm run build` yeşil olacak. Test sayısı düşmeyecek.
5. Değişiklikleri küçük commit'lere böl; prod deploy'u Yiğit onaylayacak.
6. Gizli anahtar, PII veya prod env içeriği loglanmayacak/commit edilmeyecek.

---

## FAZ 0 — Yangın (P0, ~3–5 saat, para gerekmez)

- [ ] **Yedek:** `ops/nocturn-yedek.sh` + `nocturn-yedek-bekci.sh` çalıştır, `pg_dump` hatasını bul (disk dolu / yetki / sürüm uyumsuzluğu / port). Düzelt, dump'ı izole bir DB'ye restore ederek doğrula, sonra bekçiyi yeşile al.
- [ ] **`/rehber` 500:** `journalctl -u gelecekfinans.service -n 100 --no-pager` ile gerçek hatayı al. Şüpheli: `lib/articles.ts:getGuides()` (PRISMA sorgusu + `getAllArticles()` birleşimi). Düzelt, `tests/` içine regresyon testi ekle.
- [ ] **`/doviz` 3,5 sn:** `app/doviz/page.tsx` `revalidate = 600` ama TTFB yüksek. `lib/market.ts` fetch'lerini ve sayfa render'ını profille; veri çağrısını `unstable_cache`/ISR ile ayır, TTFB < 800 ms hedefle. Aynı kontrol `/borsa`, `/altin`, `/kripto` için.
- [ ] **Resend:** anahtarı `/opt/gelecekfinans/.env.production` içine ekle (Yiğit'ten al), servisi restart et, tek bir test abonesine uçtan uca gönderim doğrula. Bülten gönderilemiyorsa "bülten var" iddiasını sitede bırakma.
- [ ] **GSC API:** servis hesabı + `GSC_*` env, `scripts/gsc-ozet.mjs` / `gsc-firsat.ts` çalışır hale gelsin; günlük özet cron'u bağla.
- [ ] **Bot nöbeti:** `gf-nobet` kırmızısının kök nedenini `systemctl list-timers 'gelecekfinans-*'` + `journalctl -u gelecekfinans-job@news.service` ile bul. Preflight/AI anahtarı/kota ayrımını netleştir.
- [ ] **Push:** bekleyen commit'i gözden geçirip push et.

**Kabul:** yedek doğrulandı · `/rehber` 200 · `/doviz` <800 ms · test bülten gitti · GSC raporu üretildi · nöbet yeşil · `origin/main` temiz.

---

## FAZ 1 — Güven ve teknik temel (2–3 hafta sonu)

- [ ] **Gerçek künye:** `/kunye` ve `/hakkimizda` sayfalarında gerçek kişi, gerçek rol, iletişim ve düzeltme politikası. AI katkısı açıkça beyan edilsin ("otomatik taslak, editör onaylı").
- [ ] **Performance:** hedef LCP < 2,5 sn (mobil), CLS < 0,1. Görsel boyutları, font yükleme, `next/image` kullanımı, gereksiz client component'ler.
- [ ] **İnce sayfa temizliği:** içeriksiz/az içerikli kategori ve etiket sayfalarını noindex'le veya birleştir. 232 URL'in kaçı gerçekten değer üretiyor — envanter çıkar.
- [ ] **İç linkleme:** araç → rehber → haber → araç döngüsü. Yetim sayfa bırakma (`scripts/backfill-links.ts` temel alınabilir).
- [ ] **Arama:** basit site içi arama (`/ara?q=`) — Prisma full-text veya `pg_trgm`. Sonuç yoksa boş durum metni.
- [ ] **Erişilebilirlik & çerez/KVKK:** çerez politikası ile gerçek script'ler uyumlu mu, onay akışı çalışıyor mu denetle.

**Kabul:** Lighthouse mobil performans ≥ 85 · künye gerçek · noindex envanteri gerekçeli · arama çalışıyor.

---

## FAZ 2 — Konumlandırma: araç/veri önce (4–6 hafta, part-time)

- [ ] **Hacim kararı:** günlük haber üretimini haftada 2–3'e indir; her makale gerçek bir "neden şimdi" ve özgün yorum taşısın. Guide üretimi 3/gün → haftada 2.
- [ ] **Niş seç:** öneri — **emeklilik/BES/vergi/getiri** ekseni (rekabet zayıf, niyet yüksek). Alternatif: kripto vergi TR, mevduat/faiz getirisi.
- [ ] **30–50 yüksek niyetli sayfa:** "X ne kadar", "X nasıl hesaplanır", "hangi banka/ürün daha avantajlı", yıl bazlı tablolar. Her sayfa: hesaplayıcı veya tablo + kısa açıklama + SSS + kaynak.
- [ ] **Özgün veri:** kendi ürettiğin en az 1 veri seti (örn. banka faiz/vergi dilimi karşılaştırma tablosu) — alıntılanabilirlik ve backlink için tek gerçek kaldıraç.
- [ ] **Şablon:** tüm araç sayfaları için tek bir kalıp (başlık, hesap, tablo, SSS, ilgili içerik). Kod tekrarını önle.

**Kabul:** 30+ araç/veri sayfası yayında · üretim hacmi düşürüldü · en az 1 özgün veri seti · iç link döngüsü tamam.

---

## FAZ 3 — Dağıtım (sürekli, haftada ~5 saat)

- [ ] Haftalık bülten (Resend, tek konu, tek CTA).
- [ ] X + LinkedIn: her araç/tablo için 1 gönderi; Instagram carousel ayda 4.
- [ ] 1 video formatı (Shorts/Reels, 30–45 sn, tek sayı tek mesaj).
- [ ] Aylık GSC + GA4 raporu: kazanan sayfaları çoğalt, ölen sayfaları birleştir/sil.

---

## Gelir (talep geldikten sonra)

- [ ] AdSense ancak 50–100 kaliteli sayfa + düzenli trafik sonrası. TR finans RPM ~$1–3 → 10k pageview ≈ $10–30/ay. Cep harçlığı.
- [ ] Asıl gelir: affiliate (banka/BES/broker yönlendirme) + sponsorlu bülten + tek seferlik "rapor" satışı.
- [ ] Reklam yerleşimi için `components/AdSlot.tsx` ve `lib/adsense.ts` hazır; publisher ID + onay akışı eksik.

---

## Süre ve bütçe (Yiğit'e özet)

| Kalem | Tutar |
|---|---|
| VPS + domain | ~€5–10/ay + $12/yıl |
| AI (günde 1 makale, gpt-5) | $20–50/ay |
| Resend | $0 → $20/ay |
| **Zorunlu aylık** | **$30–70** |
| Opsiyonel editör (40 makale) | $800–2.000 tek seferlik |
| Opsiyonel tasarım/logo | $300–800 tek seferlik |

- Faz 0: 3–5 saat. Faz 1: 2–3 hafta sonu. Faz 2: 4–6 hafta part-time. Faz 3: sürekli.
- İlk anlamlı organik trafik: **3–6 ay**. 10k/ay: **6–12 ay**, özgün veri olmadan gelmeyebilir.

---

## Yapılmayacaklar

- Haber hacmini artırmak, otomatik yayını açmak, uydurma yazar profili eklemek.
- Yedek doğrulanmadan prod'a deploy etmek.
- Trafik gelmeden reklam/affiliate ağırlıklı tasarım yapmak.
