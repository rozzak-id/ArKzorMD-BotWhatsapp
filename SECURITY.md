# Security Policy

## Versi yang didukung

Proyek masih pra-rilis (v0.1). Hanya branch `main` yang menerima perbaikan keamanan.

## Melaporkan kerentanan

**Jangan membuka issue publik.** Gunakan fitur *Report a vulnerability* / Security Advisory
pada repositori GitHub (private disclosure), atau hubungi maintainer secara langsung.
Sertakan:

- Versi/commit yang terdampak.
- Langkah reproduksi minimal.
- Dampak yang mungkin (mis. bypass approval, kebocoran secret, RCE).
- Saran perbaikan bila ada.

Kami berusaha merespons dalam 72 jam dan akan mengoordinasikan pengungkapan setelah
perbaikan tersedia.

## Model ancaman

ArKzorMD mengendalikan akun WhatsApp nyata. Aset yang dilindungi:

1. **Izin dan approval** — AI tidak boleh melewati `PermissionEngine` atau memutuskan
   approval sendiri.
2. **Secret** — API key, token, dan kredensial sesi tidak boleh muncul di prompt, log,
   audit, Web UI, atau balasan chat.
3. **Identitas Owner** — hanya JID Owner yang dikonfigurasi yang boleh menyetujui aksi L1.
4. **Privasi pesan** — isi pesan hanya boleh dikirim ke penyedia AI yang dipilih dan
   disimpan sesuai kebijakan retensi.
5. **Akun WhatsApp** — rate limit, jitter, dan humanizer menekan risiko pemblokiran.

## Batasan yang diketahui (v0.1)

- **Auth Web UI belum ada.** Jangan host API/Web UI ke publik. Default bind
  `127.0.0.1`. Akses publik harus lewat reverse proxy HTTPS dan akan tetap tidak aman
  sampai login M3 selesai.
- **Endpoint keputusan approval** memakai `ADMIN_TOKEN` sementara. Jika token kosong,
  endpoint mengembalikan 503. Gunakan token acak ≥ 16 karakter.
- **Adapter WhatsApp live memerlukan Linux x64/arm64.** Adapter memakai `onigis`; paket
  native E2EE tidak tersedia untuk Windows/macOS. Gunakan mode `mock` untuk pengembangan
  di platform tersebut, dan jangan pakai mock di produksi.
- **QR pairing adalah kredensial sementara.** Jangan membagikan screenshot QR atau isi
  folder `data/whatsapp-auth`; keduanya bisa dipakai untuk mengakses akun.
- **Executor approval belum rehidrasi setelah restart.** Request tetap tersimpan, tetapi
  eksekusi otomatis setelah restart belum diimplementasikan (M2).
- **Provider AI asli belum ada.** Hanya `MockProvider`; jangan menganggap jawaban mock
  sebagai perilaku produksi.
- **Prompt injection** dimitigasi dengan memisahkan data dan instruksi serta menegakkan
  izin di kode, tetapi tidak ada jaminan model tidak akan mencoba melewatinya. Keputusan
  akhir tetap di `PermissionEngine`.

## Praktik aman untuk pengguna

- Gunakan nomor WhatsApp khusus, bukan nomor utama.
- Jangan commit `.env`; gunakan `.env.example` sebagai templat.
- Batasi akses Web UI ke localhost atau VPN.
- Backup folder `data/` dengan aman; folder berisi sesi WhatsApp dan database.
- Tinjau audit log dan antrean approval secara berkala.
- Cabut aturan “setuju selalu” yang tidak lagi dipakai.
- Perbarui dependensi dan pin versi `onigis` setelah audit.

## Risiko pemblokiran WhatsApp

Proyek ini memakai protokol tidak resmi. Tidak ada jaminan akun aman. Rate limit,
humanizer, jam tenang, dan saran nomor khusus hanya mengurangi risiko, bukan menghilangkan.
Dengan memakai perangkat lunak ini, kamu menerima risiko tersebut.
