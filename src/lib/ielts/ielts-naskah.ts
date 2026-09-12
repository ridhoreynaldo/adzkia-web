import "server-only";

import { tx } from "@/lib/core/db";
import { bacaDocx } from "@/lib/naskah/docx";
import { pastikanSeksi, simpanSeksi, simpanSoal, timpaSoalNomor } from "@/lib/ielts/ielts";
import { bacaTeksPdf, GagalPdf } from "@/lib/naskah/pdf-teks";
import {
  HURUF_PG,
  OPSI_TFNG,
  subtesIelts,
  type SubtesIeltsKode,
  type TipeSoalIelts,
} from "@/lib/ielts/ielts-konstanta";

/**
 * Impor naskah soal IELTS dari berkas Word (.docx), PDF, atau teks biasa.
 *
 * Satu berkas berisi SATU SUBTES. Itu bukan pembatasan teknis melainkan cara
 * kerja yang sudah ada di sekolah: naskah Listening, Reading, Writing, dan
 * Speaking disusun orang yang berbeda dan selesai pada waktu yang berbeda,
 * jadi keempatnya memang tidak pernah datang sebagai satu berkas. Halaman
 * pengunggahnya pun berada di dalam subtes yang bersangkutan, sehingga subtes
 * tujuannya tidak perlu ditebak dari isi naskah.
 *
 * BENTUK NASKAH — dirancang supaya bisa diketik guru di Word tanpa belajar
 * apa pun yang baru, dan tetap terbaca sesudah dicetak menjadi PDF:
 *
 *     SECTION 1: Booking the community hall
 *     INSTRUCTION: Questions 1-10. Write ONE WORD AND/OR A NUMBER.
 *     PASSAGE:
 *     <teks bacaan, boleh berparagraf-paragraf>
 *     TRANSCRIPT:
 *     <naskah rekaman — tidak pernah ditampilkan kepada siswa>
 *
 *     1. The hall was built in ......... .
 *     ANSWER: 1974
 *
 *     2. What does the man decide to do?
 *     A. Cancel the booking
 *     B. Move to another hall
 *     C. Pay the extra fee
 *     D. Ask for a refund
 *     ANSWER: C
 *
 *     3. The hall is open on public holidays.
 *     ANSWER: NOT GIVEN
 *
 * Kuncinya boleh pula dikumpulkan di akhir berkas di bawah judul
 * "ANSWER KEY" / "KUNCI JAWABAN" — cara yang lazim dipakai naskah cetak — dan
 * keduanya boleh dicampur dalam satu berkas.
 *
 * Bentuk butir tidak perlu ditulis: ada pilihan A-D berarti pilihan ganda,
 * kuncinya TRUE/FALSE/NOT GIVEN berarti True-False-Not Given, tidak ada kunci
 * sama sekali pada Writing/Speaking berarti karangan, sisanya isian singkat.
 */

/* ==========================================================================
   BENTUK HASIL
   ========================================================================== */

export interface SeksiNaskah {
  nomor: number;
  judul: string;
  instruksi: string;
  bacaan: string;
  transkrip: string;
}

export interface ButirNaskahIelts {
  /** Nomor sebagaimana tertulis di berkas. */
  nomor: number;
  /** Nomor yang akan dipakai saat disimpan — bisa bergeser pada mode "lanjut". */
  nomorSimpan: number;
  seksiNomor: number | null;
  tipe: TipeSoalIelts;
  pertanyaan: string;
  opsi: string[];
  kunci: string;
  catatan: string;
  /** Baris berkas tempat butir ini mulai — dipakai pesan galat. */
  baris: number;
  /** Alasan butir ini tidak bisa disimpan; kosong berarti layak. */
  galat: string;
  /** Sudah ada di subtes ini dengan pertanyaan yang sama persis. */
  kembar: boolean;
}

export interface HasilNaskahIelts {
  sumber: "docx" | "pdf" | "teks";
  subtes: SubtesIeltsKode;
  seksi: SeksiNaskah[];
  butir: ButirNaskahIelts[];
  jumlahLayak: number;
  jumlahGalat: number;
  jumlahKembar: number;
  /** Peringatan tingkat berkas — tidak menggagalkan impor. */
  catatan: string[];
  /** Galat yang membuat seluruh berkas tidak bisa dipakai. */
  errorFile?: string;
}

export type ModeNomorIelts = "lanjut" | "berkas" | "timpa";

/* ==========================================================================
   BERKAS -> TEKS
   ========================================================================== */

/**
 * Mengubah berkas apa pun menjadi teks berbaris.
 *
 * Paragraf Word yang merupakan butir daftar otomatis dikembalikan bersama
 * LABELNYA ("A.", "1."). Word tidak pernah menyimpan label itu di dalam teks
 * paragraf — ia digambar saat mencetak — sehingga tanpa langkah ini seluruh
 * pilihan jawaban sampai ke sini tanpa hurufnya dan tidak bisa dibedakan dari
 * kalimat biasa. Persoalan yang sama sudah ditemui naskah UTBK; lihat
 * `naskah-docx.ts`.
 */
export async function bacaTeksNaskah(
  namaFile: string,
  data: ArrayBuffer,
): Promise<{ teks: string; sumber: HasilNaskahIelts["sumber"] }> {
  const ekstensi = namaFile.toLowerCase().split(".").pop() ?? "";

  if (ekstensi === "docx") {
    const isi = await bacaDocx(data);
    const baris: string[] = [];
    for (const b of isi.blok) {
      if (b.jenis === "paragraf") {
        const label = b.berdaftar && b.labelDaftar ? `${b.labelDaftar} ` : "";
        baris.push(`${label}${b.teks}`);
      } else {
        // Tabel jarang dipakai naskah IELTS, tetapi kalau ada, tiap barisnya
        // dijadikan satu baris teks supaya isinya tidak hilang begitu saja.
        for (const r of b.baris) baris.push(r.filter((s) => s.trim()).join(" | "));
      }
    }
    return { teks: baris.join("\n"), sumber: "docx" };
  }

  if (ekstensi === "pdf") {
    return { teks: bacaTeksPdf(new Uint8Array(data)), sumber: "pdf" };
  }

  if (ekstensi === "txt" || ekstensi === "md") {
    return { teks: new TextDecoder("utf-8").decode(data), sumber: "teks" };
  }

  if (ekstensi === "doc") {
    throw new Error(
      "Format .doc lama belum didukung. Buka naskahnya di Word lalu pilih Simpan Sebagai → Word Document (.docx).",
    );
  }
  throw new Error("Format berkas harus .docx, .pdf, atau .txt.");
}

/* ==========================================================================
   PENANDA
   ========================================================================== */

/** "SECTION 2", "RECORDING 1", "PASSAGE 3", "TASK 1", "PART 2", "BAGIAN 4". */
const POLA_SEKSI =
  /^(?:section|recording|passage|task|part|bagian|rekaman|bacaan|tugas)\s*(\d+)\s*[:.\-–—]?\s*(.*)$/i;

/** Baris berlabel: "INSTRUCTION: …", "PASSAGE:", "ANSWER: C", … */
const POLA_LABEL = /^([A-Za-z ]{3,24})\s*[:：]\s*(.*)$/;

/** Awal butir: "12." / "12)" / "12 " di awal baris. */
const POLA_NOMOR = /^\(?(\d{1,3})\)?\s*[.):\-]?\s+(.*)$/;

/** Pilihan jawaban: "A. …", "(B) …", "C) …". */
const POLA_OPSI = /^\(?([A-Ea-e])\)?\s*[.):\-]\s*(.+)$/;

/** Judul blok kunci di akhir naskah. */
const POLA_JUDUL_KUNCI = /^(?:answer\s*key|answers|kunci\s*jawaban|kunci)\s*[:.]?\s*$/i;

const LABEL_INSTRUKSI = new Set([
  "instruction",
  "instructions",
  "instruksi",
  "petunjuk",
  "questions",
  "question",
  "soal",
  "pertanyaan",
]);
const LABEL_BACAAN = new Set(["passage", "reading passage", "text", "bacaan", "teks"]);
const LABEL_TRANSKRIP = new Set(["transcript", "transkrip", "naskah rekaman", "audio script"]);
const LABEL_KUNCI = new Set(["answer", "answers", "key", "kunci", "jawaban", "kunci jawaban"]);
const LABEL_TIPE = new Set(["type", "tipe", "bentuk"]);
const LABEL_CATATAN = new Set(["note", "notes", "catatan", "pembahasan", "explanation"]);
const LABEL_JUDUL = new Set(["title", "judul", "heading"]);

/**
 * Apakah "<angka> <teks>" ini sungguh awal butir soal, bukan kalimat biasa?
 *
 * Dua penjaga, keduanya lahir dari naskah sungguhan:
 *
 *   1. Nomor soal IELTS tidak pernah melewati 40; batas 99 di sini memberi
 *      kelonggaran tanpa menerima "250 kata dikenai pinalti" atau "1974 the
 *      hall was built" sebagai soal.
 *   2. Kalimat soal dimulai huruf besar, angka, atau titik-titik isian.
 *      Baris yang dimulai huruf kecil hampir pasti SAMBUNGAN kalimat
 *      sebelumnya yang terpotong — yang terjadi pada tiap naskah PDF, sebab
 *      pemenggalan barisnya ditentukan lebar halaman, bukan penulisnya.
 */
function nomorSoalMasukAkal(nomor: number, ekor: string): boolean {
  if (!Number.isInteger(nomor) || nomor < 1 || nomor > 99) return false;
  const teks = ekor.trim();
  if (!teks) return false;
  const awal = teks[0];
  return awal !== awal.toLowerCase() || !/[a-z]/i.test(awal);
}

function normalLabel(v: string): string {
  return v.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Membaca "TYPE: essay" menjadi bentuk butir yang dikenal aplikasi. */
function tipeDariLabel(v: string): TipeSoalIelts | null {
  const t = normalLabel(v);
  if (/esai|essay|karangan|writing/.test(t)) return "ESAI";
  if (/tfng|true|benar/.test(t)) return "TFNG";
  if (/pg|multiple|pilihan/.test(t)) return "PG";
  if (/is|short|isian|completion/.test(t)) return "IS";
  return null;
}

/**
 * Membakukan kunci TFNG.
 *
 * YES/NO — yang dipakai IELTS untuk soal "pandangan penulis" — sengaja TIDAK
 * diterima diam-diam sebagai TRUE/FALSE. Ruang ujian hanya menyediakan tiga
 * tombol TRUE/FALSE/NOT GIVEN, dan menukar kata di belakang layar akan membuat
 * siswa memilih kata yang tidak ada di naskahnya. Butirnya ditandai galat
 * supaya pengelola yang memutuskan.
 */
function kunciTfng(v: string): string | null {
  const t = v.trim().toUpperCase().replace(/\s+/g, " ").replace(/[.]+$/, "");
  return OPSI_TFNG.includes(t) ? t : null;
}

/* ==========================================================================
   PENGURAI
   ========================================================================== */

interface ButirKerja {
  nomor: number;
  baris: number;
  seksiNomor: number | null;
  pertanyaan: string[];
  opsi: string[];
  kunci: string;
  tipePaksa: TipeSoalIelts | null;
  catatan: string;
}

/**
 * Mengurai teks naskah menjadi bagian-bagian dan butirnya.
 *
 * Penguraiannya berjalan satu arah dari baris pertama ke terakhir, dengan satu
 * "keadaan" yang menyatakan sedang mengumpulkan apa — badan bacaan, transkrip,
 * atau kalimat pertanyaan. Baris yang tidak dikenali TIDAK dibuang: ia
 * disambungkan ke bagian terakhir yang sedang dikumpulkan, karena satu kalimat
 * pertanyaan yang terpotong dua baris di Word (atau di PDF) datang ke sini
 * memang sebagai dua baris.
 */
function uraikan(teks: string, subtes: SubtesIeltsKode): {
  seksi: Map<number, SeksiNaskah>;
  butir: ButirKerja[];
  kunciAkhir: Map<number, string>;
  catatan: string[];
} {
  const def = subtesIelts(subtes)!;
  const seksi = new Map<number, SeksiNaskah>();
  const butir: ButirKerja[] = [];
  const kunciAkhir = new Map<number, string>();
  const catatan: string[] = [];

  let seksiKini: number | null = null;
  let butirKini: ButirKerja | null = null;
  let kumpul: "bacaan" | "transkrip" | "instruksi" | "catatan" | null = null;
  let dalamKunci = false;

  const pastikan = (nomor: number): SeksiNaskah => {
    let s = seksi.get(nomor);
    if (!s) {
      s = { nomor, judul: "", instruksi: "", bacaan: "", transkrip: "" };
      seksi.set(nomor, s);
    }
    return s;
  };

  const sambung = (lama: string, baru: string) => (lama ? `${lama}\n${baru}` : baru);

  const baris = teks.replace(/\r\n?/g, "\n").split("\n");

  for (let i = 0; i < baris.length; i++) {
    const mentah = baris[i];
    const isi = mentah.trim();

    if (!isi) {
      // Baris kosong memisahkan paragraf di dalam bacaan, tetapi menutup
      // kalimat pertanyaan yang sedang dikumpulkan.
      if (kumpul === "bacaan" || kumpul === "transkrip") {
        const s = seksiKini === null ? null : seksi.get(seksiKini);
        if (s) {
          if (kumpul === "bacaan") s.bacaan = sambung(s.bacaan, "");
          else s.transkrip = sambung(s.transkrip, "");
        }
      }
      continue;
    }

    /* ---------------- Judul bagian ---------------- */
    const cocokSeksi = POLA_SEKSI.exec(isi);
    if (cocokSeksi && isi.length < 120) {
      const nomor = Number(cocokSeksi[1]);
      seksiKini = nomor;
      butirKini = null;
      kumpul = null;
      dalamKunci = false;
      const s = pastikan(nomor);
      if (cocokSeksi[2].trim()) s.judul = cocokSeksi[2].trim();
      if (nomor > def.jumlahSeksi) {
        catatan.push(
          `Naskah menyebut ${def.labelSeksi} ${nomor}, padahal ${def.nama} hanya punya ${def.jumlahSeksi}. Butirnya tetap masuk, tetapi tidak menempel ke bagian mana pun.`,
        );
      }
      continue;
    }

    /* ---------------- Judul blok kunci ---------------- */
    if (POLA_JUDUL_KUNCI.test(isi)) {
      dalamKunci = true;
      butirKini = null;
      kumpul = null;
      continue;
    }

    /* ---------------- Baris berlabel ---------------- */
    const cocokLabel = POLA_LABEL.exec(isi);
    if (cocokLabel) {
      const label = normalLabel(cocokLabel[1]);
      const nilai = cocokLabel[2].trim();

      if (LABEL_INSTRUKSI.has(label)) {
        const s = pastikan(seksiKini ?? 1);
        if (seksiKini === null) seksiKini = 1;
        s.instruksi = sambung(s.instruksi, nilai);
        kumpul = nilai ? null : "instruksi";
        butirKini = null;
        continue;
      }
      if (LABEL_BACAAN.has(label)) {
        const s = pastikan(seksiKini ?? 1);
        if (seksiKini === null) seksiKini = 1;
        if (nilai) s.bacaan = sambung(s.bacaan, nilai);
        kumpul = "bacaan";
        butirKini = null;
        continue;
      }
      if (LABEL_TRANSKRIP.has(label)) {
        const s = pastikan(seksiKini ?? 1);
        if (seksiKini === null) seksiKini = 1;
        if (nilai) s.transkrip = sambung(s.transkrip, nilai);
        kumpul = "transkrip";
        butirKini = null;
        continue;
      }
      if (LABEL_JUDUL.has(label)) {
        pastikan(seksiKini ?? 1).judul = nilai;
        if (seksiKini === null) seksiKini = 1;
        continue;
      }
      if (LABEL_KUNCI.has(label)) {
        if (butirKini) butirKini.kunci = nilai;
        else {
          // "ANSWER: 3. coach" tanpa butir terbuka — masuk ke blok kunci.
          for (const k of pecahKunciSebaris(nilai)) kunciAkhir.set(k.nomor, k.kunci);
        }
        kumpul = null;
        continue;
      }
      if (LABEL_TIPE.has(label)) {
        if (butirKini) butirKini.tipePaksa = tipeDariLabel(nilai);
        continue;
      }
      if (LABEL_CATATAN.has(label)) {
        if (butirKini) {
          butirKini.catatan = sambung(butirKini.catatan, nilai);
          // Baris berikutnya masih milik catatan ini sampai ada butir atau
          // label baru. Catatan guru sering panjang, dan naskah PDF
          // memenggalnya menurut lebar halaman — tanpa penanda ini, ekornya
          // menempel ke kalimat soal dan ikut terbaca peserta.
          kumpul = "catatan";
        }
        continue;
      }
      // Label lain bukan penanda aplikasi ini — ia bagian dari kalimat naskah
      // ("Name: ....." pada soal melengkapi formulir) dan jatuh ke bawah.
    }

    /* ---------------- Blok kunci di akhir naskah ---------------- */
    if (dalamKunci) {
      for (const k of pecahKunciSebaris(isi)) kunciAkhir.set(k.nomor, k.kunci);
      continue;
    }

    /* ----------------------------------------------------------------
       Pilihan jawaban.

       Tiga syarat, dan ketiganya diperlukan:

         - hurufnya harus huruf BERIKUTNYA (A saat belum ada, lalu B, C, D),
           sehingga "A." yang kebetulan mengawali kalimat tidak pernah lolos;
         - kalimat sebelumnya harus SUDAH SELESAI — berakhir tanda tanya,
           titik dua, titik, atau titik-titik isian. Naskah PDF memenggal
           barisnya menurut lebar halaman, jadi sambungan kalimat seperti
           "(e) How has the way you travel to school changed…" bisa jatuh
           tepat di awal baris dan menyamar sebagai pilihan E;
         - "E" hanya dikenali sebagai kelebihan pilihan bila memang sudah ada
           empat pilihan sebelumnya.
       ---------------------------------------------------------------- */
    const cocokOpsi = POLA_OPSI.exec(isi);
    if (cocokOpsi && butirKini && butirKini.pertanyaan.length > 0 && kalimatTuntas(butirKini)) {
      const huruf = cocokOpsi[1].toUpperCase();
      const urutan = HURUF_PG.indexOf(huruf);
      if (urutan === butirKini.opsi.length) {
        butirKini.opsi.push(cocokOpsi[2].trim());
        continue;
      }
      if (huruf === "E" && butirKini.opsi.length === HURUF_PG.length) {
        catatan.push(
          `Nomor ${butirKini.nomor}: pilihan E diabaikan — IELTS memakai empat pilihan A-D.`,
        );
        continue;
      }
    }

    /* ----------------------------------------------------------------
       Awal butir.

       TIDAK diperiksa selama masih di dalam blok PASSAGE atau TRANSCRIPT.
       Teks bacaan penuh kalimat yang dimulai angka ("12 kilometres of track
       were laid that year"), dan tanpa penjagaan ini separuh bacaan akan
       berubah menjadi soal. Blok bacaan ditutup oleh judul bagian berikutnya
       atau oleh baris berlabel — dan baris berlabel itu memang selalu ada
       pada naskah IELTS, sebab tiap kelompok soal dibuka "Questions 1-6 …".
       ---------------------------------------------------------------- */
    if (kumpul === "bacaan" || kumpul === "transkrip") {
      const s = pastikan(seksiKini ?? 1);
      if (kumpul === "bacaan") s.bacaan = sambung(s.bacaan, isi);
      else s.transkrip = sambung(s.transkrip, isi);
      continue;
    }

    const cocokNomor = POLA_NOMOR.exec(isi);
    if (cocokNomor && nomorSoalMasukAkal(Number(cocokNomor[1]), cocokNomor[2])) {
      const nomor = Number(cocokNomor[1]);
      {
        butirKini = {
          nomor,
          baris: i + 1,
          seksiNomor: seksiKini,
          pertanyaan: [cocokNomor[2].trim()],
          opsi: [],
          kunci: "",
          tipePaksa: null,
          catatan: "",
        };
        butir.push(butirKini);
        kumpul = null;
        continue;
      }
    }

    /* ---------------- Sambungan ---------------- */
    if (kumpul === "catatan" && butirKini) {
      butirKini.catatan = sambung(butirKini.catatan, isi);
      continue;
    }
    if (kumpul === "instruksi") {
      pastikan(seksiKini ?? 1).instruksi = sambung(pastikan(seksiKini ?? 1).instruksi, isi);
      continue;
    }
    if (butirKini) {
      if (butirKini.opsi.length > 0) {
        // Sesudah pilihan dimulai, baris sambungan milik pilihan terakhir.
        butirKini.opsi[butirKini.opsi.length - 1] += ` ${isi}`;
      } else {
        butirKini.pertanyaan.push(isi);
      }
      continue;
    }

    // Baris sebelum butir mana pun: dianggap instruksi bagian ini.
    if (seksiKini !== null) {
      const s = pastikan(seksiKini);
      s.instruksi = sambung(s.instruksi, isi);
    }
  }

  return { seksi, butir, kunciAkhir, catatan };
}

/**
 * Apakah bagian butir yang terakhir dikumpulkan sudah berupa kalimat utuh?
 *
 * Dipakai memutuskan apakah baris berikutnya boleh dianggap pilihan jawaban.
 * Daftar pilihan selalu menyusul kalimat yang sudah selesai — pertanyaan yang
 * diakhiri tanda tanya, kalimat rumpang yang diakhiri titik-titik, atau
 * pengantar yang diakhiri titik dua.
 */
function kalimatTuntas(butir: ButirKerja): boolean {
  if (butir.opsi.length > 0) return true;
  const akhir = butir.pertanyaan[butir.pertanyaan.length - 1]?.trim() ?? "";
  return /[?:.…]$/.test(akhir) || /_{2,}$/.test(akhir);
}

/**
 * Memecah satu baris blok kunci menjadi pasangan nomor-kunci.
 *
 * Menerima "1. B", "1) B  2) TRUE  3) coach", dan "1 B 2 TRUE" sekaligus,
 * karena naskah cetak menulis kuncinya dengan ketiga cara itu.
 */
export function pecahKunciSebaris(teks: string): { nomor: number; kunci: string }[] {
  // Semua calon "angka + pemisah" dikumpulkan dulu, lalu hanya yang nomornya
  // BERURUTAN yang diterima sebagai penanda kunci baru. Tanpa syarat urut,
  // kunci yang isinya sendiri berangka ikut memecah barisnya: pada
  // "1) coach  2) 27 March", angka 27 akan terbaca sebagai nomor soal
  // berikutnya dan kunci nomor 2 tinggal kosong.
  const calon = [...teks.matchAll(/(\d{1,3})\s*[.):\-]?\s+/g)];
  const diterima: { nomor: number; mulai: number; akhir: number }[] = [];
  let harap: number | null = null;

  for (const m of calon) {
    const nomor = Number(m[1]);
    if (nomor < 1 || nomor > 999) continue;
    if (harap === null || nomor === harap) {
      diterima.push({ nomor, mulai: m.index, akhir: m.index + m[0].length });
      harap = nomor + 1;
    }
  }

  return diterima
    .map((d, i) => ({
      nomor: d.nomor,
      kunci: teks
        .slice(d.akhir, i + 1 < diterima.length ? diterima[i + 1].mulai : undefined)
        .trim()
        .replace(/[;,]$/, ""),
    }))
    .filter((d) => d.kunci.length > 0);
}

/* ==========================================================================
   PEMERIKSAAN
   ========================================================================== */

/** Menyimpulkan bentuk butir dari isinya, lalu memeriksa kuncinya. */
function bakukanButir(
  kerja: ButirKerja,
  subtes: SubtesIeltsKode,
  kunciAkhir: Map<number, string>,
): ButirNaskahIelts {
  const pertanyaan = kerja.pertanyaan.join(" ").replace(/\s+/g, " ").trim();
  const kunciMentah = (kerja.kunci || kunciAkhir.get(kerja.nomor) || "").trim();
  const esaiSubtes = subtes === "WRITING" || subtes === "SPEAKING";

  // YES/NO/NOT GIVEN — bentuk IELTS untuk soal "pandangan penulis" — dikenali
  // sebagai TFNG supaya ia SAMPAI ke pemeriksaan kunci di bawah dan ditolak di
  // sana dengan penjelasan. Kalau dibiarkan jatuh menjadi isian singkat, kunci
  // "YES" akan tersimpan diam-diam sebagai jawaban yang harus DIKETIK siswa,
  // padahal ruang ujian menampilkan tiga tombol TRUE/FALSE/NOT GIVEN dan tidak
  // ada satu pun yang berbunyi YES.
  const bergayaTfng = /^(?:yes|no)$/i.test(kunciMentah.trim());

  let tipe: TipeSoalIelts;
  if (kerja.tipePaksa) tipe = kerja.tipePaksa;
  else if (kerja.opsi.length >= 2) tipe = "PG";
  else if (kunciTfng(kunciMentah) || bergayaTfng) tipe = "TFNG";
  else if (!kunciMentah && esaiSubtes) tipe = "ESAI";
  else tipe = "IS";

  let kunci = kunciMentah;
  let galat = "";

  if (!pertanyaan) galat = "Kalimat pertanyaannya kosong.";
  else if (tipe === "PG") {
    if (kerja.opsi.length < 2) galat = "Soal pilihan ganda butuh minimal dua pilihan A-D.";
    else {
      const huruf = kunciMentah.trim().toUpperCase().replace(/[^A-D]/g, "").slice(0, 1);
      if (!huruf) galat = `Kunci "${kunciMentah || "(kosong)"}" bukan huruf A-D.`;
      else if (HURUF_PG.indexOf(huruf) >= kerja.opsi.length) {
        galat = `Kunci ${huruf} menunjuk pilihan yang tidak ada — hanya ada ${kerja.opsi.length} pilihan.`;
      } else kunci = huruf;
    }
  } else if (tipe === "TFNG") {
    const baku = kunciTfng(kunciMentah);
    if (!baku) {
      galat = /^(yes|no)$/i.test(kunciMentah)
        ? `Kunci "${kunciMentah}" (YES/NO) belum didukung ruang ujian — tulis ulang butirnya memakai TRUE/FALSE/NOT GIVEN.`
        : "Kunci True/False/Not Given tidak dikenali.";
    } else kunci = baku;
  } else if (tipe === "IS") {
    if (!kunciMentah) galat = "Isian singkat wajib punya kunci jawaban.";
  }
  // ESAI sengaja tidak diperiksa kuncinya — dinilai guru.

  return {
    nomor: kerja.nomor,
    nomorSimpan: kerja.nomor,
    seksiNomor: kerja.seksiNomor,
    tipe,
    pertanyaan,
    opsi: tipe === "PG" ? kerja.opsi.map((o) => o.replace(/\s+/g, " ").trim()) : [],
    kunci: tipe === "ESAI" ? "" : kunci,
    catatan: kerja.catatan.trim(),
    baris: kerja.baris,
    galat,
    kembar: false,
  };
}

/* ==========================================================================
   PINTU MASUK
   ========================================================================== */

/**
 * Membaca satu berkas naskah menjadi pratinjau yang siap ditampilkan.
 *
 * Belum menyentuh basis data selain untuk MEMBACA: penomoran mode "lanjut" dan
 * penandaan butir kembar keduanya perlu tahu isi subtes yang sekarang. Yang
 * menulis adalah `simpanNaskahIelts`, dipanggil sesudah admin melihat
 * pratinjaunya dan menekan simpan.
 */
export async function parseNaskahIelts(
  namaFile: string,
  data: ArrayBuffer,
  opsi: {
    subtes: SubtesIeltsKode;
    mode: ModeNomorIelts;
    /** Nomor yang sudah terpakai di subtes ini. */
    nomorTerpakai: Set<number>;
    /** Sidik pertanyaan yang sudah ada, untuk menandai butir kembar. */
    sidikAda: Set<string>;
  },
): Promise<HasilNaskahIelts> {
  const kosong: HasilNaskahIelts = {
    sumber: "teks",
    subtes: opsi.subtes,
    seksi: [],
    butir: [],
    jumlahLayak: 0,
    jumlahGalat: 0,
    jumlahKembar: 0,
    catatan: [],
  };

  let teks: string;
  let sumber: HasilNaskahIelts["sumber"];
  try {
    const dibaca = await bacaTeksNaskah(namaFile, data);
    teks = dibaca.teks;
    sumber = dibaca.sumber;
  } catch (e) {
    return {
      ...kosong,
      errorFile:
        e instanceof GagalPdf || e instanceof Error ? e.message : "Berkas tidak bisa dibaca.",
    };
  }

  const urai = uraikan(teks, opsi.subtes);
  const butir = urai.butir.map((b) => bakukanButir(b, opsi.subtes, urai.kunciAkhir));

  if (butir.length === 0) {
    return {
      ...kosong,
      sumber,
      catatan: urai.catatan,
      errorFile:
        "Tidak ada satu pun butir soal yang terbaca. Dua sebab yang paling sering: (1) nomor soal " +
        'tidak berada di awal baris — tulis "1. ..." — atau (2) soalnya menempel langsung di bawah ' +
        'blok PASSAGE: / TRANSCRIPT:. Sesudah blok bacaan, sisipkan satu baris "QUESTIONS: ..." atau ' +
        '"INSTRUCTION: ..." lebih dulu, sebab selama blok bacaan belum ditutup semua baris berangka ' +
        "dianggap bagian dari bacaan.",
    };
  }

  /* ---------------- Penomoran ---------------- */
  const dipakai = new Set(opsi.mode === "lanjut" ? opsi.nomorTerpakai : []);
  let calon = 1;
  for (const b of butir) {
    if (opsi.mode === "lanjut") {
      while (dipakai.has(calon)) calon++;
      b.nomorSimpan = calon;
      dipakai.add(calon);
    } else {
      b.nomorSimpan = b.nomor;
      if (opsi.mode === "berkas" && opsi.nomorTerpakai.has(b.nomor) && !b.galat) {
        b.galat = `Nomor ${b.nomor} sudah terpakai di subtes ini.`;
      }
    }
  }

  /* ---------------- Kembar ---------------- */
  const sidikBerkas = new Set<string>();
  for (const b of butir) {
    const sidik = sidikPertanyaan(b.pertanyaan);
    if (!sidik) continue;
    if (opsi.sidikAda.has(sidik) || sidikBerkas.has(sidik)) b.kembar = true;
    sidikBerkas.add(sidik);
  }

  /* ---------------- Nomor bentrok di dalam berkas ---------------- */
  const terlihat = new Map<number, number>();
  for (const b of butir) {
    const sebelumnya = terlihat.get(b.nomorSimpan);
    if (sebelumnya !== undefined && !b.galat) {
      b.galat = `Nomor ${b.nomorSimpan} muncul dua kali di berkas ini (baris ${sebelumnya}).`;
    }
    terlihat.set(b.nomorSimpan, b.baris);
  }

  const def = subtesIelts(opsi.subtes)!;
  const catatan = [...urai.catatan];
  const layak = butir.filter((b) => !b.galat && !b.kembar);
  if (layak.length + opsi.nomorTerpakai.size > def.jumlahSoal) {
    catatan.push(
      `Sesudah impor ini ${def.nama} akan berisi ${layak.length + opsi.nomorTerpakai.size} butir, melebihi ${def.jumlahSoal} butir standar IELTS.`,
    );
  }

  return {
    sumber,
    subtes: opsi.subtes,
    seksi: [...urai.seksi.values()].sort((a, b) => a.nomor - b.nomor),
    butir,
    jumlahLayak: layak.length,
    jumlahGalat: butir.filter((b) => b.galat).length,
    jumlahKembar: butir.filter((b) => b.kembar).length,
    catatan,
  };
}

/**
 * Sidik satu pertanyaan: huruf dan angkanya saja.
 *
 * Dipakai untuk mengenali naskah yang terunggah dua kali. Tanda baca dan spasi
 * dibuang karena PDF dan Word menghasilkan tanda kutip yang berbeda untuk
 * kalimat yang sama persis.
 */
export function sidikPertanyaan(teks: string): string {
  return teks.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 160);
}

/* ==========================================================================
   MENYIMPAN
   ========================================================================== */

export interface HasilSimpanNaskah {
  disimpan: number;
  ditimpa: number;
  dilewati: number;
  seksiDiperbarui: number;
  error?: string;
}

/**
 * Menyimpan pratinjau yang sudah dilihat admin.
 *
 * Butir yang bergalat dan butir kembar tidak disimpan — keduanya sudah
 * ditandai di pratinjau, jadi tidak ada yang hilang diam-diam. Bagian
 * (judul, instruksi, bacaan, transkrip) hanya DITIMPA bila naskahnya memang
 * membawa isi untuk kolom itu: mengunggah naskah soal susulan tidak boleh
 * menghapus teks bacaan yang sudah ditempel pengelola sebelumnya.
 */
export async function simpanNaskahIelts(
  paketId: number,
  subtes: SubtesIeltsKode,
  hasil: HasilNaskahIelts,
  mode: ModeNomorIelts,
): Promise<HasilSimpanNaskah> {
  const rekap: HasilSimpanNaskah = { disimpan: 0, ditimpa: 0, dilewati: 0, seksiDiperbarui: 0 };

  return await tx(async () => {
    const seksiBaris = await pastikanSeksi(paketId, subtes);
    const petaSeksi = new Map(seksiBaris.map((s) => [s.nomor, s]));

    for (const s of hasil.seksi) {
      const baris = petaSeksi.get(s.nomor);
      if (!baris) continue;
      const adaIsi = s.judul || s.instruksi || s.bacaan || s.transkrip;
      if (!adaIsi) continue;
      await simpanSeksi(baris.id, {
        judul: s.judul || baris.judul || "",
        instruksi: s.instruksi || baris.instruksi || "",
        bacaan: s.bacaan || baris.bacaan || "",
        transkrip: s.transkrip || baris.transkrip || "",
      });
      rekap.seksiDiperbarui++;
    }

    for (const b of hasil.butir) {
      if (b.galat || b.kembar) {
        rekap.dilewati++;
        continue;
      }
      const data = {
        seksiId: b.seksiNomor === null ? null : (petaSeksi.get(b.seksiNomor)?.id ?? null),
        nomor: b.nomorSimpan,
        tipe: b.tipe,
        pertanyaan: b.pertanyaan,
        opsi: b.opsi,
        kunci: b.kunci,
        catatan: b.catatan,
      };
      try {
        if (mode === "timpa" && await timpaSoalNomor(paketId, subtes, data)) {
          rekap.ditimpa++;
        } else {
          await simpanSoal(paketId, subtes, data);
          rekap.disimpan++;
        }
      } catch {
        // Nomor yang keburu terpakai adalah satu-satunya sebab yang masuk akal
        // di sini; butirnya dilewati, bukan menggagalkan seluruh impor.
        rekap.dilewati++;
      }
    }

    return rekap;
  });
}
