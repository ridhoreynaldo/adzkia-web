import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Alert, Card } from "@/components/ui";
import { FormMulaiUjian } from "@/components/exam/FormMulaiUjian";
import { PemberitahuanUjian } from "@/components/exam/PemberitahuanUjian";
import { requireUser } from "@/lib/auth/auth";
import { jagaPortal } from "@/lib/admin/portal";
import {
  attemptSiswa,
  getPaket,
  jumlahSoalPaket,
  paketDapatDikerjakanSusulan,
  rincianSubtesPaket,
} from "@/lib/tryout/exam";
import { pilihanLengkap } from "@/lib/rujukan/prodi";
import { mulaiSusulanAction } from "../../actions";

export const metadata = { title: "Ujian Susulan" };
export const dynamic = "force-dynamic";

/**
 * Jalur ujian susulan — untuk peserta yang berhalangan hadir pada hari-H.
 *
 * Sengaja dibuat sependek mungkin: pemberitahuan wajib, ceklis, lalu langsung
 * masuk ke halaman pengerjaan soal. Tidak ada rincian panjang seperti halaman
 * persiapan biasa. Halaman ini hanya terbuka bila admin sudah memberi izin.
 */
export default async function SusulanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { e } = await searchParams;

  const packageId = Number(id);
  const paket = await getPaket(packageId);
  if (!paket) notFound();

  // Portal jalur ini ditutup pengelola: siswa tidak boleh masuk lebih jauh.
  await jagaPortal(paket.jalur === "skd" ? "skd" : "utbk");

  // Tanpa izin admin, jalur ini tidak ada.
  if (!await paketDapatDikerjakanSusulan(paket, user.id)) redirect("/dashboard");

  const attempt = await attemptSiswa(user.id, packageId);
  if (attempt?.status === "finished") redirect(`/hasil/${attempt.id}`);

  // Program studi wajib dipilih dulu, kecuali pada jalur SKD yang memang
  // tidak memakai pilihan program studi.
  // Paket yang soalnya belum diunggah berhenti di sini: peserta tidak perlu
  // disuruh memilih program studi untuk ujian yang belum bisa dijalankan.
  const belumAdaSoal = await jumlahSoalPaket(packageId) === 0;
  if (paket.jalur !== "skd" && !belumAdaSoal && !await pilihanLengkap(user.id, packageId)) {
    redirect(`/tryout/${packageId}/jurusan`);
  }

  const rincian = await rincianSubtesPaket(packageId, attempt?.id);
  const totalSoal = rincian.reduce((a, s) => a + s.jumlahSoal, 0);
  const totalMenit = rincian.reduce((a, s) => a + s.durasiMenit, 0);

  return (
    <>
      <Navbar jalur={paket.jalur === "skd" ? "skd" : "utbk"} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Ujian Susulan</p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
            Mulai TryOut Real UTBK SMA Islam Plus Adzkia
          </h1>
          <p className="mt-2 text-sm text-muted">
            {paket.nama} · {paket.kode} · {totalSoal} soal · {totalMenit} menit
          </p>
          <p className="mt-1 text-sm font-semibold">
            Peserta: <span className="text-brand">{user.nama}</span>
          </p>
        </div>

        {e === "tatatertib" && (
          <div className="mb-5">
            <Alert>Kamu harus mencentang persetujuan ketentuan sebelum memulai ujian.</Alert>
          </div>
        )}

        {e === "kosong" && (
          <div className="mb-5">
            <Alert tone="warning">
              Soal paket ini belum diunggah, jadi ujiannya belum bisa dimulai. Tidak ada sesi
              yang tercatat atas namamu — coba lagi setelah pengajar mengunggah soalnya.
            </Alert>
          </div>
        )}

        {attempt?.status === "gugur" && (
          <div className="mb-5">
            <Alert tone="warning">
              Sesi ujianmu sebelumnya dinyatakan GAGAL karena pelanggaran. Pengelola sudah memberi
              izin ujian susulan, sehingga sesi lama akan <strong>disetel ulang dari nol</strong>{" "}
              begitu kamu menekan tombol mulai.
            </Alert>
          </div>
        )}

        {attempt?.status === "ongoing" && (
          <div className="mb-5">
            <Alert tone="warning">
              Kamu punya sesi yang masih berjalan. Menekan tombol di bawah akan melanjutkan sesi
              tersebut, bukan mengulang dari awal.
            </Alert>
          </div>
        )}

        <div className="mb-5">
          <PemberitahuanUjian jalur={paket.jalur === "skd" ? "skd" : "utbk"} />
        </div>

        {/* Panjang `rincian` SELALU tujuh — daftarnya jatuh ke urutan subtes
            resmi ketika paket masih kosong, supaya peserta tetap melihat
            rencana isinya. Karena itu penandanya `belumAdaSoal`, yang
            menghitung soal sungguhan, bukan panjang daftar. */}
        {belumAdaSoal ? (
          <Alert tone="warning">
            Paket ini belum memiliki soal, jadi ujiannya belum bisa dimulai. Hubungi pengajar
            Adzkia — tombol mulai akan muncul sendiri begitu soalnya diunggah.
          </Alert>
        ) : (
          <Card>
            <FormMulaiUjian
              packageId={packageId}
              melanjutkan={attempt?.status === "ongoing"}
              jalur={paket.jalur === "skd" ? "skd" : "utbk"}
              aksi={mulaiSusulanAction}
            />
          </Card>
        )}

        <p className="mt-6 text-center">
          <Link href="/dashboard" className="text-sm font-semibold text-muted hover:underline">
            ← Kembali ke Beranda
          </Link>
        </p>
      </main>
    </>
  );
}
