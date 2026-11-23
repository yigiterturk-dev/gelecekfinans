# TCMB profil rehberi — 2026-11-23

`turkiye-cumhuriyet-merkez-bankasi-nedir-sahibi-kim` başlığı hissedarlığı soruyordu ancak gövde bu soruyu yanıtlayamadığını söylüyordu. Aynı içerikte kredi kartı oranları Eylül 2026 kesitine dayanıyor ve resmi TCMB kaynakları yoktu.

Rehber TCMB’nin görevlerini, 2025 sonu hissedarlık sınıflarını ve Hazine’ye tahsis edilen A sınıfı payların yasal çoğunluk çerçevesini açıklayacak şekilde yenilendi. Kredi kartı oranları TCMB’nin 1 Kasım 2026 tablosuna göre tarihli bir kesit olarak eklendi; bankaların üst sınırın altında oran uygulayabileceği ve farklı işlem türlerinin ayrı kurallara tabi olabileceği belirtildi. Üç birincil TCMB bağlantısı eklendi, `aiExtras` temizlendi.

Öncesinde tam PostgreSQL yedeği `/opt/gelecekfinans-db/yedek/gf-20261123-before-tcmb-profile-article-fix.dump`, önceki satır `/root/gf-tcmb-profile-before-fix-20261123.json` (0600) olarak saklandı. DB güncellemesi başarılı oldu. Canlı URL HTTP 200 / `x-nextjs-cache: HIT` verdi; yeni başlık, 2025 yıl sonu hissedarlık payları ve 1 Kasım oran tablosu göründü; eski Eylül özeti artık yok.

Kaynaklar: [TCMB — Sermaye ve Hissedarlık Yapısı](https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB%20TR/Main%20Menu/Banka%20Hakkinda/Kurumsal%20Yapi/Sermaye%20ve%20Hissedarlik%20Yapisi), [TCMB — Kredi Kartı İşlemlerinde Uygulanacak Azami Faiz Oranları](https://tcmb.gov.tr/wps/wcm/connect/TR/TCMB%2BTR/Main%2BMenu/Istatistikler/Bankacilik%2BVerileri/Kredi_Karti_Islemlerinde_Uygulanacak_Azami_Faiz_Oranlari).
