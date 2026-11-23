# 12–16 Ekim BIST haftalık haber düzeltmesi — 2026-11-23

17 Ekim tarihli makale, 12–16 Ekim haftasını başlıkta gün belirtmeden “bu hafta” diye sunuyordu. Gövdeye kanıt kimliğinin sonu `[.com.tr-borsada-…]` sızmıştı; ayrıca ara başlık “Pasifik Holding” derken açıklama başka bir şirketi, Akfen Yenilenebilir Enerji'yi, haftanın ilk sırasına koyuyordu.

Başlık ve içerik açıkça 12–16 Ekim tarihsel haftasını belirtecek şekilde düzenlendi. BIST 100 kapanışı 11.721,72 puan / -%4,44; hafta içi aralık 11.653,38–12.291,17; ilk üç yükselen AKFYE +%2,89, ENTRA +%2,57, SAHOL +%2,16; ilk üç düşen BINHO -%26,32, TKFEN -%23,77, ASTOR -%18,40 olarak Ekonomist/AA ve CNBC-e ile karşılaştırıldı. Çelişkili ara başlık ve kısmi kanıt etiketi artığı kaldırıldı; `aiExtras` kapatıldı, PUBLISHED durumu korundu.

Öncesinde DB dump'ı `/opt/gelecekfinans-db/yedek/gf-20261123-before-bist-weekly-fix.dump` konumuna alındı. Tam hedef satır `/root/gf-bist-weekly-before-fix-20261123.json` dosyasında 0600 izinle saklandı. Yalnızca `title`, `meta`, `content`, `source`, `aiExtras` ve `updatedAt` değiştirildi.

Canlı URL HTTP 200 ve `x-nextjs-cache: HIT` verdi. Yeni tarihli başlık ve tablo görüldü; `[.com.tr-borsada-…]` artığı ve editör iç notu artık HTML’de yok. Son kontrol üç ardışık HTTP 200 / `x-nextjs-cache: HIT` yanıtında temiz çıktı verdi. Test çalıştırılmadı; OpenAI API çağrısı yapılmadı.

Kaynaklar: [Ekonomist / Anadolu Ajansı — 12–16 Ekim haftası](https://www.ekonomist.com.tr/borsa/borsada-bu-hafta-en-cok-kazandiran-ve-kaybettiren-3-hisse-79957), [CNBC-e — haftanın kazanan ve kaybedenleri](https://www.cnbce.com/borsa/borsada-haftanin-kazananlari-ve-kaybedenleri-bir-hissede-kayip-yuzde-26yi-asti-g39661).
