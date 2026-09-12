import Link from "next/link";
import { notFound } from "next/navigation";

import {
  beriSusulanAction,
  bukaBlokirAction,
  cabutSusulanAction,
  hapusPesertaAction,
  lepasPerangkatPesertaAction,
  setPeranAction,
} from "@/app/admin/actions";
import { KartuStat, PesanFlash, TabelScroll, TD, TH } from "@/components/admin/AdminUI";
import { FotoPesertaAdmin } from "@/components/admin/FotoPesertaAdmin";
import { TombolKonfirmasi } from "@/components/admin/TombolKonfirmasi";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import {
  type ParamsQuery,
  ambilPeserta,
  izinSusulanPeserta,
  jejakPeserta,
  paketTerbit,
  pengerjaanPeserta,
  satuParam,
  tanggalIndo,
} from "@/lib/admin/admin";
import { requireAdmin } from "@/lib/auth/auth";
import { fotoPeserta } from "@/lib/penjagaan/foto-peserta";
import { JEDA_MENGANGGUR_MENIT, ringkasSesiPeserta } from "@/lib/auth/sesi-peserta";
import { identitasPeserta, konfirmasiHapusAkun } from "@/lib/core/tampilan";

export const metadata = { title: "Detail Peserta" };

export default async function DetailPesertaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ParamsQuery>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const userId = Number.parseInt(id, 10);
  const peserta = Number.isInteger(userId) ? await ambilPeserta(userId) : undefined;
  if (!peserta) notFound();

  const pengerjaan = await pengerjaanPeserta(peserta.id);
  const selesai = pengerjaan.filter((p) => p.status === "finished");
  const digugurkan = pengerjaan.filter((p) => p.status === "gugur");
  const izin = await izinSusulanPeserta(peserta.id);
  const paketTersedia = await paketTerbit();
  const jejak = await jejakPeserta(peserta.id);
  const foto = await fotoPeserta(peserta.id);
  const sesi = await ringkasSesiPeserta(peserta.id);
  const kembaliKe = `/admin/peserta/${peserta.id}`;

  return (
    <>
      <PageHeader
        title={peserta.nama}
        subtitle={identitasPeserta(peserta.email, peserta.asal_sekolah)}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link className="btn btn-ghost" href="/admin/peserta">
              ← Daftar peserta
            </Link>
            {peserta.id !== admin.id && (
              <form action={setPeranAction}>
                <input type="hidden" name="id" value={peserta.id} />
                <input type="hidden" name="peran" value={peserta.role === "admin" ? "siswa" : "admin"} />
                <input type="hidden" name="kembali_ke" value={`/admin/peserta/${peserta.id}`} />
                <TombolKonfirmasi
                  className={`btn btn-ghost ${peserta.role === "admin" ? "text-danger!" : "text-brand!"}`}
                  pesan={
                    peserta.role === "admin"
                      ? `Cabut peran admin dari ${peserta.nama}?`
                      : `Angkat ${peserta.nama} menjadi admin?`
                  }
                >
                  {peserta.role === "admin" ? "Turunkan jadi siswa" : "Angkat jadi admin"}
                </TombolKonfirmasi>
              </form>
            )}
            {peserta.id !== admin.id && (
              <form action={hapusPesertaAction}>
                <input type="hidden" name="id" value={peserta.id} />
                <input type="hidden" name="kembali_ke" value={kembaliKe} />
                <TombolKonfirmasi
                  className="btn btn-ghost text-danger!"
                  pesan={konfirmasiHapusAkun(peserta.nama, jejak ?? {})}
                >
                  Hapus akun
                </TombolKonfirmasi>
              </form>
            )}
          </div>
        }
      />

      <PesanFlash pesan={satuParam(sp.pesan)} galat={satuParam(sp.galat)} />

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KartuStat label="Peran" nilai={peserta.role === "admin" ? "Admin" : "Siswa"} />
        <KartuStat
          label="Tryout diikuti"
          nilai={peserta.jumlah_tryout}
          keterangan={
            digugurkan.length > 0
              ? `${selesai.length} selesai · ${digugurkan.length} digugurkan`
              : `${selesai.length} selesai`
          }
        />
        <KartuStat
          label="Rata-rata skor"
          nilai={peserta.rata_skor != null ? Math.round(peserta.rata_skor) : "—"}
          keterangan="Skala 0–1000"
        />
        <KartuStat label="Terdaftar" nilai={tanggalIndo(peserta.created_at, false)} />
      </section>

      {/* Foto peserta — hanya admin yang boleh mengubahnya. Peserta memakainya
          untuk memastikan NISN yang sedang dipakai memang miliknya, jadi
          identitas ini tidak boleh bisa diganti sendiri oleh pemiliknya. */}
      <div className="card mb-6 p-5">
        <FotoPesertaAdmin userId={peserta.id} nama={peserta.nama} fotoAwal={foto} />
      </div>

      {/* Perangkat yang sedang memegang akun.
          Satu akun peserta = satu perangkat, satu peramban. Tombol di sini
          adalah katup pengaman aturan itu: tanpanya, peserta yang laptopnya
          mati di tengah ujian harus menunggu jeda menganggur lewat sebelum
          bisa masuk dari perangkat pengganti. */}
      {peserta.role !== "admin" && (
        <section className="card mb-8 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight">Perangkat &amp; peramban</h2>
              <p className="mt-1 text-sm text-muted">
                Satu akun peserta hanya boleh dipakai di <strong>satu perangkat</strong> dan{" "}
                <strong>satu peramban</strong>. Selama sesinya masih hidup, siapa pun yang mencoba
                masuk dengan akun ini dari perangkat atau peramban lain akan{" "}
                <strong>ditolak</strong> — termasuk peserta itu sendiri.
              </p>
            </div>
            {sesi.ada && (
              <form action={lepasPerangkatPesertaAction}>
                <input type="hidden" name="user_id" value={peserta.id} />
                <input type="hidden" name="kembali_ke" value={kembaliKe} />
                <TombolKonfirmasi
                  className="btn btn-accent !px-3 !py-1.5 text-sm"
                  pesan={`Lepaskan kunci perangkat ${peserta.nama} (${sesi.alat})? Setelah ini ia bisa masuk dari perangkat mana pun. Kalau perangkat lamanya ternyata masih terbuka, ia ikut diminta masuk ulang — pastikan perangkat itu memang sudah tidak dipakai.`}
                >
                  Lepaskan perangkat
                </TombolKonfirmasi>
              </form>
            )}
          </div>

          <p className="mt-4 text-sm">
            {!sesi.ada ? (
              <span className="font-semibold text-success">
                Tidak terkunci. Peserta bisa masuk dari perangkat mana pun sekarang.
              </span>
            ) : sesi.terkunci ? (
              <>
                <span className="font-semibold text-warning">
                  Terkunci di {sesi.alat}
                  {sesi.diamMenit > 0 ? ` · terakhir aktif ${sesi.diamMenit} menit lalu` : " · sedang aktif"}
                  .
                </span>{" "}
                <span className="text-muted">
                  Peserta bisa membebaskannya sendiri dengan menekan tombol{" "}
                  <strong>Keluar</strong> di perangkat itu. Kalau perangkatnya sudah tidak bisa
                  dibuka lagi, pakai tombol di samping.
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold text-success">
                  Sudah bebas — sesinya di {sesi.alat} menganggur {sesi.diamMenit} menit
                  (batas {JEDA_MENGANGGUR_MENIT} menit).
                </span>{" "}
                <span className="text-muted">
                  Peserta boleh masuk dari perangkat mana pun tanpa perlu dilepas.
                </span>
              </>
            )}
          </p>
        </section>
      )}

      {/* Pengerjaan yang sedang TERBLOKIR — dipisahkan dari izin susulan di
          bawah karena akibatnya berlawanan: yang ini melanjutkan, yang di bawah
          mengulang dari nol. */}
      {digugurkan.length > 0 && (
        <section className="card mb-8 p-5">
          <h2 className="text-lg font-bold tracking-tight">
            Ujian terblokir ({digugurkan.length})
          </h2>
          <p className="mt-1 text-sm text-muted">
            <strong>Dibuka</strong> mengembalikan peserta ke subtes yang tadi terpotong.{" "}
            <strong>Jawaban yang sudah terisi tidak dihapus</strong>, dan sisa waktu subtes itu
            dikembalikan sepanjang ia terblokir. Pilih ini bila ujiannya terhenti karena jaringan,
            layar membeku, atau ia telanjur keluar dari halaman ujian.
          </p>

          <ul className="mt-4 divide-y divide-line">
            {digugurkan.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="min-w-0 text-sm">
                  <strong>{g.paket_nama}</strong>
                  <span className="ml-2 text-muted">
                    {g.kode} · dimulai {tanggalIndo(g.started_at)}
                  </span>
                </span>
                <form action={bukaBlokirAction}>
                  <input type="hidden" name="user_id" value={peserta.id} />
                  <input type="hidden" name="package_id" value={g.package_id} />
                  <input type="hidden" name="kembali_ke" value={kembaliKe} />
                  <TombolKonfirmasi
                    className="btn btn-primary !px-3 !py-1.5 text-sm"
                    pesan={`Buka blokir ${peserta.nama} pada paket ${g.kode}? Ia melanjutkan dari subtes yang tadi terpotong, dan jawabannya tidak dihapus.`}
                  >
                    Dibuka
                  </TombolKonfirmasi>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card mb-8 p-5">
        <h2 className="text-lg font-bold tracking-tight">Ujian susulan</h2>
        <p className="mt-1 text-sm text-muted">
          Beri izin bila peserta berhalangan hadir pada hari-H, atau bila kamu memutuskan memberinya
          kesempatan ulang setelah digugurkan. Tombol <strong>Ujian Susulan</strong> baru muncul di
          beranda peserta setelah izin ini diberikan, dan paket tetap bisa dibuka meski jendela
          waktunya sudah lewat.
        </p>

        {paketTersedia.length === 0 ? (
          <p className="mt-4 text-sm font-semibold text-warning">
            Belum ada paket berstatus terbit. Terbitkan paket dulu di menu Paket Tryout.
          </p>
        ) : (
          <form action={beriSusulanAction} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="user_id" value={peserta.id} />
            <input type="hidden" name="kembali_ke" value={kembaliKe} />
            <div className="min-w-56 flex-1">
              <label className="label" htmlFor="package_id">
                Paket tryout
              </label>
              <select className="input" id="package_id" name="package_id" required>
                {paketTersedia.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.kode} — {p.nama}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-56 flex-1">
              <label className="label" htmlFor="catatan">
                Alasan (opsional)
              </label>
              <input
                className="input"
                id="catatan"
                name="catatan"
                placeholder="Sakit, izin keluarga, dll."
              />
            </div>
            <button className="btn btn-primary" type="submit">
              Izinkan ujian susulan
            </button>
          </form>
        )}

        {izin.length > 0 && (
          <div className="mt-5 space-y-2">
            {izin.map((i) => (
              <div
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-muted px-4 py-3"
              >
                <div className="min-w-0 text-sm">
                  <span className="font-mono text-xs font-bold">{i.paket_kode}</span>{" "}
                  <span className="font-semibold">{i.paket_nama}</span>
                  <span className="block text-xs text-muted">
                    Diberikan {tanggalIndo(i.created_at)}
                    {i.pemberi ? ` oleh ${i.pemberi}` : ""}
                    {i.catatan ? ` · ${i.catatan}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={i.dipakai_at ? "success" : "accent"}>
                    {i.dipakai_at ? `Sudah dipakai ${tanggalIndo(i.dipakai_at)}` : "Menunggu dipakai"}
                  </Badge>
                  <form action={cabutSusulanAction}>
                    <input type="hidden" name="user_id" value={peserta.id} />
                    <input type="hidden" name="package_id" value={i.package_id} />
                    <input type="hidden" name="kembali_ke" value={kembaliKe} />
                    <TombolKonfirmasi
                      className="text-xs font-semibold text-danger hover:underline"
                      pesan={`Cabut izin ujian susulan ${i.paket_kode} untuk ${peserta.nama}?`}
                    >
                      Cabut izin
                    </TombolKonfirmasi>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <h2 className="mb-3 text-lg font-bold tracking-tight">Riwayat pengerjaan</h2>

      {pengerjaan.length === 0 ? (
        <EmptyState
          title="Belum pernah mengerjakan tryout"
          description="Peserta ini belum memulai satu paket pun."
        />
      ) : (
        <div className="card overflow-hidden">
          <TabelScroll>
            <table className="min-w-full border-collapse">
              <thead className="bg-surface-muted">
                <tr>
                  <th className={TH}>Paket</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Mulai</th>
                  <th className={TH}>Selesai</th>
                  <th className={TH}>Skor</th>
                  <th className={TH}></th>
                </tr>
              </thead>
              <tbody>
                {pengerjaan.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className={TD}>
                      <span className="font-mono text-xs font-bold">{p.kode}</span>
                      <span className="block text-xs text-muted">{p.paket_nama}</span>
                    </td>
                    <td className={TD}>
                      <Badge
                        tone={
                          p.status === "finished"
                            ? "success"
                            : p.status === "gugur"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {p.status === "finished"
                          ? "Selesai"
                          : p.status === "gugur"
                            ? "GAGAL — pelanggaran"
                            : "Sedang dikerjakan"}
                      </Badge>
                    </td>
                    <td className={`${TD} whitespace-nowrap text-xs text-muted`}>
                      {tanggalIndo(p.started_at)}
                    </td>
                    <td className={`${TD} whitespace-nowrap text-xs text-muted`}>
                      {tanggalIndo(p.finished_at)}
                    </td>
                    <td className={`${TD} tabular-nums font-bold`}>
                      {p.total_skor != null ? Math.round(p.total_skor) : "—"}
                    </td>
                    <td className={TD}>
                      {p.status === "finished" ? (
                        <Link
                          className="text-xs font-semibold text-brand hover:underline"
                          href={`/hasil/${p.id}`}
                        >
                          Lihat hasil →
                        </Link>
                      ) : (
                        <span className="text-xs text-muted">
                          {p.status === "gugur" ? "Tidak dinilai" : "Belum ada hasil"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabelScroll>
        </div>
      )}
    </>
  );
}
