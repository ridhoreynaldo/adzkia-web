"use client";

import { useEffect, useRef, useState } from "react";

import {
  ACCEPT_GAMBAR,
  BATAS_GAMBAR_BYTE,
  BATAS_GAMBAR_MB,
  LABEL_FORMAT_GAMBAR,
} from "@/lib/naskah/gambar-soal-konstanta";

/**
 * Pemilih GAMBAR SOAL: ambil berkas dari komputer, seret-jatuhkan, atau tempel
 * tangkapan layar (Ctrl+V).
 *
 * Yang tersimpan ke formulir tetap sebuah ALAMAT — komponen ini hanya mengganti
 * cara alamat itu didapat. Berkasnya dikirim lebih dulu ke
 * `/api/admin/gambar-soal`, dan barulah alamat balasannya diletakkan pada input
 * tersembunyi bernama `gambar_url`, persis nama yang sudah dibaca
 * `simpanSoalAction`. Server action soal tidak perlu tahu apa-apa soal berkas.
 *
 * Gambar di atas 1 MB tidak langsung ditolak. Foto papan tulis dari ponsel
 * hampir selalu 2-4 MB, dan menyuruh guru mengecilkannya sendiri di aplikasi
 * lain adalah cara tercepat membuat fitur ini tidak dipakai. Berkas sebesar itu
 * dikecilkan di peramban sampai muat, lalu admin DIBERI TAHU bahwa gambarnya
 * dikecilkan — bukan diam-diam. Yang naik ke server selalu di bawah batas.
 */

/** Lebar maksimum setelah pengecilan otomatis. Cukup untuk grafik dan tabel. */
const LEBAR_MAKS = 1600;

function ukuranRamah(byte: number): string {
  if (byte >= 1024 * 1024) return `${(byte / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.max(1, Math.round(byte / 1024))} KB`;
}

/**
 * Kecilkan gambar di peramban sampai muat di bawah `batas`.
 *
 * Dua tuas dipakai bergantian: lebar dikurangi, lalu mutu JPEG diturunkan pada
 * lebar itu. Urutannya sengaja begitu — menurunkan mutu lebih dulu merusak
 * ketajaman angka pada grafik, padahal justru angka itulah yang harus terbaca.
 */
async function kecilkanGambar(berkas: File, batas: number): Promise<File> {
  const bitmap = await createImageBitmap(berkas);
  try {
    let skala = Math.min(1, LEBAR_MAKS / bitmap.width);
    for (let putaran = 0; putaran < 6; putaran++) {
      const w = Math.max(1, Math.round(bitmap.width * skala));
      const h = Math.max(1, Math.round(bitmap.height * skala));
      const kanvas = document.createElement("canvas");
      kanvas.width = w;
      kanvas.height = h;
      const ctx = kanvas.getContext("2d");
      if (!ctx) throw new Error("kanvas tidak tersedia");
      // JPEG tidak mengenal transparansi: tanpa alas putih, PNG berlatar
      // transparan berubah menjadi kotak hitam.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bitmap, 0, 0, w, h);

      for (const mutu of [0.9, 0.8, 0.7]) {
        const blob = await new Promise<Blob | null>((res) =>
          kanvas.toBlob(res, "image/jpeg", mutu),
        );
        if (blob && blob.size <= batas) {
          const nama = berkas.name.replace(/\.[^.]+$/, "") || "gambar-soal";
          return new File([blob], `${nama}.jpg`, { type: "image/jpeg" });
        }
      }
      skala *= 0.75;
    }
  } finally {
    bitmap.close();
  }
  throw new Error("terlalu besar");
}

/** Paket tempat gambar akan disimpan — menentukan folder tujuannya di server. */
export interface PaketGambar {
  /** "tryout" = paket UTBK/SKD (tabel `packages`); "warung" = paket Warung Soal. */
  jenis: "tryout" | "warung";
  id: number;
}

export function UnggahGambar({
  paket,
  nilaiAwal,
  nama = "gambar_url",
  onChange,
}: {
  paket: PaketGambar;
  nilaiAwal: string;
  /** Nama input tersembunyi yang ikut terkirim bersama formulir soal. */
  nama?: string;
  /** Dipanggil setiap alamat berubah, supaya pratinjau di sebelah ikut segar. */
  onChange?: (url: string) => void;
}) {
  const [url, setUrl] = useState(nilaiAwal);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState("");
  const [catatan, setCatatan] = useState("");
  const [seret, setSeret] = useState(false);
  const [manual, setManual] = useState(false);
  const berkasRef = useRef<HTMLInputElement>(null);
  const akarRef = useRef<HTMLDivElement>(null);

  // Ikut dikosongkan saat formulir induknya di-reset.
  //
  // Formulir soal Warung memanggil `form.reset()` sesudah berhasil menambah
  // butir, supaya admin bisa langsung mengetik soal berikutnya. Reset bawaan
  // peramban hanya menyentuh input biasa; nilai komponen ini dipegang React,
  // jadi tanpa langganan ini gambar soal yang barusan disimpan akan menempel
  // diam-diam pada butir berikutnya.
  useEffect(() => {
    const form = akarRef.current?.closest("form");
    if (!form) return;
    const kosongkan = () => {
      setUrl("");
      setGalat("");
      setCatatan("");
      onChange?.("");
    };
    form.addEventListener("reset", kosongkan);
    return () => form.removeEventListener("reset", kosongkan);
  }, [onChange]);

  // `nilaiAwal` sengaja hanya dibaca sekali: halaman editor selalu dirender
  // ulang dari server saat butir yang dibuka berganti, jadi tidak ada keadaan
  // lama yang perlu disamakan lagi sesudah itu.
  function pakai(baru: string) {
    setUrl(baru);
    onChange?.(baru);
  }

  async function unggah(pilihan: File) {
    setGalat("");
    setCatatan("");

    let berkas = pilihan;
    if (berkas.size > BATAS_GAMBAR_BYTE) {
      // GIF beranimasi tidak bisa dikecilkan tanpa kehilangan animasinya.
      if (berkas.type === "image/gif") {
        setGalat(
          `Ukuran GIF maksimal ${BATAS_GAMBAR_MB} MB (berkas ini ${ukuranRamah(berkas.size)}). Kecilkan dulu di luar aplikasi.`,
        );
        return;
      }
      setSibuk(true);
      try {
        const asli = berkas.size;
        berkas = await kecilkanGambar(berkas, BATAS_GAMBAR_BYTE);
        setCatatan(
          `Gambar ${ukuranRamah(asli)} dikecilkan otomatis menjadi ${ukuranRamah(berkas.size)} agar muat di batas ${BATAS_GAMBAR_MB} MB.`,
        );
      } catch {
        setSibuk(false);
        setGalat(
          `Gambar ${ukuranRamah(pilihan.size)} tidak berhasil dikecilkan sampai di bawah ${BATAS_GAMBAR_MB} MB. Potong bagian yang tidak perlu, lalu unggah ulang.`,
        );
        return;
      }
    }

    setSibuk(true);
    try {
      const fd = new FormData();
      fd.set("jenis", paket.jenis);
      fd.set("paket_id", String(paket.id));
      fd.set("berkas", berkas);
      const res = await fetch("/api/admin/gambar-soal", { method: "POST", body: fd });
      const data: unknown = await res.json().catch(() => null);
      const isi = (data ?? {}) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !isi.ok || !isi.url) {
        setGalat(isi.error ?? "Gambar gagal diunggah. Coba lagi.");
        setCatatan("");
        return;
      }
      pakai(isi.url);
    } catch {
      setGalat("Jaringan terputus saat mengunggah gambar. Coba lagi.");
      setCatatan("");
    } finally {
      setSibuk(false);
      if (berkasRef.current) berkasRef.current.value = "";
    }
  }

  function dariDaftar(berkas: FileList | null | undefined) {
    const satu = berkas?.[0];
    if (!satu) return;
    if (!satu.type.startsWith("image/")) {
      setGalat(`Yang bisa diunggah hanya berkas gambar (${LABEL_FORMAT_GAMBAR}).`);
      return;
    }
    void unggah(satu);
  }

  return (
    <div className="space-y-3" ref={akarRef}>
      <input type="hidden" name={nama} value={url} />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="label mb-0">
          Gambar soal <span className="font-normal text-muted">(opsional)</span>
        </span>
        <button
          type="button"
          className="text-xs font-semibold text-brand hover:underline"
          onClick={() => setManual((v) => !v)}
        >
          {manual ? "Kembali ke unggah berkas" : "Tempel alamat gambar"}
        </button>
      </div>

      {manual ? (
        <input
          className="input"
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => pakai(e.target.value)}
          placeholder="https://… atau /soal/kode-paket/gambar.png"
          aria-label="Alamat gambar soal"
        />
      ) : url ? (
        /* --------------------------- SUDAH ADA GAMBAR --------------------------- */
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-muted/50 p-3 sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Pratinjau gambar soal yang terpasang"
            className="h-28 w-auto max-w-full shrink-0 rounded-lg border border-line bg-white object-contain"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="truncate font-mono text-xs text-muted" title={url}>
              {url}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-ghost py-1.5! text-xs"
                disabled={sibuk}
                onClick={() => berkasRef.current?.click()}
              >
                {sibuk ? "Mengunggah…" : "Ganti gambar"}
              </button>
              <button
                type="button"
                className="btn btn-ghost py-1.5! text-xs text-danger!"
                disabled={sibuk}
                onClick={() => {
                  pakai("");
                  setCatatan("");
                  setGalat("");
                }}
              >
                Lepas gambar
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ---------------------------- BELUM ADA GAMBAR --------------------------- */
        <div
          tabIndex={0}
          role="button"
          aria-label="Pilih, seret, atau tempel gambar soal"
          onClick={() => {
            if (!sibuk) berkasRef.current?.click();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              berkasRef.current?.click();
            }
          }}
          onPaste={(e) => dariDaftar(e.clipboardData?.files)}
          onDragOver={(e) => {
            e.preventDefault();
            setSeret(true);
          }}
          onDragLeave={() => setSeret(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSeret(false);
            dariDaftar(e.dataTransfer?.files);
          }}
          className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
            seret ? "border-brand bg-brand-soft" : "border-line bg-surface hover:bg-surface-muted"
          }`}
        >
          <p className="text-sm font-semibold">
            {sibuk ? "Mengunggah gambar…" : "Klik untuk memilih gambar"}
          </p>
          <p className="mt-1 text-xs text-muted">
            Bisa juga diseret ke sini, atau tekan Ctrl+V setelah menyalin tangkapan layar.
          </p>
          <p className="mt-1 text-xs text-muted">
            {LABEL_FORMAT_GAMBAR} · maksimal {BATAS_GAMBAR_MB} MB
          </p>
        </div>
      )}

      <input
        ref={berkasRef}
        type="file"
        accept={ACCEPT_GAMBAR}
        className="hidden"
        onChange={(e) => dariDaftar(e.target.files)}
      />

      {catatan && <p className="text-xs font-semibold text-warning">{catatan}</p>}
      {galat && <p className="text-xs font-semibold text-danger">{galat}</p>}
      {!manual && !galat && !catatan && (
        <p className="text-xs text-muted">
          Gambar tersimpan di server sekolah dan langsung terlihat di Pratinjau Soal.
        </p>
      )}
    </div>
  );
}
