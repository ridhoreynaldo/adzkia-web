import { requireUser } from "@/lib/auth/auth";
import { one } from "@/lib/core/db";
import { bukuRankUp } from "@/lib/laporan/laporan-rankup";
import { rekapTahunSiswa, type JalurRekap } from "@/lib/laporan/rekap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPE_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * GET /api/rankup/unduh — rekap Capaianku satu tahun (.xlsx).
 * Siswa hanya bisa mengunduh rekap miliknya sendiri; admin boleh menyebut
 * ?siswa=<id> untuk mengambilkan rekap peserta tertentu.
 */
export async function GET(request: Request): Promise<Response> {
  const user = await requireUser();

  const q = new URL(request.url).searchParams;
  const jalur: JalurRekap = q.get("jalur") === "skd" ? "skd" : "utbk";
  const diminta = Number(q.get("siswa") ?? 0);
  const userId =
    user.role === "admin" && Number.isInteger(diminta) && diminta > 0 ? diminta : user.id;

  const siswa = await one<{
    nama: string;
    nisn: string | null;
    kelas: string | null;
    asal_sekolah: string | null;
  }>("SELECT nama, nisn, kelas, asal_sekolah FROM users WHERE id = ?", userId);

  if (!siswa) {
    return new Response("Peserta tidak ditemukan.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const rekap = await rekapTahunSiswa(userId, jalur);
  const buf = await bukuRankUp(
    {
      nama: siswa.nama,
      nisn: siswa.nisn,
      kelas: siswa.kelas,
      asalSekolah: siswa.asal_sekolah,
    },
    rekap,
  );

  const slug =
    siswa.nama.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "siswa";
  const namaBerkas = `capaianku-adzkia-${jalur}-${slug}-${new Date().getFullYear()}.xlsx`;

  return new Response(buf, {
    headers: {
      "Content-Type": TIPE_XLSX,
      "Content-Disposition": `attachment; filename="${namaBerkas}"`,
      "Cache-Control": "no-store",
    },
  });
}
