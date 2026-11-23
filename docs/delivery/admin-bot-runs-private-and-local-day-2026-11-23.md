# Bot çalışma raporu gizliliği ve gün kovası

Admin bot çalışma raporu `private, no-store` yanıt veriyor ve IP başına dakikada 30 istekle sınırlı. Aylık maliyet event sorgusu yalnızca toplama için gereken tarih/metadata alanlarını seçiyor; gereksiz sıralama kaldırıldı. Aylık tahminin aktif gün sayısı UTC yerine `Europe/Istanbul` takvim günlerine göre hesaplanıyor.
