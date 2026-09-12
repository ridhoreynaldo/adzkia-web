import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "@/components/Brand";
import { GemboksBesar } from "@/components/portal/Gemboks";
import { getSession } from "@/lib/auth/auth";
import { keJalurPortal, semuaStatusPortal, NAMA_JALUR } from "@/lib/admin/portal";
import { waktuIndo } from "@/lib/core/tampilan";

export const metadata = { title: "Portal Dikunci" };
export const dynamic = "force-dynamic";

/**
 * Layar yang dilihat siswa ketika pengelola menutup sebuah jalur.
 *
 * Bukan halaman galat: nadanya menenangkan, dan selalu menawarkan jalan keluar
 * — jalur satunya bila kebetulan sedang terbuka, atau kembali ke halaman awal.
 */
export default async function HalamanTerkunci({
  searchParams,
}: {
  searchParams: Promise<{ jalur?: string }>;
}) {
  const { jalur: q } = await searchParams;
  const jalur = keJalurPortal(q);
  const semua = await semuaStatusPortal();
  const ini = semua.find((s) => s.jalur === jalur)!;
  const lain = semua.find((s) => s.jalur !== jalur)!;
  const user = await getSession();

  // Portal sudah dibuka lagi sementara halaman ini terbuka: antar masuk.
  if (!ini.terkunci) redirect(jalur === "skd" ? "/skd" : "/utbk");

  const skd = jalur === "skd";

  return (
    <div className={`${skd ? "tema-skd" : ""} relative flex min-h-dvh flex-col bg-background`}>
      {/* Latar bercahaya lembut supaya layar ini tidak terasa seperti halaman galat. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 380px at 50% -8%, var(--brand-soft) 0%, transparent 65%)," +
            "radial-gradient(700px 320px at 90% 100%, var(--accent-soft) 0%, transparent 60%)",
        }}
      />

      <header className="px-4 py-5">
        <div className="mx-auto max-w-5xl">
          <Brand href="/" keterangan={NAMA_JALUR[jalur]} />
        </div>
      </header>

      <main className="flex flex-1 items-center px-4 pb-16">
        <div className="mx-auto w-full max-w-xl text-center">
          <GemboksBesar terkunci />

          <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-muted">
            {NAMA_JALUR[jalur]}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Portal sedang <span className="text-danger">dikunci</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md leading-relaxed text-muted">
            Pengelola Adzkia menutup jalur ini untuk sementara. Kamu akan bisa masuk lagi begitu
            portalnya dibuka — tidak ada nilai atau jawabanmu yang hilang.
          </p>

          <div className="card mt-8 p-5 text-left">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Status
                </dt>
                <dd className="mt-0.5 flex items-center gap-2 font-extrabold text-danger">
                  <span className="h-2 w-2 rounded-full bg-danger" aria-hidden />
                  DIKUNCI
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Dikunci sejak
                </dt>
                <dd className="mt-0.5 font-semibold">
                  {ini.diperbaruiAt ? waktuIndo(ini.diperbaruiAt) : "—"}
                </dd>
              </div>
            </dl>

            <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted">
              Kalau kamu merasa portal ini seharusnya sudah dibuka, hubungi pengawas atau pengajar
              Adzkia — jangan menunggu sendirian sampai waktu ujian lewat.
            </p>
          </div>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            {!lain.terkunci && (
              <Link
                href={lain.jalur === "skd" ? "/skd" : "/utbk"}
                className="btn btn-primary w-full sm:w-auto"
              >
                Buka {lain.nama} →
              </Link>
            )}
            <Link href="/" className="btn btn-ghost w-full sm:w-auto">
              Kembali ke Halaman Awal
            </Link>
          </div>

          {user?.role === "admin" && (
            <p className="mt-6 text-sm">
              <Link href="/admin/portal" className="font-semibold text-brand underline">
                Kamu masuk sebagai admin — buka kunci portal di sini
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
