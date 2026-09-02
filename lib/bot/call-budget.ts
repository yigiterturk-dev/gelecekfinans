/**
 * Koşum başına ücretli model çağrısı tavanı — ve tavanın SESSİZ olmaması.
 *
 * Neden ayrı bir birim: hakem kapısında tavan 8'di ve dolduğunda soru modele
 * hiç gitmeden "hayır" sayılıyordu. Kayıtlarda bu, hakemin konuyu REDDETMESİYLE
 * birebir aynı görünüyordu; darboğaz haftalarca "hakem fazla sıkı" diye yanlış
 * teşhis edildi. Ölçüm (2026-09-02): 112 sorunun 83'ü hiç sorulmamış.
 * Bu yüzden harcanan çağrı ile TAVAN YÜZÜNDEN ATLANAN soru ayrı sayılır.
 */
export class CallBudget {
  private remaining: number;
  private skippedCalls = 0;

  constructor(private readonly limit: number) {
    this.remaining = limit;
  }

  /** Koşum başında çağrılır; iki sayaç da sıfırlanır. */
  reset(): void {
    this.remaining = this.limit;
    this.skippedCalls = 0;
  }

  available(): boolean {
    return this.remaining > 0;
  }

  /** Bir çağrı hakkı düşer. Tavan dolmuşsa `false` döner ve hak düşmez. */
  take(): boolean {
    if (this.remaining <= 0) return false;
    this.remaining -= 1;
    return true;
  }

  /** Tavan dolduğu için sorulamayan bir soruyu kaydeder. */
  skip(): void {
    this.skippedCalls += 1;
  }

  used(): number {
    return this.limit - this.remaining;
  }

  skipped(): number {
    return this.skippedCalls;
  }
}
