# Çin Ekim 2026 göstergeleri — 2026-11-23

`cin-ekonomisinde-ekim-ayi-verileri-tuketim-ve-konut-piyasasinda-daralma` yazısındaki perakende satış, sabit yatırım ve gayrimenkul yatırım oranları genel olarak NBS verileriyle tutarlıydı; ancak kaynaklar yalnızca ikincil haberlerdi. Ayrıca 70 şehir konut fiyatlarını tek bir ortalama gibi sunup farklı şehir/tür endekslerini genelleştiriyordu.

Yazı NBS’nin ekim ekonomik faaliyet bülteni ve 70 kent konut fiyatı bülteniyle yeniden düzenlendi. Ekim aylık/ yıllık perakende ayrımı; ocak–ekim sabit yatırımlarının kırsal haneler hariç kapsamı; gayrimenkul yatırımı ve yeni konut satış alanı/değeri açıklandı. Sanayi üretiminin yıllık artışı da bağlam için eklendi. Konut fiyatları şehir grupları ve yeni/ikinci el kapsamıyla sınırlandı; doğrulanmamış genel ortalama fiyat değişimleri çıkarıldı. İki NBS kaynağı eklendi; `aiExtras` temizlendi.

Öncesinde tam PostgreSQL yedeği `/opt/gelecekfinans-db/yedek/gf-20261123-before-china-october-data-article-fix.dump`, önceki satır `/root/gf-china-october-data-before-fix-20261123.json` (0600) olarak saklandı. DB güncellemesi başarılı oldu. Canlı URL HTTP 200 / `x-nextjs-cache: HIT` verdi; NBS kaynakları ve kapsam notu görüldü, hatalı yüzde 0,15 fiyat ortalaması yok.

Kaynaklar: [NBS — National Economy in October 2026](https://www.stats.gov.cn/english/PressRelease/202611/t20261116_1965843.html), [NBS — 70 şehir konut fiyatları, Ekim 2026](https://www.stats.gov.cn/english/PressRelease/202611/t20261116_1965848.html).
