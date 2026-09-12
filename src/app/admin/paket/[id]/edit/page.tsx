import Link from "next/link";
import { notFound } from "next/navigation";

import { PaketForm } from "@/components/admin/PaketForm";
import { PageHeader } from "@/components/ui";
import { ambilPaket, keInputDatetime } from "@/lib/admin/admin";
import { requireAdmin } from "@/lib/auth/auth";

export const metadata = { title: "Edit Paket" };

export default async function EditPaketPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const paketId = Number.parseInt(id, 10);
  const paket = Number.isInteger(paketId) ? await ambilPaket(paketId) : undefined;
  if (!paket) notFound();

  return (
    <>
      <PageHeader
        title={`Edit paket ${paket.kode}`}
        subtitle={paket.nama}
        action={
          <div className="flex flex-wrap gap-2">
            <Link className="btn btn-ghost" href={`/admin/paket/${paket.id}/soal`}>
              Kelola soal
            </Link>
            <Link className="btn btn-ghost" href="/admin/paket">
              ← Daftar paket
            </Link>
          </div>
        }
      />
      <div className="max-w-3xl">
        <PaketForm
          awal={{
            id: paket.id,
            kode: paket.kode,
            nama: paket.nama,
            jalur: paket.jalur ?? "utbk",
            deskripsi: paket.deskripsi ?? "",
            status: paket.status,
            mulai_at: keInputDatetime(paket.mulai_at),
            selesai_at: keInputDatetime(paket.selesai_at),
            acak_soal: paket.acak_soal === 1,
            tampil_pembahasan: paket.tampil_pembahasan === 1,
          }}
        />
      </div>
    </>
  );
}
