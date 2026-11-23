# Ocak 2027 memur zammı rehberi düzeltmesi — 2026-11-23

Canlı PUBLISHED rehberde 2026–2027 toplu sözleşme görüşmelerinin Ağustos 2025'te başlayacağı gelecek zamanla yazılmıştı; aynı bilgi FAQ ve özetlerde de tekrarlanıyordu. Oysa görüşmeler 2025'te sonuçlandı ve Kamu Görevlileri Hakem Kurulu kararı 27 Ağustos 2025'te yayımlandı.

Makale gövdesi ve aiExtras içindeki özet/SSS, resmi karara göre düzeltildi: 2027 ilk altı ay için %5, ikinci altı ay için %4 sözleşme artışı. Enflasyon farkının ayrıca uygulanabileceği ve bu sözleşme oranlarının tek başına nihai toplam maaş artışı olmadığı açıkça belirtildi. Enflasyon farkının tam tutarı gerçekleşmelere ve sözleşme hükümlerine bağlı olduğundan kesin toplam zam iddiası eklenmedi. TÜİK bağlantısının hangi iddiayı desteklediği (TÜFE verisi, sözleşme oranı değil) açıklandı.

Kaynaklar:
- Çalışma ve Sosyal Güvenlik Bakanlığı, [Kamu Çalışanları ve Emeklilerinin Zam Oranlarına İlişkin Karar Resmî Gazete'de](https://www.csgb.gov.tr/cgm/haberler/27082025/)
- Bakanlığın [8. Dönem Toplu Sözleşme mevzuat sayfası](https://www.csgb.gov.tr/cgm/mevzuat/)

Önce `/opt/gelecekfinans-db/yedek/gf-20261123.dump` tazelendi; 214 makale ve 14 public tablo ağsız PostgreSQL 17 konteynerine `pg_restore --exit-on-error` ile başarıyla geri yüklendi. Önceki hedef satırı `/root/gf-memur-zam-before-20261123.json` içinde 0600 izinle saklandı. Güncelleme yalnızca `content` ve `aiExtras` alanlarına yapıldı; makale PUBLISHED kaldı, `automationMeta` ve `autoPublished` değişmedi, doğrulanmış kanıt işareti eklenmedi. Hiçbir model/API çağrısı yapılmadı.

Canlı URL HTTP 200 döndü. İlk istek ISR `STALE`, ikinci istek `HIT` verdi; render edilmiş sayfada güncel gövde ve yeni FAQ/özet görüldü. Servis active, `NRestarts=0`. Test çalıştırılmadı. Makale claim düzeyinde editoryal inceleme kuyruğunda kalıyor.
