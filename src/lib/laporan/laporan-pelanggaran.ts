import "server-only";

import * as ExcelJSNs from "exceljs";

import type { BarisRekap, PelanggaranRinci } from "@/lib/penjagaan/pelanggaran";
import { formatDurasi, labelJenis, labelSubtes } from "@/lib/penjagaan/pelanggaran";
import { identitasPeserta } from "@/lib/core/tampilan";

// exceljs dipublikasikan sebagai CommonJS; pola ini dipakai juga di import-soal.ts.
const ExcelJS = ((ExcelJSNs as unknown as { default?: typeof ExcelJSNs }).default ??
  ExcelJSNs) as typeof ExcelJSNs;

const MERAH = "FFB91C1C";
const HIJAU = "FF0D6E6A";
const KUNING = "FFFDF6E3";

function pasangKepala(ws: ExcelJSNs.Worksheet, warna: string) {
  const baris = ws.getRow(1);
  baris.font = { bold: true, color: { argb: "FFFFFFFF" } };
  baris.fill = { type: "pattern", pattern: "solid", fgColor: { argb: warna } };
  baris.alignment = { vertical: "middle" };
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

export interface InfoPaket {
  kode: string;
  nama: string;
}

/**
 * Laporan pelanggaran ujian dalam .xlsx, tiga sheet:
 *  1. "Rekap Peserta"  — satu baris per peserta, diurutkan dari yang terbanyak.
 *  2. "Rincian Kejadian" — satu baris per kejadian keluar halaman, lengkap jamnya.
 *  3. "Keterangan"     — cara membaca laporan dan batas kemampuan deteksinya.
 */
export async function bukuPelanggaran(
  paket: InfoPaket,
  rekap: BarisRekap[],
  rincian: PelanggaranRinci[],
): Promise<Uint8Array<ArrayBuffer>> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ADZKIA SMART";
  wb.created = new Date();

  /* ---------------- Sheet 1: rekap per peserta ---------------- */
  const ws = wb.addWorksheet("Rekap Peserta");
  ws.columns = [
    { header: "No", key: "no", width: 5 },
    { header: "Nama Peserta", key: "nama", width: 28 },
    { header: "Identitas", key: "email", width: 30 },
    { header: "Asal Sekolah", key: "sekolah", width: 26 },
    { header: "Status Ujian", key: "status", width: 14 },
    { header: "Skor Total", key: "skor", width: 11 },
    { header: "Jumlah Pelanggaran", key: "jumlah", width: 19 },
    { header: "Total Waktu Keluar", key: "total", width: 19 },
    { header: "Keluar Terlama", key: "terlama", width: 16 },
    { header: "Pelanggaran Terakhir", key: "terakhir", width: 21 },
    { header: "Tingkat", key: "tingkat", width: 12 },
  ];
  pasangKepala(ws, MERAH);

  rekap.forEach((r, i) => {
    const tingkat = r.jumlah >= 5 ? "BERAT" : r.jumlah >= 2 ? "WASPADA" : "RINGAN";
    const baris = ws.addRow({
      no: i + 1,
      nama: r.nama,
      email: identitasPeserta(r.email, r.asal_sekolah),
      sekolah: r.asal_sekolah ?? "—",
      status:
        r.status === "finished"
          ? "Selesai"
          : r.status === "gugur"
            ? "GAGAL - digugurkan"
            : "Berlangsung",
      skor: r.total_skor ?? "—",
      jumlah: r.jumlah,
      total: formatDurasi(r.total_detik),
      terlama: formatDurasi(r.terlama_detik),
      terakhir: r.terakhir_at ?? "—",
      tingkat,
    });
    if (tingkat === "BERAT") {
      baris.font = { bold: true, color: { argb: MERAH } };
    } else if (tingkat === "WASPADA") {
      baris.fill = { type: "pattern", pattern: "solid", fgColor: { argb: KUNING } };
    }
  });

  if (rekap.length === 0) {
    ws.addRow({ nama: "Tidak ada pelanggaran tercatat pada paket ini." });
  }

  /* ---------------- Sheet 2: rincian kejadian ---------------- */
  const wr = wb.addWorksheet("Rincian Kejadian");
  wr.columns = [
    { header: "No", key: "no", width: 5 },
    { header: "Nama Peserta", key: "nama", width: 28 },
    { header: "Identitas", key: "email", width: 30 },
    { header: "Pelanggaran Ke-", key: "urutan", width: 15 },
    { header: "Subtes", key: "subtes", width: 30 },
    { header: "Jenis", key: "jenis", width: 24 },
    { header: "Waktu Keluar", key: "keluar", width: 21 },
    { header: "Waktu Kembali", key: "kembali", width: 21 },
    { header: "Lama Keluar", key: "durasi", width: 15 },
  ];
  pasangKepala(wr, MERAH);

  rincian.forEach((v, i) => {
    wr.addRow({
      no: i + 1,
      nama: v.nama,
      email: identitasPeserta(v.email, v.asal_sekolah),
      urutan: v.urutan,
      subtes: labelSubtes(v.subtes),
      jenis: labelJenis(v.jenis),
      keluar: v.mulai_at,
      kembali: v.kembali_at ?? "Tidak kembali",
      durasi: formatDurasi(v.durasi_detik),
    });
  });

  if (rincian.length === 0) {
    wr.addRow({ nama: "Tidak ada kejadian tercatat." });
  }

  /* ---------------- Sheet 3: keterangan ---------------- */
  const wk = wb.addWorksheet("Keterangan");
  wk.columns = [
    { header: "Hal", key: "hal", width: 26 },
    { header: "Penjelasan", key: "isi", width: 104 },
  ];
  pasangKepala(wk, HIJAU);

  const catatan: [string, string][] = [
    ["Paket", `${paket.kode} — ${paket.nama}`],
    ["Dibuat", new Date().toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })],
    ["Total peserta melanggar", String(rekap.length)],
    ["Total kejadian", String(rincian.length)],
    ["", ""],
    [
      "Pindah tab / layar disembunyikan",
      "Peserta berpindah ke tab lain, meminimalkan jendela, atau mengunci layar saat timer berjalan.",
    ],
    [
      "Pindah jendela/aplikasi",
      "Jendela ujian kehilangan fokus lebih dari 2 detik — biasanya berpindah ke aplikasi lain (chat, catatan, kalkulator).",
    ],
    ["", ""],
    [
      "Batas deteksi",
      "Browser TIDAK mengizinkan halaman ujian melihat isi tab lain. Yang tercatat hanya kapan peserta pergi, kapan kembali, dan berapa lama — bukan apa yang ia buka.",
    ],
    [
      "Yang tidak terdeteksi",
      "Mencontek lewat perangkat lain (HP kedua), catatan kertas, atau bantuan orang di sekitar tidak dapat dideteksi sistem. Pengawasan langsung tetap diperlukan.",
    ],
    [
      "Kemungkinan salah tangkap",
      "Notifikasi yang muncul, panggilan masuk, atau layar mati otomatis bisa ikut tercatat. Periksa lama keluar sebelum menjatuhkan sanksi: keluar 2-3 detik berbeda maknanya dengan keluar 2 menit.",
    ],
    [
      "Saran pemakaian",
      "Gunakan kolom Jumlah Pelanggaran dan Total Waktu Keluar sebagai dasar penelusuran, lalu konfirmasi ke peserta sebelum memutuskan. Sistem sengaja tidak menggugurkan ujian secara otomatis.",
    ],
  ];
  for (const [hal, isi] of catatan) wk.addRow({ hal, isi });
  wk.getColumn("isi").alignment = { wrapText: true, vertical: "top" };

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}
