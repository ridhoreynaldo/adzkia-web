"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  selesaikanSubtesAction,
  simpanJawabanAction,
  tutupKarenaWaktuAction,
} from "@/app/language/ielts/actions";
import { GerbangIelts } from "@/components/language/GerbangIelts";
import { LayarGagalIelts } from "@/components/language/LayarGagalIelts";
import { PemutarSekali } from "@/components/language/PemutarSekali";
import { usePenjagaIelts } from "@/components/language/usePenjagaIelts";
import { AMBANG_KEMBALI_DETIK, BUDGET_PERGI_DETIK } from "@/lib/penjagaan/denyut";
import { HURUF_PG, OPSI_TFNG } from "@/lib/ielts/ielts-konstanta";

export interface SeksiRuang {
  id: number;
  nomor: number;
  judul: string;
  instruksi: string | null;
  audioUrl: string | null;
  bacaan: string | null;
}

export interface SoalRuang {
  id: number;
  nomor: number;
  tipe: "PG" | "TFNG" | "IS" | "ESAI";
  pertanyaan: string;
  opsi: string[];
  seksiId: number | null;
}

/** Hitung mundur menjadi "58:07" — jam tidak pernah dipakai, subtes terlama 60 menit. */
function jam(detik: number): string {
  const m = Math.floor(detik / 60);
  const d = detik % 60;
  return `${String(m).padStart(2, "0")}:${String(d).padStart(2, "0")}`;
}

function hitungKata(teks: string): number {
  const t = teks.trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Ruang ujian IELTS.
 *
 * Bentuknya mengikuti IELTS berbantuan komputer, bukan ruang ujian UTBK di
 * aplikasi ini: seluruh butir satu bagian tampil dalam satu kolom yang bisa
 * digulir — bukan satu soal per layar — karena menjawab Listening menuntut
 * mata bisa melompat ke soal berikutnya sementara rekaman terus berjalan.
 *
 * Empat hal yang dijaga di sini:
 *
 *   1. WAKTU MILIK SERVER. Angka awalnya datang dari `sisaDetik` di server;
 *      hitung mundur di layar hanya cermin. Saat menyentuh nol, subtes ditutup
 *      lewat aksi server juga — bukan cuma disembunyikan.
 *   2. JAWABAN TERSIMPAN SENDIRI. Setiap ketikan dijadwalkan tersimpan, dan
 *      berpindah kolom menyimpannya seketika. Siswa tidak pernah menekan
 *      "simpan", jadi tidak ada yang bisa lupa.
 *   3. REKAMAN DIPUTAR SEKALI. Lihat `PemutarSekali`.
 *   4. PENJAGAAN UJIAN — sejak 10 September 2026, setara ruang ujian TryOut
 *      UTBK-SNBT: layar penuh, denyut nadi, ALT+TAB, tangkap layar, anggaran
 *      kepergian. Seluruh mesinnya ada di `usePenjagaIelts`, dan aturannya
 *      dibaca dari konstanta yang SAMA dengan yang dipakai UTBK — kalau angka
 *      di bilah peringatan bawah berbeda dari yang dipakai server memutuskan,
 *      peserta membaca batas yang bukan batasnya.
 */
export function RuangIelts({
  pengerjaanId,
  namaPaket,
  subtes,
  namaSubtes,
  menit,
  seksi,
  soal,
  jawabanAwal,
  sisaDetikAwal,
  labelSeksi,
  pratinjau = false,
  onSelesaiPratinjau,
}: {
  pengerjaanId: number;
  namaPaket: string;
  subtes: string;
  namaSubtes: string;
  menit: number;
  seksi: SeksiRuang[];
  soal: SoalRuang[];
  jawabanAwal: Record<number, string>;
  sisaDetikAwal: number;
  labelSeksi: string;
  /**
   * PRATINJAU pengelola: layar yang sama persis, tanpa satu pun akibatnya.
   *
   * Sengaja SATU BENDERA pada komponen yang sungguhan, bukan komponen tiruan
   * tersendiri — pola yang sama dipakai `RuangUjian` di jalur UTBK. Pratinjau
   * yang digambar oleh kode lain akan perlahan berbeda dari ruang ujian yang
   * sesungguhnya, dan pratinjau yang berbeda dari kenyataan lebih buruk
   * daripada tidak ada pratinjau sama sekali.
   *
   * Yang dimatikan: penyimpanan jawaban ke server, denyut, pencatatan
   * pelanggaran, dan penutupan subtes. Yang tetap nyata: hitung mundur,
   * gerbang layar penuh, blokir salin, tab bagian, pemutar sekali jalan,
   * panel nomor, dan dialog submit.
   */
  pratinjau?: boolean;
  /** Jalan keluar dari pratinjau. Wajib ada bila `pratinjau` true. */
  onSelesaiPratinjau?: (subtes: string) => void;
}) {
  const router = useRouter();
  const [jawaban, setJawaban] = useState<Record<number, string>>(jawabanAwal);
  const [sisa, setSisa] = useState(sisaDetikAwal);
  const [status, setStatus] = useState<"diam" | "menyimpan" | "tersimpan" | "gagal">("diam");
  const [aktif, setAktif] = useState<number | "lain">(seksi[0]?.id ?? "lain");
  const [tanya, setTanya] = useState(false);

  const jadwal = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  /** Jawaban yang sudah diketik tetapi belum sempat terkirim. */
  const antre = useRef<Map<number, string>>(new Map());
  const habisDipanggil = useRef(false);
  const formSelesai = useRef<HTMLFormElement | null>(null);

  /* ---------------- Menyimpan ---------------- */

  const kirim = useCallback(
    async (soalId: number, nilai: string) => {
      antre.current.delete(soalId);
      // Pratinjau tidak menyimpan apa pun: `soalId` di sini milik paket yang
      // sungguhan, dan menuliskan jawaban pengelola ke `ielts_jawaban` berarti
      // mengarang jawaban atas nama pengerjaan yang tidak ada.
      //
      // Penanda simpannya sengaja dibiarkan DIAM, bukan diisi "Tersimpan ✓":
      // satu-satunya hal yang tidak boleh dipalsukan oleh pratinjau adalah
      // janji bahwa jawaban sudah aman.
      if (pratinjau) return;
      setStatus("menyimpan");
      const ok = await simpanJawabanAction(soalId, nilai);
      setStatus(ok ? "tersimpan" : "gagal");
      if (!ok) antre.current.set(soalId, nilai);
    },
    [pratinjau],
  );

  /**
   * Mengirim SELURUH jawaban yang masih mengantre, sekarang juga.
   *
   * Dipanggil penjagaan tepat sebelum tiap laporan kepergian: kalau peserta
   * memang pergi, ketikan terakhirnya tidak boleh ikut hilang bersama
   * halamannya. Inilah alasan antrean di atas ada sama sekali — tanpa itu,
   * jawaban yang ditulis pada 700 milidetik terakhir lenyap tanpa jejak.
   */
  const simpanSegera = useCallback(async () => {
    const isi = [...antre.current.entries()];
    if (isi.length === 0) return;
    for (const t of Object.values(jadwal.current)) clearTimeout(t);
    jadwal.current = {};
    await Promise.all(isi.map(([id, nilai]) => kirim(id, nilai)));
  }, [kirim]);

  const ubah = useCallback(
    (soalId: number, nilai: string) => {
      setJawaban((j) => ({ ...j, [soalId]: nilai }));
      antre.current.set(soalId, nilai);
      clearTimeout(jadwal.current[soalId]);
      jadwal.current[soalId] = setTimeout(() => void kirim(soalId, nilai), 700);
    },
    [kirim],
  );

  /** Pilihan tidak perlu ditunda — satu klik, langsung simpan. */
  const pilih = useCallback(
    (soalId: number, nilai: string) => {
      setJawaban((j) => ({ ...j, [soalId]: nilai }));
      antre.current.set(soalId, nilai);
      clearTimeout(jadwal.current[soalId]);
      void kirim(soalId, nilai);
    },
    [kirim],
  );

  /* ---------------- Susunan layar ---------------- */

  const tanpaSeksi = useMemo(() => soal.filter((s) => !s.seksiId), [soal]);
  const seksiTampil = aktif === "lain" ? null : (seksi.find((s) => s.id === aktif) ?? null);
  const butir = useMemo(
    () => (aktif === "lain" ? tanpaSeksi : soal.filter((s) => s.seksiId === aktif)),
    [aktif, soal, tanpaSeksi],
  );
  const terjawab = soal.filter((s) => (jawaban[s.id] ?? "").trim()).length;
  const menipis = sisa <= 300;

  /**
   * true bila bagian yang sedang tampil memuat kolom jawaban yang menuntut
   * papan ketik. Dipakai penjagaan untuk memutuskan kapan layar penuh harus
   * DILEPAS lebih dulu — di WebKit, mengetik selagi layar penuh memanggil panel
   * sistem yang membekukan halaman dan berujung pengguguran palsu.
   */
  const adaKolomTeks = useMemo(
    () => butir.some((b) => b.tipe === "IS" || b.tipe === "ESAI"),
    [butir],
  );

  /* ---------------- Penjagaan ---------------- */

  /**
   * true selama rekaman Listening berputar.
   *
   * Diangkat ke sini — bukan disimpan di dalam pemutarnya — karena yang
   * membutuhkannya adalah PENJAGAAN, dan penjagaan hidup di tingkat ruang
   * ujian. Ketetapan pengelola 11 September 2026: mendengarkan rekaman adalah
   * bagian yang diujikan, jadi layar yang padam selama itu tidak boleh
   * menggugurkan siapa pun.
   *
   * Berpindah bagian tidak perlu disetel ulang dari sini: `<PemutarSekali>`
   * dipasangi `key` bagiannya, sehingga pemutar lama DIBONGKAR — dan
   * pembongkarannya sendiri yang mengabarkan `false`. Satu jalur saja yang
   * memadamkan pemaafan ini, dan itu memang harus satu.
   */
  const [rekamanBerputar, setRekamanBerputar] = useState(false);

  const penjaga = usePenjagaIelts({
    pengerjaanId,
    subtes,
    adaKolomTeks,
    simpanSegera,
    rekamanBerputar,
    pratinjau,
  });
  const { matikanPenjagaan } = penjaga;

  /* ---------------- Hitung mundur ---------------- */

  // Hitung mundur dipatok ke SATU saat akhir, bukan dikurangi satu tiap detak.
  // Peramban memperlambat setInterval di tab yang tersembunyi, dan pengurangan
  // per detak akan tertinggal makin jauh dari jam server tiap kali itu terjadi.
  const akhir = useRef(0);
  useEffect(() => {
    // Saat akhirnya dipatok DI DALAM efek, bukan saat render: membaca jam di
    // badan komponen membuat hasil render bergantung pada kapan ia dipanggil.
    akhir.current = Date.now() + sisaDetikAwal * 1000;
    const hitung = () => setSisa(Math.max(0, Math.round((akhir.current - Date.now()) / 1000)));
    hitung();
    const t = setInterval(hitung, 1000);
    return () => clearInterval(t);
  }, [sisaDetikAwal]);

  useEffect(() => {
    if (sisa > 0 || habisDipanggil.current) return;
    habisDipanggil.current = true;
    // Waktu habis: penjagaan dimatikan lebih dulu, kalau tidak perpindahan
    // halaman yang wajar ini terbaca sebagai peserta yang meninggalkan ujian.
    matikanPenjagaan();
    if (pratinjau) {
      onSelesaiPratinjau?.(subtes);
      return;
    }
    // Tutup di server lebih dulu, baru pindah halaman. Kalau urutannya dibalik,
    // siswa yang koneksinya lambat sempat kembali ke ruang ini dengan subtes
    // yang menurut server masih terbuka.
    void (async () => {
      await simpanSegera();
      await tutupKarenaWaktuAction(subtes);
      router.replace(
        `/language/ielts/ujian?pesan=${encodeURIComponent(`Waktu ${namaSubtes} habis. Jawaban terakhirmu tersimpan.`)}`,
      );
    })();
  }, [matikanPenjagaan, namaSubtes, onSelesaiPratinjau, pratinjau, router, simpanSegera, sisa, subtes]);

  /* ---------------- Menutup subtes ---------------- */

  const tutupSubtes = useCallback(() => {
    setTanya(false);
    // Urutannya wajib: penjagaan dimatikan, jawaban yang mengantre dikirim,
    // baru formulirnya berangkat.
    matikanPenjagaan();
    if (pratinjau) {
      onSelesaiPratinjau?.(subtes);
      return;
    }
    void simpanSegera().finally(() => formSelesai.current?.requestSubmit());
  }, [matikanPenjagaan, onSelesaiPratinjau, pratinjau, simpanSegera, subtes]);

  /* ---------------- Ujian dihentikan ---------------- */

  if (penjaga.gugur !== null) {
    return <LayarGagalIelts pesan={penjaga.gugur} namaPaket={namaPaket} />;
  }

  const belum = soal.length - terjawab;

  return (
    <div
      className={`ruang-ujian flex select-none flex-col ${
        // Peramban tanpa layar penuh sungguhan (iPhone, seluruh WebKit): ruang
        // ujian dikunci setinggi viewport yang terlihat supaya tidak ada yang
        // terpotong di balik bilah Safari.
        penjaga.tanpaApiLayarPenuh ? "ruang-semu" : "min-h-dvh"
      }`}
    >
      {/* ================= Bilah atas ================= */}
      <header className="sticky top-0 z-30 shrink-0 border-b border-line bg-[color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
              IELTS · {menit} minutes
            </p>
            <h1 className="text-lg font-extrabold tracking-tight">{namaSubtes}</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-semibold text-muted sm:inline">
              {terjawab}/{soal.length} answered
            </span>

            <span
              className={`rounded-full px-4 py-2 text-base font-extrabold tabular-nums ${
                menipis ? "bg-danger text-white" : "bg-foreground text-white"
              }`}
              aria-live="off"
            >
              {jam(sisa)}
            </span>

            {/* Formulirnya dikirim lewat `requestSubmit()` sesudah dialog di
                bawah, BUKAN oleh tombol ini. `window.confirm` sengaja tidak
                dipakai lagi: dialog bawaan peramban mencuri fokus jendela, dan
                penjaga `blur_window` membaca itu sebagai peserta yang berpindah
                ke aplikasi lain. */}
            {pratinjau ? (
              // Tanpa Server Action sama sekali dalam pratinjau: formulir yang
              // terpasang pada aksi sungguhan hanya menunggu satu kekeliruan
              // untuk benar-benar menutup subtes milik orang lain.
              <button
                type="button"
                className="btn btn-primary !px-4 !py-2 text-sm font-extrabold"
                onClick={() => setTanya(true)}
              >
                Submit section
              </button>
            ) : (
              <form action={selesaikanSubtesAction} ref={formSelesai}>
                <input type="hidden" name="subtes" value={subtes} />
                <button
                  type="button"
                  className="btn btn-primary !px-4 !py-2 text-sm font-extrabold"
                  onClick={() => setTanya(true)}
                >
                  Submit section
                </button>
              </form>
            )}

            {pratinjau && (
              <button
                type="button"
                className="btn btn-ghost !px-3 !py-2 text-xs font-bold"
                onClick={() => {
                  matikanPenjagaan();
                  onSelesaiPratinjau?.(subtes);
                }}
              >
                Keluar pratinjau
              </button>
            )}
          </div>
        </div>

        {/* Bilah tipis: kemajuan menjawab + status simpan */}
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 pb-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-300"
              style={{ width: `${soal.length ? (terjawab / soal.length) * 100 : 0}%` }}
            />
          </div>
          <span className="w-28 shrink-0 text-right text-[11px] font-semibold text-muted">
            {status === "menyimpan"
              ? "Menyimpan…"
              : status === "tersimpan"
                ? "Tersimpan ✓"
                : status === "gagal"
                  ? "Gagal menyimpan"
                  : ""}
          </span>
        </div>
      </header>

      {/* Denyut nadi tidak sampai ke server. Peserta diberi tahu supaya sempat
          memperbaiki sambungannya — kalau tidak, ia menyangka ujiannya sedang
          digugurkan padahal gangguan sambungan justru TIDAK menggugurkan. */}
      {penjaga.sambunganPutus && (
        <div
          role="alert"
          className="shrink-0 border-b border-warning-soft bg-warning-soft px-3 py-2 text-center text-xs font-semibold text-warning sm:px-4"
        >
          Sambungan ke server terputus — jawaban terakhirmu belum tentu tersimpan. Tetap di halaman
          ini dan pulihkan jaringanmu. Ujianmu <strong>tidak dihentikan</strong> karena gangguan
          sambungan.
        </div>
      )}

      {penjaga.pesanPergi && (
        <div
          role="alert"
          className="shrink-0 border-b border-danger-soft bg-danger-soft px-3 py-2 text-center text-xs font-bold text-danger sm:px-4"
        >
          {penjaga.pesanPergi}
        </div>
      )}

      {penjaga.pesanCurang && (
        <div
          role="alert"
          className="shrink-0 border-b border-danger-soft bg-danger-soft px-3 py-2 text-center text-xs font-semibold text-danger sm:px-4"
        >
          {penjaga.pesanCurang}
        </div>
      )}

      <main className="isi-gulung mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {/* Bilah ini PENCEGAHAN, bukan sekadar pemberitahuan: peserta yang tahu
            ESC dan ALT+TAB menghentikan ujian tidak akan menekannya, sedangkan
            yang baru tahu sesudah layar merah muncul hanya bisa menyesal.
            Angkanya dibaca dari konstanta yang sama dengan yang dipakai server. */}
        {pratinjau && (
          <div className="mb-5 rounded-xl border border-success bg-success-soft px-3 py-2 text-center text-xs font-bold text-success sm:px-4">
            PRATINJAU PENGELOLA — tidak ada jawaban yang tersimpan, tidak ada waktu yang tercatat,
            dan tidak ada pelanggaran yang dicatat. Peringatan di bawah dan gerbang layar penuh
            sengaja dibiarkan nyata supaya kamu melihat persis apa yang dibaca siswa; keluar dari
            layar penuh di sini tidak menghentikan apa pun.
          </div>
        )}

        <div className="mb-5 rounded-xl border border-danger-soft bg-danger-soft px-3 py-2 text-center text-xs font-semibold text-danger sm:px-4">
          ⚠ This test is monitored. Ujian dinyatakan <strong>DIHENTIKAN</strong> bila kamu: membuka
          jendela, aplikasi, atau peramban lain di samping halaman ujian; menekan{" "}
          <strong>ALT+TAB</strong> (Command+Tab) untuk berpindah jendela — di perangkat apa pun;
          menekan <strong>ESC</strong> sehingga keluar dari layar penuh, khusus di komputer/laptop;{" "}
          <strong>meninggalkan halaman ujian lebih dari {AMBANG_KEMBALI_DETIK} detik</strong>; atau{" "}
          <strong>menangkap layar (screenshot) soal</strong>. Keluar sebentar lalu langsung kembali
          tidak langsung menghentikan ujian, tetapi <strong>lamanya dijumlahkan</strong>: begitu
          seluruh kepergianmu mencapai {BUDGET_PERGI_DETIK} detik, ujian dihentikan. Sisa waktunya
          ditampilkan setiap kali kamu kembali.
          {/* Pemaafan rekaman WAJIB ikut tertulis di sini, bukan cuma di tata
              tertib: siswa yang mengira layarnya tidak boleh padam akan
              menyentuh layar terus-menerus selama rekaman berjalan — dan itu
              merampas perhatiannya dari bagian yang justru sedang diujikan. */}
          <span className="mt-1.5 block font-normal text-foreground">
            Selama <strong>rekaman Listening diputar</strong>, aturan{" "}
            {BUDGET_PERGI_DETIK} detik di atas <strong>dijeda</strong> — mendengarkan memang bagian
            dari ujiannya, jadi layarmu boleh saja meredup atau terkunci. ALT+TAB dan tangkap layar
            tetap menghentikan ujian, juga selama rekaman.
          </span>
        </div>

        {/* ================= Tab bagian ================= */}
        {(seksi.length > 0 || tanpaSeksi.length > 0) && (
          <div className="mb-6 flex flex-wrap gap-2">
            {seksi.map((s) => {
              const isi = soal.filter((x) => x.seksiId === s.id);
              const jadi = isi.filter((x) => (jawaban[x.id] ?? "").trim()).length;
              const on = aktif === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setAktif(s.id)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    on
                      ? "bg-foreground text-white"
                      : "border border-line bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  {s.judul || `${labelSeksi} ${s.nomor}`}
                  <span className={`ml-2 text-[11px] ${on ? "text-white/70" : "text-muted"}`}>
                    {jadi}/{isi.length}
                  </span>
                </button>
              );
            })}
            {tanpaSeksi.length > 0 && (
              <button
                type="button"
                onClick={() => setAktif("lain")}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  aktif === "lain"
                    ? "bg-foreground text-white"
                    : "border border-line bg-surface text-muted hover:text-foreground"
                }`}
              >
                Lain-lain
                <span className="ml-2 text-[11px]">{tanpaSeksi.length}</span>
              </button>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="min-w-0 space-y-5">
            {/* ---------- Rekaman / bacaan / instruksi ---------- */}
            {seksiTampil && (
              <section className="card p-5">
                <h2 className="text-base font-extrabold tracking-tight">
                  {seksiTampil.judul || `${labelSeksi} ${seksiTampil.nomor}`}
                </h2>

                {seksiTampil.audioUrl && (
                  <div className="mt-4">
                    {/* `onBerputar` bukan hiasan: selama rekaman berjalan,
                        penjagaan memaafkan layar yang padam dan halaman yang
                        tersembunyi. Kalau pemutar ini kelak diganti, bendera
                        itu WAJIB ikut, atau peserta gugur karena mendengarkan. */}
                    <PemutarSekali
                      key={seksiTampil.id}
                      src={seksiTampil.audioUrl}
                      onBerputar={setRekamanBerputar}
                    />
                  </div>
                )}

                {seksiTampil.instruksi && (
                  <p className="mt-4 whitespace-pre-wrap rounded-xl bg-surface-muted px-4 py-3 text-sm font-semibold leading-relaxed">
                    {seksiTampil.instruksi}
                  </p>
                )}

                {seksiTampil.bacaan && (
                  <div className="mt-4 max-h-[26rem] overflow-y-auto whitespace-pre-wrap rounded-xl border border-line p-4 text-sm leading-relaxed">
                    {seksiTampil.bacaan}
                  </div>
                )}
              </section>
            )}

            {/* ---------- Butir ---------- */}
            {butir.length === 0 ? (
              <p className="card p-6 text-center text-sm text-muted">
                Tidak ada soal di bagian ini.
              </p>
            ) : (
              butir.map((b) => (
                <section key={b.id} id={`soal-${b.nomor}`} className="card p-5">
                  <div className="flex gap-3">
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-extrabold ${
                        (jawaban[b.id] ?? "").trim()
                          ? "bg-brand text-white"
                          : "bg-surface-muted text-muted"
                      }`}
                    >
                      {b.nomor}
                    </span>
                    <p className="whitespace-pre-wrap pt-1 text-[15px] font-semibold leading-relaxed">
                      {b.pertanyaan}
                    </p>
                  </div>

                  <div className="mt-4 pl-11">
                    {b.tipe === "PG" && (
                      <div className="space-y-2">
                        {b.opsi.map((o, i) => {
                          const huruf = HURUF_PG[i] ?? String(i + 1);
                          const on = jawaban[b.id] === huruf;
                          return (
                            <button
                              key={huruf}
                              type="button"
                              onClick={() => pilih(b.id, huruf)}
                              className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                                on
                                  ? "border-brand bg-brand-soft font-semibold"
                                  : "border-line bg-surface hover:border-brand/50"
                              }`}
                            >
                              <span
                                className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] font-extrabold ${
                                  on ? "bg-brand text-white" : "bg-surface-muted text-muted"
                                }`}
                              >
                                {huruf}
                              </span>
                              <span>{o}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {b.tipe === "TFNG" && (
                      <div className="flex flex-wrap gap-2">
                        {OPSI_TFNG.map((o) => {
                          const on = jawaban[b.id] === o;
                          return (
                            <button
                              key={o}
                              type="button"
                              onClick={() => pilih(b.id, o)}
                              className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                                on
                                  ? "border-brand bg-brand text-white"
                                  : "border-line bg-surface text-muted hover:text-foreground"
                              }`}
                            >
                              {o}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {b.tipe === "IS" && (
                      <input
                        className="input max-w-md"
                        value={jawaban[b.id] ?? ""}
                        onChange={(e) => ubah(b.id, e.target.value)}
                        onBlur={(e) => void kirim(b.id, e.target.value)}
                        placeholder="Type your answer"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    )}

                    {b.tipe === "ESAI" && (
                      <>
                        <textarea
                          className="input min-h-64 !rounded-2xl leading-relaxed"
                          value={jawaban[b.id] ?? ""}
                          onChange={(e) => ubah(b.id, e.target.value)}
                          onBlur={(e) => void kirim(b.id, e.target.value)}
                          placeholder="Write your answer here."
                        />
                        <p className="mt-2 text-xs font-semibold text-muted">
                          {hitungKata(jawaban[b.id] ?? "")} words
                        </p>
                      </>
                    )}
                  </div>
                </section>
              ))
            )}
          </div>

          {/* ---------- Panel nomor ---------- */}
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <div className="card p-5">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted">
                Question navigator
              </h2>
              <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-5">
                {soal.map((b) => {
                  const dijawab = Boolean((jawaban[b.id] ?? "").trim());
                  const diBagianIni = (b.seksiId ?? "lain") === aktif;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setAktif(b.seksiId ?? "lain");
                        // Menunggu satu putaran render supaya bagiannya sudah
                        // tergambar sebelum digulir ke butirnya.
                        setTimeout(
                          () =>
                            document
                              .getElementById(`soal-${b.nomor}`)
                              ?.scrollIntoView({ behavior: "smooth", block: "center" }),
                          40,
                        );
                      }}
                      className={`h-9 rounded-lg text-xs font-bold transition ${
                        dijawab
                          ? "bg-brand text-white"
                          : diBagianIni
                            ? "border border-line bg-surface text-foreground"
                            : "bg-surface-muted text-muted"
                      }`}
                    >
                      {b.nomor}
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 text-[11px] leading-relaxed text-muted">
                {pratinjau
                  ? "Ini pratinjau: jawaban yang kamu ketik hanya ada di layar ini dan hilang begitu kamu keluar."
                  : "Jawabanmu tersimpan sendiri. Menutup halaman TIDAK menghentikan waktu — bagian ini tetap berjalan sampai kamu submit atau waktunya habis."}
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* ================= Dialog penutup subtes ================= */}
      {tanya && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-foreground/70 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="judul-submit-ielts"
            className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl"
          >
            <h2 id="judul-submit-ielts" className="text-lg font-extrabold tracking-tight">
              Submit {namaSubtes}?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {pratinjau
                ? "Ini pratinjau — tidak ada yang benar-benar dikirim. Kamu akan kembali ke papan pratinjau."
                : belum > 0
                  ? `Masih ada ${belum} soal kosong, dan bagian ini tidak bisa dibuka lagi setelah kamu submit.`
                  : "Bagian ini tidak bisa dibuka lagi setelah kamu submit."}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                className="btn btn-ghost flex-1"
                onClick={() => setTanya(false)}
                autoFocus
              >
                Cancel
              </button>
              <button type="button" className="btn btn-primary flex-1" onClick={tutupSubtes}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= Gerbang layar penuh ================= */}
      {penjaga.gerbangTampil && (
        <GerbangIelts
          pratinjau={pratinjau}
          tanpaApiLayarPenuh={penjaga.tanpaApiLayarPenuh}
          terpasangDiLayarUtama={penjaga.terpasangDiLayarUtama}
          galat={penjaga.galatLayarPenuh}
          onMasuk={penjaga.masukLayarPenuh}
          onLewatSafari={penjaga.mulaiLewatSafari}
        />
      )}
    </div>
  );
}
