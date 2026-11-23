# Ağustos 2026 enflasyon sayfası arşiv ve kaynak düzeltmesi — 2026-11-23

Yazıdaki dört ana oran doğruydu; ancak başlıkta yıl yoktu, TÜİK'e doğrudan bağlantı bulunmuyordu ve piyasa beklentilerine dair ayrı anlatım resmi TÜİK bülteniyle desteklenmiyordu. Sayfanın Ağustos 2026 dönemi tarihsel verisi olduğu açıkça belirtilmediğinden, okuyucu bunu güncel enflasyon gibi değerlendirebilirdi.

Başlık 2026 yılını ve aylık/yıllık TÜFE oranını belirtecek şekilde güncellendi. TÜFE ve Yİ-ÜFE için aylık, yıllık, 2025 Aralık ayına göre ve 12 aylık ortalamalara göre değerler resmi TÜİK bültenlerine göre yazıldı. Piyasa beklentisi kısmı çıkarıldı; TÜFE ile Yİ-ÜFE farkının tek başına fiyat geçişini veya gelecek enflasyonu göstermediği not edildi. `aiExtras` kaldırıldı, PUBLISHED durumu ve otomasyon metadata'sı korundu.

Öncesinde PostgreSQL dump'ı `/opt/gelecekfinans-db/yedek/gf-20261123-before-inflation-article-fix.dump` konumuna alındı. Tam önceki hedef satır `/root/gf-inflation-article-before-fix-20261123.json` dosyasında 0600 izinle saklandı. Yalnızca `title`, `meta`, `content`, `source`, `aiExtras` ve `updatedAt` değiştirildi.

Canlı URL HTTP 200 ve `x-nextjs-cache: HIT` verdi; Ağustos 2026 başlığı ve %31,51 oranı sayfa HTML’inde görüldü. Test çalıştırılmadı; OpenAI API çağrısı yapılmadı.

Kaynaklar: [TÜİK TÜFE — Ağustos 2026](https://veriportali.tuik.gov.tr/tr/press/58290/metadata-T%C3%9C%C4%B0K), [TÜİK Yİ-ÜFE — Ağustos 2026](https://veriportali.tuik.gov.tr/Bulten/Index?dil=1&p=Yurt-%C4%B0%C3%A7i-%C3%9Cretici-Fiyat-Endeksi-A%C4%9Fustos-2026-58040).
