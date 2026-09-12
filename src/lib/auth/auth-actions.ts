"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSession,
  destroySession,
  findUserByEmail,
  findUserByNama,
  findUserByNisn,
  keLingkup,
  verifyPassword,
} from "@/lib/auth/auth";
import { RUTE_PANEL_IELTS } from "@/lib/admin/admin-konstanta";
import { buangSesi } from "@/lib/core/cache";
import { alamatPemanggil, hitungLaju } from "@/lib/core/laju";
import {
  klaimSesiAdmin,
  labelAlat,
  pesanSesiDipakai,
  sesiAdminAktif,
} from "@/lib/auth/sesi-admin";
import {
  klaimSesiPeserta,
  pesanSesiPesertaDipakai,
  sesiPesertaAktif,
} from "@/lib/auth/sesi-peserta";

export interface FormState {
  error?: string;
}

/**
 * Login siswa memakai NISN + kata sandi yang dibagikan pengelola.
 *
 * Akun lama yang belum punya NISN masih bisa masuk dengan mengetikkan namanya
 * di kolom yang sama — pencarian NISN dicoba lebih dulu, baru nama. Begitu
 * seluruh peserta diimpor beserta NISN-nya, jalur nama tidak terpakai lagi.
 */
export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const nisn = String(formData.get("nisn") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // Hanya jalur internal yang diterima — "//situs-lain.com" ditolak supaya
  // tautan login tidak bisa dipakai melempar siswa ke luar aplikasi.
  const next = String(formData.get("next") ?? "");
  const tujuan = next.startsWith("/") && !next.startsWith("//") ? next : "/mulai";
  if (!nisn || !password) return { error: "NISN dan kata sandi wajib diisi." };

  // PEMBATAS LAJU GERBANG MASUK — 10 percobaan tiap 10 menit.
  //
  // Dihitung DUA KALI: per alamat (menahan satu mesin yang menebak banyak akun)
  // dan per NISN (menahan banyak mesin yang menebak satu akun). Keduanya perlu;
  // masing-masing sendirian punya celah yang jelas.
  //
  // Diletakkan SEBELUM kata sandi diperiksa, karena justru percobaan yang GAGAL
  // itulah yang harus dibatasi. Peserta sah yang salah ketik sekali-dua kali
  // tidak akan pernah menyentuh angka ini.
  const alamat = alamatPemanggil(await headers());
  const [lajuAlamat, lajuAkun] = await Promise.all([
    hitungLaju("login", `ip:${alamat}`),
    hitungLaju("login", `nisn:${nisn.toLowerCase()}`),
  ]);
  if (!lajuAlamat.boleh || !lajuAkun.boleh) {
    return {
      error:
        "Terlalu banyak percobaan masuk dari perangkat ini. Tunggu beberapa menit lalu coba lagi. "
        + "Kalau kamu lupa sandi, jangan menebak-nebak — hubungi pengawas.",
    };
  }

  const user = await findUserByNisn(nisn) ?? await findUserByNama(nisn);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return {
      error:
        "NISN atau kata sandi salah. Periksa lagi NISN-mu; kalau masih gagal, hubungi pengawas.",
    };
  }
  // Akun admin tidak boleh lewat pintu siswa. Bukan soal rapi-rapian: sesi
  // yang dibuat di sini tidak punya `sid`, sehingga akan langsung ditolak
  // `getSession` dan pengelola terjebak dalam lingkaran login.
  if (user.role === "admin") {
    return { error: "Akun pengelola tidak bisa masuk lewat pintu peserta." };
  }

  // SATU AKUN = SATU PERANGKAT, SATU PERAMBAN (8 September 2026).
  //
  // Yang ditolak adalah pendatang KEDUA, bukan pemegang pertama — perangkat
  // yang sedang mengerjakan soal tidak boleh bisa diputus dari jauh oleh siapa
  // pun yang tahu NISN dan sandinya. Pemeriksaan ini sengaja diletakkan SESUDAH
  // kata sandi diverifikasi, supaya halaman login tidak membocorkan akun mana
  // yang sedang dipakai kepada orang yang tidak tahu sandinya.
  const dipakai = await sesiPesertaAktif(user.id);
  if (dipakai) return { error: pesanSesiPesertaDipakai(dipakai) };

  const sid = crypto.randomUUID();
  await klaimSesiPeserta(user.id, sid, labelAlat((await headers()).get("user-agent")));
  // Perangkat berpindah: entri cache milik `sid` lama harus lenyap seketika,
  // bukan menunggu umurnya habis.
  await buangSesi(user.id);

  await createSession(
    {
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
      nisn: user.nisn,
      kelas: user.kelas,
      // Siswa tidak pernah punya lingkup — kolom itu hanya berarti bagi
      // pengelola.
      lingkup: null,
    },
    sid,
  );
  redirect(tujuan);
}

/**
 * Login khusus pengelola — tetap memakai email, dan akun siswa ditolak supaya
 * pintu masuk admin benar-benar terpisah.
 */
export async function loginAdminAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email dan kata sandi wajib diisi." };

  // Sama seperti pintu peserta: dibatasi per alamat DAN per akun.
  const alamatAdmin = alamatPemanggil(await headers());
  const [lajuIpAdmin, lajuAkunAdmin] = await Promise.all([
    hitungLaju("login", `ip:${alamatAdmin}`),
    hitungLaju("login", `email:${email.toLowerCase()}`),
  ]);
  if (!lajuIpAdmin.boleh || !lajuAkunAdmin.boleh) {
    return {
      error:
        "Terlalu banyak percobaan masuk dari perangkat ini. Tunggu beberapa menit lalu coba lagi. "
        + "Kalau kamu lupa sandi, jangan menebak-nebak — hubungi pengawas.",
    };
  }

  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { error: "Email atau kata sandi salah." };
  }
  if (user.role !== "admin") {
    return {
      error:
        "Akun ini terdaftar sebagai siswa. Silakan masuk lewat tombol MULAI TRYOUT REAL UTBK-SNBT.",
    };
  }

  // Satu akun admin = satu perangkat. Perangkat yang datang belakangan
  // DITOLAK — perangkat pertama tidak boleh terputus di tengah pekerjaannya.
  // Pemeriksaan ini sengaja diletakkan SESUDAH kata sandi diverifikasi, supaya
  // halaman login tidak membocorkan akun mana yang sedang dipakai kepada orang
  // yang tidak tahu sandinya.
  const dipakai = await sesiAdminAktif(user.id);
  if (dipakai) return { error: pesanSesiDipakai(dipakai) };

  const sid = crypto.randomUUID();
  await klaimSesiAdmin(user.id, sid, labelAlat((await headers()).get("user-agent")));
  await buangSesi(user.id);

  const lingkup = keLingkup(user.lingkup as unknown as string | null);

  await createSession(
    {
      id: user.id,
      nama: user.nama,
      email: user.email,
      role: user.role,
      nisn: user.nisn,
      kelas: user.kelas,
      lingkup,
    },
    sid,
  );

  // Tujuan sesudah masuk. Hanya jalur internal yang diterima, dan hanya alamat
  // panel — tanpa penyaringan ini kolom tersembunyi di formulir login bisa
  // dipakai melempar pengelola ke mana saja.
  const next = String(formData.get("next") ?? "");
  const diminta = next.startsWith("/admin") && !next.startsWith("//") ? next : null;
  redirect(lingkup === "ielts" ? RUTE_PANEL_IELTS : (diminta ?? "/admin"));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
