/**
 * Borsa İstanbul pay piyasası tatil günleri.
 *
 * 2026: Borsa İstanbul'un 04.12.2025 tarihli 41625 sayılı duyurusunun eki
 * "Pay Piyasası 2026 Yılı Tatil Tablosu" (borsaistanbul.com/resmi-tatil-gunleri).
 * 2027: Borsa İstanbul tablosu henüz yayımlanmadı. Tarihler 2429 sayılı Ulusal
 * Bayram ve Genel Tatiller Kanunu ile Diyanet'in 2027 dini günler takvimine göre
 * BEKLENEN günlerdir (`resmi: false`); tablo yayımlanınca resmîyle değiştirilir.
 *
 * Yalnızca hafta içine denk gelen günler listelenir: hafta sonu zaten seans yok.
 */

export type TatilTuru = "kapali" | "yarim";

export interface TatilGunu {
  date: string; // YYYY-MM-DD
  name: string;
  tur: TatilTuru;
  /** Resmî Borsa İstanbul tablosunda yer alıyor mu. */
  resmi: boolean;
  /** Resmî tablodaki takas notu (yalnız 2026). */
  takas?: string;
}

export const BIST_TATIL: TatilGunu[] = [
  // ── 2026 (resmî tablo) ──
  { date: "2026-01-01", name: "Yılbaşı", tur: "kapali", resmi: true, takas: "30 Aralık 2025 işlemlerinin takası 2 Ocak, 31 Aralık 2025 işlemlerinin takası 5 Ocak 2026'da yapıldı." },
  { date: "2026-03-19", name: "Ramazan Bayramı arifesi", tur: "yarim", resmi: true, takas: "19 Mart'ta takas yapılmaz. 17 Mart işlemlerinin takası 23 Mart'ta yapılır." },
  { date: "2026-03-20", name: "Ramazan Bayramı (1. gün)", tur: "kapali", resmi: true, takas: "18 ve 19 Mart işlemlerinin takası 24 Mart Salı günü yapılır." },
  { date: "2026-04-23", name: "Ulusal Egemenlik ve Çocuk Bayramı", tur: "kapali", resmi: true, takas: "21 Nisan işlemlerinin takası 24 Nisan, 22 Nisan işlemlerinin takası 27 Nisan'da yapılır." },
  { date: "2026-05-01", name: "Emek ve Dayanışma Günü", tur: "kapali", resmi: true, takas: "29 Nisan işlemlerinin takası 4 Mayıs, 30 Nisan işlemlerinin takası 5 Mayıs'ta yapılır." },
  { date: "2026-05-19", name: "Atatürk'ü Anma, Gençlik ve Spor Bayramı", tur: "kapali", resmi: true, takas: "15 Mayıs işlemlerinin takası 20 Mayıs, 18 Mayıs işlemlerinin takası 21 Mayıs'ta yapılır." },
  { date: "2026-05-26", name: "Kurban Bayramı arifesi", tur: "yarim", resmi: true, takas: "26 Mayıs'ta takas yapılmaz." },
  { date: "2026-05-27", name: "Kurban Bayramı (1. gün)", tur: "kapali", resmi: true, takas: "22 Mayıs işlemlerinin takası 1 Haziran'da yapılır." },
  { date: "2026-05-28", name: "Kurban Bayramı (2. gün)", tur: "kapali", resmi: true },
  { date: "2026-05-29", name: "Kurban Bayramı (3. gün)", tur: "kapali", resmi: true, takas: "25 ve 26 Mayıs işlemlerinin takası 2 Haziran Salı günü yapılır." },
  { date: "2026-07-15", name: "Demokrasi ve Milli Birlik Günü", tur: "kapali", resmi: true, takas: "13 Temmuz işlemlerinin takası 16 Temmuz, 14 Temmuz işlemlerinin takası 17 Temmuz'da yapılır." },
  { date: "2026-10-28", name: "Cumhuriyet Bayramı arifesi", tur: "yarim", resmi: true, takas: "28 Ekim'de takas yapılmaz. 26 Ekim işlemlerinin takası 30 Ekim'de yapılır." },
  { date: "2026-10-29", name: "Cumhuriyet Bayramı", tur: "kapali", resmi: true, takas: "27 ve 28 Ekim işlemlerinin takası 2 Kasım Pazartesi günü yapılır." },
  // ── 2027 (beklenen; Borsa İstanbul tablosu yayımlanınca güncellenecek) ──
  { date: "2027-01-01", name: "Yılbaşı", tur: "kapali", resmi: false },
  { date: "2027-03-08", name: "Ramazan Bayramı arifesi", tur: "yarim", resmi: false },
  { date: "2027-03-09", name: "Ramazan Bayramı (1. gün)", tur: "kapali", resmi: false },
  { date: "2027-03-10", name: "Ramazan Bayramı (2. gün)", tur: "kapali", resmi: false },
  { date: "2027-03-11", name: "Ramazan Bayramı (3. gün)", tur: "kapali", resmi: false },
  { date: "2027-04-23", name: "Ulusal Egemenlik ve Çocuk Bayramı", tur: "kapali", resmi: false },
  { date: "2027-05-17", name: "Kurban Bayramı (2. gün)", tur: "kapali", resmi: false },
  { date: "2027-05-18", name: "Kurban Bayramı (3. gün)", tur: "kapali", resmi: false },
  { date: "2027-05-19", name: "Kurban Bayramı (4. gün) ve Atatürk'ü Anma, Gençlik ve Spor Bayramı", tur: "kapali", resmi: false },
  { date: "2027-07-15", name: "Demokrasi ve Milli Birlik Günü", tur: "kapali", resmi: false },
  { date: "2027-08-30", name: "Zafer Bayramı", tur: "kapali", resmi: false },
  { date: "2027-10-28", name: "Cumhuriyet Bayramı arifesi", tur: "yarim", resmi: false },
  { date: "2027-10-29", name: "Cumhuriyet Bayramı", tur: "kapali", resmi: false },
];

/** Hafta sonuna denk geldiği için listede olmayan ama yıl özetinde anılan günler. */
export const HAFTA_SONU_TATIL: { date: string; name: string }[] = [
  { date: "2026-03-21", name: "Ramazan Bayramı (2. gün)" },
  { date: "2026-03-22", name: "Ramazan Bayramı (3. gün)" },
  { date: "2026-05-30", name: "Kurban Bayramı (4. gün)" },
  { date: "2026-08-30", name: "Zafer Bayramı" },
  { date: "2027-05-01", name: "Emek ve Dayanışma Günü" },
  { date: "2027-05-15", name: "Kurban Bayramı arifesi" },
  { date: "2027-05-16", name: "Kurban Bayramı (1. gün)" },
];

/** Verilen anın İstanbul takvimindeki tarihi (YYYY-MM-DD). */
export function istanbulDate(now: Date = new Date()): string {
  return now.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
}

function weekday(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay(); // 0 pazar, 6 cumartesi
}

export type GunDurumu =
  | { tur: "acik" }
  | { tur: "hafta-sonu" }
  | { tur: "kapali" | "yarim"; gun: TatilGunu };

export function gunDurumu(iso: string): GunDurumu {
  const t = BIST_TATIL.find((x) => x.date === iso);
  if (t) return { tur: t.tur, gun: t };
  const w = weekday(iso);
  if (w === 0 || w === 6) return { tur: "hafta-sonu" };
  return { tur: "acik" };
}

/** `iso` tarihinden (dahil) sonraki ilk tatil/yarım gün. */
export function siradakiTatil(iso: string): TatilGunu | null {
  return BIST_TATIL.find((x) => x.date >= iso) ?? null;
}

/** `iso`'dan sonraki ilk tam seans günü. */
export function sonrakiIslemGunu(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  for (let i = 0; i < 15; i++) {
    d.setUTCDate(d.getUTCDate() + 1);
    const s = d.toISOString().slice(0, 10);
    const g = gunDurumu(s);
    if (g.tur === "acik" || g.tur === "yarim") return s;
  }
  return iso;
}

export function trTarih(iso: string, gunAdi = true): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(gunAdi ? { weekday: "long" as const } : {}),
    timeZone: "UTC",
  });
}
