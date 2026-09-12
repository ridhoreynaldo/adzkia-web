import Link from "next/link";
import { notFound } from "next/navigation";

import { hapusSoalAction } from "@/app/admin/actions";
import { TombolKonfirmasi } from "@/components/admin/TombolKonfirmasi";
import { SoalEditor } from "@/components/admin/SoalEditor";
import { PageHeader } from "@/components/ui";
import { ambilPaket, ambilSoal, parseKunci, parseOpsi } from "@/lib/admin/admin";
import { requireAdmin } from "@/lib/auth/auth";
import { namaSubtes } from "@/lib/tryout/snbt";

export const metadata = { title: "Ubah Soal" };

export default async function UbahSoalPage({
  params,
}: {
  params: Promise<{ id: string; soalId: string }>;
}) {
  await requireAdmin();
  const { id, soalId } = await params;

  const paketId = Number.parseInt(id, 10);
  const butirId = Number.parseInt(soalId, 10);
  const paket = Number.isInteger(paketId) ? await ambilPaket(paketId) : undefined;
  const soal = Number.isInteger(butirId) ? await ambilSoal(butirId) : undefined;
  if (!paket || !soal || soal.package_id !== paket.id) notFound();

  const opsi = parseOpsi(soal.opsi);
  while (opsi.length < 5) opsi.push("");

  return (
    <>
      <PageHeader
        title={`Ubah soal ${soal.subtes} nomor ${soal.nomor}`}
        subtitle={`${paket.kode} — ${namaSubtes(soal.subtes)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="btn btn-ghost"
              href={`/admin/paket/${paket.id}/soal?subtes=${soal.subtes}`}
            >
              ← Bank soal
            </Link>
            <form action={hapusSoalAction}>
              <input type="hidden" name="id" value={soal.id} />
              <input type="hidden" name="package_id" value={paket.id} />
              <input type="hidden" name="subtes" value={soal.subtes} />
              <TombolKonfirmasi
                className="btn btn-ghost text-danger!"
                pesan={`Hapus soal ${soal.subtes} nomor ${soal.nomor}? Jawaban peserta untuk butir ini ikut terhapus.`}
              >
                Hapus soal
              </TombolKonfirmasi>
            </form>
          </div>
        }
      />

      <SoalEditor
        jalur={paket.jalur}
        awal={{
          id: soal.id,
          package_id: paket.id,
          subtes: soal.subtes,
          nomor: soal.nomor,
          tipe: soal.tipe,
          level: soal.level,
          stimulus: soal.stimulus ?? "",
          pertanyaan: soal.pertanyaan,
          gambar_url: soal.gambar_url ?? "",
          opsi: opsi.slice(0, 5),
          kunciHuruf: soal.tipe === "IS" ? [] : parseKunci(soal.tipe, soal.kunci),
          kunciTeks: soal.tipe === "IS" ? soal.kunci : "",
          kunciMentah: soal.kunci,
          pembahasan: soal.pembahasan ?? "",
        }}
      />
    </>
  );
}
