import Link from "next/link";

import { TD, TH, TabelScroll } from "@/components/admin/AdminUI";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { tanggalIndo } from "@/lib/admin/admin";
import { requireAdminIelts } from "@/lib/auth/auth";
import { semuaPaket } from "@/lib/ielts/ielts";
import { daftarPesertaIelts } from "@/lib/ielts/ielts-rekap";
import { wajibFiturLanguage } from "@/lib/ielts/language";

export const metadata = { title: "Peserta IELTS" };
export const dynamic = "force-dynamic";

/**
 * DAFTAR PESERTA IELTS — pintu menuju rekap per peserta.
 *
 * Padanan `/admin/peserta` di jalur UTBK, dengan satu perbedaan yang disengaja:
 * yang didaftar di sini adalah PENGERJAAN, bukan akun. Pengelola IELTS tidak
 * punya wewenang atas akun siswa — mengangkat admin, menghapus akun, dan
 * melepas kunci perangkat tetap milik `/admin/peserta`, yang dijaga
 * `requireAdmin()`.
 */
export default async function PesertaIeltsPage({
  searchParams,
}: {
  searchParams: Promise<{ paket?: string; q?: string }>;
}) {
  await wajibFiturLanguage();
  await requireAdminIelts();

  const { paket: paketMentah, q } = await searchParams;
  const daftarPaket = await semuaPaket();
  const dipilih = Number(paketMentah) || 0;
  const cari = (q ?? "").trim().toLowerCase();

  const semua = await daftarPesertaIelts(dipilih);
  const baris = cari
    ? semua.filter(
        (b) =>
          b.nama.toLowerCase().includes(cari) ||
          (b.nisn ?? "").toLowerCase().includes(cari) ||
          (b.kelas ?? "").toLowerCase().includes(cari),
      )
    : semua;

  return (
    <>
      <PageHeader
        title="Peserta IELTS"
        subtitle="Setiap baris satu pengerjaan. Ketuk namanya untuk membuka rekap lengkapnya — band tiap subtes, lama pengerjaan, dan seluruh catatan keamanannya."
        action={
          <Link href="/admin/ielts/live" className="btn btn-ghost text-sm">
            ◉ Skor Live
          </Link>
        }
      />

      {/* ---------- Penyaring ---------- */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link
          href="/admin/ielts/peserta"
          className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${
            dipilih === 0
              ? "border-brand bg-brand-soft text-brand"
              : "border-line bg-surface text-muted hover:text-foreground"
          }`}
        >
          Semua paket
        </Link>
        {daftarPaket.map((p) => (
          <Link
            key={p.id}
            href={`/admin/ielts/peserta?paket=${p.id}`}
            className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${
              p.id === dipilih
                ? "border-brand bg-brand-soft text-brand"
                : "border-line bg-surface text-muted hover:text-foreground"
            }`}
          >
            {p.kode}
          </Link>
        ))}

        <form className="ml-auto flex items-center gap-2" action="/admin/ielts/peserta">
          {dipilih > 0 && <input type="hidden" name="paket" value={dipilih} />}
          <input
            className="input !py-2 w-56"
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Cari nama, NISN, kelas…"
            aria-label="Cari peserta IELTS"
          />
          <button className="btn btn-ghost !py-2" type="submit">
            Cari
          </button>
        </form>
      </div>

      {baris.length === 0 ? (
        <EmptyState
          title={cari ? `Tidak ada peserta yang cocok dengan "${q}"` : "Belum ada peserta IELTS"}
          description={
            cari
              ? "Coba kata kunci lain, atau lepas penyaring paketnya."
              : "Daftar ini terisi begitu ada siswa yang menyetujui tata tertib dan membuka subtes pertamanya."
          }
        />
      ) : (
        <div className="card overflow-hidden p-0">
          <TabelScroll>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-muted text-left">
                  <th className={TH}>Peserta</th>
                  <th className={TH}>Paket</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Mulai</th>
                  <th className={TH}>Selesai</th>
                  <th className={TH}>Keamanan</th>
                  <th className={TH} />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {baris.map((b) => (
                  <tr key={b.pengerjaanId} className="hover:bg-surface-muted/60">
                    <td className={TD}>
                      <Link
                        href={`/admin/ielts/peserta/${b.pengerjaanId}`}
                        className="font-semibold text-brand hover:underline"
                      >
                        {b.nama}
                      </Link>
                      <p className="text-xs text-muted">
                        {b.nisn ? `NISN ${b.nisn}` : "—"}
                        {b.kelas ? ` · ${b.kelas}` : ""}
                      </p>
                    </td>
                    <td className={`${TD} font-mono text-xs font-bold`}>{b.paketKode}</td>
                    <td className={TD}>
                      <Badge
                        tone={
                          b.status === "finished"
                            ? "success"
                            : b.status === "gugur"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {b.status === "finished"
                          ? "Selesai"
                          : b.status === "gugur"
                            ? "Dihentikan"
                            : "Berjalan"}
                      </Badge>
                    </td>
                    <td className={`${TD} whitespace-nowrap text-xs text-muted`}>
                      {tanggalIndo(b.startedAt)}
                    </td>
                    <td className={`${TD} whitespace-nowrap text-xs text-muted`}>
                      {tanggalIndo(b.finishedAt)}
                    </td>
                    <td className={TD}>
                      {b.pelanggaran > 0 ? (
                        <span className="inline-flex rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger">
                          {b.pelanggaran}× catatan
                        </span>
                      ) : (
                        <span className="text-xs text-muted">bersih</span>
                      )}
                    </td>
                    <td className={TD}>
                      <Link
                        href={`/admin/ielts/peserta/${b.pengerjaanId}`}
                        className="text-xs font-semibold text-brand hover:underline"
                      >
                        Rekap →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabelScroll>
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-muted">
        {baris.length} pengerjaan ditampilkan
        {semua.length !== baris.length ? ` dari ${semua.length}` : ""}. Mengelola AKUN siswa —
        mengubah peran, menghapus, melepas kunci perangkat — tetap di menu Peserta milik portal
        tryout, dan hanya bisa dilakukan pengelola berwenang penuh.
      </p>
    </>
  );
}
