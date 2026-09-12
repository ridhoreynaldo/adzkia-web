import "server-only";

import * as ExcelJSNs from "exceljs";

import type { RekapTahun } from "@/lib/laporan/rekap";
import { namaSubtes } from "@/lib/tryout/snbt";

// exceljs dipublikasikan sebagai CommonJS; pola ini dipakai juga di import-soal.ts.
const ExcelJS = ((ExcelJSNs as unknown as { default?: typeof ExcelJSNs }).default ??
  ExcelJSNs) as typeof ExcelJSNs;

const HIJAU = "FF0D6E6A";
const ORANYE = "FFD97706";

function pasangKepala(ws: ExcelJSNs.Worksheet, warna: string) {
  const baris = ws.getRow(1);
  baris.font = { bold: true, color: { argb: "FFFFFFFF" } };
  baris.fill = { type: "pattern", pattern: "solid", fgColor: { argb: warna } };
  baris.alignment = { vertical: "middle" };
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

/** "2026-08-27 08:43:00" (UTC) -> "27 Agu 2026" menurut jam pembaca berkas. */
function tanggalSingkat(nilai: string): string {
  const d = new Date(`${nilai.replace(" ", "T")}Z`);
  if (Number.isNaN(d.getTime())) return nilai;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export interface IdentitasRekap {
  nama: string;
  nisn: string | null;
  kelas: string | null;
  asalSekolah: string | null;
}

/**
 * Rekap Capaianku dalam .xlsx, dua sheet:
 *  1. "Rekap Tryout" — satu baris per tryout: tanggal, paket, skor tiap subtes,
 *     skor total, peringkat, dan rata-rata angkatan sebagai pembanding.
 *  2. "Ringkasan"    — identitas siswa dan capaian setahun dalam satu layar.
 */
export async function bukuRankUp(
  siswa: IdentitasRekap,
  rekap: RekapTahun,
): Promise<Uint8Array<ArrayBuffer>> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ADZKIA SMART";
  wb.created = new Date();

  /* ---------------- Sheet 1: satu baris per tryout ---------------- */
  const ws = wb.addWorksheet("Rekap Tryout");
  ws.columns = [
    { header: "No", key: "no", width: 5 },
    { header: "Tanggal", key: "tanggal", width: 14 },
    { header: "Kode Paket", key: "kode", width: 16 },
    { header: "Nama Paket", key: "paket", width: 38 },
    { header: "Jalur", key: "jalur", width: 10 },
    ...rekap.kolomSubtes.map((k) => ({ header: k, key: `s_${k}`, width: 9 })),
    { header: "Skor Total", key: "total", width: 12 },
    { header: "Peringkat", key: "peringkat", width: 11 },
    { header: "Jumlah Peserta", key: "peserta", width: 15 },
    { header: "Rata-rata Angkatan", key: "rata", width: 19 },
    { header: "Benar", key: "benar", width: 8 },
    { header: "Salah", key: "salah", width: 8 },
    { header: "Kosong", key: "kosong", width: 9 },
  ];
  pasangKepala(ws, HIJAU);

  // Urut kronologis supaya perkembangan terbaca dari atas ke bawah.
  rekap.kronologis.forEach((b, i) => {
    const baris: Record<string, string | number> = {
      no: i + 1,
      tanggal: tanggalSingkat(b.selesaiAt),
      kode: b.paketKode,
      paket: b.paketNama,
      jalur: b.jalur === "susulan" ? "Susulan" : "Utama",
      total: b.totalSkor,
      peringkat: b.peringkat ?? "—",
      peserta: b.jumlahPeserta,
      rata: b.rataPaket,
      benar: b.benar,
      salah: b.salah,
      kosong: b.kosong,
    };
    for (const k of rekap.kolomSubtes) baris[`s_${k}`] = b.skorSubtes[k] ?? 0;
    ws.addRow(baris);
  });

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ws.columnCount },
  };

  /* ---------------- Sheet 2: ringkasan ---------------- */
  const rs = wb.addWorksheet("Ringkasan");
  rs.columns = [
    { header: "Keterangan", key: "label", width: 32 },
    { header: "Isi", key: "isi", width: 46 },
  ];
  pasangKepala(rs, ORANYE);

  const rentang = `${rekap.rentang.mulai.toLocaleDateString("id-ID")} – ${rekap.rentang.selesai.toLocaleDateString("id-ID")}`;
  const isi: [string, string | number][] = [
    ["Nama Siswa", siswa.nama],
    ["NISN", siswa.nisn ?? "—"],
    ["Kelas", siswa.kelas ?? "—"],
    ["Asal Sekolah", siswa.asalSekolah ?? "—"],
    ["Periode Rekap", rentang],
    ["Jumlah Tryout Diikuti", rekap.jumlahTryout],
    ["Skor Rata-rata", rekap.rataSkor ?? "—"],
    ["Skor Tertinggi", rekap.skorTertinggi ?? "—"],
    ["Skor Terendah", rekap.skorTerendah ?? "—"],
    ["Peringkat Terbaik", rekap.peringkatTerbaik ?? "—"],
    [
      "Perubahan Skor (tryout pertama ke terakhir)",
      rekap.perubahanSkor == null
        ? "—"
        : `${rekap.perubahanSkor > 0 ? "+" : ""}${rekap.perubahanSkor}`,
    ],
  ];
  for (const [label, nilai] of isi) rs.addRow({ label, isi: nilai });

  rs.addRow({});
  rs.addRow({ label: "Arti kode subtes", isi: "" }).font = { bold: true };
  for (const k of rekap.kolomSubtes) rs.addRow({ label: k, isi: namaSubtes(k) });

  rs.addRow({});
  rs.addRow({
    label: "Catatan",
    isi: "Skor memakai penilaian IRT skala 0–1000. Peringkat dihitung terhadap seluruh peserta pada paket yang sama.",
  });

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf) as Uint8Array<ArrayBuffer>;
}
