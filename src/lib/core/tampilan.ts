/**
 * Pembantu tampilan yang aman dipakai di server maupun klien (tanpa akses DB).
 */

/** Email berakhiran @siswa.local dibuat sistem, bukan email asli milik siswa. */
export function emailInternal(email: string | null | undefined): boolean {
  return !!email && email.endsWith("@siswa.local");
}

/**
 * Baris identitas di bawah nama peserta. Siswa yang mendaftar dengan nama saja
 * tidak punya email asli, jadi yang ditampilkan asal sekolahnya.
 */
export function identitasPeserta(
  email: string | null | undefined,
  asalSekolah?: string | null,
): string {
  if (email && !emailInternal(email)) return email;
  return asalSekolah?.trim() || "Login dengan nama";
}

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/**
 * "2026-08-28 09:15:00" -> "28 Agustus 2026, 09.15".
 * Nilai dibaca apa adanya (jam lokal server), tanpa konversi zona waktu.
 */
export function waktuIndo(nilai: string | null | undefined): string | null {
  const v = (nilai ?? "").trim();
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(v);
  if (!m) return v;
  const tgl = `${Number(m[3])} ${BULAN[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
  return m[4] ? `${tgl}, ${m[4]}.${m[5]}` : tgl;
}

/** "a", "a dan b", "a, b, dan c". */
function gabungFrasa(bagian: string[]): string {
  if (bagian.length <= 1) return bagian[0] ?? "";
  if (bagian.length === 2) return `${bagian[0]} dan ${bagian[1]}`;
  return `${bagian.slice(0, -1).join(", ")}, dan ${bagian.at(-1)}`;
}

/**
 * Kalimat pada dialog konfirmasi penghapusan akun. Angkanya disebutkan supaya
 * pengelola tahu persis apa yang ikut hilang sebelum menekan OK — menghapus
 * akun tidak bisa dibatalkan.
 */
/**
 * Kalimat pada dialog konfirmasi penghapusan RIWAYAT satu paket.
 *
 * Bedanya dengan `konfirmasiHapusAkun`: akun pesertanya tidak disentuh sama
 * sekali — yang hilang hanya pengerjaan, jawaban, nilai, dan pelanggaran pada
 * paket itu. Ditegaskan di kalimatnya supaya pengelola tidak mengira sedang
 * menghapus siswanya.
 */
export function konfirmasiHapusRiwayat(
  kode: string,
  jejak: { pengerjaan?: number; pelanggaran?: number; pilihanProdi?: number },
): string {
  if (!jejak.pengerjaan && !jejak.pilihanProdi) {
    return `Paket ${kode} belum punya riwayat pengerjaan sama sekali — tidak ada yang bisa dihapus.`;
  }

  const bagian: string[] = [];
  // Satu pengerjaan = satu peserta (attempts unik per user+paket), jadi angka
  // ini boleh langsung disebut sebagai jumlah peserta.
  if (jejak.pengerjaan) bagian.push(`pengerjaan ${jejak.pengerjaan} peserta`);
  if (jejak.pelanggaran) bagian.push(`${jejak.pelanggaran} catatan pelanggaran`);
  if (jejak.pilihanProdi) bagian.push(`${jejak.pilihanProdi} pilihan program studi`);

  return (
    `Hapus riwayat paket ${kode}? ${gabungFrasa(bagian)} ikut terhapus permanen ` +
    "beserta jawaban dan nilainya. Soal, jadwal, dan akun siswa TIDAK ikut terhapus — " +
    "peserta bisa mengerjakan paket ini lagi dari nol."
  );
}

/**
 * Kalimat konfirmasi Hapus Riwayat untuk paket IELTS.
 *
 * Berdiri sendiri dari kembarannya di atas karena isi riwayatnya memang
 * berbeda: IELTS tidak punya pilihan program studi, tetapi punya PENILAIAN
 * GURU — dan itu yang paling mahal hilangnya. Guru menilai Writing dan Speaking
 * satu per satu dengan empat kriteria; menghapusnya berarti seluruh pekerjaan
 * itu harus diulang dari awal, dan kalimat ini harus menyebutkannya.
 */
export function konfirmasiHapusRiwayatIelts(
  kode: string,
  jejak: { pengerjaan?: number; jawaban?: number; nilaiGuru?: number; pelanggaran?: number } = {},
): string {
  if (!jejak.pengerjaan) {
    return `Paket ${kode} belum punya riwayat pengerjaan sama sekali — tidak ada yang bisa dihapus.`;
  }

  const bagian: string[] = [];
  // Satu pengerjaan = satu peserta (`ielts_pengerjaan` unik per user+paket),
  // jadi angka ini boleh langsung disebut sebagai jumlah peserta.
  bagian.push(`pengerjaan ${jejak.pengerjaan} peserta`);
  if (jejak.jawaban) bagian.push(`${jejak.jawaban} jawaban`);
  if (jejak.nilaiGuru) bagian.push(`${jejak.nilaiGuru} penilaian guru`);
  if (jejak.pelanggaran) bagian.push(`${jejak.pelanggaran} catatan keamanan`);

  return (
    `Hapus riwayat paket ${kode}? ${gabungFrasa(bagian)} ikut terhapus permanen ` +
    "beserta band score-nya" +
    (jejak.nilaiGuru
      ? " — termasuk penilaian Writing dan Speaking yang harus dinilai ulang guru dari awal"
      : "") +
    ". Soal, rekaman, jadwal, dan akun siswa TIDAK ikut terhapus — peserta bisa " +
    "mengerjakan paket ini lagi dari nol."
  );
}

export function konfirmasiHapusAkun(
  nama: string,
  jejak: { tryout?: number; warung?: number; pelanggaran?: number },
): string {
  const bagian: string[] = [];
  if (jejak.tryout) bagian.push(`${jejak.tryout} pengerjaan tryout`);
  if (jejak.warung) bagian.push(`${jejak.warung} sesi Warung`);
  if (jejak.pelanggaran) bagian.push(`${jejak.pelanggaran} catatan pelanggaran`);

  return bagian.length === 0
    ? `Hapus akun ${nama}? Akun ini belum punya rekam jejak, tapi penghapusannya tetap permanen.`
    : `Hapus akun ${nama}? ${gabungFrasa(bagian)} ikut terhapus permanen dan tidak bisa dikembalikan.`;
}
