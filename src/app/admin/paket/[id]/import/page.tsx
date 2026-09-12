import Link from "next/link";
import { notFound } from "next/navigation";

import { BarKelengkapan } from "@/components/admin/AdminUI";
import { ImporForm } from "@/components/admin/ImporForm";
import { PageHeader } from "@/components/ui";
import { ambilPaketRingkas } from "@/lib/admin/admin";
import { requireAdmin } from "@/lib/auth/auth";
import { subtesJalur, totalSoalJalur } from "@/lib/tryout/snbt";

export const metadata = { title: "Impor Soal" };

export default async function ImporSoalPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const paketId = Number.parseInt(id, 10);
  const paket = Number.isInteger(paketId) ? await ambilPaketRingkas(paketId) : undefined;
  if (!paket) notFound();

  return (
    <>
      <PageHeader
        title={`Impor soal ${paket.kode}`}
        subtitle="Unggah naskah Word, Excel, atau CSV, periksa pratinjaunya, lalu simpan."
        action={
          <Link className="btn btn-ghost" href={`/admin/paket/${paket.id}/soal`}>
            ← Bank soal
          </Link>
        }
      />

      <div className="card mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Paket</p>
          <p className="font-semibold">{paket.nama}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Kelengkapan</p>
          <div className="mt-1.5">
            <BarKelengkapan terisi={paket.jumlah_soal} target={totalSoalJalur(paket.jalur)} />
          </div>
        </div>
        <div className="ml-auto max-w-md text-xs text-muted">
          Kuota per subtes: {subtesJalur(paket.jalur).map((s) => `${s.kode} ${s.jumlahSoal}`).join(" · ")}.
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <ImporForm packageId={paket.id} kodePaket={paket.kode} />

        <aside className="card h-fit space-y-5 p-5 text-sm">
          <div>
            <h2 className="text-sm font-bold">Cara menulis naskah Word</h2>
            <p className="mt-1 text-xs text-muted">
              Ketik naskah seperti biasa. Yang dikenali otomatis:
            </p>
            <div className="mt-2 space-y-1 rounded-xl bg-surface-muted p-3 font-mono text-[11px] leading-relaxed">
              <p className="font-bold">PENALARAN UMUM</p>
              <p className="text-muted">Teks berikut untuk soal nomor 1 sampai 3.</p>
              <p className="text-muted">Bacaan panjangnya di sini…</p>
              <p>1. Isi pertanyaannya.</p>
              <p>A. pilihan pertama</p>
              <p>B. pilihan kedua</p>
              <p>Kunci: B</p>
              <p>Pembahasan: alasannya…</p>
            </div>
            <ul className="mt-2 space-y-1.5 text-xs text-muted">
              <li>
                <strong className="text-foreground">Judul subtes</strong> — tulis nama atau kodenya
                sendirian di satu baris (PU, PENALARAN UMUM, TWK, …). Semua soal di bawahnya masuk
                ke subtes itu sampai judul berikutnya.
              </li>
              <li>
                <strong className="text-foreground">Nomor soal</strong> — diawali{" "}
                <code className="font-mono">1.</code> atau <code className="font-mono">1)</code>.
                Penomoran otomatis Word juga terbaca.
              </li>
              <li>
                <strong className="text-foreground">Pilihan</strong> — diawali{" "}
                <code className="font-mono">A.</code>, <code className="font-mono">A)</code>, atau{" "}
                <code className="font-mono">(A)</code>. Boleh berjajar dalam satu baris.
              </li>
              <li>
                <strong className="text-foreground">Kunci</strong> — baris{" "}
                <code className="font-mono">Kunci: C</code>. Jawaban ganda:{" "}
                <code className="font-mono">Kunci: A, C</code>.
              </li>
              <li>
                <strong className="text-foreground">Baris tambahan opsional</strong> —{" "}
                <code className="font-mono">Tipe: PGK</code>,{" "}
                <code className="font-mono">Level: C4</code>,{" "}
                <code className="font-mono">Nilai: 5,3,2,1,4</code> (khusus TKP).
              </li>
              <li>
                <strong className="text-foreground">Gambar</strong> — cukup ditempel di dalam soal;
                berkasnya ikut disalin saat kamu menekan Simpan.
              </li>
              <li>
                Cetak <strong>tebal</strong>, <em>miring</em>, pangkat, dan indeks ikut terbawa.
              </li>
            </ul>
            <p className="mt-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
              Naskah Word ditebak dari tata letaknya, jadi{" "}
              <strong>selalu baca pratinjaunya</strong> sebelum menyimpan. Kalau ada satu pun soal
              yang meleset, perbaiki di Word lalu unggah ulang.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-bold">Kunci jawaban dikenali sendiri</h2>
            <p className="mt-1 text-xs text-muted">
              Naskah tidak perlu ditulis ulang. Tiga cara ini dibaca otomatis, dan yang tertulis di
              badan soal selalu menang atas halaman kunci:
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted">
              <li>
                <strong className="text-foreground">1. Pilihan yang benar diberi warna merah.</strong>{" "}
                Tanpa perlu menulis &quot;Kunci&quot; sama sekali. Stabilo dan warna lain juga
                terbaca, tetapi kalau lebih dari satu pilihan berwarna, yang{" "}
                <strong className="text-foreground">merah</strong> yang dipakai. Merah dari palet
                mana pun ikut terbaca — merah tua, merah tema, maupun merah dari gaya Word.
              </li>
              <li>
                <strong className="text-foreground">
                  2. Halaman &quot;Kunci Jawaban&quot; di akhir naskah.
                </strong>{" "}
                Judulnya boleh berisi keterangan lain (&quot;KUNCI JAWABAN PENALARAN UMUM&quot;), dan
                isinya boleh berupa daftar (<code className="font-mono">1. A 2. B</code>,{" "}
                <code className="font-mono">1 A 2 B</code>) atau tabel — baik{" "}
                <code className="font-mono">No | Kunci</code>, kisi berisi
                &quot;1. A&quot; per kotak, maupun baris nomor dengan baris huruf di bawahnya.
                Halaman kunci boleh dikelompokkan per subtes, dan boleh diletakkan di ujung tiap
                subtes.
              </li>
              <li>
                <strong className="text-foreground">3. Baris</strong>{" "}
                <code className="font-mono">Kunci: C</code> di bawah soal, atau satu huruf sendirian
                di bawah pilihan terakhir.
              </li>
            </ul>
            <p className="mt-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
              Kunci yang <em>disimpulkan</em> selalu meninggalkan catatan di atas pratinjau. Sempatkan
              mencocokkan beberapa butir — dan kalau ada soal yang kuncinya kosong karena lebih dari
              satu pilihan diwarnai, isi sendiri di kolom <strong>Kunci</strong>.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-bold">Mengunggah satu subtes bertahap</h2>
            <p className="mt-1 text-xs text-muted">
              Satu subtes tidak harus selesai dalam satu berkas. Biarkan penomoran{" "}
              <strong className="text-foreground">Tambahkan sebagai lanjutan</strong> — pilihan
              bawaan — lalu unggah naskah susulannya kapan saja.
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted">
              <li>
                Naskah pertama berisi 20 soal PU bernomor 1&ndash;20 &rarr; tersimpan sebagai PU
                1&ndash;20.
              </li>
              <li>
                Naskah kedua berisi 10 soal PU yang di Word{" "}
                <strong className="text-foreground">tetap bernomor 1&ndash;10</strong> &rarr;
                tersimpan sebagai PU 21&ndash;30. Nomor di berkas tidak perlu dibetulkan lebih dulu.
              </li>
              <li>
                Soal yang pernah dihapus meninggalkan nomor kosong, dan unggahan berikutnya{" "}
                <strong className="text-foreground">menambal lubang itu dulu</strong> sebelum
                melanjutkan ke nomor berikutnya.
              </li>
              <li>
                Berkas yang sama tidak sengaja diunggah dua kali? Soalnya dikenali dari isi
                pertanyaannya lalu dilewati, jadi tidak ada soal dobel.
              </li>
              <li>
                Berlaku sama untuk ketujuh subtes UTBK dan ketiga subtes SKD; kuotanya masing-masing
                yang menentukan kapan subtes itu penuh.
              </li>
            </ul>
            <p className="mt-2 text-xs text-muted">
              Mau <em>membetulkan</em> soal yang sudah masuk, bukan menambah? Pilih{" "}
              <strong className="text-foreground">Ikuti nomor berkas &amp; timpa</strong>.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-bold">Kolom template Excel</h2>
            <ul className="mt-2 space-y-1.5 text-xs text-muted">
              <li>
                <code className="font-mono text-foreground">subtes</code> — PU, PPU, PBM, PK, LBIND,
                LBING, PM
              </li>
              <li>
                <code className="font-mono text-foreground">nomor</code> — angka, unik per subtes
              </li>
              <li>
                <code className="font-mono text-foreground">tipe</code> — PG, PGK, BS, atau IS
              </li>
              <li>
                <code className="font-mono text-foreground">level</code> — C3 atau C4
              </li>
              <li>
                <code className="font-mono text-foreground">stimulus</code>,{" "}
                <code className="font-mono text-foreground">pertanyaan</code>,{" "}
                <code className="font-mono text-foreground">gambar_url</code>
              </li>
              <li>
                <code className="font-mono text-foreground">opsi_a</code> …{" "}
                <code className="font-mono text-foreground">opsi_e</code>
              </li>
              <li>
                <code className="font-mono text-foreground">kunci</code> — PG: <code>B</code> · PGK:{" "}
                <code>A,C</code> · IS: teks jawaban
              </li>
              <li>
                <code className="font-mono text-foreground">pembahasan</code>
              </li>
            </ul>
            <p className="mt-2 text-xs text-muted">
              Baris dengan galat tidak akan disimpan. Nomor yang sudah dipakai hanya ditimpa bila
              opsi &quot;timpa&quot; dicentang. Tabel berjudul kolom ini juga boleh diletakkan di
              dalam dokumen Word.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
