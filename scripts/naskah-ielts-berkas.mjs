/**
 * Mencetak naskah IELTS di `scripts/naskah-ielts/*.txt` menjadi .docx dan .pdf.
 *
 * Gunanya dua. Pertama, pengelola mendapat naskah yang bisa DIBUKA DAN DISUNTING
 * di Word, bukan berkas teks mentah — yang berarti naskah berikutnya cukup
 * ditulis di atasnya. Kedua, dan ini yang membuat berkasnya layak dicetak dari
 * sini: keduanya menjadi bahan uji jalur impor .docx dan .pdf. Kalau naskah
 * hasil skrip ini bisa diunggah dan terbaca utuh, dua pembaca berkas yang
 * ditulis sendiri di `docx.ts` dan `pdf-teks.ts` memang bekerja.
 *
 * Penulisnya sengaja seadanya: satu jenis huruf, tanpa gaya, tanpa gambar.
 * Yang dituntut dari berkas ini hanya satu hal — barisnya utuh.
 *
 * Jalankan: npm run naskah:ielts
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

import JSZipNs from "jszip";

const JSZip = JSZipNs.default ?? JSZipNs;

const DIR = path.join(process.cwd(), "scripts", "naskah-ielts");

/* ==========================================================================
   DOCX
   ========================================================================== */

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

function amanXml(v) {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function tulisDocx(baris, tujuan) {
  const paragraf = baris
    .map((b) => {
      if (!b.trim()) return "<w:p/>";
      return `<w:p><w:r><w:t xml:space="preserve">${amanXml(b)}</w:t></w:r></w:p>`;
    })
    .join("");

  const dokumen = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${paragraf}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body>
</w:document>`;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", CONTENT_TYPES);
  zip.folder("_rels").file(".rels", RELS);
  zip.folder("word").file("document.xml", dokumen);
  const isi = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(tujuan, isi);
  return isi.length;
}

/* ==========================================================================
   PDF
   --------------------------------------------------------------------------
   Penulis PDF terkecil yang masih sah: satu huruf bawaan (Helvetica), teks
   WinAnsi, satu aliran isi per halaman. Tidak ada gambar, tabel, atau warna —
   naskah soal tidak membutuhkannya, dan tiap kemampuan tambahan berarti
   spesifikasi yang harus diikuti dengan benar.
   ========================================================================== */

/** Kebalikan peta WinAnsi 0x80-0x9F: huruf Unicode -> kode byte. */
const KE_WINANSI = new Map(
  Object.entries({
    "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85,
    "†": 0x86, "‡": 0x87, "ˆ": 0x88, "‰": 0x89, "Š": 0x8a,
    "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e, "‘": 0x91, "’": 0x92,
    "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
    "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c,
    "ž": 0x9e, "Ÿ": 0x9f,
  }),
);

/** Satu baris teks menjadi string PDF "( … )" berkode WinAnsi. */
function stringPdf(teks) {
  let hasil = "";
  for (const huruf of teks) {
    const kode = KE_WINANSI.get(huruf) ?? huruf.codePointAt(0);
    // Huruf di luar WinAnsi diganti tanda tanya daripada merusak berkasnya.
    const byte = kode > 0xff ? 0x3f : kode;
    const c = String.fromCharCode(byte);
    hasil += c === "(" || c === ")" || c === "\\" ? `\\${c}` : c;
  }
  return `(${hasil})`;
}

const LEBAR = 595.28;
const TINGGI = 841.89;
const TEPI = 42;
const UKURAN = 9;
const JARAK = 11.6;
const BARIS_PER_HALAMAN = Math.floor((TINGGI - TEPI * 2) / JARAK);
/** Perkiraan kasar; Helvetica 9pt memuat sekitar 100 huruf pada lebar ini. */
const HURUF_PER_BARIS = 100;

/** Memotong satu paragraf panjang menjadi baris selebar halaman. */
function bungkus(teks) {
  if (teks.length <= HURUF_PER_BARIS) return [teks];
  const hasil = [];
  let baris = "";
  for (const kata of teks.split(" ")) {
    if (baris && (baris + " " + kata).length > HURUF_PER_BARIS) {
      hasil.push(baris);
      baris = kata;
    } else {
      baris = baris ? `${baris} ${kata}` : kata;
    }
  }
  if (baris) hasil.push(baris);
  return hasil;
}

export function tulisPdf(baris, tujuan) {
  const semua = baris.flatMap((b) => (b.trim() ? bungkus(b) : [""]));

  const halaman = [];
  for (let i = 0; i < semua.length; i += BARIS_PER_HALAMAN) {
    halaman.push(semua.slice(i, i + BARIS_PER_HALAMAN));
  }
  if (halaman.length === 0) halaman.push([""]);

  const objek = []; // objek[n] = isi objek nomor n+1
  const tambah = (isi) => {
    objek.push(isi);
    return objek.length;
  };

  // Nomor dipesan lebih dulu supaya /Kids bisa menyebutnya sebelum ditulis.
  const nomorKatalog = 1;
  const nomorPohon = 2;
  const nomorHuruf = 3;
  objek.push("", "", "");
  objek[nomorHuruf - 1] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";

  const nomorHalaman = [];
  for (const isiHalaman of halaman) {
    const perintah = [
      "BT",
      `/F1 ${UKURAN} Tf`,
      `${JARAK} TL`,
      `${TEPI} ${TINGGI - TEPI} Td`,
      ...isiHalaman.flatMap((b) => (b ? [`${stringPdf(b)} Tj`, "T*"] : ["T*"])),
      "ET",
    ].join("\n");

    const aliran = zlib.deflateSync(Buffer.from(perintah, "latin1"));
    const nomorIsi = tambah({
      kamus: `<< /Length ${aliran.length} /Filter /FlateDecode >>`,
      aliran,
    });
    const nomor = tambah(
      `<< /Type /Page /Parent ${nomorPohon} 0 R /MediaBox [0 0 ${LEBAR.toFixed(2)} ${TINGGI.toFixed(2)}] ` +
        `/Resources << /Font << /F1 ${nomorHuruf} 0 R >> >> /Contents ${nomorIsi} 0 R >>`,
    );
    nomorHalaman.push(nomor);
  }

  objek[nomorKatalog - 1] = `<< /Type /Catalog /Pages ${nomorPohon} 0 R >>`;
  objek[nomorPohon - 1] =
    `<< /Type /Pages /Count ${nomorHalaman.length} /Kids [${nomorHalaman
      .map((n) => `${n} 0 R`)
      .join(" ")}] >>`;

  /* ---- Merangkai berkas ---- */
  const potongan = [Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "latin1")];
  let panjang = potongan[0].length;
  const geser = [];

  objek.forEach((o, i) => {
    geser[i] = panjang;
    const bagian = [Buffer.from(`${i + 1} 0 obj\n`, "latin1")];
    if (typeof o === "string") {
      bagian.push(Buffer.from(`${o}\nendobj\n`, "latin1"));
    } else {
      bagian.push(Buffer.from(`${o.kamus}\nstream\n`, "latin1"));
      bagian.push(o.aliran);
      bagian.push(Buffer.from("\nendstream\nendobj\n", "latin1"));
    }
    for (const b of bagian) {
      potongan.push(b);
      panjang += b.length;
    }
  });

  const awalXref = panjang;
  let xref = `xref\n0 ${objek.length + 1}\n0000000000 65535 f \n`;
  for (let i = 0; i < objek.length; i++) {
    xref += `${String(geser[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objek.length + 1} /Root ${nomorKatalog} 0 R >>\nstartxref\n${awalXref}\n%%EOF\n`;
  potongan.push(Buffer.from(xref, "latin1"));

  const isi = Buffer.concat(potongan);
  fs.writeFileSync(tujuan, isi);
  return isi.length;
}

/* ==========================================================================
   JALAN
   --------------------------------------------------------------------------
   Hanya berjalan bila berkas ini dipanggil langsung. Dipanggil sebagai modul
   — yang dilakukan `ielts-naskah-check.mjs` untuk menyusun .docx dan .pdf uji
   — ia cukup memulangkan kedua penulisnya tanpa menyentuh berkas apa pun.
   ========================================================================== */

if (import.meta.filename === process.argv[1]) await jalankan();

async function jalankan() {
const berkas = fs
  .readdirSync(DIR)
  .filter((b) => b.endsWith(".txt"))
  .sort();

if (berkas.length === 0) {
  console.error(`Tidak ada naskah .txt di ${DIR}`);
  process.exit(1);
}

for (const nama of berkas) {
  const baris = fs.readFileSync(path.join(DIR, nama), "utf8").replace(/\r\n?/g, "\n").split("\n");
  const dasar = nama.replace(/\.txt$/, "");
  const ukuranDocx = await tulisDocx(baris, path.join(DIR, `${dasar}.docx`));
  const ukuranPdf = tulisPdf(baris, path.join(DIR, `${dasar}.pdf`));
  console.log(
    `${dasar.padEnd(14)} ${String(baris.length).padStart(4)} baris  ->  ` +
      `.docx ${(ukuranDocx / 1024).toFixed(1)} KB, .pdf ${(ukuranPdf / 1024).toFixed(1)} KB`,
  );
}

console.log(`\nBerkas ada di ${DIR}. Keduanya bisa langsung diunggah lewat Admin → IELTS → paket → subtes → Impor naskah.`);

}