import Link from "next/link";

import {
  AjakanJalur,
  JudulBagian,
  KakiJalur,
  NavJalur,
  SampulJalur,
} from "@/components/landing/RangkaJalur";
import { DaftarSubtes } from "@/components/landing/DaftarSubtes";
import { Keunggulan } from "@/components/landing/Keunggulan";
import { SeksiKampus } from "@/components/landing/SeksiKampus";
import { CaraKerja } from "@/components/landing/CaraKerja";
import { Faq } from "@/components/landing/Faq";
import { ScoreMockup } from "@/components/landing/ScoreMockup";
import { getSession } from "@/lib/auth/auth";
import { jagaPortal } from "@/lib/admin/portal";
import { SUBTES, TOTAL_MENIT, TOTAL_SOAL } from "@/lib/tryout/snbt";

export const metadata = {
  title: "Tryout Real UTBK-SNBT",
  description:
    "Tryout Real UTBK-SNBT dari SMA Islam Plus Adzkia: 7 subtes, 160 soal, 195 menit, timer per subtes, penilaian IRT, pembahasan lengkap, dan rekomendasi kampus.",
};

/**
 * Halaman ini membaca sesi, jadi tidak boleh dipranatal jadi HTML statis —
 * sama alasannya dengan /skd: versi statisnya akan selalu menawarkan "MULAI"
 * sekalipun siswa sudah masuk.
 */
export const dynamic = "force-dynamic";

/**
 * Halaman muka jalur Tryout Real UTBK-SNBT.
 *
 * Ditata ulang 11 September 2026 mengikuti rupa halaman awal: kertas krem,
 * sampul berupa foto kampus bersudut membulat, bilah angka yang menindihnya,
 * jalur isi berselang krem–putih, dan tombol kapsul. Rangkanya dibagi dengan
 * /skd lewat `components/landing/RangkaJalur.tsx` supaya kedua halaman tidak
 * lagi berjalan sendiri-sendiri.
 */
export default async function HalamanUtbk() {
  await jagaPortal("utbk");

  const user = await getSession();
  const siswaMasuk = user != null && user.role === "siswa";

  // Peserta yang sudah masuk tidak perlu mampir ke halaman login lagi.
  const tujuanMulai = siswaMasuk
    ? "/mulai?jalur=utbk"
    : user?.role === "admin"
      ? "/admin"
      : "/login";
  const labelMulai = user?.role === "admin" ? "Panel Admin" : siswaMasuk ? "Lanjut ke TryOut" : "Mulai TryOut";

  return (
    <div className="kertas-landing flex min-h-dvh flex-col bg-background">
      <NavJalur jalur="utbk" user={user} tujuanMulai={tujuanMulai} labelMulai={labelMulai} />

      <main className="flex-1">
        <SampulJalur
          jalur="utbk"
          kicker="Tryout Real UTBK-SNBT · SMA Islam Plus Adzkia"
          judul="Latihan UTBK yang rasanya persis hari-H."
          keterangan={`Aturannya sama seperti UTBK asli: ${SUBTES.length} subtes berurutan, timer terpisah tiap subtes yang berdetak di server, dan penilaian IRT. Disusun tim guru SMA Islam Plus Adzkia supaya kamu tahu posisi nilaimu jauh sebelum hari ujian.`}
          tombol={[
            { href: tujuanMulai, label: labelMulai, utama: true },
            { href: "/skd", label: "Lihat jalur SKD" },
          ]}
          angka={[
            { nilai: String(SUBTES.length), label: "subtes", ket: "Sesuai struktur resmi UTBK-SNBT" },
            { nilai: String(TOTAL_SOAL), label: "soal", ket: "Jumlah butir satu paket penuh" },
            { nilai: String(TOTAL_MENIT), label: "menit", ket: "Total waktu pengerjaan" },
            { nilai: "IRT", label: "penilaian", ket: "Bobot soal ikut menentukan skor" },
          ]}
        />

        {/* ---------- Laporan yang diterima siswa ---------- */}
        {/*
          `overflow-x-clip`: ornamen lingkaran di belakang ScoreMockup sengaja
          menjorok keluar kartunya (-right-6). Di layar HP jorokan 8 piksel itu
          cukup untuk memunculkan bilah gulung mendatar di SELURUH halaman.
          Dipangkas mendatar saja — `overflow-hidden` akan mematikan
          `scroll-mt` pada tautan lompat di dalam halaman ini.
        */}
        <section className="mx-auto w-full max-w-6xl overflow-x-clip px-4 py-16 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <JudulBagian
              kicker="Laporan hasil"
              judul="Bukan cuma angka akhir, tapi peta kekuatanmu"
              isi="Begitu subtes terakhir ditutup, skor IRT tiap subtes, peringkat antar peserta, pembahasan tiap butir, dan rekomendasi kampus terbuka di hari yang sama — tanpa koreksi manual."
            />
            <div className="lg:pl-6">
              <ScoreMockup />
            </div>
          </div>

          <div className="mt-10">
            <Link href={tujuanMulai} className="btn btn-primary">
              {labelMulai}
            </Link>
          </div>
        </section>

        {/*
          Jalur isinya sengaja berselang krem–putih seperti halaman awal.
          `SeksiKampus` sudah memasang alas putihnya sendiri, jadi ia tidak
          dibungkus `.pita-terang` — kalau urutan di bawah ini diubah, periksa
          lagi supaya tidak ada dua bidang putih yang berdempetan.
        */}
        <div className="pita-terang">
          <DaftarSubtes />
        </div>

        <Keunggulan />

        <SeksiKampus jalur="utbk" />

        <CaraKerja />

        <div className="pita-terang">
          <Faq />
        </div>

        <AjakanJalur
          judul="Coba satu tryout, lalu lihat sendiri posisimu."
          isi={`Kerjakan ${SUBTES.length} subtes dengan aturan hari-H, dan dapatkan laporan skor IRT beserta rekomendasi kampus di hari yang sama.`}
          tombol={{ href: tujuanMulai, label: labelMulai }}
        />
      </main>

      <KakiJalur
        jalur="utbk"
        ringkas={`Platform tryout resmi SMA Islam Plus Adzkia untuk menyiapkan siswa menghadapi UTBK-SNBT: ${SUBTES.length} subtes, ${TOTAL_SOAL} soal, ${TOTAL_MENIT} menit, dan penilaian IRT.`}
      />
    </div>
  );
}
