/**
 * Membuat pengerjaan tryout contoh untuk 8 siswa demo.
 *
 * Tujuannya agar papan peringkat, rata-rata subtes, dan kalibrasi kesulitan
 * butir (IRT) punya data yang hidup saat aplikasi dicoba. Skrip ini SENGAJA
 * tidak menghitung skor: nilai diisi dari aplikasi lewat tombol
 * "Hitung ulang nilai" di /admin/paket, atau otomatis saat halaman hasil dibuka.
 *
 * Jalankan: node scripts/seed-hasil.mjs [--reset]
 */
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = process.env.ADZKIA_DB_PATH ?? path.join(ROOT, "data", "adzkia.db");
const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON");

const KODE_PAKET = "TO-DEMO-1";
const paket = db.prepare("SELECT id FROM packages WHERE kode = ?").get(KODE_PAKET);
if (!paket) {
  console.error(`Paket ${KODE_PAKET} belum ada. Jalankan "npm run seed" lebih dulu.`);
  process.exit(1);
}

// Kemampuan tiap siswa: peluang menjawab benar (0-1) dan peluang mengosongkan.
const PROFIL = [
  { email: "aisyah.nur@pintarbersamaadzkia.com", benar: 0.86, kosong: 0.02 },
  { email: "bagus.prasetyo@pintarbersamaadzkia.com",  benar: 0.74, kosong: 0.04 },
  { email: "dinda.ayu@pintarbersamaadzkia.com",   benar: 0.68, kosong: 0.05 },
  { email: "fajar.nugroho@pintarbersamaadzkia.com",   benar: 0.58, kosong: 0.08 },
  { email: "hana.salsabila@pintarbersamaadzkia.com", benar: 0.52, kosong: 0.10 },
  { email: "ilham.maulana@pintarbersamaadzkia.com",   benar: 0.44, kosong: 0.12 },
  { email: "kirana.puspita@pintarbersamaadzkia.com",   benar: 0.36, kosong: 0.15 },
  { email: "rizky.ardiansyah@pintarbersamaadzkia.com",benar: 0.28, kosong: 0.20 },
];

// Acak deterministik supaya hasil skrip bisa diulang persis.
let benih = 20260826;
const acak = () => ((benih = (benih * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const LABEL = ["A", "B", "C", "D", "E"];

/** Jawaban keliru yang masuk akal untuk satu butir. */
function jawabanSalah(soal) {
  if (soal.tipe === "IS") return String(Math.floor(acak() * 900) + 100);
  const opsi = JSON.parse(soal.opsi || "[]");
  const jumlah = Math.max(2, opsi.length);
  if (soal.tipe === "PGK") {
    // Ambil 1-2 label, lalu pastikan berbeda dari kunci.
    const kunci = JSON.parse(soal.kunci);
    let pilih;
    do {
      pilih = LABEL.slice(0, jumlah).filter(() => acak() < 0.4);
      if (pilih.length === 0) pilih = [LABEL[Math.floor(acak() * jumlah)]];
    } while (JSON.stringify(pilih.sort()) === JSON.stringify([...kunci].sort()));
    return JSON.stringify(pilih);
  }
  let l;
  do {
    l = LABEL[Math.floor(acak() * jumlah)];
  } while (l === soal.kunci.trim().toUpperCase());
  return l;
}

const soal = db
  .prepare("SELECT id, subtes, tipe, opsi, kunci FROM questions WHERE package_id = ? ORDER BY subtes, nomor")
  .all(paket.id);

if (soal.length === 0) {
  console.error("Paket belum punya soal. Jalankan \"npm run seed\" lebih dulu.");
  process.exit(1);
}

if (process.argv.includes("--reset")) {
  const hapus = db
    .prepare(
      `DELETE FROM attempts WHERE package_id = ? AND user_id IN
         (SELECT id FROM users WHERE email IN (${PROFIL.map(() => "?").join(",")}))`,
    )
    .run(paket.id, ...PROFIL.map((p) => p.email));
  console.log(`--reset: ${hapus.changes} pengerjaan siswa contoh dihapus.`);
}

let dibuat = 0;
let dilewati = 0;

for (const profil of PROFIL) {
  const user = db.prepare("SELECT id, nama FROM users WHERE email = ?").get(profil.email);
  if (!user) {
    console.warn(`  ! Pengguna ${profil.email} tidak ada, dilewati.`);
    continue;
  }
  const sudah = db
    .prepare("SELECT id FROM attempts WHERE user_id = ? AND package_id = ?")
    .get(user.id, paket.id);
  if (sudah) {
    dilewati++;
    continue;
  }

  db.exec("BEGIN");
  try {
    const att = db
      .prepare(
        `INSERT INTO attempts (user_id, package_id, status, started_at, finished_at)
         VALUES (?, ?, 'finished', datetime('now','localtime','-4 hours'), datetime('now','localtime','-1 hours'))`,
      )
      .run(user.id, paket.id);
    const attemptId = Number(att.lastInsertRowid);

    // Catat setiap subtes sebagai sudah selesai agar konsisten dengan alur ujian.
    const subtes = [...new Set(soal.map((s) => s.subtes))];
    for (const kode of subtes) {
      db.prepare(
        `INSERT INTO attempt_subtes (attempt_id, subtes, mulai_at, deadline_at, selesai_at)
         VALUES (?, ?, datetime('now','-4 hours'), datetime('now','-3 hours'), datetime('now','-3 hours'))`,
      ).run(attemptId, kode);
    }

    const simpan = db.prepare(
      "INSERT INTO answers (attempt_id, question_id, jawaban, ragu) VALUES (?, ?, ?, 0)",
    );
    for (const s of soal) {
      if (acak() < profil.kosong) continue; // dibiarkan kosong
      const benar = acak() < profil.benar;
      simpan.run(attemptId, s.id, benar ? s.kunci : jawabanSalah(s));
    }
    db.exec("COMMIT");
    dibuat++;
    console.log(`  + ${user.nama} — pengerjaan dibuat (target benar ${Math.round(profil.benar * 100)}%)`);
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

const total = db
  .prepare("SELECT COUNT(*) n FROM attempts WHERE package_id = ? AND status = 'finished'")
  .get(paket.id);

console.log(`\nSelesai. Dibuat ${dibuat}, dilewati ${dilewati} (sudah ada).`);
console.log(`Total pengerjaan selesai pada ${KODE_PAKET}: ${total.n}`);
console.log(`Nilai & peringkat diisi lewat tombol "Hitung ulang nilai" di /admin/paket.`);
