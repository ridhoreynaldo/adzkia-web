import type { ReactNode } from "react";

/**
 * BENDERA NEGARA DUNIA — digambar sendiri sebagai SVG.
 *
 * Diminta pengelola 11 September 2026 untuk panel IELTS: "tambahkan icon
 * bendera negara dari seluruh dunia".
 *
 * KENAPA SVG DAN BUKAN EMOJI 🇬🇧. Ini keputusan yang menentukan, bukan selera:
 * **Windows tidak punya satu pun gambar bendera negara.** Emoji bendera disusun
 * dari sepasang huruf penanda wilayah, dan Chrome, Edge, maupun Firefox di
 * Windows menggambarnya apa adanya — pengelola akan melihat "GB", "US", "AU"
 * berderet, bukan bendera. Seluruh pengelola IELTS Adzkia memakai Windows.
 *
 * Berkas gambar dari luar juga bukan jawaban: panel ini harus tetap utuh saat
 * jaringan sekolah memutus layanan luar, dan menyimpan 30 berkas PNG di
 * `public/` membuat cadangan aplikasi membengkak tanpa guna.
 *
 * BENTUKNYA DISEDERHANAKAN dengan sadar. Pada kotak selebar 20 piksel,
 * daun mapel Kanada, bintang Amerika, dan trigram Korea tidak mungkin digambar
 * utuh — yang dikejar adalah warna dan susunan yang membuat benderanya dikenali
 * sekilas, bukan ketepatan lambang kenegaraan. Jangan pakai berkas ini untuk
 * keperluan resmi yang menuntut bendera yang benar.
 *
 * Perbandingan sisinya 3:2 untuk semua, termasuk Swiss dan Nepal yang di dunia
 * nyata tidak begitu — satu ukuran membuat deretannya rata.
 */

export interface Negara {
  kode: string;
  nama: string;
}

/* ==========================================================================
   Potongan yang dipakai berulang
   ========================================================================== */

/** Bendera tiga jalur mendatar. */
function Mendatar3(a: string, b: string, c: string): ReactNode {
  return (
    <>
      <rect width="60" height="13.34" fill={a} />
      <rect y="13.34" width="60" height="13.33" fill={b} />
      <rect y="26.67" width="60" height="13.33" fill={c} />
    </>
  );
}

/** Bendera tiga jalur tegak. */
function Tegak3(a: string, b: string, c: string): ReactNode {
  return (
    <>
      <rect width="20" height="40" fill={a} />
      <rect x="20" width="20" height="40" fill={b} />
      <rect x="40" width="20" height="40" fill={c} />
    </>
  );
}

/** Salib Skandinavia — palangnya tidak di tengah, itu cirinya. */
function Salib(dasar: string, salib: string, dalam?: string): ReactNode {
  return (
    <>
      <rect width="60" height="40" fill={dasar} />
      <rect x="17" width="8" height="40" fill={salib} />
      <rect y="16" width="60" height="8" fill={salib} />
      {dalam && (
        <>
          <rect x="19" width="4" height="40" fill={dalam} />
          <rect y="18" width="60" height="4" fill={dalam} />
        </>
      )}
    </>
  );
}

/**
 * Union Jack yang disederhanakan — dipakai sendiri dan sebagai sudut bendera
 * Australia serta Selandia Baru.
 *
 * `id` WAJIB berbeda di tiap pemakaian. Diagonalnya melebar keluar kotak 60x40,
 * jadi harus dipotong `clipPath` — dan dua `clipPath` berid sama di satu halaman
 * membuat yang kedua diam-diam memakai potongan milik yang pertama. Di sini
 * kebetulan potongannya kembar sehingga tidak terlihat salah, tetapi begitu
 * salah satunya diubah, bendera yang lain ikut berubah tanpa alasan yang bisa
 * ditelusuri.
 */
function UnionJack(id: string, x = 0, y = 0, skala = 1): ReactNode {
  return (
    <g transform={`translate(${x} ${y}) scale(${skala})`}>
      <clipPath id={`uj-${id}`}>
        <rect width="60" height="40" />
      </clipPath>
      <g clipPath={`url(#uj-${id})`}>
        <rect width="60" height="40" fill="#012169" />
        <path d="M0 0 L60 40 M60 0 L0 40" stroke="#fff" strokeWidth="9" />
        <path d="M0 0 L60 40 M60 0 L0 40" stroke="#C8102E" strokeWidth="4" />
        <rect x="23" width="14" height="40" fill="#fff" />
        <rect y="13" width="60" height="14" fill="#fff" />
        <rect x="26" width="8" height="40" fill="#C8102E" />
        <rect y="16" width="60" height="8" fill="#C8102E" />
      </g>
    </g>
  );
}

/** Bintang kecil; dipakai banyak bendera, digambar sebagai segi lima. */
function Bintang(cx: number, cy: number, r: number, warna: string, kunci?: string): ReactNode {
  const titik: string[] = [];
  for (let i = 0; i < 10; i++) {
    const sudut = (Math.PI / 5) * i - Math.PI / 2;
    const jari = i % 2 === 0 ? r : r / 2.5;
    titik.push(`${(cx + jari * Math.cos(sudut)).toFixed(2)},${(cy + jari * Math.sin(sudut)).toFixed(2)}`);
  }
  return <polygon key={kunci} points={titik.join(" ")} fill={warna} />;
}

/** Bulan sabit — dua lingkaran, yang kedua sewarna dasar. */
function Sabit(cx: number, cy: number, r: number, warna: string, dasar: string): ReactNode {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill={warna} />
      <circle cx={cx + r * 0.35} cy={cy} r={r * 0.82} fill={dasar} />
    </>
  );
}

/* ==========================================================================
   Daftar bendera
   ========================================================================== */

const GAMBAR: Record<string, ReactNode> = {
  /* ---------- Tujuan utama pelajar IELTS ---------- */
  GB: UnionJack("gb"),
  US: (
    <>
      <rect width="60" height="40" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={(i * 40) / 13} width="60" height={40 / 13} fill="#B22234" />
      ))}
      <rect width="26" height={(40 / 13) * 7} fill="#3C3B6E" />
      {[0, 1, 2, 3].map((b) =>
        [0, 1, 2, 3, 4].map((k) =>
          Bintang(4 + k * 5, 3.5 + b * 4.5, 1.7, "#fff", `${b}-${k}`),
        ),
      )}
    </>
  ),
  AU: (
    <>
      <rect width="60" height="40" fill="#00247D" />
      {UnionJack("au", 0, 0, 0.5)}
      {Bintang(15, 33, 3, "#fff")}
      {Bintang(44, 9, 2.2, "#fff")}
      {Bintang(51, 20, 2.2, "#fff")}
      {Bintang(44, 31, 2.2, "#fff")}
      {Bintang(38, 21, 1.5, "#fff")}
    </>
  ),
  CA: (
    <>
      <rect width="60" height="40" fill="#fff" />
      <rect width="15" height="40" fill="#D80621" />
      <rect x="45" width="15" height="40" fill="#D80621" />
      {/* Daun mapel disederhanakan: siluet berlekuk, bukan sebelas ujungnya. */}
      <path
        d="M30 8 L32.5 15 L38 13 L35.5 19 L41 21 L35.5 23.5 L37 29 L31.5 27.5 L30 34 L28.5 27.5 L23 29 L24.5 23.5 L19 21 L24.5 19 L22 13 L27.5 15 Z"
        fill="#D80621"
      />
    </>
  ),
  NZ: (
    <>
      <rect width="60" height="40" fill="#00247D" />
      {UnionJack("nz", 0, 0, 0.5)}
      {Bintang(46, 10, 2.2, "#CC142B")}
      {Bintang(52, 21, 2.2, "#CC142B")}
      {Bintang(44, 31, 2.2, "#CC142B")}
      {Bintang(39, 20, 2.2, "#CC142B")}
    </>
  ),
  IE: Tegak3("#169B62", "#fff", "#FF883E"),

  /* ---------- Eropa ---------- */
  DE: Mendatar3("#000", "#DD0000", "#FFCE00"),
  FR: Tegak3("#002395", "#fff", "#ED2939"),
  NL: Mendatar3("#AE1C28", "#fff", "#21468B"),
  IT: Tegak3("#009246", "#fff", "#CE2B37"),
  ES: (
    <>
      <rect width="60" height="40" fill="#AA151B" />
      <rect y="10" width="60" height="20" fill="#F1BF00" />
    </>
  ),
  PT: (
    <>
      <rect width="60" height="40" fill="#DA291C" />
      <rect width="24" height="40" fill="#046A38" />
      <circle cx="24" cy="20" r="7" fill="#FFE900" />
      <circle cx="24" cy="20" r="4" fill="#DA291C" />
    </>
  ),
  SE: Salib("#006AA7", "#FECC00"),
  NO: Salib("#BA0C2F", "#fff", "#00205B"),
  DK: Salib("#C8102E", "#fff"),
  FI: Salib("#fff", "#003580"),
  CH: (
    <>
      <rect width="60" height="40" fill="#D52B1E" />
      <rect x="26" y="10" width="8" height="20" fill="#fff" />
      <rect x="20" y="16" width="20" height="8" fill="#fff" />
    </>
  ),
  AT: Mendatar3("#ED2939", "#fff", "#ED2939"),
  BE: Tegak3("#000", "#FDDA24", "#EF3340"),
  PL: (
    <>
      <rect width="60" height="40" fill="#fff" />
      <rect y="20" width="60" height="20" fill="#DC143C" />
    </>
  ),
  GR: (
    <>
      <rect width="60" height="40" fill="#fff" />
      {[0, 2, 4, 6, 8].map((i) => (
        <rect key={i} y={(i * 40) / 9} width="60" height={40 / 9} fill="#0D5EAF" />
      ))}
      <rect width={(40 / 9) * 5} height={(40 / 9) * 5} fill="#0D5EAF" />
      <rect x="8.9" width="4.4" height={(40 / 9) * 5} fill="#fff" />
      <rect y="8.9" width={(40 / 9) * 5} height="4.4" fill="#fff" />
    </>
  ),
  RU: Mendatar3("#fff", "#0039A6", "#D52B1E"),
  TR: (
    <>
      <rect width="60" height="40" fill="#E30A17" />
      {Sabit(24, 20, 8, "#fff", "#E30A17")}
      {Bintang(38, 20, 4, "#fff")}
    </>
  ),

  /* ---------- Asia ---------- */
  JP: (
    <>
      <rect width="60" height="40" fill="#fff" />
      <circle cx="30" cy="20" r="11" fill="#BC002D" />
    </>
  ),
  KR: (
    <>
      <rect width="60" height="40" fill="#fff" />
      <path d="M30 11 a9 9 0 0 1 0 18 a4.5 4.5 0 0 0 0-9 a4.5 4.5 0 0 1 0-9 Z" fill="#CD2E3A" />
      <path d="M30 11 a9 9 0 0 0 0 18 a4.5 4.5 0 0 1 0-9 a4.5 4.5 0 0 0 0-9 Z" fill="#0047A0" />
      {[
        [8, 8],
        [8, 30],
        [50, 8],
        [50, 30],
      ].map(([x, y], i) => (
        <g key={i} fill="#000">
          <rect x={x - 3} y={y - 3} width="6" height="1.4" />
          <rect x={x - 3} y={y - 0.7} width="6" height="1.4" />
          <rect x={x - 3} y={y + 1.6} width="6" height="1.4" />
        </g>
      ))}
    </>
  ),
  CN: (
    <>
      <rect width="60" height="40" fill="#EE1C25" />
      {Bintang(11, 11, 6, "#FFFF00")}
      {Bintang(22, 5, 2, "#FFFF00")}
      {Bintang(26, 10, 2, "#FFFF00")}
      {Bintang(26, 16, 2, "#FFFF00")}
      {Bintang(22, 21, 2, "#FFFF00")}
    </>
  ),
  IN: (
    <>
      {Mendatar3("#FF9933", "#fff", "#138808")}
      <circle cx="30" cy="20" r="5" fill="none" stroke="#000088" strokeWidth="1.2" />
      <circle cx="30" cy="20" r="1.2" fill="#000088" />
    </>
  ),
  ID: (
    <>
      <rect width="60" height="40" fill="#CE1126" />
      <rect y="20" width="60" height="20" fill="#fff" />
    </>
  ),
  MY: (
    <>
      <rect width="60" height="40" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect key={i} y={(i * 40) / 14} width="60" height={40 / 14} fill="#CC0001" />
      ))}
      <rect width="34" height={(40 / 14) * 8} fill="#010066" />
      {Sabit(13, 11, 6, "#FFCC00", "#010066")}
      {Bintang(25, 11, 4.5, "#FFCC00")}
    </>
  ),
  SG: (
    <>
      <rect width="60" height="40" fill="#fff" />
      <rect width="60" height="20" fill="#EF3340" />
      {Sabit(15, 10, 6.5, "#fff", "#EF3340")}
      {Bintang(25, 6, 2, "#fff")}
      {Bintang(29, 9.5, 2, "#fff")}
      {Bintang(27.5, 14, 2, "#fff")}
      {Bintang(22.5, 14, 2, "#fff")}
      {Bintang(21, 9.5, 2, "#fff")}
    </>
  ),
  TH: (
    <>
      <rect width="60" height="40" fill="#A51931" />
      <rect y="6.67" width="60" height="26.66" fill="#F4F5F8" />
      <rect y="13.34" width="60" height="13.32" fill="#2D2A4A" />
    </>
  ),
  VN: (
    <>
      <rect width="60" height="40" fill="#DA251D" />
      {Bintang(30, 20, 10, "#FFFF00")}
    </>
  ),
  PH: (
    <>
      <rect width="60" height="40" fill="#CE1126" />
      <rect width="60" height="20" fill="#0038A8" />
      <polygon points="0,0 0,40 26,20" fill="#fff" />
      <circle cx="8" cy="20" r="3.2" fill="#FCD116" />
    </>
  ),
  PK: (
    <>
      <rect width="60" height="40" fill="#01411C" />
      <rect width="15" height="40" fill="#fff" />
      {Sabit(35, 20, 8, "#fff", "#01411C")}
      {Bintang(46, 14, 3.5, "#fff")}
    </>
  ),
  BD: (
    <>
      <rect width="60" height="40" fill="#006A4E" />
      <circle cx="27" cy="20" r="11" fill="#F42A41" />
    </>
  ),

  /* ---------- Timur Tengah & Afrika ---------- */
  AE: (
    <>
      {Mendatar3("#00732F", "#fff", "#000")}
      <rect width="15" height="40" fill="#FF0000" />
    </>
  ),
  SA: (
    <>
      <rect width="60" height="40" fill="#006C35" />
      <rect x="10" y="16" width="40" height="2.6" fill="#fff" />
      <rect x="10" y="24" width="34" height="2" fill="#fff" />
      <polygon points="44,25 52,25 48,28" fill="#fff" />
    </>
  ),
  QA: (
    <>
      <rect width="60" height="40" fill="#8A1538" />
      <rect width="20" height="40" fill="#fff" />
    </>
  ),
  EG: (
    <>
      {Mendatar3("#CE1126", "#fff", "#000")}
      <circle cx="30" cy="20" r="4" fill="#C09300" />
    </>
  ),
  // Pall hijaunya digambar sebagai satu jalur; jalur putih tipis yang di dunia
  // nyata membatasinya sengaja ditiadakan — pada lebar 20 piksel ia hanya
  // menjadi kabut abu-abu.
  ZA: (
    <>
      <rect width="60" height="40" fill="#fff" />
      <rect width="60" height="14" fill="#DE3831" />
      <rect y="26" width="60" height="14" fill="#002395" />
      <path d="M60 15 H26 L0 0 V8 L18 20 L0 32 V40 L26 25 H60 Z" fill="#007A4D" />
      <path d="M0 2 L16 20 L0 38 Z" fill="#FFB612" />
      <path d="M0 7 L11 20 L0 33 Z" fill="#000" />
    </>
  ),
  NG: Tegak3("#008751", "#fff", "#008751"),
  KE: (
    <>
      {Mendatar3("#000", "#fff", "#006600")}
      <rect y="17" width="60" height="6" fill="#BB0000" />
      <ellipse cx="30" cy="20" rx="4" ry="8" fill="#BB0000" stroke="#fff" strokeWidth="1" />
    </>
  ),

  /* ---------- Amerika ---------- */
  BR: (
    <>
      <rect width="60" height="40" fill="#009B3A" />
      <polygon points="30,5 55,20 30,35 5,20" fill="#FEDF00" />
      <circle cx="30" cy="20" r="8" fill="#002776" />
      <path d="M22.5 17.5 Q30 23 37.5 17.5" stroke="#fff" strokeWidth="2" fill="none" />
    </>
  ),
  MX: (
    <>
      {Tegak3("#006847", "#fff", "#CE1126")}
      <circle cx="30" cy="20" r="4.5" fill="none" stroke="#8B5A2B" strokeWidth="1.4" />
    </>
  ),
  AR: (
    <>
      {Mendatar3("#74ACDF", "#fff", "#74ACDF")}
      <circle cx="30" cy="20" r="4" fill="#F6B40E" />
    </>
  ),
};

/**
 * Urutan daftar: negara tujuan pelajar lebih dulu, lalu mengelilingi dunia.
 *
 * Dipakai apa adanya oleh pita hiasan, jadi mengubah urutannya mengubah yang
 * terlihat lebih dulu di layar.
 */
export const NEGARA_DUNIA: Negara[] = [
  { kode: "GB", nama: "Britania Raya" },
  { kode: "US", nama: "Amerika Serikat" },
  { kode: "AU", nama: "Australia" },
  { kode: "CA", nama: "Kanada" },
  { kode: "NZ", nama: "Selandia Baru" },
  { kode: "IE", nama: "Irlandia" },
  { kode: "DE", nama: "Jerman" },
  { kode: "FR", nama: "Prancis" },
  { kode: "NL", nama: "Belanda" },
  { kode: "IT", nama: "Italia" },
  { kode: "ES", nama: "Spanyol" },
  { kode: "PT", nama: "Portugal" },
  { kode: "CH", nama: "Swiss" },
  { kode: "AT", nama: "Austria" },
  { kode: "BE", nama: "Belgia" },
  { kode: "SE", nama: "Swedia" },
  { kode: "NO", nama: "Norwegia" },
  { kode: "DK", nama: "Denmark" },
  { kode: "FI", nama: "Finlandia" },
  { kode: "PL", nama: "Polandia" },
  { kode: "GR", nama: "Yunani" },
  { kode: "RU", nama: "Rusia" },
  { kode: "TR", nama: "Turki" },
  { kode: "JP", nama: "Jepang" },
  { kode: "KR", nama: "Korea Selatan" },
  { kode: "CN", nama: "Tiongkok" },
  { kode: "IN", nama: "India" },
  { kode: "ID", nama: "Indonesia" },
  { kode: "MY", nama: "Malaysia" },
  { kode: "SG", nama: "Singapura" },
  { kode: "TH", nama: "Thailand" },
  { kode: "VN", nama: "Vietnam" },
  { kode: "PH", nama: "Filipina" },
  { kode: "PK", nama: "Pakistan" },
  { kode: "BD", nama: "Bangladesh" },
  { kode: "AE", nama: "Uni Emirat Arab" },
  { kode: "SA", nama: "Arab Saudi" },
  { kode: "QA", nama: "Qatar" },
  { kode: "EG", nama: "Mesir" },
  { kode: "ZA", nama: "Afrika Selatan" },
  { kode: "NG", nama: "Nigeria" },
  { kode: "KE", nama: "Kenya" },
  { kode: "BR", nama: "Brasil" },
  { kode: "MX", nama: "Meksiko" },
  { kode: "AR", nama: "Argentina" },
];

/**
 * Satu bendera.
 *
 * `judul` menghidupkan tooltip DAN membuatnya terbaca pembaca layar; tanpa itu
 * benderanya `aria-hidden` — deretan hiasan tidak perlu dibacakan satu per satu.
 */
export function Bendera({
  kode,
  className = "h-4 w-6",
  judul,
}: {
  kode: string;
  className?: string;
  judul?: string;
}) {
  const isi = GAMBAR[kode];
  if (!isi) return null;
  return (
    <svg
      viewBox="0 0 60 40"
      className={`shrink-0 rounded-[3px] ring-1 ring-black/10 ${className}`}
      role={judul ? "img" : undefined}
      aria-hidden={judul ? undefined : true}
      aria-label={judul}
    >
      {judul && <title>{judul}</title>}
      {isi}
    </svg>
  );
}

/**
 * Pita bendera — deretan mendatar yang bisa digeser.
 *
 * Hiasan penuh: `aria-hidden`, tidak bisa disentuh papan ketik, dan tidak
 * membawa satu pun keterangan yang harus dibaca. Gunanya menjelaskan dalam satu
 * pandangan bahwa panel ini milik jalur internasional, bukan tryout nasional.
 */
export function PitaBendera({
  negara = NEGARA_DUNIA,
  className = "",
}: {
  negara?: Negara[];
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none flex flex-wrap justify-center gap-1.5 ${className}`}
    >
      {negara.map((n) => (
        <Bendera key={n.kode} kode={n.kode} className="h-3.5 w-5" />
      ))}
    </div>
  );
}
