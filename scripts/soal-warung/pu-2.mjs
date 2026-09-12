/**
 * Warung Soal — PU (Penalaran Umum) Paket 2, kategori Easy.
 *
 * 30 butir: 26 pilihan ganda, 3 pilihan ganda kompleks (Benar/Salah),
 * dan 1 isian singkat.
 *
 * Modelnya mengikuti naskah Tryout Prosus Inten: bagian kualitatif berupa
 * penalaran argumentatif — pernyataan yang BENAR dari rantai sebab-akibat,
 * asumsi yang mendasari, yang PALING MEMPERKUAT / MELEMAHKAN, dan analogi
 * konseptual — lalu ditutup bagian kuantitatif berupa tarif bertingkat, tren
 * deret, rasio, dan kecukupan informasi. Soal karangan sendiri untuk latihan
 * harian, bukan naskah tryout Adzkia.
 */
export const SOAL = [
  /* ---------------- Kualitatif: penalaran argumentatif ---------------- */
  {
    tipe: "PG",
    stimulus:
      "Di Desa Sukamaju dibangun jalan beraspal yang menyebabkan warga lebih mudah membawa hasil panen ke pasar kota. Kemudahan membawa hasil panen ke pasar kota membuat warga menanam sayuran lebih banyak. Meskipun harga pupuk naik, banyak warga tetap memperluas lahannya karena warga menanam sayuran lebih banyak.",
    pertanyaan: "Berdasarkan informasi tersebut, manakah pernyataan berikut yang BENAR?",
    opsi: [
      "Jalan beraspal dibangun ketika warga memperluas lahannya.",
      "Harga pupuk naik supaya warga menanam sayuran lebih banyak.",
      "Pembangunan jalan beraspal menyebabkan warga menanam sayuran lebih banyak.",
      "Warga memperluas lahan ketika harga pupuk turun.",
      "Hasil panen yang melimpah menyebabkan jalan beraspal dibangun.",
    ],
    kunci: "C",
    pembahasan:
      "Rantai sebabnya: jalan beraspal → mudah membawa panen → menanam lebih banyak. Karena hubungan sebab-akibat bersifat searah, hanya pilihan C yang menyusunnya dengan arah yang benar.",
  },
  {
    tipe: "PG",
    stimulus:
      "Sejak setahun terakhir, banyak siswa SMA di Kota B membawa botol minum sendiri ke sekolah. Pengamat menilai kebiasaan itu tumbuh karena kantin sekolah berhenti menjual air kemasan.",
    pertanyaan: "Manakah yang PALING MUNGKIN mendasari penilaian pengamat tersebut?",
    opsi: [
      "Siswa menyukai botol minum berwarna cerah.",
      "Botol minum lebih ringan daripada air kemasan.",
      "Sekolah mewajibkan siswa membawa bekal makanan.",
      "Perilaku siswa menyesuaikan diri dengan apa yang tersedia di sekitarnya.",
      "Air kemasan lebih mahal daripada air isi ulang.",
    ],
    kunci: "D",
    pembahasan:
      "Penilaian pengamat menghubungkan hilangnya air kemasan dengan berubahnya kebiasaan. Anggapan yang menopang hubungan itu adalah bahwa perilaku menyesuaikan diri dengan ketersediaan.",
  },
  {
    tipe: "PG",
    stimulus:
      "Nabila memilih berangkat ke sekolah dengan sepeda meskipun jaraknya 5 km dan jalannya menanjak. Ia beralasan bersepeda membuat badannya lebih bugar sepanjang hari.",
    pertanyaan: "Manakah yang PALING MEMPERKUAT alasan Nabila?",
    opsi: [
      "Sepeda Nabila baru dibeli tahun lalu.",
      "Penelitian menunjukkan bersepeda 30 menit setiap hari meningkatkan kebugaran tubuh.",
      "Teman-teman Nabila juga berangkat dengan sepeda.",
      "Jalan menuju sekolah Nabila sudah beraspal mulus.",
      "Angkutan umum menuju sekolah Nabila jarang lewat.",
    ],
    kunci: "B",
    pembahasan:
      "Alasan Nabila menyangkut kebugaran, jadi yang memperkuat harus menyentuh kebugaran pula. Pilihan lain hanya menyinggung kondisi sepeda, teman, atau jalan.",
  },
  {
    tipe: "PG",
    stimulus:
      "Sebuah sekolah menambah jam belajar sore untuk meningkatkan nilai ujian siswa. Kepala sekolah yakin tambahan jam itu akan menaikkan nilai rata-rata.",
    pertanyaan: "Manakah yang PALING MELEMAHKAN keyakinan kepala sekolah?",
    opsi: [
      "Guru menerima honor tambahan untuk mengajar jam sore.",
      "Sebagian siswa tinggal jauh dari sekolah.",
      "Ujian tahun ini memakai bentuk soal yang baru.",
      "Nilai rata-rata sekolah tetangga juga naik tahun ini.",
      "Siswa yang kelelahan justru menyerap pelajaran lebih sedikit.",
    ],
    kunci: "E",
    pembahasan:
      "Melemahkan berarti memutus hubungan “tambah jam → nilai naik”. Kelelahan yang menurunkan daya serap justru membalik arah hubungan itu.",
  },
  {
    tipe: "PG",
    stimulus:
      "Seperti halnya rem pada kendaraan yang tidak dimaksudkan untuk menghentikan perjalanan, melainkan agar kendaraan dapat melaju dengan aman, tata tertib sekolah dibuat bukan untuk membatasi kegiatan siswa, melainkan agar kegiatan itu berjalan tanpa membahayakan.",
    pertanyaan:
      "Berdasarkan paragraf tersebut, jika tata tertib disamakan dengan rem, manakah simpulan yang PALING MUNGKIN BENAR?",
    opsi: [
      "Tata tertib memungkinkan kegiatan siswa berjalan lebih leluasa karena lebih aman.",
      "Tata tertib membuat kegiatan siswa berhenti sama sekali.",
      "Kendaraan tanpa rem tetap dapat melaju dengan aman.",
      "Sekolah tanpa tata tertib lebih disukai oleh siswa.",
      "Rem hanya diperlukan ketika kendaraan melaju kencang.",
    ],
    kunci: "A",
    pembahasan:
      "Inti perbandingannya: rem bukan penghenti, melainkan pemungkin. Maka tata tertib pun bukan pembatas, melainkan yang memungkinkan kegiatan berjalan aman.",
  },
  {
    tipe: "PG",
    stimulus:
      "Semua peserta olimpiade sains di sekolah itu mengikuti kelas tambahan. Sebagian peserta kelas tambahan berasal dari kelas XI.",
    pertanyaan: "Simpulan yang PASTI benar adalah …",
    opsi: [
      "Semua peserta olimpiade sains berasal dari kelas XI.",
      "Semua peserta kelas tambahan adalah peserta olimpiade sains.",
      "Sebagian peserta kelas tambahan adalah peserta olimpiade sains.",
      "Tidak ada peserta olimpiade sains yang berasal dari kelas XI.",
      "Siswa kelas XI pasti mengikuti olimpiade sains.",
    ],
    kunci: "C",
    pembahasan:
      "Karena seluruh peserta olimpiade termasuk dalam kelas tambahan, sebagian peserta kelas tambahan pasti peserta olimpiade. Pilihan B membalik arah pernyataan, sedangkan A, D, dan E melampaui informasi yang ada.",
  },
  {
    tipe: "PG",
    stimulus:
      "Jika perpustakaan buka sampai sore, siswa dapat belajar di sana setelah pulang sekolah. Jika siswa dapat belajar di sana, jumlah peminjaman buku meningkat. Ternyata jumlah peminjaman buku tidak meningkat.",
    pertanyaan: "Simpulan yang sahih adalah …",
    opsi: [
      "Perpustakaan buka sampai sore.",
      "Siswa belajar di perpustakaan setelah pulang sekolah.",
      "Peminjaman buku akan meningkat bulan depan.",
      "Perpustakaan tidak buka sampai sore.",
      "Tidak dapat disimpulkan.",
    ],
    kunci: "D",
    pembahasan:
      "Dua premis itu membentuk rantai: buka sore → belajar di sana → peminjaman meningkat. Karena akibat terakhirnya tidak terjadi, sebab paling awal juga tidak terjadi (<i>modus tollens</i> berantai).",
  },
  {
    tipe: "PG",
    stimulus:
      "Sebuah kedai mengganti sedotan plastik dengan sedotan kertas. Pemiliknya beralasan langkah itu mengurangi sampah plastik yang sulit terurai.",
    pertanyaan: "Manakah informasi yang TIDAK relevan dengan alasan pemilik kedai?",
    opsi: [
      "Sedotan plastik memerlukan ratusan tahun untuk terurai.",
      "Sedotan kertas tersedia dalam berbagai warna yang menarik.",
      "Sampah sedotan plastik banyak ditemukan di pantai.",
      "Sedotan kertas dapat hancur dalam beberapa bulan.",
      "Sedotan plastik sekali pakai jarang didaur ulang.",
    ],
    kunci: "B",
    pembahasan:
      "Alasannya menyangkut penguraian sampah. Warna sedotan tidak ada hubungannya dengan cepat atau lambatnya sampah terurai.",
  },
  {
    tipe: "PG",
    stimulus:
      "Pemasangan lampu penerangan di gang membuat warga berani keluar rumah pada malam hari. Keberanian warga keluar malam membuat kegiatan ronda kembali hidup. Meskipun biaya listrik bertambah, warga tetap mempertahankan lampu itu karena kegiatan ronda kembali hidup.",
    pertanyaan: "Berdasarkan informasi tersebut, manakah pernyataan berikut yang BENAR?",
    opsi: [
      "Hidupnya kembali kegiatan ronda menyebabkan lampu dipasang.",
      "Biaya listrik bertambah supaya warga berani keluar malam.",
      "Warga mempertahankan lampu karena biaya listriknya bertambah.",
      "Lampu dipasang ketika kegiatan ronda sudah hidup.",
      "Pemasangan lampu penerangan menyebabkan kegiatan ronda kembali hidup.",
    ],
    kunci: "E",
    pembahasan:
      "Rantainya: lampu dipasang → warga berani keluar malam → ronda hidup kembali. Pilihan A dan D membalik urutan, sedangkan B dan C salah menempatkan biaya listrik sebagai sebab.",
  },
  {
    tipe: "PG",
    stimulus:
      "Panitia lomba memutuskan mengumumkan hasil lomba melalui papan pengumuman sekolah, bukan melalui media sosial. Mereka yakin cara itu membuat seluruh peserta dapat mengetahui hasilnya.",
    pertanyaan: "Keyakinan panitia bertumpu pada asumsi bahwa …",
    opsi: [
      "seluruh peserta membaca papan pengumuman sekolah",
      "media sosial sering mengalami gangguan jaringan",
      "papan pengumuman lebih murah daripada media sosial",
      "peserta lomba tidak memiliki telepon genggam",
      "panitia tidak memiliki akun media sosial",
    ],
    kunci: "A",
    pembahasan:
      "Agar “seluruh peserta tahu” terpenuhi, seluruh peserta harus benar-benar membaca papan itu. Tanpa asumsi tersebut, kesimpulan panitia runtuh.",
  },
  {
    tipe: "PG",
    stimulus:
      "Selama tiga bulan terakhir, jumlah pembeli sebuah warung makan menurun. Padahal harga, menu, dan jam bukanya tidak berubah. Pada waktu yang sama dibuka jalan pintas baru yang membuat kendaraan tidak lagi melewati depan warung itu.",
    pertanyaan: "Penyebab yang PALING MUNGKIN dari penurunan jumlah pembeli adalah …",
    opsi: [
      "rasa masakan warung itu menurun",
      "harga bahan pokok sedang naik",
      "pemilik warung jarang berada di tempat",
      "berkurangnya kendaraan yang melintas di depan warung",
      "pembeli beralih memasak sendiri di rumah",
    ],
    kunci: "D",
    pembahasan:
      "Bacaan menegaskan harga, menu, dan jam buka tidak berubah, lalu menyebut satu hal yang memang berubah pada waktu yang sama. Perubahan itulah yang paling mungkin menjadi sebabnya.",
  },
  {
    tipe: "PG",
    stimulus:
      "Seperti tabungan yang hanya bertambah bila disetor sedikit demi sedikit secara rutin, kemampuan berbahasa asing hanya tumbuh bila dilatih setiap hari walaupun sebentar.",
    pertanyaan: "Simpulan yang PALING MUNGKIN BENAR berdasarkan pernyataan tersebut adalah …",
    opsi: [
      "Belajar bahasa asing sehari penuh sekali sebulan lebih baik hasilnya.",
      "Tabungan tetap bertambah tanpa perlu disetor.",
      "Latihan singkat yang rutin lebih menentukan daripada latihan panjang yang jarang.",
      "Kemampuan berbahasa asing tidak mungkin dilatih.",
      "Menabung dan belajar bahasa sama-sama memerlukan biaya besar.",
    ],
    kunci: "C",
    pembahasan:
      "Titik temu kedua hal itu adalah kerutinan, bukan besarnya setoran maupun lamanya latihan. Pilihan A justru bertentangan dengan gagasan itu.",
  },
  {
    tipe: "PG",
    stimulus:
      "Seorang penjual berpendapat bahwa kenaikan penjualan tokonya bulan ini disebabkan oleh spanduk baru yang dipasang di depan toko.",
    pertanyaan: "Manakah yang PALING MELEMAHKAN pendapat penjual tersebut?",
    opsi: [
      "Bulan ini bertepatan dengan libur sekolah sehingga semua toko di kawasan itu ramai.",
      "Spanduk baru itu berwarna mencolok dan mudah terbaca dari jauh.",
      "Toko itu buka lebih pagi daripada biasanya.",
      "Spanduk lama sudah sobek di beberapa bagian.",
      "Pembeli mengaku menyukai penataan barang di toko itu.",
    ],
    kunci: "A",
    pembahasan:
      "Bila semua toko ikut ramai, kenaikan itu punya penjelasan lain yang berlaku umum. Sebab yang diajukan penjual pun kehilangan kekhususannya.",
  },
  {
    tipe: "PG",
    stimulus:
      "Lima siswa duduk berjajar menghadap papan tulis. Bayu duduk tepat di sebelah kanan Cindy. Dedi duduk paling kiri. Elsa duduk tepat di sebelah kiri Cindy. Fajar duduk di ujung kanan.",
    pertanyaan: "Urutan tempat duduk mereka dari kiri ke kanan adalah …",
    opsi: [
      "Dedi, Cindy, Elsa, Bayu, Fajar",
      "Dedi, Bayu, Cindy, Elsa, Fajar",
      "Dedi, Elsa, Bayu, Cindy, Fajar",
      "Dedi, Cindy, Bayu, Elsa, Fajar",
      "Dedi, Elsa, Cindy, Bayu, Fajar",
    ],
    kunci: "E",
    pembahasan:
      "Dedi mengisi ujung kiri dan Fajar ujung kanan. Urutan Elsa–Cindy–Bayu terkunci karena Elsa tepat di kiri Cindy dan Bayu tepat di kanan Cindy.",
  },
  {
    tipe: "PG",
    stimulus:
      "Hasil survei terhadap 200 siswa: 120 siswa mengikuti ekstrakurikuler olahraga, 90 siswa mengikuti ekstrakurikuler seni, dan 40 siswa mengikuti keduanya.",
    pertanyaan: "Pernyataan yang PASTI benar berdasarkan data tersebut adalah …",
    opsi: [
      "Seluruh siswa mengikuti setidaknya satu ekstrakurikuler.",
      "Terdapat 30 siswa yang tidak mengikuti kedua ekstrakurikuler itu.",
      "Siswa yang hanya mengikuti seni berjumlah 90 orang.",
      "Siswa yang hanya mengikuti olahraga berjumlah 120 orang.",
      "Ekstrakurikuler seni lebih diminati daripada olahraga.",
    ],
    kunci: "B",
    pembahasan:
      "Yang mengikuti setidaknya satu = 120 + 90 − 40 = 170, sehingga 200 − 170 = 30 siswa tidak mengikuti keduanya. Angka 90 dan 120 masih memuat 40 siswa yang mengikuti dua-duanya.",
  },
  {
    tipe: "PG",
    stimulus:
      "Sebuah sekolah melarang penjualan minuman berpemanis di kantin. Kepala sekolah beralasan kebijakan itu akan mengurangi jumlah siswa yang mengantuk pada pelajaran siang.",
    pertanyaan: "Manakah yang PALING MEMPERKUAT alasan kepala sekolah?",
    opsi: [
      "Minuman berpemanis paling laris dibeli saat jam istirahat.",
      "Kantin sekolah menjual banyak jenis makanan lain.",
      "Siswa lebih menyukai minuman dingin daripada minuman hangat.",
      "Lonjakan gula darah sesudah minum minuman manis biasanya diikuti rasa kantuk.",
      "Harga minuman berpemanis lebih murah daripada air mineral.",
    ],
    kunci: "D",
    pembahasan:
      "Yang memperkuat harus menyambungkan minuman manis dengan rasa kantuk. Pilihan A hanya menunjukkan minuman itu laku, bukan menjelaskan akibatnya.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Ingkaran dari pernyataan “Semua pengunjung museum membawa kartu pelajar” adalah …",
    opsi: [
      "Semua pengunjung museum tidak membawa kartu pelajar",
      "Tidak seorang pun pengunjung museum membawa kartu pelajar",
      "Ada pengunjung museum yang tidak membawa kartu pelajar",
      "Sebagian pengunjung museum membawa kartu pelajar",
      "Pengunjung museum harus membawa kartu pelajar",
    ],
    kunci: "C",
    pembahasan:
      "Ingkaran kata <i>semua</i> adalah <i>ada yang tidak</i>. Cukup satu pengunjung tanpa kartu pelajar untuk membatalkan pernyataan itu, jadi tidak perlu sampai “tidak seorang pun”.",
  },
  {
    tipe: "PG",
    stimulus:
      "Sebuah penelitian kecil menemukan bahwa siswa yang tidur lebih dari tujuh jam memperoleh nilai ujian lebih tinggi daripada siswa yang tidur kurang dari lima jam.",
    pertanyaan: "Simpulan yang TIDAK dapat ditarik dari temuan tersebut adalah …",
    opsi: [
      "Menambah jam tidur pasti menaikkan nilai ujian setiap siswa.",
      "Ada kaitan antara lama tidur dan nilai ujian pada kelompok yang diteliti.",
      "Kelompok yang tidur lebih lama memperoleh nilai yang lebih tinggi.",
      "Penelitian itu dilakukan pada kelompok siswa tertentu.",
      "Temuan itu belum tentu berlaku bagi seluruh siswa.",
    ],
    kunci: "A",
    pembahasan:
      "Temuan itu menunjukkan kaitan, bukan sebab-akibat, dan hanya berlaku pada kelompok yang diteliti. Menyimpulkan bahwa menambah jam tidur <i>pasti</i> menaikkan nilai setiap siswa adalah lompatan yang tidak didukung data.",
  },

  /* ---------------- Kuantitatif ---------------- */
  {
    tipe: "PG",
    pertanyaan:
      "Sebuah taman bermain mengenakan tarif masuk Rp15.000 ditambah Rp4.000 untuk setiap wahana pada 5 wahana pertama, lalu Rp2.000 untuk setiap wahana berikutnya.<br>Berapa biaya seorang pengunjung yang mencoba 9 wahana?",
    opsi: ["Rp35.000", "Rp37.000", "Rp39.000", "Rp41.000", "Rp43.000"],
    kunci: "E",
    pembahasan:
      "Tarif masuk 15.000, lima wahana pertama 5 × 4.000 = 20.000, empat wahana sisanya 4 × 2.000 = 8.000. Totalnya 15.000 + 20.000 + 8.000 = Rp43.000.",
  },
  {
    tipe: "PG",
    stimulus:
      "Jumlah penonton kanal A pada empat jam pertama berturut-turut 3, 12, 7, dan 16 orang; pada jam ke-6 sebanyak 20 orang. Jumlah penonton kanal B pada empat jam pertama berturut-turut 10, 7, 14, dan 11 orang; pada jam ke-6 sebanyak 15 orang.",
    pertanyaan:
      "Jika tren jumlah penonton kedua kanal itu konsisten, berapakah jumlah penonton masing-masing kanal pada jam ke-5?",
    opsi: ["11 dan 15", "11 dan 18", "25 dan 18", "7 dan 18", "11 dan 8"],
    kunci: "B",
    pembahasan:
      "Kanal A berpola +9 lalu −5: 3, 12, 7, 16, <b>11</b>, 20. Kanal B berpola −3 lalu +7: 10, 7, 14, 11, <b>18</b>, 15. Jam ke-6 pada kedua kanal cocok dengan pola itu.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Manakah bilangan berikut yang nilainya PALING MENDEKATI hasil pengurangan 7/4 − 65% ?",
    opsi: ["0,95", "1,00", "1,05", "1,10", "1,20"],
    kunci: "D",
    pembahasan: "7/4 = 1,75 dan 65% = 0,65, sehingga selisihnya 1,75 − 0,65 = 1,10.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Di sebuah panti, beras, minyak, dan gula dialokasikan dengan perbandingan 5 : 2 : 3 setiap bulan. Jika minyak yang digunakan selama 4 bulan adalah 48 liter, berapa kilogram beras yang dialokasikan untuk 6 bulan?",
    opsi: ["120", "150", "180", "200", "240"],
    kunci: "C",
    pembahasan:
      "Minyak sebulan 48 ÷ 4 = 12 satuan untuk 2 bagian, jadi satu bagian bernilai 6. Beras 5 bagian = 30 per bulan, sehingga 6 bulan memerlukan 6 × 30 = 180.",
  },
  {
    tipe: "PG",
    stimulus:
      "Diketahui P, Q, dan R adalah tiga koperasi. Berikut informasi mengenai jumlah anggotanya pada tahun ini.<br>(i) Anggota P adalah 2 kali anggota R<br>(ii) Anggota P lebih banyak 30 orang daripada anggota Q<br>(iii) Anggota Q 40% lebih sedikit daripada anggota R<br>(iv) Anggota Q berjumlah 60 orang",
    pertanyaan:
      "Informasi manakah yang dapat digunakan untuk menentukan jumlah anggota koperasi P?",
    opsi: ["(ii) dan (iv)", "(i) dan (ii)", "(i) dan (iii)", "(i) dan (iv)", "(ii) dan (iii)"],
    kunci: "A",
    pembahasan:
      "Dari (iv) anggota Q = 60, lalu (ii) memberi P = 60 + 30 = 90. Pasangan lain hanya menghasilkan perbandingan tanpa satu pun angka pasti, sehingga jumlah P tidak dapat ditentukan.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Harga sebuah barang naik 20%, lalu turun 10% dari harga yang baru itu.<br>Dibandingkan harga semula, harga akhirnya …",
    opsi: ["turun 10%", "tetap", "naik 10%", "naik 12%", "naik 8%"],
    kunci: "E",
    pembahasan:
      "Misal harga awal 100: naik 20% menjadi 120, lalu turun 10% dari 120 menjadi 108. Jadi naik 8%, bukan 10%, karena persentase kedua dihitung dari harga yang sudah berubah.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Rata-rata nilai 12 siswa kelompok A adalah 80, sedangkan rata-rata 8 siswa kelompok B adalah 70.<br>Rata-rata nilai seluruh 20 siswa itu adalah …",
    opsi: ["74", "76", "75", "77", "78"],
    kunci: "B",
    pembahasan:
      "Jumlah nilai = (12 × 80) + (8 × 70) = 960 + 560 = 1.520, dibagi 20 siswa menghasilkan 76. Menjawab 75 berarti merata-ratakan 80 dan 70 tanpa memperhatikan jumlah siswanya.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Sebuah kereta berangkat pukul 08.15 dan tiba pukul 12.45 dengan kecepatan rata-rata 80 km/jam.<br>Jarak yang ditempuh kereta itu adalah …",
    opsi: ["300 km", "340 km", "360 km", "380 km", "400 km"],
    kunci: "C",
    pembahasan: "Lama perjalanan 4,5 jam, sehingga jaraknya 80 × 4,5 = 360 km.",
  },

  /* ---------------- Pilihan ganda kompleks (Benar/Salah) ---------------- */
  {
    tipe: "PGK",
    stimulus:
      "Sebuah sekolah memasang tempat sampah terpilah di setiap lorong. Setelah tiga bulan, jumlah sampah plastik yang terkumpul secara terpisah meningkat tajam. Kepala sekolah menyimpulkan bahwa kesadaran siswa memilah sampah telah meningkat.",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Simpulan kepala sekolah bertumpu pada anggapan bahwa banyaknya sampah terpilah menandakan kesadaran siswa.",
      "Bila jumlah siswa bertambah banyak pada periode yang sama, simpulan kepala sekolah menjadi lebih lemah.",
      "Data mengenai jumlah sampah yang tidak terpilah tidak diperlukan untuk menguji simpulan itu.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Sampah terpilah bisa bertambah semata-mata karena jumlah siswa bertambah. Justru perbandingan dengan sampah yang tidak terpilah yang menunjukkan ada tidaknya perubahan kebiasaan.",
  },
  {
    tipe: "PGK",
    stimulus:
      "Sebuah toko menjual paket alat tulis. Paket A berisi 3 pena dan 2 buku seharga Rp29.000, sedangkan Paket B berisi 1 pena dan 4 buku seharga Rp38.000.",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Harga sebuah buku adalah Rp8.500.",
      "Harga sebuah pena adalah Rp4.000.",
      "Harga 2 pena dan 2 buku adalah Rp24.000.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Misal pena p dan buku b: 3p + 2b = 29.000 dan p + 4b = 38.000. Penyelesaiannya p = 4.000 dan b = 8.500. Maka 2 pena dan 2 buku berharga 8.000 + 17.000 = Rp25.000, bukan Rp24.000.",
  },
  {
    tipe: "PGK",
    stimulus:
      "Semua anggota tim debat mengikuti pelatihan menulis. Sebagian anggota tim debat juga mengikuti pelatihan berbicara. Tidak ada anggota tim paduan suara yang mengikuti pelatihan menulis.",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Ada anggota tim debat yang mengikuti dua pelatihan sekaligus.",
      "Tidak ada anggota tim paduan suara yang menjadi anggota tim debat.",
      "Semua peserta pelatihan menulis adalah anggota tim debat.",
      "Seluruh anggota tim debat mengikuti pelatihan berbicara.",
    ],
    kunci: ["B", "B", "S", "S"],
    pembahasan:
      "Anggota tim debat yang ikut pelatihan berbicara pasti juga ikut pelatihan menulis, jadi pernyataan pertama benar. Karena anggota tim debat semuanya ikut pelatihan menulis sedangkan anggota paduan suara tidak ada yang ikut, keduanya tidak mungkin beririsan. Pernyataan ketiga membalik arah, dan keempat mengubah <i>sebagian</i> menjadi <i>seluruh</i>.",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    pertanyaan:
      "Sebuah bilangan dikalikan 3 lalu ditambah 8, hasilnya sama dengan bilangan itu ditambah 20.<br>Berapakah bilangan itu?",
    kunci: "6",
    pembahasan: "Misal bilangannya x, maka 3x + 8 = x + 20 sehingga 2x = 12 dan x = 6.",
  },
];
