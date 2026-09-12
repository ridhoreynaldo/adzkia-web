/**
 * Warung Soal — PBM (Kemampuan Memahami Bacaan dan Menulis) Paket 2, kategori Easy.
 *
 * 20 butir: 16 pilihan ganda, 3 pilihan ganda kompleks, 1 isian singkat.
 *
 * Modelnya mengikuti naskah Tryout Prosus Inten: bacaan bernomor kalimat yang
 * SENGAJA memuat kesalahan, lalu ditanyakan penempatan kalimat sisipan, tanda
 * baca yang salah, kata yang harus dihilangkan, kalimat efektif, huruf kapital,
 * urutan kalimat, dan informasi utama. Bacaan ditulis sendiri untuk latihan.
 */

const TEKS_1 = `<p><b>Teks 1</b></p><p><sup>1</sup>Program makan bergizi di sekolah dasar mulai dijalankan di sejumlah kabupaten sejak awal tahun ini. <sup>2</sup>Setiap siswa menerima satu porsi makanan yang memuat sumber karbohidrat, protein hewani, sayur, dan buah. <sup>3</sup>Menunya disusun ahli gizi puskesmas setempat dan berganti setiap hari. <sup>4</sup>Pemerintah daerah menyebut program ini bertujuan menekan angka anemia pada anak. <sup>5</sup>Selain itu untuk memastikan siswa tetap berkonsentrasi sampai jam pelajaran terakhir. <sup>6</sup>Namun pelaksanaannya di lapangan, tidak selalu mulus. <sup>7</sup>Dapur penyedia yang jaraknya jauh menyebabkan makanan menjadi tiba dalam keadaan dingin. <sup>8</sup>Sebagian sekolah di daerah pegunungan bahkan menerima kiriman lewat dari jam istirahat. <sup>9</sup>Dinas pendidikan setempat menyatakan akan menambah dapur penyedia di wilayah Utara. <sup>10</sup>Penambahan itu diharapkan memangkas waktu tempuh pengiriman.</p>`;

const TEKS_2 = `<p><b>Teks 2</b></p><p><sup>1</sup>Bank sampah sekolah pada saat ini kini sudah menjadi kegiatan yang diwajibkan di beberapa SMA. <sup>2</sup>Siswa mengumpulkan botol plastik, kardus, dan kaleng lalu menimbangnya setiap Jumat. <sup>3</sup>Hasil penjualannya disimpan sebagai kas kelas. <sup>4</sup>Tahun lalu, kas itu dipakai membeli buku bacaan untuk sudut baca. <sup>5</sup>Kegiatan ini melatih siswa memilah sampah sejak dari sumbernya. <sup>6</sup>Di samping itu, siswa belajar mencatat pemasukan lewat praktek sederhana. <sup>7</sup>Guru pembina mengingatkan agar kegiatan ini tidak berhenti sebagai rutinitas menimbang. <sup>8</sup>Nilai yang hendak ditanam adalah kebiasaan, bukan angka timbangan.</p>`;

export const SOAL = [
  /* ---------------- Teks 1 ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan:
      "Kalimat berikut perlu dimasukkan ke dalam bacaan tersebut.<br><i>Anemia adalah keadaan ketika jumlah sel darah merah atau kadar hemoglobin berada di bawah batas normal.</i><br>Kalimat itu paling tepat ditempatkan setelah kalimat nomor …",
    opsi: ["(1)", "(2)", "(4)", "(7)", "(9)"],
    kunci: "C",
    pembahasan:
      "Kata <i>anemia</i> baru muncul pada kalimat (4). Penjelasan istilah paling tepat diletakkan tepat sesudah istilah itu diperkenalkan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Penggunaan tanda baca koma yang salah terdapat pada kalimat nomor …",
    opsi: ["(6)", "(2)", "(3)", "(7)", "(10)"],
    kunci: "A",
    pembahasan:
      "Pada kalimat (6), koma justru memisahkan subjek <i>pelaksanaannya di lapangan</i> dari predikatnya. Koma yang benar seharusnya diletakkan sesudah <i>Namun</i> sebagai konjungsi antarkalimat.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Penulisan huruf kapital yang salah terdapat pada kalimat nomor …",
    opsi: ["(1)", "(3)", "(4)", "(8)", "(9)"],
    kunci: "E",
    pembahasan:
      "Pada kalimat (9) tertulis <i>wilayah Utara</i>. Nama arah mata angin ditulis dengan huruf kecil bila tidak menjadi bagian nama geografi, jadi seharusnya <i>wilayah utara</i>.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kalimat (5) perlu disempurnakan dengan cara …",
    opsi: [
      "menghilangkan kelompok kata <i>selain itu</i>",
      "menambahkan kelompok kata <i>program ini juga bertujuan</i> sesudah <i>selain itu</i>",
      "mengganti kata <i>memastikan</i> dengan <i>memastikannya</i>",
      "menghilangkan kata <i>untuk</i>",
      "menambahkan tanda koma sesudah kata <i>itu</i>",
    ],
    kunci: "B",
    pembahasan:
      "Kalimat (5) belum memiliki subjek dan predikat sehingga masih berupa penggalan. Menambahkan <i>program ini juga bertujuan</i> melengkapinya menjadi kalimat utuh.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kata yang harus dihilangkan pada kalimat (7) adalah …",
    opsi: ["yang", "jauh", "menyebabkan", "menjadi", "dalam"],
    kunci: "D",
    pembahasan:
      "Kata <i>menjadi</i> berlebihan di depan <i>tiba</i>. Tanpa kata itu kalimatnya sudah lengkap: makanan tiba dalam keadaan dingin.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kalimat manakah yang merupakan bentuk efektif dari kalimat (6)?",
    opsi: [
      "Namun pelaksanaannya di lapangan tidak selalu mulus.",
      "Namun, pelaksanaannya di lapangan, tidak selalu mulus.",
      "Namun, pelaksanaannya di lapangan tidak selalu mulus.",
      "Namun pelaksanaan di lapangan, tidak selalu mulus.",
      "Namun, pelaksanaannya, di lapangan tidak selalu mulus.",
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
      "Isi satu porsi makanan yang diterima setiap siswa",
      "Jumlah siswa yang menerima makanan setiap hari",
      "Cara ahli gizi menyusun menu harian",
      "Tujuan diadakannya program makan bergizi",
      "Waktu pembagian makanan di sekolah",
    ],
    kunci: "A",
    pembahasan:
      "Kalimat (2) merinci isi satu porsi makanan. Tujuan program ada pada kalimat (4), sedangkan penyusunan menu pada kalimat (3).",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Judul yang paling tepat untuk bacaan tersebut adalah …",
    opsi: [
      "Cara Menyusun Menu Bergizi untuk Anak",
      "Anemia dan Bahayanya bagi Siswa Sekolah Dasar",
      "Dapur Penyedia di Daerah Pegunungan",
      "Konsentrasi Belajar Siswa Sekolah Dasar",
      "Program Makan Bergizi dan Kendala Pengirimannya",
    ],
    kunci: "E",
    pembahasan:
      "Bacaan memuat dua hal sekaligus: jalannya program dan hambatan pengirimannya. Judul yang baik mencakup keduanya, bukan hanya satu rincian.",
  },

  /* ---------------- Teks 2 dan penyuntingan ---------------- */
  {
    tipe: "PG",
    pertanyaan:
      "Perhatikan kalimat berikut.<br>1) Sampah organik sebenarnya dapat diolah menjadi kompos di lingkungan sekolah.<br>2) Pengolahan itu memerlukan wadah tertutup dan pengadukan berkala.<br>3) Selama ini sekolah hanya memilah sampah anorganik yang bernilai jual.<br>4) Kompos yang dihasilkan dapat dipakai untuk taman sekolah sendiri.<br>5) Akibatnya, sisa makanan dan daun tetap berakhir di tempat pembuangan.<br>Jika kelima kalimat tersebut disusun menjadi paragraf yang padu, urutannya adalah …",
    opsi: [
      "(1), (2), (3), (4), (5)",
      "(3), (5), (1), (2), (4)",
      "(3), (1), (5), (2), (4)",
      "(1), (3), (5), (2), (4)",
      "(5), (3), (1), (4), (2)",
    ],
    kunci: "B",
    pembahasan:
      "Paragraf dibuka keadaan yang berlaku (3), disusul akibatnya (5), lalu tawaran jalan keluar (1), caranya (2), dan hasilnya (4). Kata <i>akibatnya</i> pada kalimat (5) menuntut kalimat (3) berada tepat di depannya.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Kata sambung yang tepat untuk melengkapi kalimat “Sampah plastik memang dapat dijual, … tidak semua jenisnya diterima pengepul.” adalah …",
    opsi: ["sehingga", "karena", "bahkan", "tetapi", "sebab"],
    kunci: "D",
    pembahasan:
      "Kedua bagian kalimat itu berlawanan arah, jadi konjungsi yang tepat adalah <i>tetapi</i>. Kata <i>sehingga</i> menyatakan akibat, sedangkan <i>karena</i> dan <i>sebab</i> menyatakan alasan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Kata yang paling tepat menggantikan kata <i>ditanam</i> pada kalimat (8) adalah …",
    opsi: ["dikubur", "disemai", "ditumbuhkan", "diletakkan", "disimpan"],
    kunci: "C",
    pembahasan:
      "Yang ditanam di sini adalah nilai, bukan benih atau benda. Padanan kias yang tepat adalah <i>ditumbuhkan</i>.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan:
      "Ungkapan <i>di samping itu</i> yang menghubungkan kalimat (5) dan (6) berfungsi untuk …",
    opsi: [
      "mempertentangkan gagasan",
      "menyimpulkan gagasan",
      "memberikan syarat",
      "menyatakan sebab",
      "menambahkan gagasan",
    ],
    kunci: "E",
    pembahasan:
      "<i>Di samping itu</i> menambahkan manfaat kedua sesudah manfaat pertama pada kalimat (5), jadi hubungannya penambahan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Penulisan kata yang tidak baku terdapat pada kalimat nomor …",
    opsi: ["(6)", "(2)", "(3)", "(5)", "(7)"],
    kunci: "A",
    pembahasan: "Kalimat (6) memuat kata <i>praktek</i> yang bentuk bakunya <i>praktik</i>.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Kalimat (1) akan menjadi efektif bila diperbaiki menjadi …",
    opsi: [
      "Bank sampah sekolah pada saat ini menjadi kegiatan yang diwajibkan di beberapa SMA.",
      "Bank sampah sekolah kini menjadi kegiatan wajib di beberapa SMA.",
      "Bank sampah sekolah sudah kini menjadi kegiatan wajib di beberapa SMA.",
      "Pada saat ini bank sampah sekolah kini diwajibkan di beberapa SMA.",
      "Bank sampah sekolah menjadi kegiatan yang sudah diwajibkan pada saat ini kini.",
    ],
    kunci: "B",
    pembahasan:
      "<i>Pada saat ini</i>, <i>kini</i>, dan <i>sudah</i> menyatakan keterangan waktu yang sama sehingga cukup dipakai satu. Bentuk <i>kegiatan wajib</i> juga lebih ringkas daripada <i>kegiatan yang diwajibkan</i>.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Simpulan yang tepat untuk Teks 2 adalah …",
    opsi: [
      "Bank sampah sekolah gagal menanamkan kebiasaan pada siswa",
      "Kas kelas sebaiknya dipakai untuk membeli timbangan yang baru",
      "Siswa hanya tertarik pada hasil penjualan sampah",
      "Bank sampah bernilai bila kebiasaannya ikut tertanam, bukan sekadar timbangannya",
      "Sampah anorganik lebih penting daripada sampah organik",
    ],
    kunci: "D",
    pembahasan:
      "Kalimat (7) dan (8) menegaskan bahwa kegiatan itu tidak boleh berhenti sebagai rutinitas menimbang. Di situlah simpulan bacaan berada.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Informasi utama kalimat (8) adalah …",
    opsi: [
      "Angka timbangan perlu dicatat setiap pekan",
      "Guru pembina mengawasi jalannya kegiatan menimbang",
      "Kebiasaan siswa diukur dari berat sampah yang terkumpul",
      "Bank sampah menghasilkan uang bagi kas kelas",
      "Yang hendak ditanamkan adalah kebiasaan, bukan angka timbangan",
    ],
    kunci: "E",
    pembahasan:
      "Kalimat (8) mempertentangkan dua hal dan memihak yang pertama: kebiasaan, bukan angka timbangan.",
  },

  /* ---------------- Pilihan ganda kompleks (Benar/Salah) ---------------- */
  {
    tipe: "PGK",
    stimulus: TEKS_1,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 1.",
    opsi: [
      "Menu program makan bergizi disusun ahli gizi puskesmas setempat.",
      "Kalimat (6) memuat tanda koma yang tidak diperlukan.",
      "Bacaan menyatakan seluruh sekolah menerima kiriman makanan tepat waktu.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Kalimat (3) menyebut penyusun menunya, dan koma pada kalimat (6) memang keliru. Kalimat (8) justru menyebut sebagian sekolah menerima kiriman lewat dari jam istirahat.",
  },
  {
    tipe: "PGK",
    stimulus: TEKS_2,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 2.",
    opsi: [
      "Siswa menimbang sampah yang mereka kumpulkan setiap Jumat.",
      "Kalimat (6) memuat kata yang penulisannya tidak baku.",
      "Menurut bacaan, hasil penjualan sampah dibagikan kepada tiap siswa.",
      "Kalimat (8) menegaskan bahwa tujuan kegiatan bukan sekadar hasil timbangan.",
    ],
    kunci: ["B", "B", "S", "B"],
    pembahasan:
      "Kalimat (3) menyebut hasil penjualan disimpan sebagai kas kelas, bukan dibagikan kepada siswa. Kata tidak baku pada kalimat (6) adalah <i>praktek</i>.",
  },
  {
    tipe: "PGK",
    stimulus:
      "Perhatikan kalimat berikut.<br><i>“Meskipun cuaca buruk, namun panitia tetap melanjutkan kegiatan di lapangan.”</i>",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Kalimat tersebut memakai dua konjungsi yang bertumpuk.",
      "Perbaikannya adalah “Meskipun cuaca buruk, panitia tetap melanjutkan kegiatan di lapangan.”",
      "Kalimat tersebut salah karena tidak memiliki predikat.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "<i>Meskipun</i> dan <i>namun</i> sama-sama menyatakan pertentangan sehingga cukup dipakai salah satu. Predikatnya jelas ada, yaitu <i>melanjutkan</i>.",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    pertanyaan: "Tuliskan bentuk baku dari kata <b>praktek</b>. (tulis satu kata)",
    kunci: "praktik",
    pembahasan:
      "Bentuk bakunya <i>praktik</i>, seperti pada <i>praktikum</i> dan <i>mempraktikkan</i>. Ejaan <i>praktek</i> tidak baku.",
  },
];
