import { AMBANG_KEMBALI_DETIK, BUDGET_PERGI_DETIK } from "@/lib/penjagaan/denyut";

/**
 * Jenis pelanggaran ujian, akibatnya, dan kalimat yang dibaca peserta.
 *
 * Sengaja bebas dari `server-only` maupun impor basis data: rute API, panel
 * admin, DAN ruang ujian di peramban harus memakai daftar yang SAMA. Sebelum
 * berkas ini ada, peramban menebak sendiri apakah sebuah kejadian menggugurkan,
 * dan tebakan itu sempat salah — halaman menampilkan layar GAGAL untuk kejadian
 * yang menurut server hanya sebuah catatan.
 */

/**
 * Jenis kejadian yang menggugurkan ujian.
 *
 * LIMA, sejak 8 September 2026 — dua permintaan pengelola pada hari yang sama.
 * Pagi, tentang peramban komputer:
 *
 *   "Tingkatkan tingkat keamanan kecurangan pada web browser Chrome, Firefox,
 *    Opera, Edge, Brave, Safari: tekan ESC pada halaman layar penuh maka
 *    dianggap gagal; menekan ALT+TAB maka dianggap gagal."
 *
 * Sore, tentang HP Android dan iOS — lihat PERGESERAN di bawah.
 *
 * Tiga yang pertama punya satu ciri yang sama, dan ciri itulah yang membuat
 * pengetatan ini tidak mengulangi bencana 4-6 September (46% peserta gugur
 * bukan karena curang): SEMUANYA MENUNTUT PERBUATAN SENGAJA DI DEPAN PAPAN
 * KETIK. Tidak ada baterai habis, layar meredup, notifikasi masuk, atau isyarat
 * navigasi yang bisa menghasilkan salah satunya.
 *
 * Dua yang terakhir tidak begitu, dan itu harus disadari: yang mereka ukur
 * adalah LAMANYA TIDAK KEMBALI, bukan perbuatan. Layar HP yang padam lebih dari
 * 20 detik menghasilkan bentuk yang sama dengan peserta yang membuka aplikasi
 * lain. Pengelola menerima harga itu dengan sadar; yang menahannya adalah
 * Screen Wake Lock di ruang ujian dan tata tertib yang menyuruh peserta
 * mematikan Kunci Otomatis sebelum mulai.
 *
 *  - `blur_window`      halaman ujian MASIH TERLIHAT di layar, tetapi papan
 *                       ketik dan tetikus berpindah ke jendela atau aplikasi
 *                       lain yang dibuka berdampingan dengannya, lebih dari
 *                       tiga detik.
 *  - `esc_layar_penuh`  mode layar penuh dilepas DI PERAMBAN KOMPUTER. Di sana
 *                       layar penuh tidak pernah lepas sendiri: satu-satunya
 *                       cara melepasnya adalah menekan tombolnya.
 *  - `alt_tab`          ALT+TAB (atau Command+Tab) ditekan untuk berpindah ke
 *                       jendela lain. Terbaca dari tombol ALT/Command yang
 *                       masih tertekan pada detik jendela kehilangan fokus.
 *                       BERLAKU DI SEMUA PERANGKAT (ditegaskan pengelola,
 *                       8 September 2026) — termasuk HP dan tablet yang dipakai
 *                       bersama papan ketik. Tidak ada pembatas perangkat di
 *                       sini, dan tidak boleh ditambahkan: perangkat sentuh
 *                       tanpa papan ketik memang tidak bisa memancarkan tombol
 *                       ALT sama sekali, jadi aturannya tidak pernah menyentuh
 *                       mereka dengan sendirinya.
 *
 *  - `pergi_lama`       peserta meninggalkan halaman ujian dan BARU kembali
 *                       sesudah AMBANG_KEMBALI_DETIK (20 detik) lewat.
 *  - `denyut_hilang`    peserta meninggalkan halaman ujian dan tidak pernah
 *                       mengabarkan kembalinya; keheningan denyutnya sendiri
 *                       yang melewati ambang itu.
 *
 * PERGESERAN 8 SEPTEMBER 2026 SORE, dan riwayatnya harus dibaca utuh sebelum
 * berkas ini disentuh lagi. Aturan 7 September berbunyi:
 *
 *   "Kalau dia hanya keluar dari halaman ujiannya saja, tanpa mengeklik
 *    aplikasi lain, jangan dinyatakan gagal — walaupun siswanya lama keluar."
 *
 * Pengelola MENGUBAHNYA sesudah mencoba sendiri di Android:
 *
 *   "Tombol navigasi '<' dan '=' ada di Android. Ketika klik itu, keluar dari
 *    layar penuh, kemudian dia belum mengklik/mengembalikan halaman ujian — itu
 *    jangan digagalkan, tapi dicatat saja. Dan ketika dia klik halaman lain
 *    selain dari halaman ujian, maka gagalkan saja."
 *
 * "Klik halaman lain" TIDAK BISA DIKENALI peramban — halaman yang disembunyikan
 * langsung dibekukan dan tidak melihat apa pun lagi. Yang masih bisa diukur
 * hanya lamanya tidak kembali, dan itulah yang dipakai: kembali dalam 20 detik
 * dicatat saja (menekan '<' atau '=' lalu balik), lebih dari itu digugurkan.
 *
 * Yang TIDAK ikut berubah: `keluar_layar_penuh` di ponsel dan tablet tetap
 * hanya dicatat — notifikasi, putaran layar, dan isyarat navigasi memang
 * melepas layar penuh tanpa disentuh siapa pun, dan menekan '<' pun hanya
 * melepas layar penuh tanpa memindahkan peserta ke mana-mana.
 *
 * PEMBEDAAN PERANGKAT ITU HANYA UNTUK LAYAR PENUH, tidak untuk yang lain.
 * `esc_layar_penuh` dibatasi peramban komputer karena hanya di sanalah lepasnya
 * layar penuh membuktikan ada tombol yang ditekan; `alt_tab` dan `blur_window`
 * berlaku di mana saja karena keduanya sudah membuktikan perbuatan itu sendiri
 * tanpa bantuan tebakan perangkat.
 *
 * YANG MASIH TIDAK TERTANGKAP, dan jangan dijanjikan kepada siapa pun bahwa ia
 * tertangkap: kecurangan yang selesai dalam kurang dari 20 detik. Peserta yang
 * menekan '=' , melirik satu jawaban yang sudah terbuka di aplikasi lain, lalu
 * kembali dalam sepuluh detik hanya meninggalkan sebuah catatan. Peramban tidak
 * bisa melihat apa yang dibuka, dan memperpendek ambangnya akan menggugurkan
 * peserta yang layarnya cuma berkedip. Yang menutup sisa itu tetap laporan
 * pengawas: setiap kepergian tercatat lengkap dengan lama dan jumlahnya di
 * `/admin/pelanggaran`, dan di sanalah manusia menilai.
 *
 * Jumlah kepergian TETAP tidak menggugurkan (BATAS_PERGI masih dihapus).
 * Jangan menghidupkannya tanpa permintaan pengelola.
 */
export const JENIS_MENGGUGURKAN = [
  "blur_window",
  "esc_layar_penuh",
  "alt_tab",
  // Dua wajah dari SATU aturan (8 September 2026): meninggalkan halaman ujian
  // lebih dari AMBANG_KEMBALI_DETIK. Dipisah karena jalur pembuktiannya
  // berbeda, bukan karena perbuatannya berbeda.
  //
  //   `pergi_lama`    peserta KEMBALI, dan catatannya ditutup dengan durasi
  //                   yang melewati ambang. Diputuskan di rute violation.
  //   `denyut_hilang` peserta TIDAK kembali — atau kembali sesudah halamannya
  //                   telanjur dibekukan peramban sehingga laporan "kembali"
  //                   tidak pernah terkirim. Yang membuktikannya bukan laporan
  //                   melainkan KEHENINGAN: jarak antar-denyut yang melebihi
  //                   ambang. Diputuskan di rute denyut.
  //
  // Keduanya wajib ada. Tanpa `denyut_hilang`, peserta cukup menutup tabnya
  // supaya laporan "kembali" tidak pernah dikirim, dan kepergian sepanjang apa
  // pun tidak berakibat apa-apa.
  "pergi_lama",
  // Kepergian yang MENUMPUK: masing-masing di bawah ambang, tetapi jumlahnya
  // melewati BUDGET_PERGI_DETIK. Lahir 9 September 2026, sesudah layar penuh
  // sungguhan berhenti dipakai di WebKit dan tab kedua Safari kembali berada
  // satu ketukan dari soal. Tanpa jenis ini, bolak-balik lima detik sepuluh
  // kali tidak pernah menyentuh rem apa pun.
  "pergi_menumpuk",
  "denyut_hilang",
  // Menangkap layar soal (8 September 2026, permintaan pengelola).
  //
  // BACA BATASNYA SEBELUM MENJANJIKAN APA PUN KEPADA SIAPA PUN. Yang bisa
  // ditangkap hanyalah TOMBOL yang ditekan di papan ketik — PrintScreen,
  // Win+Shift+S, Cmd+Shift+3/4/5, Ctrl+Shift+S. Itu mencakup laptop dan
  // komputer, dan HP/tablet yang memakai papan ketik luar.
  //
  // TIDAK ADA satu pun halaman web yang bisa mengetahui bahwa seseorang menekan
  // Power+VolumeDown di Android atau Power+VolumeUp di iPhone: potret layar di
  // sana dikerjakan sistem operasi tanpa memberi tahu halaman yang sedang
  // terbuka, dan tidak ada API apa pun — di peramban mana pun — yang
  // membocorkannya. Jadi jenis ini TIDAK menangkap potret layar dari tombol
  // fisik ponsel. Jangan menuliskan sebaliknya di teks yang dibaca peserta.
  "tangkap_layar",
] as const;

/**
 * Keadaan layar penuh pada detik kepergian.
 *
 * Masih dikirim peramban dan masih disimpan untuk laporan pengawas, tetapi
 * TIDAK LAGI menentukan gugur atau tidaknya seseorang. Dulu ia yang membedakan
 * "layar padam sendiri" dari "Esc lalu pindah layar"; sekarang keduanya
 * sama-sama hanya dicatat.
 */
export interface KeadaanKepergian {
  /** Perangkatnya benar-benar punya Fullscreen API. */
  adaLayarPenuh?: boolean;
  /** Saat halaman disembunyikan, mode layar penuh masih terpasang. */
  dalamLayarPenuh?: boolean;
}

/**
 * Apakah sebuah kepergian menggugurkan?
 *
 * Hanya bila jenisnya sendiri memang menggugurkan. `keadaan` tetap diterima
 * supaya pemanggilnya tidak perlu diubah dan supaya bentuk muatannya tetap
 * tercatat, tetapi isinya tidak lagi mengubah putusan.
 */
export function menggugurkanKeluar(jenis: string, keadaan: KeadaanKepergian): boolean {
  // `keadaan` sengaja dibaca sekali walau tidak lagi mengubah putusan: bentuk
  // muatannya tetap wajib benar, dan pembaca berikutnya harus melihat bahwa
  // keterangan itu memang sampai ke sini.
  void keadaan;
  return menggugurkan(jenis);
}

/** Jenis kejadian yang hanya dicatat untuk laporan pengawas. */
export const JENIS_CATATAN = [
  // Halaman ujian disembunyikan — digeser keluar, tombol '=' Android, berpindah
  // aplikasi, layar meredup, layar terkunci — DAN PESERTA KEMBALI SEBELUM
  // AMBANG_KEMBALI_DETIK habis. Kelimanya memancarkan sinyal yang identik dan
  // peramban tidak bisa memisahkannya, jadi kepergian singkat semacam itu
  // dicatat saja.
  //
  // Kepergian yang MELEWATI ambang tidak berhenti di sini: barisnya dinaikkan
  // menjadi `pergi_lama` saat ditutup, dan itu menggugurkan.
  "keluar_tab",
  // Mode layar penuh dilepas DI PONSEL ATAU TABLET: notifikasi, putaran layar,
  // isyarat navigasi, atau bilah sistem yang muncul sendiri. Di perangkat
  // semacam itu lepasnya layar penuh sama sekali bukan bukti perbuatan
  // seseorang — 105 dari 159 lepasan pada tryout 4-6 September 2026 terjadi di
  // PU, subtes pertama, pada detik-detik sesudah mode itu menyala. Jadi ini
  // tetap DICATAT SAJA.
  //
  // Lepasan yang sama di PERAMBAN KOMPUTER punya jenisnya sendiri —
  // `esc_layar_penuh` — dan itu menggugurkan, karena di sana layar penuh tidak
  // punya cara lepas selain tombol yang ditekan seseorang.
  "keluar_layar_penuh",
  // Denyut sempat hilang, TAPI halamannya membuktikan diri masih terlihat dan
  // masih berusaha menghubungi server sepanjang jeda itu — jaringan peserta
  // yang putus, bukan pesertanya yang pergi.
  "denyut_tersendat",
  "salin",
  "klik_kanan",
  "pintasan",
  // Tekan-tahan di iOS memunculkan menu Salin/Bagikan/Look Up milik sistem.
  // `contextmenu` tidak terpancar di sana, jadi ini jalur pencatatan terpisah.
  "tekan_tahan",
  // Peserta iPhone memilih mengerjakan dari Safari biasa, bukan dari ikon Layar
  // Utama. Bukan kecurangan, tapi pengawas berhak tahu siapa yang bilah
  // alamatnya masih menempel.
  "lewat_safari",
  // HANYA IELTS — 11 September 2026, ketetapan pengelola:
  //
  //   "di rekaman listening, jangan dibuat gagal 20 detik ya, karna itu bagian
  //    dari yang diujiankan."
  //
  // Selama rekaman Listening BERPUTAR, peserta memang tidak menyentuh apa pun:
  // ia mendengarkan. Layar ponsel meredup lalu terkunci, halaman disembunyikan,
  // dan denyutnya berhenti — padahal ia sedang mengerjakan bagian ujian yang
  // paling penting. Seluruh kepergian dan hilangnya fokus pada masa itu mendarat
  // di sini alih-alih menjadi `blur_window`, `esc_layar_penuh`, `keluar_tab`,
  // `pergi_lama`, `pergi_menumpuk`, atau `denyut_hilang`.
  //
  // DUA HAL YANG TIDAK IKUT DIMAAFKAN, dan batas inilah yang membuat pemaafan
  // ini bukan pintu belakang: `alt_tab` dan `tangkap_layar`. Keduanya menuntut
  // tombol yang ditekan seseorang di depan papan ketik — mendengarkan rekaman
  // tidak pernah menghasilkan salah satunya.
  //
  // Detiknya juga TIDAK ikut dijumlahkan ke anggaran 20 detik; lihat
  // `totalDetikKepergian()` dan kembarannya di `ielts-penjagaan.ts`.
  "pergi_saat_rekaman",
] as const;

export type JenisPelanggaran =
  | (typeof JENIS_MENGGUGURKAN)[number]
  | (typeof JENIS_CATATAN)[number];

export function menggugurkan(jenis: string): boolean {
  return (JENIS_MENGGUGURKAN as readonly string[]).includes(jenis);
}

/**
 * Jenis yang TETAP menggugurkan walaupun rekaman Listening sedang berputar.
 *
 * Keduanya menuntut tombol yang ditekan seseorang di depan papan ketik, dan
 * mendengarkan rekaman tidak pernah menghasilkan salah satunya. Inilah yang
 * menjaga pemaafan rekaman tetap menjadi pemaafan, bukan jeda tanpa penjagaan.
 */
export const TETAP_GUGUR_SAAT_REKAMAN: readonly string[] = ["alt_tab", "tangkap_layar"];

/**
 * true bila kejadian `jenis` harus DIMAAFKAN karena terjadi selagi rekaman
 * Listening diputar — yaitu diturunkan menjadi `pergi_saat_rekaman`.
 *
 * Ketetapan pengelola 11 September 2026. Alasannya ditulis lengkap pada entri
 * `pergi_saat_rekaman` di {@link JENIS_CATATAN}.
 *
 * HANYA BERLAKU DI IELTS, dan hanya pada subtes LISTENING — pemanggilnya di
 * server wajib memeriksa subtesnya sendiri, sebab bendera "rekaman berputar"
 * datang dari peramban dan peramban bisa berbohong. Jalur UTBK dan SKD tidak
 * punya rekaman, jadi fungsi ini tidak pernah menyentuh mereka.
 */
export function dimaafkanSaatRekaman(jenis: string): boolean {
  if (TETAP_GUGUR_SAAT_REKAMAN.includes(jenis)) return false;
  // `keluar_tab` ikut diturunkan MESKIPUN ia sendiri tidak menggugurkan, dan
  // ini bukan kelebihan melainkan syarat: detiknya memakan anggaran 20 detik,
  // dan barisnya DINAIKKAN menjadi `pergi_lama` begitu ditutup dengan durasi
  // yang melewati ambang. Membiarkannya apa adanya berarti pemaafan ini tidak
  // menyelamatkan siapa pun — peserta tetap gugur, hanya lewat jalan memutar.
  if (jenis === "keluar_tab") return true;
  // Catatan lain yang tidak menggugurkan dan tidak memakan anggaran dibiarkan
  // apa adanya, supaya pengawas tetap membaca sebab yang sebenarnya
  // (mis. `tekan_tahan`, `lewat_safari`, `keluar_layar_penuh`).
  return menggugurkan(jenis);
}

/** Label berbahasa Indonesia untuk tabel admin dan laporan Excel. */
export const LABEL_JENIS: Record<string, string> = {
  keluar_tab: "Meninggalkan halaman ujian sebentar, lalu kembali",
  pergi_lama: "Meninggalkan halaman ujian dan tidak kembali tepat waktu",
  pergi_menumpuk: "Bolak-balik meninggalkan halaman ujian — jumlah waktunya melewati batas",
  blur_window: "Pindah jendela atau aplikasi lain",
  keluar_layar_penuh: "Mode layar penuh terlepas (ponsel/tablet)",
  esc_layar_penuh: "Menekan ESC — keluar layar penuh di komputer",
  tangkap_layar: "Menangkap layar soal (PrintScreen / pintasan potret layar)",
  alt_tab: "Menekan ALT+TAB — berpindah jendela",
  denyut_hilang: "Halaman ujian berhenti merespons dan tidak kembali tepat waktu",
  denyut_tersendat: "Sambungan peserta tersendat (halaman tetap terlihat)",
  salin: "Mencoba menyalin soal",
  klik_kanan: "Klik kanan pada halaman soal",
  pintasan: "Menekan jalan pintas terlarang",
  tekan_tahan: "Menekan-tahan soal (menu salin/bagikan iOS)",
  lewat_safari: "Mengerjakan dari Safari, bukan dari ikon Layar Utama",
  pergi_saat_rekaman: "Layar padam / halaman tersembunyi selagi rekaman Listening diputar",
};

export function labelJenis(jenis: string): string {
  return LABEL_JENIS[jenis] ?? jenis;
}

/* ------------------------------------------------------------------ */
/* Kalimat yang dibaca peserta pada layar GAGAL                         */
/* ------------------------------------------------------------------ */

/** Nama ujian sesuai portalnya, untuk disisipkan ke kalimat mana pun. */
export function namaUjian(jalur: string): string {
  if (jalur === "skd") return "SKD Kedinasan";
  // Ruang ujian IELTS memakai penjagaan yang sama sejak 10 September 2026, jadi
  // kalimat layar GAGAL-nya pun lahir dari sini — peserta IELTS tidak boleh
  // membaca bahwa "TryOut Real UTBK-SNBT" miliknya dihentikan.
  if (jalur === "ielts") return "IELTS";
  return "TryOut Real UTBK-SNBT";
}

/**
 * Kalimat lama yang dipakai untuk SEMUA sebab tanpa kecuali.
 *
 * Tidak lagi dipasang pada pengguguran baru sejak 7 September 2026 — pengelola
 * meminta peserta diberi tahu SEBAB yang sebenarnya, bukan satu kalimat seragam
 * yang menyisakan tanda tanya. Tetap diekspor karena ratusan baris
 * `attempts.alasan_gugur` lama sudah menyimpannya, dan layar hasil harus tetap
 * bisa menampilkan apa adanya.
 */
export const PESAN_GUGUR =
  "Mohon Maaf Anda Melakukan Pelanggaran Mencoba untuk Keluar dari Halaman Pengerjaan Soal " +
  "TryOut Real UTBK SMA Islam Plus Adzkia! Kamu dinyatakan GAGAL Ujian TryOut Real UTBK Hari Ini!";

/** Kalimat lama yang sama untuk jalur SKD. */
export const PESAN_GUGUR_SKD =
  "Mohon Maaf Anda Melakukan Pelanggaran Mencoba untuk Keluar dari Halaman Pengerjaan Soal " +
  "SKD Kedinasan SMA Islam Plus Adzkia! Kamu dinyatakan GAGAL Ujian SKD Kedinasan Hari Ini!";

/** Pesan lama sesuai jalur paket. Cadangan untuk baris yang sebabnya tak dikenal. */
export function pesanGugur(jalur: string): string {
  return jalur === "skd" ? PESAN_GUGUR_SKD : PESAN_GUGUR;
}

/**
 * Sebab yang dibaca peserta, satu kalimat per jenis.
 *
 * Ditulis sebagai lanjutan dari "Penyebabnya: …", memakai kata ganti "kamu",
 * dan setiap kalimat menyebut PERBUATAN yang terdeteksi — bukan istilah teknis
 * peramban — supaya peserta bisa mencocokkannya dengan apa yang baru saja ia
 * lakukan, dan pengawas bisa menilai bantahannya.
 */
const SEBAB_GUGUR: Record<string, string> = {
  blur_window:
    "kamu membuka jendela, aplikasi, atau peramban lain di samping halaman ujian, " +
    "dan memakainya lebih dari 3 detik selagi soal masih terbuka di layarmu. " +
    "Itu terbaca sebagai mencari jawaban dari luar.",
  // Kalimat ini MENYEBUT tombolnya, dan itu disengaja. Larangan lama "jangan
  // mengajari cara keluar layar penuh" lahir ketika lepasnya layar penuh masih
  // aman; sejak 8 September 2026 tombol itu justru menggugurkan, jadi
  // menyebutkannya bukan lagi menunjukkan jalan keluar melainkan menjelaskan
  // sebab hukumannya. Peserta yang tidak diberi tahu sebabnya tidak akan pernah
  // bisa membantahnya kepada pengawas.
  esc_layar_penuh:
    "kamu menekan tombol ESC (atau tombol layar penuh) di komputer, sehingga halaman " +
    "ujian berhenti menutupi seluruh layar. Pada peramban komputer mode layar penuh " +
    "tidak pernah lepas dengan sendirinya — hanya tombol yang ditekan seseorang yang " +
    "bisa melepasnya, dan itu terbaca sebagai usaha membuka jendela lain di samping soal.",
  alt_tab:
    "kamu menekan ALT+TAB (atau Command+Tab) untuk berpindah ke jendela atau aplikasi " +
    "lain selagi soal masih terbuka. Perpindahan itu terjadi karena tombolnya kamu " +
    "tekan sendiri, bukan karena gangguan perangkat — dan itu berlaku di perangkat apa " +
    "pun, termasuk HP dan tablet yang kamu pakai bersama papan ketik.",
  // Kedua kalimat berikut menyebut ANGKANYA, dan angka itu diambil dari
  // konstanta yang sama dengan yang dipakai server memutuskan. Menuliskannya
  // sebagai teks mati akan membuat peserta membaca batas yang berbeda dari
  // batas yang sebenarnya menggugurkannya.
  pergi_lama:
    `kamu meninggalkan halaman ujian dan baru kembali sesudah lebih dari ` +
    `${AMBANG_KEMBALI_DETIK} detik dalam satu kali kepergian. Selama halaman ujian ` +
    `tersembunyi tidak ada yang bisa memastikan kamu tidak sedang membuka hal lain.`,
  pergi_menumpuk:
    `kamu berpindah dari halaman ujian ke halaman lain berkali-kali, dan JUMLAH seluruh ` +
    `waktumu di luar halaman ujian sudah melewati ${AMBANG_KEMBALI_DETIK} detik. Setiap ` +
    `kepergian dijumlahkan, bukan dihitung ulang dari nol — pergi sebentar berkali-kali ` +
    `sama saja dengan pergi lama sekali. Sisa anggaranmu ditampilkan setiap kali kamu ` +
    `kembali, jadi hitungannya bisa kamu ikuti sendiri sejak kepergian pertama.`,
  tangkap_layar:
    "kamu menekan tombol untuk menangkap layar (screenshot) halaman ujian. " +
    "Soal tryout adalah naskah tertutup milik sekolah, dan memotretnya — untuk " +
    "disimpan sendiri maupun dibagikan — dilarang selama ujian berlangsung.",
  denyut_hilang:
    `halaman ujianmu berhenti mengabari server lebih dari ${AMBANG_KEMBALI_DETIK} detik, ` +
    `dan selama itu ia tidak berada di depanmu. Itu terjadi bila halaman ujian ` +
    `ditinggalkan, ditutup, atau layarnya dimatikan lebih lama dari batas tersebut. ` +
    `Sambungan internet yang tersendat TIDAK termasuk: selama halaman ujian tetap ` +
    `terbuka di layarmu, gangguan jaringan hanya dicatat.`,
};


/**
 * Kalimat lengkap layar GAGAL, sesuai portal DAN sesuai sebabnya.
 *
 * Sebab yang tidak dikenal jatuh ke kalimat umum, bukan ke kalimat kosong:
 * peserta tetap harus membaca sesuatu yang masuk akal walaupun jenisnya baru
 * dan belum sempat dituliskan di sini.
 */
/**
 * Kalimat penutup layar GAGAL.
 *
 * Isinya sengaja menyebutkan apa yang TIDAK menggugurkan, supaya peserta yang
 * layarnya padam atau yang sempat keluar dari halaman tidak ikut ketakutan
 * membacanya — dan supaya ia tahu persis mana yang perlu ia bantah ke pengawas.
 *
 * Kalimat ini dipakai SELURUH sebab, jadi ia tidak boleh menyebut tombol mana
 * pun: penyebutan tombol hanya boleh muncul pada sebab yang memang tentang
 * tombol itu (lihat SEBAB_GUGUR), bukan pada peserta yang gugur karena membuka
 * jendela lain.
 */
/**
 * Kalimat penutup yang menemani SETIAP sebab gugur.
 *
 * Diperbarui 9 September 2026 bersama rem menumpuk, dan pembaruannya wajib:
 * kalimat lamanya menjanjikan "kembali dalam 20 detik TIDAK menggugurkan", dan
 * sejak kepergian dijumlahkan janji itu tidak lagi benar seluruhnya. Layar
 * GAGAL yang menutup dirinya dengan kalimat yang bertentangan dengan sebab di
 * atasnya adalah layar yang tidak bisa dipertanggungjawabkan di depan peserta
 * maupun orang tuanya.
 */
const PENUTUP_BAKU =
  `Layar yang padam sendiri sebentar dan sambungan yang tersendat TIDAK menggugurkan ujian. ` +
  `Meninggalkan halaman ujian lalu kembali dalam ${AMBANG_KEMBALI_DETIK} detik juga tidak ` +
  `menggugurkan dengan sendirinya — tetapi lamanya DIJUMLAHKAN, dan begitu seluruh kepergianmu ` +
  `mencapai ${BUDGET_PERGI_DETIK} detik, ujian dihentikan.`;

export function pesanGugurJenis(jalur: string, jenis: string): string {
  const sebab =
    SEBAB_GUGUR[jenis] ??
    "terdeteksi ada permukaan lain yang dibuka berdampingan dengan halaman ujian.";
  return `Mohon maaf, Ujian ${namaUjian(jalur)} kamu DIHENTIKAN. Penyebabnya: ${sebab} ${PENUTUP_BAKU}`;
}
