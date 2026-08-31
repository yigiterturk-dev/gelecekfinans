# İki Şeritli İçerik Motoru + SEO Geri Besleme

## Neden
Bot yalnızca RSS haber akışından besleniyordu. Sonuç: tazelik var, arama talebi yok.
"5 Ağustos kapanışı" tipi haberler kimsenin aramadığı sayfalar üretiyor; "dolar kaç TL olur",
"gram altın nasıl alınır" gibi kalıcı trafik getiren sorgular boşta kalıyor.
Ayrıca ikinci-bağımsız-kaynak kapısı kripto/altın/döviz dikeylerinde tutmadığı için
üretimin tamamı `ekonomi` kategorisine sıkışmıştı (2026-08-31 denetimi).

## Şeritler

| | Şerit A — Haber (mevcut) | Şerit B — Rehber (yeni) |
|---|---|---|
| Tetik | RSS akışı (`topics.ts`) | Anahtar kelime havuzu (`Keyword` tablosu) |
| Kanıt kapısı | 2 bağımsız yayıncı | Resmî veri kaynağı (TCMB/TÜİK/BIST/SPK) |
| Uzunluk | 320-800 kelime | 900-1800 kelime |
| Amaç | Tazelik, haber niyeti | Kalıcı trafik, bilgi niyeti |
| Yayın | 3x/gün cron | 1x/gün, düşük tempo |

Şerit B haber kapısını gevşetmez; **farklı** bir kapı kullanır. Rehber içerikte
"ikinci gazete" anlamsızdır, doğru kanıt resmî kurumun kendi verisidir.

## Bileşenler
1. `Keyword` modeli — havuz, niyet, küme (cluster), durum, GSC metrikleri.
2. `lib/bot/keywords.ts` — havuz yönetimi, sıradaki kelimeyi seçme.
3. `lib/bot/evergreen.ts` — resmî kaynak kanıt paketi + rehber konu üretimi.
4. `writeGuideArticle()` — rehber preset'i, kendi kalite kapısı (`mode: "guide"`).
5. `lib/seo/gsc.ts` — Search Console adaptörü. Kimlik yoksa `PageView`'a düşer.
6. `lib/bot/refresh.ts` — 8-20. sırada takılan sayfaları tazeleme kuyruğuna alır.
7. Hub/spoke iç linkleme — `linker.ts` uzantısı.
8. Haftalık SEO raporu — admin paneli + mail.

## Durum
Faz 1-8 uygulanıyor.
