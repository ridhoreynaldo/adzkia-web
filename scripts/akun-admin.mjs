/**
 * ADZKIA SMART — memasang akun pengelola.
 *
 *   node scripts/akun-admin.mjs            # tinjau saja, tidak menulis apa pun
 *   node scripts/akun-admin.mjs --tulis    # benar-benar menyimpan
 *
 * Ditetapkan pengguna 4 September 2026: pengelola dipegang TIGA akun tetap, dan
 * akun admin lama `admin@pintarbersamaadzkia.com` dihapus supaya kata sandinya
 * yang sudah beredar tidak lagi berlaku.
 *
 * Kenapa harus `--tulis`: skrip ini mengubah siapa saja yang bisa masuk ke
 * panel. Menjalankannya tanpa saklar itu memperlihatkan rencananya lebih dulu,
 * sehingga tidak ada admin yang tanpa sengaja terhapus di server produksi.
 *
 * Aman diulang: akun yang sudah ada disetel ulang kata sandinya, bukan
 * digandakan.
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TULIS = process.argv.includes("--tulis");

/**
 * Menemukan database yang BENAR-BENAR dipakai aplikasi.
 *
 * Di server, database TIDAK berada di dalam folder aplikasi: pasang.sh
 * menaruhnya di /srv/adzkia/data/adzkia.db dan memberitahukan letaknya lewat
 * ADZKIA_DB_PATH pada .env.local. Menebak <proyek>/data/adzkia.db di sana
 * berarti node:sqlite MEMBUAT berkas kosong baru, lalu skrip ini memasang tiga
 * admin ke database yang tidak pernah dibaca siapa pun -- kegagalan yang
 * diam-diam dan membingungkan. Maka urutannya: variabel lingkungan, lalu
 * .env.local, baru tebakan terakhir.
 */
function cariDatabase() {
  if (process.env.ADZKIA_DB_PATH) {
    return { jalur: process.env.ADZKIA_DB_PATH, dari: "ADZKIA_DB_PATH" };
  }

  const env = path.join(ROOT, ".env.local");
  if (fs.existsSync(env)) {
    const cocok = fs
      .readFileSync(env, "utf8")
      .match(/^[ \t]*ADZKIA_DB_PATH[ \t]*=[ \t]*(.+?)[ \t]*$/m);
    if (cocok) return { jalur: cocok[1].replace(/^["']|["']$/g, ""), dari: ".env.local" };
  }

  return { jalur: path.join(ROOT, "data", "adzkia.db"), dari: "bawaan proyek" };
}

const { jalur: DB_PATH, dari: SUMBER_JALUR } = cariDatabase();

/** Daftar resmi pengelola. Tambah/kurangi di sini, lalu jalankan ulang. */
const ADMIN = [
  { nama: "Admin Satu", email: "admin1@pba.com", password: "admin999" },
  { nama: "Admin Dua", email: "admin2@pba.com", password: "admin9999" },
  { nama: "Admin Tiga", email: "admin3@pba.com", password: "admin99999" },
];

const hijau = (t) => `\x1b[32m${t}\x1b[0m`;
const merah = (t) => `\x1b[31m${t}\x1b[0m`;
const kuning = (t) => `\x1b[33m${t}\x1b[0m`;

// Menolak berkas yang belum ada, BUKAN membuatnya. DatabaseSync dengan senang
// hati mencetak database kosong, dan itu persis kegagalan diam-diam yang
// dihindari cariDatabase() di atas.
if (!fs.existsSync(DB_PATH)) {
  console.error(merah(`\n  Database tidak ditemukan: ${DB_PATH}`));
  console.error(`  (ditentukan dari: ${SUMBER_JALUR})\n`);
  console.error("  Di server, jalankan dari folder aplikasi supaya .env.local terbaca:");
  console.error("      cd /srv/adzkia/app && node scripts/akun-admin.mjs\n");
  process.exit(1);
}

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA busy_timeout = 10000");
db.exec("PRAGMA foreign_keys = ON");

const adaUsers = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'")
  .get();
if (!adaUsers) {
  console.error(merah(`\n  ${DB_PATH} bukan database ADZKIA SMART - tabel users tidak ada.\n`));
  db.close();
  process.exit(1);
}

console.log(`\n  Basis data : ${DB_PATH}  (dari ${SUMBER_JALUR})`);
console.log(`  Mode       : ${TULIS ? hijau("MENULIS") : kuning("TINJAU SAJA (tambahkan --tulis)")}\n`);

const surel = ADMIN.map((a) => a.email);
const sekarang = db.prepare("SELECT id, nama, email FROM users WHERE role = 'admin'").all();

/* ---------------------------------------------------------------- rencana */

const dibuang = sekarang.filter((a) => !surel.includes(a.email));

console.log("  Rencana:");
for (const a of ADMIN) {
  const ada = sekarang.find((s) => s.email === a.email);
  console.log(
    `    ${ada ? "perbarui sandi" : "buat baru     "}  ${a.email.padEnd(18)} ${a.nama}`,
  );
}
for (const a of dibuang) {
  console.log(`    ${merah("HAPUS")}           ${a.email.padEnd(18)} ${a.nama} (id ${a.id})`);
}
if (!dibuang.length) console.log("    (tidak ada admin lain yang perlu dihapus)");

/* ------------------------------------------------------------------ jaga */

// Menghapus admin lama sebelum admin baru terpasang akan meninggalkan panel
// tanpa satu pun pintu masuk kalau skrip berhenti di tengah jalan. Seluruhnya
// dijalankan dalam satu transaksi supaya keadaan itu mustahil terjadi.
if (!TULIS) {
  console.log(kuning("\n  Belum ada yang berubah. Ulangi dengan --tulis bila rencana di atas benar.\n"));
  db.close();
  process.exit(0);
}

db.exec("BEGIN");
try {
  for (const a of ADMIN) {
    const hash = bcrypt.hashSync(a.password, 10);
    const ada = db.prepare("SELECT id FROM users WHERE email = ?").get(a.email);
    if (ada) {
      db.prepare(
        "UPDATE users SET nama = ?, password_hash = ?, role = 'admin' WHERE id = ?",
      ).run(a.nama, hash, ada.id);
    } else {
      db.prepare(
        `INSERT INTO users (nama, email, password_hash, role, asal_sekolah)
         VALUES (?, ?, ?, 'admin', 'SMA Islam Plus Adzkia')`,
      ).run(a.nama, a.email, hash);
    }
  }

  for (const a of dibuang) {
    db.prepare("DELETE FROM users WHERE id = ? AND role = 'admin'").run(a.id);
  }

  // Sesi yang sedang berjalan ikut dilepas: kata sandi baru tidak ada gunanya
  // kalau cookie lama masih memegang panel, dan kunci "satu perangkat" yang
  // tertinggal akan menolak login pertama pemiliknya sendiri.
  const adaTabel = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'admin_sesi'")
    .get();
  if (adaTabel) db.exec("DELETE FROM admin_sesi");

  db.exec("COMMIT");
} catch (e) {
  try {
    db.exec("ROLLBACK");
  } catch {
    /* transaksi mungkin sudah tertutup */
  }
  console.error(merah(`\n  Gagal: ${e.message}\n`));
  db.close();
  process.exit(1);
}

/* ----------------------------------------------------------------- hasil */

const akhir = db.prepare("SELECT id, nama, email FROM users WHERE role = 'admin' ORDER BY id").all();
console.log(hijau(`\n  Selesai. ${akhir.length} akun pengelola sekarang:`));
for (const a of akhir) console.log(`    id ${String(a.id).padEnd(4)} ${a.email.padEnd(18)} ${a.nama}`);
console.log("\n  Masuk lewat /ADZ-ADM4S. Semua sesi admin yang lama sudah dilepas.\n");

db.close();
