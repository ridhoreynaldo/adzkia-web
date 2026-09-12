"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { destroySession, requireUser } from "@/lib/auth/auth";
import { GagalWarung, mulaiSesi, selesaikanSesi, simpanJawaban } from "@/lib/warung/warung";

/**
 * Tindakan sisi siswa untuk Warung Soal.
 *
 * Kunci jawaban tidak pernah dikirim ke peramban selama sesi berlangsung:
 * jawaban hanya disimpan apa adanya, dan penilaiannya baru dilakukan server
 * saat sesi ditutup.
 */

export async function mulaiSesiAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const paketId = Number.parseInt(String(fd.get("paket_id") ?? ""), 10);
  const subtes = String(fd.get("subtes") ?? "");
  const kembali = subtes ? `/warung/${subtes}` : "/warung";

  if (!Number.isInteger(paketId)) redirect(`${kembali}?galat=Paket+tidak+dikenali`);

  let sesiId: number;
  try {
    sesiId = await mulaiSesi(user.id, paketId);
  } catch (e) {
    const pesan = e instanceof GagalWarung ? e.message : "Latihan gagal dimulai.";
    redirect(`${kembali}?galat=${encodeURIComponent(pesan)}`);
  }

  redirect(`/warung/main/${sesiId}`);
}

export type SimpanBalasan = { ok: true } | { error: string };

export async function simpanJawabanAction(input: {
  sesiId: number;
  soalId: number;
  jawaban: string | null;
  ragu: boolean;
}): Promise<SimpanBalasan> {
  const user = await requireUser();
  try {
    await simpanJawaban(user.id, input.sesiId, input.soalId, input.jawaban, input.ragu);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof GagalWarung ? e.message : "Jawaban gagal disimpan." };
  }
}

/**
 * Tutup sesi dan hitung nilainya.
 *
 * Dipanggil tombol "Selesai" maupun oleh layar ketika waktunya habis, jadi
 * fungsinya harus tahan dipanggil dua kali — `selesaikanSesi` sendiri idempoten.
 */
export async function selesaikanSesiAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const sesiId = Number.parseInt(String(fd.get("sesi_id") ?? ""), 10);
  if (!Number.isInteger(sesiId)) redirect("/warung");

  try {
    await selesaikanSesi(user.id, sesiId);
  } catch (e) {
    const pesan = e instanceof GagalWarung ? e.message : "Sesi gagal ditutup.";
    redirect(`/warung?galat=${encodeURIComponent(pesan)}`);
  }

  revalidatePath("/warung");
  revalidatePath("/warung/peringkat");
  redirect(`/warung/main/${sesiId}`);
}

/** Keluar dari Warung Soal dan kembali ke pintu masuknya, bukan ke login tryout. */
export async function keluarWarungAction(): Promise<void> {
  await destroySession();
  redirect("/warung/login");
}
