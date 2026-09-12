"use client";

import { useEffect, useRef, useState } from "react";
import type { BalasanKeadaan } from "./tipe";

const AMBANG_MERAH = 5 * 60; // 5 menit terakhir

function format(detik: number): string {
  const d = Math.max(0, Math.trunc(detik));
  const m = Math.floor(d / 60);
  const s = d % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface Props {
  attemptId: number;
  subtes: string;
  /** Sisa detik menurut server saat halaman dirender. */
  sisaDetikAwal: number;
  /** Dipanggil sekali saat waktu habis. */
  onHabis: () => void;
  /** Dipanggil bila server melaporkan subtes lain sudah aktif. */
  onTidakSinkron?: () => void;
  /**
   * Pratinjau admin: tidak ada attempt di server, jadi tidak ada jam server yang
   * bisa dijadikan patokan. Hitung mundurnya murni lokal dan hanya untuk
   * memperlihatkan bentuk serta perilakunya (termasuk warna merah 5 menit
   * terakhir), bukan untuk mengukur waktu siapa pun.
   */
  pratinjau?: boolean;
}

/**
 * Hitung mundur mm:ss yang berpatokan pada deadline server.
 * Jam browser hanya dipakai untuk interpolasi antar-sinkronisasi;
 * setiap 30 detik nilainya dikoreksi lagi lewat `GET /api/exam/state`.
 */
export function TimerUjian({
  attemptId,
  subtes,
  sisaDetikAwal,
  onHabis,
  onTidakSinkron,
  pratinjau = false,
}: Props) {
  const [sisa, setSisa] = useState<number>(() => Math.max(0, sisaDetikAwal));
  // Diisi saat efek pertama berjalan — Date.now() tidak boleh dipanggil saat render.
  const patokan = useRef<number | null>(null);
  const sudahHabis = useRef(false);
  const onHabisRef = useRef(onHabis);
  const onTidakSinkronRef = useRef(onTidakSinkron);

  useEffect(() => {
    onHabisRef.current = onHabis;
  }, [onHabis]);

  useEffect(() => {
    onTidakSinkronRef.current = onTidakSinkron;
  }, [onTidakSinkron]);

  // Hitung mundur lokal. Saat subtes berganti, RuangUjian memasang `key={subtes}`
  // sehingga komponen ini dipasang ulang dan patokannya dihitung dari awal —
  // jadi tidak perlu me-reset state secara manual.
  useEffect(() => {
    patokan.current = Date.now() + Math.max(0, sisaDetikAwal) * 1000;
    sudahHabis.current = false;

    const id = window.setInterval(() => {
      const batas = patokan.current;
      if (batas === null) return;
      const s = Math.max(0, Math.round((batas - Date.now()) / 1000));
      setSisa(s);
      if (s <= 0 && !sudahHabis.current) {
        sudahHabis.current = true;
        onHabisRef.current();
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [sisaDetikAwal]);

  // Koreksi berkala ke jam server.
  useEffect(() => {
    if (pratinjau) return;
    let batal = false;
    const sinkron = async () => {
      try {
        const res = await fetch(`/api/exam/state?attemptId=${attemptId}`, { cache: "no-store" });
        if (!res.ok || batal) return;
        const data = (await res.json()) as BalasanKeadaan;
        if (batal || !data.ok) return;

        if (data.selesai || data.subtes !== subtes || !data.sudahMulai) {
          onTidakSinkronRef.current?.();
          return;
        }
        patokan.current = Date.now() + Math.max(0, data.sisaDetik) * 1000;
        setSisa(Math.max(0, data.sisaDetik));
      } catch {
        // Offline sementara: biarkan hitung mundur lokal berjalan.
      }
    };
    const id = window.setInterval(() => void sinkron(), 30_000);
    const onFokus = () => void sinkron();
    window.addEventListener("focus", onFokus);
    return () => {
      batal = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFokus);
    };
  }, [attemptId, pratinjau, subtes]);

  const kritis = sisa <= AMBANG_MERAH;

  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-3 py-1.5 tabular-nums transition-colors ${
        kritis ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand"
      }`}
      role="timer"
      aria-live="off"
    >
      <span aria-hidden="true" className="text-base leading-none">
        {kritis ? "⏳" : "⏱"}
      </span>
      <span className="sr-only">Sisa waktu </span>
      <span
        className={`font-extrabold text-xl sm:text-2xl leading-none ${kritis ? "animate-pulse" : ""}`}
      >
        {format(sisa)}
      </span>
    </div>
  );
}
