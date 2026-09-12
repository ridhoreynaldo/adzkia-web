import "server-only";

import { one, run, tx, sisipWajib} from "@/lib/core/db";
import {
  GagalWarung,
  HURUF_OPSI,
  type TipeSoalWarung,
  ambilPaket,
  nomorBerikutnya,
  targetSoal,
} from "@/lib/warung/warung";

/**
 * Penyuntingan bank soal Warung dari panel admin.
 *
 * Seluruh pemeriksaan isian ada di sini, bukan di komponen, supaya jalur ketik
 * manual dan jalur impor berkas tunduk pada aturan yang sama persis.
 *
 * Paket TIDAK dibuat, dihapus, maupun "diterbitkan" dari sini: kerangka 30
 * paket per subtes disiapkan sekaligus oleh `siapkanKerangka()`, dan sebuah
 * paket terbuka sendiri bagi siswa begitu soalnya lengkap serta paket
 * sebelumnya ia tuntaskan. Yang tersisa untuk pengelola hanyalah mengisi soal.
 */

export interface InputSoalWarung {
  paket_id: number;
  nomor: number;
  tipe: TipeSoalWarung;
  stimulus: string;
  pertanyaan: string;
  gambar_url: string;
  /** PG: pilihan jawaban. PGK: daftar pernyataan. IS: diabaikan. */
  opsi: string[];
  /** PG: "A".."E". PGK: larik "B"/"S". IS: teks jawaban. */
  kunci: string | string[];
  pembahasan: string;
}

export interface HasilPeriksa {
  opsi: string[];
  kunci: string;
}

/**
 * Periksa satu butir dan bakukan bentuk simpanannya.
 * Melempar GagalWarung dengan pesan yang siap ditampilkan ke admin.
 */
export function periksaSoal(input: InputSoalWarung): HasilPeriksa {
  if (!input.pertanyaan.trim()) throw new GagalWarung("Pertanyaan tidak boleh kosong.");

  if (input.tipe === "IS") {
    const kunci = (Array.isArray(input.kunci) ? input.kunci[0] : input.kunci) ?? "";
    if (!kunci.trim()) {
      throw new GagalWarung("Isian singkat wajib punya kunci jawaban, mis. \"12,5\".");
    }
    // Isian singkat tidak punya pilihan; larik kosong disimpan agar bentuk
    // kolomnya seragam dengan butir lain.
    return { opsi: [], kunci: kunci.trim() };
  }

  const opsi = input.opsi.map((o) => o.trim());
  while (opsi.length && opsi[opsi.length - 1] === "") opsi.pop();

  if (input.tipe === "PGK") {
    if (opsi.length < 2) throw new GagalWarung("Tulis minimal dua pernyataan Benar/Salah.");
    if (opsi.some((o) => !o)) throw new GagalWarung("Ada pernyataan yang masih kosong.");

    const kunci = (Array.isArray(input.kunci) ? input.kunci : [input.kunci])
      .map((k) => String(k).trim().toUpperCase())
      .slice(0, opsi.length);
    if (kunci.length !== opsi.length || kunci.some((k) => k !== "B" && k !== "S")) {
      throw new GagalWarung(
        "Tiap pernyataan harus ditandai Benar atau Salah, dan jumlahnya sama dengan jumlah pernyataan.",
      );
    }
    return { opsi, kunci: JSON.stringify(kunci) };
  }

  // ---- Pilihan ganda biasa ----
  if (opsi.length < 2) throw new GagalWarung("Isi minimal dua pilihan jawaban.");
  if (opsi.some((o) => !o)) throw new GagalWarung("Ada pilihan jawaban yang masih kosong.");

  const kunci = String(Array.isArray(input.kunci) ? input.kunci[0] : input.kunci)
    .trim()
    .toUpperCase();
  const indeks = HURUF_OPSI.indexOf(kunci as (typeof HURUF_OPSI)[number]);
  if (indeks < 0 || indeks >= opsi.length) {
    throw new GagalWarung(
      `Kunci "${kunci || "(kosong)"}" tidak sah. Pilih salah satu huruf pilihan yang terisi.`,
    );
  }
  return { opsi, kunci };
}

async function nomorTerpakai(paketId: number, nomor: number, kecualiId: number): Promise<boolean> {
  return (
    await one<{ id: number }>(
      "SELECT id FROM warung_soal WHERE paket_id = ? AND nomor = ? AND id <> ?",
      paketId,
      nomor,
      kecualiId,
    ) != null
  );
}

export async function buatSoal(input: InputSoalWarung): Promise<number> {
  const { opsi, kunci } = periksaSoal(input);
  const nomor =
    Number.isInteger(input.nomor) && input.nomor > 0 ? input.nomor : await nomorBerikutnya(input.paket_id);

  if (await nomorTerpakai(input.paket_id, nomor, 0)) {
    throw new GagalWarung(`Nomor ${nomor} sudah ada di paket ini.`);
  }

  const res = await sisipWajib(
    `INSERT INTO warung_soal (paket_id, nomor, tipe, stimulus, pertanyaan, gambar_url, opsi, kunci, pembahasan)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.paket_id,
    nomor,
    input.tipe,
    input.stimulus.trim() || null,
    input.pertanyaan.trim(),
    input.gambar_url.trim() || null,
    JSON.stringify(opsi),
    kunci,
    input.pembahasan.trim() || null,
  );
  return res;
}

export async function perbaruiSoal(id: number, input: InputSoalWarung): Promise<void> {
  const { opsi, kunci } = periksaSoal(input);
  if (await nomorTerpakai(input.paket_id, input.nomor, id)) {
    throw new GagalWarung(`Nomor ${input.nomor} sudah ada di paket ini.`);
  }

  await run(
    `UPDATE warung_soal
        SET nomor = ?, tipe = ?, stimulus = ?, pertanyaan = ?, gambar_url = ?,
            opsi = ?, kunci = ?, pembahasan = ?
      WHERE id = ?`,
    input.nomor,
    input.tipe,
    input.stimulus.trim() || null,
    input.pertanyaan.trim(),
    input.gambar_url.trim() || null,
    JSON.stringify(opsi),
    kunci,
    input.pembahasan.trim() || null,
    id,
  );
}

export async function hapusSoal(id: number): Promise<void> {
  await run("DELETE FROM warung_soal WHERE id = ?", id);
}

/** Menomori ulang satu paket jadi 1..n rapat, dipakai sesudah penghapusan. */
export async function rapikanNomor(paketId: number): Promise<void> {
  const ada = await one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM warung_soal WHERE paket_id = ?",
    paketId,
  );
  if (!ada?.n) return;

  await tx(async () => {
    // Digeser jauh dulu supaya tidak bertabrakan dengan nomor yang sudah ada.
    await run("UPDATE warung_soal SET nomor = nomor + 10000 WHERE paket_id = ?", paketId);
    // `array_agg(... ORDER BY ...)` menggantikan `GROUP_CONCAT` milik SQLite —
    // dan sekaligus menghapus anak query yang di PostgreSQL wajib bernama.
    // Hasilnya larik angka, bukan teks berkoma, jadi tidak ada lagi langkah
    // pisah-dan-ubah-ke-angka yang bisa salah pada id besar.
    const urut = await one<{ ids: number[] | null }>(
      "SELECT array_agg(id ORDER BY nomor) AS ids FROM warung_soal WHERE paket_id = ?",
      paketId,
    );
    // Perulangan biasa, bukan `.forEach()`: forEach mengabaikan Promise yang
    // dipulangkan fungsi anaknya, sehingga penomoran ulang ini akan dianggap
    // selesai sebelum satu barisnya pun tersimpan — dan transaksi di sekitarnya
    // menutup lebih dulu.
    const idUrut = urut?.ids ?? [];
    for (let i = 0; i < idUrut.length; i++) {
      await run("UPDATE warung_soal SET nomor = ? WHERE id = ?", i + 1, idUrut[i]);
    }
  });
}

/* ==========================================================================
   PAKET
   ========================================================================== */

export async function perbaruiPaket(id: number, judul: string, catatan: string): Promise<void> {
  await run(
    "UPDATE warung_paket SET judul = ?, catatan = ? WHERE id = ?",
    judul.trim() || null,
    catatan.trim() || null,
    id,
  );
}

/** Kosongkan seluruh soal sebuah paket — dipakai sebelum mengimpor ulang. */
export async function kosongkanPaket(id: number): Promise<number> {
  const res = await run("DELETE FROM warung_soal WHERE paket_id = ?", id);
  return Number(res.changes);
}

export async function jumlahPemainPaket(id: number): Promise<number> {
  return (
    (await one<{ n: number }>(
      "SELECT COUNT(DISTINCT user_id) AS n FROM warung_sesi WHERE paket_id = ?",
      id,
    ))?.n ?? 0
  );
}

/**
 * Apakah paket sudah cukup terisi untuk dipakai siswa.
 *
 * Tidak ada tombol "terbitkan": paket dianggap siap begitu jumlah soalnya
 * mencapai target subtesnya. Aturannya sengaja berupa angka, bukan penilaian
 * manusia, supaya tidak ada paket setengah jadi yang terlanjur dikerjakan
 * siswa hanya karena pengelola lupa menutupnya.
 */
export async function paketSiap(paketId: number): Promise<boolean> {
  const paket = await ambilPaket(paketId);
  if (!paket) return false;
  const n = (await one<{ n: number }>("SELECT COUNT(*) AS n FROM warung_soal WHERE paket_id = ?", paketId))?.n ?? 0;
  return n >= targetSoal(paket.subtes);
}

/** Ringkas satu paket untuk kepala halaman admin. */
export async function judulPaket(id: number): Promise<string> {
  const p = await ambilPaket(id);
  if (!p) return "Paket";
  return p.judul ?? `${p.subtes} — Paket ${p.nomor}`;
}
