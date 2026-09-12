/**
 * Pengujian MESIN UJIAN IELTS.
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/ielts-check.mjs
 *
 * Yang diperiksa — semuanya aturan yang tidak boleh diam-diam berubah:
 *
 *   1. Urutan subtes ditegakkan SERVER. Reading tidak bisa dibuka sebelum
 *      Listening ditutup, walau alamatnya diketik langsung.
 *   2. Tata tertib wajib disetujui sebelum subtes mana pun terbuka.
 *   3. Subtes tanpa soal tidak bisa dibuka.
 *   4. Timer milik server: deadline dihitung sekali saat subtes dibuka, membuka
 *      ulang TIDAK menambah waktu, dan subtes yang tenggatnya lewat menutup
 *      sendiri.
 *   5. Jawaban ditolak sesudah subtes ditutup — inilah yang membuat timer
 *      berarti; tanpanya halaman yang dibiarkan terbuka masih bisa mengirim
 *      jawaban sejam sesudah waktunya lewat.
 *   6. Penilaian isian singkat: huruf besar-kecil dan spasi berlebih diabaikan,
 *      beberapa kunci sah dipisah "|", tetapi EJAAN tetap dihitung — sama
 *      seperti IELTS asli.
 *   7. Tabel konversi band Listening dan Reading memang berbeda.
 *   8. Writing dan Speaking tidak pernah dinilai mesin.
 *   9. Jenis berkas rekaman dikenali dari ISI, bukan dari nama berkasnya.
 *
 * Berkas .ts asli dipakai apa adanya — hanya disalin ke folder sementara DI
 * DALAM proyek (supaya node_modules tetap terjangkau) dengan penambahan
 * ekstensi pada impornya, sama seperti `peserta-paket-check.mjs`.
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
const TMP = path.join(AKAR, ".tmp", "cek", "ielts");

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

const { run, one } = await muat("db");
const I = await muat("ielts");
const A = await muat("ielts-audio");

let gagal = 0;
function periksa(nama, syarat, tambahan = "") {
  if (syarat) {
    console.log(`  OK   ${nama}`);
  } else {
    gagal++;
    console.log(`  GAGAL ${nama}${tambahan ? ` — ${tambahan}` : ""}`);
  }
}

/** Menjalankan fn dan memulangkan pesan galatnya, atau null bila lolos. */
function galat(fn) {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/* ---------------- Data uji ---------------- */

run(
  "INSERT INTO users (nama, email, password_hash, role, nisn) VALUES ('Uji IELTS','uji.ielts@cek.local','x','siswa','0000000001')",
);
const userId = one("SELECT id FROM users WHERE nisn = '0000000001'").id;

const paketId = I.buatPaket({ kode: "CEK-01", nama: "Paket Pemeriksaan" });
I.setStatusPaket(paketId, "published");

const seksiL = I.seksiSubtes(paketId, "LISTENING");
const seksiR = I.seksiSubtes(paketId, "READING");

console.log("\n0) Bagian dibuat otomatis saat paket lahir");
periksa("Listening punya 4 Recording", seksiL.length === 4);
periksa("Reading punya 3 Passage", seksiR.length === 3);
periksa("Writing punya 2 Task", I.seksiSubtes(paketId, "WRITING").length === 2);

// 40 butir Listening: campuran isian singkat, pilihan ganda, dan TFNG.
for (let n = 1; n <= 40; n++) {
  const seksi = seksiL[Math.floor((n - 1) / 10)];
  if (n % 3 === 0) {
    I.simpanSoal(paketId, "LISTENING", {
      seksiId: seksi.id,
      nomor: n,
      tipe: "PG",
      pertanyaan: `Soal ${n}`,
      opsi: ["A satu", "B dua", "C tiga", "D empat"],
      kunci: "B",
    });
  } else if (n % 3 === 1) {
    I.simpanSoal(paketId, "LISTENING", {
      seksiId: seksi.id,
      nomor: n,
      tipe: "IS",
      pertanyaan: `Soal ${n}`,
      opsi: [],
      kunci: "nine thirty|9.30",
    });
  } else {
    I.simpanSoal(paketId, "LISTENING", {
      seksiId: seksi.id,
      nomor: n,
      tipe: "TFNG",
      pertanyaan: `Soal ${n}`,
      opsi: [],
      kunci: "NOT GIVEN",
    });
  }
}
// Reading diberi satu butir saja supaya bisa dibuka pada pengujian urutan.
I.simpanSoal(paketId, "READING", {
  seksiId: seksiR[0].id,
  nomor: 1,
  tipe: "TFNG",
  pertanyaan: "Reading 1",
  opsi: [],
  kunci: "TRUE",
});

console.log("\n1) Nomor tidak boleh bentrok");
periksa(
  "nomor 1 kedua kali ditolak",
  galat(() =>
    I.simpanSoal(paketId, "LISTENING", {
      seksiId: seksiL[0].id,
      nomor: 1,
      tipe: "IS",
      pertanyaan: "kembar",
      opsi: [],
      kunci: "x",
    }),
  ) !== null,
);

console.log("\n2) Tata tertib wajib disetujui lebih dulu");
let p = I.mulaiPengerjaan(userId, paketId);
periksa("pengerjaan lahir tanpa setuju_at", p.setuju_at === null);
periksa(
  "buka Listening ditolak sebelum setuju",
  (galat(() => I.bukaSubtes(p, "LISTENING")) ?? "").includes("tata tertib"),
);

p = I.setujuiRules(userId, paketId);
periksa("setuju_at tercatat", Boolean(p.setuju_at));

console.log("\n3) Urutan subtes ditegakkan server");
periksa(
  "Reading ditolak sebelum Listening tuntas",
  (galat(() => I.bukaSubtes(p, "READING")) ?? "").includes("Listening"),
);
periksa("Listening boleh dibuka", galat(() => I.bukaSubtes(p, "LISTENING")) === null);

console.log("\n4) Subtes tanpa soal tidak bisa dibuka");
// Writing sengaja dibiarkan kosong; tutup Listening dan Reading dulu supaya
// urutan bukan lagi yang menghalangi.
I.selesaikanSubtes(p, "LISTENING");
I.bukaSubtes(p, "READING");
I.selesaikanSubtes(p, "READING");
periksa(
  "Writing kosong ditolak",
  (galat(() => I.bukaSubtes(p, "WRITING")) ?? "").includes("belum diisi"),
);

console.log("\n5) Timer milik server");
const p2Id = (() => {
  // Peserta kedua, paket sama — supaya pengujian timer tidak terganggu subtes
  // yang sudah ditutup di atas.
  run(
    "INSERT INTO users (nama, email, password_hash, role, nisn) VALUES ('Uji Dua','uji.dua@cek.local','x','siswa','0000000002')",
  );
  return one("SELECT id FROM users WHERE nisn = '0000000002'").id;
})();
let p2 = I.setujuiRules(p2Id, paketId);
I.bukaSubtes(p2, "LISTENING");
const sisaAwal = I.sisaDetik(p2.id, "LISTENING");
periksa(
  `sisa waktu ~60 menit (${sisaAwal} detik)`,
  sisaAwal > 3500 && sisaAwal <= 3600,
);

const tenggatAwal = I.subtesBerjalan(p2.id, "LISTENING").deadline_at;
I.bukaSubtes(p2, "LISTENING"); // dipanggil dua kali
periksa(
  "membuka ulang TIDAK menambah waktu",
  I.subtesBerjalan(p2.id, "LISTENING").deadline_at === tenggatAwal,
);

console.log("\n6) Jawaban tersimpan, lalu ditolak sesudah subtes ditutup");
const soal1 = one(
  "SELECT id FROM ielts_soal WHERE paket_id = ? AND subtes = 'LISTENING' AND nomor = 1",
  paketId,
);
periksa(
  "jawaban tersimpan selagi subtes terbuka",
  galat(() => I.simpanJawaban(p2, soal1.id, "Nine Thirty")) === null,
);
periksa(
  "jawaban terbaca kembali",
  I.jawabanTersimpan(p2.id, "LISTENING")[soal1.id] === "Nine Thirty",
);

// Tenggat dimundurkan seolah waktunya sudah lewat.
run(
  "UPDATE ielts_subtes SET deadline_at = datetime('now','-1 minutes') WHERE pengerjaan_id = ? AND subtes = 'LISTENING'",
  p2.id,
);
I.tutupYangHabis(p2.id);
periksa(
  "subtes yang tenggatnya lewat menutup sendiri",
  Boolean(I.subtesBerjalan(p2.id, "LISTENING").selesai_at),
);
periksa("sisa waktu jadi 0", I.sisaDetik(p2.id, "LISTENING") === 0);
periksa(
  "jawaban DITOLAK sesudah waktu habis",
  (galat(() => I.simpanJawaban(p2, soal1.id, "curang")) ?? "").length > 0,
);
periksa(
  "jawaban lama tidak berubah",
  I.jawabanTersimpan(p2.id, "LISTENING")[soal1.id] === "Nine Thirty",
);

console.log("\n7) Papan subtes memulangkan keadaan yang benar");
const keadaan = Object.fromEntries(
  I.statusSemuaSubtes(p2).map((s) => [s.kode, s.keadaan]),
);
periksa("Listening selesai", keadaan.LISTENING === "selesai");
periksa("Reading siap (ada soalnya)", keadaan.READING === "siap");
periksa("Writing masih terkunci selama Reading belum tuntas", keadaan.WRITING === "terkunci");
periksa("Speaking terkunci", keadaan.SPEAKING === "terkunci");

// Peserta pertama sudah menutup Listening DAN Reading, jadi giliran Writing
// tiba — dan di sanalah "kosong" (soalnya belum diisi) bisa terlihat, berbeda
// dari "terkunci" (gilirannya belum tiba).
const keadaan1 = Object.fromEntries(
  I.statusSemuaSubtes(p).map((s) => [s.kode, s.keadaan]),
);
periksa("Writing kosong saat gilirannya tiba", keadaan1.WRITING === "kosong");
periksa("Speaking tetap terkunci di belakangnya", keadaan1.SPEAKING === "terkunci");

console.log("\n8) Penilaian isian singkat");
const B = (kunci, jawaban) => I.jawabanBenar("IS", kunci, jawaban);
periksa("huruf besar-kecil diabaikan", B("nine thirty", "Nine Thirty"));
periksa("spasi berlebih diabaikan", B("nine thirty", "  nine   thirty "));
periksa("titik di akhir diabaikan", B("second", "second."));
periksa("kunci kedua sesudah | juga sah", B("nine thirty|9.30", "9.30"));
periksa("ejaan salah tetap salah", !B("second", "secund"));
periksa("kosong selalu salah", !B("second", "   "));
periksa("esai tidak pernah dinilai mesin", !I.jawabanBenar("ESAI", "apa pun", "jawaban panjang"));
periksa("TFNG cocok persis", I.jawabanBenar("TFNG", "NOT GIVEN", "not given"));

console.log("\n9) Tabel band Listening dan Reading berbeda");
periksa("Listening 30 benar = band 7", I.bandDariBenar("LISTENING", 30) === 7);
periksa("Reading 30 benar = band 7", I.bandDariBenar("READING", 30) === 7);
periksa("Listening 33 benar = band 7.5", I.bandDariBenar("LISTENING", 33) === 7.5);
periksa("Reading 32 benar masih band 7", I.bandDariBenar("READING", 32) === 7);
periksa("40 benar = band 9", I.bandDariBenar("LISTENING", 40) === 9);
periksa("3 benar = band 0", I.bandDariBenar("LISTENING", 3) === 0);

console.log("\n10) Hasil pengerjaan");
const hasil = I.hasilPengerjaan(p2);
const listening = hasil.find((h) => h.kode === "LISTENING");
const writing = hasil.find((h) => h.kode === "WRITING");
periksa("Listening menghitung 40 butir", listening.jumlahSoal === 40);
periksa("satu jawaban benar terhitung", listening.benar === 1);
periksa("sisanya terhitung kosong", listening.kosong === 39);
periksa("Writing menunggu guru (band null)", writing.band === null && writing.dinilaiGuru);

console.log("\n11) Jenis rekaman dikenali dari isi berkas");
const wav = new Uint8Array(64);
new TextEncoder().encodeInto("RIFF", wav);
new TextEncoder().encodeInto("WAVE", wav.subarray(8));
periksa("WAV dikenali", A.kenaliJenisAudio(wav)?.ext === "wav");

const mp3 = new Uint8Array(64);
new TextEncoder().encodeInto("ID3", mp3);
periksa("MP3 berlabel ID3 dikenali", A.kenaliJenisAudio(mp3)?.ext === "mp3");

const ogg = new Uint8Array(64);
new TextEncoder().encodeInto("OggS", ogg);
periksa("OGG dikenali", A.kenaliJenisAudio(ogg)?.ext === "ogg");

const palsu = new Uint8Array(64);
new TextEncoder().encodeInto("<html><body>bukan suara", palsu);
periksa("berkas lain ditolak walau namanya .mp3", A.kenaliJenisAudio(palsu) === null);


/* ---------------- Data uji tambahan ---------------- */

const KODE = I.KODE_SUBTES_IELTS;

run(
  "INSERT INTO users (nama, email, password_hash, role, nisn) VALUES ('Uji Tenggat','uji.tenggat@cek.local','x','siswa','9900000012')",
);
run(
  "INSERT INTO users (nama, email, password_hash, role, nisn) VALUES ('Uji Nilai','uji.nilai@cek.local','x','siswa','9900000003')",
);
run(
  "INSERT INTO users (nama, email, password_hash, role) VALUES ('Uji Guru','uji.guru@cek.local','x','admin')",
);

// Paket kedua, dipakai membuktikan waktu satu paket tidak menular ke paket lain.
const paketLain = I.buatPaket({ kode: "CEK-02", nama: "Paket Pembanding" });

console.log("\n12) Lama pengerjaan milik PAKET, bukan konstanta");
{
  const bawaan = I.menitBawaan();
  const menitAwal = I.menitPaket(paketId);
  periksa(
    "paket baru memakai waktu bawaan",
    KODE.every((k) => menitAwal[k] === bawaan[k]),
    JSON.stringify(menitAwal),
  );

  const preset = I.presetMenit("internasional");
  periksa("preset internasional 30/60/60/14",
    preset.menit.LISTENING === 30 &&
      preset.menit.READING === 60 &&
      preset.menit.WRITING === 60 &&
      preset.menit.SPEAKING === 14);

  I.setMenitPaket(paketId, preset.menit);
  const sesudah = I.menitPaket(paketId);
  periksa("waktu paket tersimpan", KODE.every((k) => sesudah[k] === preset.menit[k]));

  periksa(
    "paket LAIN tidak ikut berubah",
    I.menitPaket(paketLain).LISTENING === bawaan.LISTENING,
  );

  I.setMenitPaket(paketId, { LISTENING: 2, READING: 999, WRITING: 45, SPEAKING: 14 });
  const dijepit = I.menitPaket(paketId);
  periksa("angka di bawah batas dijepit ke minimum", dijepit.LISTENING === I.MENIT_MIN);
  periksa("angka di atas batas dijepit ke maksimum", dijepit.READING === I.MENIT_MAKS);
  periksa("angka wajar dibiarkan", dijepit.WRITING === 45);

  I.resetMenitPaket(paketId);
  periksa(
    "reset mengembalikan ke bawaan",
    KODE.every((k) => I.menitPaket(paketId)[k] === bawaan[k]),
  );

  for (let i = 0; i < 40; i++) {
    const acak = I.acakMenit();
    const dalamRentang = KODE.every((k) => {
      const [min, maks] = I.RENTANG_ACAK[k];
      return acak[k] >= min && acak[k] <= maks && acak[k] % 5 === 0;
    });
    if (!dalamRentang) {
      periksa("acak selalu di dalam rentang & kelipatan lima", false, JSON.stringify(acak));
      break;
    }
    if (i === 39) periksa("acak selalu di dalam rentang & kelipatan lima (40 undian)", true);
  }
}

console.log("\n13) Tenggat memakai menit paket dan tidak bergeser sesudahnya");
{
  const userTenggat = one("SELECT id FROM users WHERE nisn = '9900000012'").id;
  I.setMenitPaket(paketId, { LISTENING: 25, READING: 60, WRITING: 30, SPEAKING: 20 });

  const p = I.setujuiRules(userTenggat, paketId);
  I.bukaSubtes(I.pengerjaanById(p.id), "LISTENING");
  const sisa = I.sisaDetik(p.id, "LISTENING");
  periksa(
    "timer menyala 25 menit sesuai paket, bukan 60 menit bawaan",
    Math.abs(sisa - 25 * 60) <= 5,
    `sisa ${sisa} detik`,
  );

  // Pengelola mengubah waktu paket SESUDAH subtesnya berjalan.
  const tenggatLama = I.subtesBerjalan(p.id, "LISTENING").deadline_at;
  I.setMenitPaket(paketId, { LISTENING: 90, READING: 60, WRITING: 30, SPEAKING: 20 });
  periksa(
    "tenggat siswa yang sudah berjalan TIDAK ikut berubah",
    I.subtesBerjalan(p.id, "LISTENING").deadline_at === tenggatLama,
  );
  I.resetMenitPaket(paketId);
}

console.log("\n14) Nilai guru: kriteria, bobot Task, dan band keseluruhan");
{
  const userNilai = one("SELECT id FROM users WHERE nisn = '9900000003'").id;
  const p = I.setujuiRules(userNilai, paketId);
  const adminId = one("SELECT id FROM users WHERE role = 'admin'").id;

  periksa("Writing dinilai per Task 1 dan 2", JSON.stringify(I.bagianNilai("WRITING")) === "[1,2]");
  periksa("Speaking dinilai sekali untuk seluruh wawancara", JSON.stringify(I.bagianNilai("SPEAKING")) === "[0]");

  const salah = galat(() => I.simpanNilaiGuru(p.id, "LISTENING", 1, { TR: 7 }, null, adminId));
  periksa("Listening tidak bisa dinilai guru", salah !== null, salah ?? "tidak melempar");

  // Kriteria belum lengkap -> bagiannya belum punya band.
  I.simpanNilaiGuru(p.id, "WRITING", 1, { TR: 7, CC: 7 }, "separuh", adminId);
  periksa(
    "kriteria yang belum lengkap tidak menghasilkan band",
    I.nilaiGuruPengerjaan(p.id).find((n) => n.bagian === 1).band === null,
  );

  I.simpanNilaiGuru(p.id, "WRITING", 1, { TR: 6.5, CC: 7, LR: 6.5, GRA: 6 }, "task 1", adminId);
  const t1 = I.nilaiGuruPengerjaan(p.id).find((n) => n.subtes === "WRITING" && n.bagian === 1);
  periksa("band Task 1 = rata-rata empat kriteria (6.5)", t1.band === 6.5, `dapat ${t1.band}`);

  periksa(
    "satu task saja: band Writing mengikuti task itu",
    I.bandSubtesGuru("WRITING", I.nilaiGuruPengerjaan(p.id)) === 6.5,
  );

  I.simpanNilaiGuru(p.id, "WRITING", 2, { TR: 7, CC: 7, LR: 7, GRA: 6.5 }, "task 2", adminId);
  const nilai = I.nilaiGuruPengerjaan(p.id);
  const t2 = nilai.find((n) => n.subtes === "WRITING" && n.bagian === 2);
  periksa("band Task 2 = 7.0 (rata-rata 6.875 dibulatkan naik)", t2.band === 7, `dapat ${t2.band}`);
  periksa(
    "band Writing = (Task1 + 2 x Task2) / 3 = 7.0",
    I.bandSubtesGuru("WRITING", nilai) === 7,
    `dapat ${I.bandSubtesGuru("WRITING", nilai)}`,
  );

  I.simpanNilaiGuru(p.id, "SPEAKING", 0, { FC: 7, LR: 7, GRA: 6.5, PRO: 6.5 }, null, adminId);
  periksa(
    "band Speaking = 7.0",
    I.bandSubtesGuru("SPEAKING", I.nilaiGuruPengerjaan(p.id)) === 7,
  );

  // Nol adalah band yang SAH; kriteria yang dikosongkan bukan nol.
  I.simpanNilaiGuru(p.id, "SPEAKING", 0, { FC: 0, LR: 0, GRA: 0, PRO: 0 }, null, adminId);
  periksa(
    "band 0 diterima apa adanya (tidak dianggap kosong)",
    I.nilaiGuruPengerjaan(p.id).find((n) => n.subtes === "SPEAKING").band === 0,
  );
  I.simpanNilaiGuru(p.id, "SPEAKING", 0, { FC: 7, LR: 7, GRA: 6.5, PRO: 6.5 }, null, adminId);

  I.hapusNilaiGuru(p.id, "SPEAKING", 0);
  periksa(
    "penilaian bisa dihapus",
    I.bandSubtesGuru("SPEAKING", I.nilaiGuruPengerjaan(p.id)) === null,
  );
  I.simpanNilaiGuru(p.id, "SPEAKING", 0, { FC: 7, LR: 7, GRA: 6.5, PRO: 6.5 }, null, adminId);
}

console.log("\n15) Tabel konversi band dan pembulatan keseluruhan");
{
  // Angka-angka ini konversi resmi IELTS; kalau berubah, hasil siswa berubah.
  const L = [[40, 9], [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [3, 0]];
  const R = [[40, 9], [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [3, 0]];
  let lulusL = true;
  let lulusR = true;
  for (const [benar, band] of L) if (I.bandDariBenar("LISTENING", benar) !== band) lulusL = false;
  for (const [benar, band] of R) if (I.bandDariBenar("READING", benar) !== band) lulusR = false;
  periksa("tabel Listening cocok dengan konversi resmi", lulusL);
  periksa("tabel Academic Reading cocok dengan konversi resmi", lulusR);
  periksa(
    "Reading menuntut lebih banyak benar untuk band yang sama",
    I.bandDariBenar("READING", 33) === 7.5 && I.bandDariBenar("LISTENING", 33) === 7.5 &&
      I.bandDariBenar("READING", 32) === 7 && I.bandDariBenar("LISTENING", 32) === 7.5,
  );

  periksa("pembulatan: 6,25 naik ke 6,5", I.bulatkanBand(6.25) === 6.5);
  periksa("pembulatan: 6,75 naik ke 7,0", I.bulatkanBand(6.75) === 7);
  periksa("pembulatan: 6,1 turun ke 6,0", I.bulatkanBand(6.1) === 6);
  periksa("pembulatan: 6,4 naik ke 6,5", I.bulatkanBand(6.4) === 6.5);
  periksa("sebutan band 7 = Good user", I.sebutanBand(7) === "Good user");

  // `diujikan` menandai subtes yang MEMANG ada di paket ini. Sejak 10 September
  // 2026 ia yang menentukan band final atau bukan — bukan lagi "keempat subtes
  // harus punya band", yang membuat paket dua-subtes menggantung selamanya.
  const contoh = [
    { kode: "LISTENING", band: 7, dinilaiGuru: false, jumlahSoal: 40, diujikan: true, nama: "Listening" },
    { kode: "READING", band: 6.5, dinilaiGuru: false, jumlahSoal: 40, diujikan: true, nama: "Reading" },
    { kode: "WRITING", band: 7, dinilaiGuru: true, jumlahSoal: 2, diujikan: true, nama: "Writing" },
    { kode: "SPEAKING", band: 7, dinilaiGuru: true, jumlahSoal: 3, diujikan: true, nama: "Speaking" },
  ];
  periksa("overall 7/6,5/7/7 = 6,875 -> 7,0", I.bandKeseluruhan(contoh) === 7);
  periksa("overall dinyatakan lengkap", I.bandLengkap(contoh) === true);

  const belum = contoh.map((h) => (h.kode === "SPEAKING" ? { ...h, band: null } : h));
  periksa("subtes tanpa band TIDAK dihitung nol", I.bandKeseluruhan(belum) === 7);
  periksa("band tanpa Speaking ditandai belum lengkap", I.bandLengkap(belum) === false);
  periksa("subtes yang menunggu disebutkan namanya", I.subtesBelumBerband(belum).join() === "Speaking");

  /* ----------------------------------------------------------------
     PAKET YANG HANYA MENGUJIKAN SEBAGIAN SUBTES (10 September 2026).

     Paket TryOut 11 September 2026 hanya berisi Listening dan Reading.
     Writing dan Speaking di sana bukan "menunggu nilai guru" melainkan
     TIDAK DIUJIKAN — dan bedanya bukan tata bahasa: yang pertama akan
     datang beberapa hari lagi, yang kedua tidak akan pernah datang.
     Menyamakan keduanya membuat halaman hasil menempelkan label "band
     sementara" pada angka yang sebenarnya sudah final.
     ---------------------------------------------------------------- */
  const duaSubtes = [
    { kode: "LISTENING", band: 9, dinilaiGuru: false, jumlahSoal: 40, diujikan: true, nama: "Listening" },
    { kode: "READING", band: 7, dinilaiGuru: false, jumlahSoal: 40, diujikan: true, nama: "Reading" },
    { kode: "WRITING", band: null, dinilaiGuru: true, jumlahSoal: 0, diujikan: false, nama: "Writing" },
    { kode: "SPEAKING", band: null, dinilaiGuru: true, jumlahSoal: 0, diujikan: false, nama: "Speaking" },
  ];
  periksa("paket dua-subtes: overall = rata-rata yang diujikan saja", I.bandKeseluruhan(duaSubtes) === 8);
  periksa("paket dua-subtes: bandnya FINAL, bukan sementara", I.bandLengkap(duaSubtes) === true);
  periksa(
    "paket dua-subtes: tidak ada yang disebut 'menunggu'",
    I.subtesBelumBerband(duaSubtes).length === 0,
  );
  periksa(
    "paket dua-subtes: Writing & Speaking disebut tidak diujikan",
    I.subtesTidakDiujikan(duaSubtes).join() === "Writing,Speaking",
  );
  // Yang MENUNGGU guru tetap membuat band sementara, seperti sebelumnya.
  const menungguGuru = duaSubtes.map((h) =>
    h.kode === "WRITING" ? { ...h, jumlahSoal: 2, diujikan: true } : h,
  );
  periksa(
    "Writing yang diujikan tapi belum dinilai tetap menahan band",
    I.bandLengkap(menungguGuru) === false &&
      I.subtesBelumBerband(menungguGuru).join() === "Writing",
  );
}

console.log(gagal === 0 ? "\nSEMUA LULUS.\n" : `\n${gagal} PENGUJIAN GAGAL.\n`);
process.exit(gagal === 0 ? 0 : 1);
