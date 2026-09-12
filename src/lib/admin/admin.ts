import "server-only";

import { all, one, run, tx, sisipWajib} from "@/lib/core/db";
import { buangPaket, buangSesi } from "@/lib/core/cache";
import { selesaikanUjian, urutanSubtesPaket } from "@/lib/tryout/exam";
import { kalibrasiPaket } from "@/lib/tryout/irt";
import { periksaButir } from "@/lib/tryout/mutu-soal";
import {
  LABEL_OPSI,
  getSubtesApaPun,
  subtesJalur,
  type TipeSoal,
} from "@/lib/tryout/snbt";

/* ==========================================================================
   TIPE BERSAMA
   ========================================================================== */

// Tipe & konstanta murni tinggal di admin-konstanta.ts supaya bisa dipakai
// komponen klien; di-ekspor ulang di sini agar impor lama tetap berjalan.
export {
  JALUR_PAKET,
  LABEL_JALUR,
  LABEL_STATUS,
  STATUS_PAKET,
  TARGET_C3,
  TARGET_C4,
  TOLERANSI_KOMPOSISI,
} from "@/lib/admin/admin-konstanta";
export type { JalurPaketAdmin, LevelSoal, PaketStatus, PeranPengguna } from "@/lib/admin/admin-konstanta";

import {
  // Tiga yang pertama dipakai LANGSUNG di berkas ini (pengelompokan peserta
  // per kelas) — `export ... from` di atas hanya meneruskan ke pemakai lain,
  // tidak membawa namanya ke lingkup berkas ini.
  AWALAN_NISN_DEMO,
  LABEL_KELAS_DEMO,
  akunDemo,
  JALUR_PAKET,
  STATUS_PAKET,
  TARGET_C3,
  TARGET_C4,
  TOLERANSI_KOMPOSISI,
  type JalurPaketAdmin,
  type LevelSoal,
  type PaketStatus,
  type PeranPengguna,
} from "@/lib/admin/admin-konstanta";

export interface PaketRow {
  id: number;
  kode: string;
  nama: string;
  jalur: JalurPaketAdmin;
  deskripsi: string | null;
  status: PaketStatus;
  mulai_at: string | null;
  selesai_at: string | null;
  acak_soal: number;
  tampil_pembahasan: number;
  /**
   * Tanggal Jumat siklus pekanan ("2026-09-11"), atau null untuk paket di luar
   * siklus. Kolomnya sudah ada sejak v13 dan ikut terbawa `SELECT *`, tetapi
   * belum pernah dituliskan di sini — laporan hasil memakainya sebagai tanggal
   * ujian yang dicetak di kepala lembar.
   */
  siklus: string | null;
  created_at: string;
}

export interface PaketRingkas extends PaketRow {
  jumlah_soal: number;
  jumlah_peserta: number;
}

export interface SoalRow {
  id: number;
  package_id: number;
  subtes: string;
  nomor: number;
  tipe: TipeSoal;
  level: LevelSoal;
  stimulus: string | null;
  pertanyaan: string;
  gambar_url: string | null;
  opsi: string;
  kunci: string;
  pembahasan: string | null;
  created_at: string;
}

export interface StatDasbor {
  totalPaket: number;
  paketTerbit: number;
  totalSoal: number;
  totalPeserta: number;
  pengerjaanSelesai: number;
  rataSkor: number;
}

export interface PengerjaanRow {
  id: number;
  user_id: number;
  package_id: number;
  nama: string;
  email: string;
  kode: string;
  paket_nama: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  total_skor: number | null;
}

export interface PesertaRow {
  id: number;
  nama: string;
  nisn: string | null;
  kelas: string | null;
  email: string;
  asal_sekolah: string | null;
  no_hp: string | null;
  role: PeranPengguna;
  created_at: string;
  jumlah_tryout: number;
  rata_skor: number | null;
}

export interface RingkasSubtes {
  kode: string;
  nama: string;
  namaPendek: string;
  target: number;
  terisi: number;
  c3: number;
  c4: number;
  persenC3: number;
  persenC4: number;
  komposisiMelenceng: boolean;
  bermasalah: number;
}

export interface InputPaket {
  kode: string;
  nama: string;
  jalur: JalurPaketAdmin;
  deskripsi: string;
  status: PaketStatus;
  mulai_at: string | null;
  selesai_at: string | null;
  acak_soal: boolean;
  tampil_pembahasan: boolean;
}

export interface InputSoal {
  package_id: number;
  subtes: string;
  nomor: number;
  tipe: TipeSoal;
  level: LevelSoal;
  stimulus: string;
  pertanyaan: string;
  gambar_url: string;
  opsi: string[];
  kunci: string;
  pembahasan: string;
}

/** Bentuk state seragam untuk seluruh Server Action panel admin. */
export interface AksiState {
  ok?: boolean;
  pesan?: string;
  error?: string;
}

/* ==========================================================================
   UTILITAS
   ========================================================================== */

export function parseOpsi(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const p: unknown = JSON.parse(json);
    return Array.isArray(p) ? p.map((v) => String(v)) : [];
  } catch {
    return [];
  }
}

/** Daftar huruf kunci untuk PG/PGK ("A" atau ["A","C"]). */
export function parseKunci(tipe: TipeSoal, kunci: string | null | undefined): string[] {
  if (!kunci) return [];
  if (tipe === "IS") return [kunci];
  const mentah = kunci.trim();
  if (mentah.startsWith("[")) {
    try {
      const p: unknown = JSON.parse(mentah);
      if (Array.isArray(p)) return p.map((v) => String(v).trim().toUpperCase()).filter(Boolean);
    } catch {
      /* jatuh ke pemisahan koma di bawah */
    }
  }
  return mentah
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

/** Susun nilai kolom `kunci` sesuai format kontrak basis data. */
export function susunKunci(tipe: TipeSoal, huruf: string[], teks: string): string {
  if (tipe === "IS") return teks.trim();
  // Kunci Benar/Salah sudah dikirim editor dalam bentuk JSON ["B","S",...]
  if (tipe === "BS") return teks.trim();
  const bersih = Array.from(new Set(huruf.map((h) => h.trim().toUpperCase()).filter(Boolean))).sort();
  if (tipe === "PGK") return JSON.stringify(bersih);
  return bersih[0] ?? "";
}

/** Soal yang naskahnya ditampilkan sebagai gambar (rumus/grafik dari PDF). */
export function soalGambar(s: { gambar_url: string | null; opsi: string }): boolean {
  if (!s.gambar_url || !s.gambar_url.trim()) return false;
  return parseOpsi(s.opsi).every((o) => !o.trim());
}

export function labelKunci(tipe: TipeSoal, kunci: string): string {
  if (tipe === "IS") return kunci || "—";
  if (tipe === "BS") {
    try {
      const p: unknown = JSON.parse(kunci);
      if (Array.isArray(p) && p.length) return p.map((v) => String(v)).join("–");
    } catch {
      /* kunci belum berformat BS */
    }
    return kunci || "—";
  }
  const h = parseKunci(tipe, kunci);
  return h.length ? h.join(", ") : "—";
}

/** `datetime-local` (YYYY-MM-DDTHH:MM) -> kolom SQLite (YYYY-MM-DD HH:MM:SS). */
export function keDbDatetime(nilai: string | null | undefined): string | null {
  const v = (nilai ?? "").trim();
  if (!v) return null;
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?/.exec(v);
  if (!m) return null;
  return `${m[1]} ${m[2]}:${m[3] ?? "00"}`;
}

/** Kolom SQLite -> nilai untuk input `datetime-local`. */
export function keInputDatetime(nilai: string | null | undefined): string {
  const v = (nilai ?? "").trim();
  if (!v) return "";
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(v);
  return m ? `${m[1]}T${m[2]}` : "";
}

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** Tampilan tanggal ramah tanpa bergantung pada locale runtime. */
export function tanggalIndo(nilai: string | null | undefined, denganJam = true): string {
  const v = (nilai ?? "").trim();
  if (!v) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(v);
  if (!m) return v;
  const tgl = `${Number(m[3])} ${BULAN[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
  return denganJam && m[4] ? `${tgl}, ${m[4]}.${m[5]}` : tgl;
}

/** Ambil satu nilai dari `searchParams` (Next.js bisa memberi array). */
export function satuParam(v: string | string[] | undefined): string | undefined {
  const nilai = Array.isArray(v) ? v[0] : v;
  return nilai && nilai.trim() ? nilai : undefined;
}

/** Bentuk `searchParams` yang dipakai halaman-halaman admin. */
export type ParamsQuery = Record<string, string | string[] | undefined>;

export function potongTeks(teks: string | null | undefined, panjang = 90): string {
  const v = (teks ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!v) return "—";
  return v.length > panjang ? `${v.slice(0, panjang)}…` : v;
}

/** Daftar masalah kelengkapan pada satu butir soal. */
export function masalahSoal(s: SoalRow): string[] {
  const masalah: string[] = [];
  const opsi = parseOpsi(s.opsi);
  if (!s.pertanyaan || !s.pertanyaan.trim()) masalah.push("Pertanyaan kosong");

  // Soal yang naskahnya berupa gambar: batang soal dan pilihan jawaban ada di
  // dalam gambar, jadi kolom opsi memang sengaja kosong.
  if (soalGambar(s)) {
    const huruf = parseKunci(s.tipe, s.kunci);
    if (huruf.length === 0) masalah.push("Kunci kosong");
    else if (s.tipe === "PG" && huruf.length > 1) masalah.push("PG hanya boleh satu kunci");
    return masalah;
  }
  if (s.tipe === "IS") {
    if (!s.kunci || !s.kunci.trim()) masalah.push("Kunci kosong");
    return masalah;
  }
  const terisi = opsi.filter((o) => o.trim() !== "");
  if (s.tipe === "BS") {
    if (terisi.length < 2) masalah.push("Pernyataan kurang dari 2");
    const nilai = parseKunci(s.tipe, s.kunci);
    if (nilai.length !== terisi.length) masalah.push("Jumlah kunci B/S tidak sama dengan jumlah pernyataan");
    else if (nilai.some((v) => v !== "B" && v !== "S")) masalah.push("Kunci B/S tidak valid");
    return masalah;
  }
  if (terisi.length < 2) masalah.push("Opsi kurang dari 2");
  const huruf = parseKunci(s.tipe, s.kunci);
  if (huruf.length === 0) {
    masalah.push("Kunci kosong");
  } else {
    const tidakValid = huruf.some((h) => {
      const i = LABEL_OPSI.indexOf(h as (typeof LABEL_OPSI)[number]);
      return i < 0 || i >= opsi.length || !opsi[i] || !opsi[i].trim();
    });
    if (tidakValid) masalah.push("Kunci tidak ada di opsi");
    if (s.tipe === "PG" && huruf.length > 1) masalah.push("PG hanya boleh satu kunci");
  }
  return masalah;
}

/**
 * Kejanggalan ISI satu butir — pelengkap `masalahSoal()` yang hanya menimbang
 * kelengkapan. Aturannya ada di `mutu-soal.ts`; di sini hanya barisnya yang
 * diterjemahkan. Dipakai halaman Pratinjau Soal.
 */
export function curigaSoal(s: SoalRow): string[] {
  return periksaButir({
    tipe: s.tipe,
    stimulus: s.stimulus,
    pertanyaan: s.pertanyaan,
    gambar_url: s.gambar_url,
    opsi: parseOpsi(s.opsi),
    kunci: s.kunci,
  });
}

/** Validasi sebelum menyimpan. Mengembalikan daftar pesan galat (kosong = valid). */
export function validasiSoal(input: InputSoal): string[] {
  const galat: string[] = [];
  const sub = getSubtesApaPun(input.subtes);
  if (!sub) galat.push("Subtes tidak dikenal.");
  if (!Number.isInteger(input.nomor) || input.nomor < 1) {
    galat.push("Nomor soal harus bilangan bulat minimal 1.");
  } else if (sub && input.nomor > sub.jumlahSoal) {
    galat.push(`Nomor melebihi kuota ${sub.kode} (${sub.jumlahSoal} soal).`);
  }
  if (!input.pertanyaan.trim()) galat.push("Pertanyaan wajib diisi.");
  if (input.tipe === "IS") {
    if (!input.kunci.trim()) galat.push("Kunci jawaban isian singkat wajib diisi.");
    return galat;
  }
  const opsi = input.opsi.map((o) => o.trim());

  // Naskah berupa gambar: pilihan jawaban tercetak di dalam gambar.
  if (input.gambar_url.trim() && opsi.every((o) => !o)) {
    const huruf = parseKunci(input.tipe, input.kunci);
    if (huruf.length === 0) galat.push("Pilih kunci jawaban.");
    if (input.tipe === "PG" && huruf.length > 1) galat.push("Tipe PG hanya boleh punya satu kunci.");
    return galat;
  }

  if (input.tipe === "BS") {
    const terisi = opsi.filter(Boolean);
    if (terisi.length < 2) galat.push("Isi minimal dua pernyataan.");
    const nilai = parseKunci(input.tipe, input.kunci);
    if (nilai.length !== terisi.length) {
      galat.push("Tentukan kunci B atau S untuk setiap pernyataan yang terisi.");
    } else if (nilai.some((v) => v !== "B" && v !== "S")) {
      galat.push("Kunci Benar/Salah hanya boleh berisi B atau S.");
    }
    return galat;
  }
  if (opsi.filter(Boolean).length < 2) galat.push("Isi minimal dua opsi jawaban.");
  const huruf = parseKunci(input.tipe, input.kunci);
  if (huruf.length === 0) galat.push("Pilih kunci jawaban.");
  if (input.tipe === "PG" && huruf.length > 1) galat.push("Tipe PG hanya boleh punya satu kunci.");
  for (const h of huruf) {
    const i = LABEL_OPSI.indexOf(h as (typeof LABEL_OPSI)[number]);
    if (i < 0 || i >= opsi.length || !opsi[i]) {
      galat.push(`Kunci ${h} tidak ada di antara opsi yang terisi.`);
    }
  }
  return galat;
}

function pesanGalatDb(e: unknown, bawaan: string): string {
  const pesan = e instanceof Error ? e.message : String(e);
  if (/UNIQUE constraint failed: packages\.kode/i.test(pesan)) {
    return "Kode paket sudah dipakai paket lain. Gunakan kode yang berbeda.";
  }
  if (/UNIQUE constraint failed: questions/i.test(pesan)) {
    return "Sudah ada soal dengan nomor tersebut pada subtes ini.";
  }
  if (/UNIQUE constraint failed: users\.email/i.test(pesan)) {
    return "Email sudah terdaftar.";
  }
  return `${bawaan} (${pesan})`;
}

/* ==========================================================================
   QUERY - DASBOR
   ========================================================================== */

async function angka(sql: string, ...p: unknown[]): Promise<number> {
  const r = await one<{ n: number | null }>(sql, ...p);
  return Number(r?.n ?? 0);
}

export async function statistikDasbor(): Promise<StatDasbor> {
  return {
    totalPaket: await angka("SELECT COUNT(*) AS n FROM packages"),
    paketTerbit: await angka("SELECT COUNT(*) AS n FROM packages WHERE status = 'published'"),
    totalSoal: await angka("SELECT COUNT(*) AS n FROM questions"),
    totalPeserta: await angka("SELECT COUNT(*) AS n FROM users WHERE role = 'siswa'"),
    pengerjaanSelesai: await angka("SELECT COUNT(*) AS n FROM attempts WHERE status = 'finished'"),
    rataSkor: Math.round(
      await angka(
        "SELECT AVG(total_skor) AS n FROM attempts WHERE status = 'finished' AND total_skor IS NOT NULL",
      ),
    ),
  };
}

export async function pengerjaanTerbaru(batas = 5): Promise<PengerjaanRow[]> {
  return await all<PengerjaanRow>(
    `SELECT a.id, a.user_id, a.package_id, u.nama, u.email, p.kode, p.nama AS paket_nama,
            a.status, a.started_at, a.finished_at, a.total_skor
       FROM attempts a
       JOIN users u    ON u.id = a.user_id
       JOIN packages p ON p.id = a.package_id
      ORDER BY COALESCE(a.finished_at, a.started_at) DESC, a.id DESC
      LIMIT ?`,
    batas,
  );
}

/* ==========================================================================
   QUERY - PAKET
   ========================================================================== */

export async function daftarPaket(): Promise<PaketRingkas[]> {
  return await all<PaketRingkas>(
    `SELECT p.*,
            (SELECT COUNT(*) FROM questions q WHERE q.package_id = p.id) AS jumlah_soal,
            (SELECT COUNT(*) FROM attempts  a WHERE a.package_id = p.id) AS jumlah_peserta
       FROM packages p
      ORDER BY p.created_at DESC, p.id DESC`,
  );
}

export async function ambilPaket(id: number): Promise<PaketRow | undefined> {
  return await one<PaketRow>("SELECT * FROM packages WHERE id = ?", id);
}

export async function ambilPaketRingkas(id: number): Promise<PaketRingkas | undefined> {
  return await one<PaketRingkas>(
    `SELECT p.*,
            (SELECT COUNT(*) FROM questions q WHERE q.package_id = p.id) AS jumlah_soal,
            (SELECT COUNT(*) FROM attempts  a WHERE a.package_id = p.id) AS jumlah_peserta
       FROM packages p WHERE p.id = ?`,
    id,
  );
}

interface AgregatSubtes {
  subtes: string;
  total: number;
  c3: number;
  c4: number;
}

/**
 * Kelengkapan tiap subtes satu paket.
 *
 * `jalur` menentukan daftar subtes mana yang ditelusuri: tujuh subtes UTBK atau
 * tiga subtes SKD. Tanpa itu, paket SKD selalu dilaporkan 0/30 pada subtes yang
 * bukan miliknya, dan butir TWK/TIU/TKP-nya tidak pernah muncul sama sekali.
 */
export async function ringkasanSubtes(packageId: number, jalur?: string | null): Promise<RingkasSubtes[]> {
  const agg = await all<AgregatSubtes>(
    `SELECT subtes,
            COUNT(*) AS total,
            SUM(CASE WHEN level = 'C3' THEN 1 ELSE 0 END) AS c3,
            SUM(CASE WHEN level = 'C4' THEN 1 ELSE 0 END) AS c4
       FROM questions WHERE package_id = ? GROUP BY subtes`,
    packageId,
  );
  const semua = await all<SoalRow>("SELECT * FROM questions WHERE package_id = ?", packageId);

  return subtesJalur(jalur).map((s) => {
    const a = agg.find((x) => x.subtes === s.kode);
    const terisi = Number(a?.total ?? 0);
    const c3 = Number(a?.c3 ?? 0);
    const c4 = Number(a?.c4 ?? 0);
    const persenC3 = terisi ? c3 / terisi : 0;
    const persenC4 = terisi ? c4 / terisi : 0;
    const bermasalah = semua.filter((q) => q.subtes === s.kode && masalahSoal(q).length > 0).length;
    return {
      kode: s.kode,
      nama: s.nama,
      namaPendek: s.namaPendek,
      target: s.jumlahSoal,
      terisi,
      c3,
      c4,
      persenC3,
      persenC4,
      komposisiMelenceng:
        terisi > 0 &&
        (Math.abs(persenC3 - TARGET_C3) > TOLERANSI_KOMPOSISI ||
          Math.abs(persenC4 - TARGET_C4) > TOLERANSI_KOMPOSISI),
      bermasalah,
    };
  });
}

/* ==========================================================================
   QUERY - SOAL
   ========================================================================== */

export async function daftarSoal(packageId: number, subtes?: string): Promise<SoalRow[]> {
  if (subtes) {
    return await all<SoalRow>(
      "SELECT * FROM questions WHERE package_id = ? AND subtes = ? ORDER BY nomor ASC, id ASC",
      packageId,
      subtes,
    );
  }
  return await all<SoalRow>(
    "SELECT * FROM questions WHERE package_id = ? ORDER BY subtes ASC, nomor ASC",
    packageId,
  );
}

export async function ambilSoal(id: number): Promise<SoalRow | undefined> {
  return await one<SoalRow>("SELECT * FROM questions WHERE id = ?", id);
}

/** Nomor terkecil yang belum terpakai pada satu subtes. */
export async function nomorKosongBerikutnya(packageId: number, subtes: string): Promise<number> {
  const dipakai = new Set(
    (await all<{ nomor: number }>(
      "SELECT nomor FROM questions WHERE package_id = ? AND subtes = ?",
      packageId,
      subtes,
    )).map((r) => Number(r.nomor)),
  );
  const maks = getSubtesApaPun(subtes)?.jumlahSoal ?? 100;
  for (let i = 1; i <= maks; i++) if (!dipakai.has(i)) return i;
  return maks;
}

/* ==========================================================================
   QUERY - PESERTA
   ========================================================================== */

const SQL_PESERTA = `SELECT u.id, u.nama, u.nisn, u.kelas, u.email, u.asal_sekolah, u.no_hp, u.role, u.created_at,
            (SELECT COUNT(*) FROM attempts a WHERE a.user_id = u.id) AS jumlah_tryout,
            (SELECT AVG(a.total_skor) FROM attempts a
              WHERE a.user_id = u.id AND a.status = 'finished' AND a.total_skor IS NOT NULL) AS rata_skor
       FROM users u`;

export async function daftarPeserta(cari = ""): Promise<PesertaRow[]> {
  const q = cari.trim();
  const urut = " ORDER BY u.created_at DESC, u.id DESC";
  if (!q) return await all<PesertaRow>(SQL_PESERTA + urut);
  const pola = `%${q.toLowerCase()}%`;
  return await all<PesertaRow>(
    `${SQL_PESERTA}
      WHERE LOWER(u.nama) LIKE ?
         OR LOWER(u.email) LIKE ?
         OR COALESCE(u.nisn, '') LIKE ?
         OR LOWER(COALESCE(u.kelas, '')) LIKE ?
         OR LOWER(COALESCE(u.asal_sekolah, '')) LIKE ?${urut}`,
    pola,
    pola,
    pola,
    pola,
    pola,
  );
}

/* --------------------------------------------------------------------------
   PESERTA DIKELOMPOKKAN PER KELAS
   -------------------------------------------------------------------------- */

export interface KelompokKelas {
  /** Nama kelas apa adanya, atau label khusus untuk demo / tanpa kelas. */
  kelas: string;
  /** true = kelompok akun demo (NISN berawalan 0089), bukan kelas sungguhan. */
  demo: boolean;
  /** true = siswa yang kolom kelasnya memang kosong. */
  tanpaKelas: boolean;
  anggota: PesertaRow[];
}

/**
 * Urutan kelas yang wajar bagi manusia: X lebih dulu, lalu XI, lalu XII, dan
 * di dalam tiap tingkat diurutkan menurut abjad.
 *
 * Diurutkan apa adanya (`localeCompare` polos) hasilnya salah: "X Djuanda"
 * jatuh di antara "XI ..." dan "XII ..." karena X, XI, XII berbagi awalan yang
 * sama. Karena itu tingkatnya dibaca lebih dulu.
 */
function bobotTingkat(kelas: string): number {
  const t = kelas.trim().toUpperCase();
  if (/^XII/.test(t)) return 3;
  if (/^XI/.test(t)) return 2;
  if (/^X/.test(t)) return 1;
  return 4; // kelas dengan penamaan lain: taruh sesudah ketiganya
}

/**
 * Seluruh peserta, dikelompokkan per kelas.
 *
 * Diminta pengelola 11 September 2026 — daftar 1.214 akun dalam satu tabel
 * panjang tidak bisa dipakai untuk pekerjaan yang sebenarnya, yaitu memeriksa
 * satu kelas.
 *
 * TIGA KELOMPOK KHUSUS, dan urutannya di bawah disengaja:
 *
 *  1. Kelas sungguhan — X, XI, XII menurut tingkat lalu abjad.
 *  2. "Tanpa kelas" — siswa yang kolom kelasnya kosong. Ditaruh menjelang
 *     akhir karena justru merekalah yang perlu dibereskan pengelola.
 *  3. `LABEL_KELAS_DEMO` — akun berawalan NISN 0089. PALING BAWAH, dan tidak
 *     pernah ikut ke kelas mana pun walau kolom kelasnya terisi nama kelas
 *     sungguhan. Lihat alasannya di `akunDemo()`.
 */
export async function pesertaPerKelas(cari = ""): Promise<KelompokKelas[]> {
  const semua = await daftarPeserta(cari);
  const peta = new Map<string, KelompokKelas>();

  for (const u of semua) {
    const demo = akunDemo(u.nisn);
    const nama = demo ? LABEL_KELAS_DEMO : (u.kelas ?? "").trim();
    // Kuncinya HURUF BESAR semua: data sekolah pernah memuat "XII HARVARD" dan
    // "XII Harvard" sebagai dua nilai berbeda, dan memisahkannya menjadi dua
    // kelompok membuat pengelola memeriksa satu kelas lalu tanpa sadar
    // meninggalkan beberapa anak di kelompok kembarannya. Aturan yang sama
    // dipakai `daftarKelas()` di bawah.
    const kunci = demo ? "#demo#" : nama ? nama.toUpperCase() : "#kosong#";

    let g = peta.get(kunci);
    if (!g) {
      g = {
        kelas: demo ? LABEL_KELAS_DEMO : nama || "Tanpa kelas",
        demo,
        tanpaKelas: !demo && !nama,
        anggota: [],
      };
      peta.set(kunci, g);
    }
    g.anggota.push(u);
  }

  const kelompok = [...peta.values()];
  // Ejaan yang paling banyak dipakai menjadi nama kelompoknya — bukan ejaan
  // milik siswa yang kebetulan terdaftar paling awal.
  for (const g of kelompok) {
    if (g.demo || g.tanpaKelas) continue;
    const hitung = new Map<string, number>();
    for (const u of g.anggota) {
      const e = (u.kelas ?? "").trim();
      if (e) hitung.set(e, (hitung.get(e) ?? 0) + 1);
    }
    const terbanyak = [...hitung.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (terbanyak.length) g.kelas = terbanyak[0][0];
  }
  // Anggota tiap kelas menurut abjad — daftar absen dibaca begitu, bukan
  // menurut kapan akunnya dibuat.
  for (const g of kelompok) g.anggota.sort((a, b) => a.nama.localeCompare(b.nama, "id"));

  kelompok.sort((a, b) => {
    const pangkat = (g: KelompokKelas) => (g.demo ? 3 : g.tanpaKelas ? 2 : 1);
    if (pangkat(a) !== pangkat(b)) return pangkat(a) - pangkat(b);
    if (a.demo || a.tanpaKelas) return 0;
    const t = bobotTingkat(a.kelas) - bobotTingkat(b.kelas);
    return t !== 0 ? t : a.kelas.localeCompare(b.kelas, "id");
  });
  return kelompok;
}

/**
 * Nama kelas yang SUDAH dipakai, untuk daftar saran pada formulir tambah
 * peserta. Akun demo tidak ikut menyumbang nama kelas.
 */
export async function namaKelasTerpakai(): Promise<string[]> {
  return (await all<{ kelas: string }>(
    `SELECT DISTINCT TRIM(kelas) AS kelas
       FROM users
      WHERE role = 'siswa'
        AND kelas IS NOT NULL AND TRIM(kelas) <> ''
        -- COALESCE, bukan IFNULL: IFNULL milik SQLite dan ditolak
        -- PostgreSQL. COALESCE standar SQL dan dimengerti keduanya.
        AND COALESCE(nisn, '') NOT LIKE ?
      ORDER BY kelas`,
    `${AWALAN_NISN_DEMO}%`,
  )).map((r) => r.kelas);
}

export async function ambilPeserta(id: number): Promise<PesertaRow | undefined> {
  return await one<PesertaRow>(`${SQL_PESERTA} WHERE u.id = ?`, id);
}

export async function pengerjaanPeserta(userId: number): Promise<PengerjaanRow[]> {
  return await all<PengerjaanRow>(
    `SELECT a.id, a.user_id, u.nama, u.email, p.kode, p.nama AS paket_nama,
            a.status, a.started_at, a.finished_at, a.total_skor
       FROM attempts a
       JOIN users u    ON u.id = a.user_id
       JOIN packages p ON p.id = a.package_id
      WHERE a.user_id = ?
      ORDER BY COALESCE(a.finished_at, a.started_at) DESC, a.id DESC`,
    userId,
  );
}

/* ==========================================================================
   DAFTAR PESERTA PER PAKET
   ========================================================================== */

export interface KelasRow {
  /** Nama kelas sebagaimana dipilih pengelola, mis. "XII HARVARD". */
  kelas: string;
  /** Berapa peserta yang kelasnya cocok (mengabaikan besar-kecil huruf). */
  jumlah: number;
  /** Sudah didaftarkan pada paket yang sedang dibuka? */
  terpilih: boolean;
}

export interface PesertaPaketRow {
  user_id: number;
  nama: string;
  nisn: string | null;
  kelas: string | null;
  /** true = ikut karena KELASNYA didaftarkan, bukan karena namanya. */
  lewat_kelas: boolean;
}

/**
 * Semua kelas yang ada pada data peserta, dirapikan.
 *
 * Data asli sekolah memuat "XII HARVARD" (30 orang) dan "XII Harvard" (1 orang)
 * sebagai dua nilai berbeda. Menampilkan keduanya sebagai dua pilihan hanya akan
 * membuat pengelola mencentang satu dan tanpa sadar meninggalkan satu peserta di
 * luar ujian. Jadi kelas dikelompokkan tanpa memandang besar-kecil huruf, dan
 * yang ditampilkan adalah ejaan yang paling banyak dipakai.
 */
export async function daftarKelas(packageId: number): Promise<KelasRow[]> {
  return await all<KelasRow>(
    // Ditulis BERTINGKAT — hitung tiap ejaan dulu, baru pilih wakilnya —
    // bukan dengan anak query berkorelasi di dalam SELECT yang dikelompokkan.
    // Bentuk yang lama ("(SELECT … WHERE UPPER(r2.kelas) = UPPER(r1.kelas) …)"
    // di samping `GROUP BY UPPER(kelas)`) hanya sah di SQLite; PostgreSQL
    // menolaknya: "subquery uses ungrouped column r1.kelas from outer query".
    //
    // `DISTINCT ON (kunci)` + `ORDER BY n DESC` memilih ejaan yang PALING SERING
    // dipakai sebagai wakil kelompok, dan `SUM(n) OVER (PARTITION BY kunci)`
    // menjumlahkan seluruh ejaan dalam kelompok itu — dua hal yang dulu
    // dikerjakan anak query tersebut.
    `WITH rapi AS (
       SELECT TRIM(kelas) AS kelas
         FROM users
        WHERE role = 'siswa' AND kelas IS NOT NULL AND TRIM(kelas) <> ''
     ),
     ejaan AS (
       SELECT kelas, UPPER(kelas) AS kunci, COUNT(*) AS n
         FROM rapi
     GROUP BY kelas, UPPER(kelas)
     ),
     kelompok AS (
       SELECT DISTINCT ON (kunci)
              kunci,
              kelas,
              SUM(n) OVER (PARTITION BY kunci) AS jumlah
         FROM ejaan
     ORDER BY kunci, n DESC, kelas
     )
     SELECT k.kelas,
            k.jumlah,
            EXISTS (SELECT 1 FROM paket_kelas pk
                     WHERE pk.package_id = ?
                       AND lower(TRIM(pk.kelas)) = lower(k.kelas)) AS terpilih
       FROM kelompok k
   ORDER BY k.kelas`,
    packageId,
  );
}

/** Peserta yang namanya didaftarkan satu per satu pada paket ini. */
export async function pesertaPaket(packageId: number): Promise<PesertaPaketRow[]> {
  return await all<PesertaPaketRow>(
    `SELECT u.id AS user_id, u.nama, u.nisn, u.kelas, 0 AS lewat_kelas
       FROM paket_peserta pp
       JOIN users u ON u.id = pp.user_id
      WHERE pp.package_id = ?
   ORDER BY u.kelas, u.nama`,
    packageId,
  );
}

/**
 * Seluruh peserta yang BOLEH mengikuti paket ini — gabungan nama yang
 * didaftarkan satu per satu dan seluruh isi kelas yang dicentang.
 *
 * Inilah angka yang benar-benar berarti bagi pengelola: "berapa anak yang akan
 * bisa masuk hari Jumat", bukan "berapa baris yang saya klik".
 */
export async function pesertaDiizinkanPaket(packageId: number): Promise<PesertaPaketRow[]> {
  return await all<PesertaPaketRow>(
    `SELECT u.id AS user_id, u.nama, u.nisn, u.kelas,
            CASE WHEN EXISTS (SELECT 1 FROM paket_peserta pp
                               WHERE pp.package_id = ?1 AND pp.user_id = u.id)
                 THEN 0 ELSE 1 END AS lewat_kelas
       FROM users u
      WHERE u.role = 'siswa'
        AND (EXISTS (SELECT 1 FROM paket_peserta pp
                      WHERE pp.package_id = ?1 AND pp.user_id = u.id)
          OR EXISTS (SELECT 1 FROM paket_kelas pk
                      WHERE pk.package_id = ?1
                        AND u.kelas IS NOT NULL
                        AND lower(TRIM(u.kelas)) = lower(TRIM(pk.kelas))))
   ORDER BY u.kelas, u.nama`,
    packageId,
  );
}

/** Ganti seluruh daftar kelas paket ini dengan yang dikirim pengelola. */
export async function setelKelasPaket(packageId: number, kelas: string[]): Promise<void> {
  await tx(async () => {
    await run("DELETE FROM paket_kelas WHERE package_id = ?", packageId);
    for (const k of kelas) {
      const bersih = k.trim();
      if (!bersih) continue;
      await run(
        `INSERT INTO paket_kelas (package_id, kelas) VALUES (?, ?)
         ON CONFLICT (package_id, kelas) DO NOTHING`,
        packageId,
        bersih,
      );
    }
  });
}

/** Tambahkan satu peserta ke daftar paket. Aman diulang. */
export async function tambahPesertaPaket(packageId: number, userId: number): Promise<{ error?: string }> {
  const u = await one<{ role: string }>("SELECT role FROM users WHERE id = ?", userId);
  if (!u) return { error: "Peserta tidak ditemukan." };
  if (u.role !== "siswa") return { error: "Hanya akun peserta yang bisa didaftarkan." };
  await run(
    `INSERT INTO paket_peserta (package_id, user_id) VALUES (?, ?)
     ON CONFLICT (package_id, user_id) DO NOTHING`,
    packageId,
    userId,
  );
  return {};
}

export async function hapusPesertaPaket(packageId: number, userId: number): Promise<void> {
  await run("DELETE FROM paket_peserta WHERE package_id = ? AND user_id = ?", packageId, userId);
}

/**
 * Buang seluruh pembatas paket ini — kembali terbuka untuk semua peserta.
 * Disediakan sebagai satu tombol karena inilah jalan keluar tercepat kalau
 * pengelola salah mengunci paket pada hari-H.
 */
export async function bukaPaketUntukSemua(packageId: number): Promise<void> {
  await tx(async () => {
    await run("DELETE FROM paket_peserta WHERE package_id = ?", packageId);
    await run("DELETE FROM paket_kelas   WHERE package_id = ?", packageId);
  });
}

/* ==========================================================================
   UJIAN SUSULAN
   ========================================================================== */

export interface IzinSusulanRow {
  id: number;
  user_id: number;
  package_id: number;
  paket_kode: string;
  paket_nama: string;
  catatan: string | null;
  created_at: string;
  dipakai_at: string | null;
  pemberi: string | null;
  attempt_status: string | null;
}

export interface PesertaGugurRow {
  user_id: number;
  attempt_id: number;
  nama: string;
  kelas: string | null;
  nisn: string | null;
  digugurkan_at: string | null;
  alasan_gugur: string | null;
  /** Sudah dibukakan ujian susulan untuk paket ini? */
  sudah_izin: boolean;
  /** Sudah dipakai peserta untuk mengulang? */
  sudah_dipakai: boolean;
  /**
   * Subtes yang sedang dikerjakan saat ia digugurkan, mis. "PPU".
   * Inilah yang akan dibuka kembali oleh tombol "Dibuka".
   */
  subtes_terhenti: string | null;
  /** Berapa butir yang sudah terjawab — bahan pertimbangan lanjut vs mengulang. */
  jumlah_jawaban: number;
}

/**
 * Peserta yang DIGUGURKAN pada satu paket, beserta status izin susulannya.
 *
 * Dipisahkan dari `rekapPelanggaran` karena keduanya menjawab pertanyaan yang
 * berbeda: rekap menjawab "siapa yang perlu diperiksa", sedangkan ini menjawab
 * "siapa yang ujiannya perlu dibuka lagi".
 */
export async function pesertaGugur(packageId: number): Promise<PesertaGugurRow[]> {
  return await all<PesertaGugurRow>(
    `SELECT u.id AS user_id, a.id AS attempt_id, u.nama, u.kelas, u.nisn,
            a.digugurkan_at, a.alasan_gugur,
            CASE WHEN s.id IS NULL THEN 0 ELSE 1 END          AS sudah_izin,
            CASE WHEN s.dipakai_at IS NULL THEN 0 ELSE 1 END  AS sudah_dipakai,
            -- Subtes yang ditutup PADA detik pengguguran; sama persis dengan
            -- yang akan dibuka kembali oleh bukaBlokirUjian().
            (SELECT asb.subtes FROM attempt_subtes asb
              WHERE asb.attempt_id = a.id
                AND asb.selesai_at IS NOT NULL
                AND asb.selesai_at >= datetime(a.digugurkan_at, 'utc', '-180 seconds')
           ORDER BY asb.selesai_at DESC LIMIT 1)               AS subtes_terhenti,
            (SELECT COUNT(*) FROM answers w
              WHERE w.attempt_id = a.id AND w.jawaban IS NOT NULL AND w.jawaban <> '')
                                                              AS jumlah_jawaban
       FROM attempts a
       JOIN users u   ON u.id = a.user_id
       LEFT JOIN susulan s ON s.user_id = a.user_id AND s.package_id = a.package_id
      WHERE a.package_id = ? AND a.status = 'gugur'
   ORDER BY u.kelas, u.nama`,
    packageId,
  );
}

/** Satu pengerjaan yang waktunya sudah habis tetapi statusnya masih `ongoing`. */
export interface UjianTerbengkalaiRow {
  attempt_id: number;
  user_id: number;
  nama: string;
  kelas: string | null;
  paket_kode: string;
  paket_nama: string;
  started_at: string;
  jumlah_jawaban: number;
  deadline_terakhir: string | null;
}

/**
 * Pengerjaan `ongoing` yang TIDAK punya satu pun timer subtes yang masih
 * berjalan — tidak ada hitungan mundur yang sedang menyala untuk peserta ini.
 *
 * Inilah bahan mentah untuk dua hal yang berbeda, dan bedanya penting:
 *
 *   · Peserta yang MASIH BISA melanjutkan (jendela paket belum tutup dan masih
 *     ada subtes yang belum pernah dibuka) — ia sedang JEDA. Menutup ujiannya
 *     berarti merampas subtes yang belum sempat ia kerjakan.
 *   · Peserta yang SUDAH TIDAK BISA melanjutkan apa pun — itulah yang
 *     terbengkalai, dan hanya itu yang boleh ditutup.
 *
 * Keduanya sama-sama tidak boleh tampil sebagai "sedang mengerjakan" di papan
 * live, karena tidak ada timer yang berjalan pada keduanya.
 */
async function sesiTanpaTimer(packageId?: number): Promise<(UjianTerbengkalaiRow & {
  package_id: number;
  jendela_tutup: number;
  subtes_dibuka: number;
})[]> {
  const saring = packageId ? "AND a.package_id = ?" : "";
  const sql = `SELECT a.id AS attempt_id, a.user_id, a.package_id, u.nama, u.kelas,
                      p.kode AS paket_kode, p.nama AS paket_nama, a.started_at,
                      CASE WHEN p.status = 'closed'
                             OR (p.selesai_at IS NOT NULL AND p.selesai_at < now())
                           THEN 1 ELSE 0 END                                AS jendela_tutup,
                      (SELECT COUNT(DISTINCT s.subtes) FROM attempt_subtes s
                        WHERE s.attempt_id = a.id)                          AS subtes_dibuka,
                      (SELECT COUNT(*) FROM answers w
                        WHERE w.attempt_id = a.id
                          AND w.jawaban IS NOT NULL AND w.jawaban <> '')     AS jumlah_jawaban,
                      (SELECT MAX(s.deadline_at) FROM attempt_subtes s
                        WHERE s.attempt_id = a.id)                          AS deadline_terakhir
                 FROM attempts a
                 JOIN users u    ON u.id = a.user_id
                 JOIN packages p ON p.id = a.package_id
                WHERE a.status = 'ongoing'
                  -- Tidak ada timer yang masih berjalan. deadline_at
                  -- dibandingkan dengan julianday('now') (UTC) mengikuti
                  -- tutupSubtesKedaluwarsa() di exam.ts; jendela paket memakai
                  -- waktu lokal seperti seluruh sisi admin. Keduanya memang
                  -- berbeda, jangan "dirapikan" jadi sama, nanti justru salah.
                  AND NOT EXISTS (
                        SELECT 1 FROM attempt_subtes s
                         WHERE s.attempt_id = a.id
                           AND s.selesai_at IS NULL
                           AND julianday(s.deadline_at) > julianday('now')
                  ) ${saring}
             ORDER BY a.started_at`;
  return packageId ? await all(sql, packageId) : await all(sql);
}

/**
 * true = peserta ini masih punya subtes yang belum pernah dibuka DAN jendela
 * paketnya masih terbuka, jadi ia berhak kembali dan melanjutkan.
 *
 * `urutanSubtesPaket()` dipakai apa adanya supaya jalur SKD ikut benar: di sana
 * seluruh paket diwakili SATU kode sesi, bukan tiga subtes.
 */
async function masihBisaLanjut(baris: { package_id: number; jendela_tutup: number; subtes_dibuka: number }): Promise<boolean> {
  const jumlahSesi = (await urutanSubtesPaket(baris.package_id)).length;
  // Paket yang soalnya BELUM diunggah tidak punya sesi apa pun untuk dinilai.
  // Menutupnya hanya akan melahirkan nilai nol atas ujian yang belum pernah
  // ada — persis keadaan TO-11SEP2026 pada 7 September, ketika sesi peserta
  // sudah lahir sementara soalnya masih ditunggu. Ia menunggu, bukan
  // terbengkalai.
  if (jumlahSesi === 0) return true;
  if (baris.jendela_tutup === 1) return false;
  return baris.subtes_dibuka < jumlahSesi;
}

/**
 * Pengerjaan yang waktunya sudah habis tetapi tidak pernah tertutup.
 *
 * Penutupan ujian selama ini hanya terjadi saat HALAMANNYA DIBUKA peserta:
 * `keadaanUjian()` yang menutup subtes kedaluwarsa lalu memanggil
 * `selesaikanUjian()`. Peserta yang menutup peramban pada subtes terakhir —
 * atau yang baterainya habis — tidak pernah membuka halaman itu lagi, sehingga
 * pengerjaannya menggantung `ongoing` selamanya: tidak dinilai, tidak masuk
 * peringkat, dan di layar admin terbaca "Mengerjakan" dengan titik berdenyut
 * berjam-jam sesudah waktunya habis.
 *
 * Yang masih boleh melanjutkan SENGAJA TIDAK ikut: selama jendela paket masih
 * terbuka dan masih ada subtes yang belum dibuka, peserta berhak kembali —
 * `keadaanUjian()` akan menyalakan timer subtes berikutnya untuknya. Menutup
 * ujiannya lebih awal sama saja menghapus subtes yang belum ia kerjakan.
 *
 * Tanpa `packageId` daftarnya mencakup seluruh paket.
 */
/**
 * Memisahkan sesi bertimer mati menjadi "masih boleh lanjut" dan "terbengkalai".
 *
 * Ditulis sebagai perulangan, bukan `.filter()`: penyaringnya menanyai basis
 * data, dan `.filter()` tidak bisa menunggu jawabannya — ia hanya melihat
 * Promise, yang selalu bernilai benar, sehingga SELURUH baris akan lolos.
 * Kesalahan itu tidak menghasilkan galat apa pun; ia hanya menutup ujian
 * peserta yang sebenarnya masih berhak melanjutkan.
 */
async function saringSesi(
  packageId: number | undefined,
  bolehLanjut: boolean,
): Promise<UjianTerbengkalaiRow[]> {
  const semua = await sesiTanpaTimer(packageId);
  const hasil: UjianTerbengkalaiRow[] = [];
  for (const b of semua) {
    if ((await masihBisaLanjut(b)) === bolehLanjut) hasil.push(b);
  }
  return hasil;
}

export async function ujianTerbengkalai(packageId?: number): Promise<UjianTerbengkalaiRow[]> {
  return await saringSesi(packageId, false);
}

/**
 * Pengerjaan yang timernya mati tetapi peserta MASIH BOLEH kembali melanjutkan.
 *
 * Bukan terbengkalai, bukan pula "sedang mengerjakan" — dan karena itu tidak
 * boleh tampil dengan titik berdenyut di papan live.
 */
export async function ujianJeda(packageId?: number): Promise<UjianTerbengkalaiRow[]> {
  return await saringSesi(packageId, true);
}

/**
 * Tutup dan nilai seluruh pengerjaan terbengkalai.
 *
 * Memakai `selesaikanUjian()` yang sama persis dengan penutupan biasa, jadi
 * jawaban yang telanjur terisi TETAP DINILAI — peserta yang sudah mengerjakan
 * 64 soal tidak kehilangan pekerjaannya hanya karena peramban ditutup sebelum
 * subtes terakhir habis.
 *
 * Sengaja BUKAN pekerjaan otomatis. Menutup ujian berarti memunculkan nilai
 * baru di peringkat, dan itu keputusan pengelola, bukan efek samping seseorang
 * membuka sebuah halaman.
 */
export async function tutupUjianTerbengkalai(packageId?: number): Promise<{ jumlah: number }> {
  const daftar = await ujianTerbengkalai(packageId);
  for (const d of daftar) await selesaikanUjian(d.attempt_id);
  return { jumlah: daftar.length };
}

/**
 * Bukakan ujian susulan untuk SELURUH peserta yang gugur pada satu paket.
 *
 * Ada karena skalanya menuntutnya: pada tryout 4-6 September 2026, 464 peserta
 * berstatus gugur sekaligus. Membukanya satu per satu lewat halaman detail
 * peserta berarti 464 kali klik, dan pekerjaan sebesar itu tidak akan pernah
 * benar-benar dikerjakan.
 *
 * Peserta yang sudah memegang izin tidak disentuh, supaya izin yang sudah
 * dipakai tidak tersetel ulang dan menghapus pengerjaan susulannya.
 */
export async function beriIzinSusulanMassal(
  packageId: number,
  adminId: number,
  catatan: string,
): Promise<{ jumlah: number; error?: string }> {
  const paket = await one<{ status: string }>("SELECT status FROM packages WHERE id = ?", packageId);
  if (!paket) return { jumlah: 0, error: "Paket tidak ditemukan." };
  if (paket.status !== "published") {
    return { jumlah: 0, error: "Paket harus berstatus terbit sebelum bisa dibukakan susulan." };
  }

  const belum = await all<{ user_id: number }>(
    `SELECT a.user_id
       FROM attempts a
       LEFT JOIN susulan s ON s.user_id = a.user_id AND s.package_id = a.package_id
      WHERE a.package_id = ? AND a.status = 'gugur' AND s.id IS NULL`,
    packageId,
  );

  await tx(async () => {
    for (const b of belum) {
      await run(
        `INSERT INTO susulan (user_id, package_id, diberikan_oleh, catatan)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (user_id, package_id) DO NOTHING`,
        b.user_id,
        packageId,
        adminId,
        catatan.trim() || null,
      );
    }
  });

  return { jumlah: belum.length };
}

export interface HasilBukaBlokir {
  error?: string;
  /** Subtes yang dibuka kembali, mis. "PPU". */
  subtes?: string | null;
  /** Berapa detik sisa waktu subtes itu dikembalikan. */
  dikembalikanDetik?: number;
  /** true = izin susulan ikut diberikan karena jendela paketnya sudah tutup. */
  lewatSusulan?: boolean;
}

/**
 * BUKA BLOKIR satu pengerjaan yang digugurkan — peserta MELANJUTKAN, bukan
 * mengulang.
 *
 * Bedanya dengan izin Ujian Susulan, dan bedanya besar:
 *
 *   Ujian Susulan  → `mulaiSusulan()` MENGHAPUS jawaban, timer, dan hasil ronde
 *                    lama. Tepat untuk peserta yang belum pernah ikut sama
 *                    sekali, atau yang memang harus mengulang dari nol.
 *   Dibuka (ini)   → tidak menghapus apa pun. Jawaban yang sudah terisi tetap,
 *                    dan peserta kembali ke subtes yang tadi terpotong.
 *
 * Dibuat untuk kejadian yang paling sering terjadi di lapangan: peserta sedang
 * mengerjakan PPU, jaringannya membeku, ia keluar dari halaman ujian, dan
 * sistem menggugurkannya. Menyuruhnya mengulang dari PU jelas tidak adil —
 * yang hilang cuma sambungannya, bukan pekerjaannya.
 *
 * Tiga hal yang dikembalikan, dan ketiganya perlu:
 *
 *  1. BARIS SUBTES DIBUKA LAGI. `gugurkanUjian()` menutup semua subtes yang
 *     masih berjalan, jadi yang ditutup pada detik pengguguran itulah yang
 *     dibuka kembali. `keadaanUjian()` menurunkan subtes aktif dari baris ini,
 *     jadi tidak ada yang perlu ditulis ke `subtes_aktif`.
 *  2. TENGGAT DIGESER selama peserta terblokir. Tanpa ini, peserta yang
 *     dibukakan 20 menit kemudian mendapati subtesnya langsung kedaluwarsa —
 *     `tutupSubtesKedaluwarsa()` menutupnya lagi sebelum satu soal pun tampil.
 *  3. RONDE DINAIKKAN. Pelanggaran ronde lama tetap tersimpan sebagai riwayat
 *     bagi pengawas, tetapi tidak lagi ikut dihitung — kalau tidak, peserta
 *     yang tadi gugur karena lepasan layar penuh kedua akan gugur lagi pada
 *     lepasan berikutnya, karena hitungannya sudah telanjur penuh.
 */
export async function bukaBlokirUjian(
  userId: number,
  packageId: number,
  adminId: number,
): Promise<HasilBukaBlokir> {
  const att = await one<{
    id: number;
    status: string;
    digugurkan_at: string | null;
    terblokir_detik: number | null;
  }>(
    `SELECT id, status, digugurkan_at,
            CAST(strftime('%s', datetime('now','localtime'))
                 - strftime('%s', digugurkan_at) AS INTEGER) AS terblokir_detik
       FROM attempts WHERE user_id = ? AND package_id = ?`,
    userId,
    packageId,
  );

  if (!att) return { error: "Peserta ini belum pernah memulai paket tersebut." };
  if (att.status === "finished") {
    return { error: "Pengerjaan peserta ini sudah selesai dan sudah dinilai." };
  }
  if (att.status !== "gugur") {
    return { error: "Ujian peserta ini tidak sedang diblokir, jadi tidak ada yang perlu dibuka." };
  }

  // Jeda negatif berarti jamnya bergeser; jangan sampai malah memotong waktu.
  const terblokir = Math.max(0, att.terblokir_detik ?? 0);
  let subtes: string | null = null;

  await tx(async () => {
    // Subtes yang ditutup PADA detik pengguguran. Toleransi tiga menit menutupi
    // selisih penulisan; `digugurkan_at` disimpan waktu lokal sedangkan
    // `selesai_at` disimpan UTC, jadi keduanya disamakan lebih dulu.
    const baris = await all<{ id: number; subtes: string }>(
      `SELECT id, subtes FROM attempt_subtes
        WHERE attempt_id = ?1
          AND selesai_at IS NOT NULL
          AND selesai_at >= datetime(?2, 'utc', '-180 seconds')
     ORDER BY selesai_at DESC`,
      att.id,
      att.digugurkan_at,
    );

    for (const b of baris) {
      await run(
        `UPDATE attempt_subtes
            SET selesai_at  = NULL,
                deadline_at = datetime(deadline_at, ? || ' seconds')
          WHERE id = ?`,
        `+${terblokir}`,
        b.id,
      );
    }
    subtes = baris[0]?.subtes ?? null;

    await run(
      `UPDATE attempts
          SET status = 'ongoing',
              digugurkan_at = NULL,
              alasan_gugur  = NULL,
              ronde = ronde + 1,
              -- Denyut ronde lama dilupakan: jeda sepanjang masa terblokir
              -- akan langsung terbaca sebagai kepergian bila dibiarkan.
              denyut_at = NULL,
              denyut_aktif = 0
        WHERE id = ?`,
      att.id,
    );
  });

  // Jendela paketnya sudah lewat? Tanpa izin susulan peserta tidak akan melihat
  // paketnya lagi di beranda, dan pembukaan ini sia-sia. Izinnya AMAN diberikan:
  // `mulaiSusulan()` tidak menghapus apa pun untuk pengerjaan yang berstatus
  // `ongoing` — ia hanya menandai jalurnya.
  const terbuka = await one<{ n: number }>(
    `SELECT COUNT(*) AS n FROM packages p WHERE p.id = ? ${JENDELA_PAKET_ADMIN}`,
    packageId,
  );
  const lewatSusulan = (terbuka?.n ?? 0) === 0;
  if (lewatSusulan) {
    await run(
      `INSERT INTO susulan (user_id, package_id, diberikan_oleh, catatan)
       VALUES (?, ?, ?, 'Akses lanjutan sesudah blokir dibuka')
       ON CONFLICT (user_id, package_id) DO NOTHING`,
      userId,
      packageId,
      adminId,
    );
  }

  return { subtes, dikembalikanDetik: terblokir, lewatSusulan };
}

/** Salinan ekspresi jendela paket milik `exam.ts`, untuk dipakai di sisi admin. */
const JENDELA_PAKET_ADMIN = `
  AND ((p.mulai_at   IS NULL OR p.mulai_at   <= now())
   AND (p.selesai_at IS NULL OR p.selesai_at >= now()))`;

/**
 * Buka blokir SELURUH peserta yang digugurkan pada satu paket sekaligus.
 * Dipakai ketika satu gangguan jaringan menjatuhkan banyak peserta bersamaan.
 */
export async function bukaBlokirMassal(
  packageId: number,
  adminId: number,
): Promise<{ jumlah: number; error?: string }> {
  const daftar = await all<{ user_id: number }>(
    "SELECT user_id FROM attempts WHERE package_id = ? AND status = 'gugur'",
    packageId,
  );
  let jumlah = 0;
  for (const d of daftar) {
    if (!(await bukaBlokirUjian(d.user_id, packageId, adminId)).error) jumlah += 1;
  }
  return { jumlah };
}

/** Izin susulan yang dipegang satu peserta, beserta status pengerjaannya. */
export async function izinSusulanPeserta(userId: number): Promise<IzinSusulanRow[]> {
  return await all<IzinSusulanRow>(
    `SELECT s.id, s.user_id, s.package_id, s.catatan, s.created_at, s.dipakai_at,
            p.kode AS paket_kode, p.nama AS paket_nama,
            adm.nama AS pemberi,
            (SELECT a.status FROM attempts a
              WHERE a.user_id = s.user_id AND a.package_id = s.package_id) AS attempt_status
       FROM susulan s
       JOIN packages p    ON p.id = s.package_id
       LEFT JOIN users adm ON adm.id = s.diberikan_oleh
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC, s.id DESC`,
    userId,
  );
}

/** Paket yang layak diberi izin susulan: hanya yang sudah terbit. */
export async function paketTerbit(): Promise<{ id: number; kode: string; nama: string }[]> {
  return await all<{ id: number; kode: string; nama: string }>(
    "SELECT id, kode, nama FROM packages WHERE status = 'published' ORDER BY created_at DESC, id DESC",
  );
}

export async function beriIzinSusulan(
  userId: number,
  packageId: number,
  adminId: number,
  catatan: string,
): Promise<{ error?: string }> {
  const peserta = await one<{ role: string }>("SELECT role FROM users WHERE id = ?", userId);
  if (!peserta) return { error: "Peserta tidak ditemukan." };

  const paket = await one<{ status: string }>("SELECT status FROM packages WHERE id = ?", packageId);
  if (!paket) return { error: "Paket tidak ditemukan." };
  if (paket.status !== "published") {
    return { error: "Paket harus berstatus terbit sebelum bisa diberi izin susulan." };
  }

  // Sesi yang sudah selesai punya nilai sah — jangan ditawar ulang lewat susulan.
  const att = await one<{ status: string }>(
    "SELECT status FROM attempts WHERE user_id = ? AND package_id = ?",
    userId,
    packageId,
  );
  if (att?.status === "finished") {
    return { error: "Peserta sudah menyelesaikan paket ini, jadi tidak perlu ujian susulan." };
  }

  await run(
    `INSERT INTO susulan (user_id, package_id, diberikan_oleh, catatan)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, package_id) DO UPDATE SET
       diberikan_oleh = excluded.diberikan_oleh,
       catatan        = excluded.catatan,
       created_at     = datetime('now'),
       dipakai_at     = NULL`,
    userId,
    packageId,
    adminId,
    catatan.trim() || null,
  );
  return {};
}

export async function cabutIzinSusulan(userId: number, packageId: number): Promise<void> {
  await run("DELETE FROM susulan WHERE user_id = ? AND package_id = ?", userId, packageId);
}

export async function jumlahAdmin(): Promise<number> {
  return await angka("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'");
}

/* ==========================================================================
   MUTASI - PAKET
   ========================================================================== */

export async function buatPaket(input: InputPaket): Promise<{ id?: number; error?: string }> {
  const kode = input.kode.trim().toUpperCase();
  if (!kode) return { error: "Kode paket wajib diisi." };
  if (!input.nama.trim()) return { error: "Nama paket wajib diisi." };
  try {
    const res = await sisipWajib(
      `INSERT INTO packages (kode, nama, jalur, deskripsi, status, mulai_at, selesai_at, acak_soal, tampil_pembahasan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      kode,
      input.nama.trim(),
      JALUR_PAKET.includes(input.jalur) ? input.jalur : "utbk",
      input.deskripsi.trim() || null,
      input.status,
      input.mulai_at,
      input.selesai_at,
      input.acak_soal ? 1 : 0,
      input.tampil_pembahasan ? 1 : 0,
    );
    return { id: res };
  } catch (e) {
    return { error: pesanGalatDb(e, "Paket gagal disimpan.") };
  }
}

export async function perbaruiPaket(id: number, input: InputPaket): Promise<{ error?: string }> {
  const kode = input.kode.trim().toUpperCase();
  if (!kode) return { error: "Kode paket wajib diisi." };
  if (!input.nama.trim()) return { error: "Nama paket wajib diisi." };
  try {
    await run(
      `UPDATE packages SET kode = ?, nama = ?, jalur = ?, deskripsi = ?, status = ?,
              mulai_at = ?, selesai_at = ?, acak_soal = ?, tampil_pembahasan = ?
        WHERE id = ?`,
      kode,
      input.nama.trim(),
      JALUR_PAKET.includes(input.jalur) ? input.jalur : "utbk",
      input.deskripsi.trim() || null,
      input.status,
      input.mulai_at,
      input.selesai_at,
      input.acak_soal ? 1 : 0,
      input.tampil_pembahasan ? 1 : 0,
      id,
    );
    // Metadata paket di-cache sepuluh menit; tanpa ini, jendela waktu dan
    // jalur yang baru disunting baru berlaku sesudah cache-nya kedaluwarsa.
    await buangPaket(id);
    return {};
  } catch (e) {
    return { error: pesanGalatDb(e, "Paket gagal diperbarui.") };
  }
}

export async function ubahStatusPaket(id: number, status: PaketStatus): Promise<{ error?: string }> {
  if (!STATUS_PAKET.includes(status)) return { error: "Status tidak dikenal." };
  await run("UPDATE packages SET status = ? WHERE id = ?", status, id);
  await buangPaket(id);
  return {};
}

export async function hapusPaket(id: number): Promise<{ error?: string }> {
  try {
    // FK ON DELETE CASCADE ikut menghapus questions, attempts, answers, results.
    await run("DELETE FROM packages WHERE id = ?", id);
    await buangPaket(id);
    return {};
  } catch (e) {
    return { error: pesanGalatDb(e, "Paket gagal dihapus.") };
  }
}

/* --------------------------------------------------------------------------
   HAPUS RIWAYAT PENGERJAAN SATU PAKET
   -------------------------------------------------------------------------- */

/**
 * Jejak yang ikut lenyap bila riwayat sebuah paket dibersihkan. Dipakai dialog
 * konfirmasi, dan dipakai lagi sebagai laporan sesudah penghapusan berhasil.
 */
export interface JejakRiwayatPaket {
  kode: string;
  nama: string;
  /**
   * `attempts` unik pada (user_id, package_id) — satu peserta hanya punya satu
   * baris per paket, dan ujian susulan menyetel ulang baris yang sama alih-alih
   * menambah baris. Jadi angka ini sekaligus jumlah pesertanya.
   */
  pengerjaan: number;
  selesai: number;
  gugur: number;
  /** Pengerjaan yang timernya MASIH hidup — penghalang penghapusan. */
  berjalan: number;
  jawaban: number;
  pelanggaran: number;
  pilihanProdi: number;
}

export async function jejakRiwayatPaket(packageId: number): Promise<JejakRiwayatPaket | undefined> {
  const p = await one<{ kode: string; nama: string }>(
    "SELECT kode, nama FROM packages WHERE id = ?",
    packageId,
  );
  if (!p) return undefined;

  return {
    kode: p.kode,
    nama: p.nama,
    pengerjaan: await angka("SELECT COUNT(*) AS n FROM attempts WHERE package_id = ?", packageId),
    selesai: await angka(
      "SELECT COUNT(*) AS n FROM attempts WHERE package_id = ? AND status = 'finished'",
      packageId,
    ),
    gugur: await angka(
      "SELECT COUNT(*) AS n FROM attempts WHERE package_id = ? AND status = 'gugur'",
      packageId,
    ),
    // Sama seperti `jejakPeserta`: status 'ongoing' saja TIDAK cukup, karena
    // sesi yang ditinggalkan peserta tetap ongoing selamanya. Yang menandai
    // ujian benar-benar masih hidup adalah timernya — ada subtes yang belum
    // ditutup dan tenggatnya belum lewat.
    berjalan: await angka(
      `SELECT COUNT(*) AS n FROM attempts a
        WHERE a.package_id = ? AND a.status = 'ongoing'
          AND EXISTS (SELECT 1 FROM attempt_subtes s
                       WHERE s.attempt_id = a.id
                         AND s.selesai_at IS NULL
                         AND julianday(s.deadline_at) > julianday('now'))`,
      packageId,
    ),
    jawaban: await angka(
      `SELECT COUNT(*) AS n FROM answers ans
         JOIN attempts a ON a.id = ans.attempt_id
        WHERE a.package_id = ?`,
      packageId,
    ),
    pelanggaran: await angka("SELECT COUNT(*) AS n FROM violations WHERE package_id = ?", packageId),
    pilihanProdi: await angka("SELECT COUNT(*) AS n FROM pilihan_prodi WHERE package_id = ?", packageId),
  };
}

/**
 * Jejak riwayat untuk BANYAK paket sekaligus. DELAPAN query, bukan 8 x N.
 *
 * Halaman daftar paket menggambar satu baris per paket dan memanggil
 * `jejakRiwayatPaket()` untuk tiap barisnya — delapan query per paket, hanya
 * untuk memutuskan apakah tombol "Hapus riwayat" perlu digambar.
 *
 * `julianday(s.deadline_at) > julianday('now')` juga diganti perbandingan
 * `timestamptz` biasa: nilainya sama, tanpa memanggil dua fungsi padanan
 * SQLite (db/03-fungsi-sqlite.sql) untuk setiap baris.
 */
export async function jejakRiwayatPerPaket(
  packageIds: number[],
): Promise<Map<number, JejakRiwayatPaket>> {
  const peta = new Map<number, JejakRiwayatPaket>();
  if (packageIds.length === 0) return peta;

  const hitung = async (sql: string) =>
    new Map(
      (await all<{ package_id: number; n: number }>(sql, packageIds)).map((r) => [r.package_id, r.n]),
    );

  const paket = await all<{ id: number; kode: string; nama: string }>(
    "SELECT id, kode, nama FROM packages WHERE id = ANY(?::int[])",
    packageIds,
  );

  const pengerjaan = await hitung(
    `SELECT package_id, COUNT(*) AS n FROM attempts
      WHERE package_id = ANY(?::int[]) GROUP BY package_id`,
  );
  const perStatus = await all<{ package_id: number; status: string; n: number }>(
    `SELECT package_id, status, COUNT(*) AS n FROM attempts
      WHERE package_id = ANY(?::int[]) GROUP BY package_id, status`,
    packageIds,
  );
  const selesai = new Map(
    perStatus.filter((r) => r.status === "finished").map((r) => [r.package_id, r.n]),
  );
  const gugur = new Map(
    perStatus.filter((r) => r.status === "gugur").map((r) => [r.package_id, r.n]),
  );

  const berjalan = await hitung(
    `SELECT a.package_id, COUNT(*) AS n FROM attempts a
      WHERE a.package_id = ANY(?::int[]) AND a.status = 'ongoing'
        AND EXISTS (SELECT 1 FROM attempt_subtes s
                     WHERE s.attempt_id = a.id
                       AND s.selesai_at IS NULL
                       AND s.deadline_at > now())
      GROUP BY a.package_id`,
  );
  const jawaban = await hitung(
    `SELECT a.package_id, COUNT(*) AS n FROM answers ans
       JOIN attempts a ON a.id = ans.attempt_id
      WHERE a.package_id = ANY(?::int[]) GROUP BY a.package_id`,
  );
  const pelanggaran = await hitung(
    `SELECT package_id, COUNT(*) AS n FROM violations
      WHERE package_id = ANY(?::int[]) GROUP BY package_id`,
  );
  const pilihanProdi = await hitung(
    `SELECT package_id, COUNT(*) AS n FROM pilihan_prodi
      WHERE package_id = ANY(?::int[]) GROUP BY package_id`,
  );

  for (const p of paket) {
    peta.set(p.id, {
      kode: p.kode,
      nama: p.nama,
      pengerjaan: pengerjaan.get(p.id) ?? 0,
      selesai: selesai.get(p.id) ?? 0,
      gugur: gugur.get(p.id) ?? 0,
      berjalan: berjalan.get(p.id) ?? 0,
      jawaban: jawaban.get(p.id) ?? 0,
      pelanggaran: pelanggaran.get(p.id) ?? 0,
      pilihanProdi: pilihanProdi.get(p.id) ?? 0,
    });
  }
  return peta;
}

/**
 * Mengosongkan riwayat pengerjaan satu paket, TANPA menyentuh paket, soal,
 * jadwal, maupun akun pesertanya.
 *
 * Gunanya: paket yang sudah dipakai uji coba — atau tryout yang harus diulang —
 * bisa dikerjakan lagi dari nol. Peserta yang pengerjaannya sudah 'finished'
 * selalu dilempar ke halaman hasil, jadi selama barisnya masih ada ia tidak
 * akan pernah bisa masuk ruang ujian lagi.
 *
 * Yang ikut terhapus lewat `ON DELETE CASCADE` dari `attempts`: `answers`,
 * `results`, `attempt_subtes`, dan `violations`. `pilihan_prodi` TIDAK tergantung
 * pada attempt (diisi sebelum sesi ujian dibuat), jadi dihapus tersendiri dan
 * hanya bila diminta.
 *
 * Dua hal yang sengaja dilakukan sesudah menghapus:
 *
 *   1. KALIBRASI ULANG. `item_params` menyimpan tingkat kesulitan butir yang
 *      dihitung dari peserta yang sudah selesai. Kalau tidak dihitung ulang,
 *      angka dari pengerjaan yang barusan dihapus tetap tertinggal dan ikut
 *      menilai peserta sungguhan nanti. `kalibrasiPaket` menghitung ulang dari
 *      nol: tanpa peserta, seluruh butir kembali netral (b = 0).
 *   2. TIDAK MENYENTUH `susulan`. Izin susulan adalah keputusan pengelola
 *      tentang ORANGNYA, bukan rekam jejak pengerjaan; menghapusnya diam-diam
 *      akan mencabut izin yang baru saja diberikan.
 *
 * Satu pintu dikunci: paket yang SEDANG dikerjakan (ada timer yang masih hidup)
 * tidak boleh dibersihkan — halaman ujian di HP siswa akan mati mendadak tanpa
 * nilai tersimpan. Sesi yang sekadar ditinggalkan tidak menghalangi.
 */
export async function hapusRiwayatPaket(
  packageId: number,
  opsi: { hapusPilihanProdi?: boolean } = {},
): Promise<{ error?: string; jejak?: JejakRiwayatPaket }> {
  const jejak = await jejakRiwayatPaket(packageId);
  if (!jejak) return { error: "Paket tidak ditemukan (mungkin sudah dihapus)." };
  if (jejak.berjalan > 0) {
    return {
      error:
        `Ada ${jejak.berjalan} peserta yang sedang mengerjakan paket ${jejak.kode}. ` +
        "Tunggu sampai selesai — atau gugurkan pengerjaannya lewat halaman Live — sebelum riwayatnya dibersihkan.",
    };
  }
  if (jejak.pengerjaan === 0 && !(opsi.hapusPilihanProdi && jejak.pilihanProdi > 0)) {
    return { error: `Paket ${jejak.kode} belum punya riwayat pengerjaan.` };
  }

  try {
    await tx(async () => {
      await run("DELETE FROM attempts WHERE package_id = ?", packageId);
      if (opsi.hapusPilihanProdi) {
        await run("DELETE FROM pilihan_prodi WHERE package_id = ?", packageId);
      }
    });
    // Di luar transaksi di atas: kalibrasiPaket punya transaksinya sendiri.
    await kalibrasiPaket(packageId);
    return { jejak };
  } catch (e) {
    return { error: pesanGalatDb(e, "Riwayat paket gagal dihapus.") };
  }
}

/* ==========================================================================
   MUTASI - SOAL
   ========================================================================== */

export async function buatSoal(input: InputSoal): Promise<{ id?: number; error?: string }> {
  const galat = validasiSoal(input);
  if (galat.length) return { error: galat.join(" ") };
  try {
    const res = await sisipWajib(
      `INSERT INTO questions (package_id, subtes, nomor, tipe, level, stimulus, pertanyaan,
                              gambar_url, opsi, kunci, pembahasan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      input.package_id,
      input.subtes,
      input.nomor,
      input.tipe,
      input.level,
      input.stimulus.trim() || null,
      input.pertanyaan.trim(),
      input.gambar_url.trim() || null,
      JSON.stringify(input.tipe === "IS" ? [] : input.opsi.map((o) => o.trim())),
      input.kunci,
      input.pembahasan.trim() || null,
    );
    return { id: res };
  } catch (e) {
    return { error: pesanGalatDb(e, "Soal gagal disimpan.") };
  }
}

export async function perbaruiSoal(id: number, input: InputSoal): Promise<{ error?: string }> {
  const galat = validasiSoal(input);
  if (galat.length) return { error: galat.join(" ") };
  try {
    await run(
      `UPDATE questions SET subtes = ?, nomor = ?, tipe = ?, level = ?, stimulus = ?,
              pertanyaan = ?, gambar_url = ?, opsi = ?, kunci = ?, pembahasan = ?
        WHERE id = ?`,
      input.subtes,
      input.nomor,
      input.tipe,
      input.level,
      input.stimulus.trim() || null,
      input.pertanyaan.trim(),
      input.gambar_url.trim() || null,
      JSON.stringify(input.tipe === "IS" ? [] : input.opsi.map((o) => o.trim())),
      input.kunci,
      input.pembahasan.trim() || null,
      id,
    );
    return {};
  } catch (e) {
    return { error: pesanGalatDb(e, "Soal gagal diperbarui.") };
  }
}

export async function hapusSoal(id: number): Promise<{ error?: string }> {
  await run("DELETE FROM questions WHERE id = ?", id);
  return {};
}

/** Tukar nomor satu soal dengan tetangga terdekat pada subtes yang sama. */
export async function geserSoal(id: number, arah: "naik" | "turun"): Promise<{ error?: string }> {
  const soal = await ambilSoal(id);
  if (!soal) return { error: "Soal tidak ditemukan." };
  const tetangga = await one<SoalRow>(
    arah === "naik"
      ? `SELECT * FROM questions WHERE package_id = ? AND subtes = ? AND nomor < ?
          ORDER BY nomor DESC LIMIT 1`
      : `SELECT * FROM questions WHERE package_id = ? AND subtes = ? AND nomor > ?
          ORDER BY nomor ASC LIMIT 1`,
    soal.package_id,
    soal.subtes,
    soal.nomor,
  );
  if (!tetangga) return { error: "Soal sudah berada di ujung daftar." };
  try {
    await tx(async () => {
      await run("UPDATE questions SET nomor = ? WHERE id = ?", -soal.id, soal.id);
      await run("UPDATE questions SET nomor = ? WHERE id = ?", soal.nomor, tetangga.id);
      await run("UPDATE questions SET nomor = ? WHERE id = ?", tetangga.nomor, soal.id);
    });
    return {};
  } catch (e) {
    return { error: pesanGalatDb(e, "Urutan gagal diubah.") };
  }
}

/** Pindahkan satu soal ke nomor tertentu; bila bentrok, nomor ditukar. */
export async function setNomorSoal(id: number, nomor: number): Promise<{ error?: string }> {
  const soal = await ambilSoal(id);
  if (!soal) return { error: "Soal tidak ditemukan." };
  if (!Number.isInteger(nomor) || nomor < 1) return { error: "Nomor harus bilangan bulat minimal 1." };
  const maks = getSubtesApaPun(soal.subtes)?.jumlahSoal ?? 100;
  if (nomor > maks) return { error: `Nomor melebihi kuota subtes (${maks} soal).` };
  if (nomor === soal.nomor) return {};
  const bentrok = await one<SoalRow>(
    "SELECT * FROM questions WHERE package_id = ? AND subtes = ? AND nomor = ?",
    soal.package_id,
    soal.subtes,
    nomor,
  );
  try {
    await tx(async () => {
      await run("UPDATE questions SET nomor = ? WHERE id = ?", -soal.id, soal.id);
      if (bentrok) await run("UPDATE questions SET nomor = ? WHERE id = ?", soal.nomor, bentrok.id);
      await run("UPDATE questions SET nomor = ? WHERE id = ?", nomor, soal.id);
    });
    return {};
  } catch (e) {
    return { error: pesanGalatDb(e, "Nomor gagal diubah.") };
  }
}

/* ==========================================================================
   MUTASI - PESERTA
   ========================================================================== */

/**
 * Mengganti nama tampilan seorang pengguna.
 *
 * `nama_login` sengaja TIDAK ikut diubah: itu kunci masuk siswa lama yang belum
 * punya NISN, dan menggesernya diam-diam akan membuat mereka gagal login tanpa
 * tahu sebabnya. Pengelola tetap bisa membetulkannya lewat impor peserta.
 */
export async function gantiNamaPengguna(id: number, nama: string): Promise<void> {
  await run("UPDATE users SET nama = ? WHERE id = ?", nama.trim().replace(/\s+/g, " "), id);
}

export async function setPeranPengguna(id: number, peran: PeranPengguna): Promise<{ error?: string }> {
  if (peran !== "siswa" && peran !== "admin") return { error: "Peran tidak dikenal." };
  const target = await one<{ role: string }>("SELECT role FROM users WHERE id = ?", id);
  if (!target) return { error: "Pengguna tidak ditemukan." };
  if (target.role === "admin" && peran === "siswa" && await jumlahAdmin() <= 1) {
    return { error: "Minimal harus ada satu admin. Angkat admin lain dulu." };
  }
  await run("UPDATE users SET role = ? WHERE id = ?", peran, id);
  // Peran ikut tersimpan di entri cache sesi; tanpa ini, admin yang baru
  // diturunkan masih membawa peran lamanya sampai entri itu kedaluwarsa.
  await buangSesi(id);
  return {};
}

/* --------------------------------------------------------------------------
   HAPUS AKUN
   -------------------------------------------------------------------------- */

/** Jejak yang ikut lenyap bila sebuah akun dihapus. Dipakai untuk peringatan. */
export interface JejakPeserta {
  nama: string;
  role: PeranPengguna;
  tryout: number;
  tryoutBerjalan: number;
  warung: number;
  warungBerjalan: number;
  pelanggaran: number;
  susulan: number;
}

export async function jejakPeserta(id: number): Promise<JejakPeserta | undefined> {
  const u = await one<{ nama: string; role: PeranPengguna }>(
    "SELECT nama, role FROM users WHERE id = ?",
    id,
  );
  if (!u) return undefined;
  return {
    nama: u.nama,
    role: u.role,
    tryout: await angka("SELECT COUNT(*) AS n FROM attempts WHERE user_id = ?", id),
    // "Berjalan" BUKAN sekadar status 'ongoing'. Sesi yang ditinggalkan peserta
    // tetap berstatus ongoing selamanya — di basis data sungguhan ada sesi
    // seperti itu dari berhari-hari lalu. Kalau status saja yang dipakai,
    // justru akun-akun telantar itulah yang tidak akan pernah bisa dihapus.
    // Yang menandai ujian benar-benar masih hidup adalah TIMER-nya: ada subtes
    // yang belum ditutup dan tenggatnya belum lewat.
    //
    // Perhatikan basis waktunya berbeda dan memang begitu adanya:
    // attempt_subtes.deadline_at ditulis dengan datetime('now') (UTC, lihat
    // mulaiSubtes), sedangkan warung_sesi.deadline_at memakai 'localtime'.
    tryoutBerjalan: await angka(
      `SELECT COUNT(*) AS n FROM attempts a
        WHERE a.user_id = ? AND a.status = 'ongoing'
          AND EXISTS (SELECT 1 FROM attempt_subtes s
                       WHERE s.attempt_id = a.id
                         AND s.selesai_at IS NULL
                         AND julianday(s.deadline_at) > julianday('now'))`,
      id,
    ),
    warung: await angka("SELECT COUNT(*) AS n FROM warung_sesi WHERE user_id = ?", id),
    warungBerjalan: await angka(
      `SELECT COUNT(*) AS n FROM warung_sesi
        WHERE user_id = ? AND status = 'ongoing'
          AND julianday(deadline_at) > julianday('now','localtime')`,
      id,
    ),
    pelanggaran: await angka("SELECT COUNT(*) AS n FROM violations WHERE user_id = ?", id),
    susulan: await angka("SELECT COUNT(*) AS n FROM susulan WHERE user_id = ?", id),
  };
}

/**
 * Menghapus satu akun beserta seluruh rekam jejaknya.
 *
 * Penghapusannya PERMANEN dan mengandalkan `ON DELETE CASCADE`: pengerjaan
 * tryout, jawaban, hasil, sesi Warung, catatan pelanggaran, izin susulan, dan
 * pilihan prodi ikut terhapus. Tidak ada tong sampah — sebelum membersihkan
 * banyak akun sekaligus, salin dulu `data/adzkia.db` seperti berkas cadangan
 * yang sudah ada di folder itu.
 *
 * Tiga pintu yang sengaja dikunci:
 *   1. Akun sendiri, supaya pengelola tidak mengunci dirinya sendiri di luar.
 *   2. Admin terakhir, dengan alasan yang sama seperti `setPeranPengguna`.
 *   3. Peserta yang SEDANG mengerjakan ujian — timernya masih berjalan, lihat
 *      `jejakPeserta`. Menghapusnya di tengah tryout membuat halaman ujian di HP
 *      siswa mati mendadak tanpa nilai tersimpan; lebih baik pengelola menunggu
 *      selesai atau menggugurkannya lebih dulu. Sesi yang sekadar ditinggalkan
 *      (tenggatnya sudah lewat) TIDAK menghalangi penghapusan.
 */
export async function hapusPengguna(id: number, adminId: number): Promise<{ error?: string; jejak?: JejakPeserta }> {
  const jejak = await jejakPeserta(id);
  if (!jejak) return { error: "Akun tidak ditemukan (mungkin sudah dihapus)." };
  if (id === adminId) return { error: "Kamu tidak bisa menghapus akunmu sendiri." };
  if (jejak.role === "admin" && await jumlahAdmin() <= 1) {
    return { error: "Minimal harus ada satu admin. Angkat admin lain dulu." };
  }
  if (jejak.tryoutBerjalan > 0 || jejak.warungBerjalan > 0) {
    return {
      error: `${jejak.nama} sedang mengerjakan ujian. Tunggu sampai selesai — atau gugurkan pengerjaannya lewat halaman Live — sebelum akunnya dihapus.`,
    };
  }
  try {
    await run("DELETE FROM users WHERE id = ?", id);
    // Akun yang sudah tidak ada tidak boleh tetap lolos dari cache sesi.
    await buangSesi(id);
    return { jejak };
  } catch (e) {
    return { error: pesanGalatDb(e, "Akun gagal dihapus.") };
  }
}
