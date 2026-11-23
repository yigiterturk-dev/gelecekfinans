# Bülten imzalı token uzunluk sınırı — 2026-11-23

Onay ve abonelikten çıkma token doğrulayıcıları HMAC hesaplamadan önce giriş
uzunluğunu sınırlamıyordu. Her iki doğrulayıcı artık 512 karakterden uzun
token'ları reddediyor. 254 karakterlik e-posta adresi üst sınırı ve mevcut
token biçimleri bu sınırın altında kalıyor.

Doğrulama: kaynak incelemesi ve `git diff --check`. Test veya build çalıştırılmadı.
