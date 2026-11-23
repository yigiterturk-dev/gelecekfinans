# Ortak fiyat API’sinde TCMB kaynağı

`/api/fiyatlar` içindeki TCMB döviz verisi artık `tcmb.source: "TCMB"` alanı taşıyor. Böylece aynı yanıttaki TCMB, Yahoo Finance ve CoinGecko kaynak bilgileri açıkça tanımlanıyor. HTTP hata yanıtında ve ağ/parse hatasında da kaynak adı korunuyor; `usd`, `eur` ve `gbp` alanları her durumda var ve veri yoksa `null` dönüyor.

Test veya derleme çalıştırılmadı.
