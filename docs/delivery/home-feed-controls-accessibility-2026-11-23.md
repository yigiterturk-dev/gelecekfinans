# Ana sayfa haber kontrolleri erişilebilirliği

Ana sayfa kategori filtreleri adlandırılmış bir grup haline getirildi; düğmeler seçili durumlarını `aria-pressed` ile bildiriyor ve form içinde yanlışlıkla gönderim yapmıyor. Son dakika duyurusu status bölgesi olarak duyuruluyor; kapatma düğmesinin de erişilebilir adı var.

Son dakika API yanıtı arayüzde kullanılmadan önce doğrulanıyor. Boş/hatalı metinler gösterilmiyor; bağlantı yalnızca mutlak HTTP(S) adresiyse tıklanabilir oluyor.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
