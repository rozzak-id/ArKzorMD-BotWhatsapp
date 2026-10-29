# ArKzorMD

Bot AI WhatsApp **hybrid** yang open source dan di-host sendiri. Pengguna bisa memakai
command berawalan titik (`.menu`, `.help`, …), tetapi **AI menjadi pengendali utama**:
cukup bicara biasa, AI memahami maksud dan menjalankan aksi lewat tool. Setiap aksi
berisiko melewati **Permission Engine** dan **persetujuan Owner** yang ditegakkan oleh
kode — bukan oleh AI.

Status saat ini: **M0 — fondasi**. Struktur repo, core pipeline, permission/approval,
SQLite, API server, dan kerangka Web UI sudah berjalan dengan provider AI dan adapter
WhatsApp mode **mock**. Integrasi OnigiBaileys dan provider AI asli menyusul di M0/M1.

> ⚠️ **Risiko akun WhatsApp.** Bot ini memakai protokol tidak resmi (OnigiBaileys/Baileys).
> Gunakan nomor khusus, jangan nomor utama. Risiko pemblokiran ada pada pengguna. Baca
> [SECURITY.md](SECURITY.md) sebelum menghubungkan akun.

## Daftar isi

- [Fitur yang sudah ada](#fitur-yang-sudah-ada)
- [Persyaratan](#persyaratan)
- [Mulai cepat](#mulai-cepat)
- [Menjalankan dengan Docker](#menjalankan-dengan-docker)
- [Struktur repo](#struktur-repo)
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
| Web UI flat | ✅ (shell) | Dashboard live, persona, pengguna, approval, tools, audit, platform |
| API + WebSocket | ✅ | Status real-time, endpoint approval ber-token |
| Adapter WhatsApp | 🚧 seam | Binding OnigiBaileys belum aktif (paket belum tersedia di npm) |
| Provider AI asli | 🚧 | Antarmuka siap; implementasi OpenAI-compatible/Gemini di M1 |
| Adapter Telegram/Discord | 🚧 stub | Kartu Coming Soon di Web UI |
| Media (gambar, VN, PDF, TTS, stiker) | ⏳ | M4/M6 |

## Persyaratan

- **Node.js ≥ 20.11** (disarankan 22 LTS atau 24)
- npm ≥ 10 (npm workspaces)
- Linux, macOS, atau Windows
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

Secara default `WHATSAPP_MODE=mock`, jadi bot berjalan tanpa akun WhatsApp. Ubah `.env`
menjadi `WHATSAPP_MODE=live` setelah binding OnigiBaileys tersedia.

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
│  ├─ adapter-whatsapp/        # seam OnigiBaileys (binding M0)
│  ├─ adapter-telegram/        # stub Coming Soon
│  └─ adapter-discord/         # stub Coming Soon
├─ apps/
│  ├─ server/                  # Fastify API + proses bot + WebSocket
│  └─ web/                     # Preact + Vite, desain flat
├─ plugins/
│  ├─ example-command/         # contoh command plugin (.hello)
│  └─ example-tool/            # contoh tool plugin (echo_note)
├─ docs/
│  ├─ architecture.md
│  └─ plugins.md
├─ docker-compose.yml
├─ Dockerfile
├─ .env.example
└─ README.md
```

Penjelasan arsitektur: [docs/architecture.md](docs/architecture.md).  
Panduan menambah command/tool: [docs/plugins.md](docs/plugins.md).

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
| `AI_PROVIDER` | `mock` | Hanya `mock` yang aktif di M0 |

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

Approval muncul di dashboard/antrean. Keputusan dari API (butuh `ADMIN_TOKEN`):

```bash
curl -X POST http://127.0.0.1:3000/api/approvals/%23A7F3/decision \
  -H "content-type: application/json" \
  -H "x-admin-token: <ADMIN_TOKEN>" \
  -d '{"decision":"approve"}'
```

> Endpoint ini sementara. Login Web UI, tombol WhatsApp, dan UI keputusan penuh masuk M2/M3.

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
| M0 Fondasi | 🚧 | Repo, core, adapter WA, SQLite, role — binding OnigiBaileys tersisa |
| M1 AI Agent | ⏳ | Provider asli, persona, memori, fallback model |
| M2 Izin & approval | 🚧 | Engine selesai; tombol WhatsApp, rehidrasi antrean, UI keputusan |
| M3 Web UI | 🚧 | Shell selesai; auth, wizard, editor, aksi pengguna |
| M4 Media | ⏳ | Analisis gambar, transkripsi voice note |
| M5 Hardening | ⏳ | Uji keamanan, dokumentasi, rilis v0.1 |
| M6 Pasca-rilis | ⏳ | Dokumen, TTS, stiker, memori panjang, Telegram/Discord |

## Lisensi

MIT — lihat [LICENSE](LICENSE). Atribusi Baileys/OnigiBaileys dipertahankan sesuai
lisensi upstream.
