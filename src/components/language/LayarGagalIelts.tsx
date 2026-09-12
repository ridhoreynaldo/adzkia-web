import Link from "next/link";

/**
 * Layar yang muncul begitu ujian IELTS dihentikan karena pelanggaran.
 *
 * Kembaran `components/exam/LayarGagal.tsx`, dan tiga hal disamakan dengannya
 * dengan sengaja: tidak ada tombol tutup (ujiannya memang sudah dikunci), sebab
 * yang dibaca peserta datang dari SERVER (bukan kalimat yang dikarang peramban),
 * dan halaman ini dirender ulang oleh server bila peserta mencoba membuka ruang
 * ujian lagi — jadi memuat ulang tidak mengembalikan apa pun.
 *
 * Yang dibedakan hanya dua: judulnya berbahasa Inggris seperti seluruh jalur
 * IELTS, dan pintu keluarnya kembali ke `/language/ielts`, bukan ke beranda
 * tryout.
 */
export function LayarGagalIelts({
  pesan,
  namaPaket,
  waktu,
}: {
  pesan: string;
  namaPaket?: string;
  waktu?: string | null;
}) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-danger/95 p-4 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full max-w-2xl items-center">
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="judul-gagal-ielts"
          className="w-full overflow-hidden rounded-2xl bg-surface shadow-2xl"
        >
          <div className="bg-danger px-6 py-5 text-center text-white">
            <p className="text-4xl" aria-hidden="true">
              ⛔
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest opacity-90">
              Exam Rules Violation
            </p>
            <h1 id="judul-gagal-ielts" className="mt-1 text-2xl font-extrabold tracking-tight">
              Exam Stopped
            </h1>
          </div>

          <div className="space-y-4 p-6">
            <p className="rounded-xl bg-danger-soft px-4 py-4 text-base font-bold leading-relaxed text-danger">
              {pesan}
            </p>

            {namaPaket && (
              <p className="text-sm text-muted">
                Paket: <strong className="text-foreground">{namaPaket}</strong>
                {waktu ? ` · Dihentikan pada ${waktu}` : ""}
              </p>
            )}

            <ul className="space-y-2 text-sm leading-relaxed">
              <li>
                Sesi IELTS-mu <strong>dikunci</strong> dan tidak dapat dilanjutkan lagi hari ini.
              </li>
              <li>
                Jawaban yang sudah terisi <strong>tidak dinilai</strong>, sehingga tidak ada band
                score yang keluar untuk sesi ini.
              </li>
              <li>
                Kejadian ini tercatat di server lengkap dengan waktunya dan sudah dilaporkan kepada
                pengajar.
              </li>
              <li>
                Bila kamu merasa ini keliru, temui pengajar Adzkia. Hanya pengelola yang dapat
                membuka <strong>sesi ulang</strong> untukmu.
              </li>
            </ul>

            <Link href="/language/ielts" className="btn btn-primary w-full">
              Back to IELTS
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
