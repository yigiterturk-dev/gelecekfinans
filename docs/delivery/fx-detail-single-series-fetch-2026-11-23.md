# Döviz detay sayfası tek seri isteği — 2026-11-23

`/doviz/[pair]` sayfası kur, önceki iş günü ve 30 günlük grafiği ayrı fonksiyon çağrılarından bekliyordu. Sayfa artık `getFxWithHistory()` ile bu üç çıktıyı tek Frankfurter TRY-bazlı 30 günlük seriden alıyor; diğer TCMB, rehber ve haber istekleri paralel kalıyor. Seri uç noktası boş/hatalı yanıt verirse mevcut `getFx()` yolu güncel kuru almak için yedekleniyor, grafik geçmişi gizleniyor.

Doğrulama: aynı `from`/`to` Frankfurter v2 sorgu biçimi mevcut tarihçe kodunda zaten kullanılıyordu; `git diff --check` temiz. Test/build çalıştırılmadı.
