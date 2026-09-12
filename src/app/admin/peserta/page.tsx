import Link from "next/link";

import { hapusPesertaAction, setPeranAction, tambahPesertaAction } from "@/app/admin/actions";
import { PesanFlash } from "@/components/admin/AdminUI";
import { MenuAksi } from "@/components/admin/MenuAksi";
import { PemisahMenu, nadaMenu } from "@/components/admin/MenuAksiGaya";
import { TombolKonfirmasi } from "@/components/admin/TombolKonfirmasi";
import { Badge, EmptyState, PageHeader } from "@/components/ui";
import {
  type ParamsQuery,
  namaKelasTerpakai,
  pesertaPerKelas,
  satuParam,
  tanggalIndo,
} from "@/lib/admin/admin";
import { AWALAN_NISN_DEMO } from "@/lib/admin/admin-konstanta";
import { requireAdmin } from "@/lib/auth/auth";
import { identitasPeserta, konfirmasiHapusAkun } from "@/lib/core/tampilan";

export const metadata = { title: "Peserta" };

export default async function PesertaPage({
  searchParams,
}: {
  searchParams: Promise<ParamsQuery>;
}) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const cari = satuParam(sp.cari) ?? "";
  // Kelas yang sedang dibuka. Kosong = semua kelas ditutup, hanya kepalanya
  // yang terlihat — itulah yang membuat 1.214 akun muat dalam satu layar.
  const kelasDibuka = satuParam(sp.kelas) ?? "";

  const kelompok = await pesertaPerKelas(cari);
  const jumlahAkun = kelompok.reduce((n, g) => n + g.anggota.length, 0);
  const kelasTersedia = await namaKelasTerpakai();

  // Pencarian membuka SEMUA kelompok: yang dicari pengelola adalah orangnya,
  // dan menyuruhnya menebak dulu di kelas mana orang itu berada membuat
  // pencariannya tidak ada gunanya.
  const semuaTerbuka = cari.length > 0;

  return (
    <>
      <PageHeader
        title="Peserta"
        subtitle="Dikelompokkan per kelas. Ketuk nama kelas untuk membuka daftar siswanya."
        action={
          <Link className="btn btn-ghost" href="/admin/peserta/impor">
            Impor dari Excel
          </Link>
        }
      />

      <PesanFlash pesan={satuParam(sp.pesan)} galat={satuParam(sp.galat)} />

      {/* ---------- Tambah peserta satuan ----------
          Diminta pengelola 11 September 2026: menambah satu siswa susulan atau
          siswa pindahan tidak boleh menuntut berkas Excel berisi satu baris.
          Impor Excel tetap ada di kepala halaman untuk satu angkatan sekaligus.

          Dipasang sebagai <details> supaya tertutup pada keadaan biasa —
          pekerjaan sehari-hari di halaman ini membaca daftar, bukan menambah. */}
      <details className="card mb-5 p-0" open={Boolean(satuParam(sp.galat))}>
        <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-extrabold tracking-tight">
          + Tambah siswa satu per satu
          <span className="ml-2 font-normal text-muted">
            — tanpa Excel, untuk siswa susulan atau pindahan
          </span>
        </summary>

        <form action={tambahPesertaAction} className="border-t border-line p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label" htmlFor="nama">
                Nama siswa <span className="text-danger">*</span>
              </label>
              <input className="input" id="nama" name="nama" required placeholder="Nama lengkap" />
            </div>

            <div>
              <label className="label" htmlFor="nisn">
                NISN <span className="text-danger">*</span>
              </label>
              <input
                className="input"
                id="nisn"
                name="nisn"
                required
                inputMode="numeric"
                pattern="\d{4,20}"
                placeholder="0071234567"
              />
              <p className="mt-1.5 text-xs text-muted">
                Angka 4–20 digit. Ini yang dipakai siswa untuk masuk.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="kelas">
                Kelas
              </label>
              {/* Daftar saran, BUKAN pilihan tertutup: kelas baru harus bisa
                  dibuat hanya dengan mengetiknya — itu yang diminta pengelola
                  ("nama kelas bisa ditambahkan"). Saran ini cuma mencegah salah
                  ketik pada kelas yang sudah ada. */}
              <input
                className="input"
                id="kelas"
                name="kelas"
                list="daftar-kelas"
                defaultValue={kelasDibuka}
                placeholder="X Teuku Umar"
              />
              <datalist id="daftar-kelas">
                {kelasTersedia.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
              <p className="mt-1.5 text-xs text-muted">
                Pilih dari daftar, atau ketik nama kelas baru.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="password">
                Kata sandi <span className="text-danger">*</span>
              </label>
              <input
                className="input"
                id="password"
                name="password"
                required
                minLength={4}
                placeholder="Minimal 4 karakter"
              />
              <p className="mt-1.5 text-xs text-muted">
                Catat dulu — sesudah disimpan, sandinya tidak bisa dilihat lagi.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="asal_sekolah">
                Asal sekolah
              </label>
              <input
                className="input"
                id="asal_sekolah"
                name="asal_sekolah"
                placeholder="SMA Islam Plus Adzkia"
              />
            </div>

            <div>
              <label className="label" htmlFor="no_hp">
                No. HP
              </label>
              <input className="input" id="no_hp" name="no_hp" placeholder="08…" />
            </div>
          </div>

          <button className="btn btn-primary mt-5" type="submit">
            Tambah siswa
          </button>
        </form>
      </details>

      {/* ---------- Pencarian ---------- */}
      <form method="get" className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-56 flex-1">
          <label className="label" htmlFor="cari">
            Cari peserta
          </label>
          <input
            className="input"
            id="cari"
            name="cari"
            defaultValue={cari}
            placeholder="Nama, NISN, kelas, atau asal sekolah…"
          />
        </div>
        <button className="btn btn-primary" type="submit">
          Cari
        </button>
        {cari && (
          <Link className="btn btn-ghost" href="/admin/peserta">
            Bersihkan
          </Link>
        )}
        {/* "Kelas" di sini menghitung KELAS SUNGGUHAN saja — kelompok demo dan
            kelompok "Tanpa kelas" tidak ikut, sebab keduanya bukan kelas dan
            memasukkannya membuat angka ini tidak cocok dengan daftar absen
            sekolah. */}
        <span className="ml-auto text-xs text-muted">
          {jumlahAkun} akun · {kelompok.filter((g) => !g.demo && !g.tanpaKelas).length} kelas
        </span>
      </form>

      {kelompok.length === 0 ? (
        <EmptyState
          title="Peserta tidak ditemukan"
          description={
            cari
              ? `Tidak ada akun yang cocok dengan "${cari}". Coba kata kunci lain.`
              : "Belum ada akun yang mendaftar."
          }
        />
      ) : (
        <div className="space-y-3">
          {kelompok.map((g) => {
            const terbuka = semuaTerbuka || kelasDibuka === g.kelas;
            return (
              <section key={g.kelas} className="card overflow-hidden p-0">
                {/* Kepala kelas: satu baris, dan seluruh barisnya bisa diketuk.
                    Alamatnya membawa nama kelas supaya tautannya bisa dibagikan
                    dan supaya tombol "kembali" peramban bekerja seperti yang
                    diharapkan. */}
                <Link
                  href={
                    terbuka && !semuaTerbuka
                      ? "/admin/peserta"
                      : `/admin/peserta?kelas=${encodeURIComponent(g.kelas)}`
                  }
                  aria-expanded={terbuka}
                  className={`flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-muted/60 ${
                    terbuka ? "bg-surface-muted/50" : ""
                  }`}
                >
                  <span className="text-xs text-muted" aria-hidden>
                    {terbuka ? "▾" : "▸"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold tracking-tight">
                      {g.kelas}
                      {g.demo && (
                        <span className="ml-2 align-middle">
                          <Badge tone="muted">NISN {AWALAN_NISN_DEMO}…</Badge>
                        </span>
                      )}
                    </span>
                    {g.demo && (
                      <span className="mt-0.5 block text-xs text-muted">
                        Akun wali kelas, guru, dan uji coba — sengaja tidak dihitung sebagai kelas.
                      </span>
                    )}
                    {g.tanpaKelas && (
                      <span className="mt-0.5 block text-xs text-warning">
                        Kelasnya belum diisi. Perbaiki lewat Impor Excel supaya masuk daftar kelas.
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-bold tabular-nums text-muted">
                    {g.anggota.length} siswa
                  </span>
                </Link>

                {terbuka && (
                  <ul className="divide-y divide-line border-t border-line">
                    {g.anggota.map((u) => (
                      <li
                        key={u.id}
                        className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 transition-colors hover:bg-surface-muted/40"
                      >
                        <div className="min-w-48 flex-1">
                          <Link
                            className="font-semibold text-brand hover:underline"
                            href={`/admin/peserta/${u.id}`}
                          >
                            {u.nama}
                          </Link>
                          <p className="text-xs text-muted">
                            <span className="font-mono">{u.nisn || "tanpa NISN"}</span>
                            {u.asal_sekolah ? ` · ${u.asal_sekolah}` : ""}
                            {u.no_hp ? ` · ${u.no_hp}` : ""}
                            {!u.nisn ? ` · ${identitasPeserta(u.email)}` : ""}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-5 text-xs text-muted">
                          <span className="whitespace-nowrap">
                            <strong className="text-sm tabular-nums text-foreground">
                              {u.jumlah_tryout}
                            </strong>{" "}
                            tryout
                          </span>
                          <span className="whitespace-nowrap">
                            rata-rata{" "}
                            <strong className="text-sm tabular-nums text-foreground">
                              {u.rata_skor != null ? Math.round(u.rata_skor) : "—"}
                            </strong>
                          </span>
                          <span className="hidden whitespace-nowrap lg:inline">
                            {tanggalIndo(u.created_at, false)}
                          </span>
                        </div>

                        {u.role === "admin" && <Badge tone="brand">Admin</Badge>}

                        <MenuAksi label={`Aksi akun ${u.nama}`} judul={u.nama}>
                          <Link
                            role="menuitem"
                            className={nadaMenu()}
                            href={`/admin/peserta/${u.id}`}
                          >
                            Lihat pengerjaan
                          </Link>

                          {u.id === admin.id ? (
                            <p className={`${nadaMenu()} text-muted!`}>Ini akun kamu sendiri</p>
                          ) : (
                            <>
                              <form action={setPeranAction}>
                                <input type="hidden" name="id" value={u.id} />
                                <input
                                  type="hidden"
                                  name="peran"
                                  value={u.role === "admin" ? "siswa" : "admin"}
                                />
                                <input type="hidden" name="kembali_ke" value="/admin/peserta" />
                                <TombolKonfirmasi
                                  className={nadaMenu(u.role === "admin" ? "awas" : "biasa")}
                                  pesan={
                                    u.role === "admin"
                                      ? `Cabut peran admin dari ${u.nama}?`
                                      : `Angkat ${u.nama} menjadi admin? Dia akan bisa mengelola paket dan soal.`
                                  }
                                >
                                  {u.role === "admin" ? "Turunkan jadi siswa" : "Angkat jadi admin"}
                                </TombolKonfirmasi>
                              </form>

                              <PemisahMenu />

                              <form action={hapusPesertaAction}>
                                <input type="hidden" name="id" value={u.id} />
                                <input type="hidden" name="kembali_ke" value="/admin/peserta" />
                                <TombolKonfirmasi
                                  className={nadaMenu("bahaya")}
                                  pesan={konfirmasiHapusAkun(u.nama, { tryout: u.jumlah_tryout })}
                                >
                                  Hapus akun
                                </TombolKonfirmasi>
                              </form>
                            </>
                          )}
                        </MenuAksi>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-muted">
        Menghapus akun bersifat permanen: pengerjaan tryout, jawaban, hasil, sesi Warung, catatan
        pelanggaran, dan izin susulan milik peserta itu ikut terhapus. Tidak ada tong sampah —
        salin dulu <code>data/adzkia.db</code> bila mau membersihkan banyak akun sekaligus.
      </p>
    </>
  );
}
