import { getSession } from "@/lib/auth/auth";
import { AMBANG_DENYUT_DETIK, AMBANG_DENYUT_TERLIHAT_DETIK } from "@/lib/penjagaan/denyut";
import { fiturLanguageAktif } from "@/lib/ielts/language";
import { pengerjaanById } from "@/lib/ielts/ielts";
import {
  catatDenyutHilangIelts,
  catatDenyutIelts,
  catatDenyutTersendatIelts,
  catatPergiSaatRekamanIelts,
  gugurkanIelts,
  jumlahPelanggaranIelts,
} from "@/lib/ielts/ielts-penjagaan";
import { pesanGugurJenis } from "@/lib/penjagaan/pelanggaran-jenis";

export const dynamic = "force-dynamic";

/**
 * Denyut nadi ruang ujian IELTS — kembaran persis `/api/exam/denyut`.
 *
 * Bukan kepergian yang dilaporkan, melainkan KEHADIRAN yang harus dibuktikan
 * berulang-ulang: laporan bisa mati bersama halamannya (WebKit membekukan
 * JavaScript beberapa milidetik sesudah halaman disembunyikan), sedangkan diam
 * tidak bisa dipalsukan menjadi hadir. Penjelasan lengkap tiap ambang ada di
 * `@/lib/denyut` dan di rute UTBK; jangan menuliskannya dua kali.
 *
 * SATU KEHENINGAN YANG TETAP AMAN, dan pemisahnya wajib dipertahankan: jeda
 * yang halamannya BISA MEMBUKTIKAN ia tetap terlihat dan terus mencoba
 * menghubungi server. Itu jaringan peserta yang putus, bukan pesertanya yang
 * pergi — dan menggugurkan orang karena sinyalnya hilang adalah menghukumnya
 * atas perbuatan yang bukan miliknya.
 */

interface Muatan {
  pengerjaanId: number;
  /** true = penjagaan sudah menyala (peserta sudah melewati gerbang). */
  aktif?: boolean;
  /** true = denyut pertama sesudah halaman dimuat; jedanya tetap dinilai. */
  mula?: boolean;
  subtes?: string | null;
  /** true = sejak denyut terakhir yang berhasil, halaman tidak pernah tersembunyi. */
  terlihat?: boolean;
  /** Berapa kali halaman mencoba berdenyut selama jeda ini. */
  percobaan?: number;
  /**
   * true = sepanjang jeda ini peserta berada di kolom jawaban yang dipegang
   * papan ketik. Di IELTS ini jauh lebih sering daripada di UTBK: Writing
   * menuntut dua karangan panjang, dan panel sistem WebKit yang membekukan
   * halaman muncul justru di sana.
   */
  mengetik?: boolean;
  /**
   * true = rekaman Listening berputar pada suatu saat sepanjang jeda ini.
   *
   * Bukan "berputar detik ini": peramban sengaja menahan bendera ini sampai ada
   * denyut yang benar-benar sampai, sebab keadaan yang paling perlu dimaafkan
   * justru yang rekamannya SUDAH habis ketika laporannya akhirnya terkirim —
   * layar terkunci di tengah rekaman, audio berjalan terus sampai selesai, dan
   * peserta baru menyalakan layarnya semenit kemudian.
   */
  rekaman?: boolean;
}

export async function POST(request: Request) {
  if (!(await fiturLanguageAktif())) return new Response("Not found", { status: 404 });

  const user = await getSession();
  if (!user) return Response.json({ ok: false }, { status: 401 });

  let muatan: Muatan;
  try {
    muatan = (await request.json()) as Muatan;
  } catch {
    return Response.json({ ok: false, pesan: "Muatan tidak valid." }, { status: 400 });
  }

  const p = await pengerjaanById(Number(muatan.pengerjaanId));
  if (!p || p.user_id !== user.id) return Response.json({ ok: false }, { status: 404 });

  const PESAN_TERSIMPAN = p.alasan_gugur ?? pesanGugurJenis("ielts", "tak_dikenal");

  if (p.status !== "ongoing") {
    return Response.json(
      { ok: false, selesai: true, digugurkan: p.status === "gugur", pesan: PESAN_TERSIMPAN },
      { status: 409 },
    );
  }

  const aktif = muatan.aktif === true;
  // Pembongkaran yang DISENGAJA (menutup subtes) datang sebagai aktif:false
  // TANPA mula — hanya itu yang boleh menghapus jejak. Muat ulang halaman
  // datang sebagai aktif:false DENGAN mula, dan jedanya tetap dihitung.
  const jeda = await catatDenyutIelts(p.id, aktif, aktif || muatan.mula === true);

  if (jeda !== null && jeda > AMBANG_DENYUT_DETIK) {
    const subtesKini = muatan.subtes ?? p.subtes_aktif ?? null;

    // ---------------- keheningan selagi rekaman Listening berputar ----------
    //
    // Ketetapan pengelola 11 September 2026: mendengarkan rekaman ADALAH bagian
    // yang diujikan, dan peserta yang tidak menyentuh layarnya selama itu tidak
    // boleh digugurkan. Inilah keadaan yang paling sering terjadi sungguhan:
    // layar ponsel mengunci sendiri di tengah rekaman, halaman disembunyikan,
    // denyutnya berhenti — padahal audionya terus berjalan di telinga peserta.
    //
    // Diperiksa SEBELUM pemaafan jaringan di bawah, dan syaratnya berbeda:
    // yang di bawah menuntut halaman MEMBUKTIKAN diri tetap terlihat, sedangkan
    // yang ini justru memaafkan halaman yang tersembunyi. Subtesnya tetap
    // diperiksa di server — bendera `rekaman` sendiri datang dari peramban.
    if (muatan.rekaman === true && (subtesKini ?? "").toUpperCase() === "LISTENING") {
      await catatPergiSaatRekamanIelts(p.id, user.id, p.paket_id, subtesKini, jeda);
      return Response.json({
        ok: true,
        digugurkan: false,
        rekaman: true,
        jedaDetik: jeda,
        total: await jumlahPelanggaranIelts(p.id),
      });
    }

    const terbukti =
      muatan.terlihat === true &&
      jeda <= AMBANG_DENYUT_TERLIHAT_DETIK &&
      (Number(muatan.percobaan ?? 0) >= 2 || muatan.mengetik === true);

    if (terbukti) {
      await catatDenyutTersendatIelts(
        p.id,
        user.id,
        p.paket_id,
        subtesKini,
        jeda,
        Number(muatan.percobaan ?? 0),
      );
      return Response.json({
        ok: true,
        digugurkan: false,
        tersendat: true,
        jedaDetik: jeda,
        total: await jumlahPelanggaranIelts(p.id),
      });
    }

    // Barisnya selalu dicatat lebih dulu — pengawas berhak membaca lama diamnya
    // — baru sesudah itu akibatnya dijatuhkan.
    await catatDenyutHilangIelts(p.id, user.id, p.paket_id, subtesKini, jeda);

    const pesan = pesanGugurJenis("ielts", "denyut_hilang");
    await gugurkanIelts(p.id, pesan);
    return Response.json({
      ok: true,
      digugurkan: true,
      dicatat: true,
      jedaDetik: jeda,
      pesan,
      total: await jumlahPelanggaranIelts(p.id),
    });
  }

  return Response.json({ ok: true, digugurkan: false, jedaDetik: jeda });
}
