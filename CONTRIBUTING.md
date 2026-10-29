# Contributing ke ArKzorMD

Terima kasih sudah tertarik berkontribusi. Proyek ini menangani akun WhatsApp nyata, jadi
keamanan dan keterbacaan kode lebih penting daripada kecepatan fitur.

## Menyiapkan lingkungan

```bash
git clone <url-repo> arkzormd
cd arkzormd
cp .env.example .env
npm install
npm run typecheck
npm test
npm run dev
```

Persyaratan: Node.js ≥ 20.11, npm ≥ 10, Git.

## Alur kerja

1. Buat branch dari `main`: `feat/nama-fitur`, `fix/nama-bug`, atau `docs/topik`.
2. Buat perubahan sekecil mungkin dan fokus pada satu masalah.
3. Tambahkan atau perbarui tes bila menyentuh logika.
4. Jalankan `npm run typecheck`, `npm test`, dan `npm run build` sebelum membuka PR.
5. Tulis pesan commit yang jelas (disarankan Conventional Commits):
   - `feat(core): tambah validasi nomor tujuan`
   - `fix(approval): cegah keputusan ganda`
   - `docs: jelaskan mode mock`

## Aturan kode

- TypeScript strict; hindari `any` baru tanpa alasan kuat.
- Core tidak boleh mengimpor adapter atau SDK platform.
- Semua tool wajib punya `risk` dan `allowedRoles` eksplisit.
- Jangan menambahkan jalur eksekusi yang melewati `PermissionEngine`.
- Jangan pernah menulis secret, JID asli, atau isi percakapan pribadi ke log/tes/fixture.
- Pertahankan gaya desain Web UI: flat, border 1px, tanpa shadow/gradient/blur, target
  sentuh minimal 44px, status memakai warna **dan** teks/ikon.
- Ikuti struktur folder yang ada; jangan membuat abstraksi baru tanpa kebutuhan nyata.

## Kontribusi yang paling dibutuhkan

- Binding OnigiBaileys dan normalisasi pesan WhatsApp (M0).
- Provider AI OpenAI-compatible dan Gemini dengan tool calling (M1).
- Tombol approval WhatsApp + fallback teks + rehidrasi antrean setelah restart (M2).
- Auth Web UI, Setup Wizard, dan halaman pengelolaan (M3).
- Analisis gambar dan transkripsi voice note (M4).
- Dokumentasi, contoh plugin, dan perbaikan UX.

## Pull request checklist

- [ ] Tidak ada secret atau data pribadi.
- [ ] `npm run typecheck` dan `npm test` lulus.
- [ ] Perubahan izin/approval disertai tes.
- [ ] Dokumentasi diperbarui bila mengubah perilaku atau konfigurasi.
- [ ] Tidak ada dependensi baru yang tidak dijelaskan di PR.
- [ ] Lisensi dan atribusi upstream tetap utuh.

## Melaporkan bug keamanan

Jangan membuka issue publik untuk kerentanan. Ikuti [SECURITY.md](SECURITY.md).

## Komunitas

Dengan berpartisipasi, kamu menyetujui [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
Lisensi kontribusi mengikuti lisensi proyek (MIT).
