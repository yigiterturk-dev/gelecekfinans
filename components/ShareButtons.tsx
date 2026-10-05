"use client";

import { useState } from "react";

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const encoded = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const buttons = [
    { label: "X", href: `https://x.com/intent/tweet?url=${encoded}&text=${encodedTitle}`, bg: "#000" },
    { label: "WhatsApp", href: `https://wa.me/?text=${encodedTitle}%20${encoded}`, bg: "#25d366" },
    { label: "Telegram", href: `https://t.me/share/url?url=${encoded}&text=${encodedTitle}`, bg: "#0088cc" },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`, bg: "#0a66c2" },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="share-row">
      {buttons.map(b => (
        <a key={b.label} href={b.href} target="_blank" rel="noopener noreferrer"
          className="share-btn" style={{ background: b.bg }} aria-label={`${b.label} ile paylaş`}>
          {b.label}
        </a>
      ))}
      <button onClick={copyLink} className="share-copy" type="button" aria-live="polite">
        {copied ? "Kopyalandı" : "Link Kopyala"}
      </button>
    </div>
  );
}
