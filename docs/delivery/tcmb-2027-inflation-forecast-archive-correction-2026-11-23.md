# TCMB Enflasyon Raporu 2026-IV özeti — 2026-11-23

`tcmbnin-2027-enflasyon-tahmini-ve-varsayimlari` yazısında resmi 2027 tahmini doğruydu, ancak tahmin ile ara hedef ayrımı yapılmıyor, TCMB’nin temel raporuna bağlantı yoktu ve gıda enflasyonunun gerileyeceği yönündeki anlatım rapordaki yukarı yönlü gıda varsayım revizyonuyla çelişebiliyordu. Ayrıca 2021’den beri “18 yukarı revizyon” iddiası ikincil kaynaklara dayanıyordu.

Yazı TCMB’nin 12 Kasım tarihli Enflasyon Raporu 2026-IV’üne göre yenilendi. 2026–2029 yıl sonu tahminleri ile 2026–2028 ara hedefleri ayrı gösterildi; petrol ve gıda enflasyonu varsayımlarındaki yukarı yönlü revizyonlar resmi tabloya göre eklendi. Doğrulanması gerekmeyen revizyon sayısı iddiası çıkarıldı, politika varsayımları ve belirsizlikler kaynağın kapsamıyla sınırlandı. TCMB ve SBB bağlantıları eklendi; `aiExtras` temizlendi.

Öncesinde tam PostgreSQL yedeği `/opt/gelecekfinans-db/yedek/gf-20261123-before-tcmb-inflation-report-article-fix.dump`, önceki satır `/root/gf-tcmb-inflation-report-before-fix-20261123.json` (0600) olarak saklandı. DB güncellemesi başarılı oldu. Canlı URL HTTP 200 / `x-nextjs-cache: HIT` verdi; tahmin/ara hedef tablosu ve petrol/gıda varsayım revizyonları görüldü, 18 revizyon iddiası yok.

Kaynaklar: [TCMB — Enflasyon Raporu 2026-IV](https://www.tcmb.gov.tr/wps/wcm/connect/77e51296-e41a-4874-9ca0-3c2f466f66c8/enf26_iv_tam.pdf?MOD=AJPERES), [SBB — Orta Vadeli Programlar](https://www.sbb.gov.tr/orta-vadeli-programlar/).
