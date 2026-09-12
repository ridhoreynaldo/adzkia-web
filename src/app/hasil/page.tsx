import { redirect } from "next/navigation";

/** /hasil tanpa id tidak punya isi sendiri — arahkan ke daftar riwayat. */
export default function HalamanHasilIndeks() {
  redirect("/riwayat");
}
