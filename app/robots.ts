import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    // Not: Yönetim paneli yolu gizli olduğundan robots.txt'e YAZILMAZ;
    // ifşa olmaması için sadece noindex header (next.config.mjs) ile korunur.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: [
      "https://gelecekfinans.com/sitemap.xml",
      "https://gelecekfinans.com/news-sitemap.xml",
    ],
    host: "https://gelecekfinans.com",
  };
}
