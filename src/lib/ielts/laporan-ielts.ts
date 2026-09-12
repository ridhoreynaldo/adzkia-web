import "server-only";

import * as ExcelJSNs from "exceljs";

import { one } from "@/lib/core/db";
import { SUBTES_IELTS, sebutanBand, type PaketIelts } from "@/lib/ielts/ielts";
import { peringkatIelts, statistikIelts, type BarisPeringkatIelts } from "@/lib/ielts/ielts-peringkat";

// exceljs dipublikasikan sebagai CommonJS; pola yang sama dipakai
// `laporan-hasil.ts`, `import-soal.ts`, dan `laporan-pelanggaran.ts`.
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
 * Disusun per bagian, bukan lewat `new Date(teks)`: string tanggal telanjang
 * dibaca JavaScript sebagai tengah malam UTC, dan pada zona di sebelah barat
 * Greenwich ia mundur satu hari. Penjelasan panjangnya ada di
 * `laporan-hasil.ts`, tempat jebakan yang sama sudah pernah ditangani.
 */
function tanggalPanjang(nilai: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((nilai ?? "").trim());
  if (!m) return null;
  const [, th, bl, tg] = m;
  const d = new Date(Number(th), Number(bl) - 1, Number(tg));
  return `${HARI[d.getDay()]}, ${Number(tg)} ${BULAN[Number(bl) - 1]} ${th}`;
}

/**
 * Tanggal ujian di kepala laporan: awal jendela paket, atau — untuk paket tanpa
 * jendela — hari peserta pertama menuntaskan ujiannya.
 *
 * `finished_at` ditulis `datetime('now')` yang berzona UTC sedangkan sekolahnya
 * berzona WIB, jadi digeser tujuh jam lebih dulu; tanpa itu ujian yang selesai
 * pukul 06.30 WIB tercetak sebagai hari sebelumnya.
 */
export async function tanggalUjianIelts(paket: PaketIelts): Promise<string | null> {
  const dariPengerjaan = (await one<{ tgl: string | null }>(
    `SELECT date(MIN(finished_at), '+7 hours') AS tgl
       FROM ielts_pengerjaan
      WHERE paket_id = ? AND finished_at IS NOT NULL`,
    paket.id,
  ))?.tgl;
  return tanggalPanjang(paket.mulai_at) ?? tanggalPanjang(dariPengerjaan);
}

/** Nama berkas unduhan — memuat kode paketnya supaya tidak tertukar. */
export function namaBerkasHasilIelts(paket: PaketIelts): string {
  const kode = paket.kode.replace(/[^A-Za-z0-9_-]+/g, "-");
  return `HASIL-IELTS-${kode}.xlsx`;
}

/**
 * Lembar HASIL IELTS — bentuknya sengaja dibuat sama dengan lembar hasil
 * TryOut UTBK-SNBT (`laporan-hasil.ts`): satu sheet, kepala hijau, nomor, nama,
 * lalu satu kolom tiap bagian ujian dan kolomnya yang terakhir angka akhir.
 *
 * Tiga hal yang BERBEDA dari lembar UTBK, dan ketiganya wajib:
 *
 *   1. Isinya band 0–9, bukan skor 0–1000. Band dicetak dengan satu angka di
 *      belakang koma karena "6" dan "6.5" adalah dua band yang berbeda.
 *   2. Ada kolom KELAS. Lembar IELTS dibaca guru bahasa yang mengajar lintas
 *      kelas, bukan wali kelas yang sudah tahu siapa anak asuhnya.
 *   3. Subtes yang bandnya belum keluar ditulis "—", bukan 0. Nol di kolom
 *      Writing berarti "karangannya tidak bernilai", padahal yang sebenarnya
 *      terjadi adalah gurunya belum sempat menilai. Kolom "Keterangan" di
 *      ujung menyebutkan subtes mana yang masih ditunggu.
 */
export async function bukuHasilIelts(
  paket: PaketIelts,
  papan: BarisPeringkatIelts[],
): Promise<Uint8Array<ArrayBuffer>> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ADZKIA SMART";
  wb.created = new Date();

  const ws = wb.addWorksheet("Hasil IELTS");
  const stat = statistikIelts(papan);

  ws.columns = [
    { key: "no", width: 6 },
    { key: "nama", width: 32 },
    { key: "kelas", width: 12 },
    ...SUBTES_IELTS.map((s) => ({ key: s.kode, width: 13 })),
    { key: "overall", width: 14 },
    { key: "sebutan", width: 22 },
    { key: "ket", width: 30 },
  ];

  const kolomTerakhir = ws.columns.length;
  const rentang = (r: number) => `A${r}:${ws.getColumn(kolomTerakhir).letter}${r}`;

  /* ---------------- kepala laporan ---------------- */

  const judul = ws.getRow(1);
  judul.getCell(1).value = `HASIL IELTS ${NAMA_SEKOLAH}`;
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

  const tanggal = await tanggalUjianIelts(paket);
  const barisTanggal = ws.getRow(3);
  barisTanggal.getCell(1).value = tanggal ? `Tanggal ujian: ${tanggal}` : "Tanggal ujian: —";
  ws.mergeCells(rentang(3));
  barisTanggal.getCell(1).alignment = { horizontal: "center" };
  barisTanggal.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: HIJAU_MUDA },
  };

  ws.getRow(4).height = 6; // jeda tipis sebelum tabel

  /* ---------------- kepala tabel ---------------- */

  const BARIS_KEPALA = 5;
  const kepala = ws.getRow(BARIS_KEPALA);
  kepala.values = [
    "No",
    "Nama Siswa",
    "Kelas",
    ...SUBTES_IELTS.map((s) => `${s.nama}\nband`),
    "Overall\nBand",
    "Sebutan",
    "Keterangan",
  ];
  kepala.font = { bold: true, color: { argb: "FFFFFFFF" } };
  kepala.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  kepala.height = 32;
  kepala.eachCell((sel) => {
    sel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HIJAU } };
    sel.border = { bottom: { style: "thin", color: { argb: HIJAU } } };
  });
  kepala.getCell(2).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  kepala.getCell(kolomTerakhir).alignment = { horizontal: "left", vertical: "middle", wrapText: true };

  // Kepala tabel dibekukan supaya nama siswa tetap terbaca saat digulung.
  ws.views = [{ state: "frozen", ySplit: BARIS_KEPALA }];

  /* ---------------- isi ---------------- */

  if (papan.length === 0) {
    const kosong = ws.getRow(BARIS_KEPALA + 1);
    kosong.getCell(1).value =
      "Belum ada peserta yang punya band pada paket ini.";
    ws.mergeCells(rentang(BARIS_KEPALA + 1));
    kosong.getCell(1).alignment = { horizontal: "center" };
    kosong.getCell(1).font = { italic: true };
  }

  papan.forEach((b, i) => {
    const ket = b.final
      ? ""
      : b.menunggu.length > 0
        ? `Band sementara — ${b.menunggu.join(" & ")} belum dinilai`
        : "Band sementara";

    const r = ws.addRow({
      no: b.peringkat,
      nama: b.nama,
      kelas: b.kelas ?? "—",
      ...Object.fromEntries(
        SUBTES_IELTS.map((s) => [s.kode, b.band[s.kode] === null ? "—" : b.band[s.kode]]),
      ),
      overall: b.overall ?? "—",
      sebutan: b.final && b.overall !== null ? sebutanBand(b.overall) : "—",
      ket,
    });
    r.alignment = { vertical: "middle" };
    r.getCell(1).alignment = { horizontal: "center" };
    // Kolom kelas sampai Overall rata tengah; nama, sebutan, dan keterangan kiri.
    for (let c = 3; c <= kolomTerakhir - 2; c++) {
      r.getCell(c).alignment = { horizontal: "center" };
      // "0.0" dipasang hanya pada sel berisi angka: sel berisi "—" akan
      // menampilkan tanda hubung itu apa adanya.
      if (typeof r.getCell(c).value === "number") r.getCell(c).numFmt = "0.0";
    }
    r.getCell(3).alignment = { horizontal: "center" };
    r.getCell(kolomTerakhir - 2).font = { bold: true };
    if (i % 2 === 1) {
      r.eachCell((sel) => {
        sel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ABU } };
      });
    }
  });

  /* ---------------- kaki: rata-rata ---------------- */

  if (papan.length > 0) {
    const kaki = ws.addRow({
      no: "",
      nama: "Rata-rata seluruh peserta",
      kelas: "",
      ...Object.fromEntries(
        stat.perSubtes.map((s) => [s.kode, s.rata === null ? "—" : s.rata]),
      ),
      overall: stat.rataOverall ?? "—",
      sebutan: "",
      ket: `${stat.jumlahFinal} dari ${stat.jumlahPeserta} peserta sudah final`,
    });
    kaki.font = { bold: true };
    kaki.eachCell((sel) => {
      sel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HIJAU_MUDA } };
    });
    for (let c = 3; c <= kolomTerakhir - 2; c++) {
      kaki.getCell(c).alignment = { horizontal: "center" };
      if (typeof kaki.getCell(c).value === "number") kaki.getCell(c).numFmt = "0.0";
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf) as Uint8Array<ArrayBuffer>;
}

/** Papan peringkat paket ini, sudah terurut — dipakai rute unduhan. */
export async function hasilIelts(paketId: number): Promise<BarisPeringkatIelts[]> {
  return await peringkatIelts(paketId);
}
