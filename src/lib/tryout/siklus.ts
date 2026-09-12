/**
 * Siklus Tryout Real UTBK-SNBT — sepekan sekali, tiap hari Jumat.
 *
 * Berkas ini sengaja MURNI: hanya tanggal dan teks, tanpa menyentuh basis data,
 * supaya `db.ts` boleh memakainya saat migrasi tanpa menciptakan impor
 * melingkar. Bagian yang benar-benar menjadwalkan ada di `siklus-jadwal.ts`.
 *
 * Kesepakatan penamaan mengikuti paket yang sudah dibuat pengelola sendiri —
 * `TO-28AGU2026`, `TO-4SEP2026` — supaya paket yang dibuat otomatis tidak bisa
 * dibedakan dari yang dibuat tangan, dan paket lama ikut dikenali penjadwal.
 */

/** Nama hari dan bulan ditulis di sini, bukan memakai Intl: hasilnya harus sama di mesin mana pun. */
const BULAN_PANJANG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/** Singkatan tiga huruf untuk kode paket: TO-28AGU2026. */
const BULAN_SINGKAT = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MEI",
  "JUN",
  "JUL",
  "AGU",
  "SEP",
  "OKT",
  "NOV",
  "DES",
];

/**
 * Singkatan lain yang mungkin diketik pengelola. Dipakai hanya saat MEMBACA
 * kode lama; kode yang dibuat sistem selalu memakai `BULAN_SINGKAT`.
 */
const ALIAS_BULAN: Record<string, number> = {
  AGS: 7,
  AGT: 7,
  AUG: 7,
  OKT: 9,
  OCT: 9,
  DEC: 11,
  DES: 11,
  MAY: 4,
  NOP: 10,
};

/** Hari tryout: Jumat. `Date.getDay()` memberi 5 untuk Jumat. */
export const HARI_TRYOUT = 5;

export interface Siklus {
  /** Tanggal Jumat pelaksanaannya, "YYYY-MM-DD". Inilah nilai kolom `packages.siklus`. */
  tanggal: string;
  /** Kode paket, mis. "TO-4SEP2026". */
  kode: string;
  /** Nama paket, mis. "Tryout Real UTBK-SNBT — Jumat, 4 September 2026". */
  nama: string;
  /** Jendela paket dalam format `datetime-local`, sama seperti isian admin. */
  mulaiAt: string;
  selesaiAt: string;
}

/** "YYYY-MM-DD" menurut jam setempat — `toISOString()` akan menggeser harinya. */
function tanggalLokal(d: Date): string {
  const bl = String(d.getMonth() + 1).padStart(2, "0");
  const hr = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${bl}-${hr}`;
}

function jamLokal(d: Date, jam: number, menit: number): string {
  return `${tanggalLokal(d)}T${String(jam).padStart(2, "0")}:${String(menit).padStart(2, "0")}`;
}

/**
 * Jumat pada pekan yang memuat `acuan`, dengan pekan dihitung Senin sampai
 * Minggu — batas yang sama persis dengan papan "TOAdzkia Pekan Ini".
 * Menyamakan keduanya penting: jendela paket berakhir tepat ketika papan
 * peringkatnya berganti, sehingga tidak ada tryout yang nilainya jatuh ke pekan
 * yang salah.
 */
export function jumatPekan(acuan: Date = new Date()): Date {
  const senin = new Date(acuan);
  senin.setDate(senin.getDate() - ((senin.getDay() + 6) % 7)); // Minggu(0) -> 6
  senin.setHours(0, 0, 0, 0);
  const jumat = new Date(senin);
  jumat.setDate(jumat.getDate() + (HARI_TRYOUT - 1)); // Senin + 4 hari
  return jumat;
}

/** Susun keterangan lengkap satu siklus dari tanggal Jumatnya. */
export function siklusDariJumat(jumat: Date): Siklus {
  const hari = jumat.getDate();
  const bulan = jumat.getMonth();
  const tahun = jumat.getFullYear();

  // Jendela ditutup Minggu 23.59, yaitu ujung pekan Senin-Minggu yang sama.
  const minggu = new Date(jumat);
  minggu.setDate(minggu.getDate() + 2);

  return {
    tanggal: tanggalLokal(jumat),
    kode: `TO-${hari}${BULAN_SINGKAT[bulan]}${tahun}`,
    nama: `Tryout Real UTBK-SNBT — Jumat, ${hari} ${BULAN_PANJANG[bulan]} ${tahun}`,
    mulaiAt: jamLokal(jumat, 0, 0),
    selesaiAt: jamLokal(minggu, 23, 59),
  };
}

/** Siklus yang sedang berjalan menurut jam server. */
export function siklusBerjalan(acuan: Date = new Date()): Siklus {
  return siklusDariJumat(jumatPekan(acuan));
}

/**
 * Baca tanggal siklus dari kode paket lama, mis. "TO-28AGU2026" -> "2026-08-28".
 *
 * Dipakai sekali saat migrasi untuk mengangkat paket yang sudah dibuat tangan
 * ke dalam siklus, sehingga penjadwal tidak membuat paket kembar dan paket lama
 * ikut tertutup pada waktunya. Kode yang tidak berpola — "TO-DEMO-1",
 * "TO-SKD-DEMO" — mengembalikan null dan selamanya berada di luar siklus.
 */
export function tanggalDariKode(kode: string): string | null {
  const m = /^TO-(\d{1,2})([A-Z]{3})(\d{4})$/i.exec(kode.trim());
  if (!m) return null;

  const hari = Number(m[1]);
  const singkat = m[2].toUpperCase();
  const tahun = Number(m[3]);

  let bulan = BULAN_SINGKAT.indexOf(singkat);
  if (bulan < 0 && singkat in ALIAS_BULAN) bulan = ALIAS_BULAN[singkat];
  if (bulan < 0) return null;

  const d = new Date(tahun, bulan, hari);
  // Tolak tanggal yang tidak ada (31 Februari akan menggelinding ke bulan lain).
  if (d.getFullYear() !== tahun || d.getMonth() !== bulan || d.getDate() !== hari) return null;

  return tanggalLokal(d);
}
