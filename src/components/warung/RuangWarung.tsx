"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { selesaikanSesiAction, simpanJawabanAction } from "@/app/warung/actions";
import { TeksSoal } from "@/components/TeksSoal";
import { GambarSoal } from "@/components/exam/GambarSoal";
import { IkonWaktu } from "@/components/warung/Ikon";
import type { ButirMain, InfoKategori } from "@/lib/warung/warung";

const HURUF = ["A", "B", "C", "D", "E", "F"];

/**
 * Ruang latihan satu paket Warung Soal.
 *
 * Bentuknya sengaja mendekati ruang ujian sungguhan, tetapi tanpa kekerasannya:
 *
 * - SATU timer untuk seluruh paket, sepanjang durasi resmi subtesnya. Siswa
 *   bebas melompat antar soal lewat panel nomor, jadi yang dilatih bukan cuma
 *   pengetahuan, tetapi juga pembagian waktu.
 * - Jawaban dikirim ke server begitu dipilih — bukan ditumpuk sampai akhir —
 *   supaya peramban yang tertutup atau baterai yang habis tidak menghanguskan
 *   pekerjaan. Isian singkat ditunda sebentar (600 ms) agar tidak mengirim tiap
 *   ketukan papan tik.
 * - Tidak ada penjagaan pindah tab, tidak ada layar penuh, tidak ada
 *   pengguguran. Ini ruang berlatih; aturan keras hari-H tinggal di ruang ujian.
 * - Waktu habis TIDAK memutus di sisi layar saja: berkasnya ikut ditutup di
 *   server lewat aksi yang sama dengan tombol "Selesai", sehingga nilai tetap
 *   dihitung walau siswa menutup peramban lebih dulu.
 */
export function RuangWarung({
  sesiId,
  judul,
  keterangan,
  kategori,
  butir,
  sisaDetikAwal,
}: {
  sesiId: number;
  judul: string;
  keterangan: string;
  kategori: InfoKategori;
  butir: ButirMain[];
  sisaDetikAwal: number;
}) {
  const [indeks, setIndeks] = useState(0);
  const [jawaban, setJawaban] = useState<Record<number, string | null>>(() =>
    Object.fromEntries(butir.map((b) => [b.id, b.jawaban])),
  );
  const [ragu, setRagu] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(butir.map((b) => [b.id, b.ragu])),
  );
  const [sisa, setSisa] = useState(sisaDetikAwal);
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [, mulaiKirim] = useTransition();

  const formTutup = useRef<HTMLFormElement>(null);
  const tundaIS = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const soal = butir[indeks];
  const terisi = butir.filter((b) => isiAda(jawaban[b.id])).length;

  /* ---------- penyimpanan ---------- */

  const kirim = useCallback(
    (soalId: number, nilai: string | null, tandaRagu: boolean) => {
      setMenyimpan(true);
      mulaiKirim(async () => {
        const balasan = await simpanJawabanAction({
          sesiId,
          soalId,
          jawaban: nilai,
          ragu: tandaRagu,
        });
        setMenyimpan(false);
        if ("error" in balasan) setGalat(balasan.error);
        else setGalat(null);
      });
    },
    [sesiId],
  );

  const pilih = (soalId: number, nilai: string | null) => {
    setJawaban((j) => ({ ...j, [soalId]: nilai }));
    kirim(soalId, nilai, ragu[soalId] ?? false);
  };

  /** Isian singkat: tunggu 600 ms setelah ketikan terakhir baru dikirim. */
  const ketik = (soalId: number, nilai: string) => {
    setJawaban((j) => ({ ...j, [soalId]: nilai }));
    clearTimeout(tundaIS.current[soalId]);
    tundaIS.current[soalId] = setTimeout(() => kirim(soalId, nilai, ragu[soalId] ?? false), 600);
  };

  const tandaiRagu = (soalId: number) => {
    const nilai = !(ragu[soalId] ?? false);
    setRagu((r) => ({ ...r, [soalId]: nilai }));
    kirim(soalId, jawaban[soalId] ?? null, nilai);
  };

  /* ---------- timer ---------- */

  useEffect(() => {
    if (sisa <= 0) {
      // Menutup sesi lewat formulir yang sama dengan tombol "Selesai", supaya
      // hanya ada satu jalan keluar yang perlu dipercaya.
      formTutup.current?.requestSubmit();
      return;
    }
    const t = setTimeout(() => setSisa((d) => d - 1), 1000);
    return () => clearTimeout(t);
  }, [sisa]);

  const menit = Math.floor(Math.max(0, sisa) / 60);
  const detik = Math.max(0, sisa) % 60;
  const mepet = sisa <= 120;

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      {/* ================= Kolom soal ================= */}
      <div className="min-w-0 flex-1">
        {/* ---------- kepala ---------- */}
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-widest"
            style={{ background: kategori.warnaLembut, color: kategori.warna }}
          >
            {kategori.nama}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold">{judul}</p>
            <p className="truncate text-xs text-muted">{keterangan}</p>
          </div>

          <span
            className={`ml-auto flex items-center gap-2 rounded-xl px-3 py-2 text-lg font-extrabold tabular-nums ${
              mepet ? "bg-danger-soft text-danger" : "bg-surface-muted text-foreground"
            }`}
          >
            <IkonWaktu className="h-5 w-5" />
            {String(menit).padStart(2, "0")}:{String(detik).padStart(2, "0")}
          </span>
        </div>

        {galat && (
          <p className="mt-3 rounded-xl bg-danger-soft px-4 py-2.5 text-sm font-semibold text-danger">
            {galat}
          </p>
        )}

        {/* ---------- kartu soal ---------- */}
        <article className="card mt-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-muted">
              Soal {soal.nomor} dari {butir.length}
            </span>
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted">
              {soal.tipe === "PG"
                ? "Pilihan Ganda"
                : soal.tipe === "PGK"
                  ? "Benar / Salah"
                  : "Isian Singkat"}
            </span>
          </div>

          {soal.stimulus && (
            <div className="mt-4 rounded-xl border border-line/70 bg-surface-muted/60 p-4">
              <TeksSoal html={soal.stimulus} className="text-sm leading-relaxed" />
            </div>
          )}

          <TeksSoal html={soal.pertanyaan} className="mt-4 text-[15px] leading-relaxed" />
          {soal.gambarUrl && <GambarSoal src={soal.gambarUrl} nomor={soal.nomor} />}

          {/* ---------- isian menurut tipe ---------- */}
          {soal.tipe === "PG" && (
            <div className="mt-5 space-y-2.5">
              {soal.opsi.map((teks, i) => {
                const huruf = HURUF[i];
                const dipilih = jawaban[soal.id] === huruf;
                return (
                  <button
                    key={huruf}
                    type="button"
                    className={`opsi-main ${dipilih ? "terpilih" : ""}`}
                    onClick={() => pilih(soal.id, dipilih ? null : huruf)}
                  >
                    <span className="huruf-opsi">{huruf}</span>
                    <TeksSoal html={teks} className="flex-1 text-sm leading-relaxed" />
                  </button>
                );
              })}
              <p className="text-xs text-muted">
                Ketuk sekali lagi pilihan yang sama untuk membatalkannya.
              </p>
            </div>
          )}

          {soal.tipe === "PGK" && (
            <PernyataanBenarSalah
              pernyataan={soal.opsi}
              nilai={bacaLarik(jawaban[soal.id], soal.opsi.length)}
              onUbah={(larik) => pilih(soal.id, JSON.stringify(larik))}
            />
          )}

          {soal.tipe === "IS" && (
            <div className="mt-5">
              <label className="label" htmlFor={`is-${soal.id}`}>
                Jawaban singkat
              </label>
              <input
                className="input max-w-xs text-lg font-semibold"
                id={`is-${soal.id}`}
                value={jawaban[soal.id] ?? ""}
                onChange={(e) => ketik(soal.id, e.target.value)}
                onBlur={(e) => kirim(soal.id, e.target.value || null, ragu[soal.id] ?? false)}
                placeholder="Ketik jawabanmu"
                autoComplete="off"
              />
              <p className="mt-1.5 text-xs text-muted">
                Cukup angka atau kata jawabannya saja. Koma dan titik desimal dianggap sama.
              </p>
            </div>
          )}

          {/* ---------- navigasi ---------- */}
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line/70 pt-5">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={indeks === 0}
              onClick={() => setIndeks((i) => Math.max(0, i - 1))}
            >
              ← Sebelumnya
            </button>
            <button
              type="button"
              className={`btn ${ragu[soal.id] ? "btn-accent" : "btn-ghost"}`}
              onClick={() => tandaiRagu(soal.id)}
            >
              {ragu[soal.id] ? "★ Ditandai ragu" : "☆ Tandai ragu"}
            </button>
            <button
              type="button"
              className="btn btn-primary ml-auto"
              disabled={indeks === butir.length - 1}
              onClick={() => setIndeks((i) => Math.min(butir.length - 1, i + 1))}
            >
              Berikutnya →
            </button>
          </div>
        </article>
      </div>

      {/* ================= Panel nomor ================= */}
      <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-72">
        <div className="card p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wide">Nomor soal</h2>
            <span className="text-xs font-semibold text-muted">
              {terisi}/{butir.length} terisi
            </span>
          </div>

          <div className="mt-3 grid grid-cols-6 gap-1.5">
            {butir.map((b, i) => {
              const ada = isiAda(jawaban[b.id]);
              const tandai = ragu[b.id];
              const aktif = i === indeks;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setIndeks(i)}
                  aria-current={aktif ? "true" : undefined}
                  className={`grid h-9 place-items-center rounded-lg border text-xs font-bold tabular-nums transition-colors ${
                    aktif
                      ? "border-accent bg-accent text-[#04121b]"
                      : tandai
                        ? "border-warning bg-warning-soft text-warning"
                        : ada
                          ? "border-success/60 bg-success-soft text-success"
                          : "border-line text-muted hover:border-accent/60"
                  }`}
                >
                  {b.nomor}
                </button>
              );
            })}
          </div>

          <ul className="mt-4 space-y-1.5 text-[11px] text-muted">
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border border-success/60 bg-success-soft" /> sudah
              dijawab
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border border-warning bg-warning-soft" /> ditandai
              ragu
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border border-line" /> belum dijawab
            </li>
          </ul>

          <p className="mt-4 text-[11px] text-muted">
            {menyimpan ? "Menyimpan…" : "Jawabanmu tersimpan otomatis."}
          </p>

          <form action={selesaikanSesiAction} ref={formTutup} className="mt-4">
            <input type="hidden" name="sesi_id" value={sesiId} />
            <button
              type="submit"
              className="btn btn-primary w-full font-extrabold uppercase tracking-wide"
              onClick={(e) => {
                const kosong = butir.length - terisi;
                if (
                  kosong > 0 &&
                  !window.confirm(
                    `Masih ada ${kosong} soal yang belum dijawab. Tetap selesaikan sekarang?`,
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              Selesai & Lihat Nilai
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function isiAda(v: string | null | undefined): boolean {
  if (v == null) return false;
  const t = v.trim();
  if (t === "" || t === "[]") return false;
  // Butir Benar/Salah dianggap terisi hanya bila semua pernyataan sudah dinilai.
  if (t.startsWith("[")) {
    try {
      const p = JSON.parse(t) as unknown[];
      return Array.isArray(p) && p.length > 0 && p.every((x) => x === "B" || x === "S");
    } catch {
      return false;
    }
  }
  return true;
}

function bacaLarik(v: string | null | undefined, panjang: number): (string | null)[] {
  const kosong = Array.from({ length: panjang }, () => null as string | null);
  if (!v) return kosong;
  try {
    const p = JSON.parse(v) as unknown;
    if (!Array.isArray(p)) return kosong;
    return kosong.map((_, i) => {
      const x = String(p[i] ?? "").toUpperCase();
      return x === "B" || x === "S" ? x : null;
    });
  } catch {
    return kosong;
  }
}

/** Tabel pernyataan Benar/Salah untuk butir pilihan ganda kompleks. */
function PernyataanBenarSalah({
  pernyataan,
  nilai,
  onUbah,
}: {
  pernyataan: string[];
  nilai: (string | null)[];
  onUbah: (larik: string[]) => void;
}) {
  const setSatu = (i: number, v: "B" | "S") => {
    const baru = pernyataan.map((_, j) => (j === i ? v : (nilai[j] ?? "")));
    onUbah(baru as string[]);
  };

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-line">
      <div className="grid grid-cols-[1fr_5rem_5rem] items-center gap-2 bg-surface-muted px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted">
        <span>Pernyataan</span>
        <span className="text-center">Benar</span>
        <span className="text-center">Salah</span>
      </div>

      {pernyataan.map((p, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_5rem_5rem] items-center gap-2 border-t border-line/70 px-4 py-3"
        >
          <TeksSoal html={p} className="text-sm leading-relaxed" />
          {(["B", "S"] as const).map((v) => {
            const dipilih = nilai[i] === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setSatu(i, v)}
                aria-pressed={dipilih}
                className={`mx-auto grid h-9 w-14 place-items-center rounded-lg border text-xs font-extrabold transition-colors ${
                  dipilih
                    ? v === "B"
                      ? "border-success bg-success-soft text-success"
                      : "border-danger bg-danger-soft text-danger"
                    : "border-line text-muted hover:border-accent/60"
                }`}
              >
                {v === "B" ? "BENAR" : "SALAH"}
              </button>
            );
          })}
        </div>
      ))}

      <p className="border-t border-line/70 px-4 py-2.5 text-[11px] text-muted">
        Seluruh pernyataan harus dinilai. Butir ini benar hanya bila semuanya tepat.
      </p>
    </div>
  );
}
