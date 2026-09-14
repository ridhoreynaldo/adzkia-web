import "server-only";

import { createHash } from "node:crypto";

import { one } from "@/lib/core/db";
import { simpanAudio } from "@/lib/ielts/ielts-audio";
import type { StatusPaketIelts, SubtesIeltsKode, TipeSoalIelts } from "@/lib/ielts/ielts-konstanta";
import {
  buatPaket,
  hapusPaket,
  pasangAudio,
  nomorTerpakai,
  pastikanSeksi,
  semuaPaket,
  setMenitPaket,
  setStatusPaket,
  simpanSeksi,
  simpanSoal,
  ubahPaket,
} from "@/lib/ielts/ielts";

import sebelas from "./paket-bawaan/ielts-11sep2026";
import demo from "./paket-bawaan/ielts-demo-1";
import type { PaketBawaan } from "./paket-bawaan/tipe";

/**
 * PAKET BAWAAN — paket IELTS yang ikut terbangun ke dalam aplikasi.
 *
 * KENAPA ADA. Paket IELTS disusun di komputer penyusun dari naskah Word lewat
 * skrip di `scripts/`. Keduanya TIDAK pernah sampai ke server: citra Docker
 * produksi hanya menyalin `.next/standalone`, `.next/static`, dan `public/`.
 * Jadi di server yang dipasang lewat `git push` — tanpa SSH, tanpa akses
 * basis data — paket yang sudah jadi itu tidak punya jalan masuk sama sekali.
 * Itulah keadaan adzkiasmart.com pada 14 September 2026: aplikasinya lengkap,
 * paket IELTS-nya kosong atau separuh, dan rekamannya menjawab 404.
 *
 * Berkas di `paket-bawaan/` adalah jalan masuk itu. Ia diimpor kode ini, jadi
 * Next ikut mengemasnya ke dalam standalone, dan pengelola memasangnya dengan
 * satu tombol di `/admin/ielts`. Bentuknya modul .ts berisi satu objek, bukan
 * .json, sebab berkas yang sama harus bisa dibaca bundler Next DAN skrip
 * `node` biasa — dan Node menolak .json tanpa `with { type: "json" }`.
 *
 * REKAMANNYA TIDAK IKUT KE REPO — 46 MB berkas suara tidak pantas tinggal di
 * git, dan `data/ielts-audio` memang sudah ada di .gitignore. Yang diawetkan
 * hanya NAMA berkasnya, dan nama itu cap sidik jari isinya: cukup untuk
 * mengunduhnya kembali dari server yang masih menyimpannya, sekaligus
 * membuktikan yang terunduh persis berkas yang dimaksud. Alamat yang lahir di
 * server tujuan karena itu sama huruf demi huruf dengan di server asal — dan
 * itu yang membuat lembar hasil peserta lama tetap menunjuk rekaman yang benar.
 *
 * TIGA HAL YANG TIDAK BOLEH DILAKUKAN MODUL INI, dan ketiganya dijaga di bawah:
 *
 *  1. Menghapus paket yang sudah punya pengerjaan peserta. `hapusPaket()`
 *     merembet ke `ielts_pengerjaan` lewat ON DELETE CASCADE — jawaban, band,
 *     dan catatan pelanggaran satu sesi ujian ikut lenyap tanpa pernah disebut
 *     di layar. Paket semacam itu DILENGKAPI, bukan disusun ulang: bagiannya
 *     diperbarui, rekamannya dipasang, dan butir yang nomornya belum ada
 *     ditambahkan — tidak satu butir pun dihapus atau diganti. Justru paket
 *     yang sudah dipakai itulah yang biasanya kekurangan rekaman.
 *  2. Menerbitkan paket yang seharusnya draft. Statusnya diambil dari data,
 *     bukan dipaksa "published".
 *  3. Berhenti separuh jalan karena rekaman gagal diunduh. Soalnya jauh lebih
 *     mahal daripada rekamannya: isi paketnya tetap dipasang, kegagalan
 *     unduhan dilaporkan, dan tombolnya bisa ditekan lagi nanti.
 */

export type { PaketBawaan } from "./paket-bawaan/tipe";

/** Asal rekaman. Server lama masih melayaninya terbuka di `/ielts/…`. */
const ASAL_REKAMAN_BAWAAN = "https://pintarbersamaadzkia.com";

export function asalRekaman(): string {
  return (process.env.ADZKIA_ASAL_REKAMAN || ASAL_REKAMAN_BAWAAN).replace(/\/+$/, "");
}

export const PAKET_BAWAAN: PaketBawaan[] = [demo, sebelas];

export function paketBawaan(kode: string): PaketBawaan | undefined {
  return PAKET_BAWAAN.find((p) => p.kode === kode);
}

/** Ringkasan satu paket bawaan untuk ditampilkan di panel, tanpa memasangnya. */
export interface RingkasBawaan {
  kode: string;
  nama: string;
  butir: { subtes: string; jumlah: number }[];
  rekaman: number;
  /** Keadaan paket berkode sama di basis data ini. */
  terpasang: { id: number; status: string; butir: number; pengerjaan: number } | null;
}

export async function ringkasPaketBawaan(): Promise<RingkasBawaan[]> {
  const daftar = await semuaPaket();
  const hasil: RingkasBawaan[] = [];

  for (const p of PAKET_BAWAAN) {
    const per = new Map<string, number>();
    for (const s of p.soal) per.set(s.subtes, (per.get(s.subtes) ?? 0) + 1);

    const ada = daftar.find((x) => x.kode === p.kode);
    let terpasang: RingkasBawaan["terpasang"] = null;
    if (ada) {
      const butir = Number(
        (await one<{ n: number }>("SELECT COUNT(*) AS n FROM ielts_soal WHERE paket_id = ?", ada.id))
          ?.n ?? 0,
      );
      const pengerjaan = Number(
        (
          await one<{ n: number }>(
            "SELECT COUNT(*) AS n FROM ielts_pengerjaan WHERE paket_id = ?",
            ada.id,
          )
        )?.n ?? 0,
      );
      terpasang = { id: ada.id, status: ada.status, butir, pengerjaan };
    }

    hasil.push({
      kode: p.kode,
      nama: p.nama,
      butir: [...per.entries()].map(([subtes, jumlah]) => ({ subtes, jumlah })),
      rekaman: p.seksi.filter((s) => s.audioBerkas).length,
      terpasang,
    });
  }
  return hasil;
}

/**
 * Cara paket itu dipasang — ditentukan sendiri dari keadaan basis datanya.
 *
 *   baru         — belum ada paket berkode ini di sini.
 *   susun-ulang  — sudah ada tetapi belum pernah dikerjakan, jadi dibangun lagi dari nol.
 *   lengkapi     — sudah ada DAN sudah dikerjakan peserta: tidak ada yang dihapus.
 */
export type ModePasang = "baru" | "susun-ulang" | "lengkapi";

export interface HasilPasang {
  kode: string;
  mode: ModePasang;
  /** Pengerjaan peserta yang sudah menempel pada paket ini sebelum tombol ditekan. */
  pengerjaan: number;
  /** Butir yang baru ditulis. */
  butir: number;
  /** Butir bawaan yang dilewati karena nomornya sudah terisi. */
  dilewati: number;
  bagian: number;
  rekaman: number;
  peringatan: string[];
}

export class GagalPasangBawaan extends Error {}

/** Berapa peserta yang sudah mengerjakan paket ini. */
async function jumlahPengerjaan(paketId: number): Promise<number> {
  const r = await one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM ielts_pengerjaan WHERE paket_id = ?",
    paketId,
  );
  return Number(r?.n ?? 0);
}

/**
 * Memasang satu paket bawaan ke basis data ini.
 *
 * Aman ditekan dua kali, dan aman ditekan oleh orang yang tidak tahu keadaan
 * sebelumnya — sebab caranya menyesuaikan diri dengan apa yang sudah ada di
 * sana; lihat `ModePasang`. Yang tidak pernah terjadi, apa pun modenya: butir
 * yang sudah dijawab peserta terhapus atau berganti isi.
 */
export async function pasangPaketBawaan(kode: string): Promise<HasilPasang> {
  const isi = paketBawaan(kode);
  if (!isi) throw new GagalPasangBawaan(`Paket bawaan "${kode}" tidak ada di aplikasi ini.`);

  const lama = (await semuaPaket()).find((p) => p.kode === isi.kode);
  const pengerjaan = lama ? await jumlahPengerjaan(lama.id) : 0;

  let paketId: number;
  let mode: ModePasang;

  if (!lama) {
    mode = "baru";
    paketId = await buatPaket({
      kode: isi.kode,
      nama: isi.nama,
      deskripsi: isi.deskripsi ?? undefined,
    });
  } else if (pengerjaan === 0) {
    mode = "susun-ulang";
    await hapusPaket(lama.id);
    paketId = await buatPaket({
      kode: isi.kode,
      nama: isi.nama,
      deskripsi: isi.deskripsi ?? undefined,
    });
  } else {
    mode = "lengkapi";
    paketId = lama.id;
  }

  // Nama, jendela waktu, status, dan menit TIDAK disentuh saat melengkapi.
  // Pada paket yang sudah dipakai, keempatnya sudah disetel pengelola untuk
  // sesi yang sedang berjalan; menimpanya dari bawaan aplikasi bisa menutup
  // paket yang sedang dikerjakan atau menggeser tenggat pesertanya.
  if (mode !== "lengkapi") {
    await ubahPaket(paketId, {
      nama: isi.nama,
      deskripsi: isi.deskripsi ?? undefined,
      mulai_at: isi.mulai_at ?? undefined,
      selesai_at: isi.selesai_at ?? undefined,
    });

    const menit = isi.menit;
    if (menit.listening ?? menit.reading ?? menit.writing ?? menit.speaking) {
      await setMenitPaket(paketId, {
        LISTENING: menit.listening ?? undefined,
        READING: menit.reading ?? undefined,
        WRITING: menit.writing ?? undefined,
        SPEAKING: menit.speaking ?? undefined,
      });
    }
  }

  /* ---- Bagian ---- */

  const peringatan: string[] = [];
  // nomor bagian -> id baris, per subtes. Id berbeda di tiap basis data; yang
  // dipakai menghubungkan soal ke bagiannya adalah nomornya.
  const idSeksi = new Map<string, number>();
  const subtesDipakai = [...new Set(isi.seksi.map((s) => s.subtes))];

  for (const subtes of subtesDipakai) {
    const baris = await pastikanSeksi(paketId, subtes as SubtesIeltsKode);
    for (const s of isi.seksi.filter((x) => x.subtes === subtes)) {
      const target = baris.find((b) => b.nomor === s.nomor);
      if (!target) {
        peringatan.push(`${subtes} bagian ${s.nomor} tidak ada di paket ini — dilewati.`);
        continue;
      }
      idSeksi.set(`${subtes}#${s.nomor}`, target.id);
      await simpanSeksi(target.id, {
        judul: s.judul ?? undefined,
        instruksi: s.instruksi ?? undefined,
        bacaan: s.bacaan ?? undefined,
        transkrip: s.transkrip ?? undefined,
      });
    }
  }

  /* ---- Butir ---- */

  let butir = 0;
  let dilewati = 0;

  // Nomor yang sudah terpakai di basis data ini, dibaca sekali per subtes.
  // Hanya relevan saat melengkapi: butir yang sudah ada tidak boleh diganti,
  // sebab jawaban peserta menunjuk id butirnya.
  const terpakai = new Map<string, Set<number>>();
  if (mode === "lengkapi") {
    for (const subtes of subtesDipakai) {
      terpakai.set(subtes, await nomorTerpakai(paketId, subtes as SubtesIeltsKode));
    }
  }

  for (const q of isi.soal) {
    if (terpakai.get(q.subtes)?.has(q.nomor)) {
      dilewati++;
      continue;
    }
    const seksiId = q.seksiNomor == null ? null : (idSeksi.get(`${q.subtes}#${q.seksiNomor}`) ?? null);
    await simpanSoal(paketId, q.subtes as SubtesIeltsKode, {
      seksiId,
      nomor: q.nomor,
      tipe: q.tipe as TipeSoalIelts,
      pertanyaan: q.pertanyaan,
      opsi: q.opsi,
      kunci: q.kunci,
      catatan: q.catatan ?? undefined,
    });
    butir++;
  }

  /* ---- Rekaman ---- */

  let rekaman = 0;
  for (const s of isi.seksi) {
    if (!s.audioBerkas) continue;
    const seksiId = idSeksi.get(`${s.subtes}#${s.nomor}`);
    if (!seksiId) continue;

    const alamat = `${asalRekaman()}/ielts/${isi.folderAudio}/${s.audioBerkas}`;
    try {
      const jawab = await fetch(alamat);
      if (!jawab.ok) throw new Error(`HTTP ${jawab.status}`);
      const data = new Uint8Array(await jawab.arrayBuffer());

      // Nama berkasnya sidik jari isinya, jadi unduhan yang terpotong ketahuan
      // di sini — bukan nanti, saat peserta menekan Play di tengah ujian.
      const harusnya = s.audioBerkas.split(".")[0];
      const sidik = createHash("sha1").update(data).digest("hex").slice(0, 16);
      if (sidik !== harusnya) {
        throw new Error(`sidik jari ${sidik}, seharusnya ${harusnya} — unduhan tidak utuh`);
      }

      const hasil = await simpanAudio(data, isi.kode);
      await pasangAudio(seksiId, hasil.url, s.audioNama ?? s.audioBerkas);
      rekaman++;
    } catch (e) {
      peringatan.push(
        `Rekaman ${s.subtes} ${s.nomor} gagal diambil dari ${alamat}: ` +
          (e instanceof Error ? e.message : String(e)),
      );
    }
  }

  if (mode !== "lengkapi") await setStatusPaket(paketId, isi.status as StatusPaketIelts);

  return {
    kode: isi.kode,
    mode,
    pengerjaan,
    butir,
    dilewati,
    bagian: idSeksi.size,
    rekaman,
    peringatan,
  };
}
