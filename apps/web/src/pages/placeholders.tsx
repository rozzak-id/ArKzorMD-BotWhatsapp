import { PlaceholderPage } from './placeholder';

export function GroupsPage() {
  return (
    <PlaceholderPage
      title="Mode grup"
      milestone="M3"
      description="Atur mode respons per grup: off, mention, atau aktif. Mode aktif penuh membutuhkan persetujuan Owner."
      planned={[
        'Daftar grup yang diketahui beserta mode aktifnya.',
        'Ubah mode off / mention / aktif per grup.',
        'Override persona per grup.',
        'Aksi ubah info grup dan kick/promote lewat approval L1.',
      ]}
    />
  );
}

export function MemoryPage() {
  return (
    <PlaceholderPage
      title="Memori"
      milestone="M1/M3"
      description="Memori jangka pendek per chat sudah berjalan di core (jendela 20 pesan). Halaman ini akan menampilkan memori jangka panjang per pengguna."
      planned={[
        'Lihat catatan fakta per pengguna.',
        'Hapus memori satu pengguna atau seluruh chat.',
        'Dukungan perintah “lupakan saya”.',
        'Kebijakan retensi dan ekspor data.',
      ]}
    />
  );
}

export function SetupPage() {
  return (
    <PlaceholderPage
      title="Setup Wizard"
      milestone="M3"
      description="Wizard langkah demi langkah untuk instalasi di bawah 10 menit: password admin, AI provider, koneksi WhatsApp, Owner, persona, dan pesan uji."
      planned={[
        'Langkah 1 — buat password admin Web UI.',
        'Langkah 2 — pilih AI provider, isi API key, tes koneksi.',
        'Langkah 3 — hubungkan WhatsApp lewat QR atau pairing code.',
        'Langkah 4 — verifikasi Owner lewat kode dari nomor Owner.',
        'Langkah 5 — pilih persona awal dan mode akses nomor asing.',
        'Langkah 6 — kirim pesan uji.',
      ]}
    />
  );
}
