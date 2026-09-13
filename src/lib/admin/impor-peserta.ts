import "server-only";

import { all, one, run, sisipWajib } from "@/lib/core/db";
import { hashPassword, normalisasiNama } from "@/lib/auth/auth";
import { bacaTabel, sel } from "@/lib/admin/impor-tabel";

/**
 * Impor daftar peserta dari Excel/CSV.
 *
 * Kolom yang dibaca (judul boleh huruf besar/kecil, boleh pakai spasi):
 *   NISN* · Nama* · Kelas · Kata Sandi* · Tanggal Lahir · Asal Sekolah · No HP
 *
 * NISN dipakai sebagai kunci: baris dengan NISN yang sudah ada akan
 * MEMPERBARUI akun tersebut, bukan membuat akun kembar. Kata sandi disimpan
 * ter-hash — pengelola tetap memegang salinan aslinya di berkas Excel.
 */

export interface BarisPeserta {
  nomorBaris: number;
  nisn: string;
  nama: string;
  kelas: string;
  password: string;
  /** Sudah dibakukan ke YYYY-MM-DD; kosong bila tidak diisi atau tidak terbaca. */
  tanggal_lahir: string;
  asal_sekolah: string;
  no_hp: string;
  galat: string[];
  /** NISN sudah terdaftar — akan diperbarui, bukan ditambah. */
  sudahAda: boolean;
}

export interface HasilParsePeserta {
  baris: BarisPeserta[];
  jumlahValid: number;
  jumlahGalat: number;
  jumlahPerbarui: number;
  kolomHilang: string[];
  errorFile?: string;
}

export interface HasilSimpanPeserta {
  ditambah: number;
  diperbarui: number;
  gagal: number;
}

const KOLOM_WAJIB = ["nisn", "nama", "katasandi"] as const;

function nisnValid(v: string): boolean {
  return /^\d{4,20}$/.test(v);
}

/**
 * Bakukan tanggal lahir ke YYYY-MM-DD.
 * Menerima "2008-05-17", "17/05/2008", dan "17-05-2008" — tiga bentuk yang
 * paling sering keluar dari Excel maupun ketikan tangan.
 */
function bakukanTanggal(v: string): string {
  const t = v.trim();
  if (!t) return "";

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  }

  const lokal = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(t);
  if (lokal) {
    return `${lokal[3]}-${lokal[2].padStart(2, "0")}-${lokal[1].padStart(2, "0")}`;
  }

  return "";
}

export async function parseFilePeserta(
  namaFile: string,
  data: ArrayBuffer,
): Promise<HasilParsePeserta> {
  let tabel;
  try {
    tabel = await bacaTabel(namaFile, data);
  } catch (e) {
    return {
      baris: [],
      jumlahValid: 0,
      jumlahGalat: 0,
      jumlahPerbarui: 0,
      kolomHilang: [],
      errorFile: e instanceof Error ? e.message : "Berkas tidak dapat dibaca.",
    };
  }

  const adaKolom = new Set(tabel.kolom);
  const kolomHilang = KOLOM_WAJIB.filter((k) => !adaKolom.has(k)).map((k) =>
    k === "katasandi" ? "Kata Sandi" : k.toUpperCase(),
  );
  if (kolomHilang.length > 0) {
    return {
      baris: [],
      jumlahValid: 0,
      jumlahGalat: 0,
      jumlahPerbarui: 0,
      kolomHilang,
      errorFile: `Kolom wajib belum ada di berkas: ${kolomHilang.join(", ")}.`,
    };
  }

  // NISN yang sudah terdaftar, untuk menandai baris "akan diperbarui".
  const terdaftar = new Set(
    (await all<{ nisn: string }>("SELECT nisn FROM users WHERE nisn IS NOT NULL AND nisn <> ''")).map(
      (r) => r.nisn,
    ),
  );

  const dilihat = new Map<string, number>();
  const baris: BarisPeserta[] = tabel.baris.map((b) => {
    const nisn = sel(b, "nisn").replace(/\s+/g, "");
    const nama = sel(b, "nama", "nama lengkap", "nama siswa").replace(/\s+/g, " ");
    const kelas = sel(b, "kelas", "rombel");
    const password = sel(b, "kata sandi", "password", "sandi");
    const lahirMentah = sel(b, "tanggal lahir", "tgl lahir", "lahir", "tanggallahir");
    const tanggal_lahir = bakukanTanggal(lahirMentah);
    const asal_sekolah = sel(b, "asal sekolah", "sekolah", "asal");
    const no_hp = sel(b, "no hp", "nohp", "hp", "whatsapp", "no whatsapp");

    const galat: string[] = [];
    if (!nisn) galat.push("NISN kosong.");
    else if (!nisnValid(nisn)) galat.push("NISN harus berupa angka (4–20 digit).");
    else if (dilihat.has(nisn)) galat.push(`NISN kembar dengan baris ${dilihat.get(nisn)}.`);

    if (nama.length < 3) galat.push("Nama minimal 3 huruf.");
    if (password.length < 4) galat.push("Kata sandi minimal 4 karakter.");
    if (lahirMentah && !tanggal_lahir) {
      galat.push(`Tanggal lahir "${lahirMentah}" tidak terbaca. Pakai 2008-05-17 atau 17/05/2008.`);
    }

    if (nisn && !dilihat.has(nisn)) dilihat.set(nisn, b.nomorBaris);

    return {
      nomorBaris: b.nomorBaris,
      nisn,
      nama,
      kelas,
      password,
      tanggal_lahir,
      asal_sekolah,
      no_hp,
      galat,
      sudahAda: terdaftar.has(nisn),
    };
  });

  const valid = baris.filter((b) => b.galat.length === 0);
  return {
    baris,
    jumlahValid: valid.length,
    jumlahGalat: baris.length - valid.length,
    jumlahPerbarui: valid.filter((b) => b.sudahAda).length,
    kolomHilang: [],
  };
}

/** Email internal unik untuk akun siswa yang tidak punya email asli. */
function emailDariNisn(nisn: string): string {
  return `${nisn}@siswa.local`;
}

/** Nama login unik: nama yang dibakukan, diberi akhiran angka bila kembar. */
async function namaLoginUnik(nama: string, userIdSendiri: number | null): Promise<string> {
  const dasar = normalisasiNama(nama);
  let kandidat = dasar;
  let n = 2;
  for (;;) {
    const bentrok = await one<{ id: number }>(
      "SELECT id FROM users WHERE nama_login = ?",
      kandidat,
    );
    if (!bentrok || bentrok.id === userIdSendiri) return kandidat;
    kandidat = `${dasar} ${n++}`;
  }
}

/**
 * Simpan baris yang lolos validasi.
 * Sengaja tidak dibungkus satu transaksi besar: hashing kata sandi memakan
 * waktu, dan satu baris bermasalah tidak boleh membatalkan ratusan baris lain.
 */
export async function simpanImporPeserta(baris: BarisPeserta[]): Promise<HasilSimpanPeserta> {
  const hasil: HasilSimpanPeserta = { ditambah: 0, diperbarui: 0, gagal: 0 };

  // PROSES BATCHING: Eksekusi 50 baris sekaligus secara bersamaan
  const BATCH_SIZE = 50;

  for (let i = 0; i < baris.length; i += BATCH_SIZE) {
    const batch = baris.slice(i, i + BATCH_SIZE);

    // Jalankan operasi DB dan Hashing secara paralel untuk 50 baris ini
    await Promise.all(
      batch.map(async (b) => {
        if (b.galat.length > 0) return;

        try {
          const hash = await hashPassword(b.password);
          const ada = await one<{ id: number; role: string }>(
            "SELECT id, role FROM users WHERE nisn = ?",
            b.nisn,
          );

          if (ada) {
            if (ada.role === "admin") {
              hasil.gagal++;
              return; // return di dalam map berfungsi seperti continue di loop biasa
            }
            await run(
              `UPDATE users
                  SET nama = ?, nama_login = ?, kelas = ?, password_hash = ?,
                      tanggal_lahir = COALESCE(NULLIF(?, ''), tanggal_lahir),
                      asal_sekolah  = COALESCE(NULLIF(?, ''), asal_sekolah),
                      no_hp         = COALESCE(NULLIF(?, ''), no_hp)
                WHERE id = ?`,
              b.nama,
              await namaLoginUnik(b.nama, ada.id),
              b.kelas || null,
              hash,
              b.tanggal_lahir,
              b.asal_sekolah,
              b.no_hp,
              ada.id,
            );
            hasil.diperbarui++;
            return;
          }

          await run(
            `INSERT INTO users (nama, nisn, kelas, tanggal_lahir, nama_login, email, password_hash, role, asal_sekolah, no_hp)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'siswa', ?, ?)`,
            b.nama,
            b.nisn,
            b.kelas || null,
            b.tanggal_lahir || null,
            await namaLoginUnik(b.nama, null),
            emailDariNisn(b.nisn),
            hash,
            b.asal_sekolah || null,
            b.no_hp || null,
          );
          hasil.ditambah++;
        } catch (error) {
          hasil.gagal++;
        }
      })
    );
  }

  return hasil;
}

/* ==========================================================================
   MENAMBAH SATU PESERTA DARI FORMULIR
   ========================================================================== */

export interface DataPesertaBaru {
  nisn: string;
  nama: string;
  kelas: string;
  password: string;
  asal_sekolah?: string;
  no_hp?: string;
}

/**
 * Menambahkan SATU peserta lewat formulir panel, tanpa berkas Excel.
 *
 * Diminta pengelola 11 September 2026: *"nama kelas dan nama siswa bisa
 * ditambahkan di fitur itu, ga mesti input file excel juga."* Impor Excel tetap
 * ada dan tetap jalur utama untuk satu angkatan sekaligus; yang ini untuk siswa
 * susulan, siswa pindahan, dan akun yang keliru terlewat — pekerjaan satuan
 * yang selama ini memaksa pengelola menyusun berkas Excel berisi satu baris.
 *
 * SENGAJA MENOLAK NISN YANG SUDAH ADA, berbeda dari impor Excel yang justru
 * MEMPERBARUI akun bernomor sama. Bedanya disengaja: impor adalah pemutakhiran
 * satu daftar, sedangkan formulir ini adalah penambahan satuan — dan kalau ia
 * diam-diam menimpa akun yang sudah ada, satu salah ketik NISN akan mengganti
 * nama DAN kata sandi siswa lain tanpa ada yang menyadarinya.
 *
 * Aturan lain dibuat SAMA PERSIS dengan impor supaya tidak ada dua pintu dengan
 * dua standar: NISN 4-20 digit, email internal `<nisn>@siswa.local`, nama login
 * dibuat unik sendiri, dan kata sandi disimpan ter-hash.
 */
export async function buatPesertaManual(
  data: DataPesertaBaru,
): Promise<{ id?: number; error?: string }> {
  const nisn = data.nisn.trim();
  const nama = data.nama.trim();
  const kelas = data.kelas.trim();
  const password = data.password;

  if (!nama) return { error: "Nama siswa wajib diisi." };
  if (!nisnValid(nisn)) {
    return { error: "NISN harus berupa angka 4-20 digit." };
  }
  if (password.length < 4) {
    return { error: "Kata sandi minimal 4 karakter." };
  }

  if (await one<{ id: number }>("SELECT id FROM users WHERE nisn = ?", nisn)) {
    return {
      error:
        `NISN ${nisn} sudah terdaftar. Periksa dulu di daftar peserta — ` +
        "kalau memang ingin memperbarui datanya, pakai Impor Excel yang memang menimpa akun bernomor sama.",
    };
  }

  try {
    const hash = await hashPassword(password);
    const res = await sisipWajib(
      `INSERT INTO users (nama, nisn, kelas, nama_login, email, password_hash, role, asal_sekolah, no_hp)
       VALUES (?, ?, ?, ?, ?, ?, 'siswa', ?, ?)`,
      nama,
      nisn,
      kelas || null,
      await namaLoginUnik(nama, null),
      emailDariNisn(nisn),
      hash,
      data.asal_sekolah?.trim() || null,
      data.no_hp?.trim() || null,
    );
    return { id: res };
  } catch {
    return { error: "Peserta gagal disimpan. Coba lagi." };
  }
}
