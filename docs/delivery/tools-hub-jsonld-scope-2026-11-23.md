# Araçlar hub yapılandırılmış açıklaması — 2026-11-23

`/araclar` sayfasının CollectionPage JSON-LD açıklaması artık görünür hub
içeriğindeki BES ve OKS hesaplayıcılarını da kapsıyor. Yeni araçlar mevcut
durumda sitemap'e, araç listesine ve ortak iç bağlantı şeridine dahil; halka
arz ve aracı kurum rehberleri de Borsa sayfasından birbirine bağlanıyor.

Araç kataloğu artık `/araclar` kartlarını, JSON-LD ItemList'i, ortak iç bağlantı
şeridini, sitemap girdilerini ve statik rota parametrelerini besliyor. Detay
sayfasındaki `Record<ToolSlug, ToolDef>` tanımı katalogdaki her slug için
sayfa metadatası ve hesaplayıcı eşlemesi zorunlu kılıyor.

Verification: source inspection and `git diff --check` only. No tests or build
were run.
