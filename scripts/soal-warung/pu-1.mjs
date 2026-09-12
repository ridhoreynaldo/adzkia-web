/**
 * Warung Soal — PU (Penalaran Umum) Paket 1, kategori Easy.
 *
 * 30 butir: 26 pilihan ganda, 3 pilihan ganda kompleks (Benar/Salah),
 * dan 1 isian singkat.
 *
 * Modelnya mengikuti naskah Tryout Prosus Inten: bagian kualitatif berupa
 * penalaran argumentatif — pernyataan BENAR dari rantai sebab-akibat, asumsi
 * yang menopang keyakinan, yang PALING MEMPERKUAT / MELEMAHKAN, dan analogi
 * konseptual — lalu ditutup bagian kuantitatif. Karena paket ini jenjang
 * Easy, tiap butir cukup diselesaikan satu langkah dan pengecohnya dibuat
 * jelas berbeda. Soal karangan sendiri, bukan naskah tryout Adzkia.
 */
export const SOAL = [
  /* ---------------- Kualitatif: penalaran argumentatif ---------------- */
  {
    tipe: "PG",
    stimulus:
      "Di Kelurahan Melati dibangun taman bacaan yang menyebabkan anak-anak memiliki tempat berkumpul sesudah sekolah. Adanya tempat berkumpul membuat anak-anak lebih jarang bermain di pinggir jalan. Meskipun taman bacaan itu hanya buka empat hari sepekan, orang tua merasa lebih tenang karena anak-anak lebih jarang bermain di pinggir jalan.",
    pertanyaan: "Berdasarkan informasi tersebut, manakah pernyataan berikut yang BENAR?",
    opsi: [
      "Ketenangan orang tua menyebabkan taman bacaan dibangun.",
      "Pembangunan taman bacaan menyebabkan anak-anak lebih jarang bermain di pinggir jalan.",
      "Taman bacaan dibuka empat hari sepekan supaya orang tua merasa tenang.",
      "Anak-anak bermain di pinggir jalan ketika taman bacaan dibangun.",
      "Tempat berkumpul dibangun karena orang tua merasa tenang.",
    ],
    kunci: "B",
    pembahasan:
      "Rantai sebabnya searah: taman bacaan → ada tempat berkumpul → jarang bermain di pinggir jalan. Pilihan A dan E membalik arah, sedangkan C salah menempatkan jumlah hari buka sebagai sebab.",
  },
  {
    tipe: "PG",
    stimulus:
      "Sebuah sekolah memasang rak sepatu di depan setiap ruang kelas. Kepala sekolah yakin lantai kelas akan lebih bersih sesudah rak itu dipasang.",
    pertanyaan: "Keyakinan kepala sekolah bertumpu pada asumsi bahwa …",
    opsi: [
      "rak sepatu itu terbuat dari bahan yang tahan lama",
      "lantai kelas tetap dipel setiap hari",
      "setiap siswa membawa sepatu cadangan",
      "siswa mau melepas sepatu dan menaruhnya di rak",
      "rak sepatu lebih murah daripada alat pel",
    ],
    kunci: "D",
    pembahasan:
      "Rak hanya berguna bila benar-benar dipakai. Tanpa asumsi itu, kesimpulan kepala sekolah tentang lantai yang lebih bersih tidak berdiri.",
  },
  {
    tipe: "PG",
    stimulus:
      "Rina memilih membaca buku cetak daripada membaca lewat layar ketika belajar menjelang ujian. Ia beralasan membaca buku cetak membuatnya bertahan lebih lama tanpa terganggu.",
    pertanyaan: "Manakah yang PALING MEMPERKUAT alasan Rina?",
    opsi: [
      "Buku cetak tidak memunculkan pemberitahuan yang memutus perhatian pembaca.",
      "Buku cetak Rina dibeli dari toko dekat rumahnya.",
      "Harga buku cetak lebih mahal daripada buku digital.",
      "Rina menyukai aroma kertas buku yang masih baru.",
      "Ujian yang dihadapi Rina berlangsung selama dua hari.",
    ],
    kunci: "A",
    pembahasan:
      "Alasan Rina menyangkut perhatian yang tidak terputus. Hanya pilihan A yang menyentuh hal itu; pilihan lain berbicara tentang asal, harga, kesukaan, dan lama ujian.",
  },
  {
    tipe: "PG",
    stimulus:
      "Pengelola sebuah kantin mengganti kemasan plastik dengan kemasan kertas. Ia yakin langkah itu akan mengurangi jumlah sampah yang dihasilkan kantin setiap hari.",
    pertanyaan: "Manakah yang PALING MELEMAHKAN keyakinan pengelola kantin?",
    opsi: [
      "Kemasan kertas yang dipakai berwarna cokelat muda.",
      "Sebagian pembeli sudah terbiasa membawa wadah sendiri.",
      "Harga kemasan kertas lebih mahal daripada kemasan plastik.",
      "Kantin itu buka mulai pukul tujuh pagi.",
      "Kemasan kertas yang dipakai harus dua lapis sehingga jumlahnya justru bertambah.",
    ],
    kunci: "E",
    pembahasan:
      "Melemahkan berarti membalik hubungan “ganti kemasan → sampah berkurang”. Kemasan dua lapis justru menambah jumlah sampah, tepat kebalikan dari yang diyakini pengelola.",
  },
  {
    tipe: "PG",
    stimulus:
      "Seperti halnya payung yang tidak menghentikan hujan, melainkan membuat orang tetap dapat berjalan di bawahnya, jadwal belajar tidak mengurangi banyaknya materi, melainkan membuat materi itu dapat dikerjakan sedikit demi sedikit.",
    pertanyaan:
      "Berdasarkan paragraf tersebut, jika jadwal belajar disamakan dengan payung, manakah simpulan yang PALING MUNGKIN BENAR?",
    opsi: [
      "Jadwal belajar mengurangi jumlah materi yang harus dipelajari.",
      "Hujan akan berhenti bila orang memakai payung.",
      "Jadwal belajar membuat banyaknya materi menjadi dapat dihadapi.",
      "Orang yang memakai payung tidak perlu berjalan.",
      "Materi pelajaran sebaiknya dikurangi oleh guru.",
    ],
    kunci: "C",
    pembahasan:
      "Inti perbandingannya: payung tidak menghapus hujan, hanya membuatnya dapat dihadapi. Maka jadwal belajar pun tidak mengurangi materi, hanya membuatnya terkelola.",
  },
  {
    tipe: "PG",
    stimulus:
      "Semua siswa yang mengikuti kelas tari berlatih pada hari Sabtu. Sebagian siswa yang berlatih pada hari Sabtu berasal dari kelas X.",
    pertanyaan: "Simpulan yang PASTI benar adalah …",
    opsi: [
      "Semua siswa kelas tari berasal dari kelas X.",
      "Sebagian siswa yang berlatih pada hari Sabtu mengikuti kelas tari.",
      "Semua siswa yang berlatih pada hari Sabtu mengikuti kelas tari.",
      "Tidak ada siswa kelas X yang mengikuti kelas tari.",
      "Siswa kelas X pasti mengikuti kelas tari.",
    ],
    kunci: "B",
    pembahasan:
      "Seluruh peserta kelas tari termasuk dalam kelompok yang berlatih Sabtu, jadi sebagian kelompok itu pasti peserta kelas tari. Pilihan C membalik arah, sedangkan A, D, dan E melampaui informasi yang ada.",
  },
  {
    tipe: "PG",
    stimulus:
      "Jika lampu ruang kelas menyala, kipas angin ikut berputar. Siang ini kipas angin tidak berputar.",
    pertanyaan: "Simpulan yang sahih adalah …",
    opsi: [
      "Lampu ruang kelas menyala.",
      "Kipas anginnya sedang rusak.",
      "Lampu dan kipas angin sama-sama menyala.",
      "Lampu ruang kelas tidak menyala.",
      "Tidak dapat disimpulkan.",
    ],
    kunci: "D",
    pembahasan:
      "Penalaran <i>modus tollens</i>: dari “jika p maka q” dan “bukan q”, disimpulkan “bukan p”. Alasan lain seperti kerusakan tidak disebut dalam premis sehingga tidak boleh diandaikan.",
  },
  {
    tipe: "PG",
    stimulus:
      "Sebuah sekolah mewajibkan siswa membawa botol minum sendiri. Alasannya untuk mengurangi sampah botol sekali pakai di lingkungan sekolah.",
    pertanyaan: "Manakah informasi yang TIDAK relevan dengan alasan sekolah tersebut?",
    opsi: [
      "Botol minum dijual dalam berbagai ukuran dan warna.",
      "Botol sekali pakai memenuhi tempat sampah sekolah setiap hari.",
      "Sampah botol plastik memerlukan waktu lama untuk terurai.",
      "Sekolah menyediakan keran air isi ulang di setiap lantai.",
      "Botol sekali pakai jarang dikumpulkan untuk didaur ulang.",
    ],
    kunci: "A",
    pembahasan:
      "Alasan sekolah menyangkut jumlah sampah. Ukuran dan warna botol tidak menambah maupun mengurangi sampah, jadi tidak berkaitan dengan alasan itu.",
  },
  {
    tipe: "PG",
    stimulus:
      "Pemasangan atap di halte membuat penumpang tidak lagi kepanasan saat menunggu. Penumpang yang tidak kepanasan membuat orang lebih betah menunggu bus. Meskipun jumlah bus tidak bertambah, penumpang bertambah banyak karena orang lebih betah menunggu bus.",
    pertanyaan: "Berdasarkan informasi tersebut, manakah pernyataan berikut yang BENAR?",
    opsi: [
      "Bertambahnya penumpang menyebabkan atap halte dipasang.",
      "Jumlah bus tidak bertambah supaya penumpang betah menunggu.",
      "Penumpang bertambah karena jumlah bus tidak bertambah.",
      "Atap halte dipasang ketika jumlah penumpang sudah bertambah.",
      "Pemasangan atap halte menyebabkan jumlah penumpang bertambah banyak.",
    ],
    kunci: "E",
    pembahasan:
      "Rantainya: atap dipasang → tidak kepanasan → betah menunggu → penumpang bertambah. Pilihan A dan D membalik urutannya, sedangkan B dan C keliru menempatkan jumlah bus sebagai sebab.",
  },
  {
    tipe: "PG",
    stimulus:
      "Sejak dua bulan lalu, jumlah peminjam buku di perpustakaan sekolah menurun. Padahal jam buka, jumlah buku, dan petugasnya tidak berubah. Pada waktu yang sama, jam istirahat siang dipersingkat dari 30 menit menjadi 15 menit.",
    pertanyaan: "Penyebab yang PALING MUNGKIN dari penurunan jumlah peminjam adalah …",
    opsi: [
      "buku perpustakaan sudah usang",
      "petugas perpustakaan kurang ramah",
      "berkurangnya waktu istirahat siswa",
      "siswa lebih suka membaca di rumah",
      "jumlah siswa berkurang pada tahun ini",
    ],
    kunci: "C",
    pembahasan:
      "Bacaan menegaskan jam buka, jumlah buku, dan petugas tidak berubah, lalu menyebut satu hal yang memang berubah pada waktu yang sama. Perubahan itulah yang paling mungkin menjadi sebabnya.",
  },
  {
    tipe: "PG",
    stimulus:
      "Seperti pagar yang dipasang di tepi jurang bukan untuk menghalangi pendaki, melainkan agar mereka berani mendekat, aturan peminjaman alat laboratorium dibuat bukan untuk mempersulit siswa, melainkan agar siswa berani memakainya.",
    pertanyaan: "Simpulan yang PALING MUNGKIN BENAR berdasarkan paragraf tersebut adalah …",
    opsi: [
      "Pendaki sebaiknya menjauhi tepi jurang.",
      "Aturan peminjaman membuat siswa lebih leluasa memakai alat laboratorium.",
      "Alat laboratorium sebaiknya tidak dipinjamkan kepada siswa.",
      "Pagar dipasang supaya pendaki berhenti mendaki.",
      "Aturan peminjaman memperlambat jalannya kegiatan praktikum.",
    ],
    kunci: "B",
    pembahasan:
      "Pagar membuat orang berani mendekat, bukan menjauh. Dengan pola yang sama, aturan peminjaman membuat siswa berani memakai alat, bukan enggan.",
  },
  {
    tipe: "PG",
    stimulus:
      "Dari 150 siswa, 85 siswa membawa bekal dari rumah, 70 siswa membeli makanan di kantin, dan 20 siswa melakukan keduanya.",
    pertanyaan: "Pernyataan yang PASTI benar berdasarkan data tersebut adalah …",
    opsi: [
      "Seluruh siswa membawa bekal atau membeli makanan di kantin.",
      "Siswa yang hanya membeli di kantin berjumlah 70 orang.",
      "Siswa yang hanya membawa bekal berjumlah 85 orang.",
      "Terdapat 15 siswa yang tidak melakukan keduanya.",
      "Membeli di kantin lebih banyak dipilih daripada membawa bekal.",
    ],
    kunci: "D",
    pembahasan:
      "Yang melakukan setidaknya satu = 85 + 70 − 20 = 135, sehingga 150 − 135 = 15 siswa tidak melakukan keduanya. Angka 85 dan 70 masih memuat 20 siswa yang melakukan dua-duanya.",
  },
  {
    tipe: "PG",
    stimulus:
      "Seorang guru berpendapat bahwa naiknya nilai ulangan kelasnya bulan ini disebabkan oleh metode belajar kelompok yang baru ia terapkan.",
    pertanyaan: "Manakah yang PALING MELEMAHKAN pendapat guru tersebut?",
    opsi: [
      "Soal ulangan bulan ini disusun jauh lebih mudah daripada bulan sebelumnya.",
      "Belajar kelompok membuat siswa lebih berani bertanya.",
      "Kelompok belajar dibentuk berdasarkan tempat duduk siswa.",
      "Guru itu sudah mengajar di kelas tersebut sejak awal tahun.",
      "Siswa mengaku menyukai suasana belajar kelompok.",
    ],
    kunci: "A",
    pembahasan:
      "Bila soalnya memang lebih mudah, kenaikan nilai punya penjelasan lain yang tidak berhubungan dengan metode. Pilihan B dan E justru memperkuat pendapat guru.",
  },
  {
    tipe: "PG",
    stimulus:
      "Empat anak berbaris menghadap ke depan. Gilang berdiri tepat di belakang Hana. Ika berdiri paling depan. Jaka berdiri paling belakang.",
    pertanyaan: "Urutan mereka dari depan ke belakang adalah …",
    opsi: [
      "Ika, Gilang, Hana, Jaka",
      "Ika, Jaka, Hana, Gilang",
      "Hana, Ika, Gilang, Jaka",
      "Ika, Hana, Jaka, Gilang",
      "Ika, Hana, Gilang, Jaka",
    ],
    kunci: "E",
    pembahasan:
      "Ika mengisi urutan pertama dan Jaka urutan keempat, sehingga tersisa urutan kedua dan ketiga. Karena Gilang tepat di belakang Hana, urutannya Hana lalu Gilang.",
  },
  {
    tipe: "PG",
    stimulus:
      "Panitia bakti sosial memutuskan mengumpulkan sumbangan berupa buku bekas, bukan uang. Mereka yakin cara itu membuat lebih banyak siswa ikut menyumbang.",
    pertanyaan: "Keyakinan panitia bertumpu pada asumsi bahwa …",
    opsi: [
      "buku bekas lebih berguna daripada uang bagi penerima sumbangan",
      "panitia kesulitan menghitung uang sumbangan",
      "lebih banyak siswa memiliki buku bekas daripada uang lebih",
      "sekolah melarang pengumpulan uang dari siswa",
      "buku bekas mudah diangkut ke lokasi bakti sosial",
    ],
    kunci: "C",
    pembahasan:
      "Kesimpulan panitia menyangkut <i>jumlah penyumbang</i>. Yang menopangnya adalah anggapan bahwa lebih banyak siswa sanggup menyediakan buku bekas daripada uang.",
  },
  {
    tipe: "PG",
    stimulus:
      "Sebuah sekolah memindahkan jam pelajaran olahraga dari siang ke pagi. Kepala sekolah beralasan siswa akan lebih bugar mengikuti pelajaran berikutnya.",
    pertanyaan: "Manakah yang PALING MEMPERKUAT alasan kepala sekolah?",
    opsi: [
      "Lapangan sekolah lebih sepi pada pagi hari.",
      "Berolahraga saat suhu udara belum terlalu panas membuat tubuh tidak cepat lelah.",
      "Guru olahraga tinggal tidak jauh dari sekolah.",
      "Seragam olahraga siswa berwarna terang.",
      "Pelajaran sesudah olahraga adalah matematika.",
    ],
    kunci: "B",
    pembahasan:
      "Yang memperkuat harus menghubungkan waktu pagi dengan kebugaran. Pilihan lain hanya menyinggung kondisi lapangan, guru, seragam, dan jenis pelajaran.",
  },
  {
    tipe: "PG",
    pertanyaan: "Ingkaran dari pernyataan “Semua peserta upacara memakai topi” adalah …",
    opsi: [
      "Semua peserta upacara tidak memakai topi",
      "Tidak seorang pun peserta upacara memakai topi",
      "Sebagian peserta upacara memakai topi",
      "Ada peserta upacara yang tidak memakai topi",
      "Peserta upacara wajib memakai topi",
    ],
    kunci: "D",
    pembahasan:
      "Ingkaran kata <i>semua</i> adalah <i>ada yang tidak</i>. Cukup satu peserta tanpa topi untuk membatalkan pernyataan itu, jadi tidak perlu sampai “tidak seorang pun”.",
  },
  {
    tipe: "PG",
    stimulus:
      "Sebuah pendataan menemukan bahwa siswa yang sarapan sebelum berangkat memperoleh nilai ulangan lebih tinggi daripada siswa yang tidak sarapan.",
    pertanyaan: "Simpulan yang TIDAK dapat ditarik dari temuan tersebut adalah …",
    opsi: [
      "Menyuruh setiap siswa sarapan pasti menaikkan nilai ulangannya.",
      "Ada kaitan antara kebiasaan sarapan dan nilai ulangan pada kelompok yang didata.",
      "Kelompok yang sarapan memperoleh nilai yang lebih tinggi.",
      "Pendataan itu dilakukan pada sekelompok siswa tertentu.",
      "Temuan itu belum tentu berlaku bagi semua siswa.",
    ],
    kunci: "A",
    pembahasan:
      "Temuan itu menunjukkan kaitan, bukan sebab-akibat. Bisa saja siswa yang sarapan memang berasal dari keluarga yang juga mendampingi belajar, sehingga menyimpulkan “pasti menaikkan nilai” adalah lompatan.",
  },

  /* ---------------- Kuantitatif ---------------- */
  {
    tipe: "PG",
    pertanyaan:
      "Sebuah tempat penitipan sepeda mengenakan tarif Rp2.000 untuk dua jam pertama dan Rp1.000 untuk setiap jam berikutnya.<br>Berapa biaya menitipkan sepeda selama 6 jam?",
    opsi: ["Rp3.000", "Rp4.000", "Rp5.000", "Rp5.500", "Rp6.000"],
    kunci: "E",
    pembahasan:
      "Dua jam pertama Rp2.000, lalu empat jam sisanya 4 × Rp1.000 = Rp4.000. Totalnya Rp6.000.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Jumlah pengunjung sebuah pameran pada empat hari pertama berturut-turut 5, 9, 13, dan 17 orang.<br>Bila trennya tetap, jumlah pengunjung pada hari ke-7 adalah …",
    opsi: ["21 orang", "25 orang", "29 orang", "33 orang", "37 orang"],
    kunci: "C",
    pembahasan:
      "Tiap hari bertambah 4 orang, sehingga hari ke-5 ada 21, hari ke-6 ada 25, dan hari ke-7 ada 29 orang.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Manakah bilangan berikut yang nilainya PALING MENDEKATI hasil pengurangan 3/2 − 40% ?",
    opsi: ["0,90", "1,10", "1,25", "1,40", "1,90"],
    kunci: "B",
    pembahasan: "3/2 = 1,5 dan 40% = 0,4, sehingga selisihnya 1,5 − 0,4 = 1,1.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Di sebuah kedai, tepung, gula, dan mentega dipakai dengan perbandingan 4 : 2 : 1 setiap hari. Bila gula yang dipakai selama 5 hari adalah 30 kg, berapa kg tepung yang dipakai selama 3 hari?",
    opsi: ["24", "27", "30", "36", "42"],
    kunci: "D",
    pembahasan:
      "Gula sehari 30 ÷ 5 = 6 kg untuk 2 bagian, jadi satu bagian 3 kg. Tepung 4 bagian = 12 kg per hari, sehingga 3 hari memerlukan 36 kg.",
  },
  {
    tipe: "PG",
    stimulus:
      "Diketahui A, B, dan C adalah tiga kelas. Berikut informasi mengenai jumlah siswanya.<br>(i) Jumlah siswa A adalah 3 kali jumlah siswa C<br>(ii) Jumlah siswa A lebih banyak 12 orang daripada jumlah siswa B<br>(iii) Jumlah siswa B adalah setengah jumlah siswa C<br>(iv) Jumlah siswa B adalah 24 orang",
    pertanyaan: "Informasi manakah yang dapat digunakan untuk menentukan jumlah siswa kelas A?",
    opsi: ["(ii) dan (iv)", "(i) dan (ii)", "(i) dan (iii)", "(i) dan (iv)", "(iii) dan (iv)"],
    kunci: "A",
    pembahasan:
      "Dari (iv) jumlah B = 24, lalu (ii) memberi A = 24 + 12 = 36. Pasangan lain hanya menghasilkan perbandingan atau angka untuk kelas selain A.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Harga sebuah barang turun 10%, lalu naik 10% dari harga yang baru itu.<br>Dibandingkan harga semula, harga akhirnya …",
    opsi: ["tetap", "naik 1%", "naik 10%", "turun 10%", "turun 1%"],
    kunci: "E",
    pembahasan:
      "Misal harga awal 100: turun 10% menjadi 90, lalu naik 10% dari 90 menjadi 99. Jadi turun 1%, karena persentase kedua dihitung dari harga yang sudah berubah.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Rata-rata nilai 10 siswa adalah 72. Bila nilai seorang siswa yang mendapat 94 ikut diperhitungkan, rata-rata sebelas siswa menjadi …",
    opsi: ["72", "73", "74", "75", "76"],
    kunci: "C",
    pembahasan:
      "Jumlah nilai sepuluh siswa = 10 × 72 = 720. Setelah ditambah 94 menjadi 814 untuk 11 siswa, sehingga rata-ratanya 814 ÷ 11 = 74.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Sebuah mobil berangkat pukul 09.20 dan tiba pukul 12.50 dengan kecepatan rata-rata 60 km/jam.<br>Jarak yang ditempuh mobil itu adalah …",
    opsi: ["180 km", "195 km", "210 km", "225 km", "240 km"],
    kunci: "C",
    pembahasan: "Lama perjalanan 3 jam 30 menit atau 3,5 jam, sehingga jaraknya 60 × 3,5 = 210 km.",
  },

  /* ---------------- Pilihan ganda kompleks (Benar/Salah) ---------------- */
  {
    tipe: "PGK",
    stimulus:
      "Sebuah sekolah menambah jumlah tempat sampah di halaman. Sebulan kemudian, sampah yang tercecer di halaman berkurang banyak. Pengurus OSIS menyimpulkan bahwa kesadaran siswa membuang sampah telah meningkat.",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Simpulan pengurus OSIS bertumpu pada anggapan bahwa berkurangnya sampah tercecer menandakan kesadaran siswa.",
      "Bila petugas kebersihan juga ditambah pada bulan yang sama, simpulan pengurus OSIS menjadi lebih lemah.",
      "Jumlah siswa yang hadir di sekolah tidak perlu diperhitungkan untuk menguji simpulan itu.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Sampah yang berkurang bisa disebabkan petugas yang bertambah atau siswa yang lebih sedikit hadir, bukan hanya kesadaran. Keduanya justru perlu diperhitungkan.",
  },
  {
    tipe: "PGK",
    stimulus:
      "Sebuah toko menjual 2 pensil dan 1 penghapus seharga Rp7.000, sedangkan 1 pensil dan 3 penghapus seharga Rp11.000.",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Harga sebuah pensil adalah Rp2.000.",
      "Harga sebuah penghapus adalah Rp3.000.",
      "Harga 3 pensil dan 2 penghapus adalah Rp13.000.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Misal pensil p dan penghapus h: 2p + h = 7.000 dan p + 3h = 11.000. Penyelesaiannya p = 2.000 dan h = 3.000, sehingga 3 pensil dan 2 penghapus berharga 6.000 + 6.000 = Rp12.000.",
  },
  {
    tipe: "PGK",
    stimulus: "Diketahui barisan bilangan 2, 5, 8, 11, ….",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Beda antarsuku barisan tersebut adalah 3.",
      "Suku ke-8 barisan tersebut adalah 23.",
      "Rumus suku ke-<i>n</i> barisan tersebut adalah U<sub>n</sub> = 3<i>n</i> + 1.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Bedanya 3 dan suku ke-8 = 2 + 7(3) = 23. Rumus yang benar U<sub>n</sub> = 3n − 1, sebab untuk n = 1 harus menghasilkan 2.",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    pertanyaan:
      "Sebuah bilangan dikurangi 5 lalu dikalikan 3, hasilnya 27.<br>Berapakah bilangan itu?",
    kunci: "14",
    pembahasan: "Misal bilangannya x, maka 3(x − 5) = 27 sehingga x − 5 = 9 dan x = 14.",
  },
];
