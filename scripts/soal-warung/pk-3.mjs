/**
 * Warung Soal — PK (Pengetahuan Kuantitatif) Paket 3, kategori Easy.
 *
 * 20 butir: 15 pilihan ganda, 3 pilihan ganda kompleks, 2 isian singkat.
 * Model INTENS: matematika murni tanpa konteks cerita. Jenjang Easy.
 */

const PERSEGI = "/warung/PK-3/persegi-panjang-diagonal.svg";

export const SOAL = [
  {
    tipe: "PG",
    pertanyaan:
      "Operasi ⊙ pada himpunan bilangan bulat didefinisikan dengan aturan <i>a</i> ⊙ <i>b</i> = 3<i>a</i> − 2<i>b</i>.<br>Nilai dari 4 ⊙ (2 ⊙ 1) adalah …",
    opsi: ["4", "2", "6", "8", "10"],
    kunci: "A",
    pembahasan:
      "Kerjakan yang di dalam kurung lebih dahulu: 2 ⊙ 1 = 3(2) − 2(1) = 4. Lalu 4 ⊙ 4 = 3(4) − 2(4) = 4.",
  },
  {
    tipe: "PG",
    pertanyaan: "Hasil dari (1 − 1/3) × (1 − 1/4) × (1 − 1/5) × (1 − 1/6) adalah …",
    opsi: ["1/6", "1/4", "1/3", "1/2", "2/3"],
    kunci: "C",
    pembahasan:
      "Tiap faktor menjadi 2/3 × 3/4 × 4/5 × 5/6. Pembilang dan penyebut yang sama saling menghapus sehingga tersisa 2/6 = 1/3.",
  },
  {
    tipe: "PG",
    pertanyaan: "Angka satuan dari 2³⁰ adalah …",
    opsi: ["0", "2", "6", "8", "4"],
    kunci: "E",
    pembahasan:
      "Angka satuan pangkat 2 berulang setiap empat langkah: 2, 4, 8, 6. Karena 30 dibagi 4 bersisa 2, angka satuannya sama dengan langkah kedua, yaitu 4.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Diketahui barisan aritmetika 7, <i>a</i>, 15, <i>b</i>, 23, <i>c</i>.<br>Nilai <i>a</i> + <i>b</i> + <i>c</i> adalah …",
    opsi: ["51", "53", "55", "57", "59"],
    kunci: "D",
    pembahasan:
      "Dari 7 ke 15 terpaut dua langkah, jadi bedanya 4. Barisannya 7, 11, 15, 19, 23, 27 sehingga a + b + c = 11 + 19 + 27 = 57.",
  },
  {
    tipe: "PG",
    pertanyaan: "Nilai dari (5³ × 5²) ÷ 5⁴ adalah …",
    opsi: ["1", "5", "25", "125", "625"],
    kunci: "B",
    pembahasan:
      "Pangkat berbasis sama dijumlahkan saat dikali dan dikurangkan saat dibagi: 5³⁺²⁻⁴ = 5¹ = 5.",
  },
  {
    tipe: "PG",
    stimulus:
      "Diketahui <i>z</i> adalah bilangan bulat positif yang memenuhi 2<i>z</i> − 3 = 11.<br><b>P</b> = nilai 4<i>z</i><br><b>Q</b> = 30",
    pertanyaan: "Manakah hubungan yang benar antara kuantitas P dan Q?",
    opsi: [
      "P lebih besar daripada Q",
      "P sama dengan Q",
      "P lebih kecil daripada Q",
      "2P sama dengan Q",
      "Hubungan P dan Q tidak dapat ditentukan",
    ],
    kunci: "C",
    pembahasan: "Dari 2z − 3 = 11 diperoleh z = 7, sehingga P = 28. Karena 28 < 30, maka P < Q.",
  },
  {
    tipe: "PG",
    stimulus:
      "Berapakah umur ayah pada tahun ini?<br>(1) Umur ayah tiga kali umur anaknya.<br>(2) Selisih umur ayah dan anaknya lebih dari 20 tahun.",
    pertanyaan: "Manakah pernyataan yang memadai untuk menentukan umur ayah?",
    opsi: [
      "Pernyataan (1) saja memadai, sedangkan pernyataan (2) saja tidak",
      "Pernyataan (2) saja memadai, sedangkan pernyataan (1) saja tidak",
      "Keduanya baru memadai bila dipakai bersama-sama",
      "Masing-masing pernyataan memadai bila dipakai sendiri",
      "Keduanya tetap tidak memadai walaupun digabungkan",
    ],
    kunci: "E",
    pembahasan:
      "Misal umur anak a, maka umur ayah 3a dan selisihnya 2a > 20 sehingga a > 10. Umur anak bisa 11, 12, 15, dan seterusnya, jadi umur ayah tetap tidak tertentu.",
  },
  {
    tipe: "PG",
    gambar: PERSEGI,
    pertanyaan: "Panjang diagonal KM pada gambar tersebut adalah …",
    opsi: ["13 cm", "11 cm", "12 cm", "15 cm", "17 cm"],
    kunci: "A",
    pembahasan:
      "Diagonal membagi persegi panjang menjadi dua segitiga siku-siku: KM² = 12² + 5² = 144 + 25 = 169, sehingga KM = 13 cm.",
  },
  {
    tipe: "PG",
    gambar: PERSEGI,
    pertanyaan: "Luas persegi panjang KLMN pada gambar tersebut adalah …",
    opsi: ["34 cm²", "45 cm²", "51 cm²", "60 cm²", "68 cm²"],
    kunci: "D",
    pembahasan: "Luas persegi panjang = panjang × lebar = 12 × 5 = 60 cm².",
  },
  {
    tipe: "PG",
    pertanyaan: "Bentuk paling sederhana dari √75 + √27 adalah …",
    opsi: ["8√3", "4√3", "6√3", "10√3", "√102"],
    kunci: "A",
    pembahasan:
      "√75 = 5√3 dan √27 = 3√3, sehingga jumlahnya 8√3. Akar tidak boleh dijumlahkan isinya menjadi √102.",
  },
  {
    tipe: "PG",
    pertanyaan: "Bila 40% dari 50% suatu bilangan sama dengan 30, bilangan itu adalah …",
    opsi: ["120", "150", "180", "200", "240"],
    kunci: "B",
    pembahasan: "40% × 50% = 0,2. Dari 0,2 × n = 30 diperoleh n = 30 ÷ 0,2 = 150.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Diketahui dua himpunan dengan n(A) = 22, n(B) = 18, dan n(A ∪ B) = 30.<br>Nilai n(A ∩ B) adalah …",
    opsi: ["8", "9", "10", "11", "12"],
    kunci: "C",
    pembahasan:
      "Gunakan n(A ∪ B) = n(A) + n(B) − n(A ∩ B), sehingga 30 = 22 + 18 − n(A ∩ B) dan n(A ∩ B) = 10.",
  },
  {
    tipe: "PG",
    pertanyaan: "Jika a : b = 5 : 6 dan b : c = 3 : 4, maka a : c adalah …",
    opsi: ["5 : 8", "5 : 6", "3 : 4", "4 : 5", "2 : 3"],
    kunci: "A",
    pembahasan:
      "Samakan nilai b menjadi 6: a : b = 5 : 6 dan b : c = 6 : 8. Maka a : c = 5 : 8.",
  },
  {
    tipe: "PG",
    pertanyaan: "Kelipatan persekutuan terkecil dari 8, 12, dan 20 adalah …",
    opsi: ["60", "80", "100", "120", "240"],
    kunci: "D",
    pembahasan:
      "Faktorisasinya 8 = 2³, 12 = 2²·3, dan 20 = 2²·5. KPK memakai pangkat tertinggi tiap faktor: 2³ × 3 × 5 = 120.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Sebuah dadu setimbang dilempar satu kali.<br>Peluang munculnya mata dadu berupa bilangan prima adalah …",
    opsi: ["1/6", "1/3", "1/2", "2/3", "5/6"],
    kunci: "C",
    pembahasan:
      "Bilangan prima pada mata dadu adalah 2, 3, dan 5 — ada tiga. Peluangnya 3/6 = 1/2. Angka 1 bukan bilangan prima.",
  },

  /* ---------------- Pilihan ganda kompleks ---------------- */
  {
    tipe: "PGK",
    stimulus: "Diketahui barisan bilangan 5, 9, 13, 17, ….",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Beda antarsuku barisan tersebut adalah 4.",
      "Rumus suku ke-<i>n</i> barisan tersebut adalah U<sub>n</sub> = 4<i>n</i> + 1.",
      "Suku ke-11 barisan tersebut adalah 45.",
      "Suku ke-15 barisan tersebut adalah 60.",
    ],
    kunci: ["B", "B", "B", "S"],
    pembahasan:
      "Bedanya 4 dan suku pertamanya 5, sehingga U<sub>n</sub> = 4n + 1. Maka U₁₁ = 45, sedangkan U₁₅ = 61, bukan 60.",
  },
  {
    tipe: "PGK",
    gambar: PERSEGI,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan gambar.",
    opsi: [
      "Luas persegi panjang tersebut adalah 60 cm².",
      "Panjang diagonal KM adalah 13 cm.",
      "Keliling persegi panjang tersebut adalah 30 cm.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Luas 12 × 5 = 60 cm² dan diagonal √(144 + 25) = 13 cm. Kelilingnya 2 × (12 + 5) = 34 cm, bukan 30 cm.",
  },
  {
    tipe: "PGK",
    stimulus: "Diketahui <i>k</i> adalah bilangan bulat yang memenuhi −2 &lt; <i>k</i> ≤ 3.",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Nilai <i>k</i> mungkin sama dengan 0.",
      "Nilai <i>k</i> pasti bilangan positif.",
      "Banyaknya nilai <i>k</i> yang mungkin ada 5.",
      "Nilai <i>k</i> dapat sama dengan −2.",
    ],
    kunci: ["B", "S", "B", "S"],
    pembahasan:
      "Nilai yang mungkin adalah −1, 0, 1, 2, dan 3 — ada lima dan tidak semuanya positif. Angka −2 tidak termasuk karena tandanya “lebih besar dari”, bukan “lebih besar atau sama dengan”.",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    pertanyaan:
      "Berapakah nilai <i>x</i> yang memenuhi persamaan 4(<i>x</i> − 1) = 2<i>x</i> + 10 ? (isi dengan bilangan bulat)",
    kunci: "7",
    pembahasan:
      "Jabarkan ruas kiri: 4x − 4 = 2x + 10. Pindahkan 2x ke kiri dan −4 ke kanan sehingga 2x = 14 dan x = 7.",
  },
  {
    tipe: "IS",
    gambar: PERSEGI,
    pertanyaan:
      "Bila panjang persegi panjang pada gambar ditambah 3 cm sedangkan lebarnya tetap, berapa cm² luasnya?",
    kunci: "75",
    pembahasan: "Panjangnya menjadi 15 cm, sehingga luasnya 15 × 5 = 75 cm².",
  },
];
