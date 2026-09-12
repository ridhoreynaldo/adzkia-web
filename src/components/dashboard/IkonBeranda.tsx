/**
 * Ikon garis untuk beranda siswa.
 *
 * Digambar sebaris sebagai SVG dan seluruhnya `currentColor`, jadi warnanya
 * ikut kartu yang memuatnya — termasuk berubah sendiri menjadi maroon pada
 * beranda jalur SKD. Emoji sengaja tidak dipakai: rupanya berbeda-beda di tiap
 * perangkat, dan siswa Adzkia membuka halaman ini dari Android, iPhone, dan
 * laptop sekolah sekaligus.
 */

type Props = { className?: string };

function Bungkus({ className = "h-5 w-5", children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={`shrink-0 ${className}`}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** Tryout diikuti — tumpukan lembar jawaban. */
export function IkonLembar(p: Props) {
  return (
    <Bungkus {...p}>
      <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5Z" />
      <path d="M14 3.5v4h4" />
      <path d="M9.5 13h5M9.5 16.5h3" />
    </Bungkus>
  );
}

/** Skor terakhir — grafik naik. */
export function IkonGrafik(p: Props) {
  return (
    <Bungkus {...p}>
      <path d="M3.5 19.5h17" />
      <path d="M6 16l4-4.5 3.5 3L20 7" />
      <path d="M16 7h4v4" />
    </Bungkus>
  );
}

/** Skor tertinggi — piala. */
export function IkonPiala(p: Props) {
  return (
    <Bungkus {...p}>
      <path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0V4Z" />
      <path d="M7.5 5.5H5a2.5 2.5 0 0 0 2.5 4.5M16.5 5.5H19a2.5 2.5 0 0 1-2.5 4.5" />
      <path d="M12 13.5V17M9 20.5h6M10 17h4" />
    </Bungkus>
  );
}

/** Jumlah butir soal. */
export function IkonButir(p: Props) {
  return (
    <Bungkus {...p}>
      <path d="M4 6.5h3M4 12h3M4 17.5h3" />
      <path d="M10 6.5h10M10 12h10M10 17.5h6" />
    </Bungkus>
  );
}

/** Lama pengerjaan. */
export function IkonJam(p: Props) {
  return (
    <Bungkus {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </Bungkus>
  );
}

/** Peringkat — medali bertali. */
export function IkonMedali(p: Props) {
  return (
    <Bungkus {...p}>
      <circle cx="12" cy="15" r="5.5" />
      <path d="M12 12.8l.8 1.7 1.8.3-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.3Z" />
      <path d="M8.5 9.5L6 3.5h4l1.5 3.5M15.5 9.5L18 3.5h-4" />
    </Bungkus>
  );
}

/** Jumlah peserta — sekelompok orang. */
export function IkonOrang(p: Props) {
  return (
    <Bungkus {...p}>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16.2 5.2a3.4 3.4 0 0 1 0 6.6M17 14.4A6.2 6.2 0 0 1 21.2 20" />
    </Bungkus>
  );
}

/** Unduh berkas. */
export function IkonUnduh(p: Props) {
  return (
    <Bungkus {...p}>
      <path d="M12 3.5v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M4.5 19.5h15" />
    </Bungkus>
  );
}
