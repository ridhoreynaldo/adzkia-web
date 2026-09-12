"use client";

/**
 * Gerbang layar penuh ruang ujian IELTS.
 *
 * Bentuk dan isinya mengikuti gerbang ruang ujian UTBK — termasuk petunjuk
 * "Tambahkan ke Layar Utama" untuk iPhone/iPad, yang bukan hiasan melainkan
 * satu-satunya cara bilah Safari benar-benar hilang beserta tombol muat ulang
 * dan daftar tab di dalamnya.
 *
 * SATU HAL YANG TIDAK BOLEH DIHILANGKAN: jalan keluar "Continue from Safari".
 * Menahan siswa di gerbang pada hari-H jauh lebih merugikan daripada bilah
 * alamat yang masih terlihat. Yang melewatinya DICATAT (`lewat_safari`), bukan
 * ditolak.
 */
export function GerbangIelts({
  tanpaApiLayarPenuh,
  terpasangDiLayarUtama,
  galat,
  onMasuk,
  onLewatSafari,
  pratinjau = false,
}: {
  tanpaApiLayarPenuh: boolean;
  terpasangDiLayarUtama: boolean;
  galat: string | null;
  onMasuk: () => void;
  onLewatSafari: () => void;
  /**
   * Pratinjau pengelola. Gerbangnya tetap ditampilkan — itulah yang akan
   * dihadapi siswa — tetapi peringatan merahnya diganti, sebab dalam pratinjau
   * tidak ada waktu ujian yang berjalan dan tidak ada laporan yang terisi.
   * Peringatan yang tidak benar mengajari pembacanya untuk mengabaikannya.
   */
  pratinjau?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-foreground/95 p-4">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-7 text-center shadow-2xl">
        <p className="text-4xl" aria-hidden="true">
          {tanpaApiLayarPenuh ? "📱" : "🖥️"}
        </p>
        <h2 className="mt-3 text-xl font-extrabold tracking-tight">
          {tanpaApiLayarPenuh ? "Ready to begin" : "This test must run full screen"}
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-muted">
          {tanpaApiLayarPenuh
            ? "The test will fill your whole screen. While it is running, switching apps or opening another tab is detected automatically."
            : "During the test this page must cover your entire screen. On a computer or laptop, leaving full screen after the test has started ends your test immediately."}
        </p>

        {tanpaApiLayarPenuh && !terpasangDiLayarUtama && (
          <div className="mt-4 rounded-xl bg-brand-soft px-4 py-4 text-left text-xs leading-relaxed text-brand-strong">
            <strong className="block text-sm">
              Wajib: buka ujian dari ikon Layar Utama
            </strong>
            <p className="mt-1">
              Di iPhone dan iPad, bilah Safari tidak bisa disembunyikan oleh halaman web — Apple
              melarang halaman layar penuh menerima ketikan, sehingga kolom jawaban Writing tidak
              bisa diisi dari sana. Selama bilah itu masih ada, tombol muat ulang dan daftar tab
              berada satu ketukan dari soal.
            </p>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 font-semibold">
              <li>
                Tekan tombol <strong>Bagikan</strong> (kotak dengan panah ke atas) di bilah bawah
                Safari.
              </li>
              <li>
                Gulung ke bawah, pilih <strong>Tambahkan ke Layar Utama</strong>, lalu tekan{" "}
                <strong>Tambah</strong>.
              </li>
              <li>
                Tutup Safari, buka <strong>ADZKIA SMART</strong> dari ikon barunya, dan masuk
                kembali ke ujian ini.
              </li>
            </ol>
            <p className="mt-3">
              Jawaban yang sudah kamu isi tersimpan otomatis, jadi tidak ada yang hilang.
            </p>
          </div>
        )}

        {tanpaApiLayarPenuh && terpasangDiLayarUtama && (
          <p className="mt-4 rounded-xl bg-success-soft px-4 py-3 text-xs font-semibold leading-relaxed text-success">
            ✓ Ujian ini berjalan dari ikon Layar Utama. Bilah Safari sudah tidak ada.
          </p>
        )}

        {pratinjau ? (
          <p className="mt-3 rounded-xl bg-success-soft px-4 py-3 text-xs font-semibold leading-relaxed text-success">
            PRATINJAU: gerbang ini persis yang akan dilihat siswa. Di sini tidak ada waktu yang
            berjalan, tidak ada jawaban yang tersimpan, dan keluar dari layar penuh tidak
            menghentikan apa pun.
          </p>
        ) : (
          <p className="mt-3 rounded-xl bg-danger-soft px-4 py-3 text-xs font-semibold leading-relaxed text-danger">
            Perhatian: waktu ujian TETAP BERJALAN selama layar ini terbuka.
          </p>
        )}

        {galat && <p className="mt-3 text-xs font-semibold text-danger">{galat}</p>}

        {tanpaApiLayarPenuh && !terpasangDiLayarUtama ? (
          // Jalan utamanya memasang ikon, jadi tombol "lanjut saja" sengaja
          // dibuat kecil dan berbunyi apa adanya: pilihan itu masuk laporan.
          <div className="mt-5">
            <p className="text-xs font-semibold text-muted">
              Sudah membuka dari ikon Layar Utama? Halaman ini akan mengenalinya sendiri.
            </p>
            <button
              type="button"
              onClick={onLewatSafari}
              className="btn btn-ghost mt-3 w-full text-sm"
              autoFocus
            >
              {pratinjau
                ? "Lanjut dari Safari"
                : "Lanjut dari Safari — dicatat di laporan pengajar"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onMasuk}
            className="btn btn-primary mt-5 w-full text-base"
            autoFocus
          >
            {tanpaApiLayarPenuh ? "Start the test" : "Enter full screen & start"}
          </button>
        )}
      </div>
    </div>
  );
}
