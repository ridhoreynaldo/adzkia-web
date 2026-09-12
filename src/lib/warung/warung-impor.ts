import "server-only";

import { one, run, tx } from "@/lib/core/db";
import { bacaDocx, jenisGambar, type BlokDocx, type ParagrafDocx } from "@/lib/naskah/docx";
import { simpanGambarSoal } from "@/lib/naskah/gambar-soal";
import { bacaTabel, sel } from "@/lib/admin/impor-tabel";
import { pecahOpsiSebaris, potongAwalanHtml } from "@/lib/naskah/naskah-docx";
import { type TipeSoalWarung } from "@/lib/warung/warung";
import { periksaSoal } from "@/lib/warung/warung-admin";

/**
 * Pengisi satu paket Warung Soal dari berkas.
 *
 * Dua bentuk berkas diterima dan keduanya menghasilkan baris pratinjau yang
 * sama, sehingga layar admin cukup satu:
 *
 * 1. NASKAH WORD (.docx), ditulis mengalir seperti di kertas:
 *
 *      1. Isi pertanyaannya
 *      A. pilihan pertama
 *      B. pilihan kedua
 *      Kunci: C
 *      Pembahasan: ...
 *
 *      Tipe: PGK                     <- butir Benar/Salah
 *      2. Pernyataan berikut benar atau salah?
 *      A. pernyataan pertama
 *      B. pernyataan kedua
 *      Kunci: B, S
 *
 *      Tipe: IS                      <- isian singkat, tanpa pilihan
 *      3. Berapa nilai x?
 *      Kunci: 12,5
 *
 * 2. TABEL (.xlsx / .csv) dengan judul kolom:
 *    nomor | tipe | stimulus | pertanyaan | opsi_a..opsi_e | kunci | pembahasan
 *
 * Paketnya sendiri dipilih di layar admin, bukan di dalam berkas — satu berkas
 * satu paket, supaya naskah tidak bisa tumpah ke paket yang salah.
 */

/* ==========================================================================
   BENTUK KELUARAN
   ========================================================================== */

export interface BarisWarung {
  /** Nomor urut baris pada berkas, untuk pesan galat. */
  asal: number;
  nomor: number | null;
  tipe: TipeSoalWarung;
  stimulus: string;
  pertanyaan: string;
  gambar_url: string;
  opsi: string[];
  /** Apa adanya dari berkas; dibakukan saat disimpan. */
  kunci: string;
  pembahasan: string;
  /** Kosong berarti baris ini layak disimpan. */
  masalah: string[];
}

export interface HasilParseWarung {
  baris: BarisWarung[];
  sumber: "naskah-word" | "tabel";
  catatan: string[];
  jumlahValid: number;
  jumlahGalat: number;
  errorFile?: string;
}

/* ==========================================================================
   PENGENALAN POLA
   ========================================================================== */

const POLA_NOMOR = /^(\d{1,3})\s*[.)]\s*([\s\S]*)$/;
const POLA_OPSI = /^\(?([A-Ea-e1-6])\)?\s*[.)]\s*([\s\S]*)$/;
const POLA_KUNCI = /^(?:kunci\s*jawaban|kunci|jawaban|jwb)\s*[:.\-–]\s*([\s\S]*)$/i;
const POLA_PEMBAHASAN = /^(?:pembahasan|penjelasan|alasan)\s*[:.\-–]?\s*([\s\S]*)$/i;
const POLA_TIPE = /^(?:tipe|bentuk|bentuk\s*soal)\s*[:.\-–]\s*([\s\S]*)$/i;
const POLA_STIMULUS = /^(?:bacaan|stimulus|teks)\s*[:.\-–]\s*([\s\S]*)$/i;

/** "PGK" / "pilihan ganda kompleks" / "BS" -> PGK; "isian" -> IS; sisanya PG. */
export function keTipe(v: string | undefined | null): TipeSoalWarung {
  const t = (v ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (!t) return "PG";
  if (t.startsWith("is") || t.includes("isian") || t.includes("singkat")) return "IS";
  if (t === "bs" || t.startsWith("pgk") || t.includes("kompleks") || t.includes("benarsalah")) {
    return "PGK";
  }
  return "PG";
}

/* ==========================================================================
   JALUR 1 — NASKAH WORD
   ========================================================================== */

interface ButirKerja extends BarisWarung {
  berkasGambar: string[];
}

function butirBaru(asal: number, tipe: TipeSoalWarung, stimulus: string): ButirKerja {
  return {
    asal,
    nomor: null,
    tipe,
    stimulus,
    pertanyaan: "",
    gambar_url: "",
    opsi: [],
    kunci: "",
    pembahasan: "",
    masalah: [],
    berkasGambar: [],
  };
}

function bacaNaskah(blok: BlokDocx[]): { butir: ButirKerja[]; catatan: string[] } {
  const catatan: string[] = [];
  const butir: ButirKerja[] = [];

  /** Tipe berlaku untuk butir BERIKUTNYA saja, lalu kembali ke PG. */
  let tipeMenunggu: TipeSoalWarung | null = null;
  let stimulusMenunggu = "";
  let sekarang: ButirKerja | null = null;
  let bagian: "pertanyaan" | "opsi" | "pembahasan" | null = null;
  let baris = 0;

  const tutup = () => {
    if (sekarang) butir.push(sekarang);
    sekarang = null;
    bagian = null;
  };

  for (const b of blok) {
    if (b.jenis !== "paragraf") continue;
    const p = b as ParagrafDocx;
    baris++;
    const teks = p.teks.trim();

    if (p.gambar.length && sekarang) sekarang.berkasGambar.push(...p.gambar);
    if (!teks) continue;

    const mTipe = POLA_TIPE.exec(teks);
    if (mTipe) {
      tipeMenunggu = keTipe(mTipe[1]);
      continue;
    }

    const mStimulus = POLA_STIMULUS.exec(teks);
    if (mStimulus) {
      stimulusMenunggu = mStimulus[1].trim();
      continue;
    }

    const mKunci = POLA_KUNCI.exec(teks);
    if (mKunci && sekarang) {
      sekarang.kunci = mKunci[1].trim();
      bagian = null;
      continue;
    }

    const mBahas = POLA_PEMBAHASAN.exec(teks);
    if (mBahas && sekarang) {
      sekarang.pembahasan = mBahas[1].trim();
      bagian = "pembahasan";
      continue;
    }

    // Soal baru bisa datang dalam dua rupa: nomor yang DIKETIK ("1. ...") atau
    // butir daftar bernomor OTOMATIS Word — yang teksnya tidak memuat angka
    // sama sekali, karena nomornya digambar Word saat mencetak. Rupa kedua ini
    // yang paling sering dipakai pengajar, sebab Word mengubah "1." menjadi
    // daftar otomatis begitu ditekan Enter.
    const mNomor = POLA_NOMOR.exec(teks);
    const daftarTingkatSatu = p.berdaftar && p.tingkatDaftar === 0 && !POLA_OPSI.test(teks);
    if ((mNomor && !p.berdaftar) || daftarTingkatSatu) {
      tutup();
      sekarang = butirBaru(baris, tipeMenunggu ?? "PG", stimulusMenunggu);
      tipeMenunggu = null;
      stimulusMenunggu = "";
      // Daftar otomatis tidak punya nomor tertulis; biarkan kosong supaya
      // parseBerkasWarung mengisinya urut.
      sekarang.nomor = mNomor && !p.berdaftar ? Number.parseInt(mNomor[1], 10) : null;
      sekarang.pertanyaan = mNomor && !p.berdaftar
        ? potongAwalanHtml(p.html, mNomor[0].length - mNomor[2].length)
        : p.html;
      bagian = "pertanyaan";
      if (p.gambar.length) sekarang.berkasGambar.push(...p.gambar);
      continue;
    }

    if (!sekarang) continue;

    // Isian singkat tidak punya pilihan, jadi baris berawalan huruf pun
    // diperlakukan sebagai lanjutan pertanyaan.
    if (sekarang.tipe !== "IS") {
      const mOpsi = POLA_OPSI.exec(teks);
      if (mOpsi) {
        // Versi HTML-nya yang disimpan, bukan teks polos: pangkat dan indeks
        // ikut menentukan arti pilihan pada soal PK dan PM.
        sekarang.opsi.push(potongAwalanHtml(p.html, mOpsi[0].length - mOpsi[2].length));
        bagian = "opsi";
        continue;
      }
      const sebaris = pecahOpsiSebaris(teks);
      if (sebaris && sekarang.opsi.length === 0) {
        sekarang.opsi.push(...sebaris);
        bagian = "opsi";
        continue;
      }
      // Pilihan yang ditulis sebagai daftar otomatis Word di bawah soalnya:
      // hurufnya digambar Word, jadi tidak ada "A." untuk dicocokkan.
      if (p.berdaftar && p.tingkatDaftar >= 1) {
        sekarang.opsi.push(p.html);
        bagian = "opsi";
        continue;
      }
    }

    if (bagian === "pembahasan") {
      sekarang.pembahasan = `${sekarang.pembahasan}\n${teks}`.trim();
    } else if (bagian === "opsi" && sekarang.opsi.length) {
      sekarang.opsi[sekarang.opsi.length - 1] += ` ${p.html}`;
    } else {
      sekarang.pertanyaan = `${sekarang.pertanyaan}\n${p.html}`.trim();
    }
  }
  tutup();

  if (butir.length === 0) {
    catatan.push(
      'Tidak ada soal yang terbaca. Pastikan tiap soal diawali penomoran seperti "1." dan tiap pilihan diawali "A.".',
    );
  }
  return { butir, catatan };
}

/**
 * Salin gambar dari dalam .docx ke public/warung/<SUBTES>-<nomor>/.
 *
 * Penulisannya diserahkan ke `simpanGambarSoal()` — pintu yang sama dengan
 * unggahan manual dari formulir soal Warung, sehingga keduanya menghasilkan
 * nama berkas dan folder yang persis sama. Dua kerusakan ikut tertutup di sini:
 *
 *   1. Ekstensinya dulu diambil dari `jenisGambar()`, yang mengembalikan JENIS
 *      MIME ("image/png"), bukan ekstensi. Nama berkasnya menjadi
 *      "<sidik>.image/png" — mengandung garis miring, sehingga penulisannya
 *      selalu gagal dan naskah Warung bergambar tidak pernah benar-benar
 *      terimpor.
 *   2. Nama foldernya dulu dikecilkan menjadi "pk-1", padahal alamat yang
 *      tersimpan di basis data berbunyi "/warung/PK-1/…". Di Windows itu tidak
 *      terasa, di server Linux gambarnya hilang.
 *
 * `jenisGambar(nama)` tetap dipakai sebagai saringan cepat berdasarkan nama
 * berkas di dalam .docx; keputusan akhir tetap pada isi berkasnya.
 */
async function simpanGambar(
  media: Map<string, Uint8Array>,
  berkas: string[],
  folderPaket: string,
): Promise<string> {
  for (const nama of berkas) {
    const isi = media.get(nama);
    if (!isi) continue;
    if (!jenisGambar(nama)) continue;
    try {
      const { url } = await simpanGambarSoal(isi, "warung", folderPaket);
      return url;
    } catch {
      // Isinya ternyata bukan gambar yang dikenali; coba lampiran berikutnya.
      continue;
    }
  }
  return "";
}

/* ==========================================================================
   JALUR 2 — TABEL
   ========================================================================== */

async function bacaBerkasTabel(nama: string, data: ArrayBuffer): Promise<BarisWarung[]> {
  const { baris } = await bacaTabel(nama, data);

  return baris.map((b) => {
    const opsi = ["a", "b", "c", "d", "e", "f"].map((h, i) =>
      sel(b, `opsi_${h}`, h, `pernyataan_${i + 1}`),
    );
    while (opsi.length && opsi[opsi.length - 1] === "") opsi.pop();

    const nomor = Number.parseInt(sel(b, "nomor", "no"), 10);

    return {
      asal: b.nomorBaris,
      nomor: Number.isInteger(nomor) && nomor > 0 ? nomor : null,
      tipe: keTipe(sel(b, "tipe", "bentuk")),
      stimulus: sel(b, "stimulus", "bacaan"),
      pertanyaan: sel(b, "pertanyaan", "soal"),
      gambar_url: sel(b, "gambar_url", "gambar"),
      opsi,
      kunci: sel(b, "kunci", "kunci_jawaban", "jawaban"),
      pembahasan: sel(b, "pembahasan", "penjelasan"),
      masalah: [],
    };
  });
}

/* ==========================================================================
   PEMERIKSAAN
   ========================================================================== */

/** "B, S, B" / "BSB" / "[\"B\",\"S\"]" -> ["B","S","B"] */
export function pecahKunciPgk(kunci: string, jumlahPernyataan: number): string[] {
  const v = kunci.trim();
  if (!v) return [];
  try {
    const p = JSON.parse(v) as unknown;
    if (Array.isArray(p)) return p.map((x) => String(x).trim().toUpperCase());
  } catch {
    /* bukan JSON, lanjut ke bentuk lain */
  }
  const dipisah = v
    .split(/[,;\s|-]+/)
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);
  if (dipisah.length > 1) return dipisah;

  // Ditulis rapat seperti "BSBSBS": pecah huruf demi huruf.
  const rapat = v.toUpperCase().replace(/[^BS]/g, "");
  if (rapat.length === jumlahPernyataan) return rapat.split("");
  return dipisah;
}

function periksaSemua(baris: BarisWarung[]): void {
  const terlihat = new Map<number, number>();

  for (const b of baris) {
    const masalah: string[] = [];

    try {
      periksaSoal({
        paket_id: 0,
        nomor: b.nomor ?? 1,
        tipe: b.tipe,
        stimulus: b.stimulus,
        pertanyaan: b.pertanyaan,
        gambar_url: b.gambar_url,
        opsi: b.opsi,
        kunci: b.tipe === "PGK" ? pecahKunciPgk(b.kunci, b.opsi.length) : b.kunci,
        pembahasan: b.pembahasan,
      });
    } catch (e) {
      masalah.push(e instanceof Error ? e.message : String(e));
    }

    if (b.nomor != null) {
      const sebelumnya = terlihat.get(b.nomor);
      if (sebelumnya) masalah.push(`Nomor ${b.nomor} kembar dengan baris ${sebelumnya}.`);
      else terlihat.set(b.nomor, b.asal);
    }

    b.masalah = masalah;
  }
}

export async function parseBerkasWarung(
  namaFile: string,
  data: ArrayBuffer,
  opsi: { folderPaket: string; simpanGambar: boolean },
): Promise<HasilParseWarung> {
  const ext = namaFile.toLowerCase().split(".").pop() ?? "";
  const catatan: string[] = [];
  let baris: BarisWarung[] = [];
  let sumber: "naskah-word" | "tabel" = "tabel";

  try {
    if (ext === "docx") {
      sumber = "naskah-word";
      const { blok, media } = await bacaDocx(data);
      const { butir, catatan: c } = bacaNaskah(blok);
      catatan.push(...c);

      for (const b of butir) {
        const gambar_url = b.berkasGambar.length
          ? opsi.simpanGambar
            ? await simpanGambar(media, b.berkasGambar, opsi.folderPaket)
            : "(gambar disalin saat disimpan)"
          : "";
        baris.push({ ...b, gambar_url });
      }
    } else {
      baris = await bacaBerkasTabel(namaFile, data);
    }
  } catch (e) {
    return {
      baris: [],
      sumber,
      catatan,
      jumlahValid: 0,
      jumlahGalat: 0,
      errorFile: e instanceof Error ? e.message : "Berkas tidak terbaca.",
    };
  }

  // Nomor yang kosong diisi urut dari yang terbesar sejauh ini.
  let terakhir = 0;
  for (const b of baris) {
    if (b.nomor == null) b.nomor = ++terakhir;
    else terakhir = Math.max(terakhir, b.nomor);
  }

  periksaSemua(baris);

  if (baris.length === 0 && catatan.length === 0) {
    catatan.push("Tidak ada baris data yang terbaca. Periksa judul kolomnya.");
  }

  const jumlahGalat = baris.filter((b) => b.masalah.length > 0).length;
  return { baris, sumber, catatan, jumlahValid: baris.length - jumlahGalat, jumlahGalat };
}

/* ==========================================================================
   SIMPAN
   ========================================================================== */

export interface HasilSimpanWarung {
  disimpan: number;
  diperbarui: number;
  dilewati: number;
  error?: string;
}

/**
 * Tulis baris yang layak ke sebuah paket.
 *
 * `timpa` menentukan nasib nomor yang sudah ada: diperbarui, atau dilewati.
 * Seluruh baris ditulis dalam satu transaksi supaya impor yang gagal di tengah
 * tidak meninggalkan paket setengah terisi.
 */
export async function simpanImporWarung(
  paketId: number,
  baris: BarisWarung[],
  timpa: boolean,
): Promise<HasilSimpanWarung> {
  const layak = baris.filter((b) => b.masalah.length === 0 && b.nomor != null);
  if (layak.length === 0) return { disimpan: 0, diperbarui: 0, dilewati: 0 };

  try {
    return await tx(async () => {
      let disimpan = 0;
      let diperbarui = 0;
      let dilewati = 0;

      for (const b of layak) {
        const { opsi, kunci } = periksaSoal({
          paket_id: paketId,
          nomor: b.nomor!,
          tipe: b.tipe,
          stimulus: b.stimulus,
          pertanyaan: b.pertanyaan,
          gambar_url: b.gambar_url,
          opsi: b.opsi,
          kunci: b.tipe === "PGK" ? pecahKunciPgk(b.kunci, b.opsi.length) : b.kunci,
          pembahasan: b.pembahasan,
        });

        const ada = await one<{ id: number }>(
          "SELECT id FROM warung_soal WHERE paket_id = ? AND nomor = ?",
          paketId,
          b.nomor,
        );
        if (ada && !timpa) {
          dilewati++;
          continue;
        }

        const gambar = b.gambar_url.startsWith("/") ? b.gambar_url : null;

        if (ada) {
          await run(
            `UPDATE warung_soal
                SET tipe = ?, stimulus = ?, pertanyaan = ?, gambar_url = ?, opsi = ?, kunci = ?, pembahasan = ?
              WHERE id = ?`,
            b.tipe,
            b.stimulus.trim() || null,
            b.pertanyaan.trim(),
            gambar,
            JSON.stringify(opsi),
            kunci,
            b.pembahasan.trim() || null,
            ada.id,
          );
          diperbarui++;
        } else {
          await run(
            `INSERT INTO warung_soal (paket_id, nomor, tipe, stimulus, pertanyaan, gambar_url, opsi, kunci, pembahasan)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            paketId,
            b.nomor,
            b.tipe,
            b.stimulus.trim() || null,
            b.pertanyaan.trim(),
            gambar,
            JSON.stringify(opsi),
            kunci,
            b.pembahasan.trim() || null,
          );
          disimpan++;
        }
      }
      return { disimpan, diperbarui, dilewati };
    });
  } catch (e) {
    return {
      disimpan: 0,
      diperbarui: 0,
      dilewati: 0,
      error: e instanceof Error ? e.message : "Gagal menyimpan impor.",
    };
  }
}

/** Contoh isi berkas .csv untuk diunduh admin sebagai acuan kolom. */
export const TEMPLATE_CSV_WARUNG = [
  "nomor,tipe,stimulus,pertanyaan,opsi_a,opsi_b,opsi_c,opsi_d,opsi_e,kunci,pembahasan",
  '1,PG,,"Hasil dari 12 x 8 adalah ...",84,96,102,108,112,B,"12 x 8 = 96."',
  '2,PGK,,"Tentukan benar atau salah tiap pernyataan berikut.","2 adalah bilangan prima","9 adalah bilangan prima","15 habis dibagi 3",,,"B,S,B","Hanya 9 yang bukan prima."',
  '3,IS,,"Berapa hasil dari 45 : 5 ?",,,,,,9,"45 : 5 = 9."',
].join("\n");
