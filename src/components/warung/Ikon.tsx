import type { KategoriWarung } from "@/lib/warung/warung";
import type { SubtesKode } from "@/lib/tryout/snbt";

/**
 * Ikon Warung Soal — digambar sebagai SVG sebaris, bukan emoji.
 *
 * Alasannya sama dengan lambang gembok di panel portal: warnanya harus ikut
 * warna level (hijau/kuning/merah) dan bentuknya harus tetap tajam di layar
 * mana pun. Emoji juga tampil berbeda-beda di tiap ponsel, sedangkan lencana
 * level ini termasuk penanda utama tingkat kesulitan.
 */

type Props = { className?: string };

const dasar = "shrink-0";

/** Tunas — level Easy. */
export function IkonTunas({ className = "h-6 w-6" }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={`${dasar} ${className}`}>
      <path d="M12 21v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M12 14C12 10.7 9.5 8 6 8c0 3.3 2.5 6 6 6Z"
        fill="currentColor"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 13c0-3.9 2.9-7 6.5-7 0 3.9-2.9 7-6.5 7Z"
        fill="currentColor"
        fillOpacity="0.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Halilintar — level Medium. */
export function IkonPetir({ className = "h-6 w-6" }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={`${dasar} ${className}`}>
      <path
        d="M13.5 2 5 13.2h5.2L9.8 22 19 10.4h-5.4L13.5 2Z"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Kobaran api — level Hard. */
export function IkonApi({ className = "h-6 w-6" }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={`${dasar} ${className}`}>
      <path
        d="M12 2.5c.6 3-1 4.4-2.6 5.9C7.5 10.1 6 11.7 6 14.5A6 6 0 0 0 18 15c0-2.4-1-3.9-2.3-5.4-.7 1-1.5 1.5-2.3 1.6.8-2.6.6-6-1.4-8.7Z"
        fill="currentColor"
        fillOpacity="0.28"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 20a3 3 0 0 0 3-3c0-1.3-.9-2.1-1.6-2.9-.6 1-1.4 1.2-1.4 1.2s-.4-.8-.2-1.7c-1 .8-1.8 1.9-1.8 3.4A3 3 0 0 0 12 20Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Lencana tingkat kesulitan paket. */
export function IkonKategori({
  kategori,
  className,
}: {
  kategori: KategoriWarung;
  className?: string;
}) {
  if (kategori === "hard") return <IkonApi className={className} />;
  if (kategori === "medium") return <IkonPetir className={className} />;
  return <IkonTunas className={className} />;
}

/**
 * Lambang tiap subtes UTBK.
 *
 * Tujuh bentuk yang berbeda siluetnya — bukan tujuh warna dari satu bentuk —
 * supaya kartu subtes tetap bisa dibedakan sekilas, termasuk oleh siswa yang
 * sukar membedakan warna.
 */
export function IkonSubtes({ kode, className = "h-6 w-6" }: { kode: SubtesKode; className?: string }) {
  const dasar = "shrink-0";
  const bentuk: Record<SubtesKode, React.ReactNode> = {
    // Penalaran Umum: dua gir yang saling mengunci — proses berpikir.
    PU: (
      <>
        <circle cx="10" cy="10" r="4.2" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16.5" cy="16" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10 3.4v2M10 14.6v2M3.4 10h2M14.6 10h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
    // Pengetahuan Umum: bola dunia.
    PPU: (
      <>
        <circle cx="12" cy="12" r="8.5" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.5 12h17M12 3.5c2.4 2.6 2.4 14.4 0 17M12 3.5c-2.4 2.6-2.4 14.4 0 17" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </>
    ),
    // Bacaan & Menulis: buku terbuka dengan pena.
    PBM: (
      <>
        <path d="M3.5 6.5c2.8-1.2 5.4-1.2 8 0v12c-2.6-1.2-5.2-1.2-8 0v-12Z" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M11.5 6.5c2.6-1.2 5.2-1.2 8 0v12c-2.6-1.2-5.4-1.2-8 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </>
    ),
    // Kuantitatif: tanda hitung dalam kotak.
    PK: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7.5 9h4M9.5 7v4M13 9h4M13.6 15.4h3.8M7 14l3 3M10 14l-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </>
    ),
    // Literasi Indonesia: lembar teks bergaris.
    LBIND: (
      <>
        <rect x="4.5" y="3.5" width="15" height="17" rx="3" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 8.5h8M8 12h8M8 15.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </>
    ),
    // Literasi Inggris: gelembung percakapan berisi huruf.
    LBING: (
      <>
        <path d="M3.5 7a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H10l-4.5 3.5V17a2 2 0 0 1-2-2V7Z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M9 13.5 12 7l3 6.5M10 11.6h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
    // Penalaran Matematika: grafik menanjak.
    PM: (
      <>
        <path d="M4 20V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M7 16l3.5-4 3 2.2L19 7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="19" cy="7" r="1.6" fill="currentColor" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={`${dasar} ${className}`}>
      {bentuk[kode]}
    </svg>
  );
}

/** Piala — papan peringkat. */
export function IkonPiala({ className = "h-6 w-6" }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={`${dasar} ${className}`}>
      <path
        d="M7 4h10v5a5 5 0 0 1-10 0V4Z"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M7 5.5H4.5v1.2A3.3 3.3 0 0 0 7.6 10M17 5.5h2.5v1.2A3.3 3.3 0 0 1 16.4 10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M12 14v3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M8.5 20.5c0-1.4 1.4-2.2 3.5-2.2s3.5.8 3.5 2.2H8.5Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Keping poin. */
export function IkonKoin({ className = "h-5 w-5" }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={`${dasar} ${className}`}>
      <circle cx="12" cy="12" r="8.5" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
      <path d="M12 9.2v5.6M10.4 10.4h3.2M10.4 13.6h3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Jam pasir kecil untuk waktu. */
export function IkonWaktu({ className = "h-5 w-5" }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={`${dasar} ${className}`}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.2V12l3 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Sasaran — dipakai untuk jumlah benar. */
export function IkonSasaran({ className = "h-5 w-5" }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={`${dasar} ${className}`}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.6" stroke="currentColor" strokeWidth="1.5" opacity="0.75" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

/** Pentungan permainan — lambang Warung Soal di tombol halaman awal. */
export function IkonWarung({ className = "h-5 w-5" }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={`${dasar} ${className}`}>
      <rect
        x="2.5"
        y="7"
        width="19"
        height="10.5"
        rx="4.2"
        fill="currentColor"
        fillOpacity="0.22"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M7.6 10.6v3.4M5.9 12.3h3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16.3" cy="11.3" r="1.15" fill="currentColor" />
      <circle cx="18.3" cy="13.6" r="1.15" fill="currentColor" />
    </svg>
  );
}

/** Nyala rentetan / semangat, dipakai di kartu ringkasan. */
export function IkonBintang({ className = "h-5 w-5" }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={`${dasar} ${className}`}>
      <path
        d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6L12 16.8 6.7 19.6l1.1-6L3.4 9.4l6-.8L12 3Z"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Tanda centang dan silang untuk umpan balik jawaban. */
export function IkonBenar({ className = "h-6 w-6" }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={`${dasar} ${className}`}>
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="m8 12.4 2.6 2.6L16 9.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IkonSalah({ className = "h-6 w-6" }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={`${dasar} ${className}`}>
      <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="m9 9 6 6M15 9l-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
