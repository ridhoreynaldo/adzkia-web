/**
 * Pengujian kunci "satu akun admin, satu perangkat" (tanpa framework tes).
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/admin-sesi-check.mjs
 *
 * Aturan ini gampang dibuat setengah jalan, dan setengah jalan berarti panel
 * admin bisa dibuka dua orang sekaligus tanpa ada yang sadar. Yang diuji:
 *
 *   1. KLAIM. Perangkat pertama memegang sesi; perangkat kedua ditolak selama
 *      sesi itu masih segar.
 *   2. AKTIVITAS. Admin yang sedang bekerja tidak boleh direbut. Menyentuh sesi
 *      menyegarkan penanda waktunya.
 *   3. MENGANGGUR. Sesi yang diam melewati batas boleh diambil alih — inilah
 *      katup pengaman supaya akun tidak terkunci sampai cookie kedaluwarsa.
 *      Begitu diambil alih, cookie perangkat lama harus MATI.
 *   4. KELUAR. Menekan Keluar melepas sesi seketika, dan cookie basi tidak
 *      boleh bisa melepas sesi perangkat yang sedang sah.
 *   5. ANTARAKUN. Kunci admin1 tidak boleh menghalangi admin2 masuk.
 *   6. LABEL ALAT. Nama perangkat pada pesan penolakan terbaca benar.
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
const TMP = path.join(AKAR, ".tmp", "cek", "admin-sesi");

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
const S = await muat("sesi-admin");
const K = await muat("admin-konstanta");

let gagal = 0;
function periksa(nama, syarat, tambahan = "") {
  if (syarat) {
    console.log("  ✓ " + nama);
  } else {
    gagal++;
    console.log("  ✗ " + nama + (tambahan ? " — " + tambahan : ""));
  }
}

/** Memundurkan penanda aktivitas, meniru sesi yang ditinggalkan sekian menit. */
const menganggurkan = (userId, menit) =>
  run(
    "UPDATE admin_sesi SET terakhir_at = datetime('now', ?) WHERE user_id = ?",
    `-${menit} minutes`,
    userId,
  );

const admin = (id, email) =>
  run(
    "INSERT INTO users (id, nama, email, password_hash, role) VALUES (?, ?, ?, 'x', 'admin')",
    id,
    `Admin ${id}`,
    email,
  );

admin(1, "admin1@cek.local");
admin(2, "admin2@cek.local");

/* ------------------------------------------------------------------ */
console.log("\n1. Klaim perangkat pertama");
/* ------------------------------------------------------------------ */

periksa("belum ada sesi sebelum login", S.sesiAdminAktif(1) === undefined);

S.klaimSesiAdmin(1, "sid-hp", "iPhone · Safari");
const sesi1 = S.sesiAdminAktif(1);
periksa("sesi tercatat sesudah login", sesi1 !== undefined);
periksa("sid tersimpan apa adanya", sesi1?.sid === "sid-hp");
periksa("label alat tersimpan", sesi1?.alat === "iPhone · Safari");
periksa(
  "hanya ada SATU baris untuk akun ini",
  Number(one("SELECT COUNT(*) AS n FROM admin_sesi WHERE user_id = 1")?.n) === 1,
);

periksa("perangkat kedua melihat sesi yang sedang dipakai", S.sesiAdminAktif(1) !== undefined);
periksa(
  "pesan penolakan menyebut perangkatnya",
  S.pesanSesiDipakai(sesi1).includes("iPhone · Safari"),
  S.pesanSesiDipakai(sesi1),
);
periksa(
  "pesan penolakan menyebut jeda menganggur",
  S.pesanSesiDipakai(sesi1).includes(String(S.JEDA_MENGANGGUR_MENIT)),
);

/* ------------------------------------------------------------------ */
console.log("\n2. Cookie mana yang diakui");
/* ------------------------------------------------------------------ */

periksa("cookie perangkat pertama diakui", S.sentuhSesiAdmin(1, "sid-hp") === true);
periksa("cookie dengan sid lain ditolak", S.sentuhSesiAdmin(1, "sid-lain") === false);
periksa("cookie tanpa sid ditolak", S.sentuhSesiAdmin(1, null) === false);
periksa("akun yang tidak punya sesi ditolak", S.sentuhSesiAdmin(2, "sid-apa-saja") === false);

/* ------------------------------------------------------------------ */
console.log("\n3. Admin yang sedang bekerja tidak boleh direbut");
/* ------------------------------------------------------------------ */

// Hampir menganggur, lalu membuka satu halaman admin: harus segar kembali.
menganggurkan(1, S.JEDA_MENGANGGUR_MENIT - 1);
periksa("sesi hampir menganggur masih terkunci", S.sesiAdminAktif(1) !== undefined);
periksa("membuka halaman admin menyegarkan sesi", S.sentuhSesiAdmin(1, "sid-hp") === true);
periksa(
  "sesudah disegarkan, sesi tidak lagi mendekati batas",
  Number(
    one(
      "SELECT (terakhir_at > datetime('now', '-1 minutes')) AS baru FROM admin_sesi WHERE user_id = 1",
    )?.baru,
  ) === 1,
);
periksa(
  "cookie basi TIDAK ikut menyegarkan sesi orang lain",
  S.sentuhSesiAdmin(1, "sid-hantu") === false,
);

/* ------------------------------------------------------------------ */
console.log("\n4. Sesi menganggur boleh diambil alih");
/* ------------------------------------------------------------------ */

menganggurkan(1, S.JEDA_MENGANGGUR_MENIT + 1);
periksa("sesi yang menganggur dianggap lepas", S.sesiAdminAktif(1) === undefined);
periksa(
  "tetapi cookie lama masih dikenali selama belum direbut",
  S.sentuhSesiAdmin(1, "sid-hp") === true,
);

menganggurkan(1, S.JEDA_MENGANGGUR_MENIT + 1);
S.klaimSesiAdmin(1, "sid-laptop", "Windows · Chrome");
periksa("perangkat baru memegang sesi", S.sesiAdminAktif(1)?.sid === "sid-laptop");
periksa("cookie perangkat lama MATI sesudah direbut", S.sentuhSesiAdmin(1, "sid-hp") === false);
periksa("cookie perangkat baru hidup", S.sentuhSesiAdmin(1, "sid-laptop") === true);
periksa(
  "pengambilalihan tidak menggandakan baris",
  Number(one("SELECT COUNT(*) AS n FROM admin_sesi WHERE user_id = 1")?.n) === 1,
);

/* ------------------------------------------------------------------ */
console.log("\n5. Keluar melepas kunci");
/* ------------------------------------------------------------------ */

S.lepasSesiAdmin(1, "sid-hp");
periksa("cookie basi tidak bisa melepas sesi yang sah", S.sesiAdminAktif(1)?.sid === "sid-laptop");

S.lepasSesiAdmin(1, "sid-laptop");
periksa("Keluar melepas sesi seketika", S.sesiAdminAktif(1) === undefined);
periksa("cookie sesudah Keluar tidak diakui lagi", S.sentuhSesiAdmin(1, "sid-laptop") === false);
periksa(
  "barisnya benar-benar dibuang",
  Number(one("SELECT COUNT(*) AS n FROM admin_sesi WHERE user_id = 1")?.n) === 0,
);

S.klaimSesiAdmin(1, "sid-baru", null);
S.lepasSesiAdmin(1, null);
periksa(
  "pelepasan paksa tanpa sid (skrip pemulihan) tetap bekerja",
  S.sesiAdminAktif(1) === undefined,
);

/* ------------------------------------------------------------------ */
console.log("\n6. Kunci hanya berlaku per akun");
/* ------------------------------------------------------------------ */

S.klaimSesiAdmin(1, "sid-a", "Windows · Chrome");
periksa("admin1 terkunci", S.sesiAdminAktif(1) !== undefined);
periksa("admin2 tetap bebas masuk", S.sesiAdminAktif(2) === undefined);
S.klaimSesiAdmin(2, "sid-b", "Android · Chrome");
periksa("dua admin berbeda boleh online bersamaan", S.sesiAdminAktif(2)?.sid === "sid-b");
periksa("sesi admin1 tidak terganggu", S.sesiAdminAktif(1)?.sid === "sid-a");

// Akun terhapus tidak boleh meninggalkan kunci menggantung.
run("DELETE FROM users WHERE id = 2");
periksa(
  "menghapus akun admin ikut membuang kuncinya (ON DELETE CASCADE)",
  Number(one("SELECT COUNT(*) AS n FROM admin_sesi WHERE user_id = 2")?.n) === 0,
);

/* ------------------------------------------------------------------ */
console.log("\n7. Label perangkat dan alamat pintu masuk");
/* ------------------------------------------------------------------ */

const ua = {
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  windowsChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  windowsEdge:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 Edg/124.0",
  android:
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
};

periksa("iPhone terbaca", S.labelAlat(ua.iphone) === "iPhone · Safari", S.labelAlat(ua.iphone));
periksa(
  "Windows + Chrome terbaca",
  S.labelAlat(ua.windowsChrome) === "Windows · Chrome",
  S.labelAlat(ua.windowsChrome),
);
periksa(
  "Edge tidak salah dibaca sebagai Chrome",
  S.labelAlat(ua.windowsEdge) === "Windows · Edge",
  S.labelAlat(ua.windowsEdge),
);
periksa(
  "Android terbaca (bukan Linux)",
  S.labelAlat(ua.android) === "Android · Chrome",
  S.labelAlat(ua.android),
);
periksa("User-Agent kosong menghasilkan null", S.labelAlat("") === null);
periksa("User-Agent tidak ada menghasilkan null", S.labelAlat(null) === null);
periksa(
  "pesan penolakan tanpa label alat tetap wajar",
  !S.pesanSesiDipakai({ user_id: 1, sid: "x", alat: null, masuk_at: "", terakhir_at: "" }).includes(
    "()",
  ),
);

periksa("alamat pintu admin adalah /ADZ-ADM4S", K.RUTE_LOGIN_ADMIN === "/ADZ-ADM4S");
periksa(
  "halaman untuk alamat itu benar-benar ada",
  fs.existsSync(path.join(AKAR, "src", "app", "ADZ-ADM4S", "page.tsx")),
);
periksa(
  "alamat lama /login/admin sudah dihapus",
  !fs.existsSync(path.join(AKAR, "src", "app", "login", "admin")),
);

/* ------------------------------------------------------------------ */
// Folder sementara TIDAK dihapus di sini: Windows masih memegang berkas SQLite
// yang terbuka. Yang membersihkannya adalah rmSync di awal berkas ini.

if (gagal > 0) {
  console.log("\n" + gagal + " pemeriksaan GAGAL.\n");
  process.exit(1);
}
console.log("\nSemua pemeriksaan sesi admin lulus.\n");
