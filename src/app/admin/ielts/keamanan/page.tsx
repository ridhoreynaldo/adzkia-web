import Link from "next/link";

import { PesanFlash, TabelScroll, TD, TH } from "@/components/admin/AdminUI";
import { TombolKonfirmasi } from "@/components/admin/TombolKonfirmasi";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import { AMBANG_KEMBALI_DETIK, BUDGET_PERGI_DETIK } from "@/lib/penjagaan/denyut";
import { wajibFiturLanguage } from "@/lib/ielts/language";
import { paketById, semuaPaket } from "@/lib/ielts/ielts";
import {
  rekapPelanggaranIelts,
  rincianPelanggaranIelts,
  totalPelanggaranPerPaketIelts,
} from "@/lib/ielts/ielts-penjagaan";
import { menggugurkan } from "@/lib/penjagaan/pelanggaran-jenis";

import {
  bukaBlokirIeltsAction,
  bukaSesiUlangIeltsAction,
  hentikanIeltsAction,
} from "../actions";

export const metadata = { title: "Keamanan Ujian IELTS" };
export const dynamic = "force-dynamic";

function durasi(detik: number | null): string {
  if (detik === null || detik === undefined) return "—";
  if (detik < 60) return `${detik} dtk`;
  return `${Math.floor(detik / 60)} mnt ${detik % 60} dtk`;
}

/**
 * Panel pengawas untuk ruang ujian IELTS — padanan `/admin/pelanggaran`.
 *
 * Dua tabel, dan urutannya mengikuti cara pengawas bekerja: REKAP lebih dulu
 * (siapa yang perlu ditemui), baru RINCIAN (apa yang sebenarnya terjadi
 * padanya, lengkap dengan jam dan lamanya).
 *
 * TIGA tombolnya sengaja berpasangan dan tidak boleh dipisah:
 *
 *  · "Hentikan" menutup lubang yang tidak bisa ditutup kode mana pun — HP
 *    kedua, catatan kertas, dan teman di sebelah tidak terlihat oleh halaman
 *    ujian, hanya oleh orang yang berdiri di ruangan.
 *  · "Dibuka" adalah katup pengaman yang PALING SERING BENAR: peserta
 *    MELANJUTKAN dari subtes yang tadi terpotong, jawabannya utuh, dan sisa
 *    waktunya dikembalikan sepanjang ia terhenti. Dipakai untuk jaringan yang
 *    membeku, layar yang padam, dan salah tangkap sistem.
 *  · "Buka sesi ulang" untuk yang memang harus mengulang dari nol — padanan
 *    "Ujian Susulan" di jalur UTBK. Ia MENGHAPUS jawaban, jadi jangan dipakai
 *    hanya karena namanya lebih dulu terbaca.
 *
 * Tanpa dua katup terakhir, satu salah tangkap berarti seorang siswa kehilangan
 * ujiannya tanpa jalan pulang — dan 4-6 September serta 11 September 2026
 * sama-sama membuktikan salah tangkap itu mungkin, bahkan massal.
 */
export default async function KeamananIeltsPage({
  searchParams,
}: {
  searchParams: Promise<{ paket?: string; pesan?: string; galat?: string }>;
}) {
  await wajibFiturLanguage();
  const { paket: paketMentah, pesan, galat } = await searchParams;

  const daftarPaket = await semuaPaket();
  // Tanpa pilihan yang diketik di alamat, buka paket yang MEMANG punya catatan.
  // Membuka paket kosong lebih dulu membuat pengawas mengira tidak ada apa-apa
  // pada hari ketika justru ada — dan ia harus menebak sendiri paket mana yang
  // harus diklik.
  // Jumlah pelanggaran tiap paket dihitung SEKALI di sini, lalu dipakai dua
  // kali: memilih paket bawaan, dan menggambar lencana angkanya di bawah.
  // Bentuk lamanya memanggil `totalPelanggaranPaketIelts()` di dalam `.find()`
  // DAN sekali lagi di dalam `.map()` — dua query per paket untuk satu angka.
  const pelanggaranPerPaket = await totalPelanggaranPerPaketIelts(
    daftarPaket.map((p) => p.id),
  );

  const dipilih =
    Number(paketMentah) ||
    daftarPaket.find((p) => (pelanggaranPerPaket.get(p.id) ?? 0) > 0)?.id ||
    daftarPaket[0]?.id ||
    0;
  const paket = await paketById(dipilih);

  const rekap = paket ? await rekapPelanggaranIelts(paket.id) : [];
  const rincian = paket ? await rincianPelanggaranIelts(paket.id) : [];

  return (
    <>
      <PageHeader
        title="Keamanan Ujian IELTS"
        subtitle={`Aturannya sama persis dengan ruang ujian TryOut UTBK-SNBT: satu kepergian lebih dari ${AMBANG_KEMBALI_DETIK} detik menghentikan ujian, dan seluruh kepergian dijumlahkan sampai ${BUDGET_PERGI_DETIK} detik.`}
      />

      <PesanFlash pesan={pesan} galat={galat} />

      {/* ---------- Pemilih paket ---------- */}
      {daftarPaket.length === 0 ? (
        <EmptyState
          title="Belum ada paket IELTS"
          description="Buat paketnya lebih dulu di panel IELTS."
        />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {daftarPaket.map((p) => {
              const n = pelanggaranPerPaket.get(p.id) ?? 0;
              const on = p.id === dipilih;
              return (
                <Link
                  key={p.id}
                  href={`/admin/ielts/keamanan?paket=${p.id}`}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    on
                      ? "bg-foreground text-white"
                      : "border border-line bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  {p.kode}
                  {n > 0 && (
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${
                        on ? "bg-white/20" : "bg-danger-soft text-danger"
                      }`}
                    >
                      {n}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* ---------- Rekap peserta ---------- */}
          <section className="card mb-6 p-5">
            <h2 className="text-sm font-extrabold tracking-tight">
              Rekap peserta — {paket?.nama ?? "—"}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Hanya peserta yang punya catatan atau yang ujiannya dihentikan
              yang muncul di sini. Angka <strong>waktu di luar halaman</strong>{" "}
              adalah jumlah seluruh kepergiannya pada ronde yang sedang berjalan
              — itulah yang dibandingkan dengan anggaran {BUDGET_PERGI_DETIK}{" "}
              detik.
            </p>

            {rekap.length === 0 ? (
              <p className="mt-4 rounded-xl bg-success-soft px-4 py-3 text-sm font-semibold text-success">
                ✓ Belum ada satu pun catatan keamanan pada paket ini.
              </p>
            ) : (
              <div className="mt-4">
                <TabelScroll>
                  <table className="w-full min-w-[44rem]">
                    <thead>
                      <tr>
                        <th className={TH}>Peserta</th>
                        <th className={TH}>Status</th>
                        <th className={TH}>Kejadian</th>
                        <th className={TH}>Waktu di luar halaman</th>
                        <th className={TH}>Tindakan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rekap.map((r) => (
                        <tr key={r.pengerjaanId}>
                          <td className={TD}>
                            <p className="font-bold">{r.nama}</p>
                            <p className="text-xs text-muted">
                              {r.nisn ? `NISN ${r.nisn}` : "—"}
                              {r.kelas ? ` · ${r.kelas}` : ""}
                              {r.ronde > 1 ? ` · ronde ${r.ronde}` : ""}
                            </p>
                          </td>
                          <td className={TD}>
                            {r.status === "gugur" ? (
                              <Badge tone="danger">Dihentikan</Badge>
                            ) : r.status === "finished" ? (
                              <Badge tone="muted">Selesai</Badge>
                            ) : (
                              <Badge tone="success">Berjalan</Badge>
                            )}
                          </td>
                          <td className={TD}>
                            <span className="font-bold tabular-nums">
                              {r.jumlah}
                            </span>
                            <span className="text-xs text-muted"> kejadian</span>
                            {r.menggugurkan > 0 && (
                              <span className="ml-2 text-xs font-bold text-danger">
                                · {r.menggugurkan} berat
                              </span>
                            )}
                          </td>
                          <td className={TD}>
                            <span
                              className={`font-bold tabular-nums ${
                                r.totalDetikPergi >= BUDGET_PERGI_DETIK
                                  ? "text-danger"
                                  : ""
                              }`}
                            >
                              {r.totalDetikPergi} dtk
                            </span>
                            <span className="text-xs text-muted">
                              {" "}
                              / {BUDGET_PERGI_DETIK}
                            </span>
                          </td>
                          {/* Kolom "Sebab dihentikan" DIHAPUS 11 September 2026
                              atas permintaan pengelola: kalimat alasannya
                              panjang — satu paragraf penuh — dan diulang di
                              SETIAP baris, sehingga tabelnya melebar dan
                              rekapnya jadi sulit dibaca sekilas. Padahal fungsi
                              tabel ini justru memindai cepat siapa yang perlu
                              ditemui.

                              Keterangannya TIDAK hilang, hanya pindah ke tempat
                              yang punya ruang untuknya: kolom "Kejadian" di
                              tabel Rincian di bawah menyebut jenisnya, dan rekap
                              per peserta (`/admin/ielts/peserta/<id>`) memuat
                              kalimat utuh beserta jamnya di kartu merah "Ujian
                              ini dihentikan". */}
                          <td className={TD}>
                            <div className="flex flex-col gap-2">
                              {r.status === "ongoing" && (
                                <form action={hentikanIeltsAction}>
                                  <input
                                    type="hidden"
                                    name="pengerjaanId"
                                    value={r.pengerjaanId}
                                  />
                                  <input
                                    type="hidden"
                                    name="paketId"
                                    value={dipilih}
                                  />
                                  <TombolKonfirmasi
                                    pesan={`Hentikan ujian ${r.nama} sekarang? Jawabannya tidak akan dinilai.`}
                                    className="btn btn-danger !px-3 !py-1.5 text-xs"
                                  >
                                    Hentikan
                                  </TombolKonfirmasi>
                                </form>
                              )}
                              {/* DUA TOMBOL YANG BERPASANGAN, dan urutannya
                                  disengaja: yang MELANJUTKAN lebih dulu, yang
                                  MENGULANG di bawahnya. Salah tangkap jauh
                                  lebih sering daripada peserta yang benar-benar
                                  harus mengulang dari nol, jadi jalan yang
                                  paling sering benar harus paling gampang
                                  ditekan. */}
                              {r.status === "gugur" && (
                                <>
                                  <form action={bukaBlokirIeltsAction}>
                                    <input
                                      type="hidden"
                                      name="pengerjaanId"
                                      value={r.pengerjaanId}
                                    />
                                    <input type="hidden" name="paketId" value={dipilih} />
                                    <TombolKonfirmasi
                                      pesan={`Buka ujian ${r.nama}? Ia MELANJUTKAN dari subtes yang tadi terpotong — jawabannya tidak dihapus, dan sisa waktu subtes itu dikembalikan sepanjang ia terhenti.`}
                                      className="btn btn-primary !px-3 !py-1.5 text-xs"
                                    >
                                      Dibuka
                                    </TombolKonfirmasi>
                                  </form>
                                  <form action={bukaSesiUlangIeltsAction}>
                                    <input
                                      type="hidden"
                                      name="pengerjaanId"
                                      value={r.pengerjaanId}
                                    />
                                    <input type="hidden" name="paketId" value={dipilih} />
                                    <TombolKonfirmasi
                                      pesan={`Buka sesi ulang untuk ${r.nama}? Jawaban lamanya DIHAPUS dan ia mengulang dari Listening. Kalau yang kamu inginkan adalah melanjutkan, pakai tombol "Dibuka".`}
                                      className="btn btn-ghost !px-3 !py-1.5 text-xs"
                                    >
                                      Buka sesi ulang
                                    </TombolKonfirmasi>
                                  </form>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TabelScroll>
              </div>
            )}
          </section>

          {/* ---------- Rincian kejadian ---------- */}
          <section className="card p-5">
            <h2 className="text-sm font-extrabold tracking-tight">
              Rincian kejadian
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Terbaru di atas. Baris <strong>merah</strong> adalah yang
              menghentikan ujian; sisanya catatan untuk bahan bicara dengan
              peserta — termasuk gangguan jaringan, yang memang TIDAK
              menghentikan siapa pun.
            </p>

            {rincian.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                Belum ada kejadian yang tercatat.
              </p>
            ) : (
              <div className="mt-4">
                <TabelScroll>
                  <table className="w-full min-w-[52rem]">
                    <thead>
                      <tr>
                        <th className={TH}>Waktu</th>
                        <th className={TH}>Peserta</th>
                        <th className={TH}>Subtes</th>
                        <th className={TH}>Kejadian</th>
                        <th className={TH}>Lama</th>
                        <th className={TH}>Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rincian.map((v) => {
                        const berat = menggugurkan(v.jenis);
                        return (
                          <tr
                            key={v.id}
                            className={berat ? "bg-danger-soft/40" : undefined}
                          >
                            <td className={TD}>
                              <span className="whitespace-nowrap text-xs tabular-nums">
                                {v.mulai_at}
                              </span>
                            </td>
                            <td className={TD}>
                              <p className="font-semibold">{v.nama}</p>
                              <p className="text-xs text-muted">
                                {v.nisn ?? "—"}
                              </p>
                            </td>
                            <td className={TD}>
                              <span className="text-xs font-semibold">
                                {v.subtes ?? "—"}
                              </span>
                            </td>
                            <td className={TD}>
                              <span
                                className={`text-xs font-bold ${berat ? "text-danger" : "text-muted"}`}
                              >
                                {v.label}
                              </span>
                            </td>
                            <td className={TD}>
                              <span className="whitespace-nowrap text-xs tabular-nums">
                                {durasi(v.durasi_detik)}
                              </span>
                            </td>
                            <td className={TD}>
                              <span className="text-xs text-muted">
                                {v.keterangan ?? "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TabelScroll>
              </div>
            )}
          </section>
        </>
      )}

      {/* Batas kemampuan ditulis di panel, bukan cuma di README: pengawas yang
          mengira sistem melihat segalanya akan berhenti mengawasi ruangan. */}
      <section className="card mt-6 border-warning/40 p-5">
        <h2 className="text-sm font-extrabold tracking-tight text-warning">
          ⚠ Yang TIDAK bisa dilihat sistem
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Peramban tidak mengizinkan halaman ujian melihat <em>isi</em> tab
          lain. Sistem tahu peserta pergi dan berapa lama, tetapi tidak tahu apa
          yang dibuka. Yang <strong>tidak terdeteksi sama sekali</strong>: HP
          kedua, catatan kertas, potret layar dari tombol fisik ponsel, dan
          teman di sebelah. Pengawasan langsung tetap diperlukan — tombol{" "}
          <strong>Hentikan</strong> di tabel atas ada justru untuk itu.
        </p>
      </section>
    </>
  );
}
