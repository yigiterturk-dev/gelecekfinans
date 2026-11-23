# TCMB faiz tabloları için yürürlük tarihi eşleşmesi

Canlı faiz adaptörü politika oranını bir haftalık repo sayfasından, gecelik alt ve üst bantları ayrı faiz oranları sayfasından alıyor. Her iki sayfada da sayısal değerler geçerli olsa bile tabloların son satırları farklı yürürlük tarihlerine ait olabilir. Adaptör artık bu durumda oran setini reddedip mevcut tarihli statik fallback'i kullanıyor; farklı günlerden gelen oranları tek güncel set gibi etiketlemiyor. TCMB iki tabloda yılı farklı biçimde yazabiliyor (`2026` ve `26`); karşılaştırma önce iki basamaklı yılı 20xx biçimine normalize ediyor.

Canlı TCMB tablolarında son satırlar sırasıyla `23.10.2026` ve `23.10.26` biçiminde gösteriliyor: [1 Hafta Repo](https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Temel+Faaliyetler/Para+Politikasi/Merkez+Bankasi+Faiz+Oranlari/1+Hafta+Repo), [gecelik faiz oranları](https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Temel+Faaliyetler/Para+Politikasi/Merkez+Bankasi+Faiz+Oranlari/faiz-oranlari).

Kaynak kod incelemesi ve `git diff --check` yapıldı. Test/build veya canlı istek çalıştırılmadı.
