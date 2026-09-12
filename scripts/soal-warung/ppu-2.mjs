/**
 * Warung Soal — PPU (Pengetahuan dan Pemahaman Umum) Paket 2, kategori Easy.
 *
 * 20 butir: 16 pilihan ganda, 3 pilihan ganda kompleks, 1 isian singkat.
 *
 * Modelnya mengikuti naskah Tryout Prosus Inten: SELURUH butir bertumpu pada
 * bacaan bernomor kalimat, dan yang diuji adalah kebahasaan tingkat tinggi —
 * kalimat tidak logis, makna kata dalam konteks, hipernim, kesejajaran bentuk,
 * fungsi konjungsi, dan pemisahan paragraf. PPU di sini BUKAN soal hafalan
 * pengetahuan umum. Bacaan ditulis sendiri untuk keperluan latihan.
 */

const TEKS_1 = `<p><b>Teks 1</b></p><p><sup>1</sup>Garam rakyat di pesisir Madura masih diproduksi dengan cara yang hampir tidak berubah sejak seabad lalu. <sup>2</sup>Air laut dialirkan ke petak-petak tambak, dijemur, lalu dipanen setelah mengkristal. <sup>3</sup>Cara ini murah, tetapi hasilnya sangat bergantung pada cuaca. <sup>4</sup>Musabab utama anjloknya produksi tahun lalu adalah hujan yang turun di luar kebiasaan. <sup>5</sup>Petani garam menyebut peristiwa itu sebagai musim yang berkhianat. <sup>6</sup>Sementara itu, kebutuhan garam industri terus meningkat secara masif. <sup>7</sup>Industri menuntut kadar natrium klorida di atas 97 persen, sedangkan garam rakyat jarang menembus 94 persen. <sup>8</sup>Selisih tiga persen itu justru membuat garam rakyat paling diminati industri. <sup>9</sup>Sejumlah koperasi mencoba memperbaiki mutu dengan memasang alas geomembran di dasar tambak. <sup>10</sup>Hasilnya, kristal garam menjadi lebih bersih karena tidak lagi bercampur lumpur dasar tambak. <sup>11</sup>Namun, harga geomembran belum terjangkau bagi petani bermodal kecil. <sup>12</sup>Tanpa bantuan pembiayaan, perbaikan mutu hanya akan dinikmati petani yang sudah mapan.</p>`;

const TEKS_2 = `<p><b>Teks 2</b></p><p><sup>1</sup>Perpustakaan keliling di Kabupaten Sumba Timur kini singgah di sepuluh desa setiap bulan. <sup>2</sup>Mobil bak terbuka yang dimodifikasi itu membawa sekitar delapan ratus buku. <sup>3</sup>Pengemudi merangkap pustakawan, pendongeng, sekaligus mencatat peminjaman. <sup>4</sup>Kegiatannya meliputi membacakan cerita, permainan kata, hingga pelatihan menulis surat. <sup>5</sup>Anak-anak yang semula malu-malu kini menunggu di tepi jalan sejak pagi. <sup>6</sup>Kepala dinas menyebut program ini <b>efektiv</b> menaikkan minat baca. <sup>7</sup>Meskipun demikian, jumlah buku yang tersedia belum sebanding dengan jumlah desa yang dilayani. <sup>8</sup>Satu judul yang digemari sering diperebutkan sampai halamannya lepas. <sup>9</sup>Perpustakaan keliling memang bukan pengganti perpustakaan desa. <sup>10</sup>Ia hanya jembatan sementara sampai tiap desa memiliki ruang bacanya sendiri.</p>`;

export const SOAL = [
  /* ---------------- Teks 1 ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kalimat yang tidak logis dalam Teks 1 adalah …",
    opsi: ["Kalimat (5)", "Kalimat (6)", "Kalimat (8)", "Kalimat (10)", "Kalimat (11)"],
    kunci: "C",
    pembahasan:
      "Kalimat (7) menyatakan industri menuntut kadar di atas 97 persen sedangkan garam rakyat jarang menembus 94 persen. Karena itu kalimat (8) yang menyebut garam rakyat <i>paling diminati industri</i> bertentangan dengan kalimat sebelumnya.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kata <i>musabab</i> pada kalimat (4) paling dekat maknanya dengan …",
    opsi: ["penyebab", "akibat", "gejala", "dampak", "penanda"],
    kunci: "A",
    pembahasan:
      "<i>Musabab</i> bermakna sebab atau penyebab. <i>Akibat</i> dan <i>dampak</i> justru kebalikannya, sedangkan <i>gejala</i> dan <i>penanda</i> hanya tanda yang menyertai.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kata <i>masif</i> pada kalimat (6) berlawanan makna dengan …",
    opsi: ["menyeluruh", "besar-besaran", "cepat", "kukuh", "sedikit demi sedikit"],
    kunci: "E",
    pembahasan:
      "<i>Masif</i> bermakna besar-besaran dan menyeluruh, jadi lawannya adalah perubahan yang berlangsung sedikit demi sedikit. Pilihan A dan B justru sinonimnya.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kata yang tepat untuk menggambarkan situasi dalam Teks 1 adalah …",
    opsi: ["optimistis", "problematis", "nostalgis", "humoris", "imajinatif"],
    kunci: "B",
    pembahasan:
      "Bacaan memaparkan berbagai persoalan yang belum terpecahkan: cuaca, mutu, dan modal. Nadanya bukan penuh harapan maupun kenangan, melainkan memaparkan masalah.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan:
      "Kelompok kata <i>petak-petak tambak</i> pada kalimat (2) memiliki pola makna yang sama dengan …",
    opsi: [
      "sangat bergantung (kalimat 3)",
      "terus meningkat (kalimat 6)",
      "lebih bersih (kalimat 10)",
      "dasar tambak (kalimat 10)",
      "belum terjangkau (kalimat 11)",
    ],
    kunci: "D",
    pembahasan:
      "<i>Petak-petak tambak</i> adalah frasa benda berpola diterangkan-menerangkan. Yang berpola sama hanya <i>dasar tambak</i>; empat pilihan lain berupa frasa kerja atau frasa sifat.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Gagasan pada kalimat (12) dapat diungkapkan kembali menjadi …",
    opsi: [
      "Petani bermodal kecil tidak berminat memperbaiki mutu garamnya.",
      "Perbaikan mutu garam sebaiknya ditunda sampai harga geomembran turun.",
      "Perbaikan mutu garam tidak akan merata bila tidak ada bantuan pembiayaan.",
      "Petani yang sudah mapan wajib membantu petani bermodal kecil.",
      "Bantuan pembiayaan hanya boleh diberikan kepada petani yang sudah mapan.",
    ],
    kunci: "C",
    pembahasan:
      "Kalimat (12) menyatakan syarat: tanpa pembiayaan, perbaikan mutu hanya sampai ke petani mapan. Itu sama artinya dengan perbaikan yang tidak merata.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kata <i>Namun</i> pada kalimat (11) berfungsi untuk …",
    opsi: [
      "mempertentangkan gagasan kalimat sebelumnya",
      "menambahkan gagasan kalimat sebelumnya",
      "menyimpulkan gagasan kalimat sebelumnya",
      "memberikan contoh gagasan kalimat sebelumnya",
      "menegaskan kembali gagasan kalimat sebelumnya",
    ],
    kunci: "A",
    pembahasan:
      "Kalimat (10) memaparkan keberhasilan geomembran, lalu kalimat (11) menghadirkan kendalanya. Hubungan seperti itu adalah pertentangan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan:
      "Apabila Teks 1 dipisahkan menjadi dua paragraf yang padu dan utuh, pengelompokan kalimatnya adalah …",
    opsi: [
      "(1-2) dan (3-4-5-6-7-8-9-10-11-12)",
      "(1-2-3) dan (4-5-6-7-8-9-10-11-12)",
      "(1-2-3-4) dan (5-6-7-8-9-10-11-12)",
      "(1-2-3-4-5-6) dan (7-8-9-10-11-12)",
      "(1-2-3-4-5) dan (6-7-8-9-10-11-12)",
    ],
    kunci: "E",
    pembahasan:
      "Kalimat (1) sampai (5) membicarakan cara produksi tradisional dan ketergantungannya pada cuaca. Kalimat (6) membuka pokok baru, yaitu tuntutan mutu industri, yang dibahas sampai kalimat (12).",
  },

  /* ---------------- Teks 2 ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Perincian pada kalimat (3) belum sejajar bentuknya. Perbaikan yang tepat adalah …",
    opsi: [
      "Pengemudi merangkap pustakawan, mendongeng, sekaligus mencatat peminjaman.",
      "Pengemudi merangkap pustakawan, pendongeng, sekaligus pencatat peminjaman.",
      "Pengemudi merangkap sebagai pustakawan, pendongeng, dan mencatat peminjaman.",
      "Pengemudi merangkap kepustakawanan, pendongengan, dan pencatatan peminjaman.",
      "Pengemudi menjadi pustakawan, pendongeng, sekaligus mencatat peminjaman.",
    ],
    kunci: "B",
    pembahasan:
      "Dua unsur pertama berupa kata benda pelaku (<i>pustakawan</i>, <i>pendongeng</i>), sedangkan unsur ketiga berupa kata kerja. Agar sejajar, unsur ketiga diubah menjadi <i>pencatat peminjaman</i>.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Penulisan kata bercetak tebal pada kalimat (6) seharusnya …",
    opsi: [
      "dibiarkan saja karena sudah benar",
      "diganti dengan <i>efektip</i>",
      "diganti dengan <i>epektif</i>",
      "diganti dengan <i>efektif</i>",
      "diganti dengan <i>keefektifan</i>",
    ],
    kunci: "D",
    pembahasan:
      "Bentuk bakunya <i>efektif</i>. Akhiran <i>-if</i> pada kata serapan tidak berubah menjadi <i>-iv</i> atau <i>-ip</i>.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan:
      "Frasa <i>membacakan cerita, permainan kata, hingga pelatihan menulis surat</i> pada kalimat (4) dapat diperbaiki menjadi …",
    opsi: [
      "membacakan cerita, bermain kata, hingga pelatihan menulis surat",
      "pembacaan cerita, bermain kata, hingga pelatihan menulis surat",
      "pembacaan cerita, permainan kata, hingga pelatihan menulis surat",
      "membacakan cerita, permainan kata, hingga melatih menulis surat",
      "pembacaan cerita, permainan kata, hingga menulis surat",
    ],
    kunci: "C",
    pembahasan:
      "Kata <i>meliputi</i> menuntut perincian berupa kata benda. Karena itu ketiganya diseragamkan menjadi <i>pembacaan</i>, <i>permainan</i>, dan <i>pelatihan</i>.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Kata <i>jembatan</i> pada kalimat (10) digunakan dalam makna …",
    opsi: ["sebenarnya", "meluas", "menyempit", "menyeluruh", "kiasan"],
    kunci: "E",
    pembahasan:
      "Perpustakaan keliling tentu bukan bangunan penyeberangan. Kata itu dipakai secara kias untuk menyebut penghubung sementara.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Kata yang cakupan maknanya lebih luas daripada kata <i>buku</i> adalah …",
    opsi: ["bacaan", "judul", "halaman", "cerita", "surat"],
    kunci: "A",
    pembahasan:
      "<i>Bacaan</i> mencakup buku, majalah, koran, dan bentuk lain. <i>Judul</i> dan <i>halaman</i> justru bagian dari buku, sedangkan <i>cerita</i> dan <i>surat</i> jenis tulisan tertentu.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Kalimat (9) dan kalimat (10) dijalin menjadi padu dengan cara …",
    opsi: [
      "mengulang kata yang sama persis",
      "menggunakan kata ganti <i>ia</i>",
      "menggunakan konjungsi antarkalimat",
      "menyebutkan angka yang sama",
      "menggunakan tanda baca titik dua",
    ],
    kunci: "B",
    pembahasan:
      "Kata <i>Ia</i> pada awal kalimat (10) menggantikan <i>perpustakaan keliling</i> yang disebut pada kalimat (9), sehingga keduanya terikat tanpa perlu pengulangan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Informasi yang TIDAK sesuai dengan Teks 2 adalah …",
    opsi: [
      "Perpustakaan keliling itu singgah di sepuluh desa setiap bulan",
      "Mobil yang dipakai membawa sekitar delapan ratus buku",
      "Jumlah buku belum sebanding dengan jumlah desa yang dilayani",
      "Setiap desa di Sumba Timur sudah memiliki ruang bacanya sendiri",
      "Anak-anak menunggu di tepi jalan sejak pagi",
    ],
    kunci: "D",
    pembahasan:
      "Kalimat (10) justru menyebut perpustakaan keliling sebagai jembatan <i>sampai</i> tiap desa memiliki ruang baca sendiri — artinya hal itu belum tercapai.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Simpulan yang paling tepat untuk Teks 2 adalah …",
    opsi: [
      "Perpustakaan keliling sebaiknya dihentikan karena bukunya kurang",
      "Minat baca anak Sumba Timur kini setara dengan kota besar",
      "Pengemudi perpustakaan keliling perlu diganti pustakawan tetap",
      "Buku yang diperebutkan menandakan mutu bukunya rendah",
      "Perpustakaan keliling menumbuhkan minat baca, tetapi belum menjawab kebutuhan jangka panjang",
    ],
    kunci: "E",
    pembahasan:
      "Kalimat (5) dan (6) menunjukkan keberhasilannya, sedangkan kalimat (7) sampai (10) menunjukkan batasnya. Simpulan yang utuh harus memuat keduanya.",
  },

  /* ---------------- Pilihan ganda kompleks (Benar/Salah) ---------------- */
  {
    tipe: "PGK",
    stimulus: TEKS_1,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 1.",
    opsi: [
      "Air laut dijemur di petak tambak lebih dahulu sebelum garam dipanen.",
      "Industri menuntut kadar natrium klorida di atas 97 persen.",
      "Menurut bacaan, harga geomembran sudah terjangkau bagi seluruh petani.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Dua pernyataan pertama sesuai kalimat (2) dan (7). Kalimat (11) justru menyatakan harga geomembran belum terjangkau bagi petani bermodal kecil.",
  },
  {
    tipe: "PGK",
    stimulus: TEKS_2,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 2.",
    opsi: [
      "Perpustakaan keliling itu singgah di sepuluh desa setiap bulan.",
      "Kalimat (3) memuat perincian yang bentuknya belum sejajar.",
      "Bacaan menyatakan perpustakaan keliling sudah menggantikan perpustakaan desa.",
      "Kalimat (7) menyatakan hubungan pertentangan dengan kalimat sebelumnya.",
    ],
    kunci: ["B", "B", "S", "B"],
    pembahasan:
      "Kalimat (9) menegaskan perpustakaan keliling <i>bukan</i> pengganti perpustakaan desa, sehingga pernyataan ketiga salah. Kata <i>meskipun demikian</i> pada kalimat (7) memang penanda pertentangan.",
  },
  {
    tipe: "PGK",
    stimulus:
      "Perhatikan kalimat berikut.<br><i>“Berdasarkan hasil rapat tersebut memutuskan bahwa kegiatan akan diundur.”</i>",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Kalimat tersebut tidak memiliki subjek yang jelas.",
      "Kata <i>berdasarkan</i> membuat bagian awal kalimat menjadi keterangan, bukan subjek.",
      "Perbaikannya adalah “Hasil rapat tersebut memutuskan bahwa kegiatan akan diundur.”",
      "Kalimat tersebut sudah efektif karena maknanya dapat dipahami.",
    ],
    kunci: ["B", "B", "B", "S"],
    pembahasan:
      "Kata depan di awal kalimat menjadikan unsur sesudahnya keterangan, sehingga kalimat kehilangan subjek. Membuang kata <i>berdasarkan</i> memulihkan subjeknya. Dapat dipahami tidak sama dengan efektif.",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    stimulus: TEKS_2,
    pertanyaan:
      "Penulisan kata yang tidak baku pada Teks 2 terdapat pada kalimat nomor … (tulislah jawaban dengan angka)",
    kunci: "6",
    pembahasan:
      "Kalimat (6) memuat kata <i>efektiv</i> yang seharusnya ditulis <i>efektif</i>.",
  },
];
