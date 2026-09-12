/**
 * GET /peserta/<berkas> — jaring pengaman FOTO PESERTA.
 *
 * Kembaran dari `/soal/<paket>/<berkas>` dan `/warung/<paket>/<berkas>`, dan
 * di sinilah ia paling dibutuhkan: `next start` mengindeks isi `public/` satu
 * kali saat proses dinyalakan, sedangkan foto peserta justru diunggah siswa
 * beberapa menit sebelum ujian dimulai. Tanpa rute ini, foto yang baru saja
 * dipasang membalas 404 sampai server dinyalakan ulang — dan menyalakan ulang
 * server di tengah hari-H bukan pilihan.
 *
 * Seluruh pertimbangan keamanannya tinggal di `layaniGambar()`.
 */
import { layaniGambar } from "@/lib/naskah/gambar-soal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ berkas: string[] }> },
): Promise<Response> {
  const { berkas } = await params;
  return layaniGambar("peserta", berkas);
}
