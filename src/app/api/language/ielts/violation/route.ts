import { getSession } from "@/lib/auth/auth";
import { AMBANG_KEMBALI_DETIK, BUDGET_PERGI_DETIK } from "@/lib/penjagaan/denyut";
import { fiturLanguageAktif } from "@/lib/ielts/language";
import { pengerjaanById } from "@/lib/ielts/ielts";
import {
  catatKeluarIelts,
  catatKembaliIelts,
  catatPercobaanIelts,
  gugurkanIelts,
  jumlahKepergianIelts,
  jumlahPelanggaranIelts,
  naikkanPergiLamaIelts,
  naikkanPergiMenumpukIelts,
  tandaiTotalKepergianIelts,
  totalDetikKepergianIelts,
} from "@/lib/ielts/ielts-penjagaan";
import {
  dimaafkanSaatRekaman,
  menggugurkanKeluar,
  pesanGugurJenis,
} from "@/lib/penjagaan/pelanggaran-jenis";

export const dynamic = "force-dynamic";

/**
 * Kejadian keamanan ruang ujian IELTS.
 *
 * KEMBARAN PERSIS `/api/exam/violation`, dan kembar itu memang tujuannya:
 * peserta IELTS berada di bawah aturan yang sama dengan peserta TryOut UTBK —
 * ambang yang sama, jenis yang sama, putusan yang sama. Yang berbeda hanya
 * tabel tempat catatannya mendarat (`ielts_pelanggaran`) dan nama ujian yang
 * dibaca peserta pada layar GAGAL.
 *
 * Bacalah komentar panjang di `/api/exam/violation/route.ts` untuk ALASAN tiap
 * putusan di bawah — sengaja tidak disalin ulang ke sini supaya tidak ada dua
 * penjelasan yang bisa berbeda isi. Yang wajib diketahui saat menyunting
 * berkas ini: seluruh keputusan diambil di SERVER, sehingga peserta tidak bisa
 * membatalkannya dengan menutup dialog, memuat ulang halaman, atau
 * membersihkan storage.
 */

interface Muatan {
  pengerjaanId: number;
  aksi: "keluar" | "kembali" | "percobaan";
  subtes?: string | null;
  pelanggaranId?: number;
  jenis?: string;
  keterangan?: string;
  /** Penanda kejadian; menyatukan laporan sendBeacon dan fetch jadi satu baris. */
  kejadian?: string;
  adaLayarPenuh?: boolean;
  dalamLayarPenuh?: boolean;
  /**
   * true = rekaman Listening sedang berputar saat kejadian ini.
   *
   * DATANG DARI PERAMBAN, jadi tidak boleh dipercaya sendirian — lihat
   * `saatRekaman()` di bawah, yang memeriksa sendiri bahwa subtesnya memang
   * LISTENING sebelum memaafkan apa pun.
   */
  rekaman?: boolean;
}

/**
 * Jenis kepergian yang boleh dilaporkan lewat `aksi: "keluar"`. Nilai lain —
 * termasuk jenis catatan seperti `salin` — jatuh ke `keluar_tab`, supaya
 * peserta tidak bisa mengarang jenis sendiri lewat muatan permintaan.
 */
const JENIS_KELUAR = new Set([
  "keluar_tab",
  "blur_window",
  "keluar_layar_penuh",
  "esc_layar_penuh",
  "alt_tab",
  "tangkap_layar",
]);

const JENIS_CATATAN_SAH = new Set(["klik_kanan", "pintasan", "tekan_tahan", "lewat_safari"]);

/**
 * true bila kejadian ini benar-benar terjadi selagi rekaman Listening berputar.
 *
 * DUA SYARAT, dan syarat kedua yang menahannya: peramban boleh saja mengaku
 * rekamannya berputar, tetapi ia tidak bisa mengarang subtes mana yang sedang
 * dibuka — nama subtes dibaca dari muatan MAUPUN dari `subtes_aktif` milik
 * pengerjaan, dan Listening adalah satu-satunya subtes IELTS yang punya
 * rekaman. Di Reading, Writing, dan Speaking bendera ini tidak pernah berarti
 * apa-apa.
 */
function saatRekaman(muatan: Muatan, subtes: string | null): boolean {
  return muatan.rekaman === true && (subtes ?? "").toUpperCase() === "LISTENING";
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

  // Alasan yang SUDAH tersimpan selalu menang: peserta yang memuat ulang
  // halaman sesudah digugurkan harus membaca sebab yang sama persis.
  const PESAN_TERSIMPAN = p.alasan_gugur ?? pesanGugurJenis("ielts", "tak_dikenal");
  const subtes = muatan.subtes ?? p.subtes_aktif ?? null;
  const penanda = muatan.kejadian?.slice(0, 64) || null;

  /* ---------------- percobaan curang: dicatat saja ---------------- */
  if (muatan.aksi === "percobaan") {
    if (p.status !== "ongoing") {
      return Response.json({ ok: false, selesai: true }, { status: 409 });
    }
    const jenis = JENIS_CATATAN_SAH.has(muatan.jenis ?? "") ? muatan.jenis! : "salin";
    await catatPercobaanIelts(
      p.id,
      user.id,
      p.paket_id,
      subtes,
      jenis,
      muatan.keterangan?.slice(0, 120) ?? null,
      penanda,
    );
    return Response.json({ ok: true, dicatat: true, total: await jumlahPelanggaranIelts(p.id) });
  }

  /* ---------------- meninggalkan halaman ---------------- */
  if (muatan.aksi === "keluar") {
    if (p.status !== "ongoing") {
      return Response.json(
        { ok: false, selesai: true, digugurkan: p.status === "gugur", pesan: PESAN_TERSIMPAN },
        { status: 409 },
      );
    }

    const jenis = JENIS_KELUAR.has(muatan.jenis ?? "") ? muatan.jenis! : "keluar_tab";

    // Layar penuh terlepas di PONSEL ATAU TABLET: dicatat saja. Di sana
    // notifikasi, putaran layar, dan isyarat navigasi melepasnya tanpa
    // disentuh siapa pun. Lepasan yang sama di peramban KOMPUTER datang ke
    // sini sebagai `esc_layar_penuh` dan menggugurkan.
    if (jenis === "keluar_layar_penuh") {
      const { id, urutan } = await catatKeluarIelts(p.id, user.id, p.paket_id, subtes, jenis, penanda);
      return Response.json({
        ok: true,
        pelanggaranId: id,
        urutan,
        digugurkan: false,
        peringatanLayarPenuh: true,
        total: await jumlahPelanggaranIelts(p.id),
      });
    }

    // ---------------- rekaman Listening sedang berputar ----------------
    //
    // Ketetapan pengelola 11 September 2026:
    //
    //   "di rekaman listening, jangan dibuat gagal 20 detik ya, karna itu
    //    bagian dari yang diujiankan."
    //
    // Selama rekaman berjalan peserta memang tidak menyentuh apa pun — ia
    // mendengarkan — sehingga layar ponselnya meredup lalu terkunci sendiri.
    // Kejadiannya TETAP DICATAT untuk pengawas, hanya diturunkan menjadi
    // `pergi_saat_rekaman` yang tidak menggugurkan dan tidak memakan anggaran
    // 20 detik.
    //
    // DUA PAGAR yang membuat ini bukan pintu belakang, dan keduanya wajib
    // dipertahankan: subtesnya diperiksa DI SINI (bendera `rekaman` datang dari
    // peramban dan bisa dipalsukan; nama subtesnya tidak), dan `alt_tab` serta
    // `tangkap_layar` tetap menggugurkan sebab keduanya menuntut tombol yang
    // ditekan seseorang — mendengarkan rekaman tidak menghasilkan salah satunya.
    if (saatRekaman(muatan, subtes) && dimaafkanSaatRekaman(jenis)) {
      const { id, urutan } = await catatKeluarIelts(
        p.id,
        user.id,
        p.paket_id,
        subtes,
        "pergi_saat_rekaman",
        penanda,
      );
      return Response.json({
        ok: true,
        pelanggaranId: id,
        urutan,
        digugurkan: false,
        rekaman: true,
        total: await jumlahPelanggaranIelts(p.id),
      });
    }

    const { id, urutan } = await catatKeluarIelts(p.id, user.id, p.paket_id, subtes, jenis, penanda);

    // Kepergian tidak dinilai pada DETIK kepergiannya — yang dinilai lamanya,
    // dan itu baru diketahui pada `aksi: "kembali"` (atau dari denyut yang
    // hilang, bila peserta tidak pernah mengabari kembalinya).
    if (
      !menggugurkanKeluar(jenis, {
        adaLayarPenuh: muatan.adaLayarPenuh === true,
        dalamLayarPenuh: muatan.dalamLayarPenuh === true,
      })
    ) {
      return Response.json({
        ok: true,
        pelanggaranId: id,
        urutan,
        digugurkan: false,
        peringatan: true,
        kePergi: await jumlahKepergianIelts(p.id),
        total: await jumlahPelanggaranIelts(p.id),
      });
    }

    const pesan = pesanGugurJenis("ielts", jenis);
    await gugurkanIelts(p.id, pesan);
    return Response.json({ ok: true, pelanggaranId: id, urutan, digugurkan: true, pesan });
  }

  /* ---------------- kembali ke halaman ---------------- */
  if (muatan.aksi === "kembali") {
    // Sengaja tetap dilayani meski ujian sudah digugurkan — di sinilah lama
    // kepergian peserta tercatat sebagai bukti untuk pengawas.
    if (p.status === "finished") {
      return Response.json({ ok: false, selesai: true }, { status: 409 });
    }
    const id = Number(muatan.pelanggaranId);
    const durasi = id ? await catatKembaliIelts(id, p.id) : null;

    if (p.status === "ongoing") {
      // REM LAMA-PERGI: satu kepergian yang melewati ambang.
      const terlaluLama = durasi !== null && durasi > AMBANG_KEMBALI_DETIK;
      if (terlaluLama && await naikkanPergiLamaIelts(id, p.id)) {
        const pesan = pesanGugurJenis("ielts", "pergi_lama");
        await gugurkanIelts(p.id, pesan);
        return Response.json({
          ok: true,
          durasiDetik: durasi,
          total: await jumlahPelanggaranIelts(p.id),
          digugurkan: true,
          pesan,
        });
      }

      // REM MENUMPUK: jumlah seluruh kepergian, supaya bolak-balik lima detik
      // sepuluh kali tidak lolos dari rem mana pun.
      const totalDetik = await totalDetikKepergianIelts(p.id);
      if (totalDetik >= BUDGET_PERGI_DETIK && await naikkanPergiMenumpukIelts(id, p.id, totalDetik)) {
        const pesan = pesanGugurJenis("ielts", "pergi_menumpuk");
        await gugurkanIelts(p.id, pesan);
        return Response.json({
          ok: true,
          durasiDetik: durasi,
          totalDetik,
          budgetDetik: BUDGET_PERGI_DETIK,
          total: await jumlahPelanggaranIelts(p.id),
          digugurkan: true,
          pesan,
        });
      }

      await tandaiTotalKepergianIelts(id, p.id, totalDetik, BUDGET_PERGI_DETIK);

      return Response.json({
        ok: true,
        durasiDetik: durasi,
        totalDetik,
        budgetDetik: BUDGET_PERGI_DETIK,
        total: await jumlahPelanggaranIelts(p.id),
        digugurkan: false,
        peringatan: true,
        kePergi: await jumlahKepergianIelts(p.id),
        batasDetik: AMBANG_KEMBALI_DETIK,
      });
    }

    return Response.json({
      ok: true,
      durasiDetik: durasi,
      total: await jumlahPelanggaranIelts(p.id),
      digugurkan: p.status === "gugur",
      pesan: PESAN_TERSIMPAN,
    });
  }

  return Response.json({ ok: false, pesan: "Aksi tidak dikenal." }, { status: 400 });
}
