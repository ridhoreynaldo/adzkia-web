import { redirect } from "next/navigation";

/**
 * Pendaftaran mandiri ditutup sejak akun peserta dibuat pengelola lewat impor
 * daftar NISN. Halaman ini dipertahankan supaya tautan lama tetap mendarat di
 * tempat yang benar, bukan di halaman 404.
 */
export default function RegisterPage() {
  redirect("/login");
}
