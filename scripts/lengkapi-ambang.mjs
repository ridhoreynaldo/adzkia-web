/**
 * Melengkapi ancar-ancar skor (`campuses.skor_min`) untuk prodi yang ada di
 * katalog `prodi` tetapi belum punya angka ambang batas sama sekali.
 *
 *     node scripts/lengkapi-ambang.mjs            # hanya melihat, tidak menulis
 *     node scripts/lengkapi-ambang.mjs --tulis    # menulis ke basis data
 *
 * MENGAPA ADA YANG KOSONG
 * -----------------------
 * scripts/impor-snpmb.mjs menghitung ancar-ancar dari keketatan resmi
 * (peminat / daya tampung). Prodi yang baru dibuka belum punya angka peminat
 * tahun sebelumnya, jadi rumus itu tidak bisa dipakai dan barisnya dilewati.
 * Akibatnya prodi tersebut muncul sebagai "BELUM ADA DATA" di laporan hasil
 * dan tidak ikut diseleksi pada Pilihan 1-4.
 *
 * CARA ANGKANYA DIPEROLEH
 * -----------------------
 * Bukan dari keketatan (tidak ada), melainkan dari angka yang SUDAH ada, lewat
 * model dua arah "prodi + kampus" (median polish):
 *
 *     skor = tengah nasional + efek nama prodi + efek kampus + koreksi jenjang
 *
 * Contoh: "Kedokteran" di seluruh Indonesia rata-rata +32 di atas tengah
 * nasional, dan Universitas Indonesia rata-rata +150 di atas tengah nasional,
 * maka prodi Kedokteran baru di UI diperkirakan 582 + 32 + 150.
 *
 * Tiga hal yang membuatnya tidak asal rata-rata:
 *
 *   1. PENYUSUTAN. Efek nama prodi disusutkan n/(n+8) ke arah efek kelompok.
 *      Tanpa ini, prodi yang namanya cuma muncul sekali (ITB menamai prodinya
 *      dengan nama fakultas) menyerap seluruh level kampusnya, sehingga efek
 *      kampus ITB terhitung 0 -- padahal seharusnya +108.
 *   2. PADANAN NAMA. Prodi yang namanya belum pernah ada di Indonesia
 *      ("Teknologi Cerdas Penangkapan Ikan") dicarikan nama termirip lewat
 *      irisan kata; kalau tetap tidak ketemu, dipakai sandaran kelompoknya.
 *   3. PITA KAMPUS. Dugaan yang melampaui prodi tertinggi di kampusnya
 *      dipangkas jadi seperempat kelebihannya, sebab prodi yang baru dibuka
 *      jarang langsung mengalahkan prodi andalan kampus itu. Keluarga
 *      kedokteran dikecualikan -- di sana justru sebaliknya.
 *
 * Pada baris yang angkanya sudah diketahui, model ini meleset -19..+15 poin
 * (persentil 10-90), dengan median galat mutlak 7 poin.
 *
 * DUA KOREKSI YANG SENGAJA TIDAK DIPAKAI
 * --------------------------------------
 *   - Diskon kampus cabang (PSDKU/kampus kabupaten). Diukur dari 96 pasang
 *     cabang-induk yang sudah ada di basis data: median selisihnya 0. Dugaan
 *     bahwa kampus cabang selalu lebih longgar TIDAK terbukti, jadi dibuang.
 *   - Menaikkan seluruh skala agar cocok dengan "passing grade" yang beredar
 *     di internet. Angka-angka itu memakai skala yang berbeda; menaikkan
 *     ratusan baris ini saja akan membuatnya tidak sebanding dengan ribuan
 *     baris lain, dan peserta yang memilih prodi ini akan dinilai lebih berat
 *     tanpa sebab.
 *
 * Baris hasil skrip ini ditandai `sumber = 'perkiraan'` supaya bisa dibedakan
 * dari 'snpmb' (hitungan keketatan) dan 'manual' (susunan pengajar Adzkia).
 * Kalau SNPMB kelak menerbitkan peminatnya, impor-snpmb.mjs akan menimpanya
 * dengan angka yang lebih baik -- itu memang yang diinginkan.
 */
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DB_PATH =
  process.env.ADZKIA_DB_PATH ?? path.join(import.meta.dirname, "..", "data", "adzkia.db");
const TULIS = process.argv.includes("--tulis");

/* ------------------------------------------------------------------ */
/* Perkakas                                                            */
/* ------------------------------------------------------------------ */

const med = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Nama untuk dicocokkan antarkampus: tanpa penanda jenjang & nama kampus cabang. */
function dasar(nama) {
  return nama
    .toUpperCase()
    .replace(/\s*\((D3|D4|S1)\)\s*$/i, "")
    .replace(/\s*[-(]?\s*(PSDKU|KAMPUS)\b[^)]*\)?\s*$/i, "")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Sama dengan impor-snpmb.mjs: tabel campuses ditulis Kapital Awal. */
const AKRONIM = new Set([
  "UIN", "IAIN", "STAIN", "ISI", "ISBI", "IPB", "ITB", "ITS", "UPN", "UNS", "UI", "UGM",
  "PGSD", "PAUD", "PGMI", "PJKR", "IPA", "IPS", "TI", "TIK", "K3", "D3", "D4", "S1",
  "AL", "BK", "PKN", "PPKN", "MIPA", "STIS", "STAN", "IT", "SD", "SMP", "SMA", "MBD",
]);
function kapitalAwal(teks) {
  return String(teks)
    .trim()
    .split(/\s+/)
    .map((k) => {
      const bersih = k.replace(/[^A-Za-z0-9]/g, "");
      if (AKRONIM.has(bersih.toUpperCase())) return k.toUpperCase();
      if (k.length <= 2 && /^[A-Za-z]+$/.test(k)) return k.toLowerCase();
      return k.charAt(0).toUpperCase() + k.slice(1).toLowerCase();
    })
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ */
/* Tetapan model                                                       */
/* ------------------------------------------------------------------ */

/** Koreksi jenjang, dipinjam dari impor-snpmb.mjs supaya satu skala. */
const KOREKSI_JENJANG = { S1: 0, D4: -16, D3: -32 };
/** Kekuatan penyusutan: makin besar, makin tidak percaya sampel kecil. */
const SUSUT_PRODI = 8;
const SUSUT_KAMPUS = 3;
/** Berapa bagian kelebihan di atas prodi tertinggi kampus yang disisakan. */
const SISA_KELEBIHAN = 0.25;
/** Kampus dengan baris sesedikit ini pitanya belum bisa dipercaya. */
const MIN_BARIS_PITA = 8;
/** Fakultas kedokteran hampir selalu prodi tersulit di kampusnya. */
const UNGGUL_KEDOKTERAN = 30;
const SKOR_BAWAH = 350;
const SKOR_ATAS = 800;

/**
 * Koreksi tangan untuk prodi yang modelnya tidak mungkin tahu duduk perkaranya.
 * Setiap baris wajib menyebut alasannya -- kalau alasannya tidak bisa ditulis,
 * angkanya tidak layak dipaksakan.
 */
const KOREKSI_TANGAN = [
  {
    nama: "ARSITEKTUR",
    ptn: "INSTITUT TEKNOLOGI BANDUNG",
    skor: 705,
    alasan: "SAPPK termasuk jalur ITB yang diperebutkan; pita ITB 666-762, tengahnya 699",
  },
  {
    nama: "PERENCANAAN WILAYAH DAN KOTA - KAMPUS CIREBON",
    ptn: "INSTITUT TEKNOLOGI BANDUNG",
    skor: 663,
    alasan: "Kampus Cirebon terukur -28 terhadap Ganesha (FTI-C 694 vs FTI 722)",
  },
  {
    nama: "REKAYASA KOSMETIK",
    ptn: "UNIVERSITAS PADJADJARAN",
    skor: 665,
    alasan: "prodi baru berdaya tampung kecil, bukan andalan Unpad; pita 598-731, tengah 709",
  },
  {
    nama: "PENDIDIKAN AGAMA ISLAM",
    ptn: "UNIVERSITAS NEGERI YOGYAKARTA",
    skor: 640,
    alasan: "prodi baru di luar rumpun andalan UNY; cuma 2 contoh nasional, dugaan 689 kelewat tinggi",
  },
  {
    nama: "BIOLOGI",
    ptn: 'UPN "VETERAN" JAKARTA',
    skor: 645,
    alasan: "Biologi murni peminatnya rendah dibanding rumpun kesehatan UPNVJ; pita 634-715",
  },
  {
    nama: "KEDOKTERAN GIGI",
    ptn: "UNIVERSITAS NEGERI PADANG",
    skor: 640,
    alasan: "ditaruh tepat di bawah Kedokteran UNP (658), mengikuti pola KG-vs-Kedokteran di PTN lain",
  },
  {
    nama: "KEDOKTERAN GIGI",
    ptn: "UNIVERSITAS NEGERI SURABAYA",
    skor: 618,
    alasan: "ditaruh tepat di bawah Kedokteran UNESA (627)",
  },
  {
    nama: "TEKNIK INDUSTRI KAMPUS BATANG",
    ptn: "UNIVERSITAS DIPONEGORO",
    skor: 650,
    alasan: "Teknik Industri induk 685; Kampus Batang terukur -37 (Agribisnis 630 vs 667)",
  },
];

/* ------------------------------------------------------------------ */
/* Membangun model                                                     */
/* ------------------------------------------------------------------ */

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA busy_timeout = 10000");

const camp = db.prepare("SELECT ptn, prodi, jenjang, kelompok, skor_min FROM campuses").all();
if (camp.length < 200) {
  console.error(
    `Tabel campuses baru berisi ${camp.length} baris — jalankan dulu:\n  node scripts/impor-snpmb.mjs`,
  );
  process.exit(1);
}

const tengah = med(camp.map((r) => r.skor_min));
const banyakNama = new Map();
for (const r of camp) {
  const k = dasar(r.prodi);
  banyakNama.set(k, (banyakNama.get(k) ?? 0) + 1);
}

let efekNama = new Map();
let efekPtn = new Map();
let efekKelompok = new Map();

for (let putaran = 0; putaran < 6; putaran++) {
  const sisa = (r) =>
    r.skor_min -
    tengah -
    (efekPtn.get(r.ptn.toUpperCase()) ?? 0) -
    (KOREKSI_JENJANG[r.jenjang] ?? 0);

  const perKelompok = new Map();
  for (const r of camp) {
    if (!perKelompok.has(r.kelompok)) perKelompok.set(r.kelompok, []);
    perKelompok.get(r.kelompok).push(sisa(r));
  }
  efekKelompok = new Map([...perKelompok].map(([k, v]) => [k, med(v)]));

  const perNama = new Map();
  for (const r of camp) {
    const k = dasar(r.prodi);
    if (!perNama.has(k)) perNama.set(k, []);
    perNama.get(k).push({ s: sisa(r), g: r.kelompok });
  }
  efekNama = new Map(
    [...perNama].map(([k, v]) => {
      const bobot = v.length / (v.length + SUSUT_PRODI);
      const sandaran = med(v.map((x) => efekKelompok.get(x.g) ?? 0));
      return [k, bobot * med(v.map((x) => x.s)) + (1 - bobot) * sandaran];
    }),
  );

  const perPtn = new Map();
  for (const r of camp) {
    const k = r.ptn.toUpperCase();
    if (!perPtn.has(k)) perPtn.set(k, []);
    perPtn
      .get(k)
      .push(
        r.skor_min -
          tengah -
          (efekNama.get(dasar(r.prodi)) ?? 0) -
          (KOREKSI_JENJANG[r.jenjang] ?? 0),
      );
  }
  efekPtn = new Map(
    [...perPtn].map(([k, v]) => [k, (v.length / (v.length + SUSUT_KAMPUS)) * med(v)]),
  );
}

/* ---- padanan nama untuk prodi yang belum pernah ada di Indonesia ---- */
const KATA_REMEH = new Set(["DAN", "DALAM", "UNTUK", "ILMU", "PROGRAM", "STUDI", "TERAPAN"]);
const kata = (s) => new Set(dasar(s).split(" ").filter((w) => w.length > 2 && !KATA_REMEH.has(w)));
const semuaNama = [...banyakNama.keys()].map((k) => ({ k, t: kata(k), e: efekNama.get(k) }));

function efekUntukNama(nama, kelompok) {
  const d = dasar(nama);
  if (banyakNama.has(d)) {
    return { e: efekNama.get(d), cara: `nama sama (${banyakNama.get(d)} kampus)` };
  }

  const t = kata(nama);
  const mirip = semuaNama
    .map((x) => {
      const irisan = [...t].filter((w) => x.t.has(w)).length;
      return { ...x, sim: irisan / (t.size + x.t.size - irisan) };
    })
    .filter((x) => x.sim >= 0.34)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 7);
  if (mirip.length) {
    const contoh = mirip
      .slice(0, 2)
      .map((x) => x.k.toLowerCase())
      .join(", ");
    return { e: med(mirip.map((x) => x.e)), cara: `mirip ${contoh}` };
  }
  return { e: efekKelompok.get(kelompok) ?? 0, cara: `sandaran ${kelompok}` };
}

/* ---- pita skor tiap kampus, untuk memangkas dugaan yang kelewat tinggi ---- */
const pitaPtn = new Map();
for (const r of camp) {
  const k = r.ptn.toUpperCase();
  if (!pitaPtn.has(k)) pitaPtn.set(k, []);
  pitaPtn.get(k).push(r.skor_min);
}
for (const v of pitaPtn.values()) v.sort((a, b) => a - b);

const KELUARGA_KEDOKTERAN = /^(KEDOKTERAN|PENDIDIKAN DOKTER)$/;

/* ------------------------------------------------------------------ */
/* Menghitung yang kosong                                              */
/* ------------------------------------------------------------------ */

const kosong = db
  .prepare(
    `SELECT p.nama, p.ptn, p.jenjang, p.kelompok
       FROM prodi p
       LEFT JOIN campuses c ON UPPER(c.prodi) = UPPER(p.nama) AND UPPER(c.ptn) = UPPER(p.ptn)
      WHERE c.id IS NULL
      ORDER BY p.ptn, p.nama`,
  )
  .all();

const hasil = kosong.map((r) => {
  const { e, cara } = efekUntukNama(r.nama, r.kelompok);
  const mentah =
    tengah + e + (efekPtn.get(r.ptn.toUpperCase()) ?? 0) + (KOREKSI_JENJANG[r.jenjang] ?? 0);

  const pita = pitaPtn.get(r.ptn.toUpperCase()) ?? [];
  const tertinggi = pita.length ? pita[pita.length - 1] : null;
  const kedokteran = KELUARGA_KEDOKTERAN.test(dasar(r.nama));
  const catatan = [cara];

  let skor = mentah;
  if (tertinggi != null && pita.length >= MIN_BARIS_PITA && !kedokteran && skor > tertinggi) {
    skor = tertinggi + (skor - tertinggi) * SISA_KELEBIHAN;
    catatan.push(`dipangkas ke pita kampus (tertinggi ${tertinggi})`);
  }
  if (kedokteran && tertinggi != null && skor < tertinggi + UNGGUL_KEDOKTERAN) {
    skor = tertinggi + UNGGUL_KEDOKTERAN;
    catatan.push(`diangkat: FK tersulit di kampusnya (prodi lain tertinggi ${tertinggi})`);
  }
  skor = Math.round(Math.max(SKOR_BAWAH, Math.min(SKOR_ATAS, skor)));

  const tangan = KOREKSI_TANGAN.find(
    (t) => t.nama === r.nama.toUpperCase() && t.ptn === r.ptn.toUpperCase(),
  );
  if (tangan) {
    catatan.push(`koreksi tangan dari ${skor}: ${tangan.alasan}`);
    skor = tangan.skor;
  }

  return { ...r, skor, catatan: catatan.join("; ") };
});

/* ------------------------------------------------------------------ */
/* Laporan & penulisan                                                 */
/* ------------------------------------------------------------------ */

const galat = camp.map((r) => {
  const duga =
    tengah +
    (efekNama.get(dasar(r.prodi)) ?? 0) +
    (efekPtn.get(r.ptn.toUpperCase()) ?? 0) +
    (KOREKSI_JENJANG[r.jenjang] ?? 0);
  return r.skor_min - duga;
});
galat.sort((a, b) => a - b);
const kuantil = (p) => galat[Math.floor(p * (galat.length - 1))];

console.log(`Tengah nasional ${tengah} · ${camp.length} baris acuan`);
console.log(
  "Ketepatan model pada baris yang angkanya sudah diketahui: " +
    `${kuantil(0.1).toFixed(0)}..${kuantil(0.9).toFixed(0)} poin (persentil 10-90), ` +
    `median galat mutlak ${med(galat.map(Math.abs)).toFixed(0)} poin`,
);
console.log(`\n${hasil.length} prodi tanpa ambang batas:\n`);
let ptnTerakhir = "";
for (const r of hasil) {
  if (r.ptn !== ptnTerakhir) {
    console.log(`\n${r.ptn}`);
    ptnTerakhir = r.ptn;
  }
  console.log(`  ${String(r.skor).padStart(3)}  ${r.nama}`);
  console.log(`       ${r.catatan}`);
}

const angka = hasil.map((r) => r.skor).sort((a, b) => a - b);
console.log(`\nSebaran hasil: ${angka[0]} .. ${angka[angka.length - 1]}, tengah ${med(angka)}`);

if (!TULIS) {
  console.log("\nBelum ada yang ditulis. Tambahkan --tulis untuk menyimpannya.");
  process.exit(0);
}

const cap = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
const cadangan = path.join(path.dirname(DB_PATH), `adzkia-cadangan-${cap}-sebelum-ambang.db`);
db.exec(`VACUUM INTO '${cadangan.replace(/'/g, "''")}'`);
console.log(`\nCadangan: ${path.basename(cadangan)}`);

const sisip = db.prepare(
  `INSERT INTO campuses (ptn, prodi, kelompok, jenjang, skor_min, daya_tampung, peminat, sumber)
   VALUES (?, ?, ?, ?, ?, NULL, NULL, 'perkiraan')
   ON CONFLICT (ptn, prodi) DO NOTHING`,
);
let ditulis = 0;
db.exec("BEGIN");
try {
  for (const r of hasil) {
    ditulis += sisip.run(
      kapitalAwal(r.ptn),
      kapitalAwal(r.nama),
      r.kelompok ?? "Saintek",
      r.jenjang ?? "S1",
      r.skor,
    ).changes;
  }
  db.exec("COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}

const sisaKosong = db
  .prepare(
    `SELECT COUNT(*) n FROM prodi p
       LEFT JOIN campuses c ON UPPER(c.prodi) = UPPER(p.nama) AND UPPER(c.ptn) = UPPER(p.ptn)
      WHERE c.id IS NULL`,
  )
  .get().n;
console.log(`${ditulis} baris ditulis. Prodi tanpa ambang batas sekarang: ${sisaKosong}.`);
