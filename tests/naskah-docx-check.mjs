/**
 * Pengujian cepat pembaca naskah Word (tanpa framework tes).
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/naskah-docx-check.mjs
 *
 * Skrip ini MENYUSUN sendiri berkas .docx di memori — XML Word ditulis apa
 * adanya — lalu memeriksa bahwa `bacaNaskahDocx` mengembalikan butir soal yang
 * benar. Tidak ada berkas naskah asli yang dibutuhkan, sehingga pengujian ini
 * tetap jalan di komputer mana pun.
 *
 * Yang diperiksa:
 *   1. Judul subtes memindahkan soal-soal di bawahnya.
 *   2. Penomoran "1." dan pilihan "A." terbaca.
 *   3. Bacaan bercakupan "untuk soal nomor 1 sampai 2" menempel ke dua soalnya.
 *   4. Pilihan yang ditulis berjajar dalam satu baris ikut terpecah.
 *   5. Cetak tebal/miring/pangkat bertahan sebagai HTML.
 *   6. Baris Kunci / Tipe / Level / Nilai / Pembahasan terbaca.
 *   7. Penomoran otomatis Word (tanpa "1." diketik) tetap terbaca.
 *   8. Tabel berjudul kolom dipakai lebih dulu daripada naskah mengalir.
 *   9. Berkas yang bukan .docx ditolak dengan pesan yang jelas.
 *
 * Berkas .ts asli dipakai apa adanya — hanya disalin ke folder sementara dengan
 * penambahan ekstensi pada impor supaya bisa dimuat langsung oleh Node.
 */
import fs from "node:fs";
import os from "node:os";
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
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "adzkia-docx-"));

/* ---- salin modul yang diperlukan, rapikan impornya ---- */
for (const nama of ["snbt", "skd", "docx", "naskah-docx"]) {
  const sumber = fs.readFileSync(cariDiLib(`${nama}.ts`), "utf8");
  const rapi = sumber
    .replace(/^import "server-only";\s*$/m, "")
    .replace(/from "@\/lib\/(?:[a-z0-9-]+\/)?([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"')
    .replace(/from "\.\/([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"');
  fs.writeFileSync(path.join(TMP, `${nama}.ts`), rapi);
}
// jszip diimpor dengan nama telanjang; sediakan jalan agar Node menemukannya.
fs.symlinkSync(
  path.join(AKAR, "node_modules"),
  path.join(TMP, "node_modules"),
  process.platform === "win32" ? "junction" : "dir",
);

const { bacaNaskahDocx } = await import(pathToFileURL(path.join(TMP, "naskah-docx.ts")).href);

/* ------------------------------------------------------------------ */
/* Perkakas uji                                                        */
/* ------------------------------------------------------------------ */
let lulus = 0;
let gagal = 0;

function cek(nama, syarat, catatan = "") {
  if (syarat) {
    lulus++;
    console.log(`  OK   ${nama}${catatan ? ` — ${catatan}` : ""}`);
  } else {
    gagal++;
    console.log(`  GAGAL ${nama}${catatan ? ` — ${catatan}` : ""}`);
  }
}

function judul(t) {
  console.log(`\n${t}`);
}

/* ------------------------------------------------------------------ */
/* Penyusun .docx                                                      */
/* ------------------------------------------------------------------ */

const lolos = (v) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Satu "run" teks, boleh bergaya: { b, i, sup, sub }. */
function run(teks, gaya = {}) {
  const rPr = [];
  if (gaya.b) rPr.push("<w:b/>");
  if (gaya.i) rPr.push("<w:i/>");
  if (gaya.sup) rPr.push('<w:vertAlign w:val="superscript"/>');
  if (gaya.sub) rPr.push('<w:vertAlign w:val="subscript"/>');
  if (gaya.merah) rPr.push('<w:color w:val="FF0000"/>');
  if (gaya.stabilo) rPr.push('<w:highlight w:val="yellow"/>');
  const pra = rPr.length ? `<w:rPr>${rPr.join("")}</w:rPr>` : "";
  return `<w:r>${pra}<w:t xml:space="preserve">${lolos(teks)}</w:t></w:r>`;
}

/** Satu paragraf. `opsi.daftar` = butir penomoran otomatis Word. */
function par(isi, opsi = {}) {
  const runs = Array.isArray(isi) ? isi.join("") : run(isi);
  const pPr =
    opsi.daftar !== undefined
      ? `<w:pPr><w:numPr><w:ilvl w:val="${opsi.daftar}"/><w:numId w:val="1"/></w:numPr></w:pPr>`
      : "";
  return `<w:p>${pPr}${runs}</w:p>`;
}

function sel(teks) {
  return `<w:tc>${par(teks)}</w:tc>`;
}

function tabel(baris) {
  const isi = baris.map((b) => `<w:tr>${b.map(sel).join("")}</w:tr>`).join("");
  return `<w:tbl>${isi}</w:tbl>`;
}

/** Jeda baris lunak (Shift+Enter) di dalam satu paragraf. */
function jeda() {
  return "<w:r><w:br/></w:r>";
}

/** Paragraf butir daftar otomatis dengan numId tertentu (lihat NUMBERING). */
function parDaftar(isi, numId, ilvl = 0) {
  const runs = Array.isArray(isi) ? isi.join("") : run(isi);
  return `<w:p><w:pPr><w:numPr><w:ilvl w:val="${ilvl}"/><w:numId w:val="${numId}"/></w:numPr></w:pPr>${runs}</w:p>`;
}

/**
 * numbering.xml tiruan: numId 2 menomori dengan ANGKA (nomor soal), numId 3
 * dengan HURUF (pilihan jawaban) — persis bentuk naskah yang ditulis guru.
 */
const NUMBERING = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="10"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>
<w:abstractNum w:abstractNumId="11"><w:lvl w:ilvl="0"><w:numFmt w:val="upperLetter"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>
<w:num w:numId="2"><w:abstractNumId w:val="10"/></w:num>
<w:num w:numId="3"><w:abstractNumId w:val="11"/></w:num>
</w:numbering>`;

async function buatDocx(isiBody, pakaiNumbering = false) {
  const zip = new JSZip();
  if (pakaiNumbering) zip.file("word/numbering.xml", NUMBERING);
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
<w:body>${isiBody.join("")}</w:body></w:document>`,
  );
  const buf = await zip.generateAsync({ type: "nodebuffer" });
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

const baca = async (body) =>
  bacaNaskahDocx(await buatDocx(body), { kodePaket: "UJI", simpanGambar: false });

/** Sama seperti `baca`, tetapi dokumennya membawa numbering.xml dan subtes bawaan. */
const bacaNomor = async (body, subtesBawaan = "") =>
  bacaNaskahDocx(await buatDocx(body, true), {
    kodePaket: "UJI",
    simpanGambar: false,
    subtesBawaan,
  });

/* ------------------------------------------------------------------ */
/* 1-6. Naskah mengalir                                                */
/* ------------------------------------------------------------------ */
judul("1) Naskah mengalir — subtes, penomoran, bacaan, kunci");

const naskah = await baca([
  par("PENALARAN UMUM"),
  par("Teks berikut untuk menjawab soal nomor 1 sampai 2."),
  par("Setiap tahun jumlah pendaftar meningkat sepuluh persen."),
  par("Pada 2025 pendaftarnya berjumlah seribu orang."),
  par("1. Berapa pendaftar pada 2026?"),
  par("A. 1.050"),
  par("B. 1.100"),
  par("C. 1.150"),
  par("D. 1.200"),
  par("E. 1.250"),
  par("Kunci: B"),
  par("Pembahasan: seribu ditambah sepuluh persennya."),
  par("2. Manakah simpulan yang benar?"),
  par("A. naik B. turun C. tetap D. tidak tentu E. tidak ada"),
  par("Kunci: A"),
  par("LITERASI DALAM BAHASA INDONESIA"),
  par([
    run("1. Perhatikan rumus air "),
    run("H"),
    run("2", { sub: true }),
    run("O dan luas "),
    run("r"),
    run("2", { sup: true }),
    run(" pada teks "),
    run("bercetak tebal", { b: true }),
    run(" itu."),
  ]),
  par("A. benar"),
  par("B. salah"),
  par("Tipe: PGK"),
  par("Level: C4"),
  par("Kunci: A, B"),
]);

const b = naskah.butir;
cek("jumlah soal terbaca", b.length === 3, `${b.length} soal`);
cek("subtes soal 1-2 = PU", b[0]?.subtes === "PU" && b[1]?.subtes === "PU", b[0]?.subtes);
cek("subtes soal 3 = LBIND", b[2]?.subtes === "LBIND", b[2]?.subtes);
cek("nomor terbaca", b[0]?.nomor === "1" && b[1]?.nomor === "2" && b[2]?.nomor === "1");
cek(
  "awalan nomor dibuang dari pertanyaan",
  b[0]?.pertanyaan === "Berapa pendaftar pada 2026?",
  JSON.stringify(b[0]?.pertanyaan),
);
cek("lima opsi terbaca", b[0]?.opsi.length === 5, `${b[0]?.opsi.length} opsi`);
cek("awalan huruf dibuang dari opsi", b[0]?.opsi[1] === "1.100", JSON.stringify(b[0]?.opsi[1]));
cek("kunci terbaca", b[0]?.kunci === "B");
cek("pembahasan terbaca", (b[0]?.pembahasan ?? "").startsWith("seribu ditambah"));

judul("2) Bacaan bercakupan menempel ke seluruh rentangnya");
cek("soal 1 dapat bacaan", (b[0]?.stimulus ?? "").includes("sepuluh persen"));
cek("soal 2 dapat bacaan yang sama", b[1]?.stimulus === b[0]?.stimulus);
cek("soal subtes lain tidak kebagian", !b[2]?.stimulus, JSON.stringify(b[2]?.stimulus));
cek(
  "kalimat pengantar tidak ikut jadi bacaan",
  !(b[0]?.stimulus ?? "").includes("Teks berikut"),
);

judul("3) Pilihan berjajar dalam satu baris");
cek("terpecah jadi lima", b[1]?.opsi.length === 5, JSON.stringify(b[1]?.opsi));
cek("isi pilihan pertama benar", b[1]?.opsi[0] === "naik", JSON.stringify(b[1]?.opsi[0]));
cek("isi pilihan terakhir benar", b[1]?.opsi[4] === "tidak ada");

judul("4) Cetak tebal, pangkat, dan indeks bertahan");
cek("indeks bawah jadi <sub>", (b[2]?.pertanyaan ?? "").includes("<sub>2</sub>"), b[2]?.pertanyaan);
cek("pangkat jadi <sup>", (b[2]?.pertanyaan ?? "").includes("<sup>2</sup>"));
cek("tebal jadi <b>", (b[2]?.pertanyaan ?? "").includes("<b>bercetak tebal</b>"));

judul("5) Baris Tipe / Level / kunci ganda");
cek("tipe terbaca", b[2]?.tipe === "PGK", b[2]?.tipe);
cek("level terbaca", b[2]?.level === "C4", b[2]?.level);
cek("kunci ganda terbaca", b[2]?.kunci === "A, B", b[2]?.kunci);

/* ------------------------------------------------------------------ */
/* 6. Penomoran otomatis Word                                          */
/* ------------------------------------------------------------------ */
judul("6) Penomoran otomatis Word (nomor tidak diketik)");
const otomatis = await baca([
  par("TES WAWASAN KEBANGSAAN"),
  par("Pancasila disahkan pada tanggal?", { daftar: 0 }),
  par("17 Agustus 1945", { daftar: 1 }),
  par("18 Agustus 1945", { daftar: 1 }),
  par("Kunci: B"),
  par("Ibu kota negara berada di?", { daftar: 0 }),
  par("Jakarta", { daftar: 1 }),
  par("Nusantara", { daftar: 1 }),
  par("Kunci: B"),
]);
cek("dua soal terbaca", otomatis.butir.length === 2, `${otomatis.butir.length} soal`);
cek("nomor dibangkitkan berurutan", otomatis.butir.map((x) => x.nomor).join(",") === "1,2");
cek("subtes SKD dikenali", otomatis.butir[0]?.subtes === "TWK", otomatis.butir[0]?.subtes);
cek("opsi daftar tingkat dua terbaca", otomatis.butir[0]?.opsi.length === 2);

/* ------------------------------------------------------------------ */
/* 7. Nilai TKP                                                        */
/* ------------------------------------------------------------------ */
judul("7) Butir TKP dengan nilai per pilihan");
const tkp = await baca([
  par("TES KARAKTERISTIK PRIBADI"),
  par("1. Ketika rekan kerja terlambat, saya…"),
  par("A. menegurnya langsung"),
  par("B. mendiamkannya"),
  par("Nilai: 5, 2"),
  par("Kunci: A"),
]);
cek("subtes TKP dikenali", tkp.butir[0]?.subtes === "TKP", tkp.butir[0]?.subtes);
cek("nilai per pilihan terbaca", tkp.butir[0]?.nilai.join(",") === "5,2", tkp.butir[0]?.nilai.join(","));

/* ------------------------------------------------------------------ */
/* 8. Tabel berjudul kolom                                             */
/* ------------------------------------------------------------------ */
judul("8) Tabel berjudul kolom dipakai lebih dulu");
const dariTabel = await baca([
  par("Ini paragraf pembuka yang harus diabaikan."),
  tabel([
    ["subtes", "nomor", "pertanyaan", "opsi_a", "opsi_b", "kunci"],
    ["PU", "1", "Berapa dua tambah dua?", "3", "4", "B"],
    ["PU", "2", "Berapa tiga kali tiga?", "6", "9", "B"],
  ]),
  par("1. Soal mengalir ini juga harus diabaikan."),
]);
cek("jalur tabel terpilih", dariTabel.cara === "tabel", dariTabel.cara);
cek("dua baris terbaca", dariTabel.butir.length === 2, `${dariTabel.butir.length} baris`);
cek("kolom terpetakan", dariTabel.butir[0]?.pertanyaan === "Berapa dua tambah dua?");
cek("opsi tabel terbaca", dariTabel.butir[1]?.opsi.join("|") === "6|9");
cek("kunci tabel terbaca", dariTabel.butir[1]?.kunci === "B");

/* ------------------------------------------------------------------ */
/* 9. Berkas yang bukan .docx                                          */
/* ------------------------------------------------------------------ */
judul("9) Berkas bukan .docx ditolak dengan pesan yang jelas");
let pesan = "";
try {
  const zip = new JSZip();
  zip.file("sembarang.txt", "bukan dokumen Word");
  const buf = await zip.generateAsync({ type: "nodebuffer" });
  await bacaNaskahDocx(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), {
    kodePaket: "UJI",
    simpanGambar: false,
  });
} catch (e) {
  pesan = e instanceof Error ? e.message : String(e);
}
cek("melempar galat", pesan !== "");
cek("pesannya menyebut .docx", pesan.includes(".docx"), pesan);

/* ------------------------------------------------------------------ */
/* 10. Naskah cara guru: jeda baris, daftar berhuruf, kunci tanpa label */
/* ------------------------------------------------------------------ */
judul("10) Pertanyaan dan pilihan dalam SATU paragraf (jeda baris lunak)");

const seParagraf = await baca([
  par("PENALARAN UMUM"),
  par([
    run("1. Ibu kota Indonesia adalah…"),
    jeda(),
    run("(A) Bandung"),
    jeda(),
    run("(B) Jakarta"),
    jeda(),
    run("(C) Surabaya"),
    jeda(),
    run("Kunci: B"),
  ]),
]);
const s1 = seParagraf.butir[0];
cek("satu soal terbaca", seParagraf.butir.length === 1, `${seParagraf.butir.length} soal`);
cek("pertanyaannya bersih dari pilihan", s1?.pertanyaan === "Ibu kota Indonesia adalah…", s1?.pertanyaan);
cek("ketiga pilihan terpisah", s1?.opsi.join("|") === "Bandung|Jakarta|Surabaya", s1?.opsi.join("|"));
cek("kunci di balik jeda baris terbaca", s1?.kunci === "B", s1?.kunci);

judul("11) Pilihan sebagai daftar BERHURUF otomatis Word");

const daftarHuruf = await bacaNomor([
  par("PENALARAN UMUM"),
  parDaftar("Berapa hasil dua tambah dua?", 2),
  parDaftar("Tiga", 3),
  parDaftar("Empat", 3),
  parDaftar("Lima", 3),
  parDaftar("Soal kedua, berapa tiga tambah tiga?", 2),
  parDaftar("Enam", 3),
  parDaftar("Tujuh", 3),
]);
cek("dua soal, bukan tujuh", daftarHuruf.butir.length === 2, `${daftarHuruf.butir.length} butir`);
cek(
  "pilihan daftar berhuruf masuk sebagai opsi",
  daftarHuruf.butir[0]?.opsi.join("|") === "Tiga|Empat|Lima",
  daftarHuruf.butir[0]?.opsi.join("|"),
);
cek("nomor soal daftar berangka tetap berurutan", daftarHuruf.butir[1]?.nomor === "2", daftarHuruf.butir[1]?.nomor);
cek(
  "soal kedua membawa pilihannya sendiri",
  daftarHuruf.butir[1]?.opsi.join("|") === "Enam|Tujuh",
  daftarHuruf.butir[1]?.opsi.join("|"),
);

judul("12) Kunci berupa satu huruf sendirian di bawah pilihan");

const hurufSendiri = await baca([
  par("PENALARAN UMUM"),
  par("1. Ibu kota Jawa Barat adalah…"),
  par("A. Bandung B. Jakarta C. Semarang"),
  par("A"),
  par("2. Ibu kota Jawa Tengah adalah…"),
  par("A. Bandung B. Jakarta C. Semarang"),
  par("C."),
]);
cek("dua soal terbaca", hurufSendiri.butir.length === 2, `${hurufSendiri.butir.length} butir`);
cek("kunci huruf telanjang terbaca", hurufSendiri.butir[0]?.kunci === "A", hurufSendiri.butir[0]?.kunci);
cek("huruf berbintik pun terbaca", hurufSendiri.butir[1]?.kunci === "C", hurufSendiri.butir[1]?.kunci);
cek(
  "pilihan terakhir tidak ikut menelan hurufnya",
  hurufSendiri.butir[0]?.opsi[2] === "Semarang",
  hurufSendiri.butir[0]?.opsi[2],
);
cek(
  "ada catatan supaya admin mencocokkan",
  hurufSendiri.catatan.some((c) => c.includes("satu huruf")),
);

judul("13) Daftar kunci di akhir naskah");

const daftarAkhir = await baca([
  par("PENALARAN UMUM"),
  par("1. Ibu kota Jawa Barat adalah…"),
  par("A. Bandung B. Jakarta C. Semarang"),
  par("2. Ibu kota Jawa Tengah adalah…"),
  par("A. Bandung B. Jakarta C. Semarang"),
  par("3. Sebutkan lambang unsur emas."),
  par("Answer:"),
  par("1. A 2. C"),
  par("3. Au"),
]);
cek("tiga soal terbaca, daftar kunci tidak jadi soal", daftarAkhir.butir.length === 3, `${daftarAkhir.butir.length} butir`);
cek("kunci nomor 1 terpasang", daftarAkhir.butir[0]?.kunci === "A", daftarAkhir.butir[0]?.kunci);
cek("kunci nomor 2 terpasang", daftarAkhir.butir[1]?.kunci === "C", daftarAkhir.butir[1]?.kunci);
cek("kunci berupa kata terpasang", daftarAkhir.butir[2]?.kunci === "Au", daftarAkhir.butir[2]?.kunci);
cek(
  "soal tanpa pilihan berkunci kata menjadi isian singkat",
  daftarAkhir.butir[2]?.tipe === "IS",
  daftarAkhir.butir[2]?.tipe,
);
cek(
  "soal berpilihan tidak ikut diubah jadi isian singkat",
  daftarAkhir.butir[0]?.tipe === "",
  daftarAkhir.butir[0]?.tipe,
);
cek(
  "ada catatan tentang daftar kunci",
  daftarAkhir.catatan.some((c) => c.includes("daftar kunci")),
);

judul("14) Subtes bawaan untuk naskah tanpa judul bagian");

const tanpaJudul = await bacaNomor(
  [par("1. Ibu kota Indonesia adalah…"), par("A. Bandung B. Jakarta"), par("Kunci: B")],
  "LBIND",
);
cek("subtes bawaan dipakai", tanpaJudul.butir[0]?.subtes === "LBIND", tanpaJudul.butir[0]?.subtes);

const judulMenang = await bacaNomor(
  [
    par("PENALARAN UMUM"),
    par("1. Ibu kota Indonesia adalah…"),
    par("A. Bandung B. Jakarta"),
    par("Kunci: B"),
  ],
  "LBIND",
);
cek(
  "judul di dalam naskah tetap menang atas subtes bawaan",
  judulMenang.butir[0]?.subtes === "PU",
  judulMenang.butir[0]?.subtes,
);

/* ------------------------------------------------------------------ */
/* 15. Kunci yang ditandai warna / stabilo                             */
/* ------------------------------------------------------------------ */
judul("15) Kunci ditandai warna pada pilihan");

const berwarna = await bacaNomor([
  par("PENALARAN UMUM"),
  parDaftar("Ibu kota Indonesia adalah…", 2),
  parDaftar("Bandung", 3),
  parDaftar([run("Jakarta", { merah: true })], 3),
  parDaftar("Surabaya", 3),
]);
cek("satu soal terbaca", berwarna.butir.length === 1, `${berwarna.butir.length} butir`);
cek("pilihan yang diwarnai jadi kunci", berwarna.butir[0]?.kunci === "B", berwarna.butir[0]?.kunci);
cek(
  "ada catatan supaya dicocokkan",
  berwarna.catatan.some((c) => c.includes("ditandai warna")),
);

const stabiloan = await bacaNomor([
  par("PENALARAN UMUM"),
  parDaftar("Ibu kota Jawa Tengah adalah…", 2),
  parDaftar("Bandung", 3),
  parDaftar("Jakarta", 3),
  parDaftar([run("Semarang", { stabilo: true })], 3),
]);
cek("stabilo juga terbaca sebagai tanda", stabiloan.butir[0]?.kunci === "C", stabiloan.butir[0]?.kunci);

const semuaWarna = await bacaNomor([
  par("PENALARAN UMUM"),
  parDaftar("Ibu kota Indonesia adalah…", 2),
  parDaftar([run("Bandung", { merah: true })], 3),
  parDaftar([run("Jakarta", { merah: true })], 3),
  parDaftar([run("Surabaya", { merah: true })], 3),
]);
cek(
  "naskah yang semua pilihannya berwarna tidak ditebak kuncinya",
  semuaWarna.butir[0]?.kunci === "",
  semuaWarna.butir[0]?.kunci,
);

judul("16) Kunci ditandai pada label pilihan berjajar");

const labelWarna = await baca([
  par("PENALARAN UMUM"),
  par("1. Ibu kota Jawa Barat adalah…"),
  par([
    run("(A) Jakarta. "),
    run("(B) ", { merah: true }),
    run("Bandung", { merah: true }),
    run(". (C) Semarang."),
  ]),
]);
cek("tiga pilihan terbaca", labelWarna.butir[0]?.opsi.length === 3, `${labelWarna.butir[0]?.opsi.length}`);
cek("label bertanda jadi kunci", labelWarna.butir[0]?.kunci === "B", labelWarna.butir[0]?.kunci);

judul("17) Jawaban isian singkat yang ditandai di ujung pertanyaan");

const isiSingkat = await baca([
  par("PENALARAN UMUM"),
  par([run("1. Lambang unsur emas adalah… "), run("Au", { merah: true })]),
  par("2. Sebutkan ibu kota Jawa Barat."),
  par("Answer: Bandung"),
]);
cek("dua soal terbaca", isiSingkat.butir.length === 2, `${isiSingkat.butir.length} butir`);
cek("jawaban bertanda jadi kunci", isiSingkat.butir[0]?.kunci === "Au", isiSingkat.butir[0]?.kunci);
cek(
  "jawaban itu DIBUANG dari pertanyaan, tidak bocor ke peserta",
  !isiSingkat.butir[0]?.pertanyaan.includes("Au"),
  isiSingkat.butir[0]?.pertanyaan,
);
cek("bertipe isian singkat", isiSingkat.butir[0]?.tipe === "IS", isiSingkat.butir[0]?.tipe);
cek('baris "Answer:" berbahasa Inggris terbaca', isiSingkat.butir[1]?.kunci === "Bandung", isiSingkat.butir[1]?.kunci);

/* ------------------------------------------------------------------ */
/* 18. Bacaan bertajuk "TEKS 1" / "Passage 1"                          */
/* ------------------------------------------------------------------ */
judul("18) Bacaan bertajuk berlaku sampai judul bacaan berikutnya");

const bertajuk = await baca([
  par("PENALARAN UMUM"),
  par("TEKS 1"),
  par("Bumi berbentuk bulat pepat dan berputar pada porosnya setiap hari."),
  par("1. Bumi berputar setiap…"),
  par("A. jam B. hari C. pekan"),
  par("Kunci: B"),
  par("2. Bentuk Bumi adalah…"),
  par("A. kubus B. bulat pepat C. datar"),
  par("Kunci: B"),
  par("TEKS 2"),
  par("Bulan mengelilingi Bumi sekali dalam kira-kira dua puluh delapan hari."),
  par("3. Bulan mengelilingi Bumi dalam…"),
  par("A. 7 hari B. 28 hari C. 365 hari"),
  par("Kunci: B"),
]);
cek("tiga soal terbaca", bertajuk.butir.length === 3, `${bertajuk.butir.length} butir`);
cek(
  "bacaan TEKS 1 menempel ke KEDUA soal di bawahnya",
  bertajuk.butir[0]?.stimulus.includes("bulat pepat") &&
    bertajuk.butir[1]?.stimulus.includes("bulat pepat"),
);
cek(
  "soal ketiga memakai TEKS 2, bukan TEKS 1",
  bertajuk.butir[2]?.stimulus.includes("Bulan") && !bertajuk.butir[2]?.stimulus.includes("pepat"),
);
cek(
  "judul TEKS 2 tidak tertelan jadi ekor pilihan soal 2",
  !bertajuk.butir[1]?.opsi.some((o) => o.includes("Bulan")),
  bertajuk.butir[1]?.opsi.join(" | "),
);

const duaTajuk = await baca([
  par("PENALARAN UMUM"),
  par("Passage 1"),
  par("The first passage argues that the sky is blue because of scattering."),
  par("Passage 2"),
  par("The second passage argues that sunsets are red for the very same reason."),
  par("1. Both passages discuss…"),
  par("A. gravity B. scattering of light C. rainfall"),
  par("Kunci: B"),
]);
cek(
  "dua bacaan bertajuk beruntun dibaca bersama",
  duaTajuk.butir[0]?.stimulus.includes("sky is blue") &&
    duaTajuk.butir[0]?.stimulus.includes("sunsets are red"),
  duaTajuk.butir[0]?.stimulus,
);

judul("19) Bacaan panjang tanpa judul sesudah pilihan");

const panjangTanpaJudul = await baca([
  par("PENALARAN UMUM"),
  par("1. Ibu kota Indonesia adalah…"),
  par("A. Bandung B. Jakarta C. Surabaya"),
  par("Kunci: B"),
  par(
    "Pada tahun 2000 seorang ahli saraf di Universitas College London ingin mengetahui pengaruh " +
      "hafalan peta jalan terhadap otak para sopir taksi kota itu, lalu memindai otak mereka satu " +
      "per satu selama bertahun-tahun untuk membandingkan ukurannya dengan orang kebanyakan.",
  ),
  par("2. Penelitian itu dilakukan terhadap…"),
  par("A. pilot B. sopir taksi C. masinis"),
  par("Kunci: B"),
]);
cek("dua soal terbaca", panjangTanpaJudul.butir.length === 2, `${panjangTanpaJudul.butir.length} butir`);
cek(
  "paragraf panjang TIDAK menempel ke pilihan soal 1",
  !panjangTanpaJudul.butir[0]?.opsi.some((o) => o.includes("ahli saraf")),
  panjangTanpaJudul.butir[0]?.opsi.join(" | "),
);
cek(
  "paragraf panjang itu jadi bacaan soal 2",
  panjangTanpaJudul.butir[1]?.stimulus.includes("ahli saraf"),
  panjangTanpaJudul.butir[1]?.stimulus?.slice(0, 60),
);
const terlipat = await baca([
  par("PENALARAN UMUM"),
  par("1. Ibu kota Indonesia adalah…"),
  par("A. Bandung B. Jakarta C. Surabaya"),
  par("yang terletak di Pulau Jawa"),
  par("Kunci: B"),
]);
cek(
  "pilihan pendek yang terlipat tetap tersambung ke pilihan terakhir",
  terlipat.butir[0]?.opsi[2] === "Surabaya yang terletak di Pulau Jawa",
  terlipat.butir[0]?.opsi[2],
);

/* ------------------------------------------------------------------ */
/* 20. Tanda tidak boleh berpindah baris                               */
/* ------------------------------------------------------------------ */
judul("20) Pilihan bertanda yang kata-katanya berulang di pilihan lain");

// Soal perbaikan kalimat: kelima pilihan menyusun ulang kata yang sama, dan
// guru mewarnai SELURUH kalimat pilihan yang benar. Kalau tanda dicocokkan
// dengan cara mencari teksnya, semua pilihan tampak bertanda.
const kataBerulang = await baca([
  par("PENALARAN UMUM"),
  par([
    run("1. Perbaikan kalimat yang tepat adalah…"),
    jeda(),
    run("(A) kapal sedang beroperasi di titik 17 mil"),
    jeda(),
    run("(B) beroperasi kapal sedang di titik 17 mil"),
    jeda(),
    run("(C) kapal beroperasi sedang di titik 17 mil", { merah: true }),
    jeda(),
    run("(D) di titik 17 mil kapal sedang beroperasi"),
  ]),
]);
const kb = kataBerulang.butir[0];
cek("empat pilihan terbaca", kb?.opsi.length === 4, `${kb?.opsi.length}`);
cek("kunci tepat pada pilihan yang diwarnai", kb?.kunci === "C", kb?.kunci);

const semuaSama = await baca([
  par("PENALARAN UMUM"),
  par([
    run("1. Perbaikan kalimat yang tepat adalah…"),
    jeda(),
    run("(A) kapal sedang beroperasi", { merah: true }),
    jeda(),
    run("(B) beroperasi kapal sedang", { merah: true }),
    jeda(),
    run("(C) sedang kapal beroperasi"),
  ]),
]);
cek(
  "dua pilihan bertanda: kuncinya tidak ditebak",
  semuaSama.butir[0]?.kunci === "",
  semuaSama.butir[0]?.kunci,
);

/* ------------------------------------------------------------------ */
/* 21. Naskah PK/PM guru: pernyataan bernomor, tabel Benar/Salah, dll  */
/* ------------------------------------------------------------------ */
judul("21) Naskah PK/PM guru — pernyataan bernomor, tabel Benar/Salah, (Jawaban: …), pemisah ribuan");

/**
 * numbering.xml yang meniru naskah PK/PM 4 September 2026: nomor soal satu
 * daftar (numId 10, dengan tingkat bersarang "(1)" dan "A."), pernyataan
 * berkurung yang mulai lagi dari (1) (11/17), pilihan berhuruf dengan
 * "restart" (15/18), butir bulat (13), gaya "List Number" (16), dan butir
 * bersarang "(1) dan (2)" yang tiap butirnya punya numId dan angka awal
 * sendiri (19-21) — persis yang dihasilkan Word saat guru menekan Tab.
 */
const NUMBERING_PKPM = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:abstractNum w:abstractNumId="20"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl><w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="(%2)"/></w:lvl><w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="upperLetter"/><w:lvlText w:val="%3."/></w:lvl></w:abstractNum>
<w:abstractNum w:abstractNumId="21"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="(%1)"/></w:lvl></w:abstractNum>
<w:abstractNum w:abstractNumId="22"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="upperLetter"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>
<w:abstractNum w:abstractNumId="23"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val=""/></w:lvl></w:abstractNum>
<w:abstractNum w:abstractNumId="25"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="upperLetter"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>
<w:abstractNum w:abstractNumId="26"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl><w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="(%2)"/></w:lvl></w:abstractNum>
<w:num w:numId="10"><w:abstractNumId w:val="20"/></w:num>
<w:num w:numId="11"><w:abstractNumId w:val="21"/></w:num>
<w:num w:numId="12"><w:abstractNumId w:val="22"/></w:num>
<w:num w:numId="13"><w:abstractNumId w:val="23"/></w:num>
<w:num w:numId="15"><w:abstractNumId w:val="22"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>
<w:num w:numId="16"><w:abstractNumId w:val="25"/></w:num>
<w:num w:numId="17"><w:abstractNumId w:val="21"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>
<w:num w:numId="18"><w:abstractNumId w:val="22"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>
<w:num w:numId="19"><w:abstractNumId w:val="26"/><w:lvlOverride w:ilvl="1"><w:startOverride w:val="1"/></w:lvlOverride></w:num>
<w:num w:numId="20"><w:abstractNumId w:val="26"/><w:lvlOverride w:ilvl="1"><w:startOverride w:val="4"/></w:lvlOverride></w:num>
<w:num w:numId="21"><w:abstractNumId w:val="26"/><w:lvlOverride w:ilvl="1"><w:startOverride w:val="2"/></w:lvlOverride></w:num>
</w:numbering>`;

/** styles.xml dengan gaya bawaan Word "List Number", yang penomorannya ada di gaya. */
const STYLES_PKPM = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="ListNumber"><w:name w:val="List Number"/><w:basedOn w:val="Normal"/><w:pPr><w:numPr><w:numId w:val="16"/></w:numPr></w:pPr></w:style>
</w:styles>`;

/** Paragraf bergaya tertentu, tanpa numPr sendiri. */
function parGaya(isi, gaya) {
  const runs = Array.isArray(isi) ? isi.join("") : run(isi);
  return `<w:p><w:pPr><w:pStyle w:val="${gaya}"/></w:pPr>${runs}</w:p>`;
}

async function buatDocxLengkap(isiBody, numbering, styles) {
  const zip = new JSZip();
  zip.file("word/numbering.xml", numbering);
  zip.file("word/styles.xml", styles);
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
<w:body>${isiBody.join("")}</w:body></w:document>`,
  );
  const buf = await zip.generateAsync({ type: "nodebuffer" });
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

const pkpm = await bacaNaskahDocx(
  await buatDocxLengkap(
    [
      parDaftar("Diketahui himpunan S. Manakah pernyataan berikut yang BENAR?", 10),
      parDaftar("Banyak anggota S adalah 7.", 11),
      parDaftar("Jumlah anggota S adalah 6.", 11),
      parDaftar("S memuat dua bilangan prima.", 11),
      parDaftar("(1) dan (2) SAJA", 12),
      parDaftar([run("(2) dan (3) SAJA", { merah: true })], 12),
      parDaftar("SEMUA BENAR", 12),
      parDaftar("Sebuah UMKM meracik jamu. Berapa gram gula yang dipakai?", 10),
      parDaftar("1.800", 15),
      parDaftar([run("2.400", { merah: true })], 15),
      parDaftar("3.000", 15),
      parDaftar("Suatu barisan didefinisikan dengan aturan:", 10),
      parDaftar("U(n) = n + 3, untuk n ganjil", 13),
      parDaftar("U(n) = 2n − 1, untuk n genap", 13),
      par("Nilai U(1) + U(2) adalah …"),
      parGaya("5", "ListNumber"),
      parGaya([run("6", { merah: true })], "ListNumber"),
      parGaya("7", "ListNumber"),
      parDaftar(
        [
          run("Diketahui KPK(a, b) = 180. Jika a = 30, nilai b adalah _____"),
          run(" (Jawaban: 36)", { merah: true, b: true }),
        ],
        10,
      ),
      par("TEKS-2 (Untuk soal nomor 5 sampai 6)"),
      par("Pak Dodi mengunggah video profil sekolah. Penayangannya berlipat dua tiap tiga hari."),
      parDaftar("Jumlah penayangan pada hari ke-12 adalah ... kali.", 10),
      parDaftar("16.000", 10, 2),
      parDaftar([run("32.000", { merah: true })], 10, 2),
      parDaftar("64.000", 10, 2),
      parDaftar("Tentukan benar atau salah setiap pernyataan berikut.", 10),
      tabel([
        ["Pernyataan", "Benar", "Salah"],
        ["Hari ke-3 penayangannya 2.000", "✓", ""],
        ["Hari ke-6 penayangannya 3.000", "", "✓"],
        ["Hari ke-9 penayangannya 8.000", "✓", ""],
      ]),
      parDaftar("Sebuah kebun menanam tiga jenis bibit. Tersedia informasi berikut.", 10),
      parDaftar("Banyak bibit jati = 3 × mahoni.", 17),
      parDaftar("Bibit sengon : jati = 2 : 5.", 17),
      par("Informasi yang cukup untuk menentukan total bibit adalah"),
      parDaftar("", 18),
      parDaftar("dan (2).", 19, 1),
      parDaftar("", 18),
      parDaftar([run("dan (5).", { merah: true })], 20, 1),
      parDaftar("", 18),
      parDaftar("dan (3).", 21, 1),
      parDaftar(
        [run("Keliling jalur manuver tersebut adalah … m."), run(" (Jawaban: 90 m)", { merah: true })],
        10,
      ),
    ],
    NUMBERING_PKPM,
    STYLES_PKPM,
  ),
  { kodePaket: "UJI", simpanGambar: false, subtesBawaan: "PK" },
);
const q = pkpm.butir;
cek("delapan soal terbaca, bukan belasan", q.length === 8, `${q.length} soal`);
cek(
  "nomor mengikuti angka yang digambar Word",
  q.map((x) => x.nomor).join(",") === "1,2,3,4,5,6,7,8",
  q.map((x) => x.nomor).join(","),
);
cek(
  "pernyataan (1)…(3) masuk badan soal 1 berikut labelnya",
  /\(1\) Banyak anggota S/.test(q[0]?.pertanyaan ?? "") && /\(3\) S memuat/.test(q[0]?.pertanyaan ?? ""),
  q[0]?.pertanyaan,
);
cek(
  "pilihan soal 1 tiga buah, kunci dari yang merah",
  q[0]?.opsi.length === 3 && q[0]?.kunci === "B",
  `${q[0]?.opsi.length} pilihan, kunci ${q[0]?.kunci}`,
);
cek(
  "pilihan 1.800 / 2.400 / 3.000 bukan soal baru",
  JSON.stringify(q[1]?.opsi) === JSON.stringify(["1.800", "2.400", "3.000"]),
  JSON.stringify(q[1]?.opsi),
);
cek("kunci soal 2 dari angka ribuan yang merah", q[1]?.kunci === "B", q[1]?.kunci);
cek(
  "butir bulat masuk badan soal 3 dengan urutan terjaga",
  /• U\(n\) = n \+ 3[\s\S]*Nilai U\(1\)/.test(q[2]?.pertanyaan ?? ""),
  q[2]?.pertanyaan,
);
cek("pilihan bergaya List Number terbaca", q[2]?.opsi.length === 3, `${q[2]?.opsi.length} pilihan`);
cek("angka merah satu karakter jadi kunci", q[2]?.kunci === "B", q[2]?.kunci);
cek(
  "(Jawaban: 36) jadi kunci isian singkat",
  q[3]?.tipe === "IS" && q[3]?.kunci === "36",
  `${q[3]?.tipe} ${q[3]?.kunci}`,
);
cek(
  "jawaban itu hilang dari pertanyaan walau dicetak tebal",
  !/Jawaban/i.test(q[3]?.pertanyaan ?? "") && /_____/.test(q[3]?.pertanyaan ?? ""),
  q[3]?.pertanyaan,
);
cek(
  "TEKS-2 (Untuk soal nomor 5 sampai 6) jadi bacaan soal 5 dan 6",
  /Pak Dodi/.test(q[4]?.stimulus ?? "") && /Pak Dodi/.test(q[5]?.stimulus ?? ""),
  `${q[4]?.stimulus.length} / ${q[5]?.stimulus.length} karakter`,
);
cek("bacaan itu tidak bocor ke soal 7", !q[6]?.stimulus, q[6]?.stimulus);
cek(
  "pilihan bersarang 16.000 terbaca dengan kuncinya",
  JSON.stringify(q[4]?.opsi) === JSON.stringify(["16.000", "32.000", "64.000"]) && q[4]?.kunci === "B",
  `${JSON.stringify(q[4]?.opsi)} kunci ${q[4]?.kunci}`,
);
cek(
  "tabel Pernyataan | Benar | Salah jadi soal BS",
  q[5]?.tipe === "BS" && q[5]?.opsi.length === 3,
  `${q[5]?.tipe} ${q[5]?.opsi.length} pernyataan`,
);
cek("kunci BS dari letak centang", q[5]?.kunci === "B,S,B", q[5]?.kunci);
cek(
  "pernyataan bibit masuk badan soal 7 dengan labelnya",
  /\(1\) Banyak bibit jati/.test(q[6]?.pertanyaan ?? "") && /\(2\) Bibit sengon/.test(q[6]?.pertanyaan ?? ""),
  q[6]?.pertanyaan,
);
cek(
  "pilihan 'A.' kosong diisi butir bersarang berlabel",
  JSON.stringify(q[6]?.opsi) === JSON.stringify(["(1) dan (2).", "(4) dan (5).", "(2) dan (3)."]),
  JSON.stringify(q[6]?.opsi),
);
cek("kunci soal 7 dari butir bersarang yang merah", q[6]?.kunci === "B", q[6]?.kunci);
cek(
  "(Jawaban: 90 m) disimpan tanpa satuan",
  q[7]?.tipe === "IS" && q[7]?.kunci === "90",
  `${q[7]?.tipe} ${q[7]?.kunci}`,
);
cek(
  "pembuangan satuan dilaporkan di catatan",
  pkpm.catatan.some((c) => /satuan "m"/.test(c)),
  pkpm.catatan.join(" | "),
);

/* ------------------------------------------------------------------ */
/* 12. Kalimat pengantar bacaan yang menempel di bawah pilihan          */
/* ------------------------------------------------------------------ */
judul("12) Pengantar bacaan di bawah pilihan terakhir (naskah PBM/PPU 4 Sep)");

// Bentuk aslinya: tidak ada baris kosong antara pilihan E soal 22 dan kalimat
// pengantar bacaan berikutnya, dan rentangnya ditulis dengan "dan", bukan
// "sampai". Dulu kalimat itu tertelan jadi ekor pilihan E.
const pbm = await baca([
  par("KEMAMPUAN MEMAHAMI BACAAN DAN MENULIS"),
  par("Perhatikan teks berikut untuk menjawab soal nomor 1 dan 2!"),
  par("(1) Pegunungan Bukit Barisan membentang sepanjang 1.650 kilometer. (2) Di dalamnya terdapat banyak taman nasional yang melindungi kekayaan alam Sumatra dari kerusakan."),
  par("1. Penulisan huruf kapital yang salah terdapat pada…"),
  par("A. kalimat (1). B. kalimat (3). C. kalimat (4). D. kalimat (5). E. kalimat (7)."),
  par("2. Kata sasaran pada kalimat (8) seharusnya…"),
  par("A. dihilangkan. B. dibiarkan saja. C. diganti kata destinasi. D. didahului kata tempat. E. diikuti kata lokasi."),
  par("Teks berikut digunakan untuk menjawab soal nomor 3 dan 4."),
  par("(1) Mata merupakan organ tubuh yang paling mudah rusak apabila tidak dijaga. (2) Satu di antara cara menjaganya adalah mengonsumsi wortel setiap hari."),
  par("3. Kata yang dapat dihilangkan pada teks tersebut adalah…"),
  par("A. dan. B. dalam. C. bagi. D. yang. E. apabila."),
  par("4. Kalimat inti pada kalimat (2) adalah…"),
  par("A. Wortel berguna. B. Mata mudah rusak. C. Mata dijaga. D. Wortel dikonsumsi. E. Organ tubuh rusak."),
]);
const bt = pbm.butir;

cek("empat soal terbaca utuh", bt.length === 4, `${bt.length} butir`);
cek(
  "pengantar tidak tertelan jadi ekor pilihan E",
  !bt.some((x) => x.opsi.some((o) => /digunakan untuk menjawab/i.test(o))),
  JSON.stringify(bt[1]?.opsi?.[4]),
);
cek(
  "pilihan E soal 2 tetap bersih",
  bt[1]?.opsi[4] === "diikuti kata lokasi.",
  JSON.stringify(bt[1]?.opsi?.[4]),
);
cek(
  'rentang bertuliskan "dan" menempel ke KEDUA soalnya',
  !!bt[0]?.stimulus && bt[0]?.stimulus === bt[1]?.stimulus,
  `${bt[0]?.stimulus?.length ?? 0} / ${bt[1]?.stimulus?.length ?? 0} karakter`,
);
cek(
  "bacaan kedua menempel ke soal 3 dan 4, bukan soal 2",
  /wortel/i.test(bt[2]?.stimulus ?? "") && bt[2]?.stimulus === bt[3]?.stimulus && !/wortel/i.test(bt[1]?.stimulus ?? ""),
  `${bt[2]?.stimulus?.length ?? 0} / ${bt[3]?.stimulus?.length ?? 0} karakter`,
);
cek(
  "kalimat pengantar tidak ikut masuk ke bacaan",
  !/untuk menjawab soal/i.test(bt[0]?.stimulus ?? ""),
  bt[0]?.stimulus?.slice(0, 60),
);

// Paragraf PANJANG yang kebetulan menyebut rentang nomor tetap bacaan, bukan
// pengantar yang boleh dibuang.
const panjang = await baca([
  par("PENALARAN UMUM"),
  par(
    "Panitia menyusun daftar hadir untuk soal nomor 1 sampai 5 pada lembar terpisah, sedangkan berkas cadangan disimpan di ruang sekretariat bersama arsip tahun sebelumnya yang jumlahnya terus bertambah setiap musim pendaftaran dibuka kembali oleh sekolah.",
  ),
  par("1. Berkas cadangan disimpan di mana?"),
  par("A. sekretariat B. kelas C. gudang D. aula E. perpustakaan"),
]);
cek(
  "paragraf panjang bercakupan tetap jadi bacaan",
  /Panitia menyusun daftar hadir/.test(panjang.butir[0]?.stimulus ?? ""),
  `${panjang.butir[0]?.stimulus?.length ?? 0} karakter`,
);

/* ------------------------------------------------------------------ */
judul(`Ringkasan: ${lulus} lulus, ${gagal} gagal.`);
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(gagal === 0 ? 0 : 1);
