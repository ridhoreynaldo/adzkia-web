/**
 * Lambang gembok untuk status portal.
 *
 * Digambar sebagai SVG sebaris, bukan emoji atau berkas gambar, supaya
 * warnanya ikut tema jalur (tosca untuk UTBK, maroon untuk SKD) dan tetap
 * tajam di layar mana pun. Bentuk terkunci dan terbuka sengaja dibedakan pada
 * SILUETNYA — sengkang yang tegak lurus versus yang terangkat miring — bukan
 * hanya pada warnanya, supaya statusnya tetap terbaca oleh yang sukar
 * membedakan merah dan hijau.
 */

function Badan({ terkunci }: { terkunci: boolean }) {
  return (
    <>
      {/* Sengkang: tertutup rapat, atau terangkat dan terbuka ke kanan. */}
      <path
        d={
          terkunci
            ? "M8 10V7a4 4 0 0 1 8 0v3"
            : "M8 10V7a4 4 0 0 1 7.5-1.9"
        }
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Badan gembok. */}
      <rect x="4" y="10" width="16" height="10" rx="2.5" fill="currentColor" opacity="0.15" />
      <rect
        x="4"
        y="10"
        width="16"
        height="10"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="14.4" r="1.5" fill="currentColor" />
      <path d="M12 15.6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

/** Gembok kecil untuk lencana dan tombol. */
export function GemboksKecil({
  terkunci,
  className = "",
}: {
  terkunci: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={`h-4 w-4 shrink-0 ${className}`}
      focusable="false"
    >
      <Badan terkunci={terkunci} />
    </svg>
  );
}

/**
 * Gembok besar untuk layar terkunci dan kartu kendali admin.
 * Lingkaran cahaya di belakangnya memakai warna status, bukan warna merek,
 * supaya terkunci dan terbuka terbaca dari kejauhan.
 */
export function GemboksBesar({ terkunci }: { terkunci: boolean }) {
  const warna = terkunci ? "text-danger" : "text-success";
  const cahaya = terkunci ? "bg-danger-soft" : "bg-success-soft";

  return (
    <div className="relative mx-auto grid h-28 w-28 place-items-center">
      <span
        aria-hidden
        className={`absolute inset-0 rounded-full ${cahaya}`}
        style={{ filter: "blur(2px)" }}
      />
      <span
        aria-hidden
        className={`absolute inset-3 rounded-full border-2 ${
          terkunci ? "border-danger/25" : "border-success/25"
        }`}
      />
      <svg viewBox="0 0 24 24" aria-hidden className={`relative h-14 w-14 ${warna}`}>
        <Badan terkunci={terkunci} />
      </svg>
    </div>
  );
}
