"use client";

import { useActionState, useRef, useState } from "react";

import { imporNaskahIeltsAction, type ImporIeltsState } from "@/app/admin/ielts/actions";
import { TabelScroll, TD, TH } from "@/components/admin/AdminUI";
import { Alert, Badge } from "@/components/ui";
import { LABEL_TIPE, type SubtesIeltsKode } from "@/lib/ielts/ielts-konstanta";

/**
 * Pengunggah naskah IELTS: baca dulu, lihat pratinjaunya, baru simpan.
 *
 * Dua langkah, bukan satu, dan sengaja: naskah yang datang dari guru hampir
 * tidak pernah rapi pada unggahan pertama — nomor melompat, kunci tertinggal,
 * pilihan cuma tiga. Menyimpan langsung berarti pengelola baru tahu ada yang
 * salah sesudah bank soalnya kotor.
 */
const MODE_IMPOR = [
  {
    nilai: "lanjut",
    judul: "Tambahkan sebagai lanjutan",
    ket:
      "Nomor di berkas diabaikan; tiap butir mengisi nomor kosong terkecil di subtes ini. " +
      "Pakai ini untuk mengunggah satu subtes bertahap — Recording 1 dan 2 dulu, sisanya menyusul. " +
      "Butir yang pertanyaannya sudah ada otomatis dilewati, jadi berkas yang terunggah dua kali tidak menggandakan soal.",
  },
  {
    nilai: "berkas",
    judul: "Ikuti nomor di berkas",
    ket: "Nomor diambil apa adanya. Nomor yang sudah terpakai ditandai galat dan tidak disimpan.",
  },
  {
    nilai: "timpa",
    judul: "Ikuti nomor berkas & timpa",
    ket: "Sama seperti di atas, tetapi butir lama dengan nomor yang sama ditulis ulang. Untuk membetulkan naskah yang telanjur masuk.",
  },
] as const;

function ringkas(teks: string, panjang = 90): string {
  const v = (teks ?? "").replace(/\s+/g, " ").trim();
  if (!v) return "—";
  return v.length > panjang ? `${v.slice(0, panjang)}…` : v;
}

export function ImporIeltsForm({
  paketId,
  subtes,
  namaSubtes,
  labelSeksi,
}: {
  paketId: number;
  subtes: SubtesIeltsKode;
  namaSubtes: string;
  labelSeksi: string;
}) {
  const [state, action, pending] = useActionState<ImporIeltsState, FormData>(
    imporNaskahIeltsAction,
    {},
  );
  const [berkas, setBerkas] = useState<File | null>(null);
  const [mode, setMode] = useState<string>(state.mode ?? "lanjut");
  const [buka, setBuka] = useState(false);
  const kotakBerkas = useRef<HTMLInputElement>(null);

  const hasil = state.hasil;
  const bisaSimpan = !!hasil && !state.selesai && hasil.jumlahLayak > 0;

  /**
   * Mengembalikan berkas ke kotaknya sebelum formulir dikirim lagi.
   *
   * React 19 MENGOSONGKAN formulir setiap kali sebuah Server Action selesai —
   * termasuk kotak berkasnya. Tanpa langkah ini, menekan "Simpan" sesudah
   * membaca pratinjau akan dijawab "Pilih dulu berkas naskah", padahal
   * pengelola merasa berkasnya masih terpilih (namanya memang masih tertulis
   * di layar). Berkasnya sendiri tetap dipegang komponen ini sejak dipilih,
   * jadi yang perlu dilakukan hanya memasangnya kembali.
   */
  const pasangUlangBerkas = () => {
    const kotak = kotakBerkas.current;
    if (!kotak || !berkas || kotak.files?.length) return;
    const bawa = new DataTransfer();
    bawa.items.add(berkas);
    kotak.files = bawa.files;
  };

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="paketId" value={paketId} />
      <input type="hidden" name="subtes" value={subtes} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="naskah">
            Naskah {namaSubtes} (.docx, .pdf, atau .txt)
          </label>
          <input
            className="input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand"
            id="naskah"
            name="naskah"
            type="file"
            accept=".docx,.pdf,.txt,.md"
            ref={kotakBerkas}
            onChange={(e) => setBerkas(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs text-muted">
            {berkas
              ? `Terpilih: ${berkas.name} (${Math.max(1, Math.round(berkas.size / 1024))} KB)`
              : "Satu berkas untuk satu subtes. PDF harus PDF asli (bukan hasil pindaian/foto)."}
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="label">Penomoran butir</legend>
          {MODE_IMPOR.map((m) => (
            <label
              key={m.nilai}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs transition ${
                mode === m.nilai ? "border-brand bg-brand-soft" : "border-line"
              }`}
            >
              <input
                type="radio"
                name="mode"
                value={m.nilai}
                checked={mode === m.nilai}
                onChange={(e) => setMode(e.target.value)}
                className="mt-0.5 size-4 accent-[var(--brand)]"
              />
              <span>
                <span className="font-semibold">{m.judul}</span>
                <span className="block text-muted">{m.ket}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="btn btn-primary"
          type="submit"
          disabled={pending || !berkas}
          onClick={pasangUlangBerkas}
        >
          {pending ? "Membaca…" : "Baca & pratinjau"}
        </button>
        {bisaSimpan && (
          <button
            className="btn btn-primary !bg-success"
            type="submit"
            name="konfirmasi"
            value="1"
            disabled={pending}
            onClick={pasangUlangBerkas}
          >
            Simpan {hasil.jumlahLayak} butir ke {namaSubtes}
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost text-xs"
          onClick={() => setBuka((v) => !v)}
        >
          {buka ? "Sembunyikan aturan penulisan" : "Aturan penulisan naskah"}
        </button>
      </div>

      {buka && <PanduanNaskah labelSeksi={labelSeksi} />}

      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.pesan && !state.error && (
        <Alert tone={state.selesai ? "success" : "brand"}>{state.pesan}</Alert>
      )}

      {(hasil?.catatan.length ?? 0) > 0 && (
        <Alert tone="warning">
          <p className="font-semibold">Perlu kamu periksa sendiri</p>
          <ul className="mt-1.5 space-y-1 text-xs">
            {hasil?.catatan.slice(0, 10).map((c, i) => (
              <li key={i}>&bull; {c}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* ---------- Bagian yang ikut terbaca ---------- */}
      {hasil && !state.selesai && hasil.seksi.length > 0 && (
        <div className="rounded-xl border border-line p-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted">
            Bagian yang ikut diperbarui
          </h3>
          <ul className="mt-2 space-y-1.5 text-xs">
            {hasil.seksi.map((s) => (
              <li key={s.nomor}>
                <span className="font-semibold">
                  {labelSeksi} {s.nomor}
                  {s.judul ? `: ${s.judul}` : ""}
                </span>
                <span className="ml-2 text-muted">
                  {[
                    s.instruksi && "instruksi",
                    s.bacaan && `bacaan ${s.bacaan.split(/\s+/).length} kata`,
                    s.transkrip && `transkrip ${s.transkrip.split(/\s+/).length} kata`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "hanya judul"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------- Pratinjau butir ---------- */}
      {hasil && !state.selesai && hasil.butir.length > 0 && (
        <TabelScroll>
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-line">
                <th className={TH}>No</th>
                <th className={TH}>Bentuk</th>
                <th className={TH}>Pertanyaan</th>
                <th className={TH}>Kunci</th>
                <th className={TH}>Keadaan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {hasil.butir.map((b, i) => (
                <tr
                  key={i}
                  className={b.galat ? "bg-danger-soft/40" : b.kembar ? "opacity-60" : undefined}
                >
                  <td className={`${TD} whitespace-nowrap font-semibold tabular-nums`}>
                    {b.nomorSimpan}
                    {b.nomorSimpan !== b.nomor && (
                      <span className="ml-1 text-[11px] font-normal text-muted">
                        (berkas: {b.nomor})
                      </span>
                    )}
                  </td>
                  <td className={TD}>
                    <Badge tone="muted">{LABEL_TIPE[b.tipe]}</Badge>
                  </td>
                  <td className={`${TD} max-w-lg`}>
                    <p className="text-sm">{ringkas(b.pertanyaan)}</p>
                    {b.opsi.length > 0 && (
                      <p className="mt-1 text-[11px] text-muted">
                        {b.opsi.map((o, j) => `${"ABCD"[j]}. ${ringkas(o, 28)}`).join("  ")}
                      </p>
                    )}
                  </td>
                  <td className={`${TD} text-xs font-semibold`}>
                    {b.tipe === "ESAI" ? <span className="text-muted">dinilai guru</span> : b.kunci}
                  </td>
                  <td className={`${TD} text-xs`}>
                    {b.galat ? (
                      <span className="font-semibold text-danger">{b.galat}</span>
                    ) : b.kembar ? (
                      <span className="text-muted">Sudah ada — dilewati</span>
                    ) : (
                      <Badge tone="success">Layak</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabelScroll>
      )}
    </form>
  );
}

/**
 * Aturan penulisan naskah, ditulis untuk guru — bukan untuk pemrogram.
 *
 * Sengaja tinggal di dalam halaman impornya, bukan di dokumen terpisah: yang
 * membutuhkannya sedang berdiri tepat di depan tombol unggah.
 */
function PanduanNaskah({ labelSeksi }: { labelSeksi: string }) {
  return (
    <div className="rounded-xl bg-surface-muted p-5 text-xs leading-relaxed">
      <p className="font-extrabold">Cara menulis naskahnya di Word</p>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5">
        <li>
          Tandai tiap bagian dengan barisnya sendiri:{" "}
          <code className="rounded bg-surface px-1">{labelSeksi.toUpperCase()} 1: judulnya</code>.
          Bisa juga ditulis SECTION, PASSAGE, RECORDING, TASK, atau PART.
        </li>
        <li>
          Petunjuk untuk siswa ditulis{" "}
          <code className="rounded bg-surface px-1">INSTRUCTION: Questions 1-10 …</code>
        </li>
        <li>
          Teks bacaan diawali baris <code className="rounded bg-surface px-1">PASSAGE:</code>, dan
          naskah rekaman diawali <code className="rounded bg-surface px-1">TRANSCRIPT:</code> —
          transkrip tidak pernah ditampilkan kepada siswa.
        </li>
        <li>
          Tiap soal dimulai dengan nomornya di awal baris:{" "}
          <code className="rounded bg-surface px-1">7. The museum opened in ……… .</code>
        </li>
        <li>
          Pilihan ganda ditulis empat baris <code className="rounded bg-surface px-1">A.</code>{" "}
          sampai <code className="rounded bg-surface px-1">D.</code> (IELTS tidak memakai E).
        </li>
        <li>
          Kuncinya <code className="rounded bg-surface px-1">ANSWER: C</code> tepat di bawah
          soalnya, atau semuanya dikumpulkan di akhir berkas di bawah judul{" "}
          <code className="rounded bg-surface px-1">ANSWER KEY</code>.
        </li>
        <li>
          Isian singkat boleh punya beberapa jawaban sah, dipisah garis tegak:{" "}
          <code className="rounded bg-surface px-1">ANSWER: coach|bus</code>. Huruf besar-kecil
          tidak dihitung, ejaan tetap dihitung.
        </li>
      </ol>
      <p className="mt-3 text-muted">
        Bentuk butir tidak perlu ditulis: ada pilihan A–D berarti pilihan ganda, kuncinya
        TRUE/FALSE/NOT GIVEN berarti soal True-False-Not Given, Writing/Speaking tanpa kunci berarti
        karangan, sisanya isian singkat. Kalau perlu memaksa, tambahkan baris{" "}
        <code className="rounded bg-surface px-1">TYPE: essay</code>.
      </p>
    </div>
  );
}
