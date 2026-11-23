# Türkiye tüketici güveni, Kasım 2026 — 2026-11-23

`tuketici-guven-endeksi-kasimda-yukseldi` yazısında Kasım 2026 endeks ve alt endeks rakamları TÜİK bülteniyle uyumluydu. Ancak görünür kaynaklar yalnızca ikincil haberlerdi ve ana endeksin 100’ün altında kalmasının kötümser duruma karşılık geldiği açıklanmamıştı.

Başlık ve metin resmi TÜİK/TCMB anket sonuçlarına bağlandı. Beş endeks için Ekim/Kasım değerleri ve aylık değişimler tabloya alındı; aylık artışın 100 eşiğinin altında kalan genel görünümle karıştırılmaması ve verinin anket algısı olduğu açıklandı. İkincil kaynaklar çıkarıldı, `aiExtras` temizlendi.

Öncesinde tam PostgreSQL yedeği `/opt/gelecekfinans-db/yedek/gf-20261123-before-consumer-confidence-article-fix.dump`, önceki satır `/root/gf-consumer-confidence-before-fix-20261123.json` (0600) olarak saklandı. DB güncellemesi başarılı oldu. Canlı URL HTTP 200 / `x-nextjs-cache: HIT` verdi; TÜİK kaynağı, beş alt endeks tablosu ve 100 altı yorum görüldü.

Kaynak: [TÜİK — Tüketici Güven Endeksi, Kasım 2026](https://veriportali.tuik.gov.tr/tr/press/58179).
