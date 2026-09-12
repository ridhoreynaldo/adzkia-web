import Link from "next/link";

import { keluarLanguageAction } from "@/app/language/actions";
import { getSession } from "@/lib/auth/auth";

/**
 * Bilah atas LANGUAGE SKILL: satu kapsul hitam yang melayang di atas kertas
 * krem, persis tata letak rujukan pengelola.
 *
 * Tautan tengah hanya muncul bila siswa sudah masuk — sebelum itu satu-satunya
 * yang boleh dilakukan di halaman ini adalah mengisi NISN, jadi menu yang
 * semuanya melempar balik ke login hanya akan membingungkan.
 */
export async function HeaderLanguage({ ringkas = false }: { ringkas?: boolean }) {
  const user = await getSession();

  return (
    <header className="px-4 pt-5 sm:pt-6">
      <div className="pil-language mx-auto flex max-w-5xl items-center justify-between gap-3 py-2.5 pl-5 pr-2.5">
        <Link href="/language" className="text-[15px] font-extrabold tracking-tight">
          <span className="text-[#ff2d55]">language</span>
          <span className="text-white">skills</span>
        </Link>

        {!ringkas && user && (
          <nav className="hidden items-center gap-6 text-[13px] font-semibold text-white/75 sm:flex">
            <Link href="/language/pilih" className="hover:text-white">
              Pilih Ujian
            </Link>
            <Link href="/language/ielts" className="hover:text-white">
              IELTS
            </Link>
            <Link href="/language/toefl" className="hover:text-white">
              TOEFL
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden max-w-[9rem] truncate text-xs text-white/60 md:inline">
                {user.nama.split(" ")[0]}
              </span>
              <form action={keluarLanguageAction}>
                <button
                  type="submit"
                  className="rounded-full bg-white px-4 py-2 text-[13px] font-bold text-[#17110e] transition hover:bg-white/85"
                >
                  Keluar
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/"
              className="rounded-full bg-white px-4 py-2 text-[13px] font-bold text-[#17110e] transition hover:bg-white/85"
            >
              ADZKIA SMART
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
