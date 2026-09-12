"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  BATAS_DENYUT_MS,
  JEDA_COBA_DENYUT,
  JEDA_DENYUT,
  MASA_ALT_TAB,
  MASA_PASTIKAN_FOKUS,
  MASA_SETELAH_LAYAR_PENUH,
} from "@/lib/penjagaan/denyut";
import { menggugurkan, menggugurkanKeluar, pesanGugurJenis } from "@/lib/penjagaan/pelanggaran-jenis";
import {
  GESER_TOLERANSI,
  JEDA_LAPOR_CURANG,
  MASA_PAPAN_KETIK,
  MASA_SIAGA,
  MASA_TOMBOL_LEPAS,
  TEKAN_TAHAN,
  adaApiLayarPenuh,
  bacaGerbang,
  bacaPapanKetik,
  berdiriSendiri,
  commandPindahJendela,
  diKolomIsian,
  diKolomTeks,
  elemenLayarPenuh,
  keluarLayarPenuh,
  kolomTeksAktif,
  laporTahanBeku,
  melarangKetikDiLayarPenuh,
  pakaiLayarPenuhAsli,
  pasangKolomKeTengah,
  pelepasLayarPenuhDitekan,
  penandaKejadian,
  perambanKomputer,
  pintasanTangkapLayar,
  pintasanTerlarang,
  tandaiGerbang,
  tandaiPapanKetik,
  tanpaLangganan,
  type ElemenLayarPenuh,
} from "@/lib/penjagaan/penjagaan-peramban";

const ALAMAT_VIOLATION = "/api/language/ielts/violation";
const ALAMAT_DENYUT = "/api/language/ielts/denyut";

/**
 * PENJAGAAN UJIAN IELTS — sisi peramban.
 *
 * Aturannya SAMA PERSIS dengan ruang ujian TryOut UTBK-SNBT hasil revisi
 * 7-9 September 2026, dan kesamaan itu wajib: ambangnya dibaca dari
 * `@/lib/denyut` yang sama, jenis pelanggarannya dari `@/lib/pelanggaran-jenis`
 * yang sama, penolong perambannya dari `@/lib/penjagaan-peramban` yang sama,
 * dan putusannya diambil server lewat rute yang bentuknya kembar. Yang berbeda
 * hanya alamat rutenya dan tabel tempat catatannya mendarat.
 *
 * DIPISAH SEBAGAI KAIT, bukan disalin ke dalam `RuangIelts`, karena tata letak
 * kedua ruang ujian memang berbeda — UTBK satu soal per layar, IELTS satu
 * bagian yang digulir — sedangkan penjagaannya tidak boleh berbeda sedikit pun.
 *
 * SATU HAL YANG BELUM SELESAI, dan sengaja dicatat di sini supaya tidak
 * terlupa: `components/exam/RuangUjian.tsx` masih memuat salinan logika yang
 * sama di badannya sendiri. Ia sengaja TIDAK ikut dipindahkan ke kait ini pada
 * 10 September 2026 karena tryout sungguhan berjalan pekan itu juga, dan
 * membongkar 2.500 baris penjagaan yang sudah teruji beberapa jam sebelum
 * hari-H adalah taruhan yang tidak sepadan. Pemindahannya menyusul sesudah
 * tryout, dan sampai itu terjadi: SETIAP perbaikan penjagaan harus dipasang di
 * KEDUA tempat.
 *
 * Tiga hal yang harus diketahui sebelum menyunting berkas ini:
 *
 *  1. Seluruh KEPUTUSAN diambil di server. Yang dikerjakan di sini hanya
 *     mengenali kejadian dan melaporkannya; peserta tidak bisa membatalkan
 *     akibatnya dengan menutup dialog, memuat ulang, atau membersihkan storage.
 *  2. Setiap pemaafan di bawah lahir dari salah tangkap yang PERNAH TERJADI
 *     pada peserta sungguhan. Menghapus salah satunya berarti menghidupkan
 *     kembali pengguguran yang sudah terbukti keliru.
 *  3. Kolom teks jauh lebih banyak di IELTS daripada di UTBK — Writing seluruh
 *     jawabannya karangan panjang. Karena itu pemaafan papan ketik layar bukan
 *     kasus pinggiran di sini, melainkan keadaan sehari-hari.
 */

export interface BahanPenjagaIelts {
  pengerjaanId: number;
  /** Subtes yang sedang dikerjakan; ikut ditulis pada tiap baris pelanggaran. */
  subtes: string;
  /**
   * true bila bagian yang sedang tampil memuat kolom jawaban yang menuntut
   * papan ketik (isian singkat atau esai). Padanan `soalIsianTampil` di ruang
   * ujian UTBK — bedanya di sana satu soal per layar, di sini satu bagian.
   */
  adaKolomTeks: boolean;
  /** Menyimpan jawaban yang masih mengantre, dipanggil sebelum tiap laporan. */
  simpanSegera: () => void | Promise<void>;
  /**
   * true selama rekaman Listening BENAR-BENAR berputar.
   *
   * Ketetapan pengelola 11 September 2026: *"di rekaman listening, jangan
   * dibuat gagal 20 detik ya, karna itu bagian dari yang diujiankan."* Selama
   * mendengarkan, peserta memang tidak menyentuh apa pun — layar ponselnya
   * meredup lalu terkunci, halaman disembunyikan, dan denyutnya berhenti.
   *
   * Yang dikerjakan bendera ini hanya MENGABARI server; putusannya tetap di
   * sana, dan server memeriksa sendiri bahwa subtesnya memang LISTENING sebab
   * bendera dari peramban bisa dipalsukan. Lihat `pergi_saat_rekaman` di
   * `@/lib/pelanggaran-jenis`.
   */
  rekamanBerputar?: boolean;
  /**
   * PRATINJAU pengelola — bukan ujian sungguhan.
   *
   * Gerbang layar penuh, blokir salin, dan pemberitahuannya tetap NYATA supaya
   * pengelola merasakan apa yang akan dialami siswa; yang dimatikan hanya
   * AKIBATNYA. Tidak ada satu pun baris pelanggaran yang tercatat, tidak ada
   * denyut yang dikirim, dan tidak ada yang bisa digugurkan — sebab tidak ada
   * pengerjaan yang menjadi sasarannya (`pengerjaanId` bernilai 0).
   *
   * Bendera ini WAJIB dihormati oleh setiap jalur yang menyentuh jaringan.
   * Satu saja yang terlewat akan menulis pelanggaran atas nama pengerjaan yang
   * tidak ada, dan pada hari-H mengotori panel keamanan dengan hantu.
   */
  pratinjau?: boolean;
}

export interface PenjagaIelts {
  /** Kalimat layar GAGAL, atau null bila ujian masih berjalan. */
  gugur: string | null;
  /** true = gerbang "masuk layar penuh" masih menutupi soal. */
  gerbangTampil: boolean;
  galatLayarPenuh: string | null;
  /** Peramban ini tidak memakai layar penuh sungguhan (iPhone, seluruh WebKit). */
  tanpaApiLayarPenuh: boolean;
  /** Sudah dipasang ke Layar Utama — di iPhone inilah layar penuh yang sungguhan. */
  terpasangDiLayarUtama: boolean;
  pesanCurang: string | null;
  /** Pemberitahuan sisa anggaran kepergian. */
  pesanPergi: string | null;
  sambunganPutus: boolean;
  masukLayarPenuh: () => void;
  /** iPhone: lanjut dari Safari biasa. Tidak dilarang, tetapi dicatat. */
  mulaiLewatSafari: () => void;
  /**
   * Mematikan penjagaan DENGAN SENGAJA — dipanggil tepat sebelum menutup
   * subtes atau meninggalkan ruang ujian lewat tombol. Tanpa ini, perpindahan
   * halaman yang wajar terbaca sebagai kepergian.
   */
  matikanPenjagaan: () => void;
}

export function usePenjagaIelts({
  pengerjaanId,
  subtes,
  adaKolomTeks,
  simpanSegera,
  rekamanBerputar = false,
  pratinjau = false,
}: BahanPenjagaIelts): PenjagaIelts {
  /** Kunci sessionStorage; berbeda dari milik UTBK supaya tidak saling menimpa. */
  const kunciSesi = `ielts-${pengerjaanId}`;

  const [gugur, setGugur] = useState<string | null>(null);
  const [layarPenuh, setLayarPenuh] = useState(false);
  const [galatLayarPenuh, setGalatLayarPenuh] = useState<string | null>(null);
  const [pesanCurang, setPesanCurang] = useState<string | null>(null);
  const [pesanPergi, setPesanPergi] = useState<string | null>(null);
  const [sambunganPutus, setSambunganPutus] = useState(false);

  // Kemampuan peramban dibaca lewat useSyncExternalStore supaya server selalu
  // merender "peramban normal" dan klien memperbaikinya tepat sesudah hidrasi —
  // tanpa perbedaan markah, dan tanpa satu putaran render tambahan.
  const tanpaApiLayarPenuh = useSyncExternalStore(
    tanpaLangganan,
    () => !pakaiLayarPenuhAsli(),
    () => false,
  );
  const terpasangDiLayarUtama = useSyncExternalStore(tanpaLangganan, berdiriSendiri, () => false);

  /**
   * Kolom isian singkat jangan tertimbun papan ketik layar.
   *
   * Perilaku yang SAMA PERSIS dengan ruang ujian UTBK — satu fungsi yang sama,
   * bukan salinan; alasan teknisnya di `pasangKolomKeTengah()`. Di IELTS ini
   * justru lebih menentukan daripada di UTBK: Listening dan Reading
   * masing-masing memuat sampai 40 isian singkat yang harus diketik, sedangkan
   * satu paket UTBK hanya berisi segelintir.
   */
  useEffect(() => {
    if (!tanpaApiLayarPenuh) return;
    return pasangKolomKeTengah();
  }, [tanpaApiLayarPenuh]);

  const simpanRef = useRef(simpanSegera);
  useEffect(() => {
    simpanRef.current = simpanSegera;
  }, [simpanSegera]);

  /* ---------------- rekaman Listening sedang berputar ---------------- */

  /** Rekamannya berputar DETIK INI. */
  const rekamanRef = useRef(rekamanBerputar);
  /**
   * Rekamannya berputar pada suatu saat SEJAK LAPORAN TERAKHIR yang sampai.
   *
   * Bendera kedua ini yang menyelamatkan keadaan paling penting dan paling
   * mudah terlewat: layar ponsel terkunci di tengah rekaman, audio terus
   * berjalan sampai habis, dan peserta baru menyalakan layarnya satu menit
   * kemudian. Pada detik laporannya akhirnya sampai, rekamannya SUDAH selesai —
   * `rekamanRef` sudah false — padahal jedanya bermula tepat saat rekaman
   * berputar. Tanpa bendera lengket ini, peserta itu tetap gugur.
   *
   * Ia hanya dibersihkan oleh denyut yang BERHASIL sampai ke server selagi
   * rekamannya tidak berputar; lihat akhir fungsi `denyut()`.
   */
  const rekamanTertunda = useRef(rekamanBerputar);

  useEffect(() => {
    rekamanRef.current = rekamanBerputar;
    if (rekamanBerputar) rekamanTertunda.current = true;
  }, [rekamanBerputar]);

  /** Nilai yang dikirim ke server pada tiap laporan. */
  const rekamanKini = useCallback(
    () => rekamanRef.current || rekamanTertunda.current,
    [],
  );

  const subtesRef = useRef(subtes);
  useEffect(() => {
    subtesRef.current = subtes;
  }, [subtes]);

  /* ---------------- keadaan penjagaan ---------------- */

  const pelanggaranTerbuka = useRef<{ id: number; jenis: string } | null>(null);
  const gugurRef = useRef(false);
  const dipantau = useRef(false);
  const siagaSampai = useRef(0);
  const layarPenuhSejak = useRef(0);
  const isianTerakhir = useRef(0);
  const kolomTeksTampil = useRef(false);
  const escSejak = useRef(0);
  const papanKetikMenelan = useRef(false);
  const pemulihanBerjalan = useRef(false);
  const lepasSengaja = useRef(false);
  const altSejak = useRef(0);
  const altTabDilaporkan = useRef(false);
  const tangkapDilaporkan = useRef(false);
  /** true = halaman ini ditinggalkan atas kemauan peserta lewat tombol yang sah. */
  const pergiSengaja = useRef(false);

  useEffect(() => {
    kolomTeksTampil.current = adaKolomTeks;
  }, [adaKolomTeks]);

  const beriSiaga = useCallback(() => {
    siagaSampai.current = Date.now() + MASA_SIAGA;
  }, []);

  // Gerbang tunggal seluruh pelaporan kepergian. Menutupnya di sini —
  // bukan di tiap pemanggil — yang membuat mode pratinjau tidak bisa bocor:
  // sembilan tempat memanggil `bolehLapor()` sebelum menyentuh jaringan.
  const bolehLapor = useCallback(
    () =>
      !pratinjau && dipantau.current && !gugurRef.current && Date.now() >= siagaSampai.current,
    [pratinjau],
  );

  const nyatakanGugur = useCallback(
    (pesan?: string | null) => {
      if (gugurRef.current) return;
      gugurRef.current = true;
      tandaiGerbang(kunciSesi, false);
      tandaiPapanKetik(kunciSesi, false);
      keluarLayarPenuh();
      setGugur(
        pesan && pesan.trim() !== "" ? pesan : pesanGugurJenis("ielts", "tak_dikenal"),
      );
    },
    [kunciSesi],
  );

  /* ---------------- melaporkan kepergian ---------------- */

  const bukaPelanggaran = useCallback(
    async (
      jenis:
        | "keluar_tab"
        | "blur_window"
        | "keluar_layar_penuh"
        | "esc_layar_penuh"
        | "alt_tab"
        | "tangkap_layar",
    ) => {
      if (gugurRef.current) return;
      // Satu kejadian, satu catatan — KECUALI bila yang datang menggugurkan
      // sementara yang sedang terbuka hanya sebuah catatan.
      const terbuka = pelanggaranTerbuka.current;
      if (terbuka && !(menggugurkan(jenis) && !menggugurkan(terbuka.jenis))) return;
      pelanggaranTerbuka.current = { id: 0, jenis }; // kunci sementara

      // Keadaan layar penuh dibaca SEKARANG, pada detik kejadiannya.
      const adaLayarPenuh = adaApiLayarPenuh();
      const dalamLayarPenuh = elemenLayarPenuh() !== null;
      const muatan = {
        pengerjaanId,
        aksi: "keluar",
        subtes: subtesRef.current,
        jenis,
        kejadian: penandaKejadian(),
        adaLayarPenuh,
        dalamLayarPenuh,
        // Server yang memutuskan apa artinya — dan ia memeriksa sendiri bahwa
        // subtesnya memang LISTENING sebelum memaafkan apa pun.
        rekaman: rekamanKini(),
      };

      // Beacon lebih dulu — inilah pengiriman yang selamat kalau peramban
      // membekukan halaman sedetik kemudian. `fetch` di bawahnya tetap
      // dijalankan karena hanya dialah yang membawa PUTUSAN server ke layar.
      laporTahanBeku(ALAMAT_VIOLATION, muatan);

      try {
        const res = await fetch(ALAMAT_VIOLATION, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(muatan),
          keepalive: true,
        });
        const data = (await res.json()) as {
          ok: boolean;
          pelanggaranId?: number;
          digugurkan?: boolean;
          peringatanLayarPenuh?: boolean;
          pesan?: string;
        };

        if (data.ok && data.pelanggaranId) {
          pelanggaranTerbuka.current = { id: data.pelanggaranId, jenis };
        } else {
          pelanggaranTerbuka.current = null;
        }

        if (data.digugurkan) {
          nyatakanGugur(data.pesan);
          return;
        }

        // Kunci sementara HARUS dilepas untuk kejadian yang tidak punya
        // "kembali": lepasnya layar penuh di ponsel tidak menyembunyikan
        // halaman, jadi tidak akan pernah ada peristiwa yang membukanya. Tanpa
        // pelepasan ini kuncinya menggantung dan MENELAN pelanggaran berikutnya.
        if (data.peringatanLayarPenuh) pelanggaranTerbuka.current = null;
      } catch {
        // `fetch` mati karena halaman beku atau jaringan putus. Catatannya tetap
        // sampai lewat beacon, dan SERVER yang memutuskan akibatnya.
        pelanggaranTerbuka.current = null;
        if (menggugurkanKeluar(jenis, { adaLayarPenuh, dalamLayarPenuh })) {
          nyatakanGugur(pesanGugurJenis("ielts", jenis));
        }
      }
    },
    [nyatakanGugur, pengerjaanId],
  );

  const tutupPelanggaran = useCallback(async () => {
    const v = pelanggaranTerbuka.current;
    pelanggaranTerbuka.current = null;
    if (!v || !v.id) return;
    try {
      const res = await fetch(ALAMAT_VIOLATION, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pengerjaanId,
          aksi: "kembali",
          pelanggaranId: v.id,
          rekaman: rekamanKini(),
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        digugurkan?: boolean;
        pesan?: string;
        durasiDetik?: number | null;
        totalDetik?: number;
        budgetDetik?: number;
      };
      if (data.digugurkan) {
        nyatakanGugur(data.pesan);
        return;
      }

      // SISA ANGGARAN DIBERITAHUKAN setiap kali peserta kembali. Kepergian
      // singkat kini MENUMPUK sampai menggugurkan, dan peserta yang tidak
      // pernah melihat angkanya bergerak akan gugur oleh hitungan yang tidak
      // pernah ia sadari sedang berjalan.
      if (typeof data.totalDetik === "number" && typeof data.budgetDetik === "number") {
        const sisa = Math.max(0, data.budgetDetik - data.totalDetik);
        const barusan = typeof data.durasiDetik === "number" ? data.durasiDetik : null;
        setPesanPergi(
          (barusan !== null ? `You left the exam page for ${barusan} seconds. ` : "") +
            `Total so far: ${data.totalDetik} of ${data.budgetDetik} seconds` +
            (sisa > 0
              ? `; ${sisa} seconds left before the exam is stopped.`
              : `. You have used it all up.`),
        );
      }
    } catch {
      /* jaringan putus: catatan keluar tetap tersimpan di server */
    }
  }, [nyatakanGugur, pengerjaanId]);

  /* ---------------- layar penuh ---------------- */

  const masukLayarPenuh = useCallback(async () => {
    setGalatLayarPenuh(null);
    beriSiaga();

    // Peramban tanpa layar penuh sungguhan (iPhone, seluruh WebKit): ruang
    // ujian dikunci setinggi viewport lewat kelas `.ruang-semu` dan penjagaan
    // langsung dinyalakan. Peserta tidak boleh tertahan di gerbang hanya karena
    // perangkatnya tidak punya fitur yang memang tidak pernah ada di sana.
    if (!pakaiLayarPenuhAsli()) {
      setLayarPenuh(true);
      dipantau.current = true;
      layarPenuhSejak.current = Date.now();
      beriSiaga();
      tandaiGerbang(kunciSesi, true);
      // Menggulung sedikit membuat Safari menyusutkan bilah alamatnya.
      window.setTimeout(() => window.scrollTo(0, 1), 50);
      return;
    }

    try {
      const el = document.documentElement as ElemenLayarPenuh;
      await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
      dipantau.current = true;
      beriSiaga();
      tandaiGerbang(kunciSesi, true);
    } catch {
      setGalatLayarPenuh(
        "Your browser refused to open full screen. Please press the button once more.",
      );
    }
  }, [beriSiaga, kunciSesi]);

  /**
   * true bila bagian yang sedang tampil menuntut papan ketik DAN perangkat ini
   * memang tidak boleh berada di layar penuh saat peserta mengetik — perangkat
   * sentuh (papan ketik layarnya menjatuhkan layar penuh sendiri di iPadOS),
   * atau WebKit apa pun (panel sistem "Typing is not allowed in full screen"
   * membekukan halaman dan berujung pengguguran palsu).
   */
  const hindariLayarPenuh = useCallback(
    () => kolomTeksTampil.current && (!perambanKomputer() || melarangKetikDiLayarPenuh()),
    [],
  );

  const sedangMengetik = useCallback(
    () =>
      kolomTeksAktif() ||
      (isianTerakhir.current > 0 && Date.now() - isianTerakhir.current < MASA_PAPAN_KETIK) ||
      hindariLayarPenuh(),
    [hindariLayarPenuh],
  );

  const belumSaatnyaPulih = useCallback(
    () => kolomTeksAktif() || hindariLayarPenuh(),
    [hindariLayarPenuh],
  );

  /**
   * Keluar dari layar penuh LEBIH DULU, supaya peserta bisa mengetik tanpa
   * disambut panel sistem WebKit yang membekukan halaman. Penandanya dipasang
   * SEBELUM lepasan diminta, supaya penjaga `fullscreenchange` mengenalinya
   * sebagai perbuatan aplikasi dan tidak mencatat apa pun.
   */
  const lepasUntukMengetik = useCallback(() => {
    if (!pakaiLayarPenuhAsli()) return;
    if (elemenLayarPenuh() === null) return;
    if (!hindariLayarPenuh()) return;
    lepasSengaja.current = true;
    papanKetikMenelan.current = true;
    tandaiPapanKetik(kunciSesi, true);
    beriSiaga();
    keluarLayarPenuh();
  }, [beriSiaga, hindariLayarPenuh, kunciSesi]);

  /** Memasang kembali layar penuh yang tadi ditelan papan ketik layar — diam-diam. */
  const pulihkanLayarPenuh = useCallback(
    (paksa = false) => {
      if (!papanKetikMenelan.current && !paksa) return;
      if (!pakaiLayarPenuhAsli()) return;
      if (elemenLayarPenuh() !== null) return;
      if (!paksa && belumSaatnyaPulih()) return;
      if (pemulihanBerjalan.current) return;
      pemulihanBerjalan.current = true;
      beriSiaga();
      try {
        const el = document.documentElement as ElemenLayarPenuh;
        void Promise.resolve(el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.())
          .catch(() => {})
          .finally(() => {
            pemulihanBerjalan.current = false;
          });
      } catch {
        pemulihanBerjalan.current = false;
      }
    },
    [belumSaatnyaPulih, beriSiaga],
  );

  // Bagian yang tampil berganti: lepaskan layar penuh bila ia memuat kolom
  // teks, pasang kembali bila tidak.
  useEffect(() => {
    if (adaKolomTeks) lepasUntukMengetik();
    else pulihkanLayarPenuh();
  }, [adaKolomTeks, lepasUntukMengetik, pulihkanLayarPenuh]);

  /**
   * Melanjutkan TANPA gerbang lagi: halaman yang dimuat ulang selagi dokumennya
   * masih di layar penuh — atau perangkat yang gerbangnya sudah dilewati —
   * tidak boleh menagih persetujuan layar penuh untuk kedua kalinya.
   */
  const lanjutTanpaGerbang = useSyncExternalStore(
    tanpaLangganan,
    () =>
      elemenLayarPenuh() !== null ||
      (!pakaiLayarPenuhAsli() && bacaGerbang(kunciSesi)) ||
      (bacaGerbang(kunciSesi) && bacaPapanKetik(kunciSesi)),
    () => false,
  );

  useEffect(() => {
    if (!lanjutTanpaGerbang) return;
    dipantau.current = true;
    layarPenuhSejak.current = Date.now();
    beriSiaga();
    if (elemenLayarPenuh() === null && bacaPapanKetik(kunciSesi)) {
      papanKetikMenelan.current = true;
    }
  }, [beriSiaga, kunciSesi, lanjutTanpaGerbang]);

  const gerbangTampil = !layarPenuh && !lanjutTanpaGerbang;

  /* ---------------- fullscreenchange & papan ketik ---------------- */

  useEffect(() => {
    const escBaruSaja = () =>
      escSejak.current > 0 && Date.now() - escSejak.current < MASA_TOMBOL_LEPAS;

    const onUbah = () => {
      const aktif = elemenLayarPenuh() !== null;

      if (aktif) {
        papanKetikMenelan.current = false;
        pemulihanBerjalan.current = false;
        lepasSengaja.current = false;
        tandaiPapanKetik(kunciSesi, false);
        // Layar penuh menyala SELAGI bagian berkolom teks terpampang: di
        // peramban yang melarang mengetik di layar penuh, membiarkannya berarti
        // menunggu panel sistem muncul pada ketukan pertama.
        if (hindariLayarPenuh()) window.setTimeout(() => lepasUntukMengetik(), 0);
      }

      // Lepasan yang DIMINTA HALAMAN INI SENDIRI supaya peserta bisa mengetik.
      if (!aktif && lepasSengaja.current) {
        lepasSengaja.current = false;
        papanKetikMenelan.current = true;
        tandaiPapanKetik(kunciSesi, true);
        beriSiaga();
        return;
      }

      // PAPAN KETIK LAYAR — lepasan yang bukan perbuatan siapa pun. Tiga syarat
      // digabung supaya pemaafan ini tidak bisa dipakai bersembunyi, dan
      // seluruh penjagaan lain (pindah tab, hilang fokus, ALT+TAB, denyut)
      // tetap berjalan penuh selama jendela ini.
      if (!aktif && sedangMengetik() && !escBaruSaja() && adaApiLayarPenuh()) {
        papanKetikMenelan.current = true;
        tandaiPapanKetik(kunciSesi, true);
        beriSiaga();
        return;
      }

      const bolehLaporkan = !aktif && bolehLapor();
      // Sebagian ponsel menolak menahan layar penuh pada detik-detik pertama:
      // notifikasi, putaran layar, atau isyarat navigasi melepasnya sendiri.
      const ulahPerangkat =
        layarPenuhSejak.current > 0 &&
        Date.now() - layarPenuhSejak.current < MASA_SETELAH_LAYAR_PENUH;

      if (aktif) layarPenuhSejak.current = Date.now();
      setLayarPenuh(aktif);
      beriSiaga();

      // SIAPA yang melepasnya menentukan akibatnya, dan itu disimpulkan dari
      // PERANGKATNYA: di peramban komputer layar penuh tidak punya cara lepas
      // selain tombol yang ditekan seseorang (menggugurkan); di ponsel dan
      // tablet ada tiga hal yang melepasnya tanpa disentuh siapa pun (dicatat).
      if (bolehLaporkan && !ulahPerangkat) {
        void simpanRef.current();
        void bukaPelanggaran(perambanKomputer() ? "esc_layar_penuh" : "keluar_layar_penuh");
      }
    };

    const onFokusMasuk = (e: FocusEvent) => {
      if (!diKolomTeks(e.target)) return;
      isianTerakhir.current = Date.now();
      beriSiaga();
    };

    const onFokusKeluar = (e: FocusEvent) => {
      if (!diKolomTeks(e.target)) return;
      isianTerakhir.current = Date.now();
      beriSiaga();
      pulihkanLayarPenuh();
    };

    // Ketukan PADA kolom teks, dicatat sebelum fokusnya berpindah: sebagian
    // peramban melepas layar penuh pada detik ketukan, sebelum `focusin`
    // kolomnya sempat terpancar.
    const onSentuhKolom = (e: Event) => {
      if (!diKolomTeks(e.target)) return;
      isianTerakhir.current = Date.now();
      beriSiaga();
      lepasUntukMengetik();
    };

    // Sentuhan pertama sesudah mengetik: kesempatan sah memasang layar penuh
    // kembali, karena permintaan yang lahir dari sentuhan tidak ditolak peramban.
    const pulihSaatDisentuh = (e: Event) => {
      if (!papanKetikMenelan.current) return;
      if (diKolomTeks(e.target) || diKolomTeks(document.activeElement)) return;
      pulihkanLayarPenuh();
    };

    document.addEventListener("fullscreenchange", onUbah);
    document.addEventListener("webkitfullscreenchange", onUbah);
    document.addEventListener("pointerdown", onSentuhKolom, true);
    document.addEventListener("touchstart", onSentuhKolom, true);
    document.addEventListener("focusin", onFokusMasuk, true);
    document.addEventListener("focusout", onFokusKeluar, true);
    document.addEventListener("pointerup", pulihSaatDisentuh, true);
    document.addEventListener("touchend", pulihSaatDisentuh, true);
    document.addEventListener("click", pulihSaatDisentuh, true);
    return () => {
      document.removeEventListener("fullscreenchange", onUbah);
      document.removeEventListener("webkitfullscreenchange", onUbah);
      document.removeEventListener("pointerdown", onSentuhKolom, true);
      document.removeEventListener("touchstart", onSentuhKolom, true);
      document.removeEventListener("focusin", onFokusMasuk, true);
      document.removeEventListener("focusout", onFokusKeluar, true);
      document.removeEventListener("pointerup", pulihSaatDisentuh, true);
      document.removeEventListener("touchend", pulihSaatDisentuh, true);
      document.removeEventListener("click", pulihSaatDisentuh, true);
    };
  }, [
    beriSiaga,
    bolehLapor,
    bukaPelanggaran,
    hindariLayarPenuh,
    kunciSesi,
    lepasUntukMengetik,
    pulihkanLayarPenuh,
    sedangMengetik,
  ]);

  /* ---------------- meninggalkan halaman ---------------- */

  useEffect(() => {
    // ALT+TAB: jejaknya, bukan tombolnya. Sistem operasi menelan kombinasinya
    // sebelum peramban melihat TAB-nya, jadi yang tertinggal cuma satu bentuk
    // yang khas — ALT ditekan, lalu fokus hilang tanpa ALT pernah dilepas.
    const altTabBaruSaja = () =>
      altSejak.current > 0 && Date.now() - altSejak.current < MASA_ALT_TAB;

    const laporAltTab = () => {
      if (!altTabBaruSaja()) return false;
      if (altTabDilaporkan.current) return true; // satu kepergian, satu laporan
      if (!bolehLapor()) return false;
      altTabDilaporkan.current = true;
      void simpanRef.current();
      void bukaPelanggaran("alt_tab");
      return true;
    };

    const onVis = () => {
      if (document.visibilityState === "hidden") {
        if (!bolehLapor()) return;
        if (laporAltTab()) return;
        void simpanRef.current(); // amankan jawaban sebelum peserta pergi
        void bukaPelanggaran("keluar_tab");
      } else {
        void tutupPelanggaran();
      }
    };

    const laporTangkapLayar = (e: KeyboardEvent) => {
      const pintasan = pintasanTangkapLayar(e);
      if (!pintasan) return false;
      // Yang berhasil dicegah berarti soalnya tidak jadi terpotret sama sekali.
      e.preventDefault();
      if (!bolehLapor()) return false;
      if (tangkapDilaporkan.current) return true;
      tangkapDilaporkan.current = true;
      void simpanRef.current();
      void bukaPelanggaran("tangkap_layar");
      return true;
    };

    const onTombolTurun = (e: KeyboardEvent) => {
      if (laporTangkapLayar(e)) return;
      // ESC/F11 ditandai waktunya — DAN HANYA ITU. Satu-satunya pembacanya
      // adalah pemaafan papan ketik layar, yang memakainya untuk MENOLAK
      // memaafkan lepasan yang ternyata berasal dari tombol.
      if (pelepasLayarPenuhDitekan(e)) escSejak.current = Date.now();

      const meta = commandPindahJendela() && (e.key === "Meta" || e.metaKey);
      const modifier = e.key === "Alt" || e.key === "Meta";

      // HANYA MODIFIER TELANJANG yang menandai; kombinasi apa pun justru
      // MEMBERSIHKAN penandanya — itulah yang memisahkan "berpindah jendela"
      // (ALT+TAB: halaman cuma melihat keydown ALT) dari "mengetik jalan
      // pintas" (Cmd+C: keydown Meta LALU keydown "c" ber-metaKey).
      if (modifier && (e.key === "Alt" ? true : meta)) {
        altSejak.current = Date.now();
      } else if (!modifier && (e.altKey || e.metaKey)) {
        altSejak.current = 0;
      }

      // Sebagian pengelola jendela tetap meneruskan TAB-nya ke halaman. Kalau
      // itu terjadi, buktinya sudah utuh di sini.
      if (e.key === "Tab" && (e.altKey || meta)) {
        if (!bolehLapor()) return;
        altSejak.current = Date.now();
        laporAltTab();
      }
    };

    const onTombolNaik = (e: KeyboardEvent) => {
      // PrintScreen di Chrome/Edge Windows HANYA sampai lewat keyup.
      if (laporTangkapLayar(e)) return;
      if (e.key === "Alt" || e.key === "Meta") altSejak.current = 0;
    };

    // Kehilangan fokus selagi halaman MASIH TERLIHAT adalah sinyal paling
    // berisik dari semuanya. Laporannya ditahan dulu: kalau fokus pulih sebelum
    // MASA_PASTIKAN_FOKUS, tidak ada yang dilaporkan.
    let jamPastikan: number | null = null;
    const lupakanPastikan = () => {
      if (jamPastikan !== null) {
        window.clearTimeout(jamPastikan);
        jamPastikan = null;
      }
    };
    const pastikanHilangFokus = () => {
      if (jamPastikan !== null) return; // sudah ada yang menunggu
      if (!bolehLapor()) return;
      void simpanRef.current();
      jamPastikan = window.setTimeout(() => {
        jamPastikan = null;
        if (!bolehLapor()) return;
        if (document.hasFocus()) return; // kutu peramban, bukan kepergian
        if (document.visibilityState !== "visible") return; // urusan `onVis`
        void bukaPelanggaran("blur_window");
      }, MASA_PASTIKAN_FOKUS);
    };

    const onBlur = () => {
      if (document.visibilityState === "hidden") return;
      if (laporAltTab()) return;
      pastikanHilangFokus();
    };
    const onFocus = () => {
      lupakanPastikan();
      altSejak.current = 0;
      altTabDilaporkan.current = false;
      void tutupPelanggaran();
    };

    // `pagehide` adalah sinyal kepergian paling andal di WebKit: terpancar saat
    // berpindah aplikasi, berpindah tab, dan saat layar terkunci.
    const onPergi = () => {
      if (!bolehLapor()) return;
      if (laporAltTab()) return;
      void simpanRef.current();
      void bukaPelanggaran("keluar_tab");
    };

    // Jaring pengaman: sebagian peramban tidak selalu memancarkan `blur` ketika
    // fokus berpindah ke jendela lain di layar yang sama. Di WebKit seluler
    // jaring ini tidak pernah menyala — di sana penjagaan bertumpu pada
    // `visibilitychange`, `pagehide`, dan denyut nadi.
    const jam = window.setInterval(() => {
      if (!bolehLapor()) return;
      if (document.visibilityState !== "visible") return;
      if (!document.hasFocus()) pastikanHilangFokus();
    }, 1000);

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pagehide", onPergi);
    // `capture` supaya tombolnya tercatat walau ada komponen lain yang
    // menghentikan perambatan peristiwanya lebih dulu.
    window.addEventListener("keydown", onTombolTurun, true);
    window.addEventListener("keyup", onTombolNaik, true);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pagehide", onPergi);
      window.removeEventListener("keydown", onTombolTurun, true);
      window.removeEventListener("keyup", onTombolNaik, true);
      window.clearInterval(jam);
      lupakanPastikan();
    };
  }, [bolehLapor, bukaPelanggaran, tutupPelanggaran]);

  /* ---------------- denyut nadi ---------------- */

  const denyutTerakhir = useRef(0);

  useEffect(() => {
    // Pratinjau tidak berdenyut: denyut adalah bukti kehadiran pada SATU
    // pengerjaan, dan pengelola yang mencoba paketnya tidak sedang mengerjakan
    // apa pun.
    if (pratinjau) return;
    denyutTerakhir.current = Date.now();
    let hidup = true;
    let mula = true;
    let jam: number | null = null;
    let terlihat = document.visibilityState === "visible";
    let percobaan = 0;
    // Bukti kedua, untuk jeda yang lahir dari halaman yang DIBEKUKAN peramban
    // selagi peserta mengetik. Sekali menyala ia bertahan sampai ada denyut
    // yang benar-benar sampai: yang perlu dijelaskan adalah keadaan SEPANJANG
    // jeda, bukan keadaan pada detik denyut yang berhasil.
    let mengetik = false;

    const jadwal = (ms: number) => {
      if (!hidup) return;
      if (jam !== null) window.clearTimeout(jam);
      jam = window.setTimeout(() => void denyut(), ms);
    };

    const denyut = async () => {
      if (!hidup || gugurRef.current) return;
      percobaan += 1;
      const diKolom = kolomTeksAktif() || kolomTeksTampil.current;
      mengetik = mengetik || diKolom;
      try {
        const res = await fetch(ALAMAT_DENYUT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pengerjaanId,
            aktif: dipantau.current,
            mula,
            subtes: subtesRef.current,
            terlihat,
            percobaan,
            mengetik,
            rekaman: rekamanKini(),
          }),
          // Tanpa batas waktu, SATU permintaan yang menggantung menghentikan
          // seluruh denyut — dan itulah sebab tunggal terbesar peserta gugur
          // tanpa berbuat salah pada tryout 4-6 September 2026.
          signal: AbortSignal.timeout(BATAS_DENYUT_MS),
        });
        const data = (await res.json()) as { digugurkan?: boolean; pesan?: string };
        mula = false;
        denyutTerakhir.current = Date.now();
        terlihat = document.visibilityState === "visible";
        percobaan = 0;
        mengetik = diKolom;
        // Denyut ini SAMPAI, jadi jeda berikutnya bermula dari sekarang —
        // dan bendera lengket rekamannya boleh dilepas, kecuali rekamannya
        // memang masih berputar detik ini.
        rekamanTertunda.current = rekamanRef.current;
        setSambunganPutus(false);
        if (data.digugurkan) {
          nyatakanGugur(data.pesan ?? null);
          return;
        }
        jadwal(JEDA_DENYUT);
      } catch {
        // Denyut yang gagal terkirim bukan pelanggaran dan tidak menggugurkan.
        // Peserta tetap diberi tahu karena sambungan yang putus berarti jawaban
        // terakhirnya belum tentu sampai.
        const lewat = (Date.now() - denyutTerakhir.current) / 1000;
        setSambunganPutus(lewat > 6);
        jadwal(JEDA_COBA_DENYUT);
      }
    };

    // Begitu halaman pernah disembunyikan, denyut berikutnya tidak boleh lagi
    // mengaku "saya terlihat sepanjang waktu".
    const onSembunyi = () => {
      if (document.visibilityState !== "visible") terlihat = false;
    };
    document.addEventListener("visibilitychange", onSembunyi);

    void denyut();

    // Kembali dari balik layar: berdenyut SEKARANG. Inilah kesempatan pertama
    // server mengetahui halaman sempat mati — dan peserta belum sempat memuat
    // ulang untuk menghapus jejaknya.
    const onKembali = () => {
      if (document.visibilityState === "visible") jadwal(0);
    };
    document.addEventListener("visibilitychange", onKembali);
    window.addEventListener("pageshow", onKembali);

    return () => {
      hidup = false;
      if (jam !== null) window.clearTimeout(jam);
      document.removeEventListener("visibilitychange", onSembunyi);
      document.removeEventListener("visibilitychange", onKembali);
      window.removeEventListener("pageshow", onKembali);
    };
  }, [nyatakanGugur, pengerjaanId, pratinjau]);

  /* ---------------- layar jangan mengunci sendiri ---------------- */

  /**
   * Screen Wake Lock menahan layar tetap menyala selama ruang ujian terbuka.
   * Bukan kenyamanan melainkan PENCEGAHAN: layar yang padam sendiri lebih dari
   * ambang denyut menggugurkan, dan peserta yang membaca satu bacaan panjang
   * tanpa menyentuh layar tidak boleh kehilangan ujiannya karena itu.
   *
   * Sistem melepas kuncinya setiap kali halaman disembunyikan, jadi ia harus
   * diminta ulang setiap kali halaman kembali terlihat. Peramban yang menolak
   * (iOS di bawah 16.4, mode hemat baterai) tidak menggagalkan apa pun.
   */
  useEffect(() => {
    type KunciLayar = { release: () => Promise<void> };
    const nav = navigator as Navigator & {
      wakeLock?: { request: (jenis: "screen") => Promise<KunciLayar> };
    };
    const wakeLock = nav.wakeLock;
    if (!wakeLock) return;

    let hidup = true;
    let kunci: KunciLayar | null = null;

    const minta = async () => {
      if (!hidup || document.visibilityState !== "visible") return;
      try {
        kunci = await wakeLock.request("screen");
      } catch {
        /* ditolak peramban: peserta itu hanya kehilangan pencegahannya */
      }
    };

    void minta();
    const onKembali = () => {
      if (document.visibilityState === "visible") void minta();
    };
    document.addEventListener("visibilitychange", onKembali);

    return () => {
      hidup = false;
      document.removeEventListener("visibilitychange", onKembali);
      if (kunci) void kunci.release().catch(() => {});
    };
  }, []);

  /* ---------------- penghalang penyalinan soal ---------------- */

  const lastLapor = useRef<Record<string, number>>({});

  const laporCurang = useCallback(
    (
      jenis: "salin" | "klik_kanan" | "pintasan" | "tekan_tahan" | "lewat_safari",
      keterangan: string,
      tampil: string | null,
    ) => {
      if (tampil) setPesanCurang(tampil);

      const kini = Date.now();
      if (kini - (lastLapor.current[jenis] ?? 0) < JEDA_LAPOR_CURANG) return;
      lastLapor.current[jenis] = kini;

      // Pemberitahuannya sudah tampil di atas; yang dilewati hanya catatannya.
      if (pratinjau) return;

      void fetch(ALAMAT_VIOLATION, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pengerjaanId,
          aksi: "percobaan",
          subtes: subtesRef.current,
          jenis,
          keterangan,
          kejadian: penandaKejadian(),
        }),
        keepalive: true,
      }).catch(() => {
        /* gagal melapor tidak boleh mengganggu pengerjaan */
      });
    },
    [pengerjaanId, pratinjau],
  );

  useEffect(() => {
    const onSalin = (e: ClipboardEvent) => {
      // Kolom jawaban DIKECUALIKAN dari seluruh penghalang: peserta harus tetap
      // bisa menyunting karangannya sendiri, dan di Writing itu wajib.
      if (diKolomIsian(e.target)) return;
      e.preventDefault();
      laporCurang("salin", "copy/cut", "Copying the exam text is not allowed. This is recorded.");
    };
    const onKlikKanan = (e: MouseEvent) => {
      e.preventDefault();
      laporCurang("klik_kanan", "contextmenu", "Right-click is disabled during the exam.");
    };
    const onPilihTeks = (e: Event) => {
      if (diKolomIsian(e.target)) return;
      e.preventDefault();
    };
    const onTombol = (e: KeyboardEvent) => {
      // Ctrl+A / Ctrl+C di dalam kolom jawaban adalah penyuntingan biasa.
      if (diKolomIsian(e.target) && !e.shiftKey && e.key !== "F12") return;
      const p = pintasanTerlarang(e);
      if (!p) return;
      e.preventDefault();
      laporCurang("pintasan", p, `The shortcut ${p} is disabled during the exam.`);
    };

    document.addEventListener("copy", onSalin);
    document.addEventListener("cut", onSalin);
    document.addEventListener("contextmenu", onKlikKanan);
    document.addEventListener("selectstart", onPilihTeks);
    document.addEventListener("keydown", onTombol);
    return () => {
      document.removeEventListener("copy", onSalin);
      document.removeEventListener("cut", onSalin);
      document.removeEventListener("contextmenu", onKlikKanan);
      document.removeEventListener("selectstart", onPilihTeks);
      document.removeEventListener("keydown", onTombol);
    };
  }, [laporCurang]);

  /**
   * Tekan-tahan iOS memunculkan menu sistem Salin/Bagikan/Look Up — jalan
   * keluar soal yang TIDAK menyembunyikan halaman, sehingga tak satu pun
   * penjagaan lain menangkapnya. `contextmenu` tidak terpancar di sana; yang
   * mematikan menunya adalah `-webkit-touch-callout` di `globals.css`, dan
   * bagian ini mencatat niatnya. Jari yang bergeser dianggap menggulung.
   */
  useEffect(() => {
    let jam: number | null = null;
    let mulaX = 0;
    let mulaY = 0;

    const batal = () => {
      if (jam !== null) {
        window.clearTimeout(jam);
        jam = null;
      }
    };

    const onMula = (e: TouchEvent) => {
      batal();
      if (e.touches.length !== 1) return;
      if (diKolomIsian(e.target)) return;
      const t = e.touches[0];
      mulaX = t.clientX;
      mulaY = t.clientY;
      jam = window.setTimeout(() => {
        jam = null;
        const gambar = (e.target as HTMLElement | null)?.tagName?.toLowerCase() === "img";
        laporCurang(
          "tekan_tahan",
          gambar ? "tekan-tahan gambar soal" : "tekan-tahan teks soal",
          "Press-and-hold on the exam text is not allowed. This is recorded.",
        );
      }, TEKAN_TAHAN);
    };

    const onGeser = (e: TouchEvent) => {
      if (jam === null || e.touches.length === 0) return;
      const t = e.touches[0];
      if (
        Math.abs(t.clientX - mulaX) > GESER_TOLERANSI ||
        Math.abs(t.clientY - mulaY) > GESER_TOLERANSI
      ) {
        batal();
      }
    };

    document.addEventListener("touchstart", onMula, { passive: true });
    document.addEventListener("touchmove", onGeser, { passive: true });
    document.addEventListener("touchend", batal, { passive: true });
    document.addEventListener("touchcancel", batal, { passive: true });
    return () => {
      batal();
      document.removeEventListener("touchstart", onMula);
      document.removeEventListener("touchmove", onGeser);
      document.removeEventListener("touchend", batal);
      document.removeEventListener("touchcancel", batal);
    };
  }, [laporCurang]);

  /* ---------------- pemberitahuan yang hilang sendiri ---------------- */

  useEffect(() => {
    if (!pesanCurang) return;
    const t = window.setTimeout(() => setPesanCurang(null), 4000);
    return () => window.clearTimeout(t);
  }, [pesanCurang]);

  // Lebih lama daripada pemberitahuan menyalin: yang ini membawa angka yang
  // perlu dibaca dan dihitung peserta, bukan sekadar larangan.
  useEffect(() => {
    if (!pesanPergi) return;
    const t = window.setTimeout(() => setPesanPergi(null), 8000);
    return () => window.clearTimeout(t);
  }, [pesanPergi]);

  /* ---------------- pembongkaran ---------------- */

  const matikanPenjagaan = useCallback(() => {
    pergiSengaja.current = true;
    dipantau.current = false;
    if (pratinjau) return;
    // Denyut ikut dibongkar DENGAN SENGAJA, supaya jeda sepanjang apa pun
    // sesudah ini tidak terbaca sebagai kepergian. Dikirim lewat beacon karena
    // halaman ini sebentar lagi berpindah. `mula` sengaja tidak disertakan —
    // itulah yang membedakannya dari halaman yang dimuat ulang.
    laporTahanBeku(ALAMAT_DENYUT, { pengerjaanId, aktif: false, subtes: subtesRef.current });
    tandaiGerbang(kunciSesi, false);
    tandaiPapanKetik(kunciSesi, false);
  }, [kunciSesi, pengerjaanId, pratinjau]);

  useEffect(
    () => () => {
      dipantau.current = false;
      // Berbeda dari ruang ujian UTBK yang bertahan di halaman yang sama antar
      // subtes: di IELTS tiap subtes punya alamatnya sendiri dan peserta selalu
      // kembali ke papan subtes di antaranya. Jadi layar penuh memang dilepas
      // di sini, dan gerbangnya muncul lagi saat subtes berikutnya dibuka.
      keluarLayarPenuh();
    },
    [],
  );

  const mulaiLewatSafari = useCallback(() => {
    laporCurang("lewat_safari", "mulai dari Safari, bukan ikon Layar Utama", null);
    void masukLayarPenuh();
  }, [laporCurang, masukLayarPenuh]);

  const masukLayarPenuhSinkron = useCallback(() => {
    void masukLayarPenuh();
  }, [masukLayarPenuh]);

  return {
    gugur,
    gerbangTampil,
    galatLayarPenuh,
    tanpaApiLayarPenuh,
    terpasangDiLayarUtama,
    pesanCurang,
    pesanPergi,
    sambunganPutus,
    masukLayarPenuh: masukLayarPenuhSinkron,
    mulaiLewatSafari,
    matikanPenjagaan,
  };
}
