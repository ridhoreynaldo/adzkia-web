/**
 * Warung Soal — PK (Pengetahuan Kuantitatif) Paket 1, kategori Easy.
 *
 * 20 butir: 15 pilihan ganda, 3 pilihan ganda kompleks, 2 isian singkat.
 *
 * Modelnya mengikuti naskah Tryout Prosus Inten: PK berisi matematika murni
 * tanpa konteks cerita — operasi berlambang baru, hasil kali pecahan berantai,
 * teori bilangan, barisan, bentuk akar, perbandingan dua kuantitas, dan
 * kecukupan informasi. Soal berkonteks data dan diagram BUKAN bagian PK;
 * itu porsi Penalaran Matematika. Karena jenjang Easy, tiap butir cukup
 * diselesaikan satu langkah.
 */

const TRAPESIUM = "/warung/PK-1/trapesium.svg";

export const SOAL = [
  {
    tipe: "PG",
    pertanyaan:
      "Operasi ⊗ pada himpunan bilangan bulat didefinisikan dengan aturan <i>a</i> ⊗ <i>b</i> = <i>a</i> + 2<i>b</i>.<br>Nilai dari 4 ⊗ (1 ⊗ 3) adalah …",
    opsi: ["18", "20", "22", "24", "26"],
    kunci: "A",
    pembahasan:
      "Kerjakan yang di dalam kurung lebih dahulu: 1 ⊗ 3 = 1 + 2(3) = 7. Lalu 4 ⊗ 7 = 4 + 2(7) = 18.",
  },
  {
    tipe: "PG",
    pertanyaan: "Hasil dari (1 + 1/2) × (1 + 1/3) × (1 + 1/4) × (1 + 1/5) adalah …",
    opsi: ["2", "5/2", "3", "7/2", "4"],
    kunci: "C",
    pembahasan:
      "Tiap faktor menjadi 3/2 × 4/3 × 5/4 × 6/5. Pembilang dan penyebut yang sama saling menghapus sehingga tersisa 6/2 = 3.",
  },
  {
    tipe: "PG",
    pertanyaan: "Angka satuan dari 3²⁰ adalah …",
    opsi: ["9", "7", "5", "3", "1"],
    kunci: "E",
    pembahasan:
      "Angka satuan pangkat 3 berulang setiap empat langkah: 3, 9, 7, 1. Karena 20 habis dibagi 4, angka satuannya sama dengan langkah keempat, yaitu 1.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Diketahui barisan aritmetika 5, <i>a</i>, 11, <i>b</i>, 17.<br>Nilai <i>a</i> + <i>b</i> adalah …",
    opsi: ["19", "20", "21", "22", "23"],
    kunci: "D",
    pembahasan:
      "Dari 5 ke 11 terpaut dua langkah, jadi bedanya 3. Barisannya 5, 8, 11, 14, 17 sehingga a + b = 8 + 14 = 22.",
  },
  {
    tipe: "PG",
    pertanyaan: "Nilai dari (3⁴ ÷ 3²) × 3 adalah …",
    opsi: ["9", "27", "81", "243", "729"],
    kunci: "B",
    pembahasan:
      "Pangkat berbasis sama dikurangkan saat dibagi dan dijumlahkan saat dikali: 3⁴⁻²⁺¹ = 3³ = 27.",
  },
  {
    tipe: "PG",
    stimulus:
      "Diketahui <i>y</i> adalah bilangan bulat positif yang memenuhi <i>y</i> + 4 = 9.<br><b>P</b> = nilai 3<i>y</i><br><b>Q</b> = 16",
    pertanyaan: "Manakah hubungan yang benar antara kuantitas P dan Q?",
    opsi: [
      "P sama dengan Q",
      "P lebih besar daripada Q",
      "P lebih kecil daripada Q",
      "2P sama dengan Q",
      "Hubungan P dan Q tidak dapat ditentukan",
    ],
    kunci: "C",
    pembahasan: "Dari y + 4 = 9 diperoleh y = 5, sehingga P = 15. Karena 15 < 16, maka P < Q.",
  },
  {
    tipe: "PG",
    stimulus:
      "Berapakah luas sebuah persegi panjang?<br>(1) Kelilingnya 30 cm.<br>(2) Panjangnya dua kali lebarnya.",
    pertanyaan: "Putuskan apakah pernyataan (1) dan (2) cukup untuk menjawab pertanyaan tersebut.",
    opsi: [
      "Pernyataan (1) SAJA cukup, tetapi pernyataan (2) saja tidak cukup",
      "Pernyataan (2) SAJA cukup, tetapi pernyataan (1) saja tidak cukup",
      "DUA pernyataan bersama-sama cukup, tetapi satu pernyataan saja tidak cukup",
      "Pernyataan (1) SAJA cukup dan pernyataan (2) SAJA cukup",
      "Pernyataan (1) dan (2) bersama-sama tidak cukup",
    ],
    kunci: "C",
    pembahasan:
      "Keliling saja menyisakan banyak pasangan ukuran, dan perbandingan saja tidak memberi ukuran apa pun. Digabungkan: p + l = 15 dan p = 2l memberi l = 5 dan p = 10, sehingga luasnya 50 cm².",
  },
  {
    tipe: "PG",
    gambar: TRAPESIUM,
    pertanyaan: "Luas trapesium ABCD pada gambar tersebut adalah …",
    opsi: ["54 cm²", "66 cm²", "72 cm²", "78 cm²", "84 cm²"],
    kunci: "B",
    pembahasan:
      "Luas trapesium = ½ × (jumlah sisi sejajar) × tinggi = ½ × (14 + 8) × 6 = ½ × 22 × 6 = 66 cm².",
  },
  {
    tipe: "PG",
    gambar: TRAPESIUM,
    pertanyaan:
      "Bila tinggi trapesium pada gambar diperbesar menjadi 9 cm sedangkan panjang sisi sejajarnya tetap, luasnya menjadi …",
    opsi: ["99 cm²", "110 cm²", "121 cm²", "132 cm²", "143 cm²"],
    kunci: "A",
    pembahasan:
      "Jumlah sisi sejajarnya tetap 22 cm, sehingga luasnya ½ × 22 × 9 = 99 cm².",
  },
  {
    tipe: "PG",
    pertanyaan: "Bentuk paling sederhana dari √48 − √12 adalah …",
    opsi: ["√3", "2√3", "3√3", "4√3", "6√3"],
    kunci: "B",
    pembahasan:
      "√48 = 4√3 dan √12 = 2√3, sehingga selisihnya 4√3 − 2√3 = 2√3. Akar tidak boleh dikurangkan isinya menjadi √36.",
  },
  {
    tipe: "PG",
    pertanyaan: "Bila 25% dari 60% suatu bilangan sama dengan 18, bilangan itu adalah …",
    opsi: ["100", "110", "120", "130", "140"],
    kunci: "C",
    pembahasan: "25% × 60% = 0,15. Dari 0,15 × n = 18 diperoleh n = 18 ÷ 0,15 = 120.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Diketahui dua himpunan dengan n(A) = 20, n(B) = 16, dan n(A ∩ B) = 9.<br>Nilai n(A ∪ B) adalah …",
    opsi: ["27", "28", "29", "30", "31"],
    kunci: "A",
    pembahasan:
      "Gunakan n(A ∪ B) = n(A) + n(B) − n(A ∩ B) = 20 + 16 − 9 = 27. Angka 9 dikurangkan agar anggota bersama tidak terhitung dua kali.",
  },
  {
    tipe: "PG",
    pertanyaan: "Jika a : b = 3 : 4 dan b : c = 6 : 5, maka a : c adalah …",
    opsi: ["9 : 10", "4 : 5", "5 : 6", "2 : 3", "3 : 5"],
    kunci: "A",
    pembahasan:
      "Samakan nilai b menjadi 12: a : b = 9 : 12 dan b : c = 12 : 10. Maka a : c = 9 : 10.",
  },
  {
    tipe: "PG",
    pertanyaan: "Faktor persekutuan terbesar dari 36, 48, dan 60 adalah …",
    opsi: ["6", "8", "10", "12", "15"],
    kunci: "D",
    pembahasan:
      "Faktorisasinya 36 = 2²·3², 48 = 2⁴·3, dan 60 = 2²·3·5. FPB memakai pangkat terendah faktor yang sama: 2² × 3 = 12.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Dua buah dadu setimbang dilempar bersama-sama satu kali.<br>Peluang munculnya jumlah mata dadu sama dengan 7 adalah …",
    opsi: ["1/12", "1/9", "1/6", "5/36", "1/4"],
    kunci: "C",
    pembahasan:
      "Pasangan yang berjumlah 7 ada enam: (1,6), (2,5), (3,4), (4,3), (5,2), dan (6,1). Peluangnya 6/36 = 1/6.",
  },

  /* ---------------- Pilihan ganda kompleks (Benar/Salah) ---------------- */
  {
    tipe: "PGK",
    stimulus: "Diketahui barisan bilangan 4, 9, 14, 19, ….",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Beda antarsuku barisan tersebut adalah 5.",
      "Rumus suku ke-<i>n</i> barisan tersebut adalah U<sub>n</sub> = 5<i>n</i> − 1.",
      "Suku ke-7 barisan tersebut adalah 34.",
      "Suku ke-12 barisan tersebut adalah 60.",
    ],
    kunci: ["B", "B", "B", "S"],
    pembahasan:
      "Bedanya 5 dan suku pertamanya 4, sehingga U<sub>n</sub> = 5n − 1. Maka U₇ = 34, sedangkan U₁₂ = 59, bukan 60.",
  },
  {
    tipe: "PGK",
    gambar: TRAPESIUM,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan gambar.",
    opsi: [
      "Luas trapesium tersebut adalah 66 cm².",
      "Jumlah panjang kedua sisi sejajarnya adalah 22 cm.",
      "Bila tingginya digandakan, luasnya menjadi empat kali luas semula.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Luas = ½ × 22 × 6 = 66 cm². Bila hanya tingginya digandakan, luasnya menjadi dua kali, bukan empat kali — empat kali terjadi bila seluruh ukuran digandakan.",
  },
  {
    tipe: "PGK",
    stimulus: "Diketahui <i>m</i> adalah bilangan bulat yang memenuhi −3 ≤ <i>m</i> &lt; 2.",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Nilai <i>m</i> mungkin sama dengan 0.",
      "Nilai <i>m</i> pasti bilangan negatif.",
      "Banyaknya nilai <i>m</i> yang mungkin ada 5.",
      "Nilai <i>m</i> dapat sama dengan 2.",
    ],
    kunci: ["B", "S", "B", "S"],
    pembahasan:
      "Nilai yang mungkin adalah −3, −2, −1, 0, dan 1 — ada lima dan tidak semuanya negatif. Angka 2 tidak termasuk karena tandanya “lebih kecil dari”, bukan “lebih kecil atau sama dengan”.",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    pertanyaan:
      "Berapakah nilai <i>x</i> yang memenuhi persamaan 3(<i>x</i> + 2) = <i>x</i> + 14 ? (isi dengan bilangan bulat)",
    kunci: "4",
    pembahasan:
      "Jabarkan ruas kiri: 3x + 6 = x + 14. Pindahkan x ke kiri dan 6 ke kanan sehingga 2x = 8 dan x = 4.",
  },
  {
    tipe: "IS",
    gambar: TRAPESIUM,
    pertanyaan:
      "Bila panjang kedua sisi sejajar trapesium pada gambar masing-masing ditambah 2 cm sedangkan tingginya tetap, berapa cm² luasnya?",
    kunci: "78",
    pembahasan:
      "Sisi sejajarnya menjadi 16 cm dan 10 cm sehingga jumlahnya 26 cm. Luasnya ½ × 26 × 6 = 78 cm².",
  },
];
