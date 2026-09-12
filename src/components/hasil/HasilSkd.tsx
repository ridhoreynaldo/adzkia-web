import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Tema } from "@/components/Tema";
import { Card } from "@/components/ui";
import { Pembahasan, type KelompokPembahasan } from "@/components/hasil/Pembahasan";
import { TombolCetak } from "@/components/hasil/TombolCetak";
import { GayaCetak } from "@/components/hasil/GayaCetak";
import { KopCetak } from "@/components/hasil/KopCetak";
import { angka, tanggalLengkap } from "@/components/hasil/format";
import type { HasilSkd as DataHasilSkd } from "@/lib/tryout/nilai-skd";
import {
  AMBANG_AFIRMASI_TIU,
  AMBANG_AFIRMASI_TOTAL,
  NILAI_MAKS_SKD,
  POIN_BENAR,
  TKP_MAKS,
  TKP_MIN,
  TOTAL_SOAL_SKD,
} from "@/lib/tryout/skd";

/**
 * Laporan hasil SKD Kedinasan.
 *
 * Berbeda dari laporan UTBK yang berporos pada skor IRT dan rekomendasi
 * kampus, laporan ini berporos pada satu pertanyaan: sudah melewati ambang
 * batas atau belum — dan itu diputuskan per subtes, bukan dari total.
 *
 * Angka ambang dan bobotnya mengikuti PermenPANRB 13/2026 jo. KepmenPANRB
 * 406/2026; semuanya dibaca dari `@/lib/skd`, tidak ditulis ulang di sini.
 */
export function HasilSkd({
  hasil,
  namaPeserta,
  kelas,
  namaPaket,
  kodePaket,
  selesaiAt,
  peringkat,
  jumlahPeserta,
  kelompok,
  tampilPembahasan,
}: {
  hasil: DataHasilSkd;
  namaPeserta: string;
  kelas: string | null;
  namaPaket: string;
  kodePaket: string;
  selesaiAt: string | null;
  peringkat: number | null;
  jumlahPeserta: number;
  kelompok: KelompokPembahasan[];
  tampilPembahasan: boolean;
}) {
  const lulus = hasil.lulus;

  /** 3,47 — bukan 3.47; laporan ini dibaca dan dicetak dalam bahasa Indonesia. */
  const desimal = (n: number) => n.toFixed(2).replace(".", ",");

  return (
    <Tema jalur="skd" className="flex min-h-dvh flex-col">
      <GayaCetak />
      <Navbar jalur="skd" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <KopCetak
          namaPeserta={namaPeserta}
          asalSekolah={kelas}
          namaPaket={namaPaket}
          kodePaket={kodePaket}
          dikerjakanAt={selesaiAt}
        />

        {/* ---------- Kepala laporan ---------- */}
        <div className="no-print mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-accent">
              SKD Kedinasan
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Hasil {namaPaket}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {namaPeserta}
              {kelas ? ` · ${kelas}` : ""} · Selesai {tanggalLengkap(selesaiAt)}
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <TombolCetak />
            <Link href="/dashboard" className="btn btn-ghost">
              Beranda
            </Link>
          </div>
        </div>

        {/* ---------- Vonis kelulusan ---------- */}
        <section
          className={`mb-6 overflow-hidden rounded-2xl border-2 ${
            lulus ? "border-success bg-success-soft" : "border-danger bg-danger-soft"
          }`}
        >
          <div className="flex flex-wrap items-center gap-6 p-6">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-muted">Nilai Total</p>
              <p className="text-5xl font-extrabold tabular-nums">{angka(hasil.total)}</p>
              <p className="mt-0.5 text-xs text-muted">dari {NILAI_MAKS_SKD}</p>
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={`text-2xl font-extrabold tracking-tight ${
                  lulus ? "text-success" : "text-danger"
                }`}
              >
                {lulus ? "LULUS PASSING GRADE" : "BELUM LULUS PASSING GRADE"}
              </p>
              <p className="mt-1 text-sm leading-relaxed">
                {lulus
                  ? "Ketiga subtes sudah melewati nilai ambang batasnya. Pertahankan, dan kejar nilai yang lebih tinggi untuk bersaing di formasi favorit."
                  : "Kelulusan SKD menuntut KETIGA subtes melewati ambangnya masing-masing — nilai total yang tinggi tidak bisa menutupi satu subtes yang kurang."}
              </p>
              {peringkat != null && (
                <p className="mt-2 text-sm font-semibold">
                  Peringkat <span className="text-brand">#{peringkat}</span> dari {jumlahPeserta}{" "}
                  peserta paket ini.
                </p>
              )}
              {/*
                Ambang jalur afirmasi jauh lebih longgar, tetapi hanya berlaku
                bagi peserta daerah tertentu yang diusulkan instansi. Catatan
                ini muncul hanya ketika angkanya memang sudah terpenuhi,
                supaya tidak terbaca sebagai kelulusan bagi peserta umum.
              */}
              {!lulus && hasil.lulusAfirmasi && (
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Catatan: nilaimu sudah memenuhi ambang <strong>jalur afirmasi</strong> (TIU minimal{" "}
                  {AMBANG_AFIRMASI_TIU} dan nilai kumulatif minimal {AMBANG_AFIRMASI_TOTAL}) — hanya
                  berlaku bagi peserta daerah tertentu yang diusulkan instansi, bukan formasi umum.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ---------- Nilai per subtes ---------- */}
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-extrabold tracking-tight">Nilai per Subtes</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {hasil.perSubtes.map((s) => {
              const persen = Math.min(100, Math.round((s.nilai / s.nilaiMaks) * 100));
              const persenAmbang = Math.round((s.ambang / s.nilaiMaks) * 100);
              return (
                <Card key={s.subtes} className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand">
                      {s.subtes}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        s.lulus ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                      }`}
                    >
                      {s.lulus ? "Lolos ambang" : "Belum lolos"}
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-bold leading-snug">{s.nama}</p>

                  <p className="mt-2 text-3xl font-extrabold tabular-nums">
                    {angka(s.nilai)}
                    <span className="ml-1 text-sm font-semibold text-muted">/ {s.nilaiMaks}</span>
                  </p>

                  {/* Batang nilai dengan penanda ambang */}
                  <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className={`h-full ${s.lulus ? "bg-success" : "bg-danger"}`}
                      style={{ width: `${persen}%` }}
                    />
                    <div
                      className="absolute inset-y-0 w-0.5 bg-foreground/70"
                      style={{ left: `${persenAmbang}%` }}
                      aria-hidden
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted">
                    Ambang batas <strong className="text-foreground">{s.ambang}</strong> ·{" "}
                    {s.lulus
                      ? `lebih ${s.nilai - s.ambang} poin`
                      : `kurang ${s.ambang - s.nilai} poin`}
                  </p>
                  {/*
                    Ambang diterjemahkan ke satuan yang bisa dikejar peserta:
                    jumlah soal benar untuk TWK/TIU, rata-rata poin per soal
                    untuk TKP yang tidak mengenal benar-salah.
                  */}
                  <p className="mt-1 text-xs text-muted">
                    {s.benarMinimal != null
                      ? `Setara ${s.benarMinimal} jawaban benar dari ${s.jumlahSoal} soal.`
                      : `Rata-rata ${desimal(s.rataPerSoal)} poin per soal — ambangnya menuntut ${desimal(s.rataAmbang)}.`}
                  </p>

                  <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center text-xs">
                    <div>
                      <dt className="text-muted">{s.subtes === "TKP" ? "Nilai 4–5" : "Benar"}</dt>
                      <dd className="text-base font-extrabold tabular-nums text-success">
                        {s.benar}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">{s.subtes === "TKP" ? "Nilai 1–3" : "Salah"}</dt>
                      <dd className="text-base font-extrabold tabular-nums text-danger">
                        {s.salah}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Kosong</dt>
                      <dd className="text-base font-extrabold tabular-nums text-muted">
                        {s.kosong}
                      </dd>
                    </div>
                  </dl>
                </Card>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-muted">
            Total {TOTAL_SOAL_SKD} soal. TWK dan TIU dinilai {POIN_BENAR} poin per jawaban benar —
            jawaban salah dan soal kosong sama-sama 0, tidak ada nilai minus. TKP dinilai {TKP_MIN}–
            {TKP_MAKS} poin sesuai pilihan, dan hanya soal kosong yang bernilai 0. Nilai kumulatif
            adalah jumlah ketiganya, tertinggi {NILAI_MAKS_SKD}.
          </p>
        </section>

        {/* ---------- Pembahasan ---------- */}
        {tampilPembahasan && kelompok.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-extrabold tracking-tight">Pembahasan</h2>
            {/*
              Subtes sengaja tidak ditampilkan: peserta SKD tidak pernah tahu
              sebuah soal masuk TWK, TIU, atau TKP, persis seperti SKD
              Kedinasan nasional. Nilai per subtes tetap ada di bagian skor.
            */}
            <Pembahasan kelompok={kelompok} tanpaSubtes />
          </section>
        )}
      </main>
    </Tema>
  );
}
