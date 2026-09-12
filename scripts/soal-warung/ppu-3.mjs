/**
 * Warung Soal — PPU (Pengetahuan dan Pemahaman Umum) Paket 3, kategori Easy.
 *
 * 20 butir: 16 pilihan ganda, 3 pilihan ganda kompleks, 1 isian singkat.
 * Model INTENS: seluruh butir kebahasaan berbasis bacaan bernomor kalimat.
 */

const TEKS_1 = `<p><b>Teks 1</b></p><p><sup>1</sup>Tenun ikat Sumba dikerjakan seluruhnya dengan tangan, dari memintal benang sampai mencelup warna. <sup>2</sup>Pewarnanya diambil dari akar mengkudu untuk warna merah dan daun nila untuk warna biru. <sup>3</sup>Sehelai kain berukuran sedang dapat memakan waktu enam bulan. <sup>4</sup>Lamanya pengerjaan itulah yang membuat harganya tinggi. <sup>5</sup>Karena dikerjakan berbulan-bulan, kain tenun menjadi lebih murah daripada kain pabrik. <sup>6</sup>Sejak lima tahun terakhir, penenun muda di beberapa desa mulai berkurang. <sup>7</sup>Sebagian memilih bekerja di kota karena penghasilannya lebih pasti. <sup>8</sup>Pemerintah daerah lalu memberi bantuan alat pintal dan membuka kelas menenun di balai desa. <sup>9</sup>Bantuan itu belum menjawab persoalan utamanya, yaitu pemasaran. <sup>10</sup>Kain yang sudah jadi sering menumpuk berbulan-bulan sebelum menemukan pembeli.</p>`;

const TEKS_2 = `<p><b>Teks 2</b></p><p><sup>1</sup>Kelompok pencinta burung di kota kami mendata jenis burung liar setiap Minggu pagi. <sup>2</sup>Anggotanya pelajar, pensiunan, dan ada juga yang bekerja sebagai fotografer. <sup>3</sup>Kegiatannya meliputi pengamatan lapangan, pencatatan jumlah, hingga membagikan hasilnya kepada dinas lingkungan. <sup>4</sup>Alatnya sederhana: satu teropong dan sebuah buku catatan. <sup>5</sup>Dalam tiga tahun mereka mencatat 84 jenis burung, dua di antaranya belum pernah tercatat di kota itu. <sup>6</sup>Data mereka kini dipakai dinas untuk menentukan lokasi penanaman pohon. <sup>7</sup>Meskipun demikian, jumlah pengamat belum sebanding dengan luas wilayah yang ingin dipantau. <sup>8</sup>Beberapa taman kota belum pernah didatangi sama sekali. <sup>9</sup>Kelompok ini memang bukan lembaga penelitian. <sup>10</sup>Ia hanya mata tambahan bagi kota yang jarang menengok burungnya sendiri.</p>`;

export const SOAL = [
  /* ---------------- Teks 1 ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kalimat yang tidak logis dalam Teks 1 adalah …",
    opsi: ["Kalimat (3)", "Kalimat (5)", "Kalimat (7)", "Kalimat (8)", "Kalimat (10)"],
    kunci: "B",
    pembahasan:
      "Kalimat (4) menyatakan lamanya pengerjaan membuat harga kain tinggi. Karena itu kalimat (5) yang menyimpulkan kain tenun <i>lebih murah</i> justru bertentangan dengan kalimat sebelumnya.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kata <i>memakan</i> pada kalimat (3) digunakan dalam makna …",
    opsi: ["sebenarnya", "menyempit", "meluas", "kiasan", "menyeluruh"],
    kunci: "D",
    pembahasan:
      "Kain tentu tidak benar-benar memakan sesuatu. Kata itu dipakai secara kias untuk menyatakan “menghabiskan waktu”.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kata <i>pasti</i> pada kalimat (7) berlawanan makna dengan …",
    opsi: ["tidak menentu", "tetap", "jelas", "tentu", "terjamin"],
    kunci: "A",
    pembahasan:
      "Penghasilan yang <i>pasti</i> berarti dapat diandalkan jumlahnya, sehingga lawannya <i>tidak menentu</i>. Empat pilihan lain justru sejalan maknanya.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Sikap pemerintah daerah dalam Teks 1 dapat digambarkan sebagai …",
    opsi: [
      "menyerah menghadapi berkurangnya penenun muda",
      "menyalahkan penenun muda yang pindah ke kota",
      "menunggu bantuan dari pemerintah pusat",
      "menolak membuka kelas menenun di desa",
      "sudah bertindak, tetapi belum menyentuh persoalan utamanya",
    ],
    kunci: "E",
    pembahasan:
      "Kalimat (8) menunjukkan tindakan nyata, tetapi kalimat (9) menegaskan persoalan pemasaran belum tersentuh. Simpulan yang utuh memuat keduanya.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan:
      "Kelompok kata <i>alat pintal</i> pada kalimat (8) memiliki pola makna yang sama dengan …",
    opsi: [
      "lebih pasti (kalimat 7)",
      "mulai berkurang (kalimat 6)",
      "balai desa (kalimat 8)",
      "sudah jadi (kalimat 10)",
      "berbulan-bulan (kalimat 10)",
    ],
    kunci: "C",
    pembahasan:
      "<i>Alat pintal</i> adalah frasa benda berpola diterangkan-menerangkan, sama seperti <i>balai desa</i>. Pilihan lain berupa frasa sifat atau frasa kerja.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Gagasan pada kalimat (9) dapat diungkapkan kembali menjadi …",
    opsi: [
      "Bantuan alat pintal sebaiknya segera dihentikan.",
      "Persoalan pemasaran belum tersentuh oleh bantuan yang diberikan.",
      "Pemasaran kain tenun selama ini sudah berjalan dengan baik.",
      "Kelas menenun ternyata tidak diminati warga desa.",
      "Pemerintah daerah belum memberikan bantuan apa pun.",
    ],
    kunci: "B",
    pembahasan:
      "Kalimat (9) menyebut bantuan itu <i>belum menjawab</i> persoalan utama, dan kalimat (10) memberi buktinya berupa kain yang menumpuk.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Hubungan antara kalimat (6) dan kalimat (7) pada Teks 1 adalah …",
    opsi: [
      "pertentangan",
      "perbandingan",
      "syarat dan hasil",
      "pernyataan dan alasannya",
      "penambahan contoh",
    ],
    kunci: "D",
    pembahasan:
      "Kalimat (6) menyatakan penenun muda berkurang, lalu kalimat (7) menjelaskan sebabnya lewat kata <i>karena</i>.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan:
      "Apabila Teks 1 dipisahkan menjadi dua paragraf yang padu dan utuh, pengelompokan kalimatnya adalah …",
    opsi: [
      "(1-2-3-4-5) dan (6-7-8-9-10)",
      "(1-2) dan (3-4-5-6-7-8-9-10)",
      "(1-2-3) dan (4-5-6-7-8-9-10)",
      "(1-2-3-4) dan (5-6-7-8-9-10)",
      "(1-2-3-4-5-6) dan (7-8-9-10)",
    ],
    kunci: "A",
    pembahasan:
      "Kalimat (1) sampai (5) membahas cara pembuatan dan harganya. Kalimat (6) membuka pokok baru, yaitu berkurangnya penenun dan upaya mengatasinya.",
  },

  /* ---------------- Teks 2 ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Perincian pada kalimat (2) belum sejajar bentuknya. Perbaikan yang tepat adalah …",
    opsi: [
      "Anggotanya pelajar, pensiunan, dan bekerja sebagai fotografer.",
      "Anggotanya para pelajar, pensiunan, dan fotografer-fotografer.",
      "Anggotanya belajar, pensiun, dan memotret.",
      "Anggotanya pelajar, pensiunan, dan ada juga fotografer.",
      "Anggotanya pelajar, pensiunan, dan fotografer.",
    ],
    kunci: "E",
    pembahasan:
      "Dua unsur pertama berupa kata benda pelaku, sedangkan unsur ketiga berupa keterangan pekerjaan yang panjang. Agar sejajar, cukup ditulis <i>fotografer</i>.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan:
      "Frasa <i>pengamatan lapangan, pencatatan jumlah, hingga membagikan hasilnya</i> pada kalimat (3) dapat diperbaiki menjadi …",
    opsi: [
      "mengamati lapangan, pencatatan jumlah, hingga membagikan hasilnya",
      "pengamatan lapangan, mencatat jumlah, hingga pembagian hasilnya",
      "pengamatan lapangan, pencatatan jumlah, hingga pembagian hasilnya",
      "mengamati lapangan, mencatat jumlah, hingga hasilnya dibagikan",
      "pengamatan lapangan, pencatatan jumlah, hingga hasil dibagikan",
    ],
    kunci: "C",
    pembahasan:
      "Kata <i>meliputi</i> menuntut perincian berupa kata benda. Dua unsur pertama sudah benda, jadi unsur ketiga diseragamkan menjadi <i>pembagian hasilnya</i>.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Kata yang cakupan maknanya lebih luas daripada kata <i>teropong</i> adalah …",
    opsi: ["lensa", "peralatan", "kaca", "buku", "gagang"],
    kunci: "B",
    pembahasan:
      "<i>Peralatan</i> mencakup teropong, kamera, dan alat lain. <i>Lensa</i>, <i>kaca</i>, dan <i>gagang</i> justru bagian dari teropong.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Kalimat (9) dan kalimat (10) dijalin menjadi padu dengan cara …",
    opsi: [
      "mengulang kata yang sama persis",
      "memakai konjungsi antarkalimat",
      "menyebutkan angka yang sama",
      "memakai tanda baca titik dua",
      "memakai kata ganti <i>ia</i>",
    ],
    kunci: "E",
    pembahasan:
      "Kata <i>Ia</i> pada awal kalimat (10) menggantikan <i>kelompok ini</i> pada kalimat (9), sehingga keduanya terikat tanpa pengulangan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Informasi yang TIDAK sesuai dengan Teks 2 adalah …",
    opsi: [
      "Kelompok itu memiliki pengamat yang cukup untuk seluruh wilayah",
      "Pendataan burung dilakukan setiap Minggu pagi",
      "Dalam tiga tahun tercatat 84 jenis burung",
      "Data kelompok itu dipakai dinas lingkungan",
      "Alat yang dipakai hanya teropong dan buku catatan",
    ],
    kunci: "A",
    pembahasan:
      "Kalimat (7) justru menyebut jumlah pengamat belum sebanding dengan luas wilayah, dan kalimat (8) menguatkannya.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Makna kata <i>sederhana</i> pada kalimat (4) adalah …",
    opsi: [
      "mudah dipahami siapa saja",
      "murah sekali harganya",
      "tidak banyak dan tidak rumit",
      "baru saja dibeli",
      "dipinjam dari kantor dinas",
    ],
    kunci: "C",
    pembahasan:
      "Titik dua sesudahnya memerinci alat yang dimaksud: hanya satu teropong dan sebuah buku catatan. Jadi <i>sederhana</i> di sini berarti sedikit dan tidak rumit.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Kalimat (8) pada Teks 2 menunjukkan bahwa …",
    opsi: [
      "taman kota itu tidak dihuni burung sama sekali",
      "anggota kelompok enggan mendatangi taman kota",
      "dinas melarang pengamatan di taman kota",
      "jangkauan pemantauan kelompok itu masih terbatas",
      "seluruh taman kota sudah selesai dipantau",
    ],
    kunci: "D",
    pembahasan:
      "Kalimat (8) memberi bukti bagi pernyataan kalimat (7) tentang pengamat yang belum sebanding dengan luas wilayah.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Simpulan yang paling tepat untuk Teks 2 adalah …",
    opsi: [
      "Kelompok itu sebaiknya dibubarkan karena kekurangan anggota",
      "Pendataan burung sebaiknya diserahkan sepenuhnya kepada dinas",
      "Teropong kelompok itu perlu segera diganti yang lebih canggih",
      "Kelompok itu sudah setara dengan lembaga penelitian",
      "Kelompok itu melengkapi pemantauan kota meskipun jangkauannya terbatas",
    ],
    kunci: "E",
    pembahasan:
      "Kalimat (6) menunjukkan manfaatnya, sedangkan kalimat (7) sampai (10) menunjukkan batasnya. Simpulan yang utuh memuat keduanya.",
  },

  /* ---------------- Pilihan ganda kompleks ---------------- */
  {
    tipe: "PGK",
    stimulus: TEKS_1,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 1.",
    opsi: [
      "Pewarna kain tenun diambil dari akar mengkudu dan daun nila.",
      "Menurut bacaan, bantuan alat pintal sudah menyelesaikan persoalan pemasaran.",
      "Sehelai kain berukuran sedang dapat memakan waktu enam bulan.",
    ],
    kunci: ["B", "S", "B"],
    pembahasan:
      "Kalimat (9) justru menyatakan bantuan itu belum menjawab persoalan pemasaran. Dua pernyataan lain sesuai kalimat (2) dan (3).",
  },
  {
    tipe: "PGK",
    stimulus: TEKS_2,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 2.",
    opsi: [
      "Pendataan burung dilakukan setiap Minggu pagi.",
      "Kalimat (2) memuat perincian yang bentuknya belum sejajar.",
      "Bacaan menyatakan seluruh taman kota sudah pernah didatangi.",
      "Kalimat (7) menyatakan hubungan pertentangan dengan kalimat sebelumnya.",
    ],
    kunci: ["B", "B", "S", "B"],
    pembahasan:
      "Kalimat (8) menyebut beberapa taman kota belum pernah didatangi. Ungkapan <i>meskipun demikian</i> pada kalimat (7) memang penanda pertentangan.",
  },
  {
    tipe: "PGK",
    stimulus:
      "Perhatikan kalimat berikut.<br><i>“Buku ini menjelaskan tentang cara merawat tanaman hias.”</i>",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Kata <i>tentang</i> pada kalimat tersebut berlebihan.",
      "Perbaikannya adalah “Buku ini menjelaskan cara merawat tanaman hias.”",
      "Kata <i>menjelaskan</i> menuntut objek langsung tanpa kata depan.",
      "Kalimat tersebut sudah efektif karena maknanya sudah jelas.",
    ],
    kunci: ["B", "B", "B", "S"],
    pembahasan:
      "Kata kerja transitif seperti <i>menjelaskan</i> langsung diikuti objek. Menyisipkan kata depan <i>tentang</i> membuat objeknya berubah menjadi keterangan.",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    pertanyaan: "Tuliskan bentuk baku dari kata <b>analisa</b>. (tulis satu kata)",
    kunci: "analisis",
    pembahasan:
      "Bentuk bakunya <i>analisis</i>, sejalan dengan <i>menganalisis</i> dan <i>penganalisis</i>. Ejaan <i>analisa</i> tidak baku.",
  },
];
