/**
 * Pengujian cepat penilaian SKD Kedinasan (tanpa framework tes).
 *
 * Cara menjalankan (dari root proyek):
 *     npm run cek:skd
 *
 * Acuan angkanya: PermenPANRB No. 13/2026 jo. KepmenPANRB No. 406/2026 —
 * dokumen "Sistem Perhitungan Skor SKD Sekolah Kedinasan". Yang diperiksa:
 *
 *   1. Konstanta resmi: 110 soal, nilai maksimal 550, ambang 65 / 80 / 156.
 *   2. TWK & TIU dikotomi: benar 5 poin, salah = kosong = 0 (tanpa nilai minus).
 *   3. TKP politomi: bobot 1-5 per pilihan, dan HANYA soal kosong bernilai 0.
 *   4. Tiga simulasi peserta persis seperti tabel contoh di dokumen (A/B/C).
 *   5. Kelulusan kumulatif per subtes — total tinggi tidak menutupi satu subtes.
 *   6. Ambang jalur afirmasi (TIU 55 + nilai kumulatif 281).
 *   7. Pemeringkatan: nilai kumulatif, seri dipisah TKP -> TIU -> TWK.
 *   8. hitungHasilSkd idempoten dan sama dengan ambilHasilSkd.
 *
 * Berkas .ts asli dipakai apa adanya — hanya disalin ke folder sementara dengan
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
const TMP = path.join(AKAR, ".tmp", "cek", "skd");

// Dibersihkan di AWAL, bukan di akhir: Windows masih memegang berkas SQLite
// yang terbuka sehingga rmSync sesudah pengujian gagal dengan EPERM — sama
// seperti pemeriksa Warung Soal dan denyut.
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

process.env.ADZKIA_DB_PATH = path.join(TMP, "cek.db");

/* ---- salin modul yang diperlukan, rapikan impornya ---- */
for (const nama of ["db", "siklus", "skd", "nilai-skd"]) {
  const sumber = fs.readFileSync(cariDiLib(`${nama}.ts`), "utf8");
  const rapi = sumber
    // "server-only" hanya bermakna di dalam bundel Next; di Node polos dibuang.
    .replace(/^import "server-only";\n+/m, "")
    .replace(/from "@\/lib\/(?:[a-z0-9-]+\/)?([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"')
    .replace(/from "\.\/([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"');
  fs.writeFileSync(path.join(TMP, `${nama}.ts`), rapi);
}

const dbMod = await import(pathToFileURL(path.join(TMP, "db.ts")).href);
const skd = await import(pathToFileURL(path.join(TMP, "skd.ts")).href);
const nilai = await import(pathToFileURL(path.join(TMP, "nilai-skd.ts")).href);
const { all, run } = dbMod;

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

/* ------------------------------------------------------------------ */
/* 1. Konstanta resmi                                                  */
/* ------------------------------------------------------------------ */
judul("1) Konstanta resmi SKD");
const [twk, tiu, tkp] = skd.SUBTES_SKD;
cek(
  "Jumlah soal 30 / 35 / 45",
  twk.jumlahSoal === 30 && tiu.jumlahSoal === 35 && tkp.jumlahSoal === 45,
);
cek("Total 110 soal", skd.TOTAL_SOAL_SKD === 110);
cek("Durasi 100 menit", skd.TOTAL_MENIT_SKD === 100);
cek(
  "Nilai maksimal 150 / 175 / 225",
  twk.nilaiMaks === 150 && tiu.nilaiMaks === 175 && tkp.nilaiMaks === 225,
);
cek("Nilai maksimal kumulatif 550", skd.NILAI_MAKS_SKD === 550);
cek("Ambang 65 / 80 / 156", twk.ambang === 65 && tiu.ambang === 80 && tkp.ambang === 156);
cek("Jumlah ambang 301", skd.AMBANG_TOTAL_SKD === 301);
cek("Poin jawaban benar 5", skd.POIN_BENAR === 5);
cek("Rentang TKP 1-5", skd.TKP_MIN === 1 && skd.TKP_MAKS === 5);
cek("TWK butuh 13 benar", skd.soalBenarMinimal("TWK") === 13);
cek("TIU butuh 16 benar", skd.soalBenarMinimal("TIU") === 16);
cek("TKP tidak punya 'benar minimal'", skd.soalBenarMinimal("TKP") === null);
cek(
  "Rata-rata TKP untuk lolos +- 3,47",
  Math.abs(skd.rataAmbangPerSoal("TKP") - 156 / 45) < 1e-9,
  skd.rataAmbangPerSoal("TKP").toFixed(2),
);

/* ------------------------------------------------------------------ */
/* 2. nilaiTkp — hanya kosong yang bernilai 0                          */
/* ------------------------------------------------------------------ */
judul("2) Bobot TKP per pilihan");
const BOBOT = [5, 4, 3, 2, 1]; // A terbaik ... E terburuk
cek("Opsi terbaik 5 poin", skd.nilaiTkp(BOBOT, "A") === 5);
cek("Opsi terburuk tetap 1 poin", skd.nilaiTkp(BOBOT, "E") === 1);
cek("Huruf kecil tetap terbaca", skd.nilaiTkp(BOBOT, "c") === 3);
cek("Tidak dijawab 0 poin", skd.nilaiTkp(BOBOT, null) === 0);
cek("String kosong 0 poin", skd.nilaiTkp(BOBOT, "  ") === 0);
cek("Jawaban di luar A-E 0 poin", skd.nilaiTkp(BOBOT, "Z") === 0);
cek("Bobot butir belum terisi -> minimal 1, bukan 0", skd.nilaiTkp([], "B") === skd.TKP_MIN);
cek("Bobot 0 di data dirapatkan ke 1", skd.nilaiTkp(skd.parseBobot("[0,0,0,0,0]"), "A") === 1);
cek("Bobot di atas 5 dipotong ke 5", skd.nilaiTkp(skd.parseBobot("[9,1,1,1,1]"), "A") === 5);

/* ------------------------------------------------------------------ */
/* 3. Paket simulasi                                                   */
/* ------------------------------------------------------------------ */
judul("3) Menyiapkan paket SKD simulasi");
const pkg = run(
  `INSERT INTO packages (kode, nama, status, tampil_pembahasan) VALUES (?, ?, 'published', 1)`,
  "CEK-SKD-01",
  "Paket Uji SKD",
);
const packageId = Number(pkg.lastInsertRowid);

/** question_id per subtes, urut nomor. */
const soal = { TWK: [], TIU: [], TKP: [] };

for (const s of skd.SUBTES_SKD) {
  for (let n = 1; n <= s.jumlahSoal; n++) {
    const politomi = s.penilaian === "politomi";
    const res = run(
      `INSERT INTO questions (package_id, subtes, nomor, tipe, level, pertanyaan, opsi, bobot_opsi, kunci, pembahasan)
       VALUES (?, ?, ?, 'PG', 'C3', ?, ?, ?, ?, ?)`,
      packageId,
      s.kode,
      n,
      `Soal ${s.kode} nomor ${n}`,
      JSON.stringify(["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D", "Pilihan E"]),
      politomi ? JSON.stringify(BOBOT) : null,
      "A",
      `Pembahasan ${s.kode} nomor ${n}.`,
    );
    soal[s.kode].push(Number(res.lastInsertRowid));
  }
}
cek(
  "110 butir tersimpan",
  all(`SELECT id FROM questions WHERE package_id = ?`, packageId).length === 110,
);

let nomorPeserta = 0;
/**
 * Buat satu peserta lengkap dengan jawabannya.
 *   benarTwk / benarTiu : berapa butir dijawab benar ("A"); sisanya diisi sesuai
 *                         `sisa` — "salah" atau "kosong" (keduanya harus 0 poin).
 *   pola                : daftar huruf jawaban TKP, boleh lebih pendek dari 45
 *                         (sisanya dibiarkan tidak dijawab).
 */
function buatPeserta(nama, { benarTwk, benarTiu, pola, sisa = "salah", lahir = null }) {
  nomorPeserta++;
  const u = run(
    `INSERT INTO users (nama, email, password_hash, role, kelas, tanggal_lahir)
     VALUES (?, ?, 'x', 'siswa', 'XII IPA 1', ?)`,
    nama,
    `peserta${nomorPeserta}@uji.adzkia`,
    lahir,
  );
  const a = run(
    `INSERT INTO attempts (user_id, package_id, status, finished_at)
     VALUES (?, ?, 'finished', datetime('now'))`,
    Number(u.lastInsertRowid),
    packageId,
  );
  const attemptId = Number(a.lastInsertRowid);

  const jawab = (qid, isi) => {
    if (isi == null) return; // benar-benar tidak menjawab: tanpa baris answers
    run(
      `INSERT INTO answers (attempt_id, question_id, jawaban) VALUES (?, ?, ?)`,
      attemptId,
      qid,
      isi,
    );
  };

  for (const [kode, benar] of [
    ["TWK", benarTwk],
    ["TIU", benarTiu],
  ]) {
    soal[kode].forEach((qid, i) => {
      if (i < benar) jawab(qid, "A");
      else jawab(qid, sisa === "kosong" ? null : "B");
    });
  }
  soal.TKP.forEach((qid, i) => jawab(qid, pola[i] ?? null));

  return { attemptId, nama };
}

/** Susun jawaban TKP dari resep {huruf: banyaknya}. */
function polaTkp(resep) {
  const out = [];
  for (const [huruf, banyak] of Object.entries(resep)) {
    for (let i = 0; i < banyak; i++) out.push(huruf);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 4. Tiga simulasi dari dokumen resmi                                 */
/* ------------------------------------------------------------------ */
judul("4) Simulasi peserta A, B, dan C dari dokumen");

// A: 15 benar TWK, 20 benar TIU, TKP rata-rata 3,8 (36 x 4 + 9 x 3 = 171).
const A = buatPeserta("Peserta A", {
  benarTwk: 15,
  benarTiu: 20,
  pola: polaTkp({ B: 36, C: 9 }),
});
// B: 12 benar TWK, 25 benar TIU, TKP rata-rata 4,2 (9 x 5 + 36 x 4 = 189).
const B = buatPeserta("Peserta B", {
  benarTwk: 12,
  benarTiu: 25,
  pola: polaTkp({ A: 9, B: 36 }),
});
// C: 20 benar TWK, 14 benar TIU, TKP rata-rata 4,0 (45 x 4 = 180).
const C = buatPeserta("Peserta C", {
  benarTwk: 20,
  benarTiu: 14,
  pola: polaTkp({ B: 45 }),
});

const hA = nilai.hitungHasilSkd(A.attemptId);
const hB = nilai.hitungHasilSkd(B.attemptId);
const hC = nilai.hitungHasilSkd(C.attemptId);

const per = (h, kode) => h.perSubtes.find((s) => s.subtes === kode).nilai;

cek(
  "A: TWK 75 · TIU 100 · TKP 171",
  per(hA, "TWK") === 75 && per(hA, "TIU") === 100 && per(hA, "TKP") === 171,
);
cek("A: total 346", hA.total === 346);
cek("A: LULUS (ketiga subtes lewat ambang)", hA.lulus === true);
cek(
  "B: TWK 60 · TIU 125 · TKP 189",
  per(hB, "TWK") === 60 && per(hB, "TIU") === 125 && per(hB, "TKP") === 189,
);
cek("B: total 374", hB.total === 374);
cek("B: TIDAK LULUS meski total lebih tinggi dari A", hB.lulus === false, "TWK 60 < 65");
cek(
  "C: TWK 100 · TIU 70 · TKP 180",
  per(hC, "TWK") === 100 && per(hC, "TIU") === 70 && per(hC, "TKP") === 180,
);
cek("C: total 350", hC.total === 350);
cek("C: TIDAK LULUS", hC.lulus === false, "TIU 70 < 80");

const tkpA = hA.perSubtes.find((s) => s.subtes === "TKP");
cek("Rata-rata TKP peserta A 3,8", Math.abs(tkpA.rataPerSoal - 3.8) < 1e-9, tkpA.rataPerSoal.toFixed(2));
cek("TKP peserta A tidak menyisakan soal kosong", tkpA.kosong === 0);

/* ------------------------------------------------------------------ */
/* 5. Tanpa nilai minus & TKP kosong merugikan                         */
/* ------------------------------------------------------------------ */
judul("5) Salah = kosong pada TWK/TIU; kosong merugikan di TKP");

const salahSemua = buatPeserta("Penjawab Salah", {
  benarTwk: 15,
  benarTiu: 20,
  pola: polaTkp({ B: 45 }),
  sisa: "salah",
});
const kosongSemua = buatPeserta("Pengosong Soal", {
  benarTwk: 15,
  benarTiu: 20,
  pola: polaTkp({ B: 45 }),
  sisa: "kosong",
});
const hSalah = nilai.hitungHasilSkd(salahSemua.attemptId);
const hKosong = nilai.hitungHasilSkd(kosongSemua.attemptId);
cek(
  "Jawaban salah dan soal kosong sama-sama 0 poin",
  hSalah.total === hKosong.total,
  `${hSalah.total} = ${hKosong.total}`,
);
cek(
  "Rekap tetap membedakan salah dan kosong",
  hSalah.perSubtes[0].salah === 15 && hKosong.perSubtes[0].kosong === 15,
);

// 40 butir TKP diisi opsi TERBURUK, 5 sisanya dikosongkan.
const tkpBolong = buatPeserta("TKP Bolong", {
  benarTwk: 15,
  benarTiu: 20,
  pola: polaTkp({ E: 40 }),
});
const hBolong = nilai.hitungHasilSkd(tkpBolong.attemptId);
cek(
  "40 opsi terburuk tetap menghasilkan 40 poin",
  per(hBolong, "TKP") === 40,
  `TKP ${per(hBolong, "TKP")}`,
);
cek("5 butir TKP tercatat kosong", hBolong.perSubtes[2].kosong === 5);

/* ------------------------------------------------------------------ */
/* 6. Ambang jalur afirmasi                                            */
/* ------------------------------------------------------------------ */
judul("6) Ambang jalur afirmasi (TIU 55, kumulatif 281)");
cek("Ambang afirmasi terbaca", skd.AMBANG_AFIRMASI_TIU === 55 && skd.AMBANG_AFIRMASI_TOTAL === 281);
cek(
  "Peserta C: gagal formasi umum, memenuhi afirmasi",
  hC.lulus === false && hC.lulusAfirmasi === true,
  `TIU ${per(hC, "TIU")} · total ${hC.total}`,
);
cek(
  "TIU 50 dengan total besar tetap gagal afirmasi",
  skd.lulusSkd({ TWK: 150, TIU: 50, TKP: 225 }, "afirmasi") === false,
);
cek(
  "Total 280 tetap gagal afirmasi",
  skd.lulusSkd({ TWK: 60, TIU: 55, TKP: 165 }, "afirmasi") === false,
  "280 < 281",
);

/* ------------------------------------------------------------------ */
/* 7. Idempoten & baca ulang                                           */
/* ------------------------------------------------------------------ */
judul("7) Hitung ulang dan baca hasil tersimpan");
const ulang = nilai.hitungHasilSkd(A.attemptId);
cek("hitungHasilSkd idempoten", JSON.stringify(ulang) === JSON.stringify(hA));
const dibaca = nilai.ambilHasilSkd(A.attemptId);
cek("ambilHasilSkd sama dengan hasil hitung", JSON.stringify(dibaca) === JSON.stringify(hA));
cek(
  "total_skor tersimpan di attempts",
  all(`SELECT total_skor FROM attempts WHERE id = ?`, A.attemptId)[0].total_skor === 346,
);

/* ------------------------------------------------------------------ */
/* 8. Pemeringkatan                                                    */
/* ------------------------------------------------------------------ */
judul("8) Pemeringkatan SKD");

// Dua peserta bertotal sama (373): pemisahnya nilai TKP.
const seriTkpTinggi = buatPeserta("Seri TKP Tinggi", {
  benarTwk: 12,
  benarTiu: 20,
  pola: polaTkp({ A: 41, D: 4 }), // 205 + 8 = 213 -> 60 + 100 + 213 = 373
});
const seriTkpRendah = buatPeserta("Seri TKP Rendah", {
  benarTwk: 15,
  benarTiu: 23,
  pola: polaTkp({ A: 3, B: 42 }), // 15 + 168 = 183 -> 75 + 115 + 183 = 373
});
nilai.hitungHasilSkd(seriTkpTinggi.attemptId);
nilai.hitungHasilSkd(seriTkpRendah.attemptId);

const papan = nilai.peringkatSkd(packageId);
cek("Semua peserta masuk papan", papan.length === nomorPeserta, `${papan.length} baris`);
cek("Urut menurun menurut total", papan.every((r, i) => i === 0 || papan[i - 1].total >= r.total));
cek("Peringkat 1 adalah total tertinggi", papan[0].total === Math.max(...papan.map((r) => r.total)));

const seri = papan.filter((r) => r.total === 373);
cek(
  "Ada dua peserta bertotal 373 untuk diuji",
  seri.length === 2,
  seri.map((r) => `${r.nama} TKP ${r.nilai.TKP}`).join(" · "),
);
cek(
  "Total sama dipisah oleh TKP lebih tinggi",
  seri.length === 2 && seri[0].nilai.TKP > seri[1].nilai.TKP,
);
cek("Peserta seri tidak berbagi peringkat", seri.length === 2 && seri[0].peringkat !== seri[1].peringkat);

const barisA = papan.find((r) => r.nama === "Peserta A");
const barisB = papan.find((r) => r.nama === "Peserta B");
cek(
  "Peserta B berperingkat di atas A meski tidak lulus",
  barisB.peringkat < barisA.peringkat,
  "peringkat memakai nilai kumulatif; kelulusan dinilai terpisah",
);
cek("Status lulus ikut terbawa ke papan", barisA.lulus === true && barisB.lulus === false);

/* ------------------------------------------------------------------ */
/* Ringkasan                                                           */
/* ------------------------------------------------------------------ */
console.log("\n" + "=".repeat(64));
console.log(`RINGKASAN: ${lulus} lulus, ${gagal} gagal.`);
console.log("Simulasi dokumen resmi:");
for (const [nama, h] of [
  ["A", hA],
  ["B", hB],
  ["C", hC],
]) {
  console.log(
    `  Peserta ${nama}: TWK ${per(h, "TWK")} · TIU ${per(h, "TIU")} · TKP ${per(h, "TKP")}` +
      ` · total ${h.total} -> ${h.lulus ? "LULUS" : "TIDAK LULUS"}`,
  );
}
console.log("=".repeat(64));

try {
  dbMod.db.close();
} catch {
  /* abaikan */
}

process.exit(gagal === 0 ? 0 : 1);
