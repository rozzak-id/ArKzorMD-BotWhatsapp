# Disclaimer & Risiko Pemblokiran WhatsApp

**Harap baca dokumen ini dengan seksama sebelum mengoperasikan ArKzorMD.**

---

## 1. Hubungan dengan WhatsApp / Meta

**ArKzorMD** adalah perangkat lunak sumber terbuka (open source) yang bersifat independen dan **tidak berafiliasi, disponsori, didukung, atau disetujui secara resmi oleh Meta Platforms, Inc. maupun WhatsApp Inc.**

WhatsApp adalah merek dagang terdaftar milik Meta Platforms, Inc. Segala penggunaan nama, merek, atau terminologi WhatsApp dalam proyek ini semata-mata bertujuan deskriptif teknis interoperabilitas perangkat lunak.

---

## 2. Risiko Pemblokiran Akun WhatsApp (Account Ban)

WhatsApp menerapkan sistem deteksi otomatis anti-spam dan anti-abuse yang ketat. Penggunaan bot otomatis, broadcast tanpa persetujuan, atau aktivitas yang tidak wajar dapat menyebabkan **penangguhan sementara (temporary ban) maupun pemblokiran permanen (permanent ban)** terhadap nomor telepon yang digunakan.

### Tindakan Pencegahan yang Diterapkan di ArKzorMD:
1. **Humanizer & Natural Typing Delay**: Memberikan jeda waktu mengetik dan kehadiran visual (*typing presence*) secara alami sebelum mengirim pesan.
2. **Rate Limiting Ketat**: Pembatasan jumlah pesan per menit (per chat dan global) untuk mencegah flooding.
3. **Jam Tenang (Quiet Hours)**: Mengatur periode di mana bot tidak memicu broadcast atau interaksi proaktif.
4. **Approval Engine**: Semua aksi berisiko tinggi (L1 seperti broadcast, kick member, teruskan pesan) wajib disetujui manual oleh Owner.
5. **Mode Akses Tertutup (Default `closed`)**: Bot hanya melayani Owner dan nomor terdaftar, mengabaikan spam dari nomor asing.

### Rekomendasi Pengguna:
- **Gunakan Nomor Khusus**: Jangan sekali-kali menghubungkan nomor pribadi utama Anda. Selalu gunakan nomor cadangan atau nomor bisnis khusus operasional bot.
- **Hindari Broadcast Massal Agresif**: Jangan mengirim pesan ke nomor yang tidak pernah menyimpan kontak Anda atau tidak pernah menginisiasi percakapan terlebih dahulu.
- **Tingkatkan Usia Akun**: Nomor baru yang langsung mengirim puluhan pesan memiliki rasio terkena ban yang sangat tinggi. Biasakan nomor berinteraksi normal terlebih dahulu.

---

## 3. Batasan Tanggung Jawab (Limitation of Liability)

Pengembang dan kontributor ArKzorMD **tidak bertanggung jawab** atas:
- Pemblokiran, penangguhan, atau kehilangan akses ke akun WhatsApp Anda.
- Kerugian finansial, kehilangan data, atau sengketa bisnis yang timbul dari penggunaan perangkat lunak ini.
- Pelanggaran hukum atau regulasi privasi data lokal akibat pesan atau data yang diproses oleh pengguna.

Perangkat lunak ini disediakan *"sebagaimana adanya"* (*AS IS*) tanpa jaminan apa pun, baik tersurat maupun tersirat, sebagaimana dinyatakan dalam lisensi MIT proyek ini.

