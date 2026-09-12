/**
 * Mengimpor katalog resmi SNPMB (scripts/snpmb-2026.json) ke basis data.
 *
 *     node scripts/tarik-snpmb.mjs      # sekali, mengunduh dari snpmb.id
 *     node scripts/impor-snpmb.mjs      # boleh diulang, tidak merusak
 *
 * Mengisi DUA tabel yang berbeda peran:
 *
 *   `prodi`    — katalog yang dicari siswa di layar "Pilihan Program Studi".
 *                Semua prodi masuk, termasuk yang tidak punya angka peminat.
 *   `campuses` — ancar-ancar skor + daya tampung + peminat, dipakai menyeleksi
 *                Pilihan 1-4 dan menyusun Rekomendasi Kampus.
 *
 * ANGKA MANA YANG RESMI, MANA YANG BUKAN
 * --------------------------------------
 * Daya tampung dan jumlah peminat: RESMI, langsung dari SNPMB.
 * Ancar-ancar skor (`skor_min`): TIDAK PERNAH diterbitkan SNPMB, jadi
 * diperkirakan dari keketatan dengan regresi yang dikalibrasi terhadap angka
 * buatan tangan yang sudah ada di tabel `campuses`:
 *
 *     skor_min = 466,1 + 13,6*ln(keketatan prodi) + 49,5*ln(keketatan kampus)
 *
 * "Keketatan kampus" = total peminat dibagi total daya tampung seluruh prodi
 * di kampus itu; dipakai sebagai penanda gengsi, karena keketatan prodi saja
 * hanya menjelaskan 23% ragam (R2 0,227). Dengan penanda kampus, R2 naik jadi
 * 0,465 dengan galat khas +-31 poin.
 *
 * Dua koreksi yang diukur dari sisa regresi:
 *   - D3 dilebihkan model rata-rata 32 poin  -> dikurangi 32 (7 sampel).
 *   - Prodi papan atas (>=720) diperkirakan 48 poin terlalu rendah -> prediksi
 *     tinggi ditarik naik secara bertahap.
 *
 * BATASNYA, supaya tidak dipercaya berlebihan: kalibrasinya berasal dari 139
 * prodi di 29 kampus besar saja. Untuk kampus kecil dan jalur vokasi angkanya
 * adalah ekstrapolasi yang belum teruji. Karena itu baris hasil hitungan
 * ditandai `sumber = 'snpmb'`, sedangkan angka buatan pengajar tetap
 * `sumber = 'manual'` dan TIDAK PERNAH ditimpa.
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const BERKAS = path.join(import.meta.dirname, "snpmb-2026.json");
const DB_PATH =
  process.env.ADZKIA_DB_PATH ?? path.join(import.meta.dirname, "..", "data", "adzkia.db");

/* ------------------------------------------------------------------ */
/* Model ancar-ancar                                                   */
/* ------------------------------------------------------------------ */

const KOEF = { a: 466.1, kProdi: 13.6, kKampus: 49.5 };
/** Koreksi per jenjang, dari sisa regresi. D4 dipakai setengah D3 — asumsi,
 *  karena tidak ada satu pun D4 pada himpunan kalibrasi. */
const KOREKSI_JENJANG = { S1: 0, D4: -16, D3: -32 };
/** Batas aman: di luar ini prediksi tidak lagi masuk akal. */
const SKOR_MIN_BAWAH = 350;
const SKOR_MIN_ATAS = 800;

function ancarAncar(keketatanProdi, keketatanKampus, jenjang) {
  const dasar =
    KOEF.a +
    KOEF.kProdi * Math.log(keketatanProdi) +
    KOEF.kKampus * Math.log(keketatanKampus);

  // Model meratakan papan atas; prodi yang diperkirakan tinggi ditarik naik
  // secara bertahap supaya jarak Kedokteran UI terhadap prodi biasa tidak
  // hilang. Tidak berlaku di bawah 620 agar prodi menengah tidak ikut naik.
  const tarikan = dasar > 620 ? Math.min(48, (dasar - 620) * 0.9) : 0;

  const nilai = dasar + tarikan + (KOREKSI_JENJANG[jenjang] ?? 0);
  return Math.round(Math.max(SKOR_MIN_BAWAH, Math.min(SKOR_MIN_ATAS, nilai)));
}

/* ------------------------------------------------------------------ */
/* Penggolongan Saintek / Soshum                                       */
/* ------------------------------------------------------------------ */

/**
 * SNBT sejak 2023 tidak lagi memisahkan Saintek dan Soshum, jadi SNPMB tidak
 * mengirim kolom ini. Padahal penyaring di Rekomendasi Kampus memakainya,
 * maka digolongkan dari kata kunci pada nama prodi. Ini TEBAKAN TERDIDIK,
 * bukan data resmi — dan hanya memengaruhi tombol penyaring, bukan seleksi.
 */
const KATA_SAINTEK = [
  "TEKNIK", "TEKNOLOGI", "KEDOKTERAN", "DOKTER", "FARMASI", "KEPERAWATAN", "KEBIDANAN",
  "KESEHATAN", "GIZI", "BIOLOGI", "KIMIA", "FISIKA", "MATEMATIKA", "STATISTIK", "INFORMATIKA",
  "KOMPUTER", "SISTEM INFORMASI", "PERTANIAN", "AGRI", "AGRO", "PETERNAKAN", "PERIKANAN",
  "KELAUTAN", "KEHUTANAN", "ARSITEKTUR", "GEOLOGI", "GEOFISIKA", "GEOGRAFI", "GEODESI",
  "GEOMATIKA", "LINGKUNGAN", "PANGAN", "INDUSTRI", "MESIN", "ELEKTRO", "SIPIL", "ARSITEK",
  "TAMBANG", "PERMINYAKAN", "METALURGI", "AKTUARIA", "BIOTEKNOLOGI", "VETERINER", "ANESTESI",
  "RADIOLOGI", "LABORATORIUM", "OPTOMETRI", "FISIOTERAPI", "OSEANOGRAFI", "ASTRONOMI",
  "MEKATRONIKA", "OTOMOTIF", "LISTRIK", "MESIN", "REKAYASA", "PERKAPALAN", "DIRGANTARA",
  "PENERBANGAN", "NUKLIR", "MATERIAL", "TELEKOMUNIKASI", "ELEKTRONIKA", "MANUFAKTUR",
];

const KATA_SOSHUM = [
  "HUKUM", "EKONOMI", "MANAJEMEN", "AKUNTANSI", "BISNIS", "ADMINISTRASI", "SOSIAL",
  "SOSIOLOGI", "ANTROPOLOGI", "POLITIK", "HUBUNGAN INTERNASIONAL", "KOMUNIKASI",
  "JURNALISTIK", "PSIKOLOGI", "SASTRA", "BAHASA", "SEJARAH", "ARKEOLOGI", "FILSAFAT",
  "AGAMA", "ISLAM", "SYARIAH", "DAKWAH", "TARBIYAH", "USHULUDDIN", "MUAMALAH", "PERBANKAN",
  "PERPAJAKAN", "PARIWISATA", "PERPUSTAKAAN", "KESEJAHTERAAN", "KRIMINOLOGI", "SENI",
  "MUSIK", "TARI", "TEATER", "DESAIN", "KRIYA", "PEMERINTAHAN", "KENOTARIATAN", "HUMAS",
  "KEUANGAN", "PEMASARAN", "SEKRETARI", "GEOGRAFI PEMBANGUNAN",
];

function golongkan(nama) {
  const n = nama.toUpperCase();
  // Kata Soshum diperiksa lebih dulu supaya "PENDIDIKAN BAHASA INGGRIS" tidak
  // tertangkap "PENDIDIKAN ... MATEMATIKA" dan sejenisnya secara keliru.
  const skorSoshum = KATA_SOSHUM.filter((k) => n.includes(k)).length;
  const skorSaintek = KATA_SAINTEK.filter((k) => n.includes(k)).length;
  if (skorSaintek > skorSoshum) return "Saintek";
  if (skorSoshum > skorSaintek) return "Soshum";
  return "Soshum"; // netral (mis. "PENDIDIKAN GURU SEKOLAH DASAR")
}

/* ------------------------------------------------------------------ */
/* Perapian teks                                                       */
/* ------------------------------------------------------------------ */

const N = (s) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();

/** Singkatan yang harus tetap kapital saat nama dijadikan Kapital Awal. */
const AKRONIM = new Set([
  "UIN", "IAIN", "STAIN", "ISI", "ISBI", "IPB", "ITB", "ITS", "UPN", "UNS", "UI", "UGM",
  "PGSD", "PAUD", "PGMI", "PJKR", "IPA", "IPS", "TI", "TIK", "K3", "D3", "D4", "S1",
  "AL", "BK", "PKN", "PPKN", "MIPA", "STIS", "STAN", "IT", "SD", "SMP", "SMA",
]);

/**
 * Nama prodi yang dipakai sebagai kunci sekaligus tampilan.
 *
 * Banyak kampus membuka prodi bernama sama pada dua jenjang — Universitas Riau
 * punya TEKNIK SIPIL S1 dan TEKNIK SIPIL D3. Keduanya beda seleksi dan beda
 * ancar-ancar, sedangkan kedua tabel hanya unik pada (ptn, nama). Jenjang
 * selain S1 karena itu dicantumkan pada namanya: selain membuat kuncinya unik,
 * siswa jadi tahu yang ia pilih itu D3 atau S1 — sebelumnya tidak kelihatan.
 */
function namaJenjang(nama, jenjang) {
  return !jenjang || jenjang === "S1" ? nama : `${nama} (${jenjang})`;
}

/** "PENDIDIKAN DOKTER" -> "Pendidikan Dokter", akronim dipertahankan. */
function kapitalAwal(teks) {
  return String(teks)
    .trim()
    .split(/\s+/)
    .map((k) => {
      const bersih = k.replace(/[^A-Za-z0-9]/g, "");
      if (AKRONIM.has(bersih.toUpperCase())) return k.toUpperCase();
      if (k.length <= 2 && /^[A-Za-z]+$/.test(k)) return k.toLowerCase(); // "di", "dan"
      return k.charAt(0).toUpperCase() + k.slice(1).toLowerCase();
    })
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ */
/* Jalan                                                               */
/* ------------------------------------------------------------------ */

if (!fs.existsSync(BERKAS)) {
  console.error(`Berkas ${BERKAS} belum ada. Jalankan dulu:\n  node scripts/tarik-snpmb.mjs`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(BERKAS, "utf8"));
const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA busy_timeout = 10000");

// Kolom `sumber` ditambahkan skema v7; skrip ini bisa dijalankan sebelum
// aplikasi Next pernah dinyalakan, jadi kolomnya dipastikan sendiri di sini.
const kolomCampuses = new Set(db.prepare("PRAGMA table_info(campuses)").all().map((k) => k.name));
if (!kolomCampuses.has("sumber")) {
  db.exec("ALTER TABLE campuses ADD COLUMN sumber TEXT NOT NULL DEFAULT 'manual'");
  console.log("Kolom campuses.sumber ditambahkan.");
}

/* ------------------------------------------------------------------ */
/* Penyamaan nama kampus                                               */
/* ------------------------------------------------------------------ */

/**
 * Kampus yang di katalog lama ditulis dengan nama lain daripada di SNPMB.
 * Tanpa ini, IPB muncul DUA KALI di kotak pencarian siswa — sekali sebagai
 * "IPB University" (8 prodi lama) dan sekali sebagai "Institut Pertanian
 * Bogor" (68 prodi SNPMB). Pilihan siswa yang telanjur tersimpan ikut
 * disamakan supaya tetap berjodoh dengan ancar-ancarnya.
 */
const ALIAS_PTN = [{ dari: "IPB UNIVERSITY", ke: "INSTITUT PERTANIAN BOGOR" }];

/**
 * Selain alias yang benar-benar berbeda kata, ada nama yang hanya beda tanda
 * baca — SNPMB menulis UPN "VETERAN" JAKARTA dengan tanda petik, katalog lama
 * tanpa petik. Keduanya sama di mata pencarian tetapi berbeda di mata kolom
 * UNIQUE, sehingga kampusnya terbelah dua di kotak pilihan siswa. Ejaan SNPMB
 * dijadikan patokan, dan penyamaannya dicari sendiri supaya kasus serupa di
 * tahun berikutnya ikut tertangani tanpa menambah daftar di atas.
 */
function daftarPenyamaan() {
  const ejaanSnpmb = new Map(data.ptn.map((p) => [N(p.nama), p.nama.toUpperCase().trim()]));
  const hasil = ALIAS_PTN.map(({ dari, ke }) => ({ dari, ke }));

  const adaDi = new Set(hasil.map((h) => h.dari));
  for (const { ptn } of db.prepare("SELECT DISTINCT ptn FROM prodi").all()) {
    const kunci = N(ptn);
    const resmi = ejaanSnpmb.get(kunci);
    const lama = ptn.toUpperCase().trim();
    if (resmi && resmi !== lama && !adaDi.has(lama)) hasil.push({ dari: lama, ke: resmi });
  }
  return hasil;
}

for (const { dari, ke } of daftarPenyamaan()) {
  const keKapital = kapitalAwal(ke);
  const n = [
    db.prepare("UPDATE prodi SET ptn = ?, cari = LOWER(nama || ' ' || ?) WHERE UPPER(ptn) = ?")
      .run(ke, ke, dari).changes,
    db.prepare("UPDATE campuses SET ptn = ? WHERE UPPER(ptn) = ?").run(keKapital, dari).changes,
    db.prepare("UPDATE pilihan_prodi SET ptn = ? WHERE UPPER(ptn) = ?").run(ke, dari).changes,
  ];
  if (n.some(Boolean)) {
    console.log(`Alias: "${dari}" -> "${ke}" (prodi ${n[0]}, campuses ${n[1]}, pilihan siswa ${n[2]})`);
  }
}

/* ---- keketatan tingkat kampus ---- */
const keketatanKampus = new Map();
for (const p of data.ptn) {
  let dt = 0;
  let pm = 0;
  for (const q of p.prodi) {
    if (q.dayaTampung > 0 && q.peminat > 0) {
      dt += q.dayaTampung;
      pm += q.peminat;
    }
  }
  // Kampus tanpa satu pun angka peminat tidak bisa dinilai keketatannya.
  if (dt > 0 && pm > 0) keketatanKampus.set(N(p.nama), pm / dt);
}

/* ---- indeks baris campuses yang sudah ada, dicocokkan tanpa peduli huruf ---- */
const campusLama = new Map();
for (const r of db
  .prepare("SELECT id, ptn, prodi, skor_min, sumber FROM campuses")
  .all()) {
  campusLama.set(`${N(r.ptn)}|${N(r.prodi)}`, r);
}

const stat = {
  prodiBaru: 0,
  prodiDiperbarui: 0,
  campusBaru: 0,
  campusDiperbarui: 0,
  manualDijaga: 0,
  tanpaPeminat: 0,
  tanpaKeketatanKampus: 0,
};

const insProdi = db.prepare(
  `INSERT INTO prodi (nama, ptn, jenjang, kelompok, cari)
   VALUES (?, ?, ?, ?, ?)
   ON CONFLICT (nama, ptn) DO UPDATE SET
     jenjang  = excluded.jenjang,
     kelompok = excluded.kelompok,
     cari     = excluded.cari`,
);
const insCampus = db.prepare(
  `INSERT INTO campuses (ptn, prodi, kelompok, jenjang, skor_min, daya_tampung, peminat, sumber)
   VALUES (?, ?, ?, ?, ?, ?, ?, 'snpmb')`,
);
const updCampusPenuh = db.prepare(
  `UPDATE campuses SET kelompok = ?, jenjang = ?, skor_min = ?, daya_tampung = ?, peminat = ?,
                       sumber = 'snpmb'
    WHERE id = ?`,
);
// Baris buatan pengajar: angka ancar-ancarnya DIJAGA, hanya data resmi yang
// diperbarui.
const updCampusManual = db.prepare(
  `UPDATE campuses SET jenjang = ?, daya_tampung = ?, peminat = ? WHERE id = ?`,
);

db.exec("BEGIN");
try {
  for (const p of data.ptn) {
    const ptnKap = kapitalAwal(p.nama);
    const kk = keketatanKampus.get(N(p.nama)) ?? null;
    if (kk == null) stat.tanpaKeketatanKampus++;

    for (const q of p.prodi) {
      if (!q.nama) continue;
      const jenjang = q.jenjang || "S1";
      const namaAsli = q.nama.toUpperCase().replace(/\s+/g, " ").trim();
      const namaProdi = namaJenjang(namaAsli, jenjang);
      const ptnProdi = p.nama.toUpperCase().replace(/\s+/g, " ").trim();
      const kelompok = golongkan(namaAsli);

      /* ---- 1. katalog yang dicari siswa ---- */
      const res = insProdi.run(
        namaProdi,
        ptnProdi,
        jenjang,
        kelompok,
        `${namaProdi} ${ptnProdi}`.toLowerCase(),
      );
      if (res.changes) stat.prodiBaru++;
      else stat.prodiDiperbarui++;

      /* ---- 2. ancar-ancar & data resmi ---- */
      const punyaAngka = q.dayaTampung > 0 && q.peminat > 0 && kk != null;
      if (!punyaAngka) {
        stat.tanpaPeminat++;
        continue;
      }

      const kunci = `${N(p.nama)}|${N(namaProdi)}`;
      const lama = campusLama.get(kunci);
      const skor = ancarAncar(q.peminat / q.dayaTampung, kk, jenjang);

      if (!lama) {
        insCampus.run(
          ptnKap,
          namaJenjang(kapitalAwal(namaAsli), jenjang),
          kelompok,
          jenjang,
          skor,
          q.dayaTampung,
          q.peminat,
        );
        stat.campusBaru++;
      } else if (lama.sumber === "manual") {
        updCampusManual.run(jenjang, q.dayaTampung, q.peminat, lama.id);
        stat.manualDijaga++;
      } else {
        updCampusPenuh.run(kelompok, jenjang, skor, q.dayaTampung, q.peminat, lama.id);
        stat.campusDiperbarui++;
      }
    }
  }
  db.exec("COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  console.error("Impor dibatalkan:", e.message);
  process.exit(1);
}

/* ---- laporan ---- */
const jumlahProdi = db.prepare("SELECT COUNT(*) n FROM prodi").get().n;
const jumlahKampus = db.prepare("SELECT COUNT(DISTINCT ptn) n FROM prodi").get().n;
const jumlahCampus = db.prepare("SELECT COUNT(*) n FROM campuses").get().n;
const perSumber = db.prepare("SELECT sumber, COUNT(*) n FROM campuses GROUP BY sumber").all();

console.log(`
Katalog prodi  : ${jumlahProdi} prodi / ${jumlahKampus} kampus
                 (${stat.prodiBaru} baru, ${stat.prodiDiperbarui} diperbarui)

Ancar-ancar    : ${jumlahCampus} baris
                 ${stat.campusBaru} baru dihitung, ${stat.campusDiperbarui} dihitung ulang,
                 ${stat.manualDijaga} angka buatan pengajar dijaga (hanya daya tampung & peminat diperbarui)
                 ${perSumber.map((r) => `${r.sumber}=${r.n}`).join("  ")}

Dilewati       : ${stat.tanpaPeminat} prodi tanpa angka peminat (tetap masuk katalog, tanpa ancar-ancar)
                 ${stat.tanpaKeketatanKampus} kampus tanpa data peminat sama sekali
`);

db.close();
