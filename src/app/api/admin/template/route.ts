import { requireAdmin } from "@/lib/auth/auth";
import { bukuTemplate } from "@/lib/naskah/import-soal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPE_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** GET /api/admin/template — unduh template impor soal (.xlsx). */
export async function GET(): Promise<Response> {
  await requireAdmin();

  const buf = await bukuTemplate();
  return new Response(buf, {
    headers: {
      "Content-Type": TIPE_XLSX,
      "Content-Disposition": 'attachment; filename="template-soal-adzkia-smart.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
