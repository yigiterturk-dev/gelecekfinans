import OpenAI from "openai";
import type { ArticleImageInput } from "./images";

export type VisualMode = "DATA_CHART" | "DOCUMENTARY_SCENE" | "OBJECT_STILL_LIFE";

export interface VisualBrief {
  mode: VisualMode;
  storyType: string;
  subject: string;
  event: string;
  setting: string;
  mustShow: string[];
  mustAvoid: string[];
  peoplePolicy: "NO_PEOPLE" | "ANONYMOUS_PEOPLE" | "NO_SYNTHETIC_REAL_PERSON";
  composition: string;
  conceptKey: string;
  rationale: string;
}

export interface VisualAudit {
  approved: boolean;
  relevance: number;
  authenticity: number;
  artifactFree: number;
  editorialValue: number;
  cropSafety: number;
  originality: number;
  hasTextOrLogo: boolean;
  genericFinanceCliche: boolean;
  feedback: string;
}

const DEFAULT_AVOIDS = [
  "stock exchange trading floor unless explicitly named",
  "currency exchange office unless explicitly named",
  "generic business meeting",
  "floating coins, arrows, dashboards or finance symbols",
  "readable text, numbers, signage, logos or watermarks",
  "invented company premises, products or branded objects",
];

export async function createVisualBrief(
  article: ArticleImageInput,
  recentConcepts: string[] = [],
): Promise<VisualBrief> {
  if (!process.env.OPENAI_API_KEY) return fallbackBrief(article);
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.15,
      max_tokens: 700,
      messages: [{
        role: "system",
        content: [
          "You are the visual director of a sober Turkish financial newsroom.",
          "Turn a headline into a concrete, copyright-safe editorial image brief.",
          "Never invent a real person's face, a company's logo, premises, exact product,",
          "document, interface, price board or factual scene that the headline does not prove.",
          "Use DATA_CHART only when the headline is directly about a market price/rate movement.",
          "Company investment, regulation, employment, tourism, retail and energy stories",
          "must use a literal sector/event scene, not generic finance imagery.",
        ].join(" "),
      }, {
        role: "user",
        content: [
          `Headline: ${article.title}`,
          `Category metadata (may be wrong): ${article.category}`,
          `Keyword: ${article.keyword || "none"}`,
          `Recently used concepts to avoid repeating: ${recentConcepts.join(", ") || "none"}`,
          "Return only JSON with: mode (DATA_CHART|DOCUMENTARY_SCENE|OBJECT_STILL_LIFE),",
          "storyType, subject, event, setting, mustShow (2-5), mustAvoid (3-8),",
          "peoplePolicy (NO_PEOPLE|ANONYMOUS_PEOPLE|NO_SYNTHETIC_REAL_PERSON),",
          "composition, conceptKey (short reusable scene label), rationale.",
        ].join("\n"),
      }],
    });
    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}") as Partial<VisualBrief>;
    if (!parsed.subject || !parsed.event || !parsed.mode || !parsed.conceptKey) return fallbackBrief(article);
    const unsafeMustShow = /(logo|brand|branding|sign|text|letter|number|screen|display|meter|indicator|document)/i;
    const safeMustShow = (Array.isArray(parsed.mustShow) ? parsed.mustShow : [])
      .filter((item) => typeof item === "string" && !unsafeMustShow.test(item))
      .slice(0, 5);
    return {
      mode: ["DATA_CHART", "DOCUMENTARY_SCENE", "OBJECT_STILL_LIFE"].includes(parsed.mode)
        ? parsed.mode : "DOCUMENTARY_SCENE",
      storyType: parsed.storyType || "financial-news",
      subject: parsed.subject,
      event: parsed.event,
      setting: parsed.setting || "a plausible neutral real-world setting",
      mustShow: safeMustShow.length
        ? safeMustShow
        : ["the headline's main physical subject", "a concrete sign of the stated activity without text or branding"],
      mustAvoid: [...DEFAULT_AVOIDS, ...(Array.isArray(parsed.mustAvoid) ? parsed.mustAvoid : [])].slice(0, 12),
      peoplePolicy: parsed.peoplePolicy || "ANONYMOUS_PEOPLE",
      composition: parsed.composition || "wide editorial composition with a clear central subject and crop-safe margins",
      conceptKey: parsed.conceptKey.toLowerCase().slice(0, 80),
      rationale: parsed.rationale || "Headline-specific editorial scene",
    };
  } catch {
    return fallbackBrief(article);
  }
}

function fallbackBrief(article: ArticleImageInput): VisualBrief {
  return {
    mode: "DOCUMENTARY_SCENE",
    storyType: "financial-news",
    subject: article.title,
    event: "the concrete event stated in the headline",
    setting: "a neutral, plausible real-world setting directly connected to the headline",
    mustShow: ["the headline's main industry or physical subject", "one concrete sign of the stated event"],
    mustAvoid: DEFAULT_AVOIDS,
    peoplePolicy: "ANONYMOUS_PEOPLE",
    composition: "wide documentary composition, subject centered within the middle 70%, crop-safe for 16:9 and 4:3",
    conceptKey: `headline-specific-${article.category}`,
    rationale: "Fail-safe headline-specific brief",
  };
}

export function buildImagePrompt(brief: VisualBrief, headline: string, correction = ""): string {
  return [
    "Create a realistic, restrained editorial news photograph.",
    `Headline context: "${headline}".`,
    `Subject: ${brief.subject}. Event: ${brief.event}. Setting: ${brief.setting}.`,
    `The image MUST visibly include: ${brief.mustShow.join("; ")}.`,
    `People policy: ${brief.peoplePolicy}.`,
    `Composition: ${brief.composition}. Keep the key subject safe in both 16:9 and 4:3 crops.`,
    "Natural available light, true-to-life color, grounded documentary photography.",
    "Do not imitate a named photographer or news agency. Do not stage a dramatic cinematic fantasy.",
    `STRICTLY AVOID: ${brief.mustAvoid.join("; ")}.`,
    "Absolutely no readable writing, letters, numbers, logos, screens, price boards or watermarks.",
    correction ? `Previous attempt was rejected. Fix exactly: ${correction}` : "",
  ].filter(Boolean).join(" ");
}

export async function auditVisual(
  article: ArticleImageInput,
  brief: VisualBrief,
  dataUrl: string,
  recentConcepts: string[] = [],
): Promise<VisualAudit> {
  const rejected: VisualAudit = {
    approved: false, relevance: 0, authenticity: 0, artifactFree: 0,
    editorialValue: 0, cropSafety: 0, originality: 0,
    hasTextOrLogo: true, genericFinanceCliche: true,
    feedback: "Visual audit could not run; do not publish.",
  };
  if (!process.env.OPENAI_API_KEY) return rejected;
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 500,
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `HEADLINE: ${article.title}`,
              `APPROVED BRIEF: ${JSON.stringify(brief)}`,
              `RECENT CONCEPTS: ${recentConcepts.join(", ") || "none"}`,
              "Audit brutally. Score 0-100: relevance, authenticity, artifactFree,",
              "editorialValue, cropSafety (works in both 16:9 and 4:3), originality.",
              "Set hasTextOrLogo true for any visible letters, numbers, logo, watermark",
              "or fake signage. Set genericFinanceCliche true for generic exchange office,",
              "trading floor, bank counter, handshake, coins, charts or screens not required",
              "by the brief. Return JSON only with all fields plus concise feedback.",
            ].join(" "),
          },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
        ],
      }],
    });
    const result = JSON.parse(response.choices[0]?.message?.content || "{}") as Partial<VisualAudit>;
    const audit: VisualAudit = {
      approved: false,
      relevance: Number(result.relevance) || 0,
      authenticity: Number(result.authenticity) || 0,
      artifactFree: Number(result.artifactFree) || 0,
      editorialValue: Number(result.editorialValue) || 0,
      cropSafety: Number(result.cropSafety) || 0,
      originality: Number(result.originality) || 0,
      hasTextOrLogo: result.hasTextOrLogo !== false,
      genericFinanceCliche: result.genericFinanceCliche !== false,
      feedback: result.feedback || "Make the scene more literal, authentic and crop-safe.",
    };
    audit.approved =
      audit.relevance >= 85 &&
      audit.authenticity >= 80 &&
      audit.artifactFree >= 90 &&
      audit.editorialValue >= 75 &&
      audit.cropSafety >= 80 &&
      audit.originality >= 75 &&
      !audit.hasTextOrLogo &&
      !audit.genericFinanceCliche;
    return audit;
  } catch {
    return rejected;
  }
}
