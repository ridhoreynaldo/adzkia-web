"use client";

import { useCallback, useState } from "react";

import { RuangIelts, type SeksiRuang, type SoalRuang } from "@/components/language/RuangIelts";

/** Satu subtes yang bisa dijalani pengelola dalam pratinjau. */
export interface SubtesPratinjauIelts {
  kode: string;
  nama: string;
  menit: number;
  labelSeksi: string;
  /** Butir yang seharusnya ada menurut bentuk baku IELTS. */
  target: number;
  seksi: SeksiRuang[];
  soal: SoalRuang[];
}

/**
 * PRATINJAU UJIAN IELTS — pengelola MENJALANI sendiri paketnya dari layar yang
 * sama persis dengan yang dipakai siswa.
 *
 * Bedanya dengan `/admin/ielts/[id]/pratinjau`, yang menderetkan seluruh butir
 * beserta kunci untuk ditelaah: yang ini menjawab pertanyaan lain — "kalau
 * siswa duduk di depannya nanti, apa yang ia lihat dan alami?". Hitung mundur,
 * tab bagian, pemutar rekaman sekali jalan, panel nomor, gerbang layar penuh,
 * blokir salin, sampai dialog submit semuanya nyata.
 *
 * Yang TIDAK nyata hanyalah akibatnya: `RuangIelts` dijalankan dengan bendera
 * `pratinjau`, sehingga tidak ada jawaban tersimpan, tidak ada denyut, tidak
 * ada catatan pelanggaran, dan tidak ada pengerjaan yang dibuat. Karena itu
 * pula perpindahan antar subtes diurus di sini, di peramban — bukan lewat
 * Server Action.
 */
export function PratinjauUjianIelts({
  kodePaket,
  namaPaket,
  namaAdmin,
  subtes,
}: {
  kodePaket: string;
  namaPaket: string;
  namaAdmin: string;
  subtes: SubtesPratinjauIelts[];
}) {
  const [aktif, setAktif] = useState<number | null>(null);
  const [tuntas, setTuntas] = useState<string[]>([]);

  const selesai = useCallback((kode: string) => {
    setTuntas((t) => (t.includes(kode) ? t : [...t, kode]));
    setAktif(null);
  }, []);

  const sekarang = aktif !== null ? subtes[aktif] : undefined;

  if (sekarang) {
    return (
      <RuangIelts
        // `key` memaksa ruang ujian lahir kembali tiap ganti subtes: hitung
        // mundur, jawaban sementara, dan gerbang layar penuhnya harus mulai
        // dari nol, persis seperti siswa yang membuka subtes berikutnya.
        key={sekarang.kode}
        pratinjau
        onSelesaiPratinjau={selesai}
        pengerjaanId={0}
        namaPaket={`${namaPaket} · ${kodePaket} · pratinjau ${namaAdmin}`}
        subtes={sekarang.kode}
        namaSubtes={sekarang.nama}
        menit={sekarang.menit}
        labelSeksi={sekarang.labelSeksi}
        seksi={sekarang.seksi}
        soal={sekarang.soal}
        jawabanAwal={{}}
        sisaDetikAwal={sekarang.menit * 60}
      />
    );
  }

  const totalButir = subtes.reduce((n, s) => n + s.soal.length, 0);
  const adaIsinya = subtes.filter((s) => s.soal.length > 0);

  return (
    <div className="space-y-6">
      {tuntas.length > 0 && tuntas.length >= adaIsinya.length && (
        <div className="card border-success bg-success-soft p-5">
          <p className="text-sm font-bold text-success">
            Seluruh {adaIsinya.length} subtes berisi sudah kamu lewati dalam pratinjau.
          </p>
          <p className="mt-1 text-sm text-success">
            Tidak ada satu pun jawaban, catatan waktu, atau pelanggaran yang tersimpan. Dari sisi
            tampilan, paket ini aman dibuka ke siswa.
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
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Butir siap</p>
            <p className="text-lg font-extrabold tabular-nums">{totalButir}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {subtes.map((s, i) => {
          const kosong = s.soal.length === 0;
          const sudah = tuntas.includes(s.kode);
          return (
            <section key={s.kode} className="card flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight">{s.nama}</h2>
                  <p className="text-xs text-muted">
                    {s.menit} menit · {s.soal.length}/{s.target} butir · {s.seksi.length}{" "}
                    {s.labelSeksi.toLowerCase()}
                  </p>
                </div>
                {sudah && (
                  <span className="rounded-full bg-success-soft px-3 py-1 text-[11px] font-bold text-success">
                    sudah dicoba
                  </span>
                )}
              </div>

              <button
                type="button"
                className="btn btn-primary mt-auto"
                disabled={kosong}
                onClick={() => setAktif(i)}
              >
                {kosong ? "Belum ada butir" : sudah ? "Coba lagi" : "Jalani subtes ini"}
              </button>

              {kosong && (
                <p className="text-xs text-muted">
                  Subtes tanpa butir tidak bisa dibuka siswa juga — papan subtesnya menandainya
                  &ldquo;kosong&rdquo;.
                </p>
              )}
            </section>
          );
        })}
      </div>

      <p className="text-xs leading-relaxed text-muted">
        Waktu yang dipakai pratinjau adalah waktu paket ini yang sebenarnya. Rekaman Listening
        diputar dengan aturan yang sama: <strong>sekali jalan, tidak bisa diulang</strong> — jadi
        siapkan pengeras suara sebelum menekan mainkan.
      </p>
    </div>
  );
}
