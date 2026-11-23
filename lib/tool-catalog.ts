/** Public discovery data shared by the tools hub, internal links and sitemap. */
export const TOOL_CATALOG = [
  { slug: "doviz-cevirici", title: "Döviz Çevirici", railLabel: "Döviz Çevirici", desc: "Dolar, Euro, Sterlin ve TL arasında canlı kurla çeviri yapın.", icon: "💱" },
  { slug: "altin-hesaplama", title: "Altın Hesaplama", railLabel: "Altın Hesaplama", desc: "Gram, çeyrek ve cumhuriyet altınının güncel TL değerini hesaplayın.", icon: "🥇" },
  { slug: "kredi-faiz-hesaplama", title: "Kredi Faizi Hesaplama", railLabel: "Kredi Faizi", desc: "Kredi tutarı, faiz ve vadeye göre aylık taksit ve toplam ödemeyi görün.", icon: "🏦" },
  { slug: "mevduat-faiz-hesaplama", title: "Mevduat Faizi Hesaplama", railLabel: "Mevduat Faizi", desc: "Vadeli mevduatın brüt ve stopaj sonrası net getirisini hesaplayın.", icon: "💰" },
  { slug: "enflasyon-hesaplama", title: "Enflasyon Hesaplama", railLabel: "Enflasyon", desc: "Paranızın enflasyon karşısındaki alım gücünü ve güncel karşılığını hesaplayın.", icon: "📈" },
  { slug: "bilesik-faiz-hesaplama", title: "Bileşik Faiz Hesaplama", railLabel: "Bileşik Faiz", desc: "Aylık ek yatırımla bileşik faizin dönem sonu değerini hesaplayın.", icon: "🔁" },
  { slug: "hisse-kar-zarar-hesaplama", title: "Hisse Kâr/Zarar Hesaplama", railLabel: "Hisse Kâr/Zarar", desc: "Komisyon dahil hisse işleminin net kâr/zararını ve getirisini hesaplayın.", icon: "📊" },
  { slug: "kira-artis-hesaplama", title: "Kira Artışı Hesaplama", railLabel: "Kira Artışı", desc: "TÜFE 12 aylık ortalama oranıyla yeni kira bedelini hesaplayın.", icon: "🏠" },
  { slug: "emekli-zammi-hesaplama", title: "Emekli Zammı Hesaplama", railLabel: "Emekli Zammı", desc: "Zam oranına göre yeni emekli aylığınızı ve yıllık farkı görün.", icon: "👴" },
  { slug: "brut-net-maas-hesaplama", title: "Brüt Net Maaş Hesaplama", railLabel: "Brüt Net Maaş", desc: "2026 vergi dilimleri ve asgari ücret istisnasıyla brütten nete, netten brüte maaş.", icon: "💼" },
  { slug: "memur-zammi-hesaplama", title: "Memur Zammı Hesaplama", railLabel: "Memur Zammı", desc: "Toplu sözleşme + enflasyon farkıyla memur ve memur emeklisi zammını hesaplayın.", icon: "🏛️" },
  { slug: "temettu-hesaplama", title: "Temettü Hesaplama", railLabel: "Temettü", desc: "Stopaj sonrası net temettü gelirini ve temettü verimini hesaplayın.", icon: "💵" },
  { slug: "bes-devlet-katkisi-hesaplama", title: "BES Devlet Katkısı", railLabel: "BES Devlet Katkısı", desc: "2026 BES katkınıza göre devlet katkısı tahminini ve yıllık tavanı hesaplayın.", icon: "🌱" },
  { slug: "oks-devlet-katkisi-hesaplama", title: "OKS Devlet Katkısı", railLabel: "OKS Devlet Katkısı", desc: "2026 OKS katkı payınıza göre devlet katkısı taahhüdünü ve başlangıç katkısını hesaplayın.", icon: "🏢" },
] as const;

export type ToolSlug = (typeof TOOL_CATALOG)[number]["slug"];
