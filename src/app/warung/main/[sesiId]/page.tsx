import Link from "next/link";
import { redirect } from "next/navigation";

import { TeksSoal } from "@/components/TeksSoal";
import { HeaderWarung } from "@/components/warung/HeaderWarung";
import { RuangWarung } from "@/components/warung/RuangWarung";
import {
  IkonBenar,
  IkonKategori,
  IkonKoin,
  IkonPiala,
  IkonSalah,
  IkonSubtes,
  IkonWaktu,
} from "@/components/warung/Ikon";
import { getSession } from "@/lib/auth/auth";
import { getSubtes } from "@/lib/tryout/snbt";
import {
  type BarisPembahasan,
  GagalWarung,
  type PaketWarung,
  type SesiWarung,
  ambilPaket,
  ambilSesi,
  bacaKunciPgk,
  kategoriPaket,
  lamaIndo,
  papanPaket,
  pembahasanSesi,
  ruangSesi,
  tutupBilaLewatWaktu,
} from "@/lib/warung/warung";

export const metadata = { title: "Ruang Latihan Warung Soal" };
export const dynamic = "force-dynamic";

const HURUF = ["A", "B", "C", "D", "E", "F"];

/**
 * Satu sesi latihan.
 *
 * Alamat yang sama melayani dua keadaan — sedang dikerjakan, dan sudah dinilai
 * — supaya tautan "lanjutkan" dan "lihat pembahasan" di lobi sama-sama mendarat
 * di tempat yang benar tanpa siswa perlu tahu bedanya.
 *
 * Sesi yang waktunya sudah lewat ditutup di sini, saat halamannya dibuka, jadi
 * siswa yang sempat menutup peramban tetap menerima nilai atas apa yang sudah
 * ia jawab.
 */
export default async function HalamanSesi({ params }: { params: Promise<{ sesiId: string }> }) {
  const user = await getSession();
  if (!user) redirect("/warung/login");

  const { sesiId } = await params;
  const id = Number.parseInt(sesiId, 10);
  if (!Number.isInteger(id)) redirect("/warung");

  let sesi: SesiWarung;
  try {
    sesi = await tutupBilaLewatWaktu(await ambilSesi(id, user.id));
  } catch (e) {
    const pesan = e instanceof GagalWarung ? e.message : "Sesi latihan tidak ditemukan.";
    redirect(`/warung?galat=${encodeURIComponent(pesan)}`);
  }

  const paket = await ambilPaket(sesi.paket_id);
  if (!paket) redirect("/warung");

  if (sesi.status === "finished") {
    return (
      <>
        <HeaderWarung />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
          <HasilSesi
            sesi={sesi}
            paket={paket}
            pembahasan={await pembahasanSesi(id, user.id)}
            peringkat={(await papanPaket(paket.id)).find((p) => p.userId === user.id)?.peringkat ?? null}
          />
        </main>
      </>
    );
  }

  const ruang = await ruangSesi(id, user.id);
  const info = getSubtes(paket.subtes);

  return (
    <>
      <HeaderWarung ringkas />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <RuangWarung
          sesiId={ruang.sesi.id}
          judul={`${info?.namaPendek ?? paket.subtes} — Paket ${paket.nomor}`}
          keterangan={`${ruang.butir.length} soal · ${info?.durasiMenit ?? 20} menit`}
          kategori={kategoriPaket(paket.nomor)}
          butir={ruang.butir}
          sisaDetikAwal={ruang.sisaDetik}
        />
      </main>
    </>
  );
}

/* ==========================================================================
   HASIL
   ========================================================================== */

function HasilSesi({
  sesi,
  paket,
  pembahasan,
  peringkat,
}: {
  sesi: SesiWarung;
  paket: PaketWarung;
  pembahasan: BarisPembahasan[];
  peringkat: number | null;
}) {
  const kategori = kategoriPaket(paket.nomor);
  const info = getSubtes(paket.subtes);
  const total = pembahasan.length;
  const persen = total ? Math.round((sesi.benar / total) * 100) : 0;
  const pujian =
    persen >= 90 ? "Luar biasa!" : persen >= 70 ? "Mantap!" : persen >= 50 ? "Lumayan!" : "Terus berlatih!";

  return (
    <>
      <section className="card p-6 text-center">
        <span
          className="mx-auto grid h-16 w-16 place-items-center rounded-2xl"
          style={{ background: kategori.warnaLembut, color: kategori.warna }}
        >
          <IkonSubtes kode={paket.subtes} className="h-9 w-9" />
        </span>

        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">{pujian}</h1>
        <p className="mt-1 flex flex-wrap items-center justify-center gap-2 text-sm text-muted">
          {info?.namaPendek ?? paket.subtes} · Paket {paket.nomor}
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
            style={{ background: kategori.warnaLembut, color: kategori.warna }}
          >
            <IkonKategori kategori={kategori.kode} className="h-3.5 w-3.5" />
            {kategori.nama}
          </span>
        </p>

        <div className="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
          <Kotak nilai={String(sesi.poin)} label="Poin" warna="var(--accent)" ikon={<IkonKoin className="h-4 w-4" />} />
          <Kotak
            nilai={`${sesi.benar}/${total}`}
            label="Benar"
            warna="var(--success)"
            ikon={<IkonBenar className="h-4 w-4" />}
          />
          <Kotak nilai={`${persen}%`} label="Ketepatan" warna="var(--warning)" />
          <Kotak
            nilai={lamaIndo(sesi.durasi_detik)}
            label="Waktu"
            warna="var(--muted)"
            ikon={<IkonWaktu className="h-4 w-4" />}
          />
        </div>

        {sesi.kosong > 0 && (
          <p className="mt-4 text-xs text-muted">
            {sesi.kosong} soal tidak sempat dijawab. Poin hanya dihitung dari jawaban yang benar.
          </p>
        )}

        {peringkat && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-warning-soft px-4 py-1.5 text-sm font-bold text-warning">
            <IkonPiala className="h-4 w-4" />
            Peringkat #{peringkat} di paket ini
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={`/warung/${paket.subtes}`} className="btn btn-primary">
            Pilih paket lain
          </Link>
          <Link href={`/warung/peringkat?subtes=${paket.subtes}`} className="btn btn-ghost">
            Papan peringkat
          </Link>
          <Link href="/warung" className="btn btn-ghost">
            Lobi Warung
          </Link>
        </div>

        <p className="mt-4 text-xs text-muted">
          Paket ini boleh diulang kapan saja. Yang masuk papan peringkat hanya nilai terbaikmu, jadi
          mengulang tidak pernah menurunkan poin.
        </p>
      </section>

      {/* ---------- Pembahasan ---------- */}
      <h2 className="mt-8 text-sm font-extrabold uppercase tracking-widest text-muted">
        Pembahasan {total} soal
      </h2>

      <ol className="mt-3 space-y-4">
        {pembahasan.map((p) => (
          <li key={p.nomor} className="card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-muted">
                Soal {p.nomor}
              </span>
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted">
                {p.tipe === "PG" ? "Pilihan Ganda" : p.tipe === "PGK" ? "Benar / Salah" : "Isian Singkat"}
              </span>
              {p.benar ? (
                <span className="flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-[11px] font-bold text-success">
                  <IkonBenar className="h-3.5 w-3.5" /> Benar
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-0.5 text-[11px] font-bold text-danger">
                  <IkonSalah className="h-3.5 w-3.5" />
                  {p.jawaban ? "Belum tepat" : "Tidak dijawab"}
                </span>
              )}
            </div>

            {p.stimulus && (
              <div className="mt-3 rounded-xl border border-line/70 bg-surface-muted/60 p-4">
                <TeksSoal html={p.stimulus} className="text-sm leading-relaxed" />
              </div>
            )}

            <TeksSoal html={p.pertanyaan} className="mt-3 text-[15px] leading-relaxed" />

            <JawabanTersaji baris={p} />

            {p.pembahasan && (
              <div className="mt-3 rounded-xl bg-surface-muted p-4">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-accent">
                  Pembahasan
                </p>
                <TeksSoal html={p.pembahasan} className="mt-1.5 text-sm leading-relaxed" />
              </div>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}

/** Bagian jawaban pada kartu pembahasan, berbeda menurut tipe butir. */
function JawabanTersaji({ baris: p }: { baris: BarisPembahasan }) {
  if (p.tipe === "IS") {
    return (
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div
          className={`rounded-xl border px-4 py-3 ${
            p.benar ? "border-success/60 bg-success-soft" : "border-danger/60 bg-danger-soft"
          }`}
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Jawabanmu</p>
          <p className="mt-0.5 font-semibold">{p.jawaban || "— tidak dijawab —"}</p>
        </div>
        <div className="rounded-xl border border-success/60 bg-success-soft px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Kunci</p>
          <p className="mt-0.5 font-semibold text-success">{p.kunci}</p>
        </div>
      </div>
    );
  }

  if (p.tipe === "PGK") {
    const kunci = bacaKunciPgk(p.kunci);
    let jawab: string[] = [];
    try {
      const v = JSON.parse(p.jawaban ?? "[]") as unknown;
      if (Array.isArray(v)) jawab = v.map((x) => String(x).toUpperCase());
    } catch {
      jawab = [];
    }

    return (
      <ul className="mt-4 space-y-1.5">
        {p.opsi.map((teks, i) => {
          const tepat = jawab[i] === kunci[i];
          return (
            <li
              key={i}
              className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 text-sm ${
                tepat ? "border-success/50 bg-success-soft" : "border-danger/50 bg-danger-soft"
              }`}
            >
              <span className="huruf-opsi h-6 w-6 text-[11px]">{i + 1}</span>
              <TeksSoal html={teks} className="flex-1 leading-relaxed" />
              <span className="shrink-0 text-[11px] font-bold">
                <span className="text-muted">jawabmu </span>
                {jawab[i] ?? "—"}
                <span className="text-muted"> · kunci </span>
                <span className="text-success">{kunci[i]}</span>
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="mt-4 space-y-1.5">
      {p.opsi.map((teks, i) => {
        const huruf = HURUF[i] ?? String(i + 1);
        const kunci = huruf === p.kunci;
        const dipilih = huruf === p.jawaban;
        return (
          <li
            key={huruf}
            className={`flex items-start gap-2.5 rounded-xl border px-3 py-2 text-sm ${
              kunci
                ? "border-success/60 bg-success-soft"
                : dipilih
                  ? "border-danger/60 bg-danger-soft"
                  : "border-line/60"
            }`}
          >
            <span className="huruf-opsi h-6 w-6 text-[11px]">{huruf}</span>
            <TeksSoal html={teks} className="flex-1 leading-relaxed" />
            {kunci && <span className="shrink-0 text-[11px] font-bold text-success">kunci</span>}
            {dipilih && !kunci && (
              <span className="shrink-0 text-[11px] font-bold text-danger">jawabmu</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Kotak({
  nilai,
  label,
  warna,
  ikon,
}: {
  nilai: string;
  label: string;
  warna: string;
  ikon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line/70 bg-surface/60 p-3">
      <p
        className="flex items-center justify-center gap-1.5 text-lg font-extrabold tabular-nums"
        style={{ color: warna }}
      >
        {ikon}
        {nilai}
      </p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</p>
    </div>
  );
}
