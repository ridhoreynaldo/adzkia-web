import { SUBTES, TOTAL_MENIT, TOTAL_SOAL } from "@/lib/tryout/snbt";
import { Section, SectionHeading } from "./Section";

const TANYA = [
  {
    q: "Apakah tryout ini benar-benar gratis?",
    a: "Ya. Seluruh paket tryout yang dibuka untuk siswa SMA Islam Plus Adzkia dan calon peserta SNBT dapat dikerjakan tanpa biaya. Kamu hanya perlu mendaftar dengan email aktif.",
  },
  {
    q: "Bisakah satu paket dikerjakan lebih dari sekali?",
    a: "Satu paket hanya bisa dikerjakan satu kali supaya skormu jujur dan peringkat antar peserta tetap adil — sama seperti UTBK. Paket baru terbit secara berkala, jadi kamu tetap bisa mengukur perkembangan dari waktu ke waktu.",
  },
  {
    q: "Kapan hasilnya keluar?",
    a: "Langsung setelah subtes terakhir selesai. Skor IRT per subtes, peringkat, dan rekomendasi kampus muncul di halaman hasil tanpa menunggu koreksi manual.",
  },
  {
    q: "Apakah bisa dikerjakan lewat HP?",
    a: "Bisa. Halaman ujian dirancang untuk layar ponsel maupun laptop. Yang penting koneksi internetmu stabil karena jawaban disimpan otomatis setiap kali kamu memilih opsi.",
  },
  {
    q: "Apakah nilainya sama seperti UTBK asli?",
    a: `Skalanya dibuat menyerupai UTBK (0–1000 per subtes) dan dihitung dengan pendekatan IRT, tetapi tetap sebuah simulasi. Gunakan hasilnya untuk mengukur posisi dan menentukan materi yang perlu diperbaiki, bukan sebagai jaminan kelulusan.`,
  },
  {
    q: "Berapa lama waktu yang dibutuhkan sekali tryout?",
    a: `Satu paket penuh berisi ${TOTAL_SOAL} soal dari ${SUBTES.length} subtes dengan total ${TOTAL_MENIT} menit. Siapkan waktu tanpa gangguan supaya hasilnya menggambarkan kemampuanmu yang sebenarnya.`,
  },
];

export function Faq() {
  return (
    <Section id="faq">
      <SectionHeading
        eyebrow="Pertanyaan umum"
        title="Hal yang paling sering ditanyakan"
        description="Belum terjawab? Tanyakan langsung ke guru pembimbing di sekolah."
      />
      <div className="mx-auto max-w-3xl space-y-3">
        {TANYA.map((t) => (
          <details
            key={t.q}
            className="card group px-5 py-4 transition-colors open:border-brand/40 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold tracking-tight">
              <span>{t.q}</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 shrink-0 text-brand transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
