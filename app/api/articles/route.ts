import { NextResponse } from "next/server";
import { getAllArticles } from "@/lib/articles";
import { articleCoverAlt, articleCoverUrl, isIllustrativeCover } from "@/lib/article-cover";

export const revalidate = 300;

export async function GET() {
  const articles = (await getAllArticles(200, false)).map(a => ({
    title: a.title, meta: a.meta, keyword: a.keyword, category: a.category,
    slug: a.slug, image_path: a.image_path, cover_url: articleCoverUrl(a),
    cover_alt: articleCoverAlt(a), cover_is_illustrative: isIllustrativeCover(a),
  }));
  return NextResponse.json(articles);
}
