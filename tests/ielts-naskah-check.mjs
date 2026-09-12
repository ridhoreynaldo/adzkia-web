/**
 * Pengujian IMPOR NASKAH IELTS — pengurai naskah, pembaca .docx, pembaca .pdf.
 *
 * Cara menjalankan (dari root proyek):
 *     npm run cek:naskah-ielts
 *
 * Yang diperiksa:
 *
 *   1. Bentuk butir disimpulkan dari isinya: pilihan A-D jadi PG, kunci
 *      TRUE/FALSE/NOT GIVEN jadi TFNG, Writing/Speaking tanpa kunci jadi ESAI,
 *      sisanya isian singkat.
 *   2. Kunci boleh menempel di bawah soalnya ATAU dikumpulkan di blok
 *      "ANSWER KEY" di akhir berkas — dua kebiasaan yang sama-sama dipakai
 *      naskah cetak.
 *   3. Blok PASSAGE / TRANSCRIPT tidak boleh melahirkan soal palsu. Bacaan
 *      penuh kalimat yang dimulai angka, dan tanpa penjagaan ini separuh
 *      bacaan berubah menjadi butir.
 *   4. Baris sambungan hasil pemenggalan PDF ("250 kata dikenai pinalti…")
 *      juga bukan soal.
 *   5. Kunci yang tidak masuk akal ditandai GALAT, bukan disimpan diam-diam:
 *      pilihan ganda tanpa kunci huruf, isian singkat tanpa kunci, dan
 *      YES/NO yang belum didukung ruang ujian.
 *   6. Tiga mode penomoran (lanjut / berkas / timpa) berperilaku seperti
 *      namanya, dan naskah yang terunggah dua kali tidak menggandakan soal.
 *   7. NASKAH SUNGGUHAN di `scripts/naskah-ielts/` terbaca UTUH dan SAMA
 *      PERSIS dari ketiga bentuk berkas: .txt, .docx, dan .pdf. Inilah
 *      pemeriksaan yang paling berarti — ia sekaligus membuktikan pembaca
 *      .docx dan pembaca PDF buatan sendiri bekerja.
 *   8. Berkas yang bukan PDF, dan PDF tanpa teks (hasil pindaian), ditolak
 *      dengan pesan yang bisa dibaca pengelola.
 *
 * Berkas .ts asli dipakai apa adanya — hanya disalin ke folder sementara DI
 * DALAM proyek (supaya node_modules tetap terjangkau) dengan penambahan
 * ekstensi pada impornya, sama seperti `ielts-check.mjs`.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const AKAR = path.resolve(import.meta.dirname, "..");

/** Jalur lengkap sebuah berkas src/lib, di domain mana pun ia berada. */
function cariDiLib(namaBerkas) {
  const dasar = String(namaBerkas).split(/[\/]/).pop();
  for (const p of fs.readdirSync(path.join(AKAR, "src", "lib"), { recursive: true })) {
    const jalur = String(p);
    if (jalur.split(/[\/]/).pop() === dasar) {
      return path.join(AKAR, "src", "lib", jalur);
    }
  }
  throw new Error(`Tidak ada ${dasar} di src/lib`);
}
const TMP = path.join(AKAR, ".tmp", "cek", "naskah-ielts");

// Dibersihkan di AWAL, bukan di akhir: Windows masih memegang berkas SQLite
// yang terbuka dan rmSync di akhir melempar EPERM.
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
process.env.ADZKIA_DB_PATH = path.join(TMP, "cek.db");

// Menelusuri src/lib SECARA REKURSIF: sejak 12 September 2026 isinya
// bersarang per domain (core/, tryout/, ielts/, ...). Salinannya tetap
// diratakan — nama dasarnya unik di seluruh domain.
for (const berkas of fs
  .readdirSync(path.join(AKAR, "src", "lib"), { recursive: true })
  .map((p) => String(p))
  .filter((p) => p.endsWith(".ts"))
  .map((p) => p.split(/[\/]/).pop())) {
  if (!berkas.endsWith(".ts")) continue;
  const sumber = fs.readFileSync(cariDiLib(berkas), "utf8");
  const rapi = sumber
    .replace(/^import "server-only";\s*$/m, "")
    .replace(/from "@\/lib\/(?:[a-z0-9-]+\/)?([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"')
    .replace(/from "\.\/([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"');
  fs.writeFileSync(path.join(TMP, berkas), rapi);
}

const muat = (nama) => import(pathToFileURL(path.join(TMP, `${nama}.ts`)).href);

const N = await muat("ielts-naskah");
const I = await muat("ielts");
const P = await muat("pdf-teks");
const { tulisDocx, tulisPdf } = await import(
  pathToFileURL(path.join(AKAR, "scripts", "naskah-ielts-berkas.mjs")).href
);

let gagal = 0;
function periksa(nama, syarat, tambahan = "") {
  if (syarat) {
    console.log(`  OK   ${nama}`);
  } else {
    gagal++;
    console.log(`  GAGAL ${nama}${tambahan ? ` — ${tambahan}` : ""}`);
  }
}

/** Mengurai teks langsung, tanpa berkas. */
function urai(teks, subtes = "READING", opsi = {}) {
  const data = new TextEncoder().encode(teks);
  return N.parseNaskahIelts("uji.txt", data.buffer, {
    subtes,
    mode: "berkas",
    nomorTerpakai: new Set(),
    sidikAda: new Set(),
    ...opsi,
  });
}

/* ==========================================================================
   1) Bentuk butir disimpulkan dari isinya
   ========================================================================== */

console.log("\n1) Bentuk butir disimpulkan dari isinya");
{
  const hasil = await urai(
    [
      "PASSAGE 1: Contoh",
      "QUESTIONS: Questions 1-4.",
      "",
      "1. The hall was built in ......... .",
      "ANSWER: 1974",
      "",
      "2. What does the man decide to do?",
      "A. Cancel the booking",
      "B. Move to another hall",
      "C. Pay the extra fee",
      "D. Ask for a refund",
      "ANSWER: C",
      "",
      "3. The hall is open on public holidays.",
      "ANSWER: NOT GIVEN",
      "",
      "4. Describe the chart.",
      "TYPE: essay",
    ].join("\n"),
  );

  periksa("empat butir terbaca", hasil.butir.length === 4, `dapat ${hasil.butir.length}`);
  periksa("tanpa kunci di bawahnya jadi isian singkat", hasil.butir[0].tipe === "IS");
  periksa("isian singkat menyimpan kuncinya", hasil.butir[0].kunci === "1974");
  periksa("empat pilihan jadi pilihan ganda", hasil.butir[1].tipe === "PG");
  periksa("pilihan tersimpan urut A-D", hasil.butir[1].opsi.length === 4);
  periksa("kunci pilihan ganda jadi satu huruf", hasil.butir[1].kunci === "C");
  periksa("NOT GIVEN jadi TFNG", hasil.butir[2].tipe === "TFNG" && hasil.butir[2].kunci === "NOT GIVEN");
  periksa("TYPE: essay memaksa bentuk karangan", hasil.butir[3].tipe === "ESAI");
  periksa("karangan tidak menyimpan kunci", hasil.butir[3].kunci === "");
  periksa("seluruh butir layak simpan", hasil.jumlahLayak === 4 && hasil.jumlahGalat === 0);
}

/* ==========================================================================
   2) Kunci yang dikumpulkan di akhir berkas
   ========================================================================== */

console.log("\n2) Kunci dikumpulkan di blok ANSWER KEY");
{
  const hasil = await urai(
    [
      "PASSAGE 1: Contoh",
      "QUESTIONS: Questions 1-3.",
      "",
      "1. The museum opened in ......... .",
      "2. Tickets must be bought online.",
      "3. Which floor holds the library?",
      "A. Ground",
      "B. First",
      "C. Second",
      "D. Third",
      "",
      "ANSWER KEY",
      "1. 1908   2. TRUE   3. B",
    ].join("\n"),
  );

  periksa("tiga butir terbaca", hasil.butir.length === 3);
  periksa("kunci nomor 1 terpasang", hasil.butir[0].kunci === "1908");
  periksa("kunci nomor 2 dikenali sebagai TFNG", hasil.butir[1].tipe === "TFNG" && hasil.butir[1].kunci === "TRUE");
  periksa("kunci nomor 3 terpasang ke pilihan ganda", hasil.butir[2].kunci === "B");
  periksa("blok kunci tidak ikut jadi soal", hasil.jumlahLayak === 3);

  const sebaris = N.pecahKunciSebaris("1) coach  2) 27 March  3) NOT GIVEN");
  periksa(
    "kunci sebaris terpecah benar",
    sebaris.length === 3 && sebaris[1].kunci === "27 March",
    JSON.stringify(sebaris),
  );
}

/* ==========================================================================
   3) Blok bacaan tidak melahirkan soal palsu
   ========================================================================== */

console.log("\n3) Bacaan & transkrip tidak melahirkan soal palsu");
{
  const hasil = await urai(
    [
      "PASSAGE 1: Trem",
      "PASSAGE:",
      "Between 1930 and 1970 the rails were torn up.",
      "12 kilometres of track were laid that year, and the service began at once.",
      "1985 was the year Nantes reopened its network.",
      "QUESTIONS: Questions 1-2.",
      "",
      "1. Nantes reopened its network in ......... .",
      "ANSWER: 1985",
      "",
      "2. The rails were torn up between 1930 and 1970.",
      "ANSWER: TRUE",
    ].join("\n"),
  );

  periksa("hanya dua butir, bukan empat", hasil.butir.length === 2, `dapat ${hasil.butir.length}`);
  periksa("kalimat bacaan yang dimulai angka tetap di bacaan", hasil.seksi[0].bacaan.includes("12 kilometres"));
  periksa("bacaan utuh tiga baris", hasil.seksi[0].bacaan.split("\n").filter(Boolean).length === 3);

  const listening = await urai(
    [
      "RECORDING 1: Contoh",
      "TRANSCRIPT:",
      "MAN: My mobile is 0784 220 9163.",
      "9163 is the last part, yes.",
      "QUESTIONS: Questions 1-1.",
      "",
      "1. Mobile number ends with ......... .",
      "ANSWER: 9163",
    ].join("\n"),
    "LISTENING",
  );
  periksa("transkrip tidak melahirkan soal", listening.butir.length === 1);
  periksa("transkrip tersimpan terpisah", listening.seksi[0].transkrip.includes("0784 220 9163"));
  periksa("transkrip TIDAK masuk ke kolom bacaan", listening.seksi[0].bacaan === "");
}

/* ==========================================================================
   4) Baris sambungan hasil pemenggalan PDF
   ========================================================================== */

console.log("\n4) Baris sambungan bukan soal");
{
  const hasil = await urai(
    [
      "TASK 1: Contoh",
      "INSTRUCTION: Tulis 250 kata.",
      "",
      "1. Write about the following topic.",
      "NOTE: Jawaban di bawah",
      "250 kata dikenai pinalti pada kriteria Task Response.",
    ].join("\n"),
    "WRITING",
  );

  periksa("hanya satu butir", hasil.butir.length === 1, `dapat ${hasil.butir.length}`);
  periksa("nomornya 1, bukan 250", hasil.butir[0].nomor === 1);

  const besar = await urai(
    ["PASSAGE 1: Contoh", "QUESTIONS: Q", "", "150. Sebuah soal bernomor mustahil."].join("\n"),
  );
  periksa("nomor di atas 99 ditolak sebagai soal", besar.butir.length === 0 && !!besar.errorFile);
}

/* ==========================================================================
   5) Kunci yang tidak masuk akal ditandai galat
   ========================================================================== */

console.log("\n5) Kunci bermasalah ditandai galat, bukan disimpan diam-diam");
{
  const hasil = await urai(
    [
      "PASSAGE 1: Contoh",
      "QUESTIONS: Questions 1-4.",
      "",
      "1. Which is correct?",
      "A. Satu",
      "B. Dua",
      "C. Tiga",
      "D. Empat",
      "ANSWER: Z",
      "",
      "2. The writer agrees with the plan.",
      "ANSWER: YES",
      "",
      "3. Fill this in ......... .",
      "",
      "4. Which statement about the museum is true?",
      "A. Satu",
      "B. Dua",
      "C. Tiga",
      "D. Empat",
      "ANSWER: D",
    ].join("\n"),
  );

  periksa("kunci pilihan ganda di luar A-D ditandai galat", !!hasil.butir[0].galat);
  periksa("YES/NO ditolak dengan penjelasan", /YES\/NO/.test(hasil.butir[1].galat ?? ""), hasil.butir[1].galat);
  periksa("isian singkat tanpa kunci ditandai galat", !!hasil.butir[2].galat);
  periksa("butir yang sehat tetap layak", !hasil.butir[3].galat);
  periksa(
    "rekapnya benar: 3 galat, 1 layak",
    hasil.jumlahGalat === 3 && hasil.jumlahLayak === 1,
    `galat ${hasil.jumlahGalat}, layak ${hasil.jumlahLayak}`,
  );

  const opsiE = await urai(
    [
      "PASSAGE 1: Contoh",
      "QUESTIONS: Q",
      "",
      "1. Which is correct?",
      "A. Satu",
      "B. Dua",
      "C. Tiga",
      "D. Empat",
      "E. Lima",
      "ANSWER: B",
    ].join("\n"),
  );
  periksa("pilihan E diabaikan dan dicatat", opsiE.butir[0].opsi.length === 4);
  periksa("catatan pilihan E muncul", opsiE.catatan.some((c) => /pilihan E/.test(c)), opsiE.catatan.join(" | "));
}

/* ==========================================================================
   6) Mode penomoran & pengenalan naskah kembar
   ========================================================================== */

console.log("\n6) Mode penomoran dan naskah kembar");
{
  const teks = [
    "PASSAGE 1: Contoh",
    "QUESTIONS: Q",
    "",
    "1. Soal pertama ......... .",
    "ANSWER: satu",
    "",
    "2. Soal kedua ......... .",
    "ANSWER: dua",
  ].join("\n");

  const lanjut = await urai(teks, "READING", {
    mode: "lanjut",
    nomorTerpakai: new Set([1, 2, 3]),
  });
  periksa(
    "mode lanjut mengisi nomor kosong terkecil",
    lanjut.butir[0].nomorSimpan === 4 && lanjut.butir[1].nomorSimpan === 5,
    lanjut.butir.map((b) => b.nomorSimpan).join(","),
  );

  const berkas = await urai(teks, "READING", { mode: "berkas", nomorTerpakai: new Set([1]) });
  periksa("mode berkas menandai nomor yang sudah terpakai", !!berkas.butir[0].galat);
  periksa("nomor yang masih kosong tetap layak", !berkas.butir[1].galat);

  const timpa = await urai(teks, "READING", { mode: "timpa", nomorTerpakai: new Set([1]) });
  periksa("mode timpa tidak menganggapnya galat", !timpa.butir[0].galat);

  const kembar = await urai(teks, "READING", {
    mode: "lanjut",
    sidikAda: new Set([N.sidikPertanyaan("Soal pertama ......... .")]),
  });
  periksa("butir yang pertanyaannya sudah ada ditandai kembar", kembar.butir[0].kembar);
  periksa("butir kembar tidak dihitung layak", kembar.jumlahLayak === 1 && kembar.jumlahKembar === 1);

  const berulang = await urai(
    [teks, "", "3. Soal pertama ......... .", "ANSWER: satu"].join("\n"),
    "READING",
    { mode: "lanjut" },
  );
  periksa("pengulangan DI DALAM satu berkas juga tertangkap", berulang.jumlahKembar === 1);
}

/* ==========================================================================
   7) Naskah sungguhan: .txt, .docx, dan .pdf harus sama persis
   ========================================================================== */

console.log("\n7) Naskah sungguhan terbaca sama dari .txt, .docx, dan .pdf");
{
  const DIR = path.join(AKAR, "scripts", "naskah-ielts");
  const NASKAH = [
    { berkas: "01-listening.txt", subtes: "LISTENING", butir: 40, seksi: 4 },
    { berkas: "02-reading.txt", subtes: "READING", butir: 40, seksi: 3 },
    { berkas: "03-writing.txt", subtes: "WRITING", butir: 2, seksi: 2 },
    { berkas: "04-speaking.txt", subtes: "SPEAKING", butir: 3, seksi: 3 },
  ];

  /** Bentuk ringkas satu hasil urai, untuk dibandingkan antarformat. */
  const sidik = (hasil) =>
    JSON.stringify(
      hasil.butir.map((b) => [b.nomor, b.tipe, b.kunci, b.seksiNomor, b.opsi, b.pertanyaan]),
    );

  for (const n of NASKAH) {
    const jalan = path.join(DIR, n.berkas);
    if (!fs.existsSync(jalan)) {
      periksa(`${n.berkas} ada`, false, `tidak ditemukan di ${DIR}`);
      continue;
    }
    const baris = fs.readFileSync(jalan, "utf8").replace(/\r\n?/g, "\n").split("\n");

    const dasar = n.berkas.replace(/\.txt$/, "");
    const jalanDocx = path.join(TMP, `${dasar}.docx`);
    const jalanPdf = path.join(TMP, `${dasar}.pdf`);
    await tulisDocx(baris, jalanDocx);
    tulisPdf(baris, jalanPdf);

    const bacaBerkas = async (p) => {
      const isi = fs.readFileSync(p);
      return N.parseNaskahIelts(path.basename(p), isi.buffer.slice(isi.byteOffset, isi.byteOffset + isi.byteLength), {
        subtes: n.subtes,
        mode: "berkas",
        nomorTerpakai: new Set(),
        sidikAda: new Set(),
      });
    };

    const teks = await bacaBerkas(jalan);
    const docx = await bacaBerkas(jalanDocx);
    const pdf = await bacaBerkas(jalanPdf);

    periksa(
      `${n.subtes}: .txt memuat ${n.butir} butir tanpa galat`,
      teks.butir.length === n.butir && teks.jumlahGalat === 0 && teks.jumlahLayak === n.butir,
      `butir ${teks.butir.length}, galat ${teks.jumlahGalat}${teks.errorFile ? `, ${teks.errorFile}` : ""}`,
    );
    periksa(
      `${n.subtes}: ${n.seksi} bagian terbaca`,
      teks.seksi.length === n.seksi,
      `dapat ${teks.seksi.length}`,
    );
    periksa(`${n.subtes}: .docx sama persis dengan .txt`, sidik(docx) === sidik(teks));
    periksa(`${n.subtes}: .pdf sama persis dengan .txt`, sidik(pdf) === sidik(teks));
  }

  // Listening & Reading harus 40 butir — jumlah baku IELTS internasional.
  const def = (kode) => I.subtesIelts(kode);
  periksa("target Listening 40 butir", def("LISTENING").jumlahSoal === 40);
  periksa("target Reading 40 butir", def("READING").jumlahSoal === 40);
  periksa("target Writing 2 tugas", def("WRITING").jumlahSoal === 2);
  periksa("target Speaking 3 bagian", def("SPEAKING").jumlahSoal === 3);
}

/* ==========================================================================
   8) Berkas yang tidak bisa dibaca ditolak dengan pesan yang jelas
   ========================================================================== */

console.log("\n8) Berkas yang tidak bisa dibaca ditolak dengan jelas");
{
  const bukanPdf = new TextEncoder().encode("ini cuma teks biasa, bukan PDF");
  let pesan = "";
  try {
    P.bacaTeksPdf(bukanPdf);
  } catch (e) {
    pesan = e.message;
  }
  periksa("berkas non-PDF ditolak", /bukan PDF/i.test(pesan), pesan);

  // PDF sah tetapi tanpa satu pun operator teks — meniru hasil pindaian.
  const kosong = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
      "2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n" +
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n" +
      "4 0 obj\n<< /Length 0 >>\nstream\n\nendstream\nendobj\n%%EOF\n",
    "latin1",
  );
  pesan = "";
  try {
    P.bacaTeksPdf(new Uint8Array(kosong));
  } catch (e) {
    pesan = e.message;
  }
  periksa("PDF tanpa teks disebut hasil pindaian", /pindaian/i.test(pesan), pesan);

  const salahFormat = await N.parseNaskahIelts(
    "naskah.rtf",
    new TextEncoder().encode("apa saja").buffer,
    { subtes: "READING", mode: "berkas", nomorTerpakai: new Set(), sidikAda: new Set() },
  );
  periksa("format berkas asing ditolak", /\.docx/.test(salahFormat.errorFile ?? ""), salahFormat.errorFile);

  const docLama = await N.parseNaskahIelts(
    "naskah.doc",
    new TextEncoder().encode("apa saja").buffer,
    { subtes: "READING", mode: "berkas", nomorTerpakai: new Set(), sidikAda: new Set() },
  );
  periksa(".doc lama diberi petunjuk simpan ulang", /Simpan Sebagai/.test(docLama.errorFile ?? ""));

  const tanpaButir = await urai("PASSAGE 1: Kosong\nPASSAGE:\nHanya bacaan tanpa soal sama sekali.");
  periksa(
    "naskah tanpa butir menerangkan dua sebab yang lazim",
    /QUESTIONS/.test(tanpaButir.errorFile ?? ""),
    tanpaButir.errorFile,
  );
}

console.log(gagal === 0 ? "\nSEMUA LULUS.\n" : `\n${gagal} PENGUJIAN GAGAL.\n`);
process.exit(gagal === 0 ? 0 : 1);
