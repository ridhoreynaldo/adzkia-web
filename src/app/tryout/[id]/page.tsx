import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
import { FormMulaiUjian } from "@/components/exam/FormMulaiUjian";
import { FotoPeserta } from "@/components/exam/FotoPeserta";
import { LayarGagal } from "@/components/exam/LayarGagal";
import { PemberitahuanUjian } from "@/components/exam/PemberitahuanUjian";
import { Tema } from "@/components/Tema";
import { PESAN_GUGUR } from "@/components/exam/tipe";
import { requireUser } from "@/lib/auth/auth";
import {
  attemptSiswa,
  getPaket,
  jumlahSoalPaket,
  paketDapatDikerjakan,
  rincianSubtesPaket,
} from "@/lib/tryout/exam";
import { identitasFoto } from "@/lib/penjagaan/foto-peserta";
import { TOTAL_SOAL } from "@/lib/tryout/snbt";
import { TOTAL_SOAL_SKD } from "@/lib/tryout/skd";
import { mulaiUjianAction } from "../actions";
import { pilihanLengkap, pilihanPeserta } from "@/lib/rujukan/prodi";
import { identitasPeserta, waktuIndo } from "@/lib/core/tampilan";
import { jagaPortal } from "@/lib/admin/portal";

export const metadata = { title: "Persiapan Ujian" };
export const dynamic = "force-dynamic";

export default async function PersiapanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { e } = await searchParams;

  const packageId = Number(id);
  const paket = await getPaket(packageId);
  if (!paket) notFound();

  // Portal jalur ini ditutup pengelola: siswa tidak boleh masuk lebih jauh.
  await jagaPortal(paket.jalur === "skd" ? "skd" : "utbk");

  // Termasuk pemeriksaan daftar peserta: paket yang dibatasi pengelola hanya
  // boleh dibuka oleh nama/kelas yang terdaftar. Yang di luar daftar tidak
  // pernah sampai ke halaman ini karena paketnya pun tidak muncul di beranda,
  // tetapi tautan langsung harus ikut tertutup.
  if (!await paketDapatDikerjakan(paket, user.id)) redirect("/dashboard");

  const identitas = await identitasFoto(user.id);
  const attempt = await attemptSiswa(user.id, packageId);
  if (attempt?.status === "finished") redirect(`/hasil/${attempt.id}`);

  // Digugurkan karena pelanggaran: halaman persiapan pun ikut terkunci.
  if (attempt?.status === "gugur") {
    return (
      <LayarGagal
        pesan={attempt.alasan_gugur ?? PESAN_GUGUR}
        namaPaket={`${paket.nama} · ${paket.kode}`}
        waktu={waktuIndo(attempt.digugurkan_at)}
      />
    );
  }

  // Pemilihan program studi hanya berlaku di jalur UTBK; peserta SKD melamar
  // sekolah kedinasan, bukan program studi PTN.
  const skd = paket.jalur === "skd";
  // Paket yang soalnya belum diunggah berhenti di sini: peserta tidak perlu
  // disuruh memilih program studi untuk ujian yang belum bisa dijalankan.
  const belumAdaSoal = await jumlahSoalPaket(packageId) === 0;
  if (!skd && !belumAdaSoal && !await pilihanLengkap(user.id, packageId)) {
    redirect(`/tryout/${packageId}/jurusan`);
  }
  const pilihan = skd ? [] : await pilihanPeserta(user.id, packageId);

  const rincian = await rincianSubtesPaket(packageId, attempt?.id);
  const totalSoal = rincian.reduce((a, s) => a + s.jumlahSoal, 0);
  const totalMenit = rincian.reduce((a, s) => a + s.durasiMenit, 0);
  const targetSoal = skd ? TOTAL_SOAL_SKD : TOTAL_SOAL;
  const belumLengkap = rincian.length < (skd ? 3 : 7) || totalSoal < targetSoal;

  return (
    <Tema jalur={skd ? "skd" : "utbk"} className="flex min-h-dvh flex-col">
      <Navbar jalur={skd ? "skd" : "utbk"} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <PageHeader
          title={paket.nama}
          subtitle={`Kode paket ${paket.kode} · ${totalSoal} soal · ${totalMenit} menit`}
          action={
            <Link href="/dashboard" className="btn btn-ghost">
              Kembali ke Beranda
            </Link>
          }
        />

        {e === "tatatertib" && (
          <div className="mb-5">
            <Alert>Kamu harus menyetujui tata tertib sebelum memulai ujian.</Alert>
          </div>
        )}

        {e === "kosong" && (
          <div className="mb-5">
            <Alert tone="warning">
              Soal paket ini belum diunggah, jadi ujiannya belum bisa dimulai. Tidak ada sesi
              yang tercatat atas namamu — coba lagi setelah pengajar mengunggah soalnya.
            </Alert>
          </div>
        )}

        {paket.deskripsi && (
          <Card className="mb-5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{paket.deskripsi}</p>
          </Card>
        )}

        {/* Identitas peserta */}
        <Card className="mb-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
            Identitas Peserta
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">Nama Lengkap</dt>
              <dd className="font-semibold">{user.nama}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">NISN</dt>
              <dd className="font-semibold break-all">
                {user.nisn ?? identitasPeserta(user.email)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Kelas</dt>
              <dd className="font-semibold">{user.kelas ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Paket Tryout</dt>
              <dd className="font-semibold">
                {paket.nama} <span className="text-muted">({paket.kode})</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Status</dt>
              <dd>
                {attempt?.status === "ongoing" ? (
                  <Badge tone="warning">Sedang Berlangsung</Badge>
                ) : (
                  <Badge tone="muted">Belum Dikerjakan</Badge>
                )}
              </dd>
            </div>
          </dl>

          {/* Foto hanya DITAMPILKAN. Sejak 7 September 2026 hanya admin yang
              boleh mengubahnya: foto ini dipakai peserta untuk memastikan NISN
              yang sedang dipakai memang miliknya, dan identitas yang bisa
              diganti sendiri oleh pemiliknya tidak membuktikan apa pun. */}
          <div className="mt-5 flex items-start gap-4 border-t border-line pt-5">
            <FotoPeserta nama={user.nama} foto={identitas?.foto ?? null} ukuran={72} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Foto peserta</p>
              <p className="mt-0.5 text-xs text-muted">
                {identitas?.foto
                  ? "Fotomu tampil di bilah atas ruang ujian bersama NISN-mu, supaya kamu yakin akun yang sedang dipakai memang milikmu."
                  : "Fotomu belum dipasang. Foto peserta hanya bisa dipasang pengelola — hubungi pengawas atau pengajar Adzkia bila fotomu belum ada atau ternyata salah."}
              </p>
            </div>
          </div>
        </Card>

        {/* Pilihan program studi — jalur UTBK saja */}
        {pilihan.length > 0 && (
        <Card className="mb-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
              Pilihan Program Studi
            </h2>
            <Link
              href={`/tryout/${packageId}/jurusan`}
              className="text-xs font-semibold text-brand hover:underline"
            >
              Ubah pilihan
            </Link>
          </div>
          <ol className="space-y-2">
            {pilihan.map((p) => (
              <li key={p.urutan} className="flex gap-3 text-sm">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                  {p.urutan}
                </span>
                <span>
                  <span className="block font-semibold uppercase leading-tight">{p.prodi_nama}</span>
                  <span className="block text-xs uppercase text-muted">{p.ptn}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
        )}

        {/* Rincian subtes */}
        <Card className="mb-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
            Rincian Subtes
          </h2>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[26rem] text-sm">
              <caption className="sr-only">
                Daftar subtes {skd ? "SKD Kedinasan" : "UTBK-SNBT"} beserta jumlah soal dan durasi
                pengerjaan
              </caption>
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="py-2 pl-1 pr-2 font-semibold">No</th>
                  <th scope="col" className="py-2 pr-2 font-semibold">Subtes</th>
                  <th scope="col" className="py-2 pr-2 text-right font-semibold">Soal</th>
                  <th scope="col" className="py-2 pr-2 text-right font-semibold">Durasi</th>
                  <th scope="col" className="py-2 pr-1 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rincian.map((s, i) => (
                  <tr key={s.kode} className="border-b border-line/70 last:border-0">
                    <td className="py-2.5 pl-1 pr-2 tabular-nums text-muted">{i + 1}</td>
                    <td className="py-2.5 pr-2">
                      <span className="font-semibold">{s.nama}</span>
                      <span className="ml-2 text-xs text-muted">{skd ? s.kode : s.kelompok}</span>
                    </td>
                    <td className="py-2.5 pr-2 text-right tabular-nums">{s.jumlahSoal}</td>
                    <td className="py-2.5 pr-2 text-right tabular-nums">
                      {skd
                        ? i === 0
                          ? `${s.durasiMenit} menit (satu sesi)`
                          : "—"
                        : `${s.durasiMenit} menit`}
                    </td>
                    <td className="py-2.5 pr-1 text-right">
                      {s.selesai ? (
                        <Badge tone="success">Selesai</Badge>
                      ) : (
                        <Badge tone="muted">Belum</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td className="py-2.5 pl-1 pr-2" />
                  <td className="py-2.5 pr-2">Total</td>
                  <td className="py-2.5 pr-2 text-right tabular-nums">{totalSoal}</td>
                  <td className="py-2.5 pr-2 text-right tabular-nums">{totalMenit} menit</td>
                  <td className="py-2.5 pr-1" />
                </tr>
              </tfoot>
            </table>
          </div>
          {belumLengkap && (
            <p className="mt-3 text-xs text-warning">
              Catatan: paket ini belum memuat {targetSoal} soal penuh. Kamu tetap bisa mengerjakan
              soal yang sudah tersedia.
            </p>
          )}
        </Card>

        {/* Pemberitahuan & tata tertib wajib sebelum ujian */}
        <div className="mb-5">
          <PemberitahuanUjian jalur={skd ? "skd" : "utbk"} />
        </div>

        {/* Panjang `rincian` SELALU tujuh — daftarnya jatuh ke urutan subtes
            resmi ketika paket masih kosong, supaya peserta tetap melihat
            rencana isinya. Karena itu penandanya `belumAdaSoal`, yang
            menghitung soal sungguhan, bukan panjang daftar. */}
        {belumAdaSoal ? (
          <Alert tone="warning">
            Paket ini belum memiliki soal, jadi ujiannya belum bisa dimulai. Hubungi pengajar
            Adzkia — tombol mulai akan muncul sendiri begitu soalnya diunggah.
          </Alert>
        ) : (
          <FormMulaiUjian
            packageId={packageId}
            melanjutkan={attempt?.status === "ongoing"}
            jalur={skd ? "skd" : "utbk"}
            aksi={mulaiUjianAction}
          />
        )}
      </main>
    </Tema>
  );
}
