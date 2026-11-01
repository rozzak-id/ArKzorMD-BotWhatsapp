# Changelog

Semua perubahan penting pada proyek **ArKzorMD** akan dicatat dalam berkas ini. Format penulisan mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan mengikuti standar [Semantic Versioning](https://semver.org/lang/id/).

---

## [v0.3.0] - 2026-11-01

### 🌟 Fitur Utama & Penyempurnaan (Highlights)

#### 1. Redesain Web UI (XIAS & `ux-ui-agent-skills`)
- **DTCG Token Engine (3-Tier)**: Skala warna Slate cyber, aksen Emerald pulse, Cyan glow, dan kepatuhan kontras WCAG 2.2 AA–AAA.
- **Estetika Modern Dark-Tech**: Elevated glassmorphism cards, micro-borders, asymmetric telemetry cards, dan layout command console berstandar Linear/Vercel.
- **Sistem Ikon Vector SVG Murni (Zero-Emoji Policy)**: Menggantikan seluruh emoji unicode di UI dengan komponen SVG tajam (`Icons.WhatsApp`, `Icons.Robot`, `Icons.Activity`, `Icons.ShieldCheck`, `Icons.Cpu`, `Icons.Tools`, `Icons.Sun`, `Icons.Moon`, dll).
- **Indikator Live Radar Ping**: Animasi pulsing dot `@keyframes ping` pada status koneksi WhatsApp dan metrik uptime.
- **Interactive Command & Control**:
  - Tombol aksi cepat Approval L1 (*Approve* / *Reject*) langsung pada Hero Console Dashboard.
  - Emergency Kill Switch toggle switch langsung pada halaman Tools.
  - Live filter pencarian memori & konfirmasi hapus interaktif.
  - Form per-group persona override & selector mode respons grup interaktif.

#### 2. Perbaikan WhatsApp QR & Pairing Code State Machine
- **Eliminasi Race Condition**: Menangani kesiapan socket dan pembaruan kredensial Baileys sehingga QR code tidak hilang mendadak dan proses pairing code 8-digit selalu berhasil di-*generate*.
- **Endpoint Pemicu Manual**:
  - `POST /api/connection/whatsapp/qr`: Inisialisasi atau paksa regenerasi QR code baru.
  - `POST /api/connection/whatsapp/pair`: Minta kode pairing WhatsApp secara eksplisit dengan nomor telepon.
- **Konektivitas Handshake Stabil**: Menjaga listener `connection.update` dan `creds.update` tetap sinkron dengan status server.

#### 3. Registrasi Skill & Dokumentasi Desain
- Terdaftarnya skill agent `.agents/skills/ux-ui-agent-skills/` lengkap dengan referensi `tokens.md` dan checklist `anti-slop.md`.

---

## [v0.2.0] - 2026-11-01

### 🌟 Fitur Utama (Highlights)

#### 1. Media AI Multimodal (Milestone M4 · FR-18 & FR-19)
- **Analisis Gambar Vision Multimodal (FR-18)**: Integrasi penuh pemrosesan gambar multimodal:
  - Google Gemini API menggunakan format part `inlineData` (base64 + mimeType).
  - OpenAI-compatible API menggunakan format part `image_url` data URL (`data:<mime>;base64,<data>`).
  - Bot mampu mengenali dan menjawab pertanyaan seputar foto struk belanja, screenshot, dokumen, atau foto langsung dari chat WhatsApp.
- **Transkripsi Voice Note Otomatis (FR-19)**: Modul `AudioTranscriber` cerdas dengan dukungan:
  - OpenAI / Groq Whisper API (`POST /v1/audio/transcriptions` via native `fetch` + `FormData`).
  - Google Gemini Multimodal Audio (transkripsi akurat rekaman bahasa Indonesia/daerah).
  - Hasil transkripsi pesan suara secara otomatis disisipkan ke prompt pengguna sehingga persona Jutek merespons pesan suara secara kontekstual.
- **WhatsApp Media Download Pipeline**: Adapter `onigis` secara otomatis mengunduh buffer media terenkripsi WhatsApp untuk pesan gambar dan rekaman audio (dengan batas aman 10MB per berkas).
- **Pembersih Watermark AI & Karakter Tersembunyi (Skill & Command .clean)**:
  - Integrasi skill agent `remove-ai-marks` (`.agents/skills/remove-ai-marks/`).
  - Command WhatsApp baru `.clean` (`.unmark`, `.antidetect`) untuk membersihkan zero-width space, bidi controls, tag characters, dan normalisasi kanonik NFKC dari teks AI.

#### 2. Ekspor & Impor Data Web UI (Milestone M5 · FR-14 & FR-34)
- **Ekspor & Impor Persona (FR-14)**:
  - Endpoint `GET /api/personas/export` (unduh file JSON seluruh persona tersimpan).
  - Endpoint `POST /api/personas/import` (impor daftar persona dari file JSON).
  - Tombol aksi "Ekspor JSON" dan "Impor JSON" langsung pada halaman Web UI `PersonasPage`.
- **Ekspor Audit Log (FR-34)**:
  - Endpoint `GET /api/audit/export?format=csv` (ekspor log audit berstandar RFC 4180 CSV).
  - Endpoint `GET /api/audit/export?format=json` (ekspor log audit lengkap format JSON).
  - Tombol aksi "Ekspor CSV" dan "Ekspor JSON" langsung pada halaman Web UI `AuditPage`.

#### 3. Deployment & Hardening VPS (Milestone M5)
- **One-Line Installer Script (`install.sh`)**: Skrip instalasi otomatis untuk Linux (Ubuntu/Debian) yang memeriksa OS, memasang Node.js 22 LTS dari NodeSource bila diperlukan, melakukan kompilasi monorepo, membuat konfigurasi `.env`, dan mengonfigurasi `systemd` service (`arkzormd.service`) yang berjalan di background dengan restart otomatis.
- **Dokumentasi Disclaimer & Keamanan**:
  - `DISCLAIMER.md`: Peringatan risiko banned WhatsApp, pedoman anti-spam, dan rekomendasi penggunaan nomor khusus.
  - `SECURITY.md`: Pembaruan status arsitektur keamanan aktif (Web UI auth scryptSync, session token, verifikasi Owner 6-digit challenge code, redaksi secret).

### 🧪 Pengujian & Kualitas
- **18 Berkas Tes Lulus (98/98 Tes Lolos)** termasuk tes multimodal Gemini inlineData, OpenAI image_url, transkripsi voice note, ekspor-impor persona, dan ekspor CSV audit log.
- **TypeScript Strict**: `npm run typecheck` lolos dengan 0 error.
- **Bundle Production**: Kompilasi Vite (Web) dan tsup (Server) berhasil tanpa peringatan error.

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

