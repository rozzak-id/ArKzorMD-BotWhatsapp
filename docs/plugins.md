# Menulis command, tool, dan plugin

Semua fitur baru harus tetap melewati aturan izin. Jangan menambahkan jalur eksekusi yang
melewati `PermissionEngine`.

## 1. Command baru

Command adalah jalan pintas tanpa AI. Cocok untuk operasi cepat dan hemat token.

```ts
import type { CommandDefinition } from '@arkzormd/core';

export const pingCommand: CommandDefinition = {
  name: 'ping',
  description: 'Cek bot hidup',
  roles: ['owner', 'admin', 'member'],
  handler: (context) => `Pong! Role kamu: ${context.role}`,
};
```

Daftarkan di `apps/server/src/bootstrap.ts`:

```ts
commands.register(pingCommand);
```

Aturan:

- `name` tanpa prefix; prefix diatur router.
- `roles` wajib eksplisit. Jangan memakai `owner` untuk command yang tidak sensitif.
- Handler mengembalikan `string` (teks balasan) atau `Promise<string>`.
- Tulis audit untuk aksi yang mengubah data lewat `context.services.audit.record()`.
- Command tidak boleh memanggil provider AI.

## 2. Tool baru

Tool adalah aksi yang bisa dipilih AI. Metadata risiko, role, dan scope rules adalah bagian dari
keamanan yang ditegakkan oleh kode, bukan dokumentasi belaka.

Format entri `ToolDefinition` (sesuai Bagian 5 `docs/agent-prompt-and-tools.md`):

```ts
import type { ToolDefinition } from '@arkzormd/core';

export const remindTool: ToolDefinition = {
  name: 'util.reminder',
  category: 'web_utility',
  description: 'Set a reminder for oneself (L0) or for someone else (L1).',
  baseLevel: 'L0',
  scopeRules: [{ when: 'target orang lain', level: 'L1' }],
  minRole: 'member',
  rateLimit: { perMinute: 20, perChatPerMinute: 6 },
  relaxable: false,
  audit: true,
  priority: 'P1',
  implemented: true,
  params: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Reminder message' },
      when: { type: 'string', description: 'Due time in natural text or ISO' },
      target: { type: 'string', description: 'Target contact or chat (optional)' },
    },
    required: ['text', 'when'],
    additionalProperties: false,
  },
  async handler(context) {
    const text = String(context.params.text ?? '').trim();
    if (!text) return { ok: false, status: 'error', error: 'Teks pengingat kosong.' };
    // simpan lewat service yang disuntikkan, jangan akses DB global
    return { ok: true, status: 'ok', output: { text } };
  },
};
```

Daftarkan:

```ts
tools.register(remindTool);
```

### Memilih level risiko & Scope Rules

| Level | Kapan dipakai | Perilaku |
| --- | --- | --- |
| `L0` | Hanya menyentuh chat berjalan: balas, react, kirim media ke chat yang sama, utilitas lokal | Langsung jalan |
| `L1` | Menyentuh pihak lain atau mengubah keadaan akun: kirim ke kontak lain, kick, gabung grup, ubah profil, penerima >20 | Approval Owner |
| `L2` | Konfigurasi, secret, logout, operasi sistem, matikan kill switch | Selalu ditolak dari AI (hanya Web UI) |

Aturan penentu level efektif (`resolveEffectiveLevel`):

1. **Aksi chat berjalan:** `wa.reply`, `wa.react`, `wa.send_text` (tanpa `to`), edit pesan bot sendiri → `L0`.
2. **Aksi ke chat/kontak/grup lain:** `to` atau `target` berbeda dari chat berjalan → `L1`.
3. **Aksi pada akun bot:** ubah profil, nama, status, privasi, manajemen chat → `L1`.
4. **Aksi menimpa milik orang lain:** hapus pesan orang lain, kick, promote, demote → `L1`.
5. **Membaca chat lain, daftar chat, kontak:** → `L1`, khusus Owner (non-owner ditolak).
6. **Penerima banyak:** jumlah penerima > 20 (default, bisa diatur) → `L1`.
7. **L2 Terkunci:** konfigurasi, secret, kode, sesi → `L2`.

Aturan implementasi penting:

- Handler L1 **hanya boleh dieksekusi lewat callback `ApprovalEngine`** (`isApprovalExecution: true`). Eksekusi langsung di luar approval akan diblokir oleh `executeTool`.
- Validasi semua parameter di handler: tipe, panjang, normalisasi tujuan, batas penerima.
- Sertakan `additionalProperties: false` pada skema `params`.
- Tulis `description` dalam bahasa Inggris agar model AI memilih tool dengan akurat.
- Jangan mengembalikan secret di `output`; audit akan meredaksi kunci sensitif, tetapi jangan mengandalkan itu.
- Tool tidak boleh memanggil tool lain secara langsung; ajukan sebagai tool call terpisah.

## 3. Plugin

Plugin adalah paket workspace biasa. Struktur minimal:

```text
plugins/my-plugin/
├─ package.json        # name: @arkzormd/plugin-my-plugin
├─ tsconfig.json       # extends ../../tsconfig.base.json
└─ src/index.ts        # ekspor definisi
```

`package.json`:

```json
{
  "name": "@arkzormd/plugin-my-plugin",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "dependencies": { "@arkzormd/core": "0.1.0" }
}
```

`src/index.ts`:

```ts
import type { CommandDefinition, ToolDefinition } from '@arkzormd/core';

export function createMyPlugin(): {
  commands: CommandDefinition[];
  tools: ToolDefinition[];
} {
  return { commands: [/* ... */], tools: [/* ... */] };
}
```

Tambahkan paket ke `tsconfig.base.json` (`paths`) dan impor di bootstrap. Loader plugin
dinamis (folder `plugins/` dibaca saat runtime) direncanakan setelah v0.1 agar daftar tool
tetap dapat diaudit saat startup.

Contoh yang sudah ada:

- `plugins/example-command` — command `.hello`
- `plugins/example-tool` — tool L0 `echo_note`

## 4. Menambah platform

Implementasikan `PlatformAdapter`:

```ts
import type { PlatformAdapter } from '@arkzormd/core';

export class MyAdapter implements PlatformAdapter {
  readonly id = 'telegram' as const; // sesuaikan tipe Platform
  readonly capabilities = { buttons: true, voice: true, groups: true };
  // connect, disconnect, onMessage, send, sendApproval, getStatus
}
```

Aturan:

- Normalisasi pesan masuk ke `InternalMessage`; jangan bocorkan objek SDK ke core.
- `sendApproval` harus memakai fitur tombol resmi platform bila tersedia, dengan fallback
  teks. Approval harus tetap tampil di Web UI.
- Jangan menyimpan kredensial di luar `data/` atau penyimpanan terenkripsi.
- Tandai adapter yang belum selesai sebagai Coming Soon; jangan menampilkan tombol aktif.

## 5. Tes

Tambahkan tes di samping file yang diuji (`*.test.ts`). Minimal:

- Matriks izin: allow, approval, deny, kill switch, role salah.
- Validasi parameter tool (nomor tidak valid, teks kosong, panjang berlebih).
- Untuk alur penuh, gunakan `MockAdapter` + `MockProvider` seperti di
  `packages/core/src/bot.test.ts`.
- Jangan memakai jaringan atau akun WhatsApp asli dalam tes otomatis.

Jalankan:

```bash
npm run typecheck
npm test
```
