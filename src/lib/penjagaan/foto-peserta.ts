import "server-only";

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { one, run } from "@/lib/core/db";
import { kenaliJenisGambar } from "@/lib/naskah/gambar-soal";

/**
 * Foto peserta: penyimpanan dan pemasangannya.
 *
 * Yang masuk ke basis data hanyalah ALAMAT berkasnya; gambarnya sendiri duduk
 * di `public/peserta/`. Dua alasan, dan keduanya sudah pernah menggigit proyek
 * ini lewat gambar soal:
 *
 *  1. Cadangan basis data harus tetap ringan. `perbarui.sh` mencadangkan
 *     `adzkia.db` tiap kali diterbitkan; menaruh 385 foto di dalamnya membuat
 *     setiap cadangan membengkak tanpa guna.
 *  2. `deploy/perbarui.sh` tidak menyentuh `public/`, jadi foto yang sudah
 *     diunggah selamat dari pembaruan fitur — sama seperti `public/soal/`.
 *
 * Nama berkasnya adalah sidik jari isinya, jadi mengganti foto TIDAK pernah
 * menimpa berkas lama: alamat lamanya berhenti dipakai, dan peramban yang masih
 * memegang alamat itu di cache tidak pernah menampilkan foto orang lain.
 */

/** Folder di bawah `public/`, sekaligus awalan alamatnya. */
export const AKAR_FOTO = "peserta";

export interface HasilSimpanFoto {
  /** Alamat siap simpan ke kolom `users.foto`, mis. "/peserta/ab12….jpg". */
  url: string;
  ukuran: number;
  mime: string;
}

/**
 * Tulis satu foto ke `public/peserta/` dan kembalikan alamatnya.
 *
 * Pemanggil WAJIB sudah memastikan ukurannya di bawah `BATAS_FOTO_BYTE`.
 */
export async function simpanBerkasFoto(isi: Uint8Array): Promise<HasilSimpanFoto> {
  const jenis = kenaliJenisGambar(isi);
  if (!jenis) throw new Error("Isi berkas bukan gambar yang dikenali.");

  const sidik = createHash("sha1").update(isi).digest("hex").slice(0, 16);
  const berkasNama = `${sidik}.${jenis.ext}`;

  // Jalannya disusun dalam SATU `path.join` yang diawali `process.cwd()` dan
  // segmen harfiah — menyimpan foldernya di variabel lebih dulu membuat
  // Turbopack menjejaki seluruh proyek. Lihat catatan yang sama di
  // `gambar-soal.ts`.
  await mkdir(path.join(process.cwd(), "public", "peserta"), { recursive: true });
  await writeFile(path.join(process.cwd(), "public", "peserta", berkasNama), isi);

  return { url: `/${AKAR_FOTO}/${berkasNama}`, ukuran: isi.length, mime: jenis.mime };
}

/**
 * Apakah id ini benar-benar milik seorang peserta yang ada?
 *
 * Dipakai rute foto sebelum menulis: sejak fotonya hanya boleh diubah admin,
 * `user_id` datang dari formulir, dan id yang salah ketik tidak boleh diam-diam
 * berhasil sebagai UPDATE yang tidak mengenai baris mana pun.
 */
export async function pesertaAda(userId: number): Promise<boolean> {
  return (await one<{ n: number }>("SELECT COUNT(*) AS n FROM users WHERE id = ?", userId))?.n === 1;
}

/** Pasang alamat foto pada satu peserta. `null` menghapus fotonya. */
export async function setFotoPeserta(userId: number, url: string | null): Promise<void> {
  await run("UPDATE users SET foto = ? WHERE id = ?", url, userId);
}

/** Alamat foto peserta, atau `null` bila belum memasang. */
export async function fotoPeserta(userId: number): Promise<string | null> {
  return (await one<{ foto: string | null }>("SELECT foto FROM users WHERE id = ?", userId))?.foto ?? null;
}

/**
 * Identitas yang ditampilkan bersama fotonya di kartu identitas dan bilah ujian.
 *
 * Dikumpulkan dalam satu kueri karena ketiganya selalu tampil bersama-sama:
 * inilah yang dibaca peserta untuk memastikan NISN yang sedang dipakai memang
 * miliknya, bukan milik teman yang tadi memakai perangkat yang sama.
 */
export interface IdentitasFoto {
  nama: string;
  nisn: string | null;
  kelas: string | null;
  foto: string | null;
}

export async function identitasFoto(userId: number): Promise<IdentitasFoto | null> {
  return (
    await one<IdentitasFoto>(
      "SELECT nama, nisn, kelas, foto FROM users WHERE id = ?",
      userId,
    ) ?? null
  );
}
