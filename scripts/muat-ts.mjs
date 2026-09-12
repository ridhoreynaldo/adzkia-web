/**
 * Membuat berkas .ts aplikasi bisa diimpor apa adanya oleh skrip Node.
 *
 * Node 24 sudah sanggup melucuti tipe TypeScript sendiri, tetapi ia tetap
 * menuntut ekstensi pada tiap impor relatif — sedangkan seluruh berkas di
 * `src/lib` ditulis dengan gaya Next.js: `from "./siklus"` dan
 * `from "@/lib/core/db"`, tanpa ekstensi. Dua kaidah kecil di bawah menutup jarak
 * itu, sehingga skrip penyemai dan pemeriksa memakai KODE YANG SAMA dengan
 * yang dijalankan aplikasi, bukan salinannya.
 *
 * Dipakai dengan `import "./muat-ts.mjs";` sebagai baris pertama, lalu
 * modulnya dimuat dengan `await import(...)` sesudah itu.
 *
 * Berkas `src/lib` juga memakai `import "server-only"`, yang di luar Next.js
 * melempar galat. Jalankan skripnya dengan `node --conditions=react-server`
 * supaya paket itu menyelesaikan diri ke modul kosong — persis seperti yang
 * dilakukan Next.js di sisi server.
 */
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const AKAR = process.cwd();

/** true bila berkasnya ada di disk. */
function ada(jalan) {
  try {
    return fs.statSync(jalan).isFile();
  } catch {
    return false;
  }
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    // "@/lib/core/db" -> <akar>/src/lib/db.ts
    if (specifier.startsWith("@/")) {
      const jalan = path.join(AKAR, "src", specifier.slice(2));
      for (const akhiran of [".ts", ".tsx", ".mjs", ".js", "/index.ts"]) {
        if (ada(jalan + akhiran)) {
          return { url: pathToFileURL(jalan + akhiran).href, shortCircuit: true };
        }
      }
    }

    // "./siklus" -> "./siklus.ts", bila memang ada berkasnya.
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !path.extname(specifier)) {
      const induk = context.parentURL?.startsWith("file:")
        ? path.dirname(fileURLToPath(context.parentURL))
        : AKAR;
      const jalan = path.resolve(induk, specifier);
      for (const akhiran of [".ts", ".tsx", "/index.ts"]) {
        if (ada(jalan + akhiran)) {
          return { url: pathToFileURL(jalan + akhiran).href, shortCircuit: true };
        }
      }
    }

    // `next/navigation` dan `next/headers` diganti tiruan — HANYA bila skrip
    // pemanggilnya meminta lewat ADZKIA_TIRUAN_NEXT=1.
    //
    // Modul aslinya mustahil dimuat di luar Next: `next/navigation` menarik
    // konteks React sisi klien, sedangkan skrip ini berjalan dengan
    // `--conditions=react-server`, tempat `React.createContext` memang tidak
    // ada. Tanpa penggantian ini, setiap berkas `src/lib` yang menyentuhnya —
    // `portal.ts`, `auth.ts`, `language.ts` — tidak bisa diperiksa sama sekali.
    //
    // Bergerbang env supaya skrip penyemai dan pengimpor TIDAK ikut terkena:
    // yang butuh Next sungguhan harus tetap gagal dengan jelas.
    if (
      process.env.ADZKIA_TIRUAN_NEXT === "1" &&
      (specifier === "next/navigation" || specifier === "next/headers")
    ) {
      return {
        url: pathToFileURL(path.join(AKAR, "scripts", "tiruan-next.mjs")).href,
        shortCircuit: true,
      };
    }

    return nextResolve(specifier, context);
  },
});
