/**
 * Warung Soal — PK (Pengetahuan Kuantitatif) Paket 2, kategori Easy.
 *
 * 20 butir: 15 pilihan ganda, 3 pilihan ganda kompleks, 2 isian singkat.
 *
 * Modelnya mengikuti naskah Tryout Prosus Inten: PK berisi matematika murni
 * tanpa konteks cerita — operasi berlambang baru, hasil kali pecahan berantai,
 * teori bilangan, barisan, bentuk akar, perbandingan dua kuantitas, dan
 * kecukupan informasi. Soal berkonteks data dan diagram sengaja TIDAK dipakai
 * di sini karena itu bagian Penalaran Matematika. Tingkat kesulitannya
 * diturunkan ke jenjang Easy, tetapi bentuk soalnya dipertahankan.
 *
 * Satu gambar dipakai bersama beberapa butir: `public/warung/PK-2/`.
 */

const SEGITIGA = "/warung/PK-2/segitiga-siku.svg";

export const SOAL = [
  {
    tipe: "PG",
    pertanyaan:
      "Operasi ⊕ pada himpunan bilangan bulat didefinisikan dengan aturan <i>a</i> ⊕ <i>b</i> = 2<i>a</i> − <i>b</i>.<br>Nilai dari 5 ⊕ (3 ⊕ 4) adalah …",
    opsi: ["4", "6", "8", "10", "12"],
    kunci: "C",
    pembahasan:
      "Kerjakan yang di dalam kurung lebih dahulu: 3 ⊕ 4 = 2(3) − 4 = 2. Lalu 5 ⊕ 2 = 2(5) − 2 = 8.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Hasil dari (1 − 1/2) × (1 − 1/3) × (1 − 1/4) × (1 − 1/5) × (1 − 1/6) adalah …",
    opsi: ["1/12", "1/6", "1/5", "1/4", "1/2"],
    kunci: "B",
    pembahasan:
      "Tiap faktor menjadi 1/2 × 2/3 × 3/4 × 4/5 × 5/6. Pembilang dan penyebut yang sama saling menghapus sehingga tersisa 1/6.",
  },
  {
    tipe: "PG",
    pertanyaan: "Angka satuan dari 7¹⁵ adalah …",
    opsi: ["9", "7", "5", "3", "1"],
    kunci: "D",
    pembahasan:
      "Angka satuan pangkat 7 berulang setiap empat langkah: 7, 9, 3, 1. Karena 15 dibagi 4 bersisa 3, angka satuannya sama dengan langkah ketiga, yaitu 3.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Diketahui barisan aritmetika 4, <i>a</i>, 10, <i>b</i>, 16, <i>c</i>.<br>Nilai <i>a</i> + <i>b</i> + <i>c</i> adalah …",
    opsi: ["30", "33", "36", "38", "39"],
    kunci: "E",
    pembahasan:
      "Dari 4 ke 10 terpaut dua langkah, jadi bedanya 3. Barisannya 4, 7, 10, 13, 16, 19 sehingga a + b + c = 7 + 13 + 19 = 39.",
  },
  {
    tipe: "PG",
    pertanyaan: "Nilai dari (2³ × 2⁵) ÷ 2⁶ adalah …",
    opsi: ["1", "2", "4", "8", "16"],
    kunci: "C",
    pembahasan:
      "Pangkat yang berbasis sama dijumlahkan saat dikali dan dikurangkan saat dibagi: 2³⁺⁵⁻⁶ = 2² = 4.",
  },
  {
    tipe: "PG",
    stimulus:
      "Diketahui <i>x</i> adalah bilangan bulat positif yang memenuhi 3<i>x</i> = 21.<br><b>P</b> = nilai <i>x</i>²<br><b>Q</b> = 50",
    pertanyaan: "Manakah hubungan yang benar antara kuantitas P dan Q?",
    opsi: [
      "P lebih besar daripada Q",
      "P lebih kecil daripada Q",
      "P sama dengan Q",
      "2P sama dengan Q",
      "Hubungan P dan Q tidak dapat ditentukan",
    ],
    kunci: "B",
    pembahasan: "Dari 3x = 21 diperoleh x = 7, sehingga P = 49. Karena 49 < 50, maka P < Q.",
  },
  {
    tipe: "PG",
    stimulus:
      "Berapakah umur Rani pada tahun ini?<br>(1) Lima tahun yang lalu umur Rani 12 tahun.<br>(2) Umur Rani tiga tahun lebih muda daripada umur kakaknya.",
    pertanyaan:
      "Manakah pernyataan yang cukup untuk menentukan umur Rani?",
    opsi: [
      "Pernyataan (1) saja sudah cukup, sedangkan pernyataan (2) saja belum cukup",
      "Pernyataan (2) saja sudah cukup, sedangkan pernyataan (1) saja belum cukup",
      "Kedua pernyataan harus dipakai bersama-sama",
      "Masing-masing pernyataan sudah cukup dipakai sendiri",
      "Kedua pernyataan sekalipun digabungkan masih belum cukup",
    ],
    kunci: "A",
    pembahasan:
      "Pernyataan (1) langsung memberi jawaban: 12 + 5 = 17 tahun. Pernyataan (2) hanya menghubungkan umur Rani dengan umur kakaknya yang juga tidak diketahui, jadi tidak menambah apa pun.",
  },
  {
    tipe: "PG",
    gambar: SEGITIGA,
    pertanyaan: "Keliling segitiga ABC pada gambar tersebut adalah …",
    opsi: ["24 cm", "20 cm", "22 cm", "26 cm", "28 cm"],
    kunci: "A",
    pembahasan:
      "Sisi miringnya √(8² + 6²) = 10 cm, sehingga kelilingnya 8 + 6 + 10 = 24 cm.",
  },
  {
    tipe: "PG",
    gambar: SEGITIGA,
    pertanyaan:
      "Bila kedua sisi siku-siku pada gambar tersebut sama-sama dikalikan 3, luas segitiga yang baru adalah …",
    opsi: ["72 cm²", "96 cm²", "144 cm²", "216 cm²", "288 cm²"],
    kunci: "D",
    pembahasan:
      "Sisi siku-sikunya menjadi 24 cm dan 18 cm, sehingga luasnya ½ × 24 × 18 = 216 cm². Perhatikan luasnya menjadi 3² = 9 kali luas semula (24 cm²).",
  },
  {
    tipe: "PG",
    pertanyaan: "Bentuk paling sederhana dari √50 + √18 adalah …",
    opsi: ["√68", "6√2", "7√2", "8√2", "15√2"],
    kunci: "D",
    pembahasan:
      "√50 = 5√2 dan √18 = 3√2, sehingga jumlahnya 8√2. Akar tidak boleh dijumlahkan isinya menjadi √68.",
  },
  {
    tipe: "PG",
    pertanyaan: "Bila 30% dari 40% suatu bilangan sama dengan 24, bilangan itu adalah …",
    opsi: ["120", "160", "180", "200", "240"],
    kunci: "D",
    pembahasan:
      "30% × 40% = 0,12. Dari 0,12 × n = 24 diperoleh n = 24 ÷ 0,12 = 200.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Diketahui dua himpunan dengan n(A) = 18, n(B) = 14, dan n(A ∪ B) = 25.<br>Nilai n(A ∩ B) adalah …",
    opsi: ["5", "6", "7", "8", "9"],
    kunci: "C",
    pembahasan:
      "Gunakan n(A ∪ B) = n(A) + n(B) − n(A ∩ B), sehingga 25 = 18 + 14 − n(A ∩ B) dan n(A ∩ B) = 7.",
  },
  {
    tipe: "PG",
    pertanyaan: "Jika a : b = 2 : 3 dan b : c = 4 : 5, maka a : c adalah …",
    opsi: ["2 : 5", "8 : 15", "3 : 4", "5 : 8", "6 : 5"],
    kunci: "B",
    pembahasan:
      "Samakan nilai b menjadi 12: a : b = 8 : 12 dan b : c = 12 : 15. Maka a : c = 8 : 15.",
  },
  {
    tipe: "PG",
    pertanyaan: "Kelipatan persekutuan terkecil dari 12, 18, dan 30 adalah …",
    opsi: ["90", "120", "150", "160", "180"],
    kunci: "E",
    pembahasan:
      "Faktorisasinya 12 = 2²·3, 18 = 2·3², dan 30 = 2·3·5. KPK memakai pangkat tertinggi tiap faktor: 2² × 3² × 5 = 180.",
  },
  {
    tipe: "PG",
    pertanyaan:
      "Dua buah dadu setimbang dilempar bersama-sama satu kali.<br>Peluang munculnya jumlah mata dadu sama dengan 9 adalah …",
    opsi: ["1/12", "1/6", "1/9", "5/36", "1/4"],
    kunci: "C",
    pembahasan:
      "Pasangan yang berjumlah 9 ada empat: (3,6), (4,5), (5,4), dan (6,3). Peluangnya 4/36 = 1/9.",
  },

  /* ---------------- Pilihan ganda kompleks (Benar/Salah) ---------------- */
  {
    tipe: "PGK",
    stimulus: "Diketahui barisan bilangan 3, 7, 11, 15, ….",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Beda antarsuku barisan tersebut adalah 4.",
      "Rumus suku ke-<i>n</i> barisan tersebut adalah U<sub>n</sub> = 4<i>n</i> − 1.",
      "Suku ke-10 barisan tersebut adalah 39.",
      "Suku ke-20 barisan tersebut adalah 80.",
    ],
    kunci: ["B", "B", "B", "S"],
    pembahasan:
      "Bedanya 4 dan suku pertamanya 3, sehingga U<sub>n</sub> = 4n − 1. Maka U₁₀ = 39, sedangkan U₂₀ = 79, bukan 80.",
  },
  {
    tipe: "PGK",
    gambar: SEGITIGA,
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut berdasarkan gambar.",
    opsi: [
      "Luas segitiga tersebut adalah 24 cm².",
      "Panjang sisi BC adalah 10 cm.",
      "Keliling segitiga tersebut adalah 26 cm.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Luas = ½ × 8 × 6 = 24 cm² dan BC = √(64 + 36) = 10 cm. Kelilingnya 8 + 6 + 10 = 24 cm, bukan 26 cm.",
  },
  {
    tipe: "PGK",
    stimulus: "Diketahui <i>n</i> adalah bilangan bulat yang memenuhi 2 &lt; <i>n</i> &lt; 8.",
    pertanyaan: "Tentukan benar atau salah setiap pernyataan berikut.",
    opsi: [
      "Nilai <i>n</i> mungkin sama dengan 5.",
      "Nilai <i>n</i> pasti bilangan ganjil.",
      "Banyaknya nilai <i>n</i> yang mungkin ada 5.",
      "Nilai <i>n</i> dapat sama dengan 8.",
    ],
    kunci: ["B", "S", "B", "S"],
    pembahasan:
      "Nilai yang mungkin adalah 3, 4, 5, 6, dan 7 — ada lima dan tidak semuanya ganjil. Angka 8 tidak termasuk karena tandanya “lebih kecil dari”, bukan “lebih kecil atau sama dengan”.",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    pertanyaan:
      "Berapakah nilai <i>x</i> yang memenuhi persamaan 2(<i>x</i> − 3) = <i>x</i> + 5 ? (isi dengan bilangan bulat)",
    kunci: "11",
    pembahasan:
      "Jabarkan ruas kiri: 2x − 6 = x + 5. Pindahkan x ke kiri dan −6 ke kanan sehingga x = 11.",
  },
  {
    tipe: "IS",
    gambar: SEGITIGA,
    pertanyaan:
      "Bila kedua sisi siku-siku pada gambar sama-sama dikalikan 2, berapa cm panjang sisi miring segitiga yang baru?",
    kunci: "20",
    pembahasan:
      "Sisi siku-sikunya menjadi 16 cm dan 12 cm, sehingga sisi miringnya √(256 + 144) = √400 = 20 cm. Sisi miring ikut berlipat dua karena seluruh segitiga diperbesar dengan faktor yang sama.",
  },
];
