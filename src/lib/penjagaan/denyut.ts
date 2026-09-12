/**
 * Ambang denyut nadi ruang ujian — dipakai bersama oleh peramban dan server,
 * jadi berkas ini sengaja bebas dari `server-only` maupun impor basis data.
 *
 * Latar belakangnya iPhone. Di sana tidak ada Fullscreen API, `window.blur`
 * tidak terpancar saat peserta pindah aplikasi, dan `document.hasFocus()` tetap
 * `true` selama tab itu tab aktif — seluruh lapisan penjagaan kedua yang jalan
 * di laptop dan Android menjadi mati. Yang lebih genting: WebKit membekukan
 * JavaScript beberapa milidetik sesudah halaman disembunyikan, sehingga laporan
 * pelanggaran yang dikirim tepat pada saat itu bisa tidak pernah sampai.
 *
 * Denyut nadi membalik logikanya: bukan kepergian yang harus dilaporkan, tapi
 * KEHADIRAN yang harus dibuktikan berulang-ulang. Laporan bisa hilang; diamnya
 * halaman tidak bisa disembunyikan.
 */

/** Jarak antar-denyut yang dikirim ruang ujian selama penjagaan menyala. */
export const JEDA_DENYUT = 5000; // ms

/**
 * Jeda terlama yang masih dimaafkan di antara dua denyut bersenjata.
 *
 * Ditetapkan pengguna pada 1 September 2026: 20 detik. Nilainya adalah
 * kompromi yang disadari — cukup longgar untuk jaringan sekolah yang tersendat
 * sesaat (empat denyut boleh hilang berturut-turut), cukup ketat untuk
 * menangkap peserta yang berpindah ke aplikasi lain. Menurunkannya ke 10 detik
 * membuat notifikasi yang tidak sengaja tertekan ikut menggugurkan; menaikkan
 * ke 45 detik memberi jendela yang cukup untuk membaca satu jawaban.
 */
export const AMBANG_DENYUT_DETIK = 20;

/**
 * Batas waktu satu permintaan denyut sebelum dibatalkan dan diulang.
 *
 * DULU tidak ada batasnya, dan justru di situlah peserta paling banyak gugur
 * tanpa berbuat salah. Denyut berikutnya baru dijadwalkan SESUDAH permintaan
 * sebelumnya selesai, jadi satu permintaan yang menggantung — hal biasa di
 * jaringan seluler — menghentikan SELURUH denyut selama peramban masih menunggu
 * jawaban. Peramban sendiri baru menyerah setelah puluhan detik, jauh melewati
 * {@link AMBANG_DENYUT_DETIK}, sehingga server melihat halaman yang diam dan
 * menggugurkan peserta yang sebenarnya duduk menatap soal.
 *
 * Bukti dari basis data produksi 4-6 September 2026: 50 peserta digugurkan
 * dengan jeda 21-30 detik dan 37 lagi dengan jeda 31-60 detik — persis bentuk
 * SATU permintaan yang menggantung, bukan bentuk orang yang pindah aplikasi.
 *
 * Delapan detik memberi ruang dua kali percobaan penuh sebelum ambang tercapai.
 */
export const BATAS_DENYUT_MS = 8000;

/** Jarak percobaan ulang sesudah satu denyut gagal atau kehabisan waktu. */
export const JEDA_COBA_DENYUT = 1500; // ms

/**
 * Ambang terpisah untuk jeda yang HALAMANNYA BISA MEMBUKTIKAN bukan kepergian.
 *
 * Denyut membawa dua keterangan yang hanya bisa diisi oleh halaman yang benar
 * benar hidup di depan peserta: `terlihat` (sejak denyut terakhir yang berhasil,
 * `visibilityState` tidak pernah menjadi `hidden`) dan `percobaan` (berapa kali
 * halaman mencoba berdenyut selama jeda itu). Keduanya tidak bisa dikarang oleh
 * halaman yang sedang disembunyikan: di iPhone JavaScript-nya beku sehingga
 * tidak ada yang terkirim sama sekali, dan di Android `visibilityState` berubah
 * menjadi `hidden` sebelum pembatasan timer bekerja.
 *
 * Jadi jeda yang disertai bukti "saya terlihat sepanjang waktu dan saya
 * berkali-kali mencoba menghubungimu" hanya punya satu penjelasan: jaringannya
 * yang putus, bukan pesertanya yang pergi. Jeda semacam itu dicatat untuk
 * pengawas tetapi tidak menggugurkan, selama masih di bawah ambang ini.
 *
 * Di atas 90 detik buktinya tidak lagi menolong: sambungan seburuk itu tidak
 * bisa dibedakan dari perangkat yang memang ditinggalkan, dan ujiannya tetap
 * digugurkan seperti sebelumnya.
 */
export const AMBANG_DENYUT_TERLIHAT_DETIK = 90;

/**
 * Lama kehilangan fokus harus BERTAHAN sebelum dianggap peserta meninggalkan
 * halaman.
 *
 * Kehilangan fokus sekejap bukan kepergian. Notifikasi sistem, papan ketik yang
 * muncul untuk isian singkat, menu bawaan peramban, chip izin, dan animasi bilah
 * alamat Safari semuanya mencuri fokus sepersekian detik lalu mengembalikannya.
 * Dulu satu kedipan seperti itu langsung mengakhiri ujian 195 menit.
 *
 * Bukti dari basis data produksi 4-6 September 2026: 58 peserta digugurkan
 * KURANG DARI SATU MENIT sesudah memulai — yang tercepat 4 detik — dan pengguna
 * Safari tiga kali lebih sering tertangkap daripada pengguna Chrome di Windows
 * pada waktu ujian yang sama panjangnya. Itu sidik jari kutu peramban, bukan
 * sidik jari kecurangan.
 *
 * Tiga detik cukup lama untuk melewati seluruh kedipan itu, dan masih jauh lebih
 * pendek daripada waktu terpendek yang dibutuhkan seseorang untuk benar-benar
 * membaca sesuatu di jendela lain.
 */
export const MASA_PASTIKAN_FOKUS = 3000; // ms

/**
 * Berapa lama peserta boleh MENINGGALKAN halaman ujian sebelum kepergiannya
 * dianggap "membuka sesuatu yang lain" dan menggugurkan ujiannya.
 *
 * DIHIDUPKAN KEMBALI 8 September 2026 atas permintaan pengelola, sesudah
 * sempat dihapus 7 September. Riwayat itu penting supaya tidak diputar lagi
 * tanpa sadar, dan permintaannya kali ini spesifik tentang HP:
 *
 *   "Tombol navigasi '<' dan '=' kan ada di Android. Ketika klik itu, keluar
 *    dari layar penuh, kemudian dia belum mengklik/mengembalikan halaman ujian
 *    — itu jangan digagalkan, tapi dicatat saja. Dan ketika dia klik halaman
 *    lain selain dari halaman ujian, maka gagalkan saja."
 *
 * KENAPA JADI SEBUAH TENGGANG WAKTU, bukan pengenalan "halaman lain". Begitu
 * halaman ujian disembunyikan, peramban membekukannya dan tidak melihat apa pun
 * lagi. Menekan '=' lalu diam, menekan '=' lalu membuka WhatsApp, layar yang
 * padam sendiri, dan telepon masuk memancarkan sinyal yang IDENTIK — tidak ada
 * satu pun API yang memisahkannya. Yang masih bisa diukur hanya satu: berapa
 * lama ia tidak kembali. Peserta yang menekan '=' lalu langsung kembali pulang
 * dalam hitungan detik; peserta yang benar-benar membuka sesuatu tidak.
 *
 * KENAPA 20 DETIK, bukan 15. Pengelola meminta "15-20 detik", dan 20 dipilih
 * karena ia SAMA PERSIS dengan {@link AMBANG_DENYUT_DETIK}. Kepergian dinilai
 * lewat dua jalur yang berbeda — peserta yang kembali menutup catatannya
 * sendiri, sedangkan peserta yang tidak pernah kembali ketahuan dari denyut
 * yang hilang — dan dua ambang yang berbeda akan membuat kedua jalur itu
 * berbeda putusan untuk kepergian yang sama panjang. Satu angka, satu putusan.
 *
 * HARGA YANG HARUS DISADARI, dan ini kebalikan dari harga aturan 7 September:
 * layar HP yang padam sendiri lebih dari 20 detik kini menggugurkan. Yang
 * menahannya adalah Screen Wake Lock di ruang ujian (layar tidak dibiarkan
 * meredup selama halaman terbuka) dan tata tertib yang menyuruh peserta
 * mematikan Kunci Otomatis sebelum mulai. Pada peramban yang menolak Wake Lock
 * — iOS di bawah 16.4, atau mode hemat baterai — pencegahan itu tidak ada, dan
 * peserta semacam itu bergantung pada pengawas yang membuka blokirnya.
 */
export const AMBANG_KEMBALI_DETIK = 20;

/**
 * ANGGARAN SELURUH KEPERGIAN dalam satu ronde ujian, dalam detik.
 *
 * Diminta pengelola 9 September 2026 sesudah ia menemukan lubangnya sendiri di
 * iPad, dan kalimatnya menjelaskan bentuk aturannya lebih baik daripada
 * ringkasan apa pun:
 *
 *   "Ketika siswa bolak-balik pada halaman Safari, ke halaman ujian kemudian ke
 *    halaman mencari kunci jawabannya... dia menghabiskan waktu 5 detik,
 *    kemudian kembali ke halaman ujian, terus kembali lagi ke halaman mencari
 *    jawaban yang tadi. Seharusnya jangan dihitung lagi detiknya dari awal.
 *    Lanjutannya saja dihitung."
 *
 * SEBABNYA MUNCUL SEKARANG, dan ini penting supaya aturannya tidak dianggap
 * berlebihan: sejak WebKit berhenti memakai layar penuh sungguhan (lihat
 * `pakaiLayarPenuhAsli` di ruang ujian), bilah Safari di iPad tetap terlihat
 * dan tab kedua hanya sejauh satu ketukan. Rem lama menilai TIAP kepergian
 * sendiri-sendiri, jadi peserta yang bolak-balik sepuluh kali masing-masing
 * lima detik tidak pernah menyentuh ambang mana pun — padahal ia sudah
 * menghabiskan lima puluh detik di halaman jawaban.
 *
 * Angkanya SAMA dengan {@link AMBANG_KEMBALI_DETIK} supaya peserta hanya perlu
 * mengingat satu angka: dua puluh detik di luar halaman ujian, mau sekali jalan
 * atau dicicil, berakibat sama.
 *
 * HARGA YANG HARUS DISADARI SEBELUM ANGKA INI DIUBAH: anggaran ini membentang
 * sepanjang ronde — 195 menit untuk UTBK. Notifikasi sistem yang menutupi
 * halaman beberapa detik, telepon masuk, dan layar yang meredup semuanya ikut
 * memakan anggaran yang sama. Karena itu peserta DIBERI TAHU sisa anggarannya
 * setiap kali ia kembali (bilah pemberitahuan di ruang ujian), supaya tidak ada
 * yang gugur tanpa pernah melihat angkanya bergerak.
 */
export const BUDGET_PERGI_DETIK = AMBANG_KEMBALI_DETIK;

/*
 * MASIH DIHAPUS sejak 7 September 2026 malam: BATAS_PERGI (3 kali).
 *
 * Itu rem yang dulu menggugurkan peserta karena kepergiannya terlalu SERING.
 * Yang dihidupkan kembali 8 September hanyalah rem LAMA-PERGI di atas; jumlah
 * kepergian tetap hanya dicatat untuk laporan pengawas. Jangan menghidupkan
 * yang ini tanpa permintaan pengelola.
 */

/**
 * Masa tenang sesudah mode layar penuh MENYALA, selama itu lepasnya layar penuh
 * dianggap ulah perangkat, bukan ulah peserta.
 *
 * Sebagian ponsel menolak menahan layar penuh pada detik-detik pertama: mode itu
 * lepas sendiri karena notifikasi, putaran layar, atau isyarat navigasi, dan
 * peserta yang menekan tombol "layar penuh" lagi langsung kena lepasan kedua —
 * yang menurut aturan server sudah menggugurkan.
 *
 * Bukti dari basis data produksi: 105 dari 159 lepasan layar penuh terjadi di PU,
 * subtes PERTAMA, dan ada peserta yang mengalami dua lepasan hanya berjarak
 * empat detik lalu gugur delapan detik sesudah memulai.
 */
export const MASA_SETELAH_LAYAR_PENUH = 5000; // ms

/**
 * Sejauh mana sesudah tombol ALT (atau Command) ditekan, hilangnya fokus masih
 * boleh disimpulkan sebagai ALT+TAB.
 *
 * Sistem operasi MENELAN kombinasi ALT+TAB sebelum peramban melihatnya:
 * Windows dan macOS menangkapnya sendiri untuk menukar jendela, sehingga
 * halaman hanya menerima `keydown` untuk ALT — TAB-nya tidak pernah sampai,
 * dan `keyup` ALT-nya pun tidak, karena jendelanya sudah telanjur berpindah.
 * Jadi yang bisa dilihat halaman hanya jejaknya: ALT ditekan, lalu sepersekian
 * detik kemudian jendela kehilangan fokus tanpa ALT pernah dilepas.
 *
 * Dua detik cukup longgar untuk mesin yang lambat menukar jendela, dan cukup
 * ketat untuk tidak menyeret peserta yang kebetulan menekan ALT (membuka menu
 * peramban) lalu setengah menit kemudian benar-benar pindah jendela — yang itu
 * pun tetap tertangkap `blur_window`, hanya dengan nama lain.
 */
export const MASA_ALT_TAB = 2000; // ms
