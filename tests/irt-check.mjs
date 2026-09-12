/**
 * Pengujian cepat mesin IRT ADZKIA SMART (tanpa framework tes).
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/irt-check.mjs
 *
 * Skrip ini membuat basis data SQLite sementara lewat ADZKIA_DB_PATH,
 * mengisinya dengan peserta simulasi (respons dibangkitkan dari model Rasch
 * dengan tingkat kesulitan yang sudah diketahui), lalu memeriksa bahwa:
 *
 *   1. cekJawaban benar untuk tipe PG / PGK / IS.
 *   2. Kalibrasi b berkorelasi dengan tingkat kesulitan sebenarnya.
 *   3. Shrinkage bekerja saat peserta masih sedikit (b mendekati 0).
 *   4. Newton-Raphson menghasilkan theta berhingga, termasuk skor 0 & sempurna.
 *   5. INTI IRT: dengan jumlah benar yang SAMA, peserta yang menaklukkan butir
 *      sulit mendapat skor lebih tinggi daripada yang hanya benar di butir mudah.
 *   6. hitungHasil idempoten (dipanggil dua kali -> hasil sama persis).
 *   7. peringkatPeserta & statistikPaket konsisten dengan isi tabel.
 *
 * Berkas .ts asli dipakai apa adanya — hanya disalin ke folder sementara dengan
 * penambahan ekstensi pada impor relatif supaya bisa dimuat langsung oleh Node
 * (Node 24 sudah bisa menjalankan TypeScript dengan pelucutan tipe bawaan).
 */
import fs from "node:fs";
import os from "node:os";
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
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "adzkia-irt-"));

process.env.ADZKIA_DB_PATH = path.join(TMP, "cek.db");

/* ---- salin modul yang diperlukan, rapikan impor relatifnya ---- */
for (const nama of ["db", "snbt", "irt"]) {
  const sumber = fs.readFileSync(cariDiLib(`${nama}.ts`), "utf8");
  const rapi = sumber.replace(/from "\.\/([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"');
  fs.writeFileSync(path.join(TMP, `${nama}.ts`), rapi);
}

const dbMod = await import(pathToFileURL(path.join(TMP, "db.ts")).href);
const irt = await import(pathToFileURL(path.join(TMP, "irt.ts")).href);
const { all, one, run } = dbMod;

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

/** PRNG deterministik (mulberry32) supaya hasil uji selalu sama. */
function acak(benih) {
  let a = benih >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const P = (theta, b) => 1 / (1 + Math.exp(-(theta - b)));

/* ------------------------------------------------------------------ */
/* 1. cekJawaban                                                       */
/* ------------------------------------------------------------------ */
judul("1) cekJawaban — PG / PGK / IS");
cek("PG benar", irt.cekJawaban("PG", "C", "c") === true);
cek("PG salah", irt.cekJawaban("PG", "C", "D") === false);
cek("PG kosong", irt.cekJawaban("PG", "C", null) === false);
cek("PGK urutan bebas", irt.cekJawaban("PGK", '["A","C"]', '["C","A"]') === true);
cek("PGK kurang satu", irt.cekJawaban("PGK", '["A","C"]', '["A"]') === false);
cek("IS abaikan spasi & koma desimal", irt.cekJawaban("IS", "12,5", " 12.5 ") === true);
cek("IS beda nilai", irt.cekJawaban("IS", "12,5", "13") === false);

/* ------------------------------------------------------------------ */
/* 2. Siapkan paket & peserta simulasi                                 */
/* ------------------------------------------------------------------ */
judul("2) Menyiapkan paket simulasi");

const SUBTES_UJI = [
  { kode: "PU", jumlah: 30 },
  { kode: "PM", jumlah: 20 },
];

const pkg = run(
  `INSERT INTO packages (kode, nama, status, tampil_pembahasan) VALUES (?, ?, 'published', 1)`,
  "CEK-IRT-01",
  "Paket Uji IRT",
);
const packageId = Number(pkg.lastInsertRowid);

/** b sebenarnya per butir: menyebar merata dari -2 (mudah) ke +2 (sulit). */
const bAsli = new Map();     // question_id -> b sebenarnya
const soalPerSubtes = new Map();

for (const s of SUBTES_UJI) {
  const daftar = [];
  for (let n = 1; n <= s.jumlah; n++) {
    const b = -2 + (4 * (n - 1)) / (s.jumlah - 1);
    const res = run(
      `INSERT INTO questions (package_id, subtes, nomor, tipe, level, pertanyaan, opsi, kunci, pembahasan)
       VALUES (?, ?, ?, 'PG', 'C3', ?, ?, 'A', ?)`,
      packageId,
      s.kode,
      n,
      `Soal ${s.kode} nomor ${n}`,
      JSON.stringify(["Jawaban benar", "Pengecoh 1", "Pengecoh 2", "Pengecoh 3", "Pengecoh 4"]),
      `Pembahasan soal ${s.kode} nomor ${n}.`,
    );
    const id = Number(res.lastInsertRowid);
    bAsli.set(id, b);
    daftar.push({ id, b, nomor: n });
  }
  soalPerSubtes.set(s.kode, daftar);
}
cek("Soal tersimpan", all(`SELECT id FROM questions WHERE package_id = ?`, packageId).length === 50, "50 butir");

/** Buat satu peserta + attempt selesai, dengan peta jawaban benar/salah. */
function buatPeserta(nama, benarUntuk) {
  const u = run(
    `INSERT INTO users (nama, email, password_hash, role, asal_sekolah) VALUES (?, ?, 'x', 'siswa', ?)`,
    nama,
    `${nama.toLowerCase().replace(/[^a-z0-9]/g, "")}@uji.adzkia`,
    "SMA Islam Plus Adzkia",
  );
  const userId = Number(u.lastInsertRowid);
  const a = run(
    `INSERT INTO attempts (user_id, package_id, status, finished_at)
     VALUES (?, ?, 'finished', datetime('now'))`,
    userId,
    packageId,
  );
  const attemptId = Number(a.lastInsertRowid);

  for (const [, daftar] of soalPerSubtes) {
    for (const q of daftar) {
      run(
        `INSERT INTO answers (attempt_id, question_id, jawaban) VALUES (?, ?, ?)`,
        attemptId,
        q.id,
        benarUntuk(q) ? "A" : "B",
      );
    }
  }
  return { userId, attemptId, nama };
}

const rnd = acak(20260826);
const peserta = [];
const JUMLAH_PESERTA = 40;
for (let i = 0; i < JUMLAH_PESERTA; i++) {
  const theta = -1.8 + (3.6 * i) / (JUMLAH_PESERTA - 1);   // kemampuan menyebar
  peserta.push(buatPeserta(`Siswa ${String(i + 1).padStart(2, "0")}`, (q) => rnd() < P(theta, q.b)));
}

// Dua peserta ekstrem untuk menguji koreksi bertepi.
const semuaBenar = buatPeserta("Peserta Sempurna", () => true);
const semuaSalah = buatPeserta("Peserta Nol", () => false);

// Dua peserta dengan JUMLAH BENAR SAMA di PU (15 dari 30), pola berbeda.
const puUrutSulit = soalPerSubtes.get("PU").slice().sort((x, y) => y.b - x.b);
const idSulit = new Set(puUrutSulit.slice(0, 15).map((q) => q.id));   // 15 butir tersulit
const idMudah = new Set(puUrutSulit.slice(-15).map((q) => q.id));     // 15 butir termudah
const pmUrut = soalPerSubtes.get("PM").slice().sort((x, y) => x.b - y.b);
const idPmSama = new Set(pmUrut.slice(0, 10).map((q) => q.id));       // agar PM keduanya identik

const pesertaSulit = buatPeserta("Penakluk Soal Sulit", (q) => idSulit.has(q.id) || idPmSama.has(q.id));
const pesertaMudah = buatPeserta("Pengumpul Soal Mudah", (q) => idMudah.has(q.id) || idPmSama.has(q.id));

/* ------------------------------------------------------------------ */
/* 3. Skoring                                                          */
/* ------------------------------------------------------------------ */
judul("3) Menjalankan hitungHasil untuk seluruh peserta");
const semuaAttempt = [...peserta, semuaBenar, semuaSalah, pesertaSulit, pesertaMudah];
for (const p of semuaAttempt) irt.hitungHasil(p.attemptId);
// Nilai ulang sekali lagi supaya semua peserta memakai kalibrasi final yang sama.
irt.hitungUlangPaket(packageId);
cek(
  "Semua attempt punya baris results",
  all(`SELECT attempt_id FROM results WHERE attempt_id IN (SELECT id FROM attempts WHERE package_id = ?)`, packageId)
    .length === semuaAttempt.length * 2,
  `${semuaAttempt.length} peserta x 2 subtes`,
);

/* ------------------------------------------------------------------ */
/* 4. Kalibrasi butir                                                  */
/* ------------------------------------------------------------------ */
judul("4) Kalibrasi tingkat kesulitan (item_params)");
const param = all(
  `SELECT ip.question_id, ip.b, ip.p_benar, ip.n_peserta
     FROM item_params ip JOIN questions q ON q.id = ip.question_id
    WHERE q.package_id = ?`,
  packageId,
);
cek("Seluruh butir terkalibrasi", param.length === 50);
cek(
  "n_peserta terisi",
  param.every((p) => p.n_peserta === semuaAttempt.length),
  `n = ${param[0]?.n_peserta}`,
);
cek("b berhingga", param.every((p) => Number.isFinite(p.b)));

// Korelasi Pearson antara b hasil kalibrasi dan b sebenarnya.
const xs = param.map((p) => bAsli.get(p.question_id));
const ys = param.map((p) => p.b);
const rerata = (v) => v.reduce((a, c) => a + c, 0) / v.length;
const mx = rerata(xs);
const my = rerata(ys);
let sxy = 0, sxx = 0, syy = 0;
for (let i = 0; i < xs.length; i++) {
  sxy += (xs[i] - mx) * (ys[i] - my);
  sxx += (xs[i] - mx) ** 2;
  syy += (ys[i] - my) ** 2;
}
const korelasi = sxy / Math.sqrt(sxx * syy);
cek("Korelasi b kalibrasi vs b sebenarnya > 0,90", korelasi > 0.9, `r = ${korelasi.toFixed(4)}`);

const butirTersulit = param.slice().sort((a, b) => b.b - a.b)[0];
const butirTermudah = param.slice().sort((a, b) => a.b - b.b)[0];
cek(
  "Butir dengan p_benar terkecil punya b terbesar",
  butirTersulit.p_benar < butirTermudah.p_benar,
  `p sulit ${butirTersulit.p_benar.toFixed(2)} (b ${butirTersulit.b.toFixed(2)}) vs p mudah ${butirTermudah.p_benar.toFixed(2)} (b ${butirTermudah.b.toFixed(2)})`,
);

/* ---- Shrinkage saat peserta sedikit ---- */
const pkg2 = run(
  `INSERT INTO packages (kode, nama, status) VALUES ('CEK-IRT-02', 'Paket Sepi', 'published')`,
);
const packageId2 = Number(pkg2.lastInsertRowid);
for (let n = 1; n <= 5; n++) {
  run(
    `INSERT INTO questions (package_id, subtes, nomor, tipe, level, pertanyaan, opsi, kunci)
     VALUES (?, 'PU', ?, 'PG', 'C3', ?, '[]', 'A')`,
    packageId2,
    n,
    `Soal sepi ${n}`,
  );
}
const soal2 = all(`SELECT id FROM questions WHERE package_id = ? ORDER BY nomor`, packageId2);
const u2 = run(
  `INSERT INTO users (nama, email, password_hash) VALUES ('Peserta Tunggal', 'tunggal@uji.adzkia', 'x')`,
);
const a2 = run(
  `INSERT INTO attempts (user_id, package_id, status, finished_at) VALUES (?, ?, 'finished', datetime('now'))`,
  Number(u2.lastInsertRowid),
  packageId2,
);
const attempt2 = Number(a2.lastInsertRowid);
soal2.forEach((q, i) => {
  run(`INSERT INTO answers (attempt_id, question_id, jawaban) VALUES (?, ?, ?)`, attempt2, q.id, i < 2 ? "A" : "B");
});
irt.hitungHasil(attempt2);
const param2 = all(
  `SELECT ip.b FROM item_params ip JOIN questions q ON q.id = ip.question_id WHERE q.package_id = ?`,
  packageId2,
);
cek(
  "Shrinkage: 1 peserta -> |b| kecil (mendekati prior 0)",
  param2.every((p) => Math.abs(p.b) < 0.35),
  `|b| maks = ${Math.max(...param2.map((p) => Math.abs(p.b))).toFixed(3)}`,
);

/* ------------------------------------------------------------------ */
/* 5. Theta & penskalaan                                               */
/* ------------------------------------------------------------------ */
judul("5) Estimasi theta & skala 0-1000");
const semuaResults = all(
  `SELECT r.* FROM results r JOIN attempts a ON a.id = r.attempt_id WHERE a.package_id = ?`,
  packageId,
);
cek("Semua theta berhingga", semuaResults.every((r) => Number.isFinite(r.theta)));
cek("Theta di dalam [-4, 4]", semuaResults.every((r) => r.theta >= -4 && r.theta <= 4));
cek("Skor di dalam [0, 1000]", semuaResults.every((r) => r.skor >= 0 && r.skor <= 1000));
cek("Skor bilangan bulat", semuaResults.every((r) => Number.isInteger(r.skor)));

const hasilSempurna = irt.ambilHasil(semuaBenar.attemptId);
const hasilNol = irt.ambilHasil(semuaSalah.attemptId);
cek(
  "Skor sempurna berhingga & tertinggi",
  Number.isFinite(hasilSempurna.totalSkor) && hasilSempurna.totalSkor > 900,
  `total = ${hasilSempurna.totalSkor}`,
);
cek(
  "Skor nol berhingga & terendah",
  Number.isFinite(hasilNol.totalSkor) && hasilNol.totalSkor < 200,
  `total = ${hasilNol.totalSkor}`,
);
cek(
  "Monoton: skor sempurna > skor nol",
  hasilSempurna.totalSkor > hasilNol.totalSkor,
);

// Monotonisitas umum: jumlah benar naik -> skor cenderung naik.
const puResults = semuaResults
  .filter((r) => r.subtes === "PU")
  .sort((a, b) => a.benar - b.benar);
let pelanggaran = 0;
for (let i = 1; i < puResults.length; i++) {
  if (puResults[i].benar > puResults[i - 1].benar && puResults[i].skor < puResults[i - 1].skor - 60) {
    pelanggaran++;
  }
}
cek("Skor PU naik seiring jumlah benar", pelanggaran === 0, `${pelanggaran} pelanggaran besar`);

/* ------------------------------------------------------------------ */
/* 6. INTI IRT — butir sulit lebih bernilai                            */
/* ------------------------------------------------------------------ */
judul("6) INTI IRT — benar di butir sulit bernilai lebih tinggi");
const hSulit = irt.ambilHasil(pesertaSulit.attemptId);
const hMudah = irt.ambilHasil(pesertaMudah.attemptId);
const puSulit = hSulit.perSubtes.find((s) => s.subtes === "PU");
const puMudah = hMudah.perSubtes.find((s) => s.subtes === "PU");

cek(
  "Jumlah benar PU kedua peserta identik",
  puSulit.benar === puMudah.benar,
  `${puSulit.benar} vs ${puMudah.benar} dari 30`,
);
cek(
  "Skor PU penakluk butir sulit LEBIH TINGGI",
  puSulit.skor > puMudah.skor,
  `${puSulit.skor} vs ${puMudah.skor} (selisih ${puSulit.skor - puMudah.skor} poin, theta ${puSulit.theta.toFixed(3)} vs ${puMudah.theta.toFixed(3)})`,
);
cek(
  "Skor total penakluk butir sulit lebih tinggi",
  hSulit.totalSkor > hMudah.totalSkor,
  `${hSulit.totalSkor} vs ${hMudah.totalSkor}`,
);

/* ------------------------------------------------------------------ */
/* 7. Idempotensi                                                      */
/* ------------------------------------------------------------------ */
judul("7) Idempotensi hitungHasil");
const sebelum = JSON.stringify(irt.ambilHasil(peserta[7].attemptId));
irt.hitungHasil(peserta[7].attemptId);
irt.hitungHasil(peserta[7].attemptId);
const sesudah = JSON.stringify(irt.ambilHasil(peserta[7].attemptId));
cek("Dipanggil ulang -> hasil identik", sebelum === sesudah);
cek(
  "Tidak ada baris results ganda",
  all(`SELECT attempt_id, subtes, COUNT(*) AS n FROM results GROUP BY attempt_id, subtes HAVING n > 1`).length === 0,
);
const skorTersimpan = one(`SELECT total_skor FROM attempts WHERE id = ?`, peserta[7].attemptId);
cek(
  "attempts.total_skor sinkron dengan results",
  Math.round(skorTersimpan.total_skor) === irt.ambilHasil(peserta[7].attemptId).totalSkor,
);

/* ------------------------------------------------------------------ */
/* 8. Peringkat & statistik                                            */
/* ------------------------------------------------------------------ */
judul("8) peringkatPeserta & statistikPaket");
const papan = irt.peringkatPeserta(packageId);
cek("Jumlah baris papan = jumlah peserta selesai", papan.length === semuaAttempt.length);
cek(
  "Papan terurut menurun",
  papan.every((r, i) => i === 0 || papan[i - 1].totalSkor >= r.totalSkor),
);
cek("Peringkat 1 adalah peserta sempurna", papan[0].attemptId === semuaBenar.attemptId, papan[0].nama);
cek(
  "Skor subtes ikut terbawa",
  papan.every((r) => Object.keys(r.skorSubtes).length === 2),
);

const stat = irt.statistikPaket(packageId);
cek("Jumlah peserta cocok", stat.jumlahPeserta === semuaAttempt.length);
cek("Ada 2 subtes pada statistik", stat.perSubtes.length === 2);
cek(
  "Rata-rata total berada di antara terendah & tertinggi",
  stat.rataTotal >= stat.terendahTotal && stat.rataTotal <= stat.tertinggiTotal,
  `${stat.terendahTotal} <= ${stat.rataTotal} <= ${stat.tertinggiTotal}`,
);
const rataHitung = Math.round(
  papan.reduce((a, r) => a + r.totalSkor, 0) / papan.length,
);
cek("Rata-rata sesuai perhitungan manual", Math.abs(stat.rataTotal - rataHitung) <= 1, `${stat.rataTotal} vs ${rataHitung}`);

const posisi = irt.posisiPeserta(packageId, papan[0].attemptId);
cek("Peringkat teratas -> persentil tinggi", posisi.peringkat === 1 && posisi.persentil >= 95, `persentil ${posisi.persentil}%`);
const posisiTerbawah = irt.posisiPeserta(packageId, papan[papan.length - 1].attemptId);
cek("Peringkat terbawah -> persentil rendah", posisiTerbawah.persentil <= 5, `persentil ${posisiTerbawah.persentil}%`);

/* ------------------------------------------------------------------ */
/* 9. detailJawaban                                                    */
/* ------------------------------------------------------------------ */
judul("9) detailJawaban (bahan halaman pembahasan)");
const detail = irt.detailJawaban(pesertaSulit.attemptId);
cek("Mengembalikan seluruh butir", detail.length === 50);
cek(
  "Status benar/salah cocok dengan skoring",
  detail.filter((d) => d.subtes === "PU" && d.benar).length === puSulit.benar,
);
cek("Opsi ter-parse jadi array", Array.isArray(detail[0].opsi) && detail[0].opsi.length === 5);
cek("Parameter b ikut terbawa", detail.every((d) => Number.isFinite(d.b)));

/* ------------------------------------------------------------------ */
/* Ringkasan                                                           */
/* ------------------------------------------------------------------ */
console.log("\n" + "=".repeat(64));
console.log(`RINGKASAN: ${lulus} lulus, ${gagal} gagal.`);
console.log("Contoh skor akhir (skala UTBK 0-1000):");
for (const r of papan.slice(0, 3)) {
  console.log(`  #${r.peringkat} ${r.nama.padEnd(24)} total ${r.totalSkor}  ${JSON.stringify(r.skorSubtes)}`);
}
console.log(
  `  Penakluk butir sulit  : PU ${puSulit.skor} (benar ${puSulit.benar}/30)\n` +
    `  Pengumpul butir mudah : PU ${puMudah.skor} (benar ${puMudah.benar}/30)`,
);
console.log("=".repeat(64));

try {
  dbMod.db.close();
} catch {
  /* abaikan */
}
fs.rmSync(TMP, { recursive: true, force: true });

process.exit(gagal === 0 ? 0 : 1);
