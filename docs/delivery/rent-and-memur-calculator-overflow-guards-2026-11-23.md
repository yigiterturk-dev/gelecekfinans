# Kira ve memur maaşı hesaplarında taşma koruması

Kira aracında artış, yeni kira ve yıllık tutarın her biri sonlu değilse sonuç gösterilmez. Memur zammı aracında da zam oranı geçerli olsa bile maaş çarpımının sayısal sınırı aşması ayrı bir durum olarak açıklanır. Böylece `Infinity`/`NaN` biçimlendirilmiş değerler kullanıcıya tutar gibi sunulmaz.

Doğrulama: `git diff --check` temiz. Test/build çalıştırılmadı.
