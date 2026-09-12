import { getSession } from "@/lib/auth/auth";
import { balasanTerlaluSering, hitungLaju } from "@/lib/core/laju";
import { getAttempt, keadaanUjian } from "@/lib/tryout/exam";
import type { BalasanKeadaan } from "@/components/exam/tipe";

export const dynamic = "force-dynamic";

/**
 * Sinkronisasi timer: klien memanggil ini berkala supaya hitung mundur
 * tetap mengikuti jam server (jam browser tidak dipercaya).
 *
 * Tidak pernah memulai subtes baru — itu tugas halaman ruang ujian.
 */
export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false }, { status: 401 });

  const laju = await hitungLaju("keadaan", user.id);
  if (!laju.boleh) return balasanTerlaluSering(laju);

  const attemptId = Number(new URL(request.url).searchParams.get("attemptId"));
  const att = await getAttempt(attemptId);
  if (!att || att.user_id !== user.id) return Response.json({ ok: false }, { status: 404 });

  const keadaan = await keadaanUjian(att.id, { mulaiOtomatis: false });
  if (!keadaan) return Response.json({ ok: false }, { status: 404 });

  // `subtes` selalu diisi supaya klien bisa mendeteksi bahwa subtes yang sedang
  // ia kerjakan sudah ditutup (nilainya berubah) dan perlu memuat ulang halaman.
  const balasan: BalasanKeadaan = {
    ok: true,
    selesai: keadaan.selesai,
    subtes: keadaan.subtes,
    sudahMulai: keadaan.sudahMulai,
    sisaDetik: keadaan.sudahMulai ? keadaan.sisaDetik : 0,
    attemptId: att.id,
  };
  return Response.json(balasan);
}
