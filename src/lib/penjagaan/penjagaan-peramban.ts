/**
 * PENJAGAAN UJIAN — penolong sisi PERAMBAN yang tidak menyimpan keadaan apa pun.
 *
 * Isinya dipindahkan apa adanya dari `components/exam/RuangUjian.tsx` pada 10
 * September 2026, ketika ruang ujian IELTS mulai memakai penjagaan yang sama.
 * Sebabnya satu: sebagian besar fungsi di bawah adalah HASIL PERBAIKAN kutu
 * yang mahal — panel sistem WebKit yang membekukan halaman, iPadOS yang
 * melepas layar penuh sendiri saat papan ketik naik, ALT+TAB yang ditelan
 * sistem operasi sebelum peramban melihatnya. Menyalinnya ke ruang ujian kedua
 * berarti membiarkan dua salinan berbeda pendapat cepat atau lambat, dan yang
 * dibayar untuk itu adalah peserta yang digugurkan tanpa berbuat salah.
 *
 * SYARAT BERKAS INI: tidak ada React, tidak ada keadaan, tidak ada `server-only`.
 * Seluruhnya fungsi murni atau pembaca `document`/`navigator`, sehingga bisa
 * dipanggil dari komponen mana pun DAN diperiksa `npm run cek:jaga` dengan
 * `node` biasa.
 */

/** Jeda minimum antar-laporan percobaan curang sejenis, supaya tidak membanjiri. */
export const JEDA_LAPOR_CURANG = 3000; // ms

/**
 * Masa siaga sesudah transisi layar penuh: beberapa peramban sesaat melepas
 * fokus ketika masuk/keluar mode layar penuh, dan itu gerakan sistem, bukan
 * perbuatan peserta.
 */
export const MASA_SIAGA = 1200; // ms

/**
 * Selama ini sesudah kolom isian singkat dilepas, lepasnya mode layar penuh
 * masih dianggap ulah PAPAN KETIK LAYAR — bukan perbuatan peserta. WebKit di
 * iPadOS MELEPAS layar penuh sendiri begitu papan ketik naik untuk sebuah
 * <input>; jendelanya perlu selebar ini karena urutan peristiwanya tidak
 * dijamin (`focusout` kadang datang lebih dulu daripada `fullscreenchange`).
 */
export const MASA_PAPAN_KETIK = 2500; // ms

/**
 * Sejauh ini sesudah tombol pelepas layar penuh ditekan, lepasnya mode layar
 * penuh dianggap ulah tombol itu — bukan ulah papan ketik layar.
 */
export const MASA_TOMBOL_LEPAS = 1500; // ms

/** Sejauh ini jari boleh bergeser sebelum dihitung menggulung, bukan menahan. */
export const GESER_TOLERANSI = 12; // px

/* ------------------------------------------------------------------
   Layar penuh lintas peramban.

   Safari lama (dan iPad) memakai awalan `webkit`. iPhone TIDAK MENDUKUNG
   Fullscreen API sama sekali — `requestFullscreen` maupun versi webkit-nya
   tidak ada pada elemen selain <video>. Sebelum ini, memanggilnya di iPhone
   melempar galat, gerbang "Masuk Layar Penuh" tidak pernah terlewati, dan
   ruang ujian tampil dengan bilah Safari masih menempel di atas dan bawah.

   Untuk perangkat semacam itu dipakai LAYAR PENUH SEMU: halaman dikunci
   setinggi viewport yang terlihat (`.ruang-semu`, 100dvh) sehingga tidak ada
   yang terpotong, dan penjagaan pindah tab/hilang fokus tetap berjalan penuh.
   ------------------------------------------------------------------ */
export type ElemenLayarPenuh = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
export type DokumenLayarPenuh = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

export function elemenLayarPenuh(): Element | null {
  const d = document as DokumenLayarPenuh;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

export function keluarLayarPenuh(): void {
  const d = document as DokumenLayarPenuh;
  if (!elemenLayarPenuh()) return;
  try {
    void Promise.resolve(d.exitFullscreen?.() ?? d.webkitExitFullscreen?.()).catch(() => {});
  } catch {
    /* peramban menolak: bukan hal yang perlu menghentikan apa pun */
  }
}

/** true bila peramban benar-benar punya Fullscreen API (bukan iPhone). */
export function adaApiLayarPenuh(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.documentElement as ElemenLayarPenuh;
  return typeof el.requestFullscreen === "function" || typeof el.webkitRequestFullscreen === "function";
}

/**
 * true bila ujian ini dikerjakan dari PERAMBAN KOMPUTER — Chrome, Firefox,
 * Opera, Edge, Brave, atau Safari di laptop/PC — bukan dari peramban ponsel.
 *
 * Inilah pemisah yang membuat dua permintaan pengelola yang tampak bertentangan
 * bisa hidup bersama. Di komputer, mode layar penuh TIDAK PUNYA cara lepas
 * selain tombol yang ditekan seseorang: tidak ada notifikasi yang melepasnya,
 * tidak ada putaran layar, tidak ada isyarat navigasi. Maka lepasnya layar
 * penuh di sana adalah bukti perbuatan, dan sejak 8 September 2026 itu
 * menggugurkan. Di ponsel dan tablet ketiga hal itu semuanya ada — dan justru
 * di sanalah 46% pengguguran salah tangkap 4-6 September 2026 terjadi — jadi
 * aturannya TIDAK diberlakukan.
 *
 * Dua syaratnya sengaja digabung. `hover: hover` + `pointer: fine` menandai
 * tetikus sungguhan (tablet ber-keyboard pun lolos hanya bila tetikusnya ada),
 * dan Fullscreen API memastikan ada layar penuh yang bisa dilepas sama sekali.
 */
/**
 * true bila tombol Command di perangkat ini memang dipakai BERPINDAH JENDELA
 * (Command+Tab): Mac, iPad, dan iPhone.
 *
 * Di Windows dan Linux tombol yang sama dilaporkan sebagai `metaKey` tetapi
 * artinya lain sama sekali — tombol Windows/Super membuka menu Mulai. Karena
 * ALT+TAB kini menggugurkan di SEMUA perangkat, salah menghitungnya di sana
 * berarti menggugurkan peserta atas perbuatan yang tidak pernah ia lakukan.
 *
 * UA iPhone/iPad memuat "like Mac OS X", jadi keduanya ikut terbaca di sini —
 * dan itu memang yang diinginkan: iPad dengan papan ketik punya Command+Tab.
 */
export function commandPindahJendela(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? nav.platform ?? "";
  return /Mac/i.test(platform) || /Macintosh|Mac OS X/i.test(nav.userAgent ?? "");
}

export function perambanKomputer(): boolean {
  if (typeof window === "undefined") return false;
  if (!adaApiLayarPenuh()) return false;
  try {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  } catch {
    // Peramban tanpa matchMedia yang benar: perlakukan sebagai bukan komputer.
    // Melewatkan satu kecurangan jauh lebih murah daripada menggugurkan peserta
    // yang perangkatnya tidak bisa kita kenali.
    return false;
  }
}

/** Kemampuan peramban tidak pernah berubah selama halaman hidup. */
export function tanpaLangganan(): () => void {
  return () => {};
}

/** Sudah dipasang ke Layar Utama: di iPhone inilah layar penuh yang sungguhan. */
export function berdiriSendiri(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

/** Peserta tetap harus bisa mengetik dan menyunting jawaban isian singkat. */
export function diKolomIsian(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || el.isContentEditable;
}

/**
 * Kolom yang benar-benar MEMUNCULKAN PAPAN KETIK LAYAR.
 *
 * Bedanya dengan {@link diKolomIsian} penting dan jangan disatukan: pilihan
 * ganda pun dibuat dari <input>, jadi memakai `diKolomIsian` untuk penjagaan
 * layar penuh akan memaafkan lepasnya layar penuh setiap kali peserta menekan
 * salah satu pilihan A-E — jauh lebih luas daripada yang dimaksud. Yang
 * dimaafkan hanya kolom tempat papan ketik sungguhan naik: isian singkat.
 */
export function diKolomTeks(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName.toLowerCase();
  if (tag === "textarea") return true;
  if (tag !== "input") return false;
  const jenis = ((el as HTMLInputElement).type || "text").toLowerCase();
  return !["radio", "checkbox", "button", "submit", "reset", "range", "file", "color", "image"].includes(
    jenis,
  );
}

/**
 * true bila peramban ini MELARANG mengetik selagi halaman berada di layar penuh.
 *
 * WebKit — Safari di iPad, iPhone, dan Mac, berikut semua peramban di iOS/iPadOS
 * yang wajib memakai mesinnya — menggambar panel sistemnya sendiri begitu ada
 * tombol ditekan di kolom teks selagi halaman berada di mode layar penuh:
 *
 *   "It looks like you are typing while in full screen.
 *    Typing is not allowed in full screen websites."
 *
 * Panel itu MILIK PERAMBAN, bukan halaman. Tidak ada API mana pun yang bisa
 * menutupnya, menundanya, atau mencegahnya muncul — ia lahir dari penjagaan
 * anti-penyamaran WebKit, yang menganggap halaman layar penuh yang menerima
 * ketikan berpotensi meniru kotak sandi peramban.
 *
 * DAN INI BAGIAN YANG MENGGUGURKAN PESERTA: selama panel itu terpampang,
 * JavaScript halaman DIBEKUKAN. Denyut nadi ikut berhenti; sesudah
 * AMBANG_DENYUT_DETIK (20 detik) server melihat keheningan, menyimpulkan
 * pesertanya pergi, lalu menggugurkan ujian. Penguji iPad pengelola mengalaminya
 * persis begitu pada 9 September 2026: panelnya dibiarkan sebentar, dan ujiannya
 * dinyatakan GAGAL padahal ia duduk di depan soal.
 *
 * Satu-satunya obatnya karena itu bukan menutup panelnya, melainkan MEMASTIKAN
 * PANEL ITU TIDAK PERNAH LAHIR: halaman keluar dari layar penuh lebih dulu,
 * sebelum papan ketik sempat naik. Lihat `lepasUntukMengetik`.
 */
export function melarangKetikDiLayarPenuh(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { maxTouchPoints?: number };
  const ua = nav.userAgent ?? "";
  // iPadOS 13+ menyamar sebagai "Macintosh"; yang membedakannya cuma sentuhan.
  const appleSentuh =
    /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (nav.maxTouchPoints ?? 0) > 1);
  const safariMeja =
    /Safari/.test(ua) && !/Chrome|Chromium|Android|Edg|OPR|SamsungBrowser/.test(ua);
  return appleSentuh || safariMeja;
}

/**
 * true bila ruang ujian boleh memakai LAYAR PENUH SUNGGUHAN di peramban ini.
 *
 * Ini keputusan KEBIJAKAN, bukan pemeriksaan kemampuan — dan pemisahan itu
 * penting. `adaApiLayarPenuh()` di atas menjawab "apakah peramban ini punya
 * Fullscreen API"; fungsi ini menjawab "apakah kita boleh memakainya".
 *
 * Di WebKit jawabannya TIDAK, sejak 9 September 2026, dan sebabnya tidak bisa
 * ditawar dengan kode apa pun. Safari melarang halaman layar penuh menerima
 * ketikan: begitu ada tombol ditekan — papan ketik layar maupun papan ketik
 * fisik — ia menggambar panelnya sendiri,
 *
 *   "It looks like you are typing while in full screen. Typing is not allowed
 *    in full screen websites. … May be showing a fake keyboard to trick you
 *    into disclosing personal or financial information."
 *
 * lalu MEMBEKUKAN halaman selama panel itu terpampang. Denyut nadi ikut mati,
 * dan sesudah 20 detik server menggugurkan peserta yang sebenarnya sedang
 * mengetik jawabannya.
 *
 * Percobaan sebelumnya — keluar dari layar penuh sesaat sebelum papan ketik
 * naik — TIDAK CUKUP, dan penguji iPad membuktikannya: panel itu tidak hanya
 * dipicu kolom isian, melainkan oleh tombol APA PUN yang ditekan selama halaman
 * masih di layar penuh, sehingga selalu ada celah yang tersisa. Satu-satunya
 * penutup yang tidak menyisakan celah adalah tidak pernah masuk layar penuh
 * sungguhan di sana.
 *
 * GANTINYA SUDAH ADA DAN SUDAH TERUJI: layar penuh semu (`.ruang-semu`) yang
 * dipakai iPhone sejak awal — halaman dikunci setinggi viewport yang terlihat,
 * seluruh penjagaan (pindah tab, hilang fokus, ALT+TAB, denyut nadi) berjalan
 * penuh, dan peserta yang ingin bilah Safari benar-benar hilang memasang ikon
 * Layar Utama seperti yang sudah diinstruksikan di gerbang.
 *
 * HARGA YANG DISADARI: di iPad, bilah alamat Safari kini tetap terlihat kecuali
 * ujian dibuka dari ikon Layar Utama. Itu memang mahal — tetapi pilihannya
 * bukan antara "layar penuh" dan "bilah alamat", melainkan antara "peserta bisa
 * mengetik" dan "peserta digugurkan saat mengetik". Apple yang menetapkan
 * pilihan itu, bukan aplikasi ini.
 */
export function pakaiLayarPenuhAsli(): boolean {
  return adaApiLayarPenuh() && !melarangKetikDiLayarPenuh();
}

/**
 * true bila SEKARANG JUGA ada kolom teks yang dipegang papan ketik.
 *
 * Dibaca dari dokumen, bukan dari penanda yang dititipkan peristiwa `focusout`,
 * dan itu bukan pilihan gaya melainkan tambalan atas kutu yang sudah menggigit
 * (9 September 2026, putaran kedua). Ketika peserta menekan "Selanjutnya",
 * React MEMBUANG kolom isian soal sebelumnya dari dokumen — dan WebKit tidak
 * menjamin memancarkan `focusout` untuk elemen yang dibuang selagi dipegang
 * papan ketik. Penanda yang menunggu peristiwa itu karena itu tersangkut pada
 * "masih mengetik" SELAMANYA, dan pemulihan layar penuh — yang menolak berjalan
 * selama papan ketik naik — tidak pernah jadi berjalan sekali pun. Peserta
 * tertinggal di luar layar penuh tanpa gerbang (benar) sampai ruang ujian
 * dipasang ulang pada subtes berikutnya, dan di sanalah gerbang perdana
 * "Masuk Layar Penuh & Mulai" muncul (salah).
 *
 * `document.activeElement` tidak bisa tersangkut: kolom yang dibuang membuatnya
 * kembali ke <body> dengan sendirinya.
 */
export function kolomTeksAktif(): boolean {
  if (typeof document === "undefined") return false;
  return diKolomTeks(document.activeElement);
}

/**
 * Dua tombol yang melepas mode layar penuh dengan sendirinya.
 *
 * DIPAKAI UNTUK SATU KEPERLUAN SAJA, dan batas itu penting: memastikan
 * pemaafan papan ketik layar (lihat {@link MASA_PAPAN_KETIK}) tidak ikut
 * memaafkan peserta yang menekan ESC selagi kursornya kebetulan berada di
 * kolom isian singkat. Ia TIDAK menghasilkan pelanggaran dan TIDAK menaikkan
 * jenis pelanggaran apa pun — akibat lepasnya layar penuh tetap ditentukan
 * PERANGKATNYA, seperti sebelumnya. Penjaga lama yang dulu memakai ESC sebagai
 * bukti pendukung sudah dihapus 8 September 2026 karena diam-diam menggugurkan
 * pengguna tablet berpapan ketik; jangan dihidupkan lagi lewat pintu ini.
 */
export function pelepasLayarPenuhDitekan(e: KeyboardEvent): boolean {
  return e.key === "Escape" || e.key === "Esc" || e.key === "F11";
}

/**
 * Pintasan MENANGKAP LAYAR, atau null bila bukan.
 *
 * BATASNYA, dan ini harus dipahami sebelum menjanjikan apa pun kepada
 * pengelola: yang bisa dikenali hanyalah TOMBOL yang sampai ke halaman.
 *
 *   PrintScreen           Windows/Linux. Di Chrome dan Edge tombol ini hanya
 *                         memancarkan `keyup` (keydown-nya ditelan sistem),
 *                         jadi keduanya sama-sama diperiksa.
 *   Win+Shift+S           alat Potongan Windows.
 *   Cmd+Shift+3/4/5       potret layar macOS. Sebagian versi macOS menelannya
 *                         sebelum peramban melihat, jadi ini TIDAK dijamin.
 *   Ctrl+Shift+S          alat potret bawaan Firefox.
 *
 * YANG TIDAK BISA DIKENALI SAMA SEKALI: potret layar dari TOMBOL FISIK ponsel —
 * Power+VolumeDown di Android, Power+VolumeUp di iPhone. Sistem operasi
 * mengerjakannya sendiri tanpa memberi tahu halaman yang sedang terbuka, dan
 * tidak ada API di peramban mana pun yang membocorkannya. Menambahkan
 * "pendeteksi" untuk itu berarti menebak, dan tebakan di sini berarti
 * menggugurkan peserta yang tidak berbuat apa-apa.
 */
export function pintasanTangkapLayar(e: KeyboardEvent): string | null {
  const k = e.key.toLowerCase();
  if (e.key === "PrintScreen" || k === "printscreen") return "PrintScreen";
  if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) {
    return `Cmd+Shift+${e.key}`;
  }
  if (e.metaKey && e.shiftKey && k === "s") return "Win+Shift+S";
  if (e.ctrlKey && e.shiftKey && k === "s") return "Ctrl+Shift+S";
  return null;
}

/** Jalan pintas papan ketik yang bisa dicegat halaman dan patut dicurigai. */
export function pintasanTerlarang(e: KeyboardEvent): string | null {
  // Pintasan potret layar punya akibatnya sendiri (menggugurkan), jadi jangan
  // ikut dicatat sebagai "pintasan" biasa — satu perbuatan, satu baris.
  if (pintasanTangkapLayar(e)) return null;
  const k = e.key.toLowerCase();
  if (e.key === "F12") return "F12";
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === "i" || k === "j" || k === "c")) {
    return `Ctrl+Shift+${k.toUpperCase()}`;
  }
  if ((e.ctrlKey || e.metaKey) && ["c", "x", "p", "s", "u", "a"].includes(k)) {
    return `Ctrl+${k.toUpperCase()}`;
  }
  return null;
}

/**
 * Penanda acak satu kejadian. Satu kepergian dilaporkan dua kali — lewat
 * `sendBeacon` dan lewat `fetch` — dan penanda inilah yang membuat server
 * menyatukan keduanya menjadi satu baris pelanggaran.
 */
export function penandaKejadian(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Laporan yang harus sampai walaupun halaman sedang dibekukan peramban.
 *
 * Inilah inti perbaikan untuk iPhone. WebKit membekukan JavaScript beberapa
 * milidetik sesudah halaman disembunyikan, dan `fetch` — termasuk yang memakai
 * `keepalive`, yang baru dihormati Safari 18 — ikut mati bersamanya. Akibatnya
 * kepergian peserta tidak pernah tercatat di server: layar GAGAL cuma muncul di
 * peramban, sedangkan `attempts.status` tetap `ongoing`, sehingga peserta
 * tinggal menarik halaman untuk memuat ulang dan ujiannya kembali utuh. Di
 * iPhone tombol muat ulang itu selalu ada, karena tidak ada layar penuh yang
 * menyembunyikan bilah alamat Safari.
 *
 * `navigator.sendBeacon` dibuat justru untuk keadaan ini: permintaannya
 * diserahkan ke sistem, bukan ke halaman, jadi ia tetap berjalan sesudah
 * halamannya beku. Didukung Safari iOS sejak 11.1.
 */
export function laporTahanBeku(alamat: string, muatan: Record<string, unknown>): boolean {
  try {
    if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") {
      return false;
    }
    return navigator.sendBeacon(
      alamat,
      new Blob([JSON.stringify(muatan)], { type: "application/json" }),
    );
  } catch {
    return false;
  }
}

/** Tekan-tahan dianggap sengaja setelah selama ini (ms). */
export const TEKAN_TAHAN = 450;

/**
 * Penanda bahwa peserta SUDAH melewati gerbang layar penuh pada attempt ini.
 *
 * Disimpan per attempt di `sessionStorage`, dan hanya dipakai pada perangkat
 * yang TIDAK punya Fullscreen API (iPhone). Di perangkat lain penandanya adalah
 * kenyataan itu sendiri: dokumennya masih berada dalam mode layar penuh.
 *
 * Gunanya menutup lubang yang membuat peserta nyaris digugurkan tanpa salah:
 * setiap ganti subtes komponen ruang ujian dipasang ulang, gerbangnya muncul
 * lagi, dan peserta harus menekan "Masuk Layar Penuh" berkali-kali — tepat
 * pada detik transisi yang paling banyak menghasilkan laporan palsu.
 */
export const KUNCI_GERBANG = "adzkia-gerbang";

export function tandaiGerbang(kunci: number | string, lewat: boolean): void {
  try {
    if (lewat) sessionStorage.setItem(`${KUNCI_GERBANG}-${kunci}`, "1");
    else sessionStorage.removeItem(`${KUNCI_GERBANG}-${kunci}`);
  } catch {
    // Mode penyamaran menolak sessionStorage. Akibatnya cuma gerbangnya muncul
    // lagi seperti dulu — tidak ada yang rusak.
  }
}

export function bacaGerbang(kunci: number | string): boolean {
  try {
    return sessionStorage.getItem(`${KUNCI_GERBANG}-${kunci}`) === "1";
  } catch {
    return false;
  }
}

/**
 * Penanda bahwa mode layar penuh sedang lepas KARENA PAPAN KETIK LAYAR.
 *
 * Harus bertahan melewati pemasangan ulang komponen, dan inilah sebabnya ia
 * disimpan di `sessionStorage` alih-alih di sebuah ref. Ganti subtes memasang
 * ulang ruang ujian; kalau saat itu peserta masih di luar layar penuh gara-gara
 * papan ketiknya, ruang ujian yang baru lahir tanpa ingatan apa pun akan
 * menyimpulkan peserta belum pernah masuk layar penuh dan menampilkan gerbang
 * PERDANA — "Masuk Layar Penuh & Mulai" — di tengah ujian. Itu persis yang
 * dilaporkan pengelola dari iPad pada uji coba 9 September 2026.
 *
 * Penanda ini dibuang begitu layar penuh terpasang kembali, jadi ia tidak
 * pernah menutupi lepasnya layar penuh yang sesungguhnya.
 */
export const KUNCI_PAPAN_KETIK = "adzkia-papan-ketik";

export function tandaiPapanKetik(kunci: number | string, sedang: boolean): void {
  try {
    if (sedang) sessionStorage.setItem(`${KUNCI_PAPAN_KETIK}-${kunci}`, "1");
    else sessionStorage.removeItem(`${KUNCI_PAPAN_KETIK}-${kunci}`);
  } catch {
    /* mode penyamaran: penandanya hilang, gerbangnya kembali seperti dulu */
  }
}

export function bacaPapanKetik(kunci: number | string): boolean {
  try {
    return sessionStorage.getItem(`${KUNCI_PAPAN_KETIK}-${kunci}`) === "1";
  } catch {
    return false;
  }
}


/* ------------------------------------------------------------------ */
/* Kolom isian jangan tertimbun papan ketik layar                      */
/* ------------------------------------------------------------------ */

/** Papan ketik iOS butuh sekitar sepertiga detik untuk selesai naik. */
export const JEDA_PAPAN_KETIK_NAIK = 350; // ms

/**
 * Menjaga kolom isian yang sedang diketik tetap terlihat di atas papan ketik.
 *
 * Di layar penuh semu, ruang ujian dikunci `position: fixed` setinggi viewport.
 * Papan ketik iOS TIDAK mengecilkan viewport itu — ia MENUTUPINYA — dan
 * penggulungan otomatis bawaan peramban tidak bekerja pada elemen yang dikunci
 * begitu. Akibatnya kolom jawaban bisa berada persis di balik papan ketik:
 * peserta mengetik tanpa bisa melihat apa yang diketiknya.
 *
 * `visualViewport` satu-satunya yang tahu berapa tinggi layar yang benar-benar
 * tersisa, jadi penggulungannya diulang setiap kali ukurannya berubah — yaitu
 * tepat ketika papan ketik naik atau turun.
 *
 * DIPAKAI DUA RUANG UJIAN — `RuangUjian` (UTBK/SKD) dan `usePenjagaIelts`.
 * Disatukan di sini 11 September 2026 karena sebelumnya hanya jalur UTBK yang
 * punya, padahal justru IELTS yang paling banyak kolom isian singkatnya:
 * Listening dan Reading masing-masing sampai 40 butir yang harus diketik.
 *
 * Mengembalikan pelepas langganan; aman dipanggil di lingkungan tanpa
 * `visualViewport` (peramban lama, dan pemeriksaan di Node).
 */
export function pasangKolomKeTengah(): () => void {
  if (typeof document === "undefined") return tanpaLangganan();

  let jam: number | null = null;

  const bawaKeTengah = () => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || !diKolomTeks(el)) return;
    if (jam !== null) window.clearTimeout(jam);
    jam = window.setTimeout(() => {
      jam = null;
      try {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      } catch {
        el.scrollIntoView();
      }
    }, JEDA_PAPAN_KETIK_NAIK);
  };

  const onFokusKolom = (e: FocusEvent) => {
    if (diKolomTeks(e.target)) bawaKeTengah();
  };

  document.addEventListener("focusin", onFokusKolom, true);
  const vv = window.visualViewport;
  vv?.addEventListener("resize", bawaKeTengah);

  return () => {
    if (jam !== null) window.clearTimeout(jam);
    document.removeEventListener("focusin", onFokusKolom, true);
    vv?.removeEventListener("resize", bawaKeTengah);
  };
}
