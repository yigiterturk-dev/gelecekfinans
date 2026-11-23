# Bülten gönderiminde paylaşımlı hız sınırı zorunlu — 2026-11-23

Paylaşımlı DB hız sayacı erişilemediğinde `hizFreniPaylasimli` yerel bellek
yedeğine düşüyor. Bülten POST'u bu yedekle 5/instance sınırını uygulayıp birden
fazla uygulama örneğinde daha fazla onay e-postası gönderebilirdi. E-posta
gönderen uç artık yalnızca `kaynak: "db"` sonucunda devam ediyor; bellek yedeği
kullanılırsa e-posta veya abone yazımı yapılmadan `503`, `Retry-After: 30` ve
`no-store` yanıtı veriyor. Diğer, e-posta göndermeyen sayaç kullanıcılarının
davranışı değişmedi.

Doğrulama: kaynak akışı incelemesi ve `git diff --check`. Test veya build çalıştırılmadı.
