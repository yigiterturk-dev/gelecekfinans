# Temettü hesaplayıcısında stopaj varsayılanı

## Değişiklik

- Hesaplayıcının eski %10 varsayılanı, GİB'in GVK 94 kesinti tablosunda ve 9286 sayılı Cumhurbaşkanı Kararı'nda yer alan genel %15 oranıyla güncellendi.
- Araçtaki açıklama oran kapsamını ve alıcının/kurumun vergi durumuna göre farklılaşabileceğini belirtiyor; GİB kaynağına doğrudan bağlantı veriyor.
- Hisse adedi artık pozitif tam sayı olmalı; aşırı veya geçersiz girdiler hesaplama sonucuna taşınmıyor.

## Kaynak ve doğrulama

- [GİB — GVK 94 kesinti oranları](https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2Fgelir-vergisi-kanununun-94uncu-maddesinde-yer-alan-kesinti-oranlari.pdf): 22.12.2024'ten itibaren genel kâr payı kesinti oranı %15.
- `git diff --check` çalıştırıldı. Test/build çalıştırılmadı.
