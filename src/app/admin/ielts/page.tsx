import Link from "next/link";
import type { ReactNode } from "react";

import { PesanFlash } from "@/components/admin/AdminUI";
import { MenuAksi } from "@/components/admin/MenuAksi";
import { PemisahMenu, nadaMenu } from "@/components/admin/MenuAksiGaya";
import { TombolAksi, TombolKonfirmasi } from "@/components/admin/TombolKonfirmasi";
import { NEGARA_DUNIA, PitaBendera } from "@/components/language/BenderaDunia";
import {
  IkonGembok,
  IkonGlobe,
  IkonLive,
  IkonPaket,
  IkonPembahasan,
  IkonPerisai,
  IkonPeserta,
  IkonSubtes,
} from "@/components/language/IkonIelts";
import { Badge, EmptyState } from "@/components/ui";
import { wajibFiturLanguage } from "@/lib/ielts/language";
import { konfirmasiHapusRiwayatIelts } from "@/lib/core/tampilan";
import {
  LABEL_STATUS_IELTS,
  STATUS_PAKET_IELTS,
  SUBTES_IELTS,
  TOTAL_MENIT_IELTS,
  TOTAL_SOAL_IELTS,
  jejakRiwayatPerPaket,
  ringkasPerPaket,
  semuaPaket,
  statusPortalIelts,
} from "@/lib/ielts/ielts";

import { ringkasPaketBawaan } from "@/lib/ielts/paket-bawaan";

import {
  buatPaketIeltsAction,
  hapusPaketIeltsAction,
  hapusRiwayatIeltsAction,
  hitungUlangIeltsAction,
  kunciPortalIeltsAction,
  pasangPaketBawaanAction,
  setPembahasanIeltsAction,
  setStatusPaketIeltsAction,
} from "./actions";

export const metadata = { title: "IELTS" };
export const dynamic = "force-dynamic";

/**
 * PANEL IELTS — beranda pengelola jalur internasional.
 *
 * Ditata ulang 11 September 2026 atas permintaan pengelola: "halaman admin-nya
 * tolong bagusin layout/tampilannya seperti pada halaman utama IELTS, ada
 * ikon-ikonnya juga … tambahkan icon bendera negara dari seluruh dunia."
 *
 * Tiga lapis, urut sesuai cara pengelola bekerja pada hari-H:
 *
 *  1. SAMPUL — siapa yang sedang dilihat (jalur IELTS), keadaan portal, dan
 *     empat pintu yang paling sering ditekan.
 *  2. DAFTAR PAKET — kelengkapan tiap subtes beserta seluruh tindakannya.
 *  3. PAKET BARU — paling bawah, karena paling jarang dipakai.
 *
 * Benderanya hiasan, bukan penanda: tidak ada satu pun paket yang terikat pada
 * negara mana pun. Ia ada supaya panel ini tidak bisa tertukar sekilas dengan
 * portal tryout nasional, yang tata letaknya memang sengaja dibuat kembar.
 */
export default async function AdminIeltsPage({
  searchParams,
}: {
  searchParams: Promise<{ pesan?: string; galat?: string }>;
}) {
  await wajibFiturLanguage();
  const { pesan, galat } = await searchParams;

  const portal = await statusPortalIelts();
  const paket = await semuaPaket();
  // SEMBILAN query, bukan sembilan PER PAKET.
  //
  // Bentuk lamanya memanggil `ringkasPaket()` (3 query) dan `jejakRiwayatIelts()`
  // (6 query) di dalam `.map()` — sekitar 90 query untuk sepuluh paket, pada
  // halaman yang pada dasarnya cuma menghitung.
  const idPaket = paket.map((p) => p.id);
  const ringkas = await ringkasPerPaket(idPaket);
  // Jejak riwayat tiap paket: dipakai untuk memutuskan apakah tombol "Hapus
  // riwayat" perlu digambar sama sekali, DAN untuk menyebutkan angkanya di
  // dialog konfirmasi. Pengelola berhak tahu persis apa yang akan hilang.
  const riwayat = await jejakRiwayatPerPaket(idPaket);

  // Paket yang ikut terbangun ke dalam aplikasi, berikut keadaannya di basis
  // data server ini — dipakai bagian "Paket bawaan" di bawah.
  const bawaan = await ringkasPaketBawaan();

  const terbit = paket.filter((p) => p.status === "published").length;
  const paketPertama = paket[0]?.id ?? 0;

  return (
    <>
      {/* ================= SAMPUL ================= */}
      <section className="card relative mb-6 overflow-hidden p-0">
        {/* Cahaya merah samar di sudut, meniru `.kertas-language` di jalur siswa. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(620px 280px at 6% -20%, var(--brand-soft), transparent 70%), radial-gradient(520px 240px at 96% -10%, var(--brand-soft), transparent 70%)",
          }}
        />

        <div className="relative px-6 py-7 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[11px] font-bold text-foreground shadow-sm">
                <IkonGlobe className="h-3.5 w-3.5 text-brand" />
                Language Skill · Test Administration
              </span>

              <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                Panel <span className="sorot-language">IELTS</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                Empat subtes berurutan —{" "}
                {SUBTES_IELTS.map((s) => `${s.nama} ${s.menit}′`).join(", ")} — {TOTAL_SOAL_IELTS}{" "}
                butir, {TOTAL_MENIT_IELTS} menit. Menit di atas adalah bawaan; tiap paket boleh
                punya menitnya sendiri.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
                <span className="rounded-full bg-surface-muted px-3 py-1">
                  {paket.length} paket
                </span>
                <span className="rounded-full bg-surface-muted px-3 py-1">{terbit} terbit</span>
                <span
                  className={`rounded-full px-3 py-1 ${
                    portal.terkunci ? "bg-danger-soft text-danger" : "bg-success-soft text-success"
                  }`}
                >
                  Portal {portal.terkunci ? "dikunci" : "terbuka"}
                </span>
              </div>
            </div>

            {/* Empat subtes sebagai lencana berikon — pengingat bentuk ujiannya. */}
            <ul className="grid grid-cols-2 gap-2">
              {SUBTES_IELTS.map((s) => (
                <li
                  key={s.kode}
                  className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2"
                >
                  <IkonSubtes kode={s.kode} className="h-4 w-4 text-brand" />
                  <span className="text-xs font-bold">{s.nama}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bendera dunia — hiasan, sepenuhnya aria-hidden. */}
          <PitaBendera negara={NEGARA_DUNIA} className="mt-7" />
          <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Satu ujian, {NEGARA_DUNIA.length}+ negara tujuan
          </p>
        </div>
      </section>

      <PesanFlash pesan={pesan} galat={galat} />

      {/* ================= EMPAT PINTU ================= */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Pintu
          href="/admin/ielts/live"
          ikon={<IkonLive className="h-5 w-5" />}
          judul="Skor Live"
          ringkas="Band peserta diperbarui sendiri selama ujian berlangsung."
        />
        <Pintu
          href="/admin/ielts/keamanan"
          ikon={<IkonPerisai className="h-5 w-5" />}
          judul="Keamanan Ujian"
          ringkas="Siapa yang pergi, berapa lama, dan siapa yang perlu ditemui."
          nada="danger"
        />
        <Pintu
          href="/admin/ielts/peserta"
          ikon={<IkonPeserta className="h-5 w-5" />}
          judul="Rekap per Peserta"
          ringkas="Band, lama pengerjaan, dan catatan keamanan satu anak."
        />
        <Pintu
          href={paketPertama ? `/admin/ielts/${paketPertama}/peringkat` : "/admin/ielts"}
          ikon={<IkonPaket className="h-5 w-5" />}
          judul="Papan Band"
          ringkas="Peringkat band dari tertinggi ke terendah, siap dicetak."
        />
      </div>

      {/* ================= KUNCI PORTAL ================= */}
      <section className="card mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-extrabold tracking-tight">
              <IkonGembok className="h-4 w-4 text-brand" />
              Kunci Portal IELTS
              {portal.terkunci ? (
                <Badge tone="danger">DIKUNCI</Badge>
              ) : (
                <Badge tone="success">TERBUKA</Badge>
              )}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Portal yang dikunci menutup seluruh jalur IELTS bagi siswa — halaman jalur, pintu
              masuk, sampai ruang ujian. Pengelola sendiri tetap bisa lewat untuk memeriksa soal.
              {portal.diperbaruiAt && (
                <>
                  {" "}
                  Terakhir diubah {portal.diperbaruiAt}
                  {portal.olehNama ? ` oleh ${portal.olehNama}` : ""}.
                </>
              )}
            </p>
          </div>

          <form action={kunciPortalIeltsAction}>
            <input type="hidden" name="terkunci" value={portal.terkunci ? "0" : "1"} />
            <button
              type="submit"
              className={`btn ${portal.terkunci ? "btn-primary" : "btn-danger"}`}
            >
              {portal.terkunci ? "Buka Portal" : "Kunci Portal"}
            </button>
          </form>
        </div>
      </section>

      {/* ================= DAFTAR PAKET ================= */}
      {paket.length === 0 ? (
        <EmptyState
          title="Belum ada paket IELTS"
          description="Buat paket pertama lewat formulir di bawah, lalu isi soal tiap subtes beserta rekaman Listening-nya."
        />
      ) : (
        /* ---------- Daftar paket: SATU BARIS per paket ----------
           Ditata ulang 11 September 2026, mengikuti daftar paket tryout yang
           dirapikan pada hari yang sama. Sebelumnya tiap paket memajang
           SEBELAS tautan aksi bertumpuk di kolom terakhir, dan tabelnya
           melebar sampai sembilan kolom sehingga harus digulir ke samping
           hanya untuk melihat tombolnya.

           Yang tersisa di baris hanyalah yang perlu DIBACA sekilas: kode,
           nama, status, kelengkapan keempat subtes, dan jendela waktunya.
           Seluruh aksinya pindah ke balik tombol roda gigi.

           Kartu ini TIDAK memakai `overflow-hidden` dan bukan <table> di dalam
           <TabelScroll>: panel menu roda gigi menggantung keluar dari barisnya,
           dan kedua pembungkus itu akan memenggalnya. */
        <div className="card p-0">
          <ul className="divide-y divide-line">
            {paket.map((p) => {
              const r = ringkas.get(p.id) ?? [];
              const jejak = riwayat.get(p.id);
              const punyaRiwayat = (jejak?.pengerjaan ?? 0) > 0;
              const pembahasanDibuka = p.tampil_pembahasan === 1;
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
                      <Link href={`/admin/ielts/${p.id}`} className="font-semibold text-brand hover:underline">
                        {p.nama}
                      </Link>
                      <Badge
                        tone={
                          p.status === "published"
                            ? "success"
                            : p.status === "closed"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {LABEL_STATUS_IELTS[p.status]}
                      </Badge>
                    </div>

                    {/* Keadaan pembahasan ikut di baris keterangan — tuasnya
                        sendiri ada di dalam menu. Yang perlu terbaca sekilas
                        adalah KEADAANNYA ("sudah dibuka belum?"), bukan
                        tombolnya. */}
                    <p className="mt-1 text-xs text-muted">
                      {pembahasanDibuka ? "Pembahasan dibuka" : "Pembahasan ditahan"} ·{" "}
                      {p.mulai_at || p.selesai_at
                        ? `${p.mulai_at ?? "—"} → ${p.selesai_at ?? "—"}`
                        : "Jendela tanpa batas"}
                    </p>
                  </div>

                  {/* ---- Kelengkapan keempat subtes ----
                      Angkanya sekaligus pintu ke bank soal subtes itu:
                      pengelola yang melihat "12/40" hampir selalu ingin
                      langsung membukanya, bukan mampir ke halaman paket dulu. */}
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {r.map((s) => (
                      <Link
                        key={s.kode}
                        href={`/admin/ielts/${p.id}/${s.kode.toLowerCase()}`}
                        title={`Kelola soal ${s.nama} — ${s.terisi} dari ${s.target} butir${
                          s.pakaiAudio ? `, rekaman ${s.audioTerisi}/${s.jumlahSeksi}` : ""
                        }`}
                        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors ${
                          s.siap
                            ? "border-success/40 bg-success-soft text-success hover:border-success"
                            : "border-line bg-surface text-muted hover:border-brand hover:text-brand"
                        }`}
                      >
                        <IkonSubtes kode={s.kode} className="h-3.5 w-3.5" />
                        <span className="tabular-nums">
                          {s.terisi}/{s.target}
                        </span>
                        {s.pakaiAudio && (
                          <span className="tabular-nums opacity-70">
                            🎧{s.audioTerisi}/{s.jumlahSeksi}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>

                  {/* ---- Ubah status: TETAP di baris, bukan di dalam menu ----
                      Pada hari-H pengelola menerbitkan paket sambil melihat
                      kelengkapan soalnya di baris yang sama. Menyembunyikannya
                      di balik menu berarti dua ketukan pada saat yang paling
                      tidak boleh bertele-tele. */}
                  <form
                    action={setStatusPaketIeltsAction}
                    className="flex shrink-0 items-center gap-1"
                  >
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="dari" value="/admin/ielts" />
                    <select
                      name="status"
                      defaultValue={p.status}
                      aria-label={`Ubah status paket ${p.kode}`}
                      className="input w-auto! px-2! py-1! text-xs"
                    >
                      {STATUS_PAKET_IELTS.map((s) => (
                        <option key={s} value={s}>
                          {LABEL_STATUS_IELTS[s]}
                        </option>
                      ))}
                    </select>
                    <TombolAksi title="Terapkan status">Ubah</TombolAksi>
                  </form>

                  {/* ---- Seluruh aksi lain, di balik roda gigi ---- */}
                  <MenuAksi label={`Aksi paket ${p.kode}`} judul={p.kode}>
                    <Link
                      role="menuitem"
                      className={nadaMenu()}
                      href={`/admin/ielts/${p.id}/listening`}
                    >
                      Kelola soal
                    </Link>
                    <Link
                      role="menuitem"
                      className={nadaMenu()}
                      href={`/admin/ielts/${p.id}/pratinjau`}
                    >
                      Pratinjau soal
                    </Link>
                    <Link
                      role="menuitem"
                      className={nadaMenu()}
                      href={`/admin/ielts/${p.id}/simulasi`}
                    >
                      Pratinjau ujian
                    </Link>
                    <Link role="menuitem" className={nadaMenu()} href={`/admin/ielts/${p.id}`}>
                      Edit paket soal
                    </Link>

                    <PemisahMenu />

                    <Link
                      role="menuitem"
                      className={nadaMenu()}
                      href={`/admin/ielts/live?paket=${p.id}`}
                    >
                      Skor live paket ini
                    </Link>
                    <Link
                      role="menuitem"
                      className={nadaMenu()}
                      href={`/admin/ielts/peserta?paket=${p.id}`}
                    >
                      Rekap per peserta
                    </Link>
                    <Link
                      role="menuitem"
                      className={nadaMenu()}
                      href={`/admin/ielts/${p.id}/peringkat`}
                    >
                      Peringkat skor band
                    </Link>
                    {/* Lembar untuk GURU dan ORANG TUA: nomor, nama, kelas,
                        band tiap subtes, dan band keseluruhan. Tanpa satu pun
                        catatan pelanggaran — laporan itu punya halamannya
                        sendiri di Keamanan Ujian. */}
                    <a
                      role="menuitem"
                      className={nadaMenu("sukses")}
                      href={`/api/admin/ielts/hasil/${p.id}`}
                      download
                    >
                      Unduh hasil IELTS .xlsx
                    </a>
                    <form action={hitungUlangIeltsAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="dari" value="/admin/ielts" />
                      <TombolKonfirmasi
                        className={nadaMenu()}
                        pesan={`Periksa ulang seluruh pengerjaan paket ${p.kode}? Subtes yang waktunya sudah habis akan ditutup, dan pengerjaan yang sudah tuntas ditandai selesai. Band IELTS sendiri selalu dihitung ulang saat dibaca, jadi tidak ada nilai yang bisa rusak.`}
                      >
                        Hitung ulang nilai
                      </TombolKonfirmasi>
                    </form>
                    <form action={setPembahasanIeltsAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="dari" value="/admin/ielts" />
                      <input type="hidden" name="tampil" value={pembahasanDibuka ? "0" : "1"} />
                      <TombolAksi
                        className={nadaMenu()}
                        title={
                          pembahasanDibuka
                            ? "Siswa sedang bisa membaca kunci dan penjelasan tiap butir yang subtesnya sudah tutup"
                            : "Siswa hanya melihat band score-nya"
                        }
                      >
                        {pembahasanDibuka ? "Tahan pembahasan" : "Buka pembahasan"}
                      </TombolAksi>
                    </form>

                    <PemisahMenu />

                    {/* Membersihkan riwayat BUKAN menghapus paket: soal,
                        rekaman, jadwal, dan akun siswa tetap utuh. Hanya muncul
                        saat ada yang bisa dibersihkan supaya menunya tidak
                        memuat pilihan yang sudah pasti ditolak. */}
                    {punyaRiwayat && (
                      <form action={hapusRiwayatIeltsAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="dari" value="/admin/ielts" />
                        <TombolKonfirmasi
                          className={nadaMenu("awas")}
                          pesan={konfirmasiHapusRiwayatIelts(p.kode, jejak)}
                        >
                          Hapus riwayat
                        </TombolKonfirmasi>
                      </form>
                    )}
                    <form action={hapusPaketIeltsAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <TombolKonfirmasi
                        className={nadaMenu("bahaya")}
                        pesan={`Hapus paket "${p.nama}" beserta seluruh soal, rekaman, dan pengerjaan siswanya? Tidak bisa dibatalkan.`}
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

      {/* ================= PAKET BAWAAN ================= */}
      {/*
        Paket yang isinya sudah ikut terbangun ke dalam aplikasi.

        Ada karena naskah Word dan skrip penyemainya TIDAK ikut ke server:
        citra Docker hanya membawa hasil build. Tanpa bagian ini, server yang
        dipasang lewat `git push` hanya bisa diisi oleh orang yang punya shell
        di dalamnya. Rincian pertimbangannya di `src/lib/ielts/paket-bawaan.ts`.
      */}
      <section className="card mt-8 p-6">
        <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <IkonPaket className="h-5 w-5 text-brand" />
          Paket bawaan aplikasi
        </h2>
        <p className="mt-1 text-sm text-muted">
          Soal dan bacaannya sudah ikut terbangun di dalam aplikasi ini; rekamannya ditarik dari
          server lama saat tombol ditekan, jadi prosesnya perlu waktu — puluhan megabyte lewat
          jaringan. Paket yang sudah pernah dikerjakan peserta tidak akan disentuh.
        </p>

        <ul className="mt-5 grid gap-3">
          {bawaan.map((b) => {
            const t = b.terpasang;
            const lengkap = t !== null && t.butir >= b.butir.reduce((n, x) => n + x.jumlah, 0);
            return (
              <li key={b.kode} className="rounded-xl border border-line bg-surface-muted/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-extrabold tracking-tight">{b.kode}</p>
                    <p className="truncate text-sm text-muted">{b.nama}</p>
                    <p className="mt-1 text-xs text-muted">
                      {b.butir.map((x) => `${x.subtes} ${x.jumlah}`).join(" · ")} · {b.rekaman}{" "}
                      rekaman
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {t === null ? (
                      <Badge tone="warning">belum ada</Badge>
                    ) : lengkap ? (
                      <Badge tone="success">terpasang · {t.butir} butir</Badge>
                    ) : (
                      <Badge tone="warning">baru {t.butir} butir</Badge>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <form action={pasangPaketBawaanAction}>
                    <input type="hidden" name="kode" value={b.kode} />
                    <TombolKonfirmasi
                      pesan={
                        t === null
                          ? `Pasang ${b.kode} ke server ini? Rekamannya ikut ditarik dari server lama, jadi perlu waktu.`
                          : t.pengerjaan > 0
                            ? `Lengkapi ${b.kode}? Butir yang sudah ada dibiarkan apa adanya — yang ditambahkan hanya bagian, rekaman, dan nomor yang belum terisi.`
                            : `Susun ulang ${b.kode} dari bawaan aplikasi? Isi paket yang sekarang diganti seluruhnya.`
                      }
                      className="btn btn-primary !px-3 !py-1.5 text-xs"
                    >
                      {t === null
                        ? "Pasang paket ini"
                        : t.pengerjaan > 0
                          ? "Lengkapi dari bawaan"
                          : "Susun ulang dari bawaan"}
                    </TombolKonfirmasi>
                  </form>
                  {t !== null && t.pengerjaan > 0 && (
                    <p className="text-xs text-muted">
                      Sudah dikerjakan {t.pengerjaan} peserta — jawaban mereka tidak akan disentuh,
                      dan butir yang sudah ada tidak diganti.
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ================= PAKET BARU ================= */}
      <section className="card mt-8 p-6">
        <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <IkonPaket className="h-5 w-5 text-brand" />
          Buat paket IELTS
        </h2>
        <p className="mt-1 text-sm text-muted">
          Bagian tiap subtes —{" "}
          {SUBTES_IELTS.map((s) => `${s.jumlahSeksi} ${s.labelSeksi}`).join(", ")} — dibuat otomatis
          dan tinggal diisi.
        </p>

        <form action={buatPaketIeltsAction} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="kode">
              Kode Paket
            </label>
            <input className="input" id="kode" name="kode" placeholder="IELTS-01" required />
            <p className="mt-1.5 text-xs text-muted">
              Dipakai sebagai nama folder rekaman. Huruf besar, tanpa spasi.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="nama">
              Nama Paket
            </label>
            <input
              className="input"
              id="nama"
              name="nama"
              placeholder="IELTS Academic Practice Test 1"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="deskripsi">
              Keterangan (opsional)
            </label>
            <input className="input" id="deskripsi" name="deskripsi" />
          </div>
          <div className="sm:col-span-2">
            <button className="btn btn-primary" type="submit">
              Buat Paket
            </button>
          </div>
        </form>
      </section>
    </>
  );
}

/** Satu kartu pintu di sampul panel. */
function Pintu({
  href,
  ikon,
  judul,
  ringkas,
  nada = "brand",
}: {
  href: string;
  ikon: ReactNode;
  judul: string;
  ringkas: string;
  nada?: "brand" | "danger";
}) {
  return (
    <Link
      href={href}
      className="card group flex items-start gap-3 p-4 transition-colors hover:border-brand"
    >
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
          nada === "danger" ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand"
        }`}
      >
        {ikon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold tracking-tight group-hover:text-brand">
          {judul}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{ringkas}</span>
      </span>
    </Link>
  );
}
