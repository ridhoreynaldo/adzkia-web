/**
 * Penyimpan dan pelayan GAMBAR SOAL yang diunggah manual oleh admin.
 *
 * Sebagian butir — grafik PK/PM, diagram TIU, potongan tabel — hanya masuk akal
 * bila gambarnya ikut. Sebelum berkas ini ada, satu-satunya cara memasukkan
 * gambar adalah menempelkan ALAMAT gambar yang sudah terlanjur ada di internet,
 * jadi soal bergambar praktis hanya bisa lahir dari impor naskah Word. Modul ini
 * membuka jalan kedua: admin memilih berkas dari komputernya, gambar disalin ke
 * `public/`, dan alamat hasilnya yang disimpan ke kolom `gambar_url`.
 *
 * DUA AKAR, karena aplikasinya memang punya dua bank soal yang terpisah:
 *
 *     public/soal/<kode-paket>/<sidik-jari>.<ext>      Tryout UTBK-SNBT & SKD
 *     public/warung/<SUBTES>-<nomor>/<sidik-jari>.<ext> Warung Soal
 *
 * Keduanya meneruskan kebiasaan yang sudah dipakai jalur impor naskah masing-
 * masing (`naskah-docx.ts` dan `warung-impor.ts`), termasuk perbedaan kecil
 * yang penting: folder Tryout ditulis huruf kecil, folder Warung MEMPERTAHANKAN
 * huruf besarnya ("PK-1", bukan "pk-1"). Alamat yang sudah tersimpan di basis
 * data memakai bentuk itu, dan di server Linux beda huruf besar-kecil berarti
 * berkasnya tidak ketemu.
 *
 * Nama berkas adalah cap sidik jari isinya, bukan nama asli dari komputer admin.
 * Tiga akibat yang semuanya diinginkan:
 *   1. Gambar yang sama — mis. satu grafik dipakai lima soal berturut-turut —
 *      hanya tersimpan satu kali.
 *   2. Mengunggah ulang berkas yang sama tidak menumpuk sampah.
 *   3. Nama berkas dari komputer admin ("Screenshot (12).png", nama berspasi
 *      atau berhuruf non-latin) tidak pernah ikut masuk ke URL.
 *
 * Yang TIDAK dilakukan modul ini: menghapus berkas lama saat gambar soal
 * diganti. Satu berkas bisa dipakai banyak butir sekaligus, jadi menghapusnya
 * begitu satu butir melepasnya akan mematikan butir lain yang masih memakainya.
 * Berkas yatim jauh lebih murah daripada soal tanpa gambar di tengah ujian.
 */
import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Batas dan daftar format tinggal di berkas murni supaya komponen klien ikut
// memakai angka yang sama; di-ekspor ulang di sini demi satu pintu impor.
export {
  ACCEPT_GAMBAR,
  BATAS_GAMBAR_BYTE,
  BATAS_GAMBAR_MB,
  FORMAT_GAMBAR,
  LABEL_FORMAT_GAMBAR,
} from "@/lib/naskah/gambar-soal-konstanta";

/** Bank soal tempat gambar disimpan. Menentukan folder akarnya di `public/`. */
export type AkarGambar = "soal" | "warung";

/**
 * Akar yang boleh DILAYANI `layaniGambar()`. Lebih luas daripada `AkarGambar`:
 * foto peserta ditulis oleh `foto-peserta.ts`, bukan oleh `simpanGambarSoal()`,
 * tetapi ia menumpang jaring pengaman 404 yang sama persis — `next start`
 * mengindeks `public/` sekali saat dinyalakan, dan foto yang baru diunggah
 * siswa lima menit sebelum ujian jelas tidak ada di indeks itu.
 */
export type AkarLayan = AkarGambar | "peserta";

export interface JenisGambar {
  mime: string;
  ext: string;
}

function awalanCocok(isi: Uint8Array, byte: number[], mulai = 0): boolean {
  if (isi.length < mulai + byte.length) return false;
  return byte.every((b, i) => isi[mulai + i] === b);
}

/**
 * Kenali jenis gambar dari BYTE PERTAMA berkasnya, bukan dari namanya.
 *
 * Nama berkas dan header `Content-Type` sama-sama datang dari peramban dan
 * sama-sama bisa dikarang. Yang tidak bisa dikarang adalah isi berkasnya
 * sendiri, jadi itulah yang dipakai memutuskan — sekaligus menentukan ekstensi
 * yang ditulis ke disk, supaya berkas bernama .png yang sebetulnya JPEG tidak
 * pernah tersimpan dengan ekstensi yang salah.
 *
 * SVG sengaja TIDAK ikut dikenali. Berkasnya teks, dan teks itu boleh memuat
 * <script> yang berjalan pada asal (origin) aplikasi begitu gambarnya dibuka —
 * artinya sebuah "gambar soal" bisa membaca kuki sesi. SVG yang sudah telanjur
 * ada di `public/warung/` tetap DILAYANI (lihat `layaniGambar`), yang ditutup
 * hanya pintu untuk menambah yang baru.
 */
export function kenaliJenisGambar(isi: Uint8Array): JenisGambar | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (awalanCocok(isi, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: "image/png", ext: "png" };
  }
  // JPEG: FF D8 FF
  if (awalanCocok(isi, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  // GIF: "GIF8" (GIF87a maupun GIF89a)
  if (awalanCocok(isi, [0x47, 0x49, 0x46, 0x38])) return { mime: "image/gif", ext: "gif" };
  // WEBP: "RIFF" <4 byte panjang> "WEBP"
  if (
    awalanCocok(isi, [0x52, 0x49, 0x46, 0x46]) &&
    awalanCocok(isi, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

/**
 * Nama folder yang aman dipakai di URL.
 *
 * `kecilkan` membedakan kedua akar, dan bukan selera: folder Tryout dijaga
 * identik dengan `amanNamaFolder()` di naskah-docx.ts (huruf kecil), sedangkan
 * folder Warung harus tetap "PK-1" seperti yang sudah tertulis di kolom
 * `gambar_url` dan sudah ada di disk.
 */
export function amanNamaFolder(v: string, kecilkan = true): string {
  const dasar = kecilkan ? v.toLowerCase() : v;
  const bersih = dasar.replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return bersih || (kecilkan ? "naskah" : "paket");
}

/** Folder relatif terhadap `public/` untuk satu paket, mis. "soal/to-4sep2026". */
export function folderGambar(akar: AkarGambar, namaPaket: string): string {
  return `${akar}/${amanNamaFolder(namaPaket, akar === "soal")}`;
}

export interface HasilSimpanGambar {
  /** Alamat siap pakai untuk kolom `gambar_url`, mis. "/soal/to-4sep2026/ab12….png". */
  url: string;
  ukuran: number;
  mime: string;
}

/**
 * Tulis satu gambar ke `public/<akar>/<paket>/` dan kembalikan alamatnya.
 *
 * Pemanggil WAJIB sudah memastikan ukurannya di bawah `BATAS_GAMBAR_BYTE`.
 */
export async function simpanGambarSoal(
  isi: Uint8Array,
  akar: AkarGambar,
  namaPaket: string,
): Promise<HasilSimpanGambar> {
  const jenis = kenaliJenisGambar(isi);
  if (!jenis) throw new Error("Isi berkas bukan gambar yang dikenali.");

  const sidik = createHash("sha1").update(isi).digest("hex").slice(0, 16);
  const namaFolder = amanNamaFolder(namaPaket, akar === "soal");
  const berkasNama = `${sidik}.${jenis.ext}`;
  const folderRelatif = `${akar}/${namaFolder}`;

  // Kedua jalan disusun dalam SATU `path.join` yang diawali process.cwd() dan
  // segmen harfiah "public". Menyimpan `folder` di variabel lebih dulu membuat
  // Turbopack kehilangan pangkal statisnya, lalu ia menjejaki seluruh proyek
  // ("Dynamic filesystem access causes tracing of the whole project").
  await mkdir(path.join(process.cwd(), "public", akar, namaFolder), { recursive: true });
  await writeFile(path.join(process.cwd(), "public", akar, namaFolder, berkasNama), isi);

  return {
    url: `/${folderRelatif}/${berkasNama}`,
    ukuran: isi.length,
    mime: jenis.mime,
  };
}

/* ==========================================================================
   PELAYAN CADANGAN
   ========================================================================== */

/**
 * Jenis berkas yang boleh DILAYANI. Lebih longgar daripada yang boleh diunggah:
 * `.svg` sudah dipakai gambar Warung bawaan, dan menolaknya di sini berarti
 * mematikan soal yang selama ini baik-baik saja.
 */
const TIPE_LAYAN: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

/** Satu segmen alamat yang aman: tanpa garis miring, tanpa "..", tanpa spasi. */
const SEGMEN_AMAN = /^[A-Za-z0-9._-]+$/;

function tidakAda(): Response {
  return new Response("Gambar tidak ditemukan.", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/**
 * Layani satu berkas gambar dari `public/<akar>/…` langsung dari disk.
 *
 * `next start` mengindeks isi `public/` SATU KALI saat proses dinyalakan.
 * Gambar yang mendarat di sana sesudah itu — hasil impor naskah Word maupun
 * unggahan manual dari editor butir — membalas 404 walaupun berkasnya jelas ada
 * di disk. Gejalanya paling buruk: admin mengunggah gambar, melihat
 * pratinjaunya baik-baik saja (peramban masih memegang berkas yang baru saja ia
 * kirim), lalu peserta menemukan ikon gambar rusak di tengah ujian. Pernah
 * terjadi 2 September 2026 pada dua PNG naskah PM, dan waktu itu satu-satunya
 * obatnya adalah menyalakan ulang server.
 *
 * Fungsi ini menutup celah tersebut tanpa mengubah satu pun alamat yang sudah
 * tersimpan di kolom `gambar_url`. Berkas yang SUDAH terindeks tetap dilayani
 * pelayan statis Next.js seperti biasa — lebih cepat, dan fungsi ini tidak
 * pernah dipanggil. Yang sampai ke sini hanya berkas yang luput dari indeks.
 *
 * Karena berkas dipilih berdasarkan potongan alamat, jalannya dijaga ketat:
 * hanya di bawah akarnya, hanya nama beraksara biasa, hanya ekstensi gambar.
 */
export async function layaniGambar(akar: AkarLayan, segmen: string[]): Promise<Response> {
  if (!Array.isArray(segmen) || segmen.length === 0 || segmen.length > 4) return tidakAda();
  if (segmen.some((s) => !SEGMEN_AMAN.test(s) || s === "." || s === "..")) return tidakAda();

  const ekstensi = (segmen[segmen.length - 1].split(".").pop() ?? "").toLowerCase();
  const tipe = TIPE_LAYAN[ekstensi];
  if (!tipe) return tidakAda();

  const dasar = path.join(process.cwd(), "public", akar);
  const berkas = path.join(process.cwd(), "public", akar, ...segmen);
  // Sabuk pengaman kedua: sesudah normalisasi, berkasnya harus tetap di dalam
  // akarnya. Segmen sudah disaring, jadi ini seharusnya tidak pernah kena.
  if (!berkas.startsWith(dasar + path.sep)) return tidakAda();

  try {
    const isi = await readFile(berkas);
    return new Response(new Uint8Array(isi), {
      headers: {
        "Content-Type": tipe,
        // SVG boleh memuat <script>; berkas lama memang tepercaya, tetapi
        // mematikan skripnya di sini tidak merugikan gambar mana pun.
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        // Nama berkas adalah sidik jari isinya, jadi isinya tidak pernah
        // berubah untuk alamat yang sama — aman disimpan selamanya.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return tidakAda();
  }
}
