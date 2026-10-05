import Link from "next/link";
import SafeImage from "@/components/SafeImage";
import { publicImageUrl } from "@/lib/image-url";
import type { ArticleListItem } from "@/lib/types";

export const CATS: Record<string, {l:string;c:string}> = {
  kripto: {l:"KRİPTO",c:"#d97706"},
  borsa:  {l:"BORSA", c:"#16a34a"},
  doviz:  {l:"DÖVİZ", c:"#2563eb"},
  altin:  {l:"ALTIN", c:"#b45309"},
  ekonomi:{l:"EKONOMİ",c:"#475569"},
};

/**
 * Kategori rengi CSS değişkeninden okunur, bileşene gömülü hex'ten değil.
 * Gömülü renkler yalnızca açık zemin için seçilmişti ve koyu temada rozetin
 * kontrastı 2,34:1'e düşüyordu (WCAG AA küçük metin için 4,5 ister).
 * Değişken bulunamazsa eski hex devreye girer; bilinmeyen kategori bozulmaz.
 */
export function catColor(cat: string, fallback: string): string {
  return CATS[cat] ? `var(--cat-${cat}, ${fallback})` : fallback;
}

function Badge({cat}:{cat:string}){
  const c=CATS[cat]??{l:cat.toUpperCase(),c:"#6b6b78"};
  const color=catColor(cat,c.c);
  return <span className="badge" style={{background:`color-mix(in oklab, ${color} 20%, transparent)`,color}}>{c.l}</span>;
}
export function Ago(d:string){
  const s=(Date.now()-new Date(d).getTime())/1000;
  if(s<3600)return`${Math.floor(s/60)} dk`;
  if(s<86400)return`${Math.floor(s/3600)} sa`;
  return new Date(d).toLocaleDateString("tr-TR",{day:"numeric",month:"short",year:"numeric"});
}

function ViewCount({n}:{n?:number}){
  if(!n || n < 1) return null;
  const txt = n >= 1000 ? `${(n/1000).toFixed(1).replace(".0","")}K` : String(n);
  return <span style={{fontSize:10,color:"#999"}}>&#128065; {txt}</span>;
}

export function HeroCard({article}:{article:ArticleListItem}){
  const img=publicImageUrl(article.imageUrl);
  return(
    <Link href={`/${article.slug}`} className="hero-editorial">
      <div className="hero-text-col">
        <div>
          <div className="hero-eyebrow">
            <Badge cat={article.category}/>
          </div>
          <h2 className="hero-headline">{article.title}</h2>
          <p className="hero-desc">{article.meta}</p>
        </div>
        <div className="hero-meta">
          <span>{Ago(article.created_at)}</span>
          <ViewCount n={article.views}/>
        </div>
      </div>
      <div className="hero-img-col">
        {img
          ? <SafeImage src={img} alt={article.title} fill sizes="480px" style={{objectFit:"cover"}} priority />
          : <div style={{width:"100%",height:"100%",background:"var(--surface2)",minHeight:380}}/>
        }
      </div>
    </Link>
  );
}

export function StripCard({article}:{article:ArticleListItem}){
  const img=publicImageUrl(article.imageUrl);
  return(
    <Link href={`/${article.slug}`} className="strip-card">
      {img
        ? <div style={{overflow:"hidden",borderRadius:"var(--radius)",marginBottom:14,position:"relative",aspectRatio:"16/9"}}>
            <SafeImage src={img} alt={article.title} fill sizes="(max-width:768px) 100vw, 33vw" className="strip-card-img" style={{objectFit:"cover"}} />
          </div>
        : <div style={{width:"100%",aspectRatio:"16/9",background:"var(--surface2)",borderRadius:"var(--radius)",marginBottom:14}}/>
      }
      <div style={{display:"flex",flexDirection:"column",gap:9}}>
        <span style={{display:"inline-block",width:"fit-content"}}><Badge cat={article.category}/></span>
        <h3 className="strip-card-title" style={{margin:0,lineHeight:1.34}}>{article.title}</h3>
        <p className="strip-card-meta" style={{margin:0}}>{Ago(article.created_at)} <ViewCount n={article.views}/></p>
      </div>
    </Link>
  );
}

export function MedCard({article}:{article:ArticleListItem}){
  const img=publicImageUrl(article.imageUrl);
  return(
    <Link href={`/${article.slug}`} className="grid-card">
      {img
        ? <div style={{overflow:"hidden",position:"relative",aspectRatio:"16/9"}}>
            <SafeImage src={img} alt={article.title} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw" className="grid-card-img" style={{objectFit:"cover"}} />
          </div>
        : <div style={{width:"100%",aspectRatio:"16/9",background:"var(--surface2)"}}/>
      }
      <div className="grid-card-body" style={{padding:"16px 16px 18px",display:"flex",flexDirection:"column",gap:8}}>
        <span style={{display:"inline-block",width:"fit-content"}}><Badge cat={article.category}/></span>
        <h3 className="grid-card-title" style={{margin:0,lineHeight:1.38}}>{article.title}</h3>
        <p className="grid-card-meta" style={{margin:0}}>{Ago(article.created_at)} <ViewCount n={article.views}/></p>
      </div>
    </Link>
  );
}

export function RankedCard({article,index,last=false}:{article:ArticleListItem;index:number;last?:boolean}){
  const img=publicImageUrl(article.imageUrl);
  const c=CATS[article.category];
  // Boşluklar inline → Tailwind/CSS düşse bile satırlar dip dibe olmaz.
  return(
    <Link
      href={`/${article.slug}`}
      className="ranked-row"
      style={{
        display:"flex",
        gap:14,
        alignItems:"flex-start",
        padding:"14px 0",
        borderBottom:last?"none":"1px solid var(--border)",
        textDecoration:"none",
      }}
    >
      <span className="ranked-n" style={{flexShrink:0,width:26,fontFamily:"var(--mono)",fontSize:22,fontWeight:700,lineHeight:1,color:"var(--accent)",opacity:.35,fontVariantNumeric:"tabular-nums"}}>{index+1}</span>
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:5}}>
        {c&&<span style={{fontFamily:"var(--mono)",fontSize:10,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",color:catColor(article.category,c.c)}}>{c.l}</span>}
        <p className="ranked-row-title" style={{margin:0,lineHeight:1.45}}>{article.title}</p>
        <p className="ranked-row-meta" style={{margin:0}}>{Ago(article.created_at)} <ViewCount n={article.views}/></p>
      </div>
      {img&&<div style={{width:56,height:42,borderRadius:4,overflow:"hidden",flexShrink:0,position:"relative"}}>
        <SafeImage src={img} alt={article.title} fill sizes="56px" style={{objectFit:"cover"}} />
      </div>}
    </Link>
  );
}

export default function ArticleCard({article,big=false}:{article:ArticleListItem;big?:boolean}){
  return big?<HeroCard article={article}/>:<MedCard article={article}/>;
}
