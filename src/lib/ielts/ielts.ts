import "server-only";

import { all, one, run, tx, sisipWajib} from "@/lib/core/db";
import {
  BOBOT_WRITING,
  KODE_SUBTES_IELTS,
  SUBTES_IELTS,
  amanMenit,
  amanNilaiKriteria,
  bulatkanBand,
  keSubtesIelts,
  kriteriaSubtes,
  menitBawaan,
  subtesIelts,
  subtesSebelum,
  type MenitSubtes,
  type StatusPaketIelts,
  type SubtesIeltsKode,
  type TipeSoalIelts,
} from "@/lib/ielts/ielts-konstanta";

export * from "@/lib/ielts/ielts-konstanta";

/**
 * Mesin ujian IELTS — bank soal, timer per subtes, dan penilaian band.
 *
 * Berdiri sendiri di atas tabel `ielts_*` (lihat alasannya di `db.ts`). Semua
 * keputusan waktu diambil dari jam SQLite, bukan jam peramban: menutup halaman,
 * mengganti jam komputer, atau membuka ujian di perangkat lain tidak menambah
 * satu detik pun.
 *
 * Bagian dari fitur LANGUAGE SKILL yang masih dibangun, jadi seluruh halaman
 * yang memanggilnya dijaga `wajibFiturLanguage()` — di server sekolah tidak ada
 * satu pun jalan yang sampai ke sini.
 */

/** Gagal yang pesannya boleh ditunjukkan apa adanya kepada pengguna. */
export class GagalIelts extends Error {}

/* ==========================================================================
   BENTUK BARIS
   ========================================================================== */

export interface PaketIelts {
  id: number;
  kode: string;
  nama: string;
  deskripsi: string | null;
  status: StatusPaketIelts;
  mulai_at: string | null;
  selesai_at: string | null;
  created_at: string;
  /**
   * Lama pengerjaan tiap subtes, dalam menit. NULL berarti "pakai bawaan" —
   * lihat `menitPaket()`. Jangan dibaca langsung; paket lama seluruhnya NULL.
   */
  menit_listening: number | null;
  menit_reading: number | null;
  menit_writing: number | null;
  menit_speaking: number | null;
  /**
   * 1 = siswa boleh membuka lembar pembahasan sesudah subtesnya tutup.
   *
   * Kembar dengan `packages.tampil_pembahasan` di jalur UTBK/SKD, dan memang
   * harus kembar: pengelola yang menahan pembahasan tryout pada hari-H
   * mengharapkan tuas yang sama ada di IELTS.
   */
  tampil_pembahasan: number;
}

export interface SeksiIelts {
  id: number;
  paket_id: number;
  subtes: SubtesIeltsKode;
  nomor: number;
  judul: string | null;
  instruksi: string | null;
  audio_url: string | null;
  audio_nama: string | null;
  bacaan: string | null;
  /** Naskah rekaman Listening. Tidak pernah dikirim ke peserta. */
  transkrip: string | null;
}

export interface SoalIelts {
  id: number;
  paket_id: number;
  seksi_id: number | null;
  subtes: SubtesIeltsKode;
  nomor: number;
  tipe: TipeSoalIelts;
  pertanyaan: string;
  opsi: string;
  kunci: string;
  catatan: string | null;
}

export interface PengerjaanIelts {
  id: number;
  user_id: number;
  paket_id: number;
  /** `gugur` sejak skema v21 — lihat `ielts-penjagaan.ts`. */
  status: "ongoing" | "finished" | "gugur";
  setuju_at: string | null;
  started_at: string;
  finished_at: string | null;
  /* v21: penjagaan ujian. Bentuknya kembar dengan `attempts`. */
  subtes_aktif: string | null;
  digugurkan_at: string | null;
  alasan_gugur: string | null;
  denyut_at: string | null;
  denyut_aktif: number;
  ronde: number;
}

/* ==========================================================================
   KUNCI PORTAL IELTS
   --------------------------------------------------------------------------
   Memakai tabel `pengaturan` dengan pola kunci yang sama persis seperti portal
   UTBK dan SKD (`portal_terkunci_<jalur>`), tetapi TIDAK didaftarkan ke
   `portal.ts`. Alasannya satu: daftar di sana ikut dirender halaman depan dan
   panel portal yang hidup di server sekolah, sedangkan IELTS harus tak terlihat
   di sana. Begitu fiturnya diizinkan terbit, memindahkannya cukup menambah
   'ielts' ke JALUR_PORTAL.
   ========================================================================== */

const KUNCI_PORTAL = "portal_terkunci_ielts";

export interface StatusPortalIelts {
  terkunci: boolean;
  diperbaruiAt: string | null;
  olehNama: string | null;
}

export async function statusPortalIelts(): Promise<StatusPortalIelts> {
  const r = await one<{ nilai: string; diperbarui_at: string; nama: string | null }>(
    `SELECT p.nilai, p.diperbarui_at, u.nama
       FROM pengaturan p
       LEFT JOIN users u ON u.id = p.diperbarui_oleh
      WHERE p.kunci = ?`,
    KUNCI_PORTAL,
  );
  return {
    terkunci: r?.nilai === "1",
    diperbaruiAt: r?.diperbarui_at ?? null,
    olehNama: r?.nama ?? null,
  };
}

export async function setPortalIelts(terkunci: boolean, adminId: number): Promise<void> {
  await run(
    `INSERT INTO pengaturan (kunci, nilai, diperbarui_at, diperbarui_oleh)
     VALUES (?, ?, datetime('now'), ?)
     ON CONFLICT (kunci) DO UPDATE SET
       nilai           = excluded.nilai,
       diperbarui_at   = excluded.diperbarui_at,
       diperbarui_oleh = excluded.diperbarui_oleh`,
    KUNCI_PORTAL,
    terkunci ? "1" : "0",
    adminId,
  );
}

/* ==========================================================================
   PAKET (admin)
   ========================================================================== */

export async function semuaPaket(): Promise<PaketIelts[]> {
  return await all<PaketIelts>("SELECT * FROM ielts_paket ORDER BY created_at DESC, id DESC");
}

export async function paketById(id: number): Promise<PaketIelts | undefined> {
  return await one<PaketIelts>("SELECT * FROM ielts_paket WHERE id = ?", id);
}

/** Kode paket dibakukan: huruf besar, spasi jadi tanda hubung. */
function rapikanKode(kode: string): string {
  return kode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function buatPaket(data: { kode: string; nama: string; deskripsi?: string }): Promise<number> {
  const kode = rapikanKode(data.kode);
  const nama = data.nama.trim();
  if (!kode) throw new GagalIelts("Kode paket wajib diisi.");
  if (!nama) throw new GagalIelts("Nama paket wajib diisi.");
  if (await one("SELECT id FROM ielts_paket WHERE kode = ?", kode)) {
    throw new GagalIelts(`Kode "${kode}" sudah dipakai paket lain.`);
  }

  return await tx(async () => {
    const r = await sisipWajib(
      "INSERT INTO ielts_paket (kode, nama, deskripsi) VALUES (?, ?, ?)",
      kode,
      nama,
      data.deskripsi?.trim() || null,
    );
    const id = r;
    // Bagian-bagiannya dibuat sekaligus supaya admin langsung menemukan
    // "Recording 1-4" dan "Passage 1-3" siap diisi, bukan halaman kosong.
    for (const s of SUBTES_IELTS) await pastikanSeksi(id, s.kode);
    return id;
  });
}

export async function ubahPaket(
  id: number,
  data: { nama: string; deskripsi?: string; mulai_at?: string; selesai_at?: string },
): Promise<void> {
  const nama = data.nama.trim();
  if (!nama) throw new GagalIelts("Nama paket wajib diisi.");
  await run(
    `UPDATE ielts_paket
        SET nama = ?, deskripsi = ?, mulai_at = ?, selesai_at = ?
      WHERE id = ?`,
    nama,
    data.deskripsi?.trim() || null,
    data.mulai_at?.trim() || null,
    data.selesai_at?.trim() || null,
    id,
  );
}

/**
 * Membuka atau menahan lembar pembahasan paket ini.
 *
 * Disimpan sebagai 0/1 supaya bentuknya persis sama dengan jalur tryout —
 * satu kebiasaan membaca untuk dua jalur.
 */
export async function setPembahasanPaket(id: number, tampil: boolean): Promise<void> {
  await run("UPDATE ielts_paket SET tampil_pembahasan = ? WHERE id = ?", tampil ? 1 : 0, id);
}

export interface JejakRiwayatIelts {
  kode: string;
  nama: string;
  pengerjaan: number;
  selesai: number;
  gugur: number;
  /** Pengerjaan yang timernya BENAR-BENAR masih berjalan. */
  berjalan: number;
  jawaban: number;
  pelanggaran: number;
  nilaiGuru: number;
}

const angkaIelts = async (sql: string, ...arg: unknown[]): Promise<number> =>
  (await one<{ n: number }>(sql, ...arg))?.n ?? 0;

/* --------------------------------------------------------------------------
   RINGKASAN BANYAK PAKET SEKALIGUS
   --------------------------------------------------------------------------
   Halaman daftar paket IELTS menggambar satu kartu untuk tiap paket, dan tiap
   kartu butuh dua hal: ringkasan kesiapan subtesnya dan jejak riwayatnya.

   Dipanggil per paket, keduanya berharga sekitar SEMBILAN query - tiga untuk
   ringkasan, enam untuk jejak. Pada sepuluh paket itu 90 query untuk satu
   halaman yang, pada dasarnya, cuma menghitung.

   Kedua fungsi di bawah mengambilnya dengan GROUP BY: jumlah querynya TETAP
   berapa pun banyak paketnya.
   -------------------------------------------------------------------------- */

/** Ringkasan kesiapan subtes untuk BANYAK paket. TIGA query, bukan 3 x N. */
export async function ringkasPerPaket(
  paketIds: number[],
): Promise<Map<number, RingkasSubtes[]>> {
  const peta = new Map<number, RingkasSubtes[]>();
  if (paketIds.length === 0) return peta;

  const soal = await all<{ paket_id: number; subtes: string; n: number }>(
    `SELECT paket_id, subtes, COUNT(*) AS n FROM ielts_soal
      WHERE paket_id = ANY(?::int[]) GROUP BY paket_id, subtes`,
    paketIds,
  );
  const audio = await all<{ paket_id: number; subtes: string; n: number }>(
    `SELECT paket_id, subtes, COUNT(*) AS n FROM ielts_seksi
      WHERE paket_id = ANY(?::int[])
        AND audio_url IS NOT NULL AND TRIM(audio_url) <> ''
      GROUP BY paket_id, subtes`,
    paketIds,
  );
  // Menit dibaca dari baris paketnya sendiri — satu query untuk semuanya,
  // menggantikan `menitPaket(id)` yang membaca satu baris per paket.
  const baris = await all<PaketIelts>(
    "SELECT * FROM ielts_paket WHERE id = ANY(?::int[])",
    paketIds,
  );
  const petaPaket = new Map(baris.map((p) => [p.id, p]));

  const kunci = (id: number, subtes: string) => `${id}:${subtes}`;
  const petaSoal = new Map(soal.map((r) => [kunci(r.paket_id, r.subtes), r.n]));
  const petaAudio = new Map(audio.map((r) => [kunci(r.paket_id, r.subtes), r.n]));

  for (const id of paketIds) {
    const menit = await menitPaket(petaPaket.get(id));
    peta.set(
      id,
      SUBTES_IELTS.map((s) => {
        const terisi = petaSoal.get(kunci(id, s.kode)) ?? 0;
        const audioTerisi = petaAudio.get(kunci(id, s.kode)) ?? 0;
        return {
          kode: s.kode,
          nama: s.nama,
          menit: menit[s.kode],
          target: s.jumlahSoal,
          terisi,
          audioTerisi,
          jumlahSeksi: s.jumlahSeksi,
          pakaiAudio: s.pakaiAudio,
          siap: terisi >= s.jumlahSoal && (!s.pakaiAudio || audioTerisi >= s.jumlahSeksi),
        };
      }),
    );
  }
  return peta;
}

/** Jejak riwayat untuk BANYAK paket. ENAM query, bukan 6 x N. */
export async function jejakRiwayatPerPaket(
  paketIds: number[],
): Promise<Map<number, JejakRiwayatIelts>> {
  const peta = new Map<number, JejakRiwayatIelts>();
  if (paketIds.length === 0) return peta;

  const hitung = async (sql: string) =>
    new Map(
      (await all<{ paket_id: number; n: number }>(sql, paketIds)).map((r) => [r.paket_id, r.n]),
    );

  const paket = await all<{ id: number; kode: string; nama: string }>(
    "SELECT id, kode, nama FROM ielts_paket WHERE id = ANY(?::int[])",
    paketIds,
  );

  const pengerjaan = await hitung(
    `SELECT paket_id, COUNT(*) AS n FROM ielts_pengerjaan
      WHERE paket_id = ANY(?::int[]) GROUP BY paket_id`,
  );
  const perStatus = await all<{ paket_id: number; status: string; n: number }>(
    `SELECT paket_id, status, COUNT(*) AS n FROM ielts_pengerjaan
      WHERE paket_id = ANY(?::int[]) GROUP BY paket_id, status`,
    paketIds,
  );
  const selesai = new Map(perStatus.filter((r) => r.status === "finished").map((r) => [r.paket_id, r.n]));
  const gugur = new Map(perStatus.filter((r) => r.status === "gugur").map((r) => [r.paket_id, r.n]));

  // Status `ongoing` saja TIDAK cukup — sesi yang ditinggalkan peserta tetap
  // ongoing selamanya. Yang menandai ujian benar-benar masih hidup adalah
  // TIMERNYA: ada subtes yang belum ditutup dan tenggatnya belum lewat.
  const berjalan = await hitung(
    `SELECT p.paket_id, COUNT(*) AS n FROM ielts_pengerjaan p
      WHERE p.paket_id = ANY(?::int[]) AND p.status = 'ongoing'
        AND EXISTS (SELECT 1 FROM ielts_subtes s
                     WHERE s.pengerjaan_id = p.id
                       AND s.selesai_at IS NULL
                       AND s.deadline_at > now())
      GROUP BY p.paket_id`,
  );
  const jawaban = await hitung(
    `SELECT p.paket_id, COUNT(*) AS n FROM ielts_jawaban j
       JOIN ielts_pengerjaan p ON p.id = j.pengerjaan_id
      WHERE p.paket_id = ANY(?::int[]) GROUP BY p.paket_id`,
  );
  const pelanggaran = await hitung(
    `SELECT paket_id, COUNT(*) AS n FROM ielts_pelanggaran
      WHERE paket_id = ANY(?::int[]) GROUP BY paket_id`,
  );
  const nilaiGuru = await hitung(
    `SELECT p.paket_id, COUNT(*) AS n FROM ielts_nilai_guru g
       JOIN ielts_pengerjaan p ON p.id = g.pengerjaan_id
      WHERE p.paket_id = ANY(?::int[]) GROUP BY p.paket_id`,
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
      nilaiGuru: nilaiGuru.get(p.id) ?? 0,
    });
  }
  return peta;
}

/** Apa saja yang akan hilang bila riwayat paket ini dibersihkan. */
export async function jejakRiwayatIelts(paketId: number): Promise<JejakRiwayatIelts | undefined> {
  const p = await one<{ kode: string; nama: string }>(
    "SELECT kode, nama FROM ielts_paket WHERE id = ?",
    paketId,
  );
  if (!p) return undefined;

  return {
    kode: p.kode,
    nama: p.nama,
    pengerjaan: await angkaIelts(
      "SELECT COUNT(*) AS n FROM ielts_pengerjaan WHERE paket_id = ?",
      paketId,
    ),
    selesai: await angkaIelts(
      "SELECT COUNT(*) AS n FROM ielts_pengerjaan WHERE paket_id = ? AND status = 'finished'",
      paketId,
    ),
    gugur: await angkaIelts(
      "SELECT COUNT(*) AS n FROM ielts_pengerjaan WHERE paket_id = ? AND status = 'gugur'",
      paketId,
    ),
    // Status `ongoing` saja TIDAK cukup — sesi yang ditinggalkan peserta tetap
    // ongoing selamanya. Yang menandai ujian benar-benar masih hidup adalah
    // TIMERNYA: ada subtes yang belum ditutup dan tenggatnya belum lewat.
    // Aturan yang sama dipakai `jejakRiwayatPaket()` di jalur UTBK.
    berjalan: await angkaIelts(
      `SELECT COUNT(*) AS n FROM ielts_pengerjaan p
        WHERE p.paket_id = ? AND p.status = 'ongoing'
          AND EXISTS (SELECT 1 FROM ielts_subtes s
                       WHERE s.pengerjaan_id = p.id
                         AND s.selesai_at IS NULL
                         AND julianday(s.deadline_at) > julianday('now'))`,
      paketId,
    ),
    jawaban: await angkaIelts(
      `SELECT COUNT(*) AS n FROM ielts_jawaban j
         JOIN ielts_pengerjaan p ON p.id = j.pengerjaan_id
        WHERE p.paket_id = ?`,
      paketId,
    ),
    pelanggaran: await angkaIelts(
      "SELECT COUNT(*) AS n FROM ielts_pelanggaran WHERE paket_id = ?",
      paketId,
    ),
    nilaiGuru: await angkaIelts(
      `SELECT COUNT(*) AS n FROM ielts_nilai_guru g
         JOIN ielts_pengerjaan p ON p.id = g.pengerjaan_id
        WHERE p.paket_id = ?`,
      paketId,
    ),
  };
}

/**
 * Mengosongkan riwayat pengerjaan satu paket IELTS — TANPA menyentuh paketnya,
 * soalnya, rekamannya, jadwalnya, maupun akun pesertanya.
 *
 * Padanan `hapusRiwayatPaket()` di jalur UTBK, termasuk penolakannya: paket
 * yang PESERTANYA MASIH MENGERJAKAN tidak boleh dibersihkan. Menghapus baris
 * pengerjaan di tengah ujian membuat halaman siswa kehilangan pijakannya pada
 * detik berikutnya, dan tidak ada jalan memulihkannya.
 *
 * Satu perintah DELETE sudah cukup: `ielts_subtes`, `ielts_jawaban`,
 * `ielts_nilai_guru`, dan `ielts_pelanggaran` seluruhnya menunjuk
 * `ielts_pengerjaan(id)` dengan ON DELETE CASCADE. Dibungkus transaksi supaya
 * kegagalan di tengah jalan tidak meninggalkan separuh riwayat.
 *
 * TIDAK ADA hitung ulang sesudahnya, dan itu memang tidak perlu: band IELTS
 * tidak pernah disimpan — ia dihitung dari jawaban tiap kali dibaca — sehingga
 * tidak ada kalibrasi yang bisa basi, tidak seperti IRT di jalur UTBK.
 */
export async function hapusRiwayatIelts(
  paketId: number,
): Promise<{ error?: string; jejak?: JejakRiwayatIelts }> {
  const jejak = await jejakRiwayatIelts(paketId);
  if (!jejak) return { error: "Paket IELTS tidak ditemukan (mungkin sudah dihapus)." };
  if (jejak.berjalan > 0) {
    return {
      error:
        `Ada ${jejak.berjalan} peserta yang sedang mengerjakan paket ${jejak.kode}. ` +
        "Tunggu sampai selesai — atau hentikan ujiannya lewat Keamanan Ujian — " +
        "sebelum riwayatnya dibersihkan.",
    };
  }
  if (jejak.pengerjaan === 0) {
    return { error: `Paket ${jejak.kode} belum punya riwayat pengerjaan.` };
  }

  try {
    await tx(async () => {
      await run("DELETE FROM ielts_pengerjaan WHERE paket_id = ?", paketId);
    });
    return { jejak };
  } catch {
    return { error: "Riwayat paket IELTS gagal dihapus." };
  }
}

export async function setStatusPaket(id: number, status: StatusPaketIelts): Promise<void> {
  await run("UPDATE ielts_paket SET status = ? WHERE id = ?", status, id);
}

export async function hapusPaket(id: number): Promise<void> {
  await run("DELETE FROM ielts_paket WHERE id = ?", id);
}

/* ==========================================================================
   LAMA PENGERJAAN PER PAKET
   --------------------------------------------------------------------------
   Angka di `SUBTES_IELTS` tinggal menjadi BAWAAN. Yang berlaku saat ujian
   dibuka selalu yang dipulangkan `menitPaket()`, supaya pengelola bisa membuat
   paket latihan berdurasi lain — termasuk mengacaknya — tanpa menyentuh berkas
   sumber, dan tanpa mengubah waktu paket yang sudah pernah dikerjakan siswa.
   ========================================================================== */

const KOLOM_MENIT: Record<SubtesIeltsKode, keyof PaketIelts> = {
  LISTENING: "menit_listening",
  READING: "menit_reading",
  WRITING: "menit_writing",
  SPEAKING: "menit_speaking",
};

/**
 * Lama pengerjaan keempat subtes untuk satu paket.
 *
 * Kolom yang NULL — paket lama, atau subtes yang sengaja dibiarkan — jatuh ke
 * angka bawaan. Nilai di luar batas yang masuk akal juga dijatuhkan ke bawaan
 * daripada dipercaya: baris basis data bisa saja disunting dari luar aplikasi.
 */
export async function menitPaket(paket: PaketIelts | number | undefined): Promise<MenitSubtes> {
  const p = typeof paket === "number" ? await paketById(paket) : paket;
  const bawaan = menitBawaan();
  if (!p) return bawaan;

  const hasil = { ...bawaan };
  for (const s of SUBTES_IELTS) {
    const nilai = p[KOLOM_MENIT[s.kode]] as number | null | undefined;
    if (nilai == null) continue;
    hasil[s.kode] = amanMenit(nilai, bawaan[s.kode]);
  }
  return hasil;
}

/** Menyimpan keempat angka sekaligus. Nilai tak masuk akal dijepit lebih dulu. */
export async function setMenitPaket(id: number, menit: Partial<MenitSubtes>): Promise<void> {
  const bawaan = menitBawaan();
  const nilai = SUBTES_IELTS.map((s) =>
    menit[s.kode] == null ? null : amanMenit(menit[s.kode], bawaan[s.kode]),
  );
  await run(
    `UPDATE ielts_paket
        SET menit_listening = ?, menit_reading = ?, menit_writing = ?, menit_speaking = ?
      WHERE id = ?`,
    nilai[0],
    nilai[1],
    nilai[2],
    nilai[3],
    id,
  );
}

/** Mengembalikan paket ke waktu bawaan — keempat kolomnya dikosongkan. */
export async function resetMenitPaket(id: number): Promise<void> {
  await run(
    `UPDATE ielts_paket
        SET menit_listening = NULL, menit_reading = NULL, menit_writing = NULL, menit_speaking = NULL
      WHERE id = ?`,
    id,
  );
}

/* ==========================================================================
   SEKSI — Recording / Passage / Task / Part
   ========================================================================== */

/**
 * Memastikan baris seksi 1..n untuk satu subtes sudah ada, lalu memulangkannya.
 *
 * Barisnya dibuat kosong lebih dulu (bukan saat admin menekan "tambah") karena
 * jumlahnya memang tetap: Listening selalu empat rekaman, Reading selalu tiga
 * bacaan. Halaman admin tinggal menampilkan kotak yang menunggu diisi.
 */
export async function pastikanSeksi(paketId: number, subtes: SubtesIeltsKode): Promise<SeksiIelts[]> {
  const def = subtesIelts(subtes);
  if (!def) throw new GagalIelts("Subtes tidak dikenal.");

  const ada = new Set(
    (await all<{ nomor: number }>(
      "SELECT nomor FROM ielts_seksi WHERE paket_id = ? AND subtes = ?",
      paketId,
      subtes,
    )).map((r) => r.nomor),
  );
  for (let n = 1; n <= def.jumlahSeksi; n++) {
    if (!ada.has(n)) {
      await run(
        "INSERT INTO ielts_seksi (paket_id, subtes, nomor, judul) VALUES (?, ?, ?, ?)",
        paketId,
        subtes,
        n,
        `${def.labelSeksi} ${n}`,
      );
    }
  }
  return await seksiSubtes(paketId, subtes);
}

export async function seksiSubtes(paketId: number, subtes: SubtesIeltsKode): Promise<SeksiIelts[]> {
  return await all<SeksiIelts>(
    "SELECT * FROM ielts_seksi WHERE paket_id = ? AND subtes = ? ORDER BY nomor",
    paketId,
    subtes,
  );
}

/* --------------------------------------------------------------------------
   SELURUH SUBTES SEKALIGUS
   --------------------------------------------------------------------------
   `seksiSubtes()` dan `soalSubtes()` di atas mengambil SATU subtes, dan itu
   benar untuk halaman yang memang hanya menampilkan satu.

   Halaman pratinjau dan simulasi pengelola menampilkan KEEMPATNYA, dan
   memanggil keduanya di dalam `KODE_SUBTES_IELTS.map(...)` - delapan query
   untuk satu halaman, padahal keempat subtes itu milik paket yang SAMA dan
   bisa diambil dalam satu perjalanan.

   Empat iterasi memang bukan N+1 yang meledak seperti papan peringkat; yang
   diperbaiki di sini adalah polanya. Perulangan yang memanggil query per
   satuan adalah bentuk yang akan tumbuh menjadi masalah begitu jumlah
   subtesnya bertambah, dan menuliskannya begini sekarang jauh lebih murah
   daripada menemukannya lagi nanti.
   -------------------------------------------------------------------------- */

/** Mengelompokkan baris menurut kolom `subtes`-nya. */
function perSubtes<T extends { subtes: string }>(baris: T[]): Map<SubtesIeltsKode, T[]> {
  const peta = new Map<SubtesIeltsKode, T[]>();
  for (const k of KODE_SUBTES_IELTS) peta.set(k, []);
  for (const r of baris) {
    const k = keSubtesIelts(r.subtes);
    if (k) peta.get(k)?.push(r);
  }
  return peta;
}

/** Seluruh seksi satu paket, dikelompokkan per subtes. SATU query. */
export async function seksiPerSubtes(paketId: number): Promise<Map<SubtesIeltsKode, SeksiIelts[]>> {
  return perSubtes(
    await all<SeksiIelts>(
      "SELECT * FROM ielts_seksi WHERE paket_id = ? ORDER BY subtes, nomor",
      paketId,
    ),
  );
}

/** Seluruh butir satu paket, dikelompokkan per subtes. SATU query. */
export async function soalPerSubtes(paketId: number): Promise<Map<SubtesIeltsKode, SoalIelts[]>> {
  return perSubtes(
    await all<SoalIelts>(
      "SELECT * FROM ielts_soal WHERE paket_id = ? ORDER BY subtes, nomor",
      paketId,
    ),
  );
}

/**
 * Seperti `soalPerSubtes()`, tetapi HANYA kolom yang boleh dilihat peserta.
 *
 * `kunci` dan `pembahasan` sengaja TIDAK diambil. Itu bukan penghematan byte:
 * halaman simulasi memakai komponen ruang ujian yang sama dengan yang dipakai
 * peserta sungguhan, dan apa pun yang masuk ke propsnya ikut terkirim ke
 * peramban di dalam payload RSC - termasuk yang tidak pernah dirender.
 */
export async function soalPesertaPerSubtes(
  paketId: number,
): Promise<Map<SubtesIeltsKode, SoalPeserta[]>> {
  const baris = await all<{
    subtes: string;
    id: number;
    nomor: number;
    tipe: TipeSoalIelts;
    pertanyaan: string;
    opsi: string;
    seksi_id: number | null;
  }>(
    `SELECT subtes, id, nomor, tipe, pertanyaan, opsi, seksi_id
       FROM ielts_soal WHERE paket_id = ? ORDER BY subtes, nomor`,
    paketId,
  );

  const peta = new Map<SubtesIeltsKode, SoalPeserta[]>();
  for (const k of KODE_SUBTES_IELTS) peta.set(k, []);
  for (const r of baris) {
    const k = keSubtesIelts(r.subtes);
    if (!k) continue;
    peta.get(k)?.push({
      id: r.id,
      nomor: r.nomor,
      tipe: r.tipe,
      pertanyaan: r.pertanyaan,
      opsi: amanOpsi(r.opsi),
      seksiId: r.seksi_id,
    });
  }
  return peta;
}

export async function seksiById(id: number): Promise<SeksiIelts | undefined> {
  return await one<SeksiIelts>("SELECT * FROM ielts_seksi WHERE id = ?", id);
}

export async function simpanSeksi(
  id: number,
  data: { judul?: string; instruksi?: string; bacaan?: string; transkrip?: string },
): Promise<void> {
  await run(
    "UPDATE ielts_seksi SET judul = ?, instruksi = ?, bacaan = ?, transkrip = ? WHERE id = ?",
    data.judul?.trim() || null,
    data.instruksi?.trim() || null,
    data.bacaan?.trim() || null,
    data.transkrip?.trim() || null,
    id,
  );
}

export async function pasangAudio(seksiId: number, url: string, nama: string): Promise<void> {
  await run("UPDATE ielts_seksi SET audio_url = ?, audio_nama = ? WHERE id = ?", url, nama, seksiId);
}

/**
 * Melepas rekaman dari sebuah bagian.
 *
 * Berkasnya sendiri TIDAK dihapus dari disk — namanya cap sidik jari isinya,
 * jadi rekaman yang sama bisa dipakai paket lain. Berkas yatim jauh lebih murah
 * daripada Listening yang bisu di tengah ujian; pertimbangan yang sama dipakai
 * gambar soal.
 */
export async function lepasAudio(seksiId: number): Promise<void> {
  await run("UPDATE ielts_seksi SET audio_url = NULL, audio_nama = NULL WHERE id = ?", seksiId);
}

/* ==========================================================================
   SOAL (admin)
   ========================================================================== */

export async function soalSubtes(paketId: number, subtes: SubtesIeltsKode): Promise<SoalIelts[]> {
  return await all<SoalIelts>(
    "SELECT * FROM ielts_soal WHERE paket_id = ? AND subtes = ? ORDER BY nomor",
    paketId,
    subtes,
  );
}

export async function soalById(id: number): Promise<SoalIelts | undefined> {
  return await one<SoalIelts>("SELECT * FROM ielts_soal WHERE id = ?", id);
}

/** Nomor kosong pertama pada subtes ini. */
export async function nomorBerikut(paketId: number, subtes: SubtesIeltsKode): Promise<number> {
  const r = await one<{ n: number | null }>(
    "SELECT MAX(nomor) AS n FROM ielts_soal WHERE paket_id = ? AND subtes = ?",
    paketId,
    subtes,
  );
  return (r?.n ?? 0) + 1;
}

/** Nomor yang sudah terpakai di satu subtes — dipakai impor naskah. */
export async function nomorTerpakai(paketId: number, subtes: SubtesIeltsKode): Promise<Set<number>> {
  return new Set(
    (await all<{ nomor: number }>(
      "SELECT nomor FROM ielts_soal WHERE paket_id = ? AND subtes = ?",
      paketId,
      subtes,
    )).map((r) => r.nomor),
  );
}

/** Pertanyaan yang sudah ada di satu subtes, apa adanya. */
export async function pertanyaanSubtes(paketId: number, subtes: SubtesIeltsKode): Promise<string[]> {
  return (await all<{ pertanyaan: string }>(
    "SELECT pertanyaan FROM ielts_soal WHERE paket_id = ? AND subtes = ?",
    paketId,
    subtes,
  )).map((r) => r.pertanyaan);
}

/** Menimpa satu butir berdasarkan nomornya. Dipakai impor mode "timpa". */
export async function timpaSoalNomor(
  paketId: number,
  subtes: SubtesIeltsKode,
  data: DataSoal,
): Promise<boolean> {
  const lama = await one<{ id: number }>(
    "SELECT id FROM ielts_soal WHERE paket_id = ? AND subtes = ? AND nomor = ?",
    paketId,
    subtes,
    data.nomor,
  );
  if (!lama) return false;
  await ubahSoal(lama.id, data);
  return true;
}

export interface DataSoal {
  seksiId: number | null;
  nomor: number;
  tipe: TipeSoalIelts;
  pertanyaan: string;
  opsi: string[];
  kunci: string;
  catatan?: string;
}

function periksaSoal(data: DataSoal): void {
  if (!data.pertanyaan.trim()) throw new GagalIelts("Pertanyaan wajib diisi.");
  if (!Number.isInteger(data.nomor) || data.nomor < 1) {
    throw new GagalIelts("Nomor soal harus bilangan mulai dari 1.");
  }
  if (data.tipe === "PG") {
    const isi = data.opsi.filter((o) => o.trim());
    if (isi.length < 2) throw new GagalIelts("Soal pilihan ganda butuh minimal dua pilihan.");
    if (!data.kunci.trim()) throw new GagalIelts("Kunci jawaban wajib diisi.");
  }
  if (data.tipe === "TFNG" && !data.kunci.trim()) {
    throw new GagalIelts("Pilih TRUE, FALSE, atau NOT GIVEN sebagai kunci.");
  }
  if (data.tipe === "IS" && !data.kunci.trim()) {
    throw new GagalIelts("Isian singkat butuh kunci jawaban.");
  }
  // ESAI sengaja tidak diperiksa kuncinya: Writing dan Speaking dinilai guru.
}

export async function simpanSoal(paketId: number, subtes: SubtesIeltsKode, data: DataSoal): Promise<number> {
  periksaSoal(data);
  const bentrok = await one<{ id: number }>(
    "SELECT id FROM ielts_soal WHERE paket_id = ? AND subtes = ? AND nomor = ?",
    paketId,
    subtes,
    data.nomor,
  );
  if (bentrok) throw new GagalIelts(`Nomor ${data.nomor} sudah terpakai di subtes ini.`);

  const r = await sisipWajib(
    `INSERT INTO ielts_soal (paket_id, seksi_id, subtes, nomor, tipe, pertanyaan, opsi, kunci, catatan)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    paketId,
    data.seksiId,
    subtes,
    data.nomor,
    data.tipe,
    data.pertanyaan.trim(),
    JSON.stringify(data.tipe === "PG" ? data.opsi.filter((o) => o.trim()) : []),
    data.kunci.trim(),
    data.catatan?.trim() || null,
  );
  return r;
}

export async function ubahSoal(id: number, data: DataSoal): Promise<void> {
  periksaSoal(data);
  const lama = await soalById(id);
  if (!lama) throw new GagalIelts("Soal tidak ditemukan.");

  const bentrok = await one<{ id: number }>(
    "SELECT id FROM ielts_soal WHERE paket_id = ? AND subtes = ? AND nomor = ? AND id <> ?",
    lama.paket_id,
    lama.subtes,
    data.nomor,
    id,
  );
  if (bentrok) throw new GagalIelts(`Nomor ${data.nomor} sudah terpakai di subtes ini.`);

  await run(
    `UPDATE ielts_soal
        SET seksi_id = ?, nomor = ?, tipe = ?, pertanyaan = ?, opsi = ?, kunci = ?, catatan = ?
      WHERE id = ?`,
    data.seksiId,
    data.nomor,
    data.tipe,
    data.pertanyaan.trim(),
    JSON.stringify(data.tipe === "PG" ? data.opsi.filter((o) => o.trim()) : []),
    data.kunci.trim(),
    data.catatan?.trim() || null,
    id,
  );
}

export async function hapusSoal(id: number): Promise<void> {
  await run("DELETE FROM ielts_soal WHERE id = ?", id);
}

export interface RingkasSubtes {
  kode: SubtesIeltsKode;
  nama: string;
  menit: number;
  target: number;
  terisi: number;
  /** Bagian yang sudah punya rekaman; hanya berarti untuk Listening. */
  audioTerisi: number;
  jumlahSeksi: number;
  pakaiAudio: boolean;
  siap: boolean;
}

/** Kelengkapan satu paket, subtes demi subtes — dipakai panel admin. */
export async function ringkasPaket(paketId: number): Promise<RingkasSubtes[]> {
  const soal = await all<{ subtes: string; n: number }>(
    "SELECT subtes, COUNT(*) AS n FROM ielts_soal WHERE paket_id = ? GROUP BY subtes",
    paketId,
  );
  const audio = await all<{ subtes: string; n: number }>(
    `SELECT subtes, COUNT(*) AS n FROM ielts_seksi
      WHERE paket_id = ? AND audio_url IS NOT NULL AND TRIM(audio_url) <> ''
      GROUP BY subtes`,
    paketId,
  );
  const petaSoal = new Map(soal.map((r) => [r.subtes, r.n]));
  const petaAudio = new Map(audio.map((r) => [r.subtes, r.n]));
  const menit = await menitPaket(paketId);

  return SUBTES_IELTS.map((s) => {
    const terisi = petaSoal.get(s.kode) ?? 0;
    const audioTerisi = petaAudio.get(s.kode) ?? 0;
    return {
      kode: s.kode,
      nama: s.nama,
      menit: menit[s.kode],
      target: s.jumlahSoal,
      terisi,
      audioTerisi,
      jumlahSeksi: s.jumlahSeksi,
      pakaiAudio: s.pakaiAudio,
      siap: terisi >= s.jumlahSoal && (!s.pakaiAudio || audioTerisi >= s.jumlahSeksi),
    };
  });
}

/* ==========================================================================
   SISI PESERTA
   ========================================================================== */

/**
 * Paket yang boleh dikerjakan siswa saat ini: berstatus terbit DAN berada di
 * dalam jendela waktunya. Jendela yang dikosongkan berarti "tidak dibatasi",
 * sama seperti paket tryout.
 */
export async function paketTersedia(): Promise<PaketIelts[]> {
  return await all<PaketIelts>(
    `SELECT * FROM ielts_paket
      WHERE status = 'published'
        AND (mulai_at   IS NULL OR mulai_at   <= now())
        AND (selesai_at IS NULL OR selesai_at >= now())
      ORDER BY created_at DESC`,
  );
}

export async function pengerjaan(userId: number, paketId: number): Promise<PengerjaanIelts | undefined> {
  return await one<PengerjaanIelts>(
    "SELECT * FROM ielts_pengerjaan WHERE user_id = ? AND paket_id = ?",
    userId,
    paketId,
  );
}

export async function pengerjaanById(id: number): Promise<PengerjaanIelts | undefined> {
  return await one<PengerjaanIelts>("SELECT * FROM ielts_pengerjaan WHERE id = ?", id);
}

/** Pengerjaan yang sedang berjalan milik siswa ini, bila ada. */
export async function pengerjaanBerjalan(userId: number): Promise<PengerjaanIelts | undefined> {
  return await one<PengerjaanIelts>(
    `SELECT * FROM ielts_pengerjaan
      WHERE user_id = ? AND status = 'ongoing'
      ORDER BY started_at DESC LIMIT 1`,
    userId,
  );
}

/**
 * Pengerjaan TERAKHIR milik siswa ini apa pun statusnya — termasuk yang sudah
 * `gugur`.
 *
 * Dipakai halaman yang harus MENAMPILKAN sebab pengguguran, bukan menyembunyikan
 * pengerjaannya: `pengerjaanBerjalan()` sengaja hanya melihat yang `ongoing`,
 * sehingga peserta yang dihentikan akan terlempar ke halaman jalur tanpa pernah
 * membaca apa yang terjadi padanya.
 */
export async function pengerjaanTerakhir(userId: number): Promise<PengerjaanIelts | undefined> {
  return await one<PengerjaanIelts>(
    "SELECT * FROM ielts_pengerjaan WHERE user_id = ? ORDER BY started_at DESC LIMIT 1",
    userId,
  );
}

/** Membuat baris pengerjaan bila belum ada. Belum berarti sudah setuju aturan. */
export async function mulaiPengerjaan(userId: number, paketId: number): Promise<PengerjaanIelts> {
  const ada = await pengerjaan(userId, paketId);
  if (ada) return ada;

  const paket = await paketById(paketId);
  if (!paket) throw new GagalIelts("Paket tidak ditemukan.");
  if (paket.status !== "published") throw new GagalIelts("Paket ini belum dibuka pengelola.");

  await run("INSERT INTO ielts_pengerjaan (user_id, paket_id) VALUES (?, ?)", userId, paketId);
  return (await pengerjaan(userId, paketId))!;
}

/**
 * Mencatat persetujuan tata tertib.
 *
 * Disimpan sebagai waktu, bukan sekadar tanda centang, supaya kalau kelak ada
 * sengketa ("saya tidak pernah membaca aturannya") ada jam yang bisa ditunjuk.
 */
export async function setujuiRules(userId: number, paketId: number): Promise<PengerjaanIelts> {
  const p = await mulaiPengerjaan(userId, paketId);
  if (!p.setuju_at) {
    await run("UPDATE ielts_pengerjaan SET setuju_at = datetime('now') WHERE id = ?", p.id);
  }
  return (await pengerjaanById(p.id))!;
}

export interface StatusSubtes {
  kode: SubtesIeltsKode;
  nama: string;
  menit: number;
  jumlahSoal: number;
  ringkas: string;
  /**
   * terkunci — subtes sebelumnya belum tuntas
   * kosong   — soalnya belum diisi pengelola
   * siap     — boleh dibuka
   * berjalan — timernya sudah menyala
   * selesai  — sudah ditutup atau waktunya habis
   */
  keadaan: "terkunci" | "kosong" | "siap" | "berjalan" | "selesai";
  sisaDetik: number;
  terjawab: number;
}

/** Papan pilih subtes: keadaan keempat subtes untuk satu pengerjaan. */
export async function statusSemuaSubtes(p: PengerjaanIelts): Promise<StatusSubtes[]> {
  await tutupYangHabis(p.id);

  const jumlahSoal = new Map(
    (await all<{ subtes: string; n: number }>(
      "SELECT subtes, COUNT(*) AS n FROM ielts_soal WHERE paket_id = ? GROUP BY subtes",
      p.paket_id,
    )).map((r) => [r.subtes, r.n]),
  );
  const baris = new Map(
    (await all<{ subtes: string; selesai_at: string | null }>(
      "SELECT subtes, selesai_at FROM ielts_subtes WHERE pengerjaan_id = ?",
      p.id,
    )).map((r) => [r.subtes, r]),
  );
  const dijawab = new Map(
    (await all<{ subtes: string; n: number }>(
      `SELECT s.subtes AS subtes, COUNT(*) AS n
         FROM ielts_jawaban j
         JOIN ielts_soal s ON s.id = j.soal_id
        WHERE j.pengerjaan_id = ? AND j.jawaban IS NOT NULL AND TRIM(j.jawaban) <> ''
        GROUP BY s.subtes`,
      p.id,
    )).map((r) => [r.subtes, r.n]),
  );

  const menit = await menitPaket(p.paket_id);

  return await Promise.all(SUBTES_IELTS.map(async (s) => {
    const n = jumlahSoal.get(s.kode) ?? 0;
    const b = baris.get(s.kode);
    const sebelum = subtesSebelum(s.kode);
    const sebelumnyaTuntas = !sebelum || Boolean(baris.get(sebelum.kode)?.selesai_at);

    let keadaan: StatusSubtes["keadaan"];
    if (b?.selesai_at) keadaan = "selesai";
    else if (b) keadaan = "berjalan";
    else if (!sebelumnyaTuntas) keadaan = "terkunci";
    else if (n === 0) keadaan = "kosong";
    else keadaan = "siap";

    return {
      kode: s.kode,
      nama: s.nama,
      menit: menit[s.kode],
      jumlahSoal: n,
      ringkas: s.ringkas,
      keadaan,
      sisaDetik: keadaan === "berjalan" ? await sisaDetik(p.id, s.kode) : 0,
      terjawab: dijawab.get(s.kode) ?? 0,
    };
  }));
}

/** Menutup sendiri subtes yang tenggatnya sudah lewat. */
export async function tutupYangHabis(pengerjaanId: number): Promise<void> {
  await run(
    `UPDATE ielts_subtes
        SET selesai_at = deadline_at
      WHERE pengerjaan_id = ?
        AND selesai_at IS NULL
        AND julianday(deadline_at) <= julianday('now')`,
    pengerjaanId,
  );
}

export async function sisaDetik(pengerjaanId: number, subtes: SubtesIeltsKode): Promise<number> {
  const r = await one<{ sisa: number }>(
    `SELECT CAST(ROUND((julianday(deadline_at) - julianday('now')) * 86400.0) AS INTEGER) AS sisa
       FROM ielts_subtes
      WHERE pengerjaan_id = ? AND subtes = ? AND selesai_at IS NULL`,
    pengerjaanId,
    subtes,
  );
  return Math.max(0, r?.sisa ?? 0);
}

/**
 * Membuka satu subtes dan menyalakan timernya.
 *
 * Tiga penjaga, semuanya di server: aturan harus sudah disetujui, subtes
 * sebelumnya harus sudah tuntas, dan soalnya harus ada. Urutan subtes memang
 * ditampilkan berurut di layar, tetapi alamatnya bisa diketik langsung.
 */
export async function bukaSubtes(p: PengerjaanIelts, subtes: SubtesIeltsKode): Promise<void> {
  const def = subtesIelts(subtes);
  if (!def) throw new GagalIelts("Subtes tidak dikenal.");
  if (!p.setuju_at) throw new GagalIelts("Kamu belum menyetujui tata tertib ujian.");
  if (p.status !== "ongoing") throw new GagalIelts("Ujian ini sudah selesai.");

  await tutupYangHabis(p.id);
  const ada = await one<{ id: number }>(
    "SELECT id FROM ielts_subtes WHERE pengerjaan_id = ? AND subtes = ?",
    p.id,
    subtes,
  );
  if (ada) {
    // Sudah pernah dibuka — timernya jalan terus, tidak diulang. Penandanya
    // tetap diperbarui supaya pelanggaran tercatat di subtes yang benar.
    await run("UPDATE ielts_pengerjaan SET subtes_aktif = ? WHERE id = ?", subtes, p.id);
    return;
  }

  const sebelum = subtesSebelum(subtes);
  if (sebelum) {
    const tuntas = await one<{ selesai_at: string | null }>(
      "SELECT selesai_at FROM ielts_subtes WHERE pengerjaan_id = ? AND subtes = ?",
      p.id,
      sebelum.kode,
    );
    if (!tuntas?.selesai_at) {
      throw new GagalIelts(`Selesaikan ${sebelum.nama} lebih dulu sebelum membuka ${def.nama}.`);
    }
  }

  const jumlah = await one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM ielts_soal WHERE paket_id = ? AND subtes = ?",
    p.paket_id,
    subtes,
  );
  if ((jumlah?.n ?? 0) === 0) {
    throw new GagalIelts(`Soal ${def.nama} belum diisi pengelola.`);
  }

  // Menitnya diambil dari PAKET, bukan dari konstanta: satu paket boleh punya
  // waktunya sendiri, dan tenggat ini dihitung sekali di sini untuk selamanya.
  // Pengelola yang mengubah waktu paket di tengah ujian tidak menggeser tenggat
  // siswa yang subtesnya sudah menyala — persis seperti yang dikehendaki.
  const menit = (await menitPaket(p.paket_id))[subtes];

  await run(
    `INSERT INTO ielts_subtes (pengerjaan_id, subtes, mulai_at, deadline_at)
     VALUES (?, ?, datetime('now'), datetime('now', ?))`,
    p.id,
    subtes,
    `+${menit} minutes`,
  );

  // Penjagaan menuliskan subtes ini pada tiap baris pelanggaran. Peramban
  // memang ikut mengirimkannya, tetapi muatan permintaan bukan sumber
  // kebenaran: pengawas harus bisa mempercayai kolom itu.
  await run("UPDATE ielts_pengerjaan SET subtes_aktif = ? WHERE id = ?", subtes, p.id);
}

export async function subtesBerjalan(
  pengerjaanId: number,
  subtes: SubtesIeltsKode,
): Promise<{ mulai_at: string; deadline_at: string; selesai_at: string | null } | undefined> {
  return await one(
    "SELECT mulai_at, deadline_at, selesai_at FROM ielts_subtes WHERE pengerjaan_id = ? AND subtes = ?",
    pengerjaanId,
    subtes,
  );
}

/** Soal untuk peserta — tanpa kolom kunci, supaya tidak pernah sampai peramban. */
export interface SoalPeserta {
  id: number;
  nomor: number;
  tipe: TipeSoalIelts;
  pertanyaan: string;
  opsi: string[];
  seksiId: number | null;
}

export async function soalUntukPeserta(paketId: number, subtes: SubtesIeltsKode): Promise<SoalPeserta[]> {
  return (await all<{
    id: number;
    nomor: number;
    tipe: TipeSoalIelts;
    pertanyaan: string;
    opsi: string;
    seksi_id: number | null;
  }>(
    "SELECT id, nomor, tipe, pertanyaan, opsi, seksi_id FROM ielts_soal WHERE paket_id = ? AND subtes = ? ORDER BY nomor",
    paketId,
    subtes,
  )).map((r) => ({
    id: r.id,
    nomor: r.nomor,
    tipe: r.tipe,
    pertanyaan: r.pertanyaan,
    opsi: amanOpsi(r.opsi),
    seksiId: r.seksi_id,
  }));
}

function amanOpsi(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

export async function jawabanTersimpan(
  pengerjaanId: number,
  subtes: SubtesIeltsKode,
): Promise<Record<number, string>> {
  const rows = await all<{ soal_id: number; jawaban: string | null }>(
    `SELECT j.soal_id, j.jawaban
       FROM ielts_jawaban j
       JOIN ielts_soal s ON s.id = j.soal_id
      WHERE j.pengerjaan_id = ? AND s.subtes = ?`,
    pengerjaanId,
    subtes,
  );
  const peta: Record<number, string> = {};
  for (const r of rows) if (r.jawaban) peta[r.soal_id] = r.jawaban;
  return peta;
}

/**
 * Menyimpan satu jawaban.
 *
 * Ditolak bila subtesnya belum dibuka atau waktunya sudah habis — pemeriksaan
 * ini yang membuat timer server berarti; tanpanya, halaman yang dibiarkan
 * terbuka masih bisa mengirim jawaban satu jam sesudah waktunya lewat.
 */
export async function simpanJawaban(
  p: PengerjaanIelts,
  soalId: number,
  jawaban: string,
): Promise<void> {
  const soal = await soalById(soalId);
  if (!soal || soal.paket_id !== p.paket_id) throw new GagalIelts("Soal tidak ditemukan.");
  // Ujian yang DIHENTIKAN tidak menerima jawaban lagi, apa pun yang dikirim
  // peramban. Layar merah bisa ditutup dengan alat pengembang; baris ini tidak.
  if (p.status !== "ongoing") throw new GagalIelts("Ujian ini sudah dihentikan.");

  await tutupYangHabis(p.id);
  const s = await subtesBerjalan(p.id, soal.subtes);
  if (!s) throw new GagalIelts("Subtes ini belum dibuka.");
  if (s.selesai_at) throw new GagalIelts("Waktu subtes ini sudah habis.");

  await run(
    `INSERT INTO ielts_jawaban (pengerjaan_id, soal_id, jawaban, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT (pengerjaan_id, soal_id) DO UPDATE SET
       jawaban    = excluded.jawaban,
       updated_at = excluded.updated_at`,
    p.id,
    soalId,
    jawaban,
  );
}

/** Menutup subtes atas kemauan peserta. Tidak bisa dibuka lagi. */
export async function selesaikanSubtes(p: PengerjaanIelts, subtes: SubtesIeltsKode): Promise<void> {
  await run(
    `UPDATE ielts_subtes SET selesai_at = datetime('now')
      WHERE pengerjaan_id = ? AND subtes = ? AND selesai_at IS NULL`,
    p.id,
    subtes,
  );
  // Tidak ada subtes yang sedang dikerjakan lagi sampai peserta membuka yang
  // berikutnya. Jeda di papan subtes bukan bagian dari ujian mana pun.
  await run("UPDATE ielts_pengerjaan SET subtes_aktif = NULL WHERE id = ?", p.id);

  // Keempat subtes tuntas → pengerjaannya ikut ditutup.
  const belum = await one<{ n: number }>(
    `SELECT COUNT(*) AS n FROM ielts_subtes
      WHERE pengerjaan_id = ? AND selesai_at IS NULL`,
    p.id,
  );
  const sudah = await one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM ielts_subtes WHERE pengerjaan_id = ?",
    p.id,
  );
  if ((belum?.n ?? 0) === 0 && (sudah?.n ?? 0) >= KODE_SUBTES_IELTS.length) {
    await run(
      "UPDATE ielts_pengerjaan SET status = 'finished', finished_at = datetime('now') WHERE id = ?",
      p.id,
    );
  }
}

/* ==========================================================================
   PENILAIAN — band 0-9
   ========================================================================== */

/**
 * Tabel konversi resmi skor mentah (0-40) ke band IELTS.
 *
 * Listening dan Academic Reading memakai tabel yang BERBEDA: Reading akademik
 * menuntut jawaban benar lebih banyak untuk band yang sama. Angkanya mengikuti
 * konversi yang diterbitkan IELTS untuk latihan resmi.
 */
const BAND_LISTENING: [number, number][] = [
  [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6],
  [18, 5.5], [16, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5],
];

const BAND_READING: [number, number][] = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6],
  [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5],
];

export function bandDariBenar(subtes: SubtesIeltsKode, benar: number): number {
  const tabel = subtes === "READING" ? BAND_READING : BAND_LISTENING;
  for (const [minimal, band] of tabel) if (benar >= minimal) return band;
  return 0;
}

/** Membakukan isian singkat sebelum dibandingkan: huruf kecil, spasi rapi. */
function bakukan(teks: string): string {
  return teks.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,;:!?]+$/, "");
}

/** true bila jawaban peserta cocok dengan salah satu kunci yang sah. */
export function jawabanBenar(tipe: TipeSoalIelts, kunci: string, jawaban: string): boolean {
  if (!jawaban.trim()) return false;
  if (tipe === "ESAI") return false; // dinilai guru, bukan mesin
  const sah = kunci.split("|").map(bakukan).filter(Boolean);
  return sah.includes(bakukan(jawaban));
}

/* --------------------------------------------------------------------------
   Nilai guru — Writing & Speaking
   --------------------------------------------------------------------------
   Writing dinilai PER TASK karena Task 2 berbobot dua kali Task 1; Speaking
   dinilai SEKALI untuk seluruh wawancara, persis seperti IELTS asli yang
   memberi satu set empat kriteria untuk keseluruhan Speaking, bukan per part.
   Itulah sebabnya `bagianNilai()` memulangkan [1, 2] untuk Writing dan [0]
   untuk Speaking.
   -------------------------------------------------------------------------- */

export interface NilaiGuru {
  pengerjaan_id: number;
  subtes: SubtesIeltsKode;
  bagian: number;
  /** kode kriteria -> angka 0-9. */
  nilai: Record<string, number>;
  catatan: string | null;
  oleh_nama: string | null;
  diperbarui_at: string;
  /** Band bagian ini: rata-rata keempat kriteria, dibulatkan. null bila belum lengkap. */
  band: number | null;
}

/** Bagian yang perlu dinilai guru pada satu subtes. */
export function bagianNilai(subtes: SubtesIeltsKode): number[] {
  return subtes === "WRITING" ? [1, 2] : [0];
}

/** Sebutan satu bagian di layar penilaian. */
export function labelBagianNilai(subtes: SubtesIeltsKode, bagian: number): string {
  return subtes === "WRITING" ? `Task ${bagian}` : "Speaking";
}

/**
 * Band satu bagian: rata-rata keempat kriteria, dibulatkan ke setengah band.
 *
 * Memulangkan null bila ada kriteria yang belum diisi — band setengah jadi
 * lebih menyesatkan daripada tidak ada band sama sekali.
 */
function bandKriteria(subtes: SubtesIeltsKode, nilai: Record<string, number>): number | null {
  const kriteria = kriteriaSubtes(subtes);
  const angka = kriteria.map((k) => nilai[k.kode]);
  if (angka.some((a) => typeof a !== "number" || !Number.isFinite(a))) return null;
  return bulatkanBand(angka.reduce((n, a) => n + a, 0) / angka.length);
}

function bacaNilaiJson(mentah: string): Record<string, number> {
  try {
    const v = JSON.parse(mentah);
    if (!v || typeof v !== "object") return {};
    const hasil: Record<string, number> = {};
    for (const [k, n] of Object.entries(v as Record<string, unknown>)) {
      const aman = amanNilaiKriteria(n);
      if (aman !== null) hasil[k] = aman;
    }
    return hasil;
  } catch {
    return {};
  }
}

/** Seluruh penilaian guru pada satu pengerjaan. */
export async function nilaiGuruPengerjaan(pengerjaanId: number): Promise<NilaiGuru[]> {
  return (await all<{
    pengerjaan_id: number;
    subtes: string;
    bagian: number;
    nilai: string;
    catatan: string | null;
    oleh_nama: string | null;
    diperbarui_at: string;
  }>(
    `SELECT g.pengerjaan_id, g.subtes, g.bagian, g.nilai, g.catatan,
            u.nama AS oleh_nama, g.diperbarui_at
       FROM ielts_nilai_guru g
       LEFT JOIN users u ON u.id = g.oleh
      WHERE g.pengerjaan_id = ?
      ORDER BY g.subtes, g.bagian`,
    pengerjaanId,
  )).map((r) => {
    const subtes = (keSubtesIelts(r.subtes) ?? "WRITING") as SubtesIeltsKode;
    const nilai = bacaNilaiJson(r.nilai);
    return {
      pengerjaan_id: r.pengerjaan_id,
      subtes,
      bagian: r.bagian,
      nilai,
      catatan: r.catatan,
      oleh_nama: r.oleh_nama,
      diperbarui_at: r.diperbarui_at,
      band: bandKriteria(subtes, nilai),
    };
  });
}

/**
 * Menyimpan penilaian guru untuk satu bagian.
 *
 * Kriteria yang dikosongkan guru TIDAK disimpan sebagai nol — ia hilang dari
 * JSON, dan bagiannya kembali berstatus "belum lengkap". Nol adalah band yang
 * sah di IELTS ("tidak mengerjakan"), jadi ia tidak boleh dipakai untuk
 * menandai isian kosong.
 */
export async function simpanNilaiGuru(
  pengerjaanId: number,
  subtes: SubtesIeltsKode,
  bagian: number,
  nilai: Record<string, unknown>,
  catatan: string | null,
  adminId: number,
): Promise<void> {
  if (subtes !== "WRITING" && subtes !== "SPEAKING") {
    throw new GagalIelts("Hanya Writing dan Speaking yang dinilai guru.");
  }
  if (!bagianNilai(subtes).includes(bagian)) {
    throw new GagalIelts("Bagian yang dinilai tidak dikenal.");
  }
  if (!await pengerjaanById(pengerjaanId)) throw new GagalIelts("Pengerjaan tidak ditemukan.");

  const bersih: Record<string, number> = {};
  for (const k of kriteriaSubtes(subtes)) {
    const aman = amanNilaiKriteria(nilai[k.kode]);
    if (aman !== null) bersih[k.kode] = aman;
  }

  await run(
    `INSERT INTO ielts_nilai_guru (pengerjaan_id, subtes, bagian, nilai, catatan, oleh, diperbarui_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT (pengerjaan_id, subtes, bagian) DO UPDATE SET
       nilai         = excluded.nilai,
       catatan       = excluded.catatan,
       oleh          = excluded.oleh,
       diperbarui_at = excluded.diperbarui_at`,
    pengerjaanId,
    subtes,
    bagian,
    JSON.stringify(bersih),
    catatan?.trim() || null,
    adminId,
  );
}

export async function hapusNilaiGuru(pengerjaanId: number, subtes: SubtesIeltsKode, bagian: number): Promise<void> {
  await run(
    "DELETE FROM ielts_nilai_guru WHERE pengerjaan_id = ? AND subtes = ? AND bagian = ?",
    pengerjaanId,
    subtes,
    bagian,
  );
}

/**
 * Band satu subtes yang dinilai guru.
 *
 * Writing menggabungkan kedua task dengan bobot 1 : 2 seperti IELTS asli.
 * Kalau baru satu task yang dinilai, bobotnya dinormalkan ulang atas task yang
 * sudah ada — bukan dianggap nol — supaya guru bisa menilai bertahap dan angka
 * sementaranya tetap masuk akal.
 */
export function bandSubtesGuru(subtes: SubtesIeltsKode, semua: NilaiGuru[]): number | null {
  const milik = semua.filter((n) => n.subtes === subtes && n.band !== null);
  if (milik.length === 0) return null;

  if (subtes !== "WRITING") return milik[0].band;

  let jumlah = 0;
  let bobotTotal = 0;
  for (const n of milik) {
    const bobot = BOBOT_WRITING[n.bagian] ?? 1;
    jumlah += (n.band ?? 0) * bobot;
    bobotTotal += bobot;
  }
  return bobotTotal === 0 ? null : bulatkanBand(jumlah / bobotTotal);
}

export interface HasilSubtes {
  kode: SubtesIeltsKode;
  nama: string;
  jumlahSoal: number;
  benar: number;
  salah: number;
  kosong: number;
  /** Band 0-9. Untuk Writing/Speaking baru terisi setelah guru menilai. */
  band: number | null;
  dinilaiGuru: boolean;
  /**
   * true bila subtes ini MEMANG diujikan pada paket ini.
   *
   * Tidak setiap paket memuat keempat subtes: paket TryOut 11 September 2026,
   * misalnya, hanya Listening dan Reading. Subtes yang tidak diujikan berbeda
   * sama sekali dari subtes yang MENUNGGU nilai guru — yang pertama tidak akan
   * pernah datang, yang kedua datang beberapa hari lagi — dan menyamakan
   * keduanya membuat halaman hasil menjanjikan sesuatu yang tidak ada.
   */
  diujikan: boolean;
  /** Rincian penilaian guru — kosong untuk Listening dan Reading. */
  rincianGuru: NilaiGuru[];
}

export async function hasilPengerjaan(p: PengerjaanIelts): Promise<HasilSubtes[]> {
  const soal = await all<SoalIelts>(
    "SELECT * FROM ielts_soal WHERE paket_id = ? ORDER BY subtes, nomor",
    p.paket_id,
  );
  const jawaban = new Map(
    (await all<{ soal_id: number; jawaban: string | null }>(
      "SELECT soal_id, jawaban FROM ielts_jawaban WHERE pengerjaan_id = ?",
      p.id,
    )).map((r) => [r.soal_id, r.jawaban ?? ""]),
  );

  const nilaiGuru = await nilaiGuruPengerjaan(p.id);

  // Perhitungannya sendiri ada di `nilaiSatuPengerjaan()`, dipakai bersama
  // jalur batch — lihat blok "PENILAIAN BANYAK PENGERJAAN SEKALIGUS".
  return nilaiSatuPengerjaan(soal, jawaban, nilaiGuru);
}

/* ==========================================================================
   PENILAIAN BANYAK PENGERJAAN SEKALIGUS
   --------------------------------------------------------------------------
   `hasilPengerjaan()` di atas menilai SATU pengerjaan dengan tiga query, dan
   itu wajar untuk halaman hasil seorang peserta.

   Yang TIDAK wajar adalah memanggilnya di dalam perulangan. Papan peringkat
   dan papan Live melakukannya untuk setiap peserta paket:

       1 query  daftar peserta
       + 4 query x N peserta   (pengerjaanById + soal + jawaban + nilai guru)

   Pada satu angkatan 300 peserta itu 1.201 query untuk SATU halaman — dan
   salah satu dari empat query itu, daftar soal paket, MEMULANGKAN BARIS YANG
   SAMA PERSIS setiap kali.

   Kedua fungsi di bawah mengambil semuanya sekaligus, sehingga jumlah query
   TETAP berapa pun banyak pesertanya:

       1 query  daftar peserta   (milik pemanggil)
       1 query  soal paket       (dipakai bersama seluruh peserta)
       1 query  seluruh jawaban
       1 query  seluruh nilai guru
       = 4 query, bukan 1.201

   Aturan penilaiannya TIDAK berubah sedikit pun — perhitungannya dipisah ke
   `nilaiSatuPengerjaan()` supaya jalur satuan dan jalur batch memakai kode
   yang sama persis, bukan dua salinan yang bisa berbeda diam-diam.
   ========================================================================== */

/** Nilai guru untuk BANYAK pengerjaan sekaligus, dikelompokkan per pengerjaan. */
export async function nilaiGuruBanyak(
  pengerjaanIds: number[],
): Promise<Map<number, NilaiGuru[]>> {
  const peta = new Map<number, NilaiGuru[]>();
  for (const id of pengerjaanIds) peta.set(id, []);
  if (pengerjaanIds.length === 0) return peta;

  const baris = await all<{
    pengerjaan_id: number;
    subtes: string;
    bagian: number;
    nilai: string;
    catatan: string | null;
    oleh_nama: string | null;
    diperbarui_at: string;
  }>(
    `SELECT g.pengerjaan_id, g.subtes, g.bagian, g.nilai, g.catatan,
            u.nama AS oleh_nama, g.diperbarui_at
       FROM ielts_nilai_guru g
       LEFT JOIN users u ON u.id = g.oleh
      WHERE g.pengerjaan_id = ANY(?::int[])
      ORDER BY g.pengerjaan_id, g.subtes, g.bagian`,
    pengerjaanIds,
  );

  for (const r of baris) {
    const subtes = (keSubtesIelts(r.subtes) ?? "WRITING") as SubtesIeltsKode;
    const nilai = bacaNilaiJson(r.nilai);
    peta.get(r.pengerjaan_id)?.push({
      pengerjaan_id: r.pengerjaan_id,
      subtes,
      bagian: r.bagian,
      nilai,
      catatan: r.catatan,
      oleh_nama: r.oleh_nama,
      diperbarui_at: r.diperbarui_at,
      band: bandKriteria(subtes, nilai),
    });
  }
  return peta;
}

/**
 * Inti perhitungan satu pengerjaan, tanpa menyentuh basis data.
 *
 * Dipakai jalur satuan MAUPUN jalur batch. Memisahkannya ke sini adalah cara
 * memastikan keduanya tidak pernah berbeda: aturan band, aturan "diujikan",
 * dan perlakuan terhadap butir kosong hanya ditulis SEKALI.
 */
function nilaiSatuPengerjaan(
  soalPaket: SoalIelts[],
  jawaban: Map<number, string>,
  nilaiGuru: NilaiGuru[],
): HasilSubtes[] {
  return SUBTES_IELTS.map((s) => {
    const butir = soalPaket.filter((x) => x.subtes === s.kode);
    let benar = 0;
    let kosong = 0;
    for (const b of butir) {
      const j = jawaban.get(b.id) ?? "";
      if (!j.trim()) kosong++;
      else if (jawabanBenar(b.tipe, b.kunci, j)) benar++;
    }
    const dinilaiGuru = s.kode === "WRITING" || s.kode === "SPEAKING";
    const punyaNilaiGuru = nilaiGuru.some((n) => n.subtes === s.kode);
    return {
      kode: s.kode,
      nama: s.nama,
      jumlahSoal: butir.length,
      benar,
      salah: butir.length - benar - kosong,
      kosong,
      band: dinilaiGuru ? bandSubtesGuru(s.kode, nilaiGuru) : bandDariBenar(s.kode, benar),
      dinilaiGuru,
      // Sudah ada nilai guru pun berarti diujikan, walau butirnya nol: guru yang
      // menilai Speaking dari wawancara langsung tidak selalu memasukkan
      // soalnya ke aplikasi lebih dulu.
      diujikan: butir.length > 0 || punyaNilaiGuru,
      rincianGuru: dinilaiGuru ? nilaiGuru.filter((n) => n.subtes === s.kode) : [],
    };
  });
}

/**
 * Hasil BANYAK pengerjaan dari SATU paket, dalam tiga query.
 *
 * Seluruh pengerjaan harus berasal dari `paketId` yang sama — itulah yang
 * membuat daftar soalnya bisa dipakai bersama. Pengerjaan dari paket lain yang
 * ikut terkirim akan dinilai memakai soal paket ini, jadi pemanggil wajib
 * menyaringnya lebih dulu; seluruh pemanggil hari ini memang sudah bekerja
 * per paket.
 */
export async function hasilPengerjaanBanyak(
  paketId: number,
  pengerjaanIds: number[],
): Promise<Map<number, HasilSubtes[]>> {
  const peta = new Map<number, HasilSubtes[]>();
  if (pengerjaanIds.length === 0) return peta;

  // (1) Soal paket — SEKALI, dipakai seluruh peserta.
  const soalPaket = await all<SoalIelts>(
    "SELECT * FROM ielts_soal WHERE paket_id = ? ORDER BY subtes, nomor",
    paketId,
  );

  // (2) Seluruh jawaban seluruh peserta.
  const jawabanBaris = await all<{ pengerjaan_id: number; soal_id: number; jawaban: string | null }>(
    `SELECT pengerjaan_id, soal_id, jawaban
       FROM ielts_jawaban
      WHERE pengerjaan_id = ANY(?::int[])`,
    pengerjaanIds,
  );
  const jawabanPer = new Map<number, Map<number, string>>();
  for (const id of pengerjaanIds) jawabanPer.set(id, new Map());
  for (const r of jawabanBaris) {
    jawabanPer.get(r.pengerjaan_id)?.set(r.soal_id, r.jawaban ?? "");
  }

  // (3) Seluruh nilai guru seluruh peserta.
  const guruPer = await nilaiGuruBanyak(pengerjaanIds);

  for (const id of pengerjaanIds) {
    peta.set(
      id,
      nilaiSatuPengerjaan(
        soalPaket,
        jawabanPer.get(id) ?? new Map(),
        guruPer.get(id) ?? [],
      ),
    );
  }
  return peta;
}

/**
 * Band keseluruhan: rata-rata band keempat subtes, dibulatkan menurut aturan
 * IELTS (lihat `bulatkanBand`).
 *
 * Subtes yang belum punya band — Writing/Speaking yang belum dinilai guru, atau
 * subtes yang soalnya belum diisi pengelola — TIDAK dihitung sebagai nol; ia
 * ditinggalkan, dan `bandLengkap()` yang memberi tahu bahwa angkanya masih
 * sementara. Menghitung yang kosong sebagai nol akan menampilkan band 3,0
 * kepada siswa yang sebenarnya mengerjakan dengan baik.
 */
export function bandKeseluruhan(hasil: HasilSubtes[]): number | null {
  const ada = hasil.filter((h) => h.band !== null && h.diujikan);
  if (ada.length === 0) return null;
  const rata = ada.reduce((n, h) => n + (h.band ?? 0), 0) / ada.length;
  return bulatkanBand(rata);
}

/** true bila keempat subtes sudah punya band — barulah band keseluruhan final. */
/**
 * Band keseluruhan sudah final?
 *
 * Yang dihitung hanya subtes yang MEMANG DIUJIKAN pada paket ini. Paket yang
 * sengaja hanya berisi Listening dan Reading karena itu menghasilkan band final
 * begitu keduanya selesai — bukan "band sementara" yang menunggu Writing dan
 * Speaking yang tidak akan pernah datang.
 */
export function bandLengkap(hasil: HasilSubtes[]): boolean {
  const diuji = hasil.filter((h) => h.diujikan);
  return diuji.length > 0 && diuji.every((h) => h.band !== null);
}

/** Subtes yang DIUJIKAN tetapi bandnya belum keluar — biasanya menunggu guru. */
export function subtesBelumBerband(hasil: HasilSubtes[]): string[] {
  return hasil.filter((h) => h.diujikan && h.band === null).map((h) => h.nama);
}

/** Subtes yang memang TIDAK diujikan pada paket ini. */
export function subtesTidakDiujikan(hasil: HasilSubtes[]): string[] {
  return hasil.filter((h) => !h.diujikan).map((h) => h.nama);
}

/** Bentuk kode subtes yang aman, dilempar bila tidak dikenal. */
export function wajibSubtes(nilai: string | null | undefined): SubtesIeltsKode {
  const kode = keSubtesIelts(nilai);
  if (!kode) throw new GagalIelts("Subtes tidak dikenal.");
  return kode;
}

/* ==========================================================================
   DAFTAR PEKERJAAN SISWA — untuk panel penilaian guru
   ========================================================================== */

export interface BarisPengerjaan {
  id: number;
  user_id: number;
  nama: string;
  nisn: string | null;
  kelas: string | null;
  status: "ongoing" | "finished";
  started_at: string;
  finished_at: string | null;
  /** Banyak bagian Writing/Speaking yang sudah lengkap dinilai guru. */
  dinilai: number;
  /** Banyak bagian yang menunggu dinilai. */
  perluDinilai: number;
}

/**
 * Siapa saja yang sudah mengerjakan satu paket, beserta kemajuan penilaiannya.
 *
 * "perluDinilai" dihitung dari bagian yang MEMANG ada soalnya: paket yang
 * Speaking-nya belum diisi tidak boleh muncul sebagai pekerjaan guru yang
 * tertinggal.
 */
export async function pengerjaanPaket(paketId: number): Promise<BarisPengerjaan[]> {
  const adaSoal = new Set(
    (await all<{ subtes: string }>(
      "SELECT DISTINCT subtes FROM ielts_soal WHERE paket_id = ?",
      paketId,
    )).map((r) => r.subtes),
  );
  const bagianDiperlukan = (["WRITING", "SPEAKING"] as const)
    .filter((s) => adaSoal.has(s))
    .flatMap((s) => bagianNilai(s).map((b) => `${s}#${b}`));

  const baris = await all<{
    id: number;
    user_id: number;
    nama: string;
    nisn: string | null;
    kelas: string | null;
    status: "ongoing" | "finished";
    started_at: string;
    finished_at: string | null;
  }>(
    `SELECT p.id, p.user_id, u.nama, u.nisn, u.kelas, p.status, p.started_at, p.finished_at
       FROM ielts_pengerjaan p
       JOIN users u ON u.id = p.user_id
      WHERE p.paket_id = ?
      ORDER BY p.started_at DESC`,
    paketId,
  );

  return await Promise.all(baris.map(async (r) => {
    const lengkap = new Set(
      (await nilaiGuruPengerjaan(r.id))
        .filter((n) => n.band !== null)
        .map((n) => `${n.subtes}#${n.bagian}`),
    );
    const dinilai = bagianDiperlukan.filter((b) => lengkap.has(b)).length;
    return { ...r, dinilai, perluDinilai: bagianDiperlukan.length - dinilai };
  }));
}

/** Jawaban esai satu peserta pada satu subtes, beserta soalnya. */
export async function jawabanEsai(
  p: PengerjaanIelts,
  subtes: SubtesIeltsKode,
): Promise<{ nomor: number; pertanyaan: string; jawaban: string; seksiNomor: number | null }[]> {
  return (await all<{
    nomor: number;
    pertanyaan: string;
    jawaban: string | null;
    seksi_nomor: number | null;
  }>(
    `SELECT s.nomor, s.pertanyaan, j.jawaban, k.nomor AS seksi_nomor
       FROM ielts_soal s
       LEFT JOIN ielts_jawaban j ON j.soal_id = s.id AND j.pengerjaan_id = ?
       LEFT JOIN ielts_seksi k ON k.id = s.seksi_id
      WHERE s.paket_id = ? AND s.subtes = ?
      ORDER BY s.nomor`,
    p.id,
    p.paket_id,
    subtes,
  )).map((r) => ({
    nomor: r.nomor,
    pertanyaan: r.pertanyaan,
    jawaban: r.jawaban ?? "",
    seksiNomor: r.seksi_nomor,
  }));
}
