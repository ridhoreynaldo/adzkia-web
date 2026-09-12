/**
 * Warung Soal — PM (Penalaran Matematika) Paket 3, kategori Easy.
 *
 * 20 butir: 15 pilihan ganda, 3 pilihan ganda kompleks, 2 isian singkat.
 * Model INTENS: tiap butir bertumpu pada TEKS konteks yang dipakai beberapa
 * soal berturut-turut, termasuk bentuk memilih pernyataan benar (1)-(4).
 * Gambar ada di `public/warung/PM-3/`.
 */

const LINGKARAN = "/warung/PM-3/diagram-lingkaran-dana.svg";
const SUHU = "/warung/PM-3/grafik-suhu.svg";

const TEKS_TARIF = `<p><b>Teks 1</b></p><p>Sebuah jasa pengiriman menetapkan tarif berdasarkan berat paket seperti pada tabel berikut.</p><table><tr><th>Berat paket</th><th>Tarif</th></tr><tr><td>0 sampai 1 kg</td><td>Rp10.000,00</td></tr><tr><td>lebih dari 1 kg sampai 3 kg</td><td>Rp18.000,00</td></tr><tr><td>lebih dari 3 kg sampai 5 kg</td><td>Rp24.000,00</td></tr><tr><td>lebih dari 5 kg</td><td>Rp24.000,00 ditambah Rp5.000,00 untuk setiap kilogram kelebihannya</td></tr></table>`;

const TEKS_DANA = `<p><b>Teks 2</b></p><p>Panitia sebuah kegiatan sekolah mengelola dana sebesar Rp12.000.000,00. Rincian penggunaannya disajikan pada diagram berikut.</p>`;

const TEKS_SUHU = `<p><b>Teks 3</b></p><p>Petugas mencatat suhu udara siang hari di sebuah kota selama lima hari kerja seperti pada grafik berikut.</p>`;

const TEKS_BAK = `<p><b>Teks 4</b></p><p>Sebuah bak air berbentuk balok berukuran panjang 120 cm, lebar 80 cm, dan tinggi 60 cm. Bak itu akan diisi air melalui sebuah keran. Ingat bahwa 1 liter sama dengan 1.000 cm³.</p>`;

export const SOAL = [
  /* ---------------- Teks 1: tarif pengiriman ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_TARIF,
    pertanyaan: "Berapa tarif pengiriman sebuah paket seberat 2,5 kg?",
    opsi: [
      "Rp10.000,00",
      "Rp18.000,00",
      "Rp24.000,00",
      "Rp29.000,00",
      "Rp34.000,00",
    ],
    kunci: "B",
    pembahasan:
      "Berat 2,5 kg termasuk golongan “lebih dari 1 kg sampai 3 kg”, sehingga tarifnya Rp18.000,00.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_TARIF,
    pertanyaan: "Berapa tarif pengiriman sebuah paket seberat 7 kg?",
    opsi: [
      "Rp24.000,00",
      "Rp29.000,00",
      "Rp39.000,00",
      "Rp44.000,00",
      "Rp34.000,00",
    ],
    kunci: "E",
    pembahasan:
      "Berat 7 kg melebihi 5 kg dengan kelebihan 2 kg, sehingga tarifnya 24.000 + 2 × 5.000 = Rp34.000,00.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_TARIF,
    pertanyaan:
      "Seorang pengirim membayar Rp39.000,00 untuk satu paket. Berapa berat paket tersebut?",
    opsi: ["8 kg", "6 kg", "7 kg", "9 kg", "10 kg"],
    kunci: "A",
    pembahasan:
      "Kelebihan biayanya 39.000 − 24.000 = 15.000, yaitu 15.000 ÷ 5.000 = 3 kg di atas 5 kg. Jadi beratnya 8 kg.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_TARIF,
    pertanyaan:
      "Perhatikan pernyataan berikut mengenai tabel tarif tersebut.<br>(1) Paket seberat 1 kg dikenai tarif Rp10.000,00.<br>(2) Paket seberat 3 kg dikenai tarif Rp18.000,00.<br>(3) Paket seberat 5 kg dikenai tarif Rp24.000,00.<br>(4) Paket seberat 6 kg dikenai tarif Rp30.000,00.<br>Pernyataan yang benar adalah …",
    opsi: [
      "(1), (2), dan (3)",
      "(1) dan (3)",
      "(2) dan (4)",
      "(4) saja",
      "semuanya benar",
    ],
    kunci: "A",
    pembahasan:
      "Berat 1 kg, 3 kg, dan 5 kg persis berada pada batas atas tiap golongan sehingga tarifnya sesuai tabel. Paket 6 kg dikenai 24.000 + 1 × 5.000 = Rp29.000,00, bukan Rp30.000,00.",
  },

  /* ---------------- Teks 2: penggunaan dana ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_DANA,
    gambar: LINGKARAN,
    pertanyaan: "Besar dana yang dipakai untuk konsumsi adalah …",
    opsi: [
      "Rp3.000.000,00",
      "Rp3.600.000,00",
      "Rp4.000.000,00",
      "Rp4.200.000,00",
      "Rp4.800.000,00",
    ],
    kunci: "B",
    pembahasan: "Konsumsi 30% dari Rp12.000.000,00, yaitu 0,30 × 12.000.000 = Rp3.600.000,00.",
  },
  {
    tipe: "PG",
    gambar: LINGKARAN,
    pertanyaan: "Selisih dana perlengkapan dan dana dokumentasi adalah …",
    opsi: [
      "Rp600.000,00",
      "Rp900.000,00",
      "Rp1.200.000,00",
      "Rp1.500.000,00",
      "Rp1.800.000,00",
    ],
    kunci: "C",
    pembahasan:
      "Selisih persentasenya 25% − 15% = 10%, sehingga selisih dananya 0,10 × 12.000.000 = Rp1.200.000,00.",
  },
  {
    tipe: "PG",
    gambar: LINGKARAN,
    pertanyaan:
      "Bila seluruh dana lain-lain dialihkan ke pos transportasi, persentase dana transportasi menjadi …",
    opsi: ["30%", "25%", "28%", "32%", "35%"],
    kunci: "A",
    pembahasan: "Transportasi 20% ditambah lain-lain 10% menjadi 30%.",
  },
  {
    tipe: "PG",
    gambar: LINGKARAN,
    pertanyaan:
      "Perhatikan pernyataan berikut berdasarkan diagram tersebut.<br>(1) Dana konsumsi adalah Rp3.000.000,00.<br>(2) Dana perlengkapan adalah Rp3.000.000,00.<br>(3) Dokumentasi memakai dana yang paling kecil.<br>(4) Dana transportasi adalah Rp2.400.000,00.<br>Pernyataan yang benar adalah …",
    opsi: [
      "(1), (2), dan (3)",
      "(1) dan (3)",
      "(2) dan (4)",
      "(4) saja",
      "semuanya benar",
    ],
    kunci: "C",
    pembahasan:
      "Perlengkapan 25% = Rp3.000.000,00 dan transportasi 20% = Rp2.400.000,00, jadi (2) dan (4) benar. Konsumsi 30% = Rp3.600.000,00, sedangkan pos terkecil adalah lain-lain 10%, bukan dokumentasi.",
  },

  /* ---------------- Teks 3: suhu udara ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_SUHU,
    gambar: SUHU,
    pertanyaan: "Rata-rata suhu udara selama lima hari tersebut adalah …",
    opsi: ["27 °C", "27,5 °C", "28 °C", "28,5 °C", "29 °C"],
    kunci: "C",
    pembahasan:
      "Jumlahnya 26 + 28 + 27 + 30 + 29 = 140 °C, dibagi 5 hari menghasilkan 28 °C.",
  },
  {
    tipe: "PG",
    gambar: SUHU,
    pertanyaan: "Selisih suhu tertinggi dan suhu terendah selama lima hari itu adalah …",
    opsi: ["4 °C", "2 °C", "3 °C", "5 °C", "6 °C"],
    kunci: "A",
    pembahasan: "Tertinggi Kamis 30 °C dan terendah Senin 26 °C, sehingga selisihnya 4 °C.",
  },
  {
    tipe: "PG",
    gambar: SUHU,
    pertanyaan: "Kenaikan suhu terbesar terjadi dari hari …",
    opsi: [
      "Senin ke Selasa",
      "Selasa ke Rabu",
      "Kamis ke Jumat",
      "Rabu ke Kamis",
      "Senin ke Rabu",
    ],
    kunci: "D",
    pembahasan:
      "Perubahannya berturut-turut +2, −1, +3, dan −1. Kenaikan terbesar 3 °C terjadi dari Rabu ke Kamis.",
  },
  {
    tipe: "PG",
    gambar: SUHU,
    pertanyaan: "Banyaknya hari yang suhunya di atas rata-rata adalah …",
    opsi: ["1 hari", "2 hari", "3 hari", "4 hari", "5 hari"],
    kunci: "B",
    pembahasan:
      "Rata-ratanya 28 °C. Suhu yang melebihi angka itu hanya Kamis 30 °C dan Jumat 29 °C, jadi ada 2 hari.",
  },

  /* ---------------- Teks 4: bak air ---------------- */
  {
    tipe: "PG",
    stimulus: TEKS_BAK,
    pertanyaan: "Volume air ketika bak tersebut terisi penuh adalah …",
    opsi: ["480 liter", "520 liter", "600 liter", "640 liter", "576 liter"],
    kunci: "E",
    pembahasan:
      "Volume balok = 120 × 80 × 60 = 576.000 cm³. Karena 1 liter = 1.000 cm³, isinya 576 liter.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_BAK,
    pertanyaan:
      "Bila bak diisi memakai keran berdebit 8 liter per menit, waktu yang diperlukan sampai penuh adalah …",
    opsi: ["64 menit", "68 menit", "70 menit", "72 menit", "76 menit"],
    kunci: "D",
    pembahasan: "Waktu = 576 ÷ 8 = 72 menit.",
  },
  {
    tipe: "PG",
    stimulus: TEKS_BAK,
    pertanyaan: "Bila bak hanya diisi sampai tiga perempat bagian, volume airnya adalah …",
    opsi: ["432 liter", "384 liter", "400 liter", "420 liter", "460 liter"],
    kunci: "A",
    pembahasan: "Tiga perempat dari 576 liter adalah ¾ × 576 = 432 liter.",
  },

  /* ---------------- Pilihan ganda kompleks ---------------- */
  {
    tipe: "PGK",
    stimulus: TEKS_TARIF,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan tabel Teks 1.",
    opsi: [
      "Paket seberat 1 kg dikenai tarif Rp10.000,00.",
      "Paket seberat 4 kg dikenai tarif Rp24.000,00.",
      "Paket seberat 6 kg dikenai tarif Rp30.000,00.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Paket 6 kg dihitung 24.000 + 1 × 5.000 = Rp29.000,00, bukan Rp30.000,00. Dua pernyataan lain sesuai golongan pada tabel.",
  },
  {
    tipe: "PGK",
    gambar: LINGKARAN,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan diagram Teks 2.",
    opsi: [
      "Dana konsumsi adalah Rp3.600.000,00.",
      "Pos lain-lain memakai dana yang paling kecil.",
      "Dana transportasi lebih besar daripada dana perlengkapan.",
      "Jumlah dana dokumentasi dan lain-lain adalah Rp3.000.000,00.",
    ],
    kunci: ["B", "B", "S", "B"],
    pembahasan:
      "Transportasi 20% justru lebih kecil daripada perlengkapan 25%. Dokumentasi dan lain-lain berjumlah 25% dari Rp12.000.000,00, yaitu Rp3.000.000,00.",
  },
  {
    tipe: "PGK",
    stimulus: TEKS_BAK,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan Teks 4.",
    opsi: [
      "Volume bak seluruhnya adalah 576 liter.",
      "Satu liter sama dengan 1.000 cm³.",
      "Bila diisi setengahnya, volume airnya lebih dari 300 liter.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Setengah dari 576 liter adalah 288 liter, jadi belum melebihi 300 liter.",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    gambar: SUHU,
    pertanyaan:
      "Berdasarkan grafik Teks 3, berapa derajat Celsius suhu tertinggi selama lima hari tersebut?",
    kunci: "30",
    pembahasan: "Titik tertinggi pada grafik adalah hari Kamis dengan suhu 30 °C.",
  },
  {
    tipe: "IS",
    stimulus: TEKS_BAK,
    pertanyaan:
      "Berapa liter air yang diperlukan untuk mengisi bak pada Teks 4 sampai setengah bagian?",
    kunci: "288",
    pembahasan: "Setengah dari volume penuh 576 liter adalah 288 liter.",
  },
];
