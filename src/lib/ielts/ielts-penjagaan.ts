import "server-only";

import { all, one, run, sisipWajib } from "@/lib/core/db";
import { pengerjaanById, type PengerjaanIelts } from "@/lib/ielts/ielts";
import { labelJenis } from "@/lib/penjagaan/pelanggaran-jenis";

/**
 * PENJAGAAN UJIAN IELTS — sisi server.
 *
 * Kembaran `pelanggaran.ts` untuk tabel `ielts_pelanggaran`, dan kembar itu
 * disengaja sampai ke nama fungsinya. Aturannya SATU dan tidak boleh bercabang:
 * ambangnya dibaca dari `denyut.ts` yang sama, jenis pelanggarannya dari
 * `pelanggaran-jenis.ts` yang sama, dan keputusannya diambil rute API yang
 * bentuknya sama persis dengan `/api/exam/*`. Yang berbeda hanya TABELNYA.
 *
 * KENAPA TABEL SENDIRI, bukan satu tabel `violations` dengan kolom jalur:
 * `violations.attempt_id` menunjuk `attempts(id)` lewat kunci asing dengan
 * ON DELETE CASCADE, dan kunci asing itulah yang menjamin catatan pelanggaran
 * ikut terhapus ketika pengelola menghapus akun peserta. Satu kolom tidak bisa
 * menunjuk dua tabel induk sekaligus, jadi menyatukannya berarti melepas kunci
 * asing di salah satu sisi dan menyisakan baris yatim yang tidak pernah
 * terhapus.
 *
 * Lihat `README.md` bagian 8 dan catatan panjang di `@/lib/denyut`.
 */

/* ------------------------------------------------------------------ */
/* Bentuk baris                                                         */
/* ------------------------------------------------------------------ */

export interface PelanggaranIelts {
  id: number;
  pengerjaan_id: number;
  user_id: number;
  paket_id: number;
  subtes: string | null;
  jenis: string;
  urutan: number;
  ronde: number;
  mulai_at: string;
  kembali_at: string | null;
  durasi_detik: number | null;
  keterangan: string | null;
  kejadian: string | null;
}

/** Satu baris rekap per peserta, untuk panel pengawas. */
export interface RekapIelts {
  pengerjaanId: number;
  userId: number;
  nama: string;
  nisn: string | null;
  kelas: string | null;
  status: string;
  ronde: number;
  jumlah: number;
  menggugurkan: number;
  totalDetikPergi: number;
  alasanGugur: string | null;
  digugurkanAt: string | null;
  terakhirAt: string | null;
}

export interface RincianIelts extends PelanggaranIelts {
  nama: string;
  nisn: string | null;
  label: string;
}

/* ------------------------------------------------------------------ */
/* Ronde                                                                */
/* ------------------------------------------------------------------ */

/**
 * Ronde pengerjaan yang sedang berjalan.
 *
 * Sama seperti `attempts.ronde`: naik satu tiap kali pengelola membuka ujian
 * susulan. Pelanggaran ronde lama TETAP tersimpan sebagai bukti — hanya tidak
 * ikut dihitung, supaya peserta yang diberi kesempatan kedua benar-benar
 * memulai dari nol.
 */
async function rondePengerjaan(pengerjaanId: number): Promise<number> {
  return (
    (await one<{ ronde: number }>("SELECT ronde FROM ielts_pengerjaan WHERE id = ?", pengerjaanId))
      ?.ronde ?? 1
  );
}

async function urutanBerikut(pengerjaanId: number, ronde: number): Promise<number> {
  const sebelumnya = await one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM ielts_pelanggaran WHERE pengerjaan_id = ? AND ronde = ?",
    pengerjaanId,
    ronde,
  );
  return (sebelumnya?.n ?? 0) + 1;
}

/** Baris dengan penanda kejadian yang sama, bila sudah ada. */
async function cariKejadian(
  pengerjaanId: number,
  kejadian: string,
): Promise<{ id: number; urutan: number; jenis: string } | null> {
  return (
    await one<{ id: number; urutan: number; jenis: string }>(
      "SELECT id, urutan, jenis FROM ielts_pelanggaran WHERE pengerjaan_id = ? AND kejadian = ?",
      pengerjaanId,
      kejadian,
    ) ?? null
  );
}

/* ------------------------------------------------------------------ */
/* Mencatat                                                             */
/* ------------------------------------------------------------------ */

/**
 * Percobaan curang yang TIDAK menggugurkan (menyalin, klik kanan, jalan
 * pintas, tekan-tahan). Langsung ditutup pada detik yang sama karena bukan
 * kepergian yang punya durasi.
 */
export async function catatPercobaanIelts(
  pengerjaanId: number,
  userId: number,
  paketId: number,
  subtes: string | null,
  jenis: string,
  keterangan: string | null = null,
  kejadian: string | null = null,
): Promise<number> {
  const kembar = kejadian ? await cariKejadian(pengerjaanId, kejadian) : null;
  if (kembar) return kembar.id;

  const ronde = await rondePengerjaan(pengerjaanId);
  const res = await sisipWajib(
    `INSERT INTO ielts_pelanggaran
       (pengerjaan_id, user_id, paket_id, subtes, jenis, urutan, ronde,
        kembali_at, durasi_detik, keterangan, kejadian)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'), 0, ?, ?)`,
    pengerjaanId,
    userId,
    paketId,
    subtes,
    jenis,
    await urutanBerikut(pengerjaanId, ronde),
    ronde,
    keterangan,
    kejadian,
  );
  return res;
}

/**
 * Peserta meninggalkan halaman ujian.
 *
 * Satu kepergian dilaporkan DUA kali — lewat `sendBeacon` yang tahan pembekuan
 * halaman dan lewat `fetch` yang membawa putusan server kembali ke layar — jadi
 * penanda `kejadian` yang sama mengembalikan baris yang sudah ada, bukan baris
 * kedua.
 */
export async function catatKeluarIelts(
  pengerjaanId: number,
  userId: number,
  paketId: number,
  subtes: string | null,
  jenis = "keluar_tab",
  kejadian: string | null = null,
): Promise<{ id: number; urutan: number; kembar: boolean }> {
  const lama = kejadian ? await cariKejadian(pengerjaanId, kejadian) : null;
  if (lama) return { id: lama.id, urutan: lama.urutan, kembar: true };

  const ronde = await rondePengerjaan(pengerjaanId);
  const urutan = await urutanBerikut(pengerjaanId, ronde);
  const res = await sisipWajib(
    `INSERT INTO ielts_pelanggaran
       (pengerjaan_id, user_id, paket_id, subtes, jenis, urutan, ronde, kejadian)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    pengerjaanId,
    userId,
    paketId,
    subtes,
    jenis,
    urutan,
    ronde,
    kejadian,
  );
  return { id: res, urutan, kembar: false };
}

/** Peserta kembali; sekalian menghitung lamanya ia pergi. */
export async function catatKembaliIelts(pelanggaranId: number, pengerjaanId: number): Promise<number | null> {
  await run(
    `UPDATE ielts_pelanggaran
        SET kembali_at   = datetime('now','localtime'),
            durasi_detik = CAST(ROUND((julianday('now') - julianday(mulai_at, 'utc')) * 86400) AS INTEGER)
      WHERE id = ? AND pengerjaan_id = ? AND kembali_at IS NULL`,
    pelanggaranId,
    pengerjaanId,
  );
  return (
    (await one<{ durasi_detik: number | null }>(
      "SELECT durasi_detik FROM ielts_pelanggaran WHERE id = ?",
      pelanggaranId,
    ))?.durasi_detik ?? null
  );
}

/**
 * Menaikkan kepergian biasa menjadi `pergi_lama` — peserta baru kembali sesudah
 * ambangnya lewat. Barisnya DINAIKKAN, bukan ditambah: satu kejadian tetap satu
 * baris di mata pengawas.
 */
export async function naikkanPergiLamaIelts(pelanggaranId: number, pengerjaanId: number): Promise<boolean> {
  const res = await run(
    `UPDATE ielts_pelanggaran
        SET jenis      = 'pergi_lama',
            keterangan = COALESCE(keterangan, '') ||
                         'Tidak kembali dalam batas waktu (' || COALESCE(durasi_detik, 0) || ' detik)'
      WHERE id = ? AND pengerjaan_id = ? AND jenis = 'keluar_tab'`,
    pelanggaranId,
    pengerjaanId,
  );
  return Number(res.changes) > 0;
}

/** Menaikkan kepergian biasa menjadi `pergi_menumpuk` — anggarannya habis. */
export async function naikkanPergiMenumpukIelts(
  pelanggaranId: number,
  pengerjaanId: number,
  totalDetik: number,
): Promise<boolean> {
  const res = await run(
    `UPDATE ielts_pelanggaran
        SET jenis      = 'pergi_menumpuk',
            keterangan = COALESCE(keterangan || ' · ', '') ||
                         'Jumlah seluruh kepergian mencapai ' || CAST(? AS INTEGER) || ' detik'
      WHERE id = ? AND pengerjaan_id = ? AND jenis = 'keluar_tab'`,
    Math.round(totalDetik),
    pelanggaranId,
    pengerjaanId,
  );
  return Number(res.changes) > 0;
}

/** Menempelkan pola bolak-balik ke keterangan barisnya, untuk pengawas. */
export async function tandaiTotalKepergianIelts(
  pelanggaranId: number,
  pengerjaanId: number,
  totalDetik: number,
  budget: number,
): Promise<void> {
  await run(
    `UPDATE ielts_pelanggaran
        SET keterangan = COALESCE(keterangan || ' · ', '') ||
                         'Jumlah kepergian ' || CAST(? AS INTEGER) || '/' || CAST(? AS INTEGER) || ' detik'
      WHERE id = ? AND pengerjaan_id = ? AND keterangan IS NULL`,
    Math.round(totalDetik),
    Math.round(budget),
    pelanggaranId,
    pengerjaanId,
  );
}

/* ------------------------------------------------------------------ */
/* Menghitung                                                           */
/* ------------------------------------------------------------------ */

export async function jumlahPelanggaranIelts(pengerjaanId: number): Promise<number> {
  return (
    (await one<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ielts_pelanggaran
        WHERE pengerjaan_id = ?
          AND ronde = COALESCE((SELECT ronde FROM ielts_pengerjaan WHERE id = ?), 1)`,
      pengerjaanId,
      pengerjaanId,
    ))?.n ?? 0
  );
}

export async function jumlahKepergianIelts(pengerjaanId: number): Promise<number> {
  return (
    (await one<{ n: number }>(
      `SELECT COUNT(*) AS n FROM ielts_pelanggaran
        WHERE pengerjaan_id = ? AND jenis = 'keluar_tab'
          AND ronde = COALESCE((SELECT ronde FROM ielts_pengerjaan WHERE id = ?), 1)`,
      pengerjaanId,
      pengerjaanId,
    ))?.n ?? 0
  );
}

/**
 * JUMLAH SELURUH DETIK peserta di luar halaman ujian pada ronde berjalan.
 *
 * Daftar jenisnya sengaja SAMA PERSIS dengan `totalDetikKepergian()` di
 * `pelanggaran.ts`, termasuk yang TIDAK ikut: `denyut_tersendat` (halaman
 * membuktikan dirinya tetap terlihat — itu jaringan peserta, bukan
 * kepergiannya), `blur_window`, dan `keluar_layar_penuh` (pada keduanya
 * halaman ujian masih terpampang di layar).
 */
export async function totalDetikKepergianIelts(pengerjaanId: number): Promise<number> {
  return (
    (await one<{ n: number }>(
      `SELECT COALESCE(SUM(durasi_detik), 0) AS n FROM ielts_pelanggaran
        WHERE pengerjaan_id = ?
          AND jenis IN ('keluar_tab', 'pergi_lama', 'pergi_menumpuk', 'denyut_hilang')
          AND ronde = COALESCE((SELECT ronde FROM ielts_pengerjaan WHERE id = ?), 1)`,
      pengerjaanId,
      pengerjaanId,
    ))?.n ?? 0
  );
}

/* ------------------------------------------------------------------ */
/* Denyut nadi                                                          */
/* ------------------------------------------------------------------ */

/**
 * Denyut nadi ruang ujian IELTS.
 *
 * Bacalah catatan panjang di `catatDenyut()` pada `pelanggaran.ts` — sebab dan
 * pemisahan `nilaiJeda`-nya sama persis. Ringkasnya: pembongkaran yang
 * DISENGAJA (menutup subtes) mengirim `nilaiJeda: false` sehingga jeda apa pun
 * sesudahnya tidak dinilai, sedangkan denyut pertama sesudah halaman DIMUAT
 * ULANG mengirim `nilaiJeda: true` supaya memuat ulang tidak menghapus jejak
 * kepergian yang baru saja terjadi.
 */
export async function catatDenyutIelts(
  pengerjaanId: number,
  aktif: boolean,
  nilaiJeda = aktif,
): Promise<number | null> {
  const row = await one<{ denyut_at: string | null; denyut_aktif: number; jeda: number | null }>(
    `SELECT denyut_at,
            denyut_aktif,
            CAST(ROUND((julianday('now') - julianday(denyut_at, 'utc')) * 86400) AS INTEGER) AS jeda
       FROM ielts_pengerjaan
      WHERE id = ?`,
    pengerjaanId,
  );

  await run(
    "UPDATE ielts_pengerjaan SET denyut_at = datetime('now','localtime'), denyut_aktif = ? WHERE id = ?",
    aktif ? 1 : 0,
    pengerjaanId,
  );

  if (!nilaiJeda) return null;
  if (!row || !row.denyut_at || row.denyut_aktif !== 1) return null;
  return row.jeda ?? null;
}

/** Baris denyut yang sudah SELESAI saat diketahui: dicatat lengkap dengan jedanya. */
async function catatJedaDenyut(
  pengerjaanId: number,
  userId: number,
  paketId: number,
  subtes: string | null,
  // Ketiganya lahir dari KEHENINGAN denyut, bukan dari laporan kepergian.
  // Daftarnya sengaja tertutup supaya tidak ada jenis lain yang diam-diam
  // masuk lewat jalur ini.
  jenis: "denyut_hilang" | "denyut_tersendat" | "pergi_saat_rekaman",
  jedaDetik: number,
  keterangan: string,
): Promise<number> {
  const ronde = await rondePengerjaan(pengerjaanId);
  const res = await sisipWajib(
    `INSERT INTO ielts_pelanggaran
       (pengerjaan_id, user_id, paket_id, subtes, jenis, urutan, ronde,
        mulai_at, kembali_at, durasi_detik, keterangan)
     VALUES (?, ?, ?, ?, ?, ?, ?,
             datetime('now','localtime',? || ' seconds'), datetime('now','localtime'), ?, ?)`,
    pengerjaanId,
    userId,
    paketId,
    subtes,
    jenis,
    await urutanBerikut(pengerjaanId, ronde),
    ronde,
    `-${jedaDetik}`,
    jedaDetik,
    keterangan,
  );
  return res;
}

export async function catatDenyutHilangIelts(
  pengerjaanId: number,
  userId: number,
  paketId: number,
  subtes: string | null,
  jedaDetik: number,
): Promise<number> {
  return await catatJedaDenyut(
    pengerjaanId,
    userId,
    paketId,
    subtes,
    "denyut_hilang",
    jedaDetik,
    `Halaman ujian diam ${jedaDetik} detik`,
  );
}

/**
 * Keheningan yang terjadi SELAGI REKAMAN LISTENING BERPUTAR.
 *
 * Ketetapan pengelola 11 September 2026: mendengarkan rekaman adalah bagian
 * dari ujiannya, dan peserta yang tidak menyentuh apa pun selama itu — sampai
 * layar ponselnya padam sendiri — tidak boleh digugurkan. Barisnya tetap
 * dicatat supaya pengawas bisa membacanya; yang tidak terjadi hanya akibatnya.
 *
 * Bedanya dengan `denyut_tersendat`: yang itu menuntut halaman MEMBUKTIKAN diri
 * tetap terlihat, sebab ia menggambarkan jaringan yang putus. Yang ini justru
 * memaafkan halaman yang TERSEMBUNYI, karena itulah yang terjadi ketika layar
 * mengunci sendiri di tengah rekaman.
 */
export async function catatPergiSaatRekamanIelts(
  pengerjaanId: number,
  userId: number,
  paketId: number,
  subtes: string | null,
  jedaDetik: number,
): Promise<number> {
  return await catatJedaDenyut(
    pengerjaanId,
    userId,
    paketId,
    subtes,
    "pergi_saat_rekaman",
    jedaDetik,
    `Halaman diam ${jedaDetik} detik selagi rekaman Listening diputar — tidak menggugurkan`,
  );
}

export async function catatDenyutTersendatIelts(
  pengerjaanId: number,
  userId: number,
  paketId: number,
  subtes: string | null,
  jedaDetik: number,
  percobaan: number,
): Promise<number> {
  return await catatJedaDenyut(
    pengerjaanId,
    userId,
    paketId,
    subtes,
    "denyut_tersendat",
    jedaDetik,
    `Sambungan putus ${jedaDetik} detik; halaman tetap terlihat dan mencoba ${percobaan} kali`,
  );
}

/**
 * Lupakan denyut terakhir. Dipakai saat pengelola membuka ujian susulan, supaya
 * jeda berhari-hari sejak ronde lama tidak langsung menggugurkan peserta pada
 * denyut pertamanya.
 */
export async function setelUlangDenyutIelts(pengerjaanId: number): Promise<void> {
  await run(
    "UPDATE ielts_pengerjaan SET denyut_at = NULL, denyut_aktif = 0 WHERE id = ?",
    pengerjaanId,
  );
}

/* ------------------------------------------------------------------ */
/* Menggugurkan & memulihkan                                            */
/* ------------------------------------------------------------------ */

/**
 * Menggugurkan pengerjaan IELTS.
 *
 * Bentuknya mengikuti `gugurkanUjian()` di `exam.ts`: seluruh timer subtes yang
 * masih terbuka ikut ditutup, statusnya menjadi `gugur`, dan alasannya disimpan
 * supaya peserta yang memuat ulang halaman membaca sebab yang sama persis.
 * Idempoten — memanggilnya ulang tidak mengubah apa pun.
 *
 * Jawaban dan catatan pelanggaran TIDAK dihapus: keduanya bukti, dan pengelola
 * harus bisa membacanya saat peserta membantah.
 */
export async function gugurkanIelts(pengerjaanId: number, alasan: string): Promise<boolean> {
  const p = await pengerjaanById(pengerjaanId);
  if (!p || p.status !== "ongoing") return false;

  await run(
    `UPDATE ielts_subtes SET selesai_at = datetime('now')
      WHERE pengerjaan_id = ? AND selesai_at IS NULL`,
    pengerjaanId,
  );
  const res = await run(
    `UPDATE ielts_pengerjaan
        SET status        = 'gugur',
            digugurkan_at = datetime('now','localtime'),
            alasan_gugur  = ?,
            subtes_aktif  = NULL
      WHERE id = ? AND status = 'ongoing'`,
    alasan,
    pengerjaanId,
  );
  return Number(res.changes) > 0;
}

/**
 * Membuka ujian susulan IELTS untuk satu peserta.
 *
 * Ronde naik satu, statusnya kembali `ongoing`, timer subtes dan jawabannya
 * dibersihkan supaya peserta benar-benar mengulang dari awal — sedangkan
 * CATATAN PELANGGARAN ronde lama sengaja DIBIARKAN. Itu bukti yang harus tetap
 * bisa dibaca pengawas berbulan-bulan kemudian; yang membuatnya tidak lagi
 * membebani peserta adalah nomor rondenya, bukan penghapusannya.
 */
export interface HasilBukaBlokirIelts {
  error?: string;
  /** Subtes yang dibuka kembali, mis. "LISTENING". */
  subtes?: string | null;
  /** Berapa detik sisa waktu subtes itu dikembalikan. */
  dikembalikanDetik?: number;
  /** true = jendela paketnya sudah tutup; peserta tetap bisa lanjut, tetapi
   *  tidak akan menemukan paketnya lagi dari daftar. */
  jendelaTutup?: boolean;
}

/**
 * DIBUKA — peserta yang dihentikan MELANJUTKAN, bukan mengulang.
 *
 * Padanan persis `bukaBlokirUjian()` di jalur UTBK-SNBT, dan bedanya dengan
 * tetangganya di bawah adalah beda yang paling penting di seluruh berkas ini:
 *
 *   Dibuka (ini)      → tidak menghapus apa pun. Jawaban yang sudah terisi
 *                       tetap, dan peserta kembali ke subtes yang tadi
 *                       terpotong dengan sisa waktu yang dikembalikan.
 *   Buka sesi ulang   → `bukaSusulanIelts()` MENGHAPUS jawaban dan timer;
 *                       peserta mengulang dari Listening. Itu padanan
 *                       "Ujian Susulan" di jalur UTBK.
 *
 * Dibuat 11 September 2026 atas permintaan pengelola, sesudah 132 peserta
 * dihentikan oleh cacat pada tombol Play rekaman — menyuruh mereka mengulang
 * dari nol jelas tidak adil, sebab yang hilang bukan pekerjaannya.
 *
 * TIGA HAL YANG DIKEMBALIKAN, dan ketiganya perlu:
 *
 *  1. BARIS SUBTES DIBUKA LAGI. `gugurkanIelts()` menutup setiap subtes yang
 *     masih berjalan, jadi yang ditutup PADA detik pengguguran itulah yang
 *     dibuka kembali — bukan subtes yang memang sudah tuntas sebelumnya.
 *  2. TENGGAT DIGESER selama peserta terblokir. Tanpa ini, peserta yang
 *     dibukakan dua puluh menit kemudian mendapati subtesnya langsung
 *     kedaluwarsa: `tutupYangHabis()` menutupnya lagi sebelum satu soal pun
 *     tampil.
 *  3. RONDE DINAIKKAN. Catatan ronde lama tetap tersimpan sebagai bukti bagi
 *     pengawas, tetapi berhenti ikut dihitung — kalau tidak, peserta yang tadi
 *     gugur karena anggarannya penuh akan gugur lagi pada kepergian berikutnya.
 *
 * JEBAKAN ZONA WAKTU yang wajib diperhatikan bila query di bawah disunting:
 * `digugurkan_at` ditulis `datetime('now','localtime')` (WIB) sedangkan
 * `ielts_subtes.selesai_at` ditulis `datetime('now')` (UTC). Keduanya
 * disamakan lebih dulu dengan `datetime(?, 'utc', ...)`, persis seperti di
 * `bukaBlokirUjian()`. Toleransi tiga menit menutupi selisih penulisan.
 */
export async function bukaBlokirIelts(pengerjaanId: number): Promise<HasilBukaBlokirIelts> {
  const p = await one<{
    id: number;
    paket_id: number;
    status: string;
    digugurkan_at: string | null;
    terblokir_detik: number | null;
  }>(
    `SELECT id, paket_id, status, digugurkan_at,
            CAST(strftime('%s', datetime('now','localtime'))
                 - strftime('%s', digugurkan_at) AS INTEGER) AS terblokir_detik
       FROM ielts_pengerjaan WHERE id = ?`,
    pengerjaanId,
  );

  if (!p) return { error: "Pengerjaan tidak ditemukan." };
  if (p.status === "finished") {
    return { error: "Pengerjaan peserta ini sudah selesai dan sudah dinilai." };
  }
  if (p.status !== "gugur") {
    return { error: "Ujian peserta ini tidak sedang dihentikan, jadi tidak ada yang perlu dibuka." };
  }

  // Jeda negatif berarti jamnya bergeser; jangan sampai malah memotong waktu.
  const terblokir = Math.max(0, p.terblokir_detik ?? 0);

  // SATU baris saja yang dibuka kembali, dan itu disengaja.
  //
  // `gugurkanIelts()` menutup setiap subtes yang masih berjalan, tetapi menurut
  // rancangannya hanya ADA SATU yang terbuka pada satu waktu — `selesaikanSubtes()`
  // menutup yang lama sebelum yang berikutnya dibuka. Jadi paling banyak satu
  // baris yang ditutup OLEH pengguguran.
  //
  // TOLERANSINYA 5 DETIK, bukan tiga menit seperti di `bukaBlokirUjian()` pada
  // jalur UTBK. Tiga menit terlalu longgar dan terbukti keliru: peserta yang
  // dihentikan dalam dua menit sesudah menutup subtes sebelumnya — persis yang
  // terjadi massal pada 11 September 2026 — membuat subtes yang SUDAH TUNTAS
  // ikut terbuka lagi. Kedua penulisan waktu di `gugurkanIelts()` berjarak
  // milidetik, jadi lima detik sudah jauh lebih dari cukup.
  //
  // `id DESC` memutus seri ketika keduanya tercatat pada detik yang sama:
  // baris subtes dibuat berurutan, jadi id terbesar adalah yang paling akhir
  // dibuka — yaitu subtes yang sedang dikerjakan saat ujiannya dihentikan.
  const baris = await one<{ id: number; subtes: string }>(
    `SELECT id, subtes FROM ielts_subtes
      WHERE pengerjaan_id = ?1
        AND selesai_at IS NOT NULL
        AND selesai_at >= datetime(?2, 'utc', '-5 seconds')
   ORDER BY id DESC
      LIMIT 1`,
    p.id,
    p.digugurkan_at,
  );

  if (baris) {
    await run(
      `UPDATE ielts_subtes
          SET selesai_at  = NULL,
              deadline_at = datetime(deadline_at, ? || ' seconds')
        WHERE id = ?`,
      `+${terblokir}`,
      baris.id,
    );
  }

  await run(
    `UPDATE ielts_pengerjaan
        SET status        = 'ongoing',
            digugurkan_at = NULL,
            alasan_gugur  = NULL,
            finished_at   = NULL,
            ronde         = ronde + 1
      WHERE id = ?`,
    p.id,
  );
  // Denyut ronde lama dilupakan: jeda sepanjang masa terblokir akan langsung
  // terbaca sebagai kepergian bila dibiarkan.
  await setelUlangDenyutIelts(p.id);

  // Peserta TETAP bisa melanjutkan meski jendela paketnya sudah tutup — papan
  // subtes membaca `pengerjaanBerjalan()`, yang hanya melihat statusnya. Yang
  // hilang hanyalah paketnya dari daftar "Mulai ujian", dan pengelola berhak
  // tahu itu sebelum menutup halaman.
  const terbuka = await one<{ n: number }>(
    `SELECT COUNT(*) AS n FROM ielts_paket
      WHERE id = ? AND status = 'published'
        AND (mulai_at   IS NULL OR TRIM(CAST(mulai_at AS TEXT))   = '' OR datetime(mulai_at)   <= datetime('now','localtime'))
        AND (selesai_at IS NULL OR TRIM(CAST(selesai_at AS TEXT)) = '' OR datetime(selesai_at) >= datetime('now','localtime'))`,
    p.paket_id,
  );

  return {
    subtes: baris?.subtes ?? null,
    dikembalikanDetik: terblokir,
    jendelaTutup: (terbuka?.n ?? 0) === 0,
  };
}

export async function bukaSusulanIelts(pengerjaanId: number): Promise<boolean> {
  const p = await pengerjaanById(pengerjaanId);
  if (!p) return false;

  await run("DELETE FROM ielts_jawaban WHERE pengerjaan_id = ?", pengerjaanId);
  await run("DELETE FROM ielts_subtes WHERE pengerjaan_id = ?", pengerjaanId);
  const res = await run(
    `UPDATE ielts_pengerjaan
        SET status        = 'ongoing',
            ronde         = ronde + 1,
            digugurkan_at = NULL,
            alasan_gugur  = NULL,
            subtes_aktif  = NULL,
            finished_at   = NULL
      WHERE id = ?`,
    pengerjaanId,
  );
  await setelUlangDenyutIelts(pengerjaanId);
  return Number(res.changes) > 0;
}

/** Menandai subtes yang sedang dikerjakan, supaya baris pelanggaran tahu tempatnya. */
export async function tandaiSubtesAktif(pengerjaanId: number, subtes: string | null): Promise<void> {
  await run("UPDATE ielts_pengerjaan SET subtes_aktif = ? WHERE id = ?", subtes, pengerjaanId);
}

/* ------------------------------------------------------------------ */
/* Membaca untuk pengawas                                               */
/* ------------------------------------------------------------------ */

export async function pelanggaranPengerjaan(pengerjaanId: number): Promise<PelanggaranIelts[]> {
  return await all<PelanggaranIelts>(
    "SELECT * FROM ielts_pelanggaran WHERE pengerjaan_id = ? ORDER BY id",
    pengerjaanId,
  );
}

/** Rekap satu paket: satu baris per peserta yang punya catatan atau digugurkan. */
export async function rekapPelanggaranIelts(paketId: number): Promise<RekapIelts[]> {
  return await all<RekapIelts>(
    `SELECT p.id                                   AS pengerjaanId,
            p.user_id                              AS userId,
            u.nama                                 AS nama,
            u.nisn                                 AS nisn,
            u.kelas                                AS kelas,
            p.status                               AS status,
            p.ronde                                AS ronde,
            COUNT(v.id)                            AS jumlah,
            COALESCE(SUM(
              CASE WHEN v.jenis IN ('blur_window','esc_layar_penuh','alt_tab',
                                    'pergi_lama','pergi_menumpuk','denyut_hilang',
                                    'tangkap_layar')
                   THEN 1 ELSE 0 END), 0)          AS menggugurkan,
            COALESCE(SUM(
              CASE WHEN v.jenis IN ('keluar_tab','pergi_lama','pergi_menumpuk','denyut_hilang')
                   THEN COALESCE(v.durasi_detik, 0) ELSE 0 END), 0) AS totalDetikPergi,
            p.alasan_gugur                         AS alasanGugur,
            p.digugurkan_at                        AS digugurkanAt,
            MAX(v.mulai_at)                        AS terakhirAt
       FROM ielts_pengerjaan p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN ielts_pelanggaran v
              ON v.pengerjaan_id = p.id AND v.ronde = p.ronde
      WHERE p.paket_id = ?
      GROUP BY p.id, p.user_id, u.nama, u.nisn, u.kelas, p.status, p.ronde, p.alasan_gugur, p.digugurkan_at
     HAVING COUNT(v.id) > 0 OR p.status = 'gugur'
      ORDER BY (p.status = 'gugur') DESC, COUNT(v.id) DESC, u.nama`,
    paketId,
  );
}

/** Rincian tiap kejadian satu paket, terbaru di atas. */
export async function rincianPelanggaranIelts(paketId: number): Promise<RincianIelts[]> {
  return (await all<Omit<RincianIelts, "label">>(
    `SELECT v.*, u.nama AS nama, u.nisn AS nisn
       FROM ielts_pelanggaran v
       JOIN users u ON u.id = v.user_id
      WHERE v.paket_id = ?
      ORDER BY v.mulai_at DESC, v.id DESC`,
    paketId,
  )).map((r) => ({ ...r, label: labelJenis(r.jenis) }));
}

/** Berapa kejadian tercatat pada satu paket — untuk lencana di daftar paket. */
/**
 * Jumlah pelanggaran untuk BANYAK paket sekaligus. SATU query.
 *
 * Halaman Keamanan Ujian memanggil `totalPelanggaranPaketIelts()` DUA KALI
 * untuk tiap paket — sekali saat memilih paket bawaan, sekali lagi saat
 * menggambar lencana angkanya. Pada sepuluh paket itu dua puluh query untuk
 * sepuluh angka yang bisa diambil sekali jalan.
 */
export async function totalPelanggaranPerPaketIelts(
  paketIds: number[],
): Promise<Map<number, number>> {
  if (paketIds.length === 0) return new Map();
  return new Map(
    (await all<{ paket_id: number; n: number }>(
      `SELECT paket_id, COUNT(*) AS n FROM ielts_pelanggaran
        WHERE paket_id = ANY(?::int[]) GROUP BY paket_id`,
      paketIds,
    )).map((r) => [r.paket_id, r.n]),
  );
}

export async function totalPelanggaranPaketIelts(paketId: number): Promise<number> {
  return (
    (await one<{ n: number }>(
      "SELECT COUNT(*) AS n FROM ielts_pelanggaran WHERE paket_id = ?",
      paketId,
    ))?.n ?? 0
  );
}

/** Pengerjaan berikut nama pesertanya; dipakai panel pengawas. */
export async function pengerjaanDenganPeserta(
  pengerjaanId: number,
): Promise<(PengerjaanIelts & { nama: string; nisn: string | null }) | undefined> {
  return await one<PengerjaanIelts & { nama: string; nisn: string | null }>(
    `SELECT p.*, u.nama AS nama, u.nisn AS nisn
       FROM ielts_pengerjaan p JOIN users u ON u.id = p.user_id
      WHERE p.id = ?`,
    pengerjaanId,
  );
}
