/**
 * Warung Soal — LIT. Bahasa Indonesia (LBIND) Paket 1, kategori Easy.
 *
 * 30 butir: 26 pilihan ganda, 3 pilihan ganda kompleks, 1 isian singkat.
 *
 * Modelnya mengikuti naskah Tryout Prosus Inten: bacaan panjang lalu
 * ditanyakan isi, sikap tokoh, hubungan antarkalimat, analogi situasi,
 * dan pernyataan yang TIDAK sesuai. Karena jenjang Easy, bacaannya pendek
 * dan jawabannya masih dapat ditelusuri langsung dari teks. Seluruh bacaan
 * ditulis sendiri untuk keperluan latihan.
 */

const TEKS_1 = `<p><b>Teks 1</b></p><p>(1) Di sebuah kota pesisir, pasar ikan yang dahulu becek dan berbau kini berlantai keramik. (2) Perubahan itu bermula dari keluhan pembeli yang enggan berbelanja lama-lama. (3) Pengelola pasar lalu memasang saluran air tertutup dan menyediakan es batu di setiap lapak. (4) Pedagang semula menolak karena biaya kebersihan dibebankan kepada mereka. (5) Namun, sesudah tiga bulan, jumlah pembeli naik hampir sepertiga. (6) Pedagang yang tadinya menolak kini justru paling rajin menyikat lapaknya. (7) Seorang pedagang berkata bahwa ikan yang sama ternyata laku lebih mahal bila dipajang di tempat yang bersih. (8) Pengelola menilai keberhasilan itu bukan karena aturan yang keras, melainkan karena pedagang melihat sendiri hasilnya. (9) Kota lain yang meniru cara ini gagal sebab hanya membangun lantai baru tanpa mengubah cara membuang air. (10) Kebersihan pasar, kata pengelola, adalah kebiasaan, bukan bangunan.</p>`;

const TEKS_2 = `<p><b>Teks 2</b></p><p>(1) Nenek menyimpan sekaleng biskuit di lemari atas, dan kaleng itu tidak pernah berisi biskuit. (2) Di dalamnya ada benang, kancing, jarum, dan beberapa lembar uang yang sudah tidak berlaku. (3) Setiap kali bajuku sobek, nenek naik ke kursi kayu untuk mengambil kaleng itu. (4) Ia menjahit sambil bercerita tentang kancing yang berasal dari baju kakek. (5) Aku dahulu bosan mendengarnya. (6) Kini kaleng itu ada di lemariku, dan aku belum pernah membukanya. (7) Bukan karena bajuku tidak pernah sobek. (8) Melainkan karena aku tahu, begitu tutupnya kubuka, suara nenek akan terdengar lagi.</p>`;

const TEKS_3 = `<p><b>Teks 3</b></p><p>(1) Sebuah puskesmas mendata kunjungan pasien selama empat bulan pertama tahun ini. (2) Hasilnya disajikan dalam tabel berikut.</p><table><tr><th>Bulan</th><th>Batuk pilek</th><th>Sakit gigi</th><th>Cedera ringan</th></tr><tr><td>Januari</td><td>120</td><td>45</td><td>30</td></tr><tr><td>Februari</td><td>150</td><td>40</td><td>28</td></tr><tr><td>Maret</td><td>90</td><td>52</td><td>35</td></tr><tr><td>April</td><td>70</td><td>60</td><td>40</td></tr></table><p>(3) Petugas menilai penurunan kunjungan batuk pilek berkaitan dengan berakhirnya musim hujan. (4) Namun, ia mengingatkan bahwa tabel itu hanya mencatat pasien yang datang, bukan seluruh warga yang sakit. (5) Sebagian warga memilih berobat sendiri di rumah.</p>`;

export const SOAL = [
  /* ---------------- Teks 1 ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Gagasan utama Teks 1 adalah …",
    opsi: [
      "Cara memasang saluran air tertutup di pasar ikan",
      "Pasar ikan menjadi bersih setelah pedagang melihat sendiri manfaatnya",
      "Pedagang ikan menolak membayar biaya kebersihan",
      "Jumlah pembeli di pasar ikan naik hampir sepertiga",
      "Kota lain gagal meniru pembangunan pasar ikan",
    ],
    kunci: "B",
    pembahasan:
      "Bacaan bergerak dari keluhan, penolakan pedagang, hingga berubahnya sikap mereka. Kalimat (8) merumuskan intinya: yang mengubah keadaan adalah bukti yang dilihat sendiri, bukan aturan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Alasan pedagang semula menolak perubahan tersebut adalah …",
    opsi: [
      "lapak mereka menjadi lebih sempit",
      "es batu sulit diperoleh di kota itu",
      "jumlah pembeli berkurang sesudah perbaikan",
      "biaya kebersihan dibebankan kepada mereka",
      "saluran air tertutup sering tersumbat",
    ],
    kunci: "D",
    pembahasan: "Alasannya disebut langsung pada kalimat (4).",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Kalimat (6) pada Teks 1 menunjukkan bahwa …",
    opsi: [
      "sikap pedagang berubah setelah mereka melihat hasilnya",
      "pengelola memaksa pedagang menyikat lapaknya",
      "pedagang lama digantikan oleh pedagang baru",
      "lapak yang kotor ditutup oleh pengelola pasar",
      "pembeli ikut membantu membersihkan lapak",
    ],
    kunci: "A",
    pembahasan:
      "Kata <i>yang tadinya menolak</i> dan <i>kini justru paling rajin</i> menandai perubahan sikap, yang sebabnya dijelaskan kalimat (5) dan (7).",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan:
      "Maksud ungkapan <i>kebersihan pasar adalah kebiasaan, bukan bangunan</i> pada kalimat (10) adalah …",
    opsi: [
      "bangunan pasar tidak perlu diperbaiki sama sekali",
      "lantai keramik lebih mahal daripada membangun kebiasaan",
      "pedagang harus membangun sendiri lapaknya",
      "kebiasaan lama sangat sulit untuk diubah",
      "yang menentukan bukan wujud fisiknya, melainkan perilaku orangnya",
    ],
    kunci: "E",
    pembahasan:
      "Kalimat (9) memberi buktinya: kota yang hanya membangun lantai baru tetap gagal karena perilakunya tidak berubah.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Penyebab kegagalan kota lain menurut Teks 1 adalah …",
    opsi: [
      "pedagangnya menolak membayar biaya kebersihan",
      "pasarnya berukuran terlalu kecil",
      "hanya membangun lantai tanpa mengubah cara membuang air",
      "jumlah pembelinya jauh lebih sedikit",
      "tidak ada es batu yang tersedia di lapak",
    ],
    kunci: "C",
    pembahasan: "Sebabnya tertulis pada kalimat (9).",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Sikap pengelola pasar dalam Teks 1 dapat digambarkan sebagai …",
    opsi: [
      "memaksakan aturan tanpa penjelasan apa pun",
      "membiarkan pedagang menilai sendiri hasilnya",
      "menyalahkan pedagang yang semula menolak",
      "menunggu bantuan dari kota lain",
      "menyerah sesudah gagasannya ditolak pedagang",
    ],
    kunci: "B",
    pembahasan:
      "Kalimat (8) menegaskan penilaian pengelola sendiri: keberhasilan datang karena pedagang melihat hasilnya, bukan karena aturan yang keras.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Hubungan antara kalimat (4) dan kalimat (5) pada Teks 1 adalah …",
    opsi: [
      "sebab dan akibat",
      "penambahan keterangan",
      "pilihan di antara dua hal",
      "pertentangan",
      "perincian contoh",
    ],
    kunci: "D",
    pembahasan:
      "Kalimat (4) memuat penolakan, lalu kalimat (5) dibuka kata <i>namun</i> dan memuat hasil yang berlawanan dengan penolakan itu.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Pernyataan yang TIDAK sesuai dengan Teks 1 adalah …",
    opsi: [
      "Pengelola pasar menutup lapak pedagang yang menolak",
      "Pasar itu dahulu becek dan berbau",
      "Es batu disediakan di setiap lapak",
      "Jumlah pembeli naik hampir sepertiga",
      "Ikan yang sama laku lebih mahal di tempat yang bersih",
    ],
    kunci: "A",
    pembahasan:
      "Bacaan tidak pernah menyebut adanya penutupan lapak. Empat pilihan lain tertulis pada kalimat (1), (3), (5), dan (7).",
  },
  {
    tipe: "PG",
    stimulus: TEKS_1,
    pertanyaan: "Keberhasilan pasar ikan dalam Teks 1 dapat dianalogikan seperti …",
    opsi: [
      "Warga menolak membayar iuran keamanan meskipun kampungnya rawan.",
      "Sekolah membangun gedung baru, tetapi jumlah siswanya tetap.",
      "Pedagang kaki lima digusur karena mengganggu lalu lintas.",
      "Sebuah desa membeli mesin baru yang tidak ada seorang pun bisa memakainya.",
      "Petani mau memakai pupuk baru sesudah melihat panen tetangganya meningkat.",
    ],
    kunci: "E",
    pembahasan:
      "Polanya sama: orang berubah bukan karena diperintah, melainkan karena menyaksikan bukti keberhasilannya sendiri. Pilihan B dan D justru menggambarkan kegagalan kota peniru pada kalimat (9).",
  },

  /* ---------------- Teks 2 ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Amanat yang paling tepat dari Teks 2 adalah …",
    opsi: [
      "Kaleng bekas sebaiknya dipakai menyimpan benang dan jarum",
      "Seorang anak harus rajin menjahit bajunya sendiri",
      "Benda sederhana dapat menyimpan kenangan yang berat",
      "Orang tua sebaiknya tidak terlalu banyak bercerita",
      "Uang lama sebaiknya segera ditukarkan ke bank",
    ],
    kunci: "C",
    pembahasan:
      "Kaleng biskuit itu tidak berharga secara benda, tetapi menahan tokoh <i>aku</i> membukanya karena kenangan yang melekat padanya.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Watak tokoh nenek dalam Teks 2 adalah …",
    opsi: [
      "pemarah dan tertutup",
      "telaten dan gemar bercerita",
      "boros dan gemar berbelanja",
      "pendiam dan tidak peduli",
      "penakut dan mudah menyerah",
    ],
    kunci: "B",
    pembahasan:
      "Kalimat (3) dan (4) menunjukkan nenek mau naik kursi setiap kali baju cucunya sobek, dan menjahit sambil bercerita.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Kalimat (5) menunjukkan bahwa tokoh <i>aku</i> pada waktu itu …",
    opsi: [
      "sangat menyayangi neneknya",
      "rajin membantu neneknya menjahit",
      "merasa takut kepada neneknya",
      "belum memahami arti cerita neneknya",
      "ingin segera memiliki kaleng itu",
    ],
    kunci: "D",
    pembahasan:
      "Kata <i>dahulu bosan</i> dipertentangkan dengan keadaan sekarang pada kalimat (6) sampai (8), yang menunjukkan pemahamannya baru datang belakangan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Alasan tokoh <i>aku</i> belum pernah membuka kaleng itu adalah …",
    opsi: [
      "ia belum siap menghadapi kenangan tentang neneknya",
      "kaleng itu terkunci dan sulit dibuka",
      "ia sudah tidak memerlukan benang dan jarum",
      "bajunya tidak pernah sobek lagi",
      "kaleng itu disimpan di lemari yang terlalu tinggi",
    ],
    kunci: "A",
    pembahasan:
      "Kalimat (7) menyangkal alasan bajunya tidak sobek, lalu kalimat (8) memberi alasan yang sebenarnya: kenangan tentang suara nenek.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Maksud kalimat (8) pada Teks 2 adalah …",
    opsi: [
      "Nenek akan kembali datang bila kaleng itu dibuka",
      "Di dalam kaleng tersimpan rekaman suara nenek",
      "Kaleng itu mengeluarkan bunyi ketika tutupnya dibuka",
      "Tokoh aku takut mendengar suara-suara aneh",
      "Membuka kaleng itu akan membangkitkan kenangan tentang nenek",
    ],
    kunci: "E",
    pembahasan:
      "Ungkapan itu kias. Yang akan terdengar bukan suara sungguhan, melainkan ingatan tentang cerita nenek saat menjahit.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Konflik yang menonjol pada Teks 2 tergolong konflik …",
    opsi: [
      "fisik antartokoh",
      "antara tokoh dan alam",
      "batin dalam diri tokoh",
      "antara tokoh dan masyarakat",
      "antara dua kelompok",
    ],
    kunci: "C",
    pembahasan:
      "Tidak ada pertengkaran maupun bencana dalam kutipan itu. Yang bergolak adalah perasaan tokoh <i>aku</i> sendiri terhadap kenangannya.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Kalimat (7) dan kalimat (8) disusun dengan cara …",
    opsi: [
      "mengulang pertanyaan yang sama",
      "menyangkal dugaan lalu memberikan alasan yang sebenarnya",
      "memerinci isi kaleng biskuit",
      "membandingkan dua tokoh cerita",
      "menyebutkan urutan waktu kejadian",
    ],
    kunci: "B",
    pembahasan:
      "Pasangan <i>bukan karena …</i> lalu <i>melainkan karena …</i> adalah pola menyangkal kemudian meluruskan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_2,
    pertanyaan: "Kesan yang paling kuat ditimbulkan Teks 2 adalah …",
    opsi: ["gembira", "tegang", "lucu", "haru", "marah"],
    kunci: "D",
    pembahasan:
      "Cerita ditutup dengan kenangan tentang nenek yang sudah tiada, sehingga kesan yang tertinggal adalah keharuan, bukan ketegangan maupun kelucuan.",
  },

  /* ---------------- Teks 3 ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Berdasarkan tabel, kunjungan batuk pilek tertinggi terjadi pada bulan …",
    opsi: [
      "Februari",
      "Januari",
      "Maret",
      "April",
      "Januari dan Februari sama banyak",
    ],
    kunci: "A",
    pembahasan: "Kolom batuk pilek menunjukkan Februari 150 kunjungan, tertinggi di antara empat bulan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Selisih kunjungan sakit gigi antara Januari dan April adalah …",
    opsi: ["5", "8", "10", "12", "15"],
    kunci: "E",
    pembahasan: "Januari 45 dan April 60, sehingga selisihnya 60 − 45 = 15 kunjungan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Kecenderungan yang tampak dari tabel tersebut adalah …",
    opsi: [
      "Semua jenis keluhan menurun dari Januari ke April",
      "Cedera ringan menurun dari Januari ke April",
      "Batuk pilek menurun, sedangkan sakit gigi meningkat",
      "Sakit gigi menurun dari Januari ke April",
      "Kunjungan pada bulan Maret paling banyak",
    ],
    kunci: "C",
    pembahasan:
      "Batuk pilek turun 150 → 90 → 70 sejak Februari, sedangkan sakit gigi naik 40 → 52 → 60. Cedera ringan justru bertambah, sehingga pilihan A dan B keliru.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Berdasarkan kalimat (4), keterbatasan data pada tabel tersebut adalah …",
    opsi: [
      "jumlah bulan yang didata terlalu sedikit",
      "data hanya mencatat pasien yang datang, bukan semua warga yang sakit",
      "data tidak mencantumkan usia pasien",
      "data dikumpulkan selama satu tahun penuh",
      "data hanya berasal dari satu desa saja",
    ],
    kunci: "B",
    pembahasan:
      "Peringatan petugas itu ditegaskan lagi oleh kalimat (5): sebagian warga memilih berobat sendiri di rumah sehingga tidak tercatat.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Jumlah kunjungan cedera ringan selama empat bulan tersebut adalah …",
    opsi: ["120", "125", "130", "133", "140"],
    kunci: "D",
    pembahasan: "Jumlahnya 30 + 28 + 35 + 40 = 133 kunjungan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Alasan yang dikemukakan petugas atas penurunan kunjungan batuk pilek adalah …",
    opsi: [
      "naiknya biaya berobat di puskesmas",
      "berkurangnya jumlah penduduk di wilayah itu",
      "berakhirnya musim hujan",
      "puskesmas tutup lebih awal daripada biasanya",
      "warga beralih berobat ke rumah sakit",
    ],
    kunci: "C",
    pembahasan: "Alasan itu tertulis pada kalimat (3).",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Pernyataan yang TIDAK dapat dibuktikan dengan tabel tersebut adalah …",
    opsi: [
      "Kunjungan batuk pilek pada April paling sedikit",
      "Kunjungan sakit gigi pada April lebih banyak daripada Januari",
      "Cedera ringan pada Maret lebih banyak daripada Januari",
      "Februari mencatat kunjungan batuk pilek terbanyak",
      "Warga yang berobat sendiri di rumah lebih banyak daripada yang datang",
    ],
    kunci: "E",
    pembahasan:
      "Tabel hanya memuat pasien yang datang. Jumlah warga yang berobat sendiri tidak pernah dicatat, sehingga perbandingannya tidak dapat dibuktikan.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Kalimat (3) pada Teks 3 berisi …",
    opsi: [
      "fakta hasil pendataan puskesmas",
      "rangkuman seluruh isi tabel",
      "pendapat petugas puskesmas",
      "saran yang diajukan warga",
      "simpulan akhir dari bacaan",
    ],
    kunci: "C",
    pembahasan:
      "Kata <i>menilai</i> menandai penilaian pribadi. Angka pada tabel adalah faktanya, sedangkan kaitannya dengan musim hujan adalah tafsiran petugas.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_3,
    pertanyaan: "Simpulan yang paling tepat untuk Teks 3 adalah …",
    opsi: [
      "Data itu menunjukkan kecenderungan yang masih perlu ditelusuri lebih lanjut",
      "Warga di wilayah itu semakin jarang jatuh sakit",
      "Puskesmas perlu segera menambah dokter gigi",
      "Musim hujan tidak berpengaruh terhadap kesehatan warga",
      "Seluruh warga yang sakit sudah datang ke puskesmas",
    ],
    kunci: "A",
    pembahasan:
      "Kalimat (4) dan (5) menegaskan data itu belum menggambarkan keadaan sebenarnya, sehingga simpulan apa pun masih perlu diuji lebih lanjut.",
  },

  /* ---------------- Pilihan ganda kompleks (Benar/Salah) ---------------- */
  {
    tipe: "PGK",
    stimulus: TEKS_1,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 1.",
    opsi: [
      "Pasar ikan itu dahulu becek dan berbau.",
      "Pedagang menyambut baik perubahan tersebut sejak awal.",
      "Jumlah pembeli naik hampir sepertiga sesudah tiga bulan.",
    ],
    kunci: ["B", "S", "B"],
    pembahasan:
      "Kalimat (4) justru menyebut pedagang semula menolak. Dua pernyataan lain sesuai kalimat (1) dan (5).",
  },
  {
    tipe: "PGK",
    stimulus: TEKS_2,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 2.",
    opsi: [
      "Kaleng biskuit itu tidak pernah berisi biskuit.",
      "Nenek menjahit sambil bercerita tentang kancing dari baju kakek.",
      "Tokoh <i>aku</i> sudah membuka kaleng itu berkali-kali.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Kalimat (6) menyatakan tokoh <i>aku</i> belum pernah membukanya, sehingga pernyataan ketiga salah.",
  },
  {
    tipe: "PGK",
    stimulus: TEKS_3,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan tabel Teks 3.",
    opsi: [
      "Kunjungan sakit gigi pada April lebih banyak daripada Januari.",
      "Tabel tersebut memuat jumlah seluruh warga yang sakit.",
      "Kunjungan batuk pilek terus menurun sejak Februari.",
      "Cedera ringan paling sedikit tercatat pada bulan Februari.",
    ],
    kunci: ["B", "S", "B", "B"],
    pembahasan:
      "Sakit gigi 45 → 60 dan batuk pilek 150 → 90 → 70. Cedera ringan terkecil 28 pada Februari. Tabel hanya memuat pasien yang datang, sesuai peringatan kalimat (4).",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    stimulus: TEKS_2,
    pertanyaan:
      "Pada kalimat (1) Teks 2, nenek menyimpan benang dan jarumnya di dalam sebuah … (tulis satu kata)",
    kunci: "kaleng",
    pembahasan:
      "Kalimat (1) menyebut “sekaleng biskuit” yang isinya bukan biskuit, dan kalimat (2) memerinci isinya. Jadi jawabannya <i>kaleng</i>.",
  },
];
