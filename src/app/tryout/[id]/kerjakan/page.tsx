import { notFound, redirect } from "next/navigation";
import { RuangUjian } from "@/components/exam/RuangUjian";
import { LayarGagal } from "@/components/exam/LayarGagal";
import { pesanGugur } from "@/components/exam/tipe";
import { Tema } from "@/components/Tema";
import { Navbar } from "@/components/Navbar";
import { EmptyState } from "@/components/ui";
import Link from "next/link";
import { requireUser } from "@/lib/auth/auth";
import {
  attemptSiswa,
  getPaket,
  jumlahSoalPaket,
  keadaanUjian,
  soalSubtes,
} from "@/lib/tryout/exam";
import { identitasFoto } from "@/lib/penjagaan/foto-peserta";
import { waktuIndo } from "@/lib/core/tampilan";
import { selesaikanSubtesAction } from "../../actions";

export const metadata = { title: "Ruang Ujian" };
export const dynamic = "force-dynamic";

export default async function RuangUjianPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const packageId = Number(id);
  const paket = await getPaket(packageId);
  if (!paket) notFound();

  const identitas = await identitasFoto(user.id);
  const attempt = await attemptSiswa(user.id, packageId);
  // Belum pernah menekan "Mulai Ujian" -> kembali ke halaman persiapan.
  if (!attempt) redirect(`/tryout/${packageId}`);
  if (attempt.status === "finished") redirect(`/hasil/${attempt.id}`);

  // Sudah digugurkan: layar penguncian dirender ulang oleh server, jadi memuat
  // ulang halaman atau membuka tautannya lagi tidak mengembalikan ujian.
  if (attempt.status === "gugur") {
    return (
      <LayarGagal
        pesan={attempt.alasan_gugur ?? pesanGugur(paket.jalur)}
        namaPaket={`${paket.nama} · ${paket.kode}`}
        waktu={waktuIndo(attempt.digugurkan_at)}
      />
    );
  }

  // Paket yang soalnya belum diunggah TIDAK boleh dilempar ke halaman hasil.
  // Di sana peserta hanya membaca “Tryout ini belum selesai” lalu dipulangkan ke
  // beranda, yang menawarkan “Lanjutkan Ujian” lagi — lingkaran tanpa ujung yang
  // menyalahkan peserta atas paket yang memang masih kosong. Sesi yang terlanjur
  // dibuat sebelum penjagaan ini ada tetap mendarat di sini, dan akan berjalan
  // normal sendiri begitu soalnya diunggah.
  if (await jumlahSoalPaket(packageId) === 0) {
    return (
      <Tema jalur={paket.jalur === "skd" ? "skd" : "utbk"}>
        <Navbar jalur={paket.jalur === "skd" ? "skd" : "utbk"} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
          <EmptyState
            title="Soal paket ini belum diunggah"
            description={`${paket.nama} · ${paket.kode} belum berisi satu butir soal pun, jadi ujiannya belum bisa dijalankan. Ini bukan kesalahanmu dan tidak dicatat sebagai pelanggaran. Tunggu kabar dari pengajar Adzkia, lalu buka lagi paket ini.`}
            action={
              <Link href="/dashboard" className="btn btn-primary">
                Kembali ke Beranda
              </Link>
            }
          />
        </main>
      </Tema>
    );
  }

  // Menutup subtes kedaluwarsa, menyalakan timer subtes berikutnya,
  // dan menutup ujian bila semua subtes sudah tuntas.
  const keadaan = await keadaanUjian(attempt.id, { mulaiOtomatis: true });
  if (!keadaan) notFound();
  if (keadaan.selesai || !keadaan.subtes) redirect(`/hasil/${attempt.id}`);

  const soal = await soalSubtes(attempt.id, packageId, keadaan.subtes);

  return (
    <Tema jalur={paket.jalur === "skd" ? "skd" : "utbk"}>
    <RuangUjian
      key={keadaan.subtes}
      attemptId={attempt.id}
      packageId={packageId}
      namaPeserta={user.nama}
      nisnPeserta={identitas?.nisn ?? null}
      fotoPeserta={identitas?.foto ?? null}
      namaPaket={`${paket.nama} · ${paket.kode}`}
      subtes={keadaan.subtes}
      namaSubtesAktif={keadaan.namaSubtes}
      urutanKe={keadaan.urutanKe}
      totalSubtes={keadaan.totalSubtes}
      sisaDetik={keadaan.sisaDetik}
      sesiTunggal={paket.jalur === "skd"}
      jalur={paket.jalur === "skd" ? "skd" : "utbk"}
      soal={soal}
      aksiSelesaiSubtes={selesaikanSubtesAction}
    />
    </Tema>
  );
}
