"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/auth";
import {
  attemptSiswa,
  getAttempt,
  getPaket,
  jumlahSoalPaket,
  keadaanUjian,
  mulaiAttempt,
  mulaiSusulan,
  paketDapatDikerjakan,
  paketDapatDikerjakanSusulan,
  selesaikanSubtes,
} from "@/lib/tryout/exam";
import { MAKS_PILIHAN, simpanPilihan } from "@/lib/rujukan/prodi";
import { namaSubtes } from "@/lib/tryout/snbt";
import type { HasilAksiSubtes } from "@/components/exam/tipe";

/**
 * Simpan pilihan program studi peserta, lalu antar ke halaman pemberitahuan.
 *
 * Dipanggil dari halaman /tryout/[id]/jurusan. Paket harus benar-benar terbuka
 * untuk peserta ini — lewat jendela waktu biasa atau lewat izin susulan.
 */
export async function simpanJurusanAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const packageId = Number(formData.get("packageId"));

  const paket = await getPaket(packageId);
  if (!paket) redirect("/dashboard");

  const jalurBiasa = await paketDapatDikerjakan(paket, user.id);
  const jalurSusulan = await paketDapatDikerjakanSusulan(paket, user.id);
  if (!jalurBiasa && !jalurSusulan) redirect("/dashboard");

  const idProdi: number[] = [];
  for (let i = 1; i <= MAKS_PILIHAN; i++) {
    idProdi.push(Number(formData.get(`prodi${i}`) ?? 0));
  }

  const res = await simpanPilihan(user.id, packageId, idProdi);
  if (res.error) {
    redirect(`/tryout/${packageId}/jurusan?e=${encodeURIComponent(res.error)}`);
  }

  revalidatePath(`/tryout/${packageId}`);
  redirect(jalurBiasa ? `/tryout/${packageId}` : `/tryout/${packageId}/susulan`);
}

/** Tombol "Mulai Ujian" di halaman persiapan. */
export async function mulaiUjianAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const packageId = Number(formData.get("packageId"));
  const setuju = formData.get("setuju");

  const paket = await getPaket(packageId);
  if (!paket || !await paketDapatDikerjakan(paket, user.id)) redirect("/dashboard");
  if (setuju !== "ya") redirect(`/tryout/${packageId}?e=tatatertib`);

  // Paket kosong TIDAK BOLEH melahirkan attempt. Kalau dibiarkan, peserta
  // berputar selamanya: ruang ujian tidak punya subtes untuk dibuka, ia
  // dilempar ke halaman hasil, hasilnya berkata “belum selesai”, dan beranda
  // kembali menawarkan “Lanjutkan Ujian”. Penjaga di halaman persiapan saja
  // tidak cukup — aksi ini bisa dipanggil langsung.
  if (await jumlahSoalPaket(packageId) === 0) redirect(`/tryout/${packageId}?e=kosong`);

  const sudah = await attemptSiswa(user.id, packageId);
  if (sudah && sudah.status === "finished") redirect(`/hasil/${sudah.id}`);

  await mulaiAttempt(user.id, packageId);
  revalidatePath("/dashboard");
  redirect(`/tryout/${packageId}/kerjakan`);
}

/**
 * Tombol "Mulai TryOut" pada jalur ujian susulan.
 *
 * Hanya jalan bila admin sudah memberi izin untuk peserta + paket ini. Jendela
 * waktu paket diabaikan — peserta susulan memang mengerjakan setelah hari-H.
 */
export async function mulaiSusulanAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const packageId = Number(formData.get("packageId"));
  const setuju = formData.get("setuju");

  const paket = await getPaket(packageId);
  if (!paket || !await paketDapatDikerjakanSusulan(paket, user.id)) redirect("/dashboard");
  if (setuju !== "ya") redirect(`/tryout/${packageId}/susulan?e=tatatertib`);

  // Alasan yang sama dengan jalur biasa di atas.
  if (await jumlahSoalPaket(packageId) === 0) {
    redirect(`/tryout/${packageId}/susulan?e=kosong`);
  }

  const sudah = await attemptSiswa(user.id, packageId);
  if (sudah?.status === "finished") redirect(`/hasil/${sudah.id}`);

  const att = await mulaiSusulan(user.id, packageId);
  if (!att) redirect("/dashboard");

  revalidatePath("/dashboard");
  redirect(`/tryout/${packageId}/kerjakan`);
}

/**
 * Menutup subtes yang sedang berjalan (ditekan peserta atau waktunya habis).
 * Mengembalikan keadaan berikutnya supaya klien tahu harus refresh atau
 * pindah ke halaman hasil.
 */
export async function selesaikanSubtesAction(
  attemptId: number,
  subtes: string,
): Promise<HasilAksiSubtes> {
  const user = await requireUser();
  const att = await getAttempt(Number(attemptId));
  if (!att || att.user_id !== user.id) {
    return { status: "gagal", pesan: "Sesi ujian tidak ditemukan." };
  }
  if (att.status === "finished") {
    return { status: "selesai", attemptId: att.id };
  }

  const sekarang = await keadaanUjian(att.id, { mulaiOtomatis: false });
  if (!sekarang) return { status: "gagal", pesan: "Sesi ujian tidak ditemukan." };

  // Hanya subtes yang benar-benar aktif yang boleh ditutup.
  if (!sekarang.selesai && sekarang.subtes === subtes && sekarang.sudahMulai) {
    await selesaikanSubtes(att.id, subtes);
  }

  const berikut = await keadaanUjian(att.id, { mulaiOtomatis: false });
  revalidatePath(`/tryout/${att.package_id}/kerjakan`);
  revalidatePath("/dashboard");

  if (!berikut || berikut.selesai || !berikut.subtes) {
    return { status: "selesai", attemptId: att.id };
  }
  return {
    status: "lanjut",
    subtes: berikut.subtes,
    namaSubtes: namaSubtes(berikut.subtes),
  };
}
