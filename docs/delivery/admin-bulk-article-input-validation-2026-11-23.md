# Toplu makale işlem sınırları

Toplu makale endpoint'i artık bozuk JSON/gövdeyi, izin verilmeyen işlem adını, hatalı kimlikleri ve arayüzün tek sayfada seçebileceği 20 kayıt sınırını doğruluyor. Tekrarlanan kimlikler veritabanı işleminden önce tekilleştiriliyor; hatalı gövde Prisma sorgusuna ulaşmıyor.

Doğrulama: yönetim arayüzündeki sayfa boyutu 20 kayıtla eşleştirildi; `git diff --check` temiz. Test/build çalıştırılmadı.
