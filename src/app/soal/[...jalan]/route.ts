/**
 * GET /soal/<kode-paket>/<berkas> — jaring pengaman gambar soal Tryout.
 *
 * Isinya hanya satu baris karena seluruh pertimbangannya — kenapa rute ini ada
 * sama sekali, dan bagaimana jalannya dijaga — tinggal di `layaniGambar()`
 * pada `src/lib/gambar-soal.ts`, dipakai bersama rute kembarannya di
 * `/warung/<paket>/<berkas>`.
 */
import { layaniGambar } from "@/lib/naskah/gambar-soal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jalan: string[] }> },
): Promise<Response> {
  const { jalan } = await params;
  return layaniGambar("soal", jalan);
}
