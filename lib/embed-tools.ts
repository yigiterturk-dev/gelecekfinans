/**
 * Gömülebilir hesaplayıcılar.
 *
 * Neden: /araclar/* sayfaları 2026-11-15 taramasında "Google'ın haberi yok"
 * kutusundaydı ve site 0 dış bağlantıyla 80. sırada duruyordu. Bu sitenin
 * link kazanmasının tek ölçeklenebilir yolu, haber sitelerinin ve blogların
 * gömmek isteyeceği bir araç sunmak: her gömen sayfa zorunlu atıf linkini
 * taşıyor. Bu yüzden buradaki liste bilinçli olarak DAR tutuldu — yalnızca
 * canlı piyasa verisine ihtiyaç duymayan, tek başına çalışan hesaplayıcılar
 * gömülebilir. Döviz çevirici ve altın hesaplama canlı veri çektiği için
 * başka bir sitede kırılgan olur.
 */
export type EmbedKind =
  | "kredi" | "mevduat" | "enflasyon" | "bilesik"
  | "hissekz" | "kira" | "emekli" | "temettu";

export interface EmbedTool {
  slug: string;
  label: string;
  desc: string;
  kind: EmbedKind;
  /** iframe yüksekliği: hesap makinesinin mobilde kırılmadan sığdığı değer. */
  height: number;
}

export const EMBED_TOOLS: EmbedTool[] = [
  { slug: "kira-artis-hesaplama", label: "Kira Artışı Hesaplama", kind: "kira", height: 560, desc: "Mevcut kira ve TÜFE 12 aylık ortalama oranından yeni kira bedeli ve yıllık fark." },
  { slug: "emekli-zammi-hesaplama", label: "Emekli Zammı Hesaplama", kind: "emekli", height: 520, desc: "Zam oranına göre yeni aylık ve yıllık fark." },
  { slug: "kredi-faiz-hesaplama", label: "Kredi Faizi Hesaplama", kind: "kredi", height: 600, desc: "Tutar, faiz ve vadeye göre aylık taksit, toplam geri ödeme ve faiz." },
  { slug: "mevduat-faiz-hesaplama", label: "Mevduat Faizi Hesaplama", kind: "mevduat", height: 600, desc: "Brüt faiz, stopaj ve net getiri." },
  { slug: "bilesik-faiz-hesaplama", label: "Bileşik Faiz Hesaplama", kind: "bilesik", height: 600, desc: "Aylık ek yatırımla dönem sonu değer." },
  { slug: "enflasyon-hesaplama", label: "Enflasyon Hesaplama", kind: "enflasyon", height: 520, desc: "Paranın alım gücü ve güncel karşılığı." },
  { slug: "hisse-kar-zarar-hesaplama", label: "Hisse Kâr/Zarar Hesaplama", kind: "hissekz", height: 560, desc: "Komisyon ve BSMV dahil net kâr/zarar." },
  { slug: "temettu-hesaplama", label: "Temettü Hesaplama", kind: "temettu", height: 540, desc: "Stopaj sonrası net temettü ve verim." },
];

export const EMBED_TOOLS_BY_SLUG: Record<string, EmbedTool> =
  Object.fromEntries(EMBED_TOOLS.map((t) => [t.slug, t]));

export const BASE = "https://gelecekfinans.com";

export function embedSrc(slug: string) {
  return `${BASE}/gomulu/${slug}`;
}

/** Kopyalanacak hazır iframe kodu. Atıf linki zorunlu, bu yüzden kodun içinde. */
export function embedCode(t: EmbedTool) {
  return `<iframe src="${embedSrc(t.slug)}" width="100%" height="${t.height}" style="border:1px solid #e6e6e6;border-radius:12px;max-width:100%" loading="lazy" title="${t.label}"></iframe>
<p style="font-size:12px;color:#666;font-family:system-ui,sans-serif">${t.label} aracı: <a href="${BASE}/araclar/${t.slug}" rel="noopener" style="color:#0a7d4f">GelecekFinans</a></p>`;
}
