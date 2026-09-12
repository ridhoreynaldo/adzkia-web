/**
 * Warung Soal — LIT. Bahasa Inggris (LBING) Paket 2, kategori Easy.
 *
 * 20 butir: 15 pilihan ganda, 3 pilihan ganda kompleks, 2 isian singkat.
 * Bacaan ditulis sendiri untuk keperluan latihan; pertanyaan memakai bahasa
 * Inggris seperti pada subtes aslinya, sedangkan pembahasan berbahasa
 * Indonesia agar siswa tetap terbantu saat belajar mandiri.
 */

const TEXT_1 = `<p><b>Text 1</b></p><p>(1) In several crowded cities, empty rooftops are slowly turning green. (2) Residents plant vegetables in shallow boxes, using soil light enough not to strain the building. (3) A single rooftop rarely produces enough food for a whole family, but it changes something else: people begin to notice where their food comes from. (4) Studies in three cities found that families with rooftop gardens threw away less food than their neighbours did. (5) Growing even a handful of tomatoes, it seems, makes waste harder to ignore. (6) Critics point out that rooftop farming can never feed a city. (7) Supporters agree — and argue that feeding the city was never the point.</p>`;

const TEXT_2 = `<p><b>Text 2</b></p><p>(1) My grandmother kept an old radio on the kitchen shelf, right beside the salt. (2) It picked up only two stations, and one of them was mostly noise. (3) Every evening she turned it on anyway while she cooked, humming to songs she could barely hear. (4) When I bought her a new one, she thanked me politely and put it in the cupboard. (5) The old radio stayed on the shelf. (6) “This one knows my kitchen,” she said, and went back to stirring the soup. (7) I laughed then. (8) Years later, standing in my own quiet kitchen, I finally understood.</p>`;

export const SOAL = [
  /* ---------------- Text 1 ---------------- */
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "What is the main idea of Text 1?",
    opsi: [
      "Rooftop gardens can solve the food problem of large cities",
      "Growing vegetables requires heavy soil and strong buildings",
      "Rooftop gardens change how people think about food more than how much food they get",
      "Cities should stop constructing buildings on empty land",
      "Families in three cities have stopped buying vegetables",
    ],
    kunci: "C",
    pembahasan:
      "Kalimat (3) menjadi poros bacaan: hasil panennya sedikit, tetapi kesadaran orang tentang makanannya berubah. Kalimat (6) dan (7) menegaskan bahwa memberi makan kota memang bukan tujuannya.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "According to the text, what did the studies in three cities find?",
    opsi: [
      "Families with rooftop gardens wasted less food",
      "Families with rooftop gardens paid lower rent",
      "Rooftop gardens produced enough food for whole families",
      "Rooftop gardens damaged the buildings underneath",
      "Neighbours refused to join the rooftop programme",
    ],
    kunci: "A",
    pembahasan: "Temuan itu tertulis langsung pada kalimat (4).",
  },
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "The word <b>strain</b> in sentence (2) is closest in meaning to …",
    opsi: ["decorate", "clean", "measure", "warm", "burden"],
    kunci: "E",
    pembahasan:
      "Konteksnya tanah yang cukup ringan agar tidak <i>membebani</i> bangunan, jadi <i>strain</i> di sini bermakna membebani.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "The phrase <b>something else</b> in sentence (3) refers to …",
    opsi: [
      "the amount of food a rooftop can produce",
      "people's awareness of where their food comes from",
      "the weight of the soil used in the boxes",
      "the number of families living in the building",
      "the price of vegetables in the city",
    ],
    kunci: "B",
    pembahasan:
      "Tanda titik dua sesudah <i>something else</i> langsung menjelaskan maksudnya: orang mulai memperhatikan asal makanannya.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "What is the supporters' attitude in sentence (7)?",
    opsi: [
      "They deny that rooftop farming has any limits",
      "They are angry at the critics",
      "They believe rooftop farming will replace ordinary farms",
      "They accept the criticism but consider it beside the point",
      "They plan to stop rooftop farming altogether",
    ],
    kunci: "D",
    pembahasan:
      "Kata <i>agree</i> menunjukkan mereka menerima kritik itu, lalu <i>was never the point</i> menyatakan kritik tersebut tidak mengenai sasaran.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "Which statement would the author most likely agree with?",
    opsi: [
      "Cities can become self-sufficient through rooftop gardens",
      "Rooftop gardening is a waste of time and money",
      "Small changes in habit can matter even when the harvest is small",
      "Only trained experts should be allowed to grow vegetables",
      "Food waste is not a serious problem in modern cities",
    ],
    kunci: "C",
    pembahasan:
      "Penulis menekankan perubahan kebiasaan (kalimat 4 dan 5), bukan besarnya hasil panen.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "The tone of Text 1 can best be described as …",
    opsi: [
      "balanced and thoughtful",
      "angry and accusing",
      "sad and hopeless",
      "humorous and playful",
      "highly technical",
    ],
    kunci: "A",
    pembahasan:
      "Penulis menyajikan sisi pendukung sekaligus kritiknya tanpa mencela pihak mana pun, jadi nadanya berimbang.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_1,
    pertanyaan: "Which of the following is NOT stated in Text 1?",
    opsi: [
      "Residents use light soil for their rooftop boxes",
      "A single rooftop rarely feeds a whole family",
      "Critics doubt that rooftop farming can feed a city",
      "The studies were carried out in three cities",
      "Local governments pay residents to grow vegetables",
    ],
    kunci: "E",
    pembahasan:
      "Bacaan tidak pernah menyinggung bantuan atau pembayaran dari pemerintah. Empat pilihan lain ada pada kalimat (2), (3), (6), dan (4).",
  },

  /* ---------------- Text 2 ---------------- */
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "Why did the grandmother keep the old radio?",
    opsi: [
      "Because the new radio was broken",
      "Because the old radio was part of her daily life and memories",
      "Because she disliked her grandchild's gift",
      "Because the old radio received more stations",
      "Because the cupboard was already full",
    ],
    kunci: "B",
    pembahasan:
      "Radio itu buruk penerimaannya (kalimat 2), tetapi tetap dinyalakan setiap petang (kalimat 3) dan “mengenal dapurnya” (kalimat 6) — ikatannya kebiasaan dan kenangan.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "What does sentence (8) suggest about the narrator?",
    opsi: [
      "The narrator finally bought another new radio",
      "The narrator had forgotten about the grandmother",
      "The narrator learned how to cook soup",
      "The narrator came to understand the grandmother's feeling",
      "The narrator moved to a different city",
    ],
    kunci: "D",
    pembahasan:
      "Kata <i>finally understood</i> di dapurnya sendiri yang sunyi menunjukkan pemahaman yang datang bertahun-tahun kemudian.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "The sentence “This one knows my kitchen” implies that …",
    opsi: [
      "the radio can recognise human voices",
      "the radio works only in that particular room",
      "the radio has been part of the kitchen for a very long time",
      "the kitchen is too small for a new radio",
      "the grandmother wants an even better radio",
    ],
    kunci: "C",
    pembahasan:
      "Kalimat itu majas personifikasi. Yang dimaksud nenek adalah kebersamaan bertahun-tahun antara radio dan dapurnya.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "How did the grandmother respond to the new radio?",
    opsi: [
      "She thanked the narrator but did not use it",
      "She refused to accept it",
      "She gave it away to a neighbour",
      "She used it every evening while cooking",
      "She sold it at the market",
    ],
    kunci: "A",
    pembahasan: "Kalimat (4): ia berterima kasih dengan sopan lalu menyimpannya di lemari.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "What is the main theme of Text 2?",
    opsi: [
      "The importance of modern technology in the kitchen",
      "The difficulty of cooking without music",
      "The gap between grandparents and their grandchildren",
      "The value of expensive gifts",
      "The quiet attachment people form to ordinary things",
    ],
    kunci: "E",
    pembahasan:
      "Cerita berpusat pada benda sederhana yang bermakna besar bagi pemiliknya, bukan pada teknologi maupun pertentangan antargenerasi.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "The word <b>anyway</b> in sentence (3) suggests that …",
    opsi: [
      "the radio was very expensive",
      "she turned it on despite its poor reception",
      "she preferred complete silence while cooking",
      "the songs were her lifelong favourites",
      "she had no other work to do",
    ],
    kunci: "B",
    pembahasan:
      "<i>Anyway</i> menandai tindakan yang tetap dilakukan meski keadaannya tidak mendukung — di sini siarannya buruk.",
  },
  {
    tipe: "PG",
    stimulus: TEXT_2,
    pertanyaan: "Which word best describes the narrator's feeling in sentence (7)?",
    opsi: ["bitter", "frightened", "jealous", "amused", "furious"],
    kunci: "D",
    pembahasan:
      "Tokoh <i>I</i> tertawa mendengar ucapan neneknya, jadi perasaannya geli — belum mengerti, tetapi tidak marah.",
  },

  /* ---------------- Pilihan ganda kompleks (Benar/Salah) ---------------- */
  {
    tipe: "PGK",
    stimulus: TEXT_1,
    pertanyaan: "Decide whether each statement is TRUE (B) or FALSE (S) based on Text 1.",
    opsi: [
      "A single rooftop rarely produces enough food for a whole family.",
      "Families with rooftop gardens threw away less food than their neighbours.",
      "The author claims that rooftop farming can feed an entire city.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "Dua pernyataan pertama ada pada kalimat (3) dan (4). Pernyataan ketiga bertentangan dengan kalimat (6) dan (7).",
  },
  {
    tipe: "PGK",
    stimulus: TEXT_2,
    pertanyaan: "Decide whether each statement is TRUE (B) or FALSE (S) based on Text 2.",
    opsi: [
      "The old radio could receive only two stations.",
      "The grandmother put the new radio in the cupboard.",
      "The narrator understood his grandmother on the very same day.",
      "The old radio remained on the kitchen shelf.",
    ],
    kunci: ["B", "B", "S", "B"],
    pembahasan:
      "Kalimat (2), (4), dan (5) mendukung tiga pernyataan. Kalimat (7) dan (8) menunjukkan pemahaman itu baru datang bertahun-tahun kemudian.",
  },
  {
    tipe: "PGK",
    stimulus:
      "<p>Read the sentence below.</p><p><i>“Although the rain had stopped, the field was still too wet for the match to begin.”</i></p>",
    pertanyaan: "Decide whether each statement is TRUE (B) or FALSE (S).",
    opsi: [
      "The sentence contains a clause showing contrast.",
      "<b>Although</b> can be replaced with <b>Even though</b> without changing the meaning.",
      "<b>Although</b> can be replaced with <b>Because</b> without changing the meaning.",
    ],
    kunci: ["B", "B", "S"],
    pembahasan:
      "<i>Although</i> dan <i>even though</i> sama-sama menyatakan pertentangan, sedangkan <i>because</i> menyatakan sebab sehingga maknanya berubah.",
  },

  /* ---------------- Isian singkat ---------------- */
  {
    tipe: "IS",
    stimulus: TEXT_1,
    pertanyaan:
      "In sentence (2) of Text 1, residents plant their vegetables in shallow … (answer with ONE word)",
    kunci: "boxes",
    pembahasan:
      "Kalimat (2) berbunyi “Residents plant vegetables in shallow <b>boxes</b>”, jadi jawabannya <i>boxes</i>.",
  },
  {
    tipe: "IS",
    stimulus: TEXT_2,
    pertanyaan:
      "Which ONE word in sentence (2) of Text 2 means “sound without any clear meaning”?",
    kunci: "noise",
    pembahasan:
      "Kalimat (2) menyebut salah satu stasiun radio itu <i>mostly noise</i>, yaitu suara berisik tanpa makna yang jelas.",
  },
];
