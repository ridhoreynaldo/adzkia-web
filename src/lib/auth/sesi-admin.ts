import {
  type SesiPerangkat,
  klaimSesi,
  lepasSesi,
  sentuhSesi,
  sesiAktif,
} from "@/lib/auth/sesi-perangkat";

export { labelAlat } from "@/lib/auth/sesi-perangkat";

/**
 * Satu akun admin = satu perangkat (ditetapkan pengguna 4 September 2026).
 *
 * Seluruh mekanismenya kini tinggal di `sesi-perangkat.ts`, dipakai bersama
 * dengan kunci peserta (`sesi-peserta.ts`) supaya keduanya tidak bisa berbeda
 * pendapat tentang arti "sesi masih hidup". Yang tersisa di berkas ini hanya
 * yang memang khas admin: tabelnya, jeda menganggurnya, dan bunyi pesannya.
 *
 * Kenapa ada JEDA_MENGANGGUR_MENIT: menolak tanpa syarat terdengar paling
 * ketat, tetapi mengunci akun sampai cookie-nya kedaluwarsa (30 hari) begitu
 * admin menutup browser tanpa menekan Keluar — HP hilang, baterai habis, atau
 * sekadar lupa. Maka sesi yang tidak menunjukkan aktivitas selama jeda ini
 * dianggap ditinggalkan dan boleh diambil alih perangkat lain. Selama admin
 * benar-benar memakai panelnya, `sentuhSesiAdmin` menyegarkan `terakhir_at`
 * tiap kali halaman admin dibuka, jadi sesi yang aktif tidak akan pernah
 * direbut di tengah pekerjaan.
 */

const TABEL = "admin_sesi" as const;

export const JEDA_MENGANGGUR_MENIT = 15;

export type SesiAdmin = SesiPerangkat;

/** Sesi yang masih dianggap hidup untuk akun admin ini, atau undefined. */
export async function sesiAdminAktif(userId: number): Promise<SesiAdmin | undefined> {
  return await sesiAktif(TABEL, userId, JEDA_MENGANGGUR_MENIT);
}

/** Mendaftarkan perangkat admin yang baru masuk. */
export async function klaimSesiAdmin(userId: number, sid: string, alat: string | null): Promise<void> {
  await klaimSesi(TABEL, userId, sid, alat);
}

/** Menyegarkan aktivitas; false berarti cookie ini bukan perangkat yang sah. */
export async function sentuhSesiAdmin(userId: number, sid: string | null): Promise<boolean> {
  return await sentuhSesi(TABEL, userId, sid);
}

/** Melepas sesi admin supaya perangkat lain boleh masuk. Dipanggil saat Keluar. */
export async function lepasSesiAdmin(userId: number, sid: string | null): Promise<void> {
  await lepasSesi(TABEL, userId, sid);
}

/** Bunyi pesan penolakan di halaman login, lengkap dengan perangkatnya. */
export function pesanSesiDipakai(sesi: SesiAdmin): string {
  const alat = sesi.alat ? ` (${sesi.alat})` : "";
  return (
    `Akun ini sedang dipakai masuk di perangkat lain${alat}. ` +
    `Satu akun admin hanya boleh dipakai di satu perangkat. ` +
    `Tekan Keluar di perangkat itu, tunggu ${JEDA_MENGANGGUR_MENIT} menit tanpa aktivitas, ` +
    `atau masuk memakai akun admin lain.`
  );
}
