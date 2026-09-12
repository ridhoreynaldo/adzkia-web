/**
 * Membungkus `.map()` yang isinya menunggu basis data dengan `Promise.all`.
 *
 * Sesudah lapisan data menjadi asinkron, potongan seperti ini tersebar di
 * banyak berkas:
 *
 *     const baris = daftar.map((x) => {
 *       const tambahan = await ambilSesuatu(x.id);   // <- butuh await
 *       return { ...x, tambahan };
 *     });
 *
 * Menjadikan fungsi anaknya `async` saja TIDAK cukup: `.map()` lalu
 * memulangkan larik Promise, dan kodenya tetap lolos pemeriksa tipe di
 * beberapa tempat sambil menghasilkan `[object Promise]` di layar. Yang benar:
 *
 *     const baris = await Promise.all(daftar.map(async (x) => { ... }));
 *
 * Skrip ini mengerjakan persis itu, dan HANYA untuk `.map()` — `.filter()`,
 * `.find()`, dan `.some()` tidak bisa dibungkus begitu karena penyaringnya
 * harus memulangkan nilai benar/salah, bukan Promise. Titik semacam itu
 * dilaporkan untuk dikerjakan tangan.
 *
 * CATATAN PENYETELAN. Tiap `.map()` yang dibungkus di sini adalah N+1 query:
 * satu query per baris. Untuk daftar pendek biayanya tidak terasa, tetapi
 * daftar panjang sebaiknya diganti SATU query yang memulangkan semuanya
 * sekaligus. Skrip ini mencetak daftarnya di akhir supaya bisa ditinjau.
 *
 * Jalankan:  node scripts/kodemod-map-async.mjs [--tulis]
 */
import fs from "node:fs";
import path from "node:path";

import ts from "typescript";

const AKAR = process.cwd();
const TULIS = process.argv.includes("--tulis");

const berkasConfig = ts.findConfigFile(AKAR, ts.sys.fileExists, "tsconfig.json");
const config = ts.readConfigFile(berkasConfig, ts.sys.readFile);
const terurai = ts.parseJsonConfigFileContent(config.config, ts.sys, AKAR);
const program = ts.createProgram(terurai.fileNames, { ...terurai.options, noEmit: true });

const sumber = program
  .getSourceFiles()
  .filter((f) => !f.isDeclarationFile && !f.fileName.includes("node_modules"));

/** true bila simpul memuat `await` yang MILIKNYA — bukan milik fungsi bersarang. */
function memuatAwait(fn) {
  let ada = false;
  const telusuri = (n) => {
    if (ada) return;
    // Fungsi bersarang punya konteks await sendiri; tidak dihitung.
    if (n !== fn && (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n))) {
      return;
    }
    if (ts.isAwaitExpression(n)) {
      ada = true;
      return;
    }
    ts.forEachChild(n, telusuri);
  };
  ts.forEachChild(fn, telusuri);
  return ada;
}

function pembungkusFungsi(n) {
  let p = n.parent;
  while (p) {
    if (
      ts.isFunctionDeclaration(p) ||
      ts.isMethodDeclaration(p) ||
      ts.isFunctionExpression(p) ||
      ts.isArrowFunction(p)
    ) {
      return p;
    }
    p = p.parent;
  }
  return null;
}

const suntingan = new Map();
const nPlusSatu = [];
const perluTangan = [];

function tambah(berkas, posisi, panjang, teks) {
  const d = suntingan.get(berkas.fileName) ?? [];
  if (d.some((s) => s.posisi === posisi && s.teks === teks)) return;
  d.push({ posisi, panjang, teks });
  suntingan.set(berkas.fileName, d);
}

for (const berkas of sumber) {
  const jalan = path.relative(AKAR, berkas.fileName).replace(/\\/g, "/");

  const kunjungi = (n) => {
    if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      n.arguments.length >= 1
    ) {
      const metode = n.expression.name.text;
      const arg = n.arguments[0];
      const fungsiAnak = ts.isArrowFunction(arg) || ts.isFunctionExpression(arg) ? arg : null;

      if (fungsiAnak && memuatAwait(fungsiAnak)) {
        const { line } = berkas.getLineAndCharacterOfPosition(n.getStart(berkas));
        const tempat = `${jalan}:${line + 1}`;

        if (metode === "map" || metode === "flatMap") {
          // Bungkus seluruh panggilan `.map(...)` dengan await Promise.all(...)
          const sudahDibungkus =
            n.parent &&
            ts.isCallExpression(n.parent) &&
            n.parent.expression.getText(berkas).endsWith("Promise.all");

          if (!sudahDibungkus) {
            tambah(berkas, n.getStart(berkas), 0, "await Promise.all(");
            tambah(berkas, n.getEnd(), 0, ")");
            nPlusSatu.push(tempat);
          }
          if (!fungsiAnak.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)) {
            tambah(berkas, fungsiAnak.getStart(berkas), 0, "async ");
          }

          const luar = pembungkusFungsi(n);
          if (luar && !luar.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)) {
            const kata = luar.getChildren(berkas).find((c) => c.kind === ts.SyntaxKind.FunctionKeyword);
            tambah(berkas, kata ? kata.getStart(berkas) : luar.getStart(berkas), 0, "async ");
            if (luar.type) {
              const teks = luar.type.getText(berkas);
              if (!/^Promise\s*</.test(teks)) {
                tambah(berkas, luar.type.getStart(berkas), luar.type.getEnd() - luar.type.getStart(berkas), `Promise<${teks}>`);
              }
            }
          }
        } else {
          perluTangan.push(`${tempat}  (.${metode})`);
        }
      }
    }
    ts.forEachChild(n, kunjungi);
  };

  ts.forEachChild(berkas, kunjungi);
}

let total = 0;
for (const [nama, daftar] of [...suntingan.entries()].sort()) {
  const isi = fs.readFileSync(nama, "utf8");
  const urut = [...daftar].sort((a, b) => b.posisi - a.posisi || b.panjang - a.panjang);
  let baru = isi;
  for (const s of urut) baru = baru.slice(0, s.posisi) + s.teks + baru.slice(s.posisi + s.panjang);
  if (TULIS) fs.writeFileSync(nama, baru);
  total += daftar.length;
  console.log(`  ${String(daftar.length).padStart(3)}  ${path.relative(AKAR, nama).replace(/\\/g, "/")}`);
}

console.log(`\n${TULIS ? "Disunting" : "AKAN disunting"}: ${total} titik`);

if (nPlusSatu.length > 0) {
  console.log(`\nPERLU DITINJAU NANTI - N+1 query (${nPlusSatu.length} titik).`);
  console.log("Masing-masing menjalankan satu query per baris. Untuk daftar panjang,");
  console.log("gantikan dengan satu query yang memulangkan semuanya sekaligus.\n");
  for (const t of nPlusSatu) console.log(`  ${t}`);
}

if (perluTangan.length > 0) {
  console.log(`\nPERLU TANGAN - penyaring tidak bisa dibungkus Promise.all (${perluTangan.length}):\n`);
  for (const t of perluTangan) console.log(`  ${t}`);
}

if (!TULIS) console.log("\nTinjauan saja. Tambahkan --tulis untuk menyunting.");
