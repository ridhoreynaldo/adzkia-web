/**
 * Kartu-kartu kecil yang mengintip di tepi sampul LANGUAGE SKILL.
 *
 * Murni hiasan — meniru tata letak rujukan pengelola — jadi seluruhnya
 * `aria-hidden` dan tidak bisa disentuh: angka di dalamnya contoh belaka, dan
 * pembaca layar tidak perlu mendengar "Band Score 7.5" yang bukan nilai siapa
 * pun. Di layar sempit kartunya disembunyikan lewat CSS (.intip-language),
 * bukan dilepas dari DOM, supaya susunan tengah halaman tidak ikut bergeser.
 */
function Judul({ warna, teks }: { warna: string; teks: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: warna }} />
      <span className="text-[11px] font-bold text-foreground">{teks}</span>
    </div>
  );
}

export function HiasanLanguage() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Kiri atas — penilaian tulisan */}
      <div className="intip-language left-[3%] top-[14%] -rotate-6">
        <Judul warna="#e4123f" teks="Writing Task" />
        <p className="mt-0.5 text-[10px] text-muted">Telaah otomatis</p>
        <div className="mt-2.5 flex items-end justify-between border-t border-line pt-2">
          <span className="text-[10px] text-muted">Band Score</span>
          <span className="text-lg font-extrabold leading-none text-[#e4123f]">7.5</span>
        </div>
      </div>

      {/* Kanan atas — latihan berbicara */}
      <div className="intip-language right-[3%] top-[10%] rotate-6">
        <Judul warna="#e4123f" teks="Speaking Part 2" />
        <p className="mt-0.5 text-[10px] text-muted">Kelancaran</p>
        <div className="mt-2.5 flex items-center gap-2">
          <div className="flex flex-1 items-end gap-[3px]">
            {[6, 11, 7, 14, 9, 16, 8, 12, 6, 10, 5].map((t, i) => (
              <span
                key={i}
                className="w-[3px] rounded-full bg-[#e4123f]/70"
                style={{ height: `${t}px` }}
              />
            ))}
          </div>
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold text-foreground">
            Jernih
          </span>
        </div>
      </div>

      {/* Kiri bawah — simulasi membaca */}
      <div className="intip-language bottom-[12%] left-[5%] -rotate-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-foreground">Reading Mock</span>
          <span className="text-[11px] font-extrabold text-[#e4123f]">28/40</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-surface-muted">
          <span className="block h-full w-[70%] rounded-full bg-[#e4123f]" />
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Sejalan menuju Band 7.5
        </p>
      </div>

      {/* Kanan bawah — bagian yang perlu diperbaiki */}
      <div className="intip-language bottom-[10%] right-[5%] rotate-3">
        <Judul warna="#17110e" teks="Fokus Perbaikan" />
        <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
          <span className="text-[11px] font-semibold text-foreground">Grammar Range</span>
          <span className="rounded-full bg-[#fde8ed] px-2 py-0.5 text-[9px] font-bold text-[#bd0d33]">
            Perlu Latihan
          </span>
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-muted">
          Perbanyak kalimat majemuk bertingkat.
        </p>
      </div>
    </div>
  );
}
