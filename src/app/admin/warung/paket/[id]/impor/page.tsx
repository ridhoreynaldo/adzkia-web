import Link from "next/link";
import { notFound } from "next/navigation";

import { WarungImporForm } from "@/components/admin/WarungImporForm";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/auth";
import { getSubtes } from "@/lib/tryout/snbt";
import { KOMPOSISI, ambilPaket } from "@/lib/warung/warung";

export const metadata = { title: "Impor Soal Warung" };

export default async function ImporPaketWarung({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const paketId = Number.parseInt(id, 10);
  const paket = Number.isInteger(paketId) ? await ambilPaket(paketId) : undefined;
  if (!paket) notFound();

  const info = getSubtes(paket.subtes)!;
  const komposisi = KOMPOSISI[paket.subtes];

  return (
    <>
      <PageHeader
        title="Impor soal"
        subtitle={`${info.namaPendek} — Paket ${paket.nomor} · target ${komposisi.total} soal`}
        action={
          <Link className="btn btn-ghost" href={`/admin/warung/paket/${paket.id}`}>
            ← Kelola paket
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_21rem]">
        <WarungImporForm paketId={paket.id} kembaliKe={`/admin/warung/paket/${paket.id}`} />

        {/* ---------- Aturan penulisan ---------- */}
        <aside className="card h-fit p-5 text-sm">
          <h2 className="text-sm font-extrabold uppercase tracking-wide">Cara menulis naskahnya</h2>

          <p className="mt-3 text-xs leading-relaxed text-muted">
            Satu berkas untuk satu paket. Naskah Word ditulis mengalir seperti di kertas; bentuk
            butir selain pilihan ganda ditandai baris <strong>Tipe:</strong> tepat sebelum soalnya.
          </p>

          <pre className="mt-3 overflow-x-auto rounded-xl bg-surface-muted p-4 text-[11px] leading-relaxed">
{`1. Hasil dari 12 x 8 adalah ...
A. 84
B. 96
C. 102
D. 108
E. 112
Kunci: B
Pembahasan: 12 x 8 = 96.

Tipe: PGK
2. Tentukan benar/salah tiap pernyataan.
A. 2 adalah bilangan prima
B. 9 adalah bilangan prima
C. 15 habis dibagi 3
Kunci: B, S, B

Tipe: IS
3. Berapa hasil 45 : 5 ?
Kunci: 9`}
          </pre>

          <ul className="mt-4 space-y-2 text-xs leading-relaxed text-muted">
            <li>
              <strong className="text-foreground">Tipe: PGK</strong> — pilihan A, B, C menjadi
              PERNYATAAN, dan kuncinya berderet: <code>B, S, B</code> atau <code>BSB</code>.
            </li>
            <li>
              <strong className="text-foreground">Tipe: IS</strong> — tanpa pilihan; kuncinya
              jawaban singkat. Koma dan titik desimal dianggap sama saat dinilai.
            </li>
            <li>
              <strong className="text-foreground">Bacaan:</strong> di awal baris memasang teks
              pengantar untuk soal sesudahnya.
            </li>
            <li>
              <strong className="text-foreground">Penomoran otomatis Word diterima.</strong> Kalau
              Word mengubah &quot;1.&quot; menjadi daftar bernomor sendiri, biarkan saja &mdash;
              nomornya diisi ulang urut dari 1 saat impor. Pilihan yang ditulis sebagai daftar
              bertakuk di bawah soalnya juga terbaca sebagai A, B, C.
            </li>
            <li>
              Cetak tebal, miring, pangkat, dan indeks dipertahankan. Gambar yang menempel pada soal
              ikut tersalin saat kamu menekan Simpan.
            </li>
            <li>
              Berkas <strong className="text-foreground">.xlsx / .csv</strong> memakai kolom: nomor,
              tipe, stimulus, pertanyaan, opsi_a&hellip;opsi_e, kunci, pembahasan.
            </li>
          </ul>

          <p className="mt-4 rounded-xl bg-brand-soft px-4 py-3 text-xs leading-relaxed text-brand-strong">
            Target paket ini: {komposisi.pg} pilihan ganda, {komposisi.pgk} benar/salah, dan{" "}
            {komposisi.is} isian singkat.
          </p>
        </aside>
      </div>
    </>
  );
}
