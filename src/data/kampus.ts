/**
 * ===================================================================
 *  BASIS DATA NILAI UTBK MINIMUM PER PRODI — ADZKIA SMART
 * ===================================================================
 *
 *  ⚠️  PENTING — ANGKA DI BAWAH INI ADALAH **ESTIMASI**, BUKAN ANGKA RESMI.
 *
 *  SNPMB/LTMPT tidak pernah menerbitkan "nilai minimum diterima" (passing
 *  grade) secara resmi. Angka `skor_min`, `daya_tampung`, dan `peminat` di
 *  berkas ini disusun dari rentang yang umum beredar di lembaga bimbingan
 *  belajar dan laporan peserta SNBT tahun-tahun terakhir, lalu dibulatkan.
 *  Fungsinya hanya sebagai **ancar-ancar** supaya siswa punya gambaran
 *  posisi dirinya — bukan jaminan lolos atau tidak lolos.
 *
 *  Nilai sesungguhnya berubah tiap tahun mengikuti tingkat kesulitan soal,
 *  jumlah peminat, dan daya tampung yang ditetapkan masing-masing PTN.
 *
 *  ✏️  ADMIN BOLEH MENYUNTING. Data ini hanya dipakai sebagai benih (seed)
 *  awal tabel `campuses`. Setelah tabel terisi, seeding tidak akan menimpa
 *  apa pun (idempoten), sehingga admin bebas memperbarui angka langsung di
 *  basis data tanpa takut tertimpa berkas ini. Untuk memaksa muat ulang dari
 *  berkas, panggil `seedKampus({ paksa: true })` di `src/lib/kampus.ts`.
 *
 *  Skala skor: 0–1000 (skala UTBK-SNBT).
 * ===================================================================
 */

export type KelompokUjian = "Saintek" | "Soshum";

export interface DataKampus {
  ptn: string;
  prodi: string;
  kelompok: KelompokUjian;
  jenjang: string;
  /** Estimasi skor UTBK minimum yang biasanya diterima. */
  skor_min: number;
  /** Estimasi kuota kursi jalur SNBT. */
  daya_tampung: number;
  /** Estimasi jumlah pendaftar tahun sebelumnya. */
  peminat: number;
}

export const DATA_KAMPUS: DataKampus[] = [
  /* ---------------- Universitas Indonesia ---------------- */
  { ptn: "Universitas Indonesia", prodi: "Pendidikan Dokter", kelompok: "Saintek", jenjang: "S1", skor_min: 780, daya_tampung: 70, peminat: 2400 },
  { ptn: "Universitas Indonesia", prodi: "Ilmu Komputer", kelompok: "Saintek", jenjang: "S1", skor_min: 748, daya_tampung: 60, peminat: 2100 },
  { ptn: "Universitas Indonesia", prodi: "Pendidikan Dokter Gigi", kelompok: "Saintek", jenjang: "S1", skor_min: 722, daya_tampung: 45, peminat: 1100 },
  { ptn: "Universitas Indonesia", prodi: "Teknik Industri", kelompok: "Saintek", jenjang: "S1", skor_min: 718, daya_tampung: 50, peminat: 1500 },
  { ptn: "Universitas Indonesia", prodi: "Teknik Elektro", kelompok: "Saintek", jenjang: "S1", skor_min: 705, daya_tampung: 45, peminat: 950 },
  { ptn: "Universitas Indonesia", prodi: "Farmasi", kelompok: "Saintek", jenjang: "S1", skor_min: 700, daya_tampung: 45, peminat: 1200 },
  { ptn: "Universitas Indonesia", prodi: "Arsitektur", kelompok: "Saintek", jenjang: "S1", skor_min: 692, daya_tampung: 40, peminat: 900 },
  { ptn: "Universitas Indonesia", prodi: "Teknik Kimia", kelompok: "Saintek", jenjang: "S1", skor_min: 688, daya_tampung: 40, peminat: 800 },
  { ptn: "Universitas Indonesia", prodi: "Ilmu Gizi", kelompok: "Saintek", jenjang: "S1", skor_min: 668, daya_tampung: 40, peminat: 900 },
  { ptn: "Universitas Indonesia", prodi: "Ilmu Keperawatan", kelompok: "Saintek", jenjang: "S1", skor_min: 632, daya_tampung: 45, peminat: 700 },
  { ptn: "Universitas Indonesia", prodi: "Hubungan Internasional", kelompok: "Soshum", jenjang: "S1", skor_min: 742, daya_tampung: 40, peminat: 2000 },
  { ptn: "Universitas Indonesia", prodi: "Ilmu Komunikasi", kelompok: "Soshum", jenjang: "S1", skor_min: 736, daya_tampung: 45, peminat: 2200 },
  { ptn: "Universitas Indonesia", prodi: "Ilmu Hukum", kelompok: "Soshum", jenjang: "S1", skor_min: 730, daya_tampung: 90, peminat: 2600 },
  { ptn: "Universitas Indonesia", prodi: "Psikologi", kelompok: "Soshum", jenjang: "S1", skor_min: 722, daya_tampung: 50, peminat: 1900 },
  { ptn: "Universitas Indonesia", prodi: "Manajemen", kelompok: "Soshum", jenjang: "S1", skor_min: 720, daya_tampung: 55, peminat: 2000 },
  { ptn: "Universitas Indonesia", prodi: "Akuntansi", kelompok: "Soshum", jenjang: "S1", skor_min: 714, daya_tampung: 50, peminat: 1700 },
  { ptn: "Universitas Indonesia", prodi: "Ilmu Ekonomi", kelompok: "Soshum", jenjang: "S1", skor_min: 698, daya_tampung: 45, peminat: 1200 },
  { ptn: "Universitas Indonesia", prodi: "Sastra Inggris", kelompok: "Soshum", jenjang: "S1", skor_min: 665, daya_tampung: 35, peminat: 800 },

  /* ---------------- Institut Teknologi Bandung ---------------- */
  { ptn: "Institut Teknologi Bandung", prodi: "STEI - Komputasi", kelompok: "Saintek", jenjang: "S1", skor_min: 762, daya_tampung: 120, peminat: 3200 },
  { ptn: "Institut Teknologi Bandung", prodi: "Sekolah Farmasi", kelompok: "Saintek", jenjang: "S1", skor_min: 692, daya_tampung: 70, peminat: 1200 },
  { ptn: "Institut Teknologi Bandung", prodi: "Fakultas Teknologi Industri", kelompok: "Saintek", jenjang: "S1", skor_min: 722, daya_tampung: 150, peminat: 2400 },
  { ptn: "Institut Teknologi Bandung", prodi: "Fakultas Teknik Mesin dan Dirgantara", kelompok: "Saintek", jenjang: "S1", skor_min: 714, daya_tampung: 130, peminat: 1900 },
  { ptn: "Institut Teknologi Bandung", prodi: "Fakultas Teknik Sipil dan Lingkungan", kelompok: "Saintek", jenjang: "S1", skor_min: 704, daya_tampung: 150, peminat: 1800 },
  { ptn: "Institut Teknologi Bandung", prodi: "Fakultas Teknik Pertambangan dan Perminyakan", kelompok: "Saintek", jenjang: "S1", skor_min: 700, daya_tampung: 100, peminat: 1500 },
  { ptn: "Institut Teknologi Bandung", prodi: "Sekolah Arsitektur Perencanaan dan Pengembangan Kebijakan", kelompok: "Saintek", jenjang: "S1", skor_min: 698, daya_tampung: 90, peminat: 1400 },
  { ptn: "Institut Teknologi Bandung", prodi: "Fakultas MIPA", kelompok: "Saintek", jenjang: "S1", skor_min: 678, daya_tampung: 140, peminat: 1600 },
  { ptn: "Institut Teknologi Bandung", prodi: "Manajemen (SBM)", kelompok: "Soshum", jenjang: "S1", skor_min: 730, daya_tampung: 60, peminat: 1800 },

  /* ---------------- Universitas Gadjah Mada ---------------- */
  { ptn: "Universitas Gadjah Mada", prodi: "Kedokteran", kelompok: "Saintek", jenjang: "S1", skor_min: 752, daya_tampung: 60, peminat: 2300 },
  { ptn: "Universitas Gadjah Mada", prodi: "Teknologi Informasi", kelompok: "Saintek", jenjang: "S1", skor_min: 730, daya_tampung: 50, peminat: 1800 },
  { ptn: "Universitas Gadjah Mada", prodi: "Ilmu Komputer", kelompok: "Saintek", jenjang: "S1", skor_min: 726, daya_tampung: 45, peminat: 1700 },
  { ptn: "Universitas Gadjah Mada", prodi: "Teknik Kimia", kelompok: "Saintek", jenjang: "S1", skor_min: 702, daya_tampung: 50, peminat: 1200 },
  { ptn: "Universitas Gadjah Mada", prodi: "Teknik Elektro", kelompok: "Saintek", jenjang: "S1", skor_min: 700, daya_tampung: 45, peminat: 1100 },
  { ptn: "Universitas Gadjah Mada", prodi: "Farmasi", kelompok: "Saintek", jenjang: "S1", skor_min: 692, daya_tampung: 55, peminat: 1300 },
  { ptn: "Universitas Gadjah Mada", prodi: "Kedokteran Gigi", kelompok: "Saintek", jenjang: "S1", skor_min: 690, daya_tampung: 45, peminat: 1000 },
  { ptn: "Universitas Gadjah Mada", prodi: "Teknik Sipil", kelompok: "Saintek", jenjang: "S1", skor_min: 686, daya_tampung: 50, peminat: 1100 },
  { ptn: "Universitas Gadjah Mada", prodi: "Gizi Kesehatan", kelompok: "Saintek", jenjang: "S1", skor_min: 668, daya_tampung: 40, peminat: 850 },
  { ptn: "Universitas Gadjah Mada", prodi: "Manajemen", kelompok: "Soshum", jenjang: "S1", skor_min: 722, daya_tampung: 55, peminat: 2000 },
  { ptn: "Universitas Gadjah Mada", prodi: "Hubungan Internasional", kelompok: "Soshum", jenjang: "S1", skor_min: 720, daya_tampung: 40, peminat: 1700 },
  { ptn: "Universitas Gadjah Mada", prodi: "Akuntansi", kelompok: "Soshum", jenjang: "S1", skor_min: 716, daya_tampung: 50, peminat: 1600 },
  { ptn: "Universitas Gadjah Mada", prodi: "Ilmu Komunikasi", kelompok: "Soshum", jenjang: "S1", skor_min: 712, daya_tampung: 40, peminat: 1800 },
  { ptn: "Universitas Gadjah Mada", prodi: "Psikologi", kelompok: "Soshum", jenjang: "S1", skor_min: 706, daya_tampung: 50, peminat: 1500 },
  { ptn: "Universitas Gadjah Mada", prodi: "Ilmu Hukum", kelompok: "Soshum", jenjang: "S1", skor_min: 700, daya_tampung: 90, peminat: 2100 },

  /* ---------------- Universitas Padjadjaran ---------------- */
  { ptn: "Universitas Padjadjaran", prodi: "Kedokteran", kelompok: "Saintek", jenjang: "S1", skor_min: 722, daya_tampung: 65, peminat: 2000 },
  { ptn: "Universitas Padjadjaran", prodi: "Farmasi", kelompok: "Saintek", jenjang: "S1", skor_min: 690, daya_tampung: 50, peminat: 1200 },
  { ptn: "Universitas Padjadjaran", prodi: "Teknik Informatika", kelompok: "Saintek", jenjang: "S1", skor_min: 678, daya_tampung: 40, peminat: 1300 },
  { ptn: "Universitas Padjadjaran", prodi: "Kedokteran Gigi", kelompok: "Saintek", jenjang: "S1", skor_min: 672, daya_tampung: 45, peminat: 900 },
  { ptn: "Universitas Padjadjaran", prodi: "Ilmu Keperawatan", kelompok: "Saintek", jenjang: "S1", skor_min: 630, daya_tampung: 50, peminat: 800 },
  { ptn: "Universitas Padjadjaran", prodi: "Agroteknologi", kelompok: "Saintek", jenjang: "S1", skor_min: 598, daya_tampung: 60, peminat: 600 },
  { ptn: "Universitas Padjadjaran", prodi: "Ilmu Komunikasi", kelompok: "Soshum", jenjang: "S1", skor_min: 692, daya_tampung: 55, peminat: 1900 },
  { ptn: "Universitas Padjadjaran", prodi: "Hubungan Internasional", kelompok: "Soshum", jenjang: "S1", skor_min: 690, daya_tampung: 40, peminat: 1500 },
  { ptn: "Universitas Padjadjaran", prodi: "Psikologi", kelompok: "Soshum", jenjang: "S1", skor_min: 688, daya_tampung: 45, peminat: 1400 },
  { ptn: "Universitas Padjadjaran", prodi: "Manajemen", kelompok: "Soshum", jenjang: "S1", skor_min: 684, daya_tampung: 50, peminat: 1500 },
  { ptn: "Universitas Padjadjaran", prodi: "Akuntansi", kelompok: "Soshum", jenjang: "S1", skor_min: 680, daya_tampung: 50, peminat: 1300 },
  { ptn: "Universitas Padjadjaran", prodi: "Ilmu Hukum", kelompok: "Soshum", jenjang: "S1", skor_min: 674, daya_tampung: 80, peminat: 1800 },

  /* ---------------- Universitas Diponegoro ---------------- */
  { ptn: "Universitas Diponegoro", prodi: "Kedokteran", kelompok: "Saintek", jenjang: "S1", skor_min: 706, daya_tampung: 60, peminat: 1900 },
  { ptn: "Universitas Diponegoro", prodi: "Teknik Informatika", kelompok: "Saintek", jenjang: "S1", skor_min: 682, daya_tampung: 45, peminat: 1400 },
  { ptn: "Universitas Diponegoro", prodi: "Teknik Kimia", kelompok: "Saintek", jenjang: "S1", skor_min: 666, daya_tampung: 50, peminat: 1000 },
  { ptn: "Universitas Diponegoro", prodi: "Farmasi", kelompok: "Saintek", jenjang: "S1", skor_min: 660, daya_tampung: 40, peminat: 950 },
  { ptn: "Universitas Diponegoro", prodi: "Teknik Elektro", kelompok: "Saintek", jenjang: "S1", skor_min: 656, daya_tampung: 45, peminat: 850 },
  { ptn: "Universitas Diponegoro", prodi: "Teknik Sipil", kelompok: "Saintek", jenjang: "S1", skor_min: 654, daya_tampung: 50, peminat: 900 },
  { ptn: "Universitas Diponegoro", prodi: "Kesehatan Masyarakat", kelompok: "Saintek", jenjang: "S1", skor_min: 628, daya_tampung: 55, peminat: 750 },
  { ptn: "Universitas Diponegoro", prodi: "Ilmu Komunikasi", kelompok: "Soshum", jenjang: "S1", skor_min: 668, daya_tampung: 45, peminat: 1400 },
  { ptn: "Universitas Diponegoro", prodi: "Akuntansi", kelompok: "Soshum", jenjang: "S1", skor_min: 666, daya_tampung: 50, peminat: 1200 },
  { ptn: "Universitas Diponegoro", prodi: "Manajemen", kelompok: "Soshum", jenjang: "S1", skor_min: 664, daya_tampung: 50, peminat: 1300 },
  { ptn: "Universitas Diponegoro", prodi: "Hubungan Internasional", kelompok: "Soshum", jenjang: "S1", skor_min: 658, daya_tampung: 35, peminat: 1000 },
  { ptn: "Universitas Diponegoro", prodi: "Ilmu Hukum", kelompok: "Soshum", jenjang: "S1", skor_min: 648, daya_tampung: 85, peminat: 1500 },

  /* ---------------- IPB University ---------------- */
  { ptn: "IPB University", prodi: "Ilmu Komputer", kelompok: "Saintek", jenjang: "S1", skor_min: 682, daya_tampung: 45, peminat: 1300 },
  { ptn: "IPB University", prodi: "Statistika dan Sains Data", kelompok: "Saintek", jenjang: "S1", skor_min: 672, daya_tampung: 40, peminat: 1000 },
  { ptn: "IPB University", prodi: "Teknologi Pangan", kelompok: "Saintek", jenjang: "S1", skor_min: 658, daya_tampung: 50, peminat: 950 },
  { ptn: "IPB University", prodi: "Kedokteran Hewan", kelompok: "Saintek", jenjang: "S1", skor_min: 640, daya_tampung: 45, peminat: 800 },
  { ptn: "IPB University", prodi: "Teknik Sipil dan Lingkungan", kelompok: "Saintek", jenjang: "S1", skor_min: 626, daya_tampung: 45, peminat: 700 },
  { ptn: "IPB University", prodi: "Agribisnis", kelompok: "Saintek", jenjang: "S1", skor_min: 618, daya_tampung: 55, peminat: 750 },
  { ptn: "IPB University", prodi: "Manajemen", kelompok: "Soshum", jenjang: "S1", skor_min: 652, daya_tampung: 40, peminat: 1100 },
  { ptn: "IPB University", prodi: "Ekonomi Pembangunan", kelompok: "Soshum", jenjang: "S1", skor_min: 628, daya_tampung: 40, peminat: 700 },

  /* ---------------- Institut Teknologi Sepuluh Nopember ---------------- */
  { ptn: "Institut Teknologi Sepuluh Nopember", prodi: "Teknik Informatika", kelompok: "Saintek", jenjang: "S1", skor_min: 716, daya_tampung: 60, peminat: 2000 },
  { ptn: "Institut Teknologi Sepuluh Nopember", prodi: "Teknik Industri", kelompok: "Saintek", jenjang: "S1", skor_min: 690, daya_tampung: 55, peminat: 1400 },
  { ptn: "Institut Teknologi Sepuluh Nopember", prodi: "Sistem Informasi", kelompok: "Saintek", jenjang: "S1", skor_min: 686, daya_tampung: 45, peminat: 1300 },
  { ptn: "Institut Teknologi Sepuluh Nopember", prodi: "Teknik Elektro", kelompok: "Saintek", jenjang: "S1", skor_min: 680, daya_tampung: 55, peminat: 1200 },
  { ptn: "Institut Teknologi Sepuluh Nopember", prodi: "Teknik Mesin", kelompok: "Saintek", jenjang: "S1", skor_min: 670, daya_tampung: 55, peminat: 1100 },
  { ptn: "Institut Teknologi Sepuluh Nopember", prodi: "Teknik Kimia", kelompok: "Saintek", jenjang: "S1", skor_min: 664, daya_tampung: 50, peminat: 950 },
  { ptn: "Institut Teknologi Sepuluh Nopember", prodi: "Arsitektur", kelompok: "Saintek", jenjang: "S1", skor_min: 660, daya_tampung: 40, peminat: 800 },
  { ptn: "Institut Teknologi Sepuluh Nopember", prodi: "Manajemen Bisnis", kelompok: "Soshum", jenjang: "S1", skor_min: 666, daya_tampung: 40, peminat: 1100 },

  /* ---------------- Universitas Airlangga ---------------- */
  { ptn: "Universitas Airlangga", prodi: "Kedokteran", kelompok: "Saintek", jenjang: "S1", skor_min: 732, daya_tampung: 60, peminat: 2100 },
  { ptn: "Universitas Airlangga", prodi: "Farmasi", kelompok: "Saintek", jenjang: "S1", skor_min: 690, daya_tampung: 50, peminat: 1200 },
  { ptn: "Universitas Airlangga", prodi: "Kedokteran Gigi", kelompok: "Saintek", jenjang: "S1", skor_min: 682, daya_tampung: 45, peminat: 950 },
  { ptn: "Universitas Airlangga", prodi: "Teknologi Sains Data", kelompok: "Saintek", jenjang: "S1", skor_min: 670, daya_tampung: 40, peminat: 1000 },
  { ptn: "Universitas Airlangga", prodi: "Kesehatan Masyarakat", kelompok: "Saintek", jenjang: "S1", skor_min: 640, daya_tampung: 50, peminat: 800 },
  { ptn: "Universitas Airlangga", prodi: "Keperawatan", kelompok: "Saintek", jenjang: "S1", skor_min: 628, daya_tampung: 50, peminat: 700 },
  { ptn: "Universitas Airlangga", prodi: "Manajemen", kelompok: "Soshum", jenjang: "S1", skor_min: 686, daya_tampung: 50, peminat: 1500 },
  { ptn: "Universitas Airlangga", prodi: "Hubungan Internasional", kelompok: "Soshum", jenjang: "S1", skor_min: 684, daya_tampung: 40, peminat: 1300 },
  { ptn: "Universitas Airlangga", prodi: "Psikologi", kelompok: "Soshum", jenjang: "S1", skor_min: 682, daya_tampung: 45, peminat: 1300 },
  { ptn: "Universitas Airlangga", prodi: "Akuntansi", kelompok: "Soshum", jenjang: "S1", skor_min: 680, daya_tampung: 50, peminat: 1200 },
  { ptn: "Universitas Airlangga", prodi: "Ilmu Komunikasi", kelompok: "Soshum", jenjang: "S1", skor_min: 678, daya_tampung: 40, peminat: 1400 },
  { ptn: "Universitas Airlangga", prodi: "Ilmu Hukum", kelompok: "Soshum", jenjang: "S1", skor_min: 674, daya_tampung: 85, peminat: 1600 },

  /* ---------------- Universitas Brawijaya ---------------- */
  { ptn: "Universitas Brawijaya", prodi: "Kedokteran", kelompok: "Saintek", jenjang: "S1", skor_min: 692, daya_tampung: 60, peminat: 1800 },
  { ptn: "Universitas Brawijaya", prodi: "Teknik Informatika", kelompok: "Saintek", jenjang: "S1", skor_min: 666, daya_tampung: 50, peminat: 1400 },
  { ptn: "Universitas Brawijaya", prodi: "Farmasi", kelompok: "Saintek", jenjang: "S1", skor_min: 658, daya_tampung: 45, peminat: 950 },
  { ptn: "Universitas Brawijaya", prodi: "Teknologi Informasi", kelompok: "Saintek", jenjang: "S1", skor_min: 654, daya_tampung: 45, peminat: 1100 },
  { ptn: "Universitas Brawijaya", prodi: "Teknik Sipil", kelompok: "Saintek", jenjang: "S1", skor_min: 620, daya_tampung: 50, peminat: 800 },
  { ptn: "Universitas Brawijaya", prodi: "Agribisnis", kelompok: "Saintek", jenjang: "S1", skor_min: 590, daya_tampung: 60, peminat: 650 },
  { ptn: "Universitas Brawijaya", prodi: "Ilmu Komunikasi", kelompok: "Soshum", jenjang: "S1", skor_min: 648, daya_tampung: 45, peminat: 1300 },
  { ptn: "Universitas Brawijaya", prodi: "Akuntansi", kelompok: "Soshum", jenjang: "S1", skor_min: 646, daya_tampung: 50, peminat: 1100 },
  { ptn: "Universitas Brawijaya", prodi: "Manajemen", kelompok: "Soshum", jenjang: "S1", skor_min: 644, daya_tampung: 50, peminat: 1200 },
  { ptn: "Universitas Brawijaya", prodi: "Psikologi", kelompok: "Soshum", jenjang: "S1", skor_min: 640, daya_tampung: 40, peminat: 1000 },
  { ptn: "Universitas Brawijaya", prodi: "Ilmu Hukum", kelompok: "Soshum", jenjang: "S1", skor_min: 630, daya_tampung: 85, peminat: 1400 },

  /* ---------------- Universitas Sebelas Maret ---------------- */
  { ptn: "Universitas Sebelas Maret", prodi: "Kedokteran", kelompok: "Saintek", jenjang: "S1", skor_min: 682, daya_tampung: 55, peminat: 1600 },
  { ptn: "Universitas Sebelas Maret", prodi: "Informatika", kelompok: "Saintek", jenjang: "S1", skor_min: 652, daya_tampung: 40, peminat: 1100 },
  { ptn: "Universitas Sebelas Maret", prodi: "Farmasi", kelompok: "Saintek", jenjang: "S1", skor_min: 640, daya_tampung: 40, peminat: 850 },
  { ptn: "Universitas Sebelas Maret", prodi: "Teknik Sipil", kelompok: "Saintek", jenjang: "S1", skor_min: 616, daya_tampung: 45, peminat: 700 },
  { ptn: "Universitas Sebelas Maret", prodi: "Ilmu Komunikasi", kelompok: "Soshum", jenjang: "S1", skor_min: 636, daya_tampung: 40, peminat: 1100 },
  { ptn: "Universitas Sebelas Maret", prodi: "Manajemen", kelompok: "Soshum", jenjang: "S1", skor_min: 632, daya_tampung: 45, peminat: 1000 },
  { ptn: "Universitas Sebelas Maret", prodi: "Akuntansi", kelompok: "Soshum", jenjang: "S1", skor_min: 630, daya_tampung: 45, peminat: 950 },
  { ptn: "Universitas Sebelas Maret", prodi: "Ilmu Hukum", kelompok: "Soshum", jenjang: "S1", skor_min: 620, daya_tampung: 80, peminat: 1200 },

  /* ---------------- Universitas Negeri Jakarta ---------------- */
  { ptn: "Universitas Negeri Jakarta", prodi: "Ilmu Komputer", kelompok: "Saintek", jenjang: "S1", skor_min: 632, daya_tampung: 40, peminat: 900 },
  { ptn: "Universitas Negeri Jakarta", prodi: "Pendidikan Matematika", kelompok: "Saintek", jenjang: "S1", skor_min: 602, daya_tampung: 40, peminat: 600 },
  { ptn: "Universitas Negeri Jakarta", prodi: "Ilmu Komunikasi", kelompok: "Soshum", jenjang: "S1", skor_min: 630, daya_tampung: 40, peminat: 1100 },
  { ptn: "Universitas Negeri Jakarta", prodi: "Psikologi", kelompok: "Soshum", jenjang: "S1", skor_min: 626, daya_tampung: 40, peminat: 950 },
  { ptn: "Universitas Negeri Jakarta", prodi: "Manajemen", kelompok: "Soshum", jenjang: "S1", skor_min: 620, daya_tampung: 45, peminat: 900 },
  { ptn: "Universitas Negeri Jakarta", prodi: "Pendidikan Bahasa Inggris", kelompok: "Soshum", jenjang: "S1", skor_min: 610, daya_tampung: 40, peminat: 800 },

  /* ---------------- Universitas Pendidikan Indonesia ---------------- */
  { ptn: "Universitas Pendidikan Indonesia", prodi: "Ilmu Komputer", kelompok: "Saintek", jenjang: "S1", skor_min: 636, daya_tampung: 40, peminat: 950 },
  { ptn: "Universitas Pendidikan Indonesia", prodi: "Pendidikan Matematika", kelompok: "Saintek", jenjang: "S1", skor_min: 606, daya_tampung: 45, peminat: 650 },
  { ptn: "Universitas Pendidikan Indonesia", prodi: "Ilmu Komunikasi", kelompok: "Soshum", jenjang: "S1", skor_min: 630, daya_tampung: 40, peminat: 1000 },
  { ptn: "Universitas Pendidikan Indonesia", prodi: "Manajemen", kelompok: "Soshum", jenjang: "S1", skor_min: 626, daya_tampung: 45, peminat: 900 },
  { ptn: "Universitas Pendidikan Indonesia", prodi: "Pendidikan Bahasa Inggris", kelompok: "Soshum", jenjang: "S1", skor_min: 620, daya_tampung: 45, peminat: 850 },
  { ptn: "Universitas Pendidikan Indonesia", prodi: "PGSD", kelompok: "Soshum", jenjang: "S1", skor_min: 618, daya_tampung: 70, peminat: 1200 },

  /* ---------------- Universitas Sriwijaya ---------------- */
  { ptn: "Universitas Sriwijaya", prodi: "Kedokteran", kelompok: "Saintek", jenjang: "S1", skor_min: 652, daya_tampung: 55, peminat: 1300 },
  { ptn: "Universitas Sriwijaya", prodi: "Teknik Informatika", kelompok: "Saintek", jenjang: "S1", skor_min: 616, daya_tampung: 45, peminat: 800 },
  { ptn: "Universitas Sriwijaya", prodi: "Teknik Sipil", kelompok: "Saintek", jenjang: "S1", skor_min: 592, daya_tampung: 50, peminat: 650 },
  { ptn: "Universitas Sriwijaya", prodi: "Manajemen", kelompok: "Soshum", jenjang: "S1", skor_min: 600, daya_tampung: 50, peminat: 800 },
  { ptn: "Universitas Sriwijaya", prodi: "Akuntansi", kelompok: "Soshum", jenjang: "S1", skor_min: 598, daya_tampung: 50, peminat: 750 },
  { ptn: "Universitas Sriwijaya", prodi: "Ilmu Hukum", kelompok: "Soshum", jenjang: "S1", skor_min: 588, daya_tampung: 80, peminat: 900 },

  /* ---------------- Universitas Sumatera Utara ---------------- */
  { ptn: "Universitas Sumatera Utara", prodi: "Kedokteran", kelompok: "Saintek", jenjang: "S1", skor_min: 666, daya_tampung: 55, peminat: 1500 },
  { ptn: "Universitas Sumatera Utara", prodi: "Ilmu Komputer", kelompok: "Saintek", jenjang: "S1", skor_min: 630, daya_tampung: 45, peminat: 900 },
  { ptn: "Universitas Sumatera Utara", prodi: "Farmasi", kelompok: "Saintek", jenjang: "S1", skor_min: 628, daya_tampung: 45, peminat: 850 },
  { ptn: "Universitas Sumatera Utara", prodi: "Teknik Sipil", kelompok: "Saintek", jenjang: "S1", skor_min: 600, daya_tampung: 50, peminat: 700 },
  { ptn: "Universitas Sumatera Utara", prodi: "Ilmu Komunikasi", kelompok: "Soshum", jenjang: "S1", skor_min: 616, daya_tampung: 40, peminat: 900 },
  { ptn: "Universitas Sumatera Utara", prodi: "Manajemen", kelompok: "Soshum", jenjang: "S1", skor_min: 614, daya_tampung: 50, peminat: 850 },
  { ptn: "Universitas Sumatera Utara", prodi: "Akuntansi", kelompok: "Soshum", jenjang: "S1", skor_min: 612, daya_tampung: 50, peminat: 800 },
  { ptn: "Universitas Sumatera Utara", prodi: "Ilmu Hukum", kelompok: "Soshum", jenjang: "S1", skor_min: 600, daya_tampung: 80, peminat: 1000 },

  /* ---------------- Universitas Hasanuddin ---------------- */
  { ptn: "Universitas Hasanuddin", prodi: "Kedokteran", kelompok: "Saintek", jenjang: "S1", skor_min: 668, daya_tampung: 55, peminat: 1400 },
  { ptn: "Universitas Hasanuddin", prodi: "Farmasi", kelompok: "Saintek", jenjang: "S1", skor_min: 630, daya_tampung: 45, peminat: 800 },
  { ptn: "Universitas Hasanuddin", prodi: "Teknik Informatika", kelompok: "Saintek", jenjang: "S1", skor_min: 622, daya_tampung: 40, peminat: 850 },
  { ptn: "Universitas Hasanuddin", prodi: "Teknik Sipil", kelompok: "Saintek", jenjang: "S1", skor_min: 602, daya_tampung: 50, peminat: 700 },
  { ptn: "Universitas Hasanuddin", prodi: "Ilmu Komunikasi", kelompok: "Soshum", jenjang: "S1", skor_min: 616, daya_tampung: 40, peminat: 900 },
  { ptn: "Universitas Hasanuddin", prodi: "Manajemen", kelompok: "Soshum", jenjang: "S1", skor_min: 614, daya_tampung: 50, peminat: 850 },
  { ptn: "Universitas Hasanuddin", prodi: "Akuntansi", kelompok: "Soshum", jenjang: "S1", skor_min: 610, daya_tampung: 50, peminat: 800 },
  { ptn: "Universitas Hasanuddin", prodi: "Ilmu Hukum", kelompok: "Soshum", jenjang: "S1", skor_min: 604, daya_tampung: 80, peminat: 950 },

  /* ---------------- Universitas Andalas ---------------- */
  { ptn: "Universitas Andalas", prodi: "Kedokteran", kelompok: "Saintek", jenjang: "S1", skor_min: 646, daya_tampung: 55, peminat: 1200 },
  { ptn: "Universitas Andalas", prodi: "Farmasi", kelompok: "Saintek", jenjang: "S1", skor_min: 610, daya_tampung: 45, peminat: 700 },
  { ptn: "Universitas Andalas", prodi: "Sistem Informasi", kelompok: "Saintek", jenjang: "S1", skor_min: 600, daya_tampung: 40, peminat: 650 },
  { ptn: "Universitas Andalas", prodi: "Manajemen", kelompok: "Soshum", jenjang: "S1", skor_min: 600, daya_tampung: 50, peminat: 750 },
  { ptn: "Universitas Andalas", prodi: "Akuntansi", kelompok: "Soshum", jenjang: "S1", skor_min: 598, daya_tampung: 50, peminat: 700 },
  { ptn: "Universitas Andalas", prodi: "Ilmu Hukum", kelompok: "Soshum", jenjang: "S1", skor_min: 586, daya_tampung: 80, peminat: 850 },

  /* ---------------- PTN lain yang banyak diminati ---------------- */
  { ptn: "Universitas Negeri Yogyakarta", prodi: "Pendidikan Bahasa Inggris", kelompok: "Soshum", jenjang: "S1", skor_min: 608, daya_tampung: 40, peminat: 750 },
  { ptn: "Universitas Negeri Yogyakarta", prodi: "Manajemen", kelompok: "Soshum", jenjang: "S1", skor_min: 614, daya_tampung: 45, peminat: 850 },
  { ptn: "Universitas Negeri Yogyakarta", prodi: "Ilmu Komputer", kelompok: "Saintek", jenjang: "S1", skor_min: 620, daya_tampung: 40, peminat: 800 },
  { ptn: "Universitas Jenderal Soedirman", prodi: "Kedokteran", kelompok: "Saintek", jenjang: "S1", skor_min: 648, daya_tampung: 50, peminat: 1200 },
  { ptn: "Universitas Jenderal Soedirman", prodi: "Farmasi", kelompok: "Saintek", jenjang: "S1", skor_min: 618, daya_tampung: 40, peminat: 700 },
  { ptn: "Universitas Jenderal Soedirman", prodi: "Manajemen", kelompok: "Soshum", jenjang: "S1", skor_min: 606, daya_tampung: 50, peminat: 750 },
  { ptn: "Universitas Lampung", prodi: "Kedokteran", kelompok: "Saintek", jenjang: "S1", skor_min: 638, daya_tampung: 50, peminat: 1100 },
  { ptn: "Universitas Lampung", prodi: "Teknik Informatika", kelompok: "Saintek", jenjang: "S1", skor_min: 604, daya_tampung: 40, peminat: 700 },
  { ptn: "Universitas Lampung", prodi: "Ilmu Hukum", kelompok: "Soshum", jenjang: "S1", skor_min: 580, daya_tampung: 75, peminat: 800 },
  { ptn: "UPN Veteran Jakarta", prodi: "Kedokteran", kelompok: "Saintek", jenjang: "S1", skor_min: 660, daya_tampung: 40, peminat: 1200 },
  { ptn: "UPN Veteran Jakarta", prodi: "Informatika", kelompok: "Saintek", jenjang: "S1", skor_min: 634, daya_tampung: 40, peminat: 900 },
  { ptn: "UPN Veteran Yogyakarta", prodi: "Teknik Informatika", kelompok: "Saintek", jenjang: "S1", skor_min: 626, daya_tampung: 45, peminat: 950 },
  { ptn: "UPN Veteran Yogyakarta", prodi: "Manajemen", kelompok: "Soshum", jenjang: "S1", skor_min: 612, daya_tampung: 50, peminat: 850 },
  { ptn: "Universitas Negeri Surabaya", prodi: "Ilmu Komunikasi", kelompok: "Soshum", jenjang: "S1", skor_min: 616, daya_tampung: 40, peminat: 900 },
  { ptn: "Universitas Negeri Surabaya", prodi: "Sistem Informasi", kelompok: "Saintek", jenjang: "S1", skor_min: 618, daya_tampung: 40, peminat: 800 },
  { ptn: "Universitas Negeri Semarang", prodi: "Psikologi", kelompok: "Soshum", jenjang: "S1", skor_min: 620, daya_tampung: 40, peminat: 900 },
  { ptn: "Universitas Negeri Semarang", prodi: "Teknik Informatika", kelompok: "Saintek", jenjang: "S1", skor_min: 622, daya_tampung: 40, peminat: 850 },
  { ptn: "Universitas Syiah Kuala", prodi: "Kedokteran", kelompok: "Saintek", jenjang: "S1", skor_min: 632, daya_tampung: 50, peminat: 1000 },
  { ptn: "Universitas Syiah Kuala", prodi: "Manajemen", kelompok: "Soshum", jenjang: "S1", skor_min: 588, daya_tampung: 50, peminat: 700 },
  { ptn: "Universitas Riau", prodi: "Kedokteran", kelompok: "Saintek", jenjang: "S1", skor_min: 630, daya_tampung: 45, peminat: 950 },
  { ptn: "Universitas Riau", prodi: "Ilmu Hukum", kelompok: "Soshum", jenjang: "S1", skor_min: 576, daya_tampung: 75, peminat: 750 },
  { ptn: "Universitas Udayana", prodi: "Kedokteran", kelompok: "Saintek", jenjang: "S1", skor_min: 664, daya_tampung: 50, peminat: 1300 },
  { ptn: "Universitas Udayana", prodi: "Ilmu Komunikasi", kelompok: "Soshum", jenjang: "S1", skor_min: 618, daya_tampung: 40, peminat: 850 },
  { ptn: "Universitas Mulawarman", prodi: "Kedokteran", kelompok: "Saintek", jenjang: "S1", skor_min: 618, daya_tampung: 45, peminat: 800 },
  { ptn: "Universitas Tanjungpura", prodi: "Kedokteran", kelompok: "Saintek", jenjang: "S1", skor_min: 616, daya_tampung: 45, peminat: 800 },
  { ptn: "Universitas Sultan Ageng Tirtayasa", prodi: "Teknik Informatika", kelompok: "Saintek", jenjang: "S1", skor_min: 596, daya_tampung: 40, peminat: 650 },
  { ptn: "Universitas Sultan Ageng Tirtayasa", prodi: "Manajemen", kelompok: "Soshum", jenjang: "S1", skor_min: 584, daya_tampung: 50, peminat: 700 },
];

/** Daftar unik nama PTN pada basis data benih. */
export const DAFTAR_PTN: string[] = Array.from(
  new Set(DATA_KAMPUS.map((k) => k.ptn)),
).sort((a, b) => a.localeCompare(b, "id-ID"));

/* ===================================================================
 * Tipe bersama untuk rekomendasi kampus.
 * Sengaja diletakkan di berkas data (bukan src/lib/kampus.ts) supaya
 * komponen klien bisa mengimpor tipenya tanpa ikut menarik lapisan
 * basis data ke bundel peramban.
 * =================================================================== */

/**
 * Zona peluang, dihitung dari selisih skor peserta terhadap skor_min prodi:
 *   AMAN       : skor >= skor_min + 40
 *   POTENSIAL  : skor >= skor_min
 *   BERSAING   : skor >= skor_min - 25
 *   MENANTANG  : skor >= skor_min - 60
 */
export type ZonaPeluang = "AMAN" | "POTENSIAL" | "BERSAING" | "MENANTANG";

export const URUTAN_ZONA: ZonaPeluang[] = ["AMAN", "POTENSIAL", "BERSAING", "MENANTANG"];

export const AMBANG_ZONA: Record<ZonaPeluang, number> = {
  AMAN: 40,
  POTENSIAL: 0,
  BERSAING: -25,
  MENANTANG: -60,
};

export const INFO_ZONA: Record<
  ZonaPeluang,
  { label: string; ringkas: string; kelas: string; kelasTeks: string; kelasTitik: string }
> = {
  AMAN: {
    label: "Aman",
    ringkas: "Skormu sudah melampaui ancar-ancar dengan jarak lega.",
    kelas: "bg-success-soft border-success/25",
    kelasTeks: "text-success",
    kelasTitik: "bg-success",
  },
  POTENSIAL: {
    label: "Potensial",
    ringkas: "Skormu sudah menyentuh ancar-ancar. Jaga dan tambah sedikit lagi.",
    kelas: "bg-brand-soft border-brand/25",
    kelasTeks: "text-brand",
    kelasTitik: "bg-brand",
  },
  BERSAING: {
    label: "Bersaing",
    ringkas: "Selisihnya tipis. Masih realistis kalau latihan ditambah.",
    kelas: "bg-warning-soft border-warning/25",
    kelasTeks: "text-warning",
    kelasTitik: "bg-warning",
  },
  MENANTANG: {
    label: "Menantang",
    ringkas: "Perlu lompatan skor. Cocok jadi pilihan pertama yang berani.",
    kelas: "bg-accent-soft border-accent/25",
    kelasTeks: "text-accent",
    kelasTitik: "bg-accent",
  },
};

export interface ProdiRekomendasi extends DataKampus {
  id: number;
  zona: ZonaPeluang;
  /** Poin yang masih kurang untuk menyentuh skor_min (0 kalau sudah terpenuhi). */
  kurang: number;
  /** Selisih skor peserta terhadap skor_min (positif = di atas ancar-ancar). */
  selisih: number;
  /** Rasio keketatan: 1 kursi diperebutkan berapa pendaftar. */
  keketatan: number;
}

export interface PilihanSnbt {
  urutan: 1 | 2 | 3 | 4;
  strategi: string;
  prodi: ProdiRekomendasi | null;
}

export interface HasilRekomendasi {
  totalSkor: number;
  kelompok: KelompokUjian | "Semua";
  perZona: Record<ZonaPeluang, ProdiRekomendasi[]>;
  pilihan: PilihanSnbt[];
  jumlahCocok: number;
}
