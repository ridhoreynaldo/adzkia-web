"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminIelts } from "@/lib/auth/auth";
import { keDbDatetime } from "@/lib/admin/admin";
import { wajibFiturLanguage } from "@/lib/ielts/language";
import { simpanAudio } from "@/lib/ielts/ielts-audio";
import {
  bukaBlokirIelts,
  bukaSusulanIelts,
  gugurkanIelts,
  pengerjaanDenganPeserta,
} from "@/lib/ielts/ielts-penjagaan";
import { hitungUlangIelts } from "@/lib/ielts/ielts-peringkat";
import { GagalPasangBawaan, pasangPaketBawaan } from "@/lib/ielts/paket-bawaan";
import {
  parseNaskahIelts,
  sidikPertanyaan,
  simpanNaskahIelts,
  type HasilNaskahIelts,
  type ModeNomorIelts,
} from "@/lib/ielts/ielts-naskah";
import {
  BATAS_AUDIO_BYTE,
  BATAS_AUDIO_MB,
  GagalIelts,
  KODE_SUBTES_IELTS,
  OPSI_TFNG,
  STATUS_PAKET_IELTS,
  acakMenit,
  amanMenit,
  buatPaket,
  hapusNilaiGuru,
  hapusPaket,
  hapusRiwayatIelts,
  hapusSoal,
  kriteriaSubtes,
  labelBagianNilai,
  lepasAudio,
  menitBawaan,
  nomorTerpakai,
  paketById,
  pasangAudio,
  pertanyaanSubtes,
  presetMenit,
  resetMenitPaket,
  seksiById,
  setMenitPaket,
  setPembahasanPaket,
  setPortalIelts,
  setStatusPaket,
  simpanNilaiGuru,
  simpanSeksi,
  simpanSoal,
  soalById,
  subtesIelts,
  ubahPaket,
  ubahSoal,
  wajibSubtes,
  type MenitSubtes,
  type StatusPaketIelts,
  type TipeSoalIelts,
} from "@/lib/ielts/ielts";

/**
 * Aksi panel admin IELTS.
 *
 * Setiap aksi memanggil DUA penjaga: `requireAdminIelts()` yang menerima
 * pengelola penuh maupun pengelola berlingkup IELTS, dan
 * `wajibFiturLanguage()` yang menutup seluruh fitur lewat rem darurat. Penjaga
 * kedua tidak boleh dilewatkan hanya karena halamannya sudah dijaga — Server
 * Action punya alamatnya sendiri dan bisa dipanggil tanpa membuka halamannya.
 */
async function penjaga() {
  await wajibFiturLanguage();
  // `requireAdminIelts` — bukan `requireAdmin` — supaya pengelola berlingkup
  // IELTS bisa memakai panelnya sendiri. Pengelola penuh tetap diterima.
  return await requireAdminIelts();
}

/** Melempar balik ke halaman asal dengan pesan sukses atau galat. */
function kembali(jalan: string, kunci: "pesan" | "galat", teks: string): never {
  redirect(`${jalan}?${kunci}=${encodeURIComponent(teks)}`);
}

function pesanGagal(e: unknown, bawaan: string): string {
  return e instanceof GagalIelts ? e.message : bawaan;
}

/* ==========================================================================
   PAKET
   ========================================================================== */

export async function buatPaketIeltsAction(formData: FormData): Promise<void> {
  await penjaga();
  const kode = String(formData.get("kode") ?? "");
  const nama = String(formData.get("nama") ?? "");
  const deskripsi = String(formData.get("deskripsi") ?? "");

  let id: number;
  try {
    id = await buatPaket({ kode, nama, deskripsi });
  } catch (e) {
    kembali("/admin/ielts", "galat", pesanGagal(e, "Paket gagal dibuat."));
  }
  revalidatePath("/admin/ielts");
  redirect(`/admin/ielts/${id}?pesan=${encodeURIComponent("Paket IELTS dibuat.")}`);
}

export async function ubahPaketIeltsAction(formData: FormData): Promise<void> {
  await penjaga();
  const id = Number(formData.get("id"));
  const jalan = `/admin/ielts/${id}`;
  try {
    await ubahPaket(id, {
      nama: String(formData.get("nama") ?? ""),
      deskripsi: String(formData.get("deskripsi") ?? ""),
      mulai_at: keDbDatetime(String(formData.get("mulai_at") ?? "")) ?? "",
      selesai_at: keDbDatetime(String(formData.get("selesai_at") ?? "")) ?? "",
    });
  } catch (e) {
    kembali(jalan, "galat", pesanGagal(e, "Paket gagal disimpan."));
  }
  revalidatePath(jalan);
  kembali(jalan, "pesan", "Paket disimpan.");
}

/**
 * Menyetel status paket: draf, terbit, atau ditutup.
 *
 * Dipanggil dari DUA tempat — halaman satu paket dan daftar paket, persis
 * seperti portal tryout yang bisa menerbitkan langsung dari tabelnya. Field
 * `dari` menentukan ke mana pesannya dilempar balik supaya pengelola yang
 * menerbitkan dari daftar tidak terlempar ke halaman paket. Nilainya disaring
 * — hanya daftar IELTS yang boleh, selebihnya kembali ke halaman paket —
 * supaya Server Action ini tidak bisa dipakai melempar orang ke alamat lain.
 */
export async function setStatusPaketIeltsAction(formData: FormData): Promise<void> {
  await penjaga();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "") as StatusPaketIelts;
  const detail = `/admin/ielts/${id}`;
  const jalan = String(formData.get("dari") ?? "") === "/admin/ielts" ? "/admin/ielts" : detail;
  if (!STATUS_PAKET_IELTS.includes(status)) {
    kembali(jalan, "galat", "Status tidak dikenal.");
  }
  await setStatusPaket(id, status);
  revalidatePath(detail);
  revalidatePath("/admin/ielts");
  kembali(
    jalan,
    "pesan",
    status === "published"
      ? "Paket diterbitkan — siswa sudah bisa mengerjakannya."
      : status === "closed"
        ? "Paket ditutup."
        : "Paket dikembalikan menjadi draf.",
  );
}

/**
 * Membuka / menahan lembar pembahasan paket IELTS.
 *
 * Kembar dengan tuas `tampil_pembahasan` di portal tryout, dan sengaja berdiri
 * sebagai aksi tersendiri alih-alih menumpang `ubahPaketIeltsAction`: pengelola
 * membuka pembahasan SESUDAH ujian usai, jauh dari saat ia menyunting nama dan
 * jendela paket, dan menyatukan keduanya berarti ia harus menekan "Simpan"
 * pada formulir penuh hanya untuk membalik satu tuas.
 */
export async function setPembahasanIeltsAction(formData: FormData): Promise<void> {
  await penjaga();
  const id = Number(formData.get("id"));
  const tampil = String(formData.get("tampil") ?? "") === "1";
  const detail = `/admin/ielts/${id}`;
  const jalan = String(formData.get("dari") ?? "") === "/admin/ielts" ? "/admin/ielts" : detail;

  if (!await paketById(id)) kembali(jalan, "galat", "Paket IELTS tidak ditemukan.");

  await setPembahasanPaket(id, tampil);
  revalidatePath(detail);
  revalidatePath("/admin/ielts");
  kembali(
    jalan,
    "pesan",
    tampil
      ? "Pembahasan dibuka — siswa bisa membaca kunci dan penjelasan tiap butir yang subtesnya sudah tutup."
      : "Pembahasan ditahan — siswa hanya melihat band score-nya.",
  );
}

/**
 * HAPUS RIWAYAT paket IELTS — mengosongkan pengerjaan siswa, bukan paketnya.
 *
 * Padanan `hapusRiwayatPaketAction` di jalur UTBK, diletakkan pada urutan yang
 * sama di kolom aksi: sesudah "Hitung ulang nilai", sebelum "Hapus paket".
 * Urutan itu bukan kebetulan — yang merusak selalu paling bawah, dan yang
 * PALING merusak paling bawah sendiri.
 */
export async function hapusRiwayatIeltsAction(formData: FormData): Promise<void> {
  await penjaga();
  const id = Number(formData.get("id"));
  const detail = `/admin/ielts/${id}`;
  const jalan = String(formData.get("dari") ?? "") === "/admin/ielts" ? "/admin/ielts" : detail;

  const hasil = await hapusRiwayatIelts(id);
  if (hasil.error) kembali(jalan, "galat", hasil.error);

  revalidatePath("/admin/ielts");
  revalidatePath(detail);
  revalidatePath(`${detail}/peringkat`);
  revalidatePath("/admin/ielts/live");
  revalidatePath("/admin/ielts/peserta");
  revalidatePath("/admin/ielts/keamanan");

  const j = hasil.jejak!;
  const bagian = [`${j.pengerjaan} pengerjaan`];
  if (j.jawaban) bagian.push(`${j.jawaban} jawaban`);
  if (j.nilaiGuru) bagian.push(`${j.nilaiGuru} penilaian guru`);
  if (j.pelanggaran) bagian.push(`${j.pelanggaran} catatan keamanan`);
  kembali(
    jalan,
    "pesan",
    `Riwayat paket ${j.kode} dibersihkan — ${bagian.join(", ")} terhapus. ` +
      "Soal, rekaman, jadwal, dan akun siswa tetap utuh.",
  );
}

export async function hapusPaketIeltsAction(formData: FormData): Promise<void> {
  await penjaga();
  const id = Number(formData.get("id"));
  await hapusPaket(id);
  revalidatePath("/admin/ielts");
  kembali("/admin/ielts", "pesan", "Paket beserta seluruh soalnya dihapus.");
}

/**
 * Memasang paket IELTS bawaan aplikasi ke basis data server ini.
 *
 * Satu-satunya jalan masuk paket IELTS ke server yang dipasang lewat
 * `git push`: naskah Word dan skrip penyemainya tidak ikut ke dalam citra
 * Docker, jadi tanpa tombol ini paket hanya bisa dibangun oleh orang yang
 * punya shell di servernya. Seluruh pertimbangannya ada di `paket-bawaan.ts`.
 *
 * Rekaman ditarik dari server lama saat tombol ditekan, jadi aksi ini
 * memang lambat — puluhan megabyte lewat jaringan. Kegagalan mengunduh TIDAK
 * membatalkan pemasangan isinya; yang gagal dilaporkan sebagai peringatan dan
 * tombolnya bisa ditekan lagi.
 */
export async function pasangPaketBawaanAction(formData: FormData): Promise<void> {
  await penjaga();
  const kode = String(formData.get("kode") ?? "").trim();

  const CARA = {
    baru: "dipasang",
    "susun-ulang": "disusun ulang",
    lengkapi: "dilengkapi tanpa menghapus apa pun",
  } as const;

  let pesan: string;
  try {
    const h = await pasangPaketBawaan(kode);
    const bagian = [
      `${h.kode} ${CARA[h.mode]}`,
      `${h.butir} butir baru`,
      `${h.bagian} bagian`,
      `${h.rekaman} rekaman`,
    ];
    if (h.dilewati > 0) {
      bagian.push(`${h.dilewati} butir dilewati karena nomornya sudah terisi`);
    }
    if (h.mode === "lengkapi") {
      bagian.push(`paket ini sudah dikerjakan ${h.pengerjaan} peserta`);
    }
    pesan = bagian.join(" · ") + ".";
    if (h.peringatan.length > 0) {
      pesan += ` ${h.peringatan.length} peringatan — ${h.peringatan[0]}`;
    }
  } catch (e) {
    revalidatePath("/admin/ielts");
    kembali(
      "/admin/ielts",
      "galat",
      e instanceof GagalPasangBawaan || e instanceof GagalIelts
        ? e.message
        : `Paket bawaan gagal dipasang: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  revalidatePath("/admin/ielts");
  kembali("/admin/ielts", "pesan", pesan);
}

/**
 * HITUNG ULANG NILAI satu paket IELTS.
 *
 * Bunyinya sengaja sama dengan tombol di portal tryout supaya pengelola
 * menemukan hal yang sama di kedua jalur, tetapi pekerjaannya berbeda dan
 * perbedaannya dijelaskan panjang lebar di `hitungUlangIelts()`: band IELTS
 * tidak pernah disimpan, jadi tidak ada angka yang perlu "dihitung ulang" —
 * yang perlu dibereskan adalah subtes yang tenggatnya lewat dan pengerjaan
 * yang menggantung.
 *
 * Kalimat balasannya menyebutkan angka apa adanya, termasuk ketika tidak ada
 * yang berubah. Tombol yang selalu menjawab "berhasil" mengajari pengelola
 * untuk berhenti membaca jawabannya.
 */
export async function hitungUlangIeltsAction(formData: FormData): Promise<void> {
  await penjaga();
  const id = Number(formData.get("id"));
  const detail = `/admin/ielts/${id}`;
  const diminta = String(formData.get("dari") ?? "");
  // Hanya dua alamat yang boleh, sama seperti `setStatusPaketIeltsAction`:
  // field tersembunyi tidak boleh bisa dipakai melempar orang ke mana saja.
  const jalan =
    diminta === "/admin/ielts" || diminta === `${detail}/peringkat` ? diminta : detail;

  const paket = await paketById(id);
  if (!paket) kembali(jalan, "galat", "Paket IELTS tidak ditemukan.");

  const h = await hitungUlangIelts(id);

  revalidatePath(detail);
  revalidatePath(`${detail}/peringkat`);
  revalidatePath("/admin/ielts");

  const bagian: string[] = [`${h.diperiksa} pengerjaan diperiksa`];
  if (h.subtesDitutup > 0) bagian.push(`${h.subtesDitutup} subtes yang waktunya habis ditutup`);
  if (h.dituntaskan > 0) bagian.push(`${h.dituntaskan} pengerjaan ditandai selesai`);
  bagian.push(
    h.bandBerubah > 0 ? `${h.bandBerubah} band berubah` : "tidak ada band yang berubah",
  );

  kembali(jalan, "pesan", `${paket.kode}: ${bagian.join(", ")}.`);
}

/* ==========================================================================
   KEAMANAN UJIAN
   ========================================================================== */

/**
 * Ke mana pengawas dikembalikan sesudah menekan Hentikan / Buka sesi ulang.
 *
 * Dua tombol itu kini ada di DUA halaman — panel Keamanan Ujian dan rekap per
 * peserta — dan pengawas harus mendarat kembali di halaman tempat ia menekan,
 * bukan selalu di panel keamanan. Daftarnya sengaja tertutup: `dari` datang
 * dari kolom tersembunyi, dan kolom tersembunyi tidak boleh bisa dipakai
 * melempar orang ke alamat mana pun.
 */
function kembaliPengawas(pengerjaanId: number, paketId: number, dari: unknown): string {
  const rekap = `/admin/ielts/peserta/${pengerjaanId}`;
  return String(dari ?? "") === rekap ? rekap : `/admin/ielts/keamanan?paket=${paketId}`;
}

/**
 * DIBUKA — peserta yang dihentikan MELANJUTKAN dari subtes yang tadi terpotong.
 *
 * Padanan `bukaBlokirAction` di jalur UTBK, dan sengaja BERPASANGAN dengan
 * "Buka sesi ulang" di bawahnya. Keduanya menjawab dua keadaan yang berbeda,
 * dan memilih yang keliru merugikan peserta ke arah yang berlawanan:
 *
 *   Dibuka           → jaringannya membeku, layarnya padam, atau sistemnya
 *                      salah tangkap. Pekerjaannya masih ada dan harus
 *                      dikembalikan apa adanya.
 *   Buka sesi ulang  → ia memang harus mengulang dari nol. Padanan "Ujian
 *                      Susulan" di jalur UTBK.
 */
export async function bukaBlokirIeltsAction(formData: FormData): Promise<void> {
  await penjaga();
  const pengerjaanId = Number(formData.get("pengerjaanId"));
  const paketId = Number(formData.get("paketId"));
  const jalan = kembaliPengawas(pengerjaanId, paketId, formData.get("dari"));

  const p = await pengerjaanDenganPeserta(pengerjaanId);
  if (!p) kembali(jalan, "galat", "Pengerjaan tidak ditemukan.");

  const hasil = await bukaBlokirIelts(pengerjaanId);
  if (hasil.error) kembali(jalan, "galat", hasil.error);

  revalidatePath(jalan);
  revalidatePath(`/admin/ielts/live?paket=${paketId}`);

  const bagian = [
    hasil.subtes
      ? `Ujian ${p.nama} dibuka. Ia melanjutkan subtes ${hasil.subtes}`
      : `Ujian ${p.nama} dibuka. Ia bisa melanjutkan dari papan subtes`,
  ];
  if (hasil.dikembalikanDetik) {
    bagian.push(`sisa waktunya dikembalikan ${Math.round(hasil.dikembalikanDetik / 60)} menit`);
  }
  if (hasil.jendelaTutup) {
    bagian.push(
      "jendela paketnya sudah tutup — ia tetap bisa lanjut lewat papan subtes, " +
        "tetapi paketnya tidak lagi muncul di daftar 'Mulai ujian'",
    );
  }
  kembali(jalan, "pesan", `${bagian.join(" · ")}. Jawaban yang sudah terisi tetap utuh.`);
}

/**
 * Membuka SESI ULANG untuk peserta yang ujiannya dihentikan.
 *
 * Padanan "Ujian Susulan" di jalur UTBK, dan seperti di sana ia hanya bisa
 * dijalankan pengelola — bukan peserta, dan bukan otomatis. Jawaban lama ikut
 * dibersihkan supaya peserta benar-benar mengulang dari nol, sedangkan CATATAN
 * PELANGGARANNYA sengaja dibiarkan: itu bukti yang harus tetap terbaca
 * berbulan-bulan kemudian. Yang membuatnya tidak lagi membebani peserta adalah
 * nomor rondenya.
 */
export async function bukaSesiUlangIeltsAction(formData: FormData): Promise<void> {
  await penjaga();
  const pengerjaanId = Number(formData.get("pengerjaanId"));
  const paketId = Number(formData.get("paketId"));
  const jalan = kembaliPengawas(pengerjaanId, paketId, formData.get("dari"));

  const p = await pengerjaanDenganPeserta(pengerjaanId);
  if (!p) kembali(jalan, "galat", "Pengerjaan tidak ditemukan.");

  await bukaSusulanIelts(pengerjaanId);
  revalidatePath(jalan);
  kembali(
    jalan,
    "pesan",
    `Sesi ulang dibuka untuk ${p.nama}. Jawaban lamanya dihapus dan ia mulai dari Listening lagi.`,
  );
}

/**
 * Menghentikan ujian seorang peserta dari panel — pengawas yang melihat
 * langsung apa yang tidak bisa dilihat halaman ujian: HP kedua, catatan kertas,
 * atau teman di sebelahnya. Batas kemampuan itu memang ada, dan tombol inilah
 * jawabannya.
 */
export async function hentikanIeltsAction(formData: FormData): Promise<void> {
  const admin = await penjaga();
  const pengerjaanId = Number(formData.get("pengerjaanId"));
  const paketId = Number(formData.get("paketId"));
  const jalan = kembaliPengawas(pengerjaanId, paketId, formData.get("dari"));

  const p = await pengerjaanDenganPeserta(pengerjaanId);
  if (!p) kembali(jalan, "galat", "Pengerjaan tidak ditemukan.");
  if (p.status !== "ongoing") kembali(jalan, "galat", "Ujian ini memang sudah tidak berjalan.");

  await gugurkanIelts(
    pengerjaanId,
    "Ujian IELTS kamu dihentikan oleh pengawas di ruangan. Temui pengajar Adzkia untuk penjelasannya.",
  );
  revalidatePath(jalan);
  kembali(jalan, "pesan", `Ujian ${p.nama} dihentikan oleh ${admin.nama}.`);
}

/* ==========================================================================
   KUNCI PORTAL
   ========================================================================== */

export async function kunciPortalIeltsAction(formData: FormData): Promise<void> {
  const admin = await penjaga();
  const terkunci = String(formData.get("terkunci") ?? "") === "1";
  await setPortalIelts(terkunci, admin.id);
  revalidatePath("/admin/ielts");
  kembali(
    "/admin/ielts",
    "pesan",
    terkunci
      ? "Portal IELTS DIKUNCI — siswa tidak bisa masuk ruang ujian."
      : "Portal IELTS dibuka kembali.",
  );
}

/* ==========================================================================
   SEKSI & REKAMAN
   ========================================================================== */

export async function simpanSeksiAction(formData: FormData): Promise<void> {
  await penjaga();
  const id = Number(formData.get("seksiId"));
  const seksi = await seksiById(id);
  if (!seksi) kembali("/admin/ielts", "galat", "Bagian tidak ditemukan.");
  const jalan = `/admin/ielts/${seksi.paket_id}/${seksi.subtes.toLowerCase()}`;

  await simpanSeksi(id, {
    judul: String(formData.get("judul") ?? ""),
    instruksi: String(formData.get("instruksi") ?? ""),
    bacaan: String(formData.get("bacaan") ?? ""),
    transkrip: String(formData.get("transkrip") ?? ""),
  });
  revalidatePath(jalan);
  kembali(jalan, "pesan", "Bagian disimpan.");
}

export async function unggahAudioAction(formData: FormData): Promise<void> {
  await penjaga();
  const id = Number(formData.get("seksiId"));
  const seksi = await seksiById(id);
  if (!seksi) kembali("/admin/ielts", "galat", "Bagian tidak ditemukan.");
  const jalan = `/admin/ielts/${seksi.paket_id}/${seksi.subtes.toLowerCase()}`;

  const berkas = formData.get("audio");
  if (!(berkas instanceof File) || berkas.size === 0) {
    kembali(jalan, "galat", "Pilih berkas rekaman lebih dulu.");
  }
  if (berkas.size > BATAS_AUDIO_BYTE) {
    kembali(jalan, "galat", `Berkas melebihi ${BATAS_AUDIO_MB} MB.`);
  }

  const paket = await paketById(seksi.paket_id);
  if (!paket) kembali("/admin/ielts", "galat", "Paket tidak ditemukan.");

  try {
    const isi = new Uint8Array(await berkas.arrayBuffer());
    const hasil = await simpanAudio(isi, paket.kode);
    await pasangAudio(id, hasil.url, berkas.name);
  } catch (e) {
    kembali(jalan, "galat", e instanceof Error ? e.message : "Rekaman gagal diunggah.");
  }
  revalidatePath(jalan);
  kembali(jalan, "pesan", "Rekaman terpasang.");
}

export async function lepasAudioAction(formData: FormData): Promise<void> {
  await penjaga();
  const id = Number(formData.get("seksiId"));
  const seksi = await seksiById(id);
  if (!seksi) kembali("/admin/ielts", "galat", "Bagian tidak ditemukan.");
  const jalan = `/admin/ielts/${seksi.paket_id}/${seksi.subtes.toLowerCase()}`;
  await lepasAudio(id);
  revalidatePath(jalan);
  kembali(jalan, "pesan", "Rekaman dilepas dari bagian ini.");
}

/* ==========================================================================
   SOAL
   ========================================================================== */

/** Membaca isian editor butir menjadi bentuk yang dimengerti `simpanSoal`. */
function bacaSoal(formData: FormData) {
  const tipe = String(formData.get("tipe") ?? "IS") as TipeSoalIelts;
  const opsi = [0, 1, 2, 3].map((i) => String(formData.get(`opsi${i}`) ?? ""));
  const seksiIdMentah = String(formData.get("seksiId") ?? "");
  return {
    seksiId: seksiIdMentah && seksiIdMentah !== "0" ? Number(seksiIdMentah) : null,
    nomor: Number(formData.get("nomor")),
    tipe,
    pertanyaan: String(formData.get("pertanyaan") ?? ""),
    opsi,
    // TFNG kuncinya dipilih dari daftar baku; apa pun di luar itu ditolak.
    kunci:
      tipe === "TFNG"
        ? OPSI_TFNG.includes(String(formData.get("kunci") ?? "").toUpperCase())
          ? String(formData.get("kunci") ?? "").toUpperCase()
          : ""
        : String(formData.get("kunci") ?? ""),
    catatan: String(formData.get("catatan") ?? ""),
  };
}

export async function simpanSoalIeltsAction(formData: FormData): Promise<void> {
  await penjaga();
  const paketId = Number(formData.get("paketId"));
  const subtes = wajibSubtes(String(formData.get("subtes") ?? ""));
  const jalan = `/admin/ielts/${paketId}/${subtes.toLowerCase()}`;

  try {
    await simpanSoal(paketId, subtes, bacaSoal(formData));
  } catch (e) {
    kembali(jalan, "galat", pesanGagal(e, "Soal gagal disimpan."));
  }
  revalidatePath(jalan);
  kembali(jalan, "pesan", "Soal ditambahkan.");
}

export async function ubahSoalIeltsAction(formData: FormData): Promise<void> {
  await penjaga();
  const id = Number(formData.get("id"));
  const soal = await soalById(id);
  if (!soal) kembali("/admin/ielts", "galat", "Soal tidak ditemukan.");
  const jalan = `/admin/ielts/${soal.paket_id}/${soal.subtes.toLowerCase()}`;

  try {
    await ubahSoal(id, bacaSoal(formData));
  } catch (e) {
    kembali(jalan, "galat", pesanGagal(e, "Soal gagal disimpan."));
  }
  revalidatePath(jalan);
  kembali(jalan, "pesan", `Soal nomor ${soal.nomor} disimpan.`);
}

export async function hapusSoalIeltsAction(formData: FormData): Promise<void> {
  await penjaga();
  const id = Number(formData.get("id"));
  const soal = await soalById(id);
  if (!soal) kembali("/admin/ielts", "galat", "Soal tidak ditemukan.");
  const jalan = `/admin/ielts/${soal.paket_id}/${soal.subtes.toLowerCase()}`;
  await hapusSoal(id);
  revalidatePath(jalan);
  kembali(jalan, "pesan", `Soal nomor ${soal.nomor} dihapus.`);
}

/* ==========================================================================
   LAMA PENGERJAAN
   ========================================================================== */

/**
 * Menyimpan lama pengerjaan keempat subtes.
 *
 * Satu aksi untuk empat cara mengisinya — diketik tangan, diambil dari preset,
 * diacak, atau dikembalikan ke bawaan — supaya tombol mana pun yang ditekan
 * pengelola, yang berjalan tetap satu jalur yang sama dan hasilnya tidak pernah
 * berbeda tergantung tombolnya.
 */
export async function setMenitIeltsAction(formData: FormData): Promise<void> {
  await penjaga();
  const id = Number(formData.get("id"));
  const jalan = `/admin/ielts/${id}`;
  const cara = String(formData.get("cara") ?? "manual");

  if (cara === "bawaan") {
    await resetMenitPaket(id);
    revalidatePath(jalan);
    kembali(jalan, "pesan", "Waktu dikembalikan ke bawaan aplikasi.");
  }

  let menit: MenitSubtes;
  if (cara === "acak") {
    menit = acakMenit();
  } else if (cara === "preset") {
    const preset = presetMenit(String(formData.get("preset") ?? ""));
    if (!preset) kembali(jalan, "galat", "Susunan waktu tidak dikenal.");
    menit = preset.menit;
  } else {
    const bawaan = menitBawaan();
    menit = Object.fromEntries(
      KODE_SUBTES_IELTS.map((k) => [k, amanMenit(formData.get(`menit_${k}`), bawaan[k])]),
    ) as MenitSubtes;
  }

  await setMenitPaket(id, menit);
  revalidatePath(jalan);
  revalidatePath("/admin/ielts");
  kembali(
    jalan,
    "pesan",
    cara === "acak"
      ? `Waktu diacak — ${KODE_SUBTES_IELTS.map((k) => `${subtesIelts(k)?.nama}: ${menit[k]} menit`).join(", ")}.`
      : "Lama pengerjaan disimpan.",
  );
}

/* ==========================================================================
   PENILAIAN GURU — Writing & Speaking
   ========================================================================== */

export async function simpanNilaiGuruAction(formData: FormData): Promise<void> {
  const admin = await penjaga();
  const pengerjaanId = Number(formData.get("pengerjaanId"));
  const subtes = wajibSubtes(String(formData.get("subtes") ?? ""));
  const bagian = Number(formData.get("bagian"));
  const jalan = `/admin/ielts/nilai/${pengerjaanId}`;

  const nilai: Record<string, unknown> = {};
  for (const k of kriteriaSubtes(subtes)) {
    const v = String(formData.get(`nilai_${k.kode}`) ?? "").trim();
    if (v) nilai[k.kode] = v;
  }

  try {
    await simpanNilaiGuru(
      pengerjaanId,
      subtes,
      bagian,
      nilai,
      String(formData.get("catatan") ?? ""),
      admin.id,
    );
  } catch (e) {
    kembali(jalan, "galat", pesanGagal(e, "Nilai gagal disimpan."));
  }
  revalidatePath(jalan);
  kembali(jalan, "pesan", `${labelBagianNilai(subtes, bagian)} dinilai.`);
}

export async function hapusNilaiGuruAction(formData: FormData): Promise<void> {
  await penjaga();
  const pengerjaanId = Number(formData.get("pengerjaanId"));
  const subtes = wajibSubtes(String(formData.get("subtes") ?? ""));
  const bagian = Number(formData.get("bagian"));
  const jalan = `/admin/ielts/nilai/${pengerjaanId}`;
  await hapusNilaiGuru(pengerjaanId, subtes, bagian);
  revalidatePath(jalan);
  kembali(jalan, "pesan", `Penilaian ${labelBagianNilai(subtes, bagian)} dihapus.`);
}

/* ==========================================================================
   IMPOR NASKAH
   ========================================================================== */

export interface ImporIeltsState {
  mode?: string;
  namaFile?: string;
  hasil?: HasilNaskahIelts;
  pesan?: string;
  error?: string;
  selesai?: boolean;
}

/** Batas ukuran naskah. Word membawa gambar, jadi batasnya lebih longgar. */
const BATAS_NASKAH_MB: Record<string, number> = { docx: 40, pdf: 25, txt: 5, md: 5 };

/**
 * Membaca naskah, lalu — pada penekanan kedua — menyimpannya.
 *
 * Berkasnya sengaja DIURAI ULANG saat konfirmasi, bukan disimpan di antara dua
 * penekanan: hasil urai satu naskah Reading bisa ratusan kilobita, dan
 * mengangkutnya bolak-balik lewat keadaan formulir jauh lebih mahal daripada
 * membacanya sekali lagi. Pola yang sama dipakai impor bank soal UTBK.
 */
export async function imporNaskahIeltsAction(
  _state: ImporIeltsState,
  formData: FormData,
): Promise<ImporIeltsState> {
  await penjaga();

  const paketId = Number(formData.get("paketId"));
  const subtes = wajibSubtes(String(formData.get("subtes") ?? ""));
  const modeMentah = String(formData.get("mode") ?? "lanjut");
  const mode: ModeNomorIelts = (["lanjut", "berkas", "timpa"] as const).includes(
    modeMentah as ModeNomorIelts,
  )
    ? (modeMentah as ModeNomorIelts)
    : "lanjut";
  const konfirmasi = String(formData.get("konfirmasi") ?? "") === "1";
  const isian: ImporIeltsState = { mode };

  const berkas = formData.get("naskah");
  if (!(berkas instanceof File) || berkas.size === 0) {
    return { ...isian, error: "Pilih dulu berkas naskah .docx, .pdf, atau .txt." };
  }
  const ekstensi = berkas.name.toLowerCase().split(".").pop() ?? "";
  const batas = BATAS_NASKAH_MB[ekstensi];
  if (!batas) {
    return {
      ...isian,
      error:
        ekstensi === "doc"
          ? "Format .doc lama belum didukung. Buka di Word lalu simpan ulang sebagai .docx."
          : "Format berkas harus .docx, .pdf, atau .txt.",
    };
  }
  if (berkas.size > batas * 1024 * 1024) {
    return { ...isian, error: `Ukuran berkas ${ekstensi.toUpperCase()} maksimal ${batas} MB.` };
  }

  const hasil = await parseNaskahIelts(berkas.name, await berkas.arrayBuffer(), {
    subtes,
    mode,
    nomorTerpakai: await nomorTerpakai(paketId, subtes),
    sidikAda: new Set((await pertanyaanSubtes(paketId, subtes)).map(sidikPertanyaan)),
  });

  const dasar: ImporIeltsState = { ...isian, hasil, namaFile: berkas.name };
  if (hasil.errorFile) return { ...dasar, error: hasil.errorFile };

  if (!konfirmasi) {
    const bagian = [`${hasil.jumlahLayak} layak simpan`];
    if (hasil.jumlahKembar) bagian.push(`${hasil.jumlahKembar} sudah ada di subtes ini`);
    if (hasil.jumlahGalat) bagian.push(`${hasil.jumlahGalat} perlu diperbaiki`);
    return {
      ...dasar,
      pesan: `Naskah terbaca: ${hasil.butir.length} butir ditemukan — ${bagian.join(", ")}.`,
    };
  }

  if (hasil.jumlahLayak === 0) {
    return {
      ...dasar,
      error:
        hasil.jumlahKembar > 0
          ? `Tidak ada butir baru: ${hasil.jumlahKembar} butir di berkas ini sudah ada di subtes ini.`
          : "Tidak ada butir yang layak disimpan.",
    };
  }

  const simpan = await simpanNaskahIelts(paketId, subtes, hasil, mode);
  const jalan = `/admin/ielts/${paketId}/${subtes.toLowerCase()}`;
  revalidatePath(jalan);
  revalidatePath(`/admin/ielts/${paketId}`);

  const rekap = [`${simpan.disimpan} butir baru`];
  if (simpan.ditimpa) rekap.push(`${simpan.ditimpa} butir ditimpa`);
  if (simpan.dilewati) rekap.push(`${simpan.dilewati} butir dilewati`);
  if (simpan.seksiDiperbarui) rekap.push(`${simpan.seksiDiperbarui} bagian diperbarui`);

  return { ...dasar, selesai: true, pesan: `Impor selesai: ${rekap.join(", ")}.` };
}
