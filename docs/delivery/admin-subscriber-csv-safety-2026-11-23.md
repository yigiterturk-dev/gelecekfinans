# Abone CSV dışa aktarma güvenliği — 2026-11-23

Abone dışa aktarması mevcut filtreyi koruyarak API sayfalarını imleçle alıyor;
tablonun ilk 200 satırıyla sınırlı kalmıyor ve yeni kayıt eklenmesi sayfaları
kaydırmıyor. Tüm hücreler CSV standardına göre
tırnaklanıyor ve iç tırnaklar kaçırılıyor. Formül belirteciyle başlayan veya
başında boşluk bulunan kullanıcı girdilerine apostrof eklenerek elektronik
tablo formülü olarak yorumlanmaları engelleniyor. UTF-8 BOM ve CRLF satır
sonları Türkçe karakterlerle uyumluluğu iyileştiriyor. Büyük dışa aktarma
sırasında indirme düğmesi kilitlenip ilerleme durumu gösteriliyor.

Verification: source review and `git diff --check` only. No tests or build were
run.
