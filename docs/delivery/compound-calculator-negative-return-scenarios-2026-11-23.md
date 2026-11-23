# Bileşik getiri aracında negatif senaryo desteği — 2026-11-23

Hesaplama aylık nominal oranla çalıştığı halde girdi doğrulaması yalnızca
sıfır ve üzerindeki getirileri kabul ediyordu. Aralık yıllık nominal −%100 ile
%1.000 olarak giriş alanına ve hesap kuralına birlikte eklendi. Böylece
kullanıcılar kayıp senaryolarını ve aylık ek yatırımla bu kayıpların birikime
etkisini de inceleyebilir; mevcut aylık bileşikleme ve ay sonu katkı zamanlaması
korunur.

Doğrulama: formül ve giriş sınırlarının kaynak incelemesi, `git diff --check`.
Test veya build çalıştırılmadı.
