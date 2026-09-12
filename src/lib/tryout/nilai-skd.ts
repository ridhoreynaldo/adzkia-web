import "server-only";

import { all, one, run, tx } from "@/lib/core/db";
import {
  POIN_BENAR,
  SUBTES_SKD,
  TKP_MAKS,
  URUTAN_SUBTES_SKD,
  lulusSkd,
  nilaiTkp,
  parseBobot,
  rataAmbangPerSoal,
  soalBenarMinimal,
} from "@/lib/tryout/skd";

/**
 * Penilaian SKD Kedinasan — sistem poin resmi, bukan IRT.
 * Acuan: PermenPANRB 13/2026 jo. KepmenPANRB 406/2026.
 *
 *   TWK & TIU : jawaban benar 5 poin; salah maupun kosong 0. Tidak ada nilai
 *               minus, jadi menebak tidak pernah merugikan.
 *   TKP       : setiap pilihan punya nilainya sendiri (1–5) yang disimpan di
 *               kolom `questions.bobot_opsi`; hanya soal kosong bernilai 0.
 *
 * Nilai kumulatif = TWK + TIU + TKP tanpa pembobotan persentase (maksimal 550).
 * Peserta dinyatakan LULUS bila ketiga subtes mencapai ambangnya
 * (TWK 65, TIU 80, TKP 156) — total tinggi saja tidak cukup.
 */

export interface NilaiSubtesSkd {
  subtes: string;
  nama: string;
  nilai: number;
  ambang: number;
  nilaiMaks: number;
  lulus: boolean;
  /** TWK/TIU: jawaban benar. TKP: butir bernilai tinggi (4–5). */
  benar: number;
  /** TWK/TIU: jawaban salah. TKP: butir bernilai rendah (1–3). */
  salah: number;
  kosong: number;
  jumlahSoal: number;
  /** Rata-rata poin yang diraih per soal pada subtes ini. */
  rataPerSoal: number;
  /** Rata-rata poin per soal yang dibutuhkan untuk menyentuh ambang. */
  rataAmbang: number;
  /** Jawaban benar minimal agar lolos ambang; null untuk TKP. */
  benarMinimal: number | null;
}

export interface HasilSkd {
  perSubtes: NilaiSubtesSkd[];
  total: number;
  ambangTotal: number;
  /** Lulus menurut ketentuan formasi umum (ketiga ambang subtes). */
  lulus: boolean;
  /** Lulus bila peserta terdaftar pada jalur afirmasi (TIU 55 + total 281). */
  lulusAfirmasi: boolean;
}

interface ButirSkd {
  id: number;
  subtes: string;
  tipe: string;
  kunci: string;
  bobot_opsi: string | null;
  jawaban: string | null;
}

/** Jawaban benar untuk soal pilihan ganda biasa (TWK/TIU). */
function benarPg(kunci: string, jawaban: string | null): boolean {
  if (!jawaban) return false;
  return jawaban.trim().toUpperCase() === kunci.trim().toUpperCase();
}

/** Rakit satu baris nilai subtes dari angka mentah yang sudah dihitung. */
function barisSubtes(
  meta: (typeof SUBTES_SKD)[number],
  angka: { nilai: number; benar: number; salah: number; kosong: number; jumlahSoal: number },
): NilaiSubtesSkd {
  return {
    subtes: meta.kode,
    nama: meta.nama,
    nilai: angka.nilai,
    ambang: meta.ambang,
    nilaiMaks: meta.nilaiMaks,
    lulus: angka.nilai >= meta.ambang,
    benar: angka.benar,
    salah: angka.salah,
    kosong: angka.kosong,
    jumlahSoal: angka.jumlahSoal,
    rataPerSoal: angka.jumlahSoal > 0 ? angka.nilai / angka.jumlahSoal : 0,
    rataAmbang: rataAmbangPerSoal(meta.kode),
    benarMinimal: soalBenarMinimal(meta.kode),
  };
}

/** Bungkus daftar nilai subtes menjadi hasil akhir beserta vonis kelulusan. */
function rangkum(perSubtes: NilaiSubtesSkd[]): HasilSkd {
  const peta = Object.fromEntries(perSubtes.map((s) => [s.subtes, s.nilai]));
  return {
    perSubtes,
    total: perSubtes.reduce((a, s) => a + s.nilai, 0),
    ambangTotal: perSubtes.reduce((a, s) => a + s.ambang, 0),
    lulus: lulusSkd(peta),
    lulusAfirmasi: lulusSkd(peta, "afirmasi"),
  };
}

/**
 * Hitung dan simpan hasil SKD satu sesi ke tabel `results`, lalu isi
 * `attempts.total_skor`. Aman dipanggil ulang — baris lama ditimpa.
 */
export async function hitungHasilSkd(attemptId: number): Promise<HasilSkd> {
  const att = await one<{ package_id: number }>(
    "SELECT package_id FROM attempts WHERE id = ?",
    attemptId,
  );
  if (!att) {
    return { perSubtes: [], total: 0, ambangTotal: 0, lulus: false, lulusAfirmasi: false };
  }

  const butir = await all<ButirSkd>(
    `SELECT q.id, q.subtes, q.tipe, q.kunci, q.bobot_opsi, a.jawaban
       FROM questions q
       LEFT JOIN answers a ON a.question_id = q.id AND a.attempt_id = ?
      WHERE q.package_id = ?`,
    attemptId,
    att.package_id,
  );

  const perSubtes: NilaiSubtesSkd[] = SUBTES_SKD.map((meta) => {
    const milik = butir.filter((b) => b.subtes === meta.kode);
    let nilai = 0;
    let benar = 0;
    let salah = 0;
    let kosong = 0;

    for (const b of milik) {
      const terisi = b.jawaban != null && b.jawaban.trim() !== "";
      if (!terisi) {
        kosong++;
        continue;
      }

      if (meta.penilaian === "politomi") {
        // Tidak ada benar/salah di TKP — yang ada nilai tinggi dan rendah.
        // Kolom benar/salah dipakai sebagai rekap sebaran: 4-5 vs 1-3.
        const poin = nilaiTkp(parseBobot(b.bobot_opsi), b.jawaban);
        if (poin === 0) {
          // Hanya terjadi bila jawabannya bukan huruf pilihan yang sah.
          kosong++;
          continue;
        }
        nilai += poin;
        if (poin >= TKP_MAKS - 1) benar++;
        else salah++;
        continue;
      }

      if (benarPg(b.kunci, b.jawaban)) {
        nilai += POIN_BENAR;
        benar++;
      } else {
        salah++;
      }
    }

    return barisSubtes(meta, { nilai, benar, salah, kosong, jumlahSoal: milik.length });
  });

  const hasil = rangkum(perSubtes);

  await tx(async () => {
    for (const s of perSubtes) {
      await run(
        `INSERT INTO results (attempt_id, subtes, benar, salah, kosong, skor, theta)
         VALUES (?, ?, ?, ?, ?, ?, 0)
         ON CONFLICT (attempt_id, subtes) DO UPDATE SET
           benar = excluded.benar, salah = excluded.salah, kosong = excluded.kosong,
           skor = excluded.skor, theta = 0`,
        attemptId,
        s.subtes,
        s.benar,
        s.salah,
        s.kosong,
        s.nilai,
      );
    }
    await run("UPDATE attempts SET total_skor = ? WHERE id = ?", hasil.total, attemptId);
  });

  return hasil;
}

/** Baca hasil SKD yang sudah tersimpan, tanpa menghitung ulang. */
export async function ambilHasilSkd(attemptId: number): Promise<HasilSkd> {
  const rows = await all<{ subtes: string; skor: number; benar: number; salah: number; kosong: number }>(
    "SELECT subtes, skor, benar, salah, kosong FROM results WHERE attempt_id = ?",
    attemptId,
  );
  const peta = new Map(rows.map((r) => [r.subtes, r]));

  const perSubtes: NilaiSubtesSkd[] = SUBTES_SKD.map((meta) => {
    const r = peta.get(meta.kode);
    return barisSubtes(meta, {
      nilai: Math.round(r?.skor ?? 0),
      benar: r?.benar ?? 0,
      salah: r?.salah ?? 0,
      kosong: r?.kosong ?? 0,
      jumlahSoal: (r?.benar ?? 0) + (r?.salah ?? 0) + (r?.kosong ?? 0),
    });
  });

  return rangkum(perSubtes);
}

/* ------------------------------------------------------------------ */
/* Peringkat SKD                                                        */
/* ------------------------------------------------------------------ */

export interface BarisPeringkatSkd {
  peringkat: number;
  attemptId: number;
  userId: number;
  nama: string;
  kelas: string | null;
  tanggalLahir: string | null;
  nilai: Record<string, number>;
  total: number;
  lulus: boolean;
  selesaiAt: string | null;
}

/**
 * Papan peringkat SKD satu paket.
 *
 * Pemeringkatan disusun dari nilai kumulatif SKD tertinggi. Urutan pemisah
 * ketika total sama mengikuti pola seleksi kedinasan (TKP lebih dulu, lalu
 * TIU, lalu TWK), dilanjutkan dua pemisah tambahan dari pihak sekolah:
 *   1. nilai TKP lebih tinggi
 *   2. lalu TIU lebih tinggi
 *   3. lalu TWK lebih tinggi
 *   4. lalu yang lebih muda (tanggal lahir lebih akhir)
 *   5. lalu urutan abjad nama
 * Bila semuanya masih sama, keduanya memang berperingkat sama.
 */
export async function peringkatSkd(packageId: number): Promise<BarisPeringkatSkd[]> {
  const rows = await all<{
    attempt_id: number;
    user_id: number;
    nama: string;
    kelas: string | null;
    tanggal_lahir: string | null;
    total_skor: number;
    finished_at: string | null;
  }>(
    `SELECT att.id AS attempt_id, att.user_id, u.nama, u.kelas, u.tanggal_lahir,
            att.total_skor, att.finished_at
       FROM attempts att
       JOIN users u ON u.id = att.user_id
      WHERE att.package_id = ?
        AND att.status = 'finished'
        AND att.total_skor IS NOT NULL`,
    packageId,
  );
  if (rows.length === 0) return [];

  const hasil = await all<{ attempt_id: number; subtes: string; skor: number }>(
    `SELECT r.attempt_id, r.subtes, r.skor
       FROM results r
       JOIN attempts att ON att.id = r.attempt_id
      WHERE att.package_id = ?`,
    packageId,
  );
  const petaNilai = new Map<number, Record<string, number>>();
  for (const h of hasil) {
    const slot = petaNilai.get(h.attempt_id) ?? {};
    slot[h.subtes] = Math.round(h.skor);
    petaNilai.set(h.attempt_id, slot);
  }

  const daftar = rows.map((r) => {
    const nilai = petaNilai.get(r.attempt_id) ?? {};
    return {
      attemptId: r.attempt_id,
      userId: r.user_id,
      nama: r.nama,
      kelas: r.kelas,
      tanggalLahir: r.tanggal_lahir,
      nilai,
      total: Math.round(r.total_skor),
      lulus: lulusSkd(nilai),
      selesaiAt: r.finished_at,
    };
  });

  // Pemisah dipakai berurutan; nilai 0 berarti masih seri, lanjut ke pemisah
  // berikutnya. Urutan TKP -> TIU -> TWK sengaja dibalik dari urutan tampilan.
  const URUTAN_PEMISAH = [...URUTAN_SUBTES_SKD].reverse();

  daftar.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;

    for (const kode of URUTAN_PEMISAH) {
      const sa = a.nilai[kode] ?? 0;
      const sb = b.nilai[kode] ?? 0;
      if (sb !== sa) return sb - sa;
    }

    // Yang lebih muda didahulukan; peserta tanpa tanggal lahir ditaruh belakang
    // supaya data yang belum lengkap tidak menggeser peserta lain naik.
    const la = a.tanggalLahir ?? "";
    const lb = b.tanggalLahir ?? "";
    if (la !== lb) {
      if (!la) return 1;
      if (!lb) return -1;
      return lb.localeCompare(la); // tanggal lebih akhir = lebih muda
    }

    return a.nama.localeCompare(b.nama, "id");
  });

  // Dua peserta berperingkat sama hanya bila SELURUH pemisah juga sama.
  const kunciBanding = (x: (typeof daftar)[number]) =>
    [
      x.total,
      ...URUTAN_PEMISAH.map((k) => x.nilai[k] ?? 0),
      x.tanggalLahir ?? "",
      x.nama.toLowerCase(),
    ].join("|");

  const keluar: BarisPeringkatSkd[] = [];
  let peringkat = 0;
  let sebelum = "";
  daftar.forEach((d, i) => {
    const kunci = kunciBanding(d);
    if (kunci !== sebelum) {
      peringkat = i + 1;
      sebelum = kunci;
    }
    keluar.push({ peringkat, ...d });
  });

  return keluar;
}
