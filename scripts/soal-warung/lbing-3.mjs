/**
 * Warung Soal — LIT. Bahasa Inggris (LBING) Paket 3, kategori Easy.
 *
 * 20 butir: 15 pilihan ganda, 3 pilihan ganda kompleks, 2 isian singkat.
 * Model INTENS: main idea, inference, rujukan kata, makna kata dalam konteks,
 * NOT stated, dan kelanjutan bacaan. Jenjang Easy.
 */

const TEXT_1 = `<p><b>Text 1</b></p><p>(1) In several towns, libraries have started lending more than books. (2) Members can now borrow drills, sewing machines, camping tents, and even cake tins. (3) The idea is simple: most households own tools they use only twice a year. (4) Sharing them saves both money and storage space. (5) Librarians report an unexpected effect as well. (6) People who come for a drill often leave with a book too. (7) Some critics worry that repairs and missing parts will drain library budgets. (8) So far, however, borrowers have returned items in better condition than expected, perhaps because the lender is a neighbour rather than a shop.</p>`;

const TEXT_2 = `<p><b>Text 2</b></p><p>(1) In my final year, our history teacher always left the chair beside her desk empty. (2) We assumed it was for a guest, or perhaps for a student who had left. (3) Nobody dared to ask. (4) One afternoon, a boy who had failed the last three tests sat there while waiting for the bell. (5) She did not send him away. (6) Instead, she pulled out his answer sheet and went through it with him, line by line. (7) After that, the chair was rarely empty. (8) Years later I learned that she had kept it free on purpose, and that the boy is now a teacher himself.</p>`;

export const SOAL = [
  /* ---------------- Text 1 ---------------- */
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "What is the main idea of Text 1?",
    opsi: [
      "Libraries should stop lending books to their members",
      "Most households own far too many tools",
      "Libraries now lend everyday items, and the benefits go beyond saving money",
      "Repairing borrowed tools is becoming very expensive",
      "Camping tents are the most frequently borrowed item",
    ],
    kunci: "C",
    pembahasan:
      "Kalimat (2) sampai (4) menyebut apa yang dipinjamkan dan penghematannya, lalu kalimat (5) dan (6) menambahkan manfaat yang tidak diduga. Pilihan lain hanya mengambil satu rincian.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "According to the text, why does sharing tools make sense?",
    opsi: [
      "Because most households use such tools only a few times a year",
      "Because tools are difficult to buy in small towns",
      "Because libraries have too much empty space",
      "Because tools break easily when kept at home",
      "Because neighbours rarely talk to each other",
    ],
    kunci: "A",
    pembahasan: "Alasannya tertulis pada kalimat (3) dan ditegaskan kalimat (4).",
  },
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "The word <b>drain</b> in sentence (7) is closest in meaning to …",
    opsi: ["fill", "measure", "protect", "widen", "use up"],
    kunci: "E",
    pembahasan:
      "Kekhawatirannya adalah biaya perbaikan yang menghabiskan anggaran perpustakaan, jadi <i>drain</i> di sini bermakna menguras.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "What is the <b>unexpected effect</b> mentioned in sentence (5)?",
    opsi: [
      "More people joined the library committee",
      "Borrowers of tools also began borrowing books",
      "Libraries received extra funding from the town",
      "Fewer people bought their own drills",
      "Items were returned much later than agreed",
    ],
    kunci: "B",
    pembahasan: "Kalimat (6) langsung menjelaskan efek yang dimaksud kalimat (5).",
  },
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "What do the critics in sentence (7) worry about?",
    opsi: [
      "That members will stop reading books",
      "That the tools will become too popular",
      "That neighbours will argue over the items",
      "That repairs and missing parts will cost the library money",
      "That libraries will have to close earlier",
    ],
    kunci: "D",
    pembahasan: "Kekhawatiran itu disebut langsung pada kalimat (7).",
  },
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan:
      "According to sentence (8), why might borrowers take better care of the items?",
    opsi: [
      "Because the library charges a large deposit",
      "Because all of the items are brand new",
      "Because the lender is a neighbour rather than a shop",
      "Because the items are very inexpensive",
      "Because librarians inspect every item closely",
    ],
    kunci: "C",
    pembahasan:
      "Kata <i>perhaps because</i> pada kalimat (8) memperkenalkan dugaan penyebabnya: yang meminjamkan adalah tetangga, bukan toko.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "Which of the following is NOT stated in Text 1?",
    opsi: [
      "Members must pay a yearly fee to borrow tools",
      "Libraries lend out sewing machines",
      "Sharing tools saves storage space",
      "Some critics are concerned about library budgets",
      "Items have been returned in good condition",
    ],
    kunci: "A",
    pembahasan:
      "Bacaan tidak pernah menyinggung biaya keanggotaan. Empat pilihan lain ada pada kalimat (2), (4), (7), dan (8).",
  },

  /* ---------------- Text 2 ---------------- */
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "Why did the teacher keep the chair beside her desk empty?",
    opsi: [
      "Because a guest was expected every week",
      "Because the chair itself was broken",
      "Because a former student had left it there",
      "Because she disliked having a crowded desk",
      "Because she wanted it available for any student who needed help",
    ],
    kunci: "E",
    pembahasan:
      "Kalimat (8) menyebut ia sengaja mengosongkannya, dan kalimat (5) sampai (7) menunjukkan untuk apa kursi itu akhirnya dipakai.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "What does sentence (7) suggest?",
    opsi: [
      "The teacher finally removed the chair",
      "More students began coming to her for help",
      "The class gradually became noisier",
      "The boy stopped attending school",
      "The chair was given to another teacher",
    ],
    kunci: "B",
    pembahasan:
      "<i>Rarely empty</i> berarti kursi itu hampir selalu terisi — tanda bahwa makin banyak siswa datang sesudah peristiwa pada kalimat (4) sampai (6).",
  },
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "What can be inferred about the boy in sentence (4)?",
    opsi: [
      "He was the best student in the class",
      "He had been asked to sit in that chair",
      "He was waiting for his parents to arrive",
      "He was struggling with the subject",
      "He already wanted to become a teacher",
    ],
    kunci: "D",
    pembahasan:
      "Keterangan <i>had failed the last three tests</i> menunjukkan ia sedang kesulitan, dan itulah yang membuat pertemuan pada kalimat (6) bermakna.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "The phrase <b>line by line</b> in sentence (6) suggests that the teacher …",
    opsi: [
      "read the answers aloud to the whole class",
      "corrected the answer sheet very quickly",
      "went through the work carefully and in detail",
      "wrote a new set of questions for the boy",
      "asked another student to help him",
    ],
    kunci: "C",
    pembahasan:
      "Ungkapan itu menekankan ketelitian: dibahas satu baris demi satu baris, bukan sekilas.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "What is the main theme of Text 2?",
    opsi: [
      "A small, quiet gesture can change someone's path",
      "The importance of strict discipline in the classroom",
      "The difficulty of teaching history to teenagers",
      "The value of keeping a classroom tidy",
      "The friendship between two schoolteachers",
    ],
    kunci: "A",
    pembahasan:
      "Kursi kosong adalah tindakan kecil yang tidak diumumkan, tetapi berujung pada anak itu menjadi guru — persis yang ditutup kalimat (8).",
  },
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "The word <b>dared</b> in sentence (3) is closest in meaning to …",
    opsi: ["remembered", "refused", "managed", "promised", "had the courage"],
    kunci: "E",
    pembahasan:
      "<i>Nobody dared to ask</i> berarti tidak seorang pun berani bertanya, bukan tidak seorang pun ingat atau menolak.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "How did the narrator's understanding change over time?",
    opsi: [
      "He realised that the teacher disliked the boy",
      "He learned that the empty chair had been left free on purpose",
      "He discovered that the chair belonged to the school office",
      "He found out that the boy had left school early",
      "He decided to become a historian himself",
    ],
    kunci: "B",
    pembahasan:
      "Kalimat (2) memuat dugaan mereka saat itu, sedangkan kalimat (8) memuat kenyataan yang baru diketahui bertahun-tahun kemudian.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "The passage would most likely be followed by a discussion of …",
    opsi: [
      "how to arrange furniture in a classroom",
      "the history syllabus taught in that year",
      "the cost of buying new school furniture",
      "what the narrator learned about helping others quietly",
      "the boy's final examination results",
    ],
    kunci: "D",
    pembahasan:
      "Bacaan berhenti tepat pada saat pencerita memahami maksud gurunya, jadi kelanjutan yang paling wajar adalah pelajaran yang ia petik.",
  },

  /* ---------------- Pilihan ganda kompleks ---------------- */
  {
    tipe: "PGK",
    stimulus: TEXT_1,
    pertanyaan: "Decide whether each statement is TRUE (B) or FALSE (S) based on Text 1.",
    opsi: [
      "Libraries in some towns lend items such as drills and camping tents.",
      "According to the text, borrowers have returned items in poor condition.",
      "Some critics worry about the cost of repairs.",
    ],
    kunci: ["B", "S", "B"],
    pembahasan:
      "Kalimat (8) justru menyebut barang dikembalikan dalam keadaan lebih baik daripada yang diperkirakan.",
  },
  {
    tipe: "PGK",
    stimulus: TEXT_2,
    pertanyaan: "Decide whether each statement is TRUE (B) or FALSE (S) based on Text 2.",
    opsi: [
      "The teacher sent the boy away from the chair.",
      "The teacher went through the boy's answer sheet with him.",
      "After that afternoon, the chair was rarely empty.",
      "The boy later became a teacher himself.",
    ],
    kunci: ["S", "B", "B", "B"],
    pembahasan:
      "Kalimat (5) menyatakan <i>she did not send him away</i>. Tiga pernyataan lain sesuai kalimat (6), (7), dan (8).",
  },
  {
    tipe: "PGK",
    stimulus:
      "<p>Read the sentence below.</p><p><i>“Had she not kept the chair free, the boy might never have asked for help.”</i></p>",
    pertanyaan: "Decide whether each statement is TRUE (B) or FALSE (S).",
    opsi: [
      "The sentence describes a situation that did not actually happen.",
      "<b>Had she not kept</b> can be rewritten as <b>If she had not kept</b>.",
      "The sentence states that the boy definitely never asked for help.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Kalimat pengandaian bentuk ketiga membicarakan keadaan yang berlawanan dengan kenyataan. Kenyataannya kursi itu memang dikosongkan dan anak itu memang meminta bantuan.",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    stimulus: TEXT_1,
    pertanyaan:
      "In sentence (2) of Text 1, members can borrow drills, sewing machines, camping tents, and even cake … (answer with ONE word)",
    kunci: "tins",
    pembahasan: "Kalimat (2) berakhir dengan “and even cake <b>tins</b>”.",
  },
  {
    tipe: "IS",
    stimulus: TEXT_2,
    pertanyaan: "What subject did the teacher in Text 2 teach? (answer with ONE word)",
    kunci: "history",
    pembahasan: "Kalimat (1) menyebutnya <i>our history teacher</i>.",
  },
];
