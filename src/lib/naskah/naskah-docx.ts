/**
 * Pembaca NASKAH SOAL berformat Word (.docx).
 *
 * Ini jembatan antara cara guru menulis soal dan cara aplikasi menyimpannya:
 * naskah diketik mengalir seperti di kertas ujian, lalu di sini dipecah
 * menjadi butir-butir yang siap masuk ke pipa impor yang sudah ada
 * (`import-soal.ts`) — pratinjau, penandaan galat, dan tombol simpan tidak
 * perlu dibuat ulang.
 *
 * ------------------------------------------------------------------
 * DUA CARA MENULIS NASKAH, KEDUANYA DITERIMA
 * ------------------------------------------------------------------
 *
 * 1. TABEL. Bila dokumen memuat tabel yang baris pertamanya berisi judul
 *    kolom template (subtes, nomor, pertanyaan, opsi_a, ..., kunci), tabel itu
 *    yang dipakai dan naskah mengalirnya diabaikan. Ini cara paling akurat.
 *
 * 2. NASKAH MENGALIR. Bila tidak ada tabel semacam itu, dokumen dibaca dari
 *    atas ke bawah dengan aturan berikut:
 *
 *      PENALARAN UMUM              -> pindah subtes (nama atau kodenya)
 *      Teks berikut untuk soal nomor 6 sampai 10.
 *      <paragraf bacaan...>        -> jadi bacaan untuk soal 6-10
 *      1. Isi pertanyaannya        -> soal baru bernomor 1
 *      A. pilihan pertama          -> opsi A (boleh juga "A)" atau daftar Word)
 *      ...
 *      Kunci: C                    -> kunci jawaban
 *      Pembahasan: ...             -> pembahasan sampai soal berikutnya
 *
 *    Baris opsional lain: `Tipe: PGK`, `Level: C4`, `Nilai: 5,3,2,1,4` (TKP).
 *
 * Gambar yang menempel di sebuah soal ikut terbawa: berkasnya disalin ke
 * `public/soal/<kode-paket>/` dan alamatnya diisikan ke kolom gambar_url.
 *
 * Modul ini hanya dipanggil dari server.
 */
import "server-only";

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { bacaDocx, jenisGambar, type BlokDocx, type ParagrafDocx, type TabelDocx } from "@/lib/naskah/docx";
import { SUBTES } from "@/lib/tryout/snbt";
import { SUBTES_SKD } from "@/lib/tryout/skd";

/* ==========================================================================
   BENTUK KELUARAN
   ========================================================================== */

/** Satu butir hasil pembacaan naskah, sejajar dengan kolom template impor. */
export interface ButirNaskah {
  subtes: string;
  nomor: string;
  tipe: string;
  level: string;
  stimulus: string;
  pertanyaan: string;
  gambar_url: string;
  opsi: string[];
  kunci: string;
  /** Nilai 1-5 tiap pilihan untuk butir TKP; kosong di subtes lain. */
  nilai: string[];
  pembahasan: string;
}

export interface HasilNaskah {
  butir: ButirNaskah[];
  /** Hal-hal yang perlu diperiksa mata admin, bukan galat yang menggagalkan. */
  catatan: string[];
  /** "tabel" atau "naskah" — ditampilkan supaya admin tahu jalur mana yang terpakai. */
  cara: "tabel" | "naskah";
}

/* ==========================================================================
   PENGENALAN POLA
   ========================================================================== */

/** Nama dan kode subtes kedua jalur, dipakai mengenali judul bagian di naskah. */
const PETA_SUBTES = new Map<string, string>();
for (const s of SUBTES) {
  PETA_SUBTES.set(s.kode.toLowerCase(), s.kode);
  PETA_SUBTES.set(s.nama.toLowerCase(), s.kode);
  PETA_SUBTES.set(s.namaPendek.toLowerCase(), s.kode);
}
for (const s of SUBTES_SKD) {
  PETA_SUBTES.set(s.kode.toLowerCase(), s.kode);
  PETA_SUBTES.set(s.nama.toLowerCase(), s.kode);
}
// Sebutan yang lazim dipakai guru tapi tidak persis sama dengan nama resminya.
const ALIAS_TAMBAHAN: Record<string, string> = {
  "penalaran umum kuantitatif": "PU",
  "penalaran umum kualitatif": "PU",
  "pengetahuan umum": "PPU",
  "pemahaman bacaan dan menulis": "PBM",
  "bacaan dan menulis": "PBM",
  "literasi bahasa indonesia": "LBIND",
  "literasi indonesia": "LBIND",
  "lit indonesia": "LBIND",
  "lit indo": "LBIND",
  "literasi bahasa inggris": "LBING",
  "literasi inggris": "LBING",
  "lit inggris": "LBING",
  "wawasan kebangsaan": "TWK",
  "intelegensia umum": "TIU",
  "karakteristik pribadi": "TKP",
};
for (const [k, v] of Object.entries(ALIAS_TAMBAHAN)) PETA_SUBTES.set(k, v);

/** Kenali paragraf yang berfungsi sebagai judul bagian subtes. */
function bacaJudulSubtes(teks: string): string | null {
  const bersih = teks
    .toLowerCase()
    .replace(/^(subtes|bagian|sub tes|tes)\s*[:.\-–]?\s*/i, "")
    .replace(/^[ivx]+\.\s*/i, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!bersih || bersih.length > 60) return null;
  return PETA_SUBTES.get(bersih) ?? null;
}

// Angka diikuti titik lalu LANGSUNG angka lagi ("1.800", "2.000.000") adalah
// pemisah ribuan, bukan nomor soal — dulu tiap pilihan seperti itu terbaca
// sebagai soal baru dan soal aslinya kehilangan seluruh pilihannya.
const POLA_NOMOR_SOAL = /^(\d{1,3})\s*[.)](?!\d)\s*([\s\S]*)$/;
const POLA_OPSI = /^\(?([A-Ea-e])\)?\s*[.)]\s*([\s\S]*)$/;
const POLA_KUNCI =
  /^(?:kunci\s*jawaban|kunci|jawaban|jwb|answer\s*keys?|answers?)\s*[:.\-–]\s*([\s\S]*)$/i;
/**
 * Baris pembahasan. Tanda pemisahnya WAJIB — kecuali labelnya berdiri sendiri
 * satu baris penuh.
 *
 * Dulu pemisahnya opsional, sehingga pilihan jawaban yang kebetulan diawali
 * kata "Penjelasan" — mis. "Penjelasan bentuk Bumi → sejarah pengukuran → …" —
 * ditelan sebagai pembahasan. Pilihan itu lenyap dari daftar, huruf pilihan
 * sesudahnya bergeser naik, dan kunci yang disimpulkan ikut meleset satu huruf.
 */
const POLA_PEMBAHASAN = /^(?:pembahasan|penjelasan|alasan)\s*[:.\-–]\s*([\s\S]*)$/i;
const POLA_PEMBAHASAN_SENDIRI = /^(?:pembahasan|penjelasan|alasan)\s*$/i;
const POLA_TIPE = /^(?:tipe|bentuk|bentuk\s*soal)\s*[:.\-–]\s*([\s\S]*)$/i;
const POLA_LEVEL = /^(?:level|ranah|level\s*kognitif)\s*[:.\-–]\s*([\s\S]*)$/i;
const POLA_NILAI = /^(?:nilai|bobot|skor)\s*[:.\-–]\s*([\s\S]*)$/i;
/** "Teks berikut untuk menjawab soal nomor 6 sampai 10." */
/**
 * Judul blok kunci di akhir naskah: "Kunci Jawaban", "Answer:", "ANSWERS".
 * Sengaja hanya cocok bila TIDAK ada isi setelahnya — "Kunci: C" milik satu
 * soal ditangani POLA_KUNCI, bukan di sini.
 */
const POLA_JUDUL_DAFTAR_KUNCI =
  /^(?:kunci\s*jawaban|kunci|jawaban|answer\s*keys?|answers?)\s*[:.\-–]?\s*$/i;

/**
 * Bentuk longgar judul halaman kunci: label DIIKUTI keterangan lain.
 *
 * Halaman kunci di ujung naskah hampir tidak pernah berjudul "Kunci Jawaban"
 * saja. Yang ditulis guru adalah "KUNCI JAWABAN PENALARAN UMUM", "Kunci
 * Jawaban TO 4 September 2026", atau "KUNCI JAWABAN DAN PEMBAHASAN". Tanpa
 * mengenali bentuk ini, seluruh halaman kunci terbaca sebagai soal-soal baru
 * tanpa pilihan dan soal aslinya tetap tak berkunci.
 *
 * Frasa dua katanya WAJIB ("kunci jawaban", bukan "kunci" saja) supaya baris
 * kunci milik satu soal — "Kunci: C", "Jawaban B" — tidak ikut tertelan.
 */
const POLA_JUDUL_DAFTAR_KUNCI_LONGGAR =
  /^(?:kunci\s*jawaban|answer\s*keys?)\s*[:.\-–]?\s*(.+)$/i;

/** Judul kolom tabel kunci: "No"/"Nomor" berpasangan dengan "Kunci"/"Jawaban". */
const POLA_KOLOM_NOMOR = /^(?:no\.?|nomor|nomor\s*soal|soal)$/i;
const POLA_KOLOM_KUNCI = /^(?:kunci|kunci\s*jawaban|jawaban|jwb|answer|key)$/i;

/**
 * Baris ini adalah judul halaman kunci? Mengembalikan keterangan di belakangnya
 * ("PENALARAN UMUM", atau bahkan daftar kuncinya sendiri) supaya pemanggil bisa
 * membacanya; "" bila judulnya polos, null bila ini bukan judul halaman.
 *
 * `dalamSoal` adalah pemisah yang menentukan: ketika masih ada soal terbuka dan
 * sisanya BERBENTUK kunci — "Kunci Jawaban: B", "Kunci Jawaban: Bandung" — baris
 * itu kunci milik soal tersebut, bukan pembuka halaman kunci.
 */
function judulHalamanKunci(teks: string, dalamSoal: boolean): string | null {
  if (POLA_JUDUL_DAFTAR_KUNCI.test(teks)) return "";
  const longgar = POLA_JUDUL_DAFTAR_KUNCI_LONGGAR.exec(teks);
  if (!longgar) return null;
  const sisa = longgar[1].trim();
  if (sisa.length > 60) return null;
  if (/^\(?[A-Ea-e]\)?[.)]?$/.test(sisa)) return null;
  if (dalamSoal && kunciMasukAkal(sisa)) return null;
  return sisa;
}

/** Memecah teks memakai pola label nomor tertentu. */
function pecahDenganLabel(teks: string, label: RegExp): { nomor: number; kunci: string }[] {
  const titik: { nomor: number; mulai: number; akhirLabel: number }[] = [];
  for (let m = label.exec(teks); m; m = label.exec(teks)) {
    titik.push({ nomor: Number(m[1]), mulai: m.index, akhirLabel: label.lastIndex });
  }

  const hasil: { nomor: number; kunci: string }[] = [];
  for (const [i, t] of titik.entries()) {
    const sampai = i + 1 < titik.length ? titik[i + 1].mulai : teks.length;
    const kunci = teks
      .slice(t.akhirLabel, sampai)
      .trim()
      .replace(/[.,;]+$/, "")
      .trim();
    if (kunci) hasil.push({ nomor: t.nomor, kunci });
  }
  return hasil;
}

/**
 * Memecah satu baris daftar kunci menjadi pasangan nomor-kunci.
 *
 * Bentuk yang ditemui di naskah guru bermacam-macam dalam satu berkas:
 * "1. A", "1) A 2) C 3) B" berjajar, sampai "19. Known" yang kuncinya berupa
 * kata untuk soal isian singkat. Karena itu pemisahnya bukan spasi, melainkan
 * posisi label nomor berikutnya.
 *
 * Bila tidak satu pun label bertitik/berkurung ditemukan, barisnya dicoba
 * sekali lagi dengan pemisah yang lebih longgar — "1 A 2 B 3 C" tanpa tanda
 * baca sama sekali, yang juga lazim di halaman kunci. Urutannya penting:
 * dicoba belakangan supaya kunci berupa angka ("1. 25") tidak salah dipecah.
 */
export function pecahDaftarKunci(teks: string): { nomor: number; kunci: string }[] {
  const ketat = pecahDenganLabel(teks, /(\d{1,3})\s*[.)]\s*/g);
  if (ketat.length > 0) return ketat;
  return pecahDenganLabel(teks, /(\d{1,3})[\s:\-–]+/g);
}

/**
 * Bentuk nilai yang masuk akal sebagai kunci jawaban.
 *
 * Dipakai untuk memastikan halaman kunci berhenti tepat waktu. Naskah yang
 * menaruh satu halaman kunci di ujung TIAP subtes akan melanjutkan soal
 * sesudahnya, dan "21. Perhatikan gambar berikut!" tidak boleh ikut tercatat
 * sebagai kunci nomor 21. Karena itu yang diterima hanya: huruf A-E (boleh
 * beberapa, boleh berpisah koma untuk PGK dan B/S), angka, atau SATU kata —
 * bentuk yang memang dipakai kunci di sekolah ini.
 */
function kunciMasukAkal(v: string): boolean {
  const t = v.trim();
  if (!t || t.length > 30) return false;
  if (/^[A-Ea-e](?:\s*[,;/dan\s]+\s*[A-Ea-e])*$/.test(t)) return true;
  if (/^[BSbs](?:\s*[,;/-]?\s*[BSbs])+$/.test(t)) return true;
  if (/^[\d.,]+$/.test(t)) return true;
  return /^[\p{L}\p{N}][\p{L}\p{N}'-]*$/u.test(t);
}

/**
 * Memecah satu baris HALAMAN KUNCI, dan hanya menerimanya bila seluruh
 * nilainya benar-benar berbentuk kunci. Baris yang ternyata soal biasa
 * mengembalikan daftar kosong, dan itulah tanda halaman kuncinya sudah habis.
 */
function pecahBarisKunci(teks: string): { nomor: number; kunci: string }[] {
  const pasangan = pecahDaftarKunci(teks);
  if (pasangan.length === 0) return [];
  return pasangan.every((e) => kunciMasukAkal(e.kunci)) ? pasangan : [];
}

/**
 * Membaca TABEL kunci jawaban menjadi pasangan nomor-kunci.
 *
 * Halaman kunci paling sering berbentuk tabel, bukan paragraf — dan sebelum
 * ini tabel di ujung naskah ditelan bulat-bulat sebagai "bacaan", sehingga
 * kuncinya hilang tanpa jejak. Tiga bentuk yang ditemui:
 *
 *   1. Dua kolom berjudul: `No | Kunci`, satu soal per baris.
 *   2. Kisi: tiap sel berisi "1. A" sendiri-sendiri.
 *   3. Kisi berselang: satu baris berisi nomor 1..10, baris di bawahnya
 *      berisi huruf kuncinya, sejajar kolom demi kolom.
 *
 * `wajibBerjudul` dipakai ketika tabel ditemui DI LUAR halaman kunci: di situ
 * hanya bentuk pertama yang diterima, supaya tabel data soal biasa tidak
 * salah dibaca sebagai kunci.
 */
export function tabelKeDaftarKunci(
  baris: string[][],
  wajibBerjudul = false,
): { nomor: number; kunci: string }[] {
  if (baris.length === 0) return [];
  const bersih = (v: string) => v.replace(/\s+/g, " ").trim();

  // --- bentuk 1: kolom berjudul No | Kunci ---
  const judul = baris[0].map(bersih);
  const kolomNomor = judul.findIndex((v) => POLA_KOLOM_NOMOR.test(v));
  const kolomKunci = judul.findIndex((v) => POLA_KOLOM_KUNCI.test(v));
  if (kolomNomor >= 0 && kolomKunci >= 0) {
    const hasil: { nomor: number; kunci: string }[] = [];
    for (const r of baris.slice(1)) {
      const nomor = Number.parseInt(bersih(r[kolomNomor] ?? "").replace(/[^\d]/g, ""), 10);
      const kunci = bersih(r[kolomKunci] ?? "").replace(/[.,;]+$/, "");
      if (Number.isInteger(nomor) && nomor > 0 && kunci) hasil.push({ nomor, kunci });
    }
    if (hasil.length > 0) return hasil;
  }
  if (wajibBerjudul) return [];

  // --- bentuk 2: tiap sel berisi "1. A" ---
  const dariSel: { nomor: number; kunci: string }[] = [];
  for (const r of baris) {
    for (const sel of r) {
      for (const e of pecahDaftarKunci(bersih(sel))) dariSel.push(e);
    }
  }
  if (dariSel.length > 0) return dariSel;

  // --- bentuk 3: baris nomor, lalu baris huruf di bawahnya ---
  const hasil: { nomor: number; kunci: string }[] = [];
  for (let i = 0; i + 1 < baris.length; i++) {
    const atas = baris[i].map(bersih);
    const bawah = baris[i + 1].map(bersih);
    const semuaAngka = atas.length >= 2 && atas.every((v) => /^\d{1,3}$/.test(v));
    const semuaKunci = bawah.length >= atas.length && bawah.slice(0, atas.length).every((v) => !!v);
    if (!semuaAngka || !semuaKunci) continue;
    atas.forEach((v, k) => {
      const kunci = bawah[k].replace(/[.,;]+$/, "");
      if (kunci) hasil.push({ nomor: Number(v), kunci });
    });
    i++; // baris huruf sudah terpakai
  }
  return hasil;
}

/**
 * Judul blok bacaan: "TEKS 1", "Passage 2", "Bacaan", "Wacana 3".
 *
 * Naskah guru menandai pergantian bacaan hanya dengan judul semacam ini, tanpa
 * kalimat "untuk menjawab soal nomor 6 sampai 10". Tanpa mengenalinya, bacaan
 * berikutnya menempel ke pilihan terakhir soal sebelum ia — dan seluruh soal
 * di bawahnya kehilangan bacaannya.
 */
/**
 * Panjang paragraf (karakter) yang, bila muncul sesudah pilihan jawaban, lebih
 * masuk akal dibaca sebagai bacaan baru ketimbang sambungan pilihan. Pilihan
 * yang terlipat ke baris berikutnya selalu jauh lebih pendek dari ini.
 */
const AMBANG_BACAAN_BARU = 200;

// Termasuk "TEKS-1", "Teks 2:", dan judul yang membawa cakupan nomornya sendiri,
// "TEKS-2 (Untuk soal nomor 5 sampai 8)" — bentuk yang lazim di naskah PK/PM.
const POLA_JUDUL_BACAAN =
  /^(?:teks|bacaan|wacana|artikel|passage|text)\s*(?:ke-?\s*)?[-–]?\s*\d{0,2}\s*[:.\-–]?\s*(?:\((?=[^)]*(?:soal|nomor|no\b|\d))[^)]*\))?\s*$/i;

// "dan" ikut dihitung sebagai pemisah rentang karena bentuk yang paling sering
// dipakai guru untuk bacaan berisi DUA soal adalah "untuk menjawab soal nomor
// 39 dan 40" — bukan "39 sampai 40". Tanpa itu kalimatnya tidak dikenali sama
// sekali: bacaannya kehilangan cakupan dan hanya menempel ke satu soal.
const POLA_CAKUPAN =
  /(?:soal|nomor|no\.?)\s*(?:nomor\s*)?(\d{1,3})\s*(?:s\.?\s*d\.?|sampai(?:\s*dengan)?|hingga|\bdan\b|&|[-–—])\s*(?:nomor\s*)?(\d{1,3})/i;

/**
 * Kalimat pengantar bacaan — "Teks berikut digunakan untuk menjawab soal nomor
 * 39 dan 40.", "Perhatikan teks berikut untuk menjawab soal nomor 36–38!".
 *
 * Baris seperti ini menandai pergantian bacaan sekaligus menyebutkan soal mana
 * saja yang memakainya, dan ia bukan bagian dari bacaan itu sendiri.
 * Batas panjangnya penting: paragraf PANJANG yang kebetulan menyebut rentang
 * nomor adalah bacaan sungguhan, bukan pengantar, dan tidak boleh dibuang.
 */
function cakupanPengantar(teks: string): { dari: number; sampai: number } | null {
  if (teks.length >= AMBANG_BACAAN_BARU) return null;
  const m = teks.match(POLA_CAKUPAN);
  if (!m) return null;
  return { dari: Number.parseInt(m[1], 10), sampai: Number.parseInt(m[2], 10) };
}

/**
 * Opsi yang ditulis berjajar dalam satu paragraf: "A. merah B. hijau C. biru".
 * Diekspor karena pembaca naskah Warung Soal memakai aturan yang sama persis.
 */
export function pecahOpsiSebaris(teks: string): string[] | null {
  const penanda = [...teks.matchAll(/(?:^|\s)\(?([A-Ea-e])\)?\s*[.)]\s+/g)];
  if (penanda.length < 3) return null;
  // Huruf penanda harus berurutan A, B, C, ... — kalau tidak, ini kalimat biasa.
  const huruf = penanda.map((m) => m[1].toUpperCase());
  for (let i = 0; i < huruf.length; i++) {
    if (huruf[i] !== "ABCDE"[i]) return null;
  }
  const hasil: string[] = [];
  for (let i = 0; i < penanda.length; i++) {
    const mulai = (penanda[i].index ?? 0) + penanda[i][0].length;
    const akhir = i + 1 < penanda.length ? (penanda[i + 1].index ?? teks.length) : teks.length;
    hasil.push(teks.slice(mulai, akhir).trim());
  }
  return hasil;
}

/* ==========================================================================
   JALUR 1 — TABEL BERJUDUL KOLOM
   ========================================================================== */

/** Kolom skalar butir (yang isinya string tunggal, bukan daftar). */
type KolomSkalar =
  | "subtes"
  | "nomor"
  | "tipe"
  | "level"
  | "stimulus"
  | "pertanyaan"
  | "gambar_url"
  | "kunci"
  | "pembahasan";

type KolomTabel =
  | KolomSkalar
  | "opsi_a" | "opsi_b" | "opsi_c" | "opsi_d" | "opsi_e"
  | "nilai_a" | "nilai_b" | "nilai_c" | "nilai_d" | "nilai_e";

const JUDUL_KOLOM: Record<string, KolomTabel> = {
  subtes: "subtes",
  nomor: "nomor",
  no: "nomor",
  tipe: "tipe",
  bentuk: "tipe",
  level: "level",
  stimulus: "stimulus",
  bacaan: "stimulus",
  pertanyaan: "pertanyaan",
  soal: "pertanyaan",
  gambar: "gambar_url",
  gambar_url: "gambar_url",
  kunci: "kunci",
  kunci_jawaban: "kunci",
  jawaban: "kunci",
  pembahasan: "pembahasan",
  penjelasan: "pembahasan",
  opsi_a: "opsi_a",
  opsi_b: "opsi_b",
  opsi_c: "opsi_c",
  opsi_d: "opsi_d",
  opsi_e: "opsi_e",
  a: "opsi_a",
  b: "opsi_b",
  c: "opsi_c",
  d: "opsi_d",
  e: "opsi_e",
  nilai_a: "nilai_a",
  nilai_b: "nilai_b",
  nilai_c: "nilai_c",
  nilai_d: "nilai_d",
  nilai_e: "nilai_e",
};

function normalJudul(v: string): string {
  return v
    .toLowerCase()
    .replace(/﻿/g, "")
    .trim()
    .replace(/[\s.\-/]+/g, "_")
    .replace(/_+/g, "_");
}

function butirKosong(): ButirNaskah {
  return {
    subtes: "",
    nomor: "",
    tipe: "",
    level: "",
    stimulus: "",
    pertanyaan: "",
    gambar_url: "",
    opsi: [],
    kunci: "",
    nilai: [],
    pembahasan: "",
  };
}

/** Cari tabel yang baris pertamanya memang judul kolom template. */
function cariTabelTemplate(blok: BlokDocx[]): TabelDocx | null {
  for (const b of blok) {
    if (b.jenis !== "tabel" || b.baris.length < 2) continue;
    const judul = b.baris[0].map(normalJudul);
    const dikenal = judul.filter((j) => j in JUDUL_KOLOM).length;
    if (dikenal >= 4 && judul.includes("subtes") && judul.includes("nomor")) return b;
  }
  return null;
}

function bacaTabelTemplate(tabel: TabelDocx): ButirNaskah[] {
  const judul = tabel.baris[0].map(normalJudul);
  const hasil: ButirNaskah[] = [];

  for (let r = 1; r < tabel.baris.length; r++) {
    const sel = tabel.baris[r];
    if (!sel.some((s) => s.trim())) continue;

    const butir = butirKosong();
    const opsi: string[] = ["", "", "", "", ""];
    const nilai: string[] = ["", "", "", "", ""];

    judul.forEach((j, i) => {
      const kolom = JUDUL_KOLOM[j];
      if (!kolom) return;
      const isi = (sel[i] ?? "").trim();
      if (kolom.startsWith("opsi_")) opsi["abcde".indexOf(kolom.slice(5))] = isi;
      else if (kolom.startsWith("nilai_")) nilai["abcde".indexOf(kolom.slice(6))] = isi;
      else butir[kolom as KolomSkalar] = isi;
    });

    while (opsi.length && opsi[opsi.length - 1] === "") opsi.pop();
    butir.opsi = opsi;
    butir.nilai = nilai.some((n) => n !== "") ? nilai : [];
    hasil.push(butir);
  }
  return hasil;
}

/* ==========================================================================
   JALUR 2 — NASKAH MENGALIR
   ========================================================================== */

interface ButirKerja extends ButirNaskah {
  /** Nama berkas gambar di dalam .docx yang menempel pada butir ini. */
  berkasGambar: string[];
  /** Cakupan bacaan yang dipasangkan belakangan, mis. [6, 10]. */
  nomorAngka: number;
  /** Sejajar dengan `opsi`: pilihan mana yang teksnya ditandai warna/stabilo. */
  opsiBertanda: boolean[];
  /**
   * Sejajar dengan `opsi`: pilihan mana yang ditandai MERAH khususnya.
   *
   * Dipakai sebagai pemutus ketika lebih dari satu pilihan tampak bertanda —
   * lazim pada naskah yang seluruh tubuhnya diberi warna, atau yang memakai
   * warna lain untuk hal di luar kunci.
   */
  opsiMerah: boolean[];
  /** Huruf kunci dugaan dari label pilihan yang ditandai pada baris berjajar. */
  kunciTanda: string;
  /** Sama, tetapi hanya dari label yang ditandai merah. */
  kunciTandaMerah: string;
  /** Potongan bertanda pada baris pertanyaannya sendiri (untuk isian singkat). */
  tandaPertanyaan: string[];
  /**
   * Butir daftar otomatis Word yang BUKAN pilihan berhuruf, ditahan dulu:
   * pernyataan "(1)…(4)" di dalam soal, butir bulat berisi data, atau pilihan
   * yang dinomori angka. Perannya diputuskan belakangan — lihat `tuntaskanCalon`.
   */
  calon: CalonButir[];
  /** numId daftar Word tempat nomor soal ini berada; kosong bila nomornya diketik. */
  idDaftar: string;
}

/** Butir daftar yang belum jelas perannya (lihat `ButirKerja.calon`). */
interface CalonButir {
  html: string;
  /** Label yang digambar Word: "(1)", "1.", atau "•". */
  label: string;
  bertanda: boolean;
  merah: boolean;
}

interface BacaanTertunda {
  html: string;
  dari: number | null;
  sampai: number | null;
  berkasGambar: string[];
  /** Bacaan tanpa cakupan nomor hanya berlaku untuk satu soal sesudahnya. */
  terpakai: boolean;
  /**
   * Bacaan yang dibuka judul ("TEKS 2") berlaku untuk SELURUH soal sampai
   * judul bacaan berikutnya — itulah yang dimaksud naskah cetak.
   */
  bertajuk: boolean;
}

/**
 * Memecah paragraf yang memuat JEDA BARIS LUNAK (Shift+Enter di Word) menjadi
 * beberapa paragraf semu.
 *
 * Seluruh pengenalan pola di bawah berpijak pada satu anggapan: satu paragraf
 * Word = satu baris naskah. Anggapan itu runtuh pada naskah yang ditulis guru,
 * yang kerap menaruh pertanyaan dan kelima pilihannya dalam SATU paragraf yang
 * dipisah jeda baris — hasilnya, semua yang berada setelah jeda pertama tidak
 * pernah terlihat sebagai pilihan maupun sebagai kunci, melainkan tertelan ke
 * dalam pertanyaan.
 *
 * Penomoran otomatis dan gambar hanya milik potongan PERTAMA: potongan
 * berikutnya adalah baris lanjutan di dalam paragraf yang sama, bukan butir
 * daftar baru.
 */
/**
 * Tanda yang layak dipercaya sebagai penunjuk kunci.
 *
 * Guru kerap mewarnai seluruh kalimat pilihan yang benar — termasuk titik di
 * ujungnya. Titik itu muncul juga di semua pilihan lain, jadi kalau potongan
 * seperti itu ikut dihitung, SETIAP pilihan akan tampak bertanda dan kuncinya
 * justru tidak bisa disimpulkan sama sekali. Syaratnya memuat huruf atau
 * angka — sekaligus tetap menerima jawaban sependek "Au".
 */
/**
 * Membuang potongan teks yang menempel di UJUNG sebuah nilai HTML.
 *
 * Dipakai untuk soal isian singkat yang jawabannya ditulis guru di ujung baris
 * pertanyaan dan ditandai warna. Jawaban itu harus benar-benar hilang dari
 * pertanyaan, bukan sekadar tidak dipakai sebagai kunci: kalau tertinggal,
 * kunci jawabannya terpampang di layar peserta.
 */
function buangEkorHtml(html: string, ekor: string): string {
  // Dihitung per karakter TERLIHAT, bukan dengan mencocokkan teksnya di HTML:
  // jawaban yang diwarnai guru kerap sekaligus dicetak tebal, sehingga di
  // HTML ekornya terbungkus <b>…</b> dan pencocokan teks polos tidak pernah
  // kena — kunci pun tertinggal terpampang di layar peserta. Tag selalu
  // dipertahankan supaya pasangannya tetap utuh; tag yang jadi kosong dibuang.
  const jumlah = ekor.trim().length;
  if (jumlah === 0) return html;
  const totalTerlihat = html.replace(/<[^>]*>/g, "").replace(/&[#\w]+;/g, "x").length;
  const batas = totalTerlihat - jumlah;
  let keluar = "";
  let terlihat = 0;
  let i = 0;
  while (i < html.length) {
    if (html[i] === "<") {
      const tutup = html.indexOf(">", i);
      const akhir = tutup < 0 ? html.length : tutup + 1;
      keluar += html.slice(i, akhir);
      i = akhir;
      continue;
    }
    let token = html[i];
    if (html[i] === "&") {
      const titikKoma = html.indexOf(";", i);
      if (titikKoma > i && titikKoma - i <= 10) token = html.slice(i, titikKoma + 1);
    }
    if (terlihat < batas) keluar += token;
    terlihat++;
    i += token.length;
  }
  return keluar
    .replace(/(?:\s|&nbsp;)+((?:<[^>]*>)*)$/, "$1")
    .replace(/<(\w+)(?:\s[^>]*)?>\s*<\/\1>/g, "")
    .trim();
}

/** true bila paragraf ini memuat tanda yang layak dipercaya. */
function adaTanda(p: ParagrafDocx): boolean {
  return p.teksBertanda.some((x) => tandaBermakna(x.teks, p.teks)) || tandaUtuh(p, false);
}

/** true bila tandanya MERAH — warna yang dipakai guru di sekolah ini untuk kunci. */
function adaTandaMerah(p: ParagrafDocx): boolean {
  return p.teksBertanda.some((x) => x.merah && tandaBermakna(x.teks, p.teks)) || tandaUtuh(p, true);
}

/**
 * true bila SELURUH isi paragraf ditandai, walau Word memecahnya menjadi
 * beberapa potongan yang masing-masing tidak berarti apa-apa sendirian.
 *
 * SEBABNYA NYATA, dan memakan satu putaran pada 10 September 2026. Pilihan
 * "(7)" pada PPU nomor 11 diwarnai merah seluruhnya, tetapi Word menyimpannya
 * sebagai TIGA run terpisah — "(", "7", ")". {@link tandaBermakna} menilai tiap
 * potongan sendiri-sendiri: kurung ditolak karena bukan huruf atau angka, dan
 * "7" ditolak karena sepanjang satu karakter tetapi tidak sama dengan seluruh
 * paragraf ("(7)"). Akibatnya kunci yang jelas-jelas ditandai guru hilang, dan
 * soalnya tidak ikut terimpor. Hal yang sama menyembunyikan kunci PBM nomor 1.
 *
 * Pemaafan ini sengaja SEMPIT: yang diterima hanya bila gabungan seluruh
 * potongan bertanda sama persis dengan seluruh teks paragrafnya. Potongan yang
 * menandai sebagian kalimat tetap ditolak seperti sebelumnya — di soal
 * perbaikan kalimat, tanda separuh justru berarti "bagian yang salah", bukan
 * kunci.
 */
function tandaUtuh(p: ParagrafDocx, hanyaMerah: boolean): boolean {
  const potong = hanyaMerah ? p.teksBertanda.filter((x) => x.merah) : p.teksBertanda;
  if (potong.length < 2) return false;
  return samaTanpaSpasi(potong.map((x) => x.teks).join(""), p.teks);
}

/**
 * Membandingkan dua teks dengan MENGABAIKAN spasi.
 *
 * Run yang isinya spasi saja tidak ikut tercatat sebagai potongan bertanda,
 * jadi gabungan potongan "D. (7)" datang sebagai "D.(7)". Yang dibandingkan
 * karena itu hanya huruf, angka, dan tanda bacanya — bukan jaraknya.
 */
function samaTanpaSpasi(a: string, b: string): boolean {
  const rapi = (t: string) => t.replace(/\s+/gu, "");
  const kiri = rapi(a);
  return kiri !== "" && kiri === rapi(b) && /[\p{L}\p{N}]/u.test(kiri);
}

/**
 * Tanda sependek satu karakter tetap dipercaya bila itulah SELURUH isi
 * paragrafnya: pilihan PK/PM kerap cuma berupa "7" atau "8", dan guru
 * mewarnai angka itu. Dulu kunci soal-soal itu tidak pernah terbaca.
 * Potongan satu karakter di tengah kalimat tetap ditolak.
 */
function tandaBermakna(t: string, seluruh = ""): boolean {
  const v = t.trim();
  if (!/[\p{L}\p{N}]/u.test(v)) return false;
  return v.length >= 2 || (seluruh.trim() !== "" && v === seluruh.trim());
}

function pecahJedaBaris(blok: BlokDocx[]): BlokDocx[] {
  const hasil: BlokDocx[] = [];
  for (const b of blok) {
    if (b.jenis !== "paragraf" || !b.teks.includes("\n")) {
      hasil.push(b);
      continue;
    }
    const teks = b.teks.split("\n");
    const html = b.html.split("\n");
    // Kalau keduanya tidak sejajar, lebih baik biarkan apa adanya daripada
    // memasangkan teks ke potongan HTML yang salah.
    if (teks.length !== html.length) {
      hasil.push(b);
      continue;
    }
    let pertama = true;
    for (let i = 0; i < teks.length; i++) {
      const t = teks[i].trim();
      const h = html[i].trim();
      const bawaGambar = pertama && b.gambar.length > 0;
      if (!t && !h && !bawaGambar) continue;
      // Tanda dibagi menurut NOMOR BARIS-nya, bukan dengan mencari teksnya.
      // Pada soal perbaikan kalimat, kata-kata pilihan yang benar muncul lagi
      // di pilihan lain; kalau dicocokkan dengan `includes`, semua pilihan
      // tampak bertanda dan kuncinya gagal disimpulkan.
      // Potongan baris ini dinilai terhadap TEKS BARISNYA, bukan tanpa
      // pembanding — dan bila gabungan seluruh potongan sama persis dengan
      // barisnya, semuanya dipertahankan supaya `tandaUtuh()` bisa menilainya.
      // Tanpa itu, pilihan yang seluruhnya diwarnai tetapi dipecah Word
      // menjadi run-run pendek ("(", "7", ")") hilang di sini, sebelum penjaga
      // kunci sempat melihatnya.
      const sebaris = b.teksBertanda.filter((x) => x.baris === i);
      const utuh = sebaris.length >= 2 && samaTanpaSpasi(sebaris.map((x) => x.teks).join(""), t);
      const tanda = sebaris
        .filter((x) => utuh || tandaBermakna(x.teks, t))
        .map((x) => ({ ...x, baris: 0 }));
      hasil.push({
        ...b,
        teks: t,
        html: h,
        berdaftar: pertama ? b.berdaftar : false,
        formatDaftar: pertama ? b.formatDaftar : "",
        labelDaftar: pertama ? b.labelDaftar : "",
        nomorDaftar: pertama ? b.nomorDaftar : 0,
        idDaftar: pertama ? b.idDaftar : "",
        gambar: pertama ? b.gambar : [],
        ditandai: tanda.length > 0,
        teksBertanda: tanda,
      });
      pertama = false;
    }
  }
  return hasil;
}

function bacaNaskahMengalir(
  blokAsli: BlokDocx[],
  subtesBawaan = "",
): {
  butir: ButirKerja[];
  catatan: string[];
} {
  const catatan: string[] = [];
  const butir: ButirKerja[] = [];
  const blok = pecahJedaBaris(blokAsli);

  /** Berapa kunci yang terbaca dari baris berisi satu huruf saja. */
  let kunciTanpaLabel = 0;
  /** Kunci yang dikumpulkan dari blok daftar kunci di akhir naskah. */
  const daftarKunci: { nomor: number; kunci: string; subtes: string }[] = [];
  /** true selagi paragraf yang dibaca masih bagian dari blok daftar kunci. */
  let modeKunci = false;

  // Naskah per subtes dari guru sering tidak memuat judul bagian sama sekali —
  // seluruh berkas memang berisi satu subtes. Pilihan admin di halaman impor
  // menjadi subtes awal, dan tetap bisa ditimpa judul di dalam naskah.
  let subtesAktif = subtesBawaan;
  let sekarang: ButirKerja | null = null;
  /** Bagian butir yang sedang menerima paragraf lanjutan. */
  let bagian: "pertanyaan" | "opsi" | "pembahasan" | null = null;

  const bacaanBaru = (bertajuk = false): BacaanTertunda => ({
    html: "",
    dari: null,
    sampai: null,
    berkasGambar: [],
    terpakai: false,
    bertajuk,
  });

  let bacaan: BacaanTertunda = bacaanBaru();
  /** Sudah adakah soal sejak judul bacaan terakhir? Menentukan kapan bacaan lama dilepas. */
  let adaSoalSejakTajuk = false;
  /** Bacaan yang sudah lengkap, menunggu soal-soalnya muncul. */
  const bacaanBerlaku: BacaanTertunda[] = [];

  const tutupBacaan = () => {
    const kosong = !bacaan.html && bacaan.berkasGambar.length === 0 && bacaan.dari === null;
    if (kosong) return;
    bacaanBerlaku.push(bacaan);
    bacaan = bacaanBaru();
  };

  /**
   * Pasangkan bacaan ke soal. Bacaan bercakupan ("untuk soal nomor 6-10")
   * menempel ke setiap soal dalam rentang itu; bacaan tanpa cakupan hanya
   * menempel ke satu soal berikutnya, supaya paragraf pengantar tidak
   * ikut terbawa ke seluruh sisa naskah.
   */
  const pasangBacaan = (b: ButirKerja) => {
    const berisi = (bc: BacaanTertunda) => !!bc.html || bc.berkasGambar.length > 0;

    // 1. Bacaan bercakupan nomor ("untuk soal 6 sampai 10") paling khusus.
    for (let i = bacaanBerlaku.length - 1; i >= 0; i--) {
      const bc = bacaanBerlaku[i];
      if (bc.dari === null || !berisi(bc)) continue;
      if (b.nomorAngka < bc.dari || b.nomorAngka > (bc.sampai ?? bc.dari)) continue;
      bc.terpakai = true;
      b.stimulus = bc.html;
      b.berkasGambar.unshift(...bc.berkasGambar);
      return;
    }

    // 2. Bacaan bertajuk berlaku sampai judul bacaan berikutnya. Beberapa yang
    //    berurutan ("Passage 1" lalu "Passage 2") dibaca bersama untuk
    //    kelompok soal yang sama, jadi disambung menurut urutan aslinya.
    const bertajuk = bacaanBerlaku.filter((bc) => bc.dari === null && bc.bertajuk && berisi(bc));
    if (bertajuk.length > 0) {
      for (const bc of bertajuk) {
        bc.terpakai = true;
        b.stimulus = sambungBlok(b.stimulus, bc.html);
        b.berkasGambar.unshift(...bc.berkasGambar);
      }
      return;
    }

    // 3. Paragraf pengantar tanpa judul dan tanpa cakupan: satu soal saja,
    //    supaya tidak terbawa ke seluruh sisa naskah.
    for (let i = bacaanBerlaku.length - 1; i >= 0; i--) {
      const bc = bacaanBerlaku[i];
      if (bc.dari !== null || bc.terpakai || !berisi(bc)) continue;
      bc.terpakai = true;
      b.stimulus = bc.html;
      b.berkasGambar.unshift(...bc.berkasGambar);
      return;
    }
  };

  const selesaikan = () => {
    if (sekarang) {
      tuntaskanCalon(sekarang);
      // Pilihan berhuruf yang dibiarkan kosong di ujung ("F." lalu Enter).
      while (sekarang.opsi.length > 0 && !sekarang.opsi[sekarang.opsi.length - 1].trim()) {
        sekarang.opsi.pop();
        sekarang.opsiBertanda.length = sekarang.opsi.length;
        sekarang.opsiMerah.length = sekarang.opsi.length;
      }
      butir.push(sekarang);
    }
    sekarang = null;
    bagian = null;
  };

  /** Label yang digambar Word disambung ke isi butirnya: "(1) Banyak anggota S adalah 7." */
  const isiCalon = (c: CalonButir, selaluBerlabel: boolean) =>
    c.label && (selaluBerlabel || /^\(/.test(c.label)) ? `${c.label} ${c.html}`.trim() : c.html;

  /** Alirkan seluruh butir tertahan ke badan soal, masing-masing jadi satu baris. */
  const alirkanCalonKeBadan = (b: ButirKerja) => {
    for (const c of b.calon) b.pertanyaan = sambungBlok(b.pertanyaan, isiCalon(c, true));
    b.calon = [];
  };

  /**
   * Butir tertahan yang masih tersisa saat soal ditutup. Kalau soalnya tidak
   * punya pilihan berhuruf sama sekali, merekalah pilihannya (pilihan yang
   * dinomori angka atau bulat, seperti naskah lama). Selebihnya — soal yang
   * sudah berpilihan, soal Benar/Salah, atau isian singkat yang kuncinya
   * sudah ada — mereka bagian dari badan soal.
   */
  const tuntaskanCalon = (b: ButirKerja) => {
    if (b.calon.length === 0) return;
    const kunciBukanHuruf = !!b.kunci && !/^[A-E]$/i.test(b.kunci.trim());
    const jadiOpsi =
      b.opsi.length === 0 &&
      b.tipe !== "BS" &&
      !kunciBukanHuruf &&
      b.calon.length >= 2 &&
      b.calon.length <= 5;
    if (!jadiOpsi) {
      alirkanCalonKeBadan(b);
      return;
    }
    for (const c of b.calon) {
      b.opsi.push(isiCalon(c, false));
      b.opsiBertanda[b.opsi.length - 1] = c.bertanda;
      b.opsiMerah[b.opsi.length - 1] = c.merah;
    }
    b.calon = [];
  };

  /**
   * Kunci isian singkat yang tertulis di ujung baris soal, "(Jawaban: 36)".
   * Dibersihkan belakangan bersama kunci isian lain; yang penting di sini:
   * soalnya TUNTAS, sehingga paragraf panjang berikutnya dibaca sebagai bacaan
   * baru, bukan ditelan ke dalam soal isian ini.
   */
  const pasangKunciIsian = (b: ButirKerja, mentah: string) => {
    b.kunci = mentah;
    bagian = null;
  };

  for (const blokIni of blok) {
    // --- tabel Word ---
    // Dulu blok tabel disaring keluar sebelum perulangan dimulai, sehingga
    // seluruh tabel di dalam naskah mengalir hilang tanpa jejak. Sekarang ia
    // menempel ke bagian yang sedang diisi: bacaan bila soalnya belum dimulai,
    // pembahasan bila sedang menulis pembahasan, selebihnya ke pertanyaan —
    // pilihan jawaban tidak pernah berbentuk tabel, sedangkan data soal sering.
    if (blokIni.jenis === "tabel") {
      // Halaman kunci paling sering berbentuk tabel. Di dalam mode kunci,
      // tabel apa pun dibaca sebagai daftar kunci; di luarnya, hanya tabel
      // yang kolomnya benar-benar berjudul "No" dan "Kunci".
      const kunciTabel = tabelKeDaftarKunci(blokIni.baris, !modeKunci);
      if (kunciTabel.length > 0) {
        selesaikan();
        modeKunci = true;
        for (const e of kunciTabel) daftarKunci.push({ ...e, subtes: subtesAktif });
        continue;
      }

      const htmlTabel = tabelKeHtml(blokIni);
      if (!htmlTabel) continue;
      if (modeKunci) continue; // sisa halaman kunci bukan isi soal
      if (!sekarang) {
        bacaan.html = sambungBlok(bacaan.html, htmlTabel);
      } else if (bagian === "pembahasan") {
        sekarang.pembahasan = sambungBlok(sekarang.pembahasan, htmlTabel);
      } else {
        // Tabel "Pernyataan | Benar | Salah" bercentang = soal Benar/Salah
        // yang sudah lengkap dengan kuncinya, bukan data soal. Dulu tabel ini
        // ditelan mentah ke dalam pertanyaan dan soalnya tersimpan tanpa
        // pilihan maupun kunci.
        const bs = tabelBenarSalah(blokIni);
        if (bs) {
          alirkanCalonKeBadan(sekarang);
          sekarang.tipe = "BS";
          sekarang.opsi = bs.pernyataan;
          sekarang.opsiBertanda = [];
          sekarang.opsiMerah = [];
          sekarang.kunci = bs.kunci;
          if (!bs.kunci) {
            catatan.push(
              `Soal ${subtesAktif || "?"} nomor ${sekarang.nomor}: tabel Benar/Salah tanpa tanda centang yang jelas di tiap barisnya. Isi kuncinya sendiri di pratinjau (mis. B,S,B).`,
            );
          }
          bagian = null;
          continue;
        }
        sekarang.pertanyaan = sambungBlok(sekarang.pertanyaan, htmlTabel);
        bagian = "pertanyaan";
      }
      continue;
    }

    const p: ParagrafDocx = blokIni;
    const teks = p.teks.trim();
    // Butir daftar otomatis berhuruf (A, B, C) SELALU pilihan jawaban. Ia tidak
    // boleh ikut diperiksa sebagai baris berlabel: pilihan yang kebetulan
    // diawali kata "Penjelasan" atau "Alasan" akan lenyap ditelan pembahasan.
    const daftarHuruf = p.berdaftar && /letter/i.test(p.formatDaftar);

    // --- judul subtes ---
    // Judul bagian tidak pernah berbentuk "A. …" atau "1. …" berisi kalimat,
    // jadi baris yang sudah terbaca sebagai pilihan tidak boleh dianggap judul.
    const subtesBaru = teks && !POLA_OPSI.test(teks) ? bacaJudulSubtes(teks) : null;
    if (subtesBaru) {
      // Di dalam halaman kunci, judul subtes BUKAN tanda kembali ke soal — ia
      // hanya memberi tahu kunci di bawahnya milik subtes yang mana. Halaman
      // kunci memang lazim dikelompokkan begitu, dan dulu judul semacam itu
      // mematikan mode kunci sehingga sisa daftarnya terbaca sebagai soal baru.
      selesaikan();
      tutupBacaan();
      bacaanBerlaku.length = 0;
      subtesAktif = subtesBaru;
      continue;
    }

    // --- judul blok bacaan ("TEKS 2", "Passage 1") ---
    // Menutup soal yang sedang dibaca supaya paragraf bacaan di bawahnya tidak
    // menempel ke pilihan terakhirnya, lalu membuka bacaan baru.
    if (!daftarHuruf && POLA_JUDUL_BACAAN.test(teks)) {
      selesaikan();
      tutupBacaan();
      // Judul beruntun tanpa soal di antaranya ("Passage 1" lalu "Passage 2")
      // dibaca bersama; begitu soalnya lewat, barulah bacaan lama dilepas.
      if (adaSoalSejakTajuk) {
        bacaanBerlaku.length = 0;
        adaSoalSejakTajuk = false;
      }
      bacaan = bacaanBaru(true);
      // "TEKS-2 (Untuk soal nomor 5 sampai 8)": cakupannya ikut di judul, jadi
      // bacaan ini hanya menempel ke soal 5-8 — bukan ke semua soal sesudahnya.
      const cakupanJudul = teks.match(POLA_CAKUPAN);
      if (cakupanJudul) {
        bacaan.dari = Number.parseInt(cakupanJudul[1], 10);
        bacaan.sampai = Number.parseInt(cakupanJudul[2], 10);
      }
      continue;
    }

    // --- halaman "Kunci Jawaban" di akhir naskah ---
    // Kebiasaan kedua yang paling sering dipakai guru di sekolah ini: seluruh
    // kunci ditaruh di halaman terakhir, bukan di bawah tiap soal. Tanpa aturan
    // ini halaman itu terbaca sebagai soal-soal baru tanpa pilihan, dan soal
    // aslinya tetap tak berkunci.
    const judulKunci = judulHalamanKunci(teks, !!sekarang);
    if (judulKunci !== null) {
      selesaikan();
      modeKunci = true;
      // "KUNCI JAWABAN PENALARAN UMUM" sekaligus menyebut subtesnya.
      const subtesJudul = judulKunci ? bacaJudulSubtes(judulKunci) : null;
      if (subtesJudul) subtesAktif = subtesJudul;
      // "KUNCI JAWABAN: 1. A 2. B 3. C" — judul dan daftarnya satu baris.
      else for (const e of pecahBarisKunci(judulKunci)) {
        daftarKunci.push({ ...e, subtes: subtesAktif });
      }
      continue;
    }
    if (modeKunci) {
      if (!teks) continue; // baris kosong di halaman kunci
      const pasangan = pecahBarisKunci(teks);
      if (pasangan.length > 0) {
        for (const e of pasangan) daftarKunci.push({ ...e, subtes: subtesAktif });
        continue;
      }
      // Barisnya bukan kunci lagi — misalnya naskah yang menaruh satu halaman
      // kunci di ujung TIAP subtes, lalu melanjutkan soal berikutnya. Mode
      // kunci ditutup dan barisnya diproses ulang sebagai naskah biasa.
      modeKunci = false;
    }

    // --- baris berlabel: kunci / pembahasan / tipe / level / nilai ---
    const kunci = teks.match(POLA_KUNCI);
    if (kunci && sekarang && !daftarHuruf) {
      const nilai = kunci[1].trim();
      // "Jawaban: ______ (bilangan bulat) (Jawaban: 8)" bukan baris kunci,
      // melainkan TEMPAT ISIAN di dalam soal — kuncinya "(Jawaban: 8)" di
      // ujung baris, atau di daftar kunci akhir naskah bila tidak ditulis.
      // Dulu seluruh sisa barisnya tersimpan mentah sebagai kunci.
      const ekorIsian = ambilJawabanEkor(p);
      const tempatIsian = /^(?:_{2,}|…|\.{3,})/.test(nilai);
      if (ekorIsian || tempatIsian) {
        alirkanCalonKeBadan(sekarang);
        const html = ekorIsian ? buangEkorHtml(p.html, ekorIsian.ekor) : p.html;
        sekarang.pertanyaan = sambungBlok(sekarang.pertanyaan, pecahBaris(html));
        if (ekorIsian) pasangKunciIsian(sekarang, ekorIsian.kunci);
        continue;
      }
      sekarang.kunci = nilai;
      bagian = null;
      continue;
    }
    const tipe = teks.match(POLA_TIPE);
    if (tipe && sekarang && !daftarHuruf) {
      sekarang.tipe = tipe[1].trim();
      bagian = null;
      continue;
    }
    const level = teks.match(POLA_LEVEL);
    if (level && sekarang && !daftarHuruf) {
      sekarang.level = level[1].trim();
      bagian = null;
      continue;
    }
    const nilai = teks.match(POLA_NILAI);
    if (nilai && sekarang && !daftarHuruf) {
      sekarang.nilai = nilai[1]
        .split(/[,;/|\s]+/)
        .map((v) => v.trim())
        .filter(Boolean);
      bagian = null;
      continue;
    }
    const pembahasan = teks.match(POLA_PEMBAHASAN);
    if (pembahasan && sekarang && !daftarHuruf) {
      // Dulu disimpan sebagai TEKS POLOS, sehingga "s²" jatuh menjadi "s2" dan
      // diam-diam mengubah arti pembahasan PK dan PM. Sekarang label
      // "Pembahasan:" dipotong dari versi HTML-nya, seperti jalur Warung Soal.
      sekarang.pembahasan = potongAwalanHtml(p.html, teks.length - pembahasan[1].length);
      bagian = "pembahasan";
      continue;
    }
    // Label "Pembahasan" berdiri sendiri, isinya menyusul di baris berikutnya.
    if (POLA_PEMBAHASAN_SENDIRI.test(teks) && sekarang && !daftarHuruf) {
      bagian = "pembahasan";
      continue;
    }

    // --- butir daftar otomatis Word yang BUKAN pilihan berhuruf ---
    // Bisa nomor soal, bisa pernyataan "(1)…(4)" di dalam soal, bisa butir
    // bulat berisi data, bisa pula pilihan yang dinomori angka. Dulu semuanya
    // dianggap soal baru asal berada di tingkat terluar, sehingga naskah PK
    // 20 soal terbaca 32 butir dan pernyataan-pernyataannya menjadi "soal"
    // tanpa pilihan. Sekarang perannya ditimbang dari nomor yang digambar Word.
    const daftarLain = p.berdaftar && !daftarHuruf && !POLA_OPSI.test(teks);
    let soalDariDaftar = false;
    if (daftarLain) {
      if (!teks && p.gambar.length === 0) continue; // sisa Enter pada daftar
      const peran = peranButirDaftar(p, sekarang, bagian);
      if (peran === "soal") {
        soalDariDaftar = true;
      } else if (peran === "isi-opsi" && sekarang) {
        // "A." yang dibiarkan kosong lalu diisi butir bersarang: "(1) dan (2)".
        const i = sekarang.opsi.length - 1;
        sekarang.opsi[i] = berlabel(p);
        sekarang.opsiBertanda[i] = !!sekarang.opsiBertanda[i] || adaTanda(p);
        sekarang.opsiMerah[i] = !!sekarang.opsiMerah[i] || adaTandaMerah(p);
        sekarang.berkasGambar.push(...p.gambar);
        continue;
      } else if (peran === "opsi" && sekarang) {
        sekarang.opsi.push(p.html);
        sekarang.opsiBertanda[sekarang.opsi.length - 1] = adaTanda(p);
        sekarang.opsiMerah[sekarang.opsi.length - 1] = adaTandaMerah(p);
        sekarang.berkasGambar.push(...p.gambar);
        bagian = "opsi";
        continue;
      } else if (peran === "calon" && sekarang) {
        sekarang.calon.push({
          html: p.html,
          label: p.labelDaftar,
          bertanda: adaTanda(p),
          merah: adaTandaMerah(p),
        });
        sekarang.berkasGambar.push(...p.gambar);
        continue;
      }
      // "bacaan": jatuh ke penanganan paragraf di luar soal, di bawah.
    }

    // --- awal soal baru ---
    // Nomor yang diketik ("1.") — kecuali pada pilihan berhuruf, yang isinya
    // boleh saja diawali angka.
    const soalBaru = daftarHuruf ? null : teks.match(POLA_NOMOR_SOAL);
    if (soalBaru || soalDariDaftar) {
      selesaikan();
      tutupBacaan();

      const nomorTeks = soalBaru ? soalBaru[1] : String(nomorSoalDaftar(p, butir, subtesAktif));
      const jawabanEkor = ambilJawabanEkor(p);
      const htmlSoal = soalBaru
        ? potongAwalanHtml(p.html, soalBaru[0].length - soalBaru[2].length)
        : p.html;

      sekarang = {
        ...butirKosong(),
        subtes: subtesAktif,
        nomor: nomorTeks,
        pertanyaan: pecahBaris(jawabanEkor ? buangEkorHtml(htmlSoal, jawabanEkor.ekor) : htmlSoal),
        berkasGambar: [...p.gambar],
        nomorAngka: Number.parseInt(nomorTeks, 10) || 0,
        opsiBertanda: [],
        opsiMerah: [],
        kunciTanda: "",
        kunciTandaMerah: "",
        tandaPertanyaan: jawabanEkor
          ? []
          : p.teksBertanda.filter((x) => tandaBermakna(x.teks)).map((x) => x.teks),
        calon: [],
        idDaftar: soalBaru ? "" : p.idDaftar,
      };
      if (p.adaRumus) {
        catatan.push(
          `Soal ${subtesAktif || "?"} nomor ${nomorTeks} memuat rumus Word — periksa apakah lambangnya terbaca utuh.`,
        );
      }
      pasangBacaan(sekarang);
      adaSoalSejakTajuk = true;
      bagian = "pertanyaan";
      if (jawabanEkor) pasangKunciIsian(sekarang, jawabanEkor.kunci);
      continue;
    }

    // --- kunci berupa satu huruf sendirian ---
    // Sebagian guru menuliskan kuncinya begitu saja di bawah pilihan terakhir
    // ("D"), tanpa label "Kunci:". Tanpa aturan ini huruf itu tersambung ke
    // pilihan terakhir — "Indifferent and detached D" — dan soalnya dianggap
    // tidak berkunci. Syaratnya diperketat supaya tidak menelan pilihan yang
    // sah: hanya berlaku ketika pilihan sedang/sudah dibaca dan soalnya belum
    // punya kunci.
    const hurufSendiri = /^([A-Ea-e])[.)]?$/.exec(teks);
    if (hurufSendiri && sekarang && bagian === "opsi" && !sekarang.kunci && sekarang.opsi.length >= 2) {
      sekarang.kunci = hurufSendiri[1].toUpperCase();
      kunciTanpaLabel++;
      bagian = null;
      continue;
    }

    // --- opsi jawaban ---
    // Diperiksa lebih dulu daripada opsi tunggal: baris "A. x B. y C. z" juga
    // cocok dengan pola opsi tunggal, dan kalau itu yang menang seluruh
    // pilihan berjajar akan tertelan menjadi isi pilihan A saja.
    const sebaris = sekarang ? pecahOpsiSebaris(teks) : null;
    if (sebaris && sekarang) {
      if (sekarang.opsi.length === 0) alirkanCalonKeBadan(sekarang);
      sekarang.opsi = sebaris;
      // Pilihan berjajar dalam satu baris: yang menandai kunci adalah LABEL
      // pilihan yang ikut diwarnai ("(C) "). Kata bertanda di dalam kalimat
      // soal sengaja diabaikan — kata itu kerap muncul lagi sebagai isi salah
      // satu pilihan, dan menebak dari situ akan salah kunci.
      const labelDari = (hanyaMerah: boolean) => [
        ...new Set(
          p.teksBertanda
            .filter((t) => !hanyaMerah || t.merah)
            .map((t) => /^\(?([A-Ea-e])\)?[.)]?$/.exec(t.teks.trim())?.[1]?.toUpperCase())
            .filter((t): t is string => !!t),
        ),
      ];
      const label = labelDari(false);
      const labelMerah = labelDari(true);
      if (label.length === 1) sekarang.kunciTanda = label[0];
      if (labelMerah.length === 1) sekarang.kunciTandaMerah = labelMerah[0];
      sekarang.berkasGambar.push(...p.gambar);
      bagian = "opsi";
      continue;
    }

    const opsi = teks.match(POLA_OPSI);
    if (opsi && sekarang) {
      const indeks = "ABCDE".indexOf(opsi[1].toUpperCase());
      if (indeks >= 0) {
        // Pernyataan/butir yang tertahan di atas pilihan pertama = badan soal.
        if (sekarang.opsi.length === 0) alirkanCalonKeBadan(sekarang);
        while (sekarang.opsi.length < indeks) sekarang.opsi.push("");
        sekarang.opsi[indeks] = potongAwalanHtml(p.html, opsi[0].length - opsi[2].length);
        sekarang.opsiBertanda[indeks] = adaTanda(p);
        sekarang.opsiMerah[indeks] = adaTandaMerah(p);
        sekarang.berkasGambar.push(...p.gambar);
        bagian = "opsi";
        continue;
      }
    }
    // Pilihan yang hurufnya dibuat Word sendiri: daftar berhuruf di tingkat
    // mana pun. (Daftar bersarang yang bukan berhuruf sudah ditimbang di atas.)
    if (daftarHuruf && sekarang) {
      if (sekarang.opsi.length === 0) alirkanCalonKeBadan(sekarang);
      sekarang.opsi.push(p.html);
      sekarang.opsiBertanda[sekarang.opsi.length - 1] = adaTanda(p);
      sekarang.opsiMerah[sekarang.opsi.length - 1] = adaTandaMerah(p);
      sekarang.berkasGambar.push(...p.gambar);
      bagian = "opsi";
      continue;
    }

    // --- kalimat pengantar bacaan ---
    // "Teks berikut digunakan untuk menjawab soal nomor 39 dan 40." Kalimat ini
    // boleh berdiri di mana saja, TERMASUK tepat di bawah pilihan terakhir soal
    // sebelumnya — begitulah naskah PBM dan PPU 4 September ditulis, tanpa baris
    // kosong pemisah. Karena dulu hanya diperiksa saat tidak ada soal terbuka,
    // kalimatnya tertelan menjadi ekor pilihan E (peserta membaca "9. Teks
    // berikut digunakan untuk menjawab soal nomor 39 dan 40." sebagai pilihan),
    // dan bacaan di bawahnya kehilangan cakupan sehingga hanya menempel ke satu
    // soal — soal pasangannya tampil tanpa bacaan sama sekali.
    const cakupan = cakupanPengantar(teks);
    if (cakupan) {
      selesaikan();
      tutupBacaan();
      bacaan.dari = cakupan.dari;
      bacaan.sampai = cakupan.sampai;
      continue; // kalimat pengantarnya sendiri tidak ikut jadi bacaan
    }

    // --- paragraf lanjutan ---
    if (!sekarang) {
      // Masih di luar soal: ini bagian bacaan.
      if (p.html) bacaan.html = sambungBlok(bacaan.html, pecahBaris(p.html));
      bacaan.berkasGambar.push(...p.gambar);
      continue;
    }

    if (bagian === "pembahasan") {
      sekarang.pembahasan = sambungBlok(sekarang.pembahasan, pecahBaris(p.html));
      continue;
    }
    // Paragraf PANJANG sesudah pilihan bukan sambungan pilihan yang terlipat,
    // melainkan bacaan untuk kelompok soal berikutnya yang ditulis tanpa judul
    // apa pun. Tanpa aturan ini seluruh bacaan itu tertelan menjadi ekor
    // pilihan terakhir — pernah terjadi pada naskah LIT Inggris, di mana
    // pilihan E membengkak menjadi 2.298 karakter.
    // Berlaku juga sesudah baris "Kunci:"/"Tipe:" (bagian null) — soalnya sudah
    // tuntas. Yang TIDAK disentuh: lanjutan pertanyaan dan pembahasan, yang
    // memang boleh panjang.
    if ((bagian === "opsi" || bagian === null) && teks.length >= AMBANG_BACAAN_BARU) {
      selesaikan();
      tutupBacaan();
      if (adaSoalSejakTajuk) {
        bacaanBerlaku.length = 0;
        adaSoalSejakTajuk = false;
      }
      bacaan = bacaanBaru(true);
      bacaan.html = sambungBlok(bacaan.html, pecahBaris(p.html));
      bacaan.berkasGambar.push(...p.gambar);
      continue;
    }
    if (bagian === "opsi" && sekarang.opsi.length > 0) {
      // Sambungan opsi terakhir yang terpotong ke baris baru. Di sini spasi
      // memang benar: yang tersambung adalah satu kalimat pilihan yang terlipat,
      // bukan alinea baru. Paragraf kosong tidak ikut menambah spasi.
      if (p.html) sekarang.opsi[sekarang.opsi.length - 1] += ` ${p.html}`;
      sekarang.berkasGambar.push(...p.gambar);
      continue;
    }
    // Lanjutan pertanyaan. Butir daftar yang tertahan di atasnya jelas bagian
    // badan soal — dialirkan dulu supaya urutannya tetap seperti di naskah.
    alirkanCalonKeBadan(sekarang);
    const jawabanLanjutan = ambilJawabanEkor(p);
    sekarang.pertanyaan = sambungBlok(
      sekarang.pertanyaan,
      pecahBaris(jawabanLanjutan ? buangEkorHtml(p.html, jawabanLanjutan.ekor) : p.html),
    );
    sekarang.berkasGambar.push(...p.gambar);
    if (jawabanLanjutan) {
      pasangKunciIsian(sekarang, jawabanLanjutan.kunci);
    } else {
      // Jawaban isian yang ditandai warna boleh berada di paragraf lanjutan,
      // bukan hanya di baris pertama soal.
      for (const x of p.teksBertanda) {
        if (tandaBermakna(x.teks)) sekarang.tandaPertanyaan.push(x.teks);
      }
    }
  }

  selesaikan();

  // --- pasangkan daftar kunci ke soalnya ---
  let kunciDariDaftar = 0;
  const kunciTakBertuan: number[] = [];
  for (const e of daftarKunci) {
    const cocok = butir.filter(
      (b) => b.nomorAngka === e.nomor && (!e.subtes || !b.subtes || b.subtes === e.subtes),
    );
    const sasaran = cocok.find((b) => !b.kunci) ?? null;
    if (!sasaran) {
      if (cocok.length === 0) kunciTakBertuan.push(e.nomor);
      continue;
    }
    sasaran.kunci = e.kunci;
    kunciDariDaftar++;
  }
  if (kunciDariDaftar > 0) {
    catatan.push(
      `${kunciDariDaftar} kunci diambil dari daftar kunci di akhir naskah. Cocokkan nomornya di pratinjau.`,
    );
  }
  if (kunciTakBertuan.length > 0) {
    catatan.push(
      `Kunci nomor ${kunciTakBertuan.join(", ")} pada daftar kunci tidak menemukan soal yang cocok.`,
    );
  }

  // --- kunci dari pilihan yang DITANDAI warna atau stabilo ---
  // Cara menandai kunci yang paling sering dipakai guru tetapi paling tidak
  // kelihatan oleh mesin: jawaban benar diberi warna merah, tanpa satu kata
  // pun yang menyebut "kunci". Syaratnya ketat — hanya soal yang belum
  // berkunci, dan hanya bila TEPAT SATU pilihannya ditandai; naskah yang
  // seluruh teksnya berwarna tidak akan tertipu olehnya.
  let kunciDariTanda = 0;
  let kunciDariMerah = 0;
  const tandaKembar: string[] = [];
  for (const b of butir) {
    if (b.kunci) continue;
    const ditandai = b.opsiBertanda.flatMap((t, i) => (t ? [i] : []));
    const merah = b.opsiMerah.flatMap((t, i) => (t ? [i] : []));

    // MERAH dulu. Pada naskah yang seluruh tubuhnya diberi warna — atau yang
    // memakai warna lain untuk hal di luar kunci — semua pilihan tampak
    // bertanda dan dulu kuncinya gagal disimpulkan sama sekali. Merah menjadi
    // pemutusnya, karena itulah warna yang dipakai guru di sekolah ini.
    let huruf = "";
    let dariMerah = false;
    if (merah.length === 1) {
      huruf = "ABCDE"[merah[0]];
      dariMerah = true;
    } else if (b.kunciTandaMerah) {
      huruf = b.kunciTandaMerah;
      dariMerah = true;
    } else if (ditandai.length === 1) {
      huruf = "ABCDE"[ditandai[0]];
    } else {
      huruf = b.kunciTanda;
    }

    if (!huruf) {
      // Bertanda tetapi tidak bisa disimpulkan: patut dilaporkan, karena dari
      // layar pratinjau soal ini hanya tampak "kunci kosong" tanpa sebab.
      if (ditandai.length > 1) {
        tandaKembar.push(`${b.subtes || "?"} nomor ${b.nomor || "?"}`);
      }
      continue;
    }
    b.kunci = huruf;
    kunciDariTanda++;
    if (dariMerah) kunciDariMerah++;
  }
  if (kunciDariTanda > 0) {
    const dasar =
      kunciDariMerah === kunciDariTanda
        ? "ditandai warna MERAH"
        : kunciDariMerah > 0
          ? `ditandai warna di naskah (${kunciDariMerah} di antaranya merah)`
          : "ditandai warna atau stabilo di naskah";
    catatan.push(
      `${kunciDariTanda} kunci disimpulkan dari pilihan yang ${dasar}. Cocokkan beberapa di pratinjau sebelum menyimpan.`,
    );
  }
  if (tandaKembar.length > 0) {
    catatan.push(
      `Lebih dari satu pilihan ditandai warna pada ${tandaKembar.length} soal (${tandaKembar
        .slice(0, 6)
        .join(", ")}${tandaKembar.length > 6 ? ", …" : ""}), jadi kuncinya tidak bisa disimpulkan. Isi kuncinya sendiri di kolom Kunci pada pratinjau.`,
    );
  }

  // --- jawaban isian singkat yang ditandai di ujung pertanyaan ---
  // Kebiasaan yang sama (menandai jawaban dengan warna) pada soal tanpa
  // pilihan: jawabannya diketik menempel di ujung pertanyaan. Selain menjadi
  // kunci, potongan itu WAJIB dibuang dari pertanyaannya.
  for (const b of butir) {
    if (b.kunci || b.opsi.length > 0 || b.tandaPertanyaan.length !== 1) continue;
    const ekor = b.tandaPertanyaan[0];
    const polos = b.pertanyaan.replace(/<[^>]*>/g, "").trimEnd();
    if (!polos.endsWith(ekor)) continue;
    b.kunci = ekor;
    b.pertanyaan = buangEkorHtml(b.pertanyaan, ekor);
    kunciDariTanda++;
  }

  // --- soal tanpa pilihan yang kuncinya berupa kata = isian singkat ---
  // Kunci satu huruf sengaja TIDAK ikut: itu justru tanda pilihannya yang
  // gagal terbaca, dan soal seperti itu harus tetap ditandai galat agar
  // diperiksa, bukan diam-diam diubah bentuknya.
  for (const b of butir) {
    if (!b.tipe && b.opsi.length === 0 && b.kunci && !/^[A-E]$/i.test(b.kunci.trim())) {
      b.tipe = "IS";
    }
    if (b.tipe === "IS" && b.kunci) {
      const { kunci, satuan } = rapikanKunciIsian(b.kunci);
      if (kunci !== b.kunci) {
        if (satuan) {
          catatan.push(
            `Soal ${b.subtes || "?"} nomor ${b.nomor}: kunci isian "${b.kunci}" disimpan sebagai "${kunci}" — satuan "${satuan}" dibuang karena jawaban siswa dicocokkan persis dengan kuncinya.`,
          );
        }
        b.kunci = kunci;
      }
    }
  }

  if (kunciTanpaLabel > 0) {
    catatan.push(
      `${kunciTanpaLabel} kunci dibaca dari baris yang hanya berisi satu huruf di bawah pilihan terakhir (tanpa label "Kunci:"). Cocokkan sekilas di pratinjau.`,
    );
  }

  return { butir, catatan };
}

function hitungNomorOtomatis(butir: ButirKerja[], subtes: string): number {
  let n = 0;
  for (const b of butir) if (b.subtes === subtes) n++;
  return n;
}

/**
 * Nomor soal dari daftar otomatis Word: angka yang digambar Word dipakai bila
 * memang melanjutkan urutan (naskah PK: satu daftar 1-20; naskah PU: tiap
 * soal daftar sendiri dengan "start at" yang benar). Daftar yang mulai lagi
 * dari 1 untuk tiap soal — kebiasaan menyalin soal satu per satu — dihitung
 * sendiri seperti dulu.
 */
function nomorSoalDaftar(p: ParagrafDocx, butir: ButirKerja[], subtes: string): number {
  let terakhir = 0;
  for (const b of butir) if (b.subtes === subtes && b.nomorAngka > terakhir) terakhir = b.nomorAngka;
  if (p.nomorDaftar > terakhir) return p.nomorDaftar;
  return hitungNomorOtomatis(butir, subtes) + 1;
}

/** Isi paragraf daftar berikut label yang digambar Word: "(1) dan (2)." */
function berlabel(p: ParagrafDocx): string {
  return p.labelDaftar ? `${p.labelDaftar} ${p.html}`.trim() : p.html;
}

type PeranDaftar = "soal" | "calon" | "isi-opsi" | "opsi" | "bacaan";

/**
 * Menimbang peran sebuah butir daftar otomatis yang bukan berhuruf.
 *
 * - Belum ada soal: daftar bernomor terluar membuka soal; butir bulat,
 *   berkurung "(1)", atau bersarang adalah bagian bacaan.
 * - Soal sudah berpilihan: butir bersarang mengisi pilihan berhuruf yang
 *   kosong ("A." lalu "(1) dan (2)") atau menjadi pilihan tambahan; daftar
 *   bernomor terluar adalah soal berikutnya.
 * - Soal belum berpilihan: butir bulat/berkurung/bersarang ditahan sebagai
 *   `calon`. Daftar bernomor terluar dianggap soal berikutnya hanya bila
 *   soalnya sudah tuntas (berkunci, mis. isian singkat) atau nomornya memang
 *   melanjutkan — daftar lain yang mulai lagi dari 1 adalah pernyataan di
 *   dalam soal ("Manakah pernyataan berikut yang benar? 1. … 2. …").
 */
function peranButirDaftar(
  p: ParagrafDocx,
  sekarang: ButirKerja | null,
  bagian: string | null,
): PeranDaftar {
  const bulat = p.formatDaftar === "bullet";
  const berkurung = /^\(\s*\d+\s*\)$/.test(p.labelDaftar);
  const bersarang = p.tingkatDaftar >= 1;
  if (!sekarang) return bulat || berkurung || bersarang ? "bacaan" : "soal";

  if (bagian === "opsi" && sekarang.opsi.length > 0) {
    const terakhir = sekarang.opsi[sekarang.opsi.length - 1];
    if (bersarang && !terakhir.trim()) return "isi-opsi";
    if (bersarang) return "opsi";
    return bulat || berkurung ? "calon" : "soal";
  }

  if (bulat || berkurung || bersarang) return "calon";
  const tuntas = bagian === null || bagian === "pembahasan" || !!sekarang.kunci;
  if (tuntas) return "soal";
  if (sekarang.idDaftar && p.idDaftar === sekarang.idDaftar) return "soal";
  if (p.nomorDaftar > 0 && sekarang.nomorAngka > 0 && p.nomorDaftar === sekarang.nomorAngka + 1) {
    return "soal";
  }
  return "calon";
}

/**
 * "(Jawaban: 36)" di ujung baris soal — kebiasaan guru menuliskan kunci isian
 * singkat. Bentuk berkurung diterima apa adanya; tanpa kurung hanya bila
 * potongannya memang ditandai warna, supaya kalimat soal biasa yang memuat
 * kata "jawaban:" tidak ikut terpotong.
 */
const POLA_JAWABAN_EKOR_KURUNG =
  /\(\s*(?:jawaban|kunci(?:\s*jawaban)?|answer)\s*[:：]\s*([^()]+?)\s*\)\s*$/i;
const POLA_JAWABAN_EKOR_POLOS = /(?:jawaban|kunci(?:\s*jawaban)?|answer)\s*[:：]\s*(\S[^()]*?)\s*$/i;

function ambilJawabanEkor(p: ParagrafDocx): { kunci: string; ekor: string } | null {
  const teks = p.teks.trim();
  let m = teks.match(POLA_JAWABAN_EKOR_KURUNG);
  if (!m && p.teksBertanda.some((x) => /jawaban|kunci|answer/i.test(x.teks))) {
    m = teks.match(POLA_JAWABAN_EKOR_POLOS);
  }
  if (!m || m.index === undefined || m.index === 0 || !m[1].trim()) return null;
  return { kunci: m[1].trim(), ekor: m[0].trim() };
}

/**
 * Kunci isian singkat dibersihkan supaya cocok dengan cara `cekJawaban`
 * membandingkan: tanda minus Unicode jadi "-", dan satuan di belakang angka
 * ("90 m", "36 cm²") dibuang — siswa mengetik angkanya saja.
 */
function rapikanKunciIsian(mentah: string): { kunci: string; satuan: string } {
  const bersih = mentah.replace(/[−–—]/g, "-").replace(/\s+/g, " ").trim();
  const m = bersih.match(/^(-?\d+(?:[.,]\d+)*)\s*([\p{L}°%µ][\s\S]*)$/u);
  if (m) return { kunci: m[1], satuan: m[2].trim() };
  return { kunci: bersih, satuan: "" };
}

/**
 * Tabel "Pernyataan | Benar | Salah" = soal Benar/Salah yang ditulis guru
 * lengkap dengan kuncinya: centang (atau tanda apa pun) di kolom Benar/Salah.
 * null bila tabelnya bukan bentuk itu.
 */
function tabelBenarSalah(t: TabelDocx): { pernyataan: string[]; kunci: string } | null {
  if (t.baris.length < 2) return null;
  const judul = t.baris[0].map((s) => s.toLowerCase().replace(/\s+/g, " ").trim());
  const iP = judul.findIndex((j) => /pernyataan|statement/.test(j));
  const iB = judul.findIndex((j) => /^(?:benar|true|b)$/.test(j));
  const iS = judul.findIndex((j) => /^(?:salah|false|s)$/.test(j));
  if (iP < 0 || iB < 0 || iS < 0) return null;

  const lolos = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const pernyataan: string[] = [];
  const kunci: string[] = [];
  let lengkap = true;
  for (let r = 1; r < t.baris.length; r++) {
    const teks = (t.baris[r][iP] ?? "").trim();
    if (!teks) continue;
    const html = t.barisHtml[r]?.[iP] ?? "";
    const tunggal = html.match(/^\s*<p>([\s\S]*)<\/p>\s*$/);
    pernyataan.push(tunggal && !tunggal[1].includes("<p>") ? tunggal[1] : html || lolos(teks));
    const benar = (t.baris[r][iB] ?? "").trim() !== "";
    const salah = (t.baris[r][iS] ?? "").trim() !== "";
    if (benar && !salah) kunci.push("B");
    else if (salah && !benar) kunci.push("S");
    else {
      kunci.push("?");
      lengkap = false;
    }
  }
  if (pernyataan.length < 2) return null;
  return {
    pernyataan: pernyataan.slice(0, 5),
    kunci: lengkap ? kunci.slice(0, 5).join(",") : "",
  };
}

/** Blok HTML yang berdiri sendiri; jarak antar-blok diatur CSS, bukan spasi. */
const AWALAN_BLOK = /^\s*<(p|table|div|ul|ol|h[1-6])[\s>]/i;

/**
 * Sambungkan satu blok naskah ke bidang HTML yang sedang diisi.
 *
 * Dulu paragraf kedua dan seterusnya dilebur dengan SPASI. Itulah yang membuat
 * soal terbaca berantakan: guru lazim menulis data soal di satu paragraf lalu
 * perintahnya di paragraf lain ("Berdasarkan tabel di atas, simpulan yang tepat
 * adalah…"), dan peleburan itu menyatukan keduanya menjadi satu kalimat panjang
 * tanpa jeda. Begitu ada blok kedua, isi yang sudah ada dinaikkan menjadi
 * paragraf `<p>` sehingga jaraknya diatur `.isi-soal p` di globals.css.
 *
 * Soal berparagraf tunggal sengaja TIDAK dibungkus, supaya sakelar
 * `.isi-soal:has(p)` tetap berperilaku seperti sebelumnya.
 */
function sambungBlok(lama: string, baru: string): string {
  const kanan = baru.trim();
  if (!kanan) return lama;
  const kiri = lama.trim();
  if (!kiri) return kanan;
  const bungkus = (v: string) => (AWALAN_BLOK.test(v) ? v : `<p>${v}</p>`);
  return bungkus(kiri) + bungkus(kanan);
}

/**
 * Ubah tabel Word menjadi HTML.
 *
 * Sebelum ini tabel di dalam naskah mengalir DIBUANG seluruhnya — pembacanya
 * hanya menyaring blok paragraf — sehingga soal yang berbunyi "Perhatikan tabel
 * berikut" sampai ke layar peserta tanpa tabelnya sama sekali. Untuk soal PK dan
 * PM yang datanya memang tersaji dalam tabel, itu membuat soalnya mustahil
 * dijawab, bukan sekadar tidak rapi.
 *
 * Baris pertama dijadikan judul kolom hanya bila memang terbaca sebagai judul:
 * semua selnya terisi dan tidak ada yang berupa angka. Tabel data yang langsung
 * dimulai dengan angka tetap utuh sebagai `<td>`.
 *
 * Pembungkus `.tabel-soal` memberi tabel gulir mendatarnya sendiri, supaya tabel
 * lebar tidak pernah mendorong lebar halaman di layar ponsel.
 */
function tabelKeHtml(t: TabelDocx): string {
  const dipakai = t.barisHtml
    .map((b, i) => i)
    .filter((i) => t.barisHtml[i].some((sel) => sel.trim() !== ""));
  const baris = dipakai.map((i) => t.barisHtml[i]);
  const rentang = dipakai.map((i) => t.barisRentang[i] ?? []);
  if (baris.length === 0) return "";

  const berjudul =
    baris.length > 1 &&
    baris[0].every((sel) => sel.trim() !== "") &&
    !baris[0].some((sel) => /^\s*<p>\s*[\d.,%\s]+<\/p>\s*$/.test(sel));

  const sel = (isi: string, judul: boolean, lebar: number) => {
    // Satu paragraf dalam satu sel tidak perlu dibungkus <p>: itu hanya
    // menambah jarak vertikal yang membuat baris tabel jadi tinggi sekali.
    const tunggal = isi.match(/^\s*<p>([\s\S]*)<\/p>\s*$/);
    const teks = tunggal && !tunggal[1].includes("<p>") ? tunggal[1] : isi;
    // `colspan` menjaga lajur tabel tetap lurus untuk sel yang digabung guru.
    const rentangan = lebar > 1 ? ` colspan="${lebar}"` : "";
    return judul ? `<th${rentangan}>${teks}</th>` : `<td${rentangan}>${teks}</td>`;
  };

  const isi = baris
    .map(
      (b, i) =>
        `<tr>${b
          .map((c, k) => sel(c, berjudul && i === 0, rentang[i]?.[k] ?? 1))
          .join("")}</tr>`,
    )
    .join("");
  return `<div class="tabel-soal"><table>${isi}</table></div>`;
}

/**
 * Pecah satu paragraf Word yang memuat pemutus baris manual menjadi beberapa
 * paragraf HTML.
 *
 * Guru kerap menekan Shift+Enter (atau menempel teks dari PDF) sehingga satu
 * "paragraf" Word sebenarnya berisi beberapa alinea. Bila dibiarkan, seluruhnya
 * menjadi satu blok raksasa yang di layar ponsel bisa setinggi beberapa layar
 * sebelum pertanyaannya muncul.
 */
function pecahBaris(html: string): string {
  const bagian = html
    .split(/\n+/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (bagian.length <= 1) return html.trim();
  return bagian.map((b) => `<p>${b}</p>`).join("");
}

/**
 * Buang awalan penomoran dari versi HTML sebuah paragraf.
 *
 * Teks polos dan HTML berasal dari paragraf yang sama dan urutannya identik,
 * tapi HTML-nya bisa mengandung tag. Jadi pemotongan dilakukan per karakter
 * terlihat, bukan per indeks mentah.
 */
export function potongAwalanHtml(html: string, jumlahKarakter: number): string {
  if (jumlahKarakter <= 0) return html;
  let terlihat = 0;
  let i = 0;
  while (i < html.length && terlihat < jumlahKarakter) {
    if (html[i] === "<") {
      const tutup = html.indexOf(">", i);
      i = tutup < 0 ? html.length : tutup + 1;
      continue;
    }
    if (html[i] === "&") {
      const titikKoma = html.indexOf(";", i);
      if (titikKoma > 0 && titikKoma - i <= 8) {
        i = titikKoma + 1;
        terlihat++;
        continue;
      }
    }
    i++;
    terlihat++;
  }
  return html.slice(i).trim();
}

/* ==========================================================================
   GAMBAR
   ========================================================================== */

/**
 * Salin gambar naskah ke `public/soal/<kode-paket>/` dan kembalikan alamatnya.
 *
 * Nama berkas memakai cap sidik jari isinya, jadi gambar yang sama tidak
 * pernah tersalin dua kali dan mengimpor ulang naskah yang sama tidak
 * menumpuk berkas baru.
 */
async function simpanGambarNaskah(
  media: Map<string, Uint8Array>,
  berkas: string[],
  kodePaket: string,
): Promise<string> {
  for (const nama of berkas) {
    const isi = media.get(nama);
    if (!isi) continue;
    if (!jenisGambar(nama)) continue;

    const ext = nama.toLowerCase().split(".").pop() ?? "png";
    const sidik = createHash("sha1").update(isi).digest("hex").slice(0, 16);
    const folderRelatif = path.posix.join("soal", amanNamaFolder(kodePaket));
    const folder = path.join(process.cwd(), "public", folderRelatif);
    const berkasNama = `${sidik}.${ext}`;

    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, berkasNama), isi);
    return `/${folderRelatif}/${berkasNama}`;
  }
  return "";
}

function amanNamaFolder(v: string): string {
  const bersih = v.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return bersih || "naskah";
}

/* ==========================================================================
   PINTU MASUK
   ========================================================================== */

export async function bacaNaskahDocx(
  data: ArrayBuffer,
  opsi: { kodePaket: string; simpanGambar: boolean; subtesBawaan?: string },
): Promise<HasilNaskah> {
  const { blok, media } = await bacaDocx(data);

  const tabel = cariTabelTemplate(blok);
  if (tabel) {
    return {
      butir: bacaTabelTemplate(tabel),
      catatan: [
        `Naskah dibaca dari tabel berjudul kolom (${tabel.baris.length - 1} baris). Paragraf di luar tabel diabaikan.`,
      ],
      cara: "tabel",
    };
  }

  const { butir, catatan } = bacaNaskahMengalir(blok, opsi.subtesBawaan ?? "");

  if (butir.length === 0) {
    catatan.push(
      "Tidak ada satu pun soal yang terbaca. Pastikan tiap soal diawali penomoran seperti \"1.\" dan tiap pilihan diawali \"A.\".",
    );
  }

  const hasil: ButirNaskah[] = [];
  for (const b of butir) {
    const gambar_url =
      b.berkasGambar.length && opsi.simpanGambar
        ? await simpanGambarNaskah(media, b.berkasGambar, opsi.kodePaket)
        : b.berkasGambar.length
          ? "(gambar akan disalin saat disimpan)"
          : "";

    hasil.push({
      subtes: b.subtes,
      nomor: b.nomor,
      tipe: b.tipe,
      level: b.level,
      stimulus: b.stimulus,
      pertanyaan: b.pertanyaan,
      gambar_url,
      opsi: b.opsi,
      kunci: b.kunci,
      nilai: b.nilai,
      pembahasan: b.pembahasan,
    });
  }

  const tanpaSubtes = hasil.filter((b) => !b.subtes).length;
  if (tanpaSubtes > 0) {
    catatan.push(
      `${tanpaSubtes} soal belum punya subtes. Tambahkan judul bagian (mis. baris berbunyi "PENALARAN UMUM") sebelum kelompok soalnya.`,
    );
  }
  const tanpaKunci = hasil.filter((b) => !b.kunci).length;
  if (tanpaKunci > 0) {
    catatan.push(
      `${tanpaKunci} soal belum punya kunci. Tulis barisnya sebagai "Kunci: C" tepat di bawah pilihan terakhir.`,
    );
  }

  return { butir: hasil, catatan, cara: "naskah" };
}
