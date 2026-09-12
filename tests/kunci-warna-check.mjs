/**
 * Pengujian DUA CARA GURU MENANDAI KUNCI di naskah Word (tanpa framework tes).
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/kunci-warna-check.mjs
 *
 * Naskah dari guru tidak pernah menulis "Kunci: C". Yang dipakai hanya dua:
 *
 *   CARA 1 — jawaban benar diberi warna MERAH di badan soal.
 *   CARA 2 — seluruh kunci ditaruh di halaman terakhir berjudul "Kunci Jawaban".
 *
 * Keduanya diuji di sini beserta ragam bentuk yang benar-benar ditemui:
 * merah langsung, merah dari warna tema, merah dari gaya karakter, stabilo,
 * halaman kunci berjudul panjang, halaman kunci berbentuk tabel, dan halaman
 * kunci yang dikelompokkan per subtes.
 *
 * Berkas .ts asli dipakai apa adanya — disalin ke folder sementara di dalam
 * proyek dengan penambahan ekstensi pada impornya.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import JSZip from "jszip";

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
const TMP = path.join(AKAR, ".tmp", "cek", "kunci-warna");

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

const rapikan = (sumber) =>
  sumber
    .replace(/^import "server-only";\s*$/m, "")
    .replace(/from "@\/components\/exam\/tipe"/g, 'from "./tipe-exam.ts"')
    .replace(/from "@\/lib\/(?:[a-z0-9-]+\/)?([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"')
    .replace(/from "\.\/([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"');

// Menelusuri src/lib SECARA REKURSIF: sejak 12 September 2026 isinya
// bersarang per domain (core/, tryout/, ielts/, ...). Salinannya tetap
// diratakan — nama dasarnya unik di seluruh domain.
for (const berkas of fs
  .readdirSync(path.join(AKAR, "src", "lib"), { recursive: true })
  .map((p) => String(p))
  .filter((p) => p.endsWith(".ts"))
  .map((p) => p.split(/[\/]/).pop())) {
  if (!berkas.endsWith(".ts")) continue;
  fs.writeFileSync(
    path.join(TMP, berkas),
    rapikan(fs.readFileSync(cariDiLib(berkas), "utf8")),
  );
}
fs.writeFileSync(
  path.join(TMP, "tipe-exam.ts"),
  rapikan(fs.readFileSync(path.join(AKAR, "src", "components", "exam", "tipe.ts"), "utf8")),
);

const { bacaNaskahDocx, tabelKeDaftarKunci, pecahDaftarKunci } = await import(
  pathToFileURL(path.join(TMP, "naskah-docx.ts")).href
);
const { warnaMerah } = await import(pathToFileURL(path.join(TMP, "docx.ts")).href);

let gagal = 0;
function periksa(nama, syarat, tambahan = "") {
  if (syarat) {
    console.log("  ✓ " + nama);
  } else {
    gagal++;
    console.log("  ✗ " + nama + (tambahan ? " — " + tambahan : ""));
  }
}

/* ------------------------------------------------------------------ */
/* Alat bantu: menyusun .docx tiruan                                   */
/* ------------------------------------------------------------------ */

/** Satu run dengan sifat yang ditentukan sendiri. */
const run = (teks, rPr = "") =>
  `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}<w:t xml:space="preserve">${teks}</w:t></w:r>`;

/** Paragraf polos. */
const par = (teks) => `<w:p>${run(teks)}</w:p>`;

/** Paragraf yang seluruh isinya diberi sifat tertentu (warna, gaya, stabilo). */
const parSifat = (teks, rPr) => `<w:p>${run(teks, rPr)}</w:p>`;

const MERAH = '<w:color w:val="FF0000"/>';
const MERAH_TUA = '<w:color w:val="C00000"/>';
const BIRU = '<w:color w:val="0070C0"/>';
const ABU = '<w:color w:val="595959"/>';
const STABILO = '<w:highlight w:val="yellow"/>';
const ARSIR = '<w:shd w:val="clear" w:fill="FFFF00"/>';
const TEMA_MERAH = '<w:color w:val="auto" w:themeColor="accent2"/>';
const GAYA_KUNCI = '<w:rStyle w:val="GayaKunci"/>';

const THEME = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Uji">
<a:themeElements><a:clrScheme name="Uji">
<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
<a:accent1><a:srgbClr val="4472C4"/></a:accent1>
<a:accent2><a:srgbClr val="ED2024"/></a:accent2>
</a:clrScheme></a:themeElements></a:theme>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:style w:type="character" w:styleId="GayaMerahDasar"><w:rPr><w:color w:val="FF0000"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="GayaKunci"><w:basedOn w:val="GayaMerahDasar"/><w:rPr><w:b/></w:rPr></w:style>
</w:styles>`;

/** Satu tabel Word dari matriks teks. */
function tabel(baris) {
  const tr = baris
    .map(
      (r) =>
        `<w:tr>${r.map((sel) => `<w:tc><w:p>${run(sel)}</w:p></w:tc>`).join("")}</w:tr>`,
    )
    .join("");
  return `<w:tbl>${tr}</w:tbl>`;
}

async function docx(body, { pakaiGaya = true } = {}) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  if (pakaiGaya) {
    zip.file("word/styles.xml", STYLES);
    zip.file("word/theme/theme1.xml", THEME);
  }
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

const baca = async (body, opsi) =>
  bacaNaskahDocx(await docx(body, opsi), { kodePaket: "UJI", simpanGambar: false });

/**
 * Satu soal pilihan ganda; `sifat` diberikan ke pilihan bernomor `bertanda`
 * (0 = A). `sifatLain` bila ada, diberikan ke SEMUA pilihan lainnya.
 */
function soal(nomor, { bertanda = -1, sifat = "", sifatLain = "" } = {}) {
  const isi = ["Alfa", "Beta", "Gama", "Delta", "Epsilon"];
  const baris = [par(`${nomor}. Pertanyaan nomor ${nomor}?`)];
  isi.forEach((teks, i) => {
    const label = "ABCDE"[i];
    const s = i === bertanda ? sifat : sifatLain;
    baris.push(s ? parSifat(`${label}. ${teks}`, s) : par(`${label}. ${teks}`));
  });
  return baris;
}

const kunciDari = (hasil, nomor) =>
  hasil.butir.find((b) => b.nomor === String(nomor))?.kunci ?? "";

/* ------------------------------------------------------------------ */
console.log("\n1. warnaMerah() mengenali merah, menolak warna lain");
/* ------------------------------------------------------------------ */

periksa("FF0000 merah", warnaMerah("FF0000"));
periksa("C00000 (merah tua Word) merah", warnaMerah("C00000"));
periksa("ED2024 (merah tema) merah", warnaMerah("ED2024"));
periksa("A52A2A (merah bata) merah", warnaMerah("A52A2A"));
periksa("0070C0 biru bukan merah", !warnaMerah("0070C0"));
periksa("00B050 hijau bukan merah", !warnaMerah("00B050"));
periksa("595959 abu bukan merah", !warnaMerah("595959"));
periksa("FFC7CE merah muda pucat bukan merah", !warnaMerah("FFC7CE"));
periksa("teks ngawur bukan merah", !warnaMerah("bukan-warna"));

/* ------------------------------------------------------------------ */
console.log("\n2. CARA 1 — jawaban benar diwarnai merah");
/* ------------------------------------------------------------------ */

const merahLangsung = await baca([
  par("PENALARAN UMUM"),
  ...soal(1, { bertanda: 2, sifat: MERAH }),
  ...soal(2, { bertanda: 4, sifat: MERAH_TUA }),
]);
periksa("dua soal terbaca", merahLangsung.butir.length === 2);
periksa("merah FF0000 -> kunci C", kunciDari(merahLangsung, 1) === "C", kunciDari(merahLangsung, 1));
periksa("merah tua C00000 -> kunci E", kunciDari(merahLangsung, 2) === "E", kunciDari(merahLangsung, 2));
periksa(
  "catatannya menyebut merah",
  merahLangsung.catatan.some((c) => c.includes("MERAH")),
  merahLangsung.catatan.join(" | "),
);

/* ------------------------------------------------------------------ */
console.log("\n3. Merah dari WARNA TEMA (baris atas palet Word)");
/* ------------------------------------------------------------------ */

const tema = await baca([par("PENALARAN UMUM"), ...soal(1, { bertanda: 1, sifat: TEMA_MERAH })]);
periksa("warna tema accent2 -> kunci B", kunciDari(tema, 1) === "B", kunciDari(tema, 1));

const tanpaTema = await baca(
  [par("PENALARAN UMUM"), ...soal(1, { bertanda: 1, sifat: TEMA_MERAH })],
  { pakaiGaya: false },
);
periksa(
  "tanpa theme1.xml tetap terbaca sebagai bertanda",
  kunciDari(tanpaTema, 1) === "B",
  kunciDari(tanpaTema, 1),
);

/* ------------------------------------------------------------------ */
console.log("\n4. Merah dari GAYA KARAKTER (styles.xml, termasuk warisan)");
/* ------------------------------------------------------------------ */

const gaya = await baca([par("PENALARAN UMUM"), ...soal(1, { bertanda: 3, sifat: GAYA_KUNCI })]);
periksa("gaya mewarisi merah -> kunci D", kunciDari(gaya, 1) === "D", kunciDari(gaya, 1));

/* ------------------------------------------------------------------ */
console.log("\n5. Stabilo dan arsiran tetap dihitung");
/* ------------------------------------------------------------------ */

const stabilo = await baca([
  par("PENALARAN UMUM"),
  ...soal(1, { bertanda: 0, sifat: STABILO }),
  ...soal(2, { bertanda: 2, sifat: ARSIR }),
]);
periksa("stabilo kuning -> kunci A", kunciDari(stabilo, 1) === "A", kunciDari(stabilo, 1));
periksa("arsiran run -> kunci C", kunciDari(stabilo, 2) === "C", kunciDari(stabilo, 2));

const biru = await baca([par("PENALARAN UMUM"), ...soal(1, { bertanda: 4, sifat: BIRU })]);
periksa(
  "tanpa merah sama sekali, warna lain tetap dipakai",
  kunciDari(biru, 1) === "E",
  kunciDari(biru, 1),
);

/* ------------------------------------------------------------------ */
console.log("\n6. Merah menjadi pemutus saat SEMUA pilihan berwarna");
/* ------------------------------------------------------------------ */

// Naskah yang badan teksnya diberi warna abu-abu — dulu setiap pilihan tampak
// bertanda dan kuncinya gagal disimpulkan sama sekali.
const semuaBerwarna = await baca([
  par("PENALARAN UMUM"),
  ...soal(1, { bertanda: 2, sifat: MERAH, sifatLain: ABU }),
]);
periksa(
  "merah menang atas abu-abu -> kunci C",
  kunciDari(semuaBerwarna, 1) === "C",
  kunciDari(semuaBerwarna, 1),
);

/* ------------------------------------------------------------------ */
console.log("\n7. Dua pilihan bertanda: kunci TIDAK ditebak, tapi dilaporkan");
/* ------------------------------------------------------------------ */

const kembar = await baca([
  par("PENALARAN UMUM"),
  par("1. Pertanyaan nomor 1?"),
  parSifat("A. Alfa", MERAH),
  parSifat("B. Beta", MERAH),
  par("C. Gama"),
  par("D. Delta"),
  par("E. Epsilon"),
]);
periksa("kuncinya dibiarkan kosong", kunciDari(kembar, 1) === "", kunciDari(kembar, 1));
periksa(
  "admin diberi tahu sebabnya",
  kembar.catatan.some((c) => c.includes("Lebih dari satu pilihan ditandai")),
  kembar.catatan.join(" | "),
);

/* ------------------------------------------------------------------ */
console.log("\n8. Pilihan berjajar satu baris, LABEL-nya yang dimerahkan");
/* ------------------------------------------------------------------ */

const sebaris = await baca([
  par("PENALARAN UMUM"),
  par("1. Pertanyaan nomor 1?"),
  `<w:p>${run("A. Alfa ")}${run("B. Beta ")}${run("C. ", MERAH)}${run("Gama ")}${run("D. Delta ")}${run("E. Epsilon")}</w:p>`,
]);
periksa("label merah (C) -> kunci C", kunciDari(sebaris, 1) === "C", kunciDari(sebaris, 1));

/* ------------------------------------------------------------------ */
console.log("\n9. CARA 2 — halaman kunci berjudul polos (perilaku lama)");
/* ------------------------------------------------------------------ */

const polos = await baca([
  par("PENALARAN UMUM"),
  ...soal(1),
  ...soal(2),
  ...soal(3),
  par("Kunci Jawaban"),
  par("1. C"),
  par("2. A"),
  par("3. E"),
]);
periksa("tiga soal saja, halaman kunci tidak jadi soal", polos.butir.length === 3, `${polos.butir.length}`);
periksa("kunci 1 = C", kunciDari(polos, 1) === "C");
periksa("kunci 2 = A", kunciDari(polos, 2) === "A");
periksa("kunci 3 = E", kunciDari(polos, 3) === "E");

/* ------------------------------------------------------------------ */
console.log("\n10. Halaman kunci berjudul PANJANG");
/* ------------------------------------------------------------------ */

const judulPanjang = await baca([
  par("PENALARAN UMUM"),
  ...soal(1),
  ...soal(2),
  par("KUNCI JAWABAN TRYOUT REAL UTBK 4 SEPTEMBER 2026"),
  par("1. B  2. D"),
]);
periksa("dua soal saja", judulPanjang.butir.length === 2, `${judulPanjang.butir.length}`);
periksa("kunci 1 = B", kunciDari(judulPanjang, 1) === "B", kunciDari(judulPanjang, 1));
periksa("kunci 2 = D", kunciDari(judulPanjang, 2) === "D", kunciDari(judulPanjang, 2));

const judulSubtes = await baca([
  par("PENALARAN UMUM"),
  ...soal(1),
  par("KUNCI JAWABAN PENALARAN UMUM"),
  par("1. A"),
]);
periksa("judul yang menyebut subtes tetap dikenali", kunciDari(judulSubtes, 1) === "A", kunciDari(judulSubtes, 1));

/* ------------------------------------------------------------------ */
console.log('\n11. "Kunci: C" milik satu soal TIDAK dikira judul halaman');
/* ------------------------------------------------------------------ */

const kunciSatuSoal = await baca([
  par("PENALARAN UMUM"),
  ...soal(1),
  par("Kunci: C"),
  ...soal(2),
  par("Kunci Jawaban: B"),
]);
periksa("dua soal tetap terbaca", kunciSatuSoal.butir.length === 2, `${kunciSatuSoal.butir.length}`);
periksa('"Kunci: C" jadi kunci soal 1', kunciDari(kunciSatuSoal, 1) === "C", kunciDari(kunciSatuSoal, 1));
periksa(
  '"Kunci Jawaban: B" jadi kunci soal 2, bukan judul halaman',
  kunciDari(kunciSatuSoal, 2) === "B",
  kunciDari(kunciSatuSoal, 2),
);

/* ------------------------------------------------------------------ */
console.log("\n12. Halaman kunci dikelompokkan per subtes");
/* ------------------------------------------------------------------ */

const perSubtes = await baca([
  par("PENALARAN UMUM"),
  ...soal(1),
  ...soal(2),
  par("PENGETAHUAN DAN PEMAHAMAN UMUM"),
  ...soal(1),
  ...soal(2),
  par("KUNCI JAWABAN"),
  par("PENALARAN UMUM"),
  par("1. A"),
  par("2. B"),
  par("PENGETAHUAN DAN PEMAHAMAN UMUM"),
  par("1. D"),
  par("2. E"),
]);
const ambil = (subtes, nomor) =>
  perSubtes.butir.find((b) => b.subtes === subtes && b.nomor === String(nomor))?.kunci ?? "";
periksa("empat soal saja", perSubtes.butir.length === 4, `${perSubtes.butir.length}`);
periksa("PU 1 = A", ambil("PU", 1) === "A", ambil("PU", 1));
periksa("PU 2 = B", ambil("PU", 2) === "B", ambil("PU", 2));
periksa("PPU 1 = D", ambil("PPU", 1) === "D", ambil("PPU", 1));
periksa("PPU 2 = E", ambil("PPU", 2) === "E", ambil("PPU", 2));

/* ------------------------------------------------------------------ */
console.log("\n13. Halaman kunci per subtes, LALU soal berikutnya menyusul");
/* ------------------------------------------------------------------ */

const kunciDiTengah = await baca([
  par("PENALARAN UMUM"),
  ...soal(1),
  par("KUNCI JAWABAN"),
  par("1. C"),
  par("PENGETAHUAN DAN PEMAHAMAN UMUM"),
  ...soal(1),
  par("KUNCI JAWABAN"),
  par("1. E"),
]);
const ambil2 = (subtes, nomor) =>
  kunciDiTengah.butir.find((b) => b.subtes === subtes && b.nomor === String(nomor))?.kunci ?? "";
periksa("dua soal terbaca, bukan tertelan halaman kunci", kunciDiTengah.butir.length === 2, `${kunciDiTengah.butir.length}`);
periksa("PU 1 = C", ambil2("PU", 1) === "C", ambil2("PU", 1));
periksa("PPU 1 = E", ambil2("PPU", 1) === "E", ambil2("PPU", 1));
periksa(
  "soal PPU tidak kehilangan pilihannya",
  (kunciDiTengah.butir.find((b) => b.subtes === "PPU")?.opsi ?? []).filter(Boolean).length === 5,
);

/* ------------------------------------------------------------------ */
console.log("\n14. Halaman kunci berbentuk TABEL");
/* ------------------------------------------------------------------ */

const tabelBerjudul = await baca([
  par("PENALARAN UMUM"),
  ...soal(1),
  ...soal(2),
  par("KUNCI JAWABAN"),
  tabel([
    ["No", "Kunci"],
    ["1", "D"],
    ["2", "A"],
  ]),
]);
periksa("dua soal saja", tabelBerjudul.butir.length === 2, `${tabelBerjudul.butir.length}`);
periksa("tabel No|Kunci -> kunci 1 = D", kunciDari(tabelBerjudul, 1) === "D", kunciDari(tabelBerjudul, 1));
periksa("tabel No|Kunci -> kunci 2 = A", kunciDari(tabelBerjudul, 2) === "A", kunciDari(tabelBerjudul, 2));

const tabelKisi = await baca([
  par("PENALARAN UMUM"),
  ...soal(1),
  ...soal(2),
  ...soal(3),
  ...soal(4),
  par("KUNCI JAWABAN"),
  tabel([
    ["1. A", "2. B"],
    ["3. C", "4. D"],
  ]),
]);
periksa("kisi berisi \"1. A\" per sel", kunciDari(tabelKisi, 3) === "C", kunciDari(tabelKisi, 3));
periksa("kisi sel terakhir juga terbaca", kunciDari(tabelKisi, 4) === "D", kunciDari(tabelKisi, 4));

const tabelSelang = await baca([
  par("PENALARAN UMUM"),
  ...soal(1),
  ...soal(2),
  ...soal(3),
  par("KUNCI JAWABAN"),
  tabel([
    ["1", "2", "3"],
    ["E", "C", "B"],
  ]),
]);
periksa("baris nomor lalu baris huruf -> kunci 1 = E", kunciDari(tabelSelang, 1) === "E", kunciDari(tabelSelang, 1));
periksa("kunci 2 = C", kunciDari(tabelSelang, 2) === "C", kunciDari(tabelSelang, 2));
periksa("kunci 3 = B", kunciDari(tabelSelang, 3) === "B", kunciDari(tabelSelang, 3));

/* ------------------------------------------------------------------ */
console.log("\n15. Tabel kunci berjudul dikenali TANPA judul halaman");
/* ------------------------------------------------------------------ */

const tabelTanpaJudul = await baca([
  par("PENALARAN UMUM"),
  ...soal(1),
  tabel([
    ["Nomor", "Jawaban"],
    ["1", "B"],
  ]),
]);
periksa("satu soal saja", tabelTanpaJudul.butir.length === 1, `${tabelTanpaJudul.butir.length}`);
periksa("kuncinya terbaca dari tabel", kunciDari(tabelTanpaJudul, 1) === "B", kunciDari(tabelTanpaJudul, 1));

// Tabel data soal biasa TIDAK boleh dikira kunci.
const tabelData = await baca([
  par("PENALARAN UMUM"),
  par("1. Perhatikan tabel berikut."),
  tabel([
    ["Kota", "Jumlah"],
    ["Padang", "12"],
    ["Medan", "20"],
  ]),
  par("A. Alfa"),
  par("B. Beta"),
]);
periksa(
  "tabel data tetap masuk ke soal, bukan jadi kunci",
  (tabelData.butir[0]?.pertanyaan ?? "").includes("<table"),
  (tabelData.butir[0]?.pertanyaan ?? "").slice(0, 80),
);
periksa("soalnya tetap tanpa kunci", (tabelData.butir[0]?.kunci ?? "") === "");

/* ------------------------------------------------------------------ */
console.log("\n16. Daftar kunci tanpa tanda baca sama sekali");
/* ------------------------------------------------------------------ */

periksa(
  '"1 A 2 B 3 C" terbaca tiga pasang',
  JSON.stringify(pecahDaftarKunci("1 A 2 B 3 C")) ===
    JSON.stringify([
      { nomor: 1, kunci: "A" },
      { nomor: 2, kunci: "B" },
      { nomor: 3, kunci: "C" },
    ]),
  JSON.stringify(pecahDaftarKunci("1 A 2 B 3 C")),
);
periksa(
  '"1. 25" tetap satu pasang berkunci angka',
  JSON.stringify(pecahDaftarKunci("1. 25")) === JSON.stringify([{ nomor: 1, kunci: "25" }]),
  JSON.stringify(pecahDaftarKunci("1. 25")),
);
periksa(
  '"19. Known" tetap utuh',
  JSON.stringify(pecahDaftarKunci("19. Known")) === JSON.stringify([{ nomor: 19, kunci: "Known" }]),
  JSON.stringify(pecahDaftarKunci("19. Known")),
);

const tanpaTitik = await baca([
  par("PENALARAN UMUM"),
  ...soal(1),
  ...soal(2),
  par("KUNCI JAWABAN"),
  par("1 D 2 C"),
]);
periksa("naskah dengan kunci tanpa titik -> kunci 1 = D", kunciDari(tanpaTitik, 1) === "D", kunciDari(tanpaTitik, 1));
periksa("kunci 2 = C", kunciDari(tanpaTitik, 2) === "C", kunciDari(tanpaTitik, 2));

/* ------------------------------------------------------------------ */
console.log("\n17. tabelKeDaftarKunci() sebagai fungsi tersendiri");
/* ------------------------------------------------------------------ */

periksa(
  "kolom berjudul terbaca",
  JSON.stringify(tabelKeDaftarKunci([["No", "Kunci"], ["1", "A"], ["2", "B"]])) ===
    JSON.stringify([
      { nomor: 1, kunci: "A" },
      { nomor: 2, kunci: "B" },
    ]),
);
periksa(
  "tanpa judul kolom, mode ketat menolak",
  tabelKeDaftarKunci([["1", "A"], ["2", "B"]], true).length === 0,
);
periksa("tabel kosong aman", tabelKeDaftarKunci([]).length === 0);

/* ------------------------------------------------------------------ */
console.log("\n18. Kedua cara dipakai bersama dalam satu naskah");
/* ------------------------------------------------------------------ */

// Kunci di badan soal menang; halaman kunci hanya menambal yang belum berkunci.
const gabungan = await baca([
  par("PENALARAN UMUM"),
  ...soal(1, { bertanda: 0, sifat: MERAH }),
  ...soal(2),
  ...soal(3),
  par("KUNCI JAWABAN"),
  par("2. C"),
  par("3. D"),
]);
periksa("soal 1 dari warna merah = A", kunciDari(gabungan, 1) === "A", kunciDari(gabungan, 1));
periksa("soal 2 dari halaman kunci = C", kunciDari(gabungan, 2) === "C", kunciDari(gabungan, 2));
periksa("soal 3 dari halaman kunci = D", kunciDari(gabungan, 3) === "D", kunciDari(gabungan, 3));
periksa(
  "kedua sumber sama-sama dilaporkan di catatan",
  gabungan.catatan.some((c) => c.includes("daftar kunci di akhir naskah")) &&
    gabungan.catatan.some((c) => c.includes("MERAH")),
  gabungan.catatan.join(" | "),
);

/* ------------------------------------------------------------------ */
console.log("\n9. Pilihan yang seluruhnya merah TAPI dipecah Word jadi banyak run");
/* ------------------------------------------------------------------ */
/*
 * Word kerap memecah satu pilihan menjadi beberapa <w:r> walau pengetiknya
 * mewarnai semuanya sekaligus — "(7)" tersimpan sebagai "(", "7", ")".
 * Tiap potongan tidak berarti apa-apa sendirian: kurung bukan huruf maupun
 * angka, dan "7" sepanjang satu karakter tetapi tidak sama dengan seluruh
 * paragraf. Sebelum 10 September 2026 ketiganya ditolak dan kunci yang
 * jelas-jelas ditandai guru hilang — PPU nomor 11 dan PBM nomor 1 pada naskah
 * TryOut 11 September 2026 keduanya kena.
 */
const pecah = (teks, rPr) =>
  `<w:p>${[...teks].map((c) => run(c, rPr)).join("")}</w:p>`;

const terpecah = await baca([
  par("1. Kalimat yang salah terdapat pada nomor?"),
  par("A. (1)"),
  par("B. (2)"),
  par("C. (6)"),
  pecah("D. (7)", MERAH),
  par("E. (10)"),
  par("2. Angka manakah yang benar?"),
  par("A. 12"),
  pecah("B. 45", MERAH),
  par("C. 67"),
]);
periksa("pilihan merah yang terpecah tetap terbaca -> kunci D", kunciDari(terpecah, 1) === "D", kunciDari(terpecah, 1));
periksa("angka merah yang terpecah tetap terbaca -> kunci B", kunciDari(terpecah, 2) === "B", kunciDari(terpecah, 2));

// Yang TIDAK boleh ikut lolos: tanda separuh kalimat. Pada soal perbaikan
// kalimat, bagian yang diwarnai justru menunjukkan letak KESALAHAN, bukan
// kunci — memaafkannya akan membuat semua pilihan tampak bertanda.
const separuh = await baca([
  par("1. Manakah kalimat yang paling tepat?"),
  `<w:p>${run("A. Ia pergi ")}${run("ke pasar", MERAH)}${run(" kemarin sore.")}</w:p>`,
  par("B. Beta"),
  par("C. Gama"),
]);
periksa(
  "tanda separuh kalimat TIDAK menjadi kunci utuh",
  kunciDari(separuh, 1) === "A",
  "kunci=" + kunciDari(separuh, 1),
);

// Sisa pemformatan yang menyentuh SEBAGIAN kecil pilihan — misalnya titik di
// ujung kalimat yang ikut merah — tidak boleh dianggap kunci. Inilah pembatas
// yang menjaga pemaafan di atas tetap sempit.
const ekorMerah = await baca([
  par("1. Pertanyaan?"),
  `<w:p>${run("A. Alfa")}${run(".", MERAH)}</w:p>`,
  par("B. Beta"),
  par("C. Gama"),
]);
periksa(
  "tanda yang hanya menyentuh tanda baca di ujung TIDAK menjadi kunci",
  kunciDari(ekorMerah, 1) === "",
  "kunci=" + kunciDari(ekorMerah, 1),
);

/* ------------------------------------------------------------------ */
console.log(
  gagal === 0
    ? "\n✅ Semua pemeriksaan pengenalan kunci lolos.\n"
    : `\n❌ ${gagal} pemeriksaan gagal.\n`,
);
process.exit(gagal === 0 ? 0 : 1);
