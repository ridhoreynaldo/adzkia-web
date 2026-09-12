import "server-only";

import { redirect } from "next/navigation";

import { all, one, run } from "@/lib/core/db";
import { getSession, type SessionUser } from "@/lib/auth/auth";

/**
 * Kunci portal per jalur latihan.
 *
 * Pengelola memegang kendali penuh kapan siswa boleh masuk: portal yang
 * DIKUNCI menutup seluruh jalurnya — halaman jalur, pintu masuk, ruang ujian,
 * sampai halaman hasil. Dipakai supaya tidak ada yang bisa membuka tryout
 * sebelum jam yang ditentukan atau mengintip soal sesudah sesi ditutup.
 *
 * Dua hal yang sengaja TIDAK ikut terkunci:
 *
 *  - **Admin.** Pengelola tetap bisa menembus kunci agar dapat menguji soal
 *    dan mengawasi ruang ujian selagi portal tertutup bagi siswa.
 *  - **Ujian yang sedang berjalan.** Rute penyimpan jawaban tidak diblokir,
 *    sehingga siswa yang sudah telanjur di dalam ruang ujian masih bisa
 *    menuntaskan dan menyimpan pekerjaannya. Mengunci portal menutup pintu
 *    masuk, bukan mencabut pekerjaan yang sedang berlangsung.
 */

export type JalurPortal = "utbk" | "skd";

export const JALUR_PORTAL: JalurPortal[] = ["utbk", "skd"];

export const NAMA_JALUR: Record<JalurPortal, string> = {
  utbk: "TryOut Real UTBK-SNBT",
  skd: "SKD Kedinasan",
};

export interface StatusPortal {
  jalur: JalurPortal;
  nama: string;
  terkunci: boolean;
  /** Kapan status ini terakhir diubah; null bila belum pernah disentuh. */
  diperbaruiAt: string | null;
  /** Nama admin yang terakhir mengubah; null bila belum pernah. */
  olehNama: string | null;
}

function kunciPengaturan(jalur: JalurPortal): string {
  return `portal_terkunci_${jalur}`;
}

interface BarisPengaturan {
  nilai: string;
  diperbarui_at: string;
  nama: string | null;
}

/**
 * Status satu portal. Baris yang belum pernah ada berarti portal TERBUKA —
 * memasang fitur ini tidak boleh mengunci sekolah dari aplikasinya sendiri.
 */
export async function statusPortal(jalur: JalurPortal): Promise<StatusPortal> {
  const r = await one<BarisPengaturan>(
    `SELECT p.nilai, p.diperbarui_at, u.nama
       FROM pengaturan p
       LEFT JOIN users u ON u.id = p.diperbarui_oleh
      WHERE p.kunci = ?`,
    kunciPengaturan(jalur),
  );
  return {
    jalur,
    nama: NAMA_JALUR[jalur],
    terkunci: r?.nilai === "1",
    diperbaruiAt: r?.diperbarui_at ?? null,
    olehNama: r?.nama ?? null,
  };
}

/** Status kedua portal sekaligus — dipakai panel admin dan halaman depan. */
export async function semuaStatusPortal(): Promise<StatusPortal[]> {
  const rows = await all<BarisPengaturan & { kunci: string }>(
    `SELECT p.kunci, p.nilai, p.diperbarui_at, u.nama
       FROM pengaturan p
       LEFT JOIN users u ON u.id = p.diperbarui_oleh
      WHERE p.kunci IN (?, ?)`,
    kunciPengaturan("utbk"),
    kunciPengaturan("skd"),
  );
  const peta = new Map(rows.map((r) => [r.kunci, r]));

  return JALUR_PORTAL.map((jalur) => {
    const r = peta.get(kunciPengaturan(jalur));
    return {
      jalur,
      nama: NAMA_JALUR[jalur],
      terkunci: r?.nilai === "1",
      diperbaruiAt: r?.diperbarui_at ?? null,
      olehNama: r?.nama ?? null,
    };
  });
}

/** Mengunci atau membuka satu portal. Hanya dipanggil dari aksi admin. */
export async function setPortal(jalur: JalurPortal, terkunci: boolean, adminId: number): Promise<void> {
  await run(
    `INSERT INTO pengaturan (kunci, nilai, diperbarui_at, diperbarui_oleh)
     VALUES (?, ?, datetime('now'), ?)
     ON CONFLICT (kunci) DO UPDATE SET
       nilai           = excluded.nilai,
       diperbarui_at   = excluded.diperbarui_at,
       diperbarui_oleh = excluded.diperbarui_oleh`,
    kunciPengaturan(jalur),
    terkunci ? "1" : "0",
    adminId,
  );
}

/** true bila jalur ini tertutup untuk `user` (admin selalu boleh lewat). */
export async function portalTertutupUntuk(jalur: JalurPortal, user: SessionUser | null): Promise<boolean> {
  if (user?.role === "admin") return false;
  return (await statusPortal(jalur)).terkunci;
}

/**
 * Penjaga untuk halaman mana pun yang termasuk satu jalur.
 *
 * Dipanggil di awal server component; bila portalnya dikunci, siswa dilempar
 * ke layar terkunci dan sisa halaman tidak pernah dirender.
 */
export async function jagaPortal(jalur: JalurPortal): Promise<void> {
  const user = await getSession();
  if (await portalTertutupUntuk(jalur, user)) redirect(`/terkunci?jalur=${jalur}`);
}

/** Bentuk jalur yang aman dari nilai bebas (query string, kolom database). */
export function keJalurPortal(nilai: string | null | undefined): JalurPortal {
  return nilai === "skd" ? "skd" : "utbk";
}
