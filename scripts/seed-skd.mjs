/**
 * Paket contoh SKD Kedinasan — dipakai menguji alur satu sesi 100 menit,
 * penilaian poin resmi, dan passing grade.
 *
 * Soalnya karangan sendiri untuk keperluan uji coba, BUKAN naskah resmi.
 * Jalankan: npm run seed:skd
 */
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const DB_PATH = process.env.ADZKIA_DB_PATH ?? path.join(process.cwd(), "data", "adzkia.db");
const KODE = "TO-SKD-DEMO";

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA foreign_keys = ON");
db.exec("PRAGMA busy_timeout = 10000");

/* ------------------------------------------------------------------ */
/* Soal contoh                                                          */
/* ------------------------------------------------------------------ */

const TWK = [
  {
    pertanyaan:
      "Sila keempat Pancasila mengandung nilai utama berupa …",
    opsi: [
      "Ketuhanan yang berkeadaban",
      "Kemanusiaan yang adil",
      "Musyawarah untuk mufakat",
      "Persatuan dalam keberagaman",
      "Keadilan sosial bagi seluruh rakyat",
    ],
    kunci: "C",
    pembahasan:
      "Sila keempat berbunyi 'Kerakyatan yang dipimpin oleh hikmat kebijaksanaan dalam permusyawaratan/perwakilan', yang intinya musyawarah untuk mufakat.",
  },
  {
    pertanyaan: "Lembaga yang berwenang menguji undang-undang terhadap UUD 1945 adalah …",
    opsi: ["Mahkamah Agung", "Mahkamah Konstitusi", "Komisi Yudisial", "DPR", "MPR"],
    kunci: "B",
    pembahasan:
      "Pengujian undang-undang terhadap UUD 1945 merupakan kewenangan Mahkamah Konstitusi sesuai Pasal 24C UUD 1945.",
  },
  {
    pertanyaan: "Bhinneka Tunggal Ika diambil dari kitab …",
    opsi: ["Negarakertagama", "Sutasoma", "Pararaton", "Arjunawiwaha", "Smaradahana"],
    kunci: "B",
    pembahasan:
      "Semboyan Bhinneka Tunggal Ika berasal dari Kakawin Sutasoma karya Mpu Tantular pada masa Majapahit.",
  },
  {
    pertanyaan:
      "Sikap bela negara yang paling tepat dilakukan seorang pelajar dalam kehidupan sehari-hari adalah …",
    opsi: [
      "Ikut latihan militer dasar",
      "Menolak semua produk asing",
      "Belajar sungguh-sungguh dan menaati aturan sekolah",
      "Mengikuti setiap unjuk rasa",
      "Menyimpan senjata untuk berjaga",
    ],
    kunci: "C",
    pembahasan:
      "Bela negara bagi pelajar diwujudkan lewat perannya sendiri: menuntut ilmu dengan sungguh-sungguh dan menaati aturan.",
  },
  {
    pertanyaan: "Amandemen UUD 1945 dilakukan sebanyak … kali.",
    opsi: ["Dua", "Tiga", "Empat", "Lima", "Enam"],
    kunci: "C",
    pembahasan: "UUD 1945 diamandemen empat kali, yaitu pada 1999, 2000, 2001, dan 2002.",
  },
];

const TIU = [
  {
    pertanyaan: "PADI : BERAS = KAPAS : …",
    opsi: ["Benang", "Kain", "Baju", "Serat", "Pintal"],
    kunci: "A",
    pembahasan:
      "Padi diolah menjadi beras (hasil olahan pertama). Kapas diolah menjadi benang sebagai hasil olahan pertamanya.",
  },
  {
    pertanyaan: "Deret: 3, 7, 15, 31, 63, … Angka berikutnya adalah …",
    opsi: ["95", "111", "127", "128", "131"],
    kunci: "C",
    pembahasan: "Polanya dikali 2 lalu ditambah 1: 63 × 2 + 1 = 127.",
  },
  {
    pertanyaan:
      "Semua siswa yang rajin membaca memiliki kosakata luas. Sebagian siswa kelas XII rajin membaca. Simpulan yang tepat adalah …",
    opsi: [
      "Semua siswa kelas XII berkosakata luas",
      "Sebagian siswa kelas XII berkosakata luas",
      "Tidak ada siswa kelas XII yang berkosakata luas",
      "Semua yang berkosakata luas adalah siswa kelas XII",
      "Tidak dapat disimpulkan",
    ],
    kunci: "B",
    pembahasan:
      "Sebagian siswa kelas XII rajin membaca, dan semua yang rajin membaca berkosakata luas — maka sebagian siswa kelas XII berkosakata luas.",
  },
  {
    pertanyaan:
      "Sebuah pekerjaan selesai dalam 12 hari oleh 8 orang. Bila dikerjakan 6 orang, pekerjaan itu selesai dalam …",
    opsi: ["9 hari", "14 hari", "16 hari", "18 hari", "20 hari"],
    kunci: "C",
    pembahasan:
      "Perbandingan berbalik nilai: 8 × 12 = 6 × x, sehingga x = 96 ÷ 6 = 16 hari.",
  },
  {
    pertanyaan: "Jika 40% dari suatu bilangan adalah 70, maka 25% dari bilangan itu adalah …",
    opsi: ["35", "43,75", "45", "50", "52,5"],
    kunci: "B",
    pembahasan: "Bilangannya 70 ÷ 0,4 = 175. Maka 25% × 175 = 43,75.",
  },
];

/**
 * TKP tidak punya jawaban benar/salah — tiap pilihan bernilai 1 sampai 5.
 * `bobot` disusun sesuai urutan pilihan A, B, C, D, E.
 */
const TKP = [
  {
    pertanyaan:
      "Kamu ditunjuk menjadi ketua panitia kegiatan sekolah, padahal pekan itu ulanganmu menumpuk. Sikapmu …",
    opsi: [
      "Menolak karena ulangan lebih penting",
      "Menerima, lalu membagi tugas ke anggota dan menyusun jadwal belajar",
      "Menerima tetapi menyerahkan hampir semua pekerjaan ke anggota",
      "Menerima sambil mengeluh kepada teman-teman",
      "Meminta kegiatan diundur sampai ulangan selesai",
    ],
    bobot: [1, 5, 2, 2, 3],
    pembahasan:
      "Nilai tertinggi ada pada sikap yang tetap menerima tanggung jawab sekaligus mengelola waktu dan mendelegasikan secara wajar.",
  },
  {
    pertanyaan: "Kamu menemukan kesalahan hitung pada laporan yang sudah diserahkan ketua kelas. Kamu …",
    opsi: [
      "Diam saja karena laporan sudah diserahkan",
      "Memberi tahu ketua kelas dan menawarkan bantuan memperbaiki",
      "Menceritakan kesalahannya kepada teman lain",
      "Menunggu ditanya guru baru menjelaskan",
      "Langsung melapor ke guru tanpa memberi tahu ketua kelas",
    ],
    bobot: [1, 5, 1, 2, 3],
    pembahasan:
      "Integritas ditunjukkan dengan menyampaikan kesalahan lebih dulu kepada pihak bersangkutan sambil menawarkan solusi.",
  },
  {
    pertanyaan: "Sekolah menerapkan aplikasi presensi baru yang belum kamu kuasai. Kamu …",
    opsi: [
      "Meminta teman mengisikan presensiku",
      "Mempelajari panduannya sampai bisa, lalu membantu teman lain",
      "Menunggu sampai ada pelatihan resmi",
      "Mencoba seadanya, kalau gagal lapor ke guru",
      "Mengusulkan kembali ke presensi manual",
    ],
    bobot: [1, 5, 2, 3, 1],
    pembahasan:
      "Kemampuan beradaptasi terhadap teknologi informasi bernilai tertinggi bila disertai inisiatif membantu orang lain.",
  },
  {
    pertanyaan: "Ada teman sekelas berbeda suku yang jarang diajak berkelompok. Kamu …",
    opsi: [
      "Mengikuti kebiasaan kelas",
      "Mengajaknya bergabung ke kelompokku dan mengenalkannya ke yang lain",
      "Menyapanya sesekali saja",
      "Melaporkan hal ini ke wali kelas",
      "Membiarkan karena bukan urusanku",
    ],
    bobot: [1, 5, 3, 4, 1],
    pembahasan:
      "Kepekaan sosial budaya paling tinggi ditunjukkan dengan tindakan langsung merangkul, bukan sekadar melapor atau membiarkan.",
  },
  {
    pertanyaan: "Kamu dimintai tolong adik kelas menjelaskan materi saat kamu sedang sibuk. Kamu …",
    opsi: [
      "Menolak karena sedang sibuk",
      "Menyanggupi dan menentukan waktu yang pas untuk menjelaskannya",
      "Menyuruhnya bertanya ke orang lain",
      "Menjelaskan sekilas agar cepat selesai",
      "Menyuruhnya menunggu tanpa kepastian",
    ],
    bobot: [2, 5, 2, 3, 1],
    pembahasan:
      "Pelayanan publik terbaik adalah tetap menolong dengan mengatur waktu, bukan menolak maupun asal cepat.",
  },
];

/* ------------------------------------------------------------------ */

function paketAda() {
  return db.prepare("SELECT id FROM packages WHERE kode = ?").get(KODE);
}

const ada = paketAda();
let packageId;

if (ada) {
  packageId = ada.id;
  db.prepare("UPDATE packages SET jalur = 'skd' WHERE id = ?").run(packageId);
  db.prepare("DELETE FROM questions WHERE package_id = ?").run(packageId);
  console.log(`  Paket ${KODE} sudah ada (id ${packageId}) — soalnya ditulis ulang.`);
} else {
  const res = db
    .prepare(
      `INSERT INTO packages (kode, nama, jalur, deskripsi, status, acak_soal, tampil_pembahasan)
       VALUES (?, ?, 'skd', ?, 'published', 0, 1)`,
    )
    .run(
      KODE,
      "SKD Kedinasan — Paket Demo",
      "Paket demo SKD Kedinasan berisi contoh butir TWK, TIU, dan TKP. Dipakai untuk mencoba alur satu sesi, penilaian poin resmi, dan passing grade. Soal karangan, bukan naskah resmi.",
    );
  packageId = Number(res.lastInsertRowid);
  console.log(`  Paket ${KODE} dibuat (id ${packageId}).`);
}

const sisip = db.prepare(
  `INSERT INTO questions (package_id, subtes, nomor, tipe, level, pertanyaan, opsi, bobot_opsi, kunci, pembahasan)
   VALUES (?, ?, ?, 'PG', ?, ?, ?, ?, ?, ?)`,
);

let jumlah = 0;
for (const [subtes, daftar] of [
  ["TWK", TWK],
  ["TIU", TIU],
  ["TKP", TKP],
]) {
  daftar.forEach((s, i) => {
    const tkp = subtes === "TKP";
    sisip.run(
      packageId,
      subtes,
      i + 1,
      tkp ? "C4" : "C3",
      s.pertanyaan,
      JSON.stringify(s.opsi),
      tkp ? JSON.stringify(s.bobot) : null,
      // TKP tidak punya kunci tunggal; diisi pilihan bernilai tertinggi supaya
      // kolom NOT NULL tetap terisi dan pembahasan tetap bisa menyorotinya.
      tkp ? String.fromCharCode(65 + s.bobot.indexOf(Math.max(...s.bobot))) : s.kunci,
      s.pembahasan,
    );
    jumlah++;
  });
}

const rekap = db
  .prepare("SELECT subtes, COUNT(*) AS n FROM questions WHERE package_id = ? GROUP BY subtes")
  .all(packageId);

console.log(`\n  ${jumlah} soal dimasukkan:`);
for (const r of rekap) console.log(`    ${r.subtes.padEnd(4)} -> ${r.n} soal`);
console.log(`\n  Buka Admin -> Paket Tryout untuk mengelola paket ${KODE}.`);
console.log("  Catatan: paket demo ini berstatus TERBIT supaya langsung bisa dicoba.\n");
