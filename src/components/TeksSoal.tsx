/**
 * Perender tunggal untuk isi soal (stimulus, pertanyaan, opsi, pembahasan).
 *
 * Konten soal berasal dari admin — lewat editor bank soal atau impor Excel —
 * dan boleh memuat HTML sederhana (<p>, <b>, <i>, <sup>, <table>, entitas).
 * `white-space: pre-wrap` dipertahankan supaya soal yang ditulis polos dengan
 * baris baru (mis. tabel teks di soal kuantitatif) tetap utuh.
 *
 * Semua modul WAJIB memakai komponen ini agar satu soal tampak sama persis di
 * ruang ujian, pratinjau admin, dan halaman pembahasan.
 */
export function TeksSoal({
  html,
  className = "",
  as: Tag = "div",
}: {
  html: string | null | undefined;
  className?: string;
  as?: "div" | "span";
}) {
  if (!html) return null;
  return (
    <Tag
      className={`isi-soal ${className}`}
      // Sumber tepercaya: hanya admin yang dapat menulis/mengimpor soal.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
