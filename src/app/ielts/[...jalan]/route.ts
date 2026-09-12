/**
 * GET /ielts/<kode-paket>/<berkas> — pelayan rekaman Listening.
 *
 * Berbeda dari `/soal/<paket>/<berkas>` yang hanya jaring pengaman, rute ini
 * SATU-SATUNYA jalan rekaman sampai ke peramban: berkasnya tidak disimpan di
 * `public/`. Seluruh pertimbangannya — kenapa begitu, dan bagaimana permintaan
 * `Range` dijawab — tinggal di `layaniAudio()` pada `src/lib/ielts-audio.ts`.
 */
import { fiturLanguageAktif } from "@/lib/ielts/language";
import { layaniAudio } from "@/lib/ielts/ielts-audio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ jalan: string[] }> },
): Promise<Response> {
  // Rute ini ikut ditutup di server sekolah, sama seperti halaman IELTS-nya.
  // Alamat rekaman memang tidak bisa ditebak (namanya sidik jari isinya),
  // tetapi membiarkan satu pintu terbuka di jalur yang seharusnya tidak ada di
  // sana adalah persis jenis sisa yang kelak terlupakan.
  if (!(await fiturLanguageAktif())) {
    return new Response("Rekaman tidak ditemukan.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const { jalan } = await params;
  return layaniAudio(jalan, req);
}
