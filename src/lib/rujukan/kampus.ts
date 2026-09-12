/**
 * Rekomendasi kampus ADZKIA SMART.
 *
 * Sumber data: tabel `campuses` (disemai sekali dari src/data/kampus.ts).
 * Angka skor_min adalah ESTIMASI — lihat catatan lengkap di src/data/kampus.ts.
 */
import { all, one, run, tx } from "@/lib/core/db";
import {
  AMBANG_ZONA,
  DATA_KAMPUS,
  URUTAN_ZONA,
  type DataKampus,
  type HasilRekomendasi,
  type KelompokUjian,
  type PilihanSnbt,
  type ProdiRekomendasi,
  type ZonaPeluang,
} from "@/data/kampus";

export type {
  DataKampus,
  HasilRekomendasi,
  KelompokUjian,
  PilihanSnbt,
  ProdiRekomendasi,
  ZonaPeluang,
};

export interface BarisKampus extends DataKampus {
  id: number;
}

/* ------------------------------------------------------------------ */
/* Seeding                                                             */
/* ------------------------------------------------------------------ */

/**
 * Mengisi tabel `campuses` dari src/data/kampus.ts.
 * Idempoten: kalau tabel sudah berisi data, fungsi ini tidak melakukan apa pun
 * sehingga suntingan admin tidak pernah tertimpa.
 *
 * @param opsi.paksa  true = tulis ulang seluruh baris dari berkas data.
 * @returns jumlah baris yang benar-benar dimasukkan.
 */
export async function seedKampus(opsi: { paksa?: boolean } = {}): Promise<number> {
  const jml = await one<{ n: number }>("SELECT COUNT(*) AS n FROM campuses");
  const terisi = (jml?.n ?? 0) > 0;
  if (terisi && !opsi.paksa) return 0;

  let dimasukkan = 0;
  await tx(async () => {
    for (const k of DATA_KAMPUS) {
      const res = await run(
        `INSERT INTO campuses (ptn, prodi, kelompok, jenjang, skor_min, daya_tampung, peminat)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(ptn, prodi) DO UPDATE SET
           kelompok = excluded.kelompok,
           jenjang = excluded.jenjang,
           skor_min = excluded.skor_min,
           daya_tampung = excluded.daya_tampung,
           peminat = excluded.peminat`,
        k.ptn,
        k.prodi,
        k.kelompok,
        k.jenjang,
        k.skor_min,
        k.daya_tampung,
        k.peminat,
      );
      if (res.changes) dimasukkan++;
    }
  });
  return dimasukkan;
}

/** Seluruh prodi pada basis data (menyemai dulu bila tabel masih kosong). */
export async function daftarKampus(kelompok?: KelompokUjian): Promise<BarisKampus[]> {
  await seedKampus();
  if (kelompok) {
    return await all<BarisKampus>(
      `SELECT id, ptn, prodi, kelompok, jenjang, skor_min, daya_tampung, peminat
         FROM campuses WHERE kelompok = ? ORDER BY skor_min DESC, ptn, prodi`,
      kelompok,
    );
  }
  return await all<BarisKampus>(
    `SELECT id, ptn, prodi, kelompok, jenjang, skor_min, daya_tampung, peminat
       FROM campuses ORDER BY skor_min DESC, ptn, prodi`,
  );
}

/* ------------------------------------------------------------------ */
/* Seleksi Pilihan 1-4 (meniru SNBT nasional)                          */
/* ------------------------------------------------------------------ */

export type StatusSeleksi = "LULUS" | "TIDAK_LULUS" | "TIDAK_DIPROSES" | "TANPA_DATA";

export interface AncarAncarProdi {
  skorMin: number;
  dayaTampung: number | null;
  peminat: number | null;
  kelompok: string;
  jenjang: string;
  /** 1 kursi diperebutkan berapa pendaftar; null bila daya tampungnya kosong. */
  keketatan: number | null;
}

export interface PilihanDinilai {
  urutan: number;
  prodiNama: string;
  ptn: string;
  /**
   * null bila prodi pilihannya belum punya ancar-ancar skor di tabel
   * `campuses` — katalog `prodi` bisa jauh lebih luas daripada data kampus.
   */
  ancar: AncarAncarProdi | null;
  status: StatusSeleksi;
  /** Peserta tryout ini yang sama-sama mencantumkan prodi tersebut. */
  pesaing: number;
  /** Peringkat peserta di antara `pesaing`, dihitung dari skor total. */
  peringkat: number | null;
}

export interface HasilSeleksiPilihan {
  pilihan: PilihanDinilai[];
  /** Urutan pilihan tempat peserta diterima; null bila tidak lolos di mana pun. */
  diterimaDi: number | null;
}

interface BarisPilihan {
  urutan: number;
  prodi_nama: string;
  ptn: string;
  skor_min: number | null;
  daya_tampung: number | null;
  peminat: number | null;
  kelompok: string | null;
  jenjang: string | null;
}

/**
 * Menyeleksi Pilihan 1-4 peserta dengan aturan yang sama dengan SNBT nasional.
 *
 * Intinya ada pada URUTAN, bukan sekadar lulus per prodi: sistem menilai
 * Pilihan 1 lebih dulu; begitu peserta diterima di satu pilihan, pilihan
 * berikutnya TIDAK diproses lagi — satu peserta hanya mendapat satu kursi.
 * Karena itu status tiap baris ada empat, bukan dua: LULUS, TIDAK LULUS,
 * TIDAK DIPROSES (sudah diterima di pilihan yang lebih tinggi), dan TANPA
 * DATA (prodinya belum punya ancar-ancar).
 *
 * Yang TIDAK bisa ditiru: pemeringkatan nasional yang sesungguhnya, karena
 * yang kita punya hanya peserta Adzkia — bukan ratusan ribu pendaftar SNBT.
 * Sebagai penggantinya dipakai `campuses.skor_min`, yaitu ancar-ancar skor
 * peserta TERAKHIR yang diterima di prodi itu; angka itu sendiri lahir dari
 * perbandingan daya tampung terhadap jumlah peminat. Peringkat di antara
 * sesama peserta tryout tetap dihitung dan ditampilkan sebagai gambaran
 * persaingan yang nyata.
 *
 * Pilihan peserta disimpan sebagai teks huruf besar ("KEDOKTERAN"), sedangkan
 * tabel ancar-ancar menuliskannya dengan huruf kapital di awal kata
 * ("Pendidikan Dokter"), jadi penjodohannya mengabaikan besar-kecil huruf.
 */
export async function seleksiPilihanPeserta(
  userId: number,
  packageId: number,
  totalSkor: number,
): Promise<HasilSeleksiPilihan> {
  const baris = await all<BarisPilihan>(
    `SELECT pp.urutan, pp.prodi_nama, pp.ptn,
            c.skor_min, c.daya_tampung, c.peminat, c.kelompok, c.jenjang
       FROM pilihan_prodi pp
       LEFT JOIN campuses c
              ON UPPER(c.ptn) = UPPER(pp.ptn)
             AND UPPER(c.prodi) = UPPER(pp.prodi_nama)
      WHERE pp.user_id = ? AND pp.package_id = ?
      ORDER BY pp.urutan`,
    userId,
    packageId,
  );

  let diterimaDi: number | null = null;

  const pilihan = await Promise.all(baris.map(async (b): Promise<PilihanDinilai> => {
    // Persaingan nyata: peserta paket ini yang juga mencantumkan prodi tersebut.
    const saingan = await all<{ total_skor: number | null }>(
      `SELECT a.total_skor
         FROM pilihan_prodi pp
         JOIN attempts a ON a.user_id = pp.user_id AND a.package_id = pp.package_id
        WHERE pp.package_id = ?
          AND UPPER(pp.prodi_nama) = UPPER(?)
          AND UPPER(pp.ptn) = UPPER(?)
          AND a.status = 'finished'`,
      packageId,
      b.prodi_nama,
      b.ptn,
    );
    const pesaing = saingan.length;
    const peringkat =
      pesaing > 0
        ? saingan.filter((r) => (r.total_skor ?? 0) > totalSkor).length + 1
        : null;

    const dasar = {
      urutan: b.urutan,
      prodiNama: b.prodi_nama,
      ptn: b.ptn,
      pesaing,
      peringkat,
    };

    if (b.skor_min == null) {
      return { ...dasar, ancar: null, status: "TANPA_DATA" };
    }

    const ancar: AncarAncarProdi = {
      skorMin: b.skor_min,
      dayaTampung: b.daya_tampung,
      peminat: b.peminat,
      kelompok: b.kelompok ?? "—",
      jenjang: b.jenjang ?? "S1",
      keketatan:
        b.daya_tampung && b.daya_tampung > 0 && b.peminat != null
          ? Number((b.peminat / b.daya_tampung).toFixed(1))
          : null,
    };

    // Sudah diterima di pilihan yang lebih tinggi -> berhenti di sini.
    if (diterimaDi !== null) {
      return { ...dasar, ancar, status: "TIDAK_DIPROSES" };
    }

    if (totalSkor >= b.skor_min) {
      diterimaDi = b.urutan;
      return { ...dasar, ancar, status: "LULUS" };
    }

    return { ...dasar, ancar, status: "TIDAK_LULUS" };
  }));

  return { pilihan, diterimaDi };
}

/* ------------------------------------------------------------------ */
/* Perhitungan zona                                                    */
/* ------------------------------------------------------------------ */

/** Zona peluang satu prodi untuk skor tertentu, atau null bila terlalu jauh. */
export function zonaUntuk(totalSkor: number, skorMin: number): ZonaPeluang | null {
  const selisih = totalSkor - skorMin;
  if (selisih >= AMBANG_ZONA.AMAN) return "AMAN";
  if (selisih >= AMBANG_ZONA.POTENSIAL) return "POTENSIAL";
  if (selisih >= AMBANG_ZONA.BERSAING) return "BERSAING";
  if (selisih >= AMBANG_ZONA.MENANTANG) return "MENANTANG";
  return null;
}

function keZona(baris: BarisKampus, totalSkor: number, zona: ZonaPeluang): ProdiRekomendasi {
  const selisih = Math.round(totalSkor - baris.skor_min);
  return {
    ...baris,
    zona,
    selisih,
    kurang: selisih < 0 ? Math.abs(selisih) : 0,
    keketatan:
      baris.daya_tampung > 0
        ? Number((baris.peminat / baris.daya_tampung).toFixed(1))
        : 0,
  };
}

/**
 * Susunan Pilihan 1–4 SNBT: dari yang paling menantang ke yang paling aman.
 * Pilihan 1 dipakai untuk mimpi besar, Pilihan 4 sebagai jaring pengaman.
 */
function susunPilihan(
  perZona: Record<ZonaPeluang, ProdiRekomendasi[]>,
): PilihanSnbt[] {
  const strategi: Record<1 | 2 | 3 | 4, { zona: ZonaPeluang; teks: string }> = {
    1: { zona: "MENANTANG", teks: "Pilihan berani — kejar mimpi, butuh lompatan skor." },
    2: { zona: "BERSAING", teks: "Pilihan menantang tapi selisihnya sudah tipis." },
    3: { zona: "POTENSIAL", teks: "Pilihan realistis — skormu sudah menyentuh ancar-ancar." },
    4: { zona: "AMAN", teks: "Jaring pengaman — peluang paling besar untuk lolos." },
  };

  // Cadangan bila satu zona kosong: ambil dari zona terdekat yang masih ada.
  const semua = URUTAN_ZONA.flatMap((z) => perZona[z]);
  const terpakai = new Set<number>();

  const ambil = (zona: ZonaPeluang): ProdiRekomendasi | null => {
    const utama = perZona[zona].find((p) => !terpakai.has(p.id));
    if (utama) {
      terpakai.add(utama.id);
      return utama;
    }
    // Urutkan cadangan berdasarkan kedekatan zona dengan zona yang diminta.
    const idxTarget = URUTAN_ZONA.indexOf(zona);
    const cadangan = semua
      .filter((p) => !terpakai.has(p.id))
      .sort(
        (a, b) =>
          Math.abs(URUTAN_ZONA.indexOf(a.zona) - idxTarget) -
            Math.abs(URUTAN_ZONA.indexOf(b.zona) - idxTarget) ||
          b.skor_min - a.skor_min,
      )[0];
    if (!cadangan) return null;
    terpakai.add(cadangan.id);
    return cadangan;
  };

  return ([1, 2, 3, 4] as const).map((urutan) => ({
    urutan,
    strategi: strategi[urutan].teks,
    prodi: ambil(strategi[urutan].zona),
  }));
}

/**
 * Rekomendasi kampus berdasarkan skor total UTBK (0–1000).
 *
 * @param totalSkor skor total peserta.
 * @param kelompok  batasi ke "Saintek" / "Soshum"; kosongkan untuk keduanya.
 */
export async function rekomendasiKampus(
  totalSkor: number,
  kelompok?: KelompokUjian,
): Promise<HasilRekomendasi> {
  const semua = await daftarKampus(kelompok);

  const perZona: Record<ZonaPeluang, ProdiRekomendasi[]> = {
    AMAN: [],
    POTENSIAL: [],
    BERSAING: [],
    MENANTANG: [],
  };

  for (const baris of semua) {
    const zona = zonaUntuk(totalSkor, baris.skor_min);
    if (!zona) continue;
    perZona[zona].push(keZona(baris, totalSkor, zona));
  }

  // Di dalam tiap zona, tampilkan prodi paling bergengsi (skor_min tertinggi) dulu.
  for (const z of URUTAN_ZONA) {
    perZona[z].sort((a, b) => b.skor_min - a.skor_min || a.ptn.localeCompare(b.ptn, "id-ID"));
  }

  return {
    totalSkor: Math.round(totalSkor),
    kelompok: kelompok ?? "Semua",
    perZona,
    pilihan: susunPilihan(perZona),
    jumlahCocok: URUTAN_ZONA.reduce((a, z) => a + perZona[z].length, 0),
  };
}
