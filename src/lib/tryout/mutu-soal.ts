/**
 * Pemeriksa KEWAJARAN butir soal — dipakai halaman Pratinjau Soal admin.
 *
 * Bedanya dengan `masalahSoal()` di `admin.ts`: berkas ini tidak menanyakan
 * "apakah butirnya lengkap" (pertanyaan terisi, kunci ada, opsi minimal dua),
 * melainkan "apakah isinya masuk akal sebagai soal". Yang dicarinya adalah
 * kerusakan khas HASIL IMPOR naskah Word, yang lolos dari validasi kelengkapan
 * karena semua kolomnya memang terisi — hanya isinya yang keliru.
 *
 * Kasus yang melahirkan berkas ini (naskah PBM & PPU 4 September 2026):
 * kalimat "Teks berikut digunakan untuk menjawab soal nomor 39 dan 40."
 * berdiri tepat di bawah pilihan E soal sebelumnya, lalu tertelan menjadi ekor
 * pilihan itu. Di panel admin butirnya tampak "Lengkap" — lima pilihan, kunci
 * ada — padahal peserta membaca kalimat pengantar naskah sebagai pilihan
 * jawaban. Pembacanya sudah diperbaiki (`naskah-docx.ts`), tetapi soal yang
 * telanjur tersimpan hanya bisa ketahuan lewat pemeriksaan seperti ini.
 *
 * Berkas ini murni — tanpa `server-only` dan tanpa basis data — supaya bisa
 * dipakai halaman admin sekaligus diuji lewat `npm run cek:pratinjau`.
 */
import { LABEL_OPSI, type TipeSoal } from "@/lib/tryout/snbt";

export interface ButirPeriksa {
  tipe: TipeSoal;
  stimulus: string | null;
  pertanyaan: string;
  gambar_url: string | null;
  /** Pilihan jawaban yang sudah diurai dari kolom `opsi`. */
  opsi: string[];
  kunci: string;
}

/** Buang tag HTML dan entitas supaya isinya bisa dicocokkan sebagai kalimat. */
export function teksPolos(html: string | null | undefined): string {
  return String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Kalimat pengantar bacaan: "Teks berikut digunakan untuk menjawab soal nomor
 * 39 dan 40.", "Bacalah teks berikut dengan saksama untuk menjawab nomor 15—19!",
 * "Perhatikan teks berikut untuk menjawab soal 28–30!".
 *
 * Kalimat semacam ini milik NASKAH, bukan milik satu butir — kehadirannya di
 * dalam pilihan jawaban selalu berarti pembaca naskah salah memotong.
 */
const POLA_PENGANTAR =
  /\b(?:untuk\s+menjawab|digunakan\s+untuk|gunakan(?:lah)?)\b[^.!?]{0,40}\b(?:soal|nomor|no\.)\b|\b(?:teks|bacaan|wacana|kutipan|passage|text)\s+(?:berikut|di\s*bawah\s*ini)\b[^.!?]{0,60}\b(?:menjawab|nomor)\b/i;

/** Label baris naskah yang tidak boleh ikut tersimpan sebagai isi butir. */
const POLA_LABEL_NASKAH = /\b(?:kunci\s*(?:jawaban)?|pembahasan|penjelasan\s*jawaban)\s*:/i;

/** Sisa penanda kunci isian singkat yang seharusnya sudah dibuang saat impor. */
const POLA_JAWABAN_EKOR = /\(\s*jawaban\s*[:=]/i;

/** Pertanyaan yang tidak bisa dikerjakan tanpa bacaan. */
const POLA_RUJUK_BACAAN =
  /\b(?:teks|bacaan|wacana|paragraf|kutipan|tabel|grafik|diagram|gambar)\s+(?:tersebut|di\s*atas|berikut|itu)\b|\bpada\s+kalimat\s*\(?\d/i;

/**
 * Selisih panjang yang membuat satu pilihan patut dicurigai menelan teks lain.
 * Pilihan panjang itu wajar (LBIND memakai pilihan 200-300 karakter); yang
 * tidak wajar adalah SATU pilihan yang jauh melampaui saudara-saudaranya.
 */
const KELIPATAN_PANJANG = 2.5;
const SELISIH_PANJANG = 120;

/**
 * Panjang pertanyaan yang membuatnya dianggap MEMBAWA teksnya sendiri.
 * Banyak butir PU menuliskan paragraf acuannya di dalam batang soal, lalu
 * menutup dengan "Berdasarkan teks di atas…" — di sana kolom bacaan yang kosong
 * memang benar, dan menandainya hanya akan membuat pratinjau berisik.
 */
const AMBANG_SOAL_MANDIRI = 200;

function huruf(i: number): string {
  return LABEL_OPSI[i] ?? String(i + 1);
}

/**
 * Daftar kejanggalan pada satu butir. Kosong = tidak ada yang perlu dilihat.
 *
 * Semuanya berupa DUGAAN, bukan vonis: hasilnya ditampilkan sebagai ajakan
 * memeriksa, dan admin yang memutuskan. Karena itu setiap pesan menyebutkan
 * persis bagian mana yang harus dilihat.
 */
export function periksaButir(b: ButirPeriksa): string[] {
  const catatan: string[] = [];
  const opsi = b.opsi.map((o) => teksPolos(o));
  const terisi = opsi.map((t, i) => ({ t, i })).filter((x) => x.t !== "");
  const pertanyaan = teksPolos(b.pertanyaan);
  const stimulus = teksPolos(b.stimulus);

  // 1. Isian singkat yang masih menyimpan pilihan — layar peserta memang tidak
  //    menampilkannya, tetapi kunci dan tipenya jadi tidak bisa dipercaya.
  if (b.tipe === "IS" && terisi.length > 0) {
    catatan.push(
      `Bertipe isian singkat, tetapi masih menyimpan ${terisi.length} pilihan jawaban. Pilihan itu tidak tampil di layar peserta — pastikan tipenya memang isian singkat.`,
    );
  }

  // 2. Kalimat pengantar naskah yang tertelan jadi pilihan.
  for (const { t, i } of terisi) {
    if (POLA_PENGANTAR.test(t)) {
      catatan.push(
        `Pilihan ${huruf(i)} memuat kalimat pengantar bacaan ("…untuk menjawab soal nomor…"). Kalimat itu milik naskah, bukan pilihan jawaban — buang bagian itu.`,
      );
    } else if (POLA_LABEL_NASKAH.test(t)) {
      catatan.push(
        `Pilihan ${huruf(i)} memuat baris "Kunci:"/"Pembahasan:" dari naskah. Periksa batas pilihannya.`,
      );
    }
  }

  // 3. Satu pilihan yang jauh lebih panjang dari yang lain.
  if (terisi.length >= 3) {
    const panjang = terisi.map((x) => x.t.length).sort((a, b) => a - b);
    const tengah = panjang[Math.floor(panjang.length / 2)];
    for (const { t, i } of terisi) {
      if (t.length > tengah * KELIPATAN_PANJANG && t.length - tengah > SELISIH_PANJANG) {
        catatan.push(
          `Pilihan ${huruf(i)} jauh lebih panjang daripada pilihan lain (${t.length} banding ${tengah} karakter). Biasanya berarti kalimat dari bagian lain naskah ikut tertelan.`,
        );
      }
    }
  }

  // 4. Pilihan kembar. Perbandingannya SADAR BESAR-KECIL HURUF: soal PBM tentang
  //    kaidah penulisan judul memang memasang lima pilihan yang hanya berbeda
  //    kapitalisasinya, dan itu justru inti soalnya.
  const terlihat = new Map<string, number>();
  for (const { t, i } of terisi) {
    const kunci = t.replace(/[.,;:!?]+$/, "");
    const sebelumnya = terlihat.get(kunci);
    if (sebelumnya !== undefined) {
      catatan.push(`Pilihan ${huruf(sebelumnya)} dan ${huruf(i)} bertuliskan sama persis.`);
    } else {
      terlihat.set(kunci, i);
    }
  }

  // 5. Pertanyaan menagih bacaan yang tidak ada. Inilah gejala bacaan yang
  //    kehilangan cakupan nomornya saat impor: satu soal kebagian, pasangannya
  //    tampil telanjang dan mustahil dikerjakan.
  if (
    !stimulus &&
    !(b.gambar_url ?? "").trim() &&
    pertanyaan.length < AMBANG_SOAL_MANDIRI &&
    POLA_RUJUK_BACAAN.test(pertanyaan)
  ) {
    catatan.push(
      "Pertanyaan menyebut teks/bacaan, tetapi kolom bacaannya kosong. Peserta tidak akan bisa menjawab — salin bacaan dari soal sebelahnya.",
    );
  }

  // 6. Kalimat pengantar yang ikut tersimpan di bacaan atau pertanyaan.
  if (POLA_PENGANTAR.test(stimulus)) {
    catatan.push(
      'Bacaan masih memuat kalimat pengantar naskah ("…untuk menjawab soal nomor…"). Boleh dibuang supaya layar peserta bersih.',
    );
  }
  if (POLA_LABEL_NASKAH.test(pertanyaan)) {
    catatan.push('Pertanyaan memuat baris "Kunci:"/"Pembahasan:" dari naskah.');
  }
  if (POLA_JAWABAN_EKOR.test(pertanyaan)) {
    catatan.push(
      'Pertanyaan masih memuat "(Jawaban: …)" — kuncinya bocor ke layar peserta. Hapus bagian itu dan pindahkan ke kolom kunci.',
    );
  }

  return catatan;
}
