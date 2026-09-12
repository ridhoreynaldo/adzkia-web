/**
 * Pengujian DAFTAR PESERTA PER PAKET dan pembukaan UJIAN SUSULAN massal.
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/peserta-paket-check.mjs
 *
 * Yang diperiksa:
 *
 *   1. PAKET TANPA PEMBATAS TERBUKA UNTUK SEMUA. Ini syarat mutlak: seluruh
 *      paket yang sudah ada sebelum fitur ini tidak punya satu pun baris
 *      pembatas, dan tidak boleh ikut terkunci pada pembaruan pertama.
 *   2. Pembatas per KELAS, termasuk pencocokan yang mengabaikan besar-kecil
 *      huruf dan spasi tepi — data asli sekolah memuat "XII HARVARD" dan
 *      "XII Harvard" berdampingan.
 *   3. Pembatas per NAMA, yang menembus walau kelasnya tidak dicentang.
 *   4. Beranda siswa ikut menyaring, dan izin susulan menembus pembatas.
 *   5. Daftar kelas untuk panel admin: varian ejaan digabung jadi satu baris.
 *   6. Pembukaan ujian susulan massal untuk seluruh peserta yang gugur.
 *   7. DIBUKA vs UJIAN SUSULAN. Keduanya memulihkan peserta yang digugurkan,
 *      tetapi akibatnya berlawanan: "Dibuka" MELANJUTKAN dari subtes yang tadi
 *      terpotong tanpa menghapus jawaban, sedangkan susulan MENGULANG DARI NOL.
 *      Diperiksa juga penggeseran tenggat selama peserta terblokir, dan naiknya
 *      nomor ronde supaya pelanggaran lama tidak langsung menggugurkan lagi.
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
const TMP = path.join(AKAR, ".tmp", "cek", "peserta-paket");

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
const P = await muat("pelanggaran");
const { all, one, run } = dbMod;

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

const siswa = (nama, kelas) => {
  const r = run(
    `INSERT INTO users (nama, email, password_hash, role, kelas, nisn)
     VALUES (?, ?, 'x', 'siswa', ?, ?)`,
    nama,
    `${nama.replace(/\s+/g, ".").toLowerCase()}@uji.test`,
    kelas,
    String(1000 + Math.floor(Math.random() * 89999)),
  );
  return Number(r.lastInsertRowid);
};

// Paket terbit dengan jendela yang mencakup hari ini.
run(
  `INSERT INTO packages (kode, nama, jalur, status, mulai_at, selesai_at)
   VALUES ('UJI-ROSTER', 'Paket Uji Daftar Peserta', 'utbk', 'published',
           datetime('now','localtime','-1 day'), datetime('now','localtime','+1 day'))`,
);
const paketId = one("SELECT id FROM packages WHERE kode = 'UJI-ROSTER'").id;

const andi = siswa("Andi Harvard", "XII HARVARD");
// Ejaan berbeda pada kelas yang sama — inilah yang ada di data asli sekolah.
const budi = siswa("Budi Harvard Kecil", "XII Harvard");
// Spasi tepi, yang juga muncul pada data hasil impor Excel.
const citra = siswa("Citra Spasi", "  XII HARVARD  ");
const dedi = siswa("Dedi Monash", "XII MONASH");
const eka = siswa("Eka Tanpa Kelas", null);

/* ------------------------------------------------------------------ */
console.log("\n1. Paket tanpa pembatas terbuka untuk semua");
/* ------------------------------------------------------------------ */

periksa("paket baru belum dibatasi", E.paketDibatasi(paketId) === false);
for (const [nama, id] of [
  ["Andi", andi],
  ["Dedi", dedi],
  ["Eka (tanpa kelas)", eka],
]) {
  periksa(`${nama} boleh ikut selagi belum ada pembatas`, E.pesertaDiizinkan(id, paketId) === true);
}

/* ------------------------------------------------------------------ */
console.log("\n2. Pembatas per kelas");
/* ------------------------------------------------------------------ */

A.setelKelasPaket(paketId, ["XII HARVARD"]);
periksa("paket berubah menjadi dibatasi", E.paketDibatasi(paketId) === true);
periksa("Andi (XII HARVARD) boleh", E.pesertaDiizinkan(andi, paketId) === true);
periksa(
  "Budi (XII Harvard, beda besar-kecil huruf) tetap boleh",
  E.pesertaDiizinkan(budi, paketId) === true,
);
periksa(
  "Citra (kelas berspasi tepi) tetap boleh",
  E.pesertaDiizinkan(citra, paketId) === true,
);
periksa("Dedi (XII MONASH) TIDAK boleh", E.pesertaDiizinkan(dedi, paketId) === false);
periksa("Eka (tanpa kelas) TIDAK boleh", E.pesertaDiizinkan(eka, paketId) === false);

/* ------------------------------------------------------------------ */
console.log("\n3. Pembatas per nama, di luar kelas");
/* ------------------------------------------------------------------ */

const res = A.tambahPesertaPaket(paketId, eka);
periksa("menambah peserta tidak menghasilkan galat", !res.error, res.error ?? "");
periksa("Eka jadi boleh walau kelasnya kosong", E.pesertaDiizinkan(eka, paketId) === true);
periksa("Dedi tetap TIDAK boleh", E.pesertaDiizinkan(dedi, paketId) === false);

A.tambahPesertaPaket(paketId, eka);
periksa(
  "menambah orang yang sama dua kali tidak menggandakan baris",
  A.pesertaPaket(paketId).filter((p) => p.user_id === eka).length === 1,
);

A.hapusPesertaPaket(paketId, eka);
periksa("sesudah dikeluarkan, Eka tidak boleh lagi", E.pesertaDiizinkan(eka, paketId) === false);

/* ------------------------------------------------------------------ */
console.log("\n4. Beranda siswa ikut menyaring");
/* ------------------------------------------------------------------ */

const kodePaket = (userId) => E.daftarPaketSiswa(userId).map((p) => p.kode);

periksa("Andi melihat paketnya di beranda", kodePaket(andi).includes("UJI-ROSTER"));
periksa("Dedi TIDAK melihat paketnya di beranda", !kodePaket(dedi).includes("UJI-ROSTER"));

const paketRow = E.getPaket(paketId);
periksa("Andi boleh membuka paketnya", E.paketDapatDikerjakan(paketRow, andi) === true);
periksa(
  "Dedi ditolak walau membuka tautan langsung",
  E.paketDapatDikerjakan(paketRow, dedi) === false,
);

// Izin susulan adalah keputusan pengelola atas nama satu orang, jadi ia
// menembus pembatas daftar peserta.
A.beriIzinSusulan(dedi, paketId, andi, "uji");
periksa(
  "Dedi melihat paketnya lagi begitu diberi izin susulan",
  kodePaket(dedi).includes("UJI-ROSTER"),
);
A.cabutIzinSusulan(dedi, paketId);
periksa("dan hilang lagi begitu izinnya dicabut", !kodePaket(dedi).includes("UJI-ROSTER"));

/* ------------------------------------------------------------------ */
console.log("\n5. Daftar kelas untuk panel admin");
/* ------------------------------------------------------------------ */

const kelas = A.daftarKelas(paketId);
const harvard = kelas.filter((k) => k.kelas.toUpperCase() === "XII HARVARD");
periksa("varian ejaan XII HARVARD digabung jadi SATU baris", harvard.length === 1,
  "dapat " + harvard.length);
periksa("jumlahnya menghitung seluruh varian ejaan", harvard[0]?.jumlah === 3,
  "dapat " + harvard[0]?.jumlah);
periksa("kelas yang sudah dicentang ditandai terpilih", harvard[0]?.terpilih === 1 || harvard[0]?.terpilih === true);
periksa(
  "kelas lain tidak ikut tertandai",
  kelas.find((k) => k.kelas.toUpperCase() === "XII MONASH")?.terpilih === 0,
);

const diizinkan = A.pesertaDiizinkanPaket(paketId);
periksa("rekap 'yang boleh ikut' memuat ketiga anak XII HARVARD", diizinkan.length === 3,
  "dapat " + diizinkan.length);
periksa(
  "semuanya ditandai ikut lewat kelas",
  diizinkan.every((p) => p.lewat_kelas === 1 || p.lewat_kelas === true),
);

/* ------------------------------------------------------------------ */
console.log("\n6. Membuka kembali untuk semua");
/* ------------------------------------------------------------------ */

A.bukaPaketUntukSemua(paketId);
periksa("pembatas terbuang", E.paketDibatasi(paketId) === false);
periksa("Dedi boleh lagi", E.pesertaDiizinkan(dedi, paketId) === true);
periksa("daftar nama ikut kosong", A.pesertaPaket(paketId).length === 0);

/* ------------------------------------------------------------------ */
console.log("\n7. Ujian susulan massal untuk peserta yang gugur");
/* ------------------------------------------------------------------ */

const gugurkan = (userId) => {
  run(
    `INSERT INTO attempts (user_id, package_id, status, digugurkan_at, alasan_gugur)
     VALUES (?, ?, 'gugur', datetime('now','localtime'), 'uji')`,
    userId,
    paketId,
  );
};
gugurkan(andi);
gugurkan(budi);
gugurkan(dedi);
// Citra menyelesaikan ujiannya — nilainya sah, jadi tidak boleh ikut dibuka.
run(
  `INSERT INTO attempts (user_id, package_id, status, finished_at, total_skor)
   VALUES (?, ?, 'finished', datetime('now'), 500)`,
  citra,
  paketId,
);

periksa("ketiga peserta gugur terbaca", A.pesertaGugur(paketId).length === 3);
periksa(
  "belum satu pun punya izin",
  A.pesertaGugur(paketId).every((g) => !g.sudah_izin),
);

const massal = A.beriIzinSusulanMassal(paketId, andi, "uji massal");
periksa("izin diberikan ke 3 peserta sekaligus", massal.jumlah === 3, "dapat " + massal.jumlah);
periksa(
  "seluruh peserta gugur kini punya izin",
  A.pesertaGugur(paketId).every((g) => g.sudah_izin),
);
periksa(
  "peserta yang SELESAI tidak ikut dibukakan",
  A.izinSusulanPeserta(citra).length === 0,
);

const ulang = A.beriIzinSusulanMassal(paketId, andi, "uji massal");
periksa("menjalankan ulang tidak memberi izin ganda", ulang.jumlah === 0, "dapat " + ulang.jumlah);

// Ronde lama tidak boleh menghapus jejaknya: susulan menyetel ulang attempt.
const sebelum = one("SELECT ronde FROM attempts WHERE user_id = ? AND package_id = ?", andi, paketId);
E.mulaiSusulan(andi, paketId);
const sesudah = one("SELECT status, ronde, jalur FROM attempts WHERE user_id = ? AND package_id = ?", andi, paketId);
periksa("attempt yang gugur kembali berjalan", sesudah.status === "ongoing");
periksa("ditandai sebagai jalur susulan", sesudah.jalur === "susulan");
periksa("nomor rondenya naik satu", sesudah.ronde === sebelum.ronde + 1);

/* ------------------------------------------------------------------ */
console.log("\n8. DIBUKA — peserta terblokir MELANJUTKAN, bukan mengulang");
/* ------------------------------------------------------------------ */

// Paket kedua dengan soal sungguhan, supaya urutan subtes dan `keadaanUjian`
// bisa diperiksa apa adanya.
run(
  `INSERT INTO packages (kode, nama, jalur, status, mulai_at, selesai_at)
   VALUES ('UJI-BLOKIR', 'Paket Uji Buka Blokir', 'utbk', 'published',
           datetime('now','localtime','-1 day'), datetime('now','localtime','+1 day'))`,
);
const paketBlokir = one("SELECT id FROM packages WHERE kode = 'UJI-BLOKIR'").id;
for (const [subtes, nomor] of [
  ["PU", 1], ["PU", 2], ["PPU", 1], ["PPU", 2], ["PBM", 1],
]) {
  run(
    `INSERT INTO questions (package_id, subtes, nomor, tipe, pertanyaan, opsi, kunci)
     VALUES (?, ?, ?, 'PG', 'soal uji', '["a","b","c","d","e"]', 'A')`,
    paketBlokir,
    subtes,
    nomor,
  );
}

const fani = siswa("Fani Terblokir", "XII MIT");
const att = E.mulaiAttempt(fani, paketBlokir);

// Peserta menyelesaikan PU, lalu terhenti di tengah PPU.
run(
  `INSERT INTO attempt_subtes (attempt_id, subtes, mulai_at, deadline_at, selesai_at)
   VALUES (?, 'PU', datetime('now','-40 minutes'), datetime('now','-10 minutes'), datetime('now','-10 minutes'))`,
  att.id,
);
run(
  `INSERT INTO attempt_subtes (attempt_id, subtes, mulai_at, deadline_at)
   VALUES (?, 'PPU', datetime('now','-10 minutes'), datetime('now','+10 minutes'))`,
  att.id,
);
const soalPPU = all("SELECT id FROM questions WHERE package_id = ? AND subtes = 'PPU'", paketBlokir);
for (const q of soalPPU) {
  run("INSERT INTO answers (attempt_id, question_id, jawaban) VALUES (?, ?, 'B')", att.id, q.id);
}
run(
  "INSERT INTO violations (attempt_id, user_id, package_id, subtes, jenis, urutan, ronde) VALUES (?,?,?,'PPU','keluar_layar_penuh',1,1)",
  att.id,
  fani,
  paketBlokir,
);
run(
  "INSERT INTO violations (attempt_id, user_id, package_id, subtes, jenis, urutan, ronde) VALUES (?,?,?,'PPU','keluar_layar_penuh',2,1)",
  att.id,
  fani,
  paketBlokir,
);

// Jaringan putus, peserta keluar halaman, sistem menggugurkannya 5 menit lalu.
E.gugurkanUjian(att.id, "uji: keluar halaman");
run(
  "UPDATE attempts SET digugurkan_at = datetime('now','localtime','-5 minutes') WHERE id = ?",
  att.id,
);

const sebelumBuka = one("SELECT status, ronde FROM attempts WHERE id = ?", att.id);
periksa("pengerjaan memang berstatus gugur", sebelumBuka.status === "gugur");
periksa(
  "subtes PPU ikut tertutup oleh pengguguran",
  one("SELECT selesai_at FROM attempt_subtes WHERE attempt_id = ? AND subtes = 'PPU'", att.id)
    .selesai_at !== null,
);

const rekapGugur = A.pesertaGugur(paketBlokir).find((g) => g.user_id === fani);
periksa("laporan admin menyebut subtes tempat ia terhenti", rekapGugur?.subtes_terhenti === "PPU",
  "dapat " + rekapGugur?.subtes_terhenti);
periksa("laporan admin menghitung jawaban yang sudah terisi", rekapGugur?.jumlah_jawaban === 2,
  "dapat " + rekapGugur?.jumlah_jawaban);

const tenggatLama = one(
  "SELECT deadline_at FROM attempt_subtes WHERE attempt_id = ? AND subtes = 'PPU'",
  att.id,
).deadline_at;

const hasilBuka = A.bukaBlokirUjian(fani, paketBlokir, fani);
periksa("pembukaan tidak menghasilkan galat", !hasilBuka.error, hasilBuka.error ?? "");
periksa("yang dibuka adalah subtes PPU", hasilBuka.subtes === "PPU", "dapat " + hasilBuka.subtes);

const sesudahBuka = one("SELECT status, ronde, digugurkan_at, alasan_gugur, denyut_at FROM attempts WHERE id = ?", att.id);
periksa("pengerjaan kembali berjalan", sesudahBuka.status === "ongoing");
periksa("alasan gugur dibersihkan", sesudahBuka.digugurkan_at === null && sesudahBuka.alasan_gugur === null);
periksa("nomor ronde naik satu", sesudahBuka.ronde === sebelumBuka.ronde + 1);
periksa("denyut ronde lama dilupakan", sesudahBuka.denyut_at === null);

// INI yang membedakannya dari Ujian Susulan.
periksa(
  "JAWABAN TIDAK DIHAPUS",
  one("SELECT COUNT(*) AS n FROM answers WHERE attempt_id = ?", att.id).n === 2,
);
periksa(
  "subtes PU yang sudah selesai TETAP tertutup",
  one("SELECT selesai_at FROM attempt_subtes WHERE attempt_id = ? AND subtes = 'PU'", att.id)
    .selesai_at !== null,
);
periksa(
  "subtes PPU dibuka kembali",
  one("SELECT selesai_at FROM attempt_subtes WHERE attempt_id = ? AND subtes = 'PPU'", att.id)
    .selesai_at === null,
);

const tenggatBaru = one(
  "SELECT deadline_at FROM attempt_subtes WHERE attempt_id = ? AND subtes = 'PPU'",
  att.id,
).deadline_at;
const geser = one(
  "SELECT CAST(strftime('%s',?) - strftime('%s',?) AS INTEGER) AS d",
  tenggatBaru,
  tenggatLama,
).d;
periksa(
  "tenggat digeser sepanjang masa terblokir (±5 menit)",
  geser >= 280 && geser <= 320,
  "digeser " + geser + " detik",
);

// Pelanggaran ronde lama tersimpan sebagai riwayat, tapi tidak lagi menghitung.
periksa(
  "catatan pelanggaran lama TIDAK dihapus",
  one("SELECT COUNT(*) AS n FROM violations WHERE attempt_id = ?", att.id).n === 2,
);
periksa(
  "tetapi tidak lagi ikut dihitung pada ronde baru",
  P.jumlahKeluarLayarPenuh(att.id) === 0,
  "dapat " + P.jumlahKeluarLayarPenuh(att.id),
);

// Ruang ujian mengembalikan peserta ke PPU, bukan ke PU.
const keadaan = E.keadaanUjian(att.id);
periksa("peserta dikembalikan ke subtes PPU", keadaan?.subtes === "PPU", "dapat " + keadaan?.subtes);
periksa("bukan ke subtes pertama", keadaan?.subtes !== "PU");
periksa("masih ada sisa waktu", (keadaan?.sisaDetik ?? 0) > 0, "sisa " + keadaan?.sisaDetik);

// Penjagaan terhadap pemakaian yang keliru.
periksa(
  "menolak pengerjaan yang tidak terblokir",
  !!A.bukaBlokirUjian(fani, paketBlokir, fani).error,
);
periksa(
  "menolak peserta yang belum pernah memulai paket ini",
  !!A.bukaBlokirUjian(dedi, paketBlokir, fani).error,
);
run("UPDATE attempts SET status = 'finished' WHERE id = ?", att.id);
periksa(
  "menolak pengerjaan yang sudah selesai dan dinilai",
  !!A.bukaBlokirUjian(fani, paketBlokir, fani).error,
);

/* ------------------------------------------------------------------ */

if (gagal > 0) {
  console.log("\n" + gagal + " pemeriksaan GAGAL.\n");
  process.exit(1);
}
console.log("\nSemua pemeriksaan daftar peserta paket lulus.\n");
