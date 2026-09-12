/** Pemformatan angka & tanggal Bahasa Indonesia — dipakai halaman hasil, riwayat, peringkat. */

const ZONA = "Asia/Jakarta";

/** 1234 -> "1.234" */
export function angka(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString("id-ID");
}

/** 12.34 -> "12,3" */
export function desimal(n: number | null | undefined, digit = 1): string {
  if (n == null || !Number.isFinite(n)) return "0";
  return n.toLocaleString("id-ID", { minimumFractionDigits: digit, maximumFractionDigits: digit });
}

/**
 * Nilai waktu dari SQLite disimpan sebagai "YYYY-MM-DD HH:MM:SS" (UTC).
 * Diubah jadi Date yang benar tanpa bergantung pada zona waktu server.
 */
export function keTanggal(nilai: string | null | undefined): Date | null {
  if (!nilai) return null;
  const rapi = nilai.includes("T") ? nilai : nilai.replace(" ", "T");
  const d = new Date(/[Zz]|[+-]\d{2}:?\d{2}$/.test(rapi) ? rapi : `${rapi}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "26 Agustus 2026" */
export function tanggal(nilai: string | null | undefined): string {
  const d = keTanggal(nilai);
  if (!d) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: ZONA,
  });
}

/** "Rabu, 26 Agustus 2026 pukul 14.30 WIB" */
export function tanggalLengkap(nilai: string | null | undefined): string {
  const d = keTanggal(nilai);
  if (!d) return "-";
  const hari = d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: ZONA,
  });
  const jam = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONA,
  });
  return `${hari} pukul ${jam} WIB`;
}

/** "26 Agu 2026" — untuk sumbu grafik & tabel sempit. */
export function tanggalSingkat(nilai: string | null | undefined): string {
  const d = keTanggal(nilai);
  if (!d) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: ZONA,
  });
}

/** Kelas warna berdasarkan mutu skor 0-1000. */
export function warnaSkor(skor: number): string {
  if (skor >= 700) return "text-success";
  if (skor >= 550) return "text-brand";
  if (skor >= 450) return "text-warning";
  return "text-danger";
}

/** Predikat ringkas untuk skor 0-1000. */
export function predikatSkor(skor: number): string {
  if (skor >= 750) return "Istimewa";
  if (skor >= 650) return "Sangat Baik";
  if (skor >= 550) return "Baik";
  if (skor >= 450) return "Cukup";
  if (skor >= 350) return "Perlu Ditingkatkan";
  return "Perlu Kerja Keras";
}
