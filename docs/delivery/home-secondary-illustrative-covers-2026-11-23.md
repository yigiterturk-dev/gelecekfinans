# Ana sayfa ikincil haber kartlarında temsili kapaklar

Ana sayfadaki ikincil haber kartları, eksik kapak görseli için kategoriye ait temsili görsel kullanırken haberi görselin alt metni olarak veriyor ve temsili olduğunu belirtmiyordu. Kartlar artık `articleCoverAlt` ile görseli doğru betimliyor ve temsili görsel rozetini gösteriyor; gerçek kapaklarda rozet çıkmıyor.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
