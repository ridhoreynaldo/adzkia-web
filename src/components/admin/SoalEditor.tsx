"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { simpanSoalAction } from "@/app/admin/actions";
import { PratinjauSoal } from "@/components/admin/PratinjauSoal";
import { UnggahGambar } from "@/components/admin/UnggahGambar";
import { Alert } from "@/components/ui";
import { LABEL_OPSI, subtesJalur, type TipeSoal } from "@/lib/tryout/snbt";

export interface NilaiAwalSoal {
  id?: number;
  package_id: number;
  subtes: string;
  nomor: number;
  tipe: TipeSoal;
  level: string;
  stimulus: string;
  pertanyaan: string;
  gambar_url: string;
  opsi: string[];
  kunciHuruf: string[];
  kunciTeks: string;
  /** Isi kolom `kunci` apa adanya — dipakai memulihkan kunci Benar/Salah. */
  kunciMentah?: string;
  pembahasan: string;
}

const TIPE: Array<{ nilai: TipeSoal; label: string; ket: string }> = [
  { nilai: "PG", label: "PG", ket: "Pilihan ganda — satu kunci" },
  { nilai: "PGK", label: "PGK", ket: "Pilihan ganda kompleks — banyak kunci" },
  { nilai: "BS", label: "B/S", ket: "Benar–Salah — tiap pernyataan dijawab B atau S" },
  { nilai: "IS", label: "IS", ket: "Isian singkat — jawaban diketik" },
];

function susunKunciKlien(
  tipe: TipeSoal,
  huruf: string[],
  teks: string,
  bs: string[],
  jumlahPernyataan: number,
): string {
  if (tipe === "IS") return teks.trim();
  // Kunci Benar/Salah sejajar dengan daftar pernyataan: ["B","S","B"]
  if (tipe === "BS") return JSON.stringify(bs.slice(0, jumlahPernyataan));
  const bersih = Array.from(new Set(huruf)).sort();
  if (tipe === "PGK") return JSON.stringify(bersih);
  return bersih[0] ?? "";
}

/** Baca kunci BS lama dari database menjadi array sepanjang daftar pernyataan. */
function bacaKunciBS(kunci: string, jumlah: number): string[] {
  const kosong = Array(Math.max(jumlah, 5)).fill("B");
  try {
    const p: unknown = JSON.parse(kunci);
    if (Array.isArray(p)) {
      return kosong.map((d, i) => {
        const v = String(p[i] ?? "").trim().toUpperCase();
        return v === "B" || v === "S" ? v : d;
      });
    }
  } catch {
    /* kunci belum berformat BS */
  }
  return kosong;
}

/**
 * Editor satu butir soal, dipakai jalur UTBK maupun SKD.
 *
 * `jalur` hanya menentukan daftar subtes yang boleh dipilih beserta kuotanya —
 * tujuh subtes UTBK atau tiga subtes SKD. Sisa formulirnya identik karena kedua
 * jalur memakai tabel `questions` yang sama.
 */
export function SoalEditor({ awal, jalur = "utbk" }: { awal: NilaiAwalSoal; jalur?: string }) {
  const [state, action, pending] = useActionState(simpanSoalAction, {});
  const daftarSubtes = subtesJalur(jalur);

  const [subtes, setSubtes] = useState(awal.subtes);
  const [nomor, setNomor] = useState<string>(String(awal.nomor || ""));
  const [tipe, setTipe] = useState<TipeSoal>(awal.tipe);
  const [level, setLevel] = useState(awal.level);
  const [stimulus, setStimulus] = useState(awal.stimulus);
  const [pertanyaan, setPertanyaan] = useState(awal.pertanyaan);
  const [gambar, setGambar] = useState(awal.gambar_url);
  const [opsi, setOpsi] = useState<string[]>(() => {
    const dasar = [...awal.opsi];
    while (dasar.length < 5) dasar.push("");
    return dasar.slice(0, 5);
  });
  const [kunciHuruf, setKunciHuruf] = useState<string[]>(awal.kunciHuruf);
  const [kunciTeks, setKunciTeks] = useState(awal.kunciTeks);
  const [kunciBS, setKunciBS] = useState<string[]>(() =>
    bacaKunciBS(awal.kunciMentah ?? "", awal.opsi.length),
  );
  const [pembahasan, setPembahasan] = useState(awal.pembahasan);

  const info = daftarSubtes.find((s) => s.kode === subtes);
  const jumlahPernyataan = opsi.filter((o) => o.trim()).length || 3;
  const kunci = susunKunciKlien(tipe, kunciHuruf, kunciTeks, kunciBS, jumlahPernyataan);

  // Kuota subtes dicari ulang DI DALAM memo, bukan lewat `info` di atas:
  // dependensi berupa objek hasil pencarian membuat React Compiler menyerah
  // mengoptimalkan komponen ini ("existing memoization could not be preserved").
  const peringatan = useMemo(() => {
    const kuota = subtesJalur(jalur).find((s) => s.kode === subtes);
    const daftar: string[] = [];
    const n = Number.parseInt(nomor, 10);
    if (!Number.isInteger(n) || n < 1) daftar.push("Nomor soal belum diisi dengan benar.");
    else if (kuota && n > kuota.jumlahSoal) {
      daftar.push(`Nomor ${n} melebihi kuota ${kuota.kode} (${kuota.jumlahSoal} soal).`);
    }
    if (!pertanyaan.trim()) daftar.push("Pertanyaan masih kosong.");
    if (tipe === "IS") {
      if (!kunciTeks.trim()) daftar.push("Kunci jawaban isian singkat belum diisi.");
    } else {
      const terisi = opsi.filter((o) => o.trim() !== "");
      if (terisi.length < 2) daftar.push("Isi minimal dua opsi jawaban.");
      if (kunciHuruf.length === 0) daftar.push("Kunci jawaban belum dipilih.");
      for (const h of kunciHuruf) {
        const i = LABEL_OPSI.indexOf(h as (typeof LABEL_OPSI)[number]);
        if (i < 0 || !opsi[i] || !opsi[i].trim()) {
          daftar.push(`Kunci ${h} menunjuk ke opsi yang masih kosong.`);
        }
      }
    }
    return daftar;
  }, [nomor, jalur, subtes, pertanyaan, tipe, kunciTeks, opsi, kunciHuruf]);

  function gantiTipe(baru: TipeSoal) {
    setTipe(baru);
    if (baru === "PG" && kunciHuruf.length > 1) setKunciHuruf(kunciHuruf.slice(0, 1));
  }

  function toggleKunci(huruf: string) {
    if (tipe === "PG") {
      setKunciHuruf([huruf]);
      return;
    }
    setKunciHuruf((lama) =>
      lama.includes(huruf) ? lama.filter((h) => h !== huruf) : [...lama, huruf].sort(),
    );
  }

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <input type="hidden" name="package_id" value={awal.package_id} />
      {awal.id ? <input type="hidden" name="id" value={awal.id} /> : null}
      <input type="hidden" name="kunci" value={kunci} />

      {/* ------------------------------ FORMULIR ------------------------------ */}
      <div className="space-y-5">
        {state.error && <Alert tone="danger">{state.error}</Alert>}

        <div className="card space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="subtes">
                Subtes
              </label>
              <select
                className="input"
                id="subtes"
                name="subtes"
                value={subtes}
                onChange={(e) => setSubtes(e.target.value)}
              >
                {daftarSubtes.map((s) => (
                  <option key={s.kode} value={s.kode}>
                    {s.kode} — {s.nama} ({s.jumlahSoal} soal)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="nomor">
                Nomor
              </label>
              <input
                className="input"
                id="nomor"
                name="nomor"
                type="number"
                min={1}
                max={info?.jumlahSoal ?? 40}
                required
                value={nomor}
                onChange={(e) => setNomor(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted">Maks {info?.jumlahSoal ?? "—"}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="label">Tipe soal</span>
              <input type="hidden" name="tipe" value={tipe} />
              <div className="flex gap-2">
                {TIPE.map((t) => (
                  <button
                    key={t.nilai}
                    type="button"
                    title={t.ket}
                    onClick={() => gantiTipe(t.nilai)}
                    className={`btn flex-1 py-2! text-sm ${
                      tipe === t.nilai ? "btn-primary" : "btn-ghost"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted">
                {TIPE.find((t) => t.nilai === tipe)?.ket}
              </p>
            </div>
            <div>
              <span className="label">Level kognitif</span>
              <input type="hidden" name="level" value={level} />
              <div className="flex gap-2">
                {["C3", "C4"].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLevel(l)}
                    className={`btn flex-1 py-2! text-sm ${level === l ? "btn-accent" : "btn-ghost"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted">Target juknis: C3 60% · C4 40%.</p>
            </div>
          </div>
        </div>

        <div className="card space-y-4 p-5">
          <div>
            <label className="label" htmlFor="stimulus">
              Stimulus / bacaan <span className="font-normal text-muted">(opsional)</span>
            </label>
            <textarea
              className="input min-h-40 leading-relaxed"
              id="stimulus"
              name="stimulus"
              value={stimulus}
              onChange={(e) => setStimulus(e.target.value)}
              placeholder="Tempel bacaan, tabel, atau teks pengantar di sini."
            />
          </div>

          <div>
            <label className="label" htmlFor="pertanyaan">
              Pertanyaan
            </label>
            <textarea
              className="input min-h-28 leading-relaxed"
              id="pertanyaan"
              name="pertanyaan"
              required
              value={pertanyaan}
              onChange={(e) => setPertanyaan(e.target.value)}
              placeholder="Tulis pokok pertanyaannya."
            />
          </div>

          <UnggahGambar
            paket={{ jenis: "tryout", id: awal.package_id }}
            nilaiAwal={awal.gambar_url}
            onChange={setGambar}
          />
        </div>

        {tipe === "IS" ? (
          <div className="card space-y-3 p-5">
            <h2 className="text-sm font-bold">Kunci jawaban isian singkat</h2>
            <input
              className="input"
              name="kunci_teks_tampilan"
              value={kunciTeks}
              onChange={(e) => setKunciTeks(e.target.value)}
              placeholder="Contoh: 24 atau 3,5"
            />
            <p className="text-xs text-muted">
              Penilaian mengabaikan spasi, huruf besar/kecil, dan menyamakan koma dengan titik.
            </p>
          </div>
        ) : (
          <div className="card space-y-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold">
                {tipe === "BS" ? "Daftar pernyataan" : "Opsi jawaban"}
              </h2>
              <span className="text-xs text-muted">
                {tipe === "BS"
                  ? "Tentukan kunci B atau S tiap pernyataan"
                  : tipe === "PGK"
                    ? "Centang semua kunci yang benar"
                    : "Pilih satu kunci"}
              </span>
            </div>
            {LABEL_OPSI.map((huruf, i) => {
              const dipilih = kunciHuruf.includes(huruf);
              return (
                <div key={huruf} className="flex items-start gap-2">
                  {tipe === "BS" ? (
                    <span className="mt-1 flex shrink-0 gap-1">
                      {(["B", "S"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            const baru = [...kunciBS];
                            baru[i] = v;
                            setKunciBS(baru);
                          }}
                          aria-pressed={kunciBS[i] === v}
                          title={`Pernyataan ${i + 1} kuncinya ${v === "B" ? "Benar" : "Salah"}`}
                          className={`grid size-9 place-items-center rounded-lg text-sm font-bold transition-colors ${
                            kunciBS[i] === v
                              ? v === "B"
                                ? "bg-success text-white"
                                : "bg-danger text-white"
                              : "border border-line bg-surface text-muted hover:bg-surface-muted"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </span>
                  ) : (
                  <button
                    type="button"
                    onClick={() => toggleKunci(huruf)}
                    aria-pressed={dipilih}
                    title={`Tandai ${huruf} sebagai kunci`}
                    className={`mt-1 grid size-9 shrink-0 place-items-center text-sm font-bold transition-colors ${
                      tipe === "PGK" ? "rounded-lg" : "rounded-full"
                    } ${
                      dipilih
                        ? "bg-success text-white"
                        : "border border-line bg-surface text-muted hover:bg-surface-muted"
                    }`}
                  >
                    {huruf}
                  </button>
                  )}
                  <textarea
                    className="input min-h-11 py-2.5"
                    name={`opsi_${i}`}
                    rows={1}
                    value={opsi[i] ?? ""}
                    onChange={(e) => {
                      const baru = [...opsi];
                      baru[i] = e.target.value;
                      setOpsi(baru);
                    }}
                    placeholder={
                      tipe === "BS"
                        ? `Pernyataan ${i + 1}${i < 2 ? "" : " (boleh kosong)"}`
                        : i < 2
                          ? `Teks opsi ${huruf}`
                          : `Teks opsi ${huruf} (boleh kosong)`
                    }
                  />
                </div>
              );
            })}
            <p className="text-xs text-muted">
              {tipe === "BS"
                ? "Tiap baris adalah satu pernyataan. Pilih B (Benar) atau S (Salah) sebagai kuncinya. Baris kosong diabaikan."
                : "Klik huruf di kiri untuk menandai kunci. Opsi yang dikosongkan tidak ditampilkan ke siswa."}
            </p>
          </div>
        )}

        <div className="card space-y-3 p-5">
          <label className="label" htmlFor="pembahasan">
            Pembahasan <span className="font-normal text-muted">(opsional)</span>
          </label>
          <textarea
            className="input min-h-32 leading-relaxed"
            id="pembahasan"
            name="pembahasan"
            value={pembahasan}
            onChange={(e) => setPembahasan(e.target.value)}
            placeholder="Jelaskan langkah menuju jawaban benar."
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? "Menyimpan…" : awal.id ? "Simpan perubahan" : "Simpan soal"}
          </button>
          <Link className="btn btn-ghost" href={`/admin/paket/${awal.package_id}/soal?subtes=${subtes}`}>
            Kembali ke daftar soal
          </Link>
        </div>
      </div>

      {/* ------------------------------ PRATINJAU ------------------------------ */}
      <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold">Pratinjau siswa</h2>
          <span className="text-xs text-muted">Diperbarui langsung</span>
        </div>

        {peringatan.length > 0 && (
          <div className="rounded-xl bg-warning-soft px-4 py-3 text-xs text-warning">
            <p className="mb-1 font-bold">Perlu dilengkapi:</p>
            <ul className="list-disc space-y-0.5 pl-4">
              {peringatan.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        <PratinjauSoal
          data={{
            subtes,
            nomor: Number.parseInt(nomor, 10) || 0,
            tipe,
            level,
            stimulus,
            pertanyaan,
            gambar_url: gambar,
            opsi,
            kunciHuruf,
            kunciTeks,
            kunciBS,
            pembahasan,
          }}
        />

        <p className="text-xs text-muted">
          Blok hijau menandai kunci jawaban dan hanya terlihat oleh admin.
        </p>
      </aside>
    </form>
  );
}
