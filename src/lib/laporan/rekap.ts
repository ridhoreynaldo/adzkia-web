import "server-only";

import { all, one } from "@/lib/core/db";
import { URUTAN_SUBTES } from "@/lib/tryout/snbt";
import { URUTAN_SUBTES_SKD } from "@/lib/tryout/skd";

/**
 * Jalur yang direkap. Nilai UTBK (IRT 0-1000) dan SKD (poin 0-550) tidak bisa
 * dijejerkan dalam satu tabel maupun satu rata-rata, jadi setiap rekap selalu
 * terikat pada satu jalur.
 */
export type JalurRekap = "utbk" | "skd";

function urutanSubtes(jalur: JalurRekap): string[] {
  return jalur === "skd" ? [...URUTAN_SUBTES_SKD] : [...URUTAN_SUBTES];
}

/**
 * Rekap jangka panjang: riwayat setahun milik satu siswa (Capaianku) dan
 * papan peringkat tryout pekan berjalan (TOAdzkia Pekan Ini).
 *
 * Catatan waktu: `attempts.finished_at` disimpan dalam UTC, sedangkan batas
 * "pekan ini" dan "setahun terakhir" hanya masuk akal dalam waktu setempat.
 * Karena itu batasnya dihitung di JavaScript memakai jam server, lalu diubah
 * ke UTC sebelum dibandingkan — bukan sebaliknya. Menambahkan offset tetap
 * (mis. +7 jam) di dalam SQL akan salah begitu server dipindah.
 */

/** Date -> "YYYY-MM-DD HH:MM:SS" dalam UTC, format yang dipakai kolom database. */
function keUtcDb(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export interface RentangWaktu {
  mulai: Date;
  selesai: Date;
}

/**
 * Pekan berjalan, Senin 00.00 sampai sebelum Senin berikutnya, menurut jam
 * server. Tryout Adzkia digelar tiap Jumat, jadi satu rentang ini berisi tepat
 * satu tryout pada pemakaian normal.
 */
export function pekanIni(acuan = new Date()): RentangWaktu {
  const mulai = new Date(acuan);
  const geser = (mulai.getDay() + 6) % 7; // Minggu(0) -> 6, Senin(1) -> 0
  mulai.setDate(mulai.getDate() - geser);
  mulai.setHours(0, 0, 0, 0);

  const selesai = new Date(mulai);
  selesai.setDate(selesai.getDate() + 7);
  return { mulai, selesai };
}

/** Dua belas bulan terakhir sampai sekarang. */
export function setahunTerakhir(acuan = new Date()): RentangWaktu {
  const mulai = new Date(acuan);
  mulai.setFullYear(mulai.getFullYear() - 1);
  mulai.setHours(0, 0, 0, 0);
  return { mulai, selesai: acuan };
}

/* ------------------------------------------------------------------ */
/* Capaianku — riwayat setahun satu siswa                           */
/* ------------------------------------------------------------------ */

export interface BarisRekapTahun {
  attemptId: number;
  packageId: number;
  paketKode: string;
  paketNama: string;
  selesaiAt: string;
  jalur: string;
  totalSkor: number;
  /** Peringkat siswa pada paket itu; null bila entah kenapa tak terhitung. */
  peringkat: number | null;
  jumlahPeserta: number;
  rataPaket: number;
  skorSubtes: Record<string, number>;
  benar: number;
  salah: number;
  kosong: number;
}

export interface RekapTahun {
  rentang: RentangWaktu;
  baris: BarisRekapTahun[];
  /** Urutan kronologis (terlama -> terbaru), untuk grafik perkembangan. */
  kronologis: BarisRekapTahun[];
  jumlahTryout: number;
  skorTertinggi: number | null;
  skorTerendah: number | null;
  rataSkor: number | null;
  peringkatTerbaik: number | null;
  /** Selisih skor tryout terbaru terhadap yang terlama dalam rentang ini. */
  perubahanSkor: number | null;
  /** Subtes yang benar-benar punya data, dalam urutan resmi jalurnya. */
  kolomSubtes: string[];
  jalur: JalurRekap;
}

export async function rekapTahunSiswa(
  userId: number,
  jalur: JalurRekap = "utbk",
  acuan = new Date(),
): Promise<RekapTahun> {
  const rentang = setahunTerakhir(acuan);

  const rows = await all<{
    attempt_id: number;
    package_id: number;
    paket_kode: string;
    paket_nama: string;
    finished_at: string;
    jalur: string;
    total_skor: number;
  }>(
    `SELECT att.id AS attempt_id, att.package_id, p.kode AS paket_kode, p.nama AS paket_nama,
            att.finished_at, att.jalur, att.total_skor
       FROM attempts att
       JOIN packages p ON p.id = att.package_id
      WHERE att.user_id = ?
        AND att.status = 'finished'
        AND att.total_skor IS NOT NULL
        AND att.finished_at >= ?
        AND att.finished_at <  ?
        AND COALESCE(p.jalur, 'utbk') = ?
      ORDER BY att.finished_at DESC, att.id DESC`,
    userId,
    keUtcDb(rentang.mulai),
    keUtcDb(rentang.selesai),
    jalur,
  );

  if (rows.length === 0) {
    return {
      rentang,
      baris: [],
      kronologis: [],
      jumlahTryout: 0,
      skorTertinggi: null,
      skorTerendah: null,
      rataSkor: null,
      peringkatTerbaik: null,
      perubahanSkor: null,
      kolomSubtes: [],
      jalur,
    };
  }

  const idAttempt = rows.map((r) => r.attempt_id);
  const tanda = idAttempt.map(() => "?").join(",");

  const hasil = await all<{
    attempt_id: number;
    subtes: string;
    skor: number;
    benar: number;
    salah: number;
    kosong: number;
  }>(
    `SELECT attempt_id, subtes, skor, benar, salah, kosong
       FROM results WHERE attempt_id IN (${tanda})`,
    ...idAttempt,
  );

  const perAttempt = new Map<
    number,
    { skor: Record<string, number>; benar: number; salah: number; kosong: number }
  >();
  for (const h of hasil) {
    const slot = perAttempt.get(h.attempt_id) ?? { skor: {}, benar: 0, salah: 0, kosong: 0 };
    slot.skor[h.subtes] = Math.round(h.skor);
    slot.benar += h.benar;
    slot.salah += h.salah;
    slot.kosong += h.kosong;
    perAttempt.set(h.attempt_id, slot);
  }

  // Peringkat & rata-rata paket dihitung sekali per paket, bukan per baris.
  const idPaket = [...new Set(rows.map((r) => r.package_id))];
  const statPaket = new Map<number, { jumlah: number; rata: number }>();
  const peringkatPaket = new Map<number, Map<number, number>>();

  for (const pid of idPaket) {
    const stat = await one<{ n: number; rata: number | null }>(
      `SELECT COUNT(*) AS n, AVG(total_skor) AS rata
         FROM attempts
        WHERE package_id = ? AND status = 'finished' AND total_skor IS NOT NULL`,
      pid,
    );
    statPaket.set(pid, { jumlah: stat?.n ?? 0, rata: Math.round(stat?.rata ?? 0) });

    const urut = await all<{ attempt_id: number; total_skor: number }>(
      `SELECT id AS attempt_id, total_skor
         FROM attempts
        WHERE package_id = ? AND status = 'finished' AND total_skor IS NOT NULL
        ORDER BY total_skor DESC, finished_at ASC, id ASC`,
      pid,
    );
    const peta = new Map<number, number>();
    let peringkat = 0;
    let skorSebelum = Number.NaN;
    urut.forEach((u, i) => {
      const skor = Math.round(u.total_skor);
      // Peringkat kompetisi standar: skor sama -> peringkat sama.
      if (skor !== skorSebelum) {
        peringkat = i + 1;
        skorSebelum = skor;
      }
      peta.set(u.attempt_id, peringkat);
    });
    peringkatPaket.set(pid, peta);
  }

  const baris: BarisRekapTahun[] = rows.map((r) => {
    const detail = perAttempt.get(r.attempt_id) ?? { skor: {}, benar: 0, salah: 0, kosong: 0 };
    const stat = statPaket.get(r.package_id) ?? { jumlah: 0, rata: 0 };
    return {
      attemptId: r.attempt_id,
      packageId: r.package_id,
      paketKode: r.paket_kode,
      paketNama: r.paket_nama,
      selesaiAt: r.finished_at,
      jalur: r.jalur,
      totalSkor: Math.round(r.total_skor),
      peringkat: peringkatPaket.get(r.package_id)?.get(r.attempt_id) ?? null,
      jumlahPeserta: stat.jumlah,
      rataPaket: stat.rata,
      skorSubtes: detail.skor,
      benar: detail.benar,
      salah: detail.salah,
      kosong: detail.kosong,
    };
  });

  const kronologis = [...baris].reverse();
  const skor = baris.map((b) => b.totalSkor);
  const peringkatAda = baris.map((b) => b.peringkat).filter((p): p is number => p != null);

  const adaSubtes = new Set<string>();
  for (const b of baris) for (const k of Object.keys(b.skorSubtes)) adaSubtes.add(k);

  return {
    rentang,
    baris,
    kronologis,
    jumlahTryout: baris.length,
    skorTertinggi: Math.max(...skor),
    skorTerendah: Math.min(...skor),
    rataSkor: Math.round(skor.reduce((a, b) => a + b, 0) / skor.length),
    peringkatTerbaik: peringkatAda.length > 0 ? Math.min(...peringkatAda) : null,
    perubahanSkor:
      kronologis.length >= 2
        ? kronologis[kronologis.length - 1].totalSkor - kronologis[0].totalSkor
        : null,
    kolomSubtes: urutanSubtes(jalur).filter((k) => adaSubtes.has(k)),
    jalur,
  };
}

/* ------------------------------------------------------------------ */
/* TOAdzkia Pekan Ini — peringkat tryout pekan berjalan                 */
/* ------------------------------------------------------------------ */

export interface BarisPeringkatPekan {
  peringkat: number;
  userId: number;
  nama: string;
  kelas: string | null;
  asalSekolah: string | null;
  /** Rata-rata bila dalam sepekan ada lebih dari satu tryout. */
  totalSkor: number;
  jumlahTryout: number;
  attemptId: number;
  selesaiAt: string;
  skorSubtes: Record<string, number>;
}

export interface PapanPekan {
  rentang: RentangWaktu;
  baris: BarisPeringkatPekan[];
  paket: { id: number; kode: string; nama: string }[];
  jumlahPeserta: number;
  rataSkor: number | null;
  skorTertinggi: number | null;
  kolomSubtes: string[];
  jalur: JalurRekap;
}

export async function papanPekanIni(jalur: JalurRekap = "utbk", acuan = new Date()): Promise<PapanPekan> {
  const rentang = pekanIni(acuan);
  const mulai = keUtcDb(rentang.mulai);
  const selesai = keUtcDb(rentang.selesai);

  const rows = await all<{
    attempt_id: number;
    user_id: number;
    nama: string;
    kelas: string | null;
    asal_sekolah: string | null;
    package_id: number;
    paket_kode: string;
    paket_nama: string;
    total_skor: number;
    finished_at: string;
  }>(
    `SELECT att.id AS attempt_id, att.user_id, u.nama, u.kelas, u.asal_sekolah,
            att.package_id, p.kode AS paket_kode, p.nama AS paket_nama,
            att.total_skor, att.finished_at
       FROM attempts att
       JOIN users u    ON u.id = att.user_id
       JOIN packages p ON p.id = att.package_id
      WHERE att.status = 'finished'
        AND att.total_skor IS NOT NULL
        AND att.finished_at >= ?
        AND att.finished_at <  ?
        AND COALESCE(p.jalur, 'utbk') = ?
      ORDER BY att.total_skor DESC, att.finished_at ASC, att.id ASC`,
    mulai,
    selesai,
    jalur,
  );

  if (rows.length === 0) {
    return {
      rentang,
      baris: [],
      paket: [],
      jumlahPeserta: 0,
      rataSkor: null,
      skorTertinggi: null,
      kolomSubtes: [],
      jalur,
    };
  }

  const hasil = await all<{ attempt_id: number; subtes: string; skor: number }>(
    `SELECT r.attempt_id, r.subtes, r.skor
       FROM results r
       JOIN attempts att ON att.id = r.attempt_id
       JOIN packages p    ON p.id = att.package_id
      WHERE att.status = 'finished'
        AND att.finished_at >= ?
        AND att.finished_at <  ?
        AND COALESCE(p.jalur, 'utbk') = ?`,
    mulai,
    selesai,
    jalur,
  );
  const skorPerAttempt = new Map<number, Record<string, number>>();
  for (const h of hasil) {
    const slot = skorPerAttempt.get(h.attempt_id) ?? {};
    slot[h.subtes] = Math.round(h.skor);
    skorPerAttempt.set(h.attempt_id, slot);
  }

  // Satu baris per siswa. Bila sepekan berisi lebih dari satu tryout
  // (mis. ada susulan paket lain), skornya dirata-rata.
  const perSiswa = new Map<
    number,
    {
      nama: string;
      kelas: string | null;
      asalSekolah: string | null;
      skor: number[];
      attemptId: number;
      selesaiAt: string;
      skorSubtes: Record<string, number>;
    }
  >();

  for (const r of rows) {
    const ada = perSiswa.get(r.user_id);
    if (ada) {
      ada.skor.push(r.total_skor);
      continue;
    }
    perSiswa.set(r.user_id, {
      nama: r.nama,
      kelas: r.kelas,
      asalSekolah: r.asal_sekolah,
      skor: [r.total_skor],
      attemptId: r.attempt_id,
      selesaiAt: r.finished_at,
      skorSubtes: skorPerAttempt.get(r.attempt_id) ?? {},
    });
  }

  const sementara = [...perSiswa.entries()]
    .map(([userId, v]) => ({
      userId,
      nama: v.nama,
      kelas: v.kelas,
      asalSekolah: v.asalSekolah,
      totalSkor: Math.round(v.skor.reduce((a, b) => a + b, 0) / v.skor.length),
      jumlahTryout: v.skor.length,
      attemptId: v.attemptId,
      selesaiAt: v.selesaiAt,
      skorSubtes: v.skorSubtes,
    }))
    .sort((a, b) => b.totalSkor - a.totalSkor || a.selesaiAt.localeCompare(b.selesaiAt));

  const baris: BarisPeringkatPekan[] = [];
  let peringkat = 0;
  let skorSebelum = Number.NaN;
  sementara.forEach((s, i) => {
    if (s.totalSkor !== skorSebelum) {
      peringkat = i + 1;
      skorSebelum = s.totalSkor;
    }
    baris.push({ peringkat, ...s });
  });

  const paket = [...new Map(rows.map((r) => [r.package_id, r])).values()].map((r) => ({
    id: r.package_id,
    kode: r.paket_kode,
    nama: r.paket_nama,
  }));

  const adaSubtes = new Set<string>();
  for (const b of baris) for (const k of Object.keys(b.skorSubtes)) adaSubtes.add(k);

  const semuaSkor = baris.map((b) => b.totalSkor);
  return {
    rentang,
    baris,
    paket,
    jumlahPeserta: baris.length,
    rataSkor: Math.round(semuaSkor.reduce((a, b) => a + b, 0) / semuaSkor.length),
    skorTertinggi: Math.max(...semuaSkor),
    kolomSubtes: urutanSubtes(jalur).filter((k) => adaSubtes.has(k)),
    jalur,
  };
}
