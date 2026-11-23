# Admin toplu makale işlem sonuçları

Toplu yayınlama yayımdaki kayıtların `publishedAt` tarihini yenilemiyor; yeni tarih yalnızca gerçekten yayına geçenlerde atanıyor. Listede bulunmayan kimlikler başarılı sayılmıyor ve toplu işlem yanıtındaki etkilenen kayıt sayısı veritabanı sonucundan geliyor. Pahalı toplu uç dakikada beş istekle sınırlandı ve yanıtları önbelleğe kapatıldı. Arayüz artık API hatalarını ve kapak görseli üretilemeyen yayınları gösteriyor, istek sürerken yinelenen işlemleri engelliyor; backend zaten ilgili sayfaları yenilediği için ikinci bir revalidate çağrısı yapmıyor.
