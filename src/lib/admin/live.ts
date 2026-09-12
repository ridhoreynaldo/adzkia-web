import "server-only";

import { all } from "@/lib/core/db";
import { UMUR, ambil, kunci } from "@/lib/core/cache";
import { urutanSubtesPaket } from "@/lib/tryout/exam";
import { cekJawaban, estimasiTheta, paramButirPaket, thetaKeSkor } from "@/lib/tryout/irt";
import { URUTAN_SUBTES, type SubtesKode } from "@/lib/tryout/snbt";

/**
 * Papan skor langsung untuk pengawas.
 *
 * Peserta yang sudah selesai memakai skor final dari tabel `results`.
 * Peserta yang masih mengerjakan dinilai SEMENTARA di memori — tanpa menulis
 * apa pun ke database — supaya kalibrasi kesulitan butir dan skor resmi tidak
 * ikut berubah hanya karena papan ini dibuka.
 */

export interface BarisLive {
  attemptId: number;
  userId: number;
  nama: string;
  asalSekolah: string | null;
  /** `gugur` = digugurkan karena pelanggaran; ditampilkan sebagai "GAGAL". */
  status: "ongoing" | "finished" | "gugur";
  skor: number;
  /** true = skor sementara dari subtes yang sudah dikerjakan. */
  sementara: boolean;
  subtesAktif: string | null;
  subtesSelesai: number;
  totalSubtes: number;
  dijawab: number;
  totalSoal: number;
  benar: number;
  pelanggaran: number;
  mulaiAt: string;
  selesaiAt: string | null;
  skorSubtes: Record<string, number>;
  /**
   * Untuk baris `ongoing` saja — apakah ADA timer subtes yang benar-benar
   * masih berjalan.
   *
   * Dulu papan live menganggap setiap `ongoing` sebagai "sedang mengerjakan"
   * dan memberinya titik berdenyut. Padahal peserta yang menutup peramban
   * tetap `ongoing`, jadi titik itu berdenyut berjam-jam untuk kursi yang
   * sudah kosong — pengawas membaca ada yang sedang ujian padahal tidak.
   */
  timerJalan: boolean;
  /**
   * true = timernya mati TETAPI peserta masih berhak kembali: jendela paket
   * belum tutup dan masih ada subtes yang belum pernah dibuka. Ia sedang
   * JEDA, bukan terbengkalai — ujiannya tidak boleh ditutup.
   */
  bisaLanjut: boolean;
  /**
   * true = paketnya belum punya satu butir soal pun. Sesinya sudah lahir,
   * tetapi tidak ada yang bisa dikerjakan maupun dinilai — peserta sedang
   * MENUNGGU pengajar mengunggah soalnya, bukan terbengkalai.
   */
  menungguSoal: boolean;
}

export interface RingkasLive {
  /** Hanya yang timer subtesnya benar-benar berjalan. */
  sedangUjian: number;
  /** `ongoing` tetapi timernya sudah mati — jeda maupun terbengkalai. */
  timerMati: number;
  selesai: number;
  digugurkan: number;
  belumMulai: number;
  rataSelesai: number;
  tertinggi: number;
  totalPelanggaran: number;
}

interface AttemptLive {
  attempt_id: number;
  user_id: number;
  nama: string;
  asal_sekolah: string | null;
  status: "ongoing" | "finished" | "gugur";
  total_skor: number | null;
  subtes_aktif: string | null;
  /** 1 = ada subtes yang tenggatnya masih di depan. */
  timer_jalan: number;
  /** 1 = jendela paket sudah lewat atau paketnya ditutup. */
  jendela_tutup: number;
  subtes_dibuka: number;
  started_at: string;
  finished_at: string | null;
  pelanggaran: number;
  subtes_selesai: number;
}

interface ResponsLive {
  attempt_id: number;
  question_id: number;
  subtes: string;
  tipe: string;
  kunci: string;
  jawaban: string | null;
}

/**
 * Satu baris per peserta yang pernah membuka paket ini, terurut skor tertinggi.
 *
 * DIBUNGKUS CACHE 15 DETIK, dan itu bukan penghematan kecil. Fungsi ini menarik
 * SELURUH jawaban seluruh peserta yang sedang mengerjakan paket — pada paket
 * 1.000 peserta x 160 soal itu ±160.000 baris — lalu menilainya di JavaScript.
 * Halaman `/admin/live` adalah halaman yang PALING SERING disegarkan pengawas
 * selama ujian berlangsung, dan tiap penyegaran dulu mengulang seluruh
 * pekerjaan itu dari nol.
 *
 * Lima belas detik dipilih karena papan ini dibaca untuk MENGAWASI, bukan untuk
 * menghitung: pengawas perlu tahu siapa yang berhenti berdenyut dan siapa yang
 * tertinggal jauh — keduanya tidak berubah dalam hitungan detik. Nilai yang
 * mengikat (hasil akhir, pengguguran) tidak pernah dibaca dari sini.
 *
 * PENYETELAN BERIKUTNYA, bila 15 detik ternyata masih terlalu berat: pindahkan
 * penilaian sementara ke SQL sebagai agregat. Itu mengubah bentuk kodenya jauh
 * lebih dalam, jadi dikerjakan hanya kalau pengukuran memang menuntutnya.
 */
export async function papanLive(packageId: number): Promise<BarisLive[]> {
  return await ambil(kunci("papan", "live", packageId), UMUR.papan, async () => await hitungPapanLive(packageId));
}

async function hitungPapanLive(packageId: number): Promise<BarisLive[]> {
  const attempts = await all<AttemptLive>(
    `SELECT a.id AS attempt_id, a.user_id, u.nama, u.asal_sekolah,
            a.status, a.total_skor, a.subtes_aktif, a.started_at, a.finished_at,
            (SELECT COUNT(*) FROM violations v WHERE v.attempt_id = a.id) AS pelanggaran,
            (SELECT COUNT(*) FROM attempt_subtes s
              WHERE s.attempt_id = a.id AND s.selesai_at IS NOT NULL) AS subtes_selesai,
            -- Perbandingan waktu di sini mengikuti tutupSubtesKedaluwarsa() di
            -- exam.ts: tenggat subtes diukur UTC, jendela paket waktu lokal.
            EXISTS (SELECT 1 FROM attempt_subtes s
                     WHERE s.attempt_id = a.id AND s.selesai_at IS NULL
                       AND julianday(s.deadline_at) > julianday('now'))     AS timer_jalan,
            (SELECT CASE WHEN p.status = 'closed'
                           OR (p.selesai_at IS NOT NULL AND p.selesai_at < now())
                         THEN 1 ELSE 0 END
               FROM packages p WHERE p.id = a.package_id)                   AS jendela_tutup,
            (SELECT COUNT(DISTINCT s.subtes) FROM attempt_subtes s
              WHERE s.attempt_id = a.id)                                    AS subtes_dibuka
       FROM attempts a
       JOIN users u ON u.id = a.user_id
      WHERE a.package_id = ?`,
    packageId,
  );
  if (attempts.length === 0) return [];

  const subtesPaket = await subtesBerisi(packageId);
  // Untuk menilai "masih ada subtes yang belum dibuka" dipakai daftar resmi
  // milik exam.ts, BUKAN `subtesPaket` di atas. Keduanya berbeda pada jalur
  // SKD: di sana seluruh paket dikerjakan sebagai SATU sesi, sehingga daftar
  // subtes UTBK yang dipakai kolom skor akan menghasilkan nol dan salah baca.
  const jumlahSesiPaket = (await urutanSubtesPaket(packageId)).length;
  const totalSoal =
    (await all<{ n: number }>("SELECT COUNT(*) AS n FROM questions WHERE package_id = ?", packageId))[0]?.n ??
    0;

  // Skor final per subtes untuk peserta yang sudah selesai.
  const hasil = await all<{ attempt_id: number; subtes: string; skor: number; benar: number }>(
    `SELECT r.attempt_id, r.subtes, r.skor, r.benar
       FROM results r
       JOIN attempts a ON a.id = r.attempt_id
      WHERE a.package_id = ?`,
    packageId,
  );
  const skorFinal = new Map<number, Record<string, number>>();
  const benarFinal = new Map<number, number>();
  for (const h of hasil) {
    const m = skorFinal.get(h.attempt_id) ?? {};
    m[h.subtes] = Math.round(h.skor);
    skorFinal.set(h.attempt_id, m);
    benarFinal.set(h.attempt_id, (benarFinal.get(h.attempt_id) ?? 0) + h.benar);
  }

  // Jawaban peserta yang masih mengerjakan, untuk penilaian sementara.
  const idOngoing = attempts.filter((a) => a.status === "ongoing").map((a) => a.attempt_id);
  const respons = idOngoing.length
    ? await all<ResponsLive>(
        `SELECT ans.attempt_id, q.id AS question_id, q.subtes, q.tipe, q.kunci, ans.jawaban
           FROM answers ans
           JOIN questions q ON q.id = ans.question_id
          WHERE ans.attempt_id IN (${idOngoing.map(() => "?").join(",")})`,
        ...idOngoing,
      )
    : [];

  const param = await paramButirPaket(packageId);
  const perAttempt = new Map<number, ResponsLive[]>();
  for (const r of respons) {
    const daftar = perAttempt.get(r.attempt_id) ?? [];
    daftar.push(r);
    perAttempt.set(r.attempt_id, daftar);
  }

  // Subtes yang sudah ditutup peserta — hanya itu yang dipakai menghitung
  // skor sementara, supaya subtes yang baru berjalan tidak menyeret skor turun.
  const ditutup = await all<{ attempt_id: number; subtes: string }>(
    `SELECT s.attempt_id, s.subtes
       FROM attempt_subtes s
       JOIN attempts a ON a.id = s.attempt_id
      WHERE a.package_id = ? AND s.selesai_at IS NOT NULL`,
    packageId,
  );
  const subtesDitutup = new Map<number, Set<string>>();
  for (const d of ditutup) {
    const set = subtesDitutup.get(d.attempt_id) ?? new Set<string>();
    set.add(d.subtes);
    subtesDitutup.set(d.attempt_id, set);
  }

  const baris: BarisLive[] = await Promise.all(attempts.map(async (a) => {
    if (a.status === "finished") {
      return {
        attemptId: a.attempt_id,
        userId: a.user_id,
        nama: a.nama,
        asalSekolah: a.asal_sekolah,
        status: "finished",
        timerJalan: false,
        bisaLanjut: false,
        menungguSoal: false,
        skor: a.total_skor ?? 0,
        sementara: false,
        subtesAktif: null,
        subtesSelesai: subtesPaket.length,
        totalSubtes: subtesPaket.length,
        dijawab: totalSoal,
        totalSoal,
        benar: benarFinal.get(a.attempt_id) ?? 0,
        pelanggaran: a.pelanggaran,
        mulaiAt: a.started_at,
        selesaiAt: a.finished_at,
        skorSubtes: skorFinal.get(a.attempt_id) ?? {},
      };
    }

    // Digugurkan: tidak dinilai sama sekali, bahkan skor sementara.
    if (a.status === "gugur") {
      return {
        attemptId: a.attempt_id,
        userId: a.user_id,
        nama: a.nama,
        asalSekolah: a.asal_sekolah,
        status: "gugur",
        timerJalan: false,
        bisaLanjut: false,
        menungguSoal: false,
        skor: 0,
        sementara: false,
        subtesAktif: null,
        subtesSelesai: subtesDitutup.get(a.attempt_id)?.size ?? 0,
        totalSubtes: subtesPaket.length,
        dijawab: 0,
        totalSoal,
        benar: 0,
        pelanggaran: a.pelanggaran,
        mulaiAt: a.started_at,
        selesaiAt: null,
        skorSubtes: {},
      };
    }

    const jawab = perAttempt.get(a.attempt_id) ?? [];
    const selesai = subtesDitutup.get(a.attempt_id) ?? new Set<string>();

    let benar = 0;
    let dijawab = 0;
    const skorSubtes: Record<string, number> = {};
    const skorTerkumpul: number[] = [];

    for (const kode of subtesPaket) {
      const butir = jawab.filter((r) => r.subtes === kode);
      const terisi = butir.filter((r) => r.jawaban !== null && r.jawaban !== "");
      dijawab += terisi.length;

      const benarSubtes = butir.filter((r) => cekJawaban(r.tipe, r.kunci, r.jawaban)).length;
      benar += benarSubtes;

      if (!selesai.has(kode)) continue; // subtes berjalan / belum dibuka: belum dinilai

      const semuaButir = await all<{ id: number }>(
        "SELECT id FROM questions WHERE package_id = ? AND subtes = ?",
        packageId,
        kode,
      );
      const bButir = semuaButir.map((q) => param.get(q.id)?.b ?? 0);
      const theta = estimasiTheta(bButir, benarSubtes);
      const skor = thetaKeSkor(theta);
      skorSubtes[kode] = skor;
      skorTerkumpul.push(skor);
    }

    const skor = skorTerkumpul.length
      ? Math.round(skorTerkumpul.reduce((x, y) => x + y, 0) / skorTerkumpul.length)
      : 0;

    return {
      attemptId: a.attempt_id,
      userId: a.user_id,
      nama: a.nama,
      asalSekolah: a.asal_sekolah,
      status: "ongoing",
      timerJalan: a.timer_jalan === 1,
      // Jendela masih terbuka DAN masih ada subtes yang belum pernah dibuka:
      // peserta berhak kembali, dan keadaanUjian() akan menyalakan timer
      // berikutnya untuknya. Menutup ujiannya lebih awal menghapus subtes itu.
      bisaLanjut: a.jendela_tutup === 0 && a.subtes_dibuka < jumlahSesiPaket,
      menungguSoal: jumlahSesiPaket === 0,
      skor,
      sementara: true,
      subtesAktif: a.subtes_aktif,
      subtesSelesai: selesai.size,
      totalSubtes: subtesPaket.length,
      dijawab,
      totalSoal,
      benar,
      pelanggaran: a.pelanggaran,
      mulaiAt: a.started_at,
      selesaiAt: null,
      skorSubtes,
    };
  }));

  // Selesai lebih dulu (skor sudah final), lalu yang sedang berjalan,
  // dan yang digugurkan di paling bawah.
  const prioritas = (s: BarisLive["status"]) => (s === "finished" ? 0 : s === "ongoing" ? 1 : 2);
  baris.sort((x, y) => {
    if (x.status !== y.status) return prioritas(x.status) - prioritas(y.status);
    return y.skor - x.skor;
  });
  return baris;
}

export function ringkasLive(baris: BarisLive[]): RingkasLive {
  const selesai = baris.filter((b) => b.status === "finished");
  const jalan = baris.filter((b) => b.status === "ongoing");
  const gugur = baris.filter((b) => b.status === "gugur");
  const rata = selesai.length
    ? Math.round(selesai.reduce((a, b) => a + b.skor, 0) / selesai.length)
    : 0;
  return {
    sedangUjian: jalan.filter((b) => b.timerJalan).length,
    timerMati: jalan.filter((b) => !b.timerJalan).length,
    selesai: selesai.length,
    digugurkan: gugur.length,
    belumMulai: 0,
    rataSelesai: rata,
    tertinggi: selesai.length ? Math.max(...selesai.map((b) => b.skor)) : 0,
    totalPelanggaran: baris.reduce((a, b) => a + b.pelanggaran, 0),
  };
}

/** Subtes yang benar-benar punya soal pada paket ini, mengikuti urutan resmi. */
async function subtesBerisi(packageId: number): Promise<SubtesKode[]> {
  const ada = new Set(
    (await all<{ subtes: string }>(
      "SELECT DISTINCT subtes FROM questions WHERE package_id = ?",
      packageId,
    )).map((r) => r.subtes),
  );
  return URUTAN_SUBTES.filter((k) => ada.has(k));
}
