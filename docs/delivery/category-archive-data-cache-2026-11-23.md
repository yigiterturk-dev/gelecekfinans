# Kategori arşivi veritabanı önbelleği

Kategori arşivlerinin sayım ve makale satırı sorguları, URL kategori/sayfa parametreleriyle anahtarlanan 5 dakikalık veri önbelleğine alındı. Görüntülenme sayıları istek başına güncel okunmaya devam ediyor. Yönetim panelindeki makale düzenleme, silme ve toplu durum değişiklikleri aynı önbellek etiketini anında geçersiz kılıyor; yayınlanan içerik kategori listesinde eski kalmıyor.

Doğrulama: Next.js 16.3.4 yerel dokümantasyonundaki `unstable_cache` ve `revalidateTag` sözleşmeleri incelendi; `git diff --check` temiz. Test/build çalıştırılmadı.
