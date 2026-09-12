import "server-only";

import { all } from "@/lib/core/db";
import {
  KODE_SUBTES_IELTS,
  bandKeseluruhan,
  bandLengkap,
  hasilPengerjaanBanyak,
  type HasilSubtes,
  type SubtesIeltsKode,
} from "@/lib/ielts/ielts";
import { subtesDiujikan } from "@/lib/ielts/ielts-peringkat";

/**
 * PAPAN SKOR LIVE IELTS — padanan `src/lib/live.ts` pada jalur UTBK-SNBT.
 *
 * Dibuat 11 September 2026 atas permintaan pengelola: "fitur SKOR LIVE,
 * KEAMANAN UJIAN, REKAP PER PESERTA … masukkan juga ke IELTS".
 *
 * SATU HAL YANG MEMBUAT PAPAN INI LEBIH SEDERHANA dari padanannya di UTBK, dan
 * itu bukan kekurangan: band IELTS **tidak pernah disimpan**. `hasilPengerjaan()`
 * menghitungnya ulang setiap kali dibaca, jadi tidak ada "skor sementara yang
 * dihitung di memori supaya kalibrasi tidak rusak" seperti di `live.ts` — yang
 * dibaca papan ini persis angka yang dibaca siswa di halaman hasilnya, dan
 * membuka papan ini tidak mengubah apa pun.
 *
 * Yang TETAP sama dengan UTBK, karena pengalaman papan UTBK membuktikannya
 * perlu:
 *
 *  · "Sedang ujian" hanya menghitung yang TIMER SUBTESNYA benar-benar berjalan.
 *    Peserta yang menutup peramban tetap berstatus `ongoing`; menghitungnya
 *    sebagai "sedang ujian" membuat pengawas membaca ada anak di kursi yang
 *    sudah kosong berjam-jam.
 *  · Yang timernya mati dibedakan menjadi JEDA (masih ada subtes yang belum
 *    dibuka — ia berhak kembali) dan TERBENGKALAI (tidak ada lagi yang bisa
 *    dilanjutkan). Menutup ujian yang masih berhak dilanjutkan menghapus subtes
 *    yang belum sempat dikerjakan siswa.
 *  · Peserta yang DIHENTIKAN tetap ditampilkan, tanpa band. Pengawas harus
 *    melihat siapa yang hilang dari papan dan mengapa.
 */

export interface BarisLiveIelts {
  pengerjaanId: number;
  userId: number;
  nama: string;
  nisn: string | null;
  kelas: string | null;
  status: "ongoing" | "finished" | "gugur";
  /** Band keseluruhan; null bila belum satu subtes pun berband. */
  overall: number | null;
  /** true bila seluruh subtes yang diujikan sudah berband. */
  final: boolean;
  band: Record<string, number | null>;
  benar: Record<string, number>;
  hasil: HasilSubtes[];
  /** Subtes yang sedang dikerjakan detik ini, dari `ielts_pengerjaan`. */
  subtesAktif: string | null;
  subtesSelesai: number;
  totalSubtes: number;
  dijawab: number;
  totalSoal: number;
  pelanggaran: number;
  /** Kepergian ronde berjalan yang sudah dijumlahkan, dalam detik. */
  detikPergi: number;
  mulaiAt: string;
  selesaiAt: string | null;
  digugurkanAt: string | null;
  alasanGugur: string | null;
  ronde: number;
  /** true = ADA timer subtes yang benar-benar masih berjalan. */
  timerJalan: boolean;
  /** true = timer mati TETAPI masih ada subtes yang belum pernah dibuka. */
  bisaLanjut: boolean;
  /** true = paketnya belum punya satu butir pun; peserta menunggu pengajar. */
  menungguSoal: boolean;
}

export interface RingkasLiveIelts {
  sedangUjian: number;
  timerMati: number;
  terbengkalai: number;
  selesai: number;
  dihentikan: number;
  rataOverall: number | null;
  tertinggi: number | null;
  totalPelanggaran: number;
}

interface BarisMentah {
  id: number;
  user_id: number;
  nama: string;
  nisn: string | null;
  kelas: string | null;
  status: "ongoing" | "finished" | "gugur";
  subtes_aktif: string | null;
  started_at: string;
  finished_at: string | null;
  digugurkan_at: string | null;
  alasan_gugur: string | null;
  ronde: number;
  pelanggaran: number;
  detik_pergi: number;
  subtes_selesai: number;
  subtes_dibuka: number;
  dijawab: number;
  timer_jalan: number;
  jendela_tutup: number;
}

/**
 * Jenis kepergian yang ikut dijumlahkan jadi anggaran.
 *
 * Daftarnya HARUS sama dengan `totalDetikKepergianIelts()` di
 * `ielts-penjagaan.ts` — di sana ada alasannya panjang lebar: jeda jaringan,
 * hilang fokus, dan lepasnya layar penuh tidak ikut karena pada ketiganya
 * halaman ujian masih terpampang di layar peserta.
 */
const JENIS_PERGI = ["keluar_tab", "pergi_lama", "pergi_menumpuk", "denyut_hilang"];

/** Satu baris per peserta yang pernah membuka paket ini. */
export async function papanLiveIelts(paketId: number): Promise<BarisLiveIelts[]> {
  const tanda = JENIS_PERGI.map(() => "?").join(",");

  const baris = await all<BarisMentah>(
    `SELECT p.id, p.user_id, u.nama, u.nisn, u.kelas, p.status, p.subtes_aktif,
            p.started_at, p.finished_at, p.digugurkan_at, p.alasan_gugur, p.ronde,
            (SELECT COUNT(*) FROM ielts_pelanggaran v
              WHERE v.pengerjaan_id = p.id AND v.ronde = p.ronde)              AS pelanggaran,
            (SELECT COALESCE(SUM(v.durasi_detik), 0) FROM ielts_pelanggaran v
              WHERE v.pengerjaan_id = p.id AND v.ronde = p.ronde
                AND v.jenis IN (${tanda}))                                     AS detik_pergi,
            (SELECT COUNT(*) FROM ielts_subtes s
              WHERE s.pengerjaan_id = p.id AND s.selesai_at IS NOT NULL)       AS subtes_selesai,
            (SELECT COUNT(*) FROM ielts_subtes s WHERE s.pengerjaan_id = p.id) AS subtes_dibuka,
            (SELECT COUNT(*) FROM ielts_jawaban j
              WHERE j.pengerjaan_id = p.id
                AND j.jawaban IS NOT NULL AND TRIM(j.jawaban) <> '')           AS dijawab,
            -- Tenggat subtes disimpan UTC (datetime('now')), sama seperti
            -- attempt_subtes di jalur UTBK; jendela paket waktu lokal.
            EXISTS (SELECT 1 FROM ielts_subtes s
                     WHERE s.pengerjaan_id = p.id AND s.selesai_at IS NULL
                       AND julianday(s.deadline_at) > julianday('now'))        AS timer_jalan,
            (SELECT CASE WHEN k.status = 'closed'
                           OR (k.selesai_at IS NOT NULL AND TRIM(k.selesai_at) <> ''
                               AND datetime(k.selesai_at) < datetime('now','localtime'))
                         THEN 1 ELSE 0 END
               FROM ielts_paket k WHERE k.id = p.paket_id)                     AS jendela_tutup
       FROM ielts_pengerjaan p
       JOIN users u ON u.id = p.user_id
      WHERE p.paket_id = ?`,
    ...JENIS_PERGI,
    paketId,
  );
  if (baris.length === 0) return [];

  const diujikan = await subtesDiujikan(paketId);
  const totalSoal =
    (await all<{ n: number }>("SELECT COUNT(*) AS n FROM ielts_soal WHERE paket_id = ?", paketId))[0]?.n ??
    0;

  // SELURUH hasil sekaligus, tiga query — bukan empat query PER PESERTA.
  //
  // Papan ini disegarkan TERUS-MENERUS selama ujian berlangsung, jadi bentuk
  // lamanya (`pengerjaanById()` + `hasilPengerjaan()` di dalam .map()) adalah
  // N+1 yang paling mahal di panel IELTS: 4 query x jumlah peserta, berulang
  // setiap kali pengawas menyegarkan halaman.
  const petaHasil = await hasilPengerjaanBanyak(paketId, baris.map((r) => r.id));

  const isi: BarisLiveIelts[] = baris.map((r) => {
    const hasil = petaHasil.get(r.id) ?? [];
    const band: Record<string, number | null> = {};
    const benar: Record<string, number> = {};
    for (const h of hasil) {
      band[h.kode] = h.diujikan ? h.band : null;
      benar[h.kode] = h.benar;
    }

    // Ujian yang DIHENTIKAN tidak dinilai — sejalan dengan papan peringkat,
    // yang memang tidak memuat mereka sama sekali.
    const dihentikan = r.status === "gugur";

    return {
      pengerjaanId: r.id,
      userId: r.user_id,
      nama: r.nama,
      nisn: r.nisn,
      kelas: r.kelas,
      status: r.status,
      overall: dihentikan ? null : bandKeseluruhan(hasil),
      final: !dihentikan && bandLengkap(hasil),
      band: dihentikan ? {} : band,
      benar: dihentikan ? {} : benar,
      hasil,
      subtesAktif: r.subtes_aktif,
      subtesSelesai: r.subtes_selesai,
      totalSubtes: diujikan.length,
      dijawab: r.dijawab,
      totalSoal,
      pelanggaran: r.pelanggaran,
      detikPergi: r.detik_pergi,
      mulaiAt: r.started_at,
      selesaiAt: r.finished_at,
      digugurkanAt: r.digugurkan_at,
      alasanGugur: r.alasan_gugur,
      ronde: r.ronde,
      timerJalan: r.status === "ongoing" && r.timer_jalan === 1,
      bisaLanjut:
        r.status === "ongoing" &&
        r.timer_jalan === 0 &&
        r.jendela_tutup === 0 &&
        r.subtes_dibuka < diujikan.length,
      menungguSoal: r.status === "ongoing" && diujikan.length === 0,
    };
  });

  // Selesai lebih dulu (bandnya final), lalu yang berjalan, lalu yang
  // dihentikan — urutan yang sama dengan papan live UTBK.
  const prioritas = (s: BarisLiveIelts["status"]) =>
    s === "finished" ? 0 : s === "ongoing" ? 1 : 2;
  isi.sort((a, b) => {
    if (a.status !== b.status) return prioritas(a.status) - prioritas(b.status);
    return (b.overall ?? -1) - (a.overall ?? -1);
  });
  return isi;
}

export function ringkasLiveIelts(baris: BarisLiveIelts[]): RingkasLiveIelts {
  const jalan = baris.filter((b) => b.status === "ongoing");
  const selesai = baris.filter((b) => b.status === "finished");
  const berband = baris.filter((b) => b.overall !== null).map((b) => b.overall as number);

  return {
    sedangUjian: jalan.filter((b) => b.timerJalan).length,
    timerMati: jalan.filter((b) => !b.timerJalan).length,
    terbengkalai: jalan.filter((b) => !b.timerJalan && !b.bisaLanjut && !b.menungguSoal).length,
    selesai: selesai.length,
    dihentikan: baris.filter((b) => b.status === "gugur").length,
    rataOverall: berband.length
      ? Math.round((berband.reduce((x, y) => x + y, 0) / berband.length) * 10) / 10
      : null,
    tertinggi: berband.length ? Math.max(...berband) : null,
    totalPelanggaran: baris.reduce((n, b) => n + b.pelanggaran, 0),
  };
}

/**
 * Subtes yang perlu diberi kolom pada tabel papan ini.
 *
 * Dasarnya bendera `diujikan` milik `hasilPengerjaan()`, bukan sekadar adanya
 * kunci pada peta band: paket yang hanya berisi Listening + Reading — seperti
 * `IELTS-11SEP2026` — tidak boleh menumbuhkan dua kolom kosong bertuliskan "—"
 * untuk Writing dan Speaking yang memang tidak diujikan.
 */
export function kolomSubtesLive(baris: BarisLiveIelts[]): SubtesIeltsKode[] {
  return KODE_SUBTES_IELTS.filter((k) =>
    baris.some((b) => b.hasil.some((h) => h.kode === k && h.diujikan)),
  );
}
