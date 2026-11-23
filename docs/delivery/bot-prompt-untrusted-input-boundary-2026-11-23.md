# Bot prompt güven sınırı — 2026-11-23

## Değişiklik

`lib/bot/writer.ts` içindeki haber yazarı, rehber ve varlık profili talimatlarına; konu, kaynak metni, küme başlıkları ve rol değerlerinin yalnızca veri olduğu, bu içeriklerdeki gömülü talimatların uygulanmaması gerektiği eklendi. Kanıt paketindeki kaynak alanları JSON dizgesi olarak yazılarak satır sonlarının sahte alanlar oluşturması önlendi. Doğrulayıcıya da kanıt paketi ve taslağın yalnızca inceleme girdisi olduğu belirtildi. Kalite, doğrulama ve intihal onarım çağrılarında otomatik/model kaynaklı notlar güvenilmeyen bulgu olarak çerçevelendi.

## Etki sınırı

Değişiklik prompt metniyle sınırlı. Botlara araç veya yeni yetki eklenmedi. İncelenen `app/api/bot/generate/route.ts` tek içerik talebi başına `autoPublish: false` veriyor; rehber hattında otomatik yayımlama kapalı. Bu kontrolleri değiştirmedim.

## Doğrulama

`git diff --check` temiz. Test/build çalıştırılmadı.
