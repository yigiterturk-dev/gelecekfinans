import { NextRequest, NextResponse } from "next/server";
import { DatabaseUnavailableError, searchPublishedArticles } from "@/lib/articles";
import { articleCoverAlt, articleCoverUrl, isIllustrativeCover } from "@/lib/article-cover";

export const dynamic = "force-dynamic";

const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 200);
  if (query.length < 2) return NextResponse.json([], { headers: PRIVATE_NO_STORE });

  try {
    const { articles } = await searchPublishedArticles(query, undefined, 8, 0, false);
    return NextResponse.json(articles.map((article) => ({
      title: article.title,
      category: article.category,
      slug: article.slug,
      cover_url: articleCoverUrl({
        slug: article.slug,
        title: article.title,
        imageUrl: article.imageUrl,
        category: article.category,
      }),
      cover_alt: articleCoverAlt({
        slug: article.slug,
        title: article.title,
        imageUrl: article.imageUrl,
        category: article.category,
      }),
      cover_is_illustrative: isIllustrativeCover(article),
    })), { headers: PRIVATE_NO_STORE });
  } catch (error) {
    const status = error instanceof DatabaseUnavailableError ? 503 : 500;
    return NextResponse.json({ error: "Arama şu anda kullanılamıyor." }, {
      status,
      headers: PRIVATE_NO_STORE,
    });
  }
}
