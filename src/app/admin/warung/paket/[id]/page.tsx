import Link from "next/link";
import { notFound } from "next/navigation";

import {
  hapusSoalWarungAction,
  kosongkanPaketWarungAction,
  simpanPaketWarungAction,
} from "@/app/admin/actions";
import { PesanFlash } from "@/components/admin/AdminUI";
import { TombolKonfirmasi } from "@/components/admin/TombolKonfirmasi";
import { WarungSoalForm } from "@/components/admin/WarungSoalForm";
import { TeksSoal } from "@/components/TeksSoal";
import { Badge, PageHeader } from "@/components/ui";
import { IkonKategori } from "@/components/warung/Ikon";
import { type ParamsQuery, potongTeks, satuParam } from "@/lib/admin/admin";
import { requireAdmin } from "@/lib/auth/auth";
import { getSubtes } from "@/lib/tryout/snbt";
import {
  KOMPOSISI,
  type SoalWarung,
  ambilPaket,
  bacaKunciPgk,
  bacaOpsi,
  daftarSoal,
  kategoriPaket,
  komposisiTerisi,
  nomorBerikutnya,
} from "@/lib/warung/warung";
import { jumlahPemainPaket } from "@/lib/warung/warung-admin";

export const metadata = { title: "Kelola Paket Warung" };
export const dynamic = "force-dynamic";

const HURUF = ["A", "B", "C", "D", "E", "F"];

export default async function KelolaPaketWarung({
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

  const info = getSubtes(paket.subtes)!;
  const target = KOMPOSISI[paket.subtes];
  const terisi = await komposisiTerisi(paket.id);
  const kategori = kategoriPaket(paket.nomor);
  const soal = await daftarSoal(paket.id);
  const pemain = await jumlahPemainPaket(paket.id);
  const siap = terisi.total >= target.total;

  const suntingId = Number.parseInt(satuParam(sp.sunting) ?? "", 10);
  const disunting = Number.isInteger(suntingId) ? soal.find((s) => s.id === suntingId) : undefined;

  return (
    <>
      <PageHeader
        title={`${info.namaPendek} — Paket ${paket.nomor}`}
        subtitle={`${info.nama} · ${info.durasiMenit} menit${pemain ? ` · sudah dikerjakan ${pemain} siswa` : ""}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link className="btn btn-ghost" href={`/admin/warung/paket/${paket.id}/impor`}>
              ⬆ Impor Word/Excel
            </Link>
            <Link className="btn btn-ghost" href={`/admin/warung/${paket.subtes}`}>
              ← Semua paket
            </Link>
          </div>
        }
      />

      <PesanFlash pesan={satuParam(sp.pesan)} galat={satuParam(sp.galat)} />

      {/* ---------- Kelengkapan ---------- */}
      <section className="card mb-6 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-widest"
            style={{ background: kategori.warnaLembut, color: kategori.warna }}
          >
            <IkonKategori kategori={kategori.kode} className="h-4 w-4" />
            {kategori.nama} · {kategori.poin} poin/benar
          </span>

          {siap ? (
            <Badge tone="success">Siap dipakai siswa</Badge>
          ) : terisi.total > 0 ? (
            <Badge tone="warning">Kurang {target.total - terisi.total} soal lagi</Badge>
          ) : (
            <Badge tone="muted">Masih kosong</Badge>
          )}

          <p className="min-w-56 flex-1 text-sm text-muted">
            {siap
              ? "Paket ini otomatis tersedia bagi siswa yang sudah menuntaskan paket sebelumnya. Tidak ada tombol terbitkan."
              : `Paket terbuka sendiri begitu soalnya mencapai ${target.total} butir — tidak perlu diterbitkan manual.`}
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Hitungan label="Total soal" ada={terisi.total} target={target.total} />
          <Hitungan label="Pilihan ganda" ada={terisi.pg} target={target.pg} />
          <Hitungan label="Benar / Salah" ada={terisi.pgk} target={target.pgk} />
          <Hitungan label="Isian singkat" ada={terisi.is} target={target.is} />
        </div>

        <p className="mt-3 text-xs text-muted">
          Yang menentukan paket terbuka hanyalah <strong>total soal</strong>; rincian bentuk butir
          di atas adalah target susunan, bukan syarat.
        </p>
      </section>

      {/* ---------- Keterangan paket ---------- */}
      <details className="card mb-6 p-5">
        <summary className="cursor-pointer text-sm font-extrabold uppercase tracking-wide">
          Ubah keterangan paket
        </summary>
        <form action={simpanPaketWarungAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="paket_id" value={paket.id} />
          <div>
            <label className="label" htmlFor="judul">
              Judul
            </label>
            <input className="input" id="judul" name="judul" defaultValue={paket.judul ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="catatan">
              Catatan internal
            </label>
            <input
              className="input"
              id="catatan"
              name="catatan"
              defaultValue={paket.catatan ?? ""}
              placeholder="mis. sumber naskah, tema paket"
            />
          </div>
          <div className="sm:col-span-2">
            <button className="btn btn-primary" type="submit">
              Simpan keterangan
            </button>
          </div>
        </form>

        {soal.length > 0 && (
          <form action={kosongkanPaketWarungAction} className="mt-5 border-t border-line pt-4">
            <input type="hidden" name="paket_id" value={paket.id} />
            <TombolKonfirmasi
              pesan={`Hapus SELURUH ${soal.length} soal di paket ini? Nilai siswa yang sudah tersimpan ikut kehilangan acuan soalnya.`}
              className="btn btn-ghost border-danger/40! text-danger!"
            >
              Kosongkan paket
            </TombolKonfirmasi>
          </form>
        )}
      </details>

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        {/* ---------- Daftar soal ---------- */}
        <section>
          <h2 className="text-sm font-extrabold uppercase tracking-wide">{soal.length} soal</h2>

          {soal.length === 0 ? (
            <p className="card mt-3 p-8 text-center text-sm text-muted">
              Paket ini masih kosong. Tambahkan lewat panel di sebelah, atau impor sekaligus dari
              berkas Word/Excel.
            </p>
          ) : (
            <ol className="mt-3 space-y-3">
              {soal.map((s) => (
                <KartuSoal key={s.id} soal={s} paketId={paket.id} disunting={disunting?.id === s.id} />
              ))}
            </ol>
          )}
        </section>

        {/* ---------- Formulir ---------- */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <h2 className="text-sm font-extrabold uppercase tracking-wide">
              {disunting ? `Sunting soal ${disunting.nomor}` : "Tambah soal"}
            </h2>
            {disunting && (
              <Link
                href={`/admin/warung/paket/${paket.id}`}
                className="mt-1 inline-block text-xs font-semibold text-muted hover:text-brand"
              >
                ← batal menyunting, kembali menambah soal baru
              </Link>
            )}

            <div className="mt-4">
              <WarungSoalForm
                key={disunting?.id ?? "baru"}
                paketId={paket.id}
                nomorBerikutnya={await nomorBerikutnya(paket.id)}
                awal={
                  disunting
                    ? {
                        id: disunting.id,
                        nomor: disunting.nomor,
                        tipe: disunting.tipe,
                        stimulus: disunting.stimulus ?? "",
                        pertanyaan: disunting.pertanyaan,
                        gambar_url: disunting.gambar_url ?? "",
                        opsi: bacaOpsi(disunting),
                        kunci:
                          disunting.tipe === "PGK" ? bacaKunciPgk(disunting.kunci) : disunting.kunci,
                        pembahasan: disunting.pembahasan ?? "",
                      }
                    : undefined
                }
              />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function Hitungan({ label, ada, target }: { label: string; ada: number; target: number }) {
  const pas = ada === target;
  return (
    <div className="rounded-xl border border-line bg-surface-muted/50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</p>
      <p
        className={`mt-0.5 text-lg font-extrabold tabular-nums ${
          pas ? "text-success" : ada > target ? "text-danger" : "text-foreground"
        }`}
      >
        {ada}
        <span className="text-sm font-semibold text-muted">/{target}</span>
      </p>
    </div>
  );
}

function KartuSoal({
  soal: s,
  paketId,
  disunting,
}: {
  soal: SoalWarung;
  paketId: number;
  disunting: boolean;
}) {
  const opsi = bacaOpsi(s);
  const kunciPgk = s.tipe === "PGK" ? bacaKunciPgk(s.kunci) : [];

  return (
    <li className={`card p-4 ${disunting ? "border-brand!" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-widest text-muted">
            Nomor {s.nomor}
          </span>
          <Badge tone={s.tipe === "PG" ? "muted" : s.tipe === "PGK" ? "brand" : "accent"}>
            {s.tipe === "PG" ? "Pilihan Ganda" : s.tipe === "PGK" ? "Benar/Salah" : "Isian"}
          </Badge>
          {s.gambar_url && <Badge tone="warning">Bergambar</Badge>}
        </span>

        <span className="flex shrink-0 gap-3">
          <Link
            href={`/admin/warung/paket/${paketId}?sunting=${s.id}`}
            className="text-xs font-bold text-brand hover:underline"
          >
            Sunting
          </Link>
          <FormHapus paketId={paketId} soalId={s.id} nomor={s.nomor} />
        </span>
      </div>

      {s.stimulus && (
        <TeksSoal
          html={s.stimulus}
          className="mt-2 rounded-lg bg-surface-muted p-3 text-xs text-muted"
        />
      )}

      <TeksSoal html={s.pertanyaan} className="mt-2 text-sm" />

      {s.tipe === "IS" ? (
        <p className="mt-3 rounded-lg bg-success-soft px-3 py-1.5 text-xs font-semibold text-success">
          Kunci: {s.kunci}
        </p>
      ) : (
        <ul className="mt-3 grid gap-1 sm:grid-cols-2">
          {opsi.map((o, i) => {
            const tepat = s.tipe === "PGK" ? kunciPgk[i] === "B" : HURUF[i] === s.kunci;
            const tanda = s.tipe === "PGK" ? (kunciPgk[i] ?? "?") : HURUF[i];
            return (
              <li
                key={i}
                className={`flex gap-2 rounded-lg px-2 py-1 text-xs ${
                  s.tipe === "PGK"
                    ? tepat
                      ? "bg-success-soft text-success"
                      : "bg-danger-soft text-danger"
                    : tepat
                      ? "bg-success-soft font-semibold text-success"
                      : "text-muted"
                }`}
              >
                <span className="font-bold">{tanda}.</span>
                <span className="min-w-0 flex-1">{potongTeks(o, 70)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

/** Formulir hapus dipisah supaya tombol konfirmasinya punya status pending sendiri. */
function FormHapus({
  paketId,
  soalId,
  nomor,
}: {
  paketId: number;
  soalId: number;
  nomor: number;
}) {
  return (
    <form action={hapusSoalWarungAction}>
      <input type="hidden" name="paket_id" value={paketId} />
      <input type="hidden" name="soal_id" value={soalId} />
      <TombolKonfirmasi
        pesan={`Hapus soal nomor ${nomor}? Nomor sesudahnya akan dirapatkan.`}
        className="text-xs font-bold text-danger hover:underline"
      >
        Hapus
      </TombolKonfirmasi>
    </form>
  );
}
