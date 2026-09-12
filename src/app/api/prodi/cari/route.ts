import { getSession } from "@/lib/auth/auth";
import { MAKS_PILIHAN, cariProdi, jenjangPilihan } from "@/lib/rujukan/prodi";

export const dynamic = "force-dynamic";

/**
 * Pencarian program studi untuk kotak "Pilihan Program Studi".
 * Hanya melayani pengguna yang sudah masuk — katalog ini bagian dari aplikasi
 * ujian, bukan data publik.
 *
 * `urutan` menyatakan kotak pilihan yang sedang diisi: 1-2 hanya menampilkan
 * S1, 3-4 hanya D3 dan D4. Tanpa `urutan` katalog tidak disaring (dipakai
 * pemakaian lain, mis. contoh hasil cari di panel admin).
 */
export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false, hasil: [] }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const q = params.get("q") ?? "";
  if (q.trim().length < 2) return Response.json({ ok: true, hasil: [] });

  const urutan = Number(params.get("urutan"));
  const saring =
    Number.isInteger(urutan) && urutan >= 1 && urutan <= MAKS_PILIHAN
      ? jenjangPilihan(urutan)
      : undefined;

  const hasil = (await cariProdi(q, 25, saring)).map((p) => ({
    id: p.id,
    nama: p.nama,
    ptn: p.ptn,
    jenjang: p.jenjang,
    // Ancar-ancar skor ikut dikirim supaya peserta melihat target skornya
    // sejak memilih prodi, bukan baru sesudah ujian dinilai.
    skorMin: p.skor_min,
  }));
  return Response.json({ ok: true, hasil });
}
