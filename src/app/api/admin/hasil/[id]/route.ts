import { ambilPaket } from "@/lib/admin/admin";
import { requireAdmin } from "@/lib/auth/auth";
import { bukuHasilPaket, hasilPaket, namaBerkasHasil } from "@/lib/laporan/laporan-hasil";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPE_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * GET /api/admin/hasil/[id] — unduh HASIL satu paket sebagai .xlsx.
 *
 * Berbeda dari `/api/admin/export/[id]` yang mengunduh SOAL, dan dari
 * `/api/admin/pelanggaran/[id]` yang mengunduh catatan pelanggaran. Yang ini
 * dibuat untuk dibagikan kepada ORANG TUA, jadi isinya hanya nomor, nama,
 * skor tiap subtes, dan skor total — tanpa satu pun keterangan pelanggaran.
 */
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

  const info = {
    id: paket.id,
    kode: paket.kode,
    nama: paket.nama,
    jalur: paket.jalur,
    siklus: paket.siklus,
    mulai_at: paket.mulai_at,
  };
  const buf = await bukuHasilPaket(info, await hasilPaket(paket.id, paket.jalur));

  return new Response(buf, {
    headers: {
      "Content-Type": TIPE_XLSX,
      "Content-Disposition": `attachment; filename="${namaBerkasHasil(info)}"`,
      "Cache-Control": "no-store",
    },
  });
}
