# ArKzorMD

Bot AI WhatsApp **hybrid** yang open source dan di-host sendiri. Pengguna bisa memakai
command berawalan titik (`.menu`, `.help`, …), tetapi **AI menjadi pengendali utama**:
cukup bicara biasa, AI memahami maksud dan menjalankan aksi lewat tool. Setiap aksi
berisiko melewati **Permission Engine** dan **persetujuan Owner** yang ditegakkan oleh
kode — bukan oleh AI.

Status saat ini: **v0.1.0 (Milestone M0, M1, M2, dan M3 Selesai)**. Fondasi core pipeline,
permission/approval L0/L1/L2, katalog 86 tool, tombol interaktif Native Flow onigis,
provider AI OpenAI & Gemini, context compaction, Setup Wizard 6 langkah,
dan modul command per berkas sudah terpasang dan siap digunakan. Mode `mock` tetap
berjalan di semua OS; koneksi WhatsApp **live** memerlukan Linux x64/arm64 (Docker/WSL)
karena paket E2EE native `oktz-signal`/`oktz-curve25519` hanya menyediakan prebuild Linux.

> ⚠️ **Risiko akun WhatsApp.** Bot ini memakai protokol tidak resmi (Onigi/Baileys).
> Gunakan nomor khusus, jangan nomor utama. Risiko pemblokiran ada pada pengguna. Baca
> [SECURITY.md](SECURITY.md) sebelum menghubungkan akun.

## Daftar isi

- [Fitur yang sudah ada](#fitur-yang-sudah-ada)
- [Persyaratan](#persyaratan)
- [Mulai cepat](#mulai-cepat)
- [Memilih provider AI](#memilih-provider-ai)
- [Menjalankan dengan Docker](#menjalankan-dengan-docker)
- [Struktur repo](#struktur-repo)
- [Dokumentasi](#dokumentasi)
- [Katalog Tool](#katalog-tool)
- [Scripts](#scripts)
- [Konfigurasi](#konfigurasi)
- [Menguji pipeline tanpa WhatsApp](#menguji-pipeline-tanpa-whatsapp)
- [Keamanan](#keamanan)
- [Roadmap](#roadmap)
- [Lisensi](#lisensi)

## Fitur yang sudah ada

| Area | Status | Keterangan |
| --- | --- | --- |
| Monorepo & struktur paket | ✅ | npm workspaces, TypeScript strict, adapter netral platform |
| Router hybrid | ✅ | Prefix dapat diatur; command tanpa AI, teks lain ke AI Agent |
| Role & Permission Engine | ✅ | Owner/Admin/Member, level risiko L0/L1/L2, default deny |
| Approval Engine | ✅ | Kode sekali pakai, TTL 5 menit, keputusan hanya JID Owner, aturan “setuju selalu” |
| Kill switch | ✅ | `.stop` / `.stop off`, memblokir semua L1 |
| SQLite + audit log | ✅ | Skema PRD + redaksi nilai sensitif |
| Bot pipeline | ✅ | Filter pesan, mode grup, humanizer, rate limit, audit |
| Web UI flat | ✅ | Dashboard live, Setup Wizard 6 langkah, persona, pengguna, grup, persetujuan, memori, tools, audit |
| Autentikasi Web UI | ✅ | Login & sesi aman menggunakan scryptSync bawaan node:crypto |
| API + WebSocket | ✅ | Status real-time, endpoint approval ber-token, pairing code 8-digit |
| Adapter WhatsApp | ✅ | `onigis` 10.1.0-rc.12: QR/Pairing code 8-digit, reconnect backoff, teks/media/reaction, tombol approval Native Flow + fallback |
| Provider AI asli | ✅ | OpenAI-compatible (OpenAI/OpenRouter/Ollama) + Gemini, tool calling, context compaction, fallback model |
| Memori & Persona | ✅ | Peringkasan token otomatis (FR-08), manajemen memori web, persona Jutek Dry Text |
| Adapter Telegram/Discord | 🚧 stub | Kartu Coming Soon di Web UI |
| Media (analisis gambar/VN) | ⏳ | M4/M6 |

## Persyaratan

- **Node.js ≥ 20.11** (disarankan 22 LTS atau 24)
- npm ≥ 10 (npm workspaces)
- Linux, macOS, atau Windows untuk mode `mock`
- **WhatsApp live:** Linux x64/arm64. Di Windows/macOS gunakan Docker atau WSL.
- Untuk Docker: Docker Engine + Compose v2

## Mulai cepat

```bash
git clone <url-repo> arkzormd
cd arkzormd
cp .env.example .env        # Windows: copy .env.example .env
npm install
npm run dev
```

Buka:

- Web UI pengembangan: <http://localhost:5173>
- API: <http://localhost:3000/api/health>

Secara default `WHATSAPP_MODE=mock`, jadi bot berjalan tanpa akun WhatsApp. Mode ini
aman di Windows/macOS dan tidak memuat paket native E2EE.

### Menghubungkan WhatsApp live

Isi `.env`:

```dotenv
WHATSAPP_MODE=live
WHATSAPP_AUTOCONNECT=true
WHATSAPP_MODULE=onigis
OWNER_JID=6281234567890@s.whatsapp.net
```

Jalankan server di Linux/Docker/WSL, buka **Koneksi WhatsApp** di Web UI, lalu pindai QR
dari menu WhatsApp → **Perangkat tertaut** → **Tautkan perangkat**. Sesi disimpan di
`data/whatsapp-auth`; reconnect otomatis berjalan dengan backoff. Di Windows, koneksi
live akan gagal saat enkripsi pertama — gunakan Docker/WSL.

## Memilih provider AI

Default `AI_PROVIDER=mock` tidak memanggil jaringan. Untuk mengobrol dengan model asli,
pilih salah satu konfigurasi berikut di `.env`, lalu restart server. API key saat ini
dibaca dari `.env`; penyimpanan terenkripsi lewat Web UI masuk M3.

**OpenAI:**

```dotenv
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
```

**OpenRouter:**

```dotenv
AI_PROVIDER=openai
AI_MODEL=openai/gpt-4o-mini
OPENAI_API_KEY=sk-or-...
OPENAI_BASE_URL=https://openrouter.ai/api/v1
```

**Ollama / endpoint lokal** (API key boleh kosong):

```dotenv
AI_PROVIDER=openai
AI_MODEL=llama3.1
OPENAI_API_KEY=
OPENAI_BASE_URL=http://127.0.0.1:11434/v1
```

**Gemini:**

```dotenv
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=...
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

`AI_MODEL` boleh dikosongkan untuk memakai default provider. Tambahkan
`AI_FALLBACK_MODEL` untuk model cadangan, misalnya `gpt-4o-mini` atau
`gemini-2.5-pro`. Fallback dicoba hanya untuk error yang bisa diulang (429, 5xx,
timeout, jaringan, atau model tidak ditemukan); error 400/401/403 tidak diulang.
`AI_TIMEOUT_MS` mengatur batas waktu satu request (default 60 detik).

Cek provider yang aktif lewat `GET /api/status` atau halaman **Dashboard**. API key
tidak pernah dimasukkan ke prompt, log, audit, atau Web UI. Jangan commit `.env`.

Build produksi:

```bash
npm run build
npm start
```

`npm run build` membangun Web UI ke `apps/web/dist` dan mem-bundle server ke
`apps/server/dist`. Server menyajikan Web UI dari port yang sama.

## Menjalankan dengan Docker

```bash
cp .env.example .env
docker compose up -d
docker compose logs -f
```

Web UI: <http://127.0.0.1:3000>. Data SQLite dan sesi WhatsApp tersimpan di `./data`.
Port sengaja di-bind ke localhost; untuk akses publik pasang reverse proxy HTTPS
(Caddy/Nginx) dan jangan pernah mengekspos port API langsung.

Docker adalah cara yang disarankan untuk WhatsApp live karena image berbasis Linux dan
menyertakan prebuild native `onigis`. Set `WHATSAPP_MODE=live` dan
`WHATSAPP_AUTOCONNECT=true` di `.env`, lalu buka halaman **Koneksi WhatsApp** untuk
memindai QR.

## Struktur repo

```text
arkzormd/
├─ packages/
│  ├─ core/                    # router, permission, approval, agent, tools, memory, persona
│  │  └─ src/
│  │     ├─ agent/             # provider abstrak + orchestrator tool calling
│  │     ├─ audit/             # audit log + redaksi secret
│  │     ├─ db/                # skema SQLite, migrasi awal, stores
│  │     ├─ humanizer/         # jeda mengetik
│  │     ├─ persona/           # prompt persona
│  │     ├─ rate-limit/        # sliding window keluar
│  │     ├─ router/            # command registry + router hybrid
│  │     ├─ security/          # permission & approval engine
│  │     ├─ testing/           # mock adapter
│  │     ├─ tools/             # registry + tool bawaan
│  │     ├─ bot.ts             # orkestrator pipeline pesan
│  │     └─ types.ts           # kontrak netral platform
│  ├─ adapter-whatsapp/        # adapter onigis: koneksi, normalisasi, kirim, approval
│  ├─ adapter-telegram/        # stub Coming Soon
│  └─ adapter-discord/         # stub Coming Soon
├─ apps/
│  ├─ server/                  # Fastify API + proses bot + WebSocket
│  └─ web/                     # Preact + Vite, desain flat
├─ plugins/
│  ├─ example-command/         # contoh command plugin (.hello)
│  └─ example-tool/            # contoh tool plugin (echo_note)
├─ docs/
│  ├─ prd-arkzormd.md
│  ├─ architecture.md
│  ├─ plugins.md
│  └─ agent-prompt-and-tools.md
├─ docker-compose.yml
├─ Dockerfile
├─ .env.example
└─ README.md
```

## Dokumentasi

Dokumentasi lengkap ArKzorMD tersimpan di folder [`docs/`](docs/):

- [PRD ArKzorMD](docs/prd-arkzormd.md) — Dokumen spesifikasi kebutuhan produk, persona, kebutuhan fungsional (FR-01 s.d. FR-35), dan roadmap.
- [Arsitektur Teknis](docs/architecture.md) — Alur pesan, batas modul, rincian komponen, provider AI, dan skema database.
- [Panduan Command, Tool, dan Plugin](docs/plugins.md) — Panduan menulis command, tool, platform adapter, serta template plugin workspace.
- [Prompt Agent dan Katalog Tool](docs/agent-prompt-and-tools.md) — System prompt siap pakai, aturan level risiko dinamis, katalog lengkap tool, dan kontrak hasil eksekusi.

## Katalog Tool

ArKzorMD mendefinisikan katalog 86 tool (Kategori A–J, sesuai `docs/agent-prompt-and-tools.md`). Tool tingkat L2 tidak pernah didaftarkan ke AI.

### Tool Aktif (Implemented = true)

| Tool | Kategori | Level Efektif | Role Min | Keterangan |
| --- | --- | --- | --- | --- |
| `wa.reply` | Pesan & Media | L0 | Member | Balas pesan di chat aktif dengan teks |
| `wa.send_text` | Pesan & Media | L0 chat ini, L1 chat lain | Member | Kirim pesan teks (maks 4096 karakter) |
| `wa.send_media` | Pesan & Media | L0 chat ini, L1 chat lain | Member | Kirim media (gambar, audio, video, dokumen, stiker, gif) |
| `wa.react` | Pesan & Media | L0 | Member | Beri reaksi emoji pada pesan di chat aktif |
| `wa.read_chat` | Baca & Konteks | L0 chat ini, L1 chat lain (Owner) | Member | Baca riwayat percakapan chat aktif |
| `memory.save_note` | Memori | L0 | Member | Simpan catatan/fakta tentang pengguna atau percakapan |
| `memory.search` | Memori | L0 | Member | Cari catatan memori berdasarkan kata kunci |
| `memory.forget` | Memori | L0 | Member | Hapus catatan memori (spesifik atau bersihkan semua) |
| `util.now` | Web & Utilitas | L0 | Member | Waktu, tanggal, dan zona waktu saat ini |
| `util.calculate` | Web & Utilitas | L0 | Member | Perhitungan matematika aman (tanpa `eval`, bebas injeksi) |
| `util.convert` | Web & Utilitas | L0 | Member | Konversi unit (panjang, massa, suhu, waktu, data) |
| `web.fetch` | Web & Utilitas | L0 | Member | Ambil teks web dengan perlindungan SSRF bertingkat |
| `bot.status` | Kontrol Bot | L0 | Member | Status uptime, platform, dan kesehatan bot |
| `bot.panic` | Kontrol Bot | L0 | Owner | Kill switch darurat: instan blokir semua aksi L1 |

### Tool Dalam Antrean (Implemented = false, M3–M6)

- **Kategori A (Pesan & Media):** `wa.send_location`, `wa.send_contact`, `wa.send_poll`, `wa.edit_message`, `wa.delete_message`, `wa.forward`, `wa.pin_message`, `wa.mention_all`, `wa.schedule_message`, `wa.set_presence`, `wa.mark_read`.
- **Kategori B (Baca & Konteks):** `wa.search_messages`, `wa.download_media`, `wa.list_chats`, `wa.list_contacts`, `wa.list_groups`, `wa.get_group_info`, `wa.get_contact_info`, `wa.check_number`, `wa.get_profile_picture`, `wa.view_status`.
- **Kategori C (Grup & Komunitas):** `wa.group_create`, `wa.group_set_subject`, `wa.group_set_description`, `wa.group_set_picture`, `wa.group_add`, `wa.group_remove`, `wa.group_promote`, `wa.group_demote`, `wa.group_settings`, `wa.group_invite_link`, `wa.group_join`, `wa.group_leave`, `wa.group_join_requests`, `wa.group_ephemeral`, `wa.community_manage`.
- **Kategori D (Manajemen Chat):** `wa.chat_modify`, `wa.chat_clear`, `wa.chat_delete`, `wa.set_disappearing`, `wa.block_contact`.
- **Kategori E (Profil & Privasi):** `wa.set_profile_name`, `wa.set_about`, `wa.set_profile_picture`, `wa.remove_profile_picture`, `wa.post_status`, `wa.delete_status`, `wa.update_privacy`, `wa.set_default_disappearing`.
- **Kategori F (Channel & Broadcast):** `wa.channel_manage`, `wa.channel_send`, `wa.broadcast`.
- **Kategori G (Media AI):** `ai.analyze_image`, `ai.ocr`, `ai.transcribe_audio`, `ai.summarize_document`, `ai.translate`, `ai.tts`, `ai.generate_image`, `ai.make_sticker`, `ai.describe_video`, `ai.create_file`.
- **Kategori H (Utilitas Lanjutan):** `web.search`, `util.reminder`.
- **Kategori I (Memori Lanjutan):** `memory.view_user`.
- **Kategori J (Kontrol Bot Lanjutan):** `bot.list_users`, `bot.set_persona`, `bot.set_chat_mode`, `bot.user_block`, `bot.user_quota`, `bot.user_set_role`, `bot.list_approvals`.

## Scripts

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server (tsx watch) + Web UI (Vite) sekaligus |
| `npm run dev:server` | Hanya server di port 3000 |
| `npm run dev:web` | Hanya Web UI di port 5173 |
| `npm run build` | Build Web UI + bundle server |
| `npm start` | Jalankan hasil build |
| `npm run typecheck` | TypeScript strict untuk seluruh workspace |
| `npm test` | Unit + pipeline test (Vitest) |
| `npm run test:watch` | Tes mode watch |

## Konfigurasi

Semua konfigurasi awal lewat `.env` (lihat `.env.example`). Nilai penting:

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Default aman; Docker memakai `0.0.0.0` |
| `PORT` | `3000` | Port API/Web UI |
| `DATA_DIR` | `./data` | SQLite + sesi WhatsApp |
| `ADMIN_TOKEN` | kosong | Wajib (≥16 karakter) untuk endpoint keputusan approval |
| `OWNER_JID` | kosong | JID Owner, mis. `628...@s.whatsapp.net` |
| `ACCESS_MODE` | `closed` | `closed`, `auto-member`, `approval` |
| `DEFAULT_CHAT_MODE` | `mention` | Mode grup default: `off`, `mention`, `active` |
| `PREFIX` | `.` | Prefix command |
| `WHATSAPP_MODE` | `mock` | `live`, `mock`, `off` |
| `WHATSAPP_AUTOCONNECT` | `false` | `true` untuk langsung pairing/connect saat startup |
| `WHATSAPP_MODULE` | `onigis` | Modul adapter WhatsApp; gunakan `onigis` |
| `AI_PROVIDER` | `mock` | `mock`, `openai`, atau `gemini` |
| `AI_MODEL` | per provider | Default: `mock`, `gpt-4o-mini` (OpenAI), `gemini-2.5-flash` (Gemini) |
| `AI_FALLBACK_MODEL` | kosong | Model cadangan bila model utama gagal |
| `AI_TIMEOUT_MS` | `60000` | Batas waktu satu request AI |
| `OPENAI_API_KEY` | kosong | Wajib untuk OpenAI/OpenRouter; boleh kosong untuk Ollama lokal |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Base URL endpoint kompatibel OpenAI |
| `GEMINI_API_KEY` | kosong | Wajib untuk provider Gemini |
| `GEMINI_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta` | Base URL Gemini |

Jangan commit `.env`. Secret tidak pernah dikirim ke prompt, log, atau Web UI; audit log
menyaring kunci yang menyerupai token/API key.

## Menguji pipeline tanpa WhatsApp

Dengan `WHATSAPP_MODE=mock` dan `NODE_ENV` bukan `production`:

```bash
curl -X POST http://127.0.0.1:3000/api/dev/inbound \
  -H "content-type: application/json" \
  -d '{"text":"halo","name":"Budi"}'
```

PowerShell:

```powershell
Invoke-RestMethod -Method Post http://127.0.0.1:3000/api/dev/inbound `
  -ContentType "application/json" `
  -Body '{"text":"halo","name":"Budi"}'
```

Respons berisi balasan bot. Untuk mencoba alur approval L1, isi `OWNER_JID` dengan JID
pengirim (mode mock), lalu kirim:

```json
{ "text": "kirim pesan ke 081234567890: rapat jam 3", "name": "Owner" }
```

Approval muncul di dashboard/antrean. Jika `OWNER_JID` diisi, Owner juga menerima
tombol WhatsApp; fallback teks memakai command:

```text
.approve #A7F3
.reject  #A7F3
.always  #A7F3
```

Keputusan lewat API (butuh `ADMIN_TOKEN`):

```bash
curl -X POST http://127.0.0.1:3000/api/approvals/%23A7F3/decision \
  -H "content-type: application/json" \
  -H "x-admin-token: <ADMIN_TOKEN>" \
  -d '{"decision":"approve"}'
```

> Endpoint API tetap sementara. Login Web UI dan tombol keputusan penuh masuk M3.

## Keamanan

- Default bind ke `127.0.0.1`; jangan ekspos API tanpa reverse proxy HTTPS.
- Login Web UI belum diimplementasikan (M3) — jangan host publik pada tahap ini.
- AI tidak memiliki tool untuk mengubah izin, role, konfigurasi, atau membaca secret.
- Semua aksi L1 wajib melewati Approval Engine; L2 hanya lewat Web UI.
- Prompt injection diperlakukan sebagai data; parameter tool divalidasi dan diaudit.
- Risiko pemblokiran WhatsApp: gunakan nomor khusus, rate limit, jitter, dan jam tenang.

Laporkan kerentanan sesuai [SECURITY.md](SECURITY.md).

## Roadmap

| Milestone | Status | Isi |
| --- | --- | --- |
| M0 Fondasi | ✅ | Repo, core, adapter onigis, SQLite, role |
| M1 AI Agent | ✅ | Provider OpenAI/Gemini, persona Jutek, ringkasan konteks otomatis (FR-08), fallback model |
| M2 Izin & approval | ✅ | Permission engine, resolver L0/L1/L2, 86 tool katalog, SSRF guard, tombol Native Flow, audit log |
| M3 Web UI | ✅ | Setup Wizard 6 langkah, auth scrypt & session tokens, manajemen grup & persona override, pairing code 8 digit, web memory manager |
| M4 Media | ⏳ | Analisis gambar, transkripsi voice note |
| M5 Hardening | ⏳ | Uji keamanan, dokumentasi, rilis v0.1 |
| M6 Pasca-rilis | ⏳ | Dokumen, TTS, stiker, Telegram/Discord |

## Lisensi

MIT — lihat [LICENSE](LICENSE). Atribusi Baileys/Onigi dipertahankan sesuai lisensi
upstream.
