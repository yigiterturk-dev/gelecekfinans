// İçerik Güvenlik Politikası (CSP) — derinlemesine savunma.
// NOT: GA/AdSense init + JSON-LD + tema scripti inline olduğu için script-src'de
// 'unsafe-inline' korunuyor (nonce pipeline'ı yok). Asıl kazanç: object-src 'none',
// base-uri/form-action 'self', dış script kaynaklarının beyaz listeyle sınırlanması.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://www.googletagservices.com https://adservice.google.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.vercel-insights.com https://*.vercel-scripts.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://*.googlesyndication.com",
  "frame-src https://googleads.g.doubleclick.net https://*.googlesyndication.com https://*.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

// Tüm yanıtlara uygulanan temel güvenlik header'ları.
const securityHeaders = [
  // Tıklama hırsızlığına (clickjacking) karşı: sayfa hiçbir iframe içine gömülemez.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: csp },
  // MIME türü tahminini kapat.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Dış sitelere referer sızıntısını sınırla.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Gereksiz tarayıcı API'lerini kapat.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

// Vercel Blob'un genel (public) host adı. Store kimliği yazma token'ının içinde
// duruyor (`vercel_blob_rw_<storeId>_<secret>`); ayrı bir env değişkeni tanımlamak
// yerine oradan türetiliyor. Token yoksa (yerel derleme) bilinen store'a düşülür.
const BLOB_PUBLIC_HOST = (() => {
  const storeId = process.env.BLOB_READ_WRITE_TOKEN?.split("_")[3];
  const id = storeId && /^[A-Za-z0-9]+$/.test(storeId) ? storeId : "UDf1gvMMl4Eb3PiF";
  return `${id.toLowerCase()}.public.blob.vercel-storage.com`;
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sunucu kimliğini ifşa eden header'ı kaldır.
  poweredByHeader: false,
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Görsel optimize edici yalnızca bilinen kaynaklardan proxy yapsın
    // (eski "**" tüm host'lara açıktı = SSRF/DoS/maliyet vektörü).
    // Kaynaklar: bot üretimi → Vercel Blob, fallback → Unsplash.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "quickchart.io" },
    ],
  },
  async rewrites() {
    return [
      // SEO: kapak görselleri Vercel Blob'da duruyor ama Google Görseller'de
      // blob alt alan adına değil gelecekfinans.com'a atfedilsinler diye aynı
      // dosyalar kendi alan adımızdan da servis ediliyor. Sitemap ve JSON-LD
      // artık bu yolu bildiriyor (bkz. lib/image-url.ts).
      {
        source: "/gorseller/:path*",
        destination: `https://${BLOB_PUBLIC_HOST}/gorseller/:path*`,
      },
    ];
  },
  async headers() {
    return [
      // Tüm yollar için temel güvenlik header'ları.
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // Gizli yönetim paneli arama motorlarına HİÇ düşmesin (robots.txt'te yazılı değil).
      {
        source: "/sys-k3m8p/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

export default nextConfig;
