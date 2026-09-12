/**
 * Lencana kampus tujuan.
 *
 * CATATAN PENTING: yang ditampilkan di sini adalah medali monogram buatan
 * sendiri — singkatan kampus di atas warna khasnya — BUKAN lambang resmi
 * milik masing-masing perguruan tinggi. Lambang resmi adalah merek terdaftar
 * dan berkas gambarnya harus disediakan pihak sekolah bila memang mau dipakai.
 * Bentuk monogram ini aman dipakai, tidak menuntut berkas gambar apa pun, dan
 * tetap langsung dikenali siswa.
 */

export interface Kampus {
  singkat: string;
  nama: string;
  /** Keterangan pendek: kota untuk PTN, kementerian/lembaga untuk kedinasan. */
  induk: string;
  warna: string;
}

/** Perguruan tinggi negeri yang paling sering jadi incaran peserta UTBK-SNBT. */
export const KAMPUS_PTN: Kampus[] = [
  { singkat: "UI", nama: "Universitas Indonesia", induk: "Depok", warna: "#f4b400" },
  { singkat: "ITB", nama: "Institut Teknologi Bandung", induk: "Bandung", warna: "#00539f" },
  { singkat: "UGM", nama: "Universitas Gadjah Mada", induk: "Yogyakarta", warna: "#f0a202" },
  { singkat: "IPB", nama: "IPB University", induk: "Bogor", warna: "#00693c" },
  { singkat: "ITS", nama: "Institut Teknologi Sepuluh Nopember", induk: "Surabaya", warna: "#005baa" },
  { singkat: "UNAIR", nama: "Universitas Airlangga", induk: "Surabaya", warna: "#1b57a4" },
  { singkat: "UNPAD", nama: "Universitas Padjadjaran", induk: "Bandung", warna: "#f0b323" },
  { singkat: "UNDIP", nama: "Universitas Diponegoro", induk: "Semarang", warna: "#00539b" },
  { singkat: "UB", nama: "Universitas Brawijaya", induk: "Malang", warna: "#0b3d91" },
  { singkat: "UNHAS", nama: "Universitas Hasanuddin", induk: "Makassar", warna: "#b31b1b" },
  { singkat: "USU", nama: "Universitas Sumatera Utara", induk: "Medan", warna: "#00703c" },
  { singkat: "UNS", nama: "Universitas Sebelas Maret", induk: "Surakarta", warna: "#1e4b8f" },
];

/** Sekolah kedinasan yang seleksinya memakai SKD. */
export const KAMPUS_KEDINASAN: Kampus[] = [
  { singkat: "STAN", nama: "Politeknik Keuangan Negara STAN", induk: "Kementerian Keuangan", warna: "#00529b" },
  { singkat: "IPDN", nama: "Institut Pemerintahan Dalam Negeri", induk: "Kementerian Dalam Negeri", warna: "#7f1d1d" },
  { singkat: "STIS", nama: "Politeknik Statistika STIS", induk: "Badan Pusat Statistik", warna: "#0f6cbd" },
  { singkat: "STMKG", nama: "Sekolah Tinggi Meteorologi Klimatologi dan Geofisika", induk: "BMKG", warna: "#0e7490" },
  { singkat: "POLTEKIP", nama: "Politeknik Ilmu Pemasyarakatan", induk: "Kementerian Hukum", warna: "#1e3a8a" },
  { singkat: "POLTEKIM", nama: "Politeknik Imigrasi", induk: "Kementerian Imigrasi", warna: "#166534" },
  { singkat: "STIN", nama: "Sekolah Tinggi Intelijen Negara", induk: "Badan Intelijen Negara", warna: "#334155" },
  { singkat: "SSN", nama: "Politeknik Siber dan Sandi Negara", induk: "BSSN", warna: "#4338ca" },
  { singkat: "STTD", nama: "Politeknik Transportasi Darat Indonesia", induk: "Kementerian Perhubungan", warna: "#b45309" },
  { singkat: "POLTEKBANG", nama: "Politeknik Penerbangan Indonesia", induk: "Kementerian Perhubungan", warna: "#0369a1" },
  { singkat: "POLTEKPEL", nama: "Politeknik Pelayaran", induk: "Kementerian Perhubungan", warna: "#075985" },
  { singkat: "STPN", nama: "Sekolah Tinggi Pertanahan Nasional", induk: "Kementerian ATR/BPN", warna: "#7c2d12" },
];

/** Medali monogram satu kampus. */
function Medali({ k, ukuran = "md" }: { k: Kampus; ukuran?: "sm" | "md" }) {
  const kecil = ukuran === "sm";
  const panjang = k.singkat.length;
  // Singkatan panjang seperti POLTEKBANG harus tetap muat di dalam medali.
  const ukuranHuruf = panjang > 7 ? "text-[8px]" : panjang > 4 ? "text-[10px]" : "text-xs";

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-extrabold uppercase leading-none text-white shadow-sm ring-2 ring-white ${
        kecil ? "h-9 w-9" : "h-14 w-14"
      } ${kecil ? ukuranHuruf : panjang > 7 ? "text-[10px]" : panjang > 4 ? "text-xs" : "text-base"}`}
      style={{ background: k.warna }}
      aria-hidden
    >
      {k.singkat}
    </span>
  );
}

/**
 * Deretan ringkas untuk kartu pemilihan jalur: beberapa medali bertumpuk
 * ditambah keterangan berapa kampus lagi yang tersedia.
 */
export function DeretKampus({ jalur, jumlah = 5 }: { jalur: "utbk" | "skd"; jumlah?: number }) {
  const daftar = jalur === "skd" ? KAMPUS_KEDINASAN : KAMPUS_PTN;
  const tampil = daftar.slice(0, jumlah);
  const sisa = daftar.length - tampil.length;

  return (
    <div className="flex items-center gap-3">
      <span className="flex -space-x-2">
        {tampil.map((k) => (
          <Medali key={k.singkat} k={k} ukuran="sm" />
        ))}
      </span>
      {sisa > 0 && (
        <span className="text-xs font-semibold text-muted">
          +{sisa} kampus lain
        </span>
      )}
    </div>
  );
}

/** Kisi lengkap dengan nama kampus — dipakai di halaman jalur. */
export function KisiKampus({ jalur }: { jalur: "utbk" | "skd" }) {
  const daftar = jalur === "skd" ? KAMPUS_KEDINASAN : KAMPUS_PTN;

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {daftar.map((k) => (
        <li
          key={k.singkat}
          className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-md"
        >
          <Medali k={k} />
          <span className="min-w-0">
            <span className="block text-sm font-bold leading-tight">{k.nama}</span>
            <span className="mt-0.5 block text-xs text-muted">{k.induk}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
