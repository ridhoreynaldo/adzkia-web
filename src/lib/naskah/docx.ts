/**
 * Pembaca berkas Word (.docx) tingkat rendah.
 *
 * Tugasnya cuma satu: mengubah dokumen Word menjadi daftar BLOK yang gampang
 * ditelusuri — paragraf, tabel, dan gambar — lengkap dengan cetak tebal/miring
 * dan pangkat, karena soal UTBK penuh dengan x², H₂O, dan istilah bercetak
 * miring. Penafsiran "blok mana yang jadi soal, mana yang jadi opsi" TIDAK
 * dikerjakan di sini; itu urusan `naskah-docx.ts`.
 *
 * .docx sebetulnya berkas ZIP berisi XML:
 *   word/document.xml           — isi dokumen
 *   word/_rels/document.xml.rels — pemetaan rId -> berkas gambar
 *   word/media/*                 — gambarnya
 *
 * Modul ini hanya dipanggil dari server.
 */
import "server-only";

import JSZip from "jszip";

/* ==========================================================================
   PENGURAI XML SEDERHANA
   ========================================================================== */

export interface SimpulXml {
  nama: string;
  atribut: Record<string, string>;
  anak: SimpulXml[];
}

/**
 * Pengurai XML seadanya — cukup untuk XML keluaran Word, yang selalu rapi,
 * tidak memakai DTD, dan tidak pernah punya entitas selain lima entitas baku.
 * Teks disimpan sebagai simpul semu bernama `#teks` dengan isinya di
 * `atribut.nilai`, supaya urutan teks dan elemen tetap terjaga.
 */
export function uraiXml(xml: string): SimpulXml {
  const akar: SimpulXml = { nama: "#akar", atribut: {}, anak: [] };
  const tumpukan: SimpulXml[] = [akar];
  let i = 0;

  const bukaEntitas = (v: string): string =>
    v
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(Number.parseInt(h, 16)))
      .replace(/&amp;/g, "&");

  while (i < xml.length) {
    const buka = xml.indexOf("<", i);
    if (buka < 0) break;

    if (buka > i) {
      const teks = xml.slice(i, buka);
      if (teks) {
        tumpukan[tumpukan.length - 1].anak.push({
          nama: "#teks",
          atribut: { nilai: bukaEntitas(teks) },
          anak: [],
        });
      }
    }

    // Lewati deklarasi, komentar, dan CDATA tanpa menafsirkannya.
    if (xml.startsWith("<!--", buka)) {
      const tutup = xml.indexOf("-->", buka);
      i = tutup < 0 ? xml.length : tutup + 3;
      continue;
    }
    if (xml.startsWith("<?", buka)) {
      const tutup = xml.indexOf("?>", buka);
      i = tutup < 0 ? xml.length : tutup + 2;
      continue;
    }
    if (xml.startsWith("<![CDATA[", buka)) {
      const tutup = xml.indexOf("]]>", buka);
      const isi = xml.slice(buka + 9, tutup < 0 ? xml.length : tutup);
      tumpukan[tumpukan.length - 1].anak.push({
        nama: "#teks",
        atribut: { nilai: isi },
        anak: [],
      });
      i = tutup < 0 ? xml.length : tutup + 3;
      continue;
    }

    const tutup = xml.indexOf(">", buka);
    if (tutup < 0) break;
    const isiTag = xml.slice(buka + 1, tutup);
    i = tutup + 1;

    if (isiTag.startsWith("/")) {
      if (tumpukan.length > 1) tumpukan.pop();
      continue;
    }

    const mandiri = isiTag.endsWith("/");
    const badan = mandiri ? isiTag.slice(0, -1) : isiTag;
    const spasi = badan.search(/\s/);
    const nama = (spasi < 0 ? badan : badan.slice(0, spasi)).trim();
    if (!nama) continue;

    const atribut: Record<string, string> = {};
    if (spasi > 0) {
      const sisa = badan.slice(spasi);
      const pola = /([\w:.-]+)\s*=\s*"([^"]*)"|([\w:.-]+)\s*=\s*'([^']*)'/g;
      let m: RegExpExecArray | null;
      while ((m = pola.exec(sisa)) !== null) {
        atribut[m[1] ?? m[3]] = bukaEntitas(m[2] ?? m[4] ?? "");
      }
    }

    const simpul: SimpulXml = { nama, atribut, anak: [] };
    tumpukan[tumpukan.length - 1].anak.push(simpul);
    if (!mandiri) tumpukan.push(simpul);
  }

  return akar;
}

/** Cari simpul anak langsung dengan nama tertentu (mengabaikan awalan ruang nama). */
function anakBernama(simpul: SimpulXml, nama: string): SimpulXml[] {
  return simpul.anak.filter((a) => lepasAwalan(a.nama) === nama);
}

function lepasAwalan(nama: string): string {
  const t = nama.indexOf(":");
  return t < 0 ? nama : nama.slice(t + 1);
}

/** Cari simpul keturunan pertama dengan nama tertentu, sedalam apa pun. */
function turunanPertama(simpul: SimpulXml, nama: string): SimpulXml | null {
  for (const a of simpul.anak) {
    if (lepasAwalan(a.nama) === nama) return a;
    const dalam = turunanPertama(a, nama);
    if (dalam) return dalam;
  }
  return null;
}

/** Kumpulkan seluruh keturunan dengan nama tertentu. */
function semuaTurunan(simpul: SimpulXml, nama: string, hasil: SimpulXml[] = []): SimpulXml[] {
  for (const a of simpul.anak) {
    if (lepasAwalan(a.nama) === nama) hasil.push(a);
    semuaTurunan(a, nama, hasil);
  }
  return hasil;
}

/* ==========================================================================
   BLOK DOKUMEN
   ========================================================================== */

export interface ParagrafDocx {
  jenis: "paragraf";
  /** Teks polos, sudah dirapikan spasinya. Dipakai untuk mencocokkan pola. */
  teks: string;
  /** Teks dengan <b>/<i>/<u>/<sup>/<sub> yang aman dipakai `<TeksSoal/>`. */
  html: string;
  /** Nama gaya paragraf Word (mis. "Heading1"), bila ada. */
  gaya: string;
  /** true bila paragraf ini butir daftar bernomor/berpoin otomatis Word. */
  berdaftar: boolean;
  /** Kedalaman daftar otomatis (0 = tingkat terluar). */
  tingkatDaftar: number;
  /**
   * Bentuk penomoran daftar itu menurut `word/numbering.xml`: "decimal" untuk
   * 1, 2, 3 dan "upperLetter"/"lowerLetter" untuk A, B, C. Kosong bila paragraf
   * ini bukan butir daftar.
   *
   * Ini yang membedakan NOMOR SOAL dari PILIHAN JAWABAN pada naskah yang
   * ditulis guru: keduanya sama-sama daftar otomatis di tingkat terluar, dan
   * hurufnya dibuat Word — tidak pernah muncul di teks paragraf.
   */
  formatDaftar: string;
  /**
   * Label penomoran persis seperti yang DIGAMBAR Word di depan paragraf:
   * "3.", "(1)", "A.", atau "•" untuk butir bulat. Kosong bila bukan daftar.
   *
   * Word tidak pernah menulis label ini di teks paragraf — ia dihitung dari
   * `numbering.xml` saat mencetak. Tanpa menghitungnya sendiri, pilihan yang
   * ditulis guru sebagai "(1) dan (2)" sampai ke peserta sebagai "dan (2)",
   * dan pernyataan "(1)…(4)" di dalam soal tidak bisa dibedakan dari nomor soal.
   */
  labelDaftar: string;
  /** Angka penghitung tingkat ini (3 untuk "3." maupun "(3)"); 0 bila bukan daftar bernomor. */
  nomorDaftar: number;
  /** `w:numId` daftar yang dipakai. Satu numId = satu daftar yang bersambung. */
  idDaftar: string;
  /** Kunci berkas gambar di dalam .docx, mis. "word/media/image3.png". */
  gambar: string[];
  /** true bila ada objek rumus Word (OMML) — teksnya rawan tidak utuh. */
  adaRumus: boolean;
  /**
   * true bila ada teks yang DITANDAI: diberi warna selain hitam atau disorot
   * stabilo. Sebagian guru menandai kunci jawabannya begitu, tanpa menulis
   * "Kunci:" sama sekali. Cetak tebal sengaja tidak dihitung — itu lazim
   * dipakai untuk menegaskan kata di dalam soal, bukan menandai jawaban.
   */
  ditandai: boolean;
  /**
   * Potongan teks yang ditandai itu, apa adanya. Diperlukan ketika seluruh
   * pilihan ditulis berjajar dalam SATU paragraf: yang menunjukkan kuncinya
   * bukan paragrafnya, melainkan label pilihan mana yang ikut diwarnai.
   */
  teksBertanda: TandaDocx[];
}

/** Satu potongan teks yang ditandai, beserta baris tempatnya berada. */
export interface TandaDocx {
  /**
   * Nomor baris di DALAM paragraf; bertambah setiap jeda baris lunak
   * (Shift+Enter). Nomor inilah yang menahan tanda tetap di barisnya sendiri
   * ketika paragraf dipecah. Mencocokkan tanda dengan cara mencari teksnya
   * tidak bisa dipakai: pada soal perbaikan kalimat, kata-kata pilihan yang
   * benar muncul lagi di pilihan lain, sehingga semuanya ikut tampak bertanda
   * dan kuncinya justru tidak bisa disimpulkan.
   */
  baris: number;
  teks: string;
  /**
   * Warna huruf yang menandainya, heks enam digit tanpa "#". Kosong bila yang
   * menandai hanya stabilo atau arsiran. Berisi NAMA warna tema ("accent2")
   * pada dokumen langka yang tidak membawa `theme1.xml`, sehingga tandanya
   * tetap terhitung meski merahnya tak bisa dipastikan.
   */
  warna: string;
  /** Nama warna stabilo Word ("yellow", "green", …), kosong bila tidak distabilo. */
  sorot: string;
  /**
   * Tanda ini MERAH — cara paling lazim guru di sekolah ini menunjuk kunci.
   * Dipakai pembaca naskah untuk mendahulukan merah ketika naskah juga memuat
   * warna lain (judul biru, catatan hijau) yang bukan penunjuk kunci.
   */
  merah: boolean;
}

export interface TabelDocx {
  jenis: "tabel";
  /** Isi sel sebagai teks polos, baris demi baris. */
  baris: string[][];
  /** Isi sel dalam HTML sederhana, sejajar dengan `baris`. */
  barisHtml: string[][];
  /** Tanda warna/stabilo di dalam tiap sel, sejajar dengan `baris`. */
  barisBertanda: TandaDocx[][][];
  /**
   * Berapa kolom yang ditempati tiap sel (`w:gridSpan`), sejajar dengan
   * `baris`. Bernilai 1 untuk sel biasa.
   */
  barisRentang: number[][];
}

export type BlokDocx = ParagrafDocx | TabelDocx;

export interface IsiDocx {
  blok: BlokDocx[];
  /** Isi berkas gambar, dikunci dengan nama seperti pada `ParagrafDocx.gambar`. */
  media: Map<string, Uint8Array>;
}

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Beri tanda kurung bila potongan rumus bukan satu suku tunggal.
 *
 * Dipakai pembilang dan penyebut pecahan: "15^12 x 4^5" WAJIB dikurung supaya
 * garis miringnya tidak terbaca hanya mengenai suku terakhir, sedangkan "5"
 * atau "x" tidak perlu dan kurungnya hanya bikin sesak.
 */
function kurungBila(html: string): string {
  const polos = html.replace(/<[^>]+>/g, "").trim();
  if (!polos) return html;
  return /^[A-Za-z0-9.,²³]+$/.test(polos) ? html : `(${html})`;
}

/** Bungkus teks satu "run" Word sesuai cetak tebal/miring/garis bawah/pangkatnya. */
function bungkusRun(rPr: SimpulXml | null, teks: string): string {
  let html = escapeHtml(teks);
  if (!rPr) return html;

  const nyala = (nama: string): boolean => {
    const n = anakBernama(rPr, nama)[0];
    if (!n) return false;
    const v = n.atribut["w:val"] ?? n.atribut["val"];
    return v !== "0" && v !== "false" && v !== "none";
  };

  const vertikal = anakBernama(rPr, "vertAlign")[0]?.atribut["w:val"];
  if (vertikal === "superscript") html = `<sup>${html}</sup>`;
  else if (vertikal === "subscript") html = `<sub>${html}</sub>`;

  if (nyala("b")) html = `<b>${html}</b>`;
  if (nyala("i")) html = `<i>${html}</i>`;
  if (nyala("u")) html = `<u>${html}</u>`;
  return html;
}

/** Ambil teks dan HTML dari sebuah `<w:p>`, termasuk isi rumus dan gambar. */
/** Satu tingkat penomoran menurut `word/numbering.xml`. */
interface TingkatDaftar {
  /** "decimal", "upperLetter", "bullet", … */
  fmt: string;
  /** Pola label, mis. "%1." atau "(%1)". */
  teks: string;
  /** Angka awal (`w:start`), lazimnya 1. */
  mulai: number;
}

interface DefinisiNum {
  abstrak: string;
  /** ilvl -> angka awal yang ditimpa (`w:startOverride`) — "Restart Numbering" di Word. */
  timpa: Map<number, number>;
}

/** Seluruh definisi daftar sebuah dokumen. */
interface DefinisiDaftar {
  abstrak: Map<string, Map<number, TingkatDaftar>>;
  num: Map<string, DefinisiNum>;
}

/**
 * Membaca `word/numbering.xml` supaya bentuk DAN nomor tiap daftar otomatis
 * bisa dihitung.
 *
 * Jalannya dua langkah, mengikuti bentuk berkasnya: `<w:num>` memetakan numId
 * yang dipakai paragraf ke sebuah `<w:abstractNum>`, dan definisi bentuk
 * (decimal / upperLetter / bullet), pola label, serta angka awal ada di dalam
 * abstractNum itu, per tingkat. `<w:num>` boleh menimpa angka awalnya —
 * itulah yang terjadi tiap kali guru memilih "Restart at 1".
 */
function bacaDefinisiDaftar(xml: string): DefinisiDaftar {
  const akar = uraiXml(xml);

  const abstrak = new Map<string, Map<number, TingkatDaftar>>();
  for (const a of semuaTurunan(akar, "abstractNum")) {
    const id = a.atribut["w:abstractNumId"] ?? "";
    if (!id) continue;
    const tingkat = new Map<number, TingkatDaftar>();
    for (const lvl of semuaTurunan(a, "lvl")) {
      const ilvl = Number(lvl.atribut["w:ilvl"] ?? "0");
      if (!Number.isFinite(ilvl)) continue;
      const fmt = anakBernama(lvl, "numFmt")[0]?.atribut["w:val"] ?? "";
      const teks = anakBernama(lvl, "lvlText")[0]?.atribut["w:val"] ?? "";
      const mulai = Number(anakBernama(lvl, "start")[0]?.atribut["w:val"] ?? "1");
      tingkat.set(ilvl, { fmt, teks, mulai: Number.isFinite(mulai) ? mulai : 1 });
    }
    abstrak.set(id, tingkat);
  }

  const num = new Map<string, DefinisiNum>();
  for (const n of semuaTurunan(akar, "num")) {
    const numId = n.atribut["w:numId"] ?? "";
    const abstrakId = anakBernama(n, "abstractNumId")[0]?.atribut["w:val"] ?? "";
    if (!numId || !abstrakId) continue;
    const timpa = new Map<number, number>();
    for (const o of anakBernama(n, "lvlOverride")) {
      const ilvl = Number(o.atribut["w:ilvl"] ?? "0");
      const awal = Number(anakBernama(o, "startOverride")[0]?.atribut["w:val"] ?? "");
      if (Number.isFinite(ilvl) && Number.isFinite(awal) && awal > 0) timpa.set(ilvl, awal);
    }
    num.set(numId, { abstrak: abstrakId, timpa });
  }

  return { abstrak, num };
}

/** Satu butir daftar yang sudah dihitung: bentuk, label yang digambar Word, dan angkanya. */
interface ButirDaftar {
  fmt: string;
  label: string;
  nomor: number;
}

const BUTIR_TANPA_DAFTAR: ButirDaftar = { fmt: "", label: "", nomor: 0 };

/** 1 -> "a", 26 -> "z", 27 -> "aa" — persis kebiasaan Word. */
function hurufKe(n: number): string {
  const k = (n - 1) % 26;
  const ulang = Math.floor((n - 1) / 26) + 1;
  return String.fromCharCode(97 + Math.max(0, k)).repeat(Math.max(1, ulang));
}

function romawiKe(n: number): string {
  if (n <= 0 || n >= 4000) return String(n);
  const tabel: [number, string][] = [
    [1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"],
    [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"],
  ];
  let sisa = n;
  let hasil = "";
  for (const [nilai, huruf] of tabel) {
    while (sisa >= nilai) {
      hasil += huruf;
      sisa -= nilai;
    }
  }
  return hasil;
}

function formatNomor(n: number, fmt: string): string {
  switch (fmt) {
    case "upperLetter":
      return hurufKe(n).toUpperCase();
    case "lowerLetter":
      return hurufKe(n);
    case "upperRoman":
      return romawiKe(n).toUpperCase();
    case "lowerRoman":
      return romawiKe(n);
    case "decimalZero":
      return String(n).padStart(2, "0");
    default:
      return String(n);
  }
}

/**
 * Menghitung nomor tiap butir daftar persis seperti Word menggambarnya.
 *
 * Aturannya meniru Word seperlunya: daftar yang berbagi satu abstractNum
 * bersambung nomornya; `<w:num>` yang membawa `startOverride` memulai
 * hitungannya sendiri (itulah "Restart Numbering"); dan begitu butir tingkat
 * luar muncul, tingkat di bawahnya mulai lagi dari awal.
 */
class PenghitungDaftar {
  private readonly hitung = new Map<string, number[]>();
  private readonly timpaTerpakai = new Set<string>();
  private readonly definisi: DefinisiDaftar;

  // Bukan parameter property: pelucut tipe bawaan Node (dipakai skrip cek:*) tidak mendukungnya.
  constructor(definisi: DefinisiDaftar) {
    this.definisi = definisi;
  }

  ambil(numId: string, ilvl: number): ButirDaftar {
    const num = this.definisi.num.get(numId);
    if (!num) return BUTIR_TANPA_DAFTAR;
    const tingkat = this.definisi.abstrak.get(num.abstrak) ?? new Map<number, TingkatDaftar>();
    const mulai = (lv: number) => tingkat.get(lv)?.mulai ?? 1;

    const kunci = num.timpa.size > 0 ? `n${numId}` : `a${num.abstrak}`;
    let c = this.hitung.get(kunci);
    if (!c) {
      c = [];
      this.hitung.set(kunci, c);
    }
    for (let lv = 0; lv < ilvl; lv++) if (c[lv] === undefined) c[lv] = mulai(lv);

    const kunciTimpa = `${numId}#${ilvl}`;
    if (num.timpa.has(ilvl) && !this.timpaTerpakai.has(kunciTimpa)) {
      this.timpaTerpakai.add(kunciTimpa);
      c[ilvl] = num.timpa.get(ilvl) ?? mulai(ilvl);
    } else if (c[ilvl] === undefined) {
      c[ilvl] = mulai(ilvl);
    } else {
      c[ilvl] += 1;
    }
    c.length = ilvl + 1; // tingkat yang lebih dalam mulai lagi dari awal

    const t = tingkat.get(ilvl);
    const fmt = t?.fmt ?? "";
    const nomor = c[ilvl];
    const hitungan = c;
    let label: string;
    if (fmt === "bullet") {
      label = "•";
    } else if (t?.teks) {
      label = t.teks.replace(/%(\d)/g, (_, d: string) => {
        const lv = Number(d) - 1;
        return formatNomor(hitungan[lv] ?? mulai(lv), tingkat.get(lv)?.fmt ?? "decimal");
      });
    } else {
      label = `${formatNomor(nomor, fmt || "decimal")}.`;
    }
    return { fmt, label, nomor: fmt === "bullet" ? 0 : nomor };
  }
}

/** Penomoran yang dibawa sebuah gaya paragraf (mis. gaya bawaan "List Number"). */
interface NumPrGaya {
  numId: string;
  ilvl: number;
}

type PetaDaftarGaya = Map<string, NumPrGaya>;

function bacaNumPr(numPr: SimpulXml): NumPrGaya {
  const numId = anakBernama(numPr, "numId")[0]?.atribut["w:val"] ?? "";
  const ilvl = Number(anakBernama(numPr, "ilvl")[0]?.atribut["w:val"] ?? "0");
  return { numId, ilvl: Number.isFinite(ilvl) ? ilvl : 0 };
}

/**
 * Baca gaya paragraf di `word/styles.xml` yang membawa penomoran otomatis.
 *
 * Pilihan jawaban yang dibuat dengan gaya bawaan Word "List Number" tidak
 * punya `<w:numPr>` di paragrafnya sama sekali — penomorannya ada di gaya.
 * Tanpa membaca ini, pilihan semacam itu terbaca sebagai paragraf biasa dan
 * tertelan ke dalam pertanyaan.
 */
function bacaDaftarGaya(xml: string): PetaDaftarGaya {
  const akar = uraiXml(xml);
  const mentah = new Map<string, { numPr: NumPrGaya | null; dasar: string }>();
  for (const gaya of semuaTurunan(akar, "style")) {
    const id = gaya.atribut["w:styleId"] ?? "";
    if (!id) continue;
    const pPr = anakBernama(gaya, "pPr")[0] ?? null;
    const numPr = pPr ? (anakBernama(pPr, "numPr")[0] ?? null) : null;
    mentah.set(id, {
      numPr: numPr ? bacaNumPr(numPr) : null,
      dasar: anakBernama(gaya, "basedOn")[0]?.atribut["w:val"] ?? "",
    });
  }

  const peta: PetaDaftarGaya = new Map();
  for (const [id] of mentah) {
    let kini = id;
    for (let langkah = 0; langkah < 10 && kini; langkah++) {
      const n = mentah.get(kini);
      if (!n) break;
      if (n.numPr?.numId) {
        peta.set(id, n.numPr);
        break;
      }
      kini = n.dasar;
    }
  }
  return peta;
}

/* --------------------------------------------------------------------------
   WARNA — pengenal kunci jawaban yang ditandai guru
   -------------------------------------------------------------------------- */

/** Sifat warna sebuah run, dari mana pun asalnya. */
interface WarnaRun {
  /** Heks enam digit tanpa "#", kosong bila warna hurufnya tidak diatur. */
  warna: string;
  /** Nama stabilo Word, kosong bila tidak distabilo. */
  sorot: string;
}

const WARNA_KOSONG: WarnaRun = { warna: "", sorot: "" };

/** Nama gaya (`w:styleId`) -> warna yang dibawanya. */
type PetaGaya = Map<string, WarnaRun>;

/** Nama warna tema (`accent1`, `dark2`, …) -> heks dari `theme1.xml`. */
type PetaTema = Map<string, string>;

/** Stabilo yang berarti "tidak distabilo". */
const SOROT_KOSONG = /^(?:none|white)$/i;

/** Warna huruf yang sama saja dengan hitam biasa — bukan penanda apa pun. */
const WARNA_NETRAL = /^(?:auto|000000|010101|0d0d0d|1a1a1a|202020|262626)$/i;

/** Nama warna tema yang berarti "warna teks/latar biasa", bukan penanda. */
const TEMA_NETRAL = /^(?:text[12]|background[12]|dark[12]|light[12]|dk[12]|lt[12])$/i;

/**
 * Apakah sebuah warna terbaca sebagai MERAH oleh mata.
 *
 * Bukan sekadar `FF0000`: guru memilih dari palet Word, yang menyediakan merah
 * tua, merah bata, dan beberapa gradasi "Red, Accent". Aturannya karena itu
 * dibuat dari perbandingan kanal — merah harus jelas mendominasi hijau dan biru
 * — bukan dari daftar heks tertentu. Merah muda pucat (semua kanal tinggi)
 * sengaja tidak ikut: itu lazim dipakai menyorot catatan, bukan kunci.
 */
export function warnaMerah(heks: string): boolean {
  const v = heks.replace(/^#/, "").trim();
  if (!/^[0-9a-f]{6}$/i.test(v)) return false;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  if (r < 100) return false;
  return r - g >= 60 && r - b >= 60;
}

/** Stabilo yang dihitung merah. */
const SOROT_MERAH = /^(?:red|darkRed)$/i;

/**
 * Baca `word/theme/theme1.xml` supaya warna tema bisa dipetakan ke heks.
 *
 * Baris atas palet warna Word adalah warna TEMA: runnya cuma menulis
 * `w:themeColor="accent2"` tanpa nilai heks apa pun. Tanpa berkas ini, kunci
 * yang diwarnai dari baris atas palet tidak akan pernah terbaca merah.
 */
function bacaTema(xml: string): PetaTema {
  const peta: PetaTema = new Map();
  const akar = uraiXml(xml);
  const skema = semuaTurunan(akar, "clrScheme")[0];
  if (!skema) return peta;
  // Nama di theme1.xml (dk1/lt1/dk2/lt2) berbeda dari nama di document.xml
  // (dark1/light1/…), jadi keduanya didaftarkan.
  const alias: Record<string, string[]> = {
    dk1: ["dark1", "text1"],
    lt1: ["light1", "background1"],
    dk2: ["dark2", "text2"],
    lt2: ["light2", "background2"],
  };
  for (const anak of skema.anak) {
    const nama = lepasAwalan(anak.nama);
    const srgb = anakBernama(anak, "srgbClr")[0]?.atribut["val"] ?? "";
    const sys = anakBernama(anak, "sysClr")[0]?.atribut["lastClr"] ?? "";
    const heks = (srgb || sys).trim();
    if (!heks) continue;
    peta.set(nama, heks);
    for (const lain of alias[nama] ?? []) peta.set(lain, heks);
  }
  return peta;
}

/**
 * Baca `word/styles.xml`: gaya karakter dan gaya paragraf yang membawa warna.
 *
 * Sebagian guru tidak mewarnai teksnya langsung, melainkan memakai gaya bawaan
 * Word ("Intense Emphasis", atau gaya buatan sendiri bernama "Kunci"). Warnanya
 * ada di berkas ini, bukan di run — tanpa membacanya, kunci semacam itu tak
 * terlihat sama sekali oleh pembaca naskah.
 */
function bacaGaya(xml: string, tema: PetaTema): PetaGaya {
  const akar = uraiXml(xml);
  const mentah = new Map<string, { warna: WarnaRun; dasar: string }>();
  for (const gaya of semuaTurunan(akar, "style")) {
    const id = gaya.atribut["w:styleId"] ?? "";
    if (!id) continue;
    const rPr = anakBernama(gaya, "rPr")[0] ?? null;
    mentah.set(id, {
      warna: rPr ? warnaLangsung(rPr, tema) : WARNA_KOSONG,
      dasar: anakBernama(gaya, "basedOn")[0]?.atribut["w:val"] ?? "",
    });
  }

  // Gaya boleh mewarisi dari gaya lain; telusuri ke atas sampai ketemu warna.
  const peta: PetaGaya = new Map();
  for (const [id] of mentah) {
    let kini = id;
    let warna = WARNA_KOSONG;
    for (let langkah = 0; langkah < 10 && kini; langkah++) {
      const n = mentah.get(kini);
      if (!n) break;
      if (n.warna.warna || n.warna.sorot) {
        warna = n.warna;
        break;
      }
      kini = n.dasar;
    }
    peta.set(id, warna);
  }
  return peta;
}

/** Warna yang ditulis langsung pada sebuah `<w:rPr>`, tanpa menoleh ke gaya. */
function warnaLangsung(rPr: SimpulXml, tema: PetaTema): WarnaRun {
  const simpulWarna = anakBernama(rPr, "color")[0];
  let warna = simpulWarna?.atribut["w:val"] ?? "";
  if (WARNA_NETRAL.test(warna)) warna = "";
  if (!warna && simpulWarna) {
    // Warna tema: `w:val` boleh kosong atau "auto", nilainya di theme1.xml.
    const namaTema = simpulWarna.atribut["w:themeColor"] ?? "";
    if (namaTema && !TEMA_NETRAL.test(namaTema)) {
      // Bila theme1.xml tidak ada, nama temanya sendiri yang disimpan: guru
      // memang sengaja memilih warna, dan itu sudah cukup untuk menghitungnya
      // sebagai tanda — hanya "merah"-nya yang tidak bisa dipastikan.
      warna = tema.get(namaTema) || namaTema;
    }
    if (WARNA_NETRAL.test(warna)) warna = "";
  }

  let sorot = anakBernama(rPr, "highlight")[0]?.atribut["w:val"] ?? "";
  if (SOROT_KOSONG.test(sorot)) sorot = "";

  // Arsiran run (`w:shd`) — sebagian guru memakainya, bukan stabilo.
  if (!sorot) {
    const isi = anakBernama(rPr, "shd")[0]?.atribut["w:fill"] ?? "";
    if (isi && !/^(?:auto|ffffff|000000)$/i.test(isi)) sorot = isi;
  }

  return { warna, sorot };
}

/**
 * Warna sebuah run dengan seluruh sumbernya digabung: gaya karakter dulu, lalu
 * penulisan langsung yang selalu menang.
 */
function warnaRun(rPr: SimpulXml | null, gaya: PetaGaya, tema: PetaTema): WarnaRun {
  if (!rPr) return WARNA_KOSONG;
  const dariGaya = gaya.get(anakBernama(rPr, "rStyle")[0]?.atribut["w:val"] ?? "") ?? WARNA_KOSONG;
  const langsung = warnaLangsung(rPr, tema);
  return {
    warna: langsung.warna || dariGaya.warna,
    sorot: langsung.sorot || dariGaya.sorot,
  };
}

/** Sumber gaya dan tema yang dipakai satu dokumen. */
interface KonteksGaya {
  gaya: PetaGaya;
  tema: PetaTema;
  /** Gaya paragraf yang membawa penomoran otomatis (mis. "List Number"). */
  daftarGaya: PetaDaftarGaya;
  /** Penghitung nomor daftar; null bila dokumen tidak punya `numbering.xml`. */
  daftar: PenghitungDaftar | null;
}

const KONTEKS_GAYA_KOSONG: KonteksGaya = {
  gaya: new Map(),
  tema: new Map(),
  daftarGaya: new Map(),
  daftar: null,
};

function bacaParagraf(
  p: SimpulXml,
  relasi: Map<string, string>,
  konteks: KonteksGaya = KONTEKS_GAYA_KOSONG,
): ParagrafDocx {
  let teks = "";
  let html = "";
  const gambar: string[] = [];
  let adaRumus = false;
  let ditandai = false;
  const teksBertanda: TandaDocx[] = [];
  let barisKe = 0;

  const bertanda = (rPr: SimpulXml | null): WarnaRun | null => {
    const w = warnaRun(rPr, konteks.gaya, konteks.tema);
    return w.warna || w.sorot ? w : null;
  };

  /**
   * Jalankan penelusuran sebuah cabang, lalu AMBIL KEMBALI html yang baru
   * ditambahkannya. Dipakai bangunan rumus, yang perlu membungkus hasil
   * cabangnya (mis. isi `m:sup` menjadi `<sup>…</sup>`). `teks` sengaja tidak
   * ikut ditarik kembali: bentuk teks polosnya tetap seperti sebelum rumus
   * dikenali, supaya aturan pembacaan naskah lain tidak ikut bergeser.
   */
  const rekamHtml = (jalankan: () => void): string => {
    const mulai = html.length;
    jalankan();
    const potong = html.slice(mulai);
    html = html.slice(0, mulai);
    return potong;
  };

  const jelajah = (simpul: SimpulXml, dalamRumus: boolean) => {
    for (const a of simpul.anak) {
      const nama = lepasAwalan(a.nama);

      if (nama === "oMath" || nama === "oMathPara") {
        adaRumus = true;
        jelajah(a, true);
        continue;
      }

      // ----- Bangunan rumus Word (OMML) -----
      // Rumus yang diketik lewat Insert > Equation TIDAK memakai
      // `w:vertAlign`; pangkat, pecahan, dan akarnya adalah SIMPUL TERSENDIRI
      // (`m:sSup`, `m:f`, `m:rad`, `m:d`). Ditelusuri polos, isinya berderet
      // rapat tanpa penanda apa pun: "(15^12 x 4^5)/(5^12 x akar(81^6))"
      // sampai ke peserta sebagai "1512 × 45512 × 816" — soal PK nomor 9
      // naskah 4 September 2026 jadi tidak bisa dikerjakan sama sekali.
      // Karena itu tiap bangunan dirakit ulang di sini.
      //
      // Hanya `html` yang diperkaya; `teks` sengaja dibiarkan sama seperti
      // dulu supaya penomoran soal, pengenalan kunci, dan sidik soal kembar
      // tidak ikut berubah artinya.
      if (nama === "sSup" || nama === "sSub" || nama === "sSubSup") {
        const bagian = (n: string): string => {
          const anak = anakBernama(a, n)[0];
          return anak ? rekamHtml(() => jelajah(anak, true)) : "";
        };
        const dasar = bagian("e");
        const bawah = nama === "sSup" ? "" : bagian("sub");
        const atas = nama === "sSub" ? "" : bagian("sup");
        html +=
          dasar +
          (bawah ? `<sub>${bawah}</sub>` : "") +
          (atas ? `<sup>${atas}</sup>` : "");
        continue;
      }
      if (nama === "f") {
        const num = anakBernama(a, "num")[0];
        const den = anakBernama(a, "den")[0];
        const atas = num ? rekamHtml(() => jelajah(num, true)) : "";
        const bawah = den ? rekamHtml(() => jelajah(den, true)) : "";
        // Pecahan ditulis mendatar dengan garis miring: bertumpuk dua baris
        // akan merusak tinggi baris kartu soal, sedangkan tanda kurung sudah
        // cukup membuat batas pembilang dan penyebutnya tegas.
        html += `${kurungBila(atas)}/${kurungBila(bawah)}`;
        continue;
      }
      if (nama === "rad") {
        const deg = anakBernama(a, "deg")[0];
        const isiRad = anakBernama(a, "e")[0];
        const pangkat = deg ? rekamHtml(() => jelajah(deg, true)) : "";
        const dalam = isiRad ? rekamHtml(() => jelajah(isiRad, true)) : "";
        const polos = dalam.replace(/<[^>]+>/g, "");
        html +=
          (pangkat ? `<sup>${pangkat}</sup>` : "") +
          "√" +
          (polos.length > 1 ? `(${dalam})` : dalam);
        continue;
      }
      if (nama === "d") {
        // Tanda kurung rumus disimpan sebagai ATRIBUT, bukan sebagai teks,
        // jadi tanpa ini seluruh kurungnya lenyap: "(3 × 5)^12" menjadi
        // "3 × 5^12" — pangkatnya seolah hanya mengenai angka 5.
        const dPr = anakBernama(a, "dPr")[0] ?? null;
        const chr = (n: string, bawaan: string): string => {
          const s = dPr ? anakBernama(dPr, n)[0] : null;
          return s ? (s.atribut["m:val"] ?? s.atribut["val"] ?? bawaan) : bawaan;
        };
        const buka = chr("begChr", "(");
        const tutup = chr("endChr", ")");
        const pemisah = chr("sepChr", ",");
        const isiKurung = anakBernama(a, "e")
          .map((e) => rekamHtml(() => jelajah(e, true)))
          .join(escapeHtml(pemisah));
        html += escapeHtml(buka) + isiKurung + escapeHtml(tutup);
        continue;
      }
      if (
        nama === "sSupPr" ||
        nama === "sSubPr" ||
        nama === "sSubSupPr" ||
        nama === "fPr" ||
        nama === "radPr" ||
        nama === "dPr" ||
        nama === "ctrlPr"
      ) {
        // Hanya menyimpan pengaturan tampilan; tidak ada teks soal di dalamnya.
        continue;
      }
      if (nama === "r") {
        const rPr = anakBernama(a, "rPr")[0] ?? null;
        for (const isi of a.anak) {
          const n = lepasAwalan(isi.nama);
          if (n === "t") {
            const nilai = isi.anak.map((x) => x.atribut.nilai ?? "").join("");
            teks += nilai;
            html += bungkusRun(rPr, nilai);
            const tanda = nilai.trim() ? bertanda(rPr) : null;
            if (tanda) {
              ditandai = true;
              teksBertanda.push({
                baris: barisKe,
                teks: nilai.trim(),
                warna: tanda.warna,
                sorot: tanda.sorot,
                merah: warnaMerah(tanda.warna) || SOROT_MERAH.test(tanda.sorot) || warnaMerah(tanda.sorot),
              });
            }
          } else if (n === "tab") {
            teks += "\t";
            html += " ";
          } else if (n === "br" || n === "cr") {
            teks += "\n";
            html += "\n";
            barisKe++;
          } else if (n === "drawing" || n === "pict" || n === "object") {
            for (const blip of semuaTurunan(isi, "blip")) {
              const rId = blip.atribut["r:embed"] ?? blip.atribut["r:link"] ?? "";
              const berkas = relasi.get(rId);
              if (berkas) gambar.push(berkas);
            }
            for (const imagedata of semuaTurunan(isi, "imagedata")) {
              const rId = imagedata.atribut["r:id"] ?? "";
              const berkas = relasi.get(rId);
              if (berkas) gambar.push(berkas);
            }
          } else if (n === "rPr") {
            /* sudah dibaca di atas */
          } else {
            jelajah(isi, dalamRumus);
          }
        }
        continue;
      }
      if (nama === "t") {
        // `<m:t>` di dalam rumus: teksnya tetap diambil apa adanya.
        const nilai = a.anak.map((x) => x.atribut.nilai ?? "").join("");
        teks += nilai;
        html += escapeHtml(nilai);
        continue;
      }
      if (nama === "pPr" || nama === "proofErr" || nama === "bookmarkStart" || nama === "bookmarkEnd") {
        continue;
      }
      jelajah(a, dalamRumus);
    }
  };

  jelajah(p, false);

  const pPr = anakBernama(p, "pPr")[0] ?? null;
  const gaya = pPr ? (anakBernama(pPr, "pStyle")[0]?.atribut["w:val"] ?? "") : "";
  // Penomoran boleh ditulis di paragrafnya sendiri ATAU dibawa gaya
  // paragrafnya; yang di paragraf selalu menang. numId "0" berarti penomoran
  // gaya sengaja dimatikan untuk paragraf ini.
  const numPr = pPr ? (anakBernama(pPr, "numPr")[0] ?? null) : null;
  const langsung = numPr ? bacaNumPr(numPr) : null;
  const dariGaya = konteks.daftarGaya.get(gaya) ?? null;
  const numId = langsung?.numId || dariGaya?.numId || "";
  const tingkat =
    numPr && anakBernama(numPr, "ilvl").length > 0
      ? (langsung?.ilvl ?? 0)
      : (dariGaya?.ilvl ?? langsung?.ilvl ?? 0);
  const berdaftar = numId !== "" && numId !== "0";
  const butir =
    berdaftar && konteks.daftar ? konteks.daftar.ambil(numId, tingkat) : BUTIR_TANPA_DAFTAR;

  return {
    jenis: "paragraf",
    teks: teks.replace(/[ \t ]+/g, " ").trim(),
    html: html.replace(/[ \t ]+/g, " ").trim(),
    gaya,
    berdaftar,
    tingkatDaftar: tingkat,
    formatDaftar: butir.fmt,
    labelDaftar: butir.label,
    nomorDaftar: butir.nomor,
    idDaftar: berdaftar ? numId : "",
    gambar,
    adaRumus,
    ditandai,
    teksBertanda,
  };
}

function bacaTabel(
  tbl: SimpulXml,
  relasi: Map<string, string>,
  konteks: KonteksGaya = KONTEKS_GAYA_KOSONG,
): TabelDocx {
  const baris: string[][] = [];
  const barisHtml: string[][] = [];
  const barisBertanda: TandaDocx[][][] = [];
  const barisRentang: number[][] = [];
  for (const tr of anakBernama(tbl, "tr")) {
    const sel: string[] = [];
    const selHtml: string[] = [];
    const selTanda: TandaDocx[][] = [];
    const selRentang: number[] = [];
    for (const tc of anakBernama(tr, "tc")) {
      const paragraf = anakBernama(tc, "p").map((p) =>
        bacaParagraf(p, relasi, konteks),
      );
      sel.push(paragraf.map((p) => p.teks).join("\n").trim());
      selHtml.push(
        paragraf
          .map((p) => p.html)
          .filter(Boolean)
          .map((h) => `<p>${h}</p>`)
          .join(""),
      );
      selTanda.push(paragraf.flatMap((p) => p.teksBertanda));
      // Sel gabungan Word. Tanpa ini, baris yang selnya digabung berubah
      // menjadi baris berkolom sedikit yang melar rata: kisi teka-teki PK
      // nomor 1 naskah 4 September 2026 kehilangan lajurnya, sehingga angka
      // di bawah tidak lagi sejajar dengan angka di atasnya dan persamaan
      // menurunnya tidak bisa dibaca sama sekali.
      const tcPr = anakBernama(tc, "tcPr")[0] ?? null;
      const span = tcPr ? anakBernama(tcPr, "gridSpan")[0] : null;
      const lebarSel = span
        ? Number(span.atribut["w:val"] ?? span.atribut["val"] ?? "1")
        : 1;
      selRentang.push(Number.isFinite(lebarSel) && lebarSel > 1 ? Math.floor(lebarSel) : 1);
    }
    if (sel.length) {
      baris.push(sel);
      barisHtml.push(selHtml);
      barisBertanda.push(selTanda);
      barisRentang.push(selRentang);
    }
  }
  return { jenis: "tabel", baris, barisHtml, barisBertanda, barisRentang };
}

/* ==========================================================================
   PINTU MASUK
   ========================================================================== */

/** Berkas gambar yang boleh diterima dari dalam naskah. */
const JENIS_GAMBAR: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

export function jenisGambar(namaBerkas: string): string | null {
  const ext = namaBerkas.toLowerCase().split(".").pop() ?? "";
  return JENIS_GAMBAR[ext] ?? null;
}

/**
 * Buka .docx dan ubah menjadi daftar blok.
 *
 * Melempar galat bila berkasnya bukan .docx yang sah — pemanggil yang
 * memutuskan pesan apa yang ditampilkan ke admin.
 */
export async function bacaDocx(data: ArrayBuffer): Promise<IsiDocx> {
  const zip = await JSZip.loadAsync(data);

  const dokumen = zip.file("word/document.xml");
  if (!dokumen) {
    throw new Error(
      "Berkas ini bukan dokumen Word (.docx) yang sah. Kalau naskahmu masih .doc lama, buka di Word lalu simpan ulang sebagai .docx.",
    );
  }

  // rId -> nama berkas gambar
  const relasi = new Map<string, string>();
  const rels = zip.file("word/_rels/document.xml.rels");
  if (rels) {
    const akar = uraiXml(await rels.async("string"));
    for (const r of semuaTurunan(akar, "Relationship")) {
      const target = r.atribut.Target ?? "";
      const id = r.atribut.Id ?? "";
      if (!id || !target || /^https?:/i.test(target)) continue;
      const bersih = target.replace(/^\.\//, "").replace(/^\/+/, "");
      relasi.set(id, bersih.startsWith("word/") ? bersih : `word/${bersih}`);
    }
  }

  const berkasNomor = zip.file("word/numbering.xml");
  const daftar = berkasNomor
    ? new PenghitungDaftar(bacaDefinisiDaftar(await berkasNomor.async("string")))
    : null;

  // Tema dulu, baru gaya: gaya boleh menyebut warna tema, bukan sebaliknya.
  const berkasTema = zip.file("word/theme/theme1.xml");
  const tema = berkasTema ? bacaTema(await berkasTema.async("string")) : new Map<string, string>();
  const berkasGaya = zip.file("word/styles.xml");
  const xmlGaya = berkasGaya ? await berkasGaya.async("string") : "";
  const gaya = xmlGaya ? bacaGaya(xmlGaya, tema) : new Map<string, WarnaRun>();
  const daftarGaya = xmlGaya ? bacaDaftarGaya(xmlGaya) : new Map<string, NumPrGaya>();
  const konteks: KonteksGaya = { gaya, tema, daftarGaya, daftar };

  const akar = uraiXml(await dokumen.async("string"));
  const body = turunanPertama(akar, "body");
  const blok: BlokDocx[] = [];

  if (body) {
    for (const anak of body.anak) {
      const nama = lepasAwalan(anak.nama);
      if (nama === "p") {
        const p = bacaParagraf(anak, relasi, konteks);
        // Paragraf betul-betul kosong tidak membawa informasi apa pun — kecuali
        // butir daftar: "A." yang dibiarkan kosong lalu diisi butir bersarang
        // di bawahnya ("(1) dan (2)") adalah cara guru menulis pilihan.
        if (p.teks || p.gambar.length || p.berdaftar) blok.push(p);
      } else if (nama === "tbl") {
        const t = bacaTabel(anak, relasi, konteks);
        if (t.baris.length) blok.push(t);
      }
    }
  }

  // Hanya gambar yang benar-benar dirujuk yang perlu dimuat isinya.
  const dipakai = new Set<string>();
  for (const b of blok) {
    if (b.jenis === "paragraf") for (const g of b.gambar) dipakai.add(g);
  }
  const media = new Map<string, Uint8Array>();
  for (const nama of dipakai) {
    const berkas = zip.file(nama);
    if (!berkas) continue;
    media.set(nama, await berkas.async("uint8array"));
  }

  return { blok, media };
}
