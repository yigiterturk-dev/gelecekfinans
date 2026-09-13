import crypto from "node:crypto";
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(".env.local","utf8").split("\n").filter(l=>l.includes("=")&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");let v=l.slice(i+1).trim();if((v.startsWith('"')&&v.endsWith('"')))v=v.slice(1,-1);return [l.slice(0,i).trim(),v];}));
const b64=o=>Buffer.from(typeof o==="string"?o:JSON.stringify(o)).toString("base64url");
const now=Math.floor(Date.now()/1000);
const claim={iss:env.GSC_CLIENT_EMAIL,scope:"https://www.googleapis.com/auth/webmasters.readonly",aud:"https://oauth2.googleapis.com/token",exp:now+3600,iat:now};
const unsigned=`${b64({alg:"RS256",typ:"JWT"})}.${b64(claim)}`;
const sig=crypto.sign("RSA-SHA256",Buffer.from(unsigned),env.GSC_PRIVATE_KEY.replace(/\\n/g,"\n")).toString("base64url");
const tr=await (await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:`${unsigned}.${sig}`})})).json();
if(!tr.access_token){console.error("token hatası",tr);process.exit(1);}
const H={authorization:`Bearer ${tr.access_token}`,"content-type":"application/json"};
const sites=await (await fetch("https://searchconsole.googleapis.com/webmasters/v3/sites",{headers:H})).json();
console.log("ERİŞİM:",(sites.siteEntry??[]).map(s=>`${s.siteUrl} [${s.permissionLevel}]`).join("\n        "));
const d=n=>new Date(Date.now()-n*864e5).toISOString().slice(0,10);
const q=async(site,body)=>(await (await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,{method:"POST",headers:H,body:JSON.stringify(body)})).json());
for(const s of (sites.siteEntry??[]).map(x=>x.siteUrl)){
  console.log("\n=== "+s);
  for(const [lbl,a,b] of [["son28",d(30),d(3)],["önceki28",d(58),d(31)]]){
    const r=await q(s,{startDate:a,endDate:b,dimensions:[],type:"web"});
    const w=r.rows?.[0]; console.log(` ${lbl}: tık ${w?.clicks??0} | gös ${w?.impressions??0} | ort.sıra ${(w?.position??0).toFixed(1)}`);
  }
  const t=await q(s,{startDate:d(30),endDate:d(3),dimensions:["query"],rowLimit:6,type:"web"});
  console.log(" top sorgu:",(t.rows??[]).map(x=>`${x.keys[0]} (g${x.impressions}/t${x.clicks}/s${x.position.toFixed(0)})`).join(" · ")||"yok");
  const p=await q(s,{startDate:d(30),endDate:d(3),dimensions:["page"],rowLimit:5,type:"web"});
  console.log(" top sayfa:",(p.rows??[]).map(x=>`${x.keys[0].replace(/^https?:\/\/[^/]+/,"")} (g${x.impressions}/t${x.clicks})`).join(" · ")||"yok");
}
