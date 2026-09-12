/**
 * Membuat REKAMAN LISTENING dari transkrip yang sudah tersimpan di paket.
 *
 * Satu rekaman per Recording — empat rekaman untuk empat puluh butir, persis
 * seperti IELTS asli. Suaranya dibangkitkan mesin pengucap bawaan Windows
 * (SAPI) lewat `tts-ssml.ps1`, jadi tidak ada layanan luar, tidak ada kunci
 * API, dan tidak ada satu byte pun naskah soal yang meninggalkan komputer ini.
 *
 * Sumbernya adalah kolom `transkrip` di basis data, BUKAN berkas naskah:
 * dengan begitu rekaman selalu mengikuti transkrip yang benar-benar dipakai
 * paket itu, termasuk kalau pengelola menyuntingnya dari panel admin.
 *
 * Berkas jadinya disimpan lewat `simpanAudio()` — fungsi yang sama persis
 * dengan yang dipakai tombol unggah admin — lalu dipasang ke bagiannya dengan
 * `pasangAudio()`. Tidak ada jalan pintas: hasilnya tak bisa dibedakan dari
 * rekaman yang diunggah tangan.
 *
 * SIAPA BERSUARA APA. Baris pertama transkrip boleh menyebutkannya:
 *
 *     VOICES: TUTOR=male, PRIYA=female, MARCUS=male
 *     VOICES: narrator=female
 *
 * Baris itu tidak ikut dibacakan. Tanpa baris itu, label WOMAN/MAN dikenali
 * sendiri, dan pembicara lain dibagi bergantian menurut urutan munculnya.
 * Pembicara ketiga yang kebagian suara yang sama diberi nada sedikit lebih
 * rendah supaya tetap bisa dibedakan telinga.
 *
 * Jalankan:  npm run rekaman:ielts
 *            npm run rekaman:ielts -- --kode IELTS-DEMO-2
 *            npm run rekaman:ielts -- --nomor 3      (hanya Recording 3)
 *            npm run rekaman:ielts -- --timpa        (ganti rekaman yang sudah ada)
 *
 * Aman diulang: bagian yang rekamannya sudah terpasang dilewati, kecuali
 * diminta `--timpa`.
 */
import "./muat-ts.mjs";

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const AKAR = process.cwd();
const muat = (berkas) => import(pathToFileURL(path.join(AKAR, "src", "lib", berkas)).href);

const { all } = await muat("db.ts");
const I = await muat("ielts.ts");
const A = await muat("ielts-audio.ts");

/* ---------------- Pilihan baris perintah ---------------- */

const arg = (nama, bawaan) => {
  const i = process.argv.indexOf(`--${nama}`);
  return i === -1 ? bawaan : (process.argv[i + 1] ?? bawaan);
};
const KODE = arg("kode", "IELTS-DEMO-1");
const NOMOR = arg("nomor", null);
const TIMPA = process.argv.includes("--timpa");

/* ==========================================================================
   SUARA
   ========================================================================== */

const SUARA = {
  female: "Microsoft Zira Desktop",
  male: "Microsoft David Desktop",
};

/** Label yang jenis suaranya sudah jelas dari namanya sendiri. */
const LABEL_PEREMPUAN = /^(?:woman|female|girl|lady|wanita|perempuan|w)$/i;
const LABEL_LAKI = /^(?:man|male|boy|pria|laki-laki|m)$/i;

/**
 * Membaca baris "VOICES: TUTOR=male, PRIYA=female" menjadi peta.
 *
 * Nama pembicaranya dibakukan huruf besar supaya "Priya", "PRIYA", dan
 * "priya" menunjuk orang yang sama — guru menulis naskahnya dengan tangan.
 */
function bacaPetaSuara(baris) {
  const peta = new Map();
  for (const bagian of baris.split(",")) {
    const [nama, jenis] = bagian.split("=").map((v) => v.trim());
    if (!nama || !jenis) continue;
    const kunci = nama.toUpperCase();
    if (/^f/i.test(jenis)) peta.set(kunci, "female");
    else if (/^m/i.test(jenis)) peta.set(kunci, "male");
  }
  return peta;
}

/* ==========================================================================
   TRANSKRIP -> GILIRAN BICARA
   ========================================================================== */

/**
 * Memecah transkrip menjadi deretan giliran bicara.
 *
 * Baris "NAMA: kalimat" menjadi satu giliran milik NAMA; baris tanpa label
 * menyambung giliran sebelumnya, atau — pada monolog, di mana tidak ada label
 * sama sekali — menjadi giliran milik "NARRATOR".
 */
function pecahGiliran(transkrip) {
  const baris = transkrip.replace(/\r\n?/g, "\n").split("\n");
  const giliran = [];
  let petaSuara = new Map();

  for (const mentah of baris) {
    const isi = mentah.trim();
    if (!isi) continue;

    const cocokSuara = /^voices?\s*:\s*(.+)$/i.exec(isi);
    if (cocokSuara) {
      petaSuara = bacaPetaSuara(cocokSuara[1]);
      continue;
    }

    // Label pembicara: satu atau dua kata huruf besar diikuti titik dua.
    // Dibatasi begitu supaya kalimat biasa yang memuat titik dua ("Now, the
    // roles: animal care …") tidak disalahartikan sebagai pergantian suara.
    const cocok = /^([A-Z][A-Z '.-]{0,18})\s*:\s*(.*)$/.exec(isi);
    if (cocok && cocok[1].trim().split(/\s+/).length <= 2) {
      giliran.push({ pembicara: cocok[1].trim().toUpperCase(), teks: cocok[2].trim() });
      continue;
    }

    if (giliran.length === 0) {
      giliran.push({ pembicara: "NARRATOR", teks: isi });
      continue;
    }

    // Baris tanpa label menyambung giliran sebelumnya HANYA bila kalimatnya
    // memang belum selesai — itu tanda barisnya terpenggal lebar halaman.
    // Kalau kalimat sebelumnya sudah ditutup titik, baris ini paragraf baru,
    // dan ia diberi gilirannya sendiri supaya dapat jeda: monolog kuliah tanpa
    // jeda antar-paragraf mustahil diikuti siswa yang sedang mencatat.
    const sebelumnya = giliran[giliran.length - 1];
    if (/[.!?:"']\s*$/.test(sebelumnya.teks)) {
      giliran.push({ pembicara: sebelumnya.pembicara, teks: isi });
    } else {
      sebelumnya.teks += ` ${isi}`;
    }
  }

  return { giliran: giliran.filter((g) => g.teks), petaSuara };
}

/**
 * Menetapkan suara untuk tiap pembicara.
 *
 * Urutannya: peta VOICES lebih dulu, lalu label yang namanya sudah menyebut
 * jenis suaranya, lalu pembagian bergantian menurut urutan munculnya.
 * Pembicara ketiga dan seterusnya yang kebagian suara yang sama diberi nada
 * lebih rendah bertingkat — dua orang bersuara persis sama dalam satu dialog
 * membuat soalnya mustahil dijawab.
 */
function bagiSuara(giliran, petaSuara, bawaan) {
  const jenis = new Map();
  const nada = new Map();
  const dipakai = { female: 0, male: 0 };
  let bergantian = 0;

  for (const g of giliran) {
    if (jenis.has(g.pembicara)) continue;

    let pilihan = petaSuara.get(g.pembicara);
    if (!pilihan) {
      if (LABEL_PEREMPUAN.test(g.pembicara)) pilihan = "female";
      else if (LABEL_LAKI.test(g.pembicara)) pilihan = "male";
      else if (g.pembicara === "NARRATOR") pilihan = bawaan;
      else pilihan = bergantian++ % 2 === 0 ? bawaan : lawan(bawaan);
    }

    jenis.set(g.pembicara, pilihan);
    nada.set(g.pembicara, dipakai[pilihan] * -12);
    dipakai[pilihan]++;
  }

  return { jenis, nada };
}

const lawan = (j) => (j === "female" ? "male" : "female");

/* ==========================================================================
   SSML
   ========================================================================== */

function amanSsml(teks) {
  return teks
    // Tanda baca tipografis membingungkan SAPI; disamakan dulu ke ASCII.
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, " - ")
    .replace(/…/g, "...")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function ucap(jenis, teks, nada = 0) {
  const isi = amanSsml(teks);
  const badan = nada ? `<prosody pitch="${nada}%">${isi}</prosody>` : isi;
  return `  <voice name="${SUARA[jenis]}">${badan}</voice>`;
}

/**
 * Menyusun SSML satu rekaman utuh.
 *
 * Pengumuman pembuka dan penutupnya mengikuti kebiasaan IELTS — nomor bagian,
 * rentang nomor soalnya, dan peringatan bahwa rekaman diputar sekali saja —
 * dan sengaja TIDAK ikut disimpan ke kolom transkrip: yang di sana adalah
 * naskah percakapannya, yang dibacakan pengawas kalau rekamannya tidak dipakai.
 */
function susunSsml(seksi, giliran, jenis, nada) {
  const dari = (seksi.nomor - 1) * 10 + 1;
  const sampai = seksi.nomor * 10;
  const judul = seksi.judul ? `${seksi.judul}.` : "";

  const baris = [
    '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">',
    ucap(
      "male",
      `Section ${seksi.nomor}. ${judul} You will hear the recording once only. ` +
        `Now listen carefully and answer questions ${dari} to ${sampai}.`,
    ),
    '  <break time="1500ms"/>',
  ];

  for (const g of giliran) {
    baris.push(ucap(jenis.get(g.pembicara), g.teks, nada.get(g.pembicara)));
    baris.push('  <break time="450ms"/>');
  }

  baris.push('  <break time="1000ms"/>');
  baris.push(ucap("male", `That is the end of section ${seksi.nomor}.`));
  baris.push("</speak>");
  return baris.join("\n");
}

/* ==========================================================================
   JALAN
   ========================================================================== */

const paket = all("SELECT * FROM ielts_paket WHERE kode = ?", KODE)[0];
if (!paket) {
  console.error(`Paket "${KODE}" tidak ditemukan. Jalankan "npm run seed:ielts" dulu.`);
  process.exit(1);
}

const seksiSemua = I.seksiSubtes(paket.id, "LISTENING");
const seksi = NOMOR ? seksiSemua.filter((s) => s.nomor === Number(NOMOR)) : seksiSemua;
if (seksi.length === 0) {
  console.error(`Tidak ada Recording ${NOMOR} pada paket ${KODE}.`);
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rekaman-ielts-"));
const ps1 = path.join(AKAR, "scripts", "tts-ssml.ps1");

console.log(`Paket ${paket.kode} — ${seksi.length} Recording\n`);

let dibuat = 0;
for (const s of seksi) {
  const nama = `Recording ${s.nomor}${s.judul ? ` — ${s.judul}` : ""}`;

  if (s.audio_url && !TIMPA) {
    console.log(`  ${nama}\n    dilewati, rekamannya sudah ada (pakai --timpa untuk mengganti)\n`);
    continue;
  }
  if (!s.transkrip || !s.transkrip.trim()) {
    console.log(`  ${nama}\n    DILEWATI: bagian ini belum punya transkrip\n`);
    continue;
  }

  const { giliran, petaSuara } = pecahGiliran(s.transkrip);
  if (giliran.length === 0) {
    console.log(`  ${nama}\n    DILEWATI: transkripnya kosong sesudah dibaca\n`);
    continue;
  }

  // Monolog bergantian jenis suaranya antar-Recording supaya empat rekaman
  // dalam satu paket tidak terdengar seperti satu orang yang sama sepanjang
  // satu jam.
  const bawaan = s.nomor % 2 === 0 ? "female" : "male";
  const { jenis, nada } = bagiSuara(giliran, petaSuara, bawaan);

  const berkasSsml = path.join(tmp, `r${s.nomor}.ssml`);
  const berkasWav = path.join(tmp, `r${s.nomor}.wav`);
  fs.writeFileSync(berkasSsml, susunSsml(s, giliran, jenis, nada), "utf8");

  const daftarSuara = [...jenis.entries()]
    .map(([p, j]) => `${p}=${j === "female" ? "perempuan" : "laki-laki"}`)
    .join(", ");
  console.log(`  ${nama}`);
  console.log(`    ${giliran.length} giliran bicara · ${daftarSuara}`);

  const hasil = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1, "-Ssml", berkasSsml, "-Keluaran", berkasWav],
    { encoding: "utf8" },
  );

  if (hasil.status !== 0 || !fs.existsSync(berkasWav)) {
    console.error(`    GAGAL membangkitkan suara: ${(hasil.stderr || hasil.stdout || "").trim()}\n`);
    continue;
  }

  const isi = new Uint8Array(fs.readFileSync(berkasWav));
  const simpan = await A.simpanAudio(isi, paket.kode);
  I.pasangAudio(s.id, simpan.url, `recording-${s.nomor}.wav`);

  const detik = Math.round((isi.length - 44) / 32000);
  console.log(
    `    ${Math.floor(detik / 60)}m ${String(detik % 60).padStart(2, "0")}s · ` +
      `${(simpan.ukuran / 1024 / 1024).toFixed(1)} MB · terpasang di ${simpan.url}\n`,
  );
  dibuat++;
}

fs.rmSync(tmp, { recursive: true, force: true });

const ringkas = I.ringkasPaket(paket.id).find((r) => r.kode === "LISTENING");
console.log(`${dibuat} rekaman dibuat. Listening: ${ringkas.audioTerisi}/${ringkas.jumlahSeksi} bagian berekaman.`);
if (ringkas.audioTerisi < ringkas.jumlahSeksi) {
  console.log("Bagian yang belum berekaman tetap bisa dikerjakan siswa — soalnya terbuka, hanya tidak ada yang diputar.");
}
