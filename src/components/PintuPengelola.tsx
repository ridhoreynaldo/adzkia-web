"use client";

import { useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";

import { RUTE_LOGIN_ADMIN } from "@/lib/admin/admin-konstanta";

/**
 * Pintu masuk pengelola yang tidak kelihatan sebagai pintu.
 *
 * Seluruh tombol "LOGIN ADMIN" sengaja dicabut dari halaman yang dilihat siswa
 * (ditetapkan pengguna 31 Agustus 2026): keberadaannya di pojok halaman awal
 * terlalu mengundang. Sebagai gantinya, baris hak cipta di kaki halaman menjadi
 * pintunya — KETUK LIMA KALI beruntun, lalu halaman login admin terbuka.
 *
 * Yang perlu diingat kalau nanti diubah:
 *
 * - Ini PENYAMARAN, bukan pengamanan. Alamat RUTE_LOGIN_ADMIN tetap bisa
 *   diketik siapa saja bila tertebak; yang menjaga panel tetap `requireAdmin()`
 *   dan kata sandinya. Sejak 4 September 2026 alamatnya /ADZ-ADM4S, dan
 *   /login/admin sudah dihapus.
 * - Sengaja tanpa penanda apa pun — tanpa kursor tangan, tanpa efek sorot,
 *   tanpa `title` — sebab satu saja penanda membuatnya ketahuan sebagai tautan.
 * - Ketukan disetel ulang bila jedanya lebih dari JEDA_MAKS_MS, supaya siswa
 *   yang tidak sengaja mengetuk beberapa kali sepanjang hari tidak tembus.
 * - `select-none` mencegah tulisannya tersorot biru saat diketuk cepat, yang
 *   justru akan menarik perhatian.
 */

const KETUKAN_DIBUTUHKAN = 5;
const JEDA_MAKS_MS = 1500;

export function PintuPengelola({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const jumlah = useRef(0);
  const terakhir = useRef(0);

  function ketuk() {
    const kini = Date.now();
    jumlah.current = kini - terakhir.current > JEDA_MAKS_MS ? 1 : jumlah.current + 1;
    terakhir.current = kini;

    if (jumlah.current >= KETUKAN_DIBUTUHKAN) {
      jumlah.current = 0;
      router.push(RUTE_LOGIN_ADMIN);
    }
  }

  return (
    <p className={`select-none ${className}`.trim()} onClick={ketuk}>
      {children}
    </p>
  );
}
