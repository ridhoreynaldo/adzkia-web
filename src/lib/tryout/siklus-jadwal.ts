import "server-only";

import type { PaketStatus } from "@/lib/admin/admin-konstanta";
import { all, one, run, tx } from "@/lib/core/db";
import { siklusBerjalan, type Siklus } from "@/lib/tryout/siklus";

/**
 * Penjadwal siklus tryout pekanan.
 *
 * Tryout Real UTBK-SNBT Adzkia digelar sepekan sekali tiap Jumat. Dua hal yang
 * dulu harus dikerjakan tangan tiap pekan, dan satu di antaranya tidak pernah
 * dikerjakan sama sekali:
 *
 *  1. MENUTUP paket pekan lalu. Sebelum ini tidak ada satu pun paket yang punya
 *     jendela waktu, sehingga setiap paket yang terbit terbuka SELAMANYA. Paket
 *     demo dari bulan Agustus masih menempel di beranda siswa, dan siswa yang
 *     mengerjakan tryout pekan lalu pada hari ini nilainya masuk ke papan
 *     peringkat pekan INI — karena yang dihitung tanggal selesainya, bukan
 *     paketnya. Papan pekanan yang seharusnya bersih jadi tercemar.
 *
 *  2. MENYIAPKAN paket pekan berikutnya: kode, nama, dan jendela waktunya.
 *
 * Keduanya kini berjalan sendiri. Yang TIDAK pernah otomatis adalah
 * MENERBITKAN: paket siklus baru selalu lahir berstatus `draft`, karena
 * menerbitkan paket yang naskahnya belum diimpor berarti menyodorkan tryout
 * kosong kepada peserta. Menerbitkan tetap keputusan sadar pengelola.
 *
 * Tidak ada cron di aplikasi ini — ia sebuah aplikasi Next.js di atas SQLite.
 * Jadi penjadwal dipanggil menumpang permintaan yang memang sudah terjadi
 * (beranda siswa, daftar paket admin, papan pekanan) dan dijaga agar tidak
 * berjalan lebih sering daripada {@link JEDA_CEK}.
 */

/** Paket siklus hanya untuk jalur UTBK; SKD punya jadwalnya sendiri. */
const JALUR_SIKLUS = "utbk";

/** Penjadwal paling sering berjalan sekali per selang ini. */
const JEDA_CEK_MENIT = 10;

const KUNCI_CEK = "siklus_cek_terakhir";

export interface HasilSiklus {
  /** Kode paket yang baru dibuat, null bila memang belum perlu. */
  dibuat: string | null;
  /** Kode paket siklus lama yang ditutup pada pemanggilan ini. */
  ditutup: string[];
  /** Kode paket buatan tangan yang diangkat ke dalam siklus. */
  diangkat: string[];
  /** false bila dilewati karena baru saja berjalan. */
  dijalankan: boolean;
}

const KOSONG: HasilSiklus = { dibuat: null, ditutup: [], diangkat: [], dijalankan: false };

/** Sudah lewat {@link JEDA_CEK_MENIT} sejak pemeriksaan terakhir? */
async function perluDicek(sekarang: Date): Promise<boolean> {
  const baris = await one<{ nilai: string }>("SELECT nilai FROM pengaturan WHERE kunci = ?", KUNCI_CEK);
  if (!baris) return true;
  const lalu = Date.parse(baris.nilai);
  if (!Number.isFinite(lalu)) return true;
  return sekarang.getTime() - lalu >= JEDA_CEK_MENIT * 60_000;
}

async function catatWaktuCek(sekarang: Date): Promise<void> {
  await run(
    `INSERT INTO pengaturan (kunci, nilai, diperbarui_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(kunci) DO UPDATE SET nilai = excluded.nilai, diperbarui_at = excluded.diperbarui_at`,
    KUNCI_CEK,
    sekarang.toISOString(),
  );
}

/**
 * Jalankan penjadwal bila sudah waktunya.
 *
 * Aman dipanggil dari mana saja termasuk saat merender halaman: kegagalan
 * apa pun ditelan dan dikembalikan sebagai "tidak ada yang dikerjakan", karena
 * beranda siswa tidak boleh gagal tampil hanya gara-gara urusan penjadwalan.
 */
export async function pastikanSiklusTerbaru(acuan: Date = new Date()): Promise<HasilSiklus> {
  try {
    if (!await perluDicek(acuan)) return KOSONG;
    const hasil = await jalankanSiklus(acuan);
    await catatWaktuCek(acuan);
    return hasil;
  } catch {
    return KOSONG;
  }
}

/** Versi tanpa penjaga jeda — dipakai tombol manual admin dan pengujian. */
export async function jalankanSiklus(acuan: Date = new Date()): Promise<HasilSiklus> {
  const siklus = siklusBerjalan(acuan);
  const hasil: HasilSiklus = { dibuat: null, ditutup: [], diangkat: [], dijalankan: true };

  await tx(async () => {
    await angkatPaketSetara(siklus, hasil);
    await tutupSiklusLama(siklus, hasil);
    await siapkanPaketSiklus(siklus, hasil);
  });

  return hasil;
}

/**
 * Paket yang dibuat tangan dengan kode siklus berjalan tapi kolom `siklus`-nya
 * masih kosong diangkat ke dalam siklus.
 *
 * Tanpa langkah ini penjadwal akan membuat paket KEMBAR: pengelola sudah
 * membuat `TO-4SEP2026` sendiri, sedangkan penjadwal melihat "belum ada paket
 * bersiklus 2026-09-04" lalu membuat satu lagi — dan gagal, karena kodenya
 * unik. Mengangkat yang sudah ada jauh lebih benar daripada membuat yang baru.
 */
async function angkatPaketSetara(siklus: Siklus, hasil: HasilSiklus): Promise<void> {
  const ada = await one<{
    id: number;
    kode: string;
    siklus: string | null;
    mulai_at: string | null;
    selesai_at: string | null;
  }>("SELECT id, kode, siklus, mulai_at, selesai_at FROM packages WHERE kode = ?", siklus.kode);
  if (!ada) return;

  const perluSiklus = ada.siklus !== siklus.tanggal;

  // Jendela waktu diisikan HANYA bila keduanya masih kosong. Paket tanpa
  // jendela terbuka SELAMANYA begitu diterbitkan — persis keadaan yang membuat
  // paket demo Agustus masih menempel di beranda siswa sampai hari ini. Jendela
  // yang sudah diisi pengelola tidak pernah ditimpa: itu keputusan mereka.
  //
  // Pemeriksaan ini sengaja BERDIRI SENDIRI, tidak menumpang pada `perluSiklus`.
  // Migrasi v13 mengisi kolom `siklus` paket lama dengan membaca kodenya tetapi
  // tidak menyentuh jendelanya; kalau keduanya digabung, paket yang sudah
  // dikenali migrasi akan berhenti di sini dan jendelanya tetap kosong
  // selamanya — bug yang baru terlihat pada data sungguhan, bukan di pengujian.
  const tanpaJendela =
    (ada.mulai_at === null || ada.mulai_at.trim() === "") &&
    (ada.selesai_at === null || ada.selesai_at.trim() === "");

  if (!perluSiklus && !tanpaJendela) return;

  if (tanpaJendela) {
    await run(
      "UPDATE packages SET siklus = ?, mulai_at = ?, selesai_at = ? WHERE id = ?",
      siklus.tanggal,
      siklus.mulaiAt,
      siklus.selesaiAt,
      ada.id,
    );
  } else {
    await run("UPDATE packages SET siklus = ? WHERE id = ?", siklus.tanggal, ada.id);
  }
  hasil.diangkat.push(ada.kode);
}

/**
 * Tutup paket siklus yang sudah lewat.
 *
 * Hanya menyentuh paket yang kolom `siklus`-nya terisi DAN lebih tua daripada
 * siklus berjalan. Paket di luar siklus — paket demo, paket SKD, paket khusus
 * buatan pengelola — tidak pernah ikut tertutup, betapapun tuanya.
 *
 * Status `closed` sudah berarti "Ditutup — hanya hasil" di panel admin: paket
 * hilang dari beranda siswa dan tidak bisa dimulai lagi, tetapi halaman hasil
 * dan pembahasan bagi yang sudah mengerjakan tetap terbuka, dan peserta yang
 * berhalangan masih bisa dibukakan lewat izin Ujian Susulan.
 */
async function tutupSiklusLama(siklus: Siklus, hasil: HasilSiklus): Promise<void> {
  const lama = await all<{ id: number; kode: string }>(
    `SELECT id, kode FROM packages
      WHERE status = 'published'
        AND siklus IS NOT NULL
        AND siklus < ?
        AND COALESCE(jalur, 'utbk') = ?
   ORDER BY siklus, id`,
    siklus.tanggal,
    JALUR_SIKLUS,
  );
  for (const p of lama) {
    await run("UPDATE packages SET status = 'closed' WHERE id = ?", p.id);
    hasil.ditutup.push(p.kode);
  }
}

/**
 * Siapkan paket siklus berjalan bila belum ada — selalu sebagai `draft`.
 *
 * Setelan `acak_soal` dan `tampil_pembahasan` disalin dari paket siklus
 * terakhir, supaya kebiasaan pengelola terbawa dan tidak perlu disetel ulang
 * tiap pekan.
 */
async function siapkanPaketSiklus(siklus: Siklus, hasil: HasilSiklus): Promise<void> {
  const sudah = await one<{ id: number }>(
    "SELECT id FROM packages WHERE siklus = ? AND COALESCE(jalur, 'utbk') = ?",
    siklus.tanggal,
    JALUR_SIKLUS,
  );
  if (sudah) return;

  const contoh = await one<{ acak_soal: number; tampil_pembahasan: number }>(
    `SELECT acak_soal, tampil_pembahasan FROM packages
      WHERE siklus IS NOT NULL AND COALESCE(jalur, 'utbk') = ?
   ORDER BY siklus DESC, id DESC LIMIT 1`,
    JALUR_SIKLUS,
  );

  await run(
    `INSERT INTO packages
       (kode, nama, jalur, deskripsi, status, mulai_at, selesai_at,
        acak_soal, tampil_pembahasan, siklus)
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)`,
    siklus.kode,
    siklus.nama,
    JALUR_SIKLUS,
    "Disiapkan otomatis oleh penjadwal siklus pekanan. Impor naskah soalnya, lalu terbitkan.",
    siklus.mulaiAt,
    siklus.selesaiAt,
    contoh?.acak_soal ?? 0,
    contoh?.tampil_pembahasan ?? 1,
    siklus.tanggal,
  );
  hasil.dibuat = siklus.kode;
}

/** Keterangan siklus berjalan untuk panel admin. */
export async function ringkasanSiklus(acuan: Date = new Date()): Promise<{
  siklus: Siklus;
  paket: { id: number; kode: string; nama: string; status: PaketStatus; jumlahSoal: number } | null;
}> {
  const siklus = siklusBerjalan(acuan);
  const paket = await one<{
    id: number;
    kode: string;
    nama: string;
    status: PaketStatus;
    jumlahSoal: number;
  }>(
    `SELECT p.id, p.kode, p.nama, p.status,
            (SELECT COUNT(*) FROM questions q WHERE q.package_id = p.id) AS jumlahSoal
       FROM packages p
      WHERE p.siklus = ? AND COALESCE(p.jalur, 'utbk') = ?`,
    siklus.tanggal,
    JALUR_SIKLUS,
  );
  return { siklus, paket: paket ?? null };
}
