import { angka } from "./format";
import type { BarisSubtes } from "./RincianSubtes";

/** Saran belajar konkret per subtes UTBK-SNBT. */
const SARAN: Record<string, string[]> = {
  PU: [
    "Latih silogisme & penarikan kesimpulan 15 soal/hari, catat pola premis yang sering muncul.",
    "Untuk soal deret dan analitik, biasakan menulis ulang informasi jadi tabel sebelum menjawab.",
    "Targetkan 1 menit per soal supaya tidak tersendat di nomor sulit.",
  ],
  PPU: [
    "Perkuat kosakata, sinonim–antonim, dan hubungan kata lewat kartu hafalan 20 kata/hari.",
    "Baca artikel populer (sains, sejarah, ekonomi) 1 per hari lalu ringkas 3 kalimat.",
    "Hafalkan idiom dan penulisan kata baku yang sering keluar di UTBK.",
  ],
  PBM: [
    "Kuasai PUEBI: huruf kapital, tanda baca, kata baku, dan penulisan angka.",
    "Latih menyunting kalimat efektif — cari subjek-predikat, buang kata mubazir.",
    "Kerjakan soal ide pokok & kalimat penjelas dengan menandai kalimat utama tiap paragraf.",
  ],
  PK: [
    "Ulang konsep dasar: aljabar, perbandingan, aritmetika sosial, peluang, dan geometri dasar.",
    "Fokus pada soal 'cukup/tidak cukup informasi' — latihannya beda dari hitungan biasa.",
    "Kerjakan 20 soal per hari dengan stopwatch, evaluasi soal yang salah pada hari yang sama.",
  ],
  LBIND: [
    "Baca teks panjang (opini/berita/sastra) tiap hari, latih menangkap gagasan utama dengan cepat.",
    "Latih membedakan fakta vs opini dan menyimpulkan maksud penulis.",
    "Kerjakan soal berbasis stimulus panjang; baca pertanyaannya lebih dulu, baru bacaannya.",
  ],
  LBING: [
    "Tambah 15 kosakata akademik per hari, lengkap dengan contoh kalimat.",
    "Latih skimming & scanning: cari topic sentence tiap paragraf dalam 20 detik.",
    "Kerjakan soal inference dan main idea, bukan sekadar soal detail.",
  ],
  PM: [
    "Kuatkan penalaran berbasis konteks: baca soal cerita, ubah jadi model matematika.",
    "Ulang statistika dasar (rata-rata, median, modus, penyajian data) dan fungsi.",
    "Biasakan mengecek satuan & masuk akalnya jawaban sebelum pindah nomor.",
  ],
};

const SARAN_UMUM = [
  "Ikuti tryout rutin setiap pekan agar terbiasa dengan tekanan waktu 195 menit.",
  "Bedah ulang setiap soal yang salah pada hari yang sama, jangan menumpuk.",
  "Jangan tinggalkan soal kosong — di UTBK-SNBT tidak ada pengurangan nilai untuk jawaban salah.",
];

/** Analisis otomatis: subtes terkuat, yang perlu diperbaiki, dan saran belajar. */
export function AnalisisSingkat({
  baris,
  totalSkor,
  rataTotal,
}: {
  baris: BarisSubtes[];
  totalSkor: number;
  rataTotal: number;
}) {
  if (baris.length === 0) return null;

  const urut = baris.slice().sort((a, b) => b.skor - a.skor);
  const terkuat = urut[0];
  const terlemah = urut[urut.length - 1];
  const diBawahRata = baris.filter((b) => b.skor < b.rata);
  const totalKosong = baris.reduce((a, b) => a + b.kosong, 0);

  const saranTerlemah = SARAN[terlemah.subtes] ?? SARAN_UMUM;

  return (
    <div className="card hindari-pecah p-5 sm:p-6">
      <h2 className="text-lg font-extrabold tracking-tight">Analisis Singkat</h2>
      <p className="mt-1 text-sm text-muted">
        Dibaca otomatis dari pola jawabanmu. Pakai ini sebagai peta latihan pekan depan.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-success/25 bg-success-soft p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-success">
            Subtes terkuat
          </p>
          <p className="mt-1 font-extrabold">{terkuat.nama}</p>
          <p className="mt-0.5 text-sm text-muted">
            Skor {angka(terkuat.skor)} · {terkuat.benar} dari {terkuat.jumlahSoal} soal benar
            {terkuat.skor >= terkuat.rata
              ? ` · ${angka(terkuat.skor - terkuat.rata)} poin di atas rata-rata.`
              : "."}
          </p>
          <p className="mt-2 text-sm">
            Pertahankan ritme di subtes ini — cukup 1 sesi latihan pemeliharaan per pekan.
          </p>
        </div>

        <div className="rounded-xl border border-danger/25 bg-danger-soft p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-danger">
            Perlu diperbaiki
          </p>
          <p className="mt-1 font-extrabold">{terlemah.nama}</p>
          <p className="mt-0.5 text-sm text-muted">
            Skor {angka(terlemah.skor)} · {terlemah.benar} dari {terlemah.jumlahSoal} soal benar
            {terlemah.kosong > 0 ? ` · ${terlemah.kosong} soal dibiarkan kosong.` : "."}
          </p>
          <p className="mt-2 text-sm">
            Jadikan subtes ini prioritas utama. Naik {angka(Math.max(40, terlemah.rata - terlemah.skor + 40))} poin
            di sini akan menaikkan skor totalmu sekitar{" "}
            {angka(Math.round(Math.max(40, terlemah.rata - terlemah.skor + 40) / baris.length))} poin.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-surface-muted/60 p-4">
        <p className="text-sm font-bold">Saran belajar untuk {terlemah.nama}</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {saranTerlemah.map((s) => (
            <li key={s} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <p className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span>
            {totalSkor >= rataTotal
              ? `Skor totalmu ${angka(totalSkor - rataTotal)} poin di atas rata-rata peserta. Pertahankan!`
              : `Skor totalmu ${angka(rataTotal - totalSkor)} poin di bawah rata-rata peserta — masih sangat bisa dikejar.`}
          </span>
        </p>
        {diBawahRata.length > 0 && (
          <p className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>
              Ada {diBawahRata.length} subtes di bawah rata-rata peserta:{" "}
              <strong>{diBawahRata.map((b) => b.nama).join(", ")}</strong>. Bagi waktu belajarmu ke
              sana lebih dulu.
            </span>
          </p>
        )}
        {totalKosong > 0 && (
          <p className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>
              Kamu meninggalkan <strong>{totalKosong} soal kosong</strong>. UTBK-SNBT tidak
              memberi nilai minus, jadi selalu isi semua soal walau harus menebak terarah.
            </span>
          </p>
        )}
        {SARAN_UMUM.map((s) => (
          <p key={s} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>{s}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
