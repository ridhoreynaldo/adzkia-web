import "server-only";

import { all, one, run, sisipWajib} from "@/lib/core/db";
import * as heartbeatRepo from "@/server/repositories/heartbeat.repository";
import * as violationRepo from "@/server/repositories/violation.repository";
import { namaSubtes } from "@/lib/tryout/snbt";

/**
 * Pencatatan pelanggaran ujian.
 *
 * Dua tingkat kejadian dicatat di tabel yang sama, dibedakan oleh kolom `jenis`:
 *
 *  1. MENGGUGURKAN — peserta meninggalkan halaman ujian: pindah tab, jendela
 *     kehilangan fokus, atau keluar dari mode layar penuh.
 *  2. CATATAN SAJA — percobaan menyalin soal, klik kanan, atau menekan jalan
 *     pintas terlarang. Tidak menggugurkan, tetapi masuk laporan pengawas
 *     sebagai bukti niat curang.
 *
 * Browser tidak mengizinkan halaman melihat APA yang dibuka peserta, jadi yang
 * dicatat adalah kapan ia pergi, kapan kembali, dan berapa lama. Itu sudah cukup
 * sebagai bukti untuk pengawas.
 */

// Daftar jenis, akibat, dan kalimatnya tinggal di `pelanggaran-jenis.ts` supaya
// peramban bisa memakainya tanpa ikut menarik kode basis data. Diekspor ulang di
// sini agar seluruh pemanggil lama tidak perlu diubah.
export {
  JENIS_MENGGUGURKAN,
  JENIS_CATATAN,
  LABEL_JENIS,
  labelJenis,
  menggugurkan,
} from "@/lib/penjagaan/pelanggaran-jenis";
export type { JenisPelanggaran } from "@/lib/penjagaan/pelanggaran-jenis";

export interface PelanggaranRow {
  id: number;
  attempt_id: number;
  user_id: number;
  package_id: number;
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

export interface BarisRekap {
  user_id: number;
  attempt_id: number;
  nama: string;
  email: string;
  asal_sekolah: string | null;
  status: string;
  total_skor: number | null;
  jumlah: number;
  total_detik: number;
  terlama_detik: number;
  terakhir_at: string | null;
}

export interface PelanggaranRinci extends PelanggaranRow {
  nama: string;
  email: string;
  asal_sekolah: string | null;
  paket_kode: string;
  paket_nama: string;
}

/** Ronde attempt yang sedang berjalan (naik setelah disetel ulang untuk susulan). */
async function rondeAttempt(attemptId: number): Promise<number> {
  return (await one<{ ronde: number }>("SELECT ronde FROM attempts WHERE id = ?", attemptId))?.ronde ?? 1;
}

/**
 * Catat percobaan curang yang TIDAK menggugurkan (menyalin, klik kanan, jalan
 * pintas). Langsung ditutup pada detik yang sama karena bukan kepergian yang
 * punya durasi.
 */
export async function catatPercobaan(
  attemptId: number,
  userId: number,
  packageId: number,
  subtes: string | null,
  jenis: string,
  keterangan: string | null = null,
  kejadian: string | null = null,
): Promise<number> {
  const kembar = kejadian ? await cariKejadian(attemptId, kejadian) : null;
  if (kembar) return kembar.id;
  const ronde = await rondeAttempt(attemptId);
  const sebelumnya = await one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM violations WHERE attempt_id = ? AND ronde = ?",
    attemptId,
    ronde,
  );
  const res = await sisipWajib(
    `INSERT INTO violations
       (attempt_id, user_id, package_id, subtes, jenis, urutan, ronde,
        kembali_at, durasi_detik, keterangan, kejadian)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'), 0, ?, ?)`,
    attemptId,
    userId,
    packageId,
    subtes,
    jenis,
    (sebelumnya?.n ?? 0) + 1,
    ronde,
    keterangan,
    kejadian,
  );
  return res;
}

/** Catat peserta meninggalkan halaman. Mengembalikan id baris + urutan pelanggaran. */
export async function catatKeluar(
  attemptId: number,
  userId: number,
  packageId: number,
  subtes: string | null,
  jenis = "keluar_tab",
  kejadian: string | null = null,
): Promise<{ id: number; urutan: number; kembar: boolean }> {
  // Satu kepergian dilaporkan dua kali: sekali lewat sendBeacon (tahan
  // pembekuan halaman iPhone) dan sekali lewat fetch (membawa jawaban server).
  // Yang datang belakangan mengembalikan baris yang sama, bukan baris baru.
  const lama = kejadian ? await cariKejadian(attemptId, kejadian) : null;
  if (lama) return { id: lama.id, urutan: lama.urutan, kembar: true };

  const ronde = await rondeAttempt(attemptId);
  const sebelumnya = await one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM violations WHERE attempt_id = ? AND ronde = ?",
    attemptId,
    ronde,
  );
  const urutan = (sebelumnya?.n ?? 0) + 1;
  const res = await sisipWajib(
    `INSERT INTO violations
       (attempt_id, user_id, package_id, subtes, jenis, urutan, ronde, kejadian)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    attemptId,
    userId,
    packageId,
    subtes,
    jenis,
    urutan,
    ronde,
    kejadian,
  );
  return { id: res, urutan, kembar: false };
}

/** Baris pelanggaran dengan penanda kejadian yang sama, bila sudah ada. */
async function cariKejadian(
  attemptId: number,
  kejadian: string,
): Promise<{ id: number; urutan: number; jenis: string } | null> {
  return (
    await one<{ id: number; urutan: number; jenis: string }>(
      "SELECT id, urutan, jenis FROM violations WHERE attempt_id = ? AND kejadian = ?",
      attemptId,
      kejadian,
    ) ?? null
  );
}

/** Tandai peserta sudah kembali ke halaman ujian, sekalian hitung durasinya. */
export async function catatKembali(violationId: number, attemptId: number): Promise<number | null> {
  await run(
    `UPDATE violations
        SET kembali_at   = datetime('now','localtime'),
            durasi_detik = CAST(ROUND((julianday('now') - julianday(mulai_at, 'utc')) * 86400) AS INTEGER)
      WHERE id = ? AND attempt_id = ? AND kembali_at IS NULL`,
    violationId,
    attemptId,
  );
  const row = await one<{ durasi_detik: number | null }>(
    "SELECT durasi_detik FROM violations WHERE id = ?",
    violationId,
  );
  return row?.durasi_detik ?? null;
}

/**
 * Menaikkan sebuah kepergian yang tadinya `keluar_tab` menjadi `pergi_lama`,
 * karena peserta baru kembali sesudah ambangnya lewat.
 *
 * Barisnya DINAIKKAN, bukan dibuatkan baris baru: yang terjadi memang satu
 * kejadian, dan pengawas harus melihatnya sebagai satu baris utuh lengkap
 * dengan jam pergi, jam kembali, dan lamanya. Membuat baris kedua akan membuat
 * satu kepergian terhitung dua kali di rekap.
 *
 * Sengaja hanya menyentuh baris ber-jenis `keluar_tab`: jenis lain sudah punya
 * putusannya sendiri, dan menimpanya akan menghapus sebab yang sebenarnya.
 */
export async function naikkanKePergiLama(violationId: number, attemptId: number): Promise<boolean> {
  const res = await run(
    `UPDATE violations
        SET jenis      = 'pergi_lama',
            keterangan = COALESCE(keterangan, '') ||
                         'Tidak kembali dalam batas waktu (' || COALESCE(durasi_detik, 0) || ' detik)'
      WHERE id = ? AND attempt_id = ? AND jenis = 'keluar_tab'`,
    violationId,
    attemptId,
  );
  return Number(res.changes) > 0;
}

/** Jumlah pelanggaran pada ronde yang sedang berjalan (ronde lama tidak ikut). */
export async function jumlahPelanggaran(attemptId: number): Promise<number> {
  return (
    (await one<{ n: number }>(
      `SELECT COUNT(*) AS n FROM violations
        WHERE attempt_id = ?
          AND ronde = COALESCE((SELECT ronde FROM attempts WHERE id = ?), 1)`,
      attemptId,
      attemptId,
    ))?.n ?? 0
  );
}

/**
 * Berapa kali peserta MENINGGALKAN halaman ujian pada ronde berjalan.
 *
 * Dipakai sebagai rem jumlah: kepergian tidak lagi menggugurkan seketika,
 * jadi tanpa hitungan ini peserta bisa mengintip berulang kali selama tiap
 * kalinya di bawah ambang waktu.
 */
export async function jumlahKepergian(attemptId: number): Promise<number> {
  return (
    (await one<{ n: number }>(
      `SELECT COUNT(*) AS n FROM violations
        WHERE attempt_id = ? AND jenis = 'keluar_tab'
          AND ronde = COALESCE((SELECT ronde FROM attempts WHERE id = ?), 1)`,
      attemptId,
      attemptId,
    ))?.n ?? 0
  );
}

/**
 * JUMLAH SELURUH DETIK peserta berada di luar halaman ujian pada ronde berjalan.
 *
 * Inilah yang membuat rem kepergian tidak bisa dikelabui dengan mencicil: tiap
 * kepergian dinilai sendiri oleh `pergi_lama`, sedangkan yang ini menilai
 * jumlahnya. Lihat BUDGET_PERGI_DETIK di `@/lib/denyut` untuk sebabnya.
 *
 * Yang dijumlahkan hanya kepergian yang benar-benar berarti "halaman ujian
 * tidak berada di depan peserta":
 *
 *   `keluar_tab`     halaman disembunyikan lalu peserta kembali;
 *   `pergi_lama`     kepergian yang sudah melewati ambang sendirian;
 *   `pergi_menumpuk` baris yang sudah dinaikkan oleh rem ini;
 *   `denyut_hilang`  peserta tidak pernah mengabari kembalinya.
 *
 * `denyut_tersendat` SENGAJA di luar daftar — halaman membuktikan dirinya tetap
 * terlihat sepanjang jeda itu, jadi menjumlahkannya berarti menghukum peserta
 * atas jaringannya. Begitu pula `blur_window` dan `keluar_layar_penuh`: pada
 * keduanya halaman ujian masih terpampang di layar peserta.
 */
export async function totalDetikKepergian(attemptId: number): Promise<number> {
  return (
    (await one<{ n: number }>(
      `SELECT COALESCE(SUM(durasi_detik), 0) AS n FROM violations
        WHERE attempt_id = ?
          AND jenis IN ('keluar_tab', 'pergi_lama', 'pergi_menumpuk', 'denyut_hilang')
          AND ronde = COALESCE((SELECT ronde FROM attempts WHERE id = ?), 1)`,
      attemptId,
      attemptId,
    ))?.n ?? 0
  );
}

/**
 * Menaikkan kepergian biasa menjadi `pergi_menumpuk`, karena JUMLAH seluruh
 * kepergian ronde ini sudah melewati anggarannya.
 *
 * Sama seperti `naikkanKePergiLama`: barisnya dinaikkan, bukan ditambah, supaya
 * satu kejadian tetap satu baris di mata pengawas — dan keterangannya membawa
 * angka jumlahnya, sehingga laporan menjelaskan sendiri mengapa kepergian
 * sependek ini berakibat gugur.
 */
export async function naikkanKePergiMenumpuk(
  violationId: number,
  attemptId: number,
  totalDetik: number,
): Promise<boolean> {
  const res = await run(
    `UPDATE violations
        SET jenis      = 'pergi_menumpuk',
            keterangan = COALESCE(keterangan || ' · ', '') ||
                         'Jumlah seluruh kepergian mencapai ' || CAST(? AS INTEGER) || ' detik'
      WHERE id = ? AND attempt_id = ? AND jenis = 'keluar_tab'`,
    Math.round(totalDetik),
    violationId,
    attemptId,
  );
  return Number(res.changes) > 0;
}

/**
 * Menempelkan jumlah kepergian berjalan ke keterangan barisnya.
 *
 * Diminta pengelola bersama rem menumpuk itu sendiri: pengawas harus bisa
 * MELIHAT pola bolak-baliknya di `/admin/pelanggaran`, bukan cuma melihat
 * deretan kepergian pendek yang masing-masing tampak tidak berarti.
 */
export async function tandaiTotalKepergian(
  violationId: number,
  attemptId: number,
  totalDetik: number,
  budget: number,
): Promise<void> {
  await run(
    `UPDATE violations
        SET keterangan = COALESCE(keterangan || ' · ', '') ||
                         'Jumlah kepergian ' || CAST(? AS INTEGER) || '/' || CAST(? AS INTEGER) || ' detik'
      WHERE id = ? AND attempt_id = ? AND keterangan IS NULL`,
    Math.round(totalDetik),
    Math.round(budget),
    violationId,
    attemptId,
  );
}

/** Berapa kali peserta keluar dari mode layar penuh pada ronde berjalan. */
export async function jumlahKeluarLayarPenuh(attemptId: number): Promise<number> {
  return (
    (await one<{ n: number }>(
      `SELECT COUNT(*) AS n FROM violations
        WHERE attempt_id = ? AND jenis = 'keluar_layar_penuh'
          AND ronde = COALESCE((SELECT ronde FROM attempts WHERE id = ?), 1)`,
      attemptId,
      attemptId,
    ))?.n ?? 0
  );
}

/**
 * Denyut nadi ruang ujian.
 *
 * iPhone tidak punya Fullscreen API dan — jauh lebih penting — MEMBEKUKAN
 * JavaScript beberapa milidetik setelah halaman disembunyikan. Laporan "peserta
 * pergi" yang dikirim pada saat itu bisa mati di tengah jalan, sehingga server
 * tidak pernah tahu dan peserta tinggal memuat ulang halaman untuk melanjutkan.
 *
 * Yang tidak bisa ikut hilang adalah KETIADAAN denyut. Selama penjagaan menyala,
 * ruang ujian berdenyut tiap beberapa detik. Bila jarak antara dua denyut
 * bersenjata melebihi ambang, satu-satunya penjelasan adalah halaman itu tidak
 * berada di depan peserta.
 *
 * Mengembalikan jeda (detik) sejak denyut bersenjata sebelumnya, atau `null`
 * bila tidak ada yang bisa dibandingkan.
 *
 * `nilaiJeda` memisahkan dua macam denyut tak bersenjata, dan pemisahan itulah
 * yang menutup celah muat-ulang:
 *
 *  - Pembongkaran yang DISENGAJA (peserta menekan "Selesaikan Subtes", atau
 *    meninggalkan ruang ujian lewat tombol) mengirim `nilaiJeda: false`. Jeda
 *    apa pun sesudahnya bukan urusan penjagaan.
 *  - Denyut PERTAMA sesudah halaman dimuat ulang mengirim `nilaiJeda: true`
 *    walau penjagaannya belum menyala. Kalau denyut sebelumnya bersenjata dan
 *    jaraknya jauh, artinya halaman sempat mati sementara ujian berjalan —
 *    persis yang terjadi ketika peserta iPhone pindah aplikasi, laporannya ikut
 *    beku, lalu ia memuat ulang halaman dan berharap ujiannya utuh.
 */
export async function catatDenyut(
  attemptId: number,
  aktif: boolean,
  nilaiJeda = aktif,
): Promise<number | null> {
  // SATU query, dan alasannya bukan cuma beban: SELECT-lalu-UPDATE punya
  // balapan yang MENGGUGURKAN ORANG. Penjelasan lengkapnya ada di
  // `src/server/repositories/heartbeat.repository.ts`.
  const { jeda } = await heartbeatRepo.catat(attemptId, aktif, nilaiJeda);
  return jeda;
}

/**
 * Catat hilangnya denyut. Berbeda dengan kepergian biasa, kejadian ini sudah
 * SELESAI saat diketahui — peserta justru sedang kembali — jadi barisnya
 * langsung ditutup dengan durasi sepanjang jeda yang terukur, supaya pengawas
 * membaca "tidak merespons 47 dtk" dan bukan durasi kosong.
 */
export async function catatDenyutHilang(
  attemptId: number,
  userId: number,
  packageId: number,
  subtes: string | null,
  jedaDetik: number,
): Promise<number> {
  // SATU query, turun dari tiga — dan nomor `urutan`-nya tidak lagi bisa
  // kembar. Lihat `violationRepo.sisipKejadianSelesai()`.
  const id = await violationRepo.sisipKejadianSelesai(
    attemptId,
    subtes,
    "denyut_hilang",
    jedaDetik,
    `Halaman ujian diam ${jedaDetik} detik`,
  );
  if (id === null) throw new Error("Gagal mencatat denyut hilang: sesi tidak ditemukan.");
  return id;
}

/**
 * Catat jeda denyut yang TERBUKTI gangguan jaringan, bukan kepergian: halaman
 * tetap terlihat sepanjang jeda dan berkali-kali mencoba menghubungi server.
 *
 * Bentuk barisnya sama persis dengan `catatDenyutHilang` — sudah tertutup,
 * durasinya sepanjang jeda — supaya pengawas membaca keduanya berdampingan di
 * tabel yang sama. Bedanya hanya satu: yang ini tidak menggugurkan.
 */
export async function catatDenyutTersendat(
  attemptId: number,
  userId: number,
  packageId: number,
  subtes: string | null,
  jedaDetik: number,
  percobaan: number,
): Promise<number> {
  const id = await violationRepo.sisipKejadianSelesai(
    attemptId,
    subtes,
    "denyut_tersendat",
    jedaDetik,
    `Sambungan putus ${jedaDetik} detik; halaman tetap terlihat dan mencoba ${percobaan} kali`,
  );
  if (id === null) throw new Error("Gagal mencatat denyut tersendat: sesi tidak ditemukan.");
  return id;
}

/**
 * Lupakan denyut terakhir. Dipakai saat attempt disetel ulang untuk ujian
 * susulan, supaya jeda berhari-hari sejak ronde lama tidak langsung
 * menggugurkan peserta pada denyut pertamanya.
 */
export async function setelUlangDenyut(attemptId: number): Promise<void> {
  await heartbeatRepo.lupakan(attemptId);
}

export async function pelanggaranAttempt(attemptId: number): Promise<PelanggaranRow[]> {
  return await all<PelanggaranRow>(
    "SELECT * FROM violations WHERE attempt_id = ? ORDER BY urutan",
    attemptId,
  );
}

/** Rekap per peserta untuk satu paket — dipakai tabel admin. */
export async function rekapPelanggaran(packageId: number): Promise<BarisRekap[]> {
  return await all<BarisRekap>(
    `SELECT u.id           AS user_id,
            a.id           AS attempt_id,
            u.nama, u.email, u.asal_sekolah,
            a.status, a.total_skor,
            COUNT(v.id)                          AS jumlah,
            COALESCE(SUM(v.durasi_detik), 0)     AS total_detik,
            COALESCE(MAX(v.durasi_detik), 0)     AS terlama_detik,
            MAX(v.mulai_at)                      AS terakhir_at
       FROM violations v
       JOIN attempts a ON a.id = v.attempt_id
       JOIN users u    ON u.id = v.user_id
      WHERE v.package_id = ?
   GROUP BY a.id, u.id
   ORDER BY jumlah DESC, total_detik DESC`,
    packageId,
  );
}

/** Seluruh kejadian satu paket, terurut waktu — dipakai ekspor Excel. */
export async function rincianPelanggaran(packageId: number): Promise<PelanggaranRinci[]> {
  return await all<PelanggaranRinci>(
    `SELECT v.*, u.nama, u.email, u.asal_sekolah, p.kode AS paket_kode, p.nama AS paket_nama
       FROM violations v
       JOIN users u    ON u.id = v.user_id
       JOIN packages p ON p.id = v.package_id
      WHERE v.package_id = ?
   ORDER BY v.mulai_at, v.id`,
    packageId,
  );
}

export async function totalPelanggaranPaket(packageId: number): Promise<number> {
  return (
    (await one<{ n: number }>("SELECT COUNT(*) AS n FROM violations WHERE package_id = ?", packageId))?.n ?? 0
  );
}

/** "Penalaran Umum" / "—" untuk kolom subtes di tabel dan Excel. */
export function labelSubtes(kode: string | null): string {
  if (!kode) return "—";
  return namaSubtes(kode);
}

/** 95 -> "1 mnt 35 dtk" */
export function formatDurasi(detik: number | null): string {
  if (detik === null || detik === undefined) return "—";
  if (detik < 60) return `${detik} dtk`;
  const m = Math.floor(detik / 60);
  const s = detik % 60;
  return s === 0 ? `${m} mnt` : `${m} mnt ${s} dtk`;
}

/** Tingkat kerawanan untuk penanda warna di tabel admin. */
export function tingkatKerawanan(jumlah: number): "aman" | "waspada" | "berat" {
  if (jumlah >= 5) return "berat";
  if (jumlah >= 2) return "waspada";
  return "aman";
}
