import Link from "next/link";
import { notFound } from "next/navigation";

import {
  PratinjauUjianIelts,
  type SubtesPratinjauIelts,
} from "@/components/admin/PratinjauUjianIelts";
import { Badge, PageHeader } from "@/components/ui";
import { requireAdminIelts } from "@/lib/auth/auth";
import { wajibFiturLanguage } from "@/lib/ielts/language";
import {
  KODE_SUBTES_IELTS,
  LABEL_STATUS_IELTS,
  menitPaket,
  paketById,
  seksiPerSubtes,
  soalPesertaPerSubtes,
  subtesIelts,
} from "@/lib/ielts/ielts";

// Butir boleh berubah kapan saja lewat impor atau editor; pratinjau harus
// selalu memperlihatkan isi terbaru, bukan salinan yang dibekukan saat build.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await paketById(Number(id));
  return { title: p ? `Pratinjau ujian ${p.kode}` : "Pratinjau Ujian IELTS" };
}

export default async function SimulasiIeltsPage({ params }: { params: Promise<{ id: string }> }) {
  await wajibFiturLanguage();
  const admin = await requireAdminIelts();

  const { id } = await params;
  const paket = await paketById(Number(id));
  if (!paket) notFound();

  const menit = await menitPaket(paket);

  // Bahan disusun dengan fungsi yang SAMA dengan yang dipakai ruang ujian
  // sungguhan — `seksiSubtes` dan `soalUntukPeserta`. Yang terakhir itu penting
  // sekali lagi di sini: ia tidak memulangkan kolom kunci sama sekali, jadi
  // kunci jawaban tidak ikut terkirim ke peramban walau yang membukanya admin.
  // DUA query, bukan delapan — lihat catatan yang sama di halaman pratinjau.
  const seksiPeta = await seksiPerSubtes(paket.id);
  const soalPeta = await soalPesertaPerSubtes(paket.id);

  const subtes: SubtesPratinjauIelts[] = KODE_SUBTES_IELTS.map((kode) => {
    const def = subtesIelts(kode)!;
    return {
      kode,
      nama: def.nama,
      menit: menit[kode],
      labelSeksi: def.labelSeksi,
      target: def.jumlahSoal,
      seksi: (seksiPeta.get(kode) ?? []).map((s) => ({
        id: s.id,
        nomor: s.nomor,
        judul: s.judul || `${def.labelSeksi} ${s.nomor}`,
        instruksi: s.instruksi,
        audioUrl: s.audio_url,
        bacaan: s.bacaan,
      })),
      soal: (soalPeta.get(kode) ?? []).map((s) => ({
        id: s.id,
        nomor: s.nomor,
        tipe: s.tipe,
        pertanyaan: s.pertanyaan,
        opsi: s.opsi,
        seksiId: s.seksiId,
      })),
    };
  });

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href={`/admin/ielts/${paket.id}`} className="font-semibold text-muted hover:text-brand">
          ← {paket.nama}
        </Link>
      </p>

      <PageHeader
        title="Pratinjau ujian"
        subtitle="Jalani sendiri paket IELTS ini dari layar peserta, sebelum dibuka ke siswa"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              tone={
                paket.status === "published"
                  ? "success"
                  : paket.status === "closed"
                    ? "danger"
                    : "warning"
              }
            >
              {LABEL_STATUS_IELTS[paket.status]}
            </Badge>
            <Link className="btn btn-ghost" href={`/admin/ielts/${paket.id}/pratinjau`}>
              Pratinjau soal
            </Link>
          </div>
        }
      />

      <PratinjauUjianIelts
        kodePaket={paket.kode}
        namaPaket={paket.nama}
        namaAdmin={admin.nama}
        subtes={subtes}
      />
    </>
  );
}
