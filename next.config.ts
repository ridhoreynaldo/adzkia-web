import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server kedua untuk menguji perubahan tanpa mengganggu server produksi yang
  // sedang melayani ujian: `.next` dipakai bersama oleh `next dev` dan
  // `next start`, jadi menjalankan dev di komputer yang sama akan menimpa hasil
  // build yang sedang dibaca peserta. Isi ADZKIA_DIST_DIR (mis. `.next-uji`)
  // untuk memberi server uji foldernya sendiri. Kosong = perilaku bawaan.
  distDir: process.env.ADZKIA_DIST_DIR || ".next",
  // Dimatikan agar modul yang dikembangkan paralel tidak saling memblokir
  // build hanya karena rute tujuannya belum dibuat.
  // Dituntut Dockerfile: Next menyalin sendiri node_modules yang benar-benar
  // dipakai saat jalan, biasanya sepersepuluh dari node_modules utuh.
  output: "standalone",
  typedRoutes: false,
  // `next dev` menolak permintaan aset dari nama host lain dengan 403, dan
  // penolakan itu jatuh pada berkas JavaScript-nya — halamannya tetap tergambar
  // tetapi TIDAK PERNAH hidup: timer diam, jawaban tidak tersimpan, tombol
  // tidak bereaksi. Gejalanya mudah disalahartikan sebagai fitur yang rusak.
  //
  // Dua nama host di bawah adalah komputer ini sendiri, dan keduanya memang
  // dipakai bergantian saat menguji: sesi peserta dibuka lewat `127.0.0.1`
  // supaya kukinya tidak menimpa sesi pengelola yang terbuka di `localhost`.
  // Hanya berlaku pada `next dev`; `next start` tidak membacanya.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["exceljs", "bcryptjs"],
  experimental: {
    serverActions: {
      // Impor soal mengirim naskah Word-nya lewat Server Action, dan naskah yang
      // memuat gambar gampang lewat 1 MB — batas bawaan Next. Tanpa baris ini
      // permintaannya ditolak 413 sebelum sempat masuk ke aksi, jadi admin cuma
      // melihat layar "This page couldn't load" dan pemeriksaan ukuran milik
      // aplikasi sendiri (40 MB untuk .docx, 10 MB untuk tabel) tidak pernah
      // kebagian jalan. Angkanya disisakan sedikit di atas 40 MB untuk ongkos
      // pembungkus multipart. nginx di server sudah client_max_body_size 100M.
      bodySizeLimit: "48mb",
    },
  },
};

export default nextConfig;
