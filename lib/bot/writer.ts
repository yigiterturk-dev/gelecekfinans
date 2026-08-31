import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import OpenAI from "openai";
import { zodResponseFormat, zodTextFormat } from "openai/helpers/zod";
import type { ArticleExtras } from "@/lib/types";
import type { Topic } from "./topics";
import { MIN_EVIDENCE_MATERIAL_CHARS, evidenceMaterialCharacterCount } from "./research";
import {
  ArticleDraftSchema,
  GuideDraftSchema,
  SameStorySchema,
  VerificationSchema,
  type ArticleDraft,
  type SameStoryVerdict,
  type VerificationReport,
} from "./article-schema";
import { GUIDE_QUALITY_PRESET } from "./quality";
import type { GuideTopic } from "./evergreen";
import { MIN_GUIDE_EVIDENCE_CHARS } from "./evergreen";
import {
  NEWS_QUALITY_PRESET, renderDraftHtml, validateDraft,
  type QualityPreset, type QualityReport,
} from "./quality";
import { checkPlagiarism, type PlagiarismReport } from "./plagiarism";
import { resolveArticleAIBudgetConfig } from "./ai-budget";
import {
  AIProviderConfigurationError,
  AnthropicBillingError,
  isAnthropicBillingError,
  isOpenAIQuotaError,
  OpenAIQuotaError,
} from "./errors";

export type ArticleAIProvider = "anthropic" | "openai" | "deepseek";

export interface ArticleAIConfig {
  provider: ArticleAIProvider;
  writerModel: string;
  verifierModel: string;
}

export function resolveArticleAIConfig(
  env: Record<string, string | undefined> = process.env,
): ArticleAIConfig {
  const requested = env.ARTICLE_AI_PROVIDER?.trim().toLocaleLowerCase("en-US");
  if (requested && requested !== "anthropic" && requested !== "openai" && requested !== "deepseek") {
    throw new AIProviderConfigurationError(`Desteklenmeyen ARTICLE_AI_PROVIDER: ${requested}`);
  }
  const provider: ArticleAIProvider = requested === "anthropic"
    ? "anthropic"
    : requested === "deepseek"
      ? "deepseek"
      : requested === "openai" || Boolean(env.OPENAI_API_KEY)
        ? "openai"
        : "anthropic";

  if (provider === "deepseek" && !env.DEEPSEEK_API_KEY) {
    throw new AIProviderConfigurationError("DeepSeek seçili ancak DEEPSEEK_API_KEY tanımlı değil.");
  }

  if (provider === "anthropic" && !env.ANTHROPIC_API_KEY) {
    throw new AIProviderConfigurationError("Claude seçili ancak ANTHROPIC_API_KEY tanımlı değil.");
  }
  if (provider === "openai" && !env.OPENAI_API_KEY) {
    throw new AIProviderConfigurationError("OpenAI seçili ancak OPENAI_API_KEY tanımlı değil.");
  }

  if (provider === "deepseek") {
    return {
      provider,
      // deepseek-chat ve deepseek-reasoner DeepSeek'te gerçekten var olan iki ad.
      writerModel: env.DEEPSEEK_ARTICLE_MODEL || "deepseek-chat",
      verifierModel: env.DEEPSEEK_VERIFIER_MODEL || "deepseek-chat",
    };
  }

  return provider === "anthropic"
    ? {
        provider,
        writerModel: env.ANTHROPIC_ARTICLE_MODEL || "claude-sonnet-5",
        verifierModel: env.ANTHROPIC_VERIFIER_MODEL || "claude-haiku-4-5",
      }
    : {
        provider,
        // Yedek adlar OpenAI'da gerçekten var olan modeller olmalı. Uydurma bir
        // ada düşersek env silindiği anda bot sessizce model_not_found ile ölür.
        writerModel: env.OPENAI_ARTICLE_MODEL || "gpt-5",
        verifierModel: env.OPENAI_VERIFIER_MODEL || "gpt-5-mini",
      };
}

let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

function openai(): OpenAI {
  openaiClient ||= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

/**
 * DeepSeek OpenAI-uyumlu bir uç sunuyor, bu yüzden aynı SDK kullanılıyor.
 * Ama Responses API'si YOK: yalnızca chat.completions var ve katı json_schema
 * desteklemiyor, sadece `json_object` modu var. Bu yüzden şema modele metin
 * olarak verilip cevap Zod ile doğrulanıyor (aşağıdaki deepseekJson).
 */
let deepseekClient: OpenAI | null = null;

function deepseek(): OpenAI {
  deepseekClient ||= new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
  });
  return deepseekClient;
}

/**
 * Şemayı sisteme metin olarak yazıp `json_object` modunda cevap ister, sonra
 * Zod ile doğrular. Model şemaya uymayan bir gövde döndürürse bir kez daha
 * denenir; ikincisi de tutmazsa hata yükselir (sessizce bozuk makale üretmek
 * yerine koşuyu düşürmek doğru davranış).
 */
async function deepseekJson<T>(args: {
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  schema: Parameters<typeof zodResponseFormat>[0];
  name: string;
}): Promise<T> {
  const jsonSchema = (zodResponseFormat(args.schema, args.name) as {
    json_schema: { schema: unknown };
  }).json_schema.schema;
  const system = [
    args.system,
    "",
    "ÇIKTI KURALI: Yanıtın YALNIZCA aşağıdaki JSON şemasına uyan tek bir JSON nesnesi olsun.",
    "Markdown kod bloğu, açıklama veya ek metin yazma.",
    JSON.stringify(jsonSchema),
  ].join("\n");

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await deepseek().chat.completions.create({
      model: args.model,
      max_tokens: args.maxTokens,
      // DeepSeek varsayılan sıcaklıkta kaynak cümlelerini olduğu gibi aktarıyor
      // ve intihal kapısına takılıyor (ölçüldü: %22-35 örtüşme, 5 konuda 0 makale).
      // DeepSeek'in kendi önerisi yaratıcı/yeniden yazım işleri için 1.3.
      // Doğrulayıcı çağrısında yüksek sıcaklık istemiyoruz: orada iş kanıt
      // karşılaştırmak, tutarlılık lazım.
      temperature: Number(process.env.DEEPSEEK_TEMPERATURE || (args.name.includes("article") ? 1.3 : 0.3)),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: args.user },
      ],
    });
    const choice = response.choices[0];
    const content = choice?.message?.content;
    if (choice?.finish_reason === "length") {
      // Kesilen JSON "Unexpected end of JSON input" diye görünür ve saatlerce
      // şema hatası sanılır; sebebi doğrudan yazılıyor.
      lastError = new Error("yanıt max_tokens sınırında kesildi");
      continue;
    }
    if (!content) { lastError = new Error("DeepSeek boş yanıt döndürdü"); continue; }
    try {
      return args.schema.parse(JSON.parse(content)) as T;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`DeepSeek şemaya uygun çıktı üretemedi: ${(lastError as Error)?.message || "bilinmeyen hata"}`);
}

function anthropic(): Anthropic {
  anthropicClient ||= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropicClient;
}

function evidencePrompt(topic: Topic): string {
  const packet = topic.evidencePacket;
  if (!packet || packet.status !== "VERIFIED") {
    throw new Error("RESEARCH_BLOCKED: İki bağımsız kaynak doğrulaması tamamlanmadı");
  }
  const budget = resolveArticleAIBudgetConfig();
  const blocks: string[] = [];
  let usedCharacters = 0;
  for (const item of packet.evidence) {
    const material = (item.content || item.summary).slice(0, budget.evidenceItemCharacterLimit);
    const block = [
      `[${item.id}]`,
      `Yayıncı: ${item.source}`,
      `Başlık: ${item.title}`,
      `Kanıt metni: ${material}`,
      `URL: ${item.sourceUrl}`,
      `Tarih: ${item.publishedAt || "belirtilmedi"}`,
    ].join("\n");
    if (blocks.length >= 2 && usedCharacters + block.length > budget.evidencePromptCharacterLimit) break;
    blocks.push(block);
    usedCharacters += block.length;
  }
  return blocks.join("\n\n");
}
function articleInstructions(targetWords: number): string {
  return [
    "GelecekFinans için Türkçe, ölçülü ve olgusal bir ekonomi haberi hazırla.",
    "Yalnızca verilen kanıt paketindeki olguları kullan; dış bilgi, güncel fiyat veya bellekteki bilgi ekleme.",
    // evidenceIds kalite kapısında pakettekilerle birebir karşılaştırılıyor.
    // Küçük modeller "ev-1" gibi kısaltılmış kimlik uyduruyor ve makale düşüyor.
    "Her somut iddiayı claims alanında yaz ve destekleyen evidenceIds değerlerini belirt. evidenceIds değerleri KANIT PAKETİ'nde köşeli parantez içinde verilen kimliklerin birebir kopyası olmalı (ör. tamamını olduğu gibi yaz); kısaltma, numaralandırma veya yeni kimlik uydurma.",
    "Kanıtlar çatışıyorsa kesin hüküm verme; metinde çatışmayı açıkça belirt.",
    "Doğrudan alıntı kullanma. Uzman görüşü, neden-sonuç, oran, tarih, unvan veya Türkiye etkisi uydurma.",
    // İntihal kapısı (plagiarism.ts) kaynakla %25 örtüşmeyi veya 14 kelimelik
    // kesintisiz eşleşmeyi reddediyor. Küçük modeller kanıt metnini olduğu gibi
    // aktarma eğiliminde: kural sayıyla yazılmazsa makale burada ölüyor.
    "Kanıt metnindeki cümleleri KOPYALAMA. Olguları kendi cümlelerinle, kendi cümle kuruluşunla yeniden yaz. Kaynakla 10 kelimeden uzun birebir ortak dizi kalmasın; yalnızca rakamlar, özel adlar ve kurum adları aynı kalabilir.",
    "Yatırım tavsiyesi, teknik analiz, destek/direnç, fiyat hedefi ve gelecek tahmini yazma.",
    // Kalite kapısı 280 kelimenin altını reddediyor; "civarında" diyen yumuşak
    // ifade küçük modellerde 270'lere düşüp makaleyi çöpe attırıyordu.
    `Gövde EN AZ 320, en fazla 800 kelime olmalı; hedef ${Math.max(320, Math.min(targetWords, 800))} kelime. 320 kelimenin altı kabul edilmez; ama doldurmak için tekrar yapma, kanıttaki ayrıntıları aç.`,
    // Kalite kapısı meta için 110-180 aralığını KATI uyguluyor; sınırı birebir
    // söyleyince model 119 gibi bir karakterle takılıyor. Hedefi aralığın
    // ortasında vermek pay bırakıyor.
    "Başlık 35-85 karakter olsun. Meta açıklama 140-170 karakter arasında olsun (110'un altı veya 180'in üstü kesinlikle kabul edilmez); karakter sayısını yazmadan önce kontrol et.",
    // Kalite kapısı (quality.ts) keyword'ü lede ve meta içinde HARFİ HARFİNE arar.
    // Yumuşak "doğal biçimde geçsin" ifadesini GPT-5 kendiliğinden uyguluyordu ama
    // daha küçük modeller eşanlamlı yazıp kapıya takılıyor; kural açık yazıldı.
    "keyword 1-3 kelimelik odak ifade olsun ve AYNEN o yazımıyla hem meta alanında hem de lede (giriş paragrafı) içinde geçsin. Eşanlamlısını veya çekimli halini değil, birebir aynı ifadeyi kullan.",
    // Model bu kuralı "meta sonuna Keyword: ... yapıştır" diye uyguluyordu ve
    // ek arama sonucunda okura görünüyordu; kural açıkça yasaklandı.
    "Odak kelime meta açıklamada CÜMLENİN İÇİNDE doğal biçimde geçmeli. Metanın sonuna \"Keyword: ...\", \"Anahtar kelime: ...\" gibi etiket EKLEME; bu arama sonucunda okura görünür ve kabul edilmez.",
    "Tam 3 özet maddesi ve 3 kısa SSS üret. Bullets yalnızca gerçekten listelenebilir olgular varsa dolu olsun.",
    'Disclaimer tam olarak "Bu içerik yalnızca bilgilendirme amaçlıdır, yatırım tavsiyesi değildir." olsun.',
    "Başarı ölçütü: kanıt dışı tek bir somut iddia veya rakam bulunmaması.",
  ].join("\n");
}

/**
 * Rehber (evergreen) yazım talimatı.
 *
 * Haber talimatından üç yerde ayrılır ve her ayrım kasıtlı:
 *
 * 1. GÜNCEL RAKAM YASAK. Rehber sayfa aylarca ayakta kalacak; "gram altın
 *    4.655 TL" yazan bir rehber iki gün sonra yanlış bilgi kaynağıdır.
 *    Güncel veri için sitenin kendi canlı sayfalarına link verilir.
 * 2. Kanıt resmî kurumun kendi sayfasıdır, ikinci bir gazete değildir.
 * 3. Yapı soru-cevap odaklıdır: her H2 okurun sorduğu bir soruya karşılık
 *    gelir. Hem klasik aramada hem de AI cevaplarında alıntılanabilirliği
 *    belirleyen şey bu — model bir paragrafı ancak tek başına anlaşılıyorsa
 *    alıntılar.
 */
function guideInstructions(targetWords: number, context: {
  keyword: string;
  category: string;
  isHub: boolean;
  clusterArticles: Array<{ title: string; slug: string; isHub: boolean }>;
}): string {
  const related = context.clusterArticles.length
    ? context.clusterArticles.map((item) => `- ${item.title}`).join("\n")
    : "(bu kümede henüz başka içerik yok)";
  return [
    `GelecekFinans için "${context.keyword}" sorusuna eksiksiz cevap veren, kalıcı bir Türkçe rehber yaz.`,
    context.isHub
      ? "Bu bir ANA REHBER (hub) sayfasıdır: konunun tamamını kapsa, alt başlıkların her birine kısa ama doyurucu cevap ver."
      : "Bu tek bir dar soruya odaklanan bir rehberdir: konuyu dağıtma, sorunun cevabını derinleştir.",
    "",
    "KANIT KURALI:",
    "Yalnızca verilen RESMÎ KAYNAK metinlerindeki olguları, kuralları ve tanımları kullan.",
    "Kanıtta olmayan hiçbir kurum adı, oran, tarih, tutar, yasa maddesi veya prosedür uydurma.",
    "Her somut iddiayı claims alanında yaz ve evidenceIds değerlerini KANIT PAKETİ'ndeki kimliklerin birebir kopyası olarak ver; köşeli parantez ekleme.",
    "",
    "GÜNCEL RAKAM YASAĞI:",
    "Bu sayfa aylarca yayında kalacak. Güncel fiyat, kur, faiz oranı, endeks seviyesi veya 'bugün' ifadesi KULLANMA.",
    "Bunun yerine kalıcı bilgiyi anlat: tanım, işleyiş, hesaplama yöntemi, kurallar, dikkat edilecekler, sık yapılan hatalar.",
    "Güncel veriye ihtiyaç duyulan yerde 'güncel değerler ilgili canlı veri sayfasından takip edilebilir' de; sayı yazma.",
    "",
    "YAPI:",
    "Her bölüm başlığı (heading) okurun gerçekten sorduğu bir soru ya da net bir alt konu olsun; 'Giriş', 'Sonuç' gibi boş başlık kullanma.",
    "Her paragraf tek başına okunduğunda anlaşılır olsun; bir önceki cümleye bağımlı 'bu durumda', 'yukarıda' gibi ifadelerden kaçın.",
    "Adım gerektiren konularda bullets alanını gerçek adımlarla doldur.",
    "",
    "AYNI KÜMEDEKİ MEVCUT İÇERİKLER (tekrar etme, bunlara değinip geç):",
    related,
    "",
    `Gövde EN AZ 900, en fazla 1800 kelime olmalı; hedef ${Math.max(900, Math.min(targetWords, 1800))} kelime.`,
    // Üst sınır 160: SEO çözümleyicisi 165'in üstünü uzun sayıyor ve arama
    // sonucu zaten ~155'te kırpıyor.
    "Başlık 35-85 karakter olsun. Meta açıklama 145-160 karakter arasında olsun; 165 karakteri KESİNLİKLE geçme.",
    "Her ana bölüme 1-2 adet H3 alt başlık (subsections) ekle; alt başlık da okurun sorduğu bir soru olsun. En az iki bölümde alt başlık bulunsun.",
    `keyword alanı tam olarak "${context.keyword}" olsun ve bu ifade AYNEN hem meta hem de lede içinde geçsin.`,
    "Odak kelime meta açıklamada cümlenin içinde doğal geçmeli; metanın sonuna \"Keyword: ...\" gibi etiket EKLEME.",
    "4-8 bölüm, 3 özet maddesi ve 4-6 SSS üret. SSS'ler okurun gerçekten arayacağı sorular olsun, cevaplar 2-4 cümle.",
    "Kaynak metindeki cümleleri KOPYALAMA; kendi cümlelerinle yaz, 10 kelimeden uzun birebir ortak dizi kalmasın.",
    "Yatırım tavsiyesi, getiri vaadi, fiyat hedefi ve 'şunu al' tarzı yönlendirme YASAK.",
    'Disclaimer tam olarak "Bu içerik yalnızca bilgilendirme amaçlıdır, yatırım tavsiyesi değildir." olsun.',
  ].join("\n");
}

/**
 * Kaynakla birebir örtüşen taslağı yeniden yazdırmak için ek talimat.
 * İntihal kapısı bir taslağı düşürdüğünde konuyu tamamen kaybetmek yerine
 * tek bir onarım turu veriyoruz (bkz. writeArticle → plagiarismRepairApplied).
 */
/** Kalite kapısının ihlallerini modele geri veren onarım talimatı. */
function qualityRepairInstructions(
  targetWords: number,
  issues: string[],
  baseInstructions: string = articleInstructions(targetWords),
): string {
  return [
    baseInstructions,
    "",
    "ÖNCEKİ DENEME KALİTE KAPISINA TAKILDI. Aşağıdaki ihlalleri düzelt, kalan her kuralı koru:",
    ...issues.map((issue) => `- ${issue}`),
  ].join("\n");
}

function plagiarismRepairInstructions(
  targetWords: number,
  report: PlagiarismReport,
  baseInstructions?: string,
): string {
  // Sadece "%17, 21 kelime eşleşme" demek yetmiyordu: model hangi ifadeyi
  // kopyaladığını bilmeden yeniden yazınca aynı diziyi tekrar üretiyordu.
  // Eşleşen dizinin kendisi veriliyor (ölçüldü: bu eklenmeden iki onarım turu
  // da 21 kelimelik eşleşmeyi temizleyemedi).
  const copiedSpans = report.matches
    .filter((match) => match.longestExactRunText)
    .map((match) => `- "${match.longestExactRunText}"`);
  return [
    baseInstructions ?? articleInstructions(targetWords),
    "",
    "ÖNCEKİ DENEME İNTİHAL KAPISINA TAKILDI:",
    ...report.issues.map((issue) => `- ${issue}`),
    ...(copiedSpans.length
      ? ["", "KAYNAKTAN BİREBİR AKTARILAN İFADELER (bunları tamamen farklı sözcüklerle kur):", ...copiedSpans]
      : []),
    "",
    "Aynı olguları koru ama metni SIFIRDAN kendi cümlelerinle yaz: cümle sırasını değiştir,",
    "uzun cümleleri böl, kaynağın söz dizimini taklit etme. Rakamlar, kurum ve kişi adları aynı kalsın.",
  ].join("\n");
}

async function generateDraft(
  topic: Topic,
  targetWords: number,
  systemOverride?: string,
  /**
   * Rehber şeridi aynı üretim makinesini kullanır ama daha çok bölüm ve daha
   * çok SSS ister. Şema dışarıdan geçirilebilir olmasaydı bütün sağlayıcı
   * dallanması (OpenAI / Anthropic / DeepSeek) ikinci kez kopyalanacaktı.
   */
  schema: typeof ArticleDraftSchema = ArticleDraftSchema,
): Promise<ArticleDraft> {
  const config = resolveArticleAIConfig();
  const budget = resolveArticleAIBudgetConfig();
  try {
    const instructions = systemOverride || articleInstructions(targetWords);
    /**
     * Kanıtsız rehber şeridinde kanıt bloğu yoktur; `evidencePrompt` bu durumda
     * hata atar. Konu başlığı ve kategorisi tek girdidir, kuralların tamamı
     * sistem talimatında.
     */
    const hasEvidence = Boolean(topic.evidencePacket?.evidence.length);
    const userPrompt = hasEvidence
      ? `KONU: ${topic.title}\nKATEGORİ: ${topic.category}\n\nKANIT PAKETİ:\n${evidencePrompt(topic)}`
      : `KONU: ${topic.title}\nKATEGORİ: ${topic.category}`;
    if (config.provider === "anthropic") {
      const response = await anthropic().messages.parse({
        model: config.writerModel,
        max_tokens: 6000,
        system: instructions,
        messages: [{ role: "user", content: userPrompt }],
        output_config: {
          effort: "low",
          format: zodOutputFormat(schema),
        },
      });
      if (!response.parsed_output) throw new Error("Claude yapılandırılmış makale çıktısı alınamadı");
      return response.parsed_output;
    }

    if (config.provider === "deepseek") {
      return await deepseekJson<ArticleDraft>({
        model: config.writerModel,
        system: instructions,
        user: userPrompt,
        // OpenAI bütçesi (varsayılan 2400) DeepSeek için yetmiyor: Türkçe metin
        // token başına daha az kelime taşıyor ve JSON alanları da bu tavana
        // sayılıyor, 800 kelimelik makale ortasında kesiliyordu. DeepSeek çok
        // daha ucuz olduğu için tavanı ayrı tutuyoruz.
        // deepseek-reasoner'da akıl yürütme adımları da bu tavana sayılıyor:
        // 6000 ile makale JSON'ı daha başlamadan kesiliyordu.
        maxTokens: Math.max(
          budget.writerMaxOutputTokens,
          config.writerModel.includes("reasoner") ? 16000 : 6000,
        ),
        schema,
        name: "gelecekfinans_article",
      });
    }

    const response = await openai().responses.parse({
      model: config.writerModel,
      max_output_tokens: budget.writerMaxOutputTokens,
      // effort: "none" DEĞİL — gpt-5 bunu reddediyor ve koşu 400 ile ölüyor:
      //   "Unsupported value: 'none' is not supported with the 'gpt-5' model.
      //    Supported values are: 'minimal', 'low', 'medium', and 'high'."
      // (2026-08-13'te canlı hata kaydından alındı; 7 günde 9 koşu bu yüzden
      //  düştü.) "minimal" en yakın karşılık: en az akıl yürütme, en hızlı,
      //  en ucuz — davranış "none" ile aynı niyette.
      reasoning: { effort: "minimal" },
      input: [
        { role: "system", content: instructions },
        { role: "user", content: userPrompt },
      ],
      text: { format: zodTextFormat(schema, "gelecekfinans_article") },
    });
    if (!response.output_parsed) throw new Error("OpenAI yapılandırılmış makale çıktısı alınamadı");
    return response.output_parsed;
  } catch (error) {
    if (config.provider === "anthropic" && isAnthropicBillingError(error)) throw new AnthropicBillingError();
    if (isOpenAIQuotaError(error)) throw new OpenAIQuotaError();
    throw error;
  }
}

async function verifyDraft(topic: Topic, draft: ArticleDraft): Promise<VerificationReport> {
  const config = resolveArticleAIConfig();
  const budget = resolveArticleAIBudgetConfig();
  try {
    const system = [
      "Bağımsız bir finans haber doğrulayıcısısın.",
      "Taslağı yalnızca verilen kanıtlarla karşılaştır.",
      "Kanıtta açıkça bulunmayan veya kanıttan güvenle çıkarılamayan her iddiayı unsupportedClaims alanına ekle.",
      "Kaynaklar birbiriyle çelişiyorsa conflictingClaims alanına ekle.",
      "passed yalnızca tüm iddialar destekleniyor, önemli çelişki yok ve kanıt kimlikleri doğruysa true olabilir.",
      "Eksik bilgiyi tahmin etme; durma kuralın tüm claims maddelerini bir kez incelemektir.",
    ].join("\n");
    const userPrompt = `KANITLAR:\n${evidencePrompt(topic)}\n\nTASLAK:\n${JSON.stringify(draft)}`;

    if (config.provider === "anthropic") {
      const response = await anthropic().messages.parse({
        model: config.verifierModel,
        max_tokens: 1600,
        system,
        messages: [{ role: "user", content: userPrompt }],
        output_config: { format: zodOutputFormat(VerificationSchema) },
      });
      if (!response.parsed_output) throw new Error("Claude yapılandırılmış doğrulama çıktısı alınamadı");
      return response.parsed_output;
    }

    if (config.provider === "deepseek") {
      return await deepseekJson<VerificationReport>({
        model: config.verifierModel,
        system,
        user: userPrompt,
        maxTokens: Math.max(budget.verifierMaxOutputTokens, 2000),
        schema: VerificationSchema,
        name: "gelecekfinans_verification",
      });
    }

    const response = await openai().responses.parse({
      model: config.verifierModel,
      max_output_tokens: budget.verifierMaxOutputTokens,
      // effort: "none" DEĞİL — gpt-5 bunu reddediyor ve koşu 400 ile ölüyor:
      //   "Unsupported value: 'none' is not supported with the 'gpt-5' model.
      //    Supported values are: 'minimal', 'low', 'medium', and 'high'."
      // (2026-08-13'te canlı hata kaydından alındı; 7 günde 9 koşu bu yüzden
      //  düştü.) "minimal" en yakın karşılık: en az akıl yürütme, en hızlı,
      //  en ucuz — davranış "none" ile aynı niyette.
      reasoning: { effort: "minimal" },
      input: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      text: { format: zodTextFormat(VerificationSchema, "gelecekfinans_verification") },
    });
    if (!response.output_parsed) throw new Error("OpenAI yapılandırılmış doğrulama çıktısı alınamadı");
    return response.output_parsed;
  } catch (error) {
    if (config.provider === "anthropic" && isAnthropicBillingError(error)) throw new AnthropicBillingError();
    if (isOpenAIQuotaError(error)) throw new OpenAIQuotaError();
    throw error;
  }
}

/**
 * İkinci bağımsız kaynak kapısı yalnızca başlık benzerliğine bakıyordu ve aynı
 * olayı farklı manşetle veren gazeteleri eşleştiremiyordu: canlı kayıtta
 * 196+47 konu bu yüzden düştü, bir koşumda 7 konunun 7'si. Metin sinyali
 * ayırt edici değil (aynı olay 0.296 / farklı olay 0.269), bu yüzden kararı
 * ucuz doğrulayıcı model veriyor.
 *
 * Kapı GEVŞEMİYOR: hakem yalnızca gri banda düşen çiftlere bakar, "aynı olay"
 * demezse ikinci kaynak sayılmaz ve HER hata (kota, ağ, bozuk çıktı) hayır
 * kabul edilir. Koşum başına çağrı tavanı ve süreç içi önbellek var.
 */
/**
 * Kanıtsız rehber şeridinin doğrulayıcısı.
 *
 * Haber doğrulayıcısı "bu iddia kanıtta var mı" diye sorar; burada kanıt yok,
 * dolayısıyla soru değişir: "bu metinde DOĞRULANMASI GEREKEN ama
 * doğrulanamayan bir şey var mı?" Uydurma kurum, uydurma yasa maddesi,
 * uydurma oran, ülkeye özgü yanlış prosedür — hepsi burada yakalanır.
 *
 * Bu, kalite kapısındaki mekanik rakam yasağının ÜSTÜNE gelen ikinci
 * katmandır: kapı sayıyı yakalar, model yanlış kuralı yakalar.
 */
async function verifyGuideDraft(topic: Topic, draft: ArticleDraft): Promise<VerificationReport> {
  const config = resolveArticleAIConfig();
  const budget = resolveArticleAIBudgetConfig();
  const system = [
    "Türkiye finans mevzuatı ve piyasa işleyişi konusunda titiz bir editörsün.",
    "Önündeki metin bir okur rehberi; kaynak listesi YOK, bu yüzden metnin kendisi doğru olmak zorunda.",
    "Şunları ara ve bulduklarını unsupportedClaims alanına yaz:",
    "- Var olmayan kurum, kanun, yönetmelik veya kurul adı",
    "- Türkiye'de geçerli olmayan bir prosedürün geçerliymiş gibi anlatılması",
    "- Doğrulanması gereken oran, tutar, süre veya limit",
    "- Yatırım tavsiyesi, getiri vaadi veya yönlendirme",
    "conflictingClaims alanına metnin kendi içinde çelişen ifadelerini yaz.",
    "Hiçbiri yoksa passed=true ve listeleri boş bırak. Emin olmadığın genel tanımları sorun sayma.",
    // Cevap uzunluğu sınırlanmazsa model her paragrafı ayrı madde yapıp
    // çıktı tavanını doldurdu ve JSON yarıda kesildi (durum: incomplete,
    // eksik: max_output_tokens). Kapı için 5 madde fazlasıyla yeterli:
    // tek gerçek ihlal bile makaleyi durdurur.
    "EN FAZLA 5 madde yaz; her madde en fazla 15 kelime olsun. corrections alanını boş bırak.",
  ].join("\n");
  const user = [
    `KONU: ${topic.title}`,
    `BAŞLIK: ${draft.title}`,
    `GİRİŞ: ${draft.lede}`,
    ...draft.sections.map((section) => `${section.heading}: ${section.paragraphs.join(" ")} ${section.bullets.join(" ")}`),
    ...draft.faq.map((item) => `SSS ${item.q}: ${item.a}`),
  ].join("\n\n").slice(0, 12000);

  try {
    if (config.provider === "anthropic") {
      const response = await anthropic().messages.parse({
        model: config.verifierModel,
        max_tokens: budget.verifierMaxOutputTokens,
        system,
        messages: [{ role: "user", content: user }],
        output_config: { effort: "low", format: zodOutputFormat(VerificationSchema) },
      });
      if (!response.parsed_output) throw new Error("Rehber doğrulaması alınamadı");
      return response.parsed_output;
    }
    if (config.provider === "deepseek") {
      return await deepseekJson<VerificationReport>({
        model: config.verifierModel, system, user,
        maxTokens: Math.max(budget.verifierMaxOutputTokens, 1200),
        schema: VerificationSchema, name: "gelecekfinans_guide_verification",
      });
    }
    const response = await openai().responses.parse({
      model: config.verifierModel,
      // Rehber doğrulayıcısı haberinkinden daha uzun cevap verir: 900-1800
      // kelimelik metinde bulduğu her sorunu ayrı madde olarak yazıyor.
      // 800 token tavanında cevap ortadan kesiliyor ve `output_parsed` boş
      // dönüyordu — canlı kayıtta "Rehber doğrulaması alınamadı".
      max_output_tokens: Math.max(budget.verifierMaxOutputTokens, 4000),
      input: [{ role: "system", content: system }, { role: "user", content: user }],
      text: { format: zodTextFormat(VerificationSchema, "gelecekfinans_guide_verification") },
    });
    if (!response.output_parsed) {
      throw new Error(
        `Rehber doğrulaması alınamadı (durum: ${response.status ?? "bilinmiyor"}, ` +
        `eksik: ${response.incomplete_details?.reason ?? "yok"})`,
      );
    }
    return response.output_parsed;
  } catch (error) {
    if (config.provider === "anthropic" && isAnthropicBillingError(error)) throw new AnthropicBillingError();
    if (isOpenAIQuotaError(error)) throw new OpenAIQuotaError();
    throw error;
  }
}

const JUDGE_MAX_CALLS_PER_RUN = Number(process.env.RESEARCH_JUDGE_MAX_CALLS_PER_RUN) || 8;
const judgeCache = new Map<string, boolean>();
let judgeBudget = JUDGE_MAX_CALLS_PER_RUN;

export function resetSameStoryJudgeBudget(): void {
  judgeBudget = JUDGE_MAX_CALLS_PER_RUN;
}

export function sameStoryJudgeCallsUsed(): number {
  return JUDGE_MAX_CALLS_PER_RUN - judgeBudget;
}

interface StoryBrief {
  title: string;
  summary: string;
  source: string;
}

const JUDGE_SYSTEM = [
  "İki haber metninin AYNI olayı anlatıp anlatmadığına karar veren bir editörsün.",
  "Aynı olay demek: aynı açıklama, aynı veri seti, aynı karar veya aynı fiyat hareketi.",
  "Aynı konuda olmak yetmez. Farklı gün, farklı kurum, farklı veri veya farklı bir gelişme AYNI OLAY DEĞİLDİR.",
  "Biri diğerinin arka planını veriyorsa ama olay farklıysa sameEvent false olmalı.",
  "Emin değilsen sameEvent false yaz. reason alanına tek cümlelik gerekçe yaz.",
].join("\n");

function judgePrompt(primary: StoryBrief, candidate: StoryBrief): string {
  return [
    `HABER A (${primary.source})`,
    `Başlık: ${primary.title}`,
    `Özet: ${primary.summary.slice(0, 600)}`,
    "",
    `HABER B (${candidate.source})`,
    `Başlık: ${candidate.title}`,
    `Özet: ${candidate.summary.slice(0, 600)}`,
  ].join("\n");
}

export async function judgeSameStory(primary: StoryBrief, candidate: StoryBrief): Promise<boolean> {
  const cacheKey = `${primary.title}|${candidate.title}`;
  const cached = judgeCache.get(cacheKey);
  if (cached !== undefined) return cached;
  if (judgeBudget <= 0) return false;

  let config: ArticleAIConfig;
  try {
    config = resolveArticleAIConfig();
  } catch {
    return false; // sağlayıcı yapılandırılmamışsa kapı kapalı kalır
  }
  judgeBudget -= 1;
  const user = judgePrompt(primary, candidate);

  try {
    let verdict: SameStoryVerdict;
    if (config.provider === "anthropic") {
      const response = await anthropic().messages.parse({
        model: config.verifierModel,
        max_tokens: 300,
        system: JUDGE_SYSTEM,
        messages: [{ role: "user", content: user }],
        output_config: { format: zodOutputFormat(SameStorySchema) },
      });
      if (!response.parsed_output) return false;
      verdict = response.parsed_output;
    } else if (config.provider === "deepseek") {
      verdict = await deepseekJson<SameStoryVerdict>({
        model: config.verifierModel,
        system: JUDGE_SYSTEM,
        user,
        maxTokens: 300,
        schema: SameStorySchema,
        name: "gelecekfinans_same_story",
      });
    } else {
      const response = await openai().responses.parse({
        model: config.verifierModel,
        max_output_tokens: 300,
        reasoning: { effort: "minimal" },
        input: [
          { role: "system", content: JUDGE_SYSTEM },
          { role: "user", content: user },
        ],
        text: { format: zodTextFormat(SameStorySchema, "gelecekfinans_same_story") },
      });
      if (!response.output_parsed) return false;
      verdict = response.output_parsed;
    }
    const result = verdict.sameEvent === true;
    judgeCache.set(cacheKey, result);
    return result;
  } catch {
    // Kota, ağ hatası, bozuk çıktı: hepsi "doğrulanmadı" demektir.
    return false;
  }
}

/**
 * Yazım şeridi ayarı. İki şerit aynı üretim/onarım makinesini paylaşır;
 * yalnızca talimat, şema, kalite ayarı ve kanıt eşiği değişir.
 */
export interface WriteArticleOptions {
  /** Talimat metni; verilmezse haber talimatı kullanılır. */
  instructions?: string;
  preset?: QualityPreset;
  schema?: typeof ArticleDraftSchema;
  minEvidenceChars?: number;
  /** Kanıt kapısı geçilmediğinde atılacak hata metni. */
  researchBlockedMessage?: string;
}

export async function writeArticle(
  topic: Topic,
  targetWords = 650,
  options: WriteArticleOptions = {},
): Promise<{
  title: string;
  meta: string;
  keyword: string;
  content: string;
  aiExtras: ArticleExtras;
  category: string;
  source: string;
  wordCount: number;
  quality: QualityReport;
  verification: VerificationReport;
  plagiarism: PlagiarismReport;
  plagiarismRepairApplied: boolean;
  ai: ArticleAIConfig;
}> {
  const preset = options.preset ?? NEWS_QUALITY_PRESET;
  const schema = options.schema ?? ArticleDraftSchema;
  const baseInstructions = options.instructions ?? articleInstructions(targetWords);
  const minEvidenceChars = options.minEvidenceChars ?? MIN_EVIDENCE_MATERIAL_CHARS;

  const packet = topic.evidencePacket;
  if (!packet) throw new Error("RESEARCH_BLOCKED: Kanıt paketi yok");
  if (preset.requireEvidence) {
    if (packet.status !== "VERIFIED") {
      throw new Error(
        `RESEARCH_BLOCKED: ${options.researchBlockedMessage ?? "İki bağımsız kaynak doğrulaması tamamlanmadı"}`,
      );
    }
    const materialCharacters = evidenceMaterialCharacterCount(packet);
    if (materialCharacters < minEvidenceChars) {
      throw new Error(
        `RESEARCH_BLOCKED: Kanıt metni sağlam bir ${preset.label} için fazla kısa: ${materialCharacters} karakter`,
      );
    }
  }

  const packetIds = new Set(packet.evidence.map((item) => item.id));

  const plagiarismInput = (candidate: ArticleDraft, html: string) => ({
    candidate: [
      html,
      ...candidate.summary,
      candidate.impact,
      ...candidate.faq.flatMap((item) => [item.q, item.a]),
    ].join(" "),
    evidencePacket: packet,
  });

  /**
   * Yazım + onarım döngüsü (en fazla 3 model çağrısı).
   *
   * Kalite ve intihal kapıları makinece kesin: eşik ihlali metnin neresinde,
   * hangi ifadede olduğu tam biliniyor. Eski akış bu bilgiyi kullanmadan konuyu
   * çöpe atıyordu; kanıt paketi sağlamken makaleyi kaybetmek gereksiz.
   *
   * Artık hangi kapı takılırsa gerekçesi modele geri veriliyor ve yeniden
   * yazdırılıyor. Ölçüldü (DeepSeek, Fed tutanakları haberi): ilk taslak %53
   * kaynak örtüşmesi → geri bildirimli ikinci tur %12 → eşleşen ifadenin kendisi
   * de verilince temiz. Üç denemeden sonra durulur; sonsuz deneme maliyeti
   * patlatır ve zaten model o konuda takılmış demektir.
   */
  /**
   * Kısaltılmış kanıt kimliklerini gerçek kimliklere eşler.
   *
   * Kimlikler `ev-3-publisher-ntv-baslik-slug` biçiminde; modeller (özellikle
   * küçük olanlar) bunu `ev-3` diye kısaltıyor ve kalite kapısı "bilinmeyen
   * kanıt kimliği" deyip makaleyi düşürüyordu. Kısaltma tek bir gerçek kimliğe
   * işaret ettiği sürece bu bir hata değil, biçim farkı: sessizce eşliyoruz.
   * Birden çok kimliğe uyuyorsa VEYA hiçbirine uymuyorsa dokunmuyoruz; kapı o
   * zaman haklı olarak devreye girsin.
   */
  const resolveEvidenceId = (value: string): string => {
    if (packetIds.has(value)) return value;
    /**
     * Kanıt paketi modele `[kimlik]` biçiminde gösteriliyor; modeller köşeli
     * parantezi kimliğin PARÇASI sanıp `[ev-2-publisher:dunya-...]` diye geri
     * yazıyor ve kapı "bilinmeyen kanıt kimliği" deyip bitmiş makaleyi çöpe
     * atıyordu (canlı kayıttan: tek makalede 7 ihlalin tamamı buydu).
     * Parantez biçim işareti, veri değil: sessizce soyuluyor.
     */
    const unwrapped = value.trim().replace(/^\[+/, "").replace(/\]+$/, "").trim();
    if (packetIds.has(unwrapped)) return unwrapped;
    const prefixed = [...packetIds].filter((id) => id.startsWith(`${unwrapped}-`));
    return prefixed.length === 1 ? prefixed[0] : unwrapped;
  };
  const normalizeEvidenceIds = (candidate: ArticleDraft): ArticleDraft => ({
    ...candidate,
    claims: candidate.claims.map((claim) => ({
      ...claim,
      evidenceIds: claim.evidenceIds.map(resolveEvidenceId),
    })),
  });

  /**
   * Odak anahtar kelimeyi metinle uyumlu hale getirir.
   *
   * Kalite kapısı keyword'ün hem meta hem lede içinde birebir geçmesini
   * istiyor. Modeller (özellikle küçük olanlar) makaleyi doğru yazıp keyword
   * alanına metinde geçmeyen bir ifade koyuyor ve makale bu yüzden çöpe
   * gidiyordu — ölçüldü: DeepSeek'te 5 konunun 3'ü SADECE bu yüzden düştü.
   *
   * Keyword seçimi editoryal değil mekanik bir SEO alanı: metinde zaten geçen
   * bir ifadeyi seçmek içeriği değiştirmiyor. Başlıktaki anlamlı sözcüklerden
   * meta VE lede içinde birlikte geçen en uzun 1-3 kelimelik diziyi seçiyoruz.
   * Uygun dizi yoksa dokunmuyoruz; kapı o zaman haklı olarak devreye girsin.
   */
  const normalizeKeyword = (candidate: ArticleDraft): ArticleDraft => {
    const lower = (value: string) => value.toLocaleLowerCase("tr-TR");
    const meta = lower(candidate.meta);
    const lede = lower(candidate.lede);
    if (meta.includes(lower(candidate.keyword)) && lede.includes(lower(candidate.keyword))) {
      return candidate;
    }
    const words = candidate.title
      .split(/[^\p{L}\p{N}%]+/u)
      .filter((word) => word.length >= 3);
    const phrases: string[] = [];
    for (let size = 3; size >= 1; size--) {
      for (let index = 0; index + size <= words.length; index++) {
        phrases.push(words.slice(index, index + size).join(" "));
      }
    }
    const replacement = phrases.find((phrase) => {
      const needle = lower(phrase);
      return meta.includes(needle) && lede.includes(needle);
    });
    return replacement ? { ...candidate, keyword: replacement } : candidate;
  };

  /**
   * Onarım turu ücretsiz değil: her deneme ayrı bir model çağrısı. Ucuz
   * sağlayıcıda (DeepSeek) 4 deneme önemsiz, OpenAI/Anthropic'te aynı makale
   * için faturayı dörde katlar. Pahalı sağlayıcıda tek onarım hakkı var:
   * ölçümde kazancın büyük kısmı zaten ilk onarımda geliyordu (%53 → %12).
   */
  /**
   * Meta uzunluğunu mekanik olarak sınırlar.
   *
   * Modellere karakter saydırmak güvenilmez: talimat "145-160" dese de çıktı
   * 166 geliyor ve arama sonucu ~155'te zaten kırpıldığı için bu 1 karakter
   * okur açısından hiçbir şey değiştirmiyor. Onarım turu harcamak yerine
   * cümle sınırından kesiyoruz. Odak kelime kesilen parçada kalıyorsa
   * DOKUNMUYORUZ — kelimeyi kaybetmek uzunluktan daha kötü, kapı devreye
   * girip modele geri göndersin.
   */
  const SEO_META_MAX = 165;
  const trimMeta = (candidate: ArticleDraft): ArticleDraft => {
    if (candidate.meta.length <= SEO_META_MAX) return candidate;
    const cut = candidate.meta.slice(0, SEO_META_MAX);
    const boundary = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
    const trimmed = (boundary > 100 ? cut.slice(0, boundary + 1) : cut.slice(0, cut.lastIndexOf(" "))).trim();
    const keeps = trimmed.toLocaleLowerCase("tr-TR")
      .includes(candidate.keyword.toLocaleLowerCase("tr-TR"));
    return keeps && trimmed.length >= 110 ? { ...candidate, meta: trimmed } : candidate;
  };

  const MAX_ATTEMPTS = resolveArticleAIConfig().provider === "deepseek" ? 4 : 2;
  let draft = trimMeta(normalizeKeyword(normalizeEvidenceIds(
    await generateDraft(topic, targetWords, baseInstructions, schema),
  )));
  let quality = validateDraft(draft, packet, preset);
  let content = quality.passed ? renderDraftHtml(draft, packet) : "";
  let plagiarism = quality.passed
    ? checkPlagiarism(plagiarismInput(draft, content))
    : null;
  let repairApplied = false;

  for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt++) {
    if (quality.passed && plagiarism?.passed) break;
    const feedback = quality.passed && plagiarism
      ? plagiarismRepairInstructions(targetWords, plagiarism, baseInstructions)
      : qualityRepairInstructions(targetWords, quality.issues, baseInstructions);
    draft = trimMeta(normalizeKeyword(normalizeEvidenceIds(
      await generateDraft(topic, targetWords, feedback, schema),
    )));
    repairApplied = true;
    quality = validateDraft(draft, packet, preset);
    content = quality.passed ? renderDraftHtml(draft, packet) : "";
    plagiarism = quality.passed ? checkPlagiarism(plagiarismInput(draft, content)) : null;
  }

  if (!quality.passed) {
    throw new Error(`QUALITY_BLOCKED: ${quality.issues.join("; ")}`);
  }
  if (!plagiarism || !plagiarism.passed) {
    // Kopyalanan ifadeyi hataya yazıyoruz: "%19, 23 kelime" tek başına ops
    // tarafında hangi cümlenin sorun olduğunu göstermiyordu.
    const copied = plagiarism?.matches.find((match) => match.longestExactRunText)?.longestExactRunText;
    throw new Error(
      `PLAGIARISM_BLOCKED: ${plagiarism?.issues.join("; ") || "intihal kontrolü yapılamadı"}` +
      (copied ? ` | kopyalanan: "${copied}"` : ""),
    );
  }
  const plagiarismRepairApplied = repairApplied;

  const verification = packet.evidence.length
    ? await verifyDraft(topic, draft)
    : await verifyGuideDraft(topic, draft);
  if (!verification.passed || verification.unsupportedClaims.length || verification.conflictingClaims.length) {
    const reasons = [...verification.unsupportedClaims, ...verification.conflictingClaims].join("; ");
    throw new Error(`VERIFICATION_BLOCKED: ${reasons || "Model doğrulaması geçmedi"}`);
  }

  return {
    title: draft.title,
    meta: draft.meta,
    keyword: draft.keyword,
    content,
    aiExtras: { summary: draft.summary, impact: draft.impact, faq: draft.faq },
    category: topic.category,
    source: packet.evidence.map((item) => item.source).join(", "),
    wordCount: quality.wordCount,
    quality,
    verification,
    plagiarism,
    plagiarismRepairApplied,
    ai: resolveArticleAIConfig(),
  };
}


/**
 * Rehber (evergreen) makale yazar.
 *
 * Haber yazarıyla aynı üretim, onarım, kalite, intihal ve doğrulama
 * makinesini kullanır — ayrı bir "gevşek yol" AÇILMADI. Değişen yalnızca
 * talimat, şema, kalite ayarı ve kanıt eşiği: rehberde eşik daha YÜKSEK
 * (1200 karakter), çünkü metin daha uzun ve modelin uydurma alanı daha geniş.
 */
export async function writeGuideArticle(
  topic: GuideTopic,
  targetWords = 1200,
): Promise<Awaited<ReturnType<typeof writeArticle>>> {
  // Rehber konusu haber `Topic` biçimine uyarlanır: başlık odak kelimedir,
  // makale başlığını modelin kendisi kurar.
  const asTopic: Topic = {
    title: topic.keyword,
    summary: `"${topic.keyword}" sorusuna resmî kaynaklara dayalı kalıcı rehber.`,
    category: topic.category,
    source: topic.evidencePacket.evidence.map((item) => item.source).join(", "),
    sourceUrl: topic.evidencePacket.evidence[0]?.sourceUrl,
    pubDate: Date.now(),
    sourcePriority: 100,
    relevanceScore: 100,
    relevanceReasons: ["Anahtar kelime havuzundan seçildi"],
    evidencePacket: topic.evidencePacket,
  };

  return writeArticle(asTopic, targetWords, {
    instructions: guideInstructions(targetWords, {
      keyword: topic.keyword,
      category: topic.category,
      isHub: topic.isHub,
      clusterArticles: topic.clusterArticles,
    }),
    preset: GUIDE_QUALITY_PRESET,
    schema: GuideDraftSchema,
    minEvidenceChars: MIN_GUIDE_EVIDENCE_CHARS,
    researchBlockedMessage: "Resmî kaynak kanıtı toplanamadı",
  });
}
