/**
 * Pengujian GERBANG fitur Language Skill.
 *
 * Cara menjalankan (dari root proyek):
 *     node src/lib/__checks__/language-gerbang-check.mjs
 *
 * Fitur ini masih dibangun dan atas permintaan pengelola (9 September 2026)
 * TIDAK BOLEH terlihat di pintarbersamaadzkia.com — cukup di komputer
 * pengembang. Yang diperiksa di sini persis janji itu:
 *
 *   1. Alamat lokal (localhost, 127.0.0.1, ::1, dengan atau tanpa porta)
 *      membuka fitur.
 *   2. Jaringan pribadi 192.168.x / 10.x / 172.16-31.x ikut membuka — laptop
 *      yang sama diakses dari HP lewat `npm run dev:lan`.
 *   3. Domain sekolah dan IP publik VPS TIDAK membukanya. Ini pagar utamanya:
 *      walau berkasnya ikut terkirim ke server, tombol dan halamannya hilang.
 *   4. 172.32.x dan 103.x — dua tetangga yang gampang tertukar dengan blok
 *      pribadi — tetap tertutup.
 *   5. Env ADZKIA_LANGUAGE_SKILLS menang atas pemeriksaan alamat, dua arah.
 *   6. Host kosong/tak terkirim dianggap BUKAN lokal (menutup, bukan membuka).
 *
 * Berkas .ts aslinya dibaca apa adanya — `language-konstanta.ts` sengaja tidak
 * mengimpor apa pun, sehingga bisa diuji tanpa menyalakan Next.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";

const AKAR = path.resolve(import.meta.dirname, "..");
const { bolehLanguageSkills, bersihkanHost, hostLokal } = await import(
  pathToFileURL(path.join(AKAR, "src", "lib", "language-konstanta.ts")).href
);

let gagal = 0;
function periksa(nama, syarat, tambahan = "") {
  if (syarat) {
    console.log(`  OK   ${nama}`);
  } else {
    gagal++;
    console.log(`  GAGAL ${nama}${tambahan ? ` — ${tambahan}` : ""}`);
  }
}

console.log("\n1) Alamat lokal membuka fitur");
for (const h of ["localhost", "localhost:3000", "127.0.0.1", "127.0.0.1:3001", "::1", "[::1]:3000", "adzkia.localhost"]) {
  periksa(`${h} → tampil`, bolehLanguageSkills(h) === true);
}

console.log("\n2) Jaringan pribadi ikut membuka");
for (const h of ["192.168.1.7:3000", "10.0.0.5", "172.16.4.1", "172.31.255.254:3000"]) {
  periksa(`${h} → tampil`, bolehLanguageSkills(h) === true);
}

console.log("\n3) Server produksi IKUT membuka — inilah penerbitannya");
for (const h of ["pintarbersamaadzkia.com", "www.pintarbersamaadzkia.com", "PintarBersamaAdzkia.com:443", "103.186.208.117"]) {
  periksa(`${h} → tampil`, bolehLanguageSkills(h) === true);
}
periksa("host null → tampil", bolehLanguageSkills(null) === true);
periksa("host kosong → tampil", bolehLanguageSkills("") === true);

console.log("\n4) Rem darurat: ADZKIA_LANGUAGE_SKILLS=0 menutup di server");
for (const h of ["pintarbersamaadzkia.com", "103.186.208.117", "", null]) {
  periksa(`${h ?? "(null)"} + env 0 → hilang`, bolehLanguageSkills(h, "0") === false);
}
periksa("nilai 'false' sama artinya", bolehLanguageSkills("pintarbersamaadzkia.com", "false") === false);
periksa("huruf besar diterima", bolehLanguageSkills("pintarbersamaadzkia.com", "FALSE") === false);

console.log("\n5) Rem darurat TIDAK ikut mematikan laptop pengelola");
for (const h of ["localhost", "127.0.0.1:3000", "192.168.1.7:3000", "10.0.0.5", "172.16.4.1"]) {
  periksa(`${h} + env 0 → tetap tampil`, bolehLanguageSkills(h, "0") === true);
}

console.log("\n6) Env 1 memaksa, salah ketik diabaikan");
periksa("domain sekolah + env 1 → tampil", bolehLanguageSkills("pintarbersamaadzkia.com", "1") === true);
periksa("domain sekolah + env 'true' → tampil", bolehLanguageSkills("pintarbersamaadzkia.com", "true") === true);
periksa("salah ketik tidak mematikan", bolehLanguageSkills("pintarbersamaadzkia.com", "mungkin") === true);
periksa("env kosong tidak mematikan", bolehLanguageSkills("pintarbersamaadzkia.com", "") === true);

console.log("\n6b) hostLokal masih memisahkan dengan benar");
for (const h of ["172.32.0.1", "172.15.9.9", "103.10.0.1", "10adzkia.com", ""]) {
  periksa(`hostLokal(${h || "kosong"}) === false`, hostLokal(h) === false);
}

console.log("\n7) Pembersih alamat");
periksa('"situs.com:3000" → "situs.com"', bersihkanHost("situs.com:3000") === "situs.com");
periksa('"[::1]:3000" → "::1"', bersihkanHost("[::1]:3000") === "::1");
periksa('"::1" utuh', bersihkanHost("::1") === "::1");
periksa("huruf besar dikecilkan", bersihkanHost("LocalHost:3000") === "localhost");
periksa("host bertumpuk ambil yang pertama", hostLokal("localhost, pintarbersamaadzkia.com") === true);

console.log(gagal === 0 ? "\nSEMUA LULUS.\n" : `\n${gagal} PENGUJIAN GAGAL.\n`);
process.exit(gagal === 0 ? 0 : 1);
