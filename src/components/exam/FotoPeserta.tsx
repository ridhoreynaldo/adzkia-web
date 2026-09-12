import { inisialNama } from "@/lib/penjagaan/foto-peserta-konstanta";

/**
 * Lingkaran foto peserta, dengan huruf awal namanya sebagai pengganti selama
 * fotonya belum ada.
 *
 * Sengaja memakai `<img>` biasa, bukan `next/image`. Alamat fotonya baru lahir
 * beberapa menit sebelum ujian, sehingga pengoptimal gambar Next.js akan
 * mengambilnya dari dirinya sendiri lewat jaringan — persis pada menit tersibuk
 * hari itu — dan kegagalan sekecil apa pun di sana membuat foto tidak tampil.
 * Berkasnya sendiri sudah kecil (sisi 512 px, di bawah 1 MB), jadi tidak ada
 * yang perlu dioptimalkan lagi.
 */
export function FotoPeserta({
  nama,
  foto,
  ukuran = 40,
  className = "",
}: {
  nama: string;
  foto: string | null;
  /** Sisi lingkaran dalam piksel. */
  ukuran?: number;
  className?: string;
}) {
  const gaya = { width: ukuran, height: ukuran };

  if (foto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={foto}
        alt={`Foto ${nama}`}
        width={ukuran}
        height={ukuran}
        style={gaya}
        className={`shrink-0 rounded-full border border-line bg-surface-muted object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={gaya}
      className={`flex shrink-0 items-center justify-center rounded-full border border-line bg-brand-soft font-extrabold text-brand ${className}`}
    >
      <span style={{ fontSize: Math.max(11, Math.round(ukuran * 0.38)) }}>{inisialNama(nama)}</span>
    </span>
  );
}
