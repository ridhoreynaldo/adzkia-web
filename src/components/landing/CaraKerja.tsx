import { SUBTES, TOTAL_MENIT } from "@/lib/tryout/snbt";
import { Section, SectionHeading } from "./Section";

const LANGKAH = [
  {
    judul: "Daftar",
    isi: "Buat akun dengan nama, email, dan asal sekolah. Gratis, tanpa biaya pendaftaran.",
  },
  {
    judul: "Pilih paket tryout",
    isi: "Buka daftar paket yang sedang dibuka, baca aturannya, lalu mulai saat kamu benar-benar siap.",
  },
  {
    judul: `Kerjakan ${SUBTES.length} subtes`,
    isi: `Total ${TOTAL_MENIT} menit dengan timer terpisah tiap subtes, berurutan seperti UTBK asli.`,
  },
  {
    judul: "Terima skor IRT + rekomendasi kampus",
    isi: "Begitu subtes terakhir selesai, skor per subtes, peringkat, pembahasan, dan rekomendasi prodi langsung terbuka.",
  },
];

export function CaraKerja() {
  return (
    <Section id="alur">
      <SectionHeading
        eyebrow="Cara kerja"
        title="Empat langkah sampai tahu peluang kampusmu"
        description="Tidak ada berkas yang perlu diunggah dan tidak ada nilai yang dihitung manual."
      />

      <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {LANGKAH.map((l, i) => (
          <li key={l.judul} className="card relative p-6">
            <span
              className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-sm font-extrabold text-white"
              aria-hidden
            >
              {i + 1}
            </span>
            <h3 className="mt-4 text-base font-extrabold tracking-tight">{l.judul}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{l.isi}</p>
            {i < LANGKAH.length - 1 && (
              <span
                className="absolute right-0 top-11 hidden h-px w-5 translate-x-full bg-[var(--border)] lg:block"
                aria-hidden
              />
            )}
          </li>
        ))}
      </ol>
    </Section>
  );
}
