#!/usr/bin/env bash
# TÜFE/kira kısa videosu: Higgsfield arka plan klibi + EVDS rakamları (PIL katmanları + ffmpeg overlay).
# Kullanım: EVDS_API_KEY=... scripts/shorts/tufe-kira.sh arkaplan.mp4 cikti.mp4 [ornek_kira]
# Rakamlar her koşuda EVDS'ten (TP.GENENDEKS.T1) hesaplanır; tahmin yok.
# Not: Homebrew ffmpeg'de drawtext yok, bu yüzden yazılar PNG olarak çiziliyor.
set -euo pipefail
BG="$1"; OUT="$2"; KIRA="${3:-20000}"
: "${EVDS_API_KEY:?EVDS_API_KEY gerekli}"
TMP="$(mktemp -d)"
END="01-$(date +%m-%Y)"

curl -s -m 20 -H "key: $EVDS_API_KEY" \
  "https://evds3.tcmb.gov.tr/igmevdsms-dis/series=TP.GENENDEKS.T1&startDate=01-01-2023&endDate=$END&type=json" > "$TMP/evds.json"

python3 - "$TMP" "$KIRA" <<'PY'
import json, sys, os
from PIL import Image, ImageDraw, ImageFont
tmp, kira = sys.argv[1], float(sys.argv[2])
it = [(i["Tarih"], float(i["TP_GENENDEKS_T1"])) for i in json.load(open(os.path.join(tmp, "evds.json")))["items"] if i.get("TP_GENENDEKS_T1")]
v = [x[1] for x in it]
assert len(v) >= 25, "EVDS serisi kısa"
aylar = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"]
y, m = map(int, it[-1][0].split("-"))
yillik = (v[-1]/v[-13]-1)*100
tavan = (sum(v[-12:])/sum(v[-24:-12])-1)*100
yeni = kira*(1+tavan/100)
tr = lambda x, d=2: f"{x:,.{d}f}".replace(",", "X").replace(".", ",").replace("X", ".")

B = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
R = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
W, H = 1080, 1920
GOLD, WHITE = (255, 210, 74, 255), (255, 255, 255, 255)

def fit(font, size, text, maxw=980):
    f = ImageFont.truetype(font, size)
    while f.getlength(text) > maxw and size > 20:
        size -= 4; f = ImageFont.truetype(font, size)
    return f

def center(d, y, text, font, size, color):
    f = fit(font, size, text)
    w = f.getlength(text)
    x = (W - w) / 2
    d.text((x + 4, y + 4), text, font=f, fill=(0, 0, 0, 150))
    d.text((x, y), text, font=f, fill=color)

scenes = [
    (f"{aylar[m-1].replace('i', 'İ').upper()} {y} ENFLASYONU", f"%{tr(yillik)}", "yıllık TÜFE"),
    ("KİRA ARTIŞ TAVANI", f"%{tr(tavan)}", "12 aylık ortalama TÜFE · TBK 344"),
    (f"{tr(kira,0)} TL kira en fazla", f"{tr(yeni,0)} TL", "Kendi kiranı hesapla ↓"),
]
for i, (t, n, s) in enumerate(scenes):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((40, 600, W - 40, 1260), radius=40, fill=(0, 0, 0, 120))
    center(d, 660, t, B, 64, WHITE)
    center(d, 770, n, B, 230, GOLD)
    center(d, 1090, s, R, 50, WHITE)
    im.save(os.path.join(tmp, f"s{i}.png"))

im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
d.rounded_rectangle((240, 1470, W - 240, 1570), radius=50, fill=(255, 210, 74, 235))
f = fit(B, 52, "gelecekfinans.com", 560)
d.text(((W - f.getlength("gelecekfinans.com")) / 2, 1488), "gelecekfinans.com", font=f, fill=(20, 20, 20, 255))
center(d, 1790, "Kaynak: TÜİK, TCMB EVDS", R, 34, (255, 255, 255, 220))
im.save(os.path.join(tmp, "footer.png"))
print(" | ".join(x[1] for x in scenes), f"({it[-1][0]})")
PY

# sahne zamanları: 0-2.7, 2.7-5.4, 5.4-son
ffmpeg -y -loglevel error -i "$BG" \
  -loop 1 -i "$TMP/s0.png" -loop 1 -i "$TMP/s1.png" -loop 1 -i "$TMP/s2.png" -loop 1 -i "$TMP/footer.png" \
  -filter_complex "\
[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[bg];\
[1:v]format=rgba,fade=in:st=0.1:d=0.3:alpha=1[a];\
[2:v]format=rgba,fade=in:st=2.7:d=0.3:alpha=1[b];\
[3:v]format=rgba,fade=in:st=5.4:d=0.3:alpha=1[c];\
[bg][a]overlay=enable='lt(t,2.7)':shortest=1[v1];\
[v1][b]overlay=enable='between(t,2.7,5.4)':shortest=1[v2];\
[v2][c]overlay=enable='gte(t,5.4)':shortest=1[v3];\
[v3][4:v]overlay=shortest=1[out]" \
  -map "[out]" -c:v libx264 -pix_fmt yuv420p -crf 20 -r 30 -an "$OUT"
rm -rf "$TMP"
echo "OK $OUT"
