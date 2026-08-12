import OpenAI from "openai";
import { CATEGORY_PROMPTS, ARTICLE_WORDS, ARTICLE_MIN_WORDS } from "./config";
import type { Topic } from "./topics";
import type { ArticleExtras, ArticleFaq } from "@/lib/types";
import { XMLParser } from "fast-xml-parser";

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY yapılandırılmamış.");
  }
  if (!openaiClient) openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

let _cachedPrices: { data: string; ts: number } | null = null;

async function getLivePrices(): Promise<string> {
  if (_cachedPrices && Date.now() - _cachedPrices.ts < 10 * 60 * 1000) return _cachedPrices.data;
  try {
    const [tcmbRes, btcRes] = await Promise.all([
      fetch("https://www.tcmb.gov.tr/kurlar/today.xml").then(r => r.text()),
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd,try").then(r => r.json()),
    ]);
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const xml = parser.parse(tcmbRes);
    const kurlar = xml?.Tarih_Date?.Currency || [];
    const find = (code: string) => {
      const k = kurlar.find((c: Record<string, string>) => c["@_CurrencyCode"] === code);
      return k ? parseFloat(k.ForexSelling) : null;
    };
    const usd = find("USD");
    const eur = find("EUR");
    const btcUsd = btcRes?.bitcoin?.usd;
    const btcTry = btcRes?.bitcoin?.try;
    const ethUsd = btcRes?.ethereum?.usd;
    let goldOzUsd = 2400;
    try {
      const goldRes = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d");
      const goldData = await goldRes.json();
      const goldPrice = goldData?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (goldPrice) goldOzUsd = goldPrice;
    } catch {}
    const goldGramTry = usd ? Math.round((goldOzUsd / 31.1035) * usd) : null;

    const lines = [
      `Tarih: ${new Date().toLocaleDateString("tr-TR")}`,
      usd ? `Dolar/TL: ${usd.toFixed(2)}` : null,
      eur ? `Euro/TL: ${eur.toFixed(2)}` : null,
      btcUsd ? `Bitcoin: $${btcUsd.toLocaleString("en-US")} (₺${Math.round(btcTry).toLocaleString("tr-TR")})` : null,
      ethUsd ? `Ethereum: $${ethUsd.toLocaleString("en-US")}` : null,
      goldGramTry ? `Gram Altın (yaklaşık): ₺${goldGramTry.toLocaleString("tr-TR")}` : null,
    ].filter(Boolean);
    const txt = lines.join("\n");
    _cachedPrices = { data: txt, ts: Date.now() };
    return txt;
  } catch {
    return "Güncel fiyat verisi alınamadı.";
  }
}

function countWords(text: string): number {
  return text.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
}

// Yazar personaları — her makale farklı bir gazeteci sesiyle yazılsın (tekdüze şablon hissini kırar).
// Başlığa göre deterministik seçilir (aynı haber hep aynı yazar, ama haberler arası çeşitlilik).
const AUTHOR_PERSONAS = [
  { name: "Mehmet Arslan", voice: "Kıdemli makroekonomi muhabiri. Resmi, ölçülü, analitik dil; bağlam zengin, tarihsel perspektifli cümleler; kurumsal ton." },
  { name: "Elif Demir", voice: "Genç, enerjik piyasa muhabiri. Akıcı, dinamik, doğrudan dil; kısa-orta cümleler; 'bu ne anlama geliyor' bağını hızlı kurar." },
  { name: "Can Yılmaz", voice: "Veri odaklı ekonomi yazarı. Sade, net, süssüz; rakamı ve somut gelişmeyi öne çıkarır; kısa paragraflar, madde madde netlik." },
  { name: "Zeynep Kaya", voice: "Açıklayıcı/eğitici muhabir. Karmaşık konuyu sade örneklerle anlatır; samimi ama profesyonel; okuyucuyu elinden tutar." },
  { name: "Burak Şahin", voice: "Saha/aktüel haber muhabiri. Olay-odaklı, güçlü 5N1K, hızlı giriş; yorumdan çok olguya yaslanır." },
];
function pickPersona(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AUTHOR_PERSONAS[h % AUTHOR_PERSONAS.length];
}

async function buildPrompt(topic: Topic, targetWords: number): Promise<string> {
  const prices = await getLivePrices();
  const struct = CATEGORY_PROMPTS[topic.category]?.structure || "";

  return `HABERİ YAZ — Konu: ${topic.title}
Kaynak özet: ${topic.summary}
Kategori: ${topic.category}
Hedef uzunluk: EN AZ ${targetWords} kelime

⚠️ ÖNEMLİ: Bu bir HABER yazısıdır, ANALİZ DEĞİL. Piyasa analizi, teknik görünüm, destek/direnç YAZMA.
Haberin odağı: KİM NE DEDİ, NE KARAR ALDI, NE AÇIKLADI — somut olay ve gelişmeleri yaz.

GÜNCEL PİYASA VERİLERİ (SADECE haber doğrudan kur/fiyat/piyasayla ilgiliyse kullan):
${prices}
⚠️ KRİTİK: Eğer haber piyasa/ekonomiyle DOĞRUDAN ilgili DEĞİLSE (kaza, atama, diplomasi, siyasi olay, genel gündem), yukarıdaki piyasa verilerini KULLANMA. Dolar/euro/TCMB/enflasyon gibi alakasız ekonomik yorumları haberin içine ZORLA SOKMA — bu saçma durur. Habere sadık kal, ne olduysa onu anlat.
${struct ? `
ÖNERİLEN BÖLÜM AKIŞI (yalnızca konuya UYUYORSA rehber al — UYMUYORSA ZORLAMA):
${struct}
Haber bu akışa uymuyorsa (örn. kaza/olay/atama/diplomasi haberi), bu başlıkları KULLANMA; habere uygun doğal ## başlıkları kur: ne oldu → detaylar → yetkili açıklamaları → etkisi → arka plan/geçmiş.
` : ""}
HABER FORMATI:
1. SEO başlığı (55-62 karakter) — "X şunu açıkladı", "Y kararı alındı" gibi haber başlığı
2. Meta description (150-160 karakter, focus keyword içersin)
3. Focus keyword (1-3 kelime)
4. Haber içeriği:
   - İlk paragraf: Haberin özeti (ne oldu, kim açıkladı, ne zaman)
   - Detaylar: Kararın/gelişmenin arka planı ve önemi
   - Türkiye etkisi: Bu gelişme Türkiye'yi nasıl etkiler
   - Uzman/yetkili görüşleri veya resmi açıklamalar
   - Geçmişle karşılaştırma: Daha önce benzer durumda ne olmuştu

SEO KURALLARI:
- En az 4 tane ## (H2) başlığı kullan
- Focus keyword'ü ilk paragrafta ve meta description'da kullan
- Focus keyword'ü DOĞAL kullan; ASLA tekrar tekrar zorla yazma. Yoğunluk %2.5'i AŞMASIN
  (ortalama her 40-50 kelimede en fazla 1 kez). Aynı kelimeyi tekrarlamak yerine eş anlamlı,
  zamir ("o", "bu gelişme", "söz konusu karar") ve farklı ifadelerle çeşitlendir.
- Makale içine madde listesi ekle

DIŞ LİNK (ZORUNLU — en az 1 tane):
- Gerçek URL kullan, placeholder YAZMA. Örnekler:
  * [TCMB](https://www.tcmb.gov.tr)
  * [TÜİK](https://www.tuik.gov.tr)
  * [Bloomberg](https://www.bloomberg.com)
  * [Reuters](https://www.reuters.com)
- Format: [Görünen Metin](https://gercek-url.com)

İÇ LİNK: Uygun bir yere "[DAHILI_LINK]" yerleştir.

YASAKLAR:
- Piyasa analizi, teknik analiz, destek/direnç, fiyat hedefi YAZMA
- Yatırım tavsiyesi verme, al-sat sinyali verme
- Kaynak metni kopyalama, özgün yaz
- Sonuna disclaimer ekle

OKUYUCU YARDIMCILARI (makaleyle birlikte üret — KISA ve NET):
- OZET: Haberin en önemli 3 noktası, dikey çubuk (|) ile ayrılmış TEK satır. Her madde 1 cümle.
- ETKI: "Senin için ne demek?" — bu haber dolar/euro/altın/kripto/mevduat tutan SIRADAN bir okuyucuyu somut olarak nasıl etkiler? 1-2 cümle, sade dil. Haber piyasayla DOĞRUDAN ilgili değilse aynen şunu yaz: "Bu haberin döviz, altın veya kripto varlıklarınıza doğrudan etkisi bulunmuyor."
- SSS: Tam 3 soru-cevap. Format: S: soru || C: cevap, çiftler ;; ile ayrılır. Cevaplar 1-2 cümle, yatırım tavsiyesi içermez.

Format (HER etiket TEK satırdır; ICERIK her zaman EN SONDA gelir):
BASLIK: ...
META: ...
KEYWORD: ...
OZET: birinci nokta | ikinci nokta | üçüncü nokta
ETKI: ...
SSS: S: birinci soru || C: birinci cevap ;; S: ikinci soru || C: ikinci cevap ;; S: üçüncü soru || C: üçüncü cevap
ICERIK:
[makale buraya]`;
}

function mdToHtml(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("## ")) {
      out.push(`<h2>${inline(line.slice(3).trim())}</h2>`);
    } else if (line.startsWith("### ")) {
      out.push(`<h3>${inline(line.slice(4).trim())}</h3>`);
    } else if (line.startsWith("- ")) {
      out.push(`<li>${inline(line.slice(2).trim())}</li>`);
    } else {
      out.push(`<p>${inline(line)}</p>`);
    }
  }

  const final: string[] = [];
  let inList = false;
  for (const item of out) {
    if (item.startsWith("<li>") && !inList) {
      final.push("<ul>");
      inList = true;
    } else if (!item.startsWith("<li>") && inList) {
      final.push("</ul>");
      inList = false;
    }
    final.push(item);
  }
  if (inList) final.push("</ul>");

  return final.join("\n");
}

function inline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="nofollow noopener noreferrer">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

/**
 * LLM çıktısındaki OZET/ETKI/SSS satırlarını yapılandırılmış `ArticleExtras`'a
 * dönüştürür. Model formata uymazsa alanlar boş kalır; hiçbiri yoksa null döner
 * (sayfa kutuyu/FAQ schema'yı graceful gizler). Plain metin — HTML basılmaz,
 * render/JSON-LD tarafında ayrıca kaçışlanır.
 */
function parseExtras(summaryRaw: string, impactRaw: string, faqRaw: string): ArticleExtras | null {
  const summary = summaryRaw
    ? summaryRaw.split("|").map((s) => s.trim()).filter(Boolean).slice(0, 5)
    : [];

  const impact = impactRaw.trim();

  const faq: ArticleFaq[] = faqRaw
    ? faqRaw
        .split(";;")
        .map((chunk) => {
          const [qPart, aPart] = chunk.split("||");
          const q = (qPart || "").replace(/^\s*S\s*:\s*/i, "").trim();
          const a = (aPart || "").replace(/^\s*C\s*:\s*/i, "").trim();
          return q && a ? { q, a } : null;
        })
        .filter((x): x is ArticleFaq => x !== null)
        .slice(0, 6)
    : [];

  if (summary.length === 0 && !impact && faq.length === 0) return null;
  return {
    ...(summary.length ? { summary } : {}),
    ...(impact ? { impact } : {}),
    ...(faq.length ? { faq } : {}),
  };
}

function parseResponse(raw: string, topic: Topic) {
  const lines = raw.split("\n");
  let title = topic.title;
  let meta = "";
  let keyword = "";
  let summaryRaw = "";
  let impactRaw = "";
  let faqRaw = "";
  const contentLines: string[] = [];
  let inContent = false;

  for (const line of lines) {
    if (!inContent && line.startsWith("BASLIK:")) {
      title = line.replace("BASLIK:", "").trim();
    } else if (!inContent && line.startsWith("META:")) {
      meta = line.replace("META:", "").trim();
    } else if (!inContent && line.startsWith("KEYWORD:")) {
      keyword = line.replace("KEYWORD:", "").trim();
    } else if (!inContent && line.startsWith("OZET:")) {
      summaryRaw = line.replace("OZET:", "").trim();
    } else if (!inContent && line.startsWith("ETKI:")) {
      impactRaw = line.replace("ETKI:", "").trim();
    } else if (!inContent && line.startsWith("SSS:")) {
      faqRaw = line.replace("SSS:", "").trim();
    } else if (line.startsWith("ICERIK:")) {
      inContent = true;
    } else if (inContent) {
      contentLines.push(line);
    }
  }

  const content = mdToHtml(contentLines.join("\n").trim());
  const aiExtras = parseExtras(summaryRaw, impactRaw, faqRaw);

  return { title, meta, keyword, content, aiExtras, category: topic.category, source: topic.source };
}

export async function writeArticle(
  topic: Topic,
  targetWords = ARTICLE_WORDS,
  maxRetries = 3
): Promise<{
  title: string; meta: string; keyword: string; content: string;
  aiExtras: ArticleExtras | null;
  category: string; source: string; wordCount: number;
}> {
  const openai = getOpenAI();
  const catExtra = CATEGORY_PROMPTS[topic.category]?.system_extra || "";
  const persona = pickPersona(topic.title);

  const system = `Sen gelecekfinans.com için yazan ${persona.name} adlı deneyimli bir Türk ekonomi gazetecisisin.

SENİN ÜSLUBUN: ${persona.voice}
Bu üsluba SADIK kal — her yazarın sesi farklıdır; cümle yapın, tonun, paragraf uzunluğun ve kelime seçimin bu kimliğe uysun. Kalıplaşmış, tekdüze, "şablon doldurmuş" gibi yazma; doğal ve kendine özgü yaz.

YAZIM TARZI:
- Gazetecilik diliyle yaz — haber formatında, objektif, bilgilendirici
- İlk paragrafta haberin özünü ver (5N1K: Ne oldu, kim açıkladı, ne zaman, neden önemli)
- Haberi derinleştir: arka plan, bağlam, uzman/yetkili görüşleri, geçmişle karşılaştırma
- H2 başlıkları kullan (## ile), en az 3 H2 bölümü olsun
- ÖZGÜN İÇERİK: Kaynak metinlerden cümle kopyalama, haberi kendi cümlelerinle yaz
- ANAHTAR KELİME DOĞALLIĞI: Focus keyword'ü zorla tekrar etme; yoğunluğu %2.5'in altında tut.
  Aynı terimi tekrar yazmak yerine eş anlamlı, zamir ve farklı ifadelerle çeşitlendir (keyword stuffing yapma).

HABER ODAĞI:
- Kim ne dedi, ne karar aldı, ne açıkladı — SOMUT OLAYLAR yaz
- "TCMB faizi sabit tuttu", "Ekonomi Bakanı X ile görüştü", "Enflasyon %X açıklandı" gibi GERÇEK haberler
- Soyut piyasa analizi YAPMA. "Dolar/TL'nin teknik görünümü" gibi analiz yazıları YAZMA.
- Her haberde konunun Türkiye ekonomisine etkisini açıkla

⛔ YASAKLAR (KESİNLİKLE UYULMASI GEREKEN):
- ASLA yatırım tavsiyesi verme, fiyat hedefi verme, al-sat sinyali verme
- ASLA destek/direnç seviyesi, teknik analiz, fiyat tahmini yazma
- ASLA "yükselecek", "düşecek" gibi kesin tahmin yapma
- "Teknik seviyeler", "teknik görünüm", "teknik analiz" başlığı AÇMA
- Piyasa verilerini sadece MEVCUT DURUM olarak aktar, gelecek tahmini yapma
- Her yazının sonuna disclaimer ekle: "Bu içerik yalnızca bilgilendirme amaçlıdır, yatırım tavsiyesi değildir."
${catExtra}`;

  let article: ReturnType<typeof parseResponse> & { wordCount: number } = null!;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const wordsAsk = targetWords + attempt * 250;

    let response;
    try {
      response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: system },
          { role: "user", content: await buildPrompt(topic, wordsAsk) },
        ],
        max_tokens: Math.min(6000, wordsAsk * 3),
        temperature: 0.7,
      });
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      if (err.status === 429 || err.status === 503) {
        await new Promise(r => setTimeout(r, 5000));
        response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: system },
            { role: "user", content: await buildPrompt(topic, wordsAsk) },
          ],
          max_tokens: Math.min(6000, wordsAsk * 3),
          temperature: 0.7,
        });
      } else {
        throw new Error(`OpenAI: ${err.status || "?"} — ${err.message || String(e)}`);
      }
    }

    const raw = response.choices[0].message.content?.trim() || "";
    const parsed = parseResponse(raw, topic);
    const wc = countWords(parsed.content);
    article = { ...parsed, wordCount: wc };

    if (wc >= ARTICLE_MIN_WORDS) return article;
  }

  return article;
}
