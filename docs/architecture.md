# Arsitektur ArKzorMD

Dokumen ini menjelaskan bagaimana pesan mengalir, di mana keputusan izin diambil, dan
batas modul yang harus dijaga saat menambah fitur.

## Prinsip inti

1. **Kode yang memutuskan izin, AI hanya mengusulkan.** AI tidak memiliki tool untuk
   mengubah role, izin, konfigurasi, atau membaca secret.
2. **Default deny.** Tool baru dianggap berisiko sampai levelnya dinyatakan eksplisit.
3. **Satu pintu eksekusi.** Semua pemanggilan tool melewati `PermissionEngine`; aksi L1
   hanya dieksekusi setelah `ApprovalEngine` menerima keputusan Owner.
4. **Netral platform.** Core tidak mengimpor SDK WhatsApp/Telegram/Discord. Semua
   interaksi platform lewat `PlatformAdapter`.
5. **Transparan.** Keputusan, parameter asli, dan hasil eksekusi masuk `audit_logs`.

## Alur pesan

```text
WhatsApp  ⇄  onigis  ⇄  WhatsAppAdapter
                                     │ InternalMessage
                                     ▼
                             ┌──────────────┐
                             │     Bot      │  filter: bot sendiri, pesan lama,
                             │              │  user blocked, mode chat, role
                             └──────┬───────┘
                                    │
                     ┌──────────────┴──────────────┐
                     │ MessageRouter               │
                     │ prefix?                     │
                     └──────┬───────────────┬──────┘
                            │ ya            │ tidak
                            ▼               ▼
                     CommandRegistry   AgentOrchestrator
                     (tanpa AI)              │
                                             ▼
                                     PermissionEngine
                                    ┌────────┼─────────┐
                                 allow    approval     deny
                                    │        │           │
                                    ▼        ▼           ▼
                                 Tool    ApprovalEngine  audit
                                    │        │
                                    │        ▼
                                    │   DM Owner (tombol/fallback)
                                    │        │
                                    │        ▼
                                    │   execute setelah disetujui
                                    ▼
                             Humanizer + RateLimiter
                                    │
                                    ▼
                              WhatsAppAdapter.send
                                    │
                                    ▼
                               AuditLog (semua)
```

## Komponen

| Komponen | Lokasi | Tanggung jawab |
| --- | --- | --- |
| `Bot` | `packages/core/src/bot.ts` | Filter pesan, resolusi user/role, mode grup, routing, pengiriman, audit |
| `MessageRouter` | `router/router.ts` | Membedakan command vs percakapan AI |
| `CommandRegistry` | `router/command-registry.ts` | Metadata command + role yang boleh memakai |
| `PermissionEngine` | `security/permission-engine.ts` | Satu-satunya pemutus izin tool |
| `ApprovalEngine` | `security/approval-engine.ts` | Antrean, TTL, keputusan Owner, aturan “setuju selalu”, eksekusi |
| `AgentOrchestrator` | `agent/agent.ts` | Menyusun konteks, memanggil provider, loop tool calling |
| `AiProvider` | `agent/provider.ts` | Kontrak provider; `MockProvider` untuk M0 |
| `ToolRegistry` | `tools/registry.ts` | Skema tool, level risiko, role, eksekusi |
| `Humanizer` | `humanizer/humanizer.ts` | Jeda mengetik proporsional + jitter |
| `RateLimiter` | `rate-limit/rate-limiter.ts` | Batas pesan keluar global dan per chat |
| `Persona` | `persona/prompt.ts` + DB | Prompt sistem yang dibangun dari persona aktif |
| `AuditLog` | `audit/audit-log.ts` | Menulis audit + meredaksi nilai sensitif |
| `PlatformAdapter` | `types.ts` | Kontrak koneksi, kirim, approval, status |

## Matriks izin

| Aksi | Member | Admin | Owner |
| --- | --- | --- | --- |
| L0 (balas, react, media ke chat yang sama) | allow | allow | allow |
| L1 (kirim ke kontak lain, kick, ubah profil) | deny | approval | approval (satu ketuk) |
| L2 (config, secret, logout) | deny | deny | deny dari AI |

Kill switch memblokir seluruh L1 sebelum aturan “setuju selalu” diperiksa. L0 tetap
berjalan agar percakapan dasar tidak mati.

## Siklus approval

1. Agent mengusulkan tool call L1.
2. `PermissionEngine` mengembalikan `approval` (kecuali kill switch aktif atau ada aturan
   “setuju selalu”).
3. `ApprovalEngine.create()` menyimpan request: UUID, kode pendek `#A7F3`, pemohon, role,
   tool, **parameter asli**, chat asal, waktu dibuat, kedaluwarsa (default 5 menit).
4. `Bot` mengirim DM ke Owner lewat `adapter.sendApproval()` — tombol interaktif
   (`onigis` rich-classic) dengan teks fallback berisi command.
5. Hanya JID Owner yang dikonfigurasi dapat memutuskan. Keputusan diverifikasi di engine,
   bukan dari teks AI. Owner dapat memakai tombol WhatsApp atau command
   `.approve/.reject/.always <kode>` yang diproses `CommandRegistry`.
6. `approve` / `always` menjalankan tool lewat decision handler milik `Bot`; `always`
   sekaligus membuat aturan `(tool, target)` tanpa kedaluwarsa.
7. Hasil eksekusi dan keputusan masuk audit.

Catatan M0: executor approval belum dihidrasi ulang setelah restart. Parameter sudah
tersimpan di database, sehingga M2 cukup membangun ulang eksekusi dari `tool_name` +
`params` + `chat_id` tanpa mengubah skema.

## Skema database (v1)

| Tabel | Isi |
| --- | --- |
| `users` | JID, role, status, kuota |
| `personas` | Persona + konfigurasi JSON + status aktif |
| `persona_assignments` | Override persona per chat/grup (disiapkan) |
| `chats` | Tipe chat dan mode respons |
| `messages` | Riwayat untuk memori jangka pendek |
| `memory_notes` | Memori jangka panjang (disiapkan) |
| `approvals` | Request approval + status + parameter |
| `approval_rules` | Aturan setuju selalu |
| `audit_logs` | Aktor, aksi, parameter, hasil |
| `settings` | Konfigurasi runtime (kill switch, prefix, dll.) |
| `secrets` | API key terenkripsi (disiapkan) |

Database dibuka oleh `openDatabase()` di `packages/core/src/db/index.ts`. Untuk perubahan
skema berikutnya, tambahkan migrasi dan naikkan `PRAGMA user_version`; jangan mengubah
tabel yang sudah dirilis.

## Batas modul

- **Core tidak boleh mengimpor adapter.** Adapter mengimpor tipe/kontrak core.
- **Adapter tidak boleh mengambil keputusan izin.** Tugasnya hanya menerjemahkan pesan dan
  mengirim konten.
- **Tool tidak boleh mengubah database izin.** Tool menerima `ToolContext` dan
  mengembalikan `ToolResult`.
- **Web/API tidak boleh mengeksekusi tool langsung.** Gunakan `Bot`/`ApprovalEngine` agar
  audit dan izin tetap konsisten.
- **Secret tidak pernah masuk prompt.** Provider hanya menerima pesan dan skema tool.

## Titik ekstensi

| Kebutuhan | Cara |
| --- | --- |
| Command baru | Daftarkan `CommandDefinition` ke `CommandRegistry` |
| Tool baru | Daftarkan `ToolDefinition` ke `ToolRegistry` dengan risk + roles |
| Platform baru | Implementasikan `PlatformAdapter` |
| Provider AI baru | Implementasikan `AiProvider` |
| Persona | Tambah baris `personas`, aktifkan lewat store |
| Plugin | Paket workspace yang mengekspor definisi command/tool |

Panduan praktis: [plugins.md](plugins.md).

## Status implementasi

- Core pipeline, permission, approval, audit, SQLite, API, dan Web UI shell: berjalan.
- WhatsApp: `WhatsAppAdapter` memakai `onigis` 10.1.0-rc.12 untuk koneksi/QR,
  reconnect backoff, normalisasi pesan (termasuk LID→PN), kirim teks/media/reaction,
  serta tombol approval + fallback command. Live memerlukan Linux x64/arm64 karena
  E2EE native `oktz-signal`/`oktz-curve25519`; mode `mock` tetap dipakai di Windows/macOS.
- Provider AI: hanya `MockProvider`; provider OpenAI-compatible/Gemini masuk M1.
- Auth Web UI, Setup Wizard, rehidrasi approval setelah restart, dan media masuk M2–M4.
