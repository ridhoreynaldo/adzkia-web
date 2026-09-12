"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  AMBANG_KEMBALI_DETIK,
  BATAS_DENYUT_MS,
  BUDGET_PERGI_DETIK,
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
  tanpaLangganan,
  tandaiGerbang,
  tandaiPapanKetik,
  type ElemenLayarPenuh,
} from "@/lib/penjagaan/penjagaan-peramban";
import { petaRentangBacaan } from "@/lib/tryout/soal-tampilan";
import { PESAN_GUGUR } from "./tipe";
import type { HasilAksiSubtes, ItemJawaban, SoalUjian, StatusSimpan } from "./tipe";
import { TimerUjian } from "./TimerUjian";
import { PanelNomor, statusNomor } from "./PanelNomor";
import { KartuSoal } from "./KartuSoal";
import { DialogKonfirmasi } from "./DialogKonfirmasi";
import { LayarGagal } from "./LayarGagal";
import { FotoPeserta } from "./FotoPeserta";

const JEDA_SIMPAN = 400; // ms

interface Props {
  attemptId: number;
  packageId: number;
  namaPeserta: string;
  /** NISN peserta, ditampilkan di bilah atas bersama fotonya. */
  nisnPeserta?: string | null;
  /** Alamat foto peserta; null = lingkaran huruf awal namanya. */
  fotoPeserta?: string | null;
  namaPaket: string;
  /** Sesi yang sedang dikerjakan; SKD memakai satu kode untuk seluruh soal. */
  subtes: string;
  namaSubtesAktif: string;
  urutanKe: number;
  totalSubtes: number;
  sisaDetik: number;
  /** true = satu sesi SKD (semua subtes sekaligus), bukan subtes berurutan. */
  sesiTunggal?: boolean;
  /**
   * Portal tempat ujian ini dikerjakan. Menentukan nama ujian yang dibaca
   * peserta pada layar GAGAL — "SKD Kedinasan", bukan "TryOut Real UTBK-SNBT".
   */
  jalur?: "utbk" | "skd";
  soal: SoalUjian[];
  aksiSelesaiSubtes: (attemptId: number, subtes: string) => Promise<HasilAksiSubtes>;
  /**
   * MODE PRATINJAU admin (`/admin/paket/[id]/simulasi`): layar yang sama persis
   * dengan yang dikerjakan peserta, tetapi TANPA satu pun sentuhan ke server —
   * tidak menyimpan jawaban, tidak berdenyut, tidak mencatat pelanggaran, dan
   * tidak pernah menggugurkan siapa pun.
   *
   * Sengaja satu bendera, bukan komponen tiruan tersendiri: pratinjau yang
   * bukan layar sungguhan tidak membuktikan apa-apa tentang tampilan hari-H.
   * Setiap tempat yang menyentuh jaringan di bawah ini dijaga bendera ini, dan
   * `dipantau` — gerbang tunggal seluruh penjagaan — tidak pernah dinyalakan.
   */
  pratinjau?: boolean;
  /**
   * Jalan keluar dari pratinjau. Wajib ada dalam mode pratinjau: di layar penuh
   * tidak ada bilah alamat, dan satu-satunya pintu keluar bagi peserta —
   * "Selesaikan Subtes" — memaksa admin menonton tujuh subtes sampai habis
   * hanya untuk kembali ke panel.
   */
  onKeluarPratinjau?: () => void;
}

const TEKS_SIMPAN: Record<StatusSimpan, string> = {
  idle: "Jawaban tersimpan otomatis",
  menyimpan: "Menyimpan…",
  tersimpan: "Tersimpan",
  gagal: "Gagal menyimpan — mencoba lagi",
};

export function RuangUjian({
  attemptId,
  namaPeserta,
  nisnPeserta = null,
  fotoPeserta = null,
  namaPaket,
  subtes,
  namaSubtesAktif,
  urutanKe,
  totalSubtes,
  sisaDetik,
  sesiTunggal = false,
  jalur = "utbk",
  soal,
  aksiSelesaiSubtes,
  pratinjau = false,
  onKeluarPratinjau,
}: Props) {
  const router = useRouter();

  const [jawaban, setJawaban] = useState<Record<number, string | null>>(() => {
    const m: Record<number, string | null> = {};
    for (const s of soal) m[s.id] = s.jawaban;
    return m;
  });
  const [ragu, setRagu] = useState<Record<number, boolean>>(() => {
    const m: Record<number, boolean> = {};
    for (const s of soal) m[s.id] = s.ragu;
    return m;
  });

  const [indeks, setIndeks] = useState(0);
  const [status, setStatus] = useState<StatusSimpan>("idle");
  const [drawer, setDrawer] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [memproses, setMemproses] = useState(false);
  const [gugur, setGugur] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  // Penjagaan layar penuh
  const [layarPenuh, setLayarPenuh] = useState(false);
  const [sudahMasuk, setSudahMasuk] = useState(false);
  const [galatLayarPenuh, setGalatLayarPenuh] = useState<string | null>(null);
  // Kemampuan peramban dibaca lewat useSyncExternalStore supaya server selalu
  // merender "peramban normal" dan klien memperbaikinya tepat setelah hidrasi —
  // tanpa perbedaan markah, dan tanpa satu putaran render tambahan.
  // Menampung DUA sebab sekaligus: peramban yang memang tidak punya Fullscreen
  // API (iPhone) dan peramban yang punya tetapi tidak boleh memakainya (WebKit
  // mana pun — lihat `pakaiLayarPenuhAsli`). Keduanya berujung pada ruang ujian
  // yang sama: layar penuh semu.
  const tanpaApiLayarPenuh = useSyncExternalStore(
    tanpaLangganan,
    () => !pakaiLayarPenuhAsli(),
    () => false,
  );
  const terpasangDiLayarUtama = useSyncExternalStore(
    tanpaLangganan,
    berdiriSendiri,
    () => false,
  );
  // Percobaan curang yang dicatat (menyalin, klik kanan, jalan pintas)
  const [catatanCurang, setCatatanCurang] = useState(0);
  const [pesanCurang, setPesanCurang] = useState<string | null>(null);
  /**
   * Pemberitahuan sisa anggaran kepergian, ditampilkan tiap kali peserta
   * kembali ke halaman ujian. Diminta pengelola bersama rem menumpuk.
   */
  const [pesanPergi, setPesanPergi] = useState<string | null>(null);

  const terkunci = memproses || gugur !== null;
  const aktif: SoalUjian | undefined = soal[indeks];

  /* ---------------- autosave ---------------- */

  const antre = useRef<Map<number, ItemJawaban>>(new Map());
  const jamSimpan = useRef<number | null>(null);

  const kirim = useCallback(async () => {
    if (jamSimpan.current !== null) {
      window.clearTimeout(jamSimpan.current);
      jamSimpan.current = null;
    }
    if (antre.current.size === 0) return;

    const paket = [...antre.current.values()];
    antre.current.clear();

    // Pratinjau: jawaban admin cukup hidup di layar. Statusnya tetap dibuat
    // "Tersimpan" supaya bilah atasnya tampak sama seperti yang dilihat peserta.
    if (pratinjau) {
      setStatus("tersimpan");
      return;
    }

    setStatus("menyimpan");

    try {
      const res = await fetch("/api/exam/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, jawaban: paket }),
        keepalive: true,
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("tersimpan");
    } catch {
      // Kembalikan ke antrean supaya dicoba lagi pada perubahan berikutnya.
      for (const it of paket) {
        if (!antre.current.has(it.questionId)) antre.current.set(it.questionId, it);
      }
      setStatus("gagal");
    }
  }, [attemptId, pratinjau]);

  const kirimRef = useRef(kirim);
  useEffect(() => {
    kirimRef.current = kirim;
  }, [kirim]);

  const jadwalkan = useCallback((item: ItemJawaban) => {
    antre.current.set(item.questionId, item);
    setStatus("menyimpan");
    if (jamSimpan.current !== null) window.clearTimeout(jamSimpan.current);
    jamSimpan.current = window.setTimeout(() => void kirimRef.current(), JEDA_SIMPAN);
  }, []);

  const ubahJawaban = useCallback(
    (questionId: number, nilai: string | null) => {
      setJawaban((p) => ({ ...p, [questionId]: nilai }));
      jadwalkan({ questionId, jawaban: nilai, ragu: ragu[questionId] ?? false });
    },
    [jadwalkan, ragu],
  );

  const ubahRagu = useCallback(
    (questionId: number, nilai: boolean) => {
      setRagu((p) => ({ ...p, [questionId]: nilai }));
      jadwalkan({ questionId, jawaban: jawaban[questionId] ?? null, ragu: nilai });
    },
    [jadwalkan, jawaban],
  );

  // Simpan sisa antrean saat halaman ditutup / disembunyikan.
  useEffect(() => {
    const simpanCepat = () => void kirimRef.current();
    window.addEventListener("pagehide", simpanCepat);
    window.addEventListener("beforeunload", simpanCepat);
    return () => {
      window.removeEventListener("pagehide", simpanCepat);
      window.removeEventListener("beforeunload", simpanCepat);
      void kirimRef.current();
    };
  }, []);

  /* ---------------- penjagaan layar penuh & keluar halaman ---------------- */

  // Catatan pelanggaran DAN keputusan menggugurkan diambil di SERVER, bukan di
  // browser, supaya peserta tidak bisa membatalkannya dengan menutup dialog,
  // memuat ulang halaman, atau membersihkan storage.
  const pelanggaranTerbuka = useRef<{ id: number; jenis: string } | null>(null);
  const gugurRef = useRef(false);
  const subtesRef = useRef(subtes);
  useEffect(() => {
    subtesRef.current = subtes;
  }, [subtes]);

  // Pemantauan baru menyala sesudah peserta masuk layar penuh, dan dibekukan
  // sejenak setiap kali mode layar penuh berpindah.
  const dipantau = useRef(false);
  const siagaSampai = useRef(0);
  /** Kapan mode layar penuh terakhir MENYALA — dasar masa tenang perangkat. */
  const layarPenuhSejak = useRef(0);
  /** Kapan kolom isian singkat terakhir disentuh, dipegang, atau dilepas. */
  const isianTerakhir = useRef(0);
  /**
   * true bila soal yang SEDANG TAMPIL adalah isian singkat.
   *
   * Di perangkat sentuh, selama soal semacam itu terpampang, papan ketik layar
   * boleh naik-turun berkali-kali — dan setiap kali naik, WebKit iPadOS melepas
   * mode layar penuh lagi. Melawannya (memasang layar penuh berulang kali di
   * sela ketukan) justru menghasilkan pantulan yang tidak ada habisnya, dan
   * pantulan itulah yang bisa mendarat sesudah jendela pemaafan tertutup.
   * Maka selama soal isian tampil, layar penuh dibiarkan lepas dengan tenang:
   * gerbang tidak ditampilkan, tidak ada yang dicatat, dan pemulihannya
   * ditunda sampai peserta berpindah ke soal yang tidak butuh papan ketik.
   */
  const soalIsianTampil = useRef(false);
  /** Kapan tombol pelepas layar penuh terakhir ditekan; lihat penjaganya. */
  const escSejak = useRef(0);
  /**
   * true = mode layar penuh lepas KARENA papan ketik layar naik, bukan karena
   * peserta. Selama ini gerbang layar penuh sengaja tidak ditampilkan, dan
   * mode layar penuh dipasang kembali diam-diam begitu papan ketiknya turun.
   */
  const papanKetikMenelan = useRef(false);
  /** Permintaan layar penuh sedang menunggu jawaban peramban. */
  const pemulihanBerjalan = useRef(false);
  /**
   * true = lepasnya layar penuh berikutnya DIKERJAKAN HALAMAN INI SENDIRI,
   * supaya peserta bisa mengetik tanpa disambut panel sistem WebKit. Lepasan
   * semacam itu tidak pernah boleh dicatat maupun memunculkan gerbang — ia
   * bukan perbuatan peserta sama sekali, melainkan perbuatan aplikasi.
   */
  const lepasSengaja = useRef(false);
  /**
   * true = komponen ini dibongkar karena PINDAH SUBTES, bukan karena peserta
   * meninggalkan ujian. Selama itu mode layar penuh sengaja DIPERTAHANKAN,
   * supaya subtes berikutnya tidak menuntut persetujuan layar penuh lagi —
   * transisi itulah yang paling rawan menghasilkan pelanggaran palsu.
   */
  const pindahSubtes = useRef(false);

  /**
   * Kapan tombol ALT (atau Command) terakhir DITEKAN dan belum dilepas.
   *
   * Nol berarti tidak sedang ditekan. Sistem operasi menelan ALT+TAB sebelum
   * peramban melihat TAB-nya, jadi inilah satu-satunya jejak yang tertinggal —
   * lihat MASA_ALT_TAB di `@/lib/denyut`.
   */
  const altSejak = useRef(0);

  /** true bila kepergian yang sedang berlangsung sudah dilaporkan sebagai ALT+TAB. */
  const altTabDilaporkan = useRef(false);

  /**
   * true bila potret layar sudah dilaporkan. Satu tekanan PrintScreen sampai
   * dua kali (keydown dan keyup, tergantung peramban), dan keduanya tidak boleh
   * menjadi dua baris pelanggaran.
   */
  const tangkapDilaporkan = useRef(false);

  const beriSiaga = useCallback(() => {
    siagaSampai.current = Date.now() + MASA_SIAGA;
  }, []);

  const bolehLapor = useCallback(
    () => dipantau.current && !gugurRef.current && Date.now() >= siagaSampai.current,
    [],
  );

  const nyatakanGugur = useCallback(
    (pesanGugur?: string | null) => {
      if (gugurRef.current) return;
      gugurRef.current = true;
      tandaiGerbang(attemptId, false);
      setGugur(pesanGugur && pesanGugur.trim() !== "" ? pesanGugur : PESAN_GUGUR);
    },
    [attemptId],
  );

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
      if (pratinjau) return; // pratinjau tidak pernah menggugurkan siapa pun
      if (gugurRef.current) return;
      // Satu kejadian, satu catatan — KECUALI bila yang datang menggugurkan
      // sementara yang sedang terbuka hanya sebuah catatan. Kunci itu ada untuk
      // mencegah satu kepergian tercatat dua kali, bukan untuk melindungi
      // peserta dari pelanggaran keduanya: peserta yang layar penuhnya baru
      // lepas (dicatat) lalu menekan ALT+TAB harus tetap tertangkap.
      const terbuka = pelanggaranTerbuka.current;
      if (terbuka && !(menggugurkan(jenis) && !menggugurkan(terbuka.jenis))) return;
      pelanggaranTerbuka.current = { id: 0, jenis }; // kunci sementara

      const kejadian = penandaKejadian();
      // Keadaan layar penuh DIBACA SEKARANG, pada detik kejadiannya — bukan
      // nanti saat jawaban server tiba. Inilah yang membedakan layar HP yang
      // meredup (layar penuh masih terpasang) dari peserta yang menekan Esc
      // lalu berpindah ke layar lain; server memutuskan berdasarkan ini.
      // Dibaca SEKARANG, pada detik kejadiannya. Kepergian hanya dimaafkan bila
      // perangkatnya benar-benar punya layar penuh DAN saat itu masih di
      // dalamnya — satu-satunya keadaan yang berarti "layarnya padam sendiri".
      const adaLayarPenuh = adaApiLayarPenuh();
      const dalamLayarPenuh = elemenLayarPenuh() !== null;
      const muatan = {
        attemptId,
        aksi: "keluar",
        subtes: subtesRef.current,
        jenis,
        kejadian,
        adaLayarPenuh,
        dalamLayarPenuh,
      };

      // Beacon lebih dulu — inilah pengiriman yang selamat kalau peramban
      // membekukan halaman sedetik kemudian (iPhone selalu begitu). `fetch` di
      // bawahnya tetap dijalankan karena hanya dialah yang membawa PUTUSAN
      // server kembali ke layar; kalau ia mati di jalan, catatannya sudah aman
      // dan penanda yang sama mencegah baris kembar.
      laporTahanBeku("/api/exam/violation", muatan);

      try {
        const res = await fetch("/api/exam/violation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(muatan),
          keepalive: true,
        });
        const data = (await res.json()) as {
          ok: boolean;
          violationId?: number;
          digugurkan?: boolean;
          peringatanTerakhir?: boolean;
          peringatanLayarPenuh?: boolean;
          pesan?: string;
        };

        if (data.ok && data.violationId) {
          pelanggaranTerbuka.current = { id: data.violationId, jenis };
        } else {
          pelanggaranTerbuka.current = null;
        }

        if (data.digugurkan) {
          nyatakanGugur(data.pesan);
          return;
        }

        // Kunci sementara HARUS dilepas untuk kejadian yang tidak punya
        // "kembali" — lepasnya layar penuh di ponsel dan tablet tidak
        // menyembunyikan halaman, jadi tidak akan pernah ada peristiwa fokus
        // atau visibilitas yang memanggil `tutupPelanggaran()` untuk
        // membukanya. Tanpa pelepasan ini kuncinya menggantung selamanya dan
        // MENELAN pelanggaran berikutnya — termasuk ALT+TAB yang seharusnya
        // menggugurkan. Terlihat 8 September 2026 saat menguji aturan ALT+TAB
        // di perangkat sentuh.
        if (data.peringatanTerakhir || data.peringatanLayarPenuh) {
          pelanggaranTerbuka.current = null;
        }
      } catch {
        // `fetch` mati karena halaman dibekukan atau jaringan putus. Catatannya
        // tetap sampai lewat beacon di atas, dan SERVER yang memutuskan akibatnya.
        pelanggaranTerbuka.current = null;
        // Hanya kejadian yang memang menggugurkan yang boleh mengunci layar
        // tanpa mendengar jawaban server. Aturannya dipakai bersama server —
        // `keluar_tab` selagi layar penuh masih terpasang (layar HP meredup)
        // tetap sekadar catatan, dan mengunci layar untuk itu adalah kekeliruan
        // yang paling menyakitkan bagi peserta.
        if (menggugurkanKeluar(jenis, { adaLayarPenuh, dalamLayarPenuh })) {
          nyatakanGugur(pesanGugurJenis(jalur, jenis));
        }
      }
    },
    [attemptId, jalur, nyatakanGugur, pratinjau],
  );

  const tutupPelanggaran = useCallback(async () => {
    if (pratinjau) return;
    const v = pelanggaranTerbuka.current;
    pelanggaranTerbuka.current = null;
    if (!v || !v.id) return;
    try {
      const res = await fetch("/api/exam/violation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, aksi: "kembali", violationId: v.id }),
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

      // SISA ANGGARAN DIBERITAHUKAN, sejak 9 September 2026 — kebalikan dari
      // keputusan 8 September yang sengaja mendiamkan kepergian singkat.
      // Sebabnya berubah bersama aturannya: dulu kepergian singkat memang tidak
      // berakibat apa-apa, sekarang ia MENUMPUK sampai menggugurkan. Peserta
      // yang tidak pernah melihat angkanya bergerak akan gugur oleh hitungan
      // yang tidak pernah ia sadari sedang berjalan — dan itu persis bentuk
      // pengguguran yang selama ini kita hindari.
      if (typeof data.totalDetik === "number" && typeof data.budgetDetik === "number") {
        const sisa = Math.max(0, data.budgetDetik - data.totalDetik);
        const barusan = typeof data.durasiDetik === "number" ? data.durasiDetik : null;
        setPesanPergi(
          (barusan !== null ? `Kamu meninggalkan halaman ujian ${barusan} detik. ` : "") +
            `Jumlahnya kini ${data.totalDetik} dari ${data.budgetDetik} detik` +
            (sisa > 0
              ? `; sisa ${sisa} detik sebelum ujian dihentikan.`
              : `. Kesempatanmu habis.`),
        );
      }
    } catch {
      /* jaringan putus: catatan keluar tetap tersimpan di server */
    }
  }, [attemptId, nyatakanGugur, pratinjau]);

  /* ---- masuk & memantau mode layar penuh ---- */

  const masukLayarPenuh = useCallback(async () => {
    setGalatLayarPenuh(null);
    beriSiaga();

    // iPhone: tidak ada Fullscreen API. Ruang ujian dikunci setinggi viewport
    // lewat kelas `.ruang-semu` dan penjagaan langsung dinyalakan — peserta
    // tidak boleh tertahan di gerbang hanya karena peramban tidak punya fitur
    // yang memang tidak pernah ada di perangkatnya.
    if (!pakaiLayarPenuhAsli()) {
      setLayarPenuh(true);
      setSudahMasuk(true);
      dipantau.current = !pratinjau;
      // Tidak ada `fullscreenchange` di sini, jadi masa tenang perangkat
      // dihitung dari sekarang — di iPhone justru detik-detik pertama inilah
      // yang paling banyak menghasilkan laporan palsu.
      layarPenuhSejak.current = Date.now();
      beriSiaga();
      // Menggulung sedikit membuat Safari menyusutkan bilah alamatnya.
      if (!pratinjau) tandaiGerbang(attemptId, true);
      window.setTimeout(() => window.scrollTo(0, 1), 50);
      return;
    }

    try {
      const el = document.documentElement as ElemenLayarPenuh;
      await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
      setSudahMasuk(true);
      dipantau.current = !pratinjau;
      beriSiaga();
      if (!pratinjau) tandaiGerbang(attemptId, true);
    } catch {
      setGalatLayarPenuh(
        "Peramban menolak membuka layar penuh. Coba tekan tombolnya sekali lagi.",
      );
    }
  }, [attemptId, beriSiaga, pratinjau]);

  /**
   * true bila lepasnya mode layar penuh barusan pantas dianggap ulah PAPAN
   * KETIK LAYAR, bukan perbuatan peserta. Tiga sumbernya sengaja berbeda jenis,
   * supaya tidak ada satu pun yang bisa tersangkut sendirian:
   *
   *   1. kolom teks yang sedang dipegang, DIBACA LANGSUNG dari dokumen;
   *   2. kolom teks yang baru saja disentuh/dilepas (jendela MASA_PAPAN_KETIK),
   *      untuk urutan peristiwa yang tidak dijamin peramban;
   *   3. soal isian singkat yang sedang terpampang di perangkat sentuh — selama
   *      itu papan ketik layar boleh naik-turun sesukanya, dan tiap kali naik
   *      iPadOS melepas layar penuh lagi. Pembatas `perambanKomputer()` menjaga
   *      sumber ketiga ini tidak pernah berlaku di laptop, tempat lepasnya
   *      layar penuh memang selalu berarti ada tombol yang ditekan.
   */
  /**
   * true bila soal yang sedang tampil menuntut papan ketik DAN perangkat ini
   * memang tidak boleh berada di layar penuh saat peserta mengetik.
   *
   * Dua sebab yang berbeda, sengaja disatukan di satu tempat supaya keduanya
   * tidak pernah berbeda pendapat:
   *
   *   · perangkat sentuh — papan ketik layarnya menjatuhkan mode layar penuh
   *     sendiri (iPadOS), jadi melawannya hanya menghasilkan pantulan;
   *   · WebKit apa pun, termasuk Safari di Mac berpapan ketik fisik — di sana
   *     mengetik di layar penuh memanggil panel sistem yang membekukan halaman
   *     dan berujung pada pengguguran palsu.
   */
  const hindariLayarPenuh = useCallback(
    () => soalIsianTampil.current && (!perambanKomputer() || melarangKetikDiLayarPenuh()),
    [],
  );

  const sedangMengetik = useCallback(
    () =>
      kolomTeksAktif() ||
      (isianTerakhir.current > 0 && Date.now() - isianTerakhir.current < MASA_PAPAN_KETIK) ||
      hindariLayarPenuh(),
    [hindariLayarPenuh],
  );

  /**
   * true bila SEKARANG bukan saatnya memasang layar penuh kembali.
   *
   * Melawan papan ketik — memasang layar penuh lagi selagi soal isian singkat
   * masih terpampang — menghasilkan pantulan: layar penuh menyala, papan ketik
   * naik lagi pada ketukan berikutnya, layar penuh lepas lagi. Salah satu
   * pantulan itu cepat atau lambat mendarat di luar jendela pemaafan, dan
   * peserta disambut gerbang yang tidak pernah ia sebabkan.
   */
  const belumSaatnyaPulih = useCallback(
    () => kolomTeksAktif() || hindariLayarPenuh(),
    [hindariLayarPenuh],
  );

  /**
   * Keluar dari layar penuh LEBIH DULU, supaya peserta bisa mengetik.
   *
   * Inilah obat satu-satunya untuk panel sistem WebKit — lihat
   * {@link melarangKetikDiLayarPenuh}. Dikerjakan begitu soal isian singkat
   * terpampang, BUKAN saat kolomnya disentuh: keluar dari layar penuh butuh
   * beberapa ratus milidetik, sedangkan papan ketik naik seketika sesudah
   * sentuhan, sehingga menunggu sentuhan berarti berlomba dengan panel yang
   * hendak dihindari — dan kalah.
   *
   * Penandanya dipasang SEBELUM lepasan diminta, supaya penjaga
   * `fullscreenchange` mengenalinya sebagai perbuatan aplikasi dan tidak
   * mencatat apa pun.
   */
  const lepasUntukMengetik = useCallback(() => {
    // Di WebKit tidak pernah ada layar penuh sungguhan yang perlu dilepas.
    if (!pakaiLayarPenuhAsli()) return;
    if (elemenLayarPenuh() === null) return; // memang sudah di luar
    if (!hindariLayarPenuh()) return;
    lepasSengaja.current = true;
    papanKetikMenelan.current = true;
    if (!pratinjau) tandaiPapanKetik(attemptId, true);
    beriSiaga();
    keluarLayarPenuh();
  }, [attemptId, beriSiaga, hindariLayarPenuh, pratinjau]);

  /**
   * Memasang kembali mode layar penuh yang tadi ditelan papan ketik layar.
   *
   * Diam-diam dan tanpa gerbang: peserta tidak pernah melakukan kesalahan
   * apa-apa, jadi ia juga tidak perlu diberi tahu apa pun. Bila peramban
   * menolak (permintaan layar penuh yang tidak lahir dari sentuhan memang
   * boleh ditolak), sentuhan peserta berikutnya di luar kolom isian akan
   * mencobanya lagi — lihat `pulihSaatDisentuh`.
   *
   * `paksa` dipakai pada satu tempat saja: saat peserta menutup subtes. Di sana
   * ruang ujian sebentar lagi dipasang ulang, dan ketukan tombolnya adalah
   * kesempatan terakhir yang sah untuk kembali ke layar penuh sebelum itu.
   */
  const pulihkanLayarPenuh = useCallback((paksa = false) => {
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
  }, [belumSaatnyaPulih, beriSiaga]);

  /**
   * Soal yang sedang tampil dicatat setiap kali nomornya berpindah, dan begitu
   * peserta meninggalkan soal isian singkat, layar penuh dipasang kembali.
   *
   * Permintaan di sini lahir dari perpindahan soal, bukan langsung dari
   * ketukan, jadi sebagian peramban berhak menolaknya — ketukan berikutnya di
   * luar kolom teks (`pulihSaatDisentuh`) yang menjadi jaring pengamannya.
   */
  useEffect(() => {
    soalIsianTampil.current = aktif?.tipe === "IS";
    if (soalIsianTampil.current) lepasUntukMengetik();
    else pulihkanLayarPenuh();
  }, [aktif?.tipe, indeks, lepasUntukMengetik, pulihkanLayarPenuh]);

  /**
   * Melanjutkan subtes berikutnya TANPA gerbang lagi.
   *
   * Ganti subtes memasang ulang komponen ini (kuncinya berubah), jadi seluruh
   * keadaan penjagaan lahir kembali dari nol. Kalau dokumennya ternyata MASIH
   * berada dalam mode layar penuh — dan sejak sekarang memang begitu, karena
   * `tutupSubtes` tidak lagi keluar layar penuh di antara subtes — maka
   * gerbangnya tidak boleh muncul lagi: penjagaan langsung dinyalakan dan
   * peserta lanjut mengerjakan tanpa satu ketukan pun.
   */
  const lanjutTanpaGerbang = useSyncExternalStore(
    tanpaLangganan,
    () =>
      !pratinjau &&
      (elemenLayarPenuh() !== null ||
        // iPhone tidak punya layar penuh yang bisa diperiksa, jadi di sana
        // penandanya disimpan sendiri saat peserta melewati gerbang pertama kali.
        (!pakaiLayarPenuhAsli() && bacaGerbang(attemptId)) ||
        // iPad: peserta SUDAH melewati gerbang, dan yang melepas layar penuh
        // adalah papan ketik layarnya sendiri. Menagih layar penuh lagi di sini
        // sama saja menghukumnya karena mengetik jawaban — dan gerbang yang
        // muncul justru menurunkan papan ketiknya. Penjagaan tetap menyala
        // penuh; layar penuhnya dipasang lagi pada ketukan pertama sesudah soal
        // isian singkat ditinggalkan.
        (bacaGerbang(attemptId) && bacaPapanKetik(attemptId))),
    () => false,
  );

  // Efeknya hanya menyentuh REF, tidak menyetel state: gerbangnya sudah
  // disembunyikan oleh nilai turunan di atas, sehingga yang tersisa di sini
  // cuma menyalakan penjagaannya.
  useEffect(() => {
    if (!lanjutTanpaGerbang) return;
    dipantau.current = true;
    layarPenuhSejak.current = Date.now();
    beriSiaga();
    // Ruang ujian yang baru dipasang mewarisi keadaan "layar penuh sedang
    // ditelan papan ketik" dari penandanya, supaya ketukan pertama peserta
    // memasang layar penuh kembali — bukan menunggu papan ketik naik sekali lagi.
    if (!pratinjau && elemenLayarPenuh() === null && bacaPapanKetik(attemptId)) {
      papanKetikMenelan.current = true;
    }
  }, [attemptId, beriSiaga, lanjutTanpaGerbang, pratinjau]);

  const gerbangTampil = !layarPenuh && !lanjutTanpaGerbang;


  useEffect(() => {
    // Pada peramban tanpa Fullscreen API peristiwa ini tidak pernah terpancar,
    // jadi status layar penuh semu di atas tidak akan tertimpa dari sini.
    const escBaruSaja = () =>
      escSejak.current > 0 && Date.now() - escSejak.current < MASA_TOMBOL_LEPAS;

    const onUbah = () => {
      const aktif = elemenLayarPenuh() !== null;

      // Layar penuh terpasang lagi: apa pun yang tadi melepasnya sudah selesai.
      if (aktif) {
        papanKetikMenelan.current = false;
        pemulihanBerjalan.current = false;
        lepasSengaja.current = false;
        if (!pratinjau) tandaiPapanKetik(attemptId, false);
        // Layar penuh menyala SELAGI soal isian singkat terpampang — biasanya
        // karena peserta baru saja melewati gerbang. Di peramban yang melarang
        // mengetik di layar penuh, membiarkannya berarti menunggu panel sistem
        // muncul pada ketukan pertama; jadi dilepas lagi sekarang juga.
        if (hindariLayarPenuh()) window.setTimeout(() => lepasUntukMengetik(), 0);
      }

      // Lepasan yang DIMINTA HALAMAN INI SENDIRI supaya peserta bisa mengetik.
      // Tidak ada yang perlu dicatat dan tidak ada gerbang yang perlu muncul:
      // yang melepasnya aplikasi, bukan peserta.
      if (!aktif && lepasSengaja.current) {
        lepasSengaja.current = false;
        papanKetikMenelan.current = true;
        if (!pratinjau) tandaiPapanKetik(attemptId, true);
        beriSiaga();
        return;
      }

      // PAPAN KETIK LAYAR — lepasan yang bukan perbuatan siapa pun.
      //
      // Di iPad, mode layar penuh lepas sendiri pada detik papan ketik layar
      // naik untuk kolom isian singkat. Sebelum ini akibatnya dua-duanya
      // menyakitkan: sebuah pelanggaran `keluar_layar_penuh` tercatat atas
      // nama peserta yang cuma mengetik jawabannya, DAN gerbang layar penuh
      // menutupi soal sehingga jawaban itu tidak pernah bisa selesai diketik.
      //
      // Tiga syarat digabung supaya pemaafan ini tidak bisa dipakai
      // bersembunyi:
      //
      //   · kolom isian singkat memang sedang/baru saja dipegang papan ketik;
      //   · ESC atau F11 TIDAK ditekan sesaat sebelumnya — peserta yang
      //     menekannya sendiri tetap tercatat seperti biasa, termasuk di
      //     laptop yang kursornya kebetulan ada di kolom isian;
      //   · perangkatnya memang punya Fullscreen API, jadi layar penuh semu
      //     iPhone tidak ikut lewat sini.
      //
      // Yang TIDAK ikut dimaafkan, dan ini yang menjaga pemaafan ini tetap
      // sempit: seluruh penjagaan lain berjalan penuh selama jendela ini —
      // pindah tab, hilang fokus, ALT+TAB, dan denyut semuanya tetap hidup.
      // Yang dibungkam hanya catatan lepasnya layar penuh itu sendiri.
      if (!aktif && sedangMengetik() && !escBaruSaja() && adaApiLayarPenuh()) {
        papanKetikMenelan.current = true;
        // Penanda yang BERTAHAN melewati pemasangan ulang komponen: tanpa ini,
        // ganti subtes selagi papan ketik masih menelan layar penuh melahirkan
        // gerbang perdana "Masuk Layar Penuh & Mulai" di tengah ujian.
        if (!pratinjau) tandaiPapanKetik(attemptId, true);
        // `setLayarPenuh(false)` SENGAJA tidak dipanggil: gerbang tidak boleh
        // menutupi soal selagi peserta mengetik jawabannya.
        beriSiaga();
        return;
      }

      // Keputusan diambil SEBELUM `beriSiaga()` di bawah. Dulu urutannya
      // terbalik dan `bolehLapor()` tidak dipakai sama sekali di sini —
      // penjaga layar penuh menjadi satu-satunya yang melompati masa siaga,
      // padahal transisi layar penuhlah yang paling banyak menghasilkan
      // guncangan yang masa siaga itu dibuat untuk menyerapnya.
      const bolehLaporkan = !aktif && bolehLapor();
      // Sebagian ponsel menolak menahan layar penuh pada detik-detik pertama:
      // mode itu lepas sendiri karena notifikasi, putaran layar, atau isyarat
      // navigasi. Lepasan yang datang secepat itu sesudah mode menyala adalah
      // ulah perangkat, bukan peserta yang membuka jendela di sebelahnya.
      const ulahPerangkat =
        layarPenuhSejak.current > 0 &&
        Date.now() - layarPenuhSejak.current < MASA_SETELAH_LAYAR_PENUH;

      if (aktif) layarPenuhSejak.current = Date.now();
      setLayarPenuh(aktif);
      beriSiaga();

      // Keluar dari layar penuh setelah ujian berjalan.
      //
      // SIAPA yang melepasnya menentukan akibatnya, dan itu disimpulkan dari
      // perangkatnya — bukan dari niat yang tidak bisa dilihat peramban:
      //
      //  · Peramban komputer: layar penuh di sana tidak punya cara lepas selain
      //    tombol yang ditekan seseorang. Menggugurkan (permintaan pengelola
      //    8 September 2026).
      //  · Ponsel dan tablet: notifikasi, putaran layar, dan isyarat navigasi
      //    melepas layar penuh tanpa disentuh siapa pun. DICATAT SAJA, seperti
      //    aturan 7 September 2026 — dan itu berlaku BAHKAN bila tombol ESC-nya
      //    yang menekan, karena pengelola menetapkan aturan ESC khusus
      //    komputer/laptop (8 September 2026) dan tata tertib yang dibaca
      //    peserta menjanjikan hal yang sama.
      //
      // HARGANYA, dan ini disengaja: laptop 2-in-1 yang sedang dilipat menjadi
      // tablet terbaca sebagai perangkat sentuh, sehingga ESC di sana hanya
      // dicatat. Yang menutup celah itu bukan ESC melainkan ALT+TAB, yang
      // berlaku di semua perangkat — dan `blur_window` bila ia benar-benar
      // membuka jendela lain di samping soal.
      if (bolehLaporkan && !ulahPerangkat) {
        void kirimRef.current();
        void bukaPelanggaran(perambanKomputer() ? "esc_layar_penuh" : "keluar_layar_penuh");
      }
    };
    // Kolom isian singkat diawasi dari tingkat dokumen, bukan dari KartuSoal:
    // penjagaan layar penuh tidak perlu bocor ke komponen soal, dan kolom baru
    // yang muncul saat berpindah nomor ikut terpantau tanpa tambahan apa pun.
    const onFokusMasuk = (e: FocusEvent) => {
      if (!diKolomTeks(e.target)) return;
      isianTerakhir.current = Date.now();
      // Papan ketik naik sebentar lagi, dan di iPad itu melepas layar penuh.
      // Masa siaga diberikan lebih dulu supaya guncangannya tidak dilaporkan.
      beriSiaga();
    };

    const onFokusKeluar = (e: FocusEvent) => {
      if (!diKolomTeks(e.target)) return;
      isianTerakhir.current = Date.now();
      beriSiaga();
      pulihkanLayarPenuh();
    };

    /**
     * Ketukan PADA kolom isian singkat, dicatat sebelum fokusnya berpindah.
     *
     * Urutan peristiwa saat papan ketik naik tidak sama di semua peramban:
     * sebagian melepas mode layar penuh pada detik ketukan, sebelum `focusin`
     * kolomnya sempat terpancar. Tanpa penanda ini, lepasan yang datang lebih
     * dulu itu lolos dari pemaafan dan gerbang tetap menutupi soal — persis
     * keluhan yang hendak diperbaiki.
     */
    const onSentuhKolom = (e: Event) => {
      if (!diKolomTeks(e.target)) return;
      isianTerakhir.current = Date.now();
      beriSiaga();
      // Jaring pengaman: kalau karena satu dan lain hal halaman masih berada di
      // layar penuh saat kolom disentuh, lepaskan sekarang juga. Jalur utamanya
      // tetap `lepasUntukMengetik` saat soalnya terpampang — yang ini hanya
      // menutup celah, bukan menggantikannya.
      lepasUntukMengetik();
    };

    /**
     * Sentuhan pertama sesudah mengetik: kesempatan sah memasang layar penuh
     * kembali. Permintaan yang lahir dari sentuhan tidak pernah ditolak
     * peramban, jadi inilah jalur yang benar-benar bisa diandalkan.
     *
     * Kolom isian sengaja dilewati — memasang layar penuh tepat saat peserta
     * mengetuk kolomnya hanya akan menurunkan papan ketiknya lagi.
     */
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
    attemptId,
    beriSiaga,
    bolehLapor,
    bukaPelanggaran,
    hindariLayarPenuh,
    lepasUntukMengetik,
    pratinjau,
    pulihkanLayarPenuh,
    sedangMengetik,
  ]);

  /* ---- meninggalkan halaman ---- */

  useEffect(() => {
    /**
     * ALT+TAB: jejaknya, bukan tombolnya.
     *
     * Sistem operasi menelan kombinasi itu sebelum peramban melihatnya —
     * Windows dan macOS menukar jendela sendiri — sehingga TAB tidak pernah
     * sampai ke halaman dan `keyup` ALT-nya pun tidak, karena jendelanya
     * telanjur berpindah. Yang tertinggal cuma satu bentuk yang khas: ALT
     * ditekan, lalu sepersekian detik kemudian fokus hilang tanpa ALT pernah
     * dilepas. Tidak ada gangguan perangkat yang berbentuk seperti itu.
     */
    const altTabBaruSaja = () =>
      altSejak.current > 0 && Date.now() - altSejak.current < MASA_ALT_TAB;

    /**
     * Melaporkan ALT+TAB SEKARANG JUGA, tanpa menunggu masa pemastian fokus.
     *
     * Masa tiga detik itu ada untuk menyaring kedipan fokus yang bukan
     * perbuatan siapa-siapa. Di sini perbuatannya sudah terbukti dari tombol
     * yang ditekan, jadi menunggu hanya memberi kesempatan kembali sebelum
     * tertangkap. Mengembalikan true bila laporannya jadi dikirim, supaya
     * pemanggilnya tahu tidak perlu melapor lagi dengan jenis lain.
     */
    const laporAltTab = () => {
      if (!altTabBaruSaja()) return false;
      if (altTabDilaporkan.current) return true; // satu kepergian, satu laporan
      if (!bolehLapor()) return false;
      altTabDilaporkan.current = true;
      void kirimRef.current();
      void bukaPelanggaran("alt_tab");
      return true;
    };

    // Pindah tab / minimize: tanpa toleransi.
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        if (!bolehLapor()) return;
        if (laporAltTab()) return;
        void kirimRef.current(); // amankan jawaban sebelum peserta pergi
        void bukaPelanggaran("keluar_tab");
      } else {
        void tutupPelanggaran();
      }
    };

    /**
     * Papan ketik: dua tombol yang sejak 8 September 2026 menggugurkan.
     *
     * Keduanya sengaja TIDAK dicegah (`preventDefault`) — peramban tidak
     * mengizinkan halaman menahan ESC yang melepas layar penuh, dan ALT+TAB
     * bahkan tidak pernah sampai ke halaman. Yang bisa dilakukan hanya
     * mencatat, dan itu memang cukup.
     */
    /**
     * Potret layar. Dilaporkan dari `keydown` MAUPUN `keyup`, karena Chrome dan
     * Edge di Windows hanya memancarkan `keyup` untuk PrintScreen — tombolnya
     * ditelan sistem sebelum `keydown` sempat sampai. Penanda `tangkapDilaporkan`
     * menjaga supaya satu tekanan tidak menghasilkan dua laporan.
     */
    const laporTangkapLayar = (e: KeyboardEvent) => {
      const pintasan = pintasanTangkapLayar(e);
      if (!pintasan) return false;
      // Sebagian pintasan memang bisa dicegah (alat potret Firefox); yang
      // dikerjakan sistem operasi tidak. Mencegahnya tetap dicoba karena yang
      // berhasil dicegah berarti soalnya tidak jadi terpotret sama sekali.
      e.preventDefault();
      if (!bolehLapor()) return false;
      if (tangkapDilaporkan.current) return true;
      tangkapDilaporkan.current = true;
      void kirimRef.current();
      void bukaPelanggaran("tangkap_layar");
      return true;
    };

    const onTombolTurun = (e: KeyboardEvent) => {
      if (laporTangkapLayar(e)) return;
      // ESC dan F11 ditandai waktunya — DAN HANYA ITU. Penanda ini tidak
      // pernah menghasilkan pelanggaran, tidak pernah menaikkan jenisnya, dan
      // tidak pernah menyentuh peserta tablet berpapan ketik: satu-satunya
      // pembacanya adalah pemaafan papan ketik layar di `fullscreenchange`,
      // yang memakainya untuk MENOLAK memaafkan lepasan layar penuh yang
      // ternyata memang berasal dari tombol. Lihat catatan di ujung fungsi ini
      // tentang mengapa akibat lepasnya layar penuh tetap ditentukan
      // perangkatnya, bukan tombolnya.
      if (pelepasLayarPenuhDitekan(e)) escSejak.current = Date.now();
      // Command dihitung di Mac, iPad, dan iPhone — di sanalah Command+Tab
      // berpindah jendela. Di Windows dan Linux tombol yang melaporkan
      // `metaKey` adalah tombol Windows/Super: menekannya membuka menu Mulai,
      // BUKAN berpindah jendela. Menghitungnya di sana akan menggugurkan
      // peserta dengan kalimat yang menuduhnya menekan ALT+TAB, padahal tidak.
      // Kepergian sungguhan sesudah menu Mulai terbuka tetap tertangkap
      // `blur_window` seperti biasa.
      const meta = commandPindahJendela() && (e.key === "Meta" || e.metaKey);
      const modifier = e.key === "Alt" || e.key === "Meta";

      // HANYA MODIFIER TELANJANG yang menandai, dan kombinasi apa pun justru
      // MEMBERSIHKAN penandanya. Inilah yang memisahkan "berpindah jendela"
      // dari "mengetik jalan pintas":
      //
      //   ALT+TAB  → halaman cuma melihat keydown ALT; TAB-nya ditelan sistem.
      //   Cmd+C    → halaman melihat keydown Meta LALU keydown "c" ber-metaKey.
      //
      // Tanpa pembersihan itu, peserta iPad yang menekan Cmd+C (yang memang
      // sudah diblokir dan dicatat sebagai percobaan menyalin) lalu layarnya
      // tersembunyi dalam dua detik akan digugurkan sebagai Command+Tab —
      // tuduhan yang tidak pernah ia lakukan.
      if (modifier && (e.key === "Alt" ? true : meta)) {
        altSejak.current = Date.now();
      } else if (!modifier && (e.altKey || e.metaKey)) {
        altSejak.current = 0;
      }

      // Sebagian pengelola jendela (Linux, Android/DeX, iPadOS, dan Windows
      // saat penukaran jendela gagal) tetap meneruskan TAB-nya ke halaman.
      // Kalau itu terjadi, tidak perlu menunggu fokus hilang: buktinya sudah
      // utuh di sini.
      if (e.key === "Tab" && (e.altKey || meta)) {
        if (!bolehLapor()) return;
        altSejak.current = Date.now();
        laporAltTab();
        return;
      }
      // ESC sengaja TIDAK MENJADI PELANGGARAN di sini — penandaan waktunya di
      // atas hanya membatalkan pemaafan papan ketik layar, tidak lebih. Yang
      // memutuskan akibat lepasnya
      // layar penuh tetap hanyalah PERANGKATNYA (lihat `fullscreenchange` di atas):
      // di komputer menggugurkan, di ponsel dan tablet dicatat saja — bahkan
      // bila tombol ESC-nya yang menekan. Menambahkan jejak tombol di sini akan
      // diam-diam menggugurkan pengguna tablet berpapan ketik, padahal tata
      // tertib yang mereka baca menjanjikan aturan ESC khusus komputer/laptop.
    };

    const onTombolNaik = (e: KeyboardEvent) => {
      // PrintScreen di Chrome/Edge Windows HANYA sampai lewat keyup.
      if (laporTangkapLayar(e)) return;
      if (e.key === "Alt" || e.key === "Meta") altSejak.current = 0;
    };


    /**
     * Kehilangan fokus SELAGI HALAMAN MASIH TERLIHAT adalah sinyal yang paling
     * berisik dari semuanya, dan dulu ia langsung mengakhiri ujian 195 menit.
     * Notifikasi sistem, papan ketik yang muncul untuk isian singkat, menu
     * bawaan peramban, chip izin, dan animasi bilah alamat Safari semuanya
     * mencuri fokus sepersekian detik lalu mengembalikannya.
     *
     * Karena itu laporannya ditahan dulu: kalau fokus pulih sebelum
     * {@link MASA_PASTIKAN_FOKUS}, tidak ada yang dilaporkan. Yang benar-benar
     * pindah ke jendela lain masih kehilangan fokus jauh lebih lama daripada
     * itu, jadi penjagaannya tidak berkurang — yang hilang cuma salah tangkapnya.
     *
     * Halaman yang sungguh-sungguh disembunyikan tidak lewat sini sama sekali;
     * `onVis` dan `onPergi` di bawah tetap melaporkannya seketika.
     */
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
      // Jawaban diamankan SEKARANG, bukan sesudah tenggat: kalau peserta memang
      // pergi, menunda laporan tidak boleh ikut menunda penyimpanan.
      void kirimRef.current();
      jamPastikan = window.setTimeout(() => {
        jamPastikan = null;
        if (!bolehLapor()) return;
        // Fokus sudah pulih — kutu peramban, bukan kepergian.
        if (document.hasFocus()) return;
        // Halaman sudah tersembunyi — itu urusan `onVis`, yang lebih tegas.
        if (document.visibilityState !== "visible") return;
        void bukaPelanggaran("blur_window");
      }, MASA_PASTIKAN_FOKUS);
    };

    // Jendela kehilangan fokus: peserta mengeklik jendela peramban lain,
    // peramban kedua, aplikasi lain, atau bilah tugas.
    const onBlur = () => {
      if (document.visibilityState === "hidden") return;
      // ALT+TAB lebih dulu: buktinya sudah lengkap, jadi tidak ada yang perlu
      // dipastikan selama tiga detik.
      if (laporAltTab()) return;
      pastikanHilangFokus();
    };
    const onFocus = () => {
      lupakanPastikan();
      // Fokus kembali berarti ALT sudah tidak mungkin masih tertekan: `keyup`
      // ALT-nya hilang bersama perpindahan jendela tadi, jadi kalau penandanya
      // tidak dibersihkan di sini, kepergian berikutnya — apa pun sebabnya —
      // akan ikut terbaca sebagai ALT+TAB.
      altSejak.current = 0;
      altTabDilaporkan.current = false;
      void tutupPelanggaran();
    };

    // iPhone: `pagehide` adalah sinyal kepergian yang paling andal di WebKit.
    // Ia terpancar saat peserta berpindah aplikasi, berpindah tab Safari, dan
    // saat layar terkunci — termasuk pada keadaan ketika `visibilitychange`
    // datang terlambat dan `blur` tidak pernah datang sama sekali. Karena
    // penjagaan sudah dimatikan lebih dulu di `tutupSubtes`, menutup subtes
    // secara wajar tidak ikut tertangkap di sini.
    const onPergi = () => {
      if (!bolehLapor()) return;
      if (laporAltTab()) return;
      void kirimRef.current();
      void bukaPelanggaran("keluar_tab");
    };

    // Jaring pengaman: sebagian peramban tidak selalu memancarkan `blur`
    // ketika fokus berpindah ke jendela lain di layar yang sama.
    //
    // Catatan iPhone: di WebKit seluler jaring ini TIDAK PERNAH menyala —
    // `document.hasFocus()` di sana tetap `true` selama tab ini tab aktif,
    // sekalipun Safari sudah berada di latar belakang. Penjagaan iPhone
    // bertumpu pada `visibilitychange`, `pagehide`, dan denyut nadi di bawah.
    const jam = window.setInterval(() => {
      if (!bolehLapor()) return;
      if (document.visibilityState !== "visible") return;
      // Satu cuplikan `hasFocus()` yang bernilai false dulu langsung
      // menggugurkan. Sekarang ia hanya MEMBUKA masa pemastian, dan cuplikan
      // yang masih false pada akhir masa itulah yang dilaporkan.
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

  /**
   * Selama penjagaan menyala, halaman wajib membuktikan dirinya masih di depan
   * peserta. Bukan kepergian yang dilaporkan, melainkan kehadiran — karena
   * laporan bisa mati bersama halamannya, sedangkan diam tidak bisa dipalsukan
   * menjadi hadir. Server yang mengukur jaraknya; lihat `/api/exam/denyut`.
   */
  // Dulu ini hitungan mundur menuju gugur. Sejak hilangnya denyut tidak lagi
  // menggugurkan, yang perlu diketahui peserta hanya satu: sambungannya sedang
  // putus, jadi jawaban terakhirnya belum tentu tersimpan.
  const [sambunganPutus, setSambunganPutus] = useState(false);
  // Diisi saat efeknya dipasang, bukan saat render — `Date.now()` di badan
  // komponen membuat hasil render bergantung pada jam.
  const denyutTerakhir = useRef(0);

  useEffect(() => {
    // Pratinjau tidak berdenyut: tidak ada attempt yang bisa digugurkan, dan
    // denyut atas nama attempt palsu hanya akan mengotori tabelnya.
    if (pratinjau) return;
    denyutTerakhir.current = Date.now();
    let hidup = true;
    let mula = true;
    let jam: number | null = null;
    // Bukti yang dibawa denyut berikutnya bila yang sekarang tidak sampai.
    // Keduanya disetel ulang setiap kali satu denyut berhasil.
    let terlihat = document.visibilityState === "visible";
    let percobaan = 0;
    // Bukti kedua, untuk jeda yang lahir dari halaman yang DIBEKUKAN peramban
    // selagi peserta mengetik — lihat `mengetik` di rute denyut. Sekali menyala
    // ia bertahan sampai ada denyut yang benar-benar sampai, karena keadaan
    // yang perlu dijelaskan adalah keadaan SEPANJANG jeda, bukan keadaan pada
    // detik denyut yang berhasil.
    let mengetik = false;

    const jadwal = (ms: number) => {
      if (!hidup) return;
      if (jam !== null) window.clearTimeout(jam);
      jam = window.setTimeout(() => void denyut(), ms);
    };

    const denyut = async () => {
      if (!hidup || gugurRef.current) return;
      percobaan += 1;
      const diKolom = kolomTeksAktif() || soalIsianTampil.current;
      mengetik = mengetik || diKolom;
      try {
        const res = await fetch("/api/exam/denyut", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId,
            aktif: dipantau.current,
            mula,
            subtes: subtesRef.current,
            terlihat,
            percobaan,
            mengetik,
          }),
          // Tanpa batas waktu, SATU permintaan yang menggantung menghentikan
          // seluruh denyut — `jadwal()` di bawah baru dipanggil sesudah
          // permintaan ini selesai. Peramban sendiri baru menyerah setelah
          // puluhan detik, jauh melewati ambang, sehingga server melihat
          // halaman yang diam dan menggugurkan peserta yang sebenarnya sedang
          // duduk menatap soal. Inilah sebab tunggal terbesar peserta gugur
          // tanpa berbuat salah pada tryout 4-6 September 2026.
          signal: AbortSignal.timeout(BATAS_DENYUT_MS),
        });
        const data = (await res.json()) as { digugurkan?: boolean; pesan?: string };
        mula = false;
        denyutTerakhir.current = Date.now();
        terlihat = document.visibilityState === "visible";
        percobaan = 0;
        mengetik = diKolom;
        setSambunganPutus(false);
        if (data.digugurkan) {
          nyatakanGugur(data.pesan ?? null);
          return;
        }
        jadwal(JEDA_DENYUT);
      } catch {
        // Denyut yang gagal terkirim bukan pelanggaran, dan sejak 7 September
        // 2026 ia juga tidak lagi menggugurkan. Peserta tetap diberi tahu karena
        // sambungan yang putus berarti jawaban terakhirnya belum tentu sampai.
        // Percobaan ulang dipercepat supaya gangguan sekejap tidak menumpuk.
        const lewat = (Date.now() - denyutTerakhir.current) / 1000;
        setSambunganPutus(lewat > 6);
        jadwal(JEDA_COBA_DENYUT);
      }
    };

    // Begitu halaman pernah disembunyikan, denyut berikutnya tidak boleh lagi
    // mengaku "saya terlihat sepanjang waktu". Penandanya baru bersih lagi
    // sesudah ada denyut yang benar-benar sampai.
    const onSembunyi = () => {
      if (document.visibilityState !== "visible") terlihat = false;
    };
    document.addEventListener("visibilitychange", onSembunyi);

    void denyut();

    // Kembali dari balik layar: berdenyut SEKARANG, jangan menunggu giliran
    // berikutnya. Inilah kesempatan pertama server mengetahui halaman sempat
    // mati — dan peserta belum sempat memuat ulang untuk menghapus jejaknya.
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
  }, [attemptId, nyatakanGugur, pratinjau]);

  /**
   * Kolom isian singkat jangan tertimbun papan ketik layar.
   *
   * Isinya dipindahkan ke `pasangKolomKeTengah()` di `penjagaan-peramban.ts`
   * pada 11 September 2026 supaya ruang ujian IELTS memakai perilaku yang SAMA
   * PERSIS, bukan salinannya. Alasan teknisnya lengkap di sana.
   */
  useEffect(() => {
    if (!tanpaApiLayarPenuh) return;
    return pasangKolomKeTengah();
  }, [tanpaApiLayarPenuh]);

  /* ---------------- layar jangan mengunci sendiri ---------------- */

  /**
   * Layar ponsel yang mengunci sendiri memancarkan `visibilitychange → hidden`,
   * dan itu ditangani persis seperti peserta yang pindah aplikasi: gugur
   * seketika. Peserta yang membaca satu bacaan panjang PU tanpa menyentuh layar
   * selama satu menit karena itu bisa kehilangan ujiannya tanpa berbuat apa pun.
   *
   * Screen Wake Lock menahan layar tetap menyala selama ruang ujian terbuka.
   * Sistem melepas kuncinya sendiri setiap kali halaman disembunyikan, jadi ia
   * harus diminta ulang setiap kali halaman kembali terlihat.
   *
   * DI IPHONE INI MENJADI PENCEGAHAN YANG PENTING, bukan sekadar kenyamanan.
   * Di sana tidak ada Fullscreen API, sehingga halaman yang disembunyikan
   * SELALU menggugurkan -- termasuk bila layarnya padam. Menahan layar tetap
   * menyala adalah cara menjauhkan peserta dari kejadian itu sejak awal.
   *
   * Peramban yang menolak (iOS di bawah 16.4, mode hemat baterai) tidak
   * menggagalkan apa pun di sini; peserta itu hanya kehilangan pencegahannya,
   * dan pengawas memulihkannya lewat tombol "Dibuka" bila sampai terjadi.
   */
  useEffect(() => {
    if (pratinjau) return;
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
        // Ditolak peramban (baterai lemah, iOS di bawah 16.4). Penandanya tetap
        // mati, dan peserta itu kembali ke aturan lama: kepergiannya hanya
        // dicatat. Lebih baik melewatkan satu kecurangan daripada menggugurkan
        // peserta yang layarnya memang meredup sendiri di luar kendalinya.
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
  }, [pratinjau]);

  /* ---------------- penghalang penyalinan soal ---------------- */

  const lastLapor = useRef<Record<string, number>>({});

  const laporCurang = useCallback(
    (
      jenis: "salin" | "klik_kanan" | "pintasan" | "tekan_tahan" | "lewat_safari",
      keterangan: string,
      tampil: string | null,
    ) => {
      if (tampil) {
        setPesanCurang(tampil);
        setCatatanCurang((n) => n + 1);
      }

      // Pratinjau tetap MEMBLOKIR salin/klik kanan/jalan pintas dan tetap
      // memunculkan peringatannya — itu bagian dari tampilan yang perlu dilihat
      // admin — hanya catatannya yang tidak dikirim ke laporan pengawas.
      if (pratinjau) return;

      const kini = Date.now();
      if (kini - (lastLapor.current[jenis] ?? 0) < JEDA_LAPOR_CURANG) return;
      lastLapor.current[jenis] = kini;

      void fetch("/api/exam/violation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
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
    [attemptId, pratinjau],
  );

  useEffect(() => {
    const onSalin = (e: ClipboardEvent) => {
      if (diKolomIsian(e.target)) return;
      e.preventDefault();
      laporCurang("salin", "copy/cut", "Menyalin soal tidak diizinkan. Percobaan ini dicatat.");
    };
    const onKlikKanan = (e: MouseEvent) => {
      e.preventDefault();
      laporCurang("klik_kanan", "contextmenu", "Klik kanan dimatikan selama ujian.");
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
      laporCurang("pintasan", p, `Jalan pintas ${p} dimatikan selama ujian.`);
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
   * Tekan-tahan iOS.
   *
   * Di iPhone, menekan-tahan soal atau gambar soal memunculkan menu sistem
   * berisi Salin, Bagikan, dan Look Up — semuanya jalan keluar soal yang tidak
   * menyembunyikan halaman, sehingga tidak satu pun penjagaan lain menangkapnya.
   * Peristiwa `contextmenu` yang dipakai untuk memblokir klik kanan di laptop
   * TIDAK terpancar di sana; yang mematikan menu itu adalah `-webkit-touch-callout`
   * di `globals.css`. Bagian ini melengkapi sisanya: menahan lama dicatat
   * sebagai bukti niat, tanpa menggugurkan dan tanpa mengganggu gulir — jari
   * yang bergeser lebih dari beberapa piksel dianggap sedang menggulung.
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
          "Menekan-tahan soal tidak diizinkan. Percobaan ini dicatat.",
        );
      }, TEKAN_TAHAN);
    };

    const onGeser = (e: TouchEvent) => {
      if (jam === null || e.touches.length === 0) return;
      const t = e.touches[0];
      if (Math.abs(t.clientX - mulaX) > GESER_TOLERANSI || Math.abs(t.clientY - mulaY) > GESER_TOLERANSI) {
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

  // Pesan penghalang penyalinan hilang sendiri setelah beberapa detik.
  useEffect(
    () => () => {
      dipantau.current = false;
      // Pindah subtes MEMPERTAHANKAN layar penuh — lihat `pindahSubtes`.
      // Keluar di sini akan memunculkan gerbang lagi pada subtes berikutnya.
      if (!pindahSubtes.current) keluarLayarPenuh();
    },
    [],
  );

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

  /* ---------------- penutupan subtes ---------------- */

  const sedangMenutup = useRef(false);

  const tutupSubtes = useCallback(async () => {
    if (gugurRef.current) return; // ujian sudah dikunci
    if (sedangMenutup.current) return;
    sedangMenutup.current = true;
    // Subtes berikutnya memasang ulang ruang ujian, dan ruang yang baru hanya
    // bebas dari gerbang bila layar penuhnya memang terpasang. Ketukan tombol
    // inilah kesempatan sah terakhir memasangnya kembali sesudah papan ketik
    // sempat menelannya — karena itu dipaksa, melewati penjaga soal isian.
    pulihkanLayarPenuh(true);
    // Penjagaan dimatikan lebih dulu: keluar layar penuh sesudah ini adalah
    // bagian dari menutup ujian, bukan pelanggaran.
    dipantau.current = false;
    // Denyut nadi ikut dibongkar dengan sengaja, supaya jeda sepanjang apa pun
    // sesudah ini tidak terbaca sebagai kepergian. Dikirim lewat beacon karena
    // halaman ini sebentar lagi berpindah.
    if (!pratinjau) laporTahanBeku("/api/exam/denyut", { attemptId, aktif: false, subtes });
    setMemproses(true);
    setDialog(false);
    setPesan(null);

    await kirimRef.current();
    try {
      const hasil = await aksiSelesaiSubtes(attemptId, subtes);
      if (hasil.status === "selesai") {
        // Ujiannya memang habis: sekarang barulah layar penuh dilepas dan
        // penandanya dibuang, supaya peserta tidak terkunci di layar penuh
        // saat membaca hasilnya.
        if (!pratinjau) {
          tandaiGerbang(attemptId, false);
          tandaiPapanKetik(attemptId, false);
        }
        keluarLayarPenuh();
        router.replace(`/hasil/${hasil.attemptId}`);
        return;
      }
      if (hasil.status === "gagal") {
        // Gagal menutup subtes berarti peserta TETAP di halaman ini.
        // Penjagaan dinyalakan lagi, kalau tidak sisa subtesnya berjalan
        // tanpa penjagaan sama sekali.
        setPesan(hasil.pesan);
        dipantau.current = !pratinjau;
        beriSiaga();
        sedangMenutup.current = false;
        setMemproses(false);
        return;
      }
      // Pratinjau: subtes berikutnya disiapkan komponen induknya di klien, jadi
      // tidak ada yang perlu diambil ulang dari server.
      // Lanjut ke subtes berikutnya. Penanda ini membuat pembongkaran
      // komponen TIDAK keluar dari layar penuh, jadi gerbangnya tidak muncul.
      pindahSubtes.current = true;
      if (!pratinjau) router.refresh();
    } catch {
      setPesan("Koneksi terputus. Coba lagi sebentar.");
      sedangMenutup.current = false;
      setMemproses(false);
    }
  }, [aksiSelesaiSubtes, attemptId, beriSiaga, pratinjau, pulihkanLayarPenuh, router, subtes]);

  /**
   * Peserta iPhone memilih mengerjakan dari Safari biasa, bukan dari ikon Layar
   * Utama. Tidak dilarang — menahan siswa di gerbang pada hari-H jauh lebih
   * merugikan daripada bilah alamat yang masih terlihat — tetapi dicatat, supaya
   * pengawas tahu siapa yang tombol muat ulang dan daftar tabnya tetap sejauh
   * satu ketukan.
   */
  const mulaiLewatSafari = useCallback(() => {
    laporCurang("lewat_safari", "mulai dari Safari, bukan ikon Layar Utama", null);
    void masukLayarPenuh();
  }, [laporCurang, masukLayarPenuh]);

  const onHabis = useCallback(() => {
    void tutupSubtes();
  }, [tutupSubtes]);

  const onTidakSinkron = useCallback(() => {
    if (gugurRef.current) return;
    router.refresh();
  }, [router]);

  /* ---------------- turunan ---------------- */

  const kosong = useMemo(
    () => soal.filter((s) => statusNomor(s, jawaban, ragu) === "kosong").length,
    [soal, jawaban, ragu],
  );
  const raguTersisa = useMemo(
    () => soal.filter((s) => statusNomor(s, jawaban, ragu) === "ragu").length,
    [soal, jawaban, ragu],
  );

  // Bacaan literasi dipakai beberapa soal berturut-turut dan disimpan ulang di
  // tiap butir. Rentangnya dihitung dari daftar soal yang sudah ada, jadi tidak
  // perlu kolom baru di basis data dan naskah lama ikut terbaca.
  const rentangBacaan = useMemo(() => petaRentangBacaan(soal), [soal]);

  // Di layar penuh semu yang menggulung adalah <main>, bukan jendela.
  const gulungRef = useRef<HTMLElement | null>(null);

  const pilihNomor = useCallback((i: number) => {
    setIndeks(i);
    setDrawer(false);
    if (typeof window === "undefined") return;
    const kotak = gulungRef.current;
    if (kotak && kotak.scrollTop > 0) kotak.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const panel = (
    <PanelNomor soal={soal} jawaban={jawaban} ragu={ragu} aktif={indeks} onPilih={pilihNomor} />
  );

  // Ujian digugurkan: seluruh ruang ujian diganti layar penguncian, sehingga
  // timer, autosave, dan tombol-tombolnya ikut berhenti karena tidak dirender.
  if (gugur !== null) {
    return <LayarGagal pesan={gugur} namaPaket={namaPaket} />;
  }

  return (
    <div
      className={`ruang-ujian flex select-none flex-col bg-background ${
        // iPhone: tidak ada layar penuh sungguhan, jadi ruang ujian dikunci
        // setinggi viewport yang terlihat supaya tidak ada yang terpotong.
        tanpaApiLayarPenuh ? "ruang-semu" : "min-h-dvh"
      }`}
    >
      {/* ---------- Header ujian ---------- */}
      <header className="aman-atas sticky top-0 z-30 shrink-0 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2.5 sm:px-4">
          {/* Foto + NISN sengaja berdampingan: inilah yang dibaca peserta untuk
              memastikan akun yang sedang dipakai memang miliknya, bukan milik
              teman yang tadi memakai perangkat yang sama. */}
          <div className="flex min-w-0 items-center gap-2.5">
            <FotoPeserta nama={namaPeserta} foto={fotoPeserta} ukuran={38} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight">{namaPeserta}</p>
              <p className="truncate text-xs text-muted">
                {nisnPeserta ? (
                  <>
                    <span className="font-semibold tabular-nums">NISN {nisnPeserta}</span>
                    <span className="mx-1.5">·</span>
                  </>
                ) : null}
                {namaPaket}
              </p>
            </div>
          </div>

          <div className="order-3 w-full sm:order-none sm:w-auto sm:flex-1 sm:text-center">
            <p className="truncate text-sm font-extrabold text-brand">{namaSubtesAktif}</p>
            <p className="text-xs text-muted">
              {sesiTunggal
                ? `Satu sesi · ${soal.length} soal`
                : `Subtes ${urutanKe} dari ${totalSubtes} · ${soal.length} soal`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`hidden text-xs font-semibold sm:inline ${
                status === "gagal" ? "text-danger" : status === "menyimpan" ? "text-muted" : "text-success"
              }`}
              aria-live="polite"
            >
              {TEKS_SIMPAN[status]}
            </span>
            {/* Tombol penutup sengaja DI ATAS, jauh dari tombol navigasi di
                bawah layar. Saat masih berdampingan dengan "Sebelumnya" dan
                "Selanjutnya", ibu jari peserta terlalu mudah menekannya dan
                subtes tertutup sebelum waktunya — terlihat pada uji coba
                pengelola, 7 September 2026. */}
            <button
              type="button"
              className="btn btn-danger !px-3 !py-1.5 text-xs sm:text-sm"
              onClick={() => setDialog(true)}
              disabled={terkunci}
            >
              {sesiTunggal ? "Selesaikan Ujian" : "Selesaikan Subtes"}
            </button>
            <TimerUjian
              key={subtes}
              attemptId={attemptId}
              subtes={subtes}
              sisaDetikAwal={sisaDetik}
              onHabis={onHabis}
              onTidakSinkron={onTidakSinkron}
              pratinjau={pratinjau}
            />
          </div>
        </div>
      </header>

      {pratinjau && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-warning bg-warning-soft px-3 py-2 text-center text-xs font-bold text-warning sm:px-4">
          <span>
            MODE PRATINJAU ADMIN · jawaban tidak disimpan, waktu tidak dicatat, dan tidak ada yang
            digugurkan. Bilah merah di bawah ini adalah yang dibaca peserta.
          </span>
          {onKeluarPratinjau && (
            <button
              type="button"
              className="shrink-0 rounded-lg bg-warning px-2.5 py-1 text-xs font-bold text-white"
              onClick={() => {
                keluarLayarPenuh();
                onKeluarPratinjau();
              }}
            >
              Keluar pratinjau
            </button>
          )}
        </div>
      )}

      {/* Isi bilah ini adalah PENCEGAHAN, bukan sekadar pemberitahuan. Peserta
          yang tahu ESC dan ALT+TAB menggugurkan tidak akan menekannya; peserta
          yang baru tahu sesudah layar GAGAL muncul hanya bisa menyesal. Karena
          itu kedua tombol disebut namanya di sini — larangan lama "jangan
          mengajari cara keluar layar penuh" berlaku ketika lepasnya layar
          penuh masih aman, dan sejak 8 September 2026 ia tidak aman lagi. */}

      {pesan && (
        <div className="border-b border-danger-soft bg-danger-soft px-3 py-2 text-center text-xs font-semibold text-danger sm:px-4">
          {pesan}
        </div>
      )}

      {/* Denyut nadi tidak sampai ke server. Peserta diberi tahu supaya sempat
          memperbaiki sambungannya — kalau tidak, ujiannya digugurkan oleh sebab
          yang bukan perbuatannya. */}
      {sambunganPutus && (
        <div
          role="alert"
          className="border-b border-warning-soft bg-warning-soft px-3 py-2 text-center text-xs font-semibold text-warning sm:px-4"
        >
          Sambungan ke server terputus — jawaban terakhirmu belum tentu tersimpan. Tetap di halaman
          ini dan pulihkan jaringanmu. Ujianmu <strong>tidak digugurkan</strong> karena gangguan
          sambungan.
        </div>
      )}

      {/* ---------- Isi ---------- */}
      <main
        ref={gulungRef}
        className="isi-gulung mx-auto w-full max-w-7xl flex-1 px-3 py-4 pb-28 sm:px-4 lg:pb-6"
      >
        {/* Bilah aturan hidup DI DALAM area gulung, bukan di atasnya.
            Di ruang semu (iPhone/iPad) area gulung punya tinggi tetap, sehingga
            bilah yang duduk di luarnya akan MERAMPAS 21% layar HP selamanya —
            terukur 177 dari 844 piksel pada 9 September 2026. Di komputer bilah
            ini memang selalu ikut menggulung bersama halaman; menaruhnya di
            sini membuat perilakunya sama di semua perangkat, dan peserta tetap
            membacanya lebih dulu karena ia elemen pertama yang tampil. */}
        <div className="mb-4 rounded-xl border border-danger-soft bg-danger-soft px-3 py-2 text-center text-xs font-semibold text-danger sm:px-4">
          ⚠ Ujian dipantau. Yang dinyatakan <strong>GAGAL</strong>: membuka jendela, aplikasi,
          atau peramban lain di samping halaman ujian; menekan <strong>ALT+TAB</strong>{" "}
          (Command+Tab) untuk berpindah jendela — di perangkat apa pun; menekan{" "}
          <strong>ESC</strong> sehingga keluar dari layar penuh, khusus di komputer/laptop;{" "}
          <strong>meninggalkan halaman ujian lebih dari {AMBANG_KEMBALI_DETIK} detik</strong>; dan{" "}
          <strong>menangkap layar (screenshot) soal</strong>. Keluar sebentar lalu langsung kembali
          tidak langsung menggugurkan, tetapi <strong>lamanya dijumlahkan</strong>: begitu seluruh
          kepergianmu mencapai {BUDGET_PERGI_DETIK} detik, ujian dihentikan. Sisa waktunya
          ditampilkan setiap kali kamu kembali.
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="min-w-0">
            {aktif ? (
              <KartuSoal
                key={aktif.id}
                soal={aktif}
                indeks={indeks}
                total={soal.length}
                nilai={jawaban[aktif.id] ?? null}
                ragu={ragu[aktif.id] ?? false}
                terkunci={terkunci}
                rentangBacaan={rentangBacaan[indeks] ?? null}
                onJawab={(v) => ubahJawaban(aktif.id, v)}
                onRagu={(v) => ubahRagu(aktif.id, v)}
              />
            ) : (
              <div className="card p-10 text-center">
                <p className="font-semibold">Soal untuk subtes ini belum tersedia.</p>
                <p className="mt-1 text-sm text-muted">
                  Silakan tekan &ldquo;Selesaikan Subtes&rdquo; untuk lanjut ke bagian berikutnya.
                </p>
              </div>
            )}

            {/* Navigasi bawah (layar besar) */}
            <div className="mt-5 hidden items-center justify-between gap-3 lg:flex">
              <button
                type="button"
                className="btn btn-ghost focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                onClick={() => pilihNomor(Math.max(0, indeks - 1))}
                disabled={indeks === 0 || terkunci}
              >
                ← Sebelumnya
              </button>
              <button
                type="button"
                className="btn btn-primary focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                onClick={() => pilihNomor(Math.min(soal.length - 1, indeks + 1))}
                disabled={indeks >= soal.length - 1 || terkunci}
              >
                Selanjutnya →
              </button>
            </div>
          </div>

          {/* Panel nomor (layar besar) */}
          <aside className="hidden lg:block">
            <div className="card sticky top-24 p-4">{panel}</div>
          </aside>
        </div>
      </main>

      {/* ---------- Bilah bawah (layar kecil) ---------- */}
      <div className="aman-bawah fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-2 pt-2 backdrop-blur lg:hidden">
        {/* Tinggal tiga tombol NAVIGASI saja, semuanya bernama lengkap. Tombol
            penutup subtes sengaja TIDAK ada di sini: tempatnya di bilah atas,
            jauh dari jangkauan ibu jari yang sedang berpindah soal. */}
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost flex-1 whitespace-nowrap !px-1.5 text-xs"
              onClick={() => pilihNomor(Math.max(0, indeks - 1))}
              disabled={indeks === 0 || terkunci}
            >
              ← Sebelumnya
            </button>
            <button
              type="button"
              className="btn btn-ghost flex-1 whitespace-nowrap !px-1.5 text-xs"
              onClick={() => setDrawer(true)}
              aria-haspopup="dialog"
              aria-expanded={drawer}
            >
              Nomor ({indeks + 1}/{soal.length})
            </button>
            <button
              type="button"
              className="btn btn-primary flex-1 whitespace-nowrap !px-1.5 text-xs"
              onClick={() => pilihNomor(Math.min(soal.length - 1, indeks + 1))}
              disabled={indeks >= soal.length - 1 || terkunci}
            >
              Selanjutnya →
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Drawer nomor soal ---------- */}
      {drawer && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-foreground/40 backdrop-blur-sm lg:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrawer(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Daftar nomor soal"
            className="max-h-[80dvh] w-full overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Pilih nomor soal</p>
              <button
                type="button"
                className="btn btn-ghost !py-1.5 !px-3 text-sm"
                onClick={() => setDrawer(false)}
              >
                Tutup
              </button>
            </div>
            {panel}
          </div>
        </div>
      )}

      {/* ---------- Gerbang layar penuh ---------- */}
      {gerbangTampil && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-foreground/95 p-4">
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-7 text-center shadow-2xl">
            <p className="text-4xl" aria-hidden="true">
              {tanpaApiLayarPenuh ? "📱" : "🖥️"}
            </p>
            <h2 className="mt-3 text-xl font-extrabold tracking-tight">
              {tanpaApiLayarPenuh
                ? "Siap memulai ujian"
                : sudahMasuk
                  ? "Kembali ke layar penuh sekarang"
                  : "Ujian harus dibuka layar penuh"}
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-muted">
              {tanpaApiLayarPenuh
                ? "Soal akan mengisi seluruh layar perangkatmu. Selama ujian berlangsung, berpindah aplikasi atau membuka tab lain terdeteksi otomatis dan langsung menggugurkan."
                : sudahMasuk
                  ? "Kamu keluar dari mode layar penuh. Kejadian ini sudah dicatat untuk pengawas. Kembali ke layar penuh sekarang juga supaya ujianmu bisa dilanjutkan."
                  : "Selama ujian, halaman ini harus menutupi seluruh layar. Soal baru ditampilkan setelah layar penuh aktif — dan di komputer/laptop, keluar dari layar penuh setelah ujian dimulai langsung dinyatakan GAGAL."}
            </p>

            {/* iPhone tidak punya Fullscreen API. Satu-satunya cara bilah Safari
                benar-benar hilang — beserta tombol muat ulang dan daftar tab di
                dalamnya — adalah membuka aplikasi dari ikon Layar Utama. Karena
                itu langkahnya diwajibkan, tapi tetap bisa dilewati: menahan
                siswa di gerbang pada hari-H lebih merugikan daripada bilah
                alamat yang masih terlihat. Yang melewatinya dicatat. */}
            {tanpaApiLayarPenuh && !terpasangDiLayarUtama && (
              <div className="mt-4 rounded-xl bg-brand-soft px-4 py-4 text-left text-xs leading-relaxed text-brand-strong">
                <strong className="block text-sm">
                  Wajib: buka ujian dari ikon Layar Utama
                </strong>
                <p className="mt-1">
                  Di iPhone dan iPad, bilah Safari tidak bisa disembunyikan oleh halaman web —
                  Apple melarang halaman layar penuh menerima ketikan, sehingga soal isian singkat
                  tidak bisa dijawab dari sana. Selama bilah itu masih ada, tombol muat ulang dan
                  daftar tab berada satu ketukan dari soal.
                </p>
                <ol className="mt-3 list-decimal space-y-1.5 pl-5 font-semibold">
                  <li>
                    Tekan tombol <strong>Bagikan</strong> (kotak dengan panah ke atas) di bilah
                    bawah Safari.
                  </li>
                  <li>
                    Gulung ke bawah, pilih <strong>Tambahkan ke Layar Utama</strong>, lalu tekan{" "}
                    <strong>Tambah</strong>.
                  </li>
                  <li>
                    Tutup Safari, buka <strong>ADZKIA SMART</strong> dari ikon barunya, dan masuk
                    kembali ke ujian ini.
                  </li>
                </ol>
                <p className="mt-3">
                  Jawaban yang sudah kamu isi tersimpan otomatis, jadi tidak ada yang hilang.
                </p>
              </div>
            )}

            {tanpaApiLayarPenuh && terpasangDiLayarUtama && (
              <p className="mt-4 rounded-xl bg-success-soft px-4 py-3 text-xs font-semibold leading-relaxed text-success">
                ✓ Ujian ini berjalan dari ikon Layar Utama. Bilah Safari sudah tidak ada.
              </p>
            )}

            <p className="mt-3 rounded-xl bg-danger-soft px-4 py-3 text-xs font-semibold leading-relaxed text-danger">
              Perhatian: waktu ujian TETAP BERJALAN selama layar ini terbuka.
            </p>

            {/* Gerbangnya sendiri termasuk yang perlu dilihat admin, jadi tetap
                ditampilkan apa adanya. Tetapi memaksa admin masuk layar penuh
                membuatnya tidak bisa membandingkan soal dengan naskah di jendela
                sebelah — dan di sini tidak ada yang perlu dijaga. */}
            {pratinjau && (
              <p className="mt-3 rounded-xl bg-warning-soft px-4 py-3 text-xs font-semibold leading-relaxed text-warning">
                Ini pratinjau: layar penuh boleh dilewati, dan keluar darinya tidak menggugurkan apa
                pun.
              </p>
            )}

            {galatLayarPenuh && (
              <p className="mt-3 text-xs font-semibold text-danger">{galatLayarPenuh}</p>
            )}

            {tanpaApiLayarPenuh && !terpasangDiLayarUtama ? (
              // Jalan utamanya adalah memasang ikon, jadi tombol "lanjut saja"
              // sengaja dibuat kecil dan berbunyi apa adanya: pilihan itu masuk
              // laporan pengawas.
              <div className="mt-5">
                <p className="text-xs font-semibold text-muted">
                  Sudah membuka dari ikon Layar Utama? Halaman ini akan mengenalinya sendiri.
                </p>
                <button
                  type="button"
                  onClick={mulaiLewatSafari}
                  className="btn btn-ghost mt-3 w-full text-sm"
                  autoFocus
                >
                  Lanjut dari Safari — dicatat di laporan pengawas
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void masukLayarPenuh()}
                className="btn btn-primary mt-5 w-full text-base"
                autoFocus
              >
                {tanpaApiLayarPenuh
                  ? "Mulai Kerjakan Soal"
                  : sudahMasuk
                    ? "Kembali ke Layar Penuh"
                    : "Masuk Layar Penuh & Mulai"}
              </button>
            )}

            {pratinjau && (
              <button
                type="button"
                onClick={() => {
                  setLayarPenuh(true);
                  setSudahMasuk(true);
                }}
                className="btn btn-ghost mt-2 w-full text-sm"
              >
                Lihat tanpa layar penuh
              </button>
            )}
          </div>
        </div>
      )}

      {/* ---------- Sisa anggaran kepergian ---------- */}
      {pesanPergi && (
        <div
          role="status"
          className="fixed inset-x-0 top-20 z-[66] mx-auto w-fit max-w-[92vw] rounded-xl bg-warning px-5 py-3 text-center text-sm font-bold text-white shadow-2xl"
        >
          {pesanPergi}
          <span className="block text-xs font-normal opacity-90">
            Setiap kepergian dijumlahkan, bukan dihitung ulang dari nol. Aktivitas ini tercatat di
            laporan pengawas.
          </span>
        </div>
      )}

      {/* ---------- Peringatan percobaan menyalin ---------- */}
      {pesanCurang && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-24 z-[65] mx-auto w-fit max-w-[92vw] rounded-xl bg-foreground px-5 py-3 text-center text-sm font-semibold text-background shadow-2xl lg:bottom-8"
        >
          {pesanCurang}
          {catatanCurang > 1 && (
            <span className="block text-xs font-normal opacity-80">
              {catatanCurang} percobaan tercatat di laporan pengawas.
            </span>
          )}
        </div>
      )}

      {/* ---------- Konfirmasi selesai ---------- */}
      <DialogKonfirmasi
        terbuka={dialog}
        judul={sesiTunggal ? "Selesaikan ujian sekarang?" : `Selesaikan ${namaSubtesAktif}?`}
        labelYa={sesiTunggal ? "Ya, selesaikan ujian" : "Ya, selesaikan subtes"}
        memproses={memproses}
        onYa={() => void tutupSubtes()}
        onBatal={() => setDialog(false)}
      >
        {kosong > 0 ? (
          <p>
            Masih ada <strong className="text-danger">{kosong} soal yang belum dijawab</strong>
            {raguTersisa > 0 ? ` dan ${raguTersisa} soal ditandai ragu-ragu` : ""}. Soal yang kosong
            dihitung salah.
          </p>
        ) : (
          <p>
            Semua {soal.length} soal sudah kamu jawab
            {raguTersisa > 0 ? `, tapi ${raguTersisa} soal masih ditandai ragu-ragu` : ""}.
          </p>
        )}
        <p className="mt-2">
          Setelah ditutup, {sesiTunggal ? "ujian ini" : "subtes ini"}{" "}
          <strong>tidak bisa dibuka lagi</strong> dan waktunya tidak dapat dikembalikan.
        </p>
      </DialogKonfirmasi>

      {memproses && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-background/80" aria-live="assertive">
          <p className="text-sm font-semibold text-muted">
            {sesiTunggal
              ? "Menyimpan jawaban dan menghitung nilaimu…"
              : "Menyimpan jawaban dan menyiapkan subtes berikutnya…"}
          </p>
        </div>
      )}
    </div>
  );
}
