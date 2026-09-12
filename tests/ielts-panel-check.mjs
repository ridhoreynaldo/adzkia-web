/**
 * Pengujian TIGA TAMBAHAN PANEL IELTS 11 September 2026 — Skor Live, Rekap per
 * Peserta, dan Lembar Pembahasan — beserta keseragaman penjagaan antara ruang
 * ujian IELTS dan ruang ujian TryOut UTBK-SNBT / SKD.
 *
 * Cara menjalankan (dari akar proyek):
 *     node src/lib/__checks__/ielts-panel-check.mjs
 *
 * Permintaan pengelola yang melahirkannya:
 *
 *   "sistem keamanan dan pengerjaan soal pembahasan pada ADZKIA SMART, samakan
 *    aja dengan sistem keamanan fitur TRYOUT UTBK-SNBT … kemudian untuk fitur
 *    SKOR LIVE, KEAMANAN UJIAN, REKAP PER PESERTA … masukkan juga fitur nya ke
 *    IELTS."
 *
 * LIMA JANJI yang dijaga di sini, seluruhnya mudah rusak diam-diam:
 *
 *   1. PEMBAHASAN TIDAK PERNAH MEMBOCORKAN SUBTES YANG MASIH BERJALAN. Ini
 *      yang paling berbahaya: kunci Reading yang terbuka selagi Reading masih
 *      dikerjakan membatalkan ujiannya sama sekali.
 *   2. TUAS `tampil_pembahasan` benar-benar menahan, dan ujian yang DIHENTIKAN
 *      tidak berhak atas lembar itu — sejalan dengan `/hasil/<attempt>` yang
 *      memulangkan layar GAGAL.
 *   3. SKOR LIVE membedakan timer yang BENAR-BENAR berjalan dari pengerjaan
 *      yang sekadar berstatus `ongoing`, dan tidak menilai yang dihentikan.
 *   4. REKAP PER PESERTA membawa seluruh catatan keamanan — termasuk ronde
 *      sebelumnya — beserta jumlah kepergian yang dibandingkan anggaran.
 *   5. PENJAGAAN SERAGAM: kedua ruang ujian memakai satu daftar jenis
 *      pelanggaran, satu berkas ambang, dan satu penolong papan ketik iPad —
 *      bukan salinan yang bisa berjalan sendiri-sendiri.
 *
 * Basis datanya dibuat di folder sementara; data sungguhan tidak pernah
 * disentuh.
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
const TMP = path.join(AKAR, ".tmp", "cek", "ielts-panel");

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
const I = await muat("ielts");
const LIVE = await muat("ielts-live");
const REKAP = await muat("ielts-rekap");
const BAHAS = await muat("ielts-pembahasan");
const JAGA = await muat("ielts-penjagaan");
const DENYUT = await muat("denyut");

let gagal = 0;
function periksa(nama, syarat, tambahan = "") {
  if (syarat) {
    console.log("  ✓ " + nama);
  } else {
    gagal++;
    console.log("  ✗ " + nama + (tambahan ? " — " + tambahan : ""));
  }
}

const baca = (...bagian) => fs.readFileSync(path.join(AKAR, ...bagian), "utf8");

/* ==================================================================== */
/* Penyiapan                                                            */
/* ==================================================================== */

const SISWA = [
  { id: 1, nama: "Aisyah Nur Ramadhani", kelas: "XII IPA 1", nisn: "0071" },
  { id: 2, nama: "Bagus Prasetyo", kelas: "XII IPA 2", nisn: "0072" },
  { id: 3, nama: "Dinda Ayu Lestari", kelas: "XII IPS 1", nisn: "0073" },
];
for (const s of SISWA) {
  run(
    "INSERT INTO users (id, nama, email, password_hash, role, kelas, nisn) VALUES (?, ?, ?, 'x', 'siswa', ?, ?)",
    s.id,
    s.nama,
    `siswa${s.id}@cek.local`,
    s.kelas,
    s.nisn,
  );
}

const paketId = I.buatPaket({ kode: "IELTS-PANEL", nama: "IELTS Uji Panel" });
I.setStatusPaket(paketId, "published");

// Listening 3 butir + Reading 3 butir; keduanya isian singkat.
const soalId = {};
const seksiId = {};
for (const [subtes, jumlah] of [
  ["LISTENING", 3],
  ["READING", 3],
]) {
  const seksi = I.pastikanSeksi(paketId, subtes);
  seksiId[subtes] = seksi[0].id;
  for (let n = 1; n <= jumlah; n++) {
    soalId[`${subtes}${n}`] = I.simpanSoal(paketId, subtes, {
      nomor: n,
      tipe: "IS",
      pertanyaan: `Pertanyaan ${subtes} ${n}`,
      opsi: [],
      kunci: `${subtes.toLowerCase()}-kunci${n}`,
      catatan: n === 1 ? `Penjelasan ${subtes} nomor 1.` : undefined,
      seksiId: seksi[0].id,
    });
  }
}
// Naskah & bacaan — keduanya baru boleh terbuka SESUDAH subtesnya tutup.
run("UPDATE ielts_seksi SET transkrip = ? WHERE id = ?", "NASKAH RAHASIA", seksiId.LISTENING);
run("UPDATE ielts_seksi SET bacaan = ? WHERE id = ?", "BACAAN UJI", seksiId.READING);

function jawab(pengerjaanId, subtes, jumlah, benar) {
  for (let n = 1; n <= jumlah; n++) {
    run(
      `INSERT INTO ielts_jawaban (pengerjaan_id, soal_id, jawaban)
       VALUES (?, ?, ?)
       ON CONFLICT (pengerjaan_id, soal_id) DO UPDATE SET jawaban = excluded.jawaban`,
      pengerjaanId,
      soalId[`${subtes}${n}`],
      n <= benar ? `${subtes.toLowerCase()}-kunci${n}` : "salah",
    );
  }
}

// Peserta 1 — tuntas keduanya.
const p1 = I.setujuiRules(1, paketId);
I.bukaSubtes(I.pengerjaanById(p1.id), "LISTENING");
jawab(p1.id, "LISTENING", 3, 3);
I.selesaikanSubtes(I.pengerjaanById(p1.id), "LISTENING");
I.bukaSubtes(I.pengerjaanById(p1.id), "READING");
jawab(p1.id, "READING", 3, 2);
I.selesaikanSubtes(I.pengerjaanById(p1.id), "READING");

// Peserta 2 — Listening tutup, Reading MASIH BERJALAN.
const p2 = I.setujuiRules(2, paketId);
I.bukaSubtes(I.pengerjaanById(p2.id), "LISTENING");
jawab(p2.id, "LISTENING", 3, 1);
I.selesaikanSubtes(I.pengerjaanById(p2.id), "LISTENING");
I.bukaSubtes(I.pengerjaanById(p2.id), "READING");
jawab(p2.id, "READING", 3, 3);

// Peserta 3 — dihentikan pengawas di tengah Listening, dengan catatan.
const p3 = I.setujuiRules(3, paketId);
I.bukaSubtes(I.pengerjaanById(p3.id), "LISTENING");
jawab(p3.id, "LISTENING", 3, 3);
JAGA.catatKeluarIelts(p3.id, 3, paketId, "LISTENING", "keluar_tab", null);
const langgar = one(
  "SELECT id FROM ielts_pelanggaran WHERE pengerjaan_id = ? ORDER BY id DESC LIMIT 1",
  p3.id,
);
run("UPDATE ielts_pelanggaran SET kembali_at = datetime('now'), durasi_detik = 34 WHERE id = ?", langgar.id);
run("UPDATE ielts_pelanggaran SET jenis = 'pergi_lama' WHERE id = ?", langgar.id);

// Satu kepergian PENDEK di sampingnya: 7 detik, tetap `keluar_tab`, tidak
// menggugurkan. Ia yang membuktikan rekap membedakan "berapa kali pergi" dari
// "berapa lama di luar" — dua angka yang dipakai pengawas untuk hal berbeda.
JAGA.catatKeluarIelts(p3.id, 3, paketId, "LISTENING", "keluar_tab", null);
const pendek = one(
  "SELECT id FROM ielts_pelanggaran WHERE pengerjaan_id = ? ORDER BY id DESC LIMIT 1",
  p3.id,
);
run(
  "UPDATE ielts_pelanggaran SET kembali_at = datetime('now'), durasi_detik = 7 WHERE id = ?",
  pendek.id,
);

JAGA.gugurkanIelts(p3.id, "Kamu meninggalkan halaman ujian lebih dari 20 detik.");

/* ==================================================================== */
console.log("\n1. Skema v23 — tuas pembahasan IELTS");
/* ==================================================================== */

periksa(
  "paket IELTS punya kolom tampil_pembahasan",
  typeof I.paketById(paketId).tampil_pembahasan === "number",
);
periksa(
  "bawaannya TERBUKA, sama seperti paket tryout",
  I.paketById(paketId).tampil_pembahasan === 1,
);
periksa(
  "skema db menyebut versi 23",
  /const SKEMA_VERSI = 23;/.test(baca("src", "lib", "db.ts")),
);

/* ==================================================================== */
console.log("\n2. Lembar pembahasan — apa yang boleh dan tidak boleh terlihat");
/* ==================================================================== */

const lembar1 = BAHAS.pembahasanPengerjaan(I.pengerjaanById(p1.id));
periksa("lembar terbuka untuk peserta yang subtesnya sudah tutup", lembar1.dibuka === true);

const kL = lembar1.kelompok.find((k) => k.kode === "LISTENING");
const kR = lembar1.kelompok.find((k) => k.kode === "READING");
periksa("kedua subtes yang tutup ikut terbuka", kL?.terbuka === true && kR?.terbuka === true);
periksa(
  "butirnya membawa kunci DAN jawaban peserta",
  kL.bagian[0].butir[0].kunci === "listening-kunci1" &&
    kL.bagian[0].butir[0].jawaban === "listening-kunci1",
);
periksa("butir yang benar ditandai benar", kL.bagian[0].butir[0].benar === true);
periksa(
  "butir yang salah ditandai salah, bukan kosong",
  kR.bagian[0].butir[2].benar === false && kR.bagian[0].butir[2].kosong === false,
);
periksa(
  "penjelasan pengajar ikut terbawa",
  kL.bagian[0].butir[0].pembahasan === "Penjelasan LISTENING nomor 1.",
);
periksa("naskah rekaman terbuka sesudah subtesnya tutup", kL.bagian[0].transkrip === "NASKAH RAHASIA");
periksa("bacaan Reading ikut terbuka", kR.bagian[0].bacaan === "BACAAN UJI");

// ---- Yang PALING berbahaya: subtes yang masih berjalan ----
const lembar2 = BAHAS.pembahasanPengerjaan(I.pengerjaanById(p2.id));
const r2 = lembar2.kelompok.find((k) => k.kode === "READING");
periksa("subtes yang MASIH BERJALAN ditandai belum terbuka", r2.terbuka === false);
periksa(
  "dan tidak membocorkan satu butir pun",
  r2.bagian.length === 0 && r2.lepas.length === 0,
);
periksa(
  "tidak ada kunci Reading yang bisa dipungut dari lembar peserta itu",
  !JSON.stringify(lembar2).includes("reading-kunci") &&
    !JSON.stringify(lembar2).includes("BACAAN UJI"),
);
periksa(
  "sementara subtes yang sudah tutup tetap terbuka baginya",
  lembar2.kelompok.find((k) => k.kode === "LISTENING").terbuka === true,
);

// ---- Tuas pengelola ----
I.setPembahasanPaket(paketId, false);
const ditahan = BAHAS.pembahasanPengerjaan(I.pengerjaanById(p1.id));
periksa("tuas pengelola benar-benar menahan lembarnya", ditahan.dibuka === false);
periksa("dan tidak menyisakan isi apa pun", ditahan.kelompok.length === 0);
I.setPembahasanPaket(paketId, true);
periksa(
  "membukanya kembali mengembalikan isinya",
  BAHAS.pembahasanPengerjaan(I.pengerjaanById(p1.id)).kelompok.length === 2,
);

// ---- Ujian yang dihentikan ----
periksa(
  "ujian yang DIHENTIKAN tidak berhak atas lembar pembahasan",
  BAHAS.pembahasanPengerjaan(I.pengerjaanById(p3.id)).dibuka === false,
);

/* ==================================================================== */
console.log("\n3. Skor Live IELTS");
/* ==================================================================== */

const papan = LIVE.papanLiveIelts(paketId);
periksa("papan memuat SEMUA peserta, termasuk yang dihentikan", papan.length === 3);

const b1 = papan.find((b) => b.userId === 1);
const b2 = papan.find((b) => b.userId === 2);
const b3 = papan.find((b) => b.userId === 3);

periksa("peserta yang tuntas berstatus finished", b1.status === "finished");
periksa("bandnya final karena kedua subtes yang diujikan sudah berband", b1.final === true);
periksa("peserta yang masih mengerjakan berstatus ongoing", b2.status === "ongoing");
periksa("timernya terbaca BENAR-BENAR berjalan", b2.timerJalan === true);
periksa("yang sudah selesai tidak ikut dihitung sedang ujian", b1.timerJalan === false);
periksa("peserta yang dihentikan tidak diberi band sama sekali", b3.overall === null);
periksa("alasan dihentikannya terbawa untuk pengawas", (b3.alasanGugur ?? "").includes("20 detik"));
periksa("kedua catatan keamanannya terhitung", b3.pelanggaran === 2);
periksa(
  "waktu di luar halaman ikut dijumlahkan untuk kolom anggaran",
  b3.detikPergi === 41,
  `dapat ${b3.detikPergi}`,
);

const ringkas = LIVE.ringkasLiveIelts(papan);
periksa("ringkasan menghitung satu peserta yang benar-benar sedang ujian", ringkas.sedangUjian === 1);
periksa("satu selesai", ringkas.selesai === 1);
periksa("satu dihentikan", ringkas.dihentikan === 1);
periksa("total pelanggaran terbawa", ringkas.totalPelanggaran === 2);

const kolomLive = LIVE.kolomSubtesLive(papan);
periksa(
  "kolom subtes hanya yang DIUJIKAN — Writing & Speaking tidak menumbuhkan kolom kosong",
  kolomLive.length === 2 && kolomLive.join(",") === "LISTENING,READING",
  kolomLive.join(","),
);

/* ==================================================================== */
console.log("\n4. Rekap per peserta");
/* ==================================================================== */

const rekap = REKAP.rekapPesertaIelts(p3.id);
periksa("rekap ditemukan lewat id pengerjaan", rekap !== null);
periksa("identitas peserta terbawa apa adanya", rekap.nama === "Dinda Ayu Lestari" && rekap.nisn === "0073");
periksa("paketnya ikut, bukan cuma idnya", rekap.paket.kode === "IELTS-PANEL");
periksa("seluruh catatan keamanannya terbawa", rekap.pelanggaran.length === 2);
periksa(
  "catatannya diberi label berbahasa Indonesia, bukan kode mentah",
  rekap.pelanggaran[0].label !== rekap.pelanggaran[0].jenis && rekap.pelanggaran[0].label.length > 3,
);
periksa(
  "catatan yang menggugurkan ditandai berat, yang pendek tidak",
  rekap.pelanggaran.filter((v) => v.berat).length === 1,
);
periksa(
  "anggarannya dibaca dari konstanta bersama, bukan angka yang diketik ulang",
  rekap.budgetDetik === DENYUT.BUDGET_PERGI_DETIK,
);
periksa(
  "jumlah kepergian menghitung yang belum menggugurkan",
  rekap.jumlahKepergian === 1,
  `dapat ${rekap.jumlahKepergian}`,
);
periksa(
  "waktu di luar halaman menjumlah KEDUANYA — yang pendek maupun yang panjang",
  rekap.totalDetikPergi === 41,
  `dapat ${rekap.totalDetikPergi}`,
);

const rekap1 = REKAP.rekapPesertaIelts(p1.id);
const subL = rekap1.subtes.find((s) => s.kode === "LISTENING");
periksa("subtes yang tutup ditandai selesai", subL.keadaan === "selesai");
periksa("lama pengerjaannya terhitung", typeof subL.dipakaiDetik === "number");
periksa("jumlah jawaban terisi terbawa", subL.dijawab === 3);
periksa(
  "menitnya dibaca dari menitPaket(), bukan konstanta mentah",
  subL.menit === I.menitPaket(paketId).LISTENING,
);
periksa(
  "subtes yang TIDAK diujikan tidak muncul sebagai baris kosong",
  !rekap1.subtes.some((s) => s.kode === "WRITING" || s.kode === "SPEAKING"),
);
periksa(
  "Reading milik peserta 2 terbaca masih berjalan",
  REKAP.rekapPesertaIelts(p2.id).subtes.find((s) => s.kode === "READING").keadaan === "berjalan",
);
periksa("id yang tidak ada memulangkan null, bukan melempar", REKAP.rekapPesertaIelts(999999) === null);

const daftar = REKAP.daftarPesertaIelts(paketId);
periksa("daftar peserta memuat ketiganya", daftar.length === 3);
periksa("daftar tanpa penyaring paket ikut memuatnya", REKAP.daftarPesertaIelts(0).length === 3);
periksa(
  "tiap baris membawa kode paketnya",
  daftar.every((b) => b.paketKode === "IELTS-PANEL"),
);

/* ==================================================================== */
console.log("\n5. Catatan ronde lama tetap terbaca sesudah sesi ulang");
/* ==================================================================== */

JAGA.bukaSusulanIelts(p3.id);
const setelahUlang = REKAP.rekapPesertaIelts(p3.id);
periksa("rondenya naik", setelahUlang.pengerjaan.ronde === 2);
periksa(
  "catatan ronde lama TETAP tampil di rekap sebagai bukti",
  setelahUlang.pelanggaran.length === 2 &&
    setelahUlang.pelanggaran.every((v) => v.ronde === 1),
);
periksa(
  "tetapi anggaran kepergiannya sudah kosong lagi",
  setelahUlang.totalDetikPergi === 0,
);

/* ==================================================================== */
console.log("\n6. Penjagaan SERAGAM antara ruang ujian IELTS dan UTBK/SKD");
/* ==================================================================== */

const ruangUtbk = baca("src", "components", "exam", "RuangUjian.tsx");
const hookIelts = baca("src", "components", "language", "usePenjagaIelts.ts");
const peramban = baca("src", "lib", "penjagaan-peramban.ts");

// Satu daftar jenis, satu berkas ambang — bukan angka yang diketik dua kali.
for (const [nama, isi] of [
  ["ruang ujian UTBK/SKD", ruangUtbk],
  ["kait penjagaan IELTS", hookIelts],
]) {
  periksa(
    `${nama} mengambil jenis pelanggaran dari pelanggaran-jenis.ts`,
    /from "@\/lib\/pelanggaran-jenis"/.test(isi),
  );
  periksa(
    `${nama} mengambil ambang dari denyut.ts`,
    /from "@\/lib\/denyut"/.test(isi),
  );
  periksa(
    `${nama} memakai penolong peramban bersama`,
    /from "@\/lib\/penjagaan-peramban"/.test(isi),
  );
}

// Keenam pemicu pelanggaran harus sama persis di kedua ruang.
const PEMICU = ["esc_layar_penuh", "alt_tab", "keluar_tab", "tangkap_layar", "blur_window"];
for (const jenis of PEMICU) {
  periksa(
    `pemicu "${jenis}" ada di KEDUA ruang ujian`,
    ruangUtbk.includes(`"${jenis}"`) && hookIelts.includes(`"${jenis}"`),
  );
}
periksa(
  "keduanya membedakan esc di komputer dari lepas layar penuh di ponsel",
  /perambanKomputer\(\) \? "esc_layar_penuh" : "keluar_layar_penuh"/.test(ruangUtbk) &&
    /perambanKomputer\(\) \? "esc_layar_penuh" : "keluar_layar_penuh"/.test(hookIelts),
);

// Pemberitahuan sisa anggaran 20 detik: ADA di keduanya, angkanya dari server.
periksa(
  "kedua ruang memberi tahu sisa anggaran kepergian saat peserta kembali",
  /budgetDetik - data\.totalDetik/.test(ruangUtbk) &&
    /budgetDetik - data\.totalDetik/.test(hookIelts),
);

// Penolong papan ketik iPad: SATU sumber, dipakai keduanya.
periksa(
  "penolong papan ketik iPad tinggal di penjagaan-peramban.ts",
  /export function pasangKolomKeTengah\(\)/.test(peramban),
);
periksa(
  "ruang ujian UTBK/SKD memanggilnya, bukan menyalinnya",
  /pasangKolomKeTengah\(\)/.test(ruangUtbk) && !/const bawaKeTengah = \(\)/.test(ruangUtbk),
);
periksa(
  "ruang ujian IELTS memanggil penolong yang SAMA",
  /pasangKolomKeTengah\(\)/.test(hookIelts) && !/const bawaKeTengah = \(\)/.test(hookIelts),
);

/* ==================================================================== */
console.log("\n7. Halaman panel benar-benar ada dan bertautan");
/* ==================================================================== */

for (const [nama, jalan] of [
  ["Skor Live IELTS", ["src", "app", "admin", "ielts", "live", "page.tsx"]],
  ["Daftar peserta IELTS", ["src", "app", "admin", "ielts", "peserta", "page.tsx"]],
  ["Rekap per peserta IELTS", ["src", "app", "admin", "ielts", "peserta", "[id]", "page.tsx"]],
  ["Keamanan Ujian IELTS", ["src", "app", "admin", "ielts", "keamanan", "page.tsx"]],
  ["Pembahasan siswa", ["src", "app", "language", "ielts", "pembahasan", "page.tsx"]],
]) {
  periksa(`halaman ${nama} ada`, fs.existsSync(path.join(AKAR, ...jalan)));
}

const nav = baca("src", "components", "admin", "AdminNav.tsx");
for (const jalan of ["/admin/ielts/live", "/admin/ielts/keamanan", "/admin/ielts/peserta"]) {
  periksa(`menu pengelola IELTS memuat ${jalan}`, nav.includes(jalan));
}

const panel = baca("src", "app", "admin", "ielts", "page.tsx");
periksa("panel IELTS menautkan Skor Live", panel.includes("/admin/ielts/live"));
periksa("panel IELTS menautkan Rekap per Peserta", panel.includes("/admin/ielts/peserta"));
periksa("panel IELTS menautkan Keamanan Ujian", panel.includes("/admin/ielts/keamanan"));
periksa("panel IELTS memasang tuas pembahasan", panel.includes("setPembahasanIeltsAction"));
periksa("panel IELTS memasang bendera dunia", panel.includes("PitaBendera"));

const bendera = baca("src", "components", "language", "BenderaDunia.tsx");
periksa(
  "bendera digambar sebagai SVG, bukan emoji yang tidak ada di Windows",
  /viewBox="0 0 60 40"/.test(bendera) && !/\u{1F1EC}\u{1F1E7}/u.test(bendera.replace(/^[\s\S]*?\*\//, "")),
);
periksa(
  "daftarnya melintasi benua, bukan cuma negara berbahasa Inggris",
  ["GB", "US", "JP", "ID", "AE", "ZA", "BR", "DE"].every((k) => bendera.includes(`kode: "${k}"`)),
);

// Pintu pengelola IELTS yang berdiri sendiri sudah DIHAPUS 11 September 2026;
// penjagaannya kini ada di `cek:band`, yang memastikan ia tidak kembali.

const hasil = baca("src", "app", "language", "ielts", "hasil", "page.tsx");
periksa("halaman hasil siswa menautkan pembahasan", hasil.includes("/language/ielts/pembahasan"));

/* ==================================================================== */
console.log("\n8. Rekaman Listening TIDAK boleh menggugurkan (11 September 2026)");
/* ==================================================================== */

const JENIS = await muat("pelanggaran-jenis");

// ---- Daftar jenisnya ----
periksa(
  "ada jenis `pergi_saat_rekaman`",
  JENIS.JENIS_CATATAN.includes("pergi_saat_rekaman"),
);
periksa(
  "dan ia TIDAK menggugurkan",
  JENIS.menggugurkan("pergi_saat_rekaman") === false,
);
periksa(
  "labelnya terbaca manusia, bukan kode mentah",
  JENIS.labelJenis("pergi_saat_rekaman").toLowerCase().includes("rekaman"),
);

// ---- Siapa yang dimaafkan, siapa yang tidak ----
for (const j of [
  "blur_window",
  "esc_layar_penuh",
  "keluar_tab",
  "pergi_lama",
  "pergi_menumpuk",
  "denyut_hilang",
]) {
  periksa(`"${j}" dimaafkan selagi rekaman berputar`, JENIS.dimaafkanSaatRekaman(j) === true);
}
// PAGAR YANG MEMBUAT INI BUKAN PINTU BELAKANG. Kalau dua pemeriksaan berikut
// gugur, pemaafan rekaman berubah menjadi jeda tanpa penjagaan sama sekali.
for (const j of ["alt_tab", "tangkap_layar"]) {
  periksa(
    `"${j}" TETAP menggugurkan walau rekaman berputar`,
    JENIS.dimaafkanSaatRekaman(j) === false,
  );
}

// ---- Akibatnya pada anggaran 20 detik, diuji pada basis data sungguhan ----
const pRek = I.setujuiRules(2, paketId); // peserta 2, pengerjaannya sudah ada
JAGA.catatKeluarIelts(pRek.id, 2, paketId, "LISTENING", "pergi_saat_rekaman", null);
const barisRek = one(
  "SELECT id FROM ielts_pelanggaran WHERE pengerjaan_id = ? ORDER BY id DESC LIMIT 1",
  pRek.id,
);
run(
  "UPDATE ielts_pelanggaran SET kembali_at = datetime('now'), durasi_detik = 95 WHERE id = ?",
  barisRek.id,
);

periksa(
  "95 detik saat rekaman TIDAK ikut memakan anggaran kepergian",
  JAGA.totalDetikKepergianIelts(pRek.id) === 0,
  `dapat ${JAGA.totalDetikKepergianIelts(pRek.id)}`,
);
periksa(
  "dan tidak ikut terhitung sebagai jumlah kepergian",
  JAGA.jumlahKepergianIelts(pRek.id) === 0,
);
periksa(
  "barisnya TETAP tercatat untuk pengawas",
  JAGA.pelanggaranPengerjaan(pRek.id).some((v) => v.jenis === "pergi_saat_rekaman"),
);
periksa(
  "baris itu TIDAK BISA dinaikkan menjadi pergi_lama",
  JAGA.naikkanPergiLamaIelts(barisRek.id, pRek.id) === false,
);
periksa(
  "maupun menjadi pergi_menumpuk",
  JAGA.naikkanPergiMenumpukIelts(barisRek.id, pRek.id, 999) === false,
);
periksa(
  "pengerjaannya tetap berjalan, tidak digugurkan",
  I.pengerjaanById(pRek.id).status === "ongoing",
);

// ---- Sumber bencananya: dialog bawaan peramban ----
//
// INILAH pemeriksaan terpenting di bagian ini. `window.confirm` pada tombol
// Play-lah yang menggugurkan 126 peserta pada 11 September 2026: ia mencuri
// fokus jendela (`blur_window`), melepas layar penuh di sebagian peramban
// komputer (`esc_layar_penuh`), DAN membekukan JavaScript sehingga denyutnya
// berhenti (`denyut_hilang`).
const BERKAS_RUANG = [
  ["PemutarSekali.tsx", ["src", "components", "language", "PemutarSekali.tsx"]],
  ["RuangIelts.tsx", ["src", "components", "language", "RuangIelts.tsx"]],
  ["usePenjagaIelts.ts", ["src", "components", "language", "usePenjagaIelts.ts"]],
  ["GerbangIelts.tsx", ["src", "components", "language", "GerbangIelts.tsx"]],
];
for (const [nama, jalan] of BERKAS_RUANG) {
  const isi = baca(...jalan).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  periksa(
    `${nama} tidak memanggil window.confirm/alert/prompt`,
    !/\bwindow\.(confirm|alert|prompt)\s*\(/.test(isi) && !/(?<![.\w])confirm\s*\(/.test(isi),
  );
}

const pemutar = baca("src", "components", "language", "PemutarSekali.tsx");
periksa("pemutar mengabari keadaannya lewat onBerputar", /onBerputar/.test(pemutar));
periksa(
  "kabarnya dibangkitkan dari elemen audio (play/pause), bukan cuma dari tombol",
  /addEventListener\("play"/.test(pemutar) && /addEventListener\("pause"/.test(pemutar),
);
periksa(
  "membongkar pemutar ikut memadamkan pemaafannya",
  /kabar\.current\?\.\(false\);\s*\n\s*\};\s*\n\s*\}, \[\]\);/.test(pemutar) ||
    /Meninggalkan bagian ini selagi rekaman berputar/.test(pemutar),
);

const ruang = baca("src", "components", "language", "RuangIelts.tsx");
periksa("ruang ujian meneruskan keadaan pemutar ke penjagaan", /rekamanBerputar,/.test(ruang));
periksa(
  "dan memberi tahu peserta bahwa aturannya dijeda saat rekaman",
  /rekaman Listening diputar/.test(ruang) && /dijeda/.test(ruang),
);
periksa(
  "tata tertib ikut menyebutkannya",
  /recording is playing/i.test(baca("src", "lib", "ielts-konstanta.ts")),
);

// ---- Pagar di sisi server ----
const ruteViolation = baca("src", "app", "api", "language", "ielts", "violation", "route.ts");
const ruteDenyut = baca("src", "app", "api", "language", "ielts", "denyut", "route.ts");
for (const [nama, isi] of [
  ["rute violation", ruteViolation],
  ["rute denyut", ruteDenyut],
]) {
  periksa(
    `${nama} memeriksa sendiri bahwa subtesnya LISTENING`,
    /"LISTENING"/.test(isi) && /toUpperCase\(\)/.test(isi),
  );
}
periksa(
  "rute violation memakai daftar pemaafan bersama, bukan daftarnya sendiri",
  /dimaafkanSaatRekaman/.test(ruteViolation),
);
periksa(
  "rute denyut memaafkan keheningan saat rekaman berputar",
  /catatPergiSaatRekamanIelts/.test(ruteDenyut),
);

// Jalur UTBK/SKD tidak punya rekaman — pemaafan ini tidak boleh bocor ke sana.
periksa(
  "jalur UTBK/SKD tidak ikut tersentuh pemaafan rekaman",
  !/pergi_saat_rekaman/.test(baca("src", "app", "api", "exam", "violation", "route.ts")) &&
    !/pergi_saat_rekaman/.test(baca("src", "components", "exam", "RuangUjian.tsx")),
);

/* ==================================================================== */
console.log("\n9. Dibuka vs Buka sesi ulang, dan Hapus riwayat (11 September 2026)");
/* ==================================================================== */

// Paket dan peserta SENDIRI supaya bagian ini tidak mewarisi keadaan bagian
// sebelumnya — di atas sudah ada pengerjaan yang digugurkan lalu disesi-ulang.
const paketB = I.buatPaket({ kode: "IELTS-BUKA", nama: "IELTS Uji Buka Blokir" });
I.setStatusPaket(paketB, "published");
const soalB = {};
for (const [subtes, jumlah] of [
  ["LISTENING", 2],
  ["READING", 2],
]) {
  const sk = I.pastikanSeksi(paketB, subtes);
  for (let n = 1; n <= jumlah; n++) {
    soalB[`${subtes}${n}`] = I.simpanSoal(paketB, subtes, {
      nomor: n,
      tipe: "IS",
      pertanyaan: `B ${subtes} ${n}`,
      opsi: [],
      kunci: "benar",
      seksiId: sk[0].id,
    });
  }
}

run(
  "INSERT INTO users (id, nama, email, password_hash, role, kelas) VALUES (21, 'Peserta Blokir', 'blokir@cek.local', 'x', 'siswa', 'X A')",
);
const pB = I.setujuiRules(21, paketB);
// Listening dituntaskan, lalu Reading DIBUKA dan dijawab separuh — inilah
// bentuk yang paling sering terjadi: peserta gugur di tengah subtes kedua.
I.bukaSubtes(I.pengerjaanById(pB.id), "LISTENING");
run(
  "INSERT INTO ielts_jawaban (pengerjaan_id, soal_id, jawaban) VALUES (?, ?, 'benar')",
  pB.id,
  soalB.LISTENING1,
);
I.selesaikanSubtes(I.pengerjaanById(pB.id), "LISTENING");
I.bukaSubtes(I.pengerjaanById(pB.id), "READING");
run(
  "INSERT INTO ielts_jawaban (pengerjaan_id, soal_id, jawaban) VALUES (?, ?, 'benar')",
  pB.id,
  soalB.READING1,
);

const tenggatSebelum = one(
  "SELECT deadline_at FROM ielts_subtes WHERE pengerjaan_id = ? AND subtes = 'READING'",
  pB.id,
).deadline_at;

JAGA.gugurkanIelts(pB.id, "Uji: dihentikan di tengah Reading.");
periksa("peserta uji benar-benar berstatus gugur", I.pengerjaanById(pB.id).status === "gugur");
periksa(
  "dan subtes yang sedang berjalan ikut ditutup",
  one(
    "SELECT COUNT(*) AS n FROM ielts_subtes WHERE pengerjaan_id = ? AND selesai_at IS NULL",
    pB.id,
  ).n === 0,
);

// Mundurkan waktu pengguguran 10 menit supaya ada sisa waktu yang bisa diuji
// pengembaliannya. `digugurkan_at` disimpan waktu LOKAL.
run(
  "UPDATE ielts_pengerjaan SET digugurkan_at = datetime('now','localtime','-600 seconds') WHERE id = ?",
  pB.id,
);

const hasilBuka = JAGA.bukaBlokirIelts(pB.id);

periksa("Dibuka tidak memulangkan galat", !hasilBuka.error, hasilBuka.error ?? "");
periksa(
  "peserta kembali berjalan, bukan mengulang",
  I.pengerjaanById(pB.id).status === "ongoing",
);
periksa("ia dikembalikan ke subtes yang tadi terpotong", hasilBuka.subtes === "READING");
periksa(
  "JAWABANNYA TIDAK DIHAPUS — inilah beda pokoknya dengan sesi ulang",
  one("SELECT COUNT(*) AS n FROM ielts_jawaban WHERE pengerjaan_id = ?", pB.id).n === 2,
);
periksa(
  "subtes yang sudah TUNTAS sebelum digugurkan tidak ikut dibuka lagi",
  Boolean(
    one(
      "SELECT selesai_at FROM ielts_subtes WHERE pengerjaan_id = ? AND subtes = 'LISTENING'",
      pB.id,
    ).selesai_at,
  ),
);
periksa(
  "subtes yang terpotong dibuka kembali",
  one(
    "SELECT selesai_at FROM ielts_subtes WHERE pengerjaan_id = ? AND subtes = 'READING'",
    pB.id,
  ).selesai_at === null,
);
// Tanpa penggeseran tenggat, peserta yang dibukakan sepuluh menit kemudian
// mendapati subtesnya langsung kedaluwarsa sebelum satu soal pun tampil.
const tenggatSesudah = one(
  "SELECT deadline_at FROM ielts_subtes WHERE pengerjaan_id = ? AND subtes = 'READING'",
  pB.id,
).deadline_at;
periksa(
  "tenggatnya DIGESER selama peserta terhenti",
  tenggatSesudah > tenggatSebelum,
  `${tenggatSebelum} → ${tenggatSesudah}`,
);
periksa(
  "sisa waktu yang dikembalikan kira-kira selama ia terhenti",
  Math.abs((hasilBuka.dikembalikanDetik ?? 0) - 600) <= 5,
  `dapat ${hasilBuka.dikembalikanDetik}`,
);
periksa("rondenya naik supaya hitungan lama tidak membebaninya", I.pengerjaanById(pB.id).ronde === 2);
periksa(
  "denyut ronde lama dilupakan supaya tidak langsung gugur lagi",
  I.pengerjaanById(pB.id).denyut_at === null,
);
periksa(
  "Dibuka menolak pengerjaan yang TIDAK sedang dihentikan",
  Boolean(JAGA.bukaBlokirIelts(pB.id).error),
);

// ---- Bandingkan dengan Buka sesi ulang ----
JAGA.gugurkanIelts(pB.id, "Uji: dihentikan lagi.");
JAGA.bukaSusulanIelts(pB.id);
periksa(
  "Buka sesi ulang MENGHAPUS jawaban — dua tombol ini memang berbeda",
  one("SELECT COUNT(*) AS n FROM ielts_jawaban WHERE pengerjaan_id = ?", pB.id).n === 0,
);
periksa(
  "dan menghapus seluruh timer subtesnya",
  one("SELECT COUNT(*) AS n FROM ielts_subtes WHERE pengerjaan_id = ?", pB.id).n === 0,
);

// ---- Hapus riwayat ----
const jejakB = I.jejakRiwayatIelts(paketB);
periksa("jejak riwayat terbaca", jejakB?.kode === "IELTS-BUKA");
periksa("jumlah pengerjaannya terhitung", jejakB.pengerjaan === 1);

// Peserta yang BENAR-BENAR sedang mengerjakan harus menahan penghapusan.
I.bukaSubtes(I.pengerjaanById(pB.id), "LISTENING");
periksa(
  "riwayat DITOLAK dihapus selagi ada peserta yang timernya berjalan",
  Boolean(I.hapusRiwayatIelts(paketB).error),
);
periksa(
  "dan galatnya menyebutkan jumlah pesertanya",
  /1 peserta/.test(I.hapusRiwayatIelts(paketB).error ?? ""),
);

I.selesaikanSubtes(I.pengerjaanById(pB.id), "LISTENING");
run("UPDATE ielts_subtes SET selesai_at = datetime('now') WHERE pengerjaan_id = ?", pB.id);

const hasilHapus = I.hapusRiwayatIelts(paketB);
periksa("sesudah timernya mati, riwayat boleh dihapus", !hasilHapus.error, hasilHapus.error ?? "");
periksa(
  "seluruh pengerjaannya hilang",
  one("SELECT COUNT(*) AS n FROM ielts_pengerjaan WHERE paket_id = ?", paketB).n === 0,
);
periksa(
  "baris anaknya ikut terhapus lewat ON DELETE CASCADE",
  one("SELECT COUNT(*) AS n FROM ielts_subtes WHERE pengerjaan_id = ?", pB.id).n === 0 &&
    one("SELECT COUNT(*) AS n FROM ielts_pelanggaran WHERE pengerjaan_id = ?", pB.id).n === 0,
);
// YANG PALING PENTING: yang dihapus RIWAYATNYA, bukan paketnya.
periksa("PAKETNYA sendiri TIDAK ikut terhapus", Boolean(I.paketById(paketB)));
periksa(
  "SOALNYA tetap utuh",
  one("SELECT COUNT(*) AS n FROM ielts_soal WHERE paket_id = ?", paketB).n === 4,
);
periksa(
  "BAGIAN dan rekamannya tetap utuh",
  one("SELECT COUNT(*) AS n FROM ielts_seksi WHERE paket_id = ?", paketB).n > 0,
);
periksa(
  "AKUN siswanya tetap ada",
  Boolean(one("SELECT id FROM users WHERE id = 21")),
);
periksa(
  "paket yang riwayatnya sudah kosong menolak dihapus dua kali",
  Boolean(I.hapusRiwayatIelts(paketB).error),
);
periksa("paket yang tidak ada ditolak", Boolean(I.hapusRiwayatIelts(999999).error));

// ---- Letak tombolnya di layar ----
const panelB = baca("src", "app", "admin", "ielts", "page.tsx");
periksa("daftar paket memasang Hapus riwayat", /hapusRiwayatIeltsAction/.test(panelB));
// Urutan kolom aksi harus sama dengan portal tryout: Hitung ulang → Hapus
// riwayat → Hapus paket. Yang merusak selalu di bawah.
periksa(
  "letaknya sesudah Hitung ulang nilai dan sebelum Hapus paket",
  panelB.indexOf("hitungUlangIeltsAction") < panelB.lastIndexOf("hapusRiwayatIeltsAction") &&
    panelB.lastIndexOf("hapusRiwayatIeltsAction") < panelB.lastIndexOf("hapusPaketIeltsAction"),
);
// Tombolnya harus BERSYARAT, bukan selalu digambar: paket tanpa riwayat yang
// menawarkan "Hapus riwayat" hanya memancing ketukan yang pasti ditolak.
// Diperiksa lewat MAKNANYA — ada penjaga `punyaRiwayat` yang lahir dari jumlah
// pengerjaan, dan tombolnya berada di dalam penjaga itu — bukan lewat bentuk
// tulisannya, supaya pemeriksa ini tidak gugur setiap kali barisnya dirapikan.
periksa(
  "ada penjaga `punyaRiwayat` yang dihitung dari jumlah pengerjaan",
  /const punyaRiwayat = \(jejak\?\.pengerjaan \?\? 0\) > 0;/.test(panelB),
);
periksa(
  "tombol Hapus riwayat berada DI DALAM penjaga itu",
  panelB.indexOf("{punyaRiwayat && (") < panelB.lastIndexOf("hapusRiwayatIeltsAction") &&
    panelB.indexOf("{punyaRiwayat && (") !== -1,
);

for (const [nama, jalan] of [
  ["panel Keamanan Ujian", ["src", "app", "admin", "ielts", "keamanan", "page.tsx"]],
  ["rekap per peserta", ["src", "app", "admin", "ielts", "peserta", "[id]", "page.tsx"]],
]) {
  const isi = baca(...jalan);
  periksa(`${nama} memasang tombol Dibuka`, /bukaBlokirIeltsAction/.test(isi));
  periksa(`${nama} tetap memasang Buka sesi ulang di sampingnya`, /bukaSesiUlangIeltsAction/.test(isi));
  periksa(
    `${nama} menaruh Dibuka LEBIH DULU daripada Buka sesi ulang`,
    isi.indexOf("bukaBlokirIeltsAction") < isi.lastIndexOf("bukaSesiUlangIeltsAction"),
  );
}

/* ==================================================================== */

// Folder sementara TIDAK dihapus di sini: Windows masih memegang berkas SQLite
// yang terbuka. Yang membersihkannya adalah rmSync di awal berkas ini.

if (gagal > 0) {
  console.log(`\n${gagal} pemeriksaan GAGAL.`);
  process.exit(1);
}
console.log("\nSemua pemeriksaan panel IELTS lulus.");
