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

## Fitur Keamanan yang Aktif (v0.1+)

- **Autentikasi Web UI & Setup Wizard**: Web UI dilindungi kata sandi admin yang di-hash dengan `scryptSync` (parameter N=16384, r=8, p=1) + salt kriptografis acak 16 byte (`node:crypto`). Sesi menggunakan bearer token berbasis session ID bertanda tangan waktu.
- **Verifikasi Owner Terproteksi**: Verifikasi nomor Owner dilakukan lewat challenge code 6-digit yang dikirim dari nomor WhatsApp Owner ke bot.
- **Redaksi Rahasia (Secret Scrubbing)**: Token API, password, dan nomor rahasia disaring (`[REDACTED]`) secara otomatis sebelum masuk ke log sistem atau audit log SQLite.
- **Isolasi Keputusan Izin**: Penegakan level risiko (L0, L1, L2) dan persetujuan aksi L1 sepenuhnya dieksekusi oleh `PermissionEngine` dan `ApprovalEngine` di level kode terisolasi; model AI tidak dapat mem-bypass atau mengesahkan tindakannya sendiri.
- **SSRF & Network Boundary Guard**: Panggilan keluar (seperti downloader atau fetch media) melewati pemeriksaan alamat IP privat dan loopback untuk mencegah SSRF ke jaringan internal server.

## Batasan dan Rekomendasi Pengoperasian

- **Adapter WhatsApp Live**: Memerlukan lingkungan Linux x64/arm64 karena implementasi kriptografi E2EE `onigis` (libsignal native prebuild). Di sistem Windows/macOS, gunakan container Docker berbasis Linux atau mode `mock` untuk pengujian lokal.
- **Kredensial Sesi WhatsApp**: Folder `data/whatsapp-auth` menyimpan kunci sesi terenkripsi WhatsApp. Lindungi hak akses direktori ini (`chmod 700`) dan jangan menyalinnya ke media yang tidak aman.
- **Privasi Penyedia AI**: Percakapan diproses oleh penyedia AI yang dikonfigurasi (OpenAI / Gemini / Ollama lokal). Pilih model self-hosted lokal (seperti Ollama / vLLM) jika memerlukan privasi penuh tanpa lalu lintas keluar server.
- **Prompt Injection**: Walaupun data percakapan dipisahkan dari instruksi sistem, keputusan eksekusi perintah dan tool WhatsApp selalu dibatasi oleh matriks RBAC dan Approval Engine. AI tidak memiliki hak administratif di luar apa yang diizinkan oleh sistem izin.

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
