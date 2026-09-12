import Link from "next/link";

/**
 * Layar penuh yang muncul begitu peserta digugurkan karena keluar dari halaman
 * pengerjaan. Tidak punya tombol tutup: ujiannya memang sudah dikunci, jadi
 * tidak ada yang bisa dilanjutkan. Dipakai dua tempat — muncul seketika di
 * ruang ujian, dan dirender ulang oleh server bila peserta mencoba membuka
 * halaman ujian lagi.
 */
export function LayarGagal({
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
          aria-labelledby="judul-gagal-ujian"
          className="w-full overflow-hidden rounded-2xl bg-surface shadow-2xl"
        >
          <div className="bg-danger px-6 py-5 text-center text-white">
            <p className="text-4xl" aria-hidden="true">
              ⛔
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest opacity-90">
              Pelanggaran Tata Tertib Ujian
            </p>
            <h1 id="judul-gagal-ujian" className="mt-1 text-2xl font-extrabold tracking-tight">
              Ujian Dihentikan
            </h1>
          </div>

          <div className="space-y-4 p-6">
            <p className="rounded-xl bg-danger-soft px-4 py-4 text-base font-bold leading-relaxed text-danger">
              {pesan}
            </p>

            {namaPaket && (
              <p className="text-sm text-muted">
                Paket: <strong className="text-foreground">{namaPaket}</strong>
                {waktu ? ` · Digugurkan pada ${waktu}` : ""}
              </p>
            )}

            <ul className="space-y-2 text-sm leading-relaxed">
              <li>
                Sesi ujianmu <strong>dikunci</strong> dan tidak dapat dilanjutkan lagi hari ini.
              </li>
              <li>
                Jawaban yang sudah terisi <strong>tidak dinilai</strong>, sehingga tidak ada skor
                yang keluar untuk tryout ini.
              </li>
              <li>
                Kejadian ini tercatat di server lengkap dengan waktunya dan sudah dilaporkan kepada
                pengawas.
              </li>
              <li>
                Bila kamu merasa ini keliru, temui pengawas atau pengajar Adzkia. Hanya pengelola
                yang dapat memberikan izin <strong>Ujian Susulan</strong>.
              </li>
            </ul>

            <Link href="/dashboard" className="btn btn-primary w-full">
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
