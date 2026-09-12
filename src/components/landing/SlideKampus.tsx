"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Latar bergilir kampus tujuan untuk sampul halaman awal.
 *
 * Urutannya sengaja berselang-seling: kampus UTBK, lalu sekolah kedinasan,
 * begitu seterusnya — supaya pengunjung langsung menangkap bahwa ADZKIA SMART
 * menyiapkan dua jalur sekaligus.
 *
 * FOTONYA BELUM ADA. Setiap slide menunjuk ke `public/kampus/<berkas>`; selama
 * berkasnya belum ada, slide itu tampil sebagai gradasi berwarna khas kampus
 * beserta monogramnya. Begitu pengelola menaruh fotonya dengan nama yang sama,
 * foto itu langsung dipakai tanpa perlu menyentuh kode ini.
 */

export interface SlideKampusItem {
  berkas: string;
  singkat: string;
  nama: string;
  jalur: "utbk" | "skd";
  warna: string;
}

/** Selang-seling: UTBK -> Kedinasan -> UTBK -> Kedinasan ... */
export const SLIDE_KAMPUS: SlideKampusItem[] = [
  { berkas: "ui.jpg", singkat: "UI", nama: "Universitas Indonesia", jalur: "utbk", warna: "#f4b400" },
  { berkas: "pkn-stan.jpg", singkat: "PKN STAN", nama: "Politeknik Keuangan Negara STAN", jalur: "skd", warna: "#00529b" },
  { berkas: "itb.jpg", singkat: "ITB", nama: "Institut Teknologi Bandung", jalur: "utbk", warna: "#00539f" },
  { berkas: "ipdn.jpg", singkat: "IPDN", nama: "Institut Pemerintahan Dalam Negeri", jalur: "skd", warna: "#7f1d1d" },
  { berkas: "ugm.jpg", singkat: "UGM", nama: "Universitas Gadjah Mada", jalur: "utbk", warna: "#f0a202" },
  { berkas: "stis.jpg", singkat: "STIS", nama: "Politeknik Statistika STIS", jalur: "skd", warna: "#0f6cbd" },
  { berkas: "ipb.jpg", singkat: "IPB", nama: "Institut Pertanian Bogor", jalur: "utbk", warna: "#00693c" },
  { berkas: "poltekip-poltekim.jpg", singkat: "POLTEKIP & POLTEKIM", nama: "Politeknik Ilmu Pemasyarakatan & Politeknik Imigrasi", jalur: "skd", warna: "#1e3a8a" },
  { berkas: "its.jpg", singkat: "ITS", nama: "Institut Teknologi Sepuluh Nopember", jalur: "utbk", warna: "#005baa" },
  { berkas: "stmkg.jpg", singkat: "STMKG", nama: "Sekolah Tinggi Meteorologi Klimatologi dan Geofisika", jalur: "skd", warna: "#0e7490" },
];

const JEDA = 6000; // ms per slide

export function SlideKampus({
  gaya = "kiri",
  keterangan = true,
  jalur,
}: {
  /**
   * Arah peredupnya.
   *
   * - `"kiri"` — gelap di sisi kiri, menipis ke kanan. Untuk sampul yang
   *   tulisannya rata kiri.
   * - `"tengah"` — gelap merata dari atas ke bawah. Dipakai halaman awal sejak
   *   11 September 2026: tulisan yang ditaruh di tengah butuh alas yang sama
   *   gelapnya di kiri dan di kanan, kalau tidak sisi kanannya akan hilang di
   *   atas foto yang terang.
   */
  gaya?: "kiri" | "tengah";
  /** false untuk menyembunyikan baris nama kampus dan penanda slide. */
  keterangan?: boolean;
  /**
   * Batasi slidenya pada satu jalur saja. Dipakai halaman /utbk dan /skd:
   * di sana pengunjung sudah memilih jalurnya, jadi menyelipkan kampus jalur
   * sebelah justru membingungkan. Tanpa prop ini, kedua jalur berselang-seling
   * seperti di halaman awal.
   */
  jalur?: "utbk" | "skd";
} = {}) {
  const [aktif, setAktif] = useState(0);
  const [gagal, setGagal] = useState<Record<string, boolean>>({});

  const tandaiGagal = useCallback((berkas: string) => {
    setGagal((g) => (g[berkas] ? g : { ...g, [berkas]: true }));
  }, []);
  const [diam, setDiam] = useState(false);

  // Hormati pengaturan "kurangi gerak" pada perangkat pengguna.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ubah = () => setDiam(mq.matches);
    ubah();
    mq.addEventListener("change", ubah);
    return () => mq.removeEventListener("change", ubah);
  }, []);

  const daftar = useMemo(
    () => (jalur ? SLIDE_KAMPUS.filter((s) => s.jalur === jalur) : SLIDE_KAMPUS),
    [jalur],
  );

  useEffect(() => {
    if (diam) return;
    const jam = window.setInterval(() => {
      setAktif((i) => (i + 1) % daftar.length);
    }, JEDA);
    return () => window.clearInterval(jam);
  }, [diam, daftar.length]);

  const sekarang = daftar[aktif];

  // Slide berikutnya ikut dimuat lebih awal supaya pergantiannya mulus.
  const berikut = useMemo(() => (aktif + 1) % daftar.length, [aktif, daftar.length]);

  return (
    <>
      {/* ---------- Lapisan gambar ---------- */}
      <div className="absolute inset-0 -z-20 overflow-hidden" aria-hidden>
        {daftar.map((s, i) => {
          const tampil = i === aktif;
          const adaFoto = !gagal[s.berkas];
          return (
            <div
              key={s.berkas}
              className={`absolute inset-0 transition-opacity duration-[1400ms] ease-in-out ${
                tampil ? "opacity-100" : "opacity-0"
              }`}
              style={
                adaFoto
                  ? undefined
                  : {
                      // Cadangan selama foto belum tersedia.
                      background: `linear-gradient(135deg, ${s.warna} 0%, #0f172a 78%)`,
                    }
              }
            >
              {adaFoto && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`/kampus/${s.berkas}`}
                  alt=""
                  loading={i === 0 || i === berikut ? "eager" : "lazy"}
                  // Gambar yang sudah gagal SEBELUM React sempat memasang
                  // penangkap galat tidak akan memancarkan `onError` lagi, jadi
                  // keadaannya diperiksa sekali saat elemennya terpasang.
                  ref={(el) => {
                    if (el && el.complete && el.naturalWidth === 0) tandaiGagal(s.berkas);
                  }}
                  onError={() => tandaiGagal(s.berkas)}
                  // Tanpa efek zoom: gambar ditampilkan apa adanya, terpusat di
                  // tengah, supaya gedung kampusnya terlihat utuh.
                  className="h-full w-full object-cover object-center"
                />
              )}

              {!adaFoto && (
                <span className="absolute inset-0 grid place-items-center">
                  <span className="text-[18vw] font-extrabold leading-none text-white/10 sm:text-[12vw]">
                    {s.singkat}
                  </span>
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ---------- Peredup supaya tulisan tetap terbaca ---------- */}
      <div
        className="absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            gaya === "tengah"
              ? "linear-gradient(180deg, rgba(8,15,30,0.60) 0%, rgba(8,15,30,0.40) 34%, rgba(8,15,30,0.86) 100%)"
              : "linear-gradient(100deg, rgba(8,15,30,0.92) 0%, rgba(8,15,30,0.78) 42%, rgba(8,15,30,0.55) 100%)",
        }}
      />

      {/* ---------- Keterangan kampus & penanda slide ---------- */}
      {keterangan && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10">
          {/* Pada gaya "tengah" sampulnya ditindih bilah ringkasan dari bawah,
              jadi barisnya diangkat supaya tidak tertutup. */}
          <div
            className={`mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4 ${
              gaya === "tengah" ? "pb-20" : "pb-6"
            }`}
          >
            <p className="text-xs text-white/80" aria-live="polite">
              <span
                className="mr-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                style={{ background: sekarang.jalur === "skd" ? "#7f1d1d" : "#0d6e6a" }}
              >
                {sekarang.jalur === "skd" ? "Kedinasan" : "UTBK-SNBT"}
              </span>
              {sekarang.nama}
            </p>

            <ul className="pointer-events-auto flex gap-1.5">
              {daftar.map((s, i) => (
                <li key={s.berkas}>
                  <button
                    type="button"
                    onClick={() => setAktif(i)}
                    aria-label={`Tampilkan ${s.nama}`}
                    aria-current={i === aktif ? "true" : undefined}
                    className={`h-1.5 rounded-full transition-all ${
                      i === aktif ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                    }`}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
