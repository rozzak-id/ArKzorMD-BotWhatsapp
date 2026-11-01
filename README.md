<div align="center">

# ⚡ ArKzorMD
### *Next-Gen Self-Hosted Hybrid AI WhatsApp Bot Platform*

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-≥20.11-green.svg?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.2-black.svg?style=for-the-badge&logo=fastify)](https://fastify.dev/)
[![Preact](https://img.shields.io/badge/Preact-Vite-673ab8.svg?style=for-the-badge&logo=preact)](https://preactjs.com/)
[![Tests](https://img.shields.io/badge/Tests-98%2F98%20Passing-success.svg?style=for-the-badge&logo=vitest)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <b>Bicara santai seperti teman, eksekusi perintah toko & grup secepat kilat, dan tetap aman dengan Approval Engine terisolasi.</b>
</p>

[Fitur Utama](#-fitur-utama) •
[Instalasi Cepat](#-instalasi-cepat) •
[Web Dashboard](#-web-dashboard--wizard) •
[AI & Multimodal](#-kemampuan-ai--multimodal) •
[Katalog Command](#-katalog-command-52-modul) •
[Keamanan](#-keamanan--approval-engine) •
[Roadmap](#-roadmap-proyek)

---

</div>

## 💡 Mengapa ArKzorMD?

Kebanyakan bot WhatsApp saat ini terbelah menjadi dua ekstrem:
1. **Bot Command Kuno**: Cepat tapi kaku, hanya merespons prefix (`.menu`, `.kick`) tanpa pemahaman bahasa alami.
2. **Bot AI Polos**: Pintar diajak ngobrol tapi lambat, boros token API, dan berbahaya jika diberi izin eksekusi aksi WhatsApp tanpa pengawasan.

**ArKzorMD menggabungkan keunggulan keduanya dalam Arsitektur Dual-Flow Hybrid:**
* ⚡ **Eksekusi Kilat**: Perintah ber-prefix (`.menu`, `.ping`, `.sewa`, `.list`, `.order`) diproses instan oleh handler internal tanpa memakan token atau kuota AI.
* 🧠 **Multimodal AI Cerdas**: Obrolan biasa, foto gambar/struk belanja, hingga rekaman pesan suara (*voice note*) otomatis dipahami oleh model AI mutakhir (OpenAI / Gemini / Ollama).
* 🛡️ **Zero-Bypass Security**: Aksi berisiko (L1 seperti broadcast, promote, kick, teruskan pesan) **wajib disetujui Owner** lewat tombol interaktif WhatsApp atau Web UI. AI tidak bisa memutuskan izinnya sendiri!

---

## 🌟 Fitur Utama

| Modul | Status | Sorotan Fitur |
| :--- | :---: | :--- |
| **Hybrid Message Router** | ✅ Selesai | Prefix fleksibel (`.`), pemisahan alur command vs AI, respon instan < 50ms |
| **Multimodal Vision & Audio** | ✅ Selesai | Baca gambar/struk belanja (Gemini/OpenAI) & transkripsi Voice Note (Whisper/Gemini) |
| **52+ Modul Command Per Berkas** | ✅ Selesai | Toko, grup, moderasi, CS, tools media, downloader, terorganisir 1 file per modul |
| **Native Flow Interactive Buttons** | ✅ Selesai | Tombol Quick Reply, Call CTA, URL CTA, Copy Code, Dropdown List di WhatsApp |
| **8-Digit Pairing Code** | ✅ Selesai | Tautkan WhatsApp tanpa kamera via kode 8-digit langsung dari Web UI |
| **Web Dashboard & Setup Wizard** | ✅ Selesai | Setup lengkap < 10 menit tanpa sentuh file `.env`, proteksi auth `scryptSync` |
| **Context Compaction & Memory** | ✅ Selesai | Ringkasan riwayat percakapan otomatis (hemat token) & fakta pengguna jangka panjang |
| **Persona Jutek / Dry Text** | ✅ Selesai | Gaya chat natural khas Indonesia (huruf kecil, singkat, to-the-point, kebal prompt injection) |
| **Permission & Approval Engine** | ✅ Selesai | Matriks risiko L0/L1/L2, approval TTL 5 menit, kill switch darurat (`.stop`) |
| **Ekspor & Impor Data** | ✅ Selesai | Ekspor/impor Persona (JSON) dan Audit Log (CSV/JSON) siap unduh dari Web UI |
| **One-Line VPS Installer** | ✅ Selesai | Pasang di Ubuntu/Debian dalam satu perintah bash dengan service `systemd` otomatis |

---

## 🚀 Instalasi Cepat

### Opsi 1: One-Line VPS Installer *(Rekomendasi untuk Linux/VPS)*
Jalankan satu baris perintah ini di VPS Ubuntu/Debian kamu:

```bash
curl -fsSL https://raw.githubusercontent.com/rozzak-id/ArKzorMD-BotWhatsapp/main/install.sh | sudo bash
```

> 🎯 Skrip akan otomatis menginstal Node.js 22 LTS, clone repositori, kompilasi build, konfigurasi `.env`, dan mengaktifkan service background `systemd` (`arkzormd.service`). Setelah selesai, langsung buka `http://<IP-VPS>:3000` di browsermu!

---

### Opsi 2: Menggunakan Docker Compose *(Rekomendasi Kontainer)*

```bash
# 1. Clone repositori
git clone https://github.com/rozzak-id/ArKzorMD-BotWhatsapp.git
cd ArKzorMD-BotWhatsapp

# 2. Salin env dan jalankan container
cp .env.example .env
docker compose up -d

# 3. Pantau log
docker compose logs -f
```

Buka dashboard di **`http://localhost:3000`**.

---

### Opsi 3: Instalasi Manual / Pengembangan Lokal

```bash
# 1. Clone dan pasang dependensi
git clone https://github.com/rozzak-id/ArKzorMD-BotWhatsapp.git
cd ArKzorMD-BotWhatsapp
npm install

# 2. Jalankan mode pengembangan (Server + Web UI)
npm run dev
```

* **Web UI Development**: `http://localhost:5173`
* **API Server**: `http://localhost:3000`

> 💡 **Catatan Platform:** Koneksi WhatsApp *Live* memerlukan OS Linux (x64/arm64) karena dependensi kriptografi E2EE `onigis`. Pada sistem Windows / macOS, disarankan menggunakan Docker / WSL, atau gunakan mode `WHATSAPP_MODE=mock` untuk pengujian lokal.

---

## 🖥️ Web Dashboard & Wizard

ArKzorMD dilengkapi Web Dashboard modern berbasis Preact & Vite yang ringan dan elegan.

```
                    ┌──────────────────────────────────────────┐
                    │       ArKzorMD Web Setup Wizard          │
                    ├──────────────────────────────────────────┤
                    │ 1. Buat Kata Sandi Admin (scryptSync)    │
                    │ 2. Pilih & Tes AI Provider (OpenAI/Gemini│
                    │ 3. Hubungkan WhatsApp (Pairing 8 Digit)  │
                    │ 4. Verifikasi Owner (Kode Challenge)     │
                    │ 5. Tentukan Persona & Akses Grup         │
                    │ 6. Uji Coba Obrolan & Selesai!           │
                    └──────────────────────────────────────────┘
```

### Menu Web UI:
* 📊 **Dashboard & Status**: Monitoring uptime, pemakaian RAM, status koneksi adapter, dan provider AI.
* 🔐 **Antrean Approval**: Tinjau permintaan aksi berisiko L1 secara visual lengkap dengan parameter asli.
* 👥 **Manajemen Persona**: Aktifkan, edit, ekspor, atau impor template persona dalam format JSON.
* 💬 **Manajemen Grup**: Atur mode respons grup (`off`, `mention`, `active`) dan tetapkan persona override per grup.
* 🧠 **Long-Term Memory**: Tinjau fakta memori yang dipelajari bot dari pengguna dengan fitur hapus/bersihkan.
* 📜 **Audit Log Viewer**: Riwayat seluruh aktivitas dengan tombol ekspor **CSV** dan **JSON**.

---

## 🧠 Kemampuan AI & Multimodal

ArKzorMD ditenagai oleh provider AI fleksibel dan modular:

```text
       ┌───────────────┐
       │ Pesan Masuk   │
       └───────┬───────┘
               │
        [Punya Media?]
         ├── 📷 Foto/Gambar ────► Gemini InlineData / OpenAI Vision URL ──┐
         ├── 🎙️ Voice Note  ────► Whisper / Gemini Transcribe ───────────┤
         └── 💬 Teks Biasa  ─────────────────────────────────────────────┤
                                                                         ▼
                                                            ┌───────────────────────┐
                                                            │  Jutek Persona Engine │
                                                            │  (Bahasa Santai ID)   │
                                                            └───────────┬───────────┘
                                                                        │
                                                            ┌───────────▼───────────┐
                                                            │   Balasan Kontekstual │
                                                            └───────────────────────┘
```

### 1. Vision Multimodal (FR-18)
Kirim foto struk pembelian, gambar meme, atau tangkapan layar dengan caption:
> *"Berapa total belanja di struk ini?"*  
Bot akan membaca teks dan total belanja secara akurat!

### 2. Transkripsi Voice Note (FR-19)
Kirim rekaman suara (PTT/VN) dalam bahasa Indonesia atau daerah. Bot akan mentranskripsikannya dan membalas sesuai kepribadiannya tanpa canggung.

---

## 📦 Katalog Command (52+ Modul)

Perintah terorganisir rapi **1 berkas per fitur** di folder `packages/core/src/commands/`:

<details>
<summary><b>👥 1. Group & Moderation Commands</b> (Klik untuk membuka)</summary>

* `.admin` (`.kick`, `.add`, `.promote`, `.demote`, `.tagall`) — Kelola anggota grup.
* `.hidetag` (`.ht`, `.h`) — Mention semua anggota grup tanpa teks tag panjang.
* `.totag` (`.qtag`) — Teruskan pesan sambil mention semua member.
* `.del` (`.delete`, `.d`) — Hapus pesan bot atau pesan anggota lain (Delete for Everyone).
* `.groupset` (`.buka`, `.tutup`, `.open`, `.close`) — Buka atau tutup izin chat grup.
* `.groupmodify` (`.setname`, `.setdesc`, `.linkgc`, `.revoke`) — Ubah nama, deskripsi, atau reset link grup.
* `.setppgrup` (`.setppgc`) — Ganti foto profil grup dari gambar langsung/reply.
* `.autogroup` (`.autogc`) — Jadwalkan jam buka dan tutup grup otomatis harian.
* `.antilink` — Proteksi otomatis kick/hapus pengirim link grup WA lain.
* `.badword` — Sensor dan blacklist kata-kata kotor/kasar.
* `.warn` (`.unwarn`, `.cekwarn`) — Sistem 3x peringatan pelanggaran sebelum auto-kick.
* `.welcome` (`.goodbye`) — Pesan sambutan member baru atau salam perpisahan.
* `.list` (`.addlist`, `.dellist`) — Respon otomatis kata kunci toko di grup.
* `.groupinfo` — Informasi detail grup, pembuat, admin, dan status proteksi.
* `.sewa` — Cek sisa masa aktif sewa bot di grup.
* `.afk` — Mode Away From Keyboard dengan pemberitahuan otomatis saat di-tag.
</details>

<details>
<summary><b>⚙️ 2. Core & System Commands</b> (Klik untuk membuka)</summary>

* `.menu` (`.help`) — Menampilkan daftar menu interaktif terorganisir.
* `.ping` (`.speed`) — Menampilkan latency, uptime server, dan pemakaian RAM.
* `.owner` — Kirim kontak vCard resmi pemilik bot.
* `.role` (`.setrole`, `.cekrole`) — Manajemen level akses (`owner`, `admin`, `member`).
* `.stop` (`bot.panic`) — **Kill Switch Darurat**: Matikan seketika semua aksi berisiko L1.
* `.public` / `.self` — Beralih antara mode publik atau mode khusus owner.
* `.autoread` — Pengaturan centang biru otomatis.
* `.mengetik` — Pengaturan efek visual *typing presence*.
</details>

<details>
<summary><b>🛍️ 3. Toko & Customer Service Commands</b> (Klik untuk membuka)</summary>

* `.order` (`.pesanan`, `.invoice`) — Cek status pesanan toko berdasarkan nomor invoice.
* `.faq` (`.bantuan`) — Pertanyaan yang sering diajukan & panduan transaksi.
* `.komplain` (`.lapor`) — Teruskan keluhan pelanggan langsung ke CS / Owner.
* `.broadcast` (`.bc`) — Kirim pesan siaran ke seluruh kontak pengguna bot.
* `.bcgc` — Kirim pesan siaran serentak ke seluruh grup terdaftar.
</details>

<details>
<summary><b>🛠️ 4. Media, Tools & AI Commands</b> (Klik untuk membuka)</summary>

* `.ai` (`.azusa`, `.tanya`) — Obrolan langsung dengan asisten AI multimodal.
* `.downloader` (`.tt`, `.ig`, `.yt`, `.fb`, dll.) — Pengunduh media serbaguna dari berbagai platform sosial.
* `.sticker` (`.s`) — Pembuat stiker WhatsApp dari foto atau video pendek.
* `.toimg` / `.tovid` — Konversi stiker kembali menjadi foto atau video.
* `.smeme` / `.brat` — Pembuat stiker teks meme populer.
* `.tools` — Kalkulator aman, konverter unit, dan pencarian web anti-SSRF.
</details>

---

## 🛡️ Keamanan & Approval Engine

Keamanan adalah prioritas utama arsitektur ArKzorMD:

```text
[Permintaan Tindakan AI]
           │
           ▼
┌─────────────────────┐
│  Permission Engine  │ ◄─── Pengecekan RBAC & Resolver Tingkat Risiko
└──────────┬──────────┘
           │
     [Tingkat Aksi]
      ├── L0 (Bebas)    ───► Eksekusi Langsung (Balas pesan, react, baca chat)
      ├── L1 (Sensitif) ───► MINTA APPROVAL KE OWNER (Kirim pesan kontak lain, kick, broadcast)
      │                       │
      │                       ├── Owner Klik [✅ Setuju] ──► Eksekusi Aksi
      │                       └── Owner Klik [❌ Tolak]   ──► Batalkan Aksi
      └── L2 (Kritis)   ───► DITOLAK MUTLAK (Ubah secret, matikan server, ubah konfigurasi inti)
```

* **SSRF Guard Bertingkat**: Mencegah serangan Server-Side Request Forgery ke IP privat (`10.0.0.0/8`, `192.168.0.0/16`, `127.0.0.1`, `::1`).
* **Secret Redaction**: Kunci API, password, dan nomor rahasia otomatis disaring (`[REDACTED]`) sebelum dicatat di log atau audit database.
* **Tanggung Jawab Akun**: Baca panduan lengkap pencegahan pemblokiran WhatsApp di [DISCLAIMER.md](DISCLAIMER.md) dan kebijakan pelaporan kerentanan di [SECURITY.md](SECURITY.md).

---

## 🗺️ Roadmap Proyek

- [x] **M0: Fondasi Monorepo** — Setup TypeScript, SQLite WAL, Fastify, & OnigiBaileys.
- [x] **M1: AI Agent & Persona** — Provider OpenAI/Gemini, Short-Term Context Compaction, Persona Jutek.
- [x] **M2: Izin & Approval** — Resolver L0/L1/L2, Approval Engine, Tombol Native Flow, Kill Switch.
- [x] **M3: Web UI Dashboard** — Setup Wizard 6 langkah, scrypt auth, Pairing Code 8 digit, mode grup.
- [x] **M4: Media AI Multimodal** — Analisis gambar vision & transkripsi pesan suara otomatis.
- [x] **M5: Hardening & Rilis** — One-line VPS installer (`install.sh`), ekspor/impor data, disclaimer & audit.
- [ ] **M6: Fitur Pasca-Rilis (P1)** — Ekstraksi dokumen PDF, balasan suara TTS, dan adapter Telegram/Discord.

---

## 📄 Lisensi & Kontribusi

Proyek ini dirilis di bawah lisensi [MIT](LICENSE). Kontribusi terbuka untuk siapa saja! Silakan baca [CONTRIBUTING.md](CONTRIBUTING.md) sebelum mengajukan Pull Request.

<div align="center">
  <sub>Dibangun dengan dedikasi untuk ekosistem AI WhatsApp yang tangguh, aman, dan menyenangkan.</sub><br>
  <b><a href="https://github.com/rozzak-id/ArKzorMD-BotWhatsapp">ArKzorMD GitHub Repository</a></b>
</div>
