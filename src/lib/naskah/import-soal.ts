/**
 * Impor & ekspor bank soal ADZKIA SMART.
 *
 * Alur: unggah .xlsx/.csv -> `parseFileImpor()` menghasilkan pratinjau + daftar
 * galat per baris -> admin menekan "Simpan" -> `simpanHasilImpor()`.
 *
 * Catatan: modul ini hanya dipanggil dari server (Server Action / Route Handler).
 * Komponen klien cukup memakai `import type` untuk tipe pratinjau.
 */
import * as ExcelJSNs from "exceljs";
import type { CellValue, Worksheet } from "exceljs";

import { all, one, run, tx } from "@/lib/core/db";
import { bacaNaskahDocx, type ButirNaskah } from "@/lib/naskah/naskah-docx";
import { LABEL_OPSI, SEMUA_KODE_SUBTES, SUBTES, getSubtes, type TipeSoal } from "@/lib/tryout/snbt";
import { TKP_MAKS, TKP_MIN, getSubtesSkd } from "@/lib/tryout/skd";

// exceljs adalah paket CommonJS: ambil `default` bila runtime membungkusnya,
// supaya modul ini aman baik saat di-bundle maupun dijalankan sebagai ESM murni.
const ExcelJS = ((ExcelJSNs as unknown as { default?: typeof ExcelJSNs }).default ??
  ExcelJSNs) as typeof ExcelJSNs;


export type LevelImpor = "C3" | "C4";

/** Urutan kolom template — dipakai juga oleh generator .xlsx. */
export const KOLOM_IMPOR = [
  "subtes",
  "nomor",
  "tipe",
  "level",
  "stimulus",
  "pertanyaan",
  "gambar_url",
  "opsi_a",
  "opsi_b",
  "opsi_c",
  "opsi_d",
  "opsi_e",
  "kunci",
  "nilai_a",
  "nilai_b",
  "nilai_c",
  "nilai_d",
  "nilai_e",
  "pembahasan",
] as const;

export type KolomImpor = (typeof KOLOM_IMPOR)[number];

export const LEBAR_KOLOM: Record<KolomImpor, number> = {
  subtes: 10,
  nomor: 8,
  tipe: 8,
  level: 8,
  stimulus: 46,
  pertanyaan: 46,
  gambar_url: 24,
  opsi_a: 20,
  opsi_b: 20,
  opsi_c: 20,
  opsi_d: 20,
  opsi_e: 20,
  kunci: 12,
  nilai_a: 9,
  nilai_b: 9,
  nilai_c: 9,
  nilai_d: 9,
  nilai_e: 9,
  pembahasan: 40,
};

/**
 * Cara menentukan nomor soal saat berkas disimpan.
 *
 * - `berkas` — nomor diambil apa adanya dari kolom `nomor` / penomoran naskah.
 * - `lanjut` — nomor berkas diabaikan; tiap soal mengisi nomor KOSONG terkecil
 *   yang masih tersisa di subtesnya. Inilah yang membuat satu subtes boleh
 *   diunggah bertahap: naskah 20 soal PU dulu, lalu naskah 10 soal berikutnya
 *   yang di Word tetap bernomor 1-10, dan hasilnya tetap PU 1-30.
 */
export type ModeNomor = "berkas" | "lanjut";

/** Keadaan satu subtes sesudah berkas ini disimpan — untuk ringkasan pratinjau. */
export interface RekapSubtes {
  subtes: string;
  /** Sudah tersimpan di paket sebelum impor ini. */
  sudahAda: number;
  /** Akan bertambah dari berkas ini. */
  ditambah: number;
  kuota: number;
}

export interface BarisImpor {
  /** Nomor baris pada berkas asal (termasuk baris judul). */
  baris: number;
  subtes: string;
  nomor: number;
  /** Nomor sebagaimana tertulis di berkas, sebelum penomoran ulang. */
  nomorBerkas: number;
  /** Nomornya digeser oleh mode "lanjut" karena nomor berkas sudah terpakai. */
  dinomoriUlang: boolean;
  /**
   * Isi pertanyaannya sudah ada di subtes yang sama pada paket ini (atau
   * terulang di dalam berkas ini sendiri). Hanya ditandai pada mode "lanjut",
   * dan barisnya sengaja tidak disimpan supaya mengunggah berkas yang sama dua
   * kali tidak menggandakan soal.
   */
  kembar: boolean;
  tipe: TipeSoal;
  level: LevelImpor;
  stimulus: string;
  pertanyaan: string;
  gambar_url: string;
  opsi: string[];
  /** Sudah dalam format kolom `kunci` di basis data. */
  kunci: string;
  kunciMentah: string;
  /** Nilai tiap pilihan untuk butir TKP; kosong untuk soal biasa. */
  bobot: number[];
  pembahasan: string;
  galat: string[];
  /** Sudah ada soal dengan (subtes, nomor) yang sama di paket ini. */
  sudahAda: boolean;
}

export interface HasilParse {
  baris: BarisImpor[];
  jumlahValid: number;
  jumlahGalat: number;
  jumlahBentrok: number;
  /** Baris sehat yang dilewati karena soalnya sudah ada (mode "lanjut"). */
  jumlahKembar: number;
  kolomHilang: string[];
  /** Galat tingkat berkas (format salah, sheet kosong, dll). */
  errorFile?: string;
  /**
   * Hal yang perlu diperiksa mata admin tapi tidak menggagalkan impor —
   * terutama dari naskah Word, yang strukturnya harus ditebak dari tata letak.
   */
  catatan?: string[];
  /** Bentuk berkas yang terbaca, untuk ditampilkan di pratinjau. */
  sumber?: "tabel" | "naskah-word";
  /** Mode penomoran yang dipakai saat berkas ini dibaca. */
  modeNomor?: ModeNomor;
  /** Kelengkapan tiap subtes yang tersentuh berkas ini, sesudah disimpan. */
  rekapSubtes?: RekapSubtes[];
}

export interface HasilSimpanImpor {
  disimpan: number;
  diperbarui: number;
  dilewati: number;
  error?: string;
}

/* ==========================================================================
   PEMETAAN NILAI
   ========================================================================== */

const ALIAS_SUBTES: Record<string, string> = {
  pu: "PU",
  "penalaran umum": "PU",
  ppu: "PPU",
  "pengetahuan umum": "PPU",
  "pengetahuan dan pemahaman umum": "PPU",
  pbm: "PBM",
  "bacaan dan menulis": "PBM",
  "pemahaman bacaan dan menulis": "PBM",
  "kemampuan memahami bacaan dan menulis": "PBM",
  pk: "PK",
  kuantitatif: "PK",
  "pengetahuan kuantitatif": "PK",
  lbind: "LBIND",
  "lit indonesia": "LBIND",
  "literasi indonesia": "LBIND",
  "literasi bahasa indonesia": "LBIND",
  "literasi dalam bahasa indonesia": "LBIND",
  lbing: "LBING",
  "lit inggris": "LBING",
  "literasi inggris": "LBING",
  "literasi bahasa inggris": "LBING",
  "literasi dalam bahasa inggris": "LBING",
  pm: "PM",
  "penalaran matematika": "PM",
};

const ALIAS_KOLOM: Record<string, KolomImpor> = {
  subtes: "subtes",
  sub_tes: "subtes",
  nomor: "nomor",
  no: "nomor",
  nomor_soal: "nomor",
  tipe: "tipe",
  bentuk: "tipe",
  tipe_soal: "tipe",
  level: "level",
  level_kognitif: "level",
  stimulus: "stimulus",
  bacaan: "stimulus",
  pertanyaan: "pertanyaan",
  soal: "pertanyaan",
  gambar_url: "gambar_url",
  gambar: "gambar_url",
  url_gambar: "gambar_url",
  opsi_a: "opsi_a",
  a: "opsi_a",
  pilihan_a: "opsi_a",
  opsi_b: "opsi_b",
  b: "opsi_b",
  pilihan_b: "opsi_b",
  opsi_c: "opsi_c",
  c: "opsi_c",
  pilihan_c: "opsi_c",
  opsi_d: "opsi_d",
  d: "opsi_d",
  pilihan_d: "opsi_d",
  opsi_e: "opsi_e",
  e: "opsi_e",
  pilihan_e: "opsi_e",
  kunci: "kunci",
  nilai_a: "nilai_a",
  nilai_b: "nilai_b",
  nilai_c: "nilai_c",
  nilai_d: "nilai_d",
  nilai_e: "nilai_e",
  bobot_a: "nilai_a",
  bobot_b: "nilai_b",
  bobot_c: "nilai_c",
  bobot_d: "nilai_d",
  bobot_e: "nilai_e",
  kunci_jawaban: "kunci",
  jawaban: "kunci",
  pembahasan: "pembahasan",
  penjelasan: "pembahasan",
};

function normalKolom(v: string): string {
  return v
    .toLowerCase()
    .replace(/﻿/g, "")
    .trim()
    .replace(/[\s.\-/]+/g, "_")
    .replace(/_+/g, "_");
}

function normalSubtes(v: string): string | null {
  const k = v.toLowerCase().trim().replace(/\s+/g, " ");
  if (!k) return null;
  const langsung = ALIAS_SUBTES[k];
  if (langsung) return langsung;
  const kode = k.toUpperCase();
  return SEMUA_KODE_SUBTES.includes(kode) ? kode : null;
}

/**
 * Berapa soal yang dituntut satu subtes.
 *
 * Kedua jalur ditanyakan, bukan hanya UTBK: berkas SKD memakai kode TWK/TIU/TKP
 * yang tidak ada di daftar `SUBTES`, dan kalau kuotanya jatuh ke 0 seluruh
 * barisnya tervonis "melebihi kuota" — impor SKD jadi mustahil.
 */
function kuotaSubtes(kode: string): number {
  return getSubtes(kode)?.jumlahSoal ?? getSubtesSkd(kode)?.jumlahSoal ?? 0;
}

/**
 * Sidik jari isi satu soal, untuk mengenali soal yang sama diunggah dua kali.
 *
 * Hanya pertanyaannya yang dibandingkan, bukan bacaan pengantarnya: beberapa
 * soal memang berbagi satu bacaan, dan itu bukan tanda kembar. Penandaan tebal/
 * miring dibuang supaya naskah yang sama tapi diformat ulang tetap terbaca sama.
 */
function sidikSoal(pertanyaan: string, opsi: string[] = []): string {
  // Pilihan ikut disidik, bacaan tidak: soal Benar/Salah dan soal berpilihan
  // pernyataan lazim memakai kalimat tanya yang persis sama ("Berdasarkan
  // teks di atas, tentukan benar atau salah…") — yang membedakannya justru
  // pernyataannya. Dulu tiga soal BS naskah PM 4 September dianggap satu soal
  // dan dua di antaranya dilewati diam-diam. Bacaan sengaja tetap di luar:
  // beberapa soal memang berbagi satu bacaan.
  const polos = (v: string) =>
    v
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const isiOpsi = opsi.map(polos).filter(Boolean).join(" | ");
  return isiOpsi ? `${polos(pertanyaan)} || ${isiOpsi}` : polos(pertanyaan);
}

/** Kolom `opsi` di basis data tersimpan sebagai JSON; yang rusak dianggap kosong. */
function opsiDariDb(mentah: string | null | undefined): string[] {
  if (!mentah) return [];
  try {
    const v: unknown = JSON.parse(mentah);
    return Array.isArray(v) ? v.map((x) => String(x ?? "")) : [];
  } catch {
    return [];
  }
}

function normalTipe(v: string): TipeSoal | null {
  const k = v.toUpperCase().trim();
  if (!k) return "PG";
  if (k === "PG" || k === "PILIHAN GANDA") return "PG";
  if (k === "PGK" || k === "PILIHAN GANDA KOMPLEKS") return "PGK";
  if (k === "IS" || k === "ISIAN" || k === "ISIAN SINGKAT") return "IS";
  if (k === "BS" || k === "B/S" || k === "BENAR SALAH" || k === "BENAR-SALAH") return "BS";
  return null;
}

function normalLevel(v: string): LevelImpor | null {
  const k = v.toUpperCase().trim().replace(/\s+/g, "");
  if (!k) return "C3";
  if (k === "C3" || k === "3") return "C3";
  if (k === "C4" || k === "4") return "C4";
  return null;
}

/** Pecah kunci mentah menjadi daftar huruf: "A,C" · "AC" · "A dan C" · ["A","C"]. */
function hurufKunci(mentah: string): string[] {
  const v = mentah.trim();
  if (!v) return [];
  if (v.startsWith("[")) {
    try {
      const p: unknown = JSON.parse(v);
      if (Array.isArray(p)) return p.map((x) => String(x).trim().toUpperCase()).filter(Boolean);
    } catch {
      /* lanjut ke pemisahan manual */
    }
  }
  const potong = v
    .toUpperCase()
    .split(/[,;/|]|\s+DAN\s+|\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (potong.length === 1 && /^[A-E]{2,5}$/.test(potong[0])) return potong[0].split("");
  return potong;
}

/* ==========================================================================
   PEMBACA BERKAS
   ========================================================================== */

function tebakPemisah(baris: string): string {
  const kandidat = [",", ";", "\t"];
  let terbaik = ",";
  let maks = -1;
  for (const c of kandidat) {
    const n = baris.split(c).length - 1;
    if (n > maks) {
      maks = n;
      terbaik = c;
    }
  }
  return terbaik;
}

/** Parser CSV sederhana yang menghormati tanda kutip ganda (RFC 4180). */
export function parseCsv(teks: string): string[][] {
  const t = teks.replace(/^﻿/, "");
  const pemisah = tebakPemisah(t.split(/\r?\n/, 1)[0] ?? "");
  const hasil: string[][] = [];
  let baris: string[] = [];
  let sel = "";
  let dalamKutip = false;

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (dalamKutip) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          sel += '"';
          i++;
        } else {
          dalamKutip = false;
        }
      } else {
        sel += c;
      }
      continue;
    }
    if (c === '"') {
      dalamKutip = true;
      continue;
    }
    if (c === pemisah) {
      baris.push(sel);
      sel = "";
      continue;
    }
    if (c === "\n") {
      baris.push(sel);
      hasil.push(baris);
      baris = [];
      sel = "";
      continue;
    }
    if (c === "\r") continue;
    sel += c;
  }
  if (sel !== "" || baris.length > 0) {
    baris.push(sel);
    hasil.push(baris);
  }
  return hasil;
}

/** Satu baris berkas beserta nomor baris aslinya (untuk pesan galat). */
interface BarisMentah {
  nomorBaris: number;
  sel: string[];
}

function tidakKosong(sel: string[]): boolean {
  return sel.some((c) => (c ?? "").trim() !== "");
}

function teksSel(v: CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const o = v as unknown as Record<string, unknown>;
  if (Array.isArray(o.richText)) {
    return (o.richText as Array<{ text?: string }>).map((r) => r.text ?? "").join("");
  }
  if ("result" in o) return teksSel(o.result as CellValue);
  if ("text" in o) return String(o.text ?? "");
  if ("hyperlink" in o) return String(o.hyperlink ?? "");
  return String(v);
}

function sheetKeMatriks(ws: Worksheet): BarisMentah[] {
  const hasil: BarisMentah[] = [];
  ws.eachRow({ includeEmpty: false }, (row, nomorBaris) => {
    const nilai = row.values as CellValue[];
    // exceljs memakai indeks 1-based pada row.values
    const sel: string[] = [];
    for (let i = 1; i < nilai.length; i++) sel.push(teksSel(nilai[i]));
    if (tidakKosong(sel)) hasil.push({ nomorBaris, sel });
  });
  return hasil;
}

async function bacaMatriks(namaFile: string, data: ArrayBuffer): Promise<BarisMentah[]> {
  const ext = namaFile.toLowerCase().split(".").pop() ?? "";
  if (ext === "csv" || ext === "txt") {
    return parseCsv(new TextDecoder("utf-8").decode(data))
      .map((sel, i) => ({ nomorBaris: i + 1, sel }))
      .filter((b) => tidakKosong(b.sel));
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(data);
  const lembar =
    wb.worksheets.find((w) => normalKolom(w.name) === "soal") ??
    wb.worksheets.find((w) => normalKolom(w.name) !== "petunjuk") ??
    wb.worksheets[0];
  if (!lembar) throw new Error("Berkas Excel tidak punya lembar kerja.");
  return sheetKeMatriks(lembar);
}

/* ==========================================================================
   PARSING + VALIDASI
   ========================================================================== */

interface KonteksBentrok {
  packageId?: number;
  /** Dipakai menamai folder gambar naskah Word: `public/soal/<kode>/`. */
  kodePaket?: string;
  /**
   * Gambar dari naskah Word baru benar-benar ditulis ke disk pada tahap simpan.
   * Saat pratinjau, berkasnya cukup ditandai supaya folder `public/` tidak
   * dipenuhi gambar dari naskah yang ternyata batal diimpor.
   */
  simpanGambar?: boolean;
  /**
   * Subtes awal untuk naskah Word yang tidak memuat judul bagian sama sekali —
   * lazim pada berkas per guru yang seluruhnya berisi satu subtes. Judul di
   * dalam naskah tetap menang bila ada.
   */
  subtesBawaan?: string;
  /**
   * Kunci yang diketik admin sendiri di layar pratinjau, dikunci pada nomor
   * urut baris. Dipakai untuk naskah yang kuncinya memang tidak tertulis di
   * berkas — admin mengisinya langsung di sebelah barisnya, tanpa perlu
   * menyunting Word lalu mengunggah ulang.
   */
  kunciManual?: Record<number, string>;
  /**
   * Cara menentukan nomor soal. Bawaannya `berkas` supaya pemanggil lama —
   * termasuk pemeriksa — tidak berubah perilakunya.
   */
  modeNomor?: ModeNomor;
}

/**
 * Ubah butir hasil pembacaan naskah Word menjadi matriks yang bentuknya sama
 * persis dengan berkas Excel template — sehingga seluruh validasi, pratinjau,
 * dan penyimpanan di bawah ini tidak perlu tahu asal berkasnya.
 */
function naskahKeMatriks(butir: ButirNaskah[]): BarisMentah[] {
  const matriks: BarisMentah[] = [{ nomorBaris: 1, sel: [...KOLOM_IMPOR] }];
  butir.forEach((b, i) => {
    const opsi = [0, 1, 2, 3, 4].map((n) => b.opsi[n] ?? "");
    const nilai = [0, 1, 2, 3, 4].map((n) => b.nilai[n] ?? "");
    matriks.push({
      // Nomor baris di sini = urutan soal, bukan baris berkas: naskah Word
      // tidak punya baris, dan inilah rujukan yang berguna bagi admin.
      nomorBaris: i + 1,
      sel: [
        b.subtes,
        b.nomor,
        b.tipe,
        b.level,
        b.stimulus,
        b.pertanyaan,
        b.gambar_url,
        ...opsi,
        b.kunci,
        ...nilai,
        b.pembahasan,
      ],
    });
  });
  return matriks;
}

export async function parseFileImpor(
  namaFile: string,
  data: ArrayBuffer,
  konteks: KonteksBentrok = {},
): Promise<HasilParse> {
  const ekstensi = namaFile.toLowerCase().split(".").pop() ?? "";
  const dariWord = ekstensi === "docx";

  let matriks: BarisMentah[];
  let catatan: string[] = [];
  try {
    if (dariWord) {
      const naskah = await bacaNaskahDocx(data, {
        kodePaket: konteks.kodePaket ?? "naskah",
        simpanGambar: konteks.simpanGambar ?? false,
        subtesBawaan: konteks.subtesBawaan ?? "",
      });
      matriks = naskahKeMatriks(naskah.butir);
      catatan = naskah.catatan;
    } else {
      matriks = await bacaMatriks(namaFile, data);
    }
  } catch (e) {
    return {
      baris: [],
      jumlahValid: 0,
      jumlahGalat: 0,
      jumlahBentrok: 0,
      jumlahKembar: 0,
      kolomHilang: [],
      errorFile: `Berkas tidak bisa dibaca: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  if (matriks.length < 2) {
    return {
      baris: [],
      jumlahValid: 0,
      jumlahGalat: 0,
      jumlahBentrok: 0,
      jumlahKembar: 0,
      kolomHilang: [],
      catatan,
      sumber: dariWord ? "naskah-word" : "tabel",
      errorFile: dariWord
        ? "Tidak ada soal yang terbaca dari naskah Word ini. Pastikan tiap soal diawali penomoran seperti \"1.\" dan tiap pilihan diawali \"A.\"."
        : "Berkas kosong atau hanya berisi baris judul kolom.",
    };
  }

  const judul = matriks[0].sel.map((h) => normalKolom(h));
  const petaKolom = new Map<KolomImpor, number>();
  judul.forEach((h, i) => {
    const k = ALIAS_KOLOM[h];
    if (k && !petaKolom.has(k)) petaKolom.set(k, i);
  });

  const wajib: KolomImpor[] = ["subtes", "nomor", "pertanyaan", "kunci"];
  const kolomHilang = wajib.filter((k) => !petaKolom.has(k));
  if (kolomHilang.length) {
    return {
      baris: [],
      jumlahValid: 0,
      jumlahGalat: 0,
      jumlahBentrok: 0,
      jumlahKembar: 0,
      kolomHilang,
      errorFile: `Kolom wajib belum ada di berkas: ${kolomHilang.join(", ")}. Unduh templatenya dulu, ya.`,
    };
  }

  // Kunci ketikan admin ditimpakan ke matriks SEBELUM validasi, supaya baris
  // itu ikut dinilai dengan aturan yang sama persis seperti kunci dari berkas.
  const kolomKunci = petaKolom.get("kunci");
  if (kolomKunci !== undefined && konteks.kunciManual) {
    for (let i = 1; i < matriks.length; i++) {
      const isian = konteks.kunciManual[matriks[i].nomorBaris]?.trim();
      if (isian) matriks[i].sel[kolomKunci] = isian;
    }
  }

  const ambil = (baris: string[], kolom: KolomImpor): string => {
    const i = petaKolom.get(kolom);
    if (i === undefined) return "";
    return (baris[i] ?? "").toString().trim();
  };

  const modeNomor: ModeNomor = konteks.modeNomor === "lanjut" ? "lanjut" : "berkas";

  // Nomor yang sudah ada di basis data (untuk menandai bentrok), beserta isi
  // pertanyaannya — dipakai mode "lanjut" untuk mengenali soal yang sudah masuk.
  const sudahAdaDb = new Set<string>();
  const terpakaiPerSubtes = new Map<string, Set<number>>();
  const isiDb = new Map<string, number>();
  const jumlahDb = new Map<string, number>();
  if (konteks.packageId) {
    for (const r of await all<{ subtes: string; nomor: number; pertanyaan: string; opsi: string | null }>(
      "SELECT subtes, nomor, pertanyaan, opsi FROM questions WHERE package_id = ?",
      konteks.packageId,
    )) {
      const n = Number(r.nomor);
      sudahAdaDb.add(`${r.subtes}#${n}`);
      if (!terpakaiPerSubtes.has(r.subtes)) terpakaiPerSubtes.set(r.subtes, new Set());
      terpakaiPerSubtes.get(r.subtes)!.add(n);
      jumlahDb.set(r.subtes, (jumlahDb.get(r.subtes) ?? 0) + 1);
      const sidik = sidikSoal(r.pertanyaan ?? "", opsiDariDb(r.opsi));
      if (sidik && !isiDb.has(`${r.subtes}#${sidik}`)) isiDb.set(`${r.subtes}#${sidik}`, n);
    }
  }

  /**
   * Ambil nomor kosong terkecil yang masih tersisa di satu subtes, lalu
   * tandai terpakai. Sengaja MENGISI LUBANG, bukan sekadar melanjutkan dari
   * nomor terbesar: kalau satu soal pernah dihapus, unggahan berikutnya
   * menambalnya, sehingga subtes benar-benar bisa dipenuhi sampai kuota.
   */
  const ambilNomorKosong = (subtes: string): number | null => {
    const kuota = kuotaSubtes(subtes);
    if (!terpakaiPerSubtes.has(subtes)) terpakaiPerSubtes.set(subtes, new Set());
    const terpakai = terpakaiPerSubtes.get(subtes)!;
    for (let n = 1; n <= kuota; n++) {
      if (!terpakai.has(n)) {
        terpakai.add(n);
        return n;
      }
    }
    return null;
  };

  const terlihat = new Map<string, number>();
  const isiBerkas = new Map<string, number>();
  const ditambahPerSubtes = new Map<string, number>();
  const hasil: BarisImpor[] = [];

  for (let i = 1; i < matriks.length; i++) {
    const raw = matriks[i].sel;
    const galat: string[] = [];
    const nomorBaris = matriks[i].nomorBaris;

    const subtesMentah = ambil(raw, "subtes");
    const subtes = normalSubtes(subtesMentah);
    if (!subtes) galat.push(`Subtes "${subtesMentah || "(kosong)"}" tidak dikenal.`);

    const nomorMentah = ambil(raw, "nomor");
    const nomor = Number.parseInt(nomorMentah.replace(/[^\d-]/g, ""), 10);
    // Pada mode "lanjut" nomor berkas cuma keterangan: nomor sesungguhnya
    // dibagikan sendiri di bawah, sesudah ketahuan barisnya sehat dan bukan
    // soal kembar. Naskah susulan yang di Word tetap bernomor 1 pun lolos.
    if (modeNomor === "berkas") {
      if (!Number.isInteger(nomor) || nomor < 1) {
        galat.push(`Nomor "${nomorMentah || "(kosong)"}" bukan bilangan bulat yang sah.`);
      } else if (subtes) {
        const kuota = kuotaSubtes(subtes);
        if (nomor > kuota) galat.push(`Nomor ${nomor} melebihi kuota ${subtes} (${kuota} soal).`);
      }
    }

    const tipe = normalTipe(ambil(raw, "tipe"));
    if (!tipe) galat.push(`Tipe "${ambil(raw, "tipe")}" tidak dikenal (pakai PG, PGK, BS, atau IS).`);
    const level = normalLevel(ambil(raw, "level"));
    if (!level) galat.push(`Level "${ambil(raw, "level")}" tidak dikenal (pakai C3 atau C4).`);

    const pertanyaan = ambil(raw, "pertanyaan");
    if (!pertanyaan) galat.push("Pertanyaan kosong.");

    const opsi = [
      ambil(raw, "opsi_a"),
      ambil(raw, "opsi_b"),
      ambil(raw, "opsi_c"),
      ambil(raw, "opsi_d"),
      ambil(raw, "opsi_e"),
    ];
    while (opsi.length > 0 && opsi[opsi.length - 1] === "") opsi.pop();

    const kunciMentah = ambil(raw, "kunci");
    const tipeAman: TipeSoal = tipe ?? "PG";
    let kunci = "";

    if (!kunciMentah) {
      galat.push("Kunci jawaban kosong.");
    } else if (tipeAman === "IS") {
      kunci = kunciMentah;
    } else if (tipeAman === "BS") {
      // Kunci Benar/Salah: "B,S,B" atau "B-S-B", sejajar dengan pernyataan di kolom opsi.
      const nilai = kunciMentah
        .split(/[,;\-–\s]+/)
        .map((v) => v.trim().toUpperCase())
        .filter(Boolean);
      const pernyataan = opsi.filter((o) => o.trim()).length;
      if (nilai.some((v) => v !== "B" && v !== "S")) {
        galat.push(`Kunci Benar/Salah hanya boleh B atau S, tertulis "${kunciMentah}".`);
      } else if (nilai.length !== pernyataan) {
        galat.push(
          `Jumlah kunci B/S (${nilai.length}) tidak sama dengan jumlah pernyataan (${pernyataan}).`,
        );
      } else {
        kunci = JSON.stringify(nilai);
      }
      if (pernyataan < 2) galat.push("Pernyataan Benar/Salah kurang dari dua.");
    } else {
      const huruf = Array.from(new Set(hurufKunci(kunciMentah))).sort();
      if (huruf.length === 0) {
        galat.push("Kunci jawaban kosong.");
      } else {
        if (tipeAman === "PG" && huruf.length > 1) {
          galat.push(`Tipe PG hanya boleh satu kunci, tertulis "${kunciMentah}".`);
        }
        for (const h of huruf) {
          const idx = LABEL_OPSI.indexOf(h as (typeof LABEL_OPSI)[number]);
          if (idx < 0) galat.push(`Kunci "${h}" bukan huruf A-E.`);
          else if (idx >= opsi.length || !opsi[idx]) galat.push(`Kunci ${h} tidak ada di antara opsi.`);
        }
        kunci = tipeAman === "PGK" ? JSON.stringify(huruf) : huruf[0];
      }
      if (opsi.filter(Boolean).length < 2) galat.push("Opsi jawaban kurang dari dua.");
    }

    if (modeNomor === "berkas" && subtes && Number.isInteger(nomor)) {
      const kunciUnik = `${subtes}#${nomor}`;
      const sebelumnya = terlihat.get(kunciUnik);
      if (sebelumnya) {
        galat.push(`Nomor ganda di dalam berkas (bentrok dengan baris ${sebelumnya}).`);
      } else {
        terlihat.set(kunciUnik, nomorBaris);
      }
    }

    // TKP dinilai 1-5 per pilihan, bukan benar/salah. Kolom nilai_a..nilai_e
    // hanya dibaca untuk butir TKP; di subtes lain diabaikan.
    const bobot: number[] = [];
    if (subtes === "TKP") {
      const kolomNilai = ["nilai_a", "nilai_b", "nilai_c", "nilai_d", "nilai_e"] as const;
      const terisi = kolomNilai.map((k) => ambil(raw, k)).filter((v) => v !== "").length;

      if (terisi === 0) {
        galat.push(
          "Butir TKP wajib punya kolom nilai_a sampai nilai_e (masing-masing 1-5).",
        );
      } else {
        opsi.forEach((_, i) => {
          const mentah = ambil(raw, kolomNilai[i]);
          const n = Number(mentah);
          if (mentah === "" || !Number.isFinite(n)) {
            galat.push(`Nilai pilihan ${LABEL_OPSI[i]} pada butir TKP belum diisi.`);
            bobot.push(0);
            return;
          }
          if (n < TKP_MIN || n > TKP_MAKS) {
            galat.push(
              `Nilai pilihan ${LABEL_OPSI[i]} harus antara ${TKP_MIN} dan ${TKP_MAKS}, tertulis "${mentah}".`,
            );
          }
          bobot.push(Math.round(n));
        });
      }
    }

    const nomorBerkas = Number.isInteger(nomor) && nomor > 0 ? nomor : 0;
    let nomorPakai = nomorBerkas;
    let kembar = false;

    if (modeNomor === "lanjut" && subtes) {
      // Soal yang isinya sudah masuk paket — atau terulang di berkas ini —
      // tidak diberi nomor dan tidak disimpan. Tanpa penjagaan ini, mengunggah
      // ulang berkas yang sama akan menggandakan seluruh soalnya.
      const sidik = sidikSoal(pertanyaan, opsi);
      const kunciIsi = `${subtes}#${sidik}`;
      if (sidik && isiDb.has(kunciIsi)) {
        kembar = true;
        nomorPakai = isiDb.get(kunciIsi)!;
        galat.push(`Soal ini sudah ada di paket sebagai ${subtes} nomor ${nomorPakai}.`);
      } else if (sidik && isiBerkas.has(kunciIsi)) {
        kembar = true;
        galat.push(`Soal ini terulang di berkas yang sama (baris ${isiBerkas.get(kunciIsi)}).`);
      } else if (galat.length === 0) {
        const baru = ambilNomorKosong(subtes);
        if (baru === null) {
          const kuota = kuotaSubtes(subtes);
          galat.push(
            `Kuota ${subtes} sudah penuh (${kuota} soal). Hapus dulu soal yang tidak dipakai di bank soal.`,
          );
        } else {
          nomorPakai = baru;
          if (sidik) isiBerkas.set(kunciIsi, nomorBaris);
          ditambahPerSubtes.set(subtes, (ditambahPerSubtes.get(subtes) ?? 0) + 1);
        }
      }
    }

    hasil.push({
      baris: nomorBaris,
      subtes: subtes ?? subtesMentah,
      nomor: nomorPakai,
      nomorBerkas,
      dinomoriUlang: modeNomor === "lanjut" && !kembar && nomorPakai !== nomorBerkas,
      kembar,
      tipe: tipeAman,
      level: level ?? "C3",
      stimulus: ambil(raw, "stimulus"),
      pertanyaan,
      gambar_url: ambil(raw, "gambar_url"),
      opsi,
      kunci,
      kunciMentah,
      bobot,
      pembahasan: ambil(raw, "pembahasan"),
      galat,
      sudahAda: subtes ? sudahAdaDb.has(`${subtes}#${nomorPakai}`) : false,
    });
  }

  // Ringkasan per subtes: berapa yang sudah ada, berapa yang berkas ini
  // tambahkan, dan berapa yang masih kurang dari kuota resminya.
  const rekapSubtes: RekapSubtes[] = [];
  const subtesTersentuh = new Set(
    hasil.filter((b) => kuotaSubtes(b.subtes) > 0).map((b) => b.subtes),
  );
  for (const kode of subtesTersentuh) {
    rekapSubtes.push({
      subtes: kode,
      sudahAda: jumlahDb.get(kode) ?? 0,
      ditambah:
        modeNomor === "lanjut"
          ? (ditambahPerSubtes.get(kode) ?? 0)
          : hasil.filter((b) => b.subtes === kode && b.galat.length === 0 && !b.sudahAda).length,
      kuota: kuotaSubtes(kode),
    });
  }

  return {
    baris: hasil,
    jumlahValid: hasil.filter((b) => b.galat.length === 0 && !b.kembar).length,
    // Soal kembar bukan naskah yang rusak — ia hanya dilewati, jadi sengaja
    // dihitung terpisah supaya pratinjau tidak terlihat merah tanpa sebab.
    jumlahGalat: hasil.filter((b) => b.galat.length > 0 && !b.kembar).length,
    jumlahKembar: hasil.filter((b) => b.kembar).length,
    jumlahBentrok: hasil.filter((b) => b.galat.length === 0 && !b.kembar && b.sudahAda).length,
    kolomHilang: [],
    catatan,
    sumber: dariWord ? "naskah-word" : "tabel",
    modeNomor,
    rekapSubtes,
  };
}

/* ==========================================================================
   PENYIMPANAN
   ========================================================================== */

export async function simpanHasilImpor(
  packageId: number,
  baris: BarisImpor[],
  timpa: boolean,
): Promise<HasilSimpanImpor> {
  // Baris kembar sudah punya galat sendiri; `!b.kembar` di sini hanya penjaga
  // kedua supaya soal yang sudah ada tidak pernah masuk dua kali.
  const valid = baris.filter((b) => b.galat.length === 0 && !b.kembar);
  if (valid.length === 0) return { disimpan: 0, diperbarui: 0, dilewati: 0, error: "Tidak ada baris yang bisa disimpan." };

  let disimpan = 0;
  let diperbarui = 0;
  let dilewati = 0;

  try {
    await tx(async () => {
      for (const b of valid) {
        const ada = await one<{ id: number }>(
          "SELECT id FROM questions WHERE package_id = ? AND subtes = ? AND nomor = ?",
          packageId,
          b.subtes,
          b.nomor,
        );
        const opsiJson = JSON.stringify(b.tipe === "IS" ? [] : b.opsi);
        const bobotJson = b.bobot.length > 0 ? JSON.stringify(b.bobot) : null;
        if (ada) {
          if (!timpa) {
            dilewati++;
            continue;
          }
          await run(
            `UPDATE questions SET tipe = ?, level = ?, stimulus = ?, pertanyaan = ?,
                    gambar_url = ?, opsi = ?, bobot_opsi = ?, kunci = ?, pembahasan = ?
              WHERE id = ?`,
            b.tipe,
            b.level,
            b.stimulus || null,
            b.pertanyaan,
            b.gambar_url || null,
            opsiJson,
            bobotJson,
            b.kunci,
            b.pembahasan || null,
            ada.id,
          );
          diperbarui++;
        } else {
          await run(
            `INSERT INTO questions (package_id, subtes, nomor, tipe, level, stimulus, pertanyaan,
                                    gambar_url, opsi, bobot_opsi, kunci, pembahasan)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            packageId,
            b.subtes,
            b.nomor,
            b.tipe,
            b.level,
            b.stimulus || null,
            b.pertanyaan,
            b.gambar_url || null,
            opsiJson,
            bobotJson,
            b.kunci,
            b.pembahasan || null,
          );
          disimpan++;
        }
      }
    });
  } catch (e) {
    return {
      disimpan: 0,
      diperbarui: 0,
      dilewati: 0,
      error: `Gagal menyimpan: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  return { disimpan, diperbarui, dilewati };
}

/* ==========================================================================
   PEMBUAT BERKAS .XLSX
   ========================================================================== */

const HIJAU = "FF0D6E6A";

function pasangJudul(ws: Worksheet) {
  ws.columns = KOLOM_IMPOR.map((k) => ({ header: k, key: k, width: LEBAR_KOLOM[k] }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HIJAU } };
  head.alignment = { vertical: "middle" };
  head.height = 22;
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

const PETUNJUK: Array<[string, string]> = [
  [
    "subtes",
    "UTBK: PU, PPU, PBM, PK, LBIND, LBING, PM. SKD Kedinasan: TWK, TIU, TKP. Nama panjang juga diterima.",
  ],
  ["nomor", "Nomor soal di dalam subtes, mulai 1. Harus unik per (paket, subtes)."],
  ["tipe", "PG = pilihan ganda · PGK = pilihan ganda kompleks · IS = isian singkat. Kosong dianggap PG."],
  ["level", "C3 atau C4. Kosong dianggap C3. Target juknis: C3 60%, C4 40%."],
  ["stimulus", "Bacaan/teks pengantar. Boleh dikosongkan."],
  ["pertanyaan", "Wajib diisi."],
  ["gambar_url", "Alamat gambar (https://...). Boleh dikosongkan."],
  ["opsi_a - opsi_e", "Teks pilihan jawaban. Kosongkan seluruhnya untuk tipe IS."],
  ["kunci", 'PG: satu huruf (mis. B). PGK: beberapa huruf dipisah koma (mis. "A,C"). IS: teks jawaban.'],
  [
    "nilai_a - nilai_e",
    "KHUSUS SUBTES TKP: nilai tiap pilihan, 1 sampai 5. Wajib diisi semua untuk butir TKP, dan diabaikan pada subtes lain. Kolom kunci pada TKP diisi huruf pilihan bernilai tertinggi.",
  ],
  ["pembahasan", "Penjelasan jawaban. Boleh dikosongkan."],
];

const CONTOH: Record<KolomImpor, string | number> = {
  subtes: "PU",
  nomor: 1,
  tipe: "PG",
  level: "C3",
  stimulus:
    "Semua siswa kelas XII mengikuti tryout. Sebagian siswa yang mengikuti tryout memilih jurusan Saintek.",
  pertanyaan: "Simpulan yang paling tepat berdasarkan pernyataan di atas adalah ...",
  gambar_url: "",
  nilai_a: "",
  nilai_b: "",
  nilai_c: "",
  nilai_d: "",
  nilai_e: "",
  opsi_a: "Semua siswa kelas XII memilih Saintek.",
  opsi_b: "Sebagian siswa kelas XII memilih Saintek.",
  opsi_c: "Tidak ada siswa kelas XII yang memilih Saintek.",
  opsi_d: "Semua peserta tryout bukan siswa kelas XII.",
  opsi_e: "Sebagian peserta tryout tidak mengikuti tryout.",
  kunci: "B",
  pembahasan: "Kuantor sebagian pada premis kedua membuat simpulan yang sah juga berkuantor sebagian.",
};

/** Template impor: sheet "Soal" (judul + 1 baris contoh) dan sheet "Petunjuk". */
export async function bukuTemplate(): Promise<Uint8Array<ArrayBuffer>> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ADZKIA SMART";
  wb.created = new Date();

  const ws = wb.addWorksheet("Soal");
  pasangJudul(ws);
  const contoh = ws.addRow(CONTOH);
  contoh.alignment = { wrapText: true, vertical: "top" };

  const wp = wb.addWorksheet("Petunjuk");
  wp.columns = [
    { header: "Kolom", key: "kolom", width: 20 },
    { header: "Penjelasan", key: "isi", width: 96 },
  ];
  const kepala = wp.getRow(1);
  kepala.font = { bold: true, color: { argb: "FFFFFFFF" } };
  kepala.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HIJAU } };

  wp.addRow({ kolom: "CARA PAKAI", isi: "Isi sheet \"Soal\" mulai baris ke-2. Hapus baris contoh sebelum mengunggah." });
  wp.addRow({ kolom: "", isi: "Satu baris = satu butir soal. Unggah kembali berkas ini di menu Impor Soal." });
  wp.addRow({ kolom: "", isi: "Pratinjau akan menampilkan galat per baris sebelum data benar-benar disimpan." });
  wp.addRow({ kolom: "", isi: "" });
  for (const [kolom, isi] of PETUNJUK) wp.addRow({ kolom, isi });
  wp.addRow({ kolom: "", isi: "" });
  wp.addRow({ kolom: "KUOTA SOAL", isi: SUBTES.map((s) => `${s.kode} ${s.jumlahSoal}`).join(" · ") + " — total 160 soal." });
  wp.getColumn("isi").alignment = { wrapText: true, vertical: "top" };

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}

export interface SoalEkspor {
  subtes: string;
  nomor: number;
  tipe: string;
  level: string;
  stimulus: string | null;
  pertanyaan: string;
  gambar_url: string | null;
  opsi: string;
  kunci: string;
  pembahasan: string | null;
}

/** Ekspor seluruh soal satu paket ke .xlsx dengan kolom yang sama seperti template. */
export async function bukuEksporPaket(
  paket: { kode: string; nama: string },
  soal: SoalEkspor[],
): Promise<Uint8Array<ArrayBuffer>> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "ADZKIA SMART";
  wb.created = new Date();

  const ws = wb.addWorksheet("Soal");
  pasangJudul(ws);

  for (const s of soal) {
    let opsi: string[] = [];
    try {
      const p: unknown = JSON.parse(s.opsi || "[]");
      if (Array.isArray(p)) opsi = p.map((v) => String(v));
    } catch {
      opsi = [];
    }
    let kunci = s.kunci ?? "";
    if (s.tipe === "PGK") {
      try {
        const p: unknown = JSON.parse(kunci);
        if (Array.isArray(p)) kunci = p.map((v) => String(v)).join(",");
      } catch {
        /* biarkan apa adanya */
      }
    }
    const row = ws.addRow({
      subtes: s.subtes,
      nomor: s.nomor,
      tipe: s.tipe,
      level: s.level,
      stimulus: s.stimulus ?? "",
      pertanyaan: s.pertanyaan,
      gambar_url: s.gambar_url ?? "",
      opsi_a: opsi[0] ?? "",
      opsi_b: opsi[1] ?? "",
      opsi_c: opsi[2] ?? "",
      opsi_d: opsi[3] ?? "",
      opsi_e: opsi[4] ?? "",
      kunci,
      pembahasan: s.pembahasan ?? "",
    });
    row.alignment = { wrapText: true, vertical: "top" };
  }

  const info = wb.addWorksheet("Petunjuk");
  info.columns = [
    { header: "Kolom", key: "kolom", width: 20 },
    { header: "Penjelasan", key: "isi", width: 96 },
  ];
  info.getRow(1).font = { bold: true };
  info.addRow({ kolom: "Paket", isi: `${paket.kode} — ${paket.nama}` });
  info.addRow({ kolom: "Jumlah soal", isi: String(soal.length) });
  info.addRow({ kolom: "Diunduh", isi: new Date().toISOString().slice(0, 19).replace("T", " ") });
  for (const [kolom, isi] of PETUNJUK) info.addRow({ kolom, isi });
  info.getColumn("isi").alignment = { wrapText: true, vertical: "top" };

  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}
