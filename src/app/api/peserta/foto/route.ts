/**
 * POST /api/peserta/foto — ADMIN memasang foto seorang peserta.
 * DELETE /api/peserta/foto — ADMIN melepas foto seorang peserta.
 *
 * HANYA ADMIN, sejak 7 September 2026 malam atas permintaan pengelola. Foto ini
 * dipakai peserta untuk memastikan NISN yang sedang dipakai memang miliknya,
 * jadi ia berfungsi sebagai identitas — dan identitas yang bisa diganti sendiri
 * oleh pemiliknya di tengah ujian tidak membuktikan apa pun. Peserta kini hanya
 * MELIHAT fotonya.
 *
 * `user_id` datang dari formulir DAN wajib, karena admin memang memasangkan
 * foto untuk orang lain. Yang menjaganya adalah `requireAdmin()` di baris
 * pertama; tidak ada jalur lain menuju fungsi penyimpanan.
 *
 * Kenapa rute API dan bukan Server Action seperti tombol siswa lainnya: badan
 * Server Action dibatasi 1 MB oleh Next.js dan batas itu menghitung SELURUH
 * formulir, sehingga foto yang ukurannya masih sah bisa ditolak justru di
 * lapisan yang salah. Alasan yang sama persis dipakai `/api/admin/gambar-soal`.
 */
import { requireAdmin } from "@/lib/auth/auth";
import { kenaliJenisGambar } from "@/lib/naskah/gambar-soal";
import {
  BATAS_FOTO_BYTE,
  BATAS_FOTO_MB,
  LABEL_FORMAT_FOTO,
} from "@/lib/penjagaan/foto-peserta-konstanta";
import { pesertaAda, setFotoPeserta, simpanBerkasFoto } from "@/lib/penjagaan/foto-peserta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jawab(isi: Record<string, unknown>, status = 200): Response {
  return Response.json(isi, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request): Promise<Response> {
  await requireAdmin();

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return jawab({ ok: false, error: "Foto gagal diterima. Coba unggah ulang." }, 400);
  }

  const userId = Number(fd.get("user_id"));
  if (!Number.isInteger(userId) || userId <= 0) {
    return jawab({ ok: false, error: "Peserta tidak dikenali." }, 400);
  }
  if (!await pesertaAda(userId)) {
    return jawab({ ok: false, error: "Peserta tidak ditemukan." }, 404);
  }

  const berkas = fd.get("berkas");
  if (!(berkas instanceof File) || berkas.size === 0) {
    return jawab({ ok: false, error: "Tidak ada berkas foto yang terkirim." }, 400);
  }
  if (berkas.size > BATAS_FOTO_BYTE) {
    // Dilaporkan dalam KB: berkas yang cuma lewat sedikit dari batas akan
    // dibulatkan menjadi "1.00 MB" dan pesannya terbaca seperti menolak berkas
    // yang justru pas.
    return jawab(
      {
        ok: false,
        error:
          `Ukuran foto maksimal ${BATAS_FOTO_MB} MB (${Math.round(BATAS_FOTO_BYTE / 1024)} KB), ` +
          `sedangkan berkas ini ${Math.round(berkas.size / 1024)} KB.`,
      },
      413,
    );
  }

  const isi = new Uint8Array(await berkas.arrayBuffer());
  // Jenis ditimbang dari isi berkasnya, bukan dari nama atau Content-Type yang
  // sama-sama datang dari peramban dan sama-sama bisa dikarang.
  if (!kenaliJenisGambar(isi)) {
    return jawab({ ok: false, error: `Format foto harus ${LABEL_FORMAT_FOTO}.` }, 415);
  }

  try {
    const hasil = await simpanBerkasFoto(isi);
    await setFotoPeserta(userId, hasil.url);
    return jawab({ ok: true, url: hasil.url, ukuran: hasil.ukuran });
  } catch {
    return jawab({ ok: false, error: "Foto gagal disimpan di server." }, 500);
  }
}

export async function DELETE(req: Request): Promise<Response> {
  await requireAdmin();

  const userId = Number(new URL(req.url).searchParams.get("user_id"));
  if (!Number.isInteger(userId) || userId <= 0) {
    return jawab({ ok: false, error: "Peserta tidak dikenali." }, 400);
  }

  // Berkasnya sengaja TIDAK ikut dihapus dari disk. Namanya adalah sidik jari
  // isinya, jadi dua siswa berfoto sama persis memakai berkas yang sama —
  // menghapusnya begitu satu orang melepas fotonya akan mengosongkan foto orang
  // lain. Berkas yatim jauh lebih murah daripada itu; alasan yang sama dipakai
  // gambar soal.
  await setFotoPeserta(userId, null);
  return jawab({ ok: true });
}
