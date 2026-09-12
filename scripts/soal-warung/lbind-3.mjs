/**
 * Warung Soal — LIT. Bahasa Indonesia (LBIND) Paket 3, kategori Easy.
 *
 * 30 butir: 26 pilihan ganda, 3 pilihan ganda kompleks, 1 isian singkat.
 * Model INTENS: bacaan lalu ditanyakan isi, sikap tokoh, analogi situasi,
 * dan pernyataan yang TIDAK sesuai. Jenjang Easy.
 */

const TEKS_1 = `<p><b>Teks 1</b></p><p>(1) Di sebuah kota kecil, warung kopi milik Pak Umar dibuka sejak pukul lima pagi. (2) Yang membuatnya berbeda bukan kopinya, melainkan enam meja panjang di bagian belakang. (3) Meja itu disediakan cuma-cuma bagi siapa pun yang ingin belajar. (4) Aturannya hanya satu: yang duduk lebih dari dua jam diminta memesan satu gelas. (5) Sejak disediakan, meja belajar itu jarang kosong. (6) Beberapa siswa mengaku lebih betah di sana daripada di rumah yang ramai. (7) Namun, pada musim ujian, meja itu sering diperebutkan sejak subuh. (8) Pak Umar lalu menempelkan jadwal pemakaian di dinding. (9) Ia menolak memungut biaya sewa meskipun banyak orang menyarankannya. (10) Menurutnya, begitu meja itu disewakan, yang datang bukan lagi orang yang paling membutuhkannya.</p>`;

const TEKS_2 = `<p><b>Teks 2</b></p><p>(1) Setiap Idulfitri, ibu selalu memasak lebih banyak daripada yang sanggup kami habiskan. (2) Aku pernah menghitungnya: tujuh belas piring untuk sembilan orang. (3) “Nanti ada yang datang,” katanya, meskipun tidak pernah ada tamu yang benar-benar diundang. (4) Sore harinya memang selalu ada yang mampir. (5) Tetangga baru, tukang parkir masjid, atau anak-anak yang kelaparan sesudah bermain. (6) Ibu tidak pernah menghitung siapa saja yang datang. (7) Ia hanya memastikan piring di meja tidak pernah kosong. (8) Kini, di kota, aku memasak untuk satu orang. (9) Dan aku selalu kelebihan satu porsi.</p>`;

const TEKS_3 = `<p><b>Teks 3</b></p><p>(1) Sebuah sekolah mendata cara siswa berangkat ke sekolah selama satu pekan. (2) Hasilnya disajikan pada tabel berikut.</p><table><tr><th>Cara berangkat</th><th>Kelas X</th><th>Kelas XI</th><th>Kelas XII</th></tr><tr><td>Jalan kaki</td><td>40</td><td>32</td><td>25</td></tr><tr><td>Sepeda</td><td>35</td><td>30</td><td>22</td></tr><tr><td>Angkutan umum</td><td>28</td><td>34</td><td>40</td></tr><tr><td>Diantar</td><td>17</td><td>24</td><td>33</td></tr></table><p>(3) Guru menilai kenaikan jumlah siswa yang diantar berkaitan dengan bertambahnya kegiatan sore di kelas atas. (4) Namun, ia mengingatkan bahwa data itu hanya mencatat cara yang paling sering dipakai, bukan cara yang dipakai setiap hari. (5) Karena itu, sekolah berencana mendata ulang secara harian.</p>`;

export const SOAL = [
  /* ---------------- Teks 1 ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Gagasan utama Teks 1 adalah …",
    opsi: [
      "Cara meracik kopi di warung milik Pak Umar",
      "Warung kopi yang menyediakan meja belajar cuma-cuma beserta aturannya",
      "Siswa lebih betah belajar di warung daripada di rumah",
      "Musim ujian membuat meja belajar diperebutkan",
      "Pak Umar menolak saran menaikkan harga kopinya",
    ],
    kunci: "B",
    pembahasan:
      "Kalimat (2) dan (3) memperkenalkan hal yang membedakan warung itu, lalu kalimat berikutnya memaparkan aturan dan pendiriannya. Pilihan lain hanya mengambil satu rincian.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Aturan yang berlaku di meja belajar itu adalah …",
    opsi: [
      "pengunjung wajib memesan sejak pertama datang",
      "meja hanya boleh dipakai oleh pelajar",
      "pemakaian meja dibatasi paling lama dua jam",
      "yang duduk lebih dari dua jam diminta memesan satu gelas",
      "pengunjung membayar sewa meja per jam",
    ],
    kunci: "D",
    pembahasan: "Aturan itu disebut langsung pada kalimat (4), dan hanya ada satu aturan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kalimat (8) pada Teks 1 menunjukkan bahwa Pak Umar …",
    opsi: [
      "mencari jalan keluar atas perebutan meja",
      "melarang siswa datang pada musim ujian",
      "menutup bagian belakang warungnya",
      "menaikkan harga kopi pada musim ujian",
      "menyerahkan pengaturan meja kepada siswa",
    ],
    kunci: "A",
    pembahasan:
      "Kalimat (7) memuat masalahnya, lalu kalimat (8) memuat tindakan Pak Umar menanggapi masalah itu.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Maksud kalimat (10) pada Teks 1 adalah …",
    opsi: [
      "Meja sewaan lebih menguntungkan bagi pemiliknya",
      "Orang yang membutuhkan pasti mampu membayar sewa",
      "Sewa meja akan membuat warung menjadi lebih tertib",
      "Besarnya sewa sebaiknya ditentukan oleh siswa sendiri",
      "Biaya sewa akan menyingkirkan orang yang paling memerlukan meja itu",
    ],
    kunci: "E",
    pembahasan:
      "Bila meja disewakan, yang menempatinya adalah yang mampu membayar — belum tentu yang paling memerlukan. Itulah alasan Pak Umar menolak.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Alasan sebagian siswa lebih betah belajar di warung itu adalah …",
    opsi: [
      "harga kopinya sangat murah",
      "mejanya panjang dan lebar",
      "rumah mereka ramai",
      "warungnya buka sejak subuh",
      "ada jadwal pemakaian yang tertib",
    ],
    kunci: "C",
    pembahasan: "Alasan itu tertulis pada kalimat (6).",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Sikap Pak Umar dalam Teks 1 dapat digambarkan sebagai …",
    opsi: [
      "mencari keuntungan sebesar-besarnya",
      "memegang teguh niat awalnya",
      "mudah terpengaruh saran orang lain",
      "menyerah menghadapi perebutan meja",
      "tidak peduli pada pengunjung warungnya",
    ],
    kunci: "B",
    pembahasan:
      "Kalimat (9) menyebut ia menolak memungut sewa meskipun banyak yang menyarankan, dan kalimat (10) memberi alasannya.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Hubungan antara kalimat (5) dan kalimat (7) pada Teks 1 adalah …",
    opsi: [
      "sebab dan akibat",
      "penambahan contoh",
      "syarat dan hasil",
      "keadaan umum dan keadaan khusus yang berlawanan",
      "perbandingan antara dua tempat",
    ],
    kunci: "D",
    pembahasan:
      "Kalimat (5) memaparkan keadaan sehari-hari, lalu kalimat (7) dibuka <i>namun</i> dan memaparkan keadaan khusus pada musim ujian yang lebih berat.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Pernyataan yang TIDAK sesuai dengan Teks 1 adalah …",
    opsi: [
      "Pak Umar memungut biaya sewa meja pada musim ujian",
      "Warung itu dibuka sejak pukul lima pagi",
      "Terdapat enam meja panjang di bagian belakang warung",
      "Jadwal pemakaian meja ditempelkan di dinding",
      "Meja belajar itu jarang kosong",
    ],
    kunci: "A",
    pembahasan:
      "Kalimat (9) justru menyebut Pak Umar menolak memungut biaya sewa. Empat pilihan lain ada pada kalimat (1), (2), (8), dan (5).",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Sikap Pak Umar terhadap meja belajarnya dapat dianalogikan seperti …",
    opsi: [
      "Pedagang yang menaikkan harga ketika barangnya langka.",
      "Sekolah yang menutup perpustakaannya menjelang ujian.",
      "Warga yang menyewakan halaman rumahnya untuk lahan parkir.",
      "Penjual yang mengurangi takaran agar keuntungannya besar.",
      "Pengelola sumur umum yang menolak menjual airnya meski banyak peminat.",
    ],
    kunci: "E",
    pembahasan:
      "Polanya sama: sesuatu yang dibutuhkan orang banyak sengaja tidak diperjualbelikan supaya tetap terjangkau oleh yang paling memerlukannya.",
  },

  /* ---------------- Teks 2 ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Amanat yang paling tepat dari Teks 2 adalah …",
    opsi: [
      "Memasak dalam jumlah banyak lebih menghemat biaya",
      "Tamu sebaiknya diundang terlebih dahulu",
      "Kesediaan berbagi tumbuh dari kebiasaan menyiapkan tempat bagi orang lain",
      "Hari raya sebaiknya dirayakan besar-besaran",
      "Menghitung jumlah porsi makanan itu penting",
    ],
    kunci: "C",
    pembahasan:
      "Ibu menyiapkan lebih dahulu untuk tamu yang belum tentu datang, dan kebiasaan itu menurun kepada anaknya pada kalimat (9).",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Watak tokoh ibu dalam Teks 2 adalah …",
    opsi: [
      "boros dan gemar pamer",
      "murah hati dan tidak perhitungan",
      "pendiam dan tertutup",
      "cemas secara berlebihan",
      "keras dan sangat disiplin",
    ],
    kunci: "B",
    pembahasan:
      "Kalimat (6) dan (7) menegaskan ibu tidak menghitung siapa yang datang, hanya memastikan makanan selalu tersedia.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Kalimat (9) pada Teks 2 menunjukkan bahwa tokoh <i>aku</i> …",
    opsi: [
      "tidak pandai memperkirakan takaran masakan",
      "sengaja membuang makanan berlebih",
      "sering mengundang tamu ke tempat tinggalnya",
      "tanpa sadar meneruskan kebiasaan ibunya",
      "lupa berapa porsi yang sebenarnya diperlukan",
    ],
    kunci: "D",
    pembahasan:
      "Kelebihan satu porsi itu menggemakan kebiasaan ibu pada kalimat (1) dan (3) — piring untuk tamu yang mungkin datang.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Maksud kalimat (7) pada Teks 2 adalah …",
    opsi: [
      "Ibu selalu menyediakan makanan bagi siapa pun yang datang",
      "Ibu melarang anaknya menghabiskan seluruh makanan",
      "Ibu mencuci piring setiap sore hari",
      "Ibu menghitung jumlah tamu dengan cermat",
      "Ibu menyimpan makanan untuk keesokan harinya",
    ],
    kunci: "A",
    pembahasan:
      "Kalimat (6) menegaskan ibu tidak menghitung tamunya, jadi yang dijaga bukan jumlah orangnya, melainkan tersedianya makanan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Konflik yang menonjol pada Teks 2 tergolong konflik …",
    opsi: [
      "fisik antartokoh",
      "antara tokoh dan alam",
      "antara tokoh dan masyarakat",
      "antara dua kelompok",
      "batin dalam diri tokoh",
    ],
    kunci: "E",
    pembahasan:
      "Tidak ada pertikaian dalam kutipan itu. Yang bergerak adalah kesadaran tokoh <i>aku</i> tentang kebiasaan ibunya yang ternyata menurun kepadanya.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Kalimat (8) dan kalimat (9) disusun dengan cara …",
    opsi: [
      "mengulang kalimat pembuka cerita",
      "memerinci jenis masakan hari raya",
      "mempertentangkan keadaan sekarang dengan masa lalu",
      "menyebutkan urutan waktu memasak",
      "membandingkan dua tokoh yang berbeda",
    ],
    kunci: "C",
    pembahasan:
      "Kata <i>kini</i> pada kalimat (8) memindahkan latar dari masa lalu ke masa sekarang, lalu kalimat (9) menunjukkan kebiasaan lama yang ternyata bertahan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Latar tempat yang tergambar pada kalimat (8) adalah …",
    opsi: [
      "rumah ibu di kampung",
      "kota tempat tokoh <i>aku</i> tinggal sekarang",
      "halaman masjid",
      "rumah tetangga baru",
      "pasar tempat berbelanja",
    ],
    kunci: "B",
    pembahasan: "Kalimat (8) dibuka dengan keterangan <i>Kini, di kota</i>.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Ungkapan <i>piring di meja tidak pernah kosong</i> pada kalimat (7) bermakna …",
    opsi: [
      "piring itu selalu dicuci sampai bersih",
      "makanan selalu habis dimakan keluarga",
      "jumlah piring di rumah itu sangat banyak",
      "selalu tersedia makanan bagi siapa pun yang datang",
      "piring itu tidak boleh dipindahkan dari meja",
    ],
    kunci: "D",
    pembahasan:
      "Ungkapan itu menunjuk kesiapan menerima tamu kapan saja, sejalan dengan kalimat (3) sampai (5).",
  },

  /* ---------------- Teks 3 ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Berdasarkan tabel, cara berangkat yang paling banyak dipilih siswa kelas X adalah …",
    opsi: [
      "jalan kaki",
      "sepeda",
      "angkutan umum",
      "diantar",
      "jalan kaki dan sepeda sama banyak",
    ],
    kunci: "A",
    pembahasan: "Kolom kelas X menunjukkan jalan kaki 40 siswa, tertinggi di antara empat cara.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Selisih banyak siswa yang berjalan kaki antara kelas X dan kelas XII adalah …",
    opsi: ["5 siswa", "8 siswa", "10 siswa", "12 siswa", "15 siswa"],
    kunci: "E",
    pembahasan: "Kelas X 40 siswa dan kelas XII 25 siswa, sehingga selisihnya 15 siswa.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Kecenderungan yang tampak dari tabel tersebut adalah …",
    opsi: [
      "Semua cara berangkat menurun dari kelas X ke kelas XII",
      "Jumlah pengguna sepeda meningkat dari kelas X ke kelas XII",
      "Jalan kaki dan sepeda menurun, sedangkan angkutan umum dan diantar meningkat",
      "Pengguna angkutan umum menurun dari kelas X ke kelas XII",
      "Diantar orang tua paling banyak dipilih di semua tingkat kelas",
    ],
    kunci: "C",
    pembahasan:
      "Jalan kaki turun 40 → 25 dan sepeda 35 → 22, sedangkan angkutan umum naik 28 → 40 dan diantar 17 → 33.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Berdasarkan kalimat (4), keterbatasan data pada tabel tersebut adalah …",
    opsi: [
      "jumlah siswa yang didata terlalu sedikit",
      "data hanya mencatat cara yang paling sering dipakai, bukan cara setiap hari",
      "data hanya diambil dari satu tingkat kelas",
      "data dikumpulkan selama satu bulan penuh",
      "data tidak mencantumkan jarak rumah siswa",
    ],
    kunci: "B",
    pembahasan:
      "Peringatan itu ditegaskan lagi oleh kalimat (5): sekolah berencana mendata ulang secara harian.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan:
      "Jumlah siswa kelas XI yang memakai angkutan umum dan yang diantar adalah …",
    opsi: ["50 siswa", "52 siswa", "55 siswa", "58 siswa", "60 siswa"],
    kunci: "D",
    pembahasan: "Angkutan umum 34 siswa dan diantar 24 siswa, sehingga jumlahnya 58 siswa.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan:
      "Alasan yang dikemukakan guru atas kenaikan jumlah siswa yang diantar adalah …",
    opsi: [
      "jarak rumah siswa yang makin jauh",
      "naiknya tarif angkutan umum",
      "bertambahnya kegiatan sore di kelas atas",
      "banyak sepeda siswa yang rusak",
      "orang tua yang memiliki lebih banyak waktu luang",
    ],
    kunci: "C",
    pembahasan: "Alasan itu tertulis pada kalimat (3).",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Pernyataan yang TIDAK dapat dibuktikan dengan tabel tersebut adalah …",
    opsi: [
      "Kelas XII paling banyak memakai angkutan umum",
      "Jalan kaki paling banyak dipilih siswa kelas X",
      "Pengguna sepeda kelas XI lebih sedikit daripada kelas X",
      "Siswa yang diantar bertambah dari kelas X ke kelas XII",
      "Siswa kelas XII menempuh jarak yang lebih jauh daripada siswa kelas X",
    ],
    kunci: "E",
    pembahasan:
      "Tabel hanya memuat cara berangkat, bukan jarak tempuh. Empat pernyataan lain dapat dibaca langsung dari angkanya.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Kalimat (3) pada Teks 3 termasuk …",
    opsi: [
      "fakta yang terbaca langsung dari tabel",
      "rangkuman seluruh isi tabel",
      "pendapat guru atas data tersebut",
      "usul yang diajukan orang tua siswa",
      "simpulan akhir dari bacaan",
    ],
    kunci: "C",
    pembahasan:
      "Kata <i>menilai</i> menandai penilaian pribadi. Angka pada tabel adalah faktanya, sedangkan kaitannya dengan kegiatan sore adalah tafsiran guru.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Simpulan yang paling tepat berdasarkan Teks 3 adalah …",
    opsi: [
      "Data tersebut baru menunjukkan kecenderungan yang perlu diperiksa lebih lanjut",
      "Siswa kelas XII lebih manja daripada siswa kelas X",
      "Sekolah akan melarang siswa diantar orang tuanya",
      "Berjalan kaki sudah tidak diminati siswa sama sekali",
      "Setiap siswa memakai satu cara berangkat yang tetap setiap hari",
    ],
    kunci: "A",
    pembahasan:
      "Kalimat (4) dan (5) menegaskan data itu belum menggambarkan kebiasaan harian, sehingga simpulan apa pun masih perlu diuji.",
  },

  /* ---------------- Pilihan ganda kompleks ---------------- */
  {
    tipe: "PGK",
    stimulus: TEKS_1,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 1.",
    opsi: [
      "Warung kopi Pak Umar dibuka sejak pukul lima pagi.",
      "Menurut bacaan, Pak Umar memungut biaya sewa atas meja belajarnya.",
      "Jadwal pemakaian meja ditempelkan di dinding warung.",
    ],
    kunci: ["B", "S", "B"],
    pembahasan:
      "Kalimat (9) menyebut Pak Umar menolak memungut sewa. Dua pernyataan lain sesuai kalimat (1) dan (8).",
  },
  {
    tipe: "PGK",
    stimulus: TEKS_2,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 2.",
    opsi: [
      "Ibu memasak tujuh belas piring untuk sembilan orang.",
      "Tamu yang datang sore hari selalu diundang lebih dahulu.",
      "Tokoh <i>aku</i> kini tinggal di kota.",
    ],
    kunci: ["B", "S", "B"],
    pembahasan:
      "Kalimat (3) justru menyebut tidak pernah ada tamu yang benar-benar diundang. Dua pernyataan lain sesuai kalimat (2) dan (8).",
  },
  {
    tipe: "PGK",
    stimulus: TEKS_3,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan tabel Teks 3.",
    opsi: [
      "Siswa kelas X yang berjalan kaki lebih banyak daripada siswa kelas XI.",
      "Tabel tersebut memuat cara berangkat siswa pada setiap harinya.",
      "Jumlah pengguna angkutan umum bertambah dari kelas X ke kelas XII.",
      "Siswa yang diantar paling sedikit terdapat pada kelas X.",
    ],
    kunci: ["B", "S", "B", "B"],
    pembahasan:
      "Jalan kaki 40 berbanding 32, angkutan umum 28 → 34 → 40, dan yang diantar terkecil 17 pada kelas X. Tabel tidak memuat kebiasaan harian, sesuai kalimat (4).",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    stimulus: TEKS_2,
    pertanyaan:
      "Pada kalimat (7) Teks 2, ibu memastikan yang tidak pernah kosong adalah … (tulis satu kata)",
    kunci: "piring",
    pembahasan:
      "Kalimat (7) berbunyi “Ia hanya memastikan piring di meja tidak pernah kosong”, jadi jawabannya <i>piring</i>.",
  },
];
