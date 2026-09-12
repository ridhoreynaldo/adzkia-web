import Link from "next/link";

import { PesanFlash, TabelScroll, TD, TH } from "@/components/admin/AdminUI";
import { TombolKonfirmasi } from "@/components/admin/TombolKonfirmasi";
import {
  beriSusulanAction,
  bukaBlokirAction,
  bukaBlokirSemuaAction,
  bukaSusulanSemuaGugurAction,
  tutupTerbengkalaiAction,
} from "@/app/admin/actions";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import {
  type ParamsQuery,
  daftarPaket,
  pesertaGugur,
  satuParam,
  tanggalIndo,
  ujianTerbengkalai,
} from "@/lib/admin/admin";
import {
  formatDurasi,
  labelJenis,
  labelSubtes,
  rekapPelanggaran,
  rincianPelanggaran,
  tingkatKerawanan,
} from "@/lib/penjagaan/pelanggaran";
import { requireAdmin } from "@/lib/auth/auth";
import { identitasPeserta } from "@/lib/core/tampilan";

export const metadata = { title: "Keamanan Ujian" };
export const dynamic = "force-dynamic";

const WARNA_TINGKAT = {
  aman: "bg-surface-muted text-muted",
  waspada: "bg-warning-soft text-warning",
  berat: "bg-danger-soft text-danger",
} as const;

const LABEL_TINGKAT = { aman: "Ringan", waspada: "Waspada", berat: "Berat" } as const;

export default async function PelanggaranPage({
  searchParams,
}: {
  searchParams: Promise<ParamsQuery>;
}) {
  // Penjaga ditulis di sini, bukan dititipkan ke tata letak panel: sejak ada
  // pengelola berlingkup IELTS, tata letak memakai penjaga yang MENERIMA
  // mereka. Catatan pelanggaran UTBK bukan urusan mereka.
  await requireAdmin();
  const sp = await searchParams;
  const paketList = await daftarPaket();
  const dipilih = Number(satuParam(sp.paket)) || paketList[0]?.id || 0;
  const paket = paketList.find((p) => p.id === dipilih);

  const rekap = paket ? await rekapPelanggaran(paket.id) : [];
  const gugur = paket ? await pesertaGugur(paket.id) : [];
  const belumDapatIzin = gugur.filter((g) => !g.sudah_izin).length;
  // Semua yang berstatus gugur bisa dibuka blokirnya; jumlahnya sama dengan
  // panjang daftar, tetapi dinamai sendiri supaya maksudnya terbaca di JSX.
  const terblokir = gugur.length;
  const rincian = paket ? await rincianPelanggaran(paket.id) : [];
  // Pengerjaan yang waktunya habis tetapi tidak pernah tertutup — peserta
  // menutup peramban sebelum subtes terakhir selesai, sehingga tidak ada lagi
  // yang memanggil penutupnya. Tanpa daftar ini mereka tidak terlihat siapa pun.
  const terbengkalai = paket ? await ujianTerbengkalai(paket.id) : [];

  const totalKejadian = rincian.length;
  const totalDetik = rincian.reduce((a, v) => a + (v.durasi_detik ?? 0), 0);
  const pesertaBerat = rekap.filter((r) => r.jumlah >= 5).length;

  return (
    <>
      <PageHeader
        title="Keamanan Ujian"
        subtitle="Catatan peserta yang meninggalkan halaman ujian, keluar dari layar penuh, atau mencoba menyalin soal saat timer berjalan."
        action={
          paket && totalKejadian > 0 ? (
            <a className="btn btn-primary" href={`/api/admin/pelanggaran/${paket.id}`} download>
              Unduh Laporan Excel
            </a>
          ) : undefined
        }
      />

      <PesanFlash pesan={satuParam(sp.pesan)} galat={satuParam(sp.galat)} />

      {paketList.length === 0 ? (
        <EmptyState
          title="Belum ada paket tryout"
          description="Buat paket tryout lebih dulu, lalu catatan keamanan akan muncul di sini."
          action={
            <Link href="/admin/paket/baru" className="btn btn-primary">
              Buat paket
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {paketList.map((p) => (
              <Link
                key={p.id}
                href={`/admin/pelanggaran?paket=${p.id}`}
                className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${
                  p.id === dipilih
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line bg-surface text-muted hover:text-foreground"
                }`}
              >
                {p.kode}
              </Link>
            ))}
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Peserta Melanggar</p>
              <p className="mt-1 text-3xl font-extrabold">{rekap.length}</p>
              <p className="mt-1 text-xs text-muted">peserta pada paket ini</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Total Kejadian</p>
              <p className="mt-1 text-3xl font-extrabold">{totalKejadian}</p>
              <p className="mt-1 text-xs text-muted">akumulasi keluar {formatDurasi(totalDetik)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Kategori Berat</p>
              <p className={`mt-1 text-3xl font-extrabold ${pesertaBerat > 0 ? "text-danger" : ""}`}>
                {pesertaBerat}
              </p>
              <p className="mt-1 text-xs text-muted">peserta dengan 5+ pelanggaran</p>
            </div>
          </div>

          {/* --------- Pengerjaan yang waktunya habis tapi tak pernah tertutup --------- */}
          {terbengkalai.length > 0 && (
            <div className="card mb-6 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold tracking-tight">
                    Pengerjaan terbengkalai ({terbengkalai.length})
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
                    Tidak ada satu pun timer subtes yang masih berjalan, dan tidak ada lagi yang
                    bisa peserta lanjutkan — jendela paketnya sudah tutup, atau semua subtesnya
                    sudah pernah dibuka. Statusnya tetap <strong>berjalan</strong> karena penutupan
                    ujian hanya terjadi saat peserta membuka halamannya, dan ia tidak pernah
                    kembali. Selama begini nilainya tidak keluar dan namanya tidak masuk peringkat.
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                    Peserta yang timernya mati tetapi <strong>masih boleh kembali</strong> —
                    jendela paket belum tutup dan masih ada subtes yang belum dibuka — sengaja
                    TIDAK ada di daftar ini. Di papan Skor Live ia bertanda “Jeda — boleh
                    lanjut”. Menutup ujiannya sama saja menghapus subtes yang belum ia kerjakan.
                  </p>
                  <p className="mt-2 max-w-2xl rounded-lg bg-brand-soft px-3 py-2 text-sm leading-relaxed text-brand">
                    Menutupnya memakai jalur penilaian yang sama dengan ujian yang selesai wajar:
                    <strong> jawaban yang sudah terisi tetap dihitung</strong>. Yang tidak
                    menjawab apa pun akan bernilai nol — periksa kolom jawaban dulu.
                  </p>
                </div>

                <div className="shrink-0">
                  <form action={tutupTerbengkalaiAction}>
                    <input type="hidden" name="package_id" value={paket?.id ?? 0} />
                    <TombolKonfirmasi
                      className="btn btn-primary"
                      pesan={`Tutup dan nilai ${terbengkalai.length} pengerjaan terbengkalai? Nilainya akan muncul di peringkat, dan langkah ini tidak bisa dibatalkan.`}
                    >
                      Tutup &amp; nilai {terbengkalai.length} pengerjaan
                    </TombolKonfirmasi>
                  </form>
                </div>
              </div>

              <div className="mt-4">
                <TabelScroll>
                  <table className="w-full min-w-[36rem]">
                    <thead>
                      <tr className="border-b border-line">
                        <th className={TH}>Nama</th>
                        <th className={TH}>Kelas</th>
                        <th className={TH}>Mulai</th>
                        <th className={TH}>Jawaban terisi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {terbengkalai.map((t) => (
                        <tr key={t.attempt_id} className="border-b border-line last:border-0">
                          <td className={TD}>{t.nama}</td>
                          <td className={TD}>{t.kelas ?? "—"}</td>
                          <td className={TD}>{tanggalIndo(t.started_at)}</td>
                          <td className={TD}>
                            {t.jumlah_jawaban > 0 ? (
                              <Badge tone="success">{t.jumlah_jawaban} jawaban</Badge>
                            ) : (
                              <Badge tone="muted">kosong</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TabelScroll>
              </div>
            </div>
          )}

          {/* --------- Peserta yang digugurkan & pembukaan ujian susulan --------- */}
          {gugur.length > 0 && (
            <div className="card mb-6 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold tracking-tight">
                    Peserta digugurkan ({gugur.length})
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Dua cara memulihkan peserta, dan akibatnya berlawanan — pilih sesuai keadaannya.
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    <li className="rounded-lg bg-brand-soft px-3 py-2 leading-relaxed text-brand">
                      <strong>Dibuka</strong> — peserta <strong>MELANJUTKAN</strong> dari subtes yang
                      tadi terpotong. Jawaban yang sudah terisi tetap utuh, dan sisa waktu subtes itu
                      dikembalikan sepanjang ia terblokir. Pakai ini untuk yang jaringannya putus,
                      layarnya membeku, atau telanjur keluar dari halaman ujian.
                    </li>
                    <li className="rounded-lg bg-accent-soft px-3 py-2 leading-relaxed text-accent">
                      <strong>Ujian Susulan</strong> — peserta <strong>MENGULANG DARI NOL</strong>.
                      Jawaban dan timer ronde lama dihapus. Pakai ini untuk yang belum pernah ikut
                      sama sekali, atau yang memang harus mengulang.
                    </li>
                  </ul>
                  <p className="mt-2 text-xs text-muted">
                    Catatan pelanggaran tidak pernah dihapus oleh keduanya — riwayatnya tetap
                    terbaca pengawas di tabel bawah.
                  </p>
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  {terblokir > 0 && (
                    <form action={bukaBlokirSemuaAction}>
                      <input type="hidden" name="package_id" value={paket?.id ?? 0} />
                      <TombolKonfirmasi
                        className="btn btn-primary w-full"
                        pesan={`Buka blokir ${terblokir} peserta pada paket ini? Mereka melanjutkan dari subtes yang tadi terpotong, dan jawabannya tidak dihapus.`}
                      >
                        Dibuka untuk {terblokir} peserta
                      </TombolKonfirmasi>
                    </form>
                  )}
                  {belumDapatIzin > 0 && (
                    <form action={bukaSusulanSemuaGugurAction}>
                      <input type="hidden" name="package_id" value={paket?.id ?? 0} />
                      <input
                        type="hidden"
                        name="catatan"
                        value={`Dibuka massal dari halaman Keamanan Ujian (${paket?.kode ?? ""})`}
                      />
                      <TombolKonfirmasi
                        className="btn btn-ghost w-full"
                        pesan={`Beri izin Ujian Susulan untuk ${belumDapatIzin} peserta? Mereka akan MENGULANG DARI NOL — jawaban yang sudah terisi dihapus.`}
                      >
                        Ujian Susulan untuk {belumDapatIzin} peserta
                      </TombolKonfirmasi>
                    </form>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <TabelScroll>
                  <table className="w-full min-w-[42rem]">
                    <thead>
                      <tr className="border-b border-line">
                        <th className={TH}>Nama</th>
                        <th className={TH}>Kelas</th>
                        <th className={TH}>Digugurkan</th>
                        <th className={TH}>Terhenti di</th>
                        <th className={TH}>Ujian susulan</th>
                        <th className={TH}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {gugur.map((g) => (
                        <tr key={g.attempt_id} className="border-b border-line/60">
                          <td className={`${TD} font-semibold`}>{g.nama}</td>
                          <td className={TD}>{g.kelas ?? "—"}</td>
                          <td className={`${TD} whitespace-nowrap text-xs text-muted`}>
                            {tanggalIndo(g.digugurkan_at)}
                          </td>
                          {/* Sampai mana ia sempat mengerjakan — inilah yang menentukan
                              apakah "Dibuka" masuk akal, atau lebih baik mengulang. */}
                          <td className={`${TD} whitespace-nowrap`}>
                            {g.subtes_terhenti ? (
                              <span className="font-semibold">
                                {labelSubtes(g.subtes_terhenti)}
                                <span className="ml-1.5 font-normal text-muted">
                                  {g.jumlah_jawaban} jawaban
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted">belum sempat menjawab</span>
                            )}
                          </td>
                          <td className={TD}>
                            {g.sudah_dipakai ? (
                              <Badge tone="success">Sudah dipakai</Badge>
                            ) : g.sudah_izin ? (
                              <Badge tone="brand">Sudah dibuka</Badge>
                            ) : (
                              <Badge tone="muted">Belum dibuka</Badge>
                            )}
                          </td>
                          <td className={`${TD} text-right`}>
                            <div className="flex justify-end gap-1.5">
                              <form action={bukaBlokirAction}>
                                <input type="hidden" name="user_id" value={g.user_id} />
                                <input type="hidden" name="package_id" value={paket?.id ?? 0} />
                                <input
                                  type="hidden"
                                  name="kembali_ke"
                                  value={`/admin/pelanggaran?paket=${paket?.id ?? 0}`}
                                />
                                <TombolKonfirmasi
                                  className="btn btn-primary !px-3 !py-1.5 text-sm"
                                  pesan={`Buka blokir ${g.nama}? Ia melanjutkan dari subtes yang tadi terpotong, dan jawabannya tidak dihapus.`}
                                >
                                  Dibuka
                                </TombolKonfirmasi>
                              </form>
                              {!g.sudah_izin && (
                                <form action={beriSusulanAction}>
                                  <input type="hidden" name="user_id" value={g.user_id} />
                                  <input type="hidden" name="package_id" value={paket?.id ?? 0} />
                                  <input
                                    type="hidden"
                                    name="kembali_ke"
                                    value={`/admin/pelanggaran?paket=${paket?.id ?? 0}`}
                                  />
                                  <TombolKonfirmasi
                                    className="btn btn-ghost !px-3 !py-1.5 text-sm"
                                    pesan={`Beri izin Ujian Susulan untuk ${g.nama}? Ia MENGULANG DARI NOL — jawaban yang sudah terisi dihapus.`}
                                  >
                                    Ujian Susulan
                                  </TombolKonfirmasi>
                                </form>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TabelScroll>
              </div>
            </div>
          )}

          {rekap.length === 0 ? (
            <EmptyState
              title="Tidak ada pelanggaran tercatat"
              description={`Belum ada peserta ${paket?.kode ?? ""} yang meninggalkan halaman ujian. Catatan muncul otomatis begitu terjadi.`}
            />
          ) : (
            <>
              <h2 className="mb-3 text-lg font-extrabold tracking-tight">Rekap per Peserta</h2>
              <div className="card mb-8 overflow-hidden p-0">
                <TabelScroll>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line bg-surface-muted text-left">
                        <th className={TH}>Peserta</th>
                        <th className={TH}>Status</th>
                        <th className={TH}>Skor</th>
                        <th className={TH}>Pelanggaran</th>
                        <th className={TH}>Total Keluar</th>
                        <th className={TH}>Terlama</th>
                        <th className={TH}>Tingkat</th>
                        <th className={TH}> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rekap.map((r) => {
                        const tk = tingkatKerawanan(r.jumlah);
                        return (
                          <tr key={r.attempt_id} className="border-b border-line last:border-0">
                            <td className={TD}>
                              <p className="font-semibold">{r.nama}</p>
                              <p className="text-xs text-muted">{identitasPeserta(r.email, r.asal_sekolah)}</p>
                            </td>
                            <td className={TD}>
                              {r.status === "finished"
                                ? "Selesai"
                                : r.status === "gugur"
                                  ? "GAGAL — digugurkan"
                                  : "Berlangsung"}
                            </td>
                            <td className={TD}>{r.total_skor ?? "—"}</td>
                            <td className={TD}>
                              <span className="text-base font-extrabold">{r.jumlah}</span> kali
                            </td>
                            <td className={TD}>{formatDurasi(r.total_detik)}</td>
                            <td className={TD}>{formatDurasi(r.terlama_detik)}</td>
                            <td className={TD}>
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${WARNA_TINGKAT[tk]}`}
                              >
                                {LABEL_TINGKAT[tk]}
                              </span>
                            </td>
                            <td className={TD}>
                              <Link
                                href={`/hasil/${r.attempt_id}`}
                                className="text-xs font-semibold text-brand hover:underline"
                              >
                                Lihat hasil
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TabelScroll>
              </div>

              <h2 className="mb-3 text-lg font-extrabold tracking-tight">
                Rincian Kejadian{" "}
                <span className="text-sm font-medium text-muted">({totalKejadian} kejadian)</span>
              </h2>
              <div className="card overflow-hidden p-0">
                <TabelScroll>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line bg-surface-muted text-left">
                        <th className={TH}>Peserta</th>
                        <th className={TH}>Ke-</th>
                        <th className={TH}>Subtes</th>
                        <th className={TH}>Jenis</th>
                        <th className={TH}>Keluar</th>
                        <th className={TH}>Kembali</th>
                        <th className={TH}>Lama</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rincian.slice(0, 200).map((v) => (
                        <tr key={v.id} className="border-b border-line last:border-0">
                          <td className={TD}>
                            <p className="font-semibold">{v.nama}</p>
                          </td>
                          <td className={TD}>{v.urutan}</td>
                          <td className={TD}>{labelSubtes(v.subtes)}</td>
                          <td className={TD}>
                            {labelJenis(v.jenis)}
                            {/* Keterangan membawa pola yang tidak terlihat dari
                                satu baris saja — terutama jumlah kepergian yang
                                menumpuk, yang justru menjelaskan kenapa
                                kepergian sependek ini bisa berakibat gugur. */}
                            {v.keterangan && (
                              <span className="mt-0.5 block text-xs font-normal text-muted">
                                {v.keterangan}
                              </span>
                            )}
                          </td>
                          <td className={`${TD} whitespace-nowrap`}>{tanggalIndo(v.mulai_at)}</td>
                          <td className={`${TD} whitespace-nowrap`}>
                            {v.kembali_at ? tanggalIndo(v.kembali_at) : "Tidak kembali"}
                          </td>
                          <td
                            className={`${TD} ${
                              (v.durasi_detik ?? 0) >= 60 ? "font-bold text-danger" : ""
                            }`}
                          >
                            {formatDurasi(v.durasi_detik)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TabelScroll>
                {rincian.length > 200 && (
                  <p className="border-t border-line px-4 py-3 text-xs text-muted">
                    Menampilkan 200 kejadian pertama. Unduh laporan Excel untuk melihat seluruhnya.
                  </p>
                )}
              </div>
            </>
          )}

          <div className="card mt-8 bg-surface-muted p-5">
            <p className="text-sm font-bold">Cara membaca laporan ini</p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted">
              <li>
                Browser tidak mengizinkan halaman ujian melihat <em>isi</em> tab lain. Yang tercatat
                adalah kapan peserta pergi, kapan kembali, dan berapa lama — bukan apa yang dibuka.
              </li>
              <li>
                Keluar 2–3 detik bisa jadi notifikasi masuk; keluar lebih dari 1 menit patut
                ditelusuri. Periksa kolom <strong>Lama</strong> sebelum menjatuhkan sanksi.
              </li>
              <li>
                Mencontek lewat HP kedua atau catatan kertas tidak terdeteksi sistem — pengawasan
                langsung tetap diperlukan.
              </li>
              <li>Sistem sengaja tidak menggugurkan ujian otomatis. Keputusan ada di tangan Anda.</li>
            </ul>
          </div>
        </>
      )}
    </>
  );
}
