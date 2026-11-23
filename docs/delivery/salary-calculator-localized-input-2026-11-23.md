# Maaş hesaplayıcısında sayı biçimi girişi

Maaş alanı Türkçe binlik/ondalık biçimini (50.000,50) ve ondalık nokta kullanan girişi (50000.50) tutarlı biçimde ayrıştıracak şekilde güncellendi. Önceki ayrıştırma her noktayı binlik ayırıcı saydığı için ondalık noktalı tutarları yanlış büyütebiliyordu. Hatalı ve kısmi metinler artık geçerli sayı kabul edilmez.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
