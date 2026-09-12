/**
 * KONTRAK PENILAIAN — dipakai lintas modul.
 * Modul ujian memanggil hitungHasil() saat peserta menyelesaikan tryout.
 *
 * =====================================================================
 * MODEL YANG DIPAKAI: RASCH / 1PL (Item Response Theory)
 * =====================================================================
 *
 * 1) PELUANG MENJAWAB BENAR
 *      P_i(theta) = 1 / (1 + exp(-(theta — b_i)))
 *    theta = kemampuan laten peserta (logit), b_i = tingkat kesulitan butir i (logit).
 *    Semakin besar b_i, semakin kecil peluang benar -> butir makin sulit.
 *
 * 2) KALIBRASI TINGKAT KESULITAN (b)
 *    Dari SELURUH peserta yang sudah menyelesaikan paket yang sama:
 *      p_i = (benar_i + 0.5) / (n + 1)          <- koreksi Laplace, tidak pernah 0 atau 1
 *      p_i dijepit ke [0.02, 0.98]              <- pengaman tambahan
 *      b_mentah_i = ln((1 - p_i) / p_i)         <- butir yang jarang dijawab benar => b besar
 *    Karena b dari sedikit peserta sangat berisik, dipakai shrinkage menuju prior b = 0:
 *      w = n / (n + 5)                          <- n < 5 => bobot kecil, b mendekati prior 0
 *      b_i = w * b_mentah_i
 *    Hasilnya disimpan di tabel item_params (b, p_benar, n_peserta).
 *
 * 3) ESTIMASI KEMAMPUAN (theta) PER SUBTES — Newton-Raphson MLE
 *    Turunan pertama & kedua log-likelihood Rasch terhadap theta:
 *      turunan-1  = R - SUM P_i(theta)          , R = skor mentah (jumlah butir benar)
 *      turunan-2  = -SUM P_i(theta) * (1 - P_i(theta))
 *    Iterasi:  theta <- theta + (R - SUM P_i) / SUM P_i(1 - P_i)
 *    Maksimal 30 iterasi, langkah diredam maksimal 1 logit, theta dijepit ke [-4, 4].
 *    Skor sempurna (R = n) dan skor nol (R = 0) membuat MLE tak hingga, jadi dipakai
 *    koreksi bertepi baku Rasch: R diganti n - 0.3 atau 0.3 supaya theta tetap berhingga.
 *
 * 4) PENYESUAIAN POLA JAWABAN (inti "benar di butir sulit lebih berharga")
 *    Pada Rasch murni skor mentah adalah statistik cukup: dua peserta dengan jumlah
 *    benar sama akan mendapat theta persis sama, padahal yang satu menaklukkan butir
 *    sulit dan yang lain hanya butir mudah. Karena itu ditambahkan koreksi pola yang
 *    memakai residu model (otomatis nol bila pola persis seperti dugaan model):
 *      r_i   = u_i — P_i(theta_MLE)             , u_i = 1 kalau benar, 0 kalau salah/kosong
 *      Delta = SUM r_i * (b_i — b_rata) / SUM P_i(1 - P_i)
 *      theta = theta_MLE + 0.5 * Delta          , besar koreksi dibatasi 0.4 logit
 *    Tanda Delta: benar di butir sulit  -> r_i > 0 dan (b_i — b_rata) > 0 -> Delta naik.
 *                 salah di butir mudah  -> r_i < 0 dan (b_i — b_rata) < 0 -> Delta naik.
 *                 benar hanya di butir mudah & salah di butir sulit       -> Delta turun.
 *    Untuk skor 0 atau sempurna, Delta = 0 (tidak ada informasi pola di sana).
 *
 * 5) PENSKALAAN KE RENTANG UTBK 0-1000
 *      skor = bulat( 500 + 125 * theta )  dipotong ke [0, 1000]
 *    theta = 0 (setara rata-rata kesulitan butir) -> 500 ; +4 -> 1000 ; -4 -> 0.
 *
 * Skor total = rata-rata skor seluruh subtes yang dikerjakan (sesuai kontrak).
 */
import { all, one, run, tx } from "@/lib/core/db";
import { URUTAN_SUBTES, namaSubtes } from "@/lib/tryout/snbt";

/* ------------------------------------------------------------------ */
/* Tetapan model                                                       */
/* ------------------------------------------------------------------ */

/** Bobot prior kalibrasi: n peserta di bawah angka ini ditarik kuat ke b = 0. */
const PRIOR_N = 5;
/** Batas proporsi benar supaya ln((1-p)/p) tidak meledak. */
const P_MIN = 0.02;
const P_MAX = 0.98;
/** Batas kemampuan laten. */
const THETA_MIN = -4;
const THETA_MAX = 4;
/** Penskalaan ke rentang UTBK. */
const SKOR_TENGAH = 500;
const SKOR_PER_LOGIT = 125;
/** Koreksi bertepi untuk skor mentah 0 / sempurna. */
const KOREKSI_TEPI = 0.3;
/** Kekuatan & batas koreksi pola jawaban (logit). */
const KOEF_POLA = 0.5;
const BATAS_POLA = 0.4;
/** Maksimum iterasi Newton-Raphson. */
const MAKS_ITERASI = 30;

/* ------------------------------------------------------------------ */
/* Tipe kontrak                                                        */
/* ------------------------------------------------------------------ */

export interface HasilSubtes {
  subtes: string;
  benar: number;
  salah: number;
  kosong: number;
  skor: number;   // skala 0-1000
  theta: number;  // logit kemampuan
}

export interface HasilTryout {
  attemptId: number;
  perSubtes: HasilSubtes[];
  totalSkor: number; // rata-rata skor 7 subtes
}

/** Benar/salah untuk satu butir, menghormati tipe PG / PGK / IS. */
export function cekJawaban(tipe: string, kunci: string, jawaban: string | null): boolean {
  if (jawaban == null || jawaban === "") return false;
  if (tipe === "PGK") {
    const parse = (v: string): string[] => {
      try {
        const p = JSON.parse(v);
        return Array.isArray(p) ? p.map(String).sort() : [String(p)];
      } catch {
        return v.split(",").map((s) => s.trim()).filter(Boolean).sort();
      }
    };
    const k = parse(kunci);
    const j = parse(jawaban);
    return k.length === j.length && k.every((v, i) => v === j[i]);
  }
  if (tipe === "BS") {
    // Benar hanya bila SELURUH pernyataan dijawab tepat — model Rasch menuntut
    // respons biner, jadi tidak ada nilai sebagian.
    const baca = (v: string): string[] => {
      try {
        const p = JSON.parse(v);
        return Array.isArray(p) ? p.map((x) => String(x).trim().toUpperCase()) : [];
      } catch {
        return v.split(/[,\-–]/).map((x) => x.trim().toUpperCase()).filter(Boolean);
      }
    };
    const k = baca(kunci);
    const j = baca(jawaban);
    if (k.length === 0 || j.length !== k.length) return false;
    return k.every((v, i) => v === j[i] && (j[i] === "B" || j[i] === "S"));
  }

  if (tipe === "IS") {
    const norm = (v: string) => v.toLowerCase().replace(/\s+/g, "").replace(/,/g, ".");
    return norm(kunci) === norm(jawaban);
  }
  return kunci.trim().toUpperCase() === jawaban.trim().toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Matematika Rasch                                                    */
/* ------------------------------------------------------------------ */

/** P(theta) = 1 / (1 + exp(-(theta - b))) */
export function peluangBenar(theta: number, b: number): number {
  return 1 / (1 + Math.exp(-(theta - b)));
}

function jepit(x: number, min: number, max: number): number {
  return x < min ? min : x > max ? max : x;
}

/**
 * Newton-Raphson MLE untuk theta pada model Rasch.
 * Menyelesaikan  SUM P_i(theta) = R  dengan R = skor mentah (dikoreksi di tepi).
 */
export function estimasiTheta(bButir: number[], skorMentah: number): number {
  const n = bButir.length;
  if (n === 0) return 0;

  // Koreksi bertepi supaya skor 0 / sempurna tetap menghasilkan theta berhingga.
  let R = skorMentah;
  if (R <= 0) R = KOREKSI_TEPI;
  else if (R >= n) R = n - KOREKSI_TEPI;

  const bRata = bButir.reduce((a, b) => a + b, 0) / n;
  let theta = bRata + Math.log(R / (n - R));
  if (!Number.isFinite(theta)) theta = 0;
  theta = jepit(theta, THETA_MIN, THETA_MAX);

  for (let iter = 0; iter < MAKS_ITERASI; iter++) {
    let jumlahP = 0;
    let informasi = 0;
    for (let i = 0; i < n; i++) {
      const p = peluangBenar(theta, bButir[i]);
      jumlahP += p;
      informasi += p * (1 - p);
    }
    if (informasi < 1e-9) break;                 // kurva sudah datar, berhenti
    const langkah = jepit((R - jumlahP) / informasi, -1, 1); // redam lompatan
    const sebelum = theta;
    theta = jepit(theta + langkah, THETA_MIN, THETA_MAX);
    if (Math.abs(theta - sebelum) < 1e-6) break;
  }
  return theta;
}

/**
 * Koreksi pola: memberi nilai lebih pada peserta yang benar di butir SULIT.
 * Lihat penjelasan nomor 4 di kepala berkas.
 */
export function penyesuaianPola(bButir: number[], u: number[], theta: number): number {
  const n = bButir.length;
  if (n < 2) return 0;
  const benar = u.reduce((a, v) => a + v, 0);
  if (benar === 0 || benar === n) return 0;      // tidak ada informasi pola

  const bRata = bButir.reduce((a, b) => a + b, 0) / n;
  let pembilang = 0;
  let informasi = 0;
  for (let i = 0; i < n; i++) {
    const p = peluangBenar(theta, bButir[i]);
    pembilang += (u[i] - p) * (bButir[i] - bRata);
    informasi += p * (1 - p);
  }
  if (informasi < 1e-9) return 0;
  return jepit((KOEF_POLA * pembilang) / informasi, -BATAS_POLA, BATAS_POLA);
}

/** theta (logit) -> skor UTBK 0-1000. */
export function thetaKeSkor(theta: number): number {
  return Math.round(jepit(SKOR_TENGAH + SKOR_PER_LOGIT * theta, 0, 1000));
}

/* ------------------------------------------------------------------ */
/* Kalibrasi butir                                                     */
/* ------------------------------------------------------------------ */

export interface ParamButir {
  question_id: number;
  b: number;
  p_benar: number;
  n_peserta: number;
}

interface BarisRespons {
  question_id: number;
  tipe: string;
  kunci: string;
  jawaban: string | null;
}

/**
 * Kalibrasi ulang seluruh butir pada satu paket dan simpan ke item_params.
 * Peserta yang dihitung: semua attempt berstatus 'finished' pada paket itu,
 * ditambah sertakanAttemptId (attempt yang sedang dinilai, kalau statusnya
 * belum sempat berubah jadi 'finished' saat hitungHasil dipanggil).
 * Idempoten — aman dipanggil berulang.
 */
export async function kalibrasiPaket(packageId: number, sertakanAttemptId = 0): Promise<Map<number, ParamButir>> {
  const baris = await all<BarisRespons>(
    `SELECT q.id AS question_id, q.tipe, q.kunci, a.jawaban
       FROM attempts att
       JOIN questions q ON q.package_id = att.package_id
       LEFT JOIN answers a ON a.attempt_id = att.id AND a.question_id = q.id
      WHERE att.package_id = ?
        AND (att.status = 'finished' OR att.id = ?)`,
    packageId,
    sertakanAttemptId,
  );

  const butir = await all<{ id: number }>("SELECT id FROM questions WHERE package_id = ?", packageId);

  const rekap = new Map<number, { benar: number; n: number }>();
  for (const q of butir) rekap.set(q.id, { benar: 0, n: 0 });
  for (const r of baris) {
    const slot = rekap.get(r.question_id);
    if (!slot) continue;
    slot.n++;
    if (cekJawaban(r.tipe, r.kunci, r.jawaban)) slot.benar++;
  }

  const hasil = new Map<number, ParamButir>();
  await tx(async () => {
    for (const [questionId, { benar, n }] of rekap) {
      // p dengan koreksi Laplace lalu dijepit -> tidak pernah 0 / 1.
      const p = jepit((benar + 0.5) / (n + 1), P_MIN, P_MAX);
      const bMentah = Math.log((1 - p) / p);
      const bobot = n / (n + PRIOR_N);              // shrinkage menuju prior b = 0
      const b = Number((bMentah * bobot).toFixed(6));
      const pBenar = n > 0 ? Number((benar / n).toFixed(6)) : 0;
      hasil.set(questionId, { question_id: questionId, b, p_benar: pBenar, n_peserta: n });
      await run(
        `INSERT INTO item_params (question_id, b, p_benar, n_peserta, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(question_id) DO UPDATE SET
           b = excluded.b, p_benar = excluded.p_benar,
           n_peserta = excluded.n_peserta, updated_at = excluded.updated_at`,
        questionId,
        b,
        pBenar,
        n,
      );
    }
  });
  return hasil;
}

/** Ambil parameter butir tersimpan untuk satu paket. */
export async function paramButirPaket(packageId: number): Promise<Map<number, ParamButir>> {
  const rows = await all<ParamButir>(
    `SELECT ip.question_id, ip.b, ip.p_benar, ip.n_peserta
       FROM item_params ip
       JOIN questions q ON q.id = ip.question_id
      WHERE q.package_id = ?`,
    packageId,
  );
  return new Map(rows.map((r) => [r.question_id, r]));
}

/* ------------------------------------------------------------------ */
/* Penilaian satu attempt                                              */
/* ------------------------------------------------------------------ */

interface ButirRow {
  id: number;
  subtes: string;
  nomor: number;
  tipe: string;
  kunci: string;
  jawaban: string | null;
}

/**
 * Menilai satu attempt dengan model Rasch, menyimpan ke tabel results,
 * dan mengisi attempts.total_skor. Aman dipanggil ulang (idempoten).
 */
export async function hitungHasil(attemptId: number): Promise<HasilTryout> {
  const att = await one<{ id: number; package_id: number }>(
    "SELECT id, package_id FROM attempts WHERE id = ?",
    attemptId,
  );
  if (!att) return { attemptId, perSubtes: [], totalSkor: 0 };

  // 1) Kalibrasi butir dari seluruh peserta paket ini (termasuk attempt ini).
  const param = await kalibrasiPaket(att.package_id, attemptId);

  // 2) Ambil jawaban peserta.
  const rows = await all<ButirRow>(
    `SELECT q.id, q.subtes, q.nomor, q.tipe, q.kunci, a.jawaban
       FROM questions q
       LEFT JOIN answers a ON a.question_id = q.id AND a.attempt_id = ?
      WHERE q.package_id = ?
      ORDER BY q.subtes, q.nomor`,
    attemptId,
    att.package_id,
  );

  const perSubtes: HasilSubtes[] = [];

  for (const kode of URUTAN_SUBTES) {
    const butir = rows.filter((r) => r.subtes === kode);
    if (butir.length === 0) continue;

    const bList: number[] = [];
    const uList: number[] = [];
    let benar = 0;
    let kosong = 0;

    for (const q of butir) {
      const isKosong = q.jawaban == null || q.jawaban === "";
      const isBenar = !isKosong && cekJawaban(q.tipe, q.kunci, q.jawaban);
      if (isKosong) kosong++;
      if (isBenar) benar++;
      bList.push(param.get(q.id)?.b ?? 0);
      uList.push(isBenar ? 1 : 0);   // kosong diperlakukan salah, tanpa penalti tambahan
    }
    const salah = butir.length - benar - kosong;

    // 3) MLE + koreksi pola.
    const thetaMle = estimasiTheta(bList, benar);
    const theta = jepit(thetaMle + penyesuaianPola(bList, uList, thetaMle), THETA_MIN, THETA_MAX);

    perSubtes.push({
      subtes: kode,
      benar,
      salah,
      kosong,
      skor: thetaKeSkor(theta),
      theta: Number(theta.toFixed(6)),
    });
  }

  const totalSkor = perSubtes.length
    ? Math.round(perSubtes.reduce((a, s) => a + s.skor, 0) / perSubtes.length)
    : 0;

  await tx(async () => {
    for (const s of perSubtes) {
      await run(
        `INSERT INTO results (attempt_id, subtes, benar, salah, kosong, skor, theta)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(attempt_id, subtes) DO UPDATE SET
           benar = excluded.benar, salah = excluded.salah, kosong = excluded.kosong,
           skor = excluded.skor, theta = excluded.theta`,
        attemptId, s.subtes, s.benar, s.salah, s.kosong, s.skor, s.theta,
      );
    }
    await run(`UPDATE attempts SET total_skor = ? WHERE id = ?`, totalSkor, attemptId);
  });

  return { attemptId, perSubtes, totalSkor };
}

export async function ambilHasil(attemptId: number): Promise<HasilTryout | null> {
  const att = await one<{ id: number; total_skor: number | null }>(
    "SELECT id, total_skor FROM attempts WHERE id = ?",
    attemptId,
  );
  if (!att) return null;
  const perSubtes = await all<HasilSubtes>(
    "SELECT subtes, benar, salah, kosong, skor, theta FROM results WHERE attempt_id = ?",
    attemptId,
  );
  if (perSubtes.length === 0) return null;
  const urut = perSubtes
    .slice()
    .sort((a, b) => urutanSubtes(a.subtes) - urutanSubtes(b.subtes));
  return { attemptId, perSubtes: urut, totalSkor: att.total_skor ?? 0 };
}

function urutanSubtes(kode: string): number {
  const i = (URUTAN_SUBTES as readonly string[]).indexOf(kode);
  return i < 0 ? 99 : i;
}

/**
 * Nilai ulang SELURUH attempt pada satu paket memakai kalibrasi terbaru.
 * Berguna dipanggil admin setelah semua peserta selesai supaya seluruh peserta
 * dibandingkan dengan parameter butir yang sama persis.
 */
export async function hitungUlangPaket(packageId: number): Promise<number> {
  const att = await all<{ id: number }>(
    "SELECT id FROM attempts WHERE package_id = ? AND status = 'finished' ORDER BY id",
    packageId,
  );
  for (const a of att) await hitungHasil(a.id);
  return att.length;
}

/* ------------------------------------------------------------------ */
/* Peringkat & statistik paket                                         */
/* ------------------------------------------------------------------ */

export interface BarisPeringkat {
  peringkat: number;
  attemptId: number;
  userId: number;
  nama: string;
  asalSekolah: string | null;
  totalSkor: number;
  selesaiAt: string | null;
  skorSubtes: Record<string, number>;
}

/** Papan peringkat satu paket, urut skor total menurun. */
export async function peringkatPeserta(packageId: number): Promise<BarisPeringkat[]> {
  const rows = await all<{
    attempt_id: number;
    user_id: number;
    nama: string;
    asal_sekolah: string | null;
    total_skor: number | null;
    finished_at: string | null;
  }>(
    `SELECT att.id AS attempt_id, att.user_id, u.nama, u.asal_sekolah,
            att.total_skor, att.finished_at
       FROM attempts att
       JOIN users u ON u.id = att.user_id
      WHERE att.package_id = ?
        AND att.status = 'finished'
        AND att.total_skor IS NOT NULL
      ORDER BY att.total_skor DESC, att.finished_at ASC, att.id ASC`,
    packageId,
  );
  if (rows.length === 0) return [];

  const res = await all<{ attempt_id: number; subtes: string; skor: number }>(
    `SELECT r.attempt_id, r.subtes, r.skor
       FROM results r
       JOIN attempts att ON att.id = r.attempt_id
      WHERE att.package_id = ?`,
    packageId,
  );
  const petaSkor = new Map<number, Record<string, number>>();
  for (const r of res) {
    const slot = petaSkor.get(r.attempt_id) ?? {};
    slot[r.subtes] = Math.round(r.skor);
    petaSkor.set(r.attempt_id, slot);
  }

  const keluar: BarisPeringkat[] = [];
  let peringkat = 0;
  let skorSebelum = Number.NaN;
  rows.forEach((r, i) => {
    const total = Math.round(r.total_skor ?? 0);
    // Peringkat kompetisi standar: skor sama -> peringkat sama.
    if (total !== skorSebelum) {
      peringkat = i + 1;
      skorSebelum = total;
    }
    keluar.push({
      peringkat,
      attemptId: r.attempt_id,
      userId: r.user_id,
      nama: r.nama,
      asalSekolah: r.asal_sekolah,
      totalSkor: total,
      selesaiAt: r.finished_at,
      skorSubtes: petaSkor.get(r.attempt_id) ?? {},
    });
  });
  return keluar;
}

export interface StatistikSubtes {
  subtes: string;
  nama: string;
  rata: number;
  tertinggi: number;
  terendah: number;
  rataBenar: number;
  jumlahSoal: number;
}

export interface StatistikPaket {
  packageId: number;
  jumlahPeserta: number;
  rataTotal: number;
  tertinggiTotal: number;
  terendahTotal: number;
  perSubtes: StatistikSubtes[];
}

/** Rata-rata & tertinggi per subtes untuk satu paket (dipakai halaman peringkat & hasil). */
export async function statistikPaket(packageId: number): Promise<StatistikPaket> {
  const tot = await one<{ n: number; rata: number | null; maks: number | null; min: number | null }>(
    `SELECT COUNT(*) AS n, AVG(total_skor) AS rata,
            MAX(total_skor) AS maks, MIN(total_skor) AS min
       FROM attempts
      WHERE package_id = ? AND status = 'finished' AND total_skor IS NOT NULL`,
    packageId,
  );

  const per = await all<{
    subtes: string;
    rata: number | null;
    maks: number | null;
    min: number | null;
    rata_benar: number | null;
    n_soal: number | null;
  }>(
    `SELECT r.subtes,
            AVG(r.skor) AS rata, MAX(r.skor) AS maks, MIN(r.skor) AS min,
            AVG(r.benar) AS rata_benar,
            MAX(r.benar + r.salah + r.kosong) AS n_soal
       FROM results r
       JOIN attempts att ON att.id = r.attempt_id
      WHERE att.package_id = ? AND att.status = 'finished'
      GROUP BY r.subtes`,
    packageId,
  );

  const perSubtes: StatistikSubtes[] = per
    .map((p) => ({
      subtes: p.subtes,
      nama: namaSubtes(p.subtes),
      rata: Math.round(p.rata ?? 0),
      tertinggi: Math.round(p.maks ?? 0),
      terendah: Math.round(p.min ?? 0),
      rataBenar: Number((p.rata_benar ?? 0).toFixed(1)),
      jumlahSoal: p.n_soal ?? 0,
    }))
    .sort((a, b) => urutanSubtes(a.subtes) - urutanSubtes(b.subtes));

  return {
    packageId,
    jumlahPeserta: tot?.n ?? 0,
    rataTotal: Math.round(tot?.rata ?? 0),
    tertinggiTotal: Math.round(tot?.maks ?? 0),
    terendahTotal: Math.round(tot?.min ?? 0),
    perSubtes,
  };
}

export interface PosisiPeserta {
  peringkat: number;
  jumlahPeserta: number;
  persentil: number; // 0-100, makin besar makin baik
}

/** Posisi satu attempt di dalam papan peringkat paketnya. */
export async function posisiPeserta(packageId: number, attemptId: number): Promise<PosisiPeserta> {
  const papan = await peringkatPeserta(packageId);
  const n = papan.length;
  const saya = papan.find((r) => r.attemptId === attemptId);
  if (!saya || n === 0) return { peringkat: 0, jumlahPeserta: n, persentil: 0 };

  const diBawah = papan.filter((r) => r.totalSkor < saya.totalSkor).length;
  const sama = papan.filter((r) => r.totalSkor === saya.totalSkor).length;
  // Persentil rank baku: (jumlah di bawah + separuh yang sama) / total.
  const persentil = Math.round(((diBawah + sama / 2) / n) * 100);
  return { peringkat: saya.peringkat, jumlahPeserta: n, persentil };
}

/* ------------------------------------------------------------------ */
/* Rincian jawaban untuk halaman pembahasan                            */
/* ------------------------------------------------------------------ */

export interface ButirPembahasan {
  id: number;
  subtes: string;
  nomor: number;
  tipe: string;
  level: string;
  stimulus: string | null;
  pertanyaan: string;
  gambarUrl: string | null;
  opsi: string[];
  kunci: string;
  pembahasan: string | null;
  jawaban: string | null;
  benar: boolean;
  kosong: boolean;
  b: number;
  pBenar: number;
}

/** Seluruh butir paket beserta jawaban peserta — bahan halaman pembahasan. */
export async function detailJawaban(attemptId: number): Promise<ButirPembahasan[]> {
  const att = await one<{ package_id: number }>(
    "SELECT package_id FROM attempts WHERE id = ?",
    attemptId,
  );
  if (!att) return [];

  const rows = await all<{
    id: number;
    subtes: string;
    nomor: number;
    tipe: string;
    level: string;
    stimulus: string | null;
    pertanyaan: string;
    gambar_url: string | null;
    opsi: string;
    kunci: string;
    pembahasan: string | null;
    jawaban: string | null;
    b: number | null;
    p_benar: number | null;
  }>(
    `SELECT q.id, q.subtes, q.nomor, q.tipe, q.level, q.stimulus, q.pertanyaan,
            q.gambar_url, q.opsi, q.kunci, q.pembahasan,
            a.jawaban, ip.b, ip.p_benar
       FROM questions q
       LEFT JOIN answers a ON a.question_id = q.id AND a.attempt_id = ?
       LEFT JOIN item_params ip ON ip.question_id = q.id
      WHERE q.package_id = ?
      ORDER BY q.subtes, q.nomor`,
    attemptId,
    att.package_id,
  );

  return rows.map((r) => {
    let opsi: string[] = [];
    try {
      const p: unknown = JSON.parse(r.opsi ?? "[]");
      if (Array.isArray(p)) opsi = p.map(String);
    } catch {
      opsi = [];
    }
    const kosong = r.jawaban == null || r.jawaban === "";
    return {
      id: r.id,
      subtes: r.subtes,
      nomor: r.nomor,
      tipe: r.tipe,
      level: r.level,
      stimulus: r.stimulus,
      pertanyaan: r.pertanyaan,
      gambarUrl: r.gambar_url,
      opsi,
      kunci: r.kunci,
      pembahasan: r.pembahasan,
      jawaban: r.jawaban,
      benar: !kosong && cekJawaban(r.tipe, r.kunci, r.jawaban),
      kosong,
      b: r.b ?? 0,
      pBenar: r.p_benar ?? 0,
    };
  });
}
