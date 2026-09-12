import type { ReactNode } from "react";
import { Section, SectionHeading } from "./Section";

function Ikon({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-soft text-brand" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        {children}
      </svg>
    </span>
  );
}

const ITEM = [
  {
    judul: "Aturan main sama seperti UTBK asli",
    isi: "Timer berjalan per subtes dan tidak bisa dijeda. Begitu satu subtes selesai, kamu tidak bisa mundur ke subtes sebelumnya — persis seperti di lokasi ujian.",
    ikon: (
      <>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2M9 2h6" />
      </>
    ),
  },
  {
    judul: "Penilaian IRT, bukan sekadar hitung benar",
    isi: "Soal yang sulit bernilai lebih besar daripada soal mudah. Skormu dihitung dengan Item Response Theory sehingga lebih dekat dengan cara UTBK menilai.",
    ikon: (
      <>
        <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
      </>
    ),
  },
  {
    judul: "Pembahasan lengkap tiap soal",
    isi: "Setiap butir punya penjelasan langkah demi langkah, bukan cuma kunci jawaban. Kamu tahu di mana logikamu meleset dan bagaimana seharusnya.",
    ikon: (
      <>
        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22z" />
        <path d="M8 7h8M8 11h5" />
      </>
    ),
  },
  {
    judul: "Peringkat antar peserta",
    isi: "Lihat posisimu di antara seluruh peserta tryout dan per subtes. Bandingkan perkembanganmu dari satu paket ke paket berikutnya.",
    ikon: (
      <>
        <path d="M8 21V11M16 21V7M12 21V3" />
        <path d="M3 21h18" />
      </>
    ),
  },
  {
    judul: "Rekomendasi kampus & prodi",
    isi: "Skor akhirmu dicocokkan dengan data nilai penerimaan tiap program studi, lalu ditampilkan sebagai peluang: aman, bersaing, atau menantang.",
    ikon: (
      <>
        <path d="M12 3 2 8l10 5 10-5z" />
        <path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5" />
      </>
    ),
  },
  {
    judul: "Bisa dikerjakan dari HP",
    isi: "Tampilan menyesuaikan layar ponsel. Jawaban tersimpan otomatis, jadi koneksi yang sempat putus tidak menghapus pekerjaanmu.",
    ikon: (
      <>
        <rect x="6" y="2" width="12" height="20" rx="2.5" />
        <path d="M11 18h2" />
      </>
    ),
  },
];

export function Keunggulan() {
  return (
    <Section id="keunggulan">
      <SectionHeading
        eyebrow="Kenapa ADZKIA SMART"
        title="Bukan sekadar kumpulan soal latihan"
        description="Yang membedakan tryout ini adalah pengalaman ujiannya dan laporan yang kamu terima sesudahnya."
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ITEM.map((k) => (
          <div key={k.judul} className="card p-6">
            <Ikon>{k.ikon}</Ikon>
            <h3 className="mt-4 text-base font-extrabold tracking-tight">{k.judul}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{k.isi}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
