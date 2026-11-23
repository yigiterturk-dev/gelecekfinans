# Hızlı arama API önbelleği

Site aramasının `/api/articles` uç noktası 5 dakikalık ISR önbelleğine alındı. Makale düzenleme, silme ve toplu yayın durumu değişiklikleri bu endpoint'i de geçersiz kılıyor; yönetim değişiklikleri arama sonuçlarında en geç TTL süresini beklemeden görünür.

Doğrulama: Next.js 16 yerel Route Handler belgesinde `revalidate` ve `revalidatePath` kullanımı incelendi; `git diff --check` temiz. Test/build çalıştırılmadı.
