import Link from "next/link";
import { notFound } from "next/navigation";

import { PratinjauSoal } from "@/components/admin/PratinjauSoal";
import { PesanFlash } from "@/components/admin/AdminUI";
import { TombolCetak } from "@/components/hasil/TombolCetak";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import {
  type ParamsQuery,
  type SoalRow,
  ambilPaketRingkas,
  curigaSoal,
  daftarSoal,
  masalahSoal,
  parseKunci,
  parseOpsi,
  satuParam,
} from "@/lib/admin/admin";
import { requireAdmin } from "@/lib/auth/auth";
import { petaRentangBacaan } from "@/lib/tryout/soal-tampilan";
import { namaSubtes, subtesJalur, totalSoalJalur } from "@/lib/tryout/snbt";

export const metadata = { title: "Pratinjau Soal" };

const SEMUA = "SEMUA";

/** Butir + hasil pemeriksaannya, supaya tidak dihitung dua kali. */
interface ButirPratinjau {
  soal: SoalRow;
  masalah: string[];
  curiga: string[];
}

function periksa(soal: SoalRow[]): ButirPratinjau[] {
  return soal.map((s) => ({ soal: s, masalah: masalahSoal(s), curiga: curigaSoal(s) }));
}

export default async function PratinjauPaketPage({
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
  const paket = Number.isInteger(paketId) ? await ambilPaketRingkas(paketId) : undefined;
  if (!paket) notFound();

  // Daftar dan urutan subtes mengikuti jalur paket, sehingga paket SKD
  // dipratinjau memakai tab TWK/TIU/TKP, bukan tab UTBK yang selalu kosong.
  const daftar = subtesJalur(paket.jalur);
  const urutan = daftar.map((s) => s.kode);
  const diminta = satuParam(sp.subtes);
  const aktif =
    diminta === SEMUA || daftar.some((s) => s.kode === diminta) ? (diminta as string) : daftar[0].kode;
  // Kunci jawaban tampil secara bawaan — pratinjau ini memang alat admin
  // mencocokkan kunci hasil impor. `?kunci=0` mematikannya supaya bisa dilihat
  // persis seperti yang dibaca peserta, atau dicetak untuk ditelaah guru.
  const tampilKunci = satuParam(sp.kunci) !== "0";

  // Seluruh butir paket dipakai untuk menghitung lencana pada tab, sehingga
  // admin melihat subtes mana yang perlu dibuka tanpa harus membukanya satu per satu.
  const semua = periksa(await daftarSoal(paket.id));
  const hitung = new Map<string, { jumlah: number; masalah: number; curiga: number }>();
  for (const b of semua) {
    const h = hitung.get(b.soal.subtes) ?? { jumlah: 0, masalah: 0, curiga: 0 };
    h.jumlah++;
    if (b.masalah.length) h.masalah++;
    if (b.curiga.length) h.curiga++;
    hitung.set(b.soal.subtes, h);
  }
  const totalMasalah = semua.filter((b) => b.masalah.length).length;
  const totalCuriga = semua.filter((b) => b.curiga.length).length;

  const butir =
    aktif === SEMUA
      ? [...semua].sort(
          (a, b) =>
            urutan.indexOf(a.soal.subtes) - urutan.indexOf(b.soal.subtes) ||
            a.soal.nomor - b.soal.nomor,
        )
      : semua.filter((b) => b.soal.subtes === aktif).sort((a, b) => a.soal.nomor - b.soal.nomor);

  // Penanda "Bacaan untuk soal 1-3" — dihitung dengan aturan yang sama persis
  // dengan ruang ujian, jadi admin melihat pengelompokan yang dilihat peserta.
  const rentang = petaRentangBacaan(butir.map((b) => ({ nomor: b.soal.nomor, stimulus: b.soal.stimulus })));

  const tautan = (subtes: string, kunci = tampilKunci) =>
    `/admin/paket/${paket.id}/pratinjau?subtes=${subtes}${kunci ? "" : "&kunci=0"}`;

  return (
    <>
      <PageHeader
        title={`Pratinjau soal ${paket.kode}`}
        subtitle={`${paket.nama} — tampilan sama seperti yang dibaca peserta`}
        action={
          <div className="no-print flex flex-wrap gap-2">
            <Link className="btn btn-ghost" href={tautan(aktif, !tampilKunci)}>
              {tampilKunci ? "Sembunyikan kunci" : "Tampilkan kunci"}
            </Link>
            <TombolCetak label="Cetak" />
            <Link className="btn btn-ghost" href={`/admin/paket/${paket.id}/simulasi`}>
              Pratinjau ujian
            </Link>
            <Link className="btn btn-ghost" href={`/admin/paket/${paket.id}/soal?subtes=${aktif === SEMUA ? daftar[0].kode : aktif}`}>
              ← Bank soal
            </Link>
          </div>
        }
      />

      <PesanFlash pesan={satuParam(sp.pesan)} galat={satuParam(sp.galat)} />

      {/* --------------------------- RINGKASAN --------------------------- */}
      <div className="card mb-6 flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Soal tersimpan</p>
          <p className="mt-1 text-lg font-extrabold tabular-nums">
            {paket.jumlah_soal}
            <span className="text-muted"> / {totalSoalJalur(paket.jalur)}</span>
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Butir belum lengkap</p>
          <p className={`mt-1 text-lg font-extrabold tabular-nums ${totalMasalah ? "text-danger" : "text-success"}`}>
            {totalMasalah}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Perlu diperiksa</p>
          <p className={`mt-1 text-lg font-extrabold tabular-nums ${totalCuriga ? "text-warning" : "text-success"}`}>
            {totalCuriga}
          </p>
        </div>
        <p className="ml-auto max-w-sm text-xs text-muted">
          &ldquo;Perlu diperiksa&rdquo; adalah dugaan, bukan vonis: butir yang kolomnya lengkap tetapi
          isinya janggal — biasanya sisa potongan naskah yang ikut terbawa saat impor.
        </p>
      </div>

      {/* ---------------------------- TAB SUBTES ---------------------------- */}
      <div className="no-print -mx-4 mb-6 overflow-x-auto px-4">
        <div className="flex min-w-max gap-2">
          {[SEMUA, ...urutan].map((kode) => {
            const on = kode === aktif;
            const h =
              kode === SEMUA
                ? { jumlah: semua.length, masalah: totalMasalah, curiga: totalCuriga }
                : (hitung.get(kode) ?? { jumlah: 0, masalah: 0, curiga: 0 });
            return (
              <Link
                key={kode}
                href={tautan(kode)}
                aria-current={on ? "page" : undefined}
                className={`rounded-xl border px-4 py-2.5 transition-colors ${
                  on ? "border-brand bg-brand-soft" : "border-line bg-surface hover:bg-surface-muted"
                }`}
              >
                <div className="flex items-baseline gap-2">
                  <span className={`text-sm font-extrabold ${on ? "text-brand" : ""}`}>
                    {kode === SEMUA ? "Semua" : kode}
                  </span>
                  <span className="text-xs font-bold tabular-nums text-muted">{h.jumlah}</span>
                </div>
                {(h.masalah > 0 || h.curiga > 0) && (
                  <p className="mt-0.5 text-[0.7rem] font-semibold">
                    {h.masalah > 0 && <span className="text-danger">{h.masalah} belum lengkap</span>}
                    {h.masalah > 0 && h.curiga > 0 && <span className="text-muted"> · </span>}
                    {h.curiga > 0 && <span className="text-warning">{h.curiga} perlu dicek</span>}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ----------------------------- DAFTAR ----------------------------- */}
      {butir.length === 0 ? (
        <EmptyState
          title={aktif === SEMUA ? "Paket ini belum berisi soal" : `Belum ada soal ${aktif}`}
          description="Impor naskah Word atau Excel dulu, lalu kembali ke sini untuk memeriksanya butir demi butir."
          action={
            <Link className="btn btn-primary" href={`/admin/paket/${paket.id}/import`}>
              Impor soal
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {butir.map((b, i) => {
            const r = rentang[i];
            const bermasalah = b.masalah.length > 0;
            const dicurigai = b.curiga.length > 0;
            return (
              <section key={b.soal.id} className="scroll-mt-4" id={`soal-${b.soal.id}`}>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-extrabold text-brand">
                    {b.soal.subtes} nomor {b.soal.nomor}
                  </span>
                  {r && (
                    <Badge tone="muted">
                      Bacaan dipakai soal {r.dari}–{r.sampai}
                      {r.pertama ? "" : " (lanjutan)"}
                    </Badge>
                  )}
                  {bermasalah && <Badge tone="danger">Belum lengkap</Badge>}
                  {dicurigai && <Badge tone="warning">Perlu diperiksa</Badge>}
                  <Link
                    className="no-print ml-auto font-semibold text-brand hover:underline"
                    href={`/admin/paket/${paket.id}/soal/${b.soal.id}`}
                  >
                    Ubah butir ini →
                  </Link>
                </div>

                {(bermasalah || dicurigai) && (
                  <ul className="mb-2 space-y-1 rounded-xl border border-line bg-surface-muted/60 p-3 text-xs">
                    {b.masalah.map((m) => (
                      <li key={m} className="font-semibold text-danger">
                        • {m}
                      </li>
                    ))}
                    {b.curiga.map((c) => (
                      <li key={c} className="text-warning">
                        • {c}
                      </li>
                    ))}
                  </ul>
                )}

                <PratinjauSoal
                  tampilKunci={tampilKunci}
                  data={{
                    subtes: b.soal.subtes,
                    nomor: b.soal.nomor,
                    tipe: b.soal.tipe,
                    level: b.soal.level,
                    stimulus: b.soal.stimulus ?? "",
                    pertanyaan: b.soal.pertanyaan,
                    gambar_url: b.soal.gambar_url ?? "",
                    opsi: parseOpsi(b.soal.opsi),
                    kunciHuruf: b.soal.tipe === "IS" ? [] : parseKunci(b.soal.tipe, b.soal.kunci),
                    kunciTeks: b.soal.tipe === "IS" ? b.soal.kunci : "",
                    kunciBS: b.soal.tipe === "BS" ? parseKunci(b.soal.tipe, b.soal.kunci) : undefined,
                    pembahasan: b.soal.pembahasan ?? "",
                  }}
                />
              </section>
            );
          })}
        </div>
      )}

      <p className="no-print mt-8 text-center text-xs text-muted">
        Menampilkan {butir.length} butir{" "}
        {aktif === SEMUA ? "dari seluruh subtes" : namaSubtes(aktif)}.
      </p>
    </>
  );
}
