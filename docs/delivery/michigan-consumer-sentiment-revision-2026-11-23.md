# Michigan tüketici anketi final veri güncellemesi — 2026-11-23

9 Ekim'de yayımlanan yazı, Michigan Üniversitesi'nin Ekim öncü tüketici güven endeksini 46,3 ve enflasyon beklentilerini yüzde 4,7 / 3,5 olarak aktarıyordu. Ekim finali 23 Ekim'de yayımlandı; Kasım finali de 20 Kasım'da açıklandı. Bu nedenle önceki öncü değer artık son veri değildi.

Başlık ve içerik 23 Kasım itibarıyla son resmî sonuçlara göre güncellendi: Ekim final genel endeksi 48,0 (Eylül 48,1); Kasım final genel endeksi 51,5; Kasım mevcut koşullar 49,4, beklentiler 52,9. Kasım medyan enflasyon beklentileri bir yıl için yüzde 3,7, uzun dönem için yüzde 3,3 oldu; Ekim karşılıkları yüzde 4,7 ve 3,5 olarak verildi. Anket beklentilerinin gerçekleşmiş TÜFE veya resmî tahmin olmadığı açıklandı. Eski öncü 46,3 değeri tarihsel bağlamda tutuldu.

Öncesinde üretim DB dump'ı `/opt/gelecekfinans-db/yedek/gf-20261123-before-michigan-article-fix.dump` konumuna alındı. Önceki hedef satır `/root/gf-michigan-article-before-fix-20261123.json` dosyasında 0600 izinle saklandı. Yalnızca `title`, `meta`, `content`, `source`, `aiExtras` ve `updatedAt` değiştirildi; status PUBLISHED kaldı.

Canlı URL HTTP 200 ve `x-nextjs-cache: HIT` döndürdü; yeni başlık ve Ekim/Kasım final değerleri doğrulandı. Test çalıştırılmadı; OpenAI API çağrısı yapılmadı.

Kaynaklar: [University of Michigan Surveys of Consumers](https://www.sca.isr.umich.edu/) ve [Ekim 2026 final raporu](https://data.sca.isr.umich.edu/fetchdoc.php?docid=82351).
