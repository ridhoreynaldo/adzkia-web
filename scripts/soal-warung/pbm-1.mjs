/**
 * Warung Soal — PBM (Kemampuan Memahami Bacaan dan Menulis) Paket 1, kategori Easy.
 *
 * 20 butir: 16 pilihan ganda, 3 pilihan ganda kompleks, 1 isian singkat.
 *
 * Modelnya mengikuti naskah Tryout Prosus Inten: bacaan bernomor kalimat yang
 * SENGAJA memuat kesalahan, lalu ditanyakan penempatan kalimat sisipan, tanda
 * baca, kata yang harus dihilangkan, kalimat efektif, huruf kapital, urutan
 * kalimat, dan informasi utama. Karena jenjang Easy, kesalahannya dibuat
 * kentara dan hanya satu jenis per kalimat.
 */

const TEKS_1 = `<p><b>Teks 1</b></p><p><sup>1</sup>Gerakan menanam pohon di sekolah kembali digalakkan pada awal tahun ajaran ini. <sup>2</sup>Setiap kelas menerima lima bibit pohon buah untuk ditanam di halaman belakang. <sup>3</sup>Bibit itu berasal dari dinas pertanian kabupaten. <sup>4</sup>Kegiatan ini bertujuan menambah kerindangan halaman sekolah. <sup>5</sup>Selain itu untuk mengajarkan siswa merawat makhluk hidup. <sup>6</sup>Namun pelaksanaannya di beberapa kelas, kurang berjalan mulus. <sup>7</sup>Bibit yang ditanam terlalu rapat menyebabkan akarnya saling berebut ruang antara satu dengan yang lain. <sup>8</sup>Beberapa bibit akhirnya layu sebelum berumur satu bulan. <sup>9</sup>Wali kelas kemudian meminta bantuan penyuluh dari dinas pertanian Kabupaten. <sup>10</sup>Penyuluh itu mengajari siswa mengatur jarak tanam yang tepat.</p>`;

const TEKS_2 = `<p><b>Teks 2</b></p><p><sup>1</sup>Kelas kami mulai memulai kebiasaan membaca selama lima belas menit lamanya sebelum pelajaran pertama dimulai. <sup>2</sup>Buku yang dibaca bebas, asalkan bukan buku pelajaran. <sup>3</sup>Pada pekan pertama, banyak siswa masih membolak-balik halaman tanpa benar-benar membaca. <sup>4</sup>Pada pekan ketiga, suasana kelas berubah menjadi hening. <sup>5</sup>Wali kelas tidak pernah memaksa siapa pun bercerita tentang bacaannya. <sup>6</sup>Ia hanya menaruh buku baru di rak setiap Senin pagi. <sup>7</sup>Aktifitas itu tumbuh pelan-pelan, tanpa perintah siapa pun. <sup>8</sup>Yang tertanam bukan jumlah halaman, melainkan keinginan membuka buku.</p>`;

export const SOAL = [
  /* ---------------- Teks 1 ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan:
      "Kalimat berikut perlu dimasukkan ke dalam bacaan tersebut.<br><i>Pohon buah dipilih karena hasilnya kelak dapat dinikmati siswa sendiri.</i><br>Kalimat itu paling tepat ditempatkan setelah kalimat nomor …",
    opsi: ["(1)", "(3)", "(2)", "(7)", "(9)"],
    kunci: "C",
    pembahasan:
      "Jenis bibit baru disebut pada kalimat (2). Alasan pemilihan jenis itu paling tepat diletakkan tepat sesudah jenisnya diperkenalkan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Penggunaan tanda baca koma yang salah terdapat pada kalimat nomor …",
    opsi: ["(6)", "(2)", "(4)", "(8)", "(10)"],
    kunci: "A",
    pembahasan:
      "Pada kalimat (6), koma memisahkan subjek <i>pelaksanaannya di beberapa kelas</i> dari predikatnya. Koma yang benar justru diletakkan sesudah <i>Namun</i>.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Penulisan huruf kapital yang salah terdapat pada kalimat nomor …",
    opsi: ["(1)", "(2)", "(3)", "(4)", "(9)"],
    kunci: "E",
    pembahasan:
      "Kalimat (9) menulis <i>Kabupaten</i> dengan huruf kapital padahal tidak diikuti nama daerah. Bandingkan dengan kalimat (3) yang menulisnya dengan huruf kecil.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kalimat (5) perlu disempurnakan dengan cara …",
    opsi: [
      "menghilangkan kelompok kata <i>selain itu</i>",
      "menambahkan kelompok kata <i>kegiatan ini juga bertujuan</i> sesudah <i>selain itu</i>",
      "mengganti kata <i>mengajarkan</i> dengan <i>diajarkan</i>",
      "menghilangkan kata <i>untuk</i>",
      "menambahkan tanda koma sesudah kata <i>itu</i>",
    ],
    kunci: "B",
    pembahasan:
      "Kalimat (5) belum memiliki subjek dan predikat sehingga masih berupa penggalan yang menempel pada kalimat (4).",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kelompok kata yang harus dihilangkan pada kalimat (7) adalah …",
    opsi: [
      "yang ditanam",
      "terlalu rapat",
      "saling berebut",
      "antara satu dengan yang lain",
      "berebut ruang",
    ],
    kunci: "D",
    pembahasan:
      "Kata <i>saling</i> sudah bermakna timbal balik, sehingga <i>antara satu dengan yang lain</i> hanya mengulang makna yang sama.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kalimat manakah yang merupakan bentuk efektif dari kalimat (6)?",
    opsi: [
      "Namun pelaksanaannya di beberapa kelas kurang berjalan mulus.",
      "Namun, pelaksanaannya di beberapa kelas, kurang berjalan mulus.",
      "Namun, pelaksanaannya di beberapa kelas kurang berjalan mulus.",
      "Namun pelaksanaan di beberapa kelas, kurang berjalan mulus.",
      "Namun, pelaksanaannya, di beberapa kelas kurang berjalan mulus.",
    ],
    kunci: "C",
    pembahasan:
      "Konjungsi antarkalimat <i>namun</i> diikuti tanda koma, sedangkan subjek dan predikat tidak boleh dipisahkan koma.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Apa informasi utama kalimat (2)?",
    opsi: [
      "Jumlah dan jenis bibit yang diterima setiap kelas",
      "Asal bibit pohon yang dibagikan kepada siswa",
      "Tujuan diadakannya kegiatan menanam pohon",
      "Letak halaman belakang sekolah",
      "Waktu dimulainya tahun ajaran baru",
    ],
    kunci: "A",
    pembahasan:
      "Kalimat (2) menyebut lima bibit pohon buah untuk setiap kelas. Asal bibit ada pada kalimat (3), sedangkan tujuannya pada kalimat (4).",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Judul yang paling tepat untuk bacaan tersebut adalah …",
    opsi: [
      "Cara Memilih Bibit Pohon Buah yang Baik",
      "Tugas Penyuluh Dinas Pertanian Kabupaten",
      "Halaman Belakang Sekolah yang Rindang",
      "Sebab-Sebab Bibit Pohon Menjadi Layu",
      "Gerakan Menanam Pohon di Sekolah dan Kendalanya",
    ],
    kunci: "E",
    pembahasan:
      "Bacaan memuat jalannya kegiatan sekaligus hambatan dan penyelesaiannya. Judul yang baik mencakup keduanya, bukan satu rincian saja.",
  },

  /* ---------------- Penyuntingan dan Teks 2 ---------------- */
  {
    tipe: "PG",
    pertanyaan:
      "Perhatikan kalimat berikut.<br>1) Air hujan yang jatuh di atap sekolah selama ini langsung mengalir ke selokan.<br>2) Padahal, air itu dapat ditampung untuk menyiram tanaman.<br>3) Penampungan sederhana cukup berupa tong besar yang dihubungkan dengan talang.<br>4) Sekolah pun tidak perlu memakai air keran untuk merawat taman.<br>5) Biayanya murah dan pemasangannya hanya memerlukan satu hari.<br>Jika kelima kalimat tersebut disusun menjadi paragraf yang padu, urutannya adalah …",
    opsi: [
      "(1), (2), (3), (4), (5)",
      "(1), (2), (3), (5), (4)",
      "(2), (1), (3), (5), (4)",
      "(3), (1), (2), (5), (4)",
      "(1), (3), (2), (4), (5)",
    ],
    kunci: "B",
    pembahasan:
      "Paragraf dibuka keadaan yang berlaku (1), disusul sanggahan <i>padahal</i> (2), lalu caranya (3), keunggulannya (5), dan hasil akhirnya (4). Kata <i>padahal</i> menuntut kalimat (1) berada tepat di depannya.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Kata sambung yang tepat untuk melengkapi kalimat “Pertumbuhan bibit itu lambat … tanah di halaman belakang terlalu padat.” adalah …",
    opsi: ["tetapi", "atau", "meskipun", "karena", "lalu"],
    kunci: "D",
    pembahasan:
      "Bagian kedua kalimat menjelaskan alasan bagian pertama, jadi konjungsi yang tepat adalah <i>karena</i>. <i>Tetapi</i> dan <i>meskipun</i> menyatakan pertentangan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan:
      "Maksud ungkapan <i>membolak-balik halaman tanpa benar-benar membaca</i> pada kalimat (3) adalah …",
    opsi: [
      "membaca dengan sangat cepat",
      "membaca sambil mencatat isinya",
      "berpura-pura membaca",
      "memilih buku yang paling tepat",
      "merapikan halaman yang terlipat",
    ],
    kunci: "C",
    pembahasan:
      "Ungkapan itu menggambarkan gerakan membaca tanpa kegiatan membaca yang sesungguhnya — pekan pertama yang masih canggung, sebelum berubah pada kalimat (4).",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Hubungan antara kalimat (3) dan kalimat (4) pada Teks 2 adalah …",
    opsi: [
      "sebab dan akibat",
      "penambahan keterangan",
      "syarat dan hasil",
      "pilihan di antara dua hal",
      "perbandingan keadaan pada dua waktu",
    ],
    kunci: "E",
    pembahasan:
      "Kedua kalimat menyebut penanda waktu yang berbeda — pekan pertama dan pekan ketiga — lalu memaparkan keadaan yang berlainan pada masing-masing waktu itu.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Penulisan kata yang tidak baku terdapat pada kalimat nomor …",
    opsi: ["(7)", "(2)", "(4)", "(5)", "(8)"],
    kunci: "A",
    pembahasan: "Kalimat (7) memuat kata <i>aktifitas</i> yang bentuk bakunya <i>aktivitas</i>.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Kalimat (1) akan menjadi efektif bila diperbaiki menjadi …",
    opsi: [
      "Kelas kami mulai kebiasaan membaca selama lima belas menit lamanya sebelum pelajaran pertama.",
      "Kelas kami memulai kebiasaan membaca lima belas menit sebelum pelajaran pertama.",
      "Kelas kami mulai memulai kebiasaan membaca lima belas menit sebelum pelajaran pertama dimulai.",
      "Kebiasaan membaca dimulai kelas kami selama lima belas menit lamanya.",
      "Kelas kami memulai kebiasaan membaca selama lima belas menit lamanya.",
    ],
    kunci: "B",
    pembahasan:
      "<i>Mulai memulai</i> dan <i>lima belas menit lamanya</i> sama-sama mengulang makna, dan kata <i>dimulai</i> di akhir kalimat juga berlebihan. Semuanya cukup dinyatakan satu kali.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Simpulan yang tepat untuk Teks 2 adalah …",
    opsi: [
      "Siswa hanya mau membaca bila diperintah wali kelas",
      "Buku pelajaran justru lebih baik dibaca setiap pagi",
      "Kebiasaan membaca gagal tumbuh di kelas tersebut",
      "Kebiasaan membaca tumbuh tanpa paksaan karena dibiasakan setiap hari",
      "Jumlah halaman yang dibaca menentukan keberhasilan kegiatan",
    ],
    kunci: "D",
    pembahasan:
      "Kalimat (5), (7), dan (8) menegaskan tidak adanya paksaan dan tumbuhnya kebiasaan secara perlahan. Pilihan C bertentangan dengan kalimat (4).",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Informasi utama kalimat (8) adalah …",
    opsi: [
      "Jumlah halaman perlu dicatat setiap hari",
      "Wali kelas mengganti buku di rak setiap Senin",
      "Siswa membaca dengan kecepatan yang tinggi",
      "Rak buku di kelas itu selalu penuh terisi",
      "Yang tumbuh adalah keinginan membuka buku, bukan jumlah halaman",
    ],
    kunci: "E",
    pembahasan:
      "Kalimat (8) mempertentangkan dua hal dan memihak yang kedua: keinginan membuka buku, bukan banyaknya halaman.",
  },

  /* ---------------- Pilihan ganda kompleks (Benar/Salah) ---------------- */
  {
    tipe: "PGK",
    stimulus: TEKS_1,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 1.",
    opsi: [
      "Bibit pohon yang dibagikan berasal dari dinas pertanian kabupaten.",
      "Kalimat (6) memuat tanda koma yang tidak diperlukan.",
      "Bacaan menyatakan seluruh bibit tumbuh dengan baik.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Kalimat (3) menyebut asal bibit, dan koma pada kalimat (6) memang keliru. Kalimat (8) justru menyebut beberapa bibit layu sebelum berumur satu bulan.",
  },
  {
    tipe: "PGK",
    stimulus: TEKS_2,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 2.",
    opsi: [
      "Kegiatan membaca berlangsung lima belas menit sebelum pelajaran pertama.",
      "Kalimat (7) memuat kata yang penulisannya tidak baku.",
      "Menurut bacaan, wali kelas mewajibkan siswa menceritakan bacaannya.",
      "Kalimat (8) menegaskan bahwa tujuan kegiatan bukan banyaknya halaman.",
    ],
    kunci: ["B", "B", "S", "B"],
    pembahasan:
      "Kalimat (5) justru menyebut wali kelas tidak pernah memaksa siapa pun bercerita. Kata tidak baku pada kalimat (7) adalah <i>aktifitas</i>.",
  },
  {
    tipe: "PGK",
    stimulus:
      "Perhatikan kalimat berikut.<br><i>“Kepada Bapak Kepala Sekolah, waktu dan tempat kami persilakan.”</i>",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Kalimat tersebut tidak logis karena yang dipersilakan seharusnya orangnya, bukan waktu dan tempat.",
      "Perbaikannya adalah “Bapak Kepala Sekolah kami persilakan.”",
      "Kata <i>kepada</i> di awal kalimat membuat kalimat itu kehilangan subjek.",
      "Kalimat tersebut sudah tepat karena lazim dipakai dalam acara resmi.",
    ],
    kunci: ["B", "B", "B", "S"],
    pembahasan:
      "Waktu dan tempat adalah benda mati yang tidak dapat dipersilakan. Sering dipakai bukan berarti benar — kelaziman tidak menghapus kekeliruan penalarannya.",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    pertanyaan: "Tuliskan bentuk baku dari kata <b>aktifitas</b>. (tulis satu kata)",
    kunci: "aktivitas",
    pembahasan:
      "Bentuk bakunya <i>aktivitas</i>, sejalan dengan <i>aktif</i> dan <i>kreativitas</i>. Ejaan <i>aktifitas</i> tidak baku.",
  },
];
