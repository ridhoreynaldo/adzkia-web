import Link from "next/link";

import {
  hapusPaketAction,
  hapusRiwayatPaketAction,
  hitungUlangPaketAction,
  ubahStatusPaketAction,
} from "@/app/admin/actions";
import { BarKelengkapan, LencanaStatus, PesanFlash } from "@/components/admin/AdminUI";
import { MenuAksi } from "@/components/admin/MenuAksi";
import { PemisahMenu, nadaMenu } from "@/components/admin/MenuAksiGaya";
import { TombolAksi, TombolKonfirmasi } from "@/components/admin/TombolKonfirmasi";
import { EmptyState, PageHeader } from "@/components/ui";
import { type ParamsQuery, daftarPaket, jejakRiwayatPerPaket, satuParam, tanggalIndo } from "@/lib/admin/admin";
import { konfirmasiHapusRiwayat } from "@/lib/core/tampilan";
import { requireAdmin } from "@/lib/auth/auth";
import { pastikanSiklusTerbaru, ringkasanSiklus } from "@/lib/tryout/siklus-jadwal";
import { TOTAL_SOAL, totalSoalJalur } from "@/lib/tryout/snbt";

export const metadata = { title: "Paket Tryout" };

export default async function DaftarPaketPage({
  searchParams,
}: {
  searchParams: Promise<ParamsQuery>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  // Penjadwal siklus pekanan juga menumpang di sini, supaya paket siklus
  // berjalan sudah tersedia begitu pengelola membuka daftar paket — bukan baru
  // muncul sesudah ada siswa yang login.
  await pastikanSiklusTerbaru();
  const paket = await daftarPaket();
  const { siklus, paket: paketSiklus } = await ringkasanSiklus();

  // DELAPAN query, bukan delapan PER PAKET. Bentuk lamanya memanggil
  // `jejakRiwayatPaket()` di dalam `.map()` saat merender — satu paket satu
  // rombongan query, hanya untuk memutuskan apakah tombol "Hapus riwayat"
  // perlu digambar.
  const jejakPerPaket = await jejakRiwayatPerPaket(paket.map((p) => p.id));

  return (
    <>
      <PageHeader
        title="Paket Tryout"
        subtitle="Setiap paket berisi 160 butir soal dari 7 subtes UTBK-SNBT."
        action={
          <Link className="btn btn-primary" href="/admin/paket/baru">
            + Paket baru
          </Link>
        }
      />

      <PesanFlash pesan={satuParam(sp.pesan)} galat={satuParam(sp.galat)} />

      {/* ---------- Siklus tryout pekanan ----------
          Tryout Adzkia digelar tiap Jumat. Paket siklusnya disiapkan sendiri
          sebagai draft dan paket siklus lama ditutup sendiri; yang tidak pernah
          otomatis adalah MENERBITKAN, karena paket yang naskahnya belum diimpor
          berarti tryout kosong bagi peserta. Kartu ini memberi tahu pengelola
          persis di mana posisi pekan ini. */}
      <section className="card mb-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted">
              Siklus pekan ini
            </h2>
            <p className="mt-1 text-lg font-extrabold">{siklus.nama}</p>
            <p className="mt-0.5 text-xs text-muted">
              Jendela {siklus.mulaiAt.replace("T", " ")} sampai{" "}
              {siklus.selesaiAt.replace("T", " ")} · paket siklus sebelumnya ditutup otomatis
            </p>
          </div>

          {paketSiklus ? (
            <div className="flex shrink-0 items-center gap-3">
              <div className="text-right">
                <p className="font-mono text-sm font-bold">{paketSiklus.kode}</p>
                <p className="text-xs text-muted">
                  {paketSiklus.jumlahSoal} dari {TOTAL_SOAL} soal
                </p>
              </div>
              <LencanaStatus status={paketSiklus.status} />
              <Link className="btn btn-ghost !py-1.5 !px-3 text-sm" href={`/admin/paket/${paketSiklus.id}`}>
                Buka
              </Link>
            </div>
          ) : (
            <p className="shrink-0 text-sm font-semibold text-muted">Paket sedang disiapkan…</p>
          )}
        </div>

        {paketSiklus && paketSiklus.status === "draft" && (
          <p className="mt-3 rounded-xl bg-brand-soft px-4 py-3 text-xs font-semibold leading-relaxed text-brand-strong">
            {paketSiklus.jumlahSoal < TOTAL_SOAL
              ? `Tinggal impor naskah soalnya (${TOTAL_SOAL - paketSiklus.jumlahSoal} butir lagi), lalu terbitkan pada hari-H.`
              : "Soalnya sudah lengkap. Tinggal terbitkan pada hari-H."}{" "}
            Paket sengaja tidak pernah terbit sendiri supaya soal tidak bocor sebelum waktunya.
          </p>
        )}
      </section>

      {paket.length === 0 ? (
        <EmptyState
          title="Belum ada paket tryout"
          description="Buat paket pertama, lalu isi bank soalnya secara manual atau lewat impor Excel."
          action={
            <Link className="btn btn-primary" href="/admin/paket/baru">
              Buat paket pertama
            </Link>
          }
        />
      ) : (
        /* ---------- Daftar paket: SATU BARIS per paket ----------
           Ditata ulang 11 September 2026 atas permintaan pengelola: "buat
           perbaris aja, barisnya seperti susunan garis buku."

           Sebelumnya tiap paket memajang SEBELAS tautan aksi bertumpuk di kolom
           terakhir, sehingga satu paket setinggi sebelas baris dan daftar ini
           harus digulir jauh hanya untuk melihat empat paket. Seluruh aksinya
           sekarang pindah ke balik tombol roda gigi; yang tersisa di baris
           hanyalah yang perlu DIBACA sekilas — kode, nama, status, kelengkapan
           soal, jadwal, dan jumlah peserta.

           `overflow-hidden` sengaja TIDAK dipakai pada kartu ini: panel menu
           roda gigi menggantung keluar dari barisnya, dan kartu yang memotong
           luapan akan memenggal menunya. Karena itu pula daftar ini bukan
           <table> di dalam <TabelScroll> lagi — pembungkus yang menggulir ke
           samping ikut memotong menu yang terbuka. */
        <div className="card p-0">
          <ul className="divide-y divide-line">
            {paket.map((p) => {
              const jejak = jejakPerPaket.get(p.id);
              const punyaRiwayat = (jejak?.pengerjaan ?? 0) > 0;
              const target = totalSoalJalur(p.jalur);
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3.5 transition-colors hover:bg-surface-muted/50 sm:px-5"
                >
                  {/* ---- Identitas paket ---- */}
                  <div className="min-w-56 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-surface-muted px-2 py-0.5 font-mono text-xs font-bold">
                        {p.kode}
                      </span>
                      <Link
                        className="font-semibold text-brand hover:underline"
                        href={`/admin/paket/${p.id}/soal`}
                      >
                        {p.nama}
                      </Link>
                      <LencanaStatus status={p.status} />
                    </div>

                    <p className="mt-1 text-xs text-muted">
                      {p.deskripsi ? `${p.deskripsi} · ` : ""}
                      {p.acak_soal ? "Soal diacak" : "Urutan tetap"} ·{" "}
                      {p.tampil_pembahasan ? "Pembahasan tampil" : "Pembahasan disembunyikan"} ·{" "}
                      {tanggalIndo(p.mulai_at)} → {tanggalIndo(p.selesai_at)}
                    </p>
                  </div>

                  {/* ---- Angka yang perlu dibaca sekilas ---- */}
                  <div className="flex shrink-0 items-center gap-5">
                    <BarKelengkapan terisi={p.jumlah_soal} target={target} />
                    <span
                      className="whitespace-nowrap text-xs text-muted"
                      title={`${p.jumlah_peserta} peserta pernah membuka paket ini`}
                    >
                      <strong className="text-sm tabular-nums text-foreground">
                        {p.jumlah_peserta}
                      </strong>{" "}
                      peserta
                    </span>
                  </div>

                  {/* ---- Ubah status: TETAP di baris, bukan di dalam menu ----
                      Menerbitkan paket adalah tindakan hari-H yang dilakukan
                      sambil melihat kelengkapan soalnya di baris yang sama.
                      Menyembunyikannya di balik menu berarti dua ketukan pada
                      saat yang paling tidak boleh bertele-tele. */}
                  <form action={ubahStatusPaketAction} className="flex shrink-0 items-center gap-1">
                    <input type="hidden" name="id" value={p.id} />
                    <select
                      name="status"
                      defaultValue={p.status}
                      aria-label={`Ubah status paket ${p.kode}`}
                      className="input w-auto! px-2! py-1! text-xs"
                    >
                      <option value="draft">Draf</option>
                      <option value="published">Terbit</option>
                      <option value="closed">Ditutup</option>
                    </select>
                    <TombolAksi title="Terapkan status">Ubah</TombolAksi>
                  </form>

                  {/* ---- Seluruh aksi lain, di balik roda gigi ---- */}
                  <MenuAksi label={`Aksi paket ${p.kode}`} judul={p.kode}>
                    <Link role="menuitem" className={nadaMenu()} href={`/admin/paket/${p.id}/soal`}>
                      Kelola soal
                    </Link>
                    <Link
                      role="menuitem"
                      className={nadaMenu()}
                      href={`/admin/paket/${p.id}/import`}
                    >
                      Impor soal
                    </Link>
                    <Link
                      role="menuitem"
                      className={nadaMenu()}
                      href={`/admin/paket/${p.id}/pratinjau`}
                    >
                      Pratinjau soal
                    </Link>
                    <Link
                      role="menuitem"
                      className={nadaMenu()}
                      href={`/admin/paket/${p.id}/simulasi`}
                    >
                      Pratinjau ujian
                    </Link>
                    <a
                      role="menuitem"
                      className={nadaMenu("sukses")}
                      href={`/api/admin/export/${p.id}`}
                      download
                    >
                      Ekspor soal .xlsx
                    </a>

                    <PemisahMenu />

                    <Link role="menuitem" className={nadaMenu()} href={`/admin/paket/${p.id}/edit`}>
                      Edit paket
                    </Link>
                    <Link
                      role="menuitem"
                      className={nadaMenu()}
                      href={`/admin/paket/${p.id}/peserta`}
                    >
                      Peserta paket
                    </Link>
                    <Link role="menuitem" className={nadaMenu()} href={`/peringkat/${p.id}`}>
                      Peringkat
                    </Link>
                    {/* Lembar untuk ORANG TUA: nomor, nama, skor tiap subtes,
                        dan total. Tanpa catatan pelanggaran — laporan itu punya
                        berkasnya sendiri di menu Keamanan Ujian, dan tidak boleh
                        ikut beredar di grup orang tua. */}
                    <a
                      role="menuitem"
                      className={nadaMenu("sukses")}
                      href={`/api/admin/hasil/${p.id}`}
                      download
                    >
                      Unduh hasil ujian .xlsx
                    </a>
                    <form action={hitungUlangPaketAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <TombolKonfirmasi
                        className={nadaMenu()}
                        pesan={`Nilai ulang semua pengerjaan paket ${p.kode} dengan kalibrasi kesulitan butir terbaru? Jalankan ini setelah seluruh peserta selesai agar peringkat akhirnya adil.`}
                      >
                        Hitung ulang nilai
                      </TombolKonfirmasi>
                    </form>

                    <PemisahMenu />

                    {/* Membersihkan riwayat BUKAN menghapus paket: soal, jadwal,
                        dan akun siswa tetap utuh. Hanya muncul saat ada yang
                        bisa dibersihkan supaya menunya tidak memuat pilihan yang
                        sudah pasti ditolak. */}
                    {punyaRiwayat && (
                      <form action={hapusRiwayatPaketAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <TombolKonfirmasi
                          className={nadaMenu("awas")}
                          pesan={konfirmasiHapusRiwayat(p.kode, jejak ?? {})}
                        >
                          Hapus riwayat
                        </TombolKonfirmasi>
                        <label className="flex cursor-pointer items-center gap-2 px-4 pb-2 text-[11px] text-muted">
                          <input
                            type="checkbox"
                            name="prodi"
                            defaultChecked
                            className="size-3"
                            aria-label={`Ikut hapus pilihan program studi paket ${p.kode}`}
                          />
                          termasuk pilihan prodi
                        </label>
                      </form>
                    )}
                    <form action={hapusPaketAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <TombolKonfirmasi
                        className={nadaMenu("bahaya")}
                        pesan={`Hapus paket ${p.kode}? Semua soal, jawaban, dan hasil peserta di paket ini ikut terhapus permanen.`}
                      >
                        Hapus paket
                      </TombolKonfirmasi>
                    </form>
                  </MenuAksi>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <section className="card mt-5 p-5">
        <h2 className="text-sm font-extrabold tracking-tight">
          Dua aksi yang sering tertukar
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          <strong className="text-warning">Hapus riwayat</strong> mengosongkan pengerjaan, jawaban,
          nilai, dan catatan pelanggaran satu paket, tetapi soal, jadwal, dan akun siswa tetap utuh
          — pakai ini supaya paket yang sudah telanjur dicoba bisa dikerjakan lagi dari nol.
          Kalibrasi kesulitan butir ikut disetel ulang, jadi nilai peserta sungguhan tidak
          terpengaruh percobaan yang dihapus. Paket yang sedang dikerjakan tidak bisa dibersihkan.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          <strong className="text-danger">Hapus paket</strong> jauh lebih jauh: memakai{" "}
          <em>cascade</em> basis data, sehingga soal, pengerjaan, jawaban, dan hasil peserta pada
          paket tersebut ikut terhapus dan tidak bisa dikembalikan.
        </p>
      </section>
    </>
  );
}
