import type { ReactNode } from "react";

import { Navbar } from "@/components/Navbar";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdminIelts } from "@/lib/auth/auth";
import { fiturLanguageAktif } from "@/lib/ielts/language";

export const metadata = { title: "Panel Admin" };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Sengaja `requireAdminIelts`, bukan `requireAdmin`: tata letak ini
  // membungkus /admin/ielts juga, sehingga penjaga yang menolak pemilik
  // lingkup IELTS akan memutar mereka tanpa ujung antara panel dan penjaga.
  // Yang menolak mereka di panel LAIN adalah `requireAdmin()` di tiap halaman
  // dan tiap Server Action-nya.
  const admin = await requireAdminIelts();
  const language = await fiturLanguageAktif();
  const hanyaIelts = admin.lingkup === "ielts";

  return (
    /* `tema-admin` — kertas krem, ditetapkan pengelola 11 September 2026.
       Pembungkusnya memuat Navbar juga, bukan cuma <main>, supaya bilah atas
       tidak tertinggal putih dingin di atas halaman yang hangat. Warnanya
       sendiri didefinisikan di `globals.css`; di sini cukup kelasnya. */
    <div className="tema-admin flex min-h-dvh flex-1 flex-col bg-background">
      {/* `jalur="admin"` menghapus baris "Tryout Real UTBK-SNBT" di bawah logo:
          panel ini mengurus seluruh jalur sekaligus — tryout, SKD, Warung,
          IELTS — jadi menyebut salah satunya di sini justru menyesatkan. */}
      <Navbar jalur="admin" />
      <AdminNav language={language} hanyaIelts={hanyaIelts} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <footer className="no-print border-t border-line py-6 text-center text-xs text-muted">
        Panel Admin ADZKIA SMART · pintarbersamaadzkia.com
      </footer>
    </div>
  );
}
