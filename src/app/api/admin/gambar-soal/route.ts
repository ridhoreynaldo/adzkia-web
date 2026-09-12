/**
 * POST /api/admin/gambar-soal — unggah satu gambar untuk butir soal.
 *
 * Melayani kedua bank soal. Yang membedakan hanya kolom `jenis` pada formulir:
 *
 *   jenis=tryout  paket_id menunjuk `packages`     -> public/soal/<kode>/
 *   jenis=warung  paket_id menunjuk `warung_paket` -> public/warung/<SUBTES>-<n>/
 *
 * Folder tujuannya SELALU dihitung di server dari baris paketnya, tidak pernah
 * diambil dari yang dikirim peramban — kalau tidak, nama folder menjadi lubang
 * untuk menulis berkas ke mana saja di dalam `public/`.
 *
 * Kenapa rute API, bukan Server Action seperti tombol admin lainnya: badan
 * Server Action dibatasi 1 MB oleh Next.js, dan batas itu menghitung SELURUH
 * formulir. Gambar 1 MB ditambah stimulus, opsi, dan pembahasan pasti
 * melewatinya, sehingga soal bergambar akan gagal disimpan justru pada berkas
 * yang ukurannya masih sah. Rute ini memindahkan gambarnya lebih dulu; yang
 * ikut di formulir soal tinggal alamat hasilnya — beberapa puluh huruf.
 *
 * Jawaban selalu JSON: { ok: true, url, ukuran } atau { ok: false, error }.
 */
import { getSession } from "@/lib/auth/auth";
import { ambilPaket } from "@/lib/admin/admin";
import {
  type AkarGambar,
  BATAS_GAMBAR_BYTE,
  BATAS_GAMBAR_MB,
  LABEL_FORMAT_GAMBAR,
  kenaliJenisGambar,
  simpanGambarSoal,
} from "@/lib/naskah/gambar-soal";
import { ambilPaket as ambilPaketWarung } from "@/lib/warung/warung";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jawab(isi: Record<string, unknown>, status = 200): Response {
  return Response.json(isi, { status, headers: { "Cache-Control": "no-store" } });
}

/** Cari paketnya, lalu tentukan akar dan nama folder tempat gambar disimpan. */
async function tujuanSimpan(
  jenis: string,
  paketId: number,
): Promise<{ akar: AkarGambar; namaPaket: string } | null> {
  if (!Number.isInteger(paketId) || paketId < 1) return null;

  if (jenis === "warung") {
    const paket = await ambilPaketWarung(paketId);
    // Huruf besar dipertahankan: alamat gambar Warung yang sudah tersimpan
    // berbentuk "/warung/PK-1/…", dan di Linux "pk-1" adalah folder lain.
    return paket ? { akar: "warung", namaPaket: `${paket.subtes}-${paket.nomor}` } : null;
  }

  const paket = await ambilPaket(paketId);
  return paket ? { akar: "soal", namaPaket: paket.kode || String(paket.id) } : null;
}

export async function POST(req: Request): Promise<Response> {
  // requireAdmin() sengaja TIDAK dipakai: fungsi itu mengalihkan ke halaman
  // login, dan pengalihan HTML tidak bisa dibaca oleh fetch() di formulir soal.
  const admin = await getSession();
  if (!admin || admin.role !== "admin") {
    return jawab({ ok: false, error: "Sesi pengelola sudah berakhir. Masuk ulang lalu coba lagi." }, 401);
  }

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return jawab({ ok: false, error: "Berkas gagal diterima. Coba unggah ulang." }, 400);
  }

  const jenis = String(fd.get("jenis") ?? "tryout");
  const paketId = Number.parseInt(String(fd.get("paket_id") ?? ""), 10);
  const tujuan = await tujuanSimpan(jenis, paketId);
  if (!tujuan) return jawab({ ok: false, error: "Paket tidak dikenali." }, 400);

  const berkas = fd.get("berkas");
  if (!(berkas instanceof File) || berkas.size === 0) {
    return jawab({ ok: false, error: "Tidak ada berkas gambar yang terkirim." }, 400);
  }
  if (berkas.size > BATAS_GAMBAR_BYTE) {
    // Dilaporkan dalam KB, bukan MB: berkas yang hanya lewat sedikit dari batas
    // akan dibulatkan menjadi "1.00 MB" dan pesannya terbaca seperti menolak
    // berkas yang justru pas.
    return jawab(
      {
        ok: false,
        error:
          `Ukuran gambar maksimal ${BATAS_GAMBAR_MB} MB (${Math.round(BATAS_GAMBAR_BYTE / 1024)} KB), ` +
          `sedangkan berkas ini ${Math.round(berkas.size / 1024)} KB.`,
      },
      413,
    );
  }

  const isi = new Uint8Array(await berkas.arrayBuffer());
  // Jenis ditimbang dari isi berkas, bukan dari namanya — lihat gambar-soal.ts.
  if (!kenaliJenisGambar(isi)) {
    return jawab({ ok: false, error: `Format gambar harus ${LABEL_FORMAT_GAMBAR}.` }, 415);
  }

  try {
    const hasil = await simpanGambarSoal(isi, tujuan.akar, tujuan.namaPaket);
    return jawab({ ok: true, url: hasil.url, ukuran: hasil.ukuran });
  } catch {
    return jawab({ ok: false, error: "Gambar gagal disimpan di server." }, 500);
  }
}
