/**
 * Pengujian PAKET KOSONG dan PENGERJAAN TERBENGKALAI.
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/paket-kosong-check.mjs
 *
 * Dua kerusakan yang ditemukan 7 September 2026 dari data produksi, dan yang
 * dijaga berkas ini supaya tidak pernah kembali:
 *
 *   1. PAKET TANPA SOAL TAMPIL SEOLAH BERISI. `rincianSubtesPaket()` dulu
 *      memakai `?? meta.jumlahSoal` — jumlah soal RESMI tiap subtes — ketika
 *      paketnya belum punya butir. Akibatnya halaman persiapan menulis
 *      "160 soal · 195 menit" untuk paket kosong, penjaga `rincian.length === 0`
 *      tidak pernah menyala (panjangnya selalu tujuh, karena daftar subtesnya
 *      juga jatuh ke urutan resmi), dan tombol mulai tetap muncul. Peserta yang
 *      menekannya masuk ke lingkaran tanpa ujung: ruang ujian tidak punya subtes
 *      untuk dibuka -> dilempar ke halaman hasil -> "Tryout ini belum selesai"
 *      -> beranda menawarkan "Lanjutkan Ujian" lagi.
 *
 *   2. PENGERJAAN TIDAK PERNAH TERTUTUP KALAU PESERTA TIDAK KEMBALI. Penutupan
 *      ujian hanya terjadi di dalam `keadaanUjian()`, yang cuma berjalan saat
 *      halaman ujian dibuka. Peserta yang menutup peramban pada subtes terakhir
 *      menggantung `ongoing` selamanya — tidak dinilai, tidak masuk peringkat,
 *      dan di layar admin terbaca "Sedang Berlangsung" berhari-hari sesudah
 *      paketnya ditutup. Pada produksi 7 September ada lima, satu di antaranya
 *      sudah mengisi 64 jawaban.
 *
 * Berkas .ts asli dipakai apa adanya — hanya disalin ke folder sementara DI
 * DALAM proyek (supaya node_modules tetap terjangkau) dengan penambahan
 * ekstensi pada impornya, sama seperti `denyut-check.mjs`.
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
const TMP = path.join(AKAR, ".tmp", "cek", "paket-kosong");

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

const dbMod = await muat("db");
const E = await muat("exam");
const A = await muat("admin");
const L = await muat("live");
const { one, run } = dbMod;

let gagal = 0;
function periksa(nama, syarat, tambahan = "") {
  if (syarat) {
    console.log("  ✓ " + nama);
  } else {
    gagal += 1;
    console.log("  ✗ " + nama + (tambahan ? "  — " + tambahan : ""));
  }
}

/* ------------------------------------------------------------------ */
/* Data uji                                                            */
/* ------------------------------------------------------------------ */

const siswa = (nama) => {
  const r = run(
    `INSERT INTO users (nama, email, password_hash, role, kelas, nisn)
     VALUES (?, ?, 'x', 'siswa', 'XII UJI', ?)`,
    nama,
    `${nama.replace(/\s+/g, ".").toLowerCase()}@uji.test`,
    String(700000 + Math.floor(Math.random() * 99999)),
  );
  return Number(r.lastInsertRowid);
};

const paket = (kode, jalur, status, mulai, selesai) => {
  run(
    `INSERT INTO packages (kode, nama, jalur, status, mulai_at, selesai_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    kode,
    `Paket ${kode}`,
    jalur,
    status,
    mulai,
    selesai,
  );
  return one("SELECT id FROM packages WHERE kode = ?", kode).id;
};

const soal = (packageId, subtes, nomor) =>
  run(
    `INSERT INTO questions (package_id, subtes, nomor, tipe, pertanyaan, opsi, kunci)
     VALUES (?, ?, ?, 'pg', 'Pertanyaan uji', '["a","b","c","d","e"]', 'A')`,
    packageId,
    subtes,
    nomor,
  );

// Jendela yang mencakup hari ini.
const SEKARANG_MULAI = "datetime('now','localtime','-1 day')";
const SEKARANG_SELESAI = "datetime('now','localtime','+1 day')";
const jendelaHidup = () =>
  one(`SELECT ${SEKARANG_MULAI} AS a, ${SEKARANG_SELESAI} AS b`);
const jw = jendelaHidup();

const kosong = paket("UJI-KOSONG", "utbk", "published", jw.a, jw.b);
const kosongSkd = paket("UJI-KOSONG-SKD", "skd", "published", jw.a, jw.b);
const berisi = paket("UJI-BERISI", "utbk", "published", jw.a, jw.b);
for (let n = 1; n <= 3; n++) soal(berisi, "PU", n);

/* ------------------------------------------------------------------ */
console.log("\n1. Paket kosong tidak boleh mengaku berisi");
/* ------------------------------------------------------------------ */

periksa("jumlahSoalPaket() paket kosong = 0", E.jumlahSoalPaket(kosong) === 0);
periksa("jumlahSoalPaket() paket berisi = 3", E.jumlahSoalPaket(berisi) === 3);

const rincianKosong = E.rincianSubtesPaket(kosong);
const totalKosong = rincianKosong.reduce((a, s) => a + s.jumlahSoal, 0);
periksa(
  "rincian paket kosong menjumlah NOL soal (dulu 160 — angka resmi yang dipinjam)",
  totalKosong === 0,
  "dapat " + totalKosong,
);
periksa(
  "daftar subtesnya TETAP tampil sebagai rencana isi, jadi panjangnya bukan penanda kosong",
  rincianKosong.length > 0,
  "panjang " + rincianKosong.length,
);

const rincianSkd = E.rincianSubtesPaket(kosongSkd);
const totalSkd = rincianSkd.reduce((a, s) => a + s.jumlahSoal, 0);
periksa(
  "jalur SKD ikut jujur: paket kosong menjumlah NOL soal",
  totalSkd === 0,
  "dapat " + totalSkd,
);

const rincianBerisi = E.rincianSubtesPaket(berisi);
const totalBerisi = rincianBerisi.reduce((a, s) => a + s.jumlahSoal, 0);
periksa("paket berisi tetap terhitung benar", totalBerisi === 3, "dapat " + totalBerisi);

/* ------------------------------------------------------------------ */
console.log("\n2. Ruang ujian pada paket kosong tidak punya subtes");
/* ------------------------------------------------------------------ */

const ali = siswa("Ali Paket Kosong");
const att = E.mulaiAttempt(ali, kosong);
const keadaan = E.keadaanUjian(att.id, { mulaiOtomatis: true });
periksa(
  "keadaan ujian paket kosong tidak menghasilkan subtes untuk dikerjakan",
  keadaan !== null && (keadaan.selesai === true || !keadaan.subtes),
);
periksa(
  "attempt-nya TIDAK ikut ditandai selesai (nilainya tidak ada untuk dihitung)",
  E.getAttempt(att.id).status === "ongoing",
);
periksa(
  "inilah sebab halaman /kerjakan harus menahannya sendiri, bukan melempar ke /hasil",
  E.jumlahSoalPaket(kosong) === 0,
);

/* ------------------------------------------------------------------ */
console.log("\n3. Pengerjaan terbengkalai: yang boleh dan tidak boleh tersapu");
/* ------------------------------------------------------------------ */

// (a) Paket yang jendelanya SUDAH LEWAT, subtes habis waktunya, ada jawaban.
const lewat = paket(
  "UJI-LEWAT",
  "utbk",
  "published",
  one("SELECT datetime('now','localtime','-5 day') AS a").a,
  one("SELECT datetime('now','localtime','-1 day') AS a").a,
);
for (let n = 1; n <= 3; n++) soal(lewat, "PU", n);
const budi = siswa("Budi Terbengkalai");
const attLewat = E.mulaiAttempt(budi, lewat);
run(
  `INSERT INTO attempt_subtes (attempt_id, subtes, mulai_at, deadline_at)
   VALUES (?, 'PU', datetime('now','-3 day'), datetime('now','-2 day'))`,
  attLewat.id,
);
const idSoal = one("SELECT id FROM questions WHERE package_id = ? LIMIT 1", lewat).id;
run(
  `INSERT INTO answers (attempt_id, question_id, jawaban) VALUES (?, ?, 'A')`,
  attLewat.id,
  idSoal,
);

// (b) Paket yang jendelanya MASIH HIDUP — peserta bisa saja sedang mengerjakan.
const citra = siswa("Citra Masih Ujian");
const attHidup = E.mulaiAttempt(citra, berisi);
run(
  `INSERT INTO attempt_subtes (attempt_id, subtes, mulai_at, deadline_at)
   VALUES (?, 'PU', datetime('now','-1 hour'), datetime('now','-30 minutes'))`,
  attHidup.id,
);

// (c) Paket sudah lewat TETAPI satu subtesnya masih berjalan (tenggat di depan).
const lewat2 = paket(
  "UJI-LEWAT-2",
  "utbk",
  "published",
  one("SELECT datetime('now','localtime','-5 day') AS a").a,
  one("SELECT datetime('now','localtime','-1 hour') AS a").a,
);
for (let n = 1; n <= 3; n++) soal(lewat2, "PU", n);
const dedi = siswa("Dedi Masih Berjalan");
const attJalan = E.mulaiAttempt(dedi, lewat2);
run(
  `INSERT INTO attempt_subtes (attempt_id, subtes, mulai_at, deadline_at)
   VALUES (?, 'PU', datetime('now','-10 minutes'), datetime('now','+20 minutes'))`,
  attJalan.id,
);

// (d) Paket yang jendelanya BELUM DIBUKA (soalnya menyusul) — persis keadaan
//     TO-11SEP2026 pada 7 September: sesi terlanjur lahir lewat izin susulan.
const nanti = paket(
  "UJI-NANTI",
  "utbk",
  "published",
  one("SELECT datetime('now','localtime','+4 day') AS a").a,
  one("SELECT datetime('now','localtime','+6 day') AS a").a,
);
const eka = siswa("Eka Paket Belum Dibuka");
const attNanti = E.mulaiAttempt(eka, nanti);

const daftar = A.ujianTerbengkalai();
const idTerbengkalai = new Set(daftar.map((d) => d.attempt_id));

periksa(
  "pengerjaan pada paket yang jendelanya lewat & waktunya habis IKUT tersapu",
  idTerbengkalai.has(attLewat.id),
);
// Citra ada di paket berisi yang jendelanya MASIH terbuka, tetapi paket itu
// hanya punya satu subtes dan subtes itu sudah ia buka serta lewat tenggatnya.
// Tidak ada lagi yang bisa ia lanjutkan, jadi ia memang terbengkalai — jendela
// yang masih terbuka saja tidak cukup untuk melindunginya. Yang melindungi
// adalah adanya subtes yang belum dibuka; lihat bagian 3b.
periksa(
  "jendela masih buka TAPI seluruh subtesnya sudah lewat: tetap tersapu",
  idTerbengkalai.has(attHidup.id),
);
periksa(
  "pengerjaan yang salah satu subtesnya MASIH BERJALAN tidak tersapu, walau jendela paket lewat",
  !idTerbengkalai.has(attJalan.id),
);
periksa(
  "pengerjaan pada paket TANPA SOAL tidak pernah tersapu — peserta menunggu, bukan terbengkalai",
  !idTerbengkalai.has(attNanti.id),
);

const baris = daftar.find((d) => d.attempt_id === attLewat.id);
periksa(
  "daftarnya membawa jumlah jawaban, supaya pengelola tahu ada yang akan dinilai",
  baris?.jumlah_jawaban === 1,
  "dapat " + baris?.jumlah_jawaban,
);
periksa("daftarnya membawa nama peserta", baris?.nama === "Budi Terbengkalai");

const hanyaSatuPaket = A.ujianTerbengkalai(lewat).map((d) => d.attempt_id);
periksa(
  "saringan per paket bekerja",
  hanyaSatuPaket.length === 1 && hanyaSatuPaket[0] === attLewat.id,
  "dapat " + hanyaSatuPaket.join(", "),
);

/* ------------------------------------------------------------------ */
console.log("\n3b. Jendela MASIH BUKA: yang boleh kembali tidak boleh ditutup");
/* ------------------------------------------------------------------ */

// Inilah celah yang terlihat dari papan Skor Live: peserta menutup peramban di
// tengah tryout yang jendelanya MASIH BERJALAN. Timernya mati, tetapi statusnya
// tetap `ongoing`, dan papan live dulu menulis "Mengerjakan" dengan titik
// berdenyut untuk kursi yang sudah kosong.
//
// Bedanya dengan yang benar-benar terbengkalai ada pada satu hal: masih adakah
// subtes yang belum pernah dibuka. Kalau masih ada, peserta berhak kembali dan
// keadaanUjian() akan menyalakan timer berikutnya untuknya.
const bukaLuas = paket("UJI-BUKA-LUAS", "utbk", "published", jw.a, jw.b);
for (const kode of ["PU", "PPU"]) for (let n = 1; n <= 2; n++) soal(bukaLuas, kode, n);

// (e) Baru satu dari dua subtes yang dibuka, tenggatnya lewat, jendela masih buka.
const fajar = siswa("Fajar Masih Boleh Lanjut");
const attFajar = E.mulaiAttempt(fajar, bukaLuas);
run(
  `INSERT INTO attempt_subtes (attempt_id, subtes, mulai_at, deadline_at, selesai_at)
   VALUES (?, 'PU', datetime('now','-3 hour'), datetime('now','-2 hour'), datetime('now','-2 hour'))`,
  attFajar.id,
);

// (f) KEDUA subtesnya sudah dibuka dan dua-duanya lewat: tidak ada lagi yang
//     bisa dilanjutkan, walau jendela paketnya masih terbuka.
const gita = siswa("Gita Sudah Habis Semua");
const attGita = E.mulaiAttempt(gita, bukaLuas);
for (const kode of ["PU", "PPU"]) {
  run(
    `INSERT INTO attempt_subtes (attempt_id, subtes, mulai_at, deadline_at)
     VALUES (?, ?, datetime('now','-3 hour'), datetime('now','-2 hour'))`,
    attGita.id,
    kode,
  );
}

const terb2 = new Set(A.ujianTerbengkalai(bukaLuas).map((d) => d.attempt_id));
const jeda2 = new Set(A.ujianJeda(bukaLuas).map((d) => d.attempt_id));

periksa(
  "peserta yang masih punya subtes belum dibuka masuk JEDA, bukan terbengkalai",
  jeda2.has(attFajar.id) && !terb2.has(attFajar.id),
);
periksa(
  "peserta yang seluruh subtesnya sudah lewat masuk TERBENGKALAI walau jendela masih buka",
  terb2.has(attGita.id) && !jeda2.has(attGita.id),
);
periksa(
  "menutup paket ini tidak menyentuh yang sedang jeda",
  A.tutupUjianTerbengkalai(bukaLuas).jumlah === 1 &&
    E.getAttempt(attFajar.id).status === "ongoing" &&
    E.getAttempt(attGita.id).status === "finished",
);
// Papan live diperiksa LEBIH DULU, sebelum peserta jeda itu dibangunkan:
// keadaanUjian() dengan mulaiOtomatis akan MENYALAKAN timer subtes berikutnya,
// dan sesudah itu ia memang benar-benar sedang mengerjakan.
const papan = L.papanLive(bukaLuas);
const barisFajar = papan.find((b) => b.attemptId === attFajar.id);
periksa(
  "papan live: yang jeda TIDAK ditandai timer berjalan",
  barisFajar?.timerJalan === false,
);
const ringkasBuka = L.ringkasLive(papan);
periksa(
  "hitungan 'Sedang Ujian' tidak lagi memasukkan peserta tanpa timer",
  ringkasBuka.sedangUjian === 0,
  "dapat " + ringkasBuka.sedangUjian,
);
periksa(
  "yang timernya mati dihitung terpisah",
  ringkasBuka.timerMati >= 1,
  "dapat " + ringkasBuka.timerMati,
);

// Barulah peserta jeda itu dibangunkan: haknya melanjutkan harus utuh.
periksa(
  "yang jeda tetap bisa melanjutkan sesudah penutupan itu",
  (() => {
    const k = E.keadaanUjian(attFajar.id, { mulaiOtomatis: true });
    return k !== null && k.selesai === false && k.subtes === "PPU";
  })(),
);
periksa(
  "sesudah dilanjutkan, timernya menyala dan ia kembali terbaca sedang mengerjakan",
  L.papanLive(bukaLuas).find((b) => b.attemptId === attFajar.id)?.timerJalan === true,
);

// Peserta yang timernya BENAR-BENAR berjalan tetap terbaca sedang mengerjakan.
const hana = siswa("Hana Sedang Ujian Sungguhan");
const attHana = E.mulaiAttempt(hana, bukaLuas);
run(
  `INSERT INTO attempt_subtes (attempt_id, subtes, mulai_at, deadline_at)
   VALUES (?, 'PU', datetime('now','-5 minutes'), datetime('now','+25 minutes'))`,
  attHana.id,
);
// Paket yang soalnya belum diunggah punya lencananya sendiri: bukan "waktu
// habis", karena tidak pernah ada waktu yang berjalan untuknya.
const papanNanti = L.papanLive(nanti);
const barisEka = papanNanti.find((b) => b.attemptId === attNanti.id);
periksa(
  "papan live: paket tanpa soal ditandai MENUNGGU SOAL, bukan waktu habis",
  barisEka?.menungguSoal === true && barisEka?.timerJalan === false,
);
periksa(
  "ia juga tidak dihitung sebagai sedang ujian",
  L.ringkasLive(papanNanti).sedangUjian === 0,
);

const papan2 = L.papanLive(bukaLuas);
const barisHana = papan2.find((b) => b.attemptId === attHana.id);
periksa("papan live: yang timernya berjalan tetap ditandai aktif", barisHana?.timerJalan === true);
periksa(
  "ia TIDAK ikut terbengkalai maupun jeda",
  !A.ujianTerbengkalai(bukaLuas).some((d) => d.attempt_id === attHana.id) &&
    !A.ujianJeda(bukaLuas).some((d) => d.attempt_id === attHana.id),
);
periksa(
  "hitungan 'Sedang Ujian' menghitung yang timernya menyala saja",
  L.ringkasLive(papan2).sedangUjian === 2,
  "dapat " + L.ringkasLive(papan2).sedangUjian,
);

/* ------------------------------------------------------------------ */
console.log("\n4. Menutupnya menilai, bukan membuang");
/* ------------------------------------------------------------------ */

const hasilTutup = A.tutupUjianTerbengkalai(lewat);
periksa("satu pengerjaan tertutup", hasilTutup.jumlah === 1, "dapat " + hasilTutup.jumlah);
periksa(
  "paket tanpa soal tetap tidak tersentuh walau ikut disapu seluruh paket",
  A.tutupUjianTerbengkalai().jumlah >= 0 && E.getAttempt(attNanti.id).status === "ongoing",
);
periksa(
  "statusnya berubah menjadi finished",
  E.getAttempt(attLewat.id).status === "finished",
);
periksa(
  "jawaban peserta TIDAK dihapus — pekerjaannya tetap utuh",
  one("SELECT COUNT(*) AS n FROM answers WHERE attempt_id = ?", attLewat.id).n === 1,
);
periksa(
  "subtes yang menggantung ikut ditutup",
  one(
    "SELECT COUNT(*) AS n FROM attempt_subtes WHERE attempt_id = ? AND selesai_at IS NULL",
    attLewat.id,
  ).n === 0,
);
periksa(
  "sesudah ditutup ia tidak muncul lagi di daftar",
  !A.ujianTerbengkalai().some((d) => d.attempt_id === attLewat.id),
);
periksa(
  "yang timernya masih berjalan dan yang menunggu soal tidak ikut tersentuh",
  E.getAttempt(attJalan.id).status === "ongoing" &&
    E.getAttempt(attNanti.id).status === "ongoing",
);

/* ------------------------------------------------------------------ */
if (gagal > 0) {
  console.log(`\n${gagal} pemeriksaan GAGAL.`);
  process.exit(1);
}
console.log("\nSemua pemeriksaan paket kosong & pengerjaan terbengkalai lulus.");
