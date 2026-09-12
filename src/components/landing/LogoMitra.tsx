"use client";

import { useState } from "react";

/**
 * Logo SMA Islam Plus Adzkia + "Powered by ADZKIA KEDINASAN", dipasang
 * berdampingan dengan tulisan ADZKIA SMART di sudut kiri atas halaman awal.
 *
 * Berkasnya: `public/logo-mitra.png`.
 *
 * Selama berkas itu belum ada, komponen ini TIDAK menampilkan apa pun — header
 * tetap rapi seperti biasa, tidak ada kotak kosong maupun ikon gambar rusak.
 * Begitu berkasnya ditaruh, logonya langsung muncul tanpa perlu ubah kode.
 *
 * `latar` menentukan alasnya. Di atas foto gelap logonya perlu bidang putih
 * membulat, sebab tulisan pada logo berwarna merah dan hitam. Sejak halaman
 * awal ditata ulang di atas kertas krem (11 September 2026), bidang putih itu
 * justru menonjol seperti tambalan — jadi pada `latar="terang"` alasnya
 * dilepas dan garis pemisahnya memakai warna garis halaman.
 */
export function LogoMitra({ latar = "gelap" }: { latar?: "gelap" | "terang" } = {}) {
  const [ada, setAda] = useState(true);
  if (!ada) return null;

  const terang = latar === "terang";

  return (
    <span className="hidden items-center gap-3 sm:flex">
      <span
        className={`h-8 w-px ${terang ? "bg-line" : "bg-white/25"}`}
        aria-hidden
      />
      <span className={terang ? "" : "rounded-lg bg-white/95 px-2.5 py-1.5 shadow-sm"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-mitra.png"
          alt="SMA Islam Plus Adzkia — Powered by Adzkia Kedinasan, Ahlinya Tes SKD dan CPNS"
          className="h-8 w-auto sm:h-10 lg:h-11"
          // Gambar yang gagal SEBELUM React sempat memasang penangkap galat
          // tidak memancarkan `onError` lagi, jadi keadaannya diperiksa sekali
          // saat elemennya terpasang.
          ref={(el) => {
            if (el && el.complete && el.naturalWidth === 0) setAda(false);
          }}
          onError={() => setAda(false)}
        />
      </span>
    </span>
  );
}
