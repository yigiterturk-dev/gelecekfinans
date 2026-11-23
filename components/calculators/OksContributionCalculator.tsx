"use client";
import { useState } from "react";

const YEARLY_CAP = 396_360;
const CONTRIBUTION_RATE = 0.20;
const INITIAL_BONUS = 500;
const INPUT_MAX = 1_000_000_000_000;
const fmt = (v: number) => "₺" + v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function OksContributionCalculator() {
  const [contribution, setContribution] = useState("10000");
  const [carryoverAmount, setCarryoverAmount] = useState("");
  const [initialPeriodStatus, setInitialPeriodStatus] = useState("unknown");
  const paid = Number(contribution);
  const carryover = Number(carryoverAmount || "0");
  const totalBasis = paid + carryover;
  const valid = contribution.trim() !== "" && Number.isFinite(paid) && paid >= 0 && paid <= INPUT_MAX &&
    Number.isFinite(carryover) && carryover >= 0 && carryover <= INPUT_MAX && Number.isFinite(totalBasis);
  const included = valid ? Math.min(totalBasis, YEARLY_CAP) : 0;
  const contributionGrant = included * CONTRIBUTION_RATE;
  const initialBonus = initialPeriodStatus === "yes" ? INITIAL_BONUS : initialPeriodStatus === "no" ? 0 : null;
  const initialBonusDisplay = initialPeriodStatus === "pending" ? "Henüz belli değil"
    : initialBonus === null ? "Durum seçilmedi" : fmt(initialBonus);

  return (
    <div className="calc-box">
      <div className="calc-row">
        <label className="calc-field">
          <span>2026’da aynı katılımcının tüm OKS sözleşmelerinde tahsil edilen katkı (₺)</span>
          <input type="number" inputMode="decimal" min={0} max={INPUT_MAX} step="any" value={contribution}
            onChange={(e) => setContribution(e.target.value)} aria-label="2026 yılında aynı katılımcının tüm OKS sözleşmelerinde tahsil edilen katkı payı" />
        </label>
        <label className="calc-field">
          <span>Önceki yıllardan 2026’ya devreden katkı (₺, biliyorsanız)</span>
          <input type="number" inputMode="decimal" min={0} max={INPUT_MAX} step="any" value={carryoverAmount}
            onChange={(e) => setCarryoverAmount(e.target.value)} aria-label="Önceki yıllardan 2026 yılına devreden uygun OKS katkı payı" />
        </label>
      </div>
      <label className="calc-field" style={{ marginTop: 14 }}>
        <span>500 TL başlangıç katkısı uygunluk durumu</span>
        <select value={initialPeriodStatus} onChange={(e) => setInitialPeriodStatus(e.target.value)} aria-label="500 TL OKS başlangıç devlet katkısı uygunluk durumu">
          <option value="unknown">Seçin</option>
          <option value="yes">Bu katılımcı için henüz hesaplanmadı; başlangıç dönemi sonunda sistemde kaldım</option>
          <option value="no">Dönem sonunda kalmadım veya daha önce hesaplandı</option>
          <option value="pending">Başlangıç dönemi henüz tamamlanmadı</option>
        </select>
      </label>
      <p className="conv-muted" style={{ marginTop: 10 }}>
        Hesap tek bir katılımcı içindir. Tüm OKS sözleşmelerini toplayın. 500 TL başlangıç katkısı katılımcı için tek seferliktir; geçmişteki çıkış veya yeniden katılım durumları uygunluğu etkileyebilir.
      </p>
      <section className="calc-result" aria-labelledby="oks-contribution-result">
        <h2 className="market-h2" id="oks-contribution-result">2026 OKS devlet katkısı taahhüdü tahmini</h2>
        <div className="calc-result-grid" aria-live="polite">
          {!valid ? <span className="conv-muted">Sıfır veya daha büyük geçerli katkı tutarları girin.</span> : <>
            <div><span className="calc-result-lbl">Yıllık Tavana Dahil Edilen Katkı</span><strong>{fmt(included)}</strong></div>
            <div><span className="calc-result-lbl">Katkıya Bağlı Devlet Katkısı</span><strong className="calc-out">{fmt(contributionGrant)}</strong></div>
            <div><span className="calc-result-lbl">Yıllık Tavan İçin Kalan</span><strong>{fmt(Math.max(0, YEARLY_CAP - included))}</strong></div>
            {totalBasis > YEARLY_CAP && <div><span className="calc-result-lbl">Sonraki Yıla Devreden Aşım</span><strong>{fmt(totalBasis - YEARLY_CAP)}</strong></div>}
            <div><span className="calc-result-lbl">İki Ay Sonu İlave Devlet Katkısı</span><strong>{initialBonusDisplay}</strong></div>
            {initialBonus !== null && <div><span className="calc-result-lbl">Tahmini Toplam Taahhüt</span><strong className="calc-out">{fmt(contributionGrant + initialBonus)}</strong></div>}
          </>}
        </div>
      </section>
      <p className="conv-note">
        2026’da OKS katkılarına %20 oran ve kişi başına {fmt(YEARLY_CAP)} yıllık katkı payı tavanı uygulanır. İki aylık başlangıç dönemi sonunda sistemde kalma ve daha önce bu katkının hesaplanmamış olması koşullarını sağlayan katılımcı için {fmt(INITIAL_BONUS)} ilave devlet katkısı yıllık tavana dahil değildir. Tüm OKS sertifikalarını sonlandırıp sistemden çıkan katılımcı yeniden girdiğinde bu tutardan yararlanamaz; cayma kullanıp daha önce tutarı hesaplanmamış olanlar için yeniden katılım istisnası bulunur.
        OKS’de devlet katkısı taahhüt olarak kaydedilir ve hak ediş koşullarına bağlıdır; tutar hemen nakden ödenmiş sayılmaz. 10 yıl ve üzeri yıllık gelir sigortası seçimine bağlı ilave katkı, fon getirileri, kesintiler ve hak ediş hesabı burada yoktur. <a href="https://www.egm.org.tr/otomatik-katilim/devlet-katkisi/" target="_blank" rel="noopener noreferrer">EGM OKS devlet katkısı oran ve tavanını</a> ve <a href="https://www.egm.org.tr/calisanlar/calisan-bilgilendirme-rehberi/" target="_blank" rel="noopener noreferrer">başlangıç katkısı uygunluk koşullarını</a> kontrol edin.
      </p>
    </div>
  );
}
