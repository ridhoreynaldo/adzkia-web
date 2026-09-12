import { getSession } from "@/lib/auth/auth";
import { getAttempt, gugurkanUjian, jalurPaket } from "@/lib/tryout/exam";
import { menggugurkanKeluar, pesanGugur, pesanGugurJenis } from "@/lib/penjagaan/pelanggaran-jenis";
import { AMBANG_KEMBALI_DETIK, BUDGET_PERGI_DETIK } from "@/lib/penjagaan/denyut";
import {
  catatKeluar,
  catatKembali,
  catatPercobaan,
  jumlahKepergian,
  jumlahPelanggaran,
  naikkanKePergiLama,
  naikkanKePergiMenumpuk,
  tandaiTotalKepergian,
  totalDetikKepergian,
} from "@/lib/penjagaan/pelanggaran";

export const dynamic = "force-dynamic";

interface Muatan {
  attemptId: number;
  aksi: "keluar" | "kembali" | "percobaan";
  subtes?: string | null;
  violationId?: number;
  jenis?: string;
  keterangan?: string;
  /**
   * Penanda kejadian buatan peramban. Satu kepergian dilaporkan DUA kali —
   * lewat `navigator.sendBeacon` yang selamat dari pembekuan halaman iPhone,
   * dan lewat `fetch` yang membawa jawaban server kembali ke layar. Penanda
   * yang sama membuat laporan kedua menempel ke baris yang sudah ada.
   */
  kejadian?: string;
  /**
   * true = saat halaman disembunyikan, mode layar penuh SUDAH LEPAS pada
   * perangkat yang sebenarnya mendukungnya. Inilah yang membedakan layar HP
   * yang meredup (layar penuh masih terpasang) dari peserta yang menekan Esc
   * lalu berpindah ke layar lain.
   */
  /** Perangkatnya benar-benar punya Fullscreen API. */
  adaLayarPenuh?: boolean;
  /** Saat halaman disembunyikan, mode layar penuh masih terpasang. */
  dalamLayarPenuh?: boolean;
}


/**
 * Jenis kepergian yang boleh dilaporkan lewat `aksi: "keluar"`. Nilai lain —
 * termasuk jenis catatan seperti `salin` — jatuh ke `keluar_tab`, supaya peserta
 * tidak bisa mengarang jenis sendiri lewat muatan permintaan.
 */
const JENIS_KELUAR = new Set([
  "keluar_tab",
  "blur_window",
  "keluar_layar_penuh",
  // Dua jenis baru 8 September 2026, keduanya menggugurkan. Peramban yang
  // mengirimkannya sudah memastikan lebih dulu bahwa perbuatannya memang
  // sengaja — layar penuh yang lepas di peramban komputer, dan ALT yang masih
  // tertekan pada detik fokus hilang. Server tidak bisa memeriksa ulang
  // kesimpulan itu (ia tidak melihat papan ketik siapa pun), tetapi peserta
  // juga tidak diuntungkan dengan mengarangnya: yang bisa dikarang dari sini
  // hanya menggugurkan dirinya sendiri.
  "esc_layar_penuh",
  "alt_tab",
  // Potret layar yang ketahuan dari tombolnya (PrintScreen dan kawan-kawan).
  "tangkap_layar",
]);

/**
 * Mencatat kejadian keamanan selama ujian.
 *
 * Dua tingkat, dibedakan oleh `aksi`:
 *
 *  - `keluar`    peserta meninggalkan halaman. Akibatnya berbeda menurut jenis:
 *                  · `blur_window` (halaman MASIH terlihat, tapi fokus pindah ke
 *                    jendela/aplikasi lain lebih dari 3 detik) — menggugurkan.
 *                  · `esc_layar_penuh` (layar penuh dilepas di peramban
 *                    KOMPUTER) — menggugurkan.
 *                  · `alt_tab` (ALT/Command masih tertekan saat fokus hilang)
 *                    — menggugurkan.
 *                  · `keluar_layar_penuh` (layar penuh lepas di ponsel/tablet)
 *                    — dicatat saja: di sana notifikasi dan isyarat navigasi
 *                    melepasnya tanpa disentuh siapa pun.
 *                  · `keluar_tab` (halaman DISEMBUNYIKAN) — dicatat dulu.
 *                    Akibatnya baru diputuskan saat peserta KEMBALI, dari
 *                    lamanya ia pergi: layar HP yang meredup, layar terkunci,
 *                    tombol '=' Android, dan peserta yang pindah aplikasi
 *                    memancarkan sinyal yang identik, jadi tidak ada yang bisa
 *                    dinilai pada detik kepergiannya.
 *  - `kembali`   menutup catatan kepergian dan menghitung lamanya — DAN di
 *                sinilah kepergian yang melewati AMBANG_KEMBALI_DETIK dinaikkan
 *                menjadi `pergi_lama` lalu menggugurkan.
 *  - `percobaan` menyalin, klik kanan, atau jalan pintas terlarang. Hanya
 *                dicatat untuk laporan pengawas, tidak menggugurkan.
 *
 * Semua keputusan diambil di SERVER supaya tidak bisa dibatalkan peserta dengan
 * menutup dialog, memuat ulang halaman, atau membersihkan storage.
 */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false }, { status: 401 });

  let muatan: Muatan;
  try {
    muatan = (await request.json()) as Muatan;
  } catch {
    return Response.json({ ok: false, pesan: "Muatan tidak valid." }, { status: 400 });
  }

  const att = await getAttempt(Number(muatan.attemptId));
  if (!att || att.user_id !== user.id) return Response.json({ ok: false }, { status: 404 });

  const jalur = await jalurPaket(att.package_id);
  // Alasan yang SUDAH tersimpan selalu menang: kalau peserta memuat ulang
  // halaman sesudah digugurkan, ia harus membaca sebab yang sama persis, bukan
  // kalimat umum yang baru dikarang di sini.
  const PESAN_TERSIMPAN = att.alasan_gugur ?? pesanGugur(jalur);
  const subtes = muatan.subtes ?? att.subtes_aktif ?? null;
  const penanda = muatan.kejadian?.slice(0, 64) || null;

  /* ---------------- percobaan curang: dicatat saja ---------------- */
  if (muatan.aksi === "percobaan") {
    if (att.status !== "ongoing") return Response.json({ ok: false, selesai: true }, { status: 409 });

    const jenis =
      muatan.jenis === "klik_kanan" ||
      muatan.jenis === "pintasan" ||
      muatan.jenis === "tekan_tahan" ||
      muatan.jenis === "lewat_safari"
        ? muatan.jenis
        : "salin";
    await catatPercobaan(
      att.id,
      user.id,
      att.package_id,
      subtes,
      jenis,
      muatan.keterangan?.slice(0, 120) ?? null,
      penanda,
    );
    return Response.json({ ok: true, dicatat: true, total: await jumlahPelanggaran(att.id) });
  }

  /* ---------------- meninggalkan halaman ---------------- */
  if (muatan.aksi === "keluar") {
    if (att.status !== "ongoing") {
      return Response.json(
        { ok: false, selesai: true, digugurkan: att.status === "gugur", pesan: PESAN_TERSIMPAN },
        { status: 409 },
      );
    }

    const jenis = JENIS_KELUAR.has(muatan.jenis ?? "") ? muatan.jenis! : "keluar_tab";

    // Mode layar penuh terlepas DI PONSEL ATAU TABLET: DICATAT SAJA.
    //
    // Di perangkat semacam itu layar penuh lepas sendiri karena notifikasi,
    // putaran layar, atau isyarat navigasi — 105 dari 159 lepasan pada tryout
    // 4-6 September 2026 terjadi di subtes PERTAMA, pada detik-detik sesudah
    // mode itu menyala. Pengelola menegaskan sesudah mengujinya sendiri di
    // iPhone: gerakan perangkat tidak boleh menghentikan ujian siapa pun.
    //
    // Lepasan yang sama di PERAMBAN KOMPUTER datang ke sini dengan jenis
    // `esc_layar_penuh` dan menggugurkan; peramban yang memisahkannya, karena
    // hanya dialah yang tahu perangkat apa yang sedang dipakai.
    if (jenis === "keluar_layar_penuh") {
      const { id, urutan } = await catatKeluar(att.id, user.id, att.package_id, subtes, jenis, penanda);
      return Response.json({
        ok: true,
        violationId: id,
        urutan,
        digugurkan: false,
        peringatanLayarPenuh: true,
        total: await jumlahPelanggaran(att.id),
      });
    }

    const { id, urutan } = await catatKeluar(att.id, user.id, att.package_id, subtes, jenis, penanda);

    // MENINGGALKAN halaman tidak menggugurkan PADA DETIK KEPERGIANNYA.
    //
    // Peramban tidak bisa membedakan halaman yang digeser keluar lalu dibiarkan
    // dari halaman yang ditinggalkan untuk mencari jawaban: begitu disembunyikan
    // ia dibekukan dan tidak melihat apa-apa lagi. Jadi tidak ada yang bisa
    // dinilai sekarang — yang dinilai adalah LAMANYA, dan itu baru diketahui
    // pada `aksi: "kembali"` di bawah (atau dari denyut yang hilang, bila
    // peserta tidak pernah mengabari kembalinya sama sekali).
    //
    // Baris ini tetap dicatat lebih dulu apa pun akhirnya: pengawas berhak
    // membaca setiap kepergian lengkap dengan jam dan lamanya.
    if (!menggugurkanKeluar(jenis, {
      adaLayarPenuh: muatan.adaLayarPenuh === true,
      dalamLayarPenuh: muatan.dalamLayarPenuh === true,
    })) {
      return Response.json({
        ok: true,
        violationId: id,
        urutan,
        digugurkan: false,
        peringatan: true,
        kePergi: await jumlahKepergian(att.id),
        total: await jumlahPelanggaran(att.id),
      });
    }

    const pesan = pesanGugurJenis(jalur, jenis);
    await gugurkanUjian(att.id, pesan);
    return Response.json({ ok: true, violationId: id, urutan, digugurkan: true, pesan });
  }

  /* ---------------- kembali ke halaman ---------------- */
  if (muatan.aksi === "kembali") {
    // Sengaja tetap dilayani meski ujian sudah digugurkan — justru di sinilah
    // lama kepergian peserta tercatat sebagai bukti untuk pengawas.
    if (att.status === "finished") {
      return Response.json({ ok: false, selesai: true }, { status: 409 });
    }
    const id = Number(muatan.violationId);
    const durasi = id ? await catatKembali(id, att.id) : null;

    // REM LAMA-PERGI, dihidupkan kembali 8 September 2026 sore atas permintaan
    // pengelola. Inilah satu-satunya cara yang tersedia untuk menjawab "ketika
    // dia klik halaman lain selain halaman ujian, gagalkan": peramban tidak
    // pernah tahu apa yang dibuka peserta di balik halaman yang tersembunyi,
    // jadi yang dinilai adalah lamanya ia tidak kembali.
    //
    // Menekan '<' atau '=' di Android lalu langsung kembali pulang dalam
    // hitungan detik dan hanya meninggalkan catatan — persis yang diminta.
    if (att.status === "ongoing") {
      const terlaluLama = durasi !== null && durasi > AMBANG_KEMBALI_DETIK;

      // Hanya kepergian biasa yang boleh dinaikkan. Baris yang jenisnya sudah
      // lain — mis. `alt_tab` yang menutup dirinya sendiri — sudah membawa
      // sebab yang benar, dan menimpanya akan menghapus sebab itu.
      if (terlaluLama && await naikkanKePergiLama(id, att.id)) {
        const pesan = pesanGugurJenis(jalur, "pergi_lama");
        await gugurkanUjian(att.id, pesan);
        return Response.json({
          ok: true,
          durasiDetik: durasi,
          total: await jumlahPelanggaran(att.id),
          digugurkan: true,
          pesan,
        });
      }

      // REM MENUMPUK, 9 September 2026. Rem di atas menilai SATU kepergian;
      // yang ini menilai JUMLAHNYA. Tanpa rem kedua ini, peserta yang bolak-
      // balik ke tab sebelah — masing-masing lima detik — tidak pernah
      // menyentuh ambang mana pun, padahal ia sudah menghabiskan menit-menit
      // di halaman jawaban. Lubang itu terbuka lebar sejak WebKit berhenti
      // memakai layar penuh sungguhan dan bilah Safari kembali terlihat di
      // iPad; pengelola menemukannya sendiri saat menguji.
      const totalDetik = await totalDetikKepergian(att.id);

      if (totalDetik >= BUDGET_PERGI_DETIK && await naikkanKePergiMenumpuk(id, att.id, totalDetik)) {
        const pesan = pesanGugurJenis(jalur, "pergi_menumpuk");
        await gugurkanUjian(att.id, pesan);
        return Response.json({
          ok: true,
          durasiDetik: durasi,
          totalDetik,
          budgetDetik: BUDGET_PERGI_DETIK,
          total: await jumlahPelanggaran(att.id),
          digugurkan: true,
          pesan,
        });
      }

      // Pola bolak-baliknya ditulis ke keterangan barisnya, supaya pengawas
      // melihat hitungan yang sama dengan yang dilihat peserta — bukan sekadar
      // deretan kepergian pendek yang masing-masing tampak tak berarti.
      await tandaiTotalKepergian(id, att.id, totalDetik, BUDGET_PERGI_DETIK);

      return Response.json({
        ok: true,
        durasiDetik: durasi,
        totalDetik,
        budgetDetik: BUDGET_PERGI_DETIK,
        total: await jumlahPelanggaran(att.id),
        digugurkan: false,
        peringatan: true,
        kePergi: await jumlahKepergian(att.id),
        batasDetik: AMBANG_KEMBALI_DETIK,
      });
    }

    return Response.json({
      ok: true,
      durasiDetik: durasi,
      total: await jumlahPelanggaran(att.id),
      digugurkan: att.status === "gugur",
      pesan: PESAN_TERSIMPAN,
    });
  }

  return Response.json({ ok: false, pesan: "Aksi tidak dikenal." }, { status: 400 });
}
