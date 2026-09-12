import { getSession } from "@/lib/auth/auth";
import { balasanTerlaluSering, hitungLaju } from "@/lib/core/laju";
import { getAttempt, gugurkanUjian, jalurPaket, pesanGugur } from "@/lib/tryout/exam";
import { AMBANG_DENYUT_DETIK, AMBANG_DENYUT_TERLIHAT_DETIK } from "@/lib/penjagaan/denyut";
import { pesanGugurJenis } from "@/lib/penjagaan/pelanggaran-jenis";
import {
  catatDenyut,
  catatDenyutHilang,
  catatDenyutTersendat,
  jumlahPelanggaran,
} from "@/lib/penjagaan/pelanggaran";

export const dynamic = "force-dynamic";

interface Muatan {
  attemptId: number;
  /** true = penjagaan sudah menyala (peserta sudah melewati gerbang). */
  aktif?: boolean;
  /**
   * true = denyut pertama sesudah halaman dimuat. Jedanya tetap dinilai walau
   * penjagaan belum menyala, supaya memuat ulang halaman tidak menghapus jejak
   * kepergian yang baru saja terjadi.
   */
  mula?: boolean;
  subtes?: string | null;
  /**
   * true = sejak denyut terakhir yang berhasil, `visibilityState` halaman tidak
   * pernah menjadi `hidden`. Hanya halaman yang benar-benar hidup di depan
   * peserta yang bisa mengirim ini: halaman yang disembunyikan di iPhone
   * dibekukan sebelum sempat mengirim apa pun, dan di Android nilainya sudah
   * berubah menjadi `false` sebelum pembatasan timer bekerja.
   */
  terlihat?: boolean;
  /** Berapa kali halaman mencoba berdenyut selama jeda ini (termasuk yang ini). */
  percobaan?: number;
  /**
   * true = sepanjang jeda ini peserta berada di SOAL ISIAN SINGKAT, kolom
   * jawabannya dipegang papan ketik.
   *
   * Dikirim untuk satu keadaan yang tidak bisa dibuktikan dengan cara lain:
   * halaman yang DIBEKUKAN peramban, bukan halaman yang ditinggalkan. Panel
   * sistem WebKit ("Typing is not allowed in full screen websites"), permintaan
   * tempel, dan tawaran isi-otomatis semuanya menghentikan JavaScript selama
   * mereka terpampang — dan halaman yang beku tidak bisa mencoba berdenyut,
   * sehingga `percobaan` tidak pernah sampai 2 dan bukti "tersendat" yang biasa
   * mustahil dikumpulkannya.
   */
  mengetik?: boolean;
}

/**
 * Denyut nadi ruang ujian — penjaga utama untuk iPhone.
 *
 * Di laptop dan Android, kepergian peserta dilaporkan sendiri oleh halaman
 * lewat `visibilitychange` dan `blur`. Di iPhone kedua jalur itu tidak bisa
 * diandalkan: `blur` tidak pernah terpancar, dan WebKit membekukan JavaScript
 * begitu cepat sesudah halaman disembunyikan sehingga laporan yang sedang
 * dikirim ikut mati. Akibatnya server tetap menganggap ujian berjalan, dan
 * peserta cukup memuat ulang halaman untuk melanjutkan seolah tidak terjadi apa
 * pun — bilah alamat Safari memang selalu terlihat karena di sana tidak ada
 * layar penuh yang sungguhan.
 *
 * Rute ini membalik bebannya. Selama penjagaan menyala, halaman wajib berdenyut
 * tiap {@link JEDA_DENYUT} milidetik. Server tidak menunggu laporan kepergian;
 * ia mengukur jarak antara dua denyut. Jarak yang melebihi
 * {@link AMBANG_DENYUT_DETIK} berarti halaman itu tidak berada di depan peserta.
 *
 * KEHENINGAN YANG MELEWATI AMBANG MENGGUGURKAN sejak 8 September 2026 sore —
 * inilah pasangan dari rem lama-pergi di `../violation/route.ts`, dan tanpanya
 * rem itu tidak berarti apa-apa: peserta cukup menutup tabnya supaya laporan
 * "kembali" tidak pernah terkirim, lalu kepergian sepanjang apa pun tidak
 * berakibat apa pun. Keheningan tidak bisa dipalsukan menjadi kehadiran.
 *
 * SATU KEHENINGAN YANG TETAP AMAN, dan pemisahnya wajib dipertahankan: jeda
 * yang halamannya BISA MEMBUKTIKAN ia tetap terlihat dan terus mencoba
 * menghubungi server (`denyut_tersendat`). Itu jaringan peserta yang putus,
 * bukan pesertanya yang pergi — dan menggugurkan orang karena sinyalnya hilang
 * adalah menghukum atas perbuatan yang bukan miliknya.
 *
 * Layar ponsel yang meredup lebih lama dari ambang kini ikut menggugurkan.
 * Pengelola menerima harga itu dengan sadar; yang menahannya adalah Screen Wake
 * Lock di ruang ujian dan tata tertib yang menyuruh peserta mematikan Kunci
 * Otomatis sebelum mulai.
 *
 * Denyut dari balik gerbang (`aktif: false`) tetap dikirim supaya server tahu
 * halaman hidup, tetapi TIDAK pernah dipakai menghitung jeda — peserta yang
 * sedang membaca petunjuk pemasangan Layar Utama belum berada di bawah
 * penjagaan.
 */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ ok: false }, { status: 401 });

  // Anggaran 60/menit = lima kali laju denyut yang sebenarnya (12/menit).
  // Yang dijaga di sini bukan pemakaian berlebih, melainkan satu klien rusak
  // yang berputar tanpa henti. Peserta yang jujur tidak akan pernah
  // menyentuhnya. Ditolaknya pun tidak menggugurkan: 429 dibaca ruang ujian
  // sebagai "coba lagi", persis seperti jaringan yang tersendat.
  const laju = await hitungLaju("denyut", user.id);
  if (!laju.boleh) return balasanTerlaluSering(laju);

  let muatan: Muatan;
  try {
    muatan = (await request.json()) as Muatan;
  } catch {
    return Response.json({ ok: false, pesan: "Muatan tidak valid." }, { status: 400 });
  }

  const att = await getAttempt(Number(muatan.attemptId));
  if (!att || att.user_id !== user.id) return Response.json({ ok: false }, { status: 404 });

  // Alasan yang SUDAH tersimpan selalu menang, supaya peserta yang memuat ulang
  // halaman membaca sebab yang sama persis dengan yang tadi muncul di layarnya.
  const jalur = await jalurPaket(att.package_id);
  const PESAN_TERSIMPAN = att.alasan_gugur ?? pesanGugur(jalur);

  if (att.status !== "ongoing") {
    return Response.json(
      { ok: false, selesai: true, digugurkan: att.status === "gugur", pesan: PESAN_TERSIMPAN },
      { status: 409 },
    );
  }

  const aktif = muatan.aktif === true;
  // Pembongkaran yang disengaja (menutup subtes, meninggalkan ruang ujian lewat
  // tombol) datang sebagai aktif:false TANPA mula — dan hanya itu yang boleh
  // menghapus jejak. Muat ulang halaman datang sebagai aktif:false DENGAN mula,
  // dan jedanya tetap dihitung.
  const jeda = await catatDenyut(att.id, aktif, aktif || muatan.mula === true);

  if (jeda !== null && jeda > AMBANG_DENYUT_DETIK) {
    // Jeda yang halamannya bisa MEMBUKTIKAN bukan kepergian: ia terlihat
    // sepanjang waktu dan berkali-kali mencoba menghubungi server, tetapi
    // permintaannya tidak sampai. Itu jaringan yang putus, bukan peserta yang
    // pergi — dan menggugurkan peserta karena sinyalnya hilang adalah menghukum
    // orang atas perbuatan yang bukan miliknya. Tetap dicatat penuh untuk
    // pengawas, hanya tidak menggugurkan.
    // DUA BENTUK BUKTI, satu putusan. Keduanya sama-sama menuntut halaman
    // TIDAK PERNAH tersembunyi sepanjang jeda (`terlihat`) dan jedanya masih di
    // bawah AMBANG_DENYUT_TERLIHAT_DETIK:
    //
    //   · `percobaan >= 2`  — halaman hidup dan berkali-kali mencoba
    //     menghubungi server: jaringan peserta yang putus.
    //   · `mengetik`        — peserta berada di soal isian singkat dengan kolom
    //     jawabannya dipegang papan ketik. Di sanalah peramban memunculkan
    //     panel sistemnya sendiri dan MEMBEKUKAN halaman, sehingga halaman
    //     tidak sempat mencoba apa pun. Ditambahkan 9 September 2026 sesudah
    //     penguji iPad digugurkan justru saat mengetik jawaban: panel WebKit
    //     "Typing is not allowed in full screen websites" membekukan denyutnya
    //     lebih dari 20 detik.
    //
    // HARGA YANG DISADARI: peserta yang meninggalkan perangkatnya dengan kolom
    // isian singkat terbuka mendapat kelonggaran yang sama, sampai 90 detik.
    // Itu dipilih dengan sengaja — sama seperti kelonggaran jaringan di
    // sebelahnya — karena menggugurkan orang yang sedang mengetik jawabannya
    // jauh lebih mahal daripada melewatkan satu kepergian yang tetap TERCATAT
    // penuh untuk pengawas di `/admin/pelanggaran`.
    const terbukti =
      muatan.terlihat === true &&
      jeda <= AMBANG_DENYUT_TERLIHAT_DETIK &&
      (Number(muatan.percobaan ?? 0) >= 2 || muatan.mengetik === true);

    if (terbukti) {
      await catatDenyutTersendat(
        att.id,
        user.id,
        att.package_id,
        muatan.subtes ?? att.subtes_aktif ?? null,
        jeda,
        Number(muatan.percobaan ?? 0),
      );
      return Response.json({
        ok: true,
        digugurkan: false,
        tersendat: true,
        jedaDetik: jeda,
        total: await jumlahPelanggaran(att.id),
      });
    }

    // Denyut yang hilang tanpa bukti apa pun berarti halamannya memang tidak
    // berada di depan peserta: ditinggalkan, ditutup, atau layarnya dimatikan.
    // Keempatnya identik di mata peramban, jadi barisnya selalu dicatat lebih
    // dulu — pengawas berhak membaca lama diamnya — dan baru sesudah itu
    // akibatnya dijatuhkan.
    await catatDenyutHilang(
      att.id,
      user.id,
      att.package_id,
      muatan.subtes ?? att.subtes_aktif ?? null,
      jeda,
    );

    const pesan = pesanGugurJenis(jalur, "denyut_hilang");
    await gugurkanUjian(att.id, pesan);
    return Response.json({
      ok: true,
      digugurkan: true,
      dicatat: true,
      jedaDetik: jeda,
      pesan,
      total: await jumlahPelanggaran(att.id),
    });
  }

  return Response.json({ ok: true, digugurkan: false, jedaDetik: jeda });
}
