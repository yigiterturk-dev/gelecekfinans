"use client";
import { useEffect, useState } from "react";

interface BN { text: string; url?: string | null; }

function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export default function BreakingNews() {
  const [item, setItem] = useState<BN | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/breaking-news")
      .then((response) => response.ok ? response.json() : null)
      .then((data: unknown) => {
        if (!data || typeof data !== "object") return;
        const item = data as Record<string, unknown>;
        if (typeof item.text !== "string" || !item.text.trim()) return;
        setItem({ text: item.text.trim(), url: safeHref(item.url) });
      })
      .catch(() => {});
  }, []);

  if (!item || dismissed) return null;

  return (
    <div className="breaking-bar" role="status" aria-label="Son dakika haberi">
      <span className="breaking-badge">SON DAKİKA</span>
      {item.url ? (
        <a href={item.url} className="breaking-text">{item.text}</a>
      ) : (
        <span className="breaking-text">{item.text}</span>
      )}
      <button type="button" onClick={() => setDismissed(true)} className="breaking-close" aria-label="Son dakika haberini kapat">
        ×
      </button>
    </div>
  );
}
