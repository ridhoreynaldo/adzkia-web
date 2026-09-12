"use client";

import type { SoalUjian } from "./tipe";

export type StatusNomor = "kosong" | "terisi" | "ragu";

export function statusNomor(
  soal: SoalUjian,
  jawaban: Record<number, string | null>,
  ragu: Record<number, boolean>,
): StatusNomor {
  if (ragu[soal.id]) return "ragu";
  const v = jawaban[soal.id];
  if (v != null && v !== "" && v !== "[]") return "terisi";
  return "kosong";
}

const GAYA: Record<StatusNomor, string> = {
  kosong: "bg-surface-muted text-muted border-line hover:bg-line/60",
  terisi: "bg-brand text-white border-brand hover:brightness-110",
  ragu: "bg-accent text-white border-accent hover:brightness-110",
};

const KETERANGAN: Record<StatusNomor, string> = {
  kosong: "belum dijawab",
  terisi: "sudah dijawab",
  ragu: "ditandai ragu-ragu",
};

interface Props {
  soal: SoalUjian[];
  jawaban: Record<number, string | null>;
  ragu: Record<number, boolean>;
  aktif: number;
  onPilih: (indeks: number) => void;
}

/**
 * Panel nomor soal.
 *
 * Nomornya sengaja disajikan sebagai satu deret utuh tanpa sekat subtes.
 * Pada SKD, panel ini dulu mengelompokkan nomor per TWK/TIU/TKP agar peserta
 * mudah melompat — tetapi itu memberitahu bagian mana yang sedang dikerjakan,
 * padahal SKD Kedinasan nasional sengaja TIDAK memberitahukannya. Kemudahan
 * navigasi dikalahkan oleh kesetiaan pada ujian aslinya.
 */
export function PanelNomor({ soal, jawaban, ragu, aktif, onPilih }: Props) {
  const terisi = soal.filter((s) => statusNomor(s, jawaban, ragu) === "terisi").length;
  const jumlahRagu = soal.filter((s) => statusNomor(s, jawaban, ragu) === "ragu").length;
  const kosong = soal.length - terisi - jumlahRagu;

  const tombol = (s: SoalUjian, i: number) => {
    const st = statusNomor(s, jawaban, ragu);
    const ini = i === aktif;
    return (
      <button
        key={s.id}
        type="button"
        onClick={() => onPilih(i)}
        aria-current={ini ? "true" : undefined}
        aria-label={`Soal nomor ${s.nomor}, ${KETERANGAN[st]}${ini ? ", sedang dibuka" : ""}`}
        className={`h-9 rounded-lg border text-sm font-bold transition
          focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2
          ${GAYA[st]} ${ini ? "ring-2 ring-offset-2 ring-foreground" : ""}`}
      >
        {s.nomor}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-bold">Nomor Soal</h2>
        <p className="text-xs text-muted mt-0.5">
          {terisi} terjawab · {jumlahRagu} ragu · {kosong} kosong
        </p>
      </div>

      <div role="group" aria-label="Navigasi nomor soal" className="flex flex-col gap-3">
        <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-5">
          {soal.map((s, i) => tombol(s, i))}
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded bg-surface-muted border border-line" />
          Belum dijawab
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded bg-brand" />
          Sudah dijawab
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded bg-accent" />
          Ragu-ragu
        </li>
      </ul>
    </div>
  );
}
