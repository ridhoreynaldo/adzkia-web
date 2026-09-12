import Link from "next/link";
import { notFound } from "next/navigation";

import { PratinjauUjian, type SesiPratinjau } from "@/components/admin/PratinjauUjian";
import { LencanaStatus } from "@/components/admin/AdminUI";
import { PageHeader } from "@/components/ui";
import { Tema } from "@/components/Tema";
import { ambilPaketRingkas } from "@/lib/admin/admin";
import { requireAdmin } from "@/lib/auth/auth";
import { soalPratinjau, urutanSubtesPaket } from "@/lib/tryout/exam";
import { SESI_SKD, TOTAL_MENIT_SKD, TOTAL_SOAL_SKD } from "@/lib/tryout/skd";
import { TOTAL_SOAL, durasiSesi, getSubtes, namaSubtes } from "@/lib/tryout/snbt";

export const metadata = { title: "Pratinjau Ujian" };
// Soal boleh berubah kapan saja lewat impor atau editor; pratinjau harus selalu
// memperlihatkan isi terbaru, bukan salinan yang dibekukan saat build.
export const dynamic = "force-dynamic";

export default async function PratinjauUjianPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;

  const paketId = Number.parseInt(id, 10);
  const paket = Number.isInteger(paketId) ? await ambilPaketRingkas(paketId) : undefined;
  if (!paket) notFound();

  const skd = paket.jalur === "skd";

  const sesi: SesiPratinjau[] = await Promise.all((await urutanSubtesPaket(paket.id)).map(async (kode) => ({
    subtes: kode,
    namaSubtes: namaSubtes(kode),
    durasiDetik: (kode === SESI_SKD ? TOTAL_MENIT_SKD : (durasiSesi(kode) ?? 0)) * 60,
    soal: await soalPratinjau(paket.id, kode),
    target: kode === SESI_SKD ? TOTAL_SOAL_SKD : (getSubtes(kode)?.jumlahSoal ?? 0),
  })));

  return (
    <Tema jalur={skd ? "skd" : "utbk"}>
      <PageHeader
        title="Pratinjau ujian"
        subtitle="Jalani sendiri tryout ini dari layar peserta, sebelum dibuka ke siswa"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <LencanaStatus status={paket.status} />
            <Link className="btn btn-ghost" href={`/admin/paket/${paket.id}/pratinjau`}>
              Pratinjau soal
            </Link>
            <Link className="btn btn-ghost" href={`/admin/paket/${paket.id}/soal`}>
              ← Bank soal
            </Link>
          </div>
        }
      />

      <PratinjauUjian
        packageId={paket.id}
        kodePaket={paket.kode}
        namaPaket={paket.nama}
        namaAdmin={admin.nama}
        sesiTunggal={skd}
        sesi={sesi}
        targetTotal={skd ? TOTAL_SOAL_SKD : TOTAL_SOAL}
      />
    </Tema>
  );
}
