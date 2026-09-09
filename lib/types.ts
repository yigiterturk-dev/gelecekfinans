export interface ArticleFaq {
  q: string;
  a: string;
}

/**
 * Bot tarafından makaleyle birlikte üretilen okuyucu yardımcıları.
 * Tümü opsiyonel — eski makalelerde yokturlar, sayfa graceful gizler.
 */
export interface ArticleExtras {
  summary?: string[];      // 3 maddelik TL;DR
  impact?: string;         // "Senin için ne demek?" (1-2 cümle)
  faq?: ArticleFaq[];      // 3 soru-cevap (FAQPage JSON-LD'ye de basılır)
}

export interface Article {
  title: string; meta: string; keyword: string; category: string;
  content: string; image_path: string | null; source: string;
  created_at: string; slug: string; filename: string; wp_post_id?: number;
  imageUrl?: string | null;
  views?: number;
  updatedAt?: string;
  premium?: boolean;
  aiExtras?: ArticleExtras | null;
  /** Rehber şeridinde küme adı (haberlerde null/undefined). */
  cluster?: string | null;
}

/**
 * Liste bağlamlarında kullanılan makale kaydı — `content` (tam HTML gövde)
 * BİLEREK yoktur. Gövde makale başına ~10 KB; 200-500 kayıtlık listelerde her
 * istekte megabaytlarca gereksiz DB trafiği demekti (Neon'un 5 GB/ay ağ kotası
 * bu yüzden doldu). Gövde gerçekten gerekiyorsa `getArticleBySlug` kullan.
 */
export type ArticleListItem = Omit<Article, "content">;
