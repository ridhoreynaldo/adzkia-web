import {
  AjakanJalur,
  JudulBagian,
  KakiJalur,
  NavJalur,
  SampulJalur,
} from "@/components/landing/RangkaJalur";
import { SeksiKampus } from "@/components/landing/SeksiKampus";
import { getSession } from "@/lib/auth/auth";
import { jagaPortal } from "@/lib/admin/portal";
import {
  AMBANG_TOTAL_SKD,
  NILAI_MAKS_SKD,
  SUBTES_SKD,
  TOTAL_MENIT_SKD,
  TOTAL_SOAL_SKD,
} from "@/lib/tryout/skd";

export const metadata = {
  title: "SKD Kedinasan",
  description:
    `Latihan SKD Kedinasan SMA Islam Plus Adzkia: TWK, TIU, dan TKP dalam satu sesi ${TOTAL_MENIT_SKD} menit, ` +
    `dinilai dengan poin resmi dan passing grade ${SUBTES_SKD.map((s) => s.ambang).join("/")}.`,
};

/**
 * Halaman ini membaca sesi, jadi tidak boleh dipranatal jadi HTML statis.
 * Versi statisnya dulu selalu menampilkan tombol "MULAI SKD" dan "LOGIN ADMIN"
 * sekalipun siswa sudah masuk — terbaca seolah sesinya hilang, sehingga peserta
 * yang baru menuntaskan UTBK merasa harus mengetik NISN dan kata sandinya lagi
 * untuk pindah ke SKD.
 */
export const dynamic = "force-dynamic";

const LANGKAH = [
  {
    judul: "Masuk dengan NISN",
    isi: "Pakai NISN dan kata sandi dari sekolah. Namamu muncul otomatis, tidak perlu isi identitas lagi.",
  },
  {
    judul: "Baca tata tertib",
    isi: `Satu layar berisi ketentuan ujian. Centang persetujuan, lalu sesi ${TOTAL_MENIT_SKD} menit langsung berjalan.`,
  },
  {
    judul: `Kerjakan ${TOTAL_SOAL_SKD} soal`,
    isi: "Satu timer untuk semua soal. Bebas melompat antara TWK, TIU, dan TKP — persis seperti SKD di BKN.",
  },
  {
    judul: "Lihat kelulusanmu",
    isi: "Nilai tiap subtes dibandingkan terhadap passing grade, lengkap dengan peringkat dan pembahasan.",
  },
];

/**
 * Halaman muka jalur SKD Kedinasan.
 *
 * Ditata ulang 11 September 2026 mengikuti rupa halaman awal, dan rangkanya
 * kini DIBAGI dengan /utbk lewat `components/landing/RangkaJalur.tsx` — dulu
 * keduanya dua salinan terpisah yang mulai berbeda sendiri. Yang membedakan
 * tinggal warnanya (maroon–oranye lewat `tema-skd`) dan penekanan pada passing
 * grade, yang memang tidak ada di UTBK.
 */
export default async function HalamanSkd() {
  await jagaPortal("skd");

  const user = await getSession();
  const siswaMasuk = user != null && user.role === "siswa";

  /*
    Peserta yang sudah masuk tidak perlu mampir ke halaman login lagi: akunnya
    sama untuk kedua jalur, jadi tombolnya langsung mengantar ke paket SKD.
  */
  const tujuanMulai = siswaMasuk
    ? "/mulai?jalur=skd"
    : user?.role === "admin"
      ? "/admin"
      : "/skd/login";
  const labelMulai =
    user?.role === "admin" ? "Panel Admin" : siswaMasuk ? "Lanjut ke SKD" : "Mulai SKD";

  return (
    /*
      Dua kelas sekaligus: `kertas-landing` membawa kertas krem dan tombol
      kapsul, `tema-skd` membawa maroon. Yang menjaga keduanya tidak saling
      menimpa adalah blok `.kertas-landing.tema-skd` di globals.css — jangan
      dilepas, tanpa itu halaman ini berubah teal.
    */
    <div className="kertas-landing tema-skd flex min-h-dvh flex-col bg-background">
      <NavJalur jalur="skd" user={user} tujuanMulai={tujuanMulai} labelMulai={labelMulai} />

      <main className="flex-1">
        <SampulJalur
          jalur="skd"
          kicker="SKD Kedinasan · SMA Islam Plus Adzkia"
          judul="Latihan SKD dengan aturan yang tidak dilunakkan."
          keterangan={`${TOTAL_SOAL_SKD} soal TWK, TIU, dan TKP dikerjakan dalam satu sesi ${TOTAL_MENIT_SKD} menit — tanpa jeda, tanpa timer per subtes. Nilainya memakai poin resmi dan dibandingkan terhadap ambang batas, jadi kamu tahu lulus atau belum sebelum hari pengumuman.`}
          tombol={[
            { href: tujuanMulai, label: labelMulai, utama: true },
            { href: "/utbk", label: "Lihat jalur UTBK" },
          ]}
          angka={[
            { nilai: String(SUBTES_SKD.length), label: "subtes", ket: "TWK · TIU · TKP" },
            { nilai: String(TOTAL_SOAL_SKD), label: "soal", ket: "Satu paket penuh" },
            { nilai: String(TOTAL_MENIT_SKD), label: "menit", ket: "Satu sesi tanpa jeda" },
            { nilai: String(NILAI_MAKS_SKD), label: "nilai maksimal", ket: "Sistem poin resmi" },
          ]}
        />

        {/* ---------- Struktur subtes (krem) ---------- */}
        <section id="subtes" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:py-20">
          <JudulBagian
            kicker="Struktur ujian"
            judul={`Tiga subtes, satu sesi ${TOTAL_MENIT_SKD} menit`}
            isi="Tidak ada waktu terpisah per subtes. Kamu sendiri yang mengatur mau berapa lama di TWK, TIU, atau TKP — dan itulah keterampilan yang ikut diuji di SKD sungguhan."
          />

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {SUBTES_SKD.map((s, i) => (
              <div key={s.kode} className="kartu-angkat card flex flex-col p-6">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-soft text-sm font-extrabold text-brand">
                    {i + 1}
                  </span>
                  <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
                    {s.kode}
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-extrabold leading-snug tracking-tight">
                  {s.nama}
                </h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">{s.keterangan}</p>

                <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted">Soal</dt>
                    <dd className="text-base font-extrabold tabular-nums">{s.jumlahSoal}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted">Maks</dt>
                    <dd className="text-base font-extrabold tabular-nums">{s.nilaiMaks}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted">Ambang</dt>
                    <dd className="text-base font-extrabold tabular-nums text-accent">{s.ambang}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Cara penilaian (putih) ---------- */}
        <div className="pita-terang">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
            <JudulBagian
              kicker="Cara penilaian"
              judul="Poin resmi, bukan sekadar benar-salah"
              isi={`Nilai tertinggi ${NILAI_MAKS_SKD}, ambang totalnya ${AMBANG_TOTAL_SKD} — tetapi total tinggi saja tidak pernah cukup.`}
            />

            <div className="mt-9 grid gap-5 md:grid-cols-3">
              <div className="kartu-angkat card border-brand/25 p-6">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-brand">
                  TWK &amp; TIU
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Jawaban benar bernilai <strong className="text-foreground">5 poin</strong>.
                  Jawaban salah maupun yang dikosongkan sama-sama bernilai{" "}
                  <strong className="text-foreground">0</strong> — menebak tidak merugikan.
                </p>
              </div>

              <div className="kartu-angkat card border-accent/30 p-6">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-accent">TKP</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Tidak ada jawaban salah. Setiap pilihan punya nilainya sendiri{" "}
                  <strong className="text-foreground">1 sampai 5</strong>; hanya soal yang tidak
                  dijawab yang bernilai 0. Pilih yang paling mencerminkan sikap terbaik.
                </p>
              </div>

              <div className="kartu-angkat card border-brand/25 p-6">
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-brand">
                  Passing grade
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Lulus bila <strong className="text-foreground">ketiga</strong> subtes mencapai
                  ambangnya: TWK {SUBTES_SKD[0].ambang}, TIU {SUBTES_SKD[1].ambang}, TKP{" "}
                  {SUBTES_SKD[2].ambang}. Total tinggi saja tidak cukup.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- Sekolah kedinasan (alas putihnya sendiri) ---------- */}
        <SeksiKampus jalur="skd" />

        {/* ---------- Alurnya (krem) ---------- */}
        <section id="alur" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 sm:py-20">
          <JudulBagian
            kicker="Alurnya"
            judul="Empat langkah, selesai dalam satu duduk"
            isi="Tidak ada berkas yang perlu diunggah dan tidak ada nilai yang dihitung manual."
          />

          <ol className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {LANGKAH.map((l, i) => (
              <li key={l.judul} className="kartu-angkat card p-6">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand text-sm font-extrabold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-extrabold tracking-tight">{l.judul}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{l.isi}</p>
              </li>
            ))}
          </ol>
        </section>

        <AjakanJalur
          judul="Coba satu sesi, lalu lihat sudah lewat ambang atau belum."
          isi={
            siswaMasuk
              ? `Kamu sudah masuk sebagai ${user!.nama}. Kerjakan ${TOTAL_SOAL_SKD} soal dengan aturan hari-H, dan dapatkan nilai per subtes beserta status kelulusanmu di hari yang sama.`
              : `Masuk lewat akunmu, kerjakan ${TOTAL_SOAL_SKD} soal dengan aturan hari-H, dan dapatkan nilai per subtes beserta status kelulusanmu di hari yang sama.`
          }
          tombol={{ href: tujuanMulai, label: labelMulai }}
        />
      </main>

      <KakiJalur
        jalur="skd"
        ringkas={`Latihan SKD Kedinasan resmi SMA Islam Plus Adzkia: ${SUBTES_SKD.length} subtes, ${TOTAL_SOAL_SKD} soal, satu sesi ${TOTAL_MENIT_SKD} menit, dinilai dengan poin resmi dan passing grade.`}
      />
    </div>
  );
}
