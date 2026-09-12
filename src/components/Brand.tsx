import Image from "next/image";
import Link from "next/link";

const LOGO = "/logo-adzkia-smart.png";

/**
 * Logo ADZKIA SMART.
 *
 * Berkas logonya berupa satu gambar utuh: lambang "A" bertoga di atas, tulisan
 * ADZKIA SMART beserta tagline di bawahnya.
 *
 * - `lg` (halaman masuk & sampul) menampilkan logo utuh, tanpa teks tambahan
 *   karena namanya sudah menyatu di dalam gambar.
 * - `sm` (bilah navigasi) hanya menampilkan bagian LAMBANGNYA — tulisan di
 *   dalam gambar tidak akan terbaca pada ukuran 40 piksel — lalu nama dan
 *   keterangan jalur ditulis ulang sebagai teks di sebelahnya supaya tetap
 *   tajam dan bisa dibaca pembaca layar.
 */
export function Brand({
  size = "sm",
  href = "/",
  keterangan = "Tryout Real UTBK-SNBT",
  terang = false,
}: {
  size?: "sm" | "lg";
  href?: string | null;
  /** null = tanpa baris keterangan; hanya nama ADZKIA SMART yang tampil. */
  keterangan?: string | null;
  /** true bila dipasang di atas latar gelap (sampul bergambar). */
  terang?: boolean;
}) {
  const mark =
    size === "lg" ? (
      <Image
        src={LOGO}
        alt="ADZKIA SMART — Learn, Grow, Achieve, Innovate"
        width={1254}
        height={1254}
        priority
        className="h-auto w-52 max-w-full"
      />
    ) : (
      <span className="flex items-center gap-2.5">
        {/*
          Jendela yang memangkas gambar sampai tersisa lambangnya saja.
          Angka-angka di bawah diukur dari berkas logonya: lambang menempati
          x 17%-85% dan y 5%-59% dari bidang gambar, sedangkan tulisan
          "ADZKIA" baru mulai pada 62%. Gambar diperbesar jadi 65 piksel lalu
          digeser supaya bagian itu tepat mengisi jendela 44x36.
        */}
        <span className="relative block h-9 w-11 shrink-0 overflow-hidden">
          <Image
            src={LOGO}
            alt=""
            aria-hidden
            width={1254}
            height={1254}
            className="absolute left-[-11px] top-[-3px] h-[65px] w-[65px] max-w-none"
          />
        </span>
        <span className="leading-tight">
          <span
            className={`block text-base font-extrabold tracking-tight ${terang ? "text-white" : ""}`}
          >
            ADZKIA <span className={terang ? "text-white/80" : "text-brand"}>SMART</span>
          </span>
          {/* `keterangan: null` menghapus baris ini sama sekali — dipakai panel
              pengelola, yang mengurus seluruh jalur sekaligus sehingga menyebut
              salah satunya di bawah logo justru keliru. */}
          {keterangan && (
            <span className={`block text-[11px] ${terang ? "text-white/70" : "text-muted"}`}>
              {keterangan}
            </span>
          )}
        </span>
      </span>
    );

  return href ? (
    <Link
      href={href}
      className="inline-block"
      aria-label={keterangan ? `ADZKIA SMART — ${keterangan}` : "ADZKIA SMART"}
    >
      {mark}
    </Link>
  ) : (
    mark
  );
}
