import { redirect } from "next/navigation";

/**
 * Riwayat tryout kini disajikan lengkap di Capaianku (rekap setahun penuh
 * plus unduhan .xlsx). Halaman lama diarahkan ke sana supaya tidak ada dua
 * tempat yang menampilkan hal yang sama.
 */
export default function RiwayatPage() {
  redirect("/rankup");
}
