/**
 * GET /warung/<SUBTES>-<nomor>/<berkas> — jaring pengaman gambar Warung Soal.
 *
 * Kembaran `/soal/[...jalan]`; keduanya memanggil `layaniGambar()` yang sama.
 *
 * Letaknya BERSARANG di bawah `[subtes]`, bukan sebagai `/warung/[...jalan]`,
 * karena Next.js melarang dua nama segmen dinamis berbeda pada tingkat yang
 * sama — `src/app/warung/[subtes]/page.tsx` (halaman daftar paket satu subtes)
 * sudah memakai tingkat itu. Halaman tersebut hanya melayani SATU segmen,
 * sedangkan alamat gambar selalu dua segmen ("PK-1/abc.svg"), jadi keduanya
 * tidak pernah berebut.
 */
import { layaniGambar } from "@/lib/naskah/gambar-soal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ subtes: string; berkas: string[] }> },
): Promise<Response> {
  const { subtes, berkas } = await params;
  return layaniGambar("warung", [subtes, ...berkas]);
}
