"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";

import { RuangUjian } from "@/components/exam/RuangUjian";
import type { HasilAksiSubtes, SoalUjian } from "@/components/exam/tipe";

/** Satu sesi yang bisa dijalani admin dalam pratinjau. */
export interface SesiPratinjau {
  subtes: string;
  namaSubtes: string;
  /** Durasi resmi sesi ini dalam detik — sama dengan yang dipakai peserta. */
  durasiDetik: number;
  soal: SoalUjian[];
  /** Jumlah butir yang seharusnya ada menurut juknis. */
  target: number;
}

interface Props {
  packageId: number;
  kodePaket: string;
  namaPaket: string;
  namaAdmin: string;
  /** true = paket SKD: satu sesi utuh, bukan subtes berurutan. */
  sesiTunggal: boolean;
  sesi: SesiPratinjau[];
  /** Total butir yang seharusnya ada di paket ini (160 untuk UTBK). */
  targetTotal: number;
}

function menit(detik: number): string {
  return `${Math.round(detik / 60)} menit`;
}

/**
 * Pratinjau ujian untuk admin: MENJALANI sendiri tryout-nya dari layar yang
 * sama persis dengan yang dipakai peserta, sebelum paketnya dibuka ke siswa.
 *
 * Bedanya dengan halaman Pratinjau Soal (`/admin/paket/[id]/pratinjau`), yang
 * menyusun seluruh butir sebagai daftar untuk ditelaah: yang ini menjawab
 * pertanyaan lain — "kalau siswa duduk di depannya nanti, apa yang dia lihat
 * dan alami?". Timer, panel nomor, tab bacaan di layar kecil, gerbang layar
 * penuh, blokir salin, sampai dialog "Selesaikan Subtes" semuanya nyata.
 *
 * Yang TIDAK nyata hanyalah akibatnya: `RuangUjian` dijalankan dengan bendera
 * `pratinjau`, sehingga tidak ada jawaban tersimpan, tidak ada denyut, tidak
 * ada catatan pelanggaran, dan tidak ada attempt yang dibuat. Karena itu pula
 * penutupan subtes ditangani di sini, di klien — bukan lewat server action.
 */
export function PratinjauUjian({
  packageId,
  kodePaket,
  namaPaket,
  namaAdmin,
  sesiTunggal,
  sesi,
  targetTotal,
}: Props) {
  const [aktif, setAktif] = useState<number | null>(null);
  const [tuntas, setTuntas] = useState<string[]>([]);

  const totalSoal = useMemo(() => sesi.reduce((a, s) => a + s.soal.length, 0), [sesi]);

  /**
   * Pengganti `selesaikanSubtesAction`. Bentuk balasannya sengaja sama supaya
   * `RuangUjian` tidak perlu tahu ia sedang dipakai admin — hanya isinya yang
   * berbeda: sesi berikutnya disiapkan di sini, bukan diambil ulang dari server.
   */
  const selesaikanSesi = useCallback(
    async (_attemptId: number, subtes: string): Promise<HasilAksiSubtes> => {
      setTuntas((t) => (t.includes(subtes) ? t : [...t, subtes]));
      setAktif((i) => {
        if (i === null) return null;
        return i + 1 < sesi.length ? i + 1 : null;
      });
      const berikut = sesi[(aktif ?? 0) + 1];
      return berikut
        ? { status: "lanjut", subtes: berikut.subtes, namaSubtes: berikut.namaSubtes }
        : { status: "lanjut", subtes, namaSubtes: "" };
    },
    [aktif, sesi],
  );

  const indeksAktif = aktif;
  const sekarang = indeksAktif !== null ? sesi[indeksAktif] : undefined;

  if (sekarang && indeksAktif !== null) {
    return (
      <RuangUjian
        key={sekarang.subtes}
        pratinjau
        onKeluarPratinjau={() => setAktif(null)}
        attemptId={0}
        packageId={packageId}
        namaPeserta={`${namaAdmin} · pratinjau`}
        namaPaket={`${namaPaket} · ${kodePaket}`}
        subtes={sekarang.subtes}
        namaSubtesAktif={sekarang.namaSubtes}
        urutanKe={indeksAktif + 1}
        totalSubtes={sesi.length}
        sisaDetik={sekarang.durasiDetik}
        sesiTunggal={sesiTunggal}
        jalur={sesiTunggal ? "skd" : "utbk"}
        soal={sekarang.soal}
        aksiSelesaiSubtes={selesaikanSesi}
      />
    );
  }

  const semuaTuntas = tuntas.length > 0 && tuntas.length >= sesi.length;

  return (
    <div className="space-y-6">
      {semuaTuntas && (
        <div className="card border-success bg-success-soft p-5">
          <p className="text-sm font-bold text-success">
            Seluruh {sesi.length} sesi sudah kamu lewati dalam pratinjau.
          </p>
          <p className="mt-1 text-sm text-success">
            Tidak ada satu pun jawaban, catatan waktu, atau pelanggaran yang tersimpan. Paket ini
            aman dibuka ke siswa dari sisi tampilan.
          </p>
        </div>
      )}

      <div className="card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Paket</p>
            <p className="text-lg font-extrabold">{kodePaket}</p>
            <p className="text-sm text-muted">{namaPaket}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Soal siap</p>
            <p
              className={`text-lg font-extrabold tabular-nums ${
                totalSoal >= targetTotal ? "text-success" : "text-danger"
              }`}
            >
              {totalSoal} / {targetTotal}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted">
          Pilih sesi yang mau kamu jalani. Layarnya sama persis dengan milik peserta — timer, panel
          nomor, gerbang layar penuh, blokir salin, sampai dialog penutup subtes. Bedanya, di sini{" "}
          <strong className="text-foreground">
            tidak ada jawaban yang disimpan, tidak ada waktu yang dicatat, dan tidak ada yang
            digugurkan
          </strong>
          . Menekan &ldquo;Selesaikan Subtes&rdquo; langsung membawamu ke sesi berikutnya.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {sesi.map((s, i) => {
          const kurang = s.soal.length < s.target;
          const sudah = tuntas.includes(s.subtes);
          return (
            <li key={s.subtes}>
              <button
                type="button"
                onClick={() => setAktif(i)}
                className="card flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-surface-muted"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-sm font-extrabold text-brand">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{s.namaSubtes}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    <span className={kurang ? "font-bold text-danger" : ""}>
                      {s.soal.length} dari {s.target} soal
                    </span>{" "}
                    · {menit(s.durasiDetik)}
                    {sudah ? " · sudah dilihat" : ""}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-bold text-brand">Jalani →</span>
              </button>
            </li>
          );
        })}
      </ul>

      {sesi.length === 0 && (
        <div className="card p-10 text-center">
          <p className="font-semibold">Paket ini belum berisi soal.</p>
          <p className="mt-1 text-sm text-muted">
            Impor naskahnya dulu, baru pratinjau ujiannya bisa dijalani.
          </p>
        </div>
      )}

      <p className="text-center text-xs text-muted">
        Mau menelaah butir demi butir berikut kuncinya?{" "}
        <Link className="font-semibold text-brand hover:underline" href={`/admin/paket/${packageId}/pratinjau`}>
          Buka Pratinjau Soal
        </Link>
        .
      </p>
    </div>
  );
}
