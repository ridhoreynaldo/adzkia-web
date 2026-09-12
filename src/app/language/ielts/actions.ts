"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/auth";
import { wajibFiturLanguage } from "@/lib/ielts/language";
import {
  GagalIelts,
  bukaSubtes,
  mulaiPengerjaan,
  paketById,
  pengerjaan,
  pengerjaanBerjalan,
  selesaikanSubtes,
  setujuiRules,
  simpanJawaban,
  statusPortalIelts,
  wajibSubtes,
} from "@/lib/ielts/ielts";

/**
 * Aksi sisi peserta IELTS.
 *
 * Tiga penjaga dipasang di SETIAP aksi, bukan hanya di halamannya: fitur harus
 * aktif, harus ada sesi siswa, dan portal IELTS tidak sedang dikunci. Server
 * Action punya alamatnya sendiri — halaman yang dijaga rapi tidak menjaga
 * aksinya.
 */
async function peserta() {
  await wajibFiturLanguage();
  const user = await getSession();
  if (!user) redirect("/language/login?next=%2Flanguage%2Fielts");
  if (user.role !== "admin" && (await statusPortalIelts()).terkunci) {
    redirect("/language/ielts?galat=" + encodeURIComponent("Portal IELTS sedang dikunci pengelola."));
  }
  return user;
}

function pesanGagal(e: unknown, bawaan: string): string {
  return e instanceof GagalIelts ? e.message : bawaan;
}

/** Menyiapkan pengerjaan lalu mengantar ke halaman tata tertib. */
export async function mulaiIeltsAction(formData: FormData): Promise<void> {
  const user = await peserta();
  const paketId = Number(formData.get("paketId"));
  const paket = await paketById(paketId);
  if (!paket) {
    redirect("/language/ielts?galat=" + encodeURIComponent("Paket tidak ditemukan."));
  }

  try {
    await mulaiPengerjaan(user.id, paketId);
  } catch (e) {
    redirect("/language/ielts?galat=" + encodeURIComponent(pesanGagal(e, "Ujian gagal dibuka.")));
  }
  redirect(`/language/ielts/rules?paket=${paketId}`);
}

/**
 * Mencatat persetujuan tata tertib.
 *
 * Kotak centang di halaman aturan sudah `required`, tetapi nilainya tetap
 * diperiksa lagi di sini: yang dikirim peramban bukan sumber kebenaran.
 */
export async function setujuRulesAction(formData: FormData): Promise<void> {
  const user = await peserta();
  const paketId = Number(formData.get("paketId"));
  const setuju = String(formData.get("setuju") ?? "") === "1";
  if (!setuju) {
    redirect(
      `/language/ielts/rules?paket=${paketId}&galat=` +
        encodeURIComponent("Centang persetujuan lebih dulu sebelum mulai."),
    );
  }

  try {
    await setujuiRules(user.id, paketId);
  } catch (e) {
    redirect(
      `/language/ielts/rules?paket=${paketId}&galat=` +
        encodeURIComponent(pesanGagal(e, "Persetujuan gagal disimpan.")),
    );
  }
  redirect("/language/ielts/ujian");
}

/** Membuka satu subtes dan menyalakan timernya di server. */
export async function bukaSubtesAction(formData: FormData): Promise<void> {
  const user = await peserta();
  const subtes = wajibSubtes(String(formData.get("subtes") ?? ""));
  const p = await pengerjaanBerjalan(user.id);
  if (!p) redirect("/language/ielts");

  try {
    await bukaSubtes(p, subtes);
  } catch (e) {
    redirect(
      "/language/ielts/ujian?galat=" + encodeURIComponent(pesanGagal(e, "Subtes gagal dibuka.")),
    );
  }
  redirect(`/language/ielts/ujian/${subtes.toLowerCase()}`);
}

/**
 * Menyimpan satu jawaban. Dipanggil ruang ujian tiap kali siswa mengetik atau
 * memilih, jadi ia harus murah dan tidak pernah melempar ke layar galat.
 *
 * Memulangkan `false` bila ditolak server (waktu habis, subtes belum dibuka);
 * ruang ujian memakai itu untuk berhenti mencoba dan memberi tahu siswa.
 */
export async function simpanJawabanAction(soalId: number, jawaban: string): Promise<boolean> {
  await wajibFiturLanguage();
  const user = await getSession();
  if (!user) return false;

  const p = await pengerjaanBerjalan(user.id);
  if (!p) return false;

  try {
    await simpanJawaban(p, soalId, jawaban);
    return true;
  } catch {
    return false;
  }
}

/** Menutup subtes — atas kemauan siswa, atau saat waktunya habis. */
export async function selesaikanSubtesAction(formData: FormData): Promise<void> {
  const user = await peserta();
  const subtes = wajibSubtes(String(formData.get("subtes") ?? ""));
  const p = await pengerjaanBerjalan(user.id);
  if (!p) redirect("/language/ielts");

  await selesaikanSubtes(p, subtes);
  revalidatePath("/language/ielts/ujian");
  redirect("/language/ielts/ujian?pesan=" + encodeURIComponent(`${subtes} selesai.`));
}

/** Dipanggil ruang ujian saat hitung mundur menyentuh nol. */
export async function tutupKarenaWaktuAction(subtesMentah: string): Promise<void> {
  await wajibFiturLanguage();
  const user = await getSession();
  if (!user) return;
  const p = await pengerjaanBerjalan(user.id);
  if (!p) return;
  await selesaikanSubtes(p, wajibSubtes(subtesMentah));
}

/** Melihat pengerjaan yang sedang berjalan — dipakai halaman jalur. */
export async function pengerjaanSaya(paketId: number) {
  const user = await getSession();
  if (!user) return undefined;
  return await pengerjaan(user.id, paketId);
}
