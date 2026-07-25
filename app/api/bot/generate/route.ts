import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runPublishingPipeline } from "@/lib/bot/orchestrator";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const result = await runPublishingPipeline({
    trigger: "admin",
    count: Number(body.count) || 3,
    category: typeof body.category === "string" ? body.category : "",
    targetWords: Number(body.words) || 1000,
    autoPublish: body.autoPublish === true,
  });
  return NextResponse.json(result);
}
