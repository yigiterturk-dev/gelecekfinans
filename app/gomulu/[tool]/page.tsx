import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EMBED_TOOLS, EMBED_TOOLS_BY_SLUG, BASE } from "@/lib/embed-tools";
import LoanCalculator from "@/components/calculators/LoanCalculator";
import DepositCalculator from "@/components/calculators/DepositCalculator";
import InflationCalculator from "@/components/calculators/InflationCalculator";
import CompoundCalculator from "@/components/calculators/CompoundCalculator";
import StockPnlCalculator from "@/components/calculators/StockPnlCalculator";
import RentIncreaseCalculator from "@/components/calculators/RentIncreaseCalculator";
import PensionRaiseCalculator from "@/components/calculators/PensionRaiseCalculator";
import DividendCalculator from "@/components/calculators/DividendCalculator";

export const revalidate = 86400;

/**
 * Başka sitelere iframe ile gömülen hesaplayıcı.
 *
 * noindex, follow: gömülen kopya arama sonucunda görünmemeli (kendi
 * sayfamızla yarışmasın ve gömüldüğü sitenin sayfasını ayrı bir zayıf
 * adres olarak bölmesin). follow ise atıf linkinin değerini korur.
 */
export function generateStaticParams() {
  return EMBED_TOOLS.map((t) => ({ tool: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const { tool } = await params;
  const t = EMBED_TOOLS_BY_SLUG[tool];
  if (!t) return {};
  return {
    title: `${t.label} — GelecekFinans Aracı`,
    description: t.desc,
    robots: { index: false, follow: true },
    alternates: { canonical: `${BASE}/araclar/${t.slug}` },
  };
}

function Calculator({ kind }: { kind: string }) {
  switch (kind) {
    case "kredi": return <LoanCalculator />;
    case "mevduat": return <DepositCalculator />;
    case "enflasyon": return <InflationCalculator />;
    case "bilesik": return <CompoundCalculator />;
    case "hissekz": return <StockPnlCalculator />;
    case "kira": return <RentIncreaseCalculator />;
    case "emekli": return <PensionRaiseCalculator />;
    case "temettu": return <DividendCalculator />;
    default: return null;
  }
}

export default async function EmbedPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  const t = EMBED_TOOLS_BY_SLUG[tool];
  if (!t) notFound();

  return (
    <div className="embed-shell">
      {/* iframe içinde gövde dolgusu ve chrome sıfırlanır; gömüldüğü sayfanın
          tasarımıyla çakışmaması için yalnızca aracın kendisi görünür. */}
      <style>{`
        body { padding: 0 !important; background: #fff; }
        .pb-ticker { padding-bottom: 0 !important; }
        .skip-link { display: none !important; }
        .embed-shell { max-width: 720px; margin: 0 auto; padding: 12px 12px 8px; }
        .embed-shell .calc-box { margin-top: 0; }
        .embed-head { font: 600 15px/1.3 var(--sans, system-ui, sans-serif); color: #111; margin: 0 0 10px; }
        .embed-attr { margin: 10px 0 0; font: 400 12px/1.5 var(--sans, system-ui, sans-serif); color: #666; }
        .embed-attr a { color: #0a7d4f; text-decoration: none; }
        .embed-attr a:hover { text-decoration: underline; }
      `}</style>
      <h1 className="embed-head">{t.label}</h1>
      <Calculator kind={t.kind} />
      <p className="embed-attr">
        <Link href={`${BASE}/araclar/${t.slug}`} target="_blank" rel="noopener">
          {t.label}
        </Link>{" "}
        aracı — veriler ve yöntem:{" "}
        <Link href={BASE} target="_blank" rel="noopener">GelecekFinans</Link>
      </p>
    </div>
  );
}
