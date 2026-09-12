import type { MetadataRoute } from "next";

/**
 * Manifest aplikasi.
 *
 * Gunanya satu: `display: "standalone"`. Peserta iPhone tidak bisa memakai
 * Fullscreen API (WebKit di iPhone tidak menyediakannya untuk elemen selain
 * <video>), jadi jalan satu-satunya menuju layar benar-benar penuh — tanpa
 * bilah alamat dan tanpa bilah tombol Safari — adalah "Tambahkan ke Layar
 * Utama". Dibuka dari ikon itu, ruang ujian mengisi seluruh layar.
 *
 * Di Android/desktop hal ini tidak mengubah apa pun, karena di sana ruang
 * ujian tetap memakai Fullscreen API yang sesungguhnya.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ADZKIA SMART — Tryout UTBK-SNBT & SKD",
    short_name: "ADZKIA SMART",
    description:
      "Platform latihan resmi SMA Islam Plus Adzkia: Tryout Real UTBK-SNBT dan SKD Kedinasan.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f8f9",
    theme_color: "#0d6e6a",
    icons: [
      {
        src: "/logo-adzkia-smart.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
