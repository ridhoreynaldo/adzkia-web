import "server-only";

import { kunci, redis } from "@/lib/core/cache";

/**
 * Pembatas laju permintaan, bersandar pada Redis.
 *
 * SATU KESALAHAN YANG HARUS DIHINDARI DI ATAS SEGALANYA: pembatas laju yang
 * salah setel akan MENGGUGURKAN PESERTA YANG SAH. Ruang ujian ini berdenyut
 * tiap lima detik dan menyimpan jawaban tiap kali peserta mengetik; lalu lintas
 * itu memang deras, dan derasnya bukan tanda penyalahgunaan. Karena itu
 * angka-angka di berkas ini dipisah tegas menjadi dua kelompok:
 *
 *   · GERBANG MASUK (login, daftar) — KETAT. Di sinilah tebak-sandi massal
 *     terjadi, dan tidak ada pengguna sah yang perlu mencoba masuk 30 kali
 *     dalam semenit.
 *   · LALU LINTAS UJIAN (denyut, simpan jawaban, sinkron waktu) — LONGGAR,
 *     dan sengaja diberi kelonggaran BERLIPAT di atas laju normalnya. Yang
 *     dijaga di sini bukan "pemakaian berlebih", melainkan satu klien rusak
 *     yang berputar tanpa henti dan menyeret basis data bersamanya.
 *
 * REDIS MATI = SEMUA DIIZINKAN. Ini keputusan sadar, dan arahnya tidak boleh
 * dibalik: cache yang tidak bisa dihubungi tidak boleh menutup pintu ujian.
 * Pembatas laju adalah pagar, bukan kunci — kunci yang sesungguhnya tetap
 * autentikasi dan pemeriksaan kepemilikan attempt di tiap rute.
 *
 * Bentuk jendelanya TETAP (fixed window), bukan geser (sliding). Jendela tetap
 * memperbolehkan ledakan dua kali anggaran di perbatasan dua jendela — dan itu
 * diterima dengan sadar di sini, karena anggarannya memang sudah dilonggarkan
 * jauh di atas laju normal, sedangkan jendela geser menuntut satu perintah
 * Redis lebih berat pada rute TERPANAS aplikasi ini.
 */

export interface Anggaran {
  /** Banyak permintaan yang diizinkan dalam satu jendela. */
  batas: number;
  /** Panjang jendela, dalam detik. */
  jendelaDetik: number;
}

/**
 * Anggaran baku per jenis lalu lintas.
 *
 * Angka ujian diturunkan dari laju SUNGGUHAN yang dihasilkan ruang ujian, lalu
 * dikalikan agar salah-hitung tidak pernah menyentuh peserta yang jujur:
 *
 *   denyut  : 1 tiap 5 detik  =  12/menit  → diberi 60/menit  (5x)
 *   jawaban : ±2/menit saat mengetik cepat → diberi 120/menit (60x)
 *   keadaan : 1 tiap 15 detik =   4/menit  → diberi 60/menit  (15x)
 */
export const ANGGARAN = {
  /** Gerbang masuk: ketat, per akun DAN per alamat. */
  login: { batas: 10, jendelaDetik: 600 },
  daftar: { batas: 5, jendelaDetik: 3600 },
  /** Denyut nadi ruang ujian — rute terpanas. */
  denyut: { batas: 60, jendelaDetik: 60 },
  /** Autosave jawaban. */
  jawaban: { batas: 120, jendelaDetik: 60 },
  /** Sinkron waktu & laporan pelanggaran. */
  keadaan: { batas: 60, jendelaDetik: 60 },
  /** Laporan berat milik pengelola (.xlsx, PDF, hitung ulang). */
  laporan: { batas: 20, jendelaDetik: 60 },
} as const satisfies Record<string, Anggaran>;

export interface HasilLaju {
  /** false = permintaan ini harus ditolak. */
  boleh: boolean;
  /** Sisa jatah pada jendela berjalan; -1 bila pembatas sedang tidak aktif. */
  sisa: number;
  /** Detik sampai jendela berikutnya; dipakai untuk header Retry-After. */
  ulangDetik: number;
}

const LOLOS: HasilLaju = { boleh: true, sisa: -1, ulangDetik: 0 };

/**
 * Menghitung satu permintaan pada sebuah anggaran.
 *
 * `identitas` harus sesuatu yang MELEKAT pada pelakunya — id pengguna, id
 * attempt, atau alamat IP — bukan sesuatu yang bisa diganti pelakunya sendiri
 * dengan bebas.
 */
export async function hitungLaju(
  jenis: keyof typeof ANGGARAN,
  identitas: string | number,
  anggaran: Anggaran = ANGGARAN[jenis],
): Promise<HasilLaju> {
  if (!redis) return LOLOS;

  const jendela = Math.floor(Date.now() / 1000 / anggaran.jendelaDetik);
  const k = kunci("laju", jenis, String(identitas), jendela);

  try {
    // INCR lalu EXPIRE, dikirim sebagai satu pipeline: dua perjalanan pulang
    // pergi menjadi satu. EXPIRE dipasang setiap kali — tidak apa-apa, ia
    // idempoten — supaya kunci yang entah bagaimana kehilangan umurnya tidak
    // pernah menetap selamanya.
    const balasan = await redis
      .multi()
      .incr(k)
      .expire(k, anggaran.jendelaDetik)
      .exec();

    const n = Number(balasan?.[0]?.[1] ?? 0);
    const sisa = Math.max(0, anggaran.batas - n);
    return {
      boleh: n <= anggaran.batas,
      sisa,
      ulangDetik: anggaran.jendelaDetik - (Math.floor(Date.now() / 1000) % anggaran.jendelaDetik),
    };
  } catch {
    // Redis tidak bisa dihubungi. Pintu ujian tidak boleh ikut tertutup.
    return LOLOS;
  }
}

/**
 * Balasan baku 429, lengkap dengan header yang dibaca klien.
 *
 * Pesannya ditulis untuk PESERTA, bukan untuk pengembang: siapa pun yang
 * membacanya di tengah ujian harus tahu bahwa ini bukan pengguguran dan
 * jawabannya tidak hilang.
 */
export function balasanTerlaluSering(hasil: HasilLaju, pesan?: string): Response {
  return Response.json(
    {
      ok: false,
      terlaluSering: true,
      pesan:
        pesan ??
        "Permintaan datang terlalu cepat dari perangkat ini. Tunggu sebentar — " +
          "ujianmu TIDAK digugurkan dan jawaban yang sudah tersimpan tetap aman.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, hasil.ulangDetik)),
        "X-RateLimit-Remaining": String(Math.max(0, hasil.sisa)),
      },
    },
  );
}

/**
 * Alamat pemanggil menurut reverse proxy.
 *
 * `x-forwarded-for` HANYA boleh dipercaya karena aplikasi ini selalu berdiri di
 * belakang nginx milik sendiri, yang menulis ulang header itu. Bila kelak
 * aplikasinya dibuka langsung ke internet tanpa proxy, header ini bisa dikarang
 * siapa saja dan pembatas per-alamat kehilangan artinya — pada saat itu
 * pembatas per-AKUN di bawahnya yang tetap bekerja.
 */
export function alamatPemanggil(h: Headers): string {
  const maju = h.get("x-forwarded-for");
  if (maju) return maju.split(",")[0]!.trim();
  return h.get("x-real-ip")?.trim() || "tak-dikenal";
}
