import { KisiKampus } from "./LencanaKampus";
import { SUBTES_SKD, TOTAL_MENIT_SKD } from "@/lib/tryout/skd";

/** "65/80/156" — dirangkai dari konstanta supaya tidak pernah usang. */
const AMBANG_RINGKAS = SUBTES_SKD.map((s) => s.ambang).join("/");

/**
 * Bagian "kampus tujuan" pada halaman jalur. Kalimat pengantarnya menyesuaikan
 * jalur karena yang diincar peserta UTBK dan peserta SKD memang berbeda.
 */
export function SeksiKampus({ jalur }: { jalur: "utbk" | "skd" }) {
  const skd = jalur === "skd";

  return (
    <section id="kampus" className="border-y border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">
          {skd ? "Sekolah kedinasan" : "Kampus tujuan"}
        </p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {skd
            ? "Disiapkan untuk menembus sekolah kedinasan ini"
            : "Disiapkan untuk menembus kampus-kampus ini"}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {skd
            ? `Seluruh sekolah kedinasan berikut menyaring calon taruna lewat SKD dengan aturan yang sama: TWK, TIU, dan TKP, satu sesi ${TOTAL_MENIT_SKD} menit, dan passing grade ${AMBANG_RINGKAS}.`
            : "Nilai IRT dari tryout ini memakai skala yang sama dengan UTBK asli, sehingga posisimu terhadap kampus-kampus berikut bisa langsung terbaca di laporan hasil."}
        </p>

        <div className="mt-8">
          <KisiKampus jalur={jalur} />
        </div>

        <p className="mt-6 text-xs text-muted">
          {skd
            ? "Daftar ini contoh yang paling sering dituju; sekolah kedinasan lain yang memakai SKD tetap terbantu oleh latihan yang sama."
            : "Daftar ini contoh kampus yang paling sering dituju peserta. Pilihan program studimu sendiri diisi sebelum tryout dimulai, dan bisa dari kampus mana pun."}
        </p>
      </div>
    </section>
  );
}
