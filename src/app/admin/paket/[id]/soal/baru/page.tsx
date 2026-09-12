import Link from "next/link";
import { notFound } from "next/navigation";

import { SoalEditor } from "@/components/admin/SoalEditor";
import { PageHeader } from "@/components/ui";
import { type ParamsQuery, ambilPaket, nomorKosongBerikutnya, satuParam } from "@/lib/admin/admin";
import { requireAdmin } from "@/lib/auth/auth";
import { subtesJalur } from "@/lib/tryout/snbt";

export const metadata = { title: "Tambah Soal" };

export default async function SoalBaruPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ParamsQuery>;
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const paketId = Number.parseInt(id, 10);
  const paket = Number.isInteger(paketId) ? await ambilPaket(paketId) : undefined;
  if (!paket) notFound();

  // Daftar subtes mengikuti jalur paket: tujuh subtes UTBK atau tiga subtes SKD.
  const daftar = subtesJalur(paket.jalur);
  const diminta = satuParam(sp.subtes);
  const subtes = daftar.some((s) => s.kode === diminta) ? (diminta as string) : daftar[0].kode;

  return (
    <>
      <PageHeader
        title="Tambah soal"
        subtitle={`${paket.kode} — ${paket.nama}`}
        action={
          <Link className="btn btn-ghost" href={`/admin/paket/${paket.id}/soal?subtes=${subtes}`}>
            ← Bank soal
          </Link>
        }
      />

      <SoalEditor
        jalur={paket.jalur}
        awal={{
          package_id: paket.id,
          subtes,
          nomor: await nomorKosongBerikutnya(paket.id, subtes),
          tipe: "PG",
          level: "C3",
          stimulus: "",
          pertanyaan: "",
          gambar_url: "",
          opsi: ["", "", "", "", ""],
          kunciHuruf: [],
          kunciTeks: "",
          kunciMentah: "",
          pembahasan: "",
        }}
      />
    </>
  );
}
