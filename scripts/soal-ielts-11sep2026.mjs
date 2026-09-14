/**
 * PAKET IELTS — TryOut 11 September 2026.
 *
 * Isinya datang dari SATU berkas naskah pengelola,
 * `scripts/naskah-ielts/IELTS-11SEP2026.docx`, dan berkas ini hanya menyusun
 * ulang isinya menjadi baris basis data. Yang perlu diketahui sebelum
 * menyuntingnya:
 *
 *  1. TEKS PANJANG TIDAK DISALIN KE SINI. Ketiga bacaan Reading dan seluruh
 *     paragrafnya dibaca langsung dari .docx pada saat skrip dijalankan, lewat
 *     pembaca yang sama dengan tombol impor admin. Menyalinnya ke sini berarti
 *     membuka peluang salah ketik pada teks yang menentukan jawaban benar.
 *     Indeks bloknya dijaga `wajib()` — kalau naskahnya berubah susunan, skrip
 *     BERHENTI dengan pesan yang jelas, bukan diam-diam memasang teks yang
 *     salah.
 *
 *  2. KUNCI DIAMBIL DARI TABEL KUNCI DI NASKAH ITU SENDIRI, juga dibaca
 *     otomatis — bukan diketik ulang. Tanda kurung pada kunci ("(extra) charge")
 *     berarti kata di dalamnya boleh ada boleh tidak, dan garis miring
 *     ("Black / Dark") berarti dua jawaban sama-sama sah; keduanya diterjemahkan
 *     menjadi daftar kunci yang dipisah "|", bentuk yang dipahami
 *     `jawabanBenar()`.
 *
 *  3. HANYA LISTENING DAN READING. Writing dan Speaking sengaja dibiarkan
 *     kosong (permintaan pengelola 10 September 2026), sehingga band yang keluar
 *     adalah band per subtes plus band keseluruhan bertanda "sementara".
 *
 *  4. TIDAK ADA PILIHAN GANDA BERPILIHAN LEBIH DARI EMPAT. `HURUF_PG` di
 *     aplikasi ini memang A-D, dan itu TIDAK diubah demi paket satu hari —
 *     mengubahnya ikut menggeser pengurai naskah dan formulir admin beberapa
 *     jam sebelum hari-H. Soal yang pilihannya A-E, A-G, atau A-H karena itu
 *     dibuat sebagai ISIAN SINGKAT berisi satu huruf, persis seperti perintah
 *     di naskahnya sendiri: "Write the correct letter".
 *
 *  5. SOAL "PILIH DUA HURUF" dipecah menjadi dua nomor, dan perintahnya
 *     menambahkan satu kalimat yang tidak ada di naskah asli: jawabannya ditulis
 *     BERURUT ABJAD. Tanpa itu, mesin tidak bisa membedakan pasangan {D,E} yang
 *     benar dari jawaban "D" yang diketik dua kali — dan yang kedua akan
 *     mendapat dua angka untuk satu pengetahuan.
 */

import fs from "node:fs";
import path from "node:path";

const AKAR = path.resolve(import.meta.dirname, "..");
export const BERKAS_NASKAH = path.join(AKAR, "scripts", "naskah-ielts", "IELTS-11SEP2026.docx");

/* ==========================================================================
   PAKET
   ========================================================================== */

export const PAKET = {
  kode: "IELTS-11SEP2026",
  nama: "IELTS Academic — TryOut 11 September 2026",
  deskripsi:
    "Listening 40 butir (empat rekaman) dan Reading 40 butir (tiga bacaan). " +
    "Writing dan Speaking tidak diujikan pada sesi ini.",
};

/* ==========================================================================
   REKAMAN LISTENING
   --------------------------------------------------------------------------
   URUTANNYA DITENTUKAN TAG ID3, BUKAN NAMA BERKAS — dan pembedaan itu bukan
   kerewelan. Keempat berkas datang lewat WhatsApp dengan nama menurut JAM
   UNDUH, dan jam unduh itu TIDAK searah dengan urutan bagiannya: berkas yang
   namanya paling awal (14.41.45) justru Track 23, yaitu Section 4. Memasangnya
   menurut nama berkas akan memutar rekaman Section 4 untuk soal Section 1.

   Keempatnya satu album dengan nomor track berurutan 20-23, susunan baku CD
   IELTS: satu track per section, berurutan. Track 20 juga yang terpanjang
   (10:03 lawan 7-8 menit sisanya), persis ciri Section 1 yang membawa pengantar
   ujian dan contoh jawaban.
   ========================================================================== */

export const REKAMAN = [
  { seksi: 1, track: 20, durasi: "10:03", berkas: "WhatsApp Audio 2026-09-10 at 14.41.47.mpeg" },
  { seksi: 2, track: 21, durasi: "7:01", berkas: "WhatsApp Audio 2026-09-10 at 14.41.47 (1).mpeg" },
  { seksi: 3, track: 22, durasi: "7:58", berkas: "WhatsApp Audio 2026-09-10 at 14.41.47 (2).mpeg" },
  { seksi: 4, track: 23, durasi: "7:57", berkas: "WhatsApp Audio 2026-09-10 at 14.41.45.mpeg" },
];

/** Tempat keempat rekaman itu berada di komputer pengelola. */
export const FOLDER_REKAMAN = "C:/Users/ASUS/Downloads";

/* ==========================================================================
   PENOLONG
   ========================================================================== */

/**
 * Mengubah kunci gaya naskah menjadi daftar kunci yang dipahami mesin.
 *
 *   "Black / Dark"        -> ["black", "dark"]
 *   "(extra) charge"      -> ["extra charge", "charge"]
 *   "Glass desk (s)"      -> ["glass desks", "glass desk"]
 *   "Two (-) way communication" -> ["two-way communication", "two way communication"]
 *
 * Kurung berarti "boleh ada, boleh tidak", jadi SETIAP kurung melahirkan dua
 * cabang dan seluruh kombinasinya ikut menjadi kunci yang sah. Itu memang
 * murah hati, dan sengaja: yang dihukum di IELTS adalah ejaan yang salah,
 * bukan peserta yang menulis "thorns" ketika kuncinya "(sharp) thorns".
 */
export function bentukKunci(mentah) {
  const cabang = [];
  // Garis miring memisahkan dua jawaban yang sama-sama sah: "Black / Dark".
  for (const bagian of String(mentah).split("/")) {
    const teks = bagian.trim();
    if (!teks) continue;
    cabang.push(...kembangkanKurung(rapikanImbuhan(teks)));
  }
  // Cabang "tanpa tanda hubung" lahir sebagai "twoway"; yang dimaksud naskah
  // jelas "two way", jadi tanda hubung yang hilang diganti spasi. Dibakukan
  // seperti `bakukan()` di ielts.ts supaya perbandingannya setara.
  const tambahan = [];
  for (const t of cabang) if (/[A-Za-z]-[A-Za-z]/.test(t)) tambahan.push(t.replace(/-/g, " "));
  const rapi = [...cabang, ...tambahan]
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,;:!?]+$/, ""))
    .filter(Boolean);
  return [...new Set(rapi)].join("|");
}

/**
 * Merapikan kurung yang MENEMPEL pada katanya, bukan berdiri sebagai kata.
 *
 *   "Glass desk (s)"            -> "Glass desk(s)"      -> desks / desk
 *   "Two (-) way communication" -> "Two(-)way ..."      -> two-way / two way
 *
 * Tanpa ini, kurungnya diperlakukan sebagai kata terpisah dan menghasilkan
 * kunci "glass desk s" — yang tidak akan pernah diketik peserta mana pun.
 */
function rapikanImbuhan(teks) {
  return teks
    .replace(/\s+\((s|es)\)/gi, "($1)")          // desk (s)  -> desk(s)
    .replace(/\s+\(-\)\s+/g, "(-)")             // Two (-) way -> Two(-)way
    .replace(/\s+\(-\)/g, "(-)");
}

function kembangkanKurung(teks) {
  const cocok = /\(([^)]*)\)/.exec(teks);
  if (!cocok) return [teks];
  const dengan = teks.slice(0, cocok.index) + cocok[1] + teks.slice(cocok.index + cocok[0].length);
  const tanpa = teks.slice(0, cocok.index) + teks.slice(cocok.index + cocok[0].length);
  return [...kembangkanKurung(dengan), ...kembangkanKurung(tanpa)];
}

/* ==========================================================================
   NASKAH — dibaca dari .docx, dijaga supaya tidak salah blok
   ========================================================================== */

/**
 * Mengambil satu blok naskah DAN memastikan isinya memang yang diharapkan.
 *
 * Indeks blok itu rapuh — satu paragraf yang disisipkan pengelola menggeser
 * semuanya. Karena itu setiap pengambilan menyertakan potongan kata yang wajib
 * ada di dalamnya. Kalau tidak cocok, skrip berhenti: paket yang isinya salah
 * jauh lebih mahal daripada paket yang gagal dibuat.
 */
export function ambil(blok, indeks, wajibMemuat) {
  const b = blok[indeks];
  const teks = (b?.teks ?? "").trim();
  if (!teks.includes(wajibMemuat)) {
    throw new Error(
      `Naskah berubah: blok ${indeks} seharusnya memuat "${wajibMemuat}", ` +
        `yang ditemukan "${teks.slice(0, 80)}".`,
    );
  }
  return teks;
}

/** Membaca tabel kunci jawaban di naskah menjadi peta nomor -> kunci mentah. */
export function bacaTabelKunci(tabel) {
  const peta = new Map();
  for (const baris of tabel.baris) {
    // Tiap baris memuat DUA pasang (NO, ANSWER) berdampingan.
    for (let i = 0; i + 1 < baris.length; i += 2) {
      const no = Number(String(baris[i]).trim());
      const kunci = String(baris[i + 1] ?? "").trim();
      if (Number.isInteger(no) && no > 0 && kunci) peta.set(no, kunci);
    }
  }
  return peta;
}

/* ==========================================================================
   LISTENING
   ========================================================================== */

export const LISTENING = [
  {
    nomor: 1,
    judul: "Section 1 — Office furniture order",
    instruksi: [
      "Questions 1–5",
      "Complete the form below.",
      "Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.",
      "",
      "Questions 6–10",
      "Complete the table below.",
      "Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
    ].join("\n"),
    soal: [
      [1, "CUSTOMER DETAILS\nCaller's name: Sue Brown (Example)\n\n1. Company name: ______________"],
      [2, "2. Address: ______________ Trading Estate, 210 New Hampton Road, South Down"],
      [3, "3. Contact number: ______________ (mobile)"],
      [4, "4. Delivery option: ______________"],
      [5, "Method of payment: Credit card\n\n5. Type: ______________"],
      [6, "ORDER — row 1\nITEM: Office Chair · CODE: ASP 23 · QUANTITY: 5\n\n6. COLOR: ______________"],
      [7, "ORDER — row 2\nQUANTITY: 2\n\n7. ITEM: ______________"],
      [8, "ORDER — row 2 (the same item as question 7)\nQUANTITY: 2\n\n8. CODE: ______________"],
      [9, "ORDER — row 3\nITEM: Leather sofa · CODE: DFD 44 · QUANTITY: 1\n\n9. COLOR: ______________"],
      [10, "ORDER — row 4\nCODE: TX 22 · COLOR: silver · QUANTITY: 1\n\n10. ITEM: ______________"],
    ],
  },
  {
    nomor: 2,
    judul: "Section 2 — Marathon: tips for spectators",
    instruksi: [
      "Questions 11–17",
      "Complete the sentences below.",
      "Write NO MORE THAN TWO WORDS for each answer.",
      "",
      "Questions 18–20",
      "What does the speaker say about the following forms of transport?",
      "Write the correct letter, A, B, C, D or E, for each answer.",
      "",
      "A  Will take more passengers than usual",
      "B  Will suit people who want to see the start of the race",
      "C  Waiting times will be longer than usual",
      "D  Will have fewer staff than usual",
      "E  Some work schedules will change",
    ].join("\n"),
    soal: [
      [11, "MARATHON – TIPS FOR SPECTATORS\n\n11. To enjoy the day, make sure you ______________ it first."],
      [12, "12. Travel ______________ within the city centre."],
      [13, "13. Wear ______________ on the day."],
      [14, "14. Check the ______________ the night before the marathon."],
      [15, "15. Let the ______________ give drinks to runners."],
      [16, "16. Stay on one side of the road to avoid ______________."],
      [17, "17. Don't arrange to meet runners near the ______________."],
      [18, "18. Taxis — write the correct letter, A–E."],
      [19, "19. Trams — write the correct letter, A–E."],
      [20, "20. Buses — write the correct letter, A–E."],
    ],
  },
  {
    nomor: 3,
    judul: "Section 3 — Ahmed and his tutor discuss seminars",
    instruksi: [
      "Questions 21–26",
      "Choose the correct letter, A, B or C.",
      "",
      "Questions 27–28",
      "Choose TWO letters, A–E.",
      "Which TWO strategies does the tutor suggest for the next seminar?",
      "",
      "A  Speak more frequently",
      "B  Behave in a confident manner",
      "C  Sit next to someone helpful",
      "D  Listen to what other people say",
      "E  Think of questions to ask",
      "",
      "Questions 29–30",
      "Choose TWO letters, A–E.",
      "Which TWO suggestions does the tutor make about taking notes?",
      "",
      "A  Plan them before the seminar",
      "B  Note down key words that people say",
      "C  Note points to say later",
      "D  Include self-analysis",
      "E  Rewrite them after the seminar",
      "",
      "PENTING untuk nomor 27–30: tulis kedua hurufnya BERURUT ABJAD — huruf",
      "yang lebih awal di nomor yang lebih kecil. Contoh: bila jawabanmu B dan A,",
      "tulis A pada nomor pertama dan B pada nomor kedua.",
    ].join("\n"),
    soal: [
      [21, "21. What does Ahmed say about last week's seminar?", ["He wasn't able to get there on time.", "He didn't know all the students.", "He couldn't understand everything."]],
      [22, "22. What does the tutor say about Ahmed's preparation for the seminar?", ["He was better prepared than some students.", "He completed some useful work.", "He read some useful articles."]],
      [23, "23. What does Ahmed say about his participation in the seminar?", ["He tended to speak to his neighbour only.", "He spoke when other students were talking.", "He felt embarrassed when students looked at him."]],
      [24, "24. What does Ahmed worry about most in seminars?", ["Speaking at the right time", "Taking enough notes", "Staying focused"]],
      [25, "25. What does Ahmed say about his role in the group?", ["He hasn't thought about it.", "He'd like to change it.", "He feels he is acting a part."]],
      [26, "26. At the next seminar, Ahmed's tutor suggests that he should:", ["Give other students more help with their work.", "Observe the behaviour of other students.", "Ask other students for their views."]],
      [27, "27. Strategies for the next seminar — FIRST letter (alphabetical order)."],
      [28, "28. Strategies for the next seminar — SECOND letter (alphabetical order)."],
      [29, "29. Suggestions about taking notes — FIRST letter (alphabetical order)."],
      [30, "30. Suggestions about taking notes — SECOND letter (alphabetical order)."],
    ],
  },
  {
    nomor: 4,
    judul: "Section 4 — Desert plants",
    instruksi: [
      "Questions 31–40",
      "Complete the notes below.",
      "Write NO MORE THAN TWO WORDS for each answer.",
    ].join("\n"),
    soal: [
      [31, "DESERT PLANTS — Background\n\n31. Deserts are found in what is known as a ______________ (or dry area)."],
      [32, "32. Annual rainfall, if any, amounts to a ______________."],
      [33, "33. Soil contains a lot of salt and ______________."],
      [34, "General Adaptations of Desert Plants\n\n34. They can ______________ and store water.\n(They also have features that reduce water loss.)"],
      [35, "Examples of Adaptations\n\n35. Saguaro Cactus: Stores water in its ______________."],
      [36, "36. Barrel Cactus: Can ______________ or shrink according to weather."],
      [37, "37. Old Man Cactus: Has ______________ that reflect the sun."],
      [38, "38. Prickly Pear Cactus: Has ______________ to keep away animals."],
      [39, "39. Desert Spoon: Leaves are ______________ to reduce water loss."],
      [40, "40. Aloe Plant: Leaf surface acts like a ______________ covering and keeps water inside."],
    ],
  },
];

/* ==========================================================================
   READING
   --------------------------------------------------------------------------
   `paragraf` menunjuk INDEKS BLOK di dalam .docx, berikut potongan kata yang
   wajib ada di dalamnya. `label` mengubah cara paragrafnya ditampilkan:

     "huruf"  -> diawali "A", "B", … . Wajib untuk Passage 2, karena soal
                 54-59 menyuruh peserta menyebut huruf paragrafnya.
     "angka"  -> diawali "1", "2", … . Dipakai Passage 3, karena soal 70
                 menyebut "In paragraph 7".
     null     -> polos.
   ========================================================================== */

export const READING = [
  {
    nomor: 1,
    judul: "Passage 1 — Domestic Robots",
    label: null,
    subjudul: [98, "Machines that look after your home"],
    paragraf: [
      [99, "Floor-cleaning machines"],
      [100, "Domestic robots are supposed to free up time"],
      [101, "It steadily works its way around the room"],
      [102, "So the first observation of life"],
      [103, "The second observation is that"],
      [104, "Similar allowances must be made"],
      [105, "But there is still only a limited range"],
      [106, "Some machines are called robots"],
      [107, "Yet whatever shape or size robots come in"],
    ],
    instruksi: [
      "You should spend about 20 minutes on Questions 41–53.",
      "",
      "Questions 41–46",
      "Do the following statements agree with the information given in Reading Passage 1?",
      "TRUE if the statement agrees with the information",
      "FALSE if the statement contradicts the information",
      "NOT GIVEN if there is no information on this",
      "",
      "Questions 47–50",
      "Answer the questions below.",
      "Use NO MORE THAN THREE WORDS from the passage for each answer.",
      "",
      "Questions 51–53",
      "Complete the labels for the Rovio surveillance robot.",
      "Choose NO MORE THAN THREE WORDS from the passage for each answer.",
    ].join("\n"),
    soal: [
      [41, "TFNG", "41. Improvements have been made to Roomba over time."],
      [42, "TFNG", "42. Obstacles have to be removed from Roomba's path."],
      [43, "TFNG", "43. Roomba keeps cleaning in one place until it thinks it is dirt free."],
      [44, "TFNG", "44. People once found washing machines as fascinating as robots."],
      [45, "TFNG", "45. Comparative studies are available on the intelligence of domestic robots."],
      [46, "TFNG", "46. Roomba tidies up a room as well as cleaning it."],
      [47, "IS", "47. What is used to mark out the mowing area for the Automower?"],
      [48, "IS", "48. What form of renewable energy can some Automowers use?"],
      [49, "IS", "49. What does the ironing robot look like?"],
      [50, "IS", "50. What do people often put on a robot when it is going to be repaired?"],
      [51, "IS", "THE ROVIO — label 1\n\n51. ______________ holding webcam"],
      [52, "IS", "THE ROVIO — label 2\n\n52. Wheel design allows easy ______________"],
      [53, "IS", "THE ROVIO — label 3\n\n53. Manual controls give home-owner ______________ with robot"],
    ],
  },
  {
    nomor: 2,
    judul: "Passage 2 — Deforestation in the 21st century",
    label: "huruf",
    subjudul: [132, "satellite data reveals a shift"],
    paragraf: [
      [133, "Globally, roughly 13 million hectares"],
      [134, "In fact, a statistical analysis of 41 countries"],
      [135, "In other words, the increasing urbanisation"],
      [136, "DeFries argues that in order to help sustain"],
      [137, "But it is not all bad news"],
      [138, "Regardless of this, deforestation continues"],
      [139, "But millions of hectares of pristine forest"],
    ],
    instruksi: [
      "You should spend about 20 minutes on Questions 54–66.",
      "",
      "Questions 54–59",
      "Reading Passage 2 has seven paragraphs, A–G.",
      "Which paragraph contains the following information?",
      "Write the correct letter, A–G. You may use any letter more than once.",
      "",
      "Questions 60–63",
      "Choose TWO letters, A–E, for each pair of questions.",
      "",
      "Questions 60–61 — Which TWO of these reasons do experts give for current",
      "patterns of deforestation?",
      "A  to provide jobs",
      "B  to create transport routes",
      "C  to feed city dwellers",
      "D  to manufacture low-budget consumer items",
      "E  to meet government targets",
      "",
      "Questions 62–63 — The list below gives some of the impacts of tropical",
      "deforestation. Which TWO of these results are mentioned by the writer?",
      "A  local food supplies fall",
      "B  soil becomes less fertile",
      "C  some areas have new forest growth",
      "D  some regions become uninhabitable",
      "E  local economies suffer",
      "",
      "PENTING untuk nomor 60–63: tulis kedua hurufnya BERURUT ABJAD.",
      "",
      "Questions 64–66",
      "Complete the sentences below.",
      "Choose NO MORE THAN TWO WORDS and/or A NUMBER from the passage.",
    ].join("\n"),
    soal: [
      [54, "IS", "54. two ways that farming activity might be improved in the future"],
      [55, "IS", "55. reference to a fall in the rate of deforestation in one area"],
      [56, "IS", "56. the amount of forest cut down annually"],
      [57, "IS", "57. how future transport requirements may increase deforestation levels"],
      [58, "IS", "58. a reference to the typical shape of early deforested areas"],
      [59, "IS", "59. key reasons why forests in some areas have not been cut down"],
      [60, "IS", "60. Reasons for current patterns of deforestation — FIRST letter (alphabetical order)."],
      [61, "IS", "61. Reasons for current patterns of deforestation — SECOND letter (alphabetical order)."],
      [62, "IS", "62. Impacts mentioned by the writer — FIRST letter (alphabetical order)."],
      [63, "IS", "63. Impacts mentioned by the writer — SECOND letter (alphabetical order)."],
      [64, "IS", "64. The expression 'a ______________' is used to assess the amount of wood used in certain types of production."],
      [65, "IS", "65. Greenhouse gases result from the ______________ that remain after trees have been cut down."],
      [66, "IS", "66. About ______________ of the world's tropical forests have not experienced deforestation yet."],
    ],
  },
  {
    nomor: 3,
    judul: "Passage 3 — So you think humans are unique",
    label: "angka",
    subjudul: null,
    paragraf: [
      [176, "There was a time when we thought humans were special"],
      [177, "Alas, it turns out we are not so special"],
      [178, "Take gesture, arguably the starting point"],
      [179, "In an experiment carried out in 2006"],
      [180, "As well as gesturing, pre-linguistic infants babble"],
      [181, "Dolphin calves also pass through a babbling phase"],
      [182, "Of course, language is more than mere sound"],
      [183, "One of the clearest examples of animals making connections"],
      [184, "Clearly animals do have greater talents"],
    ],
    instruksi: [
      "You should spend about 20 minutes on Questions 67–80.",
      "",
      "Questions 67–71",
      "Choose the correct letter, A, B, C or D.",
      "",
      "Questions 72–76",
      "Do the following statements agree with the claims of the writer?",
      "YES if the statement agrees with the claims of the writer",
      "NO if the statement contradicts the claims of the writer",
      "NOT GIVEN if it is impossible to say what the writer thinks about this",
      "",
      "Questions 77–80",
      "Complete the summary using the list of words, A–H, below.",
      "Write the correct letter, A–H, for each answer.",
      "",
      "BABBLING",
      "It seems that humans are not the only species that babble. Before young",
      "infants speak, some experts think that they produce the (77) ______",
      "mixture of human sounds. Over time, however, they copy the language of",
      "their parents, and this affects their ability to pronounce (78) ______",
      "sounds from other languages.",
      "A (79) ______ pattern has been found among dolphins. They produce a range",
      "of individual sounds when they are babies, and then combine some of these",
      "to produce the sounds of (80) ______ dolphins later on.",
      "",
      "A  Adult        B  Rare        C  Similar      D  Full",
      "E  Restricted   F  Sociable    G  Different    H  Random",
    ].join("\n"),
    soal: [
      [67, "PG", "67. What point does the writer make in the first paragraph?", ["We know more about language now than we used to.", "We recognise the importance of talking about emotions.", "We like to believe that language is a strictly human skill.", "We have used tools for longer than some other species."]],
      [68, "PG", "68. According to the writer, what has changed our view of communication?", ["analysing different world languages", "understanding that language involves a range of skills", "studying the different purposes of language", "realising that we can communicate without language"]],
      [69, "PG", "69. The writer quotes the Cartmill and Byrne experiment because it shows", ["the similarities in the way humans and apes use gesture.", "the abilities of apes to use gesture in different environments.", "how food can be used to encourage ape gestures.", "how hard humans find it to interpret ape gestures."]],
      [70, "PG", "70. In paragraph 7, the writer says that one type of dolphin sound is", ["used only when dolphins are in danger.", "heard only at a particular time of day.", "heard at a range of pitch levels.", "used as a form of personal identification."]],
      [71, "PG", "71. Experiments at Edinburgh Zoo showed that chimps were able to", ["use grunts to ask humans for food.", "use pitch changes to express meaning.", "recognise human voices on a recording.", "tell the difference between a false grunt and a real one."]],
      [72, "PG", "72. It could be said that language begins with gesture.", ["YES", "NO", "NOT GIVEN"]],
      [73, "PG", "73. Ape gestures always consist of head or limb movements.", ["YES", "NO", "NOT GIVEN"]],
      [74, "PG", "74. Apes ensure that other apes are aware of their gesturing.", ["YES", "NO", "NOT GIVEN"]],
      [75, "PG", "75. Primate and human gestures share some key features.", ["YES", "NO", "NOT GIVEN"]],
      [76, "PG", "76. Cartoons present an amusing picture of animal communication.", ["YES", "NO", "NOT GIVEN"]],
      [77, "IS", "77. Write the correct letter, A–H."],
      [78, "IS", "78. Write the correct letter, A–H."],
      [79, "IS", "79. Write the correct letter, A–H."],
      [80, "IS", "80. Write the correct letter, A–H."],
    ],
  },
];

/**
 * EJAAN SETARA yang ikut diterima, di luar apa yang tertulis di tabel kunci.
 *
 * Daftarnya sengaja PENDEK dan seluruhnya sejenis: bentuk lain dari jawaban
 * yang SAMA, bukan jawaban lain. Angka telepon yang diketik tanpa spasi tetap
 * angka telepon yang sama, dan "60 per cent" tetap 60%. Penilaian isian singkat
 * di aplikasi ini mencocokkan PERSIS (sesudah huruf kecil dan spasi dirapikan),
 * jadi tanpa daftar ini peserta yang benar bisa dinilai salah karena spasi.
 *
 * Jangan menambahkan jawaban yang maknanya berbeda ke sini — itu bukan
 * kelonggaran ejaan, itu mengubah kunci.
 */
export const EJAAN_SETARA = {
  3: ["09536788545"],
  8: ["TG586"],
  66: ["60 per cent", "60 percent"],
};

/* ==========================================================================
   KUNCI YANG BERUPA PASANGAN HURUF
   --------------------------------------------------------------------------
   Naskah menuliskannya "D / E" dan "E / D" — dua nomor, satu pasangan, urutan
   bebas. Mesin tidak bisa menilai pasangan, jadi urutannya DIPAKUKAN menurut
   abjad dan perintah soalnya menyebutkan itu. Nomor pertama menerima huruf
   yang lebih awal, nomor kedua huruf yang lebih akhir.
   ========================================================================== */
export const PASANGAN_HURUF = [
  [27, 28],
  [29, 30],
  [60, 61],
  [62, 63],
];

/** Menyusun ulang kunci pasangan menjadi berurut abjad. */
export function kunciPasangan(kunciMentahA, kunciMentahB) {
  const huruf = new Set();
  for (const m of [kunciMentahA, kunciMentahB]) {
    for (const h of String(m).toUpperCase().match(/[A-H]/g) ?? []) huruf.add(h);
  }
  const urut = [...huruf].sort();
  if (urut.length !== 2) {
    throw new Error(`Kunci pasangan tidak berisi dua huruf: "${kunciMentahA}" / "${kunciMentahB}"`);
  }
  return urut;
}

/* ==========================================================================
   Indeks blok tabel kunci di dalam .docx
   ========================================================================== */
export const BLOK_KUNCI_LISTENING = 93;
export const BLOK_KUNCI_READING = 229;

export function bacaNaskah() {
  if (!fs.existsSync(BERKAS_NASKAH)) {
    throw new Error(`Naskah tidak ditemukan: ${BERKAS_NASKAH}`);
  }
  return fs.readFileSync(BERKAS_NASKAH);
}
