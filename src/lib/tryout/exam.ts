/**
 * ADZKIA SMART — logika server ruang ujian.
 *
 * Semua keputusan waktu diambil dari jam PostgreSQL (`now()`), bukan dari jam
 * klien. Klien hanya menerima "sisa detik" dan menghitung mundur.
 *
 * Sebagian besar akses basis datanya sudah pindah ke `src/server/repositories`
 * dan aturannya ke `src/server/services`; yang tersisa di berkas ini adalah
 * mesin keadaan ujian dan penyusunan layar, yang memang bukan akses data.
 */
import { all, one, run } from "@/lib/core/db";
import * as attemptRepo from "@/server/repositories/attempt.repository";
import * as answerRepo from "@/server/repositories/answer.repository";
import * as packageRepo from "@/server/repositories/package.repository";
import * as examService from "@/server/services/exam.service";
import * as answerService from "@/server/services/answer.service";
import { hitungHasil } from "@/lib/tryout/irt";
import { URUTAN_SUBTES, durasiSesi, getSubtes, namaSubtes, type SubtesKode, type TipeSoal } from "@/lib/tryout/snbt";
import { SESI_SKD, SUBTES_SKD, TOTAL_MENIT_SKD, URUTAN_SUBTES_SKD } from "@/lib/tryout/skd";
import { hitungHasilSkd } from "@/lib/tryout/nilai-skd";
// Kalimat layar GAGAL diambil langsung dari sumbernya di `@/lib`, bukan lewat
// `@/components/exam/tipe` yang cuma mengekspornya ulang — dengan begitu seluruh
// `src/lib` berdiri sendiri dan bisa diuji tanpa menyeret kode komponen.
import { PESAN_GUGUR, pesanGugur } from "@/lib/penjagaan/pelanggaran-jenis";
import type { KeadaanUjian, SoalUjian } from "@/components/exam/tipe";
import { pastikanSiklusTerbaru } from "@/lib/tryout/siklus-jadwal";

export { PESAN_GUGUR, pesanGugur };

/* ------------------------------------------------------------------ */
/* Tipe baris database                                                  */
/* ------------------------------------------------------------------ */

export type StatusPaket = "draft" | "published" | "closed";
/** Jalur latihan: tryout UTBK-SNBT atau SKD Kedinasan. */
export type JalurPaket = "utbk" | "skd";
/** `gugur` = digugurkan karena pelanggaran; ditampilkan ke pengguna sebagai "GAGAL". */
export type StatusAttempt = "ongoing" | "finished" | "gugur";
export type JalurUjian = "utama" | "susulan";

export interface PaketRow {
  id: number;
  kode: string;
  nama: string;
  jalur: JalurPaket;
  deskripsi: string | null;
  status: StatusPaket;
  mulai_at: string | null;
  selesai_at: string | null;
  acak_soal: number;
  tampil_pembahasan: number;
  created_at: string;
}

export interface AttemptRow {
  id: number;
  user_id: number;
  package_id: number;
  status: StatusAttempt;
  jalur: JalurUjian;
  ronde: number;
  subtes_aktif: string | null;
  started_at: string;
  finished_at: string | null;
  digugurkan_at: string | null;
  alasan_gugur: string | null;
  total_skor: number | null;
}

export interface AttemptSubtesRow {
  id: number;
  attempt_id: number;
  subtes: string;
  mulai_at: string;
  deadline_at: string;
  selesai_at: string | null;
}

/** Kartu paket di dashboard: paket + status peserta. */
export interface PaketDashboard extends PaketRow {
  attempt_id: number | null;
  attempt_status: StatusAttempt | null;
  attempt_skor: number | null;
  jumlah_soal: number;
  /** 1 = admin sudah mengizinkan peserta ini mengikuti ujian susulan. */
  susulan_izin: number;
  /** 1 = paket masih di dalam jendela waktunya (bukan lewat masa berlaku). */
  dalam_jendela: number;
}

export interface StatistikSiswa {
  jumlahTryout: number;
  sedangBerlangsung: number;
  skorTerakhir: number | null;
  skorTertinggi: number | null;
}

/** Baris rincian subtes untuk halaman persiapan / progres. */
export interface RincianSubtes {
  kode: SubtesKode;
  nama: string;
  jumlahSoal: number;
  durasiMenit: number;
  kelompok: "TPS" | "Literasi";
  /** null = belum tersedia timer-nya. */
  selesai: boolean;
}

/* ------------------------------------------------------------------ */
/* Paket & statistik dashboard                                          */
/* ------------------------------------------------------------------ */

/**
 * Catatan: `packages.mulai_at`/`selesai_at` diisi admin lewat input
 * `datetime-local`, jadi dibaca sebagai waktu lokal server.
 */
/*
 * `TRIM(...) = ''` SENGAJA DIHAPUS dari ekspresi ini.
 *
 * Di SQLite kolom waktu adalah TEKS, sehingga "belum diisi" bisa berupa NULL
 * ATAU untaian kosong — dan keduanya harus diperiksa. Di PostgreSQL kolomnya
 * `timestamptz`: satu-satunya bentuk "belum diisi" adalah NULL, dan `TRIM()`
 * pada nilai waktu ditolak mentah-mentah ("function btrim(timestamp with time
 * zone) does not exist"). Query yang masih memakainya GAGAL TOTAL, bukan salah
 * hitung — itulah yang menjatuhkan dasbor siswa dan papan Live.
 */
const EKSPRESI_JENDELA = `
  ((p.mulai_at   IS NULL OR p.mulai_at   <= now())
   AND (p.selesai_at IS NULL OR p.selesai_at >= now()))`;

/**
 * Paket published yang sedang dibuka, beserta status pengerjaan siswa.
 * Paket yang jendela waktunya sudah lewat tetap ikut tampil bila peserta
 * memegang izin ujian susulan — itulah gunanya izin tersebut.
 */
export async function daftarPaketSiswa(userId: number): Promise<PaketDashboard[]> {
  // Titik tumpu penjadwal siklus pekanan: tidak ada cron di aplikasi ini, jadi
  // ia menumpang permintaan yang memang sudah terjadi. Di sinilah tempat yang
  // paling dapat diandalkan — setiap siswa yang membuka beranda atau menekan
  // "Mulai" melewatinya. Pemanggilannya dijaga jeda dan menelan galatnya
  // sendiri, jadi beranda tidak pernah gagal tampil karena urusan penjadwalan.
  await pastikanSiklusTerbaru();

  // Pembatas peserta disaring di sini, bukan di dalam SQL: jumlah paket selalu
  // sedikit, dan aturannya jauh lebih mudah dibaca sebagai satu fungsi daripada
  // sebagai tiga subkueri bersarang. Izin susulan tetap menembus pembatas —
  // pengelola sudah memberikannya kepada orang itu secara khusus.
  // Perulangan biasa, bukan `.filter()`: penyaringnya harus menanyai basis data,
  // dan `.filter()` tidak bisa menunggu jawaban — ia hanya melihat Promise, yang
  // selalu bernilai benar, sehingga SELURUH paket akan lolos penyaringan.
  //
  // PENYETELAN: ini satu query per paket. Selama satu siswa hanya punya
  // segelintir paket, biayanya tidak terasa; kalau kelak daftarnya panjang,
  // gantikan dengan satu query yang memulangkan seluruh izinnya sekaligus.
  const mentah = await daftarPaketMentah(userId);
  const hasil: PaketDashboard[] = [];
  for (const p of mentah) {
    if (p.susulan_izin === 1 || (await pesertaDiizinkan(userId, p.id))) hasil.push(p);
  }
  return hasil;
}

async function daftarPaketMentah(userId: number): Promise<PaketDashboard[]> {
  return await all<PaketDashboard>(
    `SELECT p.*,
            a.id         AS attempt_id,
            a.status     AS attempt_status,
            a.total_skor AS attempt_skor,
            (SELECT COUNT(*) FROM questions q WHERE q.package_id = p.id) AS jumlah_soal,
            CASE WHEN s.id IS NULL THEN 0 ELSE 1 END AS susulan_izin,
            CASE WHEN ${EKSPRESI_JENDELA} THEN 1 ELSE 0 END AS dalam_jendela
       FROM packages p
       LEFT JOIN attempts a ON a.package_id = p.id AND a.user_id = ?
       LEFT JOIN susulan  s ON s.package_id = p.id AND s.user_id = ?
      WHERE p.status = 'published' AND (${EKSPRESI_JENDELA} OR s.id IS NOT NULL)
      ORDER BY p.created_at DESC, p.id DESC`,
    userId,
    userId,
  );
}

export async function statistikSiswa(userId: number): Promise<StatistikSiswa> {
  const selesai = await one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM attempts WHERE user_id = ? AND status = 'finished'",
    userId,
  );
  const berlangsung = await one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM attempts WHERE user_id = ? AND status = 'ongoing'",
    userId,
  );
  const terakhir = await one<{ total_skor: number | null }>(
    `SELECT total_skor FROM attempts
      WHERE user_id = ? AND status = 'finished' AND total_skor IS NOT NULL
      ORDER BY finished_at DESC, id DESC LIMIT 1`,
    userId,
  );
  const tertinggi = await one<{ maks: number | null }>(
    `SELECT MAX(total_skor) AS maks FROM attempts
      WHERE user_id = ? AND status = 'finished'`,
    userId,
  );

  return {
    jumlahTryout: selesai?.n ?? 0,
    sedangBerlangsung: berlangsung?.n ?? 0,
    skorTerakhir: terakhir?.total_skor ?? null,
    skorTertinggi: tertinggi?.maks ?? null,
  };
}

export async function getPaket(packageId: number): Promise<PaketRow | undefined> {
  return await packageRepo.cariById(packageId);
}

/**
 * Jalur sebuah paket; paket lama tanpa penanda dianggap UTBK.
 *
 * DI-CACHE, karena inilah satu-satunya query yang dipanggil ulang pada rute
 * TERPANAS (denyut nadi, tiap lima detik per peserta) untuk menjawab pertanyaan
 * yang jawabannya tidak pernah berubah selama paket itu hidup. Umurnya sepuluh
 * menit dan dibuang seketika oleh `buangPaket()` begitu paket disunting.
 *
 * Cache mati = query ini berjalan seperti sebelumnya.
 */
export async function jalurPaket(packageId: number): Promise<JalurPaket> {
  return await examService.jalurPaket(packageId);
}

/* ------------------------------------------------------------------ */
/* Daftar peserta per paket                                             */
/* ------------------------------------------------------------------ */

/**
 * Paket ini dibatasi ke peserta tertentu?
 *
 * Paket TANPA satu pun baris pembatas terbuka untuk semua — itulah keadaan
 * seluruh paket yang sudah ada sebelum fitur ini, dan aturan itu yang membuat
 * pembaruan ini tidak mengunci siapa pun secara tidak sengaja.
 */
export async function paketDibatasi(packageId: number): Promise<boolean> {
  // TIDAK ADA PEMANGGILNYA lagi di dalam aplikasi — sejak gerbang peserta
  // digabung menjadi `packageRepo.izinPeserta()`, yang menjawab pertanyaan ini
  // DAN pertanyaan "peserta ini boleh?" dalam satu query. Dibiarkan terekspor
  // karena berkas uji dan skrip sekali-pakai memanggilnya, dan menghapusnya
  // tidak mempercepat apa pun.
  //
  // `userId: 0` tidak pernah cocok dengan baris users mana pun, jadi kedua
  // pencacah kecocokan pasti nol — dan `dibatasi` memang tidak dihitung dari
  // keduanya.
  const { dibatasi } = await packageRepo.izinPeserta(0, packageId);
  return dibatasi;
}

/**
 * Peserta ini termasuk yang ditetapkan pengelola untuk paket tersebut?
 *
 * Dua jalan masuk, dan salah satunya sudah cukup: namanya didaftarkan satu per
 * satu, atau KELASNYA didaftarkan. Pencocokan kelas sengaja mengabaikan besar
 * kecil huruf dan spasi tepi — data asli sekolah memuat "XII HARVARD" dan
 * "XII Harvard" berdampingan, dan peserta tidak boleh terkunci karena itu.
 *
 * Pengabaian huruf besar-kecilnya ditulis `lower(TRIM(...))`, BUKAN
 * `COLLATE NOCASE`: kolasi itu milik SQLite dan tidak ada di PostgreSQL, yang
 * menolaknya dengan "collation nocase does not exist". Untuk nama kelas yang
 * seluruhnya ASCII, `lower()` memberi hasil yang sama persis.
 */
export async function pesertaDiizinkan(userId: number, packageId: number): Promise<boolean> {
  const { diizinkan } = await packageRepo.izinPeserta(userId, packageId);
  return diizinkan;
}

/**
 * Paket boleh dibuka siswa sekarang?
 *
 * Tiga syarat berturut-turut: sudah terbit, berada di dalam jendela waktunya,
 * dan peserta ini memang ditetapkan pengelola untuk mengikutinya.
 */
export async function paketDapatDikerjakan(paket: PaketRow, userId: number): Promise<boolean> {
  return await examService.paketDapatDikerjakan(paket, userId);
}

/* ------------------------------------------------------------------ */
/* Izin ujian susulan                                                   */
/* ------------------------------------------------------------------ */

export interface IzinSusulan {
  id: number;
  user_id: number;
  package_id: number;
  diberikan_oleh: number | null;
  catatan: string | null;
  created_at: string;
  dipakai_at: string | null;
}

export async function izinSusulan(userId: number, packageId: number): Promise<IzinSusulan | undefined> {
  return await one<IzinSusulan>(
    "SELECT * FROM susulan WHERE user_id = ? AND package_id = ?",
    userId,
    packageId,
  );
}

export async function susulanDiizinkan(userId: number, packageId: number): Promise<boolean> {
  return await izinSusulan(userId, packageId) !== undefined;
}

/**
 * Boleh dibuka lewat jalur susulan? Paket harus published dan peserta harus
 * memegang izin — jendela waktu paket sengaja diabaikan, karena peserta
 * susulan memang mengerjakan setelah hari-H lewat.
 */
export async function paketDapatDikerjakanSusulan(paket: PaketRow, userId: number): Promise<boolean> {
  return paket.status === "published" && await susulanDiizinkan(userId, paket.id);
}

/* ------------------------------------------------------------------ */
/* Diskualifikasi                                                       */
/* ------------------------------------------------------------------ */

/**
 * Gugurkan ujian karena pelanggaran: peserta meninggalkan halaman pengerjaan.
 * Ujian langsung dikunci — semua timer subtes ditutup, status jadi `gugur`,
 * dan skor TIDAK dihitung. Jawaban serta catatan pelanggaran tetap disimpan
 * sebagai bukti. Idempoten: memanggil ulang tidak mengubah apa pun.
 */
export async function gugurkanUjian(attemptId: number, alasan: string): Promise<boolean> {
  return await examService.gugurkan(attemptId, alasan);
}

/* ------------------------------------------------------------------ */
/* Attempt                                                              */
/* ------------------------------------------------------------------ */

export async function attemptSiswa(userId: number, packageId: number): Promise<AttemptRow | undefined> {
  return await attemptRepo.cariMilikPeserta(userId, packageId);
}

export async function getAttempt(attemptId: number): Promise<AttemptRow | undefined> {
  return await attemptRepo.cariById(attemptId);
}

/**
 * Buat attempt baru, atau kembalikan yang sudah ada (melanjutkan yang `ongoing`).
 * Aman dipanggil berulang — tabel `attempts` UNIQUE(user_id, package_id).
 */
export async function mulaiAttempt(userId: number, packageId: number): Promise<AttemptRow> {
  return await examService.mulai(userId, packageId);
}

/**
 * Mulai (atau lanjutkan) ujian lewat jalur susulan.
 *
 * - Belum pernah mengerjakan -> sesi baru bertanda `susulan`.
 * - Sedang berlangsung       -> dilanjutkan apa adanya.
 * - Digugurkan               -> disetel ulang: jawaban, timer, dan hasil ronde
 *   lama dihapus supaya peserta betul-betul mengulang dari nol. Catatan
 *   pelanggarannya sengaja DIPERTAHANKAN sebagai riwayat, dibedakan lewat
 *   nomor ronde.
 *
 * Sesi yang sudah `finished` tidak pernah disetel ulang — nilainya sudah sah.
 */
export async function mulaiSusulan(userId: number, packageId: number): Promise<AttemptRow | null> {
  return await examService.mulaiSusulan(userId, packageId);
}

/* ------------------------------------------------------------------ */
/* Urutan subtes & timer                                                */
/* ------------------------------------------------------------------ */

/**
 * Urutan subtes yang benar-benar punya soal di paket ini, mengikuti
 * `URUTAN_SUBTES` resmi. Paket lengkap = 7 subtes.
 */
export async function urutanSubtesPaket(packageId: number): Promise<string[]> {
  const rows = await all<{ subtes: string }>(
    "SELECT DISTINCT subtes FROM questions WHERE package_id = ?",
    packageId,
  );
  const ada = new Set(rows.map((r) => r.subtes));

  // SKD dikerjakan dalam satu sesi 100 menit, bukan subtes berurutan, jadi
  // seluruh paket diwakili satu kode sesi.
  if (await jalurPaket(packageId) === "skd") {
    return URUTAN_SUBTES_SKD.some((k) => ada.has(k)) ? [SESI_SKD] : [];
  }
  return URUTAN_SUBTES.filter((k) => ada.has(k));
}

export async function barisSubtes(attemptId: number, subtes: string): Promise<AttemptSubtesRow | undefined> {
  return await attemptRepo.cariBarisSubtes(attemptId, subtes);
}

/**
 * Mulai timer sebuah subtes: `deadline_at = now + durasiMenit`.
 * Idempoten — memanggil ulang tidak memperpanjang waktu.
 */
export async function mulaiSubtes(attemptId: number, subtes: string): Promise<AttemptSubtesRow> {
  const menit = durasiSesi(subtes);
  if (menit == null) throw new Error(`Subtes tidak dikenal: ${subtes}`);

  const row = await attemptRepo.bukaSubtes(attemptId, subtes, menit);
  if (!row) throw new Error("Gagal memulai subtes.");
  return row;
}

/** Sisa detik sampai deadline menurut jam server. Tidak pernah negatif. */
export async function sisaDetik(attemptId: number, subtes: string): Promise<number> {
  return await attemptRepo.sisaDetik(attemptId, subtes);
}

/** Tutup subtes (kunci jawaban selanjutnya). Idempoten. */
export async function selesaikanSubtes(attemptId: number, subtes: string): Promise<void> {
  await attemptRepo.tutupSubtes(attemptId, subtes);
}

/** Kunci semua subtes yang deadline-nya sudah lewat. */
async function tutupSubtesKedaluwarsa(attemptId: number): Promise<void> {
  await attemptRepo.tutupSubtesKedaluwarsa(attemptId);
}

/**
 * Tutup ujian: hitung IRT, tandai `finished`.
 * `hitungHasil` memakai transaksinya sendiri, jadi dipanggil di luar `tx()`.
 */
export async function selesaikanUjian(attemptId: number): Promise<void> {
  const att = await getAttempt(attemptId);
  if (!att) return;
  await attemptRepo.tutupSemuaSubtes(attemptId);
  try {
    // Tiap jalur punya cara menilainya sendiri: SKD memakai poin resmi,
    // UTBK memakai IRT.
    if (await jalurPaket(att.package_id) === "skd") await hitungHasilSkd(attemptId);
    else await hitungHasil(attemptId);
  } catch {
    // Penilaian boleh gagal (mis. paket tanpa soal) — ujian tetap ditutup.
  }
  await attemptRepo.tandaiSelesai(attemptId);
}

/* ------------------------------------------------------------------ */
/* Mesin keadaan ujian                                                  */
/* ------------------------------------------------------------------ */

function keadaanSelesai(att: AttemptRow, total: number): KeadaanUjian {
  return {
    attemptId: att.id,
    packageId: att.package_id,
    selesai: true,
    subtes: null,
    namaSubtes: "",
    urutanKe: 0,
    totalSubtes: total,
    sisaDetik: 0,
    sudahMulai: false,
  };
}

/**
 * Cari subtes yang sedang berjalan.
 *
 * - Menutup otomatis subtes yang waktunya habis.
 * - `mulaiOtomatis: true` (dipakai halaman ruang ujian) akan menyalakan timer
 *   subtes berikutnya bila belum menyala.
 * - Bila semua subtes selesai, ujian ditutup dan hasil dihitung.
 */
export async function keadaanUjian(
  attemptId: number,
  opts: { mulaiOtomatis?: boolean } = {},
): Promise<KeadaanUjian | null> {
  const mulaiOtomatis = opts.mulaiOtomatis ?? false;
  const att = await getAttempt(attemptId);
  if (!att) return null;

  const urutan = await urutanSubtesPaket(att.package_id);
  const total = urutan.length;

  if (att.status !== "ongoing") return keadaanSelesai(att, total);
  if (total === 0) return keadaanSelesai(att, 0);

  await tutupSubtesKedaluwarsa(attemptId);

  const rows = await all<AttemptSubtesRow>(
    "SELECT * FROM attempt_subtes WHERE attempt_id = ?",
    attemptId,
  );
  const peta = new Map(rows.map((r) => [r.subtes, r]));

  for (let i = 0; i < urutan.length; i++) {
    const kode = urutan[i];
    const row = peta.get(kode);
    if (row && row.selesai_at) continue;

    if (!row) {
      if (!mulaiOtomatis) {
        return {
          attemptId: att.id,
          packageId: att.package_id,
          selesai: false,
          subtes: kode,
          namaSubtes: namaSubtes(kode),
          urutanKe: i + 1,
          totalSubtes: total,
          sisaDetik: 0,
          sudahMulai: false,
        };
      }
      await mulaiSubtes(attemptId, kode);
    }

    if (att.subtes_aktif !== kode) {
      await run("UPDATE attempts SET subtes_aktif = ? WHERE id = ?", kode, attemptId);
    }

    return {
      attemptId: att.id,
      packageId: att.package_id,
      selesai: false,
      subtes: kode,
      namaSubtes: namaSubtes(kode),
      urutanKe: i + 1,
      totalSubtes: total,
      sisaDetik: await sisaDetik(attemptId, kode),
      sudahMulai: true,
    };
  }

  // Tidak ada subtes tersisa -> ujian tuntas.
  await selesaikanUjian(attemptId);
  const setelah = await getAttempt(attemptId) ?? att;
  return keadaanSelesai(setelah, total);
}

/** Progres per subtes untuk halaman persiapan. */
/**
 * Jumlah soal yang benar-benar terpasang pada satu paket.
 *
 * Dipakai sebagai SATU-SATUNYA ukuran “paket ini siap dikerjakan”. Jangan
 * memakai panjang `rincianSubtesPaket()` untuk itu: daftar subtesnya sengaja
 * jatuh ke urutan resmi ketika paket masih kosong, supaya peserta tetap
 * melihat rencana isinya — panjangnya tujuh baik paketnya berisi maupun tidak.
 */
export async function jumlahSoalPaket(packageId: number): Promise<number> {
  const row = await one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM questions WHERE package_id = ?",
    packageId,
  );
  return row?.n ?? 0;
}

export async function rincianSubtesPaket(packageId: number, attemptId?: number): Promise<RincianSubtes[]> {
  const jumlahSkd = await all<{ subtes: string; n: number }>(
    "SELECT subtes, COUNT(*) AS n FROM questions WHERE package_id = ? GROUP BY subtes",
    packageId,
  );

  // SKD: tiga subtes ditampilkan sebagai rincian isi, tetapi waktunya satu
  // sesi utuh — kolom durasi diisi 0 kecuali baris pertama.
  if (await jalurPaket(packageId) === "skd") {
    const peta = new Map(jumlahSkd.map((r) => [r.subtes, r.n]));
    const sudah = attemptId
      ? (await all<{ subtes: string }>(
          "SELECT subtes FROM attempt_subtes WHERE attempt_id = ? AND selesai_at IS NOT NULL",
          attemptId,
        )).length > 0
      : false;
    return SUBTES_SKD.map((meta, i) => ({
      kode: meta.kode as unknown as SubtesKode,
      nama: meta.nama,
      // Yang dihitung adalah soal yang BENAR-BENAR terpasang. Dulu di sini
      // ada `?? meta.jumlahSoal`, dan itu membuat paket kosong tampil
      // seolah sudah berisi — peserta membaca “110 soal” lalu menekan mulai
      // pada paket yang tidak punya satu butir pun.
      jumlahSoal: peta.get(meta.kode) ?? 0,
      durasiMenit: i === 0 ? TOTAL_MENIT_SKD : 0,
      kelompok: "TPS" as const,
      selesai: sudah,
    }));
  }

  const urutan = await urutanSubtesPaket(packageId);
  const dipakai = urutan.length > 0 ? urutan : URUTAN_SUBTES;

  const selesaiSet = new Set<string>();
  if (attemptId) {
    const rows = await all<{ subtes: string }>(
      "SELECT subtes FROM attempt_subtes WHERE attempt_id = ? AND selesai_at IS NOT NULL",
      attemptId,
    );
    for (const r of rows) selesaiSet.add(r.subtes);
  }

  const jumlah = await all<{ subtes: string; n: number }>(
    "SELECT subtes, COUNT(*) AS n FROM questions WHERE package_id = ? GROUP BY subtes",
    packageId,
  );
  const petaJumlah = new Map(jumlah.map((r) => [r.subtes, r.n]));

  return dipakai.map((kode) => {
    const meta = getSubtes(kode)!;
    return {
      kode: kode as SubtesKode,
      nama: meta.nama,
      // Sama seperti pada jalur SKD: nol berarti nol, bukan angka resmi.
      jumlahSoal: petaJumlah.get(kode) ?? 0,
      durasiMenit: meta.durasiMenit,
      kelompok: meta.kelompok,
      selesai: selesaiSet.has(kode),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Soal & jawaban                                                       */
/* ------------------------------------------------------------------ */

interface SoalRow {
  id: number;
  subtes: string;
  nomor: number;
  tipe: string;
  stimulus: string | null;
  pertanyaan: string;
  gambar_url: string | null;
  opsi: string;
  jawaban: string | null;
  ragu: number | null;
}

function parseOpsi(raw: string): string[] {
  try {
    const p: unknown = JSON.parse(raw);
    return Array.isArray(p) ? p.map((v) => String(v)) : [];
  } catch {
    return [];
  }
}

function tipeSoal(v: string): TipeSoal {
  return v === "PGK" || v === "BS" || v === "IS" ? v : "PG";
}

/** PRNG deterministik supaya urutan acak tetap sama setiap kali halaman dimuat. */
function acakDeterministik<T>(arr: T[], benih: number): T[] {
  let s = benih >>> 0 || 1;
  const rnd = () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Soal satu subtes + jawaban yang sudah tersimpan untuk attempt ini. */
export async function soalSubtes(attemptId: number, packageId: number, subtes: string): Promise<SoalUjian[]> {
  // Satu sesi SKD memuat seluruh butir paket, diurutkan TWK -> TIU -> TKP.
  const sesiPenuh = subtes === SESI_SKD;

  const rows = sesiPenuh
    ? await all<SoalRow>(
        `SELECT q.id, q.subtes, q.nomor, q.tipe, q.stimulus, q.pertanyaan, q.gambar_url, q.opsi,
                a.jawaban, a.ragu
           FROM questions q
           LEFT JOIN answers a ON a.question_id = q.id AND a.attempt_id = ?
          WHERE q.package_id = ?
          ORDER BY CASE q.subtes WHEN 'TWK' THEN 1 WHEN 'TIU' THEN 2 WHEN 'TKP' THEN 3 ELSE 4 END,
                   q.nomor ASC, q.id ASC`,
        attemptId,
        packageId,
      )
    : await all<SoalRow>(
        `SELECT q.id, q.subtes, q.nomor, q.tipe, q.stimulus, q.pertanyaan, q.gambar_url, q.opsi,
                a.jawaban, a.ragu
           FROM questions q
           LEFT JOIN answers a ON a.question_id = q.id AND a.attempt_id = ?
          WHERE q.package_id = ? AND q.subtes = ?
          ORDER BY q.nomor ASC, q.id ASC`,
        attemptId,
        packageId,
        subtes,
      );

  const paket = await getPaket(packageId);
  const urut = paket?.acak_soal ? acakDeterministik(rows, attemptId * 7919 + subtes.length) : rows;

  return urut.map((r, i) => ({
    id: r.id,
    subtes: r.subtes,
    nomor: i + 1,
    tipe: tipeSoal(r.tipe),
    stimulus: r.stimulus && r.stimulus.trim() !== "" ? r.stimulus : null,
    pertanyaan: r.pertanyaan,
    gambar_url: r.gambar_url && r.gambar_url.trim() !== "" ? r.gambar_url : null,
    opsi: parseOpsi(r.opsi),
    jawaban: r.jawaban ?? null,
    ragu: Number(r.ragu ?? 0) === 1,
  }));
}

/**
 * Soal satu subtes untuk PRATINJAU admin — tanpa attempt, tanpa jawaban.
 *
 * `attemptId` 0 tidak pernah cocok dengan baris `answers` mana pun (kolomnya
 * AUTOINCREMENT mulai dari 1), jadi seluruh butir keluar dengan `jawaban: null`
 * dan `ragu: false`. Sengaja memakai `soalSubtes()` yang sama persis dengan
 * ruang ujian sungguhan — termasuk penomoran ulang 1..N dan pengacakan bila
 * paketnya `acak_soal` — supaya yang dilihat admin memang yang dilihat peserta,
 * bukan tiruannya.
 */
export async function soalPratinjau(packageId: number, subtes: string): Promise<SoalUjian[]> {
  return await soalSubtes(0, packageId, subtes);
}

/** Simpan/perbarui satu jawaban (upsert). */
export async function simpanJawaban(
  attemptId: number,
  questionId: number,
  jawaban: string | null,
  ragu: boolean,
): Promise<void> {
  await answerRepo.simpanSatu(attemptId, questionId, jawaban, ragu);
}

/**
 * Boleh menjawab butir ini? Butir harus milik paket attempt, berada di subtes
 * yang sedang aktif, dan waktunya belum habis.
 */
export interface ItemSimpan {
  questionId: number;
  jawaban: string | null;
  ragu: boolean;
}

export interface HasilSimpanBanyak {
  tersimpan: number;
  /** Butir yang ditolak karena timernya sudah tutup atau bukan milik paket ini. */
  ditolak: number[];
}

/**
 * Menyimpan SEKUMPULAN jawaban dengan jumlah query yang TETAP — tiga, berapa
 * pun banyak butirnya.
 *
 * Menggantikan perulangan `bolehMenjawab()` + `simpanJawaban()` per butir, yang
 * membayar empat query untuk setiap butir DAN mengerjakannya berurutan:
 * kiriman 160 butir di akhir ujian berarti 643 query yang saling menunggu.
 * Pada hari-H, kiriman terbesar justru datang dari semua peserta pada saat
 * yang hampir bersamaan — detik-detik terakhir subtes.
 *
 * ATURAN PENERIMAANNYA SAMA PERSIS dengan `bolehMenjawab()`, dan harus tetap
 * begitu:
 *
 *   · butirnya memang milik paket yang sedang dikerjakan;
 *   · sesi/subtes butir itu sudah dibuka dan BELUM ditutup;
 *   · timernya masih bersisa (> 0 detik).
 *
 * Yang berubah hanya cara membuktikannya: satu query untuk seluruh butir, satu
 * query untuk seluruh baris subtes attempt ini (paling banyak delapan baris),
 * lalu satu upsert untuk semuanya sekaligus.
 */
export async function simpanJawabanBanyak(
  att: AttemptRow,
  items: ItemSimpan[],
): Promise<HasilSimpanBanyak> {
  return await answerService.simpanBanyak(att, items);
}

export async function bolehMenjawab(att: AttemptRow, questionId: number): Promise<boolean> {
  if (att.status !== "ongoing") return false;
  const q = await one<{ subtes: string }>(
    "SELECT subtes FROM questions WHERE id = ? AND package_id = ?",
    questionId,
    att.package_id,
  );
  if (!q) return false;

  // Pada SKD seluruh butir bernaung di bawah satu sesi, jadi timer yang
  // diperiksa adalah timer sesi itu — bukan timer per subtes.
  const sesi = await jalurPaket(att.package_id) === "skd" ? SESI_SKD : q.subtes;
  const row = await barisSubtes(att.id, sesi);
  if (!row || row.selesai_at) return false;
  return await sisaDetik(att.id, sesi) > 0;
}

/** Berapa butir di subtes ini yang masih kosong. */
export async function jumlahKosong(attemptId: number, packageId: number, subtes: string): Promise<number> {
  const kosong = `(a.jawaban IS NULL OR TRIM(a.jawaban) = '' OR a.jawaban = '[]')`;

  if (subtes === SESI_SKD) {
    return (
      (await one<{ n: number }>(
        `SELECT COUNT(*) AS n
           FROM questions q
           LEFT JOIN answers a ON a.question_id = q.id AND a.attempt_id = ?
          WHERE q.package_id = ? AND ${kosong}`,
        attemptId,
        packageId,
      ))?.n ?? 0
    );
  }

  const r = await one<{ n: number }>(
    `SELECT COUNT(*) AS n
       FROM questions q
       LEFT JOIN answers a ON a.question_id = q.id AND a.attempt_id = ?
      WHERE q.package_id = ? AND q.subtes = ? AND ${kosong}`,
    attemptId,
    packageId,
    subtes,
  );
  return r?.n ?? 0;
}
