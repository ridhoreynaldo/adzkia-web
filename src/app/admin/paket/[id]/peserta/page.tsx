import Link from "next/link";
import { notFound } from "next/navigation";

import {
  bukaPaketSemuaAction,
  hapusPesertaPaketAction,
  setelKelasPaketAction,
  tambahPesertaPaketAction,
} from "@/app/admin/actions";
import { KartuStat, PesanFlash, TabelScroll, TD, TH } from "@/components/admin/AdminUI";
import { TombolKonfirmasi } from "@/components/admin/TombolKonfirmasi";
import { Alert, Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import {
  type ParamsQuery,
  ambilPaketRingkas,
  daftarKelas,
  daftarPeserta,
  pesertaDiizinkanPaket,
  pesertaPaket,
  satuParam,
} from "@/lib/admin/admin";
import { requireAdmin } from "@/lib/auth/auth";

export const metadata = { title: "Peserta Paket" };
export const dynamic = "force-dynamic";

export default async function PesertaPaketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ParamsQuery>;
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const packageId = Number.parseInt(id, 10);
  const paket = Number.isInteger(packageId) ? await ambilPaketRingkas(packageId) : undefined;
  if (!paket) notFound();

  const kelas = await daftarKelas(packageId);
  const namaSendiri = await pesertaPaket(packageId);
  const diizinkan = await pesertaDiizinkanPaket(packageId);
  const dibatasi = kelas.some((k) => k.terpilih) || namaSendiri.length > 0;

  const cari = (satuParam(sp.cari) ?? "").trim();
  // Pencarian hanya dijalankan kalau memang diketik: daftar 385 peserta yang
  // terbuka penuh tidak menolong siapa pun.
  const hasilCari = cari ? (await daftarPeserta(cari)).filter((p) => p.role === "siswa") : [];
  const sudahTerdaftar = new Set(namaSendiri.map((p) => p.user_id));

  return (
    <>
      <PageHeader
        title="Peserta Paket"
        subtitle={`${paket.nama} · ${paket.kode}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link className="btn btn-ghost" href="/admin/paket">
              ← Daftar paket
            </Link>
            <Link className="btn btn-ghost" href={`/admin/paket/${packageId}/soal`}>
              Bank soal
            </Link>
          </div>
        }
      />

      <PesanFlash pesan={satuParam(sp.pesan)} galat={satuParam(sp.galat)} />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <KartuStat
          label="Status paket"
          nilai={dibatasi ? "Dibatasi" : "Terbuka"}
          keterangan={dibatasi ? "hanya yang terdaftar" : "semua peserta boleh ikut"}
        />
        <KartuStat
          label="Peserta yang boleh ikut"
          nilai={dibatasi ? String(diizinkan.length) : "Semua"}
          keterangan={dibatasi ? "gabungan kelas + nama" : "tidak ada pembatas"}
        />
        <KartuStat
          label="Kelas dipilih"
          nilai={String(kelas.filter((k) => k.terpilih).length)}
          keterangan={`dari ${kelas.length} kelas`}
        />
      </div>

      {!dibatasi && (
        <div className="mb-5">
          <Alert tone="warning">
            Paket ini <strong>terbuka untuk semua peserta</strong>. Begitu kamu mencentang satu kelas
            atau menambahkan satu nama di bawah, paket langsung berubah menjadi terbatas — dan
            peserta di luar daftar tidak akan melihatnya di berandanya.
          </Alert>
        </div>
      )}

      {/* ---------------- Kelas ---------------- */}
      <Card className="mb-5">
        <h2 className="text-lg font-bold tracking-tight">Kelas yang diizinkan</h2>
        <p className="mt-1 text-sm text-muted">
          Centang kelas yang mengikuti paket ini. Seluruh peserta di kelas tersebut ikut, tanpa perlu
          menambahkan namanya satu per satu. Kelas yang ejaannya berbeda besar-kecil hurufnya sudah
          digabung menjadi satu.
        </p>

        {kelas.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Belum ada data kelas"
              description="Kolom kelas pada akun peserta masih kosong. Isi lewat Impor Peserta lebih dulu."
            />
          </div>
        ) : (
          <form action={setelKelasPaketAction} className="mt-4">
            <input type="hidden" name="package_id" value={packageId} />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {kelas.map((k) => (
                <label
                  key={k.kelas}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors ${
                    k.terpilih ? "border-success bg-success-soft" : "border-line bg-surface"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="kelas"
                    value={k.kelas}
                    defaultChecked={k.terpilih}
                    className="h-5 w-5 accent-[var(--brand)]"
                  />
                  <span className="min-w-0 flex-1 text-sm font-semibold">
                    {k.kelas}
                    <span className="ml-2 font-normal text-muted">{k.jumlah} peserta</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="submit" className="btn btn-primary">
                Simpan pilihan kelas
              </button>
              <p className="text-xs text-muted">
                Menghapus semua centang akan mengosongkan daftar kelas paket ini.
              </p>
            </div>
          </form>
        )}
      </Card>

      {/* ---------------- Nama per orang ---------------- */}
      <Card className="mb-5">
        <h2 className="text-lg font-bold tracking-tight">Nama tambahan di luar kelas</h2>
        <p className="mt-1 text-sm text-muted">
          Untuk peserta yang ikut walau kelasnya tidak dicentang — misalnya peserta pindahan atau
          peserta lintas kelas.
        </p>

        <form method="get" className="mt-4 flex flex-wrap items-end gap-2">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
              Cari nama atau NISN
            </span>
            <input
              type="search"
              name="cari"
              defaultValue={cari}
              placeholder="Ketik nama atau NISN peserta…"
              className="input w-full"
            />
          </label>
          <button type="submit" className="btn btn-ghost">
            Cari
          </button>
        </form>

        {cari && (
          <div className="mt-4">
            {hasilCari.length === 0 ? (
              <Alert tone="muted">Tidak ada peserta yang cocok dengan “{cari}”.</Alert>
            ) : (
              <TabelScroll>
                <table className="w-full min-w-[36rem]">
                  <thead>
                    <tr className="border-b border-line">
                      <th className={TH}>Nama</th>
                      <th className={TH}>NISN</th>
                      <th className={TH}>Kelas</th>
                      <th className={TH}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {hasilCari.slice(0, 25).map((p) => (
                      <tr key={p.id} className="border-b border-line/60">
                        <td className={`${TD} font-semibold`}>{p.nama}</td>
                        <td className={TD}>{p.nisn ?? "—"}</td>
                        <td className={TD}>{p.kelas ?? "—"}</td>
                        <td className={`${TD} text-right`}>
                          {sudahTerdaftar.has(p.id) ? (
                            <Badge tone="success">Sudah terdaftar</Badge>
                          ) : (
                            <form action={tambahPesertaPaketAction}>
                              <input type="hidden" name="package_id" value={packageId} />
                              <input type="hidden" name="user_id" value={p.id} />
                              <button type="submit" className="btn btn-ghost !px-3 !py-1.5 text-sm">
                                Tambahkan
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TabelScroll>
            )}
          </div>
        )}

        <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-muted">
          Sudah ditambahkan ({namaSendiri.length})
        </h3>
        {namaSendiri.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Belum ada nama tambahan.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {namaSendiri.map((p) => (
              <li key={p.user_id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 text-sm">
                  <strong>{p.nama}</strong>
                  <span className="ml-2 text-muted">
                    {p.kelas ?? "tanpa kelas"}
                    {p.nisn ? ` · ${p.nisn}` : ""}
                  </span>
                </span>
                <form action={hapusPesertaPaketAction}>
                  <input type="hidden" name="package_id" value={packageId} />
                  <input type="hidden" name="user_id" value={p.user_id} />
                  <TombolKonfirmasi pesan={`Keluarkan ${p.nama} dari daftar peserta paket ini?`}>
                    Keluarkan
                  </TombolKonfirmasi>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* ---------------- Rekap siapa yang boleh ikut ---------------- */}
      {dibatasi && (
        <Card className="mb-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Yang akan bisa mengerjakan ({diizinkan.length})
              </h2>
              <p className="mt-1 text-sm text-muted">
                Gabungan seluruh kelas yang dicentang dan nama tambahan. Peserta di luar daftar ini
                tidak melihat paket tersebut di berandanya dan tidak bisa membukanya lewat tautan.
              </p>
            </div>
            <form action={bukaPaketSemuaAction}>
              <input type="hidden" name="package_id" value={packageId} />
              <TombolKonfirmasi pesan="Buang semua pembatas paket ini sehingga seluruh peserta bisa mengikutinya?">
                Buka untuk semua
              </TombolKonfirmasi>
            </form>
          </div>

          <div className="mt-4">
            <TabelScroll>
              <table className="w-full min-w-[36rem]">
                <thead>
                  <tr className="border-b border-line">
                    <th className={TH}>Nama</th>
                    <th className={TH}>NISN</th>
                    <th className={TH}>Kelas</th>
                    <th className={TH}>Ikut karena</th>
                  </tr>
                </thead>
                <tbody>
                  {diizinkan.map((p) => (
                    <tr key={p.user_id} className="border-b border-line/60">
                      <td className={`${TD} font-semibold`}>{p.nama}</td>
                      <td className={TD}>{p.nisn ?? "—"}</td>
                      <td className={TD}>{p.kelas ?? "—"}</td>
                      <td className={TD}>
                        {p.lewat_kelas ? (
                          <Badge tone="muted">Kelas</Badge>
                        ) : (
                          <Badge tone="brand">Nama</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabelScroll>
          </div>
        </Card>
      )}
    </>
  );
}
