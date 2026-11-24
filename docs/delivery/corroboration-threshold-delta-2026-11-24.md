# Corroboration threshold delta — 24 November 2026

## Production-host RSS measurement

The RSS-only matcher ran from the production host using the production-source
parser and its fallback behavior. All 30 configured feeds fetched. The snapshot
contained 351 finance candidates and 311 unique topics.

| Gray-band floor | Topics with a judge candidate | Candidate pairs |
| --- | ---: | ---: |
| 0.20, current | 172 | 424 |
| 0.18 | 181 | 489 |
| 0.16 | 190 | 528 |

At 0.16, 18 more topics get a candidate and the total pair count rises by 104
(24.5%). This measurement made no model calls. The production floor and
two-publisher gate remain unchanged.

## Manually reviewed below-floor examples

At least two newly eligible pairs cover the same event:

- Cumhuriyet and Sözcü coverage of the SGK control-examination notice scored
  0.16. Both articles describe the same expert and control-examination event.
- Cumhuriyet and TRT Haber coverage of BDDK's credit-card minimum-payment
  decision scored 0.17. BDDK's register lists the 19 November 2026 decision;
  AA's account and TRT's story identify the same decision.

The same band also produces unrelated pairs, including an Agilent stock item
paired with a gold/Nvidia item, and an employment-cost item paired with a LEGO
factory story. These examples show a real recall gap and added noise; they are
not a complete precision sample. The global floor is not lowered on this
evidence.

## Targeted headline rescue

A second RSS snapshot fetched all 30 feeds and contained 350 finance candidates
across 311 unique topics. Instead of lowering the 0.20 floor, the gray-band
screen now allows a title score to rescue a pair only when title-token Jaccard
is at least 0.20 and title similarity is at least 0.40. The exact old and new
selectors were compared on the same snapshot:

| Selector | Topics with a judge candidate | Candidate pairs |
| --- | ---: | ---: |
| Existing combined-text rule | 171 | 420 |
| Targeted title rescue | 172 | 423 |

The extra topic is the BDDK credit-card minimum-payment decision; the Cumhuriyet
headline scores 0.41 against TRT Haber while combined text scores 0.17. Three
candidate pairs were added in total (about 0.7% over the old pair count). The
other two included a likely same-day fuel-price story and a weak central-bank
match, so these remain candidates for the same-event judge, not verified
sources. The floor stays at 0.20 and the two-publisher publication gate is
unchanged. The separate SGK pair still scores only 0.16 combined and has 0.06
title-token Jaccard, so this targeted change does not recover it; a global 0.16
floor would add roughly 25% more candidate pairs in the production-host
measurement above. No model calls were made during either RSS measurement.

Sources: [BDDK decision register](https://www.bddk.org.tr/Mevzuat/Liste/56),
[AA report on the BDDK decisions](https://www.aa.com.tr/tr/ekonomi/bddkden-kredi-kartlarina-ve-konut-kredilerine-iliskin-duzenleme/4132248),
[Cumhuriyet's card-payment report](https://www.cumhuriyet.com.tr/ekonomi/bddk-den-kredi-karti-karari-asgari-odeme-oranlari-degisti-2557882),
[TRT Haber's card-payment report](https://www.trthaber.com/haber/ekonomi/kredi-karti-asgari-odeme-oranlarina-ve-konut-kredilerine-duzenleme-963976.html),
[Cumhuriyet's SGK report](https://www.cumhuriyet.com.tr/ekonomi/sgk-uzmanindan-emeklilere-kritik-uyari-kontrol-muayenesini-kaciranin-maasi-kesilebilir-2558624),
and [Sözcü's SGK report](https://www.sozcu.com.tr/amp/sgk-nin-cagrisina-uymayanin-emekli-ayligi-kesilecek-p383560).


## Turkish pension wording rescue

The RSS summaries for the SGK pair were too short and dissimilar to clear the
combined-text floor. A narrow title signal maps Turkish inflections for
*emekli*, *aylık/maaş*, and *kesilme* to shared event concepts. It appends
matching publishers after the existing candidate order and fills only the
remaining three-candidate capacity; it does not displace candidates already
selected by the prior rules. The two-source gate remains in force, and the
matched candidate still goes to the same-event judge.

In a 30-feed RSS snapshot (349 finance candidates, 308 topics), the previous
combined and headline rules returned 169 topics / 417 pairs. The deployed
matcher returned 172 / 423. Compared with the immediately preceding title-only
rule, the pension wording signal added exactly 2 pairs across 1 newly eligible
SGK topic: Cumhuriyet and Sözcü coverage of the control-examination notice.
No other pair was added by that supplemental signal in this snapshot. Future
judge events now record which screening signal selected the candidate and the
title, combined-text, and pension-event scores. No model calls were made.
