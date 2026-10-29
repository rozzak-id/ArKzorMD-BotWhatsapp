# Plugin ArKzorMD

Folder ini berisi contoh plugin yang dapat dijadikan templat.

| Plugin | Isi |
| --- | --- |
| `example-command` | Command `.hello` dengan argumen opsional |
| `example-tool` | Tool L0 `echo_note` |

Setiap plugin adalah paket workspace dengan dependensi `@arkzormd/core`. Daftarkan
definisinya di `apps/server/src/bootstrap.ts`. Panduan lengkap:
[docs/plugins.md](../docs/plugins.md).

Aturan singkat:

- Command: tanpa AI, roles eksplisit, audit untuk aksi yang mengubah data.
- Tool: skema parameter jelas, `risk` eksplisit (L0/L1/L2), validasi di handler.
- Jangan pernah melewati `PermissionEngine` atau menulis secret ke log/output.
