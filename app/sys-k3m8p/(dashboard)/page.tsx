import { prisma } from "@/lib/db";
import Link from "next/link";

function startOfIstanbulDay(now = new Date()): Date {
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => Number(dateParts.find((part) => part.type === type)?.value);
  const localMidnightAsUtc = Date.UTC(value("year"), value("month") - 1, value("day"));
  const offsetLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    timeZoneName: "longOffset",
  }).formatToParts(now).find((part) => part.type === "timeZoneName")?.value;
  const offset = offsetLabel?.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  const offsetMinutes = offset
    ? (offset[1] === "+" ? 1 : -1) * (Number(offset[2]) * 60 + Number(offset[3] ?? 0))
    : 0;
  return new Date(localMidnightAsUtc - offsetMinutes * 60_000);
}

export default async function AdminDashboard() {
  const [total, published, draft, rejected, botRuns, subscriberCount, avgSeoResult, noLinkArticles, lowSeoArticles, todayViews] = await Promise.all([
    prisma.article.count(),
    prisma.article.count({ where: { status: "PUBLISHED" } }),
    prisma.article.count({ where: { status: "DRAFT" } }),
    prisma.article.count({ where: { status: "REJECTED" } }),
    prisma.botRun.findMany({ orderBy: { startedAt: "desc" }, take: 5 }),
    prisma.subscriber.count({ where: { active: true } }),
    prisma.article.aggregate({ where: { status: "PUBLISHED", seoScore: { not: null } }, _avg: { seoScore: true } }),
    prisma.$queryRaw<[{count: bigint}]>`SELECT COUNT(*) as count FROM "Article" WHERE status = 'PUBLISHED' AND content NOT LIKE '%href="/%'`,
    prisma.article.findMany({ where: { status: "PUBLISHED", seoScore: { lt: 60 } }, select: { id: true, title: true, seoScore: true, slug: true }, orderBy: { seoScore: "asc" }, take: 5 }),
    prisma.pageView.count({ where: { createdAt: { gte: startOfIstanbulDay() } } }),
  ]);

  const avgSeo = Math.round(avgSeoResult._avg.seoScore || 0);
  const noLinks = Number(noLinkArticles[0]?.count || 0);

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <h1 className="adm-h1">Genel Bakış</h1>
          <p className="adm-sub" style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>Sitenin verilerini ve içerik akışını buradan yönet</p>
        </div>
      </div>

      <div className="adm-stats">
        <StatCard label="Toplam Makale" value={total} />
        <StatCard label="Yayında" value={published} color="var(--up)" />
        <StatCard label="Taslak" value={draft} color="#d97706" />
        <StatCard label="Bugün Görüntüleme" value={todayViews} color="var(--accent)" />
      </div>

      <div className="adm-stats" style={{ marginBottom: 22 }}>
        <StatCard label="Ort. SEO Skoru" value={avgSeo} color={avgSeo >= 70 ? "var(--up)" : avgSeo >= 50 ? "#d97706" : "var(--dn)"} />
        <StatCard label="İç Linksiz Makale" value={noLinks} color={noLinks > 0 ? "var(--dn)" : "var(--up)"} />
        <StatCard label="Aboneler" value={subscriberCount} color="var(--accent)" />
        <StatCard label="Reddedilen" value={rejected} color="var(--dn)" />
      </div>

      {/* Low SEO Articles */}
      {lowSeoArticles.length > 0 && (
        <div className="adm-card" style={{ borderColor: "var(--dn-soft)" }}>
          <div className="adm-card-h">
            <div><b style={{ color: "var(--dn)" }}>Düşük SEO Skorlu Makaleler</b><small>Yayında ama optimizasyon gerekiyor</small></div>
          </div>
          <div className="adm-card-b" style={{ paddingTop: 4, paddingBottom: 6 }}>
            {lowSeoArticles.map(a => (
              <div key={a.id} className="adm-trow">
                <Link href={`/sys-k3m8p/makaleler/${a.id}`} style={{ fontSize: 13, color: "var(--ink2)", flex: 1 }}>
                  {a.title.slice(0, 60)}{a.title.length > 60 ? "..." : ""}
                </Link>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--dn)", marginLeft: 12, fontFamily: "var(--mono)" }}>{a.seoScore}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="adm-card">
        <div className="adm-card-h">
          <div><b>Son Bot Çalışmaları</b><small>Otomatik makale üretimi geçmişi</small></div>
        </div>
        <div className="adm-card-b">
          {botRuns.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13 }}>Henüz bot çalışması kaydı yok.</p>
          ) : (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Bulunan</th>
                  <th>Eklenen</th>
                  <th>Duplicate</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {botRuns.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{r.startedAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</td>
                    <td>{r.articlesFound}</td>
                    <td style={{ color: "var(--up)" }}>{r.articlesAdded}</td>
                    <td style={{ color: "#d97706" }}>{r.duplicatesSkipped}</td>
                    <td>{r.status === "completed" ? "✓" : "⏳"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="adm-stat">
      <div className="k">{label}</div>
      <div className="v" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}
