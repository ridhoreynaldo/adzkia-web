/**
 * Pengujian PAPAN BAND, LEMBAR HASIL, dan HITUNG ULANG IELTS — beserta pintu
 * masuk pengelola IELTS. Tanpa framework tes.
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/ielts-peringkat-check.mjs
 *
 * Enam janji yang dijaga di sini, semuanya lahir dari keputusan yang mudah
 * rusak diam-diam kalau tidak ada yang menjaganya:
 *
 *   1. PAPAN DIURUTKAN DARI BAND TERTINGGI, dan pemisahnya tetap sama tiap
 *      kali dibaca — dua peserta berband sama tidak boleh bertukar tempat
 *      setiap halaman dimuat ulang.
 *   2. PESERTA YANG DIGUGURKAN TIDAK MASUK PAPAN. Nilai ujian yang dihentikan
 *      bukan nilai, dan menempatkannya di papan yang dibaca satu angkatan sama
 *      saja mengumumkan pelanggaran seorang anak.
 *   3. BAND SEMENTARA tetap punya posisi, tetapi ditandai — bukan
 *      disembunyikan, bukan pula dianggap final.
 *   4. LEMBAR .xlsx memuat kolom band tiap subtes plus overall, menulis "—"
 *      (bukan 0) untuk subtes yang belum dinilai, dan TIDAK memuat satu pun
 *      jejak pelanggaran.
 *   5. HITUNG ULANG menutup subtes yang tenggatnya lewat dan menuntaskan
 *      pengerjaan yang menggantung — termasuk pada paket yang sengaja hanya
 *      berisi dua subtes.
 *   6. PINTU MASUK /IELTS-Globe-Adzkia benar-benar ada, tanpa logo ADZKIA
 *      SMART, dan pengelola berlingkup IELTS ditolak `requireAdmin()`.
 *
 * Basis datanya dibuat sendiri di folder sementara, jadi pemeriksa ini tidak
 * pernah menyentuh data sungguhan.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ExcelJS from "exceljs";

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
const TMP = path.join(AKAR, ".tmp", "cek", "ielts-peringkat");

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
process.env.ADZKIA_DB_PATH = path.join(TMP, "cek.db");

const rapikan = (sumber) =>
  sumber
    .replace(/^import "server-only";\s*$/m, "")
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

const muat = (nama) => import(pathToFileURL(path.join(TMP, `${nama}.ts`)).href);
const { run, one } = await muat("db");
const P = await muat("ielts-peringkat");
const L = await muat("laporan-ielts");
const I = await muat("ielts");

let gagal = 0;
function periksa(nama, syarat, tambahan = "") {
  if (syarat) {
    console.log("  ✓ " + nama);
  } else {
    gagal++;
    console.log("  ✗ " + nama + (tambahan ? " — " + tambahan : ""));
  }
}

/* ==================================================================== */
/* Penyiapan: satu paket dua subtes (Listening 4 butir + Reading 3),     */
/* empat peserta — tiga sah, satu digugurkan.                            */
/* ==================================================================== */

const SISWA = [
  { id: 1, nama: "Aisyah Nur Ramadhani", kelas: "XII IPA 1" },
  { id: 2, nama: "Bagus Prasetyo", kelas: "XII IPA 2" },
  { id: 3, nama: "Dinda Ayu Lestari", kelas: "XII IPS 1" },
  { id: 9, nama: "Peserta Digugurkan", kelas: "XII IPA 1" },
];
for (const s of SISWA) {
  run(
    "INSERT INTO users (id, nama, email, password_hash, role, kelas) VALUES (?, ?, ?, 'x', 'siswa', ?)",
    s.id,
    s.nama,
    `siswa${s.id}@cek.local`,
    s.kelas,
  );
}

const paketId = I.buatPaket({ kode: "IELTS-CEK", nama: "IELTS Uji Papan Band" });
// Paket harus terbit sebelum ada yang bisa mengerjakannya.
I.setStatusPaket(paketId, "published");

// Butir: Listening 1-4 dan Reading 1-3, seluruhnya isian singkat.
const soalId = {};
for (const [subtes, jumlah] of [
  ["LISTENING", 4],
  ["READING", 3],
]) {
  const seksi = I.pastikanSeksi(paketId, subtes);
  for (let n = 1; n <= jumlah; n++) {
    soalId[`${subtes}${n}`] = I.simpanSoal(paketId, subtes, {
      nomor: n,
      tipe: "IS",
      pertanyaan: `Pertanyaan ${subtes} ${n}`,
      opsi: [],
      kunci: `jawab${n}`,
      seksiId: seksi[0].id,
    });
  }
}

/**
 * Satu pengerjaan lengkap: dibuka, dijawab, lalu subtesnya ditutup.
 *
 * `benar` menentukan berapa butir tiap subtes yang dijawab benar. Sisanya
 * dijawab salah, supaya kolom "kosong" tidak ikut berubah dan angka benarnya
 * bisa dibandingkan apa adanya.
 *
 * `tutupAkhir: false` meninggalkan subtes TERAKHIR terbuka — itulah bentuk
 * pengerjaan menggantung yang dibereskan Hitung Ulang. Subtes sebelumnya tetap
 * ditutup, sebab subtes berikutnya memang tidak bisa dibuka sebelum yang
 * sebelumnya tuntas.
 */
function kerjakan(userId, benarL, benarR, { tutupAkhir = true } = {}) {
  const p = I.setujuiRules(userId, paketId);
  const urutan = [
    ["LISTENING", 4, benarL],
    ["READING", 3, benarR],
  ];
  urutan.forEach(([subtes, jumlah, benar], i) => {
    I.bukaSubtes(I.pengerjaanById(p.id), subtes);
    for (let n = 1; n <= jumlah; n++) {
      run(
        `INSERT INTO ielts_jawaban (pengerjaan_id, soal_id, jawaban)
         VALUES (?, ?, ?)
         ON CONFLICT (pengerjaan_id, soal_id) DO UPDATE SET jawaban = excluded.jawaban`,
        p.id,
        soalId[`${subtes}${n}`],
        n <= benar ? `jawab${n}` : "salah",
      );
    }
    const terakhir = i === urutan.length - 1;
    if (!terakhir || tutupAkhir) I.selesaikanSubtes(I.pengerjaanById(p.id), subtes);
  });
  return I.pengerjaanById(p.id);
}

kerjakan(1, 4, 3); // paling banyak benar
kerjakan(2, 2, 1);
kerjakan(3, 0, 0);
const pGugur = kerjakan(9, 4, 3);
run("UPDATE ielts_pengerjaan SET status = 'gugur' WHERE id = ?", pGugur.id);

/* ==================================================================== */
console.log("\nPAPAN BAND");
/* ==================================================================== */

const papan = P.peringkatIelts(paketId);

periksa("papan hanya memuat peserta yang tidak digugurkan", papan.length === 3, `dapat ${papan.length}`);
periksa(
  "peserta yang digugurkan TIDAK ada di papan",
  !papan.some((r) => r.userId === 9),
);
periksa(
  "diurutkan dari band tertinggi ke terendah",
  papan.every((r, i) => i === 0 || papan[i - 1].overall >= r.overall),
  papan.map((r) => r.overall).join(" > "),
);
periksa("peringkat 1 adalah yang paling banyak benar", papan[0].userId === 1);
periksa(
  "nomor peringkat berurut mulai dari 1",
  papan.every((r, i) => r.peringkat === i + 1),
);
periksa(
  "kelas peserta ikut dibawa",
  papan[0].kelas === "XII IPA 1",
  `dapat ${papan[0].kelas}`,
);
periksa(
  "band tiap subtes tersedia terpisah",
  typeof papan[0].band.LISTENING === "number" && typeof papan[0].band.READING === "number",
);
periksa(
  "subtes yang TIDAK diujikan bernilai null, bukan nol",
  papan[0].band.WRITING === null && papan[0].band.SPEAKING === null,
);
periksa(
  "paket dua subtes menghasilkan band FINAL, bukan sementara",
  papan.every((r) => r.final),
);

// Urutan harus tetap sama saat papan dibaca ulang — inilah gunanya pemisah.
const papanUlang = P.peringkatIelts(paketId);
periksa(
  "urutan tetap sama saat dibaca ulang",
  papan.map((r) => r.pengerjaanId).join(",") === papanUlang.map((r) => r.pengerjaanId).join(","),
);

const stat = P.statistikIelts(papan);
periksa("statistik menghitung tiga peserta", stat.jumlahPeserta === 3);
periksa("ketiganya final", stat.jumlahFinal === 3);
periksa(
  "band tertinggi = band peringkat 1",
  stat.tertinggi === papan[0].overall,
  `${stat.tertinggi} vs ${papan[0].overall}`,
);
periksa(
  "band terendah = band peringkat terakhir",
  stat.terendah === papan[papan.length - 1].overall,
);

/* ==================================================================== */
console.log("\nBAND SEMENTARA (menunggu guru)");
/* ==================================================================== */

// Paket kedua: Listening + Writing. Writing menunggu guru, jadi band
// keseluruhannya harus ditandai SEMENTARA tetapi tetap punya posisi.
const paket2 = I.buatPaket({ kode: "IELTS-CEK2", nama: "IELTS Dua Jenis Penilaian" });
I.setStatusPaket(paket2, "published");
const seksiL2 = I.pastikanSeksi(paket2, "LISTENING");
const seksiW2 = I.pastikanSeksi(paket2, "WRITING");
const soalL2 = I.simpanSoal(paket2, "LISTENING", {
  nomor: 1,
  tipe: "IS",
  pertanyaan: "Listening 1",
  opsi: [],
  kunci: "benar",
  seksiId: seksiL2[0].id,
});
I.simpanSoal(paket2, "WRITING", {
  nomor: 1,
  tipe: "ESAI",
  pertanyaan: "Task 1",
  opsi: [],
  kunci: "",
  seksiId: seksiW2[0].id,
});

const q1 = I.setujuiRules(1, paket2);
I.bukaSubtes(I.pengerjaanById(q1.id), "LISTENING");
run(
  "INSERT INTO ielts_jawaban (pengerjaan_id, soal_id, jawaban) VALUES (?, ?, 'benar')",
  q1.id,
  soalL2,
);
I.selesaikanSubtes(I.pengerjaanById(q1.id), "LISTENING");

const papan2 = P.peringkatIelts(paket2);
periksa("peserta berband sementara tetap masuk papan", papan2.length === 1);
periksa("bandnya ditandai belum final", papan2[0].final === false);
periksa(
  "Writing disebut sebagai yang ditunggu",
  papan2[0].menunggu.includes("Writing"),
  papan2[0].menunggu.join(", "),
);

/* ==================================================================== */
console.log("\nLEMBAR HASIL .xlsx");
/* ==================================================================== */

const paketRow = I.paketById(paketId);
const buf = await L.bukuHasilIelts(paketRow, papan);
const wb = new ExcelJS.Workbook();
await wb.xlsx.load(buf);
const ws = wb.worksheets[0];

const teksLembar = [];
ws.eachRow((baris) => {
  baris.eachCell({ includeEmpty: true }, (sel) => {
    if (sel.value !== null && sel.value !== undefined) teksLembar.push(String(sel.value));
  });
});
const semuaTeks = teksLembar.join(" | ");

periksa("hanya satu sheet", wb.worksheets.length === 1, `dapat ${wb.worksheets.length}`);
periksa("judulnya menyebut IELTS dan nama sekolah", /HASIL IELTS .*ADZKIA/i.test(semuaTeks));
periksa("kode paket tercetak", semuaTeks.includes("IELTS-CEK"));
for (const kolom of ["Listening", "Reading", "Writing", "Speaking"]) {
  periksa(`ada kolom ${kolom}`, semuaTeks.includes(kolom));
}
periksa("ada kolom Overall Band", /Overall/i.test(semuaTeks));
periksa("ada kolom Kelas", semuaTeks.includes("Kelas"));
periksa("nama peserta peringkat 1 tercetak", semuaTeks.includes(papan[0].nama));
periksa(
  "peserta yang digugurkan tidak ikut tercetak",
  !semuaTeks.includes("Peserta Digugurkan"),
);
periksa(
  "TIDAK ada satu pun kata pelanggaran di lembar ini",
  !/pelanggaran|gugur|curang|diskualifikasi/i.test(semuaTeks),
);
periksa(
  "subtes yang tidak diujikan ditulis tanda hubung, bukan 0",
  semuaTeks.includes("—"),
);

// Lembar paket kedua: subtes yang menunggu guru harus dijelaskan, bukan dinolkan.
const wb2 = new ExcelJS.Workbook();
await wb2.xlsx.load(await L.bukuHasilIelts(I.paketById(paket2), papan2));
const teks2 = [];
wb2.worksheets[0].eachRow((baris) => {
  baris.eachCell({ includeEmpty: true }, (sel) => {
    if (sel.value !== null && sel.value !== undefined) teks2.push(String(sel.value));
  });
});
periksa(
  "band sementara diterangkan di kolom keterangan",
  /sementara/i.test(teks2.join(" | ")),
);

periksa(
  "nama berkasnya memuat kode paket",
  L.namaBerkasHasilIelts(paketRow) === "HASIL-IELTS-IELTS-CEK.xlsx",
  L.namaBerkasHasilIelts(paketRow),
);

/* ==================================================================== */
console.log("\nHITUNG ULANG NILAI");
/* ==================================================================== */

periksa(
  "paket dua subtes: subtes yang diujikan dikenali hanya dua",
  P.subtesDiujikan(paketId).join(",") === "LISTENING,READING",
  P.subtesDiujikan(paketId).join(","),
);

// Peserta keempat: subtesnya DIBUKA tetapi tidak pernah ditutup, dan
// tenggatnya dimundurkan supaya benar-benar sudah lewat.
run(
  "INSERT INTO users (id, nama, email, password_hash, role, kelas) VALUES (7, 'Menggantung Sendiri', 'gantung@cek.local', 'x', 'siswa', 'XII IPA 3')",
);
const pGantung = kerjakan(7, 3, 2, { tutupAkhir: false });
// Tenggat Reading dimundurkan supaya benar-benar sudah lewat, persis seperti
// peserta yang menutup laptopnya di tengah subtes dan tidak pernah kembali.
run(
  "UPDATE ielts_subtes SET deadline_at = datetime('now','-2 hours') WHERE pengerjaan_id = ? AND selesai_at IS NULL",
  pGantung.id,
);

const sebelum = I.pengerjaanById(pGantung.id);
periksa("sebelum dihitung ulang statusnya masih berjalan", sebelum.status === "ongoing");

const hasil = P.hitungUlangIelts(paketId);
periksa("melaporkan berapa pengerjaan diperiksa", hasil.diperiksa >= 4, String(hasil.diperiksa));
periksa(
  "menutup subtes yang tenggatnya sudah lewat",
  hasil.subtesDitutup === 1,
  String(hasil.subtesDitutup),
);
periksa("menuntaskan pengerjaan yang menggantung", hasil.dituntaskan === 1, String(hasil.dituntaskan));

const sesudah = I.pengerjaanById(pGantung.id);
periksa("statusnya menjadi selesai", sesudah.status === "finished", sesudah.status);
periksa("waktu selesainya terisi", Boolean(sesudah.finished_at));

periksa(
  "pengerjaan yang DIGUGURKAN tidak ikut dituntaskan",
  one("SELECT status FROM ielts_pengerjaan WHERE id = ?", pGugur.id).status === "gugur",
);

// Dijalankan dua kali tidak boleh mengubah apa pun lagi.
const ulang = P.hitungUlangIelts(paketId);
periksa("aman diulang: tidak ada lagi subtes yang perlu ditutup", ulang.subtesDitutup === 0);
periksa("aman diulang: tidak ada lagi yang perlu dituntaskan", ulang.dituntaskan === 0);
periksa("aman diulang: tidak ada band yang berubah", ulang.bandBerubah === 0);

periksa(
  "yang tadinya menggantung kini masuk papan",
  P.peringkatIelts(paketId).some((r) => r.userId === 7),
);

/* ==================================================================== */
console.log("\nPINTU MASUK & LINGKUP PENGELOLA IELTS");
/* ==================================================================== */

const baca = (...bagian) => fs.readFileSync(path.join(AKAR, ...bagian), "utf8");

const konstanta = baca("src", "lib", "admin-konstanta.ts");

// PINTU IELTS SUDAH DIHAPUS (11 September 2026, permintaan pengelola).
//
// Pemeriksaan di bawah dibalik arahnya: dulu ia menjaga pintu itu ADA, kini ia
// menjaga pintu itu TIDAK KEMBALI. Sebabnya, pintu kedua menuju panel yang
// sama hanya menambah alamat yang harus diingat tanpa menambah penjagaan —
// yang menjaga panel tetap `requireAdminIelts()` beserta kata sandinya.
periksa(
  "konstanta RUTE_LOGIN_IELTS sudah tidak ada",
  !/export const RUTE_LOGIN_IELTS/.test(konstanta),
);
periksa(
  "halaman /IELTS-Globe-Adzkia sudah tidak ada",
  !fs.existsSync(path.join(AKAR, "src", "app", "IELTS-Globe-Adzkia")),
);
periksa(
  "panel IELTS tetap punya alamatnya sendiri",
  /RUTE_PANEL_IELTS\s*=\s*"\/admin\/ielts"/.test(konstanta),
);

// Tidak boleh ada sisa tautan ke alamat yang sudah mati — tautan semacam itu
// memulangkan 404 kepada pengelola yang menekannya.
let penaut = [];
const TAUTAN = [
  /href=\{?["'{]?\/IELTS-Globe-Adzkia/,
  /href=\{RUTE_LOGIN_IELTS\}/,
  /(push|replace)\(\s*(RUTE_LOGIN_IELTS|["'`]\/IELTS-Globe-Adzkia)/,
];
const telusur = (dir) => {
  for (const isi of fs.readdirSync(dir, { withFileTypes: true })) {
    const jalan = path.join(dir, isi.name);
    if (isi.isDirectory()) {
      telusur(jalan);
    } else if (/\.tsx?$/.test(isi.name)) {
      const teks = fs.readFileSync(jalan, "utf8");
      if (!jalan.includes("__checks__") && TAUTAN.some((r) => r.test(teks))) {
        penaut.push(path.relative(AKAR, jalan));
      }
    }
  }
};
telusur(path.join(AKAR, "src"));
periksa(
  "tidak ada sisa tautan ke pintu IELTS yang sudah dihapus",
  penaut.length === 0,
  penaut.join(", "),
);

// Yang menggantikannya: SATU pintu untuk semua pengelola, dan lingkup akun
// yang menentukan tujuannya.
periksa(
  "pengelola IELTS yang belum masuk dilempar ke pintu pengelola yang biasa",
  /redirect\(RUTE_LOGIN_ADMIN\)/.test(baca("src", "lib", "auth.ts")),
);

const auth = baca("src", "lib", "auth.ts");
periksa(
  "requireAdmin() menolak pengelola berlingkup IELTS",
  /requireAdmin\(\)[\s\S]{0,400}lingkup === "ielts"[\s\S]{0,80}redirect\(RUTE_PANEL_IELTS\)/.test(
    auth,
  ),
);
periksa("ada requireAdminIelts() yang menerima keduanya", /export async function requireAdminIelts/.test(auth));
periksa(
  "lingkup dibaca dari basis data, bukan dari cookie",
  /SELECT id, nama, email, role, nisn, kelas, lingkup FROM users/.test(auth),
);

const tataLetak = baca("src", "app", "admin", "layout.tsx");
periksa(
  "tata letak panel memakai requireAdminIelts",
  /requireAdminIelts\(\)/.test(tataLetak),
);
for (const halaman of [
  ["src", "app", "admin", "live", "page.tsx"],
  ["src", "app", "admin", "pelanggaran", "page.tsx"],
]) {
  periksa(
    `${halaman.slice(2).join("/")} menjaga dirinya sendiri dengan requireAdmin`,
    /await requireAdmin\(\)/.test(baca(...halaman)),
  );
}

const skrip = baca("scripts", "akun-admin.mjs");
for (const surel of ["admin1@globeadzkia.com", "admin2@globeadzkia.com"]) {
  periksa(`akun ${surel} terdaftar di skrip pengelola`, skrip.includes(surel));
}
periksa(
  "keduanya berlingkup ielts",
  (skrip.match(/lingkup: "ielts"/g) ?? []).length === 2,
);

/* ==================================================================== */
console.log("\nHALAMAN BARU DI PANEL");
/* ==================================================================== */

for (const [nama, ...jalan] of [
  ["Pratinjau soal", "src", "app", "admin", "ielts", "[id]", "pratinjau", "page.tsx"],
  ["Pratinjau ujian", "src", "app", "admin", "ielts", "[id]", "simulasi", "page.tsx"],
  ["Peringkat skor band", "src", "app", "admin", "ielts", "[id]", "peringkat", "page.tsx"],
  ["Unduh hasil", "src", "app", "api", "admin", "ielts", "hasil", "[id]", "route.ts"],
  ["Papan band siswa", "src", "app", "language", "ielts", "peringkat", "page.tsx"],
]) {
  periksa(`halaman ${nama} ada`, fs.existsSync(path.join(AKAR, ...jalan)));
}

const daftar = baca("src", "app", "admin", "ielts", "page.tsx");
for (const [nama, pola] of [
  ["Edit paket soal", /Edit paket soal/],
  ["Kelola soal", /Kelola soal/],
  ["Pratinjau soal", /Pratinjau soal/],
  ["Pratinjau ujian", /Pratinjau ujian/],
  ["Unduh hasil IELTS", /Unduh hasil IELTS/],
  ["Peringkat skor band", /Peringkat skor band/],
  ["Hitung ulang nilai", /Hitung ulang nilai/],
]) {
  periksa(`daftar paket IELTS memasang "${nama}"`, pola.test(daftar));
}

// Pratinjau ujian tidak boleh menyentuh apa pun milik peserta.
const ruang = baca("src", "components", "language", "RuangIelts.tsx");
periksa(
  "ruang ujian punya bendera pratinjau",
  /pratinjau = false/.test(ruang),
);
periksa(
  "pratinjau tidak menyimpan jawaban ke server",
  /antre\.current\.delete\(soalId\);[\s\S]{0,600}if \(pratinjau\) return;[\s\S]{0,120}simpanJawabanAction/.test(
    ruang,
  ),
);
periksa(
  "pratinjau tidak berpura-pura sudah menyimpan",
  !/if \(pratinjau\) \{\s*setStatus\("tersimpan"\)/.test(ruang),
);
const penjaga = baca("src", "components", "language", "usePenjagaIelts.ts");
periksa(
  "pratinjau tidak pernah boleh melapor pelanggaran",
  /!pratinjau && dipantau\.current/.test(penjaga),
);
periksa("pratinjau tidak berdenyut", /if \(pratinjau\) return;/.test(penjaga));

/* ==================================================================== */

// Folder sementara TIDAK dihapus di sini: Windows masih memegang berkas SQLite
// yang terbuka. Yang membersihkannya adalah rmSync di awal berkas ini.

if (gagal > 0) {
  console.log(`\n${gagal} PEMERIKSAAN GAGAL.\n`);
  process.exit(1);
}
console.log("\nSemua pemeriksaan papan band IELTS lulus.\n");
