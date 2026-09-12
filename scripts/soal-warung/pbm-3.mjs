/**
 * Warung Soal — PBM (Kemampuan Memahami Bacaan dan Menulis) Paket 3, kategori Easy.
 *
 * 20 butir: 16 pilihan ganda, 3 pilihan ganda kompleks, 1 isian singkat.
 * Model INTENS: bacaan bernomor kalimat yang sengaja memuat kesalahan.
 */

const TEKS_1 = `<p><b>Teks 1</b></p><p><sup>1</sup>Kegiatan donor darah di sekolah kami diadakan dua kali setahun bekerja sama dengan palang merah kota. <sup>2</sup>Peserta harus berusia sekurang-kurangnya 17 tahun dan berbobot badan minimal 45 kilogram. <sup>3</sup>Sebelum menyumbang, calon pendonor diperiksa tekanan darah dan kadar hemoglobinnya. <sup>4</sup>Kegiatan ini bertujuan menambah persediaan darah di kota. <sup>5</sup>Selain itu untuk mengenalkan kebiasaan menolong sejak dini. <sup>6</sup>Namun pelaksanaannya tahun ini, sempat tersendat. <sup>7</sup>Antrean yang terlalu panjang menyebabkan sebagian peserta menjadi memilih pulang lebih dahulu. <sup>8</sup>Beberapa siswa bahkan tidak sempat diperiksa sampai kegiatan berakhir. <sup>9</sup>Kegiatan serupa akan diulang pada Bulan Februari tahun depan. <sup>10</sup>Panitia berjanji menambah meja pemeriksaan agar antrean tidak terulang.</p>`;

const TEKS_2 = `<p><b>Teks 2</b></p><p><sup>1</sup>Sejak tahun lalu, kelas kami setiap hari Jumat selalu menyisihkan lima menit terakhir waktunya untuk membereskan laci meja masing-masing. <sup>2</sup>Awalnya banyak yang menganggapnya membuang waktu. <sup>3</sup>Pada Jumat pertama, laci sebagian siswa masih penuh kertas ujian dua semester lalu. <sup>4</sup>Pada Jumat kelima, hampir semua laci sudah dapat ditutup rapat. <sup>5</sup>Wali kelas tidak pernah memberi nilai untuk kegiatan itu. <sup>6</sup>Ia hanya ikut membereskan lacinya sendiri di depan kelas. <sup>7</sup>Kebiasaan itu lama-lama berjalan tanpa perlu diingatkan, bahkan menjadi rutinitas yang positip. <sup>8</sup>Yang tumbuh bukan kerapian laci, melainkan kebiasaan menyelesaikan hal kecil.</p>`;

export const SOAL = [
  /* ---------------- Teks 1 ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan:
      "Kalimat berikut perlu dimasukkan ke dalam bacaan tersebut.<br><i>Hemoglobin adalah zat di dalam sel darah merah yang mengangkut oksigen ke seluruh tubuh.</i><br>Kalimat itu paling tepat ditempatkan setelah kalimat nomor …",
    opsi: ["(1)", "(2)", "(3)", "(7)", "(9)"],
    kunci: "C",
    pembahasan:
      "Istilah <i>hemoglobin</i> baru muncul pada kalimat (3). Penjelasan istilah paling tepat diletakkan tepat sesudah istilah itu disebut.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Penggunaan tanda baca koma yang salah terdapat pada kalimat nomor …",
    opsi: ["(6)", "(2)", "(3)", "(8)", "(10)"],
    kunci: "A",
    pembahasan:
      "Pada kalimat (6), koma memisahkan subjek <i>pelaksanaannya tahun ini</i> dari predikatnya. Koma yang benar justru diletakkan sesudah <i>Namun</i>.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Penulisan huruf kapital yang salah terdapat pada kalimat nomor …",
    opsi: ["(1)", "(2)", "(4)", "(8)", "(9)"],
    kunci: "E",
    pembahasan:
      "Kalimat (9) menulis <i>Bulan Februari</i>. Nama bulan memang berhuruf kapital, tetapi kata <i>bulan</i> di depannya ditulis dengan huruf kecil.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kalimat (5) perlu disempurnakan dengan cara …",
    opsi: [
      "menghilangkan kelompok kata <i>selain itu</i>",
      "menambahkan kelompok kata <i>kegiatan ini juga bertujuan</i> sesudah <i>selain itu</i>",
      "mengganti kata <i>mengenalkan</i> dengan <i>dikenalkan</i>",
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
    pertanyaan: "Kata yang harus dihilangkan pada kalimat (7) adalah …",
    opsi: ["yang", "terlalu", "menyebabkan", "menjadi", "lebih"],
    kunci: "D",
    pembahasan:
      "Kata <i>menjadi</i> berlebihan di depan <i>memilih</i>. Tanpa kata itu kalimatnya sudah lengkap dan justru lebih lugas.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kalimat manakah yang merupakan bentuk efektif dari kalimat (6)?",
    opsi: [
      "Namun pelaksanaannya tahun ini sempat tersendat.",
      "Namun, pelaksanaannya tahun ini, sempat tersendat.",
      "Namun, pelaksanaannya tahun ini sempat tersendat.",
      "Namun pelaksanaan tahun ini, sempat tersendat.",
      "Namun, pelaksanaannya, tahun ini sempat tersendat.",
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
      "Syarat usia dan bobot badan peserta donor",
      "Waktu pelaksanaan kegiatan donor darah",
      "Tujuan diadakannya kegiatan donor darah",
      "Jumlah peserta yang mendaftar tahun ini",
      "Nama lembaga yang diajak bekerja sama",
    ],
    kunci: "A",
    pembahasan:
      "Kalimat (2) memuat dua syarat peserta. Tujuan kegiatan ada pada kalimat (4), sedangkan lembaga mitra disebut pada kalimat (1).",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Judul yang paling tepat untuk bacaan tersebut adalah …",
    opsi: [
      "Cara Memeriksa Tekanan Darah dengan Benar",
      "Syarat Menjadi Pendonor Darah",
      "Tugas Palang Merah di Kota Kami",
      "Manfaat Darah bagi Tubuh Manusia",
      "Donor Darah di Sekolah dan Kendala Pelaksanaannya",
    ],
    kunci: "E",
    pembahasan:
      "Bacaan memuat jalannya kegiatan sekaligus hambatan dan rencana perbaikannya. Judul yang baik mencakup keduanya.",
  },

  /* ---------------- Penyuntingan dan Teks 2 ---------------- */
  {
    tipe: "PG",
    pertanyaan:
      "Perhatikan kalimat berikut.<br>1) Sisa minyak goreng dari kantin selama ini dibuang ke saluran air.<br>2) Padahal, minyak bekas dapat dikumpulkan lalu diolah menjadi sabun.<br>3) Pengolahannya cukup memerlukan wadah, saringan, dan bahan sederhana.<br>4) Sabun hasil olahan itu dapat dipakai untuk mencuci peralatan kantin.<br>5) Akibatnya, saluran air kantin sering tersumbat.<br>Jika kelima kalimat tersebut disusun menjadi paragraf yang padu, urutannya adalah …",
    opsi: [
      "(1), (2), (3), (4), (5)",
      "(1), (5), (2), (3), (4)",
      "(2), (1), (5), (3), (4)",
      "(5), (1), (2), (3), (4)",
      "(1), (2), (5), (3), (4)",
    ],
    kunci: "B",
    pembahasan:
      "Paragraf dibuka keadaan yang berlaku (1), disusul akibatnya (5), lalu tawaran jalan keluar (2), caranya (3), dan hasilnya (4). Kata <i>akibatnya</i> menuntut kalimat (1) tepat di depannya.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Kata sambung yang tepat untuk melengkapi kalimat “Antrean sudah dibuka sejak pagi, … jumlah petugasnya belum mencukupi.” adalah …",
    opsi: ["sehingga", "karena", "bahkan", "tetapi", "sebab"],
    kunci: "D",
    pembahasan:
      "Kedua bagian kalimat itu berlawanan arah, jadi konjungsi yang tepat <i>tetapi</i>. <i>Sehingga</i> menyatakan akibat, sedangkan <i>karena</i> dan <i>sebab</i> menyatakan alasan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Maksud ungkapan <i>menganggapnya membuang waktu</i> pada kalimat (2) adalah …",
    opsi: [
      "kegiatan itu memerlukan waktu yang lama",
      "siswa lupa waktu ketika membereskan laci",
      "siswa menilai kegiatan itu tidak ada gunanya",
      "waktu istirahat siswa menjadi berkurang",
      "wali kelas menghabiskan jam pelajaran",
    ],
    kunci: "C",
    pembahasan:
      "Ungkapan itu menggambarkan penilaian awal siswa bahwa kegiatan tersebut sia-sia — penilaian yang kemudian berubah pada kalimat (4) dan (7).",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Kalimat (6) pada Teks 2 menunjukkan bahwa wali kelas …",
    opsi: [
      "mengawasi siswa dari meja guru",
      "menghukum siswa yang lacinya berantakan",
      "mencatat siswa yang tidak ikut membereskan",
      "meminta siswa membereskan laci temannya",
      "memberi contoh dengan ikut melakukannya sendiri",
    ],
    kunci: "E",
    pembahasan:
      "Wali kelas tidak memerintah dan tidak menilai (kalimat 5), tetapi ikut membereskan lacinya di depan kelas. Itulah cara ia mengajak tanpa menyuruh.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Kata yang penulisannya tidak baku pada Teks 2 terdapat pada kalimat nomor …",
    opsi: ["(2)", "(4)", "(5)", "(7)", "(8)"],
    kunci: "D",
    pembahasan: "Kalimat (7) memuat kata <i>positip</i> yang bentuk bakunya <i>positif</i>.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Kalimat (1) akan menjadi efektif bila diperbaiki menjadi …",
    opsi: [
      "Sejak tahun lalu, kelas kami setiap Jumat selalu menyisihkan lima menit terakhir waktunya untuk membereskan laci meja.",
      "Sejak tahun lalu, kelas kami menyisihkan lima menit terakhir setiap Jumat untuk membereskan laci meja.",
      "Kelas kami sejak tahun lalu setiap hari Jumat menyisihkan waktu lima menit terakhirnya.",
      "Sejak tahun lalu setiap Jumat, kelas kami selalu membereskan laci meja masing-masing selama lima menit terakhir waktunya.",
      "Kelas kami menyisihkan lima menit terakhir waktunya setiap hari Jumat sejak tahun lalu selalu.",
    ],
    kunci: "B",
    pembahasan:
      "<i>Setiap hari Jumat</i> dan <i>selalu</i> menyatakan keterangan yang sama, begitu pula <i>waktunya</i> yang sudah terkandung dalam <i>lima menit</i>. Semuanya cukup dinyatakan satu kali.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Simpulan yang tepat untuk Teks 2 adalah …",
    opsi: [
      "Kegiatan membereskan laci akhirnya gagal berjalan",
      "Nilai perlu diberikan agar siswa mau membereskan lacinya",
      "Laci yang rapi menentukan prestasi belajar siswa",
      "Kebiasaan menyelesaikan hal kecil tumbuh tanpa paksaan",
      "Wali kelas seharusnya memeriksa laci siswa setiap hari",
    ],
    kunci: "D",
    pembahasan:
      "Kalimat (5), (7), dan (8) menegaskan tidak adanya nilai maupun paksaan, tetapi kebiasaannya tetap tumbuh.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Informasi utama kalimat (8) adalah …",
    opsi: [
      "Laci siswa selalu rapi setiap hari Jumat",
      "Wali kelas ikut membereskan lacinya sendiri",
      "Kertas ujian yang lama sebaiknya dibuang",
      "Kegiatan itu berlangsung selama lima menit",
      "Yang tumbuh adalah kebiasaan menyelesaikan hal kecil, bukan kerapian lacinya",
    ],
    kunci: "E",
    pembahasan:
      "Kalimat (8) mempertentangkan dua hal dan memihak yang kedua: kebiasaan menyelesaikan hal kecil.",
  },

  /* ---------------- Pilihan ganda kompleks ---------------- */
  {
    tipe: "PGK",
    stimulus: TEKS_1,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 1.",
    opsi: [
      "Calon pendonor diperiksa tekanan darah dan kadar hemoglobinnya.",
      "Kalimat (6) memuat tanda koma yang tidak diperlukan.",
      "Bacaan menyatakan seluruh peserta sempat diperiksa sampai kegiatan selesai.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Kalimat (8) justru menyebut beberapa siswa tidak sempat diperiksa. Dua pernyataan lain sesuai kalimat (3) dan tanda baca pada kalimat (6).",
  },
  {
    tipe: "PGK",
    stimulus: TEKS_2,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 2.",
    opsi: [
      "Kegiatan membereskan laci dilakukan setiap hari Jumat.",
      "Kalimat (7) memuat kata yang penulisannya tidak baku.",
      "Menurut bacaan, wali kelas memberi nilai untuk kegiatan tersebut.",
      "Kalimat (8) menegaskan bahwa tujuan kegiatan bukan kerapian lacinya semata.",
    ],
    kunci: ["B", "B", "S", "B"],
    pembahasan:
      "Kalimat (5) menyebut wali kelas tidak pernah memberi nilai. Kata tidak baku pada kalimat (7) adalah <i>positip</i>.",
  },
  {
    tipe: "PGK",
    stimulus:
      "Perhatikan kalimat berikut.<br><i>“Bagi siswa yang belum mengumpulkan tugas harap segera menemui wali kelas.”</i>",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Kata <i>bagi</i> di awal kalimat membuat kalimat itu kehilangan subjek.",
      "Perbaikannya adalah “Siswa yang belum mengumpulkan tugas harap segera menemui wali kelas.”",
      "Kalimat tersebut sudah efektif karena maksudnya dapat dipahami.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Kata depan di awal kalimat menjadikan unsur sesudahnya keterangan. Dapat dipahami tidak sama dengan efektif.",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    pertanyaan: "Tuliskan bentuk baku dari kata <b>positip</b>. (tulis satu kata)",
    kunci: "positif",
    pembahasan:
      "Bentuk bakunya <i>positif</i>. Akhiran <i>-if</i> pada kata serapan tidak berubah menjadi <i>-ip</i>, seperti juga <i>aktif</i> dan <i>efektif</i>.",
  },
];
