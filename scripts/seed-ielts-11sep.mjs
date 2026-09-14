/**
 * Menyusun paket IELTS TryOut 11 September 2026 ke dalam basis data.
 *
 *     npm run seed:ielts11            # meninjau, tidak menulis apa pun
 *     npm run seed:ielts11 -- --tulis # menyimpan
 *
 * AMAN DIULANG: `--tulis` menghapus paket berkode sama lebih dulu, lalu
 * menyusunnya kembali dari nol. Yang dihapus hanya paket berkode
 * `IELTS-11SEP2026`; paket lain tidak disentuh.
 *
 * Bahannya seluruhnya dari `scripts/soal-ielts-11sep2026.mjs`, yang pada
 * gilirannya membaca naskah .docx pengelola. Baca catatan panjang di sana
 * sebelum mengubah apa pun di berkas ini.
 *
 * TIGA HAL YANG DIPERIKSA SEBELUM MENYIMPAN, dan ketiganya menghentikan skrip
 * bila gagal — paket yang isinya salah jauh lebih mahal daripada paket yang
 * gagal dibuat:
 *
 *   1. Setiap potongan naskah yang diambil harus memuat kata yang diharapkan
 *      (lihat `ambil()`), sehingga naskah yang berubah susunan tidak pernah
 *      lolos diam-diam.
 *   2. Kunci untuk 80 nomor harus lengkap, dibaca dari tabel kunci di naskah
 *      itu sendiri — tidak ada yang diketik ulang di kode.
 *   3. Rekaman harus ada, terbaca sebagai MP3, dan berada di bawah batas
 *      ukuran; urutannya ditentukan tag ID3, bukan nama berkas.
 *
 * BEDANYA DENGAN VERSI SQLite (repo `adzkia-smart`): seluruh pemanggilan basis
 * data di sini `await`, dan modulnya duduk di `src/lib/<domain>/`. Isi paketnya
 * sendiri tidak berubah sehuruf pun — definisinya berkas yang sama.
 *
 * REKAMAN DICARI DI DUA TEMPAT, berurutan:
 *
 *   1. `data/ielts-audio/ielts-11sep2026/` — salinan yang sudah ada di proyek
 *      ini, dipilih menurut tag ID3-nya sendiri.
 *   2. `FOLDER_REKAMAN` (Downloads) dengan nama berkas WhatsApp aslinya.
 *
 * Yang pertama membuat skrip ini bisa dijalankan di komputer mana pun, bukan
 * hanya di komputer yang kebetulan masih menyimpan unduhan WhatsApp bulan lalu.
 * Keduanya menghasilkan berkas dengan nama yang sama persis di server, sebab
 * nama itu sidik jari isinya.
 */

import "./muat-ts.mjs";

import fs from "node:fs";
import path from "node:path";

import {
  BLOK_KUNCI_LISTENING,
  BLOK_KUNCI_READING,
  EJAAN_SETARA,
  FOLDER_REKAMAN,
  LISTENING,
  PAKET,
  PASANGAN_HURUF,
  READING,
  REKAMAN,
  ambil,
  bacaNaskah,
  bacaTabelKunci,
  bentukKunci,
  kunciPasangan,
} from "./soal-ielts-11sep2026.mjs";

const TULIS = process.argv.includes("--tulis");

const PAKSA = process.argv.includes("--paksa");

const { one } = await import("../src/lib/core/db.ts");
const { bacaDocx } = await import("../src/lib/naskah/docx.ts");
const { simpanAudio } = await import("../src/lib/ielts/ielts-audio.ts");
const {
  buatPaket,
  hapusPaket,
  pasangAudio,
  pastikanSeksi,
  semuaPaket,
  setStatusPaket,
  simpanSeksi,
  simpanSoal,
  ubahPaket,
} = await import("../src/lib/ielts/ielts.ts");

/* ------------------------------------------------------------------ */
/* 1. Membaca naskah                                                    */
/* ------------------------------------------------------------------ */

console.log("\n=== 1/5  Membaca naskah pengelola ===");
const { blok } = await bacaDocx(bacaNaskah());
console.log(`    ${blok.length} blok terbaca.`);

const kunciListening = bacaTabelKunci(blok[BLOK_KUNCI_LISTENING]);
const kunciReading = bacaTabelKunci(blok[BLOK_KUNCI_READING]);
const KUNCI = new Map([...kunciListening, ...kunciReading]);
console.log(`    Kunci terbaca: ${kunciListening.size} Listening + ${kunciReading.size} Reading.`);

for (let n = 1; n <= 80; n++) {
  if (!KUNCI.has(n)) throw new Error(`Kunci nomor ${n} tidak ada di tabel kunci naskah.`);
}

// Pasangan huruf diurutkan abjad, dan kedua nomornya ditimpa dengan hasilnya.
for (const [a, b] of PASANGAN_HURUF) {
  const [pertama, kedua] = kunciPasangan(KUNCI.get(a), KUNCI.get(b));
  KUNCI.set(a, pertama);
  KUNCI.set(b, kedua);
  console.log(`    Pasangan ${a}/${b} diurutkan abjad -> ${pertama}, ${kedua}`);
}

/* ------------------------------------------------------------------ */
/* 2. Rekaman                                                           */
/* ------------------------------------------------------------------ */

console.log("\n=== 2/5  Memeriksa rekaman ===");

/** Nomor track dari tag ID3v2, atau 0 bila berkasnya tidak bertag. */
function nomorTrack(isi) {
  if (isi.toString("latin1", 0, 3) !== "ID3") return 0;
  const besar =
    ((isi[6] & 0x7f) << 21) | ((isi[7] & 0x7f) << 14) | ((isi[8] & 0x7f) << 7) | (isi[9] & 0x7f);
  let p = 10;
  while (p + 10 <= Math.min(besar + 10, isi.length)) {
    const id = isi.toString("latin1", p, p + 4);
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const panjang = isi.readUInt32BE(p + 4);
    if (id === "TRCK") {
      const teks = isi.toString("latin1", p + 11, p + 10 + panjang).replace(/\0/g, "");
      return Number.parseInt(teks, 10) || 0;
    }
    p += 10 + panjang;
  }
  return 0;
}

/** Isi rekaman untuk satu bagian, dicari di salinan proyek lalu di Downloads. */
function cariRekaman(r) {
  const folder = path.join(process.cwd(), "data", "ielts-audio", "ielts-11sep2026");
  if (fs.existsSync(folder)) {
    for (const nama of fs.readdirSync(folder)) {
      const isi = fs.readFileSync(path.join(folder, nama));
      if (nomorTrack(isi) === r.track) return { isi, dari: `data/ielts-audio/…/${nama}` };
    }
  }
  const unduhan = path.join(FOLDER_REKAMAN, r.berkas);
  if (fs.existsSync(unduhan)) return { isi: fs.readFileSync(unduhan), dari: unduhan };
  throw new Error(
    `Rekaman Section ${r.seksi} (track ${r.track}) tidak ditemukan — ` +
      `tidak ada di ${folder} maupun di ${unduhan}.`,
  );
}

const rekamanSiap = [];
for (const r of REKAMAN) {
  const { isi, dari } = cariRekaman(r);
  const mp3 = isi[0] === 0x49 && isi[1] === 0x44 && isi[2] === 0x33; // "ID3"
  if (!mp3) throw new Error(`Bukan MP3 ber-tag ID3: ${dari}`);
  const track = nomorTrack(isi);
  if (track !== r.track) {
    throw new Error(`Section ${r.seksi} menuntut track ${r.track}, tetapi ${dari} track ${track}.`);
  }
  rekamanSiap.push({ ...r, isi });
  console.log(
    `    Section ${r.seksi}  <-  Track ${r.track}  ${(isi.length / 1e6).toFixed(2)} MB  ${r.durasi}  ${dari}`,
  );
}

/* ------------------------------------------------------------------ */
/* 3. Menyusun bacaan Reading dari naskah                               */
/* ------------------------------------------------------------------ */

console.log("\n=== 3/5  Menyusun bacaan Reading ===");
const HURUF = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

for (const p of READING) {
  const bagian = [];
  if (p.subjudul) bagian.push(ambil(blok, p.subjudul[0], p.subjudul[1]));
  p.paragraf.forEach(([idx, wajib], i) => {
    const teks = ambil(blok, idx, wajib);
    const awalan = p.label === "huruf" ? `${HURUF[i]}\n` : p.label === "angka" ? `${i + 1}\n` : "";
    bagian.push(awalan + teks);
  });
  p.teksBacaan = bagian.join("\n\n");
  console.log(
    `    ${p.judul}: ${p.paragraf.length} paragraf, ${p.teksBacaan.length} huruf` +
      (p.label ? ` (bertanda ${p.label})` : ""),
  );
}

/* ------------------------------------------------------------------ */
/* 4. Ringkasan sebelum menulis                                         */
/* ------------------------------------------------------------------ */

console.log("\n=== 4/5  Ringkasan paket ===");

/**
 * Menambahkan EJAAN SETARA ke daftar kunci sebuah nomor.
 *
 * Penilaian isian singkat mencocokkan PERSIS sesudah huruf dikecilkan dan spasi
 * dirapikan, jadi "09536788545" tidak sama dengan "09536 788 545" di mata
 * mesin — padahal keduanya nomor telepon yang sama. Daftarnya di
 * `EJAAN_SETARA`, dan sengaja hanya memuat bentuk lain dari jawaban yang sama.
 */
function lengkapiEjaan(nomor, kunci) {
  const tambahan = EJAAN_SETARA[nomor];
  if (!tambahan) return kunci;
  const semua = [...kunci.split("|"), ...tambahan.map((t) => t.trim().toLowerCase())];
  return [...new Set(semua.filter(Boolean))].join("|");
}

const rencana = [];

for (const s of LISTENING) {
  for (const [nomor, pertanyaan, opsi] of s.soal) {
    rencana.push({
      subtes: "LISTENING",
      seksi: s.nomor,
      nomor,
      tipe: opsi ? "PG" : "IS",
      pertanyaan,
      opsi: opsi ?? [],
      kunci: opsi
        ? String(KUNCI.get(nomor)).trim().toUpperCase()
        : lengkapiEjaan(nomor, bentukKunci(KUNCI.get(nomor))),
    });
  }
}

for (const p of READING) {
  for (const [nomor, tipe, pertanyaan, opsi] of p.soal) {
    let kunci;
    if (tipe === "PG") kunci = String(KUNCI.get(nomor)).trim().toUpperCase();
    else if (tipe === "TFNG") kunci = String(KUNCI.get(nomor)).trim().toUpperCase();
    else kunci = lengkapiEjaan(nomor, bentukKunci(KUNCI.get(nomor)));
    rencana.push({
      subtes: "READING",
      seksi: p.nomor,
      nomor,
      tipe,
      pertanyaan,
      opsi: opsi ?? [],
      kunci,
    });
  }
}

// Soal YES/NO/NOT GIVEN dibuat PG, jadi kuncinya huruf pilihan — bukan kata.
const PETA_YNNG = { YES: "A", NO: "B", "NOT GIVEN": "C" };
for (const r of rencana) {
  if (r.tipe === "PG" && r.opsi[0] === "YES") {
    const kata = r.kunci.replace(/\s+/g, " ").trim();
    if (!(kata in PETA_YNNG)) {
      throw new Error(`Nomor ${r.nomor}: kunci "${kata}" bukan YES/NO/NOT GIVEN.`);
    }
    r.kunci = PETA_YNNG[kata];
  }
}

const cacat = [];
for (const r of rencana) {
  if (!r.kunci) cacat.push(`${r.nomor}: kunci kosong`);
  if (r.tipe === "PG" && r.opsi.length < 2) cacat.push(`${r.nomor}: PG kurang pilihan`);
  if (r.tipe === "PG" && !/^[A-D]$/.test(r.kunci)) {
    cacat.push(`${r.nomor}: kunci PG "${r.kunci}" bukan A-D`);
  }
  if (r.tipe === "TFNG" && !["TRUE", "FALSE", "NOT GIVEN"].includes(r.kunci)) {
    cacat.push(`${r.nomor}: kunci TFNG "${r.kunci}" tidak sah`);
  }
}
if (cacat.length) {
  console.error("\n  TEMUAN:\n   - " + cacat.join("\n   - "));
  process.exit(1);
}

const perSubtes = {};
for (const r of rencana) perSubtes[r.subtes] = (perSubtes[r.subtes] ?? 0) + 1;
console.log(`    LISTENING ${perSubtes.LISTENING} butir · READING ${perSubtes.READING} butir`);

const perTipe = {};
for (const r of rencana) perTipe[r.tipe] = (perTipe[r.tipe] ?? 0) + 1;
console.log(
  "    Bentuk soal: " +
    Object.entries(perTipe)
      .map(([t, n]) => `${t} ${n}`)
      .join(" · "),
);

console.log("\n    Kunci yang dipakai:");
for (const sub of ["LISTENING", "READING"]) {
  const baris = rencana
    .filter((r) => r.subtes === sub)
    .map((r) => `${r.nomor}=${r.kunci}`)
    .join("  ");
  console.log(`      ${sub}: ${baris}`);
}

// Keadaan basis data tujuan, supaya akibat `--tulis` terbaca SEBELUM dijalankan
// — bukan sesudahnya.
const adaSebelumnya = (await semuaPaket()).find((p) => p.kode === PAKET.kode);
if (!adaSebelumnya) {
  console.log(`\n    Basis data ini belum punya ${PAKET.kode} — paketnya akan dibuat baru.`);
} else {
  const n = Number(
    (await one("SELECT COUNT(*) AS n FROM ielts_pengerjaan WHERE paket_id = ?", adaSebelumnya.id))
      ?.n ?? 0,
  );
  console.log(
    `\n    Basis data ini SUDAH punya ${PAKET.kode} (id ${adaSebelumnya.id}, ` +
      `status ${adaSebelumnya.status}, ${n} pengerjaan peserta).` +
      (n > 0
        ? `\n    --tulis akan menolak menghapusnya selama pengerjaan itu masih ada.`
        : `\n    --tulis akan menghapus dan menyusunnya ulang.`),
  );
}

if (!TULIS) {
  console.log("\n=== 5/5  MENINJAU SAJA — tambahkan --tulis untuk menyimpan ===\n");
  process.exit(0);
}

/* ------------------------------------------------------------------ */
/* 5. Menulis                                                           */
/* ------------------------------------------------------------------ */

console.log("\n=== 5/5  Menyimpan ===");

const lama = (await semuaPaket()).find((p) => p.kode === PAKET.kode);
if (lama) {
  // MENGHAPUS PAKET IKUT MENGHAPUS PENGERJAAN PESERTANYA — `ielts_pengerjaan`
  // bergantung pada `ielts_paket` dengan ON DELETE CASCADE, jadi jawaban,
  // band, dan catatan pelanggaran sebuah sesi ujian ikut lenyap tanpa pernah
  // disebut di layar. Di basis data kosong itu tidak terasa; di server yang
  // sudah pernah dipakai ujian, itu kehilangan yang tidak bisa dibatalkan.
  //
  // Karena itu skrip BERHENTI bila paket lamanya sudah punya pengerjaan, dan
  // hanya `--paksa` yang boleh melewatinya — supaya kalimat "aman diulang" di
  // atas tidak pernah berlaku diam-diam untuk data yang tidak bisa dibuat lagi.
  const n = Number((await one("SELECT COUNT(*) AS n FROM ielts_pengerjaan WHERE paket_id = ?", lama.id))?.n ?? 0);
  if (n > 0 && !PAKSA) {
    console.error(
      `\n  BERHENTI: paket ${PAKET.kode} (id ${lama.id}) sudah punya ${n} pengerjaan peserta.\n` +
        `  Menyusunnya ulang akan menghapus jawaban dan band mereka sekaligus.\n\n` +
        `  Kalau paket ini memang harus dibangun ulang, cadangkan dulu basis datanya,\n` +
        `  lalu ulangi dengan --paksa.\n`,
    );
    process.exit(1);
  }
  await hapusPaket(lama.id);
  console.log(
    `    Paket lama berkode ${PAKET.kode} dihapus (id ${lama.id})` +
      (n > 0 ? ` berikut ${n} pengerjaan pesertanya (--paksa).` : "."),
  );
}

const paketId = await buatPaket(PAKET);
// Jendela waktunya dipatok ke hari-H: paket ini TIDAK boleh terlihat hari ini.
await ubahPaket(paketId, {
  nama: PAKET.nama,
  deskripsi: PAKET.deskripsi,
  mulai_at: "2026-09-11 00:00",
  selesai_at: "2026-09-11 23:59",
});
console.log(`    Paket dibuat (id ${paketId}), jendela 11 September 2026 00:00-23:59.`);

const seksiL = await pastikanSeksi(paketId, "LISTENING");
const seksiR = await pastikanSeksi(paketId, "READING");

for (const s of LISTENING) {
  const baris = seksiL.find((x) => x.nomor === s.nomor);
  await simpanSeksi(baris.id, { judul: s.judul, instruksi: s.instruksi });
}
for (const p of READING) {
  const baris = seksiR.find((x) => x.nomor === p.nomor);
  await simpanSeksi(baris.id, { judul: p.judul, instruksi: p.instruksi, bacaan: p.teksBacaan });
}
console.log(`    ${seksiL.length} bagian Listening + ${seksiR.length} bagian Reading disimpan.`);

for (const r of rekamanSiap) {
  const baris = seksiL.find((x) => x.nomor === r.seksi);
  const hasil = await simpanAudio(r.isi, PAKET.kode);
  await pasangAudio(baris.id, hasil.url, `Section ${r.seksi} (track ${r.track})`);
  console.log(`    Rekaman Section ${r.seksi} -> ${hasil.url}`);
}

let jumlah = 0;
for (const r of rencana) {
  const daftar = r.subtes === "LISTENING" ? seksiL : seksiR;
  const baris = daftar.find((x) => x.nomor === r.seksi);
  await simpanSoal(paketId, r.subtes, {
    seksiId: baris.id,
    nomor: r.nomor,
    tipe: r.tipe,
    pertanyaan: r.pertanyaan,
    opsi: r.opsi,
    kunci: r.kunci,
  });
  jumlah++;
}
console.log(`    ${jumlah} butir disimpan.`);

await setStatusPaket(paketId, "published");
console.log("    Status: PUBLISHED (baru terlihat siswa pada 11 September 2026).");

console.log("\nSelesai.\n");
process.exit(0);
