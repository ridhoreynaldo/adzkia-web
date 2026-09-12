/**
 * Pengujian cepat mesin Warung Soal (tanpa framework tes).
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/warung-check.mjs
 *
 * Memakai basis data SQLite sementara lewat ADZKIA_DB_PATH, lalu memeriksa:
 *
 *   1. Kerangka 30 paket per subtes dan pemetaan nomor -> kategori.
 *   2. Pemeriksaan butir untuk ketiga bentuk: PG, PGK (Benar/Salah), dan IS.
 *   3. KUNCI KEMAJUAN: Paket 1 terbuka, paket berikutnya baru terbuka setelah
 *      paket sebelumnya dituntaskan; paket kosong dan paket yang soalnya belum
 *      lengkap ditolak. Sesi berjalan selalu boleh dilanjutkan.
 *   4. Menyimpan jawaban, termasuk penolakan soal di luar sesi dan sesi milik
 *      orang lain.
 *   5. Penilaian: PG, PGK harus tepat seluruh pernyataan, IS dibandingkan
 *      longgar; poin = benar x poin kategori; penutupan sesi idempoten.
 *   6. Sesi yang lewat waktu ditutup sendiri saat dibuka kembali.
 *   7. Papan peringkat: HANYA nilai terbaik tiap paket yang dihitung, poin
 *      dijumlahkan antar-paket, akun admin tidak ikut, waktu jadi pemisah.
 *   8. Impor berkas: pengenalan tipe, kunci PGK berderet, dan penimpaan.
 *   9. Impor NASKAH WORD: nomor yang diketik, penomoran otomatis Word, dan
 *      gaya huruf (miring, pangkat) yang harus tetap utuh sampai ke pilihan.
 *
 * Berkas .ts asli dipakai apa adanya — hanya disalin ke folder sementara DI
 * DALAM proyek (supaya node_modules tetap terjangkau) dengan penambahan
 * ekstensi pada impornya, karena Node 24 sudah bisa menjalankan TypeScript.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import JSZip from "jszip";

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
const TMP = path.join(AKAR, ".tmp", "cek", "warung");

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
process.env.ADZKIA_DB_PATH = path.join(TMP, "cek.db");

// Menelusuri src/lib SECARA REKURSIF: sejak 12 September 2026 isinya
// bersarang per domain (core/, tryout/, ielts/, ...). Salinannya tetap
// diratakan — nama dasarnya unik di seluruh domain.
for (const berkas of fs
  .readdirSync(path.join(AKAR, "src", "lib"), { recursive: true })
  .map((p) => String(p))
  .filter((p) => p.endsWith(".ts"))
  .map((p) => p.split(/[\/]/).pop())) {
  if (!berkas.endsWith(".ts")) continue;
  const sumber = fs.readFileSync(cariDiLib(berkas), "utf8");
  const rapi = sumber
    .replace(/^import "server-only";\s*$/m, "")
    .replace(/from "@\/lib\/(?:[a-z0-9-]+\/)?([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"')
    .replace(/from "\.\/([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"');
  fs.writeFileSync(path.join(TMP, berkas), rapi);
}

const muat = (nama) => import(pathToFileURL(path.join(TMP, `${nama}.ts`)).href);

const dbMod = await muat("db");
const W = await muat("warung");
const A = await muat("warung-admin");
const I = await muat("warung-impor");
const { one, run } = dbMod;

/* ------------------------------------------------------------------ */
/* Perkakas uji                                                        */
/* ------------------------------------------------------------------ */
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

const judul = (t) => console.log(`\n${t}`);

function galatDari(fn) {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

function buatSiswa(nama, nisn) {
  const res = run(
    `INSERT INTO users (nama, nama_login, nisn, kelas, email, password_hash, role)
     VALUES (?, ?, ?, '12 IPA 1', ?, 'x', 'siswa')`,
    nama,
    nama.toLowerCase(),
    nisn,
    `${nisn}@siswa.local`,
  );
  return Number(res.lastInsertRowid);
}

/**
 * Isi sebuah paket dengan butir PG berkunci A.
 * Tanpa argumen `n`, paket diisi sampai jumlah target subtesnya — yaitu
 * ambang yang membuat paket dianggap siap dipakai siswa.
 */
function isiPaket(paket, n) {
  const jumlah = n ?? W.targetSoal(paket.subtes);
  const mulai = W.daftarSoal(paket.id).length;
  for (let i = mulai + 1; i <= jumlah; i++) {
    A.buatSoal({
      paket_id: paket.id,
      nomor: i,
      tipe: "PG",
      stimulus: "",
      pertanyaan: `Soal nomor ${i}`,
      gambar_url: "",
      opsi: ["benar", "salah 1", "salah 2", "salah 3", "salah 4"],
      kunci: "A",
      pembahasan: "Kunci A.",
    });
  }
}

/** Kerjakan seluruh butir sebuah sesi: `benar` butir pertama dijawab tepat. */
function kerjakan(userId, paketId, benar) {
  const sesiId = W.mulaiSesi(userId, paketId);
  const ruang = W.ruangSesi(sesiId, userId);
  ruang.butir.forEach((b, i) => {
    W.simpanJawaban(userId, sesiId, b.id, i < benar ? "A" : "B", false);
  });
  return W.selesaikanSesi(userId, sesiId);
}

/* ================================================================== */
judul("1) Kerangka paket & kategori");

W.siapkanSeluruhKerangka();
cek(
  "Tujuh subtes x 30 paket terbentuk",
  one("SELECT COUNT(*) AS n FROM warung_paket").n === 210,
  `${one("SELECT COUNT(*) AS n FROM warung_paket").n} paket`,
);

W.siapkanSeluruhKerangka();
cek(
  "Menyiapkan ulang tidak menggandakan paket",
  one("SELECT COUNT(*) AS n FROM warung_paket").n === 210,
);

cek("Paket 1-10 kategori Easy", W.kategoriPaket(1).kode === "easy" && W.kategoriPaket(10).kode === "easy");
cek("Paket 11-20 kategori Medium", W.kategoriPaket(11).kode === "medium" && W.kategoriPaket(20).kode === "medium");
cek("Paket 21-30 kategori Hard", W.kategoriPaket(21).kode === "hard" && W.kategoriPaket(30).kode === "hard");
cek("Poin naik bersama tingkat", W.kategoriPaket(1).poin < W.kategoriPaket(15).poin && W.kategoriPaket(15).poin < W.kategoriPaket(25).poin);

const komposisiPu = W.KOMPOSISI.PU;
cek(
  "Komposisi butir sama dengan jumlah soal subtes aslinya",
  komposisiPu.pg + komposisiPu.pgk + komposisiPu.is === komposisiPu.total && komposisiPu.total === 30,
);

const paketPu1 = W.ambilPaketNomor("PU", 1);
const paketPu2 = W.ambilPaketNomor("PU", 2);
const paketPk11 = W.ambilPaketNomor("PK", 11);
cek("Paket baru belum berisi soal", W.daftarSoal(paketPu1.id).length === 0);

/* ================================================================== */
judul("2) Pemeriksaan butir");

const dasar = {
  paket_id: paketPu1.id,
  nomor: 1,
  tipe: "PG",
  stimulus: "",
  pertanyaan: "Uji",
  gambar_url: "",
  opsi: ["satu", "dua", "tiga", "", ""],
  kunci: "A",
  pembahasan: "",
};

cek("PG: kunci di luar pilihan ditolak",
  galatDari(() => A.buatSoal({ ...dasar, kunci: "E" }))?.includes("tidak sah") === true);
cek("PG: pilihan kurang dari dua ditolak",
  galatDari(() => A.buatSoal({ ...dasar, opsi: ["satu", "", "", "", ""] }))?.includes("minimal dua") === true);
cek("Pertanyaan kosong ditolak",
  galatDari(() => A.buatSoal({ ...dasar, pertanyaan: "  " }))?.includes("tidak boleh kosong") === true);
cek("PGK: kunci tidak sepanjang pernyataan ditolak",
  galatDari(() =>
    A.buatSoal({ ...dasar, tipe: "PGK", opsi: ["p1", "p2", "p3", "", ""], kunci: ["B", "S"] }),
  )?.includes("Benar atau Salah") === true);
cek("PGK: kunci selain B/S ditolak",
  galatDari(() =>
    A.buatSoal({ ...dasar, tipe: "PGK", opsi: ["p1", "p2", "", "", ""], kunci: ["B", "X"] }),
  )?.includes("Benar atau Salah") === true);
cek("IS: tanpa kunci ditolak",
  galatDari(() => A.buatSoal({ ...dasar, tipe: "IS", opsi: [], kunci: "  " }))?.includes("kunci jawaban") === true);

const idPgk = A.buatSoal({
  ...dasar,
  nomor: 1,
  tipe: "PGK",
  pertanyaan: "Benar atau salah?",
  opsi: ["pernyataan 1", "pernyataan 2", "pernyataan 3", "", ""],
  kunci: ["B", "S", "B"],
});
cek("PGK tersimpan sebagai larik JSON",
  W.ambilSoal(idPgk).kunci === '["B","S","B"]', W.ambilSoal(idPgk).kunci);

const idIs = A.buatSoal({ ...dasar, nomor: 2, tipe: "IS", opsi: [], kunci: " 12,5 " });
cek("IS menyimpan kunci apa adanya (tanpa pilihan)",
  W.ambilSoal(idIs).kunci === "12,5" && W.bacaOpsi(W.ambilSoal(idIs)).length === 0);

cek("Nomor kembar dalam satu paket ditolak",
  galatDari(() => A.buatSoal({ ...dasar, nomor: 2 }))?.includes("sudah ada") === true);

A.hapusSoal(idPgk);
A.hapusSoal(idIs);

/* ================================================================== */
judul("3) Kunci kemajuan & membuka sesi");

const budi = buatSiswa("Budi Uji", "88880001");
const siti = buatSiswa("Siti Uji", "88880002");

cek("Paket kosong ditolak",
  galatDari(() => W.mulaiSesi(budi, paketPu1.id))?.includes("belum berisi soal") === true);

isiPaket(paketPu1, 5); // baru sebagian dari 30
cek("Paket yang soalnya belum lengkap ditolak",
  galatDari(() => W.mulaiSesi(budi, paketPu1.id))?.includes("masih disiapkan") === true);
cek("Keadaan paket setengah terisi = disiapkan",
  W.keadaanPaket("PU", 1, 5, new Set()) === "disiapkan");

isiPaket(paketPu1); // lengkapi jadi 30
isiPaket(paketPu2);

cek("Paket 1 terbuka tanpa syarat", W.keadaanPaket("PU", 1, 30, new Set()) === "terbuka");
cek("Paket 2 terkunci sebelum Paket 1 tuntas",
  W.keadaanPaket("PU", 2, 30, new Set()) === "terkunci");
cek("Paket 2 terbuka setelah Paket 1 tuntas",
  W.keadaanPaket("PU", 2, 30, new Set([1])) === "terbuka");
cek("Paket 3 tetap terkunci walau Paket 1 tuntas",
  W.keadaanPaket("PU", 3, 30, new Set([1])) === "terkunci");

cek("Mengerjakan paket terkunci ditolak",
  galatDari(() => W.mulaiSesi(budi, paketPu2.id))?.includes("Tuntaskan Paket 1") === true);

const sesiBudi = W.mulaiSesi(budi, paketPu1.id);

cek("Baris jawaban dibuat untuk seluruh soal",
  one("SELECT COUNT(*) AS n FROM warung_jawaban WHERE sesi_id = ?", sesiBudi).n === 30);
cek("Membuka lagi melanjutkan sesi yang sama", W.mulaiSesi(budi, paketPu1.id) === sesiBudi);

const ruangBudi = W.ruangSesi(sesiBudi, budi);
cek("Butir dikirim urut nomor", ruangBudi.butir.every((b, i) => b.nomor === i + 1));
cek("Butir TIDAK memuat kunci maupun pembahasan",
  ruangBudi.butir.every((b) => !("kunci" in b) && !("pembahasan" in b)));
cek("Batas waktu mengikuti durasi resmi subtes",
  ruangBudi.sisaDetik > 29 * 60 && ruangBudi.sisaDetik <= 30 * 60,
  `${ruangBudi.sisaDetik} detik untuk PU (30 menit)`);

/* ================================================================== */
judul("4) Menyimpan jawaban");

const butir1 = ruangBudi.butir[0];
W.simpanJawaban(budi, sesiBudi, butir1.id, "A", true);
const tersimpan = one("SELECT jawaban, ragu FROM warung_jawaban WHERE sesi_id = ? AND soal_id = ?", sesiBudi, butir1.id);
cek("Jawaban dan tanda ragu tersimpan", tersimpan.jawaban === "A" && tersimpan.ragu === 1);

W.simpanJawaban(budi, sesiBudi, butir1.id, "C", false);
cek("Jawaban boleh diubah sebelum sesi ditutup",
  one("SELECT jawaban FROM warung_jawaban WHERE sesi_id = ? AND soal_id = ?", sesiBudi, butir1.id).jawaban === "C");

const soalLuar = W.daftarSoal(paketPu1.id).at(-1);
isiPaket(paketPk11);
const soalPaketLain = W.daftarSoal(paketPk11.id)[0];
cek("Soal di luar sesi ditolak",
  galatDari(() => W.simpanJawaban(budi, sesiBudi, soalPaketLain.id, "A", false))?.includes("tidak ada dalam sesi") === true);
cek("Sesi milik orang lain ditolak",
  galatDari(() => W.simpanJawaban(siti, sesiBudi, soalLuar.id, "A", false))?.includes("bukan milikmu") === true);

/* ================================================================== */
judul("5) Penilaian");

// Paket khusus berisi ketiga bentuk butir.
const paketCampur = W.ambilPaketNomor("PPU", 1);
A.buatSoal({
  paket_id: paketCampur.id, nomor: 1, tipe: "PG", stimulus: "", pertanyaan: "PG",
  gambar_url: "", opsi: ["a", "b", "c", "", ""], kunci: "B", pembahasan: "",
});
A.buatSoal({
  paket_id: paketCampur.id, nomor: 2, tipe: "PGK", stimulus: "", pertanyaan: "PGK",
  gambar_url: "", opsi: ["p1", "p2", "p3", "", ""], kunci: ["B", "S", "B"], pembahasan: "",
});
A.buatSoal({
  paket_id: paketCampur.id, nomor: 3, tipe: "IS", stimulus: "", pertanyaan: "IS",
  gambar_url: "", opsi: [], kunci: "12,5", pembahasan: "",
});
// Lengkapi sampai jumlah target PPU supaya paket dianggap siap.
isiPaket(paketCampur);

const sesiCampur = W.mulaiSesi(siti, paketCampur.id);
const butirCampur = W.ruangSesi(sesiCampur, siti).butir;
W.simpanJawaban(siti, sesiCampur, butirCampur[0].id, "B", false);
W.simpanJawaban(siti, sesiCampur, butirCampur[1].id, JSON.stringify(["B", "S", "B"]), false);
W.simpanJawaban(siti, sesiCampur, butirCampur[2].id, " 12.5 ", false);
const hasilCampur = W.selesaikanSesi(siti, sesiCampur);

cek("Ketiga bentuk butir dinilai benar", hasilCampur.benar === 3, `${hasilCampur.benar} benar`);
cek("IS dibandingkan longgar (12.5 = 12,5)",
  W.pembahasanSesi(sesiCampur, siti).find((p) => p.tipe === "IS").benar === true);
cek("Poin = benar x poin kategori",
  hasilCampur.poin === 3 * W.kategoriPaket(1).poin, `${hasilCampur.poin} poin`);
cek("Sesi tertutup dan waktunya tercatat",
  hasilCampur.status === "finished" && hasilCampur.selesai_at != null);
cek("Menutup dua kali tidak mengubah nilai",
  W.selesaikanSesi(siti, sesiCampur).poin === hasilCampur.poin);

// PGK harus tepat seluruhnya.
const sesiPgk = run(
  `INSERT INTO warung_sesi (user_id, paket_id, deadline_at) VALUES (?, ?, datetime('now','localtime','+30 minutes'))`,
  budi,
  paketCampur.id,
);
const sesiPgkId = Number(sesiPgk.lastInsertRowid);
for (const s of W.daftarSoal(paketCampur.id)) {
  run("INSERT INTO warung_jawaban (sesi_id, soal_id) VALUES (?, ?)", sesiPgkId, s.id);
}
const soalPgk = W.daftarSoal(paketCampur.id).find((s) => s.tipe === "PGK");
W.simpanJawaban(budi, sesiPgkId, soalPgk.id, JSON.stringify(["B", "S", "S"]), false);
const hasilPgk = W.selesaikanSesi(budi, sesiPgkId);
cek("PGK salah satu pernyataan = butir salah", hasilPgk.benar === 0, `${hasilPgk.benar} benar`);
cek("Butir tak terjawab dihitung kosong",
  hasilPgk.kosong === W.daftarSoal(paketCampur.id).length - 1,
  `${hasilPgk.kosong} kosong dari ${W.daftarSoal(paketCampur.id).length} butir`);

/* ================================================================== */
judul("6) Sesi lewat waktu");

const sesiLewat = Number(
  run(
    `INSERT INTO warung_sesi (user_id, paket_id, mulai_at, deadline_at)
     VALUES (?, ?, datetime('now','localtime','-40 minutes'), datetime('now','localtime','-10 minutes'))`,
    siti,
    paketPu1.id,
  ).lastInsertRowid,
);
for (const s of W.daftarSoal(paketPu1.id)) {
  run("INSERT INTO warung_jawaban (sesi_id, soal_id) VALUES (?, ?)", sesiLewat, s.id);
}
run("UPDATE warung_jawaban SET jawaban = 'A' WHERE sesi_id = ? AND soal_id = ?", sesiLewat, W.daftarSoal(paketPu1.id)[0].id);

const ditutup = W.tutupBilaLewatWaktu(W.ambilSesi(sesiLewat, siti));
cek("Sesi kedaluwarsa ditutup saat dibuka", ditutup.status === "finished");
cek("Jawaban yang sempat masuk tetap dinilai", ditutup.benar === 1, `${ditutup.benar} benar`);
cek("Sisa waktu tidak pernah negatif", W.sisaDetikSesi(ditutup) === 0);
cek("Menjawab sesudah waktu habis ditolak", (() => {
  const sesiBaru = Number(
    run(
      `INSERT INTO warung_sesi (user_id, paket_id, deadline_at) VALUES (?, ?, datetime('now','localtime','-1 minutes'))`,
      siti,
      paketPu1.id,
    ).lastInsertRowid,
  );
  const s0 = W.daftarSoal(paketPu1.id)[0];
  run("INSERT INTO warung_jawaban (sesi_id, soal_id) VALUES (?, ?)", sesiBaru, s0.id);
  return galatDari(() => W.simpanJawaban(siti, sesiBaru, s0.id, "A", false))?.includes("sudah habis") === true;
})());

/* ================================================================== */
judul("7) Papan peringkat");

const andi = buatSiswa("Andi Uji", "88880003");
const rina = buatSiswa("Rina Uji", "88880004");
const paketPu3 = W.ambilPaketNomor("PU", 3);
isiPaket(paketPu3); // Paket 4 sengaja dibiarkan kosong

kerjakan(andi, paketPu1.id, 4); // 4 benar
kerjakan(andi, paketPu1.id, 8); // diulang, hasilnya lebih baik
kerjakan(andi, paketPu2.id, 5); // terbuka karena Paket 1 sudah tuntas
kerjakan(rina, paketPu1.id, 8);

cek("Menuntaskan paket membuka paket sesudahnya",
  W.daftarPaketSiswa("PU", andi).find((r) => r.paket.nomor === 3).keadaan === "terbuka");
cek("Paket sesudahnya tetap terkunci bagi yang belum menuntaskan",
  W.daftarPaketSiswa("PU", rina).find((r) => r.paket.nomor === 3).keadaan === "terkunci");
cek("Paket tanpa soal tampil kosong, bukan terkunci",
  W.daftarPaketSiswa("PU", andi).find((r) => r.paket.nomor === 4).keadaan === "kosong");

const papanPu = W.papanSubtes("PU");
const barisAndi = papanPu.find((p) => p.userId === andi);
const poinEasy = W.kategoriPaket(1).poin;

cek("Hanya nilai terbaik tiap paket yang dihitung",
  barisAndi.poin === (8 + 5) * poinEasy, `${barisAndi.poin} poin dari 2 paket`);
cek("Mengulang paket tidak menambah jumlah paket tuntas", barisAndi.paketSelesai === 2);
cek("Peringkat bernomor urut", papanPu.every((p, i) => p.peringkat === i + 1));
cek("Peserta berpoin lebih besar ada di atas", papanPu[0].userId === andi);
cek("Papan subtes lain terpisah", W.papanSubtes("LBING").length === 0);

const adminId = Number(
  run(
    `INSERT INTO users (nama, nama_login, email, password_hash, role) VALUES ('Admin Uji','admin uji','admin@uji.local','x','admin')`,
  ).lastInsertRowid,
);
kerjakan(adminId, paketPu1.id, 10);
cek("Akun admin tidak masuk papan", !W.papanSubtes("PU").some((p) => p.userId === adminId));

const papanPaket1 = W.papanPaket(paketPu1.id);
cek("Papan per paket memakai nilai terbaik peserta",
  papanPaket1.find((p) => p.userId === andi).poin === 8 * poinEasy);

const ringkasPu = W.daftarPaketSiswa("PU", andi);
const barisPaket1 = ringkasPu.find((r) => r.paket.nomor === 1);
cek("Daftar paket siswa menampilkan nilai terbaik", barisPaket1.terbaik.poin === 8 * poinEasy);
cek("Jumlah percobaan ikut terhitung", barisPaket1.percobaan === 2, `${barisPaket1.percobaan}x`);
cek("Daftar paket selalu 30 baris", ringkasPu.length === 30);

const lobi = W.ringkasanLobi(andi);
const lobiPu = lobi.find((l) => l.subtes.kode === "PU");
cek("Lobi menghitung paket yang sudah tuntas", lobiPu.paketSelesai === 2);
cek("Lobi menunjuk paket berikutnya", lobiPu.paketBerikutnya === 3, `Paket ${lobiPu.paketBerikutnya}`);
cek("Lobi memuat ketujuh subtes", lobi.length === 7);
cek("Lobi peserta baru menunjuk Paket 1",
  W.ringkasanLobi(buatSiswa("Nia Uji", "88880009")).find((l) => l.subtes.kode === "PU")
    .paketBerikutnya === 1);

/* ================================================================== */
judul("8) Impor berkas");

const csv = [
  "nomor,tipe,pertanyaan,opsi_a,opsi_b,opsi_c,opsi_d,opsi_e,kunci,pembahasan",
  '1,PG,"Ibu kota Jawa Barat adalah ...",Bandung,Bogor,Bekasi,Cirebon,Depok,A,"Bandung."',
  '2,PGK,"Tentukan benar/salah.","2 bilangan prima","9 bilangan prima","15 habis dibagi 3",,,"B,S,B","Hanya 9 yang bukan prima."',
  '3,IS,"Hasil 45 : 5 ?",,,,,,9,"45 : 5 = 9."',
  '4,PG,"Kunci di luar pilihan",satu,dua,,,,E,"Sengaja salah."',
].join("\n");

const hasilImpor = await I.parseBerkasWarung("uji.csv", new TextEncoder().encode(csv).buffer, {
  folderPaket: "PBM-5",
  simpanGambar: false,
});

cek("Empat baris terbaca", hasilImpor.baris.length === 4);
cek("Tipe butir dikenali",
  hasilImpor.baris[0].tipe === "PG" &&
    hasilImpor.baris[1].tipe === "PGK" &&
    hasilImpor.baris[2].tipe === "IS");
cek("Tiga baris layak simpan", hasilImpor.jumlahValid === 3, `valid ${hasilImpor.jumlahValid}`);
cek("Kunci di luar pilihan ditandai", hasilImpor.baris[3].masalah.length > 0);
cek("Kunci PGK berderet terbaca",
  I.pecahKunciPgk("BSB", 3).join("") === "BSB" && I.pecahKunciPgk("B, S, B", 3).join("") === "BSB");

const paketImpor = W.ambilPaketNomor("PBM", 5);
const simpan = I.simpanImporWarung(paketImpor.id, hasilImpor.baris, false);
cek("Baris layak tersimpan", simpan.disimpan === 3, JSON.stringify(simpan));

const soalImpor = W.daftarSoal(paketImpor.id);
cek("PGK hasil impor tersimpan sebagai larik",
  soalImpor.find((s) => s.tipe === "PGK").kunci === '["B","S","B"]');
cek("IS hasil impor tanpa pilihan",
  W.bacaOpsi(soalImpor.find((s) => s.tipe === "IS")).length === 0);

const ulang = I.simpanImporWarung(paketImpor.id, hasilImpor.baris, false);
cek("Impor ulang tanpa timpa dilewati", ulang.dilewati === 3 && ulang.disimpan === 0);

hasilImpor.baris[0].pertanyaan = "Ibu kota Jawa Barat adalah kota kembang ...";
const timpa = I.simpanImporWarung(paketImpor.id, hasilImpor.baris, true);
cek("Impor dengan timpa memperbarui", timpa.diperbarui === 3);
cek("Isi soal benar-benar berubah",
  W.daftarSoal(paketImpor.id)[0].pertanyaan.includes("kota kembang"));

/* ================================================================== */
judul("9) Impor naskah Word");

/*
 * Pengajar Adzkia menulis soal di Word, dan Word MENGUBAH "1." yang diketik
 * menjadi daftar bernomor otomatis begitu Enter ditekan. Nomornya lalu tidak
 * ada lagi di dalam teks — ia digambar Word saat mencetak. Naskah seperti itu
 * dulu terbaca NOL soal, jadi kedua rupa penomoran diuji berdampingan.
 */
const lolosXml = (v) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Satu potongan teks bergaya: { t, b, i, sup }. */
function runXml(r) {
  const rPr = [];
  if (r.b) rPr.push("<w:b/>");
  if (r.i) rPr.push("<w:i/>");
  if (r.sup) rPr.push('<w:vertAlign w:val="superscript"/>');
  const pra = rPr.length ? `<w:rPr>${rPr.join("")}</w:rPr>` : "";
  return `<w:r>${pra}<w:t xml:space="preserve">${lolosXml(r.t)}</w:t></w:r>`;
}

/** "teks" | ["teks", { daftar: 0 }] | [[{ t, sup }], { daftar: 1 }] */
function parXml(spec) {
  const [isi, opsi] = Array.isArray(spec) ? spec : [spec, {}];
  const o = opsi ?? {};
  const pPr =
    o.daftar !== undefined
      ? `<w:pPr><w:numPr><w:ilvl w:val="${o.daftar}"/><w:numId w:val="1"/></w:numPr></w:pPr>`
      : "";
  const runs = Array.isArray(isi) ? isi.map(runXml).join("") : runXml({ t: isi });
  return `<w:p>${pPr}${runs}</w:p>`;
}

async function naskahWord(baris) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      "</Types>",
  );
  zip.file(
    "word/document.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"' +
      ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"' +
      ' xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">' +
      `<w:body>${baris.map(parXml).join("")}</w:body></w:document>`,
  );
  const buf = await zip.generateAsync({ type: "nodebuffer" });
  return I.parseBerkasWarung(
    "naskah.docx",
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    { folderPaket: "PU-9", simpanGambar: false },
  );
}

/* ---- 9a. nomor yang diketik, tiga bentuk butir sekaligus ---- */
const wordKetik = await naskahWord([
  "1. Hasil dari 12 x 8 adalah ...",
  "A. 84",
  "B. 96",
  "Kunci: B",
  "Pembahasan: 12 x 8 = 96.",
  "Bacaan: Koperasi sekolah mencatat penjualan sepekan.",
  "2. Simpulan yang tepat adalah ...",
  "A. penjualan naik",
  "B. penjualan turun",
  "Kunci: A",
  "Tipe: PGK",
  "3. Tentukan benar/salah tiap pernyataan.",
  "A. 2 bilangan prima",
  "B. 9 bilangan prima",
  "Kunci: B, S",
  "Tipe: IS",
  "4. Berapa hasil 45 : 5 ?",
  "Kunci: 9",
]);

cek("Naskah Word dikenali sebagai naskah, bukan tabel", wordKetik.sumber === "naskah-word");
cek("Empat butir terbaca dari nomor yang diketik", wordKetik.baris.length === 4,
  `terbaca ${wordKetik.baris.length}`);
cek("Semua butir naskah Word layak simpan", wordKetik.jumlahGalat === 0,
  JSON.stringify(wordKetik.baris.flatMap((b) => b.masalah)));
cek("Tipe PGK dan IS terbaca dari baris Tipe:",
  wordKetik.baris[2].tipe === "PGK" && wordKetik.baris[3].tipe === "IS");
cek("Baris Bacaan: menempel ke soal sesudahnya",
  wordKetik.baris[1].stimulus.includes("Koperasi sekolah"));
cek("Isian singkat tidak menyerap baris berawalan huruf", wordKetik.baris[3].opsi.length === 0);

/* ---- 9b. penomoran OTOMATIS Word: teksnya tanpa angka sama sekali ---- */
const wordOtomatis = await naskahWord([
  ["Hasil dari 12 x 8 adalah ...", { daftar: 0 }],
  ["84", { daftar: 1 }],
  ["96", { daftar: 1 }],
  "Kunci: B",
  ["Ibu kota Jawa Barat adalah ...", { daftar: 0 }],
  "A. Bandung",
  "B. Bogor",
  "Kunci: A",
]);

cek("Soal berpenomoran otomatis Word terbaca", wordOtomatis.baris.length === 2,
  `terbaca ${wordOtomatis.baris.length}`);
cek("Nomornya diisi urut walau tidak tertulis",
  wordOtomatis.baris[0].nomor === 1 && wordOtomatis.baris[1].nomor === 2);
cek("Pilihan daftar otomatis jadi opsi, bukan lanjutan pertanyaan",
  wordOtomatis.baris[0].opsi.length === 2 && !wordOtomatis.baris[0].pertanyaan.includes("84"));
cek("Soal otomatis boleh berpilihan yang diketik",
  wordOtomatis.baris[1].opsi.join("|") === "Bandung|Bogor");
cek("Naskah penomoran otomatis tidak menyisakan catatan galat",
  wordOtomatis.catatan.length === 0, JSON.stringify(wordOtomatis.catatan));

/* ---- 9c. gaya huruf: pangkat menentukan arti soal PK dan PM ---- */
const wordGaya = await naskahWord([
  [[{ t: "1. Nilai " }, { t: "x", i: true }, { t: "2", sup: true }, { t: " terbesar adalah ..." }]],
  [[{ t: "A. 3" }, { t: "2", sup: true }]],
  [[{ t: "B. " }, { t: "9", b: true }]],
  "Kunci: A",
]);

cek("Miring dan pangkat pada pertanyaan dipertahankan",
  wordGaya.baris[0].pertanyaan === "Nilai <i>x</i><sup>2</sup> terbesar adalah ...",
  wordGaya.baris[0].pertanyaan);
cek("Pangkat pada pilihan dipertahankan",
  wordGaya.baris[0].opsi[0] === "3<sup>2</sup>", wordGaya.baris[0].opsi[0]);
cek("Cetak tebal pada pilihan dipertahankan",
  wordGaya.baris[0].opsi[1] === "<b>9</b>", wordGaya.baris[0].opsi[1]);

/* ------------------------------------------------------------------ */
console.log("\n" + "=".repeat(64));
console.log(`RINGKASAN: ${lulus} lulus, ${gagal} gagal.`);
console.log("Papan peringkat PU pada basis data uji:");
for (const p of W.papanSubtes("PU").slice(0, 3)) {
  console.log(
    `  #${p.peringkat} ${p.nama.padEnd(12)} ${String(p.poin).padStart(4)} poin  ${p.paketSelesai} paket`,
  );
}
console.log("=".repeat(64));

try {
  dbMod.db.close();
} catch {
  /* abaikan */
}
fs.rmSync(TMP, { recursive: true, force: true });

process.exit(gagal === 0 ? 0 : 1);
