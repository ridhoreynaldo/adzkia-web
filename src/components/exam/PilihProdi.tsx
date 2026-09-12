"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

export interface ItemProdi {
  id: number;
  nama: string;
  ptn: string;
  jenjang?: string | null;
  /**
   * Ancar-ancar skor UTBK minimum prodi ini. Ditampilkan supaya peserta tahu
   * target skornya sejak memilih, bukan baru sesudah ujian dinilai. null bila
   * prodinya belum punya angka di basis data ancar-ancar.
   */
  skorMin?: number | null;
}

const JEDA_CARI = 250; // ms

/**
 * Ancar-ancar skor di kotak pencarian.
 *
 * Sengaja diberi tanda "±": angkanya perkiraan — sebagian dihitung dari
 * keketatan resmi SNPMB, sebagian lagi diduga dari prodi sejenis di kampus
 * setara. Menampilkannya tanpa tanda itu akan terbaca seperti nilai resmi.
 */
function Ambang({ skor, ringkas = false }: { skor: number; ringkas?: boolean }) {
  return (
    <span
      className={
        ringkas
          ? "shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold tabular-nums text-brand"
          : "text-xs font-bold tabular-nums text-brand"
      }
    >
      ±{skor}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Satu kotak pencarian                                                 */
/* ------------------------------------------------------------------ */

function KotakProdi({
  urutan,
  wajib,
  jenjang,
  awal,
  terkunci,
  onPilih,
}: {
  urutan: number;
  wajib: boolean;
  /** Jenjang yang boleh masuk kotak ini, mis. "S1" atau "D3/D4". */
  jenjang: string;
  awal: ItemProdi | null;
  /** id prodi yang sudah dipakai kotak lain — supaya tidak dipilih dua kali. */
  terkunci: number[];
  onPilih: (urutan: number, item: ItemProdi | null) => void;
}) {
  const idInput = useId();
  const [teks, setTeks] = useState(awal ? `${awal.nama} — ${awal.ptn}` : "");
  const [dipilih, setDipilih] = useState<ItemProdi | null>(awal);
  const [hasil, setHasil] = useState<ItemProdi[]>([]);
  const [buka, setBuka] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [kosong, setKosong] = useState(false);

  const bungkus = useRef<HTMLDivElement>(null);
  const jam = useRef<number | null>(null);
  const permintaanKe = useRef(0);

  // Klik di luar menutup daftar.
  useEffect(() => {
    const onKlik = (e: MouseEvent) => {
      if (bungkus.current && !bungkus.current.contains(e.target as Node)) setBuka(false);
    };
    document.addEventListener("mousedown", onKlik);
    return () => document.removeEventListener("mousedown", onKlik);
  }, []);

  const cari = useCallback(async (q: string) => {
    const nomor = ++permintaanKe.current;
    setMemuat(true);
    try {
      // `urutan` ikut dikirim supaya pelayan hanya mengembalikan jenjang yang
      // sah untuk kotak ini — S1 untuk pilihan 1-2, D3/D4 untuk pilihan 3-4.
      const res = await fetch(`/api/prodi/cari?q=${encodeURIComponent(q)}&urutan=${urutan}`);
      const data = (await res.json()) as { hasil?: ItemProdi[] };
      // Balasan yang datang terlambat diabaikan supaya daftar tidak "melompat".
      if (nomor !== permintaanKe.current) return;
      const daftar = data.hasil ?? [];
      setHasil(daftar);
      setKosong(daftar.length === 0);
    } catch {
      if (nomor === permintaanKe.current) {
        setHasil([]);
        setKosong(true);
      }
    } finally {
      if (nomor === permintaanKe.current) setMemuat(false);
    }
  }, [urutan]);

  const ubahTeks = (v: string) => {
    setTeks(v);
    if (dipilih) {
      setDipilih(null);
      onPilih(urutan, null);
    }
    if (jam.current !== null) window.clearTimeout(jam.current);
    if (v.trim().length < 2) {
      setHasil([]);
      setKosong(false);
      setBuka(false);
      return;
    }
    setBuka(true);
    jam.current = window.setTimeout(() => void cari(v), JEDA_CARI);
  };

  const pilih = (item: ItemProdi) => {
    setDipilih(item);
    setTeks(`${item.nama} — ${item.ptn}`);
    setBuka(false);
    setHasil([]);
    onPilih(urutan, item);
  };

  const bersihkan = () => {
    setDipilih(null);
    setTeks("");
    setHasil([]);
    setKosong(false);
    setBuka(false);
    onPilih(urutan, null);
  };

  const tampil = hasil.filter((h) => !terkunci.includes(h.id));

  return (
    <div className="space-y-2">
      <label htmlFor={idInput} className="block text-base font-bold">
        Program Studi {urutan}{" "}
        {wajib ? (
          <span className="text-danger" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="text-sm font-medium text-muted">(opsional)</span>
        )}{" "}
        {/* Jenjangnya ditempel di label, bukan hanya di keterangan atas
            halaman: kotak ini yang menolak, jadi aturannya harus terbaca di
            tempat peserta mengetik. */}
        <span className="ml-0.5 inline-block rounded-full bg-brand-soft px-2 py-0.5 align-middle text-[11px] font-extrabold uppercase tracking-wide text-brand">
          Khusus {jenjang}
        </span>
      </label>

      <div ref={bungkus} className="relative">
        <input type="hidden" name={`prodi${urutan}`} value={dipilih?.id ?? ""} />

        <div
          className={`flex items-center gap-2 rounded-full border-2 bg-surface px-5 py-3 transition-colors ${
            dipilih ? "border-success" : "border-line focus-within:border-brand"
          }`}
        >
          <input
            id={idInput}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
            value={teks}
            onChange={(e) => ubahTeks(e.target.value)}
            onFocus={() => {
              if (!dipilih && teks.trim().length >= 2) setBuka(true);
            }}
            placeholder={`Ketik Program Studi ${jenjang} & Universitas`}
            autoComplete="off"
            aria-expanded={buka}
            aria-controls={`${idInput}-daftar`}
            role="combobox"
            aria-autocomplete="list"
          />

          {dipilih || teks ? (
            <button
              type="button"
              onClick={bersihkan}
              className="shrink-0 rounded-full px-1 text-lg leading-none text-muted hover:text-danger"
              aria-label={`Hapus pilihan program studi ${urutan}`}
            >
              ×
            </button>
          ) : null}

          <span className="shrink-0 text-brand" aria-hidden="true">
            {/* kaca pembesar */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
        </div>

        {dipilih && dipilih.skorMin != null && (
          <p className="mt-1.5 px-2 text-xs text-muted">
            Ancar-ancar skor minimum: <Ambang skor={dipilih.skorMin} /> — target yang perlu kamu
            lewati untuk prodi ini.
          </p>
        )}

        {buka && (
          <div
            id={`${idInput}-daftar`}
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-line bg-surface shadow-xl"
          >
            {memuat && <p className="px-4 py-3 text-sm text-muted">Mencari…</p>}

            {!memuat && kosong && (
              <p className="px-4 py-3 text-sm text-muted">
                Tidak ada program studi <strong className="text-foreground">{jenjang}</strong> yang
                cocok. Kotak ini hanya menerima jenjang {jenjang}. Coba kata kunci lain, misalnya
                nama kampusnya.
              </p>
            )}

            {!memuat &&
              tampil.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => pilih(item)}
                  className="block w-full border-b border-line/60 px-4 py-3 text-left last:border-0 hover:bg-brand-soft"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="block text-sm font-bold uppercase leading-tight">
                      {item.nama}
                    </span>
                    {item.skorMin != null && <Ambang skor={item.skorMin} ringkas />}
                  </span>
                  <span className="mt-0.5 block text-xs uppercase text-muted">
                    {item.jenjang ? `${item.jenjang} · ` : ""}
                    {item.ptn}
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Formulir empat pilihan                                               */
/* ------------------------------------------------------------------ */

function TombolLanjut({ aktif, jumlahWajib }: { aktif: boolean; jumlahWajib: number }) {
  const { pending } = useFormStatus();
  return (
    <>
      <button
        type="submit"
        disabled={!aktif || pending}
        className="btn btn-primary w-full text-base focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        {pending ? "Menyimpan pilihan…" : "Daftar & Lanjut"}
      </button>
      {!aktif && (
        <p className="mt-2 text-center text-xs text-muted">
          Isi minimal {jumlahWajib} pilihan program studi untuk melanjutkan.
        </p>
      )}
    </>
  );
}

export function PilihProdi({
  packageId,
  maks,
  minWajib,
  jenjang,
  awal,
  aksi,
}: {
  packageId: number;
  maks: number;
  minWajib: number;
  /**
   * Label jenjang tiap kotak, urut 1..maks — mis. ["S1","S1","D3/D4","D3/D4"].
   * Datang dari server (src/lib/prodi.ts) supaya aturan yang ditampilkan di
   * layar selalu sama dengan aturan yang menyaring pencarian dan menolak
   * penyimpanan.
   */
  jenjang: string[];
  /** Pilihan yang sudah tersimpan sebelumnya, urut 1..maks (null = kosong). */
  awal: (ItemProdi | null)[];
  aksi: (formData: FormData) => Promise<void>;
}) {
  const [terpilih, setTerpilih] = useState<(ItemProdi | null)[]>(() =>
    Array.from({ length: maks }, (_, i) => awal[i] ?? null),
  );

  const onPilih = useCallback((urutan: number, item: ItemProdi | null) => {
    setTerpilih((p) => {
      const baru = [...p];
      baru[urutan - 1] = item;
      return baru;
    });
  }, []);

  const cukup = terpilih.slice(0, minWajib).every((t) => t !== null);

  return (
    <form action={aksi} className="space-y-6">
      <input type="hidden" name="packageId" value={packageId} />

      {Array.from({ length: maks }, (_, i) => {
        const urutan = i + 1;
        return (
          <KotakProdi
            key={urutan}
            urutan={urutan}
            wajib={urutan <= minWajib}
            jenjang={jenjang[i] ?? ""}
            awal={awal[i] ?? null}
            terkunci={terpilih
              .map((t, j) => (t && j !== i ? t.id : 0))
              .filter((id): id is number => id > 0)}
            onPilih={onPilih}
          />
        );
      })}

      <div className="pt-2">
        <TombolLanjut aktif={cukup} jumlahWajib={minWajib} />
      </div>
    </form>
  );
}
