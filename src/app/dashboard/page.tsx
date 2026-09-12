import Link from "next/link";

import { Navbar } from "@/components/Navbar";
import { Tema } from "@/components/Tema";
import {
  IkonButir,
  IkonGrafik,
  IkonJam,
  IkonLembar,
  IkonPiala,
} from "@/components/dashboard/IkonBeranda";
import { KartuAngka, SampulSiswa } from "@/components/dashboard/SampulSiswa";
import { Badge, EmptyState } from "@/components/ui";
import { requireUser } from "@/lib/auth/auth";
import { daftarPaketSiswa, statistikSiswa, type PaketDashboard } from "@/lib/tryout/exam";
import { jagaPortal, portalTertutupUntuk } from "@/lib/admin/portal";
import { TOTAL_MENIT_SKD, TOTAL_SOAL_SKD } from "@/lib/tryout/skd";
import { TOTAL_MENIT, TOTAL_SOAL } from "@/lib/tryout/snbt";

export const metadata = { title: "Beranda Siswa" };
export const dynamic = "force-dynamic";

function namaDepan(nama: string): string {
  return nama.trim().split(/\s+/)[0] || nama;
}

/**
 * Tanggal hari ini dalam bahasa Indonesia.
 *
 * Dibaca dari jam SERVER, yang berzona WIB — sama dengan jam yang dipakai
 * seluruh jadwal paket. Kalau diambil dari peramban, siswa yang jam
 * perangkatnya meleset akan membaca tanggal yang berbeda dari jadwal ujiannya.
 */
function tanggalHariIni(): string {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ==========================================================================
   Kartu paket
   ========================================================================== */

function KartuPaket({ paket }: { paket: PaketDashboard }) {
  const skd = paket.jalur === "skd";
  const selesai = paket.attempt_status === "finished";
  const berlangsung = paket.attempt_status === "ongoing";
  const gugur = paket.attempt_status === "gugur";
  const bolehSusulan = paket.susulan_izin === 1 && !selesai;
  const skor = paket.attempt_skor == null ? null : Math.round(paket.attempt_skor);

  // Paket yang soalnya belum diunggah tidak boleh menawarkan tombol mulai:
  // menekannya hanya melahirkan sesi kosong yang memutar peserta antara ruang
  // ujian dan halaman hasil. `jumlah_soal` di sini COUNT sungguhan, bukan angka
  // resmi paket.
  const kosong = paket.jumlah_soal === 0;
  // Jendela paket yang sudah lewat hanya bisa dibuka lewat jalur susulan.
  const jalurBiasa = !gugur && !kosong && paket.dalam_jendela === 1;
  const tujuan = selesai && paket.attempt_id ? `/hasil/${paket.attempt_id}` : `/tryout/${paket.id}`;
  // Nama ujiannya mengikuti portal paketnya: peserta SKD Kedinasan tidak boleh
  // membaca "Mulai Tryout" pada kartu yang jelas-jelas bertanda SKD.
  const labelTombol = selesai
    ? "Lihat Hasil"
    : berlangsung
      ? "Lanjutkan Ujian"
      : skd
        ? "Mulai SKD Kedinasan"
        : "Mulai Tryout";

  const totalButir = skd ? TOTAL_SOAL_SKD : TOTAL_SOAL;
  const belumLengkap = paket.jumlah_soal < totalButir;

  return (
    <article
      className={`kartu-angkat card relative flex flex-col gap-4 overflow-hidden p-5 pl-6 ${
        skd ? "tema-skd" : ""
      }`}
    >
      {/* Pita warna jalur di tepi kiri: pembeda paling cepat dibaca ketika
          UTBK dan SKD berdampingan dalam satu daftar. */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-brand" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${
                skd ? "bg-brand text-white" : "bg-brand-soft text-brand"
              }`}
            >
              {skd ? "SKD KEDINASAN" : "UTBK-SNBT"}
            </span>
            <span className="font-mono text-[11px] font-bold text-muted">{paket.kode}</span>
          </p>
          <h3 className="mt-2 text-lg font-extrabold leading-snug tracking-tight">{paket.nama}</h3>
        </div>

        {selesai ? (
          <Badge tone="success">Selesai{skor !== null ? ` · skor ${skor}` : ""}</Badge>
        ) : gugur ? (
          <Badge tone="danger">Dihentikan</Badge>
        ) : berlangsung ? (
          <Badge tone="warning">Sedang berlangsung</Badge>
        ) : (
          <Badge tone="muted">Belum dikerjakan</Badge>
        )}
      </div>

      {paket.deskripsi && (
        <p className="line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
          {paket.deskripsi}
        </p>
      )}

      {/* Dua angka yang paling menentukan kesiapan siswa sebelum menekan
          "Mulai": berapa butir, dan berapa lama. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="flex items-center gap-2 font-semibold">
          <IkonButir className="h-4 w-4 text-brand" />
          {paket.jumlah_soal} soal
        </span>
        <span className="flex items-center gap-2 font-semibold">
          <IkonJam className="h-4 w-4 text-brand" />
          {skd ? TOTAL_MENIT_SKD : TOTAL_MENIT} menit
          {skd && <span className="font-normal text-muted">(satu sesi)</span>}
        </span>
        {belumLengkap && !kosong && (
          <span className="text-xs text-muted">paket belum lengkap</span>
        )}
      </div>

      {gugur && (
        <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-danger">
          Ujian dihentikan karena kamu keluar dari halaman pengerjaan. Sesi ini dikunci dan tidak
          dinilai.
          {!bolehSusulan && " Temui pengawas bila ingin mengikuti ujian susulan."}
        </p>
      )}

      {bolehSusulan && (
        <p className="rounded-xl bg-accent-soft px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-accent">
          Pengelola sudah memberimu izin <strong>Ujian Susulan</strong> untuk paket ini.
        </p>
      )}

      {kosong && !selesai && (
        <p className="rounded-xl bg-warning-soft px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-warning">
          Soal paket ini belum diunggah. Tombol mulai akan muncul sendiri begitu pengajar selesai
          mengunggahnya.
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        {bolehSusulan && !kosong && (
          <Link
            href={`/tryout/${paket.id}/susulan`}
            className="btn btn-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Ujian Susulan
          </Link>
        )}

        {(selesai || jalurBiasa) && (
          <Link
            href={tujuan}
            className={`btn ${
              selesai || bolehSusulan ? "btn-ghost" : "btn-primary"
            } focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2`}
          >
            {labelTombol}
          </Link>
        )}

        {gugur && !bolehSusulan && (
          <span className="btn btn-ghost pointer-events-none opacity-60">Ujian Dikunci</span>
        )}

        {paket.selesai_at && (
          <span className="ml-auto text-xs text-muted">
            Ditutup {paket.selesai_at.replace("T", " ")}
          </span>
        )}
      </div>
    </article>
  );
}

/* ==========================================================================
   Halaman
   ========================================================================== */

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ jalur?: string }>;
}) {
  const user = await requireUser();
  const { jalur: jalurQuery } = await searchParams;
  // Tanpa `?jalur=`, beranda menampilkan kedua jalur seperti sebelumnya.
  const jalur = jalurQuery === "skd" ? "skd" : jalurQuery === "utbk" ? "utbk" : null;

  // Beranda yang dibuka dengan `?jalur=` mengikuti kunci jalur tersebut.
  if (jalur) await jagaPortal(jalur);

  const stat = await statistikSiswa(user.id);
  // Paket dari portal yang dikunci disembunyikan, bukan ditampilkan lalu
  // ditolak saat diklik — siswa tidak perlu digoda pintu yang tertutup.
  // Kunci kedua portal dibaca SEKALI, bukan sekali per paket.
  //
  // Hanya ada dua jalur, jadi menanyakannya di dalam `.filter()` berarti
  // menanyakan pertanyaan yang sama berulang-ulang - dan `.filter()` sendiri
  // tidak bisa menunggu Promise: penyaring async selalu bernilai benar,
  // sehingga paket dari portal yang DIKUNCI justru ikut tampil.
  const [utbkTertutup, skdTertutup] = await Promise.all([
    await portalTertutupUntuk("utbk", user),
    await portalTertutupUntuk("skd", user),
  ]);
  const semua = (await daftarPaketSiswa(user.id)).filter(
    (p) => !(p.jalur === "skd" ? skdTertutup : utbkTertutup),
  );
  const paket = jalur ? semua.filter((p) => p.jalur === jalur) : semua;
  const jalurLain = jalur === "skd" ? "utbk" : "skd";
  const adaJalurLain = semua.some((p) => p.jalur === jalurLain);

  // Satu kalimat ajakan yang menyesuaikan keadaan siswa — bukan sapaan yang
  // sama tiap hari. Yang sedang menggantung ujian harus membacanya lebih dulu.
  const adaBerlangsung = stat.sedangBerlangsung > 0;
  const siapDikerjakan = paket.filter(
    (p) => p.attempt_status !== "finished" && p.jumlah_soal > 0 && p.dalam_jendela === 1,
  ).length;

  return (
    <Tema jalur={jalur === "skd" ? "skd" : "utbk"} className="flex min-h-dvh flex-col">
      {/* "siswa" = tanpa baris jalur di bawah logo. Halaman ini memuat
          kedua jalur sekaligus lewat PemilihJalur, jadi menyebut salah
          satunya di bawah logo akan berganti-ganti mengikuti tombol. */}
      <Navbar jalur="siswa" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <SampulSiswa
          kicker={tanggalHariIni()}
          judul={<>Assalamualaikum, {namaDepan(user.nama)}</>}
          keterangan={
            adaBerlangsung
              ? "Ada ujian yang belum kamu tuntaskan. Lanjutkan dulu sebelum waktunya habis, ya."
              : jalur === "skd"
                ? "Jalur SKD Kedinasan. Semoga Allah mudahkan langkahmu menuju sekolah kedinasan impian."
                : "Semoga Allah mudahkan langkahmu menuju kampus impian. Yuk lanjut latihan hari ini."
          }
          lencana={[
            ...(adaBerlangsung ? [`${stat.sedangBerlangsung} ujian berjalan`] : []),
            siapDikerjakan > 0
              ? `${siapDikerjakan} siap dikerjakan`
              : "Tidak ada yang perlu dikerjakan",
            ...(user.kelas ? [user.kelas] : []),
          ]}
          tombol={[
            { href: `/rankup?jalur=${jalur ?? "utbk"}`, label: "Capaianku", utama: true },
            { href: `/to-pekan-ini?jalur=${jalur ?? "utbk"}`, label: "TOAdzkia Pekan Ini" },
          ]}
        />

        {/* ================= ANGKA CAPAIAN ================= */}
        <section aria-label="Ringkasan capaian" className="mt-6 grid gap-4 sm:grid-cols-3">
          <KartuAngka
            ikon={<IkonLembar />}
            label="Tryout diikuti"
            nilai={String(stat.jumlahTryout)}
            keterangan={
              stat.sedangBerlangsung > 0
                ? `${stat.sedangBerlangsung} sedang berlangsung`
                : "Tryout yang sudah tuntas dinilai"
            }
          />
          <KartuAngka
            ikon={<IkonGrafik />}
            label="Skor terakhir"
            nilai={stat.skorTerakhir == null ? "—" : String(Math.round(stat.skorTerakhir))}
            keterangan="Rata-rata 7 subtes tryout terakhir"
            sorot
          />
          <KartuAngka
            ikon={<IkonPiala />}
            label="Skor tertinggi"
            nilai={stat.skorTertinggi == null ? "—" : String(Math.round(stat.skorTertinggi))}
            keterangan="Capaian terbaikmu sejauh ini"
          />
        </section>

        {/* ================= DAFTAR PAKET ================= */}
        <section aria-label="Daftar tryout" className="mt-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold tracking-tight">
              {jalur === "skd"
                ? "SKD Kedinasan yang Tersedia"
                : jalur === "utbk"
                  ? "TryOut UTBK-SNBT yang Tersedia"
                  : "Tryout yang Tersedia"}
            </h2>
            {jalur && adaJalurLain && (
              <Link
                href={`/dashboard?jalur=${jalurLain}`}
                className="text-sm font-semibold text-brand hover:underline"
              >
                {jalurLain === "skd" ? "Lihat SKD Kedinasan →" : "Lihat TryOut UTBK-SNBT →"}
              </Link>
            )}
          </div>

          {paket.length === 0 ? (
            <EmptyState
              title="Belum ada tryout yang dibuka"
              description="Paket tryout akan muncul di sini begitu dibuka oleh pengajar Adzkia. Pantau terus, ya!"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {paket.map((p) => (
                <KartuPaket key={p.id} paket={p} />
              ))}
            </div>
          )}
        </section>
      </main>
    </Tema>
  );
}
