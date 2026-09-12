import Link from "next/link";
import { Brand } from "./Brand";
import { getSession } from "@/lib/auth/auth";
import { logoutAction } from "@/lib/auth/auth-actions";

/**
 * Bilah navigasi.
 *
 * `jalur` menentukan keterangan di bawah tulisan ADZKIA SMART. Namanya sendiri
 * tidak pernah berubah — ADZKIA SMART adalah nama platformnya, sedangkan
 * barisan di bawahnya menyebutkan ujian yang sedang dibuka — sehingga peserta
 * di halaman SKD tidak lagi membaca "Tryout Real UTBK-SNBT".
 *
 * `jalur="admin"` dan `jalur="siswa"` MENGHILANGKAN baris itu sama sekali.
 *
 * - `admin` — ketetapan pengelola 11 September 2026: panel pengelola mengurus
 *   seluruh jalur sekaligus (tryout, SKD, Warung Soal, IELTS), jadi menyebut
 *   salah satunya di bawah logonya justru menyesatkan.
 * - `siswa` — untuk Beranda, Capaianku, dan TOAdzkia Pekan Ini. Ketiganya
 *   BUKAN halaman satu jalur: masing-masing punya pemilih UTBK ⇄ SKD, jadi
 *   barisnya akan berganti-ganti mengikuti tombol dan malah jadi berisik.
 *   Diminta pengelola 11 September 2026: "hanya ada logo dan namanya aja".
 *
 * Baris jalur TETAP ADA di halaman yang memang milik satu ujian — ruang ujian,
 * persiapan, hasil, peringkat, portal /utbk dan /skd — dan di sana gunanya
 * jelas: peserta SKD tidak boleh membaca "Tryout Real UTBK-SNBT".
 */
export async function Navbar({
  jalur = "utbk",
}: { jalur?: "utbk" | "skd" | "admin" | "siswa" } = {}) {
  const user = await getSession();

  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Brand
          href={user ? (user.role === "admin" ? "/admin" : "/dashboard") : "/"}
          keterangan={
            jalur === "admin" || jalur === "siswa"
              ? null
              : jalur === "skd"
                ? "SKD Kedinasan"
                : "Tryout Real UTBK-SNBT"
          }
        />

        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              <Link href="/dashboard" className="hidden sm:inline px-3 py-2 rounded-lg hover:bg-surface-muted font-medium">
                Beranda
              </Link>
              <Link href="/rankup" className="hidden sm:inline px-3 py-2 rounded-lg hover:bg-surface-muted font-medium text-accent">
                Capaianku
              </Link>
              <Link href="/to-pekan-ini" className="hidden lg:inline px-3 py-2 rounded-lg hover:bg-surface-muted font-medium text-accent">
                TOAdzkia Pekan Ini
              </Link>
              {user.role === "admin" && (
                <Link href="/admin" className="px-3 py-2 rounded-lg hover:bg-surface-muted font-medium text-brand">
                  Admin
                </Link>
              )}
              <span className="hidden md:inline text-muted px-2">|</span>
              <span className="hidden md:inline text-muted">{user.nama.split(" ")[0]}</span>
              <form action={logoutAction}>
                <button type="submit" className="btn btn-ghost !py-2 !px-3 text-sm">
                  Keluar
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-primary !py-2 !px-3 text-sm">
                MULAI TRYOUT
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
