/**
 * Pengujian UNGGAH GAMBAR SOAL — jalur gambar manual untuk paket UTBK dan SKD.
 *
 * Cara menjalankan (dari root proyek):
 *     npm run cek:gambar
 *
 * Empat hal yang dijaga di sini:
 *   1. Jenis gambar dikenali dari BYTE berkasnya, bukan dari namanya. Nama
 *      berkas datang dari komputer admin dan boleh saja berbohong.
 *   2. Tempat menyimpan gambar unggahan SAMA PERSIS dengan tempat gambar hasil
 *      impor naskah Word. Kalau keduanya berpisah, satu paket punya dua folder
 *      gambar dan yang satu pasti terlupakan saat memindahkan server.
 *   3. Batas 1 MB berlaku di kedua sisi — peramban maupun server.
 *   4. Panel admin memakai daftar subtes sesuai JALUR paket. Sebelum ini panel
 *      selalu memakai daftar UTBK, sehingga butir SKD tidak pernah muncul dan
 *      tidak bisa diberi gambar sama sekali.
 *
 * Berkas .ts dipakai apa adanya, hanya disalin ke folder sementara dengan
 * penambahan ekstensi pada impor supaya bisa dimuat langsung oleh Node.
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
const TMP = path.join(AKAR, ".tmp", "cek", "gambar");

// Dibersihkan di AWAL, bukan di akhir: Windows masih memegang berkas yang baru
// saja ditulis dan melempar EPERM bila foldernya dihapus di penghujung skrip.
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

const MODUL = path.join(TMP, "modul");
fs.mkdirSync(MODUL, { recursive: true });
for (const nama of ["gambar-soal-konstanta", "gambar-soal", "skd", "snbt"]) {
  const sumber = fs.readFileSync(cariDiLib(`${nama}.ts`), "utf8");
  const rapi = sumber
    .replace(/^import "server-only";\s*$/m, "")
    .replace(/from "@\/lib\/(?:[a-z0-9-]+\/)?([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"')
    .replace(/from "\.\/([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"');
  fs.writeFileSync(path.join(MODUL, `${nama}.ts`), rapi);
}

const gambar = await import(pathToFileURL(path.join(MODUL, "gambar-soal.ts")).href);
const snbt = await import(pathToFileURL(path.join(MODUL, "snbt.ts")).href);

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

const baca = (p) => fs.readFileSync(path.join(AKAR, p), "utf8");

/* ==========================================================================
   1. PENGENALAN JENIS GAMBAR
   ========================================================================== */
judul("1. Jenis gambar dikenali dari isinya");

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46]);
const GIF = Uint8Array.from([...Buffer.from("GIF89a"), 1, 0, 1, 0]);
const WEBP = Uint8Array.from([
  ...Buffer.from("RIFF"),
  0x1a,
  0,
  0,
  0,
  ...Buffer.from("WEBPVP8 "),
]);

cek("PNG dikenali", gambar.kenaliJenisGambar(PNG)?.ext === "png");
cek("JPEG dikenali", gambar.kenaliJenisGambar(JPEG)?.ext === "jpg");
cek("GIF dikenali", gambar.kenaliJenisGambar(GIF)?.ext === "gif");
cek("WEBP dikenali", gambar.kenaliJenisGambar(WEBP)?.ext === "webp");
cek("berkas kosong ditolak", gambar.kenaliJenisGambar(new Uint8Array()) === null);
cek(
  "berkas teks yang dinamai .png ditolak",
  gambar.kenaliJenisGambar(Uint8Array.from(Buffer.from("<html>bukan gambar</html>"))) === null,
);
cek(
  "RIFF tanpa penanda WEBP ditolak",
  gambar.kenaliJenisGambar(
    Uint8Array.from([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WAVEfmt ")]),
  ) === null,
  "berkas WAV berawalan RIFF juga",
);
cek(
  "ekstensi mengikuti isi, bukan nama",
  gambar.kenaliJenisGambar(JPEG)?.ext === "jpg" && gambar.kenaliJenisGambar(JPEG)?.mime === "image/jpeg",
);

/* ==========================================================================
   2. TEMPAT MENYIMPAN
   ========================================================================== */
judul("2. Gambar unggahan mendarat di folder yang sama dengan gambar naskah");

const naskah = baca("src/lib/naskah-docx.ts");
cek(
  "naskah-docx memakai public/soal/<kode-paket>",
  /path\.posix\.join\("soal", amanNamaFolder\(kodePaket\)\)/.test(naskah),
);
cek(
  "gambar-soal menyusun folder yang sama untuk jalur Tryout",
  gambar.folderGambar("soal", "TO-4SEP2026") === "soal/to-4sep2026",
);
cek(
  "aturan perapian nama folder Tryout identik dengan naskah-docx",
  gambar.amanNamaFolder("TO-4Sep2026") === "to-4sep2026" &&
    gambar.amanNamaFolder("TO 4 September!!") === "to-4-september" &&
    gambar.amanNamaFolder("???") === "naskah",
);
cek(
  "folder Warung MEMPERTAHANKAN huruf besar",
  gambar.folderGambar("warung", "PK-1") === "warung/PK-1",
  "alamat lama berbunyi /warung/PK-1/...; di Linux pk-1 adalah folder lain",
);

// Penyimpanan sungguhan: `simpanGambarSoal` menulis relatif terhadap cwd.
const cwdLama = process.cwd();
process.chdir(TMP);
const simpan1 = await gambar.simpanGambarSoal(PNG, "soal", "TO-4SEP2026");
const simpan2 = await gambar.simpanGambarSoal(PNG, "soal", "TO-4SEP2026");
const simpan3 = await gambar.simpanGambarSoal(JPEG, "soal", "TO-4SEP2026");
const simpanW = await gambar.simpanGambarSoal(PNG, "warung", "PK-1");
process.chdir(cwdLama);

cek("alamat hasil berbentuk /soal/<kode>/<sidik>.png", /^\/soal\/to-4sep2026\/[0-9a-f]{16}\.png$/.test(simpan1.url), simpan1.url);
cek("gambar yang sama tidak menghasilkan berkas kedua", simpan1.url === simpan2.url);
cek("gambar berbeda menghasilkan alamat berbeda", simpan1.url !== simpan3.url);
cek(
  "berkasnya benar-benar ada di public/soal/",
  fs.existsSync(path.join(TMP, "public", "soal", "to-4sep2026", path.basename(simpan1.url))),
);
cek(
  "hanya dua berkas untuk tiga kali unggah",
  fs.readdirSync(path.join(TMP, "public", "soal", "to-4sep2026")).length === 2,
);
cek("alamat Warung berbentuk /warung/PK-1/<sidik>.png", /^\/warung\/PK-1\/[0-9a-f]{16}\.png$/.test(simpanW.url), simpanW.url);
cek(
  "berkas Warung mendarat di public/warung/PK-1/",
  fs.existsSync(path.join(TMP, "public", "warung", "PK-1", path.basename(simpanW.url))),
);
cek(
  "isi yang sama tetap dipisahkan per bank soal",
  simpanW.url !== simpan1.url,
  "Tryout dan Warung tidak berbagi folder",
);

const wimpor = baca("src/lib/warung-impor.ts");
cek(
  "impor naskah Warung ikut lewat simpanGambarSoal()",
  /simpanGambarSoal\(isi, "warung", folderPaket\)/.test(wimpor),
);
cek(
  "ekstensi berkas Warung tidak lagi diambil dari jenis MIME",
  !/const ext = jenisGambar\(nama\)/.test(wimpor),
  "dulu menghasilkan nama <sidik>.image/png yang mustahil ditulis",
);

/* ==========================================================================
   3. BATAS 1 MB DITEGAKKAN DI KEDUA SISI
   ========================================================================== */
judul("3. Batas ukuran berlaku di peramban DAN di server");

cek("batas resmi 1 MB", gambar.BATAS_GAMBAR_MB === 1 && gambar.BATAS_GAMBAR_BYTE === 1048576);

const rute = baca("src/app/api/admin/gambar-soal/route.ts");
cek("server menolak berkas melebihi batas", /berkas\.size > BATAS_GAMBAR_BYTE/.test(rute));
cek("server memeriksa isi berkas, bukan namanya", /kenaliJenisGambar\(isi\)/.test(rute));
cek(
  "server menolak yang bukan admin",
  /admin\.role !== "admin"/.test(rute) && /401/.test(rute),
);
cek(
  "rute melayani kedua bank soal",
  /jenis === "warung"/.test(rute) && /ambilPaketWarung\(paketId\)/.test(rute),
);
cek(
  "folder tujuan dihitung server dari baris paketnya",
  /function tujuanSimpan/.test(rute) && !/fd\.get\("folder"\)/.test(rute),
  "nama folder dari peramban = lubang menulis ke mana saja di public/",
);
cek(
  "requireAdmin() TIDAK dipanggil di rute ini",
  !/await requireAdmin\(/.test(rute) && /await getSession\(\)/.test(rute),
  "pengalihan HTML tidak bisa dibaca fetch()",
);

const unggah = baca("src/components/admin/UnggahGambar.tsx");
cek("peramban ikut memeriksa batas", /berkas\.size > BATAS_GAMBAR_BYTE/.test(unggah));
cek("berkas kelewat besar dikecilkan dulu, bukan ditolak", /kecilkanGambar\(berkas, BATAS_GAMBAR_BYTE\)/.test(unggah));
cek("admin diberi tahu saat gambarnya dikecilkan", /dikecilkan otomatis menjadi/.test(unggah));
cek("GIF beranimasi tidak dikecilkan diam-diam", /image\/gif/.test(unggah));
cek(
  "alamat hasil dikirim lewat input bernama gambar_url",
  /nama = "gambar_url"/.test(unggah) && /type="hidden" name=\{nama\}/.test(unggah),
  "nama yang dibaca simpanSoalAction",
);

const konstanta = baca("src/lib/gambar-soal-konstanta.ts");
cek(
  "konstanta batas tinggal di berkas tanpa server-only",
  !/^import "server-only"/m.test(konstanta),
  "kalau tidak, komponen klien gagal dibundel",
);

/* ==========================================================================
   4. JARING PENGAMAN GAMBAR 404
   ========================================================================== */
judul("4. Gambar baru tetap terlayani tanpa menyalakan ulang server");

const pelayanSoal = baca("src/app/soal/[...jalan]/route.ts");
const pelayanWarung = baca("src/app/warung/[subtes]/[...berkas]/route.ts");
const inti = baca("src/lib/gambar-soal.ts");
cek("ada rute cadangan untuk /soal/...", /layaniGambar\("soal", jalan\)/.test(pelayanSoal));
cek("ada rute cadangan untuk /warung/...", /layaniGambar\("warung", \[subtes, \.\.\.berkas\]\)/.test(pelayanWarung));
cek("jalan dijaga tetap di dalam akarnya", /berkas\.startsWith\(dasar \+ path\.sep\)/.test(inti));
cek("segmen alamat disaring", /SEGMEN_AMAN/.test(inti) && /s === "\.\."/.test(inti));
cek("hanya ekstensi gambar yang dilayani", /const tipe = TIPE_LAYAN\[ekstensi\];/.test(inti));
cek(
  "SVG boleh DILAYANI tapi tidak boleh DIUNGGAH",
  /svg: "image\/svg\+xml"/.test(inti) && !/svg/i.test(konstanta),
  "gambar Warung bawaan berformat .svg; SVG baru bisa memuat <script>",
);
cek("SVG dilayani dengan CSP yang mematikan skrip", /Content-Security-Policy/.test(inti));

judul("4b. Formulir soal Warung memakai kotak unggah yang sama");

const formWarung = baca("src/components/admin/WarungSoalForm.tsx");
cek(
  "WarungSoalForm memasang UnggahGambar",
  /<UnggahGambar paket=\{\{ jenis: "warung", id: paketId \}\}/.test(formWarung),
);
cek("kolom Alamat gambar yang lama sudah dilepas", !/id="gambar_url"/.test(formWarung));
cek(
  "kotak unggah ikut dikosongkan saat formulir di-reset",
  /form\.addEventListener\("reset", kosongkan\)/.test(unggah),
  "formulir Warung memanggil form.reset() sesudah menambah butir",
);
cek(
  "formulir Warung memang masih memanggil reset()",
  /formRef\.current\?\.reset\(\)/.test(formWarung),
);

/* ==========================================================================
   5. PANEL ADMIN SADAR JALUR (UTBK vs SKD)
   ========================================================================== */
judul("5. Paket SKD memakai subtesnya sendiri");

const utbk = snbt.subtesJalur("utbk").map((s) => s.kode);
const skd = snbt.subtesJalur("skd").map((s) => s.kode);
cek("jalur UTBK memberi 7 subtes", utbk.length === 7 && utbk[0] === "PU", utbk.join(","));
cek("jalur SKD memberi 3 subtes", skd.join(",") === "TWK,TIU,TKP");
cek("jalur kosong dianggap UTBK", snbt.subtesJalur(undefined).length === 7);
cek("kuota UTBK 160, SKD 110", snbt.totalSoalJalur("utbk") === 160 && snbt.totalSoalJalur("skd") === 110);
cek(
  "subtes SKD dikenali lintas jalur",
  snbt.getSubtesApaPun("TKP")?.jumlahSoal === 45 && snbt.getSubtesApaPun("PU")?.jumlahSoal === 30,
);
cek("kode ngawur tetap tidak dikenal", snbt.getSubtesApaPun("XYZ") === undefined);

const admin = baca("src/lib/admin.ts");
cek(
  "validasiSoal menerima subtes kedua jalur",
  /const sub = getSubtesApaPun\(input\.subtes\);/.test(admin),
  "dulu getSubtes() -> butir SKD selalu ditolak \"Subtes tidak dikenal\"",
);
cek("ringkasanSubtes menelusuri subtes jalurnya", /subtesJalur\(jalur\)\.map/.test(admin));
cek("nomor kosong berikutnya memakai kuota jalur yang benar", /getSubtesApaPun\(subtes\)\?\.jumlahSoal/.test(admin));

for (const [nama, berkas] of [
  ["Bank Soal", "src/app/admin/paket/[id]/soal/page.tsx"],
  ["Pratinjau Soal", "src/app/admin/paket/[id]/pratinjau/page.tsx"],
  ["Tambah Soal", "src/app/admin/paket/[id]/soal/baru/page.tsx"],
]) {
  cek(`halaman ${nama} memakai subtesJalur(paket.jalur)`, /subtesJalur\(paket\.jalur\)/.test(baca(berkas)));
}
cek(
  "editor butir menerima jalur paket",
  /jalur=\{paket\.jalur\}/.test(baca("src/app/admin/paket/[id]/soal/[soalId]/page.tsx")),
);

/* ==========================================================================
   6. SUSUNAN PRATINJAU SAMA DENGAN RUANG UJIAN
   ========================================================================== */
judul("6. Pratinjau menyusun butir seperti yang dibaca peserta");

const pratinjau = baca("src/components/admin/PratinjauSoal.tsx");
const kartu = baca("src/components/exam/KartuSoal.tsx");

const urutanPratinjau = ["html={data.pertanyaan}", "{gambar && ("].map((p) => pratinjau.indexOf(p));
cek(
  "gambar diletakkan SESUDAH pertanyaan",
  urutanPratinjau[0] > -1 && urutanPratinjau[1] > urutanPratinjau[0],
  "sama dengan urutan di KartuSoal",
);
cek(
  "ruang ujian juga menaruh gambar sesudah pertanyaan",
  kartu.indexOf("soal.gambar_url && <GambarSoal") > kartu.indexOf("html={soal.pertanyaan}"),
);
cek(
  "naskah bergambar tidak lagi disebut \"opsi belum diisi\"",
  /pilihanDiGambar/.test(pratinjau),
);
cek(
  "aturan naskah bergambar disalin persis dari ruang ujian",
  /opsiTampil\.length > 0 && opsiTampil\.every\(\(o\) => !o\.trim\(\)\)/.test(pratinjau) &&
    /soal\.opsi\.length > 0 && soal\.opsi\.every\(\(o\) => !o\.trim\(\)\)/.test(kartu),
);
cek(
  "gambar pratinjau beralas putih",
  /bg-white/.test(pratinjau),
  "supaya PNG transparan terbaca di tema gelap",
);

/* ------------------------------------------------------------------ */
judul(`Ringkasan: ${lulus} lulus, ${gagal} gagal.`);
process.exit(gagal === 0 ? 0 : 1);
