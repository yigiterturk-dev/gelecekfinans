# Arşiv tarihlerini Türkiye saatine göre gruplama

Arşiv haberleri artık ay gruplarını sunucu saat dilimine göre değil `Europe/Istanbul` takvimine göre belirliyor. Haber kartlarının mutlak tarihleri de Türkiye saat diliminde gösteriliyor; böylece ay/yıl sınırına yakın UTC zaman damgaları Türkiye'deki okurlar için yanlış güne veya aya kaymıyor. Geçersiz tarih arşivde “Tarih bilinmiyor” grubunda kalır.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
