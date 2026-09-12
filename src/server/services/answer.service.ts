import "server-only";

import { SESI_SKD } from "@/lib/tryout/skd";
import * as attemptRepo from "@/server/repositories/attempt.repository";
import type { AttemptRow } from "@/server/repositories/attempt.repository";
import * as answerRepo from "@/server/repositories/answer.repository";
import type { ItemSimpan } from "@/server/repositories/answer.repository";

/**
 * Aturan penerimaan jawaban.
 *
 * Di sinilah keputusan "boleh atau tidak" diambil — repositori hanya membaca
 * dan menulis, lapisan request hanya memeriksa bentuk. Pemisahan itu bukan
 * kerapian: aturan di bawah menentukan sah-tidaknya nilai seorang peserta, dan
 * ia harus bisa dibaca dalam satu layar tanpa tercampur SQL maupun penguraian
 * JSON.
 *
 * ANGGARAN QUERY: TIGA, berapa pun banyak butir yang dikirim.
 */

export interface HasilSimpanBanyak {
  tersimpan: number;
  /** Butir yang ditolak karena timernya sudah tutup atau bukan milik paket ini. */
  ditolak: number[];
}

/**
 * Menyimpan sekumpulan jawaban.
 *
 * TIGA SYARAT PENERIMAAN, dan ketiganya harus tetap begini:
 *
 *   1. butirnya memang milik paket yang sedang dikerjakan;
 *   2. sesi/subtes butir itu sudah dibuka dan BELUM ditutup;
 *   3. timernya masih bersisa (> 0 detik).
 *
 * Ketiganya dibuktikan ke basis data, bukan dipercaya dari klien. Peserta yang
 * mengarang id butir, mengirim jawaban untuk subtes yang sudah lewat, atau
 * menahan kiriman sampai waktunya habis lalu melepasnya — ketiganya ditolak di
 * sini, bukan di peramban.
 *
 * Yang berbeda dari versi per butir hanyalah CARA membuktikannya: satu query
 * untuk seluruh butir, satu query untuk seluruh baris subtes sesi ini (paling
 * banyak delapan), lalu satu upsert untuk semuanya sekaligus. Versi lama
 * membayar empat query untuk SETIAP butir dan mengerjakannya berurutan — 643
 * query untuk kiriman 160 butir di akhir subtes, justru pada detik-detik saat
 * seluruh peserta mengirim berbarengan.
 */
export async function simpanBanyak(
  att: AttemptRow,
  items: ItemSimpan[],
): Promise<HasilSimpanBanyak> {
  if (att.status !== "ongoing" || items.length === 0) {
    return { tersimpan: 0, ditolak: items.map((i) => i.questionId) };
  }

  // SATU BARIS PER BUTIR, YANG TERAKHIR MENANG.
  //
  // Kiriman dari ruang ujian bisa memuat butir yang sama dua kali — peserta
  // mengubah jawabannya lalu antrean yang tertunda ikut terkirim. Perulangan
  // yang lama memaafkannya diam-diam (tulisan kedua menimpa yang pertama),
  // tetapi SATU pernyataan `ON CONFLICT DO UPDATE` TIDAK BOLEH menyentuh baris
  // yang sama dua kali: PostgreSQL membatalkan seluruh pernyataannya dengan
  // galat 21000. Tanpa penyaringan ini, satu butir kembar membuang SELURUH
  // kiriman — termasuk jawaban butir lain yang sah.
  //
  // Cacat itu ditemukan oleh pemeriksa yang menjalankan querynya sungguhan,
  // bukan oleh tinjauan kode. Jangan dihapus.
  const unik = new Map<number, ItemSimpan>();
  for (const it of items) unik.set(it.questionId, it);
  const butir = [...unik.values()];

  // (1) Butir mana yang benar-benar milik paket ini, di subtes mana, sekalian
  //     jalur paketnya. Butir yang tidak terjawab query ini ditolak.
  const soal = await answerRepo.soalMilikPaket(
    att.package_id,
    butir.map((i) => i.questionId),
  );
  const subtesSoal = new Map(soal.map((s) => [s.id, s.subtes]));

  // (2) Keadaan seluruh subtes sesi ini sekaligus.
  const sesi = new Map((await attemptRepo.keadaanSemuaSubtes(att.id)).map((r) => [r.subtes, r]));

  // Pada SKD seluruh butir bernaung di bawah SATU sesi, jadi timer yang
  // diperiksa adalah timer sesi itu — bukan timer per subtes.
  const skd = soal[0]?.jalur === "skd";

  const diterima: ItemSimpan[] = [];
  const ditolak: number[] = [];
  for (const it of butir) {
    const subtes = subtesSoal.get(it.questionId);
    if (!subtes) {
      ditolak.push(it.questionId);
      continue;
    }
    const baris = sesi.get(skd ? SESI_SKD : subtes);
    if (!baris || baris.ditutup || (baris.sisa ?? 0) <= 0) {
      ditolak.push(it.questionId);
      continue;
    }
    diterima.push(it);
  }

  if (diterima.length === 0) return { tersimpan: 0, ditolak };

  // (3) Satu upsert untuk semuanya. IDEMPOTEN — lihat `simpanBanyak()` di
  //     repositori: kiriman ulang menimpa baris yang sama, tidak pernah
  //     menggandakannya.
  const tersimpan = await answerRepo.simpanBanyak(att.id, diterima);
  return { tersimpan, ditolak };
}
