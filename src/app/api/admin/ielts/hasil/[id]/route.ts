import { requireAdminIelts } from "@/lib/auth/auth";
import { paketById } from "@/lib/ielts/ielts";
import { fiturLanguageAktif } from "@/lib/ielts/language";
import { bukuHasilIelts, hasilIelts, namaBerkasHasilIelts } from "@/lib/ielts/laporan-ielts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPE_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * GET /api/admin/ielts/hasil/[id] — unduh HASIL satu paket IELTS sebagai .xlsx.
 *
 * Sepadan `/api/admin/hasil/[id]` di jalur UTBK, dan sengaja dibuat sebentuk
 * dengannya: satu sheet, kepala hijau, nomor–nama–nilai tiap bagian–angka
 * akhir. Yang berbeda hanya isi angkanya (band 0–9, bukan skor 0–1000) dan
 * adanya kolom kelas; alasannya ditulis di `laporan-ielts.ts`.
 *
 * Dua penjaga, sama seperti seluruh jalur IELTS: rem darurat fitur, lalu
 * pengelola. `requireAdminIelts` supaya pengelola berlingkup IELTS bisa
 * mengunduh hasil paketnya sendiri.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  // Rute API tidak boleh memakai `wajibFiturLanguage()`: `notFound()` di dalam
  // Route Handler melempar galat render, bukan 404 yang rapi. Jadi gerbangnya
  // dibaca sendiri dan dijawab 404 biasa — dari luar tak ada tanda rute ini
  // pernah ada.
  if (!(await fiturLanguageAktif())) {
    return new Response("Not found", { status: 404 });
  }
  await requireAdminIelts();

  const { id } = await ctx.params;
  const paketId = Number.parseInt(id, 10);
  const paket = Number.isInteger(paketId) ? await paketById(paketId) : undefined;
  if (!paket) {
    return new Response("Paket IELTS tidak ditemukan.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const buf = await bukuHasilIelts(paket, await hasilIelts(paket.id));

  return new Response(buf, {
    headers: {
      "Content-Type": TIPE_XLSX,
      "Content-Disposition": `attachment; filename="${namaBerkasHasilIelts(paket)}"`,
      "Cache-Control": "no-store",
    },
  });
}
