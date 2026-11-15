"use client";
import { useState } from "react";
import { embedCode, type EmbedTool } from "@/lib/embed-tools";

/** Gömme kodunu tek tıkla kopyalatan kutu. */
export default function EmbedCode({ tool }: { tool: EmbedTool }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const code = embedCode(tool);
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="embed-code">
      <pre><code>{embedCode(tool)}</code></pre>
      <button type="button" className="btn" onClick={copy}>
        {copied ? "Kopyalandı ✓" : "Kodu kopyala"}
      </button>
    </div>
  );
}
