import "server-only";

import * as ExcelJSNs from "exceljs";

import { one } from "@/lib/core/db";
import { peringkatPeserta } from "@/lib/tryout/irt";
import { peringkatSkd } from "@/lib/tryout/nilai-skd";
import { SUBTES_SKD, URUTAN_SUBTES_SKD } from "@/lib/tryout/skd";
import { SUBTES, URUTAN_SUBTES } from "@/lib/tryout/snbt";

// exceljs dipublikasikan sebagai CommonJS; pola ini dipakai juga di
// import-soal.ts dan laporan-pelanggaran.ts.
const ExcelJS = ((ExcelJSNs as unknown as { default?: typeof ExcelJSNs }).default ??
  ExcelJSNs) as typeof ExcelJSNs;

const HIJAU = "FF0D6E6A";
const HIJAU_MUDA = "FFE3F2F1";
const ABU = "FFF2F5F7";

const NAMA_SEKOLAH = "SMA ISLAM PLUS ADZKIA MEDAN";

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/**
 * "Jumat, 11 September 2026" dari "2026-09-11" atau "2026-09-11T00:00".
 *
 * Tanggalnya dibaca sebagai tanggal LOKAL, bukan UTC: `new Date("2026-09-11")`
 * di JavaScript berarti tengah malam UTC, dan di WIB itu masih tanggal 11 —
 * tetapi pada zona di sebelah barat Greenwich ia mundur menjadi tanggal 10.
 * Menyusunnya per bagian menghindari jebakan itu sepenuhnya.
 */
function tanggalPanjang(nilai: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((nilai ?? "").trim());
  if (!m) return null;
  const [, th, bl, tg] = m;
  const d = new Date(Number(th), Number(bl) - 1, Number(tg));
  return `${HARI[d.getDay()]}, ${Number(tg)} ${BULAN[Number(bl) - 1]} ${th}`;
}

export interface InfoPaketHasil {
  id: number;
  kode: string;
  nama: string;
  jalur: string;
  /** Tanggal siklus pekanan ("2026-09-11"), bila paket ini bagian siklus. */
  siklus: string | null;
  /** Awal jendela pelaksanaan ("2026-09-11T00:00"), sebagai cadangan. */
  mulai_at: string | null;
}

/**
 * Tanggal ujian yang dicetak di kepala laporan.
 *
 * Urutannya disengaja: `siklus` adalah tanggal hari-H yang ditetapkan penjadwal
 * pekanan dan itulah tanggal yang dikenal orang tua ("tryout Jumat"), sedangkan
 * `mulai_at` hanyalah awal jendela pengerjaan yang kerap dibuka satu-dua hari
 * lebih awal supaya peserta susulan tertampung.
 */
export async function tanggalUjian(paket: InfoPaketHasil): Promise<string | null> {
  return (
    tanggalPanjang(paket.siklus) ??
    tanggalPanjang(paket.mulai_at) ??
    tanggalPanjang(await tanggalDariPengerjaan(paket.id))
  );
}

/**
 * Cadangan terakhir: tanggal saat peserta PERTAMA menuntaskan ujiannya.
 *
 * Dipakai untuk paket yang tidak berjendela dan tidak masuk siklus pekanan —
 * paket demo dan paket khusus. Tanpa ini kepala laporannya hanya bertuliskan
 * "Tanggal ujian: —", padahal ujiannya jelas pernah berlangsung.
 *
 * `finished_at` ditulis `datetime('now')` yang berzona UTC sedangkan sekolahnya
 * berzona WIB, jadi tanggalnya digeser tujuh jam lebih dulu. Tanpa pergeseran
 * itu, ujian yang selesai pukul 06.30 WIB akan tercetak sebagai hari sebelumnya.
 */
async function tanggalDariPengerjaan(paketId: number): Promise<string | null> {
  const r = await one<{ tgl: string | null }>(
    `SELECT date(MIN(finished_at), '+7 hours') AS tgl
       FROM attempts
      WHERE package_id = ? AND status = 'finished' AND finished_at IS NOT NULL`,
    paketId,
  );
  return r?.tgl ?? null;
}

/** Judul besar di baris pertama, mengikuti portal paketnya. */
export function judulLaporan(jalur: string): string {
  return jalur === "skd"
    ? `HASIL SKD KEDINASAN ${NAMA_SEKOLAH}`
    : `HASIL TRYOUT UTBK-SNBT ${NAMA_SEKOLAH}`;
}

interface Kolom {
  kode: string;
  judul: string;
}

/**
 * Kolom subtes beserta bunyi kepalanya.
 *
 * Kepala kolom memuat kode DAN nama panjangnya dalam dua baris. Lembar ini
 * dibagikan kepada orang tua, dan "PBM" atau "TIU" tidak berarti apa-apa bagi
 * orang yang tidak setiap hari mengurus tryout.
 */
function kolomSubtes(jalur: string): Kolom[] {
  if (jalur === "skd") {
    return URUTAN_SUBTES_SKD.map((kode) => {
      const s = SUBTES_SKD.find((x) => x.kode === kode);
      return { kode, judul: `${kode}\n${s?.namaPendek ?? kode}` };
    });
  }
  return URUTAN_SUBTES.map((kode) => {
    const s = SUBTES.find((x) => x.kode === kode);
    return { kode, judul: `${kode}\n${s?.namaPendek ?? kode}` };
  });
}

export interface BarisHasil {
  nama: string;
  skor: Record<string, number>;
  total: number;
}

/**
 * Baris hasil satu paket, urut dari skor tertinggi.
 *
 * Sengaja memakai kembali papan peringkat yang sudah ada (`peringkatPeserta`
 * untuk UTBK, `peringkatSkd` untuk SKD) alih-alih menulis query sendiri: bila
 * kelak cara menilai berubah, laporan ini ikut berubah dengan sendirinya dan
 * tidak akan pernah menyebut angka yang berbeda dari yang dibaca peserta di
 * halaman peringkat.
 */
export async function hasilPaket(paketId: number, jalur: string): Promise<BarisHasil[]> {
  if (jalur === "skd") {
    return (await peringkatSkd(paketId)).map((r) => ({
      nama: r.nama,
      skor: r.nilai,
      total: r.total,
    }));
  }
  return (await peringkatPeserta(paketId)).map((r) => ({
    nama: r.nama,
    skor: r.skorSubtes,
    total: r.totalSkor,
  }));
}

/**
 * Lembar HASIL TRYOUT untuk dibagikan kepada orang tua.
 *
 * SATU sheet, dan isinya sengaja hanya: nomor, nama siswa, skor tiap subtes,
 * dan skor total (ditetapkan pengelola 8 September 2026). Catatan pelanggaran
 * TIDAK ikut — laporan itu punya berkasnya sendiri di `/api/admin/pelanggaran`,
 * dan menyelipkannya ke lembar yang beredar di grup orang tua sama saja
 * mengumumkan dugaan pelanggaran seorang anak kepada seluruh angkatan.
 */
export async function bukuHasilPaket(
  paket: InfoPaketHasil,
  baris: BarisHasil[],
): Promise<Uint8Array<ArrayBuffer>> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ADZKIA SMART";
  wb.created = new Date();

  const kolom = kolomSubtes(paket.jalur);
  const ws = wb.addWorksheet("Hasil Tryout");

  // Lebar kolom dipasang lebih dulu; ExcelJS memakainya juga saat menghitung
  // penggabungan sel judul.
  ws.columns = [
    { key: "no", width: 6 },
    { key: "nama", width: 32 },
    ...kolom.map((k) => ({ key: k.kode, width: 13 })),
    { key: "total", width: 13 },
  ];

  const kolomTerakhir = 2 + kolom.length + 1; // No + Nama + subtes + Total
  const rentang = (r: number) => `A${r}:${ws.getColumn(kolomTerakhir).letter}${r}`;

  /* ---------------- kepala laporan ---------------- */

  const judul = ws.getRow(1);
  judul.getCell(1).value = judulLaporan(paket.jalur);
  ws.mergeCells(rentang(1));
  judul.getCell(1).font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  judul.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  judul.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: HIJAU } };
  judul.height = 26;

  const subJudul = ws.getRow(2);
  subJudul.getCell(1).value = `${paket.nama} (${paket.kode})`;
  ws.mergeCells(rentang(2));
  subJudul.getCell(1).font = { bold: true, size: 11 };
  subJudul.getCell(1).alignment = { horizontal: "center" };
  subJudul.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: HIJAU_MUDA } };

  const tanggal = await tanggalUjian(paket);
  const barisTanggal = ws.getRow(3);
  barisTanggal.getCell(1).value = tanggal
    ? `Tanggal ujian: ${tanggal}`
    : "Tanggal ujian: —";
  ws.mergeCells(rentang(3));
  barisTanggal.getCell(1).alignment = { horizontal: "center" };
  barisTanggal.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: HIJAU_MUDA } };

  ws.getRow(4).height = 6; // jeda tipis sebelum tabel

  /* ---------------- kepala tabel ---------------- */

  const BARIS_KEPALA = 5;
  const kepala = ws.getRow(BARIS_KEPALA);
  kepala.values = ["No", "Nama Siswa", ...kolom.map((k) => k.judul), "Total Skor"];
  kepala.font = { bold: true, color: { argb: "FFFFFFFF" } };
  kepala.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  kepala.height = 32;
  kepala.eachCell((sel) => {
    sel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HIJAU } };
    sel.border = { bottom: { style: "thin", color: { argb: HIJAU } } };
  });
  // Nama siswa rata kiri; sisanya biar tetap di tengah.
  kepala.getCell(2).alignment = { horizontal: "left", vertical: "middle", wrapText: true };

  // Kepala tabel dibekukan supaya nama siswa tetap terbaca saat digulung —
  // daftarnya bisa ratusan baris.
  ws.views = [{ state: "frozen", ySplit: BARIS_KEPALA }];

  /* ---------------- isi ---------------- */

  if (baris.length === 0) {
    const kosong = ws.getRow(BARIS_KEPALA + 1);
    kosong.getCell(1).value =
      "Belum ada peserta yang menuntaskan seluruh subtes pada paket ini.";
    ws.mergeCells(rentang(BARIS_KEPALA + 1));
    kosong.getCell(1).alignment = { horizontal: "center" };
    kosong.getCell(1).font = { italic: true };
  }

  baris.forEach((b, i) => {
    const r = ws.addRow({
      no: i + 1,
      nama: b.nama,
      ...Object.fromEntries(kolom.map((k) => [k.kode, b.skor[k.kode] ?? 0])),
      total: b.total,
    });
    r.alignment = { vertical: "middle" };
    r.getCell(1).alignment = { horizontal: "center" };
    for (let c = 3; c <= kolomTerakhir; c++) {
      r.getCell(c).alignment = { horizontal: "center" };
      r.getCell(c).numFmt = "0";
    }
    r.getCell(kolomTerakhir).font = { bold: true };
    if (i % 2 === 1) {
      r.eachCell((sel) => {
        sel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ABU } };
      });
    }
  });

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf) as Uint8Array<ArrayBuffer>;
}

/**
 * Nama berkas unduhan — memuat jalur, kode paket, dan tanggal ujiannya supaya
 * berkas yang menumpuk di folder unduhan pengelola tetap bisa dibedakan.
 */
export function namaBerkasHasil(paket: InfoPaketHasil): string {
  const label = paket.jalur === "skd" ? "HASIL-SKD" : "HASIL-TRYOUT-UTBK";
  const kode = paket.kode.replace(/[^A-Za-z0-9_-]+/g, "-");
  return `${label}-${kode}.xlsx`;
}
