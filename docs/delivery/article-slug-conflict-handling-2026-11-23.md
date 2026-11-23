# Makale adresi oluşturma ve çakışma yanıtları

Slug kısaltması artık son karakterde kalan tireleri temizliyor. Manuel ve araştırma kaynaklı makalelerde slug boşsa kayıt oluşturulmuyor. Kullanımdaki slug önceden kontrol edilerek `409` dönüyor; ön kontrolden sonra yarış koşuluyla oluşan Prisma `P2002` hatası da aynı şekilde `409` olarak ele alınıyor. Böylece bozuk/boş URL veya beklenmeyen sunucu hatası yerine editörün düzeltebileceği açık bir yanıt veriliyor.
