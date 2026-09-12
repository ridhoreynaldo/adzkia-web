/**
 * Warung Soal — PU (Penalaran Umum) Paket 3, kategori Easy.
 *
 * 30 butir: 26 pilihan ganda, 3 pilihan ganda kompleks, 1 isian singkat.
 * Model INTENS: kualitatif penalaran argumentatif, lalu kuantitatif.
 * Jenjang Easy — satu langkah penyelesaian, pengecoh jelas berbeda.
 */
export const SOAL = [
  /* ---------------- Kualitatif ---------------- */
  {
    tipe: "PG",
    stimulus:
      "Di Sekolah Harapan dipasang jaringan internet cepat yang menyebabkan guru dapat menayangkan video pembelajaran. Kemudahan menayangkan video membuat siswa lebih mudah memahami materi yang rumit. Meskipun biaya langganan bertambah, sekolah tetap mempertahankan jaringan itu karena siswa lebih mudah memahami materi yang rumit.",
    pertanyaan: "Berdasarkan informasi tersebut, manakah pernyataan berikut yang BENAR?",
    opsi: [
      "Biaya langganan bertambah supaya guru dapat menayangkan video.",
      "Pemahaman siswa menyebabkan jaringan internet cepat dipasang.",
      "Pemasangan jaringan internet cepat menyebabkan siswa lebih mudah memahami materi yang rumit.",
      "Jaringan internet dipasang ketika siswa sudah memahami materi.",
      "Video pembelajaran menyebabkan biaya langganan bertambah.",
    ],
    kunci: "C",
    pembahasan:
      "Rantai sebabnya searah: jaringan dipasang → guru dapat menayangkan video → siswa lebih mudah memahami. Pilihan B dan D membalik arah, sedangkan A dan E menempatkan biaya sebagai sebab.",
  },
  {
    tipe: "PG",
    stimulus:
      "Sebuah sekolah mengganti bel manual dengan bel otomatis. Kepala sekolah yakin pergantian jam pelajaran akan menjadi lebih tepat waktu.",
    pertanyaan: "Keyakinan kepala sekolah bertumpu pada asumsi bahwa …",
    opsi: [
      "bel otomatis lebih murah daripada bel manual",
      "para guru menyukai suara bel yang baru",
      "siswa dapat mendengar bel sampai ke lapangan",
      "keterlambatan selama ini disebabkan bel yang tidak dibunyikan tepat waktu",
      "aliran listrik sekolah tidak pernah padam",
    ],
    kunci: "D",
    pembahasan:
      "Mengganti bel hanya menyelesaikan masalah bila penyebab keterlambatannya memang terletak pada belnya. Tanpa asumsi itu, penggantian tidak menjamin apa pun.",
  },
  {
    tipe: "PG",
    stimulus:
      "Dimas memilih berlatih soal 45 menit setiap malam daripada berlatih enam jam sekali sepekan. Ia beralasan cara itu membuatnya lebih mudah mengingat rumus.",
    pertanyaan: "Manakah yang PALING MEMPERKUAT alasan Dimas?",
    opsi: [
      "Dimas memiliki banyak buku kumpulan latihan soal.",
      "Ingatan bertahan lebih lama bila pengulangan dilakukan berjarak dan berulang kali.",
      "Suasana rumah Dimas lebih sepi pada malam hari.",
      "Berlatih enam jam berturut-turut membuat Dimas kelelahan.",
      "Teman sekelas Dimas juga berlatih setiap malam.",
    ],
    kunci: "B",
    pembahasan:
      "Alasan Dimas menyangkut daya ingat, jadi penguatnya harus menyentuh cara kerja ingatan. Pilihan D hanya menyebut kelelahan, belum tentu berkaitan dengan mengingat rumus.",
  },
  {
    tipe: "PG",
    stimulus:
      "Pengelola perpustakaan menambah jam buka sampai pukul 18.00. Ia yakin jumlah peminjam buku akan bertambah.",
    pertanyaan: "Manakah yang PALING MELEMAHKAN keyakinan pengelola perpustakaan?",
    opsi: [
      "Rak buku baru dipasang pada bulan lalu.",
      "Jumlah petugas perpustakaan bertambah satu orang.",
      "Perpustakaan itu memiliki ruang baca yang luas.",
      "Buku baru datang setiap tiga bulan sekali.",
      "Seluruh siswa sudah dijemput pulang sebelum pukul 16.00.",
    ],
    kunci: "E",
    pembahasan:
      "Bila tidak ada seorang pun yang masih berada di sekolah sesudah pukul 16.00, tambahan jam buka itu tidak akan dipakai siapa pun.",
  },
  {
    tipe: "PG",
    stimulus:
      "Seperti halnya kacamata yang tidak menambah apa pun pada pemandangan, melainkan membuat yang sudah ada menjadi jelas, catatan yang rapi tidak menambah isi pelajaran, melainkan membuat isi itu mudah ditemukan kembali.",
    pertanyaan:
      "Berdasarkan paragraf tersebut, jika catatan rapi disamakan dengan kacamata, manakah simpulan yang PALING MUNGKIN BENAR?",
    opsi: [
      "Catatan yang rapi memudahkan siswa menemukan kembali isi pelajaran.",
      "Kacamata menambah keindahan sebuah pemandangan.",
      "Catatan yang rapi menambah jumlah materi pelajaran.",
      "Siswa yang berkacamata lebih pandai membuat catatan.",
      "Pelajaran sebaiknya tidak perlu dicatat sama sekali.",
    ],
    kunci: "A",
    pembahasan:
      "Kacamata tidak menambah objek, hanya memperjelas. Dengan pola yang sama, catatan rapi tidak menambah materi, hanya memudahkan menemukannya kembali.",
  },
  {
    tipe: "PG",
    stimulus:
      "Semua pengurus OSIS mengikuti rapat evaluasi. Sebagian peserta rapat evaluasi adalah siswa kelas XII.",
    pertanyaan: "Simpulan yang PASTI benar adalah …",
    opsi: [
      "Semua pengurus OSIS adalah siswa kelas XII.",
      "Semua peserta rapat evaluasi adalah pengurus OSIS.",
      "Sebagian peserta rapat evaluasi adalah pengurus OSIS.",
      "Tidak ada pengurus OSIS yang berasal dari kelas XII.",
      "Siswa kelas XII pasti menjadi pengurus OSIS.",
    ],
    kunci: "C",
    pembahasan:
      "Seluruh pengurus OSIS termasuk peserta rapat, jadi sebagian peserta rapat pasti pengurus OSIS. Pilihan B membalik arah, sedangkan A, D, dan E melampaui informasi.",
  },
  {
    tipe: "PG",
    stimulus:
      "Jika mesin fotokopi menyala, lampu indikatornya berwarna hijau. Pagi ini lampu indikatornya tidak berwarna hijau.",
    pertanyaan: "Simpulan yang sahih adalah …",
    opsi: [
      "Mesin fotokopi sedang menyala.",
      "Lampu indikator mesin itu rusak.",
      "Mesin fotokopi itu baru dibeli.",
      "Mesin fotokopi tidak menyala.",
      "Tidak dapat disimpulkan.",
    ],
    kunci: "D",
    pembahasan:
      "Penalaran <i>modus tollens</i>: dari “jika p maka q” dan “bukan q”, disimpulkan “bukan p”. Kerusakan lampu tidak disebut pada premis sehingga tidak boleh diandaikan.",
  },
  {
    tipe: "PG",
    stimulus:
      "Sebuah kantin sekolah mulai menyajikan air isi ulang dalam gelas kaca. Alasannya untuk mengurangi sampah gelas plastik.",
    pertanyaan: "Manakah informasi yang TIDAK relevan dengan alasan kantin tersebut?",
    opsi: [
      "Gelas plastik sekali pakai menumpuk setiap hari di tempat sampah.",
      "Gelas kaca tersedia dalam berbagai bentuk yang beragam.",
      "Sampah plastik memerlukan waktu lama untuk terurai di tanah.",
      "Gelas kaca dapat dicuci lalu dipakai berulang kali.",
      "Kantin membuang dua kantong gelas plastik setiap hari.",
    ],
    kunci: "B",
    pembahasan:
      "Alasan kantin menyangkut jumlah sampah. Beragamnya bentuk gelas kaca tidak menambah maupun mengurangi sampah.",
  },
  {
    tipe: "PG",
    stimulus:
      "Penambahan tempat duduk di taman kota membuat pengunjung betah berlama-lama. Pengunjung yang betah berlama-lama membuat pedagang kecil di sekitarnya lebih laris. Meskipun biaya perawatan taman naik, pemerintah kota mempertahankan tempat duduk itu karena pedagang kecil lebih laris.",
    pertanyaan: "Berdasarkan informasi tersebut, manakah pernyataan berikut yang BENAR?",
    opsi: [
      "Larisnya pedagang kecil menyebabkan tempat duduk ditambah.",
      "Biaya perawatan naik supaya pengunjung betah berlama-lama.",
      "Pedagang kecil menjadi laris karena biaya perawatan naik.",
      "Tempat duduk ditambah ketika pedagang kecil sudah laris.",
      "Penambahan tempat duduk menyebabkan pedagang kecil lebih laris.",
    ],
    kunci: "E",
    pembahasan:
      "Rantainya: tempat duduk ditambah → pengunjung betah → pedagang laris. Pilihan A dan D membalik urutan, sedangkan B dan C keliru menempatkan biaya perawatan sebagai sebab.",
  },
  {
    tipe: "PG",
    stimulus:
      "Sejak sebulan lalu, jumlah siswa yang terlambat di sebuah sekolah meningkat. Padahal jam masuk, rute angkutan, dan jarak rumah siswa tidak berubah. Pada waktu yang sama, satu-satunya jembatan menuju sekolah ditutup karena diperbaiki.",
    pertanyaan: "Penyebab yang PALING MUNGKIN dari meningkatnya keterlambatan adalah …",
    opsi: [
      "ditutupnya jembatan menuju sekolah",
      "siswa terbiasa bangun lebih siang",
      "jumlah guru piket berkurang",
      "jam masuk sekolah dimajukan",
      "angkutan umum menaikkan tarifnya",
    ],
    kunci: "A",
    pembahasan:
      "Bacaan menegaskan jam masuk, rute, dan jarak tidak berubah, lalu menyebut satu hal yang memang berubah pada waktu yang sama.",
  },
  {
    tipe: "PG",
    stimulus:
      "Seperti pelampung yang dipakai bukan supaya orang berhenti belajar berenang, melainkan supaya ia berani masuk ke air yang lebih dalam, contoh soal beserta pembahasannya diberikan bukan supaya siswa berhenti berpikir, melainkan supaya ia berani mencoba soal yang lebih sulit.",
    pertanyaan: "Simpulan yang PALING MUNGKIN BENAR berdasarkan paragraf tersebut adalah …",
    opsi: [
      "Pelampung membuat orang tidak perlu lagi belajar berenang.",
      "Pembahasan soal membuat siswa berani mencoba soal yang lebih sulit.",
      "Siswa sebaiknya tidak diberi contoh soal sama sekali.",
      "Belajar berenang lebih mudah daripada mengerjakan soal.",
      "Contoh soal membuat siswa berhenti berpikir sendiri.",
    ],
    kunci: "B",
    pembahasan:
      "Pelampung memberanikan, bukan menghentikan. Dengan pola yang sama, pembahasan soal memberanikan siswa mencoba yang lebih sulit.",
  },
  {
    tipe: "PG",
    stimulus:
      "Dari 180 siswa, 100 siswa mengikuti bimbingan matematika, 75 siswa mengikuti bimbingan bahasa Inggris, dan 35 siswa mengikuti keduanya.",
    pertanyaan: "Pernyataan yang PASTI benar berdasarkan data tersebut adalah …",
    opsi: [
      "Seluruh siswa mengikuti setidaknya satu bimbingan.",
      "Siswa yang hanya mengikuti bahasa Inggris berjumlah 75 orang.",
      "Siswa yang hanya mengikuti matematika berjumlah 100 orang.",
      "Terdapat 40 siswa yang tidak mengikuti kedua bimbingan itu.",
      "Bimbingan bahasa Inggris lebih diminati daripada matematika.",
    ],
    kunci: "D",
    pembahasan:
      "Yang mengikuti setidaknya satu = 100 + 75 − 35 = 140, sehingga 180 − 140 = 40 siswa tidak mengikuti keduanya. Angka 100 dan 75 masih memuat 35 siswa yang mengikuti dua-duanya.",
  },
  {
    tipe: "PG",
    stimulus:
      "Seorang pelatih berpendapat bahwa bertambahnya kemenangan timnya musim ini disebabkan oleh latihan tambahan pada pagi hari.",
    pertanyaan: "Manakah yang PALING MELEMAHKAN pendapat pelatih tersebut?",
    opsi: [
      "Musim ini timnya bertanding melawan lawan-lawan yang jauh lebih lemah.",
      "Latihan pagi membuat para pemain lebih disiplin.",
      "Latihan pagi dilaksanakan di lapangan sekolah.",
      "Pelatih itu sudah melatih tim tersebut sejak tahun lalu.",
      "Para pemain mengaku menyukai latihan pagi.",
    ],
    kunci: "A",
    pembahasan:
      "Bila lawannya memang jauh lebih lemah, kemenangan itu punya penjelasan lain. Pilihan B dan E justru memperkuat pendapat pelatih.",
  },
  {
    tipe: "PG",
    stimulus:
      "Lima buku disusun bertumpuk. Buku sejarah berada tepat di atas buku biologi. Buku kamus berada paling bawah. Buku novel berada paling atas. Buku fisika berada tepat di bawah buku biologi.",
    pertanyaan: "Urutan buku dari bawah ke atas adalah …",
    opsi: [
      "kamus, biologi, fisika, sejarah, novel",
      "kamus, fisika, sejarah, biologi, novel",
      "kamus, sejarah, biologi, fisika, novel",
      "kamus, biologi, sejarah, fisika, novel",
      "kamus, fisika, biologi, sejarah, novel",
    ],
    kunci: "E",
    pembahasan:
      "Kamus di dasar dan novel di puncak. Urutan fisika–biologi–sejarah terkunci karena fisika tepat di bawah biologi dan sejarah tepat di atas biologi.",
  },
  {
    tipe: "PG",
    stimulus:
      "Panitia memutuskan membagikan pengumuman lomba lewat grup kelas, bukan lewat papan pengumuman. Mereka yakin cara itu membuat pengumuman lebih cepat sampai kepada seluruh peserta.",
    pertanyaan: "Keyakinan panitia bertumpu pada asumsi bahwa …",
    opsi: [
      "papan pengumuman sekolah sedang diperbaiki",
      "panitia tidak sempat mencetak lembar pengumuman",
      "seluruh siswa tergabung dalam grup kelas dan membacanya",
      "grup kelas itu dibuat oleh wali kelas masing-masing",
      "pengumuman lomba berisi banyak halaman",
    ],
    kunci: "C",
    pembahasan:
      "Agar “sampai kepada seluruh peserta” terpenuhi, semua peserta harus berada di grup itu sekaligus membacanya. Tanpa asumsi tersebut, kesimpulan panitia runtuh.",
  },
  {
    tipe: "PG",
    stimulus:
      "Sebuah sekolah memindahkan ujian praktik memasak dari ruang kelas ke dapur sekolah. Kepala sekolah beralasan hasil ujian akan lebih menggambarkan kemampuan siswa yang sebenarnya.",
    pertanyaan: "Manakah yang PALING MEMPERKUAT alasan kepala sekolah?",
    opsi: [
      "Dapur sekolah lebih luas daripada ruang kelas.",
      "Kemampuan memasak hanya tampak bila diuji dengan peralatan yang sesungguhnya.",
      "Dapur sekolah baru saja direnovasi pada tahun ini.",
      "Guru memasak tinggal tidak jauh dari sekolah.",
      "Siswa menyukai kegiatan yang dilakukan di luar kelas.",
    ],
    kunci: "B",
    pembahasan:
      "Yang memperkuat harus menghubungkan tempat ujian dengan ketepatan penilaian. Luas ruangan dan kesukaan siswa tidak menyentuh hal itu.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Ingkaran dari pernyataan “Semua anggota paduan suara hadir pada gladi bersih” adalah …",
    opsi: [
      "Semua anggota paduan suara tidak hadir pada gladi bersih",
      "Tidak seorang pun anggota paduan suara hadir pada gladi bersih",
      "Sebagian anggota paduan suara hadir pada gladi bersih",
      "Ada anggota paduan suara yang tidak hadir pada gladi bersih",
      "Anggota paduan suara wajib hadir pada gladi bersih",
    ],
    kunci: "D",
    pembahasan:
      "Ingkaran kata <i>semua</i> adalah <i>ada yang tidak</i>. Cukup satu anggota yang tidak hadir untuk membatalkan pernyataan itu.",
  },
  {
    tipe: "PG",
    stimulus:
      "Sebuah survei menemukan bahwa siswa yang membaca buku di luar buku pelajaran memiliki perbendaharaan kata lebih banyak daripada siswa yang tidak membaca.",
    pertanyaan: "Simpulan yang TIDAK dapat ditarik dari temuan tersebut adalah …",
    opsi: [
      "Menyuruh setiap siswa membaca pasti menambah perbendaharaan katanya.",
      "Ada kaitan antara kebiasaan membaca dan perbendaharaan kata pada kelompok yang disurvei.",
      "Kelompok yang membaca memiliki perbendaharaan kata lebih banyak.",
      "Survei itu dilakukan pada sekelompok siswa tertentu.",
      "Temuan itu belum tentu berlaku bagi seluruh siswa.",
    ],
    kunci: "A",
    pembahasan:
      "Temuan itu menunjukkan kaitan, bukan sebab-akibat. Bisa jadi siswa yang perbendaharaan katanya sudah banyak justru yang lebih gemar membaca.",
  },

  /* ---------------- Kuantitatif ---------------- */
  {
    tipe: "PG",
    pertanyaan:
      "Sebuah warnet mengenakan tarif Rp5.000 untuk satu jam pertama dan Rp3.000 untuk setiap jam berikutnya.<br>Berapa biaya memakai warnet selama 5 jam?",
    opsi: ["Rp15.000", "Rp15.500", "Rp16.000", "Rp16.500", "Rp17.000"],
    kunci: "E",
    pembahasan:
      "Jam pertama Rp5.000, lalu empat jam berikutnya 4 × Rp3.000 = Rp12.000. Totalnya Rp17.000.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Jumlah anak yang mengikuti kelas mengaji pada empat pekan pertama berturut-turut 8, 13, 18, dan 23 orang.<br>Bila trennya tetap, jumlah anak pada pekan ke-7 adalah …",
    opsi: ["28 orang", "33 orang", "38 orang", "43 orang", "48 orang"],
    kunci: "C",
    pembahasan:
      "Tiap pekan bertambah 5 orang, sehingga pekan ke-5 ada 28, pekan ke-6 ada 33, dan pekan ke-7 ada 38 orang.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Manakah bilangan berikut yang nilainya PALING MENDEKATI hasil pengurangan 9/5 − 55% ?",
    opsi: ["1,05", "1,25", "1,45", "1,60", "1,85"],
    kunci: "B",
    pembahasan: "9/5 = 1,8 dan 55% = 0,55, sehingga selisihnya 1,8 − 0,55 = 1,25.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Di sebuah katering, nasi, lauk, dan sayur dimasak dengan perbandingan 6 : 3 : 2 setiap hari. Bila lauk yang dimasak selama 4 hari adalah 36 kg, berapa kg nasi yang dimasak selama 5 hari?",
    opsi: ["60", "72", "80", "90", "100"],
    kunci: "D",
    pembahasan:
      "Lauk sehari 36 ÷ 4 = 9 kg untuk 3 bagian, jadi satu bagian 3 kg. Nasi 6 bagian = 18 kg per hari, sehingga 5 hari memerlukan 90 kg.",
  },
  {
    tipe: "PG",
    stimulus:
      "Diketahui X, Y, dan Z adalah tiga toko. Berikut informasi mengenai pendapatannya pada tahun ini.<br>(i) Pendapatan X adalah 4 kali pendapatan Z<br>(ii) Pendapatan X lebih besar Rp15 juta daripada pendapatan Y<br>(iii) Pendapatan Y 25% lebih kecil daripada pendapatan Z<br>(iv) Pendapatan Y adalah Rp35 juta",
    pertanyaan: "Informasi manakah yang dapat digunakan untuk menentukan pendapatan toko X?",
    opsi: ["(ii) dan (iv)", "(i) dan (ii)", "(i) dan (iii)", "(i) dan (iv)", "(iii) dan (iv)"],
    kunci: "A",
    pembahasan:
      "Dari (iv) pendapatan Y = 35 juta, lalu (ii) memberi X = 35 + 15 = Rp50 juta. Pasangan lain hanya menghasilkan perbandingan atau angka untuk toko selain X.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Harga sebuah barang naik 25%, lalu turun 20% dari harga yang baru itu.<br>Dibandingkan harga semula, harga akhirnya …",
    opsi: ["naik 5%", "naik 10%", "turun 5%", "turun 10%", "tetap"],
    kunci: "E",
    pembahasan:
      "Misal harga awal 100: naik 25% menjadi 125, lalu turun 20% dari 125 menjadi 100. Jadi harganya kembali seperti semula.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Rata-rata nilai 15 siswa kelompok A adalah 78, sedangkan rata-rata 5 siswa kelompok B adalah 90.<br>Rata-rata nilai seluruh 20 siswa itu adalah …",
    opsi: ["79", "80", "81", "82", "84"],
    kunci: "C",
    pembahasan:
      "Jumlah nilai = (15 × 78) + (5 × 90) = 1.170 + 450 = 1.620, dibagi 20 siswa menghasilkan 81. Menjawab 84 berarti merata-ratakan 78 dan 90 tanpa memperhatikan jumlah siswanya.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Sebuah kapal berangkat pukul 06.45 dan tiba pukul 10.15 dengan kecepatan rata-rata 24 km/jam.<br>Jarak yang ditempuh kapal itu adalah …",
    opsi: ["72 km", "78 km", "84 km", "90 km", "96 km"],
    kunci: "C",
    pembahasan: "Lama perjalanan 3 jam 30 menit atau 3,5 jam, sehingga jaraknya 24 × 3,5 = 84 km.",
  },

  /* ---------------- Pilihan ganda kompleks ---------------- */
  {
    tipe: "PGK",
    stimulus:
      "Sebuah sekolah memasang cermin besar di dekat pintu keluar. Sebulan kemudian, jumlah siswa yang berseragam rapi meningkat. Wakil kepala sekolah menyimpulkan bahwa kesadaran siswa berpakaian rapi telah meningkat.",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Simpulan itu bertumpu pada anggapan bahwa kerapian yang teramati menandakan kesadaran siswa.",
      "Bila pada bulan yang sama diadakan razia kerapian, simpulan itu menjadi lebih lemah.",
      "Cara mengukur kerapian tidak perlu dijelaskan untuk menguji simpulan tersebut.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Kerapian bisa meningkat karena razia, bukan kesadaran. Karena itu cara mengukurnya justru menjadi hal pertama yang perlu diperiksa.",
  },
  {
    tipe: "PGK",
    stimulus:
      "Sebuah toko menjual 3 buku gambar dan 2 spidol seharga Rp37.000, sedangkan 1 buku gambar dan 4 spidol seharga Rp39.000.",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Harga sebuah spidol adalah Rp8.000.",
      "Harga sebuah buku gambar adalah Rp7.000.",
      "Harga 2 buku gambar dan 2 spidol adalah Rp32.000.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Misal buku gambar b dan spidol s: 3b + 2s = 37.000 dan b + 4s = 39.000. Penyelesaiannya b = 7.000 dan s = 8.000, sehingga 2 buku dan 2 spidol berharga 14.000 + 16.000 = Rp30.000.",
  },
  {
    tipe: "PGK",
    stimulus: "Diketahui barisan bilangan 6, 11, 16, 21, ….",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Beda antarsuku barisan tersebut adalah 5.",
      "Suku ke-9 barisan tersebut adalah 46.",
      "Rumus suku ke-<i>n</i> barisan tersebut adalah U<sub>n</sub> = 5<i>n</i>.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Bedanya 5 dan suku ke-9 = 6 + 8(5) = 46. Rumus yang benar U<sub>n</sub> = 5n + 1, sebab untuk n = 1 harus menghasilkan 6.",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    pertanyaan:
      "Sebuah bilangan ditambah 7 lalu dikalikan 2, hasilnya 30.<br>Berapakah bilangan itu?",
    kunci: "8",
    pembahasan: "Misal bilangannya x, maka 2(x + 7) = 30 sehingga x + 7 = 15 dan x = 8.",
  },
];
