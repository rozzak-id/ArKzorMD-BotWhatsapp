# Changelog

Semua perubahan penting pada proyek **ArKzorMD** akan dicatat dalam berkas ini. Format penulisan mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan mengikuti standar [Semantic Versioning](https://semver.org/lang/id/).

---

## [v0.1.0] - 2026-11-01

Rilis publik pertama **ArKzorMD** (Milestone M0 hingga M3 Selesai). Membawa bot AI WhatsApp hybrid self-hosted lengkap dengan sistem kontrol izin berbasis role, approval interaktif, provider AI ganda, Web UI modern, dan instalasi wizard cepat di bawah 10 menit.

### 🌟 Fitur Utama (Highlights)

#### 1. Arsitektur Hybrid & Adapter WhatsApp (`onigis`)
- **Dual Flow**: Perintah berawalan prefix (seperti `.menu`, `.ping`) dieksekusi instan lewat Command Handler tanpa kuota AI; teks biasa diteruskan ke AI Agent cerdas.
- **OnigiBaileys Integration**: Berjalan di atas paket resmi `onigis` (fork Baileys 7 dengan integrasi native E2EE Rust/C).
- **Native Flow Interactive Buttons**: Tombol interaktif native WhatsApp (Quick Reply, CTA URL, CTA Call, CTA Copy Code, dan Single Select) dengan fallback berlapis ke teks dan Web UI.
- **Pairing Code 8-Digit (FR-01)**: Tautkan nomor WhatsApp tanpa kamera menggunakan kode 8 digit resmi WhatsApp langsung dari Web UI.

#### 2. AI Agent & Persona
- **Multi-Provider AI**: Terintegrasi dengan endpoint kompatibel OpenAI (OpenAI, OpenRouter, Ollama) dan Google Gemini API lengkap dengan auto-fallback dan timeout guard.
- **Short-Term Context Compaction (FR-08)**: Peringkasan otomatis riwayat percakapan saat melampaui ambang token jendela memori.
- **Jutek / Dry Text Persona**: Karakter bawaan realistis bergaya dry text Indonesia (huruf kecil semua, 1-7 kata, singkatan alami, hierarki pengirim kebal manipulasi teks).

#### 3. Keamanan, Izin & Approval Engine (M2)
- **Role-Based Access Control (RBAC)**: Tiga tingkatan role pengirim (`owner`, `admin`, `member`) yang diverifikasi langsung oleh sistem.
- **Tingkat Risiko Tiga Level**:
  - `L0` (Bebas): Balas pesan di chat yang sama, react, baca chat berjalan.
  - `L1` (Perlu Persetujuan): Kirim pesan ke kontak lain, kick/promote, ganti setelan grup. Wajib melalui approval Owner via tombol DM WhatsApp atau Web UI.
  - `L2` (Terlarang untuk AI): Ubah secret, baca konfigurasi inti, kill switch. AI tidak memiliki tool untuk aksi ini.
- **Katalog 86 Tool & SSRF Guard**: Memblokir resolusi DNS/IP privat, loopback (127.0.0.0/8, ::1), IP link-local, dan redirect berbahaya pada tool `web.fetch`.
- **Kill Switch Darurat**: Matikan seketika semua aksi berisiko L1 lewat perintah `.stop` atau toggle di Web UI.

#### 4. Web UI Flat & Onboarding Setup Wizard (M3)
- **Setup Wizard 6-Langkah (< 10 Menit)**: Instalasi mandiri tanpa edit file `.env`:
  1. Buat password admin Web UI.
  2. Konfigurasi & tes AI provider.
  3. Hubungkan WhatsApp via QR Code atau Pairing Code 8 digit.
  4. Verifikasi Owner melalui kode acak 6 digit.
  5. Pilih persona awal & mode akses nomor asing (`closed`, `auto_member`, `approval`).
  6. Uji coba pengiriman pesan AI.
- **Autentikasi Aman**: Hashing password menggunakan bawaan `node:crypto` (`scryptSync` + salt acak 16-byte + `timingSafeEqual`) tanpa dependensi pihak ketiga.
- **Manajemen Memori Web**: Inspeksi dan hapus catatan fakta memori jangka panjang per pengguna di Web UI.
- **Manajemen Mode Grup (FR-12)**: Atur mode respons (`off`, `mention`, `active`) dan tetapkan override persona khusus per grup WhatsApp.

#### 5. Sistem Command Modular Per Berkas
- **Struktur File Modular**: Seluruh command dipisahkan ke dalam berkas masing-masing di bawah `packages/core/src/commands/`:
  - `core/` (menu, ping, owner, role, status, reset, persona, approval, stop, public, self, autoread, mengetik, forwardpc)
  - `group/` (admin, hidetag, totag, del, groupset, groupmodify, setppgrup, autogroup, antilink, badword, warn, welcome, list, groupinfo, sewa, afk, daftargc, gc, upswgc)
  - `cs/` (order, faq, komplain, broadcast, bcgc)
  - `media/` (ai, downloader, music, search, sticker, toimg, tovid, smeme, brat, maker, iqc, gamecheck, qris, bypaslink, tools, channel, button)
- **Pemisahan Modul Non-Core**: Fitur di luar fokus bot (`.stalker`, `.anime`, dan `.nsfw`) diisolasi di folder `optional/` agar bot utama tetap ramping dan aman.
- **Resolusi Alias Otomatis**: Mendukung ratusan alias command tanpa menduplikasi registrasi handler.

---

### 🧪 Kualitas & Pengujian
- **17 Berkas Tes Lulus (95/95 Tes Lolos)** mencakup unit test resolver, permission matrix, SSRF guard, approval invariants, native flow buttons, context compaction, auth, API integration, dan modular commands.
- **TypeScript Strict**: `npm run typecheck` lolos dengan 0 error.
- **Bundle Build**: Sukses terkompilasi untuk web (Vite) dan server (tsup).
