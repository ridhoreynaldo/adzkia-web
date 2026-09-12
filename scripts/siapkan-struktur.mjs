/**
 * Membuat cermin struktur folder PRODUKSI di komputer sendiri.
 *
 *     npm run infra:lokal
 *
 * Di server, seluruh data yang harus bertahan hidup di `/srv/adzkia/`. Skrip
 * ini membuat bentuk yang SAMA PERSIS di `.lokal/`, sehingga urutan folder,
 * nama folder, dan tempat berkas rahasia tidak berbeda antara laptop dan
 * server. Bedanya cuma akarnya.
 *
 * KENAPA ITU PENTING, dan bukan sekadar kerapian: perbedaan jalur adalah
 * sumber paling sering dari kelas bug "jalan di laptop, gagal di server" —
 * folder unggahan yang ternyata tidak ada, berkas rahasia yang dicari di
 * tempat lain, cadangan yang menulis ke folder yang tidak pernah dicadangkan.
 * Menyamakan bentuknya membuat kesalahan semacam itu muncul di laptop, saat
 * masih murah.
 *
 * AMAN DIJALANKAN BERULANG KALI. Folder yang sudah ada tidak disentuh, dan
 * TIDAK ADA satu berkas pun yang ditimpa.
 */
import fs from "node:fs";
import path from "node:path";

const AKAR = path.resolve(import.meta.dirname, "..");
const LOKAL = path.join(AKAR, ".lokal");

/**
 * Bentuknya mengikuti docs/production-architecture.md bagian 2.
 *
 * `app/` sengaja TIDAK ada di sini: di laptop, kodenya ya folder proyek ini
 * sendiri. Yang dicerminkan hanya bagian yang di server berada DI LUAR kode —
 * dan justru itulah bagian yang tidak boleh ikut terhapus saat rilis.
 */
const FOLDER = [
  "data/postgres",
  "data/redis",
  "data/unggahan/soal",
  "data/unggahan/peserta",
  "data/unggahan/warung",
  "data/unggahan/audio",
  "rahasia/pgbouncer",
  "cadangan/harian",
  "cadangan/unggahan",
  "log/nginx",
  "log/app",
];

const PENANDA = {
  "rahasia/BACA-SAYA.txt":
    "Folder ini adalah cermin /srv/adzkia/rahasia di server.\n" +
    "\n" +
    "JANGAN pernah menaruh isinya ke dalam Git. Seluruh .lokal/ sudah masuk\n" +
    ".gitignore, tetapi pagar itu hanya berlaku untuk repositori ini — jangan\n" +
    "menyalin isinya ke tempat lain.\n" +
    "\n" +
    "Di server, folder ini berisi:\n" +
    "  .env                   — kredensial produksi\n" +
    "  pgbouncer/userlist.txt — verifier SCRAM, lihat infra/pgbouncer/userlist.txt.example\n",

  "cadangan/BACA-SAYA.txt":
    "Cermin /srv/adzkia/cadangan.\n" +
    "\n" +
    "Yang WAJIB dicadangkan di server hanya dua, dan keduanya ada di data/:\n" +
    "  data/postgres   — lewat pg_dump, bukan dengan menyalin foldernya\n" +
    "  data/unggahan   — lewat rsync\n" +
    "\n" +
    "data/redis TIDAK perlu dicadangkan: Redis di sini murni cache dan\n" +
    "sengaja tanpa persistensi. Seluruh kebenarannya ada di PostgreSQL.\n",
};

let dibuat = 0;
for (const f of FOLDER) {
  const jalur = path.join(LOKAL, f);
  if (fs.existsSync(jalur)) continue;
  fs.mkdirSync(jalur, { recursive: true });
  dibuat++;
}

let penanda = 0;
for (const [nama, isi] of Object.entries(PENANDA)) {
  const jalur = path.join(LOKAL, nama);
  // TIDAK menimpa: berkas yang sudah ada mungkin sudah disunting orang.
  if (fs.existsSync(jalur)) continue;
  fs.mkdirSync(path.dirname(jalur), { recursive: true });
  fs.writeFileSync(jalur, isi);
  penanda++;
}

console.log(`Cermin struktur produksi siap di ${path.relative(AKAR, LOKAL)}/`);
console.log(`  folder dibuat  : ${dibuat} (dari ${FOLDER.length})`);
console.log(`  penanda ditulis: ${penanda}`);
console.log("");
console.log("Bentuknya sama dengan /srv/adzkia/ di server — lihat");
console.log("docs/production-architecture.md bagian 2.");
