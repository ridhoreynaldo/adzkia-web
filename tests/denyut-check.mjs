/**
 * Pengujian mesin penjagaan ujian di iPhone (tanpa framework tes).
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/denyut-check.mjs
 *
 * Yang diperiksa — semuanya lahir dari perilaku WebKit di iPhone, tempat
 * laporan pelanggaran bisa mati bersama halaman yang dibekukan:
 *
 *   1. DENYUT NADI. Jeda hanya dinilai bila denyut SEBELUMNYA bersenjata;
 *      denyut pertama dan denyut dari balik gerbang tidak pernah menuduh.
 *   2. Jeda yang melewati ambang terukur apa adanya, sehingga rute bisa
 *      menggugurkan; jeda pendek dibiarkan.
 *   3. MUAT ULANG TIDAK MENGHAPUS JEJAK. Denyut pertama sesudah halaman dimuat
 *      ulang tetap dinilai (mula), sedangkan pembongkaran yang DISENGAJA —
 *      peserta menutup subtes — menghapusnya.
 *   4. Ujian susulan melupakan denyut ronde lama, supaya jeda berhari-hari
 *      tidak menggugurkan peserta pada denyut pertamanya.
 *   5. LAPORAN KEMBAR. Satu kepergian dilaporkan dua kali (sendBeacon + fetch)
 *      dengan penanda yang sama dan HARUS menjadi satu baris saja; laporan
 *      tanpa penanda tetap berdiri sendiri.
 *   6. Baris denyut_hilang tercatat lengkap dengan durasinya, dan jenisnya
 *      termasuk yang menggugurkan.
 *
 * Berkas .ts asli dipakai apa adanya — hanya disalin ke folder sementara DI
 * DALAM proyek (supaya node_modules tetap terjangkau) dengan penambahan
 * ekstensi pada impornya, karena Node 24 sudah bisa menjalankan TypeScript.
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
const TMP = path.join(AKAR, ".tmp", "cek", "denyut");

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
const P = await muat("pelanggaran");
const D = await muat("denyut");
const { all, one, run } = dbMod;

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
  "INSERT INTO users (id, nama, email, password_hash, role) VALUES (1, 'Siswa Uji', 'uji@cek.local', 'x', 'siswa')",
);
run(
  "INSERT INTO packages (id, kode, nama, status, jalur) VALUES (1, 'CEK-1', 'Paket Cek', 'published', 'utbk')",
);
run(
  "INSERT INTO attempts (id, user_id, package_id, status, subtes_aktif) VALUES (1, 1, 1, 'ongoing', 'PU')",
);

/** Mundurkan denyut terakhir sekian detik, meniru halaman yang membeku. */
const mundurkan = (detik) =>
  run(
    "UPDATE attempts SET denyut_at = datetime('now','localtime', ? || ' seconds') WHERE id = 1",
    "-" + detik,
  );

const barisAttempt = () => one("SELECT denyut_at, denyut_aktif FROM attempts WHERE id = 1");

/* ------------------------------------------------------------------ */
console.log("\n1. Denyut nadi: kapan jeda boleh dinilai");
/* ------------------------------------------------------------------ */

periksa(
  "denyut pertama (dari balik gerbang) tidak menuduh apa pun",
  P.catatDenyut(1, false) === null,
);
periksa("denyut itu tercatat sebagai TIDAK bersenjata", barisAttempt().denyut_aktif === 0);

periksa(
  "denyut bersenjata pertama juga belum menuduh, karena pendahulunya belum dijaga",
  P.catatDenyut(1, true) === null,
);
periksa("sekarang tercatat bersenjata", barisAttempt().denyut_aktif === 1);

// SQLite membulatkan ke detik terdekat, jadi dua denyut yang berjarak
// sepersekian detik boleh terbaca 0 atau 1 — bukan lebih.
const jedaRapat = P.catatDenyut(1, true);
periksa(
  "dua denyut bersenjata beruntun: jeda nyaris nol",
  jedaRapat !== null && jedaRapat <= 1,
  "dapat " + jedaRapat,
);

/* ------------------------------------------------------------------ */
console.log("\n2. Jeda yang melewati ambang");
/* ------------------------------------------------------------------ */

mundurkan(35);
const jeda35 = P.catatDenyut(1, true);
periksa(
  "jeda 35 detik terukur apa adanya",
  jeda35 !== null && jeda35 >= 34 && jeda35 <= 36,
  "dapat " + jeda35,
);
periksa(
  "35 detik melewati ambang " + D.AMBANG_DENYUT_DETIK + " detik",
  jeda35 > D.AMBANG_DENYUT_DETIK,
);

mundurkan(8);
const jeda8 = P.catatDenyut(1, true);
periksa("jeda 8 detik masih di bawah ambang", jeda8 <= D.AMBANG_DENYUT_DETIK, "dapat " + jeda8);
periksa(
  "ambang memberi ruang beberapa denyut yang hilang berturut-turut",
  D.AMBANG_DENYUT_DETIK >= (D.JEDA_DENYUT / 1000) * 3,
);

/* ------------------------------------------------------------------ */
console.log("\n3. Muat ulang halaman tidak menghapus jejak kepergian");
/* ------------------------------------------------------------------ */

// Peserta bersenjata, lalu halaman mati 60 detik, lalu ia memuat ulang. Denyut
// pertama sesudah muat ulang belum bersenjata (masih di gerbang), tapi jedanya
// TETAP dinilai — inilah yang menutup celah "pindah aplikasi lalu muat ulang".
P.catatDenyut(1, true);
mundurkan(60);
const jedaMuatUlang = P.catatDenyut(1, false, true);
periksa(
  "denyut pertama sesudah muat ulang tetap membawa jeda 60 detik",
  jedaMuatUlang !== null && jedaMuatUlang >= 59,
  "dapat " + jedaMuatUlang,
);

// Sebaliknya: pembongkaran yang disengaja menghapus jejaknya.
P.catatDenyut(1, true);
P.catatDenyut(1, false, false); // peserta menekan "Selesaikan Subtes"
mundurkan(120);
periksa(
  "sesudah pembongkaran yang disengaja, jeda 120 detik TIDAK menuduh",
  P.catatDenyut(1, false, true) === null,
);

/* ------------------------------------------------------------------ */
console.log("\n4. Ujian susulan melupakan denyut ronde lama");
/* ------------------------------------------------------------------ */

P.catatDenyut(1, true);
mundurkan(86400);
P.setelUlangDenyut(1);
periksa("setelUlangDenyut mengosongkan jejak", barisAttempt().denyut_at === null);
periksa(
  "denyut pertama ronde baru tidak menggugurkan walau berselang sehari",
  P.catatDenyut(1, true) === null,
);

/* ------------------------------------------------------------------ */
console.log("\n5. Laporan kembar (sendBeacon + fetch) menjadi satu baris");
/* ------------------------------------------------------------------ */

const a = P.catatKeluar(1, 1, 1, "PU", "keluar_tab", "kejadian-abc");
const b = P.catatKeluar(1, 1, 1, "PU", "keluar_tab", "kejadian-abc");
periksa("laporan kedua mengembalikan baris yang sama", a.id === b.id);
periksa("laporan pertama bukan kembar", a.kembar === false);
periksa("laporan kedua ditandai kembar", b.kembar === true);
periksa(
  "hanya satu baris yang benar-benar tersimpan",
  all("SELECT id FROM violations WHERE attempt_id = 1 AND kejadian = 'kejadian-abc'").length === 1,
);

const c = P.catatKeluar(1, 1, 1, "PU", "keluar_tab", "kejadian-xyz");
periksa("penanda berbeda tetap menghasilkan baris baru", c.id !== a.id);

const t1 = P.catatKeluar(1, 1, 1, "PU", "blur_window");
const t2 = P.catatKeluar(1, 1, 1, "PU", "blur_window");
periksa("laporan tanpa penanda tidak pernah disatukan", t1.id !== t2.id);

const p1 = P.catatPercobaan(1, 1, 1, "PU", "tekan_tahan", "gambar", "curang-1");
const p2 = P.catatPercobaan(1, 1, 1, "PU", "tekan_tahan", "gambar", "curang-1");
periksa("percobaan curang juga disatukan oleh penanda", p1 === p2);

/* ------------------------------------------------------------------ */
console.log("\n6. Baris denyut_hilang");
/* ------------------------------------------------------------------ */

const idHilang = P.catatDenyutHilang(1, 1, 1, "PU", 47);
const baris = one("SELECT * FROM violations WHERE id = ?", idHilang);
periksa("jenisnya denyut_hilang", baris.jenis === "denyut_hilang");
periksa("durasinya sepanjang jeda yang terukur", baris.durasi_detik === 47);
periksa("barisnya langsung tertutup, bukan menggantung", baris.kembali_at !== null);
periksa("keterangannya terbaca pengawas", /47/.test(baris.keterangan ?? ""));
periksa("labelnya siap dipakai tabel admin", P.labelJenis("denyut_hilang") !== "denyut_hilang");
periksa("tekan_tahan hanya dicatat, tidak menggugurkan", P.menggugurkan("tekan_tahan") === false);
periksa("lewat_safari hanya dicatat, tidak menggugurkan", P.menggugurkan("lewat_safari") === false);
periksa(
  "kedua jenis baru punya label sendiri",
  P.labelJenis("tekan_tahan") !== "tekan_tahan" && P.labelJenis("lewat_safari") !== "lewat_safari",
);

/* ------------------------------------------------------------------ */
console.log("\n7. Jeda yang terbukti gangguan jaringan, bukan kepergian");
/* ------------------------------------------------------------------ */

// Bukti dari basis data produksi 4-6 September 2026: 87 peserta digugurkan
// dengan jeda di bawah satu menit — bentuk SATU permintaan denyut yang
// menggantung, bukan bentuk orang yang pindah aplikasi.

periksa(
  "permintaan denyut punya batas waktu, tidak menggantung selamanya",
  typeof D.BATAS_DENYUT_MS === "number" && D.BATAS_DENYUT_MS > 0,
);
periksa(
  "batas waktunya lebih pendek daripada ambang, jadi masih sempat diulang",
  D.BATAS_DENYUT_MS < D.AMBANG_DENYUT_DETIK * 1000,
  D.BATAS_DENYUT_MS + " ms vs ambang " + D.AMBANG_DENYUT_DETIK * 1000 + " ms",
);
// Inilah yang membuat `percobaan >= 2` di rute denyut bisa tercapai sama
// sekali: dua percobaan penuh harus muat di dalam ambang.
periksa(
  "dua percobaan penuh muat sebelum ambang tercapai",
  2 * D.BATAS_DENYUT_MS + D.JEDA_COBA_DENYUT <= D.AMBANG_DENYUT_DETIK * 1000,
  2 * D.BATAS_DENYUT_MS + D.JEDA_COBA_DENYUT + " ms",
);
periksa(
  "ambang bagi halaman yang terbukti terlihat lebih longgar",
  D.AMBANG_DENYUT_TERLIHAT_DETIK > D.AMBANG_DENYUT_DETIK,
);
periksa(
  "masa pemastian fokus cukup lama menampung kedipan peramban",
  D.MASA_PASTIKAN_FOKUS >= 2000 && D.MASA_PASTIKAN_FOKUS <= 10000,
  D.MASA_PASTIKAN_FOKUS + " ms",
);
periksa(
  "masa tenang sesudah layar penuh menyala menampung lepasan perangkat",
  D.MASA_SETELAH_LAYAR_PENUH >= 3000 && D.MASA_SETELAH_LAYAR_PENUH <= 15000,
  D.MASA_SETELAH_LAYAR_PENUH + " ms",
);

const idSendat = P.catatDenyutTersendat(1, 1, 1, "PU", 34, 5);
const barisSendat = one("SELECT * FROM violations WHERE id = ?", idSendat);
periksa("jenisnya denyut_tersendat", barisSendat.jenis === "denyut_tersendat");
periksa("durasinya sepanjang jeda yang terukur", barisSendat.durasi_detik === 34);
periksa("barisnya langsung tertutup, bukan menggantung", barisSendat.kembali_at !== null);
periksa(
  "keterangannya menyebut lama putus DAN berapa kali halaman mencoba",
  /34/.test(barisSendat.keterangan ?? "") && /5/.test(barisSendat.keterangan ?? ""),
  barisSendat.keterangan ?? "(kosong)",
);
periksa(
  "denyut_tersendat TIDAK menggugurkan — sinyal hilang bukan perbuatan peserta",
  P.menggugurkan("denyut_tersendat") === false,
);
periksa(
  "tetapi pengawas tetap melihatnya dengan label sendiri",
  P.labelJenis("denyut_tersendat") !== "denyut_tersendat",
);
periksa(
  "labelnya dibedakan dari denyut_hilang",
  P.labelJenis("denyut_tersendat") !== P.labelJenis("denyut_hilang"),
);
periksa(
  "ia ikut terhitung dalam rekap pelanggaran attempt",
  P.jumlahPelanggaran(1) > 0,
);

/* ------------------------------------------------------------------ */
console.log("\n8. Layar mati tidak menggugurkan, dan peserta diberi tahu sebabnya");
/* ------------------------------------------------------------------ */

const J = await muat("pelanggaran-jenis");

// Layar ponsel yang meredup, layar terkunci, screensaver laptop, dan peserta
// yang berpindah aplikasi memancarkan peristiwa yang IDENTIK. Karena layar yang
// mati sendiri jelas bukan kesalahan peserta, kejadian "halaman disembunyikan"
// hanya dicatat.
// ATURAN KEPERGIAN (7 September 2026 malam, sesudah pengelola menguji sendiri
// di iPhone bersama pengawas).
//
// Yang menggugurkan tinggal SATU: `blur_window` — halaman ujian masih terlihat
// di layar sementara jendela atau aplikasi lain dipakai di sampingnya. Itulah
// satu-satunya bentuk yang membuktikan permukaan kedua sengaja dibuka.
//
// Meninggalkan halaman TIDAK menggugurkan dalam bentuk apa pun: tidak oleh
// lamanya, tidak oleh seringnya, tidak oleh keadaan layar penuhnya. Begitu pula
// mode layar penuh yang terlepas — Esc yang tidak sengaja tertekan tidak boleh
// menghentikan ujian siapa pun.
const LINDUNG = { adaLayarPenuh: true, dalamLayarPenuh: true };
const TERBUKA = { adaLayarPenuh: true, dalamLayarPenuh: false };

periksa(
  "blur_window tetap menggugurkan",
  J.menggugurkan("blur_window") === true && J.menggugurkanKeluar("blur_window", LINDUNG) === true,
);
// TUJUH, tidak lebih. Daftar ini gampang bertambah diam-diam pada perbaikan
// berikutnya, dan setiap tambahan berarti satu cara baru menggugurkan peserta
// yang tidak pernah diminta pengelola. Yang ketujuh, `pergi_menumpuk`, diminta
// pengelola 9 September 2026: kepergian pendek yang berulang-ulang dijumlahkan
// sampai BUDGET_PERGI_DETIK, bukan dihitung ulang dari nol tiap kali.
periksa(
  "yang menggugurkan tepat tujuh",
  J.JENIS_MENGGUGURKAN.length === 7 &&
    [
      "blur_window",
      "esc_layar_penuh",
      "alt_tab",
      "pergi_lama",
      "pergi_menumpuk",
      "denyut_hilang",
      "tangkap_layar",
    ].every((j) => J.JENIS_MENGGUGURKAN.includes(j)),
  "dapat " + J.JENIS_MENGGUGURKAN.join(", "),
);

// Kepergian: apa pun keadaannya, hanya dicatat.
for (const [nama, keadaan] of [
  ["di dalam layar penuh (layar padam)", LINDUNG],
  ["sesudah layar penuh lepas (Esc lalu pergi)", TERBUKA],
  ["di iPhone (tanpa Fullscreen API)", { adaLayarPenuh: false, dalamLayarPenuh: false }],
  ["tanpa keterangan apa pun", {}],
]) {
  periksa(
    `kepergian ${nama} TIDAK menggugurkan`,
    J.menggugurkanKeluar("keluar_tab", keadaan) === false,
  );
}

periksa(
  "layar penuh yang lepas di PONSEL/TABLET hanya dicatat (keluar_layar_penuh)",
  J.menggugurkan("keluar_layar_penuh") === false,
);
periksa(
  "keluar_layar_penuh dan keluar_tab sama-sama masuk daftar catatan",
  J.JENIS_CATATAN.includes("keluar_layar_penuh") && J.JENIS_CATATAN.includes("keluar_tab"),
);
periksa(
  "jenis catatan biasa tetap tidak menggugurkan",
  J.menggugurkanKeluar("tekan_tahan", {}) === false &&
    J.menggugurkanKeluar("lewat_safari", {}) === false &&
    J.menggugurkan("klik_kanan") === false,
);

// Kepergian tetap TERCATAT lengkap — itulah penggantinya, dan pengawas yang
// menilai. Kalau pencatatannya ikut hilang, tidak ada apa pun yang tersisa.
run(
  "INSERT INTO violations (attempt_id, user_id, package_id, subtes, jenis, urutan, ronde) VALUES (1,1,1,'PU','keluar_tab',90,1)",
);
run(
  "INSERT INTO violations (attempt_id, user_id, package_id, subtes, jenis, urutan, ronde) VALUES (1,1,1,'PU','keluar_tab',91,1)",
);
periksa(
  "kepergian tetap dihitung untuk laporan pengawas",
  P.jumlahKepergian(1) >= 2,
  "dapat " + P.jumlahKepergian(1),
);
run("UPDATE attempts SET ronde = ronde + 1 WHERE id = 1");
periksa(
  "kepergian ronde lama tidak ikut terhitung sesudah ronde naik",
  P.jumlahKepergian(1) === 0,
);
run("UPDATE attempts SET ronde = ronde - 1 WHERE id = 1");

periksa(
  "labelnya memberi tahu pengawas apa yang sebenarnya terjadi",
  /meninggalkan halaman/i.test(P.labelJenis("keluar_tab")),
  P.labelJenis("keluar_tab"),
);

const pesanBlur = J.pesanGugurJenis("utbk", "blur_window");
periksa("kalimatnya bukan lagi kalimat seragam yang lama", pesanBlur !== J.PESAN_GUGUR);
periksa(
  "kalimat blur_window menyebut jendela/aplikasi lain",
  /jendela|aplikasi|peramban/i.test(pesanBlur),
);
periksa(
  "kalimatnya menyebut 'di samping' — itulah yang membedakannya dari sekadar pergi",
  /di samping/i.test(pesanBlur),
);
// Kalimat gagal WAJIB ikut menyebutkan apa yang TIDAK menggugurkan. Tanpa itu
// peserta yang layarnya sempat padam membaca layar GAGAL dan mengira sebabnya
// hal lain — lalu tidak pernah melapor ke pengawas.
periksa(
  "kalimatnya menenangkan: layar yang padam sendiri tidak menggugurkan",
  /padam sendiri/i.test(pesanBlur),
);
periksa(
  "kalimatnya menegaskan meninggalkan halaman pun tidak menggugurkan",
  /meninggalkan halaman ujian/i.test(pesanBlur),
);
// Jangan mengajari cara keluar dari layar penuh: pengelola menemukannya
// terbaca peserta pada tablet, dan kalimat itu justru menunjukkan jalannya.
periksa(
  "tidak ada satu pun kalimat gagal yang menyebut Esc atau F11",
  !/Esc|F11/i.test(pesanBlur) &&
    !/Esc|F11/i.test(J.pesanGugurJenis("skd", "blur_window")),
);
periksa(
  "sebab yang tidak dikenal tetap menghasilkan kalimat yang masuk akal",
  J.pesanGugurJenis("utbk", "jenis-yang-belum-ada").length > 40,
);

// Nama ujian mengikuti portalnya masing-masing.
periksa("jalur SKD menyebut SKD Kedinasan", /SKD Kedinasan/.test(J.pesanGugurJenis("skd", "blur_window")));
periksa("jalur SKD tidak menyebut UTBK", !/UTBK/.test(J.pesanGugurJenis("skd", "blur_window")));
periksa("jalur UTBK menyebut UTBK", /UTBK/.test(pesanBlur));
periksa("jalur UTBK tidak menyebut Kedinasan", !/Kedinasan/.test(pesanBlur));
periksa("namaUjian membedakan kedua portal", J.namaUjian("skd") !== J.namaUjian("utbk"));

// Kalimat lama tetap ada supaya ratusan baris `alasan_gugur` lama tetap terbaca.
periksa("kalimat lama masih diekspor untuk baris lama", typeof J.PESAN_GUGUR === "string");
periksa("kalimat lama jalur SKD juga masih ada", J.pesanGugur("skd") === J.PESAN_GUGUR_SKD);

/* ------------------------------------------------------------------ */
// Folder sementara TIDAK dihapus di sini: Windows masih memegang berkas SQLite
// yang terbuka, dan rmSync-nya gagal dengan EPERM. Yang membersihkannya adalah
// rmSync di awal berkas ini, persis seperti pemeriksa Warung Soal.

/* ------------------------------------------------------------------ */
console.log("\n9. ESC & ALT+TAB: disebut sebagai LARANGAN, bukan sebagai jalan keluar");
/* ------------------------------------------------------------------ */

// Sejarah aturan ini penting, kalau tidak ia akan dikembalikan setengah jalan:
//
// 7 September 2026 pengelola menemukan sendiri pada tablet bahwa teks aplikasi
// menyebutkan tombol yang melepas mode layar penuh -- dan waktu itu lepasnya
// layar penuh TIDAK menggugurkan, sehingga kalimat itu memang hanya menunjukkan
// jalan keluar kepada peserta. Larangannya lahir dari situ.
//
// 8 September 2026 aturannya berbalik: di peramban komputer, menekan ESC
// menggugurkan. Menyebut tombolnya sekarang bukan lagi menunjukkan jalan keluar
// melainkan memasang rambu di depan jurang -- dan peserta yang tidak diberi
// tahu baru akan tahu sesudah ujiannya habis.
//
// Aturan sekarang: ESC dan ALT+TAB WAJIB disebut, selalu dalam kalimat yang
// melarang, dan selalu disertai keterangan bahwa itu berlaku khusus di
// komputer/laptop. F11 tetap tidak boleh disebut sama sekali: ia tidak dilarang
// di teks mana pun, jadi menyebutnya hanya mengajarkan jalan keluar kedua.
const fsPath = (p) => path.join(AKAR, "src", p);
const BERKAS_DIBACA_PESERTA = [
  "components/exam/PemberitahuanUjian.tsx",
  "components/exam/RuangUjian.tsx",
];
const KATA_LARANGAN = /GAGAL|menggugurkan|dilarang|jangan|pelanggaran/i;

for (const berkas of BERKAS_DIBACA_PESERTA) {
  // Hanya baris yang benar-benar tampil di layar; komentar kode boleh
  // menjelaskan apa pun, dan memang harus. Disatukan kembali menjadi satu blok
  // karena teks JSX dipotong pembungkus baris di sembarang tempat: "menekan
  // ESC" dan "dinyatakan GAGAL" kerap jatuh di baris yang berbeda.
  const tampil = fs
    .readFileSync(fsPath(berkas), "utf8")
    .split("\n")
    .filter((b) => !b.trimStart().startsWith("//") && !b.trimStart().startsWith("*"))
    // Baris yang MEMBANDINGKAN tombol papan ketik (`e.key === "F11"`) jelas
    // bukan teks yang dibaca peserta -- itu justru mesin yang menangkap
    // tombolnya. Tanpa pengecualian ini, memasang penjagaannya sendiri yang
    // membuat pemeriksaan ini gagal.
    .filter((b) => !/\be\.key\b/.test(b))
    .join("\n");

  periksa(berkas + " tidak menyebut tombol layar penuh papan ketik", !/F11/.test(tampil));
  periksa(berkas + " memperingatkan ESC", /\bESC\b/.test(tampil));
  periksa(berkas + " memperingatkan ALT+TAB", /ALT\+TAB/i.test(tampil));
  periksa(
    berkas + ": penyebutannya berupa larangan, bukan petunjuk",
    KATA_LARANGAN.test(tampil),
  );
  // Aturan ESC/ALT+TAB HANYA berlaku di peramban komputer. Teks yang lupa
  // menyebutkan batas itu akan menakuti pengguna HP atas sesuatu yang tidak
  // pernah berlaku bagi mereka -- dan pengguna HP-lah yang paling banyak salah
  // digugurkan pada tryout 4-6 September 2026.
  periksa(
    berkas + " menyebut aturan itu khusus komputer/laptop",
    /komputer\/laptop|di komputer/i.test(tampil),
  );
}

/* ------------------------------------------------------------------ */
console.log("\n10. Foto peserta hanya bisa diubah admin");
/* ------------------------------------------------------------------ */

// Foto dipakai peserta untuk memastikan NISN yang sedang dipakai memang
// miliknya. Identitas yang bisa diganti sendiri oleh pemiliknya di tengah ujian
// tidak membuktikan apa pun, jadi sejak 7 September 2026 hanya admin yang boleh
// mengubahnya.
const ruteFoto = fs.readFileSync(fsPath("app/api/peserta/foto/route.ts"), "utf8");
periksa("rute foto memakai requireAdmin", /requireAdmin\(\)/.test(ruteFoto));
periksa(
  "rute foto TIDAK lagi memakai sesi biasa untuk memilih sasarannya",
  !/getSession\(\)/.test(ruteFoto),
);
periksa(
  "sasarannya dipastikan benar-benar ada sebelum ditulis",
  /pesertaAda\(/.test(ruteFoto),
);
periksa(
  "komponen pengunggah tinggal di sisi admin",
  fs.existsSync(fsPath("components/admin/FotoPesertaAdmin.tsx")) &&
    !fs.existsSync(fsPath("components/exam/UnggahFotoPeserta.tsx")),
);
const halamanSiswa = fs.readFileSync(fsPath("app/tryout/[id]/page.tsx"), "utf8");
periksa(
  "halaman persiapan siswa tidak lagi memuat pengunggah foto",
  !/UnggahFotoPeserta|FotoPesertaAdmin/.test(halamanSiswa),
);
periksa(
  "halaman detail peserta admin memuat pengunggahnya",
  /FotoPesertaAdmin/.test(fs.readFileSync(fsPath("app/admin/peserta/[id]/page.tsx"), "utf8")),
);

/* ------------------------------------------------------------------ */
console.log("\n11. ESC & ALT+TAB di peramban komputer (8 September 2026)");
/* ------------------------------------------------------------------ */

// Permintaan pengelola, harfiah: "tekan ESC pada halaman layar penuh maka
// dianggap gagal; menekan ALT+TAB maka dianggap gagal", khusus untuk peramban
// komputer/laptop (Chrome, Firefox, Opera, Edge, Brave, Safari).
//
// Yang dijaga di sini bukan hanya bahwa keduanya menggugurkan, melainkan juga
// BATASNYA: aturan yang sama TIDAK boleh merembet ke ponsel dan tablet, tempat
// layar penuh lepas sendiri karena notifikasi dan isyarat navigasi. Rembetan
// itulah yang dulu menggugurkan 46% peserta tanpa kesalahan apa pun.

periksa("ESC di layar penuh menggugurkan", J.menggugurkan("esc_layar_penuh") === true);
periksa("ALT+TAB menggugurkan", J.menggugurkan("alt_tab") === true);
periksa(
  "keduanya menggugurkan tanpa syarat keadaan layar penuh apa pun",
  J.menggugurkanKeluar("esc_layar_penuh", {}) === true &&
    J.menggugurkanKeluar("alt_tab", LINDUNG) === true &&
    J.menggugurkanKeluar("alt_tab", TERBUKA) === true,
);
periksa(
  "lepasnya layar penuh di ponsel/tablet TETAP hanya dicatat",
  J.menggugurkan("keluar_layar_penuh") === false &&
    J.JENIS_CATATAN.includes("keluar_layar_penuh"),
);
periksa(
  "kepergian yang peserta KEMBALI tepat waktu tetap hanya dicatat",
  J.menggugurkan("keluar_tab") === false,
);

const pesanEsc = J.pesanGugurJenis("utbk", "esc_layar_penuh");
const pesanAlt = J.pesanGugurJenis("skd", "alt_tab");
periksa("kalimat gagal ESC menyebut tombolnya", /\bESC\b/.test(pesanEsc), pesanEsc);
periksa("kalimat gagal ESC menyebut komputer", /komputer/i.test(pesanEsc));
periksa("kalimat gagal ALT+TAB menyebut tombolnya", /ALT\+TAB/i.test(pesanAlt), pesanAlt);
periksa("kalimat gagal ALT+TAB jalur SKD tidak menyebut UTBK", !/UTBK/.test(pesanAlt));
// Kalimat penutup dipakai SELURUH sebab, jadi ia tidak boleh menyebut tombol
// mana pun: peserta yang gugur karena membuka jendela lain tidak perlu membaca
// tentang ESC.
periksa(
  "kalimat gagal blur_window tetap bersih dari nama tombol",
  !/\bESC\b/i.test(pesanBlur) && !/ALT\+TAB/i.test(pesanBlur) && !/F11/i.test(pesanBlur),
);
periksa(
  "ketiga kalimat sama-sama menenangkan soal layar yang padam sendiri",
  [pesanBlur, pesanEsc, pesanAlt].every((k) => /padam sendiri/i.test(k)),
);
periksa(
  "labelnya terbaca pengawas di laporan",
  /ESC/.test(P.labelJenis("esc_layar_penuh")) && /ALT\+TAB/i.test(P.labelJenis("alt_tab")),
  P.labelJenis("esc_layar_penuh") + " | " + P.labelJenis("alt_tab"),
);

// Rute pelanggaran harus MENERIMA kedua jenis itu apa adanya. Kalau tidak,
// keduanya jatuh ke `keluar_tab` -- yang justru tidak menggugurkan, sehingga
// seluruh pengetatan ini diam-diam tidak berlaku sama sekali.
const ruteVio = fs.readFileSync(fsPath("app/api/exam/violation/route.ts"), "utf8");
periksa(
  "rute pelanggaran mengenali esc_layar_penuh dan alt_tab",
  /"esc_layar_penuh"/.test(ruteVio) && /"alt_tab"/.test(ruteVio),
);

// Ambang ALT+TAB. Sistem operasi menelan kombinasinya, jadi yang bisa dilihat
// halaman hanya ALT yang masih tertekan saat fokus hilang.
periksa(
  "MASA_ALT_TAB ada dan masuk akal (0,5-3 detik)",
  typeof D.MASA_ALT_TAB === "number" && D.MASA_ALT_TAB >= 500 && D.MASA_ALT_TAB <= 3000,
  "dapat " + D.MASA_ALT_TAB,
);
periksa(
  "ALT+TAB dilaporkan lebih cepat daripada masa pemastian fokus",
  D.MASA_ALT_TAB <= D.MASA_PASTIKAN_FOKUS,
);

// Ruang ujian: pemisah perangkat, jejak tombol, dan pelaporan ALT+TAB.
// PENJAGAANNYA HIDUP DI DUA BERKAS sejak 10 September 2026: penolong peramban
// yang murni (pengenal perangkat, pengenal pintasan, penanda sessionStorage)
// dipindahkan ke `lib/penjagaan-peramban.ts` supaya ruang ujian IELTS memakai
// kode yang SAMA, bukan salinannya. Keduanya dibaca berdampingan di sini —
// yang diuji adalah aturannya, bukan berkas tempat aturannya kebetulan duduk.
const ruang =
  fs.readFileSync(fsPath("components/exam/RuangUjian.tsx"), "utf8") +
  "\n\n" +
  fs.readFileSync(fsPath("lib/penjagaan-peramban.ts"), "utf8");
periksa(
  "ruang ujian memisahkan peramban komputer dari peramban ponsel",
  /function perambanKomputer/.test(ruang) &&
    /\(hover: hover\) and \(pointer: fine\)/.test(ruang),
);
periksa(
  "lepasnya layar penuh dipilah menjadi esc_layar_penuh / keluar_layar_penuh",
  /bukaPelanggaran\(\s*perambanKomputer\(\) \? "esc_layar_penuh" : "keluar_layar_penuh",?\s*\)/.test(
    ruang,
  ),
);
// PERANGKATNYA, dan hanya perangkatnya, yang memutuskan akibat lepasnya layar
// penuh. Jejak tombol ESC pernah dipakai sebagai bukti pendukung di sini, dan
// itu diam-diam menggugurkan pengguna tablet berpapan ketik -- padahal tata
// tertib yang mereka baca menjanjikan aturan ESC khusus komputer/laptop.
periksa(
  "ESC tidak dipakai sebagai bukti pendukung di perangkat sentuh",
  !/tombolLepasLayarPenuh/.test(ruang),
);
periksa(
  "ALT+TAB disimpulkan dari ALT yang masih tertekan saat fokus hilang",
  /altSejak/.test(ruang) && /altTabBaruSaja/.test(ruang) && /MASA_ALT_TAB/.test(ruang),
);
periksa(
  "fokus yang kembali membersihkan penanda ALT",
  /altSejak\.current = 0;/.test(ruang),
);
// Tombol Windows melaporkan `metaKey` sama seperti Command di Mac, tetapi ia
// membuka menu Mulai -- bukan berpindah jendela. Menghitungnya akan
// menggugurkan peserta Windows dengan tuduhan menekan ALT+TAB yang tidak pernah
// ia lakukan.
periksa(
  "Command dihitung di Mac/iPad/iPhone, tombol Windows tidak",
  /function commandPindahJendela/.test(ruang) &&
    /const meta = commandPindahJendela\(\) &&/.test(ruang),
);

// ALT+TAB BERLAKU DI SEMUA PERANGKAT (ditegaskan pengelola 8 September 2026).
//
// Pembedaan komputer/ponsel HANYA milik layar penuh. Kalau suatu saat
// `perambanKomputer()` ikut menjaga jalur ALT+TAB, aturannya diam-diam berhenti
// berlaku di HP dan tablet berpapan ketik -- persis lubang yang diminta ditutup.
periksa(
  "jalur ALT+TAB tidak punya pembatas perangkat sama sekali",
  !/perambanKomputer\(\)[\s\S]{0,200}alt_tab/.test(ruang) &&
    !/alt_tab[\s\S]{0,200}perambanKomputer\(\)/.test(ruang),
);
// Ketiga jalur kepergian -- disembunyikan, kehilangan fokus, dan halaman
// ditutup -- harus MEMERIKSA ALT+TAB LEBIH DULU. Di iPhone `blur` tidak pernah
// terpancar dan `hasFocus()` selalu true, jadi kalau hanya `onBlur` yang
// memeriksanya, ALT+TAB di iPad/iPhone tidak akan pernah tertangkap.
periksa(
  "ALT+TAB diperiksa di ketiga jalur kepergian (visibilitychange, blur, pagehide)",
  (ruang.match(/if \(laporAltTab\(\)\) return;/g) ?? []).length >= 3,
  "dapat " + (ruang.match(/if \(laporAltTab\(\)\) return;/g) ?? []).length,
);
// Hanya MODIFIER TELANJANG yang menandai; kombinasi apa pun membersihkannya.
// Tanpa ini, peserta iPad yang menekan Cmd+C lalu layarnya tersembunyi dalam
// dua detik digugurkan sebagai Command+Tab -- tuduhan yang tidak ia lakukan.
periksa(
  "jalan pintas ber-modifier MEMBERSIHKAN penanda, bukan menyalakannya",
  /else if \(!modifier && \(e\.altKey \|\| e\.metaKey\)\) \{\s*altSejak\.current = 0;/.test(
    ruang,
  ),
);
// Kunci "satu kejadian, satu catatan" pernah MENELAN pelanggaran berikutnya:
// sesudah layar penuh lepas di ponsel (dicatat saja), ALT+TAB tidak pernah
// sampai ke server karena kuncinya masih menggantung -- dan ia tidak akan
// pernah terbuka, sebab halaman itu tidak pernah disembunyikan sehingga tidak
// ada peristiwa fokus yang memanggil `tutupPelanggaran()`. Terlihat 8 September
// 2026 saat menguji ALT+TAB di perangkat sentuh.
periksa(
  "catatan yang belum ditutup tidak menelan pelanggaran yang menggugurkan",
  /!\(menggugurkan\(jenis\) && !menggugurkan\(terbuka\.jenis\)\)/.test(ruang),
);
periksa(
  "peringatan layar penuh melepas kunci sementaranya sendiri",
  /data\.peringatanTerakhir \|\| data\.peringatanLayarPenuh/.test(ruang),
);
periksa(
  "penjagaan papan ketik hanya menyala saat penjagaan menyala (bolehLapor)",
  /laporAltTab = \(\) => \{[\s\S]*?bolehLapor\(\)/.test(ruang),
);
periksa(
  "pratinjau admin tetap tidak pernah menggugurkan siapa pun",
  /if \(pratinjau\) return; \/\/ pratinjau tidak pernah menggugurkan siapa pun/.test(ruang),
);

/* ------------------------------------------------------------------ */
console.log("\n12. Tenggang kembali 20 detik (8 September 2026 sore)");
/* ------------------------------------------------------------------ */

// Permintaan pengelola, harfiah:
//
//   "Tombol navigasi '<' dan '=' ada di Android. Ketika klik itu, keluar dari
//    layar penuh, kemudian dia belum mengklik/mengembalikan halaman ujian --
//    itu jangan digagalkan, tapi dicatat saja. Dan ketika dia klik halaman lain
//    selain dari halaman ujian, maka gagalkan saja."
//
// "Klik halaman lain" tidak bisa dikenali peramban: halaman yang disembunyikan
// dibekukan dan tidak melihat apa pun lagi. Yang diukur karena itu adalah
// LAMANYA TIDAK KEMBALI. Yang dijaga di sini: ambangnya satu untuk kedua jalur,
// kepergian singkat tetap aman, dan kedua jalur pembuktiannya benar-benar
// terpasang di rutenya masing-masing.

periksa(
  "AMBANG_KEMBALI_DETIK ada dan sesuai permintaan (15-20 detik)",
  typeof D.AMBANG_KEMBALI_DETIK === "number" &&
    D.AMBANG_KEMBALI_DETIK >= 15 &&
    D.AMBANG_KEMBALI_DETIK <= 20,
  "dapat " + D.AMBANG_KEMBALI_DETIK,
);
// SATU angka untuk dua jalur. Kalau keduanya berbeda, kepergian yang sama
// panjang akan digugurkan lewat jalur denyut tetapi dimaafkan lewat jalur
// kembali (atau sebaliknya) -- dan tidak ada yang bisa menjelaskan bedanya
// kepada peserta.
periksa(
  "ambang kembali sama persis dengan ambang denyut",
  D.AMBANG_KEMBALI_DETIK === D.AMBANG_DENYUT_DETIK,
  D.AMBANG_KEMBALI_DETIK + " vs " + D.AMBANG_DENYUT_DETIK,
);
periksa("pergi_lama menggugurkan", J.menggugurkan("pergi_lama") === true);
periksa("denyut_hilang menggugurkan", J.menggugurkan("denyut_hilang") === true);
periksa(
  "denyut_hilang tidak lagi berada di daftar catatan",
  !J.JENIS_CATATAN.includes("denyut_hilang"),
);
// Ini yang diminta pengelola tidak digagalkan: menekan '<' atau '=' lalu
// kembali. Keduanya hanya melepas layar penuh dan/atau menyembunyikan halaman.
periksa(
  "menekan '<' (layar penuh lepas di ponsel) tetap dicatat saja",
  J.menggugurkan("keluar_layar_penuh") === false,
);
periksa(
  "menekan '=' lalu kembali tepat waktu tetap dicatat saja",
  J.menggugurkan("keluar_tab") === false,
);
// Jaringan yang putus BUKAN kepergian, dan pemisahnya wajib bertahan: tanpa itu
// setiap peserta yang sinyalnya hilang 20 detik ikut digugurkan.
periksa(
  "sambungan tersendat tetap tidak menggugurkan",
  J.menggugurkan("denyut_tersendat") === false,
);

const pesanPergi = J.pesanGugurJenis("utbk", "pergi_lama");
const pesanDiam = J.pesanGugurJenis("skd", "denyut_hilang");
periksa(
  "kalimat pergi_lama menyebut batas waktunya",
  pesanPergi.includes(String(D.AMBANG_KEMBALI_DETIK)),
  pesanPergi,
);
periksa(
  "kalimat denyut_hilang menyebut batas waktunya",
  pesanDiam.includes(String(D.AMBANG_KEMBALI_DETIK)),
  pesanDiam,
);
// Peserta yang jaringannya putus harus membaca bahwa itu BUKAN sebabnya,
// kalau tidak ia tidak akan pernah melapor ke pengawas.
periksa(
  "kalimat denyut_hilang menenangkan soal jaringan yang tersendat",
  /tersendat/i.test(pesanDiam),
);
periksa(
  "kalimat penutup memberi tahu batas kembalinya",
  pesanPergi.includes(String(D.AMBANG_KEMBALI_DETIK)) &&
    /kembali/i.test(J.pesanGugurJenis("utbk", "blur_window")),
);

// Kedua jalur harus benar-benar terpasang. Tanpa jalur denyut, peserta cukup
// menutup tabnya supaya laporan "kembali" tidak pernah dikirim.
const ruteVio2 = fs.readFileSync(fsPath("app/api/exam/violation/route.ts"), "utf8");
const ruteDenyut = fs.readFileSync(fsPath("app/api/exam/denyut/route.ts"), "utf8");
periksa(
  "rute violation menggugurkan kepergian yang melewati ambang",
  /durasi !== null && durasi > AMBANG_KEMBALI_DETIK/.test(ruteVio2) &&
    /naikkanKePergiLama\(/.test(ruteVio2),
);
periksa(
  "rute denyut menggugurkan keheningan yang melewati ambang",
  /gugurkanUjian\(att\.id, pesan\)/.test(ruteDenyut),
);
// Urutannya penting: baris pelanggaran DICATAT lebih dulu, baru digugurkan.
// Kalau terbalik, pengawas kehilangan bukti lama diamnya.
periksa(
  "denyut yang hilang dicatat SEBELUM digugurkan",
  ruteDenyut.indexOf("catatDenyutHilang(") < ruteDenyut.indexOf("gugurkanUjian("),
);
// Pemisah jaringan-putus harus dinilai LEBIH DULU daripada pengguguran.
periksa(
  "jeda yang terbukti gangguan jaringan diperiksa sebelum menggugurkan",
  ruteDenyut.indexOf("catatDenyutTersendat(") < ruteDenyut.indexOf("gugurkanUjian("),
);

// Baris yang dinaikkan harus TETAP SATU baris, bukan dua: satu kepergian, satu
// baris di laporan pengawas, lengkap dengan jam pergi dan jam kembali.
run(
  "INSERT INTO violations (id, attempt_id, user_id, package_id, subtes, jenis, urutan, ronde, durasi_detik) VALUES (900,1,1,1,'PU','keluar_tab',95,1,25)",
);
const naik = P.naikkanKePergiLama(900, 1);
const baris900 = one("SELECT jenis, durasi_detik, keterangan FROM violations WHERE id = 900");
periksa("kepergian yang terlambat dinaikkan menjadi pergi_lama", naik === true);
periksa("jenisnya benar-benar berubah", baris900.jenis === "pergi_lama");
periksa("durasinya tidak ikut hilang", Number(baris900.durasi_detik) === 25);
periksa("keterangannya menyebut sebabnya", /tidak kembali/i.test(baris900.keterangan ?? ""));
periksa(
  "tidak ada baris kedua untuk kepergian yang sama",
  Number(one("SELECT COUNT(*) AS n FROM violations WHERE attempt_id = 1 AND urutan = 95")?.n) === 1,
);
// Baris yang jenisnya sudah lain TIDAK boleh ditimpa -- sebabnya akan hilang.
run(
  "INSERT INTO violations (id, attempt_id, user_id, package_id, subtes, jenis, urutan, ronde, durasi_detik) VALUES (901,1,1,1,'PU','alt_tab',96,1,40)",
);
periksa(
  "baris ber-jenis lain tidak ikut dinaikkan",
  P.naikkanKePergiLama(901, 1) === false &&
    one("SELECT jenis FROM violations WHERE id = 901").jenis === "alt_tab",
);
periksa(
  "baris milik attempt lain tidak bisa disentuh",
  P.naikkanKePergiLama(900, 999) === false,
);

// Label untuk pengawas harus membedakan kepergian singkat dari yang terlambat.
periksa(
  "label pergi_lama dan keluar_tab berbeda dan jelas",
  P.labelJenis("pergi_lama") !== P.labelJenis("keluar_tab") &&
    /tidak kembali/i.test(P.labelJenis("pergi_lama")),
  P.labelJenis("pergi_lama"),
);

// Teks yang dibaca peserta wajib menyebutkan batasnya -- kalau tidak, peserta
// baru mengetahui aturannya sesudah ujiannya habis.
for (const berkas of BERKAS_DIBACA_PESERTA) {
  const tampil = fs
    .readFileSync(fsPath(berkas), "utf8")
    .split("\n")
    .filter((b) => !b.trimStart().startsWith("//") && !b.trimStart().startsWith("*"))
    .join("\n");
  periksa(
    berkas + " memberi tahu batas waktu kembali",
    /AMBANG_KEMBALI_DETIK/.test(tampil) && /detik/.test(tampil),
  );
}
periksa(
  "tata tertib menyebut tombol '<' dan '=' Android sebagai yang TIDAK menggugurkan",
  /&lsquo;&lt;&rsquo;/.test(fs.readFileSync(fsPath("components/exam/PemberitahuanUjian.tsx"), "utf8")),
);
// Kepergian yang kembali TEPAT WAKTU tidak boleh diberitahukan kepada peserta
// (diminta pengelola 8 September 2026): cukup dicatat untuk pengawas, tanpa
// bilah pemberitahuan yang mengganggu di tengah pengerjaan. Aturannya sendiri
// sudah terpampang di bilah merah atas sejak sebelum ia pergi.
periksa(
  "kepergian yang kembali tepat waktu TIDAK diberitahukan ke peserta",
  !/peringatanPergi/.test(ruang),
);
periksa(
  "hanya pengguguran yang ditampilkan sesudah peserta kembali",
  /if \(data\.digugurkan\) \{\s*nyatakanGugur\(data\.pesan\);/.test(ruang),
);
// Tetapi aturannya WAJIB tetap terpampang sebelum ia pergi — kalau tidak,
// peserta digugurkan oleh batas yang tidak pernah ia baca.
periksa(
  "batas waktunya tetap terpampang di bilah aturan ruang ujian",
  /meninggalkan halaman ujian lebih dari \{AMBANG_KEMBALI_DETIK\} detik/.test(ruang),
);
periksa(
  "tata tertib menyuruh peserta mematikan kunci layar otomatis",
  /Kunci Otomatis|kunci layar otomatis/i.test(
    fs.readFileSync(fsPath("components/exam/PemberitahuanUjian.tsx"), "utf8"),
  ),
);

/* ------------------------------------------------------------------ */
console.log("\n13. Menangkap layar soal (8 September 2026)");
/* ------------------------------------------------------------------ */

// Pengelola meminta potret layar menggugurkan "berlaku untuk device
// laptop/komputer/handphone/ios/apple". Yang BISA dikerjakan halaman web hanya
// mengenali TOMBOLNYA; potret layar dari tombol fisik ponsel (Power+Volume)
// dikerjakan sistem operasi tanpa memberi tahu halaman, dan tidak ada API di
// peramban mana pun yang membocorkannya.
//
// Yang dijaga di sini: pengenal tombolnya benar, satu tekanan tidak menjadi dua
// baris, dan teks yang dibaca peserta TIDAK menjanjikan deteksi di ponsel.

periksa("tangkap_layar menggugurkan", J.menggugurkan("tangkap_layar") === true);
periksa(
  "kalimat gagalnya menyebut potret layar",
  /screenshot|menangkap layar/i.test(J.pesanGugurJenis("utbk", "tangkap_layar")),
  J.pesanGugurJenis("utbk", "tangkap_layar"),
);
periksa(
  "rute pelanggaran menerima jenis tangkap_layar",
  /"tangkap_layar"/.test(fs.readFileSync(fsPath("app/api/exam/violation/route.ts"), "utf8")),
);
periksa(
  "labelnya terbaca pengawas",
  /layar/i.test(P.labelJenis("tangkap_layar")),
  P.labelJenis("tangkap_layar"),
);

// Pengenal tombolnya diuji lewat sumbernya: keempat bentuk yang memang bisa
// sampai ke halaman harus ada, dan PrintScreen wajib diperiksa di keyup juga --
// Chrome dan Edge di Windows TIDAK memancarkan keydown untuknya.
periksa(
  "pengenal pintasan potret layar ada",
  /function pintasanTangkapLayar/.test(ruang),
);
for (const [nama, pola] of [
  ["PrintScreen", /"PrintScreen"/],
  ["Cmd+Shift+3/4/5", /\["3", "4", "5"\]\.includes\(e\.key\)/],
  ["Win+Shift+S", /e\.metaKey && e\.shiftKey && k === "s"/],
  ["Ctrl+Shift+S", /e\.ctrlKey && e\.shiftKey && k === "s"/],
]) {
  periksa(`${nama} dikenali`, pola.test(ruang));
}
periksa(
  "PrintScreen ikut diperiksa saat keyup (Chrome/Edge Windows tidak mengirim keydown)",
  /const onTombolNaik = \(e: KeyboardEvent\) => \{\s*\/\/[^\n]*\n\s*if \(laporTangkapLayar\(e\)\) return;/.test(
    ruang,
  ),
);
periksa(
  "satu tekanan tidak menjadi dua laporan",
  /tangkapDilaporkan/.test(ruang),
);
// Potret layar punya akibatnya sendiri; ia tidak boleh ikut tercatat sebagai
// "pintasan" biasa, kalau tidak satu perbuatan menghasilkan dua baris.
periksa(
  "pintasan potret layar tidak ikut dicatat sebagai pintasan biasa",
  /if \(pintasanTangkapLayar\(e\)\) return null;/.test(ruang),
);

// KEJUJURAN TEKS. Peserta boleh -- dan harus -- dilarang memotret di perangkat
// apa pun, tetapi aplikasinya tidak boleh mengaku bisa MENDETEKSI potret layar
// di ponsel, karena itu tidak benar.
const tataTertib = fs.readFileSync(fsPath("components/exam/PemberitahuanUjian.tsx"), "utf8");
periksa(
  "tata tertib melarang potret layar di perangkat apa pun",
  /screenshot/i.test(tataTertib) && /Android/.test(tataTertib) && /iPhone/.test(tataTertib),
);
periksa(
  "tata tertib TIDAK mengaku bisa mendeteksi potret layar ponsel",
  !/(screenshot|menangkap layar|potret layar)[^.]{0,80}(terdeteksi otomatis|otomatis terdeteksi)/i.test(
    tataTertib,
  ),
);

/* ------------------------------------------------------------------ */
console.log("\n14. Papan ketik layar iPad & isian singkat (9 September 2026)");
/* ------------------------------------------------------------------ */

// KELUHAN YANG MELAHIRKANNYA, dari pengelola sendiri di iPad:
//
//   "Ketika saya mau menjawab soal isian singkat pada layar mode penuh,
//    keyboard iPad keluar, nah ketika itu ada notifikasi langsung keluar harus
//    kembali ke layar penuh."
//
// SEBABNYA milik WebKit, bukan aplikasi ini: di iPadOS mode layar penuh LEPAS
// SENDIRI pada detik papan ketik layar naik untuk sebuah <input>. Akibatnya
// dua-duanya menyakitkan -- sebuah pelanggaran `keluar_layar_penuh` tercatat
// atas nama peserta yang cuma mengetik jawabannya, DAN gerbang layar penuh
// menutupi soal sehingga jawaban itu tidak pernah selesai diketik. Halaman
// tidak bisa mencegah lepasan itu; yang bisa hanyalah berhenti menganggapnya
// pelanggaran dan memasang layar penuh kembali sesudah papan ketiknya turun.
//
// Yang dijaga di sini adalah BATAS pemaafan itu, karena pemaafan yang terlalu
// lebar akan menjadi pintu belakang: ia hanya berlaku untuk kolom yang benar-
// benar memunculkan papan ketik, batal bila tombolnya sendiri yang menekan,
// dan tidak menyentuh satu pun penjagaan lain.

// Helper penentu kolomnya diuji SUNGGUHAN, bukan lewat pola teks: ia disalin
// apa adanya dari RuangUjian.tsx ke berkas .ts sementara, lalu dijalankan Node.
const potong = (nama) => {
  const mula = ruang.indexOf(`function ${nama}(`);
  if (mula < 0) return null;
  let dalam = 0;
  for (let i = ruang.indexOf("{", mula); i < ruang.length; i++) {
    if (ruang[i] === "{") dalam++;
    else if (ruang[i] === "}" && --dalam === 0) return ruang.slice(mula, i + 1);
  }
  return null;
};

const sumberKolom = ["diKolomIsian", "diKolomTeks", "pelepasLayarPenuhDitekan"].map(potong);
periksa(
  "ketiga penjaga kolom & tombol masih ada di ruang ujian",
  sumberKolom.every((t) => typeof t === "string" && t.length > 0),
);

if (sumberKolom.every(Boolean)) {
  const berkasKolom = path.join(TMP, "kolom-ujian.ts");
  fs.writeFileSync(berkasKolom, sumberKolom.map((t) => "export " + t).join("\n\n"));
  const K = await import(pathToFileURL(berkasKolom).href);

  const el = (tagName, tambahan = {}) => ({ tagName, ...tambahan });
  periksa("kolom isian singkat memang dihitung kolom teks", K.diKolomTeks(el("INPUT", { type: "text" })));
  periksa("input tanpa atribut type dihitung kolom teks", K.diKolomTeks(el("INPUT")));
  periksa("textarea dihitung kolom teks", K.diKolomTeks(el("TEXTAREA")));
  periksa(
    "elemen contenteditable dihitung kolom teks",
    K.diKolomTeks(el("DIV", { isContentEditable: true })),
  );
  // INI PEMBATAS YANG PALING PENTING. Pilihan ganda A-E juga dibuat dari
  // <input>, jadi memakai `diKolomIsian` untuk pemaafan layar penuh akan
  // memaafkan lepasnya layar penuh setiap kali peserta menekan salah satu
  // pilihan -- jauh lebih lebar daripada yang dimaksud, dan cukup untuk
  // menyembunyikan kepergian sungguhan.
  periksa("pilihan ganda (radio) BUKAN kolom teks", !K.diKolomTeks(el("INPUT", { type: "radio" })));
  periksa("kotak centang BUKAN kolom teks", !K.diKolomTeks(el("INPUT", { type: "checkbox" })));
  periksa("tombol BUKAN kolom teks", !K.diKolomTeks(el("BUTTON")));
  periksa("bukan elemen sama sekali tetap aman", !K.diKolomTeks(null));
  // Penyuntingan jawaban (salin/tempel di kolom) tetap memakai daftar lama yang
  // lebih longgar; kedua penjaga ini sengaja TIDAK disatukan.
  periksa(
    "penjaga penyuntingan lama tidak ikut menyempit",
    K.diKolomIsian(el("INPUT", { type: "radio" })),
  );
  periksa(
    "ESC dan F11 dikenali sebagai tombol pelepas layar penuh",
    K.pelepasLayarPenuhDitekan({ key: "Escape" }) &&
      K.pelepasLayarPenuhDitekan({ key: "F11" }) &&
      !K.pelepasLayarPenuhDitekan({ key: "a" }),
  );
}

// Bentuk pemaafannya: tiga syarat, dan ketiganya wajib.
periksa(
  "lepasnya layar penuh saat mengetik dimaafkan, dengan tiga syarat sekaligus",
  /if \(!aktif && sedangMengetik\(\) && !escBaruSaja\(\) && adaApiLayarPenuh\(\)\) \{/.test(ruang),
);
// Gerbang TIDAK BOLEH muncul di jendela itu -- itulah keluhan aslinya. Cabang
// pemaafan harus `return` sebelum `setLayarPenuh(aktif)` sempat dijalankan.
const cabangPemaafan = ruang.slice(
  ruang.indexOf("if (!aktif && sedangMengetik()"),
  ruang.indexOf("const bolehLaporkan = !aktif && bolehLapor();"),
);
periksa(
  "cabang pemaafan keluar sebelum gerbang layar penuh sempat ditampilkan",
  cabangPemaafan.includes("return;") && !/^\s*setLayarPenuh\(/m.test(cabangPemaafan),
);
periksa(
  "cabang pemaafan tidak melaporkan pelanggaran apa pun",
  !/bukaPelanggaran/.test(cabangPemaafan),
);
// Jendela pemaafannya diukur waktu, bukan ditahan selamanya.
const angka = (nama) => {
  const m = ruang.match(new RegExp("const " + nama + " = (\\d+);"));
  return m ? Number(m[1]) : NaN;
};
periksa("jendela papan ketik cukup lebar untuk urutan peristiwa yang tidak dijamin", angka("MASA_PAPAN_KETIK") >= 1000);
periksa("jendela papan ketik tidak dibiarkan menganga", angka("MASA_PAPAN_KETIK") <= 5000);
periksa(
  "jejak tombol pelepas berumur lebih pendek daripada jendela papan ketik",
  angka("MASA_TOMBOL_LEPAS") <= angka("MASA_PAPAN_KETIK"),
);

// ESC: penandanya hanya boleh MEMBATALKAN pemaafan, tidak pernah menuduh.
// Aturan 8 September 2026 tetap berlaku utuh -- akibat lepasnya layar penuh
// ditentukan PERANGKATNYA, bukan tombolnya.
const barisEsc = ruang.split("\n").filter((b) => b.includes("escSejak") && !b.trimStart().startsWith("//"));
periksa(
  "jejak ESC/F11 hidup di tiga tempat saja: dideklarasikan, ditandai, dibaca pembatal pemaafan",
  barisEsc.length === 3 && /const escBaruSaja = \(\) =>\s*escSejak\.current > 0/.test(ruang),
  "baris escSejak: " + barisEsc.length,
);
periksa(
  "jejak ESC/F11 tidak pernah dipakai membuka pelanggaran",
  !/escSejak[\s\S]{0,300}bukaPelanggaran/.test(ruang),
);

// Kolomnya dipantau dari tingkat dokumen, jadi kolom baru yang muncul saat
// berpindah nomor soal ikut terpantau tanpa tambahan apa pun di KartuSoal.
for (const [nama, pola] of [
  ["ketukan pada kolom dicatat sebelum fokusnya berpindah", /document\.addEventListener\("pointerdown", onSentuhKolom, true\)/],
  ["fokus masuk kolom teks dicatat", /document\.addEventListener\("focusin", onFokusMasuk, true\)/],
  ["fokus keluar kolom teks dicatat", /document\.addEventListener\("focusout", onFokusKeluar, true\)/],
]) {
  periksa(nama, pola.test(ruang));
}
periksa(
  "semua pendengar papan ketik dilepas saat ruang ujian dibongkar",
  ["onSentuhKolom", "onFokusMasuk", "onFokusKeluar", "pulihSaatDisentuh"].every(
    (n) =>
      (ruang.match(new RegExp('addEventListener\\("[a-z]+", ' + n, "g")) ?? []).length ===
      (ruang.match(new RegExp('removeEventListener\\("[a-z]+", ' + n, "g")) ?? []).length,
  ),
);

// PEMULIHAN. Peserta tidak boleh ditinggalkan di luar layar penuh hanya karena
// ia sempat mengetik: begitu papan ketiknya turun, mode layar penuh dipasang
// kembali diam-diam -- dan bila peramban menolak permintaan yang tidak lahir
// dari sentuhan, sentuhan berikutnya di luar kolom mencobanya lagi.
// PEMULIHAN TIDAK BOLEH BERGANTUNG PADA `focusout`. Putaran pertama tambalan
// ini menyimpan "sedang mengetik" di sebuah ref yang dinyalakan `focusin` dan
// dipadamkan `focusout` -- dan itu MENGGANTUNG selamanya di iPad, karena React
// membuang kolom isian dari dokumen saat peserta menekan "Selanjutnya" dan
// WebKit tidak menjamin memancarkan `focusout` untuk elemen yang dibuang selagi
// dipegang papan ketik. Akibatnya pemulihan layar penuh menolak berjalan sekali
// pun, peserta tertinggal di luar layar penuh, dan gerbang PERDANA muncul di
// subtes berikutnya. Dilaporkan penguji iPad 9 September 2026.
periksa(
  "keadaan mengetik dibaca dari dokumen, bukan dari penanda yang menunggu focusout",
  /function kolomTeksAktif\(\): boolean \{[\s\S]{0,200}document\.activeElement/.test(ruang) &&
    !/isianFokus/.test(ruang),
);
periksa(
  "soal isian melepas layar penuh, soal lain memulihkannya",
  /soalIsianTampil\.current = aktif\?\.tipe === "IS";\s*if \(soalIsianTampil\.current\) lepasUntukMengetik\(\);\s*else pulihkanLayarPenuh\(\);/.test(
    ruang,
  ),
);
// Ganti subtes memasang ulang ruang ujian, dan ruang yang baru hanya bebas dari
// gerbang bila layar penuhnya benar-benar terpasang. Ketukan tombol "Selesaikan
// Subtes" adalah kesempatan sah terakhir memasangnya -- permintaan layar penuh
// di luar sentuhan boleh ditolak peramban.
periksa(
  "menutup subtes memaksa layar penuh terpasang lebih dulu",
  /sedangMenutup\.current = true;[\s\S]{0,400}pulihkanLayarPenuh\(true\);/.test(ruang),
);
periksa(
  "sentuhan berikutnya menjadi kesempatan kedua memasang layar penuh",
  /document\.addEventListener\("pointerup", pulihSaatDisentuh, true\)/.test(ruang) &&
    /document\.addEventListener\("click", pulihSaatDisentuh, true\)/.test(ruang),
);
// Memasang layar penuh tepat saat peserta mengetuk kolomnya hanya akan
// menurunkan papan ketiknya lagi -- persis lingkaran yang dikeluhkan.
periksa(
  "pemulihan melewati sentuhan yang justru menuju kolom isian",
  /if \(diKolomTeks\(e\.target\) \|\| diKolomTeks\(document\.activeElement\)\) return;/.test(ruang),
);
// Memasang layar penuh lagi SELAGI soal isian singkat masih terpampang
// menghasilkan pantulan: layar penuh menyala, papan ketik naik lagi pada
// ketukan berikutnya, layar penuh lepas lagi. Cepat atau lambat satu pantulan
// mendarat di luar jendela pemaafan -- dan di sanalah gerbang muncul tanpa
// sebab. Maka selama soal isian tampil di perangkat sentuh, pemulihan ditunda.
periksa(
  "pemulihan ditunda selama kolom teks dipegang atau soal isian masih tampil",
  /const belumSaatnyaPulih = useCallback\(\s*\(\) => kolomTeksAktif\(\) \|\| hindariLayarPenuh\(\)/.test(
    ruang,
  ) && /if \(!paksa && belumSaatnyaPulih\(\)\)/.test(ruang),
);
// Aturan yang lebih lebar ("soal isian sedang tampil") hidup di SATU tempat
// saja, dengan dua sebab yang tidak boleh berbeda pendapat: perangkat sentuh
// (papan ketiknya menjatuhkan layar penuh sendiri) DAN WebKit apa pun (di sana
// mengetik di layar penuh memanggil panel sistem yang membekukan halaman).
// Chrome/Firefox di Windows tidak masuk keduanya, jadi di sana tidak ada yang
// melebar sedikit pun.
periksa(
  "aturan lebar soal-isian dipusatkan di satu penjaga",
  /const hindariLayarPenuh = useCallback\(\s*\(\) =>\s*soalIsianTampil\.current && \(!perambanKomputer\(\) \|\| melarangKetikDiLayarPenuh\(\)\)/.test(
    ruang,
  ) && (ruang.match(/soalIsianTampil\.current && \(!perambanKomputer/g) ?? []).length === 1,
);

/* ------------------------------------------------------------------ */
console.log("\n15. Panel WebKit 'Typing is not allowed in full screen' (9 September 2026)");
/* ------------------------------------------------------------------ */

// KELUHAN YANG MELAHIRKANNYA, dari iPad pengelola:
//
//   "keluar muncul notif seperti 'it looks like you are typing while in full
//    screen. Typing is not allowed in full screen websites.' Nah ketika saya
//    biarkan, dia langsung menganggap saya keluar lebih dari 20 detik dan gagal."
//
// Panel itu milik WebKit, bukan aplikasi: tidak ada API yang bisa menutupnya.
// Dan selama ia terpampang JavaScript halaman DIBEKUKAN -- denyut nadi berhenti,
// server melihat keheningan 20 detik, lalu menggugurkan peserta yang sebenarnya
// sedang mengetik jawabannya. Dua lapis yang menutupnya diperiksa di sini:
// halaman keluar dari layar penuh SEBELUM papan ketik naik, dan denyut yang
// hilang selagi peserta mengetik tidak lagi dibaca sebagai kepergian.

// PUTUSAN AKHIR 9 September 2026, sesudah penguji iPad melihat panel itu LAGI
// walaupun halaman sudah keluar dari layar penuh menjelang papan ketik naik:
// panel WebKit tidak hanya dipicu kolom isian, melainkan tombol APA PUN yang
// ditekan selama halaman masih di layar penuh. Selama Fullscreen API dipakai di
// sana, selalu ada celah. Maka di seluruh WebKit ruang ujian TIDAK LAGI memakai
// layar penuh sungguhan -- ia memakai layar penuh semu yang sudah dipakai
// iPhone sejak awal, dengan penjagaan yang sama sekali tidak berkurang.
const kolomPolicy = potong("pakaiLayarPenuhAsli");
periksa(
  "kebijakan layar penuh dipisahkan dari kemampuan peramban",
  typeof kolomPolicy === "string" &&
    /return adaApiLayarPenuh\(\) && !melarangKetikDiLayarPenuh\(\);/.test(kolomPolicy),
);
// Empat tempat yang menentukan apakah layar penuh sungguhan jadi dipakai. Kalau
// salah satu saja masih memakai `adaApiLayarPenuh()`, WebKit akan tetap masuk
// layar penuh lewat pintu itu -- dan panelnya kembali.
for (const [nama, pola] of [
  ["gerbang & tampilan ruang ujian", /tanpaLangganan,\s*\(\) => !pakaiLayarPenuhAsli\(\),/],
  ["tombol masuk layar penuh", /if \(!pakaiLayarPenuhAsli\(\)\) \{\s*setLayarPenuh\(true\);/],
  ["penanda lanjut tanpa gerbang", /\(!pakaiLayarPenuhAsli\(\) && bacaGerbang\(attemptId\)\)/],
  ["pemulihan layar penuh", /if \(!papanKetikMenelan\.current && !paksa\) return;\s*if \(!pakaiLayarPenuhAsli\(\)\) return;/],
]) {
  periksa(`${nama} memakai kebijakan, bukan kemampuan mentah`, pola.test(ruang));
}
// Satu-satunya permintaan layar penuh yang tersisa harus berada SESUDAH gerbang
// kebijakan, tidak boleh ada jalan lain menuju requestFullscreen.
periksa(
  "tidak ada permintaan layar penuh yang lolos dari gerbang kebijakan",
  (ruang.match(/requestFullscreen\?\.\(\)/g) ?? []).length === 2 &&
    /if \(!pakaiLayarPenuhAsli\(\)\) return;[\s\S]{0,900}requestFullscreen\?\.\(\)/.test(ruang),
);
// Papan ketik iOS menutupi viewport tanpa mengecilkannya, dan ruang ujian semu
// dikunci `position: fixed` -- tanpa penggulungan sendiri, kolom jawaban bisa
// berada persis di balik papan ketik.
periksa(
  "kolom jawaban digulung ke tengah saat papan ketik naik",
  /visualViewport/.test(ruang) &&
    /scrollIntoView\(\{ block: "center", behavior: "smooth" \}\)/.test(ruang),
);

periksa(
  "peramban yang melarang mengetik di layar penuh dikenali",
  /function melarangKetikDiLayarPenuh\(\): boolean \{/.test(ruang) &&
    /iPad\|iPhone\|iPod/.test(ruang) &&
    /maxTouchPoints/.test(ruang),
);
const sumberWebKit = potong("melarangKetikDiLayarPenuh");
if (sumberWebKit) {
  const berkasWebKit = path.join(TMP, "webkit-ujian.ts");
  fs.writeFileSync(berkasWebKit, "export " + sumberWebKit);
  const W = await import(pathToFileURL(berkasWebKit).href);
  const pasangNav = (userAgent, maxTouchPoints) =>
    Object.defineProperty(globalThis, "navigator", {
      value: { userAgent, maxTouchPoints },
      configurable: true,
      writable: true,
    });
  const navAsli = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const UA = {
    ipad: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    macSafari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    winChrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    androidChrome: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
    firefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0",
  };
  pasangNav(UA.ipad, 5);
  periksa("iPad dikenali sebagai peramban yang melarang ketik di layar penuh", W.melarangKetikDiLayarPenuh());
  pasangNav(UA.iphone, 5);
  periksa("iPhone dikenali", W.melarangKetikDiLayarPenuh());
  pasangNav(UA.macSafari, 0);
  periksa("Safari di Mac ikut dikenali (papan ketik fisik pun kena panelnya)", W.melarangKetikDiLayarPenuh());
  // Chrome dan Firefox tidak punya panel itu, dan di sanalah layar penuh
  // sungguhan masih menjadi penjagaan yang paling kuat -- jangan sampai ikut
  // kehilangannya hanya karena UA-nya memuat kata "Safari".
  pasangNav(UA.winChrome, 0);
  periksa("Chrome di Windows TIDAK ikut kehilangan layar penuh", !W.melarangKetikDiLayarPenuh());
  pasangNav(UA.androidChrome, 5);
  periksa("Chrome di Android TIDAK ikut kehilangan layar penuh", !W.melarangKetikDiLayarPenuh());
  pasangNav(UA.firefox, 0);
  periksa("Firefox TIDAK ikut kehilangan layar penuh", !W.melarangKetikDiLayarPenuh());
  if (navAsli) Object.defineProperty(globalThis, "navigator", navAsli);
}

periksa(
  "halaman keluar dari layar penuh SEBELUM papan ketik naik",
  /const lepasUntukMengetik = useCallback\(\(\) => \{[\s\S]{0,400}keluarLayarPenuh\(\);/.test(ruang),
);
// Lepasan yang diminta aplikasi sendiri tidak boleh berakhir sebagai
// pelanggaran atas nama peserta, dan tidak boleh memunculkan gerbang.
periksa(
  "lepasan buatan sendiri dikenali dan tidak pernah dicatat",
  /lepasSengaja\.current = true;/.test(ruang) &&
    /if \(!aktif && lepasSengaja\.current\) \{[\s\S]{0,320}return;/.test(ruang),
);
periksa(
  "penanda lepasan buatan sendiri padam begitu layar penuh terpasang lagi",
  /if \(aktif\) \{[\s\S]{0,200}lepasSengaja\.current = false;/.test(ruang),
);
// Gerbang yang baru dilewati memasang layar penuh SELAGI soal isian terpampang;
// tanpa pelepasan susulan ini, ketukan pertama peserta memanggil panel sistem.
periksa(
  "layar penuh yang menyala di atas soal isian langsung dilepas lagi",
  /if \(hindariLayarPenuh\(\)\) window\.setTimeout\(\(\) => lepasUntukMengetik\(\), 0\);/.test(
    ruang,
  ),
);
periksa(
  "sentuhan pada kolom teks menjadi jaring pengaman keduanya",
  /isianTerakhir\.current = Date\.now\(\);\s*beriSiaga\(\);[\s\S]{0,320}lepasUntukMengetik\(\);/.test(
    ruang,
  ),
);

// Lapis kedua: denyut yang hilang karena halaman DIBEKUKAN panel sistem.
const denyutRute = fs.readFileSync(
  path.join(AKAR, "src", "app", "api", "exam", "denyut", "route.ts"),
  "utf8",
);
periksa(
  "denyut membawa keterangan 'peserta sedang mengetik'",
  /mengetik\?: boolean;/.test(denyutRute) && /mengetik,\n/.test(ruang),
);
periksa(
  "halaman beku saat mengetik tidak lagi dibaca sebagai kepergian",
  /\(Number\(muatan\.percobaan \?\? 0\) >= 2 \|\| muatan\.mengetik === true\)/.test(denyutRute),
);
// DUA PAGAR yang tidak boleh ikut longgar: halaman tetap wajib membuktikan ia
// TIDAK PERNAH tersembunyi, dan kelonggarannya tetap berhenti di 90 detik.
periksa(
  "kelonggaran tetap menuntut halaman tidak pernah tersembunyi",
  /const terbukti =\s*muatan\.terlihat === true &&/.test(denyutRute),
);
periksa(
  "kelonggaran tetap berhenti di AMBANG_DENYUT_TERLIHAT_DETIK",
  /jeda <= AMBANG_DENYUT_TERLIHAT_DETIK &&/.test(denyutRute),
);
// Keterangannya menggambarkan keadaan SEPANJANG jeda, bukan sedetik denyutnya:
// sekali menyala ia bertahan sampai ada denyut yang benar-benar sampai.
periksa(
  "keterangan mengetik bertahan sepanjang jeda, bukan sekejap",
  /mengetik = mengetik \|\| diKolom;/.test(ruang) && /mengetik = diKolom;/.test(ruang),
);
// PENANDA LINTAS-PASANG. Tanpa ini, ganti subtes selagi papan ketik masih
// menelan layar penuh melahirkan gerbang PERDANA "Masuk Layar Penuh & Mulai"
// di tengah ujian -- keluhan penguji iPad 9 September 2026.
periksa(
  "keadaan ditelan papan ketik bertahan melewati pemasangan ulang komponen",
  /const KUNCI_PAPAN_KETIK = "adzkia-papan-ketik";/.test(ruang) &&
    /tandaiPapanKetik\(attemptId, true\);/.test(ruang) &&
    /tandaiPapanKetik\(attemptId, false\);/.test(ruang),
);
periksa(
  "ruang ujian yang baru dipasang tidak menagih layar penuh yang ditelan papan ketik",
  /\(bacaGerbang\(attemptId\) && bacaPapanKetik\(attemptId\)\)/.test(ruang),
);
periksa(
  "penanda papan ketik padam begitu layar penuh terpasang lagi",
  /if \(aktif\) \{[\s\S]{0,220}tandaiPapanKetik\(attemptId, false\);/.test(ruang),
);
// Penandanya dibuang bersama penanda gerbang saat ujian benar-benar selesai,
// supaya ronde/susulan berikutnya lahir bersih.
periksa(
  "penanda papan ketik ikut dibuang saat ujian selesai",
  /tandaiGerbang\(attemptId, false\);\s*tandaiPapanKetik\(attemptId, false\);/.test(ruang),
);
periksa(
  "penanda pemaafan padam sendiri begitu layar penuh terpasang lagi",
  /if \(aktif\) \{\s*papanKetikMenelan\.current = false;/.test(ruang),
);

// YANG TIDAK IKUT DIMAAFKAN. Ini yang menjaga pemaafan tetap sempit: seluruh
// penjagaan lain berjalan penuh selama jendela itu. Yang dibungkam hanya
// catatan lepasnya layar penuh itu sendiri.
for (const jenis of ["keluar_tab", "blur_window", "alt_tab", "tangkap_layar"]) {
  periksa(
    `penjagaan ${jenis} tidak tahu-menahu soal papan ketik`,
    !new RegExp("papanKetikMenelan[\\s\\S]{0,400}" + jenis).test(ruang) &&
      !new RegExp(jenis + "[\\s\\S]{0,400}papanKetikMenelan").test(ruang),
  );
}
// Layar penuh semu (iPhone) tidak punya Fullscreen API sama sekali, jadi ia
// tidak boleh ikut lewat jalur ini -- di sana tidak ada yang bisa dilepas
// maupun dipasang kembali.
periksa(
  "layar penuh semu iPhone tidak ikut lewat jalur pemaafan",
  /sedangMengetik\(\) && !escBaruSaja\(\) && adaApiLayarPenuh\(\)/.test(ruang),
);

/* ------------------------------------------------------------------ */
console.log("\n16. Anggaran kepergian yang MENUMPUK (9 September 2026)");
/* ------------------------------------------------------------------ */

// PERMINTAAN PENGELOLA, harfiah, sesudah ia menemukan lubangnya di iPad:
//
//   "Ketika siswa bolak-balik pada halaman Safari, ke halaman ujian kemudian ke
//    halaman mencari kunci jawabannya ... dia menghabiskan waktu 5 detik,
//    kemudian kembali ke halaman ujian, terus kembali lagi ke halaman mencari
//    jawaban yang tadi. Seharusnya jangan dihitung lagi detiknya dari awal.
//    Lanjutannya saja dihitung ... tapi dikasih catatan ke admin aktifitasnya
//    begitu, dan ke notifikasi sama siswanya."
//
// Lubangnya terbuka karena WebKit berhenti memakai layar penuh sungguhan (lihat
// bagian 15): bilah Safari kembali terlihat di iPad, dan tab kedua hanya sejauh
// satu ketukan. Rem lama menilai TIAP kepergian sendiri-sendiri, jadi sepuluh
// kepergian lima detik tidak pernah menyentuh ambang mana pun.

periksa(
  "anggaran kepergian ada dan sama dengan ambang sekali-jalan",
  typeof D.BUDGET_PERGI_DETIK === "number" && D.BUDGET_PERGI_DETIK === D.AMBANG_KEMBALI_DETIK,
  "dapat " + D.BUDGET_PERGI_DETIK,
);

// Attempt sendiri supaya tidak mengganggu hitungan bagian-bagian sebelumnya.
run(
  "INSERT INTO users (id, nama, email, password_hash, role) VALUES (2, 'Siswa Menumpuk', 'menumpuk@cek.local', 'x', 'siswa')",
);
run(
  "INSERT INTO attempts (id, user_id, package_id, status, subtes_aktif) VALUES (2, 2, 1, 'ongoing', 'PU')",
);

/** Satu kepergian utuh: pergi, lalu kembali sesudah `detik`. */
const pergiSelama = (detik) => {
  const { id } = P.catatKeluar(2, 2, 1, "PU", "keluar_tab", null);
  run(
    "UPDATE violations SET mulai_at = datetime('now','localtime', ? || ' seconds') WHERE id = ?",
    "-" + detik,
    id,
  );
  const durasi = P.catatKembali(id, 2);
  return { id, durasi };
};

const pergi1 = pergiSelama(4);
periksa(
  "kepergian pertama terukur ~4 detik",
  pergi1.durasi >= 4 && pergi1.durasi <= 7,
  "dapat " + pergi1.durasi,
);
periksa(
  "jumlahnya baru sekitar 4 detik — jauh di bawah anggaran",
  P.totalDetikKepergian(2) < D.BUDGET_PERGI_DETIK,
  "dapat " + P.totalDetikKepergian(2),
);

const pergi2 = pergiSelama(4);
const pergi3 = pergiSelama(4);
const totalTiga = P.totalDetikKepergian(2);
periksa(
  "tiga kepergian pendek DIJUMLAHKAN, bukan dihitung ulang dari nol",
  totalTiga >= 12 && totalTiga < D.BUDGET_PERGI_DETIK,
  "dapat " + totalTiga,
);
// Inilah inti permintaannya: masing-masing di bawah ambang sekali-jalan, jadi
// rem lama tidak pernah menyentuh satu pun dari ketiganya.
periksa(
  "tak satu pun dari ketiganya melanggar ambang sekali-jalan",
  [pergi1, pergi2, pergi3].every((k) => k.durasi <= D.AMBANG_KEMBALI_DETIK),
);
periksa("ketiganya masih berjenis keluar_tab (hanya dicatat)", !J.menggugurkan("keluar_tab"));

// Kepergian keempat melewatkan jumlahnya dari anggaran.
const pergi4 = pergiSelama(9);
const totalEmpat = P.totalDetikKepergian(2);
periksa(
  "kepergian keempat membuat jumlahnya melewati anggaran",
  totalEmpat >= D.BUDGET_PERGI_DETIK,
  "dapat " + totalEmpat,
);
periksa(
  "baris terakhir dinaikkan menjadi pergi_menumpuk",
  P.naikkanKePergiMenumpuk(pergi4.id, 2, totalEmpat) === true,
);
const barisMenumpuk = one("SELECT jenis, keterangan FROM violations WHERE id = ?", pergi4.id);
periksa("jenisnya kini pergi_menumpuk", barisMenumpuk.jenis === "pergi_menumpuk");
periksa("dan itu menggugurkan", J.menggugurkan("pergi_menumpuk") === true);
// Pengawas harus bisa MEMBACA polanya, bukan cuma melihat deretan kepergian
// pendek yang masing-masing tampak tak berarti — permintaan pengelola.
periksa(
  "keterangannya membawa angka jumlahnya untuk laporan pengawas",
  /Jumlah seluruh kepergian mencapai \d+ detik/.test(barisMenumpuk.keterangan ?? ""),
  "dapat " + barisMenumpuk.keterangan,
);
periksa(
  "peserta membaca sebab yang menyebut penjumlahannya",
  /dijumlahkan/.test(J.pesanGugurJenis("utbk", "pergi_menumpuk")) &&
    new RegExp(String(D.AMBANG_KEMBALI_DETIK)).test(J.pesanGugurJenis("utbk", "pergi_menumpuk")),
);
periksa(
  "labelnya terbaca pengawas di panel admin",
  /[Bb]olak-balik/.test(J.labelJenis("pergi_menumpuk")),
);

// Satu baris yang sudah dinaikkan tidak boleh dinaikkan dua kali — satu
// kejadian tetap satu baris di mata pengawas.
periksa(
  "baris yang sudah dinaikkan tidak bisa dinaikkan lagi",
  P.naikkanKePergiMenumpuk(pergi4.id, 2, totalEmpat) === false,
);

// YANG TIDAK IKUT DIJUMLAHKAN, dan ini pagar yang menjaga rem ini tetap adil:
// jeda jaringan (`denyut_tersendat`) dan kejadian yang halamannya masih
// terpampang di layar peserta.
P.catatDenyutTersendat(2, 2, 1, "PU", 45, 6);
const totalSesudahTersendat = P.totalDetikKepergian(2);
periksa(
  "jeda jaringan yang halamannya tetap terlihat TIDAK ikut dijumlahkan",
  totalSesudahTersendat === totalEmpat,
  "dapat " + totalSesudahTersendat + ", sebelumnya " + totalEmpat,
);

// Rute violation harus benar-benar memanggil rem ini, bukan cuma menyediakannya.
const ruteViolation = fs.readFileSync(
  path.join(AKAR, "src", "app", "api", "exam", "violation", "route.ts"),
  "utf8",
);
periksa(
  "rute kepergian memakai anggaran menumpuk saat peserta kembali",
  /const totalDetik = totalDetikKepergian\(att\.id\);/.test(ruteViolation) &&
    /totalDetik >= BUDGET_PERGI_DETIK && naikkanKePergiMenumpuk\(id, att\.id, totalDetik\)/.test(
      ruteViolation,
    ),
);
periksa(
  "rute mengirim sisa anggaran ke peramban supaya peserta bisa diberi tahu",
  /totalDetik,\s*budgetDetik: BUDGET_PERGI_DETIK,/.test(ruteViolation),
);
periksa(
  "pola bolak-baliknya ditempelkan ke keterangan untuk pengawas",
  /tandaiTotalKepergian\(id, att\.id, totalDetik, BUDGET_PERGI_DETIK\);/.test(ruteViolation),
);
// PEMBERITAHUAN KE SISWA. Keputusan 8 September ("jangan ganggu siswa dengan
// bilah pemberitahuan") sengaja DIBALIK di sini, dan pembalikannya harus tetap
// terlihat: peserta yang tidak pernah melihat angkanya bergerak akan gugur oleh
// hitungan yang tidak pernah ia sadari sedang berjalan.
periksa(
  "peserta diberi tahu sisa anggarannya setiap kali kembali",
  /setPesanPergi\(/.test(ruang) &&
    /sisa \$\{sisa\} detik sebelum ujian dihentikan/.test(ruang),
);
periksa(
  "pemberitahuannya menyebut bahwa kepergian dijumlahkan",
  /Setiap kepergian dijumlahkan, bukan dihitung ulang dari nol/.test(ruang),
);
// Panel admin harus menampilkan keterangannya, kalau tidak catatan itu hanya
// hidup di dalam basis data dan tidak pernah sampai ke pengawas.
const halamanAdmin = fs.readFileSync(
  path.join(AKAR, "src", "app", "admin", "pelanggaran", "page.tsx"),
  "utf8",
);
periksa(
  "panel pelanggaran menampilkan keterangan tiap baris",
  /\{v\.keterangan && \(/.test(halamanAdmin),
);

if (gagal > 0) {
  console.log("\n" + gagal + " pemeriksaan GAGAL.\n");
  process.exit(1);
}
console.log("\nSemua pemeriksaan denyut nadi lulus.\n");
