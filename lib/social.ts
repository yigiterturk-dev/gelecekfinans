/* Marka varlık (entity) sinyalleri.

   GSC'de 262 tekil sorgunun hiçbiri marka sorgusu değil: Google için site henüz
   "bir yayın kuruluşu" değil, sadece bir alan adı. Bir kuruluşu tanımanın yolu
   bağımsız platformlarda aynı adla doğrulanmasıdır; `sameAs` bu profilleri
   layout'taki NewsMediaOrganization şemasına bağlayıp hepsini tek varlık yapar.

   Hesap açıldıkça buraya eklenir. Dizi boşken şemaya `sameAs` yazılmaz ve
   footer'da ikon çıkmaz — yani yarım/ölü link riski yok.

   ⚠️ Profil adı her yerde "Gelecek Finans", açıklama ve alan adı birebir aynı
   olmalı (bkz. lib/brand.ts BRAND_ALIASES). Farklı yazım = ayrı varlık. */

export type SocialProfile = {
  /** Footer ikonunu seçen anahtar: x | linkedin | youtube | instagram */
  id: string;
  label: string;
  url: string;
};

export const SOCIAL_PROFILES: SocialProfile[] = [
  // { id: "x", label: "X", url: "https://x.com/gelecekfinans" },
  // { id: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/company/gelecekfinans" },
  // { id: "youtube", label: "YouTube", url: "https://www.youtube.com/@gelecekfinans" },
];

export const SAME_AS = SOCIAL_PROFILES.map((p) => p.url);
