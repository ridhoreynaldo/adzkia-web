import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { one, sisipWajib } from "@/lib/core/db";
import { RUTE_LOGIN_ADMIN, RUTE_PANEL_IELTS } from "@/lib/admin/admin-konstanta";
import { lepasSesiAdmin, sentuhSesiAdmin } from "@/lib/auth/sesi-admin";
import { lepasSesiPeserta, sentuhSesiPeserta } from "@/lib/auth/sesi-peserta";
import { UMUR, baca, buangSesi, kunciSesi, tulis } from "@/lib/core/cache";

const COOKIE = "adzkia_session";
const SECRET = new TextEncoder().encode(
  process.env.ADZKIA_SECRET ?? "adzkia-smart-dev-secret-ganti-di-produksi-2026",
);

export type Role = "siswa" | "admin";

/**
 * Sejauh mana seorang pengelola boleh masuk.
 *
 * `null` — pengelola penuh: seluruh panel, seperti sebelum kolom ini ada.
 * `"ielts"` — pengelola IELTS saja, akun yang dibuat 10 September 2026 untuk
 * pintu masuk pengelola yang sama. Ia tidak boleh menyentuh paket tryout,
 * data peserta, maupun catatan pelanggaran UTBK.
 *
 * Yang menegakkannya `requireAdmin()` (menolak lingkup selain penuh) dan
 * `requireAdminIelts()` (menerima keduanya) — bukan tampilan menunya, karena
 * alamat halaman bisa diketik siapa saja.
 */
export type LingkupAdmin = null | "ielts";

export interface SessionUser {
  id: number;
  nama: string;
  email: string;
  role: Role;
  /** Diisi untuk akun siswa hasil impor; null untuk admin dan akun lama. */
  nisn: string | null;
  kelas: string | null;
  /** Batas wewenang pengelola. null = penuh. Selalu null untuk siswa. */
  lingkup: LingkupAdmin;
}

export interface UserRow extends SessionUser {
  nama_login: string | null;
  password_hash: string;
  asal_sekolah: string | null;
  no_hp: string | null;
  target_ptn: string | null;
  target_prodi: string | null;
  created_at: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Cookie sesi hanya boleh ditandai `Secure` bila halaman benar-benar diakses
 * lewat HTTPS. Sebelumnya penandanya mengikuti NODE_ENV, sehingga versi
 * produksi yang dilayani lewat HTTP biasa (mis. jaringan sekolah di
 * http://10.x.x.x:3000) membuat browser membuang cookie — pengguna berhasil
 * memasukkan sandi tetapi selalu terlempar kembali ke halaman login.
 *
 * ADZKIA_COOKIE_SECURE bisa diisi "1"/"0" untuk memaksa nilainya.
 */
async function pakaiCookieSecure(): Promise<boolean> {
  const paksa = process.env.ADZKIA_COOKIE_SECURE;
  if (paksa === "1") return true;
  if (paksa === "0") return false;

  const h = await headers();
  const proto = (h.get("x-forwarded-proto") ?? "").split(",")[0]!.trim().toLowerCase();
  if (proto) return proto === "https";

  // Tanpa reverse proxy: simpulkan dari asal permintaan.
  const asal = h.get("origin") ?? h.get("referer") ?? "";
  return asal.startsWith("https://");
}

/**
 * `sid` WAJIB untuk SEMUA akun — pengelola sejak 4 September 2026, peserta
 * sejak 8 September 2026: itulah penanda "satu akun satu perangkat, satu
 * peramban". Cookie tanpa `sid` — terbitan sebelum aturan ini ada — sengaja
 * dianggap tidak login oleh `getSession`, sehingga semua orang diminta masuk
 * sekali lagi setelah pembaruan ini terbit.
 *
 * KARENA ITU JANGAN MENERBITKAN PEMBARUAN INI DI TENGAH JAM UJIAN: peserta
 * yang sedang mengerjakan akan terlempar ke halaman login dan harus masuk
 * lagi. Jawaban mereka tidak hilang (tersimpan per butir di server), tetapi
 * waktunya tetap berjalan selama mereka mengetik ulang sandi.
 */
export async function createSession(user: SessionUser, sid?: string): Promise<void> {
  const token = await new SignJWT({ ...user, ...(sid ? { sid } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await pakaiCookieSecure(),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();

  // Melepas kunci "satu perangkat" HARUS terjadi di sini, bukan di
  // `logoutAction`: ini satu-satunya jalan keluar yang dipakai seluruh
  // aplikasi, jadi tidak ada tombol Keluar yang bisa lupa melepaskannya.
  const token = jar.get(COOKIE)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      const id = Number(payload.id);
      const sid = typeof payload.sid === "string" ? payload.sid : null;
      // Peserta ikut dilepas di sini: tombol Keluar adalah satu-satunya cara
      // sah membebaskan akun untuk dipakai di perangkat lain, dan peserta yang
      // sudah menekannya tidak boleh menunggu jeda menganggur apa pun.
      if (payload.role === "admin") await lepasSesiAdmin(id, sid);
      else await lepasSesiPeserta(id, sid);
      // Entri cache-nya ikut dibuang SEKETIKA — tanpa ini, cookie yang baru
      // saja ditinggalkan masih diterima sampai UMUR.sesi detik berikutnya.
      await buangSesi(id);
    } catch {
      // Cookie rusak atau kedaluwarsa — tidak ada sesi yang perlu dilepas.
    }
  }

  jar.delete(COOKIE);
}

/** User yang sedang login, atau null. Aman dipanggil di server component mana pun. */
/** Isi entri cache sesi: hasil pembuktian, berikut `sid` yang saat itu sah. */
interface SesiTersimpan {
  sid: string;
  user: SessionUser;
}

async function bacaSesi(userId: number): Promise<SesiTersimpan | undefined> {
  return await baca<SesiTersimpan>(kunciSesi(userId));
}

async function simpanSesi(userId: number, sid: string, user: SessionUser): Promise<void> {
  await tulis<SesiTersimpan>(kunciSesi(userId), UMUR.sesi, { sid, user });
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const id = Number(payload.id);
    const sidCookie = typeof payload.sid === "string" ? payload.sid : null;

    // JALAN PINTAS CACHE.
    //
    // Dua query di bawah — baris `users` dan pemeriksaan tabel sesi — dibayar
    // pada SETIAP permintaan terautentikasi, termasuk denyut lima detik milik
    // tiap peserta. Pada 10.000 peserta itu 6.000 query per detik yang tidak
    // mengerjakan apa pun selain membuktikan ulang hal yang sama.
    //
    // Yang disimpan adalah HASIL pembuktian itu, berikut `sid` yang saat itu
    // sah. Aturan "satu akun satu perangkat" TIDAK dilemahkan: `sid` dari
    // cookie tetap harus sama persis dengan `sid` yang tercatat; yang berubah
    // hanya dari mana angka pembandingnya dibaca. Cookie dengan `sid` yang
    // salah tetap ditolak, dan pencabutan yang disengaja membuang entrinya
    // seketika lewat `buangSesi()` — lihat catatan pada UMUR.sesi.
    //
    // Cache mati = jalur di bawah ini berjalan seperti sebelumnya.
    if (sidCookie) {
      const tersimpan = await bacaSesi(id);
      if (tersimpan && tersimpan.sid === sidCookie) return tersimpan.user;
    }

    // Pastikan user masih ada (dan role terbaru dipakai).
    const baris = await one<Omit<SessionUser, "lingkup"> & { lingkup: string | null }>(
      "SELECT id, nama, email, role, nisn, kelas, lingkup FROM users WHERE id = ?",
      id,
    );
    if (!baris) return null;
    // Lingkup dibaca dari basis data, BUKAN dari cookie: mencabut wewenang
    // seorang pengelola harus berlaku cepat, tanpa menunggu cookienya
    // kedaluwarsa 30 hari lagi.
    //
    // CATATAN TENTANG CACHE DI ATAS: lewat jalan pintas itu, lingkup ikut
    // terbaca dari entri cache dan karenanya bisa tertinggal paling lama
    // UMUR.sesi (60 detik). Itu diterima dengan sadar — lingkup hanya diubah
    // lewat skrip pemeliharaan, bukan lewat panel, jadi tidak ada alur
    // pengguna yang menunggunya. Kalau kelak ada halaman yang MENGUBAH
    // lingkup, halaman itu WAJIB memanggil `buangSesi(userId)` sesudahnya,
    // persis seperti yang dilakukan saat peran diganti.
    const u: SessionUser = { ...baris, lingkup: keLingkup(baris.lingkup) };

    // Gerbang "satu akun satu perangkat, satu peramban". Cookie yang `sid`-nya
    // tidak lagi tercatat berarti sesinya sudah dilepas (tombol Keluar,
    // pelepasan oleh pengawas) atau diambil alih perangkat lain sesudah
    // menganggur — perlakukan sebagai tidak login, jangan diam-diam diloloskan.
    // Panggilan ini sekaligus menyegarkan penanda aktivitas, sehingga admin
    // yang sedang bekerja dan peserta yang sedang mengerjakan soal tidak pernah
    // dianggap menganggur.
    //
    // Berlaku untuk KEDUA peran. Kalau suatu saat gerbang ini perlu dimatikan
    // sementara, matikan lewat kedua tabel sesinya — jangan dengan meloloskan
    // cookie tanpa `sid` di sini, karena itu membuka kembali jalan dua
    // perangkat memakai satu akun berbarengan.
    const sid = sidCookie;
    const sah = u.role === "admin" ? await sentuhSesiAdmin(u.id, sid) : await sentuhSesiPeserta(u.id, sid);
    if (!sah) return null;

    // Disimpan SESUDAH terbukti sah, tidak pernah sebelumnya. Entri ini juga
    // menjadi penanda kapan `terakhir_at` berikutnya disegarkan: begitu ia
    // kedaluwarsa, permintaan berikutnya kembali melewati `sentuhSesi()`.
    if (sid) await simpanSesi(u.id, sid, u);

    return u;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const u = await getSession();
  if (!u) redirect("/login");
  return u;
}

/** Nilai kolom `users.lingkup` yang bebas menjadi bentuk yang dikenal kode. */
export function keLingkup(nilai: string | null | undefined): LingkupAdmin {
  return String(nilai ?? "").trim().toLowerCase() === "ielts" ? "ielts" : null;
}

/**
 * Pengelola PENUH. Dipakai seluruh panel di luar IELTS.
 *
 * Pengelola berlingkup IELTS yang mengetikkan alamat panel lain dilempar ke
 * panel IELTS-nya, bukan ke halaman login: ia memang sudah masuk, hanya tidak
 * berwenang di sana, dan melemparnya ke login membuatnya mengira sandinya
 * salah lalu mencoba berulang kali.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const u = await getSession();
  // Pintu masuk pengelola terpisah dari pintu masuk siswa.
  if (!u) redirect(RUTE_LOGIN_ADMIN);
  if (u.role !== "admin") redirect("/dashboard");
  if (u.lingkup === "ielts") redirect(RUTE_PANEL_IELTS);
  return u;
}

/**
 * Pengelola yang boleh membuka panel IELTS: pengelola penuh DAN pengelola
 * berlingkup IELTS.
 *
 * Dipakai oleh `/admin/ielts/**`, seluruh Server Action-nya, dan tata letak
 * panel — sebab tata letak itu membungkus halaman IELTS juga, sehingga tidak
 * boleh memakai `requireAdmin()` yang justru menolak pemilik lingkup IELTS.
 */
export async function requireAdminIelts(): Promise<SessionUser> {
  const u = await getSession();
  if (!u) redirect(RUTE_LOGIN_ADMIN);
  if (u.role !== "admin") redirect("/dashboard");
  return u;
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  return await one<UserRow>("SELECT * FROM users WHERE email = ?", email.toLowerCase().trim());
}

/**
 * Bentuk baku nama untuk login siswa: huruf kecil, spasi ganda dirapikan.
 * "  Aisyah   Nur Ramadhani " dan "aisyah nur ramadhani" dianggap sama supaya
 * siswa tidak gagal masuk hanya karena huruf besar atau spasi berlebih.
 */
export function normalisasiNama(nama: string): string {
  return nama.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Cari siswa berdasarkan nama login. */
export async function findUserByNama(nama: string): Promise<UserRow | undefined> {
  return await one<UserRow>("SELECT * FROM users WHERE nama_login = ?", normalisasiNama(nama));
}

/** Cari siswa berdasarkan NISN — kunci login utama peserta. */
export async function findUserByNisn(nisn: string): Promise<UserRow | undefined> {
  const v = nisn.trim().replace(/\s+/g, "");
  if (!v) return undefined;
  return await one<UserRow>("SELECT * FROM users WHERE nisn = ?", v);
}

/** Email internal untuk akun siswa yang mendaftar tanpa email. */
function emailInternal(namaLogin: string): string {
  const slug = namaLogin.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "siswa";
  return `${slug}@siswa.local`;
}

/** true untuk email yang dibuat sistem, bukan email asli milik siswa. */
export function emailBuatanSistem(email: string): boolean {
  return email.endsWith("@siswa.local");
}

export async function registerUser(input: {
  nama: string;
  /** Opsional — siswa mendaftar cukup dengan nama. Dipakai admin. */
  email?: string;
  password: string;
  asal_sekolah?: string;
  no_hp?: string;
  role?: Role;
}): Promise<SessionUser> {
  const nama = input.nama.trim().replace(/\s+/g, " ");
  const namaLogin = normalisasiNama(nama);
  const email = (input.email?.toLowerCase().trim() || emailInternal(namaLogin));
  const hash = await hashPassword(input.password);
  const res = await sisipWajib(
    `INSERT INTO users (nama, nama_login, email, password_hash, role, asal_sekolah, no_hp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    nama,
    namaLogin,
    email,
    hash,
    input.role ?? "siswa",
    input.asal_sekolah ?? null,
    input.no_hp ?? null,
  );
  return {
    id: res,
    nama,
    email,
    role: input.role ?? "siswa",
    nisn: null,
    kelas: null,
    lingkup: null,
  };
}
