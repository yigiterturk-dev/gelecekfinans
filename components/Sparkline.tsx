/**
 * CLS-güvenli, bağımlılıksız SVG sparkline. Sabit viewBox + preserveAspectRatio
 * sayesinde alan rezerve edilir; veri yokken bile yükseklik korunur.
 */
interface Props {
  data: number[] | null;
  up?: boolean;
  width?: number;
  height?: number;
  label?: string;
  /** Satır içi mini kullanım: çerçeve/dolgu/zemin yok (MarketMini gibi 80x24 alanlar). */
  bare?: boolean;
}

export default function Sparkline({ data, up = true, width = 320, height = 72, label, bare = false }: Props) {
  const stroke = up ? "var(--up)" : "var(--dn)";
  const gradId = `spark-${up ? "up" : "dn"}`;
  let path = "";
  let area = "";
  if (data && data.length > 1) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    const pts = data.map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 6) - 3;
      return [x, y] as const;
    });
    path = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    area = `${path} L${width},${height} L0,${height} Z`;
  }
  return (
    <div className={bare ? "spark-wrap spark-wrap--bare" : "spark-wrap"} style={{ aspectRatio: `${width} / ${height}` }}>
      {path ? (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={label || "Fiyat grafiği"}
          className="spark-svg"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.16" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradId})`} stroke="none" />
          <path d={path} fill="none" stroke={stroke} strokeWidth={1.8} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      ) : (
        <div className="spark-empty" aria-hidden="true">grafik verisi yok</div>
      )}
    </div>
  );
}
