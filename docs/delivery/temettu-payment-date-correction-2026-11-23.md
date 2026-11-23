# Temettü ödeme zamanı düzeltmesi — 2026-11-23

Canlı temettü rehberi, nakit temettünün her durumda hak kullanım tarihini izleyen ikinci iş günü hesaba geçtiğini söylüyordu. MKK'nın süreç dokümanı, ödeme akışını ihraççının MKK'ya fon aktarmasına ve sonrasındaki dağıtıma bağlı tanımlıyor; genel bir sabit ödeme günü taahhüt etmiyor. Rehberde ödeme tarihinin KAP'taki kesinleşmiş hak kullanım duyurusundan takip edilmesi gerektiği belirtildi ve eski kural FAQ/structured FAQ içinde de güncellendi.

Stopaj oranını da resmi kaynakla çapraz kontrol ettim: GİB'in menkul sermaye iradı açıklaması, tam mükellef şirketlerden alınan kar payında 9286 sayılı kararla %15 tevkifat uygulandığını belirtiyor. Mevcut %15 açıklaması korundu. Kişiye özel beyan durumu için içerik zaten GİB/mali müşavir kontrolüne yönlendiriyor; bu editte vergi hükümlerine dair daha geniş iddia eklenmedi.

Kaynaklar:
- [MKK Hak Kullanım İşlemleri](https://www.mkk.com.tr/saklama-hizmetleri/mks-islemleri/hak-kullanim-islemleri)
- [MKK MKS İş ve Bilişim Uygulama İlkeleri, temettü ödeme akışı](https://www.mkk.com.tr/sites/default/files/2023-07/MKS_%C4%B0%C5%9F_ve_Bili%C5%9Fim_Uygulama_%C4%B0lke_ve_Kurallar%C4%B1_Y%C3%B6nergesi.pdf)
- [GİB Menkul Sermaye İradı](https://gib.gov.tr/vergi-konulari/1_bireysel/10_menkul-sermaye-iradi/10)

Önce üretim yedeği 2026-11-23 06:02 CET'te tazelendi ve ağsız PostgreSQL 17 konteynerine `pg_restore --exit-on-error` ile geri yüklendi (214 makale, 14 tablo). Tam önceki hedef satırı `/root/gf-temettu-before-20261123.json` dosyasında 0600 izinle korundu. Yalnızca `content` ve `aiExtras` değişti; makale PUBLISHED kaldı, `automationMeta` ve `autoPublished` aynı kaldı. Doğrulanmış kanıt işareti eklenmedi; model/API çağrısı yapılmadı.

Canlı URL HTTP 200 ve ikinci istekte `x-nextjs-cache: HIT` döndürdü. HTML'de gövde, FAQ ve JSON-LD içinde artık sabit ikinci iş günü kuralı yok. Servis active, `NRestarts=0`. Test çalıştırılmadı. Claim düzeyinde inceleme kuyruğu sürüyor.
