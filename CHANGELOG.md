# Changelog

Semua perubahan penting pada proyek **ArKzorMD** akan dicatat dalam berkas ini. Format penulisan mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan mengikuti standar [Semantic Versioning](https://semver.org/lang/id/).

---

## [v0.6.0] - 2026-11-01

### Fitur Utama & Penyempurnaan (Highlights)

#### 1. Perbaikan Eksekusi Perintah di Grup WhatsApp (P0)
- **Prioritas Routing Command**: Pengecekan command dengan prefix valid (`.ping`, `.menu`, `.help`, dll.) kini dijalankan sebelum filter mode mention grup. Perintah bot di grup WhatsApp kini selalu merespon secara andal tanpa mewajibkan pengguna me-mention `@bot` di dalam perintah.

#### 2. Aktivasi Dinamis Self-Control & Pemetaan Otomatis Owner (P0)
- **Self-Control Mode Aktif**: Bot kini merespon pesan dari nomor HP akun bot itu sendiri (`key.fromMe = true`) saat mode Self-Control diaktifkan.
- **Sinkronisasi Dinamis `ownerJid`**: Pengaturan `ownerJid` dibaca langsung dari database secara dinamis menggunakan normalisasi `bareJidUser()` sehingga perubahan owner di Setup Wizard langsung dikenali seketika tanpa perlu restart proses server.

#### 3. Real WebP Sticker Engine & Image Conversion (P0)
- **Sharp WebP Pipeline**: Menggantikan stub stiker dengan implementasi biner nyata menggunakan pustaka `sharp`.
- **Perintah `.sticker`**: Mengonversi gambar/foto JPG, PNG, atau WebP menjadi stiker resmi WhatsApp ukuran 512x512 piksel dengan latar transparan dan kompresi kualitas tinggi.
- **Perintah `.toimg`**: Mengonversi stiker WhatsApp WebP kembali menjadi file gambar PNG berkualitas tinggi.

#### 4. Pengaktifan Runtime Auto-Read & Anti-Ban Typing Jitter (P0)
- **Auto-Read (Centang Biru)**: Pengaturan `auto_read` kini dikonsumsi secara real-time oleh `WhatsAppAdapter` dengan memanggil `socket.readMessages()` saat pesan masuk.
- **Jitter Typing Delay**: Mengaplikasikan jeda pengetikan proporsional (`jitterDelayMs`) di dalam status `withPresence('composing')` sebelum pesan terkirim guna mensimulasikan pengetikan alami dan mencegah deteksi spam WhatsApp.

#### 5. Polishing UI/UX Web Console & Setup Wizard (P1)
- **Styling Modal Pengguna**: Memperbaiki class modal pada halaman Pengguna & Role menggunakan `.modal-card`, `.modal-head`, `.modal-body`, dan `.modal-foot` standar XIAS.
- **Eliminasi Scrollbar Kasar**: Menghapus `scrollbar-gutter: stable` dari sidebar dan menyembunyikan scroll track yang mengganggu estetika *dark-tech*.
- **Quick Preset 9Router**: Tombol visual cepat untuk memilih provider 9Router di Step 2 Setup Wizard dengan konfigurasi port 20128 otomatis.
- **Fix Pengujian Pesan Wizard**: Mengganti endpoint `/api/dev/inbound` di Step 6 dengan `api.playgroundChat` sehingga pengujian pesan berjalan sukses baik pada mode mock maupun live Baileys.

#### 6. Zero-Emoji Compliance & Robustness (P2)
- Menghapus seluruh unicode emoji yang tersisa pada `bot.ts`, membersihkan kurung kosong `[]` pada `clean.ts`, dan membuang spasi leading pada kategori `menu.ts`.
- Menambahkan penanganan `try/catch` pada `Bot.runPlaygroundChat()` untuk menangani potensi error AI provider secara anggun.

---

## [v0.5.0] - 2026-11-01

### Fitur Utama & Penyempurnaan (Highlights)

#### 1. AI Chat Playground Interaktif di Web UI
- **Konsol Playground Mandiri (`#/playground`)**: Sarana interaktif bagi Owner/Admin untuk menguji respons karakter, uji coba prompt, latency milidetik, pemanggilan tools internal, dan penalaran model LLM langsung dari browser tanpa memerlukan nomor WhatsApp penguji kedua.
- **Pilihan Persona Dinamis**: Pilih karakter kepribadian yang sedang aktif atau persona kustom lainnya untuk menguji perbedaan gaya bicara dan instruksi khusus (*system prompt*).
- **Preset Pertanyaan Cepat**: Uji coba instan dengan prompt siap pakai untuk memeriksa identitas karakter, sistem approval, kemampuan media, dan draft pengumuman.
- **Metrik Telemetri Chat**: Menampilkan badge latency respon (ms), tools yang dieksekusi, serta status persetujuan approval L2 per pesan.

#### 2. Auto-Discovery & Tarik Daftar Model (9Router, Ollama, Gemini, OpenAI, OpenRouter)
- **Tombol Tarik Model Dinamis**: Tombol "Tarik Model" pada halaman Pengaturan dan Setup Wizard (Langkah 2) yang memanggil endpoint `POST /api/settings/fetch-models`.
- **Dukungan OpenAI & Local Gateway**: Mengambil daftar model langsung dari `${baseUrl}/models` (misal 9Router port 20128, Ollama port 11434, OpenAI, OpenRouter) secara otomatis.
- **Dukungan Google Gemini**: Mengambil daftar model generasi konten via Generative Language API Google.
- **Selector Model Interaktif**: Menampilkan dropdown pilihan model yang tersedia langsung di samping input teks manual.

#### 3. Manajemen Pengguna Manual & Kontrol Akses Lengkap
- **Tambah Pengguna Manual**: Tombol "+ Tambah Pengguna" dengan modal dialog untuk mendaftarkan nomor kontak atau JID WhatsApp baru, nama kontak, serta penetapan role (Member, Admin, Owner).
- **Ubah Role On-The-Fly**: Dropdown peran langsung pada tabel pengguna untuk menaikkan/menurunkan peran pengguna (Member <-> Admin <-> Owner).
- **Blokir / Aktifkan Akun**: Tombol status klik-langsung untuk memblokir atau membuka blokir pengguna secara instan.
- **Hapus Pengguna**: Tombol hapus pengguna dengan konfirmasi aman (Owner dilindungi dari penghapusan tidak disengaja).

#### 4. Pengaturan Anti-Ban WhatsApp & Humanizer Delay
- **Anti-Ban Typing Delay (ms)**: Konfigurasi jeda pengetikan acak alami (jitter delay 500ms - 3000ms) sebelum bot mengirim balasan untuk mensimulasikan perilaku manusia nyata dan menghindari deteksi automated bot.
- **Auto-Read Control**: Opsi aktif/nonaktif fitur centang biru otomatis saat membalas pesan WhatsApp.

#### 5. Pembersihan Total Emoji di Seluruh Command (Strict Zero-Emoji Policy)
- **100% Vector SVG & Plain Text**: Mengeliminasi seluruh karakter emoji unicode yang tersisa di 57 file command handler (`packages/core/src/commands/`) dan kode bot, menggantikannya dengan penanda teks terstruktur seperti `[OK]`, `[SUKSES]`, `[PERINGATAN]`, `[GAGAL]`, dan `[INFO]`.

---

## [v0.4.0] - 2026-11-01

### 🌟 Fitur Utama & Penyempurnaan (Highlights)

#### 1. Manajemen API Key & Dukungan Penuh 9Router Local Gateway
- **Input API Key Langsung di Web UI**: Form konfigurasi API Key kini hadir di halaman Pengaturan dan Setup Wizard (Langkah 2) dengan tombol *show/hide* (ikon mata SVG), verifikasi status kunci tersimpan, dan tombol **Uji Koneksi AI** untuk cek latensi & balasan sebelum disimpan.
- **Dukungan Resmi 9Router (Local AI Gateway)**: Ditambahkan sebagai opsi provider utama dengan Base URL default `http://localhost:20128/v1` dan model `auto` untuk menjalankan model AI lokal tanpa kuota cloud.
- **Multi-Provider Terpadu**: Google Gemini, OpenAI, OpenRouter, Ollama lokal, dan Custom OpenAI-compatible endpoint.

#### 2. Persona AI CRUD Lengkap (Buat, Edit, Hapus & Custom Prompts)
- **Tombol Tambah Persona**: Buat kepribadian bot baru langsung dari Web UI atau saat Setup Wizard Langkah 5.
- **Fitur Edit Persona**: Ubah nama tampilan, gaya bahasa (tone), bahasa, typing delay, sapaan pembuka (greeting), topik dilarang, dan instruksi sistem tambahan (*custom prompt*) tanpa restart server.
- **Hapus Persona Kustom**: Persona yang tidak aktif kini dapat dihapus dengan konfirmasi aman.
- **Responsif Auto-Fill**: Grid kartu persona menggunakan `.grid-cards` responsif sehingga tampilan tetap rapi di layar lebar.

#### 3. Mode Self Control (Owner Kontrol Bot dari Nomor Akun Sendiri)
- **Dukungan Pesan Self (`key.fromMe`)**: Bot kini dapat membedakan antara balasan otomatis bot (melalui tracking ID pesan keluar) dan pesan yang diketik oleh pemilik akun di WhatsApp.
- **Perintah dari Akun Sendiri**: Owner dapat mengetik perintah seperti `.menu`, `.ping`, atau chat AI langsung dari WhatsApp di nomor bot tanpa diabaikan.
- **Toggle Switch**: Setelan *Mode Self Control* dapat diaktifkan atau dinonaktifkan di halaman Pengaturan.

#### 4. Reset Data & Zona Bahaya
- **Reset Memori Bot**: Menghapus seluruh memori fakta jangka panjang per-user.
- **Bersihkan Audit Log**: Menghapus rekaman riwayat aktivitas dan audit log.
- **Factory Reset**: Mengembalikan bot dan status setup ke kondisi awal wizard.

#### 5. Peningkatan Estetika Tampilan & Scrollbar Kustom
- **Modern Dark-Tech Scrollbar**: Menggantikan scrollbar default Windows yang tebal/kaku dengan scrollbar ramping (6px) bertema gelap dengan rounded thumb dan efek hover emerald.
- **Dropdown Modern**: Komponen `<select>` dipercantik dengan ikon panah SVG kustom, latar belakang solid, dan padding yang nyaman.
- **Alur Setup Wizard**: Penataan navigasi langkah yang konsisten dan tombol langsung masuk ke Dashboard Utama di akhir langkah.

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

