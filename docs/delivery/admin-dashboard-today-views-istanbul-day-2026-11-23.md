# Yönetim panelinde bugünün görüntüleme sınırı

"Bugün Görüntüleme" sorgusu artık Node sunucusunun yerel `setHours` saatine bağlı değil. Gün başlangıcı `Europe/Istanbul` tarih parçaları ve o tarihteki saat dilimi farkıyla hesaplanıyor; UTC yapılandırılmış sunucularda da Türkiye takvim gününü sayıyor.
