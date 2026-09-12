"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/auth";
import { hitungUlangPaket } from "@/lib/tryout/irt";
import { SUBTES_SKD } from "@/lib/tryout/skd";
import { LABEL_OPSI, SUBTES, type TipeSoal } from "@/lib/tryout/snbt";
import {
  type AksiState,
  type InputPaket,
  type InputSoal,
  type LevelSoal,
  type JalurPaketAdmin,
  type PaketStatus,
  type PeranPengguna,
  JALUR_PAKET,
  STATUS_PAKET,
  ambilPaketRingkas,
  beriIzinSusulan,
  beriIzinSusulanMassal,
  tutupUjianTerbengkalai,
  bukaBlokirMassal,
  bukaBlokirUjian,
  buatPaket,
  buatSoal,
  bukaPaketUntukSemua,
  cabutIzinSusulan,
  gantiNamaPengguna,
  geserSoal,
  hapusPaket,
  hapusPengguna,
  hapusPesertaPaket,
  hapusRiwayatPaket,
  hapusSoal,
  keDbDatetime,
  perbaruiPaket,
  setelKelasPaket,
  tambahPesertaPaket,
  perbaruiSoal,
  setNomorSoal,
  setPeranPengguna,
  ubahStatusPaket,
} from "@/lib/admin/admin";
import {
  type BarisImpor,
  type HasilParse,
  parseFileImpor,
  simpanHasilImpor,
} from "@/lib/naskah/import-soal";
import {
  type BarisPeserta,
  type HasilParsePeserta,
  buatPesertaManual,
  parseFilePeserta,
  simpanImporPeserta,
} from "@/lib/admin/impor-peserta";
import { bacaTabel, sel } from "@/lib/admin/impor-tabel";
import { lepasSesiPeserta, sesiPesertaTercatat } from "@/lib/auth/sesi-peserta";
import { NAMA_JALUR, keJalurPortal, setPortal } from "@/lib/admin/portal";
import { type BarisProdi, imporProdi, jumlahProdi } from "@/lib/rujukan/prodi";
import {
  ambilPaket as ambilPaketWarung,
  keSubtes,
  siapkanKerangka,
  siapkanSeluruhKerangka,
} from "@/lib/warung/warung";
import {
  type InputSoalWarung,
  buatSoal as buatSoalWarung,
  hapusSoal as hapusSoalWarung,
  kosongkanPaket as kosongkanPaketWarung,
  perbaruiPaket as perbaruiPaketWarung,
  perbaruiSoal as perbaruiSoalWarung,
  rapikanNomor as rapikanNomorWarung,
} from "@/lib/warung/warung-admin";
import {
  type HasilParseWarung,
  keTipe as keTipeWarung,
  parseBerkasWarung,
  simpanImporWarung,
} from "@/lib/warung/warung-impor";
import { buangSesi } from "@/lib/core/cache";

/* -------------------------------------------------------------------------- */

function teks(fd: FormData, nama: string): string {
  const v = fd.get(nama);
  return typeof v === "string" ? v : "";
}

function bilangan(fd: FormData, nama: string): number {
  return Number.parseInt(teks(fd, nama), 10);
}

function centang(fd: FormData, nama: string): boolean {
  const v = teks(fd, nama);
  return v === "on" || v === "1" || v === "true";
}

/**
 * Kembali ke halaman dengan pesan sukses / galat lewat query string.
 *
 * `path` boleh SUDAH membawa query sendiri (mis. `/admin/pelanggaran?paket=6`).
 * Dulu penyambungnya selalu `?`, sehingga alamatnya menjadi `?paket=6?pesan=…`:
 * pesan flash tidak pernah muncul, dan `paket` terbaca sebagai "6?pesan=…"
 * sehingga halaman melompat ke paket yang salah.
 */
function kembali(path: string, opsi: { pesan?: string; galat?: string } = {}): never {
  const q = new URLSearchParams();
  if (opsi.pesan) q.set("pesan", opsi.pesan);
  if (opsi.galat) q.set("galat", opsi.galat);
  const qs = q.toString();
  if (!qs) redirect(path);
  redirect(`${path}${path.includes("?") ? "&" : "?"}${qs}`);
}

function segarkanAdmin(path?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/paket");
  if (path) revalidatePath(path);
}

/* ==========================================================================
   PAKET
   ========================================================================== */

function bacaPaket(fd: FormData): InputPaket {
  const statusMentah = teks(fd, "status") as PaketStatus;
  const jalurMentah = teks(fd, "jalur") as JalurPaketAdmin;
  return {
    kode: teks(fd, "kode"),
    nama: teks(fd, "nama"),
    jalur: JALUR_PAKET.includes(jalurMentah) ? jalurMentah : "utbk",
    deskripsi: teks(fd, "deskripsi"),
    status: STATUS_PAKET.includes(statusMentah) ? statusMentah : "draft",
    mulai_at: keDbDatetime(teks(fd, "mulai_at")),
    selesai_at: keDbDatetime(teks(fd, "selesai_at")),
    acak_soal: centang(fd, "acak_soal"),
    tampil_pembahasan: centang(fd, "tampil_pembahasan"),
  };
}

export async function simpanPaketAction(_prev: AksiState, fd: FormData): Promise<AksiState> {
  await requireAdmin();
  const id = bilangan(fd, "id");
  const input = bacaPaket(fd);

  if (input.mulai_at && input.selesai_at && input.selesai_at <= input.mulai_at) {
    return { error: "Jadwal selesai harus setelah jadwal mulai." };
  }

  if (Number.isInteger(id) && id > 0) {
    const res = await perbaruiPaket(id, input);
    if (res.error) return { error: res.error };
    segarkanAdmin(`/admin/paket/${id}/edit`);
    kembali("/admin/paket", { pesan: `Paket ${input.kode.toUpperCase()} berhasil diperbarui.` });
  }

  const res = await buatPaket(input);
  if (res.error || !res.id) return { error: res.error ?? "Paket gagal dibuat." };
  segarkanAdmin();
  kembali(`/admin/paket/${res.id}/soal`, {
    pesan: `Paket ${input.kode.toUpperCase()} dibuat. Silakan isi bank soalnya.`,
  });
}

export async function ubahStatusPaketAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = bilangan(fd, "id");
  const status = teks(fd, "status") as PaketStatus;
  const res = await ubahStatusPaket(id, status);
  segarkanAdmin();
  kembali("/admin/paket", res.error ? { galat: res.error } : { pesan: "Status paket diperbarui." });
}

/**
 * Menilai ulang SELURUH pengerjaan yang sudah selesai pada satu paket.
 *
 * Tingkat kesulitan butir (IRT) dikalibrasi dari jawaban seluruh peserta, jadi
 * peserta yang dinilai lebih awal memakai kalibrasi yang lebih kasar. Jalankan
 * aksi ini sekali setelah semua peserta selesai supaya peringkat akhirnya adil.
 */
export async function hitungUlangPaketAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = bilangan(fd, "id");
  const jumlah = await hitungUlangPaket(id);
  segarkanAdmin();
  kembali("/admin/paket", {
    pesan:
      jumlah > 0
        ? `Penilaian ulang selesai untuk ${jumlah} pengerjaan. Peringkat sudah disegarkan.`
        : "Belum ada pengerjaan yang selesai pada paket ini.",
  });
}

/**
 * Mengosongkan riwayat pengerjaan satu paket tanpa menghapus paketnya.
 *
 * Dipakai ketika sebuah paket sudah telanjur dicoba — saat uji coba, atau
 * tryout yang harus diulang — sebab peserta yang pengerjaannya sudah selesai
 * selalu dilempar ke halaman hasil dan tidak akan pernah bisa masuk ruang ujian
 * lagi selama barisnya masih ada.
 */
export async function hapusRiwayatPaketAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = bilangan(fd, "id");
  const res = await hapusRiwayatPaket(id, { hapusPilihanProdi: centang(fd, "prodi") });
  segarkanAdmin();

  if (res.error || !res.jejak) {
    kembali("/admin/paket", { galat: res.error ?? "Riwayat paket gagal dihapus." });
  }

  const j = res.jejak;
  const bagian = [`pengerjaan ${j.pengerjaan} peserta`];
  if (j.pelanggaran) bagian.push(`${j.pelanggaran} catatan pelanggaran`);
  if (centang(fd, "prodi") && j.pilihanProdi) bagian.push(`${j.pilihanProdi} pilihan program studi`);
  kembali("/admin/paket", {
    pesan:
      `Riwayat paket ${j.kode} dibersihkan: ${bagian.join(", ")} dihapus. ` +
      "Kalibrasi kesulitan butir ikut disetel ulang; soal dan akun siswa tetap utuh.",
  });
}

export async function hapusPaketAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = bilangan(fd, "id");
  const res = await hapusPaket(id);
  segarkanAdmin();
  kembali("/admin/paket", {
    ...(res.error
      ? { galat: res.error }
      : { pesan: "Paket beserta soal dan seluruh pengerjaannya sudah dihapus." }),
  });
}

/* ==========================================================================
   SOAL
   ========================================================================== */

function bacaSoal(fd: FormData): InputSoal {
  const tipeMentah = teks(fd, "tipe").toUpperCase();
  const tipe: TipeSoal = tipeMentah === "PGK" || tipeMentah === "BS" || tipeMentah === "IS" ? tipeMentah : "PG";
  const levelMentah = teks(fd, "level").toUpperCase();
  const level: LevelSoal = levelMentah === "C4" ? "C4" : "C3";

  return {
    package_id: bilangan(fd, "package_id"),
    subtes: teks(fd, "subtes"),
    nomor: bilangan(fd, "nomor"),
    tipe,
    level,
    stimulus: teks(fd, "stimulus"),
    pertanyaan: teks(fd, "pertanyaan"),
    gambar_url: teks(fd, "gambar_url"),
    opsi: LABEL_OPSI.map((_, i) => teks(fd, `opsi_${i}`)),
    kunci: teks(fd, "kunci"),
    pembahasan: teks(fd, "pembahasan"),
  };
}

export async function simpanSoalAction(_prev: AksiState, fd: FormData): Promise<AksiState> {
  await requireAdmin();
  const id = bilangan(fd, "id");
  const input = bacaSoal(fd);
  if (!Number.isInteger(input.package_id) || input.package_id < 1) {
    return { error: "Paket tidak dikenali." };
  }

  const tujuan = `/admin/paket/${input.package_id}/soal?subtes=${input.subtes}`;

  if (Number.isInteger(id) && id > 0) {
    const res = await perbaruiSoal(id, input);
    if (res.error) return { error: res.error };
    segarkanAdmin(`/admin/paket/${input.package_id}/soal`);
    redirect(`${tujuan}&pesan=${encodeURIComponent(`Soal nomor ${input.nomor} diperbarui.`)}`);
  }

  const res = await buatSoal(input);
  if (res.error) return { error: res.error };
  segarkanAdmin(`/admin/paket/${input.package_id}/soal`);
  redirect(`${tujuan}&pesan=${encodeURIComponent(`Soal nomor ${input.nomor} ditambahkan.`)}`);
}

export async function hapusSoalAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = bilangan(fd, "id");
  const packageId = bilangan(fd, "package_id");
  const subtes = teks(fd, "subtes");
  const res = await hapusSoal(id);
  segarkanAdmin(`/admin/paket/${packageId}/soal`);
  kembali(
    `/admin/paket/${packageId}/soal?subtes=${subtes}`,
    res.error ? { galat: res.error } : { pesan: "Soal dihapus." },
  );
}

export async function geserSoalAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = bilangan(fd, "id");
  const packageId = bilangan(fd, "package_id");
  const subtes = teks(fd, "subtes");
  const arah = teks(fd, "arah") === "naik" ? "naik" : "turun";
  const res = await geserSoal(id, arah);
  segarkanAdmin(`/admin/paket/${packageId}/soal`);
  kembali(
    `/admin/paket/${packageId}/soal?subtes=${subtes}`,
    res.error ? { galat: res.error } : { pesan: "Urutan soal diperbarui." },
  );
}

export async function setNomorSoalAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const id = bilangan(fd, "id");
  const packageId = bilangan(fd, "package_id");
  const subtes = teks(fd, "subtes");
  const res = await setNomorSoal(id, bilangan(fd, "nomor"));
  segarkanAdmin(`/admin/paket/${packageId}/soal`);
  kembali(
    `/admin/paket/${packageId}/soal?subtes=${subtes}`,
    res.error ? { galat: res.error } : { pesan: "Nomor soal diperbarui." },
  );
}

/* ==========================================================================
   PESERTA
   ========================================================================== */

export async function setPeranAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = bilangan(fd, "id");
  const peran = (teks(fd, "peran") === "admin" ? "admin" : "siswa") as PeranPengguna;
  const kembaliKe = teks(fd, "kembali_ke") || "/admin/peserta";

  if (id === admin.id && peran === "siswa") {
    kembali(kembaliKe, { galat: "Kamu tidak bisa menurunkan peran akunmu sendiri." });
  }

  const res = await setPeranPengguna(id, peran);
  revalidatePath("/admin/peserta");
  kembali(
    kembaliKe,
    res.error
      ? { galat: res.error }
      : { pesan: peran === "admin" ? "Peserta diangkat menjadi admin." : "Peran admin dicabut." },
  );
}

/**
 * Melepas kunci "satu akun satu perangkat" milik seorang peserta.
 *
 * Inilah katup pengaman aturan 8 September 2026. Peserta yang laptopnya mati,
 * perambannya menutup diri, atau yang telanjur masuk dari perangkat yang kini
 * tidak bisa disentuh lagi akan tertolak terus-menerus di halaman login sampai
 * jeda menganggur lewat. Pengawas yang berdiri di ruangan itu tidak boleh
 * disuruh menunggu sepuluh menit di tengah ujian.
 *
 * Akibatnya jelas dan sengaja keras: cookie perangkat lama LANGSUNG MATI —
 * `sid`-nya tidak cocok lagi pada permintaan berikutnya — jadi kalau perangkat
 * itu ternyata masih hidup, pesertanya ikut terlempar ke halaman login. Karena
 * itu tombolnya minta konfirmasi, dan hanya dipakai bila perangkat pertama
 * memang sudah tidak dipakai.
 */
export async function lepasPerangkatPesertaAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const userId = bilangan(fd, "user_id");
  const kembaliKe = teks(fd, "kembali_ke") || `/admin/peserta/${userId}`;

  if (!Number.isInteger(userId)) kembali(kembaliKe, { galat: "Akun tidak dikenali." });

  const sesi = await sesiPesertaTercatat(userId);
  if (!sesi) {
    kembali(kembaliKe, {
      pesan: "Akun ini memang sedang tidak terkunci di perangkat mana pun — peserta bisa langsung masuk.",
    });
  }

  await lepasSesiPeserta(userId, null);
  // Tombol "Lepaskan" harus berlaku SEKETIKA - pengawas menekannya sambil
  // berdiri di samping peserta yang perangkatnya rusak. Tanpa baris ini,
  // cookie lama masih diterima sampai UMUR.sesi detik berikutnya.
  await buangSesi(userId);
  revalidatePath("/admin/peserta");
  revalidatePath("/admin/live");
  kembali(kembaliKe, {
    pesan:
      `Kunci perangkat dilepas${sesi!.alat ? ` (${sesi!.alat})` : ""}. ` +
      "Peserta bisa masuk sekarang dari perangkat mana pun. " +
      "Bila perangkat lamanya masih terbuka, ia ikut diminta masuk ulang.",
  });
}

/**
 * Menghapus akun peserta beserta seluruh rekam jejaknya.
 *
 * Selalu kembali ke daftar peserta bila berhasil: halaman detail akun yang
 * baru saja dihapus hanya akan berakhir sebagai 404.
 */
/**
 * Menambahkan SATU peserta dari formulir di halaman Peserta.
 *
 * Diminta pengelola 11 September 2026 supaya menambah siswa susulan atau siswa
 * pindahan tidak lagi menuntut berkas Excel berisi satu baris. Impor Excel
 * tetap ada dan tetap jalur untuk satu angkatan sekaligus.
 *
 * Kembalinya membawa `kelas` di alamat supaya halaman langsung membuka kelas
 * yang barusan diisi: menambah siswa hampir selalu dikerjakan beberapa orang
 * berturut-turut untuk kelas yang sama.
 */
export async function tambahPesertaAction(fd: FormData): Promise<void> {
  await requireAdmin();

  const nama = teks(fd, "nama").trim();
  const nisn = teks(fd, "nisn").trim();
  const kelas = teks(fd, "kelas").trim();

  const hasil = await buatPesertaManual({
    nisn,
    nama,
    kelas,
    password: teks(fd, "password"),
    asal_sekolah: teks(fd, "asal_sekolah"),
    no_hp: teks(fd, "no_hp"),
  });

  const tujuan = kelas ? `/admin/peserta?kelas=${encodeURIComponent(kelas)}` : "/admin/peserta";
  if (hasil.error) kembali(tujuan, { galat: hasil.error });

  revalidatePath("/admin/peserta");
  kembali(tujuan, {
    pesan:
      `${nama} ditambahkan${kelas ? ` ke kelas ${kelas}` : " tanpa kelas"}. ` +
      `Ia masuk memakai NISN ${nisn} dan kata sandi yang barusan kamu isi — catat dulu sebelum menutup halaman ini.`,
  });
}

export async function hapusPesertaAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = bilangan(fd, "id");
  const kembaliKe = teks(fd, "kembali_ke") || "/admin/peserta";

  if (!Number.isInteger(id)) kembali(kembaliKe, { galat: "Akun tidak dikenali." });

  const res = await hapusPengguna(id, admin.id);
  if (res.error) kembali(kembaliKe, { galat: res.error });

  segarkanAdmin("/admin/peserta");
  revalidatePath("/admin/live");
  revalidatePath("/admin/pelanggaran");

  const jejak = res.jejak!;
  const ikut = [
    jejak.tryout ? `${jejak.tryout} pengerjaan tryout` : "",
    jejak.warung ? `${jejak.warung} sesi Warung` : "",
  ].filter(Boolean);
  kembali("/admin/peserta", {
    pesan: `Akun ${jejak.nama} dihapus permanen${ikut.length ? ` beserta ${ikut.join(" dan ")}` : ""}.`,
  });
}

/* ==========================================================================
   DAFTAR PESERTA PER PAKET
   ========================================================================== */

/** Simpan kelas mana saja yang boleh mengikuti paket ini. */
export async function setelKelasPaketAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const packageId = bilangan(fd, "package_id");
  const kembaliKe = `/admin/paket/${packageId}/peserta`;
  if (!Number.isInteger(packageId)) kembali("/admin/paket", { galat: "Paket tidak dikenali." });

  const kelas = fd.getAll("kelas").filter((v): v is string => typeof v === "string");
  await setelKelasPaket(packageId, kelas);
  segarkanPeserta(packageId);
  kembali(kembaliKe, {
    pesan:
      kelas.length === 0
        ? "Tidak ada kelas yang dipilih."
        : `${kelas.length} kelas disimpan sebagai peserta paket ini.`,
  });
}

/** Daftarkan satu peserta ke paket, di luar kelas yang sudah dicentang. */
export async function tambahPesertaPaketAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const packageId = bilangan(fd, "package_id");
  const userId = bilangan(fd, "user_id");
  const kembaliKe = `/admin/paket/${packageId}/peserta`;

  if (!Number.isInteger(packageId) || !Number.isInteger(userId)) {
    kembali(kembaliKe, { galat: "Peserta atau paket tidak dikenali." });
  }

  const res = await tambahPesertaPaket(packageId, userId);
  segarkanPeserta(packageId);
  kembali(
    kembaliKe,
    res.error ? { galat: res.error } : { pesan: "Peserta ditambahkan ke daftar paket ini." },
  );
}

export async function hapusPesertaPaketAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const packageId = bilangan(fd, "package_id");
  const userId = bilangan(fd, "user_id");

  await hapusPesertaPaket(packageId, userId);
  segarkanPeserta(packageId);
  kembali(`/admin/paket/${packageId}/peserta`, { pesan: "Peserta dikeluarkan dari daftar." });
}

/**
 * Buang seluruh pembatas paket ini. Jalan keluar tercepat bila paket telanjur
 * terkunci pada hari-H — satu tombol, bukan mencabut satu per satu.
 */
export async function bukaPaketSemuaAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const packageId = bilangan(fd, "package_id");

  await bukaPaketUntukSemua(packageId);
  segarkanPeserta(packageId);
  kembali(`/admin/paket/${packageId}/peserta`, {
    pesan: "Pembatas dibuang. Paket ini kembali terbuka untuk semua peserta.",
  });
}

/** Beranda siswa ikut disegarkan: di sanalah paketnya muncul atau menghilang. */
function segarkanPeserta(packageId: number): void {
  revalidatePath(`/admin/paket/${packageId}/peserta`);
  revalidatePath("/admin/paket");
  revalidatePath("/dashboard");
  revalidatePath("/to-pekan-ini");
}

/* ==========================================================================
   UJIAN SUSULAN
   ========================================================================== */

/** Beri peserta hak mengikuti ujian susulan untuk satu paket. */
export async function beriSusulanAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = bilangan(fd, "user_id");
  const packageId = bilangan(fd, "package_id");
  const kembaliKe = teks(fd, "kembali_ke") || `/admin/peserta/${userId}`;

  if (!Number.isInteger(userId) || !Number.isInteger(packageId)) {
    kembali(kembaliKe, { galat: "Peserta atau paket tidak dikenali." });
  }

  const res = await beriIzinSusulan(userId, packageId, admin.id, teks(fd, "catatan"));
  revalidatePath("/admin/peserta");
  revalidatePath("/dashboard");
  kembali(
    kembaliKe,
    res.error
      ? { galat: res.error }
      : { pesan: "Izin ujian susulan diberikan. Tombolnya sudah muncul di beranda peserta." },
  );
}

/**
 * DIBUKA — peserta yang terblokir MELANJUTKAN pengerjaannya.
 *
 * Sengaja dipisahkan dari izin Ujian Susulan, karena akibatnya berlawanan:
 * yang ini tidak menghapus satu pun jawaban, sedangkan susulan mengulang dari
 * nol. Lihat `bukaBlokirUjian()` untuk alasan lengkapnya.
 */
export async function bukaBlokirAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = bilangan(fd, "user_id");
  const packageId = bilangan(fd, "package_id");
  const kembaliKe = teks(fd, "kembali_ke") || `/admin/peserta/${userId}`;

  if (!Number.isInteger(userId) || !Number.isInteger(packageId)) {
    kembali(kembaliKe, { galat: "Peserta atau paket tidak dikenali." });
  }

  const res = await bukaBlokirUjian(userId, packageId, admin.id);
  segarkanBlokir();

  if (res.error) kembali(kembaliKe, { galat: res.error });

  const bagian = [
    res.subtes
      ? `Blokir dibuka. Peserta melanjutkan subtes ${res.subtes}`
      : "Blokir dibuka. Peserta bisa melanjutkan ujiannya",
  ];
  if (res.dikembalikanDetik) {
    bagian.push(`sisa waktunya dikembalikan ${Math.round(res.dikembalikanDetik / 60)} menit`);
  }
  if (res.lewatSusulan) {
    bagian.push("jendela paket sudah tutup, jadi aksesnya dibuka lewat jalur susulan");
  }
  kembali(kembaliKe, { pesan: bagian.join(" · ") + ". Jawaban yang sudah terisi tetap utuh." });
}

/** Buka blokir SEMUA peserta yang gugur pada satu paket sekaligus. */
export async function bukaBlokirSemuaAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const packageId = bilangan(fd, "package_id");
  const kembaliKe = `/admin/pelanggaran?paket=${packageId}`;

  if (!Number.isInteger(packageId)) {
    kembali("/admin/pelanggaran", { galat: "Paket tidak dikenali." });
  }

  const res = await bukaBlokirMassal(packageId, admin.id);
  segarkanBlokir();
  kembali(
    kembaliKe,
    res.error
      ? { galat: res.error }
      : {
          pesan:
            res.jumlah === 0
              ? "Tidak ada peserta terblokir yang perlu dibuka."
              : `Blokir dibuka untuk ${res.jumlah} peserta. Mereka melanjutkan dari subtes yang ` +
                "tadi terpotong, dan jawaban yang sudah terisi tetap utuh.",
        },
  );
}

/**
 * Tutup dan nilai pengerjaan yang waktunya sudah habis tetapi statusnya masih
 * `ongoing`.
 *
 * Ditekan pengelola, bukan berjalan sendiri: penutupan memunculkan nilai baru
 * di peringkat, dan itu keputusan yang harus disengaja.
 */
export async function tutupTerbengkalaiAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const packageId = bilangan(fd, "package_id");
  const kembaliKe = `/admin/pelanggaran?paket=${packageId}`;

  if (!Number.isInteger(packageId)) {
    kembali("/admin/pelanggaran", { galat: "Paket tidak dikenali." });
  }

  const res = await tutupUjianTerbengkalai(packageId);
  revalidatePath("/admin/pelanggaran");
  revalidatePath("/admin/peserta");
  revalidatePath("/admin/live");
  revalidatePath("/dashboard");
  kembali(
    kembaliKe,
    {
      pesan:
        res.jumlah === 0
          ? "Tidak ada pengerjaan terbengkalai pada paket ini."
          : `${res.jumlah} pengerjaan ditutup dan dinilai. Jawaban yang sudah terisi ikut ` +
            "dihitung, jadi peserta tidak kehilangan pekerjaannya.",
    },
  );
}

function segarkanBlokir(): void {
  revalidatePath("/admin/pelanggaran");
  revalidatePath("/admin/peserta");
  revalidatePath("/admin/live");
  revalidatePath("/dashboard");
}

/**
 * Bukakan ujian susulan untuk SEMUA peserta yang gugur pada satu paket.
 * Satu tombol, karena jumlahnya bisa ratusan dalam satu tryout.
 */
export async function bukaSusulanSemuaGugurAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const packageId = bilangan(fd, "package_id");
  const kembaliKe = `/admin/pelanggaran?paket=${packageId}`;

  if (!Number.isInteger(packageId)) {
    kembali("/admin/pelanggaran", { galat: "Paket tidak dikenali." });
  }

  const res = await beriIzinSusulanMassal(packageId, admin.id, teks(fd, "catatan"));
  revalidatePath("/admin/pelanggaran");
  revalidatePath("/admin/peserta");
  revalidatePath("/dashboard");
  kembali(
    kembaliKe,
    res.error
      ? { galat: res.error }
      : {
          pesan:
            res.jumlah === 0
              ? "Semua peserta yang gugur sudah punya izin susulan — tidak ada yang perlu dibuka."
              : `Ujian susulan dibuka untuk ${res.jumlah} peserta yang gugur. ` +
                "Tombolnya sudah muncul di beranda mereka.",
        },
  );
}

export async function cabutSusulanAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const userId = bilangan(fd, "user_id");
  const packageId = bilangan(fd, "package_id");
  const kembaliKe = teks(fd, "kembali_ke") || `/admin/peserta/${userId}`;

  await cabutIzinSusulan(userId, packageId);
  revalidatePath("/admin/peserta");
  revalidatePath("/dashboard");
  kembali(kembaliKe, { pesan: "Izin ujian susulan dicabut." });
}

/* ==========================================================================
   IMPOR PESERTA (NISN)
   ========================================================================== */

export interface ImporPesertaState {
  hasil?: HasilParsePeserta;
  namaFile?: string;
  pesan?: string;
  error?: string;
  selesai?: boolean;
}

/** Batas ukuran berkas impor — cukup untuk ribuan baris, cukup ketat untuk RAM. */
const MAKS_BERKAS = 10 * 1024 * 1024;

function periksaBerkas(berkas: FormDataEntryValue | null): { file?: File; error?: string } {
  if (!(berkas instanceof File) || berkas.size === 0) {
    return { error: "Pilih dulu berkas .xlsx atau .csv yang mau diimpor." };
  }
  if (berkas.size > MAKS_BERKAS) return { error: "Ukuran berkas maksimal 10 MB." };
  const ekstensi = berkas.name.toLowerCase().split(".").pop() ?? "";
  if (!["xlsx", "csv", "txt"].includes(ekstensi)) {
    return { error: "Format berkas harus .xlsx atau .csv." };
  }
  return { file: berkas };
}

export async function imporPesertaAction(
  _prev: ImporPesertaState,
  fd: FormData,
): Promise<ImporPesertaState> {
  await requireAdmin();

  const cek = periksaBerkas(fd.get("berkas"));
  if (!cek.file) return { error: cek.error };

  const hasil = await parseFilePeserta(cek.file.name, await cek.file.arrayBuffer());
  if (hasil.errorFile) return { hasil, namaFile: cek.file.name, error: hasil.errorFile };

  if (!centang(fd, "konfirmasi")) {
    return {
      hasil,
      namaFile: cek.file.name,
      pesan:
        hasil.jumlahValid > 0
          ? `${hasil.jumlahValid} baris siap disimpan (${hasil.jumlahPerbarui} di antaranya memperbarui akun yang sudah ada). Periksa pratinjau, lalu tekan Simpan.`
          : "Tidak ada baris yang bisa disimpan. Perbaiki dulu galat di bawah.",
    };
  }

  if (hasil.jumlahValid === 0) {
    return { hasil, namaFile: cek.file.name, error: "Tidak ada baris valid untuk disimpan." };
  }

  const simpan = await simpanImporPeserta(hasil.baris as BarisPeserta[]);
  segarkanAdmin("/admin/peserta");
  return {
    hasil,
    namaFile: cek.file.name,
    selesai: true,
    pesan: `Selesai: ${simpan.ditambah} akun baru, ${simpan.diperbarui} akun diperbarui${
      simpan.gagal > 0 ? `, ${simpan.gagal} gagal` : ""
    }.`,
  };
}

/* ==========================================================================
   IMPOR KATALOG PROGRAM STUDI
   ========================================================================== */

export interface ImporProdiState {
  pesan?: string;
  error?: string;
  selesai?: boolean;
  contoh?: { nama: string; ptn: string }[];
}

export async function imporProdiAction(
  _prev: ImporProdiState,
  fd: FormData,
): Promise<ImporProdiState> {
  await requireAdmin();

  const cek = periksaBerkas(fd.get("berkas"));
  if (!cek.file) return { error: cek.error };

  let tabel;
  try {
    tabel = await bacaTabel(cek.file.name, await cek.file.arrayBuffer());
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Berkas tidak dapat dibaca." };
  }

  const baris: BarisProdi[] = [];
  for (const b of tabel.baris) {
    const nama = sel(b, "program studi", "prodi", "nama prodi", "programstudi", "nama");
    const ptn = sel(b, "universitas", "ptn", "kampus", "perguruan tinggi", "nama ptn");
    if (!nama || !ptn) continue;
    baris.push({
      nama,
      ptn,
      jenjang: sel(b, "jenjang", "strata") || undefined,
      kelompok: sel(b, "kelompok", "rumpun", "jurusan") || undefined,
    });
  }

  if (baris.length === 0) {
    return {
      error:
        "Tidak ada baris yang terbaca. Pastikan berkas punya kolom judul \"Program Studi\" dan \"Universitas\".",
    };
  }

  const hasil = await imporProdi(baris, centang(fd, "hapus_dulu"));
  segarkanAdmin("/admin/prodi");

  return {
    selesai: true,
    contoh: baris.slice(0, 8).map((b) => ({ nama: b.nama.toUpperCase(), ptn: b.ptn.toUpperCase() })),
    pesan: `Selesai: ${hasil.ditambah} prodi baru, ${hasil.diperbarui} diperbarui${
      hasil.dilewati > 0 ? `, ${hasil.dilewati} dilewati` : ""
    }. Katalog kini berisi ${(await jumlahProdi()).toLocaleString("id-ID")} program studi.`,
  };
}

/* ==========================================================================
   IMPOR SOAL
   ========================================================================== */

/**
 * Pilihan penomoran di layar impor, sebagaimana dikirim formulir.
 *
 * `lanjut` adalah bawaannya, karena naskah dari guru memang datang bertahap:
 * satu berkas 20 soal PU hari ini, sisanya menyusul besok dengan penomoran
 * yang di Word kembali mulai dari 1.
 */
export type ModeImpor = "lanjut" | "berkas" | "timpa";

function keModeImpor(v: string): ModeImpor {
  return v === "berkas" || v === "timpa" ? v : "lanjut";
}

export interface ImporState {
  hasil?: HasilParse;
  namaFile?: string;
  timpa?: boolean;
  /** Cara penomoran yang dipilih admin. */
  mode?: ModeImpor;
  /** Subtes yang dipilih admin untuk naskah Word tanpa judul bagian. */
  subtesBawaan?: string;
  /** Kunci yang diketik admin di layar pratinjau, per nomor urut baris. */
  kunciManual?: Record<number, string>;
  pesan?: string;
  error?: string;
  selesai?: boolean;
}

export async function imporSoalAction(_prev: ImporState, fd: FormData): Promise<ImporState> {
  await requireAdmin();
  const packageId = bilangan(fd, "package_id");
  if (!Number.isInteger(packageId) || packageId < 1) return { error: "Paket tidak dikenali." };

  const berkas = fd.get("berkas");
  const mode = keModeImpor(teks(fd, "mode"));
  // Mode "lanjut" membagikan nomor kosong sendiri, jadi tidak pernah ada yang
  // perlu ditimpa — menimpa di situ justru bisa menghapus soal yang sah.
  const timpa = mode === "timpa";
  const konfirmasi = centang(fd, "konfirmasi");
  // Hanya dipakai naskah Word; berkas tabel selalu membawa kolom subtes sendiri.
  const subtesBawaanMentah = teks(fd, "subtes_bawaan").toUpperCase();
  const subtesDikenal = [...SUBTES, ...SUBTES_SKD].some((x) => x.kode === subtesBawaanMentah);
  const subtesBawaan = subtesDikenal ? subtesBawaanMentah : "";

  // Kunci yang diketik admin di pratinjau: satu kolom isian per baris,
  // bernama "kunci_<nomor urut baris>".
  const kunciManual: Record<number, string> = {};
  for (const [nama, nilai] of fd.entries()) {
    const cocok = /^kunci_(\d+)$/.exec(nama);
    if (!cocok || typeof nilai !== "string" || !nilai.trim()) continue;
    kunciManual[Number(cocok[1])] = nilai.trim();
  }

  // Isian yang harus ikut kembali ke formulir apa pun hasilnya, supaya pilihan
  // admin tidak tereset setiap kali pratinjau dibaca ulang.
  const isian = { timpa, mode, subtesBawaan, kunciManual };

  if (!(berkas instanceof File) || berkas.size === 0) {
    return { ...isian, error: "Pilih dulu berkas naskah Word, Excel, atau CSV yang mau diimpor." };
  }
  // Naskah Word memuat gambar soal, jadi batasnya lebih longgar daripada tabel.
  const batas = berkas.name.toLowerCase().endsWith(".docx") ? 40 : 10;
  if (berkas.size > batas * 1024 * 1024) {
    return { ...isian, error: `Ukuran berkas maksimal ${batas} MB.` };
  }

  const ekstensi = berkas.name.toLowerCase().split(".").pop() ?? "";
  if (!["docx", "xlsx", "csv", "txt"].includes(ekstensi)) {
    if (ekstensi === "doc") {
      return {
        ...isian,
        error:
          "Format .doc lama belum didukung. Buka naskahnya di Word lalu pilih Simpan Sebagai → Word Document (.docx).",
      };
    }
    return { ...isian, error: "Format berkas harus .docx, .xlsx, atau .csv." };
  }

  const paket = await ambilPaketRingkas(packageId);
  const hasil = await parseFileImpor(berkas.name, await berkas.arrayBuffer(), {
    packageId,
    kodePaket: paket?.kode ?? String(packageId),
    subtesBawaan,
    kunciManual,
    modeNomor: mode === "lanjut" ? "lanjut" : "berkas",
    // Gambar naskah baru ditulis ke `public/` ketika admin benar-benar menyimpan.
    simpanGambar: konfirmasi,
  });

  const dasar = { ...isian, hasil, namaFile: berkas.name };

  if (hasil.errorFile) return { ...dasar, error: hasil.errorFile };

  if (!konfirmasi) {
    const bagian = [`${hasil.jumlahValid} layak simpan`];
    if (hasil.jumlahKembar) bagian.push(`${hasil.jumlahKembar} sudah ada di paket`);
    if (hasil.jumlahGalat) bagian.push(`${hasil.jumlahGalat} perlu diperbaiki`);
    return {
      ...dasar,
      pesan:
        hasil.sumber === "naskah-word"
          ? `Naskah Word terbaca: ${hasil.baris.length} soal ditemukan — ${bagian.join(", ")}.`
          : `Pratinjau siap: ${hasil.baris.length} baris terbaca — ${bagian.join(", ")}.`,
    };
  }

  if (hasil.jumlahValid === 0) {
    return {
      ...dasar,
      error:
        hasil.jumlahKembar > 0
          ? `Tidak ada soal baru: ${hasil.jumlahKembar} soal di berkas ini sudah ada di paket. Kalau memang mau memperbarui isinya, pilih "Ikuti nomor berkas & timpa".`
          : "Tidak ada baris yang layak disimpan.",
    };
  }

  const simpan = await simpanHasilImpor(packageId, hasil.baris as BarisImpor[], timpa);
  if (simpan.error) return { ...dasar, error: simpan.error };

  segarkanAdmin(`/admin/paket/${packageId}/soal`);
  revalidatePath(`/admin/paket/${packageId}/import`);

  const bagian = [`${simpan.disimpan} soal baru`];
  if (simpan.diperbarui) bagian.push(`${simpan.diperbarui} soal ditimpa`);
  if (simpan.dilewati) bagian.push(`${simpan.dilewati} soal dilewati karena nomornya sudah terpakai`);
  if (hasil.jumlahKembar) bagian.push(`${hasil.jumlahKembar} soal dilewati karena sudah ada di paket`);

  return {
    ...dasar,
    selesai: true,
    pesan: `Impor selesai: ${bagian.join(", ")}.`,
  };
}

/* ==========================================================================
   PORTAL
   ========================================================================== */

/**
 * Mengunci atau membuka satu jalur latihan.
 *
 * Sengaja tidak memakai satu tombol "balik keadaan": nilai tujuannya dikirim
 * eksplisit dari formulir, sehingga dua pengawas yang menekan tombol hampir
 * bersamaan tidak saling membatalkan.
 */
export async function ubahKunciPortalAction(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const jalur = keJalurPortal(teks(fd, "jalur"));
  const terkunci = teks(fd, "terkunci") === "1";

  await setPortal(jalur, terkunci, admin.id);

  // Layar terkunci dan halaman jalur ikut dibuat ulang supaya siswa yang
  // sedang membukanya langsung melihat keadaan terbaru.
  revalidatePath("/", "layout");

  kembali("/admin/portal", {
    pesan: `Portal ${NAMA_JALUR[jalur]} ${terkunci ? "DIKUNCI" : "DIBUKA"}.`,
  });
}

/* ==========================================================================
   PROFIL ADMIN
   ========================================================================== */

/**
 * Mengganti nama tampilan akun admin yang sedang masuk.
 *
 * Sengaja hanya nama, bukan email: email adalah kunci login pengelola, dan
 * mengubahnya sambil lalu berisiko mengunci diri sendiri dari panel. Nama baru
 * langsung terbaca di seluruh aplikasi karena sesi selalu membaca ulang baris
 * pengguna dari database, bukan dari isi cookie.
 */
export async function gantiNamaAdminAction(_prev: AksiState, fd: FormData): Promise<AksiState> {
  const admin = await requireAdmin();
  const nama = teks(fd, "nama").trim().replace(/\s+/g, " ");

  if (nama.length < 2) return { error: "Nama minimal dua huruf." };
  if (nama.length > 60) return { error: "Nama terlalu panjang (maksimal 60 huruf)." };
  if (nama === admin.nama) return { ok: true, pesan: "Nama tidak berubah." };

  await gantiNamaPengguna(admin.id, nama);
  revalidatePath("/", "layout");

  return { ok: true, pesan: `Nama diperbarui menjadi "${nama}".` };
}
/* ==========================================================================
   WARUNG SOAL — 7 subtes x 30 paket
   ========================================================================== */

/** Ubah galat menjadi pesan yang bisa dibaca pengelola, bukan layar merah. */
function pesanGagal(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Terjadi galat yang tidak terduga.";
}

function segarkanWarung(subtes?: string, paketId?: number) {
  revalidatePath("/admin/warung");
  if (subtes) revalidatePath(`/admin/warung/${subtes}`);
  if (paketId) {
    revalidatePath(`/admin/warung/paket/${paketId}`);
    revalidatePath(`/admin/warung/paket/${paketId}/impor`);
  }
  // Lobi, daftar paket, dan papan peringkat siswa ikut dibuat ulang.
  revalidatePath("/warung");
  revalidatePath("/warung/peringkat");
  if (subtes) revalidatePath(`/warung/${subtes}`);
}

/**
 * Menyiapkan kerangka 30 paket untuk seluruh subtes.
 *
 * Dipanggil dari tombol di panel admin, bukan otomatis saat halaman dibuka,
 * supaya penulisan ke database hanya terjadi ketika pengelola memang memintanya.
 */
export async function siapkanKerangkaWarungAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const subtes = keSubtes(teks(fd, "subtes"));
  if (subtes) await siapkanKerangka(subtes);
  else await siapkanSeluruhKerangka();

  segarkanWarung(subtes ?? undefined);
  kembali(subtes ? `/admin/warung/${subtes}` : "/admin/warung", {
    pesan: subtes
      ? `Kerangka 30 paket ${subtes} siap.`
      : "Kerangka 30 paket untuk ketujuh subtes siap.",
  });
}

export async function simpanPaketWarungAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const paketId = bilangan(fd, "paket_id");
  const paket = await ambilPaketWarung(paketId);
  if (!paket) return kembali("/admin/warung", { galat: "Paket tidak dikenali." });

  await perbaruiPaketWarung(paketId, teks(fd, "judul"), teks(fd, "catatan"));
  segarkanWarung(paket.subtes, paketId);
  kembali(`/admin/warung/paket/${paketId}`, { pesan: "Keterangan paket disimpan." });
}

export async function kosongkanPaketWarungAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const paketId = bilangan(fd, "paket_id");
  const paket = await ambilPaketWarung(paketId);
  if (!paket) return kembali("/admin/warung", { galat: "Paket tidak dikenali." });

  const n = await kosongkanPaketWarung(paketId);
  segarkanWarung(paket.subtes, paketId);
  kembali(`/admin/warung/paket/${paketId}`, { pesan: `${n} soal dihapus dari paket ini.` });
}

/* --------------------------- butir soal --------------------------- */

/**
 * Menyusun satu butir dari isian formulir.
 *
 * Bentuk kuncinya berbeda-beda menurut tipe: satu huruf untuk pilihan ganda,
 * larik "B"/"S" sepanjang pernyataan untuk pilihan ganda kompleks, dan teks
 * bebas untuk isian singkat.
 */
function inputSoalWarung(fd: FormData): InputSoalWarung {
  const tipe = keTipeWarung(teks(fd, "tipe"));
  const huruf = ["a", "b", "c", "d", "e", "f"];
  const opsi = huruf.map((h) => teks(fd, `opsi_${h}`));

  let kunci: string | string[];
  if (tipe === "IS") {
    kunci = teks(fd, "kunci_is");
  } else if (tipe === "PGK") {
    const terisi = opsi.filter((o) => o.trim() !== "").length;
    kunci = huruf.slice(0, terisi).map((h) => teks(fd, `kunci_bs_${h}`) || "B");
  } else {
    kunci = teks(fd, "kunci");
  }

  return {
    paket_id: bilangan(fd, "paket_id"),
    nomor: bilangan(fd, "nomor"),
    tipe,
    stimulus: teks(fd, "stimulus"),
    pertanyaan: teks(fd, "pertanyaan"),
    gambar_url: teks(fd, "gambar_url"),
    opsi,
    kunci,
    pembahasan: teks(fd, "pembahasan"),
  };
}

export async function simpanSoalWarungAction(_prev: AksiState, fd: FormData): Promise<AksiState> {
  await requireAdmin();
  const soalId = bilangan(fd, "soal_id");
  const suntingan = Number.isInteger(soalId) && soalId > 0;

  try {
    const input = inputSoalWarung(fd);
    if (suntingan) await perbaruiSoalWarung(soalId, input);
    else await buatSoalWarung(input);

    const paket = await ambilPaketWarung(input.paket_id);
    segarkanWarung(paket?.subtes, input.paket_id);

    return {
      ok: true,
      pesan: suntingan
        ? `Soal nomor ${input.nomor} diperbarui.`
        : `Soal nomor ${input.nomor} ditambahkan.`,
    };
  } catch (e) {
    return { error: pesanGagal(e) };
  }
}

export async function hapusSoalWarungAction(fd: FormData): Promise<void> {
  await requireAdmin();
  const paketId = bilangan(fd, "paket_id");
  const soalId = bilangan(fd, "soal_id");
  const paket = await ambilPaketWarung(paketId);

  await hapusSoalWarung(soalId);
  // Nomor dirapatkan lagi supaya tidak ada nomor bolong di dalam paket.
  await rapikanNomorWarung(paketId);

  segarkanWarung(paket?.subtes, paketId);
  kembali(`/admin/warung/paket/${paketId}`, { pesan: "Soal dihapus." });
}

/* --------------------------- impor berkas --------------------------- */

export interface ImporWarungState {
  hasil?: HasilParseWarung;
  namaFile?: string;
  timpa?: boolean;
  pesan?: string;
  error?: string;
  selesai?: boolean;
}

export async function imporWarungAction(
  _prev: ImporWarungState,
  fd: FormData,
): Promise<ImporWarungState> {
  await requireAdmin();
  const paketId = bilangan(fd, "paket_id");
  const paket = Number.isInteger(paketId) ? await ambilPaketWarung(paketId) : undefined;
  if (!paket) return { error: "Paket latihan tidak dikenali." };

  const berkas = fd.get("berkas");
  const timpa = centang(fd, "timpa");
  const konfirmasi = centang(fd, "konfirmasi");

  if (!(berkas instanceof File) || berkas.size === 0) {
    return { error: "Pilih dulu berkas naskah Word, Excel, atau CSV yang mau diimpor.", timpa };
  }

  const ekstensi = berkas.name.toLowerCase().split(".").pop() ?? "";
  if (ekstensi === "doc") {
    return {
      error:
        "Format .doc lama belum didukung. Buka naskahnya di Word lalu pilih Simpan Sebagai → Word Document (.docx).",
      timpa,
    };
  }
  if (!["docx", "xlsx", "csv", "txt"].includes(ekstensi)) {
    return { error: "Format berkas harus .docx, .xlsx, atau .csv.", timpa };
  }
  // Naskah Word memuat gambar soal, jadi batasnya lebih longgar daripada tabel.
  const batas = ekstensi === "docx" ? 40 : 10;
  if (berkas.size > batas * 1024 * 1024) {
    return { error: `Ukuran berkas maksimal ${batas} MB.`, timpa };
  }

  const hasil = await parseBerkasWarung(berkas.name, await berkas.arrayBuffer(), {
    folderPaket: `${paket.subtes}-${paket.nomor}`,
    // Gambar naskah baru ditulis ke public/ saat admin benar-benar menyimpan.
    simpanGambar: konfirmasi,
  });

  if (hasil.errorFile) return { hasil, namaFile: berkas.name, timpa, error: hasil.errorFile };

  if (!konfirmasi) {
    return {
      hasil,
      namaFile: berkas.name,
      timpa,
      pesan: `${hasil.baris.length} soal terbaca — ${hasil.jumlahValid} layak simpan, ${hasil.jumlahGalat} perlu diperbaiki.`,
    };
  }

  if (hasil.jumlahValid === 0) {
    return { hasil, namaFile: berkas.name, timpa, error: "Tidak ada soal yang layak disimpan." };
  }

  const simpan = await simpanImporWarung(paket.id, hasil.baris, timpa);
  if (simpan.error) return { hasil, namaFile: berkas.name, timpa, error: simpan.error };

  segarkanWarung(paket.subtes, paket.id);

  const bagian = [`${simpan.disimpan} soal baru`];
  if (simpan.diperbarui) bagian.push(`${simpan.diperbarui} soal ditimpa`);
  if (simpan.dilewati) bagian.push(`${simpan.dilewati} dilewati karena nomornya sudah terpakai`);

  return {
    hasil,
    namaFile: berkas.name,
    timpa,
    selesai: true,
    pesan: `Impor selesai: ${bagian.join(", ")}.`,
  };
}
