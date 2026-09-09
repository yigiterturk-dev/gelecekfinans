"use client";
import { useState } from "react";
import { MedCard, CATS } from "./ArticleCard";
import type { ArticleListItem } from "@/lib/types";

export default function HomeFeed({ articles }: { articles: ArticleListItem[] }) {
  const [active, setActive] = useState<string | null>(null);
  const filtered = active ? articles.filter(a => a.category === active) : articles;
  return (
    <>
      <div className="cat-tabs">
        <button className={`cat-tab${!active?" on":""}`} onClick={()=>setActive(null)}>Tümü</button>
        {Object.entries(CATS).map(([k,v])=>(
          <button key={k} className={`cat-tab${active===k?" on":""}`}
            style={active===k?{background:v.c,borderColor:v.c}:{}}
            onClick={()=>setActive(active===k?null:k)}>{v.l}</button>
        ))}
      </div>
      <div className="resp-grid-4">
        {filtered.slice(0,20).map(a=><MedCard key={a.filename} article={a}/>)}
      </div>
    </>
  );
}
