/**
 * Warung Soal — PU (Penalaran Umum) Paket 4, kategori Easy.
 *
 * 30 butir: 26 pilihan ganda, 3 pilihan ganda kompleks, 1 isian singkat.
 * Model INTENS: kualitatif penalaran argumentatif, lalu kuantitatif.
 */
export const SOAL = [
  /* ---------------- Kualitatif ---------------- */
  {
    tipe: "PG",
    stimulus:
      "Di Kampung Sari dibangun saluran irigasi baru yang menyebabkan sawah dapat diairi sepanjang tahun. Sawah yang dapat diairi sepanjang tahun membuat petani menanam tiga kali setahun. Meskipun biaya perawatan saluran bertambah, warga tetap memeliharanya karena petani dapat menanam tiga kali setahun.",
    pertanyaan: "Berdasarkan informasi tersebut, manakah pernyataan berikut yang BENAR?",
    opsi: [
      "Biaya perawatan bertambah supaya sawah dapat diairi sepanjang tahun.",
      "Pembangunan saluran irigasi menyebabkan petani menanam tiga kali setahun.",
      "Petani menanam tiga kali setahun menyebabkan saluran irigasi dibangun.",
      "Saluran irigasi dibangun ketika petani sudah menanam tiga kali setahun.",
      "Sawah dapat diairi sepanjang tahun karena biaya perawatan bertambah.",
    ],
    kunci: "B",
    pembahasan:
      "Rantai sebabnya searah: saluran dibangun → sawah terairi sepanjang tahun → petani menanam tiga kali. Pilihan C dan D membalik arah, sedangkan A dan E menempatkan biaya sebagai sebab.",
  },
  {
    tipe: "PG",
    stimulus:
      "Sebuah puskesmas memasang mesin nomor antrean elektronik. Kepala puskesmas yakin keluhan pasien mengenai antrean akan berkurang.",
    pertanyaan: "Keyakinan kepala puskesmas bertumpu pada asumsi bahwa …",
    opsi: [
      "mesin antrean itu tahan dipakai bertahun-tahun",
      "pasien akan datang lebih pagi daripada biasanya",
      "jumlah petugas loket bertambah dua orang",
      "keluhan selama ini muncul karena urutan antrean tidak jelas",
      "aliran listrik puskesmas tidak pernah padam",
    ],
    kunci: "D",
    pembahasan:
      "Mesin antrean hanya menyelesaikan masalah bila sumber keluhannya memang ketidakjelasan urutan. Bila keluhannya soal lamanya pelayanan, mesin itu tidak menolong.",
  },
  {
    tipe: "PG",
    stimulus:
      "Sari memilih menghafal kosakata memakai kartu kecil daripada membaca daftar panjang. Ia beralasan cara itu membuatnya lebih cepat mengingat.",
    pertanyaan: "Manakah yang PALING MEMPERKUAT alasan Sari?",
    opsi: [
      "Menguji diri dengan kartu memaksa otak memanggil kembali ingatan.",
      "Kartu kecil mudah dibawa ke mana-mana.",
      "Daftar panjang memerlukan kertas yang lebih banyak.",
      "Sari menyukai kartu yang berwarna cerah.",
      "Teman sekelas Sari memakai cara yang sama.",
    ],
    kunci: "A",
    pembahasan:
      "Alasan Sari menyangkut kecepatan mengingat, jadi penguatnya harus menyentuh cara kerja ingatan. Pilihan lain hanya menyinggung bentuk, biaya, atau kebiasaan orang lain.",
  },
  {
    tipe: "PG",
    stimulus:
      "Pengelola kolam renang menambah jam buka pada pagi hari. Ia yakin jumlah pengunjung akan bertambah.",
    pertanyaan: "Manakah yang PALING MELEMAHKAN keyakinan pengelola kolam renang?",
    opsi: [
      "Air kolam diganti setiap pekan.",
      "Kolam itu memiliki dua ukuran kedalaman.",
      "Jumlah petugas penjaga bertambah satu orang.",
      "Harga tiket pagi sama dengan tiket siang.",
      "Hampir seluruh warga sekitar bekerja sejak pukul tujuh pagi.",
    ],
    kunci: "E",
    pembahasan:
      "Bila calon pengunjungnya sudah berangkat kerja pada jam itu, tambahan jam buka tidak akan dipakai siapa pun.",
  },
  {
    tipe: "PG",
    stimulus:
      "Seperti halnya peta yang tidak memendekkan jarak, melainkan membuat perjalanan tidak tersesat, daftar rencana harian tidak mengurangi pekerjaan, melainkan membuat pekerjaan itu tidak terlewat.",
    pertanyaan:
      "Berdasarkan paragraf tersebut, jika daftar rencana disamakan dengan peta, manakah simpulan yang PALING MUNGKIN BENAR?",
    opsi: [
      "Daftar rencana harian mengurangi jumlah pekerjaan.",
      "Peta membuat jarak tempuh menjadi lebih pendek.",
      "Daftar rencana harian membuat pekerjaan tidak ada yang terlewat.",
      "Perjalanan tanpa peta selalu berlangsung lebih cepat.",
      "Pekerjaan sebaiknya tidak perlu dicatat sama sekali.",
    ],
    kunci: "C",
    pembahasan:
      "Peta tidak mengubah jaraknya, hanya menjaga arah. Dengan pola yang sama, daftar rencana tidak mengubah banyaknya pekerjaan, hanya menjaga agar tidak ada yang terlewat.",
  },
  {
    tipe: "PG",
    stimulus:
      "Semua peserta lomba cerdas cermat mengikuti seleksi tertulis. Sebagian peserta seleksi tertulis berasal dari kelas XI.",
    pertanyaan: "Simpulan yang PASTI benar adalah …",
    opsi: [
      "Semua peserta lomba cerdas cermat berasal dari kelas XI.",
      "Sebagian peserta seleksi tertulis adalah peserta lomba cerdas cermat.",
      "Semua peserta seleksi tertulis mengikuti lomba cerdas cermat.",
      "Tidak ada peserta lomba cerdas cermat dari kelas XI.",
      "Siswa kelas XI pasti mengikuti lomba cerdas cermat.",
    ],
    kunci: "B",
    pembahasan:
      "Seluruh peserta lomba termasuk peserta seleksi, jadi sebagian peserta seleksi pasti peserta lomba. Pilihan C membalik arah, sedangkan A, D, dan E melampaui informasi.",
  },
  {
    tipe: "PG",
    stimulus:
      "Jika pompa air dinyalakan, tandon di atas akan terisi. Sore ini tandon di atas tidak terisi.",
    pertanyaan: "Simpulan yang sahih adalah …",
    opsi: [
      "Pompa air sedang dinyalakan.",
      "Tandon air itu bocor.",
      "Pompa air baru saja diperbaiki.",
      "Pompa air tidak dinyalakan.",
      "Tidak dapat disimpulkan.",
    ],
    kunci: "D",
    pembahasan:
      "Penalaran <i>modus tollens</i>: dari “jika p maka q” dan “bukan q”, disimpulkan “bukan p”. Kebocoran tidak disebut pada premis sehingga tidak boleh diandaikan.",
  },
  {
    tipe: "PG",
    stimulus:
      "Sebuah sekolah mengganti lampu ruang kelas dengan lampu hemat energi. Alasannya untuk menekan pemakaian listrik sekolah.",
    pertanyaan: "Manakah informasi yang TIDAK relevan dengan alasan sekolah tersebut?",
    opsi: [
      "Lampu hemat energi tersedia dalam berbagai bentuk.",
      "Lampu lama memakai daya listrik dua kali lipat.",
      "Tagihan listrik sekolah naik setiap tahun.",
      "Lampu hemat energi berumur pakai lebih panjang.",
      "Ruang kelas dipakai sampai sore hari.",
    ],
    kunci: "A",
    pembahasan:
      "Alasan sekolah menyangkut pemakaian listrik. Beragamnya bentuk lampu tidak menambah maupun mengurangi daya yang terpakai.",
  },
  {
    tipe: "PG",
    stimulus:
      "Pemasangan rak sepatu di depan musala membuat jamaah tidak lagi menaruh sandal sembarangan. Sandal yang tertata membuat pintu musala tidak terhalang. Meskipun rak itu memakan tempat, pengurus tetap mempertahankannya karena pintu musala tidak terhalang.",
    pertanyaan: "Berdasarkan informasi tersebut, manakah pernyataan berikut yang BENAR?",
    opsi: [
      "Pintu yang tidak terhalang menyebabkan rak sepatu dipasang.",
      "Rak sepatu memakan tempat supaya sandal menjadi tertata.",
      "Sandal menjadi tertata karena rak sepatu memakan tempat.",
      "Rak sepatu dipasang ketika pintu musala sudah tidak terhalang.",
      "Pemasangan rak sepatu menyebabkan pintu musala tidak terhalang.",
    ],
    kunci: "E",
    pembahasan:
      "Rantainya: rak dipasang → sandal tertata → pintu tidak terhalang. Pilihan A dan D membalik urutan, sedangkan B dan C keliru menempatkan “memakan tempat” sebagai sebab.",
  },
  {
    tipe: "PG",
    stimulus:
      "Sejak tiga pekan lalu, jumlah pembeli di sebuah kios koran menurun. Padahal harga, jam buka, dan letak kiosnya tidak berubah. Pada waktu yang sama, halte bus di seberang kios dipindahkan ke ujung jalan.",
    pertanyaan: "Penyebab yang PALING MUNGKIN dari penurunan jumlah pembeli adalah …",
    opsi: [
      "koran yang dijual sudah usang",
      "penjaga kios kurang ramah kepada pembeli",
      "berpindahnya halte bus di seberang kios",
      "warga berhenti membaca koran sama sekali",
      "harga kertas koran sedang naik",
    ],
    kunci: "C",
    pembahasan:
      "Bacaan menegaskan harga, jam buka, dan letak kios tidak berubah, lalu menyebut satu hal yang memang berubah pada waktu yang sama.",
  },
  {
    tipe: "PG",
    stimulus:
      "Seperti tongkat penuntun yang dipakai bukan supaya orang berhenti berjalan, melainkan supaya ia berani melangkah lebih jauh, rumus ringkas diberikan bukan supaya siswa berhenti memahami, melainkan supaya ia berani menghadapi soal yang lebih panjang.",
    pertanyaan: "Simpulan yang PALING MUNGKIN BENAR berdasarkan paragraf tersebut adalah …",
    opsi: [
      "Tongkat penuntun membuat orang berhenti berjalan.",
      "Rumus ringkas membuat siswa berani menghadapi soal yang lebih panjang.",
      "Siswa sebaiknya tidak diberi rumus ringkas sama sekali.",
      "Berjalan jauh lebih mudah daripada mengerjakan soal.",
      "Rumus ringkas membuat siswa berhenti berusaha memahami.",
    ],
    kunci: "B",
    pembahasan:
      "Tongkat penuntun memberanikan, bukan menghentikan. Dengan pola yang sama, rumus ringkas memberanikan siswa menghadapi soal yang lebih berat.",
  },
  {
    tipe: "PG",
    stimulus:
      "Dari 160 siswa, 95 siswa mengikuti kegiatan pramuka, 70 siswa mengikuti paskibra, dan 30 siswa mengikuti keduanya.",
    pertanyaan: "Pernyataan yang PASTI benar berdasarkan data tersebut adalah …",
    opsi: [
      "Seluruh siswa mengikuti setidaknya satu kegiatan.",
      "Siswa yang hanya mengikuti paskibra berjumlah 70 orang.",
      "Siswa yang hanya mengikuti pramuka berjumlah 95 orang.",
      "Terdapat 25 siswa yang tidak mengikuti kedua kegiatan itu.",
      "Paskibra lebih diminati daripada pramuka.",
    ],
    kunci: "D",
    pembahasan:
      "Yang mengikuti setidaknya satu = 95 + 70 − 30 = 135, sehingga 160 − 135 = 25 siswa tidak mengikuti keduanya. Angka 95 dan 70 masih memuat 30 siswa yang mengikuti dua-duanya.",
  },
  {
    tipe: "PG",
    stimulus:
      "Seorang pemilik toko roti berpendapat bahwa naiknya penjualan bulan ini disebabkan oleh papan nama baru yang lebih besar.",
    pertanyaan: "Manakah yang PALING MELEMAHKAN pendapat pemilik toko tersebut?",
    opsi: [
      "Bulan ini sebuah pabrik baru dibuka tepat di seberang toko itu.",
      "Papan nama baru itu terbaca jelas dari kejauhan.",
      "Papan nama yang lama sudah pudar warnanya.",
      "Pemilik toko sudah berjualan sejak lima tahun lalu.",
      "Pembeli mengaku menyukai rasa roti di toko itu.",
    ],
    kunci: "A",
    pembahasan:
      "Pabrik baru mendatangkan calon pembeli baru, sehingga kenaikan penjualan punya penjelasan lain. Pilihan B dan C justru memperkuat pendapat pemilik toko.",
  },
  {
    tipe: "PG",
    stimulus:
      "Lima orang mengantre di sebuah loket. Rian berdiri tepat di belakang Sinta. Tio berada paling depan. Umi berada paling belakang. Vina berdiri tepat di depan Sinta.",
    pertanyaan: "Urutan mereka dari depan ke belakang adalah …",
    opsi: [
      "Tio, Sinta, Vina, Rian, Umi",
      "Tio, Rian, Sinta, Vina, Umi",
      "Tio, Vina, Rian, Sinta, Umi",
      "Tio, Sinta, Rian, Vina, Umi",
      "Tio, Vina, Sinta, Rian, Umi",
    ],
    kunci: "E",
    pembahasan:
      "Tio di ujung depan dan Umi di ujung belakang. Urutan Vina–Sinta–Rian terkunci karena Vina tepat di depan Sinta dan Rian tepat di belakangnya.",
  },
  {
    tipe: "PG",
    stimulus:
      "Panitia memutuskan mengumpulkan sumbangan berupa beras, bukan uang. Mereka yakin sumbangan yang terkumpul akan lebih banyak.",
    pertanyaan: "Keyakinan panitia bertumpu pada asumsi bahwa …",
    opsi: [
      "beras lebih tahan lama daripada uang tunai",
      "panitia kesulitan menyimpan uang sumbangan",
      "lebih banyak warga memiliki beras berlebih daripada uang berlebih",
      "sekolah melarang pengumpulan uang dari warga",
      "beras lebih mudah diangkut ke lokasi penyaluran",
    ],
    kunci: "C",
    pembahasan:
      "Kesimpulan panitia menyangkut banyaknya sumbangan. Yang menopangnya adalah anggapan bahwa lebih banyak orang sanggup menyediakan beras daripada uang.",
  },
  {
    tipe: "PG",
    stimulus:
      "Sebuah sekolah memindahkan ulangan harian dari jam terakhir ke jam kedua. Kepala sekolah beralasan hasil ulangan akan lebih menggambarkan kemampuan siswa.",
    pertanyaan: "Manakah yang PALING MEMPERKUAT alasan kepala sekolah?",
    opsi: [
      "Jam kedua letaknya lebih dekat dengan waktu istirahat.",
      "Daya konsentrasi siswa menurun menjelang siang hari.",
      "Guru lebih siap mengawasi ulangan pada pagi hari.",
      "Ruang kelas terasa lebih sejuk pada jam kedua.",
      "Siswa menyukai ulangan yang diadakan pagi hari.",
    ],
    kunci: "B",
    pembahasan:
      "Yang memperkuat harus menghubungkan waktu pelaksanaan dengan ketepatan hasil. Kesukaan siswa dan kesiapan guru tidak menyentuh kemampuan yang diukur.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Ingkaran dari pernyataan “Semua peserta seminar menerima sertifikat” adalah …",
    opsi: [
      "Semua peserta seminar tidak menerima sertifikat",
      "Tidak seorang pun peserta seminar menerima sertifikat",
      "Sebagian peserta seminar menerima sertifikat",
      "Ada peserta seminar yang tidak menerima sertifikat",
      "Peserta seminar berhak menerima sertifikat",
    ],
    kunci: "D",
    pembahasan:
      "Ingkaran kata <i>semua</i> adalah <i>ada yang tidak</i>. Cukup satu peserta tanpa sertifikat untuk membatalkan pernyataan itu.",
  },
  {
    tipe: "PG",
    stimulus:
      "Sebuah pendataan menemukan bahwa siswa yang mengikuti kegiatan olahraga rutin lebih jarang tidak masuk sekolah daripada siswa yang tidak berolahraga.",
    pertanyaan: "Simpulan yang TIDAK dapat ditarik dari temuan tersebut adalah …",
    opsi: [
      "Menyuruh setiap siswa berolahraga pasti mengurangi ketidakhadirannya.",
      "Ada kaitan antara olahraga rutin dan kehadiran pada kelompok yang didata.",
      "Kelompok yang berolahraga lebih jarang tidak masuk sekolah.",
      "Pendataan itu dilakukan pada sekelompok siswa tertentu.",
      "Temuan itu belum tentu berlaku bagi seluruh siswa.",
    ],
    kunci: "A",
    pembahasan:
      "Temuan itu menunjukkan kaitan, bukan sebab-akibat. Bisa jadi siswa yang badannya memang sehat yang lebih mampu berolahraga sekaligus jarang absen.",
  },

  /* ---------------- Kuantitatif ---------------- */
  {
    tipe: "PG",
    pertanyaan:
      "Sebuah tempat fotokopi mengenakan tarif Rp500 per lembar untuk 20 lembar pertama dan Rp300 per lembar untuk lembar berikutnya.<br>Berapa biaya memfotokopi 30 lembar?",
    opsi: ["Rp11.000", "Rp11.500", "Rp12.000", "Rp12.500", "Rp13.000"],
    kunci: "E",
    pembahasan:
      "Dua puluh lembar pertama 20 × 500 = 10.000, lalu sepuluh lembar sisanya 10 × 300 = 3.000. Totalnya Rp13.000.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Jumlah pengunjung sebuah pameran buku pada empat hari pertama berturut-turut 12, 19, 26, dan 33 orang.<br>Bila trennya tetap, jumlah pengunjung pada hari ke-6 adalah …",
    opsi: ["40 orang", "44 orang", "47 orang", "51 orang", "54 orang"],
    kunci: "C",
    pembahasan:
      "Tiap hari bertambah 7 orang, sehingga hari ke-5 ada 40 orang dan hari ke-6 ada 47 orang.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Manakah bilangan berikut yang nilainya PALING MENDEKATI hasil pengurangan 11/4 − 85% ?",
    opsi: ["1,70", "1,90", "2,10", "2,35", "2,60"],
    kunci: "B",
    pembahasan: "11/4 = 2,75 dan 85% = 0,85, sehingga selisihnya 2,75 − 0,85 = 1,90.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Di sebuah bengkel, oli, bensin, dan air aki dipakai dengan perbandingan 5 : 4 : 1 setiap pekan. Bila bensin yang dipakai selama 3 pekan adalah 48 liter, berapa liter oli yang dipakai selama 4 pekan?",
    opsi: ["60", "64", "72", "80", "100"],
    kunci: "D",
    pembahasan:
      "Bensin sepekan 48 ÷ 3 = 16 liter untuk 4 bagian, jadi satu bagian 4 liter. Oli 5 bagian = 20 liter per pekan, sehingga 4 pekan memerlukan 80 liter.",
  },
  {
    tipe: "PG",
    stimulus:
      "Diketahui K, L, dan M adalah tiga kelas. Berikut informasi mengenai jumlah siswanya.<br>(i) Jumlah siswa K adalah 2 kali jumlah siswa M<br>(ii) Jumlah siswa K lebih banyak 8 orang daripada jumlah siswa L<br>(iii) Jumlah siswa L adalah 60% dari jumlah siswa M<br>(iv) Jumlah siswa L adalah 28 orang",
    pertanyaan: "Informasi manakah yang dapat digunakan untuk menentukan jumlah siswa kelas K?",
    opsi: ["(ii) dan (iv)", "(i) dan (ii)", "(i) dan (iii)", "(i) dan (iv)", "(iii) dan (iv)"],
    kunci: "A",
    pembahasan:
      "Dari (iv) jumlah L = 28, lalu (ii) memberi K = 28 + 8 = 36 orang. Pasangan lain hanya menghasilkan perbandingan atau angka untuk kelas selain K.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Harga sebuah barang naik 50%, lalu turun 40% dari harga yang baru itu.<br>Dibandingkan harga semula, harga akhirnya …",
    opsi: ["naik 10%", "tetap", "naik 5%", "turun 5%", "turun 10%"],
    kunci: "E",
    pembahasan:
      "Misal harga awal 100: naik 50% menjadi 150, lalu turun 40% dari 150 menjadi 90. Jadi turun 10%, karena persentase kedua dihitung dari harga yang sudah berubah.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Rata-rata nilai 8 siswa adalah 76. Bila nilai dua siswa lain, yaitu 90 dan 94, ikut diperhitungkan, rata-rata sepuluh siswa menjadi …",
    opsi: ["78", "78,5", "79,2", "80", "81"],
    kunci: "C",
    pembahasan:
      "Jumlah nilai delapan siswa = 8 × 76 = 608. Setelah ditambah 90 dan 94 menjadi 792 untuk 10 siswa, sehingga rata-ratanya 79,2.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Sebuah sepeda motor berangkat pukul 07.10 dan tiba pukul 09.40 dengan kecepatan rata-rata 48 km/jam.<br>Jarak yang ditempuh sepeda motor itu adalah …",
    opsi: ["96 km", "108 km", "120 km", "132 km", "144 km"],
    kunci: "C",
    pembahasan: "Lama perjalanan 2 jam 30 menit atau 2,5 jam, sehingga jaraknya 48 × 2,5 = 120 km.",
  },

  /* ---------------- Pilihan ganda kompleks ---------------- */
  {
    tipe: "PGK",
    stimulus:
      "Sebuah sekolah memasang papan pengumuman baru di dekat gerbang. Sebulan kemudian, jumlah siswa yang terlambat mengumpulkan tugas berkurang. Ketua OSIS menyimpulkan bahwa siswa menjadi lebih tertib.",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Simpulan itu bertumpu pada anggapan bahwa berkurangnya keterlambatan menandakan ketertiban siswa.",
      "Bila pada bulan yang sama jumlah tugas juga dikurangi, simpulan itu menjadi lebih lemah.",
      "Jumlah tugas yang diberikan tidak perlu diperhitungkan untuk menguji simpulan itu.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Keterlambatan bisa berkurang semata-mata karena tugasnya lebih sedikit. Karena itu jumlah tugas justru menjadi hal pertama yang perlu diperiksa.",
  },
  {
    tipe: "PGK",
    stimulus:
      "Sebuah toko menjual 2 buku dan 3 pulpen seharga Rp37.000, sedangkan 4 buku dan 1 pulpen seharga Rp39.000.",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Harga sebuah buku adalah Rp8.000.",
      "Harga sebuah pulpen adalah Rp7.000.",
      "Harga 3 buku dan 3 pulpen adalah Rp46.000.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Misal buku b dan pulpen p: 2b + 3p = 37.000 dan 4b + p = 39.000. Penyelesaiannya b = 8.000 dan p = 7.000, sehingga 3 buku dan 3 pulpen berharga 24.000 + 21.000 = Rp45.000.",
  },
  {
    tipe: "PGK",
    stimulus: "Diketahui barisan bilangan 4, 10, 16, 22, ….",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Beda antarsuku barisan tersebut adalah 6.",
      "Suku ke-8 barisan tersebut adalah 46.",
      "Rumus suku ke-<i>n</i> barisan tersebut adalah U<sub>n</sub> = 6<i>n</i>.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Bedanya 6 dan suku ke-8 = 4 + 7(6) = 46. Rumus yang benar U<sub>n</sub> = 6n − 2, sebab untuk n = 1 harus menghasilkan 4.",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    pertanyaan:
      "Sebuah bilangan dikalikan 5 lalu dikurangi 12, hasilnya 38.<br>Berapakah bilangan itu?",
    kunci: "10",
    pembahasan: "Misal bilangannya x, maka 5x − 12 = 38 sehingga 5x = 50 dan x = 10.",
  },
];
