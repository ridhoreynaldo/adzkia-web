/**
 * Pengujian pemeriksa kewajaran butir soal (`src/lib/mutu-soal.ts`) —
 * mesin di balik kolom "Perlu diperiksa" pada halaman Pratinjau Soal admin.
 *
 * Cara menjalankan (dari root proyek):
 *     npm run cek:pratinjau
 *
 * Dua sisi yang sama pentingnya:
 *   1. Kerusakan khas hasil impor naskah HARUS tertangkap.
 *   2. Soal yang sehat TIDAK boleh ditandai. Pratinjau yang menyalakan lampu
 *      merah untuk butir yang baik-baik saja akan berhenti dipercaya admin,
 *      dan kerusakan yang sungguhan ikut terlewat.
 *
 * Berkas .ts dipakai apa adanya, hanya disalin ke folder sementara dengan
 * penambahan ekstensi pada impor supaya bisa dimuat langsung oleh Node.
 */
import fs from "node:fs";
import os from "node:os";
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
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "adzkia-pratinjau-"));

for (const nama of ["snbt", "skd", "mutu-soal"]) {
  const sumber = fs.readFileSync(cariDiLib(`${nama}.ts`), "utf8");
  const rapi = sumber
    .replace(/^import "server-only";\s*$/m, "")
    .replace(/from "@\/lib\/(?:[a-z0-9-]+\/)?([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"')
    .replace(/from "\.\/([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"');
  fs.writeFileSync(path.join(TMP, `${nama}.ts`), rapi);
}

const { periksaButir, teksPolos } = await import(
  pathToFileURL(path.join(TMP, "mutu-soal.ts")).href
);

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

/** Butir sehat sebagai dasar; setiap uji hanya mengganti bagian yang diperlukan. */
const butir = (ubah = {}) => ({
  tipe: "PG",
  stimulus: "(1) Pendidikan adalah fondasi peradaban. (2) Aksesnya belum merata.",
  pertanyaan: "Kalimat tidak logis pada teks tersebut terdapat pada kalimat…",
  gambar_url: "",
  opsi: ["(1).", "(2).", "(3).", "(4).", "(5)."],
  kunci: "A",
  ...ubah,
});

const pesan = (b) => periksaButir(butir(b)).join(" | ");

/* ------------------------------------------------------------------ */
judul("1) Butir sehat tidak ditandai");

cek("butir lengkap dan wajar bersih", periksaButir(butir()).length === 0, pesan({}));
cek(
  "pilihan panjang yang sama-sama panjang (khas LBIND) bersih",
  periksaButir(
    butir({
      opsi: [
        "Paragraf 1 menyajikan gambaran umum kinerja ekspor nasional sepanjang tahun berjalan sebelum masuk ke rincian tiap golongan komoditas yang menopangnya.",
        "Paragraf 1 menyampaikan data rinci setiap golongan komoditas lalu menutupnya dengan simpulan mengenai arah pertumbuhan ekspor pada tahun berikutnya.",
        "Paragraf 1 membahas penyebab pertumbuhan ekspor dengan menautkannya pada kenaikan harga komoditas berbasis alam di pasar internasional sepanjang tahun.",
        "Paragraf 1 menyatakan keraguan terhadap data resmi lalu menyusun pembandingnya sendiri dari sumber lain yang dikutip pada bagian akhir tulisan ini.",
        "Paragraf 1 memproyeksikan capaian akhir tahun dengan bertumpu pada tren bulanan yang disajikan lembaga statistik dalam laporan terbarunya itu.",
      ],
    }),
  ).length === 0,
  pesan({}),
);
cek(
  "soal PBM tentang kapitalisasi judul tidak dianggap berpilihan kembar",
  periksaButir(
    butir({
      pertanyaan: "Penulisan judul yang paling tepat sesuai kaidah ejaan adalah…",
      opsi: [
        "Meningkatkan Literasi Digital Di Kalangan Pelajar",
        "meningkatkan literasi digital di kalangan pelajar",
        "Meningkatkan Literasi Digital di Kalangan Pelajar",
        "MENINGKATKAN Literasi Digital Di Kalangan Pelajar",
        "Meningkatkan Literasi Digital Di kalangan Pelajar",
      ],
    }),
  ).length === 0,
  "lima pilihan hanya beda kapitalisasi",
);
cek(
  "soal PU yang membawa teksnya sendiri tidak dituduh kehilangan bacaan",
  periksaButir(
    butir({
      stimulus: "",
      pertanyaan:
        "Penurunan populasi di berbagai negara memicu tantangan ekonomi. Hasil riset menunjukkan bahwa menurunnya populasi mengurangi jumlah tenaga kerja, dan hal itu berpengaruh langsung pada produktivitas ekonomi sebuah negara dalam jangka panjang. Manakah simpulan yang PALING DIDUKUNG oleh bacaan tersebut?",
    }),
  ).length === 0,
  "batang soal memuat paragrafnya sendiri",
);
cek(
  "isian singkat tanpa pilihan bersih",
  periksaButir(butir({ tipe: "IS", opsi: [], kunci: "36", pertanyaan: "Nilai b adalah …" })).length === 0,
);

/* ------------------------------------------------------------------ */
judul("2) Kerusakan hasil impor tertangkap");

cek(
  "kalimat pengantar bacaan yang tertelan jadi pilihan E",
  /pengantar bacaan/i.test(
    pesan({
      opsi: ["2.", "3.", "5.", "7.", "9. Teks berikut digunakan untuk menjawab soal nomor 39 dan 40."],
    }),
  ),
  pesan({
    opsi: ["2.", "3.", "5.", "7.", "9. Teks berikut digunakan untuk menjawab soal nomor 39 dan 40."],
  }),
);
cek(
  'bentuk "Bacalah teks berikut dengan saksama untuk menjawab nomor 15—19!" ikut tertangkap',
  /pengantar bacaan/i.test(
    pesan({
      opsi: ["a.", "b.", "c.", "d.", "makhluk. Bacalah teks berikut dengan saksama untuk menjawab nomor 15—19!"],
    }),
  ),
);
cek(
  "pilihan yang menelan kalimat lain terdeteksi dari panjangnya",
  /jauh lebih panjang/i.test(
    pesan({
      opsi: [
        "2.",
        "3.",
        "5.",
        "7.",
        "9. Bagian ini seharusnya tidak berada di sini sama sekali karena ia berasal dari paragraf berikutnya yang panjangnya jauh melampaui pilihan mana pun di atasnya.",
      ],
    }),
  ),
);
cek(
  'baris "Kunci: B" yang tertelan jadi pilihan',
  /Kunci:/.test(pesan({ opsi: ["(1).", "(2).", "(3).", "(4).", "(5). Kunci: B"] })),
);
cek(
  "isian singkat yang masih menyimpan pilihan",
  /isian singkat/i.test(pesan({ tipe: "IS", kunci: "36" })),
);
cek(
  "bacaan hilang pada soal yang menagih bacaan",
  /kolom bacaannya kosong/i.test(
    pesan({ stimulus: "", pertanyaan: "Kata sasaran pada kalimat (8) seharusnya…" }),
  ),
);
cek(
  "gambar naskah dihitung sebagai bacaan, jadi tidak ditandai",
  periksaButir(
    butir({
      stimulus: "",
      gambar_url: "/soal/to/pk-3.png",
      pertanyaan: "Nilai x pada gambar tersebut adalah…",
    }),
  ).length === 0,
);
cek(
  "pilihan kembar persis tertangkap",
  /sama persis/.test(pesan({ opsi: ["merah", "hijau", "merah", "biru", "kuning"] })),
);
cek(
  "kalimat pengantar yang ikut tersimpan di bacaan dilaporkan",
  /Bacaan masih memuat/.test(
    pesan({ stimulus: "Perhatikan teks berikut untuk menjawab soal nomor 21 dan 22! (1) Pegunungan itu panjang." }),
  ),
);
cek(
  '"(Jawaban: 36)" yang bocor ke pertanyaan dilaporkan',
  /kuncinya bocor/.test(pesan({ pertanyaan: "Nilai b adalah … (Jawaban: 36)" })),
);

/* ------------------------------------------------------------------ */
judul("3) teksPolos");

cek(
  "tag dan entitas dibuang tanpa merapatkan kata",
  teksPolos("<p>Wortel <b>baik</b> bagi mata</p><p>&amp; murah</p>") === "Wortel baik bagi mata & murah",
  teksPolos("<p>Wortel <b>baik</b> bagi mata</p><p>&amp; murah</p>"),
);
cek(
  "angka bergaya tidak terpecah oleh tag di tengahnya",
  teksPolos("<b>3</b>6") === "3 6" || teksPolos("<b>3</b>6") === "36",
  teksPolos("<b>3</b>6"),
);

/* ------------------------------------------------------------------ */
/* 4. Mode pratinjau ruang ujian tidak boleh menyentuh server           */
/* ------------------------------------------------------------------ */
judul("4) RuangUjian mode pratinjau - tidak ada jalur yang lolos ke server");

/*
 * Ini pemeriksaan BENTUK SUMBER, bukan perilaku: menjalankan `RuangUjian`
 * butuh DOM, sedangkan yang mahal bila terlewat justru bukan tampilannya,
 * melainkan satu `fetch` yang lupa dijaga - pratinjau admin lalu menulis
 * jawaban, denyut, atau catatan pelanggaran atas nama attempt yang tidak ada.
 *
 * Bila kamu menambah panggilan `/api/exam/...` yang baru, pemeriksaan terakhir
 * di bawah akan GAGAL. Itu memang tujuannya: jaga panggilan barumu dengan
 * `pratinjau` lebih dulu, baru naikkan angkanya di sini.
 */
const ruang = fs.readFileSync(path.join(AKAR, "src", "components", "exam", "RuangUjian.tsx"), "utf8");
const timer = fs.readFileSync(path.join(AKAR, "src", "components", "exam", "TimerUjian.tsx"), "utf8");

const JAGA = [
  ["autosave tidak mengirim jawaban", /if \(pratinjau\) \{\s*setStatus\("tersimpan"\);/, ruang],
  ["pelanggaran tidak pernah dibuka", /if \(pratinjau\) return; \/\/ pratinjau tidak pernah menggugurkan/, ruang],
  ["denyut nadi tidak berjalan", /if \(pratinjau\) return;\s*denyutTerakhir\.current/, ruang],
  ["percobaan curang tidak dilaporkan", /if \(pratinjau\) return;\s*const kini = Date\.now\(\);/, ruang],
  ["beacon penutup subtes dijaga", /if \(!pratinjau\) laporTahanBeku\("\/api\/exam\/denyut"/, ruang],
  ["router\.refresh dijaga", /if \(!pratinjau\) router\.refresh\(\);/, ruang],
  ["timer tahu ia sedang dipratinjau", /pratinjau=\{pratinjau\}/, ruang],
  ["timer melewatkan sinkronisasi jam server", /if \(pratinjau\) return;\s*let batal = false;/, timer],
];
for (const [nama, pola, berkas] of JAGA) {
  cek(nama, pola.test(berkas));
}

// Penjagaan dinyalakan di TIGA tempat, dan ketiganya wajib dijaga `!pratinjau`:
//   1. jalur layar penuh semu (iPhone)
//   2. jalur Fullscreen API
//   3. saat penutupan subtes GAGAL dan peserta tetap tinggal di halaman ini
const penjaga = (ruang.match(/dipantau\.current = !pratinjau;/g) ?? []).length;
cek(
  "penjagaan tidak menyala di ketiga tempat penyalaannya saat pratinjau",
  penjaga === 3,
  `${penjaga} tempat`,
);

// Tempat keempat — melanjutkan subtes tanpa gerbang — memakai `dipantau.current
// = true` tanpa syarat, jadi yang menjaganya adalah nilai turunan di bawah ini.
// Kalau `!pratinjau &&` hilang dari sana, pratinjau admin ikut terpantau dan
// bisa menggugurkan attempt palsu.
cek(
  "lanjut-tanpa-gerbang tidak pernah menyala saat pratinjau",
  /const lanjutTanpaGerbang = useSyncExternalStore\(\s*tanpaLangganan,\s*\(\) =>\s*!pratinjau &&/.test(ruang),
);
cek(
  "penanda gerbang tidak ditulis saat pratinjau",
  (ruang.match(/if \(!pratinjau\) tandaiGerbang\(/g) ?? []).length >= 2,
);

const panggilan = (ruang.match(/"\/api\/exam\/[a-z]+"/g) ?? []).length;
cek(
  "jumlah panggilan /api/exam di RuangUjian masih 7",
  panggilan === 7,
  `${panggilan} panggilan - naikkan angka ini HANYA sesudah panggilan barumu dijaga "pratinjau"`,
);

/* ------------------------------------------------------------------ */
judul(`Ringkasan: ${lulus} lulus, ${gagal} gagal.`);
fs.rmSync(TMP, { recursive: true, force: true });
process.exit(gagal === 0 ? 0 : 1);
