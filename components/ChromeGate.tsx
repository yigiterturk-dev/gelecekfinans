"use client";
import { usePathname } from "next/navigation";

/**
 * Public site chrome'unu (Navbar, footer, ticker, son dakika) yalnızca
 * herkese-açık sayfalarda gösterir. /sys-k3m8p altındaki sayfalar (giriş + panel)
 * kendi standalone düzenini kullanır; bu yüzden orada chrome gizlenir.
 *
 * /gomulu/* ise başka sitelere iframe ile gömülen hesaplayıcıdır: menü, altbilgi,
 * ticker ve son dakika şeridi orada görünürse gömüldüğü sayfayı bozar.
 */
export default function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/sys-k3m8p") || pathname?.startsWith("/gomulu")) return null;
  return <>{children}</>;
}
