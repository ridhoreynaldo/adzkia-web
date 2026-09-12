import { ambilPaket, daftarSoal } from "@/lib/admin/admin";
import { requireAdmin } from "@/lib/auth/auth";
import { bukuEksporPaket } from "@/lib/naskah/import-soal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPE_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** GET /api/admin/export/[id] — unduh seluruh soal satu paket sebagai .xlsx. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  await requireAdmin();

  const { id } = await ctx.params;
  const paketId = Number.parseInt(id, 10);
  const paket = Number.isInteger(paketId) ? await ambilPaket(paketId) : undefined;
  if (!paket) {
    return new Response("Paket tidak ditemukan.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const soal = await daftarSoal(paket.id);
  const buf = await bukuEksporPaket({ kode: paket.kode, nama: paket.nama }, soal);
  const namaBerkas = `soal-${paket.kode.replace(/[^A-Za-z0-9_-]+/g, "-")}.xlsx`;

  return new Response(buf, {
    headers: {
      "Content-Type": TIPE_XLSX,
      "Content-Disposition": `attachment; filename="${namaBerkas}"`,
      "Cache-Control": "no-store",
    },
  });
}
