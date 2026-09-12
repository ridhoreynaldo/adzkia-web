/**
 * LANGUAGE SKILL — bagian yang tidak menyentuh server sama sekali.
 *
 * Dipisah dari `language.ts` dengan alasan yang sama seperti
 * `foto-peserta-konstanta.ts`: aturan tampil/tidaknya fitur ini harus bisa
 * diuji dengan `node` biasa, sedangkan `language.ts` mengimpor `next/headers`
 * yang hanya hidup di dalam Next.
 *
 * ATURAN POKOK — BERUBAH 10 SEPTEMBER 2026: fitur ini TERBIT.
 *
 * Sampai 9 September 2026 gerbangnya menutup diri di mana pun selain jaringan
 * lokal, karena fiturnya belum selesai dan siswa memakai server yang sama untuk
 * tryout sungguhan. Dua hal yang menahannya sudah selesai: jalur IELTS utuh
 * dari ujung ke ujung, dan ruang ujiannya kini memakai penjagaan yang SAMA
 * dengan TryOut UTBK-SNBT (`usePenjagaIelts` + `ielts-penjagaan.ts`). Pengelola
 * meminta penerbitannya pada 10 September 2026.
 *
 * Karena itu bawaannya sekarang TAMPIL di alamat mana pun, dan satu-satunya
 * yang bisa menutupnya adalah env `ADZKIA_LANGUAGE_SKILLS=0`.
 *
 * KENAPA ENV-NYA TETAP ADA, dan jangan dihapus: ia satu-satunya cara
 * menyembunyikan seluruh jalur ini tanpa menerbitkan ulang aplikasi. Bila kelak
 * ada paket IELTS yang bocor, naskah yang keliru, atau apa pun yang menuntut
 * jalur ini ditutup pada hari-H, satu baris di `.env.local` server berikut satu
 * `systemctl restart adzkia` sudah cukup — dan itu jauh lebih cepat daripada
 * membangun ulang. Pemeriksa alamat lokal juga tetap dipertahankan sebagai
 * PEMBUKA: `ADZKIA_LANGUAGE_SKILLS=0` di server produksi tidak boleh sekalian
 * mematikan fitur ini di laptop pengelola yang sedang menyiapkan soalnya.
 */

export const NAMA_FITUR = "Language Skill";

export type UjianBahasa = "ielts" | "toefl";

export interface ProfilUjian {
  kode: UjianBahasa;
  nama: string;
  panjang: string;
  /** Satu kalimat untuk kartu pilihan. */
  ringkas: string;
  /** Nama bagian ujiannya, dipakai sebagai lencana di kartu. */
  bagian: string[];
  skala: string;
}

export const UJIAN: Record<UjianBahasa, ProfilUjian> = {
  ielts: {
    kode: "ielts",
    nama: "IELTS",
    panjang: "International English Language Testing System",
    ringkas:
      "Latihan Academic IELTS lengkap empat keterampilan, dinilai dengan band score 0–9 seperti ujian aslinya.",
    bagian: ["Listening", "Reading", "Writing", "Speaking"],
    skala: "Band 0–9",
  },
  toefl: {
    kode: "toefl",
    nama: "TOEFL",
    panjang: "Test of English as a Foreign Language",
    ringkas:
      "Latihan TOEFL iBT dengan tugas terpadu membaca–mendengar–menulis, dinilai pada skala 0–120.",
    bagian: ["Reading", "Listening", "Speaking", "Writing"],
    skala: "Skor 0–120",
  },
};

export const DAFTAR_UJIAN: ProfilUjian[] = [UJIAN.ielts, UJIAN.toefl];

/** Membuang nomor porta dan kurung siku IPv6 dari nilai header Host. */
export function bersihkanHost(host: string): string {
  const satu = host.split(",")[0]!.trim().toLowerCase();
  // "[::1]:3000" → "::1"
  if (satu.startsWith("[")) {
    const tutup = satu.indexOf("]");
    return tutup > 0 ? satu.slice(1, tutup) : satu.slice(1);
  }
  // IPv6 telanjang ("::1") tidak punya porta yang bisa dibuang — titik duanya
  // bagian dari alamat, jadi jangan disentuh.
  if (satu.split(":").length > 2) return satu;
  // "situs.com:3000" → "situs.com"
  return satu.replace(/:\d+$/, "");
}

/** Benar bila alamatnya menunjuk komputer sendiri atau jaringan lokal. */
export function hostLokal(host: string): boolean {
  const h = bersihkanHost(host);
  if (!h) return false;
  if (h === "localhost" || h.endsWith(".localhost") || h === "::1" || h === "0.0.0.0") return true;
  if (h === "127.0.0.1" || h.startsWith("127.")) return true;
  if (h.startsWith("192.168.") || h.startsWith("10.")) return true;
  // 172.16.0.0 – 172.31.255.255
  const m = /^172\.(\d{1,3})\./.exec(h);
  if (m) {
    const blok = Number(m[1]);
    if (blok >= 16 && blok <= 31) return true;
  }
  return false;
}

/**
 * Keputusan akhir: fitur Language Skill boleh tampil atau tidak.
 *
 * Sejak fiturnya terbit (10 September 2026) jawabannya YA kecuali ada yang
 * menutupnya, bukan lagi TIDAK kecuali ada yang membukanya. Urutan bacanya:
 *
 *   1. `ADZKIA_LANGUAGE_SKILLS=0`  → hilang, di mana pun. Ini rem daruratnya;
 *      lihat catatan di kepala berkas tentang mengapa ia wajib tetap ada.
 *   2. alamat LOKAL                → tampil, apa pun isi env-nya. Pengelola
 *      yang mematikan fitur ini di server tetap bisa menyiapkan soal di
 *      laptopnya.
 *   3. selain itu                  → tampil.
 *
 * Nilai env selain "0"/"false"/"1"/"true" diabaikan: salah ketik di berkas
 * .env.local tidak boleh diam-diam mematikan sebuah jalur ujian.
 */
export function bolehLanguageSkills(host: string | null | undefined, paksa?: string | null): boolean {
  const p = (paksa ?? "").trim().toLowerCase();
  if (p === "1" || p === "true") return true;
  if (p === "0" || p === "false") return hostLokal(host ?? "");
  return true;
}
