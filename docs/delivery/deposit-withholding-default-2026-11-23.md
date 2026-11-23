# Mevduat hesaplayıcısında stopaj varsayılanı

## Değişiklik

- 32 günlük örnek vadeli hesap için eski %10 varsayılanı %17,5 olarak güncellendi.
- Araç ve SSS, TL mevduat stopajının vade ve açılış/yenileme tarihine göre değiştiğini açıklar; özel hesap ve para birimi farkları için kullanıcıya kendi oranını doğrulaması söyleniyor.
- GİB'in 2026 Geçici 67 rehberine doğrudan bağlantı eklendi.
- Stopaj alanının vade değişince kendiliğinden değişmediği; oranı kullanıcının bankasından teyit edip elle güncellemesi gerektiği açıkça yazıldı.
- Vade artık tam sayı olarak doğrulanıyor; sonlu girişlerin hesap sonucunu taşırması durumunda geçersiz sonuç gösterilmiyor.

## Kaynak ve doğrulama

- [GİB — 2026 Geçici 67 rehberi](https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Ffileadmin%2Fbeyannamerehberi%2F2026%2F2026_Gecici67.pdf), “Mevduat faizleri” bölümü: 9.7.2025'ten itibaren açılan/yenilenen hesaplarda 6 aya kadar %17,5; 1 yıla kadar %15; 1 yıldan uzun vadede %10.
- `git diff --check` çalıştırıldı. Test/build çalıştırılmadı.
