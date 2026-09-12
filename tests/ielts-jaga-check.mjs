/**
 * Pengujian PENJAGAAN UJIAN IELTS.
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/ielts-jaga-check.mjs
 *
 * Yang dijaga berkas ini bukan sekadar "fungsinya jalan", melainkan satu janji
 * yang lebih sempit dan lebih penting: **peserta IELTS berada di bawah aturan
 * yang SAMA PERSIS dengan peserta TryOut UTBK-SNBT.** Dua ruang ujian dengan
 * ambang yang berbeda diam-diam adalah bentuk ketidakadilan yang paling sulit
 * ditemukan, karena keduanya tampak bekerja.
 *
 * Sembilan bagian:
 *
 *   1. AMBANG YANG SAMA. Konstanta yang dibaca ruang ujian IELTS memang
 *      konstanta yang sama dengan milik UTBK — satu berkas, bukan dua salinan.
 *   2. Jenis pelanggaran yang menggugurkan dan yang hanya dicatat sama persis,
 *      dan kalimat layar GAGAL-nya menyebut IELTS, bukan TryOut UTBK.
 *   3. MENCATAT KEPERGIAN. Urutan naik, penanda kejadian menyatukan laporan
 *      kembar sendBeacon+fetch menjadi satu baris.
 *   4. REM LAMA-PERGI. Satu kepergian melewati ambang → naik `pergi_lama`.
 *   5. REM MENUMPUK. Kepergian pendek berkali-kali dijumlahkan sampai anggaran
 *      habis → naik `pergi_menumpuk`. Inilah rem yang paling mudah hilang saat
 *      kode disalin, dan justru yang paling dibutuhkan di iPad.
 *   6. DENYUT NADI. Jeda hanya dinilai bila denyut sebelumnya bersenjata; muat
 *      ulang tetap dinilai, pembongkaran yang disengaja tidak.
 *   7. MENGGUGURKAN. Timer subtes ikut ditutup, alasannya tersimpan, dan
 *      pemanggilan ulang tidak mengubah apa pun.
 *   8. RONDE. Sesi ulang menaikkan ronde, membersihkan jawaban, MENYIMPAN
 *      catatan pelanggaran lama, dan hitungan dimulai dari nol lagi.
 *   9. YANG TIDAK IKUT DIJUMLAHKAN. `denyut_tersendat` (jaringan peserta) dan
 *      `blur_window` tidak boleh memakan anggaran kepergian.
 *
 * Berkas .ts asli dipakai apa adanya — disalin ke folder sementara DI DALAM
 * proyek (supaya node_modules terjangkau) dengan penambahan ekstensi pada
 * impornya, pola yang sama dengan `denyut-check.mjs`.
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
const TMP = path.join(AKAR, ".tmp", "cek", "ielts-jaga");

// Dibersihkan di AWAL saja: Windows masih memegang berkas basis data yang
// terbuka sampai prosesnya berakhir, dan rmSync di akhir melempar EPERM.
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

const { all, one, run } = await muat("db");
const J = await muat("ielts-penjagaan");
const D = await muat("denyut");
const JEN = await muat("pelanggaran-jenis");

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
/* Penyiapan                                                           */
/* ------------------------------------------------------------------ */

run(
  "INSERT INTO users (id, nama, email, password_hash, role, nisn) VALUES (1, 'Siswa IELTS', 'ielts@cek.local', 'x', 'siswa', '0011')",
);
// Tiga paket, karena `ielts_pengerjaan` unik per (peserta, paket): satu sesi
// per bagian pengujian, supaya hitungan anggarannya tidak saling mencemari.
for (const n of [1, 2, 3]) {
  run(
    "INSERT INTO ielts_paket (id, kode, nama, status) VALUES (?, ?, ?, 'published')",
    n,
    "CEK-IELTS-" + n,
    "Paket Cek IELTS " + n,
  );
}
run(
  `INSERT INTO ielts_pengerjaan (id, user_id, paket_id, status, setuju_at, subtes_aktif)
   VALUES (1, 1, 1, 'ongoing', datetime('now'), 'LISTENING')`,
);
run(
  `INSERT INTO ielts_subtes (pengerjaan_id, subtes, deadline_at)
   VALUES (1, 'LISTENING', datetime('now', '+60 minutes'))`,
);

const baris = () => all("SELECT * FROM ielts_pelanggaran WHERE pengerjaan_id = 1 ORDER BY id");
const kerja = () => one("SELECT * FROM ielts_pengerjaan WHERE id = 1");

/** Mundurkan mulai_at sebuah baris, meniru kepergian yang sudah lama. */
const mundurkanMulai = (id, detik) =>
  run(
    "UPDATE ielts_pelanggaran SET mulai_at = datetime('now','localtime', ? || ' seconds') WHERE id = ?",
    "-" + detik,
    id,
  );

/** Mundurkan denyut terakhir, meniru halaman yang membeku. */
const mundurkanDenyut = (detik) =>
  run(
    "UPDATE ielts_pengerjaan SET denyut_at = datetime('now','localtime', ? || ' seconds') WHERE id = 1",
    "-" + detik,
  );

/* ------------------------------------------------------------------ */
console.log("\n1. Ambang IELTS = ambang UTBK, satu berkas");
/* ------------------------------------------------------------------ */

periksa("AMBANG_KEMBALI_DETIK ada dan masuk akal", D.AMBANG_KEMBALI_DETIK === 20);
periksa("BUDGET_PERGI_DETIK = AMBANG_KEMBALI_DETIK", D.BUDGET_PERGI_DETIK === D.AMBANG_KEMBALI_DETIK);
periksa("AMBANG_DENYUT_DETIK = AMBANG_KEMBALI_DETIK", D.AMBANG_DENYUT_DETIK === D.AMBANG_KEMBALI_DETIK);
periksa("AMBANG_DENYUT_TERLIHAT_DETIK = 90", D.AMBANG_DENYUT_TERLIHAT_DETIK === 90);
periksa("MASA_PASTIKAN_FOKUS = 3 detik", D.MASA_PASTIKAN_FOKUS === 3000);

// Kalau baris ini gagal, seseorang menyalin konstantanya alih-alih memakainya.
const sumberHook = fs.readFileSync(
  path.join(AKAR, "src", "components", "language", "usePenjagaIelts.ts"),
  "utf8",
);
periksa(
  "ruang ujian IELTS mengimpor ambangnya dari @/lib/denyut",
  /from "@\/lib\/denyut"/.test(sumberHook),
);
periksa(
  "ruang ujian IELTS memakai penolong peramban bersama, bukan salinannya",
  /from "@\/lib\/penjagaan-peramban"/.test(sumberHook),
);
periksa(
  "tidak ada angka ambang yang ditulis ulang di dalam hook",
  !/=\s*20000?\s*;/.test(sumberHook),
);

/* ------------------------------------------------------------------ */
console.log("\n2. Jenis pelanggaran dan kalimat layar GAGAL");
/* ------------------------------------------------------------------ */

for (const j of [
  "blur_window",
  "esc_layar_penuh",
  "alt_tab",
  "pergi_lama",
  "pergi_menumpuk",
  "denyut_hilang",
  "tangkap_layar",
]) {
  periksa(j + " menggugurkan", JEN.menggugurkan(j) === true);
}
for (const j of ["keluar_tab", "keluar_layar_penuh", "denyut_tersendat", "salin", "klik_kanan"]) {
  periksa(j + " hanya dicatat", JEN.menggugurkan(j) === false);
}

periksa("namaUjian('ielts') = IELTS", JEN.namaUjian("ielts") === "IELTS");
const pesanIelts = JEN.pesanGugurJenis("ielts", "pergi_menumpuk");
periksa("kalimat GAGAL IELTS menyebut IELTS", pesanIelts.includes("IELTS"));
periksa(
  "kalimat GAGAL IELTS TIDAK menyebut TryOut UTBK",
  !pesanIelts.includes("TryOut Real UTBK"),
);
periksa(
  "kalimat GAGAL menyebut angka anggaran yang sebenarnya",
  pesanIelts.includes(String(D.BUDGET_PERGI_DETIK)),
);

/* ------------------------------------------------------------------ */
console.log("\n3. Mencatat kepergian");
/* ------------------------------------------------------------------ */

const k1 = J.catatKeluarIelts(1, 1, 1, "LISTENING", "keluar_tab", "kej-1");
periksa("kepergian pertama berurutan 1", k1.urutan === 1 && k1.kembar === false);

const k1b = J.catatKeluarIelts(1, 1, 1, "LISTENING", "keluar_tab", "kej-1");
periksa("laporan kembar (sendBeacon + fetch) menjadi SATU baris", k1b.id === k1.id && k1b.kembar);
periksa("dan tidak melahirkan baris kedua", baris().length === 1);

const tanpaPenanda = J.catatKeluarIelts(1, 1, 1, "LISTENING", "keluar_tab", null);
periksa("laporan tanpa penanda tetap berdiri sendiri", tanpaPenanda.urutan === 2);
periksa("subtes ikut tercatat", baris()[0].subtes === "LISTENING");

J.catatPercobaanIelts(1, 1, 1, "LISTENING", "klik_kanan", "contextmenu", "kej-p1");
J.catatPercobaanIelts(1, 1, 1, "LISTENING", "klik_kanan", "contextmenu", "kej-p1");
periksa("percobaan curang kembar juga menyatu", J.jumlahPelanggaranIelts(1) === 3);

/* ------------------------------------------------------------------ */
console.log("\n4. Rem lama-pergi: satu kepergian melewati ambang");
/* ------------------------------------------------------------------ */

mundurkanMulai(k1.id, 45);
const durasi1 = J.catatKembaliIelts(k1.id, 1);
periksa("durasi terukur apa adanya", durasi1 >= 44 && durasi1 <= 46, "dapat " + durasi1);
periksa("45 detik melewati ambang", durasi1 > D.AMBANG_KEMBALI_DETIK);
periksa("barisnya naik menjadi pergi_lama", J.naikkanPergiLamaIelts(k1.id, 1) === true);
periksa("jenisnya berubah di basis data", baris()[0].jenis === "pergi_lama");
periksa(
  "keterangan menyebut lamanya, supaya pengawas tidak perlu menghitung",
  String(baris()[0].keterangan).includes(String(durasi1) + " detik"),
);
periksa(
  "menaikkan baris yang sudah bukan keluar_tab tidak menimpa sebabnya",
  J.naikkanPergiLamaIelts(k1.id, 1) === false,
);

/* ------------------------------------------------------------------ */
console.log("\n5. Rem menumpuk: kepergian pendek dijumlahkan");
/* ------------------------------------------------------------------ */

// Sesi baru supaya hitungannya bersih.
run(
  `INSERT INTO ielts_pengerjaan (id, user_id, paket_id, status, setuju_at)
   VALUES (2, 1, 2, 'ongoing', datetime('now'))`,
);
const pendek = [];
for (let i = 0; i < 4; i++) {
  const b = J.catatKeluarIelts(2, 1, 2, "READING", "keluar_tab", "kej-p" + i);
  mundurkanMulai(b.id, 6);
  J.catatKembaliIelts(b.id, 2);
  pendek.push(b);
}
const total = J.totalDetikKepergianIelts(2);
periksa(
  "empat kepergian ~6 detik dijumlahkan, bukan dihitung ulang dari nol",
  total >= 22 && total <= 30,
  "dapat " + total,
);
periksa("dan itu melewati anggaran " + D.BUDGET_PERGI_DETIK, total >= D.BUDGET_PERGI_DETIK);

const terakhir = pendek[pendek.length - 1];
periksa(
  "baris terakhir naik menjadi pergi_menumpuk",
  J.naikkanPergiMenumpukIelts(terakhir.id, 2, total) === true,
);
const brsMenumpuk = one("SELECT * FROM ielts_pelanggaran WHERE id = ?", terakhir.id);
periksa("jenisnya tercatat", brsMenumpuk.jenis === "pergi_menumpuk");
periksa(
  "keterangannya membawa jumlahnya, bukan cuma satu kepergian",
  String(brsMenumpuk.keterangan).includes("Jumlah seluruh kepergian"),
);

// Pola bolak-baliknya ikut ditulis ke baris yang TIDAK naik.
const b5 = J.catatKeluarIelts(2, 1, 2, "READING", "keluar_tab", "kej-p9");
J.tandaiTotalKepergianIelts(b5.id, 2, 11, D.BUDGET_PERGI_DETIK);
periksa(
  "sisa anggaran ikut ditulis ke keterangan barisnya",
  String(one("SELECT keterangan FROM ielts_pelanggaran WHERE id = ?", b5.id).keterangan).includes(
    "11/" + D.BUDGET_PERGI_DETIK,
  ),
);

/* ------------------------------------------------------------------ */
console.log("\n6. Denyut nadi");
/* ------------------------------------------------------------------ */

periksa("denyut pertama dari balik gerbang tidak menuduh", J.catatDenyutIelts(1, false) === null);
periksa("tercatat TIDAK bersenjata", kerja().denyut_aktif === 0);
periksa("denyut bersenjata pertama juga belum menuduh", J.catatDenyutIelts(1, true) === null);
periksa("sekarang tercatat bersenjata", kerja().denyut_aktif === 1);

const rapat = J.catatDenyutIelts(1, true);
periksa("dua denyut beruntun: jeda nyaris nol", rapat !== null && rapat <= 1, "dapat " + rapat);

mundurkanDenyut(35);
const jeda35 = J.catatDenyutIelts(1, true);
periksa("jeda 35 detik terukur", jeda35 >= 34 && jeda35 <= 36, "dapat " + jeda35);
periksa("35 detik melewati ambang denyut", jeda35 > D.AMBANG_DENYUT_DETIK);

// MUAT ULANG tidak menghapus jejak: denyut pertama sesudahnya tetap dinilai.
mundurkanDenyut(40);
const setelahMuatUlang = J.catatDenyutIelts(1, false, true);
periksa(
  "denyut pertama sesudah MUAT ULANG tetap dinilai",
  setelahMuatUlang >= 39 && setelahMuatUlang <= 41,
  "dapat " + setelahMuatUlang,
);

// Pembongkaran yang DISENGAJA menghapus jejaknya.
J.catatDenyutIelts(1, true);
mundurkanDenyut(50);
periksa(
  "pembongkaran yang disengaja (menutup subtes) tidak menuduh",
  J.catatDenyutIelts(1, false, false) === null,
);

const idHilang = J.catatDenyutHilangIelts(1, 1, 1, "LISTENING", 47);
const brsHilang = one("SELECT * FROM ielts_pelanggaran WHERE id = ?", idHilang);
periksa("baris denyut_hilang tertutup lengkap dengan durasinya", brsHilang.durasi_detik === 47);
periksa("jenisnya menggugurkan", JEN.menggugurkan(brsHilang.jenis));

const idSendat = J.catatDenyutTersendatIelts(1, 1, 1, "LISTENING", 40, 5);
periksa(
  "denyut_tersendat TIDAK menggugurkan",
  JEN.menggugurkan(one("SELECT jenis FROM ielts_pelanggaran WHERE id = ?", idSendat).jenis) ===
    false,
);

/* ------------------------------------------------------------------ */
console.log("\n7. Menggugurkan");
/* ------------------------------------------------------------------ */

const alasan = JEN.pesanGugurJenis("ielts", "pergi_lama");
periksa("gugurkanIelts berhasil sekali", J.gugurkanIelts(1, alasan) === true);
periksa("statusnya gugur", kerja().status === "gugur");
periksa("alasannya tersimpan apa adanya", kerja().alasan_gugur === alasan);
periksa("waktunya tercatat", Boolean(kerja().digugurkan_at));
periksa("subtes aktif dilepas", kerja().subtes_aktif === null);
periksa(
  "timer subtes yang masih terbuka ikut ditutup",
  Boolean(
    one("SELECT selesai_at FROM ielts_subtes WHERE pengerjaan_id = 1 AND subtes = 'LISTENING'")
      .selesai_at,
  ),
);
periksa("memanggil ulang tidak mengubah apa pun (idempoten)", J.gugurkanIelts(1, "lain") === false);
periksa("alasannya tidak tertimpa", kerja().alasan_gugur === alasan);

/* ------------------------------------------------------------------ */
console.log("\n8. Sesi ulang: ronde naik, bukti tetap tersimpan");
/* ------------------------------------------------------------------ */

const sebelumSesiUlang = baris().length;
run("INSERT INTO ielts_seksi (id, paket_id, subtes, nomor) VALUES (1, 1, 'LISTENING', 1)");
run(
  "INSERT INTO ielts_soal (id, paket_id, seksi_id, subtes, nomor, tipe, pertanyaan) VALUES (1, 1, 1, 'LISTENING', 1, 'IS', 'x')",
);
run("INSERT INTO ielts_jawaban (pengerjaan_id, soal_id, jawaban) VALUES (1, 1, 'lama')");

periksa("sesi ulang berhasil", J.bukaSusulanIelts(1) === true);
periksa("statusnya kembali ongoing", kerja().status === "ongoing");
periksa("rondenya naik menjadi 2", kerja().ronde === 2);
periksa("alasan gugur dibersihkan", kerja().alasan_gugur === null);
periksa("denyut dilupakan supaya tidak langsung gugur", kerja().denyut_at === null);
periksa(
  "jawaban lama dihapus",
  all("SELECT * FROM ielts_jawaban WHERE pengerjaan_id = 1").length === 0,
);
periksa(
  "timer subtes lama dihapus",
  all("SELECT * FROM ielts_subtes WHERE pengerjaan_id = 1").length === 0,
);
periksa("CATATAN PELANGGARAN ronde lama TETAP tersimpan", baris().length === sebelumSesiUlang);
periksa("tetapi hitungannya mulai dari nol lagi", J.jumlahPelanggaranIelts(1) === 0);
periksa("dan anggaran kepergiannya ikut kosong", J.totalDetikKepergianIelts(1) === 0);

const baruSesudah = J.catatKeluarIelts(1, 1, 1, "LISTENING", "keluar_tab", "kej-r2");
periksa("baris baru memakai ronde 2", baruSesudah.urutan === 1);
periksa(
  "dan tercatat pada ronde yang benar",
  one("SELECT ronde FROM ielts_pelanggaran WHERE id = ?", baruSesudah.id).ronde === 2,
);

/* ------------------------------------------------------------------ */
console.log("\n9. Yang TIDAK ikut memakan anggaran kepergian");
/* ------------------------------------------------------------------ */

run(
  `INSERT INTO ielts_pengerjaan (id, user_id, paket_id, status, setuju_at)
   VALUES (3, 1, 3, 'ongoing', datetime('now'))`,
);
J.catatDenyutTersendatIelts(3, 1, 3, "WRITING", 60, 8);
const bBlur = J.catatKeluarIelts(3, 1, 3, "WRITING", "blur_window", "kej-b1");
mundurkanMulai(bBlur.id, 30);
J.catatKembaliIelts(bBlur.id, 3);
const bFs = J.catatKeluarIelts(3, 1, 3, "WRITING", "keluar_layar_penuh", "kej-f1");
mundurkanMulai(bFs.id, 30);
J.catatKembaliIelts(bFs.id, 3);

periksa(
  "denyut_tersendat, blur_window, dan keluar_layar_penuh tidak memakan anggaran",
  J.totalDetikKepergianIelts(3) === 0,
  "dapat " + J.totalDetikKepergianIelts(3),
);
periksa("tetapi ketiganya tetap tercatat untuk pengawas", J.jumlahPelanggaranIelts(3) === 3);

const rekap = J.rekapPelanggaranIelts(1);
periksa("rekap paket memuat peserta yang punya catatan", rekap.length >= 1);
periksa(
  "rekap menghitung hanya ronde berjalan",
  rekap.find((r) => r.pengerjaanId === 1)?.jumlah === 1,
);
periksa(
  "rincian paket memuat label berbahasa Indonesia",
  J.rincianPelanggaranIelts(1).every((r) => typeof r.label === "string" && r.label.length > 3),
);

console.log(gagal === 0 ? "\nSEMUA LULUS.\n" : `\n${gagal} PENGUJIAN GAGAL.\n`);
process.exit(gagal === 0 ? 0 : 1);
