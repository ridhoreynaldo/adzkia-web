import { one, run } from "@/lib/core/db";

/**
 * Mesin "satu akun = satu perangkat, satu peramban".
 *
 * Dipakai DUA kali dengan aturan yang sama persis tetapi tabel yang berbeda:
 *
 *   - `admin_sesi`   pengelola (sejak 4 September 2026) — lihat `sesi-admin.ts`
 *   - `peserta_sesi` peserta ujian (sejak 8 September 2026) — `sesi-peserta.ts`
 *
 * Cara kerjanya: setiap login yang berhasil menitipkan satu baris berisi `sid`
 * acak, dan `sid` yang sama ikut ditandatangani ke dalam JWT cookie. Selama
 * baris itu masih hidup, login KEDUA dengan akun yang sama DITOLAK — bukan
 * menendang perangkat pertama, karena perangkat pertama bisa saja sedang
 * mengerjakan soal.
 *
 * Dua tabel, bukan satu, supaya kunci pengelola dan kunci peserta bisa punya
 * jeda menganggur sendiri-sendiri (panel admin dibuka berjam-jam tanpa denyut;
 * ruang ujian berdenyut tiap lima detik) dan supaya melepas paksa kunci seluruh
 * peserta pada hari-H tidak pernah bisa ikut menendang pengelolanya.
 *
 * Berkas ini sengaja HANYA bergantung pada database — tanpa `next/headers`
 * maupun `server-only` — supaya logikanya bisa diuji `npm run cek:admin` dan
 * `npm run cek:sesi`.
 */

export type TabelSesi = "admin_sesi" | "peserta_sesi";

/**
 * Nama tabel ikut disusun ke dalam SQL, jadi ia TIDAK BOLEH datang dari mana
 * pun selain daftar ini. Bukan kekhawatiran teoretis: satu pemanggil baru yang
 * meneruskan nama tabel dari luar sudah cukup untuk membuka jalan suntikan SQL
 * yang tidak bisa ditutup parameter berikat.
 */
const TABEL_SAH: readonly TabelSesi[] = ["admin_sesi", "peserta_sesi"];

function tabel(nama: TabelSesi): TabelSesi {
  if (!TABEL_SAH.includes(nama)) throw new Error(`Tabel sesi tidak dikenal: ${nama}`);
  return nama;
}

/**
 * Jarak minimal antar penulisan `terakhir_at`. `getSession()` dipanggil
 * berkali-kali dalam satu permintaan (layout, halaman, komponen), dan tanpa
 * ambang ini setiap pemuatan halaman menulis ke database beberapa kali tanpa
 * guna. Ruang ujian yang berdenyut tiap lima detik membuatnya lebih penting
 * lagi: tanpa ambang, satu peserta saja menulis 12 baris per menit.
 */
export const JEDA_SENTUH_DETIK = 30;

export interface SesiPerangkat {
  user_id: number;
  sid: string;
  alat: string | null;
  masuk_at: string;
  terakhir_at: string;
}

/** Sesi apa adanya untuk panel pengawas, plus lama diamnya dalam detik. */
export interface SesiTercatat extends SesiPerangkat {
  diam_detik: number;
}

/**
 * Sesi yang masih dianggap hidup untuk akun ini, atau undefined bila tidak ada
 * sesi sama sekali / sesinya sudah menganggur melewati batas.
 *
 * Perbandingan waktunya dikerjakan SQLite, bukan JavaScript: seluruh kolom
 * waktu di tabel ini ditulis dengan `datetime('now')` yang berzona UTC,
 * sehingga membandingkannya dengan `Date.now()` milik server yang berzona
 * WIB akan meleset tujuh jam.
 */
export async function sesiAktif(
  nama: TabelSesi,
  userId: number,
  jedaMenganggurMenit: number,
): Promise<SesiPerangkat | undefined> {
  return await one<SesiPerangkat>(
    `SELECT * FROM ${tabel(nama)}
      WHERE user_id = ?
        AND terakhir_at > datetime('now', ?)`,
    userId,
    `-${jedaMenganggurMenit} minutes`,
  );
}

/**
 * Baris sesi apa adanya, SEGAR ATAU TIDAK.
 *
 * Dipakai panel pengawas: yang perlu dibaca di sana bukan "boleh masuk atau
 * tidak", melainkan perangkat apa yang terakhir memegang akun ini dan kapan —
 * termasuk ketika sesinya sudah lewat jeda menganggur dan sebenarnya sudah
 * bebas. Jangan memakai ini untuk memutuskan penolakan login; itu tugas
 * {@link sesiAktif}.
 */
export async function sesiTercatat(nama: TabelSesi, userId: number): Promise<SesiTercatat | undefined> {
  // `diam_detik` dihitung SQLite, bukan JavaScript: kolom waktunya ditulis
  // `datetime('now')` yang berzona UTC sedangkan server berzona WIB, jadi
  // mengurangkannya di JavaScript akan meleset tujuh jam — dan panel pengawas
  // akan mengaku setiap sesi baru saja menganggur tujuh jam.
  return await one<SesiTercatat>(
    `SELECT *, CAST((julianday('now') - julianday(terakhir_at)) * 86400 AS INTEGER) AS diam_detik
       FROM ${tabel(nama)} WHERE user_id = ?`,
    userId,
  );
}

/**
 * Mendaftarkan perangkat yang baru masuk. Memanggil ini berarti perangkat lama
 * (bila ada, dan sudah menganggur) kehilangan sesinya — `sid` lamanya tidak
 * akan cocok lagi pada permintaan berikutnya.
 *
 * Penolakan login kedua BUKAN tugas fungsi ini; itu diputuskan pemanggilnya
 * lewat `sesiAktif` lebih dulu.
 */
export async function klaimSesi(
  nama: TabelSesi,
  userId: number,
  sid: string,
  alat: string | null,
): Promise<void> {
  await run(
    `INSERT INTO ${tabel(nama)} (user_id, sid, alat, masuk_at, terakhir_at)
     VALUES (?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       sid         = excluded.sid,
       alat        = excluded.alat,
       masuk_at    = excluded.masuk_at,
       terakhir_at = excluded.terakhir_at`,
    userId,
    sid,
    alat,
  );
}

/**
 * Menyegarkan penanda aktivitas, sekaligus menjawab pertanyaan "apakah cookie
 * ini masih perangkat yang sah?".
 *
 * false berarti sesi sudah bukan miliknya lagi — entah karena diambil alih
 * perangkat lain sesudah menganggur, karena penggunanya menekan Keluar, karena
 * pengawas melepasnya dari panel admin, atau karena cookie-nya terbitan lama
 * yang belum mengenal `sid`. Pemanggil harus memperlakukan itu sebagai TIDAK
 * LOGIN.
 */
export async function sentuhSesi(nama: TabelSesi, userId: number, sid: string | null): Promise<boolean> {
  if (!sid) return false;
  const t = tabel(nama);
  const baris = await one<{ sid: string; segar: number }>(
    `SELECT sid, (terakhir_at > datetime('now', ?)) AS segar
       FROM ${t} WHERE user_id = ?`,
    `-${JEDA_SENTUH_DETIK} seconds`,
    userId,
  );
  if (!baris || baris.sid !== sid) return false;
  if (!baris.segar) {
    await run(`UPDATE ${t} SET terakhir_at = datetime('now') WHERE user_id = ? AND sid = ?`, userId, sid);
  }
  return true;
}

/**
 * Melepas sesi supaya perangkat lain boleh masuk. Dipanggil saat Keluar, dan
 * saat pengawas melepaskannya dari panel admin.
 *
 * `sid` diikutkan agar perangkat yang cookie-nya sudah basi tidak bisa
 * melepaskan sesi perangkat yang sedang sah bekerja. `null` berarti pelepasan
 * PAKSA oleh pengelola — di situ memang tidak ada cookie yang bisa dicocokkan.
 */
export async function lepasSesi(nama: TabelSesi, userId: number, sid: string | null): Promise<void> {
  const t = tabel(nama);
  if (sid) await run(`DELETE FROM ${t} WHERE user_id = ? AND sid = ?`, userId, sid);
  else await run(`DELETE FROM ${t} WHERE user_id = ?`, userId);
}

/**
 * Merangkum User-Agent menjadi label pendek yang enak dibaca pengelola —
 * "iPhone", "Windows · Chrome". Bukan sidik jari perangkat, hanya penunjuk
 * kasar supaya pengawas tahu perangkat mana yang sedang memegang akun itu.
 */
export function labelAlat(userAgent: string | null | undefined): string | null {
  const ua = (userAgent ?? "").trim();
  if (!ua) return null;

  const sistem =
    /iPhone/i.test(ua) ? "iPhone"
    : /iPad/i.test(ua) ? "iPad"
    : /Android/i.test(ua) ? "Android"
    : /Windows/i.test(ua) ? "Windows"
    : /Macintosh|Mac OS/i.test(ua) ? "Mac"
    : /Linux/i.test(ua) ? "Linux"
    : null;

  // Urutannya penting: Edge, Opera, dan Brave sama-sama menyebut "Chrome" di
  // User-Agent-nya, dan Chrome menyebut "Safari". Yang paling khas harus
  // diperiksa lebih dulu. Brave sengaja tidak dicari: peramban itu memang
  // menyamar sebagai Chrome demi privasi dan tidak menyisakan penanda apa pun.
  const peramban =
    /Edg\//i.test(ua) ? "Edge"
    : /OPR\/|Opera/i.test(ua) ? "Opera"
    : /Chrome\//i.test(ua) ? "Chrome"
    : /Firefox\//i.test(ua) ? "Firefox"
    : /Safari\//i.test(ua) ? "Safari"
    : null;

  const bagian = [sistem, peramban].filter(Boolean);
  return bagian.length ? bagian.join(" · ") : null;
}
