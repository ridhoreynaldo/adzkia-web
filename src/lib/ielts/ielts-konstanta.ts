/**
 * IELTS — angka, bentuk soal, dan tata tertib yang dipakai kedua sisi.
 *
 * Berkas murni tanpa `server-only` (pola yang sama dengan `admin-konstanta.ts`
 * dan `gambar-soal-konstanta.ts`): komponen klien — ruang ujian, pemutar audio,
 * editor butir — memakai angka yang sama persis dengan yang ditegakkan server.
 * Bagian yang menyentuh basis data ada di `ielts.ts`.
 *
 * Gerbang tampil/tidaknya seluruh jalur Language Skill ada di
 * `language-konstanta.ts`.
 */

import { AMBANG_KEMBALI_DETIK, BUDGET_PERGI_DETIK } from "@/lib/penjagaan/denyut";

export type SubtesIeltsKode = "LISTENING" | "READING" | "WRITING" | "SPEAKING";

/** Bentuk butir yang didukung ruang ujian IELTS. */
export type TipeSoalIelts =
  /** Pilihan ganda A–D. */
  | "PG"
  /** True / False / Not Given — pilihannya baku, tidak diketik admin. */
  | "TFNG"
  /** Isian singkat (completion). Kunci boleh memuat beberapa jawaban sah. */
  | "IS"
  /** Karangan (Writing Task 1/2). Tidak dinilai otomatis. */
  | "ESAI";

export const TIPE_SOAL_IELTS: TipeSoalIelts[] = ["PG", "TFNG", "IS", "ESAI"];

export const LABEL_TIPE: Record<TipeSoalIelts, string> = {
  PG: "Multiple choice",
  TFNG: "True / False / Not Given",
  IS: "Short answer",
  ESAI: "Essay",
};

/** Pilihan baku True/False/Not Given — tidak diketik admin. */
export const OPSI_TFNG = ["TRUE", "FALSE", "NOT GIVEN"];

/** Huruf pilihan ganda IELTS: A–D, bukan A–E seperti UTBK. */
export const HURUF_PG = ["A", "B", "C", "D"];

export interface SubtesIelts {
  kode: SubtesIeltsKode;
  nama: string;
  /** Urutan pengerjaan. Subtes hanya terbuka bila yang sebelumnya sudah tutup. */
  urutan: number;
  /** Lama pengerjaan, ditetapkan pengelola 9 September 2026. */
  menit: number;
  /** Jumlah butir yang ditargetkan. */
  jumlahSoal: number;
  /** Banyak bagian (recording / passage / task). */
  jumlahSeksi: number;
  /** Butir per bagian; null bila boleh tidak rata (mis. Reading). */
  soalPerSeksi: number | null;
  /** Bagiannya membawa berkas suara — sejauh ini hanya Listening. */
  pakaiAudio: boolean;
  /** Sebutan satu bagian di layar admin ("Recording 1", "Passage 2", …). */
  labelSeksi: string;
  /** Bentuk butir yang lazim; dipakai sebagai bawaan editor. */
  tipeBawaan: TipeSoalIelts;
  ringkas: string;
}

/**
 * Empat subtes IELTS beserta lama pengerjaannya.
 *
 * PERHATIAN: menitnya SENGAJA tidak sama dengan IELTS internasional
 * (30/60/60/11–14). Angka di bawah ditetapkan pengelola Adzkia 9 September 2026
 * untuk latihan di sekolah — Listening dilebihkan supaya siswa sempat menyalin
 * jawaban, Writing dipendekkan jadi 30 menit. Jangan "diperbaiki" tanpa
 * permintaan pengelola.
 */
export const SUBTES_IELTS: SubtesIelts[] = [
  {
    kode: "LISTENING",
    nama: "Listening",
    urutan: 1,
    menit: 60,
    jumlahSoal: 40,
    jumlahSeksi: 4,
    soalPerSeksi: 10,
    pakaiAudio: true,
    labelSeksi: "Recording",
    tipeBawaan: "IS",
    ringkas: "Four recordings, ten questions each. Every recording is played once only.",
  },
  {
    kode: "READING",
    nama: "Reading",
    urutan: 2,
    menit: 60,
    jumlahSoal: 40,
    jumlahSeksi: 3,
    soalPerSeksi: null,
    pakaiAudio: false,
    labelSeksi: "Passage",
    tipeBawaan: "TFNG",
    ringkas: "Three passages of increasing difficulty, forty questions in total.",
  },
  {
    kode: "WRITING",
    nama: "Writing",
    urutan: 3,
    menit: 30,
    jumlahSoal: 2,
    jumlahSeksi: 2,
    soalPerSeksi: 1,
    pakaiAudio: false,
    labelSeksi: "Task",
    tipeBawaan: "ESAI",
    ringkas: "Task 1 and Task 2, marked by your teacher against the IELTS criteria.",
  },
  {
    kode: "SPEAKING",
    nama: "Speaking",
    urutan: 4,
    menit: 20,
    jumlahSoal: 3,
    jumlahSeksi: 3,
    soalPerSeksi: 1,
    pakaiAudio: false,
    labelSeksi: "Part",
    tipeBawaan: "ESAI",
    ringkas: "Three parts: introduction, long turn, and discussion.",
  },
];

export const KODE_SUBTES_IELTS: SubtesIeltsKode[] = SUBTES_IELTS.map((s) => s.kode);

export const TOTAL_MENIT_IELTS = SUBTES_IELTS.reduce((n, s) => n + s.menit, 0);
export const TOTAL_SOAL_IELTS = SUBTES_IELTS.reduce((n, s) => n + s.jumlahSoal, 0);

export function subtesIelts(kode: string): SubtesIelts | undefined {
  return SUBTES_IELTS.find((s) => s.kode === String(kode).toUpperCase());
}

/** Bentuk kode subtes yang aman dari nilai bebas (alamat, kolom basis data). */
export function keSubtesIelts(nilai: string | null | undefined): SubtesIeltsKode | null {
  const s = subtesIelts(String(nilai ?? ""));
  return s ? s.kode : null;
}

/** Subtes yang harus tuntas lebih dulu; null untuk yang pertama. */
export function subtesSebelum(kode: SubtesIeltsKode): SubtesIelts | null {
  const s = subtesIelts(kode);
  if (!s) return null;
  return SUBTES_IELTS.find((x) => x.urutan === s.urutan - 1) ?? null;
}

/** Status paket IELTS — sengaja sama bunyinya dengan paket tryout. */
export type StatusPaketIelts = "draft" | "published" | "closed";

export const LABEL_STATUS_IELTS: Record<StatusPaketIelts, string> = {
  draft: "Draf",
  published: "Terbit",
  closed: "Ditutup",
};

/**
 * Urutan status pada pemilih — sepadan `STATUS_PAKET` di portal tryout, supaya
 * pengelola menemukan pilihan yang sama persis di kedua jalur.
 */
export const STATUS_PAKET_IELTS: StatusPaketIelts[] = ["draft", "published", "closed"];

/* ==========================================================================
   BERKAS SUARA (Listening)
   ========================================================================== */

/**
 * Batas ukuran satu berkas suara.
 *
 * 25 MB cukup untuk rekaman sekitar 30 menit pada 96 kbps, dan masih jauh di
 * bawah batas Server Action 48 MB yang dipasang di `next.config.ts`.
 */
export const BATAS_AUDIO_MB = 25;
export const BATAS_AUDIO_BYTE = BATAS_AUDIO_MB * 1024 * 1024;

export const FORMAT_AUDIO = [
  { mime: "audio/mpeg", ext: "mp3", label: "MP3" },
  { mime: "audio/mp4", ext: "m4a", label: "M4A" },
  { mime: "audio/ogg", ext: "ogg", label: "OGG" },
  { mime: "audio/wav", ext: "wav", label: "WAV" },
];

export const ACCEPT_AUDIO = FORMAT_AUDIO.map((f) => f.mime).join(",");
export const LABEL_FORMAT_AUDIO = FORMAT_AUDIO.map((f) => f.label).join(", ");

/* ==========================================================================
   TATA TERTIB — ditampilkan sebelum ujian, dalam bahasa Inggris
   --------------------------------------------------------------------------
   Diminta pengelola memakai bahasa dan standar IELTS internasional: peserta
   IELTS sungguhan membaca aturannya dalam bahasa Inggris, dan membiasakan
   siswa dengan kalimat itu bagian dari latihannya sendiri.
   ========================================================================== */

export interface PasalRules {
  judul: string;
  butir: string[];
}

export const RULES_IELTS: PasalRules[] = [
  {
    judul: "Before you begin",
    butir: [
      "Take the four sections in the order shown above. A section only opens once the previous one has been submitted.",
      "Check your headphones or speakers before you start Listening. Each recording is played once only and cannot be restarted.",
      "Close every other application and browser tab. Nothing may be open beside this test.",
      "No dictionaries, translation tools, notes, phones, smart watches or other devices are permitted at any time.",
    ],
  },
  {
    judul: "During the test",
    butir: [
      "Every section is timed separately by the server. The clock keeps running if you close the page, lose your connection or leave the room — it is never paused and never reset.",
      "Inside the section you are working on you may move freely between questions and change any answer until you submit.",
      "A section that has been submitted, or whose time has run out, is closed for good. You cannot return to it and no extra time is given.",
      "Answer in English only. Spelling, grammar and word order are marked: a misspelled answer is marked wrong.",
      "Never write more than the number of words or numbers stated in the question. A contraction such as “don’t” counts as one word, and so does a hyphenated word such as “well-known”.",
      "Your answers are saved automatically as you work. Do not refresh the page while the timer is running.",
    ],
  },
  {
    // Pasal ini WAJIB berdiri sendiri, bukan diselipkan ke "Test discipline",
    // dan angkanya wajib dibaca dari konstanta yang sama dengan yang dipakai
    // server memutuskan. Peserta yang tidak pernah diberi tahu batasnya akan
    // dihentikan oleh hitungan yang tidak pernah ia sadari sedang berjalan —
    // dan itu persis bentuk pengguguran yang sudah pernah menyakiti 46% peserta
    // tryout 4-6 September 2026. Bila ambangnya berubah, kalimat ini ikut
    // berubah dengan sendirinya.
    judul: "Screen monitoring — read this carefully",
    butir: [
      "The test must run in full screen. Your browser will ask for it before the first question appears.",
      "This page watches whether it is still in front of you. Everything below is decided by the server, recorded with the exact time, and reported to your teacher.",
      "Your test is STOPPED immediately if you: open another window, application or browser beside the test page and use it; press ALT+TAB (or Command+Tab) to switch windows, on any device; press ESC and leave full screen — on a computer or laptop only; or take a screenshot of the questions.",
      `Your test is also stopped if you leave the test page for more than ${AMBANG_KEMBALI_DETIK} seconds at once. Leaving briefly and coming straight back does not stop it by itself — but the seconds are ADDED UP, and once your time away reaches ${BUDGET_PERGI_DETIK} seconds in total, the test is stopped. The remaining budget is shown to you every time you come back.`,
      // Ketetapan pengelola 11 September 2026. Peserta HARUS diberi tahu
      // pemaafan ini: siswa yang mengira layarnya tidak boleh padam akan
      // menyentuh layarnya terus-menerus selama rekaman berjalan, dan itu
      // justru merampas perhatiannya dari bagian yang sedang diujikan.
      `While a Listening recording is playing, none of this counts against you. Listening IS the task: you are meant to sit still and listen, so your screen may dim or lock and the ${BUDGET_PERGI_DETIK}-second rule is paused until the recording stops. Pressing ALT+TAB or taking a screenshot still ends the test, even during a recording.`,
      "Copying, right-clicking and press-and-hold on the question text are disabled and recorded. Your own answer boxes are not restricted — you can always edit what you have written.",
      "A slow or broken internet connection does NOT stop your test, and neither does your screen dimming for a moment. Stay on the page and a warning bar will tell you what is happening.",
      "On iPhone and iPad, open the test from the Home Screen icon. Safari's own bar cannot be hidden by a web page, and the reload button and tab list sit one tap away from your questions.",
      "A test stopped for any of the reasons above is not marked, and only the school can open a new attempt for you.",
    ],
  },
  {
    judul: "Test discipline",
    butir: [
      "The work you submit must be entirely your own. Copying, dictating, photographing the screen or helping another candidate ends the test immediately.",
      "Do not speak to anyone except the invigilator. Raise your hand if you need help.",
      "Recording, copying or sharing any part of the test material is a breach of the test regulations and is reported to the school.",
      "The invigilator may stop your test at any time if these rules are broken. A test stopped this way is not marked.",
    ],
  },
  {
    judul: "Marking",
    butir: [
      "Listening and Reading are marked out of 40 raw marks, which are then converted to a band score from 0 to 9.",
      "Writing and Speaking are marked by your teacher against the official IELTS assessment criteria.",
      "Your overall band is the average of the four sections, rounded to the nearest whole or half band.",
      "There is no penalty for a wrong answer, so never leave a question blank.",
    ],
  },
];

/** Kalimat persetujuan di sebelah kotak centang. */
export const TEKS_SETUJU =
  "I have read and understood the test rules above, and I agree to follow them for the whole test.";

/* ==========================================================================
   LAMA PENGERJAAN — bawaan sekolah, preset internasional, dan acak
   --------------------------------------------------------------------------
   `SUBTES_IELTS[].menit` di atas tetap menjadi BAWAAN untuk paket yang
   pengelolanya belum menyentuh waktunya sama sekali. Sejak paket boleh punya
   waktunya sendiri (kolom `menit_*` di `ielts_paket`), angka di sana bukan lagi
   satu-satunya kebenaran: yang berlaku saat ujian dibuka selalu hasil
   `menitPaket()` di `ielts.ts`.
   ========================================================================== */

export type MenitSubtes = Record<SubtesIeltsKode, number>;

/** Batas yang boleh diketik admin. Lebih pendek dari 5 menit tidak masuk akal. */
export const MENIT_MIN = 5;
export const MENIT_MAKS = 180;

export interface PresetMenit {
  kode: string;
  nama: string;
  ket: string;
  menit: MenitSubtes;
}

/**
 * Dua susunan waktu yang sudah jadi, supaya pengelola tidak perlu mengetik
 * empat angka setiap membuat paket.
 *
 * "adzkia" adalah angka yang ditetapkan pengelola 9 September 2026 dan tetap
 * menjadi bawaan; "internasional" adalah waktu IELTS yang sesungguhnya —
 * Listening 30 menit (di kertas ditambah 10 menit menyalin jawaban, yang tidak
 * diperlukan di layar), Reading 60, Writing 60, Speaking 11-14 menit.
 */
export const PRESET_MENIT: PresetMenit[] = [
  {
    kode: "adzkia",
    nama: "Standar Adzkia",
    ket: "Listening dilebihkan, Writing dipendekkan — dipakai latihan di sekolah.",
    menit: { LISTENING: 60, READING: 60, WRITING: 30, SPEAKING: 20 },
  },
  {
    kode: "internasional",
    nama: "Standar IELTS internasional",
    ket: "Persis seperti tes aslinya: 30 / 60 / 60 / 14 menit.",
    menit: { LISTENING: 30, READING: 60, WRITING: 60, SPEAKING: 14 },
  },
];

export function presetMenit(kode: string): PresetMenit | undefined {
  return PRESET_MENIT.find((p) => p.kode === kode);
}

/** Waktu bawaan — yang tertulis di `SUBTES_IELTS`. */
export function menitBawaan(): MenitSubtes {
  return Object.fromEntries(SUBTES_IELTS.map((s) => [s.kode, s.menit])) as MenitSubtes;
}

/**
 * Rentang pengacakan tiap subtes.
 *
 * Dibatasi di sekitar dua preset di atas, bukan 5-180 menit: "acak" dimaksudkan
 * pengelola untuk membuat tiap paket latihan sedikit berbeda supaya siswa tidak
 * menghafal iramanya — bukan untuk melahirkan Writing 7 menit.
 */
export const RENTANG_ACAK: Record<SubtesIeltsKode, [number, number]> = {
  LISTENING: [30, 60],
  READING: [50, 70],
  WRITING: [30, 60],
  SPEAKING: [12, 25],
};

/**
 * Satu susunan waktu acak.
 *
 * Hasilnya selalu KELIPATAN LIMA MENIT, bukan sekadar berjarak lima dari batas
 * bawah rentangnya: siswa membaca angka ini di halaman aturan sebelum menekan
 * mulai, dan "Speaking 22 menit" terbaca seperti kekeliruan sedangkan
 * "Speaking 20 menit" terbaca seperti keputusan.
 */
export function acakMenit(): MenitSubtes {
  const hasil = {} as MenitSubtes;
  for (const s of SUBTES_IELTS) {
    const [min, maks] = RENTANG_ACAK[s.kode];
    const awal = Math.ceil(min / 5) * 5;
    const akhir = Math.floor(maks / 5) * 5;
    if (akhir < awal) {
      hasil[s.kode] = min;
      continue;
    }
    const banyak = (akhir - awal) / 5 + 1;
    hasil[s.kode] = awal + Math.floor(Math.random() * banyak) * 5;
  }
  return hasil;
}

/** Membulatkan dan menjepit satu angka menit yang datang dari formulir. */
export function amanMenit(nilai: unknown, bawaan: number): number {
  const n = Math.round(Number(nilai));
  if (!Number.isFinite(n) || n <= 0) return bawaan;
  return Math.min(MENIT_MAKS, Math.max(MENIT_MIN, n));
}

/* ==========================================================================
   BAND 0-9 — sebutan resmi dan pembulatannya
   ========================================================================== */

/**
 * Sebutan tiap band menurut IELTS. Dipakai di halaman hasil supaya angka 6.5
 * berarti sesuatu bagi siswa, bukan sekadar angka.
 */
export const SEBUTAN_BAND: Record<number, string> = {
  9: "Expert user",
  8: "Very good user",
  7: "Good user",
  6: "Competent user",
  5: "Modest user",
  4: "Limited user",
  3: "Extremely limited user",
  2: "Intermittent user",
  1: "Non-user",
  0: "Did not attempt the test",
};

export function sebutanBand(band: number | null): string {
  if (band === null) return "Belum dinilai";
  return SEBUTAN_BAND[Math.floor(band)] ?? "";
}

/**
 * Pembulatan band IELTS: ke setengah band terdekat, dan yang tepat di tengah
 * dibulatkan KE ATAS.
 *
 * Aturan resminya berbunyi "rata-rata yang berakhiran .25 dinaikkan ke setengah
 * band berikutnya, yang berakhiran .75 dinaikkan ke band bulat berikutnya" —
 * dan itu persis yang dilakukan pembulatan setengah-ke-atas di sini: 6,25 → 6,5
 * dan 6,75 → 7,0. Angka lain jatuh ke setengah band terdekat.
 */
export function bulatkanBand(nilai: number): number {
  return Math.round(nilai * 2) / 2;
}

/* ==========================================================================
   KRITERIA PENILAIAN GURU — Writing & Speaking
   --------------------------------------------------------------------------
   Dua subtes ini tidak punya kunci jawaban; band-nya lahir dari empat kriteria
   resmi IELTS yang masing-masing diberi angka 0-9 oleh guru, lalu dirata-rata.
   Angka kriterianya disimpan apa adanya supaya siswa bisa melihat DI MANA ia
   kurang, bukan hanya berapa hasilnya.
   ========================================================================== */

export interface KriteriaBand {
  kode: string;
  nama: string;
  ket: string;
}

export const KRITERIA_WRITING: KriteriaBand[] = [
  { kode: "TR", nama: "Task Achievement / Response", ket: "Menjawab tugas dengan lengkap dan tepat sasaran." },
  { kode: "CC", nama: "Coherence and Cohesion", ket: "Alur gagasan, paragraf, dan kata penghubung." },
  { kode: "LR", nama: "Lexical Resource", ket: "Kekayaan dan ketepatan pilihan kata." },
  { kode: "GRA", nama: "Grammatical Range and Accuracy", ket: "Ragam dan ketepatan tata bahasa." },
];

export const KRITERIA_SPEAKING: KriteriaBand[] = [
  { kode: "FC", nama: "Fluency and Coherence", ket: "Kelancaran bicara dan keruntutan gagasan." },
  { kode: "LR", nama: "Lexical Resource", ket: "Kekayaan dan ketepatan pilihan kata." },
  { kode: "GRA", nama: "Grammatical Range and Accuracy", ket: "Ragam dan ketepatan tata bahasa." },
  { kode: "PRO", nama: "Pronunciation", ket: "Kejelasan bunyi, tekanan kata, dan intonasi." },
];

export function kriteriaSubtes(kode: SubtesIeltsKode): KriteriaBand[] {
  return kode === "WRITING" ? KRITERIA_WRITING : KRITERIA_SPEAKING;
}

/**
 * Bobot tiap Writing Task saat digabung menjadi satu band Writing.
 *
 * Task 2 dihitung dua kali seperti IELTS asli — karangannya dua kali lebih
 * panjang dan dua kali lebih menentukan.
 */
export const BOBOT_WRITING: Record<number, number> = { 1: 1, 2: 2 };

/** Angka yang sah untuk satu kriteria: 0 sampai 9, boleh setengah. */
export function amanNilaiKriteria(nilai: unknown): number | null {
  const n = Number(nilai);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 9) return null;
  return Math.round(n * 2) / 2;
}
