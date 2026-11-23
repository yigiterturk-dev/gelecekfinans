# Bileşik faiz rehberi örnek tutarlılığı

Rehberdeki 100.000 TL, yıllık %40, 5 yıl örneği 537.824 TL gösteriyordu; bu yıllık bileşiklemeye karşılık gelir. Araç ise nominal yıllık oranı aylık orana çevirip 60 ay bileşikler. Örnek bu yöntemle yeniden hesaplandı: dönem sonu 715.198,09 TL, toplam kazanç 615.198,09 TL. Rehbere aylık bileşikleme ve kullanılan aylık oran da eklendi.

Değişiklik: `lib/tool-guides.tsx`.

Hesaplayıcı ay bazında çalıştığı için süre alanında bir aydan kısa değerler geçersiz kılındı; sonuç metni ve rehber, yıl değerinin en yakın aya yuvarlandığını belirtiyor.

Doğrulama: aynı 60 aylık döngüyle örnek sayı kontrol edildi; `git diff --check` temiz. Test/build çalıştırılmadı.
