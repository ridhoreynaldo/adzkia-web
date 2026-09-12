import "server-only";

import { all, one, run } from "@/lib/core/db";
import {
  KODE_SUBTES_IELTS,
  SUBTES_IELTS,
  bandKeseluruhan,
  bandLengkap,
  hasilPengerjaanBanyak,
  subtesBelumBerband,
  tutupYangHabis,
  type HasilSubtes,
  type PengerjaanIelts,
  type SubtesIeltsKode,
} from "@/lib/ielts/ielts";

/* ==========================================================================
   PERINGKAT BAND — dari band tertinggi ke terendah
   --------------------------------------------------------------------------
   Band IELTS TIDAK disimpan di basis data: ia selalu dihitung ulang dari
   jawaban peserta beserta kunci dan nilai guru yang berlaku saat itu
   (`hasilPengerjaan`). Papan peringkat ini karena itu tidak pernah bisa
   menyebut angka yang berbeda dari yang dibaca siswa di halaman hasilnya —
   pola yang sama dipakai `laporan-hasil.ts` untuk UTBK, yang juga memakai
   ulang papan peringkatnya alih-alih menulis query nilai sendiri.
   ========================================================================== */

export interface BarisPeringkatIelts {
  peringkat: number;
  pengerjaanId: number;
  userId: number;
  nama: string;
  nisn: string | null;
  kelas: string | null;
  status: "ongoing" | "finished" | "gugur";
  startedAt: string;
  finishedAt: string | null;
  /** Band tiap subtes; null berarti belum berband (menunggu guru / tak diujikan). */
  band: Record<string, number | null>;
  /** Jawaban benar tiap subtes yang dinilai mesin. */
  benar: Record<string, number>;
  /** Band keseluruhan, atau null bila belum satu subtes pun berband. */
  overall: number | null;
  /** true bila seluruh subtes yang DIUJIKAN sudah berband — overall final. */
  final: boolean;
  /** Subtes yang diujikan tetapi bandnya belum keluar (biasanya menunggu guru). */
  menunggu: string[];
  hasil: HasilSubtes[];
}

/** Subtes yang benar-benar diujikan pada satu paket — yang ada butirnya. */
export async function subtesDiujikan(paketId: number): Promise<SubtesIeltsKode[]> {
  const ada = new Set(
    (await all<{ subtes: string }>(
      "SELECT DISTINCT subtes FROM ielts_soal WHERE paket_id = ?",
      paketId,
    )).map((r) => r.subtes),
  );
  return KODE_SUBTES_IELTS.filter((k) => ada.has(k));
}

/**
 * Papan peringkat satu paket IELTS, DIURUTKAN DARI BAND TERTINGGI.
 *
 * Yang ikut: setiap peserta yang pernah membuka paket ini dan sudah punya
 * setidaknya satu band. Pengerjaan yang DIGUGURKAN pengawas tidak ikut — nilai
 * ujian yang dihentikan bukan nilai, dan menempatkannya di papan yang dibaca
 * satu angkatan sama saja mengumumkan pelanggaran seorang anak.
 *
 * Pemisah saat band sama: band Listening, lalu Reading, lalu siapa yang lebih
 * dulu selesai. Tanpa pemisah, urutan dua peserta berband sama berubah-ubah
 * tiap halaman dimuat ulang.
 */
export async function peringkatIelts(paketId: number): Promise<BarisPeringkatIelts[]> {
  const baris = await all<{
    id: number;
    user_id: number;
    nama: string;
    nisn: string | null;
    kelas: string | null;
    status: "ongoing" | "finished" | "gugur";
    started_at: string;
    finished_at: string | null;
  }>(
    `SELECT p.id, p.user_id, u.nama, u.nisn, u.kelas, p.status, p.started_at, p.finished_at
       FROM ielts_pengerjaan p
       JOIN users u ON u.id = p.user_id
      WHERE p.paket_id = ? AND p.status <> 'gugur'
      ORDER BY p.started_at`,
    paketId,
  );

  // SEMUA hasil sekaligus, dalam tiga query — bukan empat query PER PESERTA.
  //
  // Bentuk lamanya `baris.map(async r => { pengerjaanById(r.id); hasilPengerjaan(p) })`
  // membayar 4 query untuk setiap peserta, dan salah satunya (daftar soal
  // paket) memulangkan baris yang SAMA PERSIS setiap kali. Pada satu angkatan
  // 300 peserta itu 1.201 query untuk satu halaman papan peringkat.
  //
  // `hasilPengerjaanBanyak()` juga menghapus `pengerjaanById()` sepenuhnya:
  // satu-satunya yang dibutuhkan darinya adalah `paket_id`, dan itu sudah
  // diketahui pemanggil.
  const petaHasil = await hasilPengerjaanBanyak(paketId, baris.map((r) => r.id));

  const isi = baris
    .map((r) => {
      const hasil = petaHasil.get(r.id);
      if (!hasil) return null;
      const band: Record<string, number | null> = {};
      const benar: Record<string, number> = {};
      for (const h of hasil) {
        band[h.kode] = h.diujikan ? h.band : null;
        benar[h.kode] = h.benar;
      }
      return {
        pengerjaanId: r.id,
        userId: r.user_id,
        nama: r.nama,
        nisn: r.nisn,
        kelas: r.kelas,
        status: r.status,
        startedAt: r.started_at,
        finishedAt: r.finished_at,
        band,
        benar,
        overall: bandKeseluruhan(hasil),
        final: bandLengkap(hasil),
        menunggu: subtesBelumBerband(hasil),
        hasil,
      };
    })
    .filter((r): r is Omit<BarisPeringkatIelts, "peringkat"> => r !== null)
    .filter((r) => r.overall !== null);

  isi.sort(
    (a, b) =>
      (b.overall ?? 0) - (a.overall ?? 0) ||
      (b.band.LISTENING ?? 0) - (a.band.LISTENING ?? 0) ||
      (b.band.READING ?? 0) - (a.band.READING ?? 0) ||
      String(a.finishedAt ?? a.startedAt).localeCompare(String(b.finishedAt ?? b.startedAt)),
  );

  return isi.map((r, i) => ({ ...r, peringkat: i + 1 }));
}

export interface StatistikIelts {
  jumlahPeserta: number;
  /** Peserta yang band keseluruhannya sudah final. */
  jumlahFinal: number;
  rataOverall: number | null;
  tertinggi: number | null;
  terendah: number | null;
  perSubtes: {
    kode: SubtesIeltsKode;
    nama: string;
    /** Banyak peserta yang subtes ini sudah berband. */
    jumlah: number;
    rata: number | null;
    tertinggi: number | null;
  }[];
}

export function statistikIelts(papan: BarisPeringkatIelts[]): StatistikIelts {
  const overall = papan.map((r) => r.overall).filter((n): n is number => n !== null);
  const rata = (xs: number[]) =>
    xs.length === 0 ? null : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;

  return {
    jumlahPeserta: papan.length,
    jumlahFinal: papan.filter((r) => r.final).length,
    rataOverall: rata(overall),
    tertinggi: overall.length ? Math.max(...overall) : null,
    terendah: overall.length ? Math.min(...overall) : null,
    perSubtes: SUBTES_IELTS.map((s) => {
      const xs = papan
        .map((r) => r.band[s.kode])
        .filter((n): n is number => n !== null && n !== undefined);
      return {
        kode: s.kode,
        nama: s.nama,
        jumlah: xs.length,
        rata: rata(xs),
        tertinggi: xs.length ? Math.max(...xs) : null,
      };
    }),
  };
}

/* ==========================================================================
   HITUNG ULANG NILAI
   ========================================================================== */

export interface HasilHitungUlang {
  diperiksa: number;
  /** Subtes yang tenggatnya sudah lewat lalu ditutup oleh pemeriksaan ini. */
  subtesDitutup: number;
  /** Pengerjaan yang menggantung `ongoing` padahal seluruh subtesnya tuntas. */
  dituntaskan: number;
  /** Peserta yang band keseluruhannya berubah oleh pemeriksaan ini. */
  bandBerubah: number;
}

/**
 * Memeriksa ulang seluruh pengerjaan satu paket IELTS.
 *
 * Perlu dijelaskan apa yang SEBENARNYA dikerjakan tombol ini, sebab namanya
 * sama dengan "Hitung ulang nilai" di portal tryout tetapi pekerjaannya
 * berbeda. Di UTBK skor tersimpan, dan tombol itu mengalibrasi ulang kesulitan
 * butir. Di IELTS tidak ada skor tersimpan sama sekali: band selalu dihitung
 * saat dibaca, sehingga membetulkan satu kunci jawaban langsung mengubah band
 * seluruh peserta tanpa tombol apa pun.
 *
 * Yang tetap perlu dikerjakan — dan hanya bisa dikerjakan oleh pemeriksaan
 * menyeluruh seperti ini — ada dua:
 *
 *   1. MENUTUP subtes yang tenggatnya sudah lewat. Penutupan itu biasanya
 *      terjadi saat siswa membuka papan subtesnya; siswa yang tidak pernah
 *      kembali meninggalkan barisnya terbuka selamanya.
 *   2. MENUNTASKAN pengerjaan yang seluruh subtesnya sudah tutup tetapi
 *      statusnya masih `ongoing` — keadaan yang lumrah pada paket yang sengaja
 *      hanya berisi Listening dan Reading.
 *
 * Angka `bandBerubah` dihitung dengan membandingkan band SEBELUM dan SESUDAH
 * kedua hal di atas, jadi ia jujur: nol berarti tidak ada nilai yang bergeser.
 */
export async function hitungUlangIelts(paketId: number): Promise<HasilHitungUlang> {
  const wajib = await subtesDiujikan(paketId);
  const daftar = await all<{ id: number }>(
    "SELECT id FROM ielts_pengerjaan WHERE paket_id = ?",
    paketId,
  );

  let subtesDitutup = 0;
  let dituntaskan = 0;
  let bandBerubah = 0;

  const semuaId = daftar.map((d) => d.id);
  if (semuaId.length === 0) {
    return { diperiksa: 0, subtesDitutup: 0, dituntaskan: 0, bandBerubah: 0 };
  }

  // BAND SEBELUM - untuk SELURUH peserta, dalam tiga query.
  //
  // Bentuk lamanya memanggil `pengerjaanById()` + `hasilPengerjaan()` dua kali
  // per peserta (sebelum dan sesudah), masing-masing empat query: sepuluh
  // query lebih untuk setiap peserta, pada tombol yang menyapu satu paket
  // penuh sekaligus.
  const petaSebelum = await hasilPengerjaanBanyak(paketId, semuaId);
  const bandSebelum = new Map(
    semuaId.map((id) => [id, bandKeseluruhan(petaSebelum.get(id) ?? [])]),
  );

  // Status seluruh peserta sekaligus, menggantikan `pengerjaanById()` per
  // peserta — yang darinya hanya `status` yang benar-benar dipakai di sini.
  const status = new Map(
    (await all<{ id: number; status: string }>(
      "SELECT id, status FROM ielts_pengerjaan WHERE id = ANY(?::int[])",
      semuaId,
    )).map((r) => [r.id, r.status]),
  );

  // Berapa subtes yang tenggatnya sudah lewat tapi belum ditutup — satu query
  // untuk seluruh paket, bukan satu per peserta.
  //
  // `deadline_at <= now()` menggantikan `julianday(deadline_at) <= julianday('now')`:
  // nilainya sama, tetapi ini perbandingan `timestamptz` biasa, bukan dua
  // panggilan fungsi padanan SQLite (db/03-fungsi-sqlite.sql) untuk tiap baris.
  const terbuka = await one<{ n: number }>(
    `SELECT COUNT(*) AS n FROM ielts_subtes
      WHERE pengerjaan_id = ANY(?::int[])
        AND selesai_at IS NULL
        AND deadline_at <= now()`,
    semuaId,
  );
  subtesDitutup = terbuka?.n ?? 0;

  for (const id of semuaId) {
    await tutupYangHabis(id);

    // Pengerjaan yang digugurkan tidak pernah "dituntaskan": statusnya adalah
    // keputusan pengawas, bukan keadaan yang boleh disapu oleh tombol ini.
    if (status.get(id) === "ongoing" && await tuntasSemuaSubtes(id, wajib)) {
      await run(
        `UPDATE ielts_pengerjaan
            SET status = 'finished',
                finished_at = COALESCE(finished_at, now()),
                subtes_aktif = NULL
          WHERE id = ? AND status = 'ongoing'`,
        id,
      );
      dituntaskan++;
    }
  }

  // BAND SESUDAH - sekali lagi untuk seluruh peserta. Dibaca ULANG dari basis
  // data, bukan dihitung dari `petaSebelum`, karena perulangan di atas memang
  // mengubah keadaan (subtes ditutup, pengerjaan dituntaskan) dan justru itulah
  // yang sedang diukur.
  const petaSesudah = await hasilPengerjaanBanyak(paketId, semuaId);
  for (const id of semuaId) {
    if (bandKeseluruhan(petaSesudah.get(id) ?? []) !== bandSebelum.get(id)) bandBerubah++;
  }

  return { diperiksa: daftar.length, subtesDitutup, dituntaskan, bandBerubah };
}

/**
 * true bila seluruh subtes yang DIUJIKAN pada paket ini sudah tutup bagi satu
 * pengerjaan.
 *
 * Yang dihitung sengaja bukan keempat subtes IELTS, melainkan subtes yang
 * memang ada butirnya di paket itu: paket TryOut yang hanya berisi Listening
 * dan Reading tidak akan pernah punya baris Writing maupun Speaking, sehingga
 * menuntut keempatnya berarti pengerjaannya menggantung `ongoing` selamanya.
 */
export async function tuntasSemuaSubtes(pengerjaanId: number, wajib: SubtesIeltsKode[]): Promise<boolean> {
  if (wajib.length === 0) return false;
  const tutup = new Set(
    (await all<{ subtes: string }>(
      "SELECT subtes FROM ielts_subtes WHERE pengerjaan_id = ? AND selesai_at IS NOT NULL",
      pengerjaanId,
    )).map((r) => r.subtes),
  );
  return wajib.every((k) => tutup.has(k));
}

/** Pengerjaan satu peserta pada satu paket — untuk menyorot barisnya sendiri. */
export async function pengerjaanSaya(userId: number, paketId: number): Promise<PengerjaanIelts | undefined> {
  return await one<PengerjaanIelts>(
    "SELECT * FROM ielts_pengerjaan WHERE user_id = ? AND paket_id = ?",
    userId,
    paketId,
  );
}
