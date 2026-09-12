import Link from "next/link";

import { ubahKunciPortalAction } from "@/app/admin/actions";
import { PesanFlash } from "@/components/admin/AdminUI";
import { TombolKonfirmasi } from "@/components/admin/TombolKonfirmasi";
import { GemboksBesar, GemboksKecil } from "@/components/portal/Gemboks";
import { PageHeader } from "@/components/ui";
import { type ParamsQuery, satuParam } from "@/lib/admin/admin";
import { requireAdmin } from "@/lib/auth/auth";
import { semuaStatusPortal, type StatusPortal } from "@/lib/admin/portal";
import { waktuIndo } from "@/lib/core/tampilan";

export const metadata = { title: "Kunci Portal" };
export const dynamic = "force-dynamic";

/**
 * Kendali buka-tutup kedua jalur latihan.
 *
 * Satu kartu besar per jalur, bukan sederet sakelar kecil: menutup portal
 * adalah tindakan yang menghentikan seluruh siswa, jadi keadaannya harus
 * terbaca dari seberang ruangan dan tombolnya tidak boleh tertekan sambil lalu.
 */
export default async function HalamanPortalAdmin({
  searchParams,
}: {
  searchParams: Promise<ParamsQuery>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const portal = await semuaStatusPortal();
  const jumlahTerkunci = portal.filter((p) => p.terkunci).length;

  return (
    <>
      <PageHeader
        title="Kunci Portal"
        subtitle="Tentukan kapan siswa boleh masuk ke tiap jalur latihan. Perubahannya berlaku seketika."
      />

      <PesanFlash pesan={satuParam(sp.pesan)} galat={satuParam(sp.galat)} />

      {/* ---------- Ringkasan keadaan ---------- */}
      <div
        className={`mb-6 flex flex-wrap items-center gap-3 rounded-xl border p-4 ${
          jumlahTerkunci === 0
            ? "border-success/25 bg-success-soft"
            : jumlahTerkunci === portal.length
              ? "border-danger/25 bg-danger-soft"
              : "border-warning/25 bg-warning-soft"
        }`}
      >
        <GemboksKecil
          terkunci={jumlahTerkunci > 0}
          className={
            jumlahTerkunci === 0
              ? "text-success"
              : jumlahTerkunci === portal.length
                ? "text-danger"
                : "text-warning"
          }
        />
        <p className="text-sm font-semibold">
          {jumlahTerkunci === 0
            ? "Kedua portal terbuka — siswa bisa masuk ke UTBK maupun SKD."
            : jumlahTerkunci === portal.length
              ? "Kedua portal dikunci — tidak ada siswa yang bisa masuk."
              : `${portal.find((p) => p.terkunci)!.nama} dikunci, jalur satunya masih terbuka.`}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {portal.map((p) => (
          <KartuPortal key={p.jalur} portal={p} />
        ))}
      </div>

      {/* ---------- Penjelasan cakupan kunci ---------- */}
      <section className="card mt-6 p-5">
        <h2 className="text-sm font-extrabold uppercase tracking-wide">
          Apa yang terjadi saat portal dikunci
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
          <li className="flex gap-2">
            <span className="font-bold text-danger" aria-hidden>
              ✕
            </span>
            <span>
              Seluruh jalur itu tertutup bagi siswa — halaman jalurnya, pintu masuk, ruang ujian,
              sampai halaman hasil. Semuanya dialihkan ke layar terkunci.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-success" aria-hidden>
              ✓
            </span>
            <span>
              <strong className="text-foreground">Kamu sebagai admin tetap bisa masuk</strong>,
              supaya bisa menguji soal dan mengawasi ruang ujian selagi portal ditutup.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-success" aria-hidden>
              ✓
            </span>
            <span>
              Siswa yang <strong className="text-foreground">sedang</strong> mengerjakan tidak
              diputus. Jawabannya tetap tersimpan sampai ia menuntaskan sesi — mengunci portal
              menutup pintu masuk, bukan mencabut pekerjaan yang sedang berlangsung.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-muted" aria-hidden>
              •
            </span>
            <span>
              Kunci ini terpisah dari status paket. Paket yang masih{" "}
              <strong className="text-foreground">draft</strong> tetap tersembunyi walau portalnya
              terbuka — atur itu di{" "}
              <Link href="/admin/paket" className="font-semibold text-brand underline">
                Paket Tryout
              </Link>
              .
            </span>
          </li>
        </ul>
      </section>
    </>
  );
}

function KartuPortal({ portal: p }: { portal: StatusPortal }) {
  const skd = p.jalur === "skd";
  const { terkunci } = p;

  return (
    <section
      className={`${skd ? "tema-skd" : ""} relative overflow-hidden rounded-2xl border-2 bg-surface p-6 transition-colors ${
        terkunci ? "border-danger/30" : "border-success/30"
      }`}
    >
      {/* Cahaya sudut mengikuti status, bukan mengikuti jalur. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          background: `radial-gradient(420px 180px at 100% 0%, ${
            terkunci ? "var(--danger-soft)" : "var(--success-soft)"
          } 0%, transparent 70%)`,
        }}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span
              className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                skd ? "bg-brand text-white" : "bg-brand-soft text-brand"
              }`}
            >
              {skd ? "Jalur Kedinasan" : "Jalur PTN"}
            </span>
            <h2 className="mt-2 text-xl font-extrabold leading-tight tracking-tight">{p.nama}</h2>
          </div>

          <span
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide ${
              terkunci ? "bg-danger text-white" : "bg-success text-white"
            }`}
          >
            <GemboksKecil terkunci={terkunci} />
            {terkunci ? "Dikunci" : "Dibuka"}
          </span>
        </div>

        <div className="my-6">
          <GemboksBesar terkunci={terkunci} />
        </div>

        <p className="text-center text-sm leading-relaxed text-muted">
          {terkunci
            ? "Siswa yang membuka jalur ini melihat layar terkunci. Tidak ada yang bisa memulai ujian."
            : "Siswa bisa masuk dan mengerjakan paket yang sudah diterbitkan pada jalur ini."}
        </p>

        <p className="mt-3 text-center text-xs text-muted">
          {p.diperbaruiAt ? (
            <>
              Terakhir diubah {waktuIndo(p.diperbaruiAt)}
              {p.olehNama ? ` oleh ${p.olehNama}` : ""}
            </>
          ) : (
            "Belum pernah diubah — portal terbuka sejak awal."
          )}
        </p>

        <form action={ubahKunciPortalAction} className="mt-6">
          <input type="hidden" name="jalur" value={p.jalur} />
          <input type="hidden" name="terkunci" value={terkunci ? "0" : "1"} />
          <TombolKonfirmasi
            pesan={
              terkunci
                ? `Buka portal ${p.nama}? Siswa langsung bisa masuk dan memulai ujian.`
                : `Kunci portal ${p.nama}? Seluruh siswa akan tertahan di layar terkunci — termasuk yang hendak membuka halaman hasilnya.`
            }
            className={`btn w-full ${terkunci ? "btn-primary" : "btn-ghost text-danger! border-danger/40!"}`}
          >
            {terkunci ? "Buka Portal Sekarang" : "Kunci Portal"}
          </TombolKonfirmasi>
        </form>
      </div>
    </section>
  );
}
