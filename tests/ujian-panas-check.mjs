/**
 * Pengujian JALUR PANAS RUANG UJIAN — gerbang peserta, autosave, dan denyut.
 *
 * Cara menjalankan (dari folder adzkia-smart-pg):
 *     npm run cek:panas
 *
 * Menyambung ke PostgreSQL SUNGGUHAN yang alamatnya ada di DATABASE_URL.
 * SELURUH yang ditulisnya dibatalkan (satu transaksi yang sengaja dilempar di
 * ujungnya), jadi aman dijalankan berkali-kali pada basis data yang sedang
 * dipakai — termasuk saat ada ujian berjalan.
 *
 * Yang diperiksa — empat hal yang semuanya PERNAH salah, dan tiga di antaranya
 * salah tanpa membuat `tsc` maupun `next build` mengeluh sedikit pun:
 *
 *   1. PENANDA BERNOMOR `?1` / `?2`. Empat query pada gerbang "peserta ini
 *      boleh membuka paket itu" memakainya. Sebelum diperbaiki, penerjemah
 *      `keParamPg()` mengubahnya menjadi `$11` dan `$22` — PostgreSQL menolak
 *      dengan "there is no parameter $11", dan yang gagal adalah tombol Mulai
 *      milik peserta, bukan sesuatu yang terlihat saat membangun.
 *
 *   2. PENCOCOKAN KELAS tanpa memandang besar-kecil huruf. Sebelumnya ditulis
 *      `COLLATE NOCASE` — kolasi milik SQLite yang tidak ada di PostgreSQL.
 *
 *   3. AUTOSAVE BERBATCH: jumlah query TETAP berapa pun banyak butirnya,
 *      aturan penolakannya persis seperti sebelumnya, dan tetap IDEMPOTEN
 *      terhadap kiriman ulang.
 *
 *   4. DENYUT: satu pernyataan yang memulangkan jeda sejak denyut sebelumnya,
 *      dan denyut kedua yang menyusul rapat TIDAK menghitung ulang jeda yang
 *      sama — itulah balapan yang dulu bisa menggugurkan peserta dua kali atas
 *      satu kepergian.
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

import "../scripts/muat-ts.mjs";

const AKAR = path.resolve(import.meta.dirname, "..");

// .env dibaca sendiri: skrip ini berjalan di luar Next, yang biasanya
// memuatkannya.
for (const baris of fs.readFileSync(path.join(AKAR, ".env"), "utf8").split("\n")) {
  const cocok = /^\s*([A-Z_0-9]+)\s*=\s*(.*)\s*$/.exec(baris);
  if (cocok && !process.env[cocok[1]]) process.env[cocok[1]] = cocok[2].trim();
}

// Cache dimatikan untuk pemeriksaan ini: yang sedang diuji adalah perilaku
// basis datanya, dan entri sisa dari jalannya yang lalu hanya akan menutupinya.
process.env.REDIS_URL = "";

const D = await import("@/lib/core/db");
const E = await import("@/lib/tryout/exam");
const P = await import("@/lib/penjagaan/pelanggaran");

let gagal = 0;
function periksa(nama, syarat, tambahan = "") {
  if (syarat) console.log(`  OK   ${nama}`);
  else {
    gagal++;
    console.log(`  GAGAL ${nama}${tambahan ? ` — ${tambahan}` : ""}`);
  }
}

/* ==========================================================================
   PENGHITUNG QUERY
   --------------------------------------------------------------------------
   Menghitung berapa kali PostgreSQL benar-benar dihubungi. `pg.Client` adalah
   modul yang sama persis yang dipakai `db.ts` (cache modul Node), jadi
   membungkus prototipenya menangkap SELURUH query — termasuk yang berjalan di
   dalam transaksi lewat klien yang dipinjam dari pool.
   ========================================================================== */

const queryAsli = pg.Client.prototype.query;
let jumlahQuery = 0;
let menghitung = false;
pg.Client.prototype.query = function (...args) {
  if (menghitung) jumlahQuery++;
  return queryAsli.apply(this, args);
};

function mulaiHitung() {
  jumlahQuery = 0;
  menghitung = true;
}
function hentikanHitung() {
  menghitung = false;
  return jumlahQuery;
}

/* ==========================================================================
   1. PENANDA BERNOMOR
   ========================================================================== */

console.log("\n1) Penanda bernomor ?1 / ?2");
{
  periksa(
    "?1 dipakai dua kali menjadi $1 dua kali",
    D.keParamPg("SELECT a FROM t WHERE x = ?1 AND y = ?1") === "SELECT a FROM t WHERE x = $1 AND y = $1",
    D.keParamPg("SELECT a FROM t WHERE x = ?1 AND y = ?1"),
  );
  periksa(
    "?1 dan ?2 tidak tertukar",
    D.keParamPg("WHERE a = ?1 AND b = ?2 AND c = ?1") === "WHERE a = $1 AND b = $2 AND c = $1",
    D.keParamPg("WHERE a = ?1 AND b = ?2 AND c = ?1"),
  );
  periksa(
    "? polos sesudah ?2 tidak menabrak nomor yang sudah terpakai",
    D.keParamPg("WHERE a = ?2 AND b = ?") === "WHERE a = $2 AND b = $3",
    D.keParamPg("WHERE a = ?2 AND b = ?"),
  );
  periksa(
    "? polos tetap berurutan seperti sebelumnya",
    D.keParamPg("VALUES (?,?,?)") === "VALUES ($1,$2,$3)",
  );

  const r = await D.one("SELECT ?1::int + ?1::int AS dua_kali, ?2::text AS teks", 21, "halo");
  periksa("dipakai sungguhan ke PostgreSQL", r.dua_kali === 42 && r.teks === "halo", JSON.stringify(r));
}

/* ==========================================================================
   SISANYA berjalan di dalam satu transaksi yang SELALU dibatalkan.
   ========================================================================== */

const PENANDA = "__cek_panas__";

try {
  await D.tx(async () => {
    /* ---------------- data uji ---------------- */

    const paketId = await D.sisipWajib(
      `INSERT INTO packages (kode, nama, status, jalur) VALUES (?, ?, 'published', 'utbk')`,
      `${PENANDA}-${Date.now()}`,
      "Paket uji jalur panas",
    );
    const userId = await D.sisipWajib(
      `INSERT INTO users (nama, email, password_hash, role, kelas) VALUES (?, ?, 'x', 'siswa', ?)`,
      "Peserta Uji",
      `${PENANDA}-${Date.now()}@contoh.invalid`,
      "XII Harvard",
    );

    const idSoal = [];
    for (let n = 1; n <= 3; n++) {
      idSoal.push(
        await D.sisipWajib(
          `INSERT INTO questions (package_id, subtes, nomor, pertanyaan, kunci) VALUES (?, 'PU', ?, ?, 'A')`,
          paketId,
          n,
          `Soal uji ${n}`,
        ),
      );
    }
    // Satu butir milik PAKET LAIN, untuk membuktikan butir asing ditolak.
    const paketLain = await D.sisipWajib(
      `INSERT INTO packages (kode, nama, status) VALUES (?, 'Paket lain', 'published')`,
      `${PENANDA}-lain-${Date.now()}`,
    );
    const soalAsing = await D.sisipWajib(
      `INSERT INTO questions (package_id, subtes, nomor, pertanyaan, kunci) VALUES (?, 'PU', 1, 'Soal asing', 'A')`,
      paketLain,
    );

    /* ---------------- 2. Gerbang peserta ---------------- */

    console.log("\n2) Gerbang peserta (query berpenanda bernomor)");
    {
      periksa("paket tanpa pembatas: terbuka untuk semua", (await E.paketDibatasi(paketId)) === false);
      periksa("dan pesertanya diizinkan", (await E.pesertaDiizinkan(userId, paketId)) === true);

      // Pembatas KELAS, ditulis dengan huruf besar semua — data asli sekolah
      // memuat "XII HARVARD" dan "XII Harvard" berdampingan.
      await D.run("INSERT INTO paket_kelas (package_id, kelas) VALUES (?, ?)", paketId, "  XII HARVARD ");

      periksa("paket dengan pembatas: dibatasi", (await E.paketDibatasi(paketId)) === true);
      periksa(
        "kelas cocok walau beda besar-kecil huruf dan spasi tepi",
        (await E.pesertaDiizinkan(userId, paketId)) === true,
      );

      const asing = await D.sisipWajib(
        `INSERT INTO users (nama, email, password_hash, role, kelas) VALUES ('Bukan Peserta', ?, 'x', 'siswa', 'XI Stanford')`,
        `${PENANDA}-asing-${Date.now()}@contoh.invalid`,
      );
      periksa("kelas yang tidak terdaftar TETAP ditolak", (await E.pesertaDiizinkan(asing, paketId)) === false);
    }

    /* ---------------- 3. Autosave berbatch ---------------- */

    console.log("\n3) Autosave berbatch");

    const attemptId = await D.sisipWajib(
      `INSERT INTO attempts (user_id, package_id, status) VALUES (?, ?, 'ongoing')`,
      userId,
      paketId,
    );
    await D.run(
      `INSERT INTO attempt_subtes (attempt_id, subtes, deadline_at) VALUES (?, 'PU', now() + interval '30 minutes')`,
      attemptId,
    );
    const att = await E.getAttempt(attemptId);

    {
      const butir = idSoal.map((id, i) => ({ questionId: id, jawaban: "ABC"[i], ragu: i === 1 }));

      mulaiHitung();
      const hasil = await E.simpanJawabanBanyak(att, butir);
      const q3 = hentikanHitung();

      periksa("tiga butir tersimpan", hasil.tersimpan === 3, JSON.stringify(hasil));
      periksa("tidak ada yang ditolak", hasil.ditolak.length === 0, JSON.stringify(hasil.ditolak));
      periksa("jumlah query untuk 3 butir = 3", q3 === 3, `dapat ${q3}`);

      const tersimpan = await D.all(
        "SELECT question_id, jawaban, ragu FROM answers WHERE attempt_id = ? ORDER BY question_id",
        attemptId,
      );
      periksa("isi jawaban benar", tersimpan.map((r) => r.jawaban).join("") === "ABC", JSON.stringify(tersimpan));
      periksa("penanda ragu ikut tersimpan", tersimpan[1].ragu === 1, JSON.stringify(tersimpan[1]));

      // Jumlah query TIDAK boleh tumbuh mengikuti banyak butir. Itulah
      // seluruh inti perubahan ini.
      const banyak = idSoal.map((id, i) => ({ questionId: id, jawaban: "XYZ"[i], ragu: false }));
      mulaiHitung();
      await E.simpanJawabanBanyak(att, [...banyak, ...banyak, ...banyak]);
      const q9 = hentikanHitung();
      periksa("9 butir tetap 3 query", q9 === 3, `dapat ${q9}`);

      // Idempoten: kiriman ulang yang sama persis tidak melahirkan baris baru.
      const sebelum = (await D.one("SELECT COUNT(*) AS n FROM answers WHERE attempt_id = ?", attemptId)).n;
      await E.simpanJawabanBanyak(att, butir);
      const sesudah = (await D.one("SELECT COUNT(*) AS n FROM answers WHERE attempt_id = ?", attemptId)).n;
      periksa("kiriman ulang tidak menggandakan baris", sebelum === sesudah, `${sebelum} -> ${sesudah}`);

      // Butir milik paket lain harus ditolak, bukan diam-diam tersimpan.
      const campur = await E.simpanJawabanBanyak(att, [
        { questionId: idSoal[0], jawaban: "A", ragu: false },
        { questionId: soalAsing, jawaban: "A", ragu: false },
      ]);
      periksa("butir milik paket lain ditolak", campur.ditolak.includes(soalAsing), JSON.stringify(campur));
      periksa("butir yang sah tetap tersimpan", campur.tersimpan === 1, JSON.stringify(campur));
    }

    {
      // Timer yang sudah ditutup menolak seluruh butirnya — aturan lama yang
      // tidak boleh ikut hilang saat query digabungkan.
      await D.run("UPDATE attempt_subtes SET selesai_at = now() WHERE attempt_id = ?", attemptId);
      const sesudahTutup = await E.simpanJawabanBanyak(att, [
        { questionId: idSoal[0], jawaban: "E", ragu: false },
      ]);
      periksa("subtes yang sudah ditutup menolak jawaban", sesudahTutup.tersimpan === 0);
      periksa("dan butirnya masuk daftar ditolak", sesudahTutup.ditolak.length === 1);

      await D.run(
        "UPDATE attempt_subtes SET selesai_at = NULL, deadline_at = now() - interval '1 second' WHERE attempt_id = ?",
        attemptId,
      );
      const sesudahHabis = await E.simpanJawabanBanyak(att, [
        { questionId: idSoal[0], jawaban: "E", ragu: false },
      ]);
      periksa("waktu yang sudah habis juga menolak", sesudahHabis.tersimpan === 0);
    }

    /* ---------------- 4. Denyut ---------------- */

    console.log("\n4) Denyut nadi");
    {
      // Denyut pertama: belum ada denyut sebelumnya, jadi tidak ada jeda.
      const pertama = await P.catatDenyut(attemptId, true);
      periksa("denyut pertama tidak menghasilkan jeda", pertama === null, String(pertama));

      mulaiHitung();
      const kedua = await P.catatDenyut(attemptId, true);
      const qDenyut = hentikanHitung();
      periksa("satu denyut = satu query", qDenyut === 1, `dapat ${qDenyut}`);
      periksa("jeda terbaca angka detik", typeof kedua === "number", String(kedua));
      periksa("jeda denyut yang rapat mendekati nol", kedua !== null && kedua < 5, String(kedua));

      // Jeda panjang yang SUNGGUHAN tetap terbaca — ini yang menggugurkan
      // peserta, jadi ia tidak boleh ikut hilang bersama perbaikan balapan.
      await D.run("UPDATE attempts SET denyut_at = now() - interval '45 seconds' WHERE id = ?", attemptId);
      const jedaPanjang = await P.catatDenyut(attemptId, true);
      periksa("jeda 45 detik terbaca sekitar 45", jedaPanjang >= 44 && jedaPanjang <= 46, String(jedaPanjang));

      // Denyut yang menyusul rapat sesudahnya TIDAK boleh menghitung ulang
      // jeda yang sama — inilah balapan yang dulu bisa menggugurkan dua kali.
      const susulan = await P.catatDenyut(attemptId, true);
      periksa("denyut berikutnya tidak mengulang jeda yang sama", susulan < 5, String(susulan));

      // Denyut dari balik gerbang (aktif:false) tidak pernah dinilai.
      await D.run("UPDATE attempts SET denyut_at = now() - interval '60 seconds' WHERE id = ?", attemptId);
      const takAktif = await P.catatDenyut(attemptId, false);
      periksa("denyut dari balik gerbang tidak dinilai", takAktif === null, String(takAktif));
    }

    // Membatalkan SELURUH yang di atas.
    throw new Error(PENANDA);
  });
} catch (e) {
  if (!(e instanceof Error) || e.message !== PENANDA) throw e;
}

/* ---------------- 5. Kebersihan ---------------- */

console.log("\n5) Tidak ada sisa data uji");
{
  const sisa = await D.one("SELECT COUNT(*) AS n FROM packages WHERE kode LIKE ?", `${PENANDA}%`);
  periksa("seluruh tulisan uji dibatalkan", sisa.n === 0, `tersisa ${sisa.n}`);
}

console.log(gagal === 0 ? "\nSEMUA LULUS." : `\n${gagal} PEMERIKSAAN GAGAL.`);
await D.pool.end();
process.exit(gagal === 0 ? 0 : 1);
