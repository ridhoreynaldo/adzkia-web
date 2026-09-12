import Link from "next/link";

import { keluarWarungAction } from "@/app/warung/actions";
import { Brand } from "@/components/Brand";
import { IkonPiala, IkonWarung } from "@/components/warung/Ikon";
import { getSession } from "@/lib/auth/auth";

/**
 * Bilah atas Warung Soal.
 *
 * Sengaja tidak memakai `Navbar` biasa: di sini siswa sedang bermain, jadi
 * tautannya hanya dua (arena dan papan peringkat) dan tombol keluar
 * mengembalikannya ke pintu masuk Warung, bukan ke halaman login tryout.
 */
export async function HeaderWarung({ ringkas = false }: { ringkas?: boolean }) {
  const user = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-[color-mix(in_srgb,var(--background)_82%,transparent)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Brand href="/warung" terang keterangan="Warung Soal" />
          <span className="hidden items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-accent sm:inline-flex">
            <IkonWarung className="h-3.5 w-3.5" />
            Latihan Harian
          </span>
        </div>

        <nav className="flex items-center gap-1.5 text-sm">
          {!ringkas && (
            <Link
              href="/warung/peringkat"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-semibold text-foreground/85 hover:bg-surface-muted"
            >
              <IkonPiala className="h-4 w-4 text-warning" />
              <span className="hidden sm:inline">Papan Peringkat</span>
            </Link>
          )}

          {user ? (
            <>
              <span className="hidden max-w-[10rem] truncate px-2 text-xs text-muted md:inline">
                {user.nama.split(" ")[0]}
              </span>
              <form action={keluarWarungAction}>
                <button type="submit" className="btn btn-ghost !px-3 !py-2 text-sm">
                  Keluar
                </button>
              </form>
            </>
          ) : (
            <Link href="/warung/login" className="btn btn-primary !px-3 !py-2 text-sm">
              MASUK
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
