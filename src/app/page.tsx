import Link from "next/link";
import { Brand } from "@/components/Brand";
import { GemboksKecil } from "@/components/portal/Gemboks";
import { LogoMitra } from "@/components/landing/LogoMitra";
import { PintuPengelola } from "@/components/PintuPengelola";
import { SlideKampus } from "@/components/landing/SlideKampus";
import { MenuUtama } from "@/components/landing/MenuUtama";
import { IkonGrafik, IkonJam, IkonLembar } from "@/components/dashboard/IkonBeranda";
import { IkonPerisai } from "@/components/language/IkonIelts";
import { getSession } from "@/lib/auth/auth";
import { fiturLanguageAktif } from "@/lib/ielts/language";
import { semuaStatusPortal } from "@/lib/admin/portal";
import { SUBTES, TOTAL_MENIT, TOTAL_SOAL } from "@/lib/tryout/snbt";
import { SUBTES_SKD, TOTAL_MENIT_SKD, TOTAL_SOAL_SKD } from "@/lib/tryout/skd";

export const metadata = {
  title: "ADZKIA SMART — Latihan UTBK-SNBT & SKD Kedinasan SMA Islam Plus Adzkia",
  description:
    "Dua jalur latihan resmi SMA Islam Plus Adzkia: Tryout Real UTBK-SNBT dengan penilaian IRT, dan SKD Kedinasan dengan sistem poin serta passing grade.",
};

/**
 * Halaman awal ADZKIA SMART.
 *
 * Ditata ulang 11 September 2026 mengikuti rujukan rupa yang diberikan
 * pengelola: kertas krem hangat, foto besar bersudut membulat alih-alih sampul
 * gelap selebar layar, bilah ringkasan yang menindih tepi bawah foto, jalur isi
 * berselang terang–krem, dan tombol berbentuk kapsul.
 *
 * Yang TIDAK ikut berubah: isi halamannya tetap satu keputusan saja — pilih
 * jalur. Halaman ini dibuka siswa lewat HP beberapa menit sebelum ujian, jadi
 * dua kartu jalur tetap yang paling besar dan paling mudah ditekan.
 */

/* ==========================================================================
   Potongan kecil khusus halaman ini
   ========================================================================== */

/** Satu kolom pada bilah yang menindih tepi bawah sampul. */
function KolomBilah({
  ikon,
  label,
  sub,
}: {
  ikon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
        {ikon}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-[13px] font-extrabold tracking-tight">{label}</span>
        <span className="block text-[11px] text-muted">{sub}</span>
      </span>
    </div>
  );
}

/**
 * Bagian berselang: foto besar bersudut membulat di satu sisi, tulisan di sisi
 * lain. `balik` menukar sisinya — tetapi di layar HP keduanya selalu bertumpuk
 * dengan foto lebih dulu, sebab tulisan yang mendahului fotonya membuat
 * halaman terbaca seperti daftar, bukan cerita.
 *
 * Sejak dua kartu jalur dicabut (11 September 2026, atas permintaan pengelola:
 * tombolnya terlalu banyak), bagian inilah yang memikul dua keterangan yang
 * dulu hanya ada di kartu itu — angka subtes/soal/menit, dan tanda bahwa
 * portal jalurnya sedang dikunci. Keduanya TIDAK boleh ikut hilang: siswa
 * berhak tahu berapa lama ujiannya dan apakah pintunya sedang tertutup
 * SEBELUM menekan, bukan sesudah mendarat di layar terkunci.
 */
function BagianBerselang({
  foto,
  alt,
  kicker,
  judul,
  isi,
  angka,
  poin,
  cta,
  tema,
  terkunci = false,
  balik = false,
}: {
  foto: string;
  alt: string;
  kicker: string;
  judul: string;
  isi: string;
  angka: { label: string; nilai: string }[];
  poin: string[];
  cta: { href: string; label: string };
  /** "utbk" memakai tema tosca bawaan; "skd" memakai maroon–oranye. */
  tema: "utbk" | "skd";
  /** Portal jalur ini sedang ditutup pengelola. */
  terkunci?: boolean;
  balik?: boolean;
}) {
  return (
    <div
      className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${
        tema === "skd" ? "tema-skd" : ""
      }`}
    >
      <div className={`foto-landing relative aspect-[4/3] ${balik ? "lg:order-2" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foto} alt={alt} className="h-full w-full object-cover object-center" />
      </div>

      <div className={balik ? "lg:order-1" : ""}>
        <p className="flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
          {kicker}
          {terkunci && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 tracking-widest text-danger">
              <GemboksKecil terkunci className="h-3.5 w-3.5" />
              Dikunci
            </span>
          )}
        </p>

        <h2 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-[2rem]">
          {judul}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">{isi}</p>

        <dl className="mt-6 grid max-w-sm grid-cols-3 gap-3 border-y border-line py-4">
          {angka.map((a) => (
            <div key={a.label}>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {a.label}
              </dt>
              <dd
                className="mt-0.5 text-xl font-extrabold tabular-nums"
                style={{ color: "var(--brand)" }}
              >
                {a.nilai}
              </dd>
            </div>
          ))}
        </dl>

        <ul className="mt-5 space-y-2.5">
          {poin.map((p) => (
            <li key={p} className="flex gap-3 text-sm leading-relaxed">
              <span
                aria-hidden
                className="mt-1.5 size-2 shrink-0 rounded-full"
                style={{ background: "var(--brand)" }}
              />
              <span>{p}</span>
            </li>
          ))}
        </ul>

        <Link href={cta.href} className="btn btn-primary mt-7">
          {cta.label}
        </Link>
      </div>
    </div>
  );
}

/* ==========================================================================
   Halaman
   ========================================================================== */

export default async function Home() {
  const user = await getSession();
  // Language Skill masih dibangun: tombolnya hanya digambar di komputer
  // pengembang, tidak pernah di pintarbersamaadzkia.com. Aturannya ada di
  // src/lib/language-konstanta.ts.
  const languageAktif = await fiturLanguageAktif();
  // Jalur yang sedang ditutup pengelola ditandai langsung di kartunya, supaya
  // siswa tahu sebelum menekan — bukan baru sesudah mendarat di layar terkunci.
  const status = await semuaStatusPortal();
  const kunci = {
    utbk: status.find((s) => s.jalur === "utbk")!.terkunci,
    skd: status.find((s) => s.jalur === "skd")!.terkunci,
  };

  /*
    Isi menu tiga garis, urutannya seperti diminta pengelola. "Masuk" paling
    atas dan disorot: itu yang dicari siswa beberapa menit sebelum ujian.
    Labelnya menyesuaikan sesi yang sedang berjalan — siswa yang sudah masuk
    tidak perlu ditawari "Masuk" lagi.
  */
  const pintuMasuk = user
    ? user.role === "admin"
      ? { href: "/admin", label: "Panel Admin", ket: "Kelola paket dan peserta" }
      : { href: "/dashboard", label: "Beranda Saya", ket: "Capaian dan tryout kamu" }
    : { href: "/login", label: "Masuk", ket: "Pakai NISN dari sekolah" };

  const butirMenu = [
    { ...pintuMasuk, sorot: true },
    { href: "/utbk", label: "UTBK-SNBT", ket: `${SUBTES.length} subtes · ${TOTAL_MENIT} menit` },
    {
      href: "/skd",
      label: "SKD Kedinasan",
      ket: `${SUBTES_SKD.length} subtes · ${TOTAL_MENIT_SKD} menit`,
    },
    { href: "/warung", label: "Warung Soal", ket: "Latihan butir lepas, tanpa timer" },
    ...(languageAktif
      ? [{ href: "/language", label: "Language Skill", ket: "Simulasi IELTS lengkap" }]
      : []),
  ];

  return (
    <div className="kertas-landing flex min-h-dvh flex-col bg-background">
      {/* ================= Bilah navigasi ================= */}
      <header>
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-5">
          <div className="flex min-w-0 shrink-0 items-center gap-3">
            <Brand href="/" keterangan="UTBK-SNBT & SKD Kedinasan" />
            <LogoMitra latar="terang" />
          </div>

          {/*
            Satu tombol tiga garis untuk SEMUA lebar layar — bukan deretan
            tautan yang menghilang di bawah 1024 piksel seperti sebelumnya.
            Ditetapkan pengelola 11 September 2026; alasannya ditulis di
            components/landing/MenuUtama.tsx.
          */}
          <div className="ml-auto shrink-0">
            <MenuUtama butir={butirMenu} />
          </div>
        </div>
      </header>

      {/* ================= Sampul bergambar ================= */}
      <div className="mx-auto w-full max-w-6xl px-4">
        <section className="sampul-landing">
          <SlideKampus gaya="tengah" />

          {/*
              Alas bawah yang lapang bukan sekadar rupa: di bawahnya berdiri
              baris nama kampus milik SlideKampus, dan di bawahnya lagi bilah
              ringkasan yang menindih sampul sedalam 64 piksel. Tulisan sampul
              harus berhenti di atas keduanya.
            */}
            <div className="relative z-10 px-5 pb-36 pt-16 text-center sm:px-10 sm:pt-24">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden />
              Platform latihan resmi SMA Islam Plus Adzkia
            </p>

            <h1 className="mx-auto mt-5 max-w-3xl text-[2rem] font-extrabold leading-[1.1] tracking-tight text-white drop-shadow-sm sm:text-6xl sm:leading-[1.04]">
              Satu tempat berlatih,
              <br />
              dua jalan menuju cita-cita.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-white/85 sm:text-lg">
              Menembus PTN lewat UTBK-SNBT, atau menembus sekolah kedinasan lewat SKD. Aturan,
              timer, dan cara penilaiannya kami buat sepersis mungkin dengan ujian aslinya.
            </p>

            {/*
              Bilah pilih-jalur berbentuk kapsul, mengikuti bentuk kolom cari
              pada rujukan rupanya. Isinya bukan kolom ketik melainkan dua
              tombol jalur: halaman ini tidak punya apa pun untuk dicari, dan
              yang dicari siswa memang cuma satu — jalurnya.
            */}
            <div className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-2 rounded-3xl bg-white/95 p-2 shadow-2xl backdrop-blur sm:flex-row sm:rounded-full">
              <Link
                href="/utbk"
                aria-disabled={kunci.utbk || undefined}
                className={`btn btn-primary flex-1 !py-3 text-[15px] font-extrabold ${
                  kunci.utbk ? "opacity-70 saturate-50" : ""
                }`}
              >
                {kunci.utbk && <GemboksKecil terkunci className="h-4 w-4" />}
                TryOut UTBK-SNBT
              </Link>
              <Link
                href="/skd"
                aria-disabled={kunci.skd || undefined}
                className={`tema-skd btn btn-primary flex-1 !py-3 text-[15px] font-extrabold ${
                  kunci.skd ? "opacity-70 saturate-50" : ""
                }`}
              >
                {kunci.skd && <GemboksKecil terkunci className="h-4 w-4" />}
                SKD Kedinasan
              </Link>
            </div>

            {user && (
              <p className="mt-5 text-sm font-semibold text-white/90">
                Kamu masuk sebagai <span className="text-white">{user.nama}</span>.
              </p>
            )}
          </div>
        </section>

        {/* ---- Bilah ringkasan yang menindih tepi bawah sampul ---- */}
        <section
          aria-label="Cara ADZKIA SMART bekerja"
          className="bilah-mengambang relative z-10 -mt-16 mx-2 grid gap-5 p-5 sm:mx-8 sm:grid-cols-2 sm:p-6 lg:grid-cols-4 lg:items-center"
        >
          <KolomBilah
            ikon={<IkonJam className="h-5 w-5" />}
            label="Timer di server"
            sub="Waktunya tidak bisa diakali"
          />
          <KolomBilah
            ikon={<IkonPerisai className="h-5 w-5" />}
            label="Pengawasan hari-H"
            sub="Wajib layar penuh, sekali jalan"
          />
          <KolomBilah
            ikon={<IkonGrafik className="h-5 w-5" />}
            label="Nilai hari itu juga"
            sub="IRT untuk UTBK, poin untuk SKD"
          />
          <KolomBilah
            ikon={<IkonLembar className="h-5 w-5" />}
            label="Pembahasan tiap butir"
            sub="Terbuka setelah sesi ditutup"
          />
        </section>
      </div>

      {/*
        Dua kartu jalur yang dulu berdiri di sini DICABUT 11 September 2026 atas
        permintaan pengelola: tombol "TryOut UTBK-SNBT" dan "SKD Kedinasan"
        terbit empat kali dalam satu layar — di bilah kapsul sampul, di kartu
        ini, dan lagi di bagian berselang di bawahnya. Yang tersisa dua: bilah
        kapsul untuk yang sudah tahu mau ke mana, dan bagian berselang untuk
        yang masih menimbang.

        Angka subtes/soal/menit dan lencana "Dikunci" yang dulu hanya ada di
        kartu ini ikut pindah ke bagian berselang — keduanya keterangan, bukan
        hiasan, jadi tidak boleh ikut tercabut.
      */}

      {/* ================= Dua bagian berselang ================= */}
      <div className="pita-terang mt-14">
        <div className="mx-auto max-w-6xl space-y-16 px-4 py-16 sm:space-y-20 sm:py-20">
          <BagianBerselang
            tema="utbk"
            terkunci={kunci.utbk}
            angka={[
              { label: "Subtes", nilai: String(SUBTES.length) },
              { label: "Soal", nilai: String(TOTAL_SOAL) },
              { label: "Menit", nilai: String(TOTAL_MENIT) },
            ]}
            foto="/kampus/ui.jpg"
            alt="Gedung kampus perguruan tinggi negeri"
            kicker="Jalur UTBK-SNBT"
            judul="Berlatih di ruang yang dibuat seperti hari-H"
            isi="Tujuh subtes dijalankan berurutan dengan timer terpisah yang berdetak di server, bukan di peramban. Begitu satu subtes ditutup, waktunya tidak dikembalikan — persis seperti di lokasi ujian."
            poin={[
              "Penilaian IRT: butir yang jarang dijawab benar bernilai lebih tinggi, sama seperti UTBK.",
              "Ujian wajib layar penuh; berpindah tab atau jendela lain dicatat dan bisa menggugurkan.",
              "Begitu sesi ditutup, nilai, peringkat, dan rekomendasi kampus langsung terbaca.",
            ]}
            cta={{ href: "/utbk", label: "Lihat jadwal TryOut" }}
          />

          <BagianBerselang
            balik
            tema="skd"
            terkunci={kunci.skd}
            angka={[
              { label: "Subtes", nilai: String(SUBTES_SKD.length) },
              { label: "Soal", nilai: String(TOTAL_SOAL_SKD) },
              { label: "Menit", nilai: String(TOTAL_MENIT_SKD) },
            ]}
            foto="/kampus/pkn-stan.jpg"
            alt="Gedung sekolah kedinasan"
            kicker="Jalur SKD Kedinasan"
            judul="Poin resmi dan passing grade, bukan sekadar jumlah benar"
            isi={`TWK, TIU, dan TKP dikerjakan dalam satu sesi ${TOTAL_MENIT_SKD} menit. Nilainya dihitung dengan aturan poin resmi — termasuk TKP yang tiap pilihannya berbobot berbeda — lalu dibandingkan terhadap ambang kelulusan tiap subtes.`}
            poin={[
              "Ambang batas dipisah per subtes, jadi terlihat mana yang masih menyandera nilai akhir.",
              "Satu sesi tanpa jeda, sama seperti SKD di lokasi seleksi.",
              "Rekam jejaknya tersimpan terpisah dari nilai UTBK karena skalanya memang berbeda.",
            ]}
            cta={{ href: "/skd", label: "Lihat jadwal SKD" }}
          />
        </div>
      </div>

      {/* ================= Tiga kartu bergambar ================= */}
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
            Yang siswa dapat
          </p>
          <h2 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight sm:text-[2rem]">
            Bukan cuma nilai, tapi rekam jejak yang bisa dibaca
          </h2>
        </div>

        <div className="mt-9 grid gap-6 sm:grid-cols-3">
          {[
            {
              foto: "/kampus/itb.jpg",
              judul: "Aturan hari-H",
              isi: "Ujian wajib layar penuh, timer berjalan di server, dan berpindah tab atau jendela lain langsung menggugurkan — sama tegasnya dengan ujian sungguhan.",
            },
            {
              foto: "/kampus/ugm.jpg",
              judul: "Hasil di hari yang sama",
              isi: "Begitu sesi ditutup, nilaimu langsung dihitung beserta peringkat dan pembahasan tiap butir soal.",
            },
            {
              foto: "/kampus/its.jpg",
              judul: "Rekam jejak setahun",
              isi: "Semua tryout tersimpan di Capaianku, bisa diunduh untuk ditunjukkan ke wali kelas atau orang tua.",
            },
          ].map((k) => (
            <article key={k.judul}>
              <div className="foto-landing relative aspect-[5/4]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={k.foto} alt="" className="h-full w-full object-cover object-center" />
              </div>
              <h3 className="mt-4 text-base font-extrabold tracking-tight">{k.judul}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{k.isi}</p>
            </article>
          ))}
        </div>
      </div>

      {/*
        Pita "Selain tryout" (kartu Warung Soal dan Language Skill) DICABUT
        11 September 2026 atas permintaan pengelola — keduanya sekarang ada di
        menu tiga garis di kepala halaman, dan pengelola memilih halaman awal
        berhenti di situ: "cukup di bar garis 3 di atas aja halamannya."

        Tidak ada pintu yang hilang: kaki halaman di bawah ini tetap memuat
        keduanya, begitu pula menunya.
      */}

      {/* ================= Kaki halaman ================= */}
      <footer className="mt-auto border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-sm">
              <Brand href="/" keterangan="UTBK-SNBT & SKD Kedinasan" />
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Platform latihan resmi SMA Islam Plus Adzkia — TryOut Real UTBK-SNBT, SKD Kedinasan,
                Warung Soal, dan Language Skill dalam satu tempat.
              </p>
            </div>

            <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
              {[
                { href: "/utbk", label: "UTBK-SNBT" },
                { href: "/skd", label: "SKD Kedinasan" },
                { href: "/warung", label: "Warung Soal" },
                ...(languageAktif ? [{ href: "/language", label: "Language Skill" }] : []),
                { href: "/rankup", label: "Capaianku" },
                { href: "/to-pekan-ini", label: "TO Pekan Ini" },
              ].map((t) => (
                <Link key={t.href} href={t.href} className="text-muted hover:text-brand">
                  {t.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-8 border-t border-line pt-5 text-sm text-muted">
            <PintuPengelola>
              © {new Date().getFullYear()} SMA Islam Plus Adzkia · pintarbersamaadzkia.com
            </PintuPengelola>
          </div>
        </div>
      </footer>
    </div>
  );
}
