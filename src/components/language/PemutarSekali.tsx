"use client";

import { useEffect, useRef, useState } from "react";

/** "03:07" dari detik. */
function jam(detik: number): string {
  if (!Number.isFinite(detik)) return "--:--";
  const m = Math.floor(detik / 60);
  const d = Math.floor(detik % 60);
  return `${String(m).padStart(2, "0")}:${String(d).padStart(2, "0")}`;
}

/**
 * Pemutar rekaman Listening — SEKALI JALAN.
 *
 * IELTS memutar tiap rekaman satu kali saja, dan aturan itu yang membuat
 * latihannya berarti: siswa harus menangkap jawaban saat itu juga, bukan
 * mengulang-ulang potongan yang terlewat. Karena itu pemutar bawaan peramban
 * (`<audio controls>`) tidak dipakai di ruang ujian — bilah gesernya membuat
 * mengulang jadi satu ketukan jari.
 *
 * Yang boleh dilakukan siswa: menekan Play sekali, lalu jeda dan lanjut. Yang
 * tidak: menggeser mundur, mengulang dari awal, atau memutar untuk kedua
 * kalinya sesudah rekamannya habis. Bilah kemajuan di bawah hanya penunjuk,
 * bukan kendali.
 *
 * Ini penjagaan tata tertib, bukan pengamanan: siapa pun yang membuka alat
 * pengembang bisa memutarnya lagi. Penjaga sesungguhnya adalah pengawas ruang.
 *
 * ============================================================================
 * JANGAN PERNAH MEMAKAI `window.confirm`, `window.alert`, ATAU `window.prompt`
 * DI DALAM RUANG UJIAN. Ini bukan selera penulisan — ini sebab bencana.
 * ============================================================================
 *
 * Sampai 11 September 2026 tombol Play memanggil
 * `window.confirm("Play the recording now? …")`. Dialog bawaan peramban
 * mengerjakan tiga hal sekaligus, dan ketiganya mematikan:
 *
 *   1. Ia MENCURI FOKUS jendela. `document.hasFocus()` menjadi false, dan
 *      penjaga membaca itu sebagai peserta yang berpindah ke aplikasi lain —
 *      `blur_window`, yang MENGGUGURKAN.
 *   2. Di sebagian peramban komputer ia MELEPAS MODE LAYAR PENUH —
 *      `esc_layar_penuh`, yang juga menggugurkan.
 *   3. Selama dialognya terpampang, JavaScript halaman DIBEKUKAN. Denyut nadi
 *      berhenti; kalau peserta membacanya lebih dari 20 detik, server melihat
 *      keheningan dan menjatuhkan `denyut_hilang`.
 *
 * Akibatnya terukur pada TryOut IELTS 11 September 2026: dari 132 peserta yang
 * dihentikan, **126 gugur di subtes LISTENING** dan hanya 6 di Reading. Ke-37
 * korban `esc_layar_penuh` seluruhnya punya TEPAT SATU baris pelanggaran —
 * yang mematikan itu sendiri — dan seluruhnya NOL jawaban. Mereka menekan Play,
 * lalu ujiannya berhenti sebelum sempat mendengar apa pun.
 *
 * Penggantinya di bawah adalah panel biasa DI DALAM halaman: tidak mencuri
 * fokus, tidak melepas layar penuh, tidak membekukan apa pun. Pola yang sama
 * sudah dipakai tombol "Submit section" di `RuangIelts` — pemutar ini yang
 * dulu terlewat.
 */
export function PemutarSekali({
  src,
  onBerputar,
}: {
  src: string;
  /**
   * Dipanggil tiap kali rekaman mulai dan berhenti berputar.
   *
   * Penjagaan memakainya untuk memaafkan kepergian selama rekaman berjalan —
   * ketetapan pengelola 11 September 2026, sebab selama mendengarkan peserta
   * memang tidak menyentuh apa pun dan layar ponselnya boleh saja padam.
   * Lihat `pergi_saat_rekaman` di `@/lib/pelanggaran-jenis`.
   */
  onBerputar?: (berputar: boolean) => void;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [main, setMain] = useState(false);
  const [pernah, setPernah] = useState(false);
  const [habis, setHabis] = useState(false);
  const [posisi, setPosisi] = useState(0);
  const [durasi, setDurasi] = useState(0);
  const [galat, setGalat] = useState(false);
  /** Panel penegasan sebelum rekaman diputar untuk pertama kalinya. */
  const [tanya, setTanya] = useState(false);

  // Disimpan di ref supaya efek di bawah tidak perlu memasang ulang
  // pendengarnya tiap kali induknya merender.
  const kabar = useRef(onBerputar);
  useEffect(() => {
    kabar.current = onBerputar;
  }, [onBerputar]);

  useEffect(() => {
    const el = audio.current;
    if (!el) return;

    const onWaktu = () => setPosisi(el.currentTime);
    const onDurasi = () => setDurasi(el.duration);
    const onSelesai = () => {
      setMain(false);
      setHabis(true);
      kabar.current?.(false);
    };
    const onGalat = () => setGalat(true);
    // `pause` dan `play` didengar dari ELEMENNYA, bukan cuma dari tombol:
    // sistem operasi bisa menjeda sendiri (telepon masuk, pemutar lain
    // mengambil alih suara), dan penjagaan harus tahu rekamannya berhenti.
    const onMain = () => {
      setMain(true);
      kabar.current?.(true);
    };
    const onJeda = () => {
      setMain(false);
      kabar.current?.(false);
    };

    el.addEventListener("timeupdate", onWaktu);
    el.addEventListener("loadedmetadata", onDurasi);
    el.addEventListener("durationchange", onDurasi);
    el.addEventListener("ended", onSelesai);
    el.addEventListener("error", onGalat);
    el.addEventListener("play", onMain);
    el.addEventListener("pause", onJeda);
    return () => {
      el.removeEventListener("timeupdate", onWaktu);
      el.removeEventListener("loadedmetadata", onDurasi);
      el.removeEventListener("durationchange", onDurasi);
      el.removeEventListener("ended", onSelesai);
      el.removeEventListener("error", onGalat);
      el.removeEventListener("play", onMain);
      el.removeEventListener("pause", onJeda);
      // Meninggalkan bagian ini selagi rekaman berputar tidak boleh
      // meninggalkan pemaafannya tetap menyala.
      kabar.current?.(false);
    };
  }, []);

  async function putar() {
    const el = audio.current;
    if (!el || habis) return;
    setTanya(false);
    try {
      await el.play();
      setPernah(true);
      // `setMain(true)` tidak ditulis di sini: pendengar `play` di atas yang
      // mengerjakannya, sehingga satu jalur saja yang mengabari penjagaan.
    } catch {
      setGalat(true);
    }
  }

  function mulai() {
    if (habis) return;
    // Penegasan hanya untuk pemutaran PERTAMA — sesudah itu tombolnya
    // jeda/lanjut biasa, dan bertanya tiap kali cuma mengganggu.
    if (!pernah) {
      setTanya(true);
      return;
    }
    void putar();
  }

  function jeda() {
    audio.current?.pause();
  }

  const persen = durasi > 0 ? Math.min(100, (posisi / durasi) * 100) : 0;

  return (
    <div className="rounded-2xl border border-line bg-surface-muted/70 p-4">
      {/* Elemen audio sengaja tanpa `controls`: kendalinya di tombol bawah. */}
      <audio ref={audio} src={src} preload="metadata" />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={main ? jeda : mulai}
          disabled={habis || galat}
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-white transition disabled:opacity-40 ${
            main ? "bg-foreground" : "bg-brand"
          }`}
          aria-label={main ? "Pause recording" : "Play recording"}
        >
          {main ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5.5v13l11-6.5-11-6.5Z" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold uppercase tracking-widest text-muted">
            {galat
              ? "Rekaman gagal dimuat"
              : habis
                ? "Recording finished"
                : main
                  ? "Playing"
                  : pernah
                    ? "Paused"
                    : "Played once only"}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-brand" style={{ width: `${persen}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] font-semibold tabular-nums text-muted">
            {jam(posisi)} / {jam(durasi)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-muted">
        {galat
          ? "Beri tahu pengawas — berkas rekamannya tidak bisa dibuka."
          : "Rekaman diputar satu kali. Kamu boleh menjeda dan melanjutkan, tetapi tidak bisa mengulang dari awal."}
      </p>

      {/* Penegasan sebelum pemutaran pertama — panel biasa DI DALAM halaman,
          bukan `window.confirm`. Bacalah komentar di kepala berkas ini sebelum
          menggantinya dengan dialog bawaan peramban: dialog itulah yang
          menggugurkan 126 peserta pada 11 September 2026. */}
      {tanya && (
        <div className="mt-4 rounded-xl border border-brand bg-brand-soft p-4">
          <p className="text-sm font-extrabold text-foreground">Play the recording now?</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            It is played <strong>once only</strong>. You may pause and continue, but you cannot
            rewind or start again. Make sure your headphones are on and the volume is set before you
            begin.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary !px-4 !py-2 text-sm font-extrabold"
              onClick={() => void putar()}
            >
              Play now
            </button>
            <button
              type="button"
              className="btn btn-ghost !px-4 !py-2 text-sm"
              onClick={() => setTanya(false)}
            >
              Not yet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
