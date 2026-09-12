/**
 * Pengujian perapian tampilan soal (tanpa framework tes).
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/tampilan-soal-check.mjs
 *
 * Dua hal yang diperiksa, keduanya lahir dari laporan "tampilan soal masih
 * berantakan" (1 September 2026):
 *
 *   1. PERAPIAN NASKAH WORD. Naskah ditulis guru seperti di kertas ujian, lalu
 *      diurai `naskah-docx.ts`. Yang dulu rusak di sini:
 *        a. Tabel Word DIBUANG seluruhnya — soal "Perhatikan tabel berikut"
 *           sampai ke peserta tanpa tabelnya.
 *        b. Paragraf soal dilebur dengan spasi, sehingga data soal dan
 *           perintahnya menempel jadi satu kalimat panjang.
 *        c. Pembahasan disimpan sebagai teks polos, sehingga "s²" jatuh
 *           menjadi "s2" dan diam-diam mengubah artinya.
 *
 *   2. BACAAN BERSAMA. Satu bacaan literasi dipakai beberapa soal berturut-turut
 *      dan disalin utuh ke tiap butir. Rentangnya dihitung dari daftar soal
 *      supaya peserta diberi tahu "untuk soal 1-3" dan tidak membacanya ulang
 *      dari nol — di ponsel bacaan seperti itu setinggi beberapa layar.
 *
 * Berkas .ts asli dipakai apa adanya — hanya disalin ke folder sementara dengan
 * penambahan ekstensi pada impornya, karena Node 24 sudah bisa menjalankan
 * TypeScript.
 */
import fs from "node:fs";
import os from "node:os";
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
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "adzkia-tampilan-"));

for (const nama of ["snbt", "skd", "docx", "naskah-docx", "soal-tampilan"]) {
  const sumber = fs.readFileSync(cariDiLib(`${nama}.ts`), "utf8");
  fs.writeFileSync(
    path.join(TMP, `${nama}.ts`),
    sumber
      .replace(/^import "server-only";\s*$/m, "")
      .replace(/from "@\/lib\/(?:[a-z0-9-]+\/)?([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"')
      .replace(/from "\.\/([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"'),
  );
}
fs.symlinkSync(
  path.join(AKAR, "node_modules"),
  path.join(TMP, "node_modules"),
  process.platform === "win32" ? "junction" : "dir",
);

const JSZip = (await import(pathToFileURL(path.join(TMP, "node_modules/jszip/lib/index.js")).href))
  .default;
const { bacaNaskahDocx } = await import(pathToFileURL(path.join(TMP, "naskah-docx.ts")).href);
const { petaRentangBacaan } = await import(pathToFileURL(path.join(TMP, "soal-tampilan.ts")).href);

let gagal = 0;
function periksa(nama, syarat, tambahan = "") {
  if (syarat) {
    console.log("  ✓ " + nama);
  } else {
    gagal++;
    console.log("  ✗ " + nama + (tambahan ? " — " + tambahan : ""));
  }
}

/* ---------------- penyusun .docx ---------------- */
const lolos = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function run(teks, gaya = {}) {
  const rPr = [];
  if (gaya.b) rPr.push("<w:b/>");
  if (gaya.i) rPr.push("<w:i/>");
  if (gaya.sup) rPr.push('<w:vertAlign w:val="superscript"/>');
  const pra = rPr.length ? `<w:rPr>${rPr.join("")}</w:rPr>` : "";
  return `<w:r>${pra}<w:t xml:space="preserve">${lolos(teks)}</w:t></w:r>`;
}
const par = (isi) => `<w:p>${Array.isArray(isi) ? isi.join("") : run(isi)}</w:p>`;
const sel = (t) => `<w:tc>${par(t)}</w:tc>`;
const tabel = (baris) =>
  `<w:tbl>${baris.map((b) => `<w:tr>${b.map(sel).join("")}</w:tr>`).join("")}</w:tbl>`;

async function buatDocx(body) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
<w:body>${body.join("")}</w:body></w:document>`,
  );
  const buf = await zip.generateAsync({ type: "nodebuffer" });
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}
const baca = async (body) =>
  bacaNaskahDocx(await buatDocx(body), { kodePaket: "UJI", simpanGambar: false });

/* ------------------------------------------------------------------ */
console.log("\n1. Tabel Word tidak boleh hilang dari soal");
/* ------------------------------------------------------------------ */

const h1 = await baca([
  par("PENGETAHUAN KUANTITATIF"),
  par("1. Perhatikan tabel berikut."),
  tabel([
    ["Tahun", "Jumlah"],
    ["2024", "1.200"],
    ["2025", "1.450"],
  ]),
  par("Berdasarkan tabel di atas, simpulan yang tepat adalah…"),
  par("A. naik"),
  par("B. turun"),
  par("C. tetap"),
  par("D. tidak dapat ditentukan"),
  par("E. berfluktuasi"),
  par("Kunci: A"),
]);
const s1 = h1.butir[0];
periksa("satu soal terbaca", h1.butir.length === 1, "dapat " + h1.butir.length);
periksa("tabelnya ikut tersimpan", /<table>/.test(s1.pertanyaan));
periksa("isi selnya utuh", /1\.450/.test(s1.pertanyaan));
periksa("baris judul jadi <th>", /<th>Tahun<\/th>/.test(s1.pertanyaan));
periksa("baris angka tetap <td>", /<td>2024<\/td>/.test(s1.pertanyaan));
periksa(
  "tabel dibungkus pembungkus bergulir",
  /<div class="tabel-soal">/.test(s1.pertanyaan),
);
periksa(
  "kalimat sebelum dan sesudah tabel tetap terpisah",
  /<p>Perhatikan tabel berikut\.<\/p>/.test(s1.pertanyaan) &&
    /<p>Berdasarkan tabel di atas[^<]*<\/p>/.test(s1.pertanyaan),
);
periksa("sel tidak dibungkus <p> berlebih", !/<td><p>/.test(s1.pertanyaan));
periksa("pilihan tidak ikut tertelan tabel", s1.opsi.length === 5 && s1.opsi[0] === "naik");

// Tabel data yang langsung dimulai angka tidak boleh dipaksa berjudul.
const h2 = await baca([
  par("PENALARAN UMUM"),
  par("1. Perhatikan data berikut."),
  tabel([
    ["1", "2"],
    ["3", "4"],
  ]),
  par("A. satu"),
  par("B. dua"),
  par("C. tiga"),
  par("Kunci: A"),
]);
periksa("tabel tanpa judul kolom tidak dipaksa <th>", !/<th>/.test(h2.butir[0].pertanyaan));

/* ------------------------------------------------------------------ */
console.log("\n2. Paragraf soal tidak dilebur menjadi satu kalimat");
/* ------------------------------------------------------------------ */

const h3 = await baca([
  par("LITERASI DALAM BAHASA INDONESIA"),
  par("1. Kalimat pengantar soal yang berdiri sendiri."),
  par("Manakah simpulan yang paling tepat?"),
  par("A. satu"),
  par("B. dua"),
  par("C. tiga"),
  par("D. empat"),
  par("E. lima"),
  par("Kunci: B"),
]);
const s3 = h3.butir[0];
periksa("dua paragraf soal jadi dua <p>", (s3.pertanyaan.match(/<p>/g) || []).length === 2);
periksa(
  "keduanya tidak lagi dipisah spasi biasa",
  !/berdiri sendiri\. Manakah/.test(s3.pertanyaan),
);

// Soal berparagraf tunggal sengaja TIDAK dibungkus <p>, supaya sakelar
// `.isi-soal:has(p)` berperilaku sama seperti sebelum perubahan ini.
const h4 = await baca([
  par("PENALARAN UMUM"),
  par("1. Soal satu paragraf saja."),
  par("A. satu"),
  par("B. dua"),
  par("C. tiga"),
  par("Kunci: A"),
]);
periksa("soal satu paragraf tetap polos tanpa <p>", !/<p>/.test(h4.butir[0].pertanyaan));

/* ------------------------------------------------------------------ */
console.log("\n3. Pembahasan tidak boleh kehilangan bentuknya");
/* ------------------------------------------------------------------ */

const h5 = await baca([
  par("PENGETAHUAN KUANTITATIF"),
  par("1. Berapa luas persegi bersisi s?"),
  par("A. satu"),
  par("B. dua"),
  par("C. tiga"),
  par("Kunci: A"),
  par([run("Pembahasan: luasnya s"), run("2", { sup: true }), run(" satuan.")]),
  par([run("Perhatikan bahwa "), run("s", { i: true }), run(" adalah panjang sisi.")]),
]);
const s5 = h5.butir[0];
periksa("pangkat di pembahasan tetap <sup>", /s<sup>2<\/sup>/.test(s5.pembahasan));
periksa("miring di lanjutan pembahasan tetap <i>", /<i>s<\/i>/.test(s5.pembahasan));
periksa(
  "dua paragraf pembahasan jadi dua <p>",
  (s5.pembahasan.match(/<p>/g) || []).length === 2,
);
periksa("label \"Pembahasan:\" ikut terpotong", !/Pembahasan:/.test(s5.pembahasan));

/* ------------------------------------------------------------------ */
console.log("\n4. Bacaan bersama: rentang soal");
/* ------------------------------------------------------------------ */

const A = "<p>bacaan A</p>";
const B = "<p>bacaan B</p>";
const peta = petaRentangBacaan([
  { nomor: 1, stimulus: A },
  { nomor: 2, stimulus: A },
  { nomor: 3, stimulus: A },
  { nomor: 4, stimulus: B },
  { nomor: 5, stimulus: null },
  { nomor: 6, stimulus: A },
  { nomor: 7, stimulus: A },
]);

periksa("soal 1 tahu bacaannya dipakai soal 1-3", peta[0]?.dari === 1 && peta[0]?.sampai === 3);
periksa("soal 1 ditandai pembaca pertama", peta[0]?.pertama === true);
periksa("soal 2 BUKAN pembaca pertama", peta[1]?.pertama === false);
periksa("jumlah soal sebacaan terhitung", peta[2]?.jumlah === 3);
periksa("bacaan yang hanya dipakai satu soal tidak diberi rentang", peta[3] === null);
periksa("soal tanpa bacaan tidak diberi rentang", peta[4] === null);
periksa(
  "bacaan sama yang terpisah dihitung sebagai kejadian baru, bukan 1-7",
  peta[5]?.dari === 6 && peta[5]?.sampai === 7,
);
periksa("daftar kosong tidak melempar galat", petaRentangBacaan([]).length === 0);
periksa(
  "bacaan berisi spasi saja diperlakukan sebagai tanpa bacaan",
  petaRentangBacaan([
    { nomor: 1, stimulus: "   " },
    { nomor: 2, stimulus: "   " },
  ])[0] === null,
);

/* ------------------------------------------------------------------ */
fs.rmSync(TMP, { recursive: true, force: true });

if (gagal > 0) {
  console.log("\n" + gagal + " pemeriksaan GAGAL.\n");
  process.exit(1);
}
console.log("\nSemua pemeriksaan tampilan soal lulus.\n");
