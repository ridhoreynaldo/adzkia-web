import { NextResponse } from "next/server";

import { sehatCache } from "@/lib/core/cache";
import { sehat } from "@/lib/core/db";

/**
 * Laporan kesehatan aplikasi.
 *
 * Dipakai healthcheck Docker (`docker-compose.yml`) dan bisa dibuka sendiri
 * untuk memeriksa keadaan sambungan tanpa masuk ke panel admin.
 *
 * Yang menentukan sehat atau tidak HANYA PostgreSQL. Redis yang mati sengaja
 * TIDAK membuat status berubah menjadi 503: aplikasi tetap melayani ujian
 * dengan membaca langsung ke basis data, hanya lebih lambat. Menjatuhkan
 * seluruh aplikasi karena cache-nya tidak bisa dihubungi persis kebalikan dari
 * gunanya cache.
 *
 * Tidak ada satu pun data sekolah di sini — hanya nama layanan, waktu jawab,
 * dan jumlah koneksi — karena alamat ini terbuka tanpa perlu masuk.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const mulai = Date.now();
  const [db, cache] = await Promise.all([await sehat(), await sehatCache()]);

  const siap = db.siap;

  return NextResponse.json(
    {
      siap,
      layanan: {
        postgres: {
          siap: db.siap,
          pesan: db.pesan,
          ms: db.ms,
          koneksi: {
            terpakai: db.koneksiTerpakai,
            menganggur: db.koneksiMenganggur,
            antre: db.antre,
          },
        },
        redis: {
          aktif: cache.aktif,
          siap: cache.siap,
          pesan: cache.pesan,
          ms: cache.ms,
        },
      },
      ms: Date.now() - mulai,
      waktu: new Date().toISOString(),
    },
    {
      status: siap ? 200 : 503,
      headers: {
        // Laporan kesehatan yang di-cache tidak ada gunanya: ia harus
        // menggambarkan keadaan DETIK INI, bukan keadaan lima menit lalu.
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
