import "server-only";

import { all, one, run, tx, sisipWajib} from "@/lib/core/db";
import { cekJawaban } from "@/lib/tryout/irt";
import { SUBTES, type SubtesKode, getSubtes } from "@/lib/tryout/snbt";

/**
 * WARUNG SOAL — latihan harian per subtes UTBK.
 *
 * Bentuknya, dan alasan tiap keputusannya:
 *
 * - Siswa memilih SATU SUBTES, lalu satu paket latihan di dalamnya. Tiap subtes
 *   punya 30 paket tetap yang bertingkat: Paket 1-10 Easy, 11-20 Medium, 21-30
 *   Hard. Tingkatnya dihitung dari nomor paket, tidak disimpan, supaya nomor
 *   dan kategori tidak mungkin berselisih.
 * - Jumlah dan bentuk soal tiap paket mengikuti aturan resmi subtesnya (lihat
 *   KOMPOSISI): pilihan ganda biasa, tiga butir pilihan ganda kompleks
 *   Benar/Salah, dan satu sampai dua isian singkat.
 * - Satu paket dikerjakan dengan SATU TIMER sepanjang durasi resmi subtes itu
 *   (PU 30 menit, PPU 15, dan seterusnya), dan siswa bebas berpindah antar soal
 *   di dalamnya — persis seperti ruang ujian sungguhan, sehingga Warung
 *   sekaligus melatih pembagian waktu.
 * - Paket TERBUKA MENGIKUTI KEMAJUAN SISWA, bukan dibuka admin: Paket 1 selalu
 *   terbuka, dan paket berikutnya terbuka begitu siswa menuntaskan paket
 *   sebelumnya. Jadi tiap siswa punya titik kemajuannya sendiri, dan pengelola
 *   cukup mengisi soal — tidak ada tombol "terbitkan" yang bisa lupa ditekan.
 * - Paket boleh diulang sebanyak-banyaknya (ditetapkan pengguna). Yang menjaga
 *   papan peringkat tetap adil bukan pembatasan jumlah percobaan, melainkan
 *   cara menghitungnya: HANYA NILAI TERBAIK tiap paket yang masuk papan, jadi
 *   mengulang paket yang sama berkali-kali tidak menumpuk poin.
 * - Tidak ada layar penuh, tidak ada pengguguran, tidak ada IRT. Ini ruang
 *   berlatih, bukan ruang ujian.
 */

/* ==========================================================================
   KATEGORI PAKET
   ========================================================================== */

export type KategoriWarung = "easy" | "medium" | "hard";

export interface InfoKategori {
  kode: KategoriWarung;
  nama: string;
  julukan: string;
  keterangan: string;
  /** Rentang nomor paket yang termasuk kategori ini. */
  dari: number;
  sampai: number;
  /** Poin untuk satu jawaban benar di paket kategori ini. */
  poin: number;
  warna: string;
  warnaLembut: string;
}

export const PAKET_PER_SUBTES = 30;

export const KATEGORI: InfoKategori[] = [
  {
    kode: "easy",
    nama: "Easy",
    julukan: "Pemanasan",
    keterangan: "Konsep dasar dan soal satu langkah. Tempat membangun kebiasaan harian.",
    dari: 1,
    sampai: 10,
    poin: 10,
    warna: "#22c55e",
    warnaLembut: "rgba(34,197,94,0.16)",
  },
  {
    kode: "medium",
    nama: "Medium",
    julukan: "Tantangan",
    keterangan: "Setara soal UTBK pada umumnya. Butuh pemahaman, bukan hafalan.",
    dari: 11,
    sampai: 20,
    poin: 20,
    warna: "#f59e0b",
    warnaLembut: "rgba(245,158,11,0.16)",
  },
  {
    kode: "hard",
    nama: "Hard",
    julukan: "Pertarungan",
    keterangan: "Penalaran bertingkat dan jebakan khas soal sulit. Poinnya paling besar.",
    dari: 21,
    sampai: 30,
    poin: 35,
    warna: "#ef4444",
    warnaLembut: "rgba(239,68,68,0.16)",
  },
];

/** Kategori sebuah paket, dihitung dari nomornya. */
export function kategoriPaket(nomor: number): InfoKategori {
  return KATEGORI.find((k) => nomor >= k.dari && nomor <= k.sampai) ?? KATEGORI[0];
}

export function infoKategori(kode: string): InfoKategori {
  return KATEGORI.find((k) => k.kode === kode) ?? KATEGORI[0];
}

export function keKategori(v: string | undefined | null): KategoriWarung | null {
  const k = (v ?? "").trim().toLowerCase();
  return KATEGORI.some((x) => x.kode === k) ? (k as KategoriWarung) : null;
}

/* ==========================================================================
   SUBTES & KOMPOSISI BUTIR
   ========================================================================== */

/** Warung memakai daftar subtes UTBK yang sama dengan tryout. */
export const SUBTES_WARUNG = SUBTES;

export function keSubtes(v: string | undefined | null): SubtesKode | null {
  const k = (v ?? "").trim().toUpperCase();
  return SUBTES.some((s) => s.kode === k) ? (k as SubtesKode) : null;
}

export interface Komposisi {
  /** Pilihan ganda biasa, lima pilihan satu jawaban. */
  pg: number;
  /** Pilihan ganda kompleks: sederet pernyataan Benar/Salah. */
  pgk: number;
  /** Isian singkat. */
  is: number;
  total: number;
}

/**
 * Susunan butir tiap paket, ditetapkan pengelola.
 *
 * Totalnya sengaja sama persis dengan jumlah soal subtes itu di UTBK asli
 * (lihat `SUBTES` di snbt.ts), sehingga satu paket Warung terasa seperti satu
 * subtes sungguhan — hanya isinya yang berganti tiap paket.
 */
export const KOMPOSISI: Record<SubtesKode, Komposisi> = {
  PU: { pg: 26, pgk: 3, is: 1, total: 30 },
  PPU: { pg: 16, pgk: 3, is: 1, total: 20 },
  PBM: { pg: 16, pgk: 3, is: 1, total: 20 },
  PK: { pg: 15, pgk: 3, is: 2, total: 20 },
  LBIND: { pg: 26, pgk: 3, is: 1, total: 30 },
  LBING: { pg: 15, pgk: 3, is: 2, total: 20 },
  PM: { pg: 15, pgk: 3, is: 2, total: 20 },
};

export type TipeSoalWarung = "PG" | "PGK" | "IS";

export const LABEL_TIPE: Record<TipeSoalWarung, string> = {
  PG: "Pilihan Ganda",
  PGK: "Pilihan Ganda Kompleks",
  IS: "Isian Singkat",
};

export const HURUF_OPSI = ["A", "B", "C", "D", "E"] as const;

/* ==========================================================================
   BENTUK DATA
   ========================================================================== */

export interface PaketWarung {
  id: number;
  subtes: SubtesKode;
  nomor: number;
  judul: string | null;
  catatan: string | null;
  created_at: string;
}

/**
 * Keadaan sebuah paket bagi SEORANG siswa.
 *
 *   "terbuka"    — boleh dikerjakan sekarang
 *   "terkunci"   — soalnya siap, tetapi paket sebelumnya belum dituntaskan
 *   "disiapkan"  — soalnya baru terisi sebagian, belum mencapai target subtes
 *   "kosong"     — belum ada soalnya sama sekali
 */
export type KeadaanPaket = "terbuka" | "terkunci" | "disiapkan" | "kosong";

export interface SoalWarung {
  id: number;
  paket_id: number;
  nomor: number;
  tipe: TipeSoalWarung;
  stimulus: string | null;
  pertanyaan: string;
  gambar_url: string | null;
  opsi: string;
  kunci: string;
  pembahasan: string | null;
}

/** Butir yang dikirim ke layar siswa — TANPA kunci dan pembahasan. */
export interface ButirMain {
  id: number;
  nomor: number;
  tipe: TipeSoalWarung;
  stimulus: string | null;
  pertanyaan: string;
  gambarUrl: string | null;
  opsi: string[];
  jawaban: string | null;
  ragu: boolean;
}

export interface SesiWarung {
  id: number;
  user_id: number;
  paket_id: number;
  status: "ongoing" | "finished";
  benar: number;
  salah: number;
  kosong: number;
  poin: number;
  durasi_detik: number;
  mulai_at: string;
  deadline_at: string;
  selesai_at: string | null;
}

export class GagalWarung extends Error {}

/* ==========================================================================
   PAKET
   ========================================================================== */

export async function ambilPaket(id: number): Promise<PaketWarung | undefined> {
  return await one<PaketWarung>("SELECT * FROM warung_paket WHERE id = ?", id);
}

export async function ambilPaketNomor(subtes: SubtesKode, nomor: number): Promise<PaketWarung | undefined> {
  return await one<PaketWarung>(
    "SELECT * FROM warung_paket WHERE subtes = ? AND nomor = ?",
    subtes,
    nomor,
  );
}

/** Seluruh 30 paket sebuah subtes beserta jumlah soalnya. */
export async function daftarPaket(subtes: SubtesKode): Promise<(PaketWarung & { jumlahSoal: number })[]> {
  return await all(
    `SELECT p.*, (SELECT COUNT(*) FROM warung_soal s WHERE s.paket_id = p.id) AS jumlahSoal
       FROM warung_paket p
      WHERE p.subtes = ?
      ORDER BY p.nomor`,
    subtes,
  );
}

/**
 * Pastikan ketiga puluh paket sebuah subtes sudah ada barisnya.
 *
 * Kerangkanya dibuat sekaligus, bukan satu per satu saat admin menekan tombol,
 * supaya daftar paket di layar siswa maupun admin selalu utuh 1-30 dan nomor
 * paket tidak pernah bolong. Paket yang belum berisi soal tampil sebagai
 * "belum tersedia" di layar siswa.
 */
export async function siapkanKerangka(subtes: SubtesKode): Promise<void> {
  const ada = new Set(
    (await all<{ nomor: number }>("SELECT nomor FROM warung_paket WHERE subtes = ?", subtes)).map(
      (r) => r.nomor,
    ),
  );
  const kurang: number[] = [];
  for (let n = 1; n <= PAKET_PER_SUBTES; n++) if (!ada.has(n)) kurang.push(n);
  if (kurang.length === 0) return;

  await tx(async () => {
    for (const n of kurang) {
      await run(
        "INSERT INTO warung_paket (subtes, nomor, judul) VALUES (?, ?, ?)",
        subtes,
        n,
        `${getSubtes(subtes)?.namaPendek ?? subtes} — Paket ${n}`,
      );
    }
  });
}

export async function siapkanSeluruhKerangka(): Promise<void> {
  for (const s of SUBTES) await siapkanKerangka(s.kode);
}

/** Jumlah soal yang harus terisi agar sebuah paket dianggap siap dipakai. */
export function targetSoal(subtes: SubtesKode): number {
  return KOMPOSISI[subtes].total;
}

/**
 * Nomor paket yang sudah PERNAH dituntaskan seorang siswa pada satu subtes.
 * Dipakai sebagai kunci kemajuan: paket berikutnya baru terbuka bila nomor
 * sebelumnya ada di dalam himpunan ini.
 */
export async function nomorTuntas(userId: number, subtes: SubtesKode): Promise<Set<number>> {
  const baris = await all<{ nomor: number }>(
    `SELECT DISTINCT p.nomor
       FROM warung_sesi s
       JOIN warung_paket p ON p.id = s.paket_id
      WHERE s.user_id = ? AND s.status = 'finished' AND p.subtes = ?`,
    userId,
    subtes,
  );
  return new Set(baris.map((b) => b.nomor));
}

/**
 * Keadaan satu paket bagi seorang siswa.
 *
 * Urutan pemeriksaannya penting: kesiapan isi diperiksa lebih dulu, baru kunci
 * kemajuan. Dengan begitu paket yang soalnya memang belum ada tidak pernah
 * tampil sebagai "terkunci" — yang menyesatkan, karena siswa akan menyangka
 * ada yang bisa ia lakukan untuk membukanya.
 */
export function keadaanPaket(
  subtes: SubtesKode,
  nomor: number,
  jumlahSoal: number,
  tuntas: Set<number>,
): KeadaanPaket {
  if (jumlahSoal === 0) return "kosong";
  if (jumlahSoal < targetSoal(subtes)) return "disiapkan";
  if (nomor === 1 || tuntas.has(nomor - 1)) return "terbuka";
  return "terkunci";
}

export async function daftarSoal(paketId: number): Promise<SoalWarung[]> {
  return await all<SoalWarung>("SELECT * FROM warung_soal WHERE paket_id = ? ORDER BY nomor", paketId);
}

export async function ambilSoal(id: number): Promise<SoalWarung | undefined> {
  return await one<SoalWarung>("SELECT * FROM warung_soal WHERE id = ?", id);
}

export async function nomorBerikutnya(paketId: number): Promise<number> {
  const r = await one<{ n: number | null }>(
    "SELECT MAX(nomor) AS n FROM warung_soal WHERE paket_id = ?",
    paketId,
  );
  return (r?.n ?? 0) + 1;
}

/** Isi kolom `opsi` (JSON) sebagai larik teks. */
export function bacaOpsi(soal: { opsi: string }): string[] {
  try {
    const v = JSON.parse(soal.opsi) as unknown;
    return Array.isArray(v) ? v.map((x) => String(x ?? "")) : [];
  } catch {
    return [];
  }
}

/** Kunci PGK ("B"/"S" tiap pernyataan) sebagai larik. */
export function bacaKunciPgk(kunci: string): string[] {
  try {
    const v = JSON.parse(kunci) as unknown;
    if (Array.isArray(v)) return v.map((x) => String(x).trim().toUpperCase());
  } catch {
    /* jatuh ke pemisahan koma di bawah */
  }
  return kunci
    .split(/[,\s-]+/)
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);
}

/** Susunan butir yang sebenarnya ada di sebuah paket. */
export async function komposisiTerisi(paketId: number): Promise<Komposisi> {
  const baris = await all<{ tipe: string; n: number }>(
    "SELECT tipe, COUNT(*) AS n FROM warung_soal WHERE paket_id = ? GROUP BY tipe",
    paketId,
  );
  const hasil: Komposisi = { pg: 0, pgk: 0, is: 0, total: 0 };
  for (const b of baris) {
    if (b.tipe === "PG") hasil.pg = b.n;
    else if (b.tipe === "PGK") hasil.pgk = b.n;
    else if (b.tipe === "IS") hasil.is = b.n;
    hasil.total += b.n;
  }
  return hasil;
}

/* ==========================================================================
   PENILAIAN
   ========================================================================== */

/**
 * Benar atau tidaknya satu jawaban.
 *
 * Penilaian butir dipinjam dari mesin tryout (`cekJawaban`) supaya satu soal
 * dinilai dengan aturan yang sama di mana pun ia muncul. Pilihan ganda kompleks
 * Warung berbentuk pernyataan Benar/Salah, jadi dipetakan ke cabang "BS":
 * benar hanya bila SELURUH pernyataan tepat, tanpa nilai sebagian.
 */
export function nilaiButir(tipe: string, kunci: string, jawaban: string | null): boolean {
  const t = tipe === "PGK" ? "BS" : tipe;
  return cekJawaban(t, kunci, jawaban);
}

/* ==========================================================================
   SESI PENGERJAAN
   ========================================================================== */

async function ambilSesiMilik(sesiId: number, userId: number): Promise<SesiWarung> {
  const s = await one<SesiWarung>("SELECT * FROM warung_sesi WHERE id = ?", sesiId);
  if (!s || s.user_id !== userId) throw new GagalWarung("Sesi latihan ini bukan milikmu.");
  return s;
}

/** Sesi yang masih berjalan untuk sebuah paket, bila ada. */
export async function sesiBerjalan(userId: number, paketId: number): Promise<SesiWarung | undefined> {
  return await one<SesiWarung>(
    "SELECT * FROM warung_sesi WHERE user_id = ? AND paket_id = ? AND status = 'ongoing' ORDER BY id DESC LIMIT 1",
    userId,
    paketId,
  );
}

/**
 * Buka paket: lanjutkan sesi yang masih berjalan, atau mulai yang baru.
 *
 * Baris jawaban seluruh soal dibuat sekaligus di awal supaya panel nomor bisa
 * langsung menggambar keadaan tiap butir tanpa menebak, dan supaya jawaban
 * tersimpan satu per satu tanpa perlu menyisipkan baris di tengah pengerjaan.
 */
export async function mulaiSesi(userId: number, paketId: number): Promise<number> {
  const paket = await ambilPaket(paketId);
  if (!paket) throw new GagalWarung("Paket latihan tidak ditemukan.");

  // Sesi yang masih berjalan selalu boleh dilanjutkan, apa pun keadaan paketnya
  // sekarang — siswa tidak boleh terjebak di tengah pengerjaan.
  const berjalan = await sesiBerjalan(userId, paketId);
  if (berjalan) return berjalan.id;

  const soal = await daftarSoal(paketId);
  const keadaan = keadaanPaket(
    paket.subtes,
    paket.nomor,
    soal.length,
    await nomorTuntas(userId, paket.subtes),
  );

  if (keadaan === "kosong") {
    throw new GagalWarung("Paket ini belum berisi soal. Beri tahu pengajar Adzkia, ya.");
  }
  if (keadaan === "disiapkan") {
    throw new GagalWarung(
      `Paket ini masih disiapkan pengajar (${soal.length} dari ${targetSoal(paket.subtes)} soal).`,
    );
  }
  if (keadaan === "terkunci") {
    throw new GagalWarung(
      `Tuntaskan Paket ${paket.nomor - 1} dulu, ya. Paket terbuka satu per satu mengikuti kemajuanmu.`,
    );
  }

  const menit = getSubtes(paket.subtes)?.durasiMenit ?? 20;

  return await tx(async () => {
    const res = await sisipWajib(
      `INSERT INTO warung_sesi (user_id, paket_id, deadline_at)
       VALUES (?, ?, datetime('now','localtime', ?))`,
      userId,
      paketId,
      `+${menit} minutes`,
    );
    const sesiId = res;
    for (const s of soal) {
      await run("INSERT INTO warung_jawaban (sesi_id, soal_id) VALUES (?, ?)", sesiId, s.id);
    }
    return sesiId;
  });
}

export interface RuangSesi {
  sesi: SesiWarung;
  paket: PaketWarung;
  butir: ButirMain[];
  /** Sisa waktu dalam detik menurut jam server. */
  sisaDetik: number;
}

/** Seluruh isi ruang latihan untuk sesi yang sedang berjalan. */
export async function ruangSesi(sesiId: number, userId: number): Promise<RuangSesi> {
  const sesi = await ambilSesiMilik(sesiId, userId);
  const paket = await ambilPaket(sesi.paket_id);
  if (!paket) throw new GagalWarung("Paket latihan tidak ditemukan.");

  const baris = await all<{
    soal_id: number;
    jawaban: string | null;
    ragu: number;
    nomor: number;
    tipe: TipeSoalWarung;
    stimulus: string | null;
    pertanyaan: string;
    gambar_url: string | null;
    opsi: string;
  }>(
    `SELECT j.soal_id, j.jawaban, j.ragu,
            s.nomor, s.tipe, s.stimulus, s.pertanyaan, s.gambar_url, s.opsi
       FROM warung_jawaban j
       JOIN warung_soal s ON s.id = j.soal_id
      WHERE j.sesi_id = ?
      ORDER BY s.nomor`,
    sesiId,
  );

  return {
    sesi,
    paket,
    sisaDetik: await sisaDetikSesi(sesi),
    butir: baris.map((b) => ({
      id: b.soal_id,
      nomor: b.nomor,
      tipe: b.tipe,
      stimulus: b.stimulus,
      pertanyaan: b.pertanyaan,
      gambarUrl: b.gambar_url,
      opsi: bacaOpsi(b),
      jawaban: b.jawaban,
      ragu: b.ragu === 1,
    })),
  };
}

/** Sisa waktu sesi menurut jam server, tidak pernah negatif. */
export async function sisaDetikSesi(sesi: SesiWarung): Promise<number> {
  const r = await one<{ n: number | null }>(
    "SELECT CAST((julianday(?) - julianday(datetime('now','localtime'))) * 86400 AS INTEGER) AS n",
    sesi.deadline_at,
  );
  return Math.max(0, r?.n ?? 0);
}

/** Simpan satu jawaban. Aman dipanggil berulang; jawaban terakhir yang berlaku. */
export async function simpanJawaban(
  userId: number,
  sesiId: number,
  soalId: number,
  jawaban: string | null,
  ragu: boolean,
): Promise<void> {
  const sesi = await ambilSesiMilik(sesiId, userId);
  if (sesi.status === "finished") throw new GagalWarung("Sesi ini sudah selesai.");
  if (await sisaDetikSesi(sesi) <= 0) {
    // Waktu habis sementara halaman masih terbuka: tutup sesinya, jangan
    // menerima jawaban susulan.
    await selesaikanSesi(userId, sesiId);
    throw new GagalWarung("Waktu paket ini sudah habis.");
  }

  const res = await run(
    `UPDATE warung_jawaban
        SET jawaban = ?, ragu = ?, updated_at = datetime('now','localtime')
      WHERE sesi_id = ? AND soal_id = ?`,
    jawaban && jawaban.trim() !== "" ? jawaban.trim() : null,
    ragu ? 1 : 0,
    sesiId,
    soalId,
  );
  if (Number(res.changes) === 0) throw new GagalWarung("Soal ini tidak ada dalam sesi kamu.");
}

/**
 * Tutup sesi dan hitung nilainya.
 *
 * Idempoten: memanggilnya dua kali tidak mengubah apa pun, karena timer yang
 * habis di layar siswa dan tombol "Selesai" bisa saja tiba hampir bersamaan.
 */
export async function selesaikanSesi(userId: number, sesiId: number): Promise<SesiWarung> {
  const sesi = await ambilSesiMilik(sesiId, userId);
  if (sesi.status === "finished") return sesi;

  const paket = await ambilPaket(sesi.paket_id);
  const poinPerBenar = kategoriPaket(paket?.nomor ?? 1).poin;

  const baris = await all<{ id: number; jawaban: string | null; tipe: string; kunci: string }>(
    `SELECT j.id, j.jawaban, s.tipe, s.kunci
       FROM warung_jawaban j
       JOIN warung_soal s ON s.id = j.soal_id
      WHERE j.sesi_id = ?`,
    sesiId,
  );

  let benar = 0;
  let salah = 0;
  let kosong = 0;

  return await tx(async () => {
    for (const b of baris) {
      const terisi = b.jawaban != null && b.jawaban !== "" && b.jawaban !== "[]";
      const tepat = terisi && nilaiButir(b.tipe, b.kunci, b.jawaban);
      if (!terisi) kosong++;
      else if (tepat) benar++;
      else salah++;
      await run("UPDATE warung_jawaban SET benar = ? WHERE id = ?", tepat ? 1 : 0, b.id);
    }

    await run(
      `UPDATE warung_sesi
          SET status = 'finished',
              benar = ?, salah = ?, kosong = ?, poin = ?,
              selesai_at = datetime('now','localtime'),
              durasi_detik = CAST((julianday(datetime('now','localtime')) - julianday(mulai_at)) * 86400 AS INTEGER)
        WHERE id = ?`,
      benar,
      salah,
      kosong,
      benar * poinPerBenar,
      sesiId,
    );

    return (await one<SesiWarung>("SELECT * FROM warung_sesi WHERE id = ?", sesiId))!;
  });
}

/**
 * Tutup sesi yang waktunya sudah lewat.
 * Dipanggil saat halaman ruang latihan dibuka, sehingga siswa yang menutup
 * peramban di tengah jalan tetap mendapat nilai atas apa yang sempat dijawab.
 */
export async function tutupBilaLewatWaktu(sesi: SesiWarung): Promise<SesiWarung> {
  if (sesi.status === "finished") return sesi;
  if (await sisaDetikSesi(sesi) > 0) return sesi;
  return await selesaikanSesi(sesi.user_id, sesi.id);
}

export interface BarisPembahasan {
  nomor: number;
  tipe: TipeSoalWarung;
  stimulus: string | null;
  pertanyaan: string;
  gambarUrl: string | null;
  opsi: string[];
  jawaban: string | null;
  kunci: string;
  benar: boolean;
  pembahasan: string | null;
}

export async function pembahasanSesi(sesiId: number, userId: number): Promise<BarisPembahasan[]> {
  await ambilSesiMilik(sesiId, userId);
  const baris = await all<{
    nomor: number;
    tipe: TipeSoalWarung;
    stimulus: string | null;
    pertanyaan: string;
    gambar_url: string | null;
    opsi: string;
    kunci: string;
    pembahasan: string | null;
    jawaban: string | null;
    benar: number;
  }>(
    `SELECT s.nomor, s.tipe, s.stimulus, s.pertanyaan, s.gambar_url, s.opsi, s.kunci, s.pembahasan,
            j.jawaban, j.benar
       FROM warung_jawaban j
       JOIN warung_soal s ON s.id = j.soal_id
      WHERE j.sesi_id = ?
      ORDER BY s.nomor`,
    sesiId,
  );

  return baris.map((b) => ({
    nomor: b.nomor,
    tipe: b.tipe,
    stimulus: b.stimulus,
    pertanyaan: b.pertanyaan,
    gambarUrl: b.gambar_url,
    opsi: bacaOpsi(b),
    jawaban: b.jawaban,
    kunci: b.kunci,
    benar: b.benar === 1,
    pembahasan: b.pembahasan,
  }));
}

export async function ambilSesi(sesiId: number, userId: number): Promise<SesiWarung> {
  return await ambilSesiMilik(sesiId, userId);
}

/* ==========================================================================
   RINGKASAN UNTUK SISWA
   ========================================================================== */

export interface RingkasPaket {
  paket: PaketWarung & { jumlahSoal: number };
  kategori: InfoKategori;
  /** Boleh dikerjakan sekarang, terkunci kemajuan, atau belum siap isinya. */
  keadaan: KeadaanPaket;
  /** Nilai terbaik yang pernah diraih peserta pada paket ini. */
  terbaik: { poin: number; benar: number; total: number } | null;
  /** Sesi yang belum ditutup, kalau ada. */
  berjalanId: number | null;
  percobaan: number;
}

export async function daftarPaketSiswa(subtes: SubtesKode, userId: number): Promise<RingkasPaket[]> {
  const paket = await daftarPaket(subtes);
  const tuntas = await nomorTuntas(userId, subtes);

  // Satu kueri untuk seluruh paket subtes ini: nilai terbaik + jumlah percobaan.
  //
  // DITULIS DENGAN `DISTINCT ON`, BUKAN `MAX()` + kolom polos. Versi SQLite
  // menulis `MAX(s.poin) AS poin, s.benar … GROUP BY s.paket_id` dan bersandar
  // pada kelonggaran khas SQLite: kolom polos di samping MAX() diambilkan dari
  // BARIS pemilik nilai maksimum itu. PostgreSQL menolak bentuk itu mentah-mentah
  // (galat 42803), dan "perbaikan" yang menambahkan `s.benar` ke GROUP BY akan
  // MENGUBAH ARTINYA — hasilnya menjadi satu baris per pasangan (paket, benar),
  // bukan satu baris per paket.
  //
  // `DISTINCT ON (s.paket_id)` + `ORDER BY s.poin DESC` memulangkan persis satu
  // baris per paket, yaitu baris bernilai tertinggi — seluruh kolomnya berasal
  // dari baris yang sama, yang memang maksud aslinya. `s.id ASC` di ujung
  // pengurutan membuat seri diputus secara tetap (percobaan yang lebih dulu
  // menang), sesuatu yang pada SQLite dulu tidak dijamin.
  //
  // `COUNT(*) OVER (PARTITION BY …)` dihitung SEBELUM `DISTINCT ON` bekerja,
  // jadi ia tetap menghitung SELURUH percobaan, bukan hanya baris terpilih.
  const rekap = new Map<number, { poin: number; benar: number; percobaan: number }>();
  for (const r of await all<{ paket_id: number; poin: number; benar: number; percobaan: number }>(
    `SELECT DISTINCT ON (s.paket_id)
            s.paket_id,
            s.poin,
            s.benar,
            COUNT(*) OVER (PARTITION BY s.paket_id) AS percobaan
       FROM warung_sesi s
       JOIN warung_paket p ON p.id = s.paket_id
      WHERE s.user_id = ? AND s.status = 'finished' AND p.subtes = ?
      ORDER BY s.paket_id, s.poin DESC, s.id ASC`,
    userId,
    subtes,
  )) {
    rekap.set(r.paket_id, { poin: r.poin, benar: r.benar, percobaan: r.percobaan });
  }

  const berjalan = new Map<number, number>();
  for (const r of await all<{ id: number; paket_id: number }>(
    `SELECT s.id, s.paket_id FROM warung_sesi s
       JOIN warung_paket p ON p.id = s.paket_id
      WHERE s.user_id = ? AND s.status = 'ongoing' AND p.subtes = ?`,
    userId,
    subtes,
  )) {
    berjalan.set(r.paket_id, r.id);
  }

  return paket.map((p) => {
    const r = rekap.get(p.id);
    return {
      paket: p,
      kategori: kategoriPaket(p.nomor),
      keadaan: keadaanPaket(subtes, p.nomor, p.jumlahSoal, tuntas),
      terbaik: r ? { poin: r.poin, benar: r.benar, total: p.jumlahSoal } : null,
      berjalanId: berjalan.get(p.id) ?? null,
      percobaan: r?.percobaan ?? 0,
    };
  });
}

export interface RingkasSubtes {
  subtes: (typeof SUBTES)[number];
  /** Paket yang soalnya sudah lengkap — bahan yang tersedia di subtes ini. */
  paketSiap: number;
  /** Paket yang pernah dituntaskan peserta. */
  paketSelesai: number;
  /** Nomor paket yang giliran dikerjakan peserta sekarang, null bila tidak ada. */
  paketBerikutnya: number | null;
  poin: number;
  peringkat: number | null;
}

/**
 * Kartu tiap subtes di lobi Warung.
 *
 * "Paket berikutnya" adalah paket terkecil yang terbuka tetapi belum
 * dituntaskan — itulah yang jadi ajakan di kartu subtes, supaya siswa tahu
 * persis di mana ia berhenti tanpa perlu membuka daftarnya dulu.
 */
export async function ringkasanLobi(userId: number): Promise<RingkasSubtes[]> {
  return await Promise.all(SUBTES.map(async (s) => {
    const tuntas = await nomorTuntas(userId, s.kode);
    const paket = await daftarPaket(s.kode);

    let siap = 0;
    let berikutnya: number | null = null;
    for (const p of paket) {
      const keadaan = keadaanPaket(s.kode, p.nomor, p.jumlahSoal, tuntas);
      if (keadaan !== "kosong" && keadaan !== "disiapkan") siap++;
      if (berikutnya === null && keadaan === "terbuka" && !tuntas.has(p.nomor)) {
        berikutnya = p.nomor;
      }
    }

    const papan = await papanSubtes(s.kode);
    const posisi = papan.find((b) => b.userId === userId);

    return {
      subtes: s,
      paketSiap: siap,
      paketSelesai: tuntas.size,
      paketBerikutnya: berikutnya,
      poin: posisi?.poin ?? 0,
      peringkat: posisi?.peringkat ?? null,
    };
  }));
}

/* ==========================================================================
   PAPAN PERINGKAT
   ========================================================================== */

export interface BarisPeringkat {
  peringkat: number;
  userId: number;
  nama: string;
  kelas: string | null;
  poin: number;
  benar: number;
  paketSelesai: number;
  durasiDetik: number;
}

/**
 * Papan satu subtes.
 *
 * Nilai tiap paket diambil dari PERCOBAAN TERBAIK peserta, lalu dijumlahkan
 * antar-paket. Karena itu mengulang paket yang sama tidak menambah poin; yang
 * menaikkan peringkat hanyalah mengerjakan lebih banyak paket, atau memperbaiki
 * nilai paket yang sudah pernah dikerjakan. Waktu total dipakai sebagai
 * pemisah saat poin sama.
 */
export async function papanSubtes(subtes: SubtesKode): Promise<BarisPeringkat[]> {
  const baris = await all<{
    user_id: number;
    nama: string;
    kelas: string | null;
    poin: number;
    benar: number;
    paket: number;
    durasi: number;
  }>(
    // Anak query memilih SATU sesi terbaik per (peserta, paket) lewat
    // `DISTINCT ON`; induknya menjumlahkan seluruh paket milik peserta itu.
    // Lihat catatan panjang di `daftarPaketSiswa()` tentang mengapa bentuk
    // `MAX()` + kolom polos tidak bisa dipakai di PostgreSQL.
    //
    // `GROUP BY u.id, t.user_id` — bukan `GROUP BY t.user_id` saja — karena
    // `u.nama` dan `u.kelas` hanya boleh ikut terpilih bila yang dikelompokkan
    // memuat KUNCI UTAMA tabel users.
    `SELECT t.user_id, u.nama, u.kelas,
            SUM(t.poin)   AS poin,
            SUM(t.benar)  AS benar,
            COUNT(*)      AS paket,
            SUM(t.durasi) AS durasi
       FROM (
         SELECT DISTINCT ON (s.user_id, s.paket_id)
                s.user_id, s.paket_id,
                s.poin         AS poin,
                s.benar        AS benar,
                s.durasi_detik AS durasi
           FROM warung_sesi s
           JOIN warung_paket p ON p.id = s.paket_id
          WHERE s.status = 'finished' AND p.subtes = ?
          ORDER BY s.user_id, s.paket_id, s.poin DESC, s.durasi_detik ASC, s.id ASC
       ) t
       JOIN users u ON u.id = t.user_id
      WHERE u.role = 'siswa'
      GROUP BY u.id, t.user_id
      ORDER BY poin DESC, durasi ASC, MIN(t.paket_id) ASC`,
    subtes,
  );

  return baris.map((b, i) => ({
    peringkat: i + 1,
    userId: b.user_id,
    nama: b.nama,
    kelas: b.kelas,
    poin: b.poin,
    benar: b.benar,
    paketSelesai: b.paket,
    durasiDetik: b.durasi,
  }));
}

/** Papan satu paket: nilai terbaik tiap peserta pada paket itu saja. */
export async function papanPaket(paketId: number): Promise<BarisPeringkat[]> {
  const baris = await all<{
    user_id: number;
    nama: string;
    kelas: string | null;
    poin: number;
    benar: number;
    durasi: number;
  }>(
    // Satu baris per peserta: sesi terbaiknya pada paket ini. Penyaringan
    // `u.role = 'siswa'` dipindahkan ke induk karena anak query tidak lagi
    // menyentuh tabel users — hasilnya sama, barisnya tetap tersaring.
    `SELECT t.user_id, u.nama, u.kelas, t.poin, t.benar, t.durasi
       FROM (
         SELECT DISTINCT ON (s.user_id)
                s.user_id,
                s.poin         AS poin,
                s.benar        AS benar,
                s.durasi_detik AS durasi
           FROM warung_sesi s
          WHERE s.paket_id = ? AND s.status = 'finished'
          ORDER BY s.user_id, s.poin DESC, s.durasi_detik ASC, s.id ASC
       ) t
       JOIN users u ON u.id = t.user_id
      WHERE u.role = 'siswa'
      ORDER BY t.poin DESC, t.durasi ASC`,
    paketId,
  );

  return baris.map((b, i) => ({
    peringkat: i + 1,
    userId: b.user_id,
    nama: b.nama,
    kelas: b.kelas,
    poin: b.poin,
    benar: b.benar,
    paketSelesai: 1,
    durasiDetik: b.durasi,
  }));
}

/** Sesi terakhir peserta, untuk kartu riwayat di lobi. */
export async function riwayatSaya(userId: number, batas = 6) {
  return await all<{
    id: number;
    subtes: SubtesKode;
    nomor: number;
    status: string;
    benar: number;
    poin: number;
    jumlahSoal: number;
    selesai_at: string | null;
  }>(
    `SELECT s.id, p.subtes, p.nomor, s.status, s.benar, s.poin, s.selesai_at,
            (SELECT COUNT(*) FROM warung_jawaban j WHERE j.sesi_id = s.id) AS jumlahSoal
       FROM warung_sesi s
       JOIN warung_paket p ON p.id = s.paket_id
      WHERE s.user_id = ?
      ORDER BY s.id DESC
      LIMIT ?`,
    userId,
    batas,
  );
}

export async function totalPoinSiswa(userId: number): Promise<number> {
  const r = await one<{ n: number | null }>(
    // `AS t` wajib: PostgreSQL menuntut setiap anak query di FROM punya nama,
    // sedangkan SQLite membiarkannya tanpa nama.
    `SELECT SUM(poin) AS n FROM (
       SELECT MAX(s.poin) AS poin FROM warung_sesi s
        WHERE s.user_id = ? AND s.status = 'finished'
        GROUP BY s.paket_id
     ) t`,
    userId,
  );
  return r?.n ?? 0;
}

/* ==========================================================================
   TAMPILAN
   ========================================================================== */

/** "125" -> "2 menit 5 detik" */
export function lamaIndo(detik: number): string {
  const d = Math.max(0, Math.round(detik));
  const m = Math.floor(d / 60);
  const s = d % 60;
  if (m === 0) return `${s} detik`;
  return s === 0 ? `${m} menit` : `${m} menit ${s} detik`;
}

/** "1830" -> "30:30" untuk penanda waktu di ruang latihan. */
export function jamMundur(detik: number): string {
  const d = Math.max(0, Math.round(detik));
  const m = Math.floor(d / 60);
  const s = d % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
