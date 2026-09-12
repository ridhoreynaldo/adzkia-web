import "server-only";

import { all, one, run, tx } from "@/lib/core/db";

/**
 * Katalog program studi SNBT + pilihan jurusan peserta.
 *
 * Katalognya dipakai kolom pencarian "Pilihan Program Studi" sebelum tryout
 * dimulai. Isinya diimpor pengelola dari berkas resmi; sebelum itu, database
 * mengisinya sendiri dari tabel `campuses` supaya fitur ini tetap bisa dicoba.
 */

/** Banyaknya pilihan yang boleh diisi peserta (SNBT 2027: 4 pilihan). */
export const MAKS_PILIHAN = 4;
/** Pilihan 1 dan 2 wajib; sisanya boleh dikosongkan. */
export const MIN_PILIHAN = 2;

/**
 * Jenjang yang boleh masuk tiap kotak pilihan.
 *
 * Aturan pengelola SMA Islam Plus Adzkia: Pilihan 1 dan 2 KHUSUS SARJANA (S1),
 * Pilihan 3 dan 4 KHUSUS VOKASI (D3 dan D4). Batas ini ditegakkan di tiga
 * tempat sekaligus — pencarian (yang tidak boleh dipilih tidak ikut muncul),
 * penyimpanan (simpanPilihan menolak jenjang yang salah), dan halaman
 * pengisian (pilihan lama yang jenjangnya tidak lagi cocok dikosongkan).
 * Menyaring di pencarian saja tidak cukup: kotak isian mengirim id prodi, dan
 * id itu bisa disusun sendiri di luar halaman.
 */
const ATURAN_JENJANG: readonly (readonly string[])[] = [
  ["S1"],
  ["S1"],
  ["D3", "D4"],
  ["D3", "D4"],
];

/** Jenjang yang sah untuk kotak pilihan ke-`urutan` (1..MAKS_PILIHAN). */
export function jenjangPilihan(urutan: number): readonly string[] {
  return ATURAN_JENJANG[urutan - 1] ?? [];
}

/** Tulisan jenjang untuk label di layar peserta, mis. "S1" atau "D3/D4". */
export function labelJenjang(urutan: number): string {
  return jenjangPilihan(urutan).join("/");
}

/** Label jenjang untuk seluruh kotak, urut 1..MAKS_PILIHAN. */
export function labelJenjangSemua(): string[] {
  return Array.from({ length: MAKS_PILIHAN }, (_, i) => labelJenjang(i + 1));
}

/** Prodi berjenjang `jenjang` boleh ditaruh di kotak pilihan ke-`urutan`? */
export function jenjangCocok(urutan: number, jenjang: string | null | undefined): boolean {
  const baku = bakukanJenjang(jenjang);
  return baku != null && jenjangPilihan(urutan).includes(baku);
}

/**
 * Menyeragamkan tulisan jenjang jadi tiga kode baku: S1, D4, D3.
 *
 * Berkas katalog yang diunggah pengelola menulisnya bermacam-macam — "S-1",
 * "Sarjana", "D-IV", "Sarjana Terapan", "Diploma Tiga". Tanpa dibakukan,
 * penyaringan Pilihan 1-2 vs 3-4 akan menolak prodi yang sebenarnya sah.
 * "Sarjana Terapan" sengaja diperiksa lebih dulu daripada "Sarjana": ia D4,
 * bukan S1. null bila tulisannya tidak dikenali sama sekali.
 */
export function bakukanJenjang(nilai?: string | null): string | null {
  const t = (nilai ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!t) return null;
  if (t.includes("SARJANATERAPAN") || /^D(4|IV|IPLOMA4|IPLOMAIV|IPLOMAEMPAT)$/.test(t)) return "D4";
  if (/^D(3|III|IPLOMA3|IPLOMAIII|IPLOMATIGA)$/.test(t) || t.includes("AHLIMADYA")) return "D3";
  if (/^S(1|ATU|TRATA1)$/.test(t) || t.includes("SARJANA")) return "S1";
  return null;
}

export interface ProdiRow {
  id: number;
  nama: string;
  ptn: string;
  jenjang: string | null;
  kelompok: string | null;
  /**
   * Ancar-ancar skor UTBK minimum prodi ini, dari tabel `campuses`.
   * Ditampilkan di kotak pencarian supaya peserta tahu target skornya sejak
   * memilih, bukan baru sesudah ujian selesai. null bila prodinya belum punya
   * angka sama sekali — sesudah scripts/lengkapi-ambang.mjs seharusnya tidak
   * ada lagi, tetapi katalog bisa diimpor ulang pengelola kapan saja.
   */
  skor_min: number | null;
}

export interface PilihanRow {
  urutan: number;
  prodi_id: number | null;
  prodi_nama: string;
  ptn: string;
  /** Ancar-ancar skor minimum, dijodohkan lewat nama yang tersimpan. */
  skor_min: number | null;
  /** Jenjang prodinya di katalog. null bila katalog sudah diimpor ulang. */
  jenjang: string | null;
}

/* ------------------------------------------------------------------ */
/* Katalog                                                              */
/* ------------------------------------------------------------------ */

/**
 * Penjodohan katalog prodi dengan basis data ancar-ancar skor.
 *
 * Keduanya menuliskan nama dengan gaya berbeda — `prodi` HURUF BESAR, `campuses`
 * Kapital Awal — sehingga perbandingannya harus lewat UPPER(). Indeks
 * `idx_campuses_jodoh` dibuat atas ungkapan yang sama persis; kalau baris ini
 * diubah, indeks di src/lib/db.ts harus ikut diubah.
 */
const JODOH_CAMPUSES = `LEFT JOIN campuses c
         ON UPPER(c.ptn) = UPPER(p.ptn) AND UPPER(c.prodi) = UPPER(p.nama)`;

export async function jumlahProdi(): Promise<number> {
  return (await one<{ n: number }>("SELECT COUNT(*) AS n FROM prodi"))?.n ?? 0;
}

export async function jumlahKampus(): Promise<number> {
  return (await one<{ n: number }>("SELECT COUNT(DISTINCT ptn) AS n FROM prodi"))?.n ?? 0;
}

/**
 * Cari prodi untuk kotak pencarian.
 *
 * Setiap kata kunci harus muncul di kolom `cari` ("nama prodi + kampus"),
 * sehingga "informatika undip" dan "undip informatika" sama-sama ketemu.
 * Yang namanya diawali kata kunci ditaruh lebih dulu supaya ketikan pendek
 * seperti "bahasa" langsung memunculkan yang paling masuk akal.
 *
 * `jenjang` menyaring hasil ke jenjang tertentu — dipakai kotak Pilihan 1-4
 * supaya peserta hanya melihat S1 (pilihan 1-2) atau D3/D4 (pilihan 3-4).
 * Prodi yang jenjangnya kosong di katalog ikut tersaring keluar; kalau itu
 * terjadi, halaman Admin → Program Studi menampilkan peringatannya.
 */
export async function cariProdi(kueri: string, batas = 25, jenjang?: readonly string[]): Promise<ProdiRow[]> {
  const kata = kueri.trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
  if (kata.length === 0) return [];

  const syarat = kata.map(() => "p.cari LIKE ?").join(" AND ");
  const params: unknown[] = kata.map((k) => `%${k}%`);
  const awalan = `${kata[0]}%`;

  // Katalog menyimpan jenjang apa adanya dari berkas impor, jadi perbandingan
  // memakai bentuk bakunya (S-1 -> S1, Sarjana Terapan -> D4).
  let saring = "";
  if (jenjang && jenjang.length > 0) {
    const varian = varianJenjang(jenjang);
    saring = ` AND UPPER(REPLACE(REPLACE(COALESCE(p.jenjang, ''), '-', ''), ' ', '')) IN (${varian
      .map(() => "?")
      .join(", ")})`;
    params.push(...varian);
  }

  return await all<ProdiRow>(
    `SELECT p.id, p.nama, p.ptn, p.jenjang, p.kelompok, c.skor_min
       FROM prodi p
       ${JODOH_CAMPUSES}
      WHERE ${syarat}${saring}
      ORDER BY CASE WHEN LOWER(p.nama) LIKE ? THEN 0 ELSE 1 END, p.nama, p.ptn
      LIMIT ?`,
    ...params,
    awalan,
    Math.min(Math.max(batas, 1), 50),
  );
}

/**
 * Tulisan jenjang yang dianggap sama dengan kode baku, untuk dipakai di SQL.
 * SQLite tidak bisa memanggil bakukanJenjang(), jadi daftarnya disebutkan.
 */
function varianJenjang(jenjang: readonly string[]): string[] {
  const peta: Record<string, string[]> = {
    S1: ["S1", "SARJANA", "STRATA1"],
    D4: ["D4", "DIV", "DIPLOMA4", "DIPLOMAIV", "SARJANATERAPAN"],
    D3: ["D3", "DIII", "DIPLOMA3", "DIPLOMAIII", "AHLIMADYA"],
  };
  return jenjang.flatMap((j) => peta[j] ?? [j]);
}

/** Banyaknya prodi per jenjang baku — dipakai panel admin untuk berjaga. */
export async function jumlahProdiPerJenjang(): Promise<{ jenjang: string; n: number }[]> {
  const baris = await all<{ jenjang: string | null; n: number }>(
    "SELECT jenjang, COUNT(*) AS n FROM prodi GROUP BY jenjang",
  );
  const kumpul = new Map<string, number>([
    ["S1", 0],
    ["D4", 0],
    ["D3", 0],
    ["—", 0],
  ]);
  for (const b of baris) {
    const kunci = bakukanJenjang(b.jenjang) ?? "—";
    kumpul.set(kunci, (kumpul.get(kunci) ?? 0) + b.n);
  }
  return [...kumpul].map(([jenjang, n]) => ({ jenjang, n }));
}

export async function ambilProdi(id: number): Promise<ProdiRow | undefined> {
  if (!Number.isInteger(id) || id <= 0) return undefined;
  return await one<ProdiRow>(
    `SELECT p.id, p.nama, p.ptn, p.jenjang, p.kelompok, c.skor_min
       FROM prodi p ${JODOH_CAMPUSES} WHERE p.id = ?`,
    id,
  );
}

export interface HasilImporProdi {
  ditambah: number;
  diperbarui: number;
  dilewati: number;
  galat: string[];
}

export interface BarisProdi {
  nama: string;
  ptn: string;
  jenjang?: string;
  kelompok?: string;
}

/** Simpan hasil impor katalog. Baris yang sudah ada diperbarui, bukan digandakan. */
export async function imporProdi(baris: BarisProdi[], hapusDulu: boolean): Promise<HasilImporProdi> {
  const hasil: HasilImporProdi = { ditambah: 0, diperbarui: 0, dilewati: 0, galat: [] };

  await tx(async () => {
    if (hapusDulu) {
      // `pilihan_prodi.prodi_id` memakai ON DELETE SET NULL, dan nama prodi
      // sudah disalin ke barisnya, jadi pilihan lama tetap terbaca.
      await run("DELETE FROM prodi");
    }

    for (const b of baris) {
      const nama = b.nama.trim().replace(/\s+/g, " ").toUpperCase();
      const ptn = b.ptn.trim().replace(/\s+/g, " ").toUpperCase();
      if (!nama || !ptn) {
        hasil.dilewati++;
        continue;
      }

      const ada = await one<{ id: number }>(
        "SELECT id FROM prodi WHERE nama = ? AND ptn = ?",
        nama,
        ptn,
      );
      await run(
        `INSERT INTO prodi (nama, ptn, jenjang, kelompok, cari)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (nama, ptn) DO UPDATE SET
           jenjang  = excluded.jenjang,
           kelompok = excluded.kelompok,
           cari     = excluded.cari`,
        nama,
        ptn,
        // Dibakukan sejak disimpan supaya penyaringan Pilihan 1-2 (S1) dan
        // 3-4 (D3/D4) tidak bergantung pada gaya penulisan berkas asalnya.
        // Tulisan yang tidak dikenali disimpan apa adanya agar tetap terlihat
        // pengelola — prodi itu memang tidak akan muncul di kotak pilihan.
        bakukanJenjang(b.jenjang) ?? (b.jenjang?.trim().toUpperCase() || null),
        b.kelompok?.trim() || null,
        `${nama} ${ptn}`.toLowerCase(),
      );
      if (ada) hasil.diperbarui++;
      else hasil.ditambah++;
    }
  });

  return hasil;
}

/* ------------------------------------------------------------------ */
/* Pilihan peserta                                                      */
/* ------------------------------------------------------------------ */

export async function pilihanPeserta(userId: number, packageId: number): Promise<PilihanRow[]> {
  // Dijodohkan lewat nama yang disalin ke barisnya, bukan lewat prodi_id:
  // katalog boleh diimpor ulang (prodi_id jadi NULL) tanpa membuat ambang
  // batas pilihan lama ikut hilang. Sama seperti seleksi di src/lib/kampus.ts.
  // Jenjang ikut dibaca supaya halaman pengisian bisa mengosongkan pilihan
  // lama yang jenjangnya tidak lagi sesuai aturan Pilihan 1-2 S1 / 3-4 D3-D4.
  return await all<PilihanRow>(
    `SELECT pp.urutan, pp.prodi_id, pp.prodi_nama, pp.ptn, c.skor_min, pr.jenjang
       FROM pilihan_prodi pp
       LEFT JOIN campuses c
              ON UPPER(c.ptn) = UPPER(pp.ptn) AND UPPER(c.prodi) = UPPER(pp.prodi_nama)
       LEFT JOIN prodi pr
              ON UPPER(pr.ptn) = UPPER(pp.ptn) AND UPPER(pr.nama) = UPPER(pp.prodi_nama)
      WHERE pp.user_id = ? AND pp.package_id = ?
      ORDER BY pp.urutan`,
    userId,
    packageId,
  );
}

/** Sudah mengisi pilihan wajib (1 dan 2) untuk paket ini? */
export async function pilihanLengkap(userId: number, packageId: number): Promise<boolean> {
  const n =
    (await one<{ n: number }>(
      `SELECT COUNT(*) AS n FROM pilihan_prodi
        WHERE user_id = ? AND package_id = ? AND urutan <= ?`,
      userId,
      packageId,
      MIN_PILIHAN,
    ))?.n ?? 0;
  return n >= MIN_PILIHAN;
}

/**
 * Simpan pilihan jurusan peserta untuk satu paket.
 * `idProdi[i]` = id prodi untuk pilihan ke-(i+1); 0/NaN berarti dikosongkan.
 */
export async function simpanPilihan(
  userId: number,
  packageId: number,
  idProdi: number[],
): Promise<{ error?: string }> {
  const dipakai = new Set<number>();
  const terpilih: { urutan: number; prodi: ProdiRow }[] = [];

  for (let i = 0; i < MAKS_PILIHAN; i++) {
    const id = Number(idProdi[i]);
    const urutan = i + 1;

    if (!Number.isInteger(id) || id <= 0) {
      if (urutan <= MIN_PILIHAN) {
        return { error: `Pilihan Program Studi ${urutan} wajib diisi.` };
      }
      continue;
    }

    const prodi = await ambilProdi(id);
    if (!prodi) return { error: `Pilihan ${urutan} tidak dikenali. Pilih ulang dari daftar.` };
    if (!jenjangCocok(urutan, prodi.jenjang)) {
      return {
        error:
          `Pilihan ${urutan} harus program studi ${labelJenjang(urutan)}. ` +
          `${prodi.nama} — ${prodi.ptn} berjenjang ${prodi.jenjang ?? "tidak diketahui"}. ` +
          `Pilihan 1 dan 2 khusus S1; Pilihan 3 dan 4 khusus D3 dan D4.`,
      };
    }
    if (dipakai.has(id)) {
      return { error: `${prodi.nama} — ${prodi.ptn} dipilih lebih dari sekali.` };
    }
    dipakai.add(id);
    terpilih.push({ urutan, prodi });
  }

  await tx(async () => {
    await run("DELETE FROM pilihan_prodi WHERE user_id = ? AND package_id = ?", userId, packageId);
    for (const t of terpilih) {
      await run(
        `INSERT INTO pilihan_prodi (user_id, package_id, urutan, prodi_id, prodi_nama, ptn)
         VALUES (?, ?, ?, ?, ?, ?)`,
        userId,
        packageId,
        t.urutan,
        t.prodi.id,
        t.prodi.nama,
        t.prodi.ptn,
      );
    }
  });

  return {};
}
