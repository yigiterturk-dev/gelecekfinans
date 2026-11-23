"use client";
import { Fragment, useEffect, useState } from "react";
import CoinGeckoAttribution from "@/components/CoinGeckoAttribution";
interface Coin{symbol:string;current_price:number;price_change_percentage_24h:number|null;image:string;last_updated?:string|null;}
export default function CryptoTicker(){
  const [coins,setCoins]=useState<Coin[]>([]);
  const [paused,setPaused]=useState(false);
  useEffect(()=>{
    let active=true;
    let timer:ReturnType<typeof setTimeout>|undefined;
    let controller:AbortController|undefined;
    const go=async()=>{
      controller=new AbortController();
      try{
        const response=await fetch("/api/kripto",{signal:controller.signal});
        if(!response.ok)throw new Error("Kripto fiyatı isteği başarısız");
        const data:unknown=await response.json();
        if(active&&Array.isArray(data))setCoins(data as Coin[]);
      }catch{
        // Son başarılı fiyatları koru ve hatada tekrar dene.
      }finally{
        if(active)timer=setTimeout(()=>void go(),60000);
      }
    };
    void go();
    return()=>{active=false;if(timer)clearTimeout(timer);controller?.abort();};
  },[]);
  if(!coins.length)return null;
  const items=[...coins,...coins];
  return(
    <div className="ticker-wrap" role="region" aria-label="Canlı kripto fiyatları">
      <div className={`ticker-belt${paused?" paused":""}`}>
        {items.map((c,i)=>{
          const pct=typeof c.price_change_percentage_24h === "number" && Number.isFinite(c.price_change_percentage_24h)
            ? c.price_change_percentage_24h
            : null;
          const up=pct !== null && pct>0;
          const price=c.current_price>=1000
            ?c.current_price.toLocaleString("tr-TR",{maximumFractionDigits:0})
            :c.current_price.toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:4});
          return(
            <Fragment key={i}>
            <div className="ticker-item" aria-hidden={i >= coins.length ? true : undefined}>
              {/* 14px canlı ticker ikonlarında optimizer isteği görselden daha pahalıdır. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {c.image && <img src={c.image} alt="" loading="lazy" width={14} height={14} style={{width:14,height:14,borderRadius:"50%"}}/>}
              <span className="t-sym">{c.symbol}</span>
              <span className="t-price">₺{price}</span>
              {pct === null
                ? <span className="t-na" aria-label="24 saatlik değişim mevcut değil">—</span>
                : pct === 0
                  ? <span className="t-na" aria-label="24 saatlik değişim yok">0.00%</span>
                  : <span className={up?"t-up":"t-dn"}>{up?"+":""}{pct.toFixed(2)}%</span>}
            </div>
            {(i + 1) % coins.length === 0 && <CoinGeckoAttribution className="ticker-credit" />}
            </Fragment>
          );
        })}
      </div>
      <button
        type="button"
        className="ticker-motion-toggle"
        aria-pressed={paused}
        onClick={() => setPaused(value => !value)}
      >
        {paused ? "Kaydırmayı sürdür" : "Kaydırmayı durdur"}
      </button>
    </div>
  );
}
