# Arama API görüntülenme sorgusu — 2026-11-23

`/api/articles` yalnızca arama kartlarını üretmek için makale listesini
alıyordu; buna rağmen `getAllArticles` üzerinden her yenilemede makale başına
görüntülenme sayısı agregasyonu da yapılıyordu. Liste fonksiyonuna isteğe
bağlı sayaç okuma parametresi eklendi ve arama API'si bu sayacı kapatıyor.
Anasayfa ve görüntülenme sıralamasına ihtiyaç duyan diğer çağrılar aynı
varsayılan davranışı koruyor. Kamuya açık sorgunun yalnızca `PUBLISHED`
kayıtları seçtiği de kontrol edildi.

Verification: source review and `git diff --check` only. No tests or build were
run.
