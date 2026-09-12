import {
  type SesiPerangkat,
  type SesiTercatat,
  klaimSesi,
  lepasSesi,
  sentuhSesi,
  sesiAktif,
  sesiTercatat,
} from "@/lib/auth/sesi-perangkat";

/**
 * SATU AKUN PESERTA = SATU PERANGKAT, SATU PERAMBAN (ditetapkan pengelola
 * 8 September 2026).
 *
 * Aturannya harfiah: "1 akun 1 device, 1 browser. Jika ada yang berusaha masuk
 * ke akun yang bersangkutan — sedang mengerjakan ataupun tidak — maka akses
 * untuk masuk ke device/browser kedua GAGAL, sebelum ia mengeluarkan akunnya
 * dari perangkat pertama."
 *
 * Yang DITOLAK adalah pendatang kedua, bukan pemegang pertama. Menendang
 * perangkat pertama akan menjadi senjata: siapa pun yang tahu NISN dan sandi
 * seorang peserta bisa memutus ujiannya dari jauh, berkali-kali, dan peserta
 * itu tidak punya cara menghentikannya. Menolak pendatang kedua tidak punya
 * akibat seperti itu.
 *
 * "Satu peramban" ikut terjaga tanpa kode tambahan: cookie sesi milik Chrome
 * tidak pernah terbaca Firefox, jadi membuka akun yang sama di peramban kedua
 * — bahkan pada komputer yang sama — berarti login kedua, dan login kedua
 * ditolak.
 *
 * KATUP PENGAMANNYA ADA DUA, dan keduanya wajib:
 *
 *  1. {@link JEDA_MENGANGGUR_MENIT} — sesi yang tidak menunjukkan tanda hidup
 *     selama itu dianggap ditinggalkan dan boleh diambil alih. Tanpa ini,
 *     peserta yang laptopnya mati atau perambannya menutup diri terkunci dari
 *     akunnya sendiri sampai cookie kedaluwarsa (30 hari) — di tengah hari-H.
 *     Sepuluh menit aman karena ruang ujian berdenyut tiap lima detik: selama
 *     halaman ujiannya masih terbuka, sesinya TIDAK PERNAH menganggur, jadi
 *     jendela ini tidak pernah bisa dipakai teman untuk masuk berbarengan.
 *
 *  2. Tombol "Lepaskan" di `/admin/peserta/[id]` — pengawas yang berdiri di
 *     ruangan itu bisa membebaskan akun seketika tanpa menunggu sepuluh menit.
 *     Itulah jalur resmi bila perangkat peserta benar-benar rusak di tengah
 *     ujian.
 *
 * Berkas ini bebas `server-only` supaya bisa diuji `npm run cek:sesi`.
 */

const TABEL = "peserta_sesi" as const;

/**
 * Sepuluh menit, bukan lima belas seperti admin: ruang ujian berdenyut jauh
 * lebih sering daripada panel admin, jadi sesi peserta yang benar-benar hidup
 * tidak mungkin terlihat menganggur, dan peserta yang perangkatnya bermasalah
 * tidak boleh menunggu lebih lama daripada perlu.
 */
export const JEDA_MENGANGGUR_MENIT = 10;

export type SesiPeserta = SesiPerangkat;

/** Sesi yang masih dianggap hidup untuk akun peserta ini, atau undefined. */
export async function sesiPesertaAktif(userId: number): Promise<SesiPeserta | undefined> {
  return await sesiAktif(TABEL, userId, JEDA_MENGANGGUR_MENIT);
}

/**
 * Baris sesi peserta apa adanya — segar atau sudah menganggur. Untuk panel
 * pengawas, yang perlu tahu perangkat apa yang terakhir memegang akun ini.
 */
export async function sesiPesertaTercatat(userId: number): Promise<SesiTercatat | undefined> {
  return await sesiTercatat(TABEL, userId);
}

/**
 * Ringkasan sesi untuk panel pengawas, sudah diterjemahkan menjadi kalimat.
 *
 * "Terkunci" berarti login dari perangkat lain akan DITOLAK sekarang juga;
 * "menganggur" berarti kuncinya sudah lewat masa dan perangkat mana pun boleh
 * masuk tanpa perlu dilepas siapa-siapa.
 */
export async function ringkasSesiPeserta(userId: number): Promise<{
  ada: boolean;
  terkunci: boolean;
  alat: string;
  diamMenit: number;
}> {
  const sesi = await sesiPesertaTercatat(userId);
  if (!sesi) return { ada: false, terkunci: false, alat: "—", diamMenit: 0 };
  const diamMenit = Math.max(0, Math.floor(sesi.diam_detik / 60));
  return {
    ada: true,
    terkunci: diamMenit < JEDA_MENGANGGUR_MENIT,
    alat: sesi.alat ?? "Perangkat tidak dikenali",
    diamMenit,
  };
}

/** Mendaftarkan perangkat peserta yang baru masuk. */
export async function klaimSesiPeserta(userId: number, sid: string, alat: string | null): Promise<void> {
  await klaimSesi(TABEL, userId, sid, alat);
}

/**
 * Menyegarkan aktivitas peserta; false berarti cookie ini bukan perangkat yang
 * sah lagi dan harus diperlakukan sebagai TIDAK LOGIN.
 */
export async function sentuhSesiPeserta(userId: number, sid: string | null): Promise<boolean> {
  return await sentuhSesi(TABEL, userId, sid);
}

/**
 * Melepas sesi peserta. Dipanggil saat Keluar, dan saat pengawas melepasnya
 * paksa dari panel admin (`sid` = null).
 */
export async function lepasSesiPeserta(userId: number, sid: string | null): Promise<void> {
  await lepasSesi(TABEL, userId, sid);
}

/**
 * Bunyi penolakan di halaman login peserta.
 *
 * Ditulis untuk dibaca siswa kelas XII yang sedang panik lima menit sebelum
 * ujian: menyebut perangkat yang sedang memegang akunnya, menyebut jalan
 * keluarnya (tombol Keluar), dan menyebut siapa yang bisa menolong bila
 * perangkat itu sudah tidak bisa disentuh lagi.
 */
export function pesanSesiPesertaDipakai(sesi: SesiPeserta): string {
  const alat = sesi.alat ? ` (${sesi.alat})` : "";
  return (
    `Akun ini sedang dipakai di perangkat atau peramban lain${alat}. ` +
    `Satu akun hanya boleh dipakai di SATU perangkat dan SATU peramban. ` +
    `Buka kembali perangkat pertama lalu tekan tombol Keluar di sana, ` +
    `baru masuk dari sini. Kalau perangkat itu rusak, hilang, atau tidak bisa ` +
    `dibuka lagi, panggil pengawas — pengawas bisa melepaskan akunmu seketika ` +
    `dari panel pengelola.`
  );
}
