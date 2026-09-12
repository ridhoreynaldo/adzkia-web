/**
 * Pengujian kunci "satu akun peserta, satu perangkat, satu peramban"
 * (tanpa framework tes).
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/sesi-peserta-check.mjs
 *
 * Aturan ini ditetapkan pengelola 8 September 2026 dan gampang dibuat setengah
 * jalan — dan setengah jalan berarti dua orang bisa mengerjakan satu akun
 * berbarengan tanpa ada yang tahu. Yang diuji:
 *
 *   1. KLAIM. Perangkat pertama memegang sesi; perangkat KEDUA yang ditolak,
 *      bukan perangkat pertama yang ditendang.
 *   2. COOKIE. Hanya `sid` yang tercatat yang diakui; cookie lama mati.
 *   3. AKTIVITAS. Peserta yang sedang mengerjakan soal tidak boleh direbut —
 *      denyut ruang ujian menyegarkan penanda waktunya tiap lima detik.
 *   4. MENGANGGUR. Sesi yang benar-benar ditinggalkan boleh diambil alih;
 *      inilah katup pengaman supaya laptop yang mati tidak mengunci akun.
 *   5. KELUAR & PELEPASAN PENGAWAS. Keduanya membebaskan akun seketika.
 *   6. TERPISAH DARI KUNCI ADMIN. Melepas kunci peserta tidak boleh menyentuh
 *      sesi pengelola yang sedang mengawasi, dan sebaliknya.
 *   7. PEMASANGANNYA DI APLIKASI. Login menolak, `getSession` menjaga, dan
 *      tombol Keluar melepas — diperiksa langsung di berkas sumbernya, karena
 *      logika sesempurna apa pun tidak berarti bila tidak dipanggil.
 *
 * Berkas .ts asli dipakai apa adanya — hanya disalin ke folder sementara DI
 * DALAM proyek (supaya node_modules terjangkau) dengan penambahan ekstensi
 * pada impornya, karena Node 24 sudah bisa menjalankan TypeScript.
 */
import fs from "node:fs";
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
const TMP = path.join(AKAR, ".tmp", "cek", "sesi-peserta");

fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
process.env.ADZKIA_DB_PATH = path.join(TMP, "cek.db");

const rapikan = (sumber) =>
  sumber
    .replace(/^import "server-only";\s*$/m, "")
    .replace(/from "@\/lib\/(?:[a-z0-9-]+\/)?([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"')
    .replace(/from "\.\/([a-zA-Z0-9_-]+)"/g, 'from "./$1.ts"');

// Menelusuri src/lib SECARA REKURSIF: sejak 12 September 2026 isinya
// bersarang per domain (core/, tryout/, ielts/, ...). Salinannya tetap
// diratakan — nama dasarnya unik di seluruh domain.
for (const berkas of fs
  .readdirSync(path.join(AKAR, "src", "lib"), { recursive: true })
  .map((p) => String(p))
  .filter((p) => p.endsWith(".ts"))
  .map((p) => p.split(/[\/]/).pop())) {
  if (!berkas.endsWith(".ts")) continue;
  fs.writeFileSync(
    path.join(TMP, berkas),
    rapikan(fs.readFileSync(cariDiLib(berkas), "utf8")),
  );
}

const muat = (nama) => import(pathToFileURL(path.join(TMP, `${nama}.ts`)).href);

const { one, run } = await muat("db");
const S = await muat("sesi-peserta");
const A = await muat("sesi-admin");

let gagal = 0;
function periksa(nama, syarat, tambahan = "") {
  if (syarat) {
    console.log("  ✓ " + nama);
  } else {
    gagal++;
    console.log("  ✗ " + nama + (tambahan ? " — " + tambahan : ""));
  }
}

const fsPath = (p) => path.join(AKAR, "src", p);
const baca = (p) => fs.readFileSync(fsPath(p), "utf8");

/** Memundurkan penanda aktivitas, meniru sesi yang ditinggalkan sekian menit. */
const menganggurkan = (userId, menit) =>
  run(
    "UPDATE peserta_sesi SET terakhir_at = datetime('now', ?) WHERE user_id = ?",
    `-${menit} minutes`,
    userId,
  );

const siswa = (id) =>
  run(
    "INSERT INTO users (id, nama, email, password_hash, role, nisn) VALUES (?, ?, ?, 'x', 'siswa', ?)",
    id,
    `Siswa ${id}`,
    `siswa${id}@cek.local`,
    `00${id}`,
  );

siswa(1);
siswa(2);
run(
  "INSERT INTO users (id, nama, email, password_hash, role) VALUES (9, 'Pengelola', 'admin@cek.local', 'x', 'admin')",
);

/* ------------------------------------------------------------------ */
console.log("\n1. Perangkat pertama memegang akun, perangkat kedua ditolak");
/* ------------------------------------------------------------------ */

periksa("belum ada kunci sebelum login", S.sesiPesertaAktif(1) === undefined);

S.klaimSesiPeserta(1, "sid-laptop", "Windows · Chrome");
const sesi1 = S.sesiPesertaAktif(1);
periksa("kunci tercatat sesudah login", sesi1 !== undefined);
periksa("sid tersimpan apa adanya", sesi1?.sid === "sid-laptop");
periksa("label perangkat tersimpan", sesi1?.alat === "Windows · Chrome");
periksa(
  "hanya ada SATU baris untuk akun ini",
  Number(one("SELECT COUNT(*) AS n FROM peserta_sesi WHERE user_id = 1")?.n) === 1,
);
periksa("perangkat kedua melihat akun sedang dipakai", S.sesiPesertaAktif(1) !== undefined);

// Peramban kedua di komputer YANG SAMA juga login kedua: cookie Chrome tidak
// pernah terbaca Firefox, jadi ia datang tanpa sid dan harus ditolak juga.
periksa("peramban kedua tanpa cookie sah ditolak", S.sentuhSesiPeserta(1, null) === false);

const pesan = S.pesanSesiPesertaDipakai(sesi1);
periksa("pesan penolakan menyebut perangkatnya", pesan.includes("Windows · Chrome"), pesan);
periksa("pesan penolakan menyebut jalan keluarnya (tombol Keluar)", /Keluar/.test(pesan));
periksa("pesan penolakan menyebut pengawas sebagai penolong", /pengawas/i.test(pesan));

/* ------------------------------------------------------------------ */
console.log("\n2. Cookie mana yang diakui");
/* ------------------------------------------------------------------ */

periksa("cookie perangkat pertama diakui", S.sentuhSesiPeserta(1, "sid-laptop") === true);
periksa("cookie dengan sid lain ditolak", S.sentuhSesiPeserta(1, "sid-hp") === false);
periksa("cookie tanpa sid (terbitan lama) ditolak", S.sentuhSesiPeserta(1, null) === false);
periksa("akun yang tidak punya kunci ditolak", S.sentuhSesiPeserta(2, "sid-apa-saja") === false);

/* ------------------------------------------------------------------ */
console.log("\n3. Peserta yang sedang mengerjakan tidak boleh direbut");
/* ------------------------------------------------------------------ */

menganggurkan(1, S.JEDA_MENGANGGUR_MENIT - 1);
periksa("sesi hampir menganggur masih terkunci", S.sesiPesertaAktif(1) !== undefined);
periksa("denyut ruang ujian menyegarkan sesi", S.sentuhSesiPeserta(1, "sid-laptop") === true);
periksa(
  "sesudah disegarkan, sesi tidak lagi mendekati batas",
  Number(
    one(
      "SELECT (terakhir_at > datetime('now', '-1 minutes')) AS baru FROM peserta_sesi WHERE user_id = 1",
    )?.baru,
  ) === 1,
);
// Ruang ujian berdenyut tiap lima detik, jadi selama halaman ujiannya terbuka
// jendela menganggur ini TIDAK PERNAH terbuka untuk orang lain.
const D = await muat("denyut");
periksa(
  "jeda menganggur jauh lebih panjang daripada jarak denyut ruang ujian",
  S.JEDA_MENGANGGUR_MENIT * 60 * 1000 > D.JEDA_DENYUT * 50,
);

/* ------------------------------------------------------------------ */
console.log("\n4. Sesi yang benar-benar ditinggalkan boleh diambil alih");
/* ------------------------------------------------------------------ */

menganggurkan(1, S.JEDA_MENGANGGUR_MENIT + 1);
periksa("sesi yang menganggur dianggap lepas", S.sesiPesertaAktif(1) === undefined);
periksa(
  "tetapi cookie lama masih dikenali selama belum direbut",
  S.sentuhSesiPeserta(1, "sid-laptop") === true,
);

menganggurkan(1, S.JEDA_MENGANGGUR_MENIT + 1);
S.klaimSesiPeserta(1, "sid-pengganti", "Windows · Firefox");
periksa("perangkat pengganti memegang akun", S.sesiPesertaAktif(1)?.sid === "sid-pengganti");
periksa(
  "cookie perangkat lama MATI sesudah direbut",
  S.sentuhSesiPeserta(1, "sid-laptop") === false,
);
periksa(
  "pengambilalihan tidak menggandakan baris",
  Number(one("SELECT COUNT(*) AS n FROM peserta_sesi WHERE user_id = 1")?.n) === 1,
);

/* ------------------------------------------------------------------ */
console.log("\n5. Keluar dan pelepasan oleh pengawas");
/* ------------------------------------------------------------------ */

S.lepasSesiPeserta(1, "sid-laptop"); // cookie basi
periksa(
  "cookie basi tidak bisa melepas kunci perangkat yang sah",
  S.sesiPesertaAktif(1)?.sid === "sid-pengganti",
);

S.lepasSesiPeserta(1, "sid-pengganti");
periksa("tombol Keluar membebaskan akun seketika", S.sesiPesertaAktif(1) === undefined);
periksa(
  "barisnya benar-benar dibuang",
  Number(one("SELECT COUNT(*) AS n FROM peserta_sesi WHERE user_id = 1")?.n) === 0,
);

// Katup pengaman hari-H: laptop peserta mati, pengawas melepaskannya tanpa sid.
S.klaimSesiPeserta(1, "sid-mati", "Windows · Edge");
S.lepasSesiPeserta(1, null);
periksa("pengawas bisa melepaskan paksa tanpa sid", S.sesiPesertaAktif(1) === undefined);

/* ------------------------------------------------------------------ */
console.log("\n6. Ringkasan untuk panel pengawas");
/* ------------------------------------------------------------------ */

periksa("akun bebas terbaca 'tidak ada kunci'", S.ringkasSesiPeserta(1).ada === false);

S.klaimSesiPeserta(1, "sid-baru", "Mac · Safari");
const r1 = S.ringkasSesiPeserta(1);
periksa("akun terkunci terbaca terkunci", r1.ada === true && r1.terkunci === true);
periksa("perangkatnya ikut terbaca", r1.alat === "Mac · Safari");
periksa("sesi yang baru saja aktif tidak mengaku menganggur berjam-jam", r1.diamMenit === 0);

menganggurkan(1, S.JEDA_MENGANGGUR_MENIT + 3);
const r2 = S.ringkasSesiPeserta(1);
periksa("sesi menganggur terbaca sudah bebas", r2.ada === true && r2.terkunci === false);
periksa(
  "lama menganggurnya terhitung benar (bukan meleset 7 jam karena zona waktu)",
  r2.diamMenit >= S.JEDA_MENGANGGUR_MENIT + 2 && r2.diamMenit <= S.JEDA_MENGANGGUR_MENIT + 4,
  "dapat " + r2.diamMenit,
);
S.lepasSesiPeserta(1, null);

/* ------------------------------------------------------------------ */
console.log("\n7. Kunci peserta dan kunci pengelola tidak saling mengganggu");
/* ------------------------------------------------------------------ */

S.klaimSesiPeserta(1, "sid-p1", "Windows · Chrome");
S.klaimSesiPeserta(2, "sid-p2", "Android · Chrome");
A.klaimSesiAdmin(9, "sid-admin", "Windows · Edge");

periksa("dua peserta berbeda boleh online bersamaan", S.sesiPesertaAktif(2)?.sid === "sid-p2");
periksa("kunci peserta 1 tidak terganggu", S.sesiPesertaAktif(1)?.sid === "sid-p1");

S.lepasSesiPeserta(1, null);
periksa("melepas kunci peserta tidak menyentuh sesi pengelola", A.sesiAdminAktif(9) !== undefined);
periksa("dan tidak menyentuh peserta lain", S.sesiPesertaAktif(2)?.sid === "sid-p2");

A.lepasSesiAdmin(9, null);
periksa("melepas sesi pengelola tidak menyentuh kunci peserta", S.sesiPesertaAktif(2) !== undefined);

periksa(
  "peserta dan pengelola memakai TABEL yang berbeda",
  Number(one("SELECT COUNT(*) AS n FROM peserta_sesi WHERE user_id = 9")?.n) === 0,
);
periksa(
  "jeda menganggur peserta lebih pendek daripada pengelola",
  S.JEDA_MENGANGGUR_MENIT < A.JEDA_MENGANGGUR_MENIT,
);

// Akun terhapus tidak boleh meninggalkan kunci menggantung — kalau tertinggal,
// akun baru dengan id yang sama akan lahir dalam keadaan terkunci.
run("DELETE FROM users WHERE id = 2");
periksa(
  "menghapus akun peserta ikut membuang kuncinya (ON DELETE CASCADE)",
  Number(one("SELECT COUNT(*) AS n FROM peserta_sesi WHERE user_id = 2")?.n) === 0,
);

/* ------------------------------------------------------------------ */
console.log("\n8. Terpasang di aplikasi, bukan cuma ada di pustaka");
/* ------------------------------------------------------------------ */

const auth = baca("lib/auth.ts");
const aksi = baca("lib/auth-actions.ts");

periksa(
  "getSession menjaga peserta, bukan hanya admin",
  /sentuhSesiPeserta\(u\.id, sid\)/.test(auth),
);
periksa(
  "cookie tanpa sid tidak diloloskan diam-diam",
  /if \(!sah\) return null;/.test(auth),
);
periksa("tombol Keluar melepas kunci peserta", /lepasSesiPeserta\(id, sid\)/.test(auth));
periksa(
  "login peserta menolak perangkat kedua",
  /sesiPesertaAktif\(user\.id\)/.test(aksi) && /pesanSesiPesertaDipakai\(dipakai\)/.test(aksi),
);
periksa(
  "login peserta mengklaim sesi lengkap dengan label perangkatnya",
  /klaimSesiPeserta\(user\.id, sid, labelAlat\(/.test(aksi),
);
periksa(
  "penolakan diperiksa SESUDAH kata sandi diverifikasi",
  aksi.indexOf("verifyPassword") < aksi.indexOf("sesiPesertaAktif"),
);
periksa(
  "sid ikut ditandatangani ke dalam cookie sesi peserta",
  /createSession\(\s*\{[\s\S]*?\},\s*sid,\s*\)/.test(aksi),
);

// Katup pengaman pengawas harus benar-benar ada tombolnya, bukan cuma aksinya.
const aksiAdmin = baca("app/admin/actions.ts");
const halamanPeserta = baca("app/admin/peserta/[id]/page.tsx");
periksa(
  "panel admin punya aksi pelepasan perangkat",
  /export async function lepasPerangkatPesertaAction/.test(aksiAdmin),
);
periksa("aksinya hanya untuk admin", /lepasPerangkatPesertaAction[\s\S]{0,200}requireAdmin\(\)/.test(aksiAdmin));
periksa(
  "halaman detail peserta memasang tombolnya",
  /lepasPerangkatPesertaAction/.test(halamanPeserta),
);
periksa(
  "tombolnya meminta konfirmasi lebih dulu",
  /TombolKonfirmasi[\s\S]{0,400}Lepaskan perangkat/.test(halamanPeserta),
);

// Tata tertib peserta harus menyebutkan aturannya. Peserta yang tidak tahu
// akan mengira akunnya rusak ketika ditolak di perangkat kedua.
const tatatertib = baca("components/exam/PemberitahuanUjian.tsx");
periksa(
  "tata tertib menyebut satu akun satu perangkat",
  /satu perangkat/i.test(tatatertib) && /satu peramban/i.test(tatatertib),
);

/* ------------------------------------------------------------------ */
// Folder sementara TIDAK dihapus di sini: Windows masih memegang berkas SQLite
// yang terbuka. Yang membersihkannya adalah rmSync di awal berkas ini.

if (gagal > 0) {
  console.log("\n" + gagal + " pemeriksaan GAGAL.\n");
  process.exit(1);
}
console.log("\nSemua pemeriksaan kunci perangkat peserta lulus.\n");
