/**
 * TIRUAN `next/navigation` dan `next/headers` untuk skrip pemeriksa.
 *
 * MENGAPA PERLU. Beberapa berkas `src/lib` yang memuat aturan penting —
 * `portal.ts` (gerbang portal), `auth.ts` (sesi), `language.ts` — mengimpor
 * `next/navigation`. Modul itu MUSTAHIL dimuat di luar Next: ia menarik konteks
 * React sisi klien, sedangkan skrip pemeriksa berjalan dengan
 * `--conditions=react-server`, tempat `React.createContext` memang tidak ada.
 *
 * Akibatnya seluruh berkas itu dulu tidak bisa diperiksa sama sekali — padahal
 * justru di sanalah aturan yang paling mahal kalau salah.
 *
 * Tiruan ini menyediakan nama-namanya saja. Setiap fungsi yang benar-benar
 * membutuhkan Next MELEMPAR bila dipanggil, bukan diam-diam memulangkan nilai
 * palsu: pemeriksa yang tanpa sengaja menyentuh `redirect()` harus GAGAL dengan
 * jelas, bukan lulus karena tiruannya terlalu ramah.
 *
 * Dipasang oleh `muat-ts.mjs` hanya bila `ADZKIA_TIRUAN_NEXT=1`.
 */

function hanyaDiNext(nama) {
  return () => {
    throw new Error(
      `${nama}() hanya bisa dipanggil di dalam Next.js. ` +
        `Pemeriksa memanggilnya lewat tiruan di scripts/tiruan-next.mjs — ` +
        `panggil fungsi yang tidak menyentuh permintaan HTTP, atau siapkan tiruan yang sesuai.`,
    );
  };
}

export const redirect = hanyaDiNext("redirect");
export const permanentRedirect = hanyaDiNext("permanentRedirect");
export const notFound = hanyaDiNext("notFound");
export const cookies = hanyaDiNext("cookies");
export const headers = hanyaDiNext("headers");
export const draftMode = hanyaDiNext("draftMode");
export const unauthorized = hanyaDiNext("unauthorized");
export const forbidden = hanyaDiNext("forbidden");

export function useRouter() {
  throw new Error("useRouter() adalah hook peramban; tidak ada di skrip pemeriksa.");
}
export function usePathname() {
  throw new Error("usePathname() adalah hook peramban; tidak ada di skrip pemeriksa.");
}
export function useSearchParams() {
  throw new Error("useSearchParams() adalah hook peramban; tidak ada di skrip pemeriksa.");
}

export const RedirectType = { push: "push", replace: "replace" };
