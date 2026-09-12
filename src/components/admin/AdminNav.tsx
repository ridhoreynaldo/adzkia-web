"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU = [
  { href: "/admin", label: "Dasbor", ikon: "▤" },
  { href: "/admin/portal", label: "Kunci Portal", ikon: "🔒" },
  { href: "/admin/paket", label: "Paket Tryout", ikon: "▦" },
  { href: "/admin/warung", label: "Warung Soal", ikon: "🎮" },
  { href: "/admin/peserta", label: "Peserta", ikon: "☺" },
  { href: "/admin/prodi", label: "Program Studi", ikon: "◎" },
  { href: "/admin/pelanggaran", label: "Keamanan Ujian", ikon: "⚠" },
  { href: "/admin/live", label: "Skor Live", ikon: "◉" },
  { href: "/admin/profil", label: "Profil", ikon: "☰" },
] as const;

/** Anak-tab `/admin/ielts` yang berdiri sendiri di menu pengelola IELTS. */
const ANAK_IELTS = /^\/admin\/ielts\/(live|keamanan|peserta)(\/|$)/;

/**
 * `punyaAnak` true hanya ketika anak-tab IELTS memang DIGAMBAR di bilah ini —
 * yaitu pada menu pengelola berlingkup IELTS. Tanpa pembatas itu, pengelola
 * PENUH yang membuka `/admin/ielts/live` tidak akan melihat satu tab pun
 * menyala, sebab tab IELTS-nya berhenti menganggap alamat itu miliknya padahal
 * tab penggantinya tidak ada.
 */
function aktif(pathname: string, href: string, punyaAnak = false): boolean {
  if (href === "/admin") return pathname === "/admin";
  if (punyaAnak && href === "/admin/ielts") {
    return pathname === href || (pathname.startsWith(`${href}/`) && !ANAK_IELTS.test(pathname));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Navigasi panel admin — tab horizontal yang bisa digeser di layar kecil.
 *
 * `language` datang dari layout (komponen server) karena keputusannya butuh
 * alamat permintaan: menu IELTS hanya digambar di komputer pengembang, tidak
 * pernah di pintarbersamaadzkia.com. Lihat src/lib/language-konstanta.ts.
 */
export function AdminNav({
  language = false,
  hanyaIelts = false,
}: {
  language?: boolean;
  /**
   * true untuk pengelola berlingkup IELTS: menu lain tidak digambar sama
   * sekali. Ini KERAPIAN, bukan penjagaan — yang menolak mereka membuka panel
   * lain adalah `requireAdmin()` di halaman dan Server Action-nya, sebab
   * alamat bisa diketik langsung.
   */
  hanyaIelts?: boolean;
}) {
  const pathname = usePathname() ?? "/admin";
  const ielts = { href: "/admin/ielts", label: "IELTS", ikon: "🌐" } as const;

  /**
   * Menu pengelola berlingkup IELTS.
   *
   * Sejak 11 September 2026 panel IELTS punya padanan lengkap menu portal
   * tryout — Skor Live, Keamanan Ujian, dan Peserta — jadi pemiliknya tidak
   * boleh lagi hanya diberi satu tab. Urutannya SENGAJA sama dengan urutan di
   * `MENU` (paket → peserta → keamanan → skor live → profil) supaya pengelola
   * yang memegang kedua panel membaca tata letak yang sama di keduanya.
   */
  const menuIelts = [
    { href: "/admin/ielts", label: "Paket IELTS", ikon: "🌐" },
    { href: "/admin/ielts/peserta", label: "Peserta", ikon: "☺" },
    { href: "/admin/ielts/keamanan", label: "Keamanan Ujian", ikon: "⚠" },
    { href: "/admin/ielts/live", label: "Skor Live", ikon: "◉" },
    { href: "/admin/profil", label: "Profil", ikon: "☰" },
  ] as const;

  const menu = hanyaIelts
    ? [...menuIelts]
    : language
      ? [...MENU.slice(0, 4), ielts, ...MENU.slice(4)]
      : [...MENU];

  return (
    <nav className="no-print border-b border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4">
        <ul className="flex gap-1 overflow-x-auto">
          {menu.map((m) => {
            const on = aktif(pathname, m.href, hanyaIelts);
            return (
              <li key={m.href} className="shrink-0">
                <Link
                  href={m.href}
                  aria-current={on ? "page" : undefined}
                  className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                    on
                      ? "border-brand text-brand"
                      : "border-transparent text-muted hover:text-foreground hover:border-line"
                  }`}
                >
                  <span aria-hidden>{m.ikon}</span>
                  {m.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
