/**
 * Menyiapkan data untuk UJI BEBAN — peserta, paket, soal, dan kuki sesinya.
 *
 *     node --conditions=react-server scripts/seed-beban.mjs --siswa=1000
 *     node --conditions=react-server scripts/seed-beban.mjs --hapus
 *
 * MENGAPA MENCETAK KUKI SENDIRI. Pintu masuk aplikasi ini adalah Server Action,
 * bukan rute REST — k6 tidak bisa memanggilnya dengan wajar. Lagi pula yang
 * hendak diukur BUKAN halaman login, melainkan tiga rute terpanas yang berjalan
 * SELAMA ujian: denyut, autosave, dan sinkron waktu. Jadi skrip ini menerbitkan
 * kuki sesi yang sah — JWT bertanda tangan sama persis dengan yang dibuat
 * `createSession()`, berikut baris `peserta_sesi` yang membuat `sid`-nya diakui
 * — lalu menuliskannya ke berkas yang dibaca k6.
 *
 * Semua yang dibuatnya bertanda `BEBAN-`, dan `--hapus` mencabutnya sampai ke
 * akar (ON DELETE CASCADE ikut membersihkan attempts, answers, dan sesi).
 *
 * JANGAN DIJALANKAN DI PRODUKSI. Ia membuat ribuan akun yang kata sandinya
 * sama dan sesinya sudah terbuka; itu wajar untuk mesin uji, dan berbahaya di
 * tempat lain. Gerbangnya: menolak jalan bila DATABASE_URL menunjuk selain
 * 127.0.0.1/localhost, kecuali diberi `--saya-tahu-ini-bukan-lokal`.
 */
import fs from "node:fs";
import path from "node:path";

import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

import "./muat-ts.mjs";

const AKAR = path.resolve(import.meta.dirname, "..");

for (const baris of fs.readFileSync(path.join(AKAR, ".env"), "utf8").split("\n")) {
  const cocok = /^\s*([A-Z_0-9]+)\s*=\s*(.*)\s*$/.exec(baris);
  if (cocok && !process.env[cocok[1]]) process.env[cocok[1]] = cocok[2].trim();
}

const arg = (nama, bawaan) => {
  const p = process.argv.find((a) => a.startsWith(`--${nama}=`));
  return p ? p.split("=")[1] : bawaan;
};
const ada = (nama) => process.argv.includes(`--${nama}`);

const JUMLAH_SISWA = Number(arg("siswa", 1000));
const JUMLAH_SOAL = Number(arg("soal", 160));
const KODE_PAKET = "BEBAN-UTBK";
const SANDI = "beban123";
const PENANDA = "BEBAN-";

/* ---------------- gerbang keselamatan ---------------- */

const ALAMAT = process.env.DATABASE_URL ?? "";
const lokal = /@(127\.0\.0\.1|localhost|db)[:/]/.test(ALAMAT);
if (!lokal && !ada("saya-tahu-ini-bukan-lokal")) {
  console.error(
    "\nDATABASE_URL tidak menunjuk basis data lokal.\n" +
      "Skrip ini membuat ribuan akun uji bersandi sama — jangan dijalankan di produksi.\n" +
      "Bila memang disengaja, tambahkan --saya-tahu-ini-bukan-lokal.\n",
  );
  process.exit(1);
}

const D = await import("@/lib/core/db");

/* ==========================================================================
   HAPUS
   ========================================================================== */

if (ada("hapus")) {
  const p = await D.run("DELETE FROM packages WHERE kode LIKE ?", `${PENANDA}%`);
  const u = await D.run("DELETE FROM users WHERE email LIKE ?", `${PENANDA}%`);
  console.log(`Dihapus: ${p.changes} paket, ${u.changes} akun (beserta seluruh turunannya).`);
  const berkas = path.join(AKAR, "load-tests", "data", "peserta.json");
  fs.rmSync(berkas, { force: true });
  await D.pool.end();
  process.exit(0);
}

/* ==========================================================================
   PAKET & SOAL
   ========================================================================== */

console.log(`Menyiapkan ${JUMLAH_SISWA} peserta x ${JUMLAH_SOAL} soal …`);

await D.run("DELETE FROM packages WHERE kode = ?", KODE_PAKET);
await D.run("DELETE FROM users WHERE email LIKE ?", `${PENANDA}%`);

const paketId = await D.sisipWajib(
  `INSERT INTO packages (kode, nama, status, jalur, mulai_at, selesai_at)
   VALUES (?, 'Paket Uji Beban', 'published', 'utbk',
           now() - interval '1 hour', now() + interval '12 hours')`,
  KODE_PAKET,
);

// Sebaran subtes mengikuti bentuk paket UTBK sungguhan, supaya jumlah baris
// `attempt_subtes` dan pola penyaringan querynya ikut sama.
/** Subtes yang timernya dibuka untuk seluruh peserta uji. */
const SUBTES_DIBUKA = "PU";

const SUBTES = [
  ["PU", 30],
  ["PPU", 20],
  ["PBM", 20],
  ["PK", 20],
  ["LBIND", 30],
  ["LBING", 20],
  ["PM", 20],
];

const idSoal = [];
/** Butir milik subtes yang timernya dibuka — inilah yang dijawab k6. */
const idSoalAktif = [];
{
  const kodeSubtes = [];
  const nomor = [];
  const tanya = [];
  let sisa = JUMLAH_SOAL;
  for (const [kode, banyak] of SUBTES) {
    for (let n = 1; n <= banyak && sisa > 0; n++, sisa--) {
      kodeSubtes.push(kode);
      nomor.push(n);
      tanya.push(`Soal uji beban ${kode} nomor ${n}`);
    }
  }
  // Satu INSERT untuk seluruh butir — 160 perjalanan pulang-pergi menjadi satu.
  const baris = await D.all(
    `INSERT INTO questions (package_id, subtes, nomor, tipe, level, pertanyaan, opsi, kunci)
     SELECT ?, x.subtes, x.nomor, 'PG', 'C3', x.tanya, '["a","b","c","d","e"]', 'A'
       FROM unnest(?::text[], ?::int[], ?::text[]) AS x(subtes, nomor, tanya)
     RETURNING id, subtes`,
    paketId,
    kodeSubtes,
    nomor,
    tanya,
  );
  idSoal.push(...baris.map((b) => b.id));
  // HANYA butir subtes yang timernya dibuka yang boleh dijawab k6.
  //
  // Ruang ujian yang sungguhan memang begitu: satu subtes terbuka pada satu
  // waktu, dan butir dari subtes lain DITOLAK server dengan 409. Memberi k6
  // seluruh 160 butir membuat 80% kirimannya ditolak dengan benar — dan
  // laporannya terbaca seolah aplikasinya gagal. Terlihat 11 Sept 2026: 88 dari
  // 150 kiriman berbalas 409, semuanya karena soalnya bukan milik subtes yang
  // sedang berjalan.
  idSoalAktif.push(...baris.filter((b) => b.subtes === SUBTES_DIBUKA).map((b) => b.id));
}
console.log(`  paket #${paketId}, ${idSoal.length} soal (${idSoalAktif.length} di subtes ${SUBTES_DIBUKA})`);

/* ==========================================================================
   PESERTA
   ========================================================================== */

// SATU hash untuk semua: bcrypt cost 10 memakan ±100 ms, dan seribu kali itu
// berarti dua menit menunggu tanpa guna. Kata sandinya memang sama untuk semua
// akun uji, jadi hash yang sama persis adalah hal yang benar di sini.
const hash = await bcrypt.hash(SANDI, 10);

const nama = [];
const email = [];
const nisn = [];
for (let i = 1; i <= JUMLAH_SISWA; i++) {
  const n = String(i).padStart(5, "0");
  nama.push(`Peserta Beban ${n}`);
  email.push(`${PENANDA}${n}@uji.invalid`);
  nisn.push(`99${n}`);
}

const users = await D.all(
  `INSERT INTO users (nama, email, password_hash, role, kelas, nisn)
   SELECT x.nama, x.email, ?, 'siswa', 'XII BEBAN', x.nisn
     FROM unnest(?::text[], ?::text[], ?::text[]) AS x(nama, email, nisn)
   RETURNING id`,
  hash,
  nama,
  email,
  nisn,
);
console.log(`  ${users.length} akun peserta`);

/* ==========================================================================
   ATTEMPT + TIMER + SESI PERANGKAT
   ========================================================================== */

const idUser = users.map((u) => u.id);

const attempts = await D.all(
  // `denyut_aktif = 0`, dan ini BUKAN kelalaian.
  //
  // Penjagaan ujian menilai jeda antara dua denyut, dan denyut pertama sesudah
  // penyemaian bisa datang beberapa menit kemudian — lebih lama daripada ambang
  // 20 detik. Dengan `denyut_aktif = 1`, k6 akan MENGGUGURKAN seluruh peserta
  // uji pada permintaan pertamanya, dan uji bebannya berubah menjadi uji
  // halaman GAGAL. Penanda 0 berarti "penjagaan belum menyala", persis seperti
  // peserta yang belum melewati gerbang layar penuh; denyut pertama menyalakannya
  // tanpa dinilai. Terbukti 11 Sept 2026: satu peserta uji gugur karena baris
  // ini semula berisi 1.
  `INSERT INTO attempts (user_id, package_id, status, subtes_aktif, denyut_at, denyut_aktif)
   SELECT x.uid, ?, 'ongoing', ?, now(), 0
     FROM unnest(?::int[]) AS x(uid)
   RETURNING id, user_id`,
  paketId,
  SUBTES_DIBUKA,
  idUser,
);

await D.run(
  `INSERT INTO attempt_subtes (attempt_id, subtes, mulai_at, deadline_at)
   SELECT x.aid, ?, now(), now() + interval '12 hours'
     FROM unnest(?::int[]) AS x(aid)`,
  SUBTES_DIBUKA,
  attempts.map((a) => a.id),
);
console.log(`  ${attempts.length} attempt berjalan, timer ${SUBTES_DIBUKA} terbuka 12 jam`);

/* ==========================================================================
   KUKI SESI
   ========================================================================== */

const RAHASIA = new TextEncoder().encode(
  process.env.ADZKIA_SECRET ?? "adzkia-smart-dev-secret-ganti-di-produksi-2026",
);

const petaAttempt = new Map(attempts.map((a) => [a.user_id, a.id]));
const sidUser = [];
const sidNilai = [];
const peserta = [];

for (let i = 0; i < users.length; i++) {
  const id = users[i].id;
  const sid = `beban-${id}`;
  sidUser.push(id);
  sidNilai.push(sid);

  const token = await new SignJWT({
    id,
    nama: nama[i],
    email: email[i],
    role: "siswa",
    nisn: nisn[i],
    kelas: "XII BEBAN",
    sid,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(RAHASIA);

  peserta.push({
    userId: id,
    attemptId: petaAttempt.get(id),
    cookie: `adzkia_session=${token}`,
    // `soal` = yang boleh dijawab sekarang. `soalSemua` disertakan untuk
    // skenario yang sengaja hendak menguji PENOLAKAN butir asing.
    soal: idSoalAktif,
    soalSemua: idSoal,
  });
}

await D.run(
  `INSERT INTO peserta_sesi (user_id, sid, alat, masuk_at, terakhir_at)
   SELECT x.uid, x.sid, 'k6 · uji beban', now(), now()
     FROM unnest(?::int[], ?::text[]) AS x(uid, sid)
   ON CONFLICT (user_id) DO UPDATE SET sid = excluded.sid, terakhir_at = now()`,
  sidUser,
  sidNilai,
);

const tujuan = path.join(AKAR, "load-tests", "data");
fs.mkdirSync(tujuan, { recursive: true });
fs.writeFileSync(
  path.join(tujuan, "peserta.json"),
  JSON.stringify({ paketId, subtesDibuka: SUBTES_DIBUKA, soal: idSoalAktif, soalSemua: idSoal, peserta }, null, 0),
);

console.log(`  ${peserta.length} kuki sesi ditulis ke load-tests/data/peserta.json`);
console.log("\nSiap. Jalankan uji bebannya:");
console.log("  k6 run load-tests/smoke.js");
console.log("  k6 run -e VUS=500 load-tests/answer-submit.js");
console.log("\nBersihkan sesudahnya:");
console.log("  node --conditions=react-server scripts/seed-beban.mjs --hapus");

await D.pool.end();
