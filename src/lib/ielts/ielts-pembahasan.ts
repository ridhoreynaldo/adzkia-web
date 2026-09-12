import "server-only";

import { all } from "@/lib/core/db";
import {
  SUBTES_IELTS,
  type PengerjaanIelts,
  type SoalIelts,
  type SubtesIeltsKode,
  type TipeSoalIelts,
  jawabanBenar,
  paketById,
} from "@/lib/ielts/ielts";

/**
 * LEMBAR PEMBAHASAN IELTS — padanan `detailJawaban()` + `<Pembahasan>` pada
 * jalur UTBK-SNBT dan SKD.
 *
 * Sampai 11 September 2026 jalur IELTS berhenti pada angka band: siswa tahu ia
 * mendapat 6,5 tetapi tidak pernah tahu butir mana yang salah. Pengelola
 * meminta ketiga jalur diseragamkan, dan inilah sisi IELTS-nya.
 *
 * TIGA ATURAN YANG MENJAGA LEMBAR INI TIDAK BOCOR JADI KUNCI JAWABAN:
 *
 *  1. `tampil_pembahasan` pada paketnya harus 1 — tuas yang sama persis dengan
 *     `packages.tampil_pembahasan` di jalur tryout. Pengelola yang menahan
 *     pembahasan pada hari-H menahan ketiga jalur dengan kebiasaan yang sama.
 *  2. Subtes yang MASIH BERJALAN tidak pernah muncul. Kunci Listening yang
 *     terbuka selagi Reading masih berjalan tidak membantu siapa pun, tetapi
 *     kunci Reading yang terbuka selagi Reading berjalan adalah bencana — dan
 *     satu-satunya cara memastikan hal kedua tidak terjadi adalah menutup
 *     keduanya sampai subtesnya tutup.
 *  3. Pengerjaan yang DIHENTIKAN (`gugur`) tidak berhak atas lembar ini sama
 *     sekali, sejalan dengan `/hasil/<attempt>` yang memulangkan layar GAGAL.
 *
 * Writing dan Speaking ikut ditampilkan, tetapi bentuknya berbeda dan memang
 * harus berbeda: tidak ada kunci yang bisa dibandingkan, jadi yang diperlihatkan
 * adalah karangan peserta sendiri berikut catatan gurunya.
 */

export interface ButirPembahasan {
  id: number;
  nomor: number;
  tipe: TipeSoalIelts;
  pertanyaan: string;
  opsi: string[];
  /** Kunci resmi. Untuk isian singkat bisa memuat beberapa jawaban sah. */
  kunci: string;
  /** Jawaban peserta apa adanya; string kosong berarti dikosongkan. */
  jawaban: string;
  benar: boolean;
  kosong: boolean;
  /** Penjelasan dari pengajar (kolom `catatan` pada bank soal). */
  pembahasan: string | null;
  /** Bagian tempat butir ini berada — "Recording 2", "Passage 1", … */
  seksiId: number | null;
}

export interface BagianPembahasan {
  id: number;
  nomor: number;
  label: string;
  judul: string | null;
  /** Bacaan Reading; ditampilkan supaya siswa bisa menelusuri jawabannya. */
  bacaan: string | null;
  /**
   * Naskah rekaman Listening.
   *
   * SELAMA UJIAN naskah ini tidak pernah dikirim ke peserta — rekaman diputar
   * sekali jalan, dan transkrip akan membatalkan seluruh gunanya. SESUDAH
   * subtesnya tutup keadaannya berbalik: justru naskah inilah yang membuat
   * siswa mengerti mengapa jawabannya salah.
   */
  transkrip: string | null;
  butir: ButirPembahasan[];
}

export interface KelompokPembahasanIelts {
  kode: SubtesIeltsKode;
  nama: string;
  /** false = subtesnya belum tutup, jadi isinya sengaja ditahan. */
  terbuka: boolean;
  /** true untuk Writing & Speaking: tidak ada kunci, hanya karangan peserta. */
  dinilaiGuru: boolean;
  benar: number;
  jumlahSoal: number;
  bagian: BagianPembahasan[];
  /** Butir yang tidak menempel pada bagian mana pun. */
  lepas: ButirPembahasan[];
}

export interface LembarPembahasan {
  /** false = pengelola menahan pembahasan paket ini. */
  dibuka: boolean;
  kelompok: KelompokPembahasanIelts[];
}

interface BarisSeksi {
  id: number;
  subtes: string;
  nomor: number;
  judul: string | null;
  bacaan: string | null;
  transkrip: string | null;
}

function amanOpsi(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

/**
 * Lembar pembahasan untuk satu pengerjaan.
 *
 * Tidak pernah melempar: paket yang menahan pembahasan, ujian yang dihentikan,
 * dan subtes yang belum tutup semuanya menghasilkan lembar yang KOSONG dengan
 * keterangannya, bukan galat — halaman hasil harus tetap bisa digambar.
 */
export async function pembahasanPengerjaan(p: PengerjaanIelts): Promise<LembarPembahasan> {
  const paket = await paketById(p.paket_id);
  const dibuka = Boolean(paket && paket.tampil_pembahasan === 1 && p.status !== "gugur");
  if (!dibuka) return { dibuka: false, kelompok: [] };

  const soal = await all<SoalIelts>(
    "SELECT * FROM ielts_soal WHERE paket_id = ? ORDER BY subtes, nomor",
    p.paket_id,
  );
  const seksi = await all<BarisSeksi>(
    "SELECT id, subtes, nomor, judul, bacaan, transkrip FROM ielts_seksi WHERE paket_id = ? ORDER BY subtes, nomor",
    p.paket_id,
  );
  const jawaban = new Map(
    (await all<{ soal_id: number; jawaban: string | null }>(
      "SELECT soal_id, jawaban FROM ielts_jawaban WHERE pengerjaan_id = ?",
      p.id,
    )).map((r) => [r.soal_id, r.jawaban ?? ""]),
  );
  // Hanya subtes yang SUDAH TUTUP yang boleh dibuka kuncinya. Barisnya sendiri
  // ditulis `bukaSubtes()`; ketiadaan baris berarti peserta belum membukanya.
  const tutup = new Set(
    (await all<{ subtes: string }>(
      "SELECT subtes FROM ielts_subtes WHERE pengerjaan_id = ? AND selesai_at IS NOT NULL",
      p.id,
    )).map((r) => r.subtes),
  );

  const kelompok = SUBTES_IELTS.map((s) => {
    const butirSubtes = soal.filter((x) => x.subtes === s.kode);
    const terbuka = tutup.has(s.kode);
    const dinilaiGuru = s.kode === "WRITING" || s.kode === "SPEAKING";

    const jadi = (b: SoalIelts): ButirPembahasan => {
      const j = jawaban.get(b.id) ?? "";
      const kosong = !j.trim();
      return {
        id: b.id,
        nomor: b.nomor,
        tipe: b.tipe,
        pertanyaan: b.pertanyaan,
        opsi: amanOpsi(b.opsi),
        kunci: b.kunci,
        jawaban: j,
        // Karangan tidak punya benar/salah; menandainya "salah" karena tidak
        // sama dengan kunci yang memang kosong akan menyesatkan.
        benar: !dinilaiGuru && !kosong && jawabanBenar(b.tipe, b.kunci, j),
        kosong,
        pembahasan: b.catatan,
        seksiId: b.seksi_id,
      };
    };

    const semua = terbuka ? butirSubtes.map(jadi) : [];
    const bagian: BagianPembahasan[] = terbuka
      ? seksi
          .filter((k) => k.subtes === s.kode)
          .map((k) => ({
            id: k.id,
            nomor: k.nomor,
            label: `${s.labelSeksi} ${k.nomor}`,
            judul: k.judul,
            bacaan: k.bacaan,
            transkrip: k.transkrip,
            butir: semua.filter((b) => b.seksiId === k.id),
          }))
          // Bagian yang tidak berisi butir DAN tidak berisi bacaan/naskah tidak
          // perlu digambar sebagai kartu kosong.
          .filter((k) => k.butir.length > 0 || k.bacaan || k.transkrip)
      : [];

    return {
      kode: s.kode,
      nama: s.nama,
      terbuka,
      dinilaiGuru,
      benar: semua.filter((b) => b.benar).length,
      jumlahSoal: butirSubtes.length,
      bagian,
      lepas: semua.filter((b) => b.seksiId === null),
    };
  }).filter((k) => k.jumlahSoal > 0);

  return { dibuka: true, kelompok };
}
