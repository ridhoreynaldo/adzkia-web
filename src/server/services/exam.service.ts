import "server-only";

import { UMUR, ambil, kunciPaket } from "@/lib/core/cache";
import { run, tx } from "@/lib/core/db";
import * as attemptRepo from "@/server/repositories/attempt.repository";
import type { AttemptRow } from "@/server/repositories/attempt.repository";
import * as answerRepo from "@/server/repositories/answer.repository";
import * as packageRepo from "@/server/repositories/package.repository";
import type { JalurPaket, PaketRow } from "@/server/repositories/package.repository";
import { galat } from "@/server/http/errors";

/**
 * Daur hidup satu sesi ujian: membuka, mengulang lewat jalur susulan, dan
 * menggugurkan.
 *
 * Setiap fungsi di sini menjawab satu pertanyaan yang sama dari sudut berbeda:
 * APA YANG TERJADI KALAU PERMINTAANNYA DATANG DUA KALI? Peserta menekan Mulai
 * dua kali, membuka ujian di dua tab, atau peramban mengulang kiriman sesudah
 * jaringan putus — ketiganya lumrah di hari-H, dan tidak satu pun boleh
 * menghasilkan sesi ganda, timer yang diperpanjang, atau nilai yang tertimpa.
 */

/**
 * Jalur paket, DI-CACHE sepuluh menit.
 *
 * Inilah satu-satunya query yang dipanggil ulang pada rute TERPANAS (denyut
 * nadi, tiap lima detik per peserta) untuk menjawab pertanyaan yang jawabannya
 * TIDAK PERNAH berubah selama paket itu hidup. Dibuang seketika oleh
 * `buangPaket()` begitu paket disunting.
 *
 * Cache mati = query ini berjalan seperti sebelumnya. Tidak ada jalur ujian
 * yang berhenti karena Redis tidak bisa dihubungi.
 */
export async function jalurPaket(packageId: number): Promise<JalurPaket> {
  return await ambil(kunciPaket(packageId, "jalur"), UMUR.paket, () =>
    packageRepo.jalur(packageId),
  );
}

export async function getPaket(packageId: number): Promise<PaketRow | undefined> {
  return await packageRepo.cariById(packageId);
}

export async function getAttempt(attemptId: number): Promise<AttemptRow | undefined> {
  return await attemptRepo.cariById(attemptId);
}

export async function attemptSiswa(
  userId: number,
  packageId: number,
): Promise<AttemptRow | undefined> {
  return await attemptRepo.cariMilikPeserta(userId, packageId);
}

/**
 * Paket boleh dibuka peserta ini sekarang?
 *
 * Tiga syarat berturut-turut: sudah terbit, peserta memang ditetapkan
 * pengelola untuk mengikutinya, dan paketnya berada di dalam jendela waktunya.
 *
 * Pemeriksaan yang paling MURAH didahulukan: status paket sudah ada di tangan
 * (tidak perlu query), gerbang peserta satu query, jendela waktu satu query.
 * Paket yang belum terbit — keadaan sebagian besar paket pada hari biasa —
 * dijawab tanpa menyentuh basis data sama sekali.
 */
export async function paketDapatDikerjakan(paket: PaketRow, userId: number): Promise<boolean> {
  if (paket.status !== "published") return false;
  const { diizinkan } = await packageRepo.izinPeserta(userId, paket.id);
  if (!diizinkan) return false;
  return await packageRepo.dalamJendela(paket.id);
}

/**
 * Membuka sesi ujian — atau memulangkan sesi yang sudah ada.
 *
 * SATU QUERY PADA JALUR YANG LUMRAH, turun dari dua. Kode lama memeriksa dulu
 * dengan SELECT, lalu menyisipkan bila kosong. Selain membayar dua perjalanan,
 * urutan itu MENYISAKAN CELAH di antara keduanya: dua permintaan Mulai yang
 * tiba bersamaan sama-sama membaca "belum ada", dan keduanya menyisipkan.
 * Yang menyelamatkan aplikasi ini selama ini semata-mata kunci
 * `UNIQUE (user_id, package_id)` — yang artinya permintaan kedua GAGAL dengan
 * galat basis data, bukan dilayani dengan benar.
 *
 * Sekarang sisipannya yang duluan, dengan `ON CONFLICT DO NOTHING … RETURNING`:
 * yang menang mendapat barisnya langsung, yang kalah membaca baris pemenang.
 * Tidak ada galat, tidak ada sesi ganda, dan jalur "sudah pernah mulai" — yang
 * jauh lebih sering terjadi — tetap satu query.
 */
export async function mulai(userId: number, packageId: number): Promise<AttemptRow> {
  const att = await attemptRepo.sisipJikaBelumAda(userId, packageId, "utama");
  if (!att) throw galat.bentrok("Gagal membuka sesi ujian. Coba tekan Mulai sekali lagi.");
  return att;
}

/**
 * Membuka (atau melanjutkan) ujian lewat jalur susulan.
 *
 *   · Belum pernah mengerjakan → sesi baru bertanda `susulan`.
 *   · Sedang berlangsung       → dilanjutkan apa adanya.
 *   · Digugurkan               → DISETEL ULANG: jawaban, timer, dan nilai ronde
 *     lama dihapus supaya peserta betul-betul mengulang dari nol.
 *   · Sudah `finished`         → `null`. Nilainya sudah sah dan tidak pernah
 *     disetel ulang.
 *
 * Catatan PELANGGARANNYA sengaja DIPERTAHANKAN, dibedakan lewat nomor ronde.
 * Menghapusnya akan menghilangkan bukti mengapa peserta ini sampai perlu
 * susulan.
 *
 * Penyetelan ulangnya BERADA DI DALAM SATU TRANSAKSI, dan itu bukan formalitas:
 * empat pernyataan di dalamnya harus berhasil bersama-sama. Kalau penghapusan
 * jawaban berhasil tetapi penyetelan status gagal, peserta mendapat sesi yang
 * berstatus gugur dengan jawaban yang sudah lenyap — tidak bisa melanjutkan,
 * tidak bisa mengulang, dan tidak ada jejak yang bisa dipulihkan.
 */
export async function mulaiSusulan(
  userId: number,
  packageId: number,
): Promise<AttemptRow | null> {
  const ada = await attemptRepo.cariMilikPeserta(userId, packageId);

  if (ada?.status === "finished") return null;

  if (!ada) {
    await attemptRepo.sisipJikaBelumAda(userId, packageId, "susulan");
  } else if (ada.status === "gugur") {
    await tx(async () => {
      await answerRepo.hapusMilikSesi(ada.id);
      await hapusNilaiSesi(ada.id);
      await attemptRepo.hapusSemuaSubtes(ada.id);
      await attemptRepo.setelUlangUntukSusulan(ada.id);
    });
  } else {
    await attemptRepo.tandaiJalurSusulan(ada.id);
  }

  await tandaiIzinSusulanDipakai(userId, packageId);
  return (await attemptRepo.cariMilikPeserta(userId, packageId)) ?? null;
}

/**
 * Menggugurkan ujian karena pelanggaran.
 *
 * Ujian langsung dikunci: semua timer subtes ditutup, status menjadi `gugur`,
 * dan skor TIDAK dihitung. Jawaban serta catatan pelanggaran tetap disimpan
 * sebagai bukti.
 *
 * IDEMPOTEN, dan cara memastikannya penting. Syarat `status = 'ongoing'` ada di
 * dalam WHERE pernyataan UPDATE, bukan di percabangan JavaScript sebelumnya.
 * Denyut nadi dan laporan pelanggaran berjalan sendiri-sendiri dan bisa
 * menyimpulkan "peserta ini harus digugurkan" pada saat yang hampir bersamaan;
 * hanya satu di antaranya yang boleh menulis alasan gugur, dan yang kalah harus
 * memulangkan `false` supaya pemanggilnya tidak mengirim notifikasi kedua.
 *
 * Keduanya berada di dalam satu transaksi supaya tidak pernah ada sesi yang
 * berstatus `gugur` sementara salah satu timernya masih menerima jawaban.
 */
export async function gugurkan(attemptId: number, alasan: string): Promise<boolean> {
  return await tx(async () => {
    const berubah = await attemptRepo.gugurkan(attemptId, alasan);
    if (!berubah) return false;
    await attemptRepo.tutupSemuaSubtes(attemptId);
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Pembantu yang belum punya repositori sendiri                          */
/* ------------------------------------------------------------------ */

/**
 * Dua tulisan di bawah masih lewat `src/lib/db.ts`, bukan Drizzle.
 *
 * SENGAJA. `results` dan `susulan` belum dipetakan ke skema Drizzle karena
 * pemakaian utamanya ada di penilaian dan panel pengelola — di luar jalur ujian
 * yang sedang dipindahkan. Memindahkannya sekarang berarti menyeret penilaian
 * IRT dan setengah panel admin ke dalam perubahan ini tanpa satu pun manfaat
 * hari ini. Keduanya tetap berjalan di dalam transaksi yang sama: `tx()`
 * menaruh kliennya di AsyncLocalStorage dan `db()` ikut memakainya.
 */
async function hapusNilaiSesi(attemptId: number): Promise<void> {
  await run("DELETE FROM results WHERE attempt_id = ?", attemptId);
}

async function tandaiIzinSusulanDipakai(userId: number, packageId: number): Promise<void> {
  await run(
    `UPDATE susulan SET dipakai_at = now()
      WHERE user_id = ? AND package_id = ? AND dipakai_at IS NULL`,
    userId,
    packageId,
  );
}
