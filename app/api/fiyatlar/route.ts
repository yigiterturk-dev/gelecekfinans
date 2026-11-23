import { getAllGold, yahooDailyPrev } from "@/lib/market";
import { parseDecimalInput } from "@/lib/parse-decimal-input";
import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

const CACHE_HEADERS={"Cache-Control":"s-maxage=60,stale-while-revalidate=30"};
const ERROR_HEADERS={"Cache-Control":"no-store"};

function emptyTCMB(){
  return{source:"TCMB",usd:null,eur:null,gbp:null};
}

async function getTCMB(){
  try{
    const res=await fetch("https://www.tcmb.gov.tr/kurlar/today.xml",{next:{revalidate:300},signal:AbortSignal.timeout(8000)});
    if(!res.ok)return emptyTCMB();
    const xml=await res.text();
    const p=new XMLParser({ignoreAttributes:false,attributeNamePrefix:"@_"});
    const data=p.parse(xml);
    const kurlar=data?.Tarih_Date?.Currency||[];
    const find=(code:string)=>{
      const k=kurlar.find((c:Record<string,string>)=>c["@_CurrencyCode"]===code);
      if(!k)return null;
      const alis=parseDecimalInput(k.ForexBuying);
      const satis=parseDecimalInput(k.ForexSelling);
      return Number.isFinite(alis)&&alis>0&&Number.isFinite(satis)&&satis>0?{alis,satis}:null;
    };
    return{source:"TCMB",usd:find("USD"),eur:find("EUR"),gbp:find("GBP")};
  }catch{return emptyTCMB();}
}

async function getBist(){
  try{
    const res=await fetch("https://query1.finance.yahoo.com/v8/finance/chart/XU100.IS?interval=1d&range=7d",{
      next:{revalidate:120},
      signal:AbortSignal.timeout(8000),
      headers:{Accept:"application/json","User-Agent":"Mozilla/5.0 (compatible; GelecekFinans/1.0)"},
    });
    if(!res.ok)return null;
    const data=await res.json();const meta=data?.chart?.result?.[0]?.meta;if(!meta)return null;
    const sparkline = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter((v: number | null): v is number => typeof v === "number" && Number.isFinite(v) && v > 0) || [];
    const price=meta.regularMarketPrice;
    if(typeof price!=="number"||!Number.isFinite(price)||price<=0)return null;
    const prev=yahooDailyPrev(meta, sparkline);
    const updatedAt=typeof meta.regularMarketTime==="number"&&Number.isFinite(meta.regularMarketTime)?new Date(meta.regularMarketTime*1000).toISOString():null;
    return{price,pct:prev?((price-prev)/prev)*100:null,sparkline,source:"Yahoo Finance",updatedAt};
  }catch{return null;}
}

async function getBtc(){
  try{
    const res=await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=try&include_24hr_change=true&include_last_updated_at=true",{next:{revalidate:60},signal:AbortSignal.timeout(8000),headers:{Accept:"application/json"}});
    if(!res.ok)return null;
    const data=await res.json();const btc=data?.bitcoin;if(!btc)return null;
    if(typeof btc.try!=="number"||!Number.isFinite(btc.try)||btc.try<=0)return null;
    const pct=typeof btc.try_24h_change==="number"&&Number.isFinite(btc.try_24h_change)?btc.try_24h_change:null;
    const updatedAt=typeof btc.last_updated_at==="number"&&Number.isFinite(btc.last_updated_at)?new Date(btc.last_updated_at*1000).toISOString():null;
    return{price:btc.try,pct,updatedAt};
  }catch{return null;}
}

export async function GET(){
  const tcmbPromise = getTCMB();
  const [tcmb,bist,btc,gold]=await Promise.all([
    tcmbPromise,
    getBist(),
    getBtc(),
    getAllGold()
  ]);
  const gramGold = gold["gram-altin"];
  const hasUsablePrice = [
    tcmb?.usd?.satis,
    tcmb?.eur?.satis,
    tcmb?.gbp?.satis,
    bist?.price,
    btc?.price,
    gramGold?.price,
  ].some((value) => typeof value === "number" && Number.isFinite(value) && value > 0);
  return NextResponse.json({
    tcmb,
    bist,
    btc: btc ? { ...btc, source: "CoinGecko" } : null,
    gold: gramGold ? {
      price: gramGold.price,
      pct: gramGold.changePct,
      sparkline: [],
      source: "GelecekFinans hesaplaması",
      updatedAt: gramGold.updatedAt ?? null,
    } : null,
  }, { status: hasUsablePrice ? 200 : 503, headers: hasUsablePrice ? CACHE_HEADERS : ERROR_HEADERS });
}
