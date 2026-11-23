# Altın kotasyonlarında sağlayıcı sayı doğrulaması

Yahoo ve CoinGecko altın yanıtları çalışma zamanı şeması doğrulaması olmadan tiplendiriliyordu. Olumlu ve sonlu olmayan kotasyonlar, hatalı değişim yüzdeleri veya geçersiz Unix zamanları artık kabul edilmiyor; uygunsuz kotasyonda Yahoo'dan CoinGecko yedeğine geçiliyor, yalnızca geçersiz yardımcı değer varsa fiyat korunup o alan boş bırakılıyor. TRY dönüşümünden sonra sonlu ve pozitif olmayan fiyatlar da detay/hub sonuçlarına alınmıyor. Yahoo önceki-kapanış yardımcısı tüm çağrılarda sonlu ve pozitif değer döndürüyor.

Kaynak incelemesi ve `git diff --check` yapıldı. Test/build veya dış sağlayıcı isteği çalıştırılmadı.
