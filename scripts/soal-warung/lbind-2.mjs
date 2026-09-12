/**
 * Warung Soal — LIT. Bahasa Indonesia (LBIND) Paket 2, kategori Easy.
 *
 * 30 butir: 26 pilihan ganda, 3 pilihan ganda kompleks, 1 isian singkat.
 * Seluruh bacaan ditulis sendiri untuk keperluan latihan.
 */

const TEKS_1 = `<p><b>Teks 1</b></p><p>(1) Di sebuah kampung padat di pinggir kota, warga membuka bank sampah pada 2019. (2) Sampah plastik, kertas, dan logam yang dahulu dibuang begitu saja kini ditimbang dan dicatat dalam buku tabungan. (3) Setiap kilogram dihargai sesuai jenisnya, dan hasilnya dapat diambil menjelang tahun ajaran baru. (4) Dalam tiga tahun, sampah yang diangkut ke tempat pembuangan akhir dari kampung itu turun hampir separuh. (5) Namun, pengurus bank sampah mengakui gerakan ini rapuh. (6) Harga plastik daur ulang naik turun mengikuti pasar sehingga penghasilan warga tidak menentu. (7) Ketika harga jatuh pada 2022, jumlah penyetor menyusut tinggal sepertiga. (8) Pengurus lalu mengubah siasat: menabung tidak lagi hanya dihargai uang, tetapi juga poin yang dapat ditukar dengan bahan pangan. (9) Cara itu membuat warga bertahan meskipun harga sedang buruk. (10) Bagi pengurus, pelajaran terpentingnya sederhana — kebiasaan baik perlu ditopang alasan yang tidak mudah goyah.</p>`;

const TEKS_2 = `<p><b>Teks 2</b></p><p>(1) Bapak menyimpan sepeda tuanya di sudut gudang, ditutup terpal biru yang sudah menipis. (2) Setiap Minggu ia membukanya, mengelap rantainya, lalu menutupnya kembali tanpa sekali pun menaikinya. (3) “Ban belakangnya bocor,” katanya, setiap kali aku bertanya. (4) Ban itu sudah bocor sejak aku duduk di kelas dua SMP, dan kini aku sudah bekerja. (5) Suatu sore aku pulang membawa ban baru. (6) Bapak memandanginya lama, lalu tersenyum sedikit dan mengucapkan terima kasih. (7) Malamnya, dari jendela kamar, aku melihat ia duduk di samping sepeda itu — tidak memasang ban, hanya duduk. (8) Baru kemudian aku mengerti: yang ia rawat setiap Minggu bukan sepedanya.</p>`;

const TEKS_3 = `<p><b>Teks 3</b></p><p>(1) Sebuah sekolah mendata kegiatan yang paling sering dipilih siswa untuk mengisi waktu luang selama satu pekan. (2) Hasilnya dirangkum dalam tabel berikut.</p><table><tr><th>Kegiatan</th><th>Kelas X</th><th>Kelas XI</th><th>Kelas XII</th></tr><tr><td>Membaca buku</td><td>18</td><td>15</td><td>12</td></tr><tr><td>Olahraga</td><td>30</td><td>28</td><td>20</td></tr><tr><td>Bermain gawai</td><td>45</td><td>50</td><td>55</td></tr><tr><td>Membantu orang tua</td><td>27</td><td>22</td><td>18</td></tr></table><p>(3) Guru bimbingan dan konseling menilai angka bermain gawai yang meningkat dari kelas X ke kelas XII perlu diperhatikan. (4) Namun, ia mengingatkan bahwa data tersebut hanya menunjukkan kegiatan yang paling sering dipilih, bukan lamanya waktu yang dihabiskan. (5) Karena itu, sekolah berencana melakukan pendataan lanjutan mengenai durasi tiap kegiatan.</p>`;

export const SOAL = [
  /* ---------------- Teks 1 ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Gagasan utama Teks 1 adalah …",
    opsi: [
      "Cara menghitung harga sampah plastik daur ulang",
      "Bank sampah warga bertahan setelah cara penghargaannya diubah",
      "Sampah kampung turun hampir separuh dalam tiga tahun",
      "Harga plastik daur ulang selalu naik setiap tahun",
      "Warga kampung menolak membuang sampah ke tempat pembuangan akhir",
    ],
    kunci: "B",
    pembahasan:
      "Teks bergerak dari keberhasilan bank sampah, lalu masalah harga, dan berakhir pada perubahan siasat yang membuatnya bertahan. Pilihan lain hanya mengambil satu rincian.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Masalah utama yang dihadapi bank sampah menurut Teks 1 adalah …",
    opsi: [
      "Warga tidak mau memilah sampah",
      "Buku tabungan warga sering hilang",
      "Tempat pembuangan akhir menolak sampah kampung",
      "Harga sampah daur ulang yang tidak menentu",
      "Pengurus bank sampah mengundurkan diri",
    ],
    kunci: "D",
    pembahasan:
      "Kalimat (6) menyebut harga plastik daur ulang naik turun mengikuti pasar, dan kalimat (7) menunjukkan akibatnya pada jumlah penyetor.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kalimat (7) pada Teks 1 berfungsi untuk …",
    opsi: [
      "Menunjukkan bukti nyata dari masalah yang disebut kalimat (6)",
      "Menyimpulkan seluruh isi bacaan",
      "Mengajukan usul perbaikan bagi pengurus",
      "Memperkenalkan tokoh baru dalam bacaan",
      "Membantah pernyataan pada kalimat (4)",
    ],
    kunci: "A",
    pembahasan:
      "Kalimat (6) menyebut penghasilan tidak menentu, lalu kalimat (7) memberi buktinya berupa jumlah penyetor yang menyusut pada 2022.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Makna kata <i>rapuh</i> pada kalimat (5) adalah …",
    opsi: [
      "mudah rusak dimakan usia",
      "tidak dikenal orang banyak",
      "sulit dijalankan sejak awal",
      "kekurangan tenaga pengurus",
      "mudah goyah dan tidak kukuh",
    ],
    kunci: "E",
    pembahasan:
      "Konteksnya gerakan yang bisa runtuh begitu harga jatuh, jadi <i>rapuh</i> di sini bermakna mudah goyah, bukan rusak karena usia.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Simpulan yang tepat berdasarkan Teks 1 adalah …",
    opsi: [
      "Bank sampah kampung itu gagal karena harga plastik jatuh",
      "Warga hanya mau menabung sampah bila diberi uang",
      "Kebiasaan baik lebih bertahan bila tidak hanya bergantung pada harga pasar",
      "Poin bahan pangan selalu lebih menguntungkan daripada uang tunai",
      "Sampah di kampung itu sudah habis sama sekali",
    ],
    kunci: "C",
    pembahasan:
      "Kalimat (8) sampai (10) menunjukkan gerakan itu bertahan justru setelah alasannya tidak lagi bertumpu pada harga pasar semata.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Berdasarkan Teks 1, jumlah penyetor pada tahun 2022 …",
    opsi: [
      "bertambah dua kali lipat",
      "menyusut tinggal sepertiga",
      "tetap seperti tahun sebelumnya",
      "menyusut tinggal separuh",
      "tidak dapat diketahui dari bacaan",
    ],
    kunci: "B",
    pembahasan: "Kalimat (7) menyebutkannya secara langsung: penyetor menyusut tinggal sepertiga.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Hubungan antara kalimat (8) dan kalimat (9) pada Teks 1 adalah …",
    opsi: [
      "pertentangan",
      "perbandingan",
      "pilihan",
      "tindakan dan hasilnya",
      "penambahan contoh",
    ],
    kunci: "D",
    pembahasan:
      "Kalimat (8) memuat tindakan pengurus mengubah siasat, sedangkan kalimat (9) memuat hasilnya, yaitu warga bertahan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Pernyataan yang TIDAK sesuai dengan Teks 1 adalah …",
    opsi: [
      "Bank sampah kampung itu dibuka oleh pemerintah kota",
      "Sampah ditimbang lalu dicatat dalam buku tabungan",
      "Hasil tabungan dapat diambil menjelang tahun ajaran baru",
      "Sampah yang diangkut ke tempat pembuangan akhir turun hampir separuh",
      "Poin tabungan dapat ditukar dengan bahan pangan",
    ],
    kunci: "A",
    pembahasan:
      "Kalimat (1) menyebut <i>warga</i> yang membuka bank sampah, bukan pemerintah kota. Empat pilihan lain tertulis pada kalimat (2), (3), (4), dan (8).",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Sikap pengurus bank sampah dalam Teks 1 dapat digambarkan sebagai …",
    opsi: [
      "putus asa menghadapi perubahan harga",
      "menyalahkan warga yang berhenti menabung",
      "menunggu bantuan dari pemerintah",
      "menolak mengubah aturan yang sudah ada",
      "lentur dalam mencari jalan keluar",
    ],
    kunci: "E",
    pembahasan:
      "Alih-alih menyerah, pengurus mengubah cara penghargaan menjadi poin bahan pangan. Itu menunjukkan kelenturan dalam mencari jalan keluar.",
  },

  /* ---------------- Teks 2 ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Amanat yang paling tepat dari Teks 2 adalah …",
    opsi: [
      "Sepeda tua sebaiknya segera diperbaiki agar dapat dipakai",
      "Seorang anak wajib membelikan barang untuk orang tuanya",
      "Ada benda yang dirawat bukan karena gunanya, melainkan karena kenangannya",
      "Orang tua sering menolak bantuan dari anaknya",
      "Menyimpan barang rusak hanya menghabiskan tempat",
    ],
    kunci: "C",
    pembahasan:
      "Kalimat (8) menegaskan bahwa yang dirawat bapak bukan sepedanya, melainkan kenangan yang melekat padanya.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Watak tokoh Bapak dalam Teks 2 adalah …",
    opsi: [
      "keras kepala dan mudah marah",
      "setia pada kenangan dan tidak banyak bicara",
      "boros dan gemar mengumpulkan barang",
      "penakut dan mudah menyerah",
      "peramah kepada semua tetangga",
    ],
    kunci: "B",
    pembahasan:
      "Bapak merawat sepeda setiap Minggu bertahun-tahun, tetapi menjawab pertanyaan anaknya dengan satu kalimat pendek yang selalu sama.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Latar waktu yang tergambar pada kalimat (7) Teks 2 adalah …",
    opsi: ["pagi hari", "siang hari", "sore hari", "malam hari", "dini hari"],
    kunci: "D",
    pembahasan:
      "Kalimat itu dibuka kata <i>malamnya</i>, sedangkan sore hari adalah latar kalimat (5).",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Kalimat (8) Teks 2 menunjukkan bahwa tokoh <i>aku</i> …",
    opsi: [
      "akhirnya memahami makna kebiasaan bapaknya",
      "marah karena ban baru tidak juga dipasang",
      "menyesal telah membeli ban baru",
      "berencana menjual sepeda tua itu",
      "tidak peduli pada sepeda tua bapaknya",
    ],
    kunci: "A",
    pembahasan:
      "Kata <i>baru kemudian aku mengerti</i> menandai pemahaman yang datang belakangan, bukan kemarahan atau penyesalan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan:
      "Alasan Bapak selalu menjawab “Ban belakangnya bocor” kemungkinan besar adalah …",
    opsi: [
      "ia tidak tahu cara memperbaiki ban sepeda",
      "ia menunggu anaknya membelikan ban baru",
      "ia berniat menjual sepeda itu diam-diam",
      "ia lupa bahwa ban itu sudah lama bocor",
      "ia memerlukan alasan agar tidak perlu menjelaskan perasaannya",
    ],
    kunci: "E",
    pembahasan:
      "Ketika ban baru akhirnya tersedia, Bapak justru tidak memasangnya. Jadi ban bocor hanyalah alasan yang mudah diucapkan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Sudut pandang yang digunakan pengarang pada Teks 2 adalah …",
    opsi: [
      "orang ketiga serbatahu",
      "orang ketiga pengamat",
      "orang pertama pelaku sampingan",
      "orang kedua",
      "campuran orang pertama dan ketiga",
    ],
    kunci: "C",
    pembahasan:
      "Pencerita memakai kata ganti <i>aku</i>, tetapi tokoh utama yang disorot adalah Bapak. Karena itu ia pelaku sampingan, bukan pelaku utama.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Konflik yang menonjol pada Teks 2 tergolong konflik …",
    opsi: [
      "fisik antartokoh",
      "batin dalam diri tokoh",
      "antara tokoh dan alam",
      "antara tokoh dan masyarakat",
      "antara dua kelompok",
    ],
    kunci: "B",
    pembahasan:
      "Tidak ada pertengkaran dalam kutipan itu. Yang bergolak adalah perasaan Bapak terhadap kenangannya, dan kebingungan tokoh <i>aku</i> memahaminya.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan:
      "Penyebutan “terpal biru yang sudah menipis” pada kalimat (1) menyiratkan bahwa …",
    opsi: [
      "Bapak tidak memiliki uang untuk membeli terpal baru",
      "gudang itu jarang sekali dikunjungi orang",
      "sepeda itu sering dipakai berkeliling kampung",
      "sepeda itu sudah sangat lama disimpan",
      "terpal tersebut pemberian seorang tetangga",
    ],
    kunci: "D",
    pembahasan:
      "Terpal menipis karena dibuka dan ditutup berulang kali selama bertahun-tahun — penanda waktu, bukan penanda kemiskinan.",
  },

  /* ---------------- Teks 3 ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Berdasarkan tabel, kegiatan yang paling banyak dipilih siswa kelas XII adalah …",
    opsi: [
      "bermain gawai",
      "olahraga",
      "membaca buku",
      "membantu orang tua",
      "membaca buku dan olahraga sama banyak",
    ],
    kunci: "A",
    pembahasan: "Kolom kelas XII menunjukkan bermain gawai 55 siswa, jauh di atas kegiatan lain.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan:
      "Selisih banyak siswa yang memilih membaca buku antara kelas X dan kelas XII adalah …",
    opsi: ["2 siswa", "3 siswa", "4 siswa", "5 siswa", "6 siswa"],
    kunci: "E",
    pembahasan: "Kelas X 18 siswa dan kelas XII 12 siswa, sehingga selisihnya 18 − 12 = 6 siswa.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Kecenderungan yang tampak dari tabel tersebut adalah …",
    opsi: [
      "Siswa yang berolahraga bertambah dari kelas X ke kelas XII",
      "Siswa yang membaca buku bertambah dari kelas X ke kelas XII",
      "Siswa yang bermain gawai bertambah, sedangkan yang membaca buku berkurang",
      "Semua kegiatan mengalami penurunan dari kelas X ke kelas XII",
      "Membantu orang tua paling banyak dipilih di semua tingkat kelas",
    ],
    kunci: "C",
    pembahasan:
      "Bermain gawai naik 45 → 50 → 55, sedangkan membaca buku turun 18 → 15 → 12. Bermain gawai justru naik, sehingga pilihan D salah.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Berdasarkan kalimat (4), keterbatasan data pada tabel tersebut adalah …",
    opsi: [
      "jumlah siswa yang didata terlalu sedikit",
      "data tidak menunjukkan lamanya waktu tiap kegiatan",
      "data hanya diambil dari satu tingkat kelas",
      "data dikumpulkan selama satu bulan penuh",
      "data tidak mencantumkan jenis kelamin siswa",
    ],
    kunci: "B",
    pembahasan:
      "Guru BK mengingatkan bahwa tabel hanya memuat kegiatan yang paling sering dipilih, bukan durasinya.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan:
      "Jumlah siswa kelas XI yang memilih olahraga dan membantu orang tua adalah …",
    opsi: ["42 siswa", "45 siswa", "48 siswa", "50 siswa", "52 siswa"],
    kunci: "D",
    pembahasan: "Olahraga 28 siswa dan membantu orang tua 22 siswa, sehingga jumlahnya 50 siswa.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Tindak lanjut yang direncanakan sekolah menurut Teks 3 adalah …",
    opsi: [
      "melarang siswa membawa gawai ke sekolah",
      "menambah jam pelajaran olahraga",
      "melakukan pendataan lanjutan mengenai durasi kegiatan",
      "mewajibkan siswa membaca satu buku setiap pekan",
      "memanggil orang tua siswa kelas XII",
    ],
    kunci: "C",
    pembahasan: "Rencana itu tertulis jelas pada kalimat (5).",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Pernyataan yang TIDAK dapat dibuktikan dengan tabel tersebut adalah …",
    opsi: [
      "Kelas XII paling banyak memilih bermain gawai",
      "Kelas X paling banyak membaca buku dibandingkan kelas lain",
      "Olahraga lebih banyak dipilih kelas X daripada kelas XII",
      "Membaca buku paling sedikit dipilih siswa kelas XII",
      "Siswa kelas XII bermain gawai lebih lama daripada siswa kelas X",
    ],
    kunci: "E",
    pembahasan:
      "Tabel hanya mencatat banyaknya pemilih, bukan lamanya waktu. Empat pernyataan lain dapat dibaca langsung dari angkanya.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Kalimat (3) pada Teks 3 berisi …",
    opsi: [
      "fakta hasil pendataan sekolah",
      "rangkuman seluruh isi tabel",
      "pendapat guru bimbingan dan konseling",
      "saran yang diajukan orang tua siswa",
      "simpulan akhir dari bacaan",
    ],
    kunci: "C",
    pembahasan:
      "Kata <i>menilai</i> menandai penilaian pribadi, jadi kalimat itu berisi pendapat, bukan fakta.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Simpulan yang paling tepat untuk Teks 3 adalah …",
    opsi: [
      "Data itu menunjukkan kecenderungan yang masih perlu ditelusuri lebih lanjut",
      "Siswa kelas XII lebih malas daripada siswa kelas X",
      "Sekolah akan melarang penggunaan gawai di lingkungan sekolah",
      "Membaca buku sudah tidak diminati sama sekali",
      "Olahraga adalah kegiatan kegemaran seluruh siswa",
    ],
    kunci: "A",
    pembahasan:
      "Kalimat (4) dan (5) menegaskan data itu belum lengkap sehingga sekolah merencanakan pendataan lanjutan. Pilihan lain melampaui apa yang ditunjukkan tabel.",
  },

  /* ---------------- Pilihan ganda kompleks (Benar/Salah) ---------------- */
  {
    tipe: "PGK",
    stimulus: TEKS_1,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 1.",
    opsi: [
      "Bank sampah kampung tersebut mulai berjalan pada tahun 2019.",
      "Sampah yang diangkut ke tempat pembuangan akhir turun hampir separuh dalam tiga tahun.",
      "Jumlah penyetor tetap stabil ketika harga plastik daur ulang jatuh.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Dua pernyataan pertama tertulis pada kalimat (1) dan (4). Pernyataan ketiga bertentangan dengan kalimat (7) yang menyebut penyetor menyusut tinggal sepertiga.",
  },
  {
    tipe: "PGK",
    stimulus: TEKS_2,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 2.",
    opsi: [
      "Tokoh <i>aku</i> masih duduk di bangku SMP ketika ban sepeda itu mulai bocor.",
      "Bapak langsung memasang ban baru pada malam itu juga.",
      "Kutipan tersebut menggunakan kata ganti orang pertama.",
    ],
    kunci: ["B", "S", "B"],
    pembahasan:
      "Kalimat (4) menyebut ban bocor sejak tokoh <i>aku</i> kelas dua SMP. Kalimat (7) justru menyatakan Bapak hanya duduk tanpa memasang ban.",
  },
  {
    tipe: "PGK",
    stimulus: TEKS_3,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan tabel Teks 3.",
    opsi: [
      "Siswa kelas X yang memilih bermain gawai lebih sedikit daripada siswa kelas XI.",
      "Membaca buku adalah kegiatan yang paling sedikit dipilih siswa kelas XII.",
      "Tabel tersebut memuat lamanya waktu yang dihabiskan untuk tiap kegiatan.",
      "Jumlah siswa yang membantu orang tua berkurang dari kelas X ke kelas XII.",
    ],
    kunci: ["B", "B", "S", "B"],
    pembahasan:
      "Gawai kelas X 45 siswa dan kelas XI 50 siswa. Membaca buku kelas XII 12 siswa adalah yang terkecil di kolomnya. Membantu orang tua turun 27 → 22 → 18. Tabel tidak memuat durasi, sesuai peringatan pada kalimat (4).",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    stimulus: TEKS_2,
    pertanyaan:
      "Pada kalimat (1) Teks 2, sepeda tua itu ditutup dengan sehelai … (tulis satu kata)",
    kunci: "terpal",
    pembahasan:
      "Kalimat (1) menyebut sepeda itu “ditutup terpal biru yang sudah menipis”, jadi jawabannya <i>terpal</i>.",
  },
];
