"use client";

import { useEffect, useRef, useState } from "react";

type Props = { symbol: string; title: string };

/** Official TradingView hosted Advanced Chart embed. */
export default function TradingViewChart({ symbol, title }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const symbolUrl = `https://www.tradingview.com/symbols/${encodeURIComponent(symbol.replace(":", "-"))}/`;

  useEffect(() => {
    const root = host.current;
    if (!root || !loaded) return;
    root.replaceChildren();
    if (!/^[A-Z0-9._:-]{1,48}$/i.test(symbol)) return;
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "100%";
    widget.style.width = "100%";
    root.appendChild(widget);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true, symbol, interval: "D", timezone: "Europe/Istanbul", theme: "light",
      style: "1", locale: "tr", backgroundColor: "#ffffff", gridColor: "rgba(20, 55, 90, 0.07)",
      hide_top_toolbar: false, hide_legend: false, hide_side_toolbar: true,
      allow_symbol_change: false, calendar: false, details: false, hotlist: false,
      withdateranges: true, save_image: false, hide_volume: false,
      support_host: "https://www.tradingview.com",
    });
    root.appendChild(script);
    return () => root.replaceChildren();
  }, [symbol, loaded]);

  return (
    <section className="tv-chart-section" aria-label={`${title} TradingView grafiği`}>
      <div className="tv-chart-heading">
        <h2>{title} canlı grafik</h2>
        <div className="tv-chart-actions">
          {loaded && <button type="button" className="tv-chart-consent-button" onClick={() => setLoaded(false)}>Grafiği kaldır</button>}
          <a href={symbolUrl} target="_blank" rel="noopener noreferrer nofollow">TradingView&apos;de aç ↗</a>
        </div>
      </div>
      {loaded ? (
        <div className="tradingview-widget-container tv-chart" ref={host} />
      ) : (
        <div className="tv-chart tv-chart-placeholder" role="group" aria-label="TradingView grafiği yükleme seçenekleri">
          <p>Grafiği yüklediğinizde TradingView&apos;e bağlanılır ve bazı teknik veriler sağlayıcıya iletilebilir.</p>
          <button type="button" className="tv-chart-consent-button" onClick={() => setLoaded(true)}>
            TradingView grafiğini yükle
          </button>
        </div>
      )}
      <p className="tv-chart-note">Grafik TradingView tarafından sağlanır. Piyasa verileri borsa ve veri sağlayıcısına göre gecikmeli olabilir.</p>
    </section>
  );
}
