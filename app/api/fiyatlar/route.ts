import { yahooDailyPrev } from "@/lib/market";
import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

async function getTCMB(){
  try{
    const res=await fetch("https://www.tcmb.gov.tr/kurlar/today.xml",{next:{revalidate:300}});
    const xml=await res.text();
    const p=new XMLParser({ignoreAttributes:false,attributeNamePrefix:"@_"});
    const data=p.parse(xml);
    const kurlar=data?.Tarih_Date?.Currency||[];
    const find=(code:string)=>{const k=kurlar.find((c:Record<string,string>)=>c["@_CurrencyCode"]===code);return k?{alis:parseFloat(k.ForexBuying),satis:parseFloat(k.ForexSelling)}:null;};
    return{usd:find("USD"),eur:find("EUR"),gbp:find("GBP")};
  }catch{return{};}
}

async function getYahooHistory(symbol: string) {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=7d`, { next: { revalidate: 300 } });
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    const sparkline = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter((v: number | null): v is number => v != null) || [];
    const prev = yahooDailyPrev(meta, sparkline);
    const pct = prev ? ((price - prev) / prev) * 100 : 0;
    return { pct, sparkline };
  } catch {
    return { pct: 0, sparkline: [] };
  }
}

async function getBist(){
  try{
    const res=await fetch("https://query1.finance.yahoo.com/v8/finance/chart/XU100.IS?interval=1d&range=7d",{next:{revalidate:120}});
    const data=await res.json();const meta=data?.chart?.result?.[0]?.meta;if(!meta)return null;
    const sparkline = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter((v: number | null): v is number => v != null) || [];
    const price=meta.regularMarketPrice,prev=yahooDailyPrev(meta, sparkline);
    return{price,pct:prev?((price-prev)/prev)*100:0,sparkline};
  }catch{return null;}
}

async function getBtc(){
  try{
    const res=await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=try&include_24hr_change=true",{next:{revalidate:60}});
    const data=await res.json();const btc=data?.bitcoin;if(!btc)return null;
    return{price:btc.try,pct:btc.try_24h_change};
  }catch{return null;}
}

async function getGold(usdTry: number | null){
  try{
    const res=await fetch("https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=7d",{next:{revalidate:300}});
    const data=await res.json();const meta=data?.chart?.result?.[0]?.meta;if(!meta)throw new Error("no data");
    const priceUsd=meta.regularMarketPrice;
    const sparklineUsd = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter((v: number | null): v is number => v != null) || [];
    const prevUsd=yahooDailyPrev(meta, sparklineUsd);
    if(usdTry && priceUsd){
      const gramTry=(priceUsd/31.1035)*usdTry;
      const prevGramTry=prevUsd?(prevUsd/31.1035)*usdTry:null;
      const sparkline = sparklineUsd.map((p: number) => (p / 31.1035) * usdTry);
      return{
        price:Math.round(gramTry*100)/100,
        pct:prevGramTry?((gramTry-prevGramTry)/prevGramTry)*100:prevUsd?((priceUsd-prevUsd)/prevUsd)*100:0,
        sparkline
      };
    }
    return null;
  }catch{
    try{
      const res=await fetch("https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=usd,try&include_24hr_change=true",{next:{revalidate:120}});
      const data=await res.json();const xaut=data?.["tether-gold"];if(!xaut)return null;
      const tryRate=usdTry||xaut.try/xaut.usd;
      const gramTry=(xaut.usd/31.1035)*tryRate;
      return{price:Math.round(gramTry*100)/100,pct:xaut.try_24h_change||xaut.usd_24h_change||0,sparkline:[]};
    }catch{return null;}
  }
}

export async function GET(){
  const tcmb=await getTCMB();
  const usdTry=tcmb?.usd?.satis||null;
  const [bist,btc,gold,usdData,eurData]=await Promise.all([
    getBist(),
    getBtc(),
    getGold(usdTry),
    getYahooHistory("USDTRY=X"),
    getYahooHistory("EURTRY=X")
  ]);
  return NextResponse.json({
    tcmb,
    bist,
    btc,
    gold,
    usdHistory: usdData.sparkline,
    usdPct: usdData.pct,
    eurHistory: eurData.sparkline,
    eurPct: eurData.pct
  },{headers:{"Cache-Control":"s-maxage=60,stale-while-revalidate=30"}});
}
