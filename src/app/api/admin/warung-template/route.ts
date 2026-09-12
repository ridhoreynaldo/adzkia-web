import { requireAdmin } from "@/lib/auth/auth";
import { TEMPLATE_CSV_WARUNG } from "@/lib/warung/warung-impor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/warung-template — contoh berkas impor Warung Soal (.csv).
 *
 * Sengaja CSV, bukan .xlsx seperti template bank soal tryout: kolomnya hanya
 * sepuluh dan pengelola biasanya membukanya di Excel lalu menyimpannya kembali
 * sebagai .xlsx, yang tetap diterima pembaca impor.
 */
export async function GET(): Promise<Response> {
  await requireAdmin();

  // BOM di depan supaya Excel membaca huruf beraksen dengan benar.
  return new Response(`﻿${TEMPLATE_CSV_WARUNG}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="contoh-soal-warung.csv"',
      "Cache-Control": "no-store",
    },
  });
}
