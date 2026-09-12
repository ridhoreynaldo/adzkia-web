/**
 * Warung Soal — PM (Penalaran Matematika) Paket 2, kategori Easy.
 *
 * 20 butir: 15 pilihan ganda, 3 pilihan ganda kompleks, 2 isian singkat.
 *
 * Modelnya mengikuti naskah Tryout Prosus Inten: tiap butir bertumpu pada
 * TEKS konteks, dan satu teks dipakai beberapa soal berturut-turut. Ikut
 * dipakai bentuk khas PM, yaitu memilih pernyataan benar dari daftar
 * (1)-(4). Grafik dan denah ada di `public/warung/PM-2/`.
 */

const GRAFIK = "/warung/PM-2/grafik-tinggi-tanaman.svg";
const DENAH = "/warung/PM-2/denah-taman.svg";
const AIR = "/warung/PM-2/diagram-batang-air.svg";

const TEKS_KANTIN = `<p><b>Teks 1</b></p><p>Di kantin sebuah sekolah, Rania membeli 2 roti dan 3 susu kotak seharga Rp23.000,00. Pada hari yang sama, Keisha membeli 4 roti dan 1 susu kotak seharga Rp21.000,00. Harga tiap jenis barang di kantin itu tetap sepanjang hari.</p>`;

const TEKS_TANAMAN = `<p><b>Teks 2</b></p><p>Seorang siswa mengukur tinggi tanaman percobaannya setiap akhir pekan selama lima minggu. Hasil pengukurannya disajikan pada grafik berikut.</p>`;

const TEKS_TAMAN = `<p><b>Teks 3</b></p><p>Sebuah sekolah memiliki taman berbentuk persegi panjang dengan sebuah kolam di dalamnya seperti denah berikut.</p>`;

const TEKS_AIR = `<p><b>Teks 4</b></p><p>Petugas kebersihan mencatat pemakaian air sebuah sekolah selama lima hari kerja seperti pada diagram berikut.</p>`;

export const SOAL = [
  /* ---------------- Teks 1: kantin ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_KANTIN,
    pertanyaan: "Harga sebuah roti di kantin tersebut adalah …",
    opsi: ["Rp2.500,00", "Rp3.000,00", "Rp3.500,00", "Rp4.000,00", "Rp4.500,00"],
    kunci: "D",
    pembahasan:
      "Misal roti r dan susu s: 2r + 3s = 23.000 dan 4r + s = 21.000. Dari persamaan kedua s = 21.000 − 4r. Substitusi ke yang pertama: 2r + 63.000 − 12r = 23.000, sehingga 10r = 40.000 dan r = Rp4.000,00.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_KANTIN,
    pertanyaan:
      "Andi membeli 3 roti dan 2 susu kotak, lalu membayar dengan selembar uang Rp30.000,00.<br>Uang kembalian yang ia terima adalah …",
    opsi: ["Rp4.000,00", "Rp5.000,00", "Rp6.000,00", "Rp7.000,00", "Rp8.000,00"],
    kunci: "E",
    pembahasan:
      "Harga roti Rp4.000,00 dan susu Rp5.000,00, sehingga belanjanya 3(4.000) + 2(5.000) = 22.000. Kembaliannya 30.000 − 22.000 = Rp8.000,00.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_KANTIN,
    pertanyaan: "Selisih harga dua buah roti dengan harga sebuah susu kotak adalah …",
    opsi: ["Rp3.000,00", "Rp4.000,00", "Rp5.000,00", "Rp6.000,00", "Rp7.000,00"],
    kunci: "A",
    pembahasan: "Dua roti berharga 2 × 4.000 = 8.000 dan sebuah susu 5.000, jadi selisihnya Rp3.000,00.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_KANTIN,
    pertanyaan:
      "Dendi hendak membelanjakan uang Rp20.000,00 di kantin tersebut. Barang yang dapat ia beli adalah …<br>(1) 2 roti dan 2 susu kotak<br>(2) 3 roti dan 1 susu kotak<br>(3) 1 roti dan 3 susu kotak<br>(4) 4 roti dan 2 susu kotak<br>Pernyataan yang benar adalah …",
    opsi: [
      "(1), (2), dan (3)",
      "(1) dan (3)",
      "(2) dan (4)",
      "(4) saja",
      "semuanya benar",
    ],
    kunci: "A",
    pembahasan:
      "Harganya berturut-turut 18.000, 17.000, 19.000, dan 26.000. Tiga yang pertama masih di bawah Rp20.000,00, sedangkan pilihan (4) melebihi uang Dendi.",
  },

  /* ---------------- Teks 2: tinggi tanaman ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_TANAMAN,
    gambar: GRAFIK,
    pertanyaan: "Berdasarkan grafik tersebut, pertambahan tinggi tanaman setiap minggu adalah …",
    opsi: ["3 cm", "4 cm", "2 cm", "5 cm", "6 cm"],
    kunci: "A",
    pembahasan:
      "Dari minggu ke minggu tingginya 4 → 7 → 10 → 13 → 16 cm, sehingga selalu bertambah 3 cm.",
  },
  {
    tipe: "PG",
    gambar: GRAFIK,
    pertanyaan:
      "Bila pola pertambahan pada grafik itu berlanjut, tinggi tanaman pada minggu ke-8 adalah …",
    opsi: ["22 cm", "25 cm", "28 cm", "31 cm", "34 cm"],
    kunci: "B",
    pembahasan:
      "Minggu ke-5 tingginya 16 cm. Tiga minggu berikutnya bertambah 3 × 3 = 9 cm, sehingga 16 + 9 = 25 cm.",
  },
  {
    tipe: "PG",
    gambar: GRAFIK,
    pertanyaan:
      "Bila <i>h</i> menyatakan tinggi tanaman (cm) pada minggu ke-<i>n</i>, hubungan yang sesuai dengan grafik tersebut adalah …",
    opsi: ["h = 4n", "h = 3n", "h = n + 3", "h = 4n − 1", "h = 3n + 1"],
    kunci: "E",
    pembahasan:
      "Pertambahannya tetap 3 cm sehingga bentuknya h = 3n + c. Untuk n = 1 tingginya 4, jadi c = 1. Uji n = 5: 3(5) + 1 = 16 cm, cocok dengan grafik.",
  },

  /* ---------------- Teks 3: denah taman ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_TAMAN,
    gambar: DENAH,
    pertanyaan: "Luas bagian taman yang tidak tertutup kolam adalah …",
    opsi: ["200 m²", "216 m²", "220 m²", "224 m²", "264 m²"],
    kunci: "B",
    pembahasan:
      "Luas taman 20 × 12 = 240 m² dan luas kolam 6 × 4 = 24 m², sehingga selisihnya 216 m².",
  },
  {
    tipe: "PG",
    gambar: DENAH,
    pertanyaan: "Keliling taman pada denah tersebut adalah …",
    opsi: ["32 m", "48 m", "56 m", "64 m", "72 m"],
    kunci: "D",
    pembahasan: "Keliling persegi panjang = 2 × (20 + 12) = 64 m.",
  },
  {
    tipe: "PG",
    gambar: DENAH,
    pertanyaan:
      "Seluruh bagian taman selain kolam akan ditanami rumput dengan biaya Rp25.000,00 per m².<br>Biaya yang diperlukan adalah …",
    opsi: ["Rp4.800.000,00", "Rp5.000.000,00", "Rp5.400.000,00", "Rp6.000.000,00", "Rp6.600.000,00"],
    kunci: "C",
    pembahasan:
      "Luas yang ditanami 216 m², sehingga biayanya 216 × 25.000 = Rp5.400.000,00. Bila luas kolam lupa dikurangkan, hasilnya keliru menjadi Rp6.000.000,00.",
  },
  {
    tipe: "PG",
    gambar: DENAH,
    pertanyaan:
      "Di sekeliling taman akan dipasang pagar dengan biaya Rp150.000,00 per meter.<br>Biaya pemasangan pagar seluruhnya adalah …",
    opsi: [
      "Rp9.600.000,00",
      "Rp10.200.000,00",
      "Rp11.400.000,00",
      "Rp12.000.000,00",
      "Rp12.800.000,00",
    ],
    kunci: "A",
    pembahasan:
      "Panjang pagar mengikuti keliling taman, yaitu 64 m. Biayanya 64 × 150.000 = Rp9.600.000,00.",
  },

  /* ---------------- Teks 4: pemakaian air ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_AIR,
    gambar: AIR,
    pertanyaan: "Rata-rata pemakaian air per hari selama lima hari itu adalah …",
    opsi: ["120 liter", "130 liter", "140 liter", "150 liter", "160 liter"],
    kunci: "C",
    pembahasan:
      "Jumlahnya 120 + 150 + 90 + 175 + 165 = 700 liter, dibagi 5 hari menghasilkan 140 liter.",
  },
  {
    tipe: "PG",
    gambar: AIR,
    pertanyaan:
      "Persentase pemakaian air pada hari Kamis terhadap seluruh pemakaian selama lima hari adalah …",
    opsi: ["15%", "18%", "20%", "22%", "25%"],
    kunci: "E",
    pembahasan: "Hari Kamis 175 liter dari total 700 liter, yaitu 175 ÷ 700 × 100% = 25%.",
  },
  {
    tipe: "PG",
    gambar: AIR,
    pertanyaan: "Selisih pemakaian air pada hari terbanyak dan hari tersedikit adalah …",
    opsi: ["75 liter", "85 liter", "90 liter", "95 liter", "105 liter"],
    kunci: "B",
    pembahasan: "Terbanyak Kamis 175 liter dan tersedikit Rabu 90 liter, sehingga selisihnya 85 liter.",
  },
  {
    tipe: "PG",
    gambar: AIR,
    pertanyaan:
      "Bila pemakaian air pada hari Sabtu diperkirakan sama dengan rata-rata lima hari tersebut, total pemakaian air selama enam hari menjadi …",
    opsi: ["780 liter", "800 liter", "820 liter", "840 liter", "860 liter"],
    kunci: "D",
    pembahasan:
      "Rata-ratanya 140 liter, sehingga totalnya 700 + 140 = 840 liter.",
  },

  /* ---------------- Pilihan ganda kompleks (Benar/Salah) ---------------- */
  {
    tipe: "PGK",
    stimulus: TEKS_KANTIN,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 1.",
    opsi: [
      "Harga sebuah roti adalah Rp4.000,00.",
      "Harga 5 susu kotak sama dengan harga 6 roti.",
      "Harga sebuah susu kotak lebih mahal daripada harga sebuah roti.",
    ],
    kunci: ["B", "S", "B"],
    pembahasan:
      "Harga roti Rp4.000,00 dan susu Rp5.000,00. Lima susu berharga 25.000, sedangkan enam roti 24.000 — jadi keduanya tidak sama.",
  },
  {
    tipe: "PGK",
    gambar: GRAFIK,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan grafik Teks 2.",
    opsi: [
      "Tinggi tanaman bertambah tetap 3 cm setiap minggu.",
      "Tinggi tanaman pada minggu ke-5 adalah 16 cm.",
      "Bila polanya berlanjut, tinggi tanaman pada minggu ke-10 adalah 30 cm.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Dua pernyataan pertama terbaca langsung dari grafik. Dengan rumus h = 3n + 1, minggu ke-10 menghasilkan 31 cm, bukan 30 cm.",
  },
  {
    tipe: "PGK",
    gambar: AIR,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan diagram Teks 4.",
    opsi: [
      "Pemakaian air hari Rabu paling sedikit di antara lima hari tersebut.",
      "Jumlah pemakaian air selama lima hari adalah 700 liter.",
      "Pemakaian air hari Selasa lebih banyak daripada hari Jumat.",
      "Pemakaian air hari Kamis lebih dari dua kali pemakaian hari Rabu.",
    ],
    kunci: ["B", "B", "S", "S"],
    pembahasan:
      "Rabu 90 liter memang paling sedikit dan totalnya 700 liter. Selasa 150 liter justru lebih sedikit daripada Jumat 165 liter. Dua kali pemakaian Rabu adalah 180 liter, sedangkan Kamis 175 liter — jadi belum melampauinya.",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    stimulus: TEKS_KANTIN,
    pertanyaan:
      "Dengan uang Rp20.000,00, berapa banyak roti paling banyak yang dapat dibeli bila Dendi hanya membeli roti?",
    kunci: "5",
    pembahasan: "Harga sebuah roti Rp4.000,00, sehingga 20.000 ÷ 4.000 = 5 roti.",
  },
  {
    tipe: "IS",
    gambar: DENAH,
    pertanyaan:
      "Bila kolam pada denah diperbesar menjadi 8 m × 5 m sedangkan ukuran tamannya tetap, berapa m² luas taman yang masih dapat ditanami rumput?",
    kunci: "200",
    pembahasan: "Luas kolam baru 8 × 5 = 40 m², sehingga sisanya 240 − 40 = 200 m².",
  },
];
