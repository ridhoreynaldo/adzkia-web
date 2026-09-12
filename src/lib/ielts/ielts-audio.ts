import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { BATAS_AUDIO_BYTE, BATAS_AUDIO_MB, LABEL_FORMAT_AUDIO } from "@/lib/ielts/ielts-konstanta";

/**
 * Penyimpan dan pelayan REKAMAN LISTENING.
 *
 * Penamaannya meniru `gambar-soal.ts` — nama berkas adalah cap sidik jari
 * isinya, bukan nama asli dari komputer admin — sehingga rekaman yang sama
 * hanya tersimpan sekali, mengunggah ulang tidak menumpuk sampah, dan nama
 * berspasi dari komputer admin tidak pernah ikut masuk ke alamat.
 *
 * TEMPATNYA justru sengaja BERBEDA dari gambar soal:
 *
 *     data/ielts-audio/<kode-paket>/<sidik-jari>.<ext>
 *
 * BUKAN di `public/`, walau alamatnya tetap terbaca "/ielts/…". Sebabnya
 * ditemukan saat rekaman pertama diunggah 9 September 2026: Tailwind memindai
 * seluruh proyek untuk mencari nama kelas, `public/` tidak diabaikan (`data/`
 * diabaikan lewat .gitignore), dan isi berkas WAV yang acak kebetulan terbaca
 * sebagai kelas `bg-[var(--…)]` yang bentuknya rusak. Akibatnya SELURUH CSS
 * aplikasi gagal dibangun — semua halaman berubah jadi layar hitam tanpa gaya,
 * hanya karena admin mengunggah satu rekaman. Menaruhnya di luar `public/`
 * menutup jalan itu untuk berkas suara apa pun, sekarang dan nanti.
 *
 * Karena tidak lagi di `public/`, rekaman SELALU dilayani `layaniAudio()` di
 * bawah — dan itu memang yang dibutuhkan: peramban meminta rekaman panjang
 * sepotong-sepotong lewat header `Range` supaya bisa diputar sambil diunduh,
 * dan fungsi itu menjawabnya dengan 206 Partial Content. Tanpa itu pemutarnya
 * harus menunggu berkas 20 MB utuh sebelum bunyi pertama terdengar — di tengah
 * ujian yang waktunya berjalan.
 */

export interface HasilSimpanAudio {
  url: string;
  ukuran: number;
  mime: string;
  ext: string;
}

interface JenisAudio {
  mime: string;
  ext: string;
}

function cocok(isi: Uint8Array, teks: string, mulai = 0): boolean {
  for (let i = 0; i < teks.length; i++) {
    if (isi[mulai + i] !== teks.charCodeAt(i)) return false;
  }
  return true;
}

/**
 * Mengenali jenis rekaman dari ISI berkasnya, bukan dari namanya.
 *
 * Ekstensi bisa diganti siapa saja; yang menentukan apakah berkas ini benar
 * suara adalah beberapa byte pertamanya.
 */
export function kenaliJenisAudio(isi: Uint8Array): JenisAudio | null {
  if (isi.length < 12) return null;
  // MP3: berlabel ID3, atau langsung bingkai MPEG (0xFF 0xFB / 0xF3 / 0xF2).
  if (cocok(isi, "ID3")) return { mime: "audio/mpeg", ext: "mp3" };
  if (isi[0] === 0xff && (isi[1] & 0xe0) === 0xe0) return { mime: "audio/mpeg", ext: "mp3" };
  // M4A/AAC: kotak "ftyp" pada byte ke-4.
  if (cocok(isi, "ftyp", 4)) return { mime: "audio/mp4", ext: "m4a" };
  if (cocok(isi, "OggS")) return { mime: "audio/ogg", ext: "ogg" };
  if (cocok(isi, "RIFF") && cocok(isi, "WAVE", 8)) return { mime: "audio/wav", ext: "wav" };
  return null;
}

/** Nama folder yang aman dari kode paket. Huruf kecil, seperti folder soal. */
function amanNamaFolder(kode: string): string {
  const rapi = kode
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return rapi || "paket";
}

export async function simpanAudio(isi: Uint8Array, kodePaket: string): Promise<HasilSimpanAudio> {
  if (isi.length === 0) throw new Error("Berkas suara kosong.");
  if (isi.length > BATAS_AUDIO_BYTE) {
    throw new Error(`Berkas suara melebihi ${BATAS_AUDIO_MB} MB.`);
  }
  const jenis = kenaliJenisAudio(isi);
  if (!jenis) throw new Error(`Isi berkas bukan rekaman yang dikenali (${LABEL_FORMAT_AUDIO}).`);

  const sidik = createHash("sha1").update(isi).digest("hex").slice(0, 16);
  const folder = amanNamaFolder(kodePaket);
  const berkas = `${sidik}.${jenis.ext}`;

  // Kedua jalan disusun dalam SATU path.join yang diawali process.cwd() dan
  // segmen harfiah "data" — kalau folder disimpan di variabel lebih dulu,
  // Turbopack kehilangan pangkal statisnya lalu menjejaki seluruh proyek.
  await mkdir(path.join(process.cwd(), "data", "ielts-audio", folder), { recursive: true });
  await writeFile(path.join(process.cwd(), "data", "ielts-audio", folder, berkas), isi);

  return { url: `/ielts/${folder}/${berkas}`, ukuran: isi.length, mime: jenis.mime, ext: jenis.ext };
}

/* ==========================================================================
   PELAYAN REKAMAN
   ========================================================================== */

const TIPE_LAYAN: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  wav: "audio/wav",
};

const SEGMEN_AMAN = /^[A-Za-z0-9._-]+$/;

function tidakAda(): Response {
  return new Response("Rekaman tidak ditemukan.", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/**
 * Melayani satu rekaman dari `data/ielts-audio/…`.
 *
 * Ini SATU-SATUNYA jalan rekaman sampai ke peramban — berkasnya sengaja tidak
 * disimpan di `public/` (lihat penjelasan di atas), jadi tidak ada pelayan
 * statis yang mendahuluinya. Dua akibat baiknya: rekaman yang baru diunggah
 * langsung bisa diputar tanpa menyalakan ulang server (`next start` mengindeks
 * `public/` sekali saat dinyalakan), dan permintaan `Range` dijawab dengan
 * benar sehingga rekaman bisa diputar sambil diunduh.
 */
export async function layaniAudio(segmen: string[], req: Request): Promise<Response> {
  if (!Array.isArray(segmen) || segmen.length === 0 || segmen.length > 4) return tidakAda();
  if (segmen.some((s) => !SEGMEN_AMAN.test(s) || s === "." || s === "..")) return tidakAda();

  const ekstensi = (segmen[segmen.length - 1].split(".").pop() ?? "").toLowerCase();
  const tipe = TIPE_LAYAN[ekstensi];
  if (!tipe) return tidakAda();

  const dasar = path.join(process.cwd(), "data", "ielts-audio");
  const berkas = path.join(process.cwd(), "data", "ielts-audio", ...segmen);
  // Sabuk pengaman kedua: sesudah normalisasi, berkasnya harus tetap di dalam
  // akarnya. Segmen sudah disaring, jadi ini seharusnya tidak pernah kena.
  if (!berkas.startsWith(dasar + path.sep)) return tidakAda();

  let ukuran: number;
  try {
    ukuran = (await stat(berkas)).size;
  } catch {
    return tidakAda();
  }

  const dasarHeader = {
    "Content-Type": tipe,
    "Accept-Ranges": "bytes",
    // Nama berkas adalah sidik jari isinya, jadi isinya tidak pernah berubah
    // untuk alamat yang sama — aman disimpan selamanya.
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  const range = req.headers.get("range");
  const cocokRange = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;

  try {
    const isi = await readFile(berkas);

    if (cocokRange) {
      const awalTeks = cocokRange[1];
      const akhirTeks = cocokRange[2];
      let awal = awalTeks ? Number(awalTeks) : 0;
      let akhir = akhirTeks ? Number(akhirTeks) : ukuran - 1;
      // "bytes=-500" berarti 500 byte TERAKHIR.
      if (!awalTeks && akhirTeks) {
        awal = Math.max(0, ukuran - Number(akhirTeks));
        akhir = ukuran - 1;
      }
      if (Number.isNaN(awal) || Number.isNaN(akhir) || awal > akhir || awal >= ukuran) {
        return new Response(null, {
          status: 416,
          headers: { ...dasarHeader, "Content-Range": `bytes */${ukuran}` },
        });
      }
      akhir = Math.min(akhir, ukuran - 1);
      const potongan = new Uint8Array(isi.subarray(awal, akhir + 1));
      return new Response(potongan, {
        status: 206,
        headers: {
          ...dasarHeader,
          "Content-Range": `bytes ${awal}-${akhir}/${ukuran}`,
          "Content-Length": String(potongan.length),
        },
      });
    }

    return new Response(new Uint8Array(isi), {
      headers: { ...dasarHeader, "Content-Length": String(ukuran) },
    });
  } catch {
    return tidakAda();
  }
}
