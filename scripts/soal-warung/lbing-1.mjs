/**
 * Warung Soal — LIT. Bahasa Inggris (LBING) Paket 1, kategori Easy.
 *
 * 20 butir: 15 pilihan ganda, 3 pilihan ganda kompleks, 2 isian singkat.
 *
 * Modelnya mengikuti naskah Tryout Prosus Inten: bacaan lalu ditanyakan main
 * idea, inference, rujukan kata, makna kata dalam konteks, sikap penulis,
 * pernyataan yang NOT stated, dan kelanjutan bacaan. Karena jenjang Easy,
 * bacaannya pendek dan jawabannya masih dapat dilacak langsung dari teks.
 * Pertanyaan berbahasa Inggris seperti pada subtes aslinya, sedangkan
 * pembahasan berbahasa Indonesia agar siswa terbantu saat belajar mandiri.
 */

const TEXT_1 = `<p><b>Text 1</b></p><p>(1) Many students now type their notes on a laptop instead of writing them by hand. (2) Typing is faster, and the notes are easier to search later. (3) Yet several studies suggest that students who write by hand remember more of what they hear. (4) The reason is not the pen itself. (5) Because writing is slower, students cannot copy every word, so they must decide what matters. (6) That decision is where the learning happens. (7) Typists, in contrast, often record a lecture almost word for word without processing it. (8) The advice from researchers is simple: type if you must, but do not try to catch everything.</p>`;

const TEXT_2 = `<p><b>Text 2</b></p><p>(1) My father sold fried bananas from a small cart at the corner of our street. (2) He never used a sign, and he never called out to anyone. (3) People simply knew: if the cart was there, the bananas were fresh. (4) Once, a supplier offered him cheaper bananas that were slightly bruised. (5) My father thanked him and said no. (6) That evening we ate plain rice because he had not earned enough. (7) I was angry with him for a long time. (8) Years later, a customer told me she had been coming to that corner for eleven years. (9) Only then did I understand what my father had been buying with our plain rice.</p>`;

export const SOAL = [
  /* ---------------- Text 1 ---------------- */
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "What is the main idea of Text 1?",
    opsi: [
      "Laptops should be banned from every classroom",
      "Typing notes is always better than writing by hand",
      "Handwriting helps memory because it forces students to select what matters",
      "Students should write down every word a teacher says",
      "Being able to search one's notes is the most important part of studying",
    ],
    kunci: "C",
    pembahasan:
      "Kalimat (3) memperkenalkan temuannya dan kalimat (5) serta (6) menjelaskan sebabnya: menulis yang lambat memaksa siswa memilih. Pilihan A terlalu jauh, sebab kalimat (8) justru masih membolehkan mengetik.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "According to the text, why do handwritten notes help students remember more?",
    opsi: [
      "Because writing slowly forces students to choose what is important",
      "Because pens are easier to carry than laptops",
      "Because handwriting is faster than typing",
      "Because handwritten notes can be searched more easily",
      "Because most teachers prefer handwritten notes",
    ],
    kunci: "A",
    pembahasan:
      "Kalimat (4) menegaskan penyebabnya bukan penanya, lalu kalimat (5) menyebutkan sebab yang sesungguhnya.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "The word <b>processing</b> in sentence (7) is closest in meaning to …",
    opsi: ["copying", "printing", "deleting", "repeating", "thinking about"],
    kunci: "E",
    pembahasan:
      "Kalimat itu mempertentangkan mencatat kata demi kata dengan <i>processing</i>, jadi maknanya mengolah atau memikirkan isinya.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "What does <b>That decision</b> in sentence (6) refer to?",
    opsi: [
      "the decision to use a laptop in class",
      "the decision about which information matters",
      "the decision to attend the lecture",
      "the decision to study together with friends",
      "the decision to buy a new pen",
    ],
    kunci: "B",
    pembahasan:
      "Kalimat (5) berakhir dengan <i>they must decide what matters</i>, dan kalimat (6) langsung menunjuk keputusan itu.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "What do the researchers advise in sentence (8)?",
    opsi: [
      "Students must stop typing their notes completely",
      "Students should record every single word",
      "Students should avoid taking notes at all",
      "Students may type, but should not try to capture everything",
      "Students should write their notes only after the lecture ends",
    ],
    kunci: "D",
    pembahasan:
      "Nasihatnya berupa dua bagian: <i>type if you must</i> (boleh mengetik) dan <i>do not try to catch everything</i> (jangan menangkap semuanya).",
  },
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "The author's attitude toward typing notes can best be described as …",
    opsi: [
      "completely opposed",
      "strongly enthusiastic",
      "accepting but cautious",
      "confused and uncertain",
      "entirely indifferent",
    ],
    kunci: "C",
    pembahasan:
      "Penulis mengakui kelebihan mengetik pada kalimat (2), tetapi memberi peringatan pada kalimat (7) dan (8). Sikap seperti itu menerima dengan syarat.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "Which of the following is NOT stated in Text 1?",
    opsi: [
      "Handwriting improves students' examination scores",
      "Typing is faster than writing by hand",
      "Typed notes are easier to search",
      "Some students record a lecture almost word for word",
      "Writing by hand is slower than typing",
    ],
    kunci: "A",
    pembahasan:
      "Bacaan hanya berbicara tentang daya ingat, bukan nilai ujian. Empat pilihan lain ada pada kalimat (2), (5), dan (7).",
  },

  /* ---------------- Text 2 ---------------- */
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "Why did the father refuse the cheaper bananas?",
    opsi: [
      "Because the supplier had cheated him before",
      "Because he had already bought enough that day",
      "Because he did not like the supplier personally",
      "Because the price was still too high for him",
      "Because he did not want to sell fruit of poor quality",
    ],
    kunci: "E",
    pembahasan:
      "Pisang yang ditawarkan <i>slightly bruised</i>, sedangkan reputasinya pada kalimat (3) justru bertumpu pada kesegaran barangnya.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "What does sentence (9) suggest about the narrator?",
    opsi: [
      "The narrator started selling bananas as well",
      "The narrator finally understood his father's choice",
      "The narrator was still angry with his father",
      "The narrator moved away to another street",
      "The narrator had grown to prefer plain rice",
    ],
    kunci: "B",
    pembahasan:
      "Ungkapan <i>only then did I understand</i> menandai pemahaman yang datang jauh sesudah peristiwanya, membalik kemarahan pada kalimat (7).",
  },
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "The phrase <b>People simply knew</b> in sentence (3) implies that …",
    opsi: [
      "the father advertised his cart widely",
      "most of the customers were his relatives",
      "the street corner was always very crowded",
      "the father's reputation spread without any advertising",
      "the bananas were sold at a very low price",
    ],
    kunci: "D",
    pembahasan:
      "Kalimat (2) menyebut ia tidak pernah memasang papan nama maupun berteriak menawarkan. Jadi orang mengenalnya dari mutu, bukan dari iklan.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "What is the main theme of Text 2?",
    opsi: [
      "The difficulty of selling food on the street",
      "The importance of clever advertising",
      "Keeping quality even when it costs something",
      "The value of saving money for one's family",
      "The friendship between a seller and a supplier",
    ],
    kunci: "C",
    pembahasan:
      "Menolak pisang murah membuat keluarganya makan nasi putih malam itu. Harga yang dibayar itulah yang membuat kesetiaan pelanggan pada kalimat (8) bermakna.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "The word <b>bruised</b> in sentence (4) is closest in meaning to …",
    opsi: ["damaged", "sweet", "unripe", "expensive", "freshly picked"],
    kunci: "A",
    pembahasan:
      "<i>Bruised</i> berarti memar atau rusak sedikit karena benturan — sebab itulah pisangnya ditawarkan lebih murah.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "How did the narrator feel in sentence (7)?",
    opsi: ["proud", "amused", "relieved", "grateful", "resentful"],
    kunci: "E",
    pembahasan:
      "Kata <i>angry … for a long time</i> menunjukkan kemarahan yang mengendap, bukan rasa bangga maupun syukur.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "What can be inferred from sentence (8)?",
    opsi: [
      "The customer had only recently moved to the area",
      "The father had kept his customers for many years",
      "The cart had been sold to another seller",
      "The customer did not really like fried bananas",
      "The father raised his prices every year",
    ],
    kunci: "B",
    pembahasan:
      "Seorang pelanggan yang datang selama sebelas tahun adalah bukti kesetiaan pembeli — hasil dari keputusan pada kalimat (5).",
  },
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "The passage would most likely be followed by a discussion of …",
    opsi: [
      "how to fry bananas properly",
      "the price of fruit in the local market",
      "the history of street carts in the city",
      "what the narrator learned and now applies in his own life",
      "the supplier's later business ventures",
    ],
    kunci: "D",
    pembahasan:
      "Bacaan berakhir tepat pada saat tokoh <i>I</i> memahami pelajaran dari ayahnya, jadi kelanjutan yang paling wajar adalah penerapan pelajaran itu.",
  },

  /* ---------------- Pilihan ganda kompleks (Benar/Salah) ---------------- */
  {
    tipe: "PGK",
    stimulus: TEXT_1,
    pertanyaan: "Decide whether each statement is TRUE (B) or FALSE (S) based on Text 1.",
    opsi: [
      "The text says that typing is faster than writing by hand.",
      "According to the text, handwriting helps because the pen itself improves memory.",
      "Researchers advise students not to try to capture every word.",
    ],
    kunci: ["B", "S", "B"],
    pembahasan:
      "Kalimat (4) justru menegaskan <i>the reason is not the pen itself</i>, sehingga pernyataan kedua salah.",
  },
  {
    tipe: "PGK",
    stimulus: TEXT_2,
    pertanyaan: "Decide whether each statement is TRUE (B) or FALSE (S) based on Text 2.",
    opsi: [
      "The father used a large sign to attract customers.",
      "The father refused the cheaper bananas he was offered.",
      "The narrator understood his father only years later.",
      "The family ate plain rice on that evening.",
    ],
    kunci: ["S", "B", "B", "B"],
    pembahasan:
      "Kalimat (2) menyebut ia tidak pernah memakai papan nama. Tiga pernyataan lain sesuai kalimat (5), (9), dan (6).",
  },
  {
    tipe: "PGK",
    stimulus:
      "<p>Read the sentence below.</p><p><i>“Not only did she finish the task early, but she also helped her classmates.”</i></p>",
    pertanyaan: "Decide whether each statement is TRUE (B) or FALSE (S).",
    opsi: [
      "The sentence joins two positive statements about the same person.",
      "Placing <b>Not only</b> at the beginning makes the subject and the auxiliary swap places.",
      "<b>Not only … but also</b> here shows a contrast between two opposite ideas.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Bentuk <i>not only … but also</i> menambahkan, bukan mempertentangkan. Susunan <i>did she finish</i> menunjukkan pembalikan subjek dan kata bantu.",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    stimulus: TEXT_1,
    pertanyaan:
      "In sentence (1) of Text 1, many students type their notes on a … (answer with ONE word)",
    kunci: "laptop",
    pembahasan:
      "Kalimat (1) berbunyi “type their notes on a <b>laptop</b> instead of writing them by hand”.",
  },
  {
    tipe: "IS",
    stimulus: TEXT_2,
    pertanyaan:
      "What fruit did the narrator's father sell from his cart? (answer with ONE word)",
    kunci: "bananas",
    pembahasan:
      "Kalimat (1) menyebut ayahnya menjual <i>fried bananas</i> dari sebuah gerobak kecil.",
  },
];
