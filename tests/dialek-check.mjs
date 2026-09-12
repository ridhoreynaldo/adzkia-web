/**
 * Pengujian SISA DIALEK SQLite — dengan cara MENJALANKAN querynya.
 *
 * Cara menjalankan (dari folder adzkia-smart-pg):
 *     npm run cek:dialek
 *
 * MENGAPA BERKAS INI ADA, dan mengapa bentuknya begini.
 *
 * Porting SQLite → PostgreSQL punya satu sifat yang membuatnya berbahaya:
 * SELURUH kesalahannya lolos dari `tsc` DAN dari `next build`. SQL adalah teks
 * bagi TypeScript; tidak ada satu pun tipe yang mengeluh karena `COLLATE NOCASE`
 * tidak ada di PostgreSQL, karena `?1` diterjemahkan menjadi `$11`, atau karena
 * kolom polos berdiri di samping `MAX()`. Yang gagal adalah peserta yang menekan
 * tombol Mulai — di hari-H, bukan di layar pengembang.
 *
 * Karena itu berkas ini tidak membaca kode. Ia MEMANGGIL fungsi-fungsi yang
 * sungguhan dipakai halaman, pada PostgreSQL yang sungguhan, di atas data yang
 * sungguhan dibuatnya sendiri — lalu melaporkan yang manapun yang melempar.
 * Sebuah query yang lulus di sini terbukti bisa diurai, direncanakan, dan
 * dijalankan PostgreSQL; yang gagal menyebut nomor galat dan namanya sekaligus.
 *
 * SELURUH TULISANNYA DIBATALKAN (satu transaksi yang sengaja dilempar di
 * ujungnya), jadi aman dijalankan berkali-kali pada basis data yang sedang
 * dipakai — termasuk saat ada ujian berjalan.
 *
 * Galat khas yang ditangkapnya, berikut nomor PostgreSQL-nya:
 *   42703 kolom tidak dikenal        · 42883 fungsi tidak ada
 *   42803 kolom polos di samping agregat (kelonggaran khas SQLite)
 *   42P02 parameter tidak ada        · 42601 anak query tanpa nama
 *   42P22 kolasi tidak ada (`COLLATE NOCASE`)
 */
import fs from "node:fs";
import path from "node:path";

// Tiruan next/navigation & next/headers, supaya portal.ts dan auth.ts ikut
// bisa diperiksa. Harus disetel SEBELUM muat-ts.mjs memasang kaitnya.
process.env.ADZKIA_TIRUAN_NEXT = "1";

import "../scripts/muat-ts.mjs";

const AKAR = path.resolve(import.meta.dirname, "..");

for (const baris of fs.readFileSync(path.join(AKAR, ".env"), "utf8").split("\n")) {
  const cocok = /^\s*([A-Z_0-9]+)\s*=\s*(.*)\s*$/.exec(baris);
  if (cocok && !process.env[cocok[1]]) process.env[cocok[1]] = cocok[2].trim();
}

// Cache dimatikan: yang diuji adalah querynya, bukan kemampuan Redis menutupi
// query yang rusak.
process.env.REDIS_URL = "";

const D = await import("@/lib/core/db");
const admin = await import("@/lib/admin/admin");
const exam = await import("@/lib/tryout/exam");
const irt = await import("@/lib/tryout/irt");
const live = await import("@/lib/admin/live");
const pelanggaran = await import("@/lib/penjagaan/pelanggaran");
const portal = await import("@/lib/admin/portal");
const rekap = await import("@/lib/laporan/rekap");
const warung = await import("@/lib/warung/warung");
const ielts = await import("@/lib/ielts/ielts");
const ieltsJaga = await import("@/lib/ielts/ielts-penjagaan");
const prodi = await import("@/lib/rujukan/prodi");
const siklus = await import("@/lib/tryout/siklus-jadwal");

let gagal = 0;
let lulus = 0;

/**
 * Memanggil satu fungsi dan melaporkan apakah PostgreSQL menerimanya.
 *
 * DIBUNGKUS SAVEPOINT, dan itu bukan kerapian: di PostgreSQL, SATU query yang
 * gagal membatalkan SELURUH transaksi — setiap perintah sesudahnya dijawab
 * "current transaction is aborted" (25P02). Tanpa savepoint, satu fungsi rusak
 * membuat 70 fungsi lain ikut terlihat rusak, dan laporan ini justru
 * menyembunyikan yang sedang dicarinya.
 */
let nomorTitik = 0;
async function jalan(nama, fn) {
  const titik = `cek${++nomorTitik}`;
  await D.run(`SAVEPOINT ${titik}`);
  try {
    const hasil = await fn();
    await D.run(`RELEASE SAVEPOINT ${titik}`);
    lulus++;
    const ukuran = Array.isArray(hasil)
      ? `${hasil.length} baris`
      : hasil instanceof Map
        ? `${hasil.size} entri`
        : hasil === undefined || hasil === null
          ? "kosong"
          : typeof hasil === "object"
            ? "objek"
            : String(hasil);
    console.log(`  OK   ${nama.padEnd(42)} ${ukuran}`);
  } catch (e) {
    await D.run(`ROLLBACK TO SAVEPOINT ${titik}`);
    await D.run(`RELEASE SAVEPOINT ${titik}`);
    gagal++;
    const kode = e?.code ? `[${e.code}] ` : "";
    console.log(`  GAGAL ${nama.padEnd(42)} ${kode}${e?.message ?? e}`);
  }
}

const PENANDA = "__cek_dialek__";
const cap = Date.now();

try {
  await D.tx(async () => {
    /* ==================================================================
       DATA UJI — sekecil mungkin, tetapi memuat SETIAP bentuk yang dibaca
       halaman: dua peserta, paket berjendela, jawaban benar dan salah,
       hasil final, pelanggaran, sesi Warung berulang, dan pengerjaan IELTS.
       ================================================================== */

    const paketId = await D.sisipWajib(
      `INSERT INTO packages (kode, nama, status, jalur, mulai_at, selesai_at, siklus)
       VALUES (?, 'Paket uji dialek', 'published', 'utbk',
               now() - interval '1 hour', now() + interval '3 hours', ?)`,
      `${PENANDA}-${cap}`,
      "2026-W37",
    );

    const userId = await D.sisipWajib(
      `INSERT INTO users (nama, email, password_hash, role, kelas, nisn)
       VALUES ('Peserta Dialek', ?, 'x', 'siswa', 'XII Harvard', ?)`,
      `${PENANDA}-a-${cap}@contoh.invalid`,
      `${cap}`.slice(-10),
    );
    const userId2 = await D.sisipWajib(
      `INSERT INTO users (nama, email, password_hash, role, kelas)
       VALUES ('Peserta Dialek Dua', ?, 'x', 'siswa', 'XII HARVARD')`,
      `${PENANDA}-b-${cap}@contoh.invalid`,
    );

    await D.run("INSERT INTO paket_kelas (package_id, kelas) VALUES (?, 'XII Harvard')", paketId);
    await D.run("INSERT INTO paket_peserta (package_id, user_id) VALUES (?, ?)", paketId, userId2);

    const idSoal = [];
    for (let n = 1; n <= 4; n++) {
      idSoal.push(
        await D.sisipWajib(
          `INSERT INTO questions (package_id, subtes, nomor, tipe, level, pertanyaan, opsi, kunci)
           VALUES (?, 'PU', ?, 'PG', 'C3', ?, '["a","b","c","d","e"]', 'A')`,
          paketId,
          n,
          `Soal dialek ${n}`,
        ),
      );
    }

    // Peserta 1: sudah selesai, punya hasil. Peserta 2: masih mengerjakan.
    const attemptSelesai = await D.sisipWajib(
      `INSERT INTO attempts (user_id, package_id, status, started_at, finished_at, total_skor, subtes_aktif, denyut_at, denyut_aktif)
       VALUES (?, ?, 'finished', now() - interval '2 hours', now() - interval '1 hour', 612.5, 'PU', now() - interval '1 hour', 0)`,
      userId,
      paketId,
    );
    const attemptJalan = await D.sisipWajib(
      `INSERT INTO attempts (user_id, package_id, status, started_at, subtes_aktif, denyut_at, denyut_aktif)
       VALUES (?, ?, 'ongoing', now() - interval '10 minutes', 'PU', now() - interval '8 seconds', 1)`,
      userId2,
      paketId,
    );

    for (const [att, tutup] of [
      [attemptSelesai, true],
      [attemptJalan, false],
    ]) {
      await D.run(
        `INSERT INTO attempt_subtes (attempt_id, subtes, mulai_at, deadline_at, selesai_at)
         VALUES (?, 'PU', now() - interval '30 minutes', now() + interval '30 minutes', ?)`,
        att,
        tutup ? new Date().toISOString() : null,
      );
      for (let i = 0; i < idSoal.length; i++) {
        await D.run(
          `INSERT INTO answers (attempt_id, question_id, jawaban, ragu) VALUES (?, ?, ?, ?)`,
          att,
          idSoal[i],
          i % 2 === 0 ? "A" : "B",
          i === 3 ? 1 : 0,
        );
      }
    }

    await D.run(
      `INSERT INTO results (attempt_id, subtes, benar, salah, kosong, skor)
       VALUES (?, 'PU', 2, 2, 0, 612.5)`,
      attemptSelesai,
    );
    await D.run(
      `INSERT INTO item_params (question_id, b, p_benar, n_peserta) VALUES (?, 0.1, 0.5, 2)`,
      idSoal[0],
    );
    await D.run(
      `INSERT INTO violations (attempt_id, user_id, package_id, jenis, subtes, urutan, durasi_detik, kejadian)
       VALUES (?, ?, ?, 'keluar_tab', 'PU', 1, 12, ?)`,
      attemptJalan,
      userId2,
      paketId,
      `${PENANDA}-vio-${cap}`,
    );
    await D.run(
      `INSERT INTO susulan (user_id, package_id, diberikan_oleh, catatan)
       VALUES (?, ?, NULL, 'uji dialek')`,
      userId,
      paketId,
    );

    // Pilihan prodi, untuk rekap jurusan.
    const adaProdi = await D.one("SELECT id FROM prodi LIMIT 1");
    if (adaProdi) {
      await D.run(
        `INSERT INTO pilihan_prodi (user_id, package_id, urutan, prodi_id, prodi_nama, ptn)
         VALUES (?, ?, 1, ?, 'Uji Prodi', 'Uji PTN')`,
        userId,
        paketId,
        adaProdi.id,
      );
    }

    /* ---------------- Warung ---------------- */

    const wPaket = await D.sisipWajib(
      `INSERT INTO warung_paket (subtes, nomor, judul) VALUES ('PU', ?, 'Paket Warung uji')`,
      900 + (cap % 90),
    );
    const wSoal = [];
    for (let n = 1; n <= 3; n++) {
      wSoal.push(
        await D.sisipWajib(
          `INSERT INTO warung_soal (paket_id, nomor, tipe, pertanyaan, opsi, kunci)
           VALUES (?, ?, 'PG', ?, '["a","b","c","d"]', 'A')`,
          wPaket,
          n,
          `Soal warung ${n}`,
        ),
      );
    }
    // DUA sesi selesai untuk paket yang sama — inilah yang dulu memecahkan
    // papan peringkat: MAX(poin) dengan kolom polos di sampingnya.
    for (const [poin, benar, durasi] of [
      [20, 2, 300],
      [30, 3, 250],
    ]) {
      const sesi = await D.sisipWajib(
        `INSERT INTO warung_sesi (user_id, paket_id, status, poin, benar, durasi_detik, mulai_at, deadline_at, selesai_at)
         VALUES (?, ?, 'finished', ?, ?, ?, now() - interval '1 hour', now() - interval '20 minutes', now() - interval '30 minutes')`,
        userId,
        wPaket,
        poin,
        benar,
        durasi,
      );
      await D.run(
        `INSERT INTO warung_jawaban (sesi_id, soal_id, jawaban, benar) VALUES (?, ?, 'A', 1)`,
        sesi,
        wSoal[0],
      );
    }

    /* ---------------- IELTS ---------------- */

    const iPaket = await D.sisipWajib(
      `INSERT INTO ielts_paket (kode, nama, status) VALUES (?, 'Paket IELTS uji', 'published')`,
      `${PENANDA}-i-${cap}`,
    );
    const iSeksi = await D.sisipWajib(
      `INSERT INTO ielts_seksi (paket_id, subtes, nomor, judul) VALUES (?, 'listening', 1, 'Section 1')`,
      iPaket,
    );
    const iSoal = await D.sisipWajib(
      `INSERT INTO ielts_soal (paket_id, seksi_id, subtes, nomor, tipe, pertanyaan, kunci)
       VALUES (?, ?, 'listening', 1, 'IS', 'Soal IELTS uji', 'jawab')`,
      iPaket,
      iSeksi,
    );
    const iKerja = await D.sisipWajib(
      `INSERT INTO ielts_pengerjaan (user_id, paket_id, status, subtes_aktif, denyut_at, denyut_aktif)
       VALUES (?, ?, 'ongoing', 'listening', now() - interval '6 seconds', 1)`,
      userId,
      iPaket,
    );
    await D.run(
      `INSERT INTO ielts_jawaban (pengerjaan_id, soal_id, jawaban) VALUES (?, ?, 'jawab')`,
      iKerja,
      iSoal,
    );
    await D.run(
      `INSERT INTO ielts_subtes (pengerjaan_id, subtes, mulai_at, deadline_at)
       VALUES (?, 'listening', now(), now() + interval '30 minutes')`,
      iKerja,
    );
    await D.run(
      `INSERT INTO ielts_pelanggaran (pengerjaan_id, user_id, paket_id, jenis, subtes, urutan, durasi_detik, kejadian)
       VALUES (?, ?, ?, 'keluar_tab', 'listening', 1, 9, ?)`,
      iKerja,
      userId,
      iPaket,
      `${PENANDA}-ivio-${cap}`,
    );

    /* ==================================================================
       PEMANGGILAN
       ================================================================== */

    console.log("\n1) Panel pengelola (admin.ts)");
    await jalan("statistikDasbor()", () => admin.statistikDasbor());
    await jalan("pengerjaanTerbaru()", () => admin.pengerjaanTerbaru(5));
    await jalan("daftarPaket()", () => admin.daftarPaket());
    await jalan("ambilPaketRingkas(id)", () => admin.ambilPaketRingkas(paketId));
    await jalan("ringkasanSubtes(id)", () => admin.ringkasanSubtes(paketId));
    await jalan("daftarSoal(id)", () => admin.daftarSoal(paketId));
    await jalan("daftarPeserta('')", () => admin.daftarPeserta(""));
    await jalan("daftarPeserta('Dialek')", () => admin.daftarPeserta("Dialek"));
    await jalan("ambilPeserta(id)", () => admin.ambilPeserta(userId));
    await jalan("pengerjaanPeserta(id)", () => admin.pengerjaanPeserta(userId));
    await jalan("daftarKelas(paketId)", () => admin.daftarKelas(paketId));
    await jalan("pesertaPaket(paketId)", () => admin.pesertaPaket(paketId));
    await jalan("pesertaDiizinkanPaket(paketId)", () => admin.pesertaDiizinkanPaket(paketId));
    await jalan("pesertaGugur(paketId)", () => admin.pesertaGugur(paketId));
    await jalan("ujianTerbengkalai()", () => admin.ujianTerbengkalai());
    await jalan("ujianJeda()", () => admin.ujianJeda());
    await jalan("izinSusulanPeserta(id)", () => admin.izinSusulanPeserta(userId));
    await jalan("paketTerbit()", () => admin.paketTerbit());
    await jalan("jejakRiwayatPaket(paketId)", () => admin.jejakRiwayatPaket(paketId));
    await jalan("jejakPeserta(id)", () => admin.jejakPeserta(userId));
    await jalan("jumlahAdmin()", () => admin.jumlahAdmin());

    console.log("\n2) Ruang ujian & dasbor siswa (exam.ts)");
    await jalan("daftarPaketSiswa(userId)", () => exam.daftarPaketSiswa(userId));
    await jalan("statistikSiswa(userId)", () => exam.statistikSiswa(userId));
    await jalan("getPaket(paketId)", () => exam.getPaket(paketId));
    await jalan("jalurPaket(paketId)", () => exam.jalurPaket(paketId));
    await jalan("paketDibatasi(paketId)", () => exam.paketDibatasi(paketId));
    await jalan("pesertaDiizinkan(u, p)", () => exam.pesertaDiizinkan(userId, paketId));
    await jalan("izinSusulan(u, p)", () => exam.izinSusulan(userId, paketId));
    await jalan("attemptSiswa(u, p)", () => exam.attemptSiswa(userId, paketId));
    await jalan("getAttempt(id)", () => exam.getAttempt(attemptJalan));
    await jalan("urutanSubtesPaket(paketId)", () => exam.urutanSubtesPaket(paketId));
    await jalan("barisSubtes(att,'PU')", () => exam.barisSubtes(attemptJalan, "PU"));
    await jalan("sisaDetik(att,'PU')", () => exam.sisaDetik(attemptJalan, "PU"));
    await jalan("keadaanUjian(att)", () => exam.keadaanUjian(attemptJalan, { mulaiOtomatis: false }));
    await jalan("jumlahSoalPaket(paketId)", () => exam.jumlahSoalPaket(paketId));
    await jalan("rincianSubtesPaket(p, att)", () => exam.rincianSubtesPaket(paketId, attemptJalan));
    await jalan("soalSubtes(att, p, 'PU')", () => exam.soalSubtes(attemptJalan, paketId, "PU"));
    await jalan("soalPratinjau(p, 'PU')", () => exam.soalPratinjau(paketId, "PU"));
    await jalan("jumlahKosong(att, p, 'PU')", () => exam.jumlahKosong(attemptJalan, paketId, "PU"));

    console.log("\n3) Penilaian (irt.ts)");
    await jalan("paramButirPaket(paketId)", () => irt.paramButirPaket(paketId));
    await jalan("ambilHasil(attempt)", () => irt.ambilHasil(attemptSelesai));
    await jalan("peringkatPeserta(paketId)", () => irt.peringkatPeserta(paketId));
    await jalan("statistikPaket(paketId)", () => irt.statistikPaket(paketId));
    await jalan("posisiPeserta(p, att)", () => irt.posisiPeserta(paketId, attemptSelesai));
    await jalan("detailJawaban(attempt)", () => irt.detailJawaban(attemptSelesai));

    console.log("\n4) Papan Live & rekap");
    await jalan("papanLive(paketId)", () => live.papanLive(paketId));
    await jalan("rekapTahunSiswa(userId)", () => rekap.rekapTahunSiswa(userId));
    await jalan("papanPekanIni('utbk')", () => rekap.papanPekanIni("utbk"));
    await jalan("statusPortal('utbk')", () => portal.statusPortal("utbk"));
    await jalan("semuaStatusPortal()", () => portal.semuaStatusPortal());
    await jalan("siklusBerjalan()", () => siklus.siklusBerjalan?.() ?? null);

    console.log("\n5) Penjagaan ujian (pelanggaran.ts)");
    await jalan("jumlahPelanggaran(att)", () => pelanggaran.jumlahPelanggaran(attemptJalan));
    await jalan("jumlahKepergian(att)", () => pelanggaran.jumlahKepergian(attemptJalan));
    await jalan("totalDetikKepergian(att)", () => pelanggaran.totalDetikKepergian(attemptJalan));
    await jalan("jumlahKeluarLayarPenuh(att)", () => pelanggaran.jumlahKeluarLayarPenuh(attemptJalan));
    await jalan("pelanggaranAttempt(att)", () => pelanggaran.pelanggaranAttempt(attemptJalan));
    await jalan("rekapPelanggaran(paketId)", () => pelanggaran.rekapPelanggaran(paketId));
    await jalan("rincianPelanggaran(att)", () => pelanggaran.rincianPelanggaran(attemptJalan));
    await jalan("totalPelanggaranPaket(paketId)", () => pelanggaran.totalPelanggaranPaket(paketId));
    await jalan("catatDenyut(att, true)", () => pelanggaran.catatDenyut(attemptJalan, true));

    console.log("\n6) Warung — papan peringkat (bekas galat 42803)");
    await jalan("daftarPaket('PU')", () => warung.daftarPaket("PU"));
    await jalan("daftarPaketSiswa('PU', u)", () => warung.daftarPaketSiswa("PU", userId));
    await jalan("papanSubtes('PU')", () => warung.papanSubtes("PU"));
    await jalan("papanPaket(wPaket)", () => warung.papanPaket(wPaket));
    await jalan("totalPoinSiswa(userId)", () => warung.totalPoinSiswa(userId));
    await jalan("riwayatSaya(userId)", () => warung.riwayatSaya(userId));
    await jalan("ringkasanLobi(userId)", () => warung.ringkasanLobi(userId));
    await jalan("nomorTuntas(u,'PU')", () => warung.nomorTuntas(userId, "PU"));
    await jalan("komposisiTerisi(wPaket)", () => warung.komposisiTerisi(wPaket));

    console.log("\n7) IELTS");
    await jalan("ringkasPaket(iPaket)", () => ielts.ringkasPaket(iPaket));
    await jalan("ambilPengerjaan(iKerja)", () => ielts.ambilPengerjaan?.(iKerja));
    await jalan("catatDenyutIelts(iKerja)", () => ieltsJaga.catatDenyutIelts(iKerja, true));
    await jalan("jumlahPelanggaranIelts", () => ieltsJaga.jumlahPelanggaranIelts?.(iKerja));
    await jalan("totalDetikKepergianIelts", () => ieltsJaga.totalDetikKepergianIelts(iKerja));
    await jalan("papanKeamananIelts(iPaket)", () => ieltsJaga.papanKeamanan?.(iPaket));

    console.log("\n8) Data rujukan");
    await jalan("cariProdi('pendidikan')", () => prodi.cariProdi?.("pendidikan", 10));
    await jalan("jumlahProdiPerJenjang()", () => prodi.jumlahPerJenjang?.());

    throw new Error(PENANDA);
  });
} catch (e) {
  if (!(e instanceof Error) || e.message !== PENANDA) throw e;
}

console.log("\n9) Tidak ada sisa data uji");
{
  const sisa = await D.one("SELECT COUNT(*) AS n FROM packages WHERE kode LIKE ?", `${PENANDA}%`);
  if (sisa.n === 0) {
    lulus++;
    console.log("  OK   seluruh tulisan uji dibatalkan");
  } else {
    gagal++;
    console.log(`  GAGAL tersisa ${sisa.n} paket uji`);
  }
}

console.log(
  gagal === 0
    ? `\nSEMUA LULUS — ${lulus} pemanggilan diterima PostgreSQL.`
    : `\n${gagal} GAGAL dari ${gagal + lulus} pemanggilan.`,
);
await D.pool.end();
process.exit(gagal === 0 ? 0 : 1);
