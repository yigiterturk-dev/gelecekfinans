const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
async function main() {
  const url = process.argv[2];
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(15000) });
  const html = await res.text();
  const tags = ["p", "li", "div", "td", "h2", "h3", "span"];
  for (const t of tags) {
    const n = (html.match(new RegExp(`<${t}\\b`, "gi")) || []).length;
    process.stdout.write(`${t}=${n} `);
  }
  console.log("");
  const blocks = [...html.matchAll(/<(p|li|td|h2|h3)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  console.log("blok sayısı:", blocks.length, "| 60+ karakter:", blocks.filter((b) => b.length >= 60).length);
  console.log("en uzun 3:", blocks.sort((a, b) => b.length - a.length).slice(0, 3).map((b) => b.slice(0, 160)));
}
main();
