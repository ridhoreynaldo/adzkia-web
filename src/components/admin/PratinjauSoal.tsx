import { LABEL_OPSI, namaSubtes, type TipeSoal } from "@/lib/tryout/snbt";
import { TeksSoal } from "@/components/TeksSoal";

export interface DataPratinjau {
  subtes: string;
  nomor: number;
  tipe: TipeSoal;
  level: string;
  stimulus: string;
  pertanyaan: string;
  gambar_url: string;
  opsi: string[];
  /** Huruf kunci untuk PG/PGK. */
  kunciHuruf: string[];
  /** Teks kunci untuk tipe IS. */
  kunciTeks: string;
  /** Kunci per pernyataan untuk tipe BS, mis. ["B","S","B"]. */
  kunciBS?: string[];
  pembahasan: string;
}

/**
 * Pratinjau butir soal — tampilannya dibuat semirip mungkin dengan layar siswa,
 * ditambah penanda kunci jawaban khusus untuk admin.
 */
export function PratinjauSoal({
  data,
  tampilKunci = true,
}: {
  data: DataPratinjau;
  tampilKunci?: boolean;
}) {
  const opsiTampil = data.tipe === "IS" ? [] : data.opsi;
  const adaOpsi = opsiTampil.some((o) => o.trim() !== "");
  const gambar = data.gambar_url.trim();
  // Naskah soal yang pilihan jawabannya tercetak DI DALAM gambar — kolom opsi
  // memang sengaja kosong. Aturannya disalin persis dari KartuSoal agar
  // pratinjau tidak pernah menuduh butir semacam ini "belum diisi".
  const pilihanDiGambar = !!gambar && opsiTampil.length > 0 && opsiTampil.every((o) => !o.trim());

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-muted px-4 py-2.5 text-xs font-semibold">
        <span className="text-brand">{namaSubtes(data.subtes)}</span>
        <span className="text-muted">·</span>
        <span>Soal nomor {data.nomor || "—"}</span>
        <span className="ml-auto rounded-full bg-surface px-2 py-0.5 text-muted">
          {data.tipe} · {data.level}
        </span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {data.stimulus.trim() && (
          <div className="rounded-xl border border-line bg-surface-muted/60 p-4 text-sm">
            <TeksSoal html={data.stimulus} />
          </div>
        )}

        <div className="text-[0.95rem] font-medium">
          {data.pertanyaan.trim() ? (
            <TeksSoal html={data.pertanyaan} />
          ) : (
            <span className="text-muted italic">Pertanyaan belum diisi…</span>
          )}
        </div>

        {/* Gambar diletakkan SESUDAH pertanyaan, sama seperti di ruang ujian:
            peserta membaca perintahnya dulu, baru melihat gambarnya. Alasnya
            dibuat putih supaya gambar berlatar transparan tetap terbaca saat
            panel admin sedang bertema gelap. */}
        {gambar && (
          <figure className="overflow-hidden rounded-xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gambar}
              alt={`Gambar pendukung soal nomor ${data.nomor}`}
              className="mx-auto max-h-[26rem] w-auto max-w-full bg-white object-contain"
            />
            <figcaption className="border-t border-line bg-surface-muted px-3 py-1.5 text-center text-[11px] font-semibold text-muted">
              Di ruang ujian gambar ini bisa diketuk peserta untuk diperbesar
            </figcaption>
          </figure>
        )}

        {data.tipe === "BS" ? (
          <ul className="space-y-2">
            {opsiTampil.map((teks, i) => {
              if (!teks.trim()) return null;
              const k = (data.kunciBS ?? [])[i];
              return (
                <li
                  key={`bs-${i}`}
                  className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 text-sm sm:flex-row sm:items-start sm:justify-between"
                >
                  <span className="flex min-w-0 gap-2">
                    <span className="font-bold text-brand">{i + 1}.</span>
                    <TeksSoal as="span" html={teks} />
                  </span>
                  <span className="flex shrink-0 gap-1.5">
                    {(["B", "S"] as const).map((v) => (
                      <span
                        key={v}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                          tampilKunci && k === v
                            ? v === "B"
                              ? "bg-success text-white"
                              : "bg-danger text-white"
                            : "bg-surface-muted text-muted"
                        }`}
                      >
                        {v === "B" ? "Benar" : "Salah"}
                      </span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : data.tipe === "IS" ? (
          <div>
            <div className="input max-w-sm bg-surface-muted text-muted">Ketik jawaban singkat…</div>
            {tampilKunci && (
              <p className="mt-2 text-xs">
                <span className="font-semibold text-success">Kunci:</span>{" "}
                <span className="font-mono">{data.kunciTeks.trim() || "—"}</span>
              </p>
            )}
          </div>
        ) : adaOpsi ? (
          <ul className="space-y-2">
            {opsiTampil.map((teks, i) => {
              const huruf = LABEL_OPSI[i];
              if (!teks.trim()) return null;
              const benar = tampilKunci && data.kunciHuruf.includes(huruf);
              return (
                <li
                  key={huruf}
                  className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${
                    benar ? "border-success bg-success-soft" : "border-line bg-surface"
                  }`}
                >
                  <span
                    className={`grid size-7 shrink-0 place-items-center text-xs font-bold ${
                      data.tipe === "PGK" ? "rounded-md" : "rounded-full"
                    } ${benar ? "bg-success text-white" : "bg-surface-muted text-muted"}`}
                  >
                    {huruf}
                  </span>
                  <TeksSoal as="span" html={teks} />
                </li>
              );
            })}
          </ul>
        ) : pilihanDiGambar ? (
          <div>
            <p className="mb-2 text-xs font-semibold text-muted">
              Pilihan jawaban tercetak di dalam gambar. Peserta hanya menekan hurufnya.
            </p>
            <div className="flex flex-wrap gap-2">
              {opsiTampil.map((_, i) => {
                const huruf = LABEL_OPSI[i] ?? String(i + 1);
                const benar = tampilKunci && data.kunciHuruf.includes(huruf);
                return (
                  <span
                    key={`g-${huruf}`}
                    className={`grid size-11 place-items-center rounded-xl border text-base font-extrabold ${
                      benar
                        ? "border-success bg-success text-white"
                        : "border-line bg-surface text-muted"
                    }`}
                  >
                    {huruf}
                  </span>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted italic">Opsi jawaban belum diisi…</p>
        )}

        {data.tipe === "PGK" && (
          <p className="text-xs text-muted">
            Tipe PGK: siswa boleh memilih lebih dari satu jawaban.
          </p>
        )}

        {tampilKunci && data.pembahasan.trim() && (
          <div className="rounded-xl border border-line bg-brand-soft/50 p-4 text-sm">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brand">Pembahasan</p>
            <TeksSoal html={data.pembahasan} />
          </div>
        )}
      </div>
    </div>
  );
}
