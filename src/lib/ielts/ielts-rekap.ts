import "server-only";

import { all, one } from "@/lib/core/db";
import { BUDGET_PERGI_DETIK } from "@/lib/penjagaan/denyut";
import {
  SUBTES_IELTS,
  bandKeseluruhan,
  bandLengkap,
  hasilPengerjaan,
  menitPaket,
  paketById,
  pengerjaanById,
  subtesBelumBerband,
  type HasilSubtes,
  type PaketIelts,
  type PengerjaanIelts,
  type SubtesIeltsKode,
} from "@/lib/ielts/ielts";
import {
  jumlahKepergianIelts,
  pelanggaranPengerjaan,
  totalDetikKepergianIelts,
  type PelanggaranIelts,
} from "@/lib/ielts/ielts-penjagaan";
import { labelJenis, menggugurkan } from "@/lib/penjagaan/pelanggaran-jenis";

/**
 * REKAP PER PESERTA IELTS — padanan `/admin/peserta/<id>` pada jalur UTBK.
 *
 * Satu halaman yang menjawab semua yang biasa ditanyakan tentang SATU anak:
 * band tiap subtes, berapa lama tiap subtes dikerjakan, berapa butir dijawab,
 * dan seluruh catatan keamanannya dari menit pertama sampai terakhir.
 *
 * PERBEDAAN YANG DISENGAJA dari rekap peserta UTBK: kunci halamannya adalah
 * PENGERJAAN, bukan akun. Seorang siswa bisa mengerjakan beberapa paket IELTS,
 * dan yang ditanyakan guru selalu "bagaimana anak ini pada paket ITU" —
 * bukan rata-rata seumur hidupnya. Riwayat paketnya yang lain tetap
 * ditautkan di bagian bawah supaya jalannya tidak buntu.
 */

export interface BarisSubtesRekap {
  kode: SubtesIeltsKode;
  nama: string;
  /** Menit yang berlaku untuk paket ini — dari `menitPaket()`, bukan konstanta. */
  menit: number;
  /** belum | berjalan | selesai */
  keadaan: "belum" | "berjalan" | "selesai";
  mulaiAt: string | null;
  deadlineAt: string | null;
  selesaiAt: string | null;
  /** Lama pengerjaan sebenarnya, dalam detik; null bila belum tutup. */
  dipakaiDetik: number | null;
  dijawab: number;
  jumlahSoal: number;
  hasil: HasilSubtes;
  /** Catatan keamanan yang terjadi selagi subtes ini berjalan. */
  pelanggaran: number;
}

export interface RekapPesertaIelts {
  pengerjaan: PengerjaanIelts;
  paket: PaketIelts;
  userId: number;
  nama: string;
  nisn: string | null;
  kelas: string | null;
  asalSekolah: string | null;
  foto: string | null;
  overall: number | null;
  final: boolean;
  menunggu: string[];
  subtes: BarisSubtesRekap[];
  /** Seluruh catatan keamanan, ronde berjalan DAN ronde sebelumnya. */
  pelanggaran: (PelanggaranIelts & { label: string; berat: boolean })[];
  jumlahKepergian: number;
  totalDetikPergi: number;
  budgetDetik: number;
  /** Pengerjaan IELTS lain milik anak yang sama. */
  lainnya: { pengerjaanId: number; kode: string; nama: string; status: string }[];
}

/**
 * Rekap satu pengerjaan, atau null bila id-nya tidak ada.
 *
 * Tidak melempar: halaman pemanggil yang memutuskan `notFound()`.
 */
export async function rekapPesertaIelts(pengerjaanId: number): Promise<RekapPesertaIelts | null> {
  const p = await pengerjaanById(pengerjaanId);
  if (!p) return null;
  const paket = await paketById(p.paket_id);
  if (!paket) return null;

  const u = await one<{
    id: number;
    nama: string;
    nisn: string | null;
    kelas: string | null;
    asal_sekolah: string | null;
    foto: string | null;
  }>("SELECT id, nama, nisn, kelas, asal_sekolah, foto FROM users WHERE id = ?", p.user_id);
  if (!u) return null;

  const hasil = await hasilPengerjaan(p);
  const menit = await menitPaket(paket);

  const barisSubtes = new Map(
    (await all<{
      subtes: string;
      mulai_at: string;
      deadline_at: string;
      selesai_at: string | null;
      dipakai: number | null;
    }>(
      `SELECT subtes, mulai_at, deadline_at, selesai_at,
              CASE WHEN selesai_at IS NULL THEN NULL
                   ELSE CAST(ROUND((julianday(selesai_at) - julianday(mulai_at)) * 86400.0) AS INTEGER)
              END AS dipakai
         FROM ielts_subtes WHERE pengerjaan_id = ?`,
      p.id,
    )).map((r) => [r.subtes, r]),
  );

  const dijawab = new Map(
    (await all<{ subtes: string; n: number }>(
      `SELECT s.subtes AS subtes, COUNT(*) AS n
         FROM ielts_jawaban j
         JOIN ielts_soal s ON s.id = j.soal_id
        WHERE j.pengerjaan_id = ? AND j.jawaban IS NOT NULL AND TRIM(j.jawaban) <> ''
        GROUP BY s.subtes`,
      p.id,
    )).map((r) => [r.subtes, r.n]),
  );

  const catatan = (await pelanggaranPengerjaan(p.id)).map((v) => ({
    ...v,
    label: labelJenis(v.jenis),
    berat: menggugurkan(v.jenis),
  }));
  const perSubtes = new Map<string, number>();
  for (const v of catatan) {
    if (!v.subtes) continue;
    perSubtes.set(v.subtes, (perSubtes.get(v.subtes) ?? 0) + 1);
  }

  const subtes: BarisSubtesRekap[] = SUBTES_IELTS.map((s) => {
    const b = barisSubtes.get(s.kode);
    const h = hasil.find((x) => x.kode === s.kode)!;
    return {
      kode: s.kode,
      nama: s.nama,
      menit: menit[s.kode],
      keadaan: (!b ? "belum" : b.selesai_at ? "selesai" : "berjalan") as BarisSubtesRekap["keadaan"],
      mulaiAt: b?.mulai_at ?? null,
      deadlineAt: b?.deadline_at ?? null,
      selesaiAt: b?.selesai_at ?? null,
      dipakaiDetik: b?.dipakai ?? null,
      dijawab: dijawab.get(s.kode) ?? 0,
      jumlahSoal: h.jumlahSoal,
      hasil: h,
      pelanggaran: perSubtes.get(s.kode) ?? 0,
    };
  }).filter((r) => r.hasil.diujikan || r.keadaan !== "belum");

  const lainnya = (await all<{ id: number; kode: string; nama: string; status: string }>(
    `SELECT p.id, k.kode, k.nama, p.status
       FROM ielts_pengerjaan p
       JOIN ielts_paket k ON k.id = p.paket_id
      WHERE p.user_id = ? AND p.id <> ?
      ORDER BY p.started_at DESC`,
    p.user_id,
    p.id,
  )).map((r) => ({ pengerjaanId: r.id, kode: r.kode, nama: r.nama, status: r.status }));

  return {
    pengerjaan: p,
    paket,
    userId: u.id,
    nama: u.nama,
    nisn: u.nisn,
    kelas: u.kelas,
    asalSekolah: u.asal_sekolah,
    foto: u.foto,
    overall: p.status === "gugur" ? null : bandKeseluruhan(hasil),
    final: p.status !== "gugur" && bandLengkap(hasil),
    menunggu: subtesBelumBerband(hasil),
    subtes,
    pelanggaran: catatan,
    jumlahKepergian: await jumlahKepergianIelts(p.id),
    totalDetikPergi: await totalDetikKepergianIelts(p.id),
    budgetDetik: BUDGET_PERGI_DETIK,
    lainnya,
  };
}

/** Satu baris daftar peserta IELTS lintas paket, untuk halaman indeksnya. */
export interface BarisDaftarPesertaIelts {
  pengerjaanId: number;
  userId: number;
  nama: string;
  nisn: string | null;
  kelas: string | null;
  paketId: number;
  paketKode: string;
  status: "ongoing" | "finished" | "gugur";
  startedAt: string;
  finishedAt: string | null;
  pelanggaran: number;
}

/**
 * Daftar peserta IELTS. `paketId` 0 berarti semua paket.
 *
 * Bandnya sengaja TIDAK dihitung di sini: `hasilPengerjaan()` membaca seluruh
 * bank soal untuk tiap baris, dan daftar lintas paket bisa berisi ratusan
 * baris. Yang butuh band adalah papan Skor Live dan papan peringkat, yang
 * memang dibatasi satu paket.
 */
export async function daftarPesertaIelts(paketId = 0): Promise<BarisDaftarPesertaIelts[]> {
  const syarat = paketId > 0 ? "WHERE p.paket_id = ?" : "";
  const arg = paketId > 0 ? [paketId] : [];
  return (await all<{
    id: number;
    user_id: number;
    nama: string;
    nisn: string | null;
    kelas: string | null;
    paket_id: number;
    paket_kode: string;
    status: "ongoing" | "finished" | "gugur";
    started_at: string;
    finished_at: string | null;
    pelanggaran: number;
  }>(
    `SELECT p.id, p.user_id, u.nama, u.nisn, u.kelas,
            p.paket_id, k.kode AS paket_kode, p.status, p.started_at, p.finished_at,
            (SELECT COUNT(*) FROM ielts_pelanggaran v
              WHERE v.pengerjaan_id = p.id AND v.ronde = p.ronde) AS pelanggaran
       FROM ielts_pengerjaan p
       JOIN users u ON u.id = p.user_id
       JOIN ielts_paket k ON k.id = p.paket_id
       ${syarat}
      ORDER BY p.started_at DESC`,
    ...arg,
  )).map((r) => ({
    pengerjaanId: r.id,
    userId: r.user_id,
    nama: r.nama,
    nisn: r.nisn,
    kelas: r.kelas,
    paketId: r.paket_id,
    paketKode: r.paket_kode,
    status: r.status,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    pelanggaran: r.pelanggaran,
  }));
}
