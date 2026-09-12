/**
 * Warung Soal — PM (Penalaran Matematika) Paket 1, kategori Easy.
 *
 * 20 butir: 15 pilihan ganda, 3 pilihan ganda kompleks, 2 isian singkat.
 *
 * Modelnya mengikuti naskah Tryout Prosus Inten: tiap butir bertumpu pada
 * TEKS konteks, dan satu teks dipakai beberapa soal berturut-turut. Ikut
 * dipakai bentuk khas PM, yaitu memilih pernyataan benar dari daftar (1)-(4).
 * Karena jenjang Easy, tiap butir cukup satu sampai dua langkah hitungan.
 * Diagram alir, grafik, dan diagram batangnya ada di `public/warung/PM-1/`.
 */

const FLOWCHART = "/warung/PM-1/flowchart-diskon.svg";
const GRAFIK = "/warung/PM-1/grafik-penjualan.svg";
const PANEN = "/warung/PM-1/diagram-batang-panen.svg";

const TEKS_TOKO = `<p><b>Teks 1</b></p><p>Toko “Sejahtera” memberi potongan harga berjenjang menurut besarnya belanja. Aturannya digambarkan dalam diagram alir berikut.</p>`;

const TEKS_ROTI = `<p><b>Teks 2</b></p><p>Toko Melati mencatat penjualan rotinya selama lima bulan pertama tahun ini pada grafik berikut.</p>`;

const TEKS_PANEN = `<p><b>Teks 3</b></p><p>Desa Sukamaju mencatat hasil panen padi dan jagung selama empat tahun terakhir pada diagram berikut.</p>`;

const TEKS_UBIN = `<p><b>Teks 4</b></p><p>Sebuah ruang kelas berbentuk persegi panjang berukuran 8 m × 6 m akan dipasangi ubin berukuran 40 cm × 40 cm. Ubin itu dijual per dus berisi 25 keping dengan harga Rp90.000,00 per dus. Seluruh lantai akan tertutup ubin tanpa ada bagian yang tersisa.</p>`;

export const SOAL = [
  /* ---------------- Teks 1: diagram alir potongan harga ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_TOKO,
    gambar: FLOWCHART,
    pertanyaan:
      "Seorang pembeli berbelanja senilai Rp250.000,00.<br>Berdasarkan diagram alir tersebut, berapa yang harus ia bayar?",
    opsi: [
      "Rp200.000,00",
      "Rp210.000,00",
      "Rp212.500,00",
      "Rp225.000,00",
      "Rp237.500,00",
    ],
    kunci: "C",
    pembahasan:
      "Karena 250.000 ≥ 200.000, potongannya 15% = Rp37.500,00. Yang dibayar 250.000 − 37.500 = Rp212.500,00.",
  },
  {
    tipe: "PG",
    gambar: FLOWCHART,
    pertanyaan:
      "Seorang pembeli berbelanja senilai Rp150.000,00.<br>Berapa besar potongan harga yang ia terima?",
    opsi: ["Rp0,00", "Rp15.000,00", "Rp22.500,00", "Rp25.000,00", "Rp30.000,00"],
    kunci: "B",
    pembahasan:
      "Nilai 150.000 tidak mencapai 200.000, tetapi sudah melewati 100.000. Jadi potongannya 10% × 150.000 = Rp15.000,00.",
  },
  {
    tipe: "PG",
    gambar: FLOWCHART,
    pertanyaan: "Seorang pembeli berbelanja senilai Rp90.000,00. Berapa yang harus ia bayar?",
    opsi: [
      "Rp76.500,00",
      "Rp81.000,00",
      "Rp85.500,00",
      "Rp88.000,00",
      "Rp90.000,00",
    ],
    kunci: "E",
    pembahasan:
      "Nilai 90.000 tidak mencapai 100.000, sehingga alurnya berakhir di kotak “tanpa diskon”. Yang dibayar tetap Rp90.000,00.",
  },
  {
    tipe: "PG",
    gambar: FLOWCHART,
    pertanyaan:
      "Perhatikan pernyataan berikut tentang diagram alir tersebut.<br>(1) Belanja Rp200.000,00 memperoleh potongan 15%.<br>(2) Belanja Rp199.000,00 memperoleh potongan 10%.<br>(3) Belanja Rp100.000,00 memperoleh potongan 10%.<br>(4) Belanja Rp99.000,00 memperoleh potongan 10%.<br>Pernyataan yang benar adalah …",
    opsi: [
      "(1), (2), dan (3)",
      "(1) dan (3)",
      "(2) dan (4)",
      "(4) saja",
      "semuanya benar",
    ],
    kunci: "A",
    pembahasan:
      "Tanda pada diagram adalah ≥, sehingga nilai 200.000 dan 100.000 ikut memenuhi syaratnya. Hanya pernyataan (4) yang salah, sebab 99.000 belum mencapai 100.000 sehingga tidak memperoleh potongan.",
  },

  /* ---------------- Teks 2: penjualan roti ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_ROTI,
    gambar: GRAFIK,
    pertanyaan: "Rata-rata penjualan roti per bulan selama lima bulan itu adalah …",
    opsi: ["150 kotak", "156 kotak", "160 kotak", "165 kotak", "170 kotak"],
    kunci: "B",
    pembahasan:
      "Jumlahnya 120 + 150 + 130 + 180 + 200 = 780 kotak, dibagi 5 bulan menghasilkan 156 kotak.",
  },
  {
    tipe: "PG",
    gambar: GRAFIK,
    pertanyaan: "Selisih penjualan bulan tertinggi dan bulan terendah adalah …",
    opsi: ["50 kotak", "60 kotak", "70 kotak", "80 kotak", "90 kotak"],
    kunci: "D",
    pembahasan: "Tertinggi Mei 200 kotak dan terendah Januari 120 kotak, jadi selisihnya 80 kotak.",
  },
  {
    tipe: "PG",
    gambar: GRAFIK,
    pertanyaan:
      "Bila penjualan bulan Juni diperkirakan naik 10% dari penjualan bulan Mei, penjualan bulan Juni adalah …",
    opsi: ["210 kotak", "215 kotak", "220 kotak", "225 kotak", "230 kotak"],
    kunci: "C",
    pembahasan: "Kenaikannya 10% × 200 = 20 kotak, sehingga penjualan Juni 200 + 20 = 220 kotak.",
  },
  {
    tipe: "PG",
    gambar: GRAFIK,
    pertanyaan:
      "Perhatikan pernyataan berikut berdasarkan grafik tersebut.<br>(1) Penjualan tertinggi terjadi pada bulan Mei.<br>(2) Penjualan pernah menurun satu kali.<br>(3) Total penjualan lima bulan adalah 780 kotak.<br>(4) Penjualan bulan Februari lebih rendah daripada bulan Maret.<br>Pernyataan yang benar adalah …",
    opsi: [
      "(1), (2), dan (3)",
      "(1) dan (3)",
      "(2) dan (4)",
      "(4) saja",
      "semuanya benar",
    ],
    kunci: "A",
    pembahasan:
      "Penjualan hanya turun sekali, yaitu dari Februari 150 ke Maret 130 kotak. Justru karena itu pernyataan (4) salah: Februari lebih tinggi, bukan lebih rendah.",
  },

  /* ---------------- Teks 3: hasil panen ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_PANEN,
    gambar: PANEN,
    pertanyaan: "Hasil panen jagung terbanyak terjadi pada tahun …",
    opsi: ["2022", "2023", "2024", "2025", "2023 dan 2025 sama banyak"],
    kunci: "C",
    pembahasan:
      "Batang jagung tertinggi berada pada tahun 2024 dengan 22 ton, sedangkan tahun 2025 justru turun menjadi 20 ton.",
  },
  {
    tipe: "PG",
    gambar: PANEN,
    pertanyaan: "Selisih hasil panen padi dan jagung pada tahun 2025 adalah …",
    opsi: ["5 ton", "10 ton", "13 ton", "15 ton", "20 ton"],
    kunci: "D",
    pembahasan: "Pada 2025 padi 35 ton dan jagung 20 ton, sehingga selisihnya 15 ton.",
  },
  {
    tipe: "PG",
    gambar: PANEN,
    pertanyaan: "Persentase kenaikan hasil panen padi dari tahun 2022 ke tahun 2025 adalah …",
    opsi: ["15%", "40%", "50%", "60%", "75%"],
    kunci: "E",
    pembahasan:
      "Kenaikannya 35 − 20 = 15 ton, dihitung terhadap tahun awal: 15 ÷ 20 × 100% = 75%.",
  },
  {
    tipe: "PG",
    gambar: PANEN,
    pertanyaan: "Total hasil panen padi selama empat tahun tersebut adalah …",
    opsi: ["110 ton", "100 ton", "105 ton", "115 ton", "120 ton"],
    kunci: "A",
    pembahasan: "Jumlahnya 20 + 25 + 30 + 35 = 110 ton.",
  },

  /* ---------------- Teks 4: pemasangan ubin ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_UBIN,
    pertanyaan: "Banyak ubin yang diperlukan untuk menutup seluruh lantai ruang kelas itu adalah …",
    opsi: ["240 keping", "270 keping", "300 keping", "320 keping", "360 keping"],
    kunci: "C",
    pembahasan:
      "Luas lantai 8 × 6 = 48 m². Satu ubin berukuran 0,4 × 0,4 = 0,16 m², sehingga diperlukan 48 ÷ 0,16 = 300 keping.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_UBIN,
    pertanyaan: "Banyak dus ubin yang harus dibeli adalah …",
    opsi: ["12 dus", "10 dus", "11 dus", "13 dus", "15 dus"],
    kunci: "A",
    pembahasan: "Satu dus berisi 25 keping, sehingga 300 ÷ 25 = 12 dus.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_UBIN,
    pertanyaan: "Biaya pembelian ubin untuk seluruh lantai ruang kelas itu adalah …",
    opsi: [
      "Rp900.000,00",
      "Rp990.000,00",
      "Rp1.080.000,00",
      "Rp1.170.000,00",
      "Rp1.350.000,00",
    ],
    kunci: "C",
    pembahasan: "Diperlukan 12 dus, sehingga biayanya 12 × 90.000 = Rp1.080.000,00.",
  },

  /* ---------------- Pilihan ganda kompleks (Benar/Salah) ---------------- */
  {
    tipe: "PGK",
    gambar: FLOWCHART,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan diagram alir Teks 1.",
    opsi: [
      "Belanja senilai Rp250.000,00 memperoleh potongan 15%.",
      "Belanja senilai Rp100.000,00 memperoleh potongan 10%.",
      "Belanja senilai Rp80.000,00 memperoleh potongan 10%.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Nilai 80.000 belum mencapai 100.000 sehingga alurnya berakhir di kotak “tanpa diskon”. Dua pernyataan lain sesuai dengan syarat pada diagram.",
  },
  {
    tipe: "PGK",
    gambar: PANEN,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan diagram Teks 3.",
    opsi: [
      "Hasil panen padi bertambah setiap tahun.",
      "Hasil panen jagung bertambah setiap tahun.",
      "Hasil panen jagung paling banyak pada tahun 2024.",
      "Selisih hasil panen padi dan jagung paling besar terjadi pada tahun 2025.",
    ],
    kunci: ["B", "S", "B", "B"],
    pembahasan:
      "Padi naik tetap 20 → 25 → 30 → 35 ton, sedangkan jagung 12 → 15 → 22 → 20 ton sehingga sempat turun pada 2025. Selisih terbesarnya juga pada 2025, yaitu 15 ton.",
  },
  {
    tipe: "PGK",
    stimulus: TEKS_UBIN,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 4.",
    opsi: [
      "Luas lantai ruang kelas tersebut adalah 48 m².",
      "Satu keping ubin menutup luas 1.600 cm².",
      "Ubin yang diperlukan lebih dari 350 keping.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Luas lantai 8 × 6 = 48 m² dan satu ubin 40 × 40 = 1.600 cm². Ubin yang diperlukan 300 keping, jadi belum sampai 350 keping.",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    gambar: GRAFIK,
    pertanyaan:
      "Berdasarkan grafik Teks 2, berapa kotak selisih penjualan bulan Februari dan bulan Maret?",
    kunci: "20",
    pembahasan: "Februari 150 kotak dan Maret 130 kotak, sehingga selisihnya 20 kotak.",
  },
  {
    tipe: "IS",
    stimulus: TEKS_UBIN,
    pertanyaan:
      "Bila ukuran ruang kelas pada Teks 4 diperbesar menjadi 10 m × 6 m, berapa dus ubin yang harus dibeli?",
    kunci: "15",
    pembahasan:
      "Luas lantai menjadi 60 m². Banyak ubin 60 ÷ 0,16 = 375 keping, sehingga diperlukan 375 ÷ 25 = 15 dus.",
  },
];
