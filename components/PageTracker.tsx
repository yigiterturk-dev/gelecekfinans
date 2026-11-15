"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // /gomulu/* bir iframe içinde açılıyor; sayfa görüntüleme sayacını şişirmemeli.
    if (pathname.startsWith("/sys-k3m8p") || pathname.startsWith("/gomulu")) return;
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
