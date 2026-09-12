/**
 * Mengubah lapisan data dari sinkron menjadi asinkron, secara mekanis.
 *
 * Pindah dari `node:sqlite` ke PostgreSQL memaksa satu perubahan yang menjalar
 * ke mana-mana: `all`/`one`/`run`/`tx` kini memulangkan Promise. Setiap
 * pemanggilnya butuh `await`, setiap fungsi yang memuatnya harus `async`, dan
 * setiap pemanggil fungsi ITU ikut menjadi async — menjalar sampai ke halaman.
 *
 * Ada ±360 titik semacam itu. Menyuntingnya dengan tangan bukan pekerjaan yang
 * bisa dipertanggungjawabkan: satu `await` yang terlewat menghasilkan kode yang
 * tetap berjalan tetapi diam-diam menyimpan Promise ke basis data.
 *
 * Skrip ini memakai PENGURAI TypeScript, bukan cari-ganti teks, sehingga ia
 * tahu bedanya `run(...)` milik basis data dari `run(...)` milik modul lain,
 * dan tahu di mana batas sebuah fungsi.
 *
 * CARA KERJANYA
 *
 *   1. Kumpulan awal: fungsi asinkron di `lib/db.ts` dan `lib/cache.ts`.
 *   2. Tiap pemanggilan fungsi dalam kumpulan itu diberi `await`, dan fungsi
 *      yang memuatnya ditandai harus `async`.
 *   3. Fungsi yang baru ditandai masuk ke kumpulan, lalu ulangi dari (2)
 *      sampai tidak ada yang bertambah.
 *   4. Suntingannya diterapkan dari BELAKANG ke depan supaya posisi karakter
 *      yang belum disunting tidak bergeser.
 *
 * YANG SENGAJA TIDAK DISENTUH
 *
 * Fungsi anak yang diserahkan ke `.map()`, `.filter()`, `.sort()`, dan
 * kerabatnya. Menjadikannya async mengubah `.map()` menjadi larik Promise —
 * kodenya lolos pemeriksa tipe tetapi hasilnya salah. Titik semacam itu
 * dilaporkan di akhir untuk dikerjakan tangan, karena masing-masing butuh
 * keputusan sendiri: `await Promise.all(...)`, atau perulangan biasa, atau
 * satu query yang mengambil semuanya sekaligus.
 *
 * Jalankan:  node scripts/kodemod-async.mjs            (tinjau saja)
 *            node scripts/kodemod-async.mjs --tulis    (benar-benar menyunting)
 */
import fs from "node:fs";
import path from "node:path";

import ts from "typescript";

const AKAR = process.cwd();
const TULIS = process.argv.includes("--tulis");

/** Fungsi pangkal yang memang asinkron sejak awal. */
const PANGKAL = {
  "src/lib/db.ts": ["all", "one", "run", "sisip", "tx", "sehat"],
  "src/lib/cache.ts": ["ambil", "buang", "buangPola", "sehatCache"],
};

/** Metode larik yang argumennya TIDAK boleh dijadikan async begitu saja. */
const METODE_LARIK = new Set([
  "map", "filter", "forEach", "find", "findIndex", "findLast",
  "some", "every", "sort", "reduce", "reduceRight", "flatMap",
]);

/* ==========================================================================
   PROGRAM
   ========================================================================== */

const berkasConfig = ts.findConfigFile(AKAR, ts.sys.fileExists, "tsconfig.json");
const config = ts.readConfigFile(berkasConfig, ts.sys.readFile);
const terurai = ts.parseJsonConfigFileContent(config.config, ts.sys, AKAR);

const program = ts.createProgram(terurai.fileNames, {
  ...terurai.options,
  noEmit: true,
});
const checker = program.getTypeChecker();

const sumber = program
  .getSourceFiles()
  .filter((f) => !f.isDeclarationFile && !f.fileName.includes("node_modules"));

/* ==========================================================================
   KUMPULAN FUNGSI ASINKRON
   ========================================================================== */

/** Simbol -> true. Simbol dipakai, bukan nama, supaya tidak tertukar. */
const asinkron = new Set();

/** Menandai fungsi pangkal berdasarkan berkas dan namanya. */
for (const [relatif, nama] of Object.entries(PANGKAL)) {
  const penuh = path.join(AKAR, relatif).replace(/\\/g, "/");
  const berkas = sumber.find((f) => f.fileName.replace(/\\/g, "/").endsWith(relatif));
  if (!berkas) {
    console.error(`  ! ${relatif} tidak ditemukan (dicari ${penuh})`);
    continue;
  }
  ts.forEachChild(berkas, (n) => {
    if (ts.isFunctionDeclaration(n) && n.name && nama.includes(n.name.text)) {
      const s = checker.getSymbolAtLocation(n.name);
      if (s) asinkron.add(s);
    }
  });
}

console.log(`Fungsi pangkal asinkron: ${asinkron.size}`);

/** Simbol yang ditunjuk sebuah ekspresi pemanggilan, menembus alias impor. */
function simbolPanggilan(ekspresi) {
  let s = checker.getSymbolAtLocation(ekspresi);
  if (!s) return null;
  if (s.flags & ts.SymbolFlags.Alias) {
    try {
      s = checker.getAliasedSymbol(s);
    } catch {
      /* alias yang tidak bisa ditelusuri dibiarkan apa adanya */
    }
  }
  return s;
}

/** Fungsi terdekat yang membungkus sebuah simpul. */
function pembungkus(n) {
  let p = n.parent;
  while (p) {
    if (
      ts.isFunctionDeclaration(p) ||
      ts.isMethodDeclaration(p) ||
      ts.isFunctionExpression(p) ||
      ts.isArrowFunction(p) ||
      ts.isGetAccessor(p) ||
      ts.isConstructorDeclaration(p)
    ) {
      return p;
    }
    p = p.parent;
  }
  return null;
}

/** Simbol nama sebuah fungsi, lewat nama deklarasinya atau variabel penampungnya. */
function simbolFungsi(fn) {
  if ((ts.isFunctionDeclaration(fn) || ts.isMethodDeclaration(fn)) && fn.name) {
    return checker.getSymbolAtLocation(fn.name);
  }
  // const f = () => {...}  /  const f = function () {...}
  if (
    (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) &&
    fn.parent &&
    ts.isVariableDeclaration(fn.parent) &&
    ts.isIdentifier(fn.parent.name)
  ) {
    return checker.getSymbolAtLocation(fn.parent.name);
  }
  return null;
}

/** true bila fungsi ini diserahkan langsung ke .map() dan kerabatnya. */
function argumenMetodeLarik(fn) {
  const p = fn.parent;
  if (!p || !ts.isCallExpression(p)) return false;
  if (!p.arguments.includes(fn)) return false;
  const c = p.expression;
  return ts.isPropertyAccessExpression(c) && METODE_LARIK.has(c.name.text);
}

/* ==========================================================================
   MENGUMPULKAN SUNTINGAN — diulang sampai tidak ada yang bertambah
   ========================================================================== */

const suntingan = new Map(); // namaBerkas -> [{ posisi, panjang, teks }]
const perluTangan = [];
const fungsiDisentuh = new Set();

function tambahSunting(berkas, posisi, panjang, teks) {
  const daftar = suntingan.get(berkas.fileName) ?? [];
  if (daftar.some((s) => s.posisi === posisi && s.teks === teks)) return;
  daftar.push({ posisi, panjang, teks });
  suntingan.set(berkas.fileName, daftar);
}

let putaran = 0;
let bertambah = true;

while (bertambah && putaran < 12) {
  bertambah = false;
  putaran++;

  for (const berkas of sumber) {
    const jalan = path.relative(AKAR, berkas.fileName).replace(/\\/g, "/");
    if (jalan.startsWith("src/lib/db.ts") || jalan.startsWith("src/lib/cache.ts")) continue;

    const kunjungi = (n) => {
      if (ts.isCallExpression(n)) {
        const s = simbolPanggilan(n.expression);
        if (s && asinkron.has(s)) {
          // 1. Beri `await` bila belum ada.
          //
          // Kalau hasilnya LANGSUNG dipakai — `all(...).map(...)`,
          // `one(...)!.id`, `run(...).changes` — kurungnya wajib:
          // `await all(...).map(...)` terurai sebagai
          // `await (all(...).map(...))`, yang memanggil .map() pada sebuah
          // Promise. Kodenya lolos penguraian tetapi salah arti.
          const sudahDitunggu = n.parent && ts.isAwaitExpression(n.parent);
          if (!sudahDitunggu) {
            const induk = n.parent;
            const langsungDipakai =
              induk &&
              ((ts.isPropertyAccessExpression(induk) && induk.expression === n) ||
                (ts.isElementAccessExpression(induk) && induk.expression === n) ||
                (ts.isNonNullExpression(induk) && induk.expression === n) ||
                (ts.isCallExpression(induk) && induk.expression === n));

            if (langsungDipakai) {
              tambahSunting(berkas, n.getStart(berkas), 0, "(await ");
              tambahSunting(berkas, n.getEnd(), 0, ")");
            } else {
              tambahSunting(berkas, n.getStart(berkas), 0, "await ");
            }
          }

          // 2. Tandai fungsi pembungkusnya harus async.
          const fn = pembungkus(n);

          // Fungsi yang SUDAH async tetap harus masuk kumpulan, supaya
          // pemanggilnya ikut diberi await. Melewatkannya membuat rantainya
          // putus di fungsi pertama yang kebetulan sudah asinkron sejak awal.
          if (fn && fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)) {
            const sf = simbolFungsi(fn);
            if (sf && !asinkron.has(sf)) {
              asinkron.add(sf);
              bertambah = true;
            }
          }

          if (fn && !fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)) {
            if (argumenMetodeLarik(fn)) {
              const { line } = berkas.getLineAndCharacterOfPosition(n.getStart(berkas));
              const catatan = `${jalan}:${line + 1}`;
              if (!perluTangan.includes(catatan)) perluTangan.push(catatan);
            } else if (!fungsiDisentuh.has(fn)) {
              fungsiDisentuh.add(fn);
              tandaiAsync(berkas, fn);
              const sf = simbolFungsi(fn);
              if (sf && !asinkron.has(sf)) {
                asinkron.add(sf);
                bertambah = true;
              }
            }
          }
        }
      }
      ts.forEachChild(n, kunjungi);
    };

    ts.forEachChild(berkas, kunjungi);
  }
}

/** Menyisipkan kata `async` dan membungkus tipe kembaliannya dengan Promise<>. */
function tandaiAsync(berkas, fn) {
  // Kata `async` diletakkan sebelum `function`, atau sebelum daftar parameter
  // pada fungsi panah.
  if (ts.isFunctionDeclaration(fn) || ts.isFunctionExpression(fn) || ts.isMethodDeclaration(fn)) {
    const kata = fn.getChildren(berkas).find((c) => c.kind === ts.SyntaxKind.FunctionKeyword);
    const posisi = kata ? kata.getStart(berkas) : fn.getStart(berkas);
    tambahSunting(berkas, posisi, 0, "async ");
  } else if (ts.isArrowFunction(fn)) {
    tambahSunting(berkas, fn.getStart(berkas), 0, "async ");
  }

  // Tipe kembalian: `: Foo` menjadi `: Promise<Foo>`.
  if (fn.type) {
    const teks = fn.type.getText(berkas);
    if (!/^Promise\s*</.test(teks)) {
      tambahSunting(berkas, fn.type.getStart(berkas), fn.type.getEnd() - fn.type.getStart(berkas), `Promise<${teks}>`);
    }
  }
}

/* ==========================================================================
   MENERAPKAN
   ========================================================================== */

let totalSunting = 0;
const ringkas = [];

for (const [namaBerkas, daftar] of [...suntingan.entries()].sort()) {
  const isi = fs.readFileSync(namaBerkas, "utf8");
  // Dari BELAKANG ke depan: menyunting dari depan menggeser seluruh posisi
  // yang belum sempat diterapkan.
  const urut = [...daftar].sort((a, b) => b.posisi - a.posisi || b.panjang - a.panjang);
  let baru = isi;
  for (const s of urut) {
    baru = baru.slice(0, s.posisi) + s.teks + baru.slice(s.posisi + s.panjang);
  }
  if (TULIS) fs.writeFileSync(namaBerkas, baru);
  totalSunting += daftar.length;
  ringkas.push([path.relative(AKAR, namaBerkas).replace(/\\/g, "/"), daftar.length]);
}

ringkas.sort((a, b) => b[1] - a[1]);
console.log(`\n${TULIS ? "Disunting" : "AKAN disunting"}: ${totalSunting} titik di ${ringkas.length} berkas (${putaran} putaran)\n`);
for (const [nama, jumlah] of ringkas) console.log(`  ${String(jumlah).padStart(4)}  ${nama}`);

if (perluTangan.length > 0) {
  console.log(`\nPERLU DIKERJAKAN TANGAN — fungsi di dalam .map()/.filter()/dsb (${perluTangan.length} titik):`);
  console.log("  Masing-masing butuh keputusan sendiri: await Promise.all(...), perulangan biasa,");
  console.log("  atau satu query yang mengambil semuanya sekaligus.\n");
  for (const t of perluTangan) console.log(`  ${t}`);
}

if (!TULIS) console.log("\nTinjauan saja. Tambahkan --tulis untuk benar-benar menyunting.");
