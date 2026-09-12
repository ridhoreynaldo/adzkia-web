import Link from "next/link";
import { notFound } from "next/navigation";

import { BarKelengkapan, PesanFlash, TabelScroll, TD, TH } from "@/components/admin/AdminUI";
import { TombolKonfirmasi } from "@/components/admin/TombolKonfirmasi";
import { IkonPembahasan } from "@/components/language/IkonIelts";
import { Badge, PageHeader } from "@/components/ui";
import { keInputDatetime } from "@/lib/admin/admin";
import { wajibFiturLanguage } from "@/lib/ielts/language";
import {
  KODE_SUBTES_IELTS,
  LABEL_STATUS_IELTS,
  MENIT_MAKS,
  MENIT_MIN,
  PRESET_MENIT,
  RENTANG_ACAK,
  STATUS_PAKET_IELTS,
  paketById,
  pengerjaanPaket,
  ringkasPaket,
  subtesIelts,
} from "@/lib/ielts/ielts";

import {
  hitungUlangIeltsAction,
  setMenitIeltsAction,
  setPembahasanIeltsAction,
  setStatusPaketIeltsAction,
  ubahPaketIeltsAction,
} from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await paketById(Number(id));
  return { title: p ? `${p.nama} — IELTS` : "Paket IELTS" };
}

/**
 * Satu paket IELTS: keterangan, jendela waktu, status terbit, dan kelengkapan
 * keempat subtesnya.
 *
 * Isi soalnya tidak diurus di sini — tiap subtes punya halamannya sendiri,
 * karena bagian, rekaman, dan butirnya terlalu banyak untuk satu layar.
 */
export default async function PaketIeltsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pesan?: string; galat?: string }>;
}) {
  await wajibFiturLanguage();
  const { id } = await params;
  const { pesan, galat } = await searchParams;

  const paket = await paketById(Number(id));
  if (!paket) notFound();

  const ringkas = await ringkasPaket(paket.id);
  const pekerjaan = await pengerjaanPaket(paket.id);
  const semuaSiap = ringkas.every((r) => r.siap);
  const pakaiBawaan =
    paket.menit_listening === null &&
    paket.menit_reading === null &&
    paket.menit_writing === null &&
    paket.menit_speaking === null;

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href="/admin/ielts" className="font-semibold text-muted hover:text-brand">
          ← Semua paket IELTS
        </Link>
      </p>

      <PageHeader
        title={paket.nama}
        subtitle={`${paket.kode}${paket.deskripsi ? ` · ${paket.deskripsi}` : ""}`}
        action={
          <Badge
            tone={
              paket.status === "published"
                ? "success"
                : paket.status === "closed"
                  ? "danger"
                  : "warning"
            }
          >
            {LABEL_STATUS_IELTS[paket.status]}
          </Badge>
        }
      />

      <PesanFlash pesan={pesan} galat={galat} />

      {/* ---------- Alat paket ----------
          Sederet tautan yang sepadan dengan portal tryout: memeriksa soal,
          menjalani ujiannya, membaca papan band, mengunduh hasil, dan
          memeriksa ulang. Diletakkan PALING ATAS karena inilah yang dicari
          pengelola berulang kali menjelang hari-H — bukan formulir di bawah,
          yang hanya disentuh sekali saat paketnya dibuat. */}
      <section className="card mb-6 flex flex-wrap items-center gap-2 p-4">
        <Link className="btn btn-ghost text-sm" href={`/admin/ielts/${paket.id}/pratinjau`}>
          Pratinjau soal
        </Link>
        <Link className="btn btn-ghost text-sm" href={`/admin/ielts/${paket.id}/simulasi`}>
          Pratinjau ujian
        </Link>
        <Link className="btn btn-ghost text-sm" href={`/admin/ielts/${paket.id}/peringkat`}>
          Peringkat skor band
        </Link>
        <a
          className="btn btn-ghost text-sm"
          href={`/api/admin/ielts/hasil/${paket.id}`}
          download
        >
          Unduh hasil .xlsx
        </a>
        <form action={hitungUlangIeltsAction} className="ml-auto">
          <input type="hidden" name="id" value={paket.id} />
          <input type="hidden" name="dari" value={`/admin/ielts/${paket.id}`} />
          <TombolKonfirmasi
            className="btn btn-ghost text-sm"
            pesan={`Periksa ulang seluruh pengerjaan paket ${paket.kode}? Subtes yang waktunya sudah habis akan ditutup, dan pengerjaan yang sudah tuntas ditandai selesai.`}
          >
            Hitung ulang nilai
          </TombolKonfirmasi>
        </form>
      </section>

      {/* ---------- Empat subtes ---------- */}
      <section className="grid gap-4 sm:grid-cols-2">
        {ringkas.map((s) => (
          <Link
            key={s.kode}
            href={`/admin/ielts/${paket.id}/${s.kode.toLowerCase()}`}
            className="card block p-5 transition-colors hover:bg-surface-muted"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight">{s.nama}</h2>
                <p className="text-xs text-muted">
                  {s.menit} menit · {s.jumlahSeksi} bagian
                  {s.pakaiAudio ? " berekaman" : ""}
                </p>
                <p className="mt-1 text-xs font-semibold text-brand">Kelola soal →</p>
              </div>
              {s.siap ? <Badge tone="success">Siap</Badge> : <Badge tone="warning">Belum</Badge>}
            </div>

            <div className="mt-4 space-y-2">
              <BarKelengkapan terisi={s.terisi} target={s.target} />
              {s.pakaiAudio && (
                <p className="text-xs text-muted">
                  🎧 Rekaman terpasang: {s.audioTerisi} dari {s.jumlahSeksi}
                </p>
              )}
            </div>
          </Link>
        ))}
      </section>

      {/* ---------- Status terbit ---------- */}
      <section className="card mt-6 p-5">
        <h2 className="text-sm font-extrabold tracking-tight">Status paket</h2>
        <p className="mt-1 text-sm text-muted">
          {semuaSiap
            ? "Seluruh subtes lengkap. Paket boleh diterbitkan."
            : "Masih ada subtes yang soal atau rekamannya belum lengkap. Paket tetap boleh diterbitkan, tetapi subtes yang kosong tidak akan bisa dibuka siswa."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {STATUS_PAKET_IELTS.map((s) => (
            <form key={s} action={setStatusPaketIeltsAction}>
              <input type="hidden" name="id" value={paket.id} />
              <input type="hidden" name="status" value={s} />
              <button
                type="submit"
                disabled={paket.status === s}
                className={`btn ${s === "published" ? "btn-primary" : "btn-ghost"} disabled:opacity-40`}
              >
                {LABEL_STATUS_IELTS[s]}
              </button>
            </form>
          ))}
        </div>
      </section>

      {/* ---------- Lembar pembahasan ---------- */}
      <section className="card mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-extrabold tracking-tight">
              <IkonPembahasan className="h-4 w-4 text-brand" />
              Lembar pembahasan
              {paket.tampil_pembahasan === 1 ? (
                <Badge tone="success">DIBUKA</Badge>
              ) : (
                <Badge tone="muted">DITAHAN</Badge>
              )}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Tuas yang sama dengan portal tryout. Saat dibuka, siswa bisa membaca jawabannya
              sendiri, kunci resminya, dan penjelasan pengajar — <strong>hanya</strong> untuk subtes
              yang sudah ditutup, jadi kunci Reading tidak pernah terbuka selagi Reading masih
              berjalan. Naskah rekaman Listening dan bacaan Reading ikut terbuka di sana.
            </p>
          </div>

          <form action={setPembahasanIeltsAction}>
            <input type="hidden" name="id" value={paket.id} />
            <input type="hidden" name="tampil" value={paket.tampil_pembahasan === 1 ? "0" : "1"} />
            <button
              type="submit"
              className={`btn ${paket.tampil_pembahasan === 1 ? "btn-ghost" : "btn-primary"}`}
            >
              {paket.tampil_pembahasan === 1 ? "Tahan pembahasan" : "Buka pembahasan"}
            </button>
          </form>
        </div>
      </section>

      {/* ---------- Pekerjaan siswa & penilaian guru ---------- */}
      <section className="card mt-6 p-6">
        <h2 className="text-sm font-extrabold tracking-tight">
          Pekerjaan siswa &amp; penilaian Writing / Speaking
        </h2>
        <p className="mt-1 text-sm text-muted">
          Listening dan Reading dinilai mesin. Writing dan Speaking menunggu guru: bukalah satu
          nama untuk membaca jawabannya sambil mengisi empat kriteria IELTS.
        </p>

        {pekerjaan.length === 0 ? (
          <p className="mt-5 rounded-xl bg-surface-muted px-4 py-6 text-center text-sm text-muted">
            Belum ada siswa yang mengerjakan paket ini.
          </p>
        ) : (
          <TabelScroll>
            <table className="mt-4 min-w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className={TH}>Nama</th>
                  <th className={TH}>Kelas</th>
                  <th className={TH}>Mulai</th>
                  <th className={TH}>Keadaan</th>
                  <th className={TH}>Penilaian guru</th>
                  <th className={TH} />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pekerjaan.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-muted/60">
                    <td className={`${TD} font-semibold`}>
                      {r.nama}
                      {r.nisn && <span className="block text-xs text-muted">{r.nisn}</span>}
                    </td>
                    <td className={`${TD} text-sm`}>{r.kelas ?? "—"}</td>
                    <td className={`${TD} text-xs text-muted`}>{r.started_at}</td>
                    <td className={TD}>
                      <Badge tone={r.status === "finished" ? "success" : "warning"}>
                        {r.status === "finished" ? "Selesai" : "Berjalan"}
                      </Badge>
                    </td>
                    <td className={`${TD} text-xs`}>
                      {r.dinilai + r.perluDinilai === 0 ? (
                        <span className="text-muted">tidak perlu</span>
                      ) : r.perluDinilai === 0 ? (
                        <span className="font-semibold text-success">lengkap</span>
                      ) : (
                        <span className="font-semibold text-danger">
                          {r.perluDinilai} bagian menunggu
                        </span>
                      )}
                    </td>
                    <td className={TD}>
                      <Link
                        href={`/admin/ielts/nilai/${r.id}`}
                        className="btn btn-ghost !px-3 !py-1.5 text-xs"
                      >
                        Nilai
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabelScroll>
        )}
      </section>

      {/* ---------- Lama pengerjaan ---------- */}
      <section className="card mt-6 p-6">
        <h2 className="text-sm font-extrabold tracking-tight">Lama pengerjaan tiap subtes</h2>
        <p className="mt-1 text-sm text-muted">
          Berlaku untuk paket ini saja. Waktu dihitung server dan dipatok sekali saat siswa membuka
          subtesnya — mengubah angka di sini tidak menggeser tenggat siswa yang subtesnya sudah
          berjalan.
          {pakaiBawaan && " Sekarang paket ini masih memakai waktu bawaan aplikasi."}
        </p>

        {/* Diketik sendiri */}
        <form action={setMenitIeltsAction} className="mt-5">
          <input type="hidden" name="id" value={paket.id} />
          <input type="hidden" name="cara" value="manual" />
          <div className="grid gap-4 sm:grid-cols-4">
            {ringkas.map((s) => (
              <div key={s.kode}>
                <label className="label" htmlFor={`menit_${s.kode}`}>
                  {s.nama}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    className="input tabular-nums"
                    id={`menit_${s.kode}`}
                    name={`menit_${s.kode}`}
                    type="number"
                    min={MENIT_MIN}
                    max={MENIT_MAKS}
                    defaultValue={s.menit}
                    required
                  />
                  <span className="text-xs font-semibold text-muted">menit</span>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary mt-4" type="submit">
            Simpan waktu
          </button>
        </form>

        {/* Susunan siap pakai + acak */}
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-muted">
            Susunan siap pakai
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESET_MENIT.map((p) => (
              <form key={p.kode} action={setMenitIeltsAction}>
                <input type="hidden" name="id" value={paket.id} />
                <input type="hidden" name="cara" value="preset" />
                <input type="hidden" name="preset" value={p.kode} />
                <button className="btn btn-ghost text-xs" type="submit" title={p.ket}>
                  {p.nama} ·{" "}
                  {KODE_SUBTES_IELTS.map((k) => p.menit[k]).join(" / ")}
                </button>
              </form>
            ))}
            <form action={setMenitIeltsAction}>
              <input type="hidden" name="id" value={paket.id} />
              <input type="hidden" name="cara" value="acak" />
              <button
                className="btn btn-ghost text-xs"
                type="submit"
                title="Mengundi waktu tiap subtes dalam rentang yang masuk akal, kelipatan lima menit."
              >
                🎲 Acak waktunya
              </button>
            </form>
            <form action={setMenitIeltsAction}>
              <input type="hidden" name="id" value={paket.id} />
              <input type="hidden" name="cara" value="bawaan" />
              <button className="btn btn-ghost text-xs" type="submit">
                Kembalikan ke bawaan
              </button>
            </form>
          </div>
          <p className="mt-3 text-xs text-muted">
            Urutan angkanya {KODE_SUBTES_IELTS.map((k) => subtesIelts(k)?.nama).join(" / ")}.
            Rentang acak:{" "}
            {KODE_SUBTES_IELTS.map(
              (k) => `${subtesIelts(k)?.nama} ${RENTANG_ACAK[k][0]}–${RENTANG_ACAK[k][1]}`,
            ).join(", ")}{" "}
            menit.
          </p>
        </div>
      </section>

      {/* ---------- Keterangan & jendela ---------- */}
      <section className="card mt-6 p-6">
        <h2 className="text-sm font-extrabold tracking-tight">Keterangan &amp; jendela waktu</h2>
        <p className="mt-1 text-sm text-muted">
          Jendela yang dikosongkan berarti tanpa batas — paket terbit langsung bisa dikerjakan.
        </p>

        <form action={ubahPaketIeltsAction} className="mt-5 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={paket.id} />
          <div>
            <label className="label" htmlFor="nama">
              Nama Paket
            </label>
            <input className="input" id="nama" name="nama" defaultValue={paket.nama} required />
          </div>
          <div>
            <label className="label" htmlFor="deskripsi">
              Keterangan
            </label>
            <input
              className="input"
              id="deskripsi"
              name="deskripsi"
              defaultValue={paket.deskripsi ?? ""}
            />
          </div>
          <div>
            <label className="label" htmlFor="mulai_at">
              Dibuka
            </label>
            <input
              className="input"
              id="mulai_at"
              name="mulai_at"
              type="datetime-local"
              defaultValue={keInputDatetime(paket.mulai_at)}
            />
          </div>
          <div>
            <label className="label" htmlFor="selesai_at">
              Ditutup
            </label>
            <input
              className="input"
              id="selesai_at"
              name="selesai_at"
              type="datetime-local"
              defaultValue={keInputDatetime(paket.selesai_at)}
            />
          </div>
          <div className="sm:col-span-2">
            <button className="btn btn-primary" type="submit">
              Simpan
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
