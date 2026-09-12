/**
 * Warung Soal — PPU (Pengetahuan dan Pemahaman Umum) Paket 1, kategori Easy.
 *
 * 20 butir: 16 pilihan ganda, 3 pilihan ganda kompleks, 1 isian singkat.
 *
 * Modelnya mengikuti naskah Tryout Prosus Inten: SELURUH butir bertumpu pada
 * bacaan bernomor kalimat, dan yang diuji kebahasaan — kalimat tidak logis,
 * makna kata dalam konteks, hipernim, kesejajaran bentuk, dan pemisahan
 * paragraf. PPU di sini BUKAN soal hafalan pengetahuan umum. Karena jenjang
 * Easy, bacaannya pendek dan kesalahannya dibuat kentara.
 */

const TEKS_1 = `<p><b>Teks 1</b></p><p><sup>1</sup>Kopi Gayo tumbuh di dataran tinggi Aceh Tengah pada ketinggian di atas 1.200 meter. <sup>2</sup>Udara yang sejuk membuat biji kopi matang lebih lambat sehingga rasanya lebih pekat. <sup>3</sup>Petani memanen buah kopi satu per satu, hanya yang sudah berwarna merah. <sup>4</sup>Cara memetik seperti itu memang lambat, tetapi menjaga mutu biji tetap seragam. <sup>5</sup>Harga kopi Gayo yang tinggi bersumber dari cara panen yang teliti itu. <sup>6</sup>Sayangnya, sebagian petani mulai memetik seluruh buah sekaligus agar pekerjaan cepat selesai. <sup>7</sup>Cara cepat itu justru membuat mutu biji makin seragam. <sup>8</sup>Pembeli dari luar negeri lalu menawar dengan harga yang lebih rendah. <sup>9</sup>Koperasi petani kini mengadakan pelatihan pemetikan bagi anggota mudanya. <sup>10</sup>Mereka berharap kebiasaan lama tetap terjaga di tangan generasi berikutnya.</p>`;

const TEKS_2 = `<p><b>Teks 2</b></p><p><sup>1</sup>Sanggar tari di kampung kami berlatih setiap Rabu sore di halaman balai desa. <sup>2</sup>Anggotanya anak sekolah dasar sampai siswa SMA. <sup>3</sup>Pelatihnya seorang ibu yang dulu penari, kini penjahit, sekaligus mengurus jadwal latihan. <sup>4</sup>Kegiatannya mencakup pemanasan, latihan gerak dasar, hingga menampilkan tarian utuh. <sup>5</sup>Alat musiknya seadanya: satu gendang dan sebuah pengeras suara pinjaman. <sup>6</sup>Meskipun sederhana, sanggar itu sudah beberapa kali tampil di acara tingkat <b>propinsi</b>. <sup>7</sup>Namun, jumlah pelatih belum sebanding dengan jumlah anggota yang terus bertambah. <sup>8</sup>Ibu itu sering melatih dua kelompok sekaligus dalam satu sore. <sup>9</sup>Sanggar ini memang bukan sekolah tari. <sup>10</sup>Ia hanya pintu pertama bagi anak kampung yang ingin mengenal tarian daerahnya.</p>`;

export const SOAL = [
  /* ---------------- Teks 1 ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kalimat yang tidak logis dalam Teks 1 adalah …",
    opsi: ["Kalimat (4)", "Kalimat (7)", "Kalimat (8)", "Kalimat (9)", "Kalimat (10)"],
    kunci: "B",
    pembahasan:
      "Kalimat (4) menyatakan justru cara lambat yang menjaga keseragaman mutu, dan kalimat (8) menunjukkan harganya turun. Karena itu kalimat (7) yang menyebut cara cepat membuat mutu <i>makin seragam</i> bertentangan dengan sekitarnya.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kata <i>bersumber</i> pada kalimat (5) paling dekat maknanya dengan …",
    opsi: ["berakhir", "bercampur", "bertumpuk", "berasal", "berhenti"],
    kunci: "D",
    pembahasan:
      "<i>Bersumber dari</i> menunjuk asal atau pangkal sesuatu, jadi padanannya <i>berasal</i>. Pilihan lain menunjuk akhir, percampuran, atau tumpukan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kata <i>seragam</i> pada kalimat (4) berlawanan makna dengan …",
    opsi: ["beragam", "serupa", "sepadan", "sejenis", "setara"],
    kunci: "A",
    pembahasan:
      "<i>Seragam</i> berarti sama satu sama lain, sehingga lawannya <i>beragam</i>. Empat pilihan lain justru bermakna sejalan dengan <i>seragam</i>.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Sikap koperasi petani dalam Teks 1 dapat digambarkan sebagai …",
    opsi: [
      "menyerah pada perubahan zaman",
      "menyalahkan pembeli dari luar negeri",
      "menunggu bantuan dari pemerintah",
      "menolak melatih petani yang masih muda",
      "berusaha menjaga kebiasaan lama lewat pelatihan",
    ],
    kunci: "E",
    pembahasan:
      "Kalimat (9) dan (10) menunjukkan koperasi mengambil langkah nyata berupa pelatihan, bukan menyerah maupun menyalahkan pihak lain.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan:
      "Kelompok kata <i>buah kopi</i> pada kalimat (3) memiliki pola makna yang sama dengan …",
    opsi: [
      "lebih lambat (kalimat 2)",
      "satu per satu (kalimat 3)",
      "koperasi petani (kalimat 9)",
      "makin seragam (kalimat 7)",
      "lebih rendah (kalimat 8)",
    ],
    kunci: "C",
    pembahasan:
      "<i>Buah kopi</i> adalah frasa benda berpola diterangkan-menerangkan, sama seperti <i>koperasi petani</i>. Pilihan lain berupa frasa sifat atau frasa keterangan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Gagasan pada kalimat (10) dapat diungkapkan kembali menjadi …",
    opsi: [
      "Petani muda menolak melanjutkan kebiasaan lama.",
      "Koperasi berharap petani muda meneruskan cara panen yang teliti.",
      "Kebiasaan lama sebaiknya ditinggalkan agar panen lebih cepat.",
      "Generasi berikutnya yang akan menentukan harga kopi Gayo.",
      "Pelatihan pemetikan wajib diikuti seluruh warga desa.",
    ],
    kunci: "B",
    pembahasan:
      "“Kebiasaan lama tetap terjaga di tangan generasi berikutnya” berarti petani muda meneruskan cara panen teliti yang dibahas kalimat (3) dan (4).",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kata <i>Sayangnya</i> pada kalimat (6) berfungsi untuk …",
    opsi: [
      "menambahkan gagasan kalimat sebelumnya",
      "menyimpulkan gagasan kalimat sebelumnya",
      "memberikan contoh gagasan kalimat sebelumnya",
      "mempertentangkan gagasan kalimat sebelumnya",
      "menegaskan kembali gagasan kalimat sebelumnya",
    ],
    kunci: "D",
    pembahasan:
      "Kalimat (5) memaparkan keunggulan yang membuat harga tinggi, lalu kalimat (6) menghadirkan kebiasaan yang merusaknya. Hubungan seperti itu pertentangan.",
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
      "(1-2-3-4-5-6) dan (7-8-9-10)",
      "(1-2-3-4-5-6-7) dan (8-9-10)",
    ],
    kunci: "A",
    pembahasan:
      "Kalimat (1) sampai (5) membahas keunggulan kopi Gayo dan cara panennya. Kata <i>sayangnya</i> pada kalimat (6) membuka pokok baru, yaitu masalah dan upaya mengatasinya.",
  },

  /* ---------------- Teks 2 ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Perincian pada kalimat (3) belum sejajar bentuknya. Perbaikan yang tepat adalah …",
    opsi: [
      "Pelatihnya seorang ibu yang dulu menari, kini menjahit, sekaligus mengurus jadwal latihan.",
      "Pelatihnya seorang ibu yang dulu penari, kini menjahit, sekaligus pengurus jadwal latihan.",
      "Pelatihnya seorang ibu yang dulu penari, kini penjahit, dan mengurus jadwal latihan.",
      "Pelatihnya seorang ibu bekas penari, penjahit, sekaligus mengurus jadwal latihan.",
      "Pelatihnya seorang ibu yang dulu penari, kini penjahit, sekaligus pengurus jadwal latihan.",
    ],
    kunci: "E",
    pembahasan:
      "Dua unsur pertama berupa kata benda pelaku (<i>penari</i>, <i>penjahit</i>), sedangkan unsur ketiga berupa kata kerja. Agar sejajar, unsur ketiga diubah menjadi <i>pengurus jadwal latihan</i>.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Penulisan kata bercetak tebal pada kalimat (6) seharusnya …",
    opsi: [
      "dibiarkan saja karena sudah benar",
      "diganti dengan <i>propinsi-propinsi</i>",
      "diganti dengan <i>provinsi</i>",
      "diganti dengan <i>keprovinsian</i>",
      "diganti dengan <i>propvinsi</i>",
    ],
    kunci: "C",
    pembahasan:
      "Bentuk bakunya <i>provinsi</i>. Ejaan <i>propinsi</i> masih sering dipakai sehari-hari, tetapi tidak baku.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan:
      "Frasa <i>pemanasan, latihan gerak dasar, hingga menampilkan tarian utuh</i> pada kalimat (4) dapat diperbaiki menjadi …",
    opsi: [
      "memanaskan, latihan gerak dasar, hingga menampilkan tarian utuh",
      "pemanasan, latihan gerak dasar, hingga penampilan tarian utuh",
      "pemanasan, melatih gerak dasar, hingga penampilan tarian utuh",
      "memanaskan, melatih gerak dasar, hingga tarian utuh",
      "pemanasan, latihan gerak dasar, hingga tampil tarian utuh",
    ],
    kunci: "B",
    pembahasan:
      "Kata <i>mencakup</i> menuntut perincian berupa kata benda. Dua unsur pertama sudah benda, jadi unsur ketiga diseragamkan menjadi <i>penampilan tarian utuh</i>.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Kata yang cakupan maknanya lebih luas daripada kata <i>gendang</i> adalah …",
    opsi: ["tabuh", "kulit", "irama", "tarian", "alat musik"],
    kunci: "E",
    pembahasan:
      "<i>Alat musik</i> mencakup gendang, suling, gitar, dan lainnya. <i>Tabuh</i> dan <i>kulit</i> justru bagian atau cara memainkannya.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Informasi yang TIDAK sesuai dengan Teks 2 adalah …",
    opsi: [
      "Sanggar tari itu memiliki pelatih lebih dari satu orang",
      "Latihan diadakan setiap Rabu sore di halaman balai desa",
      "Anggotanya mulai dari anak sekolah dasar sampai siswa SMA",
      "Alat musik yang dipakai hanya gendang dan pengeras suara pinjaman",
      "Sanggar itu pernah tampil di acara tingkat provinsi",
    ],
    kunci: "A",
    pembahasan:
      "Kalimat (3) menyebut seorang ibu sebagai pelatih, dan kalimat (7) serta (8) menegaskan pelatihnya memang kurang. Jadi pernyataan A bertentangan dengan bacaan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Makna kata <i>seadanya</i> pada kalimat (5) adalah …",
    opsi: [
      "berlebihan jumlahnya",
      "sengaja dibuat sederhana",
      "sekadar yang tersedia",
      "dipinjam dari desa sebelah",
      "baru dibeli pada tahun lalu",
    ],
    kunci: "C",
    pembahasan:
      "<i>Seadanya</i> berarti hanya sebatas yang ada, tanpa memilih atau melengkapi. Titik dua sesudahnya memerinci apa saja yang tersedia.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Kalimat (8) pada Teks 2 menunjukkan bahwa …",
    opsi: [
      "anggota sanggar berlatih dua kali dalam sepekan",
      "pelatih membagi anggotanya menjadi dua sanggar",
      "latihan sanggar berlangsung sampai malam hari",
      "pelatihnya bekerja melampaui kemampuan seorang diri",
      "kelompok kedua berlatih tanpa didampingi pelatih",
    ],
    kunci: "D",
    pembahasan:
      "Melatih dua kelompok sekaligus dalam satu sore adalah bukti kekurangan pelatih yang disebut kalimat (7), bukan penambahan jadwal maupun pembagian sanggar.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Simpulan yang paling tepat untuk Teks 2 adalah …",
    opsi: [
      "Sanggar tari itu sebaiknya dibubarkan karena kekurangan pelatih",
      "Anak kampung lebih baik belajar di sekolah tari yang sesungguhnya",
      "Alat musik sanggar perlu segera diganti dengan yang baru",
      "Sanggar itu sudah setara dengan sekolah tari di kota",
      "Sanggar itu berperan sebagai pengenalan awal meskipun keadaannya terbatas",
    ],
    kunci: "E",
    pembahasan:
      "Kalimat (9) dan (10) menegaskan sanggar itu bukan sekolah tari, melainkan pintu pertama. Simpulan yang utuh memuat keterbatasan sekaligus perannya.",
  },

  /* ---------------- Pilihan ganda kompleks (Benar/Salah) ---------------- */
  {
    tipe: "PGK",
    stimulus: TEKS_1,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 1.",
    opsi: [
      "Kopi Gayo tumbuh di dataran tinggi pada ketinggian di atas 1.200 meter.",
      "Menurut bacaan, memetik seluruh buah sekaligus membuat mutu biji menjadi lebih baik.",
      "Koperasi petani mengadakan pelatihan pemetikan bagi anggota mudanya.",
    ],
    kunci: ["B", "S", "B"],
    pembahasan:
      "Pernyataan pertama dan ketiga sesuai kalimat (1) dan (9). Kalimat (8) justru menunjukkan cara cepat itu membuat harga ditawar lebih rendah.",
  },
  {
    tipe: "PGK",
    stimulus: TEKS_2,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 2.",
    opsi: [
      "Latihan sanggar diadakan setiap Rabu sore.",
      "Kalimat (3) memuat perincian yang bentuknya belum sejajar.",
      "Bacaan menyatakan sanggar itu memiliki banyak pelatih.",
      "Kalimat (7) menyatakan hubungan pertentangan dengan kalimat sebelumnya.",
    ],
    kunci: ["B", "B", "S", "B"],
    pembahasan:
      "Kalimat (7) justru menyebut jumlah pelatih belum sebanding dengan anggotanya, sehingga pernyataan ketiga salah. Kata <i>namun</i> memang penanda pertentangan.",
  },
  {
    tipe: "PGK",
    stimulus:
      "Perhatikan kalimat berikut.<br><i>“Anak itu membeli buku, pensil, dan penggaris di toko yang berada di seberang sekolah.”</i>",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Kalimat tersebut memuat perincian yang terdiri atas tiga unsur.",
      "Tanda koma sebelum kata <i>dan</i> pada perincian itu sudah tepat.",
      "Kelompok kata <i>di seberang sekolah</i> berfungsi sebagai keterangan tempat.",
      "Kalimat tersebut tidak memiliki objek.",
    ],
    kunci: ["B", "B", "B", "S"],
    pembahasan:
      "Perinciannya <i>buku</i>, <i>pensil</i>, dan <i>penggaris</i> — sekaligus menjadi objek kalimat, sehingga pernyataan terakhir salah. Perincian tiga unsur memang memakai koma sebelum <i>dan</i>.",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    stimulus: TEKS_2,
    pertanyaan: "Tuliskan bentuk baku dari kata <b>propinsi</b>. (tulis satu kata)",
    kunci: "provinsi",
    pembahasan:
      "Bentuk bakunya <i>provinsi</i>, sebagaimana pada <i>pemerintah provinsi</i> dan <i>ibu kota provinsi</i>.",
  },
];
