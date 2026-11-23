"use client";
import { useState } from "react";

const YEARLY_CAP = 396_360;
const RATE = 0.20;
const fmt = (v: number) => "₺" + v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BesStateContributionCalculator() {
  const [amount, setAmount] = useState("10000");
  const [carryoverAmount, setCarryoverAmount] = useState("");
  const [stateBalance, setStateBalance] = useState("");
  const [systemYears, setSystemYears] = useState("");
  const paid = Number(amount);
  const carryover = Number(carryoverAmount || "0");
  const contributionBasis = paid + carryover;
  const valid = amount.trim() !== "" && Number.isFinite(paid) && paid >= 0 && paid <= 1_000_000_000_000 &&
    Number.isFinite(carryover) && carryover >= 0 && carryover <= 1_000_000_000_000 && Number.isFinite(contributionBasis);
  const eligible = valid ? Math.min(contributionBasis, YEARLY_CAP) : 0;
  const stateContribution = eligible * RATE;
  const balance = Number(stateBalance);
  const years = Number(systemYears);
  const vestingStarted = stateBalance.trim() !== "" || systemYears.trim() !== "";
  const vestingValid = stateBalance.trim() !== "" && systemYears.trim() !== "" &&
    Number.isFinite(balance) && balance >= 0 && balance <= 1_000_000_000_000 &&
    Number.isFinite(years) && years >= 0 && years <= 100;
  const vestingPercent = years >= 10 ? 60 : years >= 6 ? 35 : years >= 3 ? 15 : 0;
  const vestingRate = vestingPercent / 100;
  const balanceCents = vestingValid ? Math.round(balance * 100) : 0;
  const balanceAmount = balanceCents / 100;
  // EGM hak edilen nakit tutarı kuruş hassasiyetinde aşağı yuvarlar.
  const vestedEstimate = vestingValid ? Math.floor(balanceCents * vestingPercent / 100) / 100 : null;
  return (
    <div className="calc-box">
      <div className="calc-row">
        <label className="calc-field">
          <span>2026’da tüm gönüllü BES sözleşmelerinize katılımcı adına ödenen katkı (₺)</span>
          <input type="number" inputMode="decimal" min={0} max={1_000_000_000_000} step="any" value={amount}
            onChange={(e) => setAmount(e.target.value)} aria-label="2026 yılında tüm gönüllü BES sözleşmelerine katılımcı adına ödenen toplam katkı payı" />
        </label>
        <label className="calc-field">
          <span>Önceki yıllardan 2026’ya devreden katkı (₺, biliyorsanız)</span>
          <input type="number" inputMode="decimal" min={0} max={1_000_000_000_000} step="any" value={carryoverAmount}
            onChange={(e) => setCarryoverAmount(e.target.value)} aria-label="Önceki yıllardan 2026 yılına devreden uygun BES katkı payı" />
        </label>
      </div>
      <p className="conv-muted" style={{ marginTop: 10 }}>
        Hesap tek bir katılımcı içindir: aynı kişinin gönüllü BES sözleşmelerini toplayın, çocuk veya başka kişilerin sözleşmelerini ayrı hesaplayın.
      </p>
      <div className="calc-row">
        <label className="calc-field">
          <span>Devlet katkısı hesabınızdaki güncel tutar (₺)</span>
          <input type="number" inputMode="decimal" min={0} max={1_000_000_000_000} step="0.01" value={stateBalance}
            onChange={(e) => setStateBalance(e.target.value)} aria-label="Devlet katkısı hesabınızdaki güncel toplam tutar" />
        </label>
        <label className="calc-field">
          <span>Devlet katkısına esas sistem süresi (yıl)</span>
          <input type="number" inputMode="decimal" min={0} max={100} step="any" value={systemYears}
            onChange={(e) => setSystemYears(e.target.value)} aria-label="Devlet katkısına esas sistemde geçirilen yıl" />
        </label>
      </div>
      <p className="conv-muted" style={{ marginTop: 10 }}>
        Hak ediş hesabında toplam BES birikiminizi değil, BES Mobil veya e-Devlet’te görünen yalnızca devlet katkısı hesabı bakiyesini kuruş hassasiyetinde kullanın.
      </p>
      <section className="calc-result" aria-labelledby="bes-contribution-result">
        <h2 className="market-h2" id="bes-contribution-result">2026 devlet katkısı tahmini</h2>
        <div className="calc-result-grid" aria-live="polite">
          {!valid ? <span className="conv-muted">Sıfır veya daha büyük geçerli bir tutar girin.</span> : <>
            <div><span className="calc-result-lbl">Hesaba Katılan Katkı Payı</span><strong>{fmt(eligible)}</strong></div>
            <div><span className="calc-result-lbl">Tahmini Devlet Katkısı</span><strong className="calc-out">{fmt(stateContribution)}</strong></div>
            <div><span className="calc-result-lbl">Yıllık Tavan İçin Kalan</span><strong>{fmt(Math.max(0, YEARLY_CAP - eligible))}</strong></div>
            {contributionBasis > YEARLY_CAP && <div><span className="calc-result-lbl">Sonraki Yıla Devreden Aşım</span><strong>{fmt(contributionBasis - YEARLY_CAP)}</strong></div>}
          </>}
        </div>
      </section>
      {vestingStarted && <section className="calc-result" aria-labelledby="bes-vesting-result">
        <h2 className="market-h2" id="bes-vesting-result">Devlet katkısı hak ediş tahmini</h2>
        <div className="calc-result-grid" aria-live="polite">
          {!vestingValid || vestedEstimate === null ? (
            <span className="conv-muted">Hak ediş tahmini için güncel devlet katkısı tutarını ve sistem süresini geçerli biçimde girin.</span>
          ) : <>
            <div><span className="calc-result-lbl">Normal Ayrılmada Hak Ediş Oranı</span><strong>%{(vestingRate * 100).toLocaleString("tr-TR")}</strong></div>
            <div><span className="calc-result-lbl">Tahmini Hak Edilen Tutar</span><strong className="calc-out">{fmt(vestedEstimate)}</strong></div>
            <div><span className="calc-result-lbl">Hak Edilmeyen / Taahhütte Kalan</span><strong>{fmt(balanceAmount - vestedEstimate)}</strong></div>
          </>}
        </div>
      </section>}
      <p className="conv-note">
        2026’da %20 oran ve {fmt(YEARLY_CAP)} yıllık tavan kişi başına, gönüllü BES sözleşmelerindeki uygun ödemelerin toplamına uygulanır.
        Katkıyı katılımcı yerine başka biri ödediyse de kapsama girebilir; ancak katılımcıyla arasında iş ilişkisi bulunmamalıdır.
        İşveren ödemeleri ve birikim transferleri dahil değildir. Önceki yıl devri varsa ikinci alana girin; boş bırakılması devir olmadığı varsayımıdır.
        Tavanı aşan uygun tutar devreder. OKS katkıları bu hesapta toplanmaz; BES ve OKS yıllık limitleri ayrıdır. Devlet katkısı,
        ödemenin şirket hesabına geçtiği ayı izleyen ay hesaba yatırılır. <a href="https://www.egm.org.tr/bireysel-emeklilik/devlet-katkisi/" target="_blank" rel="noopener noreferrer">EGM BES devlet katkısı bilgilerini</a> ve <a href="https://www.egm.org.tr/otomatik-katilim/oks--bes-karsilastirmasi/" target="_blank" rel="noopener noreferrer">BES–OKS limit karşılaştırmasını</a> kontrol edin.
        Hak ediş tahmini için BES hesabınızdaki güncel devlet katkısı bakiyesini ve hak edişe esas süreyi girin. Normal ayrılmada 3/6/10 yıl eşikleri uygulanır; emeklilik hakkıyla ayrılma, vefat veya maluliyette %100 hak ediş olabilir. Gerçek hak ve net ödeme emeklilik şirketinizin kaydına bağlıdır.
      </p>
    </div>
  );
}
