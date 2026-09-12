import { SUBTES, TOTAL_MENIT, TOTAL_SOAL, type Subtes } from "@/lib/tryout/snbt";
import { Section, SectionHeading } from "./Section";

/** Deskripsi singkat tiap subtes (angka soal & menit tetap diambil dari konstanta SUBTES). */
const RINGKASAN: Record<string, string> = {
  PU: "Logika, deret, sebab-akibat, dan penalaran dari grafik atau tabel.",
  PPU: "Kosakata, hubungan kata, dan wawasan umum yang sering keluar di UTBK.",
  PBM: "Memahami isi bacaan sekaligus menyunting ejaan dan kalimat efektif.",
  PK: "Aritmetika, aljabar, geometri, dan statistika dasar dengan waktu ketat.",
  LBIND: "Menarik simpulan, menilai argumen, dan menemukan gagasan pada teks panjang.",
  LBING: "Reading comprehension: main idea, inferensi, dan makna kata dalam konteks.",
  PM: "Matematika kontekstual: soal cerita yang menuntut pemodelan, bukan rumus hafalan.",
};

function KartuSubtes({ s, urutan }: { s: Subtes; urutan: number }) {
  const isTps = s.kelompok === "TPS";
  return (
    <div className="card flex h-full flex-col p-5 transition-colors hover:border-brand/40">
      <div className="flex items-center gap-3">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-extrabold ${
            isTps ? "bg-brand-soft text-brand" : "bg-accent-soft text-accent"
          }`}
          aria-hidden
        >
          {urutan}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold tracking-tight">{s.nama}</p>
          <p className="text-xs font-semibold text-muted">{s.kode}</p>
        </div>
      </div>

      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{RINGKASAN[s.kode]}</p>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3 text-xs font-semibold">
        <span className="rounded-full bg-surface-muted px-2.5 py-1 text-muted">
          {s.jumlahSoal} soal
        </span>
        <span className="rounded-full bg-surface-muted px-2.5 py-1 text-muted">
          {s.durasiMenit} menit
        </span>
      </div>
    </div>
  );
}

export function DaftarSubtes() {
  const tps = SUBTES.filter((s) => s.kelompok === "TPS");
  const literasi = SUBTES.filter((s) => s.kelompok === "Literasi");

  // Jalur terang/krem-nya ditentukan halaman yang memuat, bukan di sini —
  // /utbk menyelang-nyelingkannya dengan bagian lain.
  return (
    <Section id="subtes">
      <SectionHeading
        eyebrow="Struktur ujian"
        title={`${SUBTES.length} subtes, sama persis dengan UTBK-SNBT`}
        description={`Total ${TOTAL_SOAL} soal dikerjakan dalam ${TOTAL_MENIT} menit. Setiap subtes punya waktunya sendiri — habis waktu, sistem otomatis pindah ke subtes berikutnya.`}
      />

      <div className="space-y-8">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-brand">
              Tes Potensi Skolastik
            </h3>
            <span className="h-px flex-1 bg-[var(--border)]" aria-hidden />
            <span className="text-xs font-semibold text-muted">
              {tps.reduce((a, s) => a + s.jumlahSoal, 0)} soal ·{" "}
              {tps.reduce((a, s) => a + s.durasiMenit, 0)} menit
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tps.map((s) => (
              <KartuSubtes key={s.kode} s={s} urutan={SUBTES.indexOf(s) + 1} />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center gap-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wide text-accent">
              Tes Literasi &amp; Penalaran Matematika
            </h3>
            <span className="h-px flex-1 bg-[var(--border)]" aria-hidden />
            <span className="text-xs font-semibold text-muted">
              {literasi.reduce((a, s) => a + s.jumlahSoal, 0)} soal ·{" "}
              {literasi.reduce((a, s) => a + s.durasiMenit, 0)} menit
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {literasi.map((s) => (
              <KartuSubtes key={s.kode} s={s} urutan={SUBTES.indexOf(s) + 1} />
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
