import "server-only";

import Redis from "ioredis";

/**
 * Cache Redis ADZKIA SMART.
 *
 * Dipakai MURNI sebagai cache, dan itu keputusan yang menentukan seluruh
 * bentuk berkas ini: apa pun isinya boleh hilang kapan saja tanpa satu pun
 * data sekolah ikut hilang, karena seluruh kebenaran tinggal di PostgreSQL.
 *
 * Dua akibat langsungnya:
 *
 *   1. REDIS MATI BUKAN GALAT. Setiap kegagalan — sambungan putus, waktu
 *      habis, isi rusak — dijawab dengan membaca langsung ke basis data.
 *      Ujian yang sedang berjalan tidak boleh berhenti hanya karena cache
 *      tidak bisa dihubungi.
 *   2. TIDAK ADA YANG DISIMPAN DI SINI SAJA. Sesi login, jawaban peserta, dan
 *      timer TIDAK boleh pindah ke Redis tanpa meninjau ulang seluruh berkas
 *      ini beserta `redis.conf` — di sana persistensi memang dimatikan.
 *
 * Mengosongkan REDIS_URL mematikan cache sepenuhnya: aplikasi tetap berjalan,
 * hanya membaca ke basis data setiap kali. Itu jalan keluar yang sah kalau
 * kelak cache-nya dicurigai menyajikan data basi.
 */

/* ==========================================================================
   AWALAN KUNCI
   ========================================================================== */

/**
 * Awalan seluruh kunci, berikut nomor versinya.
 *
 * NAIKKAN nomornya setiap kali BENTUK data yang di-cache berubah — misalnya
 * saat sebuah kolom ditambahkan ke daftar prodi. Menaikkannya membuat seluruh
 * entri lama tak terjangkau sekaligus, tanpa perlu menghapusnya satu per satu,
 * dan entri lama itu akan dibuang sendiri oleh kebijakan `allkeys-lru`.
 */
const AWALAN = "adzkia:v1";

/** Lama simpan bawaan tiap jenis data, dalam detik. */
export const UMUR = {
  /** Daftar prodi & kampus: 5.173 baris yang berubah beberapa kali setahun. */
  rujukan: 60 * 60 * 6,
  /** Ringkasan paket, daftar subtes: berubah saat pengelola menyunting. */
  paket: 60 * 10,
  /** Papan skor live: berubah terus, tetapi tidak perlu detik-per-detik. */
  papan: 15,
  /** Hasil yang sudah final dan tidak akan berubah lagi. */
  hasil: 60 * 60,
  /**
   * Sesi login yang sudah dibuktikan.
   *
   * SATU MENIT, dan angka itu dipilih dengan hati-hati — bukan demi kecepatan,
   * melainkan demi batas atas kesalahan. Sepanjang satu menit ini sebuah sesi
   * yang sudah dicabut MASIH bisa lolos, jadi:
   *
   *   · pencabutan yang penting — tombol Keluar, tombol "Lepaskan" milik
   *     pengawas, dan login dari perangkat lain — WAJIB memanggil
   *     {@link buangSesi} supaya berlakunya seketika, tidak menunggu semenit;
   *   · satu menit tetap jauh di bawah `JEDA_MENGANGGUR_MENIT` (10 menit),
   *     sehingga penanda hidup `terakhir_at` yang ikut tersegarkan setiap
   *     entri ini kedaluwarsa tidak pernah terlambat.
   *
   * Yang dihematnya: DUA query basis data pada SETIAP permintaan terautentikasi
   * — termasuk denyut lima detik. Pada 10.000 peserta itu 6.000 query per detik.
   */
  sesi: 60,
} as const;

export function kunci(...bagian: (string | number)[]): string {
  return [AWALAN, ...bagian].join(":");
}

/* ==========================================================================
   SAMBUNGAN
   ========================================================================== */

const ALAMAT = process.env.REDIS_URL?.trim();

/** true bila cache memang dipasang. */
export const cacheAktif = Boolean(ALAMAT);

function buatKlien(): Redis | null {
  if (!ALAMAT) return null;

  const klien = new Redis(ALAMAT, {
    // Satu percobaan ulang, lalu menyerah. Cache yang lambat lebih buruk
    // daripada cache yang tidak ada: permintaannya menahan halaman ujian.
    maxRetriesPerRequest: 1,
    connectTimeout: 2_000,
    commandTimeout: 1_000,
    // Menyambung saat perintah pertama datang, bukan saat modul dimuat, supaya
    // `next build` tidak menuntut Redis hidup.
    lazyConnect: true,
    // WAJIB true selama lazyConnect menyala. Dengan false, perintah PERTAMA
    // ditolak seketika karena sambungannya memang belum sempat terbentuk —
    // gejalanya menyesatkan: cache seolah bekerja, tetapi tidak pernah ada
    // yang tersimpan, dan tiap permintaan tetap memukul basis data.
    // Redis yang sungguh-sungguh mati tetap gagal cepat, dijaga
    // maxRetriesPerRequest dan commandTimeout di atas.
    enableOfflineQueue: true,
    retryStrategy: (kali) => (kali > 3 ? null : Math.min(kali * 200, 1_000)),
  });

  // Galat sambungan HANYA dicatat. Melemparnya akan menjatuhkan proses Node,
  // dan cache tidak pernah cukup penting untuk itu.
  klien.on("error", (e) => {
    const pesan = e instanceof Error ? e.message : String(e);
    if (pesan !== pesanTerakhir) {
      console.error("[cache] Redis:", pesan);
      pesanTerakhir = pesan;
    }
  });
  klien.on("ready", () => {
    pesanTerakhir = "";
  });

  return klien;
}

// Galat yang sama tidak dicatat berulang-ulang; Redis yang mati bisa
// menghasilkan ribuan baris identik per menit.
let pesanTerakhir = "";

const g = globalThis as unknown as { __adzkiaRedis?: Redis | null };
export const redis: Redis | null =
  g.__adzkiaRedis !== undefined ? g.__adzkiaRedis : (g.__adzkiaRedis = buatKlien());

/* ==========================================================================
   BACA & TULIS
   ========================================================================== */

/**
 * Mengambil dari cache; membuatnya lebih dulu bila belum ada.
 *
 * Inilah satu-satunya cara yang seharusnya dipakai kode di atas. Pola
 * "cek dulu, lalu simpan" ditulis di sini sekali saja supaya tidak ada
 * pemanggil yang lupa memasang umur simpan — entri tanpa umur akan menetap
 * sampai memori penuh.
 *
 * `buat` selalu dijalankan kalau cache tidak menjawab, apa pun sebabnya.
 */
export async function ambil<T>(
  kunciEntri: string,
  umurDetik: number,
  buat: () => Promise<T>,
): Promise<T> {
  if (!redis) return await buat();

  try {
    const tersimpan = await redis.get(kunciEntri);
    if (tersimpan !== null) return JSON.parse(tersimpan) as T;
  } catch {
    // Gagal membaca cache bukan alasan gagal melayani permintaan.
  }

  const nilai = await buat();

  try {
    // `undefined` tidak punya bentuk JSON; menyimpannya menghasilkan entri
    // rusak yang gagal diurai selamanya sampai umurnya habis.
    if (nilai !== undefined) {
      await redis.set(kunciEntri, JSON.stringify(nilai), "EX", umurDetik);
    }
  } catch {
    // Gagal menyimpan hanya berarti permintaan berikutnya menghitung ulang.
  }

  return nilai;
}

/** Membuang satu atau beberapa kunci. Dipanggil sesudah data aslinya berubah. */
export async function buang(...kunciEntri: string[]): Promise<void> {
  if (!redis || kunciEntri.length === 0) return;
  try {
    await redis.del(...kunciEntri);
  } catch {
    /* entri basi akan gugur sendiri saat umurnya habis */
  }
}

/**
 * Membaca satu entri tanpa membuatnya bila kosong.
 *
 * Dipakai jalur yang pada saat gagal-cache mengerjakan sesuatu yang LEBIH dari
 * sekadar menghitung ulang nilainya — misalnya pembuktian sesi, yang sekalian
 * menyegarkan penanda hidup di basis data. Untuk cache biasa pakailah
 * {@link ambil}, yang tidak bisa lupa memasang umur simpan.
 */
export async function baca<T>(kunciEntri: string): Promise<T | undefined> {
  if (!redis) return undefined;
  try {
    const tersimpan = await redis.get(kunciEntri);
    return tersimpan === null ? undefined : (JSON.parse(tersimpan) as T);
  } catch {
    return undefined;
  }
}

/** Pasangan {@link baca}. Kegagalan diabaikan: cache bukan sumber kebenaran. */
export async function tulis<T>(kunciEntri: string, umurDetik: number, nilai: T): Promise<void> {
  if (!redis || nilai === undefined) return;
  try {
    await redis.set(kunciEntri, JSON.stringify(nilai), "EX", umurDetik);
  } catch {
    /* permintaan berikutnya menghitung ulang */
  }
}

/* ==========================================================================
   SESI
   ========================================================================== */

/** Kunci entri sesi milik satu akun. */
export function kunciSesi(userId: number): string {
  return kunci("sesi", userId);
}

/**
 * Membuang entri sesi satu akun SEKETIKA.
 *
 * WAJIB dipanggil di setiap tempat yang mencabut atau memindahkan hak sebuah
 * cookie: tombol Keluar, tombol "Lepaskan" pengawas, login dari perangkat lain,
 * penghapusan akun, dan perubahan peran. Melewatkannya berarti cookie yang
 * sudah dicabut masih diterima sampai {@link UMUR.sesi} detik berikutnya — dan
 * pada hari-H, semenit adalah waktu yang cukup untuk mengerjakan satu subtes
 * dari perangkat yang seharusnya sudah tidak berhak.
 */
export async function buangSesi(userId: number): Promise<void> {
  await buang(kunciSesi(userId));
}

/* ==========================================================================
   PAKET
   ========================================================================== */

/** Kunci entri metadata satu paket. */
export function kunciPaket(packageId: number, bagian: string): string {
  return kunci("paket", packageId, bagian);
}

/**
 * Membuang SELURUH entri milik satu paket.
 *
 * Dipanggil setiap kali paket disunting, diubah statusnya, atau dihapus.
 * Metadata paket berumur sepuluh menit; tanpa pembuangan ini, pengelola yang
 * baru saja menutup sebuah paket masih akan melihatnya terbuka selama itu —
 * dan pada hari-H, sepuluh menit adalah selisih yang besar.
 */
export async function buangPaket(packageId: number): Promise<void> {
  await buangPola(kunci("paket", packageId, "*"));
}

/**
 * Membuang seluruh kunci yang cocok dengan pola, misalnya `paket:12:*`.
 *
 * Memakai SCAN, BUKAN `KEYS`: `KEYS` mengunci Redis selama seluruh ruang kunci
 * ditelusuri, dan pada saat itu setiap permintaan halaman ikut menunggu.
 */
export async function buangPola(pola: string): Promise<number> {
  if (!redis) return 0;
  let dibuang = 0;
  try {
    let kursor = "0";
    do {
      const [kursorBaru, ditemukan] = await redis.scan(kursor, "MATCH", pola, "COUNT", 200);
      kursor = kursorBaru;
      if (ditemukan.length > 0) {
        await redis.del(...ditemukan);
        dibuang += ditemukan.length;
      }
    } while (kursor !== "0");
  } catch {
    /* biarkan; entri basi akan gugur sendiri saat umurnya habis */
  }
  return dibuang;
}

/* ==========================================================================
   KESEHATAN
   ========================================================================== */

export interface KesehatanCache {
  aktif: boolean;
  siap: boolean;
  pesan: string;
  ms: number;
}

export async function sehatCache(): Promise<KesehatanCache> {
  if (!redis) {
    return { aktif: false, siap: true, pesan: "cache dimatikan (REDIS_URL kosong)", ms: 0 };
  }
  const mulai = Date.now();
  try {
    const jawab = await redis.ping();
    return {
      aktif: true,
      siap: jawab === "PONG",
      pesan: jawab === "PONG" ? "Redis menjawab" : `jawaban tak terduga: ${jawab}`,
      ms: Date.now() - mulai,
    };
  } catch (e) {
    // Sengaja `siap: true`: cache yang mati TIDAK membuat aplikasi tidak sehat.
    // Halaman tetap terlayani, hanya lebih lambat.
    return {
      aktif: true,
      siap: true,
      pesan: `Redis tidak menjawab, aplikasi membaca langsung ke basis data (${
        e instanceof Error ? e.message : "sebab tidak diketahui"
      })`,
      ms: Date.now() - mulai,
    };
  }
}
