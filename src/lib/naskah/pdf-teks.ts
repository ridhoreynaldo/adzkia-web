/**
 * Pembaca teks berkas PDF.
 *
 * Ditulis sendiri, seperti pembaca .docx di `docx.ts`, dan karena alasan yang
 * sama: satu-satunya yang dibutuhkan aplikasi ini dari sebuah PDF adalah
 * TEKSNYA, baris demi baris. Pustaka PDF yang lengkap membawa perender, huruf
 * bawaan, dan pekerja WebAssembly — belasan megabita untuk pekerjaan yang muat
 * dalam satu berkas.
 *
 * Yang dikerjakan:
 *
 *   1. Seluruh objek tak langsung ("12 0 obj … endobj") didaftar, termasuk yang
 *      bersembunyi di dalam OBJECT STREAM — PDF 1.5 ke atas, yang dihasilkan
 *      Word maupun LibreOffice, memampatkan sebagian besar kamusnya ke sana.
 *   2. Aliran ber-`/FlateDecode` dikembangkan dengan zlib bawaan Node.
 *   3. Tiap halaman dibaca operator demi operator, dengan matriks teks dan
 *      matriks baris yang dijalankan sebagaimana mestinya.
 *   4. Kode byte diterjemahkan lewat peta `/ToUnicode` milik hurufnya bila ada
 *      — tanpa ini, PDF dari Word (yang memakai Identity-H) hanya menghasilkan
 *      sampah, sebab yang tersimpan di sana nomor gambar huruf, bukan huruf.
 *   5. LEBAR tiap huruf dibaca dari `/Widths` atau `/W`, sehingga aplikasi tahu
 *      persis di mana satu potongan teks berakhir. Itulah yang memungkinkan
 *      SPASI disimpulkan dengan benar — lihat `aliranKeTeks`.
 *
 * Yang TIDAK dikerjakan, dan memang tidak perlu di sini: gambar, tabel sebagai
 * tabel, urutan kolom pada tata letak dua kolom, dan PDF hasil pindaian (yang
 * isinya gambar — tidak ada teks yang bisa diambil siapa pun tanpa OCR).
 */
import zlib from "node:zlib";

/* ==========================================================================
   BYTE <-> TEKS
   --------------------------------------------------------------------------
   Seluruh penelusuran dilakukan atas "latin1": satu byte tepat satu karakter,
   sehingga posisi karakter sama dengan posisi byte. Memakai utf8 di sini akan
   menggeser semua indeks begitu ada byte di atas 0x7F — dan aliran terkompresi
   penuh dengan byte semacam itu.
   ========================================================================== */

function keLatin1(data: Uint8Array): string {
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("latin1");
}

/** Sebagian kecil WinAnsi yang berbeda dari Latin-1 (0x80-0x9F). */
const WINANSI_ATAS: Record<number, string> = {
  0x80: "€", 0x82: "‚", 0x83: "ƒ", 0x84: "„", 0x85: "…",
  0x86: "†", 0x87: "‡", 0x88: "ˆ", 0x89: "‰", 0x8a: "Š",
  0x8b: "‹", 0x8c: "Œ", 0x8e: "Ž", 0x91: "‘", 0x92: "’",
  0x93: "“", 0x94: "”", 0x95: "•", 0x96: "–", 0x97: "—",
  0x98: "˜", 0x99: "™", 0x9a: "š", 0x9b: "›", 0x9c: "œ",
  0x9e: "ž", 0x9f: "Ÿ",
};

function dariWinAnsi(kode: number): string {
  return WINANSI_ATAS[kode] ?? String.fromCharCode(kode);
}

/* ==========================================================================
   OBJEK
   ========================================================================== */

interface ObjekPdf {
  nomor: number;
  /** Bagian kamus/nilai objek sebagai teks. */
  isi: string;
  /** Isi aliran yang sudah dikembangkan, bila objek ini punya aliran. */
  aliran: Uint8Array | null;
}

/**
 * Mengembangkan satu aliran.
 *
 * Aliran yang penyaringnya bukan FlateDecode dipulangkan apa adanya: kalau
 * isinya memang teks (jarang, tetapi ada), ia tetap terbaca; kalau bukan,
 * tahap berikutnya toh tidak akan menemukan operator teks di sana.
 */
function kembangkan(mentah: Buffer, kamus: string): Uint8Array {
  if (!/\/Filter\s*(?:\[[^\]]*)?\/FlateDecode/.test(kamus)) return new Uint8Array(mentah);
  try {
    return new Uint8Array(zlib.inflateSync(mentah));
  } catch {
    // Sebagian penulis PDF meninggalkan satu byte sampah di depan aliran, dan
    // sebagian lagi menulis deflate mentah tanpa sampul zlib. Dua-duanya masih
    // bisa diselamatkan; kalau tetap gagal, aliran ini memang bukan flate.
    try {
      return new Uint8Array(zlib.inflateRawSync(mentah));
    } catch {
      try {
        return new Uint8Array(zlib.inflateSync(mentah.subarray(1)));
      } catch {
        return new Uint8Array(0);
      }
    }
  }
}

/** Mendaftar seluruh objek "N G obj … endobj" beserta aliran yang sudah dibuka. */
function daftarObjek(data: Uint8Array): Map<number, ObjekPdf> {
  const teks = keLatin1(data);
  const peta = new Map<number, ObjekPdf>();
  const pola = /(\d+)\s+\d+\s+obj\b/g;

  let cocok: RegExpExecArray | null;
  while ((cocok = pola.exec(teks)) !== null) {
    const nomor = Number(cocok[1]);
    const awal = pola.lastIndex;
    const akhir = teks.indexOf("endobj", awal);
    const badan = teks.slice(awal, akhir === -1 ? teks.length : akhir);

    const tandaAliran = badan.indexOf("stream");
    if (tandaAliran !== -1) {
      const kamus = badan.slice(0, tandaAliran);
      // Sesudah kata "stream" wajib ada CRLF atau LF; spasi di antaranya ikut
      // dilompati karena beberapa penulis PDF menyelipkannya.
      let mulai = awal + tandaAliran + "stream".length;
      while (teks[mulai] === " " || teks[mulai] === "\r") mulai++;
      if (teks[mulai] === "\n") mulai++;

      // Panjang dari /Length bila angkanya langsung tertulis; kalau ia rujukan
      // ke objek lain (juga sah menurut spesifikasi), dicari "endstream".
      const panjang = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(kamus);
      let selesai: number;
      if (panjang) {
        selesai = mulai + Number(panjang[1]);
      } else {
        const e = teks.indexOf("endstream", mulai);
        selesai = e === -1 ? teks.length : e;
      }
      const potong = Buffer.from(
        data.buffer,
        data.byteOffset + mulai,
        Math.max(0, Math.min(selesai, data.length) - mulai),
      );
      peta.set(nomor, { nomor, isi: kamus, aliran: kembangkan(potong, kamus) });
      continue;
    }

    peta.set(nomor, { nomor, isi: badan, aliran: null });
  }

  bukaObjectStream(peta);
  return peta;
}

/**
 * Membongkar object stream.
 *
 * `/Type /ObjStm` adalah satu aliran berisi banyak objek sekaligus: bagian
 * depannya sederet pasangan "nomor offset", sisanya isi objeknya berderet.
 * Sejak PDF 1.5 hampir semua kamus halaman dan huruf tinggal di sana, jadi
 * tanpa langkah ini daftar objeknya nyaris kosong pada PDF keluaran Word.
 */
function bukaObjectStream(peta: Map<number, ObjekPdf>): void {
  for (const o of [...peta.values()]) {
    if (!o.aliran || !/\/Type\s*\/ObjStm/.test(o.isi)) continue;
    const n = Number(/\/N\s+(\d+)/.exec(o.isi)?.[1] ?? 0);
    const awal = Number(/\/First\s+(\d+)/.exec(o.isi)?.[1] ?? 0);
    if (!n || !awal) continue;

    const teks = keLatin1(o.aliran);
    const kepala = teks.slice(0, awal).trim().split(/\s+/).map(Number);
    for (let i = 0; i < n; i++) {
      const nomor = kepala[i * 2];
      const geser = kepala[i * 2 + 1];
      if (!Number.isFinite(nomor) || !Number.isFinite(geser)) continue;
      const berikut = i + 1 < n ? kepala[(i + 1) * 2 + 1] : teks.length - awal;
      const isi = teks.slice(
        awal + geser,
        awal + (Number.isFinite(berikut) ? berikut : teks.length),
      );
      // Objek di luar object stream lebih baru; yang di sini tidak menimpanya.
      if (!peta.has(nomor)) peta.set(nomor, { nomor, isi, aliran: null });
    }
  }
}

/** Nomor objek dari rujukan "12 0 R". */
function rujukan(teks: string | undefined): number | null {
  const m = /^\s*(\d+)\s+\d+\s+R/.exec(teks ?? "");
  return m ? Number(m[1]) : null;
}

/** Nilai satu kunci kamus, termasuk bila isinya kamus atau larik bersarang. */
function ambilNilai(kamus: string, kunci: string): string | undefined {
  const pola = new RegExp(`/${kunci}(?![A-Za-z0-9])`);
  const cocok = pola.exec(kamus);
  if (!cocok) return undefined;
  let j = cocok.index + kunci.length + 1;
  while (j < kamus.length && /\s/.test(kamus[j])) j++;

  if (kamus.startsWith("<<", j)) {
    let dalam = 0;
    for (let k = j; k < kamus.length - 1; k++) {
      if (kamus.startsWith("<<", k)) dalam++;
      else if (kamus.startsWith(">>", k)) {
        dalam--;
        if (dalam === 0) return kamus.slice(j, k + 2);
      }
    }
    return kamus.slice(j);
  }
  if (kamus[j] === "[") {
    let dalam = 0;
    for (let k = j; k < kamus.length; k++) {
      if (kamus[k] === "[") dalam++;
      else if (kamus[k] === "]") {
        dalam--;
        if (dalam === 0) return kamus.slice(j, k + 1);
      }
    }
    return kamus.slice(j);
  }
  const sisa = kamus.slice(j);
  const akhir = sisa.search(/[/\]>\n\r]/);
  return (akhir === -1 ? sisa : sisa.slice(0, akhir)).trim();
}

/** Nilai kamus yang boleh berupa rujukan ke objek lain. */
function nilaiTerurai(
  objek: Map<number, ObjekPdf>,
  kamus: string,
  kunci: string,
): string | undefined {
  const nilai = ambilNilai(kamus, kunci);
  if (nilai === undefined) return undefined;
  const rujuk = rujukan(nilai);
  if (rujuk !== null && !/^[[<]/.test(nilai.trim())) return objek.get(rujuk)?.isi;
  return nilai;
}

/* ==========================================================================
   HURUF: /ToUnicode dan lebar glif
   ========================================================================== */

interface PetaHuruf {
  /** Banyak byte satu kode: 1 untuk huruf sederhana, 2 untuk Identity-H. */
  byte: number;
  /** kode -> huruf, dari /ToUnicode. Kosong bila hurufnya sudah WinAnsi. */
  unicode: Map<number, string>;
  /** kode -> lebar dalam seperseribu em, dari /Widths atau /W. */
  lebar: Map<number, number>;
  /** Lebar untuk kode yang tidak tercantum. */
  lebarBawaan: number;
}

const HURUF_BAWAAN: PetaHuruf = {
  byte: 1,
  unicode: new Map(),
  lebar: new Map(),
  lebarBawaan: 500,
};

function heksKeTeks(heks: string): string {
  const bersih = heks.replace(/[^0-9A-Fa-f]/g, "");
  let hasil = "";
  for (let i = 0; i + 4 <= bersih.length; i += 4) {
    hasil += String.fromCharCode(parseInt(bersih.slice(i, i + 4), 16));
  }
  return hasil;
}

/** Membaca CMap `/ToUnicode` menjadi peta kode -> huruf. */
function bacaToUnicode(isi: string): { byte: number; unicode: Map<number, string> } {
  const unicode = new Map<number, string>();

  // Lebar kode diambil dari codespacerange: <0000><FFFF> berarti dua byte.
  let byte = 1;
  const ruang = /begincodespacerange([\s\S]*?)endcodespacerange/.exec(isi);
  if (ruang) {
    const contoh = /<([0-9A-Fa-f]+)>/.exec(ruang[1]);
    if (contoh) byte = Math.max(1, Math.ceil(contoh[1].length / 2));
  }

  for (const blok of isi.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const b of blok[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      if (b[1].length > 2) byte = Math.max(byte, Math.ceil(b[1].length / 2));
      unicode.set(parseInt(b[1], 16), heksKeTeks(b[2]));
    }
  }

  for (const blok of isi.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    const badan = blok[1];
    // Bentuk pertama: <awal> <akhir> <tujuan> — tujuannya menaik satu-satu.
    for (const b of badan.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const awal = parseInt(b[1], 16);
      const akhir = parseInt(b[2], 16);
      if (b[1].length > 2) byte = Math.max(byte, Math.ceil(b[1].length / 2));
      const dasar = heksKeTeks(b[3]);
      if (!dasar || akhir - awal > 65535) continue;
      for (let k = awal; k <= akhir; k++) {
        // Yang bergeser hanya huruf TERAKHIR, sesuai spesifikasi.
        unicode.set(
          k,
          dasar.slice(0, -1) + String.fromCharCode(dasar.charCodeAt(dasar.length - 1) + (k - awal)),
        );
      }
    }
    // Bentuk kedua: <awal> <akhir> [ <t1> <t2> … ] — tiap kode punya tujuannya.
    for (const b of badan.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([\s\S]*?)\]/g)) {
      let k = parseInt(b[1], 16);
      for (const t of b[3].matchAll(/<([0-9A-Fa-f]*)>/g)) {
        unicode.set(k, heksKeTeks(t[1]));
        k++;
      }
    }
  }

  return { byte, unicode };
}

/**
 * Lebar tiap glif untuk huruf sederhana: `/FirstChar` + larik `/Widths`.
 */
function lebarSederhana(
  objek: Map<number, ObjekPdf>,
  kamus: string,
): { lebar: Map<number, number>; lebarBawaan: number } {
  const lebar = new Map<number, number>();
  const pertama = Number(ambilNilai(kamus, "FirstChar") ?? NaN);
  const daftar = nilaiTerurai(objek, kamus, "Widths");
  if (Number.isFinite(pertama) && daftar) {
    const angka = [...daftar.matchAll(/-?[\d.]+/g)].map((m) => Number(m[0]));
    angka.forEach((w, i) => lebar.set(pertama + i, w));
  }
  const deskriptor = nilaiTerurai(objek, kamus, "FontDescriptor") ?? "";
  const hilang = Number(ambilNilai(deskriptor, "MissingWidth") ?? NaN);
  return { lebar, lebarBawaan: Number.isFinite(hilang) && hilang > 0 ? hilang : 500 };
}

/**
 * Lebar tiap glif untuk huruf gabungan (Type0): larik `/W` di keturunannya.
 *
 * Bentuk `/W` ada dua dan keduanya boleh berselang-seling di satu larik:
 * "kode [w1 w2 …]" memberi lebar berturut-turut mulai dari satu kode, dan
 * "awal akhir w" memberi satu lebar untuk seluruh rentang.
 */
function lebarGabungan(
  objek: Map<number, ObjekPdf>,
  kamus: string,
): { lebar: Map<number, number>; lebarBawaan: number } {
  const lebar = new Map<number, number>();
  const anakRujuk = ambilNilai(kamus, "DescendantFonts") ?? "";
  const nomor = rujukan(anakRujuk.replace(/^\[|\]$/g, "").trim());
  const anak = nomor === null ? undefined : objek.get(nomor)?.isi;
  if (!anak) return { lebar, lebarBawaan: 1000 };

  const dw = Number(ambilNilai(anak, "DW") ?? NaN);
  const daftar = nilaiTerurai(objek, anak, "W");
  if (daftar) {
    const token = [...daftar.matchAll(/\[|\]|-?[\d.]+/g)].map((m) => m[0]);
    let i = 0;
    // Larik terluar ikut terbaca sebagai "["; ia dilewati di sini.
    if (token[0] === "[") i = 1;
    while (i < token.length) {
      if (token[i] === "]") break;
      const kode = Number(token[i++]);
      if (!Number.isFinite(kode)) break;
      if (token[i] === "[") {
        i++;
        let k = kode;
        while (i < token.length && token[i] !== "]") lebar.set(k++, Number(token[i++]));
        i++; // lewati "]"
      } else {
        const akhir = Number(token[i++]);
        const w = Number(token[i++]);
        if (!Number.isFinite(akhir) || !Number.isFinite(w) || akhir - kode > 65535) break;
        for (let k = kode; k <= akhir; k++) lebar.set(k, w);
      }
    }
  }
  return { lebar, lebarBawaan: Number.isFinite(dw) && dw > 0 ? dw : 1000 };
}

/**
 * Peta nama huruf ("F3") -> keterangannya, untuk satu halaman.
 *
 * `/Resources` boleh diwariskan dari `/Pages` induk, jadi kalau halamannya
 * tidak punya sendiri, induknya ditelusuri — tanpa ini, halaman kedua dan
 * seterusnya pada sebagian PDF kehilangan seluruh hurufnya.
 */
function hurufHalaman(objek: Map<number, ObjekPdf>, halaman: ObjekPdf): Map<string, PetaHuruf> {
  const hasil = new Map<string, PetaHuruf>();

  let sumber: ObjekPdf | undefined = halaman;
  let res: string | undefined;
  for (let lapis = 0; lapis < 8 && sumber; lapis++) {
    res = nilaiTerurai(objek, sumber.isi, "Resources");
    if (res) break;
    const induk = rujukan(ambilNilai(sumber.isi, "Parent"));
    sumber = induk === null ? undefined : objek.get(induk);
  }
  if (!res) return hasil;

  const daftarHuruf = nilaiTerurai(objek, res, "Font");
  if (!daftarHuruf) return hasil;

  for (const m of daftarHuruf.matchAll(/\/([A-Za-z0-9_.+-]+)\s+(\d+)\s+\d+\s+R/g)) {
    const huruf = objek.get(Number(m[2]));
    if (!huruf) continue;

    const type0 = /\/Subtype\s*\/Type0/.test(huruf.isi);
    const { lebar, lebarBawaan } = type0
      ? lebarGabungan(objek, huruf.isi)
      : lebarSederhana(objek, huruf.isi);

    const cmap = rujukan(ambilNilai(huruf.isi, "ToUnicode"));
    const isiCmap = cmap === null ? undefined : objek.get(cmap)?.aliran;
    const { byte, unicode } = isiCmap
      ? bacaToUnicode(keLatin1(isiCmap))
      : { byte: type0 || /Identity-[HV]/.test(huruf.isi) ? 2 : 1, unicode: new Map<number, string>() };

    hasil.set(m[1], { byte, unicode, lebar, lebarBawaan });
  }

  return hasil;
}

/* ==========================================================================
   ALIRAN ISI -> TEKS
   ========================================================================== */

/** Memecah satu string PDF — "(…)" atau "<…>" — menjadi deretan kode. */
function kodeString(mentah: string, heks: boolean, byte: number): number[] {
  const kode: number[] = [];

  if (heks) {
    const bersih = mentah.replace(/[^0-9A-Fa-f]/g, "");
    const langkah = byte * 2;
    for (let i = 0; i < bersih.length; i += langkah) {
      kode.push(parseInt(bersih.slice(i, i + langkah).padEnd(langkah, "0"), 16));
    }
    return kode;
  }

  const isi: number[] = [];
  const lolos: Record<string, number> = { n: 10, r: 13, t: 9, b: 8, f: 12 };
  for (let i = 0; i < mentah.length; i++) {
    const c = mentah[i];
    if (c !== "\\") {
      isi.push(mentah.charCodeAt(i));
      continue;
    }
    const b = mentah[++i];
    if (b === undefined) break;
    if (b in lolos) isi.push(lolos[b]);
    else if (b >= "0" && b <= "7") {
      let oktal = b;
      while (oktal.length < 3 && mentah[i + 1] >= "0" && mentah[i + 1] <= "7") oktal += mentah[++i];
      isi.push(parseInt(oktal, 8));
    } else if (b !== "\n") isi.push(b.charCodeAt(0));
  }

  if (byte === 1) return isi;
  for (let i = 0; i < isi.length; i += 2) kode.push((isi[i] << 8) | (isi[i + 1] ?? 0));
  return kode;
}

function terjemahkan(kode: number[], huruf: PetaHuruf): string {
  if (huruf.unicode.size > 0) return kode.map((k) => huruf.unicode.get(k) ?? "").join("");
  if (huruf.byte === 2) return ""; // Identity-H tanpa ToUnicode: tak terbaca siapa pun
  return kode.map(dariWinAnsi).join("");
}

/**
 * Membaca satu aliran isi halaman menjadi teks berbaris.
 *
 * PDF tidak menyimpan baris maupun spasi antar kata — yang tersimpan hanya
 * "gambar teks ini di titik sekian". Keduanya harus DISIMPULKAN dari letaknya:
 *
 *   - Matriks teks dijalankan sebagaimana mestinya. `Td`/`TD` menggeser matriks
 *     BARIS (bukan posisi berjalan), sedangkan teks yang tergambar menggeser
 *     posisi berjalan sebesar lebar hurufnya. Membedakan keduanya itu penting:
 *     banyak penulis PDF menempatkan tiap huruf dengan `TD` tersendiri.
 *   - Turun lebih dari setengah tinggi huruf berarti BARIS BARU.
 *   - Pada baris yang sama, potongan berikutnya diberi SPASI bila ia mulai
 *     lebih dari seperlima em di kanan tempat huruf sebelumnya berhenti.
 *     Karena lebar tiap huruf dibaca dari berkasnya, "tempat berhenti" itu
 *     angka sungguhan, bukan tebakan — dan spasi tidak lagi muncul di tengah
 *     kata seperti "SM A ISLAM PLU S".
 */
function aliranKeTeks(isi: string, huruf: Map<string, PetaHuruf>): string {
  let hasil = "";
  let hurufKini: PetaHuruf = HURUF_BAWAAN;

  // Matriks teks disederhanakan menjadi skala + geseran: putaran teks tidak
  // dipakai pada naskah soal, dan mengangkut matriks 3x3 penuh hanya untuk itu
  // akan menggandakan panjang fungsi ini.
  let ukuranTf = 12;
  let skalaX = 1;
  let skalaY = 1;
  let jarakBaris = 0;
  let renggangHuruf = 0;
  let renggangKata = 0;

  let xBaris = 0; // matriks BARIS — yang digeser Td/TD
  let yBaris = 0;
  let x = 0; // posisi berjalan — bertambah tiap kali teks tergambar
  let y = 0;

  let xTulis = Number.NaN; // ujung potongan yang terakhir ditulis
  let yTulis = Number.NaN; // tinggi baris keluaran yang sedang diisi

  const em = () => Math.max(0.01, ukuranTf * skalaX);

  const majuTeks = (kode: number[]): number => {
    let maju = 0;
    for (const k of kode) {
      const w = hurufKini.lebar.get(k) ?? hurufKini.lebarBawaan;
      maju += (w / 1000) * ukuranTf + renggangHuruf;
      // Spasi (hanya bermakna pada huruf berkode satu byte) punya tambahannya
      // sendiri lewat operator Tw.
      if (hurufKini.byte === 1 && k === 32) maju += renggangKata;
    }
    return maju * skalaX;
  };

  const tulis = (teks: string, lebarTeks: number) => {
    if (teks) {
      const ukuran = em();
      if (!Number.isFinite(yTulis)) {
        yTulis = y;
      } else if (Math.abs(y - yTulis) > Math.max(1, ukuran * 0.5)) {
        if (hasil && !hasil.endsWith("\n")) hasil += "\n";
        yTulis = y;
        xTulis = Number.NaN;
      } else if (Number.isFinite(xTulis) && x - xTulis > ukuran * 0.2) {
        if (hasil && !/\s$/.test(hasil)) hasil += " ";
      }
      hasil += teks;
    }
    x += lebarTeks;
    xTulis = x;
  };

  // Penelusur sederhana: string, larik, angka, nama, dan operator.
  const pola =
    /\((?:\\[\s\S]|[^\\()])*\)|<[0-9A-Fa-f\s]*>|\[|\]|\/[^\s/<>[\]()]+|-?[\d.]+|[A-Za-z'"*]+/g;
  const tumpuk: string[] = [];
  const angka = (mundur: number) => Number(tumpuk[tumpuk.length - mundur]);
  const barisBaru = () => {
    yBaris -= jarakBaris || ukuranTf * skalaY * 1.2;
    x = xBaris;
    y = yBaris;
  };

  let cocok: RegExpExecArray | null;
  while ((cocok = pola.exec(isi)) !== null) {
    const t = cocok[0];

    if (
      t.startsWith("(") ||
      t.startsWith("<") ||
      t === "[" ||
      t === "]" ||
      t.startsWith("/") ||
      /^-?[\d.]+$/.test(t)
    ) {
      tumpuk.push(t);
      if (tumpuk.length > 512) tumpuk.splice(0, tumpuk.length - 512);
      continue;
    }

    const gambar = (s: string) => {
      const kode = kodeString(s.slice(1, -1), s.startsWith("<"), hurufKini.byte);
      tulis(terjemahkan(kode, hurufKini), majuTeks(kode));
    };

    switch (t) {
      case "Tf": {
        // "/F3 11 Tf" — nama hurufnya di depan ukurannya.
        const nama = [...tumpuk].reverse().find((v) => v.startsWith("/"));
        if (nama) hurufKini = huruf.get(nama.slice(1)) ?? HURUF_BAWAAN;
        const n = angka(1);
        if (Number.isFinite(n)) ukuranTf = Math.abs(n);
        break;
      }
      case "TL": {
        const n = angka(1);
        if (Number.isFinite(n)) jarakBaris = Math.abs(n) * skalaY;
        break;
      }
      case "Tc": {
        const n = angka(1);
        if (Number.isFinite(n)) renggangHuruf = n;
        break;
      }
      case "Tw": {
        const n = angka(1);
        if (Number.isFinite(n)) renggangKata = n;
        break;
      }
      case "BT":
        // Matriks teks DAN matriks baris kembali ke identitas.
        xBaris = 0;
        yBaris = 0;
        x = 0;
        y = 0;
        skalaX = 1;
        skalaY = 1;
        break;
      case "Tm": {
        // a b c d e f Tm — menyetel kedua matriks sekaligus.
        const a = angka(6);
        const d = angka(3);
        const e = angka(2);
        const f = angka(1);
        if ([a, d, e, f].every(Number.isFinite)) {
          skalaX = Math.abs(a) || 1;
          skalaY = Math.abs(d) || 1;
          xBaris = e;
          yBaris = f;
          x = e;
          y = f;
        }
        break;
      }
      case "Td":
      case "TD": {
        const tx = angka(2);
        const ty = angka(1);
        if (Number.isFinite(tx) && Number.isFinite(ty)) {
          if (t === "TD") jarakBaris = Math.abs(ty) * skalaY;
          xBaris += tx * skalaX;
          yBaris += ty * skalaY;
          x = xBaris;
          y = yBaris;
        }
        break;
      }
      case "T*":
        barisBaru();
        break;
      case "'":
      case '"': {
        barisBaru();
        const s = [...tumpuk].reverse().find((v) => v.startsWith("(") || v.startsWith("<"));
        if (s) gambar(s);
        break;
      }
      case "Tj": {
        const s = tumpuk[tumpuk.length - 1] ?? "";
        if (s.startsWith("(") || s.startsWith("<")) gambar(s);
        break;
      }
      case "TJ": {
        // Isi larik terakhir: potongan teks diselingi angka penggeser. Angka
        // positif menarik teks berikutnya ke KIRI — itulah kerning; yang besar
        // (di atas 100 per seribu em) adalah spasi yang sengaja tidak ditulis.
        const mulai = tumpuk.lastIndexOf("[");
        for (const v of tumpuk.slice(mulai + 1)) {
          if (v === "]") break;
          if (v.startsWith("(") || v.startsWith("<")) gambar(v);
          else if (/^-?[\d.]+$/.test(v)) x -= (Number(v) / 1000) * ukuranTf * skalaX;
        }
        break;
      }
      default:
        break;
    }

    if (/^(?:Tj|TJ|Td|TD|Tm|T\*|BT|ET|Tf|TL|Tc|Tw|'|")$/.test(t)) tumpuk.length = 0;
  }

  return hasil;
}

/* ==========================================================================
   PINTU MASUK
   ========================================================================== */

export class GagalPdf extends Error {}

/**
 * Membaca seluruh teks sebuah PDF, halaman demi halaman.
 *
 * Melempar `GagalPdf` bila berkasnya bukan PDF, atau bila tidak ada satu huruf
 * pun yang bisa diambil — yang hampir selalu berarti PDF hasil PINDAIAN, dan
 * pesannya mengatakan itu apa adanya supaya pengelola tidak mengira aplikasinya
 * rusak.
 */
export function bacaTeksPdf(data: Uint8Array): string {
  if (data.length < 5 || keLatin1(data.subarray(0, 5)) !== "%PDF-") {
    throw new GagalPdf("Berkas ini bukan PDF yang sah.");
  }

  const objek = daftarObjek(data);
  const halaman = [...objek.values()].filter((o) => /\/Type\s*\/Page(?![a-zA-Z])/.test(o.isi));

  const bagian: string[] = [];
  for (const h of halaman) {
    const huruf = hurufHalaman(objek, h);
    const isiRujuk = ambilNilai(h.isi, "Contents") ?? "";
    // Satu halaman boleh punya beberapa aliran isi yang harus disambung dulu:
    // sebuah operator boleh terpotong di perbatasan aliran.
    const potongan: string[] = [];
    for (const m of isiRujuk.matchAll(/(\d+)\s+\d+\s+R/g)) {
      const aliran = objek.get(Number(m[1]))?.aliran;
      if (aliran && aliran.length) potongan.push(keLatin1(aliran));
    }
    if (potongan.length) bagian.push(aliranKeTeks(potongan.join("\n"), huruf));
  }

  // Jalan cadangan: ada PDF yang pohon halamannya tidak terbaca cara di atas
  // (misalnya karena xref-nya rusak lalu diperbaiki penulis lain). Selama
  // aliran isinya ada, teksnya masih bisa diambil — hanya urutannya bersandar
  // pada nomor objek, bukan nomor halaman.
  if (bagian.join("").trim().length === 0) {
    for (const o of [...objek.values()].sort((a, b) => a.nomor - b.nomor)) {
      if (!o.aliran || !o.aliran.length) continue;
      const isi = keLatin1(o.aliran);
      if (!/\bBT\b/.test(isi) || !/\b(?:Tj|TJ)\b/.test(isi)) continue;
      bagian.push(aliranKeTeks(isi, new Map()));
    }
  }

  const teks = bagian
    .join("\n")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!teks) {
    throw new GagalPdf(
      "PDF ini tidak memuat teks yang bisa dibaca — biasanya karena isinya hasil pindaian (gambar). " +
        "Unggah naskahnya sebagai .docx, atau simpan ulang PDF-nya dari Word/Google Docs.",
    );
  }
  return teks;
}
