# Rehber listesinin doğrudan sorgulanması

`getGuides` rehber slugs listesini alıp sonra yalnızca en yeni 200 genel makale içinde eşleştiriyordu. 200'den eski rehberler, rehber sorgusu daha geniş olsa bile `/rehber` ve içerik sayfalarının ilgili rehber şeritlerinde kaybolabiliyordu. Fonksiyon artık istenen rehber kayıtlarının liste alanlarını doğrudan okuyor; görüntülenme sayacı yalnızca bu rehberlerin yolları için sorgulanıyor.

Doğrulama: sorgu seçimi ve `ArticleListItem` eşlemesi kod üzerinden gözden geçirildi; `git diff --check` temiz. Test/build çalıştırılmadı.
